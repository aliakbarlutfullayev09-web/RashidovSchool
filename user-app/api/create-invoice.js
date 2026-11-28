import crypto from 'node:crypto';
import {
  applyCorsHeaders,
  verifyBearerJwt,
  verifyTelegramInitData,
} from './_lib/telegramAuth.js';
import { applySecurityHeaders, enforceRateLimit, extractClientIp } from './_lib/rateLimit.js';

export const STARS_PRODUCTS = {
  stars_5: { stars: 5, neurons: 1250, title: '1 250 Neyron' },
  stars_100: { stars: 100, neurons: 25000, title: '25 000 Neyron' },
  stars_400: { stars: 400, neurons: 100000, title: '100 000 Neyron' },
  stars_600: { stars: 600, neurons: 150000, title: '150 000 Neyron' },
  stars_1000: { stars: 1000, neurons: 250000, title: '250 000 Neyron' },
  stars_3500: { stars: 3500, neurons: 1000000, title: '1 000 000 Neyron' },
};

function resolveCallerTelegramId(req, env) {
  const authHeader = req.headers?.authorization || req.headers?.Authorization || '';
  const initDataHeader = req.headers?.['x-telegram-init-data'] || '';
  const jwtSecret = env.SUPABASE_JWT_SECRET || '';
  const botTokens = [
    env.STUDENT_BOT_TOKEN,
    env.BOT_TOKEN,
    env.TELEGRAM_BOT_TOKEN,
  ].filter(Boolean);
  const maxAge = Number(env.INIT_DATA_MAX_AGE_SECONDS || 3600);

  if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ') && jwtSecret) {
    const claims = verifyBearerJwt(authHeader.slice(7).trim(), jwtSecret);
    return Number(claims.telegram_id || claims.sub);
  }
  if (initDataHeader && botTokens.length > 0) {
    const verified = verifyTelegramInitData(initDataHeader, botTokens, maxAge);
    return Number(verified.telegramId);
  }
  throw Object.assign(new Error('Authentication required'), { status: 401 });
}

export function createStarsInvoiceHandler({ fetchImpl = fetch, env = process.env, limiterFn = null } = {}) {
  return async function handler(req, res) {
    applyCorsHeaders(req, res);
    applySecurityHeaders(res);
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Method not allowed' });

    const botToken = env.STUDENT_BOT_TOKEN || env.BOT_TOKEN || env.TELEGRAM_BOT_TOKEN;
    if (!botToken) {
      return res.status(500).json({
        ok: false,
        code: 'BOT_TOKEN_MISSING',
        error: 'BOT_TOKEN is not configured on the server',
      });
    }

    const sbUrl = (env.SUPABASE_URL || env.VITE_SUPABASE_URL || '').replace(/\/$/, '');
    const sbServiceKey = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_KEY || '';
    if (!sbUrl || !sbServiceKey) {
      return res.status(500).json({
        ok: false,
        code: 'DB_CONFIG_MISSING',
        error: 'Server database configuration is incomplete',
      });
    }

    let callerId;
    try {
      callerId = resolveCallerTelegramId(req, env);
      if (!callerId || !Number.isInteger(callerId)) {
        return res.status(401).json({ ok: false, error: 'Unauthorized' });
      }
    } catch {
      return res.status(401).json({ ok: false, error: 'Unauthorized' });
    }

    let merchantTransId = null;
    try {
      const clientIp = extractClientIp(req);
      const allowedRate = await enforceRateLimit(req, res, {
        env,
        fetchImpl,
        limiterFn,
        buckets: [
          { key: `invoice:user:${callerId}`, limit: 10, windowSeconds: 60 },
          { key: `invoice:ip:${clientIp}`, limit: 20, windowSeconds: 60 },
        ],
      });
      if (!allowedRate) return;

      const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
      const productId = String(body.productId || '').trim();
      const product = STARS_PRODUCTS[productId];
      if (!product) {
        return res.status(400).json({ ok: false, error: 'Invalid productId' });
      }

      merchantTransId = `stars_${callerId}_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`;
      const sbHeaders = {
        apikey: sbServiceKey,
        Authorization: `Bearer ${sbServiceKey}`,
        'Content-Type': 'application/json',
      };

      const orderResp = await fetchImpl(`${sbUrl}/rest/v1/payments`, {
        method: 'POST',
        headers: sbHeaders,
        body: JSON.stringify({
          user_id: callerId,
          merchant_trans_id: merchantTransId,
          provider: 'stars',
          product_id: productId,
          currency: 'XTR',
          amount: product.stars,
          amount_minor: product.stars,
          xp_credited: product.neurons,
          status: 'pending',
        }),
      });
      if (!orderResp.ok) {
        return res.status(502).json({ ok: false, error: 'Failed to create payment order' });
      }

      const tgResponse = await fetchImpl(`https://api.telegram.org/bot${botToken}/createInvoiceLink`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: product.title,
          description: `Rashidov School balansiga ${product.title} darhol qo'shiladi.`,
          payload: merchantTransId,
          provider_token: '',
          currency: 'XTR',
          prices: [{ label: product.title, amount: product.stars }],
        }),
      });

      const data = await tgResponse.json();
      if (!data.ok || !data.result) {
        await fetchImpl(
          `${sbUrl}/rest/v1/rpc/fail_pending_payment`,
          {
            method: 'POST',
            headers: sbHeaders,
            body: JSON.stringify({
              p_merchant_trans_id: merchantTransId,
              p_target_status: 'failed',
            }),
          }
        ).catch(() => {});
        return res.status(502).json({
          ok: false,
          error: 'Failed to create Telegram invoice link',
        });
      }

      return res.status(200).json({
        ok: true,
        invoiceUrl: data.result,
        orderId: merchantTransId,
      });
    } catch {
      return res.status(500).json({
        ok: false,
        error: 'Internal server error',
      });
    }
  };
}

export default createStarsInvoiceHandler();
