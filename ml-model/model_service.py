import joblib
import json
import numpy as np
import shap
import lime.lime_tabular
import logging
from typing import Tuple

from preprocessing_pipeline import transform_raw_input

logger = logging.getLogger(__name__)


class ModelService:
    def __init__(self, lgbm_bundle_path: str, preprocessing_meta_path: str,
                 shap_explainer_path: str, lime_train_data_path: str):
        """
        Initialize Model Service v5 — LightGBM + GA + WOE + SHAP + LIME.

        Args:
            lgbm_bundle_path:        Path to selected_model_bundle.pkl (model + threshold)
            preprocessing_meta_path: Path to preprocessing_meta.json
            shap_explainer_path:     Path to shap_explainer.pkl
            lime_train_data_path:    Path to lime_train_data.npy
        """
        try:
            bundle = joblib.load(lgbm_bundle_path)
            self.model     = bundle['model']
            self.threshold = float(bundle['threshold'])

            with open(preprocessing_meta_path, 'r') as f:
                self.meta = json.load(f)
            self.feature_names = self.meta['feature_names']

            self.shap_explainer = joblib.load(shap_explainer_path)

            lime_train_data = np.load(lime_train_data_path, allow_pickle=True)
            self.lime_explainer = lime.lime_tabular.LimeTabularExplainer(
                training_data = lime_train_data,
                feature_names = self.feature_names,
                class_names   = ['Non-Default', 'Default'],
                mode          = 'classification',
                random_state  = 42,
            )

            logger.info(
                f"ModelService v5 loaded — "
                f"threshold={self.threshold:.4f}, features={len(self.feature_names)}"
            )
        except Exception as e:
            logger.error(f"Error loading model components: {e}")
            raise

    def predict(self, raw_data: dict) -> Tuple[bool, float]:
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
        try:
            X    = self._preprocess(raw_data)
            prob = float(self.model.predict_proba(X)[0, 1])
            label = bool(prob >= self.threshold)
            risk  = ("High-Risk"   if prob >= 0.7 else
                     "Medium-Risk" if prob >= 0.3 else "Low-Risk")

            sv = self.shap_explainer.shap_values(X)
            sv = sv[1] if isinstance(sv, list) else sv
            ev = self.shap_explainer.expected_value
            ev = float(ev[1] if isinstance(ev, (list, np.ndarray)) else ev)

            shap_values = {
                feat: round(float(val), 5)
                for feat, val in zip(self.feature_names, sv[0])
            }

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

    def _preprocess(self, raw_data: dict):
        return transform_raw_input(raw_data, self.meta, self.feature_names)
