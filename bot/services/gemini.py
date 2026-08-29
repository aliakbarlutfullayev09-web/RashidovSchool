import google.generativeai as genai
from bot.utils.messages import GEMINI_SYSTEM_PROMPT


async def get_ai_explanation(
    question_text: str,
    options: list,
    correct_index: int,
    user_answer_index: int,
    api_key: str
) -> str:
    """
    Вызывает Gemini API для объяснения ошибки ученика.
    Системный промпт берётся из messages.py.
    """
    genai.configure(api_key=api_key)
    model = genai.GenerativeModel('gemini-1.5-flash')

    correct_option = options[correct_index] if 0 <= correct_index < len(options) else ""
    user_option = options[user_answer_index] if 0 <= user_answer_index < len(options) else ""

    prompt = (
        f"{GEMINI_SYSTEM_PROMPT}\n\n"
        f"Вопрос: {question_text}\n"
        f"Правильный ответ: {correct_option}\n"
        f"Ответ ученика: {user_option}"
    )

    try:
        response = model.generate_content(prompt)
        return response.text
    except Exception as e:
        return f"Ошибка AI: {str(e)}"
