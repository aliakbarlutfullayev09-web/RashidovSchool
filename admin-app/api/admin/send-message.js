import { applyCorsHeaders } from '../_lib/telegramAuth.js';
import { requireStaffCaller } from '../_lib/adminGuard.js';

export default async function handler(req, res) {
  applyCorsHeaders(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Method not allowed' });

  const studentBotToken = process.env.STUDENT_BOT_TOKEN || process.env.BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN;
  if (!studentBotToken) {
    return res.status(500).json({ ok: false, error: 'STUDENT_BOT_TOKEN is not configured' });
  }

  try {
    const adminUser = await requireStaffCaller(req);
    const canSend =
      adminUser.role === 'superadmin' ||
      adminUser.role === 'admin' ||
      Boolean(adminUser.permissions?.can_send);
    if (!canSend) {
      return res.status(403).json({ ok: false, error: 'Missing can_send permission' });
    }

    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const targetId = Number(body.telegramId);
    const cleanText = String(body.text || '').trim();
    if (!targetId || !Number.isInteger(targetId) || !cleanText) {
      return res.status(400).json({ ok: false, error: 'ID or message text is invalid' });
    }

    const tgResp = await fetch(`https://api.telegram.org/bot${studentBotToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: targetId, text: cleanText }),
    });
    const json = await tgResp.json();
    if (!json?.ok) {
      return res.status(502).json({ ok: false, error: json?.description || 'Telegram send error' });
    }
    return res.status(200).json({ ok: true });
  } catch (err) {
    return res.status(err.status || 401).json({ ok: false, error: err?.message || 'Unauthorized' });
  }
}
