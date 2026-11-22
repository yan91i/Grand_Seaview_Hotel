import type { Area, AreaKind, AreaTag, Furniture, Vec2 } from './types';
import { t } from '../i18n';

export const WORLD = { w: 960, h: 640 };

/* ------------------------------------------------------------------ *
 * 望海楼旅馆 · 六层楼平面
 *  1F 大堂层：前台 / 大堂 / 酒吧 / 露台花园
 *  2F 餐饮健身层：餐厅 / 厨房 / 健身房 / 洗衣房
 *  3F 商务层：会议室 / 商店 / 商务休息区
 *  4F 员工层：酒店办公室 / 厕所 / 员工宿舍 / 员工休息室
 *  5F / 6F 客房层：套房 + 普通客房（房间数远多于人数）
 *
 *  每件家具/设施/装饰都带 sprite 名（见 furnitureSprites.ts），
 *  由场景程序化绘制成像素美术素材。
 * ------------------------------------------------------------------ */

export interface FloorDef {
  level: number;
  name: string;
  /** 楼层切换按钮上的短标签（缺省为「N F」） */
  short?: string;
  /** 是否为户外层（无走廊，单独构建导航） */
  outdoor?: boolean;
  /** 该层的地板底色 */
  bg: number;
  areas: Area[];
}

function area(
  floor: number,
  kind: AreaKind,
  id: string,
  name: string,
  rect: { x: number; y: number; w: number; h: number },
  tags: AreaTag[],
  floorColor: number,
  furniture?: Furniture[],
  /** 可选：覆写区域锚点（默认取矩形中心）。户外沙滩被洋馆遮挡，锚点需落在可见沙面上。 */
  anchorOverride?: Vec2,
): Area {
  return {
    id,
    name,
    floor,
    kind,
    rect,
    anchor: anchorOverride ?? { x: rect.x + rect.w / 2, y: rect.y + rect.h / 2 },
    tags,
    floorColor,
    furniture,
  };
}

/** 一间标准客房：床铺 + 床头柜 + 地毯 + 绿植 + 窗，套房另配沙发，普通房配书桌 */
function room(floor: number, id: string, name: string, x: number, y: number, suite: boolean, w = 200, h = 130): Area {
  const bedColor = suite ? 0x7a5a8a : 0x5a6a8a;
  const rugs = suite ? 0x8a6a4a : 0x6a5a4a;
  const furn: Furniture[] = [
    { x: x + w - 80, y: y + 8, w: 64, h: 24, color: 0x3a5a7a, label: '窗', sprite: 'window' },
    { x: x + 12, y: y + 30, w: 86, h: 48, color: bedColor, label: '床', sprite: 'bed' },
    { x: x + 100, y: y + 32, w: 28, h: 26, color: 0x5a4a3a, label: '床头柜', sprite: 'nightstand' },
    { x: x + 30, y: y + 92, w: 74, h: 26, color: rugs, label: '地毯', sprite: 'rug' },
    { x: x + w - 46, y: y + 80, w: 34, h: 42, color: 0x3f7050, label: '绿植', sprite: 'plant' },
  ];
  if (suite) {
    furn.push({ x: x + w - 66, y: y + 30, w: 56, h: 44, color: 0x6a5a7a, label: '客厅沙发', sprite: 'sofa' });
  } else {
    furn.push({ x: x + w - 66, y: y + 34, w: 56, h: 34, color: 0x6a5a3a, label: '书桌', sprite: 'desk' });
    furn.push({ x: x + w - 96, y: y + 64, w: 20, h: 20, color: 0x5a4a3a, label: '椅子', sprite: 'chair' });
  }
  return area(floor, suite ? 'suite' : 'room', id, name, { x, y, w, h }, ['private', 'rest'], suite ? 0x3f3550 : 0x35354f, furn);
}

function corridor(floor: number, id: string, name = '走廊'): Area {
  return area(floor, 'corridor', id, name, { x: 40, y: 205, w: 880, h: 70 }, ['passage'], 0x2b2740, [
    { x: 300, y: 226, w: 150, h: 26, color: 0x5a4a3a, label: '地毯', sprite: 'rug' },
    { x: 560, y: 224, w: 46, h: 46, color: 0x3f7050, label: '绿植', sprite: 'plant' },
    { x: 760, y: 224, w: 30, h: 46, color: 0x6a5a4a, label: '壁灯', sprite: 'lamp' },
  ]);
}

function stair(floor: number, x: number, y: number, w = 180, h = 140): Area {
  return area(floor, 'stair', `f${floor}_stair`, `${floor}F 楼梯间`, { x, y, w, h }, ['passage'], 0x262233, [
    { x: x + 20, y: y + 22, w: w - 40, h: 32, color: 0x4a4560, label: '楼梯', sprite: 'stairs' },
    { x: x + 20, y: y + 64, w: w - 40, h: 32, color: 0x3a3550, label: '楼梯', sprite: 'stairs' },
    { x: x + w - 58, y: y + h - 58, w: 46, h: 46, color: 0x5a5a7a, label: '电梯', sprite: 'elevator' },
  ]);
}

export const FLOORS: FloorDef[] = [
  {
    level: 0,
    name: '海边户外',
    short: '户外',
    outdoor: true,
    bg: 0x0a1020,
    areas: [
      area(0, 'public', 'f0_beach', '沙滩', { x: 40, y: 286, w: 880, h: 166 }, ['fun', 'rest', 'social'], 0x4a4030, [
        { x: 120, y: 306, w: 88, h: 88, color: 0xc2603a, label: '遮阳伞', sprite: 'umbrella' },
        { x: 150, y: 402, w: 74, h: 30, color: 0xd8b06a, label: '沙滩椅', sprite: 'beach_chair' },
        { x: 760, y: 306, w: 88, h: 88, color: 0x3a7a8a, label: '遮阳伞', sprite: 'umbrella' },
        { x: 790, y: 404, w: 74, h: 30, color: 0xd8b06a, label: '沙滩椅', sprite: 'beach_chair' },
        { x: 868, y: 348, w: 58, h: 42, color: 0x6a6a72, label: '礁石', sprite: 'rock' },
        { x: 62, y: 392, w: 48, h: 36, color: 0x5a5a62, label: '礁石', sprite: 'rock' },
        { x: 430, y: 300, w: 34, h: 30, color: 0xd8b06a, label: '沙滩椅', sprite: 'beach_chair' },
      ], { x: 480, y: 336 }),
      area(0, 'public', 'f0_plaza', '门前广场', { x: 300, y: 452, w: 360, h: 84 }, ['social', 'passage'], 0x3c3c46, [
        { x: 260, y: 356, w: 440, h: 96, color: 0x8a8070, label: '望海楼', sprite: 'mansion' },
        { x: 430, y: 462, w: 100, h: 28, color: 0x8a2a3a, label: '迎宾地毯', sprite: 'rug' },
        { x: 314, y: 464, w: 22, h: 30, color: 0x6a5a4a, label: '路灯', sprite: 'lamp' },
        { x: 624, y: 464, w: 22, h: 30, color: 0x6a5a4a, label: '路灯', sprite: 'lamp' },
        { x: 330, y: 498, w: 32, h: 32, color: 0x3f7050, label: '绿植', sprite: 'plant' },
        { x: 600, y: 498, w: 32, h: 32, color: 0x3f7050, label: '绿植', sprite: 'plant' },
      ]),
      area(0, 'public', 'f0_road', '门前公路', { x: 16, y: 536, w: 928, h: 96 }, ['passage'], 0x2a2a30, []),
    ],
  },
  {
    level: 1,
    name: '大堂层',
    bg: 0x141122,
    areas: [
      area(1, 'work', 'f1_reception', '前台', { x: 60, y: 60, w: 300, h: 140 }, ['social', 'work'], 0x4a4258, [
        { x: 80, y: 84, w: 140, h: 42, color: 0x6a5a4a, label: '前台台面', sprite: 'reception' },
        { x: 232, y: 82, w: 80, h: 56, color: 0x4a5a7a, label: '电脑', sprite: 'monitor' },
        { x: 150, y: 150, w: 90, h: 34, color: 0x6a4a5a, label: '地毯', sprite: 'rug' },
        { x: 250, y: 150, w: 62, h: 40, color: 0x6a5a4a, label: '挂画', sprite: 'painting' },
        { x: 80, y: 146, w: 48, h: 48, color: 0x3f7050, label: '绿植', sprite: 'plant' },
      ]),
      area(1, 'public', 'f1_garden', '露台花园', { x: 400, y: 60, w: 520, h: 140 }, ['fun', 'social', 'rest'], 0x2c4536, [
        { x: 416, y: 70, w: 92, h: 50, color: 0x3a6a48, label: '花坛', sprite: 'flowerbed' },
        { x: 620, y: 72, w: 78, h: 46, color: 0x3a6a48, label: '花坛', sprite: 'flowerbed' },
        { x: 818, y: 68, w: 86, h: 88, color: 0x356040, label: '大树', sprite: 'tree' },
        { x: 540, y: 150, w: 100, h: 22, color: 0x6a5a4a, label: '长椅', sprite: 'bench' },
        { x: 720, y: 90, w: 50, h: 50, color: 0x3f7050, label: '藤椅', sprite: 'armchair' },
      ]),
      corridor(1, 'f1_corridor'),
      area(1, 'public', 'f1_lobby', '大堂', { x: 60, y: 310, w: 420, h: 260 }, ['social'], 0x453a56, [
        { x: 300, y: 320, w: 90, h: 30, color: 0x3a5a7a, label: '窗', sprite: 'window' },
        { x: 90, y: 340, w: 150, h: 60, color: 0x5a4a6a, label: '沙发区', sprite: 'sofa' },
        { x: 250, y: 352, w: 70, h: 40, color: 0x6a5a4a, label: '茶几', sprite: 'coffee_table' },
        { x: 360, y: 440, w: 24, h: 24, color: 0x5a4a6a, label: '单椅', sprite: 'chair' },
        { x: 200, y: 430, w: 150, h: 60, color: 0x5a3a4a, label: '地毯', sprite: 'rug' },
        { x: 120, y: 470, w: 50, h: 56, color: 0x3f7050, label: '落地绿植', sprite: 'plant' },
        { x: 90, y: 470, w: 54, h: 36, color: 0x6a5a4a, label: '挂画', sprite: 'painting' },
      ]),
      area(1, 'public', 'f1_bar', '酒吧', { x: 500, y: 310, w: 320, h: 260 }, ['social', 'fun'], 0x3a2b3f, [
        { x: 520, y: 326, w: 280, h: 50, color: 0x6a3a4a, label: '吧台', sprite: 'bar_counter' },
        { x: 716, y: 392, w: 58, h: 42, color: 0x5a2a5a, label: '霓虹', sprite: 'neon' },
        { x: 540, y: 446, w: 96, h: 58, color: 0x4a3a4a, label: '卡座', sprite: 'booth' },
        { x: 656, y: 446, w: 96, h: 58, color: 0x4a3a4a, label: '卡座', sprite: 'booth' },
        { x: 778, y: 430, w: 38, h: 50, color: 0x3f7050, label: '绿植', sprite: 'plant' },
      ]),
      stair(1, 840, 310, 100, 260),
    ],
  },
  {
    level: 2,
    name: '餐饮健身层',
    bg: 0x161021,
    areas: [
      area(2, 'public', 'f2_dining', '餐厅', { x: 60, y: 60, w: 420, h: 140 }, ['food'], 0x4a4030, [
        { x: 70, y: 156, w: 160, h: 28, color: 0x3a5a7a, label: '窗', sprite: 'window' },
        { x: 84, y: 84, w: 110, h: 46, color: 0x7a6a4a, label: '餐桌', sprite: 'table' },
        { x: 212, y: 84, w: 84, h: 46, color: 0x8a7a5a, label: '餐台', sprite: 'counter' },
        { x: 300, y: 84, w: 110, h: 46, color: 0x7a6a4a, label: '餐桌', sprite: 'table' },
        { x: 424, y: 90, w: 44, h: 44, color: 0x3f7050, label: '绿植', sprite: 'plant' },
        { x: 430, y: 156, w: 44, h: 30, color: 0x6a5a4a, label: '画', sprite: 'painting' },
      ]),
      area(2, 'work', 'f2_kitchen', '厨房', { x: 500, y: 60, w: 220, h: 140 }, ['food', 'work'], 0x453a2c, [
        { x: 512, y: 84, w: 92, h: 56, color: 0x6a6a6a, label: '灶台', sprite: 'stove' },
        { x: 618, y: 84, w: 84, h: 46, color: 0x5a5a5a, label: '备餐台', sprite: 'counter' },
        { x: 512, y: 148, w: 120, h: 44, color: 0x6a6a5a, label: '货架', sprite: 'shelf' },
        { x: 644, y: 148, w: 58, h: 44, color: 0x5a6a6a, label: '储物柜', sprite: 'locker' },
      ]),
      area(2, 'work', 'f2_laundry', '洗衣房', { x: 740, y: 60, w: 180, h: 140 }, ['work', 'rest'], 0x37414a, [
        { x: 756, y: 84, w: 66, h: 58, color: 0x6a7a8a, label: '洗衣机', sprite: 'washer' },
        { x: 834, y: 84, w: 66, h: 58, color: 0x6a7a8a, label: '烘干机', sprite: 'dryer' },
        { x: 756, y: 152, w: 140, h: 40, color: 0x6a7a8a, label: '布草架', sprite: 'shelf' },
      ]),
      corridor(2, 'f2_corridor'),
      area(2, 'public', 'f2_gym', '健身房', { x: 60, y: 310, w: 760, h: 260 }, ['fun', 'work'], 0x2f3a4a, [
        { x: 100, y: 352, w: 132, h: 66, color: 0x5a6a7a, label: '跑步机', sprite: 'treadmill' },
        { x: 250, y: 352, w: 132, h: 66, color: 0x5a6a7a, label: '跑步机', sprite: 'treadmill' },
        { x: 404, y: 352, w: 104, h: 52, color: 0x4a5a6a, label: '哑铃架', sprite: 'dumbbells' },
        { x: 560, y: 352, w: 120, h: 50, color: 0x46566a, label: '瑜伽垫', sprite: 'rug' },
        { x: 600, y: 424, w: 148, h: 62, color: 0x46566a, label: '瑜伽区', sprite: 'yoga' },
        { x: 470, y: 470, w: 92, h: 52, color: 0x4a5a6a, label: '储物柜', sprite: 'locker' },
        { x: 720, y: 344, w: 52, h: 52, color: 0x3f7050, label: '绿植', sprite: 'plant' },
      ]),
      stair(2, 840, 310, 100, 260),
    ],
  },
  {
    level: 3,
    name: '商务层',
    bg: 0x141026,
    areas: [
      area(3, 'work', 'f3_meeting', '会议室', { x: 60, y: 60, w: 520, h: 140 }, ['work', 'social'], 0x3a4258, [
        { x: 80, y: 68, w: 180, h: 26, color: 0x3a5a7a, label: '窗', sprite: 'window' },
        { x: 110, y: 98, w: 420, h: 66, color: 0x5a4a3a, label: '会议桌', sprite: 'meeting_table' },
        { x: 524, y: 70, w: 44, h: 44, color: 0x3f7050, label: '绿植', sprite: 'plant' },
      ]),
      area(3, 'public', 'f3_shop', '商店', { x: 620, y: 60, w: 300, h: 140 }, ['social', 'fun'], 0x4a3a34, [
        { x: 640, y: 84, w: 120, h: 64, color: 0x7a6a4a, label: '货架', sprite: 'shelf' },
        { x: 790, y: 84, w: 110, h: 64, color: 0x6a5a3a, label: '货架', sprite: 'shelf' },
        { x: 640, y: 158, w: 140, h: 34, color: 0x6a5a4a, label: '收银台', sprite: 'counter' },
        { x: 796, y: 158, w: 90, h: 34, color: 0x8a5a3a, label: '招牌', sprite: 'neon' },
      ]),
      corridor(3, 'f3_corridor'),
      area(3, 'public', 'f3_lounge', '商务休息区', { x: 60, y: 310, w: 660, h: 260 }, ['social', 'rest'], 0x3f3a4f, [
        { x: 100, y: 320, w: 140, h: 26, color: 0x3a5a7a, label: '窗', sprite: 'window' },
        { x: 100, y: 356, w: 160, h: 66, color: 0x5a4a6a, label: '沙发区', sprite: 'sofa' },
        { x: 280, y: 368, w: 80, h: 44, color: 0x6a5a4a, label: '茶几', sprite: 'coffee_table' },
        { x: 420, y: 424, w: 140, h: 54, color: 0x6a5a4a, label: '咖啡吧', sprite: 'counter' },
        { x: 300, y: 470, w: 50, h: 50, color: 0x5a4a6a, label: '单椅', sprite: 'armchair' },
        { x: 360, y: 512, w: 180, h: 42, color: 0x5a3a4a, label: '地毯', sprite: 'rug' },
        { x: 120, y: 470, w: 50, h: 54, color: 0x3f7050, label: '绿植', sprite: 'plant' },
        { x: 560, y: 340, w: 62, h: 40, color: 0x6a5a4a, label: '挂画', sprite: 'painting' },
      ]),
      stair(3, 740, 310, 200, 260),
    ],
  },
  {
    level: 4,
    name: '员工层',
    bg: 0x131019,
    areas: [
      area(4, 'work', 'f4_office', '酒店办公室', { x: 60, y: 60, w: 300, h: 140 }, ['work'], 0x3a3a4a, [
        { x: 84, y: 84, w: 120, h: 46, color: 0x5a5a6a, label: '办公桌', sprite: 'desk' },
        { x: 228, y: 84, w: 86, h: 64, color: 0x4a4a5a, label: '档案柜', sprite: 'filing' },
        { x: 84, y: 150, w: 120, h: 34, color: 0x4a4a5a, label: '地毯', sprite: 'rug' },
        { x: 228, y: 158, w: 60, h: 36, color: 0x5a5a6a, label: '挂画', sprite: 'painting' },
        { x: 318, y: 150, w: 38, h: 44, color: 0x3f7050, label: '绿植', sprite: 'plant' },
      ]),
      area(4, 'work', 'f4_toilet', '厕所', { x: 380, y: 60, w: 120, h: 140 }, ['private'], 0x2f3540, [
        { x: 392, y: 90, w: 40, h: 64, color: 0x5a6a7a, label: '马桶', sprite: 'toilet' },
        { x: 446, y: 90, w: 40, h: 64, color: 0x5a6a7a, label: '马桶', sprite: 'toilet' },
        { x: 392, y: 166, w: 92, h: 28, color: 0x6a7a8a, label: '洗手台', sprite: 'sink' },
      ]),
      area(4, 'dorm', 'f4_dorm', '员工宿舍', { x: 520, y: 60, w: 400, h: 140 }, ['rest', 'private'], 0x333a44, [
        { x: 536, y: 84, w: 84, h: 64, color: 0x5a6a8a, label: '上下铺', sprite: 'bunkbed' },
        { x: 632, y: 84, w: 84, h: 64, color: 0x5a6a8a, label: '上下铺', sprite: 'bunkbed' },
        { x: 728, y: 84, w: 84, h: 64, color: 0x5a6a8a, label: '上下铺', sprite: 'bunkbed' },
        { x: 824, y: 84, w: 76, h: 58, color: 0x4a5a6a, label: '储物柜', sprite: 'locker' },
        { x: 536, y: 156, w: 80, h: 40, color: 0x5a6a8a, label: '衣柜', sprite: 'wardrobe' },
        { x: 640, y: 158, w: 130, h: 36, color: 0x4a5a6a, label: '地毯', sprite: 'rug' },
      ]),
      corridor(4, 'f4_corridor'),
      area(4, 'public', 'f4_staff_lounge', '员工休息室', { x: 60, y: 310, w: 660, h: 260 }, ['social', 'rest'], 0x3a3540, [
        { x: 100, y: 320, w: 140, h: 26, color: 0x3a5a7a, label: '窗', sprite: 'window' },
        { x: 100, y: 356, w: 160, h: 66, color: 0x5a4a4a, label: '沙发', sprite: 'sofa' },
        { x: 300, y: 360, w: 110, h: 46, color: 0x6a5a4a, label: '餐桌', sprite: 'table' },
        { x: 400, y: 440, w: 140, h: 54, color: 0x6a5a4a, label: '茶水台', sprite: 'counter' },
        { x: 300, y: 470, w: 50, h: 50, color: 0x5a4a4a, label: '单椅', sprite: 'armchair' },
        { x: 560, y: 470, w: 80, h: 54, color: 0x4a5a5a, label: '储物柜', sprite: 'locker' },
        { x: 120, y: 470, w: 50, h: 54, color: 0x3f7050, label: '绿植', sprite: 'plant' },
      ]),
      stair(4, 740, 310, 200, 260),
    ],
  },
  {
    level: 5,
    name: '客房层',
    bg: 0x151021,
    areas: [
      room(5, 'f5_s1', '501 · 套房', 40, 60, true),
      room(5, 'f5_s2', '502 · 套房', 270, 60, true),
      room(5, 'f5_503', '503 · 客房', 500, 60, false),
      room(5, 'f5_504', '504 · 客房', 730, 60, false),
      corridor(5, 'f5_corridor'),
      room(5, 'f5_505', '505 · 客房', 40, 300, false),
      room(5, 'f5_506', '506 · 客房', 270, 300, false, 180),
      room(5, 'f5_507', '507 · 客房', 520, 300, false, 180),
      room(5, 'f5_508', '508 · 客房', 730, 300, false),
      stair(5, 40, 450, 180, 130),
      area(5, 'work', 'f5_linen', '布草间', { x: 300, y: 450, w: 300, h: 130 }, ['work'], 0x323842, [
        { x: 320, y: 470, w: 120, h: 64, color: 0x6a7a8a, label: '布草柜', sprite: 'linen' },
        { x: 460, y: 470, w: 120, h: 60, color: 0x6a7a8a, label: '货架', sprite: 'shelf' },
      ]),
      area(5, 'public', 'f5_ice', '茶水间', { x: 640, y: 450, w: 280, h: 130 }, ['rest'], 0x3a3a44, [
        { x: 660, y: 470, w: 90, h: 64, color: 0x5a6a6a, label: '饮水机', sprite: 'water' },
        { x: 770, y: 470, w: 120, h: 54, color: 0x5a6a6a, label: '茶水台', sprite: 'counter' },
        { x: 826, y: 514, w: 46, h: 50, color: 0x3f7050, label: '绿植', sprite: 'plant' },
      ]),
    ],
  },
  {
    level: 6,
    name: '客房层',
    bg: 0x121026,
    areas: [
      room(6, 'f6_s1', '601 · 套房', 40, 60, true),
      room(6, 'f6_s2', '602 · 套房', 270, 60, true),
      room(6, 'f6_603', '603 · 客房', 500, 60, false),
      room(6, 'f6_604', '604 · 客房', 730, 60, false),
      corridor(6, 'f6_corridor'),
      room(6, 'f6_605', '605 · 客房', 40, 300, false),
      room(6, 'f6_606', '606 · 客房', 270, 300, false, 180),
      room(6, 'f6_607', '607 · 客房', 520, 300, false, 180),
      room(6, 'f6_608', '608 · 客房', 730, 300, false),
      stair(6, 40, 450, 180, 130),
      area(6, 'public', 'f6_sky', '天台观景台', { x: 300, y: 450, w: 620, h: 130 }, ['fun', 'social', 'rest'], 0x2c3a4a, [
        { x: 360, y: 470, w: 120, h: 26, color: 0x4a6a6a, label: '长椅', sprite: 'bench' },
        { x: 520, y: 470, w: 50, h: 50, color: 0x3a5a6a, label: '观景椅', sprite: 'armchair' },
        { x: 620, y: 468, w: 30, h: 50, color: 0x3a5a6a, label: '景观灯', sprite: 'lamp' },
        { x: 700, y: 468, w: 50, h: 54, color: 0x3f7050, label: '绿植', sprite: 'plant' },
        { x: 820, y: 462, w: 84, h: 86, color: 0x356040, label: '观景树', sprite: 'tree' },
        { x: 320, y: 538, w: 560, h: 30, color: 0x356060, label: '观景台', sprite: 'deck' },
      ]),
    ],
  },
];

export const AREAS: Area[] = FLOORS.flatMap((f) => f.areas);
export const AREA_BY_ID: Record<string, Area> = Object.fromEntries(AREAS.map((a) => [a.id, a]));
export const FLOOR_BY_LEVEL: Record<number, FloorDef> = Object.fromEntries(FLOORS.map((f) => [f.level, f]));
export const FLOOR_LEVELS = FLOORS.map((f) => f.level);

export interface NavNode extends Vec2 {
  floor: number;
}

/**
 * 导航图：一条走廊串起本层所有房间。
 *  - 每层走廊中心线是一串「中线节点」，横向相连；
 *  - 每个贴着走廊的区域，在朝向走廊的一侧开一个「门洞节点」，门洞与中线节点竖向相连；
 *  - 角色在房间之间移动时必须先走门洞 → 走廊中线 → 目标门洞，杜绝穿墙。
 *  - 不直接贴走廊的区域（如 5/6 楼的服务带）通过「竖向通道」接回走廊。
 *  - 有窗户的区域额外挂一个「窗边」节点，用于「看窗外景色」行为。
 */
export const NAV_NODES: Record<string, NavNode> = {};
export const NAV_EDGES: [string, string][] = [];

/** 区域 id → 该区域「窗边」导航节点 id（仅当该区域有窗时存在） */
export const WINDOW_NODE: Record<string, string> = {};

/** 任意导航节点 id → 其所属区域 id（用于角色抵达后判定所在区域） */
export const NODE_AREA: Record<string, string> = {};

/** 楼层 → 竖向通道（把不贴走廊的区域接回走廊；x 取楼层空隙，避免穿过房间） */
const PASSAGES: Record<number, { x: number; y0: number; y1: number }[]> = {
  5: [{ x: 260, y0: 240, y1: 450 }],
  6: [{ x: 260, y0: 240, y1: 450 }],
};

function clampX(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

for (const f of FLOORS) {
  const cor = f.areas.find((a) => a.kind === 'corridor');
  const passages = PASSAGES[f.level] ?? [];

  if (!cor) {
    // 无走廊的楼层（如户外层）：区域按声明顺序串成一条路径
    for (const a of f.areas) {
      NAV_NODES[a.id] = { x: a.anchor.x, y: a.anchor.y, floor: f.level };
      NODE_AREA[a.id] = a.id;
    }
    for (let i = 1; i < f.areas.length; i++) NAV_EDGES.push([f.areas[i - 1].id, f.areas[i].id]);
    // 户外层由「门前广场」接入 1F 大堂，成为酒店的户外出口
    if (f.outdoor && f.areas.length) {
      const entrance = f.areas.find((a) => a.id === 'f0_plaza') ?? f.areas[f.areas.length - 1];
      NAV_EDGES.push([entrance.id, 'f1_lobby']);
    }
    continue;
  }

  const corTop = cor.rect.y;
  const corBottom = cor.rect.y + cor.rect.h;
  const cy = cor.rect.y + cor.rect.h / 2;
  const cx0 = cor.rect.x + 18;
  const cx1 = cor.rect.x + cor.rect.w - 18;

  NAV_NODES[cor.id] = { x: cor.anchor.x, y: cy, floor: f.level };
  NODE_AREA[cor.id] = cor.id;

  const spineId = (x: number) => `f${f.level}_spine_${Math.round(x)}`;
  const spineXs: number[] = [];
  const doors: { id: string; x: number }[] = [];
  const orphan: Area[] = [];

  // 1. 逐个区域：建立区域节点、门洞节点，并收集「接入点 x」
  for (const a of f.areas) {
    if (a.id === cor.id) continue;
    NAV_NODES[a.id] = { x: a.anchor.x, y: a.anchor.y, floor: f.level };
    NODE_AREA[a.id] = a.id;

    // 窗边节点
    const win = (a.furniture ?? []).find((fu) => fu.label === '窗' || fu.sprite === 'window');
    if (win) {
      const wid = `${a.id}__win`;
      NAV_NODES[wid] = { x: win.x + win.w / 2, y: win.y + win.h + 12, floor: f.level };
      NODE_AREA[wid] = a.id;
      NAV_EDGES.push([a.id, wid]);
      WINDOW_NODE[a.id] = wid;
    }

    const aTop = a.rect.y;
    const aBottom = a.rect.y + a.rect.h;
    let side: 'top' | 'bottom' | null = null;
    if (aBottom <= corTop + 2 && corTop - aBottom <= 90) side = 'top';
    else if (aTop >= corBottom - 2 && aTop - corBottom <= 90) side = 'bottom';
    if (!side) {
      orphan.push(a);
      continue;
    }

    const dx = clampX(a.anchor.x, cx0, cx1);
    const dy = side === 'top' ? Math.min(aBottom, corTop) : Math.max(aTop, corBottom);
    const doorId = `${a.id}__door`;
    NAV_NODES[doorId] = { x: dx, y: dy, floor: f.level };
    NODE_AREA[doorId] = a.id;
    NAV_EDGES.push([a.id, doorId]);
    spineXs.push(dx);
    doors.push({ id: doorId, x: dx });
  }

  // 2. 竖向通道 + 走廊中心：把接入点补进中线
  spineXs.push(cor.anchor.x);
  for (const p of passages) spineXs.push(p.x);

  // 3. 走廊中线：按 x 排序串成链
  const xs = [...new Set(spineXs.map((x) => Math.round(x)))].sort((a, b) => a - b);
  for (const x of xs) NAV_NODES[spineId(x)] = { x, y: cy, floor: f.level };
  for (let i = 1; i < xs.length; i++) NAV_EDGES.push([spineId(xs[i - 1]), spineId(xs[i])]);

  // 4. 门洞 → 最近的走廊中线节点
  for (const d of doors) NAV_EDGES.push([d.id, spineId(Math.round(d.x))]);

  // 5. 走廊区域节点接入最近的中线节点
  if (xs.length) {
    let nearest = xs[0];
    for (const x of xs) if (Math.abs(x - cor.anchor.x) < Math.abs(nearest - cor.anchor.x)) nearest = x;
    NAV_EDGES.push([cor.id, spineId(nearest)]);
  }

  // 6. 竖向通道接回走廊，并挂上不贴走廊的区域（就近连接 + 沿 x 串成链，避免横穿房间）
  for (const p of passages) {
    const topId = `f${f.level}_pass_${Math.round(p.x)}_a`;
    const botId = `f${f.level}_pass_${Math.round(p.x)}_b`;
    NAV_NODES[topId] = { x: p.x, y: p.y0, floor: f.level };
    NAV_NODES[botId] = { x: p.x, y: p.y1, floor: f.level };
    NAV_EDGES.push([topId, botId]);
    NAV_EDGES.push([topId, spineId(Math.round(p.x))]);
    NAV_EDGES.push([cor.id, spineId(Math.round(p.x))]);
    const sorted = [...orphan].sort((a, b) => a.anchor.x - b.anchor.x);
    if (sorted.length) {
      let nearest = sorted[0];
      for (const a of sorted) if (Math.abs(a.anchor.x - p.x) < Math.abs(nearest.anchor.x - p.x)) nearest = a;
      NAV_EDGES.push([botId, nearest.id]);
      for (let i = 1; i < sorted.length; i++) NAV_EDGES.push([sorted[i - 1].id, sorted[i].id]);
    }
  }

  // 兜底：若某层有区域不贴走廊却没有定义通道，退回直连（避免孤立）
  if (orphan.length && !passages.length) {
    for (const a of orphan) NAV_EDGES.push([a.id, cor.id]);
  }

  if (f.level > 1) NAV_EDGES.push([`f${f.level}_stair`, `f${f.level - 1}_stair`]);
}

/** 区域 id 与导航节点同名，便于统一寻路 */
export function nodeOf(areaId: string): string {
  return areaId;
}

/** 某区域是否有窗（可取窗边节点） */
export function windowNodeOf(areaId: string): string | null {
  return WINDOW_NODE[areaId] ?? null;
}

/** 任意导航节点所属的区域 id */
export function areaOfNode(nodeId: string): string {
  return NODE_AREA[nodeId] ?? nodeId;
}

export function areaAt(floor: number, x: number, y: number): Area {
  const f = FLOOR_BY_LEVEL[floor];
  if (f) {
    for (const a of f.areas) {
      const r = a.rect;
      if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) return a;
    }
    return f.areas.find((a) => a.kind === 'corridor') ?? f.areas[0];
  }
  return AREAS[0];
}

/** 某区域所在的楼层 */
export function floorOf(areaId: string): number {
  return AREA_BY_ID[areaId]?.floor ?? 1;
}

/** 楼层显示名：户外层显示「户外」/「Outdoor」，其余显示「N F」 */
export function floorName(level: number): string {
  return level === 0 ? t('floor.0.short') : `${level}F`;
}
