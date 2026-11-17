import { describe, it, expect } from 'vitest';
import boardLayout from '../data/boardLayout.json';
import elements from '../data/elements.json';
import {
  calculateBaseRent,
  getTitleDeedRentSchedule,
  calculateCompanyBuildCost,
  calculateMaintenance,
  calculateAuctionMinimum,
  calculateSmallCompanyUnitCost,
  calculatePropertyStartIncome,
  getStartIncomeSchedule,
} from '../engine/gameEngine';
import { ChemicalElement, PropertyOwnership } from '../types/game';

describe('130 Board Tiles Validation (Section 3 & 12.1)', () => {
  it('has exactly 130 tiles', () => {
    expect(boardLayout.length).toBe(130);
  });

  it('has exactly 118 element tiles', () => {
    const elTiles = boardLayout.filter((t: any) => t.tileType === 'element');
    expect(elTiles.length).toBe(118);
  });

  it('contains every atomic number 1 to 118 strictly in order', () => {
    const elTiles = boardLayout.filter((t: any) => t.tileType === 'element');
    const atomicNums = elTiles.map((t: any) => t.atomicNumber);
    expect(atomicNums.length).toBe(118);
    atomicNums.forEach((num: number, idx: number) => {
      expect(num).toBe(idx + 1);
    });
  });

  it('contains critical transition elements Co27, Ni28, Cu29, Zn30 on top edge before jail', () => {
    const co = boardLayout.find((t: any) => t.atomicNumber === 27);
    const ni = boardLayout.find((t: any) => t.atomicNumber === 28);
    const cu = boardLayout.find((t: any) => t.atomicNumber === 29);
    const zn = boardLayout.find((t: any) => t.atomicNumber === 30);
    const jail = boardLayout.find((t: any) => t.corner === 'jail');

    expect(co).toBeDefined();
    expect(ni).toBeDefined();
    expect(cu).toBeDefined();
    expect(zn).toBeDefined();
    expect(jail).toBeDefined();

    expect(co!.pathIndex).toBeLessThan(jail!.pathIndex);
    expect(ni!.pathIndex).toBeLessThan(jail!.pathIndex);
    expect(cu!.pathIndex).toBeLessThan(jail!.pathIndex);
    expect(zn!.pathIndex).toBeLessThan(jail!.pathIndex);
  });

  it('has 4 corners at the exact positions according to PDF', () => {
    const start = boardLayout[0];
    const jail = boardLayout[33];
    const parking = boardLayout[65];
    const customs = boardLayout[98];

    expect(start.corner).toBe('start');
    expect(jail.corner).toBe('jail');
    expect(parking.corner).toBe('parking');
    expect(customs.corner).toBe('customs');
  });

  it('has 4 main properties, 2 study cases, 2 quizzes distributed across sides', () => {
    const mainProps = boardLayout.filter((t: any) => t.tileType === 'main_property');
    const studyCases = boardLayout.filter((t: any) => t.tileType === 'study_case');
    const quizzes = boardLayout.filter((t: any) => t.tileType === 'quiz');

    expect(mainProps.length).toBe(4);
    expect(studyCases.length).toBe(2);
    expect(quizzes.length).toBe(2);
  });

  it('has unique tileIds and contiguous unique pathIndex 0 to 129', () => {
    const ids = new Set();
    boardLayout.forEach((t: any, idx: number) => {
      expect(t.pathIndex).toBe(idx);
      expect(ids.has(t.tileId)).toBe(false);
      ids.add(t.tileId);
    });
    expect(ids.size).toBe(130);
  });
});

describe('Title Deed Pricing & START Business Income Verification for Oxygen (Section 7 & 11.3)', () => {
  const oxygen: ChemicalElement = {
    atomicNumber: 8,
    symbol: 'O',
    nameId: 'Oksigen',
    nameEn: 'Oxygen',
    atomicMassDisplay: '15.999 u',
    massValueForPricing: 15.999,
    roundedMassForPricing: 16,
    basePriceKK: 1600,
    auctionMinimumKK: 1200,
    ownTileMaintenanceKK: 3200,
    massNumberInBrackets: false,
    pricingStatus: 'PROPOSED_DRAFT',
  };

  it('calculates Oxygen base price as 1600 KK and minimum auction as 1200 KK', () => {
    expect(oxygen.basePriceKK).toBe(1600);
    expect(calculateAuctionMinimum(oxygen.basePriceKK)).toBe(1200);
  });

  it('calculates Oxygen Title Deed Rent tiers exactly as specified in Section 7.5 & 12.2', () => {
    const schedule = getTitleDeedRentSchedule(oxygen.basePriceKK);
    expect(schedule.baseRentKK).toBe(120); // 7.5% of 1600
    expect(schedule.oneSmallKK).toBe(600); // 5x
    expect(schedule.twoSmallKK).toBe(1800); // 15x
    expect(schedule.threeSmallKK).toBe(5160); // 43x
    expect(schedule.fourSmallKK).toBe(7200); // 60x
    expect(schedule.bigCompanyKK).toBe(9000); // 75x
  });

  it('calculates construction cost of small company as 1100 KK and upgrade as 1100 KK', () => {
    const propUnbuilt: PropertyOwnership = {
      tileId: 'element-O',
      pathIndex: 9,
      atomicNumber: 8,
      ownerTeamId: 'team_1',
      smallCompanies: 0,
      hasLargeCompany: false,
    };
    const build1 = calculateCompanyBuildCost(propUnbuilt, oxygen);
    expect(build1.canBuild).toBe(true);
    expect(build1.costKK).toBe(1100); // 2/3 of 1600 = 1066.67 -> roundToHundred = 1100
    expect(build1.type).toBe('small');

    const prop4Small: PropertyOwnership = {
      tileId: 'element-O',
      pathIndex: 9,
      atomicNumber: 8,
      ownerTeamId: 'team_1',
      smallCompanies: 4,
      hasLargeCompany: false,
    };
    const buildBig = calculateCompanyBuildCost(prop4Small, oxygen);
    expect(buildBig.canBuild).toBe(true);
    expect(buildBig.costKK).toBe(1100);
    expect(buildBig.type).toBe('large');
  });

  it('calculates Oxygen START Business Income strictly as 120%–200% of one small company cost (1100 KK)', () => {
    expect(calculateSmallCompanyUnitCost(oxygen.basePriceKK)).toBe(1100);
    const inc = getStartIncomeSchedule(oxygen.basePriceKK);
    expect(inc.smallCompanyUnitCostKK).toBe(1100);
    expect(inc.oneSmallIncomeKK).toBe(1320); // 120% of 1100
    expect(inc.twoSmallIncomeKK).toBe(1540); // 140% of 1100
    expect(inc.threeSmallIncomeKK).toBe(1760); // 160% of 1100
    expect(inc.fourSmallIncomeKK).toBe(1980); // 180% of 1100
    expect(inc.bigCompanyIncomeKK).toBe(2200); // 200% of 1100
    expect(calculatePropertyStartIncome(oxygen.basePriceKK, 0, false)).toBe(0);
  });

  it('calculates maintenance on own property as 2x base price (3200 KK for Oksigen)', () => {
    expect(calculateMaintenance(oxygen.basePriceKK)).toBe(3200);
  });
});
