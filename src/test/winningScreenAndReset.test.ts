import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  adminForceWinner,
  adminUpdateEconomy,
  advanceToNextTurn,
  buildCompanyOnProperty,
  buyElementProperty,
  createDefaultTeams,
  createInitialGameState,
  placeAuctionBid,
  resetMatchState,
  resolveQuizResult,
  startElementAuction,
} from '../engine/gameActions';
import { TILES_BY_PATH_INDEX } from '../engine/gameEngine';
import {
  V2_ROOM_NAMESPACE_PREFIX,
  formatV2RoomDocId,
  getFirebaseConfigStatus,
  isFirebaseConfigured,
  shouldAcceptRemoteGameState,
} from '../services/firebase';
import {
  V2_DB_NAME,
  V2_LOCAL_STORAGE_KEY,
  V2_STORAGE_PREFIX,
  clearLocalGames,
  loadLocalGame,
  saveLocalGame,
} from '../storage/indexedDB';
import { DEFAULT_ECONOMY_CONFIG, GameState } from '../types/game';

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

function buildDirtyCompletedMatch(baseState?: GameState): GameState {
  const oTile = Object.values(TILES_BY_PATH_INDEX).find((t) => t.atomicNumber === 8)!;
  const heTile = Object.values(TILES_BY_PATH_INDEX).find((t) => t.atomicNumber === 2)!;

  let state =
    baseState ||
    createInitialGameState(
      createDefaultTeams(3, ['Alpha Chem', 'Beta Lab', 'Gamma Ion']).map((t, i) => ({
        ...t,
        members: i === 0 ? [{ name: 'Andi' }, { name: 'Budi' }] : t.members,
      }))
    );

  state = {
    ...state,
    phase: 'ELEMENT_PURCHASE',
    activeTeamIndex: 0,
    teams: state.teams.map((t, idx) =>
      idx === 0
        ? {
            ...t,
            position: oTile.pathIndex,
            balanceKK: 145000,
            jailCards: 2,
            studyCaseFailures: 1,
            quizFailures: 2,
            skipNextIncome: true,
          }
        : idx === 1
        ? {
            ...t,
            position: 40,
            balanceKK: 12000,
            isInJail: true,
            jailTurns: 2,
            quizFailures: 3,
          }
        : {
            ...t,
            position: heTile.pathIndex,
            balanceKK: 0,
            isBankrupt: true,
            bankruptReason: 'Test bankruptcy',
          }
    ),
  };

  state = buyElementProperty(state, 'team_1', oTile.tileId).state;
  state = buildCompanyOnProperty(state, 'team_1', oTile.tileId).state;
  state = startElementAuction(state, 'team_1', oTile.tileId).state;
  state = placeAuctionBid(state, 'team_2', 5000).state;

  state = {
    ...state,
    mainProperties: {
      mp_laboratorium: {
        propertyId: 'mp_laboratorium',
        ownerTeamId: 'team_1',
      },
    },
    activeQuiz: {
      id: 'q_stale',
      drawEventId: 'draw_stale',
      topic: 'Stoikiometri',
      difficulty: 'mudah',
      relatedElements: [8],
      question: 'Sample?',
      options: [
        { id: 'A', text: '1' },
        { id: 'B', text: '2' },
        { id: 'C', text: '3' },
        { id: 'D', text: '4' },
      ],
      timeLimitSeconds: 30,
      provider: 'gemini',
      model: 'test',
      fingerprint: 'fp1',
    },
  };

  state = {
    ...state,
    phase: 'TURN_END',
    teams: state.teams.map((t, idx) =>
      idx === 0
        ? t
        : {
            ...t,
            isBankrupt: true,
            bankruptReason: 'Bankrupt via failure',
          }
    ),
  };

  return advanceToNextTurn(state);
}

describe('V2 Research Edition: Winning Screen Reset, Storage & Env-Var Firebase Isolation', () => {
  const originalLocalStorage = (globalThis as any).localStorage;

  beforeEach(() => {
    (globalThis as any).localStorage = createMemoryStorage();
  });

  afterEach(() => {
    (globalThis as any).localStorage = originalLocalStorage;
  });

  it('completes match, cleans modals, and resets everything via resetMatchState', () => {
    let customState = createInitialGameState(createDefaultTeams(4), {
      ...DEFAULT_ECONOMY_CONFIG,
      startingCapitalKK: 125000,
    });
    customState = buildDirtyCompletedMatch(customState);
    expect(customState.phase).toBe('GAME_OVER');
    expect(customState.winnerTeamId).toBe('team_1');
    expect(customState.activeQuiz).toBeFalsy();
    expect(customState.activeAuction).toBeFalsy();

    const reset = resetMatchState(customState);
    expect(reset.phase).toBe('TURN_START');
    expect(reset.winnerTeamId).toBeNull();
    expect(reset.economyConfig.startingCapitalKK).toBe(125000);
    expect(reset.teams).toHaveLength(4);
    for (const team of reset.teams) {
      expect(team.position).toBe(0);
      expect(team.balanceKK).toBe(125000);
      expect(team.isBankrupt).toBe(false);
    }
  });

  it('uses isolated V2 IndexedDB/localStorage keys and never boots into GAME_OVER', async () => {
    expect(V2_DB_NAME).toBe('MonopolyV2ResearchDB');
    expect(V2_STORAGE_PREFIX).toBe('ptm_v2_research_');
    expect(V2_LOCAL_STORAGE_KEY).toBe('ptm_v2_research_current_game');

    const v2Active = createInitialGameState(createDefaultTeams(2, ['V2 Tim A', 'V2 Tim B']));
    await saveLocalGame(v2Active);
    const loadedV2 = await loadLocalGame();
    expect(loadedV2?.teams[0].name).toBe('V2 Tim A');
    expect(loadedV2?.phase).toBe('TURN_START');

    const v2Completed = buildDirtyCompletedMatch(
      createInitialGameState(createDefaultTeams(2, ['V2 Tim X', 'V2 Tim Y']))
    );
    await saveLocalGame(v2Completed);
    expect(await loadLocalGame()).toBeNull();

    (globalThis as any).localStorage.setItem(
      V2_LOCAL_STORAGE_KEY,
      JSON.stringify({ ...v2Completed, editionTag: 'v2_research' })
    );
    const recoveredV2 = await loadLocalGame();
    expect(recoveredV2).not.toBeNull();
    expect(recoveredV2!.phase).toBe('TURN_START');
    expect(recoveredV2!.winnerTeamId).toBeNull();
    expect(recoveredV2!.teams[0].name).toBe('V2 Tim X');
    expect(recoveredV2!.teams[0].position).toBe(0);
    expect(recoveredV2!.teams[0].balanceKK).toBe(DEFAULT_ECONOMY_CONFIG.startingCapitalKK);

    await clearLocalGames();
    expect(await loadLocalGame()).toBeNull();
  });

  it('handles unconfigured Firebase env vars gracefully without V1 credentials or dummy values', () => {
    const emptyStatus = getFirebaseConfigStatus({});
    expect(emptyStatus.configured).toBe(false);
    expect(emptyStatus.missingKeys).toContain('VITE_FIREBASE_API_KEY');
    expect(emptyStatus.missingKeys).toContain('VITE_FIREBASE_PROJECT_ID');
    expect(isFirebaseConfigured({})).toBe(false);

    const completeStatus = getFirebaseConfigStatus({
      VITE_FIREBASE_API_KEY: 'key',
      VITE_FIREBASE_AUTH_DOMAIN: 'v2.firebaseapp.com',
      VITE_FIREBASE_PROJECT_ID: 'v2-proj',
      VITE_FIREBASE_APP_ID: '1:123:web:abc',
    });
    expect(completeStatus.configured).toBe(true);
    expect(completeStatus.missingKeys).toEqual([]);
    expect(completeStatus.projectId).toBe('v2-proj');

    expect(V2_ROOM_NAMESPACE_PREFIX).toBe('v2_');
    expect(formatV2RoomDocId('lab01')).toBe('v2_LAB01');
    expect(formatV2RoomDocId('v2_LAB01')).toBe('v2_LAB01');
  });

  it('accepts host reset across multiplayer peers and supports Admin Commands & 4 repeated cycles', () => {
    const hostCompleted = buildDirtyCompletedMatch(
      createInitialGameState(createDefaultTeams(2), DEFAULT_ECONOMY_CONFIG, 'online', 'CHEM99')
    );
    const peerCompleted: GameState = { ...hostCompleted };
    const hostReset = resetMatchState(hostCompleted);

    expect(shouldAcceptRemoteGameState(peerCompleted, hostReset)).toBe(true);
    expect(shouldAcceptRemoteGameState(hostReset, hostCompleted)).toBe(false);
    expect(shouldAcceptRemoteGameState(hostReset, { ...hostReset })).toBe(false);
    expect(shouldAcceptRemoteGameState(hostReset, { ...hostReset }, { forceAccept: true })).toBe(true);
    expect(shouldAcceptRemoteGameState(peerCompleted, hostReset, { isResetting: true })).toBe(false);

    let state = createInitialGameState(createDefaultTeams(3));
    state = adminUpdateEconomy(state, { startingCapitalKK: 150000 });
    state = {
      ...state,
      phase: 'QUIZ_ACTIVE',
      activeTeamIndex: 1,
      activeQuiz: {
        id: 'q_test_5',
        drawEventId: 'draw_test_5',
        topic: 'Stoikiometri',
        difficulty: 'mudah',
        relatedElements: [8],
        question: 'Nomor atom Oksigen?',
        options: [
          { id: 'A', text: '8' },
          { id: 'B', text: '6' },
          { id: 'C', text: '7' },
          { id: 'D', text: '9' },
        ],
        correctOptionId: 'A',
        timeLimitSeconds: 30,
        provider: 'gemini',
        model: 'test',
        fingerprint: 'fp_test_5',
      },
      teams: state.teams.map((t, i) => (i === 1 ? { ...t, quizFailures: 6 } : t)),
    };
    state = resolveQuizResult(state, false).state;
    expect(state.teams[1].isBankrupt).toBe(true);

    const forced = adminForceWinner(state, 'team_3');
    expect(forced.phase).toBe('GAME_OVER');

    const adminReset = resetMatchState(forced);
    expect(adminReset.phase).toBe('TURN_START');
    expect(adminReset.economyConfig.startingCapitalKK).toBe(150000);
    expect(adminReset.teams[1].isBankrupt).toBe(false);

    let cycleState = createInitialGameState(createDefaultTeams(2, ['Tim A', 'Tim B']));
    const seenGameIds = new Set<string>([cycleState.gameId]);
    let prevVersion = cycleState.stateVersion;

    for (let cycle = 1; cycle <= 4; cycle++) {
      cycleState = buildDirtyCompletedMatch(cycleState);
      cycleState = resetMatchState(cycleState);
      expect(cycleState.phase).toBe('TURN_START');
      expect(seenGameIds.has(cycleState.gameId)).toBe(false);
      seenGameIds.add(cycleState.gameId);
      expect(cycleState.stateVersion).toBeGreaterThan(prevVersion);
      prevVersion = cycleState.stateVersion;
    }

    expect(seenGameIds.size).toBe(5);
  });
});
