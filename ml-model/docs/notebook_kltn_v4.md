```python
from google.colab import drive
drive.mount('/content/drive')
```

```python
# ── Install dependencies (run once on Colab) ──────────────────────
!pip install lightgbm xgboost catboost shap lime scikit-learn \
             pandas numpy matplotlib seaborn optuna imbalanced-learn
```

```python
import os, warnings, random, json
import joblib
warnings.filterwarnings('ignore')

import numpy  as np
import pandas as pd
import matplotlib.pyplot as plt
import matplotlib.gridspec as gridspec
import seaborn as sns

# ── Sklearn ───────────────────────────────────────────────────────
from sklearn.preprocessing   import StandardScaler, LabelEncoder
from sklearn.model_selection  import train_test_split, StratifiedKFold, cross_val_score
from sklearn.linear_model     import LogisticRegression
from sklearn.ensemble         import RandomForestClassifier
from sklearn.neural_network   import MLPClassifier
from sklearn.svm              import SVC
from sklearn.naive_bayes      import GaussianNB
from sklearn.metrics          import (
    accuracy_score, precision_score, recall_score, f1_score,
    roc_auc_score, average_precision_score,
    confusion_matrix, classification_report,
    roc_curve, precision_recall_curve
)

# ── Boosting ──────────────────────────────────────────────────────
from xgboost   import XGBClassifier
from lightgbm  import LGBMClassifier
from catboost  import CatBoostClassifier

# ── XAI ───────────────────────────────────────────────────────────
import shap
import lime
import lime.lime_tabular

from IPython.display import display, HTML

# ── Reproducibility ───────────────────────────────────────────────
SEED = 42
random.seed(SEED);  np.random.seed(SEED)

os.makedirs('plots',   exist_ok=True)
os.makedirs('reports', exist_ok=True)

CKPT_DIR = '/content/drive/MyDrive/checkpoints/kltn_v3_8_2'
os.makedirs(CKPT_DIR, exist_ok=True)

plt.style.use('seaborn-v0_8-whitegrid')
pd.set_option('display.max_columns', 30)
pd.set_option('display.float_format', '{:.4f}'.format)

print('All libraries loaded.')
print(f'NumPy {np.__version__} | Pandas {pd.__version__}')
print(f'Checkpoint dir : {CKPT_DIR}')
```

```python
# ── Load ──────────────────────────────────────────────────────────
# On Colab: upload credit_risk_dataset.csv or mount Google Drive
# from google.colab import files; files.upload()

df = pd.read_csv('/content/drive/MyDrive/dataset/credit_risk_dataset.csv')

TARGET = 'loan_status'
print(f'Shape: {df.shape}')
print(f'\nDtypes:\n{df.dtypes}')
print(f'\nMissing values:\n{df.isnull().sum()[df.isnull().sum()>0]}')
df.head(3)
```

```python
# ── 1.1 Class distribution ────────────────────────────────────────
vc     = df[TARGET].value_counts()
vc_pct = df[TARGET].value_counts(normalize=True) * 100

print('Class distribution:')
print(f'  Non-Default (0): {vc[0]:,}  ({vc_pct[0]:.1f}%)')
print(f'  Default     (1): {vc[1]:,}  ({vc_pct[1]:.1f}%)')
print(f'  Imbalance ratio: {vc[0]/vc[1]:.2f}:1')

fig, axes = plt.subplots(1, 2, figsize=(11, 4))
colors = ['#1976D2', '#E53935']

vc.plot(kind='bar', ax=axes[0], color=colors, edgecolor='black', alpha=0.85)
axes[0].set_title('Class Distribution', fontweight='bold', fontsize=13)
axes[0].set_xticklabels(['Non-Default (0)', 'Default (1)'], rotation=0)
for bar, v in zip(axes[0].patches, vc.values):
    axes[0].text(bar.get_x()+bar.get_width()/2, bar.get_height()+80,
                 f'{v:,}\n({v/len(df)*100:.1f}%)', ha='center', fontsize=10)

axes[1].pie(vc.values, labels=['Non-Default','Default'], colors=colors,
            autopct='%1.1f%%', startangle=140, explode=(0,.05),
            shadow=True, textprops={'fontsize':12})
axes[1].set_title('Class Balance', fontweight='bold', fontsize=13)

plt.tight_layout()
plt.savefig('plots/01_class_distribution.png', dpi=150, bbox_inches='tight')
plt.show()
```

```python
# ── 1.2 Numerical feature distributions by loan status ────────────
num_features = ['person_age','person_income','person_emp_length',
                'loan_amnt','loan_int_rate','loan_percent_income',
                'cb_person_cred_hist_length']

fig, axes = plt.subplots(2, 4, figsize=(18, 8))
axes = axes.flatten()

for i, col in enumerate(num_features):
    ax = axes[i]
    df[df[TARGET]==0][col].hist(ax=ax, bins=40, alpha=0.6, color='#1976D2', label='Non-Default')
    df[df[TARGET]==1][col].hist(ax=ax, bins=40, alpha=0.6, color='#E53935', label='Default')
    ax.set_title(col, fontweight='bold', fontsize=11)
    ax.legend(fontsize=8)
axes[-1].set_visible(False)

plt.suptitle('Numerical Feature Distributions by Loan Status',
             fontsize=14, fontweight='bold', y=1.01)
plt.tight_layout()
plt.savefig('plots/02_numerical_distributions.png', dpi=150, bbox_inches='tight')
plt.show()
```

```python
# ── 1.3 Default rate by categorical features ──────────────────────
cat_features = ['loan_grade','person_home_ownership',
                'loan_intent','cb_person_default_on_file']

fig, axes = plt.subplots(1, 4, figsize=(20, 5))
for ax, col in zip(axes, cat_features):
    dr = df.groupby(col)[TARGET].mean().sort_values(ascending=False) * 100
    bars = ax.bar(dr.index, dr.values,
                  color=plt.cm.RdYlGn_r(np.linspace(0.1,0.85,len(dr))),
                  edgecolor='black', alpha=0.85)
    for bar, v in zip(bars, dr.values):
        ax.text(bar.get_x()+bar.get_width()/2, bar.get_height()+0.3,
                f'{v:.1f}%', ha='center', fontsize=9)
    ax.set_title(f'Default Rate by\n{col}', fontweight='bold', fontsize=11)
    ax.set_ylabel('Default Rate (%)')
    plt.setp(ax.get_xticklabels(), rotation=30, ha='right')

plt.suptitle('Default Rate by Categorical Features', fontsize=14, fontweight='bold')
plt.tight_layout()
plt.savefig('plots/03_categorical_default_rates.png', dpi=150, bbox_inches='tight')
plt.show()
```

```python
# ── 1.4 Correlation heatmap ───────────────────────────────────────
df_corr = df.copy()
le = LabelEncoder()
for col in cat_features:
    df_corr[col] = le.fit_transform(df_corr[col].astype(str))

corr = df_corr[num_features + cat_features + [TARGET]].corr()
mask = np.triu(np.ones_like(corr, dtype=bool))

fig, ax = plt.subplots(figsize=(13, 10))
sns.heatmap(corr, mask=mask, annot=True, fmt='.2f', cmap='RdBu_r',
            center=0, vmin=-1, vmax=1, ax=ax,
            annot_kws={'size':8}, linewidths=0.5)
ax.set_title('Feature Correlation Heatmap', fontsize=14, fontweight='bold')
plt.tight_layout()
plt.savefig('plots/04_correlation_heatmap.png', dpi=150, bbox_inches='tight')
plt.show()
```

```python
# ── 2.0 Raw data split — BEFORE any statistical transform ────────────
# Stratified 80 / 10 / 10 split on the raw df.
# All preprocessing (imputation, clipping, encoding) must be FIT
# on df_train_raw ONLY, then transformed uniformly across all splits.
df_tv, df_test_raw = train_test_split(
    df, test_size=0.10, random_state=SEED, stratify=df[TARGET])
df_train_raw, df_val_raw = train_test_split(
    df_tv, test_size=0.1111, random_state=SEED, stratify=df_tv[TARGET])  # ≈10% total

print(f'Train_raw : {len(df_train_raw):,}  | default {df_train_raw[TARGET].sum():,}'
      f' ({df_train_raw[TARGET].mean()*100:.1f}%)')
print(f'Val_raw   : {len(df_val_raw):,}   | default {df_val_raw[TARGET].sum():,}'
      f' ({df_val_raw[TARGET].mean()*100:.1f}%)')
print(f'Test_raw  : {len(df_test_raw):,}   | default {df_test_raw[TARGET].sum():,}'
      f' ({df_test_raw[TARGET].mean()*100:.1f}%)')
```

```python
# ── 2.1 Missing value imputation — Fit on train only ─────────────────
# Fill-values (median / mode) are computed from df_train_raw ONLY.
# val / test use the same train-derived values → no leakage.
num_medians = (df_train_raw
               .select_dtypes(include='number')
               .drop(columns=[TARGET], errors='ignore')
               .median())
cat_modes = df_train_raw.select_dtypes(include='object').mode().iloc[0]

def impute_split(df_):
    df_ = df_.copy()
    for col in num_medians.index:
        df_[col] = df_[col].fillna(num_medians[col])
    for col in cat_modes.index:
        df_[col] = df_[col].fillna(cat_modes[col])
    return df_

df_train_imp = impute_split(df_train_raw)
df_val_imp   = impute_split(df_val_raw)
df_test_imp  = impute_split(df_test_raw)

print(f'Missing after imputation → '
      f'train:{df_train_imp.isnull().sum().sum()} | '
      f'val:{df_val_imp.isnull().sum().sum()} | '
      f'test:{df_test_imp.isnull().sum().sum()}')
```

```python
# ── 2.2 Outlier treatment (1%-99% cap) — Fit bounds on train only ────
# Quantile bounds learned from df_train_imp; same bounds applied to
# val / test to prevent leakage of future-distribution information.
outlier_cols = ['person_age', 'person_income', 'person_emp_length',
                'loan_amnt', 'loan_int_rate']

clip_bounds = {}
for col in outlier_cols:
    lo = df_train_imp[col].quantile(0.01)
    hi = df_train_imp[col].quantile(0.99)
    clip_bounds[col] = (lo, hi)

def clip_split(df_):
    df_ = df_.copy()
    for col, (lo, hi) in clip_bounds.items():
        df_[col] = df_[col].clip(lo, hi)
    return df_

df_train_clip = clip_split(df_train_imp)
df_val_clip   = clip_split(df_val_imp)
df_test_clip  = clip_split(df_test_imp)

print('Clip bounds learned from train:')
for col, (lo, hi) in clip_bounds.items():
    n_clip = ((df_train_imp[col] < lo) | (df_train_imp[col] > hi)).sum()
    print(f'  {col:<30} [{lo:.2f}, {hi:.2f}]  ({n_clip} train values clipped)')
```

```python
# ── 2.3 Feature Engineering — Applied independently to each split ─────
# All formulas are deterministic (no statistics derived from data),
# so they can safely be applied to train / val / test without leakage.
def engineer_features(df):
    df = df.copy()

    # Loan grade → ordinal numeric (A=0 … G=6)
    grade_map = {'A':0,'B':1,'C':2,'D':3,'E':4,'F':5,'G':6}
    df['loan_grade_encoded']      = df['loan_grade'].map(grade_map).fillna(3)

    # Historical default flag (Y=1, N=0)
    df['historical_default_flag'] = (df['cb_person_default_on_file']=='Y').astype(int)

    # Loan-to-income ratio  (captures relative debt burden)
    df['loan_to_income_ratio']    = df['loan_amnt'] / (df['person_income'] + 1)

    # Age × income interaction  (income trend across age groups)
    df['age_income_interaction']  = df['person_age'] * df['person_income']

    # percent_income_loan  (risk weighting by loan-to-income)
    df['percent_income_loan']     = df['loan_percent_income']

    # Annual interest cost
    df['annual_interest_cost']    = df['loan_amnt'] * df['loan_int_rate'] / 100

    # Interest burden ratio
    df['interest_to_income']      = df['annual_interest_cost'] / (df['person_income'] + 1)

    # Employment stability
    df['employment_age_ratio']    = df['person_emp_length'] / (df['person_age'] + 1)

    # High-risk flags
    df['high_loan_pct_flag']      = (df['loan_percent_income'] > 0.30).astype(int)
    df['high_grade_flag']         = (df['loan_grade_encoded'] >= 4).astype(int)  # E/F/G
    df['high_interest_flag']      = (df['loan_int_rate'] > 15).astype(int)

    # Grade × interest interaction (combined risk signal)
    df['grade_x_int_rate']        = df['loan_grade_encoded'] * df['loan_int_rate']

    return df

df_train_feat = engineer_features(df_train_clip)
df_val_feat   = engineer_features(df_val_clip)
df_test_feat  = engineer_features(df_test_clip)

new_feats = [c for c in df_train_feat.columns if c not in df_train_clip.columns]
print(f'Engineered features ({len(new_feats)}):')
for f in new_feats:
    print(f'  + {f}')
```

```python
# ── 2.4 Encoding & final feature matrix — Applied to each split ───────
# OHE column set is frozen from the TRAIN encoding;
# any unseen category in val/test is filled with 0.
drop_original = ['loan_grade', 'cb_person_default_on_file']
ohe_cols      = ['person_home_ownership', 'loan_intent']

def encode_split(df_, ref_cols=None):
    df_ = df_.drop(columns=drop_original, errors='ignore')
    df_ = pd.get_dummies(df_, columns=ohe_cols, drop_first=False)
    if ref_cols is not None:
        for c in ref_cols:
            if c not in df_.columns:
                df_[c] = 0
        df_ = df_[ref_cols]
    return df_

df_train_enc = encode_split(df_train_feat)
ref_cols     = df_train_enc.columns.tolist()   # freeze column order from train
df_val_enc   = encode_split(df_val_feat,  ref_cols)
df_test_enc  = encode_split(df_test_feat, ref_cols)

X_train = df_train_enc.drop(columns=[TARGET])
y_train = df_train_enc[TARGET]
X_val   = df_val_enc.drop(columns=[TARGET])
y_val   = df_val_enc[TARGET]
X_test  = df_test_enc.drop(columns=[TARGET])
y_test  = df_test_enc[TARGET]

FEATURE_NAMES = X_train.columns.tolist()
print(f'Train : {X_train.shape}  Val : {X_val.shape}  Test : {X_test.shape}')
print(f'Total features before selection: {len(FEATURE_NAMES)}')
```

```python
# ── 2.5 Feature selection → GA-first pipeline (v3_8) ────────────────────────
# VIF+Corr pre-filter removed (since v3_7).
# v3_8 GA-first pipeline:
#   Phase 0 : Quick baseline (all features) → select GA_SEED_MODEL type
#   Section 8: GA Feature Selection (GA_SEED_MODEL as fitness proxy)
#   Section 3: Full baseline + tuning on GA_FEATURES
print(f"Full feature pool: {len(FEATURE_NAMES)} features")
print(FEATURE_NAMES)
```

```python
# ── 2.6 StandardScaler (fit on train only) & class weight ────────────
scaler    = StandardScaler()
X_train_s = scaler.fit_transform(X_train)
X_val_s   = scaler.transform(X_val)
X_test_s  = scaler.transform(X_test)

# Class weight for LightGBM (no SMOTE)
NEG = (y_train == 0).sum()
POS = (y_train == 1).sum()
SPW = NEG / POS
print(f'scale_pos_weight = {SPW:.3f}  (NEG={NEG} / POS={POS})')
print(f'Train : {len(X_train):,}  | Val: {len(X_val):,}  | Test: {len(X_test):,}')
```

```python
# ── Baseline — standardised params for fair comparison ──
# All tree models: n_estimators=200, default structural params (explicitly set to match PARAM_GRIDS).
# Class-imbalance: scale_pos_weight / class_weight='balanced' applied uniformly.
# NOTE: All structural params are explicitly declared so baseline values lie within PARAM_GRIDS ranges.
MODELS_BASELINE = {
    'LightGBM'           : LGBMClassifier(
                               n_estimators     = 200,
                               learning_rate    = 0.1,
                               num_leaves       = 31,   # sklearn default
                               scale_pos_weight = SPW,
                               random_state     = SEED,
                               verbose          = -1,
                               n_jobs           = -1),
    'XGBoost'            : XGBClassifier(
                               n_estimators       = 200,
                               learning_rate      = 0.1,
                               max_depth          = 6,    # XGBoost default
                               subsample          = 1.0,  # XGBoost default
                               colsample_bytree   = 1.0,  # XGBoost default
                               min_child_weight   = 1,    # XGBoost default
                               scale_pos_weight   = SPW,
                               eval_metric        = 'logloss',
                               use_label_encoder  = False,
                               random_state       = SEED,
                               n_jobs             = -1),
    'RandomForest'       : RandomForestClassifier(
                               n_estimators  = 200,
                               class_weight  = 'balanced',
                               random_state  = SEED,
                               n_jobs        = -1),
    'CatBoost'           : CatBoostClassifier(
                               iterations         = 200,
                               learning_rate      = 0.1,   # explicit (CatBoost default auto-selects based on iterations)
                               depth              = 6,     # CatBoost default
                               auto_class_weights = 'Balanced',
                               random_seed        = SEED,
                               verbose            = 0),
    'MLP'                : MLPClassifier(
                               hidden_layer_sizes = (100,),
                               max_iter           = 300,
                               random_state       = SEED),
    'SVM'                : SVC(
                               kernel        = 'rbf',
                               probability   = True,
                               class_weight  = 'balanced',
                               random_state  = SEED),
    'LogisticRegression' : LogisticRegression(
                               max_iter      = 1000,
                               class_weight  = 'balanced',
                               random_state  = SEED,
                               n_jobs        = -1),
    'NaiveBayes'         : GaussianNB(),
}

print(f'Phase 1 — Baseline training: {len(MODELS_BASELINE)} models')
print('Params standardised: n_estimators=200, class-imbalance handled uniformly.')
```

```python
# ── Phase 0: Quick Baseline — full feature pool ───────────────────────────────
# Fit all 8 models with default params on the FULL feature pool.
# Purpose: identify the best model TYPE (by val AUC) to serve as GA fitness proxy.
# These results are NOT used for final reporting.
import time, copy as _cp_p0

quick_trained  = {}
quick_val_aucs = {}

print("Phase 0 — Quick Baseline (full feature pool, default params)")
print(f"Features : {len(FEATURE_NAMES)}  |  Train: {len(X_train):,}  |  Val: {len(X_val):,}")
print(f"{'Model':<25}  {'Val AUC':>10}  {'Time(s)':>8}")
print("-" * 48)

for name, clf_template in MODELS_BASELINE.items():
    t0    = time.time()
    clf_q = _cp_p0.deepcopy(clf_template)
    Xtr_q = X_train_s if name in ("MLP","SVM","LogisticRegression","NaiveBayes") else X_train.values
    Xvl_q = X_val_s   if name in ("MLP","SVM","LogisticRegression","NaiveBayes") else X_val.values
    clf_q.fit(Xtr_q, y_train)
    vp_q  = clf_q.predict_proba(Xvl_q)[:,1]
    auc_q = roc_auc_score(y_val, vp_q)
    quick_trained[name]  = clf_q
    quick_val_aucs[name] = auc_q
    print(f"  {name:<23}  {auc_q:>10.4f}  {time.time()-t0:>7.1f}s")

print("\nPhase 0 complete. GA_SEED_MODEL selected in next cell.")
```

```python
# ── Phase 0: Auto-select GA_SEED_MODEL (Top-1 by val AUC) ────────────────────
# GA_SEED_MODEL (default hyperparams) drives the GA fitness function.
# Using default params ensures the fitness reflects the original data signal,
# not hyperparams that were optimised for the full (noisy) feature space.

GA_SEED_MODEL_NAME = max(quick_val_aucs, key=quick_val_aucs.get)
GA_SEED_MODEL      = quick_trained[GA_SEED_MODEL_NAME]

print("Phase 0 — GA_SEED_MODEL ranking:")
print(f"  {'Model':<25}  {'Val AUC':>10}")
print("  " + "─" * 38)
for name in sorted(quick_val_aucs, key=quick_val_aucs.get, reverse=True):
    tag = "  ← GA_SEED_MODEL" if name == GA_SEED_MODEL_NAME else ""
    print(f"  {name:<25}  {quick_val_aucs[name]:>10.4f}{tag}")

print(f"\nGA_SEED_MODEL = {GA_SEED_MODEL_NAME}  (val AUC = {quick_val_aucs[GA_SEED_MODEL_NAME]:.4f})")
print("  This model (default params, full features) serves as GA fitness proxy.")
print("  After GA, all 8 models are re-evaluated on GA_FEATURES.")

# ── Compute test metrics for Phase 0 comparison (Section D) ──────────────────
# Uses default threshold 0.5 to represent the baseline "no-GA, no-tuning" state.
_seed_xte  = X_test_s if GA_SEED_MODEL_NAME in ("MLP","SVM","LogisticRegression","NaiveBayes")              else X_test.values
_seed_tp   = GA_SEED_MODEL.predict_proba(_seed_xte)[:,1]
_seed_pred = (_seed_tp >= 0.5).astype(int)

def _gmean_p0(yt, yp):
    """Inline gmean — will be officially re-defined in the threshold cell."""
    from sklearn.metrics import confusion_matrix as _cm
    tn, fp, fn, tp = _cm(yt, yp).ravel()
    return float(np.sqrt(tp/(tp+fn+1e-9) * tn/(tn+fp+1e-9)))

quick_test_results = {
    "Precision_1": round(precision_score(y_test, _seed_pred, zero_division=0), 4),
    "Recall_1"   : round(recall_score(y_test, _seed_pred,    zero_division=0), 4),
    "F1_1"       : round(f1_score(y_test, _seed_pred,        zero_division=0), 4),
    "G-mean"     : round(_gmean_p0(y_test, _seed_pred),                        4),
    "ROC-AUC"    : round(roc_auc_score(y_test, _seed_tp),                      4),
}
print(f"\nPhase 0 test metrics ({GA_SEED_MODEL_NAME}, {len(FEATURE_NAMES)} features, t=0.5):")
for k, v in quick_test_results.items():
    print(f"  {k:<12}: {v:.4f}")
```

```python
# ── 8.0 Genetic Algorithm Feature Selection (GA-first) ──────────────────
# Replaces VIF+Corr (removed) and SHAP K-sweep from v3_5.
# GA searches the 2^N feature-subset space directly, maximising 3-fold
# CV AUC of GA_SEED_MODEL (Phase 0 Top-1, default params) — zero test contamination.
import random as rnd, copy

# ─── GA hyperparameters ──────────────────────────────────────────────────
GA_POP      = 40       # population size
GA_GENS     = 25       # generations
GA_CXPB     = 0.80     # crossover probability
GA_MUTPB    = 0.02     # per-gene bit-flip probability
GA_TOUR     = 3        # tournament size
GA_MIN_FEAT = 5        # minimum features per chromosome
GA_CV       = StratifiedKFold(n_splits=5, shuffle=True, random_state=SEED)

ALL_FEATURES = FEATURE_NAMES   # full pool (no pre-filter)
n_feats      = len(ALL_FEATURES)

ENGINEERED_FEATURES = [
    "loan_grade_encoded", "historical_default_flag",
    "loan_to_income_ratio", "age_income_interaction",
    "percent_income_loan", "annual_interest_cost",
    "interest_to_income", "employment_age_ratio",
    "high_loan_pct_flag", "high_grade_flag",
    "high_interest_flag", "grade_x_int_rate",
]

print(f"GA Feature Selection | pool size = {n_feats} features")
print(f"Params: pop={GA_POP}  gens={GA_GENS}  cx={GA_CXPB}  mut={GA_MUTPB}  min_feat={GA_MIN_FEAT}")

# ─── Fitness ──────────────────────────────────────────────────────────────
def ga_fitness(chromosome):
    """3-fold stratified CV AUC on X_train for the feature subset."""
    sel = [ALL_FEATURES[i] for i, b in enumerate(chromosome) if b]
    if len(sel) < GA_MIN_FEAT:
        return 0.0
    mdl    = copy.deepcopy(GA_SEED_MODEL)
    scores = cross_val_score(mdl, X_train[sel].values, y_train,
                             cv=GA_CV, scoring="roc_auc", n_jobs=-1)
    return float(scores.mean())

# ─── GA operators ─────────────────────────────────────────────────────────
def make_individual():
    while True:
        ind = [rnd.randint(0, 1) for _ in range(n_feats)]
        if sum(ind) >= GA_MIN_FEAT:
            return ind

def tournament_select(pop, fits):
    cands = rnd.sample(range(len(pop)), GA_TOUR)
    return list(pop[max(cands, key=lambda i: fits[i])])

def uniform_crossover(p1, p2):
    c1, c2 = list(p1), list(p2)
    for i in range(len(c1)):
        if rnd.random() < 0.5:
            c1[i], c2[i] = c2[i], c1[i]
    return c1, c2

def bit_flip_mutate(ind):
    ind = list(ind)
    for i in range(len(ind)):
        if rnd.random() < GA_MUTPB:
            ind[i] ^= 1
    while sum(ind) < GA_MIN_FEAT:
        ind[rnd.randint(0, len(ind)-1)] = 1
    return ind

# ─── Evolution loop ───────────────────────────────────────────────────────
rnd.seed(SEED); np.random.seed(SEED)

population     = [make_individual() for _ in range(GA_POP)]
fitness_scores = [ga_fitness(ind) for ind in population]

best_ever_ind = list(population[int(np.argmax(fitness_scores))])
best_ever_fit = float(max(fitness_scores))
ga_history    = []

print(f"\nEvolving {GA_GENS} generations (pop={GA_POP})...")
print(f"  Gen  Best AUC   Avg AUC  Worst AUC  #Feats")
print("-" * 52)

for gen in range(GA_GENS):
    new_pop = [list(best_ever_ind)]    # elitism
    while len(new_pop) < GA_POP:
        p1 = tournament_select(population, fitness_scores)
        p2 = tournament_select(population, fitness_scores)
        if rnd.random() < GA_CXPB:
            c1, c2 = uniform_crossover(p1, p2)
        else:
            c1, c2 = list(p1), list(p2)
        new_pop.extend([bit_flip_mutate(c1), bit_flip_mutate(c2)])
    population     = new_pop[:GA_POP]
    fitness_scores = [ga_fitness(ind) for ind in population]

    gen_best = max(fitness_scores)
    gen_avg  = float(np.mean(fitness_scores))
    gen_wst  = min(fitness_scores)
    bi       = int(np.argmax(fitness_scores))
    n_sel    = sum(population[bi])

    if gen_best > best_ever_fit:
        best_ever_ind = list(population[bi])
        best_ever_fit = gen_best

    ga_history.append({"gen": gen+1, "best": gen_best,
                       "avg": gen_avg, "worst": gen_wst, "n_feats": n_sel})
    print(f"  {gen+1:>3}  {gen_best:>8.4f}  {gen_avg:>8.4f}  {gen_wst:>9.4f}  {n_sel:>6}")

GA_FEATURES        = [ALL_FEATURES[i] for i, b in enumerate(best_ever_ind) if b]
N_GA_FEATURES      = len(GA_FEATURES)
SHAP_FEATURE_NAMES = GA_FEATURES

print(f"\nGA complete — best CV AUC = {best_ever_fit:.4f}")
print(f"Selected {N_GA_FEATURES} / {n_feats} features:")
for i, f in enumerate(GA_FEATURES, 1):
    tag = " [ENG]" if f in ENGINEERED_FEATURES else ""
    print(f"  {i:2d}. {f}{tag}")
eng_in_ga  = [f for f in GA_FEATURES if f in ENGINEERED_FEATURES]
orig_in_ga = [f for f in GA_FEATURES if f not in ENGINEERED_FEATURES]
print(f"\n  Engineered: {len(eng_in_ga)}  |  Original: {len(orig_in_ga)}")

# ── Checkpoint: lưu kết quả GA sau khi evolution hoàn tất ────────
_ga_ckpt = {
    'GA_FEATURES'   : GA_FEATURES,
    'best_ever_ind' : best_ever_ind,
    'best_ever_fit' : best_ever_fit,
    'ga_history'    : ga_history,
    'N_GA_FEATURES' : N_GA_FEATURES,
}
_ga_path = os.path.join(CKPT_DIR, 'ga_feature_selection.json')
with open(_ga_path, 'w', encoding='utf-8') as _f:
    json.dump(_ga_ckpt, _f, indent=2, ensure_ascii=False)
print(f'[CKPT] GA results saved → {_ga_path}')
```

```python
# ── 8.1 GA Convergence Plot ──────────────────────────────────────────────
ga_df = pd.DataFrame(ga_history)

fig, axes = plt.subplots(1, 2, figsize=(14, 5))

for label, col, color, lstyle in [
        ("Best",  "best",  "#2E7D32", "o-"),
        ("Avg",   "avg",   "#1976D2", "s--"),
        ("Worst", "worst", "#E53935", "^:")]:
    axes[0].plot(ga_df["gen"], ga_df[col], lstyle,
                 color=color, lw=2, ms=5, label=label)

best_gen = int(ga_df["best"].idxmax()) + 1
axes[0].axvline(best_gen, color="#FF8F00", lw=2, linestyle="--",
                label=f"Best gen = {best_gen}")
axes[0].set_xlabel("Generation", fontsize=12)
axes[0].set_ylabel("3-fold CV AUC (train set)", fontsize=12)
axes[0].set_title("GA Convergence — CV AUC per Generation",
                   fontweight="bold", fontsize=12)
axes[0].legend(fontsize=10);  axes[0].grid(True, alpha=0.3)

axes[1].plot(ga_df["gen"], ga_df["n_feats"], "o-", color="#FF8F00", lw=2, ms=5)
axes[1].axhline(N_GA_FEATURES, color="#2E7D32", lw=1.5, linestyle="--",
                label=f"Final = {N_GA_FEATURES} features")
axes[1].set_xlabel("Generation", fontsize=12)
axes[1].set_ylabel("# Features (best individual)", fontsize=12)
axes[1].set_title("Feature Count per Generation (best individual)",
                   fontweight="bold", fontsize=12)
axes[1].legend(fontsize=10);  axes[1].grid(True, alpha=0.3)

plt.tight_layout()
plt.savefig("plots/GA_convergence.png", dpi=150, bbox_inches="tight")
plt.show()

# ── GA-selected features summary table ───────────────────────────────────
ga_feat_df = pd.DataFrame({
    "Rank"   : range(1, N_GA_FEATURES + 1),
    "Feature": GA_FEATURES,
    "Type"   : ["ENG" if f in ENGINEERED_FEATURES else "ORG" for f in GA_FEATURES],
})
print(f"\nGA-selected features ({N_GA_FEATURES} total, best CV AUC = {best_ever_fit:.4f}):")
display(ga_feat_df.style
    .applymap(lambda v: "color:#E53935;font-weight:bold" if v=="ENG"
              else "color:#1976D2", subset=["Type"])
    .hide(axis="index"))
```

```python
# ── Bridge — Subset all splits to GA_FEATURES + refit StandardScaler ─────────
# All downstream cells (full baseline, tuning, SHAP, LIME) operate on GA_FEATURES.
# StandardScaler is refit on X_train[GA_FEATURES] to avoid dimension mismatch
# for linear models (LR, SVM, MLP, NaiveBayes).

X_train = X_train[GA_FEATURES]
X_val   = X_val[GA_FEATURES]
X_test  = X_test[GA_FEATURES]
FEATURE_NAMES = GA_FEATURES        # update global (n_feats retains original pool size)

scaler    = StandardScaler()
X_train_s = scaler.fit_transform(X_train)
X_val_s   = scaler.transform(X_val)
X_test_s  = scaler.transform(X_test)

NEG = (y_train == 0).sum()
POS = (y_train == 1).sum()
SPW = NEG / POS                    # unchanged (same y_train)

print(f"Feature space : {n_feats} (full pool)  →  {N_GA_FEATURES} (GA-selected)")
print(f"GA_FEATURES   : {FEATURE_NAMES}")
print(f"X_train : {X_train.shape}  |  X_val : {X_val.shape}  |  X_test : {X_test.shape}")
print(f"scale_pos_weight = {SPW:.3f} (unchanged)")
print("Scaler refit on X_train[GA_FEATURES]. All downstream cells use GA_FEATURES.")
```

```python
import time

trained   = {}
val_probs = {}

for name, clf in MODELS_BASELINE.items():
    t0 = time.time()

    # SVM & MLP need scaled features
    Xtr = X_train_s if name in ('MLP','SVM','LogisticRegression','NaiveBayes') else X_train.values
    Xvl = X_val_s   if name in ('MLP','SVM','LogisticRegression','NaiveBayes') else X_val.values

    clf.fit(Xtr, y_train)
    vp = clf.predict_proba(Xvl)[:,1]
    trained[name]   = clf
    val_probs[name] = vp

    val_auc = roc_auc_score(y_val, vp)
    elapsed = time.time() - t0
    print(f'  {name:<25}  val AUC={val_auc:.4f}  ({elapsed:.1f}s)')

print('\nAll models trained.')
```

```python
# ── 5.1 ROC & PR curves — VALIDATION set (threshold-free) ────────────────────
# Evaluate model discrimination before fixing any threshold.
# Use AUC / AP observed here as evidence to justify RECALL_MIN in the next cell.
n_val = len(val_probs)
palette_val = plt.cm.tab10(np.linspace(0, 0.85, n_val))
fig, axes = plt.subplots(1, 2, figsize=(14, 5))

for i, (mname, vp) in enumerate(val_probs.items()):
    fpr_v, tpr_v, _ = roc_curve(y_val, vp)
    auc_v = roc_auc_score(y_val, vp)
    axes[0].plot(fpr_v, tpr_v, lw=1.5, color=palette_val[i],
                 label=f'{mname} (AUC={auc_v:.3f})')

    prec_v, rec_v, _ = precision_recall_curve(y_val, vp)
    ap_v = average_precision_score(y_val, vp)
    axes[1].plot(rec_v, prec_v, lw=1.5, color=palette_val[i],
                 label=f'{mname} (AP={ap_v:.3f})')

axes[0].plot([0, 1], [0, 1], 'k--', lw=1, label='Random')
axes[0].set_xlabel('FPR', fontsize=12)
axes[0].set_ylabel('TPR', fontsize=12)
axes[0].set_title('ROC Curves — All Baseline Models\n(Validation set — threshold-free)',
                  fontweight='bold', fontsize=12)
axes[0].legend(fontsize=7, loc='lower right')
axes[0].grid(True, alpha=0.3)

axes[1].axhline(y_val.mean(), color='k', linestyle='--', lw=1, label='Baseline (random)')
axes[1].set_xlabel('Recall', fontsize=12)
axes[1].set_ylabel('Precision', fontsize=12)
axes[1].set_title('Precision\u2013Recall Curves — All Baseline Models\n(Validation set — threshold-free)',
                  fontweight='bold', fontsize=12)
axes[1].legend(fontsize=7, loc='upper right')
axes[1].grid(True, alpha=0.3)

plt.tight_layout()
plt.savefig('plots/05b_roc_pr_validation.png', dpi=150, bbox_inches='tight')
plt.show()

print('AUC / AP above are independent of threshold.')
print('\u2192 Inspect curves, then set RECALL_MIN in the next cell before running threshold optimization.')

```

```python
THRESH_GRID_N = 1001

# Recall floor on validation (red dashed line on EDA plot). Tune after inspecting curves.
RECALL_MIN = 0.8

def gmean_score(y_true, y_pred):
    """Geometric mean of sensitivity and specificity."""
    cm = confusion_matrix(y_true, y_pred)
    tn, fp, fn, tp = cm.ravel()
    sensitivity = tp / (tp + fn + 1e-9)
    specificity = tn / (tn + fp + 1e-9)
    return np.sqrt(sensitivity * specificity)

def compute_threshold_curve_metrics(y_true, y_prob, thresholds=None):
    """Dense grid: Recall_1, Precision_1, F1_1, G-mean vs threshold (validation)."""
    if thresholds is None:
        thresholds = np.linspace(0, 1, THRESH_GRID_N)
    recalls, precs, f1s, gmeans = [], [], [], []
    for t in thresholds:
        pred = (y_prob >= t).astype(int)
        recalls.append(recall_score(y_true, pred, zero_division=0))
        precs.append(precision_score(y_true, pred, zero_division=0))
        f1s.append(f1_score(y_true, pred, zero_division=0))
        gmeans.append(gmean_score(y_true, pred))
    return thresholds, np.array(recalls), np.array(precs), np.array(f1s), np.array(gmeans)

# --- EDA: Recall_1 / Precision_1 vs threshold (edit RECALL_MIN above, then re-run this cell) ---
_ts = np.linspace(0, 1, THRESH_GRID_N)
palette_eda = plt.cm.tab10(np.linspace(0, 0.85, len(val_probs)))
fig_eda, axes_eda = plt.subplots(2, 1, figsize=(12, 7), sharex=True)
for i, (name, vp) in enumerate(val_probs.items()):
    _, rec, prec, _, _ = compute_threshold_curve_metrics(y_val, vp, _ts)
    axes_eda[0].plot(_ts, rec, lw=1.3, color=palette_eda[i], label=name)
    axes_eda[1].plot(_ts, prec, lw=1.3, color=palette_eda[i], label=name)
axes_eda[0].axhline(RECALL_MIN, color='#E53935', lw=1.6, linestyle='--', alpha=0.9,
                    label=f'RECALL_MIN = {RECALL_MIN}')
axes_eda[0].set_ylabel('Recall_1 (validation)', fontsize=12)
axes_eda[0].set_title('Recall_1 & Precision_1 vs threshold — all baseline models (validation)',
                      fontweight='bold', fontsize=12)
axes_eda[0].grid(True, alpha=0.3)
axes_eda[0].legend(fontsize=7, loc='upper right', ncol=2)
axes_eda[1].set_ylabel('Precision_1 (validation)', fontsize=12)
axes_eda[1].set_xlabel('Threshold', fontsize=12)
axes_eda[1].grid(True, alpha=0.3)
plt.tight_layout()
plt.savefig('plots/05a_recall_precision_vs_threshold_eda.png', dpi=150, bbox_inches='tight')
plt.show()

def find_optimal_threshold(y_true, y_prob, method='recall_floor_max_f1', recall_min=None):
    """
    Validation-set threshold search.
    method:
      'recall_floor_max_f1' — among thresholds with Recall_1 >= recall_min, maximise F1_1;
                             ties broken by higher G-mean. If infeasible, fall back to unconstrained max F1.
      'gmean' / 'f1' / 'youden' — legacy (ROC-derived threshold grid).
    """
    recall_min = RECALL_MIN if recall_min is None else recall_min

    if method == 'recall_floor_max_f1':
        ts, recs, precs, f1s, gms = compute_threshold_curve_metrics(y_true, y_prob)
        feas = np.where(recs >= recall_min)[0]
        if len(feas) == 0:
            print(f'  [WARN] No threshold achieves Recall_1 >= {recall_min:.4f} '
                  f'(max Recall_1 = {recs.max():.4f}). Using unconstrained max F1.')
            idx = int(np.argmax(f1s))
        else:
            best_f1 = f1s[feas].max()
            cand = feas[np.isclose(f1s[feas], best_f1, rtol=0, atol=1e-9)]
            idx = int(cand[np.argmax(gms[cand])])
        meta = {
            'val_recall': float(recs[idx]),
            'val_precision': float(precs[idx]),
            'val_f1': float(f1s[idx]),
            'val_gmean': float(gms[idx]),
        }
        return float(ts[idx]), meta

    fpr, tpr, thresholds = roc_curve(y_true, y_prob)
    if method == 'gmean':
        scores = np.sqrt(tpr * (1 - fpr))
    elif method == 'f1':
        scores = []
        for t in thresholds:
            pred = (y_prob >= t).astype(int)
            scores.append(f1_score(y_true, pred, zero_division=0))
        scores = np.array(scores)
    elif method == 'youden':
        scores = tpr - fpr
    else:
        raise ValueError(f'Unknown method={method!r}')
    best_idx = int(np.argmax(scores))
    return float(thresholds[best_idx]), float(scores[best_idx])

# Optimal threshold on validation (recall floor + max F1) for each baseline model
optimal_thresholds = {}
print(f'Optimal thresholds — Recall_1 >= {RECALL_MIN} on validation, then max F1_1 (tie-break G-mean):')
print(f'{"Model":<25}  {"Thresh":>8}  {"Val R1":>8}  {"Val P1":>8}  {"Val F1":>8}  {"Val G":>8}')
print('-' * 74)

for name, vp in val_probs.items():
    thresh, aux = find_optimal_threshold(y_val, vp, method='recall_floor_max_f1')
    optimal_thresholds[name] = thresh
    print(f'{name:<25}  {thresh:>8.4f}  {aux["val_recall"]:>8.4f}  {aux["val_precision"]:>8.4f}  '
          f'{aux["val_f1"]:>8.4f}  {aux["val_gmean"]:>8.4f}')

```

```python
# --- Validation F1_1 vs threshold (vertical dash = chosen threshold per model) ---
palette_t = plt.cm.tab10(np.linspace(0, 0.85, len(val_probs)))
ts = np.linspace(0, 1, THRESH_GRID_N)

fig, ax = plt.subplots(figsize=(12, 5))
for i, (name, vp) in enumerate(val_probs.items()):
    _, _, _, f1v, _ = compute_threshold_curve_metrics(y_val, vp, ts)
    best_t = optimal_thresholds[name]
    ax.plot(ts, f1v, lw=1.5, color=palette_t[i], label=f'{name} (t*={best_t:.2f})')
    ax.axvline(best_t, color=palette_t[i], lw=0.8, linestyle='--', alpha=0.5)

ax.set_xlabel('Threshold', fontsize=12)
ax.set_ylabel('F1_1 (validation)', fontsize=12)
ax.set_title(
    f'F1_1 vs threshold — all models (validation)\n'
    f'Chosen t* = max F1 subject to Recall_1 >= {RECALL_MIN}',
    fontweight='bold', fontsize=12)
ax.legend(fontsize=7, loc='lower center', ncol=2)
ax.grid(True, alpha=0.3)
ax.set_xlim(0, 1)
ax.set_ylim(0, 1.02)
plt.tight_layout()
plt.savefig('plots/05_threshold_all_models.png', dpi=150, bbox_inches='tight')
plt.show()

print('Note: Fixed-vs-optimal comparison for the selected model is in Section 6.5.')

```

```python
results   = {}
test_probs = {}
test_preds = {}

for name, clf in trained.items():
    Xte = X_test_s if name in ('MLP','SVM','LogisticRegression','NaiveBayes') else X_test.values
    tp  = clf.predict_proba(Xte)[:,1]
    t   = optimal_thresholds[name]
    pred = (tp >= t).astype(int)

    test_probs[name] = tp
    test_preds[name] = pred

    results[name] = {
        'Accuracy'  : round(accuracy_score(y_test, pred),         4),
        'Precision_1' : round(precision_score(y_test, pred, zero_division=0), 4),
        'Recall_1'    : round(recall_score(y_test, pred, zero_division=0),    4),
        'F1_1'        : round(f1_score(y_test, pred, zero_division=0),        4),
        'Precision_0' : round(precision_score(y_test, pred, pos_label=0, zero_division=0), 4),
        'Recall_0'    : round(recall_score(y_test, pred, pos_label=0, zero_division=0),    4),
        'F1_0'        : round(f1_score(y_test, pred, pos_label=0, zero_division=0),        4),
        'G-mean'    : round(gmean_score(y_test, pred),            4),
        'ROC-AUC'   : round(roc_auc_score(y_test, tp),            4),
        'Threshold' : round(t, 4),
    }

results_df = pd.DataFrame(results).T

print('='*70)
print('EVALUATION RESULTS (Recall_floor + max-F1 threshold per model — test set)')
print('='*70)
display(results_df.style
    .highlight_max(subset=['Accuracy','Precision_1','Recall_1','F1_1','Precision_0','Recall_0','F1_0','G-mean','ROC-AUC'],
                   axis=0, color='#C8E6C9')
    .highlight_min(subset=['Accuracy','Precision_1','Recall_1','F1_1','Precision_0','Recall_0','F1_0','G-mean','ROC-AUC'],
                   axis=0, color='#FFCDD2')
    .format('{:.4f}')
    .set_caption('All Models — Recall_floor + max F1 threshold (val-tuned)'))

best_model_name = results_df['ROC-AUC'].idxmax()
print(f'\nBest model (ROC-AUC): {best_model_name}')
for k, v in results[best_model_name].items():
    print(f'  {k:<12}: {v}')

```

```python
# ── 6.1 Metrics bar chart ─────────────────────────────────────────
metrics_plot = ['Accuracy','Precision_1','Recall_1','F1_1','Precision_0','Recall_0','F1_0','G-mean','ROC-AUC']
n = len(results_df)
x = np.arange(len(metrics_plot))
w = 0.10
palette = plt.cm.tab10(np.linspace(0, 0.85, n))

fig, ax = plt.subplots(figsize=(16, 6))
for i, (mname, row) in enumerate(results_df.iterrows()):
    offset = (i - n/2) * w + w/2
    bars = ax.bar(x + offset, row[metrics_plot].values, w,
                  label=mname, color=palette[i], edgecolor='black', alpha=0.85)
    # label only the best model's bars
    if mname == best_model_name:
        for bar, v in zip(bars, row[metrics_plot].values):
            ax.text(bar.get_x()+bar.get_width()/2, bar.get_height()+0.003,
                    f'{v:.3f}', ha='center', fontsize=7.5,
                    fontweight='bold', color='darkgreen')

ax.set_xticks(x); ax.set_xticklabels(metrics_plot, fontsize=12)
ax.set_ylim(0.4, 1.08)
ax.set_ylabel('Score', fontsize=12)
ax.set_title('All Models — Evaluation Metrics (Recall_floor + max F1 threshold)',
             fontsize=13, fontweight='bold')
ax.legend(fontsize=8, loc='lower right', ncol=2)
ax.grid(axis='y', alpha=0.3)

plt.tight_layout()
plt.savefig('plots/06_metrics_comparison.png', dpi=150, bbox_inches='tight')
plt.show()

```

```python
# ── 6.2 Confusion matrices — Top 4 models by ROC-AUC ───────────
top_models = results_df.nlargest(4, 'ROC-AUC').index.tolist()
fig, axes  = plt.subplots(1, 4, figsize=(20, 5))

for ax, mname in zip(axes, top_models):
    cm_norm = confusion_matrix(y_test, test_preds[mname], normalize='true')
    sns.heatmap(cm_norm, annot=True, fmt='.2%', cmap='Blues', ax=ax,
                xticklabels=['Non-Default','Default'],
                yticklabels=['Non-Default','Default'],
                annot_kws={'size':12, 'weight':'bold'})
    r = results[mname]
    ax.set_title(f'{mname}\nF1={r["F1_1"]:.3f}  G={r["G-mean"]:.3f}  AUC={r["ROC-AUC"]:.3f}',
                 fontsize=10, fontweight='bold')
    ax.set_xlabel('Predicted'); ax.set_ylabel('Actual')

plt.suptitle('Normalised Confusion Matrices — Top 4 by ROC-AUC',
             fontsize=14, fontweight='bold')
plt.tight_layout()
plt.savefig('plots/07_confusion_matrices.png', dpi=150, bbox_inches='tight')
plt.show()
```

```python
# ── 6.3 ROC & PR curves — TEST set (final reporting after threshold selection) ─
# ROC-AUC / AP are threshold-independent metrics.
# This section reports final curves on test set (Section 5.1 showed validation curves).
fig, axes = plt.subplots(1, 2, figsize=(14, 5))
palette_roc = plt.cm.tab10(np.linspace(0, 0.85, n))

for i, (mname, tp) in enumerate(test_probs.items()):
    fpr_r, tpr_r, _ = roc_curve(y_test, tp)
    auc_r = results[mname]['ROC-AUC']
    lw = 2.5 if mname == best_model_name else 1.2
    axes[0].plot(fpr_r, tpr_r, lw=lw, color=palette_roc[i],
                 label=f'{mname} ({auc_r:.4f})')

axes[0].plot([0,1],[0,1],'k--',lw=1)
axes[0].set_xlabel('FPR'); axes[0].set_ylabel('TPR')
axes[0].set_title('ROC Curves — All Models', fontweight='bold', fontsize=13)
axes[0].legend(fontsize=7, loc='lower right')
axes[0].grid(True, alpha=0.3)

for i, (mname, tp) in enumerate(test_probs.items()):
    prec_c, rec_c, _ = precision_recall_curve(y_test, tp)
    ap = average_precision_score(y_test, tp)
    lw = 2.5 if mname == best_model_name else 1.2
    axes[1].plot(rec_c, prec_c, lw=lw, color=palette_roc[i],
                 label=f'{mname} (AP={ap:.3f})')

axes[1].axhline(y_test.mean(), color='k', linestyle='--', lw=1)
axes[1].set_xlabel('Recall'); axes[1].set_ylabel('Precision')
axes[1].set_title('Precision-Recall Curves', fontweight='bold', fontsize=13)
axes[1].legend(fontsize=7, loc='upper right')
axes[1].grid(True, alpha=0.3)

plt.tight_layout()
plt.savefig('plots/08_roc_pr_curves.png', dpi=150, bbox_inches='tight')
plt.show()

```

```python
# ── 6.4 Detailed Classification Report — Selected Model ──────────
best_pred = test_preds[best_model_name]
print(f'Selected Model: {best_model_name}')
print(f'{"="*55}')
print(f'{best_model_name} — Detailed Classification Report')
print(classification_report(y_test, best_pred,
                             target_names=['Non-Default','Default']))
```

```python
# ── Select top-3 models from baseline evaluation ─────────────────
TOP_N = 3
top3_models = results_df['ROC-AUC'].sort_values(ascending=False).head(TOP_N).index.tolist()

print('=' * 60)
print(f'BASELINE RANKING — Top-{TOP_N} selected for tuning')
print('=' * 60)
print(f'{"Rank":<6} {"Model":<25} {"F1_1":>10} {"ROC-AUC":>10} {"G-mean":>10}')
print('─' * 65)
for rank, name in enumerate(results_df['ROC-AUC'].sort_values(ascending=False).index, 1):
    f1  = results_df.loc[name, 'F1_1']
    auc = results_df.loc[name, 'ROC-AUC']
    gm  = results_df.loc[name, 'G-mean']
    tag = '  ← TUNING' if name in top3_models else ''
    print(f'{rank:<6} {name:<25} {f1:>10.4f} {auc:>10.4f} {gm:>10.4f}{tag}')
print('=' * 60)
print(f'\nTop-{TOP_N} selected: {top3_models}')

# ── Visual: baseline scores bar chart (Top-3 highlighted) ────────
metrics_cmp = ['F1_1', 'ROC-AUC', 'G-mean', 'Recall_1']
n_models = len(results_df)
x = np.arange(n_models)
width = 0.2
fig, ax = plt.subplots(figsize=(15, 5))
palette_b = plt.cm.tab10(np.linspace(0, 0.9, len(metrics_cmp)))

for i, m in enumerate(metrics_cmp):
    vals = results_df.loc[results_df.index, m].values
    colors = ['#E53935' if nm in top3_models else '#90A4AE'
              for nm in results_df.index]
    ax.bar(x + i * width, vals, width,
           color=colors if m == 'ROC-AUC' else [c + '99' for c in colors],
           edgecolor='black', alpha=0.85, label=m)

ax.set_xticks(x + width * 1.5)
ax.set_xticklabels(results_df.index, rotation=20, ha='right', fontsize=10)
ax.set_ylim(0, 1.12)
ax.set_ylabel('Score', fontsize=12)
ax.set_title('Section 6 — Baseline Comparison: All Models\n(Red = selected for top-3 ROC-AUC tuning)',
             fontsize=13, fontweight='bold')
ax.legend(fontsize=10)
ax.grid(axis='y', alpha=0.3)
plt.tight_layout()
plt.savefig('plots/06_baseline_comparison.png', dpi=150, bbox_inches='tight')
plt.show()
```

```python
import copy
from sklearn.model_selection import RandomizedSearchCV, StratifiedKFold

# ── Hyperparameter search spaces per model type ───────────────────
PARAM_GRIDS = {
    'LightGBM': {
        'n_estimators'      : [100, 200, 300, 500, 700],   # 100 added (baseline=200 not at minimum)
        'learning_rate'     : [0.01, 0.05, 0.1, 0.15, 0.2], # 0.15/0.2 added (baseline=0.1 was max)
        'num_leaves'        : [31, 63, 127],
        'min_child_samples' : [10, 20, 50],
        'subsample'         : [0.7, 0.8, 0.9, 1.0],
        'colsample_bytree'  : [0.7, 0.8, 0.9, 1.0],
        'reg_alpha'         : [0, 0.1, 0.5, 1.0],
        'reg_lambda'        : [0, 0.5, 1.0, 5.0],
        'scale_pos_weight'  : [SPW * 0.5, SPW, SPW * 1.5, SPW * 2.0],
    },
    'XGBoost': {
        'n_estimators'      : [100, 200, 300, 500, 700],   # 100 added (baseline=200 not at minimum)
        'learning_rate'     : [0.01, 0.05, 0.1, 0.2, 0.3],
        'max_depth'         : [3, 5, 6, 7],                # 6 added (baseline default=6)
        'min_child_weight'  : [1, 3, 5, 10],               # added (LightGBM has min_child_samples)
        'subsample'         : [0.7, 0.8, 0.9, 1.0],        # 1.0 added (baseline default=1.0)
        'colsample_bytree'  : [0.7, 0.8, 0.9, 1.0],        # 1.0 added (baseline default=1.0)
        'reg_alpha'         : [0, 0.1, 1.0],
        'reg_lambda'        : [0, 1.0, 5.0],
        'gamma'             : [0, 0.1, 0.5],
        'scale_pos_weight'  : [SPW * 0.5, SPW, SPW * 1.5, SPW * 2.0],
    },
    'RandomForest': {
        'n_estimators'      : [200, 300, 500],
        'max_depth'         : [None, 10, 20, 30],
        'min_samples_split' : [2, 5, 10],
        'min_samples_leaf'  : [1, 2, 4],
        'max_features'      : ['sqrt', 'log2'],
    },
    'CatBoost': {
        'iterations'          : [200, 300, 500, 700],
        'learning_rate'       : [0.01, 0.03, 0.05, 0.1, 0.2],
        'depth'               : [4, 6, 8],
        'l2_leaf_reg'         : [1, 3, 5, 10],
        'bagging_temperature' : [0, 0.5, 1.0],
    },
    'MLP': {
        'hidden_layer_sizes'  : [(64,), (100,), (128,), (64, 32), (128, 64), (256, 128)],
        'solver'              : ['adam', 'lbfgs'],  # added; lbfgs often better for small/medium datasets
        'learning_rate_init'  : [0.0005, 0.001, 0.01],
        'alpha'               : [0.0001, 0.001, 0.01],
        'activation'          : ['relu', 'tanh'],
        'max_iter'            : [300, 500],
        'early_stopping'      : [True, False],     # added; prevents overfitting on longer runs
    },
    'SVM': {
        'C'      : [0.1, 1, 10, 50, 100],
        'gamma'  : ['scale', 'auto', 0.001, 0.01],  # ignored when kernel='linear', harmless
        'kernel' : ['rbf', 'sigmoid', 'linear'],     # 'linear' added; competitive on tabular data
    },
    'LogisticRegression': {
        'C'       : [0.01, 0.1, 1, 10, 100],
        'penalty' : ['l1', 'l2'],   # l1 added; saga supports both (lbfgs only supports l2)
        'solver'  : ['saga'],       # saga: supports l1+l2; lbfgs removed (only l2, redundant with saga)
    },
    'NaiveBayes': {
        'var_smoothing': [1e-9, 1e-8, 1e-7, 1e-6],
    },
}

# ── Fixed params (data-driven, not part of search) ───────────────
FIXED_PARAMS = {
    'LightGBM'  : {'random_state': SEED, 'verbose': -1, 'n_jobs': -1},
    'XGBoost'   : {'eval_metric': 'logloss',
                   'use_label_encoder': False, 'random_state': SEED, 'n_jobs': -1},
    'RandomForest' : {'class_weight': 'balanced', 'random_state': SEED, 'n_jobs': -1},
    'CatBoost'  : {'auto_class_weights': 'Balanced', 'random_seed': SEED, 'verbose': 0},
    'MLP'       : {'random_state': SEED},
    'SVM'       : {'probability': True, 'class_weight': 'balanced', 'random_state': SEED},
    'LogisticRegression': {'class_weight': 'balanced', 'random_state': SEED, 'n_jobs': -1, 'max_iter': 1000},
    'NaiveBayes': {},
}

# ── Model constructors ────────────────────────────────────────────
MODEL_CLASSES = {
    'LightGBM'          : LGBMClassifier,
    'XGBoost'           : XGBClassifier,
    'RandomForest'      : RandomForestClassifier,
    'CatBoost'          : CatBoostClassifier,
    'MLP'               : MLPClassifier,
    'SVM'               : SVC,
    'LogisticRegression': LogisticRegression,
    'NaiveBayes'        : GaussianNB,
}

# ── Run RandomizedSearchCV for each top-3 model ───────────────────
cv_inner     = StratifiedKFold(n_splits=5, shuffle=True, random_state=SEED)
N_ITER_TUNE  = 200
best_params_tuned = {}

print(f'Tuning top-{TOP_N} models: {top3_models}')
print(f'Method: RandomizedSearchCV  n_iter={N_ITER_TUNE}  cv=StratifiedKFold(3)  scoring=roc_auc')
print('=' * 65)

for name in top3_models:
    if name not in PARAM_GRIDS:
        print(f'\n  [{name}] No param grid — skip tuning, use baseline params.')
        best_params_tuned[name] = {}
        continue

    print(f'\n  [{name}] Searching...')
    base = MODEL_CLASSES[name](**FIXED_PARAMS.get(name, {}))

    rs = RandomizedSearchCV(
        estimator           = base,
        param_distributions = PARAM_GRIDS[name],
        n_iter              = N_ITER_TUNE,
        scoring             = 'roc_auc',
        cv                  = cv_inner,
        n_jobs              = -1,
        random_state        = SEED,
        verbose             = 0,
        refit               = False,
    )

    Xtr_rs = X_train_s if name in ('MLP', 'SVM', 'LogisticRegression', 'NaiveBayes') else X_train.values
    rs.fit(Xtr_rs, y_train)

    best_params_tuned[name] = rs.best_params_
    print(f'  Best CV ROC-AUC : {rs.best_score_:.4f}')
    print(f'  Best params:')
    for k, v in rs.best_params_.items():
        print(f'    {k:<25} = {v}')

print('\n' + '=' * 65)
print('Tuning complete. Proceeding to retrain with best params...')

# ── Checkpoint: lưu best_params_tuned sau khi search xong ────────
_params_path = os.path.join(CKPT_DIR, 'best_params_tuned.json')
with open(_params_path, 'w', encoding='utf-8') as _f:
    json.dump(
        {m: {k: str(v) for k, v in p.items()} for m, p in best_params_tuned.items()},
        _f, indent=2, ensure_ascii=False
    )
print(f'[CKPT] best_params_tuned saved → {_params_path}')
```

```python
# ── Retrain top-3 with tuned params → evaluate on test set ───────
print('Retraining top-3 models with best hyperparameters...')
print('=' * 65)

for name in top3_models:
    # Build tuned model: fixed params + best search params
    all_params = {**FIXED_PARAMS.get(name, {}), **best_params_tuned.get(name, {})}
    tuned_clf = MODEL_CLASSES[name](**all_params)

    Xtr = X_train_s if name in ('MLP', 'SVM', 'LogisticRegression', 'NaiveBayes') else X_train.values
    Xvl = X_val_s   if name in ('MLP', 'SVM', 'LogisticRegression', 'NaiveBayes') else X_val.values
    Xte = X_test_s  if name in ('MLP', 'SVM', 'LogisticRegression', 'NaiveBayes') else X_test.values

    tuned_clf.fit(Xtr, y_train)

    # Threshold on val set
    vp_t = tuned_clf.predict_proba(Xvl)[:, 1]
    thresh_t, _ = find_optimal_threshold(y_val, vp_t, method='recall_floor_max_f1')

    # Evaluate on test set
    tp_t   = tuned_clf.predict_proba(Xte)[:, 1]
    pred_t = (tp_t >= thresh_t).astype(int)

    res_t = {
        'Accuracy'  : round(accuracy_score(y_test, pred_t), 4),
        'Precision_1' : round(precision_score(y_test, pred_t, zero_division=0), 4),
        'Recall_1'    : round(recall_score(y_test, pred_t, zero_division=0), 4),
        'F1_1'        : round(f1_score(y_test, pred_t, zero_division=0), 4),
        'Precision_0' : round(precision_score(y_test, pred_t, pos_label=0, zero_division=0), 4),
        'Recall_0'    : round(recall_score(y_test, pred_t, pos_label=0, zero_division=0), 4),
        'F1_0'        : round(f1_score(y_test, pred_t, pos_label=0, zero_division=0), 4),
        'G-mean'    : round(gmean_score(y_test, pred_t), 4),
        'ROC-AUC'   : round(roc_auc_score(y_test, tp_t), 4),
        'Threshold' : round(thresh_t, 4),
    }

    # ── Print before/after comparison ────────────────────────────
    r_base = results[name]
    f1_delta  = res_t['F1_1'] - r_base['F1_1']
    auc_delta = res_t['ROC-AUC']  - r_base['ROC-AUC']
    print(f'\n  [{name}]')
    print(f'    {"Metric":<12}  {"Baseline":>10}  {"Tuned":>10}  {"Delta":>8}')
    print(f'    {"─"*46}')
    for m in ['F1_1', 'ROC-AUC', 'G-mean', 'Recall_1', 'Precision_1']:
        vb = r_base[m]; vt = res_t[m]; d = vt - vb
        print(f'    {m:<12}  {vb:>10.4f}  {vt:>10.4f}  {d:>+8.4f}')

    # ── Update main dicts with tuned results ──────────────────────
    trained[name]            = tuned_clf
    val_probs[name]          = vp_t
    test_probs[name]         = tp_t
    optimal_thresholds[name] = thresh_t
    results[name]            = res_t
    test_preds[name]         = pred_t

    # ── Checkpoint: lưu tuned model ngay sau khi retrain ──────────
    _ckpt_model = os.path.join(CKPT_DIR, f'{name}_tuned.pkl')
    joblib.dump(tuned_clf, _ckpt_model)
    print(f'  [CKPT] {name} tuned model saved → {_ckpt_model}')

# ── Rebuild results_df with updated tuned results ─────────────────
results_df = pd.DataFrame(results).T

print('\n' + '=' * 65)
print('FINAL RESULTS — All Models (Top-3 tuned, rest baseline)')
print('=' * 65)
display(results_df.style
    .highlight_max(subset=['Accuracy','Precision_1','Recall_1','F1_1','Precision_0','Recall_0','F1_0','G-mean','ROC-AUC'],
                   axis=0, color='#C8E6C9')
    .highlight_min(subset=['Accuracy','Precision_1','Recall_1','F1_1','Precision_0','Recall_0','F1_0','G-mean','ROC-AUC'],
                   axis=0, color='#FFCDD2')
    .format('{:.4f}')
    .set_caption('Final Evaluation — Top-3 tuned | Others baseline (test set)'))

print(f'\nBest model (ROC-AUC): {results_df["ROC-AUC"].idxmax()}')
print('→ Proceed to Section 6.5 to select your final model.')

```

```python
# ── Model Selection — set manually after reviewing Section 6 results ──
# After examining the metrics table and plots above, set your chosen model here.
# Available names: see results_df.index  (e.g. 'LightGBM', 'XGBoost', 'RandomForest', ...)
SELECTED_MODEL_NAME = 'CatBoost'   # ← chosen model name

selected_model_name = SELECTED_MODEL_NAME
selected_model      = trained[selected_model_name]
selected_threshold  = optimal_thresholds[selected_model_name]
selected_tp         = test_probs[selected_model_name]

print('=' * 55)
print('MODEL SELECTION RESULT')
print('=' * 55)
print(f'  Selected model : {selected_model_name}')
print(f'  Criterion      : Manually selected by user')
print(f'  Threshold      : {selected_threshold:.4f} (Recall_floor + max F1 on val; RECALL_MIN={RECALL_MIN})')
print()
print('  Ranking (ROC-AUC):')
ranking = results_df['ROC-AUC'].sort_values(ascending=False)
for rank, (name, score) in enumerate(ranking.items(), 1):
    marker = '  ← SELECTED' if name == selected_model_name else ''
    print(f'    {rank}. {name:<25} {score:.4f}{marker}')
print('=' * 55)

# ── Checkpoint: lưu final selected model + metadata ──────────────
_final_model_path = os.path.join(CKPT_DIR, f'final_model_{selected_model_name}.pkl')
joblib.dump(selected_model, _final_model_path)
_meta = {
    'selected_model_name' : selected_model_name,
    'selected_threshold'  : round(selected_threshold, 6),
    'RECALL_MIN'          : RECALL_MIN,
    'GA_FEATURES'         : GA_FEATURES,
    'N_GA_FEATURES'       : N_GA_FEATURES,
    'best_params_tuned'   : {k: str(v) for k, v in best_params_tuned.get(selected_model_name, {}).items()},
    'test_metrics'        : results[selected_model_name],
}
_meta_path = os.path.join(CKPT_DIR, 'final_model_metadata.json')
with open(_meta_path, 'w', encoding='utf-8') as _f:
    json.dump(_meta, _f, indent=2, ensure_ascii=False)
print(f'[CKPT] Final model saved    → {_final_model_path}')
print(f'[CKPT] Model metadata saved → {_meta_path}')

# ── Fixed 0.5 vs Optimal threshold comparison (selected model) ───
metrics_compare = {}
for thresh, label in [(0.5, 'Fixed (0.5)'),
                      (selected_threshold, f'Optimal ({selected_threshold:.2f})')]:
    pred = (selected_tp >= thresh).astype(int)
    metrics_compare[label] = {
        'Precision_1': precision_score(y_test, pred, zero_division=0),
        'Recall_1'   : recall_score(y_test, pred, zero_division=0),
        'F1_1'       : f1_score(y_test, pred, zero_division=0),
        'Precision_0': precision_score(y_test, pred, pos_label=0, zero_division=0),
        'Recall_0'   : recall_score(y_test, pred, pos_label=0, zero_division=0),
        'F1_0'       : f1_score(y_test, pred, pos_label=0, zero_division=0),
        'G-mean'   : gmean_score(y_test, pred),
    }

mc_df = pd.DataFrame(metrics_compare).T

# ── Recall_1 / Precision_1 vs threshold (selected model, validation) ──
_ts_s = np.linspace(0, 1, THRESH_GRID_N)
_, rec_s, prec_s, f1_s, _ = compute_threshold_curve_metrics(
    y_val, val_probs[selected_model_name], _ts_s)

fig, axes = plt.subplots(1, 2, figsize=(14, 5))

axes[0].plot(_ts_s, rec_s, color='#1976D2', lw=2, label='Recall_1')
axes[0].plot(_ts_s, prec_s, color='#2E7D32', lw=2, label='Precision_1')
axes[0].axhline(RECALL_MIN, color='gray', lw=1.2, linestyle=':', label=f'RECALL_MIN={RECALL_MIN}')
axes[0].axvline(selected_threshold, color='#E53935', lw=2, linestyle='--',
                label=f'Chosen t = {selected_threshold:.3f}')
axes[0].set_xlabel('Threshold', fontsize=12)
axes[0].set_ylabel('Score', fontsize=12)
axes[0].set_title(f'Recall_1 & Precision_1 vs threshold\n({selected_model_name} — validation)',
                  fontweight='bold', fontsize=12)
axes[0].legend(fontsize=10)
axes[0].grid(True, alpha=0.3)
axes[0].set_xlim(0, 1)
axes[0].set_ylim(0, 1.05)

x_pos = np.arange(len(mc_df.columns))
width = 0.32
for i, (label, row) in enumerate(mc_df.iterrows()):
    axes[1].bar(x_pos + i*width, row.values, width, label=label,
                color=['#1976D2','#E53935'][i], edgecolor='black', alpha=0.85)
    for j, v in enumerate(row.values):
        axes[1].text(x_pos[j] + i*width, v + 0.005, f'{v:.3f}',
                     ha='center', fontsize=9)

axes[1].set_xticks(x_pos + width/2)
axes[1].set_xticklabels(mc_df.columns, fontsize=11)
axes[1].set_ylim(0, 1.1)
axes[1].set_title(f'Fixed (0.5) vs chosen threshold\n({selected_model_name} — test set)',
                  fontweight='bold', fontsize=12)
axes[1].legend(fontsize=11)
axes[1].grid(axis='y', alpha=0.3)

plt.tight_layout()
plt.savefig('plots/05_threshold_selected_model.png', dpi=150, bbox_inches='tight')
plt.show()

print(f'\nFixed vs Optimal threshold comparison ({selected_model_name}, test set):')
display(mc_df.style.format('{:.4f}').highlight_max(axis=0, color='#C8E6C9'))

```

```python
    # ── 7. SHAP TreeExplainer — Final Model (GA-selected features) ─────────
    # SHAP is computed on X_test using final_model (the model retrained on GA_FEATURES).
    # All feature-selection decisions are already made; this section is REPORTING ONLY.
    print(f'Applying SHAP to final model: {selected_model_name} ({N_GA_FEATURES} GA-selected features)')
    print(f'Features ({N_GA_FEATURES}): {GA_FEATURES}')

    explainer   = shap.TreeExplainer(selected_model)
    N_SHAP      = min(800, len(X_test))
    X_shap      = X_test[GA_FEATURES].iloc[:N_SHAP]   # DataFrame with column names
    sv_raw      = explainer.shap_values(X_shap)

    # For binary classification TreeExplainer returns list[2] or array
    sv = sv_raw[1] if isinstance(sv_raw, list) else sv_raw

    # SHAP_FEATURE_NAMES: columns of the final model (used by all Section-7 cells)
    SHAP_FEATURE_NAMES = GA_FEATURES

    ev = explainer.expected_value
    if isinstance(ev, (list, np.ndarray)): ev = ev[1]
    print(f'SHAP values shape: {sv.shape}')
    print(f'Expected value:    {ev:.4f}')

```

```python
# ── 7.1 SHAP Beeswarm Summary ────────────────────────────────────
plt.figure(figsize=(11, 8))
shap.summary_plot(sv, X_shap, plot_type='dot',
                  max_display=15, show=False)
plt.title(f'SHAP Beeswarm — {selected_model_name} (Default class)',
          fontsize=13, fontweight='bold')
plt.tight_layout()
plt.savefig('plots/09_shap_beeswarm.png', dpi=150, bbox_inches='tight')
plt.show()
```

```python
# ── 7.2 SHAP Global Bar — Top-15 features ────────────────────────
mean_abs   = np.abs(sv).mean(axis=0)
feat_imp   = pd.Series(mean_abs, index=SHAP_FEATURE_NAMES).nlargest(15).sort_values()

fig, ax = plt.subplots(figsize=(10, 7))
feat_imp.plot(kind='barh', ax=ax,
              color=plt.cm.RdYlGn_r(np.linspace(0.15, 0.85, 15)),
              edgecolor='black', alpha=0.88)
ax.set_title(f'Global SHAP Feature Importance — {selected_model_name} (top-{N_GA_FEATURES} features)',
             fontsize=13, fontweight='bold')
ax.set_xlabel('Mean |SHAP value|', fontsize=12)
ax.grid(axis='x', alpha=0.3)
plt.tight_layout()
plt.savefig('plots/10_shap_bar.png', dpi=150, bbox_inches='tight')
plt.show()

print('Top 10 features by SHAP:')
for rank, (f, v) in enumerate(feat_imp.sort_values(ascending=False).head(10).items(), 1):
    print(f'  {rank:2d}. {f:<40} {v:.5f}')
```

```python
# ── 7.3 SHAP Dependence Plots (feature interaction) ──────────────
# Top-2 features × their most interactive partner
top2 = feat_imp.sort_values(ascending=False).head(2).index.tolist()

fig, axes = plt.subplots(1, 2, figsize=(14, 5))
for ax, feat in zip(axes, top2):
    plt.sca(ax)
    shap.dependence_plot(
        feat, sv, X_shap,
        interaction_index='auto',   # auto-selects most interactive feature
        ax=ax, show=False
    )
    ax.set_title(f'SHAP Dependence: {feat}', fontweight='bold', fontsize=11)

plt.suptitle('SHAP Dependence Plots — Top Features with Interactions',
             fontsize=13, fontweight='bold')
plt.tight_layout()
plt.savefig('plots/11_shap_dependence.png', dpi=150, bbox_inches='tight')
plt.show()
```

```python
# ── 7.4 SHAP Waterfall Plots — Individual predictions ─────────────
# (clearer than force plots for single applicants)

# Use probabilities from the SAME model used by SHAP explainer (final_model)
X_test_ga_wf = X_test[GA_FEATURES].iloc[:N_SHAP]
final_test_probs = selected_model.predict_proba(X_test_ga_wf.values)[:, 1]
sorted_by_risk = np.argsort(final_test_probs)[::-1]
high_idx = sorted_by_risk[0]
low_idx  = sorted_by_risk[-1]
mid_idx  = sorted_by_risk[len(sorted_by_risk)//2]

ev_wf = explainer.expected_value
if isinstance(ev_wf, (list, np.ndarray)): ev_wf = ev_wf[1]

def plot_waterfall(idx, label):
    prob = final_test_probs[idx]
    exp_obj = shap.Explanation(
        values        = sv[idx],
        base_values   = ev_wf,
        data          = X_shap.values[idx],
        feature_names = SHAP_FEATURE_NAMES
    )
    plt.figure(figsize=(12, 6))
    shap.waterfall_plot(exp_obj, max_display=12, show=False)
    plt.title(f'SHAP Waterfall — {label} (P_default={prob:.3f})',
              fontsize=12, fontweight='bold')
    plt.tight_layout()
    fname = f'plots/12_shap_waterfall_{label.lower().replace(" ","_")}.png'
    plt.savefig(fname, dpi=150, bbox_inches='tight')
    plt.show()
    print(f'  Saved: {fname}')

for idx, lbl in [(high_idx,'High-Risk'), (mid_idx,'Medium-Risk'), (low_idx,'Low-Risk')]:
    plot_waterfall(idx, lbl)
```

```python
# ── 7.5 SHAP Interaction Values (pairwise feature interactions) ───
# Computationally heavy — sample 200 rows
N_INTERACT = min(200, len(X_shap))
X_interact  = X_shap.iloc[:N_INTERACT]

print('Computing SHAP interaction values...')
shap_interact = explainer.shap_interaction_values(X_interact)
if isinstance(shap_interact, list):
    shap_interact = shap_interact[1]

# Mean absolute interaction matrix
interact_mean = np.abs(shap_interact).mean(axis=0)
interact_df   = pd.DataFrame(interact_mean,
                              index=SHAP_FEATURE_NAMES, columns=SHAP_FEATURE_NAMES)

# Plot top-15 × top-15 interaction heatmap
top15_feats  = feat_imp.sort_values(ascending=False).head(min(15, len(SHAP_FEATURE_NAMES))).index.tolist()
interact_top = interact_df.loc[top15_feats, top15_feats]

fig, ax = plt.subplots(figsize=(13, 11))
mask = np.eye(len(top15_feats), dtype=bool)
sns.heatmap(interact_top, mask=mask, annot=True, fmt='.3f',
            cmap='YlOrRd', ax=ax, annot_kws={'size': 8},
            linewidths=0.5, square=True)
ax.set_title('SHAP Interaction Values — Top Features\n'
             '(mean absolute pairwise interactions)',
             fontsize=13, fontweight='bold')
plt.tight_layout()
plt.savefig('plots/13_shap_interaction.png', dpi=150, bbox_inches='tight')
plt.show()

# Top-5 strongest pairwise interactions
upper_tri = interact_top.where(np.triu(np.ones(interact_top.shape), k=1).astype(bool))
pairs = upper_tri.stack().nlargest(5)
print('\nTop-5 feature interactions:')
for (f1, f2), val in pairs.items():
    print(f'  {f1}  x  {f2}:  {val:.4f}')
```

```python
# ── D1 — SHAP Contribution Breakdown: Engineered vs Original ─────
# Uses the final model's feature set (SHAP_FEATURE_NAMES = GA_FEATURES).
ENGINEERED_FEATURES = [
    'loan_grade_encoded', 'historical_default_flag',
    'loan_to_income_ratio', 'age_income_interaction',
    'percent_income_loan', 'annual_interest_cost',
    'interest_to_income', 'employment_age_ratio',
    'high_loan_pct_flag', 'high_grade_flag',
    'high_interest_flag', 'grade_x_int_rate',
]

# Filter to features actually present in the final model's feature set
eng_in_model  = [f for f in ENGINEERED_FEATURES if f in SHAP_FEATURE_NAMES]
orig_in_model = [f for f in SHAP_FEATURE_NAMES  if f not in eng_in_model]

# SHAP column indices (based on SHAP_FEATURE_NAMES ordering)
eng_idx  = [SHAP_FEATURE_NAMES.index(f) for f in eng_in_model]
orig_idx = [SHAP_FEATURE_NAMES.index(f) for f in orig_in_model]

# Mean |SHAP| summed per group
eng_shap_sum  = np.abs(sv)[:, eng_idx].mean(axis=0).sum()
orig_shap_sum = np.abs(sv)[:, orig_idx].mean(axis=0).sum()
total_shap    = eng_shap_sum + orig_shap_sum
eng_pct       = eng_shap_sum  / total_shap * 100
orig_pct      = orig_shap_sum / total_shap * 100

print(f'Feature groups (final model, top-{N_GA_FEATURES} features):')
print(f'  Original   features : {len(orig_in_model):3d}')
print(f'  Engineered features : {len(eng_in_model):3d}')
print(f'\nSHAP Contribution by Group:')
print(f'  Original   : {orig_shap_sum:.4f}  ({orig_pct:.1f}%)')
print(f'  Engineered : {eng_shap_sum:.4f}  ({eng_pct:.1f}%)')

fig, axes = plt.subplots(1, 2, figsize=(15, 6))

# ── Left: Pie chart group contribution ────────────────────────────
axes[0].pie(
    [orig_shap_sum, eng_shap_sum],
    labels=[f'Original\n({len(orig_in_model)} features)',
            f'Engineered\n({len(eng_in_model)} features)'],
    colors=['#1976D2', '#E53935'],
    autopct='%1.1f%%', startangle=90,
    explode=(0, 0.06), shadow=True,
    textprops={'fontsize': 12}
)
axes[0].set_title('D1 — SHAP Contribution Share\nEngineered vs Original Features',
                  fontweight='bold', fontsize=12)

# ── Right: Per-feature bar for engineered features ─────────────────
eng_imp = pd.Series(
    np.abs(sv)[:, eng_idx].mean(axis=0),
    index=eng_in_model
).sort_values(ascending=True)

bars = axes[1].barh(
    eng_imp.index, eng_imp.values,
    color=plt.cm.RdYlGn_r(np.linspace(0.15, 0.85, len(eng_imp))),
    edgecolor='black', alpha=0.85
)
for bar, v in zip(bars, eng_imp.values):
    axes[1].text(bar.get_width() + 0.0002, bar.get_y() + bar.get_height()/2,
                 f'{v:.4f}', va='center', fontsize=9)
axes[1].set_title('D1 — Mean |SHAP| per Engineered Feature',
                  fontweight='bold', fontsize=12)
axes[1].set_xlabel('Mean |SHAP value|', fontsize=11)
axes[1].grid(axis='x', alpha=0.3)

plt.suptitle(f'D1 — Engineered Feature SHAP Contribution Analysis\n(Model: {selected_model_name})',
             fontsize=13, fontweight='bold')
plt.tight_layout()
plt.savefig('plots/D1_engineered_vs_original_shap_contribution.png', dpi=150, bbox_inches='tight')
plt.show()
```

```python
# ── D2 — SHAP Global Bar colored by Feature Type ─────────────────
from matplotlib.patches import Patch

mean_abs_all = np.abs(sv).mean(axis=0)
feat_imp_all = pd.Series(mean_abs_all, index=SHAP_FEATURE_NAMES).nlargest(20).sort_values()

colors_d2 = [
    '#E53935' if f in eng_in_model else '#1976D2'
    for f in feat_imp_all.index
]

fig, ax = plt.subplots(figsize=(12, 9))
bars = ax.barh(feat_imp_all.index, feat_imp_all.values,
               color=colors_d2, edgecolor='black', alpha=0.88)
for bar, v in zip(bars, feat_imp_all.values):
    ax.text(bar.get_width() + 0.0002, bar.get_y() + bar.get_height()/2,
            f'{v:.4f}', va='center', fontsize=8.5)

legend_elements = [
    Patch(facecolor='#E53935', edgecolor='black',
          label=f'Engineered feature  ({eng_pct:.1f}% of total SHAP)'),
    Patch(facecolor='#1976D2', edgecolor='black',
          label=f'Original feature    ({orig_pct:.1f}% of total SHAP)'),
]
ax.legend(handles=legend_elements, fontsize=11, loc='lower right')
ax.set_title(f'D2 — Global SHAP Importance by Feature Type\n({selected_model_name}, Top 20)',
             fontsize=13, fontweight='bold')
ax.set_xlabel('Mean |SHAP value|', fontsize=12)
ax.grid(axis='x', alpha=0.3)
plt.tight_layout()
plt.savefig('plots/D2_shap_bar_colored_by_feature_type.png', dpi=150, bbox_inches='tight')
plt.show()

# ── Summary table ─────────────────────────────────────────────────
print(f'\nTop-20 SHAP ranking with feature type:')
print(f'{"Rank":<5} {"Type":<8} {"Feature":<40} {"Mean|SHAP|":>10}')
print('-' * 68)
for rank, (f, v) in enumerate(feat_imp_all.sort_values(ascending=False).items(), 1):
    tag = '[ENG]' if f in eng_in_model else '[ORG]'
    print(f'{rank:<5} {tag:<8} {f:<40} {v:>10.5f}')

eng_in_top10 = [f for f in feat_imp_all.sort_values(ascending=False).head(10).index
                if f in eng_in_model]
print(f'\nEngineered features in Top-10: {len(eng_in_top10)} → {eng_in_top10}')
```

```python
# ── Visual comparison: Phase 0 (full features) vs Final (GA-selected, tuned) ──
# Phase 0 : GA_SEED_MODEL, default params, full feature pool, threshold = 0.5
# Final   : selected_model, tuned hyperparams, GA_FEATURES, optimal threshold
metrics_sel  = ["Precision_1","Recall_1","F1_1","G-mean","ROC-AUC"]
phase0_vals  = [quick_test_results[m] for m in metrics_sel]
final_vals   = [results[selected_model_name][m] for m in metrics_sel]

x_s = np.arange(len(metrics_sel))
w_s = 0.32
fig, ax = plt.subplots(figsize=(11, 5))
ax.bar(x_s - w_s/2, phase0_vals, w_s,
       label=f"Phase 0: {GA_SEED_MODEL_NAME} ({n_feats} ft, default, t=0.5)",
       color="#78909C", edgecolor="black", alpha=0.85)
ax.bar(x_s + w_s/2, final_vals, w_s,
       label=f"Final: {selected_model_name} ({N_GA_FEATURES} GA ft, tuned)",
       color="#E53935", edgecolor="black", alpha=0.85)

for xi, (pv, fv) in zip(x_s, zip(phase0_vals, final_vals)):
    ax.text(xi - w_s/2, pv + 0.004, f"{pv:.3f}", ha="center", fontsize=9, color="#37474F")
    ax.text(xi + w_s/2, fv + 0.004, f"{fv:.3f}", ha="center", fontsize=9, fontweight="bold")

ax.set_xticks(x_s); ax.set_xticklabels(metrics_sel, fontsize=12)
ax.set_ylim(0.6, 1.08)
ax.set_ylabel("Score", fontsize=12)
ax.set_title(
    f"Phase 0 ({n_feats} features, default) vs Final ({N_GA_FEATURES} GA-selected, tuned)\n"
    "Combined effect of GA Feature Selection + Hyperparameter Tuning",
    fontsize=12, fontweight="bold")
ax.legend(fontsize=10)
ax.grid(axis="y", alpha=0.3)
plt.tight_layout()
plt.savefig("plots/14_phase0_vs_final_comparison.png", dpi=150, bbox_inches="tight")
plt.show()
```

```python
import copy

# ── D3 — Retrain on original-only features ────────────────────────
# orig_in_model and eng_in_model defined in D1 cell (Section 7.6)
print(f'Ablation setup:')
print(f'  Full feature set   : {len(FEATURE_NAMES)} features')
print(f'  Original-only set  : {len(orig_in_model)} features (removing {len(eng_in_model)} engineered)')
print(f'  Removed features   : {eng_in_model}')
print(f'\nTraining {selected_model_name} on original-only features...')

X_train_orig = X_train[orig_in_model]
X_val_orig   = X_val[orig_in_model]
X_test_orig  = X_test[orig_in_model]

model_orig = copy.deepcopy(selected_model)
model_orig.fit(X_train_orig.values, y_train)

# Threshold: recall floor + max F1 on val set
vp_orig    = model_orig.predict_proba(X_val_orig.values)[:, 1]
thresh_orig, _ = find_optimal_threshold(y_val, vp_orig, method='recall_floor_max_f1')

# Evaluate on test set
tp_orig   = model_orig.predict_proba(X_test_orig.values)[:, 1]
pred_orig = (tp_orig >= thresh_orig).astype(int)

res_orig = {
    'Accuracy'  : accuracy_score(y_test, pred_orig),
    'Precision_1' : precision_score(y_test, pred_orig, zero_division=0),
    'Recall_1'    : recall_score(y_test, pred_orig, zero_division=0),
    'F1_1'        : f1_score(y_test, pred_orig, zero_division=0),
    'Precision_0' : precision_score(y_test, pred_orig, pos_label=0, zero_division=0),
    'Recall_0'    : recall_score(y_test, pred_orig, pos_label=0, zero_division=0),
    'F1_0'        : f1_score(y_test, pred_orig, pos_label=0, zero_division=0),
    'G-mean'    : gmean_score(y_test, pred_orig),
    'ROC-AUC'   : roc_auc_score(y_test, tp_orig),
}

# ── Comparison table ──────────────────────────────────────────────
metrics_abl = ['Accuracy', 'Precision_1', 'Recall_1', 'F1_1', 'Precision_0', 'Recall_0', 'F1_0', 'G-mean', 'ROC-AUC']
print(f'\n{"Metric":<12}  {"Full features":>15}  {"Original only":>15}  {"Delta":>9}  {"Impact"}')
print('─' * 72)
ablation_rows = []
for m in metrics_abl:
    v_full = results[selected_model_name][m]
    v_orig = res_orig[m]
    delta  = v_full - v_orig
    sign   = '+' if delta >= 0 else ''
    impact = '▲ better' if delta > 0.002 else ('▼ worse' if delta < -0.002 else '≈ same')
    print(f'{m:<12}  {v_full:>15.4f}  {v_orig:>15.4f}  {sign}{delta:>8.4f}  {impact}')
    ablation_rows.append({
        'Metric': m,
        'Full Features': round(v_full, 4),
        'Original Only': round(v_orig, 4),
        'Delta': round(delta, 4),
        'Delta_%': round(delta / (v_orig + 1e-9) * 100, 2),
    })

ablation_df = pd.DataFrame(ablation_rows).set_index('Metric')
ablation_df.to_csv('reports/D3_ablation_results.csv')
print(f'\nSaved: reports/D3_ablation_results.csv')

# ── Visualisation ─────────────────────────────────────────────────
x_a = np.arange(len(metrics_abl))
w_a = 0.32
fig, axes = plt.subplots(1, 2, figsize=(16, 5))

# Left: grouped bar chart
b1 = axes[0].bar(x_a - w_a/2,
                 [results[selected_model_name][m] for m in metrics_abl],
                 w_a, label=f'Full ({len(FEATURE_NAMES)} feat)',
                 color='#1976D2', edgecolor='black', alpha=0.85)
b2 = axes[0].bar(x_a + w_a/2,
                 [res_orig[m] for m in metrics_abl],
                 w_a, label=f'Original only ({len(orig_in_model)} feat)',
                 color='#FF8F00', edgecolor='black', alpha=0.85)

for bar, v in zip(b1, [results[selected_model_name][m] for m in metrics_abl]):
    axes[0].text(bar.get_x()+bar.get_width()/2, bar.get_height()+0.004,
                 f'{v:.3f}', ha='center', fontsize=8.5, fontweight='bold')
for bar, v in zip(b2, [res_orig[m] for m in metrics_abl]):
    axes[0].text(bar.get_x()+bar.get_width()/2, bar.get_height()+0.004,
                 f'{v:.3f}', ha='center', fontsize=8.5)

axes[0].set_xticks(x_a)
axes[0].set_xticklabels(metrics_abl, fontsize=11)
axes[0].set_ylim(0.5, 1.12)
axes[0].set_ylabel('Score', fontsize=12)
axes[0].set_title(f'D3 — Ablation: Full vs Original-Only Features\n({selected_model_name})',
                  fontsize=12, fontweight='bold')
axes[0].legend(fontsize=10)
axes[0].grid(axis='y', alpha=0.3)

# Right: delta bar chart
deltas = [results[selected_model_name][m] - res_orig[m] for m in metrics_abl]
delta_colors = ['#2E7D32' if d > 0 else '#C62828' for d in deltas]
axes[1].bar(metrics_abl, deltas, color=delta_colors, edgecolor='black', alpha=0.85)
axes[1].axhline(0, color='black', lw=1.2, linestyle='--')
for i, (m, d) in enumerate(zip(metrics_abl, deltas)):
    axes[1].text(i, d + (0.0005 if d >= 0 else -0.001),
                 f'{d:+.4f}', ha='center', fontsize=9, fontweight='bold',
                 color='#2E7D32' if d > 0 else '#C62828')
axes[1].set_ylabel('Δ Score (Full − Original)', fontsize=12)
axes[1].set_title('D3 — Performance Delta\n(positive = engineered features help)',
                  fontsize=12, fontweight='bold')
axes[1].grid(axis='y', alpha=0.3)

plt.tight_layout()
plt.savefig('plots/D3_ablation_with_vs_without_engineering.png', dpi=150, bbox_inches='tight')
plt.show()

# ── Conclusion ────────────────────────────────────────────────────
f1_delta  = results[selected_model_name]['F1_1'] - res_orig['F1_1']
auc_delta = results[selected_model_name]['ROC-AUC']  - res_orig['ROC-AUC']
gm_delta  = results[selected_model_name]['G-mean']   - res_orig['G-mean']

print(f'\n{"="*55}')
print('D3 — ABLATION CONCLUSION')
print(f'{"="*55}')
print(f'  F1_1 delta : {f1_delta:+.4f}  '
      f'({"Engineered features IMPROVE model ✓" if f1_delta > 0.001 else "No significant improvement" if abs(f1_delta) <= 0.001 else "Engineered features HURT model ✗"})')
print(f'  ROC-AUC delta  : {auc_delta:+.4f}  '
      f'({"Engineered features IMPROVE model ✓" if auc_delta > 0.001 else "No significant improvement" if abs(auc_delta) <= 0.001 else "Engineered features HURT model ✗"})')
print(f'  G-mean delta   : {gm_delta:+.4f}  '
      f'({"Engineered features IMPROVE model ✓" if gm_delta > 0.001 else "No significant improvement" if abs(gm_delta) <= 0.001 else "Engineered features HURT model ✗"})')
print(f'  Engineered features added : {len(eng_in_model)}')
print(f'  Original features kept    : {len(orig_in_model)}')

display(ablation_df.style
        .format('{:.4f}', subset=['Full Features','Original Only','Delta'])
        .format('{:.2f}%', subset=['Delta_%'])
        .applymap(lambda v: 'color: green; font-weight:bold' if v > 0 else
                  ('color: red' if v < -0.001 else ''), subset=['Delta'])
        .set_caption(f'D3 Ablation — {selected_model_name}'))
```

```python
# ── LIME setup ────────────────────────────────────────────────────
# Uses final_model (final model on GA_FEATURES) to keep LIME consistent
# with the SHAP analysis in Section 7.
lime_explainer = lime.lime_tabular.LimeTabularExplainer(
    training_data  = X_train[GA_FEATURES].values,
    feature_names  = SHAP_FEATURE_NAMES,
    class_names    = ['Non-Default', 'Default'],
    mode           = 'classification',
    random_state   = SEED
)

def predict_fn(X_arr):
    # final_model: final model trained on GA_FEATURES (GA, Section 8)
    return selected_model.predict_proba(X_arr)

print(f'LIME explainer initialised for: {selected_model_name} (top-{N_GA_FEATURES} features)')
print(f'Training data shape: {X_train[GA_FEATURES].shape}')
```

```python
# ── LIME for high / medium / low risk applicants ──────────────────
# tp_ga: test probabilities from final_model on X_test[GA_FEATURES]
X_test[GA_FEATURES] = X_test[GA_FEATURES]   # DataFrame, shape (n_test, K)

cases = {
    'High-Risk'   : int(np.argmax(selected_tp)),
    'Medium-Risk' : int(np.argsort(np.abs(selected_tp - 0.5))[0]),
    'Low-Risk'    : int(np.argmin(selected_tp)),
}

for label, idx in cases.items():
    prob = selected_tp[idx]
    print(f'\n── {label} applicant (P_default={prob:.4f}) ──')

    exp = lime_explainer.explain_instance(
        data_row   = X_test[GA_FEATURES].values[idx],
        predict_fn = predict_fn,
        num_features = min(12, len(SHAP_FEATURE_NAMES)),
        top_labels   = 2
    )

    fig = exp.as_pyplot_figure(label=1)
    fig.set_size_inches(12, 6)
    plt.title(f'LIME Feature Importance — {label}\n'
              f'P_default={prob:.3f}  |  '
              f'Green = reduces risk  |  Red = increases risk',
              fontsize=11, fontweight='bold')
    plt.tight_layout()
    fname = f'plots/15_lime_{label.lower().replace("-","_")}.png'
    plt.savefig(fname, dpi=150, bbox_inches='tight')
    plt.show()
    print(f'  Saved: {fname}')
```

```python
# ── LIME + SHAP agreement check (Explanation Agreement Score) ─────
# For each case, compare top-5 features from SHAP vs LIME.
# Both use final_model on X_test[GA_FEATURES] for consistency.
print('SHAP vs LIME Agreement Analysis')
print('=' * 55)

X_test[GA_FEATURES] = X_test[GA_FEATURES]   # already defined in cell 43, redefined for safety

for label, idx in cases.items():
    # SHAP top-5 on-demand (not limited by N_SHAP batch)
    shap_one_raw = explainer.shap_values(X_test[GA_FEATURES].iloc[[idx]])
    shap_one = shap_one_raw[1] if isinstance(shap_one_raw, list) else shap_one_raw
    shap_rank = (pd.Series(np.abs(shap_one[0]), index=SHAP_FEATURE_NAMES)
                 .nlargest(5).index.tolist())

    # LIME top-5 (Default class = label 1)
    exp = lime_explainer.explain_instance(
        data_row   = X_test[GA_FEATURES].values[idx],
        predict_fn = predict_fn,
        num_features = 5,
        top_labels   = 2
    )
    lime_rank = [f for f, _ in exp.as_list(label=1)]

    # Strip LIME inequality strings (e.g. "loan_int_rate > 11.0" → "loan_int_rate")
    lime_feats = []
    for r in lime_rank:
        for fname in SHAP_FEATURE_NAMES:
            if fname in r:
                lime_feats.append(fname)
                break

    agreement = len(set(shap_rank) & set(lime_feats[:5]))
    eas = agreement / 5   # Explanation Agreement Score

    print(f'\n{label}:')
    print(f'  SHAP top-5 : {shap_rank}')
    print(f'  LIME top-5 : {lime_feats[:5]}')
    print(f'  Agreement  : {agreement}/5    EAS = {eas:.2f}')
    if eas < 0.4:
        print('  ⚠  Low agreement — borderline case, recommend human review')
```

```python
print('=' * 65)
print('LIGHTGBM CREDIT RISK — FINAL SUMMARY  (v3_8 GA-first pipeline)')
print('Based on: Li et al. (Elsevier, 2025)')
print('=' * 65)
print(f'Dataset  : Credit Risk Dataset (Kaggle — laotse)')
print(f'Samples  : {len(df):,}')
print(f'Split    : 80 / 10 / 10  (train / val / test)')
print(f'Features : {n_feats} (full pool)  →  {N_GA_FEATURES} GA-selected (Sec 8)')
print(f'Imbalance: scale_pos_weight = {SPW:.2f}  (no SMOTE)')
print(f'Pipeline : Phase0({GA_SEED_MODEL_NAME}) → GA → Bridge → Baseline → Tune')

print('\n─── All Baseline Models on GA_FEATURES (Recall_floor + max F1, val-tuned) ───')
display(results_df[['Accuracy','Precision_1','Recall_1','F1_1',
                     'Precision_0','Recall_0','F1_0','G-mean','ROC-AUC']]
        .sort_values('F1_1', ascending=False)
        .style.highlight_max(axis=0, color='#C8E6C9').format('{:.4f}'))

print(f'\n─── Improvement: Phase 0 (full features, default) → Final ({selected_model_name}, GA-selected, tuned) ───')
print(f'    Phase 0 : {GA_SEED_MODEL_NAME} | {n_feats} features | default params | t=0.5')
print(f'    Final   : {selected_model_name} | {N_GA_FEATURES} GA-selected features | tuned | optimal t')
print(f'  {"Metric":<12}  {"Phase 0":>10}  {"Final (tuned)":>14}  {"Δ":>8}')
print('  ' + '─' * 50)
for m in ['Precision_1','Recall_1','F1_1','G-mean','ROC-AUC']:
    v_phase0 = quick_test_results[m]
    v_final  = results[selected_model_name][m]
    arrow = '▲' if v_final > v_phase0 else ('▼' if v_final < v_phase0 else '=')
    print(f'  {m:<12}  {v_phase0:>10.4f}  {v_final:>14.4f}  {arrow}{abs(v_final-v_phase0):.4f}')

print('\n─── Output files ───')
for f in sorted(os.listdir('plots')):
    print(f'  plots/{f}')
print('\n' + '=' * 65)
```

```python
import os

# Sử dụng đường dẫn chính xác từ Section 2.6/6.5
ACTUAL_CKPT_DIR = '/content/drive/MyDrive/checkpoints/kltn_v3_8_2'

print(f"Kiểm tra thư mục: {ACTUAL_CKPT_DIR}")
if os.path.exists(ACTUAL_CKPT_DIR):
    files = os.listdir(ACTUAL_CKPT_DIR)

    # Các file quan trọng cho Backend
    models = [f for f in files if f.endswith('.pkl')]
    metadata = [f for f in files if f.endswith('.json')]

    print(f"\n[MÔ HÌNH - .pkl]: Found {len(models)}")
    for f in models: print(f"  - {f}")

    print(f"\n[METADATA - .json]: Found {len(metadata)}")
    for f in metadata: print(f"  - {f}")

    if 'final_model_CatBoost.pkl' in models and 'final_model_metadata.json' in metadata:
        print("\n✅ CÁC FILE QUAN TRỌNG ĐÃ SẴN SÀNG CHO BACKEND!")
    else:
        print("\n⚠️ Thiếu một số file quan trọng (final_model hoặc metadata).")
else:
    print(f"❌ Thư mục {ACTUAL_CKPT_DIR} không tồn tại. Vui lòng kiểm tra lại Google Drive.")
```

```python
import joblib
import os
import json

# Sử dụng biến CKPT_DIR đã được định nghĩa ở trên
metadata_path = os.path.join(CKPT_DIR, 'final_model_metadata.json')
model_path = os.path.join(CKPT_DIR, 'final_model_CatBoost.pkl')

print(f'--- Kiểm tra file: {model_path} ---')
if os.path.exists(model_path):
    model_obj = joblib.load(model_path)
    print(f'Type of saved model: {type(model_obj)}')
    # Kiểm tra xem có thuộc tính liên quan đến explainer được đính kèm không
    has_explainer = hasattr(model_obj, 'explainer')
    print(f'Model object has internal explainer: {has_explainer}')
else:
    print('❌ Không tìm thấy file model.')

print(f'\n--- Kiểm tra metadata: {metadata_path} ---')
if os.path.exists(metadata_path):
    with open(metadata_path, 'r') as f:
        meta = json.load(f)
    print('Metadata keys:', list(meta.keys()))
    if 'GA_FEATURES' in meta:
        print('✅ Metadata chứa GA_FEATURES (cần thiết để tái tạo SHAP/LIME)')
    if 'selected_threshold' in meta:
        print('✅ Metadata chứa Threshold: ', meta['selected_threshold'])
else:
    print('❌ Không tìm thấy file metadata.')

print('\nLưu ý: Trong quy trình hiện tại, SHAP Explainer thường được khởi tạo từ model object khi cần dùng (on-the-fly) chứ không lưu trực tiếp vào file .pkl. Backend chỉ cần model và danh sách GA_FEATURES trong metadata là có thể tạo lại Explainer bất cứ lúc nào.')
```