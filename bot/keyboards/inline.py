from aiogram.types import InlineKeyboardMarkup, InlineKeyboardButton, WebAppInfo
import random

def language_keyboard() -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="🇷🇺 Русский", callback_data="lang_ru"),
         InlineKeyboardButton(text="🇺🇿 O'zbekcha", callback_data="lang_uz")]
    ])

def main_menu_keyboard(app_url: str) -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="🚀 Открыть платформу", web_app=WebAppInfo(url=app_url))]
    ])

def admin_menu_keyboard(app_url: str) -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="⚙️ Панель управления", web_app=WebAppInfo(url=app_url))]
    ])

def quiz_options_keyboard(options: list, question_index: int) -> InlineKeyboardMarkup:
    enumerated_options = list(enumerate(options))
    random.shuffle(enumerated_options)
    
    keyboard = []
    for orig_idx, text in enumerated_options:
        keyboard.append([InlineKeyboardButton(text=text, callback_data=f"answer_{question_index}_{orig_idx}")])
        
    return InlineKeyboardMarkup(inline_keyboard=keyboard)
