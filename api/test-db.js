const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');

  try {
    await pool.query('SELECT 1');
    res.json({ message: 'Database connected successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Database connection failed', details: err.message });
  }
};
