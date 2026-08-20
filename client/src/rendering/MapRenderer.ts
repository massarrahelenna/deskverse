import * as PIXI from "pixi.js";
import type { GameMap } from "@shared/types";
import { WORLD_W, WORLD_H } from "@shared/constants";

const P = {
  plankDark:    0xCE9C5C,
  plankLight:   0xD9A96A,
  plankHiDark:  0xDCAF71,
  plankHiLight: 0xE6BC80,
  plankShadow:  0xA87A44,

  wallFill:   0x7A4A22,
  wallBorder: 0x3A2413,
  wallHi:     0xA9793E,
  wallHi2:    0x8B5A2B,
  wallBot:    0x4A2A12,
  wallPanel:  0x5B3417,

  cm:      0x4E8F86,
  cmBdr:   0x2E5A54,
  cmMid:   0x3F7A72,
  cmInner: 0x5AA398,
  cmTick:  0x7FC4B6,

  cf:      0x7A63A8,
  cfBdr:   0x4A3A70,
  cfMid:   0x8E79BC,
  cfInner: 0xA08ACC,

  kitA:    0xE6DCC6,
  kitB:    0xD3C4A8,
  kitDot:  0xBEAE92,

  desk:    0x8B5A2B,
  deskHi:  0xA9793E,
  deskBot: 0x5B3417,
  deskBdr: 0x3A2413,

  chairSeat: 0x6B4A2E,
  chairBack: 0x7A5535,
  chairHi:   0x87603D,
  chairBdr:  0x2E2117,

  monBody:   0x2E2A28,
  monBdr:    0x191512,
  monScreen: 0x4E7C9E,
  monHi:     0x7FB0C8,

  counter:    0xC7A876,
  counterHi:  0xDCC08A,
  counterBot: 0x8A6E44,

  signBoard: 0x8B5A2B,
  signBdr:   0x3A2413,
  signHi:    0xA97441,
  signPaper: 0xF5E2B8,
  signInk:   0x4A2E12,

  sofaFill: 0x4E6C7E,
  sofaBack: 0x5F8296,
  sofaBdr:  0x2E3A44,
  sofaSeat: 0x6E92A6,
  sofaArm:  0x3E5A6C,

  potFill:  0xB5713F,
  potBdr:   0x5B3417,
  potHi:    0xCE8A55,
  plantFill: 0x3F7A38,
  plantBdr:  0x23401F,
  plantHi:   0x5B9A4C,

  glass:     0x8FC7C4,
  glassHi:   0xB6E0DC,
  glassDivider: 0x5B3417,
};

function rect(g: PIXI.Graphics, x: number, y: number, w: number, h: number, color: number, alpha = 1) {
  g.rect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  g.fill({ color, alpha });
}

export class MapRenderer {
  private container: PIXI.Container;
  private map: GameMap;

  constructor(map: GameMap) {
    this.map = map;
    this.container = new PIXI.Container();
    this.container.label = "MapRenderer";
  }

  async load(): Promise<void> {}

  buildLayers(): void {
    this.container.removeChildren();
    const g = new PIXI.Graphics();
    this.container.addChild(g);

    this.drawFloorPlanks(g);
    this.drawMeetingCarpet(g);
    this.drawFocusCarpet(g);
    this.drawKitchenFloor(g);
    this.drawThresholds(g);
    this.drawWalls(g);
    this.drawGlassWindows(g);
    this.drawWorkDesks(g);
    this.drawMeetingTable(g);
    this.drawCounter(g);
    this.drawSofa(g);
    this.drawBookshelf(g);
    this.drawPots(g);
    this.drawSigns();
  }

  private drawFloorPlanks(g: PIXI.Graphics): void {
    for (let py = 0; py < WORLD_H; py += 16) {
      const isDark = Math.floor(py / 16) % 2 === 1;
      const fill  = isDark ? P.plankDark  : P.plankLight;
      const hi    = isDark ? P.plankHiDark : P.plankHiLight;

      rect(g, 0, py, WORLD_W, 16, fill);
      rect(g, 0, py, WORLD_W, 2, hi);
      rect(g, 0, py + 14, WORLD_W, 2, P.plankShadow);

      const off = isDark ? 0 : 48;
      for (let px = off; px < WORLD_W; px += 96) {
        rect(g, px, py, 2, 16, P.plankShadow);
      }
    }
  }

  private drawMeetingCarpet(g: PIXI.Graphics): void {
    const zx = 608, zy = 32, zw = 320, zh = 224;
    const rx = zx + 24, ry = zy + 16, rw = zw - 48, rh = zh - 40;

    rect(g, rx - 2, ry - 2, rw + 4, rh + 4, P.cmBdr);
    rect(g, rx, ry, rw, rh, P.cm);
    rect(g, rx + 4, ry + 4, rw - 8, rh - 8, P.cmMid);
    rect(g, rx + 10, ry + 10, rw - 20, rh - 20, P.cmInner);

    for (let tx = rx + 16; tx < rx + rw - 16; tx += 16) {
      rect(g, tx, ry + 6, 8, 4, P.cmTick);
      rect(g, tx, ry + rh - 10, 8, 4, P.cmTick);
    }
    for (let ty = ry + 16; ty < ry + rh - 16; ty += 16) {
      rect(g, rx + 6, ty, 4, 8, P.cmTick);
      rect(g, rx + rw - 10, ty, 4, 8, P.cmTick);
    }
  }

  private drawFocusCarpet(g: PIXI.Graphics): void {
    const zx = 32, zy = 480, zw = 224, zh = 128;
    const rx = zx + 28, ry = zy + 26, rw = zw - 56, rh = zh - 52;

    rect(g, rx - 2, ry - 2, rw + 4, rh + 4, P.cfBdr);
    rect(g, rx, ry, rw, rh, P.cf);
    rect(g, rx + 8, ry + 8, rw - 16, rh - 16, P.cfMid);
    rect(g, rx + 20, ry + 20, rw - 40, rh - 40, P.cfInner);
  }

  private drawKitchenFloor(g: PIXI.Graphics): void {
    const kx = 608, ky = 416, kw = 320, kh = 192;
    const ts = 16;
    for (let ty = ky; ty < ky + kh; ty += ts) {
      for (let tx = kx; tx < kx + kw; tx += ts) {
        const isA = (Math.floor(tx / ts) + Math.floor(ty / ts)) % 2 === 0;
        rect(g, tx, ty, ts, ts, isA ? P.kitA : P.kitB);
        rect(g, tx, ty, 2, 2, P.kitDot);
      }
    }
  }

  private drawWalls(g: PIXI.Graphics): void {
    const layer = this.map.layers.find(
      (l) => l.type === "tilelayer" && l.name === "Ground"
    );
    if (!layer || layer.type !== "tilelayer") return;
    const cols = this.map.width;
    const ts = this.map.tilewidth;

    const wallSet = new Set<number>();
    for (let i = 0; i < layer.data.length; i++) {
      if (layer.data[i] === 2) wallSet.add(i);
    }
    const isWall = (col: number, row: number) =>
      col >= 0 && col < cols && wallSet.has(row * cols + col);

    for (const i of wallSet) {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const wx = col * ts;
      const wy = row * ts;

      rect(g, wx, wy + ts, ts, 6, 0x321E0F, 0.25);
      rect(g, wx, wy, ts, ts, P.wallFill);

      if (!isWall(col, row - 1)) {
        rect(g, wx, wy, ts, 6, P.wallHi);
        rect(g, wx, wy + 6, ts, 2, P.wallHi2);
      }
      if (!isWall(col, row + 1)) {
        rect(g, wx, wy + ts - 4, ts, 4, P.wallBot);
      }

      const isHoriz = isWall(col - 1, row) || isWall(col + 1, row);
      if (isHoriz) {
        for (let px = wx + 16; px < wx + ts; px += 32) {
          rect(g, px, wy + 8, 2, ts - 12, P.wallPanel);
        }
      } else {
        for (let py = wy + 16; py < wy + ts; py += 32) {
          rect(g, wx + 4, py, ts - 8, 2, P.wallPanel);
        }
      }
    }
  }

  private drawThresholds(g: PIXI.Graphics): void {
    for (let ty = 192; ty < 256; ty += 8) rect(g, 576, ty, 32, 4, 0xC08A4E);
    for (let tx = 160; tx < 224; tx += 8) rect(g, tx, 448, 4, 32, 0xC08A4E);
  }

  private drawGlassWindows(g: PIXI.Graphics): void {
    for (const gx of [672, 800]) {
      rect(g, gx - 1, 262, 97, 22, P.wallBorder);
      rect(g, gx, 262, 96, 20, P.glass);
      rect(g, gx, 262, 96, 6, P.glassHi);
      rect(g, gx + 30, 262, 4, 20, P.glassDivider);
      rect(g, gx + 62, 262, 4, 20, P.glassDivider);
    }
  }

  private drawWorkDesks(g: PIXI.Graphics): void {
    const desks = [
      { x: 96,  y: 96  },
      { x: 320, y: 96  },
      { x: 96,  y: 256 },
      { x: 320, y: 256 },
    ];
    const dw = 96, dh = 32;

    for (const d of desks) {
      const cx = d.x + dw / 2;

      this.drawChair(g, cx, d.y + dh + 28, "south");
      rect(g, d.x, d.y + dh, dw, 6, 0x32_1E_0F, 0.22);

      rect(g, d.x - 1, d.y - 1, dw + 2, dh + 2, P.deskBdr);
      rect(g, d.x, d.y, dw, dh, P.desk);
      rect(g, d.x, d.y, dw, 6, P.deskHi);
      rect(g, d.x, d.y + dh - 4, dw, 4, P.deskBot);

      this.drawMonitor(g, cx, d.y + 18);

      rect(g, d.x + 8, d.y + 14, 18, 12, P.signPaper);
      rect(g, d.x + 8, d.y + 14, 18, 12, 0xA88E62, 0.0);
      g.rect(d.x + 8, d.y + 14, 18, 12);
      g.stroke({ width: 1, color: 0xA88E62 });

      this.drawMug(g, d.x + dw - 14, d.y + 20, 0xB34A34);
    }
  }

  private drawChair(g: PIXI.Graphics, cx: number, cy: number, facing: "south" | "north" | "east" | "west") {
    const cw = 32, ch = 24;
    const bx = cx - cw / 2, by = cy - ch / 2;

    rect(g, bx - 1, by - 1, cw + 2, ch + 2, P.chairBdr);
    rect(g, bx, by, cw, ch, P.chairSeat);
    rect(g, bx, by, cw, 4, P.chairHi);

    if (facing === "south") {
      rect(g, bx - 2, by - 10, cw + 4, 10, P.chairBdr);
      rect(g, bx - 2, by - 10, cw + 4, 10, P.chairBack);
    } else if (facing === "north") {
      rect(g, bx - 2, by + ch, cw + 4, 10, P.chairBdr);
      rect(g, bx - 2, by + ch, cw + 4, 10, P.chairBack);
    }
  }

  private drawMonitor(g: PIXI.Graphics, cx: number, y: number) {
    const mw = 28, mh = 16;
    rect(g, cx - mw / 2 - 1, y - mh - 1, mw + 2, mh + 2, P.monBdr);
    rect(g, cx - mw / 2, y - mh, mw, mh, P.monBody);
    rect(g, cx - mw / 2 + 3, y - mh + 3, mw - 6, mh - 6, P.monScreen);
    rect(g, cx - mw / 2 + 3, y - mh + 3, 8, 3, P.monHi);
    rect(g, cx - 3, y, 6, 3, P.monBody);
    rect(g, cx - 7, y + 3, 14, 2, P.monBdr);
  }

  private drawMug(g: PIXI.Graphics, cx: number, cy: number, color: number) {
    rect(g, cx - 3, cy - 4, 6, 6, P.wallBorder);
    rect(g, cx - 3, cy - 4, 6, 6, color);
    rect(g, cx + 3, cy - 3, 2, 3, color);
  }

  private drawMeetingTable(g: PIXI.Graphics): void {
    const tx = 668, ty = 76, tw = 200, th = 88;
    const tcx = 768, tcy = 120;

    const northY = ty - 12;
    const southY = ty + th + 6;
    for (let i = -1; i <= 1; i++) {
      this.drawChair(g, tcx + i * 68, northY, "north");
      this.drawChair(g, tcx + i * 68, southY, "south");
    }

    rect(g, tx, ty + th, tw, 8, 0x32_1E_0F, 0.22);

    rect(g, tx - 1, ty - 1, tw + 2, th + 2, P.deskBdr);
    rect(g, tx, ty, tw, th, P.desk);
    rect(g, tx, ty, tw, 8, P.deskHi);
    rect(g, tx + 8, ty + 10, tw - 16, th - 22, 0x9C6837);
    rect(g, tx, ty + th - 6, tw, 6, P.deskBot);

    this.drawLaptop(g, tcx - 56, tcy + 4, P.monScreen);
    this.drawLaptop(g, tcx + 56, tcy + 4, P.cf);

    this.drawMug(g, tcx - 16, tcy + 14, P.signPaper);
    rect(g, tcx + 8, tcy - 12, 18, 12, P.signPaper);
    g.rect(tcx + 8, tcy - 12, 18, 12);
    g.stroke({ width: 1, color: 0xA88E62 });

    const tvx = tcx - 44, tvy = 32 + 4;
    rect(g, tvx - 1, tvy - 1, 90, 24, P.monBdr);
    rect(g, tvx, tvy, 88, 22, P.monBody);
    rect(g, tvx + 3, tvy + 3, 82, 16, P.monScreen);
    rect(g, tvx + 3, tvy + 3, 30, 4, P.monHi);
  }

  private drawLaptop(g: PIXI.Graphics, cx: number, cy: number, screenColor: number) {
    const sw = 18, sh = 9;
    rect(g, cx - sw / 2 - 1, cy - sh - 1, sw + 2, sh + 2, P.monBdr);
    rect(g, cx - sw / 2, cy - sh, sw, sh, P.monBody);
    rect(g, cx - sw / 2 + 2, cy - sh + 2, sw - 4, sh - 4, screenColor);
    rect(g, cx - sw / 2 - 1, cy, sw + 2, 4, P.monBdr);
    rect(g, cx - sw / 2, cy, sw, 4, 0x3E3A38);
  }

  private drawCounter(g: PIXI.Graphics): void {
    const cx = 672, cy = 512, cw = 192, ch = 32;

    rect(g, cx, cy + ch, cw, 6, 0x32_1E_0F, 0.22);
    rect(g, cx - 1, cy - 1, cw + 2, ch + 2, P.wallBorder);
    rect(g, cx, cy, cw, ch, P.counter);
    rect(g, cx, cy, cw, 6, P.counterHi);
    rect(g, cx, cy + ch - 6, cw, 6, P.counterBot);

    for (let dx = cx + 32; dx < cx + cw; dx += 32) {
      rect(g, dx, cy + 8, 2, ch - 14, P.counterBot);
    }

    rect(g, cx + 12, cy - 24, 26, 28, P.monBdr);
    rect(g, cx + 14, cy - 22, 22, 24, P.monBody);
    rect(g, cx + 18, cy - 16, 14, 8, 0xB34A34);

    for (const [mcx, mcolor] of [[cx + 104, P.signPaper], [cx + 124, P.glass]]) {
      const mcy = cy - 4;
      rect(g, mcx - 8, mcy - 10, 16, 16, P.deskBot);
      rect(g, mcx - 6, mcy - 8, 12, 12, mcolor);
      rect(g, mcx + 6, mcy - 6, 4,  6,  mcolor);
    }

    const rx = 864, ry = 448, rw = 56, rh = 64;
    rect(g, rx - 1, ry - 1, rw + 2, rh + 2, P.wallBorder);
    rect(g, rx, ry, rw, rh, 0xDDD8CC);
    rect(g, rx, ry, rw, 6, 0xEFEBE0);
    rect(g, rx, ry + 36, rw, 4, 0xA9A296);
    rect(g, rx + rw - 10, ry + 14, 4, 14, 0x8A8478);

    rect(g, 641, 471, 30, 26, P.deskBdr);
    rect(g, 642, 472, 28, 24, P.desk);
    rect(g, 642, 472, 28, 6, P.deskHi);
    this.drawChair(g, 656, 452, "north");
    this.drawChair(g, 656, 514, "south");
  }

  private drawSofa(g: PIXI.Graphics): void {
    const sx = 352, sy = 452, sw = 124, sh = 44;

    rect(g, sx, sy + sh, sw, 6, 0x32_1E_0F, 0.22);
    rect(g, sx - 1, sy - 1, sw + 2, sh + 2, P.sofaBdr);
    rect(g, sx, sy, sw, sh, P.sofaFill);
    rect(g, sx, sy, sw, 12, P.sofaBack);

    rect(g, sx, sy + 10, 10, sh - 10, P.sofaArm);
    rect(g, sx + sw - 10, sy + 10, 10, sh - 10, P.sofaArm);

    rect(g, sx + 6, sy + 16, 50, 22, P.sofaSeat);
    rect(g, sx + 68, sy + 16, 50, 22, P.sofaSeat);
    g.rect(sx + 6, sy + 16, 50, 22); g.stroke({ width: 1, color: P.sofaBdr });
    g.rect(sx + 68, sy + 16, 50, 22); g.stroke({ width: 1, color: P.sofaBdr });

    const ltx = 388, lty = 504, ltw = 56, lth = 28;
    rect(g, ltx - 1, lty - 1, ltw + 2, lth + 2, P.deskBdr);
    rect(g, ltx, lty, ltw, lth, P.desk);
    rect(g, ltx, lty, ltw, 6, P.deskHi);
    rect(g, ltx + 12, lty + 8, 20, 14, P.signPaper);
  }

  private drawBookshelf(g: PIXI.Graphics): void {
    const bx = 36, by = 128, bw = 24, bh = 96;
    rect(g, bx - 1, by - 1, bw + 2, bh + 2, P.wallBorder);
    rect(g, bx, by, bw, bh, P.wallFill);

    const spines = [0xB34A34, P.cm, 0xD9A03C, P.cf, 0xC86A86, 0x4E7C9E];
    for (let i = 0; i < 8; i++) {
      rect(g, bx + 4, by + 8 + i * 10, bw - 8, 6, spines[i % spines.length]);
    }
  }

  private drawPots(g: PIXI.Graphics): void {
    const positions: Array<[number, number]> = [
      [20, 70],
      [20, 548],
      [936, 130],
      [936, 478],
      [210, 12],
      [742, 12],
      [330, 628],
      [642, 628],
      [t(16) + 16, t(2) + 14],
      [t(2) + 16, t(11) + 18],
      [t(27) + 10, t(10) + 18],
      [t(9) + 10, t(16) + 18],
    ];
    for (const [px, py] of positions) {
      this.drawPot(g, px, py);
    }
  }

  private drawPot(g: PIXI.Graphics, cx: number, cy: number) {
    const pw = 20, ph = 14;
    rect(g, cx - pw / 2 - 1, cy - 1, pw + 2, ph + 2, P.potBdr);
    rect(g, cx - pw / 2, cy, pw, ph, P.potFill);
    rect(g, cx - pw / 2, cy, pw, 4, P.potHi);
    const plw = pw - 4, plh = 18;
    rect(g, cx - plw / 2 - 1, cy - plh - 1, plw + 2, plh + 2, P.plantBdr);
    rect(g, cx - plw / 2, cy - plh, plw, plh, P.plantFill);
    rect(g, cx - plw / 2 + 4, cy - plh - 3, plw - 8, 4, P.plantFill);
    rect(g, cx - plw / 2 + 4, cy - plh + 4, plw - 8, 4, P.plantHi);
  }

  private drawSigns(): void {
    const signs: Array<{ label: string; cx: number; cy: number }> = [
      { label: "REUNIÃO",   cx: t(23),     cy: t(9) + 24  },
      { label: "FOCO",     cx: t(4) + 16, cy: t(13) + 18 },
      { label: "COPA",     cx: t(24),     cy: t(12) + 20 },
    ];

    const style = new PIXI.TextStyle({
      fontFamily: "'Pixelify Sans', monospace",
      fontSize: 12,
      fontWeight: "600",
      fill: P.signInk,
    });

    for (const s of signs) {
      const text = new PIXI.Text({ text: s.label, style });
      text.anchor.set(0.5, 0.5);
      text.x = s.cx;
      text.y = s.cy - 10;

      const tw = Math.ceil(text.width) + 26;
      const th = 22;
      const bx = s.cx - tw / 2;
      const by = s.cy - th - 0;

      const sg = new PIXI.Graphics();
      rect(sg, bx - 1, by - 1, tw + 2, th + 2, P.signBdr);
      rect(sg, bx, by, tw, th, P.signBoard);
      rect(sg, bx, by, tw, 4, P.signHi);
      rect(sg, bx + 2, by + 6, tw - 4, th - 8, P.signPaper);

      text.y = by + th / 2 + 1;

      this.container.addChild(sg);
      this.container.addChild(text);
    }
  }

  getContainer(): PIXI.Container { return this.container; }
  getMapWidth():  number { return WORLD_W; }
  getMapHeight(): number { return WORLD_H; }
}

function t(tile: number): number { return tile * 32; }
