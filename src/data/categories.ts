export interface ChemicalCategoryMeta {
  id: string;
  nameId: string;
  nameEn: string;
  accentHex: string;
  surfaceHex: string;
  borderHex: string;
  textHex: string;
  summary: string;
}

export const CHEMICAL_CATEGORIES: ChemicalCategoryMeta[] = [
  {
    id: 'Logam alkali',
    nameId: 'Logam alkali',
    nameEn: 'Alkali Metals',
    accentHex: '#FF6B6B',
    surfaceHex: '#2C171D',
    borderHex: '#7A2D3B',
    textHex: '#FCA5A5',
    summary: 'Group 1 reactive metals (excluding H) with 1 valence electron and low ionization energy.',
  },
  {
    id: 'Logam alkali tanah',
    nameId: 'Logam alkali tanah',
    nameEn: 'Alkaline Earth Metals',
    accentHex: '#FF9E44',
    surfaceHex: '#2B1F14',
    borderHex: '#7C4B1E',
    textHex: '#FDBA74',
    summary: 'Group 2 shiny, moderately reactive metals forming +2 cations.',
  },
  {
    id: 'Logam transisi',
    nameId: 'Logam transisi',
    nameEn: 'Transition Metals',
    accentHex: '#3B82F6',
    surfaceHex: '#152238',
    borderHex: '#294E8A',
    textHex: '#93C5FD',
    summary: 'd-block metals with variable oxidation states, catalytic properties, and high melting points.',
  },
  {
    id: 'Logam pascatransisi',
    nameId: 'Logam pascatransisi',
    nameEn: 'Post-Transition Metals',
    accentHex: '#10B981',
    surfaceHex: '#132824',
    borderHex: '#206352',
    textHex: '#6EE7B7',
    summary: 'p-block metals located between transition metals and metalloids with softer mechanical structure.',
  },
  {
    id: 'Metaloid',
    nameId: 'Metaloid',
    nameEn: 'Metalloids',
    accentHex: '#EAB308',
    surfaceHex: '#282412',
    borderHex: '#6D5D1C',
    textHex: '#FDE047',
    summary: 'Semiconducting elements exhibiting intermediate metallic and nonmetallic behavior.',
  },
  {
    id: 'Nonlogam',
    nameId: 'Nonlogam',
    nameEn: 'Reactive Nonmetals',
    accentHex: '#22C55E',
    surfaceHex: '#14291D',
    borderHex: '#236942',
    textHex: '#86EFAC',
    summary: 'Electronegative nonmetals essential to organic life, acids, and covalent bonding.',
  },
  {
    id: 'Halogen',
    nameId: 'Halogen',
    nameEn: 'Halogens',
    accentHex: '#EC4899',
    surfaceHex: '#2D1627',
    borderHex: '#7E2866',
    textHex: '#F9A8D4',
    summary: 'Group 17 highly reactive diatomic salt-forming elements with 7 valence electrons.',
  },
  {
    id: 'Gas mulia',
    nameId: 'Gas mulia',
    nameEn: 'Noble Gases',
    accentHex: '#A855F7',
    surfaceHex: '#231733',
    borderHex: '#5E3094',
    textHex: '#D8B4FE',
    summary: 'Group 18 monatomic gases with filled valence shells and minimal chemical reactivity.',
  },
  {
    id: 'Lantanida',
    nameId: 'Lantanida',
    nameEn: 'Lanthanides',
    accentHex: '#06B6D4',
    surfaceHex: '#12262E',
    borderHex: '#1E6178',
    textHex: '#67E8F9',
    summary: '4f rare-earth series (La–Lu) prized in magnets, optics, and phosphors.',
  },
  {
    id: 'Aktinida',
    nameId: 'Aktinida',
    nameEn: 'Actinides',
    accentHex: '#F43F5E',
    surfaceHex: '#2E161E',
    borderHex: '#822744',
    textHex: '#FDA4AF',
    summary: '5f radioactive elements (Ac–Lr), including nuclear fuels and synthetic transuranics.',
  },
];

export const CATEGORY_META_BY_ID: Record<string, ChemicalCategoryMeta> = Object.fromEntries(
  CHEMICAL_CATEGORIES.map((c) => [c.id, c])
);

export const GROUP_TRADITIONAL_LABELS: Record<number, string> = {
  1: 'IA',
  2: 'IIA',
  3: 'IIIB',
  4: 'IVB',
  5: 'VB',
  6: 'VIB',
  7: 'VIIB',
  8: 'VIIIB',
  9: 'VIIIB',
  10: 'VIIIB',
  11: 'IB',
  12: 'IIB',
  13: 'IIIA',
  14: 'IVA',
  15: 'VA',
  16: 'VIA',
  17: 'VIIA',
  18: 'VIIIA',
};

export const MATTER_STATE_META = {
  Solid: {
    label: 'Solid',
    labelId: 'Padat',
    hex: '#3B82F6',
    bgHex: '#17284A',
    borderHex: '#3B82F6',
    textHex: '#93C5FD',
  },
  Liquid: {
    label: 'Liquid',
    labelId: 'Cair',
    hex: '#FACC15',
    bgHex: '#382F10',
    borderHex: '#EAB308',
    textHex: '#FEF08A',
  },
  Gas: {
    label: 'Gas',
    labelId: 'Gas',
    hex: '#EF4444',
    bgHex: '#3B161B',
    borderHex: '#EF4444',
    textHex: '#FCA5A5',
  },
  Unknown: {
    label: 'Unknown',
    labelId: 'Tidak Diketahui',
    hex: '#6B7280',
    bgHex: '#1F2229',
    borderHex: '#6B7280',
    textHex: '#D1D5DB',
  },
} as const;
