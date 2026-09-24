import type { ProteinStructureInfo } from './schema'

/**
 * Experimentally determined structures loaded live from the RCSB PDB.
 * Residue numbers follow each entry's own numbering.
 */
export const STRUCTURES: ProteinStructureInfo[] = [
  {
    pdb: '1TUP', title: 'p53 core domain bound to DNA', entity: 'p53', method: 'X-ray, 2.2 Å (Cho et al., 1994, Science 265:346)',
    description: 'The central DNA-binding domain of p53 in complex with a consensus DNA site. A zinc ion stabilises the loops that contact DNA.',
    function: 'Sequence-specific DNA binding by the p53 tetramer to activate target genes such as CDKN1A (p21).',
    sites: [
      { chain: 'B', resi: 175, label: 'R175 hotspot (structural)' },
      { chain: 'B', resi: 245, label: 'G245 hotspot' },
      { chain: 'B', resi: 248, label: 'R248 hotspot (DNA contact)' },
      { chain: 'B', resi: 249, label: 'R249 hotspot' },
      { chain: 'B', resi: 273, label: 'R273 hotspot (DNA contact)' },
      { chain: 'B', resi: 282, label: 'R282 hotspot' },
    ],
    ligands: [{ resn: 'ZN', label: 'Zn²⁺ (C176, H179, C238, C242)' }],
  },
  {
    pdb: '1M17', title: 'EGFR kinase domain with erlotinib', entity: 'egfr', method: 'X-ray, 2.6 Å (Stamos et al., 2002, J Biol Chem 277:46265)',
    description: 'The EGFR tyrosine kinase domain bound to the ATP-competitive inhibitor erlotinib (ligand code AQ4). This entry uses mature-protein numbering (subtract 24 from precursor numbering).',
    function: 'Erlotinib occupies the ATP pocket; its quinazoline N1 hydrogen-bonds to the hinge methionine.',
    sites: [
      { resi: 769, label: 'Met769 hinge (Met793 in precursor numbering)' },
      { resi: 766, label: 'Thr766 gatekeeper (Thr790 in precursor numbering; T790M = resistance)' },
    ],
    ligands: [{ resn: 'AQ4', label: 'Erlotinib' }],
  },
  {
    pdb: '1FIN', title: 'Cyclin A–CDK2 complex', entity: 'cdk2', method: 'X-ray, 2.3 Å (Jeffrey et al., 1995, Nature 376:313)',
    description: 'CDK2 (chain A) bound to cyclin A (chain B) with ATP. Cyclin binding reorients the PSTAIRE helix and T-loop, partially activating the kinase.',
    function: 'Shows how a cyclin activates its CDK — the core engine of the cell cycle.',
    sites: [
      { chain: 'A', resi: 33, label: 'Lys33 (ATP binding)' },
      { chain: 'A', resi: 51, label: 'Glu51 (PSTAIRE helix)' },
      { chain: 'A', resi: 145, label: 'Asp145 (DFG motif)' },
      { chain: 'A', resi: 160, label: 'Thr160 (CAK activating site)' },
    ],
    ligands: [{ resn: 'ATP', label: 'ATP' }],
  },
  {
    pdb: '6OIM', title: 'KRAS G12C with sotorasib', entity: 'ras', method: 'X-ray, 1.65 Å (Canon et al., 2019, Nature 575:217)',
    description: 'GDP-bound KRAS G12C covalently modified at Cys12 by sotorasib (AMG 510), which occupies the switch-II pocket.',
    function: 'Covalent inhibitor locks KRAS G12C in its inactive GDP-bound state.',
    sites: [
      { resi: 12, label: 'Cys12 (G12C mutation, covalent attachment)' },
      { resi: 61, label: 'Gln61 (catalytic; Q61 mutations are oncogenic)' },
    ],
    ligands: [{ resn: 'MOV', label: 'Sotorasib' }, { resn: 'GDP', label: 'GDP' }],
  },
  {
    pdb: '1HRC', title: 'Cytochrome c (horse heart)', entity: 'cytc', method: 'X-ray, 1.9 Å (Bushnell et al., 1990, J Mol Biol 214:585)',
    description: 'Mitochondrial cytochrome c with covalently bound haem c. Horse and human cytochrome c are highly similar.',
    function: 'Electron carrier between complexes III and IV; apoptotic trigger when released to the cytosol.',
    sites: [
      { resi: 18, label: 'His18 (axial haem ligand)' },
      { resi: 80, label: 'Met80 (axial haem ligand)' },
    ],
    ligands: [{ resn: 'HEC', label: 'Haem c' }],
  },
  {
    pdb: '1UBQ', title: 'Ubiquitin', entity: 'ubiquitin', method: 'X-ray, 1.8 Å (Vijay-Kumar et al., 1987, J Mol Biol 194:531)',
    description: 'The 76-residue β-grasp fold of human ubiquitin.',
    function: 'Covalent protein tag; chain linkage type determines the outcome (K48 → proteasome, K63 → signalling).',
    sites: [
      { resi: 48, label: 'Lys48 (degradation chains)' },
      { resi: 63, label: 'Lys63 (signalling chains)' },
      { resi: 76, label: 'Gly76 (C-terminus, conjugated to substrates)' },
    ],
  },
  {
    pdb: '4HHB', title: 'Deoxy-haemoglobin', entity: 'hemoglobin', method: 'X-ray, 1.74 Å (Fermi et al., 1984, J Mol Biol 175:159)',
    description: 'Human α₂β₂ haemoglobin in the T (deoxy) state with four haem groups.',
    function: 'Cooperative O₂ transport — the classic allosteric protein.',
    sites: [
      { chain: 'A', resi: 87, label: 'α His87 (proximal histidine, F8)' },
      { chain: 'B', resi: 92, label: 'β His92 (proximal histidine, F8)' },
      { chain: 'B', resi: 6, label: 'β Glu6 (Val in sickle-cell HbS)' },
    ],
    ligands: [{ resn: 'HEM', label: 'Haem' }],
  },
  {
    pdb: '1BNA', title: 'B-DNA dodecamer', method: 'X-ray, 1.9 Å (Drew et al., 1981, PNAS 78:2179)',
    description: 'The Dickerson–Drew dodecamer CGCGAATTCGCG: the first single-crystal structure of a full turn of B-DNA.',
    function: 'Reveals the major and minor grooves and the narrow minor groove of the AATT tract.',
  },
]
