import React, { useState, useEffect, useMemo, useRef, useCallback, lazy, Suspense } from 'react';
import { setErrorLogGameContext } from './services/errorLoggerService';
import { ScrollableTabStrip } from './components/ScrollableTabStrip';
import { QuickTabsRibbon } from './components/QuickTabsRibbon';
import { TabErrorBoundary } from './components/TabErrorBoundary';
import { 
  Club, 
  CompetitionType,
  GameSave, 
  Fixture, 
  Standing, 
  Player, 
  TacticalSettings, 
  FormationType, 
  InboxMessage, 
  TrophyRecord,
  SponsorOption,
  SponsorSlotType,
  TransferHistoryRecord,
  PendingTransferDeal,
  DetailedRole,
  ScoutAgeFocus,
  ScoutMissionDepth,
  ScoutRegionCategory,
  ScoutedProspect,
  IndividualAwardRecord,
  SelecaoTacticStyle,
  PreMatchDerbyPosture,
  SeasonFinancialAuditReport,
  SouthAmericanLeagueId,
  EuropeanLeagueId,
  EuropeanCupId,
  SouthAmericanCupId,
  WorldCupId,
  WorldLeagueId,
  YouthAgeGroupFilter,
  YouthTrainingFocus,
  YouthTrainingIntensity,
  YouthTryoutTier,
  WorldBallonDorAward,
  ContinentalCompId,
  MAX_SQUAD_SIZE,
  TacticalPreset,
  SavedLineupProfile,
  SmartAdvanceSummary,
  ManagerSpecialtyId,
  CareerChallengeId,
} from './types/game';
import { getManagerSpecialtyProfile } from './utils/managerSpecialtyEngine';
import {
  getCareerChallengeDefinition,
  buildActiveCareerChallenge,
  evaluateChallengeStatus,
} from './utils/careerChallengesEngine';
import {
  DeadlineBargainTarget,
  DeadlineDaySession,
  DeadlineFlashOffer,
  generateDeadlineDaySession,
  getDeadlineDayWindowKey,
} from './utils/deadlineDayEngine';
import { 
  generateInitialClubs, 
  getBaseInitialClubsReadonly,
  generateLeagueSchedule, 
  buildSerieBPlayoffFixtures,
  generateInitialStandings, 
  generateFreeAgents,
  CURRENT_FREE_AGENTS_2026_VERSION,
  ensureMinimumSquadDepth,
  getDefaultClubRivals,
  createPlayer,
  applyOfficialFlamengoRosterToClub,
  CURRENT_FLAMENGO_ROSTER_VERSION,
  applyOfficialPalmeirasRosterToClub,
  CURRENT_PALMEIRAS_ROSTER_VERSION,
  applyOfficialSerieA2026RosterToClub,
  CURRENT_SERIE_A_2026_ROSTER_VERSION,
  SERIE_A_2026_CURATED_CLUB_IDS,
  applyOfficialSerieB2026RosterToClub,
  CURRENT_SERIE_B_2026_ROSTER_VERSION,
  SERIE_B_2026_CURATED_CLUB_IDS,
  applyOfficialSerieC2026RosterToClub,
  CURRENT_SERIE_C_2026_ROSTER_VERSION,
  SERIE_C_2026_CURATED_CLUB_IDS,
  applyOfficialPotiguar2026RosterToClub,
  CURRENT_POTIGUAR_2026_ROSTER_VERSION,
  POTIGUAR_2026_CURATED_CLUB_IDS,
  CURRENT_ESTADUAIS_2026_VERSION,
  ESTADUAIS_2026_CURATED_CLUB_IDS,
  applyOfficialEcuador2026RosterToClub,
  CURRENT_ECUADOR_2026_ROSTER_VERSION,
  ECUADOR_2026_CURATED_CLUB_IDS,
  applyOfficialColombia2026RosterToClub,
  CURRENT_COLOMBIA_2026_ROSTER_VERSION,
  COLOMBIA_2026_CURATED_CLUB_IDS,
  applyOfficialUruguay2026RosterToClub,
  CURRENT_URUGUAY_2026_ROSTER_VERSION,
  URUGUAY_2026_CURATED_CLUB_IDS,
  applyOfficialChile2026RosterToClub,
  CURRENT_CHILE_2026_ROSTER_VERSION,
  CHILE_2026_CURATED_CLUB_IDS,
  applyOfficialParaguay2026RosterToClub,
  CURRENT_PARAGUAY_2026_ROSTER_VERSION,
  PARAGUAY_2026_CURATED_CLUB_IDS,
  applyOfficialPeru2026RosterToClub,
  CURRENT_PERU_2026_ROSTER_VERSION,
  PERU_2026_CURATED_CLUB_IDS,
  applyOfficialBolivia2026RosterToClub,
  CURRENT_BOLIVIA_2026_ROSTER_VERSION,
  BOLIVIA_2026_CURATED_CLUB_IDS,
  applyOfficialVenezuela2026RosterToClub,
  CURRENT_VENEZUELA_2026_ROSTER_VERSION,
  VENEZUELA_2026_CURATED_CLUB_IDS,
  applyOfficialArgentina2026RosterToClub,
  CURRENT_ARGENTINA_2026_ROSTER_VERSION,
  ARGENTINA_2026_CURATED_CLUB_IDS,
  applyOfficialSaudiArabia2026RosterToClub,
  CURRENT_SAUDI_2026_ROSTER_VERSION,
  SAUDI_2026_CURATED_CLUB_IDS,
  applyOfficialMexico2026RosterToClub,
  CURRENT_MEXICO_2026_ROSTER_VERSION,
  MEXICO_2026_CURATED_CLUB_IDS,
  applyOfficialUsaMls2026RosterToClub,
  CURRENT_USA_MLS_2026_ROSTER_VERSION,
  USA_MLS_2026_CURATED_CLUB_IDS,
  applyOfficialCanada2026RosterToClub,
  CURRENT_CANADA_2026_ROSTER_VERSION,
  CANADA_2026_CURATED_CLUB_IDS,
  applyOfficialRussia2026RosterToClub,
  CURRENT_RUSSIA_2026_ROSTER_VERSION,
  RUSSIA_2026_CURATED_CLUB_IDS,
  applyOfficialPremierLeague2026RosterToClub,
  CURRENT_PREMIER_LEAGUE_2026_ROSTER_VERSION,
  PREMIER_LEAGUE_2026_CURATED_CLUB_IDS,
  trimSquadToMaxPlayers,
} from './data/initialData';
import {
  getClubEstadualConfig,
  getEstadualTotalRounds,
} from './data/estaduais2026Config';
import {
  CURRENT_SOCCERWIKI_BRASIL_VERSION,
  upgradeSaveWithSoccerWikiBrasil,
} from './utils/soccerWikiBrazilEngine';
import {
  CURRENT_SOCCERWIKI_ENGLAND_VERSION,
  upgradeSaveWithSoccerWikiEngland,
} from './utils/soccerWikiEnglandEngine';
import { soundEngine } from './services/soundEngine';
import { TitleScreen } from './components/TitleScreen';
import { Header } from './components/Header';
import { GameSidebar } from './components/GameSidebar';
import { MobileBottomNav } from './components/MobileBottomNav';
import { ClubHubDashboard } from './components/ClubHubDashboard';
import { OfflineIndicator } from './components/OfflineIndicator';
import { PlayerInspectionProvider } from './context/PlayerInspectionContext';
import { LanguageProvider } from './i18n/LanguageContext';
import type { RecentUpdatedClubItem } from './components/Oct2026GlobalSyncModal';
import type { InstantMatchSummaryData } from './components/InstantMatchResultModal';
import type { CelebrationPayload } from './components/CelebrationModal';

// Code-split heavy views & modals (Etapa 2: faster initial load & smaller main chunk)
const OfficialWebsiteView = lazy(() =>
  import('./components/OfficialWebsiteView').then((m) => ({ default: m.OfficialWebsiteView }))
);
const PitchTacticsView = lazy(() =>
  import('./components/PitchTacticsView').then((m) => ({ default: m.PitchTacticsView }))
);
const SquadTable = lazy(() =>
  import('./components/SquadTable').then((m) => ({ default: m.SquadTable }))
);
const TacticsPanel = lazy(() =>
  import('./components/TacticsPanel').then((m) => ({ default: m.TacticsPanel }))
);
const StandingsView = lazy(() =>
  import('./components/StandingsView').then((m) => ({ default: m.StandingsView }))
);
const TransferMarketView = lazy(() =>
  import('./components/TransferMarketView').then((m) => ({ default: m.TransferMarketView }))
);
const FinancesStadiumView = lazy(() =>
  import('./components/FinancesStadiumView').then((m) => ({ default: m.FinancesStadiumView }))
);
const InboxNewsView = lazy(() =>
  import('./components/InboxNewsView').then((m) => ({ default: m.InboxNewsView }))
);
const TrophyCabinetView = lazy(() =>
  import('./components/TrophyCabinetView').then((m) => ({ default: m.TrophyCabinetView }))
);
const MatchSimulatorModal = lazy(() =>
  import('./components/MatchSimulatorModal').then((m) => ({ default: m.MatchSimulatorModal }))
);
const DeadlineDayModal = lazy(() =>
  import('./components/DeadlineDayModal').then((m) => ({ default: m.DeadlineDayModal }))
);
const FirstRunTourModal = lazy(() =>
  import('./components/FirstRunTourModal').then((m) => ({ default: m.FirstRunTourModal }))
);
const SaveLoadModal = lazy(() =>
  import('./components/SaveLoadModal').then((m) => ({ default: m.SaveLoadModal }))
);
const TrainingCenterView = lazy(() =>
  import('./components/TrainingCenterView').then((m) => ({ default: m.TrainingCenterView }))
);
const CalendarView = lazy(() =>
  import('./components/CalendarView').then((m) => ({ default: m.CalendarView }))
);
const SquadManagementView = lazy(() =>
  import('./components/SquadManagementView').then((m) => ({ default: m.SquadManagementView }))
);
const SponsorsView = lazy(() =>
  import('./components/SponsorsView').then((m) => ({ default: m.SponsorsView }))
);
const ScoutingView = lazy(() =>
  import('./components/ScoutingView').then((m) => ({ default: m.ScoutingView }))
);
const SquadReportPanel = lazy(() =>
  import('./components/SquadReportPanel').then((m) => ({ default: m.SquadReportPanel }))
);
const BoardCareerView = lazy(() =>
  import('./components/BoardCareerView').then((m) => ({ default: m.BoardCareerView }))
);
const ContractManagementView = lazy(() =>
  import('./components/ContractManagementView').then((m) => ({ default: m.ContractManagementView }))
);
const NationalTeamView = lazy(() =>
  import('./components/NationalTeamView').then((m) => ({ default: m.NationalTeamView }))
);
const SettingsModal = lazy(() =>
  import('./components/SettingsModal').then((m) => ({ default: m.SettingsModal }))
);
const GameGuideModal = lazy(() =>
  import('./components/GameGuideModal').then((m) => ({ default: m.GameGuideModal }))
);
import type { GameGuideTab } from './components/GameGuideModal';
const PreMatchRivalryModal = lazy(() =>
  import('./components/PreMatchRivalryModal').then((m) => ({ default: m.PreMatchRivalryModal }))
);
const WorldClubsExplorer = lazy(() =>
  import('./components/WorldClubsExplorer').then((m) => ({ default: m.WorldClubsExplorer }))
);
const GlobalSearchModal = lazy(() =>
  import('./components/GlobalSearchModal').then((m) => ({ default: m.GlobalSearchModal }))
);
const MyPlayersView = lazy(() =>
  import('./components/MyPlayersView').then((m) => ({ default: m.MyPlayersView }))
);
const PlayerDetailsModal = lazy(() =>
  import('./components/PlayerDetailsModal').then((m) => ({ default: m.PlayerDetailsModal }))
);
const PlayerComparisonModal = lazy(() =>
  import('./components/PlayerComparisonModal').then((m) => ({ default: m.PlayerComparisonModal }))
);
const Oct2026GlobalSyncModal = lazy(() =>
  import('./components/Oct2026GlobalSyncModal').then((m) => ({ default: m.Oct2026GlobalSyncModal }))
);
const SeasonHistoryView = lazy(() =>
  import('./components/SeasonHistoryView').then((m) => ({ default: m.SeasonHistoryView }))
);
const SeasonYearbookModal = lazy(() =>
  import('./components/SeasonYearbookModal').then((m) => ({ default: m.SeasonYearbookModal }))
);
const InstantMatchResultModal = lazy(() =>
  import('./components/InstantMatchResultModal').then((m) => ({ default: m.InstantMatchResultModal }))
);
const CelebrationModal = lazy(() =>
  import('./components/CelebrationModal').then((m) => ({ default: m.CelebrationModal }))
);

const LazyViewFallback: React.FC = () => (
  <div className="min-h-[260px] flex flex-col items-center justify-center gap-3 text-slate-400">
    <div className="w-8 h-8 rounded-full border-2 border-slate-700 border-t-sky-400 animate-spin" />
    <span className="text-xs font-semibold tracking-wide text-slate-400">
      Carregando módulo...
    </span>
  </div>
);
import { recordCompletedSeasonHistory } from './utils/seasonHistoryEngine';
import { processWorldBallonDorCeremony } from './utils/worldBallonDorEngine';
import {
  generateSuperMundialFixtures,
  isSuperClubWorldCupYear,
} from './utils/superClubWorldCupEngine';
import { evaluateManagerAchievementsAndHallOfFame } from './utils/careerAchievementsEngine';
import { executeInstantUserMatch } from './utils/instantMatchEngine';
import { getMatchRivalryInfo } from './utils/rivalryEngine';
import {
  removeWatchlistEntry,
  resolveWatchlistItems,
  toggleWatchlistEntry,
} from './utils/watchlistEngine';
import {
  GameLanguage,
  GameSettings,
  loadGameSettings,
  saveGameSettings,
  applyPerformanceModeToDocument,
} from './utils/settingsEngine';
import {
  addDays,
  formatShortDate,
  getRoundDate,
  getSerieBRoundDate,
  getSerieBPlayoffDates,
  getSerieCRoundDate,
  getSerieCPlayoffDates,
  daysBetween,
  getUpcomingClubFixture,
  getSeasonStartDate,
  formatEuropeanSeason,
  getEuropeanSeasonStartDate,
  getEuropeanSeasonEndCutoffDate,
  getSplitSeasonStartDate,
} from './utils/calendarUtils';
import { 
  generateSerieDFixturesAndStandings,
  generateLibertadoresFixtures, 
  generateSulamericanaFixtures, 
  generateChampionsLeagueFixtures,
  generateEuropaLeagueFixtures,
  generateConferenceLeagueFixtures,
  generateCopaInternacionalFixtures,
  generateCopaBrasilFixtures, 
  generateCopaNordesteFixtures,
  generateCopaVerdeFixtures,
  generateSupercopaFixtures,
  generateUefaSupercupFixtures,
  generateRecopaFixtures,
  generateEstadualFixtures, 
  COMPETITIONS_CATALOG 
} from './utils/competitionsEngine';
import { generateAllEnglishCupsFixtures } from './utils/englishCupsEngine';
import {
  generateAllEuropeanCupsFixtures,
  flattenEuropeanCupsFixtures,
  isEuropeanCup,
} from './utils/europeanCupsEngine';
import {
  generateAllSouthAmericanCupsFixtures,
  flattenSouthAmericanCupsFixtures,
  isSouthAmericanCup,
} from './utils/southAmericanCupsEngine';
import {
  generateAllWorldCupsFixtures,
  flattenWorldCupsFixtures,
  isWorldCup,
  JAN_DEC_WORLD_CUP_IDS,
  SPLIT_YEAR_WORLD_CUP_IDS,
  WORLD_CUP_IDS,
} from './utils/worldCupsEngine';
import {
  progressSquadMedicalDay,
  computeDailyConditionRecovery,
} from './utils/medicalEngine';
import { 
  serveSquadCompetitionSuspensions, 
  recordPlayerCards, 
  sanitizeLineupForCompetition, 
  isPlayerSuspendedInCompetition 
} from './utils/suspensionEngine';
import { buildAssistantOptimalLineup } from './utils/assistantLineupEngine';
import {
  applySavedLineupProfile,
  buildFixedUnavailableLineup,
  createSavedLineupProfile,
} from './utils/quickLineupEngine';
import {
  processRoundLoans,
  executeBuyOption,
  terminateLoan,
  negotiateActiveLoanBuyOption,
  resolveLoanDurationMonths,
  getClubSeasonLoanCounts,
  MAX_SEASON_LOANS_IN,
  MAX_SEASON_LOANS_OUT,
  resolveClubActiveSeasonYear,
} from './utils/loanEngine';
import { checkAndAwardCupPhasePrize } from './utils/prizeEngine';
import { settleAllSeasonEndPrizes } from './utils/seasonPrizeSettlementEngine';
import {
  signSponsorContract,
  terminateSponsorSlot,
  processRoundSponsors,
  SPONSOR_SLOTS_ORDER,
  getAvailableSponsorOptionsForSlot,
  countActiveSponsors,
} from './utils/sponsorEngine';
import {
  createInitialScoutingNetwork,
  dispatchScoutMission,
  progressScoutingMissions,
  getUpgradeScoutCost,
  getHireFourthScoutCost,
  getFourthScoutWeeklySalary,
} from './utils/scoutingEngine';
import {
  ensureClubYouthAcademy,
  runClubYouthTryout,
  recruitCandidateToAcademy,
  dismissTryoutCandidateFromList,
  promoteBoyToSeniorSquad,
  releaseBoyFromYouthAcademy,
  getYouthUpgradeCost,
  progressYouthAcademyDays,
  processAnnualYouthAcademyRollover,
  updateYouthAcademyTrainingPlan,
  setYouthBoyIndividualFocus,
  runYouthAcademyTrainingSession,
  buildYouthTurned16InboxMessages,
} from './utils/youthAcademyEngine';
import { processSeasonEndIndividualAwards, formatCurrency } from './utils/individualAwardsEngine';
import { buildSeasonRetrospective } from './utils/seasonRetrospectiveEngine';
import {
  createInitialManagerCareer,
  evaluatePostMatchCareerUpdate,
  acceptManagerJobOffer,
  declineManagerJobOffer,
  requestBoardBudgetBoost,
  refreshCareerForNewSeason,
  scoutCoachingVacancies,
  scoutEmergencyClubOffers,
  syncBoardGoalsAndBonuses,
} from './utils/boardCareerEngine';
import {
  getSimultaneousMatchdayFixtures,
  mergeCompletedFixturesIntoState,
  recomputeAllStandings,
  creditCpuPlayersFromFixtures,
  syncDynamicKnockoutBrackets,
  simulateCpuFixturesUpToDate,
  resolveCupChampionId,
  resolveCupRunnerUpId,
  resolveSerieBPromotedIds,
  resolveSerieCPromotedIds,
  resolveSerieDPromotedIds,
  resolvePotiguarFinalClassification,
  applyPotiguarQualificationsAndRebalanceSerieD,
  resolveAllEstaduaisFinalClassifications,
  applyAllEstaduaisQualificationsAndRebalanceSerieD,
  buildEstadualQualificationMeritContext,
  buildRegionalCupTrophyRecords,
  flattenSouthAmericaFixtures,
  flattenEuropeFixtures,
  flattenWorldLeaguesFixtures,
} from './utils/multiLeagueEngine';
import { ensureEuropeanAndDomesticSchedulesInSave } from './utils/scheduleIntegrityEngine';
import { resolveCrossCompetitionScheduleConflicts } from './utils/scheduleConflictResolver';
import {
  SOUTH_AMERICAN_LEAGUE_IDS,
  SOUTH_AMERICAN_LEAGUES_META,
  isSouthAmericanLeague,
  getClubSouthAmericanLeagueId,
  generateAllSouthAmericanLeagues,
  computeConmebolContinentalQualifiers,
  awardSouthAmericanLeagueEndPrizes,
} from './utils/southAmericaLeaguesEngine';
import {
  applyCalibratedSouthAmericaProfilesToClubs,
  calibrateAllSouthAmericanLeaguesWithAI,
  calibrateSouthAmericanLeagueWithAI,
  getCachedSouthAmericaAiProfiles,
} from './services/southAmericaAiService';
import {
  EUROPEAN_LEAGUE_IDS,
  EUROPEAN_LEAGUES_META,
  isEuropeanLeague,
  getClubEuropeanLeagueId,
  generateAllEuropeanLeagues,
  computeUefaContinentalQualifiers,
  applyEnglishPyramidPromotionRelegation,
  awardEuropeanLeagueEndPrizes,
  INITIAL_CHAMPIONS_LEAGUE_CLUB_IDS,
  INITIAL_EUROPA_LEAGUE_CLUB_IDS,
  INITIAL_CONFERENCE_LEAGUE_CLUB_IDS,
} from './utils/europeLeaguesEngine';
import {
  applyCalibratedEuropeProfilesToClubs,
  calibrateAllEuropeanLeaguesWithAI,
  calibrateEuropeanLeagueWithAI,
  getCachedEuropeAiProfiles,
} from './services/europeAiService';
import {
  WORLD_LEAGUE_IDS,
  JAN_DEC_WORLD_LEAGUE_IDS,
  SPLIT_YEAR_WORLD_LEAGUE_IDS,
  WORLD_LEAGUES_META,
  isWorldLeague,
  isSplitYearWorldLeague,
  isSplitCalendarClub,
  getClubWorldLeagueId,
  generateAllWorldLeaguesData,
  awardWorldLeagueEndPrizes,
  resolveWorldLeagueChampionId,
} from './utils/worldLeaguesEngine';
import { isMlsPlayoffFixture } from './utils/usaMlsEngine';
import {
  applyCalibratedWorldProfilesToClubs,
  calibrateAllWorldLeaguesWithAI,
  calibrateWorldLeagueWithAI,
  getCachedWorldAiProfiles,
} from './services/worldLeaguesAiService';
import {
  ensurePlayerContractFields,
  computeDefaultReleaseClause,
  getPlayerRenewalExpectations,
  negotiateContractRenewal,
  signBosmanPreContract,
  triggerReleaseClausePurchase,
  processMidSeasonContractEvents,
  processAnnualSquadLifecycle,
} from './utils/contractLifecycleEngine';
import { rebalanceSaveEconomy } from './utils/economySaveMigration';
import { evaluatePlayerClubWillingness } from './utils/transferWillingnessEngine';
import { resolvePlayerNationality } from './utils/nationalityUtils';
import {
  applyResolvedNationalitiesToSave,
  NationalityGroundingSource,
  syncGameNationalitiesWithAI,
} from './services/nationalityAiService';
import {
  CURRENT_RATINGS_VERSION,
  calibrateAllClubsRealism,
  applyUserPlayerPostMatchDynamicRating,
  applyDailySquadTrainingProgression,
  applySeasonEndRatingsTransition,
} from './utils/clubRatingsEngine';
import {
  syncOverallsWithGeminiAI,
  applyAiOverallsToSave,
} from './services/overallAiService';
import {
  applyCachedOct2026SquadsToClubs,
  applyOct2026AiSquadToClub,
  computeOct2026CoverageSummary,
  filterAndPrioritizeClubsForOct2026Sync,
  getCachedOct2026SquadProfiles,
  getCurrentRealWorldSyncPeriod,
  hydrateOct2026CacheFromServer,
  Oct2026BatchProgress,
  Oct2026ClubSquadProfile,
  Oct2026GroundingSource,
  Oct2026SyncRegionScope,
  resolveClubLeagueDisplayName,
  RosterSyncProviderPreference,
  syncClubsOct2026SquadsWithAI,
} from './services/october2026SquadAiService';
import { buildTeamOfTheRound } from './utils/statsCentralEngine';
import {
  createInitialNationalTeamState,
  ensureUpgradedNationalTeamState,
  refreshNationalTeamForNewSeason,
  processMidSeasonNationalTeamCheck,
  syncNationalTeamByDate,
  getUpcomingUserSelecaoFixture,
  getTeamAllInternationalFixtures,
  playUserInternationalFixture,
  appointUserToNationalTeam,
  acceptCbfCoachingRole,
  acceptNationalTeamJobOffer,
  declineNationalTeamJobOffer,
  scoutNationalTeamVacancies,
  applyForNationalTeamCoachingJob,
  acknowledgeNationalTeamDismissal,
  declineCbfCoachingInvite,
  resignFromSelecaoRole,
  togglePlayerInSelecaoSquad,
  replacePlayerInSelecaoSquad,
  togglePlayerSelecaoStarter,
  swapSelecaoLineupPlayers,
  moveSelecaoPlayerToCustomCoords,
  resetSelecaoCustomPositions,
  updateSelecaoFormation,
  autoPickSelecaoStartersOnly,
  setSelecaoCaptain,
  selectOptimalSelecaoSquad,
  drawNationalTournamentGroups,
  CustomUserInternationalResult,
} from './utils/nationalTeamEngine';
import { regenerateClubCompetitionDraw } from './utils/tournamentDrawEngine';
import {
  createInitialCoachingCarousel,
  ensureCoachingCarouselState,
  processRoundCoachingCarousel,
  hireRealHeadCoachForUserClub,
  resignUserFromCurrentClub,
  applyForClubCoachingJob,
  syncCarouselAfterUserClubSwitch,
  computeClubStaffBonuses,
} from './utils/coachingCarouselEngine';
import { progressClubSquadPositionRetraining } from './utils/positionRetrainingEngine';
import {
  ClausePackageInput,
  buildTransferClauseRecord,
  computeSellOnClauseBuyoutPrice,
  evaluateActiveTransferClausesProgress,
} from './utils/transferClausesEngine';
import {
  FriendlyPackageId,
  getFriendlyPackagesForClub,
  scheduleFriendlyTourFixtures,
} from './utils/friendlyTourEngine';
import {
  processRoundAiTransferMarket,
  respondToIncomingTransferOffer,
  shopPlayerViaAiDirector,
} from './utils/aiTransferEngine';
import {
  generateIntercontinentalFixtures,
  stripWorldGuestClubs,
  withWorldGuestClubs,
} from './utils/intercontinentalEngine';
import { generateConcacafChampionsFixtures } from './utils/concacafChampionsEngine';
import {
  CURRENT_AFC_CHAMPIONS_2026_VERSION,
  generateAfcChampionsFixtures,
} from './utils/afcChampionsEngine';
import {
  createOnDemandPressConference,
  ensureLockerRoomState,
  holdIndividualPlayerTalk,
  processRoundLockerRoomAndPress,
  resolvePlayerDemand,
  submitPressConferenceAnswers,
} from './utils/lockerRoomEngine';
import {
  canClubRegisterNewPlayer,
  findPendingTransferForPlayer,
  getTransferWindowStatus,
  processTransferWindowTransitions,
} from './utils/transferWindowEngine';
import {
  ensureClubMonthlyFinanceHistory,
  evaluateAndApplySeasonEndFinancialFairPlay,
  isClubUnderTransferBan,
  processMonthlyFinancialTurn,
  recordFinanceLedgerMutation,
  resetClubsFinancesForNewSeason,
  syncUserClubLiveMonthlySnapshot,
} from './utils/financialFairPlayEngine';
import {
  buildUefaCupTrophyRecords,
  mergeUniqueTrophies,
  syncOffContinentCalendarRollover,
} from './utils/crossHemisphereCalendarEngine';
import { applySeasonalClubReputationUpdates } from './utils/clubReputationEngine';
import { generateContextualNewsMessages } from './utils/contextualNewsEngine';
import confetti from 'canvas-confetti';
import {
  Trophy,
  Users,
  List,
  Grid,
  Tag,
  Handshake,
  ArrowRightLeft,
  PieChart,
  Award,
  Briefcase,
  FileSignature,
  Scale,
  Ban,
  AlertTriangle,
  Flag,
  Search,
  Building2,
  Compass,
  Crown,
  Dumbbell,
  Globe,
  History,
  Shield,
  Sliders,
  UserCheck,
} from 'lucide-react';
import {
  CareerSaveKey,
  SaveSlotNumber,
  cancelScheduledAutoSave,
  clearAllCareerSaves,
  deleteCareerSave,
  hasAnySavedCareerSlotSync,
  hasSavedAutosaveHintSync,
  initializeCareerSaveStorage,
  loadCareerSave,
  persistCareerSave,
  readSyncCachedOrLegacySave,
  scheduleAutoSave,
} from './utils/saveStorageEngine';

function safePersistSave(key: CareerSaveKey, save: GameSave): void {
  if (key === 'brasfoot_autosave') {
    scheduleAutoSave(save);
  } else {
    void persistCareerSave(key, save);
  }
}

function hasRemainingPreCutoffSelecaoFixtures(state: GameSave): boolean {
  if (!state.nationalTeam?.isUserCoach) return false;
  const nextSel = getUpcomingUserSelecaoFixture(state.nationalTeam, state.currentDate);
  if (!nextSel || !nextSel.date) return false;
  const activeClub = state.clubs.find((c) => c.id === state.userClubId);
  const calYear = Number(state.currentDate.slice(0, 4)) || state.currentSeasonYear;
  const cutoff = isSplitCalendarClub(activeClub) ? `${calYear}-07-31` : `${calYear}-12-31`;
  return nextSel.date <= cutoff;
}

function getAllFixturesFromSave(state: GameSave): Fixture[] {
  return [
    ...state.fixturesA,
    ...state.fixturesB,
    ...(state.fixturesC || []),
    ...(state.fixturesD || []),
    ...(state.fixturesSupercopa || []),
    ...(state.fixturesRecopa || []),
    ...(state.fixturesLibertadores || []),
    ...(state.fixturesSulamericana || []),
    ...(state.fixturesCopaBrasil || []),
    ...(state.fixturesCopaNordeste || []),
    ...(state.fixturesCopaVerde || []),
    ...(state.fixturesEstadual || []),
    ...(state.fixturesIntercontinental || []),
    ...(state.fixturesConcacafChampions || []),
    ...(state.fixturesAfcChampions || []),
    ...(state.fixturesChampionsLeague || []),
    ...(state.fixturesEuropaLeague || []),
    ...(state.fixturesConferenceLeague || []),
    ...(state.fixturesUefaSupercup || []),
    ...(state.fixturesCopaInternacional || []),
    ...(state.fixturesSuperMundial || []),
    ...(state.fixturesEngCommunityShield || []),
    ...(state.fixturesEngEflCup || []),
    ...(state.fixturesEngFaCup || []),
    ...flattenEuropeanCupsFixtures(state.fixturesEuropeanCups),
    ...flattenSouthAmericanCupsFixtures(state.fixturesSouthAmericanCups),
    ...flattenWorldCupsFixtures(state.fixturesWorldCups),
    ...(state.fixturesFriendlies || []),
    ...flattenSouthAmericaFixtures(state.fixturesSouthAmerica),
    ...flattenEuropeFixtures(state.fixturesEurope),
    ...flattenWorldLeaguesFixtures(state.fixturesWorldLeagues),
  ];
}

function advanceWorldCalendarWithRollover(
  prevDate: string,
  draftState: GameSave,
  simTargetDate: string,
  inclusive: boolean,
  stopAtUserFixture: boolean = true
): GameSave {
  const preparedState = ensureEuropeanAndDomesticSchedulesInSave(draftState);
  const sim1 = simulateCpuFixturesUpToDate(preparedState, simTargetDate, inclusive, {
    stopAtUserFixture,
    minCurrentDate: prevDate,
  });
  const effectiveSimDate =
    stopAtUserFixture && sim1.currentDate && sim1.currentDate < simTargetDate
      ? sim1.currentDate
      : simTargetDate;
  const effectiveInclusive = effectiveSimDate < simTargetDate ? false : inclusive;

  const withRollover = ensureEuropeanAndDomesticSchedulesInSave(
    syncOffContinentCalendarRollover(sim1)
  );
  const rolledOver =
    withRollover.europeSeasonYear !== sim1.europeSeasonYear ||
    withRollover.saSeasonYear !== sim1.saSeasonYear;
  const sim2 = rolledOver
    ? simulateCpuFixturesUpToDate(withRollover, effectiveSimDate, effectiveInclusive, {
        stopAtUserFixture,
        minCurrentDate: prevDate,
      })
    : withRollover;
  const withNationalSync = syncNationalTeamByDate(
    sim2,
    sim2.currentDate || draftState.currentDate || effectiveSimDate,
    true
  );
  const postTurnState = evaluateActiveTransferClausesProgress(
    processMonthlyFinancialTurn(
      prevDate,
      processTransferWindowTransitions(prevDate, withNationalSync)
    )
  );
  const baseEvaluatedState =
    rolledOver || sim1 !== preparedState
      ? resolveCrossCompetitionScheduleConflicts(postTurnState)
      : postTurnState;
  const effectiveMarketDate =
    baseEvaluatedState.currentDate || draftState.currentDate || effectiveSimDate;
  const lastSyncRef = baseEvaluatedState.lastAiMarketSyncDate || prevDate;
  const daysSinceMarketSync =
    lastSyncRef && effectiveMarketDate ? daysBetween(lastSyncRef, effectiveMarketDate) : 0;
  const evaluatedState =
    daysSinceMarketSync >= 3
      ? evaluateActiveTransferClausesProgress(
          processRoundAiTransferMarket(baseEvaluatedState, effectiveMarketDate, {
            isCalendarSkip: true,
          })
        )
      : baseEvaluatedState;
  const upcomingCtxFix = getUpcomingClubFixture(
    getAllFixturesFromSave(evaluatedState),
    evaluatedState.userClubId,
    evaluatedState.currentDate
  );
  const ctxMsgs = generateContextualNewsMessages({
    state: evaluatedState,
    upcomingFixture: upcomingCtxFix,
  });
  return ctxMsgs.length > 0
    ? { ...evaluatedState, inbox: [...ctxMsgs, ...evaluatedState.inbox] }
    : evaluatedState;
}

function alignCareerStateAfterClubSwitch(rawState: GameSave): GameSave {
  const state = ensureEuropeanAndDomesticSchedulesInSave(rawState);
  const newClub = state.clubs.find((c) => c.id === state.userClubId);
  if (!newClub) return state;
  const isNewEu = isSplitCalendarClub(newClub);
  const euId = getClubEuropeanLeagueId(newClub);
  const saId = getClubSouthAmericanLeagueId(newClub);
  const wlId = getClubWorldLeagueId(newClub);
  const nextTotalRounds = euId
    ? EUROPEAN_LEAGUES_META[euId].totalRounds
    : saId
    ? SOUTH_AMERICAN_LEAGUES_META[saId].totalRounds
    : wlId
    ? WORLD_LEAGUES_META[wlId].totalRounds
    : newClub.division === 'C'
    ? 46
    : newClub.division === 'EST'
    ? getEstadualTotalRounds(getClubEstadualConfig(newClub))
    : 38;
  const nextSeasonYear = isNewEu
    ? state.europeSeasonYear ?? state.currentSeasonYear
    : state.saSeasonYear ?? state.currentSeasonYear;

  const leaguePool: Fixture[] = euId
    ? state.fixturesEurope?.[euId] || []
    : saId
    ? state.fixturesSouthAmerica?.[saId] || []
    : wlId
    ? state.fixturesWorldLeagues?.[wlId] || []
    : newClub.division === 'B'
    ? state.fixturesB
    : newClub.division === 'C'
    ? state.fixturesC || []
    : newClub.division === 'D'
    ? state.fixturesD || []
    : newClub.division === 'EST'
    ? (state.fixturesEstadual || []).filter(
        (f) => f.homeTeamId === newClub.id || f.awayTeamId === newClub.id
      )
    : state.fixturesA;
  const playedRounds = leaguePool
    .filter((f) => f.played && (f.homeTeamId === newClub.id || f.awayTeamId === newClub.id))
    .map((f) => f.round);
  const nextCurrentRound = Math.min(
    nextTotalRounds,
    (playedRounds.length > 0 ? Math.max(...playedRounds) : 0) + 1
  );

  return {
    ...state,
    currentSeasonYear: nextSeasonYear,
    totalRounds: nextTotalRounds,
    currentRound: nextCurrentRound,
    clubs: state.clubs.map((c) =>
      c.id === state.userClubId
        ? ensureClubMonthlyFinanceHistory(
            ensureClubYouthAcademy(c, state.currentDate),
            state.currentDate,
            nextSeasonYear
          )
        : c
    ),
  };
}

const CURRENT_SHAKHTAR_SP1_VERSION = 1;
const CURRENT_SERIE_D_2027_PARTICIPANTS_VERSION = 1;
const CURRENT_SERIE_C_2027_FORMAT_VERSION = 1;

function sanitizeSave(save: GameSave): GameSave {
  const initialClubs = generateInitialClubs();
  const initialClubById = new Map<string, Club>(initialClubs.map((c) => [c.id, c]));
  const seenIds = new Set<string>();
  const needsCalendarMigration = (save.calendarVersion || 0) < 5;
  const needsDomesticCupsAndEuScheduleV6 = (save.calendarVersion || 0) < 6;
  const needsShakhtarSpecial1Migration =
    (save.shakhtarSpecial1Version ?? 0) < CURRENT_SHAKHTAR_SP1_VERSION;
  const needsEcuador2026RosterMigration =
    (save.ecuador2026RosterVersion ?? 0) < CURRENT_ECUADOR_2026_ROSTER_VERSION;
  const needsColombia2026RosterMigration =
    (save.colombia2026RosterVersion ?? 0) < CURRENT_COLOMBIA_2026_ROSTER_VERSION;
  const needsUruguay2026RosterMigration =
    (save.uruguay2026RosterVersion ?? 0) < CURRENT_URUGUAY_2026_ROSTER_VERSION;
  const needsChile2026RosterMigration =
    (save.chile2026RosterVersion ?? 0) < CURRENT_CHILE_2026_ROSTER_VERSION;
  const needsParaguay2026RosterMigration =
    (save.paraguay2026RosterVersion ?? 0) < CURRENT_PARAGUAY_2026_ROSTER_VERSION;
  const needsPeru2026RosterMigration =
    (save.peru2026RosterVersion ?? 0) < CURRENT_PERU_2026_ROSTER_VERSION;
  const needsBolivia2026RosterMigration =
    (save.bolivia2026RosterVersion ?? 0) < CURRENT_BOLIVIA_2026_ROSTER_VERSION;
  const needsVenezuela2026RosterMigration =
    (save.venezuela2026RosterVersion ?? 0) < CURRENT_VENEZUELA_2026_ROSTER_VERSION;
  const needsArgentina2026RosterMigration =
    (save.argentina2026RosterVersion ?? 0) < CURRENT_ARGENTINA_2026_ROSTER_VERSION;
  const needsSaudiArabia2026RosterMigration =
    (save.saudiArabia2026RosterVersion ?? 0) < CURRENT_SAUDI_2026_ROSTER_VERSION;
  const needsMexico2026RosterMigration =
    (save.mexico2026RosterVersion ?? 0) < CURRENT_MEXICO_2026_ROSTER_VERSION;
  const needsUsaMls2026RosterMigration =
    (save.usaMls2026RosterVersion ?? 0) < CURRENT_USA_MLS_2026_ROSTER_VERSION;
  const needsCanada2026RosterMigration =
    (save.canada2026RosterVersion ?? 0) < CURRENT_CANADA_2026_ROSTER_VERSION;
  const needsRussia2026RosterMigration =
    (save.russia2026RosterVersion ?? 0) < CURRENT_RUSSIA_2026_ROSTER_VERSION;
  const needsPremierLeague2026RosterMigration =
    (save.premierLeague2026RosterVersion ?? 0) < CURRENT_PREMIER_LEAGUE_2026_ROSTER_VERSION;
  const remapLegacySaId = (id: string, club?: Club): string => {
    if (needsEcuador2026RosterMigration) {
      if (id === 'equ_elf') return 'equ_gua';
      if (id === 'equ_vin') return 'equ_leo';
    }
    if (needsColombia2026RosterMigration) {
      if (id === 'col_equ') return 'col_ibo';
      if (id === 'col_env') return 'col_cuc';
      if (id === 'col_mag') return 'col_jag';
    }
    if (needsUruguay2026RosterMigration) {
      if (id === 'uru_pla') return 'uru_alb';
      if (id === 'uru_fen') return 'uru_ces';
      if (id === 'uru_mir') return 'uru_mal';
      if (id === 'uru_riv') return 'uru_cla';
    }
    if (needsChile2026RosterMigration) {
      if (id === 'chi_ues') return 'chi_udc';
      if (id === 'chi_iqu') return 'chi_dco';
    }
    if (needsParaguay2026RosterMigration) {
      if (id === 'par_tac') return 'par_rub';
      if (id === 'par_gen') return 'par_slo';
    }
    if (needsPeru2026RosterMigration) {
      if (id === 'per_bin') return 'per_caj';
      if (id === 'per_aya') return 'per_moq';
    }
    if (needsBolivia2026RosterMigration) {
      if (id === 'bol_wil') return 'bol_rpo';
    }
    if (needsVenezuela2026RosterMigration) {
      if (id === 'ven_yar') return 'ven_tru';
    }
    if (needsSaudiArabia2026RosterMigration) {
      if (id === 'wl_sau_dam') return 'wl_sau_abh';
      if (id === 'wl_sau_weh') return 'wl_sau_dir';
      if (id === 'wl_sau_oro') return 'wl_sau_fai';
      if (id === 'wl_sau_okh') return 'wl_sau_haz';
    }
    if (needsMexico2026RosterMigration) {
      if (id === 'wl_mex_maz') return 'wl_mex_ate';
    }
    if (needsRussia2026RosterMigration) {
      if (id === 'wl_rus_par') return 'wl_rus_rod';
      if (id === 'wl_rus_khi') return 'wl_rus_ore';
      if (id === 'wl_rus_tor') return 'wl_rus_fak';
    }
    if (
      id === 'eu_est' &&
      club &&
      (club.country === 'Portugal' ||
        club.europeanLeagueId === 'por_primeira' ||
        /estrela/i.test(club.name || ''))
    ) {
      return 'eu_est_pt';
    }
    if (
      id === 'eu_cha' &&
      club &&
      (club.country === 'Bélgica' ||
        club.europeanLeagueId === 'bel_pro_league' ||
        /charleroi/i.test(club.name || ''))
    ) {
      return 'eu_cha_be';
    }
    if (
      id === 'eu_bra' &&
      club &&
      (club.country === 'Inglaterra' ||
        club.europeanLeagueId === 'eng_league_one' ||
        /bradford/i.test(club.name || ''))
    ) {
      return 'eu_bra_eng';
    }
    return id;
  };
  const savedUserClub = save.clubs.find((c) => c.id === save.userClubId);
  const resolvedSaveUserClubId = remapLegacySaId(save.userClubId, savedUserClub);

  // Strip any accidental world guest clubs and ensure all official clubs exist without duplicate IDs
  const rawCleanSavedClubs = stripWorldGuestClubs(save.clubs);
  const cleanSavedClubs = (() => {
    const seenRemapped = new Set<string>();
    const remappedList: Club[] = [];
    for (const c of rawCleanSavedClubs) {
      const nextId = remapLegacySaId(c.id, c);
      if (seenRemapped.has(nextId)) continue;
      seenRemapped.add(nextId);
      remappedList.push(nextId === c.id ? c : { ...c, id: nextId, squad: [] });
    }
    return remappedList;
  })();
  const existingClubIds = new Set(cleanSavedClubs.map((c) => c.id));
  const missingClubs = initialClubs.filter((c) => !existingClubIds.has(c.id));
  const fullClubs = [...cleanSavedClubs, ...missingClubs];

  const userCandidate = fullClubs.find((c) => c.id === resolvedSaveUserClubId) || fullClubs[0];
  const userTemplate = userCandidate ? initialClubById.get(userCandidate.id) : undefined;
  const resolvedUserForCal =
    needsCalendarMigration && userTemplate ? userTemplate : userCandidate;
  const isUserEu = isSplitCalendarClub(resolvedUserForCal);
  const userWlIdForCal = resolvedUserForCal ? getClubWorldLeagueId(resolvedUserForCal) : null;
  const needsAfcChampions2026Migration =
    (save.afcChampions2026Version ?? 0) < CURRENT_AFC_CHAMPIONS_2026_VERSION;

  const baseSeasonYear = save.currentSeasonYear || 2027;
  const rawSavedDate = save.currentDate || '';
  const calYearFromDate = /^\d{4}-\d{2}-\d{2}$/.test(rawSavedDate)
    ? Number(rawSavedDate.slice(0, 4))
    : baseSeasonYear;

  const saSeasonYear = save.saSeasonYear
    ? save.saSeasonYear
    : isUserEu
    ? rawSavedDate && rawSavedDate >= getSeasonStartDate(calYearFromDate)
      ? calYearFromDate
      : baseSeasonYear
    : baseSeasonYear;

  const europeSeasonYear = save.europeSeasonYear
    ? save.europeSeasonYear
    : isUserEu
    ? baseSeasonYear
    : rawSavedDate && rawSavedDate < `${calYearFromDate}-07-20`
    ? calYearFromDate - 1
    : calYearFromDate;

  const seasonYear = isUserEu ? europeSeasonYear : saSeasonYear;
  const defaultStartDate = isUserEu
    ? getSplitSeasonStartDate(europeSeasonYear, userWlIdForCal === 'rus_premier')
    : getSeasonStartDate(saSeasonYear);
  const resolvedPreDate =
    needsCalendarMigration &&
    isUserEu &&
    (!rawSavedDate || rawSavedDate < defaultStartDate)
      ? defaultStartDate
      : rawSavedDate || defaultStartDate;

  const needsFlamengoRosterMigration =
    (save.flamengoRosterVersion ?? 0) < CURRENT_FLAMENGO_ROSTER_VERSION;
  const needsPalmeirasRosterMigration =
    (save.palmeirasRosterVersion ?? 0) < CURRENT_PALMEIRAS_ROSTER_VERSION;
  const needsSerieA2026RosterMigration =
    (save.serieA2026RosterVersion ?? 0) < CURRENT_SERIE_A_2026_ROSTER_VERSION;
  const needsSerieB2026RosterMigration =
    (save.serieB2026RosterVersion ?? 0) < CURRENT_SERIE_B_2026_ROSTER_VERSION;
  const needsSerieC2026RosterMigration =
    (save.serieC2026RosterVersion ?? 0) < CURRENT_SERIE_C_2026_ROSTER_VERSION;
  const needsPotiguar2026RosterMigration =
    (save.potiguar2026RosterVersion ?? 0) < CURRENT_POTIGUAR_2026_ROSTER_VERSION;
  const needsEstaduais2026Migration =
    (save.estaduais2026Version ?? 0) < CURRENT_ESTADUAIS_2026_VERSION;
  const needsSerieD2027ParticipantsMigration =
    (save.serieD2027ParticipantsVersion ?? 0) < CURRENT_SERIE_D_2027_PARTICIPANTS_VERSION &&
    saSeasonYear <= 2027;
  const needsSerieC2027FormatMigration =
    (save.serieC2027FormatVersion ?? 0) < CURRENT_SERIE_C_2027_FORMAT_VERSION &&
    saSeasonYear <= 2027;

  const sanitizedClubs = fullClubs.map((club) => {
    const templateClub = initialClubById.get(club.id);
    const shouldSyncSerieD2027Division =
      needsSerieD2027ParticipantsMigration &&
      Boolean(templateClub) &&
      (club.division === 'C' || club.division === 'D' || club.division === 'EST') &&
      (templateClub!.division === 'C' ||
        templateClub!.division === 'D' ||
        templateClub!.division === 'EST');
    const shouldSyncSerieC2027Division =
      needsSerieC2027FormatMigration &&
      Boolean(templateClub) &&
      (club.division === 'B' ||
        club.division === 'C' ||
        club.division === 'D' ||
        club.division === 'EST') &&
      (templateClub!.division === 'B' ||
        templateClub!.division === 'C' ||
        templateClub!.division === 'D' ||
        templateClub!.division === 'EST');
    const resolvedDivision =
      (needsCalendarMigration || shouldSyncSerieD2027Division || shouldSyncSerieC2027Division) &&
      templateClub
        ? templateClub.division
        : club.division;
    const clubCountry = club.country || templateClub?.country || 'Brasil';

    let clubWorking = club;
    if (
      SERIE_A_2026_CURATED_CLUB_IDS.has(club.id) &&
      (needsSerieA2026RosterMigration ||
        (needsFlamengoRosterMigration && club.id === 'fla') ||
        (needsPalmeirasRosterMigration && club.id === 'pal'))
    ) {
      clubWorking = applyOfficialSerieA2026RosterToClub(
        {
          ...club,
          division: resolvedDivision,
          country: clubCountry,
        },
        true
      );
    } else if (SERIE_B_2026_CURATED_CLUB_IDS.has(club.id) && needsSerieB2026RosterMigration) {
      clubWorking = applyOfficialSerieB2026RosterToClub(
        {
          ...club,
          division: resolvedDivision,
          country: clubCountry,
        },
        true
      );
    } else if (
      SERIE_C_2026_CURATED_CLUB_IDS.has(club.id) &&
      needsSerieC2026RosterMigration &&
      ((save.serieC2026RosterVersion ?? 0) < 2 ||
        club.id === 'abc' ||
        club.id === 'gam' ||
        club.id === 'ube' ||
        club.id === 'gtb' ||
        club.id === 'nam' ||
        club.id === 'asa')
    ) {
      clubWorking = applyOfficialSerieC2026RosterToClub(
        {
          ...club,
          division: resolvedDivision,
          country: clubCountry,
        },
        true
      );
    } else if (
      POTIGUAR_2026_CURATED_CLUB_IDS.has(club.id) &&
      needsPotiguar2026RosterMigration &&
      ((save.potiguar2026RosterVersion ?? 0) < 2 || club.id === 'rn_ass')
    ) {
      clubWorking = applyOfficialPotiguar2026RosterToClub(
        {
          ...club,
          division: resolvedDivision,
          country: clubCountry,
        },
        true
      );
    } else if (ECUADOR_2026_CURATED_CLUB_IDS.has(club.id) && needsEcuador2026RosterMigration) {
      clubWorking = applyOfficialEcuador2026RosterToClub(
        {
          ...club,
          division: resolvedDivision,
          country: clubCountry,
        },
        true
      );
    } else if (COLOMBIA_2026_CURATED_CLUB_IDS.has(club.id) && needsColombia2026RosterMigration) {
      clubWorking = applyOfficialColombia2026RosterToClub(
        {
          ...club,
          division: resolvedDivision,
          country: clubCountry,
        },
        true
      );
    } else if (URUGUAY_2026_CURATED_CLUB_IDS.has(club.id) && needsUruguay2026RosterMigration) {
      clubWorking = applyOfficialUruguay2026RosterToClub(
        {
          ...club,
          division: resolvedDivision,
          country: clubCountry,
        },
        true
      );
    } else if (CHILE_2026_CURATED_CLUB_IDS.has(club.id) && needsChile2026RosterMigration) {
      clubWorking = applyOfficialChile2026RosterToClub(
        {
          ...club,
          division: resolvedDivision,
          country: clubCountry,
        },
        true
      );
    } else if (PARAGUAY_2026_CURATED_CLUB_IDS.has(club.id) && needsParaguay2026RosterMigration) {
      clubWorking = applyOfficialParaguay2026RosterToClub(
        {
          ...club,
          division: resolvedDivision,
          country: clubCountry,
        },
        true
      );
    } else if (PERU_2026_CURATED_CLUB_IDS.has(club.id) && needsPeru2026RosterMigration) {
      clubWorking = applyOfficialPeru2026RosterToClub(
        {
          ...club,
          division: resolvedDivision,
          country: clubCountry,
        },
        true
      );
    } else if (BOLIVIA_2026_CURATED_CLUB_IDS.has(club.id) && needsBolivia2026RosterMigration) {
      clubWorking = applyOfficialBolivia2026RosterToClub(
        {
          ...club,
          division: resolvedDivision,
          country: clubCountry,
        },
        true
      );
    } else if (VENEZUELA_2026_CURATED_CLUB_IDS.has(club.id) && needsVenezuela2026RosterMigration) {
      clubWorking = applyOfficialVenezuela2026RosterToClub(
        {
          ...club,
          division: resolvedDivision,
          country: clubCountry,
        },
        true
      );
    } else if (ARGENTINA_2026_CURATED_CLUB_IDS.has(club.id) && needsArgentina2026RosterMigration) {
      clubWorking = applyOfficialArgentina2026RosterToClub(
        {
          ...club,
          division: resolvedDivision,
          country: clubCountry,
        },
        true
      );
    } else if (SAUDI_2026_CURATED_CLUB_IDS.has(club.id) && needsSaudiArabia2026RosterMigration) {
      clubWorking = applyOfficialSaudiArabia2026RosterToClub(
        {
          ...club,
          division: resolvedDivision,
          country: clubCountry,
        },
        true
      );
    } else if (MEXICO_2026_CURATED_CLUB_IDS.has(club.id) && needsMexico2026RosterMigration) {
      clubWorking = applyOfficialMexico2026RosterToClub(
        {
          ...club,
          division: resolvedDivision,
          country: clubCountry,
        },
        true
      );
    } else if (USA_MLS_2026_CURATED_CLUB_IDS.has(club.id) && needsUsaMls2026RosterMigration) {
      clubWorking = applyOfficialUsaMls2026RosterToClub(
        {
          ...club,
          division: resolvedDivision,
          country: clubCountry,
        },
        true
      );
    } else if (CANADA_2026_CURATED_CLUB_IDS.has(club.id) && needsCanada2026RosterMigration) {
      clubWorking = applyOfficialCanada2026RosterToClub(
        {
          ...club,
          division: resolvedDivision,
          country: clubCountry,
        },
        true
      );
    } else if (RUSSIA_2026_CURATED_CLUB_IDS.has(club.id) && needsRussia2026RosterMigration) {
      clubWorking = applyOfficialRussia2026RosterToClub(
        {
          ...club,
          division: resolvedDivision,
          country: clubCountry,
        },
        true
      );
    } else if (
      PREMIER_LEAGUE_2026_CURATED_CLUB_IDS.has(club.id) &&
      needsPremierLeague2026RosterMigration
    ) {
      clubWorking = applyOfficialPremierLeague2026RosterToClub(
        {
          ...club,
          division: resolvedDivision,
          country: clubCountry,
        },
        true
      );
    } else if (
      needsEstaduais2026Migration &&
      templateClub &&
      ESTADUAIS_2026_CURATED_CLUB_IDS.has(club.id) &&
      !POTIGUAR_2026_CURATED_CLUB_IDS.has(club.id) &&
      club.id !== resolvedSaveUserClubId
    ) {
      clubWorking = {
        ...club,
        division: resolvedDivision,
        country: clubCountry,
        managerName: templateClub.managerName || club.managerName,
        stadium: templateClub.stadium || club.stadium,
        squad: templateClub.squad,
      };
    } else if (needsShakhtarSpecial1Migration && club.id === 'eu_shk' && templateClub) {
      clubWorking = {
        ...club,
        division: resolvedDivision,
        country: templateClub.country || clubCountry,
        state: templateClub.state || club.state,
        reputation: templateClub.reputation,
        managerName: templateClub.managerName || club.managerName,
        stadium: templateClub.stadium || club.stadium,
        colors: templateClub.colors || club.colors,
        europeanLeagueId: 'eu_special_1',
        squad: templateClub.squad,
      };
    } else if (needsShakhtarSpecial1Migration && club.id === 'eu_sp1_cel') {
      clubWorking = {
        ...club,
        europeanLeagueId: undefined,
      };
    } else if (needsFlamengoRosterMigration && club.id === 'wl_rus_dyn') {
      clubWorking = {
        ...club,
        squad: club.squad.map((p) =>
          p.name.trim().toLowerCase() === 'jorge carrascal'
            ? createPlayer(
                `${club.id}_mig_fomin_74`,
                'Daniil Fomin',
                'MEI',
                78,
                29,
                74,
                p.isStarter,
                p.isSubstitute,
                'Batedor de Pênaltis',
                clubCountry,
                'Rússia'
              )
            : p
        ),
      };
    }

    const sanitizedSquad = clubWorking.squad.map((player, idx) => {
      let uniqueId = player.id;
      if (seenIds.has(uniqueId)) {
        uniqueId = `${uniqueId}_dedup_${idx}_${player.squadNumber}`;
      }
      seenIds.add(uniqueId);
      const activeSuspensions = (player.suspensions || []).filter((s) => s.matchesRemaining > 0);
      return {
        ...player,
        id: uniqueId,
        nationality: resolvePlayerNationality(player, clubCountry),
        competitionYellowCards: player.competitionYellowCards || {},
        competitionRedCards: player.competitionRedCards || {},
        suspensions: player.suspensions || [],
        isSuspended: activeSuspensions.length > 0,
      };
    });
    const isCuratedOfficialSquad =
      SERIE_A_2026_CURATED_CLUB_IDS.has(clubWorking.id) ||
      SERIE_B_2026_CURATED_CLUB_IDS.has(clubWorking.id) ||
      SERIE_C_2026_CURATED_CLUB_IDS.has(clubWorking.id) ||
      POTIGUAR_2026_CURATED_CLUB_IDS.has(clubWorking.id) ||
      ESTADUAIS_2026_CURATED_CLUB_IDS.has(clubWorking.id) ||
      ECUADOR_2026_CURATED_CLUB_IDS.has(clubWorking.id) ||
      COLOMBIA_2026_CURATED_CLUB_IDS.has(clubWorking.id) ||
      URUGUAY_2026_CURATED_CLUB_IDS.has(clubWorking.id) ||
      CHILE_2026_CURATED_CLUB_IDS.has(clubWorking.id) ||
      PARAGUAY_2026_CURATED_CLUB_IDS.has(clubWorking.id) ||
      PERU_2026_CURATED_CLUB_IDS.has(clubWorking.id) ||
      BOLIVIA_2026_CURATED_CLUB_IDS.has(clubWorking.id) ||
      VENEZUELA_2026_CURATED_CLUB_IDS.has(clubWorking.id) ||
      ARGENTINA_2026_CURATED_CLUB_IDS.has(clubWorking.id) ||
      SAUDI_2026_CURATED_CLUB_IDS.has(clubWorking.id) ||
      MEXICO_2026_CURATED_CLUB_IDS.has(clubWorking.id) ||
      USA_MLS_2026_CURATED_CLUB_IDS.has(clubWorking.id) ||
      CANADA_2026_CURATED_CLUB_IDS.has(clubWorking.id) ||
      RUSSIA_2026_CURATED_CLUB_IDS.has(clubWorking.id);
    const hasValidCuratedCore =
      isCuratedOfficialSquad &&
      sanitizedSquad.length >= 18 &&
      sanitizedSquad.filter((p) => p.detailedRole === 'GOL').length >= 2;
    const minDepth = isCuratedOfficialSquad
      ? Math.max(18, Math.min(MAX_SQUAD_SIZE, sanitizedSquad.length))
      : clubWorking.id === resolvedSaveUserClubId
      ? Math.max(22, Math.min(MAX_SQUAD_SIZE, sanitizedSquad.length))
      : Math.max(24, Math.min(MAX_SQUAD_SIZE, sanitizedSquad.length || 26));
    const depthSquad = (
      hasValidCuratedCore
        ? trimSquadToMaxPlayers(
            sanitizedSquad,
            MAX_SQUAD_SIZE,
            sanitizedSquad.length > MAX_SQUAD_SIZE ||
              sanitizedSquad.filter((p) => p.isStarter).length !== 11
          )
        : trimSquadToMaxPlayers(
            ensureMinimumSquadDepth(
              clubWorking.id,
              resolvedDivision,
              sanitizedSquad,
              minDepth,
              false,
              clubCountry
            ),
            MAX_SQUAD_SIZE,
            sanitizedSquad.length > MAX_SQUAD_SIZE
          )
    ).map((p) => ensurePlayerContractFields(p, clubCountry));
    const shouldSyncGoiatubaMeta =
      needsSerieC2027FormatMigration && Boolean(templateClub) && clubWorking.id === 'gtb';
    const baseClub: Club = {
      ...clubWorking,
      name:
        (shouldSyncSerieD2027Division &&
          templateClub &&
          (clubWorking.id === 'abe' || clubWorking.id === 'bpe')) ||
        shouldSyncGoiatubaMeta
          ? templateClub!.name
          : clubWorking.name,
      shortName:
        (shouldSyncSerieD2027Division &&
          templateClub &&
          (clubWorking.id === 'abe' || clubWorking.id === 'bpe')) ||
        shouldSyncGoiatubaMeta
          ? templateClub!.shortName
          : clubWorking.shortName,
      colors: shouldSyncGoiatubaMeta && templateClub?.colors ? templateClub.colors : clubWorking.colors,
      stadium: shouldSyncGoiatubaMeta && templateClub?.stadium ? templateClub.stadium : clubWorking.stadium,
      managerName:
        (!save.coachingCarousel || shouldSyncGoiatubaMeta) &&
        clubWorking.id !== resolvedSaveUserClubId &&
        templateClub?.managerName
          ? templateClub.managerName
          : clubWorking.managerName,
      division: resolvedDivision,
      country: clubCountry,
      europeanLeagueId:
        clubWorking.id === 'eu_sp1_cel'
          ? undefined
          : clubWorking.europeanLeagueId || templateClub?.europeanLeagueId,
      southAmericanLeagueId: clubWorking.southAmericanLeagueId || templateClub?.southAmericanLeagueId,
      worldLeagueId: clubWorking.worldLeagueId || templateClub?.worldLeagueId,
      state: clubWorking.state || templateClub?.state || 'SP',
      rivals:
        clubWorking.rivals && clubWorking.rivals.length > 0
          ? clubWorking.rivals
          : getDefaultClubRivals(clubWorking.id),
      squad: depthSquad,
    };
    const withYouth =
      clubWorking.id === resolvedSaveUserClubId || clubWorking.youthAcademy
        ? ensureClubYouthAcademy(baseClub, resolvedPreDate)
        : baseClub;
    return clubWorking.id === resolvedSaveUserClubId
      ? ensureClubMonthlyFinanceHistory(withYouth, resolvedPreDate, seasonYear)
      : withYouth;
  });

  const serieBPlayoffDatesForSanitize = getSerieBPlayoffDates(saSeasonYear);
  const serieCPlayoffDatesForSanitize = getSerieCPlayoffDates(saSeasonYear);
  const sanitizeLeagueFixtures = (
    fixturesList: Fixture[] = [],
    comp: CompetitionType = 'serie_a'
  ) => {
    return fixturesList.map((f) => {
      if (comp === 'serie_b' && f.id.startsWith('serie_b_playoff_')) {
        const playoffDate = f.id.includes('_ida')
          ? serieBPlayoffDatesForSanitize.playoffIdaDate
          : serieBPlayoffDatesForSanitize.playoffVoltaDate;
        const playoffTime = f.time || (f.id.includes('_ida') ? '19:30' : '16:00');
        if (needsCalendarMigration) {
          return { ...f, date: playoffDate, time: playoffTime };
        }
        return f.date && f.time ? f : { ...f, date: f.date || playoffDate, time: playoffTime };
      }
      if (comp === 'serie_c' && f.id.startsWith('serie_c_playoff_')) {
        const playoffDate = f.id.includes('_ida')
          ? serieCPlayoffDatesForSanitize.semiIdaDate
          : f.id.includes('_volta')
          ? serieCPlayoffDatesForSanitize.semiVoltaDate
          : serieCPlayoffDatesForSanitize.finalDate;
        const playoffTime = f.time || (f.id.includes('_ida') ? '19:30' : '16:00');
        if (needsCalendarMigration) {
          return { ...f, date: playoffDate, time: playoffTime };
        }
        return f.date && f.time ? f : { ...f, date: f.date || playoffDate, time: playoffTime };
      }
      const dateInfo =
        comp === 'serie_b'
          ? getSerieBRoundDate(f.round, saSeasonYear)
          : comp === 'serie_c'
          ? getSerieCRoundDate(f.round, saSeasonYear)
          : getRoundDate(f.round, saSeasonYear);
      if (needsCalendarMigration) {
        return {
          ...f,
          date: dateInfo.date,
          time: dateInfo.time,
        };
      }
      if (f.date && f.time) return f;
      return {
        ...f,
        date: f.date || dateInfo.date,
        time: f.time || dateInfo.time,
      };
    });
  };

  const mergeCupTemplateWithPlayed = (template: Fixture[], savedList?: Fixture[]): Fixture[] => {
    if (!savedList || savedList.length === 0) return template;
    const isIso = (d?: string) => Boolean(d && /^\d{4}-\d{2}-\d{2}$/.test(d));
    const hasHealthyDates = savedList.every((f) => isIso(f.date) && Boolean(f.time));
    if (!needsCalendarMigration && hasHealthyDates && savedList.length >= template.length) {
      return savedList;
    }
    const savedById = new Map<string, Fixture>(savedList.map((f) => [f.id, f]));
    return template.map((tmpl) => {
      const prev = savedById.get(tmpl.id);
      if (!prev) return tmpl;
      if (!needsCalendarMigration) {
        return {
          ...prev,
          round: prev.round || tmpl.round,
          date: isIso(prev.date) ? prev.date : tmpl.date,
          time: prev.time || tmpl.time,
          cupPhase: prev.cupPhase || tmpl.cupPhase,
        };
      }
      if (!prev.played) return tmpl;
      return {
        ...prev,
        round: tmpl.round,
        date: tmpl.date,
        time: tmpl.time,
        cupPhase: tmpl.cupPhase,
      };
    });
  };

  const serieAClubs = sanitizedClubs.filter((c) => c.division === 'A').map((c) => c.id);
  const serieBClubs = sanitizedClubs.filter((c) => c.division === 'B').map((c) => c.id);
  const serieCClubs = sanitizedClubs.filter((c) => c.division === 'C').map((c) => c.id);

  const hasPlayedSerieBMatches = (save.fixturesB || []).some((f) => f.played);
  const remapSerieB2027ClubId = (id: string): string => {
    if (id === 'pon') return 'mga';
    if (id === 'ame') return 'afe';
    if (id === 'lon') return 'lim';
    if (id === 'ava') return 'stc';
    return id;
  };
  const fixturesA =
    needsCalendarMigration || (save.standingsA || []).length < 20
      ? generateLeagueSchedule(serieAClubs, 'serie_a', saSeasonYear)
      : sanitizeLeagueFixtures(save.fixturesA, 'serie_a');
  const rawFixturesB =
    needsCalendarMigration ||
    (save.standingsB || []).length < 20 ||
    (needsSerieC2027FormatMigration && !hasPlayedSerieBMatches)
      ? generateLeagueSchedule(serieBClubs, 'serie_b', saSeasonYear)
      : needsSerieC2027FormatMigration
      ? sanitizeLeagueFixtures(
          (save.fixturesB || []).map((f) => ({
            ...f,
            homeTeamId: remapSerieB2027ClubId(f.homeTeamId),
            awayTeamId: remapSerieB2027ClubId(f.awayTeamId),
          })),
          'serie_b'
        )
      : sanitizeLeagueFixtures(save.fixturesB, 'serie_b');
  const fixturesB = rawFixturesB.some((f) => f.id === 'serie_b_playoff_1_ida')
    ? rawFixturesB
    : [...rawFixturesB, ...buildSerieBPlayoffFixtures(saSeasonYear, 38)];
  const hasPlayedSerieCMatches = (save.fixturesC || []).some((f) => f.played);
  const hasSerieCPlayoffFinal = (save.fixturesC || []).some(
    (f) => f.id === 'serie_c_playoff_final'
  );
  const remapSerieC2027ClubId = (id: string): string => {
    if (id === 'con') return 'ube';
    if (id === 'ita') return 'asa';
    return id;
  };
  const fixturesC =
    needsCalendarMigration ||
    needsSerieC2027FormatMigration ||
    (save.standingsC || []).length < 24 ||
    !hasSerieCPlayoffFinal ||
    (needsSerieD2027ParticipantsMigration && !hasPlayedSerieCMatches)
      ? generateLeagueSchedule(serieCClubs, 'serie_c', saSeasonYear)
      : needsSerieD2027ParticipantsMigration
      ? sanitizeLeagueFixtures(
          (save.fixturesC || []).map((f) => ({
            ...f,
            homeTeamId: remapSerieC2027ClubId(f.homeTeamId),
            awayTeamId: remapSerieC2027ClubId(f.awayTeamId),
          })),
          'serie_c'
        )
      : sanitizeLeagueFixtures(
          save.fixturesC || generateLeagueSchedule(serieCClubs, 'serie_c', saSeasonYear),
          'serie_c'
        );

  const serieDTemplate = generateSerieDFixturesAndStandings(sanitizedClubs, saSeasonYear);
  const hasGroupedSerieD = Boolean((save.standingsD || [])[0]?.group);
  const fixturesD = needsSerieD2027ParticipantsMigration
    ? serieDTemplate.fixtures
    : needsCalendarMigration || !hasGroupedSerieD
    ? mergeCupTemplateWithPlayed(serieDTemplate.fixtures, save.fixturesD)
    : save.fixturesD || serieDTemplate.fixtures;

  const standingsA =
    needsCalendarMigration || (save.standingsA || []).length < 20
      ? generateInitialStandings(serieAClubs)
      : save.standingsA;
  const standingsB =
    needsCalendarMigration ||
    (save.standingsB || []).length < 20 ||
    (needsSerieC2027FormatMigration && !hasPlayedSerieBMatches)
      ? generateInitialStandings(serieBClubs)
      : needsSerieC2027FormatMigration
      ? (save.standingsB || []).map((s) => ({
          ...s,
          teamId: remapSerieB2027ClubId(s.teamId),
        }))
      : save.standingsB;
  const standingsC =
    needsCalendarMigration ||
    needsSerieC2027FormatMigration ||
    (save.standingsC || []).length < 24 ||
    !hasSerieCPlayoffFinal ||
    (needsSerieD2027ParticipantsMigration && !hasPlayedSerieCMatches)
      ? generateInitialStandings(serieCClubs)
      : needsSerieD2027ParticipantsMigration
      ? (save.standingsC || []).map((s) => ({
          ...s,
          teamId: remapSerieC2027ClubId(s.teamId),
        }))
      : save.standingsC || generateInitialStandings(serieCClubs);
  const standingsD =
    needsSerieD2027ParticipantsMigration || needsCalendarMigration || !hasGroupedSerieD
      ? serieDTemplate.standings
      : save.standingsD || serieDTemplate.standings;

  const potiguarCopaBrasilQualifiedIds =
    save.potiguarCopaBrasilQualifiedIds && save.potiguarCopaBrasilQualifiedIds.length > 0
      ? save.potiguarCopaBrasilQualifiedIds
      : ['abc', 'arn', 'rn_scn'];
  const potiguarCopaNordesteQualifiedIds =
    save.potiguarCopaNordesteQualifiedIds && save.potiguarCopaNordesteQualifiedIds.length > 0
      ? save.potiguarCopaNordesteQualifiedIds
      : ['abc', 'arn'];
  const estadualCopaBrasilQualifiedIds =
    save.estadualCopaBrasilQualifiedIds && save.estadualCopaBrasilQualifiedIds.length >= 20
      ? save.estadualCopaBrasilQualifiedIds
      : undefined;
  const estadualCopaNordesteQualifiedIds =
    save.estadualCopaNordesteQualifiedIds && save.estadualCopaNordesteQualifiedIds.length >= 16
      ? save.estadualCopaNordesteQualifiedIds
      : undefined;
  const estadualCopaVerdeQualifiedIds =
    save.estadualCopaVerdeQualifiedIds && save.estadualCopaVerdeQualifiedIds.length >= 8
      ? save.estadualCopaVerdeQualifiedIds
      : undefined;

  const libData = generateLibertadoresFixtures(sanitizedClubs, saSeasonYear);
  const sulaData = generateSulamericanaFixtures(sanitizedClubs, saSeasonYear);
  const cdbTemplate = generateCopaBrasilFixtures(
    sanitizedClubs,
    saSeasonYear,
    estadualCopaBrasilQualifiedIds || potiguarCopaBrasilQualifiedIds
  );
  const cneData = generateCopaNordesteFixtures(
    sanitizedClubs,
    saSeasonYear,
    estadualCopaNordesteQualifiedIds
  );
  const cvData = generateCopaVerdeFixtures(
    sanitizedClubs,
    saSeasonYear,
    estadualCopaVerdeQualifiedIds
  );
  const supercopaTemplate = generateSupercopaFixtures(sanitizedClubs, saSeasonYear);
  const recopaTemplate = generateRecopaFixtures(sanitizedClubs, saSeasonYear);
  const estData = generateEstadualFixtures(sanitizedClubs, saSeasonYear);

  const distinctEstadualGroupsCount = new Set(
    (save.standingsEstadual || []).map((s) => s.group).filter(Boolean)
  ).size;
  const hasAll27EstaduaisInSave =
    !needsEstaduais2026Migration &&
    distinctEstadualGroupsCount >= 27 &&
    (save.standingsEstadual || []).filter((s) => s.group === 'Campeonato Potiguar (RN)').length ===
      12;
  const hasSavedCopaNordeste =
    !needsCalendarMigration &&
    !needsEstaduais2026Migration &&
    Array.isArray(save.fixturesCopaNordeste) &&
    save.fixturesCopaNordeste.length > 0 &&
    Array.isArray(save.standingsCopaNordeste) &&
    (save.standingsCopaNordeste.length >= 20 ||
      save.fixturesCopaNordeste.some((f) => f.played));
  const hasSavedCopaVerde =
    !needsCalendarMigration &&
    !needsEstaduais2026Migration &&
    Array.isArray(save.fixturesCopaVerde) &&
    save.fixturesCopaVerde.length > 0 &&
    Array.isArray(save.standingsCopaVerde) &&
    (save.standingsCopaVerde.length >= 24 ||
      save.fixturesCopaVerde.some((f) => f.played));

  const fixturesLibertadores = mergeCupTemplateWithPlayed(libData.fixtures, save.fixturesLibertadores);
  const fixturesSulamericana = mergeCupTemplateWithPlayed(sulaData.fixtures, save.fixturesSulamericana);
  const fixturesCopaBrasil = needsEstaduais2026Migration && !(save.fixturesCopaBrasil || []).some((f) => f.played)
    ? cdbTemplate
    : mergeCupTemplateWithPlayed(cdbTemplate, save.fixturesCopaBrasil);
  const fixturesCopaNordeste = hasSavedCopaNordeste
    ? save.fixturesCopaNordeste!
    : cneData.fixtures;
  const standingsCopaNordeste = hasSavedCopaNordeste
    ? save.standingsCopaNordeste!
    : cneData.standings;
  const fixturesCopaVerde = hasSavedCopaVerde ? save.fixturesCopaVerde! : cvData.fixtures;
  const standingsCopaVerde = hasSavedCopaVerde ? save.standingsCopaVerde! : cvData.standings;
  const fixturesSupercopa = mergeCupTemplateWithPlayed(supercopaTemplate, save.fixturesSupercopa);
  const fixturesRecopa = mergeCupTemplateWithPlayed(recopaTemplate, save.fixturesRecopa);
  const fixturesEstadual =
    needsCalendarMigration || !hasAll27EstaduaisInSave
      ? (() => {
          const savedPlayedById = new Map<string, Fixture>(
            (save.fixturesEstadual || []).filter((f) => f.played).map((f) => [f.id, f])
          );
          return estData.fixtures.map((tmpl) => savedPlayedById.get(tmpl.id) || tmpl);
        })()
      : save.fixturesEstadual || estData.fixtures;

  const uclData = generateChampionsLeagueFixtures(sanitizedClubs, europeSeasonYear);
  const uelData = generateEuropaLeagueFixtures(sanitizedClubs, europeSeasonYear);
  const ueclData = generateConferenceLeagueFixtures(sanitizedClubs, europeSeasonYear);
  const savedUclTeamIds = new Set((save.standingsChampionsLeague || []).map((s) => s.teamId));
  const hasAllInitialUclClubs =
    INITIAL_CHAMPIONS_LEAGUE_CLUB_IDS.every((id) => savedUclTeamIds.has(id));
  const hasUclStarted = (save.fixturesChampionsLeague || []).some((f) => f.played);
  const needsUclClubsUpdate = !hasAllInitialUclClubs && !hasUclStarted;

  const savedUelTeamIds = new Set((save.standingsEuropaLeague || []).map((s) => s.teamId));
  const hasAllInitialUelClubs =
    INITIAL_EUROPA_LEAGUE_CLUB_IDS.every((id) => savedUelTeamIds.has(id));
  const hasUelStarted = (save.fixturesEuropaLeague || []).some((f) => f.played);
  const needsUelClubsUpdate = !hasAllInitialUelClubs && !hasUelStarted;

  const savedUeclTeamIds = new Set((save.standingsConferenceLeague || []).map((s) => s.teamId));
  const hasAllInitialUeclClubs =
    INITIAL_CONFERENCE_LEAGUE_CLUB_IDS.every((id) => savedUeclTeamIds.has(id));
  const hasUeclStarted = (save.fixturesConferenceLeague || []).some((f) => f.played);
  const needsUeclClubsUpdate = !hasAllInitialUeclClubs && !hasUeclStarted;

  const needsUefa36Migration =
    (save.standingsChampionsLeague || []).length < 36 ||
    (save.standingsEuropaLeague || []).length < 36 ||
    (save.standingsConferenceLeague || []).length < 36 ||
    needsUclClubsUpdate ||
    needsUelClubsUpdate ||
    needsUeclClubsUpdate;
  const fixturesChampionsLeague =
    needsCalendarMigration || needsUefa36Migration || needsUclClubsUpdate
      ? uclData.fixtures
      : mergeCupTemplateWithPlayed(uclData.fixtures, save.fixturesChampionsLeague);
  const fixturesEuropaLeague =
    needsCalendarMigration || needsUefa36Migration || needsUelClubsUpdate
      ? uelData.fixtures
      : mergeCupTemplateWithPlayed(uelData.fixtures, save.fixturesEuropaLeague);
  const fixturesConferenceLeague =
    needsCalendarMigration || needsUefa36Migration || needsUeclClubsUpdate
      ? ueclData.fixtures
      : mergeCupTemplateWithPlayed(ueclData.fixtures, save.fixturesConferenceLeague);

  const janDecWlTemplate = generateAllWorldLeaguesData(
    sanitizedClubs,
    saSeasonYear,
    JAN_DEC_WORLD_LEAGUE_IDS
  );
  const splitWlTemplate = generateAllWorldLeaguesData(
    sanitizedClubs,
    europeSeasonYear,
    SPLIT_YEAR_WORLD_LEAGUE_IDS
  );
  const fixturesWorldLeagues: Partial<Record<WorldLeagueId, Fixture[]>> = {};
  const standingsWorldLeagues: Partial<Record<WorldLeagueId, Standing[]>> = {};
  for (const leagueId of WORLD_LEAGUE_IDS) {
    const isSplitWl = isSplitYearWorldLeague(leagueId);
    const rawSavedFix = save.fixturesWorldLeagues?.[leagueId];
    const rawSavedStd = save.standingsWorldLeagues?.[leagueId];
    const shouldRemapWorldLeague =
      (needsSaudiArabia2026RosterMigration && leagueId === 'sau_pro') ||
      (needsMexico2026RosterMigration && leagueId === 'mex_ligamx') ||
      (needsRussia2026RosterMigration && leagueId === 'rus_premier');
    const savedFix =
      shouldRemapWorldLeague && Array.isArray(rawSavedFix)
        ? rawSavedFix.map((f) => ({
            ...f,
            homeTeamId: remapLegacySaId(f.homeTeamId),
            awayTeamId: remapLegacySaId(f.awayTeamId),
          }))
        : rawSavedFix;
    const savedStd =
      shouldRemapWorldLeague && Array.isArray(rawSavedStd)
        ? rawSavedStd.map((s) => ({ ...s, teamId: remapLegacySaId(s.teamId) }))
        : rawSavedStd;
    const expectedCount = WORLD_LEAGUES_META[leagueId].clubsCount;
    const shouldRegenMls =
      leagueId === 'usa_mls' && (save.usaMls2026RosterVersion ?? 0) < 1;
    const shouldRegenCanada =
      leagueId === 'can_cpl' && needsCanada2026RosterMigration;
    const hasUnplayedLegacySplitDates = Boolean(
      isSplitWl &&
        needsAfcChampions2026Migration &&
        Array.isArray(savedFix) &&
        savedFix.length > 0 &&
        !savedFix.some((f) => f.played) &&
        savedFix[0]?.date &&
        savedFix[0].date < `${europeSeasonYear}-07-01`
    );
    const hasCompleteSavedLeague =
      !needsCalendarMigration &&
      !shouldRegenMls &&
      !shouldRegenCanada &&
      !hasUnplayedLegacySplitDates &&
      Array.isArray(savedFix) &&
      savedFix.length > 0 &&
      Array.isArray(savedStd) &&
      savedStd.length >= expectedCount;
    const hasWlSameDayCollision = (list: Fixture[]): boolean => {
      const seen = new Set<string>();
      for (const f of list) {
        if (!f.date) continue;
        for (const tid of [f.homeTeamId, f.awayTeamId]) {
          if (!tid || tid === 'tbd' || tid.startsWith('TBD')) continue;
          const k = `${tid}::${f.date}`;
          if (seen.has(k)) return true;
          seen.add(k);
        }
      }
      return false;
    };
    const tmplSource = isSplitWl ? splitWlTemplate : janDecWlTemplate;
    const tmplWlFix = tmplSource.fixturesWorldLeagues[leagueId] || [];
    const hasPlayedWl = Array.isArray(savedFix) && savedFix.some((f) => f.played);
    const shouldRepairWlDates =
      hasCompleteSavedLeague &&
      Array.isArray(savedFix) &&
      ((needsDomesticCupsAndEuScheduleV6 && !hasPlayedWl) || hasWlSameDayCollision(savedFix));
    fixturesWorldLeagues[leagueId] = hasCompleteSavedLeague
      ? shouldRepairWlDates
        ? hasPlayedWl
          ? savedFix.map((f) => {
              if (f.played) return f;
              const tmpl = tmplWlFix.find((t) => t.id === f.id);
              return tmpl ? { ...f, date: tmpl.date, time: tmpl.time } : f;
            })
          : tmplWlFix
        : savedFix
      : tmplWlFix;
    standingsWorldLeagues[leagueId] = hasCompleteSavedLeague
      ? savedStd
      : tmplSource.standingsWorldLeagues[leagueId];
  }

  const cintData = generateCopaInternacionalFixtures(
    sanitizedClubs,
    saSeasonYear,
    standingsWorldLeagues
  );
  const shouldRemapCint =
    needsSaudiArabia2026RosterMigration ||
    needsMexico2026RosterMigration ||
    needsRussia2026RosterMigration;
  const remappedSavedCintFix =
    shouldRemapCint && Array.isArray(save.fixturesCopaInternacional)
      ? save.fixturesCopaInternacional.map((f) => ({
          ...f,
          homeTeamId: remapLegacySaId(f.homeTeamId),
          awayTeamId: remapLegacySaId(f.awayTeamId),
        }))
      : save.fixturesCopaInternacional;
  const remappedSavedCintStd =
    shouldRemapCint && Array.isArray(save.standingsCopaInternacional)
      ? save.standingsCopaInternacional.map((s) => ({
          ...s,
          teamId: remapLegacySaId(s.teamId),
        }))
      : save.standingsCopaInternacional;
  const needsCintMigration = (remappedSavedCintStd || []).length < 32;
  const fixturesCopaInternacional =
    needsCalendarMigration || needsCintMigration
      ? cintData.fixtures
      : mergeCupTemplateWithPlayed(cintData.fixtures, remappedSavedCintFix);
  const standingsCopaInternacional =
    needsCalendarMigration || needsCintMigration
      ? cintData.standings
      : remappedSavedCintStd || cintData.standings;

  const concacafTemplate = generateConcacafChampionsFixtures(
    sanitizedClubs,
    saSeasonYear,
    standingsWorldLeagues,
    fixturesWorldLeagues
  );
  const needsConcacafMigration =
    needsCalendarMigration ||
    !Array.isArray(save.fixturesConcacafChampions) ||
    save.fixturesConcacafChampions.length < 51;
  const fixturesConcacafChampions = needsConcacafMigration
    ? concacafTemplate.fixtures
    : mergeCupTemplateWithPlayed(concacafTemplate.fixtures, save.fixturesConcacafChampions);

  const knownAfcChamp =
    save.reigningAfcChampId ||
    resolveCupChampionId(save.fixturesAfcChampions) ||
    'wl_sau_ahl';
  const afcTemplate = generateAfcChampionsFixtures(
    sanitizedClubs,
    europeSeasonYear,
    standingsWorldLeagues,
    knownAfcChamp
  );
  const needsAfcMigration =
    needsCalendarMigration ||
    needsAfcChampions2026Migration ||
    !Array.isArray(save.fixturesAfcChampions) ||
    save.fixturesAfcChampions.length < 128;
  const fixturesAfcChampions = needsAfcMigration
    ? afcTemplate.fixtures
    : mergeCupTemplateWithPlayed(afcTemplate.fixtures, save.fixturesAfcChampions);
  const standingsAfcChampions = needsAfcMigration
    ? afcTemplate.standings
    : save.standingsAfcChampions && save.standingsAfcChampions.length >= 32
    ? save.standingsAfcChampions
    : afcTemplate.standings;

  const knownLibChamp = resolveCupChampionId(fixturesLibertadores);
  const knownCintChamp = resolveCupChampionId(fixturesCopaInternacional);
  const knownConcacafChamp = resolveCupChampionId(fixturesConcacafChampions);
  const knownUclChamp =
    save.reigningUclChampId || resolveCupChampionId(fixturesChampionsLeague) || 'eu_psg';
  const knownUelChamp =
    save.reigningUelChampId || resolveCupChampionId(fixturesEuropaLeague) || 'eu_avl';
  const uefaSupercupTemplate = generateUefaSupercupFixtures(
    sanitizedClubs,
    europeSeasonYear,
    knownUclChamp,
    knownUelChamp
  );
  const fixturesUefaSupercup = mergeCupTemplateWithPlayed(
    uefaSupercupTemplate,
    save.fixturesUefaSupercup
  );
  const resolvedAfcChampForIntercont =
    resolveCupChampionId(fixturesAfcChampions) || knownAfcChamp;
  const intercontTemplate = generateIntercontinentalFixtures(
    saSeasonYear,
    knownLibChamp,
    knownUclChamp,
    sanitizedClubs,
    standingsWorldLeagues,
    knownCintChamp,
    knownConcacafChamp,
    resolvedAfcChampForIntercont
  );
  const needsIntercont4Migration =
    (save.fixturesIntercontinental || []).length < 4 &&
    !(save.fixturesIntercontinental || []).some((f) => f.played);
  const fixturesIntercontinental = needsIntercont4Migration
    ? intercontTemplate
    : mergeCupTemplateWithPlayed(intercontTemplate, save.fixturesIntercontinental);

  const saTemplate = generateAllSouthAmericanLeagues(sanitizedClubs, saSeasonYear);
  const fixturesSouthAmerica: Partial<Record<SouthAmericanLeagueId, Fixture[]>> = {};
  const standingsSouthAmerica: Partial<Record<SouthAmericanLeagueId, Standing[]>> = {};
  for (const leagueId of SOUTH_AMERICAN_LEAGUE_IDS) {
    const rawSavedFix = save.fixturesSouthAmerica?.[leagueId];
    const rawSavedStd = save.standingsSouthAmerica?.[leagueId];
    const shouldRemapLeague =
      (needsEcuador2026RosterMigration && leagueId === 'liga_equ') ||
      (needsColombia2026RosterMigration && leagueId === 'liga_col') ||
      (needsUruguay2026RosterMigration && leagueId === 'liga_uru') ||
      (needsChile2026RosterMigration && leagueId === 'liga_chi') ||
      (needsParaguay2026RosterMigration && leagueId === 'liga_par') ||
      (needsPeru2026RosterMigration && leagueId === 'liga_per') ||
      (needsBolivia2026RosterMigration && leagueId === 'liga_bol') ||
      (needsVenezuela2026RosterMigration && leagueId === 'liga_ven');
    const savedFix =
      shouldRemapLeague && Array.isArray(rawSavedFix)
        ? rawSavedFix.map((f) => ({
            ...f,
            homeTeamId: remapLegacySaId(f.homeTeamId),
            awayTeamId: remapLegacySaId(f.awayTeamId),
          }))
        : rawSavedFix;
    const savedStd =
      shouldRemapLeague && Array.isArray(rawSavedStd)
        ? rawSavedStd.map((s) => ({ ...s, teamId: remapLegacySaId(s.teamId) }))
        : rawSavedStd;
    const expectedCount = SOUTH_AMERICAN_LEAGUES_META[leagueId].clubsCount;
    const hasCompleteSavedLeague =
      !needsCalendarMigration &&
      !(needsArgentina2026RosterMigration && leagueId === 'liga_arg') &&
      Array.isArray(savedFix) &&
      savedFix.length > 0 &&
      Array.isArray(savedStd) &&
      savedStd.length >= expectedCount;
    fixturesSouthAmerica[leagueId] = hasCompleteSavedLeague
      ? savedFix
      : saTemplate.fixturesSouthAmerica[leagueId];
    standingsSouthAmerica[leagueId] = hasCompleteSavedLeague
      ? savedStd
      : saTemplate.standingsSouthAmerica[leagueId];
  }

  const euTemplate = generateAllEuropeanLeagues(sanitizedClubs, europeSeasonYear);
  const hasEuSameDayCollision = (list: Fixture[]): boolean => {
    const seen = new Set<string>();
    for (const f of list) {
      if (!f.date) continue;
      for (const tid of [f.homeTeamId, f.awayTeamId]) {
        if (!tid || tid === 'tbd' || tid.startsWith('TBD')) continue;
        const k = `${tid}::${f.date}`;
        if (seen.has(k)) return true;
        seen.add(k);
      }
    }
    return false;
  };
  const fixturesEurope: Partial<Record<EuropeanLeagueId, Fixture[]>> = {};
  const standingsEurope: Partial<Record<EuropeanLeagueId, Standing[]>> = {};
  for (const leagueId of EUROPEAN_LEAGUE_IDS) {
    const rawSavedFix = save.fixturesEurope?.[leagueId];
    const rawSavedStd = save.standingsEurope?.[leagueId];
    const shouldSwapCeljeToShakhtar =
      needsShakhtarSpecial1Migration && leagueId === 'eu_special_1';
    const savedFix = Array.isArray(rawSavedFix)
      ? rawSavedFix.map((f) => ({
          ...f,
          homeTeamId: remapLegacySaId(
            shouldSwapCeljeToShakhtar && f.homeTeamId === 'eu_sp1_cel' ? 'eu_shk' : f.homeTeamId
          ),
          awayTeamId: remapLegacySaId(
            shouldSwapCeljeToShakhtar && f.awayTeamId === 'eu_sp1_cel' ? 'eu_shk' : f.awayTeamId
          ),
        }))
      : rawSavedFix;
    const savedStd = Array.isArray(rawSavedStd)
      ? rawSavedStd.map((s) => ({
          ...s,
          teamId: remapLegacySaId(
            shouldSwapCeljeToShakhtar && s.teamId === 'eu_sp1_cel' ? 'eu_shk' : s.teamId
          ),
        }))
      : rawSavedStd;
    const expectedCount = EUROPEAN_LEAGUES_META[leagueId].clubsCount;
    const hasCompleteSavedLeague =
      !needsCalendarMigration &&
      Array.isArray(savedFix) &&
      savedFix.length > 0 &&
      Array.isArray(savedStd) &&
      savedStd.length >= expectedCount;
    const tmplEuFix = euTemplate.fixturesEurope[leagueId] || [];
    const hasPlayedEu = Array.isArray(savedFix) && savedFix.some((f) => f.played);
    const needsEuScheduleFix =
      hasCompleteSavedLeague &&
      Array.isArray(savedFix) &&
      ((needsDomesticCupsAndEuScheduleV6 && !hasPlayedEu) || hasEuSameDayCollision(savedFix));
    fixturesEurope[leagueId] = hasCompleteSavedLeague
      ? needsEuScheduleFix
        ? hasPlayedEu
          ? (() => {
              const playedById = new Map(
                savedFix.filter((f) => f.played).map((f) => [f.id, f])
              );
              return tmplEuFix.map((t) => playedById.get(t.id) || t);
            })()
          : tmplEuFix
        : savedFix
      : tmplEuFix;
    standingsEurope[leagueId] = hasCompleteSavedLeague
      ? savedStd
      : euTemplate.standingsEurope[leagueId];
  }

  const smwcTemplate = isSuperClubWorldCupYear(saSeasonYear)
    ? generateSuperMundialFixtures(
        {
          clubs: sanitizedClubs,
          standingsA,
          standingsEurope,
          standingsSouthAmerica,
          standingsWorldLeagues,
          fixturesChampionsLeague,
          fixturesLibertadores,
          fixturesCopaInternacional,
          fixturesConcacafChampions,
          fixturesAfcChampions,
          reigningUclChampId: knownUclChamp,
        },
        saSeasonYear
      )
    : null;
  const fixturesSuperMundial = smwcTemplate
    ? mergeCupTemplateWithPlayed(smwcTemplate.fixtures, save.fixturesSuperMundial)
    : [];
  const standingsSuperMundial = smwcTemplate
    ? save.standingsSuperMundial && save.standingsSuperMundial.length >= 32
      ? save.standingsSuperMundial
      : smwcTemplate.standings
    : [];

  const engCupsTemplate = generateAllEnglishCupsFixtures(sanitizedClubs, europeSeasonYear, {
    fixturesEurope,
  });
  const hasPlayedEngCups = [
    ...(save.fixturesEngCommunityShield || []),
    ...(save.fixturesEngEflCup || []),
    ...(save.fixturesEngFaCup || []),
  ].some((f) => f.played);

  const fixturesEngCommunityShield =
    needsDomesticCupsAndEuScheduleV6 && !hasPlayedEngCups
      ? engCupsTemplate.fixturesEngCommunityShield
      : mergeCupTemplateWithPlayed(
          engCupsTemplate.fixturesEngCommunityShield,
          save.fixturesEngCommunityShield
        );
  const fixturesEngEflCup =
    needsDomesticCupsAndEuScheduleV6 && !hasPlayedEngCups
      ? engCupsTemplate.fixturesEngEflCup
      : mergeCupTemplateWithPlayed(engCupsTemplate.fixturesEngEflCup, save.fixturesEngEflCup);
  const fixturesEngFaCup =
    needsDomesticCupsAndEuScheduleV6 && !hasPlayedEngCups
      ? engCupsTemplate.fixturesEngFaCup
      : mergeCupTemplateWithPlayed(engCupsTemplate.fixturesEngFaCup, save.fixturesEngFaCup);

  const europeanCupsTemplates = generateAllEuropeanCupsFixtures(sanitizedClubs, europeSeasonYear, {
    fixturesEurope,
  });
  const fixturesEuropeanCups: Partial<Record<EuropeanCupId, Fixture[]>> = {};
  for (const cupId of Object.keys(europeanCupsTemplates) as EuropeanCupId[]) {
    const rawSavedCup = save.fixturesEuropeanCups?.[cupId];
    const remappedCup = Array.isArray(rawSavedCup)
      ? rawSavedCup.map((f) => ({
          ...f,
          homeTeamId: remapLegacySaId(
            needsShakhtarSpecial1Migration && cupId === 'eu_sp1_cup' && f.homeTeamId === 'eu_sp1_cel'
              ? 'eu_shk'
              : f.homeTeamId
          ),
          awayTeamId: remapLegacySaId(
            needsShakhtarSpecial1Migration && cupId === 'eu_sp1_cup' && f.awayTeamId === 'eu_sp1_cel'
              ? 'eu_shk'
              : f.awayTeamId
          ),
        }))
      : rawSavedCup;
    const hasPlayedCup = Array.isArray(remappedCup) && remappedCup.some((f) => f.played);
    fixturesEuropeanCups[cupId] =
      needsDomesticCupsAndEuScheduleV6 && !hasPlayedCup
        ? europeanCupsTemplates[cupId] || []
        : mergeCupTemplateWithPlayed(europeanCupsTemplates[cupId] || [], remappedCup);
  }

  const saCupsTemplates = generateAllSouthAmericanCupsFixtures(
    sanitizedClubs,
    saSeasonYear,
    flattenSouthAmericaFixtures(fixturesSouthAmerica)
  );
  const fixturesSouthAmericanCups: Partial<Record<SouthAmericanCupId, Fixture[]>> = {};
  for (const cupId of Object.keys(saCupsTemplates) as SouthAmericanCupId[]) {
    const rawSavedCup = save.fixturesSouthAmericanCups?.[cupId];
    const shouldRemapCup =
      (needsEcuador2026RosterMigration &&
        (cupId === 'sa_copa_ecuador' || cupId === 'sa_supercopa_ecuador')) ||
      (needsColombia2026RosterMigration &&
        (cupId === 'sa_copa_colombia' || cupId === 'sa_superliga_colombia')) ||
      (needsUruguay2026RosterMigration &&
        (cupId === 'sa_copa_uruguay' || cupId === 'sa_supercopa_uruguay')) ||
      (needsChile2026RosterMigration &&
        (cupId === 'sa_copa_chile' || cupId === 'sa_supercopa_chile')) ||
      (needsParaguay2026RosterMigration &&
        (cupId === 'sa_copa_paraguay' || cupId === 'sa_supercopa_paraguay')) ||
      (needsPeru2026RosterMigration &&
        (cupId === 'sa_copa_peru' || cupId === 'sa_supercopa_peru')) ||
      (needsBolivia2026RosterMigration &&
        (cupId === 'sa_copa_bolivia' || cupId === 'sa_supercopa_bolivia')) ||
      (needsVenezuela2026RosterMigration &&
        (cupId === 'sa_copa_venezuela' || cupId === 'sa_supercopa_venezuela'));
    const remappedCup =
      shouldRemapCup && Array.isArray(rawSavedCup)
        ? rawSavedCup.map((f) => ({
            ...f,
            homeTeamId: remapLegacySaId(f.homeTeamId),
            awayTeamId: remapLegacySaId(f.awayTeamId),
          }))
        : rawSavedCup;
    fixturesSouthAmericanCups[cupId] = mergeCupTemplateWithPlayed(
      saCupsTemplates[cupId] || [],
      remappedCup
    );
  }

  const worldCupsTemplates = generateAllWorldCupsFixtures(
    sanitizedClubs,
    saSeasonYear,
    europeSeasonYear,
    {
      fixturesWorldLeagues,
      fixturesConcacafChampions,
      fixturesAfcChampions,
      fixturesCopaInternacional,
    }
  );
  const fixturesWorldCups: Partial<Record<WorldCupId, Fixture[]>> = {};
  for (const cupId of WORLD_CUP_IDS) {
    const rawSavedCup = save.fixturesWorldCups?.[cupId];
    const remappedCup = Array.isArray(rawSavedCup)
      ? rawSavedCup.map((f) => ({
          ...f,
          homeTeamId: remapLegacySaId(f.homeTeamId),
          awayTeamId: remapLegacySaId(f.awayTeamId),
        }))
      : rawSavedCup;
    fixturesWorldCups[cupId] = mergeCupTemplateWithPlayed(
      worldCupsTemplates[cupId] || [],
      remappedCup
    );
  }

  const allMergedForDateCheck = [
    ...fixturesA,
    ...fixturesB,
    ...fixturesC,
    ...fixturesD,
    ...fixturesSupercopa,
    ...fixturesRecopa,
    ...fixturesLibertadores,
    ...fixturesSulamericana,
    ...fixturesCopaBrasil,
    ...fixturesCopaNordeste,
    ...fixturesCopaVerde,
    ...fixturesEstadual,
    ...fixturesIntercontinental,
    ...fixturesConcacafChampions,
    ...fixturesAfcChampions,
    ...fixturesChampionsLeague,
    ...fixturesEuropaLeague,
    ...fixturesConferenceLeague,
    ...fixturesUefaSupercup,
    ...fixturesCopaInternacional,
    ...fixturesSuperMundial,
    ...fixturesEngCommunityShield,
    ...fixturesEngEflCup,
    ...fixturesEngFaCup,
    ...flattenEuropeanCupsFixtures(fixturesEuropeanCups),
    ...flattenSouthAmericanCupsFixtures(fixturesSouthAmericanCups),
    ...flattenWorldCupsFixtures(fixturesWorldCups),
    ...(Array.isArray(save.fixturesFriendlies) ? save.fixturesFriendlies : []),
    ...flattenSouthAmericaFixtures(fixturesSouthAmerica),
    ...flattenEuropeFixtures(fixturesEurope),
    ...flattenWorldLeaguesFixtures(fixturesWorldLeagues),
  ];

  const earliestUnplayedUserDate = allMergedForDateCheck
    .filter(
      (f) =>
        !f.played &&
        f.date &&
        (f.homeTeamId === resolvedSaveUserClubId || f.awayTeamId === resolvedSaveUserClubId)
    )
    .map((f) => f.date as string)
    .sort()[0];

  const currentDate = needsCalendarMigration
    ? isUserEu &&
      (!save.currentDate || save.currentDate < defaultStartDate)
      ? defaultStartDate
      : save.currentDate || earliestUnplayedUserDate || defaultStartDate
    : save.currentDate || defaultStartDate;

  const baseScoutingNetwork =
    save.scoutingNetwork ||
    createInitialScoutingNetwork(
      sanitizedClubs.find((c) => c.id === resolvedSaveUserClubId) || sanitizedClubs[0]
    );
  const sanitizedScoutingNetwork = {
    ...baseScoutingNetwork,
    prospects: (baseScoutingNetwork.prospects || []).map((pr) => {
      const cleanCountry = pr.country.includes('/')
        ? pr.country.split('/')[0].trim()
        : pr.country;
      return {
        ...pr,
        country: cleanCountry,
        player: {
          ...pr.player,
          nationality: pr.player.nationality || cleanCountry,
        },
      };
    }),
  };

  const needsRatingsMigration = (save.ratingsVersion ?? 0) < CURRENT_RATINGS_VERSION;
  const baseCalibratedClubs = needsRatingsMigration
    ? calibrateAllClubsRealism(sanitizedClubs)
    : sanitizedClubs;
  const saCalibratedClubs = applyCalibratedSouthAmericaProfilesToClubs(
    baseCalibratedClubs,
    getCachedSouthAmericaAiProfiles()
  );
  const euCalibratedClubs = applyCalibratedEuropeProfilesToClubs(
    saCalibratedClubs,
    getCachedEuropeAiProfiles()
  );
  const calibratedClubs = applyCalibratedWorldProfilesToClubs(
    euCalibratedClubs,
    getCachedWorldAiProfiles()
  );

  const oct2026HydratedClubs = applyCachedOct2026SquadsToClubs(
    calibratedClubs,
    getCachedOct2026SquadProfiles()
  );

  const hydratedUserClub =
    oct2026HydratedClubs.find((c) => c.id === resolvedSaveUserClubId) || oct2026HydratedClubs[0];
  const hydratedEuId = getClubEuropeanLeagueId(hydratedUserClub);
  const hydratedSaId = getClubSouthAmericanLeagueId(hydratedUserClub);
  const hydratedWlId = getClubWorldLeagueId(hydratedUserClub);
  const resolvedTotalRounds = hydratedEuId
    ? EUROPEAN_LEAGUES_META[hydratedEuId].totalRounds
    : hydratedSaId
    ? SOUTH_AMERICAN_LEAGUES_META[hydratedSaId].totalRounds
    : hydratedWlId
    ? WORLD_LEAGUES_META[hydratedWlId].totalRounds
    : hydratedUserClub?.division === 'C'
    ? 46
    : hydratedUserClub?.division === 'EST'
    ? getEstadualTotalRounds(getClubEstadualConfig(hydratedUserClub))
    : save.totalRounds || 38;

  const baseSanitized: GameSave = {
    ...save,
    userClubId: resolvedSaveUserClubId,
    calendarVersion: 6,
    ratingsVersion: CURRENT_RATINGS_VERSION,
    squadSizeVersion: 1,
    flamengoRosterVersion: CURRENT_FLAMENGO_ROSTER_VERSION,
    palmeirasRosterVersion: CURRENT_PALMEIRAS_ROSTER_VERSION,
    serieA2026RosterVersion: CURRENT_SERIE_A_2026_ROSTER_VERSION,
    serieB2026RosterVersion: CURRENT_SERIE_B_2026_ROSTER_VERSION,
    serieC2026RosterVersion: CURRENT_SERIE_C_2026_ROSTER_VERSION,
    potiguar2026RosterVersion: CURRENT_POTIGUAR_2026_ROSTER_VERSION,
    estaduais2026Version: CURRENT_ESTADUAIS_2026_VERSION,
    serieD2027ParticipantsVersion: CURRENT_SERIE_D_2027_PARTICIPANTS_VERSION,
    serieC2027FormatVersion: CURRENT_SERIE_C_2027_FORMAT_VERSION,
    ecuador2026RosterVersion: CURRENT_ECUADOR_2026_ROSTER_VERSION,
    colombia2026RosterVersion: CURRENT_COLOMBIA_2026_ROSTER_VERSION,
    uruguay2026RosterVersion: CURRENT_URUGUAY_2026_ROSTER_VERSION,
    chile2026RosterVersion: CURRENT_CHILE_2026_ROSTER_VERSION,
    paraguay2026RosterVersion: CURRENT_PARAGUAY_2026_ROSTER_VERSION,
    peru2026RosterVersion: CURRENT_PERU_2026_ROSTER_VERSION,
    bolivia2026RosterVersion: CURRENT_BOLIVIA_2026_ROSTER_VERSION,
    venezuela2026RosterVersion: CURRENT_VENEZUELA_2026_ROSTER_VERSION,
    argentina2026RosterVersion: CURRENT_ARGENTINA_2026_ROSTER_VERSION,
    saudiArabia2026RosterVersion: CURRENT_SAUDI_2026_ROSTER_VERSION,
    mexico2026RosterVersion: CURRENT_MEXICO_2026_ROSTER_VERSION,
    usaMls2026RosterVersion: CURRENT_USA_MLS_2026_ROSTER_VERSION,
    canada2026RosterVersion: CURRENT_CANADA_2026_ROSTER_VERSION,
    russia2026RosterVersion: CURRENT_RUSSIA_2026_ROSTER_VERSION,
    premierLeague2026RosterVersion: CURRENT_PREMIER_LEAGUE_2026_ROSTER_VERSION,
    shakhtarSpecial1Version: CURRENT_SHAKHTAR_SP1_VERSION,
    afcChampions2026Version: CURRENT_AFC_CHAMPIONS_2026_VERSION,
    potiguarCopaBrasilQualifiedIds,
    potiguarCopaNordesteQualifiedIds,
    estadualCopaBrasilQualifiedIds,
    estadualCopaNordesteQualifiedIds,
    estadualCopaVerdeQualifiedIds,
    currentSeasonYear: seasonYear,
    saSeasonYear,
    europeSeasonYear,
    reigningUclChampId: knownUclChamp,
    reigningUelChampId: knownUelChamp,
    reigningUeclChampId: save.reigningUeclChampId,
    reigningAfcChampId: knownAfcChamp,
    currentRound:
      needsArgentina2026RosterMigration && hydratedSaId === 'liga_arg'
        ? 1
        : Math.min(save.currentRound || 1, resolvedTotalRounds),
    totalRounds: resolvedTotalRounds,
    clubs: oct2026HydratedClubs,
    freeAgents2026Version: CURRENT_FREE_AGENTS_2026_VERSION,
    transferMarket: (() => {
      const existingMarket = (save.transferMarket || []).map((p) =>
        ensurePlayerContractFields(p, p.nationality || 'Brasil')
      );
      if ((save.freeAgents2026Version || 0) >= CURRENT_FREE_AGENTS_2026_VERSION) {
        return existingMarket;
      }
      const signedPlayerIds = new Set<string>();
      for (const club of oct2026HydratedClubs) {
        for (const p of club.squad || []) {
          signedPlayerIds.add(p.id);
        }
      }
      const freshFreeAgents = generateFreeAgents()
        .map((p) => ensurePlayerContractFields(p, p.nationality || 'Brasil'))
        .filter((p) => !signedPlayerIds.has(p.id));
      const dynamicCareerFreeAgents = existingMarket.filter(
        (p) => !p.id.startsWith('fa_2026_') && !signedPlayerIds.has(p.id)
      );
      return [...freshFreeAgents, ...dynamicCareerFreeAgents];
    })(),
    currentDate,
    fixturesA,
    fixturesB,
    fixturesC,
    fixturesD,
    fixturesSupercopa,
    fixturesRecopa,
    fixturesLibertadores,
    fixturesSulamericana,
    fixturesCopaBrasil,
    fixturesCopaNordeste,
    fixturesCopaVerde,
    fixturesEstadual,
    fixturesIntercontinental,
    fixturesConcacafChampions,
    fixturesAfcChampions,
    fixturesSouthAmerica,
    fixturesEurope,
    fixturesWorldLeagues,
    fixturesChampionsLeague,
    fixturesEuropaLeague,
    fixturesConferenceLeague,
    fixturesUefaSupercup,
    fixturesCopaInternacional,
    fixturesSuperMundial,
    fixturesEngCommunityShield,
    fixturesEngEflCup,
    fixturesEngFaCup,
    fixturesEuropeanCups,
    fixturesSouthAmericanCups,
    fixturesWorldCups,
    fixturesFriendlies: Array.isArray(save.fixturesFriendlies) ? save.fixturesFriendlies : [],
    standingsA,
    standingsB,
    standingsC,
    standingsD,
    standingsLibertadores: needsCalendarMigration
      ? libData.standings
      : save.standingsLibertadores || libData.standings,
    standingsSulamericana: needsCalendarMigration
      ? sulaData.standings
      : save.standingsSulamericana || sulaData.standings,
    standingsEstadual:
      needsCalendarMigration || !hasAll27EstaduaisInSave
        ? recomputeAllStandings({
            fixturesA,
            fixturesB,
            fixturesC,
            fixturesD,
            fixturesLibertadores,
            fixturesSulamericana,
            fixturesEstadual,
            fixturesCopaNordeste,
            fixturesCopaVerde,
            fixturesChampionsLeague,
            fixturesEuropaLeague,
            fixturesConferenceLeague,
            fixturesCopaInternacional,
            fixturesSuperMundial,
            fixturesSouthAmerica,
            fixturesEurope,
            fixturesWorldLeagues,
            standingsA,
            standingsB,
            standingsC,
            standingsD,
            standingsLibertadores: libData.standings,
            standingsSulamericana: sulaData.standings,
            standingsEstadual: estData.standings,
            standingsCopaNordeste,
            standingsCopaVerde,
          }).standingsEstadual
        : save.standingsEstadual || estData.standings,
    standingsCopaNordeste,
    standingsCopaVerde,
    standingsSouthAmerica,
    standingsEurope,
    standingsWorldLeagues,
    standingsChampionsLeague:
      needsCalendarMigration || needsUefa36Migration
        ? uclData.standings
        : save.standingsChampionsLeague || uclData.standings,
    standingsEuropaLeague:
      needsCalendarMigration || needsUefa36Migration
        ? uelData.standings
        : save.standingsEuropaLeague || uelData.standings,
    standingsConferenceLeague:
      needsCalendarMigration || needsUefa36Migration
        ? ueclData.standings
        : save.standingsConferenceLeague || ueclData.standings,
    standingsCopaInternacional,
    standingsAfcChampions,
    standingsSuperMundial,
    transferHistory: save.transferHistory || [],
    pendingTransfers: (save.pendingTransfers || []).map((deal) => ({
      ...deal,
      player: deal.player
        ? {
            ...deal.player,
            nationality: resolvePlayerNationality(deal.player, deal.player.nationality || 'Brasil'),
          }
        : deal.player,
    })),
    scoutingNetwork: sanitizedScoutingNetwork,
    individualAwardsHistory: save.individualAwardsHistory || [],
    worldBallonDorHistory: save.worldBallonDorHistory || [],
    unlockedAchievementIds: save.unlockedAchievementIds || [],
    managerCareer:
      save.managerCareer ||
      createInitialManagerCareer(
        hydratedUserClub,
        calibratedClubs,
        seasonYear,
        currentDate,
        fixturesCopaBrasil,
        fixturesLibertadores,
        fixturesSulamericana,
        fixturesChampionsLeague,
        fixturesEuropaLeague,
        fixturesConferenceLeague,
        fixturesCopaInternacional,
        fixturesConcacafChampions,
        fixturesAfcChampions
      ),
    nationalTeam: ensureUpgradedNationalTeamState(
      save.nationalTeam,
      calibratedClubs,
      Number(currentDate.slice(0, 4)) || seasonYear
    ),
    coachingCarousel: ensureCoachingCarouselState({
      ...save,
      clubs: calibratedClubs,
    }),
    lockerRoom: ensureLockerRoomState({
      ...save,
      clubs: calibratedClubs,
    }),
    drawnCompetitions: save.drawnCompetitions || [],
    aiDirectorAutoNegotiate: Boolean(save.aiDirectorAutoNegotiate),
    watchlist: Array.isArray(save.watchlist) ? save.watchlist : [],
    transferClauses: Array.isArray(save.transferClauses) ? save.transferClauses : [],
  };

  // Synchronize verified real-world nationalities across all clubs & position-sort Seleção call-ups
  const withRealNationalities = applyResolvedNationalitiesToSave(baseSanitized, {}).save;
  const withSoccerWikiBrasil = upgradeSaveWithSoccerWikiBrasil(
    withRealNationalities,
    initialClubById
  );
  const withSoccerWikiEngland = upgradeSaveWithSoccerWikiEngland(
    withSoccerWikiBrasil,
    initialClubById
  );
  const withRebalancedEconomy = rebalanceSaveEconomy(withSoccerWikiEngland);

  // Guarantee complete European leagues, English/European domestic cups & global schedules before retroactive catch-up
  const withHealthySchedules = ensureEuropeanAndDomesticSchedulesInSave(withRebalancedEconomy);

  // Retroactively catch up any unplayed past CPU fixtures across all competitions, Seleções & sync cross-hemisphere rollovers
  const caughtUpClubs = simulateCpuFixturesUpToDate(withHealthySchedules, currentDate, false);
  const caughtUpWithNt = syncNationalTeamByDate(caughtUpClubs, currentDate, true);
  return ensureEuropeanAndDomesticSchedulesInSave(
    syncOffContinentCalendarRollover(caughtUpWithNt)
  );
}

export default function App() {
  // Global Game Settings & Title Screen Navigation State
  const [gameSettings, setGameSettings] = useState<GameSettings>(() => loadGameSettings());

  // Global Game Save State (only auto-restores brasfoot_autosave if autoSaveEnabled is active)
  const [gameState, setGameState] = useState<GameSave | null>(() => {
    const initialSettings = loadGameSettings();
    if (!initialSettings.autoSaveEnabled) {
      return null;
    }
    const syncSaved = readSyncCachedOrLegacySave('brasfoot_autosave');
    if (syncSaved) {
      try {
        return sanitizeSave(syncSaved);
      } catch {
        return null;
      }
    }
    return null;
  });

  const [isAtTitleScreen, setIsAtTitleScreen] = useState<boolean>(() => !gameState);
  const [isHydratingSave, setIsHydratingSave] = useState<boolean>(
    () => !gameState && gameSettings.autoSaveEnabled && hasSavedAutosaveHintSync()
  );
  const [hasAnySlotSaveState, setHasAnySlotSaveState] = useState<boolean>(() =>
    hasAnySavedCareerSlotSync()
  );
  const [openClubPickerOnTitle, setOpenClubPickerOnTitle] = useState<boolean>(false);
  const [isTitleCatalogRequested, setIsTitleCatalogRequested] = useState<boolean>(false);
  const [titleSlotsRefreshKey, setTitleSlotsRefreshKey] = useState<number>(0);
  const getOfficialSiteRouteState = useCallback((): {
    wantsSite: boolean;
    section?: 'baixar-app' | 'compartilhar';
  } => {
    if (typeof window === 'undefined') return { wantsSite: false };
    const pathname = window.location.pathname.toLowerCase();
    const params = new URLSearchParams(window.location.search);
    const viewParam = (params.get('view') || '').toLowerCase();

    if (
      pathname === '/baixar' ||
      pathname.startsWith('/baixar/') ||
      pathname === '/download' ||
      pathname.startsWith('/download/') ||
      viewParam === 'download' ||
      params.get('baixar') === '1'
    ) {
      return { wantsSite: true, section: 'baixar-app' };
    }
    if (
      pathname === '/convite' ||
      pathname.startsWith('/convite/') ||
      pathname === '/compartilhar' ||
      pathname.startsWith('/compartilhar/') ||
      params.get('convite') === '1'
    ) {
      return { wantsSite: true, section: 'compartilhar' };
    }
    if (pathname === '/site' || pathname.startsWith('/site/') || viewParam === 'site') {
      return { wantsSite: true };
    }
    return { wantsSite: false };
  }, []);

  const [officialSiteSection, setOfficialSiteSection] = useState<
    'baixar-app' | 'compartilhar' | undefined
  >(() => getOfficialSiteRouteState().section);

  const [showOfficialSite, setShowOfficialSite] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    const routeState = getOfficialSiteRouteState();
    if (routeState.wantsSite) {
      return true;
    }
    const isStandaloneApp =
      window.matchMedia?.('(display-mode: standalone)').matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
    if (isStandaloneApp) {
      return false;
    }
    try {
      return !localStorage.getItem('patofoot_launch_site_seen_v1');
    } catch {
      return false;
    }
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onPopState = () => {
      const routeState = getOfficialSiteRouteState();
      setOfficialSiteSection(routeState.section);
      setShowOfficialSite(routeState.wantsSite);
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [getOfficialSiteRouteState]);

  const handleOpenOfficialSite = useCallback((section?: 'baixar-app' | 'compartilhar') => {
    setOfficialSiteSection(section);
    setShowOfficialSite(true);
    if (typeof window !== 'undefined') {
      const targetPath =
        section === 'baixar-app'
          ? '/baixar'
          : section === 'compartilhar'
          ? '/convite'
          : '/site';
      if (window.location.pathname.toLowerCase() !== targetPath) {
        window.history.pushState({}, '', targetPath);
      }
      if (!section) {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }
  }, []);

  const handleExitOfficialSiteToGame = useCallback((openTitleMenu: boolean = true) => {
    try {
      localStorage.setItem('patofoot_launch_site_seen_v1', '1');
    } catch {
      // ignore storage errors in restricted contexts
    }
    setOfficialSiteSection(undefined);
    setShowOfficialSite(false);
    if (openTitleMenu) {
      setIsAtTitleScreen(true);
    }
    if (typeof window !== 'undefined') {
      const routeState = getOfficialSiteRouteState();
      if (routeState.wantsSite) {
        window.history.pushState({}, '', '/');
      }
      window.scrollTo({ top: 0, behavior: 'auto' });
    }
  }, [getOfficialSiteRouteState]);

  // UI Navigation & Modals
  const [activeTab, setActiveTab] = useState<string>('hub');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);
  const [inspectedClubId, setInspectedClubId] = useState<string | undefined>(undefined);
  const [inspectedPlayerId, setInspectedPlayerId] = useState<string | undefined>(undefined);
  const [clubInspectNonce, setClubInspectNonce] = useState<number>(0);
  const [standingsInitialComp, setStandingsInitialComp] = useState<CompetitionType | undefined>(
    undefined
  );
  const [standingsCompNonce, setStandingsCompNonce] = useState<number>(0);
  const [marketInitialSearch, setMarketInitialSearch] = useState<string | undefined>(undefined);
  const [marketSearchNonce, setMarketSearchNonce] = useState<number>(0);
  const [isGlobalSearchOpen, setIsGlobalSearchOpen] = useState<boolean>(false);
  const [squadSubView, setSquadSubView] = useState<'pitch' | 'table' | 'report' | 'contracts' | 'management'>('pitch');
  const [marketInitialTab, setMarketInitialTab] = useState<
    | 'watchlist'
    | 'rumors'
    | 'ai_director'
    | 'sell_squad'
    | 'deadline_day'
    | 'pending_window'
    | 'clauses'
    | 'all'
    | 'free'
    | 'bosman'
    | 'loans'
    | 'my_loans'
    | 'history'
    | undefined
  >(undefined);
  const [boardSubTab, setBoardSubTab] = useState<
    'goals' | 'locker_room' | 'press' | 'carousel' | 'offers' | 'achievements' | 'history' | undefined
  >(undefined);
  const [trophiesSubTab, setTrophiesSubTab] = useState<'trophies' | 'honors'>('trophies');
  const [isMatchModalOpen, setIsMatchModalOpen] = useState<boolean>(false);
  const [instantMatchSummary, setInstantMatchSummary] =
    useState<InstantMatchSummaryData | null>(null);
  const [selecaoLaunchFixtureId, setSelecaoLaunchFixtureId] = useState<string | null>(null);
  const [isRivalryAlertOpen, setIsRivalryAlertOpen] = useState<boolean>(false);
  const [preMatchDerbyPosture, setPreMatchDerbyPosture] = useState<PreMatchDerbyPosture>('PADRAO');
  const [isSaveModalOpen, setIsSaveModalOpen] = useState<boolean>(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState<boolean>(false);
  const [settingsInitialSection, setSettingsInitialSection] = useState<
    'audio' | 'match' | 'career' | 'stability'
  >('audio');

  const hasActiveCareer = Boolean(gameState);

  useEffect(() => {
    const context = isMatchModalOpen
      ? 'match_simulator'
      : showOfficialSite
      ? 'official_site'
      : !hasActiveCareer
      ? 'title_screen'
      : activeTab;
    setErrorLogGameContext(context);
  }, [activeTab, hasActiveCareer, isMatchModalOpen, showOfficialSite]);

  useEffect(() => {
    if (typeof window !== 'undefined' && hasActiveCareer && !showOfficialSite) {
      window.scrollTo({ top: 0, behavior: 'auto' });
    }
  }, [activeTab, hasActiveCareer, showOfficialSite]);
  const [isGuideModalOpen, setIsGuideModalOpen] = useState<boolean>(false);
  const [guideInitialTab, setGuideInitialTab] = useState<GameGuideTab>('guide');
  const [isMuted, setIsMuted] = useState<boolean>(() => soundEngine.getMuted());
  const [seasonEndModal, setSeasonEndModal] = useState<{
    championName: string;
    userWon: boolean;
    seasonAwards: IndividualAwardRecord[];
    worldBallonDorAward?: WorldBallonDorAward | null;
    financialWarning?: string;
  } | null>(null);
  const [sackedModal, setSackedModal] = useState<boolean>(false);
  const [financialAuditModal, setFinancialAuditModal] =
    useState<SeasonFinancialAuditReport | null>(null);
  const [isOct2026ModalOpen, setIsOct2026ModalOpen] = useState<boolean>(false);
  const [inspectedGlobalPlayer, setInspectedGlobalPlayer] = useState<{
    player: Player;
    club?: Club | null;
  } | null>(null);
  const [comparingGlobalPlayer, setComparingGlobalPlayer] = useState<{
    player: Player;
    club?: Club | null;
  } | null>(null);
  const [celebrationQueue, setCelebrationQueue] = useState<CelebrationPayload[]>([]);
  const [deadlineDaySession, setDeadlineDaySession] = useState<DeadlineDaySession | null>(null);
  const [isDeadlineDayModalOpen, setIsDeadlineDayModalOpen] = useState<boolean>(false);
  const [smartAdvanceNotice, setSmartAdvanceNotice] = useState<string | null>(null);
  const [smartAdvanceSummary, setSmartAdvanceSummary] = useState<SmartAdvanceSummary | null>(null);
  const [isFirstRunTourOpen, setIsFirstRunTourOpen] = useState<boolean>(false);
  const seenCelebrationKeysRef = useRef<{ careerKey: string; keys: Set<string> }>({
    careerKey: '',
    keys: new Set<string>(),
  });

  // Automatically detect & celebrate Career Challenge completion
  useEffect(() => {
    if (!gameState || isAtTitleScreen || !gameState.activeChallenge || gameState.activeChallenge.completed) {
      return;
    }
    const evaluation = evaluateChallengeStatus(gameState);
    if (!evaluation || !evaluation.completedNow) return;
    soundEngine.playFanfare();
    setGameState((prev) => {
      if (!prev || !prev.activeChallenge || prev.activeChallenge.completed) return prev;
      const doneChallenge = {
        ...prev.activeChallenge,
        completed: true,
        completedDate: prev.currentDate,
      };
      const congratsMsg: InboxMessage = {
        id: `challenge_done_${doneChallenge.id}_${Date.now()}`,
        title: `Desafio Concluído: ${doneChallenge.title}!`,
        message: `Parabéns, professor! Você atingiu o objetivo "${doneChallenge.targetDescription}" e entrou para a história do futebol! Sua reputação como técnico recebeu um bônus de +10 pontos.`,
        date: formatShortDate(prev.currentDate),
        round: prev.currentRound,
        read: false,
        type: 'BOARD',
      };
      return {
        ...prev,
        activeChallenge: doneChallenge,
        managerCareer: prev.managerCareer
          ? {
              ...prev.managerCareer,
              managerReputation: Math.min(99, (prev.managerCareer.managerReputation || 50) + 10),
            }
          : prev.managerCareer,
        inbox: [congratsMsg, ...prev.inbox],
      };
    });
  }, [gameState, isAtTitleScreen]);

  // Trigger CelebrationModal automatically whenever the user wins a new major title or Ballon d'Or live
  useEffect(() => {
    if (!gameState || isAtTitleScreen) return;
    const careerKey = `${gameState.saveName || 'save'}_${gameState.userClubId}`;
    const userTrophies = (gameState.trophyHistory || []).filter((t) => t.userWon);
    const userBallonDors = (gameState.worldBallonDorHistory || []).filter(
      (b) => b.winner.clubId === gameState.userClubId
    );

    const buildTrophyKey = (t: TrophyRecord) =>
      `tr_${t.year}_${t.competition}_${t.championTeamName}`;
    const buildBdKey = (b: WorldBallonDorAward) =>
      `bd_${b.year}_${b.winner.playerId}`;

    // Initialize seen set on first load or when switching careers so historical trophies don't pop up
    if (seenCelebrationKeysRef.current.careerKey !== careerKey) {
      const initSet = new Set<string>();
      userTrophies.forEach((t) => initSet.add(buildTrophyKey(t)));
      userBallonDors.forEach((b) => initSet.add(buildBdKey(b)));
      seenCelebrationKeysRef.current = { careerKey, keys: initSet };
      return;
    }

    const newlyWon: CelebrationPayload[] = [];
    const currentClub =
      gameState.clubs.find((c) => c.id === gameState.userClubId) || null;

    userTrophies.forEach((t) => {
      const k = buildTrophyKey(t);
      if (!seenCelebrationKeysRef.current.keys.has(k)) {
        seenCelebrationKeysRef.current.keys.add(k);
        newlyWon.push({
          kind: 'TROPHY',
          trophy: t,
          club: currentClub,
          managerName: gameState.managerName || 'Treinador',
          careerTotalTitles: userTrophies.length,
        });
      }
    });

    userBallonDors.forEach((b) => {
      const k = buildBdKey(b);
      if (!seenCelebrationKeysRef.current.keys.has(k)) {
        seenCelebrationKeysRef.current.keys.add(k);
        newlyWon.push({
          kind: 'BALLON_DOR',
          ballonDor: b,
          club: currentClub,
          managerName: gameState.managerName || 'Treinador',
          careerTotalTitles: userTrophies.length,
        });
      }
    });

    if (newlyWon.length > 0) {
      setCelebrationQueue((prev) => [...prev, ...newlyWon]);
    }
  }, [
    gameState?.trophyHistory,
    gameState?.worldBallonDorHistory,
    gameState?.userClubId,
    gameState?.saveName,
    gameState?.managerName,
    isAtTitleScreen,
  ]);

  // Hydrate career saves from IndexedDB & migrate legacy localStorage saves on boot
  useEffect(() => {
    let active = true;
    const bootAutoSaveEnabled = loadGameSettings().autoSaveEnabled;
    const safetyTimer = setTimeout(() => {
      if (active) setIsHydratingSave(false);
    }, 800);

    void initializeCareerSaveStorage({ includeAutoSave: bootAutoSaveEnabled }).then(
      (idbAutoSave) => {
        if (!active) return;
        clearTimeout(safetyTimer);
        setHasAnySlotSaveState(hasAnySavedCareerSlotSync());
        if (bootAutoSaveEnabled && idbAutoSave) {
          setGameState((prev) => {
            if (prev) return prev;
            try {
              const hydrated = sanitizeSave(idbAutoSave);
              setIsAtTitleScreen(false);
              return hydrated;
            } catch {
              return null;
            }
          });
        }
        setIsHydratingSave(false);
      }
    );

    return () => {
      active = false;
      clearTimeout(safetyTimer);
    };
  }, []);

  useEffect(() => {
    if (!isSaveModalOpen) {
      setHasAnySlotSaveState(hasAnySavedCareerSlotSync());
    }
  }, [isSaveModalOpen]);

  // Global keyboard shortcuts: Ctrl+K / Cmd+K or '/' for Global Search; Esc to close active overlays
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (isMatchModalOpen) return;

      const target = e.target as HTMLElement | null;
      const tag = target?.tagName;
      const isTyping =
        tag === 'INPUT' ||
        tag === 'TEXTAREA' ||
        tag === 'SELECT' ||
        Boolean(target?.isContentEditable);

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        if (!isAtTitleScreen && hasActiveCareer) {
          e.preventDefault();
          soundEngine.playClick();
          setIsGlobalSearchOpen((prev) => !prev);
        }
        return;
      }

      if (e.key === '/' && !isTyping && !e.ctrlKey && !e.metaKey && !e.altKey) {
        if (!isAtTitleScreen && hasActiveCareer && !isGlobalSearchOpen) {
          e.preventDefault();
          soundEngine.playClick();
          setIsGlobalSearchOpen(true);
        }
        return;
      }

      if (e.key === 'Escape') {
        if (isGlobalSearchOpen) {
          e.preventDefault();
          setIsGlobalSearchOpen(false);
        } else if (instantMatchSummary) {
          e.preventDefault();
          setInstantMatchSummary(null);
        } else if (isRivalryAlertOpen) {
          e.preventDefault();
          setIsRivalryAlertOpen(false);
        } else if (isOct2026ModalOpen) {
          e.preventDefault();
          setIsOct2026ModalOpen(false);
        } else if (isGuideModalOpen) {
          e.preventDefault();
          setIsGuideModalOpen(false);
        } else if (isSettingsModalOpen) {
          e.preventDefault();
          setIsSettingsModalOpen(false);
        } else if (isSaveModalOpen) {
          e.preventDefault();
          setIsSaveModalOpen(false);
        }
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [
    isAtTitleScreen,
    hasActiveCareer,
    isMatchModalOpen,
    isGlobalSearchOpen,
    instantMatchSummary,
    isRivalryAlertOpen,
    isOct2026ModalOpen,
    isGuideModalOpen,
    isSettingsModalOpen,
    isSaveModalOpen,
  ]);

  // Keep document performance profile synced across PC, Mobile & Web
  useEffect(() => {
    const syncPerf = () => {
      applyPerformanceModeToDocument(gameSettings.performanceMode);
    };
    syncPerf();
    if (gameSettings.performanceMode === 'AUTO') {
      window.addEventListener('resize', syncPerf, { passive: true });
      return () => window.removeEventListener('resize', syncPerf);
    }
    return undefined;
  }, [gameSettings.performanceMode]);

  // Sync settings changes to localStorage, soundEngine & IndexedDB autosave state
  const handleUpdateSettings = useCallback((next: GameSettings) => {
    setGameSettings((prev) => {
      const wasAutoSaveEnabled = prev.autoSaveEnabled;
      saveGameSettings(next);
      applyPerformanceModeToDocument(next.performanceMode);
      setIsMuted(next.isMuted);

      if (wasAutoSaveEnabled && !next.autoSaveEnabled) {
        cancelScheduledAutoSave();
        void deleteCareerSave('brasfoot_autosave');
      } else if (
        next.autoSaveEnabled &&
        (!wasAutoSaveEnabled || prev.autoSaveIntervalMinutes !== next.autoSaveIntervalMinutes) &&
        latestGameStateRef.current
      ) {
        scheduleAutoSave({
          ...latestGameStateRef.current,
          savedAt: new Date().toLocaleString('pt-BR'),
        });
      }
      return next;
    });
  }, []);

  const handleChangeLanguage = useCallback((language: GameLanguage) => {
    setGameSettings((prev) => {
      if (prev.language === language) return prev;
      const next = { ...prev, language };
      saveGameSettings(next);
      return next;
    });
  }, []);

  // Continuous auto-save whenever gameState changes (only when autoSaveEnabled is true & interval === 0)
  useEffect(() => {
    if (
      gameState &&
      gameSettings.autoSaveEnabled &&
      (gameSettings.autoSaveIntervalMinutes ?? 0) === 0
    ) {
      safePersistSave('brasfoot_autosave', gameState);
    }
  }, [gameState, gameSettings.autoSaveEnabled, gameSettings.autoSaveIntervalMinutes]);

  // Timed interval auto-save (5, 10, 30 or 60 minutes) + safe flush when tab is hidden
  useEffect(() => {
    const intervalMins = gameSettings.autoSaveIntervalMinutes ?? 0;
    if (!gameSettings.autoSaveEnabled || intervalMins <= 0 || !hasActiveCareer) {
      return undefined;
    }

    const intervalMs = intervalMins * 60 * 1000;
    const timer = window.setInterval(() => {
      if (latestGameStateRef.current) {
        safePersistSave('brasfoot_autosave', {
          ...latestGameStateRef.current,
          savedAt: new Date().toLocaleString('pt-BR'),
        });
      }
    }, intervalMs);

    const handleVisibilitySave = () => {
      if (document.visibilityState === 'hidden' && latestGameStateRef.current) {
        safePersistSave('brasfoot_autosave', {
          ...latestGameStateRef.current,
          savedAt: new Date().toLocaleString('pt-BR'),
        });
      }
    };
    document.addEventListener('visibilitychange', handleVisibilitySave);

    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', handleVisibilitySave);
    };
  }, [gameSettings.autoSaveEnabled, gameSettings.autoSaveIntervalMinutes, hasActiveCareer]);

  // Gemini AI Real-Life Player Nationality & Overall Calibration State
  const [isSyncingNationalities, setIsSyncingNationalities] = useState<boolean>(false);
  const [nationalitySyncFeedback, setNationalitySyncFeedback] = useState<string | null>(null);
  const [nationalityGroundingSources, setNationalityGroundingSources] = useState<
    NationalityGroundingSource[]
  >([]);
  const [isSyncingOveralls, setIsSyncingOveralls] = useState<boolean>(false);
  const [overallSyncFeedback, setOverallSyncFeedback] = useState<string | null>(null);
  const autoSyncedCareerKeyRef = useRef<string | null>(null);
  const latestGameStateRef = useRef<GameSave | null>(gameState);
  latestGameStateRef.current = gameState;

  const handleSyncNationalitiesWithAI = useCallback(
    async (forceRefreshUserClub: boolean = true, forceGlobalSearch: boolean = false) => {
      const snapshot = latestGameStateRef.current;
      if (!snapshot || isSyncingNationalities) return;
      setIsSyncingNationalities(true);
      setNationalitySyncFeedback(
        forceGlobalSearch
          ? 'Pesquisando nacionalidades reais FIFA na web com IA...'
          : 'Pesquisando nacionalidades reais do elenco na web com IA...'
      );
      try {
        if (forceGlobalSearch) {
          const globalRes = await syncGameNationalitiesWithAI(snapshot, {
            forceRefreshAll: true,
            onProgress: (done, total) => {
              setNationalitySyncFeedback(
                `Pesquisando nacionalidades reais na web com IA (${done}/${total} jogadores)...`
              );
            },
          });

          setNationalityGroundingSources(globalRes.groundingSources || []);
          setGameState((prev) => {
            if (!prev) return prev;
            const updated = applyResolvedNationalitiesToSave(prev, globalRes.resolvedMap);
            return updated.updatedCount > 0 ? updated.save : prev;
          });
          setNationalitySyncFeedback(globalRes.statusMessage);
          return;
        }

        const res = await syncGameNationalitiesWithAI(snapshot, {
          forceRefresh: forceRefreshUserClub,
          onlyClubId: forceRefreshUserClub ? snapshot.userClubId : undefined,
        });
        const globalRes = forceRefreshUserClub
          ? await syncGameNationalitiesWithAI(snapshot, {
              forceRefresh: false,
              onProgress: (done, total) => {
                setNationalitySyncFeedback(
                  `Sincronizando nacionalidades reais das ligas (${done}/${total} jogadores)...`
                );
              },
            })
          : res;
        const mergedMap = { ...res.resolvedMap, ...globalRes.resolvedMap };

        const sourceMap = new Map<string, NationalityGroundingSource>();
        for (const s of [...(res.groundingSources || []), ...(globalRes.groundingSources || [])]) {
          if (s.uri && !sourceMap.has(s.uri)) sourceMap.set(s.uri, s);
        }
        setNationalityGroundingSources(Array.from(sourceMap.values()).slice(0, 8));

        setGameState((prev) => {
          if (!prev) return prev;
          const updated = applyResolvedNationalitiesToSave(prev, mergedMap);
          return updated.updatedCount > 0 ? updated.save : prev;
        });

        if (res.aiAvailable || globalRes.aiAvailable) {
          setNationalitySyncFeedback(
            `IA pesquisou e atualizou a nacionalidade real dos atletas do elenco e de todas as ligas!`
          );
        } else {
          setNationalitySyncFeedback(
            `Base oficial de nacionalidades reais aplicada (${Object.keys(mergedMap).length > 0 ? 'atualizada' : '100% sincronizada'}).`
          );
        }
      } catch {
        setNationalitySyncFeedback(
          'Base oficial de nacionalidades reais ativa em todos os clubes.'
        );
      } finally {
        setIsSyncingNationalities(false);
      }
    },
    [isSyncingNationalities]
  );

  const handleSyncOverallsWithAI = useCallback(
    async (targetClubId?: string) => {
      const snapshot = latestGameStateRef.current;
      if (!snapshot || isSyncingOveralls) return;
      setIsSyncingOveralls(true);
      setOverallSyncFeedback(null);
      try {
        const res = await syncOverallsWithGeminiAI(snapshot, {
          targetClubId: targetClubId || snapshot.userClubId,
          forceRefresh: true,
          maxPlayers: 160,
        });

        if (Object.keys(res.resolvedById).length > 0) {
          setGameState((prev) => {
            if (!prev) return prev;
            return applyAiOverallsToSave(prev, res.resolvedById);
          });
        }

        if (res.usedAi) {
          setOverallSyncFeedback(
            `IA Gemini calibrou os Overalls reais e setores (DEF · MEI · ATA) com sucesso!`
          );
        } else {
          setOverallSyncFeedback(
            'Curva realista de Overalls por divisão (Série A > B > C > D) sincronizada!'
          );
        }
        setTimeout(() => setOverallSyncFeedback(null), 5000);
      } catch {
        setOverallSyncFeedback(
          'Curva realista de Overalls ativa localmente em todas as divisões.'
        );
        setTimeout(() => setOverallSyncFeedback(null), 4000);
      } finally {
        setIsSyncingOveralls(false);
      }
    },
    [isSyncingOveralls]
  );

  // Automatic background Gemini AI verification (Nationalities + Real Overalls) when career loads or starts
  useEffect(() => {
    if (!gameState || isAtTitleScreen) return;
    const careerKey = `${gameState.userClubId}_${gameState.currentSeasonYear}`;
    if (autoSyncedCareerKeyRef.current === careerKey) return;
    autoSyncedCareerKeyRef.current = careerKey;

    let cancelled = false;
    void syncGameNationalitiesWithAI(gameState, {
      forceRefresh: false,
      onlyClubId: gameState.userClubId,
      maxPlayers: 35,
    })
      .then((res) => {
        if (cancelled) return;
        if (res.groundingSources && res.groundingSources.length > 0) {
          setNationalityGroundingSources(res.groundingSources);
        }
        if (Object.keys(res.resolvedMap).length === 0) return;
        setGameState((prev) => {
          if (!prev) return prev;
          const applied = applyResolvedNationalitiesToSave(prev, res.resolvedMap);
          return applied.updatedCount > 0 ? applied.save : prev;
        });
      })
      .catch(() => {});

    void syncOverallsWithGeminiAI(gameState, {
      targetClubId: gameState.userClubId,
      forceRefresh: false,
      maxPlayers: 40,
    })
      .then((ovrRes) => {
        if (cancelled || Object.keys(ovrRes.resolvedById).length === 0) return;
        setGameState((prev) => {
          if (!prev) return prev;
          return applyAiOverallsToSave(prev, ovrRes.resolvedById);
        });
      })
      .catch(() => {});

    const userSaLeague = getClubSouthAmericanLeagueId(
      gameState.clubs.find((c) => c.id === gameState.userClubId)
    );
    if (userSaLeague) {
      void calibrateSouthAmericanLeagueWithAI(gameState.clubs, userSaLeague, false)
        .then((saRes) => {
          if (cancelled || saRes.calibratedCount === 0) return;
          setGameState((prev) =>
            prev
              ? {
                  ...prev,
                  clubs: applyCalibratedSouthAmericaProfilesToClubs(
                    prev.clubs,
                    getCachedSouthAmericaAiProfiles()
                  ),
                }
              : prev
          );
        })
        .catch(() => {});
    }

    const userEuLeague = getClubEuropeanLeagueId(
      gameState.clubs.find((c) => c.id === gameState.userClubId)
    );
    if (userEuLeague) {
      void calibrateEuropeanLeagueWithAI(gameState.clubs, userEuLeague, false)
        .then((euRes) => {
          if (cancelled || euRes.calibratedCount === 0) return;
          setGameState((prev) =>
            prev
              ? {
                  ...prev,
                  clubs: applyCalibratedEuropeProfilesToClubs(
                    prev.clubs,
                    getCachedEuropeAiProfiles()
                  ),
                }
              : prev
          );
        })
        .catch(() => {});
    }

    const userWlLeague = getClubWorldLeagueId(
      gameState.clubs.find((c) => c.id === gameState.userClubId)
    );
    if (userWlLeague) {
      void calibrateWorldLeagueWithAI(gameState.clubs, userWlLeague, false)
        .then((wlRes) => {
          if (cancelled || wlRes.calibratedCount === 0) return;
          setGameState((prev) =>
            prev
              ? {
                  ...prev,
                  clubs: applyCalibratedWorldProfilesToClubs(
                    prev.clubs,
                    getCachedWorldAiProfiles()
                  ),
                }
              : prev
          );
        })
        .catch(() => {});
    }

    return () => {
      cancelled = true;
    };
  }, [gameState?.userClubId, gameState?.currentSeasonYear, isAtTitleScreen]);

  const [calibratingSaLeagueId, setCalibratingSaLeagueId] = useState<string | null>(null);
  const [saAiFeedback, setSaAiFeedback] = useState<string | null>(null);
  const [calibratingEuLeagueId, setCalibratingEuLeagueId] = useState<string | null>(null);
  const [euAiFeedback, setEuAiFeedback] = useState<string | null>(null);
  const [calibratingWlLeagueId, setCalibratingWlLeagueId] = useState<string | null>(null);
  const [wlAiFeedback, setWlAiFeedback] = useState<string | null>(null);
  const [syncingOct2026Target, setSyncingOct2026Target] = useState<string | null>(null);
  const [oct2026SyncFeedback, setOct2026SyncFeedback] = useState<string | null>(null);
  const [oct2026GroundingSources, setOct2026GroundingSources] = useState<Oct2026GroundingSource[]>([]);
  const [isSyncingOct2026Global, setIsSyncingOct2026Global] = useState<boolean>(false);
  const [oct2026ActiveScope, setOct2026ActiveScope] = useState<Oct2026SyncRegionScope | null>(null);
  const [oct2026BatchProgress, setOct2026BatchProgress] = useState<Oct2026BatchProgress | null>(null);
  const [oct2026RecentUpdatedClubs, setOct2026RecentUpdatedClubs] = useState<RecentUpdatedClubItem[]>([]);
  const [oct2026CacheVersion, setOct2026CacheVersion] = useState<number>(0);
  const oct2026AbortRef = useRef<AbortController | null>(null);
  const latestGameStateForOctRef = useRef<GameSave | null>(gameState);
  latestGameStateForOctRef.current = gameState;

  // Hydrate persistent server-side AI/API squad cache on boot (for Title Screen & new careers)
  useEffect(() => {
    let active = true;
    void hydrateOct2026CacheFromServer()
      .then((serverRes) => {
        if (!active) return;
        const syncedIds = Object.keys(serverRes.profilesByClubId);
        if (syncedIds.length === 0) return;
        setOct2026CacheVersion((v) => v + 1);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const handleCalibrateSouthAmericaLeagueWithAI = useCallback(
    async (target: SouthAmericanLeagueId | 'ALL') => {
      if (!gameState || calibratingSaLeagueId) return;
      setCalibratingSaLeagueId(target);
      setSaAiFeedback(null);
      try {
        if (target === 'ALL') {
          const res = await calibrateAllSouthAmericanLeaguesWithAI(
            gameState.clubs,
            (leagueName, idx, total) => {
              setSaAiFeedback(`Calibrando ${idx}/${total}: ${leagueName}...`);
            }
          );
          setGameState((prev) =>
            prev
              ? {
                  ...prev,
                  clubs: applyCalibratedSouthAmericaProfilesToClubs(
                    prev.clubs,
                    getCachedSouthAmericaAiProfiles()
                  ),
                  aiSouthAmericaLeaguesCalibratedAt: new Date().toISOString(),
                }
              : prev
          );
          setSaAiFeedback(
            `Todas as 9 ligas sul-americanas (${res.totalCalibratedClubs} clubes) calibradas com IA da vida real!`
          );
        } else {
          const meta = SOUTH_AMERICAN_LEAGUES_META[target];
          const res = await calibrateSouthAmericanLeagueWithAI(gameState.clubs, target, true);
          setGameState((prev) =>
            prev
              ? {
                  ...prev,
                  clubs: applyCalibratedSouthAmericaProfilesToClubs(
                    prev.clubs,
                    getCachedSouthAmericaAiProfiles()
                  ),
                  aiSouthAmericaLeaguesCalibratedAt: new Date().toISOString(),
                }
              : prev
          );
          setSaAiFeedback(
            `${meta.name} calibrada com IA (${res.calibratedCount} clubes, técnicos e titulares reais atualizados)!`
          );
        }
      } catch (err: unknown) {
        const message =
          err instanceof Error
            ? err.message
            : 'Não foi possível calibrar via IA no momento; dados reais locais mantidos.';
        setSaAiFeedback(message);
      } finally {
        setCalibratingSaLeagueId(null);
      }
    },
    [gameState, calibratingSaLeagueId]
  );

  const handleCalibrateEuropeLeagueWithAI = useCallback(
    async (target: EuropeanLeagueId | 'ALL') => {
      if (!gameState || calibratingEuLeagueId) return;
      setCalibratingEuLeagueId(target);
      setEuAiFeedback(null);
      try {
        if (target === 'ALL') {
          const res = await calibrateAllEuropeanLeaguesWithAI(
            gameState.clubs,
            (leagueName, idx, total) => {
              setEuAiFeedback(`Calibrando ${idx}/${total}: ${leagueName} (2026)...`);
            }
          );
          setGameState((prev) =>
            prev
              ? {
                  ...prev,
                  clubs: applyCalibratedEuropeProfilesToClubs(
                    prev.clubs,
                    getCachedEuropeAiProfiles()
                  ),
                  aiEuropeLeaguesCalibratedAt: new Date().toISOString(),
                }
              : prev
          );
          setEuAiFeedback(
            `Todas as 13 ligas europeias (${res.totalCalibratedClubs} clubes) calibradas com IA 2026!`
          );
        } else {
          const meta = EUROPEAN_LEAGUES_META[target];
          const res = await calibrateEuropeanLeagueWithAI(gameState.clubs, target, true);
          setGameState((prev) =>
            prev
              ? {
                  ...prev,
                  clubs: applyCalibratedEuropeProfilesToClubs(
                    prev.clubs,
                    getCachedEuropeAiProfiles()
                  ),
                  aiEuropeLeaguesCalibratedAt: new Date().toISOString(),
                }
              : prev
          );
          setEuAiFeedback(
            `${meta.name} atualizada em 2026 via IA (${res.calibratedCount} clubes, técnicos e titulares reais)!`
          );
        }
      } catch (err: unknown) {
        const message =
          err instanceof Error
            ? err.message
            : 'Não foi possível calibrar a liga europeia via IA no momento; elencos 2026 locais mantidos.';
        setEuAiFeedback(message);
      } finally {
        setCalibratingEuLeagueId(null);
      }
    },
    [gameState, calibratingEuLeagueId]
  );

  const handleCalibrateWorldLeagueWithAI = useCallback(
    async (target: WorldLeagueId | 'ALL') => {
      if (!gameState || calibratingWlLeagueId) return;
      setCalibratingWlLeagueId(target);
      setWlAiFeedback(null);
      try {
        if (target === 'ALL') {
          const res = await calibrateAllWorldLeaguesWithAI(
            gameState.clubs,
            true,
            (leagueName, idx, total) => {
              setWlAiFeedback(`Calibrando ${idx}/${total}: ${leagueName} (IA 2026)...`);
            }
          );
          setGameState((prev) =>
            prev
              ? {
                  ...prev,
                  clubs: applyCalibratedWorldProfilesToClubs(
                    prev.clubs,
                    getCachedWorldAiProfiles()
                  ),
                  aiWorldLeaguesCalibratedAt: new Date().toISOString(),
                }
              : prev
          );
          setWlAiFeedback(
            `Todas as 7 ligas (EUA, México, Arábia Saudita, Japão, Rússia, Egito e Marrocos — ${res.totalCalibrated} clubes) atualizadas com IA 2026!`
          );
        } else {
          const meta = WORLD_LEAGUES_META[target];
          const res = await calibrateWorldLeagueWithAI(gameState.clubs, target, true);
          setGameState((prev) =>
            prev
              ? {
                  ...prev,
                  clubs: applyCalibratedWorldProfilesToClubs(
                    prev.clubs,
                    getCachedWorldAiProfiles()
                  ),
                  aiWorldLeaguesCalibratedAt: new Date().toISOString(),
                }
              : prev
          );
          setWlAiFeedback(
            `${meta.name} (${meta.country}) atualizada em 2026 via IA (${res.calibratedCount} clubes, técnicos e titulares reais)!`
          );
        }
      } catch (err: unknown) {
        const message =
          err instanceof Error
            ? err.message
            : 'Não foi possível calibrar a liga via IA no momento; elencos 2026 locais mantidos.';
        setWlAiFeedback(message);
      } finally {
        setCalibratingWlLeagueId(null);
      }
    },
    [gameState, calibratingWlLeagueId]
  );

  const handleSyncSingleClubForBaseCatalog = useCallback(
    async (club: Club) => {
      if (syncingOct2026Target || isSyncingOct2026Global) return;
      const realSyncPeriod = getCurrentRealWorldSyncPeriod();
      setSyncingOct2026Target(`club:${club.id}`);
      setOct2026SyncFeedback(
        `Consultando API de elencos (${realSyncPeriod.fullLabel}) para ${club.name}...`
      );
      try {
        const res = await syncClubsOct2026SquadsWithAI(
          [club],
          true,
          (batchLabel, done, total) => {
            setOct2026SyncFeedback(
              `Consultando API ${realSyncPeriod.shortLabel} (${done}/${total}): ${batchLabel}...`
            );
          }
        );

        if (res.syncedCount > 0) {
          setOct2026CacheVersion((v) => v + 1);
          const profile = res.profilesByClubId[club.id];
          if (profile) {
            const updated = applyOct2026AiSquadToClub(club, profile);
            const starters = updated.squad.filter((p) => p.isStarter);
            const avgOvr =
              starters.length > 0
                ? Math.round(starters.reduce((s, p) => s + p.overall, 0) / starters.length)
                : 70;
            const topPlayers = [...updated.squad]
              .sort((a, b) => b.overall - a.overall)
              .slice(0, 3)
              .map((p) => `${p.name} (${p.overall})`);
            const item: RecentUpdatedClubItem = {
              clubId: updated.id,
              clubName: updated.name,
              initials: updated.initials,
              primaryColor: updated.colors.primary,
              textColor: updated.colors.text,
              leagueLabel: resolveClubLeagueDisplayName(updated),
              managerName: updated.managerName || profile.managerName || 'Comissão Técnica',
              topPlayers,
              avgOvr,
              sourceLabel: profile.sourceLabel,
            };
            setOct2026RecentUpdatedClubs((prev) => [
              item,
              ...prev.filter((r) => r.clubId !== item.clubId),
            ].slice(0, 40));
          }
          if (res.groundingSources.length > 0) {
            setOct2026GroundingSources(res.groundingSources);
          }
          const usedSourcesSummary = Array.from(
            new Set(
              Object.values(res.profilesByClubId)
                .map((p) => p.sourceLabel)
                .filter(Boolean)
            )
          ).join(' + ');
          const sourceSuffix = usedSourcesSummary ? ` (${usedSourcesSummary})` : '';
          setOct2026SyncFeedback(
            `Elenco de ${club.name} atualizado via API para ${realSyncPeriod.fullLabel}${sourceSuffix}! Disponível para novas carreiras.`
          );
        } else {
          setOct2026SyncFeedback(
            `Elenco de ${club.name} mantido com os dados atuais de ${realSyncPeriod.fullLabel}.`
          );
        }
      } catch (err: unknown) {
        const msg =
          err instanceof Error
            ? err.message
            : `Não foi possível consultar a API de elencos de ${realSyncPeriod.fullLabel} neste momento.`;
        setOct2026SyncFeedback(msg);
      } finally {
        setSyncingOct2026Target(null);
      }
    },
    [syncingOct2026Target, isSyncingOct2026Global]
  );

  const handleStopGlobalOct2026Sync = useCallback(() => {
    if (oct2026AbortRef.current) {
      oct2026AbortRef.current.abort();
    }
  }, []);

  const handleStartGlobalOct2026Sync = useCallback(
    async (
      scope: Oct2026SyncRegionScope,
      forceRefresh: boolean,
      preferredProvider: RosterSyncProviderPreference = 'AUTO'
    ) => {
      if (isSyncingOct2026Global) return;

      if (oct2026AbortRef.current) {
        oct2026AbortRef.current.abort();
      }
      const controller = new AbortController();
      oct2026AbortRef.current = controller;

      const sourceClubs = applyCachedOct2026SquadsToClubs(
        generateInitialClubs(),
        getCachedOct2026SquadProfiles()
      );

      const orderedClubs = filterAndPrioritizeClubsForOct2026Sync(
        sourceClubs,
        scope
      );

      if (orderedClubs.length === 0) return;

      const realSyncPeriod = getCurrentRealWorldSyncPeriod();
      setIsSyncingOct2026Global(true);
      setOct2026ActiveScope(scope);
      setOct2026BatchProgress({
        currentBatchLabel: orderedClubs
          .slice(0, 5)
          .map((c) => c.name)
          .join(', '),
        completedCount: 0,
        totalCount: orderedClubs.length,
        newlyUpdatedInSession: 0,
        usedGoogleSearch: false,
      });
      setOct2026SyncFeedback(
        `Conectando à API mensal de elencos (${realSyncPeriod.fullLabel}) para ${orderedClubs.length} clubes...`
      );

      try {
        const res = await syncClubsOct2026SquadsWithAI(orderedClubs, {
          forceRefresh,
          preferredProvider,
          signal: controller.signal,
          batchSize: orderedClubs.length <= 4 ? 2 : 5,
          onProgress: (batchLabel, completedCount, totalCount, meta) => {
            setOct2026BatchProgress(
              meta || {
                currentBatchLabel: batchLabel,
                completedCount,
                totalCount,
                newlyUpdatedInSession: 0,
                usedGoogleSearch: false,
              }
            );
            setOct2026SyncFeedback(
              `Consultando API ${realSyncPeriod.shortLabel} (${completedCount}/${totalCount}): ${batchLabel}...`
            );
          },
          onBatchSynced: (batchProfiles, sources) => {
            const syncedIds = Object.keys(batchProfiles);
            if (syncedIds.length === 0) return;

            setOct2026CacheVersion((v) => v + 1);

            const batchRecent: RecentUpdatedClubItem[] = [];
            for (const clubId of syncedIds) {
              const profile = batchProfiles[clubId];
              const baseClub = sourceClubs.find((c) => c.id === clubId);
              if (!profile || !baseClub) continue;
              const updated = applyOct2026AiSquadToClub(baseClub, profile);
              const starters = updated.squad.filter((p) => p.isStarter);
              const avgOvr =
                starters.length > 0
                  ? Math.round(starters.reduce((s, p) => s + p.overall, 0) / starters.length)
                  : 70;
              const topPlayers = [...updated.squad]
                .sort((a, b) => b.overall - a.overall)
                .slice(0, 3)
                .map((p) => `${p.name} (${p.overall})`);
              batchRecent.push({
                clubId: updated.id,
                clubName: updated.name,
                initials: updated.initials,
                primaryColor: updated.colors.primary,
                textColor: updated.colors.text,
                leagueLabel: resolveClubLeagueDisplayName(updated),
                managerName: updated.managerName || profile.managerName || 'Comissão Técnica',
                topPlayers,
                avgOvr,
                sourceLabel: profile.sourceLabel,
              });
            }

            if (batchRecent.length > 0) {
              setOct2026RecentUpdatedClubs((prev) => {
                const seen = new Set(batchRecent.map((r) => r.clubId));
                return [...batchRecent, ...prev.filter((r) => !seen.has(r.clubId))].slice(0, 40);
              });
            }

            if (sources.length > 0) {
              setOct2026GroundingSources((prev) => {
                const map = new Map(prev.map((s) => [s.uri, s]));
                sources.forEach((s) => map.set(s.uri, s));
                return Array.from(map.values()).slice(0, 16);
              });
            }
          },
        });

        if (res.syncedCount > 0) {
          setOct2026CacheVersion((v) => v + 1);
        }

        if (res.quotaPaused) {
          setOct2026SyncFeedback(
            `Limite temporário da API atingido após atualizar ${res.newlySyncedCount} novos clubes (${res.syncedCount} sincronizados neste escopo). Todos os elencos baixados foram salvos — aguarde ~30s e clique em Retomar.`
          );
        } else if (res.aborted) {
          setOct2026SyncFeedback(
            `Sincronização pausada. ${res.syncedCount} clubes já estão atualizados e salvos para ${realSyncPeriod.fullLabel}. Clique em Retomar quando quiser continuar.`
          );
        } else {
          setOct2026SyncFeedback(
            `Atualização mensal concluída! ${res.syncedCount} clubes sincronizados para ${realSyncPeriod.fullLabel} (${res.newlySyncedCount} novos consultados na API agora).`
          );
        }
      } catch (err: unknown) {
        const msg =
          err instanceof Error
            ? err.message
            : `Erro ao consultar a API de elencos de ${realSyncPeriod.fullLabel}.`;
        setOct2026SyncFeedback(msg);
      } finally {
        setIsSyncingOct2026Global(false);
        setOct2026ActiveScope(null);
      }
    },
    [isSyncingOct2026Global]
  );

  // Return to Title Screen without erasing career (debounced non-blocking autosave via effect)
  const handleSaveAndExitToTitle = () => {
    setIsMatchModalOpen(false);
    setIsSaveModalOpen(false);
    setIsSettingsModalOpen(false);
    setIsAtTitleScreen(true);
    if (gameState) {
      const updatedSave: GameSave = {
        ...gameState,
        savedAt: new Date().toLocaleString('pt-BR'),
      };
      setGameState(updatedSave);
    }
  };

  // Clear all local career saves safely
  const handleClearAllSavedData = () => {
    void clearAllCareerSaves().then(() => {
      setTitleSlotsRefreshKey((k) => k + 1);
    });
    setHasAnySlotSaveState(false);
    setGameState(null);
    setIsAtTitleScreen(true);
    setTitleSlotsRefreshKey((k) => k + 1);
  };

  // Start new career (applies difficulty + challenge + manager specialty modifiers & optional target slot 1-5)
  const handleStartCareer = (
    selectedClubId: string,
    managerName: string,
    targetSlotNum?: SaveSlotNumber,
    options?: {
      managerSpecialty?: ManagerSpecialtyId;
      challengeId?: CareerChallengeId;
    }
  ) => {
    setIsOct2026ModalOpen(false);
    const chosenSpecialty = getManagerSpecialtyProfile(options?.managerSpecialty);
    const chosenChallenge = getCareerChallengeDefinition(options?.challengeId);

    const difficultyBudgetMult =
      gameSettings.difficulty === 'CASUAL'
        ? 1.15
        : gameSettings.difficulty === 'REALISTA'
        ? 0.88
        : 1.0;
    const budgetMultiplier = difficultyBudgetMult * chosenChallenge.budgetMultiplier;

    const clubs = applyCachedOct2026SquadsToClubs(
      applyCalibratedWorldProfilesToClubs(
        applyCalibratedEuropeProfilesToClubs(
          applyCalibratedSouthAmericaProfilesToClubs(
            generateInitialClubs(),
            getCachedSouthAmericaAiProfiles()
          ),
          getCachedEuropeAiProfiles()
        ),
        getCachedWorldAiProfiles()
      ),
      getCachedOct2026SquadProfiles()
    );
    const updatedClubs = clubs.map((c) => ({
      ...c,
      isUser: c.id === selectedClubId,
      managerName: c.id === selectedClubId ? managerName : c.managerName,
      finances:
        c.id === selectedClubId
          ? {
              ...c.finances,
              balance: Math.round(c.finances.balance * budgetMultiplier),
              youthAcademyLevel:
                chosenChallenge.id === 'SERIE_D_LIBERTADORES'
                  ? Math.min(5, (c.finances.youthAcademyLevel || 1) + 1)
                  : c.finances.youthAcademyLevel,
            }
          : c.finances,
      squad: c.squad.map((p) => ensurePlayerContractFields(p, c.country || 'Brasil')),
    }));

    const serieAClubs = updatedClubs.filter((c) => c.division === 'A').map((c) => c.id);
    const serieBClubs = updatedClubs.filter((c) => c.division === 'B').map((c) => c.id);
    const serieCClubs = updatedClubs.filter((c) => c.division === 'C').map((c) => c.id);

    const selectedClubPreview = updatedClubs.find((c) => c.id === selectedClubId);
    const isUserEu = isSplitCalendarClub(selectedClubPreview);
    const selectedWlId = selectedClubPreview ? getClubWorldLeagueId(selectedClubPreview) : null;
    const isUserRussia = selectedWlId === 'rus_premier';
    const isUserSplitAsiaRussia = Boolean(selectedWlId && isSplitYearWorldLeague(selectedWlId));

    // SA / North America / Africa start in Jan 2027; Europe + Asia/Russia start in Jul/Aug 2026 (2026/27 season ending in May 2027)
    const saSeasonYear = 2027;
    const europeSeasonYear = 2026;
    const seasonYear = isUserEu ? europeSeasonYear : saSeasonYear;
    const startDate = isUserEu
      ? getSplitSeasonStartDate(europeSeasonYear, isUserRussia)
      : getSeasonStartDate(saSeasonYear); // 2027-01-10
    const startDateDisplay = `${startDate.slice(8, 10)}/${startDate.slice(5, 7)}/${startDate.slice(0, 4)}`;

    const fixturesA = generateLeagueSchedule(serieAClubs, 'serie_a', saSeasonYear);
    const fixturesB = generateLeagueSchedule(serieBClubs, 'serie_b', saSeasonYear);
    const fixturesC = generateLeagueSchedule(serieCClubs, 'serie_c', saSeasonYear);
    const serieDData = generateSerieDFixturesAndStandings(updatedClubs, saSeasonYear);
    const saLeaguesData = generateAllSouthAmericanLeagues(updatedClubs, saSeasonYear);
    const euLeaguesData = generateAllEuropeanLeagues(updatedClubs, europeSeasonYear);
    const janDecWlData = generateAllWorldLeaguesData(
      updatedClubs,
      saSeasonYear,
      JAN_DEC_WORLD_LEAGUE_IDS
    );
    const splitWlData = generateAllWorldLeaguesData(
      updatedClubs,
      europeSeasonYear,
      SPLIT_YEAR_WORLD_LEAGUE_IDS
    );
    const wlLeaguesData = {
      fixturesWorldLeagues: {
        ...janDecWlData.fixturesWorldLeagues,
        ...splitWlData.fixturesWorldLeagues,
      },
      standingsWorldLeagues: {
        ...janDecWlData.standingsWorldLeagues,
        ...splitWlData.standingsWorldLeagues,
      },
    };

    const standingsA = generateInitialStandings(serieAClubs);
    const standingsB = generateInitialStandings(serieBClubs);
    const standingsC = generateInitialStandings(serieCClubs);

    const libData = generateLibertadoresFixtures(updatedClubs, saSeasonYear);
    const sulaData = generateSulamericanaFixtures(updatedClubs, saSeasonYear);
    const uclData = generateChampionsLeagueFixtures(updatedClubs, europeSeasonYear);
    const uelData = generateEuropaLeagueFixtures(updatedClubs, europeSeasonYear);
    const ueclData = generateConferenceLeagueFixtures(updatedClubs, europeSeasonYear);
    const cintData = generateCopaInternacionalFixtures(updatedClubs, saSeasonYear);
    const concacafData = generateConcacafChampionsFixtures(
      updatedClubs,
      saSeasonYear,
      wlLeaguesData.standingsWorldLeagues,
      wlLeaguesData.fixturesWorldLeagues
    );
    const afcData = generateAfcChampionsFixtures(
      updatedClubs,
      europeSeasonYear,
      wlLeaguesData.standingsWorldLeagues,
      'wl_sau_ahl'
    );
    const cdbFixtures = generateCopaBrasilFixtures(updatedClubs, saSeasonYear);
    const copaNordesteData = generateCopaNordesteFixtures(updatedClubs, saSeasonYear);
    const copaVerdeData = generateCopaVerdeFixtures(updatedClubs, saSeasonYear);
    const supercopaFixtures = generateSupercopaFixtures(updatedClubs, saSeasonYear);
    const recopaFixtures = generateRecopaFixtures(updatedClubs, saSeasonYear);
    const estData = generateEstadualFixtures(updatedClubs, saSeasonYear);
    const engCupsData = generateAllEnglishCupsFixtures(updatedClubs, europeSeasonYear, {
      fixturesEurope: euLeaguesData.fixturesEurope,
    });
    const uefaSupercupFixtures = generateUefaSupercupFixtures(
      updatedClubs,
      europeSeasonYear,
      'eu_psg',
      'eu_avl'
    );
    const euCupsData = generateAllEuropeanCupsFixtures(updatedClubs, europeSeasonYear, {
      fixturesEurope: euLeaguesData.fixturesEurope,
    });
    const saCupsData = generateAllSouthAmericanCupsFixtures(
      updatedClubs,
      saSeasonYear,
      flattenSouthAmericaFixtures(saLeaguesData.fixturesSouthAmerica)
    );
    const wlCupsData = generateAllWorldCupsFixtures(updatedClubs, saSeasonYear, europeSeasonYear, {
      fixturesWorldLeagues: wlLeaguesData.fixturesWorldLeagues,
      fixturesConcacafChampions: concacafData.fixtures,
      fixturesAfcChampions: afcData.fixtures,
      fixturesCopaInternacional: cintData.fixtures,
    });
    const intercontinentalFixtures = generateIntercontinentalFixtures(
      saSeasonYear,
      undefined,
      'eu_psg',
      updatedClubs,
      undefined,
      undefined,
      undefined,
      'wl_sau_ahl'
    );

    const freeAgents = generateFreeAgents().map((p) => ensurePlayerContractFields(p));

    let finalClubs: Club[] = updatedClubs;
    const userTeam = finalClubs.find((c) => c.id === selectedClubId);
    const userEuId = userTeam ? getClubEuropeanLeagueId(userTeam) : null;
    const userSaId = userTeam ? getClubSouthAmericanLeagueId(userTeam) : null;
    const userWlId = userTeam ? getClubWorldLeagueId(userTeam) : null;
    const userEuMeta = userEuId ? EUROPEAN_LEAGUES_META[userEuId] : undefined;
    const userSaMeta = userSaId ? SOUTH_AMERICAN_LEAGUES_META[userSaId] : undefined;
    const userWlMeta = userWlId ? WORLD_LEAGUES_META[userWlId] : undefined;
    const initialTotalRounds = userEuMeta
      ? userEuMeta.totalRounds
      : userSaMeta
      ? userSaMeta.totalRounds
      : userWlMeta
      ? userWlMeta.totalRounds
      : userTeam?.division === 'C'
      ? 46
      : userTeam?.division === 'EST'
      ? getEstadualTotalRounds(getClubEstadualConfig(userTeam))
      : 38;
    const euSeasonLabel = formatEuropeanSeason(europeSeasonYear);

    const initialInbox: InboxMessage[] = [
      {
        id: 'msg_welcome',
        title: userEuMeta
          ? `Bem-vindo ao ${userTeam?.name} • Temporada Europeia ${euSeasonLabel}!`
          : userWlMeta && isUserSplitAsiaRussia
          ? `Bem-vindo ao ${userTeam?.name} • ${userWlMeta.name} ${euSeasonLabel}!`
          : userWlMeta
          ? `Bem-vindo ao ${userTeam?.name} • ${userWlMeta.name} ${saSeasonYear}!`
          : `Bem-vindo ao PATOFOOT • Temporada Oficial ${saSeasonYear}!`,
        message: userEuMeta
          ? `Você assumiu o comando do ${userTeam?.name} na ${userEuMeta.name} (${userEuMeta.country})! Seguindo o calendário real europeu, a temporada ${euSeasonLabel} começa neste mês de Agosto de ${europeSeasonYear} (com a Janela de Verão aberta!) e vai até Maio de ${
              europeSeasonYear + 1
            }, incluindo as 13 ligas europeias e a Fase de Liga com 36 clubes da Champions League, Europa League e Conference League!`
          : userWlMeta && isUserSplitAsiaRussia
          ? `Você assumiu o comando do ${userTeam?.name} na ${userWlMeta.name} (${userWlMeta.country})! A temporada ${euSeasonLabel} segue o calendário oficial de ${
              isUserRussia ? 'Julho' : 'Agosto'
            } de ${europeSeasonYear} a Maio de ${
              europeSeasonYear + 1
            } (com pausa de inverno), valendo vagas na Liga dos Campeões de Elite da AFC (32 clubes em Conferências Oeste e Leste) e no Mundial da FIFA!`
          : userWlMeta
          ? `Você assumiu o comando do ${userTeam?.name} na ${userWlMeta.name} (${userWlMeta.country})! Os melhores colocados garantem vaga nas copas continentais e na Champions Internacional FIFA, além de disputar o Mundial de Clubes / Copa Intercontinental FIFA em Dezembro!`
          : `A temporada oficial CBF ${saSeasonYear} começa hoje, ${startDateDisplay}, com a abertura dos Campeonatos Estaduais! Em Fevereiro teremos a Supercopa do Brasil, seguida da Recopa Sul-Americana, Brasileirão, Copa do Brasil, Libertadores e Sul-Americana até Dezembro (enquanto a Europa, Ásia e Rússia disputam o calendário Jul/Ago–Mai)!`,
        date: startDateDisplay,
        round: 1,
        read: false,
        type: 'BOARD',
      },
      {
        id: 'msg_manager_profile',
        title:
          chosenChallenge.id !== 'LIVRE'
            ? `Desafio Ativo: ${chosenChallenge.title} · Perfil ${chosenSpecialty.title}`
            : `Perfil do Treinador: ${chosenSpecialty.title}`,
        message:
          chosenChallenge.id !== 'LIVRE'
            ? `Objetivo do desafio: ${chosenChallenge.targetDescription} Sua especialidade (${chosenSpecialty.title}) está ativa: ${chosenSpecialty.bullets.join(' | ')}.`
            : `Sua especialidade de treinador (${chosenSpecialty.title}) já está ativa na temporada: ${chosenSpecialty.bullets.join(' | ')}.`,
        date: startDateDisplay,
        round: 1,
        read: false,
        type: 'BOARD',
      },
    ];

    finalClubs = finalClubs.map((c) =>
      c.id === selectedClubId
        ? ensureClubMonthlyFinanceHistory(
            ensureClubYouthAcademy(c, startDate),
            startDate,
            seasonYear
          )
        : c
    );

    const rawNewSave: GameSave = {
      version: '1.0',
      calendarVersion: 6,
      squadSizeVersion: 1,
      flamengoRosterVersion: CURRENT_FLAMENGO_ROSTER_VERSION,
      palmeirasRosterVersion: CURRENT_PALMEIRAS_ROSTER_VERSION,
      serieA2026RosterVersion: CURRENT_SERIE_A_2026_ROSTER_VERSION,
      serieB2026RosterVersion: CURRENT_SERIE_B_2026_ROSTER_VERSION,
      serieC2026RosterVersion: CURRENT_SERIE_C_2026_ROSTER_VERSION,
      potiguar2026RosterVersion: CURRENT_POTIGUAR_2026_ROSTER_VERSION,
      estaduais2026Version: CURRENT_ESTADUAIS_2026_VERSION,
      serieD2027ParticipantsVersion: CURRENT_SERIE_D_2027_PARTICIPANTS_VERSION,
      serieC2027FormatVersion: CURRENT_SERIE_C_2027_FORMAT_VERSION,
      ecuador2026RosterVersion: CURRENT_ECUADOR_2026_ROSTER_VERSION,
      colombia2026RosterVersion: CURRENT_COLOMBIA_2026_ROSTER_VERSION,
      uruguay2026RosterVersion: CURRENT_URUGUAY_2026_ROSTER_VERSION,
      chile2026RosterVersion: CURRENT_CHILE_2026_ROSTER_VERSION,
      paraguay2026RosterVersion: CURRENT_PARAGUAY_2026_ROSTER_VERSION,
      peru2026RosterVersion: CURRENT_PERU_2026_ROSTER_VERSION,
      bolivia2026RosterVersion: CURRENT_BOLIVIA_2026_ROSTER_VERSION,
      venezuela2026RosterVersion: CURRENT_VENEZUELA_2026_ROSTER_VERSION,
      argentina2026RosterVersion: CURRENT_ARGENTINA_2026_ROSTER_VERSION,
      saudiArabia2026RosterVersion: CURRENT_SAUDI_2026_ROSTER_VERSION,
      mexico2026RosterVersion: CURRENT_MEXICO_2026_ROSTER_VERSION,
      usaMls2026RosterVersion: CURRENT_USA_MLS_2026_ROSTER_VERSION,
      canada2026RosterVersion: CURRENT_CANADA_2026_ROSTER_VERSION,
      russia2026RosterVersion: CURRENT_RUSSIA_2026_ROSTER_VERSION,
      premierLeague2026RosterVersion: CURRENT_PREMIER_LEAGUE_2026_ROSTER_VERSION,
      shakhtarSpecial1Version: CURRENT_SHAKHTAR_SP1_VERSION,
      afcChampions2026Version: CURRENT_AFC_CHAMPIONS_2026_VERSION,
      potiguarCopaBrasilQualifiedIds: ['abc', 'arn', 'rn_scn'],
      potiguarCopaNordesteQualifiedIds: ['abc', 'arn'],
      soccerWikiBrasilVersion: CURRENT_SOCCERWIKI_BRASIL_VERSION,
      soccerWikiEnglandVersion: CURRENT_SOCCERWIKI_ENGLAND_VERSION,
      saveName: `Patofoot - ${managerName}`,
      savedAt: new Date().toLocaleString('pt-BR'),
      userClubId: selectedClubId,
      managerName,
      currentSeasonYear: seasonYear,
      saSeasonYear,
      europeSeasonYear,
      reigningUclChampId: 'eu_psg',
      reigningUelChampId: 'eu_avl',
      reigningAfcChampId: 'wl_sau_ahl',
      currentRound: 1,
      currentDate: startDate,
      totalRounds: initialTotalRounds,
      seasonState: 'PLAYING',
      clubs: finalClubs,
      fixturesA,
      fixturesB,
      fixturesC,
      fixturesD: serieDData.fixtures,
      fixturesSupercopa: supercopaFixtures,
      fixturesRecopa: recopaFixtures,
      fixturesLibertadores: libData.fixtures,
      fixturesSulamericana: sulaData.fixtures,
      fixturesCopaBrasil: cdbFixtures,
      fixturesCopaNordeste: copaNordesteData.fixtures,
      fixturesCopaVerde: copaVerdeData.fixtures,
      fixturesEstadual: estData.fixtures,
      fixturesIntercontinental: intercontinentalFixtures,
      fixturesConcacafChampions: concacafData.fixtures,
      fixturesAfcChampions: afcData.fixtures,
      fixturesSouthAmerica: saLeaguesData.fixturesSouthAmerica,
      fixturesEurope: euLeaguesData.fixturesEurope,
      fixturesWorldLeagues: wlLeaguesData.fixturesWorldLeagues,
      fixturesChampionsLeague: uclData.fixtures,
      fixturesEuropaLeague: uelData.fixtures,
      fixturesConferenceLeague: ueclData.fixtures,
      fixturesUefaSupercup: uefaSupercupFixtures,
      fixturesCopaInternacional: cintData.fixtures,
      fixturesSuperMundial: [],
      fixturesEngCommunityShield: engCupsData.fixturesEngCommunityShield,
      fixturesEngEflCup: engCupsData.fixturesEngEflCup,
      fixturesEngFaCup: engCupsData.fixturesEngFaCup,
      fixturesEuropeanCups: euCupsData,
      fixturesSouthAmericanCups: saCupsData,
      fixturesWorldCups: wlCupsData,
      fixturesFriendlies: [],
      standingsA,
      standingsB,
      standingsC,
      standingsD: serieDData.standings,
      standingsLibertadores: libData.standings,
      standingsSulamericana: sulaData.standings,
      standingsEstadual: estData.standings,
      standingsCopaNordeste: copaNordesteData.standings,
      standingsCopaVerde: copaVerdeData.standings,
      standingsSouthAmerica: saLeaguesData.standingsSouthAmerica,
      standingsEurope: euLeaguesData.standingsEurope,
      standingsWorldLeagues: wlLeaguesData.standingsWorldLeagues,
      standingsChampionsLeague: uclData.standings,
      standingsEuropaLeague: uelData.standings,
      standingsConferenceLeague: ueclData.standings,
      standingsCopaInternacional: cintData.standings,
      standingsAfcChampions: afcData.standings,
      standingsSuperMundial: [],
      inbox: initialInbox,
      transferMarket: freeAgents,
      freeAgents2026Version: CURRENT_FREE_AGENTS_2026_VERSION,
      transferOffers: [],
      transferHistory: [],
      pendingTransfers: [],
      scoutingNetwork: createInitialScoutingNetwork(
        finalClubs.find((c) => c.id === selectedClubId) || finalClubs[0]
      ),
      trophyHistory: [],
      individualAwardsHistory: [],
      worldBallonDorHistory: [],
      unlockedAchievementIds: [],
      managerCareer: (() => {
        const baseCareer = createInitialManagerCareer(
          finalClubs.find((c) => c.id === selectedClubId) || finalClubs[0],
          finalClubs,
          seasonYear,
          startDate,
          cdbFixtures,
          libData.fixtures,
          sulaData.fixtures,
          uclData.fixtures,
          uelData.fixtures,
          ueclData.fixtures,
          cintData.fixtures,
          concacafData.fixtures,
          afcData.fixtures
        );
        return {
          ...baseCareer,
          boardConfidence: Math.max(
            20,
            Math.min(
              95,
              chosenChallenge.initialBoardConfidence + chosenSpecialty.initialBoardConfidenceDelta
            )
          ),
          fanConfidence: Math.max(
            20,
            Math.min(
              95,
              chosenChallenge.initialFanConfidence + chosenSpecialty.initialFanConfidenceDelta
            )
          ),
          managerReputation:
            chosenChallenge.id !== 'LIVRE'
              ? chosenChallenge.initialManagerReputation
              : baseCareer.managerReputation,
        };
      })(),
      managerSpecialty: chosenSpecialty.id,
      activeChallenge: buildActiveCareerChallenge(chosenChallenge.id, seasonYear),
      deadlineDayCompletedKeys: [],
      nationalTeam: createInitialNationalTeamState(
        finalClubs,
        Number(startDate.slice(0, 4)) || seasonYear
      ),
      coachingCarousel: createInitialCoachingCarousel(finalClubs),
      lockerRoom: {
        harmonyScore: 80,
        activeDemands: [],
        resolvedDemandsHistory: [],
        activePressConference: null,
        pressHistory: [],
        lastTalkRoundByPlayer: {},
      },
      drawnCompetitions: [],
      aiDirectorAutoNegotiate: false,
      watchlist: [],
      transferClauses: [],
    };

    // Synchronize real-world FIFA nationalities & calibrate save economy across all clubs before Day 1 simulation
    const initialClubsMap = new Map(finalClubs.map((c) => [c.id, c]));
    const syncedNewSave = rebalanceSaveEconomy(
      upgradeSaveWithSoccerWikiEngland(
        upgradeSaveWithSoccerWikiBrasil(
          applyResolvedNationalitiesToSave(rawNewSave, {}).save,
          initialClubsMap
        ),
        initialClubsMap
      )
    );

    // Pre-simulate the other hemisphere's already-elapsed fixtures & international dates up to `startDate` so both calendars coexist authentically from Day 1!
    const ensuredNewSave = ensureEuropeanAndDomesticSchedulesInSave(syncedNewSave);
    const preSimClubs = simulateCpuFixturesUpToDate(ensuredNewSave, startDate, false);
    const preSimWithNt = syncNationalTeamByDate(preSimClubs, startDate, true);
    const newSave = ensureEuropeanAndDomesticSchedulesInSave(
      syncOffContinentCalendarRollover(preSimWithNt)
    );

    const finalNewSave: GameSave = targetSlotNum
      ? {
          ...newSave,
          savedAt: new Date().toLocaleString('pt-BR'),
          saveName: `Espaço ${targetSlotNum} · ${selectedClubPreview?.shortName || 'Clube'}`,
        }
      : newSave;

    if (targetSlotNum) {
      void persistCareerSave(`brasfoot_slot_${targetSlotNum}`, finalNewSave).then((ok) => {
        if (ok) setHasAnySlotSaveState(true);
      });
    }

    setGameState(finalNewSave);
    setSmartAdvanceNotice(null);
    setDeadlineDaySession(null);
    setIsDeadlineDayModalOpen(false);
    let shouldShowTour = false;
    try {
      shouldShowTour = !localStorage.getItem('patofoot_first_run_tour_seen_v1');
    } catch {
      shouldShowTour = false;
    }
    if (shouldShowTour) {
      setActiveTab('hub');
      setIsFirstRunTourOpen(true);
    } else {
      setActiveTab('squad');
    }
    setIsAtTitleScreen(false);
  };

  const activeUserClub = gameState
    ? gameState.clubs.find((c) => c.id === gameState.userClubId) || gameState.clubs[0]
    : null;

  const isShowingTitleScreen = !gameState || isAtTitleScreen || !activeUserClub;

  const clubsWithWorldGuests = useMemo(
    () => (gameState?.clubs && !isShowingTitleScreen ? withWorldGuestClubs(gameState.clubs) : []),
    [gameState?.clubs, isShowingTitleScreen]
  );

  const allCompetitionsFixtures = useMemo(() => {
    if (!gameState || isShowingTitleScreen) return [];
    return [
      ...gameState.fixturesA,
      ...gameState.fixturesB,
      ...(gameState.fixturesC || []),
      ...(gameState.fixturesD || []),
      ...(gameState.fixturesSupercopa || []),
      ...(gameState.fixturesRecopa || []),
      ...(gameState.fixturesLibertadores || []),
      ...(gameState.fixturesSulamericana || []),
      ...(gameState.fixturesCopaBrasil || []),
      ...(gameState.fixturesCopaNordeste || []),
      ...(gameState.fixturesCopaVerde || []),
      ...(gameState.fixturesEstadual || []),
      ...(gameState.fixturesIntercontinental || []),
      ...(gameState.fixturesConcacafChampions || []),
      ...(gameState.fixturesAfcChampions || []),
      ...(gameState.fixturesChampionsLeague || []),
      ...(gameState.fixturesEuropaLeague || []),
      ...(gameState.fixturesConferenceLeague || []),
      ...(gameState.fixturesUefaSupercup || []),
      ...(gameState.fixturesCopaInternacional || []),
      ...(gameState.fixturesSuperMundial || []),
      ...(gameState.fixturesEngCommunityShield || []),
      ...(gameState.fixturesEngEflCup || []),
      ...(gameState.fixturesEngFaCup || []),
      ...flattenEuropeanCupsFixtures(gameState.fixturesEuropeanCups),
      ...flattenSouthAmericanCupsFixtures(gameState.fixturesSouthAmericanCups),
      ...flattenWorldCupsFixtures(gameState.fixturesWorldCups),
      ...(gameState.fixturesFriendlies || []),
      ...flattenSouthAmericaFixtures(gameState.fixturesSouthAmerica),
      ...flattenEuropeFixtures(gameState.fixturesEurope),
      ...flattenWorldLeaguesFixtures(gameState.fixturesWorldLeagues),
    ];
  }, [
    isShowingTitleScreen,
    gameState?.fixturesA,
    gameState?.fixturesB,
    gameState?.fixturesC,
    gameState?.fixturesD,
    gameState?.fixturesSupercopa,
    gameState?.fixturesRecopa,
    gameState?.fixturesLibertadores,
    gameState?.fixturesSulamericana,
    gameState?.fixturesCopaBrasil,
    gameState?.fixturesCopaNordeste,
    gameState?.fixturesCopaVerde,
    gameState?.fixturesEstadual,
    gameState?.fixturesIntercontinental,
    gameState?.fixturesConcacafChampions,
    gameState?.fixturesAfcChampions,
    gameState?.fixturesChampionsLeague,
    gameState?.fixturesEuropaLeague,
    gameState?.fixturesConferenceLeague,
    gameState?.fixturesUefaSupercup,
    gameState?.fixturesCopaInternacional,
    gameState?.fixturesSuperMundial,
    gameState?.fixturesEngCommunityShield,
    gameState?.fixturesEngEflCup,
    gameState?.fixturesEngFaCup,
    gameState?.fixturesEuropeanCups,
    gameState?.fixturesSouthAmericanCups,
    gameState?.fixturesWorldCups,
    gameState?.fixturesFriendlies,
    gameState?.fixturesSouthAmerica,
    gameState?.fixturesEurope,
    gameState?.fixturesWorldLeagues,
  ]);

  const allUserFixtures = useMemo(() => {
    if (!activeUserClub || isShowingTitleScreen) return [];
    return allCompetitionsFixtures.filter(
      (f) => f.homeTeamId === activeUserClub.id || f.awayTeamId === activeUserClub.id
    );
  }, [activeUserClub?.id, allCompetitionsFixtures, isShowingTitleScreen]);

  const upcomingUserFixture = useMemo(
    () =>
      activeUserClub && gameState && !isShowingTitleScreen
        ? getUpcomingClubFixture(allUserFixtures, activeUserClub.id, gameState.currentDate)
        : null,
    [activeUserClub?.id, gameState?.currentDate, allUserFixtures, isShowingTitleScreen]
  );
  const upcomingSelecaoFixture = useMemo(
    () =>
      gameState && !isShowingTitleScreen
        ? getUpcomingUserSelecaoFixture(gameState.nationalTeam, gameState.currentDate)
        : null,
    [gameState?.nationalTeam, gameState?.currentDate, isShowingTitleScreen]
  );
  const isTodayMatchDay = Boolean(
    gameState &&
      upcomingUserFixture &&
      (!upcomingUserFixture.date || upcomingUserFixture.date <= gameState.currentDate)
  );
  const isTodaySelecaoMatchDay = Boolean(
    gameState &&
      upcomingSelecaoFixture &&
      ((upcomingSelecaoFixture.date && upcomingSelecaoFixture.date <= gameState.currentDate) ||
        upcomingSelecaoFixture.status === 'READY_FOR_USER')
  );
  const hasPreCutoffSelecaoMatches = useMemo(
    () => (gameState && !isShowingTitleScreen ? hasRemainingPreCutoffSelecaoFixtures(gameState) : false),
    [gameState, isShowingTitleScreen]
  );

  const currentRoundFixtures = useMemo(() => {
    if (!upcomingUserFixture || !gameState || isShowingTitleScreen) return [];
    return getSimultaneousMatchdayFixtures(gameState, upcomingUserFixture);
  }, [upcomingUserFixture, gameState, isShowingTitleScreen]);

  const upcomingOpponentClub = useMemo(() => {
    if (!upcomingUserFixture || !activeUserClub || !gameState || isShowingTitleScreen) return null;
    const oppId =
      upcomingUserFixture.homeTeamId === activeUserClub.id
        ? upcomingUserFixture.awayTeamId
        : upcomingUserFixture.homeTeamId;
    return clubsWithWorldGuests.find((c) => c.id === oppId) || null;
  }, [upcomingUserFixture, activeUserClub, gameState, clubsWithWorldGuests, isShowingTitleScreen]);

  const upcomingRivalry = useMemo(
    () => (isShowingTitleScreen ? null : getMatchRivalryInfo(activeUserClub, upcomingOpponentClub)),
    [activeUserClub, upcomingOpponentClub, isShowingTitleScreen]
  );

  const watchlistPlayerIds = useMemo(() => {
    if (!gameState || !activeUserClub || isShowingTitleScreen) return [];
    return resolveWatchlistItems({
      watchlist: gameState.watchlist,
      userClub: activeUserClub,
      allClubs: clubsWithWorldGuests,
      freeAgents: gameState.transferMarket,
      pendingTransfers: gameState.pendingTransfers,
    }).map((item) => item.entry.playerId);
  }, [gameState, activeUserClub, clubsWithWorldGuests, isShowingTitleScreen]);

  const oct2026Coverage = useMemo(() => {
    void oct2026CacheVersion;
    if (!gameState || isShowingTitleScreen) {
      return { totalClubs: 0, syncedClubs: 0, pendingClubs: 0, percentage: 0, regions: [] };
    }
    return computeOct2026CoverageSummary(
      gameState.clubs,
      gameState.aiOct2026SquadSyncedClubIds || [],
      getCachedOct2026SquadProfiles()
    );
  }, [gameState, oct2026CacheVersion, isShowingTitleScreen]);

  const needsTitleCatalog =
    isShowingTitleScreen &&
    (isTitleCatalogRequested || openClubPickerOnTitle || isOct2026ModalOpen);

  const titleInitialClubs = useMemo(() => {
    if (!needsTitleCatalog) return [];
    void oct2026CacheVersion;
    const cachedProfiles = getCachedOct2026SquadProfiles();
    const base = getBaseInitialClubsReadonly();
    return Object.keys(cachedProfiles).length > 0
      ? applyCachedOct2026SquadsToClubs(base, cachedProfiles)
      : base;
  }, [needsTitleCatalog, oct2026CacheVersion]);

  const titleCoverage = useMemo(() => {
    if (!needsTitleCatalog) {
      return { totalClubs: 0, syncedClubs: 0, pendingClubs: 0, percentage: 0, regions: [] };
    }
    void oct2026CacheVersion;
    return computeOct2026CoverageSummary(
      titleInitialClubs,
      [],
      getCachedOct2026SquadProfiles()
    );
  }, [needsTitleCatalog, titleInitialClubs, oct2026CacheVersion]);

  const handleRequestTitleClubsCatalog = useCallback(() => {
    setIsTitleCatalogRequested(true);
  }, []);

  const handleLoadSaveFromTitle = useCallback(
    (loaded: GameSave) => {
      const sanitized = sanitizeSave(loaded);
      if (gameSettings.autoSaveEnabled) {
        void persistCareerSave('brasfoot_autosave', sanitized);
      }
      setIsOct2026ModalOpen(false);
      setGameState(sanitized);
      setIsAtTitleScreen(false);
    },
    [gameSettings.autoSaveEnabled]
  );

  const handleResumeSavedGameOnTitle = useCallback(() => {
    setIsOct2026ModalOpen(false);
    if (gameState) {
      setIsAtTitleScreen(false);
      return;
    }
    void loadCareerSave('brasfoot_autosave').then((saved) => {
      if (saved) {
        try {
          setGameState(sanitizeSave(saved));
          setIsAtTitleScreen(false);
        } catch {
          // fallback
        }
      }
    });
  }, [gameState]);

  const handleOpenTitleSaveManager = useCallback(() => setIsSaveModalOpen(true), []);
  const handleOpenTitleSettings = useCallback(() => {
    setSettingsInitialSection('career');
    setIsSettingsModalOpen(true);
  }, []);
  const handleOpenTitleOct2026Modal = useCallback(() => {
    setIsTitleCatalogRequested(true);
    setIsOct2026ModalOpen(true);
  }, []);
  const handleConsumeTitlePicker = useCallback(() => setOpenClubPickerOnTitle(false), []);
  const handleInspectPlayerGlobal = useCallback(
    (player: Player, club?: Club | null) => {
      setInspectedGlobalPlayer({ player, club: club ?? null });
    },
    []
  );

  if (isHydratingSave) {
    return <div className="min-h-screen bg-black" />;
  }

  if (showOfficialSite) {
    const hasAnySlotSave = Boolean(gameState) || hasAnySlotSaveState || hasAnySavedCareerSlotSync();
    const savedClubName = gameState
      ? gameState.clubs.find((c) => c.id === gameState.userClubId)?.name
      : undefined;

    return (
      <LanguageProvider
        language={gameSettings.language || 'pt-BR'}
        onChangeLanguage={handleChangeLanguage}
      >
        <Suspense fallback={<div className="min-h-screen bg-[#020617]" />}>
          <OfficialWebsiteView
            hasSavedCareer={hasAnySlotSave}
            savedClubName={savedClubName}
            initialSection={officialSiteSection}
            onEnterWebGame={() => handleExitOfficialSiteToGame(true)}
            onStartNewCareerDirect={() => {
              handleExitOfficialSiteToGame(true);
              setOpenClubPickerOnTitle(true);
            }}
            onResumeCareerDirect={
              gameState
                ? () => {
                    handleExitOfficialSiteToGame(false);
                    setIsAtTitleScreen(false);
                  }
                : undefined
            }
          />
        </Suspense>
        <OfflineIndicator />
      </LanguageProvider>
    );
  }

  if (isShowingTitleScreen) {
    const hasAnySlotSave = hasAnySlotSaveState || hasAnySavedCareerSlotSync();

    return (
      <LanguageProvider
        language={gameSettings.language || 'pt-BR'}
        onChangeLanguage={handleChangeLanguage}
      >
        <TitleScreen
          clubs={titleInitialClubs}
          savedCareer={gameState}
          hasAnySlotSave={hasAnySlotSave}
          slotsRefreshKey={titleSlotsRefreshKey}
          initialOpenClubPicker={openClubPickerOnTitle}
          onConsumeInitialPicker={handleConsumeTitlePicker}
          onRequestClubsCatalog={handleRequestTitleClubsCatalog}
          onStartCareer={handleStartCareer}
          onLoadSave={handleLoadSaveFromTitle}
          onResumeSavedGame={handleResumeSavedGameOnTitle}
          onOpenSaveManager={handleOpenTitleSaveManager}
          onOpenSettings={handleOpenTitleSettings}
          onOpenGuide={(tab: GameGuideTab = 'guide') => {
            setGuideInitialTab(tab);
            setIsGuideModalOpen(true);
          }}
          onOpenOfficialSite={() => handleOpenOfficialSite()}
          onOpenOct2026GlobalSyncModal={handleOpenTitleOct2026Modal}
          isSyncingOct2026Global={isSyncingOct2026Global}
          oct2026SyncedCount={titleCoverage.syncedClubs}
          oct2026TotalClubsCount={titleCoverage.totalClubs}
        />

        <Suspense fallback={null}>
        {isSaveModalOpen && (
          <SaveLoadModal
            currentSave={gameState}
            autoSaveEnabled={gameSettings.autoSaveEnabled}
            autoSaveIntervalMinutes={gameSettings.autoSaveIntervalMinutes}
            onLoadSave={(loaded) => {
              const sanitized = sanitizeSave(loaded);
              if (gameSettings.autoSaveEnabled) {
                void persistCareerSave('brasfoot_autosave', sanitized);
              }
              setGameState(sanitized);
              setIsAtTitleScreen(false);
            }}
            onOpenSettings={() => {
              setSettingsInitialSection('career');
              setIsSettingsModalOpen(true);
            }}
            onClose={() => {
              setIsSaveModalOpen(false);
              setHasAnySlotSaveState(hasAnySavedCareerSlotSync());
              setTitleSlotsRefreshKey((k) => k + 1);
            }}
          />
        )}

        {isSettingsModalOpen && (
          <SettingsModal
            settings={gameSettings}
            onUpdateSettings={handleUpdateSettings}
            onClearAllSavedData={handleClearAllSavedData}
            initialSection={settingsInitialSection}
            isInGame={false}
            onClose={() => setIsSettingsModalOpen(false)}
          />
        )}

        {isGuideModalOpen && (
          <GameGuideModal
            initialTab={guideInitialTab}
            onClose={() => setIsGuideModalOpen(false)}
          />
        )}

        {isOct2026ModalOpen && (
          <Oct2026GlobalSyncModal
            isOpen={isOct2026ModalOpen}
            clubs={titleInitialClubs}
            userClub={null}
            syncedClubIds={[]}
            cacheVersion={oct2026CacheVersion}
            isSyncing={isSyncingOct2026Global}
            isSyncingSingleClub={Boolean(syncingOct2026Target)}
            activeScope={oct2026ActiveScope}
            progress={oct2026BatchProgress}
            statusMessage={oct2026SyncFeedback}
            groundingSources={oct2026GroundingSources}
            recentUpdatedClubs={oct2026RecentUpdatedClubs}
            onStartSync={(scope, forceRefresh, preferredProvider) => {
              void handleStartGlobalOct2026Sync(scope, forceRefresh, preferredProvider);
            }}
            onSyncSingleClub={(club) => {
              void handleSyncSingleClubForBaseCatalog(club);
            }}
            onStopSync={handleStopGlobalOct2026Sync}
            onClose={() => setIsOct2026ModalOpen(false)}
          />
        )}
        </Suspense>
        <OfflineIndicator />
      </LanguageProvider>
    );
  }

  const userClub = activeUserClub;

  // Player Watchlist (Lista de Observação) Handlers
  const handleToggleWatchlistPlayer = (playerId: string) => {
    soundEngine.playClick();
    setGameState((prev) => {
      if (!prev) return null;
      const result = toggleWatchlistEntry(prev.watchlist, playerId, prev.currentDate);
      return {
        ...prev,
        watchlist: result.updated,
      };
    });
  };

  const handleRemoveWatchlistPlayer = (playerId: string) => {
    soundEngine.playClick();
    setGameState((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        watchlist: removeWatchlistEntry(prev.watchlist, playerId),
      };
    });
  };

  const handleClearWatchlist = () => {
    soundEngine.playClick();
    setGameState((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        watchlist: [],
      };
    });
  };

  const handleOpenMarketWatchlist = () => {
    setMarketInitialTab('watchlist');
    setMarketInitialSearch('');
    setMarketSearchNonce((n) => n + 1);
    setActiveTab('market');
  };

  // Update tactics (and re-run AI Assistant Lineup if auto-lineup is enabled and formation changed)
  const handleUpdateTactics = (newTactics: TacticalSettings) => {
    setGameState((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        clubs: prev.clubs.map((c) => {
          if (c.id !== userClub.id) return c;
          const formationChanged = c.tactics.formation !== newTactics.formation;
          if (newTactics.autoLineupAssistantEnabled && formationChanged) {
            const optimal = buildAssistantOptimalLineup(
              c,
              upcomingUserFixture?.competition,
              newTactics
            );
            return {
              ...c,
              tactics: optimal.updatedTactics,
              squad: optimal.updatedSquad,
            };
          }
          return {
            ...c,
            tactics: newTactics,
            squad: formationChanged
              ? c.squad.map((p) => ({
                  ...p,
                  pitchX: undefined,
                  pitchY: undefined,
                  pitchRoleCode: undefined,
                }))
              : c.squad,
          };
        }),
      };
    });
  };

  // Atomic update of both squad and tactics from Assistant Coach in TacticsPanel
  const handleApplyAssistantLineup = (newSquad: Player[], newTactics: TacticalSettings) => {
    setGameState((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        clubs: prev.clubs.map((c) =>
          c.id === userClub.id
            ? {
                ...c,
                squad: newSquad,
                tactics: newTactics,
              }
            : c
        ),
      };
    });
  };

  // Save a Tactical Preset (slots 0, 1, 2)
  const handleSaveTacticalPreset = (preset: TacticalPreset) => {
    setGameState((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        clubs: prev.clubs.map((c) => {
          if (c.id !== prev.userClubId) return c;
          const existing = (c.tacticalPresets || []).filter(
            (p) => p.slotIndex !== preset.slotIndex
          );
          const nextPresets = [...existing, preset].sort((a, b) => a.slotIndex - b.slotIndex);
          return {
            ...c,
            tacticalPresets: nextPresets,
          };
        }),
      };
    });
  };

  // Load a saved Tactical Preset (restores formation, mentality, set pieces & 11 starters with auto-fill for injured/suspended)
  const handleLoadTacticalPreset = (preset: TacticalPreset) => {
    setGameState((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        clubs: prev.clubs.map((c) => {
          if (c.id !== prev.userClubId) return c;
          const desiredSet = new Set(preset.starterIds);
          const fitSavedStarters = c.squad.filter(
            (p) => desiredSet.has(p.id) && p.injuryWeeks === 0 && !p.isSuspended
          );
          const selectedIds = new Set<string>(fitSavedStarters.map((p) => p.id));

          // Ensure at least 1 GK is selected if available
          const hasGk = fitSavedStarters.some((p) => p.position === 'GK');
          if (!hasGk) {
            const bestGk = [...c.squad]
              .filter((p) => p.position === 'GK' && p.injuryWeeks === 0 && !p.isSuspended)
              .sort((a, b) => b.overall - a.overall)[0];
            if (bestGk) {
              if (selectedIds.size >= 11) {
                const lastId = Array.from(selectedIds).pop();
                if (lastId) selectedIds.delete(lastId);
              }
              selectedIds.add(bestGk.id);
            }
          }

          // Auto-fill up to 11 starters from healthiest/best fit players
          if (selectedIds.size < 11) {
            const candidates = [...c.squad]
              .filter((p) => !selectedIds.has(p.id) && p.injuryWeeks === 0 && !p.isSuspended)
              .sort((a, b) => b.overall * 0.7 + b.condition * 0.3 - (a.overall * 0.7 + a.condition * 0.3));
            for (const cand of candidates) {
              if (selectedIds.size >= 11) break;
              if (cand.position === 'GK' && Array.from(selectedIds).some((id) => c.squad.find((x) => x.id === id)?.position === 'GK')) {
                continue;
              }
              selectedIds.add(cand.id);
            }
          }

          return {
            ...c,
            tactics: {
              ...c.tactics,
              formation: preset.formation,
              mentality: preset.mentality,
              marking: preset.marking,
              passing: preset.passing,
              captainId: preset.captainId ?? c.tactics.captainId,
              penaltyTakerId: preset.penaltyTakerId ?? c.tactics.penaltyTakerId,
              freekickTakerId: preset.freekickTakerId ?? c.tactics.freekickTakerId,
              cornerTakerId: preset.cornerTakerId ?? c.tactics.cornerTakerId,
              cornerRoutine: preset.cornerRoutine ?? c.tactics.cornerRoutine,
              freekickRoutine: preset.freekickRoutine ?? c.tactics.freekickRoutine,
            },
            squad: c.squad.map((p) => ({
              ...p,
              isStarter: selectedIds.has(p.id),
            })),
          };
        }),
      };
    });
  };

  // Save current XI + bench into Time A (Titular) or Time B (Misto/Reserva) quick profile
  const handleSaveLineupProfile = (slot: 'A' | 'B') => {
    setGameState((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        clubs: prev.clubs.map((c) => {
          if (c.id !== prev.userClubId) return c;
          const snapshot = createSavedLineupProfile(
            c,
            slot,
            slot === 'A' ? 'Time A (Titular)' : 'Time B (Misto)',
            formatShortDate(prev.currentDate)
          );
          const others = (c.savedLineups || []).filter((p) => p.slot !== slot);
          const nextSaved = [...others, snapshot].sort((a, b) => a.slot.localeCompare(b.slot));
          return {
            ...c,
            savedLineups: nextSaved,
          };
        }),
      };
    });
  };

  // Load saved Time A / Time B profile with automatic replacement of sold/injured/suspended players
  const handleLoadLineupProfile = (profile: SavedLineupProfile) => {
    const upcomingComp = upcomingUserFixture?.competition;
    setGameState((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        clubs: prev.clubs.map((c) => {
          if (c.id !== prev.userClubId) return c;
          const applied = applySavedLineupProfile(c, profile, upcomingComp);
          return {
            ...c,
            squad: applied.updatedSquad,
            tactics: applied.updatedTactics,
          };
        }),
      };
    });
  };

  // Deadline Day info & handlers
  const deadlineDayInfo = getDeadlineDayWindowKey(gameState.currentDate, userClub);
  const isDeadlineDayOpen =
    deadlineDayInfo.isDeadlinePeriod &&
    !(gameState.deadlineDayCompletedKeys || []).includes(deadlineDayInfo.windowKey);

  const handleOpenDeadlineDay = (overrideState?: GameSave) => {
    const stateToUse = overrideState || gameState;
    const clubForDeadline =
      stateToUse.clubs.find((c) => c.id === stateToUse.userClubId) || userClub;
    const info = getDeadlineDayWindowKey(stateToUse.currentDate, clubForDeadline);
    if (deadlineDaySession && deadlineDaySession.windowKey === info.windowKey) {
      setIsDeadlineDayModalOpen(true);
      return;
    }
    const specialty = getManagerSpecialtyProfile(stateToUse.managerSpecialty);
    const freshSession = generateDeadlineDaySession(
      stateToUse,
      specialty.transferSellBonusPct,
      specialty.transferBuyDiscountPct
    );
    setDeadlineDaySession(freshSession);
    setIsDeadlineDayModalOpen(true);
  };

  const handleAcceptDeadlineFlashOffer = (offer: DeadlineFlashOffer, finalAmount: number) => {
    setGameState((prev) => {
      if (!prev) return null;
      const seller = prev.clubs.find((c) => c.id === prev.userClubId);
      const soldPlayer = seller?.squad.find((p) => p.id === offer.playerId);
      if (!seller || !soldPlayer) return prev;

      const updatedClubs = prev.clubs.map((c) => {
        if (c.id === prev.userClubId) {
          const remaining = c.squad.filter((p) => p.id !== offer.playerId);
          // Rebalance 11 starters if we sold a starter
          const startersCount = remaining.filter((p) => p.isStarter).length;
          let rebalanced = remaining;
          if (startersCount < 11) {
            const promo = [...remaining]
              .filter((p) => !p.isStarter && p.injuryWeeks === 0 && !p.isSuspended)
              .sort((a, b) => b.overall - a.overall)[0];
            if (promo) {
              rebalanced = remaining.map((p) =>
                p.id === promo.id ? { ...p, isStarter: true } : p
              );
            }
          }
          return {
            ...c,
            squad: rebalanced,
            finances: {
              ...c.finances,
              balance: c.finances.balance + finalAmount,
              totalIncomeSeason: c.finances.totalIncomeSeason + finalAmount,
            },
          };
        }
        if (c.id === offer.buyerClubId) {
          return {
            ...c,
            squad: [...c.squad, { ...soldPlayer, isStarter: false, isListedForSale: false }],
          };
        }
        return c;
      });

      const historyEntry: TransferHistoryRecord = {
        id: `dd_sell_${Date.now()}_${offer.playerId}`,
        playerId: soldPlayer.id,
        playerName: soldPlayer.name,
        playerRole: soldPlayer.detailedRole,
        playerOverall: soldPlayer.overall,
        playerAge: soldPlayer.age,
        fromClubId: seller.id,
        fromClubName: seller.shortName,
        toClubId: offer.buyerClubId,
        toClubName: offer.buyerClubShortName,
        fee: finalAmount,
        wage: soldPlayer.wage,
        date: prev.currentDate,
        round: prev.currentRound,
        seasonYear: prev.currentSeasonYear,
        category: 'SALE',
        direction: 'OUT',
        notes: 'Venda relâmpago no Deadline Day',
      };

      const inboxItem: InboxMessage = {
        id: `dd_sell_msg_${Date.now()}`,
        title: `Deadline Day: ${soldPlayer.name} vendido ao ${offer.buyerClubShortName}`,
        message: `Negócio relâmpago concluído no Último Dia da Janela! ${soldPlayer.name} (OVR ${soldPlayer.overall}) foi transferido ao ${offer.buyerClubName} por R$ ${(finalAmount / 1_000_000).toFixed(2).replace('.', ',')} mi.`,
        date: formatShortDate(prev.currentDate),
        round: prev.currentRound,
        read: false,
        type: 'TRANSFER',
      };

      return {
        ...prev,
        clubs: updatedClubs,
        transferHistory: [historyEntry, ...(prev.transferHistory || [])],
        inbox: [inboxItem, ...prev.inbox],
      };
    });
  };

  const handleSignDeadlineBargain = (target: DeadlineBargainTarget): boolean => {
    const currentUser = gameState.clubs.find((c) => c.id === gameState.userClubId);
    if (!currentUser) return false;
    if (currentUser.finances.balance < target.bargainPrice) return false;
    if (currentUser.squad.length >= MAX_SQUAD_SIZE) return false;

    setGameState((prev) => {
      if (!prev) return null;
      const buyer = prev.clubs.find((c) => c.id === prev.userClubId);
      if (!buyer || buyer.finances.balance < target.bargainPrice) return prev;

      const signedPlayer: Player = ensurePlayerContractFields(
        {
          ...target.player,
          isStarter: false,
          isListedForSale: false,
          isLoan: false,
          wage: target.requestedWage,
          contractYears: 3,
        },
        buyer.country || 'Brasil'
      );

      const updatedClubs = prev.clubs.map((c) => {
        if (c.id === prev.userClubId) {
          return {
            ...c,
            squad: [...c.squad, signedPlayer],
            finances: {
              ...c.finances,
              balance: c.finances.balance - target.bargainPrice,
              totalExpensesSeason: c.finances.totalExpensesSeason + target.bargainPrice,
            },
          };
        }
        if (target.sellerClubId && c.id === target.sellerClubId) {
          return {
            ...c,
            squad: c.squad.filter((p) => p.id !== target.player.id),
            finances: {
              ...c.finances,
              balance: c.finances.balance + target.bargainPrice,
            },
          };
        }
        return c;
      });

      const updatedMarket = target.sellerClubId
        ? prev.transferMarket
        : prev.transferMarket.filter((p) => p.id !== target.player.id);

      const historyEntry: TransferHistoryRecord = {
        id: `dd_buy_${Date.now()}_${target.player.id}`,
        playerId: signedPlayer.id,
        playerName: signedPlayer.name,
        playerRole: signedPlayer.detailedRole,
        playerOverall: signedPlayer.overall,
        playerAge: signedPlayer.age,
        fromClubId: target.sellerClubId,
        fromClubName: target.sellerClubName,
        toClubId: buyer.id,
        toClubName: buyer.shortName,
        fee: target.bargainPrice,
        wage: signedPlayer.wage,
        date: prev.currentDate,
        round: prev.currentRound,
        seasonYear: prev.currentSeasonYear,
        category: target.sellerClubId ? 'PURCHASE' : 'FREE_AGENT',
        direction: 'IN',
        notes: `Oportunidade Deadline Day (${target.discountPct}% OFF)`,
      };

      const inboxItem: InboxMessage = {
        id: `dd_buy_msg_${Date.now()}`,
        title: `Reforço no Deadline Day: ${signedPlayer.name}!`,
        message: `Contratação de última hora confirmada no BID! ${signedPlayer.name} (${signedPlayer.detailedRole}, OVR ${signedPlayer.overall}) chegou do ${target.sellerClubName} com ${target.discountPct}% de desconto.`,
        date: formatShortDate(prev.currentDate),
        round: prev.currentRound,
        read: false,
        type: 'TRANSFER',
      };

      return {
        ...prev,
        clubs: updatedClubs,
        transferMarket: updatedMarket,
        transferHistory: [historyEntry, ...(prev.transferHistory || [])],
        inbox: [inboxItem, ...prev.inbox],
      };
    });
    return true;
  };

  const handleCloseDeadlineDayComplete = (windowKey: string) => {
    setGameState((prev) => {
      if (!prev) return null;
      const existing = prev.deadlineDayCompletedKeys || [];
      if (existing.includes(windowKey)) return prev;
      return {
        ...prev,
        deadlineDayCompletedKeys: [...existing, windowKey],
      };
    });
    setIsDeadlineDayModalOpen(false);
    setDeadlineDaySession(null);
  };

  // Update squad
  const handleUpdateSquad = (newSquad: Player[]) => {
    setGameState((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        clubs: prev.clubs.map((c) => (c.id === userClub.id ? { ...c, squad: newSquad } : c)),
      };
    });
  };

  // Update club finances & stadium
  const handleUpdateFinancesAndStadium = (updatedClub: Club) => {
    setGameState((prev) => {
      if (!prev) return null;
      const syncedClub =
        updatedClub.id === prev.userClubId
          ? syncUserClubLiveMonthlySnapshot(
              updatedClub,
              prev.currentDate,
              prev.currentSeasonYear
            )
          : updatedClub;
      return {
        ...prev,
        clubs: prev.clubs.map((c) => (c.id === syncedClub.id ? syncedClub : c)),
      };
    });
  };

  // Sign Player (supports optional Player Swap + Cash compensation, Contract Years 1..5 & Deferred Window Arrival)
  const handleSignPlayer = (
    player: Player,
    transferFee: number,
    wage: number,
    fromClubId?: string,
    swapOutPlayerId?: string,
    contractYears: number = 3,
    clausePkg?: ClausePackageInput
  ): boolean => {
    const safeYears = Math.max(1, Math.min(5, Math.round(contractYears || 3)));
    const yearsLabel = `${safeYears} ${safeYears === 1 ? 'ano' : 'anos'}`;
    const activeUserClub =
      gameState?.clubs.find((c) => c.id === gameState.userClubId) || userClub;
    const sellerClubPreview = fromClubId
      ? gameState?.clubs.find((c) => c.id === fromClubId)
      : undefined;
    const hasValidSwap = Boolean(
      swapOutPlayerId &&
        fromClubId &&
        activeUserClub.squad.some((p) => p.id === swapOutPlayerId && !p.isLoan)
    );
    const willingness = evaluatePlayerClubWillingness(activeUserClub, player, {
      dealType: sellerClubPreview ? 'PURCHASE' : 'FREE_AGENT',
      sellerClub: sellerClubPreview,
    });
    if (
      !gameState ||
      !willingness.willing ||
      !canClubRegisterNewPlayer(activeUserClub, gameState.pendingTransfers, hasValidSwap) ||
      isClubUnderTransferBan(activeUserClub, gameState.currentDate).banned ||
      findPendingTransferForPlayer(gameState.pendingTransfers, player.id) ||
      (swapOutPlayerId && findPendingTransferForPlayer(gameState.pendingTransfers, swapOutPlayerId))
    ) {
      return false;
    }

    soundEngine.playContractSigned();
    setGameState((prev) => {
      if (!prev) return null;

      const currentUserClub =
        prev.clubs.find((c) => c.id === prev.userClubId) || userClub;
      const sellerClub = fromClubId ? prev.clubs.find((c) => c.id === fromClubId) : undefined;
      const swapOutPlayer =
        swapOutPlayerId && sellerClub
          ? currentUserClub.squad.find((p) => p.id === swapOutPlayerId && !p.isLoan)
          : undefined;
      const winStatus = getTransferWindowStatus(prev.currentDate, currentUserClub);
      const activeSeasonYear = resolveClubActiveSeasonYear(currentUserClub, prev);

      // If Transfer Window is CLOSED: lock deal now and integrate player only when the window opens.
      // For European clubs (Jan 1-31 & Jul 1-Aug 31), ALL signings (including free agents) wait for the open window!
      if (!winStatus.isOpen && (sellerClub || currentUserClub.division === 'EU')) {
        const updatedClubsClosed = prev.clubs.map((c) => {
          if (c.id === userClub.id) {
            return {
              ...c,
              finances: recordFinanceLedgerMutation(c.finances, {
                date: prev.currentDate,
                category: 'TRANSFERS_OUT',
                type: 'EXPENSE',
                amount: transferFee,
                description: `Compra acertada: ${player.name}${sellerClub ? ` (${sellerClub.shortName})` : ''}`,
                applyToBalance: true,
              }),
            };
          }
          if (fromClubId && c.id === fromClubId) {
            return {
              ...c,
              finances: {
                ...c.finances,
                balance: c.finances.balance + transferFee,
                totalIncomeSeason: c.finances.totalIncomeSeason + transferFee,
              },
            };
          }
          return c;
        });

        const updatedFreeAgentsClosed = prev.transferMarket.filter((p) => p.id !== player.id);

        const pendingDeal: PendingTransferDeal = {
          id: `ptr_in_${Date.now()}_${player.id}`,
          dealKind: swapOutPlayer ? 'SWAP' : sellerClub ? 'PURCHASE' : 'FREE_AGENT',
          player: { ...player },
          playerId: player.id,
          playerName: player.name,
          playerRole: player.detailedRole,
          playerOverall: player.overall,
          playerAge: player.age,
          fromClubId: sellerClub?.id,
          fromClubName: sellerClub ? sellerClub.name : 'Sem Clube (Livre)',
          toClubId: userClub.id,
          toClubName: userClub.name,
          fee: transferFee,
          offeredWage: wage,
          offeredContractYears: safeYears,
          agreedDate: prev.currentDate,
          agreedRound: prev.currentRound,
          arrivalDate: winStatus.nextOpenDate,
          arrivalDisplayDate: winStatus.nextOpenDisplay,
          arrivalWindowLabel: winStatus.nextWindowLabel,
          swapOutPlayerId: swapOutPlayer?.id,
          swapOutPlayerName: swapOutPlayer?.name,
        };

        const historyClosed: TransferHistoryRecord = {
          id: `tr_in_${Date.now()}_${player.id}`,
          playerId: player.id,
          playerName: player.name,
          playerRole: player.detailedRole,
          playerOverall: player.overall,
          playerAge: player.age,
          fromClubId: sellerClub?.id,
          fromClubName: sellerClub ? sellerClub.name : 'Sem Clube (Livre)',
          toClubId: userClub.id,
          toClubName: userClub.name,
          fee: transferFee,
          wage,
          date: prev.currentDate,
          round: prev.currentRound,
          seasonYear: activeSeasonYear,
          category: swapOutPlayer ? 'SWAP' : sellerClub ? 'PURCHASE' : 'FREE_AGENT',
          direction: 'IN',
          notes: swapOutPlayer
            ? `Troca c/ ${swapOutPlayer.name} · Contrato de ${yearsLabel} · Chega em ${winStatus.nextOpenDisplay}`
            : `Contrato de ${yearsLabel} · Apresentação em ${winStatus.nextOpenDisplay}`,
        };

        const closedInboxMsg: InboxMessage = {
          id: `sign_pending_${Date.now()}_${player.id}`,
          title: `✍️ Contratação Acertada: ${player.name} chega em ${winStatus.nextOpenDisplay}!`,
          message: `O ${userClub.name} fechou a contratação de ${player.name} (${player.detailedRole}, OVR ${
            player.overall
          })${sellerClub ? ` junto ao ${sellerClub.name}` : ' (livre no mercado)'}${
            swapOutPlayer ? `, incluindo ${swapOutPlayer.name} na troca` : ''
          }, com vínculo de ${yearsLabel}. Como a Janela de Transferências está fechada fora de Jan–03/03 e 20/07–11/09, o atleta se apresentará oficialmente ao elenco em ${
            winStatus.nextOpenDisplay
          }!`,
          date: prev.currentDate,
          round: prev.currentRound,
          read: false,
          type: 'TRANSFER',
        };

        const closedClause =
          sellerClub && clausePkg
            ? buildTransferClauseRecord({
                player: { ...player, goals: 0, matches: 0 },
                currentClub: userClub,
                counterpartyClub: sellerClub,
                direction: 'PAYABLE',
                pkg: clausePkg,
                currentDate: prev.currentDate,
              })
            : null;

        return {
          ...prev,
          clubs: updatedClubsClosed,
          transferMarket: updatedFreeAgentsClosed,
          pendingTransfers: [pendingDeal, ...(prev.pendingTransfers || [])],
          transferClauses: closedClause
            ? [closedClause, ...(prev.transferClauses || [])]
            : prev.transferClauses || [],
          watchlist: removeWatchlistEntry(prev.watchlist, player.id),
          inbox: [closedInboxMsg, ...prev.inbox],
          transferHistory: [historyClosed, ...(prev.transferHistory || [])],
        };
      }

      const remainingUserSquad = swapOutPlayer
        ? userClub.squad.filter((p) => p.id !== swapOutPlayer.id)
        : userClub.squad;

      const newSquadNumber = Math.max(...remainingUserSquad.map((p) => p.squadNumber), 20) + 1;
      const signedPlayer: Player = ensurePlayerContractFields({
        ...player,
        wage,
        contractYears: safeYears,
        releaseClause: computeDefaultReleaseClause(
          { ...player, contractYears: safeYears },
          currentUserClub
        ),
        preContractClubId: undefined,
        preContractClubName: undefined,
        preContractWage: undefined,
        preContractYears: undefined,
        isStarter: false,
        isSubstitute: true,
        isListedForSale: false,
        isListedForLoan: false,
        squadNumber: newSquadNumber,
      });

      const updatedUserClub: Club = {
        ...userClub,
        finances: recordFinanceLedgerMutation(userClub.finances, {
          date: prev.currentDate,
          category: 'TRANSFERS_OUT',
          type: 'EXPENSE',
          amount: transferFee,
          description: `Contratação: ${player.name}${sellerClub ? ` (${sellerClub.shortName})` : ' (Livre)'}`,
          applyToBalance: true,
        }),
        squad: [...remainingUserSquad, signedPlayer],
      };

      const updatedClubs = prev.clubs.map((c) => {
        if (c.id === userClub.id) return updatedUserClub;
        if (fromClubId && c.id === fromClubId) {
          let baseSellerSquad = c.squad.filter((p) => p.id !== player.id);
          if (swapOutPlayer) {
            while (baseSellerSquad.length >= MAX_SQUAD_SIZE) {
              const cut = [...baseSellerSquad]
                .filter((p) => !p.isStarter && !p.isLoan)
                .sort((a, b) => a.overall - b.overall)[0];
              if (!cut) break;
              baseSellerSquad = baseSellerSquad.filter((p) => p.id !== cut.id);
            }
          }
          const sellerNextNum = Math.max(...baseSellerSquad.map((p) => p.squadNumber), 20) + 1;
          const swappedIncoming = swapOutPlayer
            ? [
                ...baseSellerSquad,
                {
                  ...swapOutPlayer,
                  isStarter: false,
                  isSubstitute: true,
                  isListedForSale: false,
                  isListedForLoan: false,
                  squadNumber: sellerNextNum,
                },
              ].slice(0, MAX_SQUAD_SIZE)
            : baseSellerSquad;
          return {
            ...c,
            finances: {
              ...c.finances,
              balance: c.finances.balance + transferFee,
              totalIncomeSeason: c.finances.totalIncomeSeason + transferFee,
            },
            squad: swappedIncoming,
          };
        }
        return c;
      });

      const updatedFreeAgents = prev.transferMarket.filter((p) => p.id !== player.id);

      const historyEntry: TransferHistoryRecord = {
        id: `tr_in_${Date.now()}_${player.id}`,
        playerId: player.id,
        playerName: player.name,
        playerRole: player.detailedRole,
        playerOverall: player.overall,
        playerAge: player.age,
        fromClubId: sellerClub?.id,
        fromClubName: sellerClub ? sellerClub.name : 'Sem Clube (Livre)',
        toClubId: userClub.id,
        toClubName: userClub.name,
        fee: transferFee,
        wage,
        date: prev.currentDate,
        round: prev.currentRound,
        seasonYear: activeSeasonYear,
        category: swapOutPlayer ? 'SWAP' : sellerClub ? 'PURCHASE' : 'FREE_AGENT',
        direction: 'IN',
        notes: swapOutPlayer
          ? `Troca c/ ${swapOutPlayer.name} · Contrato de ${yearsLabel}`
          : sellerClub
          ? `Transferência definitiva · Contrato de ${yearsLabel}`
          : `Sem custos · Contrato de ${yearsLabel}`,
      };

      const swapInbox: InboxMessage[] = swapOutPlayer && sellerClub
        ? [
            {
              id: `swap_deal_${Date.now()}_${player.id}`,
              title: `🔄 Negócio Fechado por Troca: ${player.name} por ${swapOutPlayer.name}`,
              message: `O ${userClub.name} acertou a contratação de ${player.name} (${player.detailedRole}, OVR ${player.overall}) por ${yearsLabel} junto ao ${sellerClub.name}, cedendo ${swapOutPlayer.name} (${swapOutPlayer.detailedRole}) na operação${transferFee > 0 ? ` mais R$ ${transferFee.toLocaleString('pt-BR')} em dinheiro` : ' sem custos extras em dinheiro'}.`,
              date: prev.currentDate,
              round: prev.currentRound,
              read: false,
              type: 'TRANSFER',
            },
          ]
        : [];

      const openClause =
        sellerClub && clausePkg
          ? buildTransferClauseRecord({
              player: signedPlayer,
              currentClub: updatedUserClub,
              counterpartyClub: sellerClub,
              direction: 'PAYABLE',
              pkg: clausePkg,
              currentDate: prev.currentDate,
            })
          : null;

      return {
        ...prev,
        clubs: updatedClubs,
        transferMarket: updatedFreeAgents,
        freeAgentBids: (prev.freeAgentBids || []).filter((b) => b.playerId !== player.id),
        transferClauses: openClause
          ? [openClause, ...(prev.transferClauses || [])]
          : prev.transferClauses || [],
        watchlist: removeWatchlistEntry(prev.watchlist, player.id),
        inbox: [...swapInbox, ...prev.inbox],
        transferHistory: [historyEntry, ...(prev.transferHistory || [])],
      };
    });

    return true;
  };

  // Loan In Player (borrow player from another club — 6 months / 19r or 1 year / 38r)
  const handleLoanInPlayer = (
    player: Player,
    fromClubId: string,
    durationRounds: number,
    wageSharePct: number,
    buyOptionFee?: number,
    loanFee: number = 0
  ): boolean => {
    const activeUserClub =
      gameState?.clubs.find((c) => c.id === gameState.userClubId) || userClub;
    const fromClubPreview = gameState?.clubs.find((c) => c.id === fromClubId);
    const loanCounts = gameState
      ? getClubSeasonLoanCounts({
          club: activeUserClub,
          transferHistory: gameState.transferHistory,
          currentSeasonYear: gameState.currentSeasonYear,
          saSeasonYear: gameState.saSeasonYear,
          europeSeasonYear: gameState.europeSeasonYear,
        })
      : null;
    const willingness = evaluatePlayerClubWillingness(activeUserClub, player, {
      dealType: 'LOAN',
      sellerClub: fromClubPreview,
    });

    if (
      !gameState ||
      !willingness.willing ||
      (loanCounts && loanCounts.loansInCount >= MAX_SEASON_LOANS_IN) ||
      !canClubRegisterNewPlayer(activeUserClub, gameState.pendingTransfers, false) ||
      findPendingTransferForPlayer(gameState.pendingTransfers, player.id)
    ) {
      return false;
    }

    const durationMonths = resolveLoanDurationMonths(durationRounds);
    const durationLabel =
      durationMonths === 6 ? '6 meses (19 rodadas)' : '1 ano (38 rodadas)';

    setGameState((prev) => {
      if (!prev) return null;
      const currentUserClub =
        prev.clubs.find((c) => c.id === prev.userClubId) || userClub;
      const fromClub = prev.clubs.find((c) => c.id === fromClubId);
      const activeSeasonYear = resolveClubActiveSeasonYear(currentUserClub, prev);
      const userEffectiveWage = Math.round(player.wage * (wageSharePct / 100));
      const winStatus = getTransferWindowStatus(prev.currentDate, currentUserClub);

      if (!winStatus.isOpen) {
        const updatedClubsClosed = prev.clubs.map((c) => {
          if (c.id === userClub.id) {
            return {
              ...c,
              finances: recordFinanceLedgerMutation(c.finances, {
                date: prev.currentDate,
                category: 'TRANSFERS_OUT',
                type: 'EXPENSE',
                amount: loanFee,
                description: `Taxa de empréstimo acertado: ${player.name} (${fromClub?.shortName || 'Parceiro'})`,
                applyToBalance: true,
              }),
            };
          }
          if (c.id === fromClubId) {
            return {
              ...c,
              finances: {
                ...c.finances,
                balance: c.finances.balance + loanFee,
                totalIncomeSeason: c.finances.totalIncomeSeason + loanFee,
              },
            };
          }
          return c;
        });

        const pendingLoan: PendingTransferDeal = {
          id: `ptr_loan_in_${Date.now()}_${player.id}`,
          dealKind: 'LOAN_IN',
          player: { ...player },
          playerId: player.id,
          playerName: player.name,
          playerRole: player.detailedRole,
          playerOverall: player.overall,
          playerAge: player.age,
          fromClubId,
          fromClubName: fromClub?.name || 'Clube Parceiro',
          toClubId: userClub.id,
          toClubName: userClub.name,
          fee: loanFee,
          offeredWage: userEffectiveWage,
          agreedDate: prev.currentDate,
          agreedRound: prev.currentRound,
          arrivalDate: winStatus.nextOpenDate,
          arrivalDisplayDate: winStatus.nextOpenDisplay,
          arrivalWindowLabel: winStatus.nextWindowLabel,
          loanDurationRounds: durationRounds,
          loanDurationMonths: durationMonths,
          loanWageSharePct: wageSharePct,
          loanBuyOptionFee: buyOptionFee,
        };

        const inboxMsgClosed: InboxMessage = {
          id: `loan_in_pending_${Date.now()}`,
          title: `🤝 Empréstimo Acertado: ${player.name} chega em ${winStatus.nextOpenDisplay}`,
          message: `O empréstimo de ${player.name} (${player.detailedRole}) por ${durationLabel} junto ao ${
            fromClub?.name || 'clube parceiro'
          } foi assinado (${wageSharePct}% do salário${
            buyOptionFee ? ` · opção fixada em R$ ${buyOptionFee.toLocaleString('pt-BR')}` : ''
          }). Como a janela está fechada, o atleta será integrado ao elenco do ${
            userClub.name
          } na abertura da janela em ${winStatus.nextOpenDisplay}!`,
          date: prev.currentDate,
          round: prev.currentRound,
          read: false,
          type: 'LOAN',
        };

        const historyEntryClosed: TransferHistoryRecord = {
          id: `tr_loan_in_${Date.now()}_${player.id}`,
          playerId: player.id,
          playerName: player.name,
          playerRole: player.detailedRole,
          playerOverall: player.overall,
          playerAge: player.age,
          fromClubId,
          fromClubName: fromClub?.name || 'Clube Parceiro',
          toClubId: userClub.id,
          toClubName: userClub.name,
          fee: loanFee,
          wage: userEffectiveWage,
          date: prev.currentDate,
          round: prev.currentRound,
          seasonYear: activeSeasonYear,
          category: 'LOAN_IN',
          direction: 'IN',
          notes: `${durationLabel}${
            buyOptionFee ? ` · Opção R$ ${buyOptionFee.toLocaleString('pt-BR')}` : ''
          } · Chega em ${winStatus.nextOpenDisplay}`,
        };

        return {
          ...prev,
          clubs: updatedClubsClosed,
          pendingTransfers: [pendingLoan, ...(prev.pendingTransfers || [])],
          watchlist: removeWatchlistEntry(prev.watchlist, player.id),
          inbox: [inboxMsgClosed, ...prev.inbox],
          transferHistory: [historyEntryClosed, ...(prev.transferHistory || [])],
        };
      }

      const newSquadNumber = Math.max(...userClub.squad.map((p) => p.squadNumber), 20) + 1;

      const loanedPlayer: Player = {
        ...player,
        wage: userEffectiveWage,
        loanOriginalWage: player.wage,
        isStarter: false,
        isSubstitute: true,
        squadNumber: newSquadNumber,
        isLoan: true,
        loanParentClubId: fromClubId,
        loanCurrentClubId: userClub.id,
        loanRoundsRemaining: durationRounds,
        loanDurationMonths: durationMonths,
        loanWageContributionPct: wageSharePct,
        loanBuyOptionFee: buyOptionFee,
        loanFeePaid: loanFee,
      };

      const updatedUserClub: Club = {
        ...userClub,
        finances: recordFinanceLedgerMutation(userClub.finances, {
          date: prev.currentDate,
          category: 'TRANSFERS_OUT',
          type: 'EXPENSE',
          amount: loanFee,
          description: `Taxa de empréstimo: ${player.name} (${fromClub?.shortName || 'Parceiro'})`,
          applyToBalance: true,
        }),
        squad: [...userClub.squad, loanedPlayer],
      };

      const updatedClubs = prev.clubs.map((c) => {
        if (c.id === userClub.id) return updatedUserClub;
        if (c.id === fromClubId) {
          return {
            ...c,
            finances: {
              ...c.finances,
              balance: c.finances.balance + loanFee,
              totalIncomeSeason: c.finances.totalIncomeSeason + loanFee,
            },
            squad: c.squad.filter((p) => p.id !== player.id),
          };
        }
        return c;
      });

      const inboxMsg: InboxMessage = {
        id: `loan_in_${Date.now()}`,
        title: `🤝 Empréstimo Confirmado: ${player.name} (${durationMonths === 6 ? '6 Meses' : '1 Ano'})`,
        message: `O atleta ${player.name} (${player.detailedRole}) foi integrado ao elenco do ${userClub.name} por empréstimo de ${durationLabel}, vindo do ${fromClub?.name || 'clube parceiro'}. Seu clube arcará com ${wageSharePct}% do salário (R$ ${userEffectiveWage.toLocaleString('pt-BR')}/mês)${buyOptionFee ? ` com opção de compra fixada em R$ ${buyOptionFee.toLocaleString('pt-BR')}` : ' sem opção de compra pré-fixada'}.`,
        date: prev.currentDate,
        round: prev.currentRound,
        read: false,
        type: 'LOAN',
      };

      const historyEntry: TransferHistoryRecord = {
        id: `tr_loan_in_${Date.now()}_${player.id}`,
        playerId: player.id,
        playerName: player.name,
        playerRole: player.detailedRole,
        playerOverall: player.overall,
        playerAge: player.age,
        fromClubId,
        fromClubName: fromClub?.name || 'Clube Parceiro',
        toClubId: userClub.id,
        toClubName: userClub.name,
        fee: loanFee,
        wage: userEffectiveWage,
        date: prev.currentDate,
        round: prev.currentRound,
        seasonYear: activeSeasonYear,
        category: 'LOAN_IN',
        direction: 'IN',
        notes: `${durationLabel} · ${wageSharePct}% salário${
          buyOptionFee ? ` · Opção R$ ${buyOptionFee.toLocaleString('pt-BR')}` : ''
        }`,
      };

      return {
        ...prev,
        clubs: updatedClubs,
        watchlist: removeWatchlistEntry(prev.watchlist, player.id),
        inbox: [inboxMsg, ...prev.inbox],
        transferHistory: [historyEntry, ...(prev.transferHistory || [])],
      };
    });
    return true;
  };

  // Loan Out Player (user loans out own reserve to partner club for 6 months or 1 year)
  const handleLoanOutPlayer = (
    playerId: string,
    toClubId: string,
    durationRounds: number,
    wageSharePct: number,
    buyOptionFee?: number,
    loanFeeReceived: number = 0
  ): boolean => {
    const activeUserClub =
      gameState?.clubs.find((c) => c.id === gameState.userClubId) || userClub;
    const loanCounts = gameState
      ? getClubSeasonLoanCounts({
          club: activeUserClub,
          transferHistory: gameState.transferHistory,
          currentSeasonYear: gameState.currentSeasonYear,
          saSeasonYear: gameState.saSeasonYear,
          europeSeasonYear: gameState.europeSeasonYear,
        })
      : null;

    if (
      !gameState ||
      (loanCounts && loanCounts.loansOutCount >= MAX_SEASON_LOANS_OUT) ||
      !activeUserClub.squad.some((p) => p.id === playerId) ||
      findPendingTransferForPlayer(gameState.pendingTransfers, playerId)
    ) {
      return false;
    }

    const durationMonths = resolveLoanDurationMonths(durationRounds);
    const durationLabel =
      durationMonths === 6 ? '6 meses (19 rodadas)' : '1 ano (38 rodadas)';

    setGameState((prev) => {
      if (!prev) return null;
      const currentUserClub =
        prev.clubs.find((c) => c.id === prev.userClubId) || userClub;
      const playerToLoan = currentUserClub.squad.find((p) => p.id === playerId);
      const toClub = prev.clubs.find((c) => c.id === toClubId);
      if (!playerToLoan || !toClub) return prev;

      const activeSeasonYear = resolveClubActiveSeasonYear(currentUserClub, prev);
      const winStatus = getTransferWindowStatus(prev.currentDate, currentUserClub);
      if (!winStatus.isOpen) {
        const updatedClubsClosed = prev.clubs.map((c) => {
          if (c.id === userClub.id) {
            return {
              ...c,
              finances: recordFinanceLedgerMutation(c.finances, {
                date: prev.currentDate,
                category: 'TRANSFERS_IN',
                type: 'INCOME',
                amount: loanFeeReceived,
                description: `Cessão por empréstimo agendado: ${playerToLoan.name} (${toClub.shortName})`,
                applyToBalance: true,
              }),
              squad: c.squad.map((p) =>
                p.id === playerId ? { ...p, isListedForLoan: false } : p
              ),
            };
          }
          if (c.id === toClubId) {
            return {
              ...c,
              finances: {
                ...c.finances,
                balance: Math.max(0, c.finances.balance - loanFeeReceived),
                totalExpensesSeason: c.finances.totalExpensesSeason + loanFeeReceived,
              },
            };
          }
          return c;
        });

        const pendingLoanOut: PendingTransferDeal = {
          id: `ptr_loan_out_${Date.now()}_${playerToLoan.id}`,
          dealKind: 'LOAN_OUT',
          player: { ...playerToLoan },
          playerId: playerToLoan.id,
          playerName: playerToLoan.name,
          playerRole: playerToLoan.detailedRole,
          playerOverall: playerToLoan.overall,
          playerAge: playerToLoan.age,
          fromClubId: userClub.id,
          fromClubName: userClub.name,
          toClubId: toClub.id,
          toClubName: toClub.name,
          fee: loanFeeReceived,
          offeredWage: Math.round(playerToLoan.wage * (wageSharePct / 100)),
          agreedDate: prev.currentDate,
          agreedRound: prev.currentRound,
          arrivalDate: winStatus.nextOpenDate,
          arrivalDisplayDate: winStatus.nextOpenDisplay,
          arrivalWindowLabel: winStatus.nextWindowLabel,
          loanDurationRounds: durationRounds,
          loanDurationMonths: durationMonths,
          loanWageSharePct: wageSharePct,
          loanBuyOptionFee: buyOptionFee,
        };

        const inboxClosed: InboxMessage = {
          id: `loan_out_pending_${Date.now()}`,
          title: `📤 Empréstimo Agendado: ${playerToLoan.name} vai em ${winStatus.nextOpenDisplay}`,
          message: `O acordo de empréstimo de ${playerToLoan.name} ao ${toClub.name} (${durationLabel}, ${wageSharePct}% salarial${
            buyOptionFee ? `, opção fixada em R$ ${buyOptionFee.toLocaleString('pt-BR')}` : ''
          }) foi fechado! Como a janela está fechada, o atleta permanece no elenco até se apresentar ao ${toClub.shortName} em ${winStatus.nextOpenDisplay}.`,
          date: prev.currentDate,
          round: prev.currentRound,
          read: false,
          type: 'LOAN',
        };

        const historyClosed: TransferHistoryRecord = {
          id: `tr_loan_out_${Date.now()}_${playerToLoan.id}`,
          playerId: playerToLoan.id,
          playerName: playerToLoan.name,
          playerRole: playerToLoan.detailedRole,
          playerOverall: playerToLoan.overall,
          playerAge: playerToLoan.age,
          fromClubId: userClub.id,
          fromClubName: userClub.name,
          toClubId: toClub.id,
          toClubName: toClub.name,
          fee: loanFeeReceived,
          wage: Math.round(playerToLoan.wage * (wageSharePct / 100)),
          date: prev.currentDate,
          round: prev.currentRound,
          seasonYear: activeSeasonYear,
          category: 'LOAN_OUT',
          direction: 'OUT',
          notes: `${durationLabel}${
            buyOptionFee ? ` · Opção R$ ${buyOptionFee.toLocaleString('pt-BR')}` : ''
          } · Segue em ${winStatus.nextOpenDisplay}`,
        };

        return {
          ...prev,
          clubs: updatedClubsClosed,
          pendingTransfers: [pendingLoanOut, ...(prev.pendingTransfers || [])],
          inbox: [inboxClosed, ...prev.inbox],
          transferHistory: [historyClosed, ...(prev.transferHistory || [])],
        };
      }

      const loanedPlayer: Player = {
        ...playerToLoan,
        wage: Math.max(1_000, Math.round(playerToLoan.wage * (wageSharePct / 100))),
        isStarter: false,
        isSubstitute: true,
        isLoan: true,
        loanParentClubId: currentUserClub.id,
        loanCurrentClubId: toClubId,
        loanRoundsRemaining: durationRounds,
        loanDurationMonths: durationMonths,
        loanWageContributionPct: wageSharePct,
        loanOriginalWage: playerToLoan.wage,
        loanBuyOptionFee: buyOptionFee,
        loanFeePaid: loanFeeReceived,
      };

      const updatedUserClub: Club = {
        ...currentUserClub,
        finances: recordFinanceLedgerMutation(currentUserClub.finances, {
          date: prev.currentDate,
          category: 'TRANSFERS_IN',
          type: 'INCOME',
          amount: loanFeeReceived,
          description: `Cessão por empréstimo: ${playerToLoan.name} (${toClub.shortName})`,
          applyToBalance: true,
        }),
        squad: currentUserClub.squad.filter((p) => p.id !== playerId),
      };

      let toClubBaseSquad = [...toClub.squad];
      while (toClubBaseSquad.length >= MAX_SQUAD_SIZE) {
        const cut = [...toClubBaseSquad]
          .filter((p) => !p.isStarter && !p.isLoan)
          .sort((a, b) => a.overall - b.overall)[0];
        if (!cut) break;
        toClubBaseSquad = toClubBaseSquad.filter((p) => p.id !== cut.id);
      }

      const updatedToClub: Club = {
        ...toClub,
        finances: {
          ...toClub.finances,
          balance: toClub.finances.balance - loanFeeReceived,
          totalExpensesSeason: toClub.finances.totalExpensesSeason + loanFeeReceived,
        },
        squad: [...toClubBaseSquad, loanedPlayer].slice(0, MAX_SQUAD_SIZE),
      };

      const updatedClubs = prev.clubs.map((c) => {
        if (c.id === userClub.id) return updatedUserClub;
        if (c.id === toClubId) return updatedToClub;
        return c;
      });

      const inboxMsg: InboxMessage = {
        id: `loan_out_${Date.now()}`,
        title: `📤 Empréstimo de Jogador: ${playerToLoan.name} (${durationMonths === 6 ? '6 Meses' : '1 Ano'})`,
        message: `O atleta ${playerToLoan.name} foi cedido por empréstimo ao ${toClub.name} por ${durationLabel}. O clube parceiro arcará com ${wageSharePct}% dos salários${
          buyOptionFee ? ` e possui opção de compra fixada em R$ ${buyOptionFee.toLocaleString('pt-BR')}` : ' sem opção de compra fixada'
        }.`,
        date: prev.currentDate,
        round: prev.currentRound,
        read: false,
        type: 'LOAN',
      };

      const historyEntry: TransferHistoryRecord = {
        id: `tr_loan_out_${Date.now()}_${playerToLoan.id}`,
        playerId: playerToLoan.id,
        playerName: playerToLoan.name,
        playerRole: playerToLoan.detailedRole,
        playerOverall: playerToLoan.overall,
        playerAge: playerToLoan.age,
        fromClubId: userClub.id,
        fromClubName: userClub.name,
        toClubId: toClub.id,
        toClubName: toClub.name,
        fee: loanFeeReceived,
        wage: Math.round(playerToLoan.wage * (wageSharePct / 100)),
        date: prev.currentDate,
        round: prev.currentRound,
        seasonYear: activeSeasonYear,
        category: 'LOAN_OUT',
        direction: 'OUT',
        notes: `${durationLabel} · Rival assume ${wageSharePct}%${
          buyOptionFee ? ` · Opção R$ ${buyOptionFee.toLocaleString('pt-BR')}` : ''
        }`,
      };

      return {
        ...prev,
        clubs: updatedClubs,
        inbox: [inboxMsg, ...prev.inbox],
        transferHistory: [historyEntry, ...(prev.transferHistory || [])],
      };
    });
    return true;
  };

  // Trigger Buy Option with user-selected contract duration (1..5 years) & optional wage negotiation
  const handleTriggerBuyOption = (
    player: Player,
    contractYears: number = 3,
    agreedWage?: number
  ): boolean => {
    if (!player.loanParentClubId) return false;
    let didSucceed = false;
    setGameState((prev) => {
      if (!prev) return null;
      const parentClub = prev.clubs.find((c) => c.id === player.loanParentClubId);
      if (!parentClub) return prev;

      const {
        updatedUserClub,
        updatedLendingClub,
        permanentWage,
        contractYears: safeYears,
        success,
        message,
      } = executeBuyOption(userClub, parentClub, player, contractYears, agreedWage);

      if (!success) {
        soundEngine.playWhistle(false);
        return prev;
      }

      didSucceed = true;
      soundEngine.playFanfare();
      confetti({ particleCount: 100, spread: 80 });

      const updatedClubs = prev.clubs.map((c) => {
        if (c.id === userClub.id) return updatedUserClub;
        if (c.id === parentClub.id) return updatedLendingClub;
        return c;
      });

      const inboxMsg: InboxMessage = {
        id: `buyout_${Date.now()}`,
        title: `💰 Opção de Compra Exercida: ${player.name} (${safeYears} ${safeYears === 1 ? 'ano' : 'anos'})`,
        message,
        date: prev.currentDate,
        round: prev.currentRound,
        read: false,
        type: 'TRANSFER',
      };

      const buyFee = player.loanBuyOptionFee || player.marketValue;
      const historyEntry: TransferHistoryRecord = {
        id: `tr_buyout_${Date.now()}_${player.id}`,
        playerId: player.id,
        playerName: player.name,
        playerRole: player.detailedRole,
        playerOverall: player.overall,
        playerAge: player.age,
        fromClubId: parentClub.id,
        fromClubName: parentClub.name,
        toClubId: userClub.id,
        toClubName: userClub.name,
        fee: buyFee,
        wage: permanentWage,
        date: prev.currentDate,
        round: prev.currentRound,
        seasonYear: prev.currentSeasonYear,
        category: 'BUY_OPTION',
        direction: 'IN',
        notes: `Opção de compra exercida · Contrato de ${safeYears} ${safeYears === 1 ? 'ano' : 'anos'}`,
      };

      return {
        ...prev,
        clubs: updatedClubs,
        inbox: [inboxMsg, ...prev.inbox],
        transferHistory: [historyEntry, ...(prev.transferHistory || [])],
      };
    });
    return didSucceed;
  };

  // Negotiate or fix a Buy Option Clause on an already loaned-in player
  const handleNegotiateLoanBuyOption = (
    playerId: string,
    proposedBuyOptionFee: number
  ): { accepted: boolean; message: string; suggestedFee?: number } => {
    const targetPlayer = userClub.squad.find((p) => p.id === playerId && p.isLoan);
    if (!targetPlayer || !targetPlayer.loanParentClubId || !gameState) {
      return {
        accepted: false,
        message: 'Atleta emprestado ou clube detentor não encontrado.',
      };
    }

    const parentClub = gameState.clubs.find((c) => c.id === targetPlayer.loanParentClubId);
    if (!parentClub) {
      return {
        accepted: false,
        message: 'Clube detentor dos direitos federativos não encontrado.',
      };
    }

    const evalRes = negotiateActiveLoanBuyOption(
      userClub,
      parentClub,
      targetPlayer,
      proposedBuyOptionFee
    );

    if (!evalRes.accepted || !evalRes.updatedPlayer) {
      return {
        accepted: false,
        message: evalRes.message,
        suggestedFee: evalRes.suggestedFee,
      };
    }

    const updatedLoanPlayer = evalRes.updatedPlayer;
    setGameState((prev) => {
      if (!prev) return null;
      const clauseInbox: InboxMessage = {
        id: `loan_clause_lock_${Date.now()}_${targetPlayer.id}`,
        title: `📝 Opção de Compra Fixada: ${targetPlayer.name}`,
        message: evalRes.message,
        date: prev.currentDate,
        round: prev.currentRound,
        read: false,
        type: 'LOAN',
      };
      return {
        ...prev,
        clubs: prev.clubs.map((c) =>
          c.id === userClub.id
            ? {
                ...c,
                squad: c.squad.map((p) =>
                  p.id === targetPlayer.id ? updatedLoanPlayer : p
                ),
              }
            : c
        ),
        inbox: [clauseInbox, ...prev.inbox],
      };
    });

    return {
      accepted: true,
      message: evalRes.message,
    };
  };

  // Terminate Loan Early
  const handleTerminateLoanEarly = (player: Player): boolean => {
    if (!player.loanParentClubId) return false;
    setGameState((prev) => {
      if (!prev) return null;
      const parentClub = prev.clubs.find((c) => c.id === player.loanParentClubId);
      if (!parentClub) return prev;

      const { updatedUserClub, updatedLendingClub } = terminateLoan(userClub, parentClub, player);

      const updatedClubs = prev.clubs.map((c) => {
        if (c.id === userClub.id) return updatedUserClub;
        if (c.id === parentClub.id) return updatedLendingClub;
        return c;
      });

      const inboxMsg: InboxMessage = {
        id: `loan_term_${Date.now()}`,
        title: `↩️ Devolução Antecipada: ${player.name}`,
        message: `O ${userClub.name} encerrou antecipadamente o contrato de empréstimo de ${player.name}. O atleta retornou ao ${parentClub.name}.`,
        date: prev.currentDate,
        round: prev.currentRound,
        read: false,
        type: 'LOAN',
      };

      return {
        ...prev,
        clubs: updatedClubs,
        inbox: [inboxMsg, ...prev.inbox],
      };
    });
    return true;
  };

  // Sell Player Directly to Buyer Club
  const handleSellPlayerToClub = (
    playerId: string,
    buyerClubId: string,
    salePrice: number,
    clausePkg?: ClausePackageInput
  ): boolean => {
    const preUserClub = gameState.clubs.find((c) => c.id === gameState.userClubId) || userClub;
    const prePlayer = preUserClub.squad.find((p) => p.id === playerId);
    const preBuyer = gameState.clubs.find((c) => c.id === buyerClubId);
    if (
      !prePlayer ||
      !preBuyer ||
      prePlayer.isLoan ||
      preUserClub.squad.length <= 16 ||
      findPendingTransferForPlayer(gameState.pendingTransfers, playerId)
    ) {
      return false;
    }

    setGameState((prev) => {
      if (!prev) return null;
      const liveUserClub = prev.clubs.find((c) => c.id === prev.userClubId) || userClub;
      const playerToSell = liveUserClub.squad.find((p) => p.id === playerId);
      const buyerClub = prev.clubs.find((c) => c.id === buyerClubId);
      if (!playerToSell || !buyerClub || playerToSell.isLoan || liveUserClub.squad.length <= 16) {
        return prev;
      }

      const formattedPrice = new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
        maximumFractionDigits: 0,
      }).format(salePrice);

      const formattedWage = new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
        maximumFractionDigits: 0,
      }).format(playerToSell.wage);

      const winStatus = getTransferWindowStatus(prev.currentDate, liveUserClub);
      if (!winStatus.isOpen) {
        const updatedClubsClosed = prev.clubs.map((c) => {
          if (c.id === liveUserClub.id) {
            return {
              ...c,
              finances: recordFinanceLedgerMutation(c.finances, {
                date: prev.currentDate,
                category: 'TRANSFERS_IN',
                type: 'INCOME',
                amount: salePrice,
                description: `Venda acertada: ${playerToSell.name} p/ ${buyerClub.shortName}`,
                applyToBalance: true,
              }),
              squad: c.squad.map((p) =>
                p.id === playerId
                  ? { ...p, isListedForSale: false, isListedForLoan: false }
                  : p
              ),
            };
          }
          if (c.id === buyerClub.id) {
            return {
              ...c,
              finances: {
                ...c.finances,
                balance: Math.max(0, c.finances.balance - salePrice),
                totalExpensesSeason: c.finances.totalExpensesSeason + salePrice,
              },
            };
          }
          return c;
        });

        const pendingSale: PendingTransferDeal = {
          id: `ptr_sale_out_${Date.now()}_${playerToSell.id}`,
          dealKind: 'SALE_OUT',
          player: { ...playerToSell },
          playerId: playerToSell.id,
          playerName: playerToSell.name,
          playerRole: playerToSell.detailedRole,
          playerOverall: playerToSell.overall,
          playerAge: playerToSell.age,
          fromClubId: liveUserClub.id,
          fromClubName: liveUserClub.name,
          toClubId: buyerClub.id,
          toClubName: buyerClub.name,
          fee: salePrice,
          offeredWage: playerToSell.wage,
          agreedDate: prev.currentDate,
          agreedRound: prev.currentRound,
          arrivalDate: winStatus.nextOpenDate,
          arrivalDisplayDate: winStatus.nextOpenDisplay,
          arrivalWindowLabel: winStatus.nextWindowLabel,
        };

        const inboxClosed: InboxMessage = {
          id: `sale_pending_${Date.now()}`,
          title: `💰 Venda Acertada: ${playerToSell.name} segue p/ o ${buyerClub.shortName} em ${winStatus.nextOpenDisplay}`,
          message: `Negócio fechado! O ${buyerClub.name} pagou ${formattedPrice} pela compra de ${playerToSell.name} (${playerToSell.detailedRole}, OVR ${playerToSell.overall}). O valor já entrou no caixa do ${liveUserClub.name} e o atleta se apresentará ao comprador na abertura da janela em ${winStatus.nextOpenDisplay}.`,
          date: prev.currentDate,
          round: prev.currentRound,
          read: false,
          type: 'TRANSFER',
        };

        const historyClosed: TransferHistoryRecord = {
          id: `tr_sale_${Date.now()}_${playerToSell.id}`,
          playerId: playerToSell.id,
          playerName: playerToSell.name,
          playerRole: playerToSell.detailedRole,
          playerOverall: playerToSell.overall,
          playerAge: playerToSell.age,
          fromClubId: liveUserClub.id,
          fromClubName: liveUserClub.name,
          toClubId: buyerClub.id,
          toClubName: buyerClub.name,
          fee: salePrice,
          wage: playerToSell.wage,
          date: prev.currentDate,
          round: prev.currentRound,
          seasonYear: prev.currentSeasonYear,
          category: 'SALE',
          direction: 'OUT',
          notes: `Venda fechada · Apresentação em ${winStatus.nextOpenDisplay}`,
        };

        const closedSaleClause = clausePkg
          ? buildTransferClauseRecord({
              player: playerToSell,
              currentClub: buyerClub,
              counterpartyClub: liveUserClub,
              direction: 'RECEIVABLE',
              pkg: clausePkg,
              currentDate: prev.currentDate,
            })
          : null;

        return {
          ...prev,
          clubs: updatedClubsClosed,
          pendingTransfers: [pendingSale, ...(prev.pendingTransfers || [])],
          transferClauses: closedSaleClause
            ? [closedSaleClause, ...(prev.transferClauses || [])]
            : prev.transferClauses || [],
          inbox: [inboxClosed, ...prev.inbox],
          transferHistory: [historyClosed, ...(prev.transferHistory || [])],
        };
      }

      // Remove player & auto-promote best reserve if starter was sold
      let nextUserSquad = liveUserClub.squad.filter((p) => p.id !== playerId);
      if (playerToSell.isStarter && nextUserSquad.filter((p) => p.isStarter).length < 11) {
        const replacement =
          nextUserSquad
            .filter((p) => !p.isStarter && p.detailedRole === playerToSell.detailedRole && p.injuryWeeks === 0)
            .sort((a, b) => b.overall - a.overall)[0] ||
          nextUserSquad
            .filter((p) => !p.isStarter && p.injuryWeeks === 0)
            .sort((a, b) => b.overall - a.overall)[0] ||
          nextUserSquad.filter((p) => !p.isStarter).sort((a, b) => b.overall - a.overall)[0];
        if (replacement) {
          nextUserSquad = nextUserSquad.map((p) =>
            p.id === replacement.id
              ? { ...p, isStarter: true, isSubstitute: false, pitchSlot: playerToSell.pitchSlot }
              : p
          );
        }
      }

      const updatedUserClub: Club = {
        ...liveUserClub,
        finances: recordFinanceLedgerMutation(liveUserClub.finances, {
          date: prev.currentDate,
          category: 'TRANSFERS_IN',
          type: 'INCOME',
          amount: salePrice,
          description: `Venda definitiva: ${playerToSell.name} p/ ${buyerClub.shortName}`,
          applyToBalance: true,
        }),
        squad: nextUserSquad,
      };

      // Trim lowest generic reserve on CPU buyer club if already at MAX_SQUAD_SIZE (30)
      let buyerBaseSquad = [...buyerClub.squad];
      while (buyerBaseSquad.length >= MAX_SQUAD_SIZE) {
        const cut = [...buyerBaseSquad]
          .filter((p) => !p.isStarter && !p.isLoan)
          .sort((a, b) => a.overall - b.overall)[0];
        if (!cut) break;
        buyerBaseSquad = buyerBaseSquad.filter((p) => p.id !== cut.id);
      }

      // Add player to buyer club with unlisted status
      const transferredPlayer: Player = {
        ...playerToSell,
        isStarter: false,
        isSubstitute: true,
        isListedForSale: false,
        isListedForLoan: false,
        squadNumber: Math.max(...buyerBaseSquad.map((p) => p.squadNumber), 20) + 1,
      };

      const updatedBuyerClub: Club = {
        ...buyerClub,
        finances: {
          ...buyerClub.finances,
          balance: Math.max(0, buyerClub.finances.balance - salePrice),
          totalExpensesSeason: buyerClub.finances.totalExpensesSeason + salePrice,
        },
        squad: [...buyerBaseSquad, transferredPlayer].slice(0, MAX_SQUAD_SIZE),
      };

      const updatedClubs = prev.clubs.map((c) => {
        if (c.id === liveUserClub.id) return updatedUserClub;
        if (c.id === buyerClub.id) return updatedBuyerClub;
        return c;
      });

      const inboxMsg: InboxMessage = {
        id: `sale_${Date.now()}`,
        title: `💰 Venda Concretizada: ${playerToSell.name}!`,
        message: `Excelente negociação! O atleta ${playerToSell.name} (${playerToSell.detailedRole}, Força ${playerToSell.overall}) foi vendido em definitivo ao ${buyerClub.name} pelo montante de ${formattedPrice}. O valor já foi integralmente creditado nos cofres do ${liveUserClub.name} e a folha salarial foi desonerada em ${formattedWage}/mês!`,
        date: prev.currentDate,
        round: prev.currentRound,
        read: false,
        type: 'TRANSFER',
      };

      const historyEntry: TransferHistoryRecord = {
        id: `tr_sale_${Date.now()}_${playerToSell.id}`,
        playerId: playerToSell.id,
        playerName: playerToSell.name,
        playerRole: playerToSell.detailedRole,
        playerOverall: playerToSell.overall,
        playerAge: playerToSell.age,
        fromClubId: liveUserClub.id,
        fromClubName: liveUserClub.name,
        toClubId: buyerClub.id,
        toClubName: buyerClub.name,
        fee: salePrice,
        wage: playerToSell.wage,
        date: prev.currentDate,
        round: prev.currentRound,
        seasonYear: prev.currentSeasonYear,
        category: 'SALE',
        direction: 'OUT',
        notes: 'Venda em definitivo',
      };

      const openSaleClause = clausePkg
        ? buildTransferClauseRecord({
            player: transferredPlayer,
            currentClub: updatedBuyerClub,
            counterpartyClub: updatedUserClub,
            direction: 'RECEIVABLE',
            pkg: clausePkg,
            currentDate: prev.currentDate,
          })
        : null;

      return {
        ...prev,
        clubs: updatedClubs,
        transferClauses: openSaleClause
          ? [openSaleClause, ...(prev.transferClauses || [])]
          : prev.transferClauses || [],
        inbox: [inboxMsg, ...prev.inbox],
        transferHistory: [historyEntry, ...(prev.transferHistory || [])],
      };
    });
    return true;
  };

  // Settle / Buyout an Active Sell-On Clause for Immediate Cash
  const handleBuyoutTransferClause = (
    clauseId: string
  ): { success: boolean; message: string } => {
    if (!gameState) return { success: false, message: 'Carreira não iniciada.' };
    const clause = (gameState.transferClauses || []).find((c) => c.id === clauseId);
    if (!clause || clause.settledSellOn || clause.sellOnPercentage <= 0) {
      return { success: false, message: 'Cláusula de mais-valia não encontrada ou já liquidada.' };
    }

    let liveMarketVal = 2_000_000;
    for (const c of gameState.clubs) {
      const p = c.squad.find((pl) => pl.id === clause.playerId);
      if (p) {
        liveMarketVal = p.marketValue;
        break;
      }
    }

    const buyoutAmount = computeSellOnClauseBuyoutPrice(clause, liveMarketVal);
    if (clause.direction === 'PAYABLE' && userClub.finances.balance < buyoutAmount) {
      return {
        success: false,
        message: 'Saldo em caixa insuficiente para recomprar este percentual agora.',
      };
    }

    const fmtVal = new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      maximumFractionDigits: 0,
    }).format(buyoutAmount);

    soundEngine.playClick();
    setGameState((prev) => {
      if (!prev) return null;
      const updatedClauses = (prev.transferClauses || [])
        .map((cl) => (cl.id === clauseId ? { ...cl, settledSellOn: true } : cl))
        .filter((cl) => {
          const sellOnDone = cl.sellOnPercentage <= 0 || Boolean(cl.settledSellOn);
          const goalsDone = !cl.goalBonusAmount || Boolean(cl.goalBonusPaid);
          const appsDone = !cl.appearancesBonusAmount || Boolean(cl.appearancesBonusPaid);
          return !(sellOnDone && goalsDone && appsDone);
        });

      const delta = clause.direction === 'RECEIVABLE' ? buyoutAmount : -buyoutAmount;
      const updatedClubs = prev.clubs.map((c) => {
        if (c.id !== prev.userClubId) return c;
        return {
          ...c,
          finances: recordFinanceLedgerMutation(c.finances, {
            date: prev.currentDate,
            category: delta >= 0 ? 'TRANSFERS_IN' : 'TRANSFERS_OUT',
            type: delta >= 0 ? 'INCOME' : 'EXPENSE',
            amount: buyoutAmount,
            description:
              delta >= 0
                ? `Antecipação de mais-valia: ${clause.playerName}`
                : `Recompra de direitos: ${clause.playerName}`,
            applyToBalance: true,
          }),
        };
      });

      const msg: InboxMessage = {
        id: `clause_buyout_${Date.now()}_${clauseId}`,
        title:
          clause.direction === 'RECEIVABLE'
            ? `💰 Mais-Valia Vendida à Vista: ${clause.playerName} (${fmtVal})`
            : `📄 Mais-Valia Quitada: 100% dos Direitos de ${clause.playerName}`,
        message:
          clause.direction === 'RECEIVABLE'
            ? `Seu clube negociou antecipadamente os ${clause.sellOnPercentage}% de venda futura de ${clause.playerName} junto ao ${clause.currentClubName}, recebendo ${fmtVal} à vista no caixa!`
            : `Seu clube adquiriu os ${clause.sellOnPercentage}% restantes dos direitos econômicos de ${clause.playerName} junto ao ${clause.counterpartyClubName} por ${fmtVal}.`,
        date: prev.currentDate,
        round: prev.currentRound,
        read: false,
        type: 'FINANCE',
      };

      return {
        ...prev,
        clubs: updatedClubs,
        transferClauses: updatedClauses,
        inbox: [msg, ...prev.inbox],
      };
    });

    return {
      success: true,
      message:
        clause.direction === 'RECEIVABLE'
          ? `Mais-valia negociada! ${fmtVal} creditados imediatamente no caixa.`
          : `Percentual adquirido por ${fmtVal}! Agora 100% dos direitos pertencem ao seu clube.`,
    };
  };

  // Schedule Pre-Season / Mid-Season Commercial Tour or Friendly
  const handleScheduleFriendlyTour = (
    pkgId: FriendlyPackageId
  ): { success: boolean; message: string } => {
    if (!gameState) return { success: false, message: 'Carreira não iniciada.' };
    const packages = getFriendlyPackagesForClub(userClub);
    const chosen = packages.find((p) => p.id === pkgId);
    if (!chosen) return { success: false, message: 'Pacote de excursão inválido.' };

    const res = scheduleFriendlyTourFixtures({
      pkg: chosen,
      userClub,
      allClubs: clubsWithWorldGuests,
      allFixtures: allCompetitionsFixtures,
      currentDate: gameState.currentDate,
      currentRound: gameState.currentRound,
    });

    if (!res.success) {
      return {
        success: false,
        message: res.errorMessage || 'Não foi possível agendar os amistosos.',
      };
    }

    soundEngine.playClick();
    setGameState((prev) => {
      if (!prev) return null;
      return resolveCrossCompetitionScheduleConflicts({
        ...prev,
        fixturesFriendlies: [...(prev.fixturesFriendlies || []), ...res.createdFixtures],
        inbox: res.inboxMessage ? [res.inboxMessage, ...prev.inbox] : prev.inbox,
      });
    });

    return {
      success: true,
      message: `${chosen.title} agendado com sucesso! Confira as datas marcadas no calendário.`,
    };
  };

  // List Player For Sale
  const handleListPlayerForSale = (playerId: string, askingPrice?: number) => {
    setGameState((prev) => {
      if (!prev) return null;
      const updatedClubs = prev.clubs.map((c) => {
        if (c.id === userClub.id) {
          return {
            ...c,
            squad: c.squad.map((p) =>
              p.id === playerId
                ? { ...p, isListedForSale: true, askingPrice: askingPrice || p.marketValue }
                : p
            ),
          };
        }
        return c;
      });
      return { ...prev, clubs: updatedClubs };
    });
  };

  // Delist Player From Sale
  const handleDelistPlayerForSale = (playerId: string) => {
    setGameState((prev) => {
      if (!prev) return null;
      const updatedClubs = prev.clubs.map((c) => {
        if (c.id === userClub.id) {
          return {
            ...c,
            squad: c.squad.map((p) =>
              p.id === playerId ? { ...p, isListedForSale: false, askingPrice: undefined } : p
            ),
          };
        }
        return c;
      });
      return { ...prev, clubs: updatedClubs };
    });
  };

  // Toggle Player For Loan
  const handleTogglePlayerForLoan = (playerId: string, list: boolean) => {
    setGameState((prev) => {
      if (!prev) return null;
      const updatedClubs = prev.clubs.map((c) => {
        if (c.id === userClub.id) {
          return {
            ...c,
            squad: c.squad.map((p) =>
              p.id === playerId ? { ...p, isListedForLoan: list } : p
            ),
          };
        }
        return c;
      });
      return { ...prev, clubs: updatedClubs };
    });
  };

  // Youth Academy & Peneiras Handlers (up to 10 boys in club youth academy)
  const handleRunYouthTryout = (params: {
    tier: YouthTryoutTier;
    roleFocus: DetailedRole | 'ALL';
    ageGroup: YouthAgeGroupFilter;
  }): {
    success: boolean;
    errorMessage?: string;
    candidatesCount?: number;
  } => {
    if (!gameState) {
      return { success: false, errorMessage: 'Jogo não carregado.' };
    }

    const res = runClubYouthTryout({
      club: userClub,
      tier: params.tier,
      roleFocus: params.roleFocus,
      ageGroup: params.ageGroup,
      currentDate: gameState.currentDate,
      currentRound: gameState.currentRound,
    });

    if (!res.success) {
      return { success: false, errorMessage: res.errorMessage };
    }

    setGameState((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        clubs: prev.clubs.map((c) => (c.id === userClub.id ? res.updatedClub : c)),
        inbox: res.inboxMessage ? [res.inboxMessage, ...prev.inbox] : prev.inbox,
      };
    });

    return {
      success: true,
      candidatesCount: res.candidates.length,
    };
  };

  const handleRecruitYouthCandidate = (
    candidateId: string
  ): {
    success: boolean;
    errorMessage?: string;
    boyName?: string;
  } => {
    if (!gameState) {
      return { success: false, errorMessage: 'Jogo não carregado.' };
    }

    const res = recruitCandidateToAcademy(userClub, candidateId, gameState.currentDate);
    if (!res.success) {
      return { success: false, errorMessage: res.errorMessage };
    }

    setGameState((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        clubs: prev.clubs.map((c) => (c.id === userClub.id ? res.updatedClub : c)),
      };
    });

    return {
      success: true,
      boyName: res.recruitedBoy?.player.name,
    };
  };

  const handleDismissYouthCandidate = (candidateId: string) => {
    setGameState((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        clubs: prev.clubs.map((c) =>
          c.id === userClub.id ? dismissTryoutCandidateFromList(c, candidateId) : c
        ),
      };
    });
  };

  const handlePromoteYouthBoy = (
    boyId: string
  ): {
    success: boolean;
    errorMessage?: string;
    playerName?: string;
  } => {
    if (!gameState) {
      return { success: false, errorMessage: 'Jogo não carregado.' };
    }

    const res = promoteBoyToSeniorSquad(
      userClub,
      boyId,
      gameState.currentDate,
      gameState.currentRound
    );

    if (!res.success) {
      return { success: false, errorMessage: res.errorMessage };
    }

    setGameState((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        clubs: prev.clubs.map((c) => (c.id === userClub.id ? res.updatedClub : c)),
        inbox: res.inboxMessage ? [res.inboxMessage, ...prev.inbox] : prev.inbox,
      };
    });

    return {
      success: true,
      playerName: res.promotedPlayer?.name,
    };
  };

  const handleReleaseYouthBoy = (boyId: string) => {
    setGameState((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        clubs: prev.clubs.map((c) =>
          c.id === userClub.id ? releaseBoyFromYouthAcademy(c, boyId) : c
        ),
      };
    });
  };

  const handleUpdateYouthTrainingPlan = (params: {
    trainingFocus?: YouthTrainingFocus;
    trainingIntensity?: YouthTrainingIntensity;
  }) => {
    setGameState((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        clubs: prev.clubs.map((c) =>
          c.id === userClub.id
            ? updateYouthAcademyTrainingPlan(c, params, prev.currentDate)
            : c
        ),
      };
    });
  };

  const handleSetYouthBoyFocus = (
    boyId: string,
    focus: YouthTrainingFocus | 'PADRAO'
  ) => {
    setGameState((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        clubs: prev.clubs.map((c) =>
          c.id === userClub.id
            ? setYouthBoyIndividualFocus(c, boyId, focus, prev.currentDate)
            : c
        ),
      };
    });
  };

  const handleRunYouthTrainingSession = (): {
    success: boolean;
    errorMessage?: string;
    evolvedBoys?: Array<{ name: string; role: DetailedRole; newOvr: number; delta: number }>;
    trainedCount?: number;
  } => {
    if (!gameState) {
      return { success: false, errorMessage: 'Jogo não carregado.' };
    }

    const res = runYouthAcademyTrainingSession(
      userClub,
      gameState.currentDate,
      gameState.currentRound
    );

    if (!res.success) {
      return { success: false, errorMessage: res.errorMessage };
    }

    setGameState((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        clubs: prev.clubs.map((c) => (c.id === userClub.id ? res.updatedClub : c)),
        inbox:
          res.inboxMessages.length > 0
            ? [...res.inboxMessages, ...prev.inbox]
            : prev.inbox,
      };
    });

    return {
      success: true,
      evolvedBoys: res.evolvedBoys,
      trainedCount: res.trainedCount,
    };
  };

  const handleUpgradeYouthAcademy = (): {
    success: boolean;
    errorMessage?: string;
    newLevel?: number;
  } => {
    if (!gameState) {
      return { success: false, errorMessage: 'Jogo não carregado.' };
    }

    const currentLevel = Math.max(1, Math.min(5, userClub.finances.youthAcademyLevel || 1));
    if (currentLevel >= 5) {
      return { success: false, errorMessage: 'O CT da Base já atingiu o nível máximo (5/5).' };
    }

    const cost = getYouthUpgradeCost(currentLevel, userClub);
    if (userClub.finances.balance < cost) {
      return {
        success: false,
        errorMessage: `Saldo insuficiente em caixa (necessário R$ ${cost.toLocaleString('pt-BR')}).`,
      };
    }

    const nextLevel = currentLevel + 1;
    setGameState((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        clubs: prev.clubs.map((c) =>
          c.id === userClub.id
            ? {
                ...c,
                finances: recordFinanceLedgerMutation(
                  {
                    ...c.finances,
                    youthAcademyLevel: nextLevel,
                  },
                  {
                    date: prev.currentDate,
                    category: 'INFRASTRUCTURE',
                    type: 'EXPENSE',
                    amount: cost,
                    description: `Upgrade Categorias de Base (Nível ${nextLevel}/5)`,
                    applyToBalance: true,
                  }
                ),
              }
            : c
        ),
      };
    });

    return { success: true, newLevel: nextLevel };
  };

  // Mark inbox read
  const handleMarkInboxRead = (id: string) => {
    setGameState((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        inbox: prev.inbox.map((m) => (m.id === id ? { ...m, read: true } : m)),
      };
    });
  };

  // Mark all inbox messages as read
  const handleMarkAllInboxRead = () => {
    soundEngine.playClick();
    setGameState((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        inbox: prev.inbox.map((m) => ({ ...m, read: true })),
      };
    });
  };

  // Sign or replace a sponsor in one of the 4 sponsorship slots
  const handleSignSponsor = (
    option: SponsorOption
  ): { success: boolean; errorMessage?: string } => {
    if (!gameState) {
      return { success: false, errorMessage: 'Jogo não carregado.' };
    }

    const result = signSponsorContract(
      userClub,
      option,
      gameState.currentRound,
      gameState.currentDate
    );

    if (!result.success) {
      return { success: false, errorMessage: result.errorMessage };
    }

    setGameState((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        clubs: prev.clubs.map((c) => (c.id === userClub.id ? result.updatedClub : c)),
        inbox: result.inboxMessage ? [result.inboxMessage, ...prev.inbox] : prev.inbox,
      };
    });

    return { success: true };
  };

  // Terminate an active sponsor contract in one of the 4 slots
  const handleTerminateSponsor = (
    slot: SponsorSlotType
  ): { success: boolean; errorMessage?: string } => {
    if (!gameState) {
      return { success: false, errorMessage: 'Jogo não carregado.' };
    }

    const result = terminateSponsorSlot(
      userClub,
      slot,
      gameState.currentRound,
      gameState.currentDate
    );

    if (!result.success) {
      return { success: false, errorMessage: result.errorMessage };
    }

    setGameState((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        clubs: prev.clubs.map((c) => (c.id === userClub.id ? result.updatedClub : c)),
        inbox: result.inboxMessage ? [result.inboxMessage, ...prev.inbox] : prev.inbox,
      };
    });

    return { success: true };
  };

  // Dispatch a Scout to a Region or Country
  const handleDispatchScoutMission = (params: {
    scoutId: string;
    regionId: string;
    roleFocus: DetailedRole | 'ALL';
    ageFocus: ScoutAgeFocus;
    depth: ScoutMissionDepth;
  }): {
    success: boolean;
    errorMessage?: string;
    immediateCount?: number;
    missionId?: string;
  } => {
    if (!gameState) {
      return { success: false, errorMessage: 'Jogo não carregado.' };
    }

    const currentNetwork =
      gameState.scoutingNetwork || createInitialScoutingNetwork(userClub);

    const res = dispatchScoutMission({
      network: currentNetwork,
      club: userClub,
      scoutId: params.scoutId,
      regionId: params.regionId,
      roleFocus: params.roleFocus,
      ageFocus: params.ageFocus,
      depth: params.depth,
      currentDate: gameState.currentDate,
      currentRound: gameState.currentRound,
    });

    if (!res.success) {
      return { success: false, errorMessage: res.errorMessage };
    }

    setGameState((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        clubs: prev.clubs.map((c) => (c.id === userClub.id ? res.updatedClub : c)),
        scoutingNetwork: res.updatedNetwork,
        inbox: res.inboxMessage ? [res.inboxMessage, ...prev.inbox] : prev.inbox,
      };
    });

    return {
      success: true,
      immediateCount: res.immediateProspects?.length,
      missionId: res.mission?.id,
    };
  };

  const handleToggleShortlistProspect = (prospectId: string) => {
    setGameState((prev) => {
      if (!prev || !prev.scoutingNetwork) return prev;
      return {
        ...prev,
        scoutingNetwork: {
          ...prev.scoutingNetwork,
          prospects: prev.scoutingNetwork.prospects.map((p) =>
            p.id === prospectId ? { ...p, isShortlisted: !p.isShortlisted } : p
          ),
        },
      };
    });
  };

  const handleDismissProspect = (prospectId: string) => {
    setGameState((prev) => {
      if (!prev || !prev.scoutingNetwork) return prev;
      return {
        ...prev,
        scoutingNetwork: {
          ...prev.scoutingNetwork,
          prospects: prev.scoutingNetwork.prospects.map((p) =>
            p.id === prospectId ? { ...p, isDismissed: true, isShortlisted: false } : p
          ),
        },
      };
    });
  };

  const handleSignScoutedProspect = (
    prospect: ScoutedProspect,
    transferFee: number,
    wage: number,
    contractYears: number = 3
  ): boolean => {
    const safeYears = Math.max(1, Math.min(5, Math.round(contractYears || 3)));
    const yearsLabel = `${safeYears} ${safeYears === 1 ? 'ano' : 'anos'}`;
    const activeUserClub =
      gameState?.clubs.find((c) => c.id === gameState.userClubId) || userClub;
    const willingness = evaluatePlayerClubWillingness(activeUserClub, prospect.player, {
      dealType: 'SCOUT',
    });
    if (
      !gameState ||
      !willingness.willing ||
      !canClubRegisterNewPlayer(activeUserClub, gameState.pendingTransfers, false) ||
      activeUserClub.finances.balance < transferFee ||
      findPendingTransferForPlayer(gameState.pendingTransfers, prospect.player.id)
    ) {
      return false;
    }

    setGameState((prev) => {
      if (!prev) return null;

      const currentUserClub =
        prev.clubs.find((c) => c.id === prev.userClubId) || userClub;
      const prevNet = prev.scoutingNetwork || createInitialScoutingNetwork(currentUserClub);
      const winStatus = getTransferWindowStatus(prev.currentDate, currentUserClub);
      const activeSeasonYear = resolveClubActiveSeasonYear(currentUserClub, prev);

      if (!winStatus.isOpen) {
        const updatedUserClubClosed: Club = {
          ...currentUserClub,
          finances: recordFinanceLedgerMutation(currentUserClub.finances, {
            date: prev.currentDate,
            category: 'TRANSFERS_OUT',
            type: 'EXPENSE',
            amount: transferFee,
            description: `Contratação via olheiros (agendada): ${prospect.player.name}`,
            applyToBalance: true,
          }),
        };

        const pendingScoutDeal: PendingTransferDeal = {
          id: `ptr_scout_${Date.now()}_${prospect.player.id}`,
          dealKind: 'SCOUT_SIGNING',
          player: { ...prospect.player },
          playerId: prospect.player.id,
          playerName: prospect.player.name,
          playerRole: prospect.player.detailedRole,
          playerOverall: prospect.player.overall,
          playerAge: prospect.player.age,
          fromClubName: `${prospect.originClubName} (${prospect.country})`,
          toClubId: currentUserClub.id,
          toClubName: currentUserClub.name,
          fee: transferFee,
          offeredWage: wage,
          offeredContractYears: safeYears,
          agreedDate: prev.currentDate,
          agreedRound: prev.currentRound,
          arrivalDate: winStatus.nextOpenDate,
          arrivalDisplayDate: winStatus.nextOpenDisplay,
          arrivalWindowLabel: winStatus.nextWindowLabel,
          scoutProspectId: prospect.id,
          scoutRegionName: prospect.regionName,
        };

        const historyClosed: TransferHistoryRecord = {
          id: `tr_scout_${Date.now()}_${prospect.player.id}`,
          playerId: prospect.player.id,
          playerName: prospect.player.name,
          playerRole: prospect.player.detailedRole,
          playerOverall: prospect.player.overall,
          playerAge: prospect.player.age,
          fromClubName: `${prospect.originClubName} (${prospect.country})`,
          toClubId: currentUserClub.id,
          toClubName: currentUserClub.name,
          fee: transferFee,
          wage,
          date: prev.currentDate,
          round: prev.currentRound,
          seasonYear: activeSeasonYear,
          category: 'PURCHASE',
          direction: 'IN',
          notes: `Rede de Olheiros · Contrato de ${yearsLabel} · Chega em ${winStatus.nextOpenDisplay}`,
        };

        const inboxClosed: InboxMessage = {
          id: `scout_sign_pending_${Date.now()}`,
          title: `✍️ Joia Mapeada Contratada: ${prospect.player.name} chega em ${winStatus.nextOpenDisplay}`,
          message: `O ${currentUserClub.name} fechou a contratação de ${prospect.player.name} (${prospect.player.detailedRole}, ${prospect.player.age} anos), mapeado em ${prospect.regionName} (${prospect.originClubName}), por R$ ${transferFee.toLocaleString('pt-BR')} (contrato de ${yearsLabel}). Como a janela está fechada, o reforço se apresentará ao elenco em ${winStatus.nextOpenDisplay}!`,
          date: prev.currentDate,
          round: prev.currentRound,
          read: false,
          type: 'TRANSFER',
        };

        return {
          ...prev,
          clubs: prev.clubs.map((c) => (c.id === currentUserClub.id ? updatedUserClubClosed : c)),
          pendingTransfers: [pendingScoutDeal, ...(prev.pendingTransfers || [])],
          transferHistory: [historyClosed, ...(prev.transferHistory || [])],
          inbox: [inboxClosed, ...prev.inbox],
          scoutingNetwork: {
            ...prevNet,
            prospects: prevNet.prospects.map((p) =>
              p.id === prospect.id ? { ...p, isSigned: true } : p
            ),
          },
        };
      }

      const newSquadNumber =
        Math.max(...currentUserClub.squad.map((p) => p.squadNumber), 20) + 1;

      const signedPlayer: Player = ensurePlayerContractFields({
        ...prospect.player,
        wage,
        contractYears: safeYears,
        releaseClause: computeDefaultReleaseClause(
          { ...prospect.player, contractYears: safeYears },
          currentUserClub
        ),
        isStarter: false,
        isSubstitute: true,
        isListedForSale: false,
        isListedForLoan: false,
        squadNumber: newSquadNumber,
      });

      const updatedUserClub: Club = {
        ...currentUserClub,
        finances: recordFinanceLedgerMutation(currentUserClub.finances, {
          date: prev.currentDate,
          category: 'TRANSFERS_OUT',
          type: 'EXPENSE',
          amount: transferFee,
          description: `Contratação via olheiros: ${signedPlayer.name}`,
          applyToBalance: true,
        }),
        squad: [...currentUserClub.squad, signedPlayer],
      };

      const historyEntry: TransferHistoryRecord = {
        id: `tr_scout_${Date.now()}_${signedPlayer.id}`,
        playerId: signedPlayer.id,
        playerName: signedPlayer.name,
        playerRole: signedPlayer.detailedRole,
        playerOverall: signedPlayer.overall,
        playerAge: signedPlayer.age,
        fromClubName: `${prospect.originClubName} (${prospect.country})`,
        toClubId: currentUserClub.id,
        toClubName: currentUserClub.name,
        fee: transferFee,
        wage,
        date: prev.currentDate,
        round: prev.currentRound,
        seasonYear: activeSeasonYear,
        category: 'PURCHASE',
        direction: 'IN',
        notes: `Rede de Olheiros (${prospect.regionName}) · Contrato de ${yearsLabel}`,
      };

      const inboxMsg: InboxMessage = {
        id: `scout_sign_${Date.now()}`,
        title: `Reforço da Rede de Olheiros: ${signedPlayer.name}`,
        message: `O atleta ${signedPlayer.name} (${signedPlayer.detailedRole}, ${signedPlayer.age} anos), mapeado em ${prospect.regionName} (${prospect.country}) no ${prospect.originClubName}, assinou contrato de ${yearsLabel} com o ${currentUserClub.name} por R$ ${transferFee.toLocaleString('pt-BR')}!`,
        date: prev.currentDate,
        round: prev.currentRound,
        read: false,
        type: 'TRANSFER',
      };

      return {
        ...prev,
        clubs: prev.clubs.map((c) => (c.id === currentUserClub.id ? updatedUserClub : c)),
        transferHistory: [historyEntry, ...(prev.transferHistory || [])],
        inbox: [inboxMsg, ...prev.inbox],
        scoutingNetwork: {
          ...prevNet,
          prospects: prevNet.prospects.map((p) =>
            p.id === prospect.id ? { ...p, isSigned: true } : p
          ),
        },
      };
    });

    return true;
  };

  const handleUpgradeScout = (scoutId: string): { success: boolean; errorMessage?: string } => {
    if (!gameState || !gameState.scoutingNetwork) {
      return { success: false, errorMessage: 'Rede de olheiros indisponível.' };
    }

    const scout = gameState.scoutingNetwork.scouts.find((s) => s.id === scoutId);
    if (!scout || scout.stars >= 5) {
      return { success: false, errorMessage: 'Este olheiro já atingiu o nível máximo.' };
    }

    const cost = getUpgradeScoutCost(scout, userClub);
    if (userClub.finances.balance < cost) {
      return {
        success: false,
        errorMessage: `Saldo insuficiente. Custo do aprimoramento: R$ ${cost.toLocaleString('pt-BR')}.`,
      };
    }

    setGameState((prev) => {
      if (!prev || !prev.scoutingNetwork) return prev;
      return {
        ...prev,
        clubs: prev.clubs.map((c) =>
          c.id === userClub.id
            ? {
                ...c,
                finances: recordFinanceLedgerMutation(c.finances, {
                  date: prev.currentDate,
                  category: 'STAFF_SCOUTS',
                  type: 'EXPENSE',
                  amount: cost,
                  description: `Aprimoramento de Olheiro: ${scout.name} (${scout.stars + 1}★)`,
                  applyToBalance: true,
                }),
              }
            : c
        ),
        scoutingNetwork: {
          ...prev.scoutingNetwork,
          scouts: prev.scoutingNetwork.scouts.map((s) =>
            s.id === scoutId ? { ...s, stars: Math.min(5, s.stars + 1) } : s
          ),
        },
      };
    });

    return { success: true };
  };

  const handleHireFourthScout = (
    specialty: ScoutRegionCategory
  ): { success: boolean; errorMessage?: string } => {
    if (!gameState || !gameState.scoutingNetwork) {
      return { success: false, errorMessage: 'Rede de olheiros indisponível.' };
    }

    if (gameState.scoutingNetwork.scouts.length >= 4) {
      return { success: false, errorMessage: 'Sua equipe já possui o limite de 4 olheiros.' };
    }

    const cost = getHireFourthScoutCost(userClub);
    if (userClub.finances.balance < cost) {
      return {
        success: false,
        errorMessage: `Saldo insuficiente em caixa (necessário R$ ${cost.toLocaleString('pt-BR')}).`,
      };
    }

    const candidateBySpecialty: Record<
      ScoutRegionCategory,
      { name: string; nationality: string; label: string }
    > = {
      BRASIL: {
        name: 'Cláudio Albuquerque',
        nationality: 'Brasil',
        label: 'Especialista em Regiões do Brasil',
      },
      AMERICA_SUL: {
        name: 'Esteban Domínguez',
        nationality: 'Argentina',
        label: 'Especialista em Mercado Sul-Americano',
      },
      INTERNACIONAL: {
        name: 'Moussa Koulibaly',
        nationality: 'Senegal',
        label: 'Observador Internacional & África/Europa',
      },
    };

    const meta = candidateBySpecialty[specialty];
    const stars = Math.max(3, Math.min(4, userClub.reputation));

    setGameState((prev) => {
      if (!prev || !prev.scoutingNetwork) return prev;
      return {
        ...prev,
        clubs: prev.clubs.map((c) =>
          c.id === userClub.id
            ? {
                ...c,
                finances: recordFinanceLedgerMutation(c.finances, {
                  date: prev.currentDate,
                  category: 'STAFF_SCOUTS',
                  type: 'EXPENSE',
                  amount: cost,
                  description: `Contratação de 4º Olheiro: ${meta.name}`,
                  applyToBalance: true,
                }),
              }
            : c
        ),
        scoutingNetwork: {
          ...prev.scoutingNetwork,
          scouts: [
            ...prev.scoutingNetwork.scouts,
            {
              id: `scout_4th_${Date.now()}`,
              name: meta.name,
              nationality: meta.nationality,
              specialtyRegion: specialty,
              specialtyLabel: meta.label,
              stars,
              weeklySalary: getFourthScoutWeeklySalary(userClub, stars),
            },
          ],
        },
      };
    });

    return { success: true };
  };

  // Finish Round Execution
  const handleFinishRound = (
    userFixture: Fixture,
    allRoundFixtures: Fixture[],
    updatedClubs: Club[],
    matchMedicalMessages: InboxMessage[] = []
  ) => {
    setIsMatchModalOpen(false);

    setGameState((prev) => {
      if (!prev) return null;

      const domesticUpdatedClubs = stripWorldGuestClubs(updatedClubs);
      const allCompleted = [userFixture, ...allRoundFixtures];
      const comp = userFixture.competition;

      // 1. Merge completed fixtures across all 11 competitions
      const mergedFixtures = mergeCompletedFixturesIntoState(prev, allCompleted);

      // 2. Recompute all 7 standings tables from actual played group/league matches
      const recomputedStandings = recomputeAllStandings({
        ...prev,
        ...mergedFixtures,
      });

      // 3. Dynamically advance winners in Copa do Brasil, Libertadores, Sul-Americana, UEFA cups, Série D, Estaduais & Mundial Intercontinental
      const syncedBrackets = syncDynamicKnockoutBrackets({
        clubs: domesticUpdatedClubs,
        currentDate: userFixture.date || prev.currentDate,
        fixturesCopaBrasil: mergedFixtures.fixturesCopaBrasil,
        fixturesCopaNordeste: mergedFixtures.fixturesCopaNordeste,
        fixturesCopaVerde: mergedFixtures.fixturesCopaVerde,
        fixturesLibertadores: mergedFixtures.fixturesLibertadores,
        fixturesSulamericana: mergedFixtures.fixturesSulamericana,
        fixturesEstadual: mergedFixtures.fixturesEstadual,
        fixturesB: mergedFixtures.fixturesB,
        fixturesC: mergedFixtures.fixturesC,
        fixturesD: mergedFixtures.fixturesD,
        fixturesIntercontinental: mergedFixtures.fixturesIntercontinental,
        fixturesConcacafChampions: mergedFixtures.fixturesConcacafChampions,
        fixturesAfcChampions: mergedFixtures.fixturesAfcChampions,
        fixturesChampionsLeague: mergedFixtures.fixturesChampionsLeague,
        fixturesEuropaLeague: mergedFixtures.fixturesEuropaLeague,
        fixturesConferenceLeague: mergedFixtures.fixturesConferenceLeague,
        fixturesCopaInternacional: mergedFixtures.fixturesCopaInternacional,
        fixturesSuperMundial: mergedFixtures.fixturesSuperMundial,
        fixturesEngCommunityShield: mergedFixtures.fixturesEngCommunityShield,
        fixturesEngEflCup: mergedFixtures.fixturesEngEflCup,
        fixturesEngFaCup: mergedFixtures.fixturesEngFaCup,
        fixturesEurope: mergedFixtures.fixturesEurope,
        fixturesEuropeanCups: mergedFixtures.fixturesEuropeanCups,
        fixturesSouthAmericanCups: mergedFixtures.fixturesSouthAmericanCups,
        fixturesWorldLeagues: mergedFixtures.fixturesWorldLeagues,
        fixturesWorldCups: mergedFixtures.fixturesWorldCups,
        standingsLibertadores: recomputedStandings.standingsLibertadores,
        standingsSulamericana: recomputedStandings.standingsSulamericana,
        standingsEstadual: recomputedStandings.standingsEstadual,
        standingsCopaNordeste: recomputedStandings.standingsCopaNordeste,
        standingsCopaVerde: recomputedStandings.standingsCopaVerde,
        standingsB: recomputedStandings.standingsB,
        standingsC: recomputedStandings.standingsC,
        standingsD: recomputedStandings.standingsD,
        standingsChampionsLeague: recomputedStandings.standingsChampionsLeague,
        standingsEuropaLeague: recomputedStandings.standingsEuropaLeague,
        standingsConferenceLeague: recomputedStandings.standingsConferenceLeague,
        standingsCopaInternacional: recomputedStandings.standingsCopaInternacional,
        standingsAfcChampions: recomputedStandings.standingsAfcChampions,
        standingsSuperMundial: recomputedStandings.standingsSuperMundial,
        standingsEurope: recomputedStandings.standingsEurope,
        standingsWorldLeagues: recomputedStandings.standingsWorldLeagues,
      });

      const fA = mergedFixtures.fixturesA;
      const fB = syncedBrackets.fixturesB || mergedFixtures.fixturesB;
      const fC = syncedBrackets.fixturesC || mergedFixtures.fixturesC;
      const fD = syncedBrackets.fixturesD;
      const fSuper = mergedFixtures.fixturesSupercopa;
      const fRecopa = mergedFixtures.fixturesRecopa;
      const fLib = syncedBrackets.fixturesLibertadores;
      const fSula = syncedBrackets.fixturesSulamericana;
      const fCdb = syncedBrackets.fixturesCopaBrasil;
      const fCne = syncedBrackets.fixturesCopaNordeste || [];
      const fCv = syncedBrackets.fixturesCopaVerde || [];
      const fEst = syncedBrackets.fixturesEstadual;
      const fIntercont = syncedBrackets.fixturesIntercontinental;
      const fConcacaf = syncedBrackets.fixturesConcacafChampions || [];
      const fAfc = syncedBrackets.fixturesAfcChampions || [];
      const fSA = mergedFixtures.fixturesSouthAmerica;
      const fEU = syncedBrackets.fixturesEurope || mergedFixtures.fixturesEurope;
      const fWL = syncedBrackets.fixturesWorldLeagues || mergedFixtures.fixturesWorldLeagues;
      const fUcl = syncedBrackets.fixturesChampionsLeague;
      const fUel = syncedBrackets.fixturesEuropaLeague;
      const fUecl = syncedBrackets.fixturesConferenceLeague;
      const fUefaSuper = mergedFixtures.fixturesUefaSupercup;
      const fCint = syncedBrackets.fixturesCopaInternacional;
      const fSmwc = syncedBrackets.fixturesSuperMundial || [];
      const fFriendlies = (prev.fixturesFriendlies || []).map((f) =>
        f.id === userFixture.id ? userFixture : f
      );

      const sA = recomputedStandings.standingsA;
      const sB = recomputedStandings.standingsB;
      const sC = recomputedStandings.standingsC;
      const sD = recomputedStandings.standingsD;
      const sLib = recomputedStandings.standingsLibertadores;
      const sSula = recomputedStandings.standingsSulamericana;
      const sEst = recomputedStandings.standingsEstadual;
      const sCne = recomputedStandings.standingsCopaNordeste || [];
      const sCv = recomputedStandings.standingsCopaVerde || [];
      const sSA = recomputedStandings.standingsSouthAmerica;
      const sEU = recomputedStandings.standingsEurope;
      const sWL = recomputedStandings.standingsWorldLeagues;
      const sUcl = recomputedStandings.standingsChampionsLeague;
      const sUel = recomputedStandings.standingsEuropaLeague;
      const sUecl = recomputedStandings.standingsConferenceLeague;
      const sCint = recomputedStandings.standingsCopaInternacional;
      const sAfc = recomputedStandings.standingsAfcChampions || [];
      const sSmwc = recomputedStandings.standingsSuperMundial || [];

      // Credit CPU players (matches, goals, home gate revenue) from all simultaneous CPU matches
      const clubsWithCpuStats = creditCpuPlayersFromFixtures(
        domesticUpdatedClubs,
        allRoundFixtures,
        new Set([userFixture.homeTeamId, userFixture.awayTeamId]),
        false // cards are recorded right below with competition suspension tracking
      );

      const isClassic38League =
        comp === 'serie_a' || comp === 'serie_b' || comp === 'serie_c';
      const isSaNationalLeague = isSouthAmericanLeague(comp);
      const isEuNationalLeague = isEuropeanLeague(comp);
      const isWlNationalLeague = isWorldLeague(comp);
      const isNationalLeagueMatch =
        isClassic38League ||
        comp === 'serie_d' ||
        (comp === 'estadual' && userClub.division === 'EST') ||
        isSaNationalLeague ||
        isEuNationalLeague ||
        isWlNationalLeague;
      const nextRound = isNationalLeagueMatch
        ? Math.max(prev.currentRound, userFixture.round) + 1
        : prev.currentRound;

      let newTrophyHistory = [...prev.trophyHistory];
      const compMeta = COMPETITIONS_CATALOG[comp] || COMPETITIONS_CATALOG.serie_a;

      const phaseLower = (userFixture.cupPhase || '').toLowerCase();
      const isDecidingLeg = userFixture.leg !== 1;
      const isCupTitleMatch = Boolean(
        isDecidingLeg &&
          (userFixture.id === 'serie_c_playoff_final' ||
            comp === 'supercopa_brasil' ||
            comp === 'recopa_sulamericana' ||
            comp === 'uefa_supercup' ||
            comp === 'eng_community_shield' ||
            phaseLower.includes('grande final') ||
            phaseLower.includes('decisão') ||
            phaseLower.includes('• final') ||
            phaseLower.includes('final da copa') ||
            (phaseLower.includes('final') &&
              !phaseLower.includes('semifinal') &&
              !phaseLower.includes('oitavas') &&
              !phaseLower.includes('quartas') &&
              (comp === 'eng_fa_cup' ||
                comp === 'eng_efl_cup' ||
                isEuropeanCup(comp) ||
                isSouthAmericanCup(comp) ||
                isWorldCup(comp))))
      );
      const isLeagueFinalRound = isEuNationalLeague
        ? userFixture.round >= EUROPEAN_LEAGUES_META[comp].totalRounds
        : isSaNationalLeague
        ? userFixture.round >= SOUTH_AMERICAN_LEAGUES_META[comp].totalRounds
        : isWlNationalLeague
        ? comp === 'usa_mls'
          ? userFixture.round === WORLD_LEAGUES_META.usa_mls.totalRounds &&
            !isMlsPlayoffFixture(userFixture)
          : userFixture.round >= WORLD_LEAGUES_META[comp].totalRounds
        : Boolean(
            isClassic38League &&
              userFixture.round === prev.totalRounds &&
              !userFixture.id.includes('playoff')
          );

      if (isCupTitleMatch || isLeagueFinalRound) {
        let userWon = false;
        let runnerUpName = 'Vice-Campeão';

        if (isLeagueFinalRound) {
          const divStandings = isEuNationalLeague
            ? sEU?.[comp] || []
            : isSaNationalLeague
            ? sSA?.[comp] || []
            : isWlNationalLeague
            ? sWL?.[comp] || []
            : comp === 'serie_a'
            ? sA
            : comp === 'serie_b'
            ? sB
            : comp === 'serie_c'
            ? sC
            : sD;
          userWon = divStandings[0]?.teamId === userClub.id;
          const runnerUpId = divStandings[1]?.teamId;
          runnerUpName = clubsWithCpuStats.find((c) => c.id === runnerUpId)?.name || 'Vice-Campeão';
        } else {
          userWon = userFixture.aggregateWinnerId
            ? userFixture.aggregateWinnerId === userClub.id
            : userFixture.penaltiesHome !== undefined && userFixture.penaltiesAway !== undefined
            ? userFixture.homeTeamId === userClub.id
              ? userFixture.penaltiesHome > userFixture.penaltiesAway
              : userFixture.penaltiesAway > userFixture.penaltiesHome
            : userFixture.aggregateHomeScore !== undefined && userFixture.aggregateAwayScore !== undefined
            ? userFixture.homeTeamId === userClub.id
              ? userFixture.aggregateHomeScore > userFixture.aggregateAwayScore
              : userFixture.aggregateAwayScore > userFixture.aggregateHomeScore
            : userFixture.homeTeamId === userClub.id
            ? (userFixture.homeScore ?? 0) > (userFixture.awayScore ?? 0)
            : (userFixture.awayScore ?? 0) > (userFixture.homeScore ?? 0);

          const oppId =
            userFixture.homeTeamId === userClub.id ? userFixture.awayTeamId : userFixture.homeTeamId;
          runnerUpName =
            withWorldGuestClubs(clubsWithCpuStats).find((c) => c.id === oppId)?.name ||
            'Vice-Campeão';
        }

        if (userWon) {
          const isEuCompTitle =
            isEuNationalLeague ||
            isSplitYearWorldLeague(comp) ||
            comp === 'champions_league' ||
            comp === 'europa_league' ||
            comp === 'conference_league' ||
            comp === 'afc_champions';
          const trophyYear = isEuCompTitle
            ? prev.europeSeasonYear ?? prev.currentSeasonYear
            : prev.saSeasonYear ?? prev.currentSeasonYear;
          const trophyRecord: TrophyRecord = {
            year: trophyYear,
            seasonLabel: isEuCompTitle ? formatEuropeanSeason(trophyYear) : undefined,
            competition:
              userFixture.id === 'serie_c_playoff_final'
                ? 'Playoff de Acesso · Brasileirão Série C (Promoção à Série B)'
                : comp === 'estadual' && userFixture.groupName
                ? userFixture.groupName
                : comp === 'usa_mls' && isLeagueFinalRound
                ? "MLS Supporters' Shield (Temporada Regular)"
                : comp === 'usa_mls' && userFixture.id === 'usa_mls_po_final'
                ? 'Major League Soccer (MLS Cup)'
                : compMeta.name,
            championTeamName: userClub.name,
            runnerUpTeamName: runnerUpName,
            userWon: true,
          };
          newTrophyHistory.push(trophyRecord);

          soundEngine.playFanfare();
          confetti({ particleCount: 160, spread: 90 });
        }
      }

      // Check if user still has another unplayed match on this exact date (e.g. legacy saves)
      const matchDate = userFixture.date || prev.currentDate;
      const allUpdatedPools = [
        ...fA,
        ...fB,
        ...fC,
        ...fD,
        ...fSuper,
        ...fRecopa,
        ...fLib,
        ...fSula,
        ...fCdb,
        ...fCne,
        ...fCv,
        ...fEst,
        ...fIntercont,
        ...fConcacaf,
        ...fAfc,
        ...fUcl,
        ...fUel,
        ...fUecl,
        ...(fUefaSuper || []),
        ...fCint,
        ...fSmwc,
        ...(syncedBrackets.fixturesEngCommunityShield ||
          mergedFixtures.fixturesEngCommunityShield ||
          []),
        ...(syncedBrackets.fixturesEngEflCup || mergedFixtures.fixturesEngEflCup || []),
        ...(syncedBrackets.fixturesEngFaCup || mergedFixtures.fixturesEngFaCup || []),
        ...fFriendlies,
        ...flattenSouthAmericaFixtures(fSA),
        ...flattenEuropeFixtures(fEU),
        ...flattenWorldLeaguesFixtures(fWL),
        ...flattenEuropeanCupsFixtures(
          syncedBrackets.fixturesEuropeanCups || mergedFixtures.fixturesEuropeanCups
        ),
        ...flattenSouthAmericanCupsFixtures(
          syncedBrackets.fixturesSouthAmericanCups || mergedFixtures.fixturesSouthAmericanCups
        ),
        ...flattenWorldCupsFixtures(
          syncedBrackets.fixturesWorldCups || mergedFixtures.fixturesWorldCups
        ),
      ];
      const hasAnotherUserMatchSameDay = allUpdatedPools.some(
        (f) =>
          !f.played &&
          f.date === matchDate &&
          (f.homeTeamId === prev.userClubId || f.awayTeamId === prev.userClubId)
      );
      const nextDate = hasAnotherUserMatchSameDay ? matchDate : addDays(matchDate, 1);

      // Disciplinary suspensions serving & card recording for all completed matches in this round
      const disciplinaryInboxMsgs: InboxMessage[] = [];
      const clubsWithDisciplinary = clubsWithCpuStats.map((club) => {
        const isUser = club.id === prev.userClubId;
        const clubFixturesInBatch = allCompleted.filter(
          (f) => f.homeTeamId === club.id || f.awayTeamId === club.id
        );

        if (clubFixturesInBatch.length === 0) {
          return club;
        }

        let currentSquad = club.squad;
        for (const clubFixture of clubFixturesInBatch) {
          const matchComp = clubFixture.competition;
          if (matchComp === 'amistoso_internacional') continue;

          // 1. Serve 1 match of suspension in matchComp for players who sat out
          const { updatedSquad: squadAfterServing, generatedMessages: servedMsgs } =
            serveSquadCompetitionSuspensions(
              currentSquad,
              matchComp,
              nextDate,
              clubFixture.round,
              isUser
            );

          if (isUser && servedMsgs.length > 0) {
            disciplinaryInboxMsgs.push(...servedMsgs);
          }

          // 2. Record new yellow and red cards received in this match
          currentSquad = squadAfterServing.map((player) => {
            const yellowsInMatch =
              clubFixture.events?.filter(
                (e) => e.type === 'CARTAO_AMARELO' && e.teamId === club.id && e.playerId === player.id
              ).length || 0;

            const redsInMatch =
              clubFixture.events?.filter(
                (e) => e.type === 'CARTAO_VERMELHO' && e.teamId === club.id && e.playerId === player.id
              ).length || 0;

            if (yellowsInMatch === 0 && redsInMatch === 0) {
              return player;
            }

            const { updatedPlayer, generatedMessages: cardMsgs } = recordPlayerCards(
              player,
              yellowsInMatch,
              redsInMatch,
              matchComp,
              matchDate,
              clubFixture.round,
              isUser
            );

            if (isUser && cardMsgs.length > 0) {
              disciplinaryInboxMsgs.push(...cardMsgs);
            }

            return updatedPlayer;
          });
        }

        return {
          ...club,
          squad: currentSquad,
        };
      });

      // Dynamic performance-driven player progression (+OVR) & regression (-OVR)
      // (CPU clubs already updated via applyCpuClubsDynamicRatingsAfterFixtures in creditCpuPlayersFromFixtures)
      const evolutionInboxMsgs: InboxMessage[] = [];
      const isUserHomeInMatch = userFixture.homeTeamId === userClub.id;
      const userGoalsFor = (isUserHomeInMatch ? userFixture.homeScore : userFixture.awayScore) ?? 0;
      const userGoalsAgainst =
        (isUserHomeInMatch ? userFixture.awayScore : userFixture.homeScore) ?? 0;
      const userTeamResult: 'WIN' | 'DRAW' | 'LOSS' =
        userGoalsFor > userGoalsAgainst
          ? 'WIN'
          : userGoalsFor === userGoalsAgainst
          ? 'DRAW'
          : 'LOSS';

      const clubsWithEvolutions = clubsWithDisciplinary.map((club) => {
        if (club.id !== userClub.id) {
          return club;
        }

        const trainingBonusPct = ((club.finances.trainingFacilityLevel || 2) - 1) * 0.12;
        const evolvedSquad = club.squad.map((player) => {
          const goalsInMatch =
            userFixture.events?.filter(
              (e) =>
                (e.type === 'GOL' || e.type === 'PENALTI_GOL') &&
                e.teamId === club.id &&
                e.playerId === player.id
            ).length || 0;
          const assistsInMatch =
            userFixture.events?.filter(
              (e) =>
                (e.type === 'GOL' || e.type === 'PENALTI_GOL') &&
                e.teamId === club.id &&
                e.assistPlayerId === player.id
            ).length || 0;
          const hadRedCard =
            (userFixture.events?.filter(
              (e) =>
                e.type === 'CARTAO_VERMELHO' &&
                e.teamId === club.id &&
                e.playerId === player.id
            ).length || 0) > 0;
          const subbedIn =
            (userFixture.events?.filter(
              (e) =>
                e.type === 'SUBSTITUICAO' &&
                e.teamId === club.id &&
                e.playerId === player.id
            ).length || 0) > 0;

          const participated = Boolean(
            player.isStarter || subbedIn || goalsInMatch > 0 || assistsInMatch > 0 || hadRedCard
          );

          let matchRating =
            participated && player.lastMatchRating && player.lastMatchRating > 0
              ? player.lastMatchRating
              : userTeamResult === 'WIN'
              ? 6.9
              : userTeamResult === 'DRAW'
              ? 6.3
              : 5.6;

          if (!player.lastMatchRating || player.lastMatchRating <= 0) {
            matchRating += goalsInMatch * 0.85 + assistsInMatch * 0.55;
            if (
              (player.detailedRole === 'GOL' ||
                player.detailedRole === 'ZAG' ||
                player.detailedRole === 'LAT') &&
              userGoalsAgainst === 0
            ) {
              matchRating += 0.65;
            }
            if (userGoalsAgainst >= 3) {
              matchRating -= 0.55;
            }
            if (hadRedCard) {
              matchRating -= 1.4;
            }
          }

          const { updatedPlayer, deltaOvr, reasonTag } = applyUserPlayerPostMatchDynamicRating(player, {
            participated,
            matchRating,
            goalsScoredByPlayer: goalsInMatch,
            assistsByPlayer: assistsInMatch,
            teamGoalsFor: userGoalsFor,
            teamGoalsAgainst: userGoalsAgainst,
            teamResult: userTeamResult,
            trainingBonusPct,
            division: club.division,
            club,
            currentRound: prev.currentRound,
          });

          if (deltaOvr === 1) {
            evolutionInboxMsgs.push({
              id: `train_evo_${Date.now()}_${player.id}`,
              title: `📈 EVOLUÇÃO: ${player.name} subiu para Força ${updatedPlayer.overall}!`,
              message: `Grande fase! ${player.name} (${player.detailedRole}, ${player.age} anos) evoluiu para Força ${updatedPlayer.overall} (+1 OVR) por ${reasonTag || 'boas atuações na temporada'}. Valor de mercado atualizado para R$ ${updatedPlayer.marketValue.toLocaleString('pt-BR')}.`,
              date: new Date().toLocaleDateString('pt-BR'),
              round: prev.currentRound,
              read: false,
              type: 'BOARD',
            });
          } else if (deltaOvr === -1) {
            evolutionInboxMsgs.push({
              id: `train_reg_${Date.now()}_${player.id}`,
              title: `📉 QUEDA DE FASE: ${player.name} caiu para Força ${updatedPlayer.overall}`,
              message: `Alerta da comissão técnica: ${player.name} (${player.detailedRole}, ${player.age} anos) caiu para Força ${updatedPlayer.overall} (-1 OVR) devido a ${reasonTag || 'atuações abaixo do esperado'}. Sequência de bons jogos pode recuperar seu nível!`,
              date: new Date().toLocaleDateString('pt-BR'),
              round: prev.currentRound,
              read: false,
              type: 'DRESSING_ROOM',
            });
          }

          return updatedPlayer;
        });

        return {
          ...club,
          squad: evolvedSquad,
        };
      });

      // Process 1 day of medical, staff specialist bonuses, friendly tour payouts & physical condition recovery for all clubs
      const postMatchMedicalMsgs: InboxMessage[] = [];
      const friendlyRevenueMsgs: InboxMessage[] = [];
      const friendlyFeeEarned =
        comp === 'amistoso_internacional' ? userFixture.friendlyCommercialFee || 0 : 0;

      if (friendlyFeeEarned > 0) {
        const fmtFriendly = new Intl.NumberFormat('pt-BR', {
          style: 'currency',
          currency: 'BRL',
          maximumFractionDigits: 0,
        }).format(friendlyFeeEarned);
        friendlyRevenueMsgs.push({
          id: `friendly_fee_${Date.now()}_${userFixture.id}`,
          title: `✈️ Cota Comercial Recebida (${userFixture.friendlyTourTitle || 'Amistoso'}): ${fmtFriendly}`,
          message: `Pela realização da partida amistosa internacional (${userFixture.friendlyTourTitle || 'Excursão Comercial'}), o ${userClub.name} recebeu ${fmtFriendly} livres em caixa, além de ganho extra de ritmo e evolução técnica para os atletas utilizados!`,
          date: nextDate,
          round: prev.currentRound,
          read: false,
          type: 'FINANCE',
        });
      }

      const clubsWithMedical = clubsWithEvolutions.map((c) => {
        const isUser = c.id === prev.userClubId;
        const staffBonuses = computeClubStaffBonuses(c);
        const medDaysToHeal =
          1 + (staffBonuses.extraMedicalRecoveryChance > 0 && Math.random() < staffBonuses.extraMedicalRecoveryChance ? 1 : 0);

        const { updatedSquad, generatedInboxMessages } = progressSquadMedicalDay(
          c.squad,
          medDaysToHeal,
          nextDate,
          prev.currentRound,
          c.finances.medicalFacilityLevel || 2,
          isUser
        );
        if (isUser && generatedInboxMessages.length > 0) {
          postMatchMedicalMsgs.push(...generatedInboxMessages);
        }

        const playedUserFixtureToday =
          c.id === userFixture.homeTeamId || c.id === userFixture.awayTeamId;
        const specialtyForClub = isUser ? getManagerSpecialtyProfile(prev.managerSpecialty) : null;
        const squadWithDailyRecovery = updatedSquad.map((p) => {
          // Jogadores que acabaram de jogar a partida mantêm o desgaste pós-jogo (não ganham +20 instantâneo!)
          const nextCondition = playedUserFixtureToday
            ? p.condition
            : Math.min(
                100,
                p.condition +
                  computeDailyConditionRecovery(
                    p,
                    staffBonuses.dailyConditionBonus,
                    specialtyForClub?.id === 'MOTIVADOR'
                  )
              );

          return {
            ...p,
            condition: nextCondition,
            trainingProgress:
              isUser && comp === 'amistoso_internacional' && (p.isStarter || p.isSubstitute)
                ? Math.min(99, (p.trainingProgress || 0) + 8)
                : p.trainingProgress,
          };
        });

        return {
          ...c,
          finances:
            isUser && friendlyFeeEarned > 0
              ? recordFinanceLedgerMutation(c.finances, {
                  date: nextDate,
                  category: 'SPONSORS',
                  type: 'INCOME',
                  amount: friendlyFeeEarned,
                  description: `Cota Comercial Amistoso (${userFixture.friendlyTourTitle || 'Excursão'})`,
                  applyToBalance: true,
                })
              : c.finances,
          squad: squadWithDailyRecovery,
        };
      });

      // Process active loans across rounds (decrement rounds, evolution, CPU buyouts & returns)
      const {
        updatedClubs: clubsWithLoans,
        loanNotifications,
        buyoutTransferRecords,
      } = processRoundLoans(
        clubsWithMedical,
        prev.userClubId,
        nextRound,
        nextDate,
        prev.currentSeasonYear
      );

      // Improvement 5: Check and Award Cup Phase Prizes (Copa do Brasil, Libertadores, Sul-Americana, Estaduais)
      const prizeInboxMsgs: InboxMessage[] = [];
      let clubsWithPrizes = clubsWithLoans;

      // Check user match and other completed cup fixtures
      for (const completedFix of allCompleted) {
        const { updatedClubs: clubsAfterFixPrize, awardResult } = checkAndAwardCupPhasePrize(
          completedFix,
          clubsWithPrizes,
          prev.userClubId,
          prev.currentRound,
          nextDate
        );
        clubsWithPrizes = clubsAfterFixPrize;
        if (awardResult?.inboxMessage) {
          prizeInboxMsgs.push(awardResult.inboxMessage);
        }
      }

      // Season-end league + cup participation/position prizes are settled cleanly at season conclusion
      // via settleAllSeasonEndPrizes (covering ALL leagues & cups without partial/duplicate payouts).

      if (prizeInboxMsgs.length > 0) {
        soundEngine.playFanfare();
      }

      // Process active 4-sponsor contracts (round payout + win/goal bonuses + contract countdown)
      const { updatedClubs: clubsWithSponsors, sponsorInboxMessages } = processRoundSponsors(
        clubsWithPrizes,
        prev.userClubId,
        userFixture,
        prev.currentRound,
        nextDate
      );

      // In Classic/Fast Mode, silently refill any expired sponsor slots so routine renewal doesn't slow down gameplay
      const finalClubsAfterMarket = gameSettings.classicFastMode
        ? clubsWithSponsors.map((clubItem) => {
            if (clubItem.id !== prev.userClubId) return clubItem;
            let updatedUserClub = clubItem;
            for (const slot of SPONSOR_SLOTS_ORDER) {
              if (!updatedUserClub.sponsors?.[slot]) {
                const options = getAvailableSponsorOptionsForSlot(updatedUserClub, slot);
                const bestOption = options.sort(
                  (a, b) =>
                    b.signingBonus +
                    b.perRoundAmount * b.totalRounds -
                    (a.signingBonus + a.perRoundAmount * a.totalRounds)
                )[0];
                if (bestOption) {
                  const res = signSponsorContract(
                    updatedUserClub,
                    bestOption,
                    prev.currentRound,
                    nextDate
                  );
                  if (res.success) {
                    updatedUserClub = res.updatedClub;
                  }
                }
              }
            }
            return updatedUserClub;
          })
        : clubsWithSponsors;

      const daysAdvancedAfterMatch = hasAnotherUserMatchSameDay ? 0 : 1;

      // Evaluate Seleção da Rodada (Team of the Round) for the competition just played
      const compFixturesForTotw: Fixture[] = isEuropeanLeague(comp)
        ? fEU?.[comp] || []
        : isSouthAmericanLeague(comp)
        ? fSA?.[comp] || []
        : isWorldLeague(comp)
        ? fWL?.[comp] || []
        : comp === 'champions_league'
        ? fUcl
        : comp === 'europa_league'
        ? fUel
        : comp === 'conference_league'
        ? fUecl
        : comp === 'copa_internacional'
        ? fCint
        : comp === 'concacaf_champions'
        ? fConcacaf
        : comp === 'afc_champions'
        ? fAfc
        : comp === 'super_mundial_clubes'
        ? fSmwc
        : comp === 'serie_a'
        ? fA
        : comp === 'serie_b'
        ? fB
        : comp === 'serie_c'
        ? fC
        : comp === 'serie_d'
        ? fD
        : comp === 'libertadores'
        ? fLib
        : comp === 'sulamericana'
        ? fSula
        : comp === 'copa_brasil'
        ? fCdb
        : comp === 'copa_nordeste'
        ? fCne
        : comp === 'copa_verde'
        ? fCv
        : comp === 'estadual'
        ? fEst
        : comp === 'supercopa_brasil'
        ? fSuper
        : comp === 'uefa_supercup'
        ? fUefaSuper || []
        : comp === 'intercontinental'
        ? fIntercont
        : comp === 'eng_community_shield'
        ? syncedBrackets.fixturesEngCommunityShield || []
        : comp === 'eng_efl_cup'
        ? syncedBrackets.fixturesEngEflCup || []
        : comp === 'eng_fa_cup'
        ? syncedBrackets.fixturesEngFaCup || []
        : isEuropeanCup(comp)
        ? syncedBrackets.fixturesEuropeanCups?.[comp] || []
        : isSouthAmericanCup(comp)
        ? syncedBrackets.fixturesSouthAmericanCups?.[comp] || []
        : isWorldCup(comp)
        ? syncedBrackets.fixturesWorldCups?.[comp] || []
        : comp === 'amistoso_internacional'
        ? []
        : fRecopa;

      const totwResult = buildTeamOfTheRound(
        compFixturesForTotw,
        userFixture.round,
        finalClubsAfterMarket,
        prev.userClubId
      );
      const totwInboxMsgs: InboxMessage[] = [];
      let clubsAfterTotw = finalClubsAfterMarket;

      if (
        comp !== 'amistoso_internacional' &&
        totwResult.playedMatchesCount >= 2 &&
        totwResult.userHonorees.length > 0
      ) {
        const honoredIds = new Set(totwResult.userHonorees.map((h) => h.player.id));
        const mvpUserSlot = totwResult.userHonorees.find((h) => h.isPlayerOfTheRound);

        clubsAfterTotw = finalClubsAfterMarket.map((c) => {
          if (c.id !== prev.userClubId) return c;
          return {
            ...c,
            squad: c.squad.map((p) => {
              if (!honoredIds.has(p.id)) return p;
              const isMvp = mvpUserSlot?.player.id === p.id;
              return {
                ...p,
                morale: 'Excelente',
                marketValue: isMvp ? Math.round(p.marketValue * 1.02) : p.marketValue,
              };
            }),
          };
        });

        const compLabel = COMPETITIONS_CATALOG[comp]?.shortName || 'Competição';
        const namesSummary = totwResult.userHonorees
          .map((h) => `${h.player.name} (${h.slotLabel}, nota ${h.rating.toFixed(1)})`)
          .join(', ');

        totwInboxMsgs.push({
          id: `totw_${comp}_r${userFixture.round}_${Date.now()}`,
          title: mvpUserSlot
            ? `Craque e Seleção da Rodada ${userFixture.round} (${compLabel})`
            : `Atletas na Seleção da Rodada ${userFixture.round} (${compLabel})`,
          message: mvpUserSlot
            ? `${mvpUserSlot.player.name} foi eleito o Craque da Rodada ${userFixture.round} (${mvpUserSlot.rating.toFixed(1)}) e entrou nos 11 Ideais de ${compLabel}! Destaques do clube na seleção: ${namesSummary}. Moral elevada para Excelente.`
            : `A imprensa esportiva divulgou os 11 Ideais da Rodada ${userFixture.round} (${compLabel}) com presença do seu elenco: ${namesSummary}. Os atletas ganharam moral máxima no vestiário!`,
          date: nextDate,
          round: prev.currentRound,
          read: false,
          type: 'AWARD',
        });
      }

      const userClubAfterMarket =
        clubsAfterTotw.find((c) => c.id === prev.userClubId) || userClub;
      const {
        updatedNetwork: progressedScoutingNetwork,
        generatedInboxMessages: scoutingInboxMsgs,
      } = progressScoutingMissions(
        prev.scoutingNetwork,
        userClubAfterMarket,
        daysAdvancedAfterMatch,
        nextDate,
        prev.currentRound
      );

      const {
        updatedClub: userClubWithYouthEvo,
        inboxMessages: youthEvoMsgs,
      } = progressYouthAcademyDays(
        ensureClubYouthAcademy(userClubAfterMarket, nextDate),
        daysAdvancedAfterMatch,
        nextDate,
        prev.currentRound,
        true
      );

      const retrainPostMatch = progressClubSquadPositionRetraining({
        club: userClubWithYouthEvo,
        days: daysAdvancedAfterMatch,
        currentDate: nextDate,
        currentRound: prev.currentRound,
        isUserClub: true,
      });
      const userClubWithRetraining: Club = {
        ...userClubWithYouthEvo,
        squad: retrainPostMatch.updatedSquad,
      };

      const clubsAfterYouthEvo = clubsAfterTotw.map((c) =>
        c.id === prev.userClubId ? userClubWithRetraining : c
      );

      const draftNextSaveState: GameSave = {
        ...prev,
        currentRound: Math.min(prev.totalRounds, nextRound),
        currentDate: nextDate,
        clubs: clubsAfterYouthEvo,
        fixturesA: fA,
        fixturesB: fB,
        fixturesC: fC,
        fixturesD: fD,
        fixturesSupercopa: fSuper,
        fixturesRecopa: fRecopa,
        fixturesLibertadores: fLib,
        fixturesSulamericana: fSula,
        fixturesCopaBrasil: fCdb,
        fixturesCopaNordeste: fCne,
        fixturesCopaVerde: fCv,
        fixturesEstadual: fEst,
        fixturesIntercontinental: fIntercont,
        fixturesConcacafChampions: fConcacaf,
        fixturesAfcChampions: fAfc,
        fixturesSouthAmerica: fSA,
        fixturesEurope: fEU,
        fixturesEuropeanCups: syncedBrackets.fixturesEuropeanCups || mergedFixtures.fixturesEuropeanCups,
        fixturesSouthAmericanCups: syncedBrackets.fixturesSouthAmericanCups || mergedFixtures.fixturesSouthAmericanCups,
        fixturesWorldCups: syncedBrackets.fixturesWorldCups || mergedFixtures.fixturesWorldCups,
        fixturesEngCommunityShield: syncedBrackets.fixturesEngCommunityShield || mergedFixtures.fixturesEngCommunityShield,
        fixturesEngEflCup: syncedBrackets.fixturesEngEflCup || mergedFixtures.fixturesEngEflCup,
        fixturesEngFaCup: syncedBrackets.fixturesEngFaCup || mergedFixtures.fixturesEngFaCup,
        fixturesWorldLeagues: fWL,
        fixturesChampionsLeague: fUcl,
        fixturesEuropaLeague: fUel,
        fixturesConferenceLeague: fUecl,
        fixturesUefaSupercup: fUefaSuper,
        fixturesCopaInternacional: fCint,
        fixturesSuperMundial: fSmwc,
        fixturesFriendlies: fFriendlies,
        standingsA: sA,
        standingsB: sB,
        standingsC: sC,
        standingsD: sD,
        standingsLibertadores: sLib,
        standingsSulamericana: sSula,
        standingsEstadual: sEst,
        standingsCopaNordeste: sCne,
        standingsCopaVerde: sCv,
        standingsSouthAmerica: sSA,
        standingsEurope: sEU,
        standingsWorldLeagues: sWL,
        standingsChampionsLeague: sUcl,
        standingsEuropaLeague: sUel,
        standingsConferenceLeague: sUecl,
        standingsCopaInternacional: sCint,
        standingsAfcChampions: sAfc,
        standingsSuperMundial: sSmwc,
        trophyHistory: newTrophyHistory,
        transferHistory: [
          ...buyoutTransferRecords,
          ...(prev.transferHistory || []),
        ],
        scoutingNetwork: progressedScoutingNetwork,
        inbox: [
          ...friendlyRevenueMsgs,
          ...retrainPostMatch.inboxMessages,
          ...totwInboxMsgs,
          ...youthEvoMsgs,
          ...scoutingInboxMsgs,
          ...prizeInboxMsgs,
          ...sponsorInboxMessages,
          ...loanNotifications,
          ...disciplinaryInboxMsgs,
          ...matchMedicalMessages,
          ...postMatchMedicalMsgs,
          ...evolutionInboxMsgs,
          ...prev.inbox,
        ],
      };

      // Mid-season Contract Alerts (Bosman risk, Veteran Retirement announcements, late CPU Bosman offers)
      const {
        updatedClubs: clubsAfterContractEvents,
        contractInboxMessages,
        newDeals: cpuBosmanDeals,
      } = processMidSeasonContractEvents(draftNextSaveState, prev.currentRound);

      const stateWithContractEvents: GameSave = {
        ...draftNextSaveState,
        clubs: clubsAfterContractEvents,
        transferHistory: [...cpuBosmanDeals, ...(draftNextSaveState.transferHistory || [])],
        inbox: [...contractInboxMessages, ...draftNextSaveState.inbox],
      };

      // Evaluate Board & Fan Confidence, Season Goals, and Coaching Market Offers (skip official board scrutiny on friendlies)
      const careerEvalResult =
        comp === 'amistoso_internacional' && stateWithContractEvents.managerCareer
          ? {
              updatedCareer: stateWithContractEvents.managerCareer,
              bonusCredited: 0,
              generatedMessages: [] as InboxMessage[],
              wasSacked: false,
            }
          : evaluatePostMatchCareerUpdate(stateWithContractEvents, userFixture);
      const {
        updatedCareer,
        bonusCredited: boardBonusCredited,
        generatedMessages: boardCareerMsgs,
        wasSacked,
      } = careerEvalResult;

      // Apply Rivalry Victory Club & Squad Bonuses (+New Sócios, Starter Morale Excelente, and Club Reputation Prestige)
      const playedOppId =
        userFixture.homeTeamId === prev.userClubId
          ? userFixture.awayTeamId
          : userFixture.homeTeamId;
      const playedOppClub = stateWithContractEvents.clubs.find((c) => c.id === playedOppId);
      const playedUserClub = stateWithContractEvents.clubs.find((c) => c.id === prev.userClubId);
      const playedRivalry = getMatchRivalryInfo(playedUserClub, playedOppClub);
      const userGoalsScored =
        userFixture.homeTeamId === prev.userClubId
          ? userFixture.homeScore ?? 0
          : userFixture.awayScore ?? 0;
      const oppGoalsScored =
        userFixture.homeTeamId === prev.userClubId
          ? userFixture.awayScore ?? 0
          : userFixture.homeScore ?? 0;
      const didUserWinDerby = Boolean(
        playedRivalry &&
          (userFixture.aggregateWinnerId
            ? userFixture.aggregateWinnerId === prev.userClubId
            : userGoalsScored > oppGoalsScored)
      );

      const derbyPrestigeMsgs: InboxMessage[] = [];
      const clubsWithBoardAndDerbyBonus = stateWithContractEvents.clubs.map((c) => {
        if (c.id !== prev.userClubId) return c;
        let nextRepStars = c.reputation;
        if (
          didUserWinDerby &&
          playedRivalry?.intensity === 'HISTORICO' &&
          playedOppClub &&
          c.reputation < playedOppClub.reputation &&
          c.reputation < 5
        ) {
          nextRepStars = Math.min(5, c.reputation + 1);
          derbyPrestigeMsgs.push({
            id: `msg_club_rep_up_${c.id}_${Date.now()}`,
            title: `Prestígio Nacional em Alta: ${c.shortName} alcança ${nextRepStars} Estrelas!`,
            message: `A vitória maiúscula sobre o rival ${playedOppClub.name} no ${playedRivalry.derbyName} elevou o patamar institucional do ${c.name} para ${nextRepStars} estrelas de reputação!`,
            date: nextDate,
            round: prev.currentRound,
            read: false,
            type: 'AWARD',
          });
        }

        return {
          ...c,
          reputation: nextRepStars,
          finances: {
            ...(boardBonusCredited > 0
              ? recordFinanceLedgerMutation(c.finances, {
                  date: nextDate,
                  category: 'PRIZES',
                  type: 'INCOME',
                  amount: boardBonusCredited,
                  description: `Bônus da diretoria por cumprimento de metas`,
                  applyToBalance: true,
                })
              : c.finances),
            seasonTicketHolders:
              c.finances.seasonTicketHolders +
              (didUserWinDerby && playedRivalry ? playedRivalry.fanSocioWinBonus : 0),
          },
          squad: didUserWinDerby
            ? c.squad.map((p) => (p.isStarter ? { ...p, morale: 'Excelente' as const } : p))
            : c.squad,
        };
      });

      const nextSaveStateBeforeFifa: GameSave = {
        ...stateWithContractEvents,
        clubs: clubsWithBoardAndDerbyBonus,
        managerCareer: updatedCareer,
        inbox: [...derbyPrestigeMsgs, ...boardCareerMsgs, ...stateWithContractEvents.inbox],
      };

      const stateAfterAiMarket = evaluateActiveTransferClausesProgress(
        processRoundAiTransferMarket(nextSaveStateBeforeFifa, matchDate)
      );
      const stateAfterCarousel = processRoundCoachingCarousel(stateAfterAiMarket);

      // Process Locker Room harmony, Player Demands & Post-Match Press Conference
      const lockerRes = processRoundLockerRoomAndPress({
        clubs: withWorldGuestClubs(stateAfterCarousel.clubs),
        userClubId: prev.userClubId,
        completedFixture: userFixture,
        currentRound: prev.currentRound,
        currentDate: nextDate,
        seasonYear: prev.currentSeasonYear,
        existingLockerRoom: stateAfterCarousel.lockerRoom,
        competitionLabel: compMeta.shortName,
      });

      const stateAfterLocker: GameSave = {
        ...stateAfterCarousel,
        clubs: stripWorldGuestClubs(lockerRes.updatedClubs),
        lockerRoom: lockerRes.updatedLockerRoom,
        inbox: [...lockerRes.newInboxMessages, ...stateAfterCarousel.inbox],
      };

      const nextSaveStateRaw = processMidSeasonNationalTeamCheck(
        stateAfterLocker,
        prev.currentRound
      );
      const nextSaveStatePreAch = resolveCrossCompetitionScheduleConflicts(
        syncOffContinentCalendarRollover(
          processMonthlyFinancialTurn(
            prev.currentDate,
            processTransferWindowTransitions(prev.currentDate, nextSaveStateRaw)
          )
        )
      );

      // Evaluate Career Achievements & Hall of Fame progression and notify on newly unlocked milestones
      const activeClubAfterRound =
        nextSaveStatePreAch.clubs.find((c) => c.id === nextSaveStatePreAch.userClubId) || userClub;
      const prevUnlockedSet = new Set(nextSaveStatePreAch.unlockedAchievementIds || []);
      const achEval = evaluateManagerAchievementsAndHallOfFame(
        nextSaveStatePreAch,
        activeClubAfterRound
      );
      const newlyUnlockedItems = achEval.achievements.filter(
        (a) => a.unlocked && !prevUnlockedSet.has(a.id)
      );
      const achInboxMsgs: InboxMessage[] = newlyUnlockedItems.map((a) => ({
        id: `msg_ach_${a.id}_${Date.now()}`,
        title: `🏅 Conquista Desbloqueada: ${a.title} (+${a.hallOfFameBonusPts} pts Hall da Fama)!`,
        message: `Parabéns, treinador! Você alcançou o marco histórico "${a.title}" (${a.description}) e somou +${a.hallOfFameBonusPts} pontos no Ranking Mundial do Hall da Fama dos Treinadores!`,
        date: nextSaveStatePreAch.currentDate,
        round: nextSaveStatePreAch.currentRound,
        read: false,
        type: 'AWARD',
      }));
      const stateWithAch: GameSave =
        newlyUnlockedItems.length > 0
          ? {
              ...nextSaveStatePreAch,
              unlockedAchievementIds: achEval.achievements
                .filter((a) => a.unlocked)
                .map((a) => a.id),
              inbox: [...achInboxMsgs, ...nextSaveStatePreAch.inbox],
            }
          : nextSaveStatePreAch;

      const ctxRoundMsgs = generateContextualNewsMessages({
        state: stateWithAch,
        completedFixture: userFixture,
        upcomingFixture: getUpcomingClubFixture(
          getAllFixturesFromSave(stateWithAch),
          activeClubAfterRound.id,
          stateWithAch.currentDate
        ),
      });
      const nextSaveState: GameSave =
        ctxRoundMsgs.length > 0
          ? { ...stateWithAch, inbox: [...ctxRoundMsgs, ...stateWithAch.inbox] }
          : stateWithAch;

      if (wasSacked) {
        setTimeout(() => setSackedModal(true), 350);
      }

      // Check whether any unplayed non-TBD user club fixture remains right now
      const isRealClubTeam = (id?: string) =>
        Boolean(id && id !== 'tbd' && !id.startsWith('TBD'));
      const anyUserMatchLeft = getAllFixturesFromSave(nextSaveState).some(
        (f) =>
          !f.played &&
          isRealClubTeam(f.homeTeamId) &&
          isRealClubTeam(f.awayTeamId) &&
          (f.homeTeamId === prev.userClubId || f.awayTeamId === prev.userClubId)
      );

      if (!anyUserMatchLeft && !wasSacked) {
        const activeUserForCutoff = nextSaveState.clubs.find(
          (c) => c.id === nextSaveState.userClubId
        );
        const isUserEuAtEnd = isSplitCalendarClub(activeUserForCutoff);
        const seasonCutoffDate = isUserEuAtEnd
          ? getEuropeanSeasonEndCutoffDate(
              nextSaveState.europeSeasonYear ?? nextSaveState.currentSeasonYear
            )
          : `${nextSaveState.saSeasonYear ?? nextSaveState.currentSeasonYear}-12-31`;

        // CRITICAL: Before concluding the season, simulate remaining CPU matches with `stopAtUserFixture: true`!
        // If CPU group-stage or earlier-round results unlock a NEW knockout tie for the user
        // (e.g. Oitavas, Quartas, Semifinal, Final, Playoffs, or Intercontinental), DO NOT end the season!
        const probedAfterCpu = resolveCrossCompetitionScheduleConflicts(
          simulateCpuFixturesUpToDate(nextSaveState, seasonCutoffDate, true, {
            stopAtUserFixture: true,
            minCurrentDate: nextSaveState.currentDate,
            finishHemispherePools: isUserEuAtEnd ? 'EU' : 'SA_BR',
          })
        );
        const newlyUnlockedUserMatch = getUpcomingClubFixture(
          getAllFixturesFromSave(probedAfterCpu),
          probedAfterCpu.userClubId,
          probedAfterCpu.currentDate
        );

        if (newlyUnlockedUserMatch) {
          return probedAfterCpu;
        }

        if (hasRemainingPreCutoffSelecaoFixtures(probedAfterCpu)) {
          const summerNoticeId = `msg_selecao_summer_active_${probedAfterCpu.currentSeasonYear}`;
          if (!probedAfterCpu.inbox.some((m) => m.id === summerNoticeId)) {
            return {
              ...probedAfterCpu,
              inbox: [
                {
                  id: summerNoticeId,
                  title: 'Calendário de Seleções Ativo antes do Fim da Temporada!',
                  message:
                    'Você concluiu todos os compromissos do seu clube, mas sua Seleção ainda possui jogos oficiais agendados neste ciclo (Copa do Mundo, Copa Continental ou Eliminatórias)! Use o Calendário para avançar até a Data FIFA e comandar sua Seleção antes de encerrar a temporada.',
                  date: probedAfterCpu.currentDate,
                  round: probedAfterCpu.currentRound,
                  read: false,
                  type: 'NATIONAL_TEAM',
                },
                ...probedAfterCpu.inbox,
              ],
            };
          }
          return probedAfterCpu;
        }

        const fullyFinishedSeasonRaw = syncOffContinentCalendarRollover(
          syncNationalTeamByDate(probedAfterCpu, seasonCutoffDate, true)
        );
        const {
          updatedState: seasonWithIndAwards,
          newlyAwarded: seasonAwards,
        } = processSeasonEndIndividualAwards(fullyFinishedSeasonRaw);

        // Finalize season-end league & finance board goals
        const finalBoardSync = seasonWithIndAwards.managerCareer
          ? syncBoardGoalsAndBonuses(seasonWithIndAwards, seasonWithIndAwards.managerCareer, true)
          : null;
        const fullyFinishedSeason: GameSave = finalBoardSync
          ? {
              ...seasonWithIndAwards,
              clubs:
                finalBoardSync.newlyClaimedBonus > 0
                  ? seasonWithIndAwards.clubs.map((c) =>
                      c.id === seasonWithIndAwards.userClubId
                        ? {
                            ...c,
                            finances: recordFinanceLedgerMutation(c.finances, {
                              date: seasonWithIndAwards.currentDate,
                              category: 'PRIZES',
                              type: 'INCOME',
                              amount: finalBoardSync.newlyClaimedBonus,
                              description: `Bônus de metas da temporada (${seasonWithIndAwards.currentSeasonYear})`,
                              applyToBalance: true,
                            }),
                          }
                        : c
                    )
                  : seasonWithIndAwards.clubs,
              managerCareer: {
                ...seasonWithIndAwards.managerCareer!,
                seasonGoals: finalBoardSync.updatedGoals,
              },
              inbox: [...finalBoardSync.goalMessages, ...seasonWithIndAwards.inbox],
            }
          : seasonWithIndAwards;

        const userEndClub = fullyFinishedSeason.clubs.find(
          (c) => c.id === fullyFinishedSeason.userClubId
        );
        const endEuId = userEndClub ? getClubEuropeanLeagueId(userEndClub) : null;
        const endSaId = userEndClub ? getClubSouthAmericanLeagueId(userEndClub) : null;
        const endWlId = userEndClub ? getClubWorldLeagueId(userEndClub) : null;
        const champClubId =
          userEndClub?.division === 'EU' && endEuId
            ? fullyFinishedSeason.standingsEurope?.[endEuId]?.[0]?.teamId
            : userEndClub?.division === 'SA' && endSaId
            ? fullyFinishedSeason.standingsSouthAmerica?.[endSaId]?.[0]?.teamId
            : userEndClub?.division === 'WL' && endWlId
            ? resolveWorldLeagueChampionId(
                endWlId,
                fullyFinishedSeason.standingsWorldLeagues,
                fullyFinishedSeason.fixturesWorldLeagues
              )
            : fullyFinishedSeason.standingsA[0]?.teamId;
        const champClub = fullyFinishedSeason.clubs.find((c) => c.id === champClubId);
        const activeUserYear = isUserEuAtEnd
          ? prev.europeSeasonYear ?? prev.currentSeasonYear
          : prev.saSeasonYear ?? prev.currentSeasonYear;
        const prizeSettlementDate = isUserEuAtEnd
          ? `${activeUserYear + 1}-05-31`
          : `${activeUserYear}-12-31`;
        const { updatedState: fullyFinishedWithPrizes } = settleAllSeasonEndPrizes(
          fullyFinishedSeason,
          isUserEuAtEnd ? 'EU' : 'SA_BR',
          prizeSettlementDate
        );
        const userWonAnyThisYear = fullyFinishedWithPrizes.trophyHistory.some(
          (t) => t.year === activeUserYear && t.userWon
        );
        const { updatedState: auditedSeasonRaw, auditReport } =
          evaluateAndApplySeasonEndFinancialFairPlay(fullyFinishedWithPrizes);

        const { updatedState: auditedSeason, award: worldBallonDorAward } =
          processWorldBallonDorCeremony(
            auditedSeasonRaw,
            activeUserYear,
            isUserEuAtEnd ? `31/05/${activeUserYear + 1}` : `31/12/${activeUserYear}`
          );

        if (auditReport.wasSackedForFinances) {
          setTimeout(() => {
            setFinancialAuditModal(auditReport);
          }, 400);
          return auditedSeason;
        }

        setTimeout(() => {
          setSeasonEndModal({
            championName: champClub?.name || 'Campeão da Liga',
            userWon: userWonAnyThisYear || champClubId === prev.userClubId,
            seasonAwards,
            worldBallonDorAward,
            financialWarning: auditReport.warningOnlyMessage,
          });
        }, 400);
        return auditedSeason;
      }

      return nextSaveState;
    });
  };

  // Manual trigger to conclude season if all user fixtures are completed
  const handleFinishSeason = () => {
    setGameState((prev) => {
      if (!prev) return null;
      const activeUserForCutoff = prev.clubs.find((c) => c.id === prev.userClubId);
      const isUserEuAtEnd = isSplitCalendarClub(activeUserForCutoff);
      const seasonCutoffDate = isUserEuAtEnd
        ? getEuropeanSeasonEndCutoffDate(prev.europeSeasonYear ?? prev.currentSeasonYear)
        : `${prev.saSeasonYear ?? prev.currentSeasonYear}-12-31`;

      const probedSeason = resolveCrossCompetitionScheduleConflicts(
        simulateCpuFixturesUpToDate(prev, seasonCutoffDate, true, {
          stopAtUserFixture: true,
          minCurrentDate: prev.currentDate,
          finishHemispherePools: isUserEuAtEnd ? 'EU' : 'SA_BR',
        })
      );
      const pendingUserMatchBeforeEnd = getUpcomingClubFixture(
        getAllFixturesFromSave(probedSeason),
        probedSeason.userClubId,
        probedSeason.currentDate
      );
      if (pendingUserMatchBeforeEnd) {
        // A group-stage or knockout match is still unplayed or just unlocked -> abort season end so it gets played!
        return probedSeason;
      }

      const completedSeasonRaw = syncOffContinentCalendarRollover(
        syncNationalTeamByDate(probedSeason, seasonCutoffDate, true)
      );
      const {
        updatedState: seasonWithAwards,
        newlyAwarded: seasonAwards,
      } = processSeasonEndIndividualAwards(completedSeasonRaw);

      const finalBoardSync = seasonWithAwards.managerCareer
        ? syncBoardGoalsAndBonuses(seasonWithAwards, seasonWithAwards.managerCareer, true)
        : null;
      const completedSeason: GameSave = finalBoardSync
        ? {
            ...seasonWithAwards,
            clubs:
              finalBoardSync.newlyClaimedBonus > 0
                ? seasonWithAwards.clubs.map((c) =>
                    c.id === seasonWithAwards.userClubId
                      ? {
                          ...c,
                          finances: recordFinanceLedgerMutation(c.finances, {
                            date: seasonWithAwards.currentDate,
                            category: 'PRIZES',
                            type: 'INCOME',
                            amount: finalBoardSync.newlyClaimedBonus,
                            description: `Bônus de metas da temporada (${seasonWithAwards.currentSeasonYear})`,
                            applyToBalance: true,
                          }),
                        }
                      : c
                  )
                : seasonWithAwards.clubs,
            managerCareer: {
              ...seasonWithAwards.managerCareer!,
              seasonGoals: finalBoardSync.updatedGoals,
            },
            inbox: [...finalBoardSync.goalMessages, ...seasonWithAwards.inbox],
          }
        : seasonWithAwards;

      const activeUserYear = isUserEuAtEnd
        ? prev.europeSeasonYear ?? prev.currentSeasonYear
        : prev.saSeasonYear ?? prev.currentSeasonYear;
      const prizeSettlementDate = isUserEuAtEnd
        ? `${activeUserYear + 1}-05-31`
        : `${activeUserYear}-12-31`;
      const { updatedState: completedSeasonWithPrizes } = settleAllSeasonEndPrizes(
        completedSeason,
        isUserEuAtEnd ? 'EU' : 'SA_BR',
        prizeSettlementDate
      );

      const { updatedState: auditedSeasonRaw, auditReport } =
        evaluateAndApplySeasonEndFinancialFairPlay(completedSeasonWithPrizes);
      const { updatedState: auditedSeason, award: worldBallonDorAward } =
        processWorldBallonDorCeremony(
          auditedSeasonRaw,
          activeUserYear,
          isUserEuAtEnd ? `31/05/${activeUserYear + 1}` : `31/12/${activeUserYear}`
        );

      if (auditReport.wasSackedForFinances) {
        setFinancialAuditModal(auditReport);
        return auditedSeason;
      }

      const userEndClub = auditedSeason.clubs.find((c) => c.id === auditedSeason.userClubId);
      const endEuId = userEndClub ? getClubEuropeanLeagueId(userEndClub) : null;
      const endSaId = userEndClub ? getClubSouthAmericanLeagueId(userEndClub) : null;
      const endWlId = userEndClub ? getClubWorldLeagueId(userEndClub) : null;
      const champClubId =
        userEndClub?.division === 'EU' && endEuId
          ? auditedSeason.standingsEurope?.[endEuId]?.[0]?.teamId
          : userEndClub?.division === 'SA' && endSaId
          ? auditedSeason.standingsSouthAmerica?.[endSaId]?.[0]?.teamId
          : userEndClub?.division === 'WL' && endWlId
          ? resolveWorldLeagueChampionId(
              endWlId,
              auditedSeason.standingsWorldLeagues,
              auditedSeason.fixturesWorldLeagues
            )
          : auditedSeason.standingsA[0]?.teamId;
      const champClub = auditedSeason.clubs.find((c) => c.id === champClubId);
      const userWonAnyThisYear = auditedSeason.trophyHistory.some(
        (t) => t.year === activeUserYear && t.userWon
      );
      setSeasonEndModal({
        championName: champClub?.name || 'Campeão da Liga',
        userWon: userWonAnyThisYear || champClubId === prev.userClubId,
        seasonAwards,
        worldBallonDorAward,
        financialWarning: auditReport.warningOnlyMessage,
      });
      return auditedSeason;
    });
  };

  // Start Next Season (01/08 para calendário europeu split-year; 15/01 para calendário sul-americano/brasileiro!)
  const handleStartNextSeason = (overrideJobOfferId?: string) => {
    soundEngine.playFanfare();
    setSeasonEndModal(null);
    setFinancialAuditModal(null);

    setGameState((prev) => {
      if (!prev) return null;

      const prevUserClub = prev.clubs.find((c) => c.id === prev.userClubId);
      const wasPrevEu = isSplitCalendarClub(prevUserClub);

      let basePrev = prev;
      if (typeof overrideJobOfferId === 'string' && overrideJobOfferId) {
        const switched = acceptManagerJobOffer(
          prev,
          overrideJobOfferId,
          'Demitido pela Diretoria'
        );
        basePrev = syncCarouselAfterUserClubSwitch(
          prev,
          switched,
          'Demitido pela Diretoria'
        );
      }

      const protectedPendingIds = new Set<string>();
      (basePrev.pendingTransfers || []).forEach((d) => {
        protectedPendingIds.add(d.playerId);
        if (d.swapOutPlayerId) protectedPendingIds.add(d.swapOutPlayerId);
      });

      // =========================================================================
      // BRANCH A: User just concluded a EUROPEAN season (May `curEuYear + 1` -> Aug 1 `curEuYear + 1`)
      // =========================================================================
      if (wasPrevEu) {
        const curEuYear = basePrev.europeSeasonYear ?? basePrev.currentSeasonYear;
        const euCutoff = getEuropeanSeasonEndCutoffDate(curEuYear);
        const nextSeasonPreSimDate = getEuropeanSeasonStartDate(curEuYear + 1); // `${curEuYear + 1}-08-01`
        const completedPrevClubs = syncOffContinentCalendarRollover(
          simulateCpuFixturesUpToDate(basePrev, euCutoff, true, {
            finishHemispherePools: 'EU',
          })
        );
        // Simulate any June–July quadrennial World Cup / Continental Cup ties before August 1st so summer tournaments crown champions
        const completedPrevRaw = syncNationalTeamByDate(
          completedPrevClubs,
          nextSeasonPreSimDate,
          false
        );
        const { updatedState: completedPrevInd } =
          processSeasonEndIndividualAwards(completedPrevRaw);
        const { updatedState: completedPrev } = processWorldBallonDorCeremony(
          completedPrevInd,
          curEuYear,
          `31/05/${curEuYear + 1}`
        );

        const euHistorySnapshot = recordCompletedSeasonHistory(
          {
            ...completedPrev,
            europeSeasonYear: curEuYear,
          },
          'EU'
        );

        const nextEuYear = curEuYear + 1;
        const activeSaYear = completedPrev.saSeasonYear ?? nextEuYear;
        const nextSeasonStartDate = getEuropeanSeasonStartDate(nextEuYear); // `${nextEuYear}-08-01`
        const nextEuLabel = formatEuropeanSeason(nextEuYear);

        const {
          trophies: uefaCupTrophies,
          uclChampId,
          uelChampId,
          ueclChampId,
        } = buildUefaCupTrophyRecords(
          completedPrev.clubs,
          curEuYear,
          completedPrev.userClubId,
          completedPrev.fixturesChampionsLeague,
          completedPrev.fixturesEuropaLeague,
          completedPrev.fixturesConferenceLeague
        );

        const { updatedState: completedPrevSettledEu } = settleAllSeasonEndPrizes(
          completedPrev,
          'EU',
          `${curEuYear + 1}-05-31`
        );

        const euEndResult = awardEuropeanLeagueEndPrizes({
          clubs: completedPrevSettledEu.clubs,
          standingsEurope: completedPrevSettledEu.standingsEurope,
          userClubId: completedPrevSettledEu.userClubId,
          seasonYear: curEuYear,
          currentDate: `31/05/${curEuYear + 1}`,
          skipFinancialCredit: true,
        });

        const splitWlEndResult = awardWorldLeagueEndPrizes(
          completedPrevSettledEu.standingsWorldLeagues,
          euEndResult.updatedClubs,
          completedPrevSettledEu.userClubId,
          curEuYear,
          `31/05/${curEuYear + 1}`,
          completedPrevSettledEu.fixturesWorldLeagues,
          SPLIT_YEAR_WORLD_LEAGUE_IDS,
          true
        );

        const afcChampId = resolveCupChampionId(completedPrev.fixturesAfcChampions);
        const afcFinalFix = completedPrev.fixturesAfcChampions?.find((f) => f.id === 'afc_final');
        const afcTrophy: TrophyRecord[] = [];
        if (afcFinalFix && afcFinalFix.played && afcChampId) {
          const afcChampClub = completedPrev.clubs.find((c) => c.id === afcChampId);
          const afcRunnerId =
            afcFinalFix.homeTeamId === afcChampId ? afcFinalFix.awayTeamId : afcFinalFix.homeTeamId;
          const afcRunnerClub = completedPrev.clubs.find((c) => c.id === afcRunnerId);
          if (afcChampClub) {
            afcTrophy.push({
              year: curEuYear,
              seasonLabel: nextEuLabel ? formatEuropeanSeason(curEuYear) : String(curEuYear),
              competition: 'Liga dos Campeões de Elite da AFC',
              championTeamName: afcChampClub.name,
              runnerUpTeamName: afcRunnerClub?.name || 'Vice-Campeão',
              userWon: afcChampId === completedPrev.userClubId,
            });
          }
        }

        const engPyramidResult = applyEnglishPyramidPromotionRelegation(
          splitWlEndResult.updatedClubs,
          completedPrev.standingsEurope,
          completedPrev.fixturesEurope
        );

        const {
          updatedClubs: lifecycleClubs,
          updatedFreeAgents,
          lifecycleInboxMessages,
          newlyMintedCoaches,
        } = processAnnualSquadLifecycle(
          engPyramidResult.updatedClubs,
          completedPrev.transferMarket,
          completedPrev.userClubId,
          curEuYear,
          nextSeasonStartDate,
          protectedPendingIds,
          'SA_BR'
        );

        const promotedClubIdsSet = new Set<string>(engPyramidResult.promotedClubIds);
        const relegatedClubIdsSet = new Set<string>(engPyramidResult.relegatedClubIds);
        if (uclChampId) promotedClubIdsSet.add(uclChampId);
        if (afcChampId) promotedClubIdsSet.add(afcChampId);
        EUROPEAN_LEAGUE_IDS.forEach((lid) => {
          const cid = completedPrev.standingsEurope?.[lid]?.[0]?.teamId;
          if (cid) promotedClubIdsSet.add(cid);
        });
        SPLIT_YEAR_WORLD_LEAGUE_IDS.forEach((lid) => {
          const cid = resolveWorldLeagueChampionId(
            lid,
            completedPrev.standingsWorldLeagues,
            completedPrev.fixturesWorldLeagues
          );
          if (cid) promotedClubIdsSet.add(cid);
        });

        const clubsAfterYouthRolloverEu = lifecycleClubs.map((c) =>
          processAnnualYouthAcademyRollover(c)
        );
        const youthTurned16MsgsEu = buildYouthTurned16InboxMessages(
          lifecycleClubs.find((c) => c.id === completedPrev.userClubId),
          clubsAfterYouthRolloverEu.find((c) => c.id === completedPrev.userClubId),
          nextSeasonStartDate,
          1
        );

        const ratingsTransitionedClubs = applySeasonEndRatingsTransition(
          clubsAfterYouthRolloverEu,
          promotedClubIdsSet,
          relegatedClubIdsSet
        );

        const updatedClubs = resetClubsFinancesForNewSeason(
          ratingsTransitionedClubs,
          nextEuYear,
          nextSeasonStartDate,
          'EU'
        );

        const applyInitialPointDeductions = (list: Standing[]): Standing[] =>
          list
            .map((st) => {
              const clubObj = updatedClubs.find((c) => c.id === st.teamId);
              const pun = clubObj?.finances.activePunishment;
              const ded =
                pun && pun.seasonYearApplied === nextEuYear && pun.pointsDeducted > 0
                  ? pun.pointsDeducted
                  : 0;
              return ded > 0 ? { ...st, points: -ded } : st;
            })
            .sort((a, b) => b.points - a.points);

        const euNextSeasonData = generateAllEuropeanLeagues(updatedClubs, nextEuYear);
        for (const leagueId of EUROPEAN_LEAGUE_IDS) {
          euNextSeasonData.standingsEurope[leagueId] = applyInitialPointDeductions(
            euNextSeasonData.standingsEurope[leagueId]
          );
        }
        const splitWlNextSeasonData = generateAllWorldLeaguesData(
          updatedClubs,
          nextEuYear,
          SPLIT_YEAR_WORLD_LEAGUE_IDS
        );
        for (const leagueId of SPLIT_YEAR_WORLD_LEAGUE_IDS) {
          splitWlNextSeasonData.standingsWorldLeagues[leagueId] = applyInitialPointDeductions(
            splitWlNextSeasonData.standingsWorldLeagues[leagueId]
          );
        }

        const faCupChampId = resolveCupChampionId(completedPrev.fixturesEngFaCup);
        const euDomesticCupChampions: Partial<Record<EuropeanCupId, string>> = {};
        if (completedPrev.fixturesEuropeanCups) {
          for (const [k, fixList] of Object.entries(completedPrev.fixturesEuropeanCups)) {
            const champ = resolveCupChampionId(fixList);
            if (champ) euDomesticCupChampions[k as EuropeanCupId] = champ;
          }
        }

        const uefaQualifiers = computeUefaContinentalQualifiers({
          clubs: updatedClubs,
          standingsEurope: completedPrev.standingsEurope,
          uclTitleHolderId: uclChampId,
          uelTitleHolderId: uelChampId,
          ueclTitleHolderId: ueclChampId,
          faCupChampionId: faCupChampId,
          domesticCupChampions: euDomesticCupChampions,
        });

        const afcData = generateAfcChampionsFixtures(
          updatedClubs,
          nextEuYear,
          completedPrev.standingsWorldLeagues,
          afcChampId || completedPrev.reigningAfcChampId
        );
        const uclData = generateChampionsLeagueFixtures(
          updatedClubs,
          nextEuYear,
          uefaQualifiers.championsLeagueIds,
          uclChampId
        );
        const uelData = generateEuropaLeagueFixtures(
          updatedClubs,
          nextEuYear,
          uefaQualifiers.europaLeagueIds,
          uelChampId
        );
        const ueclData = generateConferenceLeagueFixtures(
          updatedClubs,
          nextEuYear,
          uefaQualifiers.conferenceLeagueIds,
          ueclChampId
        );

        const effectiveReigningUcl = uclChampId || completedPrev.reigningUclChampId;
        const effectiveReigningAfc = afcChampId || completedPrev.reigningAfcChampId;
        const updatedIntercont = (completedPrev.fixturesIntercontinental || []).map((f) => {
          if (f.id.startsWith('intercont_final') && !f.played && effectiveReigningUcl) {
            return { ...f, homeTeamId: effectiveReigningUcl };
          }
          if (f.id.startsWith('intercont_q2') && !f.played && effectiveReigningAfc) {
            return { ...f, homeTeamId: effectiveReigningAfc };
          }
          return f;
        });

        const mergedTrophyHistory = mergeUniqueTrophies(completedPrev.trophyHistory, [
          ...euEndResult.newTrophies,
          ...uefaCupTrophies,
          ...afcTrophy,
          ...euHistorySnapshot.officialTrophies,
        ]);

        const trophiesWonThisYear = mergedTrophyHistory.filter(
          (t) => t.year === curEuYear && t.userWon
        ).length;

        const euChampIdsForRep: string[] = [];
        const euTop4IdsForRep: string[] = [];
        if (uclChampId) euChampIdsForRep.push(uclChampId);
        if (afcChampId) euChampIdsForRep.push(afcChampId);
        EUROPEAN_LEAGUE_IDS.forEach((lid) => {
          const table = completedPrev.standingsEurope?.[lid] || [];
          if (table[0]?.teamId) euChampIdsForRep.push(table[0].teamId);
          table.slice(1, 4).forEach((s) => {
            if (s.teamId) euTop4IdsForRep.push(s.teamId);
          });
        });
        SPLIT_YEAR_WORLD_LEAGUE_IDS.forEach((lid) => {
          const cid = resolveWorldLeagueChampionId(
            lid,
            completedPrev.standingsWorldLeagues,
            completedPrev.fixturesWorldLeagues
          );
          if (cid) euChampIdsForRep.push(cid);
        });
        const euDynRepResult = applySeasonalClubReputationUpdates({
          clubs: updatedClubs,
          userClubId: completedPrev.userClubId,
          seasonYear: curEuYear,
          seasonDisplayLabel: formatEuropeanSeason(curEuYear),
          dateFormatted: `01/08/${nextEuYear}`,
          trophiesThisSeason: mergedTrophyHistory,
          championClubIds: euChampIdsForRep,
          runnerUpOrTop4ClubIds: euTop4IdsForRep,
          promotedClubIds: engPyramidResult.promotedClubIds,
          relegatedClubIds: engPyramidResult.relegatedClubIds,
          scopeDivisions: ['EU', 'WL'],
        });

        const nextUserClubObj = updatedClubs.find((c) => c.id === completedPrev.userClubId);
        const isStillEu = isSplitCalendarClub(nextUserClubObj);
        const nextEuId = nextUserClubObj ? getClubEuropeanLeagueId(nextUserClubObj) : null;
        const nextSaId = nextUserClubObj ? getClubSouthAmericanLeagueId(nextUserClubObj) : null;
        const nextWlId = nextUserClubObj ? getClubWorldLeagueId(nextUserClubObj) : null;
        const nextUserStartDate = getSplitSeasonStartDate(
          nextEuYear,
          nextWlId === 'rus_premier'
        );
        const nextTotalRounds = nextEuId
          ? EUROPEAN_LEAGUES_META[nextEuId].totalRounds
          : nextSaId
          ? SOUTH_AMERICAN_LEAGUES_META[nextSaId].totalRounds
          : nextWlId
          ? WORLD_LEAGUES_META[nextWlId].totalRounds
          : nextUserClubObj?.division === 'C'
          ? 46
          : nextUserClubObj?.division === 'EST'
          ? getEstadualTotalRounds(getClubEstadualConfig(nextUserClubObj))
          : 38;

        const newSeasonMsg: InboxMessage = {
          id: `msg_new_eu_season_${nextEuYear}`,
          title: `Temporada ${nextEuLabel} Aberta: Europa, Ásia/Rússia & Copas Continentais!`,
          message: `Começa hoje (${
            nextWlId === 'rus_premier' ? '24/07' : '01/08'
          }/${nextEuYear}) a temporada oficial ${nextEuLabel} da Europa, Arábia Saudita, Japão e Rússia até Maio de ${
            nextEuYear + 1
          }! Janela aberta, ligas sorteadas e participantes da Champions League, Europa, Conference e AFC Champions League Elite definidos!`,
          date: `${nextWlId === 'rus_premier' ? '24/07' : '01/08'}/${nextEuYear}`,
          round: 1,
          read: false,
          type: 'BOARD',
        };

        const engCupsNextSeason = generateAllEnglishCupsFixtures(updatedClubs, nextEuYear, {
          fixturesEurope: euNextSeasonData.fixturesEurope,
          plChampionId: completedPrev.standingsEurope?.eng_premier?.[0]?.teamId,
          faCupChampionId: faCupChampId,
        });
        const uefaSupercupNextSeason = generateUefaSupercupFixtures(
          updatedClubs,
          nextEuYear,
          effectiveReigningUcl,
          uelChampId || completedPrev.reigningUelChampId
        );
        const euCupsNextSeason = generateAllEuropeanCupsFixtures(updatedClubs, nextEuYear, {
          fixturesEurope: euNextSeasonData.fixturesEurope,
        });
        const splitWlCupsNextSeason = generateAllWorldCupsFixtures(
          updatedClubs,
          activeSaYear,
          nextEuYear,
          {
            targetCupIds: SPLIT_YEAR_WORLD_CUP_IDS,
            fixturesWorldLeagues: {
              ...(completedPrev.fixturesWorldLeagues || {}),
              ...splitWlNextSeasonData.fixturesWorldLeagues,
            },
            fixturesAfcChampions: afcData.fixtures,
            fixturesCopaInternacional: completedPrev.fixturesCopaInternacional,
          }
        );

        const nextSeasonDraft: GameSave = {
          ...completedPrev,
          settledPrizeSeasonKeys: completedPrevSettledEu.settledPrizeSeasonKeys,
          calendarVersion: 6,
          afcChampions2026Version: CURRENT_AFC_CHAMPIONS_2026_VERSION,
          currentSeasonYear: isStillEu ? nextEuYear : activeSaYear,
          europeSeasonYear: nextEuYear,
          saSeasonYear: activeSaYear,
          reigningUclChampId: effectiveReigningUcl,
          reigningUelChampId: uelChampId || completedPrev.reigningUelChampId,
          reigningUeclChampId: ueclChampId || completedPrev.reigningUeclChampId,
          reigningAfcChampId: effectiveReigningAfc,
          currentRound: 1,
          totalRounds: nextTotalRounds,
          currentDate: nextUserStartDate,
          clubs: euDynRepResult.updatedClubs,
          fixturesEurope: euNextSeasonData.fixturesEurope,
          standingsEurope: euNextSeasonData.standingsEurope,
          fixturesWorldLeagues: {
            ...(completedPrev.fixturesWorldLeagues || {}),
            ...splitWlNextSeasonData.fixturesWorldLeagues,
          },
          standingsWorldLeagues: {
            ...(completedPrev.standingsWorldLeagues || {}),
            ...splitWlNextSeasonData.standingsWorldLeagues,
          },
          fixturesWorldCups: {
            ...(completedPrev.fixturesWorldCups || {}),
            ...splitWlCupsNextSeason,
          },
          fixturesAfcChampions: afcData.fixtures,
          standingsAfcChampions: afcData.standings,
          fixturesChampionsLeague: uclData.fixtures,
          standingsChampionsLeague: uclData.standings,
          fixturesEuropaLeague: uelData.fixtures,
          standingsEuropaLeague: uelData.standings,
          fixturesConferenceLeague: ueclData.fixtures,
          standingsConferenceLeague: ueclData.standings,
          fixturesUefaSupercup: uefaSupercupNextSeason,
          fixturesEngCommunityShield: engCupsNextSeason.fixturesEngCommunityShield,
          fixturesEngEflCup: engCupsNextSeason.fixturesEngEflCup,
          fixturesEngFaCup: engCupsNextSeason.fixturesEngFaCup,
          fixturesEuropeanCups: euCupsNextSeason,
          fixturesIntercontinental: updatedIntercont,
          fixturesFriendlies: [],
          trophyHistory: mergedTrophyHistory,
          seasonHistoryArchive: euHistorySnapshot.updatedArchive,
          transferMarket: updatedFreeAgents,
          drawnCompetitions: [],
          inbox: [
            ...euDynRepResult.inboxMessages,
            ...euEndResult.inboxMessages,
            ...splitWlEndResult.inboxMessages,
            ...youthTurned16MsgsEu,
            ...lifecycleInboxMessages,
            newSeasonMsg,
            ...completedPrev.inbox,
          ],
        };

        // Enforce 66h minimum match rest across all competitions before simulating SA CPU matches!
        const resolvedNextSeasonDraft = resolveCrossCompetitionScheduleConflicts(nextSeasonDraft);

        // Simulate South America's CPU matches between June 10 and July 31 so SA stays live up to August 1!
        const caughtUpDraft = simulateCpuFixturesUpToDate(
          resolvedNextSeasonDraft,
          nextSeasonStartDate,
          false
        );

        const baseCarousel = ensureCoachingCarouselState(caughtUpDraft);
        const existingCoachIds = new Set(baseCarousel.freeAgentCoaches.map((c) => c.id));
        const mergedFreeCoaches = [
          ...newlyMintedCoaches.filter((c) => !existingCoachIds.has(c.id)),
          ...baseCarousel.freeAgentCoaches,
        ];

        const nextSeasonReady: GameSave = alignCareerStateAfterClubSwitch({
          ...caughtUpDraft,
          managerCareer: refreshCareerForNewSeason(caughtUpDraft, trophiesWonThisYear),
          coachingCarousel: {
            ...baseCarousel,
            freeAgentCoaches: mergedFreeCoaches,
          },
          lockerRoom: ensureLockerRoomState(caughtUpDraft),
          nationalTeam: refreshNationalTeamForNewSeason(
            completedPrev.nationalTeam,
            caughtUpDraft.clubs,
            nextEuYear
          ),
        });

        return processTransferWindowTransitions(completedPrev.currentDate, nextSeasonReady, {
          isNewSeasonTurn: true,
        });
      }

      // =========================================================================
      // BRANCH B: User just concluded a SOUTH AMERICAN / BRAZILIAN season (Dec `curSaYear` -> Jan 15 `curSaYear + 1`)
      // Preserves Europe's in-progress `activeEuYear / (activeEuYear + 1)` season for its Jan..May climax!
      // =========================================================================
      const curSaYear = basePrev.saSeasonYear ?? basePrev.currentSeasonYear;
      const completedPrevRaw = syncOffContinentCalendarRollover(
        syncNationalTeamByDate(
          simulateCpuFixturesUpToDate(basePrev, `${curSaYear}-12-31`, true, {
            finishHemispherePools: 'SA_BR',
          }),
          `${curSaYear}-12-31`,
          true
        )
      );
      const { updatedState: completedPrevInd } =
        processSeasonEndIndividualAwards(completedPrevRaw);
      const { updatedState: completedPrev } = processWorldBallonDorCeremony(
        completedPrevInd,
        curSaYear,
        `31/12/${curSaYear}`
      );

      const saHistorySnapshot = recordCompletedSeasonHistory(
        {
          ...completedPrev,
          saSeasonYear: curSaYear,
        },
        'SA_BR'
      );

      const nextYear = curSaYear + 1;
      const activeEuYear = completedPrev.europeSeasonYear ?? curSaYear;
      const nextSeasonStartDate = getSeasonStartDate(nextYear); // `${nextYear}-01-15`

      // Extract real champions from the completed SA/BR season for February's Supercopa & Recopa!
      const serieAChampId = completedPrev.standingsA[0]?.teamId;
      const serieARunnerUpId = completedPrev.standingsA[1]?.teamId;
      const copaBrasilChampId = resolveCupChampionId(completedPrev.fixturesCopaBrasil);
      const libertadoresChampId = resolveCupChampionId(completedPrev.fixturesLibertadores);
      const sulamericanaChampId = resolveCupChampionId(completedPrev.fixturesSulamericana);
      const copaInternacionalChampId = resolveCupChampionId(completedPrev.fixturesCopaInternacional);

      // Promotion & Relegation across Série A (20) <-> B (20), B (20) <-> C (24), C (24) <-> D (96)
      const relegatedA = completedPrev.standingsA.slice(-4).map((s) => s.teamId);
      const promotedB = resolveSerieBPromotedIds(completedPrev.standingsB, completedPrev.fixturesB);
      const relegatedB = completedPrev.standingsB.slice(-4).map((s) => s.teamId);
      const promotedC = resolveSerieCPromotedIds(completedPrev.standingsC, completedPrev.fixturesC);
      const relegatedC = (completedPrev.standingsC || []).slice(-4).map((s) => s.teamId);
      const promotedD = resolveSerieDPromotedIds(completedPrev.fixturesD, completedPrev.standingsD);

      const baseBrDivisionAdjustedClubs = completedPrev.clubs.map((c) => {
        if (c.division === 'EU' || c.division === 'SA' || c.division === 'WL') return c;
        let newDiv = c.division;
        if (relegatedA.includes(c.id)) newDiv = 'B';
        else if (promotedB.includes(c.id)) newDiv = 'A';
        else if (relegatedB.includes(c.id) && promotedC.length === 4) newDiv = 'C';
        else if (promotedC.includes(c.id)) newDiv = 'B';
        else if (relegatedC.includes(c.id) && promotedD.length === 4) newDiv = 'D';
        else if (promotedD.includes(c.id)) newDiv = 'C';

        return {
          ...c,
          division: newDiv,
        };
      });

      const serieCChampId = completedPrev.standingsC?.[0]?.teamId;
      const serieDChampId = resolveCupChampionId(completedPrev.fixturesD);
      const copaNordesteChampId = resolveCupChampionId(completedPrev.fixturesCopaNordeste);
      const copaVerdeChampId = resolveCupChampionId(completedPrev.fixturesCopaVerde);

      const cdbRunnerUpId = resolveCupRunnerUpId(completedPrev.fixturesCopaBrasil);
      const domesticCupChamps: Partial<Record<SouthAmericanCupId, string>> = {};
      if (completedPrev.fixturesSouthAmericanCups) {
        for (const [cId, fixList] of Object.entries(completedPrev.fixturesSouthAmericanCups)) {
          const champ = resolveCupChampionId(fixList);
          if (champ) domesticCupChamps[cId as SouthAmericanCupId] = champ;
        }
      }

      // Sistema Real de Classificação CONMEBOL (calculado antes dos Estaduais para aplicar o repasse automático de vagas por mérito!)
      const conmebolQualifiers = computeConmebolContinentalQualifiers({
        clubs: baseBrDivisionAdjustedClubs,
        standingsA: completedPrev.standingsA,
        standingsSouthAmerica: completedPrev.standingsSouthAmerica,
        libertadoresChampId,
        sulamericanaChampId,
        copaBrasilChampId,
        copaBrasilRunnerUpId: cdbRunnerUpId,
        domesticCupChampions: domesticCupChamps,
      });

      const qualifiedLibBrIds = conmebolQualifiers.libertadoresEntries
        .filter((e) => e.country === 'Brasil')
        .map((e) => e.clubId);
      const qualifiedSulaBrIds = conmebolQualifiers.sulamericanaEntries
        .filter((e) => e.country === 'Brasil')
        .map((e) => e.clubId);

      const estadualMeritCtx = buildEstadualQualificationMeritContext({
        clubs: baseBrDivisionAdjustedClubs,
        relegatedFromCIds: relegatedC,
        fixturesD: completedPrev.fixturesD,
        standingsD: completedPrev.standingsD,
        copaBrasilChampId,
        copaNordesteChampId,
        copaVerdeChampId,
        serieCChampId,
        serieDChampId,
        libertadoresBrIds: qualifiedLibBrIds,
        sulamericanaBrIds: qualifiedSulaBrIds,
      });

      const allEstClass = resolveAllEstaduaisFinalClassifications(
        completedPrev.fixturesEstadual,
        completedPrev.standingsEstadual,
        baseBrDivisionAdjustedClubs,
        estadualMeritCtx
      );
      const potiguarClass = resolvePotiguarFinalClassification(
        completedPrev.fixturesEstadual,
        completedPrev.standingsEstadual,
        baseBrDivisionAdjustedClubs,
        estadualMeritCtx
      );
      const brDivisionAdjustedClubs = applyAllEstaduaisQualificationsAndRebalanceSerieD(
        baseBrDivisionAdjustedClubs,
        allEstClass,
        completedPrev.standingsD,
        relegatedC,
        completedPrev.userClubId,
        completedPrev.fixturesD
      );
      const regionalTrophies = buildRegionalCupTrophyRecords(
        brDivisionAdjustedClubs,
        curSaYear,
        completedPrev.userClubId,
        potiguarClass,
        completedPrev.fixturesCopaNordeste,
        allEstClass,
        completedPrev.fixturesCopaVerde
      );

      // Premiações e Campeões oficiais das 9 Ligas Nacionais da América do Sul + 7 Ligas da América do Norte, Ásia/Rússia e África
      const { updatedState: completedPrevSettledSa } = settleAllSeasonEndPrizes(
        {
          ...completedPrev,
          clubs: brDivisionAdjustedClubs,
        },
        'SA_BR',
        `${curSaYear}-12-15`
      );

      const saEndResult = awardSouthAmericanLeagueEndPrizes({
        clubs: completedPrevSettledSa.clubs,
        standingsSouthAmerica: completedPrevSettledSa.standingsSouthAmerica,
        userClubId: completedPrevSettledSa.userClubId,
        seasonYear: curSaYear,
        endDate: `15/12/${curSaYear}`,
        skipFinancialCredit: true,
      });

      const wlEndResult = awardWorldLeagueEndPrizes(
        completedPrevSettledSa.standingsWorldLeagues,
        saEndResult.updatedClubs,
        completedPrevSettledSa.userClubId,
        curSaYear,
        `15/12/${curSaYear}`,
        completedPrevSettledSa.fixturesWorldLeagues,
        JAN_DEC_WORLD_LEAGUE_IDS,
        true
      );

      // Annual Aging (+1 year), Contract Decrement (-1), Pre-Contract Moves, Expirations, Regens & Ex-Players becoming Coaches
      // Preserves mid-season match/goal/card stats for European clubs!
      const {
        updatedClubs: lifecycleClubs,
        updatedFreeAgents,
        lifecycleInboxMessages,
        newlyMintedCoaches,
      } = processAnnualSquadLifecycle(
        wlEndResult.updatedClubs,
        completedPrev.transferMarket,
        completedPrev.userClubId,
        curSaYear,
        nextSeasonStartDate,
        protectedPendingIds,
        'EU'
      );

      const divOrderRank: Record<string, number> = { A: 1, B: 2, C: 3, D: 4, EST: 5 };
      const prevDivLookup = new Map(completedPrev.clubs.map((c) => [c.id, c.division]));
      const promotedClubIdsSet = new Set<string>();
      const relegatedClubIdsSet = new Set<string>();
      brDivisionAdjustedClubs.forEach((c) => {
        const oldDiv = prevDivLookup.get(c.id);
        if (oldDiv && divOrderRank[c.division] && divOrderRank[oldDiv]) {
          if (divOrderRank[c.division] < divOrderRank[oldDiv]) promotedClubIdsSet.add(c.id);
          else if (divOrderRank[c.division] > divOrderRank[oldDiv]) relegatedClubIdsSet.add(c.id);
        }
      });
      if (serieAChampId) promotedClubIdsSet.add(serieAChampId);
      saEndResult.championClubIds.forEach((cid) => promotedClubIdsSet.add(cid));
      for (const lid of JAN_DEC_WORLD_LEAGUE_IDS) {
        const wlChamp = resolveWorldLeagueChampionId(
          lid,
          completedPrev.standingsWorldLeagues,
          completedPrev.fixturesWorldLeagues
        );
        if (wlChamp) promotedClubIdsSet.add(wlChamp);
      }

      const clubsAfterYouthRolloverSa = lifecycleClubs.map((c) =>
        processAnnualYouthAcademyRollover(c)
      );
      const youthTurned16MsgsSa = buildYouthTurned16InboxMessages(
        lifecycleClubs.find((c) => c.id === completedPrev.userClubId),
        clubsAfterYouthRolloverSa.find((c) => c.id === completedPrev.userClubId),
        nextSeasonStartDate,
        1
      );

      const ratingsTransitionedClubs = applySeasonEndRatingsTransition(
        clubsAfterYouthRolloverSa,
        promotedClubIdsSet,
        relegatedClubIdsSet
      );

      const updatedClubs = resetClubsFinancesForNewSeason(
        ratingsTransitionedClubs,
        nextYear,
        nextSeasonStartDate,
        'SA_BR'
      );

      const serieAClubs = updatedClubs.filter((c) => c.division === 'A').map((c) => c.id);
      const serieBClubs = updatedClubs.filter((c) => c.division === 'B').map((c) => c.id);
      const serieCClubs = updatedClubs.filter((c) => c.division === 'C').map((c) => c.id);

      const fixturesA = generateLeagueSchedule(serieAClubs, 'serie_a', nextYear);
      const fixturesB = generateLeagueSchedule(serieBClubs, 'serie_b', nextYear);
      const fixturesC = generateLeagueSchedule(serieCClubs, 'serie_c', nextYear);
      const serieDData = generateSerieDFixturesAndStandings(updatedClubs, nextYear);
      const saNextSeasonData = generateAllSouthAmericanLeagues(updatedClubs, nextYear);
      const wlNextSeasonData = generateAllWorldLeaguesData(
        updatedClubs,
        nextYear,
        JAN_DEC_WORLD_LEAGUE_IDS
      );
      const cintData = generateCopaInternacionalFixtures(
        updatedClubs,
        nextYear,
        completedPrev.standingsWorldLeagues,
        copaInternacionalChampId
      );
      const concacafData = generateConcacafChampionsFixtures(
        updatedClubs,
        nextYear,
        completedPrev.standingsWorldLeagues,
        completedPrev.fixturesWorldLeagues
      );

      const applyInitialPointDeductions = (list: Standing[]): Standing[] =>
        list
          .map((st) => {
            const clubObj = updatedClubs.find((c) => c.id === st.teamId);
            const pun = clubObj?.finances.activePunishment;
            const ded =
              pun && pun.seasonYearApplied === nextYear && pun.pointsDeducted > 0
                ? pun.pointsDeducted
                : 0;
            return ded > 0 ? { ...st, points: -ded } : st;
          })
          .sort((a, b) => b.points - a.points);

      const standingsA = applyInitialPointDeductions(generateInitialStandings(serieAClubs));
      const standingsB = applyInitialPointDeductions(generateInitialStandings(serieBClubs));
      const standingsC = applyInitialPointDeductions(generateInitialStandings(serieCClubs));
      serieDData.standings = applyInitialPointDeductions(serieDData.standings);
      for (const leagueId of SOUTH_AMERICAN_LEAGUE_IDS) {
        saNextSeasonData.standingsSouthAmerica[leagueId] = applyInitialPointDeductions(
          saNextSeasonData.standingsSouthAmerica[leagueId]
        );
      }
      for (const leagueId of JAN_DEC_WORLD_LEAGUE_IDS) {
        wlNextSeasonData.standingsWorldLeagues[leagueId] = applyInitialPointDeductions(
          wlNextSeasonData.standingsWorldLeagues[leagueId]
        );
      }

      const libData = generateLibertadoresFixtures(
        updatedClubs,
        nextYear,
        qualifiedLibBrIds,
        conmebolQualifiers.libertadoresIds,
        libertadoresChampId
      );
      const sulaData = generateSulamericanaFixtures(
        updatedClubs,
        nextYear,
        qualifiedSulaBrIds,
        qualifiedLibBrIds,
        conmebolQualifiers.sulamericanaIds
      );
      const cdbPhase3Champs = [
        copaNordesteChampId,
        copaVerdeChampId,
        serieCChampId,
        serieDChampId,
      ].filter((id): id is string => Boolean(id));
      const cdbFixtures = generateCopaBrasilFixtures(
        updatedClubs,
        nextYear,
        allEstClass.allCopaBrasilQualifiedIds,
        cdbPhase3Champs
      );
      const copaNordesteData = generateCopaNordesteFixtures(
        updatedClubs,
        nextYear,
        allEstClass.allCopaNordesteQualifiedIds
      );
      const copaVerdeData = generateCopaVerdeFixtures(
        updatedClubs,
        nextYear,
        allEstClass.allCopaVerdeQualifiedIds
      );
      const supercopaFixtures = generateSupercopaFixtures(
        updatedClubs,
        nextYear,
        serieAChampId,
        copaBrasilChampId,
        serieARunnerUpId
      );
      const recopaFixtures = generateRecopaFixtures(
        updatedClubs,
        nextYear,
        libertadoresChampId,
        sulamericanaChampId
      );
      const estData = generateEstadualFixtures(updatedClubs, nextYear);
      const intercontFixtures = generateIntercontinentalFixtures(
        nextYear,
        undefined,
        completedPrev.reigningUclChampId,
        updatedClubs,
        undefined,
        undefined,
        undefined,
        completedPrev.reigningAfcChampId || resolveCupChampionId(completedPrev.fixturesAfcChampions)
      );

      const [, nextStartM, nextStartD] = nextSeasonStartDate.split('-');
      const nextSeasonStartDisplay = `${nextStartD}/${nextStartM}/${nextYear}`;

      const potiguarChampClub = updatedClubs.find((c) => c.id === potiguarClass.championId);
      const spChampClub = updatedClubs.find((c) => c.id === allEstClass.byUf.SP?.championId);
      const rjChampClub = updatedClubs.find((c) => c.id === allEstClass.byUf.RJ?.championId);
      const potiguarSummaryInbox: InboxMessage[] = [
        {
          id: `msg_estaduais_berths_${nextYear}`,
          title: `Vagas dos 27 Campeonatos Estaduais Definidas para ${nextYear}!`,
          message: `Pelas classificações finais dos 27 Estaduais de ${curSaYear}${
            spChampClub ? ` (SP: ${spChampClub.shortName}` : ''
          }${rjChampClub ? `, RJ: ${rjChampClub.shortName}` : ''}${
            potiguarChampClub ? `, RN: ${potiguarChampClub.shortName})` : spChampClub ? ')' : ''
          }, foram distribuídas oficialmente (critério RNF/CBF com repasse automático por mérito) as ${allEstClass.allCopaBrasilQualifiedIds.length} vagas estaduais da Copa do Brasil (126 clubes), ${allEstClass.allSerieDQualifiedIds.length} vagas estaduais da Série D (96 clubes), ${allEstClass.allCopaNordesteQualifiedIds.length} vagas da Copa do Nordeste, ${allEstClass.allCopaVerdeQualifiedIds.length} vagas da Copa Verde e ${allEstClass.allCopaSulSudesteQualifiedIds.length} vagas da Copa Sul-Sudeste ${nextYear}!`,
          date: nextSeasonStartDisplay,
          round: 1,
          read: false,
          type: 'AWARD',
        },
      ];

      const smwcNextData = isSuperClubWorldCupYear(nextYear)
        ? generateSuperMundialFixtures(
            {
              clubs: updatedClubs,
              standingsA: completedPrev.standingsA,
              standingsEurope: completedPrev.standingsEurope,
              standingsSouthAmerica: completedPrev.standingsSouthAmerica,
              standingsWorldLeagues: completedPrev.standingsWorldLeagues,
              fixturesChampionsLeague: completedPrev.fixturesChampionsLeague,
              fixturesLibertadores: completedPrev.fixturesLibertadores,
              fixturesCopaInternacional: completedPrev.fixturesCopaInternacional,
              fixturesConcacafChampions: completedPrev.fixturesConcacafChampions,
              fixturesAfcChampions: completedPrev.fixturesAfcChampions,
              reigningUclChampId: completedPrev.reigningUclChampId,
            },
            nextYear
          )
        : null;

      const smwcOpeningInbox: InboxMessage[] =
        smwcNextData && smwcNextData.fixtures.length > 0
          ? [
              {
                id: `msg_smwc_season_${nextYear}`,
                title: `🌎 Ano de Super Mundial FIFA ${nextYear}: 32 Gigantes Sorteados (15/06 a 13/07)!`,
                message: `Chegou o ano do Super Mundial de Clubes FIFA com 32 equipes! Os classificados da UEFA (12), CONMEBOL (6), CONCACAF (4), AFC/Ásia (4), CAF/África (4) e Champions Internacional (2) já estão nos Grupos A–H para o torneio de meio de temporada (15 de Junho a 13 de Julho de ${nextYear})!`,
                date: nextSeasonStartDisplay,
                round: 1,
                read: false,
                type: 'AWARD',
              },
            ]
          : [];

      const superTeamA =
        updatedClubs.find((c) => c.id === supercopaFixtures[0]?.homeTeamId)?.shortName ||
        'Campeão Brasileiro';
      const superTeamB =
        updatedClubs.find((c) => c.id === supercopaFixtures[0]?.awayTeamId)?.shortName ||
        'Campeão da Copa do Brasil';
      const recopaTeamA =
        updatedClubs.find((c) => c.id === recopaFixtures[1]?.homeTeamId)?.shortName ||
        'Campeão da Libertadores';
      const recopaTeamB =
        updatedClubs.find((c) => c.id === recopaFixtures[1]?.awayTeamId)?.shortName ||
        'Campeão da Sul-Americana';

      const newSeasonMsg: InboxMessage = {
        id: `msg_new_season_${nextYear}`,
        title: `Temporada ${nextYear} Aberta: CONMEBOL, Champions Internacional & Nacionais!`,
        message: `Começa hoje (${nextSeasonStartDisplay}) a nova temporada oficial! Os 32 clubes da Libertadores, Sul-Americana e Champions Internacional FIFA foram definidos pelos rankings reais das ligas nacionais, além da Supercopa (${superTeamA} x ${superTeamB}), Recopa (${recopaTeamA} x ${recopaTeamB}) e as 7 ligas da América do Norte, Ásia/Rússia e África rumo ao Mundial de Clubes! Na Europa, a temporada ${formatEuropeanSeason(
          activeEuYear
        )} entra agora na sua reta decisiva de Janeiro a Maio!`,
        date: nextSeasonStartDisplay,
        round: 1,
        read: false,
        type: 'BOARD',
      };

      const mergedTrophyHistory = mergeUniqueTrophies(completedPrev.trophyHistory, [
        ...regionalTrophies,
        ...saEndResult.trophies,
        ...saHistorySnapshot.officialTrophies,
      ]);

      const trophiesWonThisYear = mergedTrophyHistory.filter(
        (t) => t.year === curSaYear && t.userWon
      ).length;

      const saChampIdsForRep: string[] = [...saEndResult.championClubIds];
      if (serieAChampId) saChampIdsForRep.push(serieAChampId);
      for (const lid of JAN_DEC_WORLD_LEAGUE_IDS) {
        const wlChamp = resolveWorldLeagueChampionId(
          lid,
          completedPrev.standingsWorldLeagues,
          completedPrev.fixturesWorldLeagues
        );
        if (wlChamp) saChampIdsForRep.push(wlChamp);
      }
      const saTop4IdsForRep: string[] = (completedPrev.standingsA || [])
        .slice(1, 4)
        .map((s) => s.teamId);
      SOUTH_AMERICAN_LEAGUE_IDS.forEach((lid) => {
        const tbl = completedPrev.standingsSouthAmerica?.[lid] || [];
        if (tbl[1]?.teamId) saTop4IdsForRep.push(tbl[1].teamId);
      });
      const saDynRepResult = applySeasonalClubReputationUpdates({
        clubs: updatedClubs,
        userClubId: completedPrev.userClubId,
        seasonYear: curSaYear,
        seasonDisplayLabel: String(curSaYear),
        dateFormatted: nextSeasonStartDisplay,
        trophiesThisSeason: mergedTrophyHistory,
        championClubIds: saChampIdsForRep,
        runnerUpOrTop4ClubIds: saTop4IdsForRep,
        promotedClubIds: [...promotedB, ...promotedC, ...promotedD],
        relegatedClubIds: [...relegatedA, ...relegatedB, ...relegatedC],
        scopeDivisions: ['A', 'B', 'C', 'D', 'EST', 'SA', 'WL'],
      });

      const nextUserClubObj = updatedClubs.find((c) => c.id === completedPrev.userClubId);
      const isNowEu = isSplitCalendarClub(nextUserClubObj);
      const nextEuId = nextUserClubObj ? getClubEuropeanLeagueId(nextUserClubObj) : null;
      const nextSaId = nextUserClubObj ? getClubSouthAmericanLeagueId(nextUserClubObj) : null;
      const nextWlId = nextUserClubObj ? getClubWorldLeagueId(nextUserClubObj) : null;
      const nextTotalRounds = nextEuId
        ? EUROPEAN_LEAGUES_META[nextEuId].totalRounds
        : nextSaId
        ? SOUTH_AMERICAN_LEAGUES_META[nextSaId].totalRounds
        : nextWlId
        ? WORLD_LEAGUES_META[nextWlId].totalRounds
        : nextUserClubObj?.division === 'C'
        ? 46
        : nextUserClubObj?.division === 'EST'
        ? getEstadualTotalRounds(getClubEstadualConfig(nextUserClubObj))
        : 38;

      const janDecWlCupsNextSeason = generateAllWorldCupsFixtures(
        updatedClubs,
        nextYear,
        activeEuYear,
        {
          targetCupIds: JAN_DEC_WORLD_CUP_IDS,
          fixturesWorldLeagues: {
            ...(completedPrev.fixturesWorldLeagues || {}),
            ...wlNextSeasonData.fixturesWorldLeagues,
          },
          fixturesConcacafChampions: concacafData.fixtures,
          fixturesCopaInternacional: cintData.fixtures,
        }
      );

      const nextSeasonDraft: GameSave = {
        ...completedPrev,
        settledPrizeSeasonKeys: completedPrevSettledSa.settledPrizeSeasonKeys,
        calendarVersion: 6,
        estaduais2026Version: CURRENT_ESTADUAIS_2026_VERSION,
        serieD2027ParticipantsVersion: CURRENT_SERIE_D_2027_PARTICIPANTS_VERSION,
        serieC2027FormatVersion: CURRENT_SERIE_C_2027_FORMAT_VERSION,
        ecuador2026RosterVersion: CURRENT_ECUADOR_2026_ROSTER_VERSION,
        colombia2026RosterVersion: CURRENT_COLOMBIA_2026_ROSTER_VERSION,
        uruguay2026RosterVersion: CURRENT_URUGUAY_2026_ROSTER_VERSION,
        chile2026RosterVersion: CURRENT_CHILE_2026_ROSTER_VERSION,
        paraguay2026RosterVersion: CURRENT_PARAGUAY_2026_ROSTER_VERSION,
        peru2026RosterVersion: CURRENT_PERU_2026_ROSTER_VERSION,
        bolivia2026RosterVersion: CURRENT_BOLIVIA_2026_ROSTER_VERSION,
        venezuela2026RosterVersion: CURRENT_VENEZUELA_2026_ROSTER_VERSION,
        argentina2026RosterVersion: CURRENT_ARGENTINA_2026_ROSTER_VERSION,
        saudiArabia2026RosterVersion: CURRENT_SAUDI_2026_ROSTER_VERSION,
        mexico2026RosterVersion: CURRENT_MEXICO_2026_ROSTER_VERSION,
        usaMls2026RosterVersion: CURRENT_USA_MLS_2026_ROSTER_VERSION,
        canada2026RosterVersion: CURRENT_CANADA_2026_ROSTER_VERSION,
        russia2026RosterVersion: CURRENT_RUSSIA_2026_ROSTER_VERSION,
        shakhtarSpecial1Version: CURRENT_SHAKHTAR_SP1_VERSION,
        currentSeasonYear: isNowEu ? activeEuYear : nextYear,
        saSeasonYear: nextYear,
        europeSeasonYear: activeEuYear,
        potiguarCopaBrasilQualifiedIds: potiguarClass.copaBrasilIds,
        potiguarCopaNordesteQualifiedIds: potiguarClass.copaNordesteIds,
        estadualCopaBrasilQualifiedIds: allEstClass.allCopaBrasilQualifiedIds,
        estadualCopaNordesteQualifiedIds: allEstClass.allCopaNordesteQualifiedIds,
        estadualCopaVerdeQualifiedIds: allEstClass.allCopaVerdeQualifiedIds,
        currentRound: 1,
        totalRounds: nextTotalRounds,
        currentDate: nextSeasonStartDate,
        clubs: saDynRepResult.updatedClubs,
        fixturesA,
        fixturesB,
        fixturesC,
        fixturesD: serieDData.fixtures,
        fixturesSupercopa: supercopaFixtures,
        fixturesRecopa: recopaFixtures,
        fixturesLibertadores: libData.fixtures,
        fixturesSulamericana: sulaData.fixtures,
        fixturesCopaBrasil: cdbFixtures,
        fixturesCopaNordeste: copaNordesteData.fixtures,
        fixturesCopaVerde: copaVerdeData.fixtures,
        fixturesEstadual: estData.fixtures,
        fixturesIntercontinental: intercontFixtures,
        fixturesConcacafChampions: concacafData.fixtures,
        fixturesSouthAmerica: saNextSeasonData.fixturesSouthAmerica,
        fixturesSouthAmericanCups: generateAllSouthAmericanCupsFixtures(
          updatedClubs,
          nextYear,
          flattenSouthAmericaFixtures(saNextSeasonData.fixturesSouthAmerica)
        ),
        fixturesWorldLeagues: {
          ...(completedPrev.fixturesWorldLeagues || {}),
          ...wlNextSeasonData.fixturesWorldLeagues,
        },
        fixturesWorldCups: {
          ...(completedPrev.fixturesWorldCups || {}),
          ...janDecWlCupsNextSeason,
        },
        fixturesCopaInternacional: cintData.fixtures,
        fixturesSuperMundial: smwcNextData ? smwcNextData.fixtures : [],
        fixturesFriendlies: [],
        standingsA,
        standingsB,
        standingsC,
        standingsD: serieDData.standings,
        standingsLibertadores: libData.standings,
        standingsSulamericana: sulaData.standings,
        standingsEstadual: estData.standings,
        standingsCopaNordeste: copaNordesteData.standings,
        standingsCopaVerde: copaVerdeData.standings,
        standingsSouthAmerica: saNextSeasonData.standingsSouthAmerica,
        standingsWorldLeagues: {
          ...(completedPrev.standingsWorldLeagues || {}),
          ...wlNextSeasonData.standingsWorldLeagues,
        },
        standingsCopaInternacional: cintData.standings,
        standingsSuperMundial: smwcNextData ? smwcNextData.standings : [],
        trophyHistory: mergedTrophyHistory,
        seasonHistoryArchive: saHistorySnapshot.updatedArchive,
        transferMarket: updatedFreeAgents,
        drawnCompetitions: [],
        inbox: [
          ...saDynRepResult.inboxMessages,
          ...smwcOpeningInbox,
          ...potiguarSummaryInbox,
          ...(saEndResult.userInboxMessage ? [saEndResult.userInboxMessage] : []),
          ...wlEndResult.inboxMessages,
          ...youthTurned16MsgsSa,
          ...lifecycleInboxMessages,
          newSeasonMsg,
          ...completedPrev.inbox,
        ],
      };

      // Enforce 66h minimum match rest across all competitions before simulating European CPU matches!
      const resolvedNextSeasonDraft = resolveCrossCompetitionScheduleConflicts(nextSeasonDraft);

      // Simulate European CPU matches between Jan 1 and Jan 14 so Europe's second half stays in sync!
      const caughtUpDraft = simulateCpuFixturesUpToDate(
        resolvedNextSeasonDraft,
        nextSeasonStartDate,
        false
      );

      const baseCarousel = ensureCoachingCarouselState(caughtUpDraft);
      const existingCoachIds = new Set(baseCarousel.freeAgentCoaches.map((c) => c.id));
      const mergedFreeCoaches = [
        ...newlyMintedCoaches.filter((c) => !existingCoachIds.has(c.id)),
        ...baseCarousel.freeAgentCoaches,
      ];

      const nextSeasonReady: GameSave = alignCareerStateAfterClubSwitch({
        ...caughtUpDraft,
        managerCareer: refreshCareerForNewSeason(caughtUpDraft, trophiesWonThisYear),
        coachingCarousel: {
          ...baseCarousel,
          freeAgentCoaches: mergedFreeCoaches,
        },
        lockerRoom: ensureLockerRoomState(caughtUpDraft),
        nationalTeam: refreshNationalTeamForNewSeason(
          completedPrev.nationalTeam,
          caughtUpDraft.clubs,
          nextYear
        ),
      });

      // Deliver any transfers agreed during Sep-Dec right as the Jan-Feb window opens on Jan 15!
      return processTransferWindowTransitions(completedPrev.currentDate, nextSeasonReady, {
        isNewSeasonTurn: true,
      });
    });
  };

  // Board, Real Coaching Carousel & AI Transfer Director Handlers
  const handleAcceptJobOffer = (
    offerId: string,
    leftReason: 'Aceitou Proposta' | 'Demitido pela Diretoria' = 'Aceitou Proposta'
  ) => {
    setSackedModal(false);
    setGameState((prev) => {
      if (!prev) return null;
      const next = acceptManagerJobOffer(prev, offerId, leftReason);
      const synced = syncCarouselAfterUserClubSwitch(prev, next, leftReason);
      return alignCareerStateAfterClubSwitch(synced);
    });
  };

  const handleHireRealCoachForUserClub = (
    coachId: string
  ): { success: boolean; feedbackText: string } => {
    if (!gameState) return { success: false, feedbackText: 'Jogo não carregado.' };
    const result = hireRealHeadCoachForUserClub(gameState, coachId);
    if (result.success) {
      setGameState(result.updatedState);
    }
    return { success: result.success, feedbackText: result.feedbackText };
  };

  const handleResignFromClub = (): { offersCount: number } => {
    if (!gameState) return { offersCount: 0 };
    const result = resignUserFromCurrentClub(gameState);
    setGameState(result.updatedState);
    return { offersCount: result.offersCount };
  };

  const handleApplyToClubJob = (
    clubId: string
  ): { accepted: boolean; feedbackText: string } => {
    if (!gameState) return { accepted: false, feedbackText: 'Jogo não carregado.' };
    const result = applyForClubCoachingJob(gameState, clubId);
    if (result.accepted) {
      setGameState(alignCareerStateAfterClubSwitch(result.updatedState));
    }
    return { accepted: result.accepted, feedbackText: result.feedbackText };
  };

  const handleRespondTransferOffer = (
    offerId: string,
    action: 'ACCEPT' | 'REJECT' | 'COUNTER'
  ): { success: boolean; feedbackText: string } => {
    if (!gameState) return { success: false, feedbackText: 'Jogo não carregado.' };
    const result = respondToIncomingTransferOffer(gameState, offerId, action);
    if (action === 'ACCEPT' && result.success) {
      soundEngine.playContractSigned();
    }
    setGameState(result.updatedState);
    return { success: result.success, feedbackText: result.feedbackText };
  };

  const handleShopPlayerWithAi = (
    playerId: string
  ): { offersGenerated: number; feedbackText: string } => {
    if (!gameState) return { offersGenerated: 0, feedbackText: 'Jogo não carregado.' };
    const result = shopPlayerViaAiDirector(gameState, playerId);
    setGameState(result.updatedState);
    return {
      offersGenerated: result.offersGenerated,
      feedbackText: result.feedbackText,
    };
  };

  const handleToggleAiAutoNegotiate = () => {
    setGameState((prev) =>
      prev
        ? {
            ...prev,
            aiDirectorAutoNegotiate: !prev.aiDirectorAutoNegotiate,
          }
        : null
    );
  };

  const handleDeclineJobOffer = (offerId: string) => {
    setGameState((prev) => {
      if (!prev) return null;
      return declineManagerJobOffer(prev, offerId);
    });
  };

  const handleRequestBoardBudget = (): { approved: boolean; feedbackText: string } => {
    if (!gameState) return { approved: false, feedbackText: 'Jogo não carregado.' };
    const result = requestBoardBudgetBoost(gameState);
    if (result.approved) {
      setGameState(result.updatedState);
    }
    return { approved: result.approved, feedbackText: result.feedbackText };
  };

  const handleScoutCoachingVacancies = (): { foundCount: number; feedbackText: string } => {
    if (!gameState) return { foundCount: 0, feedbackText: 'Jogo não carregado.' };
    const result = scoutCoachingVacancies(gameState);
    if (result.foundCount > 0) {
      setGameState(result.updatedState);
    }
    return { foundCount: result.foundCount, feedbackText: result.feedbackText };
  };

  const handleScoutEmergencyClubOffers = () => {
    setGameState((prev) => (prev ? scoutEmergencyClubOffers(prev) : null));
  };

  // Locker Room, 1-on-1 Player Talks, Press Conferences & Cup Draw Handlers
  const handleResolveLockerDemand = (
    demandId: string,
    choice: 'PROMISE_STARTER' | 'REWARD_BONUS' | 'DEMAND_PATIENCE' | 'FIRM_AUTHORITY'
  ): { feedbackText: string; positive: boolean } => {
    if (!gameState) return { feedbackText: 'Jogo não carregado.', positive: false };
    const res = resolvePlayerDemand({
      save: gameState,
      demandId,
      responseChoice: choice,
    });
    setGameState((prev) =>
      prev
        ? {
            ...prev,
            clubs: res.updatedClubs,
            lockerRoom: res.updatedLockerRoom,
            managerCareer: res.updatedCareer || prev.managerCareer,
          }
        : null
    );
    return { feedbackText: res.feedbackText, positive: res.positive };
  };

  const handleHoldPlayerTalk = (
    playerId: string,
    tone: 'PRAISE_FORM' | 'DEMAND_FOCUS' | 'REST_RECOVERY'
  ): { feedbackText: string; positive: boolean } => {
    if (!gameState) return { feedbackText: 'Jogo não carregado.', positive: false };
    const res = holdIndividualPlayerTalk({
      save: gameState,
      playerId,
      tone,
    });
    setGameState((prev) =>
      prev
        ? {
            ...prev,
            clubs: res.updatedClubs,
            lockerRoom: res.updatedLockerRoom,
          }
        : null
    );
    return { feedbackText: res.feedbackText, positive: res.positive };
  };

  const handleStartPressConference = () => {
    setGameState((prev) => {
      if (!prev) return null;
      const currentClub = prev.clubs.find((c) => c.id === prev.userClubId) || userClub;
      const locker = ensureLockerRoomState(prev);
      const session = createOnDemandPressConference(prev, currentClub);
      return {
        ...prev,
        lockerRoom: {
          ...locker,
          activePressConference: session,
        },
      };
    });
  };

  const handleSubmitPressConference = (
    answers: Record<string, string>
  ): { feedbackText: string } => {
    if (!gameState) return { feedbackText: 'Jogo não carregado.' };
    const res = submitPressConferenceAnswers({
      save: gameState,
      selectedOptionsByQuestionId: answers,
    });
    setGameState((prev) =>
      prev
        ? {
            ...prev,
            clubs: res.updatedClubs,
            lockerRoom: res.updatedLockerRoom,
            managerCareer: res.updatedCareer || prev.managerCareer,
          }
        : null
    );
    return { feedbackText: res.feedbackText };
  };

  const handleMarkCompetitionDrawn = (comp: CompetitionType) => {
    setGameState((prev) => {
      if (!prev) return null;
      const current = prev.drawnCompetitions || [];
      if (current.includes(comp)) return prev;
      return {
        ...prev,
        drawnCompetitions: [...current, comp],
      };
    });
  };

  const handleGenerateCompetitionDraw = (comp: CompetitionType) => {
    setGameState((prev) => {
      if (!prev) return null;
      return regenerateClubCompetitionDraw(prev, comp).updatedSave;
    });
  };

  const handleDrawNationalTournament = (
    compId: 'world_cup' | ContinentalCompId
  ): { drawn: boolean; feedback: string } => {
    if (!gameState) return { drawn: false, feedback: '' };
    const calendarYear =
      Number(gameState.currentDate.slice(0, 4)) || gameState.currentSeasonYear;
    const ensuredNt = ensureUpgradedNationalTeamState(
      gameState.nationalTeam,
      gameState.clubs,
      calendarYear
    );
    const drawRes = drawNationalTournamentGroups(
      ensuredNt,
      gameState.clubs,
      compId,
      calendarYear
    );
    setGameState((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        nationalTeam: drawRes.updatedNt,
      };
    });
    return {
      drawn: drawRes.drawn,
      feedback: drawRes.feedback,
    };
  };

  // Seleções, Eliminatórias, Continentais & Copa do Mundo Handlers
  const handleAcceptCbfRole = () => {
    setGameState((prev) => (prev ? acceptCbfCoachingRole(prev) : null));
  };

  const handleAppointNationalTeam = (teamId: string) => {
    setGameState((prev) => (prev ? appointUserToNationalTeam(prev, teamId) : null));
  };

  const handleDeclineCbfInvite = () => {
    setGameState((prev) => (prev ? declineCbfCoachingInvite(prev) : null));
  };

  const handleResignSelecao = () => {
    setGameState((prev) => (prev ? resignFromSelecaoRole(prev) : null));
  };

  const handleAcceptNationalOffer = (offerId: string) => {
    setGameState((prev) => (prev ? acceptNationalTeamJobOffer(prev, offerId) : null));
  };

  const handleDeclineNationalOffer = (offerId: string) => {
    setGameState((prev) => (prev ? declineNationalTeamJobOffer(prev, offerId) : null));
  };

  const handleScoutNationalVacancies = (): { offersCount: number; feedbackText: string } => {
    if (!gameState) return { offersCount: 0, feedbackText: 'Jogo não carregado.' };
    const res = scoutNationalTeamVacancies(gameState);
    if (res.offersCount > 0) {
      setGameState(res.updatedState);
    }
    return { offersCount: res.offersCount, feedbackText: res.feedbackText };
  };

  const handleApplyNationalJob = (
    teamId: string
  ): { accepted: boolean; feedbackText: string } => {
    if (!gameState) return { accepted: false, feedbackText: 'Jogo não carregado.' };
    const res = applyForNationalTeamCoachingJob(gameState, teamId);
    if (res.accepted) {
      setGameState(res.updatedState);
    }
    return { accepted: res.accepted, feedbackText: res.feedbackText };
  };

  const handleAcknowledgeNationalDismissal = () => {
    setGameState((prev) => (prev ? acknowledgeNationalTeamDismissal(prev) : null));
  };

  const handlePlaySelecaoWindow = (
    fixtureId: string,
    customResult?: CustomUserInternationalResult
  ) => {
    setGameState((prev) =>
      prev ? playUserInternationalFixture(prev, fixtureId, customResult) : null
    );
  };

  const handleToggleSelecaoCallUp = (playerId: string): { feedback: string } => {
    if (!gameState) return { feedback: 'Jogo não carregado.' };
    const res = togglePlayerInSelecaoSquad(gameState, playerId);
    setGameState(res.updatedState);
    return { feedback: res.feedback };
  };

  const handleReplaceSelecaoCallUp = (
    outPlayerId: string,
    inPlayerId: string
  ): { feedback: string } => {
    if (!gameState) return { feedback: 'Jogo não carregado.' };
    const res = replacePlayerInSelecaoSquad(gameState, outPlayerId, inPlayerId);
    setGameState(res.updatedState);
    return { feedback: res.feedback };
  };

  const handleToggleSelecaoStarter = (playerId: string): { feedback: string } => {
    if (!gameState) return { feedback: 'Jogo não carregado.' };
    const res = togglePlayerSelecaoStarter(gameState, playerId);
    setGameState(res.updatedState);
    return { feedback: res.feedback };
  };

  const handleSwapSelecaoLineup = (
    firstPlayerId: string,
    secondPlayerId: string
  ): { feedback: string } => {
    if (!gameState) return { feedback: 'Jogo não carregado.' };
    const res = swapSelecaoLineupPlayers(gameState, firstPlayerId, secondPlayerId);
    setGameState(res.updatedState);
    return { feedback: res.feedback };
  };

  const handleMoveSelecaoPlayerToCoords = (
    playerId: string,
    x: number,
    y: number,
    code?: string,
    label?: string
  ): { feedback: string } => {
    if (!gameState) return { feedback: 'Jogo não carregado.' };
    const res = moveSelecaoPlayerToCustomCoords(gameState, playerId, x, y, code, label);
    setGameState(res.updatedState);
    return { feedback: res.feedback };
  };

  const handleResetSelecaoCustomPositions = () => {
    setGameState((prev) => (prev ? resetSelecaoCustomPositions(prev) : null));
  };

  const handleAutoPickSelecaoSquad = () => {
    setGameState((prev) => {
      if (!prev || !prev.nationalTeam) return prev;
      const formation = prev.nationalTeam.formation || '4-3-3';
      const optimal = selectOptimalSelecaoSquad(
        prev.clubs,
        prev.nationalTeam.userTeamId || 'nt_bra',
        prev.nationalTeam.virtualPlayers,
        formation
      );
      return {
        ...prev,
        nationalTeam: {
          ...prev.nationalTeam,
          formation,
          captainPlayerId: optimal.captainPlayerId,
          calledUpPlayerIds: optimal.calledUpPlayerIds,
          starterPlayerIds: optimal.starterPlayerIds,
          customPositions: undefined,
        },
      };
    });
  };

  const handleAutoPickSelecaoStartersOnly = () => {
    setGameState((prev) => (prev ? autoPickSelecaoStartersOnly(prev) : null));
  };

  const handleChangeSelecaoFormation = (formation: FormationType) => {
    setGameState((prev) => (prev ? updateSelecaoFormation(prev, formation) : null));
  };

  const handleSetSelecaoCaptain = (playerId: string) => {
    setGameState((prev) => (prev ? setSelecaoCaptain(prev, playerId) : null));
  };

  const handleChangeSelecaoTacticStyle = (style: SelecaoTacticStyle) => {
    setGameState((prev) => {
      if (!prev || !prev.nationalTeam) return prev;
      return {
        ...prev,
        nationalTeam: {
          ...prev.nationalTeam,
          tacticStyle: style,
        },
      };
    });
  };

  // Contract Lifecycle, Bosman Pre-Contracts & Release Clauses Handlers
  const handleRenewPlayerContract = (
    playerId: string,
    proposedYears: number,
    proposedWage: number,
    proposedReleaseClause: number,
    signingBonus: number
  ): { accepted: boolean; feedbackText: string } => {
    if (!gameState) return { accepted: false, feedbackText: 'Jogo não carregado.' };
    const result = negotiateContractRenewal(
      gameState,
      playerId,
      proposedYears,
      proposedWage,
      proposedReleaseClause,
      signingBonus
    );
    if (result.accepted) {
      soundEngine.playContractSigned();
      setGameState(result.updatedState);
    }
    return { accepted: result.accepted, feedbackText: result.feedbackText };
  };

  const handleBatchRenewContracts = (
    filter: 'ALL_EXPIRING' | 'STARTERS' | 'YOUTH_U23'
  ) => {
    if (!gameState) {
      return {
        attempted: 0,
        renewedCount: 0,
        rejectedCount: 0,
        monthlyWageDelta: 0,
        renewedNames: [] as string[],
        rejectedNames: [] as string[],
      };
    }

    let workingState: GameSave = gameState;
    const currentClub = workingState.clubs.find((c) => c.id === workingState.userClubId);
    if (!currentClub) {
      return {
        attempted: 0,
        renewedCount: 0,
        rejectedCount: 0,
        monthlyWageDelta: 0,
        renewedNames: [] as string[],
        rejectedNames: [] as string[],
      };
    }

    const targets = currentClub.squad.filter((p) => {
      if (p.isLoan || p.contractYears > 1 || p.retiringAtSeasonEnd || p.preContractClubId) {
        return false;
      }
      if (filter === 'STARTERS') return p.isStarter;
      if (filter === 'YOUTH_U23') return p.age <= 23;
      return true;
    });

    let renewedCount = 0;
    let rejectedCount = 0;
    let monthlyWageDelta = 0;
    const renewedNames: string[] = [];
    const rejectedNames: string[] = [];

    for (const player of targets) {
      const latestClub = workingState.clubs.find((c) => c.id === workingState.userClubId);
      if (!latestClub) break;
      const latestPlayer = latestClub.squad.find((p) => p.id === player.id);
      if (!latestPlayer) continue;
      const exp = getPlayerRenewalExpectations(latestPlayer, latestClub);
      const proposedClause = latestPlayer.releaseClause || exp.suggestedReleaseClause;
      const res = negotiateContractRenewal(
        workingState,
        latestPlayer.id,
        exp.recommendedYears,
        exp.desiredWage,
        proposedClause,
        0
      );
      if (res.accepted) {
        workingState = res.updatedState;
        renewedCount++;
        monthlyWageDelta += exp.desiredWage - latestPlayer.wage;
        renewedNames.push(latestPlayer.name);
      } else {
        rejectedCount++;
        rejectedNames.push(latestPlayer.name);
      }
    }

    if (renewedCount > 0) {
      setGameState(workingState);
    }

    return {
      attempted: targets.length,
      renewedCount,
      rejectedCount,
      monthlyWageDelta,
      renewedNames,
      rejectedNames,
    };
  };

  const handleSignPreContract = (
    playerId: string,
    sellerClubId: string,
    offeredWage: number,
    contractYears: number,
    signingBonus: number
  ): { accepted: boolean; feedbackText: string } => {
    if (!gameState) return { accepted: false, feedbackText: 'Jogo não carregado.' };
    const result = signBosmanPreContract(
      gameState,
      playerId,
      sellerClubId,
      offeredWage,
      contractYears,
      signingBonus
    );
    if (result.accepted) {
      soundEngine.playContractSigned();
      setGameState(result.updatedState);
    }
    return { accepted: result.accepted, feedbackText: result.feedbackText };
  };

  const handlePayReleaseClause = (
    playerId: string,
    sellerClubId: string,
    offeredWage: number,
    contractYears: number = 4
  ): { accepted: boolean; feedbackText: string } => {
    if (!gameState) return { accepted: false, feedbackText: 'Jogo não carregado.' };
    const result = triggerReleaseClausePurchase(
      gameState,
      playerId,
      sellerClubId,
      offeredWage,
      contractYears
    );
    if (result.accepted) {
      soundEngine.playContractSigned();
      setGameState({
        ...result.updatedState,
        watchlist: removeWatchlistEntry(result.updatedState.watchlist, playerId),
      });
    }
    return { accepted: result.accepted, feedbackText: result.feedbackText };
  };


  // Advance 1 Day (Dia a dia) — never skips over today's or overdue user match!
  const handleAdvanceDay = () => {
    if (!gameState) return;
    if (isTodayMatchDay || isTodaySelecaoMatchDay) {
      handleOpenMatchModalWithDateCheck();
      return;
    }
    soundEngine.playClick();

    setGameState((prev) => {
      if (!prev) return null;

      const nextDate = addDays(prev.currentDate, 1);
      const newMedicalMessages: InboxMessage[] = [];

      // Player recovery, specialist staff bonuses and training progression
      const updatedClubs = prev.clubs.map((c) => {
        const isUser = c.id === prev.userClubId;
        const staffBonuses = computeClubStaffBonuses(c);
        const medDaysToHeal =
          1 + (staffBonuses.extraMedicalRecoveryChance > 0 && Math.random() < staffBonuses.extraMedicalRecoveryChance ? 1 : 0);

        // Process medical recovery for this day
        const { updatedSquad: medSquad, generatedInboxMessages } = progressSquadMedicalDay(
          c.squad,
          medDaysToHeal,
          nextDate,
          prev.currentRound,
          c.finances.medicalFacilityLevel || 2,
          isUser
        );

        if (isUser && generatedInboxMessages.length > 0) {
          newMedicalMessages.push(...generatedInboxMessages);
        }

        const specialty = isUser ? getManagerSpecialtyProfile(prev.managerSpecialty) : null;

        let squadChanged = medSquad !== c.squad;
        const updatedSquad = new Array<Player>(medSquad.length);
        for (let i = 0; i < medSquad.length; i++) {
          const p = medSquad[i];
          const dailyConditionGain = computeDailyConditionRecovery(
            p,
            staffBonuses.dailyConditionBonus,
            specialty?.id === 'MOTIVADOR'
          );
          const condition = Math.min(100, p.condition + dailyConditionGain);

          // Training progression (boosted by specialist GK / DEF / ATT coaches + Manager Specialty for Sub-23)
          const roleMult =
            p.position === 'GK'
              ? staffBonuses.gkXpMultiplier
              : p.position === 'DF'
              ? staffBonuses.defXpMultiplier
              : p.position === 'FW'
              ? staffBonuses.attXpMultiplier
              : 1;
          const sub23Mult =
            isUser && specialty && p.age <= 23 ? specialty.trainingSub23Multiplier : 1;
          const progressedPlayer = applyDailySquadTrainingProgression(p, {
            roleMult,
            sub23Mult,
            currentRound: prev.currentRound,
            division: c.division,
            club: c,
          });

          if (progressedPlayer === p && condition === p.condition) {
            updatedSquad[i] = p;
          } else {
            squadChanged = true;
            updatedSquad[i] =
              condition === progressedPlayer.condition
                ? progressedPlayer
                : { ...progressedPlayer, condition };
          }
        }

        return squadChanged ? { ...c, squad: updatedSquad } : c;
      });

      const updatedUserClubForScouting =
        updatedClubs.find((c) => c.id === prev.userClubId) || userClub;
      const {
        updatedNetwork: progressedScouting,
        generatedInboxMessages: scoutingDayMsgs,
      } = progressScoutingMissions(
        prev.scoutingNetwork,
        updatedUserClubForScouting,
        1,
        nextDate,
        prev.currentRound
      );

      const {
        updatedClub: userClubAfterYouthDay,
        inboxMessages: youthDayMsgs,
      } = progressYouthAcademyDays(
        ensureClubYouthAcademy(updatedUserClubForScouting, nextDate),
        1,
        nextDate,
        prev.currentRound,
        true
      );

      const retrainDay = progressClubSquadPositionRetraining({
        club: userClubAfterYouthDay,
        days: 1,
        currentDate: nextDate,
        currentRound: prev.currentRound,
        isUserClub: true,
      });
      const userClubWithRetrainDay: Club = {
        ...userClubAfterYouthDay,
        squad: retrainDay.updatedSquad,
      };

      const clubsWithYouthDay = updatedClubs.map((c) =>
        c.id === prev.userClubId ? userClubWithRetrainDay : c
      );

      const nextState: GameSave = {
        ...prev,
        currentDate: nextDate,
        clubs: clubsWithYouthDay,
        scoutingNetwork: progressedScouting,
        inbox: [
          ...retrainDay.inboxMessages,
          ...youthDayMsgs,
          ...scoutingDayMsgs,
          ...newMedicalMessages,
          ...prev.inbox,
        ],
      };

      // Simulate any CPU matches across all competitions that took place on `prev.currentDate`, then process cross-hemisphere rollovers & window transitions
      return advanceWorldCalendarWithRollover(prev.currentDate, nextState, prev.currentDate, true);
    });
  };

  // Smart Advance to Next Match Date (Club OR Coached Seleção — pauses automatically on transfer offer, serious injury, job offer, or Deadline Day!)
  const handleAdvanceToMatch = () => {
    if (!gameState) return;
    const clubNextDate = upcomingUserFixture?.date || null;
    const selecaoNextDate = upcomingSelecaoFixture?.date || null;
    const targetDate =
      clubNextDate && selecaoNextDate
        ? selecaoNextDate < clubNextDate
          ? selecaoNextDate
          : clubNextDate
        : clubNextDate || selecaoNextDate;
    if (!targetDate) return;
    if (targetDate <= gameState.currentDate) {
      handleOpenMatchModalWithDateCheck();
      return;
    }

    soundEngine.playWhistle(false);
    setSmartAdvanceNotice(null);
    setSmartAdvanceSummary(null);

    const startDate = gameState.currentDate;
    const totalDays = Math.min(45, Math.max(1, daysBetween(gameState.currentDate, targetDate)));
    let workingState: GameSave = gameState;
    let pausedReason: string | null = null;
    let triggeredDeadlineDay = false;
    let daysSimulated = 0;

    const digestMedicalRecoveries: string[] = [];
    const digestNewInjuries: string[] = [];
    const digestSquadEvolutions: string[] = [];
    const digestYouthUpdates: string[] = [];
    const digestScoutingUpdates: string[] = [];
    const digestRetrainingUpdates: string[] = [];
    let digestOffersReceived = 0;
    let digestJobOffersReceived = 0;

    for (let step = 0; step < totalDays; step++) {
      daysSimulated++;
      const prevDate = workingState.currentDate;
      const nextDate = addDays(prevDate, 1);
      const isFinalTargetStep = nextDate >= targetDate;
      const prevPendingOffers = (workingState.transferOffers || []).filter(
        (o) => o.status === 'PENDING'
      ).length;
      const prevPendingJobs = (workingState.managerCareer?.jobOffers || []).filter(
        (o) => o.status === 'PENDING'
      ).length;
      const newMedicalMessages: InboxMessage[] = [];

      const updatedClubs = workingState.clubs.map((c) => {
        const isUser = c.id === workingState.userClubId;
        const staffBonuses = computeClubStaffBonuses(c);
        const specialty = isUser ? getManagerSpecialtyProfile(workingState.managerSpecialty) : null;
        const medDaysToHeal =
          1 +
          (staffBonuses.extraMedicalRecoveryChance > 0 &&
          Math.random() < staffBonuses.extraMedicalRecoveryChance
            ? 1
            : 0);

        const { updatedSquad: medSquad, generatedInboxMessages } = progressSquadMedicalDay(
          c.squad,
          medDaysToHeal,
          nextDate,
          workingState.currentRound,
          c.finances.medicalFacilityLevel || 2,
          isUser
        );

        if (isUser && generatedInboxMessages.length > 0) {
          newMedicalMessages.push(...generatedInboxMessages);
        }

        let squadChanged = medSquad !== c.squad;
        const updatedSquad = new Array<Player>(medSquad.length);
        for (let i = 0; i < medSquad.length; i++) {
          const p = medSquad[i];
          const dailyConditionGain = computeDailyConditionRecovery(
            p,
            staffBonuses.dailyConditionBonus,
            specialty?.id === 'MOTIVADOR'
          );
          const condition = Math.min(100, p.condition + dailyConditionGain);
          const roleMult =
            p.position === 'GK'
              ? staffBonuses.gkXpMultiplier
              : p.position === 'DF'
              ? staffBonuses.defXpMultiplier
              : p.position === 'FW'
              ? staffBonuses.attXpMultiplier
              : 1;
          const sub23Mult =
            isUser && specialty && p.age <= 23 ? specialty.trainingSub23Multiplier : 1;
          const progressedPlayer = applyDailySquadTrainingProgression(p, {
            roleMult,
            sub23Mult,
            currentRound: workingState.currentRound,
            division: c.division,
            club: c,
          });
          if (isUser && progressedPlayer.overall !== p.overall) {
            const delta = progressedPlayer.overall - p.overall;
            digestSquadEvolutions.push(
              `${p.name} (${delta > 0 ? `+${delta}` : delta} OVR → ${progressedPlayer.overall})`
            );
          }
          if (progressedPlayer === p && condition === p.condition) {
            updatedSquad[i] = p;
          } else {
            squadChanged = true;
            updatedSquad[i] =
              condition === progressedPlayer.condition
                ? progressedPlayer
                : { ...progressedPlayer, condition };
          }
        }
        return squadChanged ? { ...c, squad: updatedSquad } : c;
      });

      const currentUserForStep =
        updatedClubs.find((c) => c.id === workingState.userClubId) || userClub;
      const {
        updatedNetwork: progressedScouting,
        generatedInboxMessages: scoutingDayMsgs,
      } = progressScoutingMissions(
        workingState.scoutingNetwork,
        currentUserForStep,
        1,
        nextDate,
        workingState.currentRound
      );

      const {
        updatedClub: userClubAfterYouthDay,
        inboxMessages: youthDayMsgs,
      } = progressYouthAcademyDays(
        ensureClubYouthAcademy(currentUserForStep, nextDate),
        1,
        nextDate,
        workingState.currentRound,
        true
      );

      const retrainDay = progressClubSquadPositionRetraining({
        club: userClubAfterYouthDay,
        days: 1,
        currentDate: nextDate,
        currentRound: workingState.currentRound,
        isUserClub: true,
      });
      const userClubWithRetrainDay: Club = {
        ...userClubAfterYouthDay,
        squad: retrainDay.updatedSquad,
      };
      const clubsWithYouthDay = updatedClubs.map((c) =>
        c.id === workingState.userClubId ? userClubWithRetrainDay : c
      );

      const nextState: GameSave = {
        ...workingState,
        currentDate: nextDate,
        clubs: clubsWithYouthDay,
        scoutingNetwork: progressedScouting,
        inbox: [
          ...retrainDay.inboxMessages,
          ...youthDayMsgs,
          ...scoutingDayMsgs,
          ...newMedicalMessages,
          ...workingState.inbox,
        ],
      };

      workingState = advanceWorldCalendarWithRollover(
        prevDate,
        nextState,
        isFinalTargetStep ? targetDate : prevDate,
        !isFinalTargetStep
      );

      for (const m of newMedicalMessages) {
        if (/alta|liberad|recuperad|apt[oa]/i.test(m.title)) {
          digestMedicalRecoveries.push(m.title.replace(/^🏥\s*|^✅\s*/, '').slice(0, 48));
        } else if (/les[aã]o|dm|contus|fratura|estiramento/i.test(m.title)) {
          digestNewInjuries.push(m.title.replace(/^🏥\s*|^🚑\s*/, '').slice(0, 48));
        }
      }
      if (youthDayMsgs.length > 0) {
        digestYouthUpdates.push(...youthDayMsgs.map((m) => m.title));
      }
      if (scoutingDayMsgs.length > 0) {
        digestScoutingUpdates.push(...scoutingDayMsgs.map((m) => m.title));
      }
      if (retrainDay.inboxMessages.length > 0) {
        digestRetrainingUpdates.push(...retrainDay.inboxMessages.map((m) => m.title));
      }

      const afterStepOffers = (workingState.transferOffers || []).filter(
        (o) => o.status === 'PENDING'
      ).length;
      const afterStepJobs = (workingState.managerCareer?.jobOffers || []).filter(
        (o) => o.status === 'PENDING'
      ).length;
      if (afterStepOffers > prevPendingOffers) {
        digestOffersReceived += afterStepOffers - prevPendingOffers;
      }
      if (afterStepJobs > prevPendingJobs) {
        digestJobOffersReceived += afterStepJobs - prevPendingJobs;
      }

      // Smart pause checks strictly before reaching match day
      if (!isFinalTargetStep) {
        const hasNewInjury = newMedicalMessages.some((m) =>
          /les[aã]o|dm|contus|fratura|estiramento/i.test(m.title)
        );
        const workingUserClub =
          workingState.clubs.find((c) => c.id === workingState.userClubId) || userClub;
        const ddCheck = getDeadlineDayWindowKey(workingState.currentDate, workingUserClub);
        const isFreshDeadlineDay =
          ddCheck.isDeadlinePeriod &&
          !(workingState.deadlineDayCompletedKeys || []).includes(ddCheck.windowKey);

        if (isFreshDeadlineDay) {
          pausedReason = `Avanço Inteligente pausado em ${formatShortDate(workingState.currentDate)}: Plantão do Último Dia da Janela (Deadline Day) aberto!`;
          triggeredDeadlineDay = true;
          break;
        }
        if (afterStepOffers > prevPendingOffers) {
          pausedReason = `Avanço Inteligente pausado em ${formatShortDate(workingState.currentDate)}: Nova proposta de transferência recebida na Caixa de Entrada!`;
          break;
        }
        if (afterStepJobs > prevPendingJobs) {
          pausedReason = `Avanço Inteligente pausado em ${formatShortDate(workingState.currentDate)}: Você recebeu uma nova proposta de emprego na Sala da Presidência!`;
          break;
        }
        if (hasNewInjury) {
          pausedReason = `Avanço Inteligente pausado em ${formatShortDate(workingState.currentDate)}: Alerta do Departamento Médico — confira a nova lesão no elenco.`;
          break;
        }
      }
    }

    if (gameSettings.classicFastMode) {
      workingState = autoDelegateClassicSponsors(workingState);
    }

    setGameState(workingState);
    if (pausedReason) {
      setSmartAdvanceNotice(pausedReason);
    }
    if (daysSimulated >= 1) {
      setSmartAdvanceSummary({
        daysAdvanced: daysSimulated,
        fromDate: startDate,
        toDate: workingState.currentDate,
        pausedReason,
        medicalRecoveries: digestMedicalRecoveries,
        newInjuries: digestNewInjuries,
        squadEvolutions: digestSquadEvolutions,
        youthUpdates: digestYouthUpdates,
        scoutingUpdates: digestScoutingUpdates,
        retrainingUpdates: digestRetrainingUpdates,
        offersReceived: digestOffersReceived,
        jobOffersReceived: digestJobOffersReceived,
      });
    }
    if (triggeredDeadlineDay) {
      handleOpenDeadlineDay(workingState);
    }
  };

  // Open match modal with date alignment, bracket resolution, and lineup sanitization
  const handleOpenMatchModalWithDateCheck = () => {
    if (!gameState) return;

    // If today is a Seleção matchday (and not also a club matchday), or if only Seleção matches remain before season cutoff, launch Seleção match!
    if (
      upcomingSelecaoFixture &&
      ((isTodaySelecaoMatchDay && !isTodayMatchDay) || !upcomingUserFixture)
    ) {
      if (
        upcomingSelecaoFixture.date &&
        upcomingSelecaoFixture.date > gameState.currentDate
      ) {
        const targetSelDate = upcomingSelecaoFixture.date;
        setGameState((prev) =>
          prev
            ? advanceWorldCalendarWithRollover(
                prev.currentDate,
                { ...prev, currentDate: targetSelDate },
                targetSelDate,
                false
              )
            : null
        );
      }
      setSelecaoLaunchFixtureId(upcomingSelecaoFixture.id);
      setActiveTab('selecao_minha');
      return;
    }

    if (!upcomingUserFixture) return;

    let resolvedState = gameState;
    if (upcomingUserFixture.date && upcomingUserFixture.date > gameState.currentDate) {
      resolvedState = advanceWorldCalendarWithRollover(
        gameState.currentDate,
        { ...gameState, currentDate: upcomingUserFixture.date },
        upcomingUserFixture.date,
        false,
        true
      );
    }

    const activeClubInResolved =
      resolvedState.clubs.find((c) => c.id === resolvedState.userClubId) || userClub;
    const allResolvedPools = getAllFixturesFromSave(resolvedState);
    // Always re-select the earliest unplayed user fixture after advancing in case a knockout tie unlocked mid-jump!
    const resolvedUserFix =
      getUpcomingClubFixture(allResolvedPools, activeClubInResolved.id, resolvedState.currentDate) ||
      allResolvedPools.find((f) => f.id === upcomingUserFixture.id) ||
      upcomingUserFixture;
    const comp = resolvedUserFix.competition;

    if (activeClubInResolved.tactics.autoLineupAssistantEnabled) {
      const optimal = buildAssistantOptimalLineup(activeClubInResolved, comp);
      resolvedState = {
        ...resolvedState,
        clubs: resolvedState.clubs.map((c) =>
          c.id === activeClubInResolved.id
            ? {
                ...c,
                squad: optimal.updatedSquad,
                tactics: optimal.updatedTactics,
              }
            : c
        ),
      };
    } else {
      const { benchedNames } = sanitizeLineupForCompetition(
        activeClubInResolved.squad,
        comp
      );
      if (benchedNames.length > 0) {
        soundEngine.playWhistle(false);
        const fixed = buildFixedUnavailableLineup(activeClubInResolved, comp);
        resolvedState = {
          ...resolvedState,
          clubs: resolvedState.clubs.map((c) =>
            c.id === activeClubInResolved.id
              ? { ...c, squad: fixed.updatedSquad, tactics: fixed.updatedTactics }
              : c
          ),
        };
      }
    }

    if (resolvedState !== gameState) {
      setGameState(resolvedState);
    }

    const resolvedOppId =
      resolvedUserFix.homeTeamId === activeClubInResolved.id
        ? resolvedUserFix.awayTeamId
        : resolvedUserFix.homeTeamId;
    const resolvedOppClub =
      withWorldGuestClubs(resolvedState.clubs).find((c) => c.id === resolvedOppId) || null;
    const resolvedRivalry = getMatchRivalryInfo(activeClubInResolved, resolvedOppClub);

    if (resolvedRivalry && resolvedOppClub) {
      setIsRivalryAlertOpen(true);
      return;
    }

    setPreMatchDerbyPosture('PADRAO');
    setIsMatchModalOpen(true);
  };

  // 1-Click Instant Match Execution without opening the 90-minute pitch modal
  const handleInstantSimulateNextMatch = (overridePosture?: PreMatchDerbyPosture) => {
    if (!gameState) return;

    if (
      upcomingSelecaoFixture &&
      ((isTodaySelecaoMatchDay && !isTodayMatchDay) || !upcomingUserFixture)
    ) {
      handleOpenMatchModalWithDateCheck();
      return;
    }

    if (!upcomingUserFixture) return;

    let resolvedState = gameState;
    if (upcomingUserFixture.date && upcomingUserFixture.date > gameState.currentDate) {
      resolvedState = advanceWorldCalendarWithRollover(
        gameState.currentDate,
        { ...gameState, currentDate: upcomingUserFixture.date },
        upcomingUserFixture.date,
        false,
        true
      );
    }

    let activeClubInResolved =
      resolvedState.clubs.find((c) => c.id === resolvedState.userClubId) || userClub;
    const allResolvedPools = getAllFixturesFromSave(resolvedState);
    // Always play the earliest unplayed fixture after advancing so newly unlocked knockout matches are never skipped!
    const resolvedUserFix =
      getUpcomingClubFixture(allResolvedPools, activeClubInResolved.id, resolvedState.currentDate) ||
      allResolvedPools.find((f) => f.id === upcomingUserFixture.id) ||
      upcomingUserFixture;
    const comp = resolvedUserFix.competition;

    if (activeClubInResolved.tactics.autoLineupAssistantEnabled) {
      const optimal = buildAssistantOptimalLineup(activeClubInResolved, comp);
      activeClubInResolved = {
        ...activeClubInResolved,
        squad: optimal.updatedSquad,
        tactics: optimal.updatedTactics,
      };
      resolvedState = {
        ...resolvedState,
        clubs: resolvedState.clubs.map((c) =>
          c.id === activeClubInResolved.id ? activeClubInResolved : c
        ),
      };
    } else {
      const { benchedNames } = sanitizeLineupForCompetition(
        activeClubInResolved.squad,
        comp
      );
      if (benchedNames.length > 0) {
        const fixed = buildFixedUnavailableLineup(activeClubInResolved, comp);
        activeClubInResolved = {
          ...activeClubInResolved,
          squad: fixed.updatedSquad,
          tactics: fixed.updatedTactics,
        };
        resolvedState = {
          ...resolvedState,
          clubs: resolvedState.clubs.map((c) =>
            c.id === activeClubInResolved.id ? activeClubInResolved : c
          ),
        };
      }
    }
    const resolvedAllClubs = withWorldGuestClubs(resolvedState.clubs);
    const resolvedOppId =
      resolvedUserFix.homeTeamId === activeClubInResolved.id
        ? resolvedUserFix.awayTeamId
        : resolvedUserFix.homeTeamId;
    const resolvedOppClub = resolvedAllClubs.find((c) => c.id === resolvedOppId) || null;
    const resolvedRivalry = getMatchRivalryInfo(activeClubInResolved, resolvedOppClub);

    if (overridePosture === undefined && resolvedRivalry && resolvedOppClub) {
      if (resolvedState !== gameState) {
        setGameState(resolvedState);
      }
      setIsRivalryAlertOpen(true);
      return;
    }

    if (resolvedState !== gameState) {
      setGameState(resolvedState);
    }

    const roundFixturesForInstant = getSimultaneousMatchdayFixtures(
      resolvedState,
      resolvedUserFix
    );

    const instRes = executeInstantUserMatch({
      userClub: activeClubInResolved,
      allClubs: resolvedAllClubs,
      userFixture: resolvedUserFix,
      currentRoundFixtures: roundFixturesForInstant,
      allFixtures: allResolvedPools,
      gameSettings,
      preMatchDerbyPosture: overridePosture || 'PADRAO',
      fanConfidence: resolvedState.managerCareer?.fanConfidence ?? 68,
    });

    soundEngine.playWhistle(true);
    handleFinishRound(
      instRes.completedUserFixture,
      instRes.otherMatches,
      instRes.updatedClubs,
      instRes.matchMedicalMessages
    );

    setInstantMatchSummary({
      fixture: instRes.completedUserFixture,
      homeClub: instRes.homeClub,
      awayClub: instRes.awayClub,
      manOfTheMatchLabel: instRes.manOfTheMatchLabel,
    });
  };

  // Auto-fills empty sponsor slots with the best available deal when Classic/Fast Mode is active
  const autoDelegateClassicSponsors = (state: GameSave): GameSave => {
    let changed = false;
    const nextClubs = state.clubs.map((clubItem) => {
      if (clubItem.id !== state.userClubId) return clubItem;
      let updatedUserClub = clubItem;
      for (const slot of SPONSOR_SLOTS_ORDER) {
        if (!updatedUserClub.sponsors?.[slot]) {
          const options = getAvailableSponsorOptionsForSlot(updatedUserClub, slot);
          const bestOption = options.sort(
            (a, b) =>
              b.signingBonus +
              b.perRoundAmount * b.totalRounds -
              (a.signingBonus + a.perRoundAmount * a.totalRounds)
          )[0];
          if (bestOption) {
            const res = signSponsorContract(
              updatedUserClub,
              bestOption,
              state.currentRound,
              state.currentDate
            );
            if (res.success) {
              updatedUserClub = res.updatedClub;
              changed = true;
            }
          }
        }
      }
      return updatedUserClub;
    });
    return changed ? { ...state, clubs: nextClubs } : state;
  };

  const handleToggleClassicFastMode = () => {
    const nextEnabled = !gameSettings.classicFastMode;
    handleUpdateSettings({
      ...gameSettings,
      classicFastMode: nextEnabled,
    });
    if (nextEnabled) {
      setGameState((prev) => (prev ? autoDelegateClassicSponsors(prev) : null));
    }
  };

  const openSponsorSlotsCount = Math.max(0, 4 - countActiveSponsors(userClub.sponsors));
  const unreadMessagesCount = gameState.inbox.filter((m) => {
    if (m.read) return false;
    if (!gameSettings.classicFastMode) return true;
    return (
      m.type === 'TRANSFER' ||
      m.type === 'INJURY' ||
      m.type === 'SUSPENSION' ||
      m.type === 'JOB_OFFER' ||
      m.type === 'NATIONAL_TEAM' ||
      m.type === 'BOARD' ||
      Boolean(m.offerId) ||
      Boolean(m.jobOfferId)
    );
  }).length;
  const activeScoutingMissionsCount =
    gameState.scoutingNetwork?.missions.filter((m) => m.status === 'ACTIVE').length || 0;
  const pendingLockerActionsCount =
    (gameState.lockerRoom?.activeDemands.filter((d) => d.status === 'PENDING').length || 0) +
    (gameState.lockerRoom?.activePressConference &&
    !gameState.lockerRoom.activePressConference.completed
      ? 1
      : 0);
  const pendingNationalOffersCount =
    gameState.nationalTeam?.pendingNationalOffers?.filter((o) => o.status === 'PENDING').length ||
    0;
  const pendingJobOffersCount =
    (gameState.managerCareer?.jobOffers.filter((o) => o.status === 'PENDING').length || 0) +
    pendingNationalOffersCount +
    pendingLockerActionsCount;
  const pendingTransferOffersCount =
    (gameState.transferOffers || []).filter((o) => o.status === 'PENDING').length;
  const readyUserSelecaoCount = gameState.nationalTeam?.isUserCoach
    ? getTeamAllInternationalFixtures(
        gameState.nationalTeam,
        gameState.nationalTeam.userTeamId || 'nt_bra'
      ).filter(
        (f) => !f.played && (f.status === 'READY_FOR_USER' || f.date === gameState.currentDate)
      ).length
    : 0;
  const selecaoActionCount =
    (pendingNationalOffersCount > 0
      ? pendingNationalOffersCount
      : gameState.nationalTeam?.hasPendingCbfInvite
      ? 1
      : 0) + readyUserSelecaoCount;

  return (
    <LanguageProvider
      language={gameSettings.language || 'pt-BR'}
      onChangeLanguage={handleChangeLanguage}
    >
    <PlayerInspectionProvider onInspectPlayer={handleInspectPlayerGlobal}>
    <div className="min-h-[100dvh] overflow-x-clip bg-[#070c16] text-slate-100 flex font-sans selection:bg-sky-400 selection:text-slate-950">
      {/* Categorized Left Navigation Sidebar & Mobile Drawer */}
      <GameSidebar
        userClub={userClub}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        collapsed={isSidebarCollapsed}
        onToggleCollapsed={() => setIsSidebarCollapsed((v) => !v)}
        mobileOpen={isMobileMenuOpen}
        onCloseMobile={() => setIsMobileMenuOpen(false)}
        unreadCount={unreadMessagesCount}
        scoutingBadge={activeScoutingMissionsCount}
        marketBadge={pendingTransferOffersCount}
        jobOffersBadge={pendingJobOffersCount}
        selecaoBadge={selecaoActionCount}
        upcomingFixture={upcomingUserFixture}
        upcomingOpponent={upcomingOpponentClub}
        onInspectOpponent={(clubId) => {
          setInspectedClubId(clubId);
          setActiveTab('clubs');
        }}
        isMuted={isMuted}
        onToggleMute={() => {
          const nextMuted = soundEngine.toggleMute();
          handleUpdateSettings({ ...gameSettings, isMuted: nextMuted });
        }}
        onOpenSettingsModal={() => {
          setSettingsInitialSection('career');
          setIsSettingsModalOpen(true);
        }}
        onOpenGuideModal={() => {
          setGuideInitialTab('guide');
          setIsGuideModalOpen(true);
        }}
        onOpenOfficialSite={() => handleOpenOfficialSite('compartilhar')}
        onSaveAndExitToTitle={handleSaveAndExitToTitle}
        autoSaveEnabled={gameSettings.autoSaveEnabled}
        classicFastMode={Boolean(gameSettings.classicFastMode)}
        onToggleClassicFastMode={handleToggleClassicFastMode}
      />

      {/* Right Workspace Column: Slim Executive Top Bar + Main Content */}
      <div className="flex-1 min-w-0 flex flex-col">
        <Header
          userClub={userClub}
          managerName={gameState.managerName}
          currentRound={gameState.currentRound}
          totalRounds={gameState.totalRounds}
          seasonYear={gameState.currentSeasonYear}
          europeSeasonYear={gameState.europeSeasonYear}
          currentDate={gameState.currentDate}
          isTodayMatchDay={isTodayMatchDay || isTodaySelecaoMatchDay}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          onOpenMobileMenu={() => setIsMobileMenuOpen(true)}
          isMuted={isMuted}
          onToggleMute={() => {
            const nextMuted = soundEngine.toggleMute();
            handleUpdateSettings({ ...gameSettings, isMuted: nextMuted });
          }}
          onOpenSaveModal={() => setIsSaveModalOpen(true)}
          onOpenSettingsModal={() => {
            setSettingsInitialSection('career');
            setIsSettingsModalOpen(true);
          }}
          onOpenGuideModal={() => {
            setGuideInitialTab('guide');
            setIsGuideModalOpen(true);
          }}
          onOpenOfficialSite={() => handleOpenOfficialSite()}
          onOpenGlobalSearch={() => setIsGlobalSearchOpen(true)}
          onSaveAndExitToTitle={handleSaveAndExitToTitle}
          onOpenMatchModal={handleOpenMatchModalWithDateCheck}
          onAdvanceDay={handleAdvanceDay}
          hasUpcomingMatch={Boolean(upcomingUserFixture || hasPreCutoffSelecaoMatches)}
          onFinishSeason={handleFinishSeason}
          autoSaveEnabled={gameSettings.autoSaveEnabled}
        />

        {/* Main Content Area */}
        <main className="patofoot-tab-viewport flex-1 min-w-0 max-w-7xl mx-auto w-full px-3 sm:px-6 pt-3.5 sm:pt-6 pb-[calc(5.25rem+env(safe-area-inset-bottom))] lg:pb-8">
          <QuickTabsRibbon
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            sidebarCollapsed={isSidebarCollapsed}
            unreadCount={unreadMessagesCount}
            scoutingBadge={activeScoutingMissionsCount}
            marketBadge={pendingTransferOffersCount}
            jobOffersBadge={pendingJobOffersCount}
            selecaoBadge={selecaoActionCount}
            financesAlert={userClub.finances.balance < 0}
            openSponsorSlots={openSponsorSlotsCount}
            classicFastMode={Boolean(gameSettings.classicFastMode)}
          />

          {/* Contextual Sub-Tab Bar for the 4 Grouped Domains (Time, Competições, Base & Treinos, Clube) */}
          {(() => {
            const subTabGroup: Array<{
              id: string;
              label: string;
              icon: React.ComponentType<{ className?: string }>;
              badge?: number;
            }> | null =
              activeTab === 'squad' || activeTab === 'players' || activeTab === 'tactics'
                ? [
                    { id: 'squad', label: 'Escalação & Campo', icon: Users },
                    { id: 'players', label: 'Meus Jogadores', icon: UserCheck },
                    { id: 'tactics', label: 'Táticas', icon: Sliders },
                  ]
                : activeTab === 'standings' ||
                  activeTab === 'clubs' ||
                  activeTab === 'selecao' ||
                  activeTab === 'selecao_minha' ||
                  activeTab === 'selecao_mundo'
                ? [
                    { id: 'standings', label: 'Classificação', icon: Trophy },
                    { id: 'clubs', label: 'Outros Times', icon: Shield },
                    {
                      id: 'selecao_minha',
                      label: 'Minha Seleção',
                      icon: Crown,
                      badge: selecaoActionCount,
                    },
                    { id: 'selecao_mundo', label: 'Seleções & FIFA', icon: Globe },
                  ]
                : activeTab === 'scouting' || activeTab === 'youth' || activeTab === 'training'
                ? [
                    {
                      id: 'scouting',
                      label: 'Olheiros & Base',
                      icon: Compass,
                      badge: activeScoutingMissionsCount,
                    },
                    { id: 'training', label: 'Treinos & CT', icon: Dumbbell },
                  ]
                : activeTab === 'finances' ||
                  activeTab === 'sponsors' ||
                  activeTab === 'board' ||
                  activeTab === 'trophies' ||
                  activeTab === 'history'
                ? [
                    {
                      id: 'finances',
                      label: 'Finanças & Estádio',
                      icon: Building2,
                      badge: userClub.finances.balance < 0 ? 1 : 0,
                    },
                    {
                      id: 'sponsors',
                      label: 'Patrocínios',
                      icon: Handshake,
                      badge: !gameSettings.classicFastMode ? openSponsorSlotsCount : 0,
                    },
                    {
                      id: 'board',
                      label: 'Diretoria & Carreira',
                      icon: Briefcase,
                      badge: pendingJobOffersCount,
                    },
                    { id: 'trophies', label: 'Troféus', icon: Award },
                    { id: 'history', label: 'Histórico', icon: History },
                  ]
                : null;

            if (!subTabGroup) return null;
            const normalizedSubActive =
              activeTab === 'selecao'
                ? 'selecao_minha'
                : activeTab === 'youth'
                ? 'scouting'
                : activeTab;

            return (
              <div className="mb-4 bg-[#0b1220]/90 border border-slate-800/80 rounded-xl px-2 py-1.5">
                <ScrollableTabStrip
                  activeKey={normalizedSubActive}
                  ariaLabel="Sub-seções da área atual"
                  innerClassName="flex items-center gap-1.5"
                >
                  {subTabGroup.map((sub) => {
                    const SubIcon = sub.icon;
                    const isSubActive = normalizedSubActive === sub.id;
                    return (
                      <button
                        key={sub.id}
                        type="button"
                        data-tab-active={isSubActive ? 'true' : undefined}
                        onClick={() => {
                          soundEngine.playClick();
                          setActiveTab(sub.id);
                        }}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
                          isSubActive
                            ? 'bg-sky-500/20 text-sky-200 border border-sky-400/40 font-bold'
                            : 'text-slate-400 hover:text-white hover:bg-slate-800/70 border border-transparent'
                        }`}
                      >
                        <SubIcon className={`w-3.5 h-3.5 shrink-0 ${isSubActive ? 'text-sky-400' : 'text-slate-400'}`} />
                        <span>{sub.label}</span>
                        {sub.badge !== undefined && sub.badge > 0 && (
                          <span className="font-mono text-[10px] tabular-nums px-1.5 py-0.2 rounded bg-sky-500/25 text-sky-300 font-bold">
                            {sub.badge}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </ScrollableTabStrip>
              </div>
            );
          })()}

          {/* Special Pre-Match Rivalry Alert Banner when next match is a Derby */}
          {activeTab !== 'hub' && upcomingRivalry && upcomingOpponentClub && upcomingUserFixture && (
            <div className="mb-5 bg-[#0c1424] border border-amber-500/40 rounded-2xl px-4 sm:px-5 py-3.5 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center font-black text-xs border border-white/20 shrink-0"
                  style={{
                    backgroundColor: upcomingOpponentClub.colors.primary,
                    color: upcomingOpponentClub.colors.text,
                  }}
                >
                  {upcomingOpponentClub.initials}
                </div>
                <div className="min-w-0 text-xs">
                  <div className="font-bold text-amber-300 truncate">
                    Alerta de Clássico na Próxima Partida · {upcomingRivalry.derbyName} vs{' '}
                    {upcomingOpponentClub.name}
                  </div>
                  <div className="text-slate-400 truncate tabular-nums mt-0.5">
                    Dificuldade {upcomingRivalry.difficultyLabel} · Vitória rende +
                    {upcomingRivalry.reputationWinBonus} pts de Reputação e +
                    {upcomingRivalry.fanSocioWinBonus} Sócios
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={handleOpenMatchModalWithDateCheck}
                className="px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs whitespace-nowrap shrink-0 cursor-pointer transition-colors"
              >
                Ver Alerta do Clássico
              </button>
            </div>
          )}

          <TabErrorBoundary resetKey={activeTab} onRecoverToHub={() => setActiveTab('hub')}>
          {/* Tab: Central do Clube (Executive Hub Dashboard) */}
          {activeTab === 'hub' && (
            <ClubHubDashboard
              userClub={userClub}
              allClubs={clubsWithWorldGuests}
              gameState={gameState}
              upcomingFixture={upcomingUserFixture}
              upcomingOpponent={upcomingOpponentClub}
              isTodayMatchDay={isTodayMatchDay}
              onNavigateTab={(tab) => setActiveTab(tab)}
              onOpenContracts={() => {
                setSquadSubView('contracts');
                setActiveTab('squad');
              }}
              onInspectClub={(clubId) => {
                setInspectedClubId(clubId);
                setInspectedPlayerId(undefined);
                setClubInspectNonce((n) => n + 1);
                setActiveTab('clubs');
              }}
              onInspectClubPlayer={(clubId, playerId) => {
                setInspectedClubId(clubId);
                setInspectedPlayerId(playerId);
                setClubInspectNonce((n) => n + 1);
                setActiveTab('clubs');
              }}
              onOpenMarketTarget={(tab, searchQuery) => {
                setMarketInitialTab(tab);
                setMarketInitialSearch(searchQuery || '');
                setMarketSearchNonce((n) => n + 1);
                setActiveTab('market');
              }}
              onToggleWatchlistPlayer={handleToggleWatchlistPlayer}
              onUpdateTactics={handleUpdateTactics}
              onApplyAssistantLineup={handleApplyAssistantLineup}
              onPlayMatch={handleOpenMatchModalWithDateCheck}
              onInstantResult={() => handleInstantSimulateNextMatch()}
              onAdvanceToMatch={handleAdvanceToMatch}
              onFinishSeason={handleFinishSeason}
              hasDismissedOnboarding={Boolean(gameSettings.hasDismissedOnboarding)}
              onDismissOnboarding={() =>
                handleUpdateSettings({
                  ...gameSettings,
                  hasDismissedOnboarding: true,
                })
              }
              isDeadlineDayOpen={isDeadlineDayOpen}
              deadlineDayClosesOn={deadlineDayInfo.closesOnDisplay}
              onOpenDeadlineDay={() => handleOpenDeadlineDay()}
              smartAdvanceNotice={smartAdvanceNotice}
              smartAdvanceSummary={smartAdvanceSummary}
              onDismissSmartAdvanceNotice={() => {
                setSmartAdvanceNotice(null);
                setSmartAdvanceSummary(null);
              }}
              onOpenFirstRunTour={() => setIsFirstRunTourOpen(true)}
              onLoadTacticalPreset={handleLoadTacticalPreset}
              onLoadLineupProfile={handleLoadLineupProfile}
              classicFastMode={Boolean(gameSettings.classicFastMode)}
              onToggleClassicFastMode={handleToggleClassicFastMode}
            />
          )}

          <Suspense fallback={<LazyViewFallback />}>
          {/* Tab: Meus Jogadores (Streamlined Player Directory) */}
          {activeTab === 'players' && (
            <MyPlayersView
              club={userClub}
              upcomingCompetition={upcomingUserFixture?.competition}
              selecaoCalledUpIds={gameState.nationalTeam?.calledUpPlayerIds || []}
              onUpdateSquad={handleUpdateSquad}
              onComparePlayer={(player, club) =>
                setComparingGlobalPlayer({ player, club: club ?? userClub })
              }
              onNavigateTab={(tab) => setActiveTab(tab)}
              onNavigateSquadSubView={(subView) => {
                setSquadSubView(subView);
                setActiveTab('squad');
              }}
            />
          )}

          {/* Tab: Squad (Escalação) */}
          {activeTab === 'squad' && (
          <div className="space-y-4">
            {/* View toggle (Pitch vs Table vs Athlete Report vs Contracts vs Management) */}
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h2 className="text-lg font-black text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-sky-400" />
                <span>
                  {squadSubView === 'pitch'
                    ? 'Escalação & Prancheta Tática'
                    : squadSubView === 'table'
                    ? 'Elenco Completo: Atributos & Condições'
                    : squadSubView === 'report'
                    ? 'Relatório de Atletas: Distribuição do Plantel'
                    : squadSubView === 'contracts'
                    ? 'Gestão de Contratos, Multas & Renovação'
                    : 'Mercado do Elenco: Vendas & Empréstimos'}
                </span>
              </h2>

              <ScrollableTabStrip
                activeKey={squadSubView}
                ariaLabel="Sub-abas de Escalação e Elenco"
                className="w-full xl:w-auto max-w-full"
                innerClassName="flex items-center gap-1 bg-slate-950 border border-slate-800 p-1 rounded-xl shadow-lg"
              >
                <button
                  data-tab-active={squadSubView === 'pitch' ? 'true' : undefined}
                  onClick={() => {
                    soundEngine.playClick();
                    setSquadSubView('pitch');
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all whitespace-nowrap shrink-0 ${
                    squadSubView === 'pitch'
                      ? 'bg-sky-500 text-slate-950 shadow-md shadow-sky-500/20 font-black'
                      : 'text-slate-400 hover:text-white hover:bg-slate-900'
                  }`}
                >
                  <Grid className="w-3.5 h-3.5" />
                  <span>Campo Tático</span>
                </button>
                <button
                  data-tab-active={squadSubView === 'table' ? 'true' : undefined}
                  onClick={() => {
                    soundEngine.playClick();
                    setSquadSubView('table');
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all whitespace-nowrap shrink-0 ${
                    squadSubView === 'table'
                      ? 'bg-sky-500 text-slate-950 shadow-md shadow-sky-500/20 font-black'
                      : 'text-slate-400 hover:text-white hover:bg-slate-900'
                  }`}
                >
                  <List className="w-3.5 h-3.5" />
                  <span>Lista do Elenco</span>
                </button>
                <button
                  data-tab-active={squadSubView === 'report' ? 'true' : undefined}
                  onClick={() => {
                    soundEngine.playClick();
                    setSquadSubView('report');
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all whitespace-nowrap shrink-0 ${
                    squadSubView === 'report'
                      ? 'bg-sky-500 text-slate-950 shadow-md shadow-sky-500/20 font-black'
                      : 'text-slate-400 hover:text-white hover:bg-slate-900'
                  }`}
                >
                  <PieChart className="w-3.5 h-3.5" />
                  <span>Relatório de Atletas</span>
                </button>
                <button
                  data-tab-active={squadSubView === 'contracts' ? 'true' : undefined}
                  onClick={() => {
                    soundEngine.playClick();
                    setSquadSubView('contracts');
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all whitespace-nowrap shrink-0 tabular-nums ${
                    squadSubView === 'contracts'
                      ? 'bg-amber-400 text-slate-950 shadow-md shadow-amber-500/20 font-black'
                      : 'text-amber-300 hover:text-white hover:bg-slate-900'
                  }`}
                >
                  <FileSignature className="w-3.5 h-3.5" />
                  <span>
                    Contratos & Multas
                    {userClub.squad.filter(
                      (p) => !p.isLoan && p.contractYears <= 1 && !p.retiringAtSeasonEnd && !p.preContractClubId
                    ).length > 0
                      ? ` (${
                          userClub.squad.filter(
                            (p) => !p.isLoan && p.contractYears <= 1 && !p.retiringAtSeasonEnd && !p.preContractClubId
                          ).length
                        })`
                      : ''}
                  </span>
                </button>
                <button
                  data-tab-active={squadSubView === 'management' ? 'true' : undefined}
                  onClick={() => {
                    soundEngine.playClick();
                    setSquadSubView('management');
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all whitespace-nowrap shrink-0 ${
                    squadSubView === 'management'
                      ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 shadow-md shadow-emerald-500/20 font-black'
                      : 'text-emerald-400 hover:text-white hover:bg-slate-900'
                  }`}
                >
                  <Tag className="w-3.5 h-3.5" />
                  <span>Vendas & Empréstimos</span>
                </button>
              </ScrollableTabStrip>
            </div>

            {squadSubView === 'pitch' ? (
              <PitchTacticsView
                club={userClub}
                upcomingCompetition={upcomingUserFixture?.competition}
                onUpdateSquad={handleUpdateSquad}
                onUpdateFormation={(formation: FormationType) =>
                  handleUpdateTactics({ ...userClub.tactics, formation })
                }
                onSaveLineupProfile={handleSaveLineupProfile}
                onLoadLineupProfile={handleLoadLineupProfile}
              />
            ) : squadSubView === 'table' ? (
              <SquadTable 
                club={userClub} 
                allClubs={gameState.clubs}
                upcomingCompetition={upcomingUserFixture?.competition}
                selecaoCalledUpIds={gameState.nationalTeam?.calledUpPlayerIds || []}
                isSyncingNationalities={isSyncingNationalities}
                nationalitySyncFeedback={nationalitySyncFeedback}
                onSyncNationalitiesWithAI={() => void handleSyncNationalitiesWithAI(true)}
                onDismissNationalitySyncFeedback={() => setNationalitySyncFeedback(null)}
                onUpdateSquad={handleUpdateSquad}
                onTriggerBuyOption={handleTriggerBuyOption}
                onNegotiateLoanBuyOption={handleNegotiateLoanBuyOption}
                onTerminateLoanEarly={handleTerminateLoanEarly}
                onOpenManagement={() => setSquadSubView('management')}
                onOpenContracts={() => setSquadSubView('contracts')}
                onNavigateToMarket={() => {
                  setMarketInitialTab('all');
                  setActiveTab('market');
                }}
                onNavigateToScouting={() => setActiveTab('scouting')}
              />
            ) : squadSubView === 'report' ? (
              <SquadReportPanel
                club={userClub}
                onNavigateToMarket={() => {
                  setMarketInitialTab('all');
                  setActiveTab('market');
                }}
                onNavigateToScouting={() => setActiveTab('scouting')}
              />
            ) : squadSubView === 'contracts' ? (
              <ContractManagementView
                userClub={userClub}
                seasonYear={gameState.currentSeasonYear}
                onRenewContract={handleRenewPlayerContract}
                onBatchRenewContracts={handleBatchRenewContracts}
                onNavigateToBosmanMarket={() => {
                  setMarketInitialTab('bosman');
                  setActiveTab('market');
                }}
              />
            ) : (
              <SquadManagementView
                userClub={userClub}
                allClubs={gameState.clubs}
                currentDate={gameState.currentDate}
                pendingTransfers={gameState.pendingTransfers || []}
                transferHistory={gameState.transferHistory || []}
                currentSeasonYear={gameState.currentSeasonYear}
                saSeasonYear={gameState.saSeasonYear}
                europeSeasonYear={gameState.europeSeasonYear}
                onUpdateSquad={handleUpdateSquad}
                onSellPlayerToClub={handleSellPlayerToClub}
                onLoanOutPlayer={handleLoanOutPlayer}
                onListPlayerForSale={handleListPlayerForSale}
                onDelistPlayerForSale={handleDelistPlayerForSale}
                onTogglePlayerForLoan={handleTogglePlayerForLoan}
              />
            )}
          </div>
        )}

        {/* Tab: Calendar (Calendário & Datas dos Jogos) */}
        {activeTab === 'calendar' && (
          <CalendarView
            userClub={userClub}
            allClubs={clubsWithWorldGuests}
            currentDate={gameState.currentDate}
            fixtures={allCompetitionsFixtures}
            currentRound={gameState.currentRound}
            totalRounds={gameState.totalRounds}
            seasonYear={gameState.currentSeasonYear}
            europeSeasonYear={gameState.europeSeasonYear}
            nationalTeam={gameState.nationalTeam}
            pendingTransfersCount={(gameState.pendingTransfers || []).length}
            onOpenSelecaoTab={() => setActiveTab('selecao')}
            onPlaySelecaoMatch={(fixtureId) => {
              setSelecaoLaunchFixtureId(fixtureId || 'NEXT');
              setActiveTab('selecao');
            }}
            onAdvanceDay={handleAdvanceDay}
            onAdvanceToMatch={handleAdvanceToMatch}
            onPlayMatch={handleOpenMatchModalWithDateCheck}
            onInstantResult={() => handleInstantSimulateNextMatch()}
            onFinishSeason={handleFinishSeason}
            onScheduleFriendlyTour={handleScheduleFriendlyTour}
          />
        )}

        {/* Tab: Training Center (Centro de Treinamento & Evolução) */}
        {activeTab === 'training' && (
          <TrainingCenterView
            club={userClub}
            gameState={gameState}
            allFixtures={allCompetitionsFixtures}
            onUpdateClub={handleUpdateFinancesAndStadium}
            onNavigateToFinances={() => setActiveTab('finances')}
            onNavigateToYouthAcademy={() => setActiveTab('youth')}
            onRunYouthTryout={handleRunYouthTryout}
          />
        )}

        {/* Tab: Tactics */}
        {activeTab === 'tactics' && (
          <TacticsPanel
            club={userClub}
            upcomingCompetition={upcomingUserFixture?.competition}
            upcomingOpponentName={upcomingOpponentClub?.name}
            upcomingOpponentClub={upcomingOpponentClub}
            upcomingFixture={upcomingUserFixture}
            allFixtures={allCompetitionsFixtures}
            upcomingRivalryName={upcomingRivalry?.derbyName || null}
            onUpdateTactics={handleUpdateTactics}
            onApplyAssistantLineup={handleApplyAssistantLineup}
            onSaveTacticalPreset={handleSaveTacticalPreset}
            onLoadTacticalPreset={handleLoadTacticalPreset}
          />
        )}

        {/* Tab: Standings */}
        {activeTab === 'standings' && (
          <StandingsView
            clubs={clubsWithWorldGuests}
            standingsA={gameState.standingsA}
            standingsB={gameState.standingsB}
            standingsC={gameState.standingsC}
            standingsD={gameState.standingsD}
            standingsLibertadores={gameState.standingsLibertadores}
            standingsSulamericana={gameState.standingsSulamericana}
            standingsEstadual={gameState.standingsEstadual}
            standingsCopaNordeste={gameState.standingsCopaNordeste}
            standingsCopaVerde={gameState.standingsCopaVerde}
            standingsSouthAmerica={gameState.standingsSouthAmerica}
            standingsEurope={gameState.standingsEurope}
            standingsWorldLeagues={gameState.standingsWorldLeagues}
            standingsChampionsLeague={gameState.standingsChampionsLeague}
            standingsEuropaLeague={gameState.standingsEuropaLeague}
            standingsConferenceLeague={gameState.standingsConferenceLeague}
            standingsCopaInternacional={gameState.standingsCopaInternacional}
            standingsAfcChampions={gameState.standingsAfcChampions}
            standingsSuperMundial={gameState.standingsSuperMundial}
            fixturesA={gameState.fixturesA}
            fixturesB={gameState.fixturesB}
            fixturesC={gameState.fixturesC}
            fixturesD={gameState.fixturesD}
            fixturesLibertadores={gameState.fixturesLibertadores}
            fixturesSulamericana={gameState.fixturesSulamericana}
            fixturesCopaBrasil={gameState.fixturesCopaBrasil}
            fixturesCopaNordeste={gameState.fixturesCopaNordeste}
            fixturesCopaVerde={gameState.fixturesCopaVerde}
            fixturesSupercopa={gameState.fixturesSupercopa}
            fixturesRecopa={gameState.fixturesRecopa}
            fixturesEstadual={gameState.fixturesEstadual}
            fixturesIntercontinental={gameState.fixturesIntercontinental}
            fixturesConcacafChampions={gameState.fixturesConcacafChampions}
            fixturesAfcChampions={gameState.fixturesAfcChampions}
            fixturesSouthAmerica={gameState.fixturesSouthAmerica}
            fixturesEurope={gameState.fixturesEurope}
            fixturesWorldLeagues={gameState.fixturesWorldLeagues}
            fixturesChampionsLeague={gameState.fixturesChampionsLeague}
            fixturesEuropaLeague={gameState.fixturesEuropaLeague}
            fixturesConferenceLeague={gameState.fixturesConferenceLeague}
            fixturesUefaSupercup={gameState.fixturesUefaSupercup}
            fixturesCopaInternacional={gameState.fixturesCopaInternacional}
            fixturesSuperMundial={gameState.fixturesSuperMundial}
            fixturesEngCommunityShield={gameState.fixturesEngCommunityShield}
            fixturesEngFaCup={gameState.fixturesEngFaCup}
            fixturesEngEflCup={gameState.fixturesEngEflCup}
            fixturesEuropeanCups={gameState.fixturesEuropeanCups}
            fixturesSouthAmericanCups={gameState.fixturesSouthAmericanCups}
            fixturesWorldCups={gameState.fixturesWorldCups}
            drawnCompetitions={gameState.drawnCompetitions}
            onMarkCompetitionDrawn={handleMarkCompetitionDrawn}
            onGenerateCompetitionDraw={handleGenerateCompetitionDraw}
            userClub={userClub}
            currentRound={gameState.currentRound}
            seasonYear={gameState.currentSeasonYear}
            europeSeasonYear={gameState.europeSeasonYear}
            saSeasonYear={gameState.saSeasonYear}
            initialCompetition={standingsInitialComp}
            competitionSelectNonce={standingsCompNonce}
            onInspectClub={(clubId) => {
              setInspectedClubId(clubId);
              setInspectedPlayerId(undefined);
              setClubInspectNonce((n) => n + 1);
              setActiveTab('clubs');
            }}
          />
        )}

        {/* Tab: World Clubs Explorer (Outros Times, Elencos, Estruturas & Finanças) */}
        {activeTab === 'clubs' && (
          <WorldClubsExplorer
            userClub={userClub}
            allClubs={clubsWithWorldGuests}
            careerClubs={gameState.clubs}
            allFixtures={allCompetitionsFixtures}
            gameState={gameState}
            initialClubId={inspectedClubId}
            initialPlayerId={inspectedPlayerId}
            initialInspectNonce={clubInspectNonce}
            onSignPlayer={handleSignPlayer}
            onPayReleaseClause={handlePayReleaseClause}
            onLoanInPlayer={handleLoanInPlayer}
            watchlistPlayerIds={watchlistPlayerIds}
            onToggleWatchlistPlayer={handleToggleWatchlistPlayer}
            onOpenWatchlist={handleOpenMarketWatchlist}
            onApplyToClubJob={handleApplyToClubJob}
            onNavigateToMarket={() => {
              setMarketInitialTab('all');
              setActiveTab('market');
            }}
          />
        )}

        {/* Tab: Transfer Market */}
        {activeTab === 'market' && (
          <TransferMarketView
            userClub={userClub}
            allClubs={gameState.clubs}
            freeAgents={gameState.transferMarket}
            transferHistory={gameState.transferHistory || []}
            currentSeasonYear={gameState.currentSeasonYear}
            initialTab={marketInitialTab}
            initialSearchQuery={marketInitialSearch}
            initialSearchNonce={marketSearchNonce}
            gameState={gameState}
            transferOffers={gameState.transferOffers || []}
            aiDirectorAutoNegotiate={Boolean(gameState.aiDirectorAutoNegotiate)}
            isSyncingNationalities={isSyncingNationalities}
            nationalitySyncFeedback={nationalitySyncFeedback}
            onSyncNationalitiesWithAI={() => void handleSyncNationalitiesWithAI(false, true)}
            onDismissNationalitySyncFeedback={() => {
              setNationalitySyncFeedback(null);
              setNationalityGroundingSources([]);
            }}
            onRespondTransferOffer={handleRespondTransferOffer}
            onShopPlayerWithAi={handleShopPlayerWithAi}
            onToggleAiAutoNegotiate={handleToggleAiAutoNegotiate}
            onSignPlayer={handleSignPlayer}
            onBuyoutTransferClause={handleBuyoutTransferClause}
            onSellPlayerToClub={handleSellPlayerToClub}
            onSellPlayerUrgentDeadline={handleSellPlayerToClub}
            onSignPreContract={handleSignPreContract}
            onPayReleaseClause={handlePayReleaseClause}
            onLoanInPlayer={handleLoanInPlayer}
            onLoanOutPlayer={handleLoanOutPlayer}
            onTriggerBuyOption={handleTriggerBuyOption}
            onNegotiateLoanBuyOption={handleNegotiateLoanBuyOption}
            onTerminateLoanEarly={handleTerminateLoanEarly}
            onListPlayerForSale={handleListPlayerForSale}
            onDelistPlayer={handleDelistPlayerForSale}
            onTogglePlayerLoanList={(id) => handleTogglePlayerForLoan(id, true)}
            watchlist={gameState.watchlist || []}
            onToggleWatchlistPlayer={handleToggleWatchlistPlayer}
            onRemoveWatchlistPlayer={handleRemoveWatchlistPlayer}
            onClearWatchlist={handleClearWatchlist}
            onOpenScouting={() => setActiveTab('scouting')}
          />
        )}

        {/* Tab: Scouting Network & Club Youth Academy (Rede de Olheiros & Base do Clube) */}
        {(activeTab === 'scouting' || activeTab === 'youth') && (
          <ScoutingView
            userClub={userClub}
            scoutingNetwork={
              gameState.scoutingNetwork || createInitialScoutingNetwork(userClub)
            }
            currentDate={gameState.currentDate}
            initialSubTab={activeTab === 'youth' ? 'academy' : undefined}
            onDispatchMission={handleDispatchScoutMission}
            onToggleShortlist={handleToggleShortlistProspect}
            onDismissProspect={handleDismissProspect}
            onSignProspect={handleSignScoutedProspect}
            onUpgradeScout={handleUpgradeScout}
            onHireFourthScout={handleHireFourthScout}
            onRunYouthTryout={handleRunYouthTryout}
            onRecruitYouthCandidate={handleRecruitYouthCandidate}
            onDismissYouthCandidate={handleDismissYouthCandidate}
            onPromoteYouthBoy={handlePromoteYouthBoy}
            onReleaseYouthBoy={handleReleaseYouthBoy}
            onUpgradeYouthAcademy={handleUpgradeYouthAcademy}
            onUpdateYouthTrainingPlan={handleUpdateYouthTrainingPlan}
            onSetYouthBoyFocus={handleSetYouthBoyFocus}
            onRunYouthTrainingSession={handleRunYouthTrainingSession}
            onAdvanceDay={handleAdvanceDay}
          />
        )}

        {/* Tab: Finances & Stadium */}
        {activeTab === 'finances' && (
          <FinancesStadiumView
            club={userClub}
            currentDate={gameState.currentDate}
            currentRound={gameState.currentRound}
            seasonYear={gameState.currentSeasonYear}
            fanConfidence={gameState.managerCareer?.fanConfidence ?? 68}
            scoutingWeeklyWages={(gameState.scoutingNetwork?.scouts || []).reduce(
              (acc, sc) => acc + (sc.weeklySalary || 0),
              0
            )}
            managerMonthlySalary={gameState.managerCareer?.monthlySalary || 45000}
            transferClauses={gameState.transferClauses || []}
            onUpdateFinancesAndStadium={handleUpdateFinancesAndStadium}
            onNavigateToSponsors={() => setActiveTab('sponsors')}
          />
        )}

        {/* Tab: Board & Dynamic Manager Career */}
        {activeTab === 'board' && (
          <BoardCareerView
            userClub={userClub}
            managerName={gameState.managerName}
            seasonYear={gameState.currentSeasonYear}
            currentRound={gameState.currentRound}
            career={
              gameState.managerCareer ||
              createInitialManagerCareer(
                userClub,
                gameState.clubs,
                gameState.currentSeasonYear,
                gameState.currentDate,
                gameState.fixturesCopaBrasil,
                gameState.fixturesLibertadores,
                gameState.fixturesSulamericana,
                gameState.fixturesChampionsLeague,
                gameState.fixturesEuropaLeague,
                gameState.fixturesConferenceLeague,
                gameState.fixturesCopaInternacional,
                gameState.fixturesConcacafChampions,
                gameState.fixturesAfcChampions
              )
            }
            gameState={gameState}
            initialSubTab={boardSubTab}
            onAcceptOffer={(offerId) => handleAcceptJobOffer(offerId, 'Aceitou Proposta')}
            onDeclineOffer={handleDeclineJobOffer}
            onRequestBudgetBoost={handleRequestBoardBudget}
            onScoutVacancies={handleScoutCoachingVacancies}
            onAcceptNationalOffer={handleAcceptNationalOffer}
            onDeclineNationalOffer={handleDeclineNationalOffer}
            onScoutNationalVacancies={handleScoutNationalVacancies}
            onApplyNationalJob={handleApplyNationalJob}
            onHireRealCoachForClub={handleHireRealCoachForUserClub}
            onResignFromClub={handleResignFromClub}
            onApplyToClubJob={handleApplyToClubJob}
            onResolveLockerDemand={handleResolveLockerDemand}
            onHoldPlayerTalk={handleHoldPlayerTalk}
            onStartPressConference={handleStartPressConference}
            onSubmitPressConference={handleSubmitPressConference}
          />
        )}

        {/* Tab: Central de Seleções (Área 1: Minha Seleção | Área 2: Seleções & Torneios FIFA) */}
        {(activeTab === 'selecao' ||
          activeTab === 'selecao_minha' ||
          activeTab === 'selecao_mundo') && (
          <NationalTeamView
            userClub={userClub}
            allClubs={gameState.clubs}
            managerName={gameState.managerName}
            seasonYear={gameState.currentSeasonYear}
            currentRound={gameState.currentRound}
            currentDate={gameState.currentDate}
            initialArea={activeTab === 'selecao_mundo' ? 'WORLD' : 'MY_TEAM'}
            onRequestSwitchArea={(area) =>
              setActiveTab(area === 'WORLD' ? 'selecao_mundo' : 'selecao_minha')
            }
            initialLaunchFixtureId={selecaoLaunchFixtureId}
            onConsumeLaunchFixture={() => setSelecaoLaunchFixtureId(null)}
            managerReputation={gameState.managerCareer?.managerReputation || 50}
            nationalTeam={ensureUpgradedNationalTeamState(
              gameState.nationalTeam,
              gameState.clubs,
              Number(gameState.currentDate.slice(0, 4)) || gameState.currentSeasonYear
            )}
            onAcceptCbfRole={handleAcceptCbfRole}
            onAppointNationalTeam={handleAppointNationalTeam}
            onDeclineCbfInvite={handleDeclineCbfInvite}
            onResignSelecao={handleResignSelecao}
            onAcceptNationalOffer={handleAcceptNationalOffer}
            onDeclineNationalOffer={handleDeclineNationalOffer}
            onScoutNationalVacancies={handleScoutNationalVacancies}
            onApplyNationalJob={handleApplyNationalJob}
            onPlaySelecaoWindow={handlePlaySelecaoWindow}
            onToggleCallUp={handleToggleSelecaoCallUp}
            onReplaceCallUp={handleReplaceSelecaoCallUp}
            onToggleStarter={handleToggleSelecaoStarter}
            onSwapLineupPlayers={handleSwapSelecaoLineup}
            onMovePlayerToPitchCoords={handleMoveSelecaoPlayerToCoords}
            onResetCustomPositions={handleResetSelecaoCustomPositions}
            onAutoPickSquad={handleAutoPickSelecaoSquad}
            onAutoPickStartersOnly={handleAutoPickSelecaoStartersOnly}
            onChangeFormation={handleChangeSelecaoFormation}
            onSetCaptain={handleSetSelecaoCaptain}
            onChangeTacticStyle={handleChangeSelecaoTacticStyle}
            onDrawNationalTournament={handleDrawNationalTournament}
            onInspectClub={(clubId) => {
              setInspectedClubId(clubId);
              setInspectedPlayerId(undefined);
              setClubInspectNonce((n) => n + 1);
              setActiveTab('clubs');
            }}
            isSyncingNationalities={isSyncingNationalities}
            nationalitySyncFeedback={nationalitySyncFeedback}
            nationalityGroundingSources={nationalityGroundingSources}
            onSyncNationalitiesWithAI={() => void handleSyncNationalitiesWithAI(false, true)}
            onDismissNationalitySyncFeedback={() => {
              setNationalitySyncFeedback(null);
              setNationalityGroundingSources([]);
            }}
          />
        )}

        {/* Tab: Sponsors (4 Sponsorship Slots) */}
        {activeTab === 'sponsors' && (
          <SponsorsView
            club={userClub}
            onSignSponsor={handleSignSponsor}
            onTerminateSponsor={handleTerminateSponsor}
          />
        )}

        {/* Tab: Inbox News */}
        {activeTab === 'inbox' && (
          <InboxNewsView
            messages={gameState.inbox}
            onMarkRead={handleMarkInboxRead}
            userClub={userClub}
            onNavigateToSquad={() => setActiveTab('squad')}
            onNavigateToScouting={() => setActiveTab('scouting')}
            onNavigateToMarket={() => {
              setMarketInitialTab('ai_director');
              setActiveTab('market');
            }}
            onNavigateToHonors={() => {
              setTrophiesSubTab('honors');
              setActiveTab('trophies');
            }}
            onNavigateToBoard={(subTab) => {
              setBoardSubTab(subTab || 'goals');
              setActiveTab('board');
            }}
            onNavigateToSelecao={() => setActiveTab('selecao_minha')}
            onMarkAllRead={handleMarkAllInboxRead}
          />
        )}

        {/* Tab: Trophies & Career */}
        {activeTab === 'trophies' && (
          <TrophyCabinetView
            userClub={userClub}
            trophyHistory={gameState.trophyHistory}
            individualAwardsHistory={gameState.individualAwardsHistory || []}
            gameState={gameState}
            managerName={gameState.managerName}
            seasonYear={gameState.currentSeasonYear}
            initialSubTab={trophiesSubTab}
            onOpenAlmanacHistory={() => setActiveTab('history')}
          />
        )}

        {/* Tab: Historical Almanac & All-Time Records */}
        {activeTab === 'history' && (
          <SeasonHistoryView
            gameState={gameState}
            userClub={userClub}
            onInspectClub={(clubId) => {
              setInspectedClubId(clubId);
              setInspectedPlayerId(undefined);
              setClubInspectNonce((n) => n + 1);
              setActiveTab('clubs');
            }}
            onInspectPlayer={(clubId, playerId) => {
              setInspectedClubId(clubId);
              setInspectedPlayerId(playerId);
              setClubInspectNonce((n) => n + 1);
              setActiveTab('clubs');
            }}
            onOpenUserSquad={() => {
              setSquadSubView('table');
              setActiveTab('squad');
            }}
          />
        )}
          </Suspense>
          </TabErrorBoundary>
        </main>
      </div>

      <Suspense fallback={null}>

      {/* Pre-Match Special Rivalry Alert Modal */}
      {isRivalryAlertOpen &&
        upcomingRivalry &&
        upcomingOpponentClub &&
        upcomingUserFixture && (
          <PreMatchRivalryModal
            userClub={userClub}
            opponentClub={upcomingOpponentClub}
            fixture={upcomingUserFixture}
            rivalry={upcomingRivalry}
            onConfirmKickoff={(posture) => {
              setPreMatchDerbyPosture(posture);
              setIsRivalryAlertOpen(false);
              setIsMatchModalOpen(true);
            }}
            onInstantKickoff={(posture) => {
              setPreMatchDerbyPosture(posture);
              setIsRivalryAlertOpen(false);
              handleInstantSimulateNextMatch(posture);
            }}
            onAdjustLineupFirst={() => {
              setIsRivalryAlertOpen(false);
              setActiveTab('squad');
            }}
            onClose={() => setIsRivalryAlertOpen(false)}
          />
        )}

      {/* Match Simulator Modal */}
      {isMatchModalOpen && (
        <MatchSimulatorModal
          userClub={userClub}
          allClubs={clubsWithWorldGuests}
          currentRoundFixtures={currentRoundFixtures}
          allFixtures={allCompetitionsFixtures}
          gameSettings={gameSettings}
          preMatchDerbyPosture={preMatchDerbyPosture}
          fanConfidence={gameState.managerCareer?.fanConfidence ?? 68}
          managerSpecialty={gameState.managerSpecialty}
          onFinishRound={handleFinishRound}
          onClose={() => setIsMatchModalOpen(false)}
        />
      )}

      {/* Deadline Day Interactive Modal (Último Dia da Janela) */}
      {isDeadlineDayModalOpen && deadlineDaySession && (
        <DeadlineDayModal
          session={deadlineDaySession}
          userClub={userClub}
          allClubs={clubsWithWorldGuests}
          gameState={gameState}
          onAcceptFlashOffer={handleAcceptDeadlineFlashOffer}
          onSignBargainPlayer={handleSignDeadlineBargain}
          onUpdateSession={setDeadlineDaySession}
          onCloseWindowComplete={handleCloseDeadlineDayComplete}
          onMinimize={() => setIsDeadlineDayModalOpen(false)}
        />
      )}

      {/* Interactive 4-Step First-Run Onboarding Tour Modal */}
      {isFirstRunTourOpen && (
        <FirstRunTourModal
          clubShortName={userClub.shortName}
          onNavigateTab={(tab) => setActiveTab(tab)}
          onFinish={() => {
            try {
              localStorage.setItem('patofoot_first_run_tour_seen_v1', '1');
            } catch {
              // ignore storage errors
            }
            setIsFirstRunTourOpen(false);
          }}
        />
      )}

      {/* 1-Click Instant Match Result Post-Match Summary Modal */}
      {instantMatchSummary && (
        <InstantMatchResultModal
          summary={instantMatchSummary}
          userClubId={userClub.id}
          onClose={() => setInstantMatchSummary(null)}
        />
      )}

      {/* Save / Load & Career Menu Modal */}
      {isSaveModalOpen && (
        <SaveLoadModal
          currentSave={gameState}
          autoSaveEnabled={gameSettings.autoSaveEnabled}
          autoSaveIntervalMinutes={gameSettings.autoSaveIntervalMinutes}
          onLoadSave={(loaded) => {
            const sanitized = sanitizeSave(loaded);
            if (gameSettings.autoSaveEnabled) {
              void persistCareerSave('brasfoot_autosave', sanitized);
            }
            setGameState(sanitized);
          }}
          onSaveAndExitToTitle={handleSaveAndExitToTitle}
          onOpenSettings={() => {
            setSettingsInitialSection('career');
            setIsSettingsModalOpen(true);
          }}
          onStartAnotherCareer={() => {
            handleSaveAndExitToTitle();
            setOpenClubPickerOnTitle(true);
          }}
          onClose={() => setIsSaveModalOpen(false)}
        />
      )}

      {/* Game Settings Modal */}
      {isSettingsModalOpen && (
        <SettingsModal
          settings={gameSettings}
          onUpdateSettings={handleUpdateSettings}
          initialSection={settingsInitialSection}
          isInGame={true}
          onSaveAndExitToTitle={handleSaveAndExitToTitle}
          onClearAllSavedData={handleClearAllSavedData}
          onClose={() => setIsSettingsModalOpen(false)}
        />
      )}

      {/* Manual Como Jogar & Novidades v1.0 */}
      {isGuideModalOpen && (
        <GameGuideModal
          initialTab={guideInitialTab}
          onClose={() => setIsGuideModalOpen(false)}
        />
      )}

      {/* Global Search Modal (Jogadores, Times e Competições) */}
      {isGlobalSearchOpen && (
        <GlobalSearchModal
          isOpen={isGlobalSearchOpen}
          userClub={userClub}
          allClubs={clubsWithWorldGuests}
          freeAgents={gameState.transferMarket}
          seasonYear={gameState.currentSeasonYear}
          europeSeasonYear={gameState.europeSeasonYear}
          saSeasonYear={gameState.saSeasonYear}
          watchlistPlayerIds={watchlistPlayerIds}
          onToggleWatchlistPlayer={handleToggleWatchlistPlayer}
          onOpenWatchlist={handleOpenMarketWatchlist}
          onClose={() => setIsGlobalSearchOpen(false)}
          onSelectClub={(clubId) => {
            setInspectedClubId(clubId);
            setInspectedPlayerId(undefined);
            setClubInspectNonce((n) => n + 1);
            setActiveTab('clubs');
          }}
          onSelectPlayerInClub={(clubId, playerId) => {
            setInspectedClubId(clubId);
            setInspectedPlayerId(playerId);
            setClubInspectNonce((n) => n + 1);
            setActiveTab('clubs');
          }}
          onSelectUserPlayer={(playerId) => {
            const found = userClub.squad.find((p) => p.id === playerId);
            if (found) {
              setInspectedGlobalPlayer({ player: found, club: userClub });
            } else {
              setActiveTab('players');
            }
          }}
          onSelectFreeAgent={(playerName) => {
            const isFa = gameState.transferMarket.some((p) => p.name === playerName);
            setMarketInitialTab(isFa ? 'free' : 'all');
            setMarketInitialSearch(playerName);
            setMarketSearchNonce((n) => n + 1);
            setActiveTab('market');
          }}
          onSelectCompetition={(compId) => {
            setStandingsInitialComp(compId);
            setStandingsCompNonce((n) => n + 1);
            setActiveTab('standings');
          }}
        />
      )}

      {/* Season End Yearbook & Individual Honors Gala Modal */}
      {seasonEndModal && (() => {
        const isEuEnd = isSplitCalendarClub(userClub);
        const seasonYearNum = isEuEnd
          ? gameState.europeSeasonYear ?? gameState.currentSeasonYear
          : gameState.saSeasonYear ?? gameState.currentSeasonYear;
        const seasonLabel = isEuEnd
          ? formatEuropeanSeason(seasonYearNum)
          : String(seasonYearNum);
        const nextSeasonLabel = isEuEnd
          ? formatEuropeanSeason(seasonYearNum + 1)
          : String(seasonYearNum + 1);

        const yearTrophies = (gameState.trophyHistory || []).filter(
          (t) => t.year === seasonYearNum
        );
        const championsSummary =
          yearTrophies.length > 0
            ? yearTrophies.slice(0, 8).map((t) => ({
                competition: t.competition,
                champion: t.championTeamName,
                isUser: t.userWon,
              }))
            : [
                {
                  competition: 'Liga Nacional',
                  champion: seasonEndModal.championName,
                  isUser: seasonEndModal.userWon,
                },
              ];

        const topScorerEntry = clubsWithWorldGuests
          .flatMap((c) =>
            c.squad.map((p) => ({
              playerName: p.name,
              clubShortName: c.shortName,
              goals: p.goals || 0,
              assists: p.assists || 0,
              isUserClub: c.id === userClub.id,
            }))
          )
          .sort((a, b) => b.goals - a.goals || b.assists - a.assists)[0];
        const goldenBoot =
          topScorerEntry && topScorerEntry.goals > 0 ? topScorerEntry : null;

        const userIncomingHistory = (gameState.transferHistory || []).filter(
          (tr) =>
            tr.direction === 'IN' &&
            tr.toClubId === userClub.id &&
            tr.seasonYear === seasonYearNum
        );
        const bestSigningCandidate = userIncomingHistory
          .map((tr) => {
            const sq = userClub.squad.find((p) => p.id === tr.playerId);
            const impactScore =
              (sq?.goals || 0) * 3 +
              (sq?.assists || 0) * 2 +
              (sq?.matches || 0) * 0.5 +
              (sq?.overall || tr.playerOverall) * 0.1;
            return {
              playerName: tr.playerName,
              role: tr.playerRole,
              fee: tr.fee,
              goals: sq?.goals || 0,
              assists: sq?.assists || 0,
              fromClubName: tr.fromClubName,
              impactScore,
            };
          })
          .sort((a, b) => b.impactScore - a.impactScore)[0];
        const bestSigning = bestSigningCandidate
          ? {
              playerName: bestSigningCandidate.playerName,
              role: bestSigningCandidate.role,
              fee: bestSigningCandidate.fee,
              goals: bestSigningCandidate.goals,
              assists: bestSigningCandidate.assists,
              fromClubName: bestSigningCandidate.fromClubName,
            }
          : null;

        const userPlayed = allCompetitionsFixtures.filter(
          (f) =>
            f.played &&
            (f.homeTeamId === userClub.id || f.awayTeamId === userClub.id)
        );
        const bestMatchFix = [...userPlayed].sort((a, b) => {
          const scoreFix = (f: Fixture) => {
            const hg = f.homeScore ?? 0;
            const ag = f.awayScore ?? 0;
            const userGoals = f.homeTeamId === userClub.id ? hg : ag;
            const oppGoals = f.homeTeamId === userClub.id ? ag : hg;
            const diff = userGoals - oppGoals;
            return (diff > 0 ? diff * 4 : diff) + hg + ag;
          };
          return scoreFix(b) - scoreFix(a);
        })[0];
        const memorableMatch = bestMatchFix
          ? {
              scoreline: `${
                clubsWithWorldGuests.find((c) => c.id === bestMatchFix.homeTeamId)
                  ?.shortName || bestMatchFix.homeTeamId
              } ${bestMatchFix.homeScore ?? 0} x ${bestMatchFix.awayScore ?? 0} ${
                clubsWithWorldGuests.find((c) => c.id === bestMatchFix.awayTeamId)
                  ?.shortName || bestMatchFix.awayTeamId
              }`,
              competitionLabel:
                COMPETITIONS_CATALOG[bestMatchFix.competition]?.shortName ||
                bestMatchFix.cupPhase ||
                'Partida Oficial',
              dateDisplay: bestMatchFix.date
                ? formatShortDate(bestMatchFix.date)
                : seasonLabel,
            }
          : null;

        const retrospectiveReport = buildSeasonRetrospective({
          gameState,
          userClub,
          clubsWithWorldGuests,
          allCompetitionsFixtures,
          seasonYear: seasonYearNum,
          seasonLabel,
        });

        return (
          <SeasonYearbookModal
            seasonLabel={seasonLabel}
            championName={seasonEndModal.championName}
            userWon={seasonEndModal.userWon}
            userClub={userClub}
            seasonAwards={seasonEndModal.seasonAwards}
            worldBallonDorAward={seasonEndModal.worldBallonDorAward}
            financialWarning={seasonEndModal.financialWarning}
            championsSummary={championsSummary}
            goldenBoot={goldenBoot}
            bestSigning={bestSigning}
            memorableMatch={memorableMatch}
            boardConfidence={gameState.managerCareer?.boardConfidence ?? 75}
            retrospective={retrospectiveReport}
            nextSeasonLabel={nextSeasonLabel}
            onClose={() => setSeasonEndModal(null)}
            onOpenBoard={() => {
              setSeasonEndModal(null);
              setActiveTab('board');
            }}
            onOpenHistory={() => {
              setSeasonEndModal(null);
              setActiveTab('history');
            }}
            onStartNextSeason={() => handleStartNextSeason()}
          />
        );
      })()}

      {/* Fiscal Audit Judgment, STJD Punishments & Manager Dismissal Modal */}
      {financialAuditModal && gameState.managerCareer && (
        <div className="fixed inset-0 z-50 bg-slate-950/92 backdrop-blur-md flex items-start justify-center p-2 sm:p-4 overflow-y-auto">
          <div className="bg-[#0c1424] border border-rose-500/50 rounded-3xl w-full max-w-2xl shadow-2xl p-6 sm:p-8 my-auto">
            <div className="text-center pb-5 border-b border-slate-800">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-rose-500/15 text-rose-400 border border-rose-500/40 flex items-center justify-center mb-3">
                <Scale className="w-7 h-7" />
              </div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-rose-400">
                Tribunal do Fair Play Financeiro & Conselho Fiscal · {financialAuditModal.seasonYear}
              </span>
              <h2 className="text-xl sm:text-2xl font-extrabold font-display text-white mt-1">
                Contas no Vermelho: Punições ao {financialAuditModal.clubShortName} & Demissão
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 mt-1.5 max-w-xl mx-auto leading-relaxed">
                O {financialAuditModal.clubName} encerrou a temporada{' '}
                {financialAuditModal.spentMoreThanEarned
                  ? 'gastando mais do que arrecadou e '
                  : ''}
                com caixa negativo de{' '}
                <strong className="text-rose-400 font-mono">
                  {formatCurrency(financialAuditModal.endingBalance)}
                </strong>
                . O STJD aplicou sanções oficiais ao clube e o Conselho decretou sua demissão imediata.
              </p>
            </div>

            {/* Season Financial Summary Strip */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-5">
              <div className="bg-[#070c16] border border-slate-800 rounded-xl p-3 text-xs">
                <span className="text-slate-400 block">Arrecadação no Ano</span>
                <strong className="text-emerald-400 font-mono tabular-nums text-sm mt-0.5 block">
                  {formatCurrency(financialAuditModal.totalIncomeSeason)}
                </strong>
              </div>
              <div className="bg-[#070c16] border border-slate-800 rounded-xl p-3 text-xs">
                <span className="text-slate-400 block">Gastos Totais no Ano</span>
                <strong className="text-rose-400 font-mono tabular-nums text-sm mt-0.5 block">
                  {formatCurrency(financialAuditModal.totalExpensesSeason)}
                </strong>
              </div>
              <div className="bg-rose-950/30 border border-rose-500/40 rounded-xl p-3 text-xs">
                <span className="text-rose-300 block">Saldo Final Auditado</span>
                <strong className="text-rose-400 font-mono tabular-nums text-sm mt-0.5 block">
                  {formatCurrency(financialAuditModal.endingBalance)}
                </strong>
              </div>
            </div>

            {/* Official STJD & Board Punishments Box */}
            {financialAuditModal.punishment && (
              <div className="mt-4 bg-rose-500/10 border border-rose-500/30 rounded-2xl p-4 text-xs space-y-1.5">
                <div className="flex items-center gap-2 font-bold text-rose-300 uppercase tracking-wider text-[11px] mb-1">
                  <Ban className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>Sanções Impostas pelo STJD & Conselho</span>
                </div>
                <p className="text-slate-200">
                  · <strong>Dedução na Tabela:</strong> O {financialAuditModal.clubShortName} iniciará a liga de {financialAuditModal.seasonYear + 1} com{' '}
                  <strong className="text-rose-300 font-mono">
                    -{financialAuditModal.punishment.pointsDeducted} pontos
                  </strong>
                  .
                </p>
                <p className="text-slate-200">
                  · <strong>Transfer Ban:</strong> Proibição de registrar contratações durante toda a 1ª janela até 01/07/{financialAuditModal.seasonYear + 1}.
                </p>
                <p className="text-slate-200">
                  · <strong>Multa & Penhora:</strong> Multa fiscal de{' '}
                  <span className="font-mono">
                    {formatCurrency(financialAuditModal.punishment.fineAmount)}
                  </span>
                  {financialAuditModal.punishment.forcedPlayerSaleName
                    ? ` e venda forçada de ${
                        financialAuditModal.punishment.forcedPlayerSaleName
                      } (${formatCurrency(
                        financialAuditModal.punishment.forcedSaleAmount || 0
                      )}) para abater dívidas`
                    : ''}
                  .
                </p>
                <p className="text-rose-200">
                  · <strong>Demissão do Comando Técnico:</strong> Rescisão por responsabilidade fiscal (-
                  {financialAuditModal.punishment.managerReputationLost || 8} pts de reputação).
                </p>
              </div>
            )}

            {/* Next Club Selection to Start Upcoming Season */}
            <div className="mt-5 pt-4 border-t border-slate-800">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
                Escolha um Novo Clube para Recomeçar em {financialAuditModal.seasonYear + 1}
              </div>
              <div className="divide-y divide-slate-800">
                {gameState.managerCareer.jobOffers
                  .filter((o) => o.status === 'PENDING')
                  .slice(0, 3)
                  .map((offer) => (
                    <div
                      key={offer.id}
                      className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs border border-white/15 shrink-0"
                          style={{
                            backgroundColor: offer.clubColors.primary,
                            color: offer.clubColors.text,
                          }}
                        >
                          {offer.clubShortName.slice(0, 3).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="font-bold text-white text-sm truncate">
                            {offer.clubName}
                          </div>
                          <div className="text-xs text-slate-400 tabular-nums">
                            {offer.clubDivision === 'EST' ? 'Potiguar (RN)' : `Série ${offer.clubDivision}`} · OVR {offer.clubSquadAvgOvr} · Caixa{' '}
                            {formatCurrency(offer.transferBudgetPreview)} · Salário{' '}
                            {formatCurrency(offer.offeredMonthlySalary)}/mês
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleStartNextSeason(offer.id)}
                        className="px-4 py-2.5 rounded-xl bg-sky-400 hover:bg-sky-300 text-slate-950 font-black text-xs whitespace-nowrap shrink-0 cursor-pointer transition-colors"
                      >
                        Assumir {offer.clubShortName} em {financialAuditModal.seasonYear + 1}
                      </button>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Board Dismissal & Immediate Next-Club Selection Modal */}
      {sackedModal && gameState.managerCareer && (
        <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-start justify-center p-2 sm:p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-rose-500/40 rounded-3xl w-full max-w-2xl shadow-2xl p-6 sm:p-8 my-auto">
            <div className="text-center pb-5 border-b border-slate-800">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-rose-500/15 text-rose-400 border border-rose-500/40 flex items-center justify-center mb-3">
                <Briefcase className="w-7 h-7" />
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white">
                Demitido pela Diretoria · {gameState.managerCareer.lastDismissal?.entityName || userClub.name}
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 mt-1.5 max-w-lg mx-auto">
                {gameState.managerCareer.lastDismissal?.reason ||
                  'A sequência negativa derrubou a confiança da diretoria para nível crítico.'}
              </p>
              {gameState.managerCareer.lastDismissal && (
                <div className="mt-3 flex flex-wrap items-center justify-center gap-4 text-xs font-mono tabular-nums text-slate-400">
                  <span>
                    Retrospecto:{' '}
                    <strong className="text-white">
                      {gameState.managerCareer.lastDismissal.wins}V ·{' '}
                      {gameState.managerCareer.lastDismissal.draws}E ·{' '}
                      {gameState.managerCareer.lastDismissal.losses}D
                    </strong>
                  </span>
                  <span>
                    Confiança final:{' '}
                    <strong className="text-rose-400">
                      {gameState.managerCareer.lastDismissal.confidenceAtDismissal}%
                    </strong>
                  </span>
                  <span>
                    Multa rescisória:{' '}
                    <strong className="text-emerald-400">
                      {formatCurrency(gameState.managerCareer.lastDismissal.severanceReceived)}
                    </strong>
                  </span>
                </div>
              )}
            </div>

            <div className="mt-4 flex items-center justify-between gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-sky-400">
                Propostas Imediatas para Recomeçar
              </span>
              <button
                type="button"
                onClick={() => {
                  soundEngine.playClick();
                  handleScoutEmergencyClubOffers();
                }}
                className="px-3 py-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-700 text-xs font-semibold text-sky-300 inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Search className="w-3.5 h-3.5 shrink-0" />
                <span>Buscar Novas Propostas</span>
              </button>
            </div>

            <div className="divide-y divide-slate-800 mt-2">
              {gameState.managerCareer.jobOffers
                .filter((o) => o.status === 'PENDING')
                .slice(0, 4)
                .map((offer) => (
                  <div
                    key={offer.id}
                    className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs border border-white/15 shrink-0"
                        style={{
                          backgroundColor: offer.clubColors.primary,
                          color: offer.clubColors.text,
                        }}
                      >
                        {offer.clubShortName.slice(0, 3).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-white text-sm truncate">
                          {offer.clubName}
                        </div>
                        <div className="text-xs text-slate-400 tabular-nums">
                          {offer.clubDivision === 'EST' ? 'Estadual' : `Série ${offer.clubDivision}`} · OVR {offer.clubSquadAvgOvr} · Caixa{' '}
                          {formatCurrency(offer.transferBudgetPreview)} · Salário{' '}
                          {formatCurrency(offer.offeredMonthlySalary)}/mês
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        soundEngine.playFanfare();
                        handleAcceptJobOffer(offer.id, 'Demitido pela Diretoria');
                      }}
                      className="px-4 py-2.5 rounded-xl bg-sky-400 hover:bg-sky-300 text-slate-950 font-bold text-xs whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      Assumir {offer.clubShortName}
                    </button>
                  </div>
                ))}
            </div>

            {(gameState.nationalTeam?.pendingNationalOffers?.filter((o) => o.status === 'PENDING')
              .length || 0) > 0 && (
              <div className="mt-4 pt-4 border-t border-slate-800">
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-300 flex items-center gap-1.5 mb-2">
                  <Flag className="w-3.5 h-3.5 shrink-0" />
                  <span>Convites de Seleções em Aberto</span>
                </span>
                <div className="divide-y divide-slate-800/70">
                  {gameState.nationalTeam!.pendingNationalOffers!
                    .filter((o) => o.status === 'PENDING')
                    .slice(0, 2)
                    .map((ntOffer) => (
                      <div
                        key={ntOffer.id}
                        className="py-2.5 flex items-center justify-between gap-3 text-xs"
                      >
                        <div>
                          <strong className="text-white">
                            {ntOffer.teamName} ({ntOffer.federationCode})
                          </strong>{' '}
                          <span className="text-slate-400">
                            · {ntOffer.confederation} · Força {ntOffer.strength}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            soundEngine.playFanfare();
                            handleAcceptNationalOffer(ntOffer.id);
                          }}
                          className="px-3 py-1.5 rounded-lg bg-indigo-400 hover:bg-indigo-300 text-slate-950 font-bold whitespace-nowrap shrink-0 cursor-pointer"
                        >
                          Assumir {ntOffer.teamCode}
                        </button>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Federation Dismissal Modal (National Team Sacking) */}
      {!sackedModal &&
        gameState.nationalTeam?.lastDismissal &&
        !gameState.nationalTeam.lastDismissal.acknowledged && (
          <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-start justify-center p-2 sm:p-4 overflow-y-auto">
            <div className="bg-slate-900 border border-rose-500/40 rounded-3xl w-full max-w-2xl shadow-2xl p-6 sm:p-8 my-auto">
              <div className="text-center pb-5 border-b border-slate-800">
                <div className="w-14 h-14 mx-auto rounded-2xl bg-rose-500/15 text-rose-400 border border-rose-500/40 flex items-center justify-center mb-3">
                  <Flag className="w-7 h-7" />
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-white">
                  Demitido pela Federação · {gameState.nationalTeam.lastDismissal.entityName}
                </h2>
                <p className="text-xs sm:text-sm text-slate-300 mt-1.5 max-w-lg mx-auto">
                  {gameState.nationalTeam.lastDismissal.reason}
                </p>
                <div className="mt-3 flex flex-wrap items-center justify-center gap-4 text-xs font-mono tabular-nums text-slate-400">
                  <span>
                    Retrospecto:{' '}
                    <strong className="text-white">
                      {gameState.nationalTeam.lastDismissal.wins}V ·{' '}
                      {gameState.nationalTeam.lastDismissal.draws}E ·{' '}
                      {gameState.nationalTeam.lastDismissal.losses}D
                    </strong>
                  </span>
                  <span>
                    Confiança final:{' '}
                    <strong className="text-rose-400">
                      {gameState.nationalTeam.lastDismissal.confidenceAtDismissal}%
                    </strong>
                  </span>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-300">
                  Sondagens de Outras Seleções ({pendingNationalOffersCount})
                </span>
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playClick();
                    handleScoutNationalVacancies();
                  }}
                  className="px-3 py-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-700 text-xs font-semibold text-indigo-300 inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <Search className="w-3.5 h-3.5 shrink-0" />
                  <span>Sondar Novas Seleções</span>
                </button>
              </div>

              {(gameState.nationalTeam.pendingNationalOffers || []).filter(
                (o) => o.status === 'PENDING'
              ).length > 0 ? (
                <div className="divide-y divide-slate-800 mt-2">
                  {gameState.nationalTeam
                    .pendingNationalOffers!.filter((o) => o.status === 'PENDING')
                    .slice(0, 3)
                    .map((offer) => (
                      <div
                        key={offer.id}
                        className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs border border-white/15 shrink-0"
                            style={{
                              backgroundColor: offer.primaryColor,
                              color: offer.textColor,
                            }}
                          >
                            {offer.teamCode}
                          </div>
                          <div className="min-w-0">
                            <div className="font-bold text-white text-sm truncate">
                              {offer.teamName} ({offer.federationCode})
                            </div>
                            <div className="text-xs text-slate-400 tabular-nums">
                              {offer.confederation} · Força {offer.strength} · {offer.reason}
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            soundEngine.playFanfare();
                            handleAcceptNationalOffer(offer.id);
                          }}
                          className="px-4 py-2.5 rounded-xl bg-indigo-400 hover:bg-indigo-300 text-slate-950 font-bold text-xs whitespace-nowrap shrink-0 cursor-pointer"
                        >
                          Assumir {offer.teamCode}
                        </button>
                      </div>
                    ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400 py-4 text-center">
                  Nenhuma proposta imediata na mesa. Clique em Sondar Novas Seleções ou foque no seu clube.
                </p>
              )}

              <div className="mt-5 pt-4 border-t border-slate-800 flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playClick();
                    handleAcknowledgeNationalDismissal();
                  }}
                  className="px-4 py-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-700 text-xs font-bold text-slate-200 whitespace-nowrap shrink-0 cursor-pointer"
                >
                  Continuar Focado no {userClub.shortName}
                </button>
              </div>
            </div>
          </div>
        )}

      {/* Global Click-to-Inspect Player Details Modal */}
      {inspectedGlobalPlayer && (
        <PlayerDetailsModal
          player={inspectedGlobalPlayer.player}
          club={inspectedGlobalPlayer.club}
          userClub={userClub}
          allClubs={clubsWithWorldGuests}
          upcomingCompetition={upcomingUserFixture?.competition}
          isCalledUpToSelecao={(
            gameState.nationalTeam?.calledUpPlayerIds || []
          ).includes(inspectedGlobalPlayer.player.id)}
          isWatchlisted={watchlistPlayerIds.includes(inspectedGlobalPlayer.player.id)}
          onToggleWatchlist={handleToggleWatchlistPlayer}
          onComparePlayer={(player, club) =>
            setComparingGlobalPlayer({ player, club: club ?? null })
          }
          onToggleBench={(player) => {
            if (player.isStarter) return;
            const currentBenchCount = userClub.squad.filter(
              (p) => !p.isStarter && p.isSubstitute
            ).length;
            if (!player.isSubstitute && currentBenchCount >= 11) {
              soundEngine.playWhistle(false);
              return;
            }
            handleUpdateSquad(
              userClub.squad.map((p) =>
                p.id === player.id ? { ...p, isSubstitute: !p.isSubstitute } : p
              )
            );
          }}
          onNavigateUserArea={(area) => {
            if (area === 'training') {
              setActiveTab('training');
            } else {
              setSquadSubView(area);
              setActiveTab('squad');
            }
          }}
          onOpenMarketForPlayer={(player) => {
            const isFa = gameState.transferMarket.some((p) => p.id === player.id);
            setMarketInitialTab(isFa ? 'free' : 'all');
            setMarketInitialSearch(player.name);
            setMarketSearchNonce((n) => n + 1);
            setActiveTab('market');
          }}
          onInspectClub={(clubId) => {
            setInspectedClubId(clubId);
            setInspectedPlayerId(undefined);
            setClubInspectNonce((n) => n + 1);
            setActiveTab('clubs');
          }}
          onClose={() => setInspectedGlobalPlayer(null)}
        />
      )}

      {/* Global Player Comparison Modal */}
      {comparingGlobalPlayer && (
        <PlayerComparisonModal
          userClub={userClub}
          targetPlayer={comparingGlobalPlayer.player}
          targetClub={comparingGlobalPlayer.club}
          isWatchlisted={watchlistPlayerIds.includes(comparingGlobalPlayer.player.id)}
          onToggleWatchlist={handleToggleWatchlistPlayer}
          onNegotiateTarget={(player) => {
            setComparingGlobalPlayer(null);
            const isFa = gameState.transferMarket.some((p) => p.id === player.id);
            setMarketInitialTab(isFa ? 'free' : 'all');
            setMarketInitialSearch(player.name);
            setMarketSearchNonce((n) => n + 1);
            setActiveTab('market');
          }}
          onClose={() => setComparingGlobalPlayer(null)}
        />
      )}

      {/* Trophy & Ballon d'Or Celebration Modal */}
      {celebrationQueue.length > 0 && !seasonEndModal && (
        <CelebrationModal
          celebration={celebrationQueue[0]}
          onOpenTrophyCabinet={() => setActiveTab('trophies')}
          onClose={() => setCelebrationQueue((prev) => prev.slice(1))}
        />
      )}
      </Suspense>
      <MobileBottomNav
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenMoreMenu={() => setIsMobileMenuOpen(true)}
        badgeCount={unreadMessagesCount + pendingTransferOffersCount + selecaoActionCount}
      />
      <OfflineIndicator />
    </div>
    </PlayerInspectionProvider>
    </LanguageProvider>
  );
}
