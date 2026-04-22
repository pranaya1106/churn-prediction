const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method === 'GET') {
    try {
      const result = await pool.query('SELECT * FROM feedback ORDER BY created_at DESC');
      return res.json(result.rows);
    } catch (err) {
      return res.status(500).json({ error: 'Failed to fetch feedback', details: err.message });
    }
  }

  if (req.method === 'POST') {
    const { email, reason, message, churn_probability } = req.body;
    try {
      const result = await pool.query(
        `INSERT INTO feedback (email, reason, message, churn_probability)
         VALUES ($1, $2, $3, $4) RETURNING *`,
        [email, reason, message, churn_probability]
      );
      return res.status(201).json(result.rows[0]);
    } catch (err) {
      return res.status(500).json({ error: 'Failed to save feedback', details: err.message });
    }
  }

  res.status(405).json({ error: 'Method not allowed' });
};
