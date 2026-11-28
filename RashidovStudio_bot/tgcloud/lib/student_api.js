import { fetch, FormData, InputFile } from 'sdk';
import { CONFIG } from './config.js';

export async function callStudentBot(method, payload) {
  if (!CONFIG.STUDENT_BOT_TOKEN) {
    throw new Error('STUDENT_BOT_TOKEN env var is not configured');
  }
  const res = await fetch(
    `https://api.telegram.org/bot${CONFIG.STUDENT_BOT_TOKEN}/${method}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }
  );
  const data = await res.json();
  if (!data.ok) {
    const err = new Error(data.description || `Telegram API ${data.error_code}`);
    err.errorCode = data.error_code;
    throw err;
  }
  return data.result;
}

export async function sendStudentPhotoBytes({ chatId, bytes, caption, captionEntities }) {
  if (!CONFIG.STUDENT_BOT_TOKEN) {
    throw new Error('STUDENT_BOT_TOKEN env var is not configured');
  }
  const form = new FormData();
  form.append('chat_id', String(chatId));
  form.append('photo', new InputFile(bytes, 'broadcast.jpg', { type: 'image/jpeg' }));
  if (caption) form.append('caption', caption);
  if (captionEntities && captionEntities.length > 0) {
    form.append('caption_entities', JSON.stringify(captionEntities));
  }

  const res = await fetch(
    `https://api.telegram.org/bot${CONFIG.STUDENT_BOT_TOKEN}/sendPhoto`,
    {
      method: 'POST',
      body: form,
    }
  );
  const data = await res.json();
  if (!data.ok) {
    const err = new Error(data.description || `Telegram API ${data.error_code}`);
    err.errorCode = data.error_code;
    throw err;
  }
  return data.result;
}
