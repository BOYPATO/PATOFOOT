import {
  Club,
  Player,
  InboxMessage,
  MAX_SQUAD_SIZE,
  TransferHistoryRecord,
} from '../types/game';
import { computeDefaultReleaseClause } from './contractLifecycleEngine';
import { recordFinanceLedgerMutation } from './financialFairPlayEngine';
import { isSplitCalendarClub } from './worldLeaguesEngine';
import { evaluatePlayerClubWillingness } from './transferWillingnessEngine';

export const MAX_SEASON_LOANS_IN = 3;
export const MAX_SEASON_LOANS_OUT = 6;

export interface ClubSeasonLoanCounts {
  seasonYear: number;
  loansInCount: number;
  loansOutCount: number;
  maxLoansIn: number;
  maxLoansOut: number;
  remainingLoansIn: number;
  remainingLoansOut: number;
}

export function resolveClubActiveSeasonYear(
  club: Club | undefined,
  params: {
    currentSeasonYear: number;
    saSeasonYear?: number;
    europeSeasonYear?: number;
  }
): number {
  if (club && isSplitCalendarClub(club)) {
    return params.europeSeasonYear ?? params.currentSeasonYear;
  }
  return params.saSeasonYear ?? params.currentSeasonYear;
}

export function getClubSeasonLoanCounts(params: {
  club?: Club;
  clubId?: string;
  transferHistory?: TransferHistoryRecord[];
  currentSeasonYear: number;
  saSeasonYear?: number;
  europeSeasonYear?: number;
}): ClubSeasonLoanCounts {
  const targetClubId = params.club?.id || params.clubId || '';
  const activeSeasonYear = resolveClubActiveSeasonYear(params.club, params);
  const history = params.transferHistory || [];

  const loansInCount = history.filter(
    (r) =>
      r.category === 'LOAN_IN' &&
      r.toClubId === targetClubId &&
      r.seasonYear === activeSeasonYear
  ).length;

  const loansOutCount = history.filter(
    (r) =>
      r.category === 'LOAN_OUT' &&
      r.fromClubId === targetClubId &&
      r.seasonYear === activeSeasonYear
  ).length;

  return {
    seasonYear: activeSeasonYear,
    loansInCount,
    loansOutCount,
    maxLoansIn: MAX_SEASON_LOANS_IN,
    maxLoansOut: MAX_SEASON_LOANS_OUT,
    remainingLoansIn: Math.max(0, MAX_SEASON_LOANS_IN - loansInCount),
    remainingLoansOut: Math.max(0, MAX_SEASON_LOANS_OUT - loansOutCount),
  };
}

export interface LoanDurationOption {
  months: 6 | 12;
  rounds: 19 | 38;
  shortLabel: string;
  fullLabel: string;
}

export const LOAN_DURATION_OPTIONS: readonly LoanDurationOption[] = [
  {
    months: 6,
    rounds: 19,
    shortLabel: '6 Meses',
    fullLabel: '6 Meses (Meia Temporada · 19 rodadas)',
  },
  {
    months: 12,
    rounds: 38,
    shortLabel: '1 Ano',
    fullLabel: '1 Ano (Temporada Completa · 38 rodadas)',
  },
] as const;

export function resolveLoanDurationMonths(durationRounds?: number, durationMonths?: 6 | 12): 6 | 12 {
  if (durationMonths === 6 || durationMonths === 12) return durationMonths;
  return (durationRounds ?? 19) <= 20 ? 6 : 12;
}

export function formatLoanDurationLabel(
  roundsRemaining?: number,
  durationMonths?: 6 | 12
): string {
  const months = resolveLoanDurationMonths(roundsRemaining, durationMonths);
  const termText = months === 6 ? '6 meses' : '1 ano';
  if (roundsRemaining !== undefined) {
    return `${termText} (${roundsRemaining}r)`;
  }
  return termText;
}

export function resolvePlayerFullMonthlyWage(player: Player): number {
  if (player.loanOriginalWage && player.loanOriginalWage > 0) {
    return player.loanOriginalWage;
  }
  if (
    player.isLoan &&
    player.loanWageContributionPct !== undefined &&
    player.loanWageContributionPct > 0 &&
    player.loanWageContributionPct < 100
  ) {
    const raw = player.wage / (player.loanWageContributionPct / 100);
    const step = raw < 15_000 ? 500 : 1_000;
    return Math.max(2_000, Math.round(raw / step) * step);
  }
  return Math.max(2_000, player.wage || 12_000);
}

export interface LoanProposalResult {
  accepted: boolean;
  message: string;
  rejectionReason?:
    | 'WAGE_TOO_LOW'
    | 'UNTOUCHABLE_STARTER'
    | 'BUY_OPTION_TOO_LOW'
    | 'LOAN_FEE_LOW'
    | 'INSUFFICIENT_FUNDS'
    | 'SQUAD_FULL'
    | 'LOAN_QUOTA_REACHED'
    | 'PLAYER_REFUSED';
  suggestedWageShare?: number;
  suggestedFee?: number;
  suggestedLoanFee?: number;
}

export interface LoanTermPreview {
  willAccept: boolean;
  chancePct: number;
  label: string;
  tone: 'emerald' | 'amber' | 'rose';
  hint: string;
  minWageShare: number;
  minLoanFee: number;
  minBuyOption?: number;
}

export interface RecommendedLoanTerms {
  durationRounds: 19 | 38;
  wageSharePct: number;
  loanFee: number;
  buyOptionFee: number;
}

/**
 * Computes the minimum fixed buyout option fee a lending club accepts for a player.
 */
export function computeMinimumAcceptableLoanBuyOption(
  player: Player,
  upfrontLoanFee: number = 0
): number {
  const baseValue = Math.max(40_000, player.marketValue || 150_000);
  let factor = player.isListedForLoan ? 0.9 : 0.96;

  // High-potential U-21 gems command a slight premium to lock a buyout clause
  if (player.age <= 21 && player.overall >= 75 && !player.isListedForLoan) {
    factor = 1.12;
  } else if (player.isStarter && player.overall >= 79) {
    factor = 1.08;
  } else if (player.age >= 31) {
    factor = 0.88;
  }

  // Upfront loan compensation fee gives flexibility on the fixed buyout price
  if (upfrontLoanFee >= baseValue * 0.08) {
    factor = Math.max(0.82, factor - 0.06);
  }

  const step = baseValue < 250_000 ? 10_000 : 50_000;
  const minFloor = baseValue < 250_000 ? 40_000 : 150_000;
  return Math.max(minFloor, Math.round((baseValue * factor) / step) * step);
}

/**
 * Computes the lending club's minimum wage share & upfront loan fee requirements.
 */
export function computeLoanRequirements(
  player: Player,
  durationRounds: number,
  loanFee: number = 0,
  buyOptionFee?: number
): {
  isUntouchableStarter: boolean;
  minWageShare: number;
  minLoanFee: number;
  minBuyOption?: number;
} {
  const isUntouchableStarter = Boolean(
    player.isStarter && player.overall >= 83 && !player.isListedForLoan
  );

  const feeStep = player.marketValue < 300_000 ? 10_000 : 50_000;
  const minLoanFee = isUntouchableStarter
    ? Math.max(50_000, Math.round((player.marketValue * 0.16) / feeStep) * feeStep)
    : 0;

  let minWageShare = 50;
  if (isUntouchableStarter) {
    minWageShare = 100;
  } else if (player.isListedForLoan) {
    minWageShare = player.age <= 22 ? 25 : 40;
  } else if (player.age <= 21 && !player.isStarter) {
    minWageShare = 25;
  } else if (!player.isStarter && player.overall <= 79) {
    minWageShare = 45;
  } else if (player.overall >= 80) {
    minWageShare = 65;
  }

  // 1-year loans of high-OVR players require slightly firmer wage coverage unless compensated
  if (!isUntouchableStarter && durationRounds >= 30 && player.overall >= 79 && minWageShare < 65) {
    minWageShare = 65;
  }

  if (!isUntouchableStarter && loanFee >= Math.max(40_000, player.marketValue * 0.08)) {
    minWageShare = Math.max(0, minWageShare - 25);
  }

  const minBuyOption =
    buyOptionFee !== undefined && buyOptionFee > 0
      ? computeMinimumAcceptableLoanBuyOption(player, loanFee)
      : undefined;

  return {
    isUntouchableStarter,
    minWageShare,
    minLoanFee,
    minBuyOption,
  };
}

/**
 * Returns optimal ready-to-accept loan terms for quick 1-click negotiation.
 */
export function computeRecommendedLoanTerms(
  player: Player,
  durationRounds: 19 | 38 = 19
): RecommendedLoanTerms {
  const req = computeLoanRequirements(player, durationRounds, 0, player.marketValue);
  const buyOptionFee =
    player.listedLoanBuyOptionFee && player.listedLoanBuyOptionFee > 0
      ? Math.max(
          computeMinimumAcceptableLoanBuyOption(player, req.minLoanFee),
          player.listedLoanBuyOptionFee
        )
      : computeMinimumAcceptableLoanBuyOption(player, req.minLoanFee);

  return {
    durationRounds,
    wageSharePct: req.minWageShare,
    loanFee: req.minLoanFee,
    buyOptionFee,
  };
}

/**
 * Live preview helper for UI negotiation thermometer before submitting a loan bid.
 */
export function previewLoanProposal(
  borrowerClub: Club,
  lendingClub: Club,
  player: Player,
  durationRounds: number,
  wageSharePct: number,
  buyOptionFee?: number,
  loanFee: number = 0,
  seasonLoanContext?: {
    transferHistory?: TransferHistoryRecord[];
    currentSeasonYear: number;
    saSeasonYear?: number;
    europeSeasonYear?: number;
  }
): LoanTermPreview {
  const req = computeLoanRequirements(player, durationRounds, loanFee, buyOptionFee);

  if (seasonLoanContext) {
    const counts = getClubSeasonLoanCounts({
      club: borrowerClub,
      ...seasonLoanContext,
    });
    if (counts.loansInCount >= MAX_SEASON_LOANS_IN) {
      return {
        willAccept: false,
        chancePct: 0,
        label: 'Cota de Empréstimos Esgotada',
        tone: 'rose',
        hint: `Limite de ${MAX_SEASON_LOANS_IN} reforços por empréstimo nesta temporada atingido (${counts.loansInCount}/${MAX_SEASON_LOANS_IN}).`,
        minWageShare: req.minWageShare,
        minLoanFee: req.minLoanFee,
        minBuyOption: req.minBuyOption,
      };
    }
  }

  const willingness = evaluatePlayerClubWillingness(borrowerClub, player, {
    dealType: 'LOAN',
    sellerClub: lendingClub,
  });
  if (!willingness.willing) {
    return {
      willAccept: false,
      chancePct: 0,
      label: 'Recusa do Atleta (Nível)',
      tone: 'rose',
      hint:
        willingness.reason ||
        `${player.name} (OVR ${player.overall}) não aceita descer para a divisão/nível do ${borrowerClub.shortName}.`,
      minWageShare: req.minWageShare,
      minLoanFee: req.minLoanFee,
      minBuyOption: req.minBuyOption,
    };
  }

  if (borrowerClub.squad.length >= MAX_SQUAD_SIZE) {
    return {
      willAccept: false,
      chancePct: 0,
      label: 'Elenco Lotado',
      tone: 'rose',
      hint: `Limite de ${MAX_SQUAD_SIZE} jogadores atingido (${borrowerClub.squad.length}/${MAX_SQUAD_SIZE}).`,
      minWageShare: req.minWageShare,
      minLoanFee: req.minLoanFee,
      minBuyOption: req.minBuyOption,
    };
  }

  if (borrowerClub.finances.balance < loanFee) {
    return {
      willAccept: false,
      chancePct: 0,
      label: 'Saldo Insuficiente',
      tone: 'rose',
      hint: `Caixa atual (${formatMoney(borrowerClub.finances.balance)}) não cobre taxa de ${formatMoney(loanFee)}.`,
      minWageShare: req.minWageShare,
      minLoanFee: req.minLoanFee,
      minBuyOption: req.minBuyOption,
    };
  }

  const feeOk = loanFee >= req.minLoanFee;
  const wageOk = wageSharePct >= req.minWageShare;
  const buyoutOk = !req.minBuyOption || (buyOptionFee ?? 0) >= req.minBuyOption;

  if (feeOk && wageOk && buyoutOk) {
    return {
      willAccept: true,
      chancePct: 100,
      label: 'Aceite Garantido',
      tone: 'emerald',
      hint: `O ${lendingClub.shortName} aprova estas condições e libera ${player.name}.`,
      minWageShare: req.minWageShare,
      minLoanFee: req.minLoanFee,
      minBuyOption: req.minBuyOption,
    };
  }

  const issues: string[] = [];
  let penalty = 0;

  if (!feeOk) {
    issues.push(`taxa mínima ${formatMoney(req.minLoanFee)}`);
    penalty += 35;
  }
  if (!wageOk) {
    issues.push(`salário mínimo ${req.minWageShare}%`);
    penalty += Math.min(45, Math.max(15, req.minWageShare - wageSharePct));
  }
  if (!buyoutOk && req.minBuyOption) {
    issues.push(`passe fixo mínimo ${formatMoney(req.minBuyOption)}`);
    penalty += 20;
  }

  const chancePct = Math.max(12, 92 - penalty);

  return {
    willAccept: false,
    chancePct,
    label: chancePct >= 55 ? 'Quase Fechado' : 'Abaixo da Pedida',
    tone: chancePct >= 55 ? 'amber' : 'rose',
    hint: `${lendingClub.shortName} pede: ${issues.join(' · ')}.`,
    minWageShare: req.minWageShare,
    minLoanFee: req.minLoanFee,
    minBuyOption: req.minBuyOption,
  };
}

/**
 * Evaluates whether a lending club and player will agree to a loan proposal (6 months or 1 year)
 */
export function evaluateLoanProposal(
  borrowerClub: Club,
  lendingClub: Club,
  player: Player,
  durationRounds: number,
  wageSharePct: number, // 0 to 100%
  buyOptionFee?: number,
  loanFee: number = 0,
  seasonLoanContext?: {
    transferHistory?: TransferHistoryRecord[];
    currentSeasonYear: number;
    saSeasonYear?: number;
    europeSeasonYear?: number;
  }
): LoanProposalResult {
  if (seasonLoanContext) {
    const counts = getClubSeasonLoanCounts({
      club: borrowerClub,
      ...seasonLoanContext,
    });
    if (counts.loansInCount >= MAX_SEASON_LOANS_IN) {
      return {
        accepted: false,
        message: `Limite de ${MAX_SEASON_LOANS_IN} jogadores contratados por empréstimo na temporada atingido (${counts.loansInCount}/${MAX_SEASON_LOANS_IN}).`,
        rejectionReason: 'LOAN_QUOTA_REACHED',
      };
    }
  }

  const willingness = evaluatePlayerClubWillingness(borrowerClub, player, {
    dealType: 'LOAN',
    sellerClub: lendingClub,
  });
  if (!willingness.willing) {
    return {
      accepted: false,
      message:
        willingness.reason ||
        `${player.name} (OVR ${player.overall}) recusou o empréstimo por considerar o ${borrowerClub.shortName} abaixo do seu patamar atual.`,
      rejectionReason: 'PLAYER_REFUSED',
    };
  }

  if (borrowerClub.squad.length >= MAX_SQUAD_SIZE) {
    return {
      accepted: false,
      message: `Seu elenco atingiu o limite máximo de ${MAX_SQUAD_SIZE} jogadores (${borrowerClub.squad.length}/${MAX_SQUAD_SIZE}). Venda ou empreste um atleta antes de fechar novos empréstimos.`,
      rejectionReason: 'SQUAD_FULL',
    };
  }

  if (borrowerClub.finances.balance < loanFee) {
    return {
      accepted: false,
      message: `Seu clube não possui fundos suficientes para pagar a taxa de empréstimo de ${formatMoney(loanFee)}. Saldo: ${formatMoney(borrowerClub.finances.balance)}.`,
      rejectionReason: 'INSUFFICIENT_FUNDS',
    };
  }

  const req = computeLoanRequirements(player, durationRounds, loanFee, buyOptionFee);

  // Case 1: Indispensable key starter
  if (req.isUntouchableStarter && (loanFee < req.minLoanFee || wageSharePct < 100)) {
    return {
      accepted: false,
      message: `O ${lendingClub.name} recusou a cessão de ${player.name}. Por ser titular absoluto (OVR ${player.overall}), só aceitam liberá-lo com 100% dos salários pagos e taxa à vista de ${formatMoney(req.minLoanFee)}.`,
      rejectionReason: 'UNTOUCHABLE_STARTER',
      suggestedWageShare: 100,
      suggestedLoanFee: req.minLoanFee,
    };
  }

  // Case 2: Wage contribution check
  if (wageSharePct < req.minWageShare) {
    return {
      accepted: false,
      message: `O ${lendingClub.name} exige que seu clube assuma pelo menos ${req.minWageShare}% dos vencimentos mensais de ${player.name}.`,
      rejectionReason: 'WAGE_TOO_LOW',
      suggestedWageShare: req.minWageShare,
    };
  }

  // Case 3: Fixed Buy Option Clause Validation
  if (buyOptionFee !== undefined && buyOptionFee > 0 && req.minBuyOption && buyOptionFee < req.minBuyOption) {
    return {
      accepted: false,
      message: `O ${lendingClub.name} recusou fixar a opção de compra em ${formatMoney(buyOptionFee)}. A diretoria aceita cravar o passe fixo por a partir de ${formatMoney(req.minBuyOption)}.`,
      rejectionReason: 'BUY_OPTION_TOO_LOW',
      suggestedFee: req.minBuyOption,
    };
  }

  const termLabel = durationRounds <= 20 ? '6 meses (19 rodadas)' : '1 ano (38 rodadas)';
  const clauseSuffix =
    buyOptionFee && buyOptionFee > 0
      ? ` e opção de compra fixada em ${formatMoney(buyOptionFee)}`
      : ' sem opção de compra fixada';

  return {
    accepted: true,
    message: `Acordo fechado! O ${lendingClub.name} aceitou emprestar ${player.name} por ${termLabel} (${wageSharePct}% salarial pago pelo ${borrowerClub.shortName}${clauseSuffix}).`,
  };
}

/**
 * Negotiates or updates a fixed buyout option clause on an already active loaned-in player.
 */
export function negotiateActiveLoanBuyOption(
  userClub: Club,
  lendingClub: Club,
  player: Player,
  proposedBuyOptionFee: number
): {
  accepted: boolean;
  message: string;
  suggestedFee?: number;
  updatedPlayer?: Player;
} {
  if (!player.isLoan) {
    return {
      accepted: false,
      message: `${player.name} já pertence em definitivo ao elenco do ${userClub.shortName}.`,
    };
  }

  const cleanProposal = Math.max(100000, Math.round(proposedBuyOptionFee / 50000) * 50000);
  const minAcceptable = computeMinimumAcceptableLoanBuyOption(
    player,
    player.loanFeePaid || 0
  );

  // If player already has a fixed clause, lending club only lowers it down to minAcceptable
  if (cleanProposal < minAcceptable) {
    return {
      accepted: false,
      message: `A diretoria do ${lendingClub.name} recusou fixar o passe de ${player.name} em ${formatMoney(cleanProposal)}. Contraproposta oficial: ${formatMoney(minAcceptable)}.`,
      suggestedFee: minAcceptable,
    };
  }

  const updatedPlayer: Player = {
    ...player,
    loanBuyOptionFee: cleanProposal,
  };

  return {
    accepted: true,
    message: `Aditivo contratual assinado com o ${lendingClub.name}! A opção de compra de ${player.name} foi fixada em ${formatMoney(cleanProposal)}.`,
    updatedPlayer,
  };
}

/**
 * Processes weekly/round progression for all active loans:
 * - Decrements loan duration
 * - Simulates development and matches for players loaned out by the user
 * - Allows CPU clubs to exercise active fixed buyout options (`loanBuyOptionFee`) at loan end
 * - Automatically returns expired loan players to their parent clubs
 */
export function processRoundLoans(
  allClubs: Club[],
  userClubId: string,
  currentRound: number,
  currentDate: string,
  currentSeasonYear?: number
): {
  updatedClubs: Club[];
  loanNotifications: InboxMessage[];
  buyoutTransferRecords: TransferHistoryRecord[];
} {
  const loanNotifications: InboxMessage[] = [];
  const buyoutTransferRecords: TransferHistoryRecord[] = [];
  const clubsMap = new Map<string, Club>(
    allClubs.map((c) => [c.id, { ...c, finances: { ...c.finances }, squad: [...c.squad] }])
  );

  const userClubInit = clubsMap.get(userClubId);
  const returningPlayersToParent: Array<{
    player: Player;
    targetClubId: string;
    sourceClubId: string;
  }> = [];

  let userBuyoutIncomeEarned = 0;

  // 1. Iterate all clubs and players to decrement loan rounds and collect expired loans
  clubsMap.forEach((club, clubId) => {
    const updatedSquad: Player[] = [];
    let clubBuyoutExpense = 0;

    club.squad.forEach((player) => {
      if (player.isLoan && player.loanRoundsRemaining !== undefined) {
        const newRoundsRemaining = player.loanRoundsRemaining - 1;

        // Simulate game time and evolution for players loaned out by the user to other CPU clubs
        if (player.loanParentClubId === userClubId && clubId !== userClubId) {
          const playedThisWeek = Math.random() < 0.85;
          const scoredGoal =
            player.position === 'FW'
              ? Math.random() < 0.35
              : player.position === 'MF'
              ? Math.random() < 0.15
              : false;
          const newMatches = player.matches + (playedThisWeek ? 1 : 0);
          const newGoals = player.goals + (scoredGoal ? 1 : 0);

          let newOverall = player.overall;
          let newEvolutions = player.evolutionsCount || 0;
          let newProgress = (player.trainingProgress || 0) + (player.age <= 22 ? 8 : 4);
          if (newProgress >= 100 && newOverall < (player.potential || 90)) {
            newOverall += 1;
            newEvolutions += 1;
            newProgress = 0;
            loanNotifications.push({
              id: `msg_loan_evolve_${player.id}_${currentRound}`,
              title: `⭐ Evolução no Empréstimo: ${player.name}`,
              message: `Emprestado ao ${club.name}, ${player.name} ganhou rodagem em campo e evoluiu sua força para OVR ${newOverall}!`,
              date: currentDate,
              round: currentRound,
              read: false,
              type: 'LOAN',
            });
          }

          player = {
            ...player,
            matches: newMatches,
            goals: newGoals,
            overall: newOverall,
            evolutionsCount: newEvolutions,
            trainingProgress: newProgress,
          };
        }

        if (newRoundsRemaining <= 0) {
          const parentId = player.loanParentClubId || userClubId;
          const fixedBuyout = player.loanBuyOptionFee;

          // Check if CPU borrowing club exercises active fixed buyout option on user's loaned-out player!
          const cpuExercisesBuyout =
            parentId === userClubId &&
            clubId !== userClubId &&
            fixedBuyout !== undefined &&
            fixedBuyout > 0 &&
            club.finances.balance - clubBuyoutExpense >= fixedBuyout * 0.75 &&
            (player.matches >= 5 || (player.evolutionsCount || 0) >= 1) &&
            Math.random() < 0.65;

          if (cpuExercisesBuyout && fixedBuyout) {
            const fullWage = resolvePlayerFullMonthlyWage(player);
            clubBuyoutExpense += fixedBuyout;
            userBuyoutIncomeEarned += fixedBuyout;

            const permanentlyBoughtByCpu: Player = {
              ...player,
              wage: fullWage,
              contractYears: 3,
              isLoan: false,
              loanParentClubId: undefined,
              loanCurrentClubId: undefined,
              loanRoundsRemaining: undefined,
              loanDurationMonths: undefined,
              loanWageContributionPct: undefined,
              loanOriginalWage: undefined,
              loanBuyOptionFee: undefined,
              loanFeePaid: undefined,
            };
            updatedSquad.push(permanentlyBoughtByCpu);

            loanNotifications.push({
              id: `msg_cpu_buyout_${player.id}_${currentRound}`,
              title: `💰 Opção de Compra Exercida pelo ${club.shortName}: ${player.name}!`,
              message: `Ao término do empréstimo, o ${club.name} acionou oficialmente a cláusula de opção de compra fixada em ${formatMoney(fixedBuyout)} e adquiriu ${player.name} (${player.detailedRole}, OVR ${player.overall}) em definitivo! O valor já entrou nos cofres do ${userClubInit?.name || 'seu clube'}.`,
              date: currentDate,
              round: currentRound,
              read: false,
              type: 'TRANSFER',
            });

            buyoutTransferRecords.push({
              id: `tr_cpu_buyout_${Date.now()}_${player.id}`,
              playerId: player.id,
              playerName: player.name,
              playerRole: player.detailedRole,
              playerOverall: player.overall,
              playerAge: player.age,
              fromClubId: userClubId,
              fromClubName: userClubInit?.name || 'Seu Clube',
              toClubId: club.id,
              toClubName: club.name,
              fee: fixedBuyout,
              wage: fullWage,
              date: currentDate,
              round: currentRound,
              seasonYear: currentSeasonYear || Number(currentDate.slice(0, 4)) || 2026,
              category: 'BUY_OPTION',
              direction: 'OUT',
              notes: `Opção de compra exercida pelo ${club.shortName}`,
            });
          } else {
            // Loan expired without buyout -> return to parent club with full wage restored
            const fullWage = resolvePlayerFullMonthlyWage(player);
            returningPlayersToParent.push({
              player: {
                ...player,
                wage: fullWage,
                isLoan: false,
                loanParentClubId: undefined,
                loanCurrentClubId: undefined,
                loanRoundsRemaining: undefined,
                loanDurationMonths: undefined,
                loanWageContributionPct: undefined,
                loanOriginalWage: undefined,
                loanBuyOptionFee: undefined,
                loanFeePaid: undefined,
                isStarter: false,
                isSubstitute: true,
              },
              targetClubId: parentId,
              sourceClubId: clubId,
            });

            if (clubId === userClubId) {
              const parentClub = allClubs.find((c) => c.id === parentId);
              loanNotifications.push({
                id: `msg_loan_exp_borrowed_${player.id}_${currentRound}`,
                title: `📅 Fim de Empréstimo: ${player.name}`,
                message: `O contrato de empréstimo de ${player.name} com o ${userClubInit?.name || 'seu clube'} chegou ao fim. O jogador retornou ao elenco do ${parentClub?.name || 'clube de origem'}.`,
                date: currentDate,
                round: currentRound,
                read: false,
                type: 'LOAN',
              });
            } else if (parentId === userClubId) {
              loanNotifications.push({
                id: `msg_loan_exp_returned_${player.id}_${currentRound}`,
                title: `🔙 Retorno de Empréstimo: ${player.name}`,
                message: `O atleta ${player.name} concluiu seu período de empréstimo com o ${club.name} e está oficialmente reintegrado ao elenco do ${userClubInit?.name}!`,
                date: currentDate,
                round: currentRound,
                read: false,
                type: 'LOAN',
              });
            }
          }
        } else {
          updatedSquad.push({
            ...player,
            loanRoundsRemaining: newRoundsRemaining,
          });
        }
      } else {
        updatedSquad.push(player);
      }
    });

    clubsMap.set(clubId, {
      ...club,
      finances:
        clubBuyoutExpense > 0
          ? {
              ...club.finances,
              balance: club.finances.balance - clubBuyoutExpense,
              totalExpensesSeason: club.finances.totalExpensesSeason + clubBuyoutExpense,
            }
          : club.finances,
      squad: updatedSquad,
    });
  });

  if (userBuyoutIncomeEarned > 0) {
    const latestUserClub = clubsMap.get(userClubId);
    if (latestUserClub) {
      clubsMap.set(userClubId, {
        ...latestUserClub,
        finances: recordFinanceLedgerMutation(latestUserClub.finances, {
          date: currentDate,
          category: 'TRANSFERS_IN',
          type: 'INCOME',
          amount: userBuyoutIncomeEarned,
          description: `Opção de compra exercida por clube parceiro`,
          applyToBalance: true,
        }),
      });
    }
  }

  // 2. Put returning players back into their parent clubs (capping CPU clubs at MAX_SQUAD_SIZE = 30)
  returningPlayersToParent.forEach(({ player, targetClubId }) => {
    const targetClub = clubsMap.get(targetClubId);
    if (targetClub) {
      let baseSquad = [...targetClub.squad];
      if (targetClubId !== userClubId && baseSquad.length >= MAX_SQUAD_SIZE) {
        const trimCandidate = [...baseSquad]
          .filter((p) => !p.isStarter && !p.isLoan)
          .sort((a, b) => a.overall - b.overall)[0];
        if (trimCandidate) {
          baseSquad = baseSquad.filter((p) => p.id !== trimCandidate.id);
        }
      }
      const usedNums = new Set(baseSquad.map((p) => p.squadNumber));
      let newSquadNumber = player.squadNumber || 12;
      while (usedNums.has(newSquadNumber) && newSquadNumber < 99) {
        newSquadNumber++;
      }
      const returnedPlayer: Player = {
        ...player,
        squadNumber: newSquadNumber,
        isStarter: false,
        isSubstitute: baseSquad.filter((p) => !p.isStarter && p.isSubstitute).length < 11,
      };
      clubsMap.set(targetClubId, {
        ...targetClub,
        squad: [...baseSquad, returnedPlayer].slice(0, MAX_SQUAD_SIZE),
      });
    }
  });

  return {
    updatedClubs: Array.from(clubsMap.values()),
    loanNotifications,
    buyoutTransferRecords,
  };
}

/**
 * Triggers the buyout clause to permanently acquire a player on loan, with user-chosen contract length (1..5 years)
 */
export function executeBuyOption(
  userClub: Club,
  lendingClub: Club,
  player: Player,
  contractYears: number = 3,
  agreedPermanentWage?: number
): {
  updatedUserClub: Club;
  updatedLendingClub: Club;
  permanentWage: number;
  contractYears: number;
  success: boolean;
  message: string;
} {
  const buyoutFee = player.loanBuyOptionFee || player.marketValue;
  const safeYears = Math.max(1, Math.min(5, Math.round(contractYears || 3)));
  const fullBaseWage = resolvePlayerFullMonthlyWage(player);
  const permanentWage =
    agreedPermanentWage && agreedPermanentWage > 0
      ? Math.round(agreedPermanentWage / 1000) * 1000
      : fullBaseWage;

  if (userClub.finances.balance < buyoutFee) {
    return {
      updatedUserClub: userClub,
      updatedLendingClub: lendingClub,
      permanentWage,
      contractYears: safeYears,
      success: false,
      message: `Saldo insuficiente! Seu clube possui ${formatMoney(userClub.finances.balance)}, mas o valor da opção de compra é de ${formatMoney(buyoutFee)}.`,
    };
  }

  // Validate player wage acceptance if custom wage was proposed
  const minPlayerWage = Math.round((fullBaseWage * 0.95) / 1000) * 1000;
  if (permanentWage < minPlayerWage) {
    return {
      updatedUserClub: userClub,
      updatedLendingClub: lendingClub,
      permanentWage,
      contractYears: safeYears,
      success: false,
      message: `O estafe de ${player.name} exige pelo menos ${formatMoney(minPlayerWage)}/mês de salário integral para assinar em definitivo.`,
    };
  }

  const updatedUserFinances = recordFinanceLedgerMutation(userClub.finances, {
    date: new Date().toISOString().slice(0, 10),
    category: 'TRANSFERS_OUT',
    type: 'EXPENSE',
    amount: buyoutFee,
    description: `Compra definitiva (opção): ${player.name} (${lendingClub.shortName})`,
    applyToBalance: true,
  });

  const updatedLendingFinances = {
    ...lendingClub.finances,
    balance: lendingClub.finances.balance + buyoutFee,
    totalIncomeSeason: lendingClub.finances.totalIncomeSeason + buyoutFee,
  };

  const permanentPlayer: Player = {
    ...player,
    wage: permanentWage,
    isLoan: false,
    loanParentClubId: undefined,
    loanCurrentClubId: undefined,
    loanRoundsRemaining: undefined,
    loanDurationMonths: undefined,
    loanWageContributionPct: undefined,
    loanOriginalWage: undefined,
    loanBuyOptionFee: undefined,
    loanFeePaid: undefined,
    contractYears: safeYears,
    releaseClause: computeDefaultReleaseClause({
      ...player,
      wage: permanentWage,
    }),
    morale: 'Excelente',
  };

  const updatedUserSquad = userClub.squad.map((p) =>
    p.id === player.id ? permanentPlayer : p
  );

  return {
    updatedUserClub: {
      ...userClub,
      finances: updatedUserFinances,
      squad: updatedUserSquad,
    },
    updatedLendingClub: {
      ...lendingClub,
      finances: updatedLendingFinances,
    },
    permanentWage,
    contractYears: safeYears,
    success: true,
    message: `Opção de compra exercida com sucesso! ${player.name} assinou contrato definitivo de ${safeYears} ${safeYears === 1 ? 'ano' : 'anos'} com o ${userClub.name} por ${formatMoney(buyoutFee)} (salário de ${formatMoney(permanentWage)}/mês)!`,
  };
}

/**
 * Returns a loaned-in player early to the parent club
 */
export function terminateLoan(
  userClub: Club,
  lendingClub: Club,
  player: Player
): {
  updatedUserClub: Club;
  updatedLendingClub: Club;
} {
  const fullWage = resolvePlayerFullMonthlyWage(player);
  const cleanPlayer: Player = {
    ...player,
    wage: fullWage,
    isLoan: false,
    loanParentClubId: undefined,
    loanCurrentClubId: undefined,
    loanRoundsRemaining: undefined,
    loanDurationMonths: undefined,
    loanWageContributionPct: undefined,
    loanOriginalWage: undefined,
    loanBuyOptionFee: undefined,
    loanFeePaid: undefined,
    isStarter: false,
    isSubstitute: true,
  };

  return {
    updatedUserClub: {
      ...userClub,
      squad: userClub.squad.filter((p) => p.id !== player.id),
    },
    updatedLendingClub: {
      ...lendingClub,
      squad: [...lendingClub.squad, cleanPlayer].slice(0, MAX_SQUAD_SIZE),
    },
  };
}

function formatMoney(val: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  }).format(val);
}
