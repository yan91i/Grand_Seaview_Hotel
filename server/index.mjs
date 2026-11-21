import express from 'express';
import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const app = express();
app.use(express.json({ limit: '1mb' }));

const PORT = Number(process.env.LLM_PROXY_PORT || 8787);
const BASE_URL = (process.env.LLM_BASE_URL || 'https://api.openai.com/v1').replace(/\/+$/, '');
const API_KEY = process.env.LLM_API_KEY || '';
const MODEL = process.env.LLM_MODEL || 'gpt-4o-mini';

const enabled = () => API_KEY.length > 0;

/** 前端可按住客传入 override（自定义 Key），优先于 .env 配置。 */
function resolveCfg(override) {
  if (override && typeof override === 'object' && override.apiKey) {
    return {
      baseUrl: String(override.baseUrl || BASE_URL).replace(/\/+$/, ''),
      apiKey: String(override.apiKey),
      model: String(override.model || MODEL),
    };
  }
  return { baseUrl: BASE_URL, apiKey: API_KEY, model: MODEL };
}

// 简单的串行队列：同一时间只发一个上游请求，避免 6 个角色把速率打满。
let chain = Promise.resolve();
function enqueue(fn) {
  const run = chain.then(fn, fn);
  chain = run.catch(() => {});
  return run;
}

app.get('/api/health', (_req, res) => {
  res.json({ llm: enabled(), model: enabled() ? MODEL : null });
});

/**
 * POST /api/key-test
 * body: { override: { baseUrl, apiKey, model } }
 * 通过 GET /models 验证 Key 是否可用，不消耗 token。
 */
app.post('/api/key-test', async (req, res) => {
  const cfg = resolveCfg(req.body?.override);
  if (!cfg.apiKey) return res.json({ ok: false, error: '缺少 API Key' });
  try {
    const resp = await fetch(`${cfg.baseUrl}/models`, {
      headers: { Authorization: `Bearer ${cfg.apiKey}` },
    });
    if (!resp.ok) {
      const t = await resp.text().catch(() => '');
      return res.json({ ok: false, error: `${resp.status} ${t.slice(0, 120)}` });
    }
    const data = await resp.json().catch(() => ({}));
    const models = Array.isArray(data?.data) ? data.data.filter((m) => m?.id).length : 0;
    res.json({ ok: true, models });
  } catch (err) {
    res.json({ ok: false, error: String(err?.message || err) });
  }
});

/**
 * POST /api/llm
 * body: { system, user, json?, temperature?, maxTokens?, override? }
 * 返回: { ok: true, text: string } | { ok: false, fallback: true, error: string }
 * 任何失败都以 200 + fallback 返回，前端据此优雅降级到本地引擎。
 */
app.post('/api/llm', async (req, res) => {
  const { system = '', user = '', json = false, temperature = 0.9, maxTokens = 500 } = req.body || {};
  const cfg = resolveCfg(req.body?.override);
  if (!cfg.apiKey) {
    return res.json({ ok: false, fallback: true, error: '未配置 API Key，使用本地引擎' });
  }
  try {
    const text = await enqueue(() => callUpstream(cfg, { system, user, json, temperature, maxTokens }));
    res.json({ ok: true, text });
  } catch (err) {
    res.json({ ok: false, fallback: true, error: String(err?.message || err) });
  }
});

async function callUpstream(cfg, { system, user, json, temperature, maxTokens }) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60000);
  try {
    const body = {
      model: cfg.model,
      temperature,
      max_tokens: maxTokens,
      messages: [
        ...(system ? [{ role: 'system', content: system }] : []),
        { role: 'user', content: user },
      ],
    };
    if (json) body.response_format = { type: 'json_object' };

    const resp = await fetch(`${cfg.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${cfg.apiKey}`,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (!resp.ok) {
      const t = await resp.text().catch(() => '');
      throw new Error(`上游 ${resp.status}: ${t.slice(0, 200)}`);
    }
    const data = await resp.json();
    const text = data?.choices?.[0]?.message?.content;
    if (typeof text !== 'string' || !text.trim()) throw new Error('上游返回空内容');
    return text.trim();
  } finally {
    clearTimeout(timeout);
  }
}

app.listen(PORT, '127.0.0.1', () => {
  console.log(`[llm-proxy] listening on http://127.0.0.1:${PORT}`);
  console.log(`[llm-proxy] mode: ${enabled() ? `LLM (${MODEL})` : '本地引擎降级（未配置 LLM_API_KEY）'}`);
});
