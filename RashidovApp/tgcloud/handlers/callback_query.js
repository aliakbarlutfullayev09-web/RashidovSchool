import { api } from 'sdk';
import { updateLanguage } from '../lib/supabase.js';
import { renderLangConfirmRichHtml } from '../lib/widgets.js';

export default async function (query) {
  const data = query.data;
  if (data !== 'lang:uz' && data !== 'lang:ru') {
    await api.answerCallbackQuery({ callback_query_id: query.id });
    return;
  }

  const newLang = data.split(':')[1];
  await updateLanguage(query.from.id, newLang);

  const confirmText =
    newLang === 'ru'
      ? '<tg-emoji emoji-id="5427009714745517609">✅</tg-emoji> Язык изменён на <b>Русский</b>.'
      : `<tg-emoji emoji-id="5427009714745517609">✅</tg-emoji> Til <b>O'zbekcha</b>ga o'zgartirildi.`;

  if (query.message) {
    try {
      await api.editMessageText({
        chat_id: query.message.chat.id,
        message_id: query.message.message_id,
        rich_message: { html: renderLangConfirmRichHtml(newLang) },
      });
    } catch {
      await api.editMessageText({
        chat_id: query.message.chat.id,
        message_id: query.message.message_id,
        text: confirmText,
        parse_mode: 'HTML',
      });
    }
  }

  await api.answerCallbackQuery({ callback_query_id: query.id });
}
