import crypto from 'node:crypto';

function b64urlEncode(buf) {
  return Buffer.from(buf)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function b64urlDecode(str) {
  const normalized = String(str).replace(/-/g, '+').replace(/_/g, '/');
  const pad = '='.repeat((4 - (normalized.length % 4)) % 4);
  return Buffer.from(normalized + pad, 'base64');
}

export function verifyTelegramInitData(
  initData,
  botTokens,
  maxAgeSeconds = 3600,
  nowTs = Math.floor(Date.now() / 1000)
) {
  if (!initData || typeof initData !== 'string') {
    throw new Error('Missing initData');
  }

  const tokens = (Array.isArray(botTokens) ? botTokens : [botTokens]).filter(Boolean);
  if (tokens.length === 0) {
    throw new Error('Bot token is not configured');
  }

  const effectiveMaxAge = Math.min(Math.max(Number(maxAgeSeconds) || 3600, 1), 3600);

  const searchParams = new URLSearchParams(initData);
  const receivedHash = searchParams.get('hash') || '';
  if (!receivedHash || !/^[0-9a-f]+$/i.test(receivedHash)) {
    throw new Error('Missing or invalid initData hash');
  }

  const authDate = Number(searchParams.get('auth_date') || '0');
  if (
    !Number.isFinite(authDate) ||
    authDate <= 0 ||
    nowTs - authDate > effectiveMaxAge ||
    authDate - nowTs > 300
  ) {
    throw new Error('Expired initData');
  }

  const entries = [];
  for (const [k, v] of searchParams.entries()) {
    if (k !== 'hash') entries.push([k, v]);
  }
  entries.sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  const dataCheckString = entries.map(([k, v]) => `${k}=${v}`).join('\n');

  const receivedBuf = Buffer.from(receivedHash.toLowerCase(), 'hex');
  let verified = false;
  for (const token of tokens) {
    const secretKey = crypto.createHmac('sha256', 'WebAppData').update(token).digest();
    const computedBuf = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest();
    if (
      computedBuf.length === receivedBuf.length &&
      crypto.timingSafeEqual(computedBuf, receivedBuf)
    ) {
      verified = true;
      break;
    }
  }

  if (!verified) {
    throw new Error('Invalid initData signature');
  }

  const rawUser = searchParams.get('user');
  if (!rawUser) {
    throw new Error('Missing user in initData');
  }

  let tgUser;
  try {
    tgUser = JSON.parse(rawUser);
  } catch {
    throw new Error('Malformed user JSON in initData');
  }

  const telegramId = Number(tgUser?.id);
  if (!telegramId || !Number.isInteger(telegramId)) {
    throw new Error('Missing user id in initData');
  }

  return { telegramId, tgUser, authDate };
}

export function signSupabaseJwt({
  telegramId,
  appRole = 'student',
  jwtSecret,
  ttlSeconds = 3600,
  nowTs = Math.floor(Date.now() / 1000),
}) {
  if (!jwtSecret) {
    throw new Error('SUPABASE_JWT_SECRET is not configured');
  }

  const effectiveTtl = Math.min(Math.max(Number(ttlSeconds) || 3600, 1), 3600);
  const header = b64urlEncode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = b64urlEncode(
    JSON.stringify({
      aud: 'authenticated',
      role: 'authenticated',
      sub: String(telegramId),
      telegram_id: Number(telegramId),
      app_role: String(appRole || 'student'),
      iat: nowTs,
      exp: nowTs + effectiveTtl,
    })
  );
  const signingInput = `${header}.${payload}`;
  const sig = crypto.createHmac('sha256', jwtSecret).update(signingInput).digest();
  return `${signingInput}.${b64urlEncode(sig)}`;
}

export function verifyBearerJwt(token, jwtSecret, nowTs = Math.floor(Date.now() / 1000)) {
  if (!token || !jwtSecret) {
    throw new Error('Missing token or secret');
  }
  const parts = String(token).split('.');
  if (parts.length !== 3) {
    throw new Error('Malformed JWT');
  }
  const [hB64, pB64, sB64] = parts;
  const expectedSig = b64urlEncode(
    crypto.createHmac('sha256', jwtSecret).update(`${hB64}.${pB64}`).digest()
  );
  const a = Buffer.from(expectedSig, 'utf8');
  const b = Buffer.from(sB64, 'utf8');
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    throw new Error('Invalid JWT signature');
  }

  const payload = JSON.parse(b64urlDecode(pB64).toString('utf8'));
  if (!payload.exp || Number(payload.exp) < nowTs) {
    throw new Error('Expired JWT');
  }
  return payload;
}

export function applyCorsHeaders(req, res) {
  const allowed = String(process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((s) => s.trim().replace(/\/$/, ''))
    .filter(Boolean);
  const reqOrigin = String(req.headers?.origin || '').replace(/\/$/, '');
  if (reqOrigin && (allowed.length === 0 || allowed.includes(reqOrigin))) {
    res.setHeader('Access-Control-Allow-Origin', reqOrigin);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Telegram-Init-Data');
}
