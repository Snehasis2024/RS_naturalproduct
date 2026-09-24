import type { Evidence } from './schema'

/** Standard genetic code (RNA codons → one-letter amino acid, '*' = stop). */
export const GENETIC_CODE: Record<string, string> = (() => {
  const bases = 'UCAG'
  const aa = 'FFLLSSSSYY**CC*WLLLLPPPPHHQQRRRRIIIMTTTTNNKKSSRRVVVVAAAADDEEGGGG'
  const out: Record<string, string> = {}
  let i = 0
  for (const a of bases) for (const b of bases) for (const c of bases) out[a + b + c] = aa[i++]
  return out
})()

export const AA_NAMES: Record<string, string> = {
  A: 'Alanine', R: 'Arginine', N: 'Asparagine', D: 'Aspartate', C: 'Cysteine', E: 'Glutamate', Q: 'Glutamine',
  G: 'Glycine', H: 'Histidine', I: 'Isoleucine', L: 'Leucine', K: 'Lysine', M: 'Methionine', F: 'Phenylalanine',
  P: 'Proline', S: 'Serine', T: 'Threonine', W: 'Tryptophan', Y: 'Tyrosine', V: 'Valine', '*': 'Stop',
}

/** Side-chain class, used for colouring residues. */
export const AA_CLASS: Record<string, 'hydrophobic' | 'polar' | 'positive' | 'negative' | 'special'> = {
  A: 'hydrophobic', V: 'hydrophobic', L: 'hydrophobic', I: 'hydrophobic', M: 'hydrophobic', F: 'hydrophobic', W: 'hydrophobic',
  S: 'polar', T: 'polar', N: 'polar', Q: 'polar', Y: 'polar', C: 'polar',
  K: 'positive', R: 'positive', H: 'positive', D: 'negative', E: 'negative', G: 'special', P: 'special',
}

/**
 * Illustrative two-exon gene (coding strand, 5′→3′). NOT a real human gene:
 * it is designed to show a start codon, a GT…AG intron and a stop codon.
 */
export const DEMO_GENE = {
  exon1: 'ATGGCCAAG',
  intron: 'GTAAGTCTTTACAG',
  exon2: 'GAACTGTTCACCGGTTGA',
}

export const complement = (s: string) => s.replace(/[ATGC]/g, (b) => ({ A: 'T', T: 'A', G: 'C', C: 'G' })[b]!)
export const toRNA = (coding: string) => coding.replace(/T/g, 'U')
export function translate(mrna: string) {
  const out: { codon: string; aa: string }[] = []
  for (let i = 0; i + 3 <= mrna.length; i += 3) {
    const codon = mrna.slice(i, i + 3)
    const aa = GENETIC_CODE[codon]
    out.push({ codon, aa })
    if (aa === '*') break
  }
  return out
}

export interface DogmaStage {
  id: string
  name: string
  where: string
  summary: string
  steps: string[]
  molecules: string[]
  evidence: Evidence
  zoomTargets: string[]
}

export const DOGMA_STAGES: DogmaStage[] = [
  {
    id: 'dna', name: 'DNA double helix', where: 'Nucleus', evidence: 'established',
    summary: 'Two antiparallel polynucleotide strands wound into a right-handed B-form helix (~10.5 bp per turn, 3.4 Å rise, 20 Å diameter). A pairs with T (2 H-bonds), G with C (3 H-bonds).',
    steps: ['Sugar–phosphate backbones run 5′→3′ in opposite directions', 'Bases stack in the core; major and minor grooves expose base edges to proteins', 'Sequence is read by transcription factors in the major groove'],
    molecules: ['damp', 'dtmp'], zoomTargets: ['Double helix', 'Nucleotide (dAMP)', 'Base pair'],
  },
  {
    id: 'replication', name: 'DNA replication', where: 'Nucleus, S phase', evidence: 'simplified',
    summary: 'The helicase unwinds the parental duplex at a fork. DNA polymerase synthesises the leading strand continuously and the lagging strand as Okazaki fragments, which are later joined by DNA ligase. Each daughter duplex keeps one parental strand (semi-conservative).',
    steps: ['CMG helicase unwinds DNA (topoisomerases relieve supercoiling)', 'Primase lays down RNA primers', 'Pol ε extends the leading strand continuously 5′→3′', 'Pol δ synthesises Okazaki fragments on the lagging strand', 'RNase H/FEN1 remove primers; ligase seals nicks'],
    molecules: ['damp', 'dtmp', 'atp'], zoomTargets: ['Replication fork', 'Helicase', 'DNA polymerase'],
  },
  {
    id: 'transcription', name: 'Transcription', where: 'Nucleus', evidence: 'simplified',
    summary: 'RNA polymerase II opens a transcription bubble at the promoter and synthesises pre-mRNA 5′→3′, reading the template strand 3′→5′. The RNA sequence matches the coding strand, with U in place of T.',
    steps: ['General transcription factors (TFIID binds TATA) recruit Pol II', 'Promoter melting forms the bubble (~12–14 bp)', 'Elongation: NTPs added complementary to the template strand', 'Termination after the poly(A) signal'],
    molecules: ['rnapol2', 'atp'], zoomTargets: ['RNA polymerase II', 'Transcription bubble', 'Nascent mRNA'],
  },
  {
    id: 'processing', name: 'RNA processing', where: 'Nucleus (co-transcriptional)', evidence: 'simplified',
    summary: 'Pre-mRNA receives a 5′ 7-methylguanosine cap, introns are removed by the spliceosome (GU…AG rule, branch-point A), and a poly(A) tail is added after cleavage downstream of AAUAAA. The mature mRNA is exported through nuclear pores.',
    steps: ['5′ capping (m7GpppN) protects mRNA and aids ribosome recruitment', 'Spliceosome (snRNPs U1, U2, U4/U6, U5) excises the intron as a lariat', 'Exons are ligated', 'Cleavage and polyadenylation (~200 A)', 'Export via the nuclear pore complex'],
    molecules: [], zoomTargets: ['5′ cap', 'Intron (lariat)', 'Poly(A) tail'],
  },
  {
    id: 'translation', name: 'Translation', where: 'Cytoplasm (ribosomes)', evidence: 'simplified',
    summary: 'The small ribosomal subunit scans from the cap to the AUG start codon. Aminoacyl-tRNAs enter the A site; the ribosome catalyses peptide-bond formation and translocates one codon at a time (A → P → E sites) until a stop codon recruits release factors.',
    steps: ['Initiation: 43S complex scans to AUG; Met-tRNAi in P site; 60S joins', 'Elongation: eEF1A delivers aa-tRNA to the A site (GTP hydrolysis)', 'Peptidyl transfer in the 60S subunit (rRNA-catalysed)', 'eEF2 translocates the ribosome by one codon', 'Termination: stop codon → eRF1/eRF3 release the peptide'],
    molecules: ['atp'], zoomTargets: ['Ribosome', 'tRNA', 'Codon / anticodon', 'Growing polypeptide'],
  },
  {
    id: 'folding', name: 'Protein folding', where: 'Cytoplasm / ER', evidence: 'hypothetical',
    summary: 'The chain collapses around hydrophobic residues and forms secondary structure (α-helices, β-sheets) and a tertiary fold, often helped by chaperones (HSP70, chaperonins). The animation is a visual metaphor: real folding pathways are specific to each protein.',
    steps: ['Hydrophobic collapse buries non-polar side chains', 'Local hydrogen bonds form α-helices and β-strands', 'Chaperones prevent aggregation', 'Native fold = minimum free energy state (Anfinsen)'],
    molecules: ['ubiquitin'], zoomTargets: ['Polypeptide', 'α-helix', 'Folded protein'],
  },
]
