import asyncio
from aiogram import Bot
from aiogram.types import BotCommand, MenuButtonWebApp, WebAppInfo
from config import get_settings


async def main() -> None:
    s = get_settings()
    base = s.BASE_WEBHOOK_URL.rstrip("/")

    student_bot = Bot(token=s.STUDENT_BOT_TOKEN)
    admin_bot = Bot(token=s.ADMIN_BOT_TOKEN)

    try:
        await student_bot.set_webhook(
            url=f"{base}/webhook/student",
            secret_token=s.WEBHOOK_SECRET,
            drop_pending_updates=False,
        )
        await student_bot.set_chat_menu_button(
            menu_button=MenuButtonWebApp(
                text="🚀 Учиться",
                web_app=WebAppInfo(url=s.STUDENT_WEBAPP_URL),
            )
        )
        await student_bot.set_my_commands(
            [
                BotCommand(command="start", description="Boshlash / Старт"),
                BotCommand(command="lang", description="Tilni tanlash / Сменить язык"),
                BotCommand(command="support", description="Aloqa va yordam / Связь и помощь"),
            ]
        )

        await admin_bot.set_webhook(
            url=f"{base}/webhook/admin",
            secret_token=s.WEBHOOK_SECRET,
            drop_pending_updates=False,
        )
        await admin_bot.set_my_commands(
            [
                BotCommand(command="start", description="Профиль и панель управления"),
                BotCommand(command="user", description="Профиль ученика (/user ID или имя)"),
                BotCommand(command="gift", description="Начислить Нейроны ученику"),
                BotCommand(command="send", description="Рассылка по ученикам"),
                BotCommand(command="help", description="Список команд бота"),
            ]
        )
    finally:
        await student_bot.session.close()
        await admin_bot.session.close()


if __name__ == "__main__":
    asyncio.run(main())
