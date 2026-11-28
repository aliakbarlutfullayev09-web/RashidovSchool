import { applyCorsHeaders, resolveCallerTelegramId } from '../_lib/telegramAuth.js';
import { applySecurityHeaders, enforceRateLimit, extractClientIp } from '../_lib/rateLimit.js';
import {
  gradePortalVariant,
  loadPortalDataFromSupabase,
  normalizeSubjectKey,
} from '../_lib/examCatalog.js';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export const MAX_ATTEMPTS_PER_EXAM_PER_DAY = 3;

export function createExamSubmitHandler({
  fetchImpl = fetch,
  env = process.env,
  limiterFn = null,
  portalLoaderFn = null,
} = {}) {
  return async function handler(req, res) {
    applyCorsHeaders(req, res);
    applySecurityHeaders(res);
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') {
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
          { key: `exams:submit:user:${callerId}`, limit: 20, windowSeconds: 60 },
          { key: `exams:submit:ip:${extractClientIp(req)}`, limit: 40, windowSeconds: 60 },
        ],
      });
      if (!allowedRate) return;

      const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
      const attemptId = String(body.attemptId || '').trim();
      const subjectKey = normalizeSubjectKey(body.subjectKey || 'biologiya');
      const mode = body.mode === 'sertifikat' ? 'sertifikat' : 'dtm';
      const testId = String(body.testId || '').trim();
      const answers = body.answers && typeof body.answers === 'object' ? body.answers : {};

      if (!UUID_RE.test(attemptId) || !testId) {
        return res.status(400).json({
          ok: false,
          code: 'INVALID_PAYLOAD',
          error: 'Valid attemptId (UUID) and testId are required',
        });
      }

      const sbUrl = (env.SUPABASE_URL || env.VITE_SUPABASE_URL || '').replace(/\/$/, '');
      const sbServiceKey = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_KEY || '';
      const sbHeaders = {
        apikey: sbServiceKey,
        Authorization: `Bearer ${sbServiceKey}`,
        'Content-Type': 'application/json',
      };

      // Idempotency lookup if DB configured
      if (sbUrl && sbServiceKey) {
        const existingResp = await fetchImpl(
          `${sbUrl}/rest/v1/exam_attempts?attempt_id=eq.${encodeURIComponent(attemptId)}&select=attempt_id,user_id,result_payload&limit=1`,
          { headers: sbHeaders }
        );
        if (existingResp.ok) {
          const rows = await existingResp.json();
          if (Array.isArray(rows) && rows[0]) {
            if (Number(rows[0].user_id) !== callerId) {
              return res.status(403).json({ ok: false, code: 'FORBIDDEN', error: 'Attempt belongs to another user' });
            }
            return res.status(200).json({
              ...(rows[0].result_payload || {}),
              ok: true,
              alreadySubmitted: true,
              attemptId,
            });
          }
        }

        // Daily attempt limit per user per exam variant (max 3 attempts / 24h)
        const sinceIso = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        const recentResp = await fetchImpl(
          `${sbUrl}/rest/v1/exam_attempts?user_id=eq.${callerId}&test_id=eq.${encodeURIComponent(testId)}&created_at=gte.${encodeURIComponent(sinceIso)}&select=attempt_id`,
          { headers: sbHeaders }
        );
        if (recentResp.ok) {
          const recentRows = await recentResp.json();
          if (Array.isArray(recentRows) && recentRows.length >= MAX_ATTEMPTS_PER_EXAM_PER_DAY) {
            return res.status(429).json({
              ok: false,
              code: 'EXAM_ATTEMPT_LIMIT_REACHED',
              maxAttemptsPerDay: MAX_ATTEMPTS_PER_EXAM_PER_DAY,
              error: `Daily attempt limit (${MAX_ATTEMPTS_PER_EXAM_PER_DAY}) reached for this exam`,
            });
          }
        }
      }

      const portal = portalLoaderFn
        ? await portalLoaderFn({ fetchImpl, env })
        : await loadPortalDataFromSupabase({ fetchImpl, env });

      const subBundle = portal?.subjects?.[subjectKey];
      const variants = Array.isArray(subBundle?.[mode]) ? subBundle[mode] : [];
      const variant = variants.find((v) => String(v.id) === testId);
      if (!variant) {
        return res.status(404).json({ ok: false, code: 'EXAM_NOT_FOUND', error: 'Exam variant not found' });
      }

      const maxScoreOverride = subBundle?.modes?.[mode]?.maxScore || variant.maxScore;
      const graded = gradePortalVariant(variant, answers, mode, maxScoreOverride);
      const responsePayload = {
        ok: true,
        alreadySubmitted: false,
        attemptId,
        subjectKey,
        mode,
        testId,
        ...graded,
      };

      if (sbUrl && sbServiceKey) {
        const insertResp = await fetchImpl(`${sbUrl}/rest/v1/exam_attempts`, {
          method: 'POST',
          headers: {
            ...sbHeaders,
            Prefer: 'resolution=ignore-duplicates,return=representation',
          },
          body: JSON.stringify({
            attempt_id: attemptId,
            user_id: callerId,
            exam_scope: 'portal_exam',
            subject_key: subjectKey,
            mode,
            test_id: testId,
            answers,
            correct_count: graded.correctCount,
            total_questions: graded.totalQuestions,
            numeric_score: graded.numericScore,
            percentage: graded.percentage,
            cert_grade: graded.certGrade,
            reward_neurons: 0,
            result_payload: responsePayload,
          }),
        });

        if (insertResp.ok) {
          const inserted = await insertResp.json();
          if (Array.isArray(inserted) && inserted.length === 0) {
            // Lost a concurrent race on the same attempt_id: fetch winner cleanly
            const winnerResp = await fetchImpl(
              `${sbUrl}/rest/v1/exam_attempts?attempt_id=eq.${encodeURIComponent(attemptId)}&select=user_id,result_payload&limit=1`,
              { headers: sbHeaders }
            );
            if (winnerResp.ok) {
              const rows = await winnerResp.json();
              if (rows?.[0] && Number(rows[0].user_id) === callerId) {
                return res.status(200).json({
                  ...(rows[0].result_payload || responsePayload),
                  ok: true,
                  alreadySubmitted: true,
                  attemptId,
                });
              }
            }
          }
        }
      }

      return res.status(200).json(responsePayload);
    } catch (err) {
      console.error('Exam submit endpoint error:', err?.message || err);
      return res.status(500).json({ ok: false, code: 'INTERNAL_ERROR', error: 'Internal server error' });
    }
  };
}

export default createExamSubmitHandler();
