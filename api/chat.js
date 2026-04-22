const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const msg = (req.body.message || '').toLowerCase();
  let reply = '';

  try {
    if (msg.includes('high risk') || msg.includes('high-risk')) {
      const result = await pool.query('SELECT COUNT(*) FROM feedback WHERE churn_probability > 60');
      reply = `There are ${result.rows[0].count} high-risk customers (churn probability > 60%).`;

    } else if (msg.includes('reason')) {
      const result = await pool.query(
        'SELECT reason, COUNT(*) as count FROM feedback GROUP BY reason ORDER BY count DESC LIMIT 1'
      );
      reply = result.rows.length > 0
        ? `The most common reason is "${result.rows[0].reason}" with ${result.rows[0].count} feedback(s).`
        : 'No feedback data available yet.';

    } else if (msg.includes('recent') || msg.includes('latest')) {
      const result = await pool.query('SELECT email, reason, churn_probability FROM feedback ORDER BY created_at DESC LIMIT 5');
      reply = result.rows.length === 0
        ? 'No recent feedback found.'
        : 'Last 5 feedbacks:\n' + result.rows.map(
            (r, i) => `${i + 1}. ${r.email} — ${r.reason} (${r.churn_probability}%)`
          ).join('\n');

    } else if (msg.includes('total') || msg.includes('count') || msg.includes('how many')) {
      const result = await pool.query('SELECT COUNT(*) FROM feedback');
      reply = `Total feedback entries: ${result.rows[0].count}.`;

    } else if (msg.includes('average') || msg.includes('avg')) {
      const result = await pool.query('SELECT ROUND(AVG(churn_probability), 1) as avg FROM feedback');
      reply = `Average churn probability: ${result.rows[0].avg || 0}%.`;

    } else if (msg.includes('help')) {
      reply = 'You can ask me:\n- "high risk" — count of high-risk customers\n- "reason" — most common feedback reason\n- "recent" — last 5 feedbacks\n- "total" — total feedback count\n- "average" — average churn probability';

    } else {
      reply = 'I didn\'t understand that. Type "help" to see what I can answer.';
    }
  } catch {
    reply = 'Something went wrong while fetching data.';
  }

  res.json({ reply });
};
