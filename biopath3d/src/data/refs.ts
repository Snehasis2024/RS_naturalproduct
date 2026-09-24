import type { Reference } from './schema'

/** Helpers that build links to authoritative databases. */
export const uniprot = (acc: string): Reference => ({
  label: `UniProt ${acc}`,
  url: `https://www.uniprot.org/uniprotkb/${acc}/entry`,
})
export const pdb = (id: string): Reference => ({ label: `PDB ${id}`, url: `https://www.rcsb.org/structure/${id}` })
export const kegg = (map: string, name: string): Reference => ({
  label: `KEGG ${map} (${name})`,
  url: `https://www.kegg.jp/pathway/${map}`,
})
export const reactome = (q: string): Reference => ({
  label: `Reactome: ${q}`,
  url: `https://reactome.org/content/query?q=${encodeURIComponent(q)}&species=Homo+sapiens`,
})
export const go = (id: string, name: string): Reference => ({
  label: `GO ${id} (${name})`,
  url: `https://www.ebi.ac.uk/QuickGO/term/${id}`,
})
export const chebi = (id: string): Reference => ({
  label: id,
  url: `https://www.ebi.ac.uk/chebi/searchId.do?chebiId=${id}`,
})
export const ncbiGene = (symbol: string): Reference => ({
  label: `NCBI Gene: ${symbol}`,
  url: `https://www.ncbi.nlm.nih.gov/gene/?term=${encodeURIComponent(symbol)}%5Bsym%5D+AND+human%5Borgn%5D`,
})
export const MBOC: Reference = {
  label: 'Alberts et al., Molecular Biology of the Cell, 4th ed. (NCBI Bookshelf)',
  url: 'https://www.ncbi.nlm.nih.gov/books/NBK21054/',
}
export const LODISH: Reference = {
  label: 'Lodish et al., Molecular Cell Biology, 4th ed. (NCBI Bookshelf)',
  url: 'https://www.ncbi.nlm.nih.gov/books/NBK21475/',
}
export const BERG: Reference = {
  label: 'Berg, Tymoczko & Stryer, Biochemistry, 5th ed. (NCBI Bookshelf)',
  url: 'https://www.ncbi.nlm.nih.gov/books/NBK21154/',
}
