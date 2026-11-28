export function validatePreCheckout(payment, query) {
  if (!payment) return { ok: false, errorMessage: 'Заказ не найден. Создайте счёт заново.' };
  if (payment.provider !== 'stars' || payment.currency !== 'XTR') {
    return { ok: false, errorMessage: 'Неверный тип заказа.' };
  }
  if (payment.status !== 'pending') {
    return { ok: false, errorMessage: 'Счёт уже оплачен или отменён.' };
  }
  if (Number(payment.user_id) !== Number(query.from?.id)) {
    return { ok: false, errorMessage: 'Этот счёт принадлежит другому пользователю.' };
  }
  if (String(query.currency) !== 'XTR') {
    return { ok: false, errorMessage: 'Неверная валюта платежа.' };
  }
  const expectedAmount = Number(payment.amount_minor ?? payment.amount ?? 0);
  if (Number(query.total_amount) !== expectedAmount || expectedAmount <= 0) {
    return { ok: false, errorMessage: 'Сумма платежа не совпадает с заказом.' };
  }
  return { ok: true };
}
