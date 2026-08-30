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
    
    valid_model_name = None
    try:
        for m in genai.list_models():
            if 'generateContent' in m.supported_generation_methods:
                valid_model_name = m.name
                if 'flash' in m.name.lower():
                    break
    except Exception as e:
        return f"Ошибка AI (Поиск моделей): {str(e)}"
        
    if not valid_model_name:
        valid_model_name = 'gemini-1.5-flash' # fallback

    model = genai.GenerativeModel(valid_model_name)

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
