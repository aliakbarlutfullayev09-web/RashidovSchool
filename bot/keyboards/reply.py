from aiogram.types import ReplyKeyboardMarkup, KeyboardButton
from aiogram.types.web_app_info import WebAppInfo

def main_menu_reply_keyboard(app_url: str, lang: str = 'ru', user_id: int = None) -> ReplyKeyboardMarkup:
    text = '🚀 Уроки' if lang == 'ru' else 'Darslar'
    final_url = f"{app_url}?user_id={user_id}" if user_id else app_url
    return ReplyKeyboardMarkup(
        keyboard=[
            [KeyboardButton(text=text, web_app=WebAppInfo(url=final_url))]
        ],
        resize_keyboard=True,
        is_persistent=True
    )
