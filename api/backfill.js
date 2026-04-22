/**
 * Backfill script — fixes old feedback rows that have NULL risk_level / revenue_at_risk.
 * Run once: node api/backfill.js
 */
require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

function scoreRisk(prob) {
  if (prob >= 70) return 'high';
  if (prob >= 40) return 'medium';
  return 'low';
}

async function backfill() {
  // Fetch rows missing risk_level or revenue_at_risk
  const { rows } = await pool.query(
    `SELECT id, churn_probability, monthly_revenue FROM feedback
     WHERE risk_level IS NULL OR revenue_at_risk IS NULL OR revenue_at_risk = 0`
  );

  console.log(`Found ${rows.length} rows to backfill...`);

  for (const row of rows) {
    const prob    = Number(row.churn_probability) || 0;
    const rev     = Number(row.monthly_revenue)   || 0;
    const risk    = scoreRisk(prob);
    const at_risk = parseFloat(((prob / 100) * rev).toFixed(2));

    await pool.query(
      `UPDATE feedback SET risk_level = $1, revenue_at_risk = $2 WHERE id = $3`,
      [risk, at_risk, row.id]
    );
    console.log(`  Row ${row.id}: prob=${prob}% → risk=${risk}, rev_at_risk=₹${at_risk}`);
  }

  console.log('Backfill complete.');
  await pool.end();
}

backfill().catch(err => { console.error(err); process.exit(1); });
