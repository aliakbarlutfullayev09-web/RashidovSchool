import { api } from 'sdk';
import { callStudentBot, sendStudentPhotoBytes } from '../lib/student_api.js';
import {
  clearBotState,
  getAdminContext,
  getBotState,
  getUser,
  incrementBalance,
  logTransaction,
  setBotState,
} from '../lib/supabase.js';

export default async function (query) {
  const data = query.data || '';
  const userId = query.from.id;

  if (data === 'direct_msg:cancel') {
    await clearBotState(userId);
    await api.answerCallbackQuery({ callback_query_id: query.id, text: 'Отменено' });
    if (query.message) {
      await api.sendMessage({
        chat_id: query.message.chat.id,
        text: '❌ Отправка сообщения отменена.',
        parse_mode: 'HTML',
      });
    }
    return;
  }

  if (data.startsWith('quick_msg:')) {
    const targetId = Number(data.split(':')[1]);
    const ctx = await getAdminContext(userId);
    if (!ctx) {
      await api.answerCallbackQuery({ callback_query_id: query.id, text: '⛔ Доступ запрещён', show_alert: true });
      return;
    }
    await setBotState(userId, 'waiting_direct_msg', { target_id: targetId });
    await api.answerCallbackQuery({ callback_query_id: query.id });
    if (query.message) {
      await api.sendMessage({
        chat_id: query.message.chat.id,
        text: `✉️ Отправьте сообщение для ученика <code>${targetId}</code>:`,
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [[{ text: '❌ Отмена', callback_data: 'direct_msg:cancel' }]],
        },
      });
    }
    return;
  }

  if (data.startsWith('quick_gift:')) {
    const [, uidStr, amountStr] = data.split(':');
    const targetId = Number(uidStr);
    const amount = Number(amountStr);
    const ctx = await getAdminContext(userId);
    if (!ctx || (!ctx.isSuperadmin && !ctx.canGift)) {
      await api.answerCallbackQuery({
        callback_query_id: query.id,
        text: '⛔ Нет права can_gift',
        show_alert: true,
      });
      return;
    }
    const targetUser = await getUser(targetId);
    if (!targetUser || !amount || amount <= 0) {
      await api.answerCallbackQuery({
        callback_query_id: query.id,
        text: 'Пользователь не найден',
        show_alert: true,
      });
      return;
    }

    const newBalance = await incrementBalance(targetId, amount);
    await logTransaction({
      userId: targetId,
      amount,
      type: 'manual_gift',
      description: `Quick gift by admin ${userId}`,
    });

    const brainEmoji = '<tg-emoji emoji-id="5237799019329105246">🧠</tg-emoji>';
    await api.answerCallbackQuery({
      callback_query_id: query.id,
      text: `✅ +${amount} 🧠 (Баланс: ${newBalance})`,
      show_alert: true,
    });

    const targetLang = targetUser.language === 'ru' ? 'ru' : 'uz';
    const pushText =
      targetLang === 'ru'
        ? `🎁 Администратор начислил тебе +${amount} ${brainEmoji}! Текущий баланс: ${newBalance} ${brainEmoji}.`
        : `🎁 Administrator sizga +${amount} ${brainEmoji} taqdim etdi! Joriy balans: ${newBalance} ${brainEmoji}.`;

    try {
      await callStudentBot('sendMessage', {
        chat_id: targetId,
        text: pushText,
        parse_mode: 'HTML',
      });
    } catch {}
    return;
  }

  if (data === 'broadcast:cancel') {
    await clearBotState(userId);
    if (query.message) {
      if (query.message.photo) {
        await api.editMessageReplyMarkup({
          chat_id: query.message.chat.id,
          message_id: query.message.message_id,
        });
        await api.sendMessage({
          chat_id: query.message.chat.id,
          text: '❌ Рассылка отменена.',
          parse_mode: 'HTML',
        });
      } else {
        await api.editMessageText({
          chat_id: query.message.chat.id,
          message_id: query.message.message_id,
          text: '❌ Рассылка отменена.',
          parse_mode: 'HTML',
        });
      }
    }
    await api.answerCallbackQuery({ callback_query_id: query.id });
    return;
  }

  if (data !== 'broadcast:confirm') {
    await api.answerCallbackQuery({ callback_query_id: query.id });
    return;
  }

  const st = await getBotState(userId);
  if (!st || st.state !== 'waiting_broadcast_confirm') {
    await api.answerCallbackQuery({
      callback_query_id: query.id,
      text: 'Черновик не найден.',
      show_alert: true,
    });
    return;
  }

  const payload = st.data || {};
  await clearBotState(userId);

  if (query.message) {
    await api.editMessageReplyMarkup({
      chat_id: query.message.chat.id,
      message_id: query.message.message_id,
    });
  }
  await api.answerCallbackQuery({
    callback_query_id: query.id,
    text: 'Рассылка запущена...',
  });

  const recipientIds = (payload.recipient_ids || []).map(Number);
  const text = payload.text || '';
  const entities = payload.entities || [];
  const photoFileId = payload.photo_file_id || null;

  let photoBytes = null;
  if (photoFileId) {
    photoBytes = await api.getFileContent(photoFileId);
  }

  let sent = 0;
  let failed = 0;
  let cachedStudentFileId = null;

  const deliverOne = async (uid) => {
    try {
      if (photoBytes) {
        if (cachedStudentFileId) {
          await callStudentBot('sendPhoto', {
            chat_id: uid,
            photo: cachedStudentFileId,
            caption: text || undefined,
            caption_entities: entities.length ? entities : undefined,
          });
        } else {
          const msg = await sendStudentPhotoBytes({
            chatId: uid,
            bytes: photoBytes,
            caption: text,
            captionEntities: entities,
          });
          if (msg?.photo?.length) {
            cachedStudentFileId = msg.photo[msg.photo.length - 1].file_id;
          }
        }
      } else {
        await callStudentBot('sendMessage', {
          chat_id: uid,
          text,
          entities: entities.length ? entities : undefined,
        });
      }
      sent += 1;
    } catch (err) {
      if (err?.errorCode !== 403) {
        console.warn(`Broadcast error for ${uid}:`, err?.message || err);
      }
      failed += 1;
    }
  };

  let startIndex = 0;
  if (photoBytes && recipientIds.length > 0) {
    while (startIndex < recipientIds.length && !cachedStudentFileId) {
      await deliverOne(recipientIds[startIndex]);
      startIndex += 1;
    }
  }

  const BATCH_SIZE = 20;
  for (let i = startIndex; i < recipientIds.length; i += BATCH_SIZE) {
    const batch = recipientIds.slice(i, i + BATCH_SIZE);
    await Promise.all(batch.map(deliverOne));
  }

  if (query.message) {
    await api.sendMessage({
      chat_id: query.message.chat.id,
      text: `✅ Доставлено: ${sent} | Заблокировали: ${failed}`,
      parse_mode: 'HTML',
    });
  }
}
