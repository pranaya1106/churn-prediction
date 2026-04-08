import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder
from sklearn.metrics import accuracy_score
import joblib

# Load dataset
df = pd.read_csv('WA_Fn-UseC_-Telco-Customer-Churn.csv')

# Select features that match our schema
features = ['gender', 'tenure', 'MonthlyCharges', 'TotalCharges',
            'Contract', 'InternetService', 'TechSupport', 'PaymentMethod']

df = df[features + ['Churn']].copy()

# Fix TotalCharges (some rows have spaces)
df['TotalCharges'] = pd.to_numeric(df['TotalCharges'], errors='coerce')
df['TotalCharges'].fillna(df['TotalCharges'].median(), inplace=True)

# Encode target: Yes=1, No=0
df['Churn'] = df['Churn'].map({'Yes': 1, 'No': 0})

# Encode categorical columns and save encoders
encoders = {}
cat_cols = ['gender', 'Contract', 'InternetService', 'TechSupport', 'PaymentMethod']
for col in cat_cols:
    le = LabelEncoder()
    df[col] = le.fit_transform(df[col])
    encoders[col] = le

X = df[features]
y = df['Churn']

X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

model = RandomForestClassifier(n_estimators=100, random_state=42)
model.fit(X_train, y_train)

acc = accuracy_score(y_test, model.predict(X_test))
print(f"Model Accuracy: {acc * 100:.2f}%")

# Save model and encoders
joblib.dump(model, 'churn_model.pkl')
joblib.dump(encoders, 'encoders.pkl')
print("Model saved as churn_model.pkl")
print("Encoders saved as encoders.pkl")
