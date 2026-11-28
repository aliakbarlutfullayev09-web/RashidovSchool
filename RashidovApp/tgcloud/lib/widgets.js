import { api } from 'sdk';
import { CONFIG } from './config.js';

export function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function renderStartRichHtml(name, _balance, lang) {
  const safeName = escapeHtml(name || 'Student');
  const appUrl = escapeHtml(CONFIG.STUDENT_WEBAPP_URL);

  if (lang === 'ru') {
    return (
      `<h2><tg-emoji emoji-id="5247133031235329609">👋</tg-emoji> Привет, ${safeName}!</h2>` +
      `<tg-button-row>` +
      `<tg-button type="web_app" style="primary" url="${appUrl}"><tg-emoji emoji-id="5890925363067886150">✨</tg-emoji> Открыть платформу</tg-button>` +
      `</tg-button-row>`
    );
  }

  return (
    `<h2><tg-emoji emoji-id="5247133031235329609">👋</tg-emoji> Salom, ${safeName}!</h2>` +
    `<tg-button-row>` +
    `<tg-button type="web_app" style="primary" url="${appUrl}"><tg-emoji emoji-id="5890925363067886150">✨</tg-emoji> Platformani ochish</tg-button>` +
    `</tg-button-row>`
  );
}

export function renderSupportRichHtml(lang) {
  const supportUrl = escapeHtml(`https://t.me/${CONFIG.SUPPORT_USERNAME}`);

  if (lang === 'ru') {
    return (
      `<h2><tg-emoji emoji-id="5409194306365829029">✈️</tg-emoji> Поддержка</h2>` +
      `<p>Если вы обнаружили техническую ошибку в работе платформы или у вас есть вопросы, пожалуйста, свяжитесь с нами.</p>` +
      `<tg-button-row>` +
      `<tg-button type="url" style="primary" url="${supportUrl}"><tg-emoji emoji-id="5408955961450705923">❤</tg-emoji> Связаться</tg-button>` +
      `</tg-button-row>`
    );
  }

  return (
    `<h2><tg-emoji emoji-id="5409194306365829029">✈️</tg-emoji> Qo'llab quvvatlash</h2>` +
    `<p>Agar platforma ishlashida texnik xatolik aniqlagan bo'lsangiz yoki savollaringiz mavjud bo'lsa, iltimos, biz bilan bog'laning.</p>` +
    `<tg-button-row>` +
    `<tg-button type="url" style="primary" url="${supportUrl}"><tg-emoji emoji-id="5408955961450705923">❤</tg-emoji> Bog'lanish</tg-button>` +
    `</tg-button-row>`
  );
}

export function renderLangRichHtml(lang) {
  const title =
    lang === 'ru'
      ? '<tg-emoji emoji-id="5409014875517104495">📝</tg-emoji> Выберите язык интерфейса:'
      : '<tg-emoji emoji-id="5409014875517104495">📝</tg-emoji> Interfeys tilini tanlang:';

  return (
    `<h3>${title}</h3>` +
    `<tg-button-row>` +
    `<tg-button type="callback_data" data="lang:uz">🇺🇿 O'zbekcha</tg-button>` +
    `<tg-button type="callback_data" data="lang:ru">🇷🇺 Русский</tg-button>` +
    `</tg-button-row>`
  );
}

export function renderLangConfirmRichHtml(newLang) {
  if (newLang === 'ru') {
    return `<p><tg-emoji emoji-id="5427009714745517609">✅</tg-emoji> Язык изменён на <b>Русский</b>.</p>`;
  }
  return `<p><tg-emoji emoji-id="5427009714745517609">✅</tg-emoji> Til <b>O'zbekcha</b>ga o'zgartirildi.</p>`;
}

export async function sendRichWithFallback({
  chatId,
  richHtml,
  fallbackText,
  fallbackReplyMarkup,
}) {
  try {
    await api.sendRichMessage({
      chat_id: chatId,
      rich_message: { html: richHtml },
    });
    return;
  } catch (err) {
    console.warn('sendRichMessage failed, falling back to sendMessage:', err?.message || err);
  }

  await api.sendMessage({
    chat_id: chatId,
    text: fallbackText,
    parse_mode: 'HTML',
    reply_markup: fallbackReplyMarkup,
  });
}
