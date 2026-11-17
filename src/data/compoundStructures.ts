export type StructureRepresentation = 'covalent' | 'ionic_lattice' | 'covalent_network';
export type BondOrder = 1 | 2 | 3 | 'ionic' | 'network';

export interface CompoundAtom {
  id: string;
  atomicNumber: number;
  symbol: string;
  x: number; // Ångström coordinates centered near (0,0,0)
  y: number;
  z: number;
  role?: string; // e.g., 'Cu²⁺ cation', 'Carbonyl C', 'Bridging O'
}

export interface CompoundBond {
  from: number; // atom index in atoms[]
  to: number; // atom index in atoms[]
  order: BondOrder;
}

export interface CompoundStructure3D {
  compoundId: string;
  representation: StructureRepresentation;
  geometrySummary: string;
  unitCellNote?: string;
  source: string;
  atoms: CompoundAtom[];
  bonds: CompoundBond[];
}

export interface CPKStyle {
  color: string;
  covalentRadius: number;
  vdwRadius: number;
}

export const CPK_STYLES: Record<string, CPKStyle> = {
  H: { color: '#F8FAFC', covalentRadius: 0.22, vdwRadius: 0.68 },
  C: { color: '#3F4451', covalentRadius: 0.36, vdwRadius: 1.02 },
  N: { color: '#2563EB', covalentRadius: 0.35, vdwRadius: 0.96 },
  O: { color: '#DC2626', covalentRadius: 0.34, vdwRadius: 0.92 },
  S: { color: '#EAB308', covalentRadius: 0.44, vdwRadius: 1.15 },
  P: { color: '#F97316', covalentRadius: 0.43, vdwRadius: 1.12 },
  Cl: { color: '#16A34A', covalentRadius: 0.42, vdwRadius: 1.14 },
  Si: { color: '#D97706', covalentRadius: 0.45, vdwRadius: 1.18 },
  Na: { color: '#7C3AED', covalentRadius: 0.46, vdwRadius: 1.25 },
  K: { color: '#A855F7', covalentRadius: 0.52, vdwRadius: 1.38 },
  Ca: { color: '#22C55E', covalentRadius: 0.48, vdwRadius: 1.28 },
  Mn: { color: '#9333EA', covalentRadius: 0.46, vdwRadius: 1.22 },
  Fe: { color: '#B45309', covalentRadius: 0.46, vdwRadius: 1.22 },
  Cu: { color: '#EA580C', covalentRadius: 0.45, vdwRadius: 1.20 },
  Ag: { color: '#CBD5E1', covalentRadius: 0.50, vdwRadius: 1.30 },
};

export function getCPKStyle(symbol: string): CPKStyle {
  return CPK_STYLES[symbol] || { color: '#94A3B8', covalentRadius: 0.4, vdwRadius: 1.1 };
}

function buildNaClLattice(): { atoms: CompoundAtom[]; bonds: CompoundBond[] } {
  const atoms: CompoundAtom[] = [];
  const bonds: CompoundBond[] = [];
  const spacing = 2.15;
  const idxMap: Record<string, number> = {};

  for (let ix = -1; ix <= 1; ix++) {
    for (let iy = -1; iy <= 1; iy++) {
      for (let iz = -1; iz <= 1; iz++) {
        const isNa = (Math.abs(ix + iy + iz) % 2) === 0;
        const idx = atoms.length;
        idxMap[`${ix},${iy},${iz}`] = idx;
        atoms.push({
          id: `${isNa ? 'Na' : 'Cl'}${idx}`,
          atomicNumber: isNa ? 11 : 17,
          symbol: isNa ? 'Na' : 'Cl',
          x: ix * spacing,
          y: iy * spacing,
          z: iz * spacing,
          role: isNa ? 'Na⁺ cation (octahedral)' : 'Cl⁻ anion (octahedral)',
        });
      }
    }
  }

  for (let ix = -1; ix <= 1; ix++) {
    for (let iy = -1; iy <= 1; iy++) {
      for (let iz = -1; iz <= 1; iz++) {
        const a = idxMap[`${ix},${iy},${iz}`];
        const neighbors = [
          idxMap[`${ix + 1},${iy},${iz}`],
          idxMap[`${ix},${iy + 1},${iz}`],
          idxMap[`${ix},${iy},${iz + 1}`],
        ];
        neighbors.forEach((b) => {
          if (b !== undefined) bonds.push({ from: a, to: b, order: 'ionic' });
        });
      }
    }
  }
  return { atoms, bonds };
}

const NACL_LATTICE = buildNaClLattice();

export const COMPOUND_STRUCTURES: Record<string, CompoundStructure3D> = {
  h2o: {
    compoundId: 'h2o',
    representation: 'covalent',
    geometrySummary: 'Bent (C₂v), H–O–H angle 104.5°, O–H bond 0.96 Å',
    source: 'NIST CCCBDB / PubChem CID 962',
    atoms: [
      { id: 'O1', atomicNumber: 8, symbol: 'O', x: 0.0, y: 0.35, z: 0.0, role: 'Central sp³ oxygen' },
      { id: 'H1', atomicNumber: 1, symbol: 'H', x: -0.76, y: -0.24, z: 0.0, role: 'Polar protic H' },
      { id: 'H2', atomicNumber: 1, symbol: 'H', x: 0.76, y: -0.24, z: 0.0, role: 'Polar protic H' },
    ],
    bonds: [
      { from: 0, to: 1, order: 1 },
      { from: 0, to: 2, order: 1 },
    ],
  },

  co2: {
    compoundId: 'co2',
    representation: 'covalent',
    geometrySummary: 'Linear (D∞h), O=C=O angle 180.0°, C=O bond 1.16 Å',
    source: 'NIST CCCBDB / PubChem CID 280',
    atoms: [
      { id: 'C1', atomicNumber: 6, symbol: 'C', x: 0.0, y: 0.0, z: 0.0, role: 'sp Carbon center' },
      { id: 'O1', atomicNumber: 8, symbol: 'O', x: -1.16, y: 0.0, z: 0.0, role: 'Terminal oxygen' },
      { id: 'O2', atomicNumber: 8, symbol: 'O', x: 1.16, y: 0.0, z: 0.0, role: 'Terminal oxygen' },
    ],
    bonds: [
      { from: 0, to: 1, order: 2 },
      { from: 0, to: 2, order: 2 },
    ],
  },

  nacl: {
    compoundId: 'nacl',
    representation: 'ionic_lattice',
    geometrySummary: 'Face-centered cubic (rock-salt Fm3̄m) 3×3×3 ionic crystal lattice, 6:6 coordination',
    unitCellNote: 'Shown as 27-ion rock-salt crystal lattice fragment (alternating Na⁺ and Cl⁻ ions)',
    source: 'Crystallography Open Database / ICSD NaCl',
    atoms: NACL_LATTICE.atoms,
    bonds: NACL_LATTICE.bonds,
  },

  nh3: {
    compoundId: 'nh3',
    representation: 'covalent',
    geometrySummary: 'Trigonal pyramidal (C₃v), H–N–H angle 107.0°, N–H bond 1.01 Å',
    source: 'NIST CCCBDB / PubChem CID 222',
    atoms: [
      { id: 'N1', atomicNumber: 7, symbol: 'N', x: 0.0, y: 0.28, z: 0.0, role: 'Pyramidal sp³ nitrogen' },
      { id: 'H1', atomicNumber: 1, symbol: 'H', x: 0.94, y: -0.10, z: 0.0, role: 'Hydrogen' },
      { id: 'H2', atomicNumber: 1, symbol: 'H', x: -0.47, y: -0.10, z: 0.81, role: 'Hydrogen' },
      { id: 'H3', atomicNumber: 1, symbol: 'H', x: -0.47, y: -0.10, z: -0.81, role: 'Hydrogen' },
    ],
    bonds: [
      { from: 0, to: 1, order: 1 },
      { from: 0, to: 2, order: 1 },
      { from: 0, to: 3, order: 1 },
    ],
  },

  ch4: {
    compoundId: 'ch4',
    representation: 'covalent',
    geometrySummary: 'Tetrahedral (Td), H–C–H angle 109.5°, C–H bond 1.09 Å',
    source: 'NIST CCCBDB / PubChem CID 297',
    atoms: [
      { id: 'C1', atomicNumber: 6, symbol: 'C', x: 0.0, y: 0.0, z: 0.0, role: 'sp³ Carbon center' },
      { id: 'H1', atomicNumber: 1, symbol: 'H', x: 0.63, y: 0.63, z: 0.63, role: 'Hydrogen' },
      { id: 'H2', atomicNumber: 1, symbol: 'H', x: -0.63, y: -0.63, z: 0.63, role: 'Hydrogen' },
      { id: 'H3', atomicNumber: 1, symbol: 'H', x: -0.63, y: 0.63, z: -0.63, role: 'Hydrogen' },
      { id: 'H4', atomicNumber: 1, symbol: 'H', x: 0.63, y: -0.63, z: -0.63, role: 'Hydrogen' },
    ],
    bonds: [
      { from: 0, to: 1, order: 1 },
      { from: 0, to: 2, order: 1 },
      { from: 0, to: 3, order: 1 },
      { from: 0, to: 4, order: 1 },
    ],
  },

  hcl: {
    compoundId: 'hcl',
    representation: 'covalent',
    geometrySummary: 'Linear polar diatomic (C∞v), H–Cl bond 1.27 Å',
    source: 'NIST CCCBDB / PubChem CID 313',
    atoms: [
      { id: 'Cl1', atomicNumber: 17, symbol: 'Cl', x: 0.35, y: 0.0, z: 0.0, role: 'Electronegative chlorine (δ⁻)' },
      { id: 'H1', atomicNumber: 1, symbol: 'H', x: -0.92, y: 0.0, z: 0.0, role: 'Acidic hydrogen (δ⁺)' },
    ],
    bonds: [{ from: 0, to: 1, order: 1 }],
  },

  h2so4: {
    compoundId: 'h2so4',
    representation: 'covalent',
    geometrySummary: 'Distorted tetrahedral sulfur center (2 S=O double bonds 1.42 Å, 2 S–OH single bonds 1.57 Å)',
    source: 'PubChem CID 1118 / Gas-phase electron diffraction',
    atoms: [
      { id: 'S1', atomicNumber: 16, symbol: 'S', x: 0.0, y: 0.0, z: 0.0, role: 'Hexavalent S(+6) center' },
      { id: 'O1', atomicNumber: 8, symbol: 'O', x: 0.0, y: 1.05, z: 0.96, role: 'Oxo (=O) oxygen' },
      { id: 'O2', atomicNumber: 8, symbol: 'O', x: 0.0, y: 1.05, z: -0.96, role: 'Oxo (=O) oxygen' },
      { id: 'O3', atomicNumber: 8, symbol: 'O', x: 1.14, y: -1.08, z: 0.0, role: 'Hydroxyl (-OH) oxygen' },
      { id: 'O4', atomicNumber: 8, symbol: 'O', x: -1.14, y: -1.08, z: 0.0, role: 'Hydroxyl (-OH) oxygen' },
      { id: 'H1', atomicNumber: 1, symbol: 'H', x: 1.88, y: -0.68, z: 0.45, role: 'Acidic proton' },
      { id: 'H2', atomicNumber: 1, symbol: 'H', x: -1.88, y: -0.68, z: -0.45, role: 'Acidic proton' },
    ],
    bonds: [
      { from: 0, to: 1, order: 2 },
      { from: 0, to: 2, order: 2 },
      { from: 0, to: 3, order: 1 },
      { from: 0, to: 4, order: 1 },
      { from: 3, to: 5, order: 1 },
      { from: 4, to: 6, order: 1 },
    ],
  },

  naoh: {
    compoundId: 'naoh',
    representation: 'ionic_lattice',
    geometrySummary: 'Ionic orthorhombic crystal motif: Na⁺ cations coordinated to covalent OH⁻ hydroxide anions',
    unitCellNote: '2 Na⁺ · 2 OH⁻ crystal unit motif',
    source: 'ICSD NaOH Crystal Structure / PubChem CID 14798',
    atoms: [
      { id: 'Na1', atomicNumber: 11, symbol: 'Na', x: -1.55, y: 0.75, z: 0.0, role: 'Na⁺ cation' },
      { id: 'Na2', atomicNumber: 11, symbol: 'Na', x: 1.55, y: -0.75, z: 0.0, role: 'Na⁺ cation' },
      { id: 'O1', atomicNumber: 8, symbol: 'O', x: 0.0, y: 0.85, z: 1.15, role: 'OH⁻ hydroxide oxygen' },
      { id: 'H1', atomicNumber: 1, symbol: 'H', x: 0.0, y: 1.62, z: 1.72, role: 'OH⁻ proton' },
      { id: 'O2', atomicNumber: 8, symbol: 'O', x: 0.0, y: -0.85, z: -1.15, role: 'OH⁻ hydroxide oxygen' },
      { id: 'H2', atomicNumber: 1, symbol: 'H', x: 0.0, y: -1.62, z: -1.72, role: 'OH⁻ proton' },
    ],
    bonds: [
      { from: 2, to: 3, order: 1 },
      { from: 4, to: 5, order: 1 },
      { from: 0, to: 2, order: 'ionic' },
      { from: 0, to: 4, order: 'ionic' },
      { from: 1, to: 2, order: 'ionic' },
      { from: 1, to: 4, order: 'ionic' },
    ],
  },

  caco3: {
    compoundId: 'caco3',
    representation: 'ionic_lattice',
    geometrySummary: 'Calcite ionic lattice motif: Ca²⁺ cations with trigonal-planar CO₃²⁻ carbonate ions (120°, C–O 1.28 Å)',
    unitCellNote: '2 Ca²⁺ · 2 CO₃²⁻ ionic coordination motif',
    source: 'COD Calcite (R3̄c) / PubChem CID 10112',
    atoms: [
      // Ca2+ ions
      { id: 'Ca1', atomicNumber: 20, symbol: 'Ca', x: -2.2, y: 0.0, z: 0.0, role: 'Ca²⁺ cation' },
      { id: 'Ca2', atomicNumber: 20, symbol: 'Ca', x: 2.2, y: 0.0, z: 0.0, role: 'Ca²⁺ cation' },
      // Carbonate #1
      { id: 'C1', atomicNumber: 6, symbol: 'C', x: 0.0, y: 1.35, z: 0.0, role: 'sp² Carbonate C' },
      { id: 'O1', atomicNumber: 8, symbol: 'O', x: -1.11, y: 0.71, z: 0.0, role: 'Carbonate O' },
      { id: 'O2', atomicNumber: 8, symbol: 'O', x: 1.11, y: 0.71, z: 0.0, role: 'Carbonate O' },
      { id: 'O3', atomicNumber: 8, symbol: 'O', x: 0.0, y: 2.63, z: 0.0, role: 'Carbonate O' },
      // Carbonate #2
      { id: 'C2', atomicNumber: 6, symbol: 'C', x: 0.0, y: -1.35, z: 0.0, role: 'sp² Carbonate C' },
      { id: 'O4', atomicNumber: 8, symbol: 'O', x: -1.11, y: -0.71, z: 0.0, role: 'Carbonate O' },
      { id: 'O5', atomicNumber: 8, symbol: 'O', x: 1.11, y: -0.71, z: 0.0, role: 'Carbonate O' },
      { id: 'O6', atomicNumber: 8, symbol: 'O', x: 0.0, y: -2.63, z: 0.0, role: 'Carbonate O' },
    ],
    bonds: [
      { from: 2, to: 3, order: 1 },
      { from: 2, to: 4, order: 1 },
      { from: 2, to: 5, order: 2 },
      { from: 6, to: 7, order: 1 },
      { from: 6, to: 8, order: 1 },
      { from: 6, to: 9, order: 2 },
      { from: 0, to: 3, order: 'ionic' },
      { from: 0, to: 7, order: 'ionic' },
      { from: 1, to: 4, order: 'ionic' },
      { from: 1, to: 8, order: 'ionic' },
    ],
  },

  // 1. REQUIRED DEMO: Fe₂O₃ — Hematite / Corundum Ionic Crystal Lattice Motif (NOT a discrete molecule)
  fe2o3: {
    compoundId: 'fe2o3',
    representation: 'ionic_lattice',
    geometrySummary: 'Hematite (α-Fe₂O₃, R3̄c corundum structure): octahedral Fe³⁺ ions coordinated by hexagonal close-packed O²⁻ layers',
    unitCellNote: 'Crystal lattice representation (6 Fe³⁺ : 9 O²⁻ = 2:3 stoichiometry, Fe–O ~1.98–2.10 Å)',
    source: 'Crystallography Open Database (α-Fe₂O₃ Hematite)',
    atoms: [
      // Lower O²⁻ layer (z = -1.35)
      { id: 'O1', atomicNumber: 8, symbol: 'O', x: -1.45, y: -1.25, z: -1.35, role: 'O²⁻ lattice anion' },
      { id: 'O2', atomicNumber: 8, symbol: 'O', x: 1.45, y: -1.25, z: -1.35, role: 'O²⁻ lattice anion' },
      { id: 'O3', atomicNumber: 8, symbol: 'O', x: 0.0, y: 1.25, z: -1.35, role: 'O²⁻ lattice anion' },
      // Lower Fe³⁺ octahedral layer (z = -0.65)
      { id: 'Fe1', atomicNumber: 26, symbol: 'Fe', x: -0.95, y: -0.15, z: -0.65, role: 'Fe³⁺ (octahedral)' },
      { id: 'Fe2', atomicNumber: 26, symbol: 'Fe', x: 0.95, y: -0.15, z: -0.65, role: 'Fe³⁺ (octahedral)' },
      // Middle O²⁻ shared bridging layer (z = 0.0)
      { id: 'O4', atomicNumber: 8, symbol: 'O', x: 0.0, y: -1.35, z: 0.0, role: 'O²⁻ bridging anion' },
      { id: 'O5', atomicNumber: 8, symbol: 'O', x: -1.45, y: 1.15, z: 0.0, role: 'O²⁻ bridging anion' },
      { id: 'O6', atomicNumber: 8, symbol: 'O', x: 1.45, y: 1.15, z: 0.0, role: 'O²⁻ bridging anion' },
      // Upper Fe³⁺ octahedral layer (z = +0.65)
      { id: 'Fe3', atomicNumber: 26, symbol: 'Fe', x: -0.95, y: 0.2, z: 0.65, role: 'Fe³⁺ (octahedral)' },
      { id: 'Fe4', atomicNumber: 26, symbol: 'Fe', x: 0.95, y: 0.2, z: 0.65, role: 'Fe³⁺ (octahedral)' },
      // Top O²⁻ layer (z = +1.35)
      { id: 'O7', atomicNumber: 8, symbol: 'O', x: 0.0, y: -1.2, z: 1.35, role: 'O²⁻ lattice anion' },
      { id: 'O8', atomicNumber: 8, symbol: 'O', x: -1.45, y: 1.25, z: 1.35, role: 'O²⁻ lattice anion' },
      { id: 'O9', atomicNumber: 8, symbol: 'O', x: 1.45, y: 1.25, z: 1.35, role: 'O²⁻ lattice anion' },
      // Outer axial Fe³⁺ pair completing 2:3 formula ratio (6 Fe : 9 O)
      { id: 'Fe5', atomicNumber: 26, symbol: 'Fe', x: 0.0, y: 0.0, z: -2.05, role: 'Fe³⁺ (octahedral)' },
      { id: 'Fe6', atomicNumber: 26, symbol: 'Fe', x: 0.0, y: 0.0, z: 2.05, role: 'Fe³⁺ (octahedral)' },
    ],
    bonds: [
      // Fe1 coordination
      { from: 3, to: 0, order: 'ionic' },
      { from: 3, to: 2, order: 'ionic' },
      { from: 3, to: 5, order: 'ionic' },
      { from: 3, to: 6, order: 'ionic' },
      // Fe2 coordination
      { from: 4, to: 1, order: 'ionic' },
      { from: 4, to: 2, order: 'ionic' },
      { from: 4, to: 5, order: 'ionic' },
      { from: 4, to: 7, order: 'ionic' },
      // Fe3 coordination
      { from: 8, to: 5, order: 'ionic' },
      { from: 8, to: 6, order: 'ionic' },
      { from: 8, to: 10, order: 'ionic' },
      { from: 8, to: 11, order: 'ionic' },
      // Fe4 coordination
      { from: 9, to: 5, order: 'ionic' },
      { from: 9, to: 7, order: 'ionic' },
      { from: 9, to: 10, order: 'ionic' },
      { from: 9, to: 12, order: 'ionic' },
      // Fe5 & Fe6 capping
      { from: 13, to: 0, order: 'ionic' },
      { from: 13, to: 1, order: 'ionic' },
      { from: 13, to: 2, order: 'ionic' },
      { from: 14, to: 10, order: 'ionic' },
      { from: 14, to: 11, order: 'ionic' },
      { from: 14, to: 12, order: 'ionic' },
    ],
  },

  // 2. REQUIRED DEMO: SiO₂ — Extended Tetrahedral SiO₄ Covalent Network
  sio2: {
    compoundId: 'sio2',
    representation: 'covalent_network',
    geometrySummary: 'Extended 3D tetrahedral SiO₄ covalent network (O–Si–O 109.5°, Si–O–Si ~144°, Si–O 1.61 Å)',
    unitCellNote: '5 corner-sharing SiO₄ tetrahedra demonstrating extended quartz/silicate covalent network',
    source: 'Crystallography Open Database (α-Quartz / β-Cristobalite SiO₂)',
    atoms: [
      // Central Si tetrahedron
      { id: 'Si0', atomicNumber: 14, symbol: 'Si', x: 0.0, y: 0.0, z: 0.0, role: 'Central sp³ SiO₄ node' },
      // 4 bridging oxygens around Si0
      { id: 'O1', atomicNumber: 8, symbol: 'O', x: 0.93, y: 0.93, z: 0.93, role: 'Bridging oxo (Si–O–Si)' },
      { id: 'O2', atomicNumber: 8, symbol: 'O', x: -0.93, y: -0.93, z: 0.93, role: 'Bridging oxo (Si–O–Si)' },
      { id: 'O3', atomicNumber: 8, symbol: 'O', x: -0.93, y: 0.93, z: -0.93, role: 'Bridging oxo (Si–O–Si)' },
      { id: 'O4', atomicNumber: 8, symbol: 'O', x: 0.93, y: -0.93, z: -0.93, role: 'Bridging oxo (Si–O–Si)' },
      // 4 outer Si nodes
      { id: 'Si1', atomicNumber: 14, symbol: 'Si', x: 1.86, y: 1.86, z: 1.86, role: 'Corner-sharing Si node' },
      { id: 'Si2', atomicNumber: 14, symbol: 'Si', x: -1.86, y: -1.86, z: 1.86, role: 'Corner-sharing Si node' },
      { id: 'Si3', atomicNumber: 14, symbol: 'Si', x: -1.86, y: 1.86, z: -1.86, role: 'Corner-sharing Si node' },
      { id: 'Si4', atomicNumber: 14, symbol: 'Si', x: 1.86, y: -1.86, z: -1.86, role: 'Corner-sharing Si node' },
      // Peripheral network oxygens completing tetrahedral Si coordination
      { id: 'O5', atomicNumber: 8, symbol: 'O', x: 2.79, y: 0.93, z: 2.79, role: 'Network oxygen' },
      { id: 'O6', atomicNumber: 8, symbol: 'O', x: 0.93, y: 2.79, z: 2.79, role: 'Network oxygen' },
      { id: 'O7', atomicNumber: 8, symbol: 'O', x: -2.79, y: -0.93, z: 2.79, role: 'Network oxygen' },
      { id: 'O8', atomicNumber: 8, symbol: 'O', x: -0.93, y: -2.79, z: 2.79, role: 'Network oxygen' },
      { id: 'O9', atomicNumber: 8, symbol: 'O', x: -2.79, y: 0.93, z: -2.79, role: 'Network oxygen' },
      { id: 'O10', atomicNumber: 8, symbol: 'O', x: -0.93, y: 2.79, z: -2.79, role: 'Network oxygen' },
      { id: 'O11', atomicNumber: 8, symbol: 'O', x: 2.79, y: -0.93, z: -2.79, role: 'Network oxygen' },
      { id: 'O12', atomicNumber: 8, symbol: 'O', x: 0.93, y: -2.79, z: -2.79, role: 'Network oxygen' },
    ],
    bonds: [
      { from: 0, to: 1, order: 'network' },
      { from: 0, to: 2, order: 'network' },
      { from: 0, to: 3, order: 'network' },
      { from: 0, to: 4, order: 'network' },
      { from: 1, to: 5, order: 'network' },
      { from: 2, to: 6, order: 'network' },
      { from: 3, to: 7, order: 'network' },
      { from: 4, to: 8, order: 'network' },
      { from: 5, to: 9, order: 'network' },
      { from: 5, to: 10, order: 'network' },
      { from: 6, to: 11, order: 'network' },
      { from: 6, to: 12, order: 'network' },
      { from: 7, to: 13, order: 'network' },
      { from: 7, to: 14, order: 'network' },
      { from: 8, to: 15, order: 'network' },
      { from: 8, to: 16, order: 'network' },
    ],
  },

  // 3. REQUIRED DEMO: C₆H₁₂O₆ — α-D-Glucopyranose (24 atoms, authentic ⁴C₁ chair pyranose ring)
  c6h12o6: {
    compoundId: 'c6h12o6',
    representation: 'covalent',
    geometrySummary: 'α-D-Glucopyranose ⁴C₁ chair 6-membered pyranose ring (24 atoms: 6 C, 12 H, 6 O)',
    source: 'PubChem CID 79025 / Crystal neutron diffraction',
    atoms: [
      // 0..5: Pyranose ring (C1, C2, C3, C4, C5, O5)
      { id: 'C1', atomicNumber: 6, symbol: 'C', x: 1.24, y: 0.22, z: 0.72, role: 'Anomeric C1' },
      { id: 'C2', atomicNumber: 6, symbol: 'C', x: 1.24, y: -0.22, z: -0.72, role: 'Ring C2' },
      { id: 'C3', atomicNumber: 6, symbol: 'C', x: 0.0, y: 0.22, z: -1.44, role: 'Ring C3' },
      { id: 'C4', atomicNumber: 6, symbol: 'C', x: -1.24, y: -0.22, z: -0.72, role: 'Ring C4' },
      { id: 'C5', atomicNumber: 6, symbol: 'C', x: -1.24, y: 0.22, z: 0.72, role: 'Ring C5' },
      { id: 'O5', atomicNumber: 8, symbol: 'O', x: 0.0, y: -0.22, z: 1.4, role: 'Ring ether O5' },
      // 6: C6 hydroxymethyl
      { id: 'C6', atomicNumber: 6, symbol: 'C', x: -2.48, y: 0.88, z: 1.32, role: 'Exocyclic CH₂OH C6' },
      // 7..11: Hydroxyl oxygens O1, O2, O3, O4, O6
      { id: 'O1', atomicNumber: 8, symbol: 'O', x: 1.36, y: -1.16, z: 1.05, role: 'Axial α-OH oxygen' },
      { id: 'O2', atomicNumber: 8, symbol: 'O', x: 2.46, y: 0.02, z: -1.4, role: 'Equatorial OH oxygen' },
      { id: 'O3', atomicNumber: 8, symbol: 'O', x: 0.0, y: -0.02, z: -2.84, role: 'Equatorial OH oxygen' },
      { id: 'O4', atomicNumber: 8, symbol: 'O', x: -2.46, y: 0.02, z: -1.4, role: 'Equatorial OH oxygen' },
      { id: 'O6', atomicNumber: 8, symbol: 'O', x: -2.52, y: 0.72, z: 2.74, role: 'C6-OH oxygen' },
      // 12..18: Carbon-bonded hydrogens H1, H2, H3, H4, H5, H6a, H6b
      { id: 'H1', atomicNumber: 1, symbol: 'H', x: 2.16, y: 0.72, z: 1.02, role: 'C1–H' },
      { id: 'H2', atomicNumber: 1, symbol: 'H', x: 1.22, y: -1.3, z: -0.82, role: 'C2–H' },
      { id: 'H3', atomicNumber: 1, symbol: 'H', x: 0.0, y: 1.3, z: -1.34, role: 'C3–H' },
      { id: 'H4', atomicNumber: 1, symbol: 'H', x: -1.22, y: -1.3, z: -0.82, role: 'C4–H' },
      { id: 'H5', atomicNumber: 1, symbol: 'H', x: -1.24, y: -0.86, z: 0.82, role: 'C5–H' },
      { id: 'H6a', atomicNumber: 1, symbol: 'H', x: -2.48, y: 1.94, z: 1.06, role: 'C6–H' },
      { id: 'H6b', atomicNumber: 1, symbol: 'H', x: -3.38, y: 0.44, z: 0.9, role: 'C6–H' },
      // 19..23: Hydroxyl hydrogens HO1, HO2, HO3, HO4, HO6
      { id: 'HO1', atomicNumber: 1, symbol: 'H', x: 2.24, y: -1.45, z: 0.85, role: 'Hydroxyl O1–H' },
      { id: 'HO2', atomicNumber: 1, symbol: 'H', x: 2.42, y: 0.95, z: -1.66, role: 'Hydroxyl O2–H' },
      { id: 'HO3', atomicNumber: 1, symbol: 'H', x: -0.85, y: 0.32, z: -3.14, role: 'Hydroxyl O3–H' },
      { id: 'HO4', atomicNumber: 1, symbol: 'H', x: -2.48, y: -0.68, z: -2.06, role: 'Hydroxyl O4–H' },
      { id: 'HO6', atomicNumber: 1, symbol: 'H', x: -3.32, y: 1.18, z: 3.04, role: 'Hydroxyl O6–H' },
    ],
    bonds: [
      // Pyranose ring
      { from: 0, to: 1, order: 1 },
      { from: 1, to: 2, order: 1 },
      { from: 2, to: 3, order: 1 },
      { from: 3, to: 4, order: 1 },
      { from: 4, to: 5, order: 1 },
      { from: 5, to: 0, order: 1 },
      // C-C6
      { from: 4, to: 6, order: 1 },
      // C-O bonds
      { from: 0, to: 7, order: 1 },
      { from: 1, to: 8, order: 1 },
      { from: 2, to: 9, order: 1 },
      { from: 3, to: 10, order: 1 },
      { from: 6, to: 11, order: 1 },
      // C-H bonds
      { from: 0, to: 12, order: 1 },
      { from: 1, to: 13, order: 1 },
      { from: 2, to: 14, order: 1 },
      { from: 3, to: 15, order: 1 },
      { from: 4, to: 16, order: 1 },
      { from: 6, to: 17, order: 1 },
      { from: 6, to: 18, order: 1 },
      // O-H bonds
      { from: 7, to: 19, order: 1 },
      { from: 8, to: 20, order: 1 },
      { from: 9, to: 21, order: 1 },
      { from: 10, to: 22, order: 1 },
      { from: 11, to: 23, order: 1 },
    ],
  },

  // 4. REQUIRED DEMO: C₈H₁₀N₄O₂ — Caffeine (24 atoms, fused bicyclic xanthine purine core + 3 methyls + 2 carbonyls)
  c8h10n4o2: {
    compoundId: 'c8h10n4o2',
    representation: 'covalent',
    geometrySummary: 'Planar bicyclic xanthine purine core (fused pyrimidinedione + imidazole) with 3 N-methyl groups (24 atoms)',
    source: 'PubChem CID 2519 / X-ray crystallography',
    atoms: [
      // 0..5: Pyrimidinedione 6-ring (N1, C2, N3, C4, C5, C6)
      { id: 'N1', atomicNumber: 7, symbol: 'N', x: -1.82, y: 0.7, z: 0.0, role: 'Pyrimidine N1' },
      { id: 'C2', atomicNumber: 6, symbol: 'C', x: -1.82, y: -0.68, z: 0.0, role: 'Carbonyl C2' },
      { id: 'N3', atomicNumber: 7, symbol: 'N', x: -0.62, y: -1.38, z: 0.0, role: 'Pyrimidine N3' },
      { id: 'C4', atomicNumber: 6, symbol: 'C', x: 0.58, y: -0.68, z: 0.0, role: 'Bridgehead C4' },
      { id: 'C5', atomicNumber: 6, symbol: 'C', x: 0.58, y: 0.7, z: 0.0, role: 'Bridgehead C5' },
      { id: 'C6', atomicNumber: 6, symbol: 'C', x: -0.62, y: 1.42, z: 0.0, role: 'Carbonyl C6' },
      // 6..8: Fused Imidazole 5-ring (N7, C8, N9)
      { id: 'N7', atomicNumber: 7, symbol: 'N', x: 1.92, y: 1.06, z: 0.0, role: 'Imidazole N7' },
      { id: 'C8', atomicNumber: 6, symbol: 'C', x: 2.7, y: -0.02, z: 0.0, role: 'Imidazole C8' },
      { id: 'N9', atomicNumber: 7, symbol: 'N', x: 1.92, y: -1.08, z: 0.0, role: 'Imidazole N9' },
      // 9..10: Carbonyl Oxygens
      { id: 'O10', atomicNumber: 8, symbol: 'O', x: -2.9, y: -1.28, z: 0.0, role: 'C2=O carbonyl oxygen' },
      { id: 'O11', atomicNumber: 8, symbol: 'O', x: -0.62, y: 2.64, z: 0.0, role: 'C6=O carbonyl oxygen' },
      // 11: C8 Hydrogen
      { id: 'H8', atomicNumber: 1, symbol: 'H', x: 3.78, y: -0.02, z: 0.0, role: 'Imidazole C8–H' },
      // 12..15: N1-Methyl (C12 + 3 H)
      { id: 'C12', atomicNumber: 6, symbol: 'C', x: -3.08, y: 1.44, z: 0.0, role: 'N1-Methyl carbon' },
      { id: 'H12a', atomicNumber: 1, symbol: 'H', x: -3.92, y: 0.76, z: 0.0, role: 'Methyl H' },
      { id: 'H12b', atomicNumber: 1, symbol: 'H', x: -3.14, y: 2.08, z: 0.89, role: 'Methyl H' },
      { id: 'H12c', atomicNumber: 1, symbol: 'H', x: -3.14, y: 2.08, z: -0.89, role: 'Methyl H' },
      // 16..19: N3-Methyl (C13 + 3 H)
      { id: 'C13', atomicNumber: 6, symbol: 'C', x: -0.62, y: -2.84, z: 0.0, role: 'N3-Methyl carbon' },
      { id: 'H13a', atomicNumber: 1, symbol: 'H', x: -1.64, y: -3.22, z: 0.0, role: 'Methyl H' },
      { id: 'H13b', atomicNumber: 1, symbol: 'H', x: -0.1, y: -3.22, z: 0.89, role: 'Methyl H' },
      { id: 'H13c', atomicNumber: 1, symbol: 'H', x: -0.1, y: -3.22, z: -0.89, role: 'Methyl H' },
      // 20..23: N7-Methyl (C14 + 3 H)
      { id: 'C14', atomicNumber: 6, symbol: 'C', x: 2.38, y: 2.45, z: 0.0, role: 'N7-Methyl carbon' },
      { id: 'H14a', atomicNumber: 1, symbol: 'H', x: 3.46, y: 2.52, z: 0.0, role: 'Methyl H' },
      { id: 'H14b', atomicNumber: 1, symbol: 'H', x: 1.98, y: 2.96, z: 0.89, role: 'Methyl H' },
      { id: 'H14c', atomicNumber: 1, symbol: 'H', x: 1.98, y: 2.96, z: -0.89, role: 'Methyl H' },
    ],
    bonds: [
      // Pyrimidinedione ring
      { from: 0, to: 1, order: 1 },
      { from: 1, to: 2, order: 1 },
      { from: 2, to: 3, order: 1 },
      { from: 3, to: 4, order: 2 },
      { from: 4, to: 5, order: 1 },
      { from: 5, to: 0, order: 1 },
      // Imidazole ring
      { from: 4, to: 6, order: 1 },
      { from: 6, to: 7, order: 1 },
      { from: 7, to: 8, order: 2 },
      { from: 8, to: 3, order: 1 },
      // Carbonyl double bonds
      { from: 1, to: 9, order: 2 },
      { from: 5, to: 10, order: 2 },
      // C8-H
      { from: 7, to: 11, order: 1 },
      // N1-Methyl
      { from: 0, to: 12, order: 1 },
      { from: 12, to: 13, order: 1 },
      { from: 12, to: 14, order: 1 },
      { from: 12, to: 15, order: 1 },
      // N3-Methyl
      { from: 2, to: 16, order: 1 },
      { from: 16, to: 17, order: 1 },
      { from: 16, to: 18, order: 1 },
      { from: 16, to: 19, order: 1 },
      // N7-Methyl
      { from: 6, to: 20, order: 1 },
      { from: 20, to: 21, order: 1 },
      { from: 20, to: 22, order: 1 },
      { from: 20, to: 23, order: 1 },
    ],
  },

  // 5. REQUIRED DEMO: CuSO₄ — Copper(II) Sulfate Ionic Lattice (Cu²⁺ + tetrahedral SO₄²⁻)
  cuso4: {
    compoundId: 'cuso4',
    representation: 'ionic_lattice',
    geometrySummary: 'Ionic crystal unit: Cu²⁺ transition cations coordinated to tetrahedral SO₄²⁻ sulfate anions (S–O 1.48 Å)',
    unitCellNote: '2 Cu²⁺ · 2 SO₄²⁻ crystal coordination motif',
    source: 'ICSD Chalcocyanite (Anhydrous CuSO₄) / PubChem CID 24462',
    atoms: [
      { id: 'Cu1', atomicNumber: 29, symbol: 'Cu', x: -2.25, y: 0.0, z: 0.0, role: 'Cu²⁺ cation' },
      { id: 'Cu2', atomicNumber: 29, symbol: 'Cu', x: 2.25, y: 0.0, z: 0.0, role: 'Cu²⁺ cation' },
      // SO4 #1
      { id: 'S1', atomicNumber: 16, symbol: 'S', x: 0.0, y: 1.35, z: 0.0, role: 'Tetrahedral S(+6)' },
      { id: 'O1', atomicNumber: 8, symbol: 'O', x: -1.18, y: 0.72, z: 0.62, role: 'Sulfate O' },
      { id: 'O2', atomicNumber: 8, symbol: 'O', x: 1.18, y: 0.72, z: -0.62, role: 'Sulfate O' },
      { id: 'O3', atomicNumber: 8, symbol: 'O', x: 0.0, y: 2.48, z: 0.96, role: 'Sulfate O' },
      { id: 'O4', atomicNumber: 8, symbol: 'O', x: 0.0, y: 2.48, z: -0.96, role: 'Sulfate O' },
      // SO4 #2
      { id: 'S2', atomicNumber: 16, symbol: 'S', x: 0.0, y: -1.35, z: 0.0, role: 'Tetrahedral S(+6)' },
      { id: 'O5', atomicNumber: 8, symbol: 'O', x: -1.18, y: -0.72, z: -0.62, role: 'Sulfate O' },
      { id: 'O6', atomicNumber: 8, symbol: 'O', x: 1.18, y: -0.72, z: 0.62, role: 'Sulfate O' },
      { id: 'O7', atomicNumber: 8, symbol: 'O', x: 0.0, y: -2.48, z: 0.96, role: 'Sulfate O' },
      { id: 'O8', atomicNumber: 8, symbol: 'O', x: 0.0, y: -2.48, z: -0.96, role: 'Sulfate O' },
    ],
    bonds: [
      { from: 2, to: 3, order: 1 },
      { from: 2, to: 4, order: 1 },
      { from: 2, to: 5, order: 2 },
      { from: 2, to: 6, order: 2 },
      { from: 7, to: 8, order: 1 },
      { from: 7, to: 9, order: 1 },
      { from: 7, to: 10, order: 2 },
      { from: 7, to: 11, order: 2 },
      { from: 0, to: 3, order: 'ionic' },
      { from: 0, to: 8, order: 'ionic' },
      { from: 1, to: 4, order: 'ionic' },
      { from: 1, to: 9, order: 'ionic' },
    ],
  },

  // 6. REQUIRED DEMO: AgNO₃ — Silver Nitrate Ionic Lattice (Ag⁺ + trigonal-planar NO₃⁻)
  agno3: {
    compoundId: 'agno3',
    representation: 'ionic_lattice',
    geometrySummary: 'Orthorhombic ionic lattice motif: Ag⁺ cations with trigonal-planar NO₃⁻ nitrate anions (120°, N–O 1.25 Å)',
    unitCellNote: '2 Ag⁺ · 2 NO₃⁻ crystal coordination motif',
    source: 'Crystallography Open Database (Pbca AgNO₃) / PubChem CID 24470',
    atoms: [
      { id: 'Ag1', atomicNumber: 47, symbol: 'Ag', x: -2.25, y: 0.0, z: 0.0, role: 'Ag⁺ cation' },
      { id: 'Ag2', atomicNumber: 47, symbol: 'Ag', x: 2.25, y: 0.0, z: 0.0, role: 'Ag⁺ cation' },
      // Nitrate #1
      { id: 'N1', atomicNumber: 7, symbol: 'N', x: 0.0, y: 1.35, z: 0.0, role: 'Trigonal-planar N(+5)' },
      { id: 'O1', atomicNumber: 8, symbol: 'O', x: -1.08, y: 0.72, z: 0.0, role: 'Nitrate O' },
      { id: 'O2', atomicNumber: 8, symbol: 'O', x: 1.08, y: 0.72, z: 0.0, role: 'Nitrate O' },
      { id: 'O3', atomicNumber: 8, symbol: 'O', x: 0.0, y: 2.6, z: 0.0, role: 'Nitrate O' },
      // Nitrate #2
      { id: 'N2', atomicNumber: 7, symbol: 'N', x: 0.0, y: -1.35, z: 0.0, role: 'Trigonal-planar N(+5)' },
      { id: 'O4', atomicNumber: 8, symbol: 'O', x: -1.08, y: -0.72, z: 0.0, role: 'Nitrate O' },
      { id: 'O5', atomicNumber: 8, symbol: 'O', x: 1.08, y: -0.72, z: 0.0, role: 'Nitrate O' },
      { id: 'O6', atomicNumber: 8, symbol: 'O', x: 0.0, y: -2.6, z: 0.0, role: 'Nitrate O' },
    ],
    bonds: [
      { from: 2, to: 3, order: 1 },
      { from: 2, to: 4, order: 1 },
      { from: 2, to: 5, order: 2 },
      { from: 6, to: 7, order: 1 },
      { from: 6, to: 8, order: 1 },
      { from: 6, to: 9, order: 2 },
      { from: 0, to: 3, order: 'ionic' },
      { from: 0, to: 7, order: 'ionic' },
      { from: 1, to: 4, order: 'ionic' },
      { from: 1, to: 8, order: 'ionic' },
    ],
  },

  // 7. REQUIRED DEMO: KMnO₄ — Potassium Permanganate Ionic Lattice (K⁺ + tetrahedral MnO₄⁻)
  kmno4: {
    compoundId: 'kmno4',
    representation: 'ionic_lattice',
    geometrySummary: 'Orthorhombic ionic lattice motif: K⁺ cations with tetrahedral MnO₄⁻ permanganate anions (Mn–O 1.63 Å)',
    unitCellNote: '2 K⁺ · 2 MnO₄⁻ crystal coordination motif',
    source: 'Crystallography Open Database (Pnma KMnO₄) / PubChem CID 516875',
    atoms: [
      { id: 'K1', atomicNumber: 19, symbol: 'K', x: -2.45, y: 0.0, z: 0.0, role: 'K⁺ cation' },
      { id: 'K2', atomicNumber: 19, symbol: 'K', x: 2.45, y: 0.0, z: 0.0, role: 'K⁺ cation' },
      // MnO4- #1
      { id: 'Mn1', atomicNumber: 25, symbol: 'Mn', x: 0.0, y: 1.42, z: 0.0, role: 'Tetrahedral Mn(+7)' },
      { id: 'O1', atomicNumber: 8, symbol: 'O', x: -1.32, y: 0.72, z: 0.65, role: 'Permanganate O' },
      { id: 'O2', atomicNumber: 8, symbol: 'O', x: 1.32, y: 0.72, z: -0.65, role: 'Permanganate O' },
      { id: 'O3', atomicNumber: 8, symbol: 'O', x: 0.0, y: 2.65, z: 1.05, role: 'Permanganate O' },
      { id: 'O4', atomicNumber: 8, symbol: 'O', x: 0.0, y: 2.65, z: -1.05, role: 'Permanganate O' },
      // MnO4- #2
      { id: 'Mn2', atomicNumber: 25, symbol: 'Mn', x: 0.0, y: -1.42, z: 0.0, role: 'Tetrahedral Mn(+7)' },
      { id: 'O5', atomicNumber: 8, symbol: 'O', x: -1.32, y: -0.72, z: -0.65, role: 'Permanganate O' },
      { id: 'O6', atomicNumber: 8, symbol: 'O', x: 1.32, y: -0.72, z: 0.65, role: 'Permanganate O' },
      { id: 'O7', atomicNumber: 8, symbol: 'O', x: 0.0, y: -2.65, z: 1.05, role: 'Permanganate O' },
      { id: 'O8', atomicNumber: 8, symbol: 'O', x: 0.0, y: -2.65, z: -1.05, role: 'Permanganate O' },
    ],
    bonds: [
      { from: 2, to: 3, order: 2 },
      { from: 2, to: 4, order: 2 },
      { from: 2, to: 5, order: 2 },
      { from: 2, to: 6, order: 1 },
      { from: 7, to: 8, order: 2 },
      { from: 7, to: 9, order: 2 },
      { from: 7, to: 10, order: 2 },
      { from: 7, to: 11, order: 1 },
      { from: 0, to: 3, order: 'ionic' },
      { from: 0, to: 8, order: 'ionic' },
      { from: 1, to: 4, order: 'ionic' },
      { from: 1, to: 9, order: 'ionic' },
    ],
  },
};

export function getCompoundStructure3D(compoundId: string): CompoundStructure3D | null {
  return COMPOUND_STRUCTURES[compoundId] ?? null;
}
