// api/debug-square-env.js — TEMPORARY, delete after use
export default async function handler(req, res) {
  const token = process.env.SQUARE_ACCESS_TOKEN;

  const sandbox = await fetch('https://connect.squareupsandbox.com/v2/locations', {
    headers: {
      'Square-Version': '2024-07-17',
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  const production = await fetch('https://connect.squareup.com/v2/locations', {
    headers: {
      'Square-Version': '2024-07-17',
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  res.status(200).json({
    sandbox_status: sandbox.status,
    production_status: production.status,
  });
}
