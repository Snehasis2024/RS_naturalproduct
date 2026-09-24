"""Generate 3D conformers for small molecules used by BioPath 3D.

Coordinates are COMPUTED (RDKit ETKDGv3 embedding + MMFF94 minimisation of the
neutral species), not experimental structures. The app labels them as such.

Usage: python3 scripts/gen_conformers.py   (requires rdkit)
"""
import json
from pathlib import Path

from rdkit import Chem
from rdkit.Chem import AllChem, Descriptors, rdMolDescriptors

# id, display name, SMILES (neutral form), ChEBI id (for the reference link)
MOLECULES = [
    ("glucose", "β-D-Glucose", "OC[C@H]1O[C@@H](O)[C@H](O)[C@@H](O)[C@@H]1O", "CHEBI:15903"),
    ("g6p", "Glucose-6-phosphate", "O[C@@H]1O[C@H](COP(=O)(O)O)[C@@H](O)[C@H](O)[C@H]1O", "CHEBI:4170"),
    ("f6p", "Fructose-6-phosphate", "OC[C@]1(O)O[C@H](COP(O)(O)=O)[C@@H](O)[C@@H]1O", "CHEBI:57634"),
    ("f16bp", "Fructose-1,6-bisphosphate", "O=P(O)(O)OC[C@]1(O)O[C@H](COP(O)(O)=O)[C@@H](O)[C@@H]1O", "CHEBI:28013"),
    ("dhap", "Dihydroxyacetone phosphate", "OCC(=O)COP(O)(O)=O", "CHEBI:16108"),
    ("g3p", "Glyceraldehyde-3-phosphate", "O=C[C@H](O)COP(O)(O)=O", "CHEBI:17138"),
    ("bpg13", "1,3-Bisphosphoglycerate", "O=C(OP(O)(O)=O)[C@H](O)COP(O)(O)=O", "CHEBI:16001"),
    ("pg3", "3-Phosphoglycerate", "OC(=O)[C@H](O)COP(O)(O)=O", "CHEBI:17794"),
    ("pg2", "2-Phosphoglycerate", "OC(=O)[C@H](OP(O)(O)=O)CO", "CHEBI:17835"),
    ("pep", "Phosphoenolpyruvate", "C=C(OP(O)(O)=O)C(O)=O", "CHEBI:44897"),
    ("pyruvate", "Pyruvate (pyruvic acid)", "CC(=O)C(O)=O", "CHEBI:15361"),
    ("lactate", "L-Lactate (L-lactic acid)", "C[C@H](O)C(O)=O", "CHEBI:422"),
    ("atp", "ATP", "Nc1ncnc2c1ncn2[C@@H]1O[C@H](COP(=O)(O)OP(=O)(O)OP(=O)(O)O)[C@@H](O)[C@H]1O", "CHEBI:15422"),
    ("adp", "ADP", "Nc1ncnc2c1ncn2[C@@H]1O[C@H](COP(=O)(O)OP(=O)(O)O)[C@@H](O)[C@H]1O", "CHEBI:16761"),
    ("acetylcoa", "Acetyl-CoA", "CC(=O)SCCNC(=O)CCNC(=O)[C@H](O)C(C)(C)COP(=O)(O)OP(=O)(O)OC[C@H]1O[C@@H](n2cnc3c(N)ncnc32)[C@H](O)[C@@H]1OP(=O)(O)O", "CHEBI:15351"),
    ("citrate", "Citrate (citric acid)", "OC(=O)CC(O)(CC(O)=O)C(O)=O", "CHEBI:30769"),
    ("isocitrate", "Isocitrate (threo-Ds)", "OC(=O)C[C@@H](C(O)=O)[C@@H](O)C(O)=O", "CHEBI:30887"),
    ("akg", "α-Ketoglutarate (2-oxoglutarate)", "OC(=O)CCC(=O)C(O)=O", "CHEBI:30915"),
    ("succinate", "Succinate (succinic acid)", "OC(=O)CCC(O)=O", "CHEBI:15741"),
    ("fumarate", "Fumarate (fumaric acid)", "OC(=O)/C=C/C(O)=O", "CHEBI:18012"),
    ("malate", "L-Malate (L-malic acid)", "OC(=O)C[C@H](O)C(O)=O", "CHEBI:30797"),
    ("oxaloacetate", "Oxaloacetate", "OC(=O)CC(=O)C(O)=O", "CHEBI:30744"),
    ("r5p", "Ribose-5-phosphate", "O[C@H]1O[C@H](COP(O)(O)=O)[C@@H](O)[C@H]1O", "CHEBI:52742"),
    ("palmitate", "Palmitic acid", "CCCCCCCCCCCCCCCC(O)=O", "CHEBI:15756"),
    ("urea", "Urea", "NC(N)=O", "CHEBI:16199"),
    ("glutamate", "L-Glutamate (L-glutamic acid)", "N[C@@H](CCC(O)=O)C(O)=O", "CHEBI:16015"),
    ("alanine", "L-Alanine", "C[C@H](N)C(O)=O", "CHEBI:16977"),
    ("damp", "dAMP (deoxyadenosine monophosphate)", "Nc1ncnc2c1ncn2[C@H]1C[C@H](O)[C@@H](COP(O)(O)=O)O1", "CHEBI:17713"),
    ("dtmp", "dTMP (thymidine monophosphate)", "Cc1cn([C@H]2C[C@H](O)[C@@H](COP(O)(O)=O)O2)c(=O)[nH]c1=O", "CHEBI:17013"),
    ("erlotinib", "Erlotinib (EGFR inhibitor)", "COCCOc1cc2ncnc(Nc3cccc(C#C)c3)c2cc1OCCOC", "CHEBI:114785"),
    ("palbociclib", "Palbociclib (CDK4/6 inhibitor)", "CC(=O)c1c(C)c2cnc(Nc3ccc(cn3)N3CCNCC3)nc2n(C2CCCC2)c1=O", "CHEBI:85993"),
    ("metformin", "Metformin", "CN(C)C(=N)NC(N)=N", "CHEBI:6801"),
]

# Expected CIP labels for a few stereocentres, as a sanity check on the SMILES.
EXPECTED_CIP = {"lactate": ["S"], "malate": ["S"], "alanine": ["S"], "glutamate": ["S"], "g3p": ["R"]}


def build(mol_id, name, smiles, chebi):
    mol = Chem.MolFromSmiles(smiles)
    assert mol is not None, mol_id
    if mol_id in EXPECTED_CIP:
        labels = [c for _, c in Chem.FindMolChiralCenters(mol)]
        assert labels == EXPECTED_CIP[mol_id], (mol_id, labels)
    formula = rdMolDescriptors.CalcMolFormula(mol)
    mw = Descriptors.MolWt(mol)
    molh = Chem.AddHs(mol)
    params = AllChem.ETKDGv3()
    params.randomSeed = 7
    assert AllChem.EmbedMolecule(molh, params) == 0, mol_id
    AllChem.MMFFOptimizeMolecule(molh, maxIters=2000)
    conf = molh.GetConformer()
    pos = conf.GetPositions()
    centre = pos.mean(axis=0)
    atoms = [
        [a.GetSymbol(), *[round(float(v), 3) for v in (pos[a.GetIdx()] - centre)]]
        for a in molh.GetAtoms()
    ]
    bonds = []
    for b in molh.GetBonds():
        order = 1.5 if b.GetIsAromatic() else b.GetBondTypeAsDouble()
        bonds.append([b.GetBeginAtomIdx(), b.GetEndAtomIdx(), order])
    return {
        "id": mol_id,
        "name": name,
        "smiles": smiles,
        "formula": formula,
        "mw": round(mw, 2),
        "chebi": chebi,
        "atoms": atoms,
        "bonds": bonds,
        "source": "computed",
    }


def main():
    out = Path(__file__).resolve().parents[1] / "src/data/generated/smallMolecules.json"
    data = [build(*m) for m in MOLECULES]
    out.write_text(json.dumps(data, separators=(",", ":")))
    print(f"wrote {len(data)} molecules to {out}")


if __name__ == "__main__":
    main()
