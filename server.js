require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const { spawn } = require('child_process');

const app = express();
app.use(cors());
app.use(express.json());

// Single connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// Serve frontend
app.use(express.static('public'));

// Test DB route
app.get('/test-db', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ message: 'Database connected successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Database connection failed', details: err.message });
  }
});

// Create customers table
app.get('/create-table', async (_req, res) => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS customers (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(100),
        age INTEGER,
        tenure INTEGER,
        monthly_charges NUMERIC,
        total_charges NUMERIC,
        contract VARCHAR(20),
        internet_service VARCHAR(20),
        tech_support VARCHAR(10),
        payment_method VARCHAR(30),
        churn BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    res.json({ message: 'Table created successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Table creation failed', details: err.message });
  }
});

// POST /customers — add a new customer
app.post('/customers', async (req, res) => {
  const {
    name, email, age, tenure, monthly_charges,
    total_charges, contract, internet_service,
    tech_support, payment_method, churn
  } = req.body;

  try {
    const result = await pool.query(
      `INSERT INTO customers
        (name, email, age, tenure, monthly_charges, total_charges, contract, internet_service, tech_support, payment_method, churn)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       RETURNING *`,
      [name, email, age, tenure, monthly_charges, total_charges, contract, internet_service, tech_support, payment_method, churn]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to add customer', details: err.message });
  }
});

// GET /customers — fetch all customers
app.get('/customers', async (_req, res) => {
  try {
    const result = await pool.query('SELECT * FROM customers ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch customers', details: err.message });
  }
});

// GET /customers/:id — fetch single customer
app.get('/customers/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM customers WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Customer not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch customer', details: err.message });
  }
});

// Create feedback table
app.get('/create-feedback-table', async (_req, res) => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS feedback (
        id SERIAL PRIMARY KEY,
        email TEXT,
        reason TEXT,
        message TEXT,
        churn_probability NUMERIC,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    res.json({ message: 'Feedback table created successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Table creation failed', details: err.message });
  }
});

// GET /admin-data — fetch all feedback for admin dashboard
app.get('/admin-data', async (_req, res) => {
  try {
    const result = await pool.query('SELECT * FROM feedback ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch feedback', details: err.message });
  }
});

// GET /feedback — fetch all feedback
app.get('/feedback', async (_req, res) => {
  try {
    const result = await pool.query('SELECT * FROM feedback ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch feedback', details: err.message });
  }
});

// POST /feedback — store feedback from high-risk customers
app.post('/feedback', async (req, res) => {
  const { email, reason, message, churn_probability } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO feedback (email, reason, message, churn_probability)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [email, reason, message, churn_probability]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to save feedback', details: err.message });
  }
});

// POST /chat — simple rule-based chatbot
app.post('/chat', async (req, res) => {
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
      if (result.rows.length > 0) {
        reply = `The most common reason is "${result.rows[0].reason}" with ${result.rows[0].count} feedback(s).`;
      } else {
        reply = 'No feedback data available yet.';
      }

    } else if (msg.includes('recent') || msg.includes('latest')) {
      const result = await pool.query('SELECT email, reason, churn_probability FROM feedback ORDER BY created_at DESC LIMIT 5');
      if (result.rows.length === 0) {
        reply = 'No recent feedback found.';
      } else {
        reply = 'Last 5 feedbacks:\n' + result.rows.map(
          (r, i) => `${i + 1}. ${r.email} — ${r.reason} (${r.churn_probability}%)`
        ).join('\n');
      }

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
});

// POST /predict — predict churn for a customer
app.post('/predict', (req, res) => {
  const python = spawn('python', ['predict.py']);
  let result = '';
  let error = '';

  python.stdin.write(JSON.stringify(req.body));
  python.stdin.end();

  python.stdout.on('data', (data) => { result += data.toString(); });
  python.stderr.on('data', (data) => { error += data.toString(); });

  python.on('close', (code) => {
    if (code !== 0) return res.status(500).json({ error: 'Prediction failed', details: error });
    try {
      res.json(JSON.parse(result));
    } catch {
      res.status(500).json({ error: 'Failed to parse prediction result' });
    }
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
