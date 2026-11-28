import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  signSupabaseJwt,
  verifyBearerJwt,
  verifyTelegramInitData,
} from '../user-app/api/_lib/telegramAuth.js';
import { createUserAuthHandler } from '../user-app/api/auth/telegram.js';
import { createAdminAuthHandler } from '../admin-app/api/auth/telegram.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function makeInitData(userObj, botToken, authDate, extra = {}) {
  const fields = {
    auth_date: String(authDate),
    query_id: 'AAHdF6IQAAAAAN0XohDhrOrc',
    user: JSON.stringify(userObj),
    ...extra,
  };
  const keys = Object.keys(fields).sort();
  const dataCheckString = keys.map((k) => `${k}=${fields[k]}`).join('\n');
  const secretKey = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
  fields.hash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');
  return new URLSearchParams(fields).toString();
}

function mockRes() {
  const res = {
    statusCode: 200,
    headers: {},
    body: null,
    setHeader(k, v) {
      this.headers[k] = v;
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
  return res;
}

test('Node HMAC verifyTelegramInitData accepts valid and rejects tampered/expired', () => {
  const token = '111222:TEST_TOKEN';
  const now = Math.floor(Date.now() / 1000);
  const initData = makeInitData({ id: 555666, first_name: 'Aziz' }, token, now - 10);

  const ok = verifyTelegramInitData(initData, [token], 3600, now);
  assert.equal(ok.telegramId, 555666);

  assert.throws(() => verifyTelegramInitData(initData.replace('555666', '777777'), [token], 3600, now), /signature/);
  assert.throws(() => verifyTelegramInitData(initData, [token], 5, now), /Expired/);
  assert.throws(
    () => verifyTelegramInitData(makeInitData({ id: 555666, first_name: 'Aziz' }, token, now - 3601), [token], 86400, now),
    /Expired/
  );
  assert.throws(() => verifyTelegramInitData(initData, ['999999:WRONG'], 3600, now), /signature/);

  const jwtSecret = 'test-secret-for-unit-test-only';
  const jwt = signSupabaseJwt({ telegramId: 555666, appRole: 'student', jwtSecret, ttlSeconds: 300, nowTs: now });
  const claims = verifyBearerJwt(jwt, jwtSecret, now + 50);
  assert.equal(claims.telegram_id, 555666);
  assert.equal(claims.app_role, 'student');
  assert.ok(claims.exp - claims.iat <= 3600);

  const cappedJwt = signSupabaseJwt({ telegramId: 555666, appRole: 'student', jwtSecret, ttlSeconds: 86400, nowTs: now });
  const cappedClaims = verifyBearerJwt(cappedJwt, jwtSecret, now);
  assert.equal(cappedClaims.exp - cappedClaims.iat, 3600);
});

test('user-app auth endpoint verifies initData and returns Supabase JWT', async () => {
  const botToken = '12345:STUDENT_TEST';
  const now = Math.floor(Date.now() / 1000);
  const initData = makeInitData({ id: 777001, first_name: 'Student', language_code: 'uz' }, botToken, now);

  const handler = createUserAuthHandler({
    env: {
      STUDENT_BOT_TOKEN: botToken,
      SUPABASE_URL: 'https://example.supabase.co',
      SUPABASE_SERVICE_ROLE_KEY: 'service-role-test',
      SUPABASE_JWT_SECRET: 'jwt-secret-test',
    },
    fetchImpl: async () => ({
      ok: true,
      async json() {
        return [{ telegram_id: 777001, role: 'student', full_name: 'Student', balance: 100 }];
      },
    }),
  });

  const resOk = mockRes();
  await handler({ method: 'POST', headers: {}, body: { initData } }, resOk);
  assert.equal(resOk.statusCode, 200);
  assert.equal(resOk.body.ok, true);
  assert.equal(resOk.body.user.telegram_id, 777001);
  assert.ok(resOk.body.token);

  const resBad = mockRes();
  await handler({ method: 'POST', headers: {}, body: { initData: initData + 'x' } }, resBad);
  assert.equal(resBad.statusCode, 401);
});

test('admin-app auth rejects student even with forged start_param and accepts DB superadmin', async () => {
  const adminToken = '99999:ADMIN_TEST';
  const now = Math.floor(Date.now() / 1000);
  const studentInitData = makeInitData(
    { id: 1001, first_name: 'RegularStudent' },
    adminToken,
    now,
    { start_param: 'superadmin' }
  );

  const studentRejectedHandler = createAdminAuthHandler({
    env: {
      ADMIN_BOT_TOKEN: adminToken,
      SUPABASE_URL: 'https://example.supabase.co',
      SUPABASE_SERVICE_ROLE_KEY: 'service-role-test',
      SUPABASE_JWT_SECRET: 'jwt-secret-test',
    },
    fetchImpl: async () => ({
      ok: true,
      async json() {
        return [{ telegram_id: 1001, role: 'student', full_name: 'RegularStudent' }];
      },
    }),
  });

  const resForbidden = mockRes();
  await studentRejectedHandler({ method: 'POST', headers: {}, body: { initData: studentInitData } }, resForbidden);
  assert.equal(resForbidden.statusCode, 403);

  const superadminHandler = createAdminAuthHandler({
    env: {
      ADMIN_BOT_TOKEN: adminToken,
      SUPABASE_URL: 'https://example.supabase.co',
      SUPABASE_SERVICE_ROLE_KEY: 'service-role-test',
      SUPABASE_JWT_SECRET: 'jwt-secret-test',
    },
    fetchImpl: async () => ({
      ok: true,
      async json() {
        return [{ telegram_id: 2002, role: 'superadmin', full_name: 'Owner' }];
      },
    }),
  });

  const adminInitData = makeInitData({ id: 2002, first_name: 'Owner' }, adminToken, now);
  const resAllowed = mockRes();
  await superadminHandler({ method: 'POST', headers: {}, body: { initData: adminInitData } }, resAllowed);
  assert.equal(resAllowed.statusCode, 200);
  assert.equal(resAllowed.body.ok, true);
  assert.equal(resAllowed.body.user.role, 'superadmin');
  assert.equal(resAllowed.body.user.permissions.can_send, true);
});

test('frontend sources no longer have URL user_id override, 123456789 fallback, or mockSuperadmin fallback', () => {
  const userAppSrc = fs.readFileSync(path.join(ROOT, 'user-app/src/App.jsx'), 'utf8');
  assert.equal(userAppSrc.includes("urlParams.get('user_id')"), false);
  assert.equal(userAppSrc.includes('123456789'), false);

  const adminHookSrc = fs.readFileSync(path.join(ROOT, 'admin-app/src/hooks/useTelegram.js'), 'utf8');
  assert.equal(adminHookSrc.includes('mockSuperadminUser'), false);
  assert.equal(adminHookSrc.includes('start_param'), false);
});
