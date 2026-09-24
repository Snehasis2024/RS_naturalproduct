# BioPath 3D

An interactive 3D biology lab that teaches cell and molecular biology with simulations you can rotate, click and step through. It covers the cell, the cell cycle, the central dogma, signalling, metabolism and apoptosis.

> **Explore Biology. Don't Just Read It.**

```bash
cd biopath3d
npm install
npm run dev        # http://localhost:5173
npm test           # engine + content tests (stoichiometry, genetic code, search, tutor, quiz…)
npm run build      # static site in dist/ (works from any sub-path, hash routing)
```

Stack: React 19, TypeScript, Three.js, React Three Fiber, Drei, Tailwind CSS 4, Zustand, Vite, Vitest.

## Modules

| Route | Module | What you can do |
|---|---|---|
| `#/` | Home | 3D cell hero, guided journey, lab index |
| `#/universe` | Biology Universe | Zoom through organism → organ system → tissue → cell → organelle → DNA → gene → protein → molecular interaction → signalling pathway → metabolic pathway (↑/↓ keys) |
| `#/cell` | 3D Cell Explorer | 11 organelles; rotate, zoom, pan, hover, click, labels, show/hide, isolate, explode view, transparent cell, animated ER → Golgi → membrane traffic |
| `#/cellcycle` | Cell-cycle simulation | G0 → G1 → S → G2 → prophase → prometaphase → metaphase → anaphase → telophase → cytokinesis. Play, pause, step, slow motion, speed, loop. Timeline with cyclin curves. Clickable chromosomes, spindle, centrosomes, envelope and contractile ring. Spindle-checkpoint indicator |
| `#/regulation` | Cyclin–CDK network, DNA-damage response | Cyclin D/E/A/B–CDK, RB, E2F, p53, p21, ATM, ATR, CHK1/2, CDC25, WEE1, APC/C, with narrated steps |
| `#/dogma` | DNA → RNA → Protein | Double helix, replication fork (leading/lagging, Okazaki fragments), transcription bubble, splicing/capping/poly(A), codon-by-codon translation using the real genetic code, folding. Zoom targets include computed 3D nucleotides and amino acids |
| `#/signaling` | Signalling lab | EGFR/RAS–RAF–MEK–ERK, PI3K–AKT–mTOR, JAK–STAT, WNT–β-catenin, TGF-β, NF-κB, Notch, Hedgehog, stress MAPK (JNK/p38). Signal particles move along the edges; phosphorylation tags; step-through |
| `#/map` | Pathway connection map | 3D force-directed map of crosstalk; click a node to open its pathway |
| `#/metabolism` | Metabolic pathway lab | Glycolysis, TCA, OXPHOS, PPP, gluconeogenesis, β-oxidation, FA synthesis, urea cycle, amino-acid nitrogen. Metabolites are shown as computed 3D molecules, with enzyme and EC labels and a live ATP/GTP/NADH/FADH₂/NADPH/CO₂/H⁺ ledger |
| `#/apoptosis` | Apoptosis | Intrinsic, extrinsic, and a side-by-side comparison |
| `#/molecules` | Molecular viewer | Live RCSB PDB structures (p53–DNA, EGFR–erlotinib, CDK2–cyclin A, KRAS G12C–sotorasib, cytochrome c, ubiquitin, haemoglobin, B-DNA) and 32 computed small molecules. Cartoon, surface, ball-and-stick, space-filling and stick views; atoms, ligands, water and highlighted active sites can be toggled |
| `#/learn` | Guided learning | 11 lessons following *explain → 3D demo → highlight → mechanism → pathway → question → feedback → continue* |
| `#/quiz` | Quiz lab | MCQ, 3D identify-the-organelle, pathway ordering, matching, mechanism; filters; weak-area practice |
| `#/progress` | Dashboard | Mastery per topic, lessons, accuracy, study time, weak areas, recommended next lesson |
| `#/tutor` + 🤖 | BioTutor | Beginner, intermediate and advanced explanations. Uses the currently selected 3D object as context |

A global search (press `/`) covers molecules, proteins, genes, organelles, pathways, cell processes, structures and lessons.

## Scientific accuracy

Every view carries one of three badges:

- **Established mechanism**: textbook consensus, with references.
- **Simplified teaching model**: a real mechanism with steps merged or components left out (for example, Okazaki fragments of 8 nt instead of about 150).
- **Hypothetical visualisation**: a visual metaphor, such as the folding animation. It is not a claim about real structure.

Where the data comes from:

- **Protein structures** are downloaded at runtime from `files.rcsb.org`. If the download fails, the viewer shows a procedural chain labelled *PROCEDURAL PLACEHOLDER — not an experimental structure*.
- **Small molecules** are 3D conformers computed by RDKit (ETKDGv3 embedding and MMFF94 minimisation of the neutral species, from SMILES). They are labelled as computed, not experimental. To regenerate them: `pip install rdkit && npm run gen:molecules`. The script checks CIP stereochemistry for chiral metabolites.
- **Organelles, cells and the universe levels** are procedural schematics. Their shapes and scales are illustrative.
- **References** link to UniProt, NCBI Gene, RCSB PDB, KEGG, Reactome, ChEBI, Gene Ontology (QuickGO), review articles (DOIs) and textbooks on the NCBI Bookshelf.
- **Stoichiometry is unit-tested**, for example:
  - glycolysis: net +2 ATP and +2 NADH
  - TCA cycle: 3 NADH, 1 FADH₂, 1 GTP and 2 CO₂ per turn
  - palmitate synthesis: 7 ATP and 14 NADPH
  - gluconeogenesis: 4 ATP, 2 GTP and 2 NADH
  - urea cycle: 4 high-energy phosphate bonds
  - oxidative PPP: 2 NADPH
- **The genetic code is unit-tested**: the demo gene splices and translates to `MAKELFTG*`.

## Architecture

```
src/
  data/                     ← all biological content (plain data)
    schema.ts               ← types: Entity, Pathway, PathwayNode/Edge, SmallMolecule, Lesson, Question, SceneRef…
    pathways/*.json         ← signalling / regulation / apoptosis / map pathways   (auto-discovered)
    metabolic/*.json        ← metabolic pathways with enzymes, EC numbers, cofactors, energy deltas
    organelles.ts, proteins.ts   ← knowledge base (function, structure, clinical, UniProt, PDB, 3-level explanations)
    cellCycle.ts, dogma.ts, structures.ts, lessons.ts, questions.ts
    generated/smallMolecules.json ← RDKit conformers (scripts/gen_conformers.py)
  engine/                   ← framework-free logic (unit-tested)
    normalize.ts            ← accepts full or compact {pathway, steps:[{name,type,next}]} JSON; validates
    layout.ts               ← layered / cycle / chain / force / manual 3D layouts
    metabolism.ts           ← flux order + energy ledger
    search.ts, quizGen.ts, tutor.ts, tutorLLM.ts, progress.ts, pdb.ts, clock.ts
  scenes/                   ← 3D scenes: PathwayScene (generic), CellCycleScene, DogmaScene, ProteinScene, UniverseLevels
  components/               ← SceneShell, CellModel + organelles, MoleculeModel, labels, PathwayView, panels, QuestionView
  modules/                  ← one lazily loaded page per route
  store/                    ← hash router + Zustand store (selection, settings, persisted progress)
```

### Adding content without new code

- **A new pathway**: drop a JSON file into `src/data/pathways/` (signalling, regulation, apoptosis or map) or `src/data/metabolic/`. It is picked up by `import.meta.glob`. The pathway then appears in its lab's list, in search, and in the tutor. The quiz generator also creates ordering, "what comes next" and enzyme questions from it automatically. Either format works:

  ```json
  { "pathway": "MAPK", "steps": [ { "name": "EGFR", "type": "receptor", "function": "…", "next": "GRB2" }, { "name": "GRB2", "type": "adaptor" } ] }
  ```

  The full format adds compartments, edge types (activation, inhibition, phosphorylation…), narrated `steps`, evidence levels, references, and for metabolism: `enzyme`, `cofactorsIn/Out`, `energy` and `multiplier`. `notch.json` and `hedgehog.json` use the compact format. `npm test` fails on dangling edges, unknown entity refs or unknown molecule ids.
- **A new protein or organelle**: add an entry to `proteins.ts` or `organelles.ts`. Pathway nodes link to it with `"ref"`.
- **A new lesson**: add to `lessons.ts`. Steps can embed any scene through `SceneRef` (`cell`, `cellcycle`, `pathway`, `metabolic`, `dogma`, `molecule`).
- **A new question**: add to `questions.ts`.
- **A new small molecule**: add a SMILES entry to `scripts/gen_conformers.py` and regenerate.

### Adding a new module (e.g. immunology, pharmacology, bioinformatics)

1. Put its content in `src/data/<module>/` using the existing schemas, adding types to `schema.ts` if needed.
2. Build its 3D view from the shared pieces: `SceneShell`, `PathwayScene`, `MoleculeStage`, `DomLabel`, `ControlBar`. Selections go through `useStore().select(...)` so the info panel and BioTutor context work automatically.
3. Add a route in `App.tsx` and an entry in `components/layout/nav.ts`.

For example, *cancer biology* and *drug targets* can reuse the pathway engine with a `drug` node type and inhibition edges. The data for erlotinib, palbociclib and sotorasib (structures and targets) is already there.

## BioTutor

- **Offline mode (default).** Answers come only from the curated knowledge base, at the level you choose. Questions like "what does this do?" use the object you have selected. If nothing matches, it says so instead of making something up.
- **Claude mode (optional).** You paste your own Anthropic API key in the tutor settings. It is stored only in this browser's localStorage and sent straight to `api.anthropic.com`. Requests use `claude-opus-5` with streaming. Each request includes the knowledge-base entries and your current 3D selection as grounding. Use a key with a spending limit.

## Notes

- All progress (lessons, quiz answers, study time) stays in `localStorage`.
- Labels are imperatively positioned DOM elements (`DomLabel`) rather than drei's `<Html>`, to avoid nested React roots under React 19.
