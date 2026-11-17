export interface SubshellOccupancy {
  label: string; // e.g., '3d'
  n: number;
  l: number; // 0=s, 1=p, 2=d, 3=f
  letter: 's' | 'p' | 'd' | 'f';
  electrons: number;
  maxElectrons: number;
  orbitalBoxes: { up: boolean; down: boolean }[];
  isValence: boolean;
}

const SUPERSCRIPT_MAP: Record<string, string> = {
  '⁰': '0',
  '¹': '1',
  '²': '2',
  '³': '3',
  '⁴': '4',
  '⁵': '5',
  '⁶': '6',
  '⁷': '7',
  '⁸': '8',
  '⁹': '9',
};

const LETTER_TO_L: Record<'s' | 'p' | 'd' | 'f', number> = {
  s: 0,
  p: 1,
  d: 2,
  f: 3,
};

const ORBITAL_BOX_COUNT: Record<'s' | 'p' | 'd' | 'f', number> = {
  s: 1,
  p: 3,
  d: 5,
  f: 7,
};

function decodeSuperscriptDigits(raw: string): number {
  const normalized = raw
    .split('')
    .map((ch) => SUPERSCRIPT_MAP[ch] ?? ch)
    .join('');
  const parsed = Number.parseInt(normalized, 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function buildHundOrbitalBoxes(
  letter: 's' | 'p' | 'd' | 'f',
  electrons: number
): { up: boolean; down: boolean }[] {
  const numBoxes = ORBITAL_BOX_COUNT[letter];
  const boxes = Array.from({ length: numBoxes }, () => ({ up: false, down: false }));
  let remaining = Math.max(0, Math.min(electrons, numBoxes * 2));

  // Hund's first rule: parallel up-spins first
  for (let i = 0; i < numBoxes && remaining > 0; i++) {
    boxes[i].up = true;
    remaining--;
  }
  // Then pair with down-spins
  for (let i = 0; i < numBoxes && remaining > 0; i++) {
    boxes[i].down = true;
    remaining--;
  }
  return boxes;
}

export function parseExpandedElectronSubshells(expandedConfig?: string): {
  subshells: SubshellOccupancy[];
  totalElectrons: number;
  valenceElectrons: number;
  highestPrincipalN: number;
} {
  if (!expandedConfig || expandedConfig === 'Unknown') {
    return { subshells: [], totalElectrons: 0, valenceElectrons: 0, highestPrincipalN: 1 };
  }

  const tokens = expandedConfig.trim().split(/\s+/);
  const parsed: Omit<SubshellOccupancy, 'isValence'>[] = [];
  const regex = /^([1-8])([spdf])([⁰¹²³⁴⁵⁶⁷⁸⁹0-9]+)$/;

  for (const token of tokens) {
    const match = token.match(regex);
    if (!match) continue;
    const n = Number.parseInt(match[1], 10);
    const letter = match[2] as 's' | 'p' | 'd' | 'f';
    const electrons = decodeSuperscriptDigits(match[3]);
    const boxCount = ORBITAL_BOX_COUNT[letter];

    parsed.push({
      label: `${n}${letter}`,
      n,
      l: LETTER_TO_L[letter],
      letter,
      electrons,
      maxElectrons: boxCount * 2,
      orbitalBoxes: buildHundOrbitalBoxes(letter, electrons),
    });
  }

  const highestPrincipalN = parsed.reduce((acc, s) => Math.max(acc, s.n), 1);

  const subshells: SubshellOccupancy[] = parsed.map((s) => {
    const isValence =
      s.n === highestPrincipalN ||
      (s.n === highestPrincipalN - 1 && s.letter === 'd' && s.electrons < 10) ||
      (s.n === highestPrincipalN - 2 && s.letter === 'f' && s.electrons < 14);
    return { ...s, isValence };
  });

  const totalElectrons = subshells.reduce((sum, s) => sum + s.electrons, 0);
  // Standard outer shell (highest n) + partially filled d/f valence count
  const valenceElectrons = subshells
    .filter((s) => s.isValence)
    .reduce((sum, s) => sum + s.electrons, 0);

  return { subshells, totalElectrons, valenceElectrons, highestPrincipalN };
}
