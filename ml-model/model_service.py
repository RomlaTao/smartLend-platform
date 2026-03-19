import joblib
import json
import numpy as np
import pandas as pd
import shap
import lime.lime_tabular
import logging
from typing import Dict, Tuple

logger = logging.getLogger(__name__)

GRADE_MAP = {'A': 0, 'B': 1, 'C': 2, 'D': 3, 'E': 4, 'F': 5, 'G': 6}


class ModelService:
    def __init__(self, lgbm_bundle_path: str, preprocessing_meta_path: str,
                 shap_explainer_path: str, lime_train_data_path: str):
        """
        Initialize the Model Service v2 with LightGBM + SHAP + LIME.

        Args:
            lgbm_bundle_path:        Path to lgbm_bundle.pkl (model + threshold)
            preprocessing_meta_path: Path to preprocessing_meta.json
            shap_explainer_path:     Path to shap_explainer.pkl
            lime_train_data_path:    Path to lime_train_data.npy
        """
        try:
            # Load model + G-mean optimal threshold
            bundle = joblib.load(lgbm_bundle_path)
            self.model     = bundle['model']
            self.threshold = float(bundle['threshold'])

            # Load preprocessing metadata (medians, modes, outlier bounds, feature names)
            with open(preprocessing_meta_path, 'r') as f:
                self.meta = json.load(f)
            self.feature_names = self.meta['feature_names']

            # Load SHAP TreeExplainer
            self.shap_explainer = joblib.load(shap_explainer_path)

            # Recreate LIME explainer from saved training data (avoids lambda pickle issues)
            lime_train_data = np.load(lime_train_data_path, allow_pickle=True)
            self.lime_explainer = lime.lime_tabular.LimeTabularExplainer(
                training_data = lime_train_data,
                feature_names = self.feature_names,
                class_names   = ['Non-Default', 'Default'],
                mode          = 'classification',
                random_state  = 42,
            )

            logger.info(
                f"ModelService v2 loaded — "
                f"threshold={self.threshold:.4f}, features={len(self.feature_names)}"
            )
        except Exception as e:
            logger.error(f"Error loading model components: {e}")
            raise

    # ── Public interface ──────────────────────────────────────────────────

    def predict(self, raw_data: dict) -> Tuple[bool, float]:
        """
        Make prediction on new data.
        Returns (label, probability) — same interface as v1 for full backward compatibility.

        Args:
            raw_data: Dictionary with camelCase keys from Java DTO

        Returns:
            Tuple of (prediction_label: bool, probability: float)
            - prediction_label: True if Default predicted, False if Non-Default
            - probability: P(Default) in [0, 1]
        """
        try:
            X     = self._preprocess(raw_data)
            prob  = float(self.model.predict_proba(X)[0, 1])
            label = bool(prob >= self.threshold)
            logger.info(f"Prediction — label={label}, prob={prob:.4f}, threshold={self.threshold:.4f}")
            return label, prob
        except Exception as e:
            logger.error(f"Error during prediction: {e}")
            raise

    def predict_with_explanation(self, raw_data: dict) -> dict:
        """
        Make prediction with full SHAP + LIME explanations.
        Note: LIME takes ~2-5 seconds per call. Use /predict for fast responses.

        Args:
            raw_data: Dictionary with camelCase keys from Java DTO

        Returns:
            Dict containing prediction, risk level, SHAP values, LIME features
        """
        try:
            X    = self._preprocess(raw_data)
            prob = float(self.model.predict_proba(X)[0, 1])
            label = bool(prob >= self.threshold)
            risk  = ("High-Risk"   if prob >= 0.7 else
                     "Medium-Risk" if prob >= 0.3 else "Low-Risk")

            # SHAP explanation
            sv = self.shap_explainer.shap_values(X)
            sv = sv[1] if isinstance(sv, list) else sv
            ev = self.shap_explainer.expected_value
            ev = float(ev[1] if isinstance(ev, (list, np.ndarray)) else ev)

            shap_values = {
                feat: round(float(val), 5)
                for feat, val in zip(self.feature_names, sv[0])
            }

            # LIME explanation
            lime_result = self.lime_explainer.explain_instance(
                data_row   = X.values[0],
                predict_fn = lambda arr: self.model.predict_proba(arr),
                num_features = 12,
                top_labels   = 2,
            )
            lime_features = [
                {"rule": rule, "weight": round(float(w), 5)}
                for rule, w in lime_result.as_list(label=1)
            ]

            logger.info(f"Prediction+Explain — label={label}, prob={prob:.4f}, risk={risk}")
            return {
                "p_default"      : round(prob, 4),
                "prediction"     : "Default" if label else "Non-Default",
                "risk_level"     : risk,
                "threshold_used" : round(self.threshold, 4),
                "shap_base_value": round(ev, 4),
                "shap_values"    : shap_values,
                "lime_features"  : lime_features,
            }
        except Exception as e:
            logger.error(f"Error during prediction with explanation: {e}")
            raise

    # ── Private: preprocessing ────────────────────────────────────────────

    def _preprocess(self, raw_data: dict) -> pd.DataFrame:
        """Full preprocessing pipeline matching the training notebook."""
        df = pd.DataFrame([self._map_input(raw_data)])

        # 1. Missing value imputation (values from training data)
        for col, val in self.meta['num_medians'].items():
            if col in df.columns:
                df[col] = pd.to_numeric(df[col], errors='coerce').fillna(val)
        for col, val in self.meta['cat_modes'].items():
            if col in df.columns:
                df[col] = df[col].fillna(val)

        # 2. Outlier clipping (1%-99% quantile bounds from training data)
        for col, bounds in self.meta['outlier_bounds'].items():
            if col in df.columns:
                df[col] = pd.to_numeric(df[col], errors='coerce').clip(bounds['lo'], bounds['hi'])

        # 3. Feature engineering
        df['loan_grade_encoded']      = df['loan_grade'].map(GRADE_MAP).fillna(3).astype(float)
        df['historical_default_flag'] = (df['cb_person_default_on_file'] == 'Y').astype(int)
        df['loan_to_income_ratio']    = df['loan_amnt'] / (df['person_income'] + 1)
        df['age_income_interaction']  = df['person_age'] * df['person_income']
        df['annual_interest_cost']    = df['loan_amnt'] * df['loan_int_rate'] / 100
        df['interest_to_income']      = df['annual_interest_cost'] / (df['person_income'] + 1)
        df['employment_age_ratio']    = df['person_emp_length'] / (df['person_age'] + 1)
        df['high_loan_pct_flag']      = (df['loan_percent_income'] > 0.30).astype(int)
        df['high_grade_flag']         = (df['loan_grade_encoded'] >= 4).astype(int)
        df['high_interest_flag']      = (df['loan_int_rate'] > 15).astype(int)
        df['grade_x_int_rate']        = df['loan_grade_encoded'] * df['loan_int_rate']
        df['percent_income_loan']     = df['loan_percent_income']

        # 4. Drop original categorical columns that were encoded above
        df.drop(columns=['loan_grade', 'cb_person_default_on_file'], errors='ignore', inplace=True)

        # 5. One-hot encoding
        df = pd.get_dummies(df, columns=['person_home_ownership', 'loan_intent'])

        # 6. Align to exactly the 29 columns used during training
        df = df.reindex(columns=self.feature_names, fill_value=0)

        # 7. Ensure all columns are numeric
        df = df.apply(pd.to_numeric, errors='coerce').fillna(0)

        return df

    def _map_input(self, raw_data: dict) -> dict:
        """Map camelCase Java DTO keys to snake_case feature names."""
        return {
            'person_age'                : raw_data.get('personAge'),
            'person_income'             : raw_data.get('personIncome'),
            'person_home_ownership'     : raw_data.get('personHomeOwnership'),
            'person_emp_length'         : raw_data.get('personEmpLength'),
            'loan_intent'               : raw_data.get('loanIntent'),
            'loan_grade'                : raw_data.get('loanGrade'),
            'loan_amnt'                 : raw_data.get('loanAmnt'),
            'loan_int_rate'             : raw_data.get('loanIntRate'),
            'loan_percent_income'       : raw_data.get('loanPercentIncome'),
            'cb_person_default_on_file' : raw_data.get('cbPersonDefaultOnFile'),
            'cb_person_cred_hist_length': raw_data.get('cbPersonCredHistLength'),
        }
