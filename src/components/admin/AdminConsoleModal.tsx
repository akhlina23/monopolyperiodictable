import React, { useEffect, useState } from 'react';
import {
  CURRENT_ECONOMY_SCHEMA_VERSION,
  DEFAULT_ECONOMY_CONFIG,
  EconomyConfig,
  GameState,
  PieceType,
} from '../../types/game';
import {
  BOARD_TILES,
  ELEMENTS_BY_ID,
} from '../../engine/gameEngine';
import {
  adminAddTeam,
  adminForceWinner,
  adminRemoveTeam,
  adminSetActiveTurn,
  adminSetCompanyLevel,
  adminSetPropertyOwner,
  adminUpdateEconomy,
  adminUpdateTeam,
  resetMatchState,
  resolveTileLanding,
  sendPlayerToJail,
} from '../../engine/gameActions';
import { safeFetchJson } from '../../utils/apiClient';
import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  Coins,
  Database,
  FileCheck2,
  History,
  KeyRound,
  LogOut,
  RefreshCw,
  Shield,
  Sliders,
  Trash2,
  Trophy,
  Users,
  X,
} from 'lucide-react';

interface AdminConsoleModalProps {
  gameState: GameState;
  onApplyState: (next: GameState) => void;
  onClose: () => void;
}

type AdminTab = 'teams' | 'properties' | 'economy' | 'ai_db' | 'audit';

interface AdminAuditEntry {
  id: string;
  timestamp: number;
  action: string;
  target: string;
  previousValue: string;
  newValue: string;
  reason: string;
  gameId: string;
  actorSessionId: string;
}

export const AdminConsoleModal: React.FC<AdminConsoleModalProps> = ({
  gameState,
  onApplyState,
  onClose,
}) => {
  const [authChecked, setAuthChecked] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [adminConfigured, setAdminConfigured] = useState(true);
  const [passwordInput, setPasswordInput] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [loggingIn, setLoggingIn] = useState(false);

  const [activeTab, setActiveTab] = useState<AdminTab>('teams');
  const [auditLogs, setAuditLogs] = useState<AdminAuditEntry[]>([]);
  const [eduRecords, setEduRecords] = useState<{ quizzes: any[]; studyCases: any[] }>({
    quizzes: [],
    studyCases: [],
  });
  const [eduSearch, setEduSearch] = useState('');
  const [selectedPropTileId, setSelectedPropTileId] = useState<string>(
    BOARD_TILES.find((t) => t.tileType === 'element')?.tileId || 'element-H'
  );
  const [moneyReason, setMoneyReason] = useState('Koreksi pencatatan admin');
  const [confirmResetOpen, setConfirmResetOpen] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  const recordAudit = async (
    action: string,
    target: string,
    previousValue: string,
    newValue: string,
    reason = 'Admin adjustment'
  ) => {
    try {
      const result = await safeFetchJson<{ entry?: any }>('/api/admin/audit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'PTM-Admin',
        },
        body: JSON.stringify({
          action,
          target,
          previousValue,
          newValue,
          reason,
          gameId: gameState.gameId,
        }),
      });
      if (result.ok && result.data?.entry) {
        setAuditLogs((prev) => [result.data!.entry, ...prev]);
      }
    } catch {
      // ignore audit fetch failure in offline unit checks
    }
  };

  const loadProtectedData = async () => {
    try {
      const [auditRes, eduRes] = await Promise.all([
        safeFetchJson<{ logs?: any[] }>('/api/admin/audit'),
        safeFetchJson<{ quizzes?: any[]; studyCases?: any[] }>('/api/admin/educational'),
      ]);
      if (auditRes.ok && auditRes.data) {
        setAuditLogs(auditRes.data.logs || []);
      }
      if (eduRes.ok && eduRes.data) {
        setEduRecords({
          quizzes: eduRes.data.quizzes || [],
          studyCases: eduRes.data.studyCases || [],
        });
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    safeFetchJson<{ authenticated?: boolean; adminConfigured?: boolean }>('/api/admin/status')
      .then((res) => {
        if (!res.ok || !res.data) {
          setAuthChecked(true);
          return;
        }
        setAuthenticated(!!res.data.authenticated);
        setAdminConfigured(res.data.adminConfigured !== false);
        setAuthChecked(true);
        if (res.data.authenticated) {
          loadProtectedData();
        }
      })
      .catch(() => {
        setAuthChecked(true);
      });
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setLoggingIn(true);
    try {
      const result = await safeFetchJson<{ authenticated?: boolean; error?: string }>(
        '/api/admin/login',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ password: passwordInput, gameId: gameState.gameId }),
        }
      );
      if (!result.ok) {
        setAuthError(result.error || 'Autentikasi gagal.');
        return;
      }
      setPasswordInput('');
      setAuthenticated(true);
      await loadProtectedData();
    } catch {
      setAuthError('Gagal menghubungi server autentikasi.');
    } finally {
      setLoggingIn(false);
    }
  };

  /**
   * CRITICAL (§14.3): Log Out Admin ends admin session and closes controls
   * WITHOUT altering, pausing, resetting, or restarting the active game!
   */
  const handleLogoutAdmin = async () => {
    try {
      await safeFetchJson('/api/admin/logout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameId: gameState.gameId }),
      });
    } catch {
      // ignore
    }
    setAuthenticated(false);
    onClose();
  };

  const applyWithAudit = (
    next: GameState,
    action: string,
    target: string,
    prevVal: string,
    newVal: string,
    reason = moneyReason
  ) => {
    onApplyState(next);
    recordAudit(action, target, prevVal, newVal, reason);
    setFeedbackMsg(`${action} berhasil diterapkan.`);
  };

  // ==================== ADMIN LOGIN GATE ====================
  if (!authChecked || !authenticated) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#09090D]/85 p-4">
        <div className="bg-[#171820] border border-[#343946] rounded-2xl shadow-2xl max-w-sm w-full p-5 flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-[#FF8733]" />
              <h2 className="font-display text-base font-bold text-[#F4F1EA]">Admin Login</h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg bg-[#20222D] text-[#A6A9B7] hover:text-white cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {!adminConfigured && (
            <div className="p-3 rounded-xl bg-[#382F10] border border-[#F5B942]/50 text-[11px] text-[#FEF08A]">
              Environment variable <code>ADMIN_PASSWORD</code> belum diatur di Secrets server. Atur terlebih
              dahulu sebelum masuk Admin Console.
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-3 text-xs">
            <div>
              <label htmlFor="admin-pw-input" className="block font-bold text-[#A6A9B7] mb-1.5">
                Server Admin Password
              </label>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-[#A6A9B7] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  id="admin-pw-input"
                  type="password"
                  autoFocus
                  required
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  placeholder="Masukkan kata sandi admin..."
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-[#09090D] border border-white/15 text-[#F4F1EA] focus:outline-none focus:border-[#7029FF]"
                />
              </div>
            </div>

            {authError && (
              <div className="p-2.5 rounded-lg bg-[#3B161B] border border-[#F45B69]/60 text-[11px] text-[#FCA5A5]">
                {authError}
              </div>
            )}

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 rounded-xl bg-[#20222D] text-[#A6A9B7] hover:text-white font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loggingIn || !passwordInput}
                className="flex-1 py-2.5 rounded-xl bg-[#7029FF] hover:bg-[#5E1FE0] disabled:opacity-45 text-white font-bold cursor-pointer"
              >
                {loggingIn ? 'Verifying...' : 'Unlock Console'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  const elementTiles = BOARD_TILES.filter((t) => t.tileType === 'element');
  const selectedPropTile = BOARD_TILES.find((t) => t.tileId === selectedPropTileId) || elementTiles[0];
  const selectedPropOwnership = gameState.properties[selectedPropTile.tileId];
  const selectedEl = selectedPropTile.atomicNumber
    ? ELEMENTS_BY_ID[selectedPropTile.atomicNumber]
    : null;

  const filteredQuizzes = eduRecords.quizzes.filter(
    (q) =>
      !eduSearch ||
      q.question?.toLowerCase().includes(eduSearch.toLowerCase()) ||
      q.topic?.toLowerCase().includes(eduSearch.toLowerCase()) ||
      String(q.provider || '').toLowerCase().includes(eduSearch.toLowerCase())
  );

  const filteredCases = eduRecords.studyCases.filter(
    (c) =>
      !eduSearch ||
      c.title?.toLowerCase().includes(eduSearch.toLowerCase()) ||
      c.context?.toLowerCase().includes(eduSearch.toLowerCase()) ||
      String(c.provider || '').toLowerCase().includes(eduSearch.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#09090D]/88 p-3 sm:p-5">
      <div className="bg-[#171820] border border-[#7029FF]/60 rounded-2xl shadow-2xl max-w-5xl w-full h-[88vh] flex flex-col overflow-hidden">
        {/* Console Header with Prominent Non-Destructive Log Out Admin */}
        <div className="bg-[#20222D] border-b border-white/10 px-5 py-3.5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#7029FF] flex items-center justify-center">
              <Shield className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="font-display text-base font-bold text-[#F4F1EA]">
                Admin Console · Game ID {gameState.gameId}
              </h2>
              <p className="text-[11px] text-[#A6A9B7]">
                Sesi terlindungi cookie HttpOnly. Perubahan tercatat di Audit Log terpisah.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {feedbackMsg && (
              <span className="text-[11px] font-mono text-[#32C48D] bg-[#14291D] border border-[#32C48D]/40 px-2.5 py-1 rounded-lg">
                {feedbackMsg}
              </span>
            )}
            <button
              type="button"
              onClick={handleLogoutAdmin}
              className="px-3.5 py-2 rounded-xl bg-[#FF8733] hover:bg-[#E67222] text-[#09090D] font-extrabold text-xs flex items-center gap-1.5 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Log Out Admin</span>
            </button>
            <button
              type="button"
              aria-label="Close console window"
              onClick={onClose}
              className="p-2 rounded-lg bg-[#09090D] text-[#A6A9B7] hover:text-white cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Console Tab Strip */}
        <div className="bg-[#09090D] border-b border-white/10 px-4 py-2 flex flex-wrap gap-1.5 text-xs font-bold">
          {[
            { id: 'teams', label: 'Teams, Turns & Money', icon: Users },
            { id: 'properties', label: 'Properties & Companies', icon: Building2 },
            { id: 'economy', label: 'Economy & Winner', icon: Sliders },
            { id: 'ai_db', label: 'AI Quizzes & Cases', icon: Database },
            { id: 'audit', label: 'Audit Log & Reset', icon: History },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as AdminTab)}
                className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 cursor-pointer transition-colors ${
                  activeTab === tab.id
                    ? 'bg-[#286BFF] text-white'
                    : 'bg-[#171820] text-[#A6A9B7] hover:text-white'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Console Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
          {/* TAB 1: TEAMS, POSITIONS, TURNS, MONEY, JAIL, FAILURES */}
          {activeTab === 'teams' && (
            <div className="space-y-4">
              <div className="bg-[#20222D] border border-white/10 rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-[#A6A9B7]">Active Turn:</span>
                  {gameState.teams.map((t, idx) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() =>
                        applyWithAudit(
                          adminSetActiveTurn(gameState, idx, 'TURN_START'),
                          'SET_ACTIVE_TURN',
                          t.name,
                          gameState.teams[gameState.activeTeamIndex]?.name || '-',
                          t.name
                        )
                      }
                      className={`px-2.5 py-1 rounded-lg border font-bold cursor-pointer ${
                        gameState.activeTeamIndex === idx
                          ? 'bg-[#7029FF] border-[#7029FF] text-white'
                          : 'bg-[#09090D] border-white/15 text-[#A6A9B7] hover:text-white'
                      }`}
                    >
                      #{idx + 1} {t.name}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={moneyReason}
                    onChange={(e) => setMoneyReason(e.target.value)}
                    placeholder="Reason for money/state edit"
                    className="px-2.5 py-1.5 rounded-lg bg-[#09090D] border border-white/15 text-[11px] text-[#F4F1EA]"
                  />
                  {gameState.teams.length < 4 && (
                    <button
                      type="button"
                      onClick={() =>
                        applyWithAudit(
                          adminAddTeam(gameState, `Tim ${gameState.teams.length + 1}`),
                          'ADD_TEAM',
                          'teams',
                          String(gameState.teams.length),
                          String(gameState.teams.length + 1)
                        )
                      }
                      className="px-3 py-1.5 rounded-lg bg-[#32C48D] text-[#09090D] font-bold cursor-pointer"
                    >
                      + Add Team
                    </button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 tabular-nums">
                {gameState.teams.map((t) => (
                  <div
                    key={t.id}
                    className="bg-[#20222D] border border-white/10 rounded-xl p-4 space-y-3"
                  >
                    <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-2">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: t.color }} />
                        <input
                          type="text"
                          value={t.name}
                          onChange={(e) =>
                            onApplyState(adminUpdateTeam(gameState, t.id, { name: e.target.value }))
                          }
                          className="bg-[#09090D] border border-white/15 rounded px-2 py-1 text-xs font-bold text-[#F4F1EA] flex-1 min-w-0"
                        />
                        <select
                          value={t.pieceType}
                          onChange={(e) =>
                            applyWithAudit(
                              adminUpdateTeam(gameState, t.id, { pieceType: e.target.value as PieceType }),
                              'CHANGE_TOKEN',
                              t.name,
                              t.pieceType,
                              e.target.value
                            )
                          }
                          className="bg-[#09090D] border border-white/15 rounded px-1.5 py-1 text-[11px] text-[#F4F1EA]"
                        >
                          <option value="flask">Flask</option>
                          <option value="atom">Atom</option>
                          <option value="microscope">Microscope</option>
                          <option value="goggles">Goggles</option>
                        </select>
                      </div>
                      {gameState.teams.length > 2 && (
                        <button
                          type="button"
                          onClick={() =>
                            applyWithAudit(
                              adminRemoveTeam(gameState, t.id),
                              'REMOVE_TEAM',
                              t.name,
                              'present',
                              'removed'
                            )
                          }
                          className="p-1.5 rounded bg-[#3B161B] text-[#FCA5A5] cursor-pointer"
                          title="Remove team"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    {/* Money Controls */}
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[#A6A9B7] flex items-center gap-1">
                        <Coins className="w-3.5 h-3.5 text-[#32C48D]" /> Balance:
                      </span>
                      <input
                        type="number"
                        value={t.balanceKK}
                        onChange={(e) =>
                          applyWithAudit(
                            adminUpdateTeam(gameState, t.id, { balanceKK: Number(e.target.value) }),
                            'SET_BALANCE',
                            t.name,
                            String(t.balanceKK),
                            e.target.value
                          )
                        }
                        className="w-28 px-2 py-1 rounded bg-[#09090D] border border-white/15 font-mono font-bold text-[#32C48D]"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          applyWithAudit(
                            adminUpdateTeam(gameState, t.id, { balanceKK: t.balanceKK + 5000 }),
                            'ADD_MONEY',
                            t.name,
                            String(t.balanceKK),
                            String(t.balanceKK + 5000)
                          )
                        }
                        className="px-2 py-1 rounded bg-[#14291D] border border-[#32C48D]/40 text-[#86EFAC] font-mono font-bold cursor-pointer"
                      >
                        +5k
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          applyWithAudit(
                            adminUpdateTeam(gameState, t.id, { balanceKK: t.balanceKK - 5000 }),
                            'DEDUCT_MONEY',
                            t.name,
                            String(t.balanceKK),
                            String(t.balanceKK - 5000)
                          )
                        }
                        className="px-2 py-1 rounded bg-[#3B161B] border border-[#F45B69]/40 text-[#FCA5A5] font-mono font-bold cursor-pointer"
                      >
                        -5k
                      </button>
                    </div>

                    {/* Move Token & Counters */}
                    <div className="grid grid-cols-2 gap-2">
                      <label className="block">
                        <span className="text-[10px] text-[#A6A9B7] block mb-0.5">Move Token (Tile #0..129)</span>
                        <select
                          value={t.position}
                          onChange={(e) => {
                            const targetPath = Number(e.target.value);
                            const landingResult = resolveTileLanding(
                              gameState,
                              t.id,
                              targetPath,
                              'admin'
                            );
                            applyWithAudit(
                              landingResult.state,
                              'MOVE_TOKEN',
                              t.name,
                              `#${t.position}`,
                              `#${landingResult.forcedJailPathIndex ?? targetPath}`
                            );
                          }}
                          className="w-full px-2 py-1 rounded bg-[#09090D] border border-white/15 text-[#F4F1EA] text-[11px]"
                        >
                          {BOARD_TILES.map((bt) => (
                            <option key={bt.tileId} value={bt.pathIndex}>
                              #{bt.pathIndex} — {bt.title}
                            </option>
                          ))}
                        </select>
                      </label>

                      <label className="block">
                        <span className="text-[10px] text-[#A6A9B7] block mb-0.5">Jail Free Cards</span>
                        <input
                          type="number"
                          min={0}
                          value={t.jailCards}
                          onChange={(e) =>
                            applyWithAudit(
                              adminUpdateTeam(gameState, t.id, { jailCards: Math.max(0, Number(e.target.value)) }),
                              'SET_JAIL_CARDS',
                              t.name,
                              String(t.jailCards),
                              e.target.value
                            )
                          }
                          className="w-full px-2 py-1 rounded bg-[#09090D] border border-white/15 font-mono text-[#F4F1EA]"
                        />
                      </label>

                      <label className="block">
                        <span className="text-[10px] text-[#A6A9B7] block mb-0.5">Quiz Fails (max 7)</span>
                        <input
                          type="number"
                          min={0}
                          max={7}
                          value={t.quizFailures}
                          onChange={(e) =>
                            applyWithAudit(
                              adminUpdateTeam(gameState, t.id, { quizFailures: Math.max(0, Number(e.target.value)) }),
                              'SET_QUIZ_FAILS',
                              t.name,
                              String(t.quizFailures),
                              e.target.value
                            )
                          }
                          className="w-full px-2 py-1 rounded bg-[#09090D] border border-white/15 font-mono text-[#F4F1EA]"
                        />
                      </label>

                      <label className="block">
                        <span className="text-[10px] text-[#A6A9B7] block mb-0.5">Case Fails (max 3)</span>
                        <input
                          type="number"
                          min={0}
                          max={3}
                          value={t.studyCaseFailures}
                          onChange={(e) =>
                            applyWithAudit(
                              adminUpdateTeam(gameState, t.id, {
                                studyCaseFailures: Math.max(0, Number(e.target.value)),
                              }),
                              'SET_CASE_FAILS',
                              t.name,
                              String(t.studyCaseFailures),
                              e.target.value
                            )
                          }
                          className="w-full px-2 py-1 rounded bg-[#09090D] border border-white/15 font-mono text-[#F4F1EA]"
                        />
                      </label>
                    </div>

                    {/* Jail & Bankruptcy Toggles */}
                    <div className="flex flex-wrap gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          const nextInJail = !t.isInJail;
                          const nextState = nextInJail
                            ? sendPlayerToJail(gameState, t.id, {
                                eventType: 'ADMIN_SENT_TO_JAIL',
                                description: `${t.name} dikirim ke Penjara oleh Admin.`,
                              })
                            : adminUpdateTeam(gameState, t.id, {
                                isInJail: false,
                                jailTurns: 0,
                                jailStatus: 'released',
                                lastJailEventId: null,
                              });
                          applyWithAudit(
                            nextState,
                            'TOGGLE_JAIL',
                            t.name,
                            `${t.isInJail} (#${t.position})`,
                            nextInJail
                              ? `true (#${nextState.teams.find((tm) => tm.id === t.id)?.position ?? 33})`
                              : `false (#${t.position})`
                          );
                        }}
                        className={`px-2.5 py-1 rounded-lg border text-[11px] font-bold cursor-pointer ${
                          t.isInJail
                            ? 'bg-[#382F10] border-[#F5B942] text-[#FEF08A]'
                            : 'bg-[#09090D] border-white/15 text-[#A6A9B7]'
                        }`}
                      >
                        {t.isInJail ? 'Release from Jail' : 'Send to Jail'}
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          applyWithAudit(
                            adminUpdateTeam(gameState, t.id, {
                              isBankrupt: !t.isBankrupt,
                              bankruptReason: !t.isBankrupt ? 'Declared bankrupt by Admin' : undefined,
                            }),
                            'TOGGLE_BANKRUPT',
                            t.name,
                            String(t.isBankrupt),
                            String(!t.isBankrupt)
                          )
                        }
                        className={`px-2.5 py-1 rounded-lg border text-[11px] font-bold cursor-pointer ${
                          t.isBankrupt
                            ? 'bg-[#14291D] border-[#32C48D] text-[#86EFAC]'
                            : 'bg-[#3B161B] border-[#F45B69]/50 text-[#FCA5A5]'
                        }`}
                      >
                        {t.isBankrupt ? 'Restore from Bankrupt' : 'Set Bankrupt'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 2: PROPERTIES & COMPANIES */}
          {activeTab === 'properties' && (
            <div className="bg-[#20222D] border border-white/10 rounded-xl p-4 space-y-4">
              <div className="flex flex-wrap items-center gap-3">
                <label className="flex-1 min-w-[240px]">
                  <span className="text-[11px] font-bold text-[#A6A9B7] block mb-1">
                    Select Element Tile (118 Properties)
                  </span>
                  <select
                    value={selectedPropTileId}
                    onChange={(e) => setSelectedPropTileId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#09090D] border border-white/15 text-[#F4F1EA]"
                  >
                    {elementTiles.map((et) => {
                      const own = gameState.properties[et.tileId];
                      const ownerName = own
                        ? gameState.teams.find((t) => t.id === own.ownerTeamId)?.name
                        : 'Unowned';
                      return (
                        <option key={et.tileId} value={et.tileId}>
                          #{et.pathIndex} · Z={et.atomicNumber} {et.title} [{ownerName}]
                        </option>
                      );
                    })}
                  </select>
                </label>

                <div className="bg-[#09090D] border border-white/10 rounded-xl px-4 py-2 text-xs">
                  <div className="text-[#A6A9B7]">Base Price</div>
                  <div className="font-mono font-bold text-[#FF8733]">
                    {selectedEl ? `${selectedEl.basePriceKK.toLocaleString('id-ID')} KK` : '-'}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-[#09090D] border border-white/10 rounded-xl p-3.5 space-y-2">
                  <div className="font-bold text-[#F4F1EA]">Assign / Transfer Ownership</div>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() =>
                        applyWithAudit(
                          adminSetPropertyOwner(gameState, selectedPropTile.tileId, null),
                          'UNOWN_PROPERTY',
                          selectedPropTile.tileId,
                          selectedPropOwnership?.ownerTeamId || 'none',
                          'unowned'
                        )
                      }
                      className={`px-2.5 py-1.5 rounded-lg border font-bold cursor-pointer ${
                        !selectedPropOwnership
                          ? 'bg-[#286BFF] border-[#286BFF] text-white'
                          : 'bg-[#171820] border-white/15 text-[#A6A9B7]'
                      }`}
                    >
                      Unowned (Bank)
                    </button>
                    {gameState.teams.map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() =>
                          applyWithAudit(
                            adminSetPropertyOwner(gameState, selectedPropTile.tileId, t.id),
                            'TRANSFER_PROPERTY',
                            selectedPropTile.tileId,
                            selectedPropOwnership?.ownerTeamId || 'unowned',
                            t.name
                          )
                        }
                        className={`px-2.5 py-1.5 rounded-lg border font-bold cursor-pointer ${
                          selectedPropOwnership?.ownerTeamId === t.id
                            ? 'bg-[#7029FF] border-[#7029FF] text-white'
                            : 'bg-[#171820] border-white/15 text-[#A6A9B7]'
                        }`}
                      >
                        {t.name}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="bg-[#09090D] border border-white/10 rounded-xl p-3.5 space-y-2">
                  <div className="font-bold text-[#F4F1EA]">Company Buildings on Tile</div>
                  {!selectedPropOwnership ? (
                    <p className="text-[#A6A9B7] text-[11px]">Assign an owner first to add/edit companies.</p>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {[0, 1, 2, 3, 4].map((cnt) => (
                        <button
                          key={cnt}
                          type="button"
                          onClick={() =>
                            applyWithAudit(
                              adminSetCompanyLevel(gameState, selectedPropTile.tileId, cnt, false),
                              'SET_COMPANIES',
                              selectedPropTile.tileId,
                              `${selectedPropOwnership.smallCompanies}S/${selectedPropOwnership.hasLargeCompany ? 'B' : '0'}`,
                              `${cnt} Small`
                            )
                          }
                          className={`px-2.5 py-1.5 rounded-lg border font-mono font-bold cursor-pointer ${
                            !selectedPropOwnership.hasLargeCompany &&
                            selectedPropOwnership.smallCompanies === cnt
                              ? 'bg-[#FF8733] border-[#FF8733] text-[#09090D]'
                              : 'bg-[#171820] border-white/15 text-[#A6A9B7]'
                          }`}
                        >
                          {cnt === 0 ? 'Clear (0)' : `${cnt} Small`}
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() =>
                          applyWithAudit(
                            adminSetCompanyLevel(gameState, selectedPropTile.tileId, 0, true),
                            'SET_BIG_COMPANY',
                            selectedPropTile.tileId,
                            `${selectedPropOwnership.smallCompanies}S`,
                            '1 Big Company'
                          )
                        }
                        className={`px-3 py-1.5 rounded-lg border font-bold cursor-pointer ${
                          selectedPropOwnership.hasLargeCompany
                            ? 'bg-[#32C48D] border-[#32C48D] text-[#09090D]'
                            : 'bg-[#171820] border-white/15 text-[#A6A9B7]'
                        }`}
                      >
                        Big Company (200%)
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: ECONOMY & WINNER */}
          {activeTab === 'economy' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-[#20222D] border border-white/10 rounded-xl p-4 space-y-3 tabular-nums">
                <h3 className="font-bold text-[#F4F1EA]">Live Economy Configuration (DRAFT & Approved)</h3>
                <div className="grid grid-cols-2 gap-2.5">
                  <label>
                    <span className="text-[10px] text-[#A6A9B7] block">Fixed START Salary (KK) [DRAFT]</span>
                    <input
                      type="number"
                      value={gameState.economyConfig.businessIncome.fixedStartSalary}
                      onChange={(e) =>
                        applyWithAudit(
                          adminUpdateEconomy(gameState, {
                            ...gameState.economyConfig,
                            businessIncome: {
                              ...gameState.economyConfig.businessIncome,
                              fixedStartSalary: Number(e.target.value),
                            },
                          }),
                          'EDIT_ECONOMY',
                          'fixedStartSalary',
                          String(gameState.economyConfig.businessIncome.fixedStartSalary),
                          e.target.value
                        )
                      }
                      className="w-full px-2.5 py-1.5 rounded bg-[#09090D] border border-white/15 font-mono text-[#F4F1EA]"
                    />
                  </label>

                  <label>
                    <span className="text-[10px] text-[#A6A9B7] block">Quiz Reward (KK)</span>
                    <input
                      type="number"
                      value={gameState.economyConfig.educationalRewards.quizRewardKK}
                      onChange={(e) =>
                        applyWithAudit(
                          adminUpdateEconomy(gameState, {
                            ...gameState.economyConfig,
                            educationalRewards: {
                              ...gameState.economyConfig.educationalRewards,
                              quizRewardKK: Number(e.target.value),
                            },
                          }),
                          'EDIT_ECONOMY',
                          'quizRewardKK',
                          String(gameState.economyConfig.educationalRewards.quizRewardKK),
                          e.target.value
                        )
                      }
                      className="w-full px-2.5 py-1.5 rounded bg-[#09090D] border border-white/15 font-mono text-[#F4F1EA]"
                    />
                  </label>

                  <label>
                    <span className="text-[10px] text-[#A6A9B7] block">Study Case Reward (KK)</span>
                    <input
                      type="number"
                      value={gameState.economyConfig.educationalRewards.studyCaseRewardKK}
                      onChange={(e) =>
                        applyWithAudit(
                          adminUpdateEconomy(gameState, {
                            ...gameState.economyConfig,
                            educationalRewards: {
                              ...gameState.economyConfig.educationalRewards,
                              studyCaseRewardKK: Number(e.target.value),
                            },
                          }),
                          'EDIT_ECONOMY',
                          'studyCaseRewardKK',
                          String(gameState.economyConfig.educationalRewards.studyCaseRewardKK),
                          e.target.value
                        )
                      }
                      className="w-full px-2.5 py-1.5 rounded bg-[#09090D] border border-white/15 font-mono text-[#F4F1EA]"
                    />
                  </label>

                  <label>
                    <span className="text-[10px] text-[#A6A9B7] block">Jail Release Bail (KK)</span>
                    <input
                      type="number"
                      value={gameState.economyConfig.educationalRewards.jailBailKK}
                      onChange={(e) =>
                        applyWithAudit(
                          adminUpdateEconomy(gameState, {
                            ...gameState.economyConfig,
                            schemaVersion: CURRENT_ECONOMY_SCHEMA_VERSION,
                            educationalRewards: {
                              ...gameState.economyConfig.educationalRewards,
                              jailBailKK: Number(e.target.value),
                              jailBailAdminOverride: true,
                            },
                          }),
                          'EDIT_ECONOMY',
                          'jailBailKK',
                          String(gameState.economyConfig.educationalRewards.jailBailKK),
                          e.target.value
                        )
                      }
                      className="w-full px-2.5 py-1.5 rounded bg-[#09090D] border border-white/15 font-mono text-[#F4F1EA]"
                    />
                  </label>
                </div>

                <label className="flex items-center justify-between pt-2 border-t border-white/10 cursor-pointer">
                  <span className="text-[11px] text-[#A6A9B7]">
                    Skip Next START Business Income on Quiz Fail [DRAFT]
                  </span>
                  <input
                    type="checkbox"
                    checked={gameState.economyConfig.educationalRewards.skipNextIncomeOnQuizFail}
                    onChange={(e) =>
                      applyWithAudit(
                        adminUpdateEconomy(gameState, {
                          ...gameState.economyConfig,
                          educationalRewards: {
                            ...gameState.economyConfig.educationalRewards,
                            skipNextIncomeOnQuizFail: e.target.checked,
                          },
                        }),
                        'EDIT_ECONOMY',
                        'skipNextIncomeOnQuizFail',
                        String(gameState.economyConfig.educationalRewards.skipNextIncomeOnQuizFail),
                        String(e.target.checked)
                      )
                    }
                    className="accent-[#7029FF] w-4 h-4"
                  />
                </label>
              </div>

              <div className="bg-[#20222D] border border-white/10 rounded-xl p-4 space-y-3">
                <h3 className="font-bold text-[#F4F1EA] flex items-center gap-1.5">
                  <Trophy className="w-4 h-4 text-[#FF8733]" /> Game Winner & Phase Override
                </h3>
                <div className="flex flex-wrap gap-2">
                  {gameState.teams.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() =>
                        applyWithAudit(
                          adminForceWinner(gameState, t.id),
                          'FORCE_WINNER',
                          t.name,
                          gameState.winnerTeamId || 'none',
                          t.id
                        )
                      }
                      className="px-3 py-2 rounded-xl bg-[#FF8733] hover:bg-[#E67222] text-[#09090D] font-extrabold cursor-pointer"
                    >
                      Set Winner: {t.name}
                    </button>
                  ))}
                  {gameState.phase === 'GAME_OVER' && (
                    <button
                      type="button"
                      onClick={() =>
                        applyWithAudit(
                          adminForceWinner(gameState, null),
                          'RESUME_GAME',
                          'phase',
                          'GAME_OVER',
                          'TURN_START'
                        )
                      }
                      className="px-3 py-2 rounded-xl bg-[#32C48D] text-[#09090D] font-extrabold cursor-pointer"
                    >
                      Resume Match
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: AI QUIZ & STUDY CASE DATABASE (UNREDACTED KEYS & RUBRICS) */}
          {activeTab === 'ai_db' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <input
                  type="text"
                  value={eduSearch}
                  onChange={(e) => setEduSearch(e.target.value)}
                  placeholder="Cari soal, topik, studi kasus, atau provider..."
                  className="flex-1 px-3 py-2 rounded-xl bg-[#09090D] border border-white/15 text-[#F4F1EA]"
                />
                <button
                  type="button"
                  onClick={loadProtectedData}
                  className="px-3 py-2 rounded-xl bg-[#20222D] border border-white/15 text-[#F4F1EA] font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Refresh DB
                </button>
              </div>

              <div className="space-y-2">
                <h3 className="font-mono text-[11px] uppercase text-[#FF8733] font-bold">
                  Generated Quizzes ({filteredQuizzes.length})
                </h3>
                {filteredQuizzes.length === 0 && (
                  <p className="text-[#A6A9B7]">Belum ada kartu kuis AI yang dibuat di sesi server.</p>
                )}
                {filteredQuizzes.map((q) => (
                  <div key={q.id} className="bg-[#20222D] border border-white/10 rounded-xl p-3.5 space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-mono text-[10px] text-[#93C5FD]">
                        {q.id} · {q.provider}/{q.model} · fp:{q.fingerprint}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={async () => {
                            await safeFetchJson(`/api/admin/educational/quiz/${q.id}`, {
                              method: 'PATCH',
                              headers: {
                                'Content-Type': 'application/json',
                                'X-Requested-With': 'PTM-Admin',
                              },
                              body: JSON.stringify({ verified: !q.verified }),
                            });
                            loadProtectedData();
                          }}
                          className={`px-2 py-1 rounded text-[10px] font-bold flex items-center gap-1 cursor-pointer ${
                            q.verified
                              ? 'bg-[#14291D] text-[#86EFAC]'
                              : 'bg-[#09090D] text-[#A6A9B7]'
                          }`}
                        >
                          <FileCheck2 className="w-3 h-3" /> {q.verified ? 'Verified' : 'Mark Verified'}
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            await safeFetchJson(`/api/admin/educational/quiz/${q.id}`, {
                              method: 'DELETE',
                              headers: { 'X-Requested-With': 'PTM-Admin' },
                            });
                            loadProtectedData();
                          }}
                          className="px-2 py-1 rounded bg-[#3B161B] text-[#FCA5A5] text-[10px] font-bold cursor-pointer"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                    <div className="font-bold text-[#F4F1EA]">{q.question}</div>
                    <div className="grid grid-cols-2 gap-1 text-[11px]">
                      {q.options?.map((o: any) => (
                        <div
                          key={o.id}
                          className={`p-1.5 rounded ${
                            o.id === q.correctOptionId
                              ? 'bg-[#14291D] border border-[#32C48D] text-[#86EFAC] font-bold'
                              : 'bg-[#09090D] text-[#A6A9B7]'
                          }`}
                        >
                          {o.id}. {o.text}
                        </div>
                      ))}
                    </div>
                    <div className="text-[11px] text-[#32C48D]">
                      <strong>Kunci: {q.correctOptionId}</strong> — {q.explanation}
                    </div>
                  </div>
                ))}
              </div>

              <div className="space-y-2 pt-2 border-t border-white/10">
                <h3 className="font-mono text-[11px] uppercase text-[#7029FF] font-bold">
                  Generated Study Cases ({filteredCases.length})
                </h3>
                {filteredCases.map((c) => (
                  <div key={c.id} className="bg-[#20222D] border border-white/10 rounded-xl p-3.5 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[10px] text-[#D8B4FE]">
                        {c.id} · {c.provider}/{c.model} · fp:{c.fingerprint}
                      </span>
                      <button
                        type="button"
                        onClick={async () => {
                          await safeFetchJson(`/api/admin/educational/study_case/${c.id}`, {
                            method: 'DELETE',
                            headers: { 'X-Requested-With': 'PTM-Admin' },
                          });
                          loadProtectedData();
                        }}
                        className="px-2 py-1 rounded bg-[#3B161B] text-[#FCA5A5] text-[10px] font-bold cursor-pointer"
                      >
                        Delete
                      </button>
                    </div>
                    <div className="font-bold text-[#F4F1EA]">{c.title}</div>
                    <p className="text-[11px] text-[#A6A9B7]">{c.context}</p>
                    <div className="text-[11px] text-[#32C48D]">
                      <strong>Outline Penilai:</strong> {(c.expectedAnswerOutline || []).join(' · ')}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 5: AUDIT LOG & DANGEROUS RESET */}
          {activeTab === 'audit' && (
            <div className="space-y-4">
              <div className="bg-[#3B161B]/60 border border-[#F45B69]/60 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-start gap-2.5">
                  <AlertTriangle className="w-5 h-5 text-[#F45B69] shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold text-[#FCA5A5]">Danger Zone — Reset Current Match</div>
                    <div className="text-[11px] text-[#F4F1EA]/80">
                      Mengatur ulang papan, properti, dan saldo seluruh tim ke awal permainan.
                    </div>
                  </div>
                </div>

                {!confirmResetOpen ? (
                  <button
                    type="button"
                    onClick={() => setConfirmResetOpen(true)}
                    className="px-3.5 py-2 rounded-xl bg-[#F45B69] text-white font-bold cursor-pointer"
                  >
                    Reset Match...
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setConfirmResetOpen(false)}
                      className="px-3 py-2 rounded-xl bg-[#20222D] text-[#F4F1EA] font-bold cursor-pointer"
                    >
                      Batal
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const fresh = resetMatchState(gameState);
                        applyWithAudit(fresh, 'RESET_MATCH', gameState.gameId, 'active', 'reset');
                        setConfirmResetOpen(false);
                      }}
                      className="px-3.5 py-2 rounded-xl bg-[#F45B69] text-white font-extrabold flex items-center gap-1 cursor-pointer"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" /> Ya, Reset Sekarang
                    </button>
                  </div>
                )}
              </div>

              <div className="bg-[#20222D] border border-white/10 rounded-xl p-4 space-y-2">
                <h3 className="font-mono text-[11px] uppercase tracking-wider text-[#A6A9B7] font-bold">
                  Separate Admin Audit Log ({auditLogs.length})
                </h3>
                <div className="space-y-1.5 max-h-72 overflow-y-auto tabular-nums">
                  {auditLogs.map((log) => (
                    <div key={log.id} className="p-2.5 rounded-lg bg-[#09090D] border border-white/10 text-[11px]">
                      <div className="flex justify-between font-mono text-[10px] text-[#A6A9B7]">
                        <span>{log.action} → {log.target}</span>
                        <span>{new Date(log.timestamp).toLocaleTimeString()}</span>
                      </div>
                      <div className="text-[#F4F1EA] mt-0.5">
                        {log.previousValue} ➔ <strong className="text-[#32C48D]">{log.newValue}</strong> ·{' '}
                        <span className="text-[#A6A9B7]">{log.reason}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
