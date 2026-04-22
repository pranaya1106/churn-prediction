import json
import joblib
import pandas as pd
from http.server import BaseHTTPRequestHandler

model = joblib.load('churn_model.pkl')
encoders = joblib.load('encoders.pkl')

class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        content_length = int(self.headers.get('Content-Length', 0))
        body = self.rfile.read(content_length)
        data = json.loads(body)

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

        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(json.dumps(result).encode())

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()
