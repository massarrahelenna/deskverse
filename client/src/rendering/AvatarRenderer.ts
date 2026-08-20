import * as PIXI from "pixi.js";
import type { Direction, PlayerStatus, Accessory } from "@shared/types";

const AVATAR_SIZE = 24;
const LABEL_STYLE = new PIXI.TextStyle({
  fontSize: 13,
  fill: "#ffffff",
  fontFamily: "'Pixelify Sans', monospace",
  dropShadow: { color: "#000000", blur: 2, distance: 1 },
});

const BUBBLE_STYLE = new PIXI.TextStyle({
  fontSize: 11,
  fill: "#3A2010",
  fontFamily: "'Pixelify Sans', monospace",
  wordWrap: true,
  wordWrapWidth: 120,
});

const SKIN_TONES: Record<string, number> = {
  light:  0xf5c5a3,
  medium: 0xc68642,
  dark:   0x8d4a28,
};

const SHIRT_COLORS = [0x3b82f6, 0xef4444, 0x22c55e, 0xa855f7, 0xf97316];

const STATUS_DOT_COLORS: Record<PlayerStatus, number> = {
  livre:        0x4caf50,
  em_foco:      0x7a63a8,
  em_reuniao:   0x2196f3,
  ausente:      0x9e9e9e,
  em_descanso:  0xD4833A,
};

export class AvatarRenderer {
  readonly container: PIXI.Container;
  private body: PIXI.Graphics;
  private label: PIXI.Text;
  private bubbleContainer: PIXI.Container;
  private bubbleBg: PIXI.Graphics;
  private bubbleText: PIXI.Text;
  private bubbleTimer = 0;
  private direction: Direction = "down";
  private animFrame = 0;
  private animTimer = 0;
  private isMoving = false;
  private skinColor: number;
  private shirtColor: number;
  private hairHex: string;
  private accessory: Accessory;
  private pantsHex: string;
  private status: PlayerStatus = "livre";

  constructor(
    name: string,
    skinTone: keyof typeof SKIN_TONES = "medium",
    shirtIndex = 0,
    isLocal = false,
    hairColor = "#2c1a0e",
    accessory: Accessory = "none",
    pantsColor = "#334155",
  ) {
    this.skinColor  = SKIN_TONES[skinTone] ?? SKIN_TONES.medium;
    this.shirtColor = SHIRT_COLORS[shirtIndex % SHIRT_COLORS.length];
    this.hairHex    = hairColor;
    this.accessory  = accessory;
    this.pantsHex   = pantsColor;

    this.container = new PIXI.Container();
    this.body      = new PIXI.Graphics();
    this.label     = new PIXI.Text({ text: name, style: LABEL_STYLE });

    this.label.anchor.set(0.5, 0);
    this.label.x = AVATAR_SIZE / 2;
    this.label.y = AVATAR_SIZE + 2;

    this.bubbleContainer = new PIXI.Container();
    this.bubbleBg        = new PIXI.Graphics();
    this.bubbleText      = new PIXI.Text({ text: "", style: BUBBLE_STYLE });
    this.bubbleText.x    = 5;
    this.bubbleText.y    = 4;
    this.bubbleContainer.addChild(this.bubbleBg);
    this.bubbleContainer.addChild(this.bubbleText);
    this.bubbleContainer.visible = false;

    this.container.addChild(this.body);
    this.container.addChild(this.label);
    this.container.addChild(this.bubbleContainer);

    if (isLocal) {
      const ring = new PIXI.Graphics();
      ring.circle(AVATAR_SIZE / 2, AVATAR_SIZE / 2, AVATAR_SIZE / 2 + 3);
      ring.stroke({ width: 1.5, color: 0xffd700, alpha: 0.6 });
      this.container.addChildAt(ring, 0);
    }

    this.draw();
  }

  private hairColor(): number {
    return parseInt(this.hairHex.replace("#", ""), 16);
  }

  private pantsColor(): number {
    return parseInt(this.pantsHex.replace("#", ""), 16);
  }

  private draw(): void {
    const g = this.body;
    g.clear();

    const cx        = AVATAR_SIZE / 2;
    const bobOffset = this.isMoving ? Math.sin(this.animFrame * 0.5) * 1.5 : 0;
    const hair      = this.hairColor();
    const pants     = this.pantsColor();

    g.ellipse(cx, AVATAR_SIZE - 2, 8, 3);
    g.fill({ color: 0x000000, alpha: 0.25 });

    g.roundRect(4, 10 + bobOffset, 16, 10, 3);
    g.fill({ color: this.shirtColor });

    g.circle(cx, 8 + bobOffset, 7);
    g.fill({ color: this.skinColor });

    g.circle(cx, 4 + bobOffset, 5.5);
    g.fill({ color: hair });

    if (this.direction === "down" || this.direction === "up") {
      const eyeY = (this.direction === "down" ? 9 : 7) + bobOffset;
      g.circle(cx - 2.5, eyeY, 1.2);
      g.circle(cx + 2.5, eyeY, 1.2);
      g.fill({ color: 0x1a1a1a });
    }

    if (this.accessory === "hat") {
      g.roundRect(cx - 7, 0 + bobOffset, 14, 3, 1);
      g.fill({ color: 0x8B1a1a });
      g.roundRect(cx - 5, -4 + bobOffset, 10, 6, 1);
      g.fill({ color: 0xb02020 });
    } else if (this.accessory === "glasses") {
      const gy = (this.direction === "down" ? 9 : 7) + bobOffset - 0.5;
      g.rect(cx - 5.5, gy - 1.5, 4, 3);
      g.stroke({ width: 0.8, color: 0x1a1a1a });
      g.rect(cx + 1.5, gy - 1.5, 4, 3);
      g.stroke({ width: 0.8, color: 0x1a1a1a });
      g.rect(cx - 1.5, gy - 0.5, 3, 1);
      g.fill({ color: 0x1a1a1a });
    }

    const dotColor = STATUS_DOT_COLORS[this.status];
    g.circle(AVATAR_SIZE - 2, 1, 4);
    g.fill({ color: 0x000000, alpha: 0.4 });
    g.circle(AVATAR_SIZE - 2, 1, 3);
    g.fill({ color: dotColor });

    if (this.isMoving) {
      const legSwing = Math.sin(this.animFrame * 0.8) * 3;
      g.roundRect(7, 19 + legSwing, 4, 5, 1);
      g.fill({ color: pants });
      g.roundRect(13, 19 - legSwing, 4, 5, 1);
      g.fill({ color: pants });
    } else {
      g.roundRect(7, 19, 4, 5, 1);
      g.roundRect(13, 19, 4, 5, 1);
      g.fill({ color: pants });
    }

    this.bubbleContainer.x = AVATAR_SIZE / 2;
    this.bubbleContainer.y = -(this.bubbleBg.height || 0) - 4;
  }

  showChatBubble(text: string): void {
    this.bubbleText.text = text.slice(0, 60);
    const tw = this.bubbleText.width;
    const th = this.bubbleText.height;
    this.bubbleBg.clear();
    this.bubbleBg.roundRect(-tw / 2 - 5, 0, tw + 10, th + 8, 4);
    this.bubbleBg.fill({ color: 0xF5E2B8 });
    this.bubbleBg.roundRect(-tw / 2 - 5, 0, tw + 10, th + 8, 4);
    this.bubbleBg.stroke({ width: 1.5, color: 0x5B3417 });
    this.bubbleText.x = -tw / 2;
    this.bubbleText.y = 4;
    this.bubbleContainer.y = -(th + 16);
    this.bubbleContainer.visible = true;
    this.bubbleTimer = 4;
  }

  update(delta: number, moving: boolean, direction: Direction): void {
    this.isMoving  = moving;
    this.direction = direction;

    if (moving) {
      this.animTimer += delta;
      if (this.animTimer > 0.08) {
        this.animFrame++;
        this.animTimer = 0;
      }
    } else {
      this.animFrame = 0;
    }

    if (this.bubbleContainer.visible) {
      this.bubbleTimer -= delta;
      if (this.bubbleTimer <= 0) {
        this.bubbleContainer.visible = false;
      } else if (this.bubbleTimer < 1) {
        this.bubbleContainer.alpha = this.bubbleTimer;
      } else {
        this.bubbleContainer.alpha = 1;
      }
    }

    this.draw();
  }

  setPosition(x: number, y: number): void {
    this.container.x = x;
    this.container.y = y;
  }

  getPosition(): { x: number; y: number } {
    return { x: this.container.x, y: this.container.y };
  }

  setName(name: string): void {
    this.label.text = name;
  }

  setStatus(status: PlayerStatus): void {
    if (this.status !== status) {
      this.status = status;
      this.draw();
    }
  }
}
