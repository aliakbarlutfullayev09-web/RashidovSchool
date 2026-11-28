import { applyCorsHeaders } from '../_lib/telegramAuth.js';
import { requireStaffCaller } from '../_lib/adminGuard.js';

export default async function handler(req, res) {
  applyCorsHeaders(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ ok: false, error: 'Method not allowed' });

  const studentBotToken = process.env.STUDENT_BOT_TOKEN || process.env.BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN;
  if (!studentBotToken) {
    return res.status(500).json({ ok: false, error: 'STUDENT_BOT_TOKEN is not configured' });
  }

  try {
    await requireStaffCaller(req);
    const targetId = Number(req.query?.telegramId);
    if (!targetId || !Number.isInteger(targetId)) {
      return res.status(400).json({ ok: false, error: 'Invalid telegramId' });
    }

    const tgResp = await fetch(
      `https://api.telegram.org/bot${studentBotToken}/getChat?chat_id=${encodeURIComponent(targetId)}`
    );
    const json = await tgResp.json();
    if (!json?.ok || !json?.result) {
      return res.status(200).json({ ok: false, profile: null });
    }

    return res.status(200).json({
      ok: true,
      profile: {
        username:
          json.result.username ||
          (Array.isArray(json.result.active_usernames) ? json.result.active_usernames[0] : '') ||
          '',
        first_name: json.result.first_name || '',
        last_name: json.result.last_name || '',
        bio: json.result.bio || '',
      },
    });
  } catch (err) {
    return res.status(err.status || 401).json({ ok: false, error: err?.message || 'Unauthorized' });
  }
}
