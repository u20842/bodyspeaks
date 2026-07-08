export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const ENV = process.env.SQUARE_ENVIRONMENT || 'sandbox';
  const isSandbox = ENV === 'sandbox';

  const applicationId = isSandbox
    ? process.env.SQUARE_APPLICATION_ID_SANDBOX
    : process.env.SQUARE_APPLICATION_ID;

  const locationId = isSandbox
    ? process.env.SQUARE_LOCATION_ID_SANDBOX
    : process.env.SQUARE_LOCATION_ID;

  if (!applicationId || !locationId) {
    return res.status(500).json({ error: 'Server configuration error' });
  }

  return res.status(200).json({ applicationId, locationId, environment: ENV });
}
