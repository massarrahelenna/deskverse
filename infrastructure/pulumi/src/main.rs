use pulumi_wasm_rust::{add_export, pulumi_main, Output};

use pulumi_wasm_aws_ecr as ecr;
use pulumi_wasm_aws_ecs as ecs;
use pulumi_wasm_aws_ec2 as ec2;
use pulumi_wasm_aws_iam as iam;
use pulumi_wasm_aws_lb as lb;
use pulumi_wasm_aws_s3 as s3;
use pulumi_wasm_aws_cloudfront as cloudfront;

// ─── entrypoint ──────────────────────────────────────────────────────────────

#[pulumi_main]
fn main() -> Result<(), anyhow::Error> {
    // 1. ECR  — container registry for the Node.js WebSocket server
    let ecr_repo = ecr_repository()?;

    // 2. Networking — VPC, subnets, security groups
    let net = networking()?;

    // 3. IAM  — ECS task execution role
    let exec_role = ecs_execution_role()?;

    // 4. ECS  — cluster, task definition, service
    let server_url = ecs_server(&ecr_repo, &net, &exec_role)?;

    // 5. Client hosting — S3 + CloudFront
    let cdn_domain = client_cdn()?;

    // ── stack outputs ─────────────────────────────────────────────────────────
    add_export!("ecr_url",       ecr_repo.repository_url);
    add_export!("server_url",    server_url);
    add_export!("client_cdn",    cdn_domain);

    Ok(())
}

// ─── ECR ─────────────────────────────────────────────────────────────────────

struct EcrRepo {
    repository_url: Output<String>,
}

fn ecr_repository() -> Result<EcrRepo, anyhow::Error> {
    let repo = ecr::Repository::create(
        "deskverse-server",
        ecr::RepositoryArgs::builder()
            .name("deskverse/server")
            .image_tag_mutability("MUTABLE")
            .image_scanning_configuration(
                ecr::inputs::RepositoryImageScanningConfiguration::builder()
                    .scan_on_push(true)
                    .build_struct(),
            )
            .build_struct(),
    );

    // Lifecycle: keep only the last 10 images to control storage cost.
    ecr::LifecyclePolicy::create(
        "deskverse-server-lifecycle",
        ecr::LifecyclePolicyArgs::builder()
            .repository(repo.name())
            .policy(
                r#"{
                  "rules": [{
                    "rulePriority": 1,
                    "description": "Keep last 10 images",
                    "selection": {
                      "tagStatus": "any",
                      "countType": "imageCountMoreThan",
                      "countNumber": 10
                    },
                    "action": { "type": "expire" }
                  }]
                }"#,
            )
            .build_struct(),
    );

    Ok(EcrRepo {
        repository_url: repo.repository_url(),
    })
}

// ─── Networking ──────────────────────────────────────────────────────────────

struct Net {
    vpc_id:              Output<String>,
    public_subnet_ids:   Vec<Output<String>>,
    alb_sg_id:           Output<String>,
    ecs_sg_id:           Output<String>,
}

fn networking() -> Result<Net, anyhow::Error> {
    let vpc = ec2::Vpc::create(
        "deskverse-vpc",
        ec2::VpcArgs::builder()
            .cidr_block("10.0.0.0/16")
            .enable_dns_hostnames(true)
            .enable_dns_support(true)
            .build_struct(),
    );
    let vpc_id = vpc.id();

    let igw = ec2::InternetGateway::create(
        "deskverse-igw",
        ec2::InternetGatewayArgs::builder()
            .vpc_id(vpc_id.clone())
            .build_struct(),
    );

    // Two public subnets across two AZs (required for ALB).
    let subnet_a = ec2::Subnet::create(
        "deskverse-pub-a",
        ec2::SubnetArgs::builder()
            .vpc_id(vpc_id.clone())
            .cidr_block("10.0.1.0/24")
            .availability_zone("us-east-1a")
            .map_public_ip_on_launch(true)
            .build_struct(),
    );
    let subnet_b = ec2::Subnet::create(
        "deskverse-pub-b",
        ec2::SubnetArgs::builder()
            .vpc_id(vpc_id.clone())
            .cidr_block("10.0.2.0/24")
            .availability_zone("us-east-1b")
            .map_public_ip_on_launch(true)
            .build_struct(),
    );

    let route_table = ec2::RouteTable::create(
        "deskverse-rt",
        ec2::RouteTableArgs::builder()
            .vpc_id(vpc_id.clone())
            .routes(vec![ec2::inputs::RouteTableRoute::builder()
                .cidr_block("0.0.0.0/0")
                .gateway_id(igw.id())
                .build_struct()])
            .build_struct(),
    );
    ec2::RouteTableAssociation::create(
        "deskverse-rta-a",
        ec2::RouteTableAssociationArgs::builder()
            .subnet_id(subnet_a.id())
            .route_table_id(route_table.id())
            .build_struct(),
    );
    ec2::RouteTableAssociation::create(
        "deskverse-rta-b",
        ec2::RouteTableAssociationArgs::builder()
            .subnet_id(subnet_b.id())
            .route_table_id(route_table.id())
            .build_struct(),
    );

    // ALB security group — allows inbound HTTP/WS on 80 and 4000.
    let alb_sg = ec2::SecurityGroup::create(
        "deskverse-alb-sg",
        ec2::SecurityGroupArgs::builder()
            .vpc_id(vpc_id.clone())
            .ingress(vec![
                ec2::inputs::SecurityGroupIngress::builder()
                    .protocol("tcp").from_port(80).to_port(80)
                    .cidr_blocks(vec!["0.0.0.0/0".into()])
                    .build_struct(),
                ec2::inputs::SecurityGroupIngress::builder()
                    .protocol("tcp").from_port(4000).to_port(4000)
                    .cidr_blocks(vec!["0.0.0.0/0".into()])
                    .build_struct(),
            ])
            .egress(vec![ec2::inputs::SecurityGroupEgress::builder()
                .protocol("-1").from_port(0).to_port(0)
                .cidr_blocks(vec!["0.0.0.0/0".into()])
                .build_struct()])
            .build_struct(),
    );

    // ECS task SG — only accepts traffic from the ALB SG.
    let ecs_sg = ec2::SecurityGroup::create(
        "deskverse-ecs-sg",
        ec2::SecurityGroupArgs::builder()
            .vpc_id(vpc_id.clone())
            .ingress(vec![ec2::inputs::SecurityGroupIngress::builder()
                .protocol("tcp").from_port(4000).to_port(4000)
                .security_groups(vec![alb_sg.id()])
                .build_struct()])
            .egress(vec![ec2::inputs::SecurityGroupEgress::builder()
                .protocol("-1").from_port(0).to_port(0)
                .cidr_blocks(vec!["0.0.0.0/0".into()])
                .build_struct()])
            .build_struct(),
    );

    Ok(Net {
        vpc_id,
        public_subnet_ids: vec![subnet_a.id(), subnet_b.id()],
        alb_sg_id: alb_sg.id(),
        ecs_sg_id: ecs_sg.id(),
    })
}

// ─── IAM ─────────────────────────────────────────────────────────────────────

struct ExecRole {
    arn: Output<String>,
}

fn ecs_execution_role() -> Result<ExecRole, anyhow::Error> {
    let role = iam::Role::create(
        "deskverse-ecs-exec-role",
        iam::RoleArgs::builder()
            .assume_role_policy(
                r#"{
                  "Version": "2012-10-17",
                  "Statement": [{
                    "Effect": "Allow",
                    "Principal": { "Service": "ecs-tasks.amazonaws.com" },
                    "Action": "sts:AssumeRole"
                  }]
                }"#,
            )
            .build_struct(),
    );

    // Grants ECS the right to pull from ECR and write to CloudWatch Logs.
    iam::RolePolicyAttachment::create(
        "deskverse-ecs-exec-policy",
        iam::RolePolicyAttachmentArgs::builder()
            .role(role.name())
            .policy_arn(
                "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy",
            )
            .build_struct(),
    );

    Ok(ExecRole { arn: role.arn() })
}

// ─── ECS (server) ────────────────────────────────────────────────────────────

fn ecs_server(
    ecr: &EcrRepo,
    net: &Net,
    exec_role: &ExecRole,
) -> Result<Output<String>, anyhow::Error> {
    let cluster = ecs::Cluster::create(
        "deskverse-cluster",
        ecs::ClusterArgs::builder()
            .name("deskverse")
            .build_struct(),
    );

    // Task definition — single container running the Node.js server.
    let image = ecr.repository_url.apply(|url| format!("{url}:latest"));
    let container_def = image.apply(|img| {
        serde_json::to_string(&serde_json::json!([{
            "name":  "server",
            "image": img,
            "portMappings": [{ "containerPort": 4000, "protocol": "tcp" }],
            "environment": [
                { "name": "NODE_ENV", "value": "production" },
                { "name": "PORT",     "value": "4000" },
                { "name": "HOST",     "value": "0.0.0.0" }
            ],
            "logConfiguration": {
                "logDriver": "awslogs",
                "options": {
                    "awslogs-group":         "/ecs/deskverse-server",
                    "awslogs-region":        "us-east-1",
                    "awslogs-stream-prefix": "server"
                }
            }
        }]))
        .expect("valid JSON")
    });

    let task_def = ecs::TaskDefinition::create(
        "deskverse-server-task",
        ecs::TaskDefinitionArgs::builder()
            .family("deskverse-server")
            .network_mode("awsvpc")
            .requires_compatibilities(vec!["FARGATE".into()])
            .cpu("512")
            .memory("1024")
            .execution_role_arn(exec_role.arn.clone())
            .container_definitions(container_def)
            .build_struct(),
    );

    // Application Load Balancer — supports WebSocket upgrades out of the box.
    let alb = lb::LoadBalancer::create(
        "deskverse-alb",
        lb::LoadBalancerArgs::builder()
            .internal(false)
            .load_balancer_type("application")
            .security_groups(vec![net.alb_sg_id.clone()])
            .subnets(net.public_subnet_ids.clone())
            .build_struct(),
    );

    let target_group = lb::TargetGroup::create(
        "deskverse-tg",
        lb::TargetGroupArgs::builder()
            .port(4000)
            .protocol("HTTP")
            .target_type("ip")
            .vpc_id(net.vpc_id.clone())
            .health_check(
                lb::inputs::TargetGroupHealthCheck::builder()
                    .path("/health")
                    .healthy_threshold(2)
                    .unhealthy_threshold(3)
                    .interval(30)
                    .build_struct(),
            )
            .build_struct(),
    );

    lb::Listener::create(
        "deskverse-listener",
        lb::ListenerArgs::builder()
            .load_balancer_arn(alb.arn())
            .port(80)
            .default_actions(vec![lb::inputs::ListenerDefaultAction::builder()
                .type_("forward")
                .target_group_arn(target_group.arn())
                .build_struct()])
            .build_struct(),
    );

    ecs::Service::create(
        "deskverse-server-svc",
        ecs::ServiceArgs::builder()
            .cluster(cluster.arn())
            .task_definition(task_def.arn())
            .desired_count(2)
            .launch_type("FARGATE")
            .network_configuration(
                ecs::inputs::ServiceNetworkConfiguration::builder()
                    .subnets(net.public_subnet_ids.clone())
                    .security_groups(vec![net.ecs_sg_id.clone()])
                    .assign_public_ip(true)
                    .build_struct(),
            )
            .load_balancers(vec![ecs::inputs::ServiceLoadBalancer::builder()
                .target_group_arn(target_group.arn())
                .container_name("server")
                .container_port(4000)
                .build_struct()])
            .build_struct(),
    );

    let server_url = alb.dns_name().apply(|dns| format!("http://{dns}"));
    Ok(server_url)
}

// ─── Client (S3 + CloudFront) ────────────────────────────────────────────────

fn client_cdn() -> Result<Output<String>, anyhow::Error> {
    // S3 bucket — private; CloudFront is the only allowed origin.
    let bucket = s3::Bucket::create(
        "deskverse-client",
        s3::BucketArgs::builder()
            .bucket("deskverse-client-assets")
            .build_struct(),
    );

    // Block all public access — served exclusively through CloudFront.
    s3::BucketPublicAccessBlock::create(
        "deskverse-client-block",
        s3::BucketPublicAccessBlockArgs::builder()
            .bucket(bucket.id())
            .block_public_acls(true)
            .block_public_policy(true)
            .ignore_public_acls(true)
            .restrict_public_buckets(true)
            .build_struct(),
    );

    let oac = cloudfront::OriginAccessControl::create(
        "deskverse-oac",
        cloudfront::OriginAccessControlArgs::builder()
            .name("deskverse-oac")
            .origin_access_control_origin_type("s3")
            .signing_behavior("always")
            .signing_protocol("sigv4")
            .build_struct(),
    );

    let distribution = cloudfront::Distribution::create(
        "deskverse-cdn",
        cloudfront::DistributionArgs::builder()
            .enabled(true)
            .default_root_object("index.html")
            .origins(vec![cloudfront::inputs::DistributionOrigin::builder()
                .domain_name(bucket.bucket_regional_domain_name())
                .origin_id("s3-deskverse-client")
                .origin_access_control_id(oac.id())
                .build_struct()])
            .default_cache_behavior(
                cloudfront::inputs::DistributionDefaultCacheBehavior::builder()
                    .allowed_methods(vec!["GET".into(), "HEAD".into()])
                    .cached_methods(vec!["GET".into(), "HEAD".into()])
                    .target_origin_id("s3-deskverse-client")
                    .viewer_protocol_policy("redirect-to-https")
                    .forwarded_values(
                        cloudfront::inputs::DistributionDefaultCacheBehaviorForwardedValues::builder()
                            .query_string(false)
                            .cookies(
                                cloudfront::inputs::DistributionDefaultCacheBehaviorForwardedValuesCookies::builder()
                                    .forward("none")
                                    .build_struct(),
                            )
                            .build_struct(),
                    )
                    .build_struct(),
            )
            // SPA routing: return index.html for 403/404 so React Router works.
            .custom_error_responses(vec![
                cloudfront::inputs::DistributionCustomErrorResponse::builder()
                    .error_code(403)
                    .response_code(200)
                    .response_page_path("/index.html")
                    .build_struct(),
                cloudfront::inputs::DistributionCustomErrorResponse::builder()
                    .error_code(404)
                    .response_code(200)
                    .response_page_path("/index.html")
                    .build_struct(),
            ])
            .restrictions(
                cloudfront::inputs::DistributionRestrictions::builder()
                    .geo_restriction(
                        cloudfront::inputs::DistributionRestrictionsGeoRestriction::builder()
                            .restriction_type("none")
                            .build_struct(),
                    )
                    .build_struct(),
            )
            .viewer_certificate(
                cloudfront::inputs::DistributionViewerCertificate::builder()
                    .cloudfront_default_certificate(true)
                    .build_struct(),
            )
            .build_struct(),
    );

    let cdn_domain = distribution.domain_name().apply(|d| format!("https://{d}"));
    Ok(cdn_domain)
}
