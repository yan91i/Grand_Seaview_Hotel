import type { Area, BigFive, CharacterDef, Gender, HairStyle, SpritePalette } from './types';

/**
 * 望海楼旅馆的临时成员名册生成器。
 * - 走班员工（kind='staff'）：每天来上班、下班或值夜班后离开，不算在 12 位长住客里。
 * - 短租客人（kind='guest'）：偶尔入住，住几天后退房离开。
 */

let seq = 0;
function uid(prefix: string): string {
  seq++;
  return `${prefix}${Date.now().toString(36).slice(-4)}${seq.toString(36)}`;
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}
function rnd(lo: number, hi: number): number {
  return lo + Math.random() * (hi - lo);
}
function clamp01(v: number): number {
  return Math.max(0.1, Math.min(0.95, v));
}

const SURNAMES = ['王', '李', '张', '刘', '陈', '杨', '黄', '吴', '周', '徐', '孙', '马', '朱', '胡', '郭', '何', '高', '林', '罗', '郑', '梁', '谢', '宋', '唐', '许', '邓', '冯', '韩', '曹', '曾'];
const GIVEN_M = ['伟', '强', '磊', '军', '洋', '勇', '杰', '涛', '明', '超', '鹏', '宇', '浩', '晨', '斌', '辉', '骏', '哲', '成', '航'];
const GIVEN_F = ['芳', '娟', '敏', '静', '丽', '燕', '娜', '婷', '雪', '颖', '琳', '倩', '莉', '霞', '萍', '媛', '悦', '萌', '晗', '萱'];

const SKINS = [0xe8b98a, 0xf0c9a4, 0xf2c9a0, 0xe6b48c, 0xdca878, 0xc99a6a];
const HAIRS = [0x1a1a1a, 0x2a2a3a, 0x3a2a2a, 0x5a4a3a, 0x8a6a3a, 0x556b6b, 0x8a8a8a, 0x2a3a5a];
const TOPS = [0x4a6a8a, 0x7a5a8a, 0x5a7a6a, 0x8a5a4a, 0x3a6aa0, 0x6a7a8a, 0x8a7a5a, 0x4a7a5a, 0x9a6a4a, 0x5a5a9a];
const BOTTOMS = [0x2a2a2a, 0x33334a, 0x3a3a3a, 0x2f3340, 0x33333f, 0x2a2a3a];
const HAIRSTYLES: HairStyle[] = ['short', 'short', 'long', 'bun', 'bald'];

/** 随机一套外貌（含发型），供临时成员生成与「随机外貌」按钮共用 */
export function randomPalette(): SpritePalette {
  return { skin: pick(SKINS), hair: pick(HAIRS), top: pick(TOPS), bottom: pick(BOTTOMS), hairstyle: pick(HAIRSTYLES) };
}

function nameFor(gender: Gender): string {
  const given = gender === 'female' ? pick(GIVEN_F) : pick(GIVEN_M);
  return `${pick(SURNAMES)}${given}`;
}

/** 随机人格，围绕中心值抖动 */
function personality(center: Partial<BigFive> = {}): BigFive {
  const c = (k: keyof BigFive, d: number) => clamp01((center[k] ?? d) + rnd(-0.12, 0.12));
  return {
    openness: c('openness', 0.55),
    conscientiousness: c('conscientiousness', 0.6),
    extraversion: c('extraversion', 0.5),
    agreeableness: c('agreeableness', 0.62),
    neuroticism: c('neuroticism', 0.45),
  };
}

/* --------------------------- 酒店固定员工 --------------------------- */

/**
 * 酒店固定的 7 名员工：经理 1 名（由长住客何静担任）、保安 2 名、保洁 1 名、服务员 3 名。
 * 这里定义的是 6 名「走班」员工——身份固定，按班次到岗、到点离场：
 *  - 白班（08:00 到岗）：保洁 1 + 服务员 3
 *  - 夜班（20:00 接班）：保安 2
 */
export const STAFF_ROSTER: CharacterDef[] = [
  {
    id: 'sec_lei',
    name: '雷斌',
    gender: 'male',
    age: 33,
    role: '保安',
    room: '员工宿舍',
    homeArea: 'f4_dorm',
    bio: '在望海楼值夜班两年，话不多但眼睛尖。上岗前把大堂、走廊、前后门都走一遍才安心。对住客客气，对可疑的人和事一步不让。',
    voice: '简短、命令式，习惯报时间报位置，回答前先顿一下。',
    traits: ['警觉', '寡言', '守规矩', '可靠'],
    personality: { openness: 0.36, conscientiousness: 0.82, extraversion: 0.32, agreeableness: 0.58, neuroticism: 0.3 },
    warmth: 2,
    kind: 'staff',
    isStaff: true,
    staffRole: 'security',
    shift: 'night',
    workArea: 'f1_lobby',
    palette: { skin: 0xdca878, hair: 0x1a1a1a, top: 0x2f3a52, bottom: 0x1f2430 },
  },
  {
    id: 'sec_qi',
    name: '齐海生',
    gender: 'male',
    age: 44,
    role: '保安',
    room: '员工宿舍',
    homeArea: 'f4_dorm',
    bio: '当过大半辈子水手，后来上岸做了保安。夜里巡楼时嘴里常念叨着海上的旧事，脚步却一点不含糊。信“规矩”，也信“先看人后说话”。',
    voice: '低沉平稳，爱用航海比喻，习惯先问一句“什么事”。',
    traits: ['沉稳', '念旧', '有经验', '认死理'],
    personality: { openness: 0.42, conscientiousness: 0.78, extraversion: 0.36, agreeableness: 0.64, neuroticism: 0.34 },
    warmth: 4,
    kind: 'staff',
    isStaff: true,
    staffRole: 'security',
    shift: 'night',
    workArea: 'f1_lobby',
    palette: { skin: 0xc99a6a, hair: 0x2a2a2a, top: 0x2f3a52, bottom: 0x22262f },
  },
  {
    id: 'cln_wen',
    name: '温香',
    gender: 'female',
    age: 47,
    role: '保洁',
    room: '员工宿舍',
    homeArea: 'f4_dorm',
    bio: '管着全楼的布草与清扫，干活麻利，谁家房间的角落有灰她一眼就能看出来。爱笑爱聊家常，收工前总要把工具归置得整整齐齐。',
    voice: '嗓门亮、语速快，边干活边搭话，爱用“你不晓得”开头。',
    traits: ['勤快', '爽朗', '爱聊', '有条理'],
    personality: { openness: 0.5, conscientiousness: 0.8, extraversion: 0.62, agreeableness: 0.74, neuroticism: 0.4 },
    warmth: 7,
    kind: 'staff',
    isStaff: true,
    staffRole: 'cleaner',
    shift: 'day',
    workArea: 'f2_laundry',
    palette: { skin: 0xf0c9a4, hair: 0x3a2a2a, top: 0x4a7a6a, bottom: 0x33384a, hairstyle: 'bun' },
  },
  {
    id: 'svc_yu',
    name: '于晓',
    gender: 'female',
    age: 24,
    role: '前台服务员',
    room: '员工宿舍',
    homeArea: 'f4_dorm',
    bio: '刚来望海楼半年，还在前台学做事。待人客气、记名字很快，遇到难缠的客人也会紧张，但从不失礼。下班后喜欢在露台花园待着。',
    voice: '礼貌、标准，语速平稳，凡事都先确认一遍，尾音轻轻上扬。',
    traits: ['礼貌', '细致', '认真', '略显青涩'],
    personality: { openness: 0.58, conscientiousness: 0.76, extraversion: 0.56, agreeableness: 0.78, neuroticism: 0.5 },
    warmth: 8,
    kind: 'staff',
    isStaff: true,
    staffRole: 'service',
    shift: 'day',
    workArea: 'f1_reception',
    palette: { skin: 0xf2c9a0, hair: 0x2a2a3a, top: 0x7a5a8a, bottom: 0x2a2a3a, hairstyle: 'long' },
  },
  {
    id: 'svc_luo',
    name: '罗成',
    gender: 'male',
    age: 29,
    role: '餐厅服务员',
    room: '员工宿舍',
    homeArea: 'f4_dorm',
    bio: '在餐厅和厨房之间跑得最勤的一个，端菜稳、记单准，跟厨师长赵磊混得最熟。爱跟客人开两句玩笑，力气大，搬箱搬货从不含糊。',
    voice: '爽朗、带点海港口音，爱用“来嘞”“稍等啊”招呼人。',
    traits: ['爽快', '勤快', '爱闹', '讲义气'],
    personality: { openness: 0.5, conscientiousness: 0.68, extraversion: 0.8, agreeableness: 0.72, neuroticism: 0.34 },
    warmth: 9,
    kind: 'staff',
    isStaff: true,
    staffRole: 'service',
    shift: 'day',
    workArea: 'f2_dining',
    palette: { skin: 0xe6b48c, hair: 0x1f1f2a, top: 0x3a6aa0, bottom: 0x33333f },
  },
  {
    id: 'svc_pan',
    name: '潘悦',
    gender: 'female',
    age: 26,
    role: '酒吧服务员',
    room: '员工宿舍',
    homeArea: 'f4_dorm',
    bio: '酒吧的活计做得最熟，会看眼色、会来事，谁喝多了谁有心事她一眼就懂。爱跟驻唱的苏晴斗嘴，其实关系最好。',
    voice: '油嘴滑舌、爱开玩笑，话里总带三分调侃，看人下菜碟。',
    traits: ['机灵', '健谈', '会来事', '嘴甜'],
    personality: { openness: 0.66, conscientiousness: 0.6, extraversion: 0.84, agreeableness: 0.6, neuroticism: 0.42 },
    warmth: 6,
    kind: 'staff',
    isStaff: true,
    staffRole: 'service',
    shift: 'day',
    workArea: 'f1_bar',
    palette: { skin: 0xefc6a0, hair: 0x8a3a4a, top: 0xc44a6a, bottom: 0x2a2a3a, hairstyle: 'long' },
  },
];

const GUEST_ROLES = [
  { role: '来海边休假的摄影师', bio: '趁着假期来住几天，想拍点海和日出，白天大多在外面跑。', voice: '随性、爱描述看到的画面。', traits: ['好奇', '随性', '健谈'], center: { openness: 0.8, extraversion: 0.6 } },
  { role: '出差顺路住几晚的销售', bio: '在附近谈生意，晚上回酒店，电话不断，来去匆匆。', voice: '语速快、爱用商业词，礼貌但略显疲惫。', traits: ['忙碌', '圆滑', '疲惫'], center: { extraversion: 0.68, conscientiousness: 0.7 } },
  { role: '一个人出来散心的旅人', bio: '受了点挫折，独自出来走走，话不多，爱在露台坐到很晚。', voice: '轻声、欲言又止，常常答非所问。', traits: ['沉默', '敏感', '低落'], center: { neuroticism: 0.68, extraversion: 0.3 } },
  { role: '带孩子短住的一家之主', bio: '带孩子来海边玩几天，操心又热闹，总怕孩子给别人添麻烦。', voice: '絮絮叨叨，总把话题绕回孩子身上。', traits: ['热心', '操心', '实在'], center: { agreeableness: 0.78, extraversion: 0.6 } },
  { role: '环岛骑行的背包客', bio: '骑车路过，歇脚两天，晒得黝黑，逢人就聊路线。', voice: '爽朗、爱用夸张的路况描述，口音重。', traits: ['开朗', '健谈', '爱冒险'], center: { extraversion: 0.8, openness: 0.78 } },
  { role: '写稿赶工的自由撰稿人', bio: '为了截稿躲出来住几天，白天锁在房间里敲字。', voice: '有点神经质，被打断会先叹气再说话。', traits: ['焦虑', '专注', '独来独往'], center: { conscientiousness: 0.7, neuroticism: 0.66 } },
  { role: '退休后结伴旅行的老人', bio: '和老伴出来玩，作息规律，爱打听哪里有好吃的好玩的。', voice: '慢条斯理，爱用“我们那时候”。', traits: ['和气', '怀旧', '爱聊'], center: { agreeableness: 0.8, extraversion: 0.5 } },
];

/** 生成一位短租客人，入住到指定房间 */
export function makeGuest(area: Area): CharacterDef {
  const g = pick(GUEST_ROLES);
  const gender: Gender = Math.random() < 0.5 ? 'female' : 'male';
  const age = Math.round(rnd(20, 68));
  const name = nameFor(gender);
  return {
    id: uid('g'),
    name,
    gender,
    age,
    role: g.role,
    room: area.name.split(' · ')[0] ?? area.name,
    homeArea: area.id,
    bio: `${g.bio}是望海楼的短租客人，住几天就会离开。`,
    voice: g.voice,
    traits: g.traits,
    personality: personality(g.center),
    warmth: Math.round(rnd(-4, 10)),
    palette: randomPalette(),
    kind: 'guest',
  };
}

/* --------------------------- coach 定制客人 --------------------------- */

/** coach 定制客人的输入字段（由玩家在面板里填写） */
export interface CoachInput {
  name: string;
  gender: Gender;
  age: number;
  role: string;
  bio: string;
  voice: string;
  traits: string[];
  personality: BigFive;
  warmth: number;
  palette: SpritePalette;
}

/** 随机一个供 coach 面板预填的客人草稿（名字、人设、外貌均随机） */
export function coachDraft(): CoachInput {
  const g = pick(GUEST_ROLES);
  const gender: Gender = Math.random() < 0.5 ? 'female' : 'male';
  return {
    name: nameFor(gender),
    gender,
    age: Math.round(rnd(20, 68)),
    role: g.role,
    bio: g.bio,
    voice: g.voice,
    traits: [...g.traits],
    personality: personality(g.center),
    warmth: Math.round(rnd(-4, 10)),
    palette: randomPalette(),
  };
}

/** 由 coach 面板的填写内容生成一位待接客人（房间在到店时按空房分配）。 */
export function makeCoachGuest(input: CoachInput): CharacterDef {
  const traits = input.traits.map((t) => t.trim()).filter(Boolean);
  return {
    id: uid('g'),
    name: input.name.trim() || '无名客人',
    gender: input.gender,
    age: Math.max(1, Math.min(120, Math.round(input.age))),
    role: input.role.trim() || '来海边小住的客人',
    room: '',
    homeArea: '',
    bio: input.bio.trim() || '一位由导演定制、专门入住望海楼的客人。',
    voice: input.voice.trim() || '随性自然。',
    traits: traits.length ? traits : ['随性'],
    personality: input.personality,
    warmth: input.warmth,
    palette: input.palette,
    kind: 'guest',
  };
}

