import type { GameMap, ObjectLayer } from "@shared/types";
import { SocketManager } from "../networking/SocketManager";

const AVATAR_W = 24;
const AVATAR_H = 28;

interface ZoneDef {
  zoneId: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

export class ZoneDetector {
  private zones: ZoneDef[] = [];
  private inside = new Set<string>();

  constructor(map: GameMap) {
    const layer = map.layers.find(
      (l): l is ObjectLayer => l.type === "objectgroup" && l.name === "Zones"
    );
    if (!layer) return;
    for (const obj of layer.objects) {
      const zoneId = obj.properties?.zoneId as string | undefined;
      if (zoneId) {
        this.zones.push({ zoneId, x: obj.x, y: obj.y, w: obj.width, h: obj.height });
      }
    }
  }

  update(px: number, py: number): void {
    const cx = px + AVATAR_W / 2;
    const cy = py + AVATAR_H / 2;

    for (const z of this.zones) {
      const isIn = cx >= z.x && cx < z.x + z.w && cy >= z.y && cy < z.y + z.h;
      const was = this.inside.has(z.zoneId);
      if (isIn && !was) {
        this.inside.add(z.zoneId);
        SocketManager.sendZoneEnter(z.zoneId);
      } else if (!isIn && was) {
        this.inside.delete(z.zoneId);
        SocketManager.sendZoneLeave(z.zoneId);
      }
    }
  }

  clearAll(): void {
    for (const zoneId of this.inside) {
      SocketManager.sendZoneLeave(zoneId);
    }
    this.inside.clear();
  }

  // Reset internal state without notifying the server (used after WS reconnect
  // so zones are re-entered on the next tick and the server gets fresh ZONE_ENTER events).
  reset(): void {
    this.inside.clear();
  }
}
