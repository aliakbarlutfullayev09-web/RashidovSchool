from aiogram.types import ReplyKeyboardMarkup, KeyboardButton
from aiogram.types.web_app_info import WebAppInfo

def main_menu_reply_keyboard(app_url: str, lang: str = 'ru', user_id: int = None) -> ReplyKeyboardMarkup:
    text = '🚀 Уроки' if lang == 'ru' else 'Darslar'
    # Use exact canonical URL identical to Main Mini App (no extra query params or unexpected redirects)
    canonical_url = app_url.strip()
    return ReplyKeyboardMarkup(
        keyboard=[
            [KeyboardButton(text=text, web_app=WebAppInfo(url=canonical_url))]
        ],
        resize_keyboard=True,
        is_persistent=True
    )
