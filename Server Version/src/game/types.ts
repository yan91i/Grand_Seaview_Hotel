export type Gender = 'male' | 'female' | 'nonbinary';

/** 角色类别：长住客（其中可能包含酒店员工）/ 走班员工 / 短租客人 */
export type AgentKind = 'resident' | 'staff' | 'guest';

/** 酒店固定员工的岗位：经理 / 保安 / 保洁 / 服务员 */
export type StaffRole = 'manager' | 'security' | 'cleaner' | 'service';

/** 楼层的区域类型，用于绘制与导航图的自动构建 */
export type AreaKind = 'corridor' | 'stair' | 'room' | 'suite' | 'dorm' | 'public' | 'work';

/** 大五人格，均为 0..1 */
export interface BigFive {
  /** 开放性：想象、好奇、尝新 */
  openness: number;
  /** 尽责性：自律、条理、守约 */
  conscientiousness: number;
  /** 外向性：健谈、热情、寻求刺激 */
  extraversion: number;
  /** 宜人性：体贴、合作、信任他人 */
  agreeableness: number;
  /** 神经质：情绪波动、敏感、易焦虑 */
  neuroticism: number;
}

/** 需求满意度 0..100（越高越满足），会随时间衰减 */
export interface Needs {
  /** 生理：吃饭 */
  hunger: number;
  /** 精力：睡眠 */
  energy: number;
  /** 社交：与人相处 */
  social: number;
  /** 兴致：娱乐/新鲜感 */
  fun: number;
}

export interface Relationship {
  /** 好感 -100..100 */
  affinity: number;
  /** 关系标签 */
  type: 'stranger' | 'acquaintance' | 'friend' | 'close' | 'rival' | 'romance';
  /** 互动次数 */
  interactions: number;
  /** 最近一句印象 */
  note: string;
}

export interface MemoryEntry {
  /** 模拟时间（分钟，从第 0 分钟起） */
  t: number;
  /** 事件摘要（第三人称，用于喂给模型） */
  text: string;
  /** 涉及的角色 id */
  with?: string;
  /** 好感变化 */
  delta?: number;
}

/** 发型样式（捏脸用） */
export type HairStyle = 'short' | 'long' | 'bun' | 'bald';

export interface SpritePalette {
  skin: number;
  hair: number;
  top: number;
  bottom: number;
  /** 发型，缺省为短发型 */
  hairstyle?: HairStyle;
}

export interface CharacterDef {
  id: string;
  name: string;
  gender: Gender;
  age: number;
  /** 职业 / 身份 */
  role: string;
  /** 房间号 */
  room: string;
  /** 家的区域 id */
  homeArea: string;
  /** 个人简介（喂给模型的人设） */
  bio: string;
  /** 说话风格提示 */
  voice: string;
  /** 关键词标签，方便模型快速抓人 */
  traits: string[];
  personality: BigFive;
  /** 初始好感倾向：对陌生人的默认态度加成 */
  warmth: number;
  palette: SpritePalette;
  /** 角色类别（默认长住客） */
  kind?: AgentKind;
  /** 是否为酒店员工（长住员工会在工作时间去上班） */
  isStaff?: boolean;
  /** 工作区域 id（员工使用） */
  workArea?: string;
  /** 酒店固定员工的岗位（经理 / 保安 / 保洁 / 服务员） */
  staffRole?: StaffRole;
  /** 固定员工的走班班次（白班 / 夜班） */
  shift?: 'day' | 'night';
}

export type AgentState =
  | 'idle'
  | 'walking'
  | 'talking'
  | 'eating'
  | 'sleeping'
  | 'relaxing'
  | 'working'
  | 'gazing';

export interface Vec2 {
  x: number;
  y: number;
}

/** 寻路路径点：带楼层，便于跨层行走时切换所在楼层 */
export interface Waypoint {
  x: number;
  y: number;
  floor: number;
}

export interface Agent {
  def: CharacterDef;
  pos: Vec2;
  /** 当前所在区域 id */
  area: string;
  /** 当前所在楼层 */
  floor: number;
  /** 角色类别 */
  kind: AgentKind;
  /** 状态结束的模拟时间 */
  stateUntil: number;
  /** 离场时间（走班员工下班 / 短租客人退房），到期自动离场 */
  leaveAt?: number;
  state: AgentState;
  /** 目标区域（移动中） */
  targetArea?: string;
  /** 剩余路点 */
  path: Waypoint[];
  /** 当前所处导航节点 */
  navNode: string;
  /** 下一次决策的模拟时间 */
  nextDecisionAt: number;
  /** 是否有决策请求在飞行中 */
  pending: boolean;
  /** 当前意图（导演视角可见的“内心独白”） */
  intention: string;
  needs: Needs;
  relationships: Record<string, Relationship>;
  memory: MemoryEntry[];
  /** 头顶对话气泡 */
  bubble?: string;
  bubbleUntil: number;
  /** 正在进行的对话伙伴 id */
  talkingWith?: string;
  /** 实时想法（第一人称内心独白），可在面板里被玩家改写以影响行为 */
  thought: string;
  /** 想法是否由系统自动生成；false 表示玩家手动植入 */
  thoughtAuto: boolean;
  /** 上次刷新想法的模拟时间 */
  thoughtAt: number;
  /** 正在走向窗边、准备「通过窗户看外面的景色」 */
  gazing?: boolean;
  /** 正在开车（接送客人）：画面上以车辆代替角色本体 */
  driving?: boolean;
  /** 暂时离场（开车驶出场景期间不渲染） */
  offScene?: boolean;
}

export type AreaTag = 'social' | 'food' | 'rest' | 'fun' | 'private' | 'passage' | 'work';

export interface Area {
  id: string;
  name: string;
  /** 所属楼层（1..6） */
  floor: number;
  /** 区域类型，用于导航图构建与绘制 */
  kind: AreaKind;
  /** 绘制矩形（像素） */
  rect: { x: number; y: number; w: number; h: number };
  /** 导航锚点（角色走到的中心点） */
  anchor: Vec2;
  tags: AreaTag[];
  /** 环境底色 */
  floorColor: number;
  /** 装饰性家具 */
  furniture?: Furniture[];
}

export interface Furniture {
  x: number;
  y: number;
  w: number;
  h: number;
  color: number;
  /** 是否为可交互点 */
  label?: string;
  /** 使用的像素美术素材名（见 furnitureSprites.ts），缺省则回退为纯色块 */
  sprite?: string;
}

export interface LogEntry {
  t: number;
  kind: 'system' | 'move' | 'action' | 'talk' | 'mood' | 'rel' | 'mind' | 'event' | 'director' | 'staff';
  text: string;
  agents?: string[];
  affinity?: number;
  /** 次要条目（想法、日常移动等），不进主时间线，但会进「全部日志」 */
  minor?: boolean;
}

export interface DirectorEvent {
  id: string;
  name: string;
  desc: string;
  icon: string;
  /** 事件编辑器做关键词识别时使用的词表 */
  keywords?: string[];
  /** 是否属于「世界事件」：平时会随机发生，并可被编辑器描述触发 */
  world?: boolean;
}

/** 智能体的一次决策 */
export interface Decision {
  action: 'go' | 'use' | 'talk' | 'idle';
  area?: string;
  target?: string;
  thought: string;
  say?: string;
  mood: string;
}

export interface ConvoLine {
  speaker: string;
  text: string;
}

export interface ConversationResult {
  topic: string;
  lines: ConvoLine[];
  affinityDelta: number;
  note: string;
}

/** 一段已结束的对话存档，用于「对话」面板回放 */
export interface ConversationRecord {
  id: number;
  t: number;
  a: string;
  b: string;
  area: string;
  topic: string;
  lines: ConvoLine[];
  delta: number;
  note: string;
}
