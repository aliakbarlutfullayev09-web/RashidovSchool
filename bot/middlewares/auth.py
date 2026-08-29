from aiogram import BaseMiddleware
from aiogram.types import Message, CallbackQuery
from typing import Callable, Dict, Any, Awaitable
from bot.db import get_user
from bot.utils.messages import msg


class AuthMiddleware(BaseMiddleware):
    async def __call__(
        self,
        handler: Callable[[Message, Dict[str, Any]], Awaitable[Any]],
        event: Message | CallbackQuery,
        data: Dict[str, Any]
    ) -> Any:
        pool = data.get('pool')
        if not pool:
            return await handler(event, data)

        user_id = event.from_user.id
        user = await get_user(pool, user_id)

        data['db_user'] = user

        # Если юзер не найден и это не /start и не выбор языка — предложить /start
        if not user:
            if isinstance(event, Message) and event.text and not event.text.startswith('/start'):
                await event.answer(msg('please_start'))
                return
            elif isinstance(event, CallbackQuery) and not event.data.startswith('lang_'):
                await event.answer(msg('please_start'), show_alert=True)
                return

        return await handler(event, data)
