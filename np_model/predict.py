"""Predict with a trained model.

Example:
    python -m np_model.predict --model models/np_class.joblib --smiles "CC(C)=CCC/C(C)=C/CO"
    python -m np_model.predict --model models/np_class.joblib --data new.csv --out preds.csv
"""

from __future__ import annotations

import argparse

import joblib
import numpy as np
import pandas as pd

from .features import featurize, parse_smiles


def predict(bundle, smiles):
    """Return a DataFrame of predictions (and class probabilities) for SMILES."""
    mols = parse_smiles(smiles)
    valid = [i for i, m in enumerate(mols) if m is not None]
    out = pd.DataFrame({"smiles": list(smiles), "valid": [m is not None for m in mols]})
    out["prediction"] = None
    if not valid:
        return out
    X = featurize([mols[i] for i in valid], **bundle["features"])
    model = bundle["model"]
    out.loc[valid, "prediction"] = model.predict(X)
    if bundle["task"] == "classification":
        proba = model.predict_proba(X)
        for j, cls in enumerate(model.classes_):
            out.loc[valid, f"p_{cls}"] = proba[:, j]
        out.loc[valid, "confidence"] = proba.max(axis=1)
    else:
        # Spread of per-tree predictions as a rough uncertainty estimate.
        per_tree = np.stack([t.predict(X) for t in model.estimators_])
        out.loc[valid, "std"] = per_tree.std(axis=0)
    return out


def main(argv=None):
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("--model", required=True)
    src = p.add_mutually_exclusive_group(required=True)
    src.add_argument("--smiles", nargs="+", help="One or more SMILES strings")
    src.add_argument("--data", help="CSV file containing a SMILES column")
    p.add_argument("--smiles-col", default="smiles")
    p.add_argument("--out", help="Write predictions to this CSV")
    args = p.parse_args(argv)

    bundle = joblib.load(args.model)
    smiles = args.smiles or pd.read_csv(args.data)[args.smiles_col].tolist()
    result = predict(bundle, smiles)
    if args.out:
        result.to_csv(args.out, index=False)
        print(f"Wrote {len(result)} predictions to {args.out}")
    else:
        with pd.option_context("display.max_columns", None, "display.width", 200):
            print(result.to_string(index=False))


if __name__ == "__main__":
    main()
