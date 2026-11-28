import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { signSupabaseJwt } from '../user-app/api/_lib/telegramAuth.js';
import { createUserAuthHandler } from '../user-app/api/auth/telegram.js';
import { createStarsInvoiceHandler } from '../user-app/api/create-invoice.js';
import { createSendLessonVideoHandler } from '../user-app/api/send-lesson-video.js';
import { safeDownloadVideoStream, validateExternalVideoUrl } from '../user-app/api/_lib/ssrfGuard.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function mockRes() {
  return {
    statusCode: 200,
    headers: {},
    body: null,
    setHeader(k, v) {
      this.headers[k.toLowerCase()] = v;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
    end() {
      return this;
    },
  };
}

test('send-lesson-video returns 401 without auth, 403 without access, and 429 on rate limit', async () => {
  const jwtSecret = 'test-video-jwt-secret';
  const jwt = signSupabaseJwt({ telegramId: 333444, appRole: 'student', jwtSecret, ttlSeconds: 600 });
  const allowAllRate = async () => ({ allowed: true, retry_after: 0 });

  // 1. 401 without authentication
  const hUnauth = createSendLessonVideoHandler({
    env: {
      STUDENT_BOT_TOKEN: '123:BOT',
      SUPABASE_URL: 'https://proj.supabase.co',
      SUPABASE_SERVICE_ROLE_KEY: 'srv-key',
      SUPABASE_JWT_SECRET: jwtSecret,
    },
    limiterFn: allowAllRate,
  });
  const r401 = mockRes();
  await hUnauth({ method: 'POST', headers: {}, body: { lessonId: 10 } }, r401);
  assert.equal(r401.statusCode, 401);
  assert.equal(r401.headers['x-content-type-options'], 'nosniff');

  // 2. 403 when lesson is locked / unpaid (ignores any client videoUrl/userId!)
  const hLocked = createSendLessonVideoHandler({
    env: {
      STUDENT_BOT_TOKEN: '123:BOT',
      SUPABASE_URL: 'https://proj.supabase.co',
      SUPABASE_SERVICE_ROLE_KEY: 'srv-key',
      SUPABASE_JWT_SECRET: jwtSecret,
    },
    limiterFn: allowAllRate,
    fetchImpl: async () => ({
      ok: true,
      async json() {
        return { found: true, allowed: false, title: 'Paid Lesson', video_url: null };
      },
    }),
  });
  const r403 = mockRes();
  await hLocked(
    {
      method: 'POST',
      headers: { authorization: `Bearer ${jwt}` },
      body: { lessonId: 10, userId: 999999, videoUrl: 'https://127.0.0.1/secret' },
    },
    r403
  );
  assert.equal(r403.statusCode, 403);
  assert.equal(r403.body.code, 'ACCESS_DENIED');

  // 3. 429 when rate limit is exceeded
  const hLimited = createSendLessonVideoHandler({
    env: {
      STUDENT_BOT_TOKEN: '123:BOT',
      SUPABASE_URL: 'https://proj.supabase.co',
      SUPABASE_SERVICE_ROLE_KEY: 'srv-key',
      SUPABASE_JWT_SECRET: jwtSecret,
    },
    limiterFn: async () => ({ allowed: false, retry_after: 42 }),
  });
  const r429 = mockRes();
  await hLimited(
    { method: 'POST', headers: { authorization: `Bearer ${jwt}` }, body: { lessonId: 10 } },
    r429
  );
  assert.equal(r429.statusCode, 429);
  assert.equal(r429.headers['retry-after'], '42');
});

test('SSRF guard blocks 127.0.0.1, 169.254.169.254, private DNS resolution, and redirects to internal hosts', async () => {
  const allowedHosts = ['proj.supabase.co'];
  const publicLookup = async () => [{ address: '93.184.216.34' }];

  await assert.rejects(
    () => validateExternalVideoUrl('https://127.0.0.1/video.mp4', { allowedHosts, lookupFn: publicLookup }),
    (err) => err.code === 'SSRF_BLOCKED'
  );
  await assert.rejects(
    () => validateExternalVideoUrl('https://169.254.169.254/latest/meta-data/', { allowedHosts, lookupFn: publicLookup }),
    (err) => err.code === 'SSRF_BLOCKED'
  );
  await assert.rejects(
    () => validateExternalVideoUrl('http://proj.supabase.co/video.mp4', { allowedHosts, lookupFn: publicLookup }),
    (err) => err.code === 'SSRF_BLOCKED'
  );
  await assert.rejects(
    () =>
      validateExternalVideoUrl('https://proj.supabase.co/video.mp4', {
        allowedHosts,
        lookupFn: async () => [{ address: '169.254.169.254' }],
      }),
    (err) => err.code === 'SSRF_BLOCKED'
  );

  // Redirect (e.g. 302 to http://127.0.0.1/) is rejected when redirect='manual' returns 302
  await assert.rejects(
    () =>
      safeDownloadVideoStream('https://proj.supabase.co/storage/v1/video.mp4', {
        allowedHosts,
        lookupFn: publicLookup,
        fetchImpl: async (_url, init) => {
          assert.equal(init.redirect, 'manual');
          return {
            status: 302,
            ok: false,
            headers: new Headers({ location: 'http://127.0.0.1/admin' }),
          };
        },
      }),
    (err) => err.code === 'SSRF_REDIRECT_BLOCKED'
  );
});

test('rate limit triggers 429 on create-invoice and /api/auth/telegram', async () => {
  const jwtSecret = 'test-rate-secret';
  const jwt = signSupabaseJwt({ telegramId: 444555, appRole: 'student', jwtSecret, ttlSeconds: 600 });

  const invHandler = createStarsInvoiceHandler({
    env: {
      STUDENT_BOT_TOKEN: '123:BOT',
      SUPABASE_URL: 'https://proj.supabase.co',
      SUPABASE_SERVICE_ROLE_KEY: 'srv',
      SUPABASE_JWT_SECRET: jwtSecret,
    },
    limiterFn: async () => ({ allowed: false, retry_after: 15 }),
  });
  const rInv = mockRes();
  await invHandler({ method: 'POST', headers: { authorization: `Bearer ${jwt}` }, body: { productId: 'stars_5' } }, rInv);
  assert.equal(rInv.statusCode, 429);
  assert.equal(rInv.headers['retry-after'], '15');

  const authHandler = createUserAuthHandler({
    env: {
      STUDENT_BOT_TOKEN: '123:BOT',
      SUPABASE_URL: 'https://proj.supabase.co',
      SUPABASE_SERVICE_ROLE_KEY: 'srv',
    },
    limiterFn: async () => ({ allowed: false, retry_after: 30 }),
  });
  const rAuth = mockRes();
  await authHandler({ method: 'POST', headers: { 'x-real-ip': '203.0.113.9' }, body: { initData: 'x' } }, rAuth);
  assert.equal(rAuth.statusCode, 429);
  assert.equal(rAuth.headers['retry-after'], '30');
});

test('vercel.json files configure security headers', () => {
  for (const rel of ['user-app/vercel.json', 'admin-app/vercel.json']) {
    const cfg = JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8'));
    const allHeaders = cfg.headers.flatMap((h) => h.headers.map((x) => `${x.key}:${x.value}`));
    assert.ok(allHeaders.some((x) => x === 'X-Content-Type-Options:nosniff'));
    assert.ok(allHeaders.some((x) => x.startsWith('Content-Security-Policy:frame-ancestors')));
    assert.ok(allHeaders.some((x) => x === 'Cache-Control:no-store'));
  }
});
