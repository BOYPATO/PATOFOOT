export const MAX_SQUAD_SIZE = 30;

export type Position = 'GK' | 'DF' | 'MF' | 'FW';

export type DetailedRole = 
  | 'GOL' 
  | 'ZAG' 
  | 'LAT' 
  | 'VOL' 
  | 'MEI' 
  | 'ATA';

export type Morale = 'Excelente' | 'Boa' | 'Regular' | 'Baixa' | 'Péssima';

export type SouthAmericanLeagueId =
  | 'liga_arg'
  | 'liga_col'
  | 'liga_uru'
  | 'liga_equ'
  | 'liga_chi'
  | 'liga_par'
  | 'liga_per'
  | 'liga_bol'
  | 'liga_ven';

export type EuropeanLeagueId =
  | 'eng_premier'
  | 'eng_championship'
  | 'eng_league_one'
  | 'eng_league_two'
  | 'esp_laliga'
  | 'ita_serie_a'
  | 'ger_bundesliga'
  | 'fra_ligue1'
  | 'por_primeira'
  | 'ned_eredivisie'
  | 'bel_pro_league'
  | 'tur_super_lig'
  | 'gre_super_league'
  | 'nor_eliteserien'
  | 'den_superliga'
  | 'sui_super_league'
  | 'swe_allsvenskan'
  | 'sco_premiership'
  | 'eu_special_1'
  | 'eu_special_2';

export type UefaContinentalId =
  | 'champions_league'
  | 'europa_league'
  | 'conference_league';

export type WorldLeagueId =
  | 'usa_mls'
  | 'mex_ligamx'
  | 'can_cpl'
  | 'sau_pro'
  | 'jpn_j1'
  | 'rus_premier'
  | 'egy_premier'
  | 'mar_botola';

export type WorldContinentalId = 'copa_internacional' | 'concacaf_champions' | 'afc_champions';

export type EnglishCupId =
  | 'eng_community_shield'
  | 'eng_fa_cup'
  | 'eng_efl_cup';

export type EuropeanCupId =
  | 'esp_copa_del_rey'
  | 'esp_supercopa'
  | 'ger_dfb_pokal'
  | 'ger_supercup'
  | 'fra_coupe_de_france'
  | 'fra_trophee_champions'
  | 'ita_coppa_italia'
  | 'ita_supercoppa'
  | 'por_taca_portugal'
  | 'por_supertaca'
  | 'ned_knvb_beker'
  | 'ned_johan_cruyff'
  | 'bel_croky_cup'
  | 'bel_supercup'
  | 'tur_turkiye_kupasi'
  | 'tur_super_kupa'
  | 'gre_kypello_elladas'
  | 'nor_nm_cup'
  | 'den_dbu_pokalen'
  | 'sui_schweizer_cup'
  | 'swe_svenska_cupen'
  | 'sco_scottish_cup'
  | 'eu_sp1_cup'
  | 'eu_sp2_cup';

export type SouthAmericanCupId =
  | 'sa_copa_argentina'
  | 'sa_supercopa_argentina'
  | 'sa_copa_colombia'
  | 'sa_superliga_colombia'
  | 'sa_copa_uruguay'
  | 'sa_supercopa_uruguay'
  | 'sa_copa_ecuador'
  | 'sa_supercopa_ecuador'
  | 'sa_copa_chile'
  | 'sa_supercopa_chile'
  | 'sa_copa_paraguay'
  | 'sa_supercopa_paraguay'
  | 'sa_copa_peru'
  | 'sa_supercopa_peru'
  | 'sa_copa_bolivia'
  | 'sa_supercopa_bolivia'
  | 'sa_copa_venezuela'
  | 'sa_supercopa_venezuela';

export type WorldCupId =
  | 'wl_cup_usa'
  | 'wl_cup_mex'
  | 'wl_cup_can'
  | 'wl_cup_sau'
  | 'wl_cup_jpn'
  | 'wl_cup_rus'
  | 'wl_cup_egy'
  | 'wl_cup_mar';

export type CompetitionType = 
  | 'serie_a' 
  | 'serie_b' 
  | 'serie_c' 
  | 'serie_d' 
  | 'copa_brasil'
  | 'supercopa_brasil'
  | 'recopa_sulamericana'
  | 'libertadores' 
  | 'sulamericana' 
  | 'estadual'
  | 'copa_nordeste'
  | 'copa_verde'
  | 'intercontinental'
  | 'super_mundial_clubes'
  | 'uefa_supercup'
  | 'amistoso_internacional'
  | EnglishCupId
  | EuropeanCupId
  | SouthAmericanCupId
  | WorldCupId
  | SouthAmericanLeagueId
  | EuropeanLeagueId
  | UefaContinentalId
  | WorldLeagueId
  | WorldContinentalId;

export interface PlayerSuspension {
  competition: CompetitionType;
  matchesRemaining: number;
  reason: 'YELLOW_CARDS' | 'RED_CARD';
  originMatchDate?: string;
  notes?: string;
}

export interface Player {
  id: string;
  name: string;
  nickname?: string;
  nationality?: string; // País de origem / seleção (ex: 'Brasil', 'Argentina', 'Uruguai', 'Holanda')
  photoUrl?: string; // Retrato oficial SoccerWiki
  actionPhotoUrl?: string; // Foto em ação oficial SoccerWiki
  soccerWikiId?: number;
  position: Position;
  detailedRole: DetailedRole;
  overall: number; // Força 50 - 99
  age: number;
  condition: number; // 0 - 100%
  morale: Morale;
  wage: number; // Salário mensal em R$
  marketValue: number; // Valor de mercado em R$
  contractYears: number;
  preferredFoot: 'Destro' | 'Canhoto' | 'Ambidestro';
  specialSkill: string; // Ex: 'Finalizador Clínico', 'Paredão', 'Maestro'
  
  // Season Stats & Disciplinary
  matches: number;
  goals: number;
  assists: number;
  yellowCards: number;
  redCards: number;
  competitionYellowCards?: Partial<Record<CompetitionType, number>>;
  competitionRedCards?: Partial<Record<CompetitionType, number>>;
  suspensions?: PlayerSuspension[];
  isSuspended: boolean;

  injuryWeeks: number; // 0 = healthy
  injuryDetails?: PlayerInjury;
  isStarter: boolean;
  isSubstitute: boolean;
  pitchSlot?: number; // 0 to 10 slot on pitch
  pitchX?: number; // Custom horizontal position on tactical pitch (0-100%)
  pitchY?: number; // Custom vertical position on tactical pitch (0-100%)
  pitchRoleCode?: string; // Custom tactical position code (e.g., 'PE', 'SA', 'MAC', 'VOL')
  squadNumber: number;
  ratingAverage: number;

  // Training & Player Evolution / Regression
  trainingProgress?: number; // 0 to 100% progress towards next +1 OVR
  regressionProgress?: number; // 0 to 100% negative form/stagnation towards -1 OVR
  seasonStartOverall?: number; // Baseline overall at season start to show +/- evolution
  potential?: number; // Maximum potential rating (50 - 99)
  individualTrainingFocus?: TrainingFocus;
  evolutionsCount?: number; // Net career overall delta (+/-)
  secondaryRoles?: DetailedRole[]; // Posições secundárias dominadas sem penalidade tática
  retrainingTargetRole?: DetailedRole; // Nova posição em treinamento de adaptação
  retrainingProgress?: number; // 0 a 100% de adaptação à nova função

  // Loan & Transfer Market Status
  isLoan?: boolean;
  loanParentClubId?: string; // Original owner club
  loanCurrentClubId?: string; // Club where currently playing on loan
  loanRoundsRemaining?: number; // Rounds remaining on loan (19 = 6 months, 38 = 1 year)
  loanDurationMonths?: 6 | 12; // 6 months (half season) or 12 months (1 full year)
  loanWageContributionPct?: number; // % of wage paid by borrowing club (e.g. 50, 70, 100)
  loanOriginalWage?: number; // Full 100% monthly wage prior to loan split
  loanBuyOptionFee?: number; // Fixed fee to trigger buyout clause
  loanFeePaid?: number; // Upfront compensation fee paid to parent club
  isListedForLoan?: boolean; // Listed as available for loan
  listedLoanBuyOptionFee?: number; // Suggested/fixed buyout option configured when listing for loan
  isListedForSale?: boolean; // Listed as available for transfer sale
  askingPrice?: number; // Custom price set by manager when listed for sale

  // Contract Lifecycle, Release Clause, Bosman Pre-Contract & Retirement
  releaseClause?: number; // Multa rescisória em R$
  preContractClubId?: string; // Clube de destino na virada da temporada (Lei Bosman)
  preContractClubName?: string;
  preContractWage?: number;
  preContractYears?: number;
  retiringAtSeasonEnd?: boolean; // Veterano que anunciou aposentadoria ao fim da temporada
  lastRenewalSeason?: number;
  lastRenewalRound?: number;

  // International Duty (Seleção Brasileira / Datas FIFA)
  internationalCaps?: number;
  internationalGoals?: number;
  lastCalledUpSeason?: number;
  lastCalledUpRound?: number;
}

export type InjurySeverity = 'Leve' | 'Moderada' | 'Grave' | 'Gravíssima';
export type MedicalStage = 'Fisioterapia' | 'Transição Física' | 'Treino com Bola' | 'Liberado';

export interface PlayerInjury {
  injuryType: string; // Ex: 'Estiramento Grau II no Posterior da Coxa'
  diagnosisDate: string; // YYYY-MM-DD
  severity: InjurySeverity;
  initialDays: number;
  remainingDays: number;
  stage: MedicalStage;
  doctorNotes: string;
  treatmentPlan: string;
  facilityReductionDays?: number;
  lastReportDate?: string;
}

export type TrainingFocus = 
  | 'EQUILIBRADO' 
  | 'FINALIZACAO' 
  | 'DEFESA' 
  | 'PASSE' 
  | 'GOLEIRO' 
  | 'FISICO';

export type StaffRoleType =
  | 'Preparador Físico'
  | 'Médico-Chefe'
  | 'Analista de Desempenho'
  | 'Treinador de Ataque'
  | 'Treinador de Defesa'
  | 'Treinador de Goleiros';

export interface CoachStaff {
  id: string;
  name: string;
  role: StaffRoleType;
  stars: number; // 1 to 5
  wage: number; // Weekly cost in R$
  bonusDescription: string;
}

export type FormationType = '4-4-2' | '4-3-3' | '3-5-2' | '4-2-3-1' | '5-3-2' | '4-1-4-1' | '3-4-3';
export type TacticalMentality = 'Muito Defensivo' | 'Defensivo' | 'Equilibrado' | 'Ofensivo' | 'Pressão Total';
export type MarkingStyle = 'Leve' | 'Normal' | 'Pesada';
export type PassingStyle = 'Curto (Posse)' | 'Misto' | 'Longo (Contra-ataque)';

export type AssistantLineupMode = 'EQUILIBRADO' | 'FORCA_MAXIMA' | 'POUPAR_FADIGA';
export type CornerRoutineType = 'PRIMEIRO_PAU' | 'SEGUNDO_PAU' | 'CURTO_ENSAIADO';
export type FreekickRoutineType = 'DIRETO_BARREIRA' | 'CHUVEIRO_AREA' | 'JOGADA_ENSAIADA';

export interface TacticalSettings {
  formation: FormationType;
  mentality: TacticalMentality;
  marking: MarkingStyle;
  passing: PassingStyle;
  penaltyTakerId?: string;
  penaltyOrderIds?: string[]; // Ordem oficial dos 5 batedores em disputa de pênaltis
  freekickTakerId?: string;
  cornerTakerId?: string;
  captainId?: string;
  viceCaptainId?: string;
  cornerRoutine?: CornerRoutineType;
  freekickRoutine?: FreekickRoutineType;
  aerialTargetIds?: string[];
  autoLineupAssistantEnabled?: boolean;
  autoLineupMode?: AssistantLineupMode;
  autoMatchSubsEnabled?: boolean;
}

export interface TacticalPreset {
  slotIndex: 0 | 1 | 2;
  name: string;
  formation: FormationType;
  mentality: TacticalMentality;
  marking: MarkingStyle;
  passing: PassingStyle;
  captainId?: string;
  penaltyTakerId?: string;
  freekickTakerId?: string;
  cornerTakerId?: string;
  cornerRoutine?: CornerRoutineType;
  freekickRoutine?: FreekickRoutineType;
  starterIds: string[];
  savedAtLabel?: string;
}

export interface Stadium {
  name: string;
  capacity: number;
  ticketPrice: number; // Preço do ingresso em R$
  level: number; // 1 to 5
}

export interface MonthlyFinanceEntry {
  month: number; // 1 (Jan) to 12 (Dez)
  monthLabel: string; // 'Jan', 'Fev', 'Mar', ...
  fullMonthName: string; // 'Janeiro', 'Fevereiro', ...
  seasonYear: number;
  openingBalance: number;
  closingBalance: number;
  income: number;
  expenses: number;
  netFlow: number;
  recorded: boolean;
}

export interface ClubFinancialPunishment {
  seasonYearApplied: number;
  transferBanUntilDate?: string; // YYYY-MM-DD (ex: '2027-07-01')
  pointsDeducted: number; // -3 ou -6 pontos na liga nacional
  fineAmount: number; // Multa regulatória STJD / Fair Play Financeiro
  forcedPlayerSaleId?: string;
  forcedPlayerSaleName?: string;
  forcedSaleAmount?: number;
  reputationPenaltyStars?: number;
  managerReputationLost?: number;
  severity: 'MODERADA' | 'GRAVE' | 'COLAPSO_FINANCEIRO';
  summary: string;
}

export interface SeasonFinancialAuditReport {
  seasonYear: number;
  clubId: string;
  clubName: string;
  clubShortName: string;
  startingBalance: number;
  endingBalance: number;
  totalIncomeSeason: number;
  totalExpensesSeason: number;
  operationalResult: number; // totalIncomeSeason - totalExpensesSeason
  spentMoreThanEarned: boolean;
  endedInRed: boolean;
  wasSackedForFinances: boolean;
  punishment?: ClubFinancialPunishment | null;
  warningOnlyMessage?: string;
}

export type FinanceCategory =
  | 'TICKETS'
  | 'SOCIOS'
  | 'SPONSORS'
  | 'TV_BROADCAST'
  | 'MERCHANDISING'
  | 'COMMERCIAL_EVENTS'
  | 'PRIZES'
  | 'TRANSFERS_IN'
  | 'WAGES_SQUAD'
  | 'STAFF_SCOUTS'
  | 'MATCHDAY_OPS'
  | 'FACILITIES_UPKEEP'
  | 'INFRASTRUCTURE'
  | 'TRANSFERS_OUT'
  | 'FINANCE_FEES';

export interface NamingRightsContract {
  id: string;
  brandName: string;
  sector: string;
  arenaDisplayName: string;
  originalStadiumName: string;
  signingBonus: number;
  monthlyFee: number;
  seasonsTotal: number;
  seasonsRemaining: number;
  signedSeasonYear: number;
  signedDate: string;
}

export type TvContractProfile = 'FIXO' | 'STREAMING' | 'PPV_CLASSICOS';

export interface TvBroadcastContract {
  id: string;
  networkName: string;
  profile: TvContractProfile;
  description: string;
  signingBonus: number;
  monthlyMultiplier: number; // e.g. 1.18 = +18% on monthlyBroadcastBase
  winBonusPerMatch: number;
  seasonYear: number;
  signedDate: string;
}

export interface CommercialArenaAssets {
  vipBoxesLevel: number; // 0..3 Camarotes VIP Corporativos
  museumTourLevel: number; // 0..3 Tour & Museu do Clube
  foodPlazaLevel: number; // 0..3 Shopping & Praça Gastronômica
}

export interface MerchandisingState {
  thirdKitLaunchedSeason: number | null;
  thirdKitName?: string;
  commemorativeLaunchedSeason?: number | null;
  boostUntilRound?: number;
  boostMultiplier?: number; // e.g. 1.35 during campaign window
  totalKitsSoldSeason: number;
}

export interface ArenaEventHistoryItem {
  id: string;
  title: string;
  date: string;
  round: number;
  netProfit: number;
}

export interface FriendlyTourHistoryItem {
  id: string;
  title: string;
  region: string;
  date: string;
  round: number;
  revenue: number;
  newSociosGained: number;
}

export interface BoardCapitalRecord {
  usedSeasonYear: number;
  optionId: 'BOARD_REINFORCEMENTS' | 'BOARD_INFRASTRUCTURE' | 'SAF_MINORITY_PARTNER';
  label: string;
  amountReceived: number;
  safMonthlySharePct: number; // 0 for board injection, e.g. 0.06 for SAF partner
  note: string;
  signedDate: string;
}

export interface ClubCommercialState {
  namingRights?: NamingRightsContract | null;
  tvContract?: TvBroadcastContract | null;
  assets: CommercialArenaAssets;
  merchandising: MerchandisingState;
  lastArenaEventRound?: number;
  eventsHostedThisSeason: number;
  eventHistory?: ArenaEventHistoryItem[];
  lastTourRound?: number;
  toursPlayedThisSeason: number;
  tourHistory?: FriendlyTourHistoryItem[];
  claimedSolidarityIds: string[];
  totalSolidaritySeason: number;
  boardInvestment?: BoardCapitalRecord | null;
}

export interface SeasonPrizeLineItem {
  competitionId: string;
  competitionName: string;
  category: 'LEAGUE' | 'CONTINENTAL_CUP' | 'DOMESTIC_CUP' | 'STATE_REGIONAL';
  positionOrStageLabel: string;
  participationAmount: number;
  positionBonusAmount: number;
  totalAmount: number;
}

export interface SeasonPrizeSettlementSummary {
  seasonYear: number;
  seasonLabel: string;
  settledDate: string;
  items: SeasonPrizeLineItem[];
  totalParticipationAwarded: number;
  totalPositionAwarded: number;
  totalSeasonEndAwarded: number;
  inSeasonCupPrizesEarned: number;
  grandTotalSeasonPrizes: number;
  balanceBeforeSettlement: number;
  balanceAfterSettlement: number; // Orçamento garantido para a próxima temporada
}

export interface FinanceLedgerEntry {
  id: string;
  date: string;
  category: FinanceCategory;
  type: 'INCOME' | 'EXPENSE';
  amount: number;
  description: string;
}

export interface ClubBankLoan {
  principalRemaining: number;
  originalPrincipal: number;
  monthlyInstallment: number;
  monthsRemaining: number;
  interestRateMonthly: number;
  takenDate: string;
}

export interface Finances {
  balance: number; // Saldo em caixa R$
  weeklySponsor: number;
  weeklyExpenses: number;
  stadiumLevel: number;
  trainingFacilityLevel: number; // Melhora evolução dos atletas
  medicalFacilityLevel: number; // Reduz tempo de lesões
  youthAcademyLevel: number; // Gera melhores promessas
  seasonTicketHolders: number;
  totalIncomeSeason: number;
  totalExpensesSeason: number;
  seasonStartBalance?: number;
  monthlyHistory?: MonthlyFinanceEntry[];
  previousMonthlyHistory?: MonthlyFinanceEntry[];
  lastPayrollMonthKey?: string; // Ex: '2026-01'
  lastRecordedIncomeTotal?: number;
  lastRecordedExpensesTotal?: number;
  activePunishment?: ClubFinancialPunishment | null;
  popularTicketPrice?: number;
  vipTicketPrice?: number;
  socioMonthlyFee?: number;
  socioTicketDiscountPct?: number;
  lastSocioGrowthDelta?: number;
  lastSocioCampaignRound?: number;
  seasonBreakdown?: Partial<Record<FinanceCategory, number>>;
  ledger?: FinanceLedgerEntry[];
  bankLoan?: ClubBankLoan | null;
  commercialHub?: ClubCommercialState;
  lastSeasonPrizeReport?: SeasonPrizeSettlementSummary | null;
}

export type Division = 'A' | 'B' | 'C' | 'D' | 'EST' | 'SA' | 'EU' | 'WL';

export interface ClubColors {
  primary: string;
  secondary: string;
  text: string;
}

export type SponsorSlotType = 'MASTER' | 'KIT_SUPPLIER' | 'SLEEVE' | 'SHORTS_STADIUM';

export type SponsorStrategyProfile =
  | 'Renda Fixa'
  | 'Equilibrado'
  | 'Bônus por Vitória'
  | 'Luvas Imediatas';

export interface SponsorOption {
  id: string;
  slot: SponsorSlotType;
  companyName: string;
  sector: string;
  shortLabel: string;
  accentColor: string;
  profile: SponsorStrategyProfile;
  signingBonus: number; // Valor pago à vista no ato da assinatura
  perRoundAmount: number; // Valor fixo pago por rodada
  winBonus: number; // Bônus pago em caso de vitória
  goalBonus: number; // Bônus por cada gol marcado
  totalRounds: number; // Duração total do contrato em rodadas
  terminationFee: number; // Multa rescisória para quebra antecipada
}

export interface SponsorContract extends SponsorOption {
  roundsRemaining: number;
  signedAtRound: number;
}

export interface Club {
  id: string;
  name: string;
  shortName: string;
  initials: string;
  state: string;
  division: Division;
  reputation: number; // 1 to 5
  reputationProgress?: number; // Fractional delta -1..+1 accumulated across seasons
  colors: ClubColors;
  stadium: Stadium;
  finances: Finances;
  tactics: TacticalSettings;
  tacticalPresets?: TacticalPreset[];
  squad: Player[];
  sponsors?: Partial<Record<SponsorSlotType, SponsorContract>>;
  teamTrainingFocus?: TrainingFocus;
  coaches?: CoachStaff[];
  isUser: boolean;
  managerName: string;
  managerPhotoUrl?: string;
  logoUrl?: string;
  soccerWikiId?: number;
  country?: string; // 'Brasil', 'Argentina', 'Inglaterra', 'Estados Unidos', 'Arábia Saudita', etc.
  southAmericanLeagueId?: SouthAmericanLeagueId;
  europeanLeagueId?: EuropeanLeagueId; // Liga europeia específica (ex: 4 divisões da Inglaterra)
  worldLeagueId?: WorldLeagueId; // Liga da América do Norte, Ásia/Rússia ou África
  rivals?: string[]; // IDs dos clubes rivais históricos e diretos
  youthAcademy?: YouthAcademyState; // Base do clube (limite de até 10 atletas) & Peneiras
  seasonStartSectorRatings?: {
    overall: number;
    defense: number;
    midfield: number;
    attack: number;
  };
}

export type YouthTryoutTier = 'COMUNITARIA' | 'ESTADUAL' | 'NACIONAL';

export type YouthAgeGroupFilter = 'ALL' | 'SUB_15' | 'SUB_17' | 'SUB_20';

export type YouthPotentialTier =
  | 'Joia da Base'
  | 'Grande Promessa'
  | 'Talento Promissor'
  | 'Em Lapidação';

export interface YouthAcademyBoy {
  id: string;
  player: Player;
  originCity: string;
  tryoutSource: string;
  joinedDate: string;
  categoryLabel: 'Sub-15' | 'Sub-17' | 'Sub-20';
  potentialTier: YouthPotentialTier;
  evaluatorNote: string;
}

export interface YouthTryoutCandidate extends YouthAcademyBoy {
  recruited?: boolean;
  dismissed?: boolean;
}

export type AutoTryoutFrequency = 'OFF' | 'MONTHLY' | 'QUARTERLY' | 'ANNUAL';

export interface YouthAcademyState {
  players: YouthAcademyBoy[]; // Máximo de 10 jogadores na base
  lastTryoutCandidates: YouthTryoutCandidate[];
  lastTryoutDate?: string;
  lastTryoutLabel?: string;
  totalTryoutsHeld: number;
  totalPromotedCount: number;
  autoTryoutFrequency?: AutoTryoutFrequency;
  autoTryoutTier?: YouthTryoutTier;
  autoTryoutRoleFocus?: DetailedRole | 'ALL';
  autoTryoutAgeGroup?: YouthAgeGroupFilter;
  autoRecruitBestGem?: boolean;
  lastAutoTryoutDate?: string;
}

export type PreMatchDerbyPosture = 'PADRAO' | 'SANGUE_FRIO' | 'CLIMA_DE_GUERRA';

export type EventType = 
  | 'KICKOFF'
  | 'GOL'
  | 'GOL_CONTRA'
  | 'PENALTI_GOL'
  | 'PENALTI_PERDIDO'
  | 'FALTA_PERIGOSA'
  | 'CARTAO_AMARELO'
  | 'CARTAO_VERMELHO'
  | 'LESAO'
  | 'CHUTE_TRAVE'
  | 'DEFESAÇA'
  | 'SUBSTITUICAO'
  | 'FIM_PRIMEIRO_TEMPO'
  | 'INICIO_SEGUNDO_TEMPO'
  | 'PALESTRA_INTERVALO'
  | 'ORDEM_TATICA'
  | 'GRITO_BEIRA_CAMPO'
  | 'FIM_JOGO';

export type InGameTacticOrder =
  | 'EQUILIBRADO'
  | 'PRESSAO_TOTAL'
  | 'RETRANCA'
  | 'CONTRA_ATAQUE'
  | 'CHUVEIRINHO'
  | 'SEGURAR_RESULTADO';

export type TouchlineShoutType =
  | 'ELOGIAR_ENTREGA'
  | 'COBRAR_RACA'
  | 'ARRISCAR_CHUTES'
  | 'ESFRIAR_JOGO'
  | 'PRESSAO_ASFIXIANTE'
  | 'TUDO_OU_NADA';

export type HalftimeTalkTone = 'ELOGIAR' | 'COBRAR_RACA' | 'AJUSTE_TATICO' | 'ORGULHO_CAMISA';

export interface MatchEvent {
  id: string;
  minute: number;
  type: EventType;
  teamId: string;
  playerId?: string;
  playerName: string;
  description: string;
  assistPlayerId?: string;
  assistPlayerName?: string;
  isHomeTeam: boolean;
}

export interface MatchAttackZones {
  left: number;   // %
  center: number; // %
  right: number;  // %
}

export interface MatchPlayerRatingSummary {
  playerId: string;
  playerName: string;
  clubId: string;
  clubShortName: string;
  detailedRole: string;
  squadNumber: number;
  rating: number;
  goals: number;
  assists: number;
  saves: number;
  yellowCards: number;
  redCards: number;
  isCaptain: boolean;
}

export interface MatchStats {
  homeShots: number;
  awayShots: number;
  homeShotsOnTarget: number;
  awayShotsOnTarget: number;
  homePossession: number; // %
  awayPossession: number;
  homeCorners: number;
  awayCorners: number;
  homeFouls: number;
  awayFouls: number;
  homeYellowCards: number;
  awayYellowCards: number;
  homeRedCards: number;
  awayRedCards: number;
  homePassAccuracy: number;
  awayPassAccuracy: number;
  homeXG?: number;
  awayXG?: number;
  homeAttackZones?: MatchAttackZones;
  awayAttackZones?: MatchAttackZones;
  matchRatings?: MatchPlayerRatingSummary[];
}

export type PenaltyTargetZone = 
  | 'TOP_LEFT' 
  | 'TOP_RIGHT' 
  | 'BOTTOM_LEFT' 
  | 'BOTTOM_RIGHT' 
  | 'CENTER';

export type PenaltyKickStyle = 'COLOCADA' | 'BOMBA' | 'CAVADINHA';
export type PenaltyKeeperDive = 'LEFT' | 'CENTER' | 'RIGHT';

export interface PenaltyKickRecord {
  id: string;
  roundNumber: number;
  isHomeTeam: boolean;
  teamId: string;
  shooterId: string;
  shooterName: string;
  keeperId: string;
  keeperName: string;
  targetZone: PenaltyTargetZone;
  kickStyle: PenaltyKickStyle;
  keeperDive: PenaltyKeeperDive;
  outcome: 'GOL' | 'DEFESA' | 'TRAVE' | 'FORA';
  scoreHomeAfter: number;
  scoreAwayAfter: number;
}

export interface Fixture {
  id: string;
  round: number;
  competition: CompetitionType;
  homeTeamId: string;
  awayTeamId: string;
  homeScore: number | null;
  awayScore: number | null;
  played: boolean;
  date?: string; // YYYY-MM-DD
  time?: string; // HH:MM
  stadiumName?: string;
  attendance?: number;
  ticketRevenue?: number;
  events?: MatchEvent[];
  stats?: MatchStats;
  cupPhase?: string; // Ex: 'Oitavas de Final', 'Quartas de Final', 'Semifinal', 'Grande Final', 'Fase de Grupos'
  groupName?: string; // Ex: 'Campeonato Potiguar (RN)', 'Grupo A'
  leg?: number; // 1 (Ida), 2 (Volta) ou undefined
  aggregateHomeScore?: number;
  aggregateAwayScore?: number;
  penaltiesHome?: number;
  penaltiesAway?: number;
  aggregateWinnerId?: string;
  penaltyKicks?: PenaltyKickRecord[];
  friendlyCommercialFee?: number;
  friendlyTourId?: string;
  friendlyTourTitle?: string;
}

export interface Standing {
  teamId: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
  form: ('V' | 'E' | 'D')[];
  group?: string; // For Libertadores / Sul-Americana / Estaduais tournament name (Ex: 'Campeonato Paulista (SP)')
  subGroup?: string; // Sub-grupo dentro de um Estadual (Ex: 'Grupo A', 'Grupo B', 'Grupo C')
}

export interface TransferOffer {
  id: string;
  playerId: string;
  playerName?: string;
  playerRole?: DetailedRole;
  playerOverall?: number;
  playerAge?: number;
  fromClubId: string;
  fromClubName?: string;
  toClubId: string;
  toClubName?: string;
  transferFee: number;
  offeredWage: number;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'COUNTER';
  date: string;
  offerType?: 'PERMANENT' | 'LOAN';
  loanWageSharePct?: number; // % of wage paid by borrower
  loanDurationRounds?: number; // e.g. 19 or 38 rounds
  loanBuyOptionFee?: number; // buyout option fee
  reason?: string;
  aiRecommendedPrice?: number;
  counterCount?: number;
}

export interface MedicalReportData {
  playerId: string;
  playerName: string;
  playerRole: DetailedRole;
  squadNumber: number;
  overall: number;
  injuryName: string;
  severity: InjurySeverity;
  initialDays: number;
  remainingDays: number;
  progressPercentage: number;
  stage: MedicalStage;
  status: 'NOVA_LESAO' | 'EVOLUCAO' | 'TRANSICAO' | 'TREINO_LEVE' | 'ALTA_MEDICA';
  treatmentPlan: string;
  doctorAdvice: string;
  medicalFacilityLevel?: number;
  facilityReductionDays?: number;
}

export interface SuspensionReportData {
  playerId: string;
  playerName: string;
  playerRole: DetailedRole;
  squadNumber: number;
  overall: number;
  competition: CompetitionType;
  competitionName: string;
  reason: 'YELLOW_CARDS' | 'RED_CARD';
  matchesSuspended: number;
  yellowCardsInCompetition: number;
  cleared?: boolean;
}

export interface InboxMessage {
  id: string;
  title: string;
  message: string;
  date: string;
  round: number;
  read: boolean;
  type:
    | 'TRANSFER'
    | 'FINANCE'
    | 'INJURY'
    | 'BOARD'
    | 'AWARD'
    | 'SUSPENSION'
    | 'LOAN'
    | 'SCOUTING'
    | 'JOB_OFFER'
    | 'NATIONAL_TEAM'
    | 'PRESS'
    | 'DRESSING_ROOM';
  offerId?: string;
  jobOfferId?: string;
  medicalReport?: MedicalReportData;
  suspensionDetails?: SuspensionReportData;
}

export interface TrophyRecord {
  year: number;
  seasonLabel?: string;
  competition: string;
  championTeamName: string;
  runnerUpTeamName: string;
  userWon: boolean;
}

export type IndividualAwardCategory =
  | 'BEST_PLAYER'
  | 'TOP_SCORER'
  | 'REVELATION'
  | 'BEST_GOALKEEPER';

export interface IndividualAwardRecord {
  id: string;
  year: number;
  competition: string;
  divisionCode: 'A' | 'B' | 'C' | 'D';
  category: IndividualAwardCategory;
  awardTitle: string;
  playerId: string;
  playerName: string;
  playerRole: DetailedRole;
  playerAge: number;
  playerOverall: number;
  clubId: string;
  clubName: string;
  clubColors?: ClubColors;
  userWon: boolean;
  statHighlight: string;
  goals: number;
  assists: number;
  matches: number;
  prizeAmount: number;
  marketValueBoost: number;
}

export type TransferDealCategory =
  | 'PURCHASE'
  | 'SWAP'
  | 'RELEASE_CLAUSE'
  | 'PRE_CONTRACT'
  | 'FREE_AGENT'
  | 'SALE'
  | 'BUY_OPTION'
  | 'LOAN_IN'
  | 'LOAN_OUT';

export interface TransferHistoryRecord {
  id: string;
  playerId: string;
  playerName: string;
  playerRole: DetailedRole;
  playerOverall: number;
  playerAge: number;
  fromClubId?: string;
  fromClubName: string;
  toClubId: string;
  toClubName: string;
  fee: number;
  wage: number;
  date: string; // YYYY-MM-DD
  round: number;
  seasonYear: number;
  category: TransferDealCategory;
  direction: 'IN' | 'OUT' | 'CPU';
  notes?: string;
}

export type PendingTransferDealKind =
  | 'PURCHASE'
  | 'SWAP'
  | 'RELEASE_CLAUSE'
  | 'FREE_AGENT'
  | 'LOAN_IN'
  | 'SCOUT_SIGNING'
  | 'SALE_OUT'
  | 'LOAN_OUT';

export interface PendingTransferDeal {
  id: string;
  dealKind: PendingTransferDealKind;
  player: Player;
  playerId: string;
  playerName: string;
  playerRole: DetailedRole;
  playerOverall: number;
  playerAge: number;
  fromClubId?: string;
  fromClubName: string;
  toClubId: string;
  toClubName: string;
  fee: number;
  offeredWage: number;
  offeredContractYears?: number; // Chosen contract duration (1 to 5 years)
  agreedDate: string; // YYYY-MM-DD
  agreedRound: number;
  arrivalDate: string; // YYYY-MM-DD when registration executes
  arrivalDisplayDate: string; // DD/MM/YYYY for UI display
  arrivalWindowLabel: string; // Ex: '01/07/2026 (Janela de Julho–Agosto)'
  swapOutPlayerId?: string;
  swapOutPlayerName?: string;
  loanDurationRounds?: number;
  loanDurationMonths?: 6 | 12;
  loanWageSharePct?: number;
  loanBuyOptionFee?: number;
  scoutProspectId?: string;
  scoutRegionName?: string;
}

export type ScoutRegionCategory = 'BRASIL' | 'AMERICA_SUL' | 'INTERNACIONAL';

export type ScoutAgeFocus = 'JOIAS_BASE' | 'SUB_23' | 'PRONTOS';

export type ScoutMissionDepth = 'EXPRESSO' | 'OBSERVACAO_CURTA' | 'IMERSAO_PROFUNDA';

export interface ScoutStaffMember {
  id: string;
  name: string;
  nationality: string;
  specialtyRegion: ScoutRegionCategory;
  specialtyLabel: string;
  stars: number; // 1 to 5
  weeklySalary: number;
  activeMissionId?: string;
}

export type ScoutRecommendationTier =
  | 'Joia Rara'
  | 'Alto Potencial'
  | 'Bom Custo-Benefício'
  | 'Observação';

export interface ScoutedProspect {
  id: string;
  missionId: string;
  discoveredDate: string;
  regionId: string;
  regionName: string;
  country: string;
  originClubName: string;
  scoutId: string;
  scoutName: string;
  scoutStars: number;
  player: Player;
  potentialMin: number;
  potentialMax: number;
  estimatedValueMin: number;
  estimatedValueMax: number;
  estimatedMarketValue: number;
  askingFee: number;
  recommendationTier: ScoutRecommendationTier;
  scoutReportSummary: string;
  isShortlisted?: boolean;
  isSigned?: boolean;
  isDismissed?: boolean;
}

export interface ScoutingMission {
  id: string;
  scoutId: string;
  scoutName: string;
  scoutStars: number;
  regionId: string;
  regionName: string;
  country: string;
  roleFocus: DetailedRole | 'ALL';
  ageFocus: ScoutAgeFocus;
  depth: ScoutMissionDepth;
  cost: number;
  startDate: string;
  totalDays: number;
  daysRemaining: number;
  status: 'ACTIVE' | 'COMPLETED';
  completedDate?: string;
  prospectsFoundCount?: number;
}

export interface ScoutingNetworkState {
  scouts: ScoutStaffMember[];
  missions: ScoutingMission[];
  prospects: ScoutedProspect[];
}

export type BoardGoalCategory =
  | 'LEAGUE'
  | 'NATIONAL_CUP'
  | 'CONTINENTAL'
  | 'STATE_CUP'
  | 'FINANCE';

export type BoardGoalStatus =
  | 'ON_TRACK'
  | 'AT_RISK'
  | 'ACHIEVED'
  | 'FAILED';

export interface BoardSeasonGoal {
  id: string;
  category: BoardGoalCategory;
  competitionLabel: string;
  title: string;
  description: string;
  targetPositionMax?: number;
  targetCupPhase?: string;
  rewardBonus: number;
  priority: 'Principal' | 'Secundária';
  status: BoardGoalStatus;
  currentProgressText: string;
  bonusClaimed?: boolean;
}

export interface ManagerJobOffer {
  id: string;
  clubId: string;
  clubName: string;
  clubShortName: string;
  clubDivision: Division;
  clubReputation: number;
  clubSquadAvgOvr: number;
  clubColors: ClubColors;
  transferBudgetPreview: number;
  offeredMonthlySalary: number;
  contractYears: number;
  reason: string;
  createdDate: string;
  expiresRound: number;
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'EXPIRED';
}

export interface ManagerCareerStint {
  id: string;
  clubId: string;
  clubName: string;
  clubColors?: ClubColors;
  divisionAtStart: Division;
  startYear: number;
  startDate: string;
  endDate?: string;
  matches: number;
  wins: number;
  draws: number;
  losses: number;
  trophiesWon: number;
  statusLabel:
    | 'Cargo Atual'
    | 'Aceitou Proposta'
    | 'Demitido pela Diretoria'
    | 'Pediu Demissão'
    | 'Substituído pela Diretoria';
}

export interface ManagerDismissalSummary {
  id: string;
  entityType: 'CLUB' | 'NATIONAL_TEAM';
  entityId: string;
  entityName: string;
  reason: string;
  confidenceAtDismissal: number;
  matches: number;
  wins: number;
  draws: number;
  losses: number;
  severanceReceived: number;
  date: string;
  acknowledged?: boolean;
}

export interface ManagerCareerState {
  boardConfidence: number; // 0 to 100
  fanConfidence: number; // 0 to 100
  managerReputation: number; // 1 to 100
  monthlySalary: number;
  warningsIssued: number;
  lastBudgetRequestRound?: number;
  seasonGoals: BoardSeasonGoal[];
  jobOffers: ManagerJobOffer[];
  careerStints: ManagerCareerStint[];
  lastEvaluationNote: string;
  lastDismissal?: ManagerDismissalSummary | null;
}

export type SelecaoTacticStyle =
  | 'EQUILIBRADO'
  | 'JOGO_BONITO_OFENSIVO'
  | 'PRESSAO_ALTA'
  | 'SOLIDEZ_TRANSICAO';

export type FifaWindowStatus = 'PENDING' | 'READY_FOR_USER' | 'PLAYED';

export type ConfederationCode = 'CONMEBOL' | 'UEFA' | 'CONCACAF' | 'CAF' | 'AFC' | 'OFC';

export type ContinentalCompId =
  | 'copa_america'
  | 'eurocopa'
  | 'copa_africana'
  | 'copa_asia'
  | 'copa_oceania'
  | 'copa_ouro'
  | 'nations_league';

export type NationalCompetitionCode =
  | 'wc_qualifiers'
  | 'continental_qualifiers'
  | 'world_cup'
  | 'copa_america'
  | 'eurocopa'
  | 'copa_africana'
  | 'copa_asia'
  | 'copa_oceania'
  | 'copa_ouro'
  | 'nations_league'
  | 'finalissima'
  | 'friendly';

export interface NationalTeamProfile {
  id: string;
  name: string;
  code: string;
  confederation: ConfederationCode;
  federationCode: string;
  strength: number;
  fifaPoints: number;
  primaryColor: string;
  secondaryColor: string;
  textColor: string;
  homeStadium: string;
  minReputationToCoach: number;
  worldCupTitles: number;
  continentalTitles: number;
  countryMatch?: string;
}

export interface NationalVirtualPlayer {
  id: string;
  name: string;
  teamId: string;
  position: Position;
  detailedRole: DetailedRole;
  overall: number;
  age: number;
  clubShortName: string;
  caps: number;
  goals: number;
}

export interface NationalStandingRow {
  teamId: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
  form: ('V' | 'E' | 'D')[];
  group?: string;
}

export interface InternationalMatchFixture {
  id: string;
  competition: NationalCompetitionCode;
  competitionName: string;
  seasonYear: number;
  triggerRound: number;
  date?: string; // YYYY-MM-DD real calendar date
  time?: string; // HH:MM kickoff time
  dateLabel: string;
  phase: string;
  qualifiersRound?: number;
  group?: string;
  knockoutSlot?: number;
  homeTeamId: string;
  awayTeamId: string;
  stadiumName: string;
  played: boolean;
  status: FifaWindowStatus;
  homeScore: number | null;
  awayScore: number | null;
  penaltiesHome?: number;
  penaltiesAway?: number;
  winnerTeamId?: string;
  highlights?: string[];
  scorersSummary?: string;
}

export interface NationalTournamentEdition {
  id: string;
  compId: 'world_cup' | ContinentalCompId;
  title: string;
  hostName: string;
  year: number;
  status: 'UPCOMING' | 'IN_PROGRESS' | 'COMPLETED';
  groups: string[];
  standings: NationalStandingRow[];
  fixtures: InternationalMatchFixture[];
  championTeamId?: string;
  runnerUpTeamId?: string;
  thirdPlaceTeamId?: string;
}

export interface WorldCupQualifiersCycle {
  targetWorldCupYear: number;
  currentMatchday: number;
  totalMatchdays: number;
  conmebolStandings: NationalStandingRow[];
  conmebolFixtures: InternationalMatchFixture[];
  otherConfedStandings: Record<'UEFA' | 'CONCACAF' | 'CAF' | 'AFC' | 'OFC', NationalStandingRow[]>;
  otherConfedFixtures: InternationalMatchFixture[];
}

export type ContinentalQualifierTrackId = 'UEFA' | 'CAF' | 'AFC' | 'CONCACAF' | 'OFC';

export interface ContinentalQualifiersTrack {
  id: ContinentalQualifierTrackId;
  title: string;
  targetCompId: ContinentalCompId;
  targetCompName: string;
  totalRounds: number;
  qualifyPerGroup: number;
  standings: NationalStandingRow[];
  fixtures: InternationalMatchFixture[];
  qualifiedTeamIds: string[];
}

export interface ContinentalQualifiersCycle {
  targetContinentalYear: number;
  currentRound: number;
  totalRounds: number;
  tracks: Record<ContinentalQualifierTrackId, ContinentalQualifiersTrack>;
  conmebolNote: string;
}

export interface PastWorldCupRecord {
  year: number;
  host: string;
  championTeamId: string;
  runnerUpTeamId: string;
  scoreLabel: string;
}

export interface FifaWindowFixture {
  id: string;
  seasonYear: number;
  triggerRound: number;
  date?: string;
  time?: string;
  windowLabel: string; // Ex: 'Data FIFA de Março'
  competitionLabel: string; // Ex: 'Eliminatórias Sul-Americanas'
  opponentName: string;
  opponentCode: string;
  opponentStrength: number; // 76 to 90
  opponentPrimaryColor: string;
  opponentTextColor: string;
  stadiumName: string;
  isHome: boolean;
  status: FifaWindowStatus;
  brazilScore?: number;
  opponentScore?: number;
  highlights?: string[];
  scorersSummary?: string;
}

export interface FifaCallUpPlayerLog {
  playerId: string;
  playerName: string;
  playerRole: DetailedRole;
  clubId: string;
  clubShortName: string;
  overall: number;
  goalsInWindow: number;
  marketValueBoost: number;
}

export interface FifaRankingEntryMeta {
  previousPoints?: number;
  previousRank?: number;
  lastDelta?: number;
  lastMatchDate?: string;
  lastMatchSummary?: string;
}

export interface FifaWindowReport {
  id: string;
  windowId: string;
  seasonYear: number;
  round: number;
  windowLabel: string;
  competitionLabel: string;
  matchSummary: string;
  brazilScore: number;
  opponentScore: number;
  opponentName: string;
  coachedByUser: boolean;
  userClubPlayersCalled: FifaCallUpPlayerLog[];
  totalUserClubCompensation: number;
  totalUserMarketValueGain: number;
  highlights: string[];
  rankingDelta?: number;
  rankingOldRank?: number;
  rankingNewRank?: number;
}

export interface NationalTeamJobOffer {
  id: string;
  teamId: string;
  teamName: string;
  teamCode: string;
  federationCode: string;
  confederation: ConfederationCode;
  strength: number;
  primaryColor: string;
  textColor: string;
  reason: string;
  createdDate: string;
  expiresDate: string;
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'EXPIRED';
}

export interface NationalTeamCoachRecord {
  coachName: string;
  nationality: string;
  prestige: number;
  security: number; // 0 to 100 federation confidence
  matches: number;
  wins: number;
  draws: number;
  losses: number;
}

export interface NationalTeamCareerStint {
  id: string;
  teamId: string;
  teamName: string;
  teamCode: string;
  confederation: ConfederationCode;
  startYear: number;
  startDate: string;
  endDate?: string;
  matches: number;
  wins: number;
  draws: number;
  losses: number;
  trophiesWon: number;
  statusLabel:
    | 'Cargo Atual'
    | 'Aceitou Outra Seleção'
    | 'Demitido pela Federação'
    | 'Deixou o Cargo';
}

export interface NationalTeamState {
  systemVersion?: number;
  isUserCoach: boolean;
  userTeamId?: string | null;
  pendingInviteTeamId?: string | null;
  hasPendingCbfInvite: boolean;
  inviteDeclinedSeason?: number;
  appointedDate?: string;
  cbfConfidence: number; // 0 to 100
  warningsIssued?: number;
  coachMatches: number;
  coachWins: number;
  coachDraws: number;
  coachLosses: number;
  trophiesWonWithSelecao: number;
  tacticStyle: SelecaoTacticStyle;
  formation?: FormationType;
  captainPlayerId?: string;
  calledUpPlayerIds: string[]; // 26 players
  starterPlayerIds: string[]; // 11 starters (ordered by tactical slot 0..10)
  customPositions?: Record<string, { x: number; y: number; code: string; label?: string }>;
  windows: FifaWindowFixture[];
  callUpHistory: FifaWindowReport[];
  pendingNationalOffers?: NationalTeamJobOffer[];
  teamCoaches?: Record<string, NationalTeamCoachRecord>;
  nationalStints?: NationalTeamCareerStint[];
  lastDismissal?: ManagerDismissalSummary | null;
  fifaRankingPoints?: Record<string, number>;
  fifaRankingMeta?: Record<string, FifaRankingEntryMeta>;
  virtualPlayers?: NationalVirtualPlayer[];
  qualifiers?: WorldCupQualifiersCycle;
  completedQualifiersArchive?: WorldCupQualifiersCycle;
  continentalQualifiers?: ContinentalQualifiersCycle;
  completedContinentalQualifiersArchive?: ContinentalQualifiersCycle;
  worldCup?: NationalTournamentEdition;
  pastWorldCups?: PastWorldCupRecord[];
  continentals?: Record<ContinentalCompId, NationalTournamentEdition>;
  drawnNationalTournaments?: string[];
  seasonSchedule?: InternationalMatchFixture[];
}

export interface RealCoachProfile {
  id: string;
  name: string;
  nationality: string;
  age: number;
  prestige: number; // 55 to 96
  preferredFormation: FormationType;
  mentality: TacticalMentality;
  passing: PassingStyle;
  styleLabel: string;
  monthlySalaryDemand: number;
  signingFee: number;
  photoUrl?: string;
  soccerWikiId?: number;
}

export interface CoachMovementRecord {
  id: string;
  entityType?: 'CLUB' | 'NATIONAL_TEAM';
  date: string;
  round: number;
  seasonYear: number;
  clubId: string;
  clubName: string;
  clubDivision: Division | 'SELECAO';
  confederation?: ConfederationCode;
  sackedCoachName?: string;
  hiredCoachName?: string;
  severancePaid?: number;
  reason: string;
  eventType:
    | 'SACKED_AND_HIRED'
    | 'USER_HIRED_COACH'
    | 'USER_RESIGNED'
    | 'USER_APPOINTED'
    | 'USER_SACKED';
}

export interface CoachingCarouselState {
  clubCoachSecurity: Record<string, number>; // clubId -> 0..100 stability
  freeAgentCoaches: RealCoachProfile[];
  movementHistory: CoachMovementRecord[];
}

export type PlayerDemandCategory =
  | 'PLAYING_TIME'
  | 'WAGE_VALORIZATION'
  | 'CAPTAINCY_RESPECT';

export interface PlayerLockerDemand {
  id: string;
  playerId: string;
  playerName: string;
  playerRole: DetailedRole;
  playerOverall: number;
  category: PlayerDemandCategory;
  createdRound: number;
  createdDate: string;
  complaintText: string;
  status: 'PENDING' | 'RESOLVED_POSITIVE' | 'RESOLVED_TENSE';
  promisedStarterUntilRound?: number;
  resolutionSummary?: string;
}

export interface PressQuestionOption {
  id: string;
  toneLabel: string;
  responseText: string;
  boardDelta: number;
  fanDelta: number;
  moraleShift: -1 | 0 | 1;
  reputationDelta: number;
  headlineResult: string;
}

export interface PressConferenceQuestion {
  id: string;
  outletName: string;
  journalistName: string;
  questionText: string;
  options: PressQuestionOption[];
  chosenOptionId?: string;
}

export interface PressConferenceSession {
  id: string;
  round: number;
  date: string;
  contextTitle: string;
  contextSubtitle: string;
  completed: boolean;
  questions: PressConferenceQuestion[];
  summaryHeadline?: string;
}

export interface LockerRoomState {
  harmonyScore: number; // 0 to 100
  activeDemands: PlayerLockerDemand[];
  resolvedDemandsHistory: PlayerLockerDemand[];
  activePressConference?: PressConferenceSession | null;
  pressHistory: PressConferenceSession[];
  lastTalkRoundByPlayer: Record<string, number>;
}

export type SeasonContinentScope = 'SA_BR' | 'EU';

export type SeasonCompetitionRegion =
  | 'BRASIL'
  | 'SUL_AMERICANA'
  | 'EUROPA'
  | 'NORTE_ASIA_AFRICA'
  | 'MUNDIAL';

export type SeasonCompetitionTier =
  | 'MUNDIAL'
  | 'CONTINENTAL'
  | 'NACIONAL'
  | 'COPA'
  | 'ESTADUAL';

export interface SeasonPlayerStatSnapshot {
  playerId: string;
  playerName: string;
  position: Position;
  detailedRole: DetailedRole;
  age: number;
  overall: number;
  clubId: string;
  clubName: string;
  clubShortName: string;
  clubColors: { primary: string; secondary: string; text: string };
  goals: number;
  assists: number;
  matches: number;
  seasonRating: number;
  titlesWonInSeason?: number;
}

export interface SeasonCompetitionArchive {
  competitionId: string;
  competitionName: string;
  shortName: string;
  region: SeasonCompetitionRegion;
  tier: SeasonCompetitionTier;
  isDecided: boolean;
  championClubId?: string;
  championClubName: string;
  championClubShortName?: string;
  championColors?: { primary: string; secondary: string; text: string };
  runnerUpClubId?: string;
  runnerUpClubName: string;
  userWon: boolean;
  campaignSummary?: string;
  topScorer?: {
    playerId: string;
    playerName: string;
    detailedRole: DetailedRole;
    clubId: string;
    clubName: string;
    clubShortName: string;
    goals: number;
    assists: number;
    matches: number;
  };
  topAssister?: {
    playerId: string;
    playerName: string;
    detailedRole: DetailedRole;
    clubId: string;
    clubName: string;
    clubShortName: string;
    assists: number;
    goals: number;
    matches: number;
  };
  bestPlayer?: {
    playerId: string;
    playerName: string;
    detailedRole: DetailedRole;
    overall: number;
    clubId: string;
    clubName: string;
    clubShortName: string;
    statHighlight: string;
  };
}

export interface SeasonTeamOfTheYearSlot {
  slotId: string;
  slotLabel: string;
  pitchX: number;
  pitchY: number;
  playerId: string;
  playerName: string;
  position: Position;
  detailedRole: DetailedRole;
  age: number;
  overall: number;
  clubId: string;
  clubName: string;
  clubShortName: string;
  clubColors: { primary: string; secondary: string; text: string };
  goals: number;
  assists: number;
  matches: number;
  seasonRating: number;
  isPlayerOfTheYear: boolean;
}

export type SeasonMajorHonorCategory =
  | 'BOLA_DE_OURO_MUNDIAL'
  | 'CRAQUE_DO_ANO'
  | 'ARTILHEIRO_GERAL'
  | 'GARCOM_DO_ANO'
  | 'MELHOR_GOLEIRO'
  | 'REVELACAO_SUB21'
  | 'TREINADOR_DO_ANO';

export interface WorldBallonDorCandidate {
  rank: number; // 1 = Bola de Ouro, 2 = Bola de Prata, 3 = Bola de Bronze, 4..10 = Top 10
  playerId: string;
  playerName: string;
  nationality: string;
  detailedRole: DetailedRole;
  age: number;
  overall: number;
  clubId: string;
  clubName: string;
  clubShortName: string;
  clubColors: { primary: string; secondary: string; text: string };
  leagueLabel: string;
  goals: number;
  assists: number;
  matches: number;
  ratingAverage: number;
  ballonDorPoints: number;
  userWon: boolean;
}

export interface WorldBallonDorAward {
  year: number;
  awardedAtDate: string;
  winner: WorldBallonDorCandidate;
  silver: WorldBallonDorCandidate;
  bronze: WorldBallonDorCandidate;
  goldenBoyU21?: WorldBallonDorCandidate;
  top10: WorldBallonDorCandidate[];
}

export interface SeasonMajorHonor {
  category: SeasonMajorHonorCategory;
  title: string;
  winnerId: string;
  winnerName: string;
  winnerRole: string;
  age?: number;
  overall?: number;
  clubId: string;
  clubName: string;
  clubShortName: string;
  clubColors: { primary: string; secondary: string; text: string };
  userWon: boolean;
  statLine: string;
  goals?: number;
  assists?: number;
  matches?: number;
}

export interface SeasonHistoryRecord {
  id: string; // e.g. 'sa_2026' or 'eu_2025'
  continentScope: SeasonContinentScope;
  year: number;
  seasonLabel: string; // e.g. '2026' or '2025/2026'
  recordedAtDate: string;
  isLivePreview?: boolean;
  isBackfilledLegacy?: boolean;
  userClubId: string;
  userClubName: string;
  competitions: SeasonCompetitionArchive[];
  teamOfTheYearTitle: string;
  teamOfTheYear: SeasonTeamOfTheYearSlot[];
  userLeagueTeamOfTheYearTitle?: string;
  userLeagueTeamOfTheYear?: SeasonTeamOfTheYearSlot[];
  majorHonors: SeasonMajorHonor[];
  topScorersOverall: SeasonPlayerStatSnapshot[];
  topAssistersOverall: SeasonPlayerStatSnapshot[];
  topPerformersSnapshot: SeasonPlayerStatSnapshot[];
}

export interface GameSave {
  version: string;
  calendarVersion?: number;
  ratingsVersion?: number;
  economyBalanceVersion?: number;
  squadSizeVersion?: number;
  flamengoRosterVersion?: number;
  palmeirasRosterVersion?: number;
  serieA2026RosterVersion?: number;
  serieB2026RosterVersion?: number;
  serieC2026RosterVersion?: number;
  potiguar2026RosterVersion?: number;
  estaduais2026Version?: number;
  ecuador2026RosterVersion?: number;
  colombia2026RosterVersion?: number;
  uruguay2026RosterVersion?: number;
  chile2026RosterVersion?: number;
  paraguay2026RosterVersion?: number;
  peru2026RosterVersion?: number;
  bolivia2026RosterVersion?: number;
  venezuela2026RosterVersion?: number;
  argentina2026RosterVersion?: number;
  saudiArabia2026RosterVersion?: number;
  mexico2026RosterVersion?: number;
  usaMls2026RosterVersion?: number;
  canada2026RosterVersion?: number;
  russia2026RosterVersion?: number;
  premierLeague2026RosterVersion?: number;
  concacafChampions2026Version?: number;
  afcChampions2026Version?: number;
  shakhtarSpecial1Version?: number;
  soccerWikiBrasilVersion?: number;
  soccerWikiEnglandVersion?: number;
  aiOverallsCalibratedAt?: string;
  aiOct2026SquadSyncedClubIds?: string[];
  aiOct2026GlobalSyncedAt?: string;
  saveName: string;
  savedAt: string;
  userClubId: string;
  managerName: string;
  currentSeasonYear: number;
  europeSeasonYear?: number; // Ano de abertura da temporada europeia Y/Y+1 (ex: 2026 -> 2026/27, Ago 2026 a Mai 2027)
  saSeasonYear?: number; // Ano civil da temporada sul-americana/brasileira (Jan a Dez)
  reigningUclChampId?: string;
  reigningUelChampId?: string;
  reigningUeclChampId?: string;
  reigningAfcChampId?: string;
  currentRound: number;
  currentDate: string; // YYYY-MM-DD
  totalRounds: number;
  seasonState: 'PLAYING' | 'SEASON_ENDED' | 'TROPHY_CELEBRATION';
  clubs: Club[];
  fixturesA: Fixture[];
  fixturesB: Fixture[];
  fixturesC?: Fixture[];
  fixturesD?: Fixture[];
  fixturesLibertadores?: Fixture[];
  fixturesSulamericana?: Fixture[];
  fixturesCopaBrasil?: Fixture[];
  fixturesCopaNordeste?: Fixture[];
  fixturesCopaVerde?: Fixture[];
  fixturesSupercopa?: Fixture[];
  fixturesRecopa?: Fixture[];
  fixturesEstadual?: Fixture[];
  fixturesIntercontinental?: Fixture[];
  fixturesSuperMundial?: Fixture[];
  fixturesEngCommunityShield?: Fixture[];
  fixturesEngEflCup?: Fixture[];
  fixturesEngFaCup?: Fixture[];
  fixturesEuropeanCups?: Partial<Record<EuropeanCupId, Fixture[]>>;
  fixturesSouthAmericanCups?: Partial<Record<SouthAmericanCupId, Fixture[]>>;
  fixturesWorldCups?: Partial<Record<WorldCupId, Fixture[]>>;
  fixturesSouthAmerica?: Partial<Record<SouthAmericanLeagueId, Fixture[]>>;
  fixturesEurope?: Partial<Record<EuropeanLeagueId, Fixture[]>>;
  fixturesWorldLeagues?: Partial<Record<WorldLeagueId, Fixture[]>>;
  fixturesChampionsLeague?: Fixture[];
  fixturesEuropaLeague?: Fixture[];
  fixturesConferenceLeague?: Fixture[];
  fixturesUefaSupercup?: Fixture[];
  fixturesCopaInternacional?: Fixture[];
  fixturesConcacafChampions?: Fixture[];
  fixturesAfcChampions?: Fixture[];
  fixturesFriendlies?: Fixture[];
  standingsA: Standing[];
  standingsB: Standing[];
  standingsC?: Standing[];
  standingsD?: Standing[];
  standingsLibertadores?: Standing[];
  standingsSulamericana?: Standing[];
  standingsEstadual?: Standing[];
  standingsCopaNordeste?: Standing[];
  standingsCopaVerde?: Standing[];
  standingsSuperMundial?: Standing[];
  potiguarCopaBrasilQualifiedIds?: string[];
  potiguarCopaNordesteQualifiedIds?: string[];
  estadualCopaBrasilQualifiedIds?: string[];
  estadualCopaNordesteQualifiedIds?: string[];
  estadualCopaVerdeQualifiedIds?: string[];
  standingsSouthAmerica?: Partial<Record<SouthAmericanLeagueId, Standing[]>>;
  standingsEurope?: Partial<Record<EuropeanLeagueId, Standing[]>>;
  standingsWorldLeagues?: Partial<Record<WorldLeagueId, Standing[]>>;
  standingsChampionsLeague?: Standing[];
  standingsEuropaLeague?: Standing[];
  standingsConferenceLeague?: Standing[];
  standingsCopaInternacional?: Standing[];
  standingsAfcChampions?: Standing[];
  aiSouthAmericaLeaguesCalibratedAt?: string;
  aiEuropeLeaguesCalibratedAt?: string;
  aiWorldLeaguesCalibratedAt?: string;
  inbox: InboxMessage[];
  transferMarket: Player[]; // Free agents
  freeAgents2026Version?: number;
  transferOffers: TransferOffer[];
  transferHistory?: TransferHistoryRecord[];
  pendingTransfers?: PendingTransferDeal[];
  transferClauses?: ActiveTransferClause[];
  scoutingNetwork?: ScoutingNetworkState;
  trophyHistory: TrophyRecord[];
  individualAwardsHistory?: IndividualAwardRecord[];
  worldBallonDorHistory?: WorldBallonDorAward[];
  seasonHistoryArchive?: SeasonHistoryRecord[];
  managerCareer?: ManagerCareerState;
  nationalTeam?: NationalTeamState;
  coachingCarousel?: CoachingCarouselState;
  lockerRoom?: LockerRoomState;
  drawnCompetitions?: CompetitionType[];
  aiDirectorAutoNegotiate?: boolean;
  unlockedAchievementIds?: string[];
  watchlist?: WatchlistEntry[];
  managerSpecialty?: ManagerSpecialtyId;
  activeChallenge?: ActiveCareerChallenge;
  deadlineDayCompletedKeys?: string[];
  settledPrizeSeasonKeys?: string[];
}

export type ManagerSpecialtyId =
  | 'TATICO'
  | 'FORMADOR_BASE'
  | 'NEGOCIADOR'
  | 'MOTIVADOR';

export type CareerChallengeId =
  | 'LIVRE'
  | 'OPERACAO_SALVACAO'
  | 'SERIE_D_LIBERTADORES'
  | 'ORCAMENTO_CURTO'
  | 'SEM_CLUBE_ZERO';

export interface ActiveCareerChallenge {
  id: CareerChallengeId;
  title: string;
  subtitle: string;
  targetDescription: string;
  startedYear: number;
  completed?: boolean;
  completedDate?: string;
}

export interface WatchlistEntry {
  playerId: string;
  addedAt: string; // YYYY-MM-DD in-game date
}

export interface ActiveTransferClause {
  id: string;
  playerId: string;
  playerName: string;
  playerRole: DetailedRole;
  currentClubId: string;
  currentClubName: string;
  counterpartyClubId: string;
  counterpartyClubName: string;
  direction: 'RECEIVABLE' | 'PAYABLE';
  sellOnPercentage: number; // 0 | 10 | 15 | 20 | 25 | 30
  goalBonusAmount?: number;
  goalBonusTarget?: number;
  goalsBaseline: number;
  goalBonusPaid?: boolean;
  appearancesBonusAmount?: number;
  appearancesBonusTarget?: number;
  matchesBaseline: number;
  appearancesBonusPaid?: boolean;
  settledSellOn?: boolean;
  createdDate: string;
}

export type TransferRumorHeat = 'HOT' | 'WARM' | 'WATCH';

export type TransferRumorCategory =
  | 'USER_PLAYER_TARGET'
  | 'OPPORTUNITY'
  | 'LEAGUE_BUZZ';

export interface TransferRumor {
  id: string;
  playerId: string;
  playerName: string;
  playerRole: DetailedRole;
  playerAge: number;
  playerOverall: number;
  marketValue: number;
  estimatedFee: number;
  matches: number;
  goals: number;
  assists: number;
  ratingAverage: number;
  currentClubId: string;
  currentClubName: string;
  currentClubShortName: string;
  interestedClubId: string;
  interestedClubName: string;
  interestedClubShortName: string;
  category: TransferRumorCategory;
  heatLevel: TransferRumorHeat;
  sourceOutlet: string;
  headline: string;
  summary: string;
  reasonTag: string;
  isUserPlayerInvolved: boolean;
  generatedByAi: boolean;
}
