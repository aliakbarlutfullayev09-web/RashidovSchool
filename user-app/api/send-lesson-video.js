import {
  applyCorsHeaders,
  verifyBearerJwt,
  verifyTelegramInitData,
} from './_lib/telegramAuth.js';
import { applySecurityHeaders, enforceRateLimit, extractClientIp } from './_lib/rateLimit.js';
import {
  buildAllowedVideoHosts,
  safeDownloadVideoStream,
  validateExternalVideoUrl,
} from './_lib/ssrfGuard.js';

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
  throw Object.assign(new Error('Unauthorized'), { status: 401 });
}

export function createSendLessonVideoHandler({
  fetchImpl = fetch,
  env = process.env,
  lookupFn,
  limiterFn = null,
} = {}) {
  return async function handler(req, res) {
    applyCorsHeaders(req, res);
    applySecurityHeaders(res);
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Method not allowed' });

    const botToken = env.STUDENT_BOT_TOKEN || env.BOT_TOKEN || env.TELEGRAM_BOT_TOKEN;
    const sbUrl = (env.SUPABASE_URL || env.VITE_SUPABASE_URL || '').replace(/\/$/, '');
    const sbServiceKey = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_KEY || '';
    if (!botToken || !sbUrl || !sbServiceKey) {
      return res.status(500).json({ ok: false, code: 'SERVER_CONFIG_MISSING', error: 'Server configuration error' });
    }

    let callerId;
    try {
      callerId = resolveCallerTelegramId(req, env);
      if (!callerId || !Number.isInteger(callerId)) {
        return res.status(401).json({ ok: false, code: 'UNAUTHORIZED', error: 'Unauthorized' });
      }
    } catch {
      return res.status(401).json({ ok: false, code: 'UNAUTHORIZED', error: 'Unauthorized' });
    }

    try {
      const clientIp = extractClientIp(req);
      const allowedRate = await enforceRateLimit(req, res, {
        env,
        fetchImpl,
        limiterFn,
        buckets: [
          { key: `video:user:${callerId}`, limit: 15, windowSeconds: 60 },
          { key: `video:ip:${clientIp}`, limit: 30, windowSeconds: 60 },
        ],
      });
      if (!allowedRate) return;

      const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
      const lessonId = Number(body.lessonId);
      if (!Number.isInteger(lessonId) || lessonId <= 0) {
        return res.status(400).json({ ok: false, code: 'INVALID_LESSON_ID', error: 'Valid lessonId is required' });
      }

      const accessResp = await fetchImpl(`${sbUrl}/rest/v1/rpc/check_lesson_access`, {
        method: 'POST',
        headers: {
          apikey: sbServiceKey,
          Authorization: `Bearer ${sbServiceKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ p_user_id: callerId, p_lesson_id: lessonId }),
      });
      if (!accessResp.ok) {
        return res.status(502).json({ ok: false, code: 'ACCESS_CHECK_FAILED', error: 'Failed to verify lesson access' });
      }

      const access = await accessResp.json();
      if (!access?.found) {
        return res.status(404).json({ ok: false, code: 'LESSON_NOT_FOUND', error: 'Lesson not found' });
      }
      if (!access.allowed) {
        return res.status(403).json({ ok: false, code: 'ACCESS_DENIED', error: 'Access denied' });
      }

      const rawVideo = String(access.video_url || '').trim();
      const caption = String(access.title || 'Video dars').trim();
      if (!rawVideo) {
        return res.status(400).json({ ok: false, code: 'VIDEO_URL_MISSING', error: 'Video is not available' });
      }

      const isUrl = rawVideo.includes('://');
      const allowedHosts = buildAllowedVideoHosts(env);
      const videoSource = isUrl
        ? await validateExternalVideoUrl(rawVideo, { allowedHosts, lookupFn })
        : rawVideo;

      const tgResponse = await fetchImpl(`https://api.telegram.org/bot${botToken}/sendVideo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: callerId,
          video: videoSource,
          caption,
          supports_streaming: true,
          protect_content: true,
        }),
      });

      const data = await tgResponse.json();
      if (data.ok) {
        return res.status(200).json({ ok: true, protected: true });
      }

      const desc = String(data.description || '');
      if (tgResponse.status === 403 || /blocked|initiate conversation/i.test(desc)) {
        return res.status(403).json({
          ok: false,
          code: 'BOT_NOT_STARTED',
          error: 'Botga avval /start yuboring',
        });
      }

      if (isUrl && /wrong file identifier|failed to get HTTP URL content|webpage_curl_failed/i.test(desc)) {
        const videoBytes = await safeDownloadVideoStream(videoSource, {
          allowedHosts,
          maxBytes: 48 * 1024 * 1024,
          timeoutMs: 20000,
          fetchImpl,
          lookupFn,
        });

        const form = new FormData();
        form.append('chat_id', String(callerId));
        form.append('caption', caption);
        form.append('supports_streaming', 'true');
        form.append('protect_content', 'true');
        form.append('video', new Blob([videoBytes], { type: 'video/mp4' }), 'lesson.mp4');

        const uploadResp = await fetchImpl(`https://api.telegram.org/bot${botToken}/sendVideo`, {
          method: 'POST',
          body: form,
        });
        const uploadData = await uploadResp.json();
        if (uploadData.ok) {
          return res.status(200).json({ ok: true, protected: true });
        }
      }

      return res.status(502).json({
        ok: false,
        code: 'TELEGRAM_SEND_FAILED',
        error: 'Failed to send protected video via Telegram bot',
      });
    } catch (err) {
      const status = err?.status && err.status >= 400 && err.status < 600 ? err.status : 500;
      const code = err?.code || 'INTERNAL_ERROR';
      const safeError = status < 500 ? err.message : 'Internal server error';
      return res.status(status).json({ ok: false, code, error: safeError });
    }
  };
}

export default createSendLessonVideoHandler();
