"""
============================================================
 Training script for the REAL risk-prediction model
============================================================
This is a scaffold, not yet wired into the running API (the API currently
uses app/model_service.py's mock). Your teammate should:

  1. Obtain the Pima Indians Diabetes Dataset (or an equivalent dataset
     matching the Section 4 schema exactly: Pregnancies, Glucose,
     BloodPressure, SkinThickness, Insulin, BMI,
     DiabetesPedigreeFunction, Age -> Outcome).
  2. Fill in the steps below.
  3. Serialize the three artifacts this app expects:
        backend/models/diabetes_model.pkl
        backend/models/imputer.pkl
        backend/models/explainer.pkl
  4. Update app/model_service.py to load these at startup and use them
     in predict() / simulate_single_feature(), keeping the same function
     signatures documented there.

Suggested approach (uncomment and adapt once the dataset is available):

    import pandas as pd
    import pickle
    from sklearn.model_selection import train_test_split
    from sklearn.impute import SimpleImputer
    from sklearn.linear_model import LogisticRegression
    from sklearn.calibration import CalibratedClassifierCV
    from sklearn.metrics import roc_auc_score, classification_report
    import xgboost as xgb
    import shap

    FEATURES = [
        "Pregnancies", "Glucose", "BloodPressure", "SkinThickness",
        "Insulin", "BMI", "DiabetesPedigreeFunction", "Age",
    ]

    def load_data(path="diabetes.csv"):
        df = pd.read_csv(path)
        # Biologically-implausible zeros (Glucose, BloodPressure, BMI, etc.)
        # should be treated as missing, not literal zero, before imputing.
        zero_as_missing = ["Glucose", "BloodPressure", "SkinThickness", "Insulin", "BMI"]
        for col in zero_as_missing:
            df[col] = df[col].replace(0, pd.NA)
        return df

    def train():
        df = load_data()
        X, y = df[FEATURES], df["Outcome"]
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, stratify=y, random_state=42
        )

        imputer = SimpleImputer(strategy="median")
        X_train_imp = imputer.fit_transform(X_train)
        X_test_imp = imputer.transform(X_test)

        # XGBoost primary model, SHAP-native
        model = xgb.XGBClassifier(
            n_estimators=200, max_depth=4, learning_rate=0.05,
            eval_metric="logloss", random_state=42,
        )
        model.fit(X_train_imp, y_train)

        # Calibrate probabilities
        calibrated = CalibratedClassifierCV(model, method="isotonic", cv=5)
        calibrated.fit(X_train_imp, y_train)

        # Logistic regression baseline for sanity-checking
        baseline = LogisticRegression(max_iter=1000)
        baseline.fit(X_train_imp, y_train)

        print("XGBoost AUC:", roc_auc_score(y_test, calibrated.predict_proba(X_test_imp)[:, 1]))
        print("Baseline AUC:", roc_auc_score(y_test, baseline.predict_proba(X_test_imp)[:, 1]))
        print(classification_report(y_test, calibrated.predict(X_test_imp)))

        explainer = shap.TreeExplainer(model)

        with open("diabetes_model.pkl", "wb") as f:
            pickle.dump(calibrated, f)
        with open("imputer.pkl", "wb") as f:
            pickle.dump(imputer, f)
        with open("explainer.pkl", "wb") as f:
            pickle.dump(explainer, f)

    if __name__ == "__main__":
        train()

Until this is filled in and run, app/model_service.py's deterministic mock
keeps the rest of the product fully functional end-to-end.
"""
