import type { Simulation } from '../game/simulation';
import { DIRECTOR_EVENTS } from '../game/simulation';
import { coachDraft, makeCoachGuest, randomPalette, type CoachInput } from '../game/roster';
import { makeCharacterDataURL } from '../game/pixelSprites';
import { FLOOR_LEVELS, floorName } from '../game/hotel';
import {
  LOCAL_ONLY,
  addKeys,
  assignKey,
  defaultBaseUrl,
  defaultModel,
  forcedLocal,
  getAssign,
  getDefaultKeyId,
  getKeys,
  maskKey,
  parseKeyLines,
  removeKey,
  resolveKey,
  setDefaultKey,
} from '../game/keys';
import { testKey } from '../game/llm';
import type { Agent, BigFive, CharacterDef, ConversationRecord, Gender, HairStyle, LogEntry, Needs, SpritePalette } from '../game/types';
import { applyI18n, getLang, onLangChange, t, toggleLang } from '../i18n';
import { IS_PAGES } from '../buildMode';

const STATE_LABEL = (): Record<string, string> => ({
  idle: t('state.idle'),
  walking: t('state.walking'),
  talking: t('state.talking'),
  eating: t('state.eating'),
  sleeping: t('state.sleeping'),
  relaxing: t('state.relaxing'),
  working: t('state.working'),
  gazing: t('state.gazing'),
});

const REL_LABEL = (): Record<string, string> => ({
  stranger: t('rel.stranger'),
  acquaintance: t('rel.acquaintance'),
  friend: t('rel.friend'),
  close: t('rel.close'),
  rival: t('rel.rival'),
  romance: t('rel.romance'),
});

const PERSONA_LABEL = (): Record<keyof BigFive, string> => ({
  openness: t('persona.openness'),
  conscientiousness: t('persona.conscientiousness'),
  extraversion: t('persona.extraversion'),
  agreeableness: t('persona.agreeableness'),
  neuroticism: t('persona.neuroticism'),
});

const NEED_LABEL = (): Record<keyof Needs, string> => ({
  hunger: t('need.hunger'),
  energy: t('need.energy'),
  social: t('need.social'),
  fun: t('need.fun'),
});

const GENDERS: Gender[] = ['male', 'female', 'nonbinary'];

/** 捏脸：可调的四个颜色槽位 */
const SWATCH = (): { key: keyof Pick<SpritePalette, 'skin' | 'hair' | 'top' | 'bottom'>; label: string }[] => [
  { key: 'skin', label: t('swatch.skin') },
  { key: 'hair', label: t('swatch.hair') },
  { key: 'top', label: t('swatch.top') },
  { key: 'bottom', label: t('swatch.bottom') },
];

/** 捏脸：可选发型 */
const HAIR_STYLES = (): { id: HairStyle; label: string }[] => [
  { id: 'short', label: t('hair.short') },
  { id: 'long', label: t('hair.long') },
  { id: 'bun', label: t('hair.bun') },
  { id: 'bald', label: t('hair.bald') },
];

const toHex = (n: number): string => `#${n.toString(16).padStart(6, '0')}`;
const fromHex = (s: string): number => {
  const n = parseInt(s.replace('#', ''), 16);
  return Number.isFinite(n) ? n : 0;
};

const KIND_LABEL = (): Record<string, string> => ({
  system: t('kind.system'),
  move: t('kind.move'),
  action: t('kind.action'),
  talk: t('kind.talk'),
  mood: t('kind.mood'),
  rel: t('kind.rel'),
  mind: t('kind.mind'),
  event: t('kind.event'),
  director: t('kind.director'),
  staff: t('kind.staff'),
});

/** 角色类别：完整称呼 / 简短标记 */
const KIND_FULL = (): Record<string, string> => ({
  resident: t('kindfull.resident'),
  staff: t('kindfull.staff'),
  guest: t('kindfull.guest'),
});
const KIND_SHORT = (): Record<string, string> => ({
  resident: t('kindshort.resident'),
  staff: t('kindshort.staff'),
  guest: t('kindshort.guest'),
});

/** 把模拟分钟格式化成「第 x 天 hh:mm」（中文）/「Day x hh:mm」（英文） */
function fmtClock(t: number): string {
  const mins = Math.floor(t) % 1440;
  const day = Math.floor(t / 1440) + 1;
  const hh = String(Math.floor(mins / 60)).padStart(2, '0');
  const mm = String(mins % 60).padStart(2, '0');
  return getLang() === 'zh' ? `第 ${day} 天 ${hh}:${mm}` : `Day ${day} ${hh}:${mm}`;
}


function $(id: string): HTMLElement {
  return document.getElementById(id) as HTMLElement;
}

function esc(s: string): string {
  return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c] as string);
}

function setText(id: string, text: string): void {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

function avatarFor(def: CharacterDef): string {
  return makeCharacterDataURL(def.palette);
}

function needColor(v: number): string {
  if (v < 30) return '#e0575f';
  if (v < 55) return '#e0a54a';
  return '#6fd08a';
}

function clampInt(v: string, lo: number, hi: number): number {
  const n = Math.round(Number(v));
  if (!Number.isFinite(n)) return lo;
  return Math.max(lo, Math.min(hi, n));
}

export function createHud(sim: Simulation): void {
  const avatarCache: Record<string, string> = {};
  const cachedAvatar = (def: CharacterDef): string => (avatarCache[def.id] ??= avatarFor(def));
  /** 记住每个角色出现过的名字：临时成员离场后，日志/对话里仍能显示姓名 */
  const nameCache: Record<string, string> = {};
  const nameOf = (id: string): string => sim.getAgent(id)?.def.name ?? nameCache[id] ?? id;
  const remember = (id: string): void => {
    const a = sim.getAgent(id);
    if (a) nameCache[id] = a.def.name;
  };
  for (const a of sim.agents) remember(a.def.id);

  /* 开场画面期间隐藏 HUD，等酒店场景真正跑起来（首次 tick）再显示 */
  const app = document.getElementById('app');
  app?.classList.add('intro-mode');
  const revealHud = (): void => {
    app?.classList.remove('intro-mode');
    sim.off('tick', revealHud);
    // 进场动画结束后弹出欢迎介绍
    window.setTimeout(() => openWelcomeModal(), 650);
  };
  sim.on('tick', revealHud);

  /* ---------------- 角色快捷条（动态名册） ---------------- */
  const chips = $('chips');

  const paintChip = (id: string): void => {
    const el = chips.querySelector<HTMLElement>(`.char-chip[data-id="${id}"]`);
    const a = sim.getAgent(id);
    if (!el || !a) return;
    nameCache[id] = a.def.name;
    el.className = `char-chip k-${a.kind}`;
    el.classList.toggle('selected', sim.selectedId === id);
    const img = el.querySelector('img');
    if (img) img.src = cachedAvatar(a.def);
    const nm = el.querySelector('.cname');
    if (nm) nm.textContent = a.def.name;
    const fl = el.querySelector('.cfloor');
    if (fl) fl.textContent = `${floorName(a.floor)}·${KIND_SHORT()[a.kind] ?? ''}`;
  };

  const addChip = (id: string): void => {
    if (chips.querySelector(`.char-chip[data-id="${id}"]`)) return;
    const a = sim.getAgent(id);
    if (!a) return;
    const el = document.createElement('div');
    el.className = `char-chip k-${a.kind}`;
    el.dataset.id = id;
    el.innerHTML = `<img alt="${esc(a.def.name)}"><span class="cname"></span><span class="cfloor"></span>`;
    el.addEventListener('click', () => {
      const ag = sim.getAgent(id);
      if (!ag) return;
      if (ag.floor !== sim.viewFloor) sim.setViewFloor(ag.floor);
      sim.select(id);
    });
    chips.appendChild(el);
    paintChip(id);
  };

  const removeChip = (id: string): void => {
    chips.querySelector(`.char-chip[data-id="${id}"]`)?.remove();
  };

  const paintChips = (): void => {
    for (const a of sim.agents) paintChip(a.def.id);
  };

  for (const a of sim.agents) addChip(a.def.id);

  sim.on('agent-added', (id) => addChip(id as string));
  sim.on('agent-removed', (id) => removeChip(id as string));

  /* ---------------- 楼层切换 ---------------- */
  const floorSwitch = $('floor-switch');
  const floorBtns = new Map<number, HTMLButtonElement>();
  for (const level of FLOOR_LEVELS) {
    const b = document.createElement('button');
    b.className = 'floor-btn';
    b.dataset.floor = String(level);
    b.textContent = t(`floor.${level}.short`);
    b.title = t(`floor.${level}.name`);
    b.addEventListener('click', () => sim.setViewFloor(level));
    floorSwitch.appendChild(b);
    floorBtns.set(level, b);
  }
  const paintFloor = (): void => {
    floorBtns.forEach((b, level) => b.classList.toggle('active', level === sim.viewFloor));
  };
  sim.on('floor', () => {
    paintFloor();
    paintChips();
  });
  paintFloor();

  const refreshChip = (id: string) => paintChip(id);
  sim.on('def-changed', (id) => {
    refreshChip(id as string);
    if ((id as string) === currentId) paint();
  });

  /* ---------------- 时间 / 控制 ---------------- */
  const clock = $('clock');
  sim.on('tick', (p) => {
    clock.textContent = fmtClock((p as { time: number }).time);
  });

  const pauseBtn = $('btn-pause');
  pauseBtn.addEventListener('click', () => {
    const paused = sim.togglePause();
    pauseBtn.textContent = paused ? '▶' : '⏸';
    pauseBtn.classList.toggle('active', paused);
  });

  document.querySelectorAll<HTMLButtonElement>('.btn.speed').forEach((b) => {
    b.addEventListener('click', () => {
      const s = Number(b.dataset.speed);
      sim.setSpeed(s);
      document.querySelectorAll('.btn.speed').forEach((x) => x.classList.remove('active'));
      b.classList.add('active');
    });
  });

  /* ---------------- 语言切换 ---------------- */
  const langBtn = $('btn-lang');
  const refreshLangBtn = (): void => {
    langBtn.textContent = getLang() === 'zh' ? 'EN' : '中';
    langBtn.title = t('tool.lang');
  };
  refreshLangBtn();
  langBtn.addEventListener('click', () => {
    toggleLang();
  });

  // 语言切换后：刷新静态文案、楼层按钮、名册、档案面板；已打开的弹窗直接关闭（文案在打开时才取 t()）
  onLangChange(() => {
    applyI18n();
    refreshLangBtn();
    // 楼层按钮
    floorBtns.forEach((b, level) => {
      b.textContent = t(`floor.${level}.short`);
      b.title = t(`floor.${level}.name`);
    });
    // 名册
    paintChips();
    // 档案面板
    if (currentId) {
      if (editing) {
        const a = sim.getAgent(currentId);
        if (a) {
          $('pf-form').innerHTML = buildForm(a);
          bindForm();
        }
      }
      paint();
    } else {
      renderSelection();
    }
    // 已打开的弹窗：关闭即可（重新打开时会用新语言渲染）
    if (modalRoot.classList.contains('open')) closeModal();
  });

  /* ---------------- 面板折叠 ---------------- */
  const collapsiblePanels = ['log-panel', 'profile-panel'];
  /** 用户手动操作过的面板：之后不再被「小窗口自动收起」干预 */
  const userToggled = new Set<string>();

  const setCollapsed = (id: string, collapsed: boolean): void => {
    const panel = document.getElementById(id);
    if (!panel) return;
    panel.classList.toggle('collapsed', collapsed);
    const btn = document.querySelector<HTMLButtonElement>(`[data-toggle="${id}"]`);
    if (btn) btn.textContent = collapsed ? t('panel.expand') : t('panel.collapse');
  };

  document.querySelectorAll<HTMLButtonElement>('[data-toggle]').forEach((b) => {
    b.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = b.dataset.toggle as string;
      const panel = document.getElementById(id);
      if (!panel) return;
      userToggled.add(id);
      setCollapsed(id, !panel.classList.contains('collapsed'));
    });
  });

  // 收起的窄条：点整条任意位置即可展开（按钮点击已由上方处理）
  for (const id of collapsiblePanels) {
    document.getElementById(id)?.addEventListener('click', () => {
      const panel = document.getElementById(id);
      if (!panel || !panel.classList.contains('collapsed')) return;
      userToggled.add(id);
      setCollapsed(id, false);
    });
  }

  // 小窗口下默认收起侧栏，避免遮盖画面；窗口变大或用户手动操作后按需恢复
  const applyAutoCollapse = (): void => {
    const tight = window.innerWidth <= 1120 || window.innerHeight <= 700;
    for (const id of collapsiblePanels) {
      if (userToggled.has(id)) continue;
      setCollapsed(id, tight);
    }
  };
  applyAutoCollapse();
  window.addEventListener('resize', applyAutoCollapse);

  /* ---------------- LLM 状态 ---------------- */
  const llmChip = $('llm-chip');
  if (IS_PAGES) {
    llmChip.className = 'chip offline';
    llmChip.dataset.i18nKey = 'llm.local';
    llmChip.textContent = t('llm.local');
    llmChip.removeAttribute('data-i18n-title');
    llmChip.removeAttribute('title');
  } else {
    sim.on('llm-status', (p) => {
      const d = p as { mode: string; model: string | null; online: number; total: number; userKeys: number };
      if (d.mode === 'online') {
        llmChip.className = 'chip online';
        if (d.online < d.total) {
          llmChip.textContent = t('llm.online.n', { n: d.online, total: d.total });
        } else if (d.userKeys > 0) {
          llmChip.textContent = t('llm.online.keys', { total: d.total, keys: d.userKeys });
        } else {
          llmChip.textContent = t('llm.online.model', { model: d.model ?? 'LLM' });
        }
      } else {
        llmChip.className = 'chip offline';
        llmChip.textContent = t('llm.offline');
      }
      llmChip.title = t('llm.title');
    });
    llmChip.style.cursor = 'pointer';
    llmChip.addEventListener('click', () => openKeyManager());
  }

  /* ---------------- 事件日志 ---------------- */
  const logList = $('log-list');
  const addLog = (e: LogEntry) => {
    if (e.minor) return; // 想法与日常细节只进「全部日志」
    const li = document.createElement('li');
    li.className = `k-${e.kind}`;
    li.innerHTML = `<span class="lt">${e.t.toFixed(0)}′</span>${esc(e.text)}`;
    logList.prepend(li);
    while (logList.children.length > 60) logList.removeChild(logList.lastChild as Node);
  };
  sim.logs.forEach(addLog);
  sim.on('log', (e) => addLog(e as LogEntry));

  /* ---------------- 住客档案（可实时编辑） ---------------- */
  const profileBody = $('profile-body');
  let currentId: string | null = null;
  let editing = false;
  let profileThrottle = 0;

  const barRow = (name: string, pct: number, val: string, color: string) =>
    `<div class="bar-row"><span class="bar-name">${name}</span><div class="bar"><i style="width:${pct}%;background:${color}"></i></div><span>${val}</span></div>`;

  const aiLabel = (id: string): string => {
    if (IS_PAGES || forcedLocal(id)) return t('pf.ai.local');
    const k = resolveKey(id);
    return k ? t('pf.ai.key', { label: k.label }) : t('pf.ai.default');
  };

  const paintHead = (a: Agent) => {
    const d = a.def;
    setText('pf-name', d.name);
    setText('pf-meta', `${KIND_FULL()[a.kind] ?? t('kindfull.default')} · ${t('gender.' + d.gender)} · ${d.age}${t('coach.age')} · ${d.role}`);
    setText(
      'pf-room',
      `${t('pf.room', { room: d.room })}${d.workArea ? t('pf.workarea', { area: t('area.' + d.workArea) }) : ''}`,
    );
    setText('pf-state', `${STATE_LABEL()[a.state]} · ${floorName(a.floor)} ${t('area.' + a.area)}`);
    setText('pf-intention', `💭 ${a.intention || t('pf.thought.empty')}`);
    setText('pf-bio', d.bio);
    setText('pf-ai', aiLabel(d.id));
  };

  const paintPersona = (a: Agent) => {
    const el = document.getElementById('pf-persona');
    if (!el) return;
    const labels = PERSONA_LABEL();
    el.innerHTML = (Object.keys(labels) as (keyof BigFive)[])
      .map((k) => barRow(labels[k], a.def.personality[k] * 100, a.def.personality[k].toFixed(2), 'linear-gradient(90deg,#7ad0c8,#a78bfa)'))
      .join('');
  };

  const paintNeeds = (a: Agent) => {
    const el = document.getElementById('pf-needs');
    if (!el) return;
    const labels = NEED_LABEL();
    el.innerHTML = (Object.keys(labels) as (keyof Needs)[])
      .map((k) => {
        const v = a.needs[k];
        return barRow(labels[k], v, String(Math.round(v)), needColor(v));
      })
      .join('');
  };

  const paintRel = (a: Agent) => {
    const el = document.getElementById('pf-rel');
    if (!el) return;
    const labels = REL_LABEL();
    el.innerHTML = Object.entries(a.relationships)
      .sort((x, y) => y[1].affinity - x[1].affinity)
      .map(([oid, r]) => {
        const o = sim.getAgent(oid)?.def;
        const sign = r.affinity > 0 ? '+' : '';
        return `<div class="rel-item"><span>${esc(o?.name ?? oid)} <span style="color:#8b8098">${sign}${Math.round(r.affinity)}</span></span><span class="rt ${r.type}">${labels[r.type]}</span></div>`;
      })
      .join('');
  };

  const paintMem = (a: Agent) => {
    const el = document.getElementById('pf-mem');
    if (!el) return;
    el.innerHTML = a.memory.length
      ? a.memory
          .slice()
          .reverse()
          .map(
            (m) =>
              `<div class="mem-item">${esc(m.text)}${m.delta !== undefined ? ` <span style="color:${m.delta >= 0 ? '#8fe0a0' : '#ff8b7a'}">(${m.delta >= 0 ? '+' : ''}${m.delta})</span>` : ''}</div>`,
          )
          .join('')
      : `<p class="hint">${t('pf.mem.empty')}</p>`;
  };

  const paintThought = (a: Agent) => {
    const txt = document.getElementById('pf-thought-text');
    const tag = document.getElementById('pf-thought-tag');
    if (txt) txt.textContent = a.thought || t('pf.thought.empty');
    if (tag) {
      tag.textContent = a.thoughtAuto ? t('pf.thought.auto') : t('pf.thought.manual');
      tag.className = `pt-tag ${a.thoughtAuto ? 'auto' : 'manual'}`;
    }
  };

  /** 住客管理：留客 / 驱逐。按角色类别给出可用的操作，并显示当班的经办员工。 */
  const paintActions = (a: Agent) => {
    const el = document.getElementById('pf-actions');
    if (!el) return;
    const parts: string[] = [];
    if (a.kind === 'guest') {
      const guard = sim.staffOnDuty('security');
      parts.push(`<button class="btn tiny" data-act="keep">${t('pf.keep')}</button>`);
      parts.push(`<button class="btn tiny danger" data-act="evict-guest">${t('pf.evict.guest')}</button>`);
      parts.push(`<span class="hint">${guard ? t('pf.guard.on', { name: guard.def.name }) : t('pf.guard.off')}</span>`);
    } else if (a.kind === 'resident' && !a.def.isStaff) {
      const mgr = sim.staffOnDuty('manager');
      parts.push(`<button class="btn tiny danger" data-act="evict-resident">${t('pf.evict.resident')}</button>`);
      parts.push(`<span class="hint">${mgr ? t('pf.manager.on', { name: mgr.def.name }) : t('pf.manager.off')}</span>`);
    } else {
      parts.push(`<span class="hint">${t('pf.staff.note')}</span>`);
    }
    el.innerHTML = `<div class="section-title">${t('pf.manage')}</div><div class="act-row">${parts.join('')}</div>`;
    el.querySelectorAll<HTMLButtonElement>('button[data-act]').forEach((b) => {
      b.addEventListener('click', () => {
        const id = currentId;
        if (!id) return;
        const act = b.dataset.act;
        if (act === 'keep') sim.keepGuest(id);
        else if (act === 'evict-guest') sim.evictGuest(id);
        else if (act === 'evict-resident') sim.evictResident(id);
        paintChips();
        if (sim.getAgent(id)) paint();
        else renderSelection();
      });
    });
  };

  function paint(): void {
    if (!currentId) return;
    const a = sim.getAgent(currentId);
    if (!a) return;
    const av = profileBody.querySelector<HTMLImageElement>('.p-avatar');
    if (av) av.src = cachedAvatar(a.def);
    paintHead(a);
    paintActions(a);
    paintThought(a);
    paintPersona(a);
    paintNeeds(a);
    paintRel(a);
    paintMem(a);
  }

  const keyOptions = (agentId: string): string => {
    const cur = getAssign(agentId);
    const keys = getKeys();
    const def = getDefaultKeyId();
    const defLabel = def ? keys.find((k) => k.id === def)?.label ?? '' : '';
    let html = `<option value="" ${!cur ? 'selected' : ''}>${t('keys.followDefault', {
      detail: def ? `（${esc(defLabel)}）` : t('keys.followDefault.none'),
    })}</option>`;
    html += `<option value="${LOCAL_ONLY}" ${cur === LOCAL_ONLY ? 'selected' : ''}>${t('keys.forceLocal')}</option>`;
    html += keys.map((k) => `<option value="${k.id}" ${cur === k.id ? 'selected' : ''}>${esc(k.label)} · ${esc(k.model)}</option>`).join('');
    return html;
  };

  const buildForm = (a: Agent): string => {
    const d = a.def;
    const personaLabels = PERSONA_LABEL();
    return `
      <div class="form-row"><label>${t('form.name')}</label><input data-f="name" value="${esc(d.name)}"></div>
      <div class="form-row"><label>${t('form.gender')}</label><select data-f="gender">${GENDERS.map((g) => `<option value="${g}" ${d.gender === g ? 'selected' : ''}>${t('gender.' + g)}</option>`).join('')}</select></div>
      <div class="form-row"><label>${t('form.age')}</label><input type="number" min="1" max="120" data-f="age" value="${d.age}"></div>
      <div class="form-row"><label>${t('form.role')}</label><input data-f="role" value="${esc(d.role)}"></div>
      <div class="form-row"><label>${t('form.room')}</label><input data-f="room" value="${esc(d.room)}"></div>
      <div class="form-row col"><label>${t('form.bio')}</label><textarea data-f="bio" rows="4">${esc(d.bio)}</textarea></div>
      <div class="form-row col"><label>${t('form.voice')}</label><textarea data-f="voice" rows="2">${esc(d.voice)}</textarea></div>
      <div class="form-row col"><label>${t('form.traits')}</label><input data-f="traits" value="${esc(d.traits.join('、'))}" placeholder="${t('form.traits.placeholder')}"></div>
      <div class="section-title">${t('pf.section.face')}</div>
      <div class="swatch-grid">
        ${SWATCH().map((s) => `<label class="swatch"><span>${s.label}</span><input type="color" data-sw="${s.key}" value="${toHex(d.palette[s.key])}"></label>`).join('')}
      </div>
      <div class="form-row"><label>${t('form.hairstyle')}</label><select data-hair>${HAIR_STYLES().map((h) => `<option value="${h.id}" ${(d.palette.hairstyle ?? 'short') === h.id ? 'selected' : ''}>${h.label}</option>`).join('')}</select></div>
      <div class="form-row"><button class="btn tiny" id="pf-random">${t('pf.random.face')}</button></div>
      <div class="section-title">${t('pf.section.strength')}</div>
      ${(Object.keys(personaLabels) as (keyof BigFive)[])
        .map(
          (k) =>
            `<div class="slider-row"><span>${personaLabels[k]}</span><input type="range" min="0" max="1" step="0.01" data-p="${k}" value="${a.def.personality[k]}"><b data-pv="${k}">${a.def.personality[k].toFixed(2)}</b></div>`,
        )
        .join('')}
      <div class="section-title">${t('pf.section.warmth')}</div>
      <div class="slider-row"><span>${t('pf.warmth')}</span><input type="range" min="-20" max="20" step="1" data-w="warmth" value="${d.warmth}"><b data-wv>${d.warmth}</b></div>
      ${IS_PAGES ? '' : `
        <div class="section-title">${t('pf.section.ai')}</div>
        <div class="form-row col"><select data-key>${keyOptions(d.id)}</select></div>
      `}
      <p class="hint">${t(IS_PAGES ? 'pf.form.hint.local' : 'pf.form.hint')}</p>
    `;
  };

  const bindForm = () => {
    const form = $('pf-form');
    form.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>('[data-f]').forEach((el) => {
      const field = el.dataset.f as string;
      const handler = () => {
        if (!currentId) return;
        const val = el.value;
        const patch: Partial<CharacterDef> = {};
        if (field === 'age') patch.age = clampInt(val, 1, 120);
        else if (field === 'traits') patch.traits = val.split(/[、,，]/).map((s) => s.trim()).filter(Boolean);
        else if (field === 'gender') patch.gender = val as Gender;
        else (patch as Record<string, unknown>)[field] = val;
        sim.updateDef(currentId, patch);
        paint();
      };
      el.addEventListener(el.tagName === 'SELECT' ? 'change' : 'input', handler);
    });

    // 捏脸：改色 / 换发型。改完使头像缓存失效，画面与头像同步刷新。
    const applyPalette = (patch: Partial<SpritePalette>) => {
      if (!currentId) return;
      const a = sim.getAgent(currentId);
      if (!a) return;
      sim.updateDef(currentId, { palette: { ...a.def.palette, ...patch } });
      delete avatarCache[currentId];
      paint();
    };

    form.querySelectorAll<HTMLInputElement>('[data-sw]').forEach((el) => {
      el.addEventListener('input', () => applyPalette({ [el.dataset.sw as string]: fromHex(el.value) } as Partial<SpritePalette>));
    });
    form.querySelector<HTMLSelectElement>('[data-hair]')?.addEventListener('change', (e) => {
      applyPalette({ hairstyle: (e.target as HTMLSelectElement).value as HairStyle });
    });
    form.querySelector<HTMLButtonElement>('#pf-random')?.addEventListener('click', () => {
      if (!currentId) return;
      sim.updateDef(currentId, { palette: randomPalette() });
      delete avatarCache[currentId];
      const a = sim.getAgent(currentId);
      if (a) {
        form.innerHTML = buildForm(a);
        bindForm();
      }
      paint();
    });

    form.querySelectorAll<HTMLInputElement>('[data-p]').forEach((el) => {
      el.addEventListener('input', () => {
        if (!currentId) return;
        const k = el.dataset.p as keyof BigFive;
        const a = sim.getAgent(currentId);
        if (!a) return;
        const v = parseFloat(el.value);
        sim.updateDef(currentId, { personality: { ...a.def.personality, [k]: v } });
        const out = form.querySelector(`[data-pv="${k}"]`);
        if (out) out.textContent = v.toFixed(2);
        paint();
      });
    });

    form.querySelectorAll<HTMLInputElement>('[data-w]').forEach((el) => {
      el.addEventListener('input', () => {
        if (!currentId) return;
        const v = parseInt(el.value, 10);
        sim.updateDef(currentId, { warmth: v });
        const out = form.querySelector('[data-wv]');
        if (out) out.textContent = String(v);
      });
    });

    if (!IS_PAGES) {
      form.querySelector<HTMLSelectElement>('[data-key]')?.addEventListener('change', (e) => {
        if (!currentId) return;
        assignKey(currentId, (e.target as HTMLSelectElement).value);
        paint();
      });
    }
  };

  const toggleEdit = () => {
    if (!currentId) return;
    editing = !editing;
    const form = $('pf-form');
    form.hidden = !editing;
    (document.getElementById('pf-edit') as HTMLButtonElement).textContent = editing ? t('pf.done') : t('pf.edit');
    const bio = document.getElementById('pf-bio');
    if (bio) bio.style.display = editing ? 'none' : '';
    if (editing) {
      const a = sim.getAgent(currentId);
      if (a) {
        form.innerHTML = buildForm(a);
        bindForm();
      }
    }
  };

  const mountProfile = (id: string) => {
    currentId = id;
    editing = false;
    profileBody.innerHTML = `
      <div class="p-head">
        <img class="p-avatar" src="${(() => { const d = sim.getAgent(id)?.def; return d ? cachedAvatar(d) : ''; })()}" alt="">
        <div class="p-head-main">
          <div class="p-name" id="pf-name"></div>
          <div class="p-meta" id="pf-meta"></div>
          <div class="p-meta" id="pf-room"></div>
          <div class="p-state" id="pf-state"></div>
        </div>
        <button class="btn tiny" id="pf-edit">${t('pf.edit')}</button>
      </div>
      <div class="p-intention" id="pf-intention"></div>
      <div class="p-thought" id="pf-thought">
        <div class="pt-head">
          <span class="pt-label">${t('pf.thought.label')}</span>
          <span class="pt-tag" id="pf-thought-tag"></span>
        </div>
        <div class="pt-text" id="pf-thought-text"></div>
        <div class="pt-edit">
          <input id="pf-thought-input" maxlength="80" placeholder="${t('pf.thought.placeholder')}">
          <button class="btn tiny" id="pf-thought-apply">${t('pf.thought.apply')}</button>
          <button class="btn tiny" id="pf-thought-auto">${t('pf.thought.restore')}</button>
        </div>
      </div>
      <div class="p-actions" id="pf-actions"></div>
      <div class="p-ai" id="pf-ai"></div>
      <div class="p-form" id="pf-form" hidden></div>
      <p class="p-bio" id="pf-bio"></p>
      <div class="section-title">${t('pf.section.persona')}</div>
      <div id="pf-persona"></div>
      <div class="section-title">${t('pf.section.needs')}</div>
      <div id="pf-needs"></div>
      <div class="section-title">${t('pf.section.rel')}</div>
      <div id="pf-rel"></div>
      <div class="section-title">${t('pf.section.mem')}</div>
      <div id="pf-mem"></div>
    `;
    document.getElementById('pf-edit')?.addEventListener('click', toggleEdit);

    const tInput = document.getElementById('pf-thought-input') as HTMLInputElement | null;
    const cur = sim.getAgent(id);
    if (tInput && cur) tInput.value = cur.thoughtAuto ? '' : cur.thought;
    const applyThought = () => {
      if (!currentId || !tInput) return;
      sim.setThought(currentId, tInput.value);
    };
    document.getElementById('pf-thought-apply')?.addEventListener('click', applyThought);
    tInput?.addEventListener('keydown', (e) => {
      if ((e as KeyboardEvent).key === 'Enter') applyThought();
    });
    document.getElementById('pf-thought-auto')?.addEventListener('click', () => {
      if (!currentId) return;
      if (tInput) tInput.value = '';
      sim.clearThought(currentId);
    });
    paint();
  };

  const renderSelection = () => {
    document.querySelectorAll('.char-chip').forEach((el) => {
      el.classList.toggle('selected', (el as HTMLElement).dataset.id === sim.selectedId);
    });
    const id = sim.selectedId;
    if (!id) {
      currentId = null;
      profileBody.innerHTML = `<p class="hint">${t('profile.empty')}</p>`;
      return;
    }
    if (id !== currentId) mountProfile(id);
    else paint();
  };

  sim.on('select', () => renderSelection());
  sim.on('tick', () => {
    const now = performance.now();
    if (now - profileThrottle > 500) {
      profileThrottle = now;
      paint();
      paintChips();
    }
  });
  renderSelection();

  /* ---------------- 弹窗 ---------------- */
  const modalRoot = $('modal-root');
  let liveDraw: (() => void) | null = null;
  let graphThrottle = 0;

  const closeModal = () => {
    modalRoot.classList.remove('open');
    modalRoot.innerHTML = '';
    liveDraw = null;
  };

  const openModal = (html: string) => {
    modalRoot.innerHTML = `<div class="modal">${html}</div>`;
    modalRoot.classList.add('open');
    liveDraw = null;
    modalRoot.querySelector('.close')?.addEventListener('click', closeModal);
  };

  /* ---------------- 开场欢迎介绍 ---------------- */
  const openWelcomeModal = () => {
    openModal(`
      <button class="btn tiny close">${t('close')}</button>
      <h2>${t('welcome.title')}</h2>
      <div class="sub">${t('welcome.sub')}</div>
      <div style="line-height:1.8;font-size:13.5px;color:#d9cfbe">
        <p>${t('welcome.p1')}</p>
        <p>${t('welcome.can')}</p>
        <ul style="margin:6px 0 0 18px;padding:0">
          <li>${t('welcome.item1')}</li>
          <li>${t('welcome.item2')}</li>
          <li>${t('welcome.item3')}</li>
          <li>${t('welcome.item4')}</li>
          <li>${t('welcome.item5')}</li>
        </ul>
        <p style="margin-top:10px">${t('welcome.p2')}</p>
      </div>
      <div style="margin-top:16px;display:flex;justify-content:flex-end">
        <button class="btn active" id="welcome-enter">${t('enter')}</button>
      </div>
    `);
    const btn = document.getElementById('welcome-enter');
    if (btn) btn.addEventListener('click', closeModal);
  };

  modalRoot.addEventListener('click', (e) => {
    if (e.target === modalRoot) closeModal();
  });
  // 对话卡片：点标题展开/收起台词
  modalRoot.addEventListener('click', (e) => {
    const head = (e.target as HTMLElement).closest('.talk-head');
    if (head) (head.parentElement as HTMLElement | null)?.classList.toggle('open');
  });
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
  });

  /* 关系网 */
  $('btn-graph').addEventListener('click', () => {
    openModal(`
      <button class="btn tiny close">${t('close')}</button>
      <h2>${t('graph.title')}</h2>
      <div class="sub">${t('graph.sub')}</div>
      <canvas id="graph-canvas" width="600" height="430" style="width:100%;max-width:600px"></canvas>
    `);
    liveDraw = drawGraph;
    liveDraw();
  });

  const drawGraph = () => {
    const canvas = document.getElementById('graph-canvas') as HTMLCanvasElement | null;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const W = canvas.width;
    const H = canvas.height;
    ctx.clearRect(0, 0, W, H);
    const cx = W / 2;
    const cy = H / 2;
    const R = Math.min(W, H) / 2 - 70;
    const list = sim.agents;
    const nodes = list.map((ag, i) => {
      const ang = (Math.PI * 2 * i) / Math.max(1, list.length) - Math.PI / 2;
      return { id: ag.def.id, name: ag.def.name, color: ag.def.palette.top, x: cx + Math.cos(ang) * R, y: cy + Math.sin(ang) * R };
    });

    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = sim.getAgent(nodes[i].id);
        if (!a) continue;
        const rel = a.relationships[nodes[j].id];
        if (!rel || rel.interactions === 0) continue;
        const aff = rel.affinity;
        const col = aff >= 0 ? `rgba(111,208,138,${0.25 + Math.min(aff, 80) / 140})` : `rgba(224,87,95,${0.25 + Math.min(-aff, 80) / 140})`;
        ctx.strokeStyle = col;
        ctx.lineWidth = 1.5 + Math.min(Math.abs(aff) / 12, 6);
        ctx.beginPath();
        ctx.moveTo(nodes[i].x, nodes[i].y);
        ctx.lineTo(nodes[j].x, nodes[j].y);
        ctx.stroke();
      }
    }

    for (const n of nodes) {
      ctx.beginPath();
      ctx.arc(n.x, n.y, 26, 0, Math.PI * 2);
      ctx.fillStyle = `#${n.color.toString(16).padStart(6, '0')}`;
      ctx.fill();
      ctx.lineWidth = 3;
      ctx.strokeStyle = sim.selectedId === n.id ? '#e0a54a' : 'rgba(255,255,255,0.25)';
      ctx.stroke();
      ctx.fillStyle = '#efe6d8';
      ctx.font = '13px "PingFang SC",sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(n.name, n.x, n.y + 44);
    }
  };

  /* 导演事件 */
  $('btn-events').addEventListener('click', () => {
    openModal(`
      <button class="btn tiny close">${t('close')}</button>
      <h2>${t('events.title')}</h2>
      <div class="sub">${t('events.sub')}</div>
      <div class="event-grid">
        ${DIRECTOR_EVENTS.map(
          (e) => `<button class="event-card" data-event="${e.id}"><b>${e.icon} ${esc(t('evt.' + e.id + '.name'))}</b><p>${esc(t('evt.' + e.id + '.desc'))}</p></button>`,
        ).join('')}
      </div>
      <div class="evt-editor">
        <label for="evt-desc">${t('events.editor.label')}</label>
        <div class="sub">${t('events.editor.sub')}</div>
        <textarea id="evt-desc" rows="2" placeholder="${t('events.editor.placeholder')}"></textarea>
        <div class="evt-actions">
          <button class="btn" id="evt-run">${t('events.run')}</button>
          <span class="hint" id="evt-hint"></span>
        </div>
      </div>
    `);
    modalRoot.querySelectorAll<HTMLButtonElement>('.event-card').forEach((b) => {
      b.addEventListener('click', () => {
        sim.directorEvent(b.dataset.event as string);
        closeModal();
      });
    });
    const evtTa = modalRoot.querySelector<HTMLTextAreaElement>('#evt-desc');
    const evtHint = modalRoot.querySelector<HTMLElement>('#evt-hint');
    const runEvent = () => {
      const text = evtTa?.value ?? '';
      if (!text.trim()) {
        if (evtHint) evtHint.textContent = t('events.empty');
        return;
      }
      const res = sim.pushWorldEvent(text);
      if (evtHint) {
        evtHint.textContent = res
          ? res.matched
            ? t('events.matched', { name: t('evt.' + res.id + '.name') })
            : t('events.unmatched')
          : '';
      }
      if (evtTa) evtTa.value = '';
    };
    modalRoot.querySelector<HTMLButtonElement>('#evt-run')?.addEventListener('click', runEvent);
    evtTa?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) runEvent();
    });
  });

  /* ---------------- 对话存档 ---------------- */
  const talkLabel = (id: string): string => nameOf(id);
  const renderedTalks = new Set<number>();

  const talkItemHtml = (c: ConversationRecord): string => {
    const where = t('area.' + c.area);
    const sign = c.delta >= 0 ? '+' : '';
    const cls = c.delta >= 0 ? 'up' : 'down';
    const lines = c.lines
      .map((l) => `<div class="talk-line"><b>${esc(talkLabel(l.speaker))}</b><span>${esc(l.text)}</span></div>`)
      .join('');
    return `
      <div class="talk-item">
        <div class="talk-head">
          <span class="talk-when">${fmtClock(c.t)}</span>
          <span class="talk-who">${esc(talkLabel(c.a))} × ${esc(talkLabel(c.b))}</span>
          <span class="talk-where">${esc(where)}</span>
          <span class="talk-tag">「${esc(c.topic)}」</span>
          <span class="talk-delta ${cls}">${sign}${c.delta}</span>
        </div>
        <div class="talk-body">
          <div class="talk-note">${esc(c.note)}</div>
          ${lines}
        </div>
      </div>`;
  };

  const refreshTalk = () => {
    const box = document.getElementById('talk-list');
    if (!box) return;
    if (sim.transcripts.length === 0) {
      if (!box.querySelector('.hint')) box.innerHTML = `<p class="hint">${t('talk.empty')}</p>`;
      return;
    }
    box.querySelector('.hint')?.remove();
    for (const c of sim.transcripts) {
      if (renderedTalks.has(c.id)) continue;
      renderedTalks.add(c.id);
      box.insertAdjacentHTML('afterbegin', talkItemHtml(c));
    }
  };

  $('btn-talk').addEventListener('click', () => {
    openModal(`
      <button class="btn tiny close">${t('close')}</button>
      <h2>${t('talk.title')}</h2>
      <div class="sub">${t('talk.sub')}</div>
      <div class="talk-list" id="talk-list"></div>
    `);
    renderedTalks.clear();
    refreshTalk();
    liveDraw = refreshTalk;
  });

  /* ---------------- 全部日志 ---------------- */
  let logFilterAgent: string | null = null;
  let logIncludeMinor = true;
  let lastLogCount = -1;

  const logItemHtml = (e: LogEntry): string => {
    const names = (e.agents ?? []).map((id) => nameOf(id)).join('、');
    return `<li class="k-${e.kind}${e.minor ? ' minor' : ''}">
      <div class="fl-meta"><span class="lt">${fmtClock(e.t)}</span>${names ? `<span class="fl-who">${esc(names)}</span>` : ''}<span class="fl-kind">${KIND_LABEL()[e.kind] ?? e.kind}</span></div>
      <div class="fl-text">${esc(e.text)}</div>
    </li>`;
  };

  const paintLogs = () => {
    const box = document.getElementById('full-log-list');
    if (!box) return;
    const list = sim.logs.filter((e) => {
      if (logFilterAgent && !(e.agents ?? []).includes(logFilterAgent)) return false;
      if (!logIncludeMinor && e.minor) return false;
      return true;
    });
    box.innerHTML = list.length
      ? list
          .slice()
          .reverse()
          .map(logItemHtml)
          .join('')
      : `<p class="hint">${t('logs.empty')}</p>`;
    lastLogCount = sim.logs.length;
  };

  const refreshLogs = () => {
    if (!document.getElementById('full-log-list')) return;
    if (sim.logs.length !== lastLogCount) paintLogs();
  };

  $('btn-logs').addEventListener('click', () => {
    logFilterAgent = null;
    logIncludeMinor = true;
    lastLogCount = -1;
    openModal(`
      <button class="btn tiny close">${t('close')}</button>
      <h2>${t('logs.title')}</h2>
      <div class="sub">${t('logs.sub')}</div>
      <div class="log-filter" id="log-filter">
        <button class="lf-chip active" data-af="">${t('logs.all')}</button>
        ${sim.agents.map((a) => `<button class="lf-chip" data-af="${a.def.id}">${esc(a.def.name)}</button>`).join('')}
        <label class="lf-toggle"><input type="checkbox" id="lf-minor" checked> ${t('logs.minor')}</label>
      </div>
      <ul class="full-log-list" id="full-log-list"></ul>
    `);
    modalRoot.querySelectorAll<HTMLButtonElement>('.lf-chip').forEach((b) =>
      b.addEventListener('click', () => {
        logFilterAgent = (b.dataset.af as string) || null;
        modalRoot.querySelectorAll('.lf-chip').forEach((x) => x.classList.remove('active'));
        b.classList.add('active');
        paintLogs();
      }),
    );
    document.getElementById('lf-minor')?.addEventListener('change', (e) => {
      logIncludeMinor = (e.target as HTMLInputElement).checked;
      paintLogs();
    });
    paintLogs();
    liveDraw = refreshLogs;
  });

  /* ---------------- AI 接口（批量接入 + 按住客分配） ---------------- */
  function renderKeyManager() {
    const keys = getKeys();
    const def = getDefaultKeyId();
    const rows = keys.length
      ? keys
          .map(
            (k) => `
        <div class="key-item">
          <div class="key-main"><b>${esc(k.label)}</b><span class="key-code">${esc(maskKey(k.apiKey))}</span></div>
          <div class="key-sub">${esc(k.model)} · ${esc(k.baseUrl)}</div>
          <div class="key-actions">
            <span class="key-status" data-st="${k.id}"></span>
            <button class="btn tiny" data-test="${k.id}">${t('keys.test')}</button>
            <button class="btn tiny" data-del="${k.id}">${t('keys.delete')}</button>
          </div>
        </div>`,
          )
          .join('')
      : `<p class="hint">${t('keys.emptyList')}</p>`;

    const assignRows = sim.agents
      .map(
        (a) => `
      <div class="form-row"><label>${esc(a.def.name)}</label><select data-agent="${a.def.id}">${keyOptions(a.def.id)}</select></div>`,
      )
      .join('');

    return `
      <button class="btn tiny close">${t('close')}</button>
      <h2>${t('keys.title')}</h2>
      <div class="sub">${t('keys.sub')}</div>
      <div class="form-row"><label>${t('keys.base')}</label><input id="k-base" value="${esc(defaultBaseUrl())}"></div>
      <div class="form-row"><label>${t('keys.model')}</label><input id="k-model" value="${esc(defaultModel())}"></div>
      <div class="form-row col"><label>${t('keys.batch')}</label><textarea id="k-batch" rows="4" placeholder="${esc(t('keys.batch.placeholder'))}"></textarea></div>
      <div class="key-add-row"><button class="btn" id="k-add">${t('keys.add')}</button><span class="hint" id="k-msg"></span></div>
      <div class="section-title">${t('keys.connected', { n: keys.length })}</div>
      <div class="key-list">${rows}</div>
      <div class="form-row"><label>${t('keys.default')}</label><select id="k-default">
        <option value="" ${!def ? 'selected' : ''}>${t('keys.default.none')}</option>
        ${keys.map((k) => `<option value="${k.id}" ${def === k.id ? 'selected' : ''}>${esc(k.label)}</option>`).join('')}
      </select></div>
      <div class="section-title">${t('keys.assign')}</div>
      ${assignRows}
    `;
  }

  function openKeyManager() {
    const build = () => {
      openModal(renderKeyManager());

      $('k-add').addEventListener('click', () => {
        const base = ($('k-base') as HTMLInputElement).value.trim();
        const model = ($('k-model') as HTMLInputElement).value.trim();
        const batch = ($('k-batch') as HTMLTextAreaElement).value;
        const inputs = parseKeyLines(batch).map((it) => ({ ...it, baseUrl: it.baseUrl || base, model: it.model || model }));
        const added = addKeys(inputs);
        build();
        const msg = document.getElementById('k-msg');
        if (msg) msg.textContent = added > 0 ? t('keys.added', { n: added }) : batch.trim() ? t('keys.noNew') : t('keys.empty');
      });

      modalRoot.querySelectorAll<HTMLButtonElement>('[data-del]').forEach((b) =>
        b.addEventListener('click', () => {
          removeKey(b.dataset.del as string);
          build();
        }),
      );

      modalRoot.querySelectorAll<HTMLButtonElement>('[data-test]').forEach((b) =>
        b.addEventListener('click', async () => {
          const id = b.dataset.test as string;
          const k = getKeys().find((x) => x.id === id);
          if (!k) return;
          const st = modalRoot.querySelector<HTMLElement>(`[data-st="${id}"]`);
          if (st) {
            st.textContent = t('keys.testing');
            st.className = 'key-status';
          }
          const r = await testKey({ baseUrl: k.baseUrl, apiKey: k.apiKey, model: k.model });
          if (st) {
            st.textContent = r.ok ? t('keys.test.ok', { n: r.models ? `（${r.models}）` : '' }) : t('keys.test.fail', { err: r.error ?? '失败' });
            st.className = `key-status ${r.ok ? 'ok' : 'bad'}`;
          }
        }),
      );

      document.getElementById('k-default')?.addEventListener('change', (e) => {
        setDefaultKey((e.target as HTMLSelectElement).value || null);
        build();
      });

      modalRoot.querySelectorAll<HTMLSelectElement>('[data-agent]').forEach((sel) =>
        sel.addEventListener('change', () => assignKey(sel.dataset.agent as string, sel.value)),
      );
    };
    build();
  }

  if (IS_PAGES) {
    $('btn-keys').remove();
  } else {
    $('btn-keys').addEventListener('click', () => openKeyManager());
  }

  /* coach：定制客人 */
  let coach: CoachInput = coachDraft();
  let coachMsg = '';
  let coachThrottle = 0;
  const coachOpen = (): boolean => !!document.getElementById('coach-list');

  const coachForm = (): string => {
    const personaLabels = PERSONA_LABEL();
    return `
    <div class="coach-grid">
      <div class="coach-col">
        <div class="coach-preview"><img id="coach-avatar" src="${makeCharacterDataURL(coach.palette)}" alt=""><span class="hint">${t('coach.preview')}</span></div>
        <div class="swatch-grid">
          ${SWATCH().map((s) => `<label class="swatch"><span>${s.label}</span><input type="color" data-csw="${s.key}" value="${toHex(coach.palette[s.key])}"></label>`).join('')}
        </div>
        <div class="form-row"><label>${t('form.hairstyle')}</label><select data-chair>${HAIR_STYLES().map((h) => `<option value="${h.id}" ${(coach.palette.hairstyle ?? 'short') === h.id ? 'selected' : ''}>${h.label}</option>`).join('')}</select></div>
        <div class="form-row"><button class="btn tiny" id="coach-random">${t('pf.random.face')}</button></div>
        <div class="form-row"><label>${t('form.name')}</label><input data-cf="name" value="${esc(coach.name)}"></div>
        <div class="form-row"><label>${t('form.gender')}</label><select data-cf="gender">${GENDERS.map((g) => `<option value="${g}" ${coach.gender === g ? 'selected' : ''}>${t('gender.' + g)}</option>`).join('')}</select></div>
        <div class="form-row"><label>${t('form.age')}</label><input type="number" min="1" max="120" data-cf="age" value="${coach.age}"></div>
        <div class="form-row"><label>${t('form.role')}</label><input data-cf="role" value="${esc(coach.role)}"></div>
        <div class="form-row col"><label>${t('form.bio')}</label><textarea rows="3" data-cf="bio">${esc(coach.bio)}</textarea></div>
        <div class="form-row col"><label>${t('form.voice')}</label><textarea rows="2" data-cf="voice">${esc(coach.voice)}</textarea></div>
        <div class="form-row col"><label>${t('form.traits')}</label><input data-cf="traits" value="${esc(coach.traits.join('、'))}" placeholder="${t('form.traits.placeholder')}"></div>
        <div class="section-title">${t('pf.section.strength')}</div>
        ${(Object.keys(personaLabels) as (keyof BigFive)[])
          .map(
            (k) =>
              `<div class="slider-row"><span>${personaLabels[k]}</span><input type="range" min="0" max="1" step="0.01" data-cp="${k}" value="${coach.personality[k]}"><b data-cpv="${k}">${coach.personality[k].toFixed(2)}</b></div>`,
          )
          .join('')}
        <div class="form-row col"><button class="btn" id="coach-add">${t('coach.add')}</button><span class="hint" id="coach-msg">${esc(coachMsg)}</span></div>
      </div>
      <div class="coach-col">
        <div class="section-title">${t('coach.waiting', { n: '<span id="coach-count">0</span>', rooms: '<span id="coach-rooms">0</span>' })}</div>
        <div class="coach-list" id="coach-list"></div>
        <div class="coach-actions">
          <button class="btn" id="coach-confirm">${t('coach.confirm')}</button>
          <button class="btn tiny" id="coach-clear">${t('coach.clear')}</button>
        </div>
        <p class="hint" id="coach-status"></p>
      </div>
    </div>
  `;
  };

  const refreshCoach = (): void => {
    const list = document.getElementById('coach-list');
    if (!list) return;
    const rooms = sim.coachFreeRooms();
    const items = sim.coachList;
    setText('coach-count', String(items.length));
    setText('coach-rooms', String(rooms));
    list.innerHTML = items.length
      ? items
          .map(
            (d, i) =>
              `<div class="coach-item"><img src="${avatarFor(d)}" alt=""><div class="ci-main"><b>${esc(d.name)}</b><span class="hint">${esc(d.role)} · ${d.age}${t('coach.age')}</span></div><button class="btn tiny danger" data-crm="${i}">${t('coach.remove')}</button></div>`,
          )
          .join('')
      : `<p class="hint">${t('coach.listEmpty')}</p>`;
    list.querySelectorAll<HTMLButtonElement>('[data-crm]').forEach((b) =>
      b.addEventListener('click', () => sim.coachRemove(Number(b.dataset.crm))),
    );
    const trip = sim.coachTrip;
    const status = document.getElementById('coach-status');
    if (status) {
      if (trip) {
        const driver = sim.getAgent(trip.driverId);
        const phaseText =
          trip.phase === 'out' ? t('coach.phase.out') : trip.phase === 'away' ? t('coach.phase.away') : t('coach.phase.back');
        status.textContent = t('coach.trip', { name: driver ? ` ${driver.def.name}` : '', phase: phaseText });
      } else {
        status.textContent = rooms <= 0 ? t('coach.roomsFull') : t('coach.roomsAvail', { n: rooms });
      }
    }
    const confirmBtn = document.getElementById('coach-confirm') as HTMLButtonElement | null;
    if (confirmBtn) confirmBtn.disabled = !!trip || !items.length;
  };

  const bindCoach = (): void => {
    modalRoot.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>('[data-cf]').forEach((el) => {
      const field = el.dataset.cf as string;
      el.addEventListener(el.tagName === 'SELECT' ? 'change' : 'input', () => {
        const v = el.value;
        if (field === 'age') coach.age = clampInt(v, 1, 120);
        else if (field === 'gender') coach.gender = v as Gender;
        else if (field === 'traits') coach.traits = v.split(/[、,，]/).map((s) => s.trim()).filter(Boolean);
        else (coach as unknown as Record<string, unknown>)[field] = v;
      });
    });
    const refreshPreview = () => {
      const img = document.getElementById('coach-avatar') as HTMLImageElement | null;
      if (img) img.src = makeCharacterDataURL(coach.palette);
    };
    modalRoot.querySelectorAll<HTMLInputElement>('[data-csw]').forEach((el) => {
      el.addEventListener('input', () => {
        coach.palette = { ...coach.palette, [el.dataset.csw as string]: fromHex(el.value) };
        refreshPreview();
      });
    });
    modalRoot.querySelector<HTMLSelectElement>('[data-chair]')?.addEventListener('change', (e) => {
      coach.palette = { ...coach.palette, hairstyle: (e.target as HTMLSelectElement).value as HairStyle };
      refreshPreview();
    });
    document.getElementById('coach-random')?.addEventListener('click', () => {
      coach.palette = randomPalette();
      openCoachModal();
    });
    modalRoot.querySelectorAll<HTMLInputElement>('[data-cp]').forEach((el) => {
      el.addEventListener('input', () => {
        const k = el.dataset.cp as keyof BigFive;
        const v = parseFloat(el.value);
        coach.personality = { ...coach.personality, [k]: v };
        const out = modalRoot.querySelector(`[data-cpv="${k}"]`);
        if (out) out.textContent = v.toFixed(2);
      });
    });
    document.getElementById('coach-add')?.addEventListener('click', () => {
      const def = makeCoachGuest(coach);
      coachMsg = sim.coachEnqueue(def) ? t('coach.added', { name: def.name }) : t('coach.full');
      setText('coach-msg', coachMsg);
      refreshCoach();
    });
    document.getElementById('coach-clear')?.addEventListener('click', () => sim.coachClear());
    document.getElementById('coach-confirm')?.addEventListener('click', () => {
      coachMsg = sim.coachConfirm() ? t('coach.confirmed') : sim.coachTrip ? t('coach.busy') : t('coach.emptyList');
      setText('coach-msg', coachMsg);
      refreshCoach();
    });
  };

  function openCoachModal(): void {
    openModal(`
      <button class="btn tiny close">${t('close')}</button>
      <h2>${t('coach.title')}</h2>
      <div class="sub">${t('coach.sub')}</div>
      ${coachForm()}
    `);
    bindCoach();
    refreshCoach();
  }

  $('btn-coach').addEventListener('click', () => openCoachModal());
  sim.on('coach-update', () => {
    if (coachOpen()) refreshCoach();
  });
  sim.on('tick', () => {
    if (!coachOpen()) return;
    const now = performance.now();
    if (now - coachThrottle < 800) return;
    coachThrottle = now;
    refreshCoach();
  });

  /* 玩法 */
  $('btn-help').addEventListener('click', () => {
    openModal(`
      <button class="btn tiny close">${t('close')}</button>
      <h2>${t('help.title')}</h2>
      <div class="sub">${t('help.sub')}</div>
      <ul class="help-list">
        <li>${t('help.item1')}</li>
        <li>${t('help.item2')}</li>
        <li>${t('help.item3')}</li>
        <li>${t('help.item4')}</li>
        <li>${t('help.item5')}</li>
        <li>${t('help.item6')}</li>
        <li>${t('help.item7')}</li>
        <li>${t('help.item8')}</li>
        <li>${t('help.item9')}</li>
        <li>${t('help.item10')}</li>
        <li>${t('help.item11')}</li>
        <li>${t('help.item12')}</li>
        <li>${t('help.item13')}</li>
        <li>${t('help.item14')}</li>
        <li>${t('help.item15')}</li>
        <li>${t('help.item16')}</li>
        <li>${t('help.item17')}</li>
        ${IS_PAGES ? '' : `<li>${t('help.item18')}</li>`}
        <li>${t('help.item19')}</li>
      </ul>
    `);
  });

  /* 实时刷新关系网 */
  sim.on('tick', () => {
    if (modalRoot.classList.contains('open') && liveDraw) {
      const now = performance.now();
      if (now - graphThrottle < 800) return;
      graphThrottle = now;
      liveDraw();
    }
  });
}
