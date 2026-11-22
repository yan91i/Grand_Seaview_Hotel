/**
 * API Key 存储：支持批量接入，并按住客分配不同 Key。
 * 持久化在 localStorage，刷新后仍保留。
 */

import { IS_PAGES } from '../buildMode';

export interface ApiKey {
  id: string;
  label: string;
  baseUrl: string;
  apiKey: string;
  model: string;
}

/** 分配给住客的特殊值：强制走本地引擎，不调用任何接口 */
export const LOCAL_ONLY = '__local__';

const STORAGE_KEY = 'hotel-ai.keys.v1';
const DEFAULT_BASE_URL = 'https://api.openai.com/v1';
const DEFAULT_MODEL = 'gpt-4o-mini';

interface KeyStore {
  keys: ApiKey[];
  defaultKeyId: string | null;
  /** agentId -> keyId | LOCAL_ONLY */
  assign: Record<string, string>;
}

function emptyStore(): KeyStore {
  return { keys: [], defaultKeyId: null, assign: {} };
}

function load(): KeyStore {
  try {
    if (typeof localStorage === 'undefined') return emptyStore();
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyStore();
    const p = JSON.parse(raw) as Partial<KeyStore>;
    return {
      keys: Array.isArray(p.keys) ? (p.keys as ApiKey[]).filter((k) => k && k.apiKey) : [],
      defaultKeyId: p.defaultKeyId ?? null,
      assign: p.assign && typeof p.assign === 'object' ? p.assign : {},
    };
  } catch {
    return emptyStore();
  }
}

let store: KeyStore = IS_PAGES ? emptyStore() : load();
const subs = new Set<() => void>();

function persist(): void {
  try {
    if (typeof localStorage !== 'undefined') localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    /* 忽略存储失败（如隐私模式） */
  }
  subs.forEach((cb) => cb());
}

export function subscribeKeys(cb: () => void): void {
  subs.add(cb);
  cb();
}

export function getKeys(): ApiKey[] {
  return store.keys;
}
export function getDefaultKeyId(): string | null {
  return store.defaultKeyId;
}
export function getAssign(agentId: string): string | undefined {
  return store.assign[agentId];
}
export function defaultBaseUrl(): string {
  return DEFAULT_BASE_URL;
}
export function defaultModel(): string {
  return DEFAULT_MODEL;
}
export function hasUserKeys(): boolean {
  return store.keys.length > 0;
}

export interface NewKeyInput {
  label?: string;
  apiKey: string;
  model?: string;
  baseUrl?: string;
}

/** 批量添加；重复的 Key 会被跳过。返回新增数量。 */
export function addKeys(inputs: NewKeyInput[]): number {
  let added = 0;
  for (const it of inputs) {
    const apiKey = (it.apiKey || '').trim();
    if (!apiKey) continue;
    if (store.keys.some((k) => k.apiKey === apiKey)) continue;
    store.keys.push({
      id: `k${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
      label: (it.label || '').trim() || `Key ${store.keys.length + 1}`,
      baseUrl: (it.baseUrl || '').trim().replace(/\/+$/, '') || DEFAULT_BASE_URL,
      model: (it.model || '').trim() || DEFAULT_MODEL,
      apiKey,
    });
    added++;
  }
  if (added) {
    if (!store.defaultKeyId) store.defaultKeyId = store.keys[0].id;
    persist();
  }
  return added;
}

export function removeKey(id: string): void {
  store.keys = store.keys.filter((k) => k.id !== id);
  if (store.defaultKeyId === id) store.defaultKeyId = store.keys[0]?.id ?? null;
  for (const [agent, keyId] of Object.entries(store.assign)) if (keyId === id) delete store.assign[agent];
  persist();
}

export function setDefaultKey(id: string | null): void {
  store.defaultKeyId = id && store.keys.some((k) => k.id === id) ? id : null;
  persist();
}

/** value 为空表示"跟随默认"；LOCAL_ONLY 表示强制本地；否则为 keyId。 */
export function assignKey(agentId: string, value: string): void {
  if (!value) delete store.assign[agentId];
  else store.assign[agentId] = value;
  persist();
}

export function forcedLocal(agentId: string): boolean {
  return store.assign[agentId] === LOCAL_ONLY;
}

/** 解析某住客实际使用的用户 Key；未指定则回落到默认 Key。 */
export function resolveKey(agentId: string): ApiKey | null {
  const a = store.assign[agentId];
  if (a === LOCAL_ONLY) return null;
  if (a) {
    const k = store.keys.find((x) => x.id === a);
    if (k) return k;
  }
  return resolveDefaultKey();
}

export function resolveDefaultKey(): ApiKey | null {
  if (!store.defaultKeyId) return null;
  return store.keys.find((k) => k.id === store.defaultKeyId) ?? null;
}

export function maskKey(key: string): string {
  if (key.length <= 10) return `${key.slice(0, 3)}***`;
  return `${key.slice(0, 5)}…${key.slice(-4)}`;
}

/** 解析批量粘贴文本：每行 `备注|Key|模型(可选)|接口地址(可选)`，只有一个字段时视为 Key。 */
export function parseKeyLines(text: string): NewKeyInput[] {
  return text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .map((line, i) => {
      const parts = line.split('|').map((s) => s.trim());
      if (parts.length >= 2) {
        return { label: parts[0], apiKey: parts[1], model: parts[2] || undefined, baseUrl: parts[3] || undefined };
      }
      return { label: `Key ${i + 1}`, apiKey: parts[0] };
    });
}
