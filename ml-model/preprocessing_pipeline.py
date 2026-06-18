"""
Preprocessing pipeline matching notebook-kltn-creditrisk-v5 (v4.3).
Shared by model_service.py (inference) and export_backend_artifacts.py (artifact export).
"""
from __future__ import annotations

from typing import Any

import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split

TARGET = 'loan_status'
SEED = 42
GRADE_MAP = {'A': 0, 'B': 1, 'C': 2, 'D': 3, 'E': 4, 'F': 5, 'G': 6}

OUTLIER_COLS = [
    'person_age', 'person_income', 'person_emp_length',
    'loan_amnt', 'loan_int_rate',
]
DROP_ORIGINAL = ['loan_grade', 'cb_person_default_on_file']
OHE_COLS = ['person_home_ownership', 'loan_intent']


def engineer_features(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    df['loan_grade_encoded'] = df['loan_grade'].map(GRADE_MAP).fillna(3)
    df['historical_default_flag'] = (df['cb_person_default_on_file'] == 'Y').astype(int)
    df['loan_to_income_ratio'] = df['loan_amnt'] / (df['person_income'] + 1)
    df['age_income_interaction'] = df['person_age'] * df['person_income']
    df['percent_income_loan'] = df['loan_percent_income']
    df['annual_interest_cost'] = df['loan_amnt'] * df['loan_int_rate'] / 100
    df['interest_to_income'] = df['annual_interest_cost'] / (df['person_income'] + 1)
    df['employment_age_ratio'] = df['person_emp_length'] / (df['person_age'] + 1)
    df['high_loan_pct_flag'] = (df['loan_percent_income'] > 0.30).astype(int)
    df['high_grade_flag'] = (df['loan_grade_encoded'] >= 4).astype(int)
    df['high_interest_flag'] = (df['loan_int_rate'] > 15).astype(int)
    df['grade_x_int_rate'] = df['loan_grade_encoded'] * df['loan_int_rate']
    df['residual_income'] = df['person_income'] - df['annual_interest_cost']
    df['residual_income_ratio'] = df['residual_income'] / (df['person_income'] + 1)
    df['credit_coverage_ratio'] = df['cb_person_cred_hist_length'] / (df['person_age'] + 1)
    df['compound_risk_score'] = (
        (df['loan_grade_encoded'] >= 4).astype(int)
        + df['historical_default_flag']
        + (df['loan_int_rate'] > 15).astype(int)
        + (df['loan_percent_income'] > 0.20).astype(int)
    )
    return df


def compute_woe_map(df_train: pd.DataFrame, col: str, target_col: str = TARGET) -> dict[str, float]:
    tot_ev = df_train[target_col].sum()
    tot_nev = len(df_train) - tot_ev
    stats = df_train.groupby(col)[target_col].agg(['sum', 'count'])
    stats.columns = ['events', 'count']
    stats['nonevents'] = stats['count'] - stats['events']
    stats['pct_ev'] = (stats['events'] / tot_ev).clip(lower=1e-9)
    stats['pct_nev'] = (stats['nonevents'] / tot_nev).clip(lower=1e-9)
    stats['woe'] = np.log(stats['pct_ev'] / stats['pct_nev'])
    return stats['woe'].to_dict()


def apply_stats_features(
    df: pd.DataFrame,
    grade_avg_rate: dict[str, float],
    woe_maps: dict[str, dict[str, float]],
) -> pd.DataFrame:
    df = df.copy()
    df['int_rate_deviation_by_grade'] = (
        df['loan_int_rate'] - df['loan_grade'].map(grade_avg_rate)
    ).fillna(0)
    df['woe_intent'] = df['loan_intent'].map(woe_maps['loan_intent']).fillna(0)
    df['woe_ownership'] = df['person_home_ownership'].map(woe_maps['person_home_ownership']).fillna(0)
    df['woe_grade'] = df['loan_grade'].map(woe_maps['loan_grade']).fillna(0)
    return df


def encode_split(df: pd.DataFrame, ref_cols: list[str] | None = None) -> pd.DataFrame:
    df = df.drop(columns=DROP_ORIGINAL, errors='ignore')
    df = pd.get_dummies(df, columns=OHE_COLS, drop_first=False)
    if ref_cols is not None:
        for c in ref_cols:
            if c not in df.columns:
                df[c] = 0
        df = df[ref_cols]
    return df


def impute_split(df: pd.DataFrame, num_medians: dict, cat_modes: dict) -> pd.DataFrame:
    df = df.copy()
    for col in num_medians:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors='coerce').fillna(num_medians[col])
    for col in cat_modes:
        if col in df.columns:
            df[col] = df[col].fillna(cat_modes[col])
    return df


def clip_split(df: pd.DataFrame, clip_bounds: dict[str, tuple[float, float]]) -> pd.DataFrame:
    df = df.copy()
    for col, (lo, hi) in clip_bounds.items():
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors='coerce').clip(lo, hi)
    return df


def fit_preprocessing_artifacts(df_train_raw: pd.DataFrame) -> dict[str, Any]:
    num_medians = (
        df_train_raw.select_dtypes(include='number')
        .drop(columns=[TARGET], errors='ignore')
        .median()
    )
    cat_modes = df_train_raw.select_dtypes(include='object').mode().iloc[0]

    df_train_imp = impute_split(df_train_raw, num_medians.to_dict(), cat_modes.to_dict())

    clip_bounds = {}
    for col in OUTLIER_COLS:
        lo = df_train_imp[col].quantile(0.01)
        hi = df_train_imp[col].quantile(0.99)
        clip_bounds[col] = (float(lo), float(hi))

    df_train_clip = clip_split(df_train_imp, clip_bounds)
    df_train_feat = engineer_features(df_train_clip)

    grade_avg_rate = df_train_feat.groupby('loan_grade')['loan_int_rate'].mean().to_dict()
    woe_maps = {
        'loan_intent': compute_woe_map(df_train_feat, 'loan_intent'),
        'person_home_ownership': compute_woe_map(df_train_feat, 'person_home_ownership'),
        'loan_grade': compute_woe_map(df_train_feat, 'loan_grade'),
    }

    return {
        'num_medians': {k: float(v) for k, v in num_medians.to_dict().items()},
        'cat_modes': cat_modes.to_dict(),
        'outlier_bounds': {
            col: {'lo': lo, 'hi': hi} for col, (lo, hi) in clip_bounds.items()
        },
        'grade_avg_rate': {k: float(v) for k, v in grade_avg_rate.items()},
        'woe_maps': {
            k: {str(cat): float(v) for cat, v in m.items()} for k, m in woe_maps.items()
        },
    }


def transform_dataframe(df: pd.DataFrame, meta: dict[str, Any], feature_names: list[str]) -> pd.DataFrame:
    df = impute_split(df, meta['num_medians'], meta['cat_modes'])
    clip_bounds = {
        col: (bounds['lo'], bounds['hi'])
        for col, bounds in meta['outlier_bounds'].items()
    }
    df = clip_split(df, clip_bounds)
    df = engineer_features(df)
    df = apply_stats_features(
        df,
        meta.get('grade_avg_rate', {}),
        meta['woe_maps'],
    )
    df = encode_split(df)
    df = df.reindex(columns=feature_names, fill_value=0)
    return df.apply(pd.to_numeric, errors='coerce').fillna(0)


def map_camelcase_input(raw_data: dict) -> dict:
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
        'cb_person_cred_hist_length': raw_data.get('cbPersonCredHistLength'),
    }


def transform_raw_input(raw_data: dict, meta: dict[str, Any], feature_names: list[str]) -> pd.DataFrame:
    row = map_camelcase_input(raw_data)
    return transform_dataframe(pd.DataFrame([row]), meta, feature_names)


def load_and_split(dataset_path: str) -> tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame]:
    df = pd.read_csv(dataset_path)
    df_tv, df_test_raw = train_test_split(
        df, test_size=0.10, random_state=SEED, stratify=df[TARGET])
    df_train_raw, df_val_raw = train_test_split(
        df_tv, test_size=0.1111, random_state=SEED, stratify=df_tv[TARGET])
    return df_train_raw, df_val_raw, df_test_raw


def build_preprocessing_meta(dataset_path: str, feature_names: list[str]) -> dict[str, Any]:
    df_train_raw, _, _ = load_and_split(dataset_path)
    artifacts = fit_preprocessing_artifacts(df_train_raw)
    artifacts['feature_names'] = feature_names
    return artifacts


def build_lime_train_matrix(dataset_path: str, meta: dict[str, Any], max_rows: int = 2000) -> np.ndarray:
    df_train_raw, _, _ = load_and_split(dataset_path)
    feature_names = meta['feature_names']
    X_train = transform_dataframe(df_train_raw, meta, feature_names)
    n = min(max_rows, len(X_train))
    return X_train.astype(float).values[:n]
