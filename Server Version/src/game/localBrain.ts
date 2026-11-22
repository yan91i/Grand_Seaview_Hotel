import type { Agent, ConversationResult, Decision } from './types';
import { AREA_BY_ID } from './hotel';

/* ------------------------------------------------------------------ *
 * 本地性格引擎：当大模型不可用时接管决策与对话。
 * 用「需求效用 + 性格权重」驱动行为，用模板 + 角色语料生成对话。
 * ------------------------------------------------------------------ */

type Line = (self: Agent, other?: Agent) => string;

const FLAVOR: Record<string, string[]> = {
  chen: ['我跟你讲，这里头有个道理', '不急，慢慢来', '我们那会儿啊', '你这话说得不太严谨'],
  wan: ['……嗯', '算了，没什么', '别问了', '我就随便说说'],
  qing: ['哎哟', '来来来', '说真的哈', '你可别多想'],
  zhe: ['啊……那个', '呃，怎么说呢', '就……挺离谱的', '这个我熟'],
  leo: ['太美了', '你必须告诉我', '我的朋友，你不懂', '这很奇怪，但很好'],
  bai: ['是吗', '你觉得呢', '嗯，我明白', '有些事，说出来就没意思了'],
  he: ['稍等，我确认一下', '这边我来处理', '规矩是这样', '有什么需要随时找我'],
  zhao: ['多吃点', '这菜得趁热', '我跟你说，火候是关键', '行行行，马上就好'],
  jiang: ['嗯，是的', '你也会喜欢这个味道吧', '我一般是这么冲的', '慢慢来就好'],
  xu: ['我跟你说个事', '就……挺离谱的', '这把稳了', '别别别，我认怂'],
  shen: ['哪儿不舒服啊', '你先坐下', '我看看，别急', '年轻人呐'],
  tie: ['嗯', '路上还行', '……习惯了', '你说得对'],
};

function flavor(a: Agent): string {
  const arr = FLAVOR[a.def.id];
  if (arr) return pick(arr);
  // 临时成员（走班员工 / 短租客人）按性格生成口语习惯
  const e = a.def.personality.extraversion;
  if (e > 0.66) return pick(['说真的', '哈哈，你听我说', '来来来', '这事儿有意思']);
  if (e < 0.34) return pick(['嗯……', '哦', '……是吗', '还好吧']);
  return pick(['嗯', '是啊', '怎么说呢', '还行']);
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function areaName(id: string | undefined): string {
  return id ? (AREA_BY_ID[id]?.name ?? id) : '这里';
}

/** 世界事件留存的记忆 → 一句第一人称的反应想法；没有匹配则返回 null。 */
function reactToEvent(text: string): string | null {
  if (/海怪|海妖|海兽|巨兽|触手|深海|不该存在|黑影/.test(text))
    return pick(['水底下那东西，比楼还大。', '活了这么久，没见过这种东西。', '只盼它别上岸，海里的我们管不了。']);
  if (/光点|飞行物|飞碟|ufo|UFO|外星|飞船/.test(text))
    return pick(['天上那些光不闪也不动，像在看着我们。', '那绝对不是飞机，我说不上来。', '要是明天它还来，我一定再去看。']);
  if (/炮火|闷响|火光|战争|打仗|戒严|硝烟|军/.test(text))
    return pick(['远处的声响一夜没停，睡不踏实。', '真打起来，望海楼离得可不算远。', '得把窗子关严实点才安心。']);
  if (/摇晃|地震|吊灯|杯子|余震|坍塌/.test(text))
    return pick(['刚才那阵子晃得心都提起来了。', '地板一动，我第一反应就是往外跑。', '别再震了，墙面本来就不新。']);
  if (/极光|绿光|光带|北极光/.test(text))
    return pick(['那片光比什么都好看，值了。', '这样的天空，一辈子能有几回。', '明天要是还在，还想去海边看。']);
  if (/流星|陨石|陨星|彗星|火星/.test(text))
    return pick(['一颗接一颗地划过去，我都忘了许愿。', '像有人在天上撒火星子。', '流星那么多，心里那点事也说不上来了。']);
  if (/暴雨|海浪拍|不好出门/.test(text))
    return pick(['雨大得看不清海，只能待在楼里。', '这样的天气，出门也没意思。']);
  if (/停电|漆黑|摸黑|烛/.test(text))
    return pick(['黑得伸手不见五指，只能等电来。', '没电的夜里，连海浪声都变大了。']);
  if (/匿名信|一封信/.test(text))
    return pick(['那封信到底是谁写的。', '信里的那句话，我一直没想明白。']);
  if (/落日|染成金色/.test(text))
    return pick(['今天的落日，把整片海都染金了。', '这样的黄昏，看一次少一次。']);
  if (/传开一件事|楼里都在传|传开/.test(text))
    return pick(['楼里都在传那件事，谁也说不清真假。', '那事听着离谱，可大家都当真了。']);
  return null;
}

/* --------------------------- 实时想法 --------------------------- */

/** 根据状态、需求与性格生成一句第一人称的实时想法。 */
export function thinkLocal(a: Agent, all: Agent[]): string {
  const n = a.needs;
  const p = a.def.personality;
  const here = areaName(a.area);

  if (a.state === 'talking') {
    const o = a.talkingWith ? all.find((x) => x.def.id === a.talkingWith) : undefined;
    return o ? `${o.def.name}其实还挺好说话的，聊起来没那么累。` : '先跟人聊着，别的事待会儿再说。';
  }
  if (a.state === 'sleeping') return '睡一会儿……脑子总算安静下来了。';
  if (a.state === 'eating') return '这顿饭吃得踏实，先把肚子填饱。';
  if (a.state === 'working') return pick(['手里这点活还没弄完。', '安静下来，正好做点正事。', '得把这件事做完，不然心里不踏实。']);
  if (a.state === 'gazing') return pick(['窗外就是海，浪一层一层地推过来。', '站在窗边看海，暂时不太想动。', '楼下的公路上偶尔过车，海面倒是很安静。']);
  if (a.state === 'walking') return `往${areaName(a.targetArea ?? a.area)}去，路上没什么人，脚步声很清楚。`;

  // 户外：海边氛围
  if (a.area.startsWith('f0_')) {
    if (a.area === 'f0_road') return '车偶尔从门前开过，海就在路那头。';
    return pick(['海风比楼里舒服多了。', '沙子踩上去是凉的，海浪声一直没停。', '天边那片海，怎么看都不腻。']);
  }

  // 需求驱动
  if (n.energy < 28) return pick(['眼皮沉得抬不起来，得找张床。', '撑不住了，只想回去躺下。']);
  if (n.hunger < 28) return pick(['肚子一直在叫，想起餐厅那锅汤。', '饿了，得去弄点吃的。']);
  if (n.social < 28) return pick(['好久没跟人好好说句话了。', '楼里今天安静得有点过分，想找个人待着。']);
  if (n.fun < 28) return pick(['有点闷，想出去走走。', '今天好像没什么意思，透透气吧。']);

  // 记忆驱动
  if (a.memory.length) {
    const m = a.memory[a.memory.length - 1];
    // 最近的记忆若是「楼里发生的事」（无对话对象），想法会绕着这件事转
    if (!m.with) {
      const r = reactToEvent(m.text);
      if (r) return r;
    }
    const who = m.with ? (all.find((x) => x.def.id === m.with)?.def.name ?? '那个人') : '';
    if (m.delta !== undefined && m.delta <= -1) return pick(['刚才那话……我是不是说重了。', '算了，不想了。', '有点说不上来的别扭。']);
    if (m.delta !== undefined && m.delta >= 3) return `和${who || '人'}聊完，心里松快了些。`;
  }

  // 性格驱动
  if (p.neuroticism > 0.65) return pick(['脑子里乱糟糟的，什么也没想清楚。', '总有种说不出的不安。', '安静下来反而更慌。']);
  if (p.extraversion > 0.7) return pick(['今天大堂应该挺热闹，去凑凑。', '想找人说两句话。', '一个人待着没意思。']);
  if (p.conscientiousness > 0.75) return pick(['先把该做的事列一列。', '按部就班来吧。', '今天别拖拉。']);
  if (p.openness > 0.75) return pick(['不知道今天会遇到什么新鲜事。', '想去没去过的地方转转。']);
  return pick(['坐着发会儿呆。', '没什么要紧事，走一步看一步。', `${here}待着也还行。`]);
}

/* --------------------------- 决策 --------------------------- */

const THOUGHTS = {
  sleep: ['眼皮开始打架了', '再撑一会儿……不行，得回去躺下', '昨晚又熬太晚了'],
  hungry: ['肚子在叫', '想念餐厅那锅汤', '该弄点吃的了'],
  lonely: ['好久没跟人好好说话了', '楼里今天安静得过分', '想找个人说说话'],
  bored: ['今天好像没什么事', '有点闷', '想出去透透气'],
  work: ['稿子还差一点', '得把手里这点事做完', '安静下来干点正事吧'],
  wander: ['随便走走', '下楼看看有没有人', '没来由地想待在热闹点的地方'],
  reflect: ['坐着发会儿呆', '脑子里乱糟糟的', '什么都不想做'],
};

const MOODS = {
  sleep: '困倦', hungry: '饥饿', lonely: '落寞', bored: '无聊', work: '专注', wander: '闲散', reflect: '低落',
};

/** 解析玩家植入的想法，判断角色想做什么。返回 null 表示没有可识别的倾向。 */
interface Steer {
  kind?: 'sleep' | 'eat' | 'work' | 'fun' | 'social';
  area?: string;
  target?: string;
  say?: string;
}

function steerFromThought(agent: Agent, all: Agent[]): Steer | null {
  if (agent.thoughtAuto || !agent.thought.trim()) return null;
  const t = agent.thought;
  const other = all.find((o) => o.def.id !== agent.def.id && (t.includes(o.def.name) || t.includes(o.def.id)));
  const socialWord = /聊|说话|找人|搭话|一起|约|见|碰面|陪|认识|交个朋友/.test(t);

  if (other && socialWord) return { kind: 'social', target: other.def.id, area: other.area, say: `${other.def.name}，正好碰到你。` };
  if (/睡|休息|躺|困|歇|补觉|太累|累/.test(t)) return { kind: 'sleep' };
  if (/吃|饿|饭|餐|汤|泡面|下馆子|食/.test(t)) return { kind: 'eat' };
  if (/工作|上班|值班|稿|画|写|代码|游戏|正事|项目|裁员|简历/.test(t)) return { kind: 'work' };
  if (/酒|吧台|唱|喝|音乐|吉他|歌/.test(t)) return { kind: 'fun', area: 'f1_bar' };
  // 「通过窗户看外面的景色」：就地走到窗边看风景
  if (/窗|窗外|窗边|外面的景色|看向外面|望向外/.test(t)) return { kind: 'fun', area: agent.area };
  // 户外：沙滩、海边、透气
  if (/沙滩|海滩|海边|游泳|冲浪|海浪|出海|户外|外面走走|吹风/.test(t)) return { kind: 'fun', area: 'f0_beach' };
  if (/海|风|落日|风景|拍照|相机|露台|阳台|花园|花|散步|走走|透气|空气|发呆/.test(t)) return { kind: 'fun', area: 'f1_garden' };
  if (/天台|屋顶|观景/.test(t)) return { kind: 'fun', area: 'f6_sky' };
  if (/健身|锻炼|跑步|运动|瑜伽/.test(t)) return { kind: 'fun', area: 'f2_gym' };
  if (/大堂|楼下|热闹|聚会|聚|人多|前厅|沙发/.test(t)) return { kind: 'fun', area: 'f1_lobby' };
  if (/餐厅|用餐|吃饭/.test(t)) return { kind: 'eat' };
  if (/回房间|回房|屋里|自己的房间/.test(t)) return { kind: 'fun', area: agent.def.homeArea };
  if (other) return { kind: 'social', target: other.def.id, area: other.area, say: `${other.def.name}，有空吗？` };
  return null;
}

/** 判断该角色此刻是否"在岗"，返回应去的工作区域；否则返回 null。 */
function dutyTarget(a: Agent, time: number): string | null {
  if (!a.def.isStaff || !a.def.workArea) return null;
  // 走班员工在出现期间一直算在岗（他们的班次由生成/离场时间控制）
  if (a.kind === 'staff') return a.def.workArea;
  const mins = ((time % 1440) + 1440) % 1440;
  // 长住的酒店员工：09:00 - 18:00 上班
  return mins >= 9 * 60 && mins <= 18 * 60 ? a.def.workArea : null;
}

export function decideLocal(agent: Agent, all: Agent[], time = 0): Decision {
  const n = agent.needs;
  const p = agent.def.personality;
  const home = agent.def.homeArea;
  const inHome = agent.area === home;
  const rnd = (v: number) => v * (0.85 + Math.random() * 0.35);

  interface Cand {
    score: number;
    action: Decision['action'];
    area?: string;
    target?: string;
    pickKey: keyof typeof THOUGHTS;
  }
  const cands: Cand[] = [];

  // 上班：酒店员工/走班员工在岗时优先去岗位上
  const duty = dutyTarget(agent, time);
  if (duty) {
    const atWork = agent.area === duty;
    cands.push({ score: rnd(atWork ? 820 : 940), action: atWork ? 'use' : 'go', area: atWork ? undefined : duty, pickKey: 'work' });
  }

  // 睡觉
  if (n.energy < 72) {
    cands.push({ score: rnd((100 - n.energy) * (1.25 + p.neuroticism * 0.2)), action: inHome ? 'use' : 'go', area: home, pickKey: 'sleep' });
  }
  // 吃饭
  if (n.hunger < 70) {
    const at = agent.area === 'f2_dining';
    cands.push({ score: rnd((100 - n.hunger) * 1.35), action: at ? 'use' : 'go', area: at ? undefined : 'f2_dining', pickKey: 'hungry' });
  }
  // 社交：找一个此刻独自待着的、关系不错的对象过去搭话
  if (n.social < 78) {
    const others = all.filter((a) => a.def.id !== agent.def.id);
    const weights = others.map((o) => {
      const rel = agent.relationships[o.def.id];
      const aff = rel ? rel.affinity : 0;
      const socialAreas = AREA_BY_ID[o.area]?.tags.includes('social');
      return { o, w: 1 + aff * 0.02 + (socialAreas ? 0.6 : 0) + (1 - p.extraversion) * 0.4 };
    });
    weights.sort((x, y) => y.w - x.w);
    const chosen = weights[0]?.o;
    if (chosen) {
      const score = rnd((100 - n.social) * (0.95 + p.extraversion * 0.6));
      cands.push({
        score,
        action: 'talk',
        target: chosen.def.id,
        area: chosen.area,
        pickKey: 'lonely',
      });
    }
  }
  // 找乐子
  if (n.fun < 70) {
    const funArea = p.openness > 0.7 ? 'f0_beach' : p.extraversion > 0.6 ? 'f1_bar' : 'f1_garden';
    const at = agent.area === funArea;
    cands.push({ score: rnd((100 - n.fun) * (0.9 + p.openness * 0.4)), action: at ? 'use' : 'go', area: at ? undefined : funArea, pickKey: 'bored' });
  }
  // 工作 / 发呆：性格驱动
  cands.push({ score: rnd(20 + p.conscientiousness * 40 + p.openness * 15), action: inHome ? 'use' : 'go', area: home, pickKey: 'work' });
  cands.push({ score: rnd(15 + (1 - p.extraversion) * 30 + p.neuroticism * 25), action: 'idle', pickKey: 'reflect' });
  cands.push({ score: rnd(18 + p.extraversion * 30), action: 'go', area: pick(['f1_lobby', 'f1_garden', 'f1_bar', 'f2_gym', 'f3_lounge', 'f6_sky', 'f0_beach', 'f0_plaza']), pickKey: 'wander' });

  // 玩家植入的想法拥有最高优先级，直接决定行为
  const steer = steerFromThought(agent, all);
  if (steer) {
    if (steer.kind === 'sleep') {
      cands.push({ score: 1000, action: inHome ? 'use' : 'go', area: home, pickKey: 'sleep' });
    } else if (steer.kind === 'eat') {
      cands.push({ score: 1000, action: agent.area === 'f2_dining' ? 'use' : 'go', area: 'f2_dining', pickKey: 'hungry' });
    } else if (steer.kind === 'work') {
      const workAt = agent.def.workArea ?? home;
      cands.push({ score: 1000, action: agent.area === workAt ? 'use' : 'go', area: workAt, pickKey: 'work' });
    } else if (steer.kind === 'social' && steer.target) {
      cands.push({ score: 1000, action: 'talk', target: steer.target, area: steer.area, pickKey: 'lonely' });
    } else if (steer.area) {
      cands.push({ score: 1000, action: agent.area === steer.area ? 'use' : 'go', area: steer.area, pickKey: 'wander' });
    }
  }

  cands.sort((a, b) => b.score - a.score);
  const best = cands[0];
  const thought = steer ? agent.thought : pick(THOUGHTS[best.pickKey]);
  const mood = MOODS[best.pickKey];

  let say = '';
  if (best.action === 'talk' && best.target) {
    const o = all.find((x) => x.def.id === best.target);
    if (o) say = pick([`${o.def.name}，有空吗？`, '一个人待着？', '正好碰到你。']);
  } else if (best.action === 'use' && agent.area === 'f1_bar') {
    say = pick(['给我来一杯。', '今天还唱吗？']);
  }
  if (steer?.say) say = steer.say;

  return { action: best.action, area: best.area, target: best.target, thought, say, mood };
}

/* --------------------------- 对话 --------------------------- */

interface Topic {
  id: string;
  weight: (aff: number) => number;
  open: Line[];
  reply: Line[];
  close: Line[];
  delta: number;
  note: string;
}

const TOPICS: Topic[] = [
  {
    id: 'weather',
    weight: () => 1,
    open: [(s, o) => `${o?.def.name ?? '你'}，今天海边风大，你察觉到了吗？`, (s) => `${flavor(s)}，这天气有点怪。`],
    reply: [(s) => `${flavor(s)}，我倒觉得挺舒服。`, (s) => `嗯，海边的风总是这样。`],
    close: [(s) => `${flavor(s)}，那就这样吧。`, (s) => `改天再聊。`],
    delta: 1,
    note: '随口聊了聊天气，气氛还算轻松',
  },
  {
    id: 'work',
    weight: () => 1.2,
    open: [(s, o) => `${o?.def.name ?? '你'}，最近在忙什么？`, (s) => `${flavor(s)}，你看起来总有事。`],
    reply: [(s) => `${flavor(s)}，说不上忙，就是有点乱。`, (s) => `还在弄我自己的那点事。`],
    close: [(s) => `${flavor(s)}，加油吧。`, (s) => `有需要再说。`],
    delta: 2,
    note: '聊到各自的近况，交换了一点处境',
  },
  {
    id: 'gossip',
    weight: (aff) => (aff > 10 ? 1.3 : 0.5),
    open: [(s) => `${flavor(s)}，你觉不觉得白霜姐有点神秘？`, (s) => `${flavor(s)}，陈老师今天又在大堂看报。`],
    reply: [(s) => `${flavor(s)}，住得久了谁没点故事。`, (s) => `别乱猜，人家自有人家的道理。`],
    close: [(s) => `${flavor(s)}，当我没说。`, (s) => `就这样吧，别往外传。`],
    delta: 1,
    note: '聊了聊楼里其他人的事，拉近了一点距离',
  },
  {
    id: 'past',
    weight: (aff) => (aff > 25 ? 1.4 : 0.3),
    open: [(s) => `${flavor(s)}，我年轻的时候……算了。`, (s) => `${flavor(s)}，你以前在哪儿？`],
    reply: [(s) => `${flavor(s)}，谁还没点旧事。`, (s) => `过去的事，说多了没意思。`],
    close: [(s) => `${flavor(s)}，谢谢你听我说。`, (s) => `改天再说吧。`],
    delta: 3,
    note: '难得聊到各自的过去，彼此多了一层理解',
  },
  {
    id: 'concern',
    weight: (aff) => (aff > 35 ? 1.6 : 0.2),
    open: [(s, o) => `${flavor(s)}，${o?.def.name ?? '你'}，你最近还好吗？`, (s) => `${flavor(s)}，你脸色不太好。`],
    reply: [(s) => `${flavor(s)}，还行，撑得住。`, (s) => `被你看出来了。没什么大事。`],
    close: [(s) => `${flavor(s)}，有事就说话。`, (s) => `谢谢。真的。`],
    delta: 4,
    note: '一句关心被接住了，关系明显近了一步',
  },
  {
    id: 'friction',
    weight: (aff) => (aff < 0 ? 1.5 : 0.25),
    open: [(s) => `${flavor(s)}，你上次那句话什么意思？`, (s) => `${flavor(s)}，我不太认同你的说法。`],
    reply: [(s) => `${flavor(s)}，我没什么意思。`, (s) => `随你怎么想。`],
    close: [(s) => `${flavor(s)}，算了。`, (s) => `当我没说清楚。`],
    delta: -3,
    note: '话赶话地别了起来，气氛有点僵',
  },
];

function relationship(a: Agent, b: Agent) {
  const rel = a.relationships[b.def.id];
  return rel ? rel.affinity : 0;
}

export function localConversation(a: Agent, b: Agent): ConversationResult {
  const aff = (relationship(a, b) + relationship(b, a)) / 2;
  const pool = TOPICS.filter((t) => t.weight(aff) > 0.2);
  const weights = pool.map((t) => t.weight(aff));
  const total = weights.reduce((s, w) => s + w, 0);
  let r = Math.random() * total;
  let topic = pool[0];
  for (let i = 0; i < pool.length; i++) {
    r -= weights[i];
    if (r <= 0) {
      topic = pool[i];
      break;
    }
  }

  const A = a;
  const B = b;
  const lines: { speaker: string; text: string }[] = [];
  const useOpen = pick(topic.open);
  lines.push({ speaker: A.def.id, text: useOpen(A, B) });
  lines.push({ speaker: B.def.id, text: pick(topic.reply)(B, A) });
  lines.push({ speaker: A.def.id, text: pick(topic.reply)(A, B) });
  if (Math.random() < 0.7) {
    lines.push({ speaker: B.def.id, text: pick(topic.reply)(B, A) });
    lines.push({ speaker: A.def.id, text: pick(topic.reply)(A, B) });
  }
  lines.push({ speaker: B.def.id, text: pick(topic.close)(B, A) });
  lines.push({ speaker: A.def.id, text: pick(topic.close)(A, B) });

  const agreeBonus = (A.def.personality.agreeableness + B.def.personality.agreeableness - 1) * 3;
  const jitter = Math.round((Math.random() - 0.5) * 4);
  const delta = Math.max(-8, Math.min(8, Math.round(topic.delta + agreeBonus + jitter)));

  return { topic: topic.id, lines, affinityDelta: delta, note: topic.note };
}

export function topicLabel(id: string): string {
  const map: Record<string, string> = {
    weather: '天气与海', work: '近况', gossip: '楼里闲话',
    past: '过去的经历', concern: '彼此的关心', friction: '一点摩擦',
  };
  return map[id] ?? id;
}
