import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  advanceToNextTurn,
  adminMoveTeam,
  adminUpdateEconomy,
  adminUpdateTeam,
  applyDiceMove,
  buildCompanyOnProperty,
  buyElementProperty,
  createDefaultTeams,
  createInitialGameState,
  migrateEconomyConfig,
  migrateGameStateEconomy,
  payJailBailOrCard,
  resetMatchState,
  resolveLandedTileEffects,
  resolveQuizResult,
  resolveStudyCaseResult,
  resolveTileLanding,
  sendPlayerToJail,
} from '../engine/gameActions';
import {
  getPieceWorldCoordinates,
  resolveVisualPiecePathIndex,
} from '../components/board3d/PlayerPiece3D';
import {
  BOARD_TILES,
  CUSTOMS_TILE,
  JAIL_TILE,
  TILES_BY_PATH_INDEX,
} from '../engine/gameEngine';
import {
  CURRENT_ECONOMY_SCHEMA_VERSION,
  DEFAULT_ECONOMY_CONFIG,
  DEFAULT_JAIL_BAIL_KK,
  GameState,
} from '../types/game';
import {
  V2_LOCAL_STORAGE_KEY,
  clearLocalGames,
  loadLocalGame,
} from '../storage/indexedDB';

function createMemoryStorage(): Storage {
  const store = new Map<string, string>();
  return {
    get length() {
      return store.size;
    },
    clear() {
      store.clear();
    },
    getItem(key: string) {
      return store.has(key) ? store.get(key)! : null;
    },
    key(index: number) {
      return Array.from(store.keys())[index] ?? null;
    },
    removeItem(key: string) {
      store.delete(key);
    },
    setItem(key: string, value: string) {
      store.set(key, String(value));
    },
  };
}

describe('V2 Research Edition: Customs-to-Jail Mechanics & Dynamic Manifest Lookup', () => {
  it('Test A: resolves Customs and Jail corner tiles dynamically from boardLayout.json', () => {
    expect(CUSTOMS_TILE).toBeDefined();
    expect(JAIL_TILE).toBeDefined();
    expect(CUSTOMS_TILE?.tileId).toBe('corner-customs');
    expect(CUSTOMS_TILE?.tileType).toBe('customs');
    expect(JAIL_TILE?.tileId).toBe('corner-jail');
    expect(JAIL_TILE?.tileType).toBe('jail');

    const manifestCustoms = BOARD_TILES.find((t) => t.tileType === 'customs');
    const manifestJail = BOARD_TILES.find((t) => t.tileType === 'jail');
    expect(CUSTOMS_TILE?.pathIndex).toBe(manifestCustoms?.pathIndex);
    expect(JAIL_TILE?.pathIndex).toBe(manifestJail?.pathIndex);
  });

  it('Test B: landing exactly on Customs moves token directly to Jail, sets detention, and logs single event', () => {
    const customsIdx = CUSTOMS_TILE!.pathIndex;
    const jailIdx = JAIL_TILE!.pathIndex;

    let state = createInitialGameState(createDefaultTeams(2));
    state = {
      ...state,
      teams: state.teams.map((t, idx) =>
        idx === 0 ? { ...t, position: customsIdx - 4 } : t
      ),
    };

    const move = applyDiceMove(state, 2, 2);
    expect(move.ok).toBe(true);
    expect(move.customsTriggered).toBe(true);
    expect(move.forcedJailPathIndex).toBe(jailIdx);
    expect(move.crossedStart).toBe(false);
    expect(move.pathSteps).toEqual([
      customsIdx - 3,
      customsIdx - 2,
      customsIdx - 1,
      customsIdx,
      jailIdx,
    ]);

    const active = move.state.teams[0];
    expect(active.position).toBe(jailIdx);
    expect(active.isInJail).toBe(true);
    expect(active.jailTurns).toBe(3);
    expect(active.jailStatus).toBe('detained');

    const customsEvents = move.state.events.filter((e) => e.type === 'CUSTOMS_SENT_TO_JAIL');
    expect(customsEvents).toHaveLength(1);
    expect(customsEvents[0].description).toBe(
      `${active.name} terkena Bea Cukai dan dikirim ke Penjara!`
    );

    const resolved = resolveLandedTileEffects(move.state);
    expect(resolved.ok).toBe(true);
    expect(resolved.state.phase).toBe('TURN_END');
    expect(resolved.state.teams[0].position).toBe(jailIdx);
    expect(resolved.state.teams[0].isInJail).toBe(true);
    expect(resolved.state.teams[0].jailTurns).toBe(3);
    expect(
      resolved.state.events.filter((e) => e.type === 'CUSTOMS_SENT_TO_JAIL')
    ).toHaveLength(1);
  });

  it('Test C: passing across Customs mid-roll truncates remaining steps and teleports to Jail', () => {
    const customsIdx = CUSTOMS_TILE!.pathIndex;
    const jailIdx = JAIL_TILE!.pathIndex;

    let state = createInitialGameState(createDefaultTeams(2));
    const tileAfterCustoms = TILES_BY_PATH_INDEX[customsIdx + 2];
    if (tileAfterCustoms?.tileType === 'element') {
      state = {
        ...state,
        properties: {
          [tileAfterCustoms.tileId]: {
            tileId: tileAfterCustoms.tileId,
            pathIndex: tileAfterCustoms.pathIndex,
            atomicNumber: tileAfterCustoms.atomicNumber,
            ownerTeamId: 'team_2',
            smallCompanies: 2,
            hasLargeCompany: false,
          },
        },
      };
    }

    state = {
      ...state,
      teams: state.teams.map((t, idx) =>
        idx === 0 ? { ...t, position: customsIdx - 2 } : t
      ),
    };

    const startBalTeam1 = state.teams[0].balanceKK;
    const startBalTeam2 = state.teams[1].balanceKK;

    const move = applyDiceMove(state, 3, 4);
    expect(move.ok).toBe(true);
    expect(move.customsTriggered).toBe(true);
    expect(move.pathSteps).toEqual([customsIdx - 1, customsIdx, jailIdx]);
    expect(move.state.teams[0].position).toBe(jailIdx);
    expect(move.state.teams[0].isInJail).toBe(true);
    expect(move.state.teams[0].jailTurns).toBe(3);

    const resolved = resolveLandedTileEffects(move.state);
    expect(resolved.state.teams[0].balanceKK).toBe(startBalTeam1);
    expect(resolved.state.teams[1].balanceKK).toBe(startBalTeam2);
    expect(resolved.state.teams[0].isInJail).toBe(true);
  });

  it('Test D: normal roll not touching Customs does not trigger detention', () => {
    let state = createInitialGameState(createDefaultTeams(2));
    state = {
      ...state,
      teams: state.teams.map((t, idx) => (idx === 0 ? { ...t, position: 10 } : t)),
    };

    const move = applyDiceMove(state, 3, 4);
    expect(move.ok).toBe(true);
    expect(move.customsTriggered).toBe(false);
    expect(move.state.teams[0].position).toBe(17);
    expect(move.state.teams[0].isInJail).toBe(false);
  });

  it('Test E: starting ON Customs and rolling away does NOT re-trigger Customs', () => {
    const customsIdx = CUSTOMS_TILE!.pathIndex;
    let state = createInitialGameState(createDefaultTeams(2));
    state = {
      ...state,
      teams: state.teams.map((t, idx) =>
        idx === 0 ? { ...t, position: customsIdx, isInJail: false } : t
      ),
    };

    const move = applyDiceMove(state, 1, 2);
    expect(move.ok).toBe(true);
    expect(move.customsTriggered).toBe(false);
    expect(move.pathSteps).toEqual([customsIdx + 1, customsIdx + 2, customsIdx + 3]);
    expect(move.state.teams[0].position).toBe(customsIdx + 3);
    expect(move.state.teams[0].isInJail).toBe(false);
  });

  it('Test F: enforces idempotency on Customs/Jail resolution and separates voluntary Jail visit from detention', () => {
    const customsIdx = CUSTOMS_TILE!.pathIndex;
    const jailIdx = JAIL_TILE!.pathIndex;

    let directState = createInitialGameState(createDefaultTeams(2));
    directState = {
      ...directState,
      phase: 'RESOLVING_TILE',
      teams: directState.teams.map((t, idx) =>
        idx === 0 ? { ...t, position: customsIdx } : t
      ),
    };
    const firstResolve = resolveLandedTileEffects(directState);
    expect(firstResolve.state.teams[0].position).toBe(jailIdx);
    expect(firstResolve.state.teams[0].isInJail).toBe(true);

    const secondResolve = resolveLandedTileEffects(firstResolve.state);
    expect(secondResolve.state.teams[0].position).toBe(jailIdx);
    expect(secondResolve.state.teams[0].isInJail).toBe(true);
    expect(
      secondResolve.state.events.filter((e) => e.type === 'CUSTOMS_SENT_TO_JAIL')
    ).toHaveLength(1);

    let richState = createInitialGameState(createDefaultTeams(2));
    const elTile = TILES_BY_PATH_INDEX[8]!;
    richState = {
      ...richState,
      phase: 'ELEMENT_PURCHASE',
      teams: richState.teams.map((t, idx) => (idx === 0 ? { ...t, position: 8 } : t)),
    };
    richState = buyElementProperty(richState, 'team_1', elTile.tileId).state;
    richState = buildCompanyOnProperty(richState, 'team_1', elTile.tileId).state;
    const balBeforeCustoms = richState.teams[0].balanceKK;
    richState = {
      ...richState,
      phase: 'TURN_START',
      teams: richState.teams.map((t, idx) =>
        idx === 0 ? { ...t, position: customsIdx - 2 } : t
      ),
    };
    const customsMove = applyDiceMove(richState, 1, 2);
    expect(customsMove.crossedStart).toBe(false);
    expect(customsMove.state.teams[0].balanceKK).toBe(balBeforeCustoms);
    expect(customsMove.state.events.some((e) => e.type === 'START_CROSSED')).toBe(false);

    let visitState = createInitialGameState(createDefaultTeams(2));
    visitState = {
      ...visitState,
      teams: visitState.teams.map((t, idx) =>
        idx === 0 ? { ...t, position: jailIdx - 3 } : t
      ),
    };
    const visitMove = applyDiceMove(visitState, 1, 2);
    expect(visitMove.customsTriggered).toBe(false);
    const visitResolve = resolveLandedTileEffects(visitMove.state);
    expect(visitResolve.state.teams[0].position).toBe(jailIdx);
    expect(visitResolve.state.teams[0].isInJail).toBe(false);
    expect(visitResolve.state.teams[0].jailStatus).toBe('visiting');
    expect(visitResolve.state.events[0]?.type).toBe('JAIL_VISITED');
  });
});

describe('V2 Research Edition: Jail Release Fee 20,000 KK & Save Migration', () => {
  const originalStorage = (globalThis as any).localStorage;

  beforeEach(async () => {
    (globalThis as any).localStorage = createMemoryStorage();
    await clearLocalGames();
  });

  afterEach(() => {
    (globalThis as any).localStorage = originalStorage;
  });

  it('defaults Jail Bail fee to 20,000 KK across config and initial game state', () => {
    expect(DEFAULT_JAIL_BAIL_KK).toBe(20000);
    expect(DEFAULT_ECONOMY_CONFIG.educationalRewards.jailBailKK).toBe(20000);
    const state = createInitialGameState(createDefaultTeams(2));
    expect(state.economyConfig.educationalRewards.jailBailKK).toBe(20000);
    expect(state.economyConfig.schemaVersion).toBe(CURRENT_ECONOMY_SCHEMA_VERSION);
  });

  it('charges exactly 20,000 KK on bail, blocks < 20,000 KK, prevents double-charge, and preserves card escape', () => {
    let state = createInitialGameState(createDefaultTeams(2));
    state = {
      ...state,
      teams: state.teams.map((t, idx) =>
        idx === 0
          ? {
              ...t,
              position: JAIL_TILE!.pathIndex,
              balanceKK: 20000,
              isInJail: true,
              jailTurns: 3,
              jailStatus: 'detained',
            }
          : t
      ),
    };

    const paid = payJailBailOrCard(state, 'team_1', 'bail');
    expect(paid.ok).toBe(true);
    expect(paid.state.teams[0].balanceKK).toBe(0);
    expect(paid.state.teams[0].isInJail).toBe(false);
    expect(paid.state.teams[0].jailTurns).toBe(0);
    expect(paid.state.teams[0].jailStatus).toBe('released');
    expect(paid.state.events[0]?.type).toBe('JAIL_BAIL_PAID');
    expect(paid.state.events[0]?.amountKK).toBe(-20000);
    expect(paid.state.events[0]?.description).toContain('20.000 KK');

    const duplicate = payJailBailOrCard(paid.state, 'team_1', 'bail');
    expect(duplicate.ok).toBe(false);
    expect(duplicate.state.teams[0].balanceKK).toBe(0);

    let poorState = createInitialGameState(createDefaultTeams(2));
    poorState = {
      ...poorState,
      teams: poorState.teams.map((t, idx) =>
        idx === 0
          ? {
              ...t,
              position: JAIL_TILE!.pathIndex,
              balanceKK: 19999,
              isInJail: true,
              jailTurns: 3,
              jailCards: 1,
            }
          : t
      ),
    };
    const rejected = payJailBailOrCard(poorState, 'team_1', 'bail');
    expect(rejected.ok).toBe(false);
    expect(rejected.state.teams[0].balanceKK).toBe(19999);
    expect(rejected.state.teams[0].isInJail).toBe(true);

    const cardEscape = payJailBailOrCard(poorState, 'team_1', 'card');
    expect(cardEscape.ok).toBe(true);
    expect(cardEscape.state.teams[0].balanceKK).toBe(19999);
    expect(cardEscape.state.teams[0].jailCards).toBe(0);
    expect(cardEscape.state.teams[0].isInJail).toBe(false);
  });

  it('migrates legacy 5,000 KK saves to 20,000 KK without losing teams/properties while respecting post-v2 admin overrides', async () => {
    const legacyRaw: GameState = {
      ...createInitialGameState(createDefaultTeams(2)),
      gameId: 'legacy_v2_save',
      properties: {
        'element-H': {
          tileId: 'element-H',
          pathIndex: 1,
          atomicNumber: 1,
          ownerTeamId: 'team_1',
          smallCompanies: 2,
          hasLargeCompany: false,
        },
      },
      economyConfig: {
        ...DEFAULT_ECONOMY_CONFIG,
        schemaVersion: undefined,
        educationalRewards: {
          ...DEFAULT_ECONOMY_CONFIG.educationalRewards,
          jailBailKK: 5000,
          jailBailAdminOverride: false,
        },
      },
      teams: createDefaultTeams(2).map((t, idx) =>
        idx === 0 ? { ...t, balanceKK: 87500, position: 12 } : t
      ),
    };

    const migrated = migrateGameStateEconomy(legacyRaw);
    expect(migrated.economyConfig.schemaVersion).toBe(CURRENT_ECONOMY_SCHEMA_VERSION);
    expect(migrated.economyConfig.educationalRewards.jailBailKK).toBe(20000);
    expect(migrated.teams[0].balanceKK).toBe(87500);
    expect(migrated.teams[0].position).toBe(12);
    expect(migrated.properties['element-H']?.smallCompanies).toBe(2);

    (globalThis as any).localStorage.setItem(
      V2_LOCAL_STORAGE_KEY,
      JSON.stringify({ ...legacyRaw, editionTag: 'v2_research' })
    );
    const loaded = await loadLocalGame();
    expect(loaded).not.toBeNull();
    expect(loaded!.economyConfig.educationalRewards.jailBailKK).toBe(20000);
    expect(loaded!.teams[0].balanceKK).toBe(87500);
    expect(loaded!.properties['element-H']?.smallCompanies).toBe(2);

    const adminUpdated = adminUpdateEconomy(createInitialGameState(createDefaultTeams(2)), {
      educationalRewards: {
        ...DEFAULT_ECONOMY_CONFIG.educationalRewards,
        jailBailKK: 25000,
      },
    });
    expect(adminUpdated.economyConfig.educationalRewards.jailBailKK).toBe(25000);
    expect(adminUpdated.economyConfig.educationalRewards.jailBailAdminOverride).toBe(true);
    const afterReset = resetMatchState(adminUpdated);
    expect(afterReset.economyConfig.educationalRewards.jailBailKK).toBe(25000);
    expect(migrateEconomyConfig(afterReset.economyConfig).educationalRewards.jailBailKK).toBe(25000);
  });

  it('TEST 6: completes turn progression after Customs -> Jail without locking subsequent players or jail wait/doubles escape', () => {
    const customsIdx = CUSTOMS_TILE!.pathIndex;
    const jailIdx = JAIL_TILE!.pathIndex;

    let state = createInitialGameState(createDefaultTeams(2));
    state = {
      ...state,
      teams: state.teams.map((t, idx) =>
        idx === 0 ? { ...t, position: customsIdx - 3 } : { ...t, position: 5 }
      ),
    };

    const move = applyDiceMove(state, 1, 2);
    expect(move.customsTriggered).toBe(true);
    const resolved = resolveLandedTileEffects(move.state);
    expect(resolved.state.phase).toBe('TURN_END');

    const nextTurn = advanceToNextTurn(resolved.state);
    expect(nextTurn.phase).toBe('TURN_START');
    expect(nextTurn.activeTeamIndex).toBe(1);
    expect(nextTurn.teams[0].position).toBe(jailIdx);
    expect(nextTurn.teams[0].isInJail).toBe(true);
    expect(nextTurn.teams[0].jailTurns).toBe(3);

    const team2Move = applyDiceMove(nextTurn, 2, 3);
    expect(team2Move.ok).toBe(true);
    expect(team2Move.state.teams[1].position).toBe(10);
    expect(team2Move.state.teams[0].position).toBe(jailIdx);
    expect(team2Move.state.teams[0].isInJail).toBe(true);
    const team2Resolved = resolveLandedTileEffects(team2Move.state);
    const backToTeam1 = advanceToNextTurn(team2Resolved.state);
    expect(backToTeam1.activeTeamIndex).toBe(0);

    const waitMove = applyDiceMove(backToTeam1, 2, 5);
    expect(waitMove.ok).toBe(true);
    expect(waitMove.pathSteps).toEqual([]);
    expect(waitMove.state.phase).toBe('TURN_END');
    expect(waitMove.state.teams[0].position).toBe(jailIdx);
    expect(waitMove.state.teams[0].isInJail).toBe(true);
    expect(waitMove.state.teams[0].jailTurns).toBe(2);

    const team1Retry: GameState = { ...waitMove.state, phase: 'TURN_START' };
    const doublesEscape = applyDiceMove(team1Retry, 3, 3);
    expect(doublesEscape.ok).toBe(true);
    expect(doublesEscape.state.teams[0].isInJail).toBe(false);
    expect(doublesEscape.state.teams[0].jailTurns).toBe(0);
    expect(doublesEscape.state.teams[0].jailStatus).toBe('released');
    expect(doublesEscape.state.teams[0].position).toBe(jailIdx + 6);
  });

  it('TEST 7: synchronizes 3D world coordinates & hop queue target on Jail without reverting to Bea Cukai', () => {
    const customsIdx = CUSTOMS_TILE!.pathIndex;
    const jailIdx = JAIL_TILE!.pathIndex;
    const customsCoords = getPieceWorldCoordinates(customsIdx);
    const jailCoords = getPieceWorldCoordinates(jailIdx);
    expect(jailCoords.x).not.toBe(customsCoords.x);

    let state = createInitialGameState(createDefaultTeams(2));
    state = {
      ...state,
      teams: state.teams.map((t, idx) =>
        idx === 0 ? { ...t, position: customsIdx - 2 } : t
      ),
    };

    const move = applyDiceMove(state, 1, 1);
    const hopQueue = move.pathSteps!;
    expect(hopQueue[hopQueue.length - 1]).toBe(jailIdx);

    const hoppingPathTarget = resolveVisualPiecePathIndex(
      move.state.teams[0].position,
      hopQueue,
      true
    );
    expect(hoppingPathTarget).toBe(jailIdx);
    expect(getPieceWorldCoordinates(hoppingPathTarget)).toEqual(jailCoords);

    const resolved = resolveLandedTileEffects(move.state);
    const settledPathTarget = resolveVisualPiecePathIndex(
      resolved.state.teams[0].position,
      [],
      true
    );
    expect(settledPathTarget).toBe(jailIdx);
    expect(getPieceWorldCoordinates(settledPathTarget)).toEqual(jailCoords);
    expect(getPieceWorldCoordinates(settledPathTarget)).not.toEqual(customsCoords);
  });

  it('TEST 8: Admin move & jail commands preserve logical/jail consistency across teams', () => {
    const customsIdx = CUSTOMS_TILE!.pathIndex;
    const jailIdx = JAIL_TILE!.pathIndex;
    let state = createInitialGameState(createDefaultTeams(2));

    state = adminMoveTeam(state, 'team_1', jailIdx);
    expect(state.teams[0].position).toBe(jailIdx);
    expect(state.teams[0].isInJail).toBe(false);

    state = adminUpdateTeam(state, 'team_1', {
      isInJail: true,
      jailTurns: 3,
      jailStatus: 'detained',
    });
    expect(state.teams[0].isInJail).toBe(true);
    expect(state.teams[0].jailTurns).toBe(3);
    expect(state.teams[0].jailStatus).toBe('detained');

    const bailed = payJailBailOrCard(state, 'team_1', 'bail');
    expect(bailed.ok).toBe(true);
    expect(bailed.state.teams[0].isInJail).toBe(false);
    expect(bailed.state.teams[0].jailStatus).toBe('released');
    expect(bailed.state.teams[0].balanceKK).toBe(
      state.teams[0].balanceKK - DEFAULT_JAIL_BAIL_KK
    );

    const movedToCustoms = adminMoveTeam(bailed.state, 'team_2', customsIdx);
    expect(movedToCustoms.teams[1].position).toBe(jailIdx);
    expect(movedToCustoms.teams[1].isInJail).toBe(true);
    expect(movedToCustoms.teams[1].jailStatus).toBe('detained');

    let movedToNeutral = adminMoveTeam(bailed.state, 'team_2', customsIdx + 1);
    movedToNeutral = { ...movedToNeutral, activeTeamIndex: 1, phase: 'TURN_START' };
    const rollAway = applyDiceMove(movedToNeutral, 2, 2);
    expect(rollAway.ok).toBe(true);
    expect(rollAway.customsTriggered).toBe(false);
    expect(rollAway.state.teams[1].position).toBe(customsIdx + 5);
  });

  it('TEST 9: sendPlayerToJail atomically moves pawn position to Jail tile #33 across Admin toggle and Study Case rejection', () => {
    const jailIdx = JAIL_TILE!.pathIndex;
    let state = createInitialGameState(createDefaultTeams(2));
    state = {
      ...state,
      teams: state.teams.map((t, idx) => (idx === 0 ? { ...t, position: 15 } : t)),
    };

    const adminJailed = sendPlayerToJail(state, 'team_1', {
      eventType: 'ADMIN_SENT_TO_JAIL',
      description: 'Tim Hidrogen dikirim ke Penjara oleh Admin.',
    });
    expect(adminJailed.teams[0].position).toBe(jailIdx);
    expect(adminJailed.teams[0].isInJail).toBe(true);
    expect(adminJailed.teams[0].jailStatus).toBe('detained');
    expect(adminJailed.teams[0].jailTurns).toBe(
      adminJailed.economyConfig.educationalRewards.jailDurationTurns
    );

    let caseState = createInitialGameState(createDefaultTeams(2));
    caseState = {
      ...caseState,
      phase: 'STUDY_CASE_ACTIVE',
      activeDrawEventId: 'draw_case_test',
      teams: caseState.teams.map((t, idx) => (idx === 0 ? { ...t, position: 22 } : t)),
    };
    const rejectedCase = resolveStudyCaseResult(caseState, false);
    expect(rejectedCase.ok).toBe(true);
    expect(rejectedCase.state.teams[0].position).toBe(jailIdx);
    expect(rejectedCase.state.teams[0].isInJail).toBe(true);
    expect(rejectedCase.state.teams[0].jailStatus).toBe('detained');
    expect(rejectedCase.state.teams[0].studyCaseFailures).toBe(1);
    expect(rejectedCase.state.phase).toBe('TURN_END');
  });

  it('TEST 10: unified resolveTileLanding(admin) switches turn & triggers Quiz/StudyCase while keeping other tiles neutral and enforcing turn lock', () => {
    const quizTile = BOARD_TILES.find((t) => t.tileType === 'quiz')!;
    const caseTile = BOARD_TILES.find((t) => t.tileType === 'study_case')!;
    const elementTile = BOARD_TILES.find((t) => t.tileType === 'element')!;

    let state = createInitialGameState(createDefaultTeams(2));
    expect(state.activeTeamIndex).toBe(0);

    // Neutral element tile teleport should not change phase or turn
    const neutralRes = resolveTileLanding(state, 'team_2', elementTile.pathIndex, 'admin');
    expect(neutralRes.ok).toBe(true);
    expect(neutralRes.state.teams[1].position).toBe(elementTile.pathIndex);
    expect(neutralRes.state.phase).toBe('TURN_START');
    expect(neutralRes.state.activeTeamIndex).toBe(0);

    // Admin teleport to Quiz switches turn to moved player & opens QUIZ_ACTIVE
    const quizRes = resolveTileLanding(neutralRes.state, 'team_2', quizTile.pathIndex, 'admin');
    expect(quizRes.ok).toBe(true);
    expect(quizRes.state.activeTeamIndex).toBe(1);
    expect(quizRes.state.phase).toBe('QUIZ_ACTIVE');
    expect(quizRes.state.activeDrawEventId).toBeTruthy();

    // Turn lock prevents advancing turn while QUIZ_ACTIVE is unresolved
    const lockedTurn = advanceToNextTurn(quizRes.state);
    expect(lockedTurn.phase).toBe('QUIZ_ACTIVE');
    expect(lockedTurn.activeTeamIndex).toBe(1);

    // Resolving quiz unlocks turn progression
    const withLoadedQuiz: GameState = {
      ...quizRes.state,
      activeQuiz: {
        id: 'q_test',
        drawEventId: quizRes.state.activeDrawEventId!,
        topic: 'Test',
        difficulty: 'mudah',
        relatedElements: [1],
        question: 'Simbol Hidrogen?',
        options: [
          { id: 'A', text: 'H' },
          { id: 'B', text: 'He' },
          { id: 'C', text: 'Li' },
          { id: 'D', text: 'Be' },
        ],
        correctOptionId: 'A',
        explanation: 'H adalah Hidrogen.',
        fingerprint: 'fp',
        provider: 'curated',
        model: 'test',
        createdAt: Date.now(),
        verified: true,
        timeLimitSeconds: 30,
      },
    };
    const resolvedQuiz = resolveQuizResult(withLoadedQuiz, true);
    expect(resolvedQuiz.state.phase).toBe('TURN_END');
    const unlockedTurn = advanceToNextTurn(resolvedQuiz.state);
    expect(unlockedTurn.phase).toBe('TURN_START');
    expect(unlockedTurn.activeTeamIndex).toBe(0);

    // Admin teleport to Study Case switches turn & opens STUDY_CASE_ACTIVE with turn lock
    const caseRes = resolveTileLanding(unlockedTurn, 'team_2', caseTile.pathIndex, 'admin');
    expect(caseRes.ok).toBe(true);
    expect(caseRes.state.activeTeamIndex).toBe(1);
    expect(caseRes.state.phase).toBe('STUDY_CASE_ACTIVE');
    expect(caseRes.state.activeDrawEventId).toBeTruthy();
    expect(advanceToNextTurn(caseRes.state).phase).toBe('STUDY_CASE_ACTIVE');
  });
});
