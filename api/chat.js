const { getPool } = require('./db');

const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || '*';

function isAuthorized(req) {
  const token = req.headers['x-admin-token'] || req.query.token;
  return token && token === process.env.ADMIN_TOKEN;
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGIN);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-admin-token');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  if (!isAuthorized(req)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const msg = (req.body.message || '').toLowerCase().trim();
  const pool = getPool();
  let reply = '';

  try {
    if (msg.includes('high risk') || msg.includes('high-risk')) {
      const r = await pool.query("SELECT COUNT(*) FROM feedback WHERE risk_level = 'high'");
      reply = `There are ${r.rows[0].count} high-risk customers in the system.`;

    } else if (msg.includes('revenue')) {
      const r = await pool.query('SELECT ROUND(SUM(revenue_at_risk)::numeric, 2) as total FROM feedback');
      reply = `Total revenue at risk across all customers: ₹${r.rows[0].total || 0}.`;

    } else if (msg.includes('reason')) {
      const r = await pool.query('SELECT reason, COUNT(*) as count FROM feedback GROUP BY reason ORDER BY count DESC LIMIT 1');
      reply = r.rows.length > 0
        ? `The most common churn reason is "${r.rows[0].reason}" (${r.rows[0].count} customers).`
        : 'No feedback data available yet.';

    } else if (msg.includes('recent') || msg.includes('latest')) {
      const r = await pool.query('SELECT email, reason, churn_probability, risk_level FROM feedback ORDER BY created_at DESC LIMIT 5');
      reply = r.rows.length === 0
        ? 'No recent feedback found.'
        : 'Last 5 entries:\n' + r.rows.map((row, i) =>
            `${i + 1}. ${row.email} — ${row.risk_level} risk (${row.churn_probability}%)`
          ).join('\n');

    } else if (msg.includes('total') || msg.includes('count') || msg.includes('how many')) {
      const r = await pool.query('SELECT COUNT(*) FROM feedback');
      reply = `Total feedback entries: ${r.rows[0].count}.`;

    } else if (msg.includes('average') || msg.includes('avg')) {
      const r = await pool.query('SELECT ROUND(AVG(churn_probability)::numeric, 1) as avg FROM feedback');
      reply = `Average churn probability: ${r.rows[0].avg || 0}%.`;

    } else if (msg.includes('medium risk')) {
      const r = await pool.query("SELECT COUNT(*) FROM feedback WHERE risk_level = 'medium'");
      reply = `There are ${r.rows[0].count} medium-risk customers.`;

    } else if (msg.includes('low risk')) {
      const r = await pool.query("SELECT COUNT(*) FROM feedback WHERE risk_level = 'low'");
      reply = `There are ${r.rows[0].count} low-risk customers.`;

    } else if (msg.includes('help')) {
      reply = 'You can ask me:\n• "high risk" — high-risk customer count\n• "revenue" — total revenue at risk\n• "reason" — top churn reason\n• "recent" — last 5 entries\n• "total" — total feedback count\n• "average" — avg churn probability\n• "medium risk" / "low risk" — segment counts';

    } else {
      reply = 'I didn\'t understand that. Type "help" to see available queries.';
    }
  } catch {
    reply = 'Something went wrong while fetching data.';
  }

  res.json({ reply });
};
