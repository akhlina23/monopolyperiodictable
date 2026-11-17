import { openDB, IDBPDatabase } from 'idb';
import { GameState } from '../types/game';
import { migrateGameStateEconomy, resetMatchState } from '../engine/gameActions';

export const V2_DB_NAME = 'MonopolyV2ResearchDB';
export const V2_DB_VERSION = 1;
export const V2_STORE_NAME = 'v2_research_games';
export const V2_STORAGE_PREFIX = 'ptm_v2_research_';
export const V2_LOCAL_STORAGE_KEY = `${V2_STORAGE_PREFIX}current_game`;
export const V2_SESSION_KEY = `${V2_STORAGE_PREFIX}session_meta`;

type StoredGameRecord = GameState & {
  editionTag?: 'v2_research';
};

let opQueue: Promise<void> = Promise.resolve();

function enqueueOp<T>(task: () => Promise<T>): Promise<T> {
  const next = opQueue.then(task, task);
  opQueue = next.then(
    () => undefined,
    () => undefined
  );
  return next;
}

async function getDB(): Promise<IDBPDatabase> {
  return openDB(V2_DB_NAME, V2_DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(V2_STORE_NAME)) {
        db.createObjectStore(V2_STORE_NAME, { keyPath: 'gameId' });
      }
    },
  });
}

function stripStorageMeta(rec: StoredGameRecord): GameState {
  const { editionTag: _ignored, ...clean } = rec;
  if (clean.phase !== 'GAME_OVER' && clean.winnerTeamId) {
    clean.winnerTeamId = null;
  }
  return clean;
}

async function clearRecordsUnlocked(): Promise<void> {
  try {
    const db = await getDB();
    await db.clear(V2_STORE_NAME);
  } catch (err) {
    console.error('Failed to clear V2 IndexedDB records', err);
  }

  try {
    localStorage.removeItem(V2_LOCAL_STORAGE_KEY);
    sessionStorage.removeItem(V2_SESSION_KEY);
  } catch {
    // ignore storage quota / privacy mode errors
  }
}

export async function clearLocalGames(): Promise<void> {
  return enqueueOp(() => clearRecordsUnlocked());
}

export async function saveLocalGame(state: GameState): Promise<void> {
  return enqueueOp(async () => {
    if (state.phase === 'GAME_OVER') {
      await clearRecordsUnlocked();
      return;
    }

    const record: StoredGameRecord = { ...state, editionTag: 'v2_research' };
    try {
      const db = await getDB();
      const all = (await db.getAll(V2_STORE_NAME)) as StoredGameRecord[];
      for (const existing of all) {
        if (existing.gameId !== state.gameId) {
          await db.delete(V2_STORE_NAME, existing.gameId);
        }
      }
      await db.put(V2_STORE_NAME, record);
    } catch (err) {
      console.error('Failed to save V2 game to IndexedDB, fallback to localStorage', err);
    }

    try {
      localStorage.setItem(V2_LOCAL_STORAGE_KEY, JSON.stringify(record));
      sessionStorage.setItem(
        V2_SESSION_KEY,
        JSON.stringify({ gameId: state.gameId, updatedAt: state.updatedAt })
      );
    } catch {
      // ignore localStorage/sessionStorage errors
    }
  });
}

export async function loadLocalGame(gameId?: string): Promise<GameState | null> {
  return enqueueOp(async () => {
    let candidate: StoredGameRecord | null = null;

    try {
      const db = await getDB();
      if (gameId) {
        const data = (await db.get(V2_STORE_NAME, gameId)) as StoredGameRecord | undefined;
        if (data) candidate = data;
      } else {
        const all = (await db.getAll(V2_STORE_NAME)) as StoredGameRecord[];
        if (all.length > 0) {
          all.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
          candidate = all[0];
        }
      }
    } catch (err) {
      console.error('Failed to load V2 game from IndexedDB, checking localStorage', err);
    }

    if (!candidate) {
      try {
        const raw = localStorage.getItem(V2_LOCAL_STORAGE_KEY);
        if (raw) {
          candidate = JSON.parse(raw) as StoredGameRecord;
        }
      } catch (e) {
        console.error('V2 LocalStorage read error', e);
      }
    }

    if (!candidate || !Array.isArray(candidate.teams) || candidate.teams.length < 2) {
      return null;
    }

    const clean = migrateGameStateEconomy(stripStorageMeta(candidate));
    const oldBail = candidate?.economyConfig?.educationalRewards?.jailBailKK;
    const oldSchema = candidate?.economyConfig?.schemaVersion ?? 0;
    const wasMigrated =
      oldBail !== clean.economyConfig.educationalRewards.jailBailKK ||
      oldSchema !== clean.economyConfig.schemaVersion;

    if (clean.phase === 'GAME_OVER') {
      const freshFromCompleted = resetMatchState(clean);
      await clearRecordsUnlocked();
      try {
        const db = await getDB();
        await db.put(V2_STORE_NAME, { ...freshFromCompleted, editionTag: 'v2_research' });
      } catch {
        // ignore IndexedDB error during recovery
      }
      try {
        localStorage.setItem(
          V2_LOCAL_STORAGE_KEY,
          JSON.stringify({ ...freshFromCompleted, editionTag: 'v2_research' })
        );
      } catch {
        // ignore localStorage error during recovery
      }
      return freshFromCompleted;
    }

    if (wasMigrated) {
      try {
        const db = await getDB();
        await db.put(V2_STORE_NAME, { ...clean, editionTag: 'v2_research' });
      } catch {
        // ignore IndexedDB error during migration writeback
      }
      try {
        localStorage.setItem(
          V2_LOCAL_STORAGE_KEY,
          JSON.stringify({ ...clean, editionTag: 'v2_research' })
        );
      } catch {
        // ignore localStorage error during migration writeback
      }
    }

    return clean;
  });
}

export async function deleteLocalGame(gameId: string): Promise<void> {
  return enqueueOp(async () => {
    try {
      const db = await getDB();
      await db.delete(V2_STORE_NAME, gameId);
      localStorage.removeItem(V2_LOCAL_STORAGE_KEY);
      sessionStorage.removeItem(V2_SESSION_KEY);
    } catch (err) {
      console.error('Failed to delete V2 game', err);
    }
  });
}
