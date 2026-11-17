export type PieceType = 'flask' | 'atom' | 'microscope' | 'goggles';

export type MatterState = 'Solid' | 'Liquid' | 'Gas' | 'Unknown';

export type TemperatureUnit = 'C' | 'F' | 'K';

export type BoardColorMode = 'category' | 'state';

export type AIProviderId = 'gemini' | 'openrouter' | 'anthropic' | 'openai';

export interface ChemicalElement {
  atomicNumber: number;
  symbol: string;
  nameId: string;
  nameEn: string;
  atomicMassDisplay: string;
  massValueForPricing: number;
  roundedMassForPricing: number;
  basePriceKK: number;
  auctionMinimumKK: number;
  ownTileMaintenanceKK: number;
  massNumberInBrackets: boolean;
  pricingStatus: string;
  groupNumber?: number | null;
  traditionalGroup?: string | null;
  period?: number;
  category?: string;
  isLanthanide?: boolean;
  isActinide?: boolean;
  block?: string; // s, p, d, f
  electronConfig?: string;
  expandedElectronConfig?: string;
  electronShells?: number[];
  electronegativity?: number | null;
  meltingPointC?: number | null;
  boilingPointC?: number | null;
  densityGcm3?: number | null;
  ionizationEnergyEv?: number | null;
  atomicRadiusPm?: number | null;
  discoveryYear?: string | null;
  stateSTP?: string; // Solid, Liquid, Gas, Unknown
}

export interface MainPropertyDraft {
  id: string;
  name: string;
  nameEn?: string;
  draftPurchasePriceKK: number;
  draftBankTaxMaintenanceKK: number;
  status: string;
}

export type TileType =
  | 'start'
  | 'element'
  | 'main_property'
  | 'study_case'
  | 'quiz'
  | 'jail'
  | 'parking'
  | 'customs';

export interface BoardTile {
  tileId: string;
  pathIndex: number; // 0 to 129
  tileType: TileType;
  title: string;
  atomicNumber?: number; // 1 to 118 for elements
  elementSymbol?: string;
  mainPropertyId?: string;
  corner?: 'start' | 'jail' | 'parking' | 'customs';
  side: 'top' | 'right' | 'bottom' | 'left';
}

export const CURRENT_ECONOMY_SCHEMA_VERSION = 2;
export const DEFAULT_JAIL_BAIL_KK = 20000;

export interface EconomyConfig {
  schemaVersion?: number;
  currency: string;
  startingCapitalKK: number;
  elementPricing: {
    multiplierPerRoundedMass: number;
    minimumPrice: number;
    auctionRate: number;
    auctionRoundingUnit: number;
  };
  rent: {
    baseRentRate: number; // 0.075
    roundingUnit: number; // 10
    minimumRent: number; // 10
    multipliers: {
      noCompany: number; // 1
      completeSet: number; // 2
      oneSmallCompany: number; // 5
      twoSmallCompanies: number; // 15
      threeSmallCompanies: number; // 43
      fourSmallCompanies: number; // 60
      bigCompany: number; // 75
    };
    propertySetBonusEnabled: boolean;
  };
  construction: {
    smallCompanyCostRate: number; // 2 / 3
    minimumSmallCompanyCost: number; // 300
    roundingUnit: number; // 100
    bigCompanyUpgradeCostUnits: number; // 1
    maximumSmallCompanies: number; // 4
  };
  businessIncome: {
    noCompany: number; // 0
    oneSmallCompany: number; // 1.2 (120%)
    twoSmallCompanies: number; // 1.4 (140%)
    threeSmallCompanies: number; // 1.6 (160%)
    fourSmallCompanies: number; // 1.8 (180%)
    bigCompany: number; // 2.0 (200%)
    fixedStartSalary: number; // 0 in v3.0 approved rule; configurable DRAFT
  };
  maintenance: {
    ownPropertyMultiplier: number; // 2
    radiusRuleEnabled: boolean; // false (DRAFT)
    insolvencyRule?: 'destroy_companies' | 'bankrupt_if_negative';
  };
  mainPropertyRules?: {
    bankChargeDraftKK: number;
    ownerFeeBaseKK: number;
    multipliersByCount: number[];
  };
  educationalRewards: {
    quizRewardKK: number;
    studyCaseRewardKK: number;
    jailBailKK: number;
    jailBailAdminOverride?: boolean;
    jailDurationTurns?: number;
    skipNextIncomeOnQuizFail: boolean;
  };
}

export const DEFAULT_ECONOMY_CONFIG: EconomyConfig = {
  schemaVersion: CURRENT_ECONOMY_SCHEMA_VERSION,
  currency: 'KK',
  startingCapitalKK: 100000,
  elementPricing: {
    multiplierPerRoundedMass: 100,
    minimumPrice: 500,
    auctionRate: 0.7,
    auctionRoundingUnit: 100,
  },
  rent: {
    baseRentRate: 0.075,
    roundingUnit: 10,
    minimumRent: 10,
    multipliers: {
      noCompany: 1,
      completeSet: 2,
      oneSmallCompany: 5,
      twoSmallCompanies: 15,
      threeSmallCompanies: 43,
      fourSmallCompanies: 60,
      bigCompany: 75,
    },
    propertySetBonusEnabled: false,
  },
  construction: {
    smallCompanyCostRate: 2 / 3,
    minimumSmallCompanyCost: 300,
    roundingUnit: 100,
    bigCompanyUpgradeCostUnits: 1,
    maximumSmallCompanies: 4,
  },
  businessIncome: {
    noCompany: 0,
    oneSmallCompany: 1.2,
    twoSmallCompanies: 1.4,
    threeSmallCompanies: 1.6,
    fourSmallCompanies: 1.8,
    bigCompany: 2.0,
    fixedStartSalary: 0,
  },
  maintenance: {
    ownPropertyMultiplier: 2,
    radiusRuleEnabled: false,
    insolvencyRule: 'destroy_companies',
  },
  mainPropertyRules: {
    bankChargeDraftKK: 500,
    ownerFeeBaseKK: 500,
    multipliersByCount: [1, 2, 4, 8],
  },
  educationalRewards: {
    quizRewardKK: 2500,
    studyCaseRewardKK: 10000,
    jailBailKK: DEFAULT_JAIL_BAIL_KK,
    jailBailAdminOverride: false,
    jailDurationTurns: 3,
    skipNextIncomeOnQuizFail: false,
  },
};

export interface TeamMember {
  name: string;
}

export interface Team {
  id: string;
  name: string;
  color: string;
  tokenIcon: string;
  pieceType: PieceType;
  members: TeamMember[];
  balanceKK: number;
  position: number; // 0 - 129
  jailCards: number;
  isInJail: boolean;
  jailTurns: number;
  jailStatus?: 'none' | 'detained' | 'visiting' | 'released';
  lastJailEventId?: string | null;
  studyCaseFailures: number; // max 3 -> bankrupt
  quizFailures: number; // max 7 -> bankrupt
  skipNextIncome: boolean;
  isBankrupt: boolean;
  bankruptReason?: string;
  netWorthKK: number;
}

export interface PropertyOwnership {
  tileId: string;
  pathIndex: number;
  atomicNumber?: number;
  ownerTeamId: string;
  smallCompanies: number; // 0 - 4
  hasLargeCompany: boolean; // 1 large
  mortgaged?: boolean;
}

export interface MainPropertyOwnership {
  propertyId: string;
  ownerTeamId: string;
}

export type GamePhase =
  | 'LOBBY'
  | 'TURN_START'
  | 'ROLLING'
  | 'MOVING'
  | 'RESOLVING_TILE'
  | 'ELEMENT_PURCHASE'
  | 'MAIN_PROP_PURCHASE'
  | 'PAYMENT_PENDING'
  | 'QUIZ_ACTIVE'
  | 'STUDY_CASE_ACTIVE'
  | 'AUCTION_ACTIVE'
  | 'JAIL_DECISION'
  | 'TURN_END'
  | 'GAME_OVER';

export interface GameEventLog {
  id: string;
  timestamp: number;
  teamId?: string;
  type: string;
  description: string;
  amountKK?: number;
  balanceAfterKK?: number;
  tileId?: string;
  atomicNumber?: number;
}

export interface GeneratedQuizData {
  id: string;
  drawEventId?: string;
  topic: string;
  difficulty: 'mudah' | 'sedang' | 'sulit';
  relatedElements: number[];
  question: string;
  options: { id: 'A' | 'B' | 'C' | 'D'; text: string }[];
  // Stripped server-side until answer is locked/submitted; populated upon submit or Admin view
  correctOptionId?: 'A' | 'B' | 'C' | 'D';
  explanation?: string;
  sourceNotes?: string;
  fingerprint?: string;
  provider?: AIProviderId | string;
  model?: string;
  createdAt?: number;
  verified?: boolean;
  timeLimitSeconds: number;
}

export interface GeneratedStudyCaseData {
  id: string;
  drawEventId?: string;
  title: string;
  context: string;
  task: string;
  difficulty: 'mudah' | 'sedang' | 'sulit';
  relatedElements: number[];
  keyConcepts: string[];
  // Stripped from active team view before evaluation phase; accessible to peers/admin
  expectedAnswerOutline?: string[];
  judgingRubric: { criterion: string; description: string; maxPoints: number }[];
  learningExplanation?: string;
  fingerprint?: string;
  provider?: AIProviderId | string;
  model?: string;
  createdAt?: number;
  verified?: boolean;
}

export interface AISettingsConfig {
  provider: AIProviderId;
  model: string;
  fallbackProvider: AIProviderId | 'none';
  timeoutMs: number;
  maxOutputTokens: number;
  difficulty: 'mudah' | 'sedang' | 'sulit';
}

export const DEFAULT_AI_SETTINGS: AISettingsConfig = {
  provider: 'gemini',
  model: 'gemini-4-hydrogen',
  fallbackProvider: 'openrouter',
  timeoutMs: 25000,
  maxOutputTokens: 1400,
  difficulty: 'sedang',
};

export interface AuctionState {
  tileId: string;
  pathIndex: number;
  atomicNumber?: number;
  sellerTeamId: string;
  minimumBidKK?: number;
  currentBidKK: number;
  highestBidderTeamId: string | null;
  minIncrementKK: number;
  offersByTeam?: Record<string, number>;
  offerTimestamps?: Record<string, number>;
  bidsHistory: { teamId: string; bidKK: number; timestamp: number }[];
  revisionHistory?: {
    teamId: string;
    previousBidKK: number | null;
    newBidKK: number;
    action: 'bid' | 'increase' | 'decrease';
    timestamp: number;
  }[];
  status: 'active' | 'completed' | 'cancelled';
}

export interface GameState {
  gameId: string;
  mode: 'local' | 'online';
  roomCode?: string;
  hostId?: string;
  phase: GamePhase;
  teams: Team[];
  activeTeamIndex: number;
  lastDice: [number, number];
  properties: Record<string, PropertyOwnership>; // keyed by tileId
  mainProperties: Record<string, MainPropertyOwnership>;
  economyConfig: EconomyConfig;
  events: GameEventLog[];
  activeQuiz: GeneratedQuizData | null;
  activeDrawEventId?: string | null;
  quizDeadline: number | null;
  activeStudyCase: GeneratedStudyCaseData | null;
  studyCaseVotes: Record<string, 'approve' | 'reject'>;
  activeAuction: AuctionState | null;
  winnerTeamId: string | null;
  recentEducationalFingerprints?: string[];
  stateVersion: number;
  updatedAt: number;
}
