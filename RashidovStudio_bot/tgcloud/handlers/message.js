import { api } from 'sdk';
import { CONFIG } from '../lib/config.js';
import { callStudentBot } from '../lib/student_api.js';
import {
  findUsersByQuery,
  getAdminContext,
  getBotState,
  getStudentIdsForBroadcast,
  getUser,
  incrementBalance,
  logTransaction,
  setBotState,
} from '../lib/supabase.js';

function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

async function sendStudentProfileCard(chatId, student, ctx) {
  const uid = Number(student.telegram_id);
  let tgChat = null;
  try {
    tgChat = await callStudentBot('getChat', { chat_id: uid });
  } catch {
    tgChat = null;
  }

  const username = (tgChat?.username || (Array.isArray(tgChat?.active_usernames) ? tgChat.active_usernames[0] : '') || '').trim();
  const displayName =
    student.full_name ||
    [tgChat?.first_name, tgChat?.last_name].filter(Boolean).join(' ') ||
    `ID ${uid}`;
  const safeName = escapeHtml(displayName);
  const usernameLine = username ? `🔗 <b>Username:</b> @${escapeHtml(username)}\n` : '';
  const balance = Number(student.balance || 0).toLocaleString('ru-RU');

  const inlineKeyboard = [];
  if (username) {
    inlineKeyboard.push([{ text: `👤 Открыть @${username}`, url: `https://t.me/${username}` }]);
  }
  inlineKeyboard.push([{ text: '✉️ Написать ученику', callback_data: `quick_msg:${uid}` }]);
  if (ctx.isSuperadmin || ctx.canGift) {
    inlineKeyboard.push([
      { text: '🎁 +100 🧠', callback_data: `quick_gift:${uid}:100` },
      { text: '🎁 +500 🧠', callback_data: `quick_gift:${uid}:500` },
    ]);
  }

  await api.sendMessage({
    chat_id: chatId,
    text:
      `👤 <b>Ученик:</b> ${safeName}\n` +
      usernameLine +
      `🆔 <b>Telegram ID:</b> <code>${uid}</code>\n` +
      (!username ? `🔗 <b>Чат без username:</b> <code>tg://openmessage?user_id=${uid}</code>\n` : '') +
      `🎓 <b>Класс:</b> ${escapeHtml(student.class_group || 'Abituriyent')}\n` +
      `🛡 <b>Роль:</b> <code>${escapeHtml(student.role || 'student')}</code>\n` +
      `🧠 <b>Баланс:</b> ${balance}\n` +
      `🔥 <b>Streak:</b> ${Number(student.streak_days || 0)} дн.\n` +
      `📅 <b>Активность:</b> ${escapeHtml(student.last_active_date || '—')}`,
    parse_mode: 'HTML',
    reply_markup: { inline_keyboard: inlineKeyboard },
  });
}

async function handleUserLookup(message, ctx, argsText) {
  const query = String(argsText || '').trim().replace(/^@/, '');
  if (!query) {
    await api.sendMessage({
      chat_id: message.chat.id,
      text: '❗️ Укажите Telegram ID, @username или имя ученика:\n<code>/user 123456789</code>\n<code>/user Алишер</code>',
      parse_mode: 'HTML',
    });
    return;
  }

  let matches = await findUsersByQuery(query);
  if (!matches.length && !/^\d+$/.test(query)) {
    try {
      const tgChat = await callStudentBot('getChat', { chat_id: `@${query}` });
      if (tgChat?.id) {
        const byId = await getUser(tgChat.id);
        if (byId) matches = [byId];
      }
    } catch {}
  }

  if (!matches.length) {
    await api.sendMessage({
      chat_id: message.chat.id,
      text: `❗️ Ученик по запросу <code>${escapeHtml(query)}</code> не найден.`,
      parse_mode: 'HTML',
    });
    return;
  }

  if (matches.length === 1) {
    await sendStudentProfileCard(message.chat.id, matches[0], ctx);
    return;
  }

  const lines = matches.slice(0, 8).map((u) => {
    const uname = escapeHtml(u.full_name || `ID ${u.telegram_id}`);
    return `• <b>${uname}</b> — <code>${u.telegram_id}</code> (🧠 ${Number(u.balance || 0)})`;
  });
  await api.sendMessage({
    chat_id: message.chat.id,
    text:
      `🔎 <b>Найдено учеников: ${matches.length}</b>\n\n` +
      lines.join('\n') +
      `\n\nОтправьте <code>/user ID</code> для подробного профиля.`,
    parse_mode: 'HTML',
  });
}

async function handleHelp(message, ctx) {
  const commandsList = [
    '• <code>/start</code> — Профиль и панель управления',
    '• <code>/user &lt;ID или имя&gt;</code> — Профиль ученика и быстрые действия',
  ];
  if (ctx.isSuperadmin || ctx.canGift) {
    commandsList.push('• <code>/gift &lt;ID&gt; &lt;сумма&gt;</code> — Начислить Нейроны ученику');
  }
  if (ctx.isSuperadmin || ctx.canSend) {
    commandsList.push('• <code>/send</code> — Рассылка по ученикам');
  }
  commandsList.push('• <code>/help</code> — Список команд');

  await api.sendMessage({
    chat_id: message.chat.id,
    text: `⚙️ <b>Команды Rashidov Studio Bot</b>\n\n${commandsList.join('\n')}`,
    parse_mode: 'HTML',
  });
}

async function handleStart(message, ctx, startArg) {
  if (startArg && startArg.startsWith('user_')) {
    const rawId = startArg.slice(5).trim();
    if (/^\d+$/.test(rawId)) {
      const target = await getUser(Number(rawId));
      if (target) {
        await sendStudentProfileCard(message.chat.id, target, ctx);
        return;
      }
    }
  }

  const name = escapeHtml(
    ctx.user.full_name ||
      [message.from.first_name, message.from.last_name].filter(Boolean).join(' ') ||
      'Admin'
  );
  const subjectsStr =
    ctx.subjectNames.map(escapeHtml).join(', ') || 'Не привязан';

  await api.sendMessage({
    chat_id: message.chat.id,
    text:
      `👤 <b>Имя:</b> ${name}\n` +
      `🛡 <b>Роль:</b> <code>${escapeHtml(ctx.role)}</code>\n` +
      `📚 <b>Предмет:</b> ${subjectsStr}`,
    parse_mode: 'HTML',
    reply_markup: {
      inline_keyboard: [
        [
          {
            text: '⚙️ Панель управления',
            web_app: { url: CONFIG.ADMIN_WEBAPP_URL },
          },
        ],
      ],
    },
  });
}

async function handleGift(message, ctx, argsText) {
  if (!ctx.isSuperadmin && !ctx.canGift) {
    await api.sendMessage({
      chat_id: message.chat.id,
      text: '⛔ У вас нет права <code>can_gift</code>.',
      parse_mode: 'HTML',
    });
    return;
  }

  const parts = argsText.split(/\s+/).filter(Boolean);
  if (parts.length !== 2 || !/^-?\d+$/.test(parts[0]) || !/^\d+$/.test(parts[1])) {
    await api.sendMessage({
      chat_id: message.chat.id,
      text: '❗️ Используйте: <code>/gift 123456789 500</code>',
      parse_mode: 'HTML',
    });
    return;
  }

  const targetUserId = Number(parts[0]);
  const amount = Number(parts[1]);
  if (amount <= 0) {
    await api.sendMessage({
      chat_id: message.chat.id,
      text: '❗️ Сумма должна быть больше 0: <code>/gift 123456789 500</code>',
      parse_mode: 'HTML',
    });
    return;
  }

  const targetUser = await getUser(targetUserId);
  if (!targetUser) {
    await api.sendMessage({
      chat_id: message.chat.id,
      text: `❗️ Пользователь <code>${targetUserId}</code> не найден.`,
      parse_mode: 'HTML',
    });
    return;
  }

  const newBalance = await incrementBalance(targetUserId, amount);
  await logTransaction({
    userId: targetUserId,
    amount,
    type: 'manual_gift',
    description: `Manual gift by admin ${message.from.id}`,
  });

  const brainEmoji = '<tg-emoji emoji-id="5237799019329105246">🧠</tg-emoji>';

  await api.sendMessage({
    chat_id: message.chat.id,
    text: `✅ Начислено +${amount} ${brainEmoji} пользователю ${targetUserId}. Новый баланс: ${newBalance} ${brainEmoji}.`,
    parse_mode: 'HTML',
  });

  const targetLang = targetUser.language === 'ru' ? 'ru' : 'uz';
  const pushText =
    targetLang === 'ru'
      ? `🎁 Администратор начислил тебе +${amount} ${brainEmoji}! Текущий баланс: ${newBalance} ${brainEmoji}.`
      : `🎁 Administrator sizga +${amount} ${brainEmoji} taqdim etdi! Joriy balans: ${newBalance} ${brainEmoji}.`;

  try {
    await callStudentBot('sendMessage', {
      chat_id: targetUserId,
      text: pushText,
      parse_mode: 'HTML',
    });
  } catch (err) {
    console.warn('Cross-delivery gift push failed:', err?.message || err);
  }
}

async function handleSendInit(message, ctx) {
  if (!ctx.isSuperadmin && !ctx.canSend) {
    await api.sendMessage({
      chat_id: message.chat.id,
      text: '⛔ У вас нет права <code>can_send</code>.',
      parse_mode: 'HTML',
    });
    return;
  }

  await setBotState(message.from.id, 'waiting_broadcast_content', {
    subject_ids: ctx.subjectIds,
  });

  await api.sendMessage({
    chat_id: message.chat.id,
    text: '✉️ Пришлите текст или фото с подписью для рассылки:',
    parse_mode: 'HTML',
    reply_markup: {
      inline_keyboard: [[{ text: '❌ Отмена', callback_data: 'broadcast:cancel' }]],
    },
  });
}

async function handleBroadcastDraft(message, botState) {
  const photoFileId = message.photo?.length
    ? message.photo[message.photo.length - 1].file_id
    : null;
  const contentText = message.text ?? message.caption ?? '';
  const entities = message.entities ?? message.caption_entities ?? [];

  if (!photoFileId && !contentText) {
    await api.sendMessage({
      chat_id: message.chat.id,
      text: '❗️ Пришлите текст или фото с подписью.',
      parse_mode: 'HTML',
    });
    return;
  }

  const subjectIds = botState?.data?.subject_ids ?? null;
  const recipientIds = await getStudentIdsForBroadcast(subjectIds);
  const count = recipientIds.length;

  await setBotState(message.from.id, 'waiting_broadcast_confirm', {
    text: contentText,
    entities,
    photo_file_id: photoFileId,
    recipient_ids: recipientIds,
  });

  const replyMarkup = {
    inline_keyboard: [
      [{ text: `✅ Отправить (${count})`, callback_data: 'broadcast:confirm' }],
      [{ text: '❌ Отмена', callback_data: 'broadcast:cancel' }],
    ],
  };

  if (photoFileId) {
    await api.sendPhoto({
      chat_id: message.chat.id,
      photo: photoFileId,
      caption: contentText || undefined,
      caption_entities: entities.length ? entities : undefined,
      reply_markup: replyMarkup,
    });
  } else {
    await api.sendMessage({
      chat_id: message.chat.id,
      text: contentText,
      entities: entities.length ? entities : undefined,
      reply_markup: replyMarkup,
    });
  }
}

export default async function (message) {
  const tgUser = message.from;
  if (!tgUser) return;

  const ctx = await getAdminContext(tgUser.id);
  if (!ctx) {
    await api.sendMessage({
      chat_id: message.chat.id,
      text: '⛔ Доступ запрещён.',
      parse_mode: 'HTML',
    });
    return;
  }

  const text = (message.text || '').trim();
  if (text.startsWith('/')) {
    const [rawCmd, ...rest] = text.split(/\s+/);
    const cmd = rawCmd.split('@')[0].toLowerCase();
    const arg = rest.join(' ').trim();

    if (cmd === '/start') {
      await handleStart(message, ctx, arg);
    } else if (cmd === '/user' || cmd === '/profile') {
      await handleUserLookup(message, ctx, arg);
    } else if (cmd === '/gift') {
      await handleGift(message, ctx, arg);
    } else if (cmd === '/send') {
      await handleSendInit(message, ctx);
    } else if (cmd === '/help') {
      await handleHelp(message, ctx);
    } else {
      await handleHelp(message, ctx);
    }
    return;
  }

  const botState = await getBotState(tgUser.id);
  if (botState?.state === 'waiting_broadcast_content') {
    await handleBroadcastDraft(message, botState);
  } else if (botState?.state === 'waiting_direct_msg') {
    const targetId = Number(botState?.data?.target_id);
    const msgText = (message.text || '').trim();
    if (!targetId || !msgText) {
      await api.sendMessage({
        chat_id: message.chat.id,
        text: '❗️ Отправьте текстовое сообщение для ученика.',
        parse_mode: 'HTML',
      });
      return;
    }
    await setBotState(tgUser.id, null, {});
    try {
      await callStudentBot('sendMessage', {
        chat_id: targetId,
        text: msgText,
      });
      await api.sendMessage({
        chat_id: message.chat.id,
        text: `✅ Сообщение отправлено ученику <code>${targetId}</code>.`,
        parse_mode: 'HTML',
      });
    } catch (err) {
      await api.sendMessage({
        chat_id: message.chat.id,
        text: `❌ Не удалось отправить: ${escapeHtml(err?.message || 'Ошибка Telegram')}`,
        parse_mode: 'HTML',
      });
    }
  }
}
