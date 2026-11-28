import { api } from 'sdk';
import { CONFIG } from '../lib/config.js';
import {
  completeStarsPayment,
  createUser,
  getLesson,
  getUser,
  incrementBalance,
  logTransaction,
  refundStarsPayment,
} from '../lib/supabase.js';
import {
  escapeHtml,
  renderLangRichHtml,
  renderStartRichHtml,
  renderSupportRichHtml,
  sendRichWithFallback,
} from '../lib/widgets.js';

function normLang(lang) {
  return lang === 'ru' ? 'ru' : 'uz';
}

function parseRefId(arg, selfId) {
  if (!arg || !arg.startsWith('ref_')) return null;
  const raw = arg.slice(4).trim();
  if (!/^\d+$/.test(raw)) return null;
  const refId = Number(raw);
  return refId !== selfId ? refId : null;
}

async function handleStart(message, startArg) {
  const tgUser = message.from;
  if (!tgUser) return;

  const fullName = [tgUser.first_name, tgUser.last_name].filter(Boolean).join(' ') || 'Student';
  let user = await getUser(tgUser.id);

  if (!user) {
    const refId = parseRefId(startArg, tgUser.id);
    const refUser = refId ? await getUser(refId) : null;
    const actualRef = refUser ? refId : null;

    user = await createUser({
      telegramId: tgUser.id,
      fullName,
      referredBy: actualRef,
      language: 'uz',
    });

    if (refUser && actualRef) {
      await incrementBalance(actualRef, 1000);
      await logTransaction({
        userId: actualRef,
        amount: 1000,
        type: 'referral',
        description: `Referral bonus from user ${tgUser.id}`,
      });

      const refLang = normLang(refUser.language);
      const brainEmoji = '<tg-emoji emoji-id="5237799019329105246">🧠</tg-emoji>';
      const pushText =
        refLang === 'ru'
          ? `🎁 Друг присоединился по твоей ссылке! Тебе начислено +1000 ${brainEmoji}.`
          : `🎁 Do'stingiz havolangiz orqali qo'shildi! Sizga +1000${brainEmoji} berildi.`;

      try {
        await api.sendMessage({
          chat_id: actualRef,
          text: pushText,
          parse_mode: 'HTML',
        });
      } catch (err) {
        console.warn('Referral push failed:', err?.message || err);
      }
    }
  }

  if (startArg && startArg.startsWith('video_')) {
    const lessonId = Number(startArg.slice(6).trim());
    if (lessonId) {
      const lesson = await getLesson(lessonId);
      if (lesson && lesson.video_url) {
        try {
          await api.sendVideo({
            chat_id: message.chat.id,
            video: lesson.video_url,
            caption: lesson.title || 'Video dars',
            supports_streaming: true,
            protect_content: true,
          });
        } catch (err) {
          console.warn('Protected sendVideo failed:', err?.message || err);
        }
        return;
      }
    }
  }

  const lang = normLang(user.language);
  const name = user.full_name || fullName;
  const balance = Number(user.balance || 0);
  const btnText = lang === 'ru' ? 'Открыть платформу' : 'Platformani ochish';

  const fallbackReplyMarkup = {
    inline_keyboard: [
      [
        {
          text: btnText,
          icon_custom_emoji_id: '5890925363067886150',
          web_app: { url: CONFIG.STUDENT_WEBAPP_URL },
          style: 'primary',
        },
      ],
    ],
  };

  const safeName = escapeHtml(name);
  const fallbackText =
    lang === 'ru'
      ? `<tg-emoji emoji-id="5247133031235329609">👋</tg-emoji> <b>Привет, ${safeName}!</b>`
      : `<tg-emoji emoji-id="5247133031235329609">👋</tg-emoji> <b>Salom, ${safeName}!</b>`;

  await sendRichWithFallback({
    chatId: message.chat.id,
    richHtml: renderStartRichHtml(name, balance, lang),
    fallbackText,
    fallbackReplyMarkup,
  });
}

async function handleLang(message) {
  const tgUser = message.from;
  if (!tgUser) return;
  const user = await getUser(tgUser.id);
  const lang = normLang(user?.language);

  const fallbackText =
    lang === 'ru'
      ? '<tg-emoji emoji-id="5409014875517104495">📝</tg-emoji> Выберите язык интерфейса:'
      : '<tg-emoji emoji-id="5409014875517104495">📝</tg-emoji> Interfeys tilini tanlang:';

  const fallbackReplyMarkup = {
    inline_keyboard: [
      [
        { text: "🇺🇿 O'zbekcha", callback_data: 'lang:uz' },
        { text: '🇷🇺 Русский', callback_data: 'lang:ru' },
      ],
    ],
  };

  await sendRichWithFallback({
    chatId: message.chat.id,
    richHtml: renderLangRichHtml(lang),
    fallbackText,
    fallbackReplyMarkup,
  });
}

async function handleSupport(message) {
  const tgUser = message.from;
  if (!tgUser) return;
  const user = await getUser(tgUser.id);
  const lang = normLang(user?.language);
  const supportUrl = `https://t.me/${CONFIG.SUPPORT_USERNAME}`;

  const fallbackText =
    lang === 'ru'
      ? `<tg-emoji emoji-id="5409194306365829029">✈️</tg-emoji> <b>Поддержка</b>\n\nЕсли вы обнаружили техническую ошибку в работе платформы или у вас есть вопросы, пожалуйста, свяжитесь с нами.`
      : `<tg-emoji emoji-id="5409194306365829029">✈️</tg-emoji> <b>Qo'llab quvvatlash</b>\n\nAgar platforma ishlashida texnik xatolik aniqlagan bo'lsangiz yoki savollaringiz mavjud bo'lsa, iltimos, biz bilan bog'laning.`;

  const btnText = lang === 'ru' ? 'Связаться' : "Bog'lanish";

  const fallbackReplyMarkup = {
    inline_keyboard: [
      [
        {
          text: btnText,
          icon_custom_emoji_id: '5408955961450705923',
          url: supportUrl,
          style: 'primary',
        },
      ],
    ],
  };

  await sendRichWithFallback({
    chatId: message.chat.id,
    richHtml: renderSupportRichHtml(lang),
    fallbackText,
    fallbackReplyMarkup,
  });
}

async function handleSuccessfulPayment(message) {
  const tgUser = message.from;
  const sp = message.successful_payment;
  if (!tgUser || !sp) return;

  let result;
  try {
    result = await completeStarsPayment({
      merchantTransId: sp.invoice_payload,
      userId: tgUser.id,
      totalStars: sp.total_amount,
      telegramChargeId: sp.telegram_payment_charge_id,
    });
  } catch {
    console.warn('stars_complete failed', { orderId: sp.invoice_payload });
    return;
  }

  if (result?.already_paid) {
    return;
  }

  const amount = Number(result?.xp_credited || 0);
  const newBalance = Number(result?.new_balance || 0);
  const user = await getUser(tgUser.id);
  const lang = normLang(user?.language);
  const partyEmoji = '<tg-emoji emoji-id="5436040291507247633">🎉</tg-emoji>';
  const brainEmoji = '<tg-emoji emoji-id="5237799019329105246">🧠</tg-emoji>';
  const text =
    lang === 'ru'
      ? `${partyEmoji} Баланс пополнен на +${amount} ${brainEmoji}! Текущий баланс: ${newBalance} ${brainEmoji}.`
      : `${partyEmoji} Balansingiz +${amount} ${brainEmoji} ga to'ldirildi! Joriy balans: ${newBalance} ${brainEmoji}.`;

  await api.sendMessage({
    chat_id: message.chat.id,
    text,
    parse_mode: 'HTML',
  });
}

async function handleRefundedPayment(message) {
  const tgUser = message.from;
  const rp = message.refunded_payment;
  if (!tgUser || !rp) return;

  let result;
  try {
    result = await refundStarsPayment({
      userId: tgUser.id,
      totalStars: rp.total_amount,
      telegramChargeId: rp.telegram_payment_charge_id,
    });
  } catch {
    console.warn('stars_refund failed', { orderId: rp.invoice_payload });
    return;
  }

  if (result?.already_refunded) return;
  const deducted = Number(result?.xp_deducted || 0);
  await api.sendMessage({
    chat_id: message.chat.id,
    text: `↩️ Возврат по оплате выполнен. Списано ${deducted} 🧠.`,
  });
}

export default async function (message) {
  if (message.successful_payment) {
    await handleSuccessfulPayment(message);
    return;
  }
  if (message.refunded_payment) {
    await handleRefundedPayment(message);
    return;
  }

  const text = (message.text || '').trim();
  if (!text.startsWith('/')) return;

  const [rawCmd, ...rest] = text.split(/\s+/);
  const cmd = rawCmd.split('@')[0].toLowerCase();
  const arg = rest.join(' ').trim();

  if (cmd === '/start') {
    await handleStart(message, arg);
  } else if (cmd === '/lang') {
    await handleLang(message);
  } else if (cmd === '/support') {
    await handleSupport(message);
  }
}
