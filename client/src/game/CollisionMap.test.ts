import { describe, it, expect } from "vitest";
import { CollisionMap } from "./CollisionMap";
import type { GameMap } from "@shared/types";

function makeMap(collisionData: number[]): GameMap {
  return {
    version: "1.10",
    tiledversion: "1.10.0",
    width: 5,
    height: 5,
    tilewidth: 32,
    tileheight: 32,
    layers: [
      {
        id: 1,
        name: "Ground",
        type: "tilelayer",
        data: Array(25).fill(1),
        width: 5,
        height: 5,
        visible: true,
        opacity: 1,
        x: 0,
        y: 0,
      },
      {
        id: 2,
        name: "Collision",
        type: "tilelayer",
        data: collisionData,
        width: 5,
        height: 5,
        visible: false,
        opacity: 1,
        x: 0,
        y: 0,
      },
    ],
    tilesets: [
      {
        firstgid: 1,
        name: "test",
        tilewidth: 32,
        tileheight: 32,
        spacing: 0,
        margin: 0,
        columns: 8,
        tilecount: 64,
        imagewidth: 256,
        imageheight: 256,
        image: "test.png",
      },
    ],
  };
}

describe("CollisionMap", () => {
  it("reports solid for wall tiles", () => {
    const data = Array(25).fill(0);
    data[0] = 1; // top-left tile is wall
    const col = new CollisionMap(makeMap(data));
    expect(col.isSolid(0, 0)).toBe(true);
    expect(col.isSolid(1, 0)).toBe(false);
  });

  it("reports solid for out-of-bounds coordinates", () => {
    const col = new CollisionMap(makeMap(Array(25).fill(0)));
    expect(col.isSolid(-1, 0)).toBe(true);
    expect(col.isSolid(0, -1)).toBe(true);
    expect(col.isSolid(5, 0)).toBe(true);
    expect(col.isSolid(0, 5)).toBe(true);
  });

  it("detects bounding box collision", () => {
    // Wall at tile (0,0) = world position (0..31, 0..31)
    const data = Array(25).fill(0);
    data[0] = 1;
    const col = new CollisionMap(makeMap(data));

    // Box at (40, 40) with 24x28 should NOT collide
    expect(col.wouldCollide(40, 40, 24, 28)).toBe(false);

    // Box at (0, 0) with 24x28 should collide with wall at tile (0,0)
    expect(col.wouldCollide(0, 0, 24, 28, 0)).toBe(true);
  });

  it("allows movement along walls without getting stuck", () => {
    // Wall on entire top row (tiles 0..4 of row 0)
    const data = Array(25).fill(0);
    for (let i = 0; i < 5; i++) data[i] = 1;
    const col = new CollisionMap(makeMap(data));

    // Player below the wall, moving right — should not collide
    expect(col.wouldCollide(64, 36, 24, 28)).toBe(false);
  });
});
