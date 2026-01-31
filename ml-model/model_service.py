import joblib
import pandas as pd
import numpy as np
import logging
from typing import Dict, Tuple

logger = logging.getLogger(__name__)

class ModelService:
    def __init__(self, model_path: str, ohe_encoder_path: str, scaler_path: str, 
                 merge_ohe_columns_path: str, training_columns_path: str):
        """
        Initialize the Model Service with pre-trained model and preprocessors
        
        Args:
            model_path: Path to the trained model
            ohe_encoder_path: Path to the OneHotEncoder
            scaler_path: Path to the StandardScaler
            merge_ohe_columns_path: Path to the merged OHE column names
            training_columns_path: Path to the training column names
        """
        try:
            self.model = joblib.load(model_path)
            self.ohe_encoder = joblib.load(ohe_encoder_path)
            self.scaler = joblib.load(scaler_path)
            self.merge_ohe_columns = joblib.load(merge_ohe_columns_path)
            self.training_columns = joblib.load(training_columns_path)
            
            logger.info("Model and preprocessors loaded successfully!")
        except Exception as e:
            logger.error(f"Error loading model components: {e}")
            raise

    def predict(self, raw_data: dict) -> Tuple[bool, float]:
        """
        Make prediction on new data
        
        Args:
            raw_data: Dictionary containing input features
            
        Returns:
            Tuple of (prediction_label, probability)
            - prediction_label: True if loan default predicted, False otherwise
            - probability: Confidence score of the prediction
        """
        try:
            # 1. Convert raw data to DataFrame
            new_df = pd.DataFrame([self._map_input_data(raw_data)])
            
            # 2. Re-create derived categorical features
            new_df = self._create_derived_features(new_df)
            
            # 3. Define columns for OHE and scaling
            ohe_columns = ['cb_person_default_on_file', 'loan_grade', 'person_home_ownership', 
                          'loan_intent', 'income_group', 'age_group', 'loan_amount_group']
            normal_columns = ['person_income', 'person_age', 'person_emp_length', 'loan_amnt',
                            'loan_int_rate', 'cb_person_cred_hist_length', 'loan_percent_income', 
                            'loan_to_income_ratio', 'loan_to_emp_length_ratio', 'int_rate_to_loan_amt_ratio']
            
            # 4. Ensure categorical columns have correct categories
            new_df = self._fix_categorical_columns(new_df, ohe_columns)
            
            # 5. One-hot encode categorical features
            ohe_transformed = self.ohe_encoder.transform(new_df[ohe_columns]).toarray()
            new_ohe_data = pd.DataFrame(ohe_transformed, columns=self.merge_ohe_columns)
            
            # 6. Prepare and scale numerical features
            numerical_features = new_df[normal_columns].copy()
            numerical_features = numerical_features.replace([np.inf, -np.inf], np.nan).fillna(0)
            scaled_numerical_features = pd.DataFrame(
                self.scaler.transform(numerical_features), 
                columns=normal_columns
            )
            
            # 7. Combine OHE and scaled features
            processed_df = pd.concat([new_ohe_data, scaled_numerical_features], axis=1)
            
            # 8. Clean feature names
            processed_df.columns = [str(col).replace(' ', '_') if isinstance(col, str) else col 
                                   for col in processed_df.columns]
            
            # 9. Ensure column order and presence matches training
            processed_df = self._align_with_training_columns(processed_df)
            
            # 10. Make prediction
            prediction = self.model.predict(processed_df)[0]
            prediction_proba = self.model.predict_proba(processed_df)[0]
            
            # Return label and probability (probability of class 1 - loan default)
            label = bool(prediction == 1)
            probability = float(prediction_proba[1])
            
            logger.info(f"Prediction completed - Label: {label}, Probability: {probability:.4f}")
            return label, probability
            
        except Exception as e:
            logger.error(f"Error during prediction: {e}")
            raise

    def _map_input_data(self, raw_data: dict) -> dict:
        """Map input data from Java DTO format to model input format"""
        return {
            'person_age': raw_data.get('personAge'),
            'person_income': raw_data.get('personIncome'),
            'person_home_ownership': raw_data.get('personHomeOwnership'),
            'person_emp_length': raw_data.get('personEmpLength'),
            'loan_intent': raw_data.get('loanIntent'),
            'loan_grade': raw_data.get('loanGrade'),
            'loan_amnt': raw_data.get('loanAmnt'),
            'loan_int_rate': raw_data.get('loanIntRate'),
            'loan_percent_income': raw_data.get('loanPercentIncome'),
            'cb_person_default_on_file': raw_data.get('cbPersonDefaultOnFile'),
            'cb_person_cred_hist_length': raw_data.get('cbPersonCredHistLength')
        }

    def _create_derived_features(self, df: pd.DataFrame) -> pd.DataFrame:
        """Create derived categorical and numerical features"""
        # Age group
        df['person_age'] = pd.to_numeric(df['person_age'])
        df['age_group'] = pd.cut(
            df['person_age'],
            bins=[20, 26, 36, 46, 56, 66],
            labels=['20-25', '26-35', '36-45', '46-55', '56-65'],
            right=False,
            include_lowest=True
        ).astype('category')
        
        # Income group
        df['person_income'] = pd.to_numeric(df['person_income'])
        df['income_group'] = pd.cut(
            df['person_income'],
            bins=[0, 25000, 50000, 75000, 100000, float('inf')],
            labels=['low', 'low-middle', 'middle', 'high-middle', 'high'],
            right=False,
            include_lowest=True
        ).astype('category')
        
        # Loan amount group
        df['loan_amnt'] = pd.to_numeric(df['loan_amnt'])
        df['loan_amount_group'] = pd.cut(
            df['loan_amnt'],
            bins=[0, 5000, 10000, 15000, float('inf')],
            labels=['small', 'medium', 'large', 'very large'],
            right=False,
            include_lowest=True
        ).astype('category')
        
        # Numerical ratio features
        df['loan_to_income_ratio'] = df['loan_amnt'] / df['person_income']
        df['person_emp_length'] = pd.to_numeric(df['person_emp_length'])
        df['loan_to_emp_length_ratio'] = df['person_emp_length'] / df['loan_amnt']
        df['loan_int_rate'] = pd.to_numeric(df['loan_int_rate'])
        df['int_rate_to_loan_amt_ratio'] = df['loan_int_rate'] / df['loan_amnt']
        
        return df

    def _fix_categorical_columns(self, df: pd.DataFrame, ohe_columns: list) -> pd.DataFrame:
        """Ensure categorical columns have correct categories from encoder"""
        for col in ohe_columns:
            if col in df.columns:
                if df[col].dtype != 'category':
                    try:
                        original_categories = self.ohe_encoder.categories_[ohe_columns.index(col)]
                        df[col] = pd.Categorical(df[col], categories=original_categories)
                    except (ValueError, IndexError) as e:
                        logger.warning(f"Could not set categories for column {col}: {e}")
                        # Handle unseen categories
                        current_cats = list(self.ohe_encoder.categories_[ohe_columns.index(col)])
                        new_cats = [cat for cat in df[col].unique() if cat not in current_cats]
                        df[col] = pd.Categorical(df[col], categories=current_cats + new_cats)
        return df

    def _align_with_training_columns(self, df: pd.DataFrame) -> pd.DataFrame:
        """Align columns with training data"""
        # Add missing columns with 0
        current_cols = set(df.columns)
        for col in self.training_columns:
            if col not in current_cols:
                df[col] = 0
        
        # Drop extra columns
        extra_cols = set(df.columns) - set(self.training_columns)
        if extra_cols:
            df = df.drop(columns=list(extra_cols))
        
        # Ensure column order matches training
        df = df[self.training_columns]
        
        return df
