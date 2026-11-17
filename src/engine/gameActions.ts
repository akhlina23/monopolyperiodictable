import {
  AuctionState,
  BoardTile,
  CURRENT_ECONOMY_SCHEMA_VERSION,
  DEFAULT_ECONOMY_CONFIG,
  DEFAULT_JAIL_BAIL_KK,
  EconomyConfig,
  GameEventLog,
  GamePhase,
  GameState,
  MainPropertyOwnership,
  PieceType,
  PropertyOwnership,
  Team,
} from '../types/game';
import {
  CUSTOMS_TILE,
  ELEMENTS_BY_ID,
  JAIL_TILE,
  MAIN_PROPERTIES_BY_ID,
  START_TILE,
  TILES_BY_ID,
  TILES_BY_PATH_INDEX,
  TRACK_TILE_COUNT,
  calculateAuctionMinimum,
  calculateCompanyBuildCost,
  calculateMaintenance,
  calculateRent,
  calculateSmallCompanyUnitCost,
  calculateStartIncome,
} from './gameEngine';

export interface ActionResult {
  ok: boolean;
  error?: string;
  state: GameState;
  landedTile?: BoardTile;
  pathSteps?: number[];
  crossedStart?: boolean;
  customsTriggered?: boolean;
  forcedJailPathIndex?: number;
}

const DEFAULT_PIECES: PieceType[] = ['flask', 'atom', 'microscope', 'goggles'];
const DEFAULT_COLORS = ['#7029FF', '#FF8733', '#286BFF', '#32C48D'];
const DEFAULT_ICONS = ['⚗️', '⚛️', '🔬', '🥽'];
const DEFAULT_NAMES = ['Tim Hidrogen', 'Tim Helium', 'Tim Litium', 'Tim Karbon'];

export function createDefaultTeams(
  count = 2,
  customNames?: string[],
  startingCapitalKK = DEFAULT_ECONOMY_CONFIG.startingCapitalKK
): Team[] {
  const clamped = Math.max(2, Math.min(4, count));
  const teams: Team[] = [];
  for (let i = 0; i < clamped; i++) {
    teams.push({
      id: `team_${i + 1}`,
      name: customNames?.[i]?.trim() || DEFAULT_NAMES[i],
      color: DEFAULT_COLORS[i],
      tokenIcon: DEFAULT_ICONS[i],
      pieceType: DEFAULT_PIECES[i],
      members: [{ name: `Pemain ${i + 1}` }],
      balanceKK: startingCapitalKK,
      position: 0,
      jailCards: 0,
      isInJail: false,
      jailTurns: 0,
      jailStatus: 'none',
      lastJailEventId: null,
      studyCaseFailures: 0,
      quizFailures: 0,
      skipNextIncome: false,
      isBankrupt: false,
      netWorthKK: startingCapitalKK,
    });
  }
  return teams;
}

function generateGameId(mode: 'local' | 'online'): string {
  const rand = Math.random().toString(36).slice(2, 7);
  return `${mode}_${Date.now()}_${rand}`;
}

export function migrateEconomyConfig(rawConfig?: Partial<EconomyConfig> | null): EconomyConfig {
  const cfg = (rawConfig || {}) as Partial<EconomyConfig>;
  const rawEdu = cfg.educationalRewards;
  const rawSchema = Number(cfg.schemaVersion ?? 0);
  const rawBail = rawEdu?.jailBailKK;
  const hasExplicitPostV2Override = Boolean(
    rawEdu?.jailBailAdminOverride && rawSchema >= CURRENT_ECONOMY_SCHEMA_VERSION
  );
  const shouldUpgradeBail =
    rawBail == null ||
    !Number.isFinite(Number(rawBail)) ||
    (!hasExplicitPostV2Override &&
      (Number(rawBail) === 5000 || rawSchema < CURRENT_ECONOMY_SCHEMA_VERSION));

  const migratedBailKK = shouldUpgradeBail ? DEFAULT_JAIL_BAIL_KK : Number(rawBail);

  return {
    ...DEFAULT_ECONOMY_CONFIG,
    ...cfg,
    schemaVersion: CURRENT_ECONOMY_SCHEMA_VERSION,
    elementPricing: {
      ...DEFAULT_ECONOMY_CONFIG.elementPricing,
      ...(cfg.elementPricing || {}),
    },
    rent: {
      ...DEFAULT_ECONOMY_CONFIG.rent,
      ...(cfg.rent || {}),
      multipliers: {
        ...DEFAULT_ECONOMY_CONFIG.rent.multipliers,
        ...(cfg.rent?.multipliers || {}),
      },
    },
    construction: {
      ...DEFAULT_ECONOMY_CONFIG.construction,
      ...(cfg.construction || {}),
    },
    businessIncome: {
      ...DEFAULT_ECONOMY_CONFIG.businessIncome,
      ...(cfg.businessIncome || {}),
    },
    maintenance: {
      ...DEFAULT_ECONOMY_CONFIG.maintenance,
      ...(cfg.maintenance || {}),
    },
    mainPropertyRules: {
      ...DEFAULT_ECONOMY_CONFIG.mainPropertyRules!,
      ...(cfg.mainPropertyRules || {}),
    },
    educationalRewards: {
      ...DEFAULT_ECONOMY_CONFIG.educationalRewards,
      ...(rawEdu || {}),
      jailBailKK: migratedBailKK,
      jailBailAdminOverride: hasExplicitPostV2Override,
    },
  };
}

export function migrateGameStateEconomy(state: GameState): GameState {
  const migratedEconomy = migrateEconomyConfig(state.economyConfig);
  return {
    ...state,
    economyConfig: migratedEconomy,
    teams: (state.teams || []).map((t) => ({
      ...t,
      jailStatus: t.jailStatus ?? (t.isInJail ? 'detained' : 'none'),
      lastJailEventId: t.lastJailEventId ?? null,
    })),
  };
}

export function createInitialGameState(
  teams?: Team[],
  economyConfig: EconomyConfig = DEFAULT_ECONOMY_CONFIG,
  mode: 'local' | 'online' = 'local',
  roomCode?: string
): GameState {
  const normalizedEconomy = migrateEconomyConfig(economyConfig);
  const activeTeams =
    teams && teams.length >= 2
      ? teams
      : createDefaultTeams(2, undefined, normalizedEconomy.startingCapitalKK);
  const now = Date.now();
  return {
    gameId: generateGameId(mode),
    mode,
    ...(roomCode ? { roomCode } : {}),
    phase: 'TURN_START',
    teams: activeTeams,
    activeTeamIndex: 0,
    lastDice: [1, 1],
    properties: {},
    mainProperties: {},
    economyConfig: normalizedEconomy,
    events: [
      {
        id: `ev_init_${now}`,
        timestamp: now,
        type: 'GAME_STARTED',
        description: `Permainan dimulai dengan ${activeTeams.length} tim (${activeTeams
          .map((t) => t.name)
          .join(', ')}).`,
      },
    ],
    activeQuiz: null,
    activeDrawEventId: null,
    quizDeadline: null,
    activeStudyCase: null,
    studyCaseVotes: {},
    activeAuction: null,
    winnerTeamId: null,
    recentEducationalFingerprints: [],
    stateVersion: 1,
    updatedAt: now,
  };
}

/**
 * Comprehensive match reset: preserves team identities (count, names, members, tokens, colors),
 * game mode/roomCode, and economyConfig (including admin adjustments), while wiping all board
 * ownership, companies, balances, positions, jail/failure counters, quizzes/cases, auctions,
 * winner status, and ledger history for a brand-new session with monotonic stateVersion.
 */
export function resetMatchState(prevState: GameState): GameState {
  const now = Date.now();
  const preservedEconomy = migrateEconomyConfig(prevState.economyConfig);

  const startingCapital = preservedEconomy.startingCapitalKK;
  const resetTeams: Team[] = (prevState.teams.length >= 2
    ? prevState.teams
    : createDefaultTeams(2, undefined, startingCapital)
  ).map((team, idx) => ({
    id: team.id || `team_${idx + 1}`,
    name: team.name || DEFAULT_NAMES[idx % DEFAULT_NAMES.length],
    color: team.color || DEFAULT_COLORS[idx % DEFAULT_COLORS.length],
    tokenIcon: team.tokenIcon || DEFAULT_ICONS[idx % DEFAULT_ICONS.length],
    pieceType: team.pieceType || DEFAULT_PIECES[idx % DEFAULT_PIECES.length],
    members:
      Array.isArray(team.members) && team.members.length > 0
        ? team.members.map((m) => ({ ...m }))
        : [{ name: `Pemain ${idx + 1}` }],
    balanceKK: startingCapital,
    position: 0,
    jailCards: 0,
    isInJail: false,
    jailTurns: 0,
    jailStatus: 'none',
    lastJailEventId: null,
    studyCaseFailures: 0,
    quizFailures: 0,
    skipNextIncome: false,
    isBankrupt: false,
    netWorthKK: startingCapital,
  }));

  return {
    gameId: generateGameId(prevState.mode),
    mode: prevState.mode,
    ...(prevState.roomCode ? { roomCode: prevState.roomCode } : {}),
    ...(prevState.hostId ? { hostId: prevState.hostId } : {}),
    phase: 'TURN_START',
    teams: resetTeams,
    activeTeamIndex: 0,
    lastDice: [1, 1],
    properties: {},
    mainProperties: {},
    economyConfig: preservedEconomy,
    events: [
      {
        id: `ev_init_${now}_${Math.random().toString(36).slice(2, 6)}`,
        timestamp: now,
        type: 'GAME_STARTED',
        description: `Match baru dimulai dengan ${resetTeams.length} tim (${resetTeams
          .map((t) => t.name)
          .join(', ')}).`,
      },
    ],
    activeQuiz: null,
    activeDrawEventId: null,
    quizDeadline: null,
    activeStudyCase: null,
    studyCaseVotes: {},
    activeAuction: null,
    winnerTeamId: null,
    recentEducationalFingerprints: [],
    stateVersion: (prevState.stateVersion || 0) + 1,
    updatedAt: now,
  };
}

function appendEvent(
  events: GameEventLog[],
  entry: Omit<GameEventLog, 'id' | 'timestamp'> & { id?: string }
): GameEventLog[] {
  return [
    {
      id: entry.id || `ev_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      timestamp: Date.now(),
      ...entry,
    },
    ...events.slice(0, 99),
  ];
}

export function computeTeamNetWorth(team: Team, state: GameState): number {
  let propertyValue = 0;
  Object.values(state.properties).forEach((prop) => {
    if (prop.ownerTeamId !== team.id || !prop.atomicNumber) return;
    const el = ELEMENTS_BY_ID[prop.atomicNumber];
    if (!el) return;
    propertyValue += el.basePriceKK;
    const buildUnit = calculateSmallCompanyUnitCost(el.basePriceKK, state.economyConfig);
    if (prop.hasLargeCompany) {
      propertyValue += buildUnit * (state.economyConfig.construction.maximumSmallCompanies + 1);
    } else {
      propertyValue += buildUnit * prop.smallCompanies;
    }
  });
  Object.values(state.mainProperties).forEach((mp) => {
    if (mp.ownerTeamId !== team.id) return;
    const def = MAIN_PROPERTIES_BY_ID[mp.propertyId];
    if (def) propertyValue += def.draftPurchasePriceKK;
  });
  return team.balanceKK + propertyValue;
}

export function applyDiceMove(state: GameState, d1: number, d2: number): ActionResult {
  const activeTeam = state.teams[state.activeTeamIndex];
  if (!activeTeam || activeTeam.isBankrupt) {
    return { ok: false, error: 'Active team cannot move.', state };
  }
  if (state.phase !== 'TURN_START') {
    return { ok: false, error: 'Dice roll is only allowed in TURN_START phase.', state };
  }
  if (d1 < 1 || d1 > 6 || d2 < 1 || d2 > 6) {
    return { ok: false, error: 'Dice values must be between 1 and 6.', state };
  }

  if (activeTeam.isInJail) {
    const updatedTeams = state.teams.map((t) => ({ ...t }));
    const team = updatedTeams[state.activeTeamIndex];
    if (d1 === d2) {
      team.isInJail = false;
      team.jailTurns = 0;
      team.jailStatus = 'released';
      const events = appendEvent(state.events, {
        teamId: team.id,
        type: 'JAIL_ESCAPED_DOUBLES',
        description: `${team.name} melempar dadu kembar [${d1}, ${d2}] dan bebas dari Penjara!`,
      });
      return executeTrackStepMove({ ...state, teams: updatedTeams, events }, d1, d2);
    } else {
      team.jailTurns = Math.max(0, team.jailTurns - 1);
      if (team.jailTurns === 0) {
        team.isInJail = false;
        team.jailStatus = 'released';
      } else {
        team.jailStatus = 'detained';
      }
      const events = appendEvent(state.events, {
        teamId: team.id,
        type: 'JAIL_TURN_WAIT',
        description:
          team.jailTurns === 0
            ? `${team.name} melempar [${d1}, ${d2}] dan menyelesaikan masa tahanan di Penjara.`
            : `${team.name} melempar [${d1}, ${d2}] di Penjara (sisa ${team.jailTurns} giliran).`,
      });
      return {
        ok: true,
        state: {
          ...state,
          teams: updatedTeams,
          lastDice: [d1, d2],
          phase: 'TURN_END',
          events,
          stateVersion: state.stateVersion + 1,
          updatedAt: Date.now(),
        },
        landedTile: TILES_BY_PATH_INDEX[team.position],
        pathSteps: [],
        crossedStart: false,
      };
    }
  }

  return executeTrackStepMove(state, d1, d2);
}

export interface SendToJailOptions {
  eventType?: 'CUSTOMS_SENT_TO_JAIL' | 'ADMIN_SENT_TO_JAIL' | 'CASE_REJECTED';
  tileId?: string;
  description?: string;
  idempotentEventId?: string;
  skipEventLog?: boolean;
  phaseAfter?: GamePhase;
  stateVersionOverride?: number;
}

/**
 * Atomically relocates a team to the Penjara (Jail) tile AND marks them detained in jail.
 * Shared across Bea Cukai (dice & admin), Admin Console Jail toggle, and Study Case rejection.
 */
export function sendPlayerToJail(
  state: GameState,
  teamId: string,
  options: SendToJailOptions = {}
): GameState {
  const teamIdx = state.teams.findIndex((t) => t.id === teamId);
  if (teamIdx === -1) return state;

  const jailPathIndex = JAIL_TILE?.pathIndex ?? 33;
  const jailDuration = state.economyConfig.educationalRewards.jailDurationTurns ?? 3;
  const nextVersion = options.stateVersionOverride ?? state.stateVersion + 1;
  const updatedTeams = state.teams.map((t) => ({ ...t }));
  const team = updatedTeams[teamIdx];

  const eventId =
    options.idempotentEventId ??
    `ev_jail_${state.gameId}_${nextVersion}_${team.id}`;
  const alreadyRecorded = Boolean(
    options.idempotentEventId &&
      (team.lastJailEventId === eventId || state.events.some((ev) => ev.id === eventId))
  );

  team.position = jailPathIndex;
  team.isInJail = true;
  team.jailStatus = 'detained';
  if (!alreadyRecorded) {
    team.jailTurns = jailDuration;
    team.lastJailEventId = eventId;
  }

  let events = state.events;
  if (!options.skipEventLog && !alreadyRecorded) {
    const eventType = options.eventType ?? 'CUSTOMS_SENT_TO_JAIL';
    const description =
      options.description ?? `${team.name} terkena Bea Cukai dan dikirim ke Penjara!`;
    events = appendEvent(events, {
      id: eventId,
      teamId: team.id,
      type: eventType,
      tileId: options.tileId ?? CUSTOMS_TILE?.tileId ?? JAIL_TILE?.tileId,
      description,
    });
  }

  return {
    ...state,
    teams: updatedTeams,
    events,
    phase: options.phaseAfter ?? state.phase,
    stateVersion: nextVersion,
    updatedAt: Date.now(),
  };
}

function executeTrackStepMove(state: GameState, d1: number, d2: number): ActionResult {
  const trackLen = TRACK_TILE_COUNT || 130;
  const startPathIndex = START_TILE?.pathIndex ?? 0;
  const customsPathIndex = CUSTOMS_TILE?.pathIndex;
  const jailPathIndex = JAIL_TILE?.pathIndex ?? 33;

  const steps = d1 + d2;
  const updatedTeams = state.teams.map((t) => ({ ...t }));
  const team = updatedTeams[state.activeTeamIndex];
  const oldPos = team.position;

  const rawPathSteps: number[] = [];
  for (let s = 1; s <= steps; s++) {
    rawPathSteps.push((oldPos + s) % trackLen);
  }

  // Inspect traversed path steps in exact order for first entry into Bea Cukai (Customs)
  const customsHitIdx =
    customsPathIndex !== undefined ? rawPathSteps.findIndex((idx) => idx === customsPathIndex) : -1;

  if (customsHitIdx !== -1 && CUSTOMS_TILE && JAIL_TILE) {
    const stepsThroughCustoms = rawPathSteps.slice(0, customsHitIdx + 1);
    // START income is ONLY valid for normal steps strictly before reaching/stopping at Customs;
    // the forced teleport from Customs -> Jail never grants START income.
    const crossedStartBeforeCustoms = stepsThroughCustoms.some((idx) => idx === startPathIndex);
    let events = [...state.events];

    if (crossedStartBeforeCustoms) {
      const income = calculateStartIncome(team.id, state);
      team.balanceKK += income.totalIncomeKK;
      team.skipNextIncome = false;
      events = appendEvent(events, {
        teamId: team.id,
        type: 'START_CROSSED',
        amountKK: income.totalIncomeKK,
        balanceAfterKK: team.balanceKK,
        description: `${team.name} melewati/mencapai START (+${income.totalIncomeKK.toLocaleString(
          'id-ID'
        )} KK dari ${income.breakdown.length} perusahaan berpenghasilan).`,
      });
    }

    const nextVersion = state.stateVersion + 1;
    const jailEventId = `ev_customs_${state.gameId}_${nextVersion}_${team.id}`;
    const preJailState: GameState = {
      ...state,
      teams: updatedTeams,
      lastDice: [d1, d2],
      events,
    };

    const jailedState = sendPlayerToJail(preJailState, team.id, {
      eventType: 'CUSTOMS_SENT_TO_JAIL',
      tileId: CUSTOMS_TILE.tileId,
      description: `${team.name} terkena Bea Cukai dan dikirim ke Penjara!`,
      idempotentEventId: jailEventId,
      phaseAfter: 'RESOLVING_TILE',
      stateVersionOverride: nextVersion,
    });

    const visualPathSteps = [...stepsThroughCustoms, jailPathIndex];

    return {
      ok: true,
      state: jailedState,
      landedTile: JAIL_TILE,
      pathSteps: visualPathSteps,
      crossedStart: crossedStartBeforeCustoms,
      customsTriggered: true,
      forcedJailPathIndex: jailPathIndex,
    };
  }

  const newPos = (oldPos + steps) % trackLen;
  const crossedStart = rawPathSteps.some((idx) => idx === startPathIndex);

  team.position = newPos;
  let events = [...state.events];

  if (crossedStart) {
    const income = calculateStartIncome(team.id, state);
    team.balanceKK += income.totalIncomeKK;
    team.skipNextIncome = false;
    events = appendEvent(events, {
      teamId: team.id,
      type: 'START_CROSSED',
      amountKK: income.totalIncomeKK,
      balanceAfterKK: team.balanceKK,
      description: `${team.name} melewati/mencapai START (+${income.totalIncomeKK.toLocaleString(
        'id-ID'
      )} KK dari ${income.breakdown.length} perusahaan berpenghasilan).`,
    });
  }

  const landedTile = TILES_BY_PATH_INDEX[newPos];
  const nextState: GameState = {
    ...state,
    teams: updatedTeams,
    lastDice: [d1, d2],
    phase: 'RESOLVING_TILE',
    events,
    stateVersion: state.stateVersion + 1,
    updatedAt: Date.now(),
  };

  return {
    ok: true,
    state: nextState,
    landedTile,
    pathSteps: rawPathSteps,
    crossedStart,
    customsTriggered: false,
  };
}

/**
 * Unified tile-landing side-effect resolver for both normal dice movement ('dice')
 * and Admin Console token teleports ('admin').
 * - 'dice': executes full board mechanics for every tile type.
 * - 'admin': triggers Bea Cukai (Customs -> Jail), Quiz, and Study Case (switching active turn
 *   to the moved player if needed), while leaving all other tiles neutral.
 */
export function resolveTileLanding(
  state: GameState,
  teamId: string,
  targetTileIndex: number,
  source: 'dice' | 'admin'
): ActionResult {
  const trackLen = TRACK_TILE_COUNT || 130;
  const clampedPos = ((Math.round(targetTileIndex) % trackLen) + trackLen) % trackLen;
  const teamIdx = state.teams.findIndex((t) => t.id === teamId);
  if (teamIdx === -1) {
    return { ok: false, error: 'Team not found.', state };
  }

  const tile = TILES_BY_PATH_INDEX[clampedPos];
  if (!tile) {
    return { ok: false, error: 'Invalid board tile position.', state };
  }

  const updatedTeams = state.teams.map((t, idx) =>
    idx === teamIdx ? { ...t, position: clampedPos } : { ...t }
  );
  const team = updatedTeams[teamIdx];
  let events = [...state.events];
  const properties = { ...state.properties };

  if (tile.tileType === 'customs') {
    const jailPathIndex = JAIL_TILE?.pathIndex ?? 33;
    const alreadyDetainedThisMove =
      source === 'dice' &&
      team.isInJail &&
      Boolean(team.lastJailEventId && events.some((ev) => ev.id === team.lastJailEventId));

    if (alreadyDetainedThisMove) {
      const nextState = sendPlayerToJail(
        { ...state, teams: updatedTeams },
        team.id,
        {
          idempotentEventId: team.lastJailEventId ?? undefined,
          skipEventLog: true,
          phaseAfter: 'TURN_END',
        }
      );
      return {
        ok: true,
        landedTile: JAIL_TILE ?? tile,
        customsTriggered: false,
        forcedJailPathIndex: jailPathIndex,
        state: nextState,
      };
    }

    const nextVersion = state.stateVersion + 1;
    const isAdminCustoms = source === 'admin';
    const nextPhaseAfter = isAdminCustoms
      ? state.phase === 'QUIZ_ACTIVE' || state.phase === 'STUDY_CASE_ACTIVE' || state.phase === 'RESOLVING_TILE'
        ? 'TURN_END'
        : state.phase
      : 'TURN_END';
    const jailedState = sendPlayerToJail(
      {
        ...state,
        teams: updatedTeams,
        ...(isAdminCustoms && teamIdx === state.activeTeamIndex
          ? { activeQuiz: null, activeStudyCase: null, activeDrawEventId: null, quizDeadline: null }
          : {}),
      },
      team.id,
      {
        eventType: 'CUSTOMS_SENT_TO_JAIL',
        tileId: tile.tileId,
        description: isAdminCustoms
          ? `${team.name} dipindahkan Admin ke Bea Cukai dan langsung dikirim ke Penjara!`
          : `${team.name} terkena Bea Cukai dan dikirim ke Penjara!`,
        idempotentEventId: `ev_customs_${state.gameId}_${nextVersion}_${team.id}`,
        phaseAfter: nextPhaseAfter,
        stateVersionOverride: nextVersion,
      }
    );
    return {
      ok: true,
      landedTile: JAIL_TILE ?? tile,
      customsTriggered: true,
      forcedJailPathIndex: jailPathIndex,
      state: jailedState,
    };
  }

  if (tile.tileType === 'quiz') {
    const nextVersion = state.stateVersion + 1;
    const drawId = `draw_quiz_${state.gameId}_${nextVersion}_${tile.tileId}`;
    const nextActiveIdx = source === 'admin' ? teamIdx : state.activeTeamIndex;
    const nextEvents =
      source === 'admin'
        ? appendEvent(events, {
            teamId: team.id,
            type: 'TILE_VISITED',
            tileId: tile.tileId,
            description: `Admin memindahkan ${team.name} ke petak Kuis (${tile.title}).`,
          })
        : events;
    return {
      ok: true,
      landedTile: tile,
      state: {
        ...state,
        teams: updatedTeams,
        activeTeamIndex: nextActiveIdx,
        phase: 'QUIZ_ACTIVE',
        activeQuiz: null,
        activeStudyCase: null,
        quizDeadline: null,
        activeAuction: null,
        activeDrawEventId: drawId,
        events: nextEvents,
        stateVersion: nextVersion,
        updatedAt: Date.now(),
      },
    };
  }

  if (tile.tileType === 'study_case') {
    const nextVersion = state.stateVersion + 1;
    const drawId = `draw_case_${state.gameId}_${nextVersion}_${tile.tileId}`;
    const nextActiveIdx = source === 'admin' ? teamIdx : state.activeTeamIndex;
    const nextEvents =
      source === 'admin'
        ? appendEvent(events, {
            teamId: team.id,
            type: 'TILE_VISITED',
            tileId: tile.tileId,
            description: `Admin memindahkan ${team.name} ke petak Studi Kasus (${tile.title}).`,
          })
        : events;
    return {
      ok: true,
      landedTile: tile,
      state: {
        ...state,
        teams: updatedTeams,
        activeTeamIndex: nextActiveIdx,
        phase: 'STUDY_CASE_ACTIVE',
        activeQuiz: null,
        activeStudyCase: null,
        quizDeadline: null,
        activeAuction: null,
        activeDrawEventId: drawId,
        events: nextEvents,
        stateVersion: nextVersion,
        updatedAt: Date.now(),
      },
    };
  }

  // Keep all other tiles neutral on Admin Console teleports
  if (source === 'admin') {
    return {
      ok: true,
      landedTile: tile,
      state: {
        ...state,
        teams: updatedTeams,
        stateVersion: state.stateVersion + 1,
        updatedAt: Date.now(),
      },
    };
  }

  if (tile.tileType === 'element' && tile.atomicNumber) {
    const element = ELEMENTS_BY_ID[tile.atomicNumber];
    const ownership = properties[tile.tileId];

    if (!ownership) {
      return {
        ok: true,
        landedTile: tile,
        state: {
          ...state,
          teams: updatedTeams,
          phase: 'ELEMENT_PURCHASE',
          stateVersion: state.stateVersion + 1,
          updatedAt: Date.now(),
        },
      };
    }

    if (ownership.ownerTeamId === team.id) {
      const maintenanceKK = calculateMaintenance(element.basePriceKK, state.economyConfig);
      if (team.balanceKK < maintenanceKK) {
        properties[tile.tileId] = { ...ownership, smallCompanies: 0, hasLargeCompany: false };
        events = appendEvent(events, {
          teamId: team.id,
          type: 'COMPANY_DESTROYED',
          tileId: tile.tileId,
          atomicNumber: element.atomicNumber,
          description: `${team.name} tidak sanggup membayar pemeliharaan (${maintenanceKK.toLocaleString(
            'id-ID'
          )} KK) di ${element.nameEn}. Perusahaan dihancurkan!`,
        });
      } else {
        team.balanceKK -= maintenanceKK;
        events = appendEvent(events, {
          teamId: team.id,
          type: 'MAINTENANCE_PAID',
          amountKK: -maintenanceKK,
          balanceAfterKK: team.balanceKK,
          tileId: tile.tileId,
          atomicNumber: element.atomicNumber,
          description: `${team.name} membayar pemeliharaan ${maintenanceKK.toLocaleString(
            'id-ID'
          )} KK di petak sendiri ${element.symbol} (${element.nameEn}).`,
        });
      }
      return {
        ok: true,
        landedTile: tile,
        state: {
          ...state,
          teams: updatedTeams,
          properties,
          phase: 'TURN_END',
          events,
          stateVersion: state.stateVersion + 1,
          updatedAt: Date.now(),
        },
      };
    }

    const ownerIdx = updatedTeams.findIndex((t) => t.id === ownership.ownerTeamId);
    if (ownerIdx !== -1) {
      const ownerTeam = updatedTeams[ownerIdx];
      const rentKK = calculateRent(ownership, state.economyConfig);
      team.balanceKK -= rentKK;
      ownerTeam.balanceKK += rentKK;

      if (team.balanceKK < 0) {
        team.isBankrupt = true;
        team.bankruptReason = `Bangkrut karena tidak mampu membayar sewa ${
          element.nameEn
        } (${rentKK.toLocaleString('id-ID')} KK) kepada ${ownerTeam.name}.`;
      }

      events = appendEvent(events, {
        teamId: team.id,
        type: 'PROPERTY_RENT_PAID',
        amountKK: -rentKK,
        balanceAfterKK: team.balanceKK,
        tileId: tile.tileId,
        atomicNumber: element.atomicNumber,
        description: `${team.name} membayar sewa ${rentKK.toLocaleString('id-ID')} KK kepada ${
          ownerTeam.name
        } untuk ${element.symbol} (${element.nameEn}).`,
      });
    }

    return {
      ok: true,
      landedTile: tile,
      state: {
        ...state,
        teams: updatedTeams,
        phase: 'TURN_END',
        events,
        stateVersion: state.stateVersion + 1,
        updatedAt: Date.now(),
      },
    };
  }

  if (tile.tileType === 'main_property' && tile.mainPropertyId) {
    const def = MAIN_PROPERTIES_BY_ID[tile.mainPropertyId];
    const ownership = state.mainProperties[tile.mainPropertyId];
    if (!def) {
      return { ok: true, landedTile: tile, state: { ...state, phase: 'TURN_END' } };
    }

    if (!ownership) {
      return {
        ok: true,
        landedTile: tile,
        state: {
          ...state,
          teams: updatedTeams,
          phase: 'MAIN_PROP_PURCHASE',
          stateVersion: state.stateVersion + 1,
          updatedAt: Date.now(),
        },
      };
    }

    if (ownership.ownerTeamId === team.id) {
      events = appendEvent(events, {
        teamId: team.id,
        type: 'MAIN_PROP_OWN_VISIT',
        tileId: tile.tileId,
        description: `${team.name} mendarat di Properti Utama miliknya (${def.name}) — bebas biaya pemeliharaan.`,
      });
    } else {
      const ownerIdx = updatedTeams.findIndex((t) => t.id === ownership.ownerTeamId);
      const ownerId = ownership.ownerTeamId;
      const ownedMainCount = Object.values(state.mainProperties).filter(
        (mp) => mp.ownerTeamId === ownerId
      ).length;
      const rules = state.economyConfig.mainPropertyRules || {
        bankChargeDraftKK: def.draftBankTaxMaintenanceKK,
        ownerFeeBaseKK: 500,
        multipliersByCount: [1, 2, 4, 8],
      };
      const multIdx = Math.max(0, Math.min(ownedMainCount - 1, rules.multipliersByCount.length - 1));
      const ownerFee = rules.ownerFeeBaseKK * (rules.multipliersByCount[multIdx] || 1);
      const bankCharge = rules.bankChargeDraftKK ?? def.draftBankTaxMaintenanceKK;
      const totalCharge = ownerFee + bankCharge;

      if (ownerIdx !== -1) {
        team.balanceKK -= totalCharge;
        updatedTeams[ownerIdx].balanceKK += ownerFee;
        if (team.balanceKK < 0) {
          team.isBankrupt = true;
          team.bankruptReason = `Bangkrut karena biaya layanan ${def.name}.`;
        }
        events = appendEvent(events, {
          teamId: team.id,
          type: 'MAIN_PROP_RENT',
          amountKK: -totalCharge,
          balanceAfterKK: team.balanceKK,
          tileId: tile.tileId,
          description: `${team.name} membayar ${ownerFee.toLocaleString('id-ID')} KK ke ${
            updatedTeams[ownerIdx].name
          } (${ownedMainCount} properti utama) + ${bankCharge.toLocaleString('id-ID')} KK pajak bank untuk ${def.name}.`,
        });
      }
    }

    return {
      ok: true,
      landedTile: tile,
      state: {
        ...state,
        teams: updatedTeams,
        phase: 'TURN_END',
        events,
        stateVersion: state.stateVersion + 1,
        updatedAt: Date.now(),
      },
    };
  }

  if (tile.tileType === 'jail') {
    if (team.isInJail || team.jailStatus === 'detained') {
      return {
        ok: true,
        landedTile: tile,
        state: {
          ...state,
          teams: updatedTeams,
          phase: 'TURN_END',
          events,
          stateVersion: state.stateVersion + 1,
          updatedAt: Date.now(),
        },
      };
    }

    team.jailStatus = 'visiting';
    const visitEventId = `ev_jail_visit_${state.gameId}_${state.stateVersion}_${team.id}`;
    if (state.phase === 'RESOLVING_TILE' || !events.some((ev) => ev.id === visitEventId)) {
      events = appendEvent(events, {
        id: visitEventId,
        teamId: team.id,
        type: 'JAIL_VISITED',
        tileId: tile.tileId,
        description: `${team.name} berkunjung ke Penjara (hanya lewat — tidak ditahan).`,
      });
    }
    return {
      ok: true,
      landedTile: tile,
      state: {
        ...state,
        teams: updatedTeams,
        phase: 'TURN_END',
        events,
        stateVersion: state.stateVersion + 1,
        updatedAt: Date.now(),
      },
    };
  }

  events = appendEvent(events, {
    teamId: team.id,
    type: 'TILE_VISITED',
    tileId: tile.tileId,
    description: `${team.name} berhenti di ${tile.title}.`,
  });
  return {
    ok: true,
    landedTile: tile,
    state: {
      ...state,
      teams: updatedTeams,
      phase: 'TURN_END',
      events,
      stateVersion: state.stateVersion + 1,
      updatedAt: Date.now(),
    },
  };
}

export function resolveLandedTileEffects(state: GameState): ActionResult {
  const activeTeam = state.teams[state.activeTeamIndex];
  if (!activeTeam) {
    return { ok: false, error: 'Active team not found.', state };
  }
  return resolveTileLanding(state, activeTeam.id, activeTeam.position, 'dice');
}

/**
 * Allows cancelling an educational draw cleanly with ZERO penalty when AI fails (§13.5).
 */
export function cancelPendingEducationCard(state: GameState, reason?: string): ActionResult {
  if (state.phase !== 'QUIZ_ACTIVE' && state.phase !== 'STUDY_CASE_ACTIVE') {
    return { ok: false, error: 'No pending quiz or study case.', state };
  }
  const activeTeam = state.teams[state.activeTeamIndex];
  const events = appendEvent(state.events, {
    teamId: activeTeam?.id,
    type: 'AI_DRAW_CANCELLED',
    description:
      reason ||
      `${activeTeam?.name} melewati kartu edukasi sementara (tanpa penalti karena layanan AI tidak tersedia).`,
  });

  return {
    ok: true,
    state: {
      ...state,
      activeQuiz: null,
      activeStudyCase: null,
      activeDrawEventId: null,
      quizDeadline: null,
      phase: 'TURN_END',
      events,
      stateVersion: state.stateVersion + 1,
      updatedAt: Date.now(),
    },
  };
}

export function buyElementProperty(state: GameState, teamId: string, tileId: string): ActionResult {
  const activeTeam = state.teams[state.activeTeamIndex];
  if (!activeTeam || activeTeam.id !== teamId) {
    return { ok: false, error: 'Only the active turn team can purchase properties.', state };
  }
  if (activeTeam.isBankrupt) {
    return { ok: false, error: 'Bankrupt teams cannot purchase properties.', state };
  }

  const tile = TILES_BY_ID[tileId];
  if (!tile || tile.tileType !== 'element' || !tile.atomicNumber) {
    return { ok: false, error: 'Invalid element tile.', state };
  }
  if (activeTeam.position !== tile.pathIndex) {
    return {
      ok: false,
      error: `Cannot buy ${tile.title}: active piece is at #${activeTeam.position}, not on #${tile.pathIndex}.`,
      state,
    };
  }
  if (state.properties[tileId]) {
    return { ok: false, error: `${tile.title} is already owned.`, state };
  }

  const element = ELEMENTS_BY_ID[tile.atomicNumber];
  if (!element) {
    return { ok: false, error: 'Element data not found.', state };
  }
  if (activeTeam.balanceKK < element.basePriceKK) {
    return { ok: false, error: 'Insufficient Koin Kimia balance.', state };
  }

  const updatedTeams = state.teams.map((t) => ({ ...t }));
  const team = updatedTeams[state.activeTeamIndex];
  team.balanceKK -= element.basePriceKK;

  const newOwnership: PropertyOwnership = {
    tileId,
    pathIndex: tile.pathIndex,
    atomicNumber: element.atomicNumber,
    ownerTeamId: team.id,
    smallCompanies: 0,
    hasLargeCompany: false,
  };

  const newProperties = { ...state.properties, [tileId]: newOwnership };
  const events = appendEvent(state.events, {
    teamId: team.id,
    type: 'PROPERTY_PURCHASED',
    amountKK: -element.basePriceKK,
    balanceAfterKK: team.balanceKK,
    tileId,
    atomicNumber: element.atomicNumber,
    description: `${team.name} membeli ${element.symbol} (${element.nameEn}) seharga ${element.basePriceKK.toLocaleString(
      'id-ID'
    )} KK.`,
  });

  return {
    ok: true,
    state: {
      ...state,
      teams: updatedTeams,
      properties: newProperties,
      phase: 'TURN_END',
      events,
      stateVersion: state.stateVersion + 1,
      updatedAt: Date.now(),
    },
  };
}

export function buyMainProperty(state: GameState, teamId: string, tileId: string): ActionResult {
  const activeTeam = state.teams[state.activeTeamIndex];
  if (!activeTeam || activeTeam.id !== teamId) {
    return { ok: false, error: 'Only the active turn team can buy main properties.', state };
  }

  const tile = TILES_BY_ID[tileId];
  if (!tile || tile.tileType !== 'main_property' || !tile.mainPropertyId) {
    return { ok: false, error: 'Invalid main property tile.', state };
  }
  if (activeTeam.position !== tile.pathIndex) {
    return { ok: false, error: 'Active piece must be standing on this main property tile to purchase it.', state };
  }
  if (state.mainProperties[tile.mainPropertyId]) {
    return { ok: false, error: 'Main property is already owned.', state };
  }

  const def = MAIN_PROPERTIES_BY_ID[tile.mainPropertyId];
  if (!def || activeTeam.balanceKK < def.draftPurchasePriceKK) {
    return { ok: false, error: 'Insufficient balance for main property.', state };
  }

  const updatedTeams = state.teams.map((t) => ({ ...t }));
  const team = updatedTeams[state.activeTeamIndex];
  team.balanceKK -= def.draftPurchasePriceKK;

  const newMainProps: Record<string, MainPropertyOwnership> = {
    ...state.mainProperties,
    [tile.mainPropertyId]: { propertyId: tile.mainPropertyId, ownerTeamId: team.id },
  };

  const events = appendEvent(state.events, {
    teamId: team.id,
    type: 'MAIN_PROP_PURCHASED',
    amountKK: -def.draftPurchasePriceKK,
    balanceAfterKK: team.balanceKK,
    tileId,
    description: `${team.name} membeli Properti Utama ${def.name} seharga ${def.draftPurchasePriceKK.toLocaleString(
      'id-ID'
    )} KK.`,
  });

  return {
    ok: true,
    state: {
      ...state,
      teams: updatedTeams,
      mainProperties: newMainProps,
      phase: 'TURN_END',
      events,
      stateVersion: state.stateVersion + 1,
      updatedAt: Date.now(),
    },
  };
}

export function buildCompanyOnProperty(state: GameState, teamId: string, tileId: string): ActionResult {
  const activeTeam = state.teams[state.activeTeamIndex];
  if (!activeTeam || activeTeam.id !== teamId) {
    return { ok: false, error: 'Only the active team can build companies on their turn.', state };
  }
  const tile = TILES_BY_ID[tileId];
  const prop = state.properties[tileId];
  if (!tile || !tile.atomicNumber || !prop || prop.ownerTeamId !== teamId) {
    return { ok: false, error: 'Property not owned by active team.', state };
  }

  const element = ELEMENTS_BY_ID[tile.atomicNumber];
  const buildInfo = calculateCompanyBuildCost(prop, element, state.economyConfig);
  if (!buildInfo.canBuild) {
    return { ok: false, error: 'Maximum company development reached.', state };
  }
  if (activeTeam.balanceKK < buildInfo.costKK) {
    return { ok: false, error: 'Insufficient balance to construct company.', state };
  }

  const updatedTeams = state.teams.map((t) => ({ ...t }));
  const team = updatedTeams[state.activeTeamIndex];
  team.balanceKK -= buildInfo.costKK;

  const updatedProp: PropertyOwnership =
    buildInfo.type === 'small'
      ? { ...prop, smallCompanies: prop.smallCompanies + 1 }
      : { ...prop, smallCompanies: 0, hasLargeCompany: true };

  const events = appendEvent(state.events, {
    teamId: team.id,
    type: buildInfo.type === 'small' ? 'COMPANY_BUILT' : 'COMPANY_UPGRADED',
    amountKK: -buildInfo.costKK,
    balanceAfterKK: team.balanceKK,
    tileId,
    atomicNumber: element.atomicNumber,
    description: `${team.name} membangun ${
      buildInfo.type === 'small' ? `Perusahaan Kecil #${updatedProp.smallCompanies}` : 'Perusahaan Besar'
    } di ${element.symbol} (${element.nameEn}) seharga ${buildInfo.costKK.toLocaleString('id-ID')} KK.`,
  });

  return {
    ok: true,
    state: {
      ...state,
      teams: updatedTeams,
      properties: { ...state.properties, [tileId]: updatedProp },
      events,
      stateVersion: state.stateVersion + 1,
      updatedAt: Date.now(),
    },
  };
}

export function sellCompaniesBeforeAuction(state: GameState, teamId: string, tileId: string): ActionResult {
  const tile = TILES_BY_ID[tileId];
  const prop = state.properties[tileId];
  if (!tile || !tile.atomicNumber || !prop || prop.ownerTeamId !== teamId) {
    return { ok: false, error: 'Property not owned by team.', state };
  }
  if (!prop.hasLargeCompany && prop.smallCompanies === 0) {
    return { ok: false, error: 'Property already clean.', state };
  }
  const el = ELEMENTS_BY_ID[tile.atomicNumber];
  const unitCost = calculateSmallCompanyUnitCost(el.basePriceKK, state.economyConfig);
  const units = prop.hasLargeCompany ? 5 : prop.smallCompanies;
  const refund = Math.round(units * unitCost * 0.5);

  const updatedTeams = state.teams.map((t) =>
    t.id === teamId ? { ...t, balanceKK: t.balanceKK + refund } : t
  );
  const teamAfter = updatedTeams.find((t) => t.id === teamId)!;
  const cleanProp: PropertyOwnership = {
    ...prop,
    smallCompanies: 0,
    hasLargeCompany: false,
  };

  const events = appendEvent(state.events, {
    teamId,
    type: 'COMPANIES_LIQUIDATED',
    amountKK: refund,
    balanceAfterKK: teamAfter.balanceKK,
    tileId,
    atomicNumber: el.atomicNumber,
    description: `${teamAfter.name} melikuidasi bangunan perusahaan di ${el.symbol} (+${refund.toLocaleString(
      'id-ID'
    )} KK) sehingga petak bersih siap dilelang.`,
  });

  return {
    ok: true,
    state: {
      ...state,
      teams: updatedTeams,
      properties: { ...state.properties, [tileId]: cleanProp },
      events,
      stateVersion: state.stateVersion + 1,
      updatedAt: Date.now(),
    },
  };
}

export function startElementAuction(state: GameState, sellerTeamId: string, tileId: string): ActionResult {
  if (state.activeAuction && state.activeAuction.status === 'active') {
    return { ok: false, error: 'An auction is already active.', state };
  }
  const tile = TILES_BY_ID[tileId];
  const prop = state.properties[tileId];
  if (!tile || !tile.atomicNumber || !prop || prop.ownerTeamId !== sellerTeamId) {
    return { ok: false, error: 'Only the property owner can start an auction for this element.', state };
  }

  const element = ELEMENTS_BY_ID[tile.atomicNumber];
  const auctionMinKK = calculateAuctionMinimum(element.basePriceKK, state.economyConfig);

  const auction: AuctionState = {
    tileId,
    pathIndex: tile.pathIndex,
    atomicNumber: element.atomicNumber,
    sellerTeamId,
    minimumBidKK: auctionMinKK,
    currentBidKK: auctionMinKK,
    highestBidderTeamId: null,
    minIncrementKK: 100,
    offersByTeam: {},
    offerTimestamps: {},
    bidsHistory: [],
    revisionHistory: [],
    status: 'active',
  };

  const events = appendEvent(state.events, {
    teamId: sellerTeamId,
    type: 'AUCTION_STARTED',
    tileId,
    atomicNumber: element.atomicNumber,
    description: `Lelang dibuka untuk ${element.symbol} (${element.nameEn}) dengan harga minimum ${auctionMinKK.toLocaleString(
      'id-ID'
    )} KK (70%).`,
  });

  return {
    ok: true,
    state: {
      ...state,
      activeAuction: auction,
      phase: 'AUCTION_ACTIVE',
      events,
      stateVersion: state.stateVersion + 1,
      updatedAt: Date.now(),
    },
  };
}

function recomputeAuctionLeader(
  offersByTeam: Record<string, number>,
  offerTimestamps: Record<string, number>,
  teams: Team[],
  minimumBidKK: number
): { highestBidderTeamId: string | null; currentBidKK: number } {
  let bestTeamId: string | null = null;
  let bestBid = -1;
  let bestTime = Number.POSITIVE_INFINITY;

  for (const [teamId, offer] of Object.entries(offersByTeam)) {
    const team = teams.find((t) => t.id === teamId);
    if (!team || team.isBankrupt) continue;
    if (!Number.isFinite(offer) || offer < minimumBidKK || offer > team.balanceKK) continue;

    const ts = offerTimestamps[teamId] ?? Number.MAX_SAFE_INTEGER;
    if (offer > bestBid || (offer === bestBid && ts < bestTime)) {
      bestBid = offer;
      bestTeamId = teamId;
      bestTime = ts;
    }
  }

  return bestTeamId
    ? { highestBidderTeamId: bestTeamId, currentBidKK: bestBid }
    : { highestBidderTeamId: null, currentBidKK: minimumBidKK };
}

export function placeAuctionBid(state: GameState, bidderTeamId: string, amountKK: number): ActionResult {
  const auction = state.activeAuction;
  if (!auction || auction.status !== 'active') {
    return { ok: false, error: 'No active auction.', state };
  }
  if (bidderTeamId === auction.sellerTeamId) {
    return { ok: false, error: 'Seller cannot bid on their own auction.', state };
  }

  const bidder = state.teams.find((t) => t.id === bidderTeamId);
  if (!bidder || bidder.isBankrupt) {
    return { ok: false, error: 'Invalid or bankrupt bidder.', state };
  }
  if (!Number.isFinite(amountKK) || amountKK <= 0) {
    return { ok: false, error: 'Offer amount must be a positive number.', state };
  }

  const normalizedAmount = Math.round(amountKK);
  const el = auction.atomicNumber ? ELEMENTS_BY_ID[auction.atomicNumber] : null;
  const floorMinKK =
    auction.minimumBidKK ??
    (el ? calculateAuctionMinimum(el.basePriceKK, state.economyConfig) : auction.currentBidKK);

  if (normalizedAmount < floorMinKK) {
    return {
      ok: false,
      error: `Offer must be at least the 70% minimum bid (${floorMinKK.toLocaleString('id-ID')} KK).`,
      state,
    };
  }
  if (normalizedAmount > bidder.balanceKK) {
    return { ok: false, error: 'Offer cannot exceed team balance.', state };
  }

  const now = Date.now();
  const prevOffers = auction.offersByTeam || {};
  const previousBidKK = typeof prevOffers[bidderTeamId] === 'number' ? prevOffers[bidderTeamId] : null;
  const actionType: 'bid' | 'increase' | 'decrease' =
    previousBidKK === null ? 'bid' : normalizedAmount >= previousBidKK ? 'increase' : 'decrease';

  const nextOffers: Record<string, number> = {
    ...prevOffers,
    [bidderTeamId]: normalizedAmount,
  };
  const nextTimestamps: Record<string, number> = {
    ...(auction.offerTimestamps || {}),
    [bidderTeamId]: now,
  };

  const { highestBidderTeamId, currentBidKK } = recomputeAuctionLeader(
    nextOffers,
    nextTimestamps,
    state.teams,
    floorMinKK
  );

  const updatedAuction: AuctionState = {
    ...auction,
    minimumBidKK: floorMinKK,
    currentBidKK,
    highestBidderTeamId,
    offersByTeam: nextOffers,
    offerTimestamps: nextTimestamps,
    bidsHistory: [{ teamId: bidderTeamId, bidKK: normalizedAmount, timestamp: now }, ...auction.bidsHistory],
    revisionHistory: [
      {
        teamId: bidderTeamId,
        previousBidKK,
        newBidKK: normalizedAmount,
        action: actionType,
        timestamp: now,
      },
      ...(auction.revisionHistory || []),
    ],
  };

  const leaderTeam = state.teams.find((t) => t.id === highestBidderTeamId);
  const verb =
    actionType === 'bid'
      ? 'mengajukan penawaran'
      : actionType === 'increase'
      ? 'menaikkan penawaran menjadi'
      : 'menurunkan penawaran menjadi';

  const events = appendEvent(state.events, {
    teamId: bidderTeamId,
    type: 'AUCTION_BID_PLACED',
    description: `${bidder.name} ${verb} ${normalizedAmount.toLocaleString('id-ID')} KK (Pemimpin: ${
      leaderTeam?.name || '-'
    } · ${currentBidKK.toLocaleString('id-ID')} KK).`,
  });

  return {
    ok: true,
    state: {
      ...state,
      activeAuction: updatedAuction,
      events,
      stateVersion: state.stateVersion + 1,
      updatedAt: now,
    },
  };
}

export function finalizeAuction(state: GameState): ActionResult {
  const auction = state.activeAuction;
  if (!auction || auction.status !== 'active') {
    return { ok: false, error: 'No active auction.', state };
  }

  if (!auction.highestBidderTeamId) {
    return {
      ok: true,
      state: {
        ...state,
        activeAuction: null,
        phase: 'TURN_END',
        events: appendEvent(state.events, {
          teamId: auction.sellerTeamId,
          type: 'AUCTION_NO_BIDS',
          description: 'Lelang selesai tanpa penawar. Properti tetap milik penjual.',
        }),
        stateVersion: state.stateVersion + 1,
        updatedAt: Date.now(),
      },
    };
  }

  const updatedTeams = state.teams.map((t) => ({ ...t }));
  const seller = updatedTeams.find((t) => t.id === auction.sellerTeamId);
  const buyer = updatedTeams.find((t) => t.id === auction.highestBidderTeamId);

  if (!seller || !buyer || buyer.id === seller.id || buyer.balanceKK < auction.currentBidKK) {
    return { ok: false, error: 'Buyer lacks sufficient funds to settle auction.', state };
  }

  const existingProp = state.properties[auction.tileId];
  if (!existingProp || existingProp.ownerTeamId !== seller.id) {
    return { ok: false, error: 'Seller no longer owns this property.', state };
  }

  buyer.balanceKK -= auction.currentBidKK;
  seller.balanceKK += auction.currentBidKK;

  const cleanProp: PropertyOwnership = {
    tileId: auction.tileId,
    pathIndex: auction.pathIndex,
    atomicNumber: auction.atomicNumber,
    ownerTeamId: buyer.id,
    smallCompanies: 0,
    hasLargeCompany: false,
  };

  const el = auction.atomicNumber ? ELEMENTS_BY_ID[auction.atomicNumber] : null;
  const events = appendEvent(state.events, {
    teamId: buyer.id,
    type: 'AUCTION_COMPLETED',
    amountKK: -auction.currentBidKK,
    balanceAfterKK: buyer.balanceKK,
    tileId: auction.tileId,
    atomicNumber: auction.atomicNumber,
    description: `${seller.name} MENERIMA tawaran ${buyer.name} untuk ${el?.symbol || ''} (${
      el?.nameEn || auction.tileId
    }) bersih tanpa perusahaan seharga ${auction.currentBidKK.toLocaleString('id-ID')} KK.`,
  });

  return {
    ok: true,
    state: {
      ...state,
      teams: updatedTeams,
      properties: { ...state.properties, [auction.tileId]: cleanProp },
      activeAuction: null,
      phase: 'TURN_END',
      events,
      stateVersion: state.stateVersion + 1,
      updatedAt: Date.now(),
    },
  };
}

export function rejectAuction(state: GameState, reason?: string): ActionResult {
  const auction = state.activeAuction;
  if (!auction || auction.status !== 'active') {
    return { ok: false, error: 'No active auction to reject.', state };
  }

  const seller = state.teams.find((t) => t.id === auction.sellerTeamId);
  const el = auction.atomicNumber ? ELEMENTS_BY_ID[auction.atomicNumber] : null;
  const events = appendEvent(state.events, {
    teamId: auction.sellerTeamId,
    type: 'AUCTION_REJECTED',
    tileId: auction.tileId,
    atomicNumber: auction.atomicNumber,
    description:
      reason ||
      `${seller?.name || 'Penjual'} MENOLAK lelang ${el?.symbol || ''} (${
        el?.nameEn || auction.tileId
      }). Tidak ada perpindahan properti atau dana.`,
  });

  return {
    ok: true,
    state: {
      ...state,
      activeAuction: null,
      phase: 'TURN_END',
      events,
      stateVersion: state.stateVersion + 1,
      updatedAt: Date.now(),
    },
  };
}

export function resolveQuizResult(
  state: GameState,
  selectedOrCorrect: 'A' | 'B' | 'C' | 'D' | boolean
): ActionResult {
  if (!state.activeQuiz) return { ok: false, error: 'No active quiz.', state };
  const isCorrect =
    typeof selectedOrCorrect === 'boolean'
      ? selectedOrCorrect
      : selectedOrCorrect === state.activeQuiz.correctOptionId;

  const updatedTeams = state.teams.map((t) => ({ ...t }));
  const team = updatedTeams[state.activeTeamIndex];

  let delta = 0;
  if (isCorrect) {
    delta = state.economyConfig.educationalRewards.quizRewardKK;
    team.balanceKK += delta;
  } else {
    team.quizFailures += 1;
    if (state.economyConfig.educationalRewards.skipNextIncomeOnQuizFail) {
      team.skipNextIncome = true;
    }
    if (team.quizFailures >= 7) {
      team.isBankrupt = true;
      team.bankruptReason = 'Bangkrut karena gagal quiz kimia sebanyak 7 kali!';
    }
  }

  const events = appendEvent(state.events, {
    teamId: team.id,
    type: isCorrect ? 'QUIZ_CORRECT' : 'QUIZ_FAILED',
    amountKK: isCorrect ? delta : 0,
    balanceAfterKK: team.balanceKK,
    description: isCorrect
      ? `${team.name} menjawab quiz dengan BENAR (+${delta.toLocaleString('id-ID')} KK)!`
      : `${team.name} GAGAL menjawab quiz (${team.quizFailures}/7 kegagalan).`,
  });

  return {
    ok: true,
    state: {
      ...state,
      teams: updatedTeams,
      activeQuiz: null,
      activeDrawEventId: null,
      quizDeadline: null,
      phase: 'TURN_END',
      events,
      stateVersion: state.stateVersion + 1,
      updatedAt: Date.now(),
    },
  };
}

export function resolveStudyCaseResult(state: GameState, isApproved: boolean): ActionResult {
  const activeTeam = state.teams[state.activeTeamIndex];
  if (!activeTeam) {
    return { ok: false, error: 'Active team not found.', state };
  }

  if (isApproved) {
    const updatedTeams = state.teams.map((t) => ({ ...t }));
    const team = updatedTeams[state.activeTeamIndex];
    const delta = state.economyConfig.educationalRewards.studyCaseRewardKK;
    team.balanceKK += delta;
    team.jailCards += 1;

    const events = appendEvent(state.events, {
      teamId: team.id,
      type: 'CASE_APPROVED',
      amountKK: delta,
      balanceAfterKK: team.balanceKK,
      description: `${team.name} lulus Studi Kasus (+${delta.toLocaleString('id-ID')} KK & +1 Kartu Bebas Penjara)!`,
    });

    return {
      ok: true,
      state: {
        ...state,
        teams: updatedTeams,
        activeStudyCase: null,
        activeDrawEventId: null,
        phase: 'TURN_END',
        events,
        stateVersion: state.stateVersion + 1,
        updatedAt: Date.now(),
      },
    };
  }

  const nextVersion = state.stateVersion + 1;
  const updatedTeams = state.teams.map((t, idx) => {
    if (idx !== state.activeTeamIndex) return { ...t };
    const nextFails = t.studyCaseFailures + 1;
    return {
      ...t,
      studyCaseFailures: nextFails,
      ...(nextFails >= 3
        ? {
            isBankrupt: true,
            bankruptReason: 'Bangkrut karena gagal studi kasus kimia sebanyak 3 kali!',
          }
        : {}),
    };
  });
  const failedTeam = updatedTeams[state.activeTeamIndex];
  const jailedState = sendPlayerToJail(
    {
      ...state,
      teams: updatedTeams,
      activeStudyCase: null,
      activeDrawEventId: null,
    },
    failedTeam.id,
    {
      eventType: 'CASE_REJECTED',
      description: `${failedTeam.name} ditolak pada Studi Kasus (${failedTeam.studyCaseFailures}/3 kegagalan) & dikirim ke Penjara.`,
      phaseAfter: 'TURN_END',
      stateVersionOverride: nextVersion,
    }
  );

  return {
    ok: true,
    state: jailedState,
  };
}

export function payJailBailOrCard(state: GameState, teamId: string, method: 'bail' | 'card'): ActionResult {
  const activeTeam = state.teams[state.activeTeamIndex];
  if (!activeTeam || activeTeam.id !== teamId || !activeTeam.isInJail) {
    return { ok: false, error: 'Team is not currently in jail on their turn.', state };
  }

  const updatedTeams = state.teams.map((t) => ({ ...t }));
  const team = updatedTeams[state.activeTeamIndex];
  const configuredBail = Number(state.economyConfig.educationalRewards.jailBailKK ?? DEFAULT_JAIL_BAIL_KK);
  const bailAmount = Number.isFinite(configuredBail) && configuredBail > 0 ? configuredBail : DEFAULT_JAIL_BAIL_KK;

  if (method === 'card') {
    if (team.jailCards <= 0) return { ok: false, error: 'No Get Out of Jail Free cards available.', state };
    team.jailCards -= 1;
    team.isInJail = false;
    team.jailTurns = 0;
    team.jailStatus = 'released';
  } else {
    if (team.balanceKK < bailAmount) {
      return {
        ok: false,
        error: `Saldo tidak cukup untuk membayar denda penjara (${bailAmount.toLocaleString('id-ID')} KK).`,
        state,
      };
    }
    team.balanceKK -= bailAmount;
    team.isInJail = false;
    team.jailTurns = 0;
    team.jailStatus = 'released';
  }

  const events = appendEvent(state.events, {
    teamId: team.id,
    type: method === 'card' ? 'JAIL_CARD_USED' : 'JAIL_BAIL_PAID',
    amountKK: method === 'bail' ? -bailAmount : 0,
    balanceAfterKK: team.balanceKK,
    description:
      method === 'card'
        ? `${team.name} bebas dari Penjara menggunakan Kartu Bebas Penjara.`
        : `${team.name} membayar ${bailAmount.toLocaleString('id-ID')} KK kepada bank untuk keluar dari Penjara.`,
  });

  return {
    ok: true,
    state: {
      ...state,
      teams: updatedTeams,
      events,
      stateVersion: state.stateVersion + 1,
      updatedAt: Date.now(),
    },
  };
}

export function advanceToNextTurn(state: GameState): GameState {
  if (
    state.phase === 'GAME_OVER' ||
    state.phase === 'QUIZ_ACTIVE' ||
    state.phase === 'STUDY_CASE_ACTIVE' ||
    state.phase === 'AUCTION_ACTIVE'
  ) {
    return state;
  }

  const activeTeams = state.teams.filter((t) => !t.isBankrupt);
  if (activeTeams.length <= 1) {
    const winner = activeTeams[0] ?? state.teams[0];
    return {
      ...state,
      phase: 'GAME_OVER',
      winnerTeamId: winner?.id ?? null,
      activeQuiz: null,
      activeDrawEventId: null,
      quizDeadline: null,
      activeStudyCase: null,
      studyCaseVotes: {},
      activeAuction: null,
      events: appendEvent(state.events, {
        teamId: winner?.id,
        type: 'GAME_WON',
        description: `Permainan selesai! ${winner?.name} keluar sebagai pemenang!`,
      }),
      stateVersion: state.stateVersion + 1,
      updatedAt: Date.now(),
    };
  }

  let nextIdx = (state.activeTeamIndex + 1) % state.teams.length;
  let guard = 0;
  while (state.teams[nextIdx].isBankrupt && guard < state.teams.length) {
    nextIdx = (nextIdx + 1) % state.teams.length;
    guard++;
  }

  const nextTeam = state.teams[nextIdx];
  return {
    ...state,
    activeTeamIndex: nextIdx,
    phase: 'TURN_START',
    activeQuiz: null,
    activeDrawEventId: null,
    quizDeadline: null,
    activeStudyCase: null,
    events: appendEvent(state.events, {
      teamId: nextTeam.id,
      type: 'TURN_CHANGED',
      description: `Giliran berpindah ke ${nextTeam.name}.`,
    }),
    stateVersion: state.stateVersion + 1,
    updatedAt: Date.now(),
  };
}

/* =====================================================================
 * AUTHORIZED ADMIN MUTATION PRIMITIVES (Shared Engine §14.2)
 * Note: Admin audit logs are recorded separately on the server audit store.
 * ===================================================================== */

export function adminMoveTeam(state: GameState, teamId: string, targetPathIndex: number): GameState {
  return resolveTileLanding(state, teamId, targetPathIndex, 'admin').state;
}

export function adminUpdateTeam(
  state: GameState,
  teamId: string,
  patch: Partial<
    Pick<
      Team,
      | 'name'
      | 'members'
      | 'pieceType'
      | 'color'
      | 'balanceKK'
      | 'jailCards'
      | 'isInJail'
      | 'jailTurns'
      | 'jailStatus'
      | 'lastJailEventId'
      | 'quizFailures'
      | 'studyCaseFailures'
      | 'skipNextIncome'
      | 'isBankrupt'
      | 'bankruptReason'
    >
  >
): GameState {
  return {
    ...state,
    teams: state.teams.map((t) => (t.id === teamId ? { ...t, ...patch } : t)),
    stateVersion: state.stateVersion + 1,
    updatedAt: Date.now(),
  };
}

export function adminSetActiveTurn(
  state: GameState,
  teamIndex: number,
  phase: GamePhase = 'TURN_START'
): GameState {
  const idx = Math.max(0, Math.min(state.teams.length - 1, teamIndex));
  return {
    ...state,
    activeTeamIndex: idx,
    phase,
    stateVersion: state.stateVersion + 1,
    updatedAt: Date.now(),
  };
}

export function adminSetPropertyOwner(
  state: GameState,
  tileId: string,
  ownerTeamId: string | null
): GameState {
  const tile = TILES_BY_ID[tileId];
  if (!tile || tile.tileType !== 'element') return state;
  const nextProps = { ...state.properties };
  if (!ownerTeamId) {
    delete nextProps[tileId];
  } else {
    const existing = nextProps[tileId];
    nextProps[tileId] = {
      tileId,
      pathIndex: tile.pathIndex,
      atomicNumber: tile.atomicNumber,
      ownerTeamId,
      smallCompanies: existing?.smallCompanies ?? 0,
      hasLargeCompany: existing?.hasLargeCompany ?? false,
    };
  }
  return {
    ...state,
    properties: nextProps,
    stateVersion: state.stateVersion + 1,
    updatedAt: Date.now(),
  };
}

export function adminSetCompanyLevel(
  state: GameState,
  tileId: string,
  smallCompanies: number,
  hasLargeCompany: boolean
): GameState {
  const prop = state.properties[tileId];
  if (!prop) return state;
  return {
    ...state,
    properties: {
      ...state.properties,
      [tileId]: {
        ...prop,
        smallCompanies: hasLargeCompany ? 0 : Math.max(0, Math.min(4, smallCompanies)),
        hasLargeCompany,
      },
    },
    stateVersion: state.stateVersion + 1,
    updatedAt: Date.now(),
  };
}

export function adminForceWinner(state: GameState, winnerTeamId: string | null): GameState {
  if (!winnerTeamId) {
    const firstActiveIdx = state.teams.findIndex((t) => !t.isBankrupt);
    const safeIdx =
      state.teams[state.activeTeamIndex] && !state.teams[state.activeTeamIndex].isBankrupt
        ? state.activeTeamIndex
        : firstActiveIdx >= 0
        ? firstActiveIdx
        : 0;
    return {
      ...state,
      phase: 'TURN_START',
      activeTeamIndex: safeIdx,
      winnerTeamId: null,
      activeQuiz: null,
      activeDrawEventId: null,
      quizDeadline: null,
      activeStudyCase: null,
      studyCaseVotes: {},
      activeAuction: null,
      events: appendEvent(state.events, {
        type: 'GAME_RESUMED',
        description: 'Admin melanjutkan kembali pertandingan.',
      }),
      stateVersion: state.stateVersion + 1,
      updatedAt: Date.now(),
    };
  }
  const winnerTeam = state.teams.find((t) => t.id === winnerTeamId);
  if (!winnerTeam) return state;
  return {
    ...state,
    phase: 'GAME_OVER',
    winnerTeamId: winnerTeam.id,
    activeQuiz: null,
    activeDrawEventId: null,
    quizDeadline: null,
    activeStudyCase: null,
    studyCaseVotes: {},
    activeAuction: null,
    events: appendEvent(state.events, {
      teamId: winnerTeam.id,
      type: 'GAME_WON',
      description: `Admin menetapkan ${winnerTeam.name} sebagai pemenang pertandingan!`,
    }),
    stateVersion: state.stateVersion + 1,
    updatedAt: Date.now(),
  };
}

export function adminAddTeam(state: GameState, name: string, pieceType: PieceType = 'atom'): GameState {
  if (state.teams.length >= 4) return state;
  const idx = state.teams.length;
  const newTeam: Team = {
    id: `team_${Date.now().toString(36)}`,
    name: name.trim() || `Tim ${idx + 1}`,
    color: DEFAULT_COLORS[idx % DEFAULT_COLORS.length],
    tokenIcon: DEFAULT_ICONS[idx % DEFAULT_ICONS.length],
    pieceType,
    members: [{ name: `Pemain ${idx + 1}` }],
    balanceKK: state.economyConfig.startingCapitalKK,
    position: 0,
    jailCards: 0,
    isInJail: false,
    jailTurns: 0,
    jailStatus: 'none',
    lastJailEventId: null,
    studyCaseFailures: 0,
    quizFailures: 0,
    skipNextIncome: false,
    isBankrupt: false,
    netWorthKK: state.economyConfig.startingCapitalKK,
  };
  return {
    ...state,
    teams: [...state.teams, newTeam],
    stateVersion: state.stateVersion + 1,
    updatedAt: Date.now(),
  };
}

export function adminRemoveTeam(state: GameState, teamId: string): GameState {
  if (state.teams.length <= 2) return state;
  const filtered = state.teams.filter((t) => t.id !== teamId);
  const nextProps = { ...state.properties };
  Object.keys(nextProps).forEach((k) => {
    if (nextProps[k].ownerTeamId === teamId) delete nextProps[k];
  });
  const nextMain = { ...state.mainProperties };
  Object.keys(nextMain).forEach((k) => {
    if (nextMain[k].ownerTeamId === teamId) delete nextMain[k];
  });
  return {
    ...state,
    teams: filtered,
    activeTeamIndex: Math.min(state.activeTeamIndex, filtered.length - 1),
    properties: nextProps,
    mainProperties: nextMain,
    stateVersion: state.stateVersion + 1,
    updatedAt: Date.now(),
  };
}

export function adminUpdateEconomy(
  state: GameState,
  economyConfig: Partial<EconomyConfig>
): GameState {
  const jailBailChanged =
    economyConfig.educationalRewards?.jailBailKK !== undefined &&
    economyConfig.educationalRewards.jailBailKK !== state.economyConfig.educationalRewards.jailBailKK;
  return {
    ...state,
    economyConfig: {
      ...state.economyConfig,
      ...economyConfig,
      schemaVersion: CURRENT_ECONOMY_SCHEMA_VERSION,
      businessIncome: {
        ...state.economyConfig.businessIncome,
        ...(economyConfig.businessIncome || {}),
      },
      educationalRewards: {
        ...state.economyConfig.educationalRewards,
        ...(economyConfig.educationalRewards || {}),
        jailBailAdminOverride: jailBailChanged
          ? true
          : (economyConfig.educationalRewards?.jailBailAdminOverride ??
            state.economyConfig.educationalRewards.jailBailAdminOverride ??
            false),
      },
    },
    stateVersion: state.stateVersion + 1,
    updatedAt: Date.now(),
  };
}
