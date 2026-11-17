import { describe, it, expect } from 'vitest';
import {
  advanceToNextTurn,
  applyDiceMove,
  buildCompanyOnProperty,
  buyElementProperty,
  createDefaultTeams,
  createInitialGameState,
  finalizeAuction,
  payJailBailOrCard,
  placeAuctionBid,
  resolveLandedTileEffects,
  resolveQuizResult,
  resolveStudyCaseResult,
  startElementAuction,
} from '../engine/gameActions';
import {
  ELEMENTS_BY_ID,
  ELEMENTS_LIST,
  TILES_BY_PATH_INDEX,
  calculateRent,
  getStateAtTemperature,
} from '../engine/gameEngine';
import { GROUP_TRADITIONAL_LABELS } from '../data/categories';
import { CURATED_CASE_STUDIES } from '../data/case-studies';
import { CURATED_QUIZ_CARDS } from '../data/quiz-cards';
import { COMPOUNDS_DATABASE } from '../data/compounds';
import { getIsotopesForElement } from '../data/isotopes';

describe('Strict Turn & Position-Enforced Monopoly Gameplay', () => {
  it('blocks buying unvisited or distant properties until active team lands on the tile', () => {
    const state = createInitialGameState(createDefaultTeams(2));
    // Active team_1 starts at tile #0 (START). Tile #1 is Hydrogen (element-H).
    const resDistant = buyElementProperty(state, 'team_1', 'element-H');
    expect(resDistant.ok).toBe(false);
    expect(resDistant.error).toContain('not on #1');

    // Non-active team_2 cannot purchase on team_1 turn even if standing on same tile
    const resWrongTeam = buyElementProperty(state, 'team_2', 'element-H');
    expect(resWrongTeam.ok).toBe(false);
    expect(resWrongTeam.error).toContain('Only the active turn team');
  });

  it('moves piece exact d1+d2 steps, wraps 130 tiles across START, and allows buying landed unowned element', () => {
    let state = createInitialGameState(createDefaultTeams(2));
    // Roll [1, 1] -> moves from 0 to 2 (He)
    const moveRes = applyDiceMove(state, 1, 1);
    expect(moveRes.ok).toBe(true);
    expect(moveRes.pathSteps).toEqual([1, 2]);
    expect(moveRes.state.teams[0].position).toBe(2);

    const resolved = resolveLandedTileEffects(moveRes.state);
    expect(resolved.state.phase).toBe('ELEMENT_PURCHASE');
    const landedTile = TILES_BY_PATH_INDEX[2];
    expect(landedTile.atomicNumber).toBe(2); // Helium

    const hePrice = ELEMENTS_BY_ID[2].basePriceKK;
    const buyRes = buyElementProperty(resolved.state, 'team_1', landedTile.tileId);
    expect(buyRes.ok).toBe(true);
    expect(buyRes.state.properties[landedTile.tileId]?.ownerTeamId).toBe('team_1');
    expect(buyRes.state.teams[0].balanceKK).toBe(100000 - hePrice);

    // Test wrap-around modulo 130 across START
    const nearEndState = {
      ...buyRes.state,
      phase: 'TURN_START' as const,
      teams: buyRes.state.teams.map((t, i) => (i === 0 ? { ...t, position: 127 } : t)),
    };
    const wrapMove = applyDiceMove(nearEndState, 3, 4); // 7 steps: 128, 129, 0, 1, 2, 3, 4
    expect(wrapMove.ok).toBe(true);
    expect(wrapMove.crossedStart).toBe(true);
    expect(wrapMove.pathSteps).toEqual([128, 129, 0, 1, 2, 3, 4]);
    expect(wrapMove.state.teams[0].position).toBe(4);
  });

  it('transfers exact Title Deed rent to owner and charges 2x maintenance on own tile', () => {
    let state = createInitialGameState(createDefaultTeams(2));
    // Put team_1 on Oxygen (atomicNumber 8, basePrice 1600)
    const oTile = Object.values(TILES_BY_PATH_INDEX).find((t) => t.atomicNumber === 8)!;
    state = {
      ...state,
      teams: state.teams.map((t, i) => (i === 0 ? { ...t, position: oTile.pathIndex } : t)),
      phase: 'ELEMENT_PURCHASE',
    };
    const bought = buyElementProperty(state, 'team_1', oTile.tileId).state;
    // Build 1 small company (cost 1100 KK) -> 1 small rent = 600 KK
    const built = buildCompanyOnProperty(bought, 'team_1', oTile.tileId).state;
    expect(built.properties[oTile.tileId].smallCompanies).toBe(1);
    expect(calculateRent(built.properties[oTile.tileId])).toBe(600);

    // Team 2 lands on Oxygen -> pays 600 KK to Team 1
    let turn2 = advanceToNextTurn(built);
    const t1BalBefore = turn2.teams[0].balanceKK;
    const t2BalBefore = turn2.teams[1].balanceKK;
    turn2 = {
      ...turn2,
      teams: turn2.teams.map((t, i) => (i === 1 ? { ...t, position: oTile.pathIndex } : t)),
    };
    const rentRes = resolveLandedTileEffects(turn2).state;
    expect(rentRes.teams[1].balanceKK).toBe(t2BalBefore - 600);
    expect(rentRes.teams[0].balanceKK).toBe(t1BalBefore + 600);

    // Team 1 lands on own Oxygen -> pays 2x basePrice maintenance = 3200 KK
    let backToT1 = advanceToNextTurn(rentRes);
    const t1BeforeMaint = backToT1.teams[0].balanceKK;
    backToT1 = {
      ...backToT1,
      teams: backToT1.teams.map((t, i) => (i === 0 ? { ...t, position: oTile.pathIndex } : t)),
    };
    const maintRes = resolveLandedTileEffects(backToT1).state;
    expect(maintRes.teams[0].balanceKK).toBe(t1BeforeMaint - 3200);
  });

  it('enforces clean-sold 70% minimum auction rules and clears seller companies on transfer', () => {
    let state = createInitialGameState(createDefaultTeams(2));
    const oTile = Object.values(TILES_BY_PATH_INDEX).find((t) => t.atomicNumber === 8)!;
    state = {
      ...state,
      teams: state.teams.map((t, i) => (i === 0 ? { ...t, position: oTile.pathIndex } : t)),
      phase: 'ELEMENT_PURCHASE',
    };
    state = buyElementProperty(state, 'team_1', oTile.tileId).state;
    state = buildCompanyOnProperty(state, 'team_1', oTile.tileId).state;

    const started = startElementAuction(state, 'team_1', oTile.tileId);
    expect(started.ok).toBe(true);
    expect(started.state.activeAuction?.currentBidKK).toBe(1200); // ceil(1600 * 0.7 = 1120) -> 1200

    const tooLow = placeAuctionBid(started.state, 'team_2', 1100);
    expect(tooLow.ok).toBe(false);

    const overBalance = placeAuctionBid(started.state, 'team_2', 999999);
    expect(overBalance.ok).toBe(false);

    const validBid = placeAuctionBid(started.state, 'team_2', 1500);
    expect(validBid.ok).toBe(true);

    const settled = finalizeAuction(validBid.state);
    expect(settled.ok).toBe(true);
    expect(settled.state.properties[oTile.tileId].ownerTeamId).toBe('team_2');
    expect(settled.state.properties[oTile.tileId].smallCompanies).toBe(0); // clean-sold!
    expect(settled.state.properties[oTile.tileId].hasLargeCompany).toBe(false);
  });

  it('handles jail bail/card escape and bankruptcy on 3 study case fails, 7 quiz fails, or negative rent', () => {
    // 1) Jail bail / card
    let state = createInitialGameState(createDefaultTeams(2));
    state = {
      ...state,
      teams: state.teams.map((t, i) => (i === 0 ? { ...t, isInJail: true, jailTurns: 3, jailCards: 1 } : t)),
    };
    const escaped = payJailBailOrCard(state, 'team_1', 'card');
    expect(escaped.ok).toBe(true);
    expect(escaped.state.teams[0].isInJail).toBe(false);
    expect(escaped.state.teams[0].jailCards).toBe(0);

    // 2) 3 study case failures -> bankrupt -> advanceToNextTurn -> GAME_OVER
    let caseState = {
      ...escaped.state,
      teams: escaped.state.teams.map((t, i) => (i === 0 ? { ...t, studyCaseFailures: 2 } : t)),
      activeStudyCase: CURATED_CASE_STUDIES[0],
    };
    const failed3 = resolveStudyCaseResult(caseState, false).state;
    expect(failed3.teams[0].studyCaseFailures).toBe(3);
    expect(failed3.teams[0].isBankrupt).toBe(true);
    const over = advanceToNextTurn(failed3);
    expect(over.phase).toBe('GAME_OVER');
    expect(over.winnerTeamId).toBe('team_2');

    // 3) 7 quiz failures -> bankrupt
    let quizState = createInitialGameState(createDefaultTeams(2));
    const card = CURATED_QUIZ_CARDS[0];
    const wrongOption = card.correctOptionId === 'A' ? 'B' : 'A';
    quizState = {
      ...quizState,
      teams: quizState.teams.map((t, i) => (i === 0 ? { ...t, quizFailures: 6 } : t)),
      activeQuiz: card,
    };
    const failed7 = resolveQuizResult(quizState, wrongOption).state;
    expect(failed7.teams[0].quizFailures).toBe(7);
    expect(failed7.teams[0].isBankrupt).toBe(true);
  });
});

describe('118-Element Periodic Table, Temperature States & Educational Datasets', () => {
  it('contains all 118 elements with both English and Indonesian names plus traditional groups', () => {
    expect(ELEMENTS_LIST.length).toBe(118);
    expect(GROUP_TRADITIONAL_LABELS[1]).toBe('IA');
    expect(GROUP_TRADITIONAL_LABELS[18]).toBe('VIIIA');
    ELEMENTS_LIST.forEach((el) => {
      expect(el.nameEn.length).toBeGreaterThan(0);
      expect(el.nameId.length).toBeGreaterThan(0);
    });
  });

  it('computes accurate states of matter at 0°C default and dynamic temperature changes', () => {
    // At 0°C: H (1), N (7), O (8), Cl (17) = Gas; Br (35), Hg (80) = Liquid; Fe (26), Au (79) = Solid; Og (118) = Unknown
    expect(getStateAtTemperature(ELEMENTS_BY_ID[1], 0)).toBe('Gas');
    expect(getStateAtTemperature(ELEMENTS_BY_ID[8], 0)).toBe('Gas');
    expect(getStateAtTemperature(ELEMENTS_BY_ID[35], 0)).toBe('Liquid');
    expect(getStateAtTemperature(ELEMENTS_BY_ID[80], 0)).toBe('Liquid');
    expect(getStateAtTemperature(ELEMENTS_BY_ID[26], 0)).toBe('Solid');
    expect(getStateAtTemperature(ELEMENTS_BY_ID[118], 0)).toBe('Unknown');

    // At -50°C: Br (-7.2°C mp) and Hg (-38.83°C mp) become Solid
    expect(getStateAtTemperature(ELEMENTS_BY_ID[35], -50)).toBe('Solid');
    expect(getStateAtTemperature(ELEMENTS_BY_ID[80], -50)).toBe('Solid');

    // At +100°C: Br (58.8°C bp) becomes Gas; Ga (29.76°C mp) and Cs (28.44°C mp) become Liquid
    expect(getStateAtTemperature(ELEMENTS_BY_ID[35], 100)).toBe('Gas');
    expect(getStateAtTemperature(ELEMENTS_BY_ID[31], 100)).toBe('Liquid');
    expect(getStateAtTemperature(ELEMENTS_BY_ID[55], 100)).toBe('Liquid');
  });

  it('provides 20 case studies, 20 quiz cards, verified isotopes, and compounds', () => {
    expect(CURATED_CASE_STUDIES.length).toBe(20);
    expect(CURATED_QUIZ_CARDS.length).toBe(20);
    expect(COMPOUNDS_DATABASE.length).toBeGreaterThanOrEqual(15);

    const carbonIso = getIsotopesForElement(6);
    expect(carbonIso.coverage).toBe('verified');
    expect(carbonIso.records.some((r) => r.massNumber === 12)).toBe(true);

    // Uncatalogued synthetic element cleanly reports unavailable rather than inventing isotopes
    const uncataloguedIso = getIsotopesForElement(115);
    expect(uncataloguedIso.coverage).toBe('unavailable');
    expect(uncataloguedIso.records).toEqual([]);
  });
});
