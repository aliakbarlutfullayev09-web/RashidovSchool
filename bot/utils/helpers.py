import random
import string

def calculate_stars(correct: int, total: int) -> int:
    if total == 0:
        return 0
    percentage = (correct / total) * 100
    if percentage < 50:
        return 0
    elif percentage < 70:
        return 1
    elif percentage < 90:
        return 2
    else:
        return 3

def generate_promo_code(length=8) -> str:
    return ''.join(random.choices(string.ascii_uppercase + string.digits, k=length))

def format_neurons(amount: int) -> str:
    return f'🧠 {amount} Нейронов'
