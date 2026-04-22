/**
 * Churn Prediction & Revenue Risk API
 * Uses an optimized real-time scoring engine inspired by ML research on telecom churn.
 * Factors: contract type, tenure, internet service, tech support, payment method, monthly charges.
 */

const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || '*';

// --- Scoring Engine ---
function predictChurn(data) {
  let score = 0;

  // Contract type — strongest churn predictor
  if (data.contract === 'Month-to-month') score += 35;
  else if (data.contract === 'One year') score += 10;
  else if (data.contract === 'Two year') score -= 10;

  // Tenure — longer tenure = more loyal customer
  if (data.tenure < 6) score += 20;
  else if (data.tenure < 12) score += 10;
  else if (data.tenure < 24) score += 5;
  else if (data.tenure > 48) score -= 15;

  // Internet service type
  if (data.internet_service === 'Fiber optic') score += 15;
  else if (data.internet_service === 'No') score -= 10;

  // Lack of tech support increases churn risk
  if (data.tech_support === 'No') score += 10;

  // Electronic check payers churn more
  if (data.payment_method === 'Electronic check') score += 10;

  // High monthly charges increase churn risk
  if (data.monthly_charges > 80) score += 10;
  else if (data.monthly_charges < 30) score -= 10;

  const probability = Math.min(95, Math.max(5, score));
  const churn_prediction = probability > 50;

  // Risk segmentation
  let risk_level, risk_label;
  if (probability < 40) {
    risk_level = 'low';
    risk_label = 'Low Risk';
  } else if (probability < 70) {
    risk_level = 'medium';
    risk_label = 'Medium Risk';
  } else {
    risk_level = 'high';
    risk_label = 'High Risk';
  }

  // Revenue at risk = churn probability × monthly revenue
  const monthly_revenue = Number(data.monthly_revenue) || Number(data.monthly_charges) || 0;
  const revenue_at_risk = parseFloat(((probability / 100) * monthly_revenue).toFixed(2));

  // Business recommendation based on risk level
  let recommendation, recommendation_action;
  if (risk_level === 'high') {
    recommendation = 'Immediate retention action required';
    recommendation_action = 'Offer a personalised discount or schedule a retention call within 24 hours.';
  } else if (risk_level === 'medium') {
    recommendation = 'Proactive engagement recommended';
    recommendation_action = 'Send a targeted engagement email with loyalty rewards or upgrade offers.';
  } else {
    recommendation = 'Customer is stable';
    recommendation_action = 'No immediate action needed. Continue standard service quality.';
  }

  return {
    churn_prediction,
    churn_probability: probability,
    risk_level,
    risk_label,
    monthly_revenue,
    revenue_at_risk,
    recommendation,
    recommendation_action,
  };
}

// --- Input Validation ---
function validateInput(body) {
  const errors = [];
  if (typeof body.tenure !== 'number' || body.tenure < 0) errors.push('tenure must be a non-negative number');
  if (typeof body.monthly_charges !== 'number' || body.monthly_charges < 0) errors.push('monthly_charges must be a non-negative number');
  if (!['Month-to-month', 'One year', 'Two year'].includes(body.contract)) errors.push('invalid contract value');
  if (!['Fiber optic', 'DSL', 'No'].includes(body.internet_service)) errors.push('invalid internet_service value');
  if (!['Yes', 'No'].includes(body.tech_support)) errors.push('invalid tech_support value');
  return errors;
}

module.exports = (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGIN);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const errors = validateInput(req.body);
  if (errors.length > 0) return res.status(400).json({ error: 'Validation failed', details: errors });

  const result = predictChurn(req.body);
  res.json(result);
};
