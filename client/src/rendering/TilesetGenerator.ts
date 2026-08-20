import * as PIXI from "pixi.js";

const TILE_SIZE = 32;

const TILE_COLORS: Record<number, string> = {
  1: "#3d4a6b",
  2: "#1a1a2e",
  3: "#5c4033",
  4: "#4a3228",
  5: "#2e5339",
  6: "#7ab8f5",
};

export function generateOfficeTileset(columns = 8, rows = 8): PIXI.Texture {
  const canvas = document.createElement("canvas");
  canvas.width = columns * TILE_SIZE;
  canvas.height = rows * TILE_SIZE;
  const ctx = canvas.getContext("2d")!;

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < columns; col++) {
      const gid = row * columns + col + 1;
      const x = col * TILE_SIZE;
      const y = row * TILE_SIZE;

      const color = TILE_COLORS[gid];
      if (!color) continue;

      ctx.fillStyle = color;
      ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);

      ctx.strokeStyle = "rgba(0,0,0,0.2)";
      ctx.lineWidth = 1;
      ctx.strokeRect(x + 0.5, y + 0.5, TILE_SIZE - 1, TILE_SIZE - 1);

      if (gid === 1) {
        ctx.strokeStyle = "rgba(255,255,255,0.04)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x, y + TILE_SIZE / 2);
        ctx.lineTo(x + TILE_SIZE, y + TILE_SIZE / 2);
        ctx.moveTo(x + TILE_SIZE / 2, y);
        ctx.lineTo(x + TILE_SIZE / 2, y + TILE_SIZE);
        ctx.stroke();
      }

      if (gid === 2) {
        ctx.fillStyle = "rgba(255,255,255,0.05)";
        ctx.fillRect(x, y, TILE_SIZE, 4);
      }

      if (gid === 3) {
        ctx.fillStyle = "#1e293b";
        ctx.fillRect(x + 6, y + 4, 20, 14);
        ctx.fillStyle = "#38bdf8";
        ctx.fillRect(x + 7, y + 5, 18, 12);
        ctx.fillStyle = "#475569";
        ctx.fillRect(x + 14, y + 18, 4, 6);
      }

      if (gid === 4) {
        ctx.fillStyle = "rgba(0,0,0,0.15)";
        ctx.fillRect(x, y, TILE_SIZE, 8);
      }
    }
  }

  return PIXI.Texture.from(canvas);
}
