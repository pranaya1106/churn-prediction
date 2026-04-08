import sys
import json
import joblib
import pandas as pd

# Load saved model and encoders
model = joblib.load('churn_model.pkl')
encoders = joblib.load('encoders.pkl')

# Read input JSON from Node.js
data = json.loads(sys.stdin.read())

# Map API fields to dataset column names
input_data = {
    'gender':          data.get('gender', 'Male'),
    'tenure':          data.get('tenure', 0),
    'MonthlyCharges':  data.get('monthly_charges', 0),
    'TotalCharges':    data.get('total_charges', 0),
    'Contract':        data.get('contract', 'Month-to-month'),
    'InternetService': data.get('internet_service', 'No'),
    'TechSupport':     data.get('tech_support', 'No'),
    'PaymentMethod':   data.get('payment_method', 'Electronic check'),
}

df = pd.DataFrame([input_data])

# Encode categorical columns
cat_cols = ['gender', 'Contract', 'InternetService', 'TechSupport', 'PaymentMethod']
for col in cat_cols:
    le = encoders[col]
    val = df[col].iloc[0]
    df[col] = le.transform([val]) if val in le.classes_ else [0]

features = ['gender', 'tenure', 'MonthlyCharges', 'TotalCharges',
            'Contract', 'InternetService', 'TechSupport', 'PaymentMethod']

prediction = model.predict(df[features])[0]
probability = model.predict_proba(df[features])[0][1]

result = {
    'churn_prediction': bool(prediction),
    'churn_probability': round(float(probability) * 100, 2)
}

print(json.dumps(result))
