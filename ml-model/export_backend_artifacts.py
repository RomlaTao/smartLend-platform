"""
Fast export of backend runtime artifacts from v5 training checkpoints.

Usage:
  python export_backend_artifacts.py --dataset path/to/credit_risk_dataset.csv
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

import joblib
import numpy as np
import shap

from preprocessing_pipeline import build_lime_train_matrix, build_preprocessing_meta


def export_bundle_and_shap(model_dir: Path, output_dir: Path) -> None:
    with open(model_dir / 'final_model_metadata.json', encoding='utf-8') as f:
        meta = json.load(f)

    model_name = meta['selected_model_name']
    model = joblib.load(model_dir / f'final_model_{model_name}.pkl')
    threshold = float(meta['selected_threshold'])

    joblib.dump({'model': model, 'threshold': threshold}, output_dir / 'selected_model_bundle.pkl')
    print(f'  [OK] selected_model_bundle.pkl  (model={model_name}, threshold={threshold})')

    joblib.dump(shap.TreeExplainer(model), output_dir / 'shap_explainer.pkl')
    print('  [OK] shap_explainer.pkl')


def resolve_feature_names(model_dir: Path) -> list[str]:
    ga_path = model_dir / 'ga_feature_selection.json'
    if ga_path.exists():
        with open(ga_path, encoding='utf-8') as f:
            return json.load(f)['GA_FEATURES']
    with open(model_dir / 'final_model_metadata.json', encoding='utf-8') as f:
        return json.load(f)['GA_FEATURES']


def main() -> int:
    parser = argparse.ArgumentParser(description='Export backend ML artifacts from v5 checkpoints')
    parser.add_argument('--model-dir', default='backup/v5_training')
    parser.add_argument('--output-dir', default='model')
    parser.add_argument('--dataset', help='Path to credit_risk_dataset.csv')
    parser.add_argument('--lime-rows', type=int, default=2000)
    args = parser.parse_args()

    model_dir = Path(args.model_dir)
    output_dir = Path(args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    feature_names = resolve_feature_names(model_dir)
    print(f'GA features: {len(feature_names)}')

    print('Step 1 — bundle + SHAP')
    export_bundle_and_shap(model_dir, output_dir)

    if not args.dataset:
        print('Step 2 — SKIPPED (no --dataset)')
        return 0

    dataset = Path(args.dataset)
    if not dataset.exists():
        print(f'ERROR: dataset not found: {dataset}', file=sys.stderr)
        return 1

    print('Step 2 — preprocessing_meta + lime_train_data')
    prep_meta = build_preprocessing_meta(str(dataset), feature_names)
    with open(output_dir / 'preprocessing_meta.json', 'w', encoding='utf-8') as f:
        json.dump(prep_meta, f, indent=2, ensure_ascii=False)
    print(f'  [OK] preprocessing_meta.json')

    lime_data = build_lime_train_matrix(str(dataset), prep_meta, max_rows=args.lime_rows)
    np.save(output_dir / 'lime_train_data.npy', lime_data)
    print(f'  [OK] lime_train_data.npy  shape={lime_data.shape}')
    return 0


if __name__ == '__main__':
    sys.exit(main())
