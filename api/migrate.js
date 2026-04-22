/**
 * One-time migration script — run locally to update the feedback table schema.
 * Usage: node api/migrate.js
 */
require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function migrate() {
  console.log('Running migration...');

  await pool.query(`
    CREATE TABLE IF NOT EXISTS feedback (
      id               SERIAL PRIMARY KEY,
      email            TEXT NOT NULL,
      reason           TEXT NOT NULL,
      message          TEXT,
      churn_probability NUMERIC,
      risk_level       VARCHAR(10),
      revenue_at_risk  NUMERIC,
      monthly_revenue  NUMERIC,
      created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Add new columns if upgrading from old schema
  const cols = ['risk_level VARCHAR(10)', 'revenue_at_risk NUMERIC', 'monthly_revenue NUMERIC'];
  for (const col of cols) {
    const [name] = col.split(' ');
    try {
      await pool.query(`ALTER TABLE feedback ADD COLUMN IF NOT EXISTS ${col}`);
      console.log(`  ✓ Column "${name}" ready`);
    } catch (e) {
      console.log(`  - Column "${name}": ${e.message}`);
    }
  }

  console.log('Migration complete.');
  await pool.end();
}

migrate().catch(err => { console.error(err); process.exit(1); });
