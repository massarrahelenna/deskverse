import * as PIXI from "pixi.js";
import { AvatarRenderer } from "./AvatarRenderer";
import type { PlayerState } from "@shared/types";
import { INTERPOLATION_MS } from "@shared/constants";

interface Entry {
  renderer: AvatarRenderer;
  renderX: number;
  renderY: number;
  targetX: number;
  targetY: number;
}

export class RemotePlayerRenderer {
  private container: PIXI.Container;
  private entries = new Map<string, Entry>();

  constructor(container: PIXI.Container) {
    this.container = container;
  }

  sync(players: Record<string, PlayerState>, deltaSec: number): void {
    for (const [id, player] of Object.entries(players)) {
      let entry = this.entries.get(id);
      if (!entry) {
        const renderer = new AvatarRenderer(
          player.name,
          player.avatarSkin,
          player.shirtIndex,
          false,
          player.hairColor  ?? "#2c1a0e",
          player.accessory  ?? "none",
          player.pantsColor ?? "#334155",
        );
        renderer.container.zIndex = player.y;
        entry = {
          renderer,
          renderX: player.x,
          renderY: player.y,
          targetX: player.x,
          targetY: player.y,
        };
        this.container.addChild(renderer.container);
        this.entries.set(id, entry);
      }
      entry.targetX = player.x;
      entry.targetY = player.y;
      entry.renderer.update(deltaSec, player.animation === "walk", player.direction);
      entry.renderer.setStatus(player.status);
    }

    for (const [id, entry] of this.entries) {
      if (!(id in players)) {
        this.container.removeChild(entry.renderer.container);
        this.entries.delete(id);
      }
    }
  }

  showBubble(playerId: string, text: string): void {
    this.entries.get(playerId)?.renderer.showChatBubble(text);
  }

  tick(deltaMs: number): void {
    const alpha = 1 - Math.exp(-deltaMs / INTERPOLATION_MS);
    for (const entry of this.entries.values()) {
      entry.renderX += (entry.targetX - entry.renderX) * alpha;
      entry.renderY += (entry.targetY - entry.renderY) * alpha;
      entry.renderer.setPosition(entry.renderX, entry.renderY);
      entry.renderer.container.zIndex = entry.renderY;
    }
  }

  destroy(): void {
    for (const entry of this.entries.values()) {
      this.container.removeChild(entry.renderer.container);
    }
    this.entries.clear();
  }
}
