import type { GameMap, TileLayer } from "@shared/types";
import { MAP_COLLISION_LAYER } from "@shared/constants";

export class CollisionMap {
  private data: Uint8Array;
  private width: number;
  private height: number;
  private tileSize: number;

  constructor(map: GameMap) {
    this.width = map.width;
    this.height = map.height;
    this.tileSize = map.tilewidth;
    this.data = new Uint8Array(this.width * this.height);
    this.buildFromMap(map);
  }

  private buildFromMap(map: GameMap): void {
    const collisionLayer = map.layers.find(
      (l): l is TileLayer =>
        l.type === "tilelayer" && l.name === MAP_COLLISION_LAYER
    );
    if (!collisionLayer) return;

    for (let i = 0; i < collisionLayer.data.length; i++) {
      this.data[i] = collisionLayer.data[i] !== 0 ? 1 : 0;
    }
  }

  isSolid(tileX: number, tileY: number): boolean {
    if (tileX < 0 || tileY < 0 || tileX >= this.width || tileY >= this.height) {
      return true;
    }
    return this.data[tileY * this.width + tileX] === 1;
  }

  // Check if a world-pixel bounding box collides with any solid tile.
  // Uses a small margin so the player doesn't get stuck on tile edges.
  wouldCollide(
    worldX: number,
    worldY: number,
    boxWidth: number,
    boxHeight: number,
    margin = 2
  ): boolean {
    const left = worldX + margin;
    const right = worldX + boxWidth - margin;
    const top = worldY + margin;
    const bottom = worldY + boxHeight - margin;

    const tileLeft = Math.floor(left / this.tileSize);
    const tileRight = Math.floor(right / this.tileSize);
    const tileTop = Math.floor(top / this.tileSize);
    const tileBottom = Math.floor(bottom / this.tileSize);

    for (let ty = tileTop; ty <= tileBottom; ty++) {
      for (let tx = tileLeft; tx <= tileRight; tx++) {
        if (this.isSolid(tx, ty)) return true;
      }
    }
    return false;
  }
}
