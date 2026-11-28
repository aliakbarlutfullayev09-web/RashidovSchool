import { api } from 'sdk/api';
import { validatePreCheckout } from '../lib/starsValidation.js';
import { getPaymentByMerchantTransId } from '../lib/supabase.js';

export default async function (query) {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 7000);
    let payment;
    try {
      payment = await getPaymentByMerchantTransId(query.invoice_payload, controller.signal);
    } finally {
      clearTimeout(timer);
    }

    const result = validatePreCheckout(payment, query);
    await api.answerPreCheckoutQuery({
      pre_checkout_query_id: query.id,
      ok: result.ok,
      ...(result.ok ? {} : { error_message: result.errorMessage }),
    });
  } catch {
    await api.answerPreCheckoutQuery({
      pre_checkout_query_id: query.id,
      ok: false,
      error_message: 'Ошибка проверки заказа. Попробуйте позже.',
    });
  }
}
