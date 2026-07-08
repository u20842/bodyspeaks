export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { sourceId, tier, email } = req.body;

  if (!sourceId || !tier) {
    return res.status(400).json({ error: 'sourceId and tier are required' });
  }

  const PRICES = { standard: 3700, full: 5700 };
  const amount = PRICES[tier];

  if (!amount) {
    return res.status(400).json({ error: 'Invalid tier. Must be "standard" or "full".' });
  }

  const ENV = process.env.SQUARE_ENVIRONMENT || 'sandbox';
  const isSandbox = ENV === 'sandbox';

  const SQUARE_TOKEN = isSandbox
    ? process.env.SQUARE_ACCESS_TOKEN_SANDBOX
    : process.env.SQUARE_ACCESS_TOKEN;

  const LOCATION_ID = isSandbox
    ? process.env.SQUARE_LOCATION_ID_SANDBOX
    : process.env.SQUARE_LOCATION_ID;

  const BASE_URL = isSandbox
    ? 'https://connect.squareupsandbox.com'
    : 'https://connect.squareup.com';

  if (!SQUARE_TOKEN || !LOCATION_ID) {
    return res.status(500).json({ error: 'Server configuration error' });
  }

  try {
    const paymentRes = await fetch(`${BASE_URL}/v2/payments`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SQUARE_TOKEN}`,
        'Content-Type': 'application/json',
        'Square-Version': '2024-01-18'
      },
      body: JSON.stringify({
        source_id: sourceId,
        idempotency_key: crypto.randomUUID(),
        amount_money: { amount, currency: 'USD' },
        location_id: LOCATION_ID,
        buyer_email_address: email || undefined,
        note: `Body Map ${tier === 'full' ? 'Full' : 'Standard'} tier unlock`
      })
    });

    const paymentData = await paymentRes.json();

    if (!paymentRes.ok) {
      console.error('Square payment error:', paymentData.errors);
      return res.status(400).json({
        error: 'Payment failed',
        details: paymentData.errors?.[0]?.detail || 'Card was declined'
      });
    }

    return res.status(200).json({
      success: true,
      paymentId: paymentData.payment?.id,
      status: paymentData.payment?.status
    });

  } catch (err) {
    console.error('Square charge error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
