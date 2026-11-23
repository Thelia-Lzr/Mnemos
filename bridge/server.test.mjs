import { strict as assert } from 'node:assert';
import { Readable } from 'node:stream';
import { EventEmitter } from 'node:events';
import { test } from 'node:test';
import { createBridge } from './server.mjs';

const origin = 'https://example.github.io';
const token = 'test-pairing-code';

function request(server, overrides = {}) {
  const { method = 'POST', url = '/codex/chat/completions', headers = {}, body, ...rest } = overrides;
  const data = body ?? { model: '', messages: [{ role: 'user', content: 'Bonjour' }] };
  const req = Object.assign(Readable.from([Buffer.from(JSON.stringify(data))]), {
    method, url, headers: {
      host: '127.0.0.1:47380', origin, authorization: `Bearer ${token}`, 'content-type': 'application/json', ...headers,
    }, ...rest,
  });
  return new Promise(resolve => {
    const res = Object.assign(new EventEmitter(), {
      headers: {},
      setHeader(key, value) { this.headers[key] = value; },
      writeHead(code) { this.code = code; },
      end(payload) { resolve({ status: this.code, headers: this.headers, payload: payload && JSON.parse(payload) }); },
    });
    server.emit('request', req, res);
  });
}

test('checks origin and pairing code and forwards text only to the selected CLI', async () => {
  const calls = [];
  const { server } = createBridge(origin, token, async (...args) => {
    calls.push(args);
    return 'Salut !';
  });
  assert.equal((await request(server, { headers: { origin: 'https://other.example' } })).status, 403);
  assert.equal((await request(server, { headers: { authorization: 'Bearer incorrect' } })).status, 401);
  assert.equal((await request(server, { body: { model: '--unexpected-flag', messages: [{ role: 'user', content: 'Hello' }] } })).status, 400);
  const preflight = await request(server, { method: 'OPTIONS' });
  assert.equal(preflight.status, 204);
  assert.equal(preflight.headers['Access-Control-Allow-Origin'], origin);
  for (const provider of ['codex', 'claude']) {
    const result = await request(server, { url: `/${provider}/chat/completions` });
    assert.equal(result.status, 200);
    assert.equal(result.payload.choices[0].message.content, 'Salut !');
  }
  assert.deepEqual(calls.map(call => call[0]), ['codex', 'claude']);
});
