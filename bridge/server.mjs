import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { randomBytes, timingSafeEqual } from 'node:crypto';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const host = '127.0.0.1';
const port = 47380;
const maxInput = 1_048_576;
const maxOutput = 1_048_576;
const allowedRoles = new Set(['system', 'user', 'assistant']);

function cliCommand(provider, model, output) {
  const modelArgs = model ? ['--model', model] : [];
  if (provider === 'codex') {
    return ['codex', '--ask-for-approval', 'never', 'exec', '--sandbox', 'read-only',
      '--skip-git-repo-check', '--ephemeral', '--ignore-user-config',
      '--disable', 'shell_tool', '--disable', 'hooks', '--disable', 'plugins',
      '-c', 'mcp_servers={}', '-c', 'web_search="disabled"',
      '--output-last-message', output, ...modelArgs, '-'];
  }
  return ['claude', '--safe-mode', '--print', '--output-format', 'json',
    '--no-session-persistence', '--tools', '', '--strict-mcp-config', '--mcp-config',
    '{"mcpServers":{}}', '--disallowed-tools', '*', '--disable-slash-commands',
    '--max-turns', '1', ...modelArgs];
}

function runProcess(command, args, directory, input, signal) {
  return new Promise((resolve, reject) => {
    const grouped = process.platform !== 'win32';
    const child = spawn(command, args, {
      cwd: directory,
      stdio: ['pipe', 'pipe', 'ignore'],
      shell: false,
      detached: grouped,
      windowsHide: true,
    });
    const chunks = [];
    let size = 0;
    let canceled = false;
    function cancel() {
      canceled = true;
      if (!child.pid) return;
      try {
        if (grouped) process.kill(-child.pid, 'SIGKILL');
        else child.kill();
      } catch (error) {
        if (error.code !== 'ESRCH') child.kill();
      }
    }
    signal.addEventListener('abort', cancel, { once: true });
    if (signal.aborted) cancel();
    child.on('error', reject);
    child.on('close', code => {
      signal.removeEventListener('abort', cancel);
      if (canceled || code !== 0) reject(new Error('CLI execution failed'));
      else resolve(Buffer.concat(chunks).toString('utf8'));
    });
    child.stdout.on('data', chunk => {
      size += chunk.length;
      if (size > maxOutput) cancel();
      else chunks.push(chunk);
    });
    child.stdin.on('error', () => {});
    child.stdin.end(input);
  });
}

async function infer(provider, model, messages, signal) {
  const directory = await mkdtemp(join(tmpdir(), 'mnemos-bridge-'));
  try {
    const output = join(directory, 'answer.txt');
    const [command, ...args] = cliCommand(provider, model, output);
    const prompt = 'You are a language-learning text model. Reply to the last user message using the conversation below.\n'
      + JSON.stringify(messages);
    const stdout = await runProcess(command, args, directory, prompt, signal);
    if (provider === 'codex') return (await readFile(output, 'utf8')).trim();
    const result = JSON.parse(stdout);
    if (result.is_error || typeof result.result !== 'string') throw new Error('CLI execution failed');
    return result.result.trim();
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

async function readInput(request) {
  if (!/^application\/json(?:\s*;|$)/i.test(request.headers['content-type'] ?? '')) return null;
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > maxInput) return null;
    chunks.push(chunk);
  }
  try {
    const data = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    if (typeof data?.model !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9:/_.@-]{0,149}$|^$/.test(data.model)
      || !Array.isArray(data.messages) || !data.messages.length || data.messages.length > 20
      || !data.messages.every(message => message && allowedRoles.has(message.role)
        && typeof message.content === 'string' && message.content.length <= 50_000)) return null;
    return data;
  } catch {
    return null;
  }
}

function reply(response, status, data) {
  if (response.destroyed) return;
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  response.end(data ? JSON.stringify(data) : undefined);
}

export function createBridge(origin, token, run = infer) {
  const expected = Buffer.from(`Bearer ${token}`);
  let active;
  const server = createServer({ requestTimeout: 15_000, headersTimeout: 10_000 }, async (req, res) => {
    if (req.headers.host !== `${host}:${port}` || req.headers.origin !== origin) {
      reply(res, 403);
      return;
    }
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    const match = req.url?.match(/^\/(codex|claude)\/(health|chat\/completions)$/);
    if (!match) return reply(res, 404);
    const [, provider, route] = match;
    if (req.method === 'OPTIONS') {
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
      res.setHeader('Access-Control-Allow-Private-Network', 'true');
      return reply(res, 204);
    }
    const actual = Buffer.from(req.headers.authorization || '');
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return reply(res, 401);

    if (req.method === 'GET' && route === 'health') {
      try {
        await runProcess(provider, ['--version'], tmpdir(), '', AbortSignal.timeout(5000));
        return reply(res, 200, { provider });
      } catch {
        return reply(res, 404);
      }
    }
    if (req.method !== 'POST' || route !== 'chat/completions') return reply(res, 405);
    if (active) return reply(res, 429);

    const controller = new AbortController();
    active = controller;
    const timer = setTimeout(() => controller.abort(), 120_000);
    res.on('close', () => controller.abort());
    try {
      const body = await readInput(req);
      if (!body) return reply(res, 400);
      const content = await run(provider, body.model, body.messages, controller.signal);
      if (!content || Buffer.byteLength(content) > maxOutput) return reply(res, 502);
      reply(res, 200, { choices: [{ message: { role: 'assistant', content } }] });
    } catch (error) {
      reply(res, error.code === 'ENOENT' ? 404 : controller.signal.aborted ? 504 : 502);
    } finally {
      clearTimeout(timer);
      active = undefined;
    }
  });
  server.on('close', () => active?.abort());
  return { server, stop: () => { active?.abort(); server.close(); server.closeAllConnections(); } };
}

function start() {
  const flag = process.argv.indexOf('--origin');
  const origin = flag < 0 ? 'http://localhost:3000' : process.argv[flag + 1];
  const url = new URL(origin);
  const localHttp = url.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  if (url.origin !== origin || (!localHttp && url.protocol !== 'https:')) {
    throw new Error('Use a single HTTPS origin or a localhost HTTP origin, without a path.');
  }
  const token = randomBytes(24).toString('base64url');
  const { server, stop } = createBridge(origin, token);
  process.once('SIGINT', stop);
  process.once('SIGTERM', stop);
  server.listen(port, host, () => {
    console.log(`Mnemos bridge: http://${host}:${port}\nAllowed origin: ${origin}\nPairing code: ${token}`);
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) start();
