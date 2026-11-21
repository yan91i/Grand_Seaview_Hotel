/** 与本地 LLM 代理通信的薄封装。任何失败都返回 null，交由调用方降级到本地引擎。 */

const inflight = { count: 0, max: 3 };

export type LlmMode = 'checking' | 'online' | 'offline';

/** 单次请求使用的接口配置；由前端按住客分配传入，服务端优先于 .env。 */
export interface LlmOverride {
  baseUrl: string;
  apiKey: string;
  model: string;
}

interface LlmResult {
  ok: boolean;
  text?: string;
  error?: string;
}

async function post(payload: Record<string, unknown>): Promise<LlmResult | null> {
  if (inflight.count >= inflight.max) return { ok: false, error: 'busy' };
  inflight.count++;
  try {
    const resp = await fetch('/api/llm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!resp.ok) return { ok: false, error: `http ${resp.status}` };
    return (await resp.json()) as LlmResult;
  } catch (err) {
    return { ok: false, error: String(err) };
  } finally {
    inflight.count--;
  }
}

export async function checkHealth(): Promise<{ llm: boolean; model: string | null }> {
  try {
    const r = await fetch('/api/health');
    if (!r.ok) return { llm: false, model: null };
    return await r.json();
  } catch {
    return { llm: false, model: null };
  }
}

/** 请求模型返回 JSON；解析失败或网络失败返回 null。 */
export async function llmJSON<T>(system: string, user: string, maxTokens = 400, override?: LlmOverride): Promise<T | null> {
  const payload: Record<string, unknown> = { system, user, json: true, temperature: 1.0, maxTokens };
  if (override) payload.override = override;
  const res = await post(payload);
  if (!res || !res.ok || !res.text) return null;
  const parsed = safeParse<T>(res.text);
  return parsed;
}

/** 请求纯文本。 */
export async function llmText(system: string, user: string, maxTokens = 300, override?: LlmOverride): Promise<string | null> {
  const payload: Record<string, unknown> = { system, user, json: false, temperature: 0.95, maxTokens };
  if (override) payload.override = override;
  const res = await post(payload);
  if (!res || !res.ok || !res.text) return null;
  return res.text;
}

/** 测试某个 Key 是否可用（请求 /models，不消耗 token）。 */
export async function testKey(override: LlmOverride): Promise<{ ok: boolean; error?: string; models?: number }> {
  try {
    const resp = await fetch('/api/key-test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ override }),
    });
    if (!resp.ok) return { ok: false, error: `http ${resp.status}` };
    return (await resp.json()) as { ok: boolean; error?: string; models?: number };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
}

function safeParse<T>(raw: string): T | null {
  let s = raw.trim();
  if (s.startsWith('```')) {
    s = s.replace(/^```[a-zA-Z]*\s*/, '').replace(/```\s*$/, '');
  }
  const start = s.indexOf('{');
  const end = s.lastIndexOf('}');
  if (start >= 0 && end > start) s = s.slice(start, end + 1);
  try {
    return JSON.parse(s) as T;
  } catch {
    return null;
  }
}
