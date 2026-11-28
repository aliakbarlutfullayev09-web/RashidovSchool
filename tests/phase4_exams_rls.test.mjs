import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import { createExamQuestionsHandler } from '../user-app/api/exams/questions.js';
import { createExamSubmitHandler } from '../user-app/api/exams/submit.js';
import { signSupabaseJwt } from '../user-app/api/_lib/telegramAuth.js';
import { DEFAULT_EXAM_PORTAL_DATA as CLIENT_EXAM_DEFAULTS } from '../user-app/src/api/examDefaults.js';
import { runAuthIsolationChecks, runSmokeChecks } from '../scripts/smoke_rls.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

function mockRes() {
  const headers = {};
  return {
    statusCode: 200,
    body: null,
    headers,
    setHeader(k, v) {
      headers[k.toLowerCase()] = v;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.body = data;
      return this;
    },
    end() {
      return this;
    },
  };
}

test('client examDefaults.js contains zero questions or answer keys', () => {
  const src = fs.readFileSync(path.join(ROOT, 'user-app/src/api/examDefaults.js'), 'utf8');
  assert.equal(/^\s*(correctIndex|correctAnswer|correct_option_index|correct_option)\s*:/m.test(src), false);
  const firstVariant = CLIENT_EXAM_DEFAULTS.subjects.biologiya.dtm[0];
  assert.deepEqual(firstVariant.questions, []);
});

test('/api/exams/questions requires auth and strips all answer keys', async () => {
  const env = { SUPABASE_JWT_SECRET: 'test-jwt-secret-123456' };
  const handler = createExamQuestionsHandler({
    env,
    limiterFn: async () => ({ allowed: true, retryAfter: 0 }),
  });

  // 1. Negative: unauthenticated -> 401
  const res401 = mockRes();
  await handler({ method: 'GET', headers: {} }, res401);
  assert.equal(res401.statusCode, 401);

  // 2. Authenticated: 200 with zero correctIndex/correctAnswer anywhere in JSON
  const jwt = signSupabaseJwt({ telegramId: 1001, appRole: 'student', jwtSecret: env.SUPABASE_JWT_SECRET });
  const res200 = mockRes();
  await handler({ method: 'GET', headers: { authorization: `Bearer ${jwt}` } }, res200);
  assert.equal(res200.statusCode, 200);
  assert.equal(res200.body.ok, true);

  const jsonStr = JSON.stringify(res200.body.portalData);
  assert.equal(jsonStr.includes('correctIndex'), false);
  assert.equal(jsonStr.includes('correctAnswer'), false);
  assert.equal(res200.body.portalData.subjects.biologiya.dtm[0].questions.length > 0, true);
});

test('/api/exams/submit requires auth, grades on server, and is idempotent by attemptId', async () => {
  const env = {
    SUPABASE_JWT_SECRET: 'test-jwt-secret-123456',
    SUPABASE_URL: 'https://test.supabase.local',
    SUPABASE_SERVICE_ROLE_KEY: 'srv-key',
  };

  const attemptsStore = new Map();
  const fakeFetch = async (url, opts = {}) => {
    const u = String(url);
    if (u.includes('/rest/v1/subjects')) {
      return { ok: true, json: async () => [] };
    }
    if (u.includes('/rest/v1/exam_attempts') && (!opts.method || opts.method === 'GET')) {
      const m = u.match(/attempt_id=eq\.([^&]+)/);
      const id = m ? decodeURIComponent(m[1]) : '';
      const row = attemptsStore.get(id);
      return { ok: true, json: async () => (row ? [row] : []) };
    }
    if (u.includes('/rest/v1/exam_attempts') && opts.method === 'POST') {
      const payload = JSON.parse(opts.body);
      if (attemptsStore.has(payload.attempt_id)) {
        return { ok: true, json: async () => [] };
      }
      attemptsStore.set(payload.attempt_id, payload);
      return { ok: true, json: async () => [payload] };
    }
    return { ok: false, json: async () => ({}) };
  };

  const handler = createExamSubmitHandler({
    env,
    fetchImpl: fakeFetch,
    limiterFn: async () => ({ allowed: true, retryAfter: 0 }),
  });

  // Negative: 401 without auth
  const resUnauth = mockRes();
  await handler({ method: 'POST', headers: {}, body: {} }, resUnauth);
  assert.equal(resUnauth.statusCode, 401);

  const jwt = signSupabaseJwt({ telegramId: 2002, appRole: 'student', jwtSecret: env.SUPABASE_JWT_SECRET });
  const attemptId = '11111111-2222-4333-8444-555555555555';

  // Submit bio-dtm-1 Q0=1 (Mitoxondriya -> correct) & Q1=1 (Metafaza -> correct)
  const req1 = {
    method: 'POST',
    headers: { authorization: `Bearer ${jwt}` },
    body: {
      attemptId,
      subjectKey: 'biologiya',
      mode: 'dtm',
      testId: 'bio-dtm-1',
      answers: { 0: 1, 1: 1 },
    },
  };
  const res1 = mockRes();
  await handler(req1, res1);
  assert.equal(res1.statusCode, 200);
  assert.equal(res1.body.ok, true);
  assert.equal(res1.body.alreadySubmitted, false);
  assert.equal(res1.body.correctCount >= 2, true);
  assert.equal(res1.body.rewardNeyrons, 0);
  // Aggregate score only: no per-question isCorrect or questionResults breakdown
  assert.equal('questionResults' in res1.body, false);
  assert.equal('isCorrect' in res1.body, false);
  const submitJson = JSON.stringify(res1.body);
  assert.equal(submitJson.includes('correctIndex'), false);
  assert.equal(submitJson.includes('correctAnswer'), false);
  assert.equal(submitJson.includes('isCorrect'), false);

  // Repeat submit with DIFFERENT answers & same attemptId -> idempotent cached result, not re-graded
  const res2 = mockRes();
  await handler(
    {
      method: 'POST',
      headers: { authorization: `Bearer ${jwt}` },
      body: {
        attemptId,
        subjectKey: 'biologiya',
        mode: 'dtm',
        testId: 'bio-dtm-1',
        answers: {},
      },
    },
    res2
  );
  assert.equal(res2.statusCode, 200);
  assert.equal(res2.body.alreadySubmitted, true);
  assert.equal(res2.body.score, res1.body.score);
  assert.equal(res2.body.correctCount, res1.body.correctCount);
});

test('/api/exams/submit enforces daily attempt limit (3 attempts per variant / 24h)', async () => {
  const env = {
    SUPABASE_JWT_SECRET: 'test-jwt-secret-123456',
    SUPABASE_URL: 'https://test.supabase.local',
    SUPABASE_SERVICE_ROLE_KEY: 'srv-key',
  };
  const fakeFetch = async (url) => {
    const u = String(url);
    if (u.includes('created_at=gte.')) {
      return {
        ok: true,
        json: async () => [{ attempt_id: 'a1' }, { attempt_id: 'a2' }, { attempt_id: 'a3' }],
      };
    }
    return { ok: true, json: async () => [] };
  };
  const handler = createExamSubmitHandler({
    env,
    fetchImpl: fakeFetch,
    limiterFn: async () => ({ allowed: true, retryAfter: 0 }),
  });
  const jwt = signSupabaseJwt({ telegramId: 3003, appRole: 'student', jwtSecret: env.SUPABASE_JWT_SECRET });
  const res429 = mockRes();
  await handler(
    {
      method: 'POST',
      headers: { authorization: `Bearer ${jwt}` },
      body: {
        attemptId: 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee',
        subjectKey: 'biologiya',
        mode: 'dtm',
        testId: 'bio-dtm-1',
        answers: { 0: 1 },
      },
    },
    res429
  );
  assert.equal(res429.statusCode, 429);
  assert.equal(res429.body.code, 'EXAM_ATTEMPT_LIMIT_REACHED');
});

test('removed components have zero references anywhere in user-app/src or admin-app/src', () => {
  const res = spawnSync(
    'git',
    [
      'grep',
      '-n',
      '-w',
      '-E',
      'PromoCode|PromoModal|MistakesModal|BottomSheet|LevelNode|LevelPath|QuestsPage|ArenaPage',
      'user-app/src/',
      'admin-app/src/',
    ],
    { cwd: ROOT, encoding: 'utf8' }
  );
  assert.equal(res.status, 1);
  assert.equal((res.stdout || '').trim(), '');
});

test('smoke_rls script passes when RLS blocks anon and fails if rows leak', async () => {
  const secureFetch = async () => ({
    status: 403,
    ok: false,
    json: async () => [],
  });
  const okRes = await runSmokeChecks({
    supabaseUrl: 'https://test.supabase.local',
    anonKey: 'anon-test-key',
    fetchImpl: secureFetch,
  });
  assert.equal(okRes.ok, true);
  assert.equal(okRes.failed, 0);

  const leakyFetch = async (url) => {
    if (String(url).includes('/rest/v1/users')) {
      return { status: 200, ok: true, json: async () => [{ telegram_id: 1 }] };
    }
    return { status: 403, ok: false, json: async () => [] };
  };
  const failRes = await runSmokeChecks({
    supabaseUrl: 'https://test.supabase.local',
    anonKey: 'anon-test-key',
    fetchImpl: leakyFetch,
  });
  assert.equal(failRes.ok, false);
  assert.equal(failRes.failed >= 1, true);
});

test('smoke_rls authenticated A/B mode checks cross-user isolation, protected columns, locked video_url, and RPC denials', async () => {
  const jwtSecret = 'test-jwt-secret-123456';
  const jwtA = signSupabaseJwt({ telegramId: 1001, appRole: 'student', jwtSecret });
  const jwtB = signSupabaseJwt({ telegramId: 2002, appRole: 'student', jwtSecret });

  const secureFetch = async (url, opts = {}) => {
    const u = String(url);
    const m = (opts.method || 'GET').toUpperCase();
    if (m === 'GET' && /\/rest\/v1\/(users|progress|transactions|payments|daily_quests)\b/.test(u)) {
      return { status: 200, ok: true, json: async () => [] };
    }
    if (m === 'GET' && u.includes('/rest/v1/lessons')) {
      return { status: 200, ok: true, json: async () => [] };
    }
    if (u.includes('/rest/v1/rpc/get_lessons_catalog')) {
      return {
        status: 200,
        ok: true,
        json: async () => [
          { id: 10, is_locked: false, video_url: 'https://cdn.example/free.mp4' },
          { id: 20, is_locked: true, video_url: null },
        ],
      };
    }
    return { status: 403, ok: false, json: async () => ({ message: 'Forbidden' }) };
  };

  const passSummary = await runAuthIsolationChecks({
    supabaseUrl: 'https://test.supabase.local',
    anonKey: 'anon-test-key',
    jwtA,
    jwtB,
    paidLessonId: 20,
    fetchImpl: secureFetch,
  });
  assert.equal(passSummary.ok, true);
  assert.equal(passSummary.failed, 0);

  // Leak scenarios: A reads B's row in transactions + locked lesson exposes video_url
  const leakyFetch = async (url, opts = {}) => {
    const u = String(url);
    if (u.includes('/rest/v1/transactions') && (opts.method || 'GET') === 'GET') {
      return { status: 200, ok: true, json: async () => [{ user_id: 2002, amount: 500 }] };
    }
    if (u.includes('/rest/v1/rpc/get_lessons_catalog')) {
      return {
        status: 200,
        ok: true,
        json: async () => [{ id: 20, is_locked: true, video_url: 'https://cdn.example/leaked.mp4' }],
      };
    }
    return secureFetch(url, opts);
  };

  const failSummary = await runAuthIsolationChecks({
    supabaseUrl: 'https://test.supabase.local',
    anonKey: 'anon-test-key',
    jwtA,
    jwtB,
    paidLessonId: 20,
    fetchImpl: leakyFetch,
  });
  assert.equal(failSummary.ok, false);
  assert.equal(failSummary.failed >= 2, true);
});
