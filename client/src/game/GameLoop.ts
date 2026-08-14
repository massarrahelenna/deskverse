import * as PIXI from "pixi.js";
import type { GameMap, Direction } from "@shared/types";
import { PLAYER_SPEED, WORLD_W, WORLD_H } from "@shared/constants";
import { MapRenderer } from "../rendering/MapRenderer";
import { AvatarRenderer } from "../rendering/AvatarRenderer";
import { RemotePlayerRenderer } from "../rendering/RemotePlayerRenderer";
import { CollisionMap } from "./CollisionMap";
import { InputManager } from "./InputManager";
import { ZoneDetector } from "./ZoneDetector";
import { ProximityDetector } from "./ProximityDetector";
import { SocketManager } from "../networking/SocketManager";
import { usePlayerStore } from "../stores/playerStore";
import { useWorldStore } from "../stores/worldStore";
import { useConversationStore } from "../stores/conversationStore";

const AVATAR_W = 24;
const AVATAR_H = 28;

export class GameLoop {
  private app: PIXI.Application;
  private mapRenderer: MapRenderer;
  private avatar: AvatarRenderer;
  private collision: CollisionMap;
  private input: InputManager;
  private zoneDetector: ZoneDetector;
  private proximityDetector: ProximityDetector;
  private remoteRenderer: RemotePlayerRenderer;
  private worldContainer: PIXI.Container;
  private entitiesContainer: PIXI.Container;
  private destroyed = false;

  constructor(app: PIXI.Application, map: GameMap) {
    this.app = app;
    this.mapRenderer = new MapRenderer(map);
    this.collision = new CollisionMap(map);
    this.input = new InputManager();
    this.zoneDetector = new ZoneDetector(map);
    this.proximityDetector = new ProximityDetector((ids) => {
      useConversationStore.getState().setNearby(ids);
    });

    const store = usePlayerStore.getState();
    this.avatar = new AvatarRenderer(
      store.name, store.avatarSkin, store.shirtIndex, true,
      store.hairColor, store.accessory, store.pantsColor,
    );

    this.worldContainer = new PIXI.Container();
    this.worldContainer.label = "World";

    this.entitiesContainer = new PIXI.Container();
    this.entitiesContainer.sortableChildren = true;

    this.remoteRenderer = new RemotePlayerRenderer(this.entitiesContainer);
  }

  async init(): Promise<void> {
    await this.mapRenderer.load();
    this.mapRenderer.buildLayers();

    this.worldContainer.addChild(this.mapRenderer.getContainer());
    this.worldContainer.addChild(this.entitiesContainer);
    this.entitiesContainer.addChild(this.avatar.container);
    this.app.stage.addChild(this.worldContainer);

    const store = usePlayerStore.getState();
    this.avatar.setPosition(store.x, store.y);
    this.avatar.setStatus(store.status);

    this.input.attach();
    this.app.ticker.add(this.tick, this);
  }

  private tick = (ticker: PIXI.Ticker): void => {
    if (this.destroyed) return;

    const dt = ticker.deltaMS / 1000;
    this.handleMovement(dt);
    this.scaleToFit();

    const { remotePlayers } = useWorldStore.getState();
    this.remoteRenderer.sync(remotePlayers, dt);
    this.remoteRenderer.tick(ticker.deltaMS);

    const { x, y, status } = usePlayerStore.getState();
    this.avatar.setStatus(status);
    this.avatar.container.zIndex = y;

    this.proximityDetector.update(x, y, remotePlayers);
    this.zoneDetector.update(x, y);
    this.handleInteract();
  };

  private handleMovement(dt: number): void {
    const store = usePlayerStore.getState();

    let dx = 0;
    let dy = 0;
    let direction: Direction = store.direction;

    if (this.input.up) { dy = -PLAYER_SPEED * dt; direction = "up"; }
    else if (this.input.down) { dy = PLAYER_SPEED * dt; direction = "down"; }
    if (this.input.left) { dx = -PLAYER_SPEED * dt; direction = "left"; }
    else if (this.input.right) { dx = PLAYER_SPEED * dt; direction = "right"; }

    const moving = dx !== 0 || dy !== 0;

    let newX = store.x;
    let newY = store.y;

    if (dx !== 0) {
      const c = newX + dx;
      if (!this.collision.wouldCollide(c, newY, AVATAR_W, AVATAR_H)) newX = c;
    }
    if (dy !== 0) {
      const c = newY + dy;
      if (!this.collision.wouldCollide(newX, c, AVATAR_W, AVATAR_H)) newY = c;
    }

    newX = Math.max(0, Math.min(WORLD_W - AVATAR_W, newX));
    newY = Math.max(0, Math.min(WORLD_H - AVATAR_H, newY));

    store.setPosition({ x: newX, y: newY });
    store.setDirection(direction);
    store.setAnimation(moving ? "walk" : "idle");

    this.avatar.update(dt, moving, direction);
    this.avatar.setPosition(newX, newY);

    if (moving) {
      SocketManager.sendMove(store.id, newX, newY, direction, moving ? "walk" : "idle");
    }
  }

  private handleInteract(): void {
    if (!this.input.consumeJustPressed("KeyE")) return;
    const conv = useConversationStore.getState();
    const { status } = usePlayerStore.getState();
    const { remotePlayers } = useWorldStore.getState();
    if (status !== "livre" || conv.activeConversation || conv.sentInviteId) return;
    const invitable = conv.nearbyPlayerIds.find(
      (id) => remotePlayers[id]?.status === "livre"
    );
    if (!invitable) return;
    SocketManager.sendInvite(invitable);
    conv.setSentInviteId(invitable);
  }

  private scaleToFit(): void {
    const sw = this.app.screen.width;
    const sh = this.app.screen.height;
    const scale = Math.min(sw / WORLD_W, sh / WORLD_H);
    this.worldContainer.scale.set(scale);
    this.worldContainer.x = Math.round((sw - WORLD_W * scale) / 2);
    this.worldContainer.y = Math.round((sh - WORLD_H * scale) / 2);
  }

  resetZoneDetector(): void {
    this.zoneDetector.reset();
  }

  showLocalChatBubble(text: string): void {
    this.avatar.showChatBubble(text);
  }

  showRemoteChatBubble(playerId: string, text: string): void {
    this.remoteRenderer.showBubble(playerId, text);
  }

  destroy(): void {
    this.destroyed = true;
    this.app.ticker.remove(this.tick, this);
    this.input.detach();
    this.zoneDetector.clearAll();
    this.proximityDetector.clear();
    this.remoteRenderer.destroy();
    this.worldContainer.destroy({ children: true });
  }
}
