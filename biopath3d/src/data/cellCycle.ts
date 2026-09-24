import type { Evidence } from './schema'

export interface CellCyclePhase {
  id: string
  name: string
  short: string
  group: 'interphase' | 'mitosis' | 'quiescence'
  /** Seconds of animation at 1× speed (teaching time, NOT to scale). */
  seconds: number
  /** Typical duration in a proliferating human cell in culture (~24 h cycle). */
  typical: string
  color: string
  summary: string
  events: string[]
  mechanism: string[]
  keyMolecules: string[]
  checkpoint?: string
  evidence: Evidence
}

export const CELL_CYCLE_PHASES: CellCyclePhase[] = [
  {
    id: 'G0', name: 'G0 — quiescence', short: 'G0', group: 'quiescence', seconds: 4, typical: 'Indefinite (days to years)', color: '#64748b',
    summary: 'A reversible, non-dividing state. Many differentiated cells (neurons, hepatocytes) reside here; mitogens can recruit some back into G1.',
    events: ['Metabolically active but not preparing to divide', 'Low cyclin D; RB hypophosphorylated', 'Primary cilium often present'],
    mechanism: ['Absence of mitogens → low cyclin D–CDK4/6 activity', 'p27KIP1 inhibits CDK2 complexes', 'DREAM complex represses cell-cycle genes'],
    keyMolecules: ['rb', 'p16', 'e2f'], evidence: 'established',
  },
  {
    id: 'G1', name: 'G1 — first gap (growth)', short: 'G1', group: 'interphase', seconds: 6, typical: '~11 h (most variable phase)', color: '#22d3ee',
    summary: 'The cell grows, makes proteins and organelles, and decides whether to commit to division at the restriction point.',
    events: ['Cell size and protein content increase', 'Ribosome biogenesis and mitochondrial biogenesis', 'Mitogen signalling induces cyclin D', 'Origin licensing: ORC, CDC6, CDT1 load MCM helicases'],
    mechanism: ['Cyclin D–CDK4/6 begins RB phosphorylation', 'E2F induces cyclin E → CDK2 → RB hyperphosphorylation (positive feedback)', 'Passing the restriction point makes S-phase entry mitogen-independent'],
    keyMolecules: ['cyclinD', 'cdk46', 'rb', 'e2f', 'cyclinE'], checkpoint: 'G1/S checkpoint: DNA damage → p53 → p21 blocks CDK2', evidence: 'established',
  },
  {
    id: 'S', name: 'S — DNA synthesis', short: 'S', group: 'interphase', seconds: 8, typical: '~8 h', color: '#a78bfa',
    summary: 'The whole genome is replicated exactly once; each chromosome becomes two sister chromatids held together by cohesin. Centrosomes duplicate.',
    events: ['Thousands of origins fire (early/late replication timing)', 'Semi-conservative replication by DNA polymerases ε (leading) and δ (lagging)', 'Histones synthesised and deposited on new DNA', 'Cohesin establishes sister-chromatid cohesion', 'Centriole duplication begins'],
    mechanism: ['CDK2 and DDK (CDC7–DBF4) activate the CMG helicase at licensed origins', 'Geminin and CDK activity prevent re-licensing → once-per-cycle replication', 'ATR–CHK1 respond to replication stress'],
    keyMolecules: ['cyclinA', 'cdk2', 'cohesin', 'atr'], checkpoint: 'Intra-S checkpoint: ATR–CHK1 slow origin firing when forks stall', evidence: 'established',
  },
  {
    id: 'G2', name: 'G2 — second gap', short: 'G2', group: 'interphase', seconds: 5, typical: '~4 h', color: '#818cf8',
    summary: 'The cell checks that replication is complete and DNA is undamaged, continues growing and prepares for mitosis.',
    events: ['Cyclin B accumulates', 'Centrosomes mature (recruit γ-tubulin)', 'DNA repair of replication errors'],
    mechanism: ['Cyclin B–CDK1 held inactive by WEE1/MYT1 phosphorylation', 'Aurora A and PLK1 activate CDC25 → CDK1 activation', 'Positive feedback loops create an all-or-none G2/M switch'],
    keyMolecules: ['cyclinB', 'cdk1', 'wee1', 'cdc25', 'plk1', 'aurkA'], checkpoint: 'G2/M checkpoint: ATM/ATR → CHK1/2 inhibit CDC25', evidence: 'established',
  },
  {
    id: 'prophase', name: 'Prophase', short: 'Pro', group: 'mitosis', seconds: 6, typical: '~10–20 min', color: '#f472b6',
    summary: 'Chromatin condenses into visible chromosomes, each with two sister chromatids. Centrosomes separate and nucleate the mitotic spindle; the nucleolus disperses.',
    events: ['Condensin compacts chromosomes', 'Arm cohesin is removed (centromeric cohesin kept)', 'Centrosomes move apart along the nuclear envelope', 'Microtubule dynamics increase; spindle begins to form'],
    mechanism: ['Cyclin B–CDK1 phosphorylates condensin, histone H1 and many other substrates', 'Kinesin-5 (Eg5) slides antiparallel microtubules to separate centrosomes', 'PLK1/WAPL remove arm cohesin; shugoshin–PP2A protects centromeric cohesin'],
    keyMolecules: ['cdk1', 'condensin', 'cohesin', 'plk1', 'aurkA'], evidence: 'established',
  },
  {
    id: 'prometaphase', name: 'Prometaphase', short: 'Prometa', group: 'mitosis', seconds: 6, typical: '~10–20 min', color: '#fb7185',
    summary: 'The nuclear envelope breaks down. Spindle microtubules capture chromosomes at their kinetochores.',
    events: ['Nuclear envelope breakdown (NEBD)', 'Kinetochores assemble on centromeres', 'Microtubules “search and capture” kinetochores', 'Chromosomes congress toward the spindle equator'],
    mechanism: ['CDK1 phosphorylates lamins and nucleoporins → envelope disassembly', 'Aurora B corrects wrong attachments (tension sensing)', 'Unattached kinetochores generate the MAD2 “wait” signal (spindle-assembly checkpoint)'],
    keyMolecules: ['cdk1', 'mad2'], evidence: 'established',
  },
  {
    id: 'metaphase', name: 'Metaphase', short: 'Meta', group: 'mitosis', seconds: 6, typical: '~20 min', color: '#fbbf24',
    summary: 'All chromosomes are bi-oriented and aligned at the metaphase plate, with sister kinetochores attached to opposite poles.',
    events: ['Chromosomes aligned on the equatorial plane', 'Kinetochore fibres under tension', 'Spindle checkpoint satisfied once the last kinetochore attaches'],
    mechanism: ['Once all kinetochores are attached, MAD2 no longer inhibits Cdc20', 'APC/C–Cdc20 becomes active'],
    keyMolecules: ['mad2', 'apcc'], checkpoint: 'Spindle-assembly (metaphase) checkpoint', evidence: 'established',
  },
  {
    id: 'anaphase', name: 'Anaphase', short: 'Ana', group: 'mitosis', seconds: 6, typical: '~5–10 min', color: '#34d399',
    summary: 'Sister chromatids separate and move to opposite poles (anaphase A); the poles move apart and the spindle elongates (anaphase B).',
    events: ['Cohesin cleavage releases sister chromatids', 'Kinetochore microtubules shorten (anaphase A)', 'Interpolar microtubules slide apart; poles separate (anaphase B)'],
    mechanism: ['APC/C–Cdc20 ubiquitinates securin → separase released', 'Separase cleaves RAD21 (SCC1) of cohesin', 'APC/C also targets cyclin B → CDK1 activity falls', 'Microtubule depolymerisation at kinetochores pulls chromatids poleward'],
    keyMolecules: ['apcc', 'separase', 'cohesin', 'cyclinB'], evidence: 'established',
  },
  {
    id: 'telophase', name: 'Telophase', short: 'Telo', group: 'mitosis', seconds: 6, typical: '~10 min', color: '#60a5fa',
    summary: 'Chromosomes arrive at the poles and decondense; nuclear envelopes and nucleoli re-form around each set.',
    events: ['Nuclear envelope re-forms around each chromosome set', 'Chromosomes decondense', 'Nucleoli reappear', 'Spindle disassembles; central spindle remains'],
    mechanism: ['Falling CDK1 activity and PP1/PP2A-B55 phosphatases dephosphorylate mitotic substrates', 'ESCRT-III seals the new nuclear envelope'],
    keyMolecules: ['cdk1'], evidence: 'established',
  },
  {
    id: 'cytokinesis', name: 'Cytokinesis', short: 'Cyto', group: 'mitosis', seconds: 6, typical: 'overlaps telophase, ~10–20 min', color: '#2dd4bf',
    summary: 'An actin–myosin contractile ring constricts the cell at the former metaphase plate, producing two daughter cells.',
    events: ['Contractile ring assembles at the equatorial cortex', 'Cleavage furrow ingresses', 'Midbody forms; abscission separates the daughters'],
    mechanism: ['Centralspindlin and PLK1 recruit ECT2 → RhoA-GTP at the equator', 'RhoA activates formins (actin) and ROCK (myosin II)', 'ESCRT-III mediates abscission'],
    keyMolecules: ['plk1'], evidence: 'established',
  },
]

/** Clickable structures inside the cell-cycle scene. */
export const CELL_CYCLE_STRUCTURES: Record<string, { name: string; text: string; molecules: string[] }> = {
  chromosome: {
    name: 'Chromosome (replicated)',
    text: 'After S phase each chromosome consists of two identical sister chromatids joined at the centromere by cohesin. In mitosis condensin compacts each chromatid ~10,000-fold relative to naked DNA. The kinetochore — a large protein complex on the centromere — attaches to spindle microtubules. Colours here distinguish homologous pairs (maternal vs paternal copies of a 2n = 4 teaching karyotype; human cells have 2n = 46).',
    molecules: ['cohesin', 'condensin', 'separase'],
  },
  spindle: {
    name: 'Spindle microtubules',
    text: 'Dynamic polymers of α/β-tubulin nucleated at the centrosomes. Kinetochore fibres attach chromosomes; interpolar microtubules overlap at the midzone and push the poles apart; astral microtubules anchor the spindle to the cortex. Motors: dynein, kinesin-5 (Eg5), kinesin-13 depolymerases. Anti-mitotic drugs (taxanes stabilise, vinca alkaloids destabilise microtubules) activate the spindle checkpoint and kill dividing cells.',
    molecules: ['mad2', 'aurkA', 'plk1'],
  },
  centrosome: {
    name: 'Centrosome / spindle pole',
    text: 'Each pole is a centrosome (a pair of centrioles in pericentriolar material). Centrosomes duplicate once per cycle, starting in S phase under PLK4 and CDK2 control, and separate in prophase.',
    molecules: ['plk1', 'aurkA'],
  },
  envelope: {
    name: 'Nuclear envelope',
    text: 'Double membrane that breaks down in prometaphase (CDK1 phosphorylates lamins and nucleoporins) and re-forms in telophase as phosphatases reverse these marks.',
    molecules: ['cdk1'],
  },
  ring: {
    name: 'Contractile ring',
    text: 'A ring of actin filaments and non-muscle myosin II assembled under RhoA control at the cell equator. Its constriction forms the cleavage furrow.',
    molecules: ['plk1'],
  },
}

/**
 * Relative cyclin levels across the cycle (0–1) for the illustrative chart.
 * Shape follows textbook descriptions; values are schematic, not measurements.
 */
export const CYCLIN_PROFILES: Record<string, { color: string; label: string; points: Record<string, [number, number]> }> = {
  D: { color: '#22d3ee', label: 'Cyclin D', points: { G0: [0.05, 0.05], G1: [0.1, 0.8], S: [0.8, 0.7], G2: [0.7, 0.6], prophase: [0.6, 0.4], prometaphase: [0.4, 0.3], metaphase: [0.3, 0.3], anaphase: [0.3, 0.3], telophase: [0.3, 0.3], cytokinesis: [0.3, 0.3] } },
  E: { color: '#a78bfa', label: 'Cyclin E', points: { G0: [0, 0], G1: [0, 0.9], S: [0.9, 0.1], G2: [0.1, 0], prophase: [0, 0], prometaphase: [0, 0], metaphase: [0, 0], anaphase: [0, 0], telophase: [0, 0], cytokinesis: [0, 0] } },
  A: { color: '#fbbf24', label: 'Cyclin A', points: { G0: [0, 0], G1: [0, 0.1], S: [0.1, 0.7], G2: [0.7, 0.9], prophase: [0.9, 0.5], prometaphase: [0.5, 0.05], metaphase: [0.05, 0], anaphase: [0, 0], telophase: [0, 0], cytokinesis: [0, 0] } },
  B: { color: '#f472b6', label: 'Cyclin B', points: { G0: [0, 0], G1: [0, 0], S: [0, 0.3], G2: [0.3, 0.8], prophase: [0.8, 0.95], prometaphase: [0.95, 1], metaphase: [1, 1], anaphase: [1, 0.05], telophase: [0.05, 0], cytokinesis: [0, 0] } },
}
