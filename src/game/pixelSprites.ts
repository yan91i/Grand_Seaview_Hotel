import Phaser from 'phaser';
import type { HairStyle, SpritePalette } from './types';

/**
 * 程序化生成像素角色贴图：12x16 的像素点阵放大 4 倍 = 48x64。
 * 分两层：基础身体（肤色/上衣/下装/眼睛）+ 发型覆盖层（H 表示该格为头发）。
 * 用色板区分每个住客，无需外部美术资源。
 */
const BODY = [
  '............',
  '...SSSSSS...',
  '..SSSSSSSS..',
  '..SSSSSSSS..',
  '..SSESSESS..',
  '..SSSSSSSS..',
  '...SSSSSS...',
  '..TTTTTTTT..',
  '.TTTTTTTTTT.',
  '.TTTTTTTTTT.',
  '.STTTTTTTTS.',
  '..TTTTTTTT..',
  '..BBBBBBBB..',
  '..BBBB.BBBB.',
  '..BBBB.BBBB.',
  '..OOO...OOO.',
];

/** 发型覆盖层：仅 'H' 有效，其余格留空（露出下层身体）。 */
const HAIR: Record<HairStyle, string[]> = {
  short: [
    '............',
    '...HHHHHH...',
    '..HHHHHHHH..',
    '..H......H..',
    '..H......H..',
    '..H......H..',
    '............',
    '............',
    '............',
    '............',
    '............',
    '............',
    '............',
    '............',
    '............',
    '............',
  ],
  long: [
    '............',
    '...HHHHHH...',
    '..HHHHHHHH..',
    '..H......H..',
    '..H......H..',
    '..H......H..',
    '..H......H..',
    '..H......H..',
    '..H......H..',
    '..H......H..',
    '............',
    '............',
    '............',
    '............',
    '............',
    '............',
  ],
  bun: [
    '....HHHH....',
    '...HHHHHH...',
    '..HHHHHHHH..',
    '..H......H..',
    '..H......H..',
    '..H......H..',
    '............',
    '............',
    '............',
    '............',
    '............',
    '............',
    '............',
    '............',
    '............',
    '............',
  ],
  bald: [
    '............',
    '............',
    '............',
    '............',
    '............',
    '............',
    '............',
    '............',
    '............',
    '............',
    '............',
    '............',
    '............',
    '............',
    '............',
    '............',
  ],
};

export const SPRITE_SCALE = 4;
export const SPRITE_W = 12 * SPRITE_SCALE;
export const SPRITE_H = 16 * SPRITE_SCALE;

const EYE = 0x14141c;

function css(hex: number): string {
  return `#${hex.toString(16).padStart(6, '0')}`;
}

/** 把色板渲染到 2D 上下文（纹理与头像共用）。 */
function paintSprite(ctx: CanvasRenderingContext2D, p: SpritePalette): void {
  const hair = HAIR[p.hairstyle ?? 'short'] ?? HAIR.short;
  const colorFor: Record<string, number> = { S: p.skin, E: EYE, T: p.top, B: p.bottom, O: EYE };
  for (let y = 0; y < BODY.length; y++) {
    const hairRow = hair[y] ?? '';
    for (let x = 0; x < BODY[y].length; x++) {
      let color: number;
      if (hairRow[x] === 'H') color = p.hair;
      else {
        const ch = BODY[y][x];
        if (ch === '.' || !(ch in colorFor)) continue;
        color = colorFor[ch];
      }
      ctx.fillStyle = css(color);
      ctx.fillRect(x * SPRITE_SCALE, y * SPRITE_SCALE, SPRITE_SCALE, SPRITE_SCALE);
    }
  }
}

export function makeCharacterTexture(scene: Phaser.Scene, key: string, p: SpritePalette): void {
  if (scene.textures.exists(key)) return;
  const tex = scene.textures.createCanvas(key, SPRITE_W, SPRITE_H);
  if (!tex) return;
  const ctx = tex.getContext();
  ctx.clearRect(0, 0, SPRITE_W, SPRITE_H);
  paintSprite(ctx, p);
  tex.refresh();
}

/** 生成像素头像的 dataURL，供 HUD 使用（不依赖 Phaser 场景）。 */
export function makeCharacterDataURL(p: SpritePalette): string {
  const w = SPRITE_W;
  const h = SPRITE_H;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';
  paintSprite(ctx, p);
  return canvas.toDataURL();
}
