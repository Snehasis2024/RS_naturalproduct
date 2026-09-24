# RS_naturalproduct

Machine-learning models that predict properties of **natural products** from their chemical structure (SMILES).

The pipeline works with any CSV that has a SMILES column and a target column:

- **Classification** (text labels, or ≤10 distinct values), e.g. compound class, active/inactive, toxic/non-toxic
- **Regression** (continuous numbers), e.g. pIC50, logS, yield

## How it works

| Step | What happens |
|---|---|
| Parse | SMILES are parsed with RDKit. Invalid rows are reported and skipped. |
| Featurize | 2048-bit Morgan count fingerprint (radius 2), plus 14 physicochemical descriptors (MW, logP, TPSA, Fsp3, ring counts, N/O counts, stereocentres, …) |
| Model | Random Forest (class-balanced for classification) |
| Validate | k-fold cross-validation: stratified **random** split, or **scaffold** split (Bemis–Murcko), which tests generalisation to new chemotypes |
| Output | `model.joblib`, `model.metrics.json`, `model.cv_predictions.csv` |

## Quick start

```bash
pip install -r requirements.txt

# Train the demo model: classify natural products by biosynthetic class
python -m np_model.train --data data/example_natural_products.csv \
    --target compound_class --out models/np_class.joblib

# Predict new molecules
python -m np_model.predict --model models/np_class.joblib \
    --smiles "CC(C)=CCC/C(C)=C/CC/C(C)=C/C=O" "CN1CCC[C@H]1c1ccccc1"

# Or predict a whole CSV
python -m np_model.predict --model models/np_class.joblib --data new.csv --out preds.csv
```

## Demo dataset

`data/example_natural_products.csv` has 69 well-known natural products, each labelled with its biosynthetic class: alkaloid, flavonoid, terpenoid or phenylpropanoid.

Demo cross-validation results:

| Split | Accuracy | Macro-F1 |
|---|---|---|
| Random 5-fold | 0.94 | 0.94 |
| Scaffold 5-fold | 0.91 | 0.91 |

## Using your own data

```bash
python -m np_model.train --data my_data.csv --smiles-col SMILES --target pIC50 \
    --split scaffold --out models/my_model.joblib
```

Useful options: `--task {auto,classification,regression}`, `--folds`, `--n-estimators`, `--radius`, `--n-bits`, `--no-descriptors`, `--seed`.

For regression, predictions include a `std` column: the spread of the individual trees' predictions, which gives a rough measure of uncertainty.

Good public sources of natural-product data: [COCONUT](https://coconut.naturalproducts.net), [NPASS](https://bidd.group/NPASS/), [ChEMBL](https://www.ebi.ac.uk/chembl/) (bioactivity), [LOTUS](https://lotus.naturalproducts.net).

## Web tool: NP Explorer

`docs/index.html` is a self-contained interactive guide to natural products. Open it in a browser (an internet connection is needed to load RDKit.js).

- **Sources**: plants, microbes, fungi, marine organisms, animals, genome mining
- **Biosynthesis map** (diagram): shikimate, acetate–malonate, mevalonate/MEP and amino-acid pathways, and which compound classes each one produces
- **Structural classes**: alkaloids, flavonoids, terpenoids, phenylpropanoids, polyketides and non-ribosomal peptides, with structures drawn live
- **Drug-discovery pipeline** (interactive diagram): 12 steps from source selection to clinical approval. Click a step for its methods.
- **Landmark drugs** from nature
- **ML pipeline** (diagram) of this repository's `np_model`
- **Molecule lab**: paste a SMILES string to get the structure, properties (MW, cLogP, TPSA, Fsp³…), Lipinski/Veber checks, a predicted class and the nearest compounds from the demo dataset
- **Dataset explorer**: all 69 demo compounds, searchable and filterable by class

To publish it online, go to the repository's **Settings → Pages**, choose **Deploy from a branch**, then **main** / **/docs**.

## Tests

```bash
python -m pytest -q
```
