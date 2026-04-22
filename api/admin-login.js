/**
 * Admin Login — validates password and returns a session token.
 * Set ADMIN_PASSWORD and ADMIN_TOKEN in Vercel environment variables.
 */

const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || '*';

module.exports = (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGIN);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { password } = req.body;

  if (!password) return res.status(400).json({ error: 'Password required' });

  if (password === process.env.ADMIN_PASSWORD) {
    return res.json({ token: process.env.ADMIN_TOKEN });
  }

  return res.status(401).json({ error: 'Invalid password' });
};
