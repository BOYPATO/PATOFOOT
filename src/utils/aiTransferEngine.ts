import {
  Club,
  DetailedRole,
  Division,
  GameSave,
  InboxMessage,
  MAX_SQUAD_SIZE,
  PendingTransferDeal,
  Player,
  TransferHistoryRecord,
  TransferOffer,
} from '../types/game';
import { formatShortDate } from './calendarUtils';
import { formatCurrency } from './individualAwardsEngine';
import {
  findPendingTransferForPlayer,
  getTransferWindowStatus,
} from './transferWindowEngine';
import { getClubOverdraftLimit } from './financialFairPlayEngine';
import { getClubEconomyProfile } from './clubEconomyScale';
import { evaluatePlayerClubWillingness } from './transferWillingnessEngine';
import {
  getClubSeasonLoanCounts,
  MAX_SEASON_LOANS_OUT,
  resolveClubActiveSeasonYear,
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
  const winStatus = getTransferWindowStatus(state.currentDate);

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
    const sharePct = offer.loanWageSharePct || 75;
    const loanedCopy: Player = {
      ...player,
      isLoan: true,
      loanParentClubId: userClub.id,
      loanCurrentClubId: buyerClub.id,
      loanRoundsRemaining: duration,
      loanWageContributionPct: sharePct,
      loanBuyOptionFee: offer.loanBuyOptionFee || Math.round(player.marketValue * 1.15),
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
    const winNow = getTransferWindowStatus(state.currentDate);
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

/**
 * Motor autônomo de transferências por rodada:
 * 1) Clubes da CPU analisam carências do elenco e compram/vendem/emprestam jogadores entre si e livres;
 * 2) Clubes da CPU enviam propostas oficiais de compra/empréstimo por jogadores do usuário;
 * 3) Se `aiDirectorAutoNegotiate` estiver ativo, negocia vendas automáticas vantajosas de atletas listados.
 */
export function processRoundAiTransferMarket(
  state: GameSave,
  matchDate: string
): GameSave {
  let clubs = [...state.clubs];
  let freeAgents = [...(state.transferMarket || [])];
  let offers = [...(state.transferOffers || [])];
  const newDeals: TransferHistoryRecord[] = [];
  const newInbox: InboxMessage[] = [];

  // -------------------------------------------------------------------------
  // PARTE 1: Movimentações imediatas entre clubes da CPU (somente Jan-Fev e Jul-Ago)
  // -------------------------------------------------------------------------
  const marketWindow = getTransferWindowStatus(matchDate);
  const activeDivisions: Division[] = ['A', 'B', 'C', 'D', 'EST', 'SA', 'EU', 'WL'];
  const cpuBuyersPool = clubs.filter(
    (c) =>
      c.id !== state.userClubId &&
      activeDivisions.includes(c.division) &&
      c.squad.length <= MAX_SQUAD_SIZE &&
      c.finances.balance >= 120_000
  );

  const dealsCount = marketWindow.isOpen
    ? Math.random() < 0.72
      ? Math.random() < 0.35
        ? 2
        : 1
      : 0
    : 0;

  for (let d = 0; d < dealsCount && cpuBuyersPool.length > 0; d++) {
    const buyer = cpuBuyersPool[Math.floor(Math.random() * cpuBuyersPool.length)];
    const currentBuyer = clubs.find((c) => c.id === buyer.id);
    if (!currentBuyer) continue;

    const diag = diagnoseClubSquadNeeds(currentBuyer);
    // Avoid positional hoarding: pick the weakest role that isn't already overcrowded (and cap GKs at 3 unless urgent)
    const allRoles: DetailedRole[] = ['GOL', 'ZAG', 'LAT', 'VOL', 'MEI', 'ATA'];
    const nonHoardedRoles = allRoles.filter((r) => {
      const cnt = diag.roleStats[r]?.count || 0;
      if (r === 'GOL') return cnt < 3 || (cnt === 3 && diag.roleStats.GOL.bestOvr < diag.avgStarterOverall - 4);
      return cnt < IDEAL_ROLE_DEPTH[r] + 2;
    });
    const targetRole = nonHoardedRoles.includes(diag.weakestRole)
      ? diag.weakestRole
      : nonHoardedRoles.sort(
          (a, b) => (diag.roleStats[a]?.starterAvgOvr || 65) - (diag.roleStats[b]?.starterAvgOvr || 65)
        )[0] || diag.weakestRole;
    const minNeededOvr = (diag.roleStats[targetRole]?.starterAvgOvr || diag.weakestRoleAvgOvr) + 1;
    const maxBudget = diag.safeTransferBudget;

    // First check Free Agents for a smart zero-fee pickup
    const freeMatch = freeAgents
      .filter(
        (p) =>
          p.detailedRole === targetRole &&
          p.overall >= minNeededOvr - 1 &&
          p.overall <= diag.avgStarterOverall + 6 &&
          currentBuyer.finances.balance >= p.wage * 6 &&
          evaluatePlayerClubWillingness(currentBuyer, p, { dealType: 'FREE_AGENT' }).willing
      )
      .sort((a, b) => b.overall - a.overall)[0];

    if (freeMatch && Math.random() < 0.35) {
      freeAgents = freeAgents.filter((p) => p.id !== freeMatch.id);
      clubs = clubs.map((c) =>
        c.id === currentBuyer.id
          ? {
              ...c,
              squad: assignBestSquadRoleOnArrival(c.squad, freeMatch),
            }
          : c
      );

      newDeals.push({
        id: `tr_cpu_free_${Date.now()}_${freeMatch.id}`,
        playerId: freeMatch.id,
        playerName: freeMatch.name,
        playerRole: freeMatch.detailedRole,
        playerOverall: freeMatch.overall,
        playerAge: freeMatch.age,
        fromClubName: 'Sem Clube (Livre)',
        toClubId: currentBuyer.id,
        toClubName: currentBuyer.name,
        fee: 0,
        wage: freeMatch.wage,
        date: matchDate,
        round: state.currentRound,
        seasonYear: resolveClubActiveSeasonYear(currentBuyer, state),
        category: 'FREE_AGENT',
        direction: 'CPU',
        notes: `IA de Mercado · Reforço para ${targetRole}`,
      });
      continue;
    }

    // Otherwise scan CPU seller clubs with healthy squad depth
    const sellerMatches: Array<{ seller: Club; player: Player; fee: number; isLoan: boolean }> =
      [];

    for (const seller of clubs) {
      if (
        seller.id === state.userClubId ||
        seller.id === currentBuyer.id ||
        seller.squad.length <= 20
      ) {
        continue;
      }

      const sellerGkCount = seller.squad.filter((sp) => sp.position === 'GK').length;
      for (const p of seller.squad) {
        if (p.isLoan || p.detailedRole !== targetRole) continue;
        // Never strip a seller club below 2 goalkeepers
        if (p.position === 'GK' && sellerGkCount <= 2) continue;
        // Prefer reserves or non-essential starters from smaller clubs
        if (p.isStarter && seller.reputation >= currentBuyer.reputation) continue;
        if (p.overall < minNeededOvr || p.overall > diag.avgStarterOverall + 5) continue;

        const feeStep = p.marketValue < 250_000 ? 10_000 : 50_000;
        const fee = Math.round((p.marketValue * (0.94 + Math.random() * 0.16)) / feeStep) * feeStep;
        if (
          fee <= maxBudget &&
          evaluatePlayerClubWillingness(currentBuyer, p, {
            dealType: 'PURCHASE',
            sellerClub: seller,
          }).willing
        ) {
          sellerMatches.push({ seller, player: p, fee, isLoan: false });
        } else if (
          p.age <= 23 &&
          !p.isStarter &&
          currentBuyer.division !== 'A' &&
          seller.division === 'A' &&
          evaluatePlayerClubWillingness(currentBuyer, p, {
            dealType: 'LOAN',
            sellerClub: seller,
          }).willing
        ) {
          sellerMatches.push({ seller, player: p, fee: 0, isLoan: true });
        }
      }
    }

    if (sellerMatches.length > 0) {
      sellerMatches.sort((a, b) => b.player.overall - a.player.overall);
      const chosen = sellerMatches[0];
      const { seller, player: tradedPlayer, fee, isLoan } = chosen;

      const arrivingPlayer: Player = isLoan
        ? {
            ...tradedPlayer,
            isLoan: true,
            loanParentClubId: seller.id,
            loanCurrentClubId: currentBuyer.id,
            loanRoundsRemaining: 19,
            loanWageContributionPct: 70,
            loanBuyOptionFee: Math.round(tradedPlayer.marketValue * 1.15),
          }
        : {
            ...tradedPlayer,
            contractYears: 3,
          };

      clubs = clubs.map((c) => {
        if (c.id === seller.id) {
          let remainingSquad = c.squad.filter((p) => p.id !== tradedPlayer.id);
          // If a starter was sold, promote the best reserve so seller always has 11 starters (1 GK)
          if (tradedPlayer.isStarter && remainingSquad.filter((p) => p.isStarter).length < 11) {
            const replacement =
              remainingSquad
                .filter((p) => !p.isStarter && p.position === tradedPlayer.position)
                .sort((a, b) => b.overall - a.overall)[0] ||
              remainingSquad
                .filter((p) => !p.isStarter && (tradedPlayer.position === 'GK' ? p.position === 'GK' : p.position !== 'GK'))
                .sort((a, b) => b.overall - a.overall)[0];
            if (replacement) {
              remainingSquad = remainingSquad.map((p) =>
                p.id === replacement.id
                  ? { ...p, isStarter: true, isSubstitute: false, pitchSlot: tradedPlayer.pitchSlot }
                  : p
              );
            }
          }
          return {
            ...c,
            finances: {
              ...c.finances,
              balance: c.finances.balance + fee,
              totalIncomeSeason: c.finances.totalIncomeSeason + fee,
            },
            squad: remainingSquad,
          };
        }
        if (c.id === currentBuyer.id) {
          return {
            ...c,
            finances: {
              ...c.finances,
              balance: Math.max(0, c.finances.balance - fee),
              totalExpensesSeason: c.finances.totalExpensesSeason + fee,
            },
            squad: assignBestSquadRoleOnArrival(c.squad, arrivingPlayer),
          };
        }
        return c;
      });

      newDeals.push({
        id: `tr_cpu_ai_${Date.now()}_${d}_${tradedPlayer.id}`,
        playerId: tradedPlayer.id,
        playerName: tradedPlayer.name,
        playerRole: tradedPlayer.detailedRole,
        playerOverall: tradedPlayer.overall,
        playerAge: tradedPlayer.age,
        fromClubId: seller.id,
        fromClubName: seller.name,
        toClubId: currentBuyer.id,
        toClubName: currentBuyer.name,
        fee,
        wage: tradedPlayer.wage,
        date: matchDate,
        round: state.currentRound,
        seasonYear: resolveClubActiveSeasonYear(currentBuyer, state),
        category: isLoan ? 'LOAN_IN' : 'PURCHASE',
        direction: 'CPU',
        notes: isLoan
          ? `IA de Mercado · Empréstimo para ${targetRole}`
          : `IA de Mercado · Suprir carência em ${targetRole}`,
      });
    }
  }

  // -------------------------------------------------------------------------
  // PARTE 2: Clubes da CPU enviam propostas por atletas do clube do usuário
  // -------------------------------------------------------------------------
  const userClub = clubs.find((c) => c.id === state.userClubId);
  const pendingUserOffers = offers.filter((o) => o.status === 'PENDING');

  if (userClub && userClub.squad.length >= 18 && pendingUserOffers.length < 3) {
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
        p.matches <= 4 &&
        p.overall >= 62 &&
        p.injuryWeeks === 0 &&
        !findPendingTransferForPlayer(state.pendingTransfers, p.id)
    );
    const standoutTargets = userClub.squad.filter(
      (p) =>
        !p.isLoan &&
        !p.isListedForSale &&
        !findPendingTransferForPlayer(state.pendingTransfers, p.id) &&
        (p.goals >= 4 || p.ratingAverage >= 7.25 || (p.age <= 22 && p.overall >= 74))
    );

    let targetPlayer: Player | undefined;
    let isListedBid = false;
    let isProactiveLoanBid = false;

    if (listedPlayers.length > 0 && Math.random() < 0.52) {
      targetPlayer = listedPlayers[Math.floor(Math.random() * listedPlayers.length)];
      isListedBid = true;
    } else if (lowMinuteU23Candidates.length > 0 && Math.random() < 0.34) {
      targetPlayer =
        lowMinuteU23Candidates[Math.floor(Math.random() * lowMinuteU23Candidates.length)];
      isProactiveLoanBid = true;
    } else if (standoutTargets.length > 0 && Math.random() < 0.24) {
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
        : clubs
            .filter((c) => {
              if (c.id === userClub.id) return false;
              if (
                !evaluatePlayerClubWillingness(c, targetPlayer!, {
                  dealType: wantLoanOnly ? 'LOAN' : 'PURCHASE',
                  sellerClub: userClub,
                }).willing
              ) {
                return false;
              }
              if (wantLoanOnly) return c.finances.balance >= targetPlayer!.wage * 4;
              return c.finances.balance >= targetPlayer!.marketValue * 0.95;
            })
            .map((c) => {
              const diag = diagnoseClubSquadNeeds(c);
              const roleAvg = diag.roleStats[targetPlayer!.detailedRole]?.starterAvgOvr || 68;
              const fit =
                (diag.weakestRole === targetPlayer!.detailedRole ? 25 : 0) +
                (targetPlayer!.overall - roleAvg) * 5;
              return { club: c, fit };
            })
            .filter((x) => x.fit >= -5)
            .sort((a, b) => b.fit - a.fit);

      const chosenBuyer = interestedClubs[0]?.club;
      if (chosenBuyer) {
        const basePrice = targetPlayer.askingPrice || targetPlayer.marketValue;
        const mult = isListedBid ? 0.96 + Math.random() * 0.12 : 1.05 + Math.random() * 0.18;
        const rawFee = wantLoanOnly
          ? 0
          : Math.round((basePrice * mult) / 50_000) * 50_000;
        const finalOfferFee = wantLoanOnly
          ? 0
          : Math.min(rawFee, Math.round(chosenBuyer.finances.balance * 0.72));

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
          offeredWage: Math.round((targetPlayer.wage * 1.15) / 1000) * 1000,
          status: 'PENDING',
          date: formatShortDate(matchDate),
          offerType: wantLoanOnly ? 'LOAN' : 'PERMANENT',
          loanWageSharePct: wantLoanOnly ? 80 : undefined,
          loanDurationRounds: wantLoanOnly ? 19 : undefined,
          loanBuyOptionFee: wantLoanOnly
            ? Math.round(targetPlayer.marketValue * 1.15)
            : undefined,
          reason: isListedBid
            ? `Interesse oficial após listagem no mercado (${targetPlayer.detailedRole})`
            : `Destaque na temporada chamou atenção dos olheiros do ${chosenBuyer.shortName}`,
          aiRecommendedPrice: Math.round((targetPlayer.marketValue * 1.1) / 50_000) * 50_000,
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
            Math.round((finalOfferFee * 1.08) / 50_000) * 50_000,
            Math.round(chosenBuyer.finances.balance * 0.8)
          );
          const tempStateWithOffer: GameSave = {
            ...state,
            clubs,
            transferMarket: freeAgents,
            transferOffers: [newOffer, ...offers],
            transferHistory: [...newDeals, ...(state.transferHistory || [])],
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
              ? `O ${chosenBuyer.name} enviou proposta formal para ter ${targetPlayer.name} (${targetPlayer.detailedRole}, OVR ${targetPlayer.overall}) por empréstimo de 19 rodadas pagando 80% do salário. Abra o Mercado da Bola > Central IA & Propostas para responder!`
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
    transferOffers: offers,
    transferHistory: [...newDeals, ...(state.transferHistory || [])],
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
