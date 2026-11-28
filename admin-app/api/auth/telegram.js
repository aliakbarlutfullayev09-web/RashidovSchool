import { applyCorsHeaders, signSupabaseJwt, verifyTelegramInitData } from '../_lib/telegramAuth.js';
import { applySecurityHeaders, enforceRateLimit, extractClientIp } from '../_lib/rateLimit.js';

const STAFF_ROLES = new Set(['teacher', 'admin', 'superadmin']);

export function createAdminAuthHandler({ fetchImpl = fetch, env = process.env, limiterFn = null } = {}) {
  return async function handler(req, res) {
    applyCorsHeaders(req, res);
    applySecurityHeaders(res);
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Method not allowed' });

    try {
      const clientIp = extractClientIp(req);
      const sbUrlConfigured = (env.SUPABASE_URL || env.VITE_SUPABASE_URL || '').trim();
      const sbKeyConfigured = (env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_KEY || '').trim();
      if (limiterFn || (sbUrlConfigured && sbKeyConfigured) || env.UPSTASH_REDIS_REST_URL) {
        const okRate = await enforceRateLimit(req, res, {
          env,
          fetchImpl,
          limiterFn,
          buckets: [{ key: `auth:admin:ip:${clientIp}`, limit: 20, windowSeconds: 60 }],
        });
        if (!okRate) return;
      }
    } catch {
      return res.status(500).json({ ok: false, error: 'Rate limit service error' });
    }

    const botTokens = [
      env.ADMIN_BOT_TOKEN,
      env.STUDENT_BOT_TOKEN,
      env.BOT_TOKEN,
      env.TELEGRAM_BOT_TOKEN,
    ].filter(Boolean);
    const sbUrl = (env.SUPABASE_URL || env.VITE_SUPABASE_URL || '').replace(/\/$/, '');
    const sbServiceKey = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_KEY || '';
    const jwtSecret = env.SUPABASE_JWT_SECRET || '';
    const maxAge = Number(env.INIT_DATA_MAX_AGE_SECONDS || 3600);
    const ttl = Number(env.SESSION_JWT_TTL_SECONDS || 3600);

    if (botTokens.length === 0 || !sbUrl || !sbServiceKey) {
      return res.status(500).json({ ok: false, error: 'Server auth configuration is incomplete' });
    }

    try {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
      const { telegramId } = verifyTelegramInitData(body.initData, botTokens, maxAge);

      const headers = {
        apikey: sbServiceKey,
        Authorization: `Bearer ${sbServiceKey}`,
        'Content-Type': 'application/json',
      };

      const lookupResp = await fetchImpl(
        `${sbUrl}/rest/v1/users?telegram_id=eq.${encodeURIComponent(telegramId)}&select=*&limit=1`,
        { headers }
      );
      if (!lookupResp.ok) {
        return res.status(502).json({ ok: false, error: 'Failed to verify staff profile' });
      }
      const rows = await lookupResp.json();
      const dbUser = rows?.[0] || null;

      if (!dbUser || !STAFF_ROLES.has(dbUser.role)) {
        return res.status(403).json({ ok: false, error: 'Forbidden: staff access required' });
      }

      const perms =
        dbUser.role === 'superadmin' || dbUser.role === 'admin'
          ? { can_promo: true, can_gift: true, can_send: true }
          : dbUser.permissions || { can_promo: false, can_gift: false, can_send: false };

      const token = jwtSecret
        ? signSupabaseJwt({
            telegramId,
            appRole: dbUser.role,
            jwtSecret,
            ttlSeconds: ttl,
          })
        : null;

      return res.status(200).json({
        ok: true,
        token,
        user: { ...dbUser, permissions: perms },
      });
    } catch (err) {
      return res.status(401).json({ ok: false, error: err?.message || 'Unauthorized' });
    }
  };
}

export default createAdminAuthHandler();
