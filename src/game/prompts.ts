import type { Agent, BigFive, Needs } from './types';
import { AREA_BY_ID, AREAS, floorName } from './hotel';
import { GENDER_LABEL } from './characters';

const AREA_MENU = AREAS.map((a) => `${a.id}=${floorName(a.floor)}·${a.name}[${a.tags.join('/')}]`).join('、');

const KIND_TEXT: Record<string, string> = {
  resident: '长住客（长期住在望海楼）',
  staff: '走班员工（只是来上班，不常住，下班就走）',
  guest: '短租客人（住几天就会退房离开）',
};


function needsLine(n: Needs): string {
  return `饱腹 ${Math.round(n.hunger)}、精力 ${Math.round(n.energy)}、社交 ${Math.round(n.social)}、兴致 ${Math.round(n.fun)}（0=极度匮乏，100=完全满足）`;
}

function bigFiveLine(p: BigFive): string {
  return `开放性 ${p.openness.toFixed(2)}、尽责性 ${p.conscientiousness.toFixed(2)}、外向性 ${p.extraversion.toFixed(2)}、宜人性 ${p.agreeableness.toFixed(2)}、神经质 ${p.neuroticism.toFixed(2)}`;
}

function relLine(a: Agent, all: Agent[]): string {
  const parts = Object.entries(a.relationships)
    .filter(([, r]) => r.interactions > 0)
    .slice(-6)
    .map(([id, r]) => {
      const o = all.find((x) => x.def.id === id);
      return `${o?.def.name ?? id}(${r.type} 好感${Math.round(r.affinity)}｜${r.note})`;
    });
  return parts.length ? parts.join('；') : '暂无明显交情';
}

function memLine(a: Agent, all: Agent[]): string {
  if (!a.memory.length) return '（暂无）';
  return a.memory
    .slice(-5)
    .map((m) => {
      const who = m.with ? all.find((x) => x.def.id === m.with)?.def.name : '';
      return `- ${who ? `[${who}] ` : ''}${m.text}`;
    })
    .join('\n');
}

function persona(a: Agent): string {
  const d = a.def;
  const lines = [
    `姓名：${d.name}（${GENDER_LABEL[d.gender]}，${d.age}岁，${d.role}）`,
    `身份类别：${KIND_TEXT[a.kind] ?? '长住客'}`,
    `简介：${d.bio}`,
    `说话风格：${d.voice}`,
    `关键词：${d.traits.join('、')}`,
    `大五人格：${bigFiveLine(d.personality)}`,
    `当前状态：位于${floorName(a.floor)}·${AREA_BY_ID[a.area]?.name ?? a.area}（${a.state}）；内心意图「${a.intention || '暂无'}」`,
    `此刻的想法：${a.thought || '（无）'}`,
    `当前需求：${needsLine(a.needs)}`,
  ];
  if (d.isStaff && d.workArea) {
    lines.splice(2, 0, `岗位：在「${AREA_BY_ID[d.workArea]?.name ?? d.workArea}」上班${a.kind === 'staff' ? '（当班期间应守在岗位上）' : '（工作时间约 09:00-18:00）'}`);
  }
  lines.push(`对同住者的印象：${relLine(a, [])}`);
  return lines.join('\n');
}

export function decisionSystem(): string {
  return [
    '你是一间海边旅馆《望海楼》的叙事引擎，同时扮演楼里的所有角色（长住客、走班的酒店员工、短租客人）。',
    '这是一栋海边的 6 层楼旅馆：1 楼大堂/前台/酒吧/花园，2 楼餐厅/厨房/健身房/洗衣房，3 楼会议室/商店/休息区，4 楼酒店办公室/员工宿舍，5、6 楼客房。楼外还有一整片户外：门前广场连着公路，往后是沙滩、海面与天空（区域 id 以 f0_ 开头）。人在楼层之间要靠楼梯间上下，去户外从 1 楼大堂出门。',
    '你要让每位角色按自己的人设、人格与当前需求自主行动，像真实的人一样生活：会饿、会累、会孤独、会有心事；员工要上班，客人是来住店的。',
    '要求：',
    '1. 行为必须符合人设、身份与当前需求，优先满足最匮乏的需求；员工在岗时应留在工作区域；',
    '2. 保持剧情连续性，参考此人最近的记忆与对别人的印象，避免重复同一行为；',
    '3. 允许出现错过、误会、回避、靠近等真实的人际节奏；',
    '4. 只输出 JSON，不要任何解释或 markdown 代码块。',
  ].join('\n');
}

export function decisionUser(agent: Agent, all: Agent[], timeStr: string): string {
  // 补上对同住者的印象（需要全体名单）
  const personaText = persona(agent).replace(`对同住者的印象：${relLine(agent, [])}`, `对同住者的印象：${relLine(agent, all)}`);
  const others = all
    .filter((a) => a.def.id !== agent.def.id)
    .map((a) => `- ${a.def.id}=${a.def.name} 在「${floorName(a.floor)}·${AREA_BY_ID[a.area]?.name ?? a.area}」(${a.state})，身份：${KIND_TEXT[a.kind] ?? '长住客'}`)
    .join('\n');
  const steer = agent.thoughtAuto ? '' : `\n【导演植入的念头（必须优先遵循）】${agent.thought}\n请让这一轮的行为与这句念头高度一致。\n`;
  return [
    `当前时间：${timeStr}`,
    '',
    '【你扮演的角色】',
    personaText,
    steer,
    '【你最近的记忆】',
    memLine(agent, all),
    '',
    '【此刻其他住客的位置】',
    others,
    '',
    '【可前往的区域】',
    AREA_MENU,
    '',
    '请决定这一小段时间你要做什么，输出如下 JSON：',
    '{',
    '  "action": "go | use | talk | idle",',
    '  "area": "当 action=go 时填写区域 id，否则空字符串",',
    '  "target": "当 action=talk 时填写对方角色 id，否则空字符串",',
    '  "thought": "第一人称的一句内心独白，体现此刻情绪与动机",',
    '  "say": "如果此刻想对在场的人说一句话就写，否则空字符串",',
    '  "mood": "一个中文词概括此刻情绪"',
    '}',
  ].join('\n');
}

export function conversationSystem(): string {
  return [
    '你是《望海楼旅馆》的对话引擎，为楼里的一对角色（可能是长住客、酒店员工或短租客人）生成一段自然的日常对话。',
    '要求：',
    '1. 严格贴合两人的性别、年龄、职业、性格与说话风格，口吻必须能被区分开；',
    '2. 对话要推进关系：可能更亲近、也可能因为观念不同而尴尬或疏远；',
    '3. 允许停顿、答非所问、欲言又止、说反话，避免鸡汤和客套；',
    '4. 每句 8~40 字，共 6~10 句，交替发言；',
    '5. 只输出 JSON，不要解释或 markdown 代码块。',
  ].join('\n');
}

export function conversationUser(a: Agent, b: Agent, timeStr: string, areaName: string, hint: string): string {
  const cardA = persona(a).replace(`对同住者的印象：${relLine(a, [])}`, `对同住者的印象：${relLine(a, [b])}`);
  const cardB = persona(b).replace(`对同住者的印象：${relLine(b, [])}`, `对同住者的印象：${relLine(b, [a])}`);
  return [
    `当前时间：${timeStr}，地点：${areaName}。`,
    '',
    `【角色 A：${a.def.name}】`,
    cardA,
    '',
    `【角色 B：${b.def.name}】`,
    cardB,
    '',
    `【导演提示】${hint || '无'}`,
    '',
    '输出 JSON：',
    '{',
    '  "topic": "这段对话的话题，一句话",',
    '  "lines": [ {"speaker": "' + a.def.id + ' 或 ' + b.def.id + '", "text": "台词"} ],',
    '  "affinityDelta": "整数，-8到8之间，表示这次互动对两人好感的影响",',
    '  "note": "一句话概括这段关系的变化或新印象"',
    '}',
  ].join('\n');
}
