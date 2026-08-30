"""
╔══════════════════════════════════════════════════════════════════╗
║  ЕДИНЫЙ ФАЙЛ ВСЕХ СООБЩЕНИЙ БОТА                               ║
║  Редактируйте тексты здесь — они подтянутся во всех хэндлерах   ║
╚══════════════════════════════════════════════════════════════════╝

Использование в коде:
    from bot.utils.messages import msg
    text = msg('welcome', lang='ru')
    text = msg('test_result', lang='uz', stars=3, correct=9, total=10)
"""

# ─────────────────────────────────────────────
# Системный промпт для Gemini AI
# ─────────────────────────────────────────────
GEMINI_SYSTEM_PROMPT = (
    "Ты добрый, поддерживающий и мудрый репетитор. Ученик ошибся в тесте. "
    "Мягко объясни ему, в чём его логическая ошибка, и дай полезную подсказку. "
    "Объясняй дружелюбно, уложись в 2-3 предложения. НЕ давай прямого правильного ответа."
)

# ─────────────────────────────────────────────
# Подарок за идеальное прохождение курса
# ─────────────────────────────────────────────
GIFT_COMMENT = "За идеальную учебу!"

# ─────────────────────────────────────────────
# Все сообщения бота (ru / uz)
# ─────────────────────────────────────────────
MESSAGES = {

    # ── ОНБОРДИНГ ──────────────────────────────
    'choose_language': {
        'ru': '🌐 Выберите язык / Tilni tanlang:',
        'uz': '🌐 Выберите язык / Tilni tanlang:',
    },
    'enter_name': {
        'ru': '✏️ Введите ваше полное имя:',
        'uz': '✏️ To\'liq ismingizni kiriting:',
    },
    'enter_class': {
        'ru': '🏫 Введите ваш класс (например, 9-А):',
        'uz': '🏫 Sinfingizni kiriting (masalan, 9-A):',
    },
    'registered': {
        'ru': '🎉 Регистрация завершена! Добро пожаловать на платформу!',
        'uz': '🎉 Ro\'yxatdan o\'tish yakunlandi! Platformaga xush kelibsiz!',
    },
    'welcome_back': {
        'ru': '👋 С возвращением, {name}!',
        'uz': '👋 Qaytganingizdan xursandmiz, {name}!',
    },

    # ── КНОПКИ ─────────────────────────────────
    'btn_open_platform': {
        'ru': '🚀 Открыть платформу',
        'uz': '🚀 Platformani ochish',
    },
    'btn_admin_panel': {
        'ru': '⚙️ Панель управления',
        'uz': '⚙️ Boshqaruv paneli',
    },
    'btn_lang_ru': {
        'ru': '🇷🇺 Русский',
        'uz': '🇷🇺 Русский',
    },
    'btn_lang_uz': {
        'ru': '🇺🇿 O\'zbekcha',
        'uz': '🇺🇿 O\'zbekcha',
    },

    # ── ТЕСТИРОВАНИЕ ───────────────────────────
    'test_starting': {
        'ru': '📝 Тест начинается! Вопросов: {count}\nНа каждый вопрос отведено ограниченное время. Удачи!',
        'uz': '📝 Test boshlanmoqda! Savollar soni: {count}\nHar bir savol uchun vaqt cheklangan. Omad!',
    },
    'test_question': {
        'ru': '❓ Вопрос {current}/{total} (⏱ {time} сек):\n\n{text}',
        'uz': '❓ Savol {current}/{total} (⏱ {time} soniya):\n\n{text}',
    },
    'test_correct': {
        'ru': '✅ Правильно!',
        'uz': '✅ To\'g\'ri!',
    },
    'test_incorrect': {
        'ru': '❌ Неверно.',
        'uz': '❌ Noto\'g\'ri.',
    },
    'test_time_up': {
        'ru': '❌ Время вышло!',
        'uz': '❌ Vaqt tugadi!',
    },
    'test_result': {
        'ru': (
            '🏁 Тест завершён!\n\n'
            '✅ Правильных: {correct}/{total}\n'
            '⭐ Звёзд: {stars}/3\n\n'
            '{verdict}'
        ),
        'uz': (
            '🏁 Test yakunlandi!\n\n'
            '✅ To\'g\'ri javoblar: {correct}/{total}\n'
            '⭐ Yulduzlar: {stars}/3\n\n'
            '{verdict}'
        ),
    },
    'test_verdict_0': {
        'ru': '😔 Попробуйте ещё раз, вы справитесь!',
        'uz': '😔 Qayta urinib ko\'ring, uddalaysiz!',
    },
    'test_verdict_1': {
        'ru': '🙂 Неплохо, но можно лучше!',
        'uz': '🙂 Yomon emas, lekin yaxshiroq bo\'lishi mumkin!',
    },
    'test_verdict_2': {
        'ru': '😊 Хороший результат! Почти отлично!',
        'uz': '😊 Yaxshi natija! Deyarli a\'lo!',
    },
    'test_verdict_3': {
        'ru': '🌟 Превосходно! Идеальный результат!',
        'uz': '🌟 A\'lo! Mukammal natija!',
    },
    'test_no_questions': {
        'ru': '⚠️ К этому уроку пока нет вопросов.',
        'uz': '⚠️ Bu dars uchun hali savollar yo\'q.',
    },
    'test_ai_hint': {
        'ru': '\n\n💡 Ответьте на это сообщение командой /ai, чтобы получить объяснение.',
        'uz': '\n\n💡 Bu xabarga /ai buyrug\'i bilan javob bering — tushuntirish olasiz.',
    },

    # ── AI ПОМОЩНИК ────────────────────────────
    'ai_explanation': {
        'ru': '🤖 Объяснение ИИ:\n\n{text}',
        'uz': '🤖 AI tushuntirishi:\n\n{text}',
    },
    'ai_error': {
        'ru': '⚠️ Не удалось получить объяснение. Попробуйте позже.',
        'uz': '⚠️ Tushuntirishni olib bo\'lmadi. Keyinroq urinib ko\'ring.',
    },

    # ── ЭКОНОМИКА (НЕЙРОНЫ) ────────────────────
    'insufficient_balance': {
        'ru': '❌ Недостаточно Нейронов на балансе.\nВаш баланс: 🧠 {balance}',
        'uz': '❌ Balansda Neyronlar yetarli emas.\nBalansingiz: 🧠 {balance}',
    },
    'streak_frozen': {
        'ru': '❄️ Стрик заморожен! Списано 10000 🧠.\nВаш стрик в безопасности на сегодня.',
        'uz': '❄️ Strik muzlatildi! 10000 🧠 yechib olindi.\nStrikingiz bugun xavfsiz.',
    },
    'promo_applied': {
        'ru': '🎉 Промокод применён! Начислено: +{amount} 🧠',
        'uz': '🎉 Promokod qo\'llanildi! Qo\'shildi: +{amount} 🧠',
    },
    'promo_invalid': {
        'ru': '❌ Промокод недействителен или уже использован.',
        'uz': '❌ Promokod yaroqsiz yoki allaqachon ishlatilgan.',
    },
    'referral_bonus': {
        'ru': '🎁 Реферальный бонус! Вам начислено {amount} 🧠',
        'uz': '🎁 Referal bonusi! Sizga {amount} 🧠 qo\'shildi',
    },

    # ── ПОДАРКИ ────────────────────────────────
    'gift_perfect_course': {
        'ru': '🎁🌟 Поздравляем! Вы прошли весь курс «{course}» на 3 звезды!\nВам отправлен подарок — за идеальную учёбу!',
        'uz': '🎁🌟 Tabriklaymiz! Siz «{course}» kursini 3 yulduzga yakunladingiz!\nSizga sovg\'a yuborildi — a\'lo o\'qish uchun!',
    },

    # ── АДМИН-КОМАНДЫ ──────────────────────────
    'admin_gift_sent': {
        'ru': '✅ Начислено {amount} 🧠 пользователю {user_id}.',
        'uz': '✅ {user_id} foydalanuvchiga {amount} 🧠 qo\'shildi.',
    },
    'admin_gift_received': {
        'ru': '🎁 Вам начислено {amount} 🧠 от администратора!',
        'uz': '🎁 Sizga administrator tomonidan {amount} 🧠 qo\'shildi!',
    },
    'admin_gift_usage': {
        'ru': '📌 Использование: /gift [Telegram ID] [Сумма]',
        'uz': '📌 Foydalanish: /gift [Telegram ID] [Summa]',
    },
    'admin_gift_error': {
        'ru': '❌ Ошибка. Проверьте формат: /gift [ID] [Сумма]',
        'uz': '❌ Xatolik. Formatni tekshiring: /gift [ID] [Summa]',
    },
    'admin_broadcast_sent': {
        'ru': '✅ Рассылка отправлена {count} ученикам.',
        'uz': '✅ Xabar {count} o\'quvchiga yuborildi.',
    },
    'admin_broadcast_empty': {
        'ru': '📌 Использование: /send [Текст сообщения]',
        'uz': '📌 Foydalanish: /send [Xabar matni]',
    },
    'admin_subscribers': {
        'ru': (
            '📊 Статистика по вашему предмету:\n\n'
            '👨‍🎓 Учеников: {students}\n'
            '📝 Пройдено тестов: {tests}\n'
            '📈 Средний балл: {avg:.1f}/3'
        ),
        'uz': (
            '📊 Fanga oid statistika:\n\n'
            '👨‍🎓 O\'quvchilar: {students}\n'
            '📝 Testlar topshirildi: {tests}\n'
            '📈 O\'rtacha ball: {avg:.1f}/3'
        ),
    },
    'no_permission': {
        'ru': '🚫 У вас нет прав для выполнения этой команды.',
        'uz': '🚫 Sizda bu buyruqni bajarish huquqi yo\'q.',
    },

    # ── МИДЛВАРЬ ───────────────────────────────
    'please_start': {
        'ru': '👋 Сначала зарегистрируйтесь командой /start',
        'uz': '👋 Avval /start buyrug\'i bilan ro\'yxatdan o\'ting',
    },
}


def msg(key: str, lang: str = 'ru', **kwargs) -> str:
    """
    Получить сообщение по ключу и языку с подстановкой переменных.

    Примеры:
        msg('welcome_back', 'ru', name='Алишер')
        msg('test_result', 'uz', correct=8, total=10, stars=2, verdict='...')
        msg('admin_gift_sent', amount=500, user_id=123456)
    """
    messages = MESSAGES.get(key)
    if not messages:
        return key  # fallback — вернуть ключ как есть

    text = messages.get(lang, messages.get('ru', key))

    if kwargs:
        try:
            text = text.format(**kwargs)
        except (KeyError, IndexError):
            pass  # если переменная не найдена — вернуть как есть

    return text


def get_verdict(stars: int, lang: str = 'ru') -> str:
    """Получить вердикт по количеству звёзд."""
    return msg(f'test_verdict_{stars}', lang)


# ─────────────────────────────────────────────
# Обратная совместимость со старым i18n.py
# ─────────────────────────────────────────────
def t(key: str, lang: str = 'ru', **kwargs) -> str:
    """Алиас для msg() — обратная совместимость."""
    return msg(key, lang, **kwargs)
