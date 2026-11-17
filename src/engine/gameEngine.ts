import { ELEMENTS_118, getStateAtTemperature } from '../data/elements';
import mainPropertiesRaw from '../data/mainProperties.json';
import boardLayoutRaw from '../data/boardLayout.json';
import { CATEGORY_META_BY_ID } from '../data/categories';
import {
  BoardTile,
  ChemicalElement,
  EconomyConfig,
  GameState,
  MainPropertyDraft,
  PropertyOwnership,
  DEFAULT_ECONOMY_CONFIG,
} from '../types/game';

export const ELEMENTS_LIST: ChemicalElement[] = ELEMENTS_118;
export const MAIN_PROPERTIES_LIST: MainPropertyDraft[] = mainPropertiesRaw as MainPropertyDraft[];
export const BOARD_TILES: BoardTile[] = boardLayoutRaw as BoardTile[];

export { getStateAtTemperature };

export const ELEMENTS_BY_ID: Record<number, ChemicalElement> = {};
ELEMENTS_LIST.forEach((el) => {
  ELEMENTS_BY_ID[el.atomicNumber] = el;
});

export const MAIN_PROPERTIES_BY_ID: Record<string, MainPropertyDraft> = {};
MAIN_PROPERTIES_LIST.forEach((prop) => {
  MAIN_PROPERTIES_BY_ID[prop.id] = prop;
});

export const TILES_BY_ID: Record<string, BoardTile> = {};
export const TILES_BY_PATH_INDEX: Record<number, BoardTile> = {};
BOARD_TILES.forEach((tile) => {
  TILES_BY_ID[tile.tileId] = tile;
  TILES_BY_PATH_INDEX[tile.pathIndex] = tile;
});

export const TRACK_TILE_COUNT = BOARD_TILES.length;

export const START_TILE: BoardTile =
  BOARD_TILES.find((t) => t.tileId === 'corner-start' || t.tileType === 'start') ??
  TILES_BY_PATH_INDEX[0];

export const JAIL_TILE: BoardTile =
  BOARD_TILES.find((t) => t.tileId === 'corner-jail' || t.tileType === 'jail') ??
  TILES_BY_ID['corner-jail'];

export const CUSTOMS_TILE: BoardTile =
  BOARD_TILES.find((t) => t.tileId === 'corner-customs' || t.tileType === 'customs') ??
  TILES_BY_ID['corner-customs'];

// Category colors adapted for dark scientific UI + high-contrast readability
export const CATEGORY_COLORS: Record<
  string,
  { bg: string; border: string; text: string; headerBg: string; accent: string }
> = {
  'Logam alkali': { bg: '#2C171D', border: '#7A2D3B', text: '#FCA5A5', headerBg: '#9F1239', accent: '#FF6B6B' },
  'Logam alkali tanah': { bg: '#2B1F14', border: '#7C4B1E', text: '#FDBA74', headerBg: '#C2410C', accent: '#FF9E44' },
  'Logam transisi': { bg: '#152238', border: '#294E8A', text: '#93C5FD', headerBg: '#1D4ED8', accent: '#3B82F6' },
  'Logam pascatransisi': { bg: '#132824', border: '#206352', text: '#6EE7B7', headerBg: '#047857', accent: '#10B981' },
  Metaloid: { bg: '#282412', border: '#6D5D1C', text: '#FDE047', headerBg: '#A16207', accent: '#EAB308' },
  Nonlogam: { bg: '#14291D', border: '#236942', text: '#86EFAC', headerBg: '#15803D', accent: '#22C55E' },
  Halogen: { bg: '#2D1627', border: '#7E2866', text: '#F9A8D4', headerBg: '#BE185D', accent: '#EC4899' },
  'Gas mulia': { bg: '#231733', border: '#5E3094', text: '#D8B4FE', headerBg: '#7E22CE', accent: '#A855F7' },
  Lantanida: { bg: '#12262E', border: '#1E6178', text: '#67E8F9', headerBg: '#0E7490', accent: '#06B6D4' },
  Aktinida: { bg: '#2E161E', border: '#822744', text: '#FDA4AF', headerBg: '#BE123C', accent: '#F43F5E' },
  Lainnya: { bg: '#1E2028', border: '#383B4A', text: '#D1D5DB', headerBg: '#374151', accent: '#9CA3AF' },
};

export function getCategoryAccentHex(category?: string): string {
  if (!category) return '#9CA3AF';
  return CATEGORY_META_BY_ID[category]?.accentHex ?? CATEGORY_COLORS[category]?.accent ?? '#9CA3AF';
}

export function roundToNearestTen(val: number): number {
  return Math.round(val / 10) * 10;
}

export function roundToHundred(val: number): number {
  return Math.round(val / 100) * 100;
}

export function ceilToHundred(val: number): number {
  return Math.ceil(val / 100) * 100;
}

/**
 * Base Rent formula (Section 12.4):
 * baseRent = max(10, roundToNearestTen(basePrice * 0.075))
 */
export function calculateBaseRent(
  basePriceKK: number,
  config: EconomyConfig = DEFAULT_ECONOMY_CONFIG
): number {
  return Math.max(config.rent.minimumRent, roundToNearestTen(basePriceKK * config.rent.baseRentRate));
}

export interface TitleDeedRentSchedule {
  baseRentKK: number;
  completeSetKK: number;
  oneSmallKK: number;
  twoSmallKK: number;
  threeSmallKK: number;
  fourSmallKK: number;
  bigCompanyKK: number;
}

export function getTitleDeedRentSchedule(
  basePriceKK: number,
  config: EconomyConfig = DEFAULT_ECONOMY_CONFIG
): TitleDeedRentSchedule {
  const baseRent = calculateBaseRent(basePriceKK, config);
  const m = config.rent.multipliers;
  return {
    baseRentKK: baseRent * m.noCompany,
    completeSetKK: baseRent * m.completeSet,
    oneSmallKK: baseRent * m.oneSmallCompany,
    twoSmallKK: baseRent * m.twoSmallCompanies,
    threeSmallKK: baseRent * m.threeSmallCompanies,
    fourSmallKK: baseRent * m.fourSmallCompanies,
    bigCompanyKK: baseRent * m.bigCompany,
  };
}

export function calculateRent(
  prop: PropertyOwnership,
  config: EconomyConfig = DEFAULT_ECONOMY_CONFIG
): number {
  const element = prop.atomicNumber ? ELEMENTS_BY_ID[prop.atomicNumber] : null;
  if (!element) return 0;

  const schedule = getTitleDeedRentSchedule(element.basePriceKK, config);

  if (prop.hasLargeCompany) return schedule.bigCompanyKK;
  if (prop.smallCompanies === 4) return schedule.fourSmallKK;
  if (prop.smallCompanies === 3) return schedule.threeSmallKK;
  if (prop.smallCompanies === 2) return schedule.twoSmallKK;
  if (prop.smallCompanies === 1) return schedule.oneSmallKK;
  return schedule.baseRentKK;
}

/**
 * Construction Cost of ONE small company (Section 12.3):
 * smallCompanyCost = max(300, roundToHundred(basePrice * (2 / 3)))
 */
export function calculateSmallCompanyUnitCost(
  basePriceKK: number,
  config: EconomyConfig = DEFAULT_ECONOMY_CONFIG
): number {
  return Math.max(
    config.construction.minimumSmallCompanyCost,
    roundToHundred(basePriceKK * config.construction.smallCompanyCostRate)
  );
}

export function calculateCompanyBuildCost(
  prop: PropertyOwnership | undefined,
  element: ChemicalElement,
  config: EconomyConfig = DEFAULT_ECONOMY_CONFIG
): { canBuild: boolean; costKK: number; type: 'small' | 'large' | 'none' } {
  const unitCost = calculateSmallCompanyUnitCost(element.basePriceKK, config);

  if (!prop) {
    return { canBuild: false, costKK: 0, type: 'none' };
  }

  if (prop.hasLargeCompany) {
    return { canBuild: false, costKK: 0, type: 'none' };
  }

  if (prop.smallCompanies < config.construction.maximumSmallCompanies) {
    return { canBuild: true, costKK: unitCost, type: 'small' };
  }

  return {
    canBuild: true,
    costKK: unitCost * (config.construction.bigCompanyUpgradeCostUnits || 1),
    type: 'large',
  };
}

/**
 * Business Income at START for a single property (Section 11.3 — Approved v3.0 Rule):
 * Calculation base = ONE small company construction cost (`smallCompanyCost`).
 * 1 small = 120% | 2 small = 140% | 3 small = 160% | 4 small = 180% | 1 big = 200%
 */
export function calculatePropertyStartIncome(
  basePriceKK: number,
  smallCompanies: number,
  hasLargeCompany: boolean,
  config: EconomyConfig = DEFAULT_ECONOMY_CONFIG
): number {
  const smallCost = calculateSmallCompanyUnitCost(basePriceKK, config);
  let rate = 0;

  if (hasLargeCompany) {
    rate = config.businessIncome.bigCompany;
  } else if (smallCompanies >= 4) {
    rate = config.businessIncome.fourSmallCompanies;
  } else if (smallCompanies === 3) {
    rate = config.businessIncome.threeSmallCompanies;
  } else if (smallCompanies === 2) {
    rate = config.businessIncome.twoSmallCompanies;
  } else if (smallCompanies === 1) {
    rate = config.businessIncome.oneSmallCompany;
  }

  return rate > 0 ? Math.round(smallCost * rate) : 0;
}

export interface StartIncomeSchedule {
  smallCompanyUnitCostKK: number;
  oneSmallIncomeKK: number;
  twoSmallIncomeKK: number;
  threeSmallIncomeKK: number;
  fourSmallIncomeKK: number;
  bigCompanyIncomeKK: number;
}

export function getStartIncomeSchedule(
  basePriceKK: number,
  config: EconomyConfig = DEFAULT_ECONOMY_CONFIG
): StartIncomeSchedule {
  return {
    smallCompanyUnitCostKK: calculateSmallCompanyUnitCost(basePriceKK, config),
    oneSmallIncomeKK: calculatePropertyStartIncome(basePriceKK, 1, false, config),
    twoSmallIncomeKK: calculatePropertyStartIncome(basePriceKK, 2, false, config),
    threeSmallIncomeKK: calculatePropertyStartIncome(basePriceKK, 3, false, config),
    fourSmallIncomeKK: calculatePropertyStartIncome(basePriceKK, 4, false, config),
    bigCompanyIncomeKK: calculatePropertyStartIncome(basePriceKK, 0, true, config),
  };
}

/**
 * Aggregate Business Income at START (Section 11.3):
 * Fixed START salary = 0 KK (unless explicitly configured in DRAFT setup).
 * Income only comes from developed element companies at 120%–200% of one small company cost.
 */
export function calculateStartIncome(
  teamId: string,
  state: GameState
): {
  totalIncomeKK: number;
  companyIncomeKK: number;
  fixedSalaryKK: number;
  breakdown: { tileId: string; name: string; incomeKK: number }[];
} {
  let companyIncomeKK = 0;
  const breakdown: { tileId: string; name: string; incomeKK: number }[] = [];

  const team = state.teams.find((t) => t.id === teamId);
  if (!team || team.skipNextIncome || team.isBankrupt) {
    return { totalIncomeKK: 0, companyIncomeKK: 0, fixedSalaryKK: 0, breakdown: [] };
  }

  const { economyConfig } = state;

  Object.values(state.properties).forEach((prop) => {
    if (prop.ownerTeamId !== teamId) return;

    const element = prop.atomicNumber ? ELEMENTS_BY_ID[prop.atomicNumber] : null;
    if (!element) return;

    const income = calculatePropertyStartIncome(
      element.basePriceKK,
      prop.smallCompanies,
      prop.hasLargeCompany,
      economyConfig
    );

    if (income > 0) {
      companyIncomeKK += income;
      breakdown.push({
        tileId: prop.tileId,
        name: `${element.symbol} — ${element.nameEn}`,
        incomeKK: income,
      });
    }
  });

  const fixedSalaryKK = economyConfig.businessIncome.fixedStartSalary || 0;
  return {
    totalIncomeKK: companyIncomeKK + fixedSalaryKK,
    companyIncomeKK,
    fixedSalaryKK,
    breakdown,
  };
}

export function calculateMaintenance(
  basePriceKK: number,
  config: EconomyConfig = DEFAULT_ECONOMY_CONFIG
): number {
  return basePriceKK * config.maintenance.ownPropertyMultiplier;
}

export function calculateAuctionMinimum(
  basePriceKK: number,
  config: EconomyConfig = DEFAULT_ECONOMY_CONFIG
): number {
  const unit = config.elementPricing.auctionRoundingUnit || 100;
  return Math.ceil((basePriceKK * config.elementPricing.auctionRate) / unit) * unit;
}

export function calculateNetWorth(teamId: string, state: GameState): number {
  const team = state.teams.find((t) => t.id === teamId);
  if (!team) return 0;
  let total = team.balanceKK;
  Object.values(state.properties).forEach((prop) => {
    if (prop.ownerTeamId !== teamId) return;
    const el = prop.atomicNumber ? ELEMENTS_BY_ID[prop.atomicNumber] : null;
    if (!el) return;
    total += el.basePriceKK;
    const unitCost = calculateSmallCompanyUnitCost(el.basePriceKK, state.economyConfig);
    const units = prop.hasLargeCompany ? 5 : prop.smallCompanies;
    total += units * unitCost;
  });
  Object.values(state.mainProperties).forEach((mp) => {
    if (mp.ownerTeamId !== teamId) return;
    const def = MAIN_PROPERTIES_BY_ID[mp.propertyId];
    if (def) total += def.draftPurchasePriceKK;
  });
  return total;
}
