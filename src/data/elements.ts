import elementsRaw from './elements.json';
import { ChemicalElement, MatterState, TemperatureUnit } from '../types/game';
import { ENRICHED_ELEMENT_DATA } from './elementPropertiesEnriched';
import { GROUP_TRADITIONAL_LABELS } from './categories';

type RawElement = Omit<ChemicalElement, 'nameEn'> & { nameEn?: string };

export const ELEMENTS_118: ChemicalElement[] = (elementsRaw as RawElement[]).map((raw) => {
  const patch = ENRICHED_ELEMENT_DATA[raw.atomicNumber];
  const traditionalGroup =
    raw.groupNumber && GROUP_TRADITIONAL_LABELS[raw.groupNumber]
      ? GROUP_TRADITIONAL_LABELS[raw.groupNumber]
      : raw.isLanthanide
      ? 'Lanthanide (4f)'
      : raw.isActinide
      ? 'Actinide (5f)'
      : null;

  return {
    ...raw,
    nameEn: patch?.nameEn ?? raw.nameId,
    traditionalGroup,
    meltingPointC: patch ? patch.meltingPointC : raw.meltingPointC ?? null,
    boilingPointC: patch ? patch.boilingPointC : raw.boilingPointC ?? null,
    electronegativity: patch ? patch.electronegativity : raw.electronegativity ?? null,
    densityGcm3: patch ? patch.densityGcm3 : raw.densityGcm3 ?? null,
    ionizationEnergyEv: patch?.ionizationEnergyEv ?? null,
    atomicRadiusPm: patch?.atomicRadiusPm ?? null,
    electronShells: patch?.electronShells ?? [],
    electronConfig: patch?.electronConfig ?? raw.electronConfig ?? 'Unknown',
    expandedElectronConfig: patch?.expandedElectronConfig ?? raw.electronConfig ?? 'Unknown',
    discoveryYear: patch?.discoveryYear ?? null,
  };
});

export function getStateAtTemperature(element: ChemicalElement, tempC: number): MatterState {
  const mp = element.meltingPointC;
  const bp = element.boilingPointC;

  if (mp === null || mp === undefined) {
    return 'Unknown';
  }
  if (tempC < mp) {
    return 'Solid';
  }
  if (bp !== null && bp !== undefined && tempC >= bp) {
    return 'Gas';
  }
  if (bp === null || bp === undefined) {
    // Elements with known melting point (e.g. Fm, Md, No, Lr) without verified boiling point:
    // below melting point is solid; above melting point without known boiling point is liquid.
    return 'Liquid';
  }
  return 'Liquid';
}

export function convertCelsiusToUnit(tempC: number, unit: TemperatureUnit): number {
  if (unit === 'F') return Number(((tempC * 9) / 5 + 32).toFixed(1));
  if (unit === 'K') return Number((tempC + 273.15).toFixed(2));
  return Number(tempC.toFixed(1));
}

export function convertUnitToCelsius(value: number, unit: TemperatureUnit): number {
  if (unit === 'F') return ((value - 32) * 5) / 9;
  if (unit === 'K') return value - 273.15;
  return value;
}
