"""Convert SMILES strings into numeric feature matrices."""

from __future__ import annotations

import numpy as np
from rdkit import Chem, RDLogger
from rdkit.Chem import Descriptors, rdFingerprintGenerator
from rdkit.Chem.Scaffolds import MurckoScaffold

RDLogger.DisableLog("rdApp.*")

# Physicochemical descriptors that are informative for natural products
# (NPs tend to be rich in sp3 carbons, oxygen, stereocentres and rings).
DESCRIPTORS = [
    "MolWt", "MolLogP", "TPSA", "NumHDonors", "NumHAcceptors",
    "NumRotatableBonds", "RingCount", "NumAromaticRings",
    "FractionCSP3", "HeavyAtomCount", "NumHeteroatoms",
]
_DESC_FUNCS = dict(Descriptors.descList)


def parse_smiles(smiles):
    """Return a list of RDKit molecules (None where parsing failed)."""
    return [Chem.MolFromSmiles(str(s)) if s is not None else None for s in smiles]


def _extra_counts(mol):
    atoms = [a.GetSymbol() for a in mol.GetAtoms()]
    return [
        atoms.count("N"),
        atoms.count("O"),
        len(Chem.FindMolChiralCenters(mol, includeUnassigned=True)),
    ]


def feature_names(radius=2, n_bits=2048, use_descriptors=True):
    names = [f"morgan_r{radius}_{i}" for i in range(n_bits)]
    if use_descriptors:
        names += DESCRIPTORS + ["nN", "nO", "nStereo"]
    return names


def featurize(mols, radius=2, n_bits=2048, use_descriptors=True):
    """Morgan count fingerprint (+ optional descriptors) for each molecule."""
    gen = rdFingerprintGenerator.GetMorganGenerator(radius=radius, fpSize=n_bits)
    rows = []
    for mol in mols:
        fp = gen.GetCountFingerprintAsNumPy(mol).astype(np.float32)
        if use_descriptors:
            desc = [_DESC_FUNCS[d](mol) for d in DESCRIPTORS] + _extra_counts(mol)
            fp = np.concatenate([fp, np.asarray(desc, dtype=np.float32)])
        rows.append(fp)
    X = np.vstack(rows)
    return np.nan_to_num(X, nan=0.0, posinf=0.0, neginf=0.0)


def murcko_scaffold(mol):
    """Bemis-Murcko scaffold SMILES (acyclic molecules share the '' scaffold)."""
    return MurckoScaffold.MurckoScaffoldSmiles(mol=mol, includeChirality=False)
