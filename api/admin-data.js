const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');

  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const result = await pool.query('SELECT * FROM feedback ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch feedback', details: err.message });
  }
};
