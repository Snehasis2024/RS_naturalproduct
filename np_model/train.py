"""Train a natural-product property model from a CSV of SMILES + target.

Example:
    python -m np_model.train --data data/example_natural_products.csv \
        --target compound_class --out models/np_class.joblib
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor
from sklearn.metrics import (accuracy_score, balanced_accuracy_score, f1_score,
                             mean_absolute_error, r2_score, root_mean_squared_error)
from sklearn.model_selection import GroupKFold, KFold, StratifiedKFold

from .features import featurize, feature_names, murcko_scaffold, parse_smiles


def infer_task(y: pd.Series) -> str:
    if not pd.api.types.is_numeric_dtype(y) or y.nunique() <= 10:
        return "classification"
    return "regression"


def build_model(task, n_estimators, seed):
    if task == "classification":
        return RandomForestClassifier(n_estimators=n_estimators, class_weight="balanced",
                                      n_jobs=-1, random_state=seed)
    return RandomForestRegressor(n_estimators=n_estimators, n_jobs=-1, random_state=seed)


def score(task, y_true, y_pred):
    if task == "classification":
        return {
            "accuracy": accuracy_score(y_true, y_pred),
            "balanced_accuracy": balanced_accuracy_score(y_true, y_pred),
            "macro_f1": f1_score(y_true, y_pred, average="macro"),
        }
    return {
        "r2": r2_score(y_true, y_pred),
        "rmse": root_mean_squared_error(y_true, y_pred),
        "mae": mean_absolute_error(y_true, y_pred),
    }


def cross_validate(X, y, task, split, groups, folds, n_estimators, seed):
    """Out-of-fold predictions and metrics.

    'scaffold' split keeps molecules sharing a Murcko scaffold in the same
    fold, which gives a more honest estimate for novel chemotypes.
    """
    if split == "scaffold":
        splitter, split_args = GroupKFold(n_splits=folds), (X, y, groups)
    elif task == "classification":
        splitter = StratifiedKFold(n_splits=folds, shuffle=True, random_state=seed)
        split_args = (X, y)
    else:
        splitter, split_args = KFold(n_splits=folds, shuffle=True, random_state=seed), (X, y)

    oof = np.empty(len(y), dtype=object if task == "classification" else float)
    for train_idx, test_idx in splitter.split(*split_args):
        model = build_model(task, n_estimators, seed)
        model.fit(X[train_idx], y[train_idx])
        oof[test_idx] = model.predict(X[test_idx])
    return oof, score(task, y, oof)


def load_dataset(path, smiles_col, target_col):
    df = pd.read_csv(path)
    for col in (smiles_col, target_col):
        if col not in df.columns:
            raise SystemExit(f"Column '{col}' not found. Available: {list(df.columns)}")
    df = df.dropna(subset=[smiles_col, target_col]).reset_index(drop=True)
    mols = parse_smiles(df[smiles_col])
    ok = [m is not None for m in mols]
    if not all(ok):
        print(f"Skipping {ok.count(False)} rows with invalid SMILES")
    df = df[ok].reset_index(drop=True)
    return df, [m for m in mols if m is not None]


def main(argv=None):
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("--data", required=True, help="CSV file with SMILES and target columns")
    p.add_argument("--smiles-col", default="smiles")
    p.add_argument("--target", required=True, help="Column to predict")
    p.add_argument("--task", choices=["auto", "classification", "regression"], default="auto")
    p.add_argument("--split", choices=["random", "scaffold"], default="random")
    p.add_argument("--folds", type=int, default=5)
    p.add_argument("--n-estimators", type=int, default=500)
    p.add_argument("--radius", type=int, default=2)
    p.add_argument("--n-bits", type=int, default=2048)
    p.add_argument("--no-descriptors", action="store_true")
    p.add_argument("--seed", type=int, default=42)
    p.add_argument("--out", default="models/model.joblib")
    args = p.parse_args(argv)

    df, mols = load_dataset(args.data, args.smiles_col, args.target)
    task = infer_task(df[args.target]) if args.task == "auto" else args.task
    y = df[args.target].astype(str if task == "classification" else float).to_numpy()
    feat_kw = dict(radius=args.radius, n_bits=args.n_bits, use_descriptors=not args.no_descriptors)
    X = featurize(mols, **feat_kw)
    groups = [murcko_scaffold(m) for m in mols]

    print(f"Loaded {len(df)} molecules | task={task} | features={X.shape[1]} | "
          f"scaffolds={len(set(groups))}")
    folds = args.folds
    if task == "classification" and args.split == "random":
        folds = min(folds, int(pd.Series(y).value_counts().min()))
    folds = min(folds, len(set(groups)) if args.split == "scaffold" else len(y))

    oof, metrics = cross_validate(X, y, task, args.split, groups, folds, args.n_estimators, args.seed)
    print(f"{folds}-fold {args.split}-split CV metrics:")
    for k, v in metrics.items():
        print(f"  {k:>18}: {v:.3f}")

    model = build_model(task, args.n_estimators, args.seed).fit(X, y)
    out = Path(args.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump({"model": model, "task": task, "target": args.target,
                 "features": feat_kw, "feature_names": feature_names(**feat_kw),
                 "cv_metrics": metrics}, out)

    df.assign(cv_prediction=oof).to_csv(out.with_suffix(".cv_predictions.csv"), index=False)
    out.with_suffix(".metrics.json").write_text(json.dumps(
        {"task": task, "split": args.split, "folds": folds, "n": len(df), **metrics}, indent=2))
    print(f"Saved model to {out}")
    return metrics


if __name__ == "__main__":
    main()
