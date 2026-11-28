import assert from 'node:assert/strict';
import test from 'node:test';

import { signSupabaseJwt } from '../user-app/api/_lib/telegramAuth.js';
import { createStarsInvoiceHandler } from '../user-app/api/create-invoice.js';
import { validatePreCheckout } from '../RashidovApp/tgcloud/lib/starsValidation.js';

function mockRes() {
  return {
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
}

test('create-invoice requires authentication, ignores client pricing, and creates pending DB order', async () => {
  const jwtSecret = 'test-jwt-secret-stars';
  const jwt = signSupabaseJwt({ telegramId: 888111, appRole: 'student', jwtSecret, ttlSeconds: 600 });

  const calls = [];
  const handler = createStarsInvoiceHandler({
    env: {
      STUDENT_BOT_TOKEN: '123:TEST_BOT',
      SUPABASE_URL: 'https://example.supabase.co',
      SUPABASE_SERVICE_ROLE_KEY: 'srv-key-test',
      SUPABASE_JWT_SECRET: jwtSecret,
    },
    fetchImpl: async (url, init) => {
      calls.push({ url, method: init?.method || 'GET', body: init?.body ? JSON.parse(init.body) : null });
      if (url.includes('/rest/v1/rpc/check_rate_limit')) {
        return { ok: true, async json() { return { allowed: true, remaining: 9, retry_after: 0 }; } };
      }
      if (url.includes('/rest/v1/payments')) {
        return { ok: true, async json() { return [{}]; } };
      }
      if (url.includes('createInvoiceLink')) {
        return { ok: true, async json() { return { ok: true, result: 'https://t.me/$test_invoice' }; } };
      }
      return { ok: false, async json() { return {}; } };
    },
  });

  // 1. Unauthenticated rejected with 401
  const resNoAuth = mockRes();
  await handler({ method: 'POST', headers: {}, body: { productId: 'stars_100' } }, resNoAuth);
  assert.equal(resNoAuth.statusCode, 401);

  // 2. Invalid/unknown productId rejected with 400
  const resBadPkg = mockRes();
  await handler(
    {
      method: 'POST',
      headers: { authorization: `Bearer ${jwt}` },
      body: { productId: 'stars_999', stars: 1, xp_credited: 9999999 },
    },
    resBadPkg
  );
  assert.equal(resBadPkg.statusCode, 400);

  // 3. Valid productId uses server price & caller identity from JWT, ignoring forged userId/stars
  const resOk = mockRes();
  await handler(
    {
      method: 'POST',
      headers: { authorization: `Bearer ${jwt}` },
      body: { productId: 'stars_100', userId: 9999999, stars: 1 },
    },
    resOk
  );
  assert.equal(resOk.statusCode, 200);
  assert.equal(resOk.body.ok, true);
  assert.equal(resOk.body.invoiceUrl, 'https://t.me/$test_invoice');
  assert.ok(resOk.body.orderId.startsWith('stars_888111_'));

  const dbInsert = calls.find((c) => c.url.includes('/rest/v1/payments'));
  assert.equal(dbInsert.body.user_id, 888111);
  assert.equal(dbInsert.body.amount_minor, 100);
  assert.equal(dbInsert.body.xp_credited, 25000);
  assert.equal(dbInsert.body.currency, 'XTR');
  assert.equal(dbInsert.body.status, 'pending');

  const tgCall = calls.find((c) => c.url.includes('createInvoiceLink'));
  assert.equal(tgCall.body.payload, resOk.body.orderId);
  assert.equal(tgCall.body.prices[0].amount, 100);
});

test('create-invoice marks order failed via RPC if Telegram rejects link creation', async () => {
  const jwtSecret = 'test-jwt-secret-stars';
  const jwt = signSupabaseJwt({ telegramId: 888222, appRole: 'student', jwtSecret, ttlSeconds: 600 });
  const rpcCalls = [];

  const handler = createStarsInvoiceHandler({
    env: {
      STUDENT_BOT_TOKEN: '123:TEST_BOT',
      SUPABASE_URL: 'https://example.supabase.co',
      SUPABASE_SERVICE_ROLE_KEY: 'srv-key-test',
      SUPABASE_JWT_SECRET: jwtSecret,
    },
    fetchImpl: async (url, init) => {
      if (url.includes('/rest/v1/rpc/check_rate_limit')) {
        return { ok: true, async json() { return { allowed: true, remaining: 9, retry_after: 0 }; } };
      }
      if (url.includes('/rest/v1/rpc/fail_pending_payment')) {
        rpcCalls.push(JSON.parse(init.body));
        return { ok: true, async json() { return true; } };
      }
      if (url.includes('/rest/v1/payments')) {
        return { ok: true, async json() { return [{}]; } };
      }
      return { ok: false, async json() { return { ok: false, description: 'TG error' }; } };
    },
  });

  const res = mockRes();
  await handler(
    { method: 'POST', headers: { authorization: `Bearer ${jwt}` }, body: { productId: 'stars_5' } },
    res
  );
  assert.equal(res.statusCode, 502);
  assert.deepEqual(rpcCalls, [{ p_merchant_trans_id: rpcCalls[0]?.p_merchant_trans_id, p_target_status: 'failed' }]);
  assert.ok(rpcCalls[0].p_merchant_trans_id.startsWith('stars_888222_'));
});

test('RashidovApp validatePreCheckout checks order, owner, currency, status, and amount', () => {
  const order = {
    provider: 'stars',
    currency: 'XTR',
    status: 'pending',
    user_id: 777,
    amount_minor: 100,
  };
  assert.deepEqual(
    validatePreCheckout(order, { from: { id: 777 }, currency: 'XTR', total_amount: 100 }),
    { ok: true }
  );
  assert.equal(validatePreCheckout(null, { from: { id: 777 }, currency: 'XTR', total_amount: 100 }).ok, false);
  assert.equal(validatePreCheckout(order, { from: { id: 888 }, currency: 'XTR', total_amount: 100 }).ok, false);
  assert.equal(validatePreCheckout(order, { from: { id: 777 }, currency: 'USD', total_amount: 100 }).ok, false);
  assert.equal(validatePreCheckout(order, { from: { id: 777 }, currency: 'XTR', total_amount: 5 }).ok, false);
  assert.equal(validatePreCheckout({ ...order, status: 'paid' }, { from: { id: 777 }, currency: 'XTR', total_amount: 100 }).ok, false);
});
