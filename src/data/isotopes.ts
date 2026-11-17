export interface IsotopeRecord {
  massNumber: number;
  notation: string;
  atomicMassU: string;
  isStable: boolean;
  naturalAbundancePct: string | null;
  halfLife: string;
  decayMode: string | null;
}

export interface ElementIsotopeDataset {
  atomicNumber: number;
  isotopes: IsotopeRecord[];
}

export const VERIFIED_ISOTOPES_BY_ATOMIC_NUMBER: Record<number, IsotopeRecord[]> = {
  1: [
    { massNumber: 1, notation: '¹H (Protium)', atomicMassU: '1.007825', isStable: true, naturalAbundancePct: '99.9885%', halfLife: 'Stable', decayMode: null },
    { massNumber: 2, notation: '²H (Deuterium)', atomicMassU: '2.014102', isStable: true, naturalAbundancePct: '0.0115%', halfLife: 'Stable', decayMode: null },
    { massNumber: 3, notation: '³H (Tritium)', atomicMassU: '3.016049', isStable: false, naturalAbundancePct: 'Trace', halfLife: '12.32 years', decayMode: 'β⁻' },
  ],
  2: [
    { massNumber: 3, notation: '³He', atomicMassU: '3.016029', isStable: true, naturalAbundancePct: '0.000134%', halfLife: 'Stable', decayMode: null },
    { massNumber: 4, notation: '⁴He', atomicMassU: '4.002603', isStable: true, naturalAbundancePct: '99.999866%', halfLife: 'Stable', decayMode: null },
  ],
  3: [
    { massNumber: 6, notation: '⁶Li', atomicMassU: '6.015123', isStable: true, naturalAbundancePct: '7.59%', halfLife: 'Stable', decayMode: null },
    { massNumber: 7, notation: '⁷Li', atomicMassU: '7.016003', isStable: true, naturalAbundancePct: '92.41%', halfLife: 'Stable', decayMode: null },
  ],
  6: [
    { massNumber: 12, notation: '¹²C', atomicMassU: '12.000000', isStable: true, naturalAbundancePct: '98.93%', halfLife: 'Stable', decayMode: null },
    { massNumber: 13, notation: '¹³C', atomicMassU: '13.003355', isStable: true, naturalAbundancePct: '1.07%', halfLife: 'Stable', decayMode: null },
    { massNumber: 14, notation: '¹⁴C', atomicMassU: '14.003242', isStable: false, naturalAbundancePct: 'Trace', halfLife: '5,730 years', decayMode: 'β⁻' },
  ],
  7: [
    { massNumber: 14, notation: '¹⁴N', atomicMassU: '14.003074', isStable: true, naturalAbundancePct: '99.636%', halfLife: 'Stable', decayMode: null },
    { massNumber: 15, notation: '¹⁵N', atomicMassU: '15.000109', isStable: true, naturalAbundancePct: '0.364%', halfLife: 'Stable', decayMode: null },
  ],
  8: [
    { massNumber: 16, notation: '¹⁶O', atomicMassU: '15.994915', isStable: true, naturalAbundancePct: '99.757%', halfLife: 'Stable', decayMode: null },
    { massNumber: 17, notation: '¹⁷O', atomicMassU: '16.999132', isStable: true, naturalAbundancePct: '0.038%', halfLife: 'Stable', decayMode: null },
    { massNumber: 18, notation: '¹⁸O', atomicMassU: '17.999161', isStable: true, naturalAbundancePct: '0.205%', halfLife: 'Stable', decayMode: null },
  ],
  9: [
    { massNumber: 19, notation: '¹⁹F', atomicMassU: '18.998403', isStable: true, naturalAbundancePct: '100%', halfLife: 'Stable', decayMode: null },
  ],
  11: [
    { massNumber: 22, notation: '²²Na', atomicMassU: '21.994437', isStable: false, naturalAbundancePct: null, halfLife: '2.602 years', decayMode: 'β⁺ / EC' },
    { massNumber: 23, notation: '²³Na', atomicMassU: '22.989769', isStable: true, naturalAbundancePct: '100%', halfLife: 'Stable', decayMode: null },
    { massNumber: 24, notation: '²⁴Na', atomicMassU: '23.990963', isStable: false, naturalAbundancePct: null, halfLife: '14.96 hours', decayMode: 'β⁻' },
  ],
  12: [
    { massNumber: 24, notation: '²⁴Mg', atomicMassU: '23.985042', isStable: true, naturalAbundancePct: '78.99%', halfLife: 'Stable', decayMode: null },
    { massNumber: 25, notation: '²⁵Mg', atomicMassU: '24.985837', isStable: true, naturalAbundancePct: '10.00%', halfLife: 'Stable', decayMode: null },
    { massNumber: 26, notation: '²⁶Mg', atomicMassU: '25.982593', isStable: true, naturalAbundancePct: '11.01%', halfLife: 'Stable', decayMode: null },
  ],
  14: [
    { massNumber: 28, notation: '²⁸Si', atomicMassU: '27.976927', isStable: true, naturalAbundancePct: '92.223%', halfLife: 'Stable', decayMode: null },
    { massNumber: 29, notation: '²⁹Si', atomicMassU: '28.976495', isStable: true, naturalAbundancePct: '4.685%', halfLife: 'Stable', decayMode: null },
    { massNumber: 30, notation: '³⁰Si', atomicMassU: '29.973770', isStable: true, naturalAbundancePct: '3.092%', halfLife: 'Stable', decayMode: null },
  ],
  17: [
    { massNumber: 35, notation: '³⁵Cl', atomicMassU: '34.968853', isStable: true, naturalAbundancePct: '75.76%', halfLife: 'Stable', decayMode: null },
    { massNumber: 36, notation: '³⁶Cl', atomicMassU: '35.968307', isStable: false, naturalAbundancePct: 'Trace', halfLife: '3.01 × 10⁵ years', decayMode: 'β⁻ / EC' },
    { massNumber: 37, notation: '³⁷Cl', atomicMassU: '36.965903', isStable: true, naturalAbundancePct: '24.24%', halfLife: 'Stable', decayMode: null },
  ],
  19: [
    { massNumber: 39, notation: '³⁹K', atomicMassU: '38.963707', isStable: true, naturalAbundancePct: '93.258%', halfLife: 'Stable', decayMode: null },
    { massNumber: 40, notation: '⁴⁰K', atomicMassU: '39.963998', isStable: false, naturalAbundancePct: '0.0117%', halfLife: '1.248 × 10⁹ years', decayMode: 'β⁻ / EC' },
    { massNumber: 41, notation: '⁴¹K', atomicMassU: '40.961826', isStable: true, naturalAbundancePct: '6.730%', halfLife: 'Stable', decayMode: null },
  ],
  20: [
    { massNumber: 40, notation: '⁴⁰Ca', atomicMassU: '39.962591', isStable: true, naturalAbundancePct: '96.941%', halfLife: 'Stable', decayMode: null },
    { massNumber: 42, notation: '⁴²Ca', atomicMassU: '41.958618', isStable: true, naturalAbundancePct: '0.647%', halfLife: 'Stable', decayMode: null },
    { massNumber: 44, notation: '⁴⁴Ca', atomicMassU: '43.955482', isStable: true, naturalAbundancePct: '2.086%', halfLife: 'Stable', decayMode: null },
  ],
  26: [
    { massNumber: 54, notation: '⁵⁴Fe', atomicMassU: '53.939609', isStable: true, naturalAbundancePct: '5.845%', halfLife: 'Stable', decayMode: null },
    { massNumber: 56, notation: '⁵⁶Fe', atomicMassU: '55.934936', isStable: true, naturalAbundancePct: '91.754%', halfLife: 'Stable', decayMode: null },
    { massNumber: 57, notation: '⁵⁷Fe', atomicMassU: '56.935393', isStable: true, naturalAbundancePct: '2.119%', halfLife: 'Stable', decayMode: null },
    { massNumber: 58, notation: '⁵⁸Fe', atomicMassU: '57.933274', isStable: true, naturalAbundancePct: '0.282%', halfLife: 'Stable', decayMode: null },
  ],
  27: [
    { massNumber: 59, notation: '⁵⁹Co', atomicMassU: '58.933194', isStable: true, naturalAbundancePct: '100%', halfLife: 'Stable', decayMode: null },
    { massNumber: 60, notation: '⁶⁰Co', atomicMassU: '59.933816', isStable: false, naturalAbundancePct: null, halfLife: '5.271 years', decayMode: 'β⁻' },
  ],
  29: [
    { massNumber: 63, notation: '⁶³Cu', atomicMassU: '62.929597', isStable: true, naturalAbundancePct: '69.15%', halfLife: 'Stable', decayMode: null },
    { massNumber: 65, notation: '⁶⁵Cu', atomicMassU: '64.927789', isStable: true, naturalAbundancePct: '30.85%', halfLife: 'Stable', decayMode: null },
  ],
  35: [
    { massNumber: 79, notation: '⁷⁹Br', atomicMassU: '78.918338', isStable: true, naturalAbundancePct: '50.69%', halfLife: 'Stable', decayMode: null },
    { massNumber: 81, notation: '⁸¹Br', atomicMassU: '80.916289', isStable: true, naturalAbundancePct: '49.31%', halfLife: 'Stable', decayMode: null },
  ],
  43: [
    { massNumber: 97, notation: '⁹⁷Tc', atomicMassU: '96.906366', isStable: false, naturalAbundancePct: null, halfLife: '4.21 × 10⁶ years', decayMode: 'EC' },
    { massNumber: 98, notation: '⁹⁸Tc', atomicMassU: '97.907212', isStable: false, naturalAbundancePct: null, halfLife: '4.2 × 10⁶ years', decayMode: 'β⁻' },
    { massNumber: 99, notation: '⁹⁹ᵐTc', atomicMassU: '98.906255', isStable: false, naturalAbundancePct: null, halfLife: '6.01 hours', decayMode: 'IT (γ)' },
  ],
  47: [
    { massNumber: 107, notation: '¹⁰⁷Ag', atomicMassU: '106.905092', isStable: true, naturalAbundancePct: '51.839%', halfLife: 'Stable', decayMode: null },
    { massNumber: 109, notation: '¹⁰⁹Ag', atomicMassU: '108.904756', isStable: true, naturalAbundancePct: '48.161%', halfLife: 'Stable', decayMode: null },
  ],
  53: [
    { massNumber: 127, notation: '¹²⁷I', atomicMassU: '126.904472', isStable: true, naturalAbundancePct: '100%', halfLife: 'Stable', decayMode: null },
    { massNumber: 131, notation: '¹³¹I', atomicMassU: '130.906125', isStable: false, naturalAbundancePct: null, halfLife: '8.025 days', decayMode: 'β⁻' },
  ],
  79: [
    { massNumber: 197, notation: '¹⁹⁷Au', atomicMassU: '196.966569', isStable: true, naturalAbundancePct: '100%', halfLife: 'Stable', decayMode: null },
    { massNumber: 198, notation: '¹⁹⁸Au', atomicMassU: '197.968242', isStable: false, naturalAbundancePct: null, halfLife: '2.694 days', decayMode: 'β⁻' },
  ],
  80: [
    { massNumber: 198, notation: '¹⁹⁸Hg', atomicMassU: '197.966769', isStable: true, naturalAbundancePct: '9.97%', halfLife: 'Stable', decayMode: null },
    { massNumber: 199, notation: '¹⁹⁹Hg', atomicMassU: '198.968281', isStable: true, naturalAbundancePct: '16.87%', halfLife: 'Stable', decayMode: null },
    { massNumber: 200, notation: '²⁰⁰Hg', atomicMassU: '199.968327', isStable: true, naturalAbundancePct: '23.10%', halfLife: 'Stable', decayMode: null },
    { massNumber: 202, notation: '²⁰²Hg', atomicMassU: '201.970643', isStable: true, naturalAbundancePct: '29.86%', halfLife: 'Stable', decayMode: null },
  ],
  82: [
    { massNumber: 204, notation: '²⁰⁴Pb', atomicMassU: '203.973044', isStable: true, naturalAbundancePct: '1.4%', halfLife: 'Stable', decayMode: null },
    { massNumber: 206, notation: '²⁰⁶Pb', atomicMassU: '205.974465', isStable: true, naturalAbundancePct: '24.1%', halfLife: 'Stable', decayMode: null },
    { massNumber: 207, notation: '²⁰⁷Pb', atomicMassU: '206.975897', isStable: true, naturalAbundancePct: '22.1%', halfLife: 'Stable', decayMode: null },
    { massNumber: 208, notation: '²⁰⁸Pb', atomicMassU: '207.976652', isStable: true, naturalAbundancePct: '52.4%', halfLife: 'Stable', decayMode: null },
  ],
  92: [
    { massNumber: 234, notation: '²³⁴U', atomicMassU: '234.040952', isStable: false, naturalAbundancePct: '0.0054%', halfLife: '2.455 × 10⁵ years', decayMode: 'α' },
    { massNumber: 235, notation: '²³⁵U', atomicMassU: '235.043930', isStable: false, naturalAbundancePct: '0.7204%', halfLife: '7.04 × 10⁸ years', decayMode: 'α' },
    { massNumber: 238, notation: '²³⁸U', atomicMassU: '238.050788', isStable: false, naturalAbundancePct: '99.2742%', halfLife: '4.468 × 10⁹ years', decayMode: 'α' },
  ],
  94: [
    { massNumber: 238, notation: '²³⁸Pu', atomicMassU: '238.049560', isStable: false, naturalAbundancePct: null, halfLife: '87.7 years', decayMode: 'α' },
    { massNumber: 239, notation: '²³⁹Pu', atomicMassU: '239.052163', isStable: false, naturalAbundancePct: 'Trace', halfLife: '24,110 years', decayMode: 'α' },
  ],
  118: [
    { massNumber: 294, notation: '²⁹⁴Og', atomicMassU: '294.21392', isStable: false, naturalAbundancePct: null, halfLife: '~0.7 ms', decayMode: 'α' },
  ],
};

export function getIsotopesForElement(atomicNumber: number): {
  coverage: 'verified' | 'unavailable';
  records: IsotopeRecord[];
} {
  const records = VERIFIED_ISOTOPES_BY_ATOMIC_NUMBER[atomicNumber];
  if (records && records.length > 0) {
    return { coverage: 'verified', records };
  }
  return { coverage: 'unavailable', records: [] };
}
