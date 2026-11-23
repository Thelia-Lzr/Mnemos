import { read } from './db';
import { AiConfig, Language, Level, Question, languages } from './model';

export const openRouterUrl = 'https://openrouter.ai/api/v1';
export const bridgeOrigin = 'http://127.0.0.1:47380';

type PromptMessage = { role: 'system' | 'user' | 'assistant'; content: string };
type LoopbackOptions = RequestInit & { targetAddressSpace?: 'loopback' };

export function compatibleUrl(input: string) {
  const url = new URL(input.trim());
  if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash) {
    throw new Error('请填写不含账号、查询参数或片段的 HTTPS API 地址。');
  }
  return url.href.replace(/\/+$/, '').replace(/\/chat\/completions$/, '');
}

function errorForStatus(status: number, local: boolean) {
  if (status === 401 || status === 403) return local ? '本机桥接器拒绝了配对，请核对配对码和网页来源。' : '服务拒绝了请求，请检查密钥和模型权限。';
  if (status === 404) return local ? '本机 CLI 不可用，请检查桥接器所在终端。' : '找不到接口或模型，请检查 API 地址和模型 ID。';
  if (status === 429) return '请求过多或额度不足，请稍后重试。';
  return local ? '本机 CLI 执行失败，请确认它已登录并能在终端使用。' : `模型服务返回 HTTP ${status}，请检查模型与服务状态。`;
}

async function request(config: AiConfig, messages: PromptMessage[] | null) {
  const local = 'origin' in config;
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), local ? 125000 : 65000);
  try {
    const opts: LoopbackOptions = {
      method: messages ? 'POST' : 'GET',
      headers: {
        ...(config.secret ? { Authorization: `Bearer ${config.secret}` } : {}),
        ...(messages ? { 'Content-Type': 'application/json' } : {}),
      },
      ...(messages ? { body: JSON.stringify({ model: config.model, messages }) } : {}),
      credentials: 'omit',
      redirect: 'error',
      signal: controller.signal,
      ...(local ? { targetAddressSpace: 'loopback' } : {}),
    };
    const url = local
      ? `${bridgeOrigin}/${config.provider}/${messages ? 'chat/completions' : 'health'}`
      : `${config.provider === 'openrouter' ? openRouterUrl : compatibleUrl(config.baseUrl)}/chat/completions`;
    let response: Response;
    try {
      response = await fetch(url, opts);
    } catch {
      if (controller.signal.aborted) throw new Error('模型请求超时，请重试。');
      throw new Error(local
        ? '无法连接本机桥接器。请启动桥接器，并允许浏览器访问本机网络。'
        : '无法连接模型服务。请检查 HTTPS 地址，以及服务是否允许当前站点的跨域请求。');
    }
    if (!response.ok) throw new Error(errorForStatus(response.status, local));
    if (!messages) return '';
    const data = await response.json().catch(() => null);
    const content = data?.choices?.[0]?.message?.content;
    if (typeof content !== 'string' || !content.trim()) throw new Error('模型没有返回文本，请更换模型或重试。');
    return content.trim();
  } finally {
    window.clearTimeout(timer);
  }
}

export async function verify(config: AiConfig) {
  await request(config, 'origin' in config ? null : [{ role: 'user', content: 'Reply only with OK.' }]);
}

export async function complete(messages: PromptMessage[]) {
  const config = await read('ai', null);
  if (!config) throw new Error('请先在 AI 设置中连接模型。');
  return request(config, messages);
}

export function jsonFromModel(content: string): unknown {
  try {
    const fenced = content.match(/```(?:json)?\s*([\s\S]*?)```/i);
    return JSON.parse(fenced ? fenced[1] : content);
  } catch {
    throw new Error('模型返回的格式不正确，请重试或换一个模型。');
  }
}

export async function generateQuestions(language: Language, level: Level, topic: string) {
  const count = 5;
  const content = await complete([
    { role: 'system', content: `为中文母语学习者出 ${count} 道难度约为 CEFR ${level} 的${languages[language]}四选一题。题目与选项用目标语言，解析用中文。仅返回 JSON 数组，每项格式 {"prompt":"题干","choices":["A","B","C","D"],"answer":0,"explanation":"解析"}。answer 为从 0 开始的正确选项索引。每题只有一个正确答案。` },
    { role: 'user', content: `主题：${topic}` },
  ]);
  const raw = jsonFromModel(content);
  if (!Array.isArray(raw) || raw.length !== count || !raw.every(isQuestion)) {
    throw new Error('模型未生成完整的题组，请重试。');
  }
  return raw as Question[];
}

function isQuestion(value: unknown): value is Question {
  if (!value || typeof value !== 'object') return false;
  const item = value as Partial<Question>;
  return typeof item.prompt === 'string' && !!item.prompt.trim()
    && Array.isArray(item.choices) && item.choices.length === 4
    && item.choices.every(choice => typeof choice === 'string' && !!choice.trim())
    && new Set(item.choices).size === 4
    && typeof item.answer === 'number' && Number.isInteger(item.answer) && item.answer >= 0 && item.answer < 4
    && typeof item.explanation === 'string';
}
