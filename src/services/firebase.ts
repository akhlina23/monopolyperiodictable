import { FirebaseApp, getApps, initializeApp } from 'firebase/app';
import { Auth, getAuth, signInAnonymously, User } from 'firebase/auth';
import {
  Firestore,
  doc,
  getDocFromServer,
  getFirestore,
  onSnapshot,
  setDoc,
} from 'firebase/firestore';
import provisionedFirebaseConfig from '../../firebase-applet-config.json';
import { GameState } from '../types/game';

export const V2_ROOM_COLLECTION = 'rooms_v2';
export const V2_ROOM_NAMESPACE_PREFIX = 'v2_';

export const REQUIRED_V2_FIREBASE_ENV_KEYS = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_APP_ID',
] as const;

type FirebaseEnvMap = Partial<Record<string, string>>;

function readViteFirebaseEnv(): FirebaseEnvMap {
  const metaEnv =
    typeof import.meta !== 'undefined' && (import.meta as any).env
      ? ((import.meta as any).env as FirebaseEnvMap)
      : {};
  return metaEnv;
}

function getProvisionedFirebaseEnvDefaults(): FirebaseEnvMap {
  const cfg = provisionedFirebaseConfig as Record<string, string | undefined>;
  if (!cfg || !cfg.projectId || cfg.projectId === 'remixed-project-id') {
    return {};
  }
  return {
    VITE_FIREBASE_API_KEY: cfg.apiKey,
    VITE_FIREBASE_AUTH_DOMAIN: cfg.authDomain,
    VITE_FIREBASE_PROJECT_ID: cfg.projectId,
    VITE_FIREBASE_STORAGE_BUCKET: cfg.storageBucket,
    VITE_FIREBASE_MESSAGING_SENDER_ID: cfg.messagingSenderId,
    VITE_FIREBASE_APP_ID: cfg.appId,
    VITE_FIREBASE_DATABASE_ID: cfg.firestoreDatabaseId,
  };
}

function getEffectiveFirebaseEnv(): FirebaseEnvMap {
  const defaults = getProvisionedFirebaseEnvDefaults();
  const viteEnv = readViteFirebaseEnv();
  const merged: FirebaseEnvMap = { ...defaults };

  for (const [key, value] of Object.entries(viteEnv)) {
    if (key.startsWith('VITE_FIREBASE_') && typeof value === 'string' && value.trim()) {
      merged[key] = value.trim();
    }
  }
  return merged;
}

export interface V2FirebaseConfigStatus {
  configured: boolean;
  missingKeys: string[];
  projectId: string | null;
}

export function getFirebaseConfigStatus(envOverride?: FirebaseEnvMap): V2FirebaseConfigStatus {
  const env = envOverride !== undefined ? envOverride : getEffectiveFirebaseEnv();
  const missingKeys = REQUIRED_V2_FIREBASE_ENV_KEYS.filter(
    (key) => !String(env[key] || '').trim()
  );
  const projectId = String(env.VITE_FIREBASE_PROJECT_ID || '').trim() || null;
  return {
    configured: missingKeys.length === 0,
    missingKeys,
    projectId,
  };
}

export function isFirebaseConfigured(envOverride?: FirebaseEnvMap): boolean {
  return getFirebaseConfigStatus(envOverride).configured;
}

export function formatV2RoomDocId(roomCode: string): string {
  const clean = roomCode.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '').replace(/^V2_/, '');
  return `${V2_ROOM_NAMESPACE_PREFIX}${clean}`;
}

function buildFirebaseConfigFromEnv() {
  const env = getEffectiveFirebaseEnv();
  return {
    apiKey: String(env.VITE_FIREBASE_API_KEY || '').trim(),
    authDomain: String(env.VITE_FIREBASE_AUTH_DOMAIN || '').trim(),
    projectId: String(env.VITE_FIREBASE_PROJECT_ID || '').trim(),
    storageBucket: String(env.VITE_FIREBASE_STORAGE_BUCKET || '').trim() || undefined,
    messagingSenderId: String(env.VITE_FIREBASE_MESSAGING_SENDER_ID || '').trim() || undefined,
    appId: String(env.VITE_FIREBASE_APP_ID || '').trim(),
    databaseId: String(env.VITE_FIREBASE_DATABASE_ID || '').trim() || undefined,
  };
}

let appInstance: FirebaseApp | null = null;
let dbInstance: Firestore | null = null;
let authInstance: Auth | null = null;

if (isFirebaseConfigured()) {
  const cfg = buildFirebaseConfigFromEnv();
  appInstance = getApps().length > 0 ? getApps()[0] : initializeApp({
    apiKey: cfg.apiKey,
    authDomain: cfg.authDomain,
    projectId: cfg.projectId,
    storageBucket: cfg.storageBucket,
    messagingSenderId: cfg.messagingSenderId,
    appId: cfg.appId,
  });
  dbInstance = cfg.databaseId ? getFirestore(appInstance, cfg.databaseId) : getFirestore(appInstance);
  authInstance = getAuth(appInstance);
  if (typeof window !== 'undefined') {
    void testConnection();
  }
}

export const db: Firestore | null = dbInstance;
export const auth: Auth | null = authInstance;

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

function assertConfigured(): { db: Firestore; auth: Auth } {
  if (!dbInstance || !authInstance || !isFirebaseConfigured()) {
    const status = getFirebaseConfigStatus();
    throw new Error(
      `Firebase Online Sync is not configured for V2 Research Edition. Missing env vars: ${status.missingKeys.join(', ')}.`
    );
  }
  return { db: dbInstance, auth: authInstance };
}

function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: authInstance?.currentUser?.uid,
      email: authInstance?.currentUser?.email,
      emailVerified: authInstance?.currentUser?.emailVerified,
      isAnonymous: authInstance?.currentUser?.isAnonymous,
      tenantId: authInstance?.currentUser?.tenantId,
      providerInfo:
        authInstance?.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('V2 Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

function stripUndefinedDeep<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => stripUndefinedDeep(item)) as unknown as T;
  }
  if (value && typeof value === 'object') {
    const clean: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (v !== undefined) {
        clean[k] = stripUndefinedDeep(v);
      }
    }
    return clean as T;
  }
  return value;
}

export function shouldAcceptRemoteGameState(
  current: GameState | null,
  remote: GameState | null,
  options?: { forceAccept?: boolean; isResetting?: boolean }
): boolean {
  if (!remote || !Array.isArray(remote.teams) || remote.teams.length < 2) {
    return false;
  }
  if (options?.isResetting) {
    return false;
  }
  if (options?.forceAccept || !current) {
    return true;
  }

  if (remote.gameId === current.gameId) {
    return (remote.stateVersion || 0) > (current.stateVersion || 0);
  }

  if (remote.phase === 'GAME_OVER' && current.phase !== 'GAME_OVER') {
    return (
      (remote.stateVersion || 0) > (current.stateVersion || 0) &&
      (remote.updatedAt || 0) > (current.updatedAt || 0)
    );
  }

  return (
    (remote.stateVersion || 0) > (current.stateVersion || 0) ||
    (remote.updatedAt || 0) > (current.updatedAt || 0)
  );
}

export async function testConnection(): Promise<boolean> {
  if (!dbInstance) return false;
  try {
    await getDocFromServer(doc(dbInstance, 'test', 'connection'));
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('V2 Firebase client is offline.');
    }
    return false;
  }
}

export async function ensureAuthUser(): Promise<User | null> {
  const { auth: activeAuth } = assertConfigured();
  if (activeAuth.currentUser) return activeAuth.currentUser;
  try {
    const cred = await signInAnonymously(activeAuth);
    return cred.user;
  } catch (err) {
    console.warn('V2 anonymous sign-in unavailable, using local fallback ID', err);
    return null;
  }
}

export async function upsertRoomMetadata(roomCode: string): Promise<void> {
  const { db: activeDb } = assertConfigured();
  const roomDocId = formatV2RoomDocId(roomCode);
  const path = `${V2_ROOM_COLLECTION}/${roomDocId}`;
  try {
    const user = await ensureAuthUser();
    const roomRef = doc(activeDb, V2_ROOM_COLLECTION, roomDocId);
    const now = Date.now();
    await setDoc(
      roomRef,
      {
        roomCode: roomCode.trim().toUpperCase(),
        hostUid: user?.uid || 'anonymous_host',
        edition: 'research',
        createdAt: now,
        updatedAt: now,
      },
      { merge: true }
    );
  } catch (err) {
    console.warn(`Failed to upsert V2 room metadata at ${path}:`, err);
  }
}

export async function syncOnlineRoomState(roomCode: string, state: GameState): Promise<void> {
  const { db: activeDb, auth: activeAuth } = assertConfigured();
  const roomDocId = formatV2RoomDocId(roomCode);
  const statePath = `${V2_ROOM_COLLECTION}/${roomDocId}/state/current`;
  try {
    const now = Date.now();
    const roomRef = doc(activeDb, V2_ROOM_COLLECTION, roomDocId);
    const stateRef = doc(activeDb, V2_ROOM_COLLECTION, roomDocId, 'state', 'current');
    const sanitized = stripUndefinedDeep({
      ...state,
      stateVersion: state.stateVersion || 1,
      updatedAt: state.updatedAt || now,
    });
    await Promise.all([
      setDoc(
        roomRef,
        {
          roomCode: roomCode.trim().toUpperCase(),
          hostUid: activeAuth.currentUser?.uid || 'anonymous_host',
          edition: 'research',
          updatedAt: now,
        },
        { merge: true }
      ),
      setDoc(stateRef, sanitized),
    ]);
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, statePath);
  }
}

export function subscribeToOnlineRoomState(
  roomCode: string,
  onUpdate: (state: GameState) => void,
  onError?: (err: any) => void
): () => void {
  if (!dbInstance || !isFirebaseConfigured()) {
    return () => {};
  }
  const roomDocId = formatV2RoomDocId(roomCode);
  const statePath = `${V2_ROOM_COLLECTION}/${roomDocId}/state/current`;
  const stateRef = doc(dbInstance, V2_ROOM_COLLECTION, roomDocId, 'state', 'current');
  return onSnapshot(
    stateRef,
    (snapshot) => {
      if (snapshot.exists()) {
        onUpdate(snapshot.data() as GameState);
      }
    },
    (err) => {
      console.error(`V2 Snapshot listener error at ${statePath}:`, err);
      if (onError) onError(err);
    }
  );
}
