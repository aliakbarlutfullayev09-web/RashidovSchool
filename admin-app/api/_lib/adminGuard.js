import { verifyBearerJwt, verifyTelegramInitData } from './telegramAuth.js';

const STAFF_ROLES = new Set(['teacher', 'admin', 'superadmin']);

export async function requireStaffCaller(req, { fetchImpl = fetch, env = process.env } = {}) {
  const sbUrl = (env.SUPABASE_URL || env.VITE_SUPABASE_URL || '').replace(/\/$/, '');
  const sbServiceKey = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_KEY || '';
  const jwtSecret = env.SUPABASE_JWT_SECRET || '';
  const botTokens = [
    env.ADMIN_BOT_TOKEN,
    env.STUDENT_BOT_TOKEN,
    env.BOT_TOKEN,
    env.TELEGRAM_BOT_TOKEN,
  ].filter(Boolean);

  if (!sbUrl || !sbServiceKey) {
    throw Object.assign(new Error('Supabase server config missing'), { status: 500 });
  }

  let telegramId = null;
  const authHeader = req.headers?.authorization || req.headers?.Authorization || '';
  const initDataHeader = req.headers?.['x-telegram-init-data'] || '';

  if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ') && jwtSecret) {
    const claims = verifyBearerJwt(authHeader.slice(7).trim(), jwtSecret);
    telegramId = Number(claims.telegram_id || claims.sub);
  } else if (initDataHeader) {
    const maxAge = Number(env.INIT_DATA_MAX_AGE_SECONDS || 3600);
    const verified = verifyTelegramInitData(initDataHeader, botTokens, maxAge);
    telegramId = verified.telegramId;
  } else {
    throw Object.assign(new Error('Authentication required'), { status: 401 });
  }

  if (!telegramId || !Number.isInteger(telegramId)) {
    throw Object.assign(new Error('Invalid caller identity'), { status: 401 });
  }

  const resp = await fetchImpl(
    `${sbUrl}/rest/v1/users?telegram_id=eq.${encodeURIComponent(telegramId)}&select=*&limit=1`,
    {
      headers: {
        apikey: sbServiceKey,
        Authorization: `Bearer ${sbServiceKey}`,
      },
    }
  );
  if (!resp.ok) {
    throw Object.assign(new Error('Failed to verify caller role'), { status: 502 });
  }
  const rows = await resp.json();
  const user = rows?.[0] || null;
  if (!user || !STAFF_ROLES.has(user.role)) {
    throw Object.assign(new Error('Forbidden'), { status: 403 });
  }
  return user;
}
