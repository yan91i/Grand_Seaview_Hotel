import { AREAS, AREA_BY_ID, NAV_EDGES, NAV_NODES, areaAt, areaOfNode, floorOf, windowNodeOf } from './hotel';
import { CHARACTERS } from './characters';
import { makeGuest, STAFF_ROSTER } from './roster';
import type {
  Agent,
  Area,
  CharacterDef,
  ConversationRecord,
  ConversationResult,
  Decision,
  DirectorEvent,
  LogEntry,
  Relationship,
  StaffRole,
} from './types';
import { decideLocal, localConversation, thinkLocal, topicLabel } from './localBrain';
import { conversationSystem, conversationUser, decisionSystem, decisionUser } from './prompts';
import { checkHealth, llmJSON, type LlmMode, type LlmOverride } from './llm';
import { forcedLocal, getKeys, resolveKey, subscribeKeys } from './keys';
import { IS_PAGES } from '../buildMode';

/** 1x 速度下：1 现实秒 = 4 模拟分钟 */
export const SIM_MIN_PER_SEC = 4;
/** 行走速度：每模拟分钟移动的像素 */
const MOVE_PX_PER_SIM_MIN = 7;
/** 一轮对话每句台词占用的模拟分钟 */
const LINE_SIM_MIN = 7;
const DECIDE_MIN = 12;
const DECIDE_MAX = 34;

export interface ActiveConversation {
  id: number;
  a: string;
  b: string;
  lines: { speaker: string; text: string }[];
  index: number;
  nextAt: number;
  pending: boolean;
  result?: ConversationResult;
}

export const DIRECTOR_EVENTS: DirectorEvent[] = [
  { id: 'party', name: '大堂派对', desc: '有人提议在大堂聚一聚，把大家都叫下楼。', icon: '🎉' },
  { id: 'rain', name: '暴雨夜', desc: '海上起了暴雨，所有人被困在楼里。', icon: '🌧' },
  { id: 'blackout', name: '突然停电', desc: '整栋楼陷入黑暗，只有蜡烛和大堂的壁炉。', icon: '🕯' },
  { id: 'music', name: '深夜琴声', desc: '深夜里，酒吧传来一段没听过的旋律。', icon: '🎵' },
  { id: 'letter', name: '匿名信', desc: '有人收到一封没有署名的信。', icon: '✉' },
  { id: 'sunset', name: '绝美落日', desc: '今晚的海面被染成金色，值得抬头看一眼。', icon: '🌅' },
  // —— 世界事件：平时随机发生，也能被编辑器描述触发 ——
  {
    id: 'kraken',
    name: '海怪',
    desc: '近海浮起巨大的黑影，触手拍裂了浪花——一个不该存在的东西。',
    icon: '🐙',
    world: true,
    keywords: ['海怪', '海妖', '海兽', '巨兽', '触手', '深海', '怪物', '黑影', 'kraken'],
  },
  {
    id: 'ufo',
    name: '不明飞行物',
    desc: '夜空里出现一队不动的光点，慢慢横过海面。',
    icon: '🛸',
    world: true,
    keywords: ['ufo', '飞碟', '外星', '飞船', '不明飞行物', '幽浮', '光点', '碟形'],
  },
  {
    id: 'war',
    name: '战争',
    desc: '海平线那头传来闷响，夜里能看见远处的火光。',
    icon: '💥',
    world: true,
    keywords: ['战争', '打仗', '炮火', '空袭', '军队', '轰炸', '开战', '硝烟', '战事', '战火'],
  },
  {
    id: 'quake',
    name: '地震',
    desc: '一阵摇晃，吊灯晃了起来，杯子掉在地上。',
    icon: '🌐',
    world: true,
    keywords: ['地震', '晃动', '摇晃', '震感', '地动', '坍塌'],
  },
  {
    id: 'aurora',
    name: '极光',
    desc: '天边泛起流动的绿色光芒，盖住了整片夜空。',
    icon: '🌌',
    world: true,
    keywords: ['极光', '北极光', '绿光', '光带', '光华'],
  },
  {
    id: 'meteor',
    name: '流星雨',
    desc: '一颗接一颗的流星划过海面，像有人在天上撒火星。',
    icon: '☄',
    world: true,
    keywords: ['流星', '流星雨', '陨石', '陨星', '彗星', '扫帚星'],
  },
];

/** 事件编辑器：从一段自由描述里识别出要触发的事件。命中关键词或事件名即可。 */
export function matchEvent(text: string): DirectorEvent | null {
  const t = text.trim().toLowerCase();
  if (!t) return null;
  for (const e of DIRECTOR_EVENTS) {
    if (e.keywords?.some((k) => t.includes(k.toLowerCase()))) return e;
  }
  return DIRECTOR_EVENTS.find((e) => t.includes(e.name.toLowerCase())) ?? null;
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}
function rnd(lo: number, hi: number): number {
  return lo + Math.random() * (hi - lo);
}
function choice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

type Listener = (payload: unknown) => void;

const REL_LABEL: Record<Relationship['type'], string> = {
  stranger: '陌生',
  acquaintance: '认识',
  friend: '朋友',
  close: '挚友',
  rival: '敌对',
  romance: '暧昧',
};

const STATE_VERB: Record<string, string> = {
  eating: '开始吃饭',
  sleeping: '躺下休息',
  relaxing: '放松下来',
  working: '忙了起来',
  gazing: '望向窗外',
};

export class Simulation {
  agents: Agent[] = [];
  time = 8 * 60;
  day = 1;
  speed = 1;
  paused = false;
  /** 观察者当前查看的楼层 */
  viewFloor = 1;
  logs: LogEntry[] = [];
  conversations: ActiveConversation[] = [];
  /** 已结束的对话存档，供「对话」面板回放 */
  transcripts: ConversationRecord[] = [];
  llmMode: LlmMode = IS_PAGES ? 'offline' : 'checking';
  llmModel: string | null = null;
  selectedId: string | null = null;

  private adj: Record<string, string[]> = {};
  private listeners = new Map<string, Set<Listener>>();
  private pairCooldown = new Map<string, number>();
  private confSeq = 0;
  private nextConvoCheck = 0;
  private warnAt = new Map<string, number>();
  /** .env 是否配置了服务端 Key */
  private envLlm = false;
  /** 班次与客人刷新记录（按天） */
  private morningDay = 0;
  private nightDay = 0;
  private guestDay = 0;
  /** 下一次随机世界事件的时间 */
  private nextWorldEventAt = 6 * 60;
  /** coach 定制客人：等待被接来的名单 */
  private coachQueue: CharacterDef[] = [];
  /** 正在进行的接客行程（服务员开车离场 → 稍后带回客人） */
  coachTrip: { driverId: string; guests: CharacterDef[]; phase: 'out' | 'away' | 'back'; returnAt: number } | null = null;

  constructor() {
    for (const [a, b] of NAV_EDGES) {
      (this.adj[a] ??= []).push(b);
      (this.adj[b] ??= []).push(a);
    }
    for (const def of CHARACTERS) this.addAgent(def);

    if (!IS_PAGES) {
      checkHealth().then((h) => {
        this.envLlm = h.llm;
        this.llmModel = h.model;
        this.refreshLlmStatus();
      });
      // 用户批量接入/分配 Key 时，实时刷新在线状态
      subscribeKeys(() => this.refreshLlmStatus());
    }
    this.log({
      t: this.time,
      kind: 'system',
      text: `望海楼旅馆 · ${CHARACTERS.length} 位长住客各自回到了房间，一天的叙事开始了。`,
    });
  }

  /* ------------------------- 成员增删 ------------------------- */
  private newRel(a: Agent, b: Agent): Relationship {
    return {
      affinity: clamp(a.def.warmth * 0.4 + b.def.warmth * 0.3 + rnd(-5, 8), -30, 40),
      type: 'stranger',
      interactions: 0,
      note: '还没正式说过话',
    };
  }

  private linkRelationships(ag: Agent): void {
    for (const o of this.agents) {
      if (o.def.id === ag.def.id) continue;
      if (!ag.relationships[o.def.id]) ag.relationships[o.def.id] = this.newRel(ag, o);
      if (!o.relationships[ag.def.id]) o.relationships[ag.def.id] = this.newRel(o, ag);
    }
  }

  /** 依据人设创建一名角色（含初始位置、需求与关系） */
  private makeAgent(def: CharacterDef): Agent {
    const area = AREA_BY_ID[def.homeArea] ?? AREAS[0];
    return {
      def,
      pos: { x: area.anchor.x, y: area.anchor.y },
      area: def.homeArea,
      floor: floorOf(def.homeArea),
      kind: def.kind ?? 'resident',
      state: 'idle',
      stateUntil: 0,
      path: [],
      navNode: def.homeArea,
      nextDecisionAt: this.time + rnd(4, 24),
      pending: false,
      intention: choice(['刚回房间', '还没想好今天做什么', '坐在窗边']),
      needs: {
        hunger: rnd(50, 82),
        energy: rnd(52, 90),
        social: rnd(38, 78),
        fun: rnd(42, 82),
      },
      relationships: {},
      memory: [],
      bubbleUntil: 0,
      thought: '',
      thoughtAuto: true,
      thoughtAt: -999,
    };
  }

  addAgent(def: CharacterDef): Agent {
    const ag = this.makeAgent(def);
    this.agents.push(ag);
    this.linkRelationships(ag);
    ag.thought = thinkLocal(ag, this.agents);
    this.emit('agent-added', ag.def.id);
    return ag;
  }

  private removeAgent(id: string): void {
    const idx = this.agents.findIndex((a) => a.def.id === id);
    if (idx < 0) return;
    this.agents.splice(idx, 1);
    for (const o of this.agents) delete o.relationships[id];
    if (this.selectedId === id) this.select(null);
    this.emit('agent-removed', id);
  }

  /* ------------------------- 事件订阅 ------------------------- */
  on(evt: string, cb: Listener): void {
    (this.listeners.get(evt) ?? this.listeners.set(evt, new Set()).get(evt)!).add(cb);
  }
  off(evt: string, cb: Listener): void {
    this.listeners.get(evt)?.delete(cb);
  }
  private emit(evt: string, payload?: unknown): void {
    this.listeners.get(evt)?.forEach((cb) => cb(payload));
  }

  getAgent(id: string): Agent | undefined {
    return this.agents.find((a) => a.def.id === id);
  }

  select(id: string | null): void {
    this.selectedId = id;
    this.emit('select', id);
  }

  setViewFloor(floor: number): void {
    this.viewFloor = floor;
    this.emit('floor', floor);
  }

  /** 实时修改住客人设：直接改写 def（长住客与 CHARACTERS 同一对象），后续提示词立即采用。 */
  updateDef(agentId: string, patch: Partial<CharacterDef>): void {
    const a = this.getAgent(agentId);
    if (!a) return;
    if (patch.personality) patch = { ...patch, personality: { ...a.def.personality, ...patch.personality } };
    Object.assign(a.def, patch);
    this.emit('def-changed', agentId);
    this.emit('agent-update', agentId);
  }

  /* ------------------------- AI 引擎状态 ------------------------- */
  /** 返回该住客要使用的接口配置：ApiKey=用指定 Key；undefined=用服务端 .env；null=走本地引擎。 */
  private overrideFor(a: Agent): LlmOverride | null | undefined {
    if (IS_PAGES || forcedLocal(a.def.id)) return null;
    const k = resolveKey(a.def.id);
    if (k) return k;
    if (this.envLlm) return undefined;
    return null;
  }

  /** 对话由两人共同完成，优先取任意一方分配的 Key，其次 .env。 */
  private convoOverride(a: Agent, b: Agent): LlmOverride | null | undefined {
    if (IS_PAGES || (forcedLocal(a.def.id) && forcedLocal(b.def.id))) return null;
    const ka = forcedLocal(a.def.id) ? null : resolveKey(a.def.id);
    const kb = forcedLocal(b.def.id) ? null : resolveKey(b.def.id);
    if (ka) return ka;
    if (kb) return kb;
    if (this.envLlm) return undefined;
    return null;
  }

  /** 重新计算在线状态并广播；供 Key 变更时调用。 */
  refreshLlmStatus(): void {
    const total = this.agents.length;
    const online = this.agents.filter((a) => this.overrideFor(a) !== null).length;
    this.llmMode = online > 0 ? 'online' : 'offline';
    this.emit('llm-status', { mode: this.llmMode, model: this.llmModel, online, total, userKeys: IS_PAGES ? 0 : getKeys().length });
  }

  /* ------------------------- 实时想法 ------------------------- */
  /** 周期性刷新角色的自动想法；玩家手动植入的想法不会被覆盖。 */
  private tickThoughts(): void {
    for (const a of this.agents) {
      if (!a.thoughtAuto) continue;
      const interval = 20 + a.def.personality.conscientiousness * 24;
      if (this.time - a.thoughtAt < interval) continue;
      a.thoughtAt = this.time;
      const t = thinkLocal(a, this.agents);
      if (t === a.thought) continue;
      a.thought = t;
      this.emit('agent-update', a.def.id);
      this.log({ t: this.time, kind: 'mind', agents: [a.def.id], text: `${a.def.name}心想：${t}`, minor: true });
    }
  }

  /** 状态变化时立刻重算想法。 */
  private nudgeThought(a: Agent): void {
    if (a.thoughtAuto) a.thoughtAt = -9999;
  }

  /** 玩家植入一个想法：立即影响该住客接下来的行为；传空字符串则恢复自动。 */
  setThought(agentId: string, text: string): void {
    const a = this.getAgent(agentId);
    if (!a) return;
    const t = text.trim();
    if (!t) {
      a.thoughtAuto = true;
      a.thoughtAt = -9999;
      a.thought = thinkLocal(a, this.agents);
      this.log({ t: this.time, kind: 'mind', agents: [a.def.id], text: `${a.def.name} 恢复了自主的想法。` });
    } else {
      a.thoughtAuto = false;
      a.thought = t;
      a.thoughtAt = this.time;
      // 正在做的松散发呆/放松让位给新念头，立刻重新决策
      if (a.state === 'idle' || a.state === 'relaxing' || a.state === 'working') {
        a.state = 'idle';
        a.nextDecisionAt = this.time;
      }
      this.log({ t: this.time, kind: 'mind', agents: [a.def.id], text: `【植入念头】${a.def.name}：${t}` });
    }
    this.emit('agent-update', a.def.id);
  }

  /** 恢复自动想法。 */
  clearThought(agentId: string): void {
    this.setThought(agentId, '');
  }

  timeStr(): string {
    const mins = Math.floor(this.time) % 1440;
    const hh = String(Math.floor(mins / 60)).padStart(2, '0');
    const mm = String(mins % 60).padStart(2, '0');
    return `第${this.day}天 ${hh}:${mm}`;
  }

  setSpeed(s: number): void {
    this.speed = s;
  }
  togglePause(): boolean {
    this.paused = !this.paused;
    return this.paused;
  }

  /* ------------------------- 主循环 ------------------------- */
  update(dtSec: number): void {
    if (this.paused) return;
    const dt = dtSec * SIM_MIN_PER_SEC * this.speed;
    const prevDay = this.day;
    this.time += dt;
    this.day = Math.floor(this.time / 1440) + 1;
    if (this.day !== prevDay) {
      this.log({ t: this.time, kind: 'system', text: `—— 第 ${this.day} 天 ——` });
    }

    for (const a of this.agents) this.tickNeeds(a, dt);
    for (const a of this.agents) this.tickMovement(a, dt);
    this.tickPopulation();
    this.tickWorldEvents();
    this.tickThoughts();
    for (const a of this.agents) this.maybeDecide(a);
    this.tickConversations();
    this.tryConversations();
    for (const a of this.agents) if (a.bubble && this.time > a.bubbleUntil) a.bubble = undefined;
    this.tickCoach();
    this.tickDepartures();

    this.emit('tick', { time: this.time, day: this.day, clock: this.timeStr() });
  }

  /* ------------------------- 需求 ------------------------- */
  private tickNeeds(a: Agent, dt: number): void {
    const n = a.needs;
    n.hunger = clamp(n.hunger - 0.09 * dt, 0, 100);
    n.energy = clamp(n.energy - 0.06 * dt, 0, 100);
    n.social = clamp(n.social - 0.07 * dt, 0, 100);
    n.fun = clamp(n.fun - 0.08 * dt, 0, 100);

    switch (a.state) {
      case 'sleeping':
        n.energy = clamp(n.energy + 0.5 * dt, 0, 100);
        if (n.energy >= 96) this.finishActivity(a);
        break;
      case 'eating':
        n.hunger = clamp(n.hunger + 0.65 * dt, 0, 100);
        if (n.hunger >= 92) this.finishActivity(a);
        break;
      case 'relaxing':
        n.fun = clamp(n.fun + 0.5 * dt, 0, 100);
        if (a.area === 'f1_bar' || a.area === 'f1_lobby') n.social = clamp(n.social + 0.25 * dt, 0, 100);
        if (n.fun >= 88) this.finishActivity(a);
        break;
      case 'gazing':
        // 通过窗户看外面的景色：慢慢恢复兴致与社交（海景让人放松）
        n.fun = clamp(n.fun + 0.7 * dt, 0, 100);
        n.social = clamp(n.social + 0.12 * dt, 0, 100);
        if (this.time > a.stateUntil) this.finishActivity(a);
        break;
      case 'working':
        n.fun = clamp(n.fun - 0.02 * dt, 0, 100);
        if (this.time > a.stateUntil) this.finishActivity(a);
        break;
      default:
        break;
    }

    // 极端匮乏时的叙事提示（每个角色独立冷却，避免刷屏）
    if (this.time - (this.warnAt.get(a.def.id) ?? -9999) > 300) {
      const worst = Math.min(n.hunger, n.energy, n.social, n.fun);
      if (worst < 12) {
        const label = worst === n.hunger ? '胃里空得发慌' : worst === n.energy ? '已经很久没合眼了' : worst === n.social ? '很久没和人说过话' : '闷得快发霉了';
        this.warnAt.set(a.def.id, this.time);
        this.log({ t: this.time, kind: 'mood', agents: [a.def.id], text: `${a.def.name}${choice(['看起来不太对劲', '状态很差', '一个人待了很久'])}——${label}。` });
      }
    }
  }

  /* ------------------------- 移动（支持跨楼层） ------------------------- */
  private tickMovement(a: Agent, dt: number): void {
    if (a.state !== 'walking' || a.path.length === 0) {
      a.area = areaAt(a.floor, a.pos.x, a.pos.y).id;
      return;
    }
    let budget = MOVE_PX_PER_SIM_MIN * dt;
    a.floor = a.path[0].floor;
    while (budget > 0 && a.path.length > 0) {
      const wp = a.path[0];
      const dx = wp.x - a.pos.x;
      const dy = wp.y - a.pos.y;
      const d = Math.hypot(dx, dy);
      if (d <= budget) {
        a.pos.x = wp.x;
        a.pos.y = wp.y;
        budget -= d;
        a.path.shift();
        if (a.path.length) a.floor = a.path[0].floor;
      } else {
        a.pos.x += (dx / d) * budget;
        a.pos.y += (dy / d) * budget;
        budget = 0;
      }
    }
    if (a.path.length === 0) {
      if (a.targetArea) {
        a.area = a.targetArea;
        a.navNode = a.targetArea;
        a.floor = floorOf(a.targetArea);
      } else {
        a.area = areaAt(a.floor, a.pos.x, a.pos.y).id;
      }
      a.targetArea = undefined;
      if (a.gazing) {
        // 走到了窗边，开始「通过窗户看外面的景色」
        a.gazing = false;
        a.state = 'gazing';
        a.stateUntil = this.time + rnd(40, 90);
        this.emit('agent-update', a.def.id);
      } else {
        a.state = 'idle';
        a.stateUntil = this.time + 8;
      }
      this.nudgeThought(a);
      this.emit('agent-update', a.def.id);
    } else {
      a.area = areaAt(a.floor, a.pos.x, a.pos.y).id;
    }
  }

  private finishActivity(a: Agent): void {
    a.state = 'idle';
    a.navNode = a.area;
    a.stateUntil = this.time + 10;
    a.nextDecisionAt = this.time + rnd(6, 18);
    this.nudgeThought(a);
  }

  /* ------------------------- 决策 ------------------------- */
  private maybeDecide(a: Agent): void {
    if (a.driving || a.offScene) return; // 正在接送客人，行程由 tickCoach 接管
    if (a.pending || a.state !== 'idle' || a.talkingWith) return;
    if (this.time < a.nextDecisionAt) return;

    const ov = this.overrideFor(a);
    if (ov !== null) {
      a.pending = true;
      const snapshot = this.timeStr();
      llmJSON<Decision>(decisionSystem(), decisionUser(a, this.agents, snapshot), 320, ov)
        .then((d) => {
          a.pending = false;
          if (a.state !== 'idle' || a.talkingWith) return;
          if (d && this.validDecision(d)) this.applyDecision(a, d);
          else this.applyDecision(a, decideLocal(a, this.agents, this.time));
        })
        .catch(() => {
          a.pending = false;
          if (a.state === 'idle' && !a.talkingWith) this.applyDecision(a, decideLocal(a, this.agents, this.time));
        });
    } else {
      this.applyDecision(a, decideLocal(a, this.agents, this.time));
    }
  }

  private validDecision(d: Decision): boolean {
    if (!d || typeof d.action !== 'string') return false;
    if (!['go', 'use', 'talk', 'idle'].includes(d.action)) return false;
    if (d.action === 'go' && (!d.area || !AREA_BY_ID[d.area])) return false;
    if (d.action === 'talk' && (!d.target || !this.getAgent(d.target))) return false;
    return true;
  }

  private applyDecision(a: Agent, d: Decision): void {
    a.intention = (d.thought || '').slice(0, 60) || a.intention;
    // 大模型给出的想法直接作为实时想法（除非玩家已植入）
    if (a.thoughtAuto && d.thought && d.thought.trim()) a.thought = d.thought.trim().slice(0, 80);
    a.nextDecisionAt = this.time + rnd(DECIDE_MIN, DECIDE_MAX);

    if (d.say && AREA_BY_ID[a.area]?.tags.some((t) => t === 'social' || t === 'fun')) {
      a.bubble = d.say.slice(0, 60);
      a.bubbleUntil = this.time + LINE_SIM_MIN;
    }

    switch (d.action) {
      case 'go':
        if (d.area && d.area !== a.navNode) this.startMove(a, d.area);
        break;
      case 'talk': {
        const t = this.getAgent(d.target!);
        if (t && t.area !== a.area) this.startMove(a, t.area);
        break;
      }
      case 'use':
        this.beginActivity(a);
        break;
      default:
        break;
    }

    // 行为日志（次要，只进「全部日志」）
    const place = AREA_BY_ID[d.area ?? a.area]?.name ?? '';
    const who = d.target ? this.getAgent(d.target)?.def.name ?? d.target : '';
    const desc =
      d.action === 'go'
        ? `走向${place}`
        : d.action === 'talk'
          ? `去找${who}`
          : d.action === 'use'
            ? `在${AREA_BY_ID[a.area]?.name ?? ''}${STATE_VERB[a.state] ?? '待着'}`
            : `在${AREA_BY_ID[a.area]?.name ?? ''}发呆`;
    this.log({ t: this.time, kind: d.action === 'use' ? 'action' : 'move', agents: [a.def.id], text: `${a.def.name}${desc}。`, minor: true });

    this.emit('agent-update', a.def.id);
  }

  private beginActivity(a: Agent): void {
    const area = AREA_BY_ID[a.area];
    if (!area) return;
    // 「通过窗户看外面的景色」：所在区域有窗、且此刻心思/需求指向窗外时，先走到窗边
    if (windowNodeOf(a.area) && this.wantsWindowLook(a)) {
      this.glanceOutWindow(a);
      return;
    }
    if (a.def.isStaff && a.def.workArea && a.area === a.def.workArea) {
      a.state = 'working';
      a.stateUntil = this.time + rnd(90, 180);
    } else if (area.tags.includes('food')) {
      a.state = 'eating';
      a.stateUntil = this.time + 150;
    } else if (a.area === a.def.homeArea) {
      if (a.needs.energy < 62) {
        a.state = 'sleeping';
        a.stateUntil = this.time + 300;
      } else {
        a.state = 'working';
        a.stateUntil = this.time + rnd(60, 120);
      }
    } else if (area.tags.includes('fun') || area.tags.includes('rest')) {
      a.state = 'relaxing';
      a.stateUntil = this.time + rnd(60, 120);
    } else {
      a.state = 'relaxing';
      a.stateUntil = this.time + 60;
    }
    this.emit('agent-update', a.def.id);
  }

  /** 该角色此刻是否想去窗边「通过窗户看外面的景色」。 */
  private wantsWindowLook(a: Agent): boolean {
    if (!windowNodeOf(a.area)) return false;
    // 在岗员工专心工作，不看窗外
    if (a.def.isStaff && a.def.workArea && a.area === a.def.workArea) return false;
    // 心思/念头指向窗外、海景时一定去看
    if (/窗|窗外|窗边|外面的景色|看海|海景|大海|海面|天空|风景|夕阳|落日|日落/.test(a.thought)) return true;
    // 待在房间/套房里、兴致偏低时，有一定概率走到窗边发呆
    const kind = AREA_BY_ID[a.area]?.kind;
    if ((kind === 'room' || kind === 'suite') && a.needs.fun < 45 && Math.random() < 0.45) return true;
    return false;
  }

  /** 走/站到窗边，开始「通过窗户看外面的景色」。 */
  private glanceOutWindow(a: Agent): void {
    const win = windowNodeOf(a.area);
    if (win && a.navNode !== win) {
      a.gazing = true;
      this.startMove(a, win);
      if (a.state === 'walking') return; // 走到窗边后再切换为 gazing
      a.gazing = false;
    }
    // 已在窗边（或无法寻路）：就地看窗外
    a.state = 'gazing';
    a.stateUntil = this.time + rnd(40, 90);
    this.emit('agent-update', a.def.id);
  }

  private startMove(a: Agent, target: string): void {
    const from = a.navNode && NAV_NODES[a.navNode] ? a.navNode : a.area;
    const nodes = this.findPath(from, target);
    if (!nodes || nodes.length < 2) {
      a.state = 'idle';
      const dest = areaOfNode(target);
      a.navNode = dest;
      a.area = dest;
      a.floor = floorOf(dest);
      return;
    }
    a.path = nodes.slice(1).map((n) => ({ ...NAV_NODES[n] }));
    a.targetArea = areaOfNode(target);
    a.state = 'walking';
    this.emit('agent-update', a.def.id);
  }

  private findPath(from: string, to: string): string[] | null {
    if (from === to) return [from];
    if (!NAV_NODES[from] || !NAV_NODES[to]) return null;
    const prev: Record<string, string | null> = { [from]: null };
    const queue: string[] = [from];
    while (queue.length) {
      const cur = queue.shift()!;
      for (const nb of this.adj[cur] ?? []) {
        if (nb in prev) continue;
        prev[nb] = cur;
        if (nb === to) {
          const path: string[] = [to];
          let c: string | null = cur;
          while (c && c !== from) {
            path.unshift(c);
            c = prev[c];
          }
          path.unshift(from);
          return path;
        }
        queue.push(nb);
      }
    }
    return null;
  }

  /* ------------------------- 班次与客人 ------------------------- */
  /** 每天按时间表刷新走班员工与短租客人。 */
  private tickPopulation(): void {
    const mins = this.time % 1440;

    // 白班：08:00 固定员工到岗（保洁 + 服务员）
    if (this.morningDay !== this.day && mins >= 8 * 60) {
      this.morningDay = this.day;
      this.spawnRoster('day');
    }
    // 夜班：20:00 保安接班
    if (this.nightDay !== this.day && mins >= 20 * 60) {
      this.nightDay = this.day;
      this.spawnRoster('night');
    }
    // 短租客人：每天下午前后陆续入住
    if (this.guestDay !== this.day && mins >= 14 * 60) {
      this.guestDay = this.day;
      const n = Math.random() < 0.65 ? 1 + (Math.random() < 0.4 ? 1 : 0) : 0;
      for (let i = 0; i < n; i++) this.spawnGuest();
    }
  }

  /** 平时随机发生的世界事件：平均每 5~11 模拟小时一次。 */
  private tickWorldEvents(): void {
    if (this.time < this.nextWorldEventAt) return;
    this.nextWorldEventAt = this.time + rnd(5 * 60, 11 * 60);
    const world = DIRECTOR_EVENTS.filter((e) => e.world);
    if (!world.length) return;
    this.directorEvent(choice(world).id, true);
  }

  private arriveAtReception(ag: Agent): void {
    ag.area = 'f1_reception';
    ag.navNode = 'f1_reception';
    ag.floor = 1;
    const r = AREA_BY_ID['f1_reception'];
    if (r) ag.pos = { x: r.anchor.x, y: r.anchor.y };
  }

  /** 让固定员工按班次到岗：白班（保洁、服务员）与夜班（保安）各就各位。 */
  private spawnRoster(shift: 'day' | 'night'): void {
    for (const def of STAFF_ROSTER) {
      if (def.shift !== shift) continue;
      if (this.getAgent(def.id)) continue; // 已在岗（如接送客人的司机）不重复到岗
      const ag = this.addAgent(def);
      this.arriveAtReception(ag);
      ag.leaveAt = this.time + (shift === 'day' ? rnd(9 * 60, 12 * 60) : rnd(10 * 60, 12 * 60));
      this.log({ t: this.time, kind: 'staff', agents: [ag.def.id], text: `${ag.def.name}（${ag.def.role}）来上班了。` });
    }
  }

  private freeRoom(): Area | null {
    const used = new Set(this.agents.map((a) => a.def.homeArea));
    const rooms = AREAS.filter((a) => a.kind === 'room' || a.kind === 'suite');
    const free = rooms.filter((a) => !used.has(a.id));
    return free.length ? choice(free) : null;
  }

  private spawnGuest(): void {
    const room = this.freeRoom();
    if (!room) return;
    const ag = this.addAgent(makeGuest(room));
    this.arriveAtReception(ag);
    ag.leaveAt = this.time + rnd(2 * 1440, 5 * 1440);
    this.log({ t: this.time, kind: 'event', agents: [ag.def.id], text: `短租客人 ${ag.def.name}（${ag.def.role}）入住 ${ag.def.room}。` });
  }

  /** 到点离场：走班员工下班、短租客人退房。 */
  private tickDepartures(): void {
    for (let i = this.agents.length - 1; i >= 0; i--) {
      const a = this.agents[i];
      if (a.driving || a.offScene) continue; // 接送客人的司机不受下班/退房规则影响
      if (a.kind === 'resident' || !a.leaveAt) continue;
      if (this.time < a.leaveAt) continue;
      if (a.talkingWith) continue;
      const isGuest = a.kind === 'guest';
      this.log({
        t: this.time,
        kind: isGuest ? 'event' : 'staff',
        agents: [a.def.id],
        text: isGuest ? `短租客人 ${a.def.name} 退房离开了望海楼。` : `${a.def.name} 下班离开了望海楼。`,
      });
      this.removeAgent(a.def.id);
    }
  }

  /* ------------------------- 留客与驱逐 ------------------------- */

  /** 取当前在场的某岗位员工（经理 / 保安 / 保洁 / 服务员）。 */
  staffOnDuty(role: StaffRole): Agent | undefined {
    return this.agents.find((a) => a.def.staffRole === role);
  }

  /** 是否具备某岗位的员工（此刻在场即算）。 */
  hasStaff(role: StaffRole): boolean {
    return !!this.staffOnDuty(role);
  }

  /** 留客：把一位短租客人转为长住客人（退掉离店时间，从此常住）。 */
  keepGuest(id: string): boolean {
    const a = this.getAgent(id);
    if (!a || a.kind !== 'guest') return false;
    a.kind = 'resident';
    a.def.kind = 'resident';
    a.leaveAt = undefined;
    const base = a.def.bio.replace(/是望海楼的短租客人[\s\S]*$/, '').trim();
    a.def.bio = `${base}${base ? '，' : ''}原本只是短住，如今决定留下来常住，成了望海楼的长住客。`;
    for (const o of this.agents) {
      const r = o.relationships[id];
      if (r) r.note = '决定长住下来';
    }
    this.log({ t: this.time, kind: 'event', agents: [id], text: `短租客人 ${a.def.name} 决定留下长住，成了望海楼的长住客。` });
    this.nudgeThought(a);
    this.emit('def-changed', id);
    this.emit('agent-update', id);
    return true;
  }

  /** 驱逐：由经理出面，请一位长住客办理退房离店。需经理在场。 */
  evictResident(id: string): boolean {
    const a = this.getAgent(id);
    if (!a || a.kind !== 'resident' || a.def.isStaff) return false;
    const mgr = this.staffOnDuty('manager');
    if (!mgr) return false;
    this.log({
      t: this.time,
      kind: 'event',
      agents: [id, mgr.def.id],
      text: `经理 ${mgr.def.name} 与 ${a.def.name} 谈过之后，${a.def.name} 收拾行李办了退房，离开了望海楼。`,
    });
    this.removeAgent(id);
    return true;
  }

  /** 驱逐：由保安出面，请一位短租客人离店；当班保安不在时会叫一位赶来。 */
  evictGuest(id: string): boolean {
    const a = this.getAgent(id);
    if (!a || a.kind !== 'guest') return false;
    let guard = this.staffOnDuty('security');
    if (!guard) {
      const def = STAFF_ROSTER.filter((d) => d.staffRole === 'security').find((d) => !this.getAgent(d.id));
      if (!def) return false;
      guard = this.addAgent(def);
      this.arriveAtReception(guard);
      guard.leaveAt = this.time + 25;
      this.log({ t: this.time, kind: 'staff', agents: [guard.def.id], text: `前台叫来了保安 ${guard.def.name}。` });
    }
    this.log({
      t: this.time,
      kind: 'event',
      agents: [id, guard.def.id],
      text: `保安 ${guard.def.name} 请短租客人 ${a.def.name} 离店，${a.def.name} 收拾好行李退房走了。`,
    });
    this.removeAgent(id);
    return true;
  }

  /* ------------------------- coach：定制客人 ------------------------- */

  /** 待接名单（coach 定制好、等待服务员开车接来的客人）。 */
  get coachList(): CharacterDef[] {
    return this.coachQueue;
  }

  /** 还有几间空房可以安排给待接客人（扣掉在场占用与名单上的预留）。 */
  coachFreeRooms(): number {
    const used = new Set(this.agents.map((a) => a.def.homeArea));
    const rooms = AREAS.filter((a) => a.kind === 'room' || a.kind === 'suite');
    const free = rooms.filter((a) => !used.has(a.id)).length;
    // 名单上 / 正在被接来的客人在到店前还没有房间号，按预留一位占一间算
    const pending = [...this.coachQueue, ...(this.coachTrip?.guests ?? [])];
    const reserved = pending.filter((d) => !d.homeArea).length;
    return Math.max(0, free - reserved);
  }

  /** coach：把一位定制客人排进待接名单；房间住满则拒绝。 */
  coachEnqueue(def: CharacterDef): boolean {
    if (this.coachFreeRooms() <= 0) return false;
    this.coachQueue.push(def);
    this.emit('coach-update');
    return true;
  }

  /** 从待接名单里移除第 index 位。 */
  coachRemove(index: number): boolean {
    if (index < 0 || index >= this.coachQueue.length) return false;
    this.coachQueue.splice(index, 1);
    this.emit('coach-update');
    return true;
  }

  /** 清空待接名单。 */
  coachClear(): void {
    this.coachQueue = [];
    this.emit('coach-update');
  }

  /**
   * 确认出发：派一位服务员开车离开场景，稍后带着名单上的客人回到酒店。
   * 当班没有空闲服务员时，会从名册叫一位赶来驾驶。
   */
  coachConfirm(): boolean {
    if (this.coachTrip || !this.coachQueue.length) return false;
    let driver = this.agents.find((a) => a.def.staffRole === 'service' && !a.talkingWith);
    if (!driver) {
      const def = STAFF_ROSTER.filter((d) => d.staffRole === 'service').find((d) => !this.getAgent(d.id));
      if (!def) return false;
      driver = this.addAgent(def);
      this.arriveAtReception(driver);
      this.log({ t: this.time, kind: 'staff', agents: [driver.def.id], text: `前台叫来了服务员 ${driver.def.name}，让他开车去接客人。` });
    }
    const guests = this.coachQueue.splice(0, this.coachQueue.length);
    this.coachTrip = { driverId: driver.def.id, guests, phase: 'out', returnAt: this.time + 6 * 60 };
    driver.driving = true;
    driver.leaveAt = undefined;
    driver.intention = '开车去接客人';
    this.startMove(driver, 'f0_road');
    this.log({ t: this.time, kind: 'event', agents: [driver.def.id], text: `服务员 ${driver.def.name} 开车出发，去接 ${guests.length} 位客人。` });
    this.emit('coach-update');
    this.emit('agent-update', driver.def.id);
    return true;
  }

  /** 接客行程推进：驶离场景 → 路上 → 载客返回并办理入住。 */
  private tickCoach(): void {
    const trip = this.coachTrip;
    if (!trip) return;
    const driver = this.getAgent(trip.driverId);
    if (!driver) {
      this.coachTrip = null;
      this.emit('coach-update');
      return;
    }

    if (trip.phase === 'out') {
      // 走到公路上（或超时）即驶出场景
      const arrived = driver.area === 'f0_road' && driver.state !== 'walking';
      if (arrived || this.time >= trip.returnAt) {
        trip.phase = 'away';
        driver.offScene = true;
        driver.state = 'idle';
        trip.returnAt = this.time + rnd(30, 70);
        this.log({ t: this.time, kind: 'event', agents: [driver.def.id], text: `${driver.def.name} 的车拐上公路，驶出了望海楼的视线。` });
        this.emit('agent-update', driver.def.id);
      }
    } else if (trip.phase === 'away') {
      if (this.time >= trip.returnAt) {
        trip.phase = 'back';
        driver.offScene = false;
        const road = AREA_BY_ID['f0_road'];
        if (road) {
          driver.floor = 0;
          driver.area = 'f0_road';
          driver.navNode = 'f0_road';
          driver.pos = { x: road.rect.x + road.rect.w - 30, y: road.anchor.y };
        }
        this.startMove(driver, 'f0_plaza');
        trip.returnAt = this.time + 4 * 60;
        this.log({ t: this.time, kind: 'event', agents: [driver.def.id], text: `${driver.def.name} 载着客人回到门前广场。` });
        this.emit('agent-update', driver.def.id);
      }
    } else {
      // 回到广场（或超时）→ 客人入住
      const arrived = driver.area === 'f0_plaza' && driver.state !== 'walking';
      if (!arrived && this.time < trip.returnAt) return;
      driver.driving = false;
      driver.offScene = false;
      driver.leaveAt = this.time + rnd(30, 120);
      this.arriveAtReception(driver);
      for (const def of trip.guests) {
        const room = this.freeRoom();
        if (!room) continue;
        def.homeArea = room.id;
        def.room = room.name.split(' · ')[0] ?? room.name;
        const ag = this.addAgent(def);
        ag.kind = 'guest';
        this.arriveAtReception(ag);
        ag.leaveAt = this.time + rnd(2 * 1440, 5 * 1440);
        this.log({ t: this.time, kind: 'event', agents: [ag.def.id], text: `${driver.def.name} 把定制客人 ${ag.def.name}（${ag.def.role}）接来了，入住 ${ag.def.room}。` });
      }
      this.coachTrip = null;
      this.emit('coach-update');
      this.emit('agent-update', driver.def.id);
    }
  }

  /* ------------------------- 对话 ------------------------- */
  private tryConversations(): void {
    if (this.time < this.nextConvoCheck) return;
    this.nextConvoCheck = this.time + 5;

    const byArea = new Map<string, Agent[]>();
    for (const a of this.agents) {
      if (a.driving || a.offScene) continue; // 接送客人的司机不在场，不参与交谈
      if (a.state !== 'idle' || a.talkingWith) continue;
      const list = byArea.get(a.area) ?? [];
      list.push(a);
      byArea.set(a.area, list);
    }

    for (const [areaId, list] of byArea) {
      if (list.length < 2) continue;
      const area = AREA_BY_ID[areaId];
      if (!area) continue;
      list.sort((x, y) => x.needs.social - y.needs.social);
      for (let i = 0; i < list.length; i++) {
        for (let j = i + 1; j < list.length; j++) {
          const a = list[i];
          const b = list[j];
          const key = [a.def.id, b.def.id].sort().join('|');
          if ((this.pairCooldown.get(key) ?? 0) > this.time) continue;
          const aff = a.relationships[b.def.id]?.affinity ?? 0;
          const socialOk = area.tags.includes('social') || area.tags.includes('fun') || aff > 20;
          if (!socialOk) continue;
          const need = 100 - a.needs.social + (100 - b.needs.social);
          const extrav = a.def.personality.extraversion + b.def.personality.extraversion;
          const prob = Math.min(0.92, 0.22 + need / 260 + extrav * 0.16);
          if (Math.random() > prob) continue;
          this.startConversation(a, b);
          break;
        }
      }
    }
  }

  private startConversation(a: Agent, b: Agent): void {
    const id = ++this.confSeq;
    const convo: ActiveConversation = { id, a: a.def.id, b: b.def.id, lines: [], index: 0, nextAt: this.time + 1, pending: true };
    a.state = 'talking';
    b.state = 'talking';
    a.talkingWith = b.def.id;
    b.talkingWith = a.def.id;
    a.bubble = undefined;
    b.bubble = undefined;
    this.conversations.push(convo);
    this.emit('conversation-start', { id, a: a.def.id, b: b.def.id });

    const finish = (r: ConversationResult) => {
      convo.result = r;
      convo.lines = r.lines.slice(0, 12);
      convo.pending = false;
      convo.nextAt = this.time + 1;
      this.emit('conversation-ready', { id, a: a.def.id, b: b.def.id, topic: r.topic });
    };

    const ov = this.convoOverride(a, b);
    if (ov !== null) {
      const areaName = AREA_BY_ID[a.area]?.name ?? '';
      llmJSON<ConversationResult>(conversationSystem(), conversationUser(a, b, this.timeStr(), areaName, ''), 700, ov)
        .then((r) => {
          if (r && Array.isArray(r.lines) && r.lines.length) {
            finish(this.normalizeConvo(r, a, b));
          } else {
            finish(localConversation(a, b));
          }
        })
        .catch(() => finish(localConversation(a, b)));
    } else {
      finish(localConversation(a, b));
    }
  }

  private normalizeConvo(r: ConversationResult, a: Agent, b: Agent): ConversationResult {
    const ids = [a.def.id, b.def.id];
    const lines = (r.lines ?? [])
      .filter((l) => l && typeof l.text === 'string' && l.text.trim())
      .map((l) => ({ speaker: ids.includes(l.speaker) ? l.speaker : a.def.id, text: l.text.trim().slice(0, 80) }));
    const delta = clamp(Math.round(Number(r.affinityDelta) || 1), -8, 8);
    return { topic: r.topic || '闲谈', lines, affinityDelta: delta, note: (r.note || '聊了一会儿').slice(0, 60) };
  }

  private tickConversations(): void {
    for (let i = this.conversations.length - 1; i >= 0; i--) {
      const c = this.conversations[i];
      if (c.pending || this.time < c.nextAt) continue;
      if (c.index >= c.lines.length) {
        this.endConversation(c);
        this.conversations.splice(i, 1);
        continue;
      }
      const line = c.lines[c.index];
      const speaker = this.getAgent(line.speaker);
      if (speaker) {
        speaker.bubble = line.text;
        speaker.bubbleUntil = this.time + LINE_SIM_MIN;
      }
      this.emit('conversation-line', { id: c.id, speaker: line.speaker, text: line.text });
      c.index++;
      c.nextAt = this.time + LINE_SIM_MIN;
    }
  }

  private endConversation(c: ActiveConversation): void {
    const a = this.getAgent(c.a);
    const b = this.getAgent(c.b);
    if (!a || !b) return;
    const r = c.result;
    const delta = r?.affinityDelta ?? 1;
    const note = r?.note ?? '聊了一会儿';
    this.applyAffinity(a, b, delta, note);
    this.applyAffinity(b, a, delta, note);

    const key = [c.a, c.b].sort().join('|');
    this.pairCooldown.set(key, this.time + rnd(70, 200));

    a.talkingWith = undefined;
    b.talkingWith = undefined;
    a.state = 'idle';
    b.state = 'idle';
    a.stateUntil = this.time + 12;
    b.stateUntil = this.time + 12;
    a.nextDecisionAt = this.time + rnd(8, 22);
    b.nextDecisionAt = this.time + rnd(8, 22);
    a.needs.social = clamp(a.needs.social + 16, 0, 100);
    b.needs.social = clamp(b.needs.social + 16, 0, 100);
    a.needs.fun = clamp(a.needs.fun + 6, 0, 100);
    b.needs.fun = clamp(b.needs.fun + 6, 0, 100);

    const label = typeof r?.topic === 'string' && r.topic.length <= 10 ? topicLabelSafe(r.topic) : (r?.topic ?? '闲谈');
    a.memory.push({ t: this.time, text: `与${b.def.name}聊「${label}」：${note}`, with: b.def.id, delta });
    b.memory.push({ t: this.time, text: `与${a.def.name}聊「${label}」：${note}`, with: a.def.id, delta });
    if (a.memory.length > 6) a.memory.shift();
    if (b.memory.length > 6) b.memory.shift();

    const where = AREA_BY_ID[a.area]?.name ?? '楼里';
    this.log({
      t: this.time,
      kind: 'talk',
      agents: [a.def.id, b.def.id],
      affinity: delta,
      text: `${a.def.name} 和 ${b.def.name} 在${where}聊起了「${label}」——${note}。`,
    });

    // 对话存档，供「对话」面板回放
    this.transcripts.push({
      id: c.id,
      t: this.time,
      a: c.a,
      b: c.b,
      area: a.area,
      topic: label,
      lines: c.lines,
      delta,
      note,
    });
    if (this.transcripts.length > 80) this.transcripts.shift();
    this.emit('transcript', this.transcripts[this.transcripts.length - 1]);

    this.emit('conversation-end', { id: c.id, a: c.a, b: c.b, delta, note });
  }

  private applyAffinity(a: Agent, b: Agent, delta: number, note: string): void {
    const rel = a.relationships[b.def.id] ?? { affinity: 0, type: 'stranger' as const, interactions: 0, note: '' };
    rel.affinity = clamp(rel.affinity + delta, -100, 100);
    rel.interactions += 1;
    rel.note = note;
    rel.type = this.deriveType(rel);
    a.relationships[b.def.id] = rel;
  }

  private deriveType(rel: Relationship): Relationship['type'] {
    const a = rel.affinity;
    if (a <= -35) return 'rival';
    if (a >= 75 && rel.interactions >= 10) return 'romance';
    if (a >= 62 && rel.interactions >= 5) return 'close';
    if (a >= 28) return 'friend';
    if (rel.interactions >= 1) return 'acquaintance';
    return 'stranger';
  }

  /* ------------------------- 导演 / 世界事件 ------------------------- */
  /**
   * 触发一个事件。auto=false 为玩家点「导演事件」；auto=true 为平时随机发生的世界事件，
   * 或事件编辑器描述触发。
   */
  directorEvent(id: string, auto = false): void {
    const ev = DIRECTOR_EVENTS.find((e) => e.id === id);
    if (!ev) return;
    this.log({ t: this.time, kind: 'director', text: `【${auto ? '世界事件' : '导演'}】${ev.name} · ${ev.desc}` });

    const push = (a: Agent, text: string) => {
      a.memory.push({ t: this.time, text, with: undefined });
      if (a.memory.length > 6) a.memory.shift();
      this.nudgeThought(a);
    };
    /** 把未在交谈/熟睡的住客按概率召集到某处 */
    const summon = (areaId: string, p = 1) => {
      for (const a of this.agents) {
        if (a.talkingWith || Math.random() > p) continue;
        if (a.state === 'sleeping') a.state = 'idle';
        this.startMove(a, areaId);
      }
    };

    switch (id) {
      case 'party':
        this.gatherTo('f1_lobby', '大堂忽然热闹起来，有人提议今晚聚一聚。');
        break;
      case 'rain':
        for (const a of this.agents) {
          push(a, '外面下起暴雨，海浪拍得很响，今晚不好出门了。');
          a.needs.fun = clamp(a.needs.fun - 8, 0, 100);
        }
        this.gatherTo('f1_lobby', null, ['f5_503', 'f5_507', 'f5_508']);
        break;
      case 'blackout': {
        for (const a of this.agents) push(a, '整栋楼突然停电，走廊一片漆黑，大家摸黑聚到了一起。');
        this.gatherTo('f1_lobby', null);
        break;
      }
      case 'music': {
        const q = this.getAgent('qing');
        if (q) {
          push(q, '深夜在酒吧随手弹了一段还没写完的旋律，被路过的住客听见了。');
          this.startMove(q, 'f1_bar');
        }
        for (const a of this.agents) {
          if (a.def.id === 'qing') continue;
          if (Math.random() < 0.6) push(a, '夜里隐约听见楼下传来琴声，不知道是谁。');
        }
        this.log({ t: this.time, kind: 'event', agents: ['qing'], text: '苏晴在酒吧弹起了一段没人听过的旋律。' });
        break;
      }
      case 'letter': {
        const target = choice(this.agents);
        push(target, '收到一封没有署名的信，里面只有一句话，看完就收进了抽屉。');
        this.log({ t: this.time, kind: 'event', agents: [target.def.id], text: `${target.def.name} 收到了一封匿名信。` });
        break;
      }
      case 'sunset': {
        for (const a of this.agents) push(a, '今晚的落日把海面染成了金色。');
        this.gatherTo('f1_garden', null, ['f5_503', 'f6_s1', 'f5_505']);
        break;
      }

      /* 世界事件：平时随机发生，也可由编辑器描述触发 */
      case 'kraken': {
        for (const a of this.agents) {
          push(a, '近海浮起巨大的黑影，触手拍裂了浪花——一个不该存在的东西出现了。');
          a.needs.fun = clamp(a.needs.fun + (a.def.personality.neuroticism > 0.6 ? -12 : 10), 0, 100);
        }
        for (const a of this.agents) {
          if (a.talkingWith) continue;
          if (a.state === 'sleeping') a.state = 'idle';
          this.startMove(a, a.def.personality.neuroticism > 0.6 ? 'f1_lobby' : 'f0_beach');
        }
        this.log({ t: this.time, kind: 'event', text: '海怪在近海浮现，胆大的住客涌向海边，也有人躲进了大堂。' });
        break;
      }
      case 'ufo': {
        for (const a of this.agents) {
          push(a, '夜空里出现一队不动的光点，慢慢横过海面，谁也说不出那是什么。');
          a.needs.fun = clamp(a.needs.fun + 10, 0, 100);
        }
        summon('f0_plaza');
        this.log({ t: this.time, kind: 'event', text: '不明飞行物横过望海楼上空，住客们跑到广场抬头看。' });
        break;
      }
      case 'war': {
        for (const a of this.agents) {
          push(a, '海平线那头传来闷响，夜里能看见远处的火光，人人都在打听出了什么事。');
          a.needs.fun = clamp(a.needs.fun - 12, 0, 100);
          a.needs.social = clamp(a.needs.social + 12, 0, 100);
        }
        summon('f1_lobby');
        this.log({ t: this.time, kind: 'event', text: '远处传来炮火闷响，望海楼暂时戒严，住客都聚到了大堂。' });
        break;
      }
      case 'quake': {
        for (const a of this.agents) {
          push(a, '一阵摇晃让吊灯晃了起来，杯子掉在地上——是地震。');
          a.needs.fun = clamp(a.needs.fun - 8, 0, 100);
        }
        summon('f0_plaza');
        this.log({ t: this.time, kind: 'event', text: '余震掠过望海楼，住客们撤到室外广场。' });
        break;
      }
      case 'aurora': {
        for (const a of this.agents) {
          push(a, '天边泛起流动的绿色光带，盖住了整片夜空。');
          a.needs.fun = clamp(a.needs.fun + 8, 0, 100);
        }
        summon('f0_beach');
        this.log({ t: this.time, kind: 'event', text: '海面上空出现极光，住客们跑到沙滩上抬头看。' });
        break;
      }
      case 'meteor': {
        for (const a of this.agents) {
          push(a, '一颗接一颗的流星划过海面，像有人在天上撒火星。');
          a.needs.fun = clamp(a.needs.fun + 9, 0, 100);
        }
        summon('f0_beach');
        this.log({ t: this.time, kind: 'event', text: '流星雨划过望海楼的海面。' });
        break;
      }
      default:
        break;
    }
    this.emit('director-event', { id, auto });
  }

  /**
   * 事件编辑器：把一段自由描述变成一次世界事件。
   * 命中关键词则触发对应事件；否则作为一次通用异象，让所有人记住并议论。
   */
  pushWorldEvent(desc: string): { id: string; name: string; matched: boolean } | null {
    const text = desc.trim();
    if (!text) return null;
    const ev = matchEvent(text);
    if (ev) {
      this.directorEvent(ev.id, true);
      return { id: ev.id, name: ev.name, matched: true };
    }
    const name = text.slice(0, 12);
    this.log({ t: this.time, kind: 'director', text: `【世界事件】${text.slice(0, 40)}` });
    for (const a of this.agents) {
      a.memory.push({ t: this.time, text: `楼里传开一件事：${text.slice(0, 40)}`, with: undefined });
      if (a.memory.length > 6) a.memory.shift();
      a.needs.fun = clamp(a.needs.fun + 4, 0, 100);
      this.nudgeThought(a);
    }
    this.log({ t: this.time, kind: 'event', text: `一件说不清的事在望海楼传开了：${text.slice(0, 36)}` });
    this.emit('director-event', { id: 'custom', auto: true });
    return { id: 'custom', name, matched: false };
  }

  private gatherTo(areaId: string, memoryText: string | null, only?: string[]): void {
    for (const a of this.agents) {
      if (only && !only.includes(a.def.homeArea)) continue;
      if (a.talkingWith) continue;
      if (a.state === 'sleeping') {
        a.state = 'idle';
      }
      if (memoryText) {
        a.memory.push({ t: this.time, text: memoryText });
        if (a.memory.length > 6) a.memory.shift();
      }
      a.nextDecisionAt = this.time;
      this.startMove(a, areaId);
    }
  }

  /* ------------------------- 工具 ------------------------- */
  log(entry: LogEntry): void {
    this.logs.push(entry);
    if (this.logs.length > 400) this.logs.shift();
    this.emit('log', entry);
  }

  areaName(id: string): string {
    return AREA_BY_ID[id]?.name ?? id;
  }

  allAreas() {
    return AREAS;
  }
}

function topicLabelSafe(id: string): string {
  const known = ['weather', 'work', 'gossip', 'past', 'concern', 'friction'];
  return known.includes(id) ? topicLabel(id) : id;
}
