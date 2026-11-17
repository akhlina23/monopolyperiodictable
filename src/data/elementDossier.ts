import {
  ELEMENT_DOSSIER_PART_1,
  type BilingualText,
  type ElementDossierEntry,
} from './elementDossierPart1';
import { ELEMENT_DOSSIER_PART_2 } from './elementDossierPart2';

export type DossierLanguage = 'id' | 'en';
export type { BilingualText, ElementDossierEntry };

export const ELEMENT_DOSSIER_BY_ATOMIC_NUMBER: Record<number, ElementDossierEntry> = {
  ...ELEMENT_DOSSIER_PART_1,
  ...ELEMENT_DOSSIER_PART_2,
};

export function getElementDossier(atomicNumber: number): ElementDossierEntry | null {
  return ELEMENT_DOSSIER_BY_ATOMIC_NUMBER[atomicNumber] ?? null;
}
