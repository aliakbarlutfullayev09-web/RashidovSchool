#!/usr/bin/env node
import { pathToFileURL } from 'node:url';

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--url' && argv[i + 1]) out.url = argv[++i];
    else if (a === '--key' && argv[i + 1]) out.key = argv[++i];
    else if (a === '--jwt-a' && argv[i + 1]) out.jwtA = argv[++i];
    else if (a === '--jwt-b' && argv[i + 1]) out.jwtB = argv[++i];
    else if (a === '--user-a' && argv[i + 1]) out.userAId = argv[++i];
    else if (a === '--user-b' && argv[i + 1]) out.userBId = argv[++i];
    else if (a === '--init-data-a' && argv[i + 1]) out.initDataA = argv[++i];
    else if (a === '--init-data-b' && argv[i + 1]) out.initDataB = argv[++i];
    else if (a === '--auth-url' && argv[i + 1]) out.authUrl = argv[++i];
    else if (a === '--paid-lesson-id' && argv[i + 1]) out.paidLessonId = argv[++i];
  }
  return out;
}

export function decodeJwtClaims(jwtToken) {
  const parts = String(jwtToken || '').split('.');
  if (parts.length !== 3) return null;
  try {
    const b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const pad = '='.repeat((4 - (b64.length % 4)) % 4);
    return JSON.parse(Buffer.from(b64 + pad, 'base64').toString('utf8'));
  } catch {
    return null;
  }
}

export async function exchangeInitDataForJwt({ authUrl, initData, fetchImpl = fetch }) {
  const endpoint = String(authUrl || '').replace(/\/$/, '');
  if (!endpoint) throw new Error('AUTH_API_URL / --auth-url is required to exchange initData');
  const url = endpoint.endsWith('/api/auth/telegram') ? endpoint : `${endpoint}/api/auth/telegram`;
  const resp = await fetchImpl(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ initData, app: 'user' }),
  });
  const data = await resp.json().catch(() => ({}));
  if (!resp.ok || !data?.token) {
    throw new Error(`Failed initData exchange (${resp.status}): ${data?.error || data?.detail || 'no token'}`);
  }
  return { token: data.token, userId: data?.user?.telegram_id };
}

export async function runSmokeChecks({ supabaseUrl, anonKey, fetchImpl = fetch } = {}) {
  const url = String(supabaseUrl || '').replace(/\/$/, '');
  const key = String(anonKey || '').trim();
  if (!url || !key) {
    throw new Error('SUPABASE_URL and ANON_KEY are required');
  }

  const baseHeaders = {
    apikey: key,
    Authorization: `Bearer ${key}`,
    'Content-Type': 'application/json',
  };

  const results = [];
  const check = async (name, fn) => {
    try {
      const detail = await fn();
      results.push({ name, ok: true, detail });
    } catch (err) {
      results.push({ name, ok: false, detail: err?.message || String(err) });
    }
  };

  // 1. Unauthenticated REST SELECT must return 401/403 OR empty [] (never leak rows)
  const readTables = [
    'users',
    'payments',
    'transactions',
    'promo_codes',
    'questions',
    'lessons',
    'video_checkpoints',
    'bot_states',
    'exam_attempts',
  ];
  for (const tbl of readTables) {
    await check(`GET /rest/v1/${tbl} (anon)`, async () => {
      const resp = await fetchImpl(`${url}/rest/v1/${tbl}?select=*&limit=5`, {
        method: 'GET',
        headers: baseHeaders,
      });
      if (resp.status === 401 || resp.status === 403 || resp.status === 404) {
        return `HTTP ${resp.status} blocked`;
      }
      if (!resp.ok) {
        return `HTTP ${resp.status}`;
      }
      const data = await resp.json();
      if (Array.isArray(data) && data.length === 0) {
        return 'HTTP 200 empty [] (0 rows)';
      }
      throw new Error(`Leaked ${Array.isArray(data) ? data.length : '?'} rows from ${tbl}`);
    });
  }

  // 2. Service & protected RPCs must reject anon (401/403)
  const blockedRpcs = [
    ['increment_balance', { p_user_id: 1, p_delta: 100 }],
    ['complete_stars_payment', { p_merchant_trans_id: 'x', p_user_id: 1, p_total_stars: 5, p_telegram_charge_id: 'y' }],
    ['refund_stars_payment', { p_user_id: 1, p_total_stars: 5, p_telegram_charge_id: 'y' }],
    ['fail_pending_payment', { p_merchant_trans_id: 'x', p_target_status: 'failed' }],
    ['check_rate_limit', { p_key: 'smoke', p_limit: 5, p_window_seconds: 60 }],
    ['check_lesson_access', { p_user_id: 1, p_lesson_id: 1 }],
    ['redeem_promo', { p_code: 'TEST' }],
    ['freeze_streak_rpc', {}],
    ['get_lessons_catalog', { p_course_id: 1 }],
    ['get_public_subjects', {}],
  ];
  for (const [fnName, payload] of blockedRpcs) {
    await check(`POST /rest/v1/rpc/${fnName} (anon)`, async () => {
      const resp = await fetchImpl(`${url}/rest/v1/rpc/${fnName}`, {
        method: 'POST',
        headers: baseHeaders,
        body: JSON.stringify(payload),
      });
      if (resp.status === 401 || resp.status === 403) {
        return `HTTP ${resp.status} denied`;
      }
      throw new Error(`Expected 401/403 for anon rpc/${fnName}, got HTTP ${resp.status}`);
    });
  }

  // 3. Unauthenticated writes must be rejected (401/403)
  const writeProbes = [
    ['users', { telegram_id: 999888777, role: 'superadmin', balance: 999999 }],
    ['payments', { user_id: 1, merchant_trans_id: 'smoke_fake', amount: 1, status: 'paid' }],
    ['transactions', { user_id: 1, amount: 999, type: 'promo', description: 'smoke' }],
    ['promo_codes', { code: 'SMOKEFREE', bonus_amount: 1000, max_uses: 10 }],
    ['promo_uses', { promo_id: 1, user_id: 1 }],
    ['progress', { user_id: 1, lesson_id: 1, stars: 3, is_unlocked: true }],
    ['questions', { lesson_id: 1, text: 'smoke', options: ['a', 'b'], correct_option_index: 0 }],
    ['lessons', { course_id: 1, title: 'smoke', video_url: 'https://evil.test' }],
  ];
  for (const [tbl, body] of writeProbes) {
    await check(`POST /rest/v1/${tbl} write (anon)`, async () => {
      const resp = await fetchImpl(`${url}/rest/v1/${tbl}`, {
        method: 'POST',
        headers: { ...baseHeaders, Prefer: 'return=minimal' },
        body: JSON.stringify(body),
      });
      if (resp.status === 401 || resp.status === 403 || resp.status === 404) {
        return `HTTP ${resp.status} rejected`;
      }
      throw new Error(`Expected write rejection on ${tbl}, got HTTP ${resp.status}`);
    });
  }

  const failed = results.filter((r) => !r.ok);
  return { ok: failed.length === 0, passed: results.length - failed.length, failed: failed.length, results };
}

export async function runAuthIsolationChecks({
  supabaseUrl,
  anonKey,
  jwtA,
  jwtB,
  userAId = null,
  userBId = null,
  paidLessonId = null,
  fetchImpl = fetch,
} = {}) {
  const url = String(supabaseUrl || '').replace(/\/$/, '');
  const key = String(anonKey || '').trim();
  if (!url || !key || !jwtA || !jwtB) {
    throw new Error('supabaseUrl, anonKey, jwtA, and jwtB are required');
  }

  const claimsA = decodeJwtClaims(jwtA) || {};
  const claimsB = decodeJwtClaims(jwtB) || {};
  const uidA = Number(userAId || claimsA.telegram_id || claimsA.sub);
  const uidB = Number(userBId || claimsB.telegram_id || claimsB.sub);
  if (!uidA || !uidB || uidA === uidB) {
    throw new Error('Two distinct numeric user IDs (userAId != userBId) are required');
  }

  const headersA = {
    apikey: key,
    Authorization: `Bearer ${jwtA}`,
    'Content-Type': 'application/json',
  };

  const results = [];
  const check = async (name, fn) => {
    try {
      const detail = await fn();
      results.push({ name, ok: true, detail });
    } catch (err) {
      results.push({ name, ok: false, detail: err?.message || String(err) });
    }
  };

  // 1. User A cannot read User B rows in users, progress, transactions, payments, daily_quests
  const crossReads = [
    ['users', 'telegram_id'],
    ['progress', 'user_id'],
    ['transactions', 'user_id'],
    ['payments', 'user_id'],
    ['daily_quests', 'user_id'],
  ];
  for (const [tbl, col] of crossReads) {
    await check(`GET /rest/v1/${tbl}?${col}=eq.${uidB} as A`, async () => {
      const resp = await fetchImpl(`${url}/rest/v1/${tbl}?${col}=eq.${encodeURIComponent(uidB)}&select=*&limit=5`, {
        method: 'GET',
        headers: headersA,
      });
      if (resp.status === 401 || resp.status === 403 || resp.status === 404) {
        return `HTTP ${resp.status} blocked`;
      }
      if (!resp.ok) return `HTTP ${resp.status}`;
      const rows = await resp.json();
      if (Array.isArray(rows) && rows.length === 0) {
        return 'HTTP 200 empty [] (B isolated)';
      }
      throw new Error(`Cross-tenant leak: A read ${rows.length} row(s) of B in ${tbl}`);
    });
  }

  // 2. User A cannot UPDATE protected fields (balance, xp, debt, role) on self OR on B
  const protectedPatches = [
    { balance: 999999 },
    { xp: 999999 },
    { debt: 0 },
    { role: 'superadmin' },
  ];
  for (const patch of protectedPatches) {
    const field = Object.keys(patch)[0];
    await check(`PATCH users.${field} on self (A) denied`, async () => {
      const resp = await fetchImpl(`${url}/rest/v1/users?telegram_id=eq.${encodeURIComponent(uidA)}`, {
        method: 'PATCH',
        headers: { ...headersA, Prefer: 'return=representation' },
        body: JSON.stringify(patch),
      });
      if (resp.status >= 400) return `HTTP ${resp.status} rejected`;
      throw new Error(`SECURITY FAILURE: A updated own users.${field} (HTTP ${resp.status})`);
    });

    await check(`PATCH users.${field} on B denied`, async () => {
      const resp = await fetchImpl(`${url}/rest/v1/users?telegram_id=eq.${encodeURIComponent(uidB)}`, {
        method: 'PATCH',
        headers: { ...headersA, Prefer: 'return=representation' },
        body: JSON.stringify(patch),
      });
      if (resp.status >= 400) return `HTTP ${resp.status} rejected`;
      const body = await resp.json().catch(() => null);
      if (Array.isArray(body) && body.length === 0) {
        return 'HTTP 200 0 rows affected';
      }
      throw new Error(`SECURITY FAILURE: A modified B users.${field}`);
    });
  }

  // 3. User A cannot read lessons.video_url via /rest/v1/lessons or locked lesson video_url via get_lessons_catalog
  await check('GET /rest/v1/lessons?select=id,video_url as A returns empty/403', async () => {
    const resp = await fetchImpl(`${url}/rest/v1/lessons?select=id,video_url&limit=5`, {
      method: 'GET',
      headers: headersA,
    });
    if (resp.status === 401 || resp.status === 403 || resp.status === 404) return `HTTP ${resp.status} blocked`;
    const rows = await resp.json().catch(() => []);
    if (Array.isArray(rows) && rows.length === 0) return 'HTTP 200 empty []';
    throw new Error(`Leaked ${rows.length} rows via direct /rest/v1/lessons`);
  });

  await check('POST /rest/v1/rpc/get_lessons_catalog hides video_url on locked lessons', async () => {
    const resp = await fetchImpl(`${url}/rest/v1/rpc/get_lessons_catalog`, {
      method: 'POST',
      headers: headersA,
      body: JSON.stringify({}),
    });
    if (resp.status === 401 || resp.status === 403) {
      throw new Error(`Authenticated caller denied get_lessons_catalog: HTTP ${resp.status}`);
    }
    const rows = await resp.json();
    if (!Array.isArray(rows)) {
      throw new Error('Unexpected non-array response from get_lessons_catalog');
    }
    const leaked = rows.filter((l) => l?.is_locked && l?.video_url);
    if (leaked.length > 0) {
      throw new Error(`Locked lesson video_url leaked for ids: ${leaked.map((x) => x.id).join(',')}`);
    }
    if (paidLessonId !== null && paidLessonId !== undefined) {
      const target = rows.find((l) => Number(l.id) === Number(paidLessonId));
      if (!target) throw new Error(`Specified paidLessonId=${paidLessonId} not found in catalog`);
      if (target.video_url !== null) throw new Error(`paidLessonId=${paidLessonId} exposed video_url`);
    }
    return `Checked ${rows.length} catalog lessons (0 locked video_url leaks)`;
  });

  // 4. Service RPCs must deny authenticated callers (401/403)
  const serviceRpcs = [
    ['increment_balance', { p_user_id: uidA, p_delta: 500 }],
    ['complete_stars_payment', { p_merchant_trans_id: 'x', p_user_id: uidA, p_total_stars: 5, p_telegram_charge_id: 'y' }],
    ['refund_stars_payment', { p_user_id: uidA, p_total_stars: 5, p_telegram_charge_id: 'y' }],
    ['fail_pending_payment', { p_merchant_trans_id: 'x', p_target_status: 'failed' }],
    ['check_rate_limit', { p_key: 'smoke_auth', p_limit: 5, p_window_seconds: 60 }],
    ['check_lesson_access', { p_user_id: uidA, p_lesson_id: 1 }],
    ['freeze_streak_service', { p_user_id: uidA }],
  ];
  for (const [fnName, payload] of serviceRpcs) {
    await check(`POST /rest/v1/rpc/${fnName} as authenticated denied`, async () => {
      const resp = await fetchImpl(`${url}/rest/v1/rpc/${fnName}`, {
        method: 'POST',
        headers: headersA,
        body: JSON.stringify(payload),
      });
      if (resp.status === 401 || resp.status === 403) return `HTTP ${resp.status} denied`;
      throw new Error(`Authenticated user executed service RPC ${fnName} (HTTP ${resp.status})`);
    });
  }

  // 5. Direct inserts into transactions, promo_uses, payments must fail
  const blockedInserts = [
    ['transactions', { user_id: uidA, amount: 5000, type: 'promo', description: 'smoke_auth' }],
    ['promo_uses', { promo_id: 1, user_id: uidA }],
    ['payments', { user_id: uidA, merchant_trans_id: 'smoke_auth_order', amount: 10, status: 'paid' }],
  ];
  for (const [tbl, body] of blockedInserts) {
    await check(`POST /rest/v1/${tbl} direct write as authenticated denied`, async () => {
      const resp = await fetchImpl(`${url}/rest/v1/${tbl}`, {
        method: 'POST',
        headers: { ...headersA, Prefer: 'return=minimal' },
        body: JSON.stringify(body),
      });
      if (resp.status === 401 || resp.status === 403 || resp.status === 404) {
        return `HTTP ${resp.status} denied`;
      }
      throw new Error(`Authenticated A inserted into ${tbl} directly (HTTP ${resp.status})`);
    });
  }

  const failed = results.filter((r) => !r.ok);
  return { ok: failed.length === 0, passed: results.length - failed.length, failed: failed.length, results };
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  const args = parseArgs(process.argv.slice(2));
  const supabaseUrl = args.url || process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const anonKey = args.key || process.env.ANON_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

  try {
    const anonSummary = await runSmokeChecks({ supabaseUrl, anonKey });
    for (const r of anonSummary.results) {
      console.log(`${r.ok ? 'PASS' : 'FAIL'} | ${r.name} -> ${r.detail}`);
    }
    console.log(`\nAnon smoke: ${anonSummary.passed} passed, ${anonSummary.failed} failed`);

    let jwtA = args.jwtA || process.env.JWT_A || '';
    let jwtB = args.jwtB || process.env.JWT_B || '';
    let userAId = args.userAId || process.env.USER_A_ID || null;
    let userBId = args.userBId || process.env.USER_B_ID || null;
    const initDataA = args.initDataA || process.env.INIT_DATA_A || '';
    const initDataB = args.initDataB || process.env.INIT_DATA_B || '';
    const authUrl = args.authUrl || process.env.AUTH_API_URL || '';
    const paidLessonId = args.paidLessonId || process.env.PAID_LESSON_ID || null;

    if ((!jwtA || !jwtB) && initDataA && initDataB) {
      const exA = await exchangeInitDataForJwt({ authUrl, initData: initDataA });
      const exB = await exchangeInitDataForJwt({ authUrl, initData: initDataB });
      jwtA = exA.token;
      jwtB = exB.token;
      userAId = userAId || exA.userId;
      userBId = userBId || exB.userId;
    }

    let authOk = true;
    if (jwtA && jwtB) {
      const authSummary = await runAuthIsolationChecks({
        supabaseUrl,
        anonKey,
        jwtA,
        jwtB,
        userAId,
        userBId,
        paidLessonId,
      });
      console.log('\n--- Authenticated A/B Isolation Checks ---');
      for (const r of authSummary.results) {
        console.log(`${r.ok ? 'PASS' : 'FAIL'} | ${r.name} -> ${r.detail}`);
      }
      console.log(`\nAuth A/B smoke: ${authSummary.passed} passed, ${authSummary.failed} failed`);
      authOk = authSummary.ok;
    } else {
      console.log('\nAuth A/B smoke SKIPPED (provide JWT_A+JWT_B or INIT_DATA_A+INIT_DATA_B+AUTH_API_URL).');
    }

    process.exit(anonSummary.ok && authOk ? 0 : 1);
  } catch (err) {
    console.error(`Smoke check aborted: ${err.message}`);
    console.error('Usage: node scripts/smoke_rls.mjs --url https://<test-ref>.supabase.co --key <ANON_KEY> [--jwt-a <JWT_A> --jwt-b <JWT_B>]');
    process.exit(2);
  }
}
