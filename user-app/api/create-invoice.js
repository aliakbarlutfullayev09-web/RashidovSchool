const STARS_PRICES = {
  5: 1250,
  100: 25000,
  400: 100000,
  600: 150000,
  1000: 250000,
  3500: 1000000
};

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const botToken = process.env.BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) {
    return res.status(500).json({
      ok: false,
      code: 'BOT_TOKEN_MISSING',
      error: 'BOT_TOKEN is not configured on the server'
    });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const stars = Number(body.stars);
    const neurons = STARS_PRICES[stars];

    if (!neurons) {
      return res.status(400).json({ ok: false, error: 'Invalid Stars package' });
    }

    const formattedNeurons = neurons.toLocaleString('ru-RU');
    const tgResponse = await fetch(`https://api.telegram.org/bot${botToken}/createInvoiceLink`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: `${formattedNeurons} Neyron`,
        description: `Rashidov School balansiga ${formattedNeurons} Neyron darhol qo'shiladi.`,
        payload: `buy_neurons_${stars}`,
        provider_token: '',
        currency: 'XTR',
        prices: [{ label: `${formattedNeurons} Neyron`, amount: stars }]
      })
    });

    const data = await tgResponse.json();
    if (!data.ok || !data.result) {
      return res.status(502).json({
        ok: false,
        error: data.description || 'Failed to create Telegram invoice link'
      });
    }

    return res.status(200).json({
      ok: true,
      invoiceUrl: data.result
    });
  } catch (err) {
    return res.status(500).json({
      ok: false,
      error: err?.message || 'Internal server error'
    });
  }
}
