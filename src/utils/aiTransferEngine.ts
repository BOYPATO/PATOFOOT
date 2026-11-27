import {
  Club,
  DetailedRole,
  Division,
  FreeAgentMarketBid,
  GameSave,
  InboxMessage,
  MAX_SQUAD_SIZE,
  PendingTransferDeal,
  Player,
  TransferHistoryRecord,
  TransferOffer,
} from '../types/game';
import { addDays, formatShortDate } from './calendarUtils';
import { formatCurrency } from './individualAwardsEngine';
import {
  findPendingTransferForPlayer,
  getTransferWindowStatus,
} from './transferWindowEngine';
import { getClubOverdraftLimit } from './financialFairPlayEngine';
import { ClubEconomyProfile, getClubEconomyProfile } from './clubEconomyScale';
import {
  evaluatePlayerClubWillingness,
  getClubEffectiveLevelOvr,
} from './transferWillingnessEngine';
import { computeDefaultReleaseClause } from './contractLifecycleEngine';
import {
  getClubSeasonLoanCounts,
  MAX_SEASON_LOANS_IN,
  MAX_SEASON_LOANS_OUT,
  resolveClubActiveSeasonYear,
  resolveLoanDurationMonths,
} from './loanEngine';

const IDEAL_ROLE_DEPTH: Record<DetailedRole, number> = {
  GOL: 3,
  ZAG: 6,
  LAT: 5,
  VOL: 5,
  MEI: 5,
  ATA: 6,
};

const ROLE_LABELS_PT: Record<DetailedRole, string> = {
  GOL: 'Goleiro',
  ZAG: 'Zagueiro',
  LAT: 'Lateral',
  VOL: 'Volante',
  MEI: 'Meia Armador',
  ATA: 'Atacante',
};

export interface ClubSquadDiagnosis {
  avgStarterOverall: number;
  weakestRole: DetailedRole;
  weakestRoleAvgOvr: number;
  shortageRoles: DetailedRole[];
  surplusRoles: DetailedRole[];
  safeTransferBudget: number;
  monthlyWageTotal: number;
  summaryNote: string;
  roleStats: Record<
    DetailedRole,
    {
      count: number;
      bestOvr: number;
      starterAvgOvr: number;
    }
  >;
}

export interface AiRecommendedSigning {
  player: Player;
  sellerClub?: Club; // undefined means Free Agent
  dealMode: 'FREE_AGENT' | 'BOSMAN' | 'LOAN' | 'PURCHASE';
  suggestedFee: number;
  suggestedWage: number;
  upgradeDeltaOvr: number;
  fitScore: number;
  aiRationale: string;
}

export interface AiRecommendedOutgoing {
  player: Player;
  recommendedAction: 'SELL' | 'LOAN_OUT';
  estimatedSaleValue: number;
  monthlyWageSaved: number;
  aiRationale: string;
}

export interface AiTransferDirectorReport {
  diagnosis: ClubSquadDiagnosis;
  recommendedSignings: AiRecommendedSigning[];
  recommendedOutgoings: AiRecommendedOutgoing[];
}

export function diagnoseClubSquadNeeds(club: Club): ClubSquadDiagnosis {
  const roles: DetailedRole[] = ['GOL', 'ZAG', 'LAT', 'VOL', 'MEI', 'ATA'];
  const starters = club.squad.filter((p) => p.isStarter);
  const avgStarterOverall =
    starters.length > 0
      ? Math.round(starters.reduce((acc, p) => acc + p.overall, 0) / starters.length)
      : Math.round(
          club.squad
            .slice()
            .sort((a, b) => b.overall - a.overall)
            .slice(0, 11)
            .reduce((acc, p) => acc + p.overall, 0) / Math.max(1, Math.min(11, club.squad.length))
        );

  const roleStats = {} as ClubSquadDiagnosis['roleStats'];
  const shortageRoles: DetailedRole[] = [];
  const surplusRoles: DetailedRole[] = [];

  let weakestRole: DetailedRole = 'ATA';
  let weakestRoleAvgOvr = 999;

  roles.forEach((role) => {
    const inRole = club.squad
      .filter((p) => p.detailedRole === role)
      .sort((a, b) => b.overall - a.overall);
    const count = inRole.length;
    const bestOvr = inRole[0]?.overall || avgStarterOverall - 6;
    const neededStarters = role === 'GOL' || role === 'MEI' ? 1 : 2;
    const topSlice = inRole.slice(0, Math.min(neededStarters, inRole.length));
    const starterAvg =
      topSlice.length > 0
        ? Math.round(topSlice.reduce((acc, p) => acc + p.overall, 0) / topSlice.length)
        : avgStarterOverall - 8;

    roleStats[role] = {
      count,
      bestOvr,
      starterAvgOvr: starterAvg,
    };

    if (count < IDEAL_ROLE_DEPTH[role]) {
      shortageRoles.push(role);
    }
    if (count > IDEAL_ROLE_DEPTH[role] + 1) {
      surplusRoles.push(role);
    }

    const effectiveStrength = starterAvg - (count < IDEAL_ROLE_DEPTH[role] ? 3 : 0);
    if (effectiveStrength < weakestRoleAvgOvr) {
      weakestRoleAvgOvr = effectiveStrength;
      weakestRole = role;
    }
  });

  const monthlyWageTotal = club.squad.reduce((acc, p) => acc + (p.wage || 0), 0);
  const safeTransferBudget = Math.max(0, Math.round(club.finances.balance * 0.62));

  const shortageText =
    shortageRoles.length > 0
      ? `Reposição numérica sugerida em ${shortageRoles.join(', ')}.`
      : 'Profundidade numérica equilibrada em todos os setores.';

  const summaryNote = `Setor prioritário: ${ROLE_LABELS_PT[weakestRole]} (${weakestRole}, média ${
    roleStats[weakestRole].starterAvgOvr
  } OVR vs ${avgStarterOverall} OVR do time titular). ${shortageText}`;

  return {
    avgStarterOverall,
    weakestRole,
    weakestRoleAvgOvr: roleStats[weakestRole].starterAvgOvr,
    shortageRoles,
    surplusRoles,
    safeTransferBudget,
    monthlyWageTotal,
    summaryNote,
    roleStats,
  };
}

/**
 * Gera o relatório estratégico em tempo real do Diretor de Futebol IA para o clube do usuário.
 */
export function buildAiTransferDirectorReport(state: GameSave): AiTransferDirectorReport {
  const userClub = state.clubs.find((c) => c.id === state.userClubId) || state.clubs[0];
  const diagnosis = diagnoseClubSquadNeeds(userClub);
  const balance = userClub.finances.balance;

  const priorityRoles = new Set<DetailedRole>([
    diagnosis.weakestRole,
    ...diagnosis.shortageRoles,
  ]);

  const candidates: AiRecommendedSigning[] = [];

  // 1. Scan Free Agents (Zero fee, immediate arrival)
  (state.transferMarket || []).forEach((player) => {
    if (!evaluatePlayerClubWillingness(userClub, player, { dealType: 'FREE_AGENT' }).willing) {
      return;
    }
    const currentSectorAvg = diagnosis.roleStats[player.detailedRole]?.starterAvgOvr || 68;
    const upgradeDelta = player.overall - currentSectorAvg;
    if (upgradeDelta < -1 && !priorityRoles.has(player.detailedRole)) return;

    const wageStep = player.wage < 15_000 ? 500 : 1000;
    const suggestedWage = Math.round((player.wage * 1.05) / wageStep) * wageStep;
    if (balance < suggestedWage * 2) return;

    const isPriority = priorityRoles.has(player.detailedRole);
    const fitScore =
      55 +
      upgradeDelta * 6 +
      (isPriority ? 18 : 0) +
      (player.age <= 26 ? 8 : 0);

    candidates.push({
      player,
      sellerClub: undefined,
      dealMode: 'FREE_AGENT',
      suggestedFee: 0,
      suggestedWage,
      upgradeDeltaOvr: upgradeDelta,
      fitScore,
      aiRationale:
        upgradeDelta > 0
          ? `Livre no mercado (custo zero de passe) e chega com +${upgradeDelta} OVR acima da média do setor (${player.detailedRole}).`
          : `Oportunidade sem custo de transferência para encorpar a rotação em ${player.detailedRole}.`,
    });
  });

  // 2. Scan Other Clubs (Permanent Purchases, Loans & Bosman)
  state.clubs.forEach((club) => {
    if (club.id === userClub.id) return;

    club.squad.forEach((player) => {
      if (player.isLoan || player.retiringAtSeasonEnd) return;

      const currentSectorAvg = diagnosis.roleStats[player.detailedRole]?.starterAvgOvr || 68;
      const upgradeDelta = player.overall - currentSectorAvg;
      const isPriority = priorityRoles.has(player.detailedRole);

      // Only consider players that improve the team or are high-upside young talents in needed roles
      if (upgradeDelta < 0 && !(isPriority && player.age <= 22 && upgradeDelta >= -1)) {
        return;
      }

      const feeStep = player.marketValue < 250_000 ? 10_000 : 50_000;
      const wageStep = player.wage < 15_000 ? 500 : 1000;
      const suggestedFee = Math.round((player.marketValue * 0.98) / feeStep) * feeStep;
      const suggestedWage = Math.round((player.wage * 1.1) / wageStep) * wageStep;

      // Loan opportunity check
      const isLoanCandidate =
        player.isListedForLoan || (player.age <= 23 && !player.isStarter && player.overall <= 81);

      if (
        isLoanCandidate &&
        upgradeDelta >= 0 &&
        evaluatePlayerClubWillingness(userClub, player, { dealType: 'LOAN', sellerClub: club })
          .willing
      ) {
        const fitScore =
          52 + upgradeDelta * 5.5 + (isPriority ? 16 : 0) + (player.age <= 22 ? 9 : 0);
        candidates.push({
          player,
          sellerClub: club,
          dealMode: 'LOAN',
          suggestedFee: 0,
          suggestedWage: Math.round(player.wage * 0.5),
          upgradeDeltaOvr: upgradeDelta,
          fitScore,
          aiRationale: `Disponível por empréstimo no ${club.shortName} pagando apenas 50% do salário (${ROLE_LABELS_PT[player.detailedRole]}).`,
        });
        return;
      }

      // Bosman Pre-Contract opportunity
      if (
        (player.contractYears || 2) <= 1 &&
        !player.preContractClubId &&
        upgradeDelta >= 1 &&
        evaluatePlayerClubWillingness(userClub, player, {
          dealType: 'PRE_CONTRACT',
          sellerClub: club,
        }).willing
      ) {
        const fitScore = 54 + upgradeDelta * 5 + (isPriority ? 14 : 0);
        candidates.push({
          player,
          sellerClub: club,
          dealMode: 'BOSMAN',
          suggestedFee: 0,
          suggestedWage: Math.round((player.wage * 1.18) / wageStep) * wageStep,
          upgradeDeltaOvr: upgradeDelta,
          fitScore,
          aiRationale: `Último ano de contrato no ${club.shortName}: pode assinar Pré-Contrato (Lei Bosman) sem pagar multa.`,
        });
      }

      // Permanent purchase within safe budget (or up to 82% of balance)
      if (
        suggestedFee <= balance * 0.82 &&
        upgradeDelta >= 1 &&
        evaluatePlayerClubWillingness(userClub, player, { dealType: 'PURCHASE', sellerClub: club })
          .willing
      ) {
        const budgetComfortBonus = suggestedFee <= diagnosis.safeTransferBudget ? 10 : 0;
        const ageBonus = player.age <= 24 ? 10 : player.age <= 28 ? 5 : -3;
        const fitScore =
          48 +
          upgradeDelta * 6.5 +
          (isPriority ? 20 : 0) +
          budgetComfortBonus +
          ageBonus;

        candidates.push({
          player,
          sellerClub: club,
          dealMode: 'PURCHASE',
          suggestedFee,
          suggestedWage,
          upgradeDeltaOvr: upgradeDelta,
          fitScore,
          aiRationale: isPriority
            ? `Reforço certeiro para sua maior carência (${player.detailedRole}): +${upgradeDelta} OVR sobre seu titular atual cabendo no caixa.`
            : `Eleva o patamar técnico em ${player.detailedRole} (+${upgradeDelta} OVR) com excelente relação custo-benefício.`,
        });
      }
    });
  });

  // Deduplicate by player.id and pick top 6 diverse recommendations
  const seenIds = new Set<string>();
  const recommendedSignings = candidates
    .sort((a, b) => b.fitScore - a.fitScore)
    .filter((item) => {
      if (seenIds.has(item.player.id)) return false;
      seenIds.add(item.player.id);
      return true;
    })
    .slice(0, 6);

  // Outgoing recommendations (sell surplus / high-wage reserves / loan youngsters)
  const outgoings: AiRecommendedOutgoing[] = [];
  userClub.squad.forEach((p) => {
    if (p.isStarter || p.isLoan) return;
    const roleCount = diagnosis.roleStats[p.detailedRole]?.count || 0;
    const minKeep = IDEAL_ROLE_DEPTH[p.detailedRole];

    if (p.age <= 21 && (p.potential || p.overall + 4) >= p.overall + 4) {
      outgoings.push({
        player: p,
        recommendedAction: 'LOAN_OUT',
        estimatedSaleValue: p.marketValue,
        monthlyWageSaved: Math.round(p.wage * 0.7),
        aiRationale: `Promessa de ${p.age} anos (potencial ${
          p.potential || p.overall + 5
        }) sem espaço entre os 11: emprestar acelera rodagem e alivia 70% do salário.`,
      });
      return;
    }

    if (roleCount >= minKeep && (p.age >= 25 || p.overall < diagnosis.avgStarterOverall - 3)) {
      const estFee = Math.round((p.marketValue * 1.02) / 50_000) * 50_000;
      outgoings.push({
        player: p,
        recommendedAction: 'SELL',
        estimatedSaleValue: estFee,
        monthlyWageSaved: p.wage,
        aiRationale: p.isListedForSale
          ? `Já listado para transferência · IA estima arrecadar cerca de ${formatCurrency(
              estFee
            )} com clubes da Série A/B.`
          : `Reserva negociável em setor bem servido (${roleCount} atletas em ${
              p.detailedRole
            }): venda libera ${formatCurrency(estFee)} + ${formatCurrency(p.wage)}/mês na folha.`,
      });
    }
  });

  const recommendedOutgoings = outgoings
    .sort((a, b) => b.estimatedSaleValue - a.estimatedSaleValue)
    .slice(0, 5);

  return {
    diagnosis,
    recommendedSignings,
    recommendedOutgoings,
  };
}

function assignBestSquadRoleOnArrival(squad: Player[], newcomer: Player): Player[] {
  let workingSquad = [...squad];

  // Ensure CPU club never exceeds MAX_SQUAD_SIZE (30) when signing or receiving a player
  // Never cut a club's last 2 GKs; prefer cutting from overcrowded roles first.
  while (workingSquad.length >= MAX_SQUAD_SIZE) {
    const gkCount = workingSquad.filter((p) => p.position === 'GK').length;
    const roleCounts = new Map<DetailedRole, number>();
    workingSquad.forEach((p) => {
      roleCounts.set(p.detailedRole, (roleCounts.get(p.detailedRole) || 0) + 1);
    });

    const eligibleCuts = workingSquad.filter((p) => {
      if (p.isStarter || p.isLoan) return false;
      // Protect minimum 2 GKs unless the newcomer is also a GK
      if (p.position === 'GK' && newcomer.position !== 'GK' && gkCount <= 2) return false;
      return true;
    });

    const cutCandidate = eligibleCuts.sort((a, b) => {
      const aSurplus = (roleCounts.get(a.detailedRole) || 0) - IDEAL_ROLE_DEPTH[a.detailedRole];
      const bSurplus = (roleCounts.get(b.detailedRole) || 0) - IDEAL_ROLE_DEPTH[b.detailedRole];
      // Prefer cutting from surplus positions (especially extra GKs >= 4)
      if (bSurplus > 0 && aSurplus <= 0) return 1;
      if (aSurplus > 0 && bSurplus <= 0) return -1;
      return a.overall - b.overall;
    })[0];

    if (!cutCandidate) break;
    workingSquad = workingSquad.filter((p) => p.id !== cutCandidate.id);
  }

  const existingNumbers = new Set(workingSquad.map((p) => p.squadNumber));
  let squadNumber = newcomer.squadNumber || 25;
  while (existingNumbers.has(squadNumber) && squadNumber < 99) {
    squadNumber++;
  }

  const startersInRole = workingSquad
    .filter((p) => p.isStarter && p.detailedRole === newcomer.detailedRole)
    .sort((a, b) => a.overall - b.overall);

  const weakestStarter = startersInRole[0];
  if (weakestStarter && newcomer.overall > weakestStarter.overall) {
    const promotedNewcomer: Player = {
      ...newcomer,
      squadNumber,
      isStarter: true,
      isSubstitute: false,
      pitchSlot: weakestStarter.pitchSlot,
      isListedForSale: false,
      isListedForLoan: false,
    };
    return [
      ...workingSquad.map((p) =>
        p.id === weakestStarter.id
          ? { ...p, isStarter: false, isSubstitute: true, pitchSlot: undefined }
          : p
      ),
      promotedNewcomer,
    ].slice(0, MAX_SQUAD_SIZE);
  }

  return [
    ...workingSquad,
    {
      ...newcomer,
      squadNumber,
      isStarter: false,
      isSubstitute: workingSquad.filter((p) => !p.isStarter && p.isSubstitute).length < 11,
      pitchSlot: undefined,
      isListedForSale: false,
      isListedForLoan: false,
    },
  ].slice(0, MAX_SQUAD_SIZE);
}

function executeSaleFromUserToCpu(
  state: GameSave,
  offer: TransferOffer,
  finalFee: number
): GameSave {
  const userClub = state.clubs.find((c) => c.id === state.userClubId);
  const buyerClub = state.clubs.find((c) => c.id === offer.fromClubId);
  const player = userClub?.squad.find((p) => p.id === offer.playerId);

  if (!userClub || !buyerClub || !player) {
    return {
      ...state,
      transferOffers: (state.transferOffers || []).map((o) =>
        o.id === offer.id ? { ...o, status: 'REJECTED' } : o
      ),
    };
  }

  const isLoanDeal = offer.offerType === 'LOAN';
  const userSeasonYear = resolveClubActiveSeasonYear(userClub, state);
  const winStatus = getTransferWindowStatus(state.currentDate, userClub);

  if (!winStatus.isOpen) {
    const updatedClubsClosed = state.clubs.map((c) => {
      if (c.id === userClub.id) {
        return {
          ...c,
          finances: {
            ...c.finances,
            balance: c.finances.balance + finalFee,
            totalIncomeSeason: c.finances.totalIncomeSeason + finalFee,
          },
          squad: c.squad.map((p) =>
            p.id === player.id
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
            balance: Math.max(0, c.finances.balance - finalFee),
            totalExpensesSeason: c.finances.totalExpensesSeason + finalFee,
          },
        };
      }
      return c;
    });

    const pendingOutDeal: PendingTransferDeal = {
      id: `ptr_out_${Date.now()}_${player.id}`,
      dealKind: isLoanDeal ? 'LOAN_OUT' : 'SALE_OUT',
      player: { ...player },
      playerId: player.id,
      playerName: player.name,
      playerRole: player.detailedRole,
      playerOverall: player.overall,
      playerAge: player.age,
      fromClubId: userClub.id,
      fromClubName: userClub.name,
      toClubId: buyerClub.id,
      toClubName: buyerClub.name,
      fee: finalFee,
      offeredWage: offer.offeredWage || player.wage,
      agreedDate: state.currentDate,
      agreedRound: state.currentRound,
      arrivalDate: winStatus.nextOpenDate,
      arrivalDisplayDate: winStatus.nextOpenDisplay,
      arrivalWindowLabel: winStatus.nextWindowLabel,
      loanDurationRounds: isLoanDeal ? offer.loanDurationRounds || 19 : undefined,
      loanWageSharePct: isLoanDeal ? offer.loanWageSharePct || 75 : undefined,
      loanBuyOptionFee: isLoanDeal
        ? offer.loanBuyOptionFee || Math.round(player.marketValue * 1.15)
        : undefined,
    };

    const historyClosed: TransferHistoryRecord = {
      id: `tr_out_pending_${Date.now()}_${player.id}`,
      playerId: player.id,
      playerName: player.name,
      playerRole: player.detailedRole,
      playerOverall: player.overall,
      playerAge: player.age,
      fromClubId: userClub.id,
      fromClubName: userClub.name,
      toClubId: buyerClub.id,
      toClubName: buyerClub.name,
      fee: finalFee,
      wage: isLoanDeal
        ? Math.round((player.wage * (offer.loanWageSharePct || 75)) / 100)
        : offer.offeredWage || player.wage,
      date: state.currentDate,
      round: state.currentRound,
      seasonYear: userSeasonYear,
      category: isLoanDeal ? 'LOAN_OUT' : 'SALE',
      direction: 'OUT',
      notes: `Acordo fechado · Segue p/ ${buyerClub.shortName} em ${winStatus.nextOpenDisplay}`,
    };

    return {
      ...state,
      clubs: updatedClubsClosed,
      pendingTransfers: [pendingOutDeal, ...(state.pendingTransfers || [])],
      transferOffers: (state.transferOffers || []).map((o) =>
        o.id === offer.id
          ? { ...o, transferFee: finalFee, status: 'ACCEPTED' }
          : o.playerId === player.id && o.status === 'PENDING'
          ? { ...o, status: 'REJECTED' }
          : o
      ),
      transferHistory: [historyClosed, ...(state.transferHistory || [])],
    };
  }

  if (isLoanDeal) {
    const duration = offer.loanDurationRounds || 19;
    const durationMonths = resolveLoanDurationMonths(duration);
    const sharePct = offer.loanWageSharePct || 75;
    const sharedWage = Math.max(1_000, Math.round((player.wage * sharePct) / 100));
    const loanedCopy: Player = {
      ...player,
      wage: sharedWage,
      loanOriginalWage: player.wage,
      isLoan: true,
      loanParentClubId: userClub.id,
      loanCurrentClubId: buyerClub.id,
      loanRoundsRemaining: duration,
      loanDurationMonths: durationMonths,
      loanWageContributionPct: sharePct,
      loanBuyOptionFee: offer.loanBuyOptionFee || Math.round(player.marketValue * 1.15),
      loanFeePaid: finalFee,
      isStarter: false,
      isSubstitute: true,
      isListedForLoan: false,
    };

    const updatedClubs = state.clubs.map((c) => {
      if (c.id === userClub.id) {
        const remaining = c.squad.filter((p) => p.id !== player.id);
        return {
          ...c,
          finances: {
            ...c.finances,
            balance: c.finances.balance + finalFee,
            totalIncomeSeason: c.finances.totalIncomeSeason + finalFee,
          },
          squad: remaining,
        };
      }
      if (c.id === buyerClub.id) {
        return {
          ...c,
          finances: {
            ...c.finances,
            balance: Math.max(0, c.finances.balance - finalFee),
            totalExpensesSeason: c.finances.totalExpensesSeason + finalFee,
          },
          squad: assignBestSquadRoleOnArrival(c.squad, loanedCopy),
        };
      }
      return c;
    });

    const historyItem: TransferHistoryRecord = {
      id: `tr_loan_out_${Date.now()}_${player.id}`,
      playerId: player.id,
      playerName: player.name,
      playerRole: player.detailedRole,
      playerOverall: player.overall,
      playerAge: player.age,
      fromClubId: userClub.id,
      fromClubName: userClub.name,
      toClubId: buyerClub.id,
      toClubName: buyerClub.name,
      fee: finalFee,
      wage: Math.round((player.wage * sharePct) / 100),
      date: state.currentDate,
      round: state.currentRound,
      seasonYear: userSeasonYear,
      category: 'LOAN_OUT',
      direction: 'OUT',
      notes: `Empréstimo (${sharePct}% salário pago pelo ${buyerClub.shortName})`,
    };

    return {
      ...state,
      clubs: updatedClubs,
      transferOffers: (state.transferOffers || []).map((o) =>
        o.id === offer.id
          ? { ...o, transferFee: finalFee, status: 'ACCEPTED' }
          : o.playerId === player.id && o.status === 'PENDING'
          ? { ...o, status: 'REJECTED' }
          : o
      ),
      transferHistory: [historyItem, ...(state.transferHistory || [])],
    };
  }

  // Permanent Sale
  const updatedUserSquad = userClub.squad.filter((p) => p.id !== player.id);
  // If sold player was a starter, promote best reserve in same role or overall
  let balancedUserSquad = updatedUserSquad;
  if (player.isStarter && balancedUserSquad.filter((p) => p.isStarter).length < 11) {
    const replacementCandidate =
      balancedUserSquad
        .filter((p) => !p.isStarter && p.detailedRole === player.detailedRole && p.injuryWeeks === 0)
        .sort((a, b) => b.overall - a.overall)[0] ||
      balancedUserSquad
        .filter((p) => !p.isStarter && p.injuryWeeks === 0)
        .sort((a, b) => b.overall - a.overall)[0];

    if (replacementCandidate) {
      balancedUserSquad = balancedUserSquad.map((p) =>
        p.id === replacementCandidate.id
          ? {
              ...p,
              isStarter: true,
              isSubstitute: false,
              pitchSlot: player.pitchSlot,
            }
          : p
      );
    }
  }

  const transferredPlayer: Player = {
    ...player,
    wage: offer.offeredWage || player.wage,
    contractYears: 3,
    isListedForSale: false,
    isListedForLoan: false,
    askingPrice: undefined,
  };

  const updatedClubs = state.clubs.map((c) => {
    if (c.id === userClub.id) {
      return {
        ...c,
        finances: {
          ...c.finances,
          balance: c.finances.balance + finalFee,
          totalIncomeSeason: c.finances.totalIncomeSeason + finalFee,
        },
        squad: balancedUserSquad,
      };
    }
    if (c.id === buyerClub.id) {
      return {
        ...c,
        finances: {
          ...c.finances,
          balance: Math.max(0, c.finances.balance - finalFee),
          totalExpensesSeason: c.finances.totalExpensesSeason + finalFee,
        },
        squad: assignBestSquadRoleOnArrival(c.squad, transferredPlayer),
      };
    }
    return c;
  });

  const historyItem: TransferHistoryRecord = {
    id: `tr_sale_${Date.now()}_${player.id}`,
    playerId: player.id,
    playerName: player.name,
    playerRole: player.detailedRole,
    playerOverall: player.overall,
    playerAge: player.age,
    fromClubId: userClub.id,
    fromClubName: userClub.name,
    toClubId: buyerClub.id,
    toClubName: buyerClub.name,
    fee: finalFee,
    wage: transferredPlayer.wage,
    date: state.currentDate,
    round: state.currentRound,
    seasonYear: userSeasonYear,
    category: 'SALE',
    direction: 'OUT',
    notes: 'Venda negociada no Mercado da Bola',
  };

  return {
    ...state,
    clubs: updatedClubs,
    transferOffers: (state.transferOffers || []).map((o) =>
      o.id === offer.id
        ? { ...o, transferFee: finalFee, status: 'ACCEPTED' }
        : o.playerId === player.id && o.status === 'PENDING'
        ? { ...o, status: 'REJECTED' }
        : o
    ),
    transferHistory: [historyItem, ...(state.transferHistory || [])],
  };
}

/**
 * Responde a uma proposta oficial enviada por um clube da CPU por um jogador do usuário:
 * - ACCEPT: Conclui a venda ou empréstimo imediatamente e credita o caixa.
 * - REJECT: Recusa a oferta.
 * - COUNTER: O Diretor de Futebol IA pede +18% de valorização sobre a proposta!
 */
export function respondToIncomingTransferOffer(
  state: GameSave,
  offerId: string,
  action: 'ACCEPT' | 'REJECT' | 'COUNTER'
): {
  success: boolean;
  feedbackText: string;
  updatedState: GameSave;
} {
  const offer = (state.transferOffers || []).find((o) => o.id === offerId);
  if (!offer || offer.status !== 'PENDING') {
    return {
      success: false,
      feedbackText: 'Esta proposta não está mais pendente.',
      updatedState: state,
    };
  }

  const userClub = state.clubs.find((c) => c.id === state.userClubId);
  const buyerClub = state.clubs.find((c) => c.id === offer.fromClubId);
  const player = userClub?.squad.find((p) => p.id === offer.playerId);

  if (!userClub || !buyerClub || !player) {
    return {
      success: false,
      feedbackText: 'O atleta ou clube comprador não foi localizado.',
      updatedState: {
        ...state,
        transferOffers: (state.transferOffers || []).map((o) =>
          o.id === offerId ? { ...o, status: 'REJECTED' } : o
        ),
      },
    };
  }

  if (action === 'REJECT') {
    const nextState: GameSave = {
      ...state,
      transferOffers: (state.transferOffers || []).map((o) =>
        o.id === offerId ? { ...o, status: 'REJECTED' } : o
      ),
    };
    return {
      success: true,
      feedbackText: `Proposta do ${buyerClub.name} por ${player.name} recusada oficialmente.`,
      updatedState: nextState,
    };
  }

  if (userClub.squad.length <= 16) {
    return {
      success: false,
      feedbackText: `Seu elenco possui apenas ${userClub.squad.length} jogadores. Contrate ou promova atletas da base antes de negociar saídas.`,
      updatedState: state,
    };
  }

  if (offer.offerType === 'LOAN') {
    const loanCounts = getClubSeasonLoanCounts({
      club: userClub,
      transferHistory: state.transferHistory,
      currentSeasonYear: state.currentSeasonYear,
      saSeasonYear: state.saSeasonYear,
      europeSeasonYear: state.europeSeasonYear,
    });
    if (loanCounts.loansOutCount >= MAX_SEASON_LOANS_OUT) {
      return {
        success: false,
        feedbackText: `Limite da temporada atingido: seu clube já emprestou ${loanCounts.loansOutCount}/${MAX_SEASON_LOANS_OUT} jogadores nesta temporada.`,
        updatedState: state,
      };
    }
  }

  if (action === 'ACCEPT') {
    const winNow = getTransferWindowStatus(state.currentDate, userClub);
    const soldState = executeSaleFromUserToCpu(state, offer, offer.transferFee);
    const dealLabel =
      offer.offerType === 'LOAN'
        ? `cedido por empréstimo ao ${buyerClub.name}`
        : `vendido ao ${buyerClub.name} por ${formatCurrency(offer.transferFee)}`;
    const windowNote = winNow.isOpen
      ? ''
      : ` Como a janela está fechada, o atleta permanece no elenco até ${winNow.nextOpenDisplay}.`;

    const msg: InboxMessage = {
      id: `msg_offer_acc_${Date.now()}`,
      title: `Negócio Fechado: ${player.name} no ${buyerClub.shortName}`,
      message: `A diretoria confirmou a transação! ${player.name} (${player.detailedRole}, OVR ${
        player.overall
      }) foi ${dealLabel}.${windowNote} Saldo atualizado do ${userClub.shortName}: ${formatCurrency(
        soldState.clubs.find((c) => c.id === userClub.id)?.finances.balance || 0
      )}.`,
      date: formatShortDate(state.currentDate),
      round: state.currentRound,
      read: false,
      type: 'TRANSFER',
    };

    return {
      success: true,
      feedbackText: `Acordo fechado! ${player.name} foi ${dealLabel}.${windowNote}`,
      updatedState: {
        ...soldState,
        inbox: [msg, ...soldState.inbox],
      },
    };
  }

  // COUNTER (+18% negotiated by AI Director)
  if (offer.offerType === 'LOAN') {
    const minLoanFloor = player.marketValue < 250_000 ? 25_000 : 150_000;
    const boostedLoanFee = Math.max(minLoanFloor, Math.round(player.marketValue * 0.12));
    if (buyerClub.finances.balance >= boostedLoanFee * 1.4) {
      const soldState = executeSaleFromUserToCpu(state, offer, boostedLoanFee);
      return {
        success: true,
        feedbackText: `Contraproposta aceita! O Diretor IA exigiu taxa de vitrine e o ${buyerClub.name} pagou ${formatCurrency(
          boostedLoanFee
        )} à vista pelo empréstimo de ${player.name}!`,
        updatedState: soldState,
      };
    }
  }

  const counterFee = Math.round((offer.transferFee * 1.18) / 50_000) * 50_000;
  const maxWillingToPay = Math.min(
    buyerClub.finances.balance * 0.78,
    player.marketValue * (player.age <= 24 ? 1.38 : 1.24)
  );

  if (counterFee <= maxWillingToPay) {
    const soldState = executeSaleFromUserToCpu(state, offer, counterFee);
    const gainExtra = counterFee - offer.transferFee;
    const msg: InboxMessage = {
      id: `msg_counter_won_${Date.now()}`,
      title: `Diretor IA Valoriza Venda: ${player.name} sai por ${formatCurrency(counterFee)}!`,
      message: `Sua contraproposta com apoio da IA funcionou! O ${buyerClub.name} aceitou subir a oferta em +${formatCurrency(
        gainExtra
      )} e comprou ${player.name} por ${formatCurrency(counterFee)} à vista.`,
      date: formatShortDate(state.currentDate),
      round: state.currentRound,
      read: false,
      type: 'TRANSFER',
    };

    return {
      success: true,
      feedbackText: `Negociação cirúrgica! O ${buyerClub.name} aceitou pagar ${formatCurrency(
        counterFee
      )} (+${formatCurrency(gainExtra)} extras) por ${player.name}!`,
      updatedState: {
        ...soldState,
        inbox: [msg, ...soldState.inbox],
      },
    };
  }

  // Buyer cannot reach +18%, check if they offer a +9% final compromise
  const compromiseFee = Math.round((offer.transferFee * 1.09) / 50_000) * 50_000;
  if ((offer.counterCount || 0) === 0 && compromiseFee <= buyerClub.finances.balance * 0.85) {
    const updatedOffers = (state.transferOffers || []).map((o) =>
      o.id === offer.id
        ? {
            ...o,
            transferFee: compromiseFee,
            counterCount: 1,
            reason: `Contraproposta final do ${buyerClub.shortName} (+9% sobre a oferta inicial)`,
          }
        : o
    );
    return {
      success: true,
      feedbackText: `O ${buyerClub.name} recusou pagar ${formatCurrency(
        counterFee
      )}, mas subiu a proposta oficial para o teto final de ${formatCurrency(compromiseFee)}!`,
      updatedState: {
        ...state,
        transferOffers: updatedOffers,
      },
    };
  }

  // Buyer withdraws from talks
  return {
    success: false,
    feedbackText: `O ${buyerClub.name} considerou a pedida de ${formatCurrency(
      counterFee
    )} fora do seu teto financeiro e retirou a proposta por ${player.name}.`,
    updatedState: {
      ...state,
      transferOffers: (state.transferOffers || []).map((o) =>
        o.id === offer.id ? { ...o, status: 'REJECTED' } : o
      ),
    },
  };
}

/**
 * O Diretor de Futebol IA oferece ativamente um jogador do usuário aos 186 clubes do mercado
 * e gera imediatamente 1 a 2 propostas reais de compra/empréstimo se houver clubes compatíveis.
 */
export function shopPlayerViaAiDirector(
  state: GameSave,
  playerId: string
): {
  offersGenerated: number;
  feedbackText: string;
  updatedState: GameSave;
} {
  const userClub = state.clubs.find((c) => c.id === state.userClubId);
  const player = userClub?.squad.find((p) => p.id === playerId);

  if (!userClub || !player) {
    return {
      offersGenerated: 0,
      feedbackText: 'Jogador não encontrado no elenco.',
      updatedState: state,
    };
  }

  if (player.isLoan) {
    return {
      offersGenerated: 0,
      feedbackText: `${player.name} atua por empréstimo no clube e não pode ser vendido.`,
      updatedState: state,
    };
  }

  if (findPendingTransferForPlayer(state.pendingTransfers, player.id)) {
    return {
      offersGenerated: 0,
      feedbackText: `${player.name} já possui transferência agendada para a abertura da janela.`,
      updatedState: state,
    };
  }

  // Avoid duplicate pending offers for the exact same player from same club
  const existingBuyerIds = new Set(
    (state.transferOffers || [])
      .filter((o) => o.playerId === player.id && o.status === 'PENDING')
      .map((o) => o.fromClubId)
  );

  // Score all CPU clubs on need + budget + OVR compatibility
  const buyerMatches = state.clubs
    .filter((c) => c.id !== userClub.id && !existingBuyerIds.has(c.id))
    .map((club) => {
      const diag = diagnoseClubSquadNeeds(club);
      const roleAvg = diag.roleStats[player.detailedRole]?.starterAvgOvr || 66;
      const ovrDiff = player.overall - roleAvg;
      const canBuy = club.finances.balance >= player.marketValue * 0.92;
      const wantsLoan =
        !canBuy &&
        player.age <= 23 &&
        ovrDiff >= 0 &&
        club.finances.balance >= player.wage * 4;

      if (!canBuy && !wantsLoan) return null;
      if (ovrDiff < -3 || ovrDiff > 11) return null;
      if (
        !evaluatePlayerClubWillingness(club, player, {
          dealType: canBuy ? 'PURCHASE' : 'LOAN',
          sellerClub: userClub,
        }).willing
      ) {
        return null;
      }

      let interestScore = 50 + ovrDiff * 6;
      if (diag.weakestRole === player.detailedRole) interestScore += 22;
      if (diag.shortageRoles.includes(player.detailedRole)) interestScore += 15;
      if ((userClub.rivals || []).includes(club.id)) interestScore -= 18;

      return {
        club,
        canBuy,
        interestScore,
      };
    })
    .filter((x): x is { club: Club; canBuy: boolean; interestScore: number } => Boolean(x))
    .sort((a, b) => b.interestScore - a.interestScore)
    .slice(0, 2);

  // Mark player as listed for sale so ongoing rounds also know
  const updatedClubs = state.clubs.map((c) =>
    c.id === userClub.id
      ? {
          ...c,
          squad: c.squad.map((p) =>
            p.id === player.id ? { ...p, isListedForSale: true } : p
          ),
        }
      : c
  );

  if (buyerMatches.length === 0) {
    return {
      offersGenerated: 0,
      feedbackText: `${player.name} foi colocado na vitrine pela IA, mas nenhum clube tem caixa imediato para o valor atual (${formatCurrency(
        player.marketValue
      )}). Novas sondagens ocorrerão nas próximas rodadas.`,
      updatedState: {
        ...state,
        clubs: updatedClubs,
      },
    };
  }

  const newOffers: TransferOffer[] = buyerMatches.map(({ club, canBuy }, idx) => {
    const mult = 0.94 + ((club.id.charCodeAt(0) + idx * 7) % 18) / 100; // 0.94x to 1.11x
    const rawFee = canBuy ? Math.round((player.marketValue * mult) / 50_000) * 50_000 : 0;
    const fee = canBuy ? Math.min(rawFee, Math.round(club.finances.balance * 0.72)) : 0;
    const offeredWage = Math.round((player.wage * 1.12) / 1000) * 1000;

    return {
      id: `toff_ai_${club.id}_${player.id}_${Date.now()}_${idx}`,
      playerId: player.id,
      playerName: player.name,
      playerRole: player.detailedRole,
      playerOverall: player.overall,
      playerAge: player.age,
      fromClubId: club.id,
      fromClubName: club.name,
      toClubId: userClub.id,
      toClubName: userClub.name,
      transferFee: fee,
      offeredWage,
      status: 'PENDING',
      date: formatShortDate(state.currentDate),
      offerType: canBuy ? 'PERMANENT' : 'LOAN',
      loanWageSharePct: canBuy ? undefined : 80,
      loanDurationRounds: canBuy ? undefined : 19,
      loanBuyOptionFee: canBuy ? undefined : Math.round(player.marketValue * 1.15),
      reason: canBuy
        ? `Mapeado pelo departamento de análise do ${club.shortName} para reforçar ${player.detailedRole}`
        : `Pedido de empréstimo de 19 rodadas (80% dos salários pagos pelo ${club.shortName})`,
      aiRecommendedPrice: Math.round((player.marketValue * 1.08) / 50_000) * 50_000,
      counterCount: 0,
    };
  });

  const summaryNames = newOffers
    .map((o) =>
      o.offerType === 'LOAN'
        ? `${o.fromClubName} (Empréstimo)`
        : `${o.fromClubName} (${formatCurrency(o.transferFee)})`
    )
    .join(' e ');

  const inboxMsg: InboxMessage = {
    id: `msg_ai_shop_${player.id}_${Date.now()}`,
    title: `Diretor IA Recebe Propostas Oficiais por ${player.name}!`,
    message: `Após oferecer ${player.name} (${player.detailedRole}, OVR ${player.overall}) ao mercado, chegaram propostas oficiais de ${summaryNames}. Acesse o Mercado da Bola > Central IA & Propostas para aceitar, recusar ou pedir valorização!`,
    date: formatShortDate(state.currentDate),
    round: state.currentRound,
    read: false,
    type: 'TRANSFER',
    offerId: newOffers[0].id,
  };

  return {
    offersGenerated: newOffers.length,
    feedbackText: `Diretor IA encontrou ${newOffers.length} interessado(s) imediato(s) em ${player.name}: ${summaryNames}!`,
    updatedState: {
      ...state,
      clubs: updatedClubs,
      transferOffers: [...newOffers, ...(state.transferOffers || [])].slice(0, 25),
      inbox: [inboxMsg, ...state.inbox],
    },
  };
}

export function isClubRegionTransferWindowOpen(club: Club, dateStr?: string): boolean {
  const safeDate =
    dateStr && /^\d{4}-\d{2}-\d{2}$/.test(dateStr) ? dateStr : '2027-01-15';
  const [, month, day] = safeDate.split('-').map(Number);

  if (club.division === 'EU') {
    // Jan 1 - Jan 31 (winter) & Jul 1 - Aug 31 (summer)
    return month === 1 || month === 7 || month === 8;
  }
  if (club.division === 'WL') {
    // Jan 1 - Mar 15 & Jul 1 - Sep 15
    return (
      month === 1 ||
      month === 2 ||
      (month === 3 && day <= 15) ||
      month === 7 ||
      month === 8 ||
      (month === 9 && day <= 15)
    );
  }
  return getTransferWindowStatus(safeDate, club).isOpen;
}

function trimTransferHistory(
  history: TransferHistoryRecord[],
  maxEntries: number = 650
): TransferHistoryRecord[] {
  if (history.length <= maxEntries) return history;
  const userDeals: TransferHistoryRecord[] = [];
  const cpuDeals: TransferHistoryRecord[] = [];
  for (const item of history) {
    if (item.direction === 'IN' || item.direction === 'OUT') {
      userDeals.push(item);
    } else {
      cpuDeals.push(item);
    }
  }
  const cpuBudget = Math.max(120, maxEntries - userDeals.length);
  const keptCpu = new Set(cpuDeals.slice(0, cpuBudget).map((i) => i.id));
  return history.filter((item) => item.direction !== 'CPU' || keptCpu.has(item.id));
}

function rebalanceCpuStartersAfterDeparture(squad: Player[], departed: Player): Player[] {
  if (!departed.isStarter || squad.filter((p) => p.isStarter).length >= 11) {
    return squad;
  }
  const replacement =
    squad
      .filter((p) => !p.isStarter && p.position === departed.position && p.injuryWeeks === 0)
      .sort((a, b) => b.overall - a.overall)[0] ||
    squad
      .filter((p) => !p.isStarter && p.position === departed.position)
      .sort((a, b) => b.overall - a.overall)[0] ||
    squad
      .filter(
        (p) =>
          !p.isStarter &&
          (departed.position === 'GK' ? p.position === 'GK' : p.position !== 'GK')
      )
      .sort((a, b) => b.overall - a.overall)[0];

  if (!replacement) return squad;
  return squad.map((p) =>
    p.id === replacement.id
      ? { ...p, isStarter: true, isSubstitute: false, pitchSlot: departed.pitchSlot }
      : p
  );
}

interface ClubMarketSnapshot {
  club: Club;
  clubLevelOvr: number;
  economy: ClubEconomyProfile;
  diag: ClubSquadDiagnosis;
  gkCount: number;
  loansInCount: number;
  loansOutCount: number;
  windowOpen: boolean;
  safeBudget: number;
}

function sampleSubset<T>(arr: T[], maxCount: number): T[] {
  if (arr.length <= maxCount) return [...arr];
  const copy = [...arr];
  for (let i = 0; i < maxCount; i++) {
    const j = i + Math.floor(Math.random() * (copy.length - i));
    const tmp = copy[i];
    copy[i] = copy[j];
    copy[j] = tmp;
  }
  return copy.slice(0, maxCount);
}

function pickWeightedRoleForClub(diag: ClubSquadDiagnosis): DetailedRole {
  const allRoles: DetailedRole[] = ['GOL', 'ZAG', 'LAT', 'VOL', 'MEI', 'ATA'];
  const nonHoardedRoles = allRoles.filter((r) => {
    const cnt = diag.roleStats[r]?.count || 0;
    if (r === 'GOL') {
      return cnt < 3 || (cnt === 3 && diag.roleStats.GOL.bestOvr < diag.avgStarterOverall - 4);
    }
    return cnt < IDEAL_ROLE_DEPTH[r] + 2;
  });

  if (nonHoardedRoles.length === 0) return diag.weakestRole;
  const urgentShortages = diag.shortageRoles.filter((r) => nonHoardedRoles.includes(r));
  if (urgentShortages.length > 0 && Math.random() < 0.65) {
    return urgentShortages[Math.floor(Math.random() * urgentShortages.length)];
  }
  if (nonHoardedRoles.includes(diag.weakestRole) && Math.random() < 0.72) {
    return diag.weakestRole;
  }
  return nonHoardedRoles[Math.floor(Math.random() * nonHoardedRoles.length)];
}

/**
 * Motor autônomo de transferências, empréstimos e jogadores livres por rodada/calendário:
 * 1A) Jogadores livres recebem propostas reais de clubes do seu nível durante TODA a temporada e assinam;
 * 1B) Clubes da CPU de todas as divisões compram e vendem dentro da realidade esportiva e financeira de cada clube;
 * 1C) Clubes da CPU emprestam e pegam emprestado entre si em todas as prateleiras (com divisão salarial e opção de compra);
 * 2) Clubes da CPU enviam propostas oficiais de compra/empréstimo por atletas do clube do usuário.
 */
export function processRoundAiTransferMarket(
  state: GameSave,
  matchDate: string,
  options?: { isCalendarSkip?: boolean }
): GameSave {
  const isCalendarSkip = Boolean(options?.isCalendarSkip);
  let clubs = state.clubs.map((c) => ({ ...c, finances: { ...c.finances }, squad: [...c.squad] }));
  let freeAgents = [...(state.transferMarket || [])];
  let offers = [...(state.transferOffers || [])];
  let freeAgentBids: FreeAgentMarketBid[] = [...(state.freeAgentBids || [])];
  const newDeals: TransferHistoryRecord[] = [];
  const newInbox: InboxMessage[] = [];

  const clubsById = new Map<string, Club>(clubs.map((c) => [c.id, c]));
  const userClubRef = clubsById.get(state.userClubId);
  const userDivision = userClubRef?.division || 'A';
  const watchlistIds = new Set((state.watchlist || []).map((w) => w.playerId));

  // Pre-count season loans in/out for every club in a single O(H) pass
  const seasonLoansIn = new Map<string, number>();
  const seasonLoansOut = new Map<string, number>();
  for (const rec of state.transferHistory || []) {
    if (rec.category === 'LOAN_IN' && rec.toClubId) {
      const targetClub = clubsById.get(rec.toClubId);
      if (targetClub && rec.seasonYear === resolveClubActiveSeasonYear(targetClub, state)) {
        seasonLoansIn.set(rec.toClubId, (seasonLoansIn.get(rec.toClubId) || 0) + 1);
      }
    } else if (rec.category === 'LOAN_OUT' && rec.fromClubId) {
      const srcClub = clubsById.get(rec.fromClubId);
      if (srcClub && rec.seasonYear === resolveClubActiveSeasonYear(srcClub, state)) {
        seasonLoansOut.set(rec.fromClubId, (seasonLoansOut.get(rec.fromClubId) || 0) + 1);
      }
    }
  }

  // Fast snapshot cache per club (rebuilt lazily only for clubs mutated during this tick)
  const activeDivisions = new Set<Division>(['A', 'B', 'C', 'D', 'EST', 'SA', 'EU', 'WL']);
  const snapshots = new Map<string, ClubMarketSnapshot>();

  const buildSnapshot = (club: Club): ClubMarketSnapshot => {
    const economy = getClubEconomyProfile(club);
    const diag = diagnoseClubSquadNeeds(club);
    const clubLevelOvr = getClubEffectiveLevelOvr(club);
    const gkCount = club.squad.filter((p) => p.position === 'GK').length;
    const windowOpen = isClubRegionTransferWindowOpen(club, matchDate);
    return {
      club,
      clubLevelOvr,
      economy,
      diag,
      gkCount,
      loansInCount: seasonLoansIn.get(club.id) || 0,
      loansOutCount: seasonLoansOut.get(club.id) || 0,
      windowOpen,
      safeBudget: Math.max(0, Math.round(club.finances.balance * 0.58)),
    };
  };

  for (const club of clubs) {
    if (club.id !== state.userClubId && activeDivisions.has(club.division)) {
      snapshots.set(club.id, buildSnapshot(club));
    }
  }

  const updateClubRecord = (updatedClub: Club) => {
    clubsById.set(updatedClub.id, updatedClub);
    if (updatedClub.id !== state.userClubId && activeDivisions.has(updatedClub.division)) {
      snapshots.set(updatedClub.id, buildSnapshot(updatedClub));
    }
  };

  const cpuSnapshotsList = (): ClubMarketSnapshot[] => Array.from(snapshots.values());
  const movedPlayerIdsThisTick = new Set<string>();
  const sellerDeparturesThisTick = new Map<string, number>();

  // -------------------------------------------------------------------------
  // PARTE 1A: JOGADORES LIVRES — Propostas reais e contratações durante TODA a temporada
  // -------------------------------------------------------------------------
  const freeAgentsById = new Map<string, Player>(freeAgents.map((p) => [p.id, p]));
  // Prune bids for players no longer free or clubs no longer active
  freeAgentBids = freeAgentBids.filter(
    (b) => freeAgentsById.has(b.playerId) && snapshots.has(b.clubId)
  );

  // Step 1A.1: Resolve mature free-agent bids (expiresDate <= matchDate)
  const bidsByPlayer = new Map<string, FreeAgentMarketBid[]>();
  for (const bid of freeAgentBids) {
    const list = bidsByPlayer.get(bid.playerId) || [];
    list.push(bid);
    bidsByPlayer.set(bid.playerId, list);
  }

  const resolvedFreeAgentIds = new Set<string>();
  bidsByPlayer.forEach((playerBids, playerId) => {
    const hasMatureBid = playerBids.some((b) => b.expiresDate <= matchDate);
    if (!hasMatureBid) return;

    const freePlayer = freeAgentsById.get(playerId);
    if (!freePlayer) {
      resolvedFreeAgentIds.add(playerId);
      return;
    }

    // Score competing clubs by realistic sporting fit + offered wage
    const validRanked = playerBids
      .map((bid) => {
        const snap = snapshots.get(bid.clubId);
        if (!snap || snap.club.squad.length >= MAX_SQUAD_SIZE) return null;
        if (freePlayer.position === 'GK' && snap.gkCount >= 3) return null;
        const levelDiff = Math.abs(freePlayer.overall - snap.clubLevelOvr);
        const wageScore = (bid.offeredWage / Math.max(1_000, freePlayer.wage)) * 22;
        const needBonus =
          snap.diag.weakestRole === freePlayer.detailedRole
            ? 12
            : snap.diag.shortageRoles.includes(freePlayer.detailedRole)
            ? 7
            : 0;
        const score = 50 - levelDiff * 3 + wageScore + needBonus + Math.random() * 8;
        return { bid, snap, score };
      })
      .filter((x): x is { bid: FreeAgentMarketBid; snap: ClubMarketSnapshot; score: number } =>
        Boolean(x)
      )
      .sort((a, b) => b.score - a.score);

    resolvedFreeAgentIds.add(playerId);
    const winner = validRanked[0];
    if (!winner) return;

    const { bid, snap } = winner;
    const signedFreeAgent: Player = {
      ...freePlayer,
      wage: bid.offeredWage,
      contractYears: bid.contractYears,
      releaseClause: computeDefaultReleaseClause(
        { ...freePlayer, wage: bid.offeredWage, contractYears: bid.contractYears },
        snap.club
      ),
      isLoan: false,
      isListedForSale: false,
      isListedForLoan: false,
      morale: 'Boa',
    };

    const updatedBuyer: Club = {
      ...snap.club,
      squad: assignBestSquadRoleOnArrival(snap.club.squad, signedFreeAgent),
    };
    updateClubRecord(updatedBuyer);
    freeAgentsById.delete(playerId);
    movedPlayerIdsThisTick.add(playerId);

    newDeals.push({
      id: `tr_cpu_free_${Date.now()}_${Math.floor(Math.random() * 9999)}_${freePlayer.id}`,
      playerId: freePlayer.id,
      playerName: freePlayer.name,
      playerRole: freePlayer.detailedRole,
      playerOverall: freePlayer.overall,
      playerAge: freePlayer.age,
      fromClubName: 'Sem Clube (Livre)',
      toClubId: updatedBuyer.id,
      toClubName: updatedBuyer.name,
      fee: 0,
      wage: bid.offeredWage,
      date: matchDate,
      round: state.currentRound,
      seasonYear: resolveClubActiveSeasonYear(updatedBuyer, state),
      category: 'FREE_AGENT',
      direction: 'CPU',
      notes:
        playerBids.length > 1
          ? `Livre · Venceu disputa c/ ${playerBids.length - 1} clube(s) · Contrato ${bid.contractYears}a`
          : `Livre no mercado · Contrato de ${bid.contractYears} ${bid.contractYears === 1 ? 'ano' : 'anos'}`,
    });

    if (watchlistIds.has(freePlayer.id)) {
      newInbox.push({
        id: `msg_wl_fa_signed_${freePlayer.id}_${Date.now()}`,
        title: `Alvo Livre Assinou: ${freePlayer.name} fechou com o ${updatedBuyer.shortName}`,
        message: `O atleta livre ${freePlayer.name} (${freePlayer.detailedRole}, OVR ${freePlayer.overall}), que estava na sua Lista de Observação, aceitou proposta do ${updatedBuyer.name} (${formatCurrency(
          bid.offeredWage
        )}/mês por ${bid.contractYears} ${bid.contractYears === 1 ? 'ano' : 'anos'}).`,
        date: formatShortDate(matchDate),
        round: state.currentRound,
        read: false,
        type: 'TRANSFER',
      });
    }
  });

  if (resolvedFreeAgentIds.size > 0) {
    freeAgents = freeAgents.filter((p) => !resolvedFreeAgentIds.has(p.id));
    freeAgentBids = freeAgentBids.filter((b) => !resolvedFreeAgentIds.has(b.playerId));
  }

  // Step 1A.2: Generate new realistic CPU proposals for free agents all season long
  const anyWindowOpen =
    getTransferWindowStatus(matchDate).isOpen ||
    cpuSnapshotsList().some((s) => s.windowOpen);
  const newFreeAgentBidsTarget = isCalendarSkip
    ? anyWindowOpen
      ? 4
      : 2
    : anyWindowOpen
    ? 6
    : 3;

  if (freeAgents.length > 0 && newFreeAgentBidsTarget > 0) {
    const activeBidCounts = new Map<string, number>();
    const activeBidPairs = new Set<string>();
    for (const b of freeAgentBids) {
      activeBidCounts.set(b.playerId, (activeBidCounts.get(b.playerId) || 0) + 1);
      activeBidPairs.add(`${b.playerId}__${b.clubId}`);
    }

    const eligibleFreeAgents = freeAgents.filter(
      (p) =>
        (activeBidCounts.get(p.id) || 0) < 2 &&
        !findPendingTransferForPlayer(state.pendingTransfers, p.id)
    );

    // Stratify selection across OVR tiers so lower, mid, and elite free agents all receive offers
    const topBand = eligibleFreeAgents.filter((p) => p.overall >= 74);
    const midBand = eligibleFreeAgents.filter((p) => p.overall >= 66 && p.overall < 74);
    const lowBand = eligibleFreeAgents.filter((p) => p.overall < 66);
    const chosenFreeCandidates: Player[] = [
      ...sampleSubset(topBand, Math.max(1, Math.ceil(newFreeAgentBidsTarget * 0.35))),
      ...sampleSubset(midBand, Math.max(1, Math.ceil(newFreeAgentBidsTarget * 0.4))),
      ...sampleSubset(lowBand, Math.max(1, Math.ceil(newFreeAgentBidsTarget * 0.35))),
    ].slice(0, newFreeAgentBidsTarget);

    const allCpuSnaps = cpuSnapshotsList().filter(
      (s) =>
        s.club.squad.length < MAX_SQUAD_SIZE &&
        (s.club.division !== 'EU' || s.windowOpen)
    );
    const sameDivSnaps = allCpuSnaps.filter((s) => s.club.division === userDivision);

    for (const faPlayer of chosenFreeCandidates) {
      const probePool = [
        ...sampleSubset(sameDivSnaps, 16),
        ...sampleSubset(allCpuSnaps, 44),
      ];
      const seenClubs = new Set<string>();
      const clubMatches: Array<{ snap: ClubMarketSnapshot; fitScore: number; offeredWage: number }> =
        [];

      for (const snap of probePool) {
        if (seenClubs.has(snap.club.id)) continue;
        seenClubs.add(snap.club.id);
        if (activeBidPairs.has(`${faPlayer.id}__${snap.club.id}`)) continue;
        if (snap.club.squad.length >= MAX_SQUAD_SIZE) continue;
        if (faPlayer.position === 'GK' && snap.gkCount >= 3) continue;

        // Enforce realistic club level match (neither too high nor way too low!)
        const minClubFloor = Math.round(snap.clubLevelOvr) - 5;
        if (faPlayer.overall < minClubFloor) continue;
        if (
          !evaluatePlayerClubWillingness(snap.club, faPlayer, { dealType: 'FREE_AGENT' }).willing
        ) {
          continue;
        }

        const roleStats = snap.diag.roleStats[faPlayer.detailedRole];
        const roleStarterAvg = roleStats?.starterAvgOvr || snap.diag.avgStarterOverall - 2;
        const ovrDiff = faPlayer.overall - roleStarterAvg;
        const needsRole =
          snap.diag.weakestRole === faPlayer.detailedRole ||
          snap.diag.shortageRoles.includes(faPlayer.detailedRole);

        if (!needsRole && ovrDiff < -1) continue;

        const wageStep = faPlayer.wage < 15_000 ? 500 : 1_000;
        const rawWage = Math.round(
          (faPlayer.wage * (0.92 + Math.random() * 0.22)) / wageStep
        ) * wageStep;
        const offeredWage = Math.max(snap.economy.playerWageFloor, rawWage);
        const overdraft = getClubOverdraftLimit(snap.club);
        const canCoverWage =
          snap.club.finances.balance >= offeredWage * 3 ||
          (snap.club.finances.balance > -overdraft * 0.35 &&
            offeredWage <= snap.economy.playerWageFloor * 8);
        if (!canCoverWage) continue;

        const levelTightness = Math.max(0, 12 - Math.abs(faPlayer.overall - snap.clubLevelOvr) * 2);
        const fitScore =
          40 +
          levelTightness +
          ovrDiff * 4 +
          (snap.diag.weakestRole === faPlayer.detailedRole ? 18 : 0) +
          (snap.diag.shortageRoles.includes(faPlayer.detailedRole) ? 12 : 0);

        clubMatches.push({ snap, fitScore, offeredWage });
      }

      clubMatches.sort((a, b) => b.fitScore - a.fitScore);
      // 1 club normally, or 2 competing clubs (~30% chance) for hot free agents!
      const biddersToCreate =
        clubMatches.length >= 2 && Math.random() < 0.32
          ? clubMatches.slice(0, 2)
          : clubMatches.slice(0, 1);

      for (const match of biddersToCreate) {
        const contractYears =
          faPlayer.age >= 34 ? 1 : faPlayer.age >= 30 ? (Math.random() < 0.55 ? 1 : 2) : Math.random() < 0.5 ? 2 : 3;
        const decisionDays = 3 + Math.floor(Math.random() * 4);
        const bid: FreeAgentMarketBid = {
          id: `fab_${match.snap.club.id}_${faPlayer.id}_${Date.now()}_${Math.floor(Math.random() * 999)}`,
          playerId: faPlayer.id,
          playerName: faPlayer.name,
          playerRole: faPlayer.detailedRole,
          playerOverall: faPlayer.overall,
          playerAge: faPlayer.age,
          clubId: match.snap.club.id,
          clubName: match.snap.club.name,
          clubShortName: match.snap.club.shortName,
          offeredWage: match.offeredWage,
          contractYears,
          submittedDate: matchDate,
          expiresDate: addDays(matchDate, decisionDays),
        };
        freeAgentBids.push(bid);
        activeBidPairs.add(`${faPlayer.id}__${match.snap.club.id}`);
      }
    }
  }

  // Keep active bids bounded cleanly
  if (freeAgentBids.length > 48) {
    freeAgentBids = freeAgentBids.slice(-48);
  }

  // -------------------------------------------------------------------------
  // PARTE 1B: COMPRAS E VENDAS REALISTAS ENTRE TODOS OS CLUBES DA CPU (janelas regionais abertas)
  // -------------------------------------------------------------------------
  const openWindowBuyers = cpuSnapshotsList().filter(
    (s) =>
      s.windowOpen &&
      s.club.squad.length < MAX_SQUAD_SIZE &&
      s.safeBudget >= s.economy.playerValueFloor
  );
  const openUserDivBuyers = openWindowBuyers.filter((s) => s.club.division === userDivision);

  const permanentDealsTarget =
    openWindowBuyers.length === 0
      ? 0
      : isCalendarSkip
      ? 4 + Math.floor(Math.random() * 3) // 4..6
      : 6 + Math.floor(Math.random() * 5); // 6..10

  const allCpuOpenSellers = () =>
    cpuSnapshotsList().filter(
      (s) =>
        s.club.squad.length >= 20 &&
        (sellerDeparturesThisTick.get(s.club.id) || 0) < 2
    );

  for (let d = 0; d < permanentDealsTarget && openWindowBuyers.length > 0; d++) {
    // 38% of deals focus on the user's division so their league is visibly dynamic
    const useUserDivPool = openUserDivBuyers.length > 0 && Math.random() < 0.38;
    const pool = useUserDivPool ? openUserDivBuyers : openWindowBuyers;
    const pickedBuyerSnap = pool[Math.floor(Math.random() * pool.length)];
    const buyerSnap = snapshots.get(pickedBuyerSnap.club.id);
    if (!buyerSnap || buyerSnap.club.squad.length >= MAX_SQUAD_SIZE) continue;
    if (buyerSnap.safeBudget < buyerSnap.economy.playerValueFloor) continue;

    const targetRole = pickWeightedRoleForClub(buyerSnap.diag);
    const roleStarterAvg =
      buyerSnap.diag.roleStats[targetRole]?.starterAvgOvr || buyerSnap.diag.weakestRoleAvgOvr;
    const minNeededOvr = Math.max(50, roleStarterAvg - (buyerSnap.diag.shortageRoles.includes(targetRole) ? 1 : 0));
    const maxWantedOvr = Math.round(buyerSnap.clubLevelOvr) + 6;

    const sellerPool = allCpuOpenSellers().filter((s) => s.club.id !== buyerSnap.club.id);
    // Prefer sellers from same country/division or adjacent sporting tiers
    const sameCountrySellers = sellerPool.filter(
      (s) =>
        s.club.country === buyerSnap.club.country ||
        s.club.division === buyerSnap.club.division
    );
    const sampledSellers = [
      ...sampleSubset(sameCountrySellers, 26),
      ...sampleSubset(sellerPool, 26),
    ];
    const seenSellerIds = new Set<string>();

    let bestPurchase:
      | { sellerSnap: ClubMarketSnapshot; player: Player; fee: number; wage: number; score: number }
      | undefined;

    for (const sellerSnap of sampledSellers) {
      if (seenSellerIds.has(sellerSnap.club.id)) continue;
      seenSellerIds.add(sellerSnap.club.id);
      if (sellerSnap.club.squad.length < 20) continue;

      for (const p of sellerSnap.club.squad) {
        if (p.isLoan || p.retiringAtSeasonEnd || movedPlayerIdsThisTick.has(p.id)) continue;
        if (p.detailedRole !== targetRole) continue;
        if (p.position === 'GK' && sellerSnap.gkCount <= 2) continue;
        if (p.overall < minNeededOvr || p.overall > maxWantedOvr) continue;

        // Starter protection: same/higher-reputation clubs only sell starters for a premium
        const buyerIsStronger =
          buyerSnap.club.reputation > sellerSnap.club.reputation ||
          buyerSnap.clubLevelOvr >= sellerSnap.clubLevelOvr + 3;
        if (p.isStarter && !buyerIsStronger && !p.isListedForSale && Math.random() < 0.78) {
          continue;
        }

        const feeStep = p.marketValue < 250_000 ? 10_000 : 50_000;
        const priceMult = p.isListedForSale
          ? 0.88 + Math.random() * 0.14
          : p.isStarter
          ? 1.08 + Math.random() * 0.2
          : 0.92 + Math.random() * 0.16;
        const fee = Math.max(
          buyerSnap.economy.playerValueFloor,
          Math.round((p.marketValue * priceMult) / feeStep) * feeStep
        );
        if (fee > buyerSnap.safeBudget) continue;

        const wageStep = p.wage < 15_000 ? 500 : 1_000;
        const offeredWage = Math.max(
          buyerSnap.economy.playerWageFloor,
          Math.round((p.wage * (1.05 + Math.random() * 0.14)) / wageStep) * wageStep
        );
        if (buyerSnap.club.finances.balance - fee < offeredWage * 3) continue;

        if (
          !evaluatePlayerClubWillingness(buyerSnap.club, p, {
            dealType: 'PURCHASE',
            sellerClub: sellerSnap.club,
          }).willing
        ) {
          continue;
        }

        const upgradeDelta = p.overall - roleStarterAvg;
        const ageBonus = p.age <= 24 ? 6 : p.age >= 32 ? -4 : 2;
        const score = upgradeDelta * 6 + ageBonus + (p.isListedForSale ? 5 : 0) + Math.random() * 5;

        if (!bestPurchase || score > bestPurchase.score) {
          bestPurchase = { sellerSnap, player: p, fee, wage: offeredWage, score };
        }
      }
    }

    if (bestPurchase) {
      const { sellerSnap, player: tradedPlayer, fee, wage } = bestPurchase;
      const contractYears =
        tradedPlayer.age >= 33 ? 2 : tradedPlayer.age <= 24 ? 4 : 3;

      const updatedSellerSquad = rebalanceCpuStartersAfterDeparture(
        sellerSnap.club.squad.filter((p) => p.id !== tradedPlayer.id),
        tradedPlayer
      );
      const updatedSeller: Club = {
        ...sellerSnap.club,
        finances: {
          ...sellerSnap.club.finances,
          balance: sellerSnap.club.finances.balance + fee,
          totalIncomeSeason: sellerSnap.club.finances.totalIncomeSeason + fee,
        },
        squad: updatedSellerSquad,
      };

      const arrivingPlayer: Player = {
        ...tradedPlayer,
        wage,
        contractYears,
        releaseClause: computeDefaultReleaseClause(
          { ...tradedPlayer, wage, contractYears },
          buyerSnap.club
        ),
        isLoan: false,
        isListedForSale: false,
        isListedForLoan: false,
        askingPrice: undefined,
      };

      const updatedBuyer: Club = {
        ...buyerSnap.club,
        finances: {
          ...buyerSnap.club.finances,
          balance: Math.max(0, buyerSnap.club.finances.balance - fee),
          totalExpensesSeason: buyerSnap.club.finances.totalExpensesSeason + fee,
        },
        squad: assignBestSquadRoleOnArrival(buyerSnap.club.squad, arrivingPlayer),
      };

      updateClubRecord(updatedSeller);
      updateClubRecord(updatedBuyer);
      movedPlayerIdsThisTick.add(tradedPlayer.id);
      sellerDeparturesThisTick.set(
        sellerSnap.club.id,
        (sellerDeparturesThisTick.get(sellerSnap.club.id) || 0) + 1
      );

      newDeals.push({
        id: `tr_cpu_buy_${Date.now()}_${d}_${tradedPlayer.id}`,
        playerId: tradedPlayer.id,
        playerName: tradedPlayer.name,
        playerRole: tradedPlayer.detailedRole,
        playerOverall: tradedPlayer.overall,
        playerAge: tradedPlayer.age,
        fromClubId: updatedSeller.id,
        fromClubName: updatedSeller.name,
        toClubId: updatedBuyer.id,
        toClubName: updatedBuyer.name,
        fee,
        wage,
        date: matchDate,
        round: state.currentRound,
        seasonYear: resolveClubActiveSeasonYear(updatedBuyer, state),
        category: 'PURCHASE',
        direction: 'CPU',
        notes: `Mercado da Bola · Reforço para ${targetRole} (${contractYears}a)`,
      });
    }
  }

  // -------------------------------------------------------------------------
  // PARTE 1C: EMPRÉSTIMOS REALISTAS ENTRE TODOS OS CLUBES DA CPU (todas as divisões!)
  // -------------------------------------------------------------------------
  const openLoanBorrowers = cpuSnapshotsList().filter(
    (s) =>
      s.windowOpen &&
      s.club.squad.length < MAX_SQUAD_SIZE &&
      s.loansInCount < MAX_SEASON_LOANS_IN
  );
  const openUserDivBorrowers = openLoanBorrowers.filter((s) => s.club.division === userDivision);

  const loanDealsTarget =
    openLoanBorrowers.length === 0
      ? 0
      : isCalendarSkip
      ? 2 + Math.floor(Math.random() * 3) // 2..4
      : 4 + Math.floor(Math.random() * 4); // 4..7

  for (let l = 0; l < loanDealsTarget && openLoanBorrowers.length > 0; l++) {
    const useUserDiv = openUserDivBorrowers.length > 0 && Math.random() < 0.38;
    const bPool = useUserDiv ? openUserDivBorrowers : openLoanBorrowers;
    const pickedBorrower = bPool[Math.floor(Math.random() * bPool.length)];
    const borrowerSnap = snapshots.get(pickedBorrower.club.id);
    if (
      !borrowerSnap ||
      borrowerSnap.club.squad.length >= MAX_SQUAD_SIZE ||
      borrowerSnap.loansInCount >= MAX_SEASON_LOANS_IN
    ) {
      continue;
    }

    const targetRole = pickWeightedRoleForClub(borrowerSnap.diag);
    const roleStarterAvg =
      borrowerSnap.diag.roleStats[targetRole]?.starterAvgOvr || borrowerSnap.diag.weakestRoleAvgOvr;

    const lenderCandidates = cpuSnapshotsList().filter(
      (s) =>
        s.club.id !== borrowerSnap.club.id &&
        s.club.squad.length >= 21 &&
        s.loansOutCount < MAX_SEASON_LOANS_OUT &&
        (sellerDeparturesThisTick.get(s.club.id) || 0) < 2 &&
        // Lenders are typically equal or higher sporting level than the borrower
        s.clubLevelOvr >= borrowerSnap.clubLevelOvr - 2
    );
    const sameCountryLenders = lenderCandidates.filter(
      (s) => s.club.country === borrowerSnap.club.country
    );
    const sampledLenders = [
      ...sampleSubset(sameCountryLenders, 24),
      ...sampleSubset(lenderCandidates, 24),
    ];
    const seenLenders = new Set<string>();

    let bestLoan:
      | {
          lenderSnap: ClubMarketSnapshot;
          player: Player;
          durationRounds: 19 | 38;
          wageSharePct: number;
          loanFee: number;
          buyOptionFee?: number;
          score: number;
        }
      | undefined;

    for (const lenderSnap of sampledLenders) {
      if (seenLenders.has(lenderSnap.club.id)) continue;
      seenLenders.add(lenderSnap.club.id);

      const lenderRoleCount = lenderSnap.diag.roleStats[targetRole]?.count || 0;
      for (const p of lenderSnap.club.squad) {
        if (p.isLoan || p.isStarter || p.retiringAtSeasonEnd || movedPlayerIdsThisTick.has(p.id)) {
          continue;
        }
        if (p.detailedRole !== targetRole) continue;
        if (p.position === 'GK' && lenderSnap.gkCount <= 2) continue;

        // Eligible for loan: young prospect (<= 24) seeking minutes OR surplus reserve (<= 31)
        const isYouthLoan = p.age <= 24;
        const isSurplusLoan =
          p.isListedForLoan || (p.age <= 31 && lenderRoleCount >= IDEAL_ROLE_DEPTH[targetRole]);
        if (!isYouthLoan && !isSurplusLoan) continue;

        // Realistic level match (not way below borrower, not above what player accepts)
        if (p.overall < Math.round(borrowerSnap.clubLevelOvr) - 4) continue;
        if (p.overall < roleStarterAvg - 2) continue;
        if (
          !evaluatePlayerClubWillingness(borrowerSnap.club, p, {
            dealType: 'LOAN',
            sellerClub: lenderSnap.club,
          }).willing
        ) {
          continue;
        }

        // Realistic wage split & optional loan fee tailored to borrower's finances
        const wageRatio = borrowerSnap.club.finances.balance / Math.max(1_000, p.wage);
        if (wageRatio < 2.5) continue;
        const wageSharePct =
          wageRatio >= 18
            ? 100
            : wageRatio >= 10
            ? 80
            : wageRatio >= 6
            ? 65
            : 50;
        const sharedWage = Math.max(1_000, Math.round((p.wage * wageSharePct) / 100));
        if (sharedWage > borrowerSnap.economy.playerWageFloor * 38 && wageRatio < 12) {
          continue;
        }

        const durationRounds: 19 | 38 =
          isYouthLoan && Math.random() < 0.55 ? 38 : 19;
        const feeStep = p.marketValue < 250_000 ? 10_000 : 50_000;
        const loanFee =
          p.overall >= 74 && borrowerSnap.safeBudget >= p.marketValue * 0.25 && Math.random() < 0.45
            ? Math.max(feeStep, Math.round((p.marketValue * 0.06) / feeStep) * feeStep)
            : 0;
        const buyOptionFee =
          Math.random() < 0.72
            ? Math.max(feeStep * 2, Math.round((p.marketValue * 1.15) / feeStep) * feeStep)
            : undefined;

        const upgradeDelta = p.overall - roleStarterAvg;
        const score =
          upgradeDelta * 5 +
          (isYouthLoan ? 7 : 3) +
          (lenderSnap.club.country === borrowerSnap.club.country ? 6 : 0) +
          Math.random() * 5;

        if (!bestLoan || score > bestLoan.score) {
          bestLoan = {
            lenderSnap,
            player: p,
            durationRounds,
            wageSharePct,
            loanFee,
            buyOptionFee,
            score,
          };
        }
      }
    }

    if (bestLoan) {
      const { lenderSnap, player: loanPlayer, durationRounds, wageSharePct, loanFee, buyOptionFee } =
        bestLoan;
      const durationMonths = resolveLoanDurationMonths(durationRounds);
      const sharedWage = Math.max(1_000, Math.round((loanPlayer.wage * wageSharePct) / 100));

      const loanedCopy: Player = {
        ...loanPlayer,
        wage: sharedWage,
        loanOriginalWage: loanPlayer.wage,
        isLoan: true,
        loanParentClubId: lenderSnap.club.id,
        loanCurrentClubId: borrowerSnap.club.id,
        loanRoundsRemaining: durationRounds,
        loanDurationMonths: durationMonths,
        loanWageContributionPct: wageSharePct,
        loanBuyOptionFee: buyOptionFee,
        loanFeePaid: loanFee,
        isListedForSale: false,
        isListedForLoan: false,
      };

      const updatedLender: Club = {
        ...lenderSnap.club,
        finances: {
          ...lenderSnap.club.finances,
          balance: lenderSnap.club.finances.balance + loanFee,
          totalIncomeSeason: lenderSnap.club.finances.totalIncomeSeason + loanFee,
        },
        squad: lenderSnap.club.squad.filter((p) => p.id !== loanPlayer.id),
      };

      const updatedBorrower: Club = {
        ...borrowerSnap.club,
        finances: {
          ...borrowerSnap.club.finances,
          balance: Math.max(0, borrowerSnap.club.finances.balance - loanFee),
          totalExpensesSeason: borrowerSnap.club.finances.totalExpensesSeason + loanFee,
        },
        squad: assignBestSquadRoleOnArrival(borrowerSnap.club.squad, loanedCopy),
      };

      seasonLoansOut.set(updatedLender.id, (seasonLoansOut.get(updatedLender.id) || 0) + 1);
      seasonLoansIn.set(updatedBorrower.id, (seasonLoansIn.get(updatedBorrower.id) || 0) + 1);
      updateClubRecord(updatedLender);
      updateClubRecord(updatedBorrower);
      movedPlayerIdsThisTick.add(loanPlayer.id);
      sellerDeparturesThisTick.set(
        updatedLender.id,
        (sellerDeparturesThisTick.get(updatedLender.id) || 0) + 1
      );

      const termLabel = durationMonths === 6 ? '6 meses' : '1 ano';
      newDeals.push({
        id: `tr_cpu_loan_${Date.now()}_${l}_${loanPlayer.id}`,
        playerId: loanPlayer.id,
        playerName: loanPlayer.name,
        playerRole: loanPlayer.detailedRole,
        playerOverall: loanPlayer.overall,
        playerAge: loanPlayer.age,
        fromClubId: updatedLender.id,
        fromClubName: updatedLender.name,
        toClubId: updatedBorrower.id,
        toClubName: updatedBorrower.name,
        fee: loanFee,
        wage: sharedWage,
        date: matchDate,
        round: state.currentRound,
        seasonYear: resolveClubActiveSeasonYear(updatedBorrower, state),
        category: 'LOAN_IN',
        direction: 'CPU',
        notes: `Empréstimo ${termLabel} (${wageSharePct}% sal.)${
          buyOptionFee ? ` · Opção ${formatCurrency(buyOptionFee)}` : ''
        }`,
      });
    }
  }

  // Re-materialize clubs array from updated map before Part 2 (user club offers)
  clubs = state.clubs.map((c) => clubsById.get(c.id) || c);

  // -------------------------------------------------------------------------
  // PARTE 2: Clubes da CPU enviam propostas de compra ou empréstimo por atletas do usuário
  // -------------------------------------------------------------------------
  const userClub = clubs.find((c) => c.id === state.userClubId);
  const pendingUserOffers = offers.filter((o) => o.status === 'PENDING');
  const userWindowOpen = userClub ? isClubRegionTransferWindowOpen(userClub, matchDate) : false;
  const maxPendingOffers = userWindowOpen ? 4 : 3;

  if (userClub && userClub.squad.length >= 18 && pendingUserOffers.length < maxPendingOffers) {
    const listedPlayers = userClub.squad.filter(
      (p) =>
        (p.isListedForSale || p.isListedForLoan) &&
        !p.isLoan &&
        !findPendingTransferForPlayer(state.pendingTransfers, p.id)
    );
    const lowMinuteU23Candidates = userClub.squad.filter(
      (p) =>
        !p.isLoan &&
        !p.isStarter &&
        !p.isListedForSale &&
        p.age <= 23 &&
        p.matches <= 5 &&
        p.overall >= 58 &&
        p.injuryWeeks === 0 &&
        !findPendingTransferForPlayer(state.pendingTransfers, p.id)
    );
    const standoutTargets = userClub.squad.filter(
      (p) =>
        !p.isLoan &&
        !p.isListedForSale &&
        !findPendingTransferForPlayer(state.pendingTransfers, p.id) &&
        (p.goals >= 4 || p.ratingAverage >= 7.2 || (p.age <= 22 && p.overall >= 72))
    );

    let targetPlayer: Player | undefined;
    let isListedBid = false;
    let isProactiveLoanBid = false;

    const listedChance = userWindowOpen ? 0.65 : 0.45;
    const loanChance = userWindowOpen ? 0.42 : 0.25;
    const standoutChance = userWindowOpen ? 0.34 : 0.2;

    if (listedPlayers.length > 0 && Math.random() < listedChance) {
      targetPlayer = listedPlayers[Math.floor(Math.random() * listedPlayers.length)];
      isListedBid = true;
    } else if (lowMinuteU23Candidates.length > 0 && Math.random() < loanChance) {
      targetPlayer =
        lowMinuteU23Candidates[Math.floor(Math.random() * lowMinuteU23Candidates.length)];
      isProactiveLoanBid = true;
    } else if (standoutTargets.length > 0 && Math.random() < standoutChance) {
      targetPlayer = standoutTargets[Math.floor(Math.random() * standoutTargets.length)];
    }

    if (
      targetPlayer &&
      !pendingUserOffers.some((o) => o.playerId === targetPlayer!.id)
    ) {
      const wantLoanOnly =
        isProactiveLoanBid ||
        Boolean(targetPlayer.isListedForLoan && !targetPlayer.isListedForSale);
      const userLoanCounts = getClubSeasonLoanCounts({
        club: userClub,
        transferHistory: state.transferHistory,
        currentSeasonYear: state.currentSeasonYear,
        saSeasonYear: state.saSeasonYear,
        europeSeasonYear: state.europeSeasonYear,
      });
      const loanQuotaBlocked = wantLoanOnly && userLoanCounts.loansOutCount >= MAX_SEASON_LOANS_OUT;
      const interestedClubs = loanQuotaBlocked
        ? []
        : cpuSnapshotsList()
            .filter((snap) => {
              const c = snap.club;
              if (c.id === userClub.id || c.squad.length >= MAX_SQUAD_SIZE) return false;
              if (wantLoanOnly && snap.loansInCount >= MAX_SEASON_LOANS_IN) return false;
              if (
                !evaluatePlayerClubWillingness(c, targetPlayer!, {
                  dealType: wantLoanOnly ? 'LOAN' : 'PURCHASE',
                  sellerClub: userClub,
                }).willing
              ) {
                return false;
              }
              if (wantLoanOnly) {
                return (
                  targetPlayer!.overall >= Math.round(snap.clubLevelOvr) - 4 &&
                  c.finances.balance >= targetPlayer!.wage * 3
                );
              }
              return c.finances.balance >= targetPlayer!.marketValue * 0.92;
            })
            .map((snap) => {
              const roleAvg = snap.diag.roleStats[targetPlayer!.detailedRole]?.starterAvgOvr || 66;
              const fit =
                (snap.diag.weakestRole === targetPlayer!.detailedRole ? 25 : 0) +
                (snap.diag.shortageRoles.includes(targetPlayer!.detailedRole) ? 12 : 0) +
                (targetPlayer!.overall - roleAvg) * 5;
              return { club: snap.club, fit };
            })
            .filter((x) => x.fit >= -4)
            .sort((a, b) => b.fit - a.fit);

      const chosenBuyer = interestedClubs[0]?.club;
      if (chosenBuyer) {
        const basePrice = targetPlayer.askingPrice || targetPlayer.marketValue;
        const feeStep = basePrice < 250_000 ? 10_000 : 50_000;
        const mult = isListedBid ? 0.96 + Math.random() * 0.14 : 1.06 + Math.random() * 0.2;
        const rawFee = wantLoanOnly
          ? 0
          : Math.round((basePrice * mult) / feeStep) * feeStep;
        const finalOfferFee = wantLoanOnly
          ? chosenBuyer.finances.balance >= basePrice * 0.6 && targetPlayer.overall >= 74
            ? Math.round((basePrice * 0.05) / feeStep) * feeStep
            : 0
          : Math.min(rawFee, Math.round(chosenBuyer.finances.balance * 0.72));

        const loanDuration: 19 | 38 = targetPlayer.age <= 22 && Math.random() < 0.45 ? 38 : 19;
        const loanWageSharePct =
          chosenBuyer.finances.balance >= targetPlayer.wage * 12 ? 90 : 75;
        const wageStep = targetPlayer.wage < 15_000 ? 500 : 1_000;

        const newOffer: TransferOffer = {
          id: `toff_cpu_r${state.currentRound}_${chosenBuyer.id}_${targetPlayer.id}`,
          playerId: targetPlayer.id,
          playerName: targetPlayer.name,
          playerRole: targetPlayer.detailedRole,
          playerOverall: targetPlayer.overall,
          playerAge: targetPlayer.age,
          fromClubId: chosenBuyer.id,
          fromClubName: chosenBuyer.name,
          toClubId: userClub.id,
          toClubName: userClub.name,
          transferFee: finalOfferFee,
          offeredWage: Math.round((targetPlayer.wage * 1.15) / wageStep) * wageStep,
          status: 'PENDING',
          date: formatShortDate(matchDate),
          offerType: wantLoanOnly ? 'LOAN' : 'PERMANENT',
          loanWageSharePct: wantLoanOnly ? loanWageSharePct : undefined,
          loanDurationRounds: wantLoanOnly ? loanDuration : undefined,
          loanBuyOptionFee: wantLoanOnly
            ? Math.round((targetPlayer.marketValue * 1.15) / feeStep) * feeStep
            : undefined,
          reason: isListedBid
            ? `Interesse oficial após listagem no mercado (${targetPlayer.detailedRole})`
            : wantLoanOnly
            ? `Busca rodagem por empréstimo (${loanDuration === 38 ? '1 ano' : '6 meses'}) em ${targetPlayer.detailedRole}`
            : `Destaque na temporada chamou atenção dos olheiros do ${chosenBuyer.shortName}`,
          aiRecommendedPrice: Math.round((targetPlayer.marketValue * 1.1) / feeStep) * feeStep,
          counterCount: 0,
        };

        // Check if AI Director Auto-Negotiate is enabled for explicitly listed-for-sale players
        if (
          state.aiDirectorAutoNegotiate &&
          targetPlayer.isListedForSale &&
          !wantLoanOnly &&
          userClub.squad.length > 17 &&
          finalOfferFee >= targetPlayer.marketValue * 0.95
        ) {
          const negotiatedAutoFee = Math.min(
            Math.round((finalOfferFee * 1.08) / feeStep) * feeStep,
            Math.round(chosenBuyer.finances.balance * 0.8)
          );
          const tempStateWithOffer: GameSave = {
            ...state,
            clubs,
            transferMarket: freeAgents,
            freeAgentBids,
            lastAiMarketSyncDate: matchDate,
            transferOffers: [newOffer, ...offers],
            transferHistory: trimTransferHistory([
              ...newDeals,
              ...(state.transferHistory || []),
            ]),
          };
          const autoSoldState = executeSaleFromUserToCpu(
            tempStateWithOffer,
            newOffer,
            negotiatedAutoFee
          );

          newInbox.push({
            id: `msg_ai_autosold_${targetPlayer.id}_${Date.now()}`,
            title: `Diretor IA Concluiu Venda: ${targetPlayer.name} no ${chosenBuyer.shortName}`,
            message: `Conforme sua delegação para atletas listados, o Diretor de Futebol IA negociou a venda de ${
              targetPlayer.name
            } ao ${chosenBuyer.name} por ${formatCurrency(
              negotiatedAutoFee
            )} (+8% negociado acima da oferta inicial)!`,
            date: formatShortDate(matchDate),
            round: state.currentRound,
            read: false,
            type: 'TRANSFER',
          });

          return {
            ...autoSoldState,
            inbox: [...newInbox, ...autoSoldState.inbox],
          };
        }

        offers = [newOffer, ...offers].slice(0, 25);
        newInbox.push({
          id: `msg_cpu_bid_${newOffer.id}`,
          title:
            newOffer.offerType === 'LOAN'
              ? `Proposta de Empréstimo: ${chosenBuyer.shortName} quer ${targetPlayer.name}`
              : `Proposta Oficial Recebida: ${chosenBuyer.shortName} oferece ${formatCurrency(
                  finalOfferFee
                )} por ${targetPlayer.name}`,
          message:
            newOffer.offerType === 'LOAN'
              ? `O ${chosenBuyer.name} enviou proposta formal para ter ${targetPlayer.name} (${targetPlayer.detailedRole}, OVR ${targetPlayer.overall}) por empréstimo de ${
                  loanDuration === 38 ? '1 ano (38 rodadas)' : '6 meses (19 rodadas)'
                } pagando ${loanWageSharePct}% do salário${
                  finalOfferFee > 0 ? ` mais taxa à vista de ${formatCurrency(finalOfferFee)}` : ''
                }. Abra o Mercado da Bola > Central IA & Propostas para responder!`
              : `O ${chosenBuyer.name} formalizou proposta oficial de ${formatCurrency(
                  finalOfferFee
                )} à vista para comprar ${targetPlayer.name} (${targetPlayer.detailedRole}, OVR ${
                  targetPlayer.overall
                }). Abra o Mercado da Bola > Central IA & Propostas para aceitar, recusar ou pedir +18% com a IA!`,
          date: formatShortDate(matchDate),
          round: state.currentRound,
          read: false,
          type: 'TRANSFER',
          offerId: newOffer.id,
        });
      }
    }
  }

  return {
    ...state,
    clubs,
    transferMarket: freeAgents,
    freeAgentBids,
    lastAiMarketSyncDate: matchDate,
    transferOffers: offers,
    transferHistory: trimTransferHistory([...newDeals, ...(state.transferHistory || [])]),
    inbox: [...newInbox, ...state.inbox],
  };
}

export interface PermanentOfferPreview {
  willAcceptClub: boolean;
  willAcceptPlayer: boolean;
  willAcceptAll: boolean;
  canAfford: boolean;
  minAcceptableFee: number;
  minAcceptableWage: number;
  probabilityPct: number;
  tone: 'emerald' | 'amber' | 'rose';
  statusLabel: string;
  hint: string;
}

/**
 * Live negotiation thermometer for Permanent Transfers & Free Agents.
 */
export function previewPermanentOffer(params: {
  userClub: Club;
  sellerClub?: Club;
  player: Player;
  offerFee: number;
  offerWage: number;
  discountFactor?: number;
  swapCredit?: number;
  clauseDiscount?: number;
}): PermanentOfferPreview {
  const {
    userClub,
    sellerClub,
    player,
    offerFee,
    offerWage,
    discountFactor = 1,
    swapCredit = 0,
    clauseDiscount = 0,
  } = params;

  const overdraftLimit = getClubOverdraftLimit(userClub);
  const canAfford = !sellerClub || userClub.finances.balance - Math.max(0, offerFee) >= -overdraftLimit;

  const willingness = evaluatePlayerClubWillingness(userClub, player, {
    dealType: sellerClub ? 'PURCHASE' : 'FREE_AGENT',
    sellerClub,
  });

  const wageStep = player.wage < 15_000 ? 500 : 1000;

  if (!sellerClub) {
    const minWage = Math.round((player.wage * 0.9) / wageStep) * wageStep;
    if (!willingness.willing) {
      return {
        willAcceptClub: true,
        willAcceptPlayer: false,
        willAcceptAll: false,
        canAfford: true,
        minAcceptableFee: 0,
        minAcceptableWage: minWage,
        probabilityPct: 0,
        tone: 'rose',
        statusLabel: 'Recusa do Atleta (Nível)',
        hint:
          willingness.reason ||
          `${player.name} (OVR ${player.overall}) recusou atuar nesta divisão.`,
      };
    }

    const willAcceptPlayer = offerWage >= minWage;
    const ratio = minWage > 0 ? Math.min(1.2, offerWage / minWage) : 1;
    const prob = willAcceptPlayer ? 100 : Math.max(15, Math.round(ratio * 82));
    return {
      willAcceptClub: true,
      willAcceptPlayer,
      willAcceptAll: willAcceptPlayer,
      canAfford: true,
      minAcceptableFee: 0,
      minAcceptableWage: minWage,
      probabilityPct: prob,
      tone: willAcceptPlayer ? 'emerald' : prob >= 70 ? 'amber' : 'rose',
      statusLabel: willAcceptPlayer ? 'Acordo Pronto' : 'Salário Abaixo da Pedida',
      hint: willAcceptPlayer
        ? `${player.name} aceita este contrato sem custos de transferência.`
        : `O estafe de ${player.name} pede ao menos ${formatCurrency(minWage)}/mês.`,
    };
  }

  const baseMinFee = Math.round(
    player.marketValue * (discountFactor < 1 ? 0.78 : 0.95) * (1 - clauseDiscount)
  );
  const minAcceptableFee = Math.max(0, baseMinFee - swapCredit);
  const minAcceptableWage = Math.round((player.wage * 1.05) / wageStep) * wageStep;

  const willAcceptClub = offerFee >= minAcceptableFee;
  const willAcceptPlayer = willingness.willing && offerWage >= minAcceptableWage;
  const willAcceptAll = canAfford && willAcceptClub && willAcceptPlayer;

  if (!willingness.willing) {
    return {
      willAcceptClub,
      willAcceptPlayer: false,
      willAcceptAll: false,
      canAfford,
      minAcceptableFee,
      minAcceptableWage,
      probabilityPct: 0,
      tone: 'rose',
      statusLabel: 'Recusa do Atleta (Nível)',
      hint:
        willingness.reason ||
        `${player.name} (OVR ${player.overall}) busca um clube de prateleira superior.`,
    };
  }

  if (!canAfford) {
    return {
      willAcceptClub,
      willAcceptPlayer,
      willAcceptAll: false,
      canAfford: false,
      minAcceptableFee,
      minAcceptableWage,
      probabilityPct: 0,
      tone: 'rose',
      statusLabel: 'Acima do Limite Bancário',
      hint: `Caixa atual insuf. para ${formatCurrency(offerFee)}. Inclua troca, cláusulas ou reduza a taxa.`,
    };
  }

  if (willAcceptAll) {
    return {
      willAcceptClub: true,
      willAcceptPlayer: true,
      willAcceptAll: true,
      canAfford: true,
      minAcceptableFee,
      minAcceptableWage,
      probabilityPct: 100,
      tone: 'emerald',
      statusLabel: 'Aceite Garantido',
      hint: `${sellerClub.shortName} e ${player.name} aceitam estes termos imediatamente.`,
    };
  }

  const feeRatio = minAcceptableFee > 0 ? Math.min(1, offerFee / minAcceptableFee) : 1;
  const wageRatio = minAcceptableWage > 0 ? Math.min(1, offerWage / minAcceptableWage) : 1;
  const probabilityPct = Math.max(12, Math.min(92, Math.round((feeRatio * 0.65 + wageRatio * 0.35) * 90)));

  const missing: string[] = [];
  if (!willAcceptClub) missing.push(`passe mín. ${formatCurrency(minAcceptableFee)}`);
  if (!willAcceptPlayer) missing.push(`salário mín. ${formatCurrency(minAcceptableWage)}/mês`);

  return {
    willAcceptClub,
    willAcceptPlayer,
    willAcceptAll: false,
    canAfford: true,
    minAcceptableFee,
    minAcceptableWage,
    probabilityPct,
    tone: probabilityPct >= 72 ? 'amber' : 'rose',
    statusLabel: probabilityPct >= 72 ? 'Quase Fechado' : 'Oferta Baixa',
    hint: `Falta ajustar: ${missing.join(' · ')}.`,
  };
}

export interface InstantBuyerQuote {
  club: Club;
  offeredFee: number;
  maxNegotiableFee: number;
  offeredWage: number;
  fitReason: string;
  fitScore: number;
}

export interface InstantBuyersScanResult {
  eligible: boolean;
  blockReason?: string;
  buyers: InstantBuyerQuote[];
}

/**
 * Encontra imediatamente até 4 clubes com interesse e caixa real para comprar um jogador do usuário.
 */
export function findInstantBuyersForPlayer(
  state: GameSave,
  playerId: string
): InstantBuyersScanResult {
  const userClub = state.clubs.find((c) => c.id === state.userClubId);
  const player = userClub?.squad.find((p) => p.id === playerId);

  if (!userClub || !player) {
    return { eligible: false, blockReason: 'Jogador não encontrado no elenco.', buyers: [] };
  }
  if (player.isLoan) {
    return {
      eligible: false,
      blockReason: `${player.name} pertence a outro clube (empréstimo) e não pode ser vendido.`,
      buyers: [],
    };
  }
  if (userClub.squad.length <= 16) {
    return {
      eligible: false,
      blockReason: `Elenco no mínimo regulamentar (${userClub.squad.length}/16 atletas). Contrate antes de vender.`,
      buyers: [],
    };
  }
  if (findPendingTransferForPlayer(state.pendingTransfers, player.id)) {
    return {
      eligible: false,
      blockReason: `${player.name} já possui transferência fechada aguardando abertura da janela.`,
      buyers: [],
    };
  }

  const scored: InstantBuyerQuote[] = [];
  const econ = getClubEconomyProfile(userClub);
  const baseVal = Math.max(
    econ.playerValueFloor,
    player.askingPrice || player.marketValue || econ.playerValueFloor
  );
  const feeStep = baseVal < 250_000 ? 10_000 : 50_000;
  const wageStep = player.wage < 15_000 ? 500 : 1000;

  state.clubs.forEach((club) => {
    if (club.id === userClub.id) return;
    if (club.squad.length >= MAX_SQUAD_SIZE) return;
    if (club.finances.balance < baseVal * 0.65) return;
    if (
      !evaluatePlayerClubWillingness(club, player, {
        dealType: 'PURCHASE',
        sellerClub: userClub,
      }).willing
    ) {
      return;
    }

    const diag = diagnoseClubSquadNeeds(club);
    const roleAvg = diag.roleStats[player.detailedRole]?.starterAvgOvr || 67;
    const ovrDiff = player.overall - roleAvg;

    if (ovrDiff < -5 || ovrDiff > 14) return;

    let fitScore = 45 + ovrDiff * 4.5;
    if (diag.weakestRole === player.detailedRole) fitScore += 22;
    if (diag.shortageRoles.includes(player.detailedRole)) fitScore += 16;
    if ((userClub.rivals || []).includes(club.id)) fitScore -= 16;
    if (player.age <= 23) fitScore += 8;

    // Slight league diversity preference & budget comfort
    const budgetRatio = club.finances.balance / Math.max(1, baseVal);
    if (budgetRatio >= 2.2) fitScore += 10;

    // Offered fee between 92% and 112% depending on need & club wealth
    const needMult =
      (diag.weakestRole === player.detailedRole ? 1.07 : 0.96) +
      (budgetRatio >= 2.5 ? 0.05 : 0) +
      (player.age <= 22 ? 0.04 : 0);
    const rawOffer = Math.round((baseVal * Math.min(1.16, needMult)) / feeStep) * feeStep;
    const minBuyFloor = getClubEconomyProfile(club).playerValueFloor;
    const offeredFee = Math.min(
      Math.max(minBuyFloor, rawOffer),
      Math.round((club.finances.balance * 0.72) / feeStep) * feeStep
    );

    const maxNegotiableFee = Math.min(
      Math.round((offeredFee * 1.15) / feeStep) * feeStep,
      Math.round((club.finances.balance * 0.82) / feeStep) * feeStep
    );

    const fitReason =
      diag.weakestRole === player.detailedRole
        ? `Carência prioritária em ${player.detailedRole} (eleva nível titular)`
        : diag.shortageRoles.includes(player.detailedRole)
        ? `Busca opção imediata p/ ${player.detailedRole} no elenco`
        : club.division === 'EU' || club.division === 'WL'
        ? `Interesse internacional com liquidez à vista`
        : `Elenco precisa de reposição técnica em ${player.detailedRole}`;

    scored.push({
      club,
      offeredFee,
      maxNegotiableFee: Math.max(offeredFee, maxNegotiableFee),
      offeredWage: Math.round((player.wage * 1.1) / wageStep) * wageStep,
      fitReason,
      fitScore,
    });
  });

  const buyers = scored.sort((a, b) => b.fitScore - a.fitScore).slice(0, 4);

  return {
    eligible: true,
    buyers,
  };
}

export interface SmartLoanDestination {
  club: Club;
  suggestedWageSharePct: number;
  suggestedLoanFee: number;
  suggestedBuyOptionFee: number;
  minutesChance: 'Titular Imediato' | 'Rotação Forte' | 'Compõe Elenco';
  fitReason: string;
  fitScore: number;
}

/**
 * Sugere os 6 melhores destinos para emprestar um atleta do usuário (onde terá minutos e salário dividido).
 */
export function findSmartLoanDestinations(
  state: GameSave,
  playerId: string
): SmartLoanDestination[] {
  const userClub = state.clubs.find((c) => c.id === state.userClubId);
  const player = userClub?.squad.find((p) => p.id === playerId);
  if (!userClub || !player) return [];

  const results: SmartLoanDestination[] = [];
  const step = player.marketValue < 250_000 ? 10_000 : 50_000;
  const minBuyoutFloor = player.marketValue < 250_000 ? 40_000 : 180_000;
  const minLoanFeeFloor = player.marketValue < 250_000 ? 15_000 : 80_000;

  state.clubs.forEach((club) => {
    if (club.id === userClub.id) return;
    if (club.squad.length >= MAX_SQUAD_SIZE) return;
    if (club.finances.balance < player.wage * 2) return;
    if (
      !evaluatePlayerClubWillingness(club, player, {
        dealType: 'LOAN',
        sellerClub: userClub,
      }).willing
    ) {
      return;
    }

    const diag = diagnoseClubSquadNeeds(club);
    const roleAvg = diag.roleStats[player.detailedRole]?.starterAvgOvr || 66;
    const ovrDiff = player.overall - roleAvg;

    // Prefer clubs where player is at least close to rotation or better (-2 to +9 OVR)
    if (ovrDiff < -3 || ovrDiff > 11) return;

    let fitScore = 50 + Math.max(-6, Math.min(18, ovrDiff * 3));
    if (diag.weakestRole === player.detailedRole) fitScore += 22;
    if (diag.shortageRoles.includes(player.detailedRole)) fitScore += 15;
    if (club.division !== 'A' && player.age <= 22) fitScore += 8;
    if ((userClub.rivals || []).includes(club.id)) fitScore -= 25;

    const minutesChance: SmartLoanDestination['minutesChance'] =
      ovrDiff >= 2
        ? 'Titular Imediato'
        : ovrDiff >= 0 || diag.weakestRole === player.detailedRole
        ? 'Rotação Forte'
        : 'Compõe Elenco';

    const canCoverFull = club.finances.balance >= player.wage * 10;
    const suggestedWageSharePct =
      minutesChance === 'Titular Imediato' && canCoverFull
        ? 100
        : ovrDiff >= 0
        ? 80
        : 70;

    const suggestedLoanFee =
      minutesChance === 'Titular Imediato' && club.finances.balance >= player.marketValue * 0.45
        ? Math.max(minLoanFeeFloor, Math.round((player.marketValue * 0.05) / step) * step)
        : 0;

    const suggestedBuyOptionFee = Math.max(
      minBuyoutFloor,
      Math.round((player.marketValue * 1.15) / step) * step
    );

    const fitReason =
      diag.weakestRole === player.detailedRole
        ? `Setor carente em ${player.detailedRole} (média ${roleAvg} OVR)`
        : minutesChance === 'Titular Imediato'
        ? `Chega acima da média atual do setor (${roleAvg} OVR)`
        : `Boa opção de rodagem para ${player.detailedRole}`;

    results.push({
      club,
      suggestedWageSharePct,
      suggestedLoanFee,
      suggestedBuyOptionFee,
      minutesChance,
      fitReason,
      fitScore,
    });
  });

  return results.sort((a, b) => b.fitScore - a.fitScore).slice(0, 6);
}
