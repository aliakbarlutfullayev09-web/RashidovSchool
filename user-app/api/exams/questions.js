import { applyCorsHeaders, resolveCallerTelegramId } from '../_lib/telegramAuth.js';
import { applySecurityHeaders, enforceRateLimit, extractClientIp } from '../_lib/rateLimit.js';
import { loadPortalDataFromSupabase, stripExamAnswers } from '../_lib/examCatalog.js';

export function createExamQuestionsHandler({
  fetchImpl = fetch,
  env = process.env,
  limiterFn = null,
  portalLoaderFn = null,
} = {}) {
  return async function handler(req, res) {
    applyCorsHeaders(req, res);
    applySecurityHeaders(res);
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'GET' && req.method !== 'POST') {
      return res.status(405).json({ ok: false, error: 'Method not allowed' });
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
      const allowedRate = await enforceRateLimit(req, res, {
        env,
        fetchImpl,
        limiterFn,
        buckets: [
          { key: `exams:q:user:${callerId}`, limit: 30, windowSeconds: 60 },
          { key: `exams:q:ip:${extractClientIp(req)}`, limit: 60, windowSeconds: 60 },
        ],
      });
      if (!allowedRate) return;

      const rawPortal = portalLoaderFn
        ? await portalLoaderFn({ fetchImpl, env })
        : await loadPortalDataFromSupabase({ fetchImpl, env });

      const sanitized = stripExamAnswers(rawPortal);
      return res.status(200).json({ ok: true, portalData: sanitized });
    } catch (err) {
      console.error('Exam questions endpoint error:', err?.message || err);
      return res.status(500).json({ ok: false, code: 'INTERNAL_ERROR', error: 'Internal server error' });
    }
  };
}

export default createExamQuestionsHandler();
