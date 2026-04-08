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
        age INTEGER,
        gender VARCHAR(10),
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
    name, age, gender, tenure, monthly_charges,
    total_charges, contract, internet_service,
    tech_support, payment_method, churn
  } = req.body;

  try {
    const result = await pool.query(
      `INSERT INTO customers
        (name, age, gender, tenure, monthly_charges, total_charges, contract, internet_service, tech_support, payment_method, churn)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       RETURNING *`,
      [name, age, gender, tenure, monthly_charges, total_charges, contract, internet_service, tech_support, payment_method, churn]
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
