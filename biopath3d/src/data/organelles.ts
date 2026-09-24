import type { Entity } from './schema'
import { go, MBOC, LODISH } from './refs'

/** Organelles rendered by the 3D Cell Explorer. Ids match the scene components. */
export const ORGANELLES: Entity[] = [
  {
    id: 'membrane',
    name: 'Plasma membrane',
    kind: 'organelle',
    aliases: ['cell membrane', 'plasmalemma', 'lipid bilayer'],
    topic: 'cell-biology',
    summary: 'The lipid bilayer that bounds the cell and controls what enters and leaves.',
    function:
      'Selective barrier; hosts transporters, channels and pumps; carries receptors that relay extracellular signals (e.g. EGFR, death receptors); mediates adhesion, endocytosis and exocytosis.',
    structure:
      '~5 nm phospholipid bilayer with cholesterol and glycolipids; integral and peripheral proteins diffuse laterally (fluid-mosaic model). Outer leaflet is enriched in phosphatidylcholine/sphingomyelin, inner leaflet in phosphatidylserine.',
    keyMolecules: ['Phospholipids', 'Cholesterol', 'Na⁺/K⁺-ATPase', 'EGFR', 'Integrins', 'Glycocalyx'],
    relatedPathways: ['egfr-mapk', 'pi3k-akt-mtor', 'apoptosis-extrinsic', 'jak-stat'],
    clinical:
      'Cystic fibrosis results from misfolded or defective CFTR chloride channel. Exposure of phosphatidylserine on the outer leaflet is an "eat-me" signal on apoptotic cells.',
    evidence: 'established',
    references: [go('GO:0005886', 'plasma membrane'), MBOC],
    levels: {
      beginner: 'The membrane is the cell’s skin: a thin, oily layer that keeps the inside in and lets only certain things through.',
      intermediate:
        'A phospholipid bilayer with embedded proteins. Small non-polar molecules diffuse across; ions and polar molecules need channels or transporters. Receptors in the membrane detect signals such as growth factors.',
      advanced:
        'An asymmetric, laterally heterogeneous bilayer; cholesterol- and sphingolipid-rich nanodomains organise signalling complexes. Receptor tyrosine kinases dimerise in the membrane, and PI(4,5)P₂/PI(3,4,5)P₃ lipids act as docking sites for PH-domain proteins such as AKT.',
    },
  },
  {
    id: 'cytoplasm',
    name: 'Cytoplasm / cytosol',
    kind: 'organelle',
    aliases: ['cytosol'],
    topic: 'cell-biology',
    summary: 'The crowded aqueous interior between the membrane and the nucleus.',
    function:
      'Site of glycolysis, the pentose phosphate pathway, fatty acid synthesis, most protein synthesis on free ribosomes, and many signalling reactions.',
    structure:
      'Protein concentration ~200–300 mg/mL; organised by the cytoskeleton (actin filaments, microtubules, intermediate filaments).',
    keyMolecules: ['Glycolytic enzymes', 'Actin', 'Tubulin', 'Free ribosomes'],
    relatedPathways: ['glycolysis', 'ppp', 'fa-synthesis'],
    clinical: 'Many cytosolic enzyme deficiencies (e.g. pyruvate kinase deficiency) cause haemolytic anaemia.',
    evidence: 'established',
    references: [go('GO:0005829', 'cytosol'), MBOC],
  },
  {
    id: 'nucleus',
    name: 'Nucleus',
    kind: 'organelle',
    topic: 'cell-biology',
    summary: 'Double-membrane compartment that stores the genome and controls gene expression.',
    function:
      'Houses chromosomal DNA; DNA replication, transcription and pre-mRNA processing occur here. Nuclear pores control traffic of mRNAs out and of proteins (e.g. transcription factors such as ERK targets, p53, β-catenin) in.',
    structure:
      'Nuclear envelope = two lipid bilayers continuous with the ER, perforated by ~2,000–4,000 nuclear pore complexes; lined internally by the nuclear lamina (lamins A/B/C). Chromatin is organised into territories.',
    keyMolecules: ['DNA', 'Histones', 'Lamins', 'Nuclear pore complex', 'RNA polymerase II'],
    relatedPathways: ['dna-damage', 'cell-cycle-regulation', 'egfr-mapk', 'wnt'],
    clinical:
      'Mutations in LMNA (lamin A/C) cause laminopathies such as Hutchinson–Gilford progeria. Nuclear atypia is a key feature pathologists use to grade cancers.',
    evidence: 'established',
    references: [go('GO:0005634', 'nucleus'), MBOC],
    levels: {
      beginner: 'The nucleus is the control room. It keeps the DNA — the instruction manual — safe, and sends out copies of instructions as RNA.',
      intermediate:
        'Surrounded by a double membrane with pores. DNA is copied (replication) and read (transcription) here; mRNA exits through nuclear pores to be translated by ribosomes in the cytoplasm.',
      advanced:
        'Nucleocytoplasmic transport is Ran-GTP dependent (importins/exportins). The envelope disassembles in prometaphase after CDK1 phosphorylates lamins and nucleoporins, and reforms in telophase as PP1/PP2A dephosphorylate them.',
    },
  },
  {
    id: 'nucleolus',
    name: 'Nucleolus',
    kind: 'organelle',
    topic: 'cell-biology',
    summary: 'Membrane-less sub-nuclear body where ribosomes are made.',
    function:
      'Transcription of rRNA genes by RNA polymerase I, processing of pre-rRNA, and assembly of ribosomal subunits with ribosomal proteins imported from the cytoplasm.',
    structure:
      'Biomolecular condensate with three layers: fibrillar centre, dense fibrillar component and granular component; forms around rDNA repeats (nucleolar organiser regions).',
    keyMolecules: ['rRNA (45S precursor)', 'RNA polymerase I', 'Fibrillarin', 'Nucleophosmin (NPM1)'],
    relatedPathways: ['pi3k-akt-mtor'],
    clinical:
      'NPM1 mutations are among the most common in acute myeloid leukaemia. Nucleolar stress stabilises p53 via ribosomal proteins that inhibit MDM2.',
    evidence: 'established',
    references: [go('GO:0005730', 'nucleolus'), MBOC],
  },
  {
    id: 'mitochondria',
    name: 'Mitochondrion',
    kind: 'organelle',
    aliases: ['mitochondria', 'powerhouse'],
    topic: 'cell-biology',
    summary: 'Double-membrane organelle that produces most cellular ATP and controls intrinsic apoptosis.',
    function:
      'TCA cycle (matrix), β-oxidation, oxidative phosphorylation (inner membrane), part of the urea cycle and haem synthesis; releases cytochrome c to trigger intrinsic apoptosis.',
    structure:
      'Outer membrane (porins/VDAC), intermembrane space, inner membrane folded into cristae carrying complexes I–V, and the matrix containing mtDNA (16.6 kb in humans, 37 genes).',
    keyMolecules: ['ATP synthase', 'Cytochrome c', 'NADH', 'Coenzyme Q', 'mtDNA', 'BAX/BAK'],
    relatedPathways: ['tca', 'oxphos', 'beta-oxidation', 'apoptosis-intrinsic', 'urea-cycle'],
    clinical:
      'Mitochondrial DNA mutations cause maternally inherited diseases (MELAS, LHON). Many chemotherapy agents act by engaging BAX/BAK-dependent mitochondrial outer membrane permeabilisation; venetoclax inhibits BCL-2 to lower this threshold.',
    evidence: 'established',
    references: [go('GO:0005739', 'mitochondrion'), MBOC],
    levels: {
      beginner: 'Mitochondria are the cell’s power plants. They burn fuel from food with oxygen to make ATP, the cell’s energy currency.',
      intermediate:
        'Fuel (pyruvate, fatty acids) is oxidised in the matrix by the TCA cycle, producing NADH and FADH₂. The electron transport chain in the inner membrane uses their electrons to pump protons; ATP synthase uses the proton gradient to make ATP.',
      advanced:
        'Chemiosmotic coupling: complexes I, III and IV translocate protons, generating Δp (~180–200 mV, mostly Δψ). F₀F₁-ATP synthase couples proton flow to rotary catalysis (~8 H⁺ per 360° in mammals, 3 ATP per turn). MOMP by BAX/BAK releases cytochrome c and commits the cell to apoptosis.',
    },
  },
  {
    id: 'ribosomes',
    name: 'Ribosomes',
    kind: 'organelle',
    aliases: ['ribosome', '80S'],
    topic: 'molecular-biology',
    summary: 'RNA–protein machines that translate mRNA into protein.',
    function:
      'Decode mRNA codons with aminoacyl-tRNAs and catalyse peptide-bond formation (the peptidyl-transferase centre is RNA — the ribosome is a ribozyme).',
    structure:
      'Eukaryotic 80S ribosome = 40S (18S rRNA + ~33 proteins) + 60S (28S, 5.8S, 5S rRNA + ~47 proteins). A, P and E sites bind tRNAs. Free in cytosol or bound to rough ER.',
    keyMolecules: ['rRNA', 'tRNA', 'mRNA', 'eIF/eEF factors'],
    relatedPathways: ['pi3k-akt-mtor'],
    clinical:
      'Ribosomopathies (e.g. Diamond–Blackfan anaemia). Many antibiotics (aminoglycosides, macrolides, tetracyclines) selectively target bacterial 70S ribosomes.',
    evidence: 'established',
    references: [go('GO:0005840', 'ribosome'), LODISH],
  },
  {
    id: 'er',
    name: 'Endoplasmic reticulum',
    kind: 'organelle',
    aliases: ['ER', 'rough ER', 'smooth ER', 'RER', 'SER'],
    topic: 'cell-biology',
    summary: 'Membrane network for secretory/membrane protein synthesis (rough ER) and lipid synthesis and Ca²⁺ storage (smooth ER).',
    function:
      'Rough ER: co-translational import, folding, disulfide formation and N-glycosylation of secretory and membrane proteins. Smooth ER: phospholipid and steroid synthesis, detoxification (cytochrome P450s in liver), Ca²⁺ storage.',
    structure:
      'Continuous lumen with the nuclear envelope; sheets (rough, ribosome-studded) and tubules (smooth). Contains chaperones BiP, calnexin/calreticulin and protein disulfide isomerase.',
    keyMolecules: ['Sec61 translocon', 'BiP (GRP78)', 'Calnexin', 'SERCA pump', 'Cytochrome P450'],
    relatedPathways: ['apoptosis-intrinsic'],
    clinical:
      'Chronic ER stress (unfolded protein response) contributes to diabetes and neurodegeneration; α1-antitrypsin Z variant accumulates in hepatocyte ER causing liver disease.',
    evidence: 'established',
    references: [go('GO:0005783', 'endoplasmic reticulum'), MBOC],
  },
  {
    id: 'golgi',
    name: 'Golgi apparatus',
    kind: 'organelle',
    aliases: ['golgi body', 'golgi complex'],
    topic: 'cell-biology',
    summary: 'Stack of flattened cisternae that modifies, sorts and ships proteins and lipids.',
    function:
      'Receives cargo from the ER (cis face), processes N-linked glycans and adds O-linked glycans, and sorts cargo at the trans-Golgi network to lysosomes (via mannose-6-phosphate), plasma membrane or secretory granules.',
    structure: 'Polarised stack of 4–8 cisternae (cis → medial → trans) plus the trans-Golgi network; COPII vesicles arrive from ER, COPI vesicles mediate retrograde transport.',
    keyMolecules: ['Glycosyltransferases', 'Mannose-6-phosphate receptor', 'COPI', 'Clathrin'],
    relatedPathways: [],
    clinical:
      'I-cell disease (mucolipidosis II): failure to add mannose-6-phosphate means lysosomal enzymes are secreted instead of delivered to lysosomes.',
    evidence: 'established',
    references: [go('GO:0005794', 'Golgi apparatus'), MBOC],
  },
  {
    id: 'lysosomes',
    name: 'Lysosomes',
    kind: 'organelle',
    aliases: ['lysosome'],
    topic: 'cell-biology',
    summary: 'Acidic degradative organelles — the cell’s recycling centre.',
    function:
      'Degrade macromolecules delivered by endocytosis, phagocytosis and autophagy using ~60 acid hydrolases; lysosomal surface hosts mTORC1 activation by amino acids.',
    structure: 'Single membrane, lumen pH ~4.5–5 maintained by the V-type H⁺-ATPase; heavily glycosylated membrane proteins (LAMP1/2) protect the membrane.',
    keyMolecules: ['V-ATPase', 'Cathepsins', 'LAMP1', 'mTORC1 (on surface)'],
    relatedPathways: ['pi3k-akt-mtor'],
    clinical: 'Lysosomal storage diseases, e.g. Tay–Sachs (hexosaminidase A), Gaucher (glucocerebrosidase), Pompe (acid α-glucosidase).',
    evidence: 'established',
    references: [go('GO:0005764', 'lysosome'), MBOC],
  },
  {
    id: 'peroxisomes',
    name: 'Peroxisomes',
    kind: 'organelle',
    aliases: ['peroxisome', 'microbody'],
    topic: 'cell-biology',
    summary: 'Single-membrane organelles that oxidise very-long-chain fatty acids and detoxify H₂O₂.',
    function:
      'β-oxidation of very-long-chain and branched fatty acids, plasmalogen synthesis, and breakdown of hydrogen peroxide by catalase.',
    structure: 'Single membrane; proteins imported post-translationally via PTS1/PTS2 signals and PEX proteins; often contain a crystalline urate-oxidase core in non-primate cells.',
    keyMolecules: ['Catalase', 'Acyl-CoA oxidase', 'PEX proteins'],
    relatedPathways: ['beta-oxidation'],
    clinical: 'Zellweger spectrum disorders (PEX mutations) and X-linked adrenoleukodystrophy (ABCD1) cause very-long-chain fatty acid accumulation.',
    evidence: 'established',
    references: [go('GO:0005777', 'peroxisome'), MBOC],
  },
  {
    id: 'centrosome',
    name: 'Centrosome',
    kind: 'organelle',
    aliases: ['centriole', 'centrioles', 'MTOC', 'microtubule organising centre'],
    topic: 'cell-biology',
    summary: 'Main microtubule-organising centre; duplicates once per cycle and forms the spindle poles.',
    function:
      'Nucleates microtubules via γ-tubulin ring complexes; in mitosis the two centrosomes separate to organise the bipolar spindle. The mother centriole can template a primary cilium in G0/G1.',
    structure:
      'Two orthogonal centrioles (each a cylinder of nine microtubule triplets, ~250 nm × 500 nm) surrounded by pericentriolar material (pericentrin, CDK5RAP2, γ-TuRC).',
    keyMolecules: ['γ-Tubulin', 'PLK4', 'Pericentrin', 'Aurora A', 'PLK1'],
    relatedPathways: ['cell-cycle-regulation'],
    clinical: 'Centrosome amplification drives chromosomal instability in many cancers; mutations in centrosome genes (e.g. CDK5RAP2, ASPM-related pathways) cause primary microcephaly.',
    evidence: 'established',
    references: [go('GO:0005813', 'centrosome'), MBOC],
  },
]
