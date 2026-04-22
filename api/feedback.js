const { getPool } = require('./db');

const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || '*';

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGIN);
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

module.exports = async (req, res) => {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  const pool = getPool();

  if (req.method === 'GET') {
    try {
      const result = await pool.query('SELECT * FROM feedback ORDER BY created_at DESC');
      return res.json(result.rows);
    } catch {
      return res.status(500).json({ error: 'Failed to fetch feedback' });
    }
  }

  if (req.method === 'POST') {
    const { email, reason, message, churn_probability, risk_level, revenue_at_risk, monthly_revenue } = req.body;

    // Basic validation
    if (!email || !reason) {
      return res.status(400).json({ error: 'email and reason are required' });
    }
    if (email.length > 200 || (message && message.length > 1000)) {
      return res.status(400).json({ error: 'Input too long' });
    }

    try {
      const result = await pool.query(
        `INSERT INTO feedback (email, reason, message, churn_probability, risk_level, revenue_at_risk, monthly_revenue)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
        [email, reason, message || null, churn_probability, risk_level || null, revenue_at_risk || null, monthly_revenue || null]
      );
      return res.status(201).json(result.rows[0]);
    } catch {
      return res.status(500).json({ error: 'Failed to save feedback' });
    }
  }

  res.status(405).json({ error: 'Method not allowed' });
};
