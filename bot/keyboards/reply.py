from aiogram.types import ReplyKeyboardMarkup, KeyboardButton
from aiogram.types.web_app_info import WebAppInfo

def main_menu_reply_keyboard(app_url: str, lang: str = 'ru') -> ReplyKeyboardMarkup:
    text = '🚀 Открыть платформу' if lang == 'ru' else '🚀 Platformani ochish'
    return ReplyKeyboardMarkup(
        keyboard=[
            [KeyboardButton(text=text, web_app=WebAppInfo(url=app_url))]
        ],
        resize_keyboard=True,
        is_persistent=True
    )
