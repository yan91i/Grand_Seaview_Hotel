/**
 * i18n：望海楼旅馆的界面文案国际化。
 * 仅翻译 UI 外壳（按钮、面板标题、表单标签、状态/关系/人格等标签字典）。
 * 住客的人设、对话、想法等叙事内容由 AI/规则生成，保持原文，不参与翻译。
 */

export type Lang = 'zh' | 'en';

const STORAGE_KEY = 'hotel.lang';

type Dict = Record<string, string>;

const zh: Dict = {
  // —— 顶栏 ——
  'clock.default': '第 1 天 08:00',
  'llm.checking': 'AI 引擎检测中…',
  'llm.online.n': 'AI 在线 · {n}/{total} 住客',
  'llm.online.keys': 'AI 在线 · {total} 住客（{keys} Key）',
  'llm.online.model': 'AI 在线 · {model}',
  'llm.offline': '本地引擎（未配置 API Key）',
  'llm.title': '点击打开「AI 接口」，可批量接入 Key 并按住客分配',
  'pause.title': '暂停 / 继续',

  // —— 楼层条 ——
  'floor.hint': '楼层',

  // —— 侧栏面板 ——
  'panel.log.title': '住客动态',
  'panel.profile.title': '住客档案',
  'panel.collapse': '收起',
  'panel.expand': '展开',
  'profile.empty': '点击画面中的角色，查看 TA 的性格、需求与心事。点「编辑」可实时修改人设，改完立即生效。',
  'profile.empty2': '点击画面中的角色，查看 TA 的性格、需求与心事。',

  // —— 底部工具栏 ——
  'tool.keys': 'AI 接口',
  'tool.talk': '对话',
  'tool.logs': '全部日志',
  'tool.graph': '关系网',
  'tool.events': '导演事件',
  'tool.coach': '定制客人',
  'tool.help': '玩法',
  'tool.lang': '语言',

  // —— 状态 / 关系 / 人格 / 需求 标签 ——
  'state.idle': '空闲',
  'state.walking': '走动中',
  'state.talking': '交谈中',
  'state.eating': '用餐中',
  'state.sleeping': '休息中',
  'state.relaxing': '放空中',
  'state.working': '忙碌中',
  'state.gazing': '眺望窗外',

  'rel.stranger': '陌生',
  'rel.acquaintance': '认识',
  'rel.friend': '朋友',
  'rel.close': '挚友',
  'rel.rival': '敌对',
  'rel.romance': '暧昧',

  'persona.openness': '开放性',
  'persona.conscientiousness': '尽责性',
  'persona.extraversion': '外向性',
  'persona.agreeableness': '宜人性',
  'persona.neuroticism': '神经质',

  'need.hunger': '饱腹',
  'need.energy': '精力',
  'need.social': '社交',
  'need.fun': '兴致',

  'kind.system': '系统',
  'kind.move': '移动',
  'kind.action': '行动',
  'kind.talk': '交谈',
  'kind.mood': '情绪',
  'kind.rel': '关系',
  'kind.mind': '想法',
  'kind.event': '事件',
  'kind.director': '导演',
  'kind.staff': '员工',

  'kindfull.resident': '长住客',
  'kindfull.staff': '走班员工',
  'kindfull.guest': '短租客人',
  'kindfull.default': '角色',

  'kindshort.resident': '长住',
  'kindshort.staff': '员工',
  'kindshort.guest': '短租',

  'gender.male': '男',
  'gender.female': '女',
  'gender.nonbinary': '其他',

  // —— 捏脸 ——
  'swatch.skin': '肤色',
  'swatch.hair': '发色',
  'swatch.top': '上衣',
  'swatch.bottom': '下装',

  'hair.short': '短发',
  'hair.long': '长发',
  'hair.bun': '丸子头',
  'hair.bald': '光头',

  // —— 档案面板 ——
  'pf.edit': '编辑',
  'pf.done': '完成',
  'pf.thought.label': '实时想法',
  'pf.thought.auto': '自主',
  'pf.thought.manual': '导演植入',
  'pf.thought.empty': '（暂无想法）',
  'pf.thought.placeholder': '写一句话，改变 TA 此刻的念头…',
  'pf.thought.apply': '植入',
  'pf.thought.restore': '恢复自动',
  'pf.manage': '管理',
  'pf.keep': '留下来长住',
  'pf.evict.guest': '请保安请离',
  'pf.evict.resident': '请经理劝离',
  'pf.guard.on': '当班保安：{name}',
  'pf.guard.off': '当班保安不在，会叫一位赶来',
  'pf.manager.on': '经理：{name}',
  'pf.manager.off': '经理不在',
  'pf.staff.note': '酒店员工，不适用留客 / 驱逐。',
  'pf.ai.local': 'AI：本地引擎（已指定）',
  'pf.ai.key': 'AI：{label}',
  'pf.ai.default': 'AI：跟随默认',
  'pf.room': '住处 {room}',
  'pf.workarea': ' · 岗位 {area}',
  'pf.mem.empty': '还没有和谁真正聊过。',
  'pf.section.persona': '性格（大五人格）',
  'pf.section.needs': '需求',
  'pf.section.rel': '人际',
  'pf.section.mem': '最近记得的事',
  'pf.section.face': '外貌（捏脸）',
  'pf.section.strength': '性格强度（大五人格）',
  'pf.section.warmth': '待人温度',
  'pf.section.ai': 'AI 接口',
  'pf.random.face': '随机外貌',
  'pf.warmth': '亲疏倾向',
  'pf.form.hint': '修改后立即生效，并影响此后的决策与对话。点顶部「AI 接口」可批量接入 Key。',

  'form.name': '姓名',
  'form.gender': '性别',
  'form.age': '年龄',
  'form.role': '身份',
  'form.room': '房间',
  'form.bio': '个人简介',
  'form.voice': '说话风格',
  'form.traits': '关键词',
  'form.traits.placeholder': '用、或,分隔',
  'form.hairstyle': '发型',

  // —— 通用按钮 / 文案 ——
  'close': '关闭',
  'enter': '开始营业',

  // —— 欢迎弹窗 ——
  'welcome.title': '欢迎来到 望海楼旅馆',
  'welcome.sub': 'Grand Seaview Hotel · 一间由 AI 驱动的赛博宠物旅馆',
  'welcome.p1': '这不是普通的模拟经营——这里住着 <b style="color:#e0a54a">12 位有性格、有心事的长住客</b>，外加经理、保安、保洁、服务员组成的员工班底。他们像真人一样吃饭、睡觉、上班、闲聊、发呆，甚至会吵架和交朋友。',
  'welcome.can': '<b style="color:#7ad0c8">你可以做什么：</b>',
  'welcome.item1': '🧑 <b>定制人物</b>：给任意角色改姓名、性别、简介、说话风格、大五人格，连肤色、发型、衣服都能实时捏脸。',
  'welcome.item2': '📝 <b>植入念头</b>：在角色档案里写一句话（如「我想去露台吹吹风」），TA 会立刻照做。',
  'welcome.item3': '🎬 <b>导演事件</b>：投放停电、派对、匿名信……甚至用一句话描述海怪、UFO、战争这类<b>世界事件</b>，观察所有人的连锁反应。',
  'welcome.item4': '🚗 <b>定制客人</b>：像拍电影一样捏一位客人，让服务员开车把 TA 接到酒店入住，数量不限。',
  'welcome.item5': '📊 <b>旁观一切</b>：看对话回放、关系网、全天日志，像上帝一样观察这群电子住客的生活。',
  'welcome.p2': '点击画面里的任意角色开始观察——或者，就静静看着他们自己把日子过下去。',

  // —— 关系网弹窗 ——
  'graph.title': '住客关系网',
  'graph.sub': '连线颜色代表好感：绿=亲近，红=疏远；线越粗关系越深。',

  // —— 导演事件弹窗 ——
  'events.title': '导演事件',
  'events.sub': '你是这个故事的导演。触发一个事件，看看楼里的住客、员工与客人会如何反应。',
  'events.editor.label': '世界事件编辑器 · 用一句话描述你想发生的事',
  'events.editor.sub': '写到"海怪 / UFO / 战争 / 地震 / 极光 / 流星雨"等词就能对号入座；识别不出的事件也会作为一次泛化的异象在楼里传开。',
  'events.editor.placeholder': '例如：海面浮出巨大的黑影，触手拍碎了浪花',
  'events.run': '让它发生',
  'events.empty': '先写一句描述吧。',
  'events.matched': '已触发：{name}',
  'events.unmatched': '没识别出具体事件，已作为一次泛化的世界异象在楼里传开。',

  // —— 对话弹窗 ——
  'talk.title': '住客对话',
  'talk.sub': '住客碰面时会自己聊起来。这里存档了每一段对话，点标题可展开台词回放。',
  'talk.empty': '还没有住客交谈过。把时间调快一点，等他们在大堂或花园碰面。',

  // —— 全部日志弹窗 ——
  'logs.title': '全部日志',
  'logs.sub': '每个角色的想法、每一次移动、每一段对话，全部汇总在这里（含来往的员工与短租客人）。可按角色筛选。',
  'logs.all': '全部',
  'logs.minor': '含想法与日常',
  'logs.empty': '没有符合条件的记录。',

  // —— AI 接口弹窗 ——
  'keys.title': 'AI 接口',
  'keys.sub': '批量粘贴 API Key（每行一个），接入后可给不同住客分配不同 Key。Key 仅保存在本地浏览器。',
  'keys.base': '默认接口',
  'keys.model': '默认模型',
  'keys.batch': '批量 Key',
  'keys.batch.placeholder': '每行一个，支持：备注|Key|模型(可选)|接口地址(可选)\nsk-xxxxxxxxxxxxxxxx\n备用Key|sk-yyyyyyyy|gpt-4o-mini',
  'keys.add': '批量接入',
  'keys.added': '已接入 {n} 个 Key',
  'keys.noNew': '没有新增（重复或为空）',
  'keys.empty': '请输入 Key',
  'keys.connected': '已接入（{n}）',
  'keys.emptyList': '还没有接入 Key。粘贴到下方文本框即可批量添加。',
  'keys.default': '默认 Key',
  'keys.default.none': '（无 · 未分配时走本地引擎）',
  'keys.assign': '按住客分配',
  'keys.test': '测试',
  'keys.delete': '删除',
  'keys.testing': '测试中…',
  'keys.test.ok': '✓ 可用{n}',
  'keys.test.fail': '✗ {err}',
  'keys.followDefault': '跟随默认{detail}',
  'keys.followDefault.none': '（无 · 本地引擎）',
  'keys.forceLocal': '强制本地引擎（不调用 API）',

  // —— 定制客人弹窗 ——
  'coach.title': '定制客人 · coach',
  'coach.sub': '像导演一样定制一位客人：姓名、身份、简介、说话风格、性格与外貌都能改。可一次定制多位——数量不限，直到房间住满；确认后由一位服务员开车离场，稍后把客人带回酒店。',
  'coach.preview': '外貌预览',
  'coach.add': '加入待接名单',
  'coach.added': '「{name}」已加入待接名单。',
  'coach.full': '房间已住满，接不了了。',
  'coach.confirm': '确认出发',
  'coach.clear': '清空名单',
  'coach.confirmed': '服务员已出发，稍后带客人回来。',
  'coach.busy': '有一趟行程正在进行。',
  'coach.emptyList': '名单是空的。',
  'coach.waiting': '待接名单（{n} 位）· 空房 {rooms} 间',
  'coach.listEmpty': '名单为空。在左边填好资料，点「加入待接名单」。',
  'coach.remove': '移除',
  'coach.age': '岁',
  'coach.phase.out': '正在开车前往',
  'coach.phase.away': '正在路上，稍后回来',
  'coach.phase.back': '载着客人返回酒店',
  'coach.trip': '服务员{name}{phase}…',
  'coach.roomsFull': '房间已住满，暂时安排不了新客人。',
  'coach.roomsAvail': '还可安排 {n} 位客人；确认后会有一位服务员开车离场去接。',

  // —— 玩法弹窗 ——
  'help.title': '怎么玩',
  'help.sub': '这是一间六层海边旅馆的 AI 生活观察室，你负责"看戏"和"推一把"。',
  'help.item1': '<b>观察</b>：12 位长住客（其中何静是前厅经理）由 AI 自主驱动，会按性格与需求吃饭、睡觉、上班、找人聊天、发呆。',
  'help.item2': '<b>员工</b>：望海楼有 7 名固定员工——经理 1 名（何静）、保安 2 名、保洁 1 名、服务员 3 名；除经理外都走班：白班 08:00 到岗，夜班保安 20:00 接班。',
  'help.item3': '<b>换楼层</b>：顶部「楼层」条可在大堂、餐厅、客房等 6 层之间切换，看每一层正在发生什么。',
  'help.item4': '<b>看名单</b>：底部头像条是当前在楼里的所有人。青边＝走班员工，粉边＝短租客人；每天有员工到岗、有人退房离开，名单会实时增减。',
  'help.item5': '<b>留客 / 驱逐</b>：在档案面板的「管理」区，可把短租客人「留下来长住」；长住客由经理劝离、短租客由保安请离（当班保安不在会自动叫一位赶来）。',
  'help.item6': '<b>定制客人 · coach</b>：点「定制客人」可像导演一样捏一位客人——姓名、身份、简介、说话风格、性格与外貌都能改，数量不限，可以一直加到房间住满；点「确认出发」，会有一位服务员开车离场，稍后把名单上的客人一起带回酒店办理入住。',
  'help.item7': '<b>点角色</b>：点击画面里的像素角色，查看 TA 的性格、需求、人际与最近的记忆。',
  'help.item8': '<b>读想法</b>：档案面板里有 TA「实时想法」，会随状态自动变化。',
  'help.item9': '<b>植入念头</b>：在想法框里写一句话（如「我想去露台吹吹风」）点「植入」，TA 会立刻照着这个念头行动；点「恢复自动」交还给它自己。',
  'help.item10': '<b>看对话</b>：点「对话」，回放角色之间自己发生的每一段交谈。',
  'help.item11': '<b>查日志</b>：点「全部日志」，汇总所有人的想法、行动与对话，可按角色筛选。',
  'help.item12': '<b>改人设</b>：在档案面板点「编辑」，可实时修改姓名、性别、简介、说话风格、关键词与大五人格，改完立即生效。',
  'help.item13': '<b>捏脸</b>：同一个「编辑」面板里可调整每个人的肤色、发色、上衣、下装与发型，也能一键「随机外貌」，画面里的像素角色会立刻换装。',
  'help.item14': '<b>控时间</b>：右上角可暂停和加速（×1～×8），想快进看一天可以调快。',
  'help.item15': '<b>看关系</b>：点"关系网"看谁和谁走得近，绿线亲近、红线疏远。',
  'help.item16': '<b>推剧情</b>：点"导演事件"投放一个突发事件（停电、派对、匿名信…），观察连锁反应。',
  'help.item17': '<b>世界事件</b>：平时会随机发生海怪、UFO、战争这类异象；也能在"导演事件"里用一句话描述，让指定的事件发生。',
  'help.item18': '<b>接模型</b>：点"AI 接口"批量粘贴 API Key（每行一个），可按住客分配不同 Key；未分配的走默认 Key，也没有则用本地引擎。',
  'help.item19': '<b>看画面</b>：按住画面拖动可平移视角；桌面用鼠标滚轮、手机用双指捏合可放大缩小（最多放大到 3 倍），松手 / 抬指即恢复浏览。',

  // —— 开场 ——
  'intro.start': '开始营业',

  // —— 楼层 / 区域（hotel.ts）——
  'floor.0.name': '海边户外',
  'floor.0.short': '户外',
  'floor.1.name': '大堂层',
  'floor.1.short': '大堂',
  'floor.2.name': '餐饮健身层',
  'floor.2.short': '餐饮',
  'floor.3.name': '商务层',
  'floor.3.short': '商务',
  'floor.4.name': '员工层',
  'floor.4.short': '员工',
  'floor.5.name': '客房层',
  'floor.5.short': '客房',
  'floor.6.name': '客房层',
  'floor.6.short': '客房',

  // —— 区域名 ——
  'area.f0_beach': '沙滩',
  'area.f0_plaza': '门前广场',
  'area.f0_road': '门前公路',
  'area.f1_reception': '前台',
  'area.f1_garden': '露台花园',
  'area.f1_corridor': '走廊',
  'area.f1_lobby': '大堂',
  'area.f1_bar': '酒吧',
  'area.f2_dining': '餐厅',
  'area.f2_kitchen': '厨房',
  'area.f2_laundry': '洗衣房',
  'area.f2_corridor': '走廊',
  'area.f2_gym': '健身房',
  'area.f2_yoga': '瑜伽室',
  'area.f3_meeting': '会议室',
  'area.f3_lounge': '商务酒廊',
  'area.f3_corridor': '走廊',
  'area.f3_office': '办公室',
  'area.f4_dorm': '员工宿舍',
  'area.f4_kitchen2': '员工厨房',
  'area.f4_corridor': '走廊',
  'area.f4_laundry2': '布草间',
  'area.f5_room1': '客房 501',
  'area.f5_room2': '客房 502',
  'area.f5_room3': '客房 503',
  'area.f5_room4': '客房 504',
  'area.f5_corridor': '走廊',
  'area.f6_room1': '客房 601',
  'area.f6_room2': '客房 602',
  'area.f6_room3': '客房 603',
  'area.f6_room4': '客房 604',
  'area.f6_corridor': '走廊',

  // —— 导演事件名/描述 ——
  'evt.party.name': '大堂派对',
  'evt.party.desc': '有人提议在大堂聚一聚，把大家都叫下楼。',
  'evt.rain.name': '暴雨夜',
  'evt.rain.desc': '海上起了暴雨，所有人被困在楼里。',
  'evt.blackout.name': '突然停电',
  'evt.blackout.desc': '整栋楼陷入黑暗，只有蜡烛和大堂的壁炉。',
  'evt.music.name': '深夜琴声',
  'evt.music.desc': '深夜里，酒吧传来一段没听过的旋律。',
  'evt.letter.name': '匿名信',
  'evt.letter.desc': '有人收到一封没有署名的信。',
  'evt.sunset.name': '绝美落日',
  'evt.sunset.desc': '今晚的海面被染成金色，值得抬头看一眼。',
  'evt.kraken.name': '海怪',
  'evt.kraken.desc': '近海浮起巨大的黑影，触手拍裂了浪花——一个不该存在的东西。',
  'evt.ufo.name': '不明飞行物',
  'evt.ufo.desc': '夜空里出现一队不动的光点，慢慢横过海面。',
  'evt.war.name': '战争',
  'evt.war.desc': '海平线那头传来闷响，夜里能看见远处的火光。',
  'evt.quake.name': '地震',
  'evt.quake.desc': '一阵摇晃，吊灯晃了起来，杯子掉在地上。',
  'evt.aurora.name': '极光',
  'evt.aurora.desc': '天边泛起流动的绿色光芒，盖住了整片夜空。',
  'evt.meteor.name': '流星雨',
  'evt.meteor.desc': '一颗接一颗的流星划过海面，像有人在天上撒火星。',
};

const en: Dict = {
  'clock.default': 'Day 1 08:00',
  'llm.checking': 'AI engine checking…',
  'llm.online.n': 'AI online · {n}/{total} residents',
  'llm.online.keys': 'AI online · {total} residents ({keys} keys)',
  'llm.online.model': 'AI online · {model}',
  'llm.offline': 'Local engine (no API key)',
  'llm.title': 'Open "AI Keys" to add keys and assign them per resident',
  'pause.title': 'Pause / Resume',

  'floor.hint': 'Floors',

  'panel.log.title': 'Resident Feed',
  'panel.profile.title': 'Resident Profile',
  'panel.collapse': 'Collapse',
  'panel.expand': 'Expand',
  'profile.empty': 'Click a character to view their personality, needs and inner thoughts. Use "Edit" to tweak them live.',
  'profile.empty2': 'Click a character to view their personality, needs and thoughts.',

  'tool.keys': 'AI Keys',
  'tool.talk': 'Dialogues',
  'tool.logs': 'All Logs',
  'tool.graph': 'Relations',
  'tool.events': 'Director',
  'tool.coach': 'Coach Guest',
  'tool.help': 'Help',
  'tool.lang': 'Language',

  'state.idle': 'Idle',
  'state.walking': 'Walking',
  'state.talking': 'Talking',
  'state.eating': 'Eating',
  'state.sleeping': 'Resting',
  'state.relaxing': 'Zoning out',
  'state.working': 'Busy',
  'state.gazing': 'Gazing out',

  'rel.stranger': 'Stranger',
  'rel.acquaintance': 'Acquaintance',
  'rel.friend': 'Friend',
  'rel.close': 'Close friend',
  'rel.rival': 'Rival',
  'rel.romance': 'Flirty',

  'persona.openness': 'Openness',
  'persona.conscientiousness': 'Conscientiousness',
  'persona.extraversion': 'Extraversion',
  'persona.agreeableness': 'Agreeableness',
  'persona.neuroticism': 'Neuroticism',

  'need.hunger': 'Fullness',
  'need.energy': 'Energy',
  'need.social': 'Social',
  'need.fun': 'Mood',

  'kind.system': 'System',
  'kind.move': 'Move',
  'kind.action': 'Action',
  'kind.talk': 'Talk',
  'kind.mood': 'Mood',
  'kind.rel': 'Relation',
  'kind.mind': 'Thought',
  'kind.event': 'Event',
  'kind.director': 'Director',
  'kind.staff': 'Staff',

  'kindfull.resident': 'Long-term resident',
  'kindfull.staff': 'Shift staff',
  'kindfull.guest': 'Short-term guest',
  'kindfull.default': 'Character',

  'kindshort.resident': 'Resident',
  'kindshort.staff': 'Staff',
  'kindshort.guest': 'Guest',

  'gender.male': 'Male',
  'gender.female': 'Female',
  'gender.nonbinary': 'Other',

  'swatch.skin': 'Skin',
  'swatch.hair': 'Hair',
  'swatch.top': 'Top',
  'swatch.bottom': 'Bottom',

  'hair.short': 'Short',
  'hair.long': 'Long',
  'hair.bun': 'Bun',
  'hair.bald': 'Bald',

  'pf.edit': 'Edit',
  'pf.done': 'Done',
  'pf.thought.label': 'Live thought',
  'pf.thought.auto': 'Auto',
  'pf.thought.manual': 'Implanted',
  'pf.thought.empty': '(no thought yet)',
  'pf.thought.placeholder': 'Write a line to change their current mind…',
  'pf.thought.apply': 'Implant',
  'pf.thought.restore': 'Restore auto',
  'pf.manage': 'Manage',
  'pf.keep': 'Keep as resident',
  'pf.evict.guest': 'Ask security to remove',
  'pf.evict.resident': 'Ask manager to evict',
  'pf.guard.on': 'On-duty guard: {name}',
  'pf.guard.off': 'No guard on duty — one will be called',
  'pf.manager.on': 'Manager: {name}',
  'pf.manager.off': 'Manager is out',
  'pf.staff.note': 'Hotel staff — keep/evict does not apply.',
  'pf.ai.local': 'AI: local engine (forced)',
  'pf.ai.key': 'AI: {label}',
  'pf.ai.default': 'AI: follow default',
  'pf.room': 'Room {room}',
  'pf.workarea': ' · Post {area}',
  'pf.mem.empty': 'Hasn\'t really talked to anyone yet.',
  'pf.section.persona': 'Personality (Big Five)',
  'pf.section.needs': 'Needs',
  'pf.section.rel': 'Relationships',
  'pf.section.mem': 'Recent memories',
  'pf.section.face': 'Appearance (customize)',
  'pf.section.strength': 'Personality strength (Big Five)',
  'pf.section.warmth': 'Warmth toward others',
  'pf.section.ai': 'AI key',
  'pf.random.face': 'Randomize look',
  'pf.warmth': 'Affinity bias',
  'pf.form.hint': 'Changes apply immediately and affect future decisions & dialogue. Use "AI Keys" at the top to add keys in bulk.',

  'form.name': 'Name',
  'form.gender': 'Gender',
  'form.age': 'Age',
  'form.role': 'Role',
  'form.room': 'Room',
  'form.bio': 'Bio',
  'form.voice': 'Speech style',
  'form.traits': 'Keywords',
  'form.traits.placeholder': 'separate with 、 or ,',
  'form.hairstyle': 'Hair',

  'close': 'Close',
  'enter': 'Open for business',

  'welcome.title': 'Welcome to Grand Seaview Hotel',
  'welcome.sub': 'Grand Seaview Hotel · an AI-driven cyber-pet hotel',
  'welcome.p1': 'This is no ordinary management sim — <b style="color:#e0a54a">12 long-term residents with personalities and worries</b> live here, plus a staff of manager, guards, housekeepers and waiters. They eat, sleep, work, chat, space out, even argue and befriend each other like real people.',
  'welcome.can': '<b style="color:#7ad0c8">What you can do:</b>',
  'welcome.item1': '🧑 <b>Customize people</b>: rename any character, change gender, bio, speech style, Big Five — even skin tone, hair and clothes, live.',
  'welcome.item2': '📝 <b>Implant thoughts</b>: write a line in the profile (e.g. "I want to go to the terrace") and they will act on it right away.',
  'welcome.item3': '🎬 <b>Direct events</b>: trigger blackouts, parties, anonymous letters… even describe <b>world events</b> like krakens, UFOs, war, and watch the chain reaction.',
  'welcome.item4': '🚗 <b>Coach guests</b>: craft a guest like a movie director and have a waiter drive them in — unlimited, until rooms are full.',
  'welcome.item5': '📊 <b>Observe everything</b>: read dialogue replays, the relationship graph, full-day logs — watch these electronic residents live their lives.',
  'welcome.p2': 'Click any character to start observing — or just sit back and watch them live their lives.',

  'graph.title': 'Resident Relationship Graph',
  'graph.sub': 'Line color = affinity: green = close, red = distant; thicker = deeper bond.',

  'events.title': 'Director Events',
  'events.sub': 'You are the director. Trigger an event and see how residents, staff and guests react.',
  'events.editor.label': 'World event editor · describe what you want to happen in one line',
  'events.editor.sub': 'Mention "kraken / UFO / war / earthquake / aurora / meteor" to match a preset; unrecognized text still spreads as a generic anomaly.',
  'events.editor.placeholder': 'e.g. A huge shadow rises from the sea, tentacles shattering the waves',
  'events.run': 'Make it happen',
  'events.empty': 'Write a description first.',
  'events.matched': 'Triggered: {name}',
  'events.unmatched': 'No specific event matched — spread as a generic world anomaly.',

  'talk.title': 'Resident Dialogues',
  'talk.sub': 'Residents chat on their own when they meet. Every conversation is saved here; click a title to expand the transcript.',
  'talk.empty': 'No conversations yet. Speed up time and wait for them to meet in the lobby or garden.',

  'logs.title': 'All Logs',
  'logs.sub': 'Every thought, move and conversation is aggregated here (including staff and short-term guests). Filter by character.',
  'logs.all': 'All',
  'logs.minor': 'Include thoughts & daily',
  'logs.empty': 'No matching records.',

  'keys.title': 'AI Keys',
  'keys.sub': 'Paste API keys in bulk (one per line). Assign different keys to different residents. Keys are stored only in your browser.',
  'keys.base': 'Default endpoint',
  'keys.model': 'Default model',
  'keys.batch': 'Bulk keys',
  'keys.batch.placeholder': 'one per line, format: label|key|model(optional)|endpoint(optional)\nsk-xxxxxxxxxxxxxxxx\nBackup|sk-yyyyyyyy|gpt-4o-mini',
  'keys.add': 'Add all',
  'keys.added': 'Added {n} keys',
  'keys.noNew': 'Nothing new (duplicate or empty)',
  'keys.empty': 'Enter a key',
  'keys.connected': 'Connected ({n})',
  'keys.emptyList': 'No keys yet. Paste into the box below to add in bulk.',
  'keys.default': 'Default key',
  'keys.default.none': '(none · falls back to local engine)',
  'keys.assign': 'Assign per resident',
  'keys.test': 'Test',
  'keys.delete': 'Delete',
  'keys.testing': 'Testing…',
  'keys.test.ok': '✓ OK{n}',
  'keys.test.fail': '✗ {err}',
  'keys.followDefault': 'Follow default{detail}',
  'keys.followDefault.none': '(none · local engine)',
  'keys.forceLocal': 'Force local engine (no API)',

  'coach.title': 'Coach Guest',
  'coach.sub': 'Craft a guest like a director: name, role, bio, speech style, personality and look. Add as many as you like until rooms are full; confirm to send a waiter to pick them up.',
  'coach.preview': 'Look preview',
  'coach.add': 'Add to pickup list',
  'coach.added': '"{name}" added to the pickup list.',
  'coach.full': 'Rooms are full — can\'t take more.',
  'coach.confirm': 'Confirm departure',
  'coach.clear': 'Clear list',
  'coach.confirmed': 'Waiter has left, guests will arrive shortly.',
  'coach.busy': 'A trip is already in progress.',
  'coach.emptyList': 'The list is empty.',
  'coach.waiting': 'Pickup list ({n}) · {rooms} free rooms',
  'coach.listEmpty': 'List is empty. Fill in the form on the left and click "Add to pickup list".',
  'coach.remove': 'Remove',
  'coach.age': 'yr',
  'coach.phase.out': 'driving to pick up',
  'coach.phase.away': 'on the way, coming back soon',
  'coach.phase.back': 'driving guests back',
  'coach.trip': 'Waiter{name} {phase}…',
  'coach.roomsFull': 'Rooms are full — can\'t arrange new guests right now.',
  'coach.roomsAvail': '{n} guest(s) can be arranged; a waiter will drive out to pick them up after confirmation.',

  'help.title': 'How to play',
  'help.sub': 'This is an AI life observation room of a six-floor seaside hotel. You "watch the show" and "give a nudge".',
  'help.item1': '<b>Observe</b>: 12 long-term residents (He Jing is the front-desk manager) are AI-driven — they eat, sleep, work, chat and space out according to their personality and needs.',
  'help.item2': '<b>Staff</b>: 7 fixed staff — 1 manager (He Jing), 2 guards, 1 housekeeper, 3 waiters. All except the manager work shifts: day shift starts 08:00, night guard comes on at 20:00.',
  'help.item3': '<b>Change floors</b>: use the "Floors" bar at the top to switch between lobby, restaurant, guest rooms etc. and see what\'s happening on each.',
  'help.item4': '<b>Roster</b>: the bottom avatar bar shows everyone currently in the building. Cyan border = shift staff, pink border = short-term guest; staff come on duty and guests check out in real time.',
  'help.item5': '<b>Keep / evict</b>: in the profile panel\'s "Manage" section, keep a short-term guest as a resident; residents are evicted by the manager, guests by security (a guard will be called if none is on duty).',
  'help.item6': '<b>Coach guest</b>: click "Coach Guest" to craft a guest like a director — name, role, bio, speech style, personality and look are all editable, unlimited until rooms are full; click "Confirm departure" and a waiter drives out to bring the listed guests back.',
  'help.item7': '<b>Click a character</b>: click a pixel character in the scene to view their personality, needs, relationships and recent memories.',
  'help.item8': '<b>Read thoughts</b>: the profile panel shows their "Live thought", which changes automatically with their state.',
  'help.item9': '<b>Implant thoughts</b>: write a line in the thought box (e.g. "I want to go to the terrace") and click "Implant" — they will act on it right away; click "Restore auto" to give control back.',
  'help.item10': '<b>Dialogues</b>: click "Dialogues" to replay every conversation characters have had on their own.',
  'help.item11': '<b>Logs</b>: click "All Logs" to aggregate everyone\'s thoughts, actions and conversations; filter by character.',
  'help.item12': '<b>Edit persona</b>: click "Edit" in the profile panel to change name, gender, bio, speech style, keywords and Big Five in real time — changes apply immediately.',
  'help.item13': '<b>Customize look</b>: in the same "Edit" panel, adjust skin, hair, top, bottom and hairstyle, or hit "Randomize look"; pixel characters change outfits instantly.',
  'help.item14': '<b>Control time</b>: pause and speed up (×1–×8) in the top right corner; speed up to fast-forward a day.',
  'help.item15': '<b>Relationships</b>: click "Relations" to see who\'s close to whom — green lines = close, red = distant.',
  'help.item16': '<b>Push the plot</b>: click "Director" to drop a sudden event (blackout, party, anonymous letter…) and watch the chain reaction.',
  'help.item17': '<b>World events</b>: anomalies like krakens, UFOs and war happen randomly; you can also describe one in "Director" to trigger a specific event.',
  'help.item18': '<b>Connect models</b>: click "AI Keys" to paste API keys in bulk (one per line) and assign different keys per resident; unassigned ones use the default key, or the local engine if none.',
  'help.item19': '<b>View the scene</b>: drag to pan; mouse wheel on desktop or pinch on mobile to zoom in (up to 3×); release to return to browsing.',

  'intro.start': 'Open for business',

  'floor.0.name': 'Seaside Outdoor',
  'floor.0.short': 'Outdoor',
  'floor.1.name': 'Lobby Floor',
  'floor.1.short': 'Lobby',
  'floor.2.name': 'Dining & Fitness',
  'floor.2.short': 'Dining',
  'floor.3.name': 'Business Floor',
  'floor.3.short': 'Business',
  'floor.4.name': 'Staff Floor',
  'floor.4.short': 'Staff',
  'floor.5.name': 'Guest Rooms',
  'floor.5.short': 'Rooms',
  'floor.6.name': 'Guest Rooms',
  'floor.6.short': 'Rooms',

  'area.f0_beach': 'Beach',
  'area.f0_plaza': 'Front Plaza',
  'area.f0_road': 'Front Road',
  'area.f1_reception': 'Reception',
  'area.f1_garden': 'Terrace Garden',
  'area.f1_corridor': 'Corridor',
  'area.f1_lobby': 'Lobby',
  'area.f1_bar': 'Bar',
  'area.f2_dining': 'Restaurant',
  'area.f2_kitchen': 'Kitchen',
  'area.f2_laundry': 'Laundry',
  'area.f2_corridor': 'Corridor',
  'area.f2_gym': 'Gym',
  'area.f2_yoga': 'Yoga Room',
  'area.f3_meeting': 'Meeting Room',
  'area.f3_lounge': 'Business Lounge',
  'area.f3_corridor': 'Corridor',
  'area.f3_office': 'Office',
  'area.f4_dorm': 'Staff Dorm',
  'area.f4_kitchen2': 'Staff Kitchen',
  'area.f4_corridor': 'Corridor',
  'area.f4_laundry2': 'Linen Room',
  'area.f5_room1': 'Room 501',
  'area.f5_room2': 'Room 502',
  'area.f5_room3': 'Room 503',
  'area.f5_room4': 'Room 504',
  'area.f5_corridor': 'Corridor',
  'area.f6_room1': 'Room 601',
  'area.f6_room2': 'Room 602',
  'area.f6_room3': 'Room 603',
  'area.f6_room4': 'Room 604',
  'area.f6_corridor': 'Corridor',

  'evt.party.name': 'Lobby Party',
  'evt.party.desc': 'Someone suggests gathering in the lobby and calls everyone downstairs.',
  'evt.rain.name': 'Stormy Night',
  'evt.rain.desc': 'A storm hits the sea, trapping everyone in the building.',
  'evt.blackout.name': 'Blackout',
  'evt.blackout.desc': 'The whole building goes dark — only candles and the lobby fireplace remain.',
  'evt.music.name': 'Late-night Piano',
  'evt.music.desc': 'Late at night, an unfamiliar melody drifts from the bar.',
  'evt.letter.name': 'Anonymous Letter',
  'evt.letter.desc': 'Someone receives a letter with no signature.',
  'evt.sunset.name': 'Gorgeous Sunset',
  'evt.sunset.desc': 'The sea turns gold tonight — worth looking up for.',
  'evt.kraken.name': 'Kraken',
  'evt.kraken.desc': 'A huge shadow rises from the sea, tentacles shattering the waves — something that should not exist.',
  'evt.ufo.name': 'UFO',
  'evt.ufo.desc': 'A formation of motionless lights crosses the night sky over the sea.',
  'evt.war.name': 'War',
  'evt.war.desc': 'Muffled booms from the horizon; distant firelight glows at night.',
  'evt.quake.name': 'Earthquake',
  'evt.quake.desc': 'A shake — chandeliers sway, cups fall to the floor.',
  'evt.aurora.name': 'Aurora',
  'evt.aurora.desc': 'Flowing green light floods the entire night sky.',
  'evt.meteor.name': 'Meteor Shower',
  'evt.meteor.desc': 'Meteors streak across the sea one after another, like sparks thrown across the sky.',
};

const dicts: Record<Lang, Dict> = { zh, en };

let current: Lang = detectLang();
const listeners = new Set<(lang: Lang) => void>();

/** 检测语言：localStorage 优先，否则取浏览器语言（zh 开头用中文，其余用英文）。 */
export function detectLang(): Lang {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved === 'zh' || saved === 'en') return saved;
  const nav = (navigator.language || 'en').toLowerCase();
  return nav.startsWith('zh') ? 'zh' : 'en';
}

export function getLang(): Lang {
  return current;
}

export function setLang(lang: Lang): void {
  if (lang !== 'zh' && lang !== 'en') return;
  if (lang === current) return;
  current = lang;
  localStorage.setItem(STORAGE_KEY, lang);
  document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en';
  for (const cb of listeners) cb(lang);
}

/** 在中文 / 英文之间切换。 */
export function toggleLang(): Lang {
  setLang(current === 'zh' ? 'en' : 'zh');
  return current;
}

export function onLangChange(cb: (lang: Lang) => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

/** 翻译；支持 {key} 占位符替换。 */
export function t(key: string, vars?: Record<string, string | number>): string {
  let s = dicts[current][key] ?? dicts.zh[key] ?? key;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      s = s.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
    }
  }
  return s;
}

/** 用当前语言构建标签字典（给 STATE_LABEL / REL_LABEL 等使用）。 */
export function labelMap(prefix: string, keys: string[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const k of keys) out[k] = t(`${prefix}.${k}`);
  return out;
}

/** 扫描带 data-i18n-key / data-i18n-title 的元素，把当前语言写入 textContent / title。 */
export function applyI18n(root: ParentNode = document): void {
  root.querySelectorAll<HTMLElement>('[data-i18n-key]').forEach((el) => {
    const key = el.dataset.i18nKey;
    if (key) el.textContent = t(key);
  });
  root.querySelectorAll<HTMLElement>('[data-i18n-title]').forEach((el) => {
    const key = el.dataset.i18nTitle;
    if (key) el.title = t(key);
  });
}
