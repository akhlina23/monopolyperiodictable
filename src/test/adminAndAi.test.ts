import { describe, it, expect, beforeEach } from 'vitest';
import {
  applyDiceMove,
  buildCompanyOnProperty,
  buyElementProperty,
  cancelPendingEducationCard,
  createDefaultTeams,
  createInitialGameState,
  adminAddTeam,
  adminForceWinner,
  adminMoveTeam,
  adminRemoveTeam,
  adminSetActiveTurn,
  adminSetCompanyLevel,
  adminSetPropertyOwner,
  adminUpdateTeam,
  sellCompaniesBeforeAuction,
} from '../engine/gameActions';
import { ELEMENTS_BY_ID, TILES_BY_PATH_INDEX, calculateStartIncome } from '../engine/gameEngine';
import {
  ADMIN_SESSION_COOKIE_NAME,
  _resetAdminSecurityStateForTests,
  appendAdminAuditLog,
  checkLoginRateLimit,
  clearFailedLogins,
  constantTimeVerifyPassword,
  createAdminSessionToken,
  getAdminAuditLogs,
  recordFailedLogin,
  requireAdminAuth,
  revokeAdminSession,
  verifyAdminSessionToken,
} from '../../server/adminConsole';
import {
  QuizGeneratedSchema,
  StudyCaseGeneratedSchema,
  computeFingerprint,
  sanitizeQuizForClient,
  sanitizeStudyCaseForClient,
} from '../../server/aiProviders';

describe('V2 Research Edition: START Income 120%–200%, Liquidation & Zero Salary', () => {
  it('pays 0 KK fixed START salary and exact 120% company income when crossing START', () => {
    const oTile = Object.values(TILES_BY_PATH_INDEX).find((t) => t.atomicNumber === 8)!;
    let state = createInitialGameState(createDefaultTeams(2));

    state = {
      ...state,
      teams: state.teams.map((t, i) => (i === 0 ? { ...t, position: oTile.pathIndex } : t)),
      phase: 'ELEMENT_PURCHASE',
    };
    state = buyElementProperty(state, 'team_1', oTile.tileId).state;
    state = buildCompanyOnProperty(state, 'team_1', oTile.tileId).state;

    const incomeSummary = calculateStartIncome('team_1', state);
    expect(incomeSummary.fixedSalaryKK).toBe(0);
    expect(incomeSummary.companyIncomeKK).toBe(1320);
    expect(incomeSummary.totalIncomeKK).toBe(1320);

    const beforeBal = state.teams[0].balanceKK;
    const preCrossState = {
      ...state,
      phase: 'TURN_START' as const,
      teams: state.teams.map((t, i) => (i === 0 ? { ...t, position: 128 } : t)),
    };
    const move = applyDiceMove(preCrossState, 2, 2);
    expect(move.crossedStart).toBe(true);
    expect(move.state.teams[0].balanceKK).toBe(beforeBal + 1320);
  });

  it('liquidates company buildings at 50% refund to make property clean for auction', () => {
    const oTile = Object.values(TILES_BY_PATH_INDEX).find((t) => t.atomicNumber === 8)!;
    let state = createInitialGameState(createDefaultTeams(2));
    state = {
      ...state,
      teams: state.teams.map((t, i) => (i === 0 ? { ...t, position: oTile.pathIndex } : t)),
      phase: 'ELEMENT_PURCHASE',
    };
    state = buyElementProperty(state, 'team_1', oTile.tileId).state;
    state = buildCompanyOnProperty(state, 'team_1', oTile.tileId).state;
    const balBeforeSell = state.teams[0].balanceKK;

    const sold = sellCompaniesBeforeAuction(state, 'team_1', oTile.tileId);
    expect(sold.ok).toBe(true);
    expect(sold.state.properties[oTile.tileId].smallCompanies).toBe(0);
    expect(sold.state.teams[0].balanceKK).toBe(balBeforeSell + 550);
  });
});

describe('V2 Research Edition: Admin Security, Cookie Isolation & Non-Destructive Logout', () => {
  beforeEach(() => {
    _resetAdminSecurityStateForTests();
  });

  it('uses isolated V2 admin cookie name', () => {
    expect(ADMIN_SESSION_COOKIE_NAME).toBe('ptm_v2_admin_session');
  });

  it('verifies passwords in constant time and enforces 5-attempt rate limit', () => {
    expect(constantTimeVerifyPassword('secret-chem-2026', 'secret-chem-2026')).toBe(true);
    expect(constantTimeVerifyPassword('wrong', 'secret-chem-2026')).toBe(false);

    const ip = '10.0.0.42';
    for (let i = 0; i < 5; i++) {
      expect(checkLoginRateLimit(ip).allowed).toBe(true);
      recordFailedLogin(ip);
    }
    const blocked = checkLoginRateLimit(ip);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);

    clearFailedLogins(ip);
    expect(checkLoginRateLimit(ip).allowed).toBe(true);
  });

  it('creates, verifies, revokes session tokens and rejects unauthorized mutation requests', () => {
    const { token, sid } = createAdminSessionToken();
    expect(verifyAdminSessionToken(token)).toEqual({ valid: true, sid });

    let statusCode = 0;
    const mockRes: any = {
      status(code: number) {
        statusCode = code;
        return this;
      },
      json() {
        return this;
      },
    };
    requireAdminAuth({ method: 'POST', headers: {} } as any, mockRes, () => {});
    expect(statusCode).toBe(403);

    statusCode = 0;
    requireAdminAuth(
      { method: 'POST', headers: { 'x-requested-with': 'PTM-Admin' } } as any,
      mockRes,
      () => {}
    );
    expect(statusCode).toBe(401);

    revokeAdminSession(token);
    expect(verifyAdminSessionToken(token).valid).toBe(false);
  });

  it('supports Admin mutations + separate audit logs while preserving active game state', () => {
    let state = createInitialGameState(createDefaultTeams(2));
    const originalGameId = state.gameId;

    state = adminUpdateTeam(state, 'team_1', { balanceKK: 150000 });
    state = adminMoveTeam(state, 'team_1', 33);
    state = adminSetPropertyOwner(state, 'element-O', 'team_1');
    state = adminSetCompanyLevel(state, 'element-O', 3, false);
    state = adminAddTeam(state, 'Tim Neon');
    state = adminSetActiveTurn(state, 2);
    expect(state.teams.length).toBe(3);
    expect(state.teams[0].balanceKK).toBe(150000);
    expect(state.teams[0].position).toBe(33);
    expect(state.properties['element-O'].smallCompanies).toBe(3);

    state = adminRemoveTeam(state, state.teams[2].id);
    expect(state.teams.length).toBe(2);

    state = adminForceWinner(state, 'team_1');
    expect(state.phase).toBe('GAME_OVER');
    expect(state.winnerTeamId).toBe('team_1');

    state = adminForceWinner(state, null);
    expect(state.phase).toBe('TURN_START');
    expect(state.gameId).toBe(originalGameId);

    appendAdminAuditLog({
      action: 'SET_BALANCE',
      target: 'team_1',
      previousValue: '100000',
      newValue: '150000',
      reason: 'Verifikasi unit test V2',
      gameId: originalGameId,
      actorSessionId: 'adm_test',
    });
    expect(getAdminAuditLogs().length).toBe(1);
    expect(state.events.some((e) => e.type === 'SET_BALANCE')).toBe(false);
  });
});

describe('V2 Research Edition: AI Schema Validation, Key Stripping & Missing Unmeasured Data', () => {
  it('validates Quiz and StudyCase schemas and rejects malformed/duplicate options', () => {
    const validQuiz = QuizGeneratedSchema.safeParse({
      topic: 'Ikatan Ion',
      question: 'Mengapa NaCl membentuk kisi kristal ionik yang kuat?',
      options: [
        { id: 'A', text: 'Gaya elektrostatik antara kation Na+ dan anion Cl-' },
        { id: 'B', text: 'Ikatan kovalen nonpolar antar atom logam' },
        { id: 'C', text: 'Gaya dispersi London lemah' },
        { id: 'D', text: 'Ikatan hidrogen antarmolekul' },
      ],
      correctOptionId: 'A',
      explanation: 'Na+ dan Cl- saling tarik dengan gaya Coulomb kuat.',
    });
    expect(validQuiz.success).toBe(true);

    const dupQuiz = QuizGeneratedSchema.safeParse({
      topic: 'Ikatan',
      question: 'Pertanyaan dengan opsi duplikat?',
      options: [
        { id: 'A', text: 'Opsi sama' },
        { id: 'B', text: 'Opsi sama' },
        { id: 'C', text: 'Opsi C' },
        { id: 'D', text: 'Opsi D' },
      ],
      correctOptionId: 'A',
      explanation: 'Penjelasan cukup panjang.',
    });
    expect(dupQuiz.success).toBe(false);

    const validCase = StudyCaseGeneratedSchema.safeParse({
      title: 'Baterai Litium-Ion Ramah Lingkungan',
      context: 'Kendaraan listrik modern mengandalkan katoda berbasis litium dan kobalt/besi fosfat.',
      task: 'Jelaskan mengapa litium cocok sebagai anoda/pembawa muatan densitas energi tinggi.',
      keyConcepts: ['Energi ionisasi', 'Massa molar kecil'],
      expectedAnswerOutline: ['Massa atom kecil (6.94 u) menghasilkan kapasitas spesifik tinggi'],
      judgingRubric: [
        { criterion: 'Konsep Periodik', description: 'Menjelaskan ukuran atom & potensial reduksi', maxPoints: 50 },
        { criterion: 'Aplikasi Industri', description: 'Menjelaskan keamananan & daur ulang', maxPoints: 50 },
      ],
      learningExplanation: 'Litium memiliki potensial reduksi standar sangat negatif dan massa molar ringan.',
    });
    expect(validCase.success).toBe(true);
  });

  it('strips secret answer keys and outlines before sending to active client', () => {
    const pubQuiz = sanitizeQuizForClient({
      id: 'q1',
      drawEventId: 'd1',
      kind: 'quiz',
      topic: 'Gas Mulia',
      difficulty: 'mudah',
      relatedElements: [2],
      question: 'Mengapa Helium stabil?',
      options: [
        { id: 'A', text: 'Konfigurasi 1s2 penuh' },
        { id: 'B', text: 'Elektronegativitas sangat tinggi' },
        { id: 'C', text: 'Jari-jari raksasa' },
        { id: 'D', text: 'Membentuk kation +2' },
      ],
      correctOptionId: 'A',
      explanation: 'Kulit valensi duplet sudah penuh.',
      fingerprint: 'abc',
      provider: 'gemini',
      model: 'gemini-4-hydrogen',
      createdAt: Date.now(),
      verified: false,
      timeLimitSeconds: 30,
    });
    expect((pubQuiz as any).correctOptionId).toBeUndefined();
    expect((pubQuiz as any).explanation).toBeUndefined();

    const pubCase = sanitizeStudyCaseForClient({
      id: 'c1',
      drawEventId: 'd2',
      kind: 'study_case',
      title: 'Katalis Platina',
      context: 'Konverter katalitik menggunakan Pt.',
      task: 'Analisis mekanisme adsorpsi permukaan.',
      difficulty: 'sedang',
      relatedElements: [78],
      keyConcepts: ['Katalis heterogen'],
      expectedAnswerOutline: ['Menurunkan energi aktivasi'],
      judgingRubric: [{ criterion: 'Kimia', description: 'Tepat', maxPoints: 100 }],
      learningExplanation: 'Pt mengadsorpsi CO dan NOx.',
      fingerprint: 'def',
      provider: 'gemini',
      model: 'gemini-4-hydrogen',
      createdAt: Date.now(),
      verified: false,
    });
    expect((pubCase as any).expectedAnswerOutline).toBeUndefined();
    expect((pubCase as any).learningExplanation).toBeUndefined();
  });

  it('computes deterministic deduplication fingerprints, cancels AI draws with zero penalty, and preserves missing synthetic constants', () => {
    const fp1 = computeFingerprint('Apa simbol Oksigen?', [8]);
    const fp2 = computeFingerprint('apa   simbol oksigen', [8]);
    expect(fp1).toBe(fp2);

    const state = {
      ...createInitialGameState(createDefaultTeams(2)),
      phase: 'QUIZ_ACTIVE' as const,
      activeDrawEventId: 'draw_1',
    };
    const cancelled = cancelPendingEducationCard(state);
    expect(cancelled.ok).toBe(true);
    expect(cancelled.state.teams[0].quizFailures).toBe(0);
    expect(cancelled.state.teams[0].studyCaseFailures).toBe(0);
    expect(cancelled.state.teams[0].balanceKK).toBe(100000);
    expect(cancelled.state.phase).toBe('TURN_END');

    const og = ELEMENTS_BY_ID[118];
    expect(og.symbol).toBe('Og');
    expect(og.electronegativity ?? null).toBeNull();
  });
});
