/**
 * Local development server.
 * In production, Vercel serverless functions (api/*.js) are used instead.
 * This file is only for running locally with `npm start`.
 */
require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');

const app = express();

// Allow only configured origin (or all in dev)
const allowedOrigin = process.env.ALLOWED_ORIGIN || '*';
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-admin-token');
  if (req.method === 'OPTIONS') return res.status(200).end();
  next();
});
app.use(express.json());
// Serve static assets from public/ and root HTML pages
app.use(express.static('public'));
app.get('/',       (_req, res) => res.sendFile(__dirname + '/index.html'));
app.get('/admin',  (_req, res) => res.sendFile(__dirname + '/admin.html'));
app.get('/login',  (_req, res) => res.sendFile(__dirname + '/login.html'));

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 5,
});

// Mount serverless handlers as Express routes
app.post('/api/predict',     require('./api/predict'));
app.get('/api/admin-data',   require('./api/admin-data'));
app.post('/api/chat',        require('./api/chat'));
app.use('/api/feedback',     require('./api/feedback'));
app.post('/api/admin-login', require('./api/admin-login'));

// Health check
app.get('/api/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', db: 'connected' });
  } catch {
    res.status(500).json({ status: 'error', db: 'disconnected' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Dev server → http://localhost:${PORT}`));
