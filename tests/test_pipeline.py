from pathlib import Path

import joblib
import numpy as np
import pandas as pd

from np_model.features import featurize, parse_smiles
from np_model.predict import predict
from np_model.train import main as train

DATA = Path(__file__).resolve().parents[1] / "data" / "example_natural_products.csv"


def test_example_smiles_all_parse():
    df = pd.read_csv(DATA)
    assert all(m is not None for m in parse_smiles(df.smiles))


def test_featurize_shape():
    X = featurize(parse_smiles(["CCO", "c1ccccc1O"]), n_bits=256)
    assert X.shape == (2, 256 + 14)
    assert np.isfinite(X).all()


def test_classification_train_and_predict(tmp_path):
    out = tmp_path / "clf.joblib"
    metrics = train(["--data", str(DATA), "--target", "compound_class",
                     "--n-estimators", "100", "--out", str(out)])
    assert metrics["accuracy"] > 0.7
    res = predict(joblib.load(out), ["O=c1cc(-c2ccccc2)oc2ccccc12", "not_a_smiles"])
    assert res.loc[0, "prediction"] == "flavonoid"
    assert not res.loc[1, "valid"]


def test_regression_train(tmp_path):
    df = pd.read_csv(DATA)
    from rdkit.Chem import Descriptors
    df["mw"] = [Descriptors.MolWt(m) for m in parse_smiles(df.smiles)]
    csv = tmp_path / "reg.csv"
    df.to_csv(csv, index=False)
    metrics = train(["--data", str(csv), "--target", "mw", "--split", "scaffold",
                     "--n-estimators", "100", "--out", str(tmp_path / "reg.joblib")])
    assert metrics["r2"] > 0.5
