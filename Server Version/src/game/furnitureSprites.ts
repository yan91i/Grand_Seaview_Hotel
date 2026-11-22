import Phaser from 'phaser';

/* ------------------------------------------------------------------ *
 * 程序化像素美术素材库：家具 / 设施设备 / 装饰。
 * 与角色贴图同一套像素风格（这里按家具实际尺寸绘制 1:1 像素画），
 * 保证无需任何外部图片资源即可渲染出有辨识度的房间与设施。
 * ------------------------------------------------------------------ */

type Ctx = CanvasRenderingContext2D;

/** 调色板：A/B/C 为主题色（由家具自身的 color 派生），其余为公共色。 */
export interface Col {
  A: string;
  B: string;
  C: string;
  D: string;
  W: string;
  M: string;
  m: string;
  G: string;
  g: string;
  n: string;
  Y: string;
  R: string;
  K: string;
  H: string;
  h: string;
  S: string;
}

export type SpriteDraw = (ctx: Ctx, w: number, h: number, c: Col) => void;

/* --------------------------- 绘制小工具 --------------------------- */

function R(ctx: Ctx, x: number, y: number, w: number, h: number, col: string): void {
  if (w <= 0 || h <= 0) return;
  ctx.fillStyle = col;
  ctx.fillRect(Math.round(x), Math.round(y), Math.max(1, Math.round(w)), Math.max(1, Math.round(h)));
}

function RR(ctx: Ctx, x: number, y: number, w: number, h: number, r: number, col: string): void {
  const rr = Math.max(0, Math.min(r, Math.min(w, h) / 2));
  ctx.fillStyle = col;
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
  ctx.fill();
}

function C2(ctx: Ctx, cx: number, cy: number, r: number, col: string): void {
  if (r <= 0) return;
  ctx.fillStyle = col;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
}

/** 家具外框 + 柔和描边，统一各素材的轮廓风格 */
function shell(ctx: Ctx, w: number, h: number, c: Col, r = 4): void {
  RR(ctx, 0, 0, w, h, r, c.D);
  RR(ctx, 1.5, 1.5, w - 3, h - 3, r, c.A);
}

/* --------------------------- 素材定义 --------------------------- */

const DRAW: Record<string, SpriteDraw> = {
  /* ---------------- 客房 / 卧室 ---------------- */
  bed: (ctx, w, h, c) => {
    shell(ctx, w, h, c, 5);
    R(ctx, 2, 2, w - 4, h * 0.14, c.H); // 床头板
    R(ctx, 4, h * 0.16, w - 8, 2, c.B);
    R(ctx, 4, h * 0.20, w - 8, h * 0.34, c.C); // 被褥
    R(ctx, 4, h * 0.54, w - 8, h * 0.42, c.W); // 床单
    // 枕头
    RR(ctx, 6, 4, w * 0.36, h * 0.20, 3, c.W);
    RR(ctx, w * 0.58, 4, w * 0.36, h * 0.20, 3, c.W);
    R(ctx, 4, h * 0.52, w - 8, 2, c.B);
  },

  bunkbed: (ctx, w, h, c) => {
    R(ctx, 0, 0, w, h, c.D);
    R(ctx, 2, 2, w * 0.12, h - 4, c.M);
    R(ctx, w - 2 - w * 0.12, 2, w * 0.12, h - 4, c.M);
    R(ctx, w * 0.12, 3, w * 0.76, h * 0.42, c.A);
    R(ctx, w * 0.12, 3, w * 0.76, h * 0.10, c.W);
    R(ctx, w * 0.12, h * 0.55, w * 0.76, h * 0.42, c.A);
    R(ctx, w * 0.12, h * 0.55, w * 0.76, h * 0.10, c.W);
    for (let i = 0; i < 3; i++) R(ctx, w * 0.44, h * 0.42 + i * h * 0.06, w * 0.12, 2, c.m);
  },

  nightstand: (ctx, w, h, c) => {
    shell(ctx, w, h, c, 3);
    R(ctx, 3, h * 0.34, w - 6, 2, c.B);
    R(ctx, w * 0.38, h * 0.5, w * 0.24, h * 0.12, c.M); // 抽屉拉手
    R(ctx, w * 0.62, 2, w * 0.3, h * 0.34, c.Y); // 台灯
    R(ctx, w * 0.72, h * 0.06, w * 0.1, h * 0.26, c.M);
  },

  wardrobe: (ctx, w, h, c) => {
    shell(ctx, w, h, c, 4);
    R(ctx, w / 2 - 1, 4, 2, h - 8, c.B);
    R(ctx, w * 0.42, h * 0.48, w * 0.06, h * 0.3, c.M);
    R(ctx, w * 0.52, h * 0.48, w * 0.06, h * 0.3, c.M);
  },

  /* ---------------- 坐具 ---------------- */
  sofa: (ctx, w, h, c) => {
    shell(ctx, w, h, c, 5);
    RR(ctx, 4, 4, w - 8, h * 0.34, 3, c.B); // 靠背
    RR(ctx, 3, h * 0.30, w * 0.14, h * 0.62, 3, c.B); // 扶手
    RR(ctx, w - 3 - w * 0.14, h * 0.30, w * 0.14, h * 0.62, 3, c.B);
    RR(ctx, w * 0.16, h * 0.36, w * 0.68, h * 0.50, 3, c.C); // 坐垫
    R(ctx, w * 0.5, h * 0.36, 2, h * 0.5, c.B);
  },

  armchair: (ctx, w, h, c) => {
    shell(ctx, w, h, c, 5);
    RR(ctx, 5, 4, w - 10, h * 0.42, 3, c.B);
    RR(ctx, 4, h * 0.34, w * 0.18, h * 0.58, 3, c.B);
    RR(ctx, w - 4 - w * 0.18, h * 0.34, w * 0.18, h * 0.58, 3, c.B);
    RR(ctx, w * 0.22, h * 0.40, w * 0.56, h * 0.46, 3, c.C);
  },

  chair: (ctx, w, h, c) => {
    R(ctx, w * 0.1, h * 0.06, w * 0.8, h * 0.34, c.D);
    R(ctx, w * 0.14, h * 0.10, w * 0.72, h * 0.26, c.B);
    R(ctx, w * 0.06, h * 0.44, w * 0.88, h * 0.26, c.A);
    R(ctx, w * 0.06, h * 0.44, w * 0.88, 2, c.C);
    R(ctx, w * 0.14, h * 0.68, 3, h * 0.3, c.D);
    R(ctx, w - w * 0.14 - 3, h * 0.68, 3, h * 0.3, c.D);
  },

  bench: (ctx, w, h, c) => {
    R(ctx, 0, 0, w, h, c.D);
    RR(ctx, 3, 2, w - 6, h * 0.5, 3, c.H);
    R(ctx, 3, h * 0.24, w - 6, 2, c.h);
    R(ctx, 3, h * 0.36, w - 6, 2, c.h);
    R(ctx, w * 0.1, h * 0.5, 4, h * 0.44, c.m);
    R(ctx, w - w * 0.1 - 4, h * 0.5, 4, h * 0.44, c.m);
  },

  /* ---------------- 桌台 ---------------- */
  table: (ctx, w, h, c) => {
    R(ctx, 0, 0, w, h, c.D);
    RR(ctx, 3, 3, w - 6, h - 6, Math.min(w, h) * 0.28, c.A);
    RR(ctx, 5, 5, w - 10, h - 10, Math.min(w, h) * 0.22, c.C);
    const pr = Math.min(w, h) * 0.2;
    C2(ctx, w * 0.32, h * 0.5, pr, c.W);
    C2(ctx, w * 0.68, h * 0.5, pr, c.W);
    C2(ctx, w * 0.32, h * 0.5, pr * 0.55, c.B);
    C2(ctx, w * 0.68, h * 0.5, pr * 0.55, c.B);
  },

  desk: (ctx, w, h, c) => {
    shell(ctx, w, h, c, 3);
    R(ctx, 3, h * 0.66, w - 6, h * 0.30, c.B);
    R(ctx, w * 0.1, h * 0.76, w * 0.22, 2, c.M);
    R(ctx, w * 0.1, h * 0.88, w * 0.22, 2, c.M);
    R(ctx, w * 0.58, h * 0.08, w * 0.3, h * 0.4, c.K); // 显示器
    R(ctx, w * 0.61, h * 0.12, w * 0.24, h * 0.3, c.G);
    R(ctx, w * 0.71, h * 0.48, w * 0.04, h * 0.12, c.m);
  },

  coffee_table: (ctx, w, h, c) => {
    R(ctx, 0, 0, w, h, c.D);
    RR(ctx, 2, 2, w - 4, h - 4, 5, c.H);
    RR(ctx, 4, 4, w - 8, h - 8, 4, c.h);
    C2(ctx, w * 0.5, h * 0.5, Math.min(w, h) * 0.16, c.g); // 小花
    C2(ctx, w * 0.5, h * 0.5, Math.min(w, h) * 0.08, c.Y);
  },

  meeting_table: (ctx, w, h, c) => {
    R(ctx, 0, 0, w, h, c.D);
    RR(ctx, 8, h * 0.18, w - 16, h * 0.64, Math.min(w, h) * 0.3, c.A);
    RR(ctx, 12, h * 0.24, w - 24, h * 0.52, Math.min(w, h) * 0.24, c.C);
    // 围绕的椅子
    const n = 6;
    for (let i = 0; i < n; i++) {
      const x = 16 + (i * (w - 32)) / (n - 1);
      R(ctx, x - 5, 3, 10, h * 0.12, c.H);
      R(ctx, x - 5, h - 3 - h * 0.12, 10, h * 0.12, c.H);
    }
  },

  counter: (ctx, w, h, c) => {
    shell(ctx, w, h, c, 4);
    R(ctx, 3, 3, w - 6, h * 0.3, c.C); // 台面
    R(ctx, w * 0.16, h * 0.52, w * 0.16, 2, c.M);
    R(ctx, w * 0.42, h * 0.52, w * 0.16, 2, c.M);
    R(ctx, w * 0.68, h * 0.52, w * 0.16, 2, c.M);
  },

  reception: (ctx, w, h, c) => {
    shell(ctx, w, h, c, 4);
    R(ctx, 3, 3, w - 6, h * 0.26, c.C); // 前台台面
    R(ctx, 3, h * 0.29, w - 6, 2, c.B);
    // 电脑
    R(ctx, w * 0.68, h * 0.02, w * 0.2, h * 0.24, c.K);
    R(ctx, w * 0.70, h * 0.05, w * 0.16, h * 0.17, c.G);
    // 服务铃
    C2(ctx, w * 0.16, h * 0.14, Math.min(w, h) * 0.07, c.Y);
    C2(ctx, w * 0.16, h * 0.10, Math.min(w, h) * 0.03, c.W);
    // 绿植
    R(ctx, w * 0.06, h * 0.5, w * 0.1, h * 0.44, c.n);
    C2(ctx, w * 0.11, h * 0.52, Math.min(w, h) * 0.1, c.g);
  },

  bar_counter: (ctx, w, h, c) => {
    shell(ctx, w, h, c, 4);
    R(ctx, 4, 4, w - 8, h * 0.22, c.H); // 杯架层
    const cols = [c.G, c.Y, c.R, c.g, c.G, c.W];
    for (let i = 0; i < 6; i++) R(ctx, 8 + i * ((w - 16) / 6), 5, (w - 16) / 8, h * 0.18, cols[i]);
    R(ctx, 3, h * 0.3, w - 6, h * 0.3, c.C); // 吧台面
    R(ctx, w * 0.2, h * 0.68, w * 0.6, 2, c.M);
    C2(ctx, w * 0.5, h * 0.84, Math.min(w, h) * 0.06, c.R);
  },

  booth: (ctx, w, h, c) => {
    R(ctx, 0, 0, w, h, c.D);
    RR(ctx, 2, 2, w - 4, h * 0.28, 4, c.B); // 靠背
    RR(ctx, 2, h * 0.26, w * 0.2, h * 0.7, 4, c.B);
    RR(ctx, w - 2 - w * 0.2, h * 0.26, w * 0.2, h * 0.7, 4, c.B);
    RR(ctx, w * 0.2, h * 0.4, w * 0.6, h * 0.4, 4, c.C); // 桌面
    C2(ctx, w * 0.5, h * 0.58, Math.min(w, h) * 0.08, c.G); // 酒杯
  },

  stove: (ctx, w, h, c) => {
    shell(ctx, w, h, c, 3);
    R(ctx, 3, 3, w - 6, h * 0.16, c.m); // 灶台面
    const burn = Math.min(w, h) * 0.14;
    C2(ctx, w * 0.28, h * 0.42, burn, c.D);
    C2(ctx, w * 0.72, h * 0.42, burn, c.D);
    C2(ctx, w * 0.28, h * 0.42, burn * 0.5, c.R);
    C2(ctx, w * 0.72, h * 0.42, burn * 0.5, c.Y);
    for (let i = 0; i < 3; i++) C2(ctx, w * (0.3 + i * 0.2), h * 0.8, 3, c.M);
  },

  /* ---------------- 洗衣 / 清洁 ---------------- */
  washer: (ctx, w, h, c) => {
    shell(ctx, w, h, c, 4);
    R(ctx, 3, 3, w - 6, h * 0.16, c.m); // 控制面板
    C2(ctx, w * 0.2, h * 0.11, 3, c.g);
    C2(ctx, w * 0.32, h * 0.11, 3, c.Y);
    const dr = Math.min(w, h) * 0.3;
    C2(ctx, w * 0.5, h * 0.62, dr, c.m);
    C2(ctx, w * 0.5, h * 0.62, dr * 0.72, c.G);
    C2(ctx, w * 0.5, h * 0.62, dr * 0.4, c.W);
  },

  dryer: (ctx, w, h, c) => {
    shell(ctx, w, h, c, 4);
    R(ctx, 3, 3, w - 6, h * 0.16, c.m);
    C2(ctx, w * 0.2, h * 0.11, 3, c.g);
    const dr = Math.min(w, h) * 0.3;
    C2(ctx, w * 0.5, h * 0.62, dr, c.m);
    C2(ctx, w * 0.5, h * 0.62, dr * 0.72, c.G);
    for (let i = 0; i < 3; i++) R(ctx, w * 0.35, h * (0.52 + i * 0.08), w * 0.3, 2, c.W);
  },

  linen: (ctx, w, h, c) => {
    shell(ctx, w, h, c, 3);
    R(ctx, 3, 3, w - 6, h * 0.3, c.W);
    R(ctx, 3, h * 0.36, w - 6, h * 0.28, c.C);
    R(ctx, 3, h * 0.66, w - 6, h * 0.3, c.W);
    R(ctx, w / 2 - 1, 3, 2, h - 6, c.B);
  },

  /* ---------------- 健身 ---------------- */
  treadmill: (ctx, w, h, c) => {
    R(ctx, 0, 0, w, h, c.D);
    R(ctx, w * 0.06, h * 0.5, w * 0.88, h * 0.44, c.m); // 跑带
    R(ctx, w * 0.1, h * 0.56, w * 0.8, h * 0.32, c.K);
    for (let i = 0; i < 5; i++) R(ctx, w * 0.14 + i * w * 0.16, h * 0.6, 3, h * 0.24, c.m);
    R(ctx, w * 0.3, h * 0.08, w * 0.4, h * 0.42, c.M); // 立柱
    R(ctx, w * 0.62, h * 0.02, w * 0.34, h * 0.24, c.K); // 仪表
    R(ctx, w * 0.65, h * 0.05, w * 0.28, h * 0.16, c.G);
  },

  dumbbells: (ctx, w, h, c) => {
    R(ctx, 0, 0, w, h, c.D);
    R(ctx, 2, h * 0.7, w - 4, h * 0.24, c.M); // 架子
    for (let i = 0; i < 3; i++) {
      const x = 6 + i * ((w - 12) / 3);
      R(ctx, x, h * 0.3, (w - 12) / 3 - 6, 4, c.m); // 横杆
      C2(ctx, x + 2, h * 0.32, Math.min(w, h) * 0.12, c.K);
      C2(ctx, x + (w - 12) / 3 - 4, h * 0.32, Math.min(w, h) * 0.12, c.K);
    }
  },

  yoga: (ctx, w, h, c) => {
    RR(ctx, 3, 3, w - 6, h - 6, Math.min(w, h) * 0.4, c.D);
    RR(ctx, 5, 5, w - 10, h - 10, Math.min(w, h) * 0.35, c.A);
    RR(ctx, 5, 5, w - 10, h * 0.4, Math.min(w, h) * 0.3, c.C);
    R(ctx, w * 0.78, h * 0.2, w * 0.14, h * 0.6, c.H); // 瑜伽砖
  },

  /* ---------------- 商业 / 办公 ---------------- */
  shelf: (ctx, w, h, c) => {
    R(ctx, 0, 0, w, h, c.D);
    R(ctx, 3, 3, w - 6, h - 6, c.H);
    const levels = 3;
    for (let i = 0; i < levels; i++) {
      const y = 5 + i * ((h - 10) / levels);
      R(ctx, 5, y, w - 10, (h - 10) / levels - 4, c.m);
      const cols = [c.R, c.Y, c.G, c.g, c.A, c.C];
      for (let j = 0; j < 5; j++) R(ctx, 7 + j * ((w - 14) / 5), y + 2, (w - 14) / 6, (h - 10) / levels - 8, cols[(i + j) % cols.length]);
    }
  },

  locker: (ctx, w, h, c) => {
    shell(ctx, w, h, c, 3);
    R(ctx, w / 2 - 1, 4, 2, h - 8, c.B);
    R(ctx, w * 0.4, h * 0.44, w * 0.06, h * 0.14, c.M);
    R(ctx, w * 0.54, h * 0.44, w * 0.06, h * 0.14, c.M);
    R(ctx, 5, 6, w * 0.3, h * 0.14, c.W);
    R(ctx, w * 0.6, 6, w * 0.3, h * 0.14, c.W);
  },

  filing: (ctx, w, h, c) => {
    shell(ctx, w, h, c, 2);
    for (let i = 0; i < 4; i++) {
      R(ctx, 3, 4 + i * ((h - 8) / 4), w - 6, (h - 8) / 4 - 2, c.B);
      R(ctx, w * 0.38, 6 + i * ((h - 8) / 4), w * 0.24, 2, c.M);
    }
  },

  /* ---------------- 卫浴 ---------------- */
  toilet: (ctx, w, h, c) => {
    R(ctx, 0, 0, w, h, c.D);
    R(ctx, w * 0.22, 2, w * 0.56, h * 0.34, c.W); // 水箱
    R(ctx, w * 0.3, h * 0.08, w * 0.4, 3, c.m);
    RR(ctx, w * 0.24, h * 0.34, w * 0.52, h * 0.56, 6, c.W); // 马桶
    RR(ctx, w * 0.34, h * 0.46, w * 0.32, h * 0.34, 5, c.m);
  },

  sink: (ctx, w, h, c) => {
    shell(ctx, w, h, c, 3);
    RR(ctx, w * 0.16, h * 0.28, w * 0.68, h * 0.5, 6, c.W);
    RR(ctx, w * 0.24, h * 0.38, w * 0.52, h * 0.3, 5, c.m);
    R(ctx, w * 0.46, 4, 3, h * 0.34, c.M);
    C2(ctx, w * 0.5, h * 0.14, Math.min(w, h) * 0.06, c.M);
  },

  bathtub: (ctx, w, h, c) => {
    RR(ctx, 2, 2, w - 4, h - 4, 8, c.W);
    RR(ctx, 6, 6, w - 12, (h - 12) * 0.62, 6, c.G);
    R(ctx, 6, 6 + (h - 12) * 0.42, w - 12, 2, c.W);
    R(ctx, w * 0.86, 3, 3, h * 0.3, c.M);
    C2(ctx, w * 0.5, h * 0.85, Math.min(w, h) * 0.06, c.M);
  },

  water: (ctx, w, h, c) => {
    shell(ctx, w, h, c, 3);
    RR(ctx, w * 0.3, 2, w * 0.4, h * 0.4, 5, c.G); // 水桶
    R(ctx, w * 0.3, h * 0.22, w * 0.4, 3, c.W);
    R(ctx, w * 0.2, h * 0.5, w * 0.24, h * 0.32, c.M); // 出水口
    R(ctx, w * 0.56, h * 0.5, w * 0.24, h * 0.32, c.R);
  },

  /* ---------------- 建筑构件 ---------------- */
  stairs: (ctx, w, h, c) => {
    R(ctx, 0, 0, w, h, c.D);
    const steps = 5;
    for (let i = 0; i < steps; i++) {
      const t = i / steps;
      R(ctx, 3 + t * (w - 6) * 0.5, 4 + i * ((h - 8) / steps), w - 6 - t * (w - 6) * 0.5, (h - 8) / steps - 2, i % 2 ? c.A : c.C);
    }
    R(ctx, w * 0.06, 3, 3, h - 6, c.M); // 扶手
  },

  elevator: (ctx, w, h, c) => {
    shell(ctx, w, h, c, 3);
    R(ctx, w / 2 - 1, 4, 2, h - 8, c.B);
    R(ctx, w * 0.06, h * 0.2, w * 0.16, h * 0.5, c.m);
    C2(ctx, w * 0.14, h * 0.32, 3, c.g);
    C2(ctx, w * 0.14, h * 0.52, 3, c.R);
    R(ctx, w * 0.28, h * 0.42, w * 0.66, 2, c.C);
  },

  window: (ctx, w, h, c) => {
    R(ctx, 0, 0, w, h, c.D);
    RR(ctx, 3, 3, w - 6, h - 6, 3, '#4a6b8a');
    RR(ctx, 5, 5, w - 10, h - 10, 2, '#87b8d8');
    R(ctx, w / 2 - 1, 4, 2, h - 8, c.H);
    R(ctx, 4, h * 0.5 - 1, w - 8, 2, c.H);
    R(ctx, 0, 0, w * 0.18, h, c.R); // 窗帘
    R(ctx, w - w * 0.18, 0, w * 0.18, h, c.R);
  },

  /* ---------------- 装饰 ---------------- */
  rug: (ctx, w, h, c) => {
    RR(ctx, 0, 0, w, h, h / 2, c.D);
    RR(ctx, 2, 2, w - 4, h - 4, (h - 4) / 2, c.A);
    RR(ctx, 6, 4, w - 12, h - 8, (h - 8) / 2, c.C);
  },

  plant: (ctx, w, h, c) => {
    R(ctx, w * 0.3, h * 0.6, w * 0.4, h * 0.36, c.H); // 花盆
    R(ctx, w * 0.26, h * 0.56, w * 0.48, h * 0.1, c.h);
    C2(ctx, w * 0.5, h * 0.34, Math.min(w, h) * 0.26, c.n);
    C2(ctx, w * 0.36, h * 0.32, Math.min(w, h) * 0.18, c.g);
    C2(ctx, w * 0.64, h * 0.34, Math.min(w, h) * 0.18, c.g);
    C2(ctx, w * 0.5, h * 0.2, Math.min(w, h) * 0.16, c.g);
  },

  tree: (ctx, w, h, c) => {
    R(ctx, w * 0.42, h * 0.5, w * 0.16, h * 0.5, c.H);
    C2(ctx, w * 0.5, h * 0.4, Math.min(w, h) * 0.42, c.n);
    C2(ctx, w * 0.32, h * 0.42, Math.min(w, h) * 0.26, c.g);
    C2(ctx, w * 0.68, h * 0.42, Math.min(w, h) * 0.26, c.g);
    C2(ctx, w * 0.5, h * 0.24, Math.min(w, h) * 0.28, c.g);
  },

  flowerbed: (ctx, w, h, c) => {
    R(ctx, 0, h * 0.3, w, h * 0.7, c.H);
    R(ctx, 0, h * 0.3, w, h * 0.3, c.n);
    const cols = [c.R, c.Y, c.W, c.C];
    for (let i = 0; i < 8; i++) {
      const x = 6 + i * ((w - 12) / 8);
      R(ctx, x, h * 0.44, 2, h * 0.2, c.g);
      C2(ctx, x + 1, h * 0.4, Math.min(w, h) * 0.1, cols[i % cols.length]);
    }
  },

  neon: (ctx, w, h, c) => {
    R(ctx, 0, 0, w, h, '#20182a');
    R(ctx, w * 0.14, h * 0.2, w * 0.72, h * 0.16, c.Y);
    R(ctx, w * 0.14, h * 0.44, w * 0.5, h * 0.16, c.R);
    R(ctx, w * 0.14, h * 0.68, w * 0.6, h * 0.16, c.G);
    R(ctx, 0, 0, w, 2, '#3a3050');
    R(ctx, 0, h - 2, w, 2, '#3a3050');
  },

  monitor: (ctx, w, h, c) => {
    R(ctx, w * 0.06, h * 0.06, w * 0.88, h * 0.62, c.D);
    R(ctx, w * 0.1, h * 0.1, w * 0.8, h * 0.54, c.K);
    R(ctx, w * 0.14, h * 0.16, w * 0.72, h * 0.1, c.G);
    R(ctx, w * 0.14, h * 0.3, w * 0.5, h * 0.06, c.G);
    R(ctx, w * 0.14, h * 0.4, w * 0.62, h * 0.06, c.m);
    R(ctx, w * 0.44, h * 0.68, w * 0.12, h * 0.16, c.m);
    R(ctx, w * 0.3, h * 0.84, w * 0.4, h * 0.1, c.M);
  },

  painting: (ctx, w, h, c) => {
    R(ctx, 0, 0, w, h, c.H);
    R(ctx, 3, 3, w - 6, h - 6, c.C);
    R(ctx, 3, h * 0.55, w - 6, h * 0.45 - 3, c.g);
    C2(ctx, w * 0.7, h * 0.32, Math.min(w, h) * 0.16, c.Y);
    R(ctx, w * 0.12, h * 0.4, w * 0.4, h * 0.2, c.A);
  },

  lamp: (ctx, w, h, c) => {
    R(ctx, w * 0.44, h * 0.36, w * 0.12, h * 0.58, c.M);
    R(ctx, w * 0.3, h * 0.92, w * 0.4, h * 0.08, c.m);
    RR(ctx, w * 0.16, h * 0.04, w * 0.68, h * 0.34, 4, c.Y);
    R(ctx, w * 0.22, h * 0.3, w * 0.56, h * 0.08, '#fff2c0');
  },

  deck: (ctx, w, h, c) => {
    R(ctx, 0, 0, w, h, c.D);
    R(ctx, 2, 2, w - 4, h - 4, c.H);
    for (let i = 1; i < 6; i++) R(ctx, 3 + i * ((w - 6) / 6), 3, 2, h - 6, c.h);
    R(ctx, 0, 0, w, 4, c.M);
    for (let i = 0; i < 8; i++) R(ctx, 4 + i * ((w - 8) / 8), 0, 3, h * 0.5, c.m);
  },

  /* ---------------- 户外 / 海滩 ---------------- */
  /**
   * 沙滩遮阳伞（45° 斜视 / 斜上方俯视）：
   * 伞面是压扁一半的椭圆穹顶，伞瓣从顶点向下展开，伞沿呈下垂扇贝，伞杆垂直落地。
   */
  umbrella: (ctx, w, h, c) => {
    const cx = w / 2;
    const rx = w * 0.46; // 伞面横向半径
    const ry = rx * 0.5; // 45° 斜视：圆盘纵向压扁一半
    const apexY = h * 0.12; // 伞顶高度
    const rimY = apexY + ry; // 伞沿高度
    const baseY = h * 0.92; // 伞杆落地

    // 落地阴影
    ctx.fillStyle = 'rgba(0,0,0,0.22)';
    ctx.beginPath();
    ctx.ellipse(cx, baseY + h * 0.01, w * 0.26, h * 0.05, 0, 0, Math.PI * 2);
    ctx.fill();

    // 伞杆（先画，伞面压住上段）
    R(ctx, cx - Math.max(1.5, w * 0.022), apexY, Math.max(3, w * 0.044), baseY - apexY, c.M);
    R(ctx, cx - Math.max(1.5, w * 0.022), apexY, Math.max(3, w * 0.044), 2, c.D);

    // 伞面穹顶（上半椭圆 + 直底边闭合）
    const dome = () => {
      ctx.beginPath();
      ctx.moveTo(cx - rx, rimY);
      ctx.ellipse(cx, rimY, rx, ry, 0, Math.PI, 0, false);
      ctx.closePath();
    };
    ctx.fillStyle = c.A;
    dome();
    ctx.fill();

    // 交替伞瓣：从顶点向伞沿展开的楔形（浅/深相间）
    const panels = 6;
    for (let i = 0; i < panels; i++) {
      if (i % 2 !== 0) continue;
      const a0 = Math.PI + (i / panels) * Math.PI;
      const a1 = Math.PI + ((i + 1) / panels) * Math.PI;
      ctx.fillStyle = c.C;
      ctx.beginPath();
      ctx.moveTo(cx, apexY);
      const steps = 8;
      for (let s = 0; s <= steps; s++) {
        const a = a0 + (a1 - a0) * (s / steps);
        ctx.lineTo(cx + Math.cos(a) * rx, rimY + Math.sin(a) * ry);
      }
      ctx.closePath();
      ctx.fill();
    }

    // 伞沿扇贝：底部一排下垂的小半圆，浅/深与伞瓣呼应
    const seg = (2 * rx) / panels;
    for (let i = 0; i < panels; i++) {
      const xc = cx - rx + seg * (i + 0.5);
      ctx.fillStyle = i % 2 === 0 ? c.A : c.C;
      ctx.beginPath();
      ctx.arc(xc, rimY, seg / 2, 0, Math.PI);
      ctx.fill();
    }

    // 伞面高光
    ctx.fillStyle = 'rgba(255,255,255,0.16)';
    ctx.beginPath();
    ctx.ellipse(cx - rx * 0.3, rimY - ry * 0.55, rx * 0.32, ry * 0.42, -0.4, 0, Math.PI * 2);
    ctx.fill();

    // 轮廓描边（穹顶 + 扇贝）
    ctx.strokeStyle = c.B;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(cx, rimY, rx, ry, 0, Math.PI, 0, false);
    ctx.stroke();
    for (let i = 0; i < panels; i++) {
      const xc = cx - rx + seg * (i + 0.5);
      ctx.beginPath();
      ctx.arc(xc, rimY, seg / 2, 0, Math.PI);
      ctx.stroke();
    }

    // 伞顶小球
    C2(ctx, cx, apexY, Math.max(1.5, w * 0.035), c.D);
  },
  beach_chair: (ctx, w, h, c) => {
    R(ctx, 0, 0, w, h, c.D);
    RR(ctx, 2, 2, w - 4, h - 4, 4, c.A);
    for (let i = 1; i < 5; i++) R(ctx, 3, i * (h / 5), w - 6, 2, c.B);
    RR(ctx, w * 0.08, h * 0.14, w * 0.28, h * 0.72, 3, c.C); // 抬起的靠背
    R(ctx, 1, h * 0.12, 3, h * 0.76, c.H);
    R(ctx, w - 4, h * 0.12, 3, h * 0.76, c.H);
  },
  rock: (ctx, w, h, c) => {
    R(ctx, 0, 0, w, h, c.D);
    RR(ctx, 2, h * 0.36, w - 4, h * 0.6, 6, c.B);
    C2(ctx, w * 0.32, h * 0.44, Math.min(w, h) * 0.26, c.A);
    C2(ctx, w * 0.66, h * 0.52, Math.min(w, h) * 0.3, c.B);
    C2(ctx, w * 0.48, h * 0.3, Math.min(w, h) * 0.16, c.C);
  },

  /** 接送客人的轿车（侧视）：车顶棚 + 挡风玻璃 + 前后灯 + 双轮。 */
  car: (ctx, w, h, c) => {
    // 车底阴影
    R(ctx, w * 0.06, h * 0.8, w * 0.88, h * 0.16, 'rgba(0,0,0,0.3)');
    // 车身上段（顶棚）
    RR(ctx, w * 0.22, h * 0.14, w * 0.52, h * 0.36, h * 0.16, c.C);
    // 挡风玻璃与车窗
    R(ctx, w * 0.27, h * 0.2, w * 0.42, h * 0.22, '#bfe4f0');
    R(ctx, w * 0.47, h * 0.2, 2, h * 0.22, c.B);
    // 车身下段
    RR(ctx, w * 0.03, h * 0.44, w * 0.94, h * 0.36, h * 0.16, c.A);
    R(ctx, w * 0.03, h * 0.44, w * 0.94, 3, c.C); // 高光线
    // 车门缝与把手
    R(ctx, w * 0.5, h * 0.46, 2, h * 0.3, c.B);
    R(ctx, w * 0.56, h * 0.56, w * 0.09, 2, c.M);
    // 前灯（车头在右）与尾灯
    R(ctx, w * 0.92, h * 0.5, w * 0.06, h * 0.13, '#ffe9a8');
    R(ctx, w * 0.02, h * 0.5, w * 0.05, h * 0.13, c.R);
    // 车轮
    const wr = h * 0.2;
    const wy = h * 0.78;
    C2(ctx, w * 0.28, wy, wr, c.K);
    C2(ctx, w * 0.28, wy, wr * 0.5, c.M);
    C2(ctx, w * 0.72, wy, wr, c.K);
    C2(ctx, w * 0.72, wy, wr * 0.5, c.M);
  },

  /* ---------------- 户外 / 建筑 ---------------- */
  /**
   * 海边洋馆（望海楼旅馆主楼）：正面仰视的华丽建筑。
   * 石墙 + 深蓝石板四坡顶 + 中央楼阁与三角山墙 + 左右圆塔 + 门廊台阶。
   * 高度克制（约 96px），屋顶之上仍留出沙滩与海景，可「跨过楼看到后面的景色」。
   * 以 440×96 为设计画布，按实际 w/h 等比缩放。
   */
  mansion: (ctx, w, h) => {
    const sx = w / 440;
    const sy = h / 96;
    const X = (v: number) => v * sx;
    const Y = (v: number) => v * sy;
    /** 矩形（设计坐标） */
    const fr = (x: number, y: number, ww: number, hh: number, col: string) =>
      R(ctx, X(x), Y(y), X(ww), Y(hh), col);
    /** 圆角矩形（设计坐标） */
    const rg = (x: number, y: number, ww: number, hh: number, r: number, col: string) =>
      RR(ctx, X(x), Y(y), X(ww), Y(hh), r * sx, col);
    /** 圆 / 椭圆（设计坐标） */
    const cc = (x: number, y: number, r: number, col: string) => C2(ctx, X(x), Y(y), r * sx, col);
    /** 多边形（设计坐标） */
    const pl = (pts: number[][], col: string) => {
      ctx.fillStyle = col;
      ctx.beginPath();
      pts.forEach((p, i) => (i ? ctx.lineTo(X(p[0]), Y(p[1])) : ctx.moveTo(X(p[0]), Y(p[1]))));
      ctx.closePath();
      ctx.fill();
    };
    /** 直线（设计坐标） */
    const ln = (x1: number, y1: number, x2: number, y2: number, col: string, lw: number) => {
      ctx.strokeStyle = col;
      ctx.lineWidth = lw * sx;
      ctx.beginPath();
      ctx.moveTo(X(x1), Y(y1));
      ctx.lineTo(X(x2), Y(y2));
      ctx.stroke();
    };

    const roofD = '#2b3247';
    const roof = '#3a4663';
    const roofL = '#5a6a92';
    const stone = '#cdc2a6';
    const stoneL = '#e8dec7';
    const stoneD = '#9a8e74';
    const gold = '#e6c470';
    const goldD = '#a5833c';
    const glass = '#f4db95';
    const glassD = '#c99e50';
    const wood = '#5a3d24';
    const iron = '#3f3f4a';

    // 地面阴影
    cc(220, 93, 200, 'rgba(0,0,0,0.30)');

    // —— 主体墙身 ——
    fr(84, 44, 272, 44, stone);
    fr(84, 44, 272, 4, stoneL); // 受光檐口
    fr(84, 84, 272, 4, stoneD); // 墙基

    // —— 烟囱（先画，被屋顶压住根部） ——
    for (const cxp of [150, 290]) {
      fr(cxp - 5, 12, 10, 24, stoneD);
      fr(cxp - 8, 10, 16, 5, gold);
      fr(cxp - 8, 10, 16, 2, stoneL);
    }

    // —— 主体四坡屋顶 ——
    pl([[78, 46], [134, 18], [306, 18], [362, 46]], roof);
    fr(134, 18, 172, 4, roofL); // 屋脊受光
    pl([[78, 46], [134, 18], [140, 21], [86, 46]], roofD); // 左坡阴影
    pl([[362, 46], [306, 18], [300, 21], [354, 46]], roofD);
    // 屋脊金色花饰
    for (let x = 140; x <= 296; x += 16) pl([[x, 18], [x + 8, 18], [x + 4, 13]], gold);
    // 屋顶老虎窗
    for (const dx of [166, 274]) {
      pl([[dx - 11, 42], [dx - 11, 31], [dx, 26], [dx + 11, 31], [dx + 11, 42]], roofD);
      rg(dx - 6, 33, 12, 8, 1, glass);
      fr(dx - 6, 40, 12, 2, goldD);
    }

    // —— 中央楼阁（凸起的山墙段） ——
    fr(188, 42, 64, 46, stoneL);
    fr(188, 42, 64, 3, '#f2ebd8');
    fr(188, 84, 64, 4, '#c6b99d');
    pl([[182, 46], [220, 12], [258, 46]], roof);
    pl([[190, 45], [220, 20], [250, 45]], roofL);
    ln(182, 46, 220, 12, gold, 2);
    ln(258, 46, 220, 12, gold, 2);
    cc(220, 34, 7, gold); // 圆形玫瑰窗
    cc(220, 34, 5, glass);
    fr(219, 28, 2, 12, goldD);
    fr(214, 33, 12, 2, goldD);

    // —— 左右圆塔 ——
    for (const tx of [96, 344]) {
      pl([[tx - 30, 32], [tx, 9], [tx + 30, 32]], roofD); // 锥顶
      pl([[tx - 22, 31], [tx, 13], [tx + 22, 31]], roof);
      pl([[tx - 11, 30], [tx, 18], [tx + 11, 30]], roofL);
      ln(tx, 9, tx, 3, gold, 2); // 塔尖
      cc(tx, 3, 2.4, gold);
      fr(tx - 24, 32, 48, 52, stone); // 塔身
      fr(tx - 24, 32, 13, 52, stoneL);
      fr(tx + 13, 32, 11, 52, stoneD);
      fr(tx - 26, 32, 52, 5, gold); // 塔檐
      rg(tx - 8, 42, 16, 22, 8, glassD); // 塔窗
      rg(tx - 6, 44, 12, 20, 6, glass);
      fr(tx - 1, 44, 2, 20, '#8a6a3a');
      fr(tx - 26, 82, 52, 3, stoneD);
    }

    // —— 主体上层尖拱窗 ——
    for (const wx of [132, 168, 272, 308]) {
      rg(wx - 11, 52, 22, 18, 10, glassD);
      rg(wx - 9, 54, 18, 16, 8, glass);
      fr(wx - 3, 50, 6, 4, gold); // 拱心石
      fr(wx - 1, 54, 2, 16, '#8a6a3a');
      fr(wx - 13, 70, 26, 3, gold); // 窗台
    }

    // —— 层间金线脚 ——
    fr(88, 72, 264, 3, gold);
    fr(88, 75, 264, 1, goldD);

    // —— 主体下层窗 ——
    for (const wx of [132, 308]) {
      rg(wx - 12, 77, 24, 10, 4, glassD);
      rg(wx - 10, 78, 20, 8, 3, glass);
      fr(wx - 1, 78, 2, 8, '#8a6a3a');
      fr(wx - 13, 87, 26, 2, gold);
    }

    // —— 中央门廊：山花 + 立柱 + 拱门 + 台阶 ——
    pl([[184, 76], [220, 63], [256, 76]], stoneL);
    pl([[190, 75], [220, 67], [250, 75]], stone);
    ln(184, 76, 220, 63, gold, 2);
    ln(256, 76, 220, 63, gold, 2);
    fr(184, 76, 72, 3, gold);
    for (const cxp of [196, 244]) {
      fr(cxp - 5, 76, 10, 12, stoneL);
      fr(cxp - 6, 75, 12, 3, gold);
      fr(cxp - 6, 86, 12, 3, stoneD);
    }
    rg(206, 77, 28, 13, 11, glassD); // 拱门暖光
    rg(209, 79, 22, 12, 10, glass);
    fr(219, 79, 2, 12, wood);
    cc(220, 79, 5, gold); // 门上扇形窗
    cc(220, 79, 3, glass);
    for (const lx of [176, 264]) {
      fr(lx - 1.2, 71, 2.4, 9, iron); // 壁灯
      cc(lx, 71, 5, 'rgba(255,233,168,0.28)');
      cc(lx, 71, 3, '#ffe9a8');
    }
    for (let i = 0; i < 3; i++) {
      const sw = 100 + i * 16;
      fr(220 - sw / 2, 88 + i * 2.6, sw, 3, i % 2 ? stoneD : stone);
    }
    fr(158, 95, 124, 1.5, '#8a7f66'); // 台阶前地面
  },
};

export const FURNITURE_SPRITES = DRAW;

/* --------------------------- 贴图生成 --------------------------- */

function hexToRgb(hex: number): [number, number, number] {
  return [(hex >> 16) & 255, (hex >> 8) & 255, hex & 255];
}

function scaled(hex: number, f: number): string {
  const [r, g, b] = hexToRgb(hex);
  const m = (v: number) => Math.max(0, Math.min(255, Math.round(v * f)));
  return `rgb(${m(r)},${m(g)},${m(b)})`;
}

function palette(theme: number): Col {
  const [r, g, b] = hexToRgb(theme);
  return {
    A: `rgb(${r},${g},${b})`,
    B: scaled(theme, 0.62),
    C: scaled(theme, 1.45),
    D: '#191622',
    W: '#ece9f2',
    M: '#9298a8',
    m: '#565b69',
    G: '#8fd0e6',
    g: '#4a8a5a',
    n: '#2f5a3a',
    Y: '#f0c860',
    R: '#c25a63',
    K: '#151524',
    H: '#6b4a30',
    h: '#8a6a48',
    S: '#e0b088',
  };
}

/** 生成（并缓存）一件家具/装饰的像素贴图。 */
export function makeFurnitureTexture(
  scene: Phaser.Scene,
  key: string,
  sprite: string,
  w: number,
  h: number,
  theme: number,
): void {
  if (scene.textures.exists(key)) return;
  const draw = DRAW[sprite];
  if (!draw) return;
  const tex = scene.textures.createCanvas(key, w, h);
  if (!tex) return;
  const ctx = tex.getContext();
  ctx.clearRect(0, 0, w, h);
  ctx.imageSmoothingEnabled = false;
  draw(ctx, w, h, palette(theme));
  tex.refresh();
}
