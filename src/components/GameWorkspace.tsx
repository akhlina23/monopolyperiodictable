import React, { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  BoardColorMode,
  BoardTile,
  ChemicalElement,
  DEFAULT_ECONOMY_CONFIG,
  DEFAULT_JAIL_BAIL_KK,
  GameState,
  Team,
} from '../types/game';
import {
  BOARD_TILES,
  ELEMENTS_BY_ID,
  ELEMENTS_LIST,
  MAIN_PROPERTIES_BY_ID,
  TILES_BY_PATH_INDEX,
  calculateNetWorth,
  calculateStartIncome,
} from '../engine/gameEngine';
import {
  advanceToNextTurn,
  applyDiceMove,
  buildCompanyOnProperty,
  buyElementProperty,
  buyMainProperty,
  cancelPendingEducationCard,
  createDefaultTeams,
  createInitialGameState,
  finalizeAuction,
  migrateGameStateEconomy,
  payJailBailOrCard,
  placeAuctionBid,
  rejectAuction,
  resetMatchState,
  resolveLandedTileEffects,
  resolveQuizResult,
  resolveStudyCaseResult,
  sellCompaniesBeforeAuction,
  startElementAuction,
} from '../engine/gameActions';
import { clearLocalGames, loadLocalGame, saveLocalGame } from '../storage/indexedDB';
import {
  ensureAuthUser,
  getFirebaseConfigStatus,
  shouldAcceptRemoteGameState,
  subscribeToOnlineRoomState,
  syncOnlineRoomState,
  upsertRoomMetadata,
} from '../services/firebase';
import { BoardScene3D, CameraPreset } from './board3d/BoardScene3D';
import { TileDetailModal } from './TileDetailModal';
import { QuizModal } from './QuizModal';
import { StudyCaseModal } from './StudyCaseModal';
import { AuctionModal } from './AuctionModal';
import { AdminConsoleModal } from './admin/AdminConsoleModal';
import { AISettingsModal } from './ai/AISettingsModal';
import { soundManager } from '../utils/sound';
import { safeFetchJson } from '../utils/apiClient';
import {
  Accessibility,
  ArrowLeft,
  Atom,
  Box,
  Camera,
  CheckCircle2,
  Cpu,
  Dices,
  DollarSign,
  Download,
  Eye,
  FlaskConical,
  Globe,
  Grid3x3,
  HelpCircle,
  KeyRound,
  LayoutGrid,
  Loader2,
  Lock,
  Shield,
  ShieldAlert,
  Timer,
  Trophy,
  Upload,
  Users,
  Volume2,
  VolumeX,
} from 'lucide-react';

const LazyPeriodicTableExplorer = lazy(() =>
  import('./PeriodicTableExplorer').then((m) => ({ default: m.PeriodicTableExplorer }))
);

type WorkspaceLayout = 'split' | 'board' | 'ptable';

const V2_TITLE = 'PERIODIC TABLE MONOPOLY';
const V2_SUBTITLE = 'Research Edition — 3D Monopoly + Interactive Ptable Explorer & Atomic Lab';
const V2_BADGE = 'V2 · RESEARCH EDITION';
const V2_FOOTER = '© Akhdan Habibi Ramadhani';

export interface GameWorkspaceProps {
  onBackToHome?: () => void;
  initialAction?: 'resume' | 'new-game' | 'ptable' | null;
  onInitialActionHandled?: () => void;
  onActiveGameSaved?: (state: GameState) => void;
}

export const GameWorkspace: React.FC<GameWorkspaceProps> = ({
  onBackToHome,
  initialAction = null,
  onInitialActionHandled,
  onActiveGameSaved,
}) => {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [selectedTile, setSelectedTile] = useState<BoardTile | null>(null);
  const [selectedElement, setSelectedElement] = useState<ChemicalElement>(ELEMENTS_LIST[0]);
  const [diceRolling, setDiceRolling] = useState(false);
  const [hopQueue, setHopQueue] = useState<number[]>([]);
  const [isHopping, setIsHopping] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string>(
    `Welcome to ${V2_TITLE} (${V2_BADGE}). Roll 2 dice to begin.`
  );

  // V2 Research temperature & color mode (0°C default)
  const [temperatureC, setTemperatureC] = useState<number>(0);
  const [colorMode, setColorMode] = useState<BoardColorMode>('category');
  const [cameraPreset, setCameraPreset] = useState<CameraPreset>('overview');
  const [cameraTrigger, setCameraTrigger] = useState<number>(0);
  const [workspaceLayout, setWorkspaceLayout] = useState<WorkspaceLayout>('split');

  // Accessibility & Audio
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(0.65);
  const [reducedMotion, setReducedMotion] = useState<boolean>(() =>
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  );

  // Async AI Card Generation State (NO static fallback in normal gameplay)
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [recentFingerprints, setRecentFingerprints] = useState<string[]>([]);
  const [isEducationModalMinimized, setIsEducationModalMinimized] = useState(false);
  const [quizSecondsLeft, setQuizSecondsLeft] = useState<number | null>(null);
  const fetchingDrawIdRef = useRef<string | null>(null);
  const lastDrawContextRef = useRef<{
    type: 'quiz' | 'study_case';
    drawEventId: string;
    element: ChemicalElement;
  } | null>(null);

  // Modals
  const [isSetupOpen, setIsSetupOpen] = useState(false);
  const [isOnlineOpen, setIsOnlineOpen] = useState(false);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [isAISettingsOpen, setIsAISettingsOpen] = useState(false);

  // Setup Form State (2–4 teams, up to 2 members per team)
  const [numTeams, setNumTeams] = useState<number>(2);
  const [teamNames, setTeamNames] = useState<string[]>([
    'Tim Hidrogen',
    'Tim Helium',
    'Tim Litium',
    'Tim Karbon',
  ]);
  const [teamMember2, setTeamMember2] = useState<string[]>(['', '', '', '']);
  const [salaryMode, setSalaryMode] = useState<'classic' | 'balanced'>('classic');
  const [importError, setImportError] = useState<string | null>(null);

  // Online Sync & Match Reset Guards
  const [roomInput, setRoomInput] = useState('');
  const [onlineStatus, setOnlineStatus] = useState<string>('');
  const [isResettingMatch, setIsResettingMatch] = useState(false);
  const latestStateRef = useRef<GameState | null>(null);
  const isResettingRef = useRef<boolean>(false);
  const skipNextRemoteSyncRef = useRef<boolean>(false);
  const justJoinedRoomRef = useRef<boolean>(false);
  const hopSafetyTimerRef = useRef<number | null>(null);
  const resolvedMoveVersionRef = useRef<number | null>(null);
  const jailEscapeLockRef = useRef<boolean>(false);

  const firebaseStatus = useMemo(() => getFirebaseConfigStatus(), []);

  useEffect(() => {
    latestStateRef.current = gameState;
  }, [gameState]);

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.classList.toggle('reduced-motion', reducedMotion);
    }
  }, [reducedMotion]);

  // Initialize from isolated V2 IndexedDB or create 2-team default game; never boot stuck on GAME_OVER
  useEffect(() => {
    let cancelled = false;
    async function init() {
      const saved = await loadLocalGame();
      if (cancelled) return;
      if (saved && saved.teams?.length >= 2) {
        const defaultPieces = ['flask', 'atom', 'microscope', 'goggles'] as const;
        const normalizedTeams: Team[] = saved.teams.map((t, idx) => ({
          ...t,
          pieceType: t.pieceType || defaultPieces[idx % 4],
        }));
        const rawNormalized: GameState = migrateGameStateEconomy({
          ...saved,
          teams: normalizedTeams,
        });

        const initialState =
          rawNormalized.phase === 'GAME_OVER'
            ? resetMatchState(rawNormalized)
            : { ...rawNormalized, winnerTeamId: null };

        if (rawNormalized.phase === 'GAME_OVER') {
          await clearLocalGames();
          await saveLocalGame(initialState);
        }
        if (cancelled) return;

        setNumTeams(Math.min(4, Math.max(2, initialState.teams.length)));
        setTeamNames((prev) =>
          [0, 1, 2, 3].map((idx) => initialState.teams[idx]?.name || prev[idx])
        );
        setTeamMember2([0, 1, 2, 3].map((idx) => initialState.teams[idx]?.members?.[1]?.name || ''));
        setSalaryMode(
          initialState.economyConfig.businessIncome.fixedStartSalary > 0 ? 'balanced' : 'classic'
        );

        latestStateRef.current = initialState;
        setGameState(initialState);
        setStatusMessage(
          rawNormalized.phase === 'GAME_OVER'
            ? `New match ready! ${initialState.teams[0]?.name} rolls first.`
            : `Resumed local game — ${initialState.teams[initialState.activeTeamIndex]?.name}'s turn.`
        );
      } else {
        const fresh = createInitialGameState(createDefaultTeams(2));
        latestStateRef.current = fresh;
        setGameState(fresh);
        setStatusMessage(`Turn: ${fresh.teams[0].name}. Roll 2 dice to start!`);
      }
    }
    init();
    return () => {
      cancelled = true;
    };
  }, []);

  // Persist locally & optionally sync online room
  useEffect(() => {
    if (!gameState) return;
    if (gameState.phase === 'GAME_OVER') {
      clearLocalGames().catch(() => {});
    } else {
      saveLocalGame(gameState).catch(() => {});
      onActiveGameSaved?.(gameState);
    }

    if (skipNextRemoteSyncRef.current) {
      skipNextRemoteSyncRef.current = false;
      return;
    }

    if (
      firebaseStatus.configured &&
      gameState.mode === 'online' &&
      gameState.roomCode &&
      !isResettingRef.current
    ) {
      syncOnlineRoomState(gameState.roomCode, gameState).catch(() => {
        // Ignore transient offline errors
      });
    }
  }, [gameState, firebaseStatus.configured, onActiveGameSaved]);

  // Apply Homescreen entry intent once gameState is initialized
  useEffect(() => {
    if (!gameState || !initialAction) return;
    if (initialAction === 'new-game') {
      setIsSetupOpen(true);
    } else if (initialAction === 'ptable') {
      setWorkspaceLayout('ptable');
    } else if (initialAction === 'resume') {
      setWorkspaceLayout('split');
    }
    onInitialActionHandled?.();
  }, [gameState, initialAction, onInitialActionHandled]);

  // Subscribe to online room updates when V2 Firebase env vars are configured
  useEffect(() => {
    if (!firebaseStatus.configured || !gameState || gameState.mode !== 'online' || !gameState.roomCode) {
      return;
    }
    const unsub = subscribeToOnlineRoomState(gameState.roomCode, (remote) => {
      if (!remote) return;
      const accepted = shouldAcceptRemoteGameState(latestStateRef.current, remote, {
        forceAccept: justJoinedRoomRef.current,
        isResetting: isResettingRef.current,
      });
      if (!accepted) return;

      const normalizedRemote = migrateGameStateEconomy(remote);
      const prev = latestStateRef.current;
      justJoinedRoomRef.current = false;
      skipNextRemoteSyncRef.current = true;

      if (!prev || normalizedRemote.gameId !== prev.gameId || (prev.phase === 'GAME_OVER' && normalizedRemote.phase !== 'GAME_OVER')) {
        if (hopSafetyTimerRef.current !== null) {
          window.clearTimeout(hopSafetyTimerRef.current);
          hopSafetyTimerRef.current = null;
        }
        resolvedMoveVersionRef.current = null;
        jailEscapeLockRef.current = false;
        setSelectedTile(null);
        setIsSetupOpen(false);
        setDiceRolling(false);
        setHopQueue([]);
        setIsHopping(false);
        setAiLoading(false);
        setAiError(null);
        setIsEducationModalMinimized(false);
        fetchingDrawIdRef.current = null;
        lastDrawContextRef.current = null;
        setRecentFingerprints([]);
        setStatusMessage(
          `Synced match (${normalizedRemote.teams[normalizedRemote.activeTeamIndex]?.name || 'Team 1'}'s turn).`
        );
      }

      latestStateRef.current = normalizedRemote;
      setGameState(normalizedRemote);
    });
    return () => unsub();
  }, [firebaseStatus.configured, gameState?.mode, gameState?.roomCode]);

  const triggerCameraPreset = (preset: CameraPreset) => {
    setCameraPreset(preset);
    setCameraTrigger((c) => c + 1);
  };

  const handleToggleMute = () => {
    const next = !isMuted;
    setIsMuted(next);
    soundManager.setMuted(next);
  };

  const handleVolumeChange = (val: number) => {
    setVolume(val);
    soundManager.setVolume(val);
    if (val > 0 && isMuted) {
      setIsMuted(false);
      soundManager.setMuted(false);
    }
  };

  const handlePlayNewMatch = async () => {
    if (isResettingRef.current) return;
    const curr = latestStateRef.current || gameState;
    if (!curr) return;

    isResettingRef.current = true;
    setIsResettingMatch(true);

    try {
      if (hopSafetyTimerRef.current !== null) {
        window.clearTimeout(hopSafetyTimerRef.current);
        hopSafetyTimerRef.current = null;
      }

      const fresh = resetMatchState(curr);

      resolvedMoveVersionRef.current = null;
      jailEscapeLockRef.current = false;
      setSelectedTile(null);
      setIsSetupOpen(false);
      setIsOnlineOpen(false);
      setIsAdminOpen(false);
      setIsAISettingsOpen(false);
      setDiceRolling(false);
      setHopQueue([]);
      setIsHopping(false);
      setAiLoading(false);
      setAiError(null);
      lastDrawContextRef.current = null;
      setRecentFingerprints([]);

      await clearLocalGames();
      await saveLocalGame(fresh);

      if (firebaseStatus.configured && fresh.mode === 'online' && fresh.roomCode) {
        await ensureAuthUser().catch(() => undefined);
        await syncOnlineRoomState(fresh.roomCode, fresh).catch(() => undefined);
      }

      skipNextRemoteSyncRef.current = true;
      latestStateRef.current = fresh;
      setGameState(fresh);
      setStatusMessage(`New match started! ${fresh.teams[0]?.name || 'Team 1'} rolls first.`);
      triggerCameraPreset('overview');
    } finally {
      isResettingRef.current = false;
      setIsResettingMatch(false);
    }
  };

  const handleStartCustomGame = async () => {
    if (hopSafetyTimerRef.current !== null) {
      window.clearTimeout(hopSafetyTimerRef.current);
      hopSafetyTimerRef.current = null;
    }
    const baseTeams = createDefaultTeams(numTeams, teamNames);
    const teams: Team[] = baseTeams.map((t, idx) => {
      const m2 = teamMember2[idx]?.trim();
      return {
        ...t,
        members: m2 ? [{ name: `${t.name} #1` }, { name: m2 }] : t.members,
      };
    });
    const config = {
      ...DEFAULT_ECONOMY_CONFIG,
      businessIncome: {
        ...DEFAULT_ECONOMY_CONFIG.businessIncome,
        fixedStartSalary: salaryMode === 'balanced' ? 1200 : 0,
      },
    };
    const baseFresh = createInitialGameState(teams, config, 'local');
    const fresh: GameState = {
      ...baseFresh,
      stateVersion: (latestStateRef.current?.stateVersion || 0) + 1,
    };
    await clearLocalGames();
    await saveLocalGame(fresh);
    skipNextRemoteSyncRef.current = false;
    latestStateRef.current = fresh;
    resolvedMoveVersionRef.current = null;
    jailEscapeLockRef.current = false;
    setGameState(fresh);
    setSelectedTile(null);
    setDiceRolling(false);
    setHopQueue([]);
    setIsHopping(false);
    setAiError(null);
    setAiLoading(false);
    lastDrawContextRef.current = null;
    setRecentFingerprints([]);
    setIsSetupOpen(false);
    setStatusMessage(`New game started! ${fresh.teams[0].name} rolls first.`);
    triggerCameraPreset('overview');
  };

  const handleExportSaveJson = () => {
    if (!gameState) return;
    const blob = new Blob([JSON.stringify(gameState, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ptm-v2-research-save-${gameState.gameId}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportSaveJson = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setImportError(null);
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as GameState;
      if (!parsed.gameId || !Array.isArray(parsed.teams) || parsed.teams.length < 2) {
        setImportError('File JSON tidak valid untuk Periodic Table Monopoly.');
        return;
      }
      const migrated = migrateGameStateEconomy(parsed);
      const restored: GameState = {
        ...migrated,
        stateVersion: Math.max(migrated.stateVersion || 1, (latestStateRef.current?.stateVersion || 0) + 1),
      };
      resolvedMoveVersionRef.current = null;
      jailEscapeLockRef.current = false;
      latestStateRef.current = restored;
      setGameState(restored);
      setSelectedTile(null);
      setDiceRolling(false);
      setHopQueue([]);
      setIsHopping(false);
      setIsSetupOpen(false);
      setStatusMessage(`Save ${parsed.gameId} berhasil dipulihkan.`);
    } catch {
      setImportError('Gagal membaca file JSON save.');
    }
  };

  const handleCreateOrJoinOnline = async (isHost: boolean) => {
    if (!firebaseStatus.configured) {
      setOnlineStatus(
        `Firebase is not configured yet for V2. Missing: ${firebaseStatus.missingKeys.join(', ')}.`
      );
      return;
    }

    try {
      setOnlineStatus('Connecting to V2 Firebase project...');
      await ensureAuthUser();
      const code = (roomInput.trim() || Math.random().toString(36).slice(2, 8)).toUpperCase();
      await upsertRoomMetadata(code);
      if (isHost && gameState) {
        const onlineState: GameState = {
          ...gameState,
          mode: 'online',
          roomCode: code,
          stateVersion: gameState.stateVersion + 1,
          updatedAt: Date.now(),
        };
        justJoinedRoomRef.current = false;
        skipNextRemoteSyncRef.current = true;
        await syncOnlineRoomState(code, onlineState);
        latestStateRef.current = onlineState;
        setGameState(onlineState);
        setOnlineStatus(`Room ${code} live! Share this code with teammates.`);
        setIsOnlineOpen(false);
      } else {
        justJoinedRoomRef.current = true;
        setGameState((prev) =>
          prev
            ? { ...prev, mode: 'online', roomCode: code }
            : createInitialGameState(createDefaultTeams(2), DEFAULT_ECONOMY_CONFIG, 'online', code)
        );
        setOnlineStatus(`Joined room ${code}.`);
        setIsOnlineOpen(false);
      }
    } catch (err: any) {
      setOnlineStatus(`Sync failed: ${err?.message || 'Check connection'}`);
    }
  };

  const fetchDynamicEducationCard = useCallback(
    async (type: 'quiz' | 'study_case', drawEventId: string, element: ChemicalElement) => {
      if (fetchingDrawIdRef.current === drawEventId) return;
      fetchingDrawIdRef.current = drawEventId;
      lastDrawContextRef.current = { type, drawEventId, element };
      setAiLoading(true);
      setAiError(null);

      try {
        const endpoint = type === 'quiz' ? '/api/ai/quiz' : '/api/ai/study-case';
        const result = await safeFetchJson<any>(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            element,
            drawEventId,
            recentFingerprints,
          }),
        });
        if (!result.ok || !result.data) {
          setAiError(result.error || `Server AI mengembalikan status ${result.status}.`);
          setAiLoading(false);
          return;
        }
        const data = result.data;

        if (data.fingerprint) {
          setRecentFingerprints((prev) => [data.fingerprint, ...prev].slice(0, 20));
        }

        setGameState((prev) => {
          if (!prev) return prev;
          if (type === 'quiz') {
            return {
              ...prev,
              activeQuiz: data,
              quizDeadline: Date.now() + (data.timeLimitSeconds || 30) * 1000,
              phase: 'QUIZ_ACTIVE',
            };
          }
          return {
            ...prev,
            activeStudyCase: data,
            phase: 'STUDY_CASE_ACTIVE',
          };
        });
      } catch (err: any) {
        setAiError(err?.message || 'Gagal terhubung ke server AI.');
      } finally {
        fetchingDrawIdRef.current = null;
        setAiLoading(false);
      }
    },
    [recentFingerprints]
  );

  useEffect(() => {
    if (gameState?.phase !== 'QUIZ_ACTIVE' || !gameState.quizDeadline) {
      setQuizSecondsLeft(null);
      return;
    }
    const updateCountdown = () => {
      setQuizSecondsLeft(Math.max(0, Math.ceil((gameState.quizDeadline! - Date.now()) / 1000)));
    };
    updateCountdown();
    const timerId = window.setInterval(updateCountdown, 250);
    return () => window.clearInterval(timerId);
  }, [gameState?.phase, gameState?.quizDeadline]);

  useEffect(() => {
    if (!gameState || aiLoading || aiError) return;
    if (gameState.phase === 'QUIZ_ACTIVE' && !gameState.activeQuiz && gameState.activeDrawEventId) {
      const el = ELEMENTS_BY_ID[Math.floor(Math.random() * 118) + 1];
      fetchDynamicEducationCard('quiz', gameState.activeDrawEventId, el);
    } else if (
      gameState.phase === 'STUDY_CASE_ACTIVE' &&
      !gameState.activeStudyCase &&
      gameState.activeDrawEventId
    ) {
      const el = ELEMENTS_BY_ID[Math.floor(Math.random() * 118) + 1];
      fetchDynamicEducationCard('study_case', gameState.activeDrawEventId, el);
    }
  }, [gameState?.phase, gameState?.activeQuiz, gameState?.activeStudyCase, gameState?.activeDrawEventId, aiLoading, aiError, fetchDynamicEducationCard]);

  const handleRetryEducationCard = () => {
    const ctx = lastDrawContextRef.current;
    if (ctx) {
      fetchDynamicEducationCard(ctx.type, ctx.drawEventId, ctx.element);
    } else if (gameState?.activeDrawEventId) {
      const type = gameState.phase === 'QUIZ_ACTIVE' ? 'quiz' : 'study_case';
      fetchDynamicEducationCard(type, gameState.activeDrawEventId, ELEMENTS_BY_ID[Math.floor(Math.random() * 118) + 1]);
    }
  };

  const handleCancelEducationNoPenalty = () => {
    if (!gameState) return;
    const res = cancelPendingEducationCard(gameState);
    setAiError(null);
    setAiLoading(false);
    setIsEducationModalMinimized(false);
    fetchingDrawIdRef.current = null;
    const next = advanceToNextTurn(res.state);
    latestStateRef.current = next;
    setGameState(next);
    setStatusMessage('Kartu edukasi dilewati tanpa penalti karena AI tidak tersedia.');
  };

  const finishTileResolution = useCallback(
    (stateSnapshot: GameState) => {
      if (stateSnapshot.phase !== 'RESOLVING_TILE') return;
      if (resolvedMoveVersionRef.current === stateSnapshot.stateVersion) return;
      resolvedMoveVersionRef.current = stateSnapshot.stateVersion;

      const res = resolveLandedTileEffects(stateSnapshot);
      const next = res.state;
      latestStateRef.current = next;
      setGameState(next);

      const tile = res.landedTile;
      const team = next.teams[next.activeTeamIndex];

      if (tile?.atomicNumber && ELEMENTS_BY_ID[tile.atomicNumber]) {
        setSelectedElement(ELEMENTS_BY_ID[tile.atomicNumber]);
      }

      if (res.customsTriggered || next.events[0]?.type === 'CUSTOMS_SENT_TO_JAIL') {
        soundManager.play('alert');
        setStatusMessage(
          next.events[0]?.description || `${team.name} terkena Bea Cukai dan dikirim ke Penjara!`
        );
        return;
      }

      if (next.phase === 'ELEMENT_PURCHASE' && tile) {
        const el = tile.atomicNumber ? ELEMENTS_BY_ID[tile.atomicNumber] : null;
        setStatusMessage(
          `${team.name} landed on ${el?.symbol} (${el?.nameEn}). Available for ${el?.basePriceKK.toLocaleString('id-ID')} KK!`
        );
        setSelectedTile(tile);
      } else if (next.phase === 'MAIN_PROP_PURCHASE' && tile) {
        setStatusMessage(`${team.name} landed on Main Property ${tile.title}. Available to buy!`);
        setSelectedTile(tile);
      } else if (next.phase === 'QUIZ_ACTIVE') {
        const drawId = next.activeDrawEventId || `draw_quiz_${Date.now()}`;
        const randomEl = ELEMENTS_BY_ID[Math.floor(Math.random() * 118) + 1];
        setIsEducationModalMinimized(false);
        setStatusMessage(`${team.name} landed on QUIZ! Generating fresh AI chemistry question...`);
        soundManager.play('alert');
        fetchDynamicEducationCard('quiz', drawId, randomEl);
      } else if (next.phase === 'STUDY_CASE_ACTIVE') {
        const drawId = next.activeDrawEventId || `draw_case_${Date.now()}`;
        const randomEl = ELEMENTS_BY_ID[Math.floor(Math.random() * 118) + 1];
        setIsEducationModalMinimized(false);
        setStatusMessage(`${team.name} landed on STUDY CASE! Generating fresh AI chemistry case...`);
        soundManager.play('alert');
        fetchDynamicEducationCard('study_case', drawId, randomEl);
      } else {
        const latestEvent = next.events[0];
        if (latestEvent) setStatusMessage(latestEvent.description);
        if (latestEvent?.type === 'PROPERTY_RENT_PAID' || latestEvent?.type === 'MAINTENANCE_PAID') {
          soundManager.play('payment');
        }
      }
    },
    [fetchDynamicEducationCard]
  );

  const handleHopComplete = useCallback(() => {
    if (hopSafetyTimerRef.current !== null) {
      window.clearTimeout(hopSafetyTimerRef.current);
      hopSafetyTimerRef.current = null;
    }
    setIsHopping(false);
    setHopQueue([]);
    const curr = latestStateRef.current;
    if (curr && curr.phase === 'RESOLVING_TILE') {
      finishTileResolution(curr);
    }
  }, [finishTileResolution]);

  useEffect(() => {
    return () => {
      if (hopSafetyTimerRef.current !== null) {
        window.clearTimeout(hopSafetyTimerRef.current);
      }
    };
  }, []);

  const handleRollDice = async () => {
    if (!gameState || diceRolling || isHopping || gameState.phase !== 'TURN_START') return;
    const activeTeam = gameState.teams[gameState.activeTeamIndex];
    if (!activeTeam || activeTeam.isBankrupt) return;

    setDiceRolling(true);
    soundManager.play('dice');

    const d1 = Math.floor(Math.random() * 6) + 1;
    const d2 = Math.floor(Math.random() * 6) + 1;

    await new Promise((r) => setTimeout(r, reducedMotion ? 150 : 750));
    setDiceRolling(false);

    const moveResult = applyDiceMove(gameState, d1, d2);
    if (!moveResult.ok) {
      setStatusMessage(moveResult.error || 'Move rejected.');
      return;
    }

    if (moveResult.crossedStart) {
      soundManager.play('income');
    }

    latestStateRef.current = moveResult.state;
    setGameState(moveResult.state);

    if (moveResult.pathSteps && moveResult.pathSteps.length > 0) {
      if (workspaceLayout === 'ptable' || reducedMotion) {
        if (moveResult.customsTriggered) {
          soundManager.play('alert');
        }
        finishTileResolution(moveResult.state);
        return;
      }
      setIsHopping(true);
      setHopQueue(moveResult.pathSteps);
      if (moveResult.customsTriggered) {
        soundManager.play('alert');
        setStatusMessage(
          `${activeTeam.name} rolled [${d1}, ${d2}] (${d1 + d2} steps) — terkena Bea Cukai → dikirim ke Penjara!`
        );
      } else {
        setStatusMessage(
          `${activeTeam.name} rolled [${d1}, ${d2}] (${d1 + d2} steps) → moving to Tile #${moveResult.landedTile?.pathIndex}...`
        );
      }
      if (cameraPreset === 'follow') {
        setCameraTrigger((c) => c + 1);
      }
      if (hopSafetyTimerRef.current !== null) {
        window.clearTimeout(hopSafetyTimerRef.current);
      }
      hopSafetyTimerRef.current = window.setTimeout(() => {
        handleHopComplete();
      }, Math.max(3000, moveResult.pathSteps.length * 360 + (moveResult.customsTriggered ? 1200 : 0)));
    } else {
      setStatusMessage(moveResult.state.events[0]?.description || 'Turn resolved.');
    }
  };

  const handleBuyElement = (tileId: string) => {
    if (!gameState) return;
    const activeTeam = gameState.teams[gameState.activeTeamIndex];
    const res = buyElementProperty(gameState, activeTeam.id, tileId);
    if (!res.ok) {
      setStatusMessage(res.error || 'Cannot buy property.');
      soundManager.play('alert');
      return;
    }
    soundManager.play('purchase');
    latestStateRef.current = res.state;
    setGameState(res.state);
    setSelectedTile(null);
    setStatusMessage(res.state.events[0]?.description || 'Property purchased!');
  };

  const handleBuyMainProperty = (tileId: string) => {
    if (!gameState) return;
    const activeTeam = gameState.teams[gameState.activeTeamIndex];
    const res = buyMainProperty(gameState, activeTeam.id, tileId);
    if (!res.ok) {
      setStatusMessage(res.error || 'Cannot buy main property.');
      soundManager.play('alert');
      return;
    }
    soundManager.play('purchase');
    latestStateRef.current = res.state;
    setGameState(res.state);
    setSelectedTile(null);
    setStatusMessage(res.state.events[0]?.description || 'Main property purchased!');
  };

  const handleBuildCompany = (tileId: string) => {
    if (!gameState) return;
    const activeTeam = gameState.teams[gameState.activeTeamIndex];
    const res = buildCompanyOnProperty(gameState, activeTeam.id, tileId);
    if (!res.ok) {
      setStatusMessage(res.error || 'Cannot build company.');
      soundManager.play('alert');
      return;
    }
    soundManager.play('purchase');
    latestStateRef.current = res.state;
    setGameState(res.state);
    setStatusMessage(res.state.events[0]?.description || 'Company built!');
  };

  const handleSellCompanies = (tileId: string) => {
    if (!gameState) return;
    const activeTeam = gameState.teams[gameState.activeTeamIndex];
    const res = sellCompaniesBeforeAuction(gameState, activeTeam.id, tileId);
    if (!res.ok) {
      setStatusMessage(res.error || 'Cannot liquidate companies.');
      soundManager.play('alert');
      return;
    }
    soundManager.play('income');
    latestStateRef.current = res.state;
    setGameState(res.state);
    setStatusMessage(res.state.events[0]?.description || 'Buildings sold!');
  };

  const handleStartAuction = (tileId: string) => {
    if (!gameState) return;
    const activeTeam = gameState.teams[gameState.activeTeamIndex];
    const res = startElementAuction(gameState, activeTeam.id, tileId);
    if (!res.ok) {
      setStatusMessage(res.error || 'Cannot start auction.');
      return;
    }
    soundManager.play('auction');
    latestStateRef.current = res.state;
    setGameState(res.state);
    setSelectedTile(null);
  };

  const handlePlaceBid = (bidderTeamId: string, amountKK: number) => {
    if (!gameState) return;
    const res = placeAuctionBid(gameState, bidderTeamId, amountKK);
    if (!res.ok) {
      setStatusMessage(res.error || 'Invalid bid.');
      return;
    }
    soundManager.play('hop');
    latestStateRef.current = res.state;
    setGameState(res.state);
  };

  const handleFinishAuction = () => {
    if (!gameState) return;
    const res = finalizeAuction(gameState);
    if (!res.ok) {
      setStatusMessage(res.error || 'Cannot settle auction.');
      return;
    }
    soundManager.play('auction');
    latestStateRef.current = res.state;
    setGameState(res.state);
    setStatusMessage(res.state.events[0]?.description || 'Auction finalized.');
  };

  const handleRejectAuction = () => {
    if (!gameState) return;
    const res = rejectAuction(gameState);
    if (!res.ok) {
      setStatusMessage(res.error || 'Cannot reject auction.');
      return;
    }
    soundManager.play('alert');
    latestStateRef.current = res.state;
    setGameState(res.state);
    setStatusMessage(res.state.events[0]?.description || 'Auction rejected.');
  };

  const handleQuizResolved = (isCorrect: boolean) => {
    const curr = latestStateRef.current;
    if (!curr) return;
    soundManager.play(isCorrect ? 'quizSuccess' : 'alert');
    setIsEducationModalMinimized(false);
    fetchingDrawIdRef.current = null;
    const res = resolveQuizResult(curr, isCorrect);
    const next = advanceToNextTurn(res.state);
    latestStateRef.current = next;
    setGameState(next);
    setStatusMessage(next.events[0]?.description || 'Quiz completed.');
  };

  const handleStudyCaseComplete = (isApproved: boolean) => {
    const curr = latestStateRef.current;
    if (!curr) return;
    soundManager.play(isApproved ? 'quizSuccess' : 'alert');
    setIsEducationModalMinimized(false);
    fetchingDrawIdRef.current = null;
    const res = resolveStudyCaseResult(curr, isApproved);
    const next = advanceToNextTurn(res.state);
    latestStateRef.current = next;
    setGameState(next);
    setStatusMessage(next.events[0]?.description || 'Case study completed.');
  };

  const handleEndTurn = () => {
    if (
      !gameState ||
      isHopping ||
      diceRolling ||
      gameState.phase === 'QUIZ_ACTIVE' ||
      gameState.phase === 'STUDY_CASE_ACTIVE' ||
      gameState.phase === 'AUCTION_ACTIVE'
    ) {
      return;
    }
    const next = advanceToNextTurn(gameState);
    latestStateRef.current = next;
    setGameState(next);
    setStatusMessage(`Turn passed to ${next.teams[next.activeTeamIndex]?.name}.`);
  };

  const handleJailEscape = (method: 'bail' | 'card') => {
    if (!gameState || jailEscapeLockRef.current) return;
    jailEscapeLockRef.current = true;
    try {
      const activeTeam = gameState.teams[gameState.activeTeamIndex];
      const res = payJailBailOrCard(gameState, activeTeam.id, method);
      if (!res.ok) {
        setStatusMessage(res.error || 'Cannot escape jail.');
        soundManager.play('alert');
        return;
      }
      soundManager.play(method === 'bail' ? 'payment' : 'income');
      latestStateRef.current = res.state;
      setGameState(res.state);
      setStatusMessage(res.state.events[0]?.description || 'Escaped jail! You may now roll.');
    } finally {
      jailEscapeLockRef.current = false;
    }
  };

  const activeTeam = gameState?.teams[gameState.activeTeamIndex] ?? null;
  const activeTile = activeTeam ? TILES_BY_PATH_INDEX[activeTeam.position] : BOARD_TILES[0];
  const activeTileElement = activeTile?.atomicNumber ? ELEMENTS_BY_ID[activeTile.atomicNumber] : null;

  const hasPendingQuiz = Boolean(gameState?.phase === 'QUIZ_ACTIVE' || gameState?.activeQuiz);
  const hasPendingStudyCase = Boolean(
    gameState?.phase === 'STUDY_CASE_ACTIVE' || gameState?.activeStudyCase
  );
  const hasPendingEducationCard = hasPendingQuiz || hasPendingStudyCase;
  const pendingEducationLabel = hasPendingStudyCase ? 'Studi Kasus' : 'Kuis';

  const canBuyCurrentElement = Boolean(
    gameState &&
      activeTeam &&
      activeTile?.tileType === 'element' &&
      !gameState.properties[activeTile.tileId] &&
      gameState.phase === 'ELEMENT_PURCHASE'
  );
  const canBuyCurrentMain = Boolean(
    gameState &&
      activeTeam &&
      activeTile?.tileType === 'main_property' &&
      activeTile.mainPropertyId &&
      !gameState.mainProperties[activeTile.mainPropertyId] &&
      gameState.phase === 'MAIN_PROP_PURCHASE'
  );

  const teamStats = useMemo(() => {
    const map: Record<string, { deeds: number; companies: number; startIncome: number; netWorth: number }> = {};
    if (!gameState) return map;
    gameState.teams.forEach((t) => {
      let deeds = 0;
      let companies = 0;
      Object.values(gameState.properties).forEach((p) => {
        if (p.ownerTeamId === t.id) {
          deeds += 1;
          companies += p.hasLargeCompany ? 1 : p.smallCompanies;
        }
      });
      map[t.id] = {
        deeds,
        companies,
        startIncome: calculateStartIncome(t.id, gameState).totalIncomeKK,
        netWorth: calculateNetWorth(t.id, gameState),
      };
    });
    return map;
  }, [gameState]);

  if (!gameState || !activeTeam) {
    return (
      <div className="min-h-screen bg-[#09090D] flex items-center justify-center text-[#F4F1EA]">
        <div className="flex flex-col items-center gap-3">
          <Atom className="w-10 h-10 text-[#286BFF] animate-spin" />
          <p className="font-display text-sm font-bold tracking-wide">
            Loading {V2_TITLE} ({V2_BADGE})...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#09090D] text-[#F4F1EA] flex flex-col overflow-x-hidden">
      {/* Top 3-Zone Command Bar (V2 Research Edition Direct Entry) */}
      <header className="bg-[#171820] border-b border-white/10 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {onBackToHome && (
            <button
              type="button"
              onClick={() => {
                if (latestStateRef.current && latestStateRef.current.phase !== 'GAME_OVER') {
                  saveLocalGame(latestStateRef.current).catch(() => {});
                }
                onBackToHome();
              }}
              title="Back to Homescreen"
              className="px-3 py-1.5 rounded-xl bg-[#20222D] hover:bg-[#2C2F3D] border border-white/15 hover:border-[#286BFF] text-xs font-bold text-[#F4F1EA] flex items-center gap-1.5 cursor-pointer transition-colors whitespace-nowrap shrink-0"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-[#A6A9B7]" />
              <span>Back</span>
            </button>
          )}
          <div className="w-9 h-9 rounded-xl flex items-center justify-center shadow-lg bg-[#286BFF]">
            <Atom className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-display text-base font-bold tracking-tight text-[#F4F1EA] leading-tight">
                {V2_TITLE}
              </h1>
              <span className="font-mono text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-[#20222D] border border-white/10 text-[#FF8733]">
                {V2_BADGE}
              </span>
            </div>
            <p className="text-[11px] text-[#A6A9B7] hidden sm:block">{V2_SUBTITLE}</p>
          </div>
        </div>

        {/* Center: Workspace Layout Switcher */}
        <div className="flex items-center bg-[#09090D] p-1 rounded-xl border border-white/10 gap-1 text-xs font-bold">
          <button
            type="button"
            onClick={() => setWorkspaceLayout('split')}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 cursor-pointer transition-colors ${
              workspaceLayout === 'split'
                ? 'bg-[#286BFF] text-white'
                : 'text-[#A6A9B7] hover:text-white'
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" /> Split Lab
          </button>
          <button
            type="button"
            onClick={() => setWorkspaceLayout('board')}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 cursor-pointer transition-colors ${
              workspaceLayout === 'board'
                ? 'bg-[#7029FF] text-white'
                : 'text-[#A6A9B7] hover:text-white'
            }`}
          >
            <Box className="w-3.5 h-3.5" /> 3D Board
          </button>
          <button
            type="button"
            onClick={() => setWorkspaceLayout('ptable')}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 cursor-pointer transition-colors ${
              workspaceLayout === 'ptable'
                ? 'bg-[#FF8733] text-[#09090D]'
                : 'text-[#A6A9B7] hover:text-white'
            }`}
          >
            <Grid3x3 className="w-3.5 h-3.5" /> Periodic Explorer
          </button>
        </div>

        {/* Right: Audio, Motion, AI, Online, Admin Commands & Setup */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="hidden md:flex items-center gap-2 bg-[#09090D] px-2.5 py-1.5 rounded-xl border border-white/10">
            <button
              type="button"
              aria-label={isMuted ? 'Unmute audio' : 'Mute audio'}
              onClick={handleToggleMute}
              className="text-[#A6A9B7] hover:text-white cursor-pointer"
            >
              {isMuted ? (
                <VolumeX className="w-4 h-4 text-[#F45B69]" />
              ) : (
                <Volume2 className="w-4 h-4 text-[#32C48D]" />
              )}
            </button>
            <input
              type="range"
              aria-label="Audio volume"
              min={0}
              max={1}
              step={0.05}
              value={isMuted ? 0 : volume}
              onChange={(e) => handleVolumeChange(Number(e.target.value))}
              className="w-14 h-1 accent-[#286BFF] cursor-pointer"
            />
          </div>

          <button
            type="button"
            onClick={() => setReducedMotion((v) => !v)}
            title="Toggle Reduced Motion"
            className={`px-2.5 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 cursor-pointer ${
              reducedMotion
                ? 'bg-[#382F10] border-[#F5B942]/60 text-[#FEF08A]'
                : 'bg-[#20222D] hover:bg-[#2C2F3D] border-white/10 text-[#A6A9B7]'
            }`}
          >
            <Accessibility className="w-3.5 h-3.5" />
            <span className="hidden lg:inline">{reducedMotion ? 'Motion: Off' : 'Motion'}</span>
          </button>

          <button
            type="button"
            onClick={() => setIsAISettingsOpen(true)}
            className="px-2.5 py-1.5 rounded-xl bg-[#20222D] hover:bg-[#2C2F3D] border border-white/10 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
          >
            <Cpu className="w-3.5 h-3.5 text-[#32C48D]" />
            <span className="hidden sm:inline">AI Settings</span>
          </button>

          <button
            type="button"
            onClick={() => setIsOnlineOpen(true)}
            className="px-2.5 py-1.5 rounded-xl bg-[#20222D] hover:bg-[#2C2F3D] border border-white/10 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
          >
            <Globe className="w-3.5 h-3.5 text-[#286BFF]" />
            <span>
              {gameState.mode === 'online'
                ? `Room: ${gameState.roomCode}`
                : firebaseStatus.configured
                ? 'Online Sync'
                : 'Online Sync (Setup)'}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setIsAdminOpen(true)}
            className="px-2.5 py-1.5 rounded-xl bg-[#20222D] hover:bg-[#2C2F3D] border border-[#FF8733]/50 text-[#FF8733] text-xs font-bold flex items-center gap-1.5 cursor-pointer"
          >
            <Shield className="w-3.5 h-3.5" />
            <span>Admin Commands</span>
          </button>

          <button
            type="button"
            onClick={() => setIsSetupOpen(true)}
            className="px-3 py-1.5 rounded-xl bg-[#7029FF] hover:bg-[#5E1FE0] text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
          >
            <Users className="w-3.5 h-3.5" /> New Game
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col xl:flex-row gap-3 p-3 max-w-[1920px] mx-auto w-full min-w-0">
        <div className="flex-1 flex flex-col gap-3 min-w-0">
          <div className="bg-[#171820] border border-white/10 rounded-xl px-4 py-2 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2.5 min-w-0">
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: activeTeam.color }}
              />
              <span className="font-semibold text-[#F4F1EA] truncate">{statusMessage}</span>
            </div>
            <div className="flex items-center gap-3 font-mono text-[11px] text-[#A6A9B7] tabular-nums">
              <span>
                Dice:{' '}
                <strong className="text-[#FF8733]">
                  [{gameState.lastDice[0]}, {gameState.lastDice[1]}]
                </strong>
              </span>
              <span>
                Temp: <strong className="text-[#286BFF]">{temperatureC}°C</strong>
              </span>
            </div>
          </div>

          {workspaceLayout !== 'ptable' && (
            <div
              className={`relative flex flex-col rounded-2xl overflow-hidden ${
                workspaceLayout === 'board'
                  ? 'h-[calc(100vh-185px)] min-h-[520px]'
                  : 'h-[470px] xl:h-[520px]'
              }`}
            >
              <div className="absolute top-3 left-3 z-10 flex flex-wrap items-center gap-1.5 bg-[#171820] border border-white/15 p-1.5 rounded-xl">
                <span className="text-[10px] font-mono uppercase text-[#A6A9B7] px-1.5 flex items-center gap-1">
                  <Camera className="w-3 h-3" /> Cam
                </span>
                {(
                  [
                    { id: 'overview', label: 'Overview' },
                    { id: 'follow', label: 'Active Piece' },
                    { id: 'inspect', label: 'Selected Tile' },
                    { id: 'top', label: 'Top-Down' },
                    { id: 'ptable', label: 'Ptable Focus' },
                  ] as { id: CameraPreset; label: string }[]
                ).map((cam) => (
                  <button
                    key={cam.id}
                    type="button"
                    onClick={() => triggerCameraPreset(cam.id)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer transition-colors ${
                      cameraPreset === cam.id
                        ? 'bg-[#286BFF] text-white'
                        : 'bg-[#20222D] text-[#A6A9B7] hover:text-white'
                    }`}
                  >
                    {cam.label}
                  </button>
                ))}
              </div>

              {hasPendingEducationCard && isEducationModalMinimized && (
                <div className="absolute top-3 right-3 z-20 flex items-center gap-2.5 bg-[#171820]/95 border border-[#FF8733]/60 px-3 py-2 rounded-xl shadow-lg">
                  <div className="flex items-center gap-2 text-xs text-[#F4F1EA]">
                    {hasPendingQuiz ? (
                      <Timer className="w-4 h-4 text-[#FF8733] shrink-0" />
                    ) : (
                      <HelpCircle className="w-4 h-4 text-[#D8B4FE] shrink-0" />
                    )}
                    <span className="font-semibold whitespace-nowrap">
                      {pendingEducationLabel} Aktif
                      {hasPendingQuiz && quizSecondsLeft !== null ? (
                        <span className="ml-1.5 font-mono text-[#FF8733] tabular-nums">
                          · {quizSecondsLeft}s
                        </span>
                      ) : null}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsEducationModalMinimized(false)}
                    className="min-h-[34px] px-3 py-1 rounded-lg bg-[#7029FF] hover:bg-[#5E1FE0] text-white text-xs font-bold whitespace-nowrap shrink-0 cursor-pointer transition-colors"
                  >
                    Buka {pendingEducationLabel}
                  </button>
                </div>
              )}

              <BoardScene3D
                tiles={BOARD_TILES}
                teams={gameState.teams}
                activeTeamIndex={gameState.activeTeamIndex}
                properties={gameState.properties}
                lastDice={gameState.lastDice}
                isRolling={diceRolling}
                hopQueue={hopQueue}
                onHopComplete={handleHopComplete}
                colorMode={colorMode}
                temperatureC={temperatureC}
                selectedAtomicNumber={selectedElement.atomicNumber}
                cameraPreset={cameraPreset}
                cameraTrigger={cameraTrigger}
                reducedMotion={reducedMotion}
                onTileClick={(tile) => {
                  if (hasPendingQuiz && tile.tileType === 'quiz') {
                    setIsEducationModalMinimized(false);
                    setSelectedTile(null);
                    soundManager.play('hop');
                    setStatusMessage('Membuka kembali Kuis Kimia aktif...');
                    return;
                  }
                  if (hasPendingStudyCase && tile.tileType === 'study_case') {
                    setIsEducationModalMinimized(false);
                    setSelectedTile(null);
                    soundManager.play('hop');
                    setStatusMessage('Membuka kembali Studi Kasus aktif...');
                    return;
                  }
                  if (tile.atomicNumber && ELEMENTS_BY_ID[tile.atomicNumber]) {
                    setSelectedElement(ELEMENTS_BY_ID[tile.atomicNumber]);
                  }
                  setSelectedTile(tile);
                }}
                onElementSelect={(el) => {
                  setSelectedElement(el);
                  soundManager.play('hop');
                  setStatusMessage(
                    `Selected ${el.symbol} (${el.nameEn}, Z=${el.atomicNumber}) — synced with Research Lab tabs.`
                  );
                }}
              />
              {workspaceLayout === 'board' && (
                <div className="absolute bottom-3 left-3 z-10 flex items-center gap-2 bg-[#171820]/95 border border-white/15 px-3 py-1.5 rounded-xl text-xs">
                  <span className="font-mono font-bold text-[#FF8733]">
                    #{selectedElement.atomicNumber} {selectedElement.symbol}
                  </span>
                  <span className="text-[#F4F1EA] font-semibold hidden sm:inline">
                    {selectedElement.nameEn}
                  </span>
                  <button
                    type="button"
                    onClick={() => setWorkspaceLayout('split')}
                    className="px-2.5 py-1 rounded-lg bg-[#286BFF] hover:bg-[#1D57DC] text-white font-bold text-[11px] cursor-pointer"
                  >
                    Open in Research Lab
                  </button>
                </div>
              )}
            </div>
          )}

          {workspaceLayout !== 'board' && (
            <div className="flex-1 min-h-[420px]">
              <Suspense
                fallback={
                  <div className="bg-[#171820] border border-white/10 rounded-xl p-10 flex items-center justify-center gap-3 text-xs text-[#A6A9B7]">
                    <Loader2 className="w-5 h-5 text-[#286BFF] animate-spin" />
                    <span>Loading Research Edition Ptable Explorer...</span>
                  </div>
                }
              >
                <LazyPeriodicTableExplorer
                  selectedElement={selectedElement}
                  onSelectElement={(el) => {
                    setSelectedElement(el);
                    soundManager.play('hop');
                  }}
                  onFocusOnBoard={(atomicNumber) => {
                    const target = BOARD_TILES.find((t) => t.atomicNumber === atomicNumber);
                    if (target) {
                      setSelectedTile(target);
                      if (workspaceLayout === 'ptable') setWorkspaceLayout('split');
                      triggerCameraPreset('inspect');
                    }
                  }}
                  temperatureC={temperatureC}
                  onTemperatureChange={setTemperatureC}
                  colorMode={colorMode}
                  onColorModeChange={setColorMode}
                  selectedBoardElementId={activeTileElement?.atomicNumber ?? null}
                />
              </Suspense>
            </div>
          )}
        </div>

        {/* Right Turn Control & Financial Ledger Sidebar */}
        <aside className="w-full xl:w-88 shrink-0 flex flex-col gap-3 min-w-0">
          <div className="bg-[#171820] border border-white/10 rounded-2xl p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <span className="text-[11px] font-mono uppercase tracking-wider text-[#A6A9B7]">
                Active Turn
              </span>
              <span
                style={{ backgroundColor: activeTeam.color }}
                className="px-2.5 py-0.5 rounded-md text-[10px] font-bold text-white"
              >
                Team #{gameState.activeTeamIndex + 1}
              </span>
            </div>

            <div className="flex items-center gap-3">
              <div
                style={{ backgroundColor: activeTeam.color }}
                className="w-11 h-11 rounded-xl flex items-center justify-center text-xl shadow-md shrink-0"
              >
                {activeTeam.tokenIcon}
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="font-display text-base font-bold text-[#F4F1EA] truncate">
                  {activeTeam.name}
                </h2>
                <div className="text-xs text-[#A6A9B7] truncate">
                  Position:{' '}
                  <strong className="font-mono text-[#286BFF]">Tile #{activeTile.pathIndex}</strong> ·{' '}
                  {activeTileElement
                    ? `${activeTileElement.symbol} (${activeTileElement.nameEn})`
                    : activeTile.title}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 bg-[#20222D] p-3 rounded-xl border border-white/10 text-xs tabular-nums">
              <div>
                <span className="text-[10px] text-[#A6A9B7] block">Balance (KK)</span>
                <strong className="font-mono text-base font-bold text-[#86EFAC]">
                  {activeTeam.balanceKK.toLocaleString('id-ID')}
                </strong>
              </div>
              <div>
                <span className="text-[10px] text-[#A6A9B7] block">START Income</span>
                <strong className="font-mono text-sm font-bold text-[#32C48D]">
                  +{(teamStats[activeTeam.id]?.startIncome ?? 0).toLocaleString('id-ID')} KK
                </strong>
              </div>
              <div>
                <span className="text-[10px] text-[#A6A9B7] block">Deeds / Companies</span>
                <strong className="font-mono text-xs font-bold text-[#F4F1EA]">
                  {teamStats[activeTeam.id]?.deeds ?? 0} / {teamStats[activeTeam.id]?.companies ?? 0}
                </strong>
              </div>
              <div>
                <span className="text-[10px] text-[#A6A9B7] block">Jail Free Cards</span>
                <strong className="font-mono text-xs font-bold text-[#F4F1EA]">
                  {activeTeam.jailCards} Cards
                </strong>
              </div>
              <div>
                <span className="text-[10px] text-[#A6A9B7] block">Case Study Fails</span>
                <strong
                  className={`font-mono ${
                    activeTeam.studyCaseFailures >= 2 ? 'text-[#F45B69]' : 'text-[#F4F1EA]'
                  }`}
                >
                  {activeTeam.studyCaseFailures} / 3
                </strong>
              </div>
              <div>
                <span className="text-[10px] text-[#A6A9B7] block">Quiz Fails</span>
                <strong
                  className={`font-mono ${
                    activeTeam.quizFailures >= 5 ? 'text-[#F45B69]' : 'text-[#F4F1EA]'
                  }`}
                >
                  {activeTeam.quizFailures} / 7
                </strong>
              </div>
            </div>

            {activeTeam.isInJail && gameState.phase === 'TURN_START' && (() => {
              const bailKK = gameState.economyConfig.educationalRewards.jailBailKK ?? DEFAULT_JAIL_BAIL_KK;
              const canAffordBail = activeTeam.balanceKK >= bailKK;
              return (
                <div className="bg-[#382F10] border border-[#F5B942]/50 rounded-xl p-2.5 text-xs space-y-2">
                  <div className="flex items-center justify-between gap-2 font-bold text-[#FEF08A]">
                    <span className="flex items-center gap-1.5">
                      <ShieldAlert className="w-4 h-4" />
                      <span>Dalam Penjara ({activeTeam.jailTurns} giliran tersisa)</span>
                    </span>
                  </div>
                  <div className="text-[11px] text-[#FDE68A]/90 font-mono">
                    Biaya Bebas Penjara: <strong>{bailKK.toLocaleString('id-ID')} KK</strong>
                  </div>
                  {!canAffordBail && (
                    <div className="text-[10px] text-[#FCA5A5]">
                      Saldo tidak mencukupi (butuh {bailKK.toLocaleString('id-ID')} KK).
                    </div>
                  )}
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={!canAffordBail}
                      onClick={() => handleJailEscape('bail')}
                      className="flex-1 py-1.5 rounded-lg bg-[#FF8733] hover:bg-[#E67222] disabled:opacity-45 disabled:cursor-not-allowed text-[#09090D] font-bold text-[11px] cursor-pointer"
                    >
                      Bayar {bailKK.toLocaleString('id-ID')} KK
                    </button>
                    {activeTeam.jailCards > 0 && (
                      <button
                        type="button"
                        onClick={() => handleJailEscape('card')}
                        className="flex-1 py-1.5 rounded-lg bg-[#286BFF] text-white font-bold text-[11px] flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <KeyRound className="w-3 h-3" /> Use Card
                      </button>
                    )}
                  </div>
                </div>
              );
            })()}

            {hasPendingEducationCard && (
              <div className="bg-[#241B14] border border-[#FF8733]/60 rounded-xl p-3 space-y-2 text-xs">
                <div className="flex items-start gap-2 text-[#FDBA74] font-semibold">
                  <Lock className="w-4 h-4 shrink-0 mt-0.5 text-[#FF8733]" />
                  <div className="min-w-0 flex-1">
                    <div>Selesaikan Studi Kasus / Kuis terlebih dahulu</div>
                    {hasPendingQuiz && quizSecondsLeft !== null && (
                      <div className="font-mono text-[11px] text-[#FF8733] tabular-nums mt-0.5">
                        Sisa waktu kuis: {quizSecondsLeft}s
                      </div>
                    )}
                    {isEducationModalMinimized && (
                      <div className="text-[11px] text-[#F4F1EA]/80 font-normal mt-1">
                        Klik petak {pendingEducationLabel} di papan 3D atau tombol di bawah untuk melanjutkan.
                      </div>
                    )}
                  </div>
                </div>
                {isEducationModalMinimized && (
                  <button
                    type="button"
                    onClick={() => setIsEducationModalMinimized(false)}
                    className="w-full min-h-[40px] py-2 px-4 rounded-xl bg-[#FF8733] hover:bg-[#E67222] text-[#09090D] font-bold text-xs whitespace-nowrap cursor-pointer transition-colors"
                  >
                    Buka {pendingEducationLabel}
                    {hasPendingQuiz && quizSecondsLeft !== null ? ` (${quizSecondsLeft}s)` : ''}
                  </button>
                )}
              </div>
            )}

            <button
              type="button"
              disabled={
                diceRolling ||
                isHopping ||
                gameState.phase !== 'TURN_START' ||
                hasPendingEducationCard ||
                activeTeam.isBankrupt
              }
              onClick={handleRollDice}
              title={
                hasPendingEducationCard
                  ? 'Selesaikan Studi Kasus / Kuis terlebih dahulu'
                  : undefined
              }
              className="w-full py-3 rounded-xl bg-[#7029FF] hover:bg-[#5E1FE0] disabled:opacity-45 disabled:cursor-not-allowed text-white font-bold text-sm flex items-center justify-center gap-2 cursor-pointer transition-colors"
            >
              <Dices className={`w-5 h-5 ${diceRolling ? 'animate-spin' : ''}`} />
              <span>
                {diceRolling
                  ? 'Rolling 3D Dice...'
                  : isHopping
                  ? 'Moving Piece...'
                  : 'Roll 2 Dice'}
              </span>
            </button>

            <AnimatePresence>
              {canBuyCurrentElement && activeTileElement && (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  className="bg-[#152238] border border-[#286BFF] rounded-xl p-2.5 space-y-2"
                >
                  <div className="text-[11px] text-[#93C5FD] font-semibold">
                    Landed on unowned{' '}
                    <strong>
                      {activeTileElement.symbol} ({activeTileElement.nameEn})
                    </strong>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={activeTeam.balanceKK < activeTileElement.basePriceKK}
                      onClick={() => handleBuyElement(activeTile.tileId)}
                      className="flex-1 py-2 rounded-lg bg-[#32C48D] hover:bg-[#24A977] disabled:opacity-45 text-[#09090D] font-extrabold text-xs flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <DollarSign className="w-3.5 h-3.5" /> Buy (
                      {activeTileElement.basePriceKK.toLocaleString('id-ID')} KK)
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedTile(activeTile)}
                      className="px-2.5 py-2 rounded-lg bg-[#20222D] hover:bg-[#2C2F3D] text-white text-xs font-bold cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </motion.div>
              )}

              {canBuyCurrentMain && activeTile.mainPropertyId && (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  className="bg-[#2B1F14] border border-[#FF8733] rounded-xl p-2.5 space-y-2"
                >
                  <div className="text-[11px] text-[#FDBA74] font-semibold">
                    Landed on <strong>{activeTile.title}</strong>
                  </div>
                  <button
                    type="button"
                    disabled={
                      activeTeam.balanceKK <
                      (MAIN_PROPERTIES_BY_ID[activeTile.mainPropertyId]?.draftPurchasePriceKK || 20000)
                    }
                    onClick={() => handleBuyMainProperty(activeTile.tileId)}
                    className="w-full py-2 rounded-lg bg-[#FF8733] hover:bg-[#E67222] disabled:opacity-45 text-[#09090D] font-extrabold text-xs cursor-pointer"
                  >
                    Buy Main Property (
                    {(
                      MAIN_PROPERTIES_BY_ID[activeTile.mainPropertyId]?.draftPurchasePriceKK || 20000
                    ).toLocaleString('id-ID')}{' '}
                    KK)
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {gameState.phase !== 'TURN_START' && gameState.phase !== 'GAME_OVER' && (
              <button
                type="button"
                disabled={
                  isHopping ||
                  diceRolling ||
                  hasPendingEducationCard ||
                  gameState.phase === 'AUCTION_ACTIVE'
                }
                onClick={handleEndTurn}
                title={
                  hasPendingEducationCard
                    ? 'Selesaikan Studi Kasus / Kuis terlebih dahulu'
                    : undefined
                }
                className="w-full py-2.5 rounded-xl bg-[#20222D] hover:bg-[#2C2F3D] disabled:opacity-40 disabled:cursor-not-allowed border border-white/15 text-[#F4F1EA] font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4 text-[#86EFAC]" /> End Turn &amp; Pass Dice
              </button>
            )}
          </div>

          <div className="bg-[#171820] border border-white/10 rounded-2xl p-3.5 flex flex-col gap-2">
            <h3 className="text-[11px] font-mono uppercase tracking-wider text-[#A6A9B7]">
              Teams Standings
            </h3>
            <div className="space-y-1.5 tabular-nums">
              {gameState.teams.map((t, idx) => {
                const st = teamStats[t.id];
                return (
                  <div
                    key={t.id}
                    className={`p-2.5 rounded-xl border flex items-center justify-between text-xs ${
                      idx === gameState.activeTeamIndex
                        ? 'bg-[#20222D] border-[#286BFF]'
                        : 'bg-[#09090D]/60 border-white/10'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: t.color }}
                      />
                      <div className="min-w-0">
                        <div className="font-bold text-[#F4F1EA] truncate flex items-center gap-1.5">
                          <span>{t.name}</span>
                          {t.isBankrupt && (
                            <span className="text-[9px] px-1 rounded bg-[#3B161B] text-[#FCA5A5]">
                              BANKRUPT
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-[#A6A9B7]">
                          Tile #{t.position} · {st?.deeds || 0} Deeds · +{st?.startIncome.toLocaleString('id-ID') || 0}/START
                        </div>
                      </div>
                    </div>
                    <div className="font-mono font-bold text-[#86EFAC] shrink-0">
                      {t.balanceKK.toLocaleString('id-ID')} KK
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-[#171820] border border-white/10 rounded-2xl p-3.5 flex flex-col gap-2 flex-1 max-h-64 overflow-hidden">
            <h3 className="text-[11px] font-mono uppercase tracking-wider text-[#A6A9B7]">
              Financial Ledger &amp; Events
            </h3>
            <div className="overflow-y-auto space-y-1.5 pr-1 text-[11px] tabular-nums">
              {gameState.events.map((ev) => (
                <div key={ev.id} className="p-2 rounded-lg bg-[#20222D]/70 border border-white/5">
                  <div className="flex justify-between items-center text-[10px] font-mono text-[#A6A9B7] mb-0.5">
                    <span>{new Date(ev.timestamp).toLocaleTimeString()}</span>
                    {typeof ev.amountKK === 'number' && ev.amountKK !== 0 && (
                      <span
                        className={
                          ev.amountKK > 0 ? 'text-[#86EFAC] font-bold' : 'text-[#FF8733] font-bold'
                        }
                      >
                        {ev.amountKK > 0
                          ? `+${ev.amountKK.toLocaleString('id-ID')}`
                          : ev.amountKK.toLocaleString('id-ID')}{' '}
                        KK
                      </span>
                    )}
                  </div>
                  <div className="text-[#F4F1EA]/90 leading-snug">{ev.description}</div>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </main>

      {/* V2 Research Edition Attribution Footer */}
      <footer className="bg-[#171820] border-t border-white/10 px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs text-[#A6A9B7]">
        <span className="font-mono font-semibold text-[#F4F1EA]">{V2_FOOTER}</span>
        <span className="text-[11px] text-[#A6A9B7]">
          Research Edition · 130 Tiles · 118 Elements · 3D Orbitals, Isotopes &amp; Compounds Lab
        </span>
      </footer>

      {isSetupOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[#09090D]/85 p-4">
          <div className="bg-[#171820] border border-white/15 rounded-2xl shadow-2xl max-w-lg w-full p-5 flex flex-col gap-4 max-h-[90vh] overflow-y-auto">
            <h2 className="font-display text-lg font-bold text-[#F4F1EA] flex items-center gap-2">
              <FlaskConical className="w-5 h-5 text-[#286BFF]" /> New Game Setup &amp; Save Backup
            </h2>

            <div>
              <label className="text-xs font-bold text-[#A6A9B7] block mb-1.5">
                Number of Teams (2–4):
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[2, 3, 4].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setNumTeams(n)}
                    className={`py-2 rounded-xl text-xs font-bold border cursor-pointer ${
                      numTeams === n
                        ? 'bg-[#7029FF] border-[#7029FF] text-white'
                        : 'bg-[#20222D] border-white/10 text-[#A6A9B7] hover:text-white'
                    }`}
                  >
                    {n} Teams
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-[#A6A9B7] block">
                Team Names, Tokens &amp; Optional Partner (Max 2 Members/Team):
              </label>
              {Array.from({ length: numTeams }).map((_, idx) => (
                <div key={idx} className="grid grid-cols-12 items-center gap-2">
                  <span className="col-span-1 text-lg text-center">
                    {['⚗️', '⚛️', '🔬', '🥽'][idx]}
                  </span>
                  <input
                    type="text"
                    value={teamNames[idx] || `Team ${idx + 1}`}
                    onChange={(e) => {
                      const next = [...teamNames];
                      next[idx] = e.target.value;
                      setTeamNames(next);
                    }}
                    placeholder={`Team ${idx + 1}`}
                    className="col-span-6 px-3 py-2 rounded-xl bg-[#09090D] border border-white/15 text-xs text-[#F4F1EA]"
                  />
                  <input
                    type="text"
                    value={teamMember2[idx] || ''}
                    onChange={(e) => {
                      const next = [...teamMember2];
                      next[idx] = e.target.value;
                      setTeamMember2(next);
                    }}
                    placeholder="Partner (optional)"
                    className="col-span-5 px-3 py-2 rounded-xl bg-[#09090D] border border-white/15 text-xs text-[#A6A9B7]"
                  />
                </div>
              ))}
            </div>

            <div>
              <label className="text-xs font-bold text-[#A6A9B7] block mb-1.5">
                START Income Rule (§11.3):
              </label>
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <button
                  type="button"
                  onClick={() => setSalaryMode('classic')}
                  className={`p-2.5 rounded-xl border text-left cursor-pointer ${
                    salaryMode === 'classic'
                      ? 'bg-[#286BFF]/25 border-[#286BFF] text-white'
                      : 'bg-[#20222D] border-white/10 text-[#A6A9B7]'
                  }`}
                >
                  <div className="font-bold">Company Income Only (Approved)</div>
                  <div className="text-[10px] opacity-80">0 KK salary · 120%–200% small cost</div>
                </button>
                <button
                  type="button"
                  onClick={() => setSalaryMode('balanced')}
                  className={`p-2.5 rounded-xl border text-left cursor-pointer ${
                    salaryMode === 'balanced'
                      ? 'bg-[#FF8733]/20 border-[#FF8733] text-white'
                      : 'bg-[#20222D] border-white/10 text-[#A6A9B7]'
                  }`}
                >
                  <div className="font-bold">DRAFT Balanced Salary</div>
                  <div className="text-[10px] opacity-80">+1,200 KK salary + companies</div>
                </button>
              </div>
            </div>

            <div className="bg-[#20222D] border border-white/10 rounded-xl p-3 space-y-2 text-xs">
              <div className="font-bold text-[#A6A9B7] text-[11px]">
                Local Save Backup (Export / Import JSON):
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleExportSaveJson}
                  className="flex-1 py-2 rounded-lg bg-[#09090D] border border-white/15 text-[#F4F1EA] font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-[#32C48D]" /> Export Save
                </button>
                <label className="flex-1 py-2 rounded-lg bg-[#09090D] border border-white/15 text-[#F4F1EA] font-bold flex items-center justify-center gap-1.5 cursor-pointer">
                  <Upload className="w-3.5 h-3.5 text-[#286BFF]" /> Import Save
                  <input
                    type="file"
                    accept="application/json"
                    onChange={handleImportSaveJson}
                    className="hidden"
                  />
                </label>
              </div>
              {importError && <div className="text-[#FCA5A5] text-[11px]">{importError}</div>}
            </div>

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => setIsSetupOpen(false)}
                className="flex-1 py-2.5 rounded-xl bg-[#20222D] text-[#A6A9B7] hover:text-white text-xs font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleStartCustomGame}
                className="flex-1 py-2.5 rounded-xl bg-[#32C48D] hover:bg-[#24A977] text-[#09090D] text-xs font-extrabold cursor-pointer"
              >
                Start Fresh Match
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Online Multiplayer Sync Modal */}
      {isOnlineOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#09090D]/85 p-4">
          <div className="bg-[#171820] border border-white/15 rounded-2xl shadow-2xl max-w-md w-full p-5 flex flex-col gap-3">
            <h2 className="font-display text-base font-bold text-[#F4F1EA] flex items-center gap-2">
              <Globe className="w-4 h-4 text-[#286BFF]" /> Online Multiplayer Sync
            </h2>
            {!firebaseStatus.configured ? (
              <div className="bg-[#382F10]/60 border border-[#F5B942]/50 rounded-xl p-3 text-xs space-y-2 text-[#FEF08A]">
                <div className="font-bold flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4 shrink-0" />
                  <span>Firebase Configuration Required</span>
                </div>
                <p className="text-[11px] leading-relaxed text-[#FDE68A]/90">
                  Provide Firebase credentials in <span className="font-mono">firebase-applet-config.json</span> or via{' '}
                  <span className="font-mono">VITE_FIREBASE_*</span> environment variables. Local gameplay, 3D Research Lab,
                  AI cards, and Admin Console work offline without Firebase.
                </p>
                <div className="bg-[#09090D] border border-white/10 rounded-lg p-2 font-mono text-[10px] text-[#A6A9B7] space-y-0.5">
                  <div>Set in .env or .env.local:</div>
                  {firebaseStatus.missingKeys.map((key) => (
                    <div key={key} className="text-[#FF8733]">
                      {key}=&quot;...&quot;
                    </div>
                  ))}
                  <div className="text-[#93C5FD]">VITE_FIREBASE_DATABASE_ID=&quot;(optional)&quot;</div>
                </div>
              </div>
            ) : (
              <p className="text-xs text-[#A6A9B7]">
                Host an online multiplayer room (<span className="font-mono text-[#286BFF]">v2_</span> namespace,
                project <span className="font-mono">{firebaseStatus.projectId}</span>) or join an active room code.
              </p>
            )}
            <input
              type="text"
              value={roomInput}
              onChange={(e) => setRoomInput(e.target.value.toUpperCase())}
              disabled={!firebaseStatus.configured}
              placeholder="Room Code (e.g. CHEM01 or blank for new)"
              className="px-3 py-2 rounded-xl bg-[#09090D] border border-white/15 disabled:opacity-45 text-xs font-mono text-white"
            />
            {onlineStatus && <div className="text-[11px] text-[#93C5FD]">{onlineStatus}</div>}
            <div className="flex gap-2">
              <button
                type="button"
                disabled={!firebaseStatus.configured}
                onClick={() => handleCreateOrJoinOnline(true)}
                className="flex-1 py-2 rounded-xl bg-[#7029FF] disabled:opacity-40 text-white text-xs font-bold cursor-pointer"
              >
                Host Room
              </button>
              <button
                type="button"
                disabled={!firebaseStatus.configured}
                onClick={() => handleCreateOrJoinOnline(false)}
                className="flex-1 py-2 rounded-xl bg-[#286BFF] disabled:opacity-40 text-white text-xs font-bold cursor-pointer"
              >
                Join Room
              </button>
            </div>
            <button
              type="button"
              onClick={() => setIsOnlineOpen(false)}
              className="w-full py-2 rounded-xl bg-[#20222D] text-[#A6A9B7] text-xs font-bold cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {selectedTile && (
        <TileDetailModal
          tile={selectedTile}
          activeTeam={activeTeam}
          teams={gameState.teams}
          economyConfig={gameState.economyConfig}
          ownership={gameState.properties[selectedTile.tileId]}
          mainOwnership={
            selectedTile.mainPropertyId ? gameState.mainProperties[selectedTile.mainPropertyId] : undefined
          }
          ownerTeam={
            gameState.properties[selectedTile.tileId]
              ? gameState.teams.find((t) => t.id === gameState.properties[selectedTile.tileId].ownerTeamId)
              : null
          }
          onClose={() => setSelectedTile(null)}
          onBuyElement={handleBuyElement}
          onBuyMainProperty={handleBuyMainProperty}
          onBuildCompany={handleBuildCompany}
          onSellCompanies={handleSellCompanies}
          onStartAuction={handleStartAuction}
        />
      )}

      {hasPendingQuiz && (
        <QuizModal
          quiz={gameState.activeQuiz}
          quizDeadline={gameState.quizDeadline}
          isLoading={aiLoading}
          errorMessage={aiError}
          rewardKK={gameState.economyConfig.educationalRewards.quizRewardKK}
          isMinimized={isEducationModalMinimized}
          onMinimize={() => setIsEducationModalMinimized(true)}
          onRestoreOnTimeout={() => setIsEducationModalMinimized(false)}
          onRetryGenerate={handleRetryEducationCard}
          onCancelNoPenalty={handleCancelEducationNoPenalty}
          onQuizResolved={handleQuizResolved}
        />
      )}

      {hasPendingStudyCase && (
        <StudyCaseModal
          studyCase={gameState.activeStudyCase}
          isLoading={aiLoading}
          errorMessage={aiError}
          rewardKK={gameState.economyConfig.educationalRewards.studyCaseRewardKK}
          activeTeam={activeTeam}
          otherTeams={gameState.teams.filter((t) => t.id !== activeTeam.id && !t.isBankrupt)}
          isMinimized={isEducationModalMinimized}
          onMinimize={() => setIsEducationModalMinimized(true)}
          onRetryGenerate={handleRetryEducationCard}
          onCancelNoPenalty={handleCancelEducationNoPenalty}
          onComplete={handleStudyCaseComplete}
        />
      )}

      {gameState.activeAuction && (
        <AuctionModal
          auction={gameState.activeAuction}
          element={ELEMENTS_BY_ID[gameState.activeAuction.atomicNumber!]}
          teams={gameState.teams}
          onPlaceBid={handlePlaceBid}
          onFinishAuction={handleFinishAuction}
          onRejectAuction={handleRejectAuction}
        />
      )}

      {isAISettingsOpen && <AISettingsModal onClose={() => setIsAISettingsOpen(false)} />}

      {isAdminOpen && (
        <AdminConsoleModal
          gameState={gameState}
          onApplyState={(next) => {
            if (hopSafetyTimerRef.current !== null) {
              window.clearTimeout(hopSafetyTimerRef.current);
              hopSafetyTimerRef.current = null;
            }
            const prev = latestStateRef.current;
            setHopQueue([]);
            setIsHopping(false);
            resolvedMoveVersionRef.current = null;
            latestStateRef.current = next;
            setGameState(next);

            const enteredQuizOrCase =
              (next.phase === 'QUIZ_ACTIVE' || next.phase === 'STUDY_CASE_ACTIVE') &&
              (next.activeDrawEventId !== prev?.activeDrawEventId || next.phase !== prev?.phase);

            if (enteredQuizOrCase) {
              setAiError(null);
              setAiLoading(false);
              fetchingDrawIdRef.current = null;
              setIsEducationModalMinimized(false);
              setSelectedTile(null);
              setIsAdminOpen(false);
              soundManager.play('alert');
              setStatusMessage(
                `${next.teams[next.activeTeamIndex]?.name || 'Pemain'} dipindahkan ke petak ${
                  next.phase === 'QUIZ_ACTIVE' ? 'Kuis' : 'Studi Kasus'
                } oleh Admin!`
              );
            } else if (
              next.events[0]?.id !== prev?.events[0]?.id &&
              (next.events[0]?.type === 'CUSTOMS_SENT_TO_JAIL' ||
                next.events[0]?.type === 'ADMIN_SENT_TO_JAIL')
            ) {
              soundManager.play('alert');
              setStatusMessage(next.events[0].description);
            }
          }}
          onClose={() => setIsAdminOpen(false)}
        />
      )}

      {gameState.phase === 'GAME_OVER' && Boolean(gameState.winnerTeamId) && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-[#09090D]/90 p-4">
          <div className="bg-[#171820] border border-[#FF8733] rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-[#FF8733]/20 border border-[#FF8733] flex items-center justify-center mx-auto">
                <Trophy className="w-6 h-6 text-[#FF8733]" />
              </div>
              <h2 className="font-display text-2xl font-bold text-[#FF8733]">Match Complete!</h2>
              <p className="text-sm text-[#F4F1EA]">
                Champion:{' '}
                <strong>
                  {gameState.teams.find((t) => t.id === gameState.winnerTeamId)?.name || 'Winner'}
                </strong>
              </p>
            </div>

            <div className="space-y-1.5 text-xs tabular-nums">
              {[...gameState.teams]
                .sort((a, b) => (teamStats[b.id]?.netWorth ?? 0) - (teamStats[a.id]?.netWorth ?? 0))
                .map((t, i) => (
                  <div
                    key={t.id}
                    className="p-2.5 rounded-xl bg-[#20222D] border border-white/10 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-[#A6A9B7]">#{i + 1}</span>
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: t.color }} />
                      <span className="font-bold text-[#F4F1EA]">{t.name}</span>
                    </div>
                    <div className="text-right font-mono">
                      <div className="text-[#32C48D] font-bold">
                        {(teamStats[t.id]?.netWorth ?? t.balanceKK).toLocaleString('id-ID')} KK
                      </div>
                      <div className="text-[10px] text-[#A6A9B7]">
                        {teamStats[t.id]?.deeds ?? 0} deeds
                      </div>
                    </div>
                  </div>
                ))}
            </div>

            <button
              type="button"
              disabled={isResettingMatch}
              onClick={handlePlayNewMatch}
              className="w-full py-2.5 rounded-xl bg-[#7029FF] hover:bg-[#5E1FE0] disabled:opacity-60 text-white text-xs font-bold cursor-pointer flex items-center justify-center gap-2"
            >
              {isResettingMatch ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Starting New Match...
                </>
              ) : (
                'Play New Match'
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
