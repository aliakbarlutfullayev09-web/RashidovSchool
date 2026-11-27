export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const botToken = process.env.BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) {
    return res.status(500).json({
      ok: false,
      code: 'BOT_TOKEN_MISSING',
      error: 'BOT_TOKEN is not configured on the server'
    });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const userId = body.userId;
    const lessonId = body.lessonId;
    let videoUrl = typeof body.videoUrl === 'string' ? body.videoUrl.trim() : '';
    let title = typeof body.title === 'string' ? body.title.trim() : '';

    if (!userId) {
      return res.status(400).json({ ok: false, code: 'USER_ID_REQUIRED', error: 'Missing userId' });
    }

    const sbUrl = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').replace(/\/$/, '');
    const sbKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

    if (lessonId && sbUrl && sbKey) {
      try {
        const sbResp = await fetch(
          `${sbUrl}/rest/v1/lessons?id=eq.${encodeURIComponent(lessonId)}&select=id,title,video_url&limit=1`,
          {
            headers: {
              apikey: sbKey,
              Authorization: `Bearer ${sbKey}`,
            },
          }
        );
        if (sbResp.ok) {
          const rows = await sbResp.json();
          if (rows && rows[0]) {
            videoUrl = rows[0].video_url || videoUrl;
            title = rows[0].title || title;
          }
        }
      } catch {}
    }

    if (!videoUrl) {
      return res.status(400).json({ ok: false, code: 'VIDEO_URL_MISSING', error: 'Video URL topilmadi' });
    }

    const caption = title || 'Video dars';

    const tgResponse = await fetch(`https://api.telegram.org/bot${botToken}/sendVideo`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: userId,
        video: videoUrl,
        caption,
        supports_streaming: true,
        protect_content: true
      })
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
        error: desc || 'Botga avval /start yuboring'
      });
    }

    // Fallback: if Telegram rejected remote URL fetch, upload stream via multipart/form-data (<= 48MB)
    if (/wrong file identifier|failed to get HTTP URL content|webpage_curl_failed/i.test(desc)) {
      try {
        const mediaResp = await fetch(videoUrl);
        if (mediaResp.ok) {
          const contentLen = Number(mediaResp.headers.get('content-length') || 0);
          if (!contentLen || contentLen <= 48 * 1024 * 1024) {
            const arrayBuf = await mediaResp.arrayBuffer();
            if (arrayBuf.byteLength <= 48 * 1024 * 1024) {
              const form = new FormData();
              form.append('chat_id', String(userId));
              form.append('caption', caption);
              form.append('supports_streaming', 'true');
              form.append('protect_content', 'true');
              form.append('video', new Blob([arrayBuf], { type: 'video/mp4' }), 'lesson.mp4');

              const uploadResp = await fetch(`https://api.telegram.org/bot${botToken}/sendVideo`, {
                method: 'POST',
                body: form
              });
              const uploadData = await uploadResp.json();
              if (uploadData.ok) {
                return res.status(200).json({ ok: true, protected: true });
              }
            }
          }
        }
      } catch {}
    }

    return res.status(502).json({
      ok: false,
      code: 'TELEGRAM_SEND_FAILED',
      error: desc || 'Failed to send protected video via Telegram bot'
    });
  } catch (err) {
    return res.status(500).json({
      ok: false,
      error: err?.message || 'Internal server error'
    });
  }
}
