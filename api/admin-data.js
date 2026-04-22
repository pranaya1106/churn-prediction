const { getPool } = require('./db');

const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || '*';

// Simple admin token auth — set ADMIN_TOKEN in Vercel env vars
function isAuthorized(req) {
  const token = req.headers['x-admin-token'] || req.query.token;
  return token && token === process.env.ADMIN_TOKEN;
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGIN);
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-admin-token');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  if (!isAuthorized(req)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const pool = getPool();

  try {
    const feedbackResult = await pool.query('SELECT * FROM feedback ORDER BY created_at DESC');
    const rows = feedbackResult.rows;

    // Compute KPIs server-side
    const total = rows.length;
    const highRisk = rows.filter(r => r.risk_level === 'high').length;
    const mediumRisk = rows.filter(r => r.risk_level === 'medium').length;
    const lowRisk = rows.filter(r => r.risk_level === 'low').length;
    const totalRevenueAtRisk = rows.reduce((sum, r) => sum + (Number(r.revenue_at_risk) || 0), 0);
    const avgChurnProb = total > 0
      ? (rows.reduce((sum, r) => sum + Number(r.churn_probability), 0) / total).toFixed(1)
      : 0;

    res.json({
      kpis: { total, highRisk, mediumRisk, lowRisk, totalRevenueAtRisk: totalRevenueAtRisk.toFixed(2), avgChurnProb },
      rows,
    });
  } catch {
    res.status(500).json({ error: 'Failed to fetch data' });
  }
};
