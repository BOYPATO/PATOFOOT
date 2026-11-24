import {
  Club,
  FormationType,
  GameSave,
  InboxMessage,
  MAX_SQUAD_SIZE,
  PassingStyle,
  PendingTransferDeal,
  Player,
  RealCoachProfile,
  TacticalMentality,
  TransferHistoryRecord,
} from '../types/game';
import { ensureMinimumSquadDepth, trimSquadToMaxPlayers } from '../data/initialData';
import {
  canClubRegisterNewPlayer,
  findPendingTransferForPlayer,
  getClubProjectedSquadSize,
  getTransferWindowStatus,
} from './transferWindowEngine';
import { resolvePlayerNationality } from './nationalityUtils';
import { getCachedAiNationality } from '../services/nationalityAiService';
import { isSplitCalendarClub } from './worldLeaguesEngine';
import { recordFinanceLedgerMutation } from './financialFairPlayEngine';
import { getClubEconomyProfile } from './clubEconomyScale';
import { recalculatePlayerEconomics } from './clubRatingsEngine';
import { evaluatePlayerClubWillingness } from './transferWillingnessEngine';

function formatBRL(val: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  }).format(val);
}

function hashPlayerId(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i += 1) {
    hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  }
  return hash;
}

export function computeDefaultReleaseClause(player: Player, club?: Club): number {
  const baseValue = Math.max(40_000, player.marketValue || 150_000);
  let mult = 2.0;

  if (player.age <= 21) {
    mult = player.overall >= 74 ? 2.8 : 2.45;
  } else if (player.age <= 26) {
    mult = player.overall >= 78 ? 2.5 : 2.15;
  } else if (player.age <= 31) {
    mult = 1.9;
  } else {
    mult = 1.5;
  }

  const step = baseValue < 250_000 ? 25_000 : 100_000;
  const minFloor = club
    ? getClubEconomyProfile(club).clauseFloor
    : baseValue < 120_000
    ? 80_000
    : baseValue < 250_000
    ? 150_000
    : 500_000;
  const raw = Math.round((baseValue * mult) / step) * step;
  return Math.max(minFloor, raw);
}

export function ensurePlayerContractFields(
  player: Player,
  clubCountry?: string
): Player {
  const resolvedNationality =
    getCachedAiNationality(player.name) ||
    resolvePlayerNationality(player, clubCountry);

  if (player.releaseClause && player.releaseClause > 0) {
    return {
      ...player,
      nationality: resolvedNationality,
      contractYears: Math.max(1, player.contractYears || 1),
    };
  }

  // First-time initialization: assign realistic contract durations (1 to 4 years) and release clause
  const h = hashPlayerId(player.id);
  let contractYears = player.contractYears || 2;

  if (contractYears === 2 && !player.lastRenewalSeason && !player.isLoan) {
    if (player.age >= 35) {
      contractYears = h % 3 === 0 ? 2 : 1;
    } else if (player.age >= 32) {
      contractYears = h % 2 === 0 ? 1 : 2;
    } else {
      const bucket = h % 10;
      if (bucket <= 1) contractYears = 1; // 20% in final year (Bosman eligible)
      else if (bucket <= 5) contractYears = 2; // 40%
      else if (bucket <= 8) contractYears = 3; // 30%
      else contractYears = 4; // 10%
    }
  }

  const retiringAtSeasonEnd =
    player.retiringAtSeasonEnd !== undefined
      ? player.retiringAtSeasonEnd
      : player.age >= 37 && h % 2 === 0;

  return {
    ...player,
    nationality: resolvedNationality,
    contractYears: Math.max(1, contractYears),
    releaseClause: computeDefaultReleaseClause(player),
    retiringAtSeasonEnd,
  };
}

export interface RenewalExpectations {
  canRenew: boolean;
  blockReason?: string;
  desiredWage: number;
  minAcceptableWage: number;
  recommendedYears: number;
  maxAllowedYears: number;
  suggestedReleaseClause: number;
  minReleaseClause: number;
  maxReleaseClause: number;
}

export function getPlayerRenewalExpectations(player: Player, club: Club): RenewalExpectations {
  const profile = getClubEconomyProfile(club);

  if (player.isLoan) {
    return {
      canRenew: false,
      blockReason: 'Jogador emprestado ao clube. Utilize a opção de compra para contratá-lo em definitivo.',
      desiredWage: player.wage,
      minAcceptableWage: player.wage,
      recommendedYears: 2,
      maxAllowedYears: 3,
      suggestedReleaseClause: computeDefaultReleaseClause(player, club),
      minReleaseClause: player.marketValue,
      maxReleaseClause: player.marketValue * 3,
    };
  }

  if (player.retiringAtSeasonEnd) {
    return {
      canRenew: false,
      blockReason: 'O veterano já anunciou oficialmente que pendurará as chuteiras ao final desta temporada.',
      desiredWage: player.wage,
      minAcceptableWage: player.wage,
      recommendedYears: 1,
      maxAllowedYears: 1,
      suggestedReleaseClause: player.releaseClause || computeDefaultReleaseClause(player, club),
      minReleaseClause: player.marketValue,
      maxReleaseClause: player.marketValue * 2,
    };
  }

  if (player.preContractClubId) {
    return {
      canRenew: false,
      blockReason: `Já assinou pré-contrato com o ${player.preContractClubName || 'outro clube'} para a próxima temporada.`,
      desiredWage: player.wage,
      minAcceptableWage: player.wage,
      recommendedYears: 2,
      maxAllowedYears: 4,
      suggestedReleaseClause: player.releaseClause || computeDefaultReleaseClause(player, club),
      minReleaseClause: player.marketValue,
      maxReleaseClause: player.marketValue * 3,
    };
  }

  // Fair market wage benchmark calibrated to the club's economy tier
  const marketFairWage = recalculatePlayerEconomics(
    player.overall,
    player.age,
    club.division,
    club
  ).wage;
  const baseReferenceWage = Math.max(player.wage, marketFairWage);

  let raiseFactor = 1.12;
  if (player.age <= 23 && player.overall >= 73) raiseFactor = 1.2;
  else if (player.isStarter) raiseFactor = 1.15;
  else if (player.age >= 34) raiseFactor = 1.02;

  if (player.morale === 'Excelente') raiseFactor -= 0.03;
  if (player.morale === 'Baixa' || player.morale === 'Péssima') raiseFactor += 0.08;

  const wageStep = baseReferenceWage < 6_000 ? 200 : baseReferenceWage < 15_000 ? 500 : 1_000;
  const desiredWage = Math.max(
    profile.playerWageFloor,
    Math.round((baseReferenceWage * raiseFactor) / wageStep) * wageStep
  );
  const minAcceptableWage = Math.max(
    profile.playerWageFloor,
    Math.round((desiredWage * 0.92) / wageStep) * wageStep
  );

  const maxAllowedYears = player.age >= 35 ? 2 : player.age >= 32 ? 3 : 5;
  const recommendedYears =
    player.age >= 34 ? 1 : player.age >= 30 ? 2 : player.age <= 23 ? 4 : 3;

  const clauseStep = player.marketValue < 250_000 ? 25_000 : 100_000;
  const suggestedReleaseClause = computeDefaultReleaseClause(player, club);
  const minReleaseClause = Math.max(
    profile.clauseMinFloor,
    Math.round((player.marketValue * 1.1) / clauseStep) * clauseStep
  );
  const maxReleaseClause = Math.max(
    minReleaseClause + (player.marketValue < 250_000 ? 250_000 : 1_000_000),
    Math.round((player.marketValue * 4.0) / clauseStep) * clauseStep
  );

  return {
    canRenew: true,
    desiredWage,
    minAcceptableWage,
    recommendedYears,
    maxAllowedYears,
    suggestedReleaseClause,
    minReleaseClause,
    maxReleaseClause,
  };
}

export function negotiateContractRenewal(
  state: GameSave,
  playerId: string,
  proposedYears: number,
  proposedWage: number,
  proposedReleaseClause: number,
  signingBonus: number
): {
  accepted: boolean;
  feedbackText: string;
  updatedState: GameSave;
} {
  const userClub = state.clubs.find((c) => c.id === state.userClubId);
  if (!userClub) {
    return { accepted: false, feedbackText: 'Clube não encontrado.', updatedState: state };
  }

  const player = userClub.squad.find((p) => p.id === playerId);
  if (!player) {
    return { accepted: false, feedbackText: 'Atleta não encontrado no elenco.', updatedState: state };
  }

  const exp = getPlayerRenewalExpectations(player, userClub);
  if (!exp.canRenew) {
    return {
      accepted: false,
      feedbackText: exp.blockReason || 'Não é possível renovar este vínculo.',
      updatedState: state,
    };
  }

  if (signingBonus > userClub.finances.balance) {
    return {
      accepted: false,
      feedbackText: `Saldo insuficiente em caixa para pagar as luvas de ${formatBRL(signingBonus)}.`,
      updatedState: state,
    };
  }

  if (proposedYears > exp.maxAllowedYears || proposedYears < 1) {
    return {
      accepted: false,
      feedbackText: `O empresário de ${player.name} aceita vínculo máximo de ${exp.maxAllowedYears} ano(s) devido à idade (${player.age} anos).`,
      updatedState: state,
    };
  }

  // If manager sets a very high release clause (> 2.6x market value), agent demands higher wage compensation
  const clauseRatio = proposedReleaseClause / Math.max(250000, player.marketValue);
  const clauseWageMultiplier = clauseRatio > 2.7 ? 1 + (clauseRatio - 2.7) * 0.14 : 1;

  const requiredWageWithClause = Math.round((exp.minAcceptableWage * clauseWageMultiplier) / 1000) * 1000;
  // Signing bonus amortizes across contract months (up to 12% flexibility)
  const monthlyBonusEquivalent = Math.round(signingBonus / Math.max(12, proposedYears * 12));
  const effectiveMonthlyOffer = proposedWage + monthlyBonusEquivalent;

  if (effectiveMonthlyOffer < requiredWageWithClause) {
    const shortfallMsg =
      clauseRatio > 2.7
        ? `Para aceitar uma multa rescisória alta de ${formatBRL(proposedReleaseClause)}, o empresário exige salário de pelo menos ${formatBRL(requiredWageWithClause)}/mês (ou luvas maiores).`
        : `Proposta recusada! O estafe de ${player.name} pede ao menos ${formatBRL(requiredWageWithClause)}/mês para renovar.`;

    return {
      accepted: false,
      feedbackText: shortfallMsg,
      updatedState: state,
    };
  }

  const updatedPlayer: Player = {
    ...player,
    contractYears: proposedYears,
    wage: proposedWage,
    releaseClause: proposedReleaseClause,
    morale: 'Excelente',
    lastRenewalSeason: state.currentSeasonYear,
    lastRenewalRound: state.currentRound,
  };

  const updatedUserClub: Club = {
    ...userClub,
    finances:
      signingBonus > 0
        ? recordFinanceLedgerMutation(userClub.finances, {
            date: state.currentDate,
            category: 'WAGES_SQUAD',
            type: 'EXPENSE',
            amount: signingBonus,
            description: `Luvas de renovação: ${player.name} (+${proposedYears} anos)`,
            applyToBalance: true,
          })
        : userClub.finances,
    squad: userClub.squad.map((p) => (p.id === playerId ? updatedPlayer : p)),
  };

  const inboxMsg: InboxMessage = {
    id: `renew_${Date.now()}_${player.id}`,
    title: `✍️ Contrato Renovado: ${player.name} até ${state.currentSeasonYear + proposedYears}`,
    message: `${player.name} (${player.detailedRole}, OVR ${player.overall}) assinou renovação contratual por ${proposedYears} temporada(s) com o ${userClub.name}. Novo salário: ${formatBRL(proposedWage)}/mês · Multa rescisória fixada em ${formatBRL(proposedReleaseClause)}${signingBonus > 0 ? ` · Luvas pagas: ${formatBRL(signingBonus)}` : ''}.`,
    date: state.currentDate,
    round: state.currentRound,
    read: false,
    type: 'BOARD',
  };

  const updatedState: GameSave = {
    ...state,
    clubs: state.clubs.map((c) => (c.id === userClub.id ? updatedUserClub : c)),
    inbox: [inboxMsg, ...state.inbox],
  };

  return {
    accepted: true,
    feedbackText: `Acordo fechado! ${player.name} renovou por ${proposedYears} ano(s) com multa rescisória de ${formatBRL(proposedReleaseClause)}.`,
    updatedState,
  };
}

export function signBosmanPreContract(
  state: GameSave,
  targetPlayerId: string,
  sellerClubId: string,
  offeredWage: number,
  contractYears: number,
  signingBonus: number
): {
  accepted: boolean;
  feedbackText: string;
  updatedState: GameSave;
} {
  const userClub = state.clubs.find((c) => c.id === state.userClubId);
  const sellerClub = state.clubs.find((c) => c.id === sellerClubId);
  if (!userClub || !sellerClub) {
    return { accepted: false, feedbackText: 'Clube inválido.', updatedState: state };
  }

  const player = sellerClub.squad.find((p) => p.id === targetPlayerId);
  if (!player) {
    return { accepted: false, feedbackText: 'Jogador não encontrado.', updatedState: state };
  }

  // Count Bosman pre-contracts already signed for next season vs expiring/retiring user players
  const existingPreContractsIn = state.clubs.reduce(
    (sum, c) =>
      sum + c.squad.filter((p) => p.preContractClubId === userClub.id).length,
    0
  );
  const departingAtSeasonEnd = userClub.squad.filter(
    (p) =>
      p.isLoan ||
      p.retiringAtSeasonEnd ||
      p.contractYears <= 1 ||
      Boolean(p.preContractClubId)
  ).length;
  const projectedNextSeasonSquad =
    getClubProjectedSquadSize(userClub, state.pendingTransfers) +
    existingPreContractsIn -
    departingAtSeasonEnd;

  if (projectedNextSeasonSquad >= MAX_SQUAD_SIZE) {
    return {
      accepted: false,
      feedbackText: `Limite máximo de ${MAX_SQUAD_SIZE} jogadores no elenco atingido (${userClub.squad.length}/${MAX_SQUAD_SIZE}). Venda ou empreste um atleta antes de assinar novos pré-contratos.`,
      updatedState: state,
    };
  }

  if (player.contractYears > 1) {
    return {
      accepted: false,
      feedbackText: 'Apenas atletas no último ano de contrato podem assinar Pré-Contrato (Lei Bosman).',
      updatedState: state,
    };
  }

  if (player.preContractClubId) {
    return {
      accepted: false,
      feedbackText: `${player.name} já possui pré-contrato assinado com o ${player.preContractClubName}.`,
      updatedState: state,
    };
  }

  if (player.retiringAtSeasonEnd) {
    return {
      accepted: false,
      feedbackText: `${player.name} anunciou aposentadoria ao término desta temporada.`,
      updatedState: state,
    };
  }

  const willingness = evaluatePlayerClubWillingness(userClub, player, {
    dealType: 'PRE_CONTRACT',
    sellerClub,
  });
  if (!willingness.willing) {
    return {
      accepted: false,
      feedbackText:
        willingness.reason ||
        `${player.name} recusou pré-contrato por considerar o clube abaixo do seu nível competitivo.`,
      updatedState: state,
    };
  }

  if (signingBonus > userClub.finances.balance) {
    return {
      accepted: false,
      feedbackText: `Saldo insuficiente para pagar as luvas de assinatura (${formatBRL(signingBonus)}).`,
      updatedState: state,
    };
  }

  // Reputation delta: moving to a lower reputation club demands higher wage
  const repDiff = sellerClub.reputation - userClub.reputation;
  const repMultiplier = repDiff > 0 ? 1 + repDiff * 0.12 : 1.05;
  const userProfile = getClubEconomyProfile(userClub);
  const bosmanStep = player.wage < 6_000 ? 200 : player.wage < 15_000 ? 500 : 1000;
  const minRequiredWage = Math.max(
    userProfile.playerWageFloor,
    Math.round((player.wage * repMultiplier) / bosmanStep) * bosmanStep
  );

  const bonusMonthlyEquiv = Math.round(signingBonus / Math.max(12, contractYears * 12));
  if (offeredWage + bonusMonthlyEquiv < minRequiredWage) {
    return {
      accepted: false,
      feedbackText: `${player.name} recusou a proposta! Como chegará livre de custos de passe, o estafe pede pelo menos ${formatBRL(minRequiredWage)}/mês (ou luvas maiores).`,
      updatedState: state,
    };
  }

  const updatedPlayer: Player = {
    ...player,
    preContractClubId: userClub.id,
    preContractClubName: userClub.name,
    preContractWage: offeredWage,
    preContractYears: contractYears,
  };

  const updatedClubs = state.clubs.map((c) => {
    if (c.id === userClub.id && signingBonus > 0) {
      return {
        ...c,
        finances: recordFinanceLedgerMutation(c.finances, {
          date: state.currentDate,
          category: 'TRANSFERS_OUT',
          type: 'EXPENSE',
          amount: signingBonus,
          description: `Luvas de Pré-Contrato (Bosman): ${player.name}`,
          applyToBalance: true,
        }),
      };
    }
    if (c.id === sellerClub.id) {
      return {
        ...c,
        squad: c.squad.map((p) => (p.id === player.id ? updatedPlayer : p)),
      };
    }
    return c;
  });

  const isSplitCal = isSplitCalendarClub(userClub);
  const nextSeasonYear = (isSplitCal ? (state.europeSeasonYear ?? state.currentSeasonYear) : (state.saSeasonYear ?? state.currentSeasonYear)) + 1;
  const arrivalDisplay = isSplitCal
    ? userClub.worldLeagueId === 'rus_premier'
      ? `24/07/${nextSeasonYear}`
      : `01/08/${nextSeasonYear}`
    : `15/01/${nextSeasonYear}`;
  const arrivalSeasonLabel = isSplitCal
    ? `${nextSeasonYear}/${String(nextSeasonYear + 1).slice(-2)}`
    : String(nextSeasonYear);
  const inboxMsg: InboxMessage = {
    id: `bosman_${Date.now()}_${player.id}`,
    title: `📝 Pré-Contrato Assinado: ${player.name} chega em ${arrivalDisplay}!`,
    message: `Negócio de mestre pela Lei Bosman! ${player.name} (${player.detailedRole}, OVR ${player.overall}), atualmente no ${sellerClub.name}, assinou pré-contrato de ${contractYears} anos com o ${userClub.name} sem custos de transferência ao rival. Ele se apresentará oficialmente na abertura da temporada ${arrivalSeasonLabel}!`,
    date: state.currentDate,
    round: state.currentRound,
    read: false,
    type: 'TRANSFER',
  };

  const historyRecord: TransferHistoryRecord = {
    id: `tr_pre_${Date.now()}_${player.id}`,
    playerId: player.id,
    playerName: player.name,
    playerRole: player.detailedRole,
    playerOverall: player.overall,
    playerAge: player.age,
    fromClubId: sellerClub.id,
    fromClubName: sellerClub.name,
    toClubId: userClub.id,
    toClubName: userClub.name,
    fee: signingBonus,
    wage: offeredWage,
    date: state.currentDate,
    round: state.currentRound,
    seasonYear: state.currentSeasonYear,
    category: 'PRE_CONTRACT',
    direction: 'IN',
    notes: `Pré-Contrato (Lei Bosman) · Apresentação em ${arrivalDisplay}`,
  };

  return {
    accepted: true,
    feedbackText: `Pré-contrato assinado! ${player.name} reforçará o ${userClub.name} em ${arrivalDisplay} sem taxa ao ${sellerClub.name}.`,
    updatedState: {
      ...state,
      clubs: updatedClubs,
      inbox: [inboxMsg, ...state.inbox],
      transferHistory: [historyRecord, ...(state.transferHistory || [])],
    },
  };
}

export function triggerReleaseClausePurchase(
  state: GameSave,
  targetPlayerId: string,
  sellerClubId: string,
  offeredWage: number,
  contractYears: number = 4
): {
  accepted: boolean;
  feedbackText: string;
  updatedState: GameSave;
} {
  const safeYears = Math.max(1, Math.min(5, Math.round(contractYears || 4)));
  const userClub = state.clubs.find((c) => c.id === state.userClubId);
  const sellerClub = state.clubs.find((c) => c.id === sellerClubId);
  if (!userClub || !sellerClub) {
    return { accepted: false, feedbackText: 'Clube inválido.', updatedState: state };
  }

  const player = sellerClub.squad.find((p) => p.id === targetPlayerId);
  if (!player) {
    return { accepted: false, feedbackText: 'Jogador não encontrado.', updatedState: state };
  }

  if (!canClubRegisterNewPlayer(userClub, state.pendingTransfers, false)) {
    return {
      accepted: false,
      feedbackText: `Seu elenco atingiu o limite máximo de ${MAX_SQUAD_SIZE} jogadores (${userClub.squad.length}/${MAX_SQUAD_SIZE}). Venda ou empreste um atleta antes de acionar multas rescisórias.`,
      updatedState: state,
    };
  }

  if (findPendingTransferForPlayer(state.pendingTransfers, player.id)) {
    return {
      accepted: false,
      feedbackText: `${player.name} já possui transferência acertada aguardando a abertura da janela.`,
      updatedState: state,
    };
  }

  const willingness = evaluatePlayerClubWillingness(userClub, player, {
    dealType: 'RELEASE_CLAUSE',
    sellerClub,
  });
  if (!willingness.willing) {
    return {
      accepted: false,
      feedbackText:
        willingness.reason ||
        `${player.name} recusou a transferência via multa rescisória para o ${userClub.shortName}.`,
      updatedState: state,
    };
  }

  const clauseAmount = player.releaseClause || computeDefaultReleaseClause(player, sellerClub);
  if (userClub.finances.balance < clauseAmount) {
    return {
      accepted: false,
      feedbackText: `Saldo insuficiente! A multa rescisória integral é de ${formatBRL(clauseAmount)} e o caixa atual é de ${formatBRL(userClub.finances.balance)}.`,
      updatedState: state,
    };
  }

  const wageStep = player.wage < 6_000 ? 200 : player.wage < 15_000 ? 500 : 1000;
  const minWage = Math.round((player.wage * 1.05) / wageStep) * wageStep;
  if (offeredWage < minWage) {
    return {
      accepted: false,
      feedbackText: `Multa coberta, mas ${player.name} pede ao menos ${formatBRL(minWage)}/mês de salário para assinar.`,
      updatedState: state,
    };
  }

  if (player.age >= 35 && safeYears > 3) {
    return {
      accepted: false,
      feedbackText: `Por ter ${player.age} anos, o estafe de ${player.name} aceita contrato máximo de até 3 anos.`,
      updatedState: state,
    };
  }

  const windowStatus = getTransferWindowStatus(state.currentDate);
  const yearsText = `${safeYears} ${safeYears === 1 ? 'ano' : 'anos'}`;

  // If Transfer Window is CLOSED (Mar-Jun or Sep-Dec): pay clause now, register player when window opens!
  if (!windowStatus.isOpen) {
    const updatedClubsClosed = state.clubs.map((c) => {
      if (c.id === userClub.id) {
        return {
          ...c,
          finances: recordFinanceLedgerMutation(c.finances, {
            date: state.currentDate,
            category: 'TRANSFERS_OUT',
            type: 'EXPENSE',
            amount: clauseAmount,
            description: `Multa rescisória (agendada): ${player.name} (${sellerClub.shortName})`,
            applyToBalance: true,
          }),
        };
      }
      if (c.id === sellerClub.id) {
        return {
          ...c,
          finances: {
            ...c.finances,
            balance: c.finances.balance + clauseAmount,
            totalIncomeSeason: c.finances.totalIncomeSeason + clauseAmount,
          },
        };
      }
      return c;
    });

    const pendingDeal: PendingTransferDeal = {
      id: `ptr_clause_${Date.now()}_${player.id}`,
      dealKind: 'RELEASE_CLAUSE',
      player: { ...player },
      playerId: player.id,
      playerName: player.name,
      playerRole: player.detailedRole,
      playerOverall: player.overall,
      playerAge: player.age,
      fromClubId: sellerClub.id,
      fromClubName: sellerClub.name,
      toClubId: userClub.id,
      toClubName: userClub.name,
      fee: clauseAmount,
      offeredWage,
      offeredContractYears: safeYears,
      agreedDate: state.currentDate,
      agreedRound: state.currentRound,
      arrivalDate: windowStatus.nextOpenDate,
      arrivalDisplayDate: windowStatus.nextOpenDisplay,
      arrivalWindowLabel: windowStatus.nextWindowLabel,
    };

    const inboxMsgClosed: InboxMessage = {
      id: `clause_pending_${Date.now()}_${player.id}`,
      title: `⚡ Multa Depositada: ${player.name} chega em ${windowStatus.nextOpenDisplay}!`,
      message: `O ${userClub.name} pagou à vista a multa rescisória (${formatBRL(clauseAmount)}) de ${player.name} (${player.detailedRole}, OVR ${player.overall}) junto ao ${sellerClub.name}, firmando vínculo de ${yearsText}. Como a Janela de Transferências está fechada, o reforço será integrado automaticamente na abertura da janela em ${windowStatus.nextOpenDisplay}!`,
      date: state.currentDate,
      round: state.currentRound,
      read: false,
      type: 'TRANSFER',
    };

    const historyRecordClosed: TransferHistoryRecord = {
      id: `tr_clause_${Date.now()}_${player.id}`,
      playerId: player.id,
      playerName: player.name,
      playerRole: player.detailedRole,
      playerOverall: player.overall,
      playerAge: player.age,
      fromClubId: sellerClub.id,
      fromClubName: sellerClub.name,
      toClubId: userClub.id,
      toClubName: userClub.name,
      fee: clauseAmount,
      wage: offeredWage,
      date: state.currentDate,
      round: state.currentRound,
      seasonYear: state.currentSeasonYear,
      category: 'RELEASE_CLAUSE',
      direction: 'IN',
      notes: `Multa paga · Contrato de ${yearsText} · Chega em ${windowStatus.nextOpenDisplay}`,
    };

    return {
      accepted: true,
      feedbackText: `Multa paga e contrato de ${yearsText} assinado! Como a janela está fechada, ${player.name} se apresentará ao ${userClub.name} em ${windowStatus.nextOpenDisplay}!`,
      updatedState: {
        ...state,
        clubs: updatedClubsClosed,
        pendingTransfers: [pendingDeal, ...(state.pendingTransfers || [])],
        inbox: [inboxMsgClosed, ...state.inbox],
        transferHistory: [historyRecordClosed, ...(state.transferHistory || [])],
      },
    };
  }

  const newSquadNumber = Math.max(...userClub.squad.map((p) => p.squadNumber), 20) + 1;
  const signedPlayer: Player = {
    ...player,
    wage: offeredWage,
    contractYears: safeYears,
    releaseClause: Math.round((clauseAmount * 1.35) / 100000) * 100000,
    preContractClubId: undefined,
    preContractClubName: undefined,
    preContractWage: undefined,
    preContractYears: undefined,
    isStarter: false,
    isSubstitute: true,
    isListedForSale: false,
    isListedForLoan: false,
    squadNumber: newSquadNumber,
  };

  const updatedClubs = state.clubs.map((c) => {
    if (c.id === userClub.id) {
      return {
        ...c,
        finances: recordFinanceLedgerMutation(c.finances, {
          date: state.currentDate,
          category: 'TRANSFERS_OUT',
          type: 'EXPENSE',
          amount: clauseAmount,
          description: `Pagamento de multa rescisória: ${player.name} (${sellerClub.shortName})`,
          applyToBalance: true,
        }),
        squad: [...c.squad, signedPlayer],
      };
    }
    if (c.id === sellerClub.id) {
      return {
        ...c,
        finances: {
          ...c.finances,
          balance: c.finances.balance + clauseAmount,
          totalIncomeSeason: c.finances.totalIncomeSeason + clauseAmount,
        },
        squad: c.squad.filter((p) => p.id !== player.id),
      };
    }
    return c;
  });

  const inboxMsg: InboxMessage = {
    id: `clause_in_${Date.now()}_${player.id}`,
    title: `⚡ Multa Rescisória Paga: ${player.name} é do ${userClub.name}!`,
    message: `O ${userClub.name} depositou à vista o valor integral da multa rescisória (${formatBRL(clauseAmount)}) de ${player.name} (${player.detailedRole}, OVR ${player.overall}) e firmou contrato de ${yearsText}. O reforço já está regularizado e à disposição!`,
    date: state.currentDate,
    round: state.currentRound,
    read: false,
    type: 'TRANSFER',
  };

  const historyRecord: TransferHistoryRecord = {
    id: `tr_clause_${Date.now()}_${player.id}`,
    playerId: player.id,
    playerName: player.name,
    playerRole: player.detailedRole,
    playerOverall: player.overall,
    playerAge: player.age,
    fromClubId: sellerClub.id,
    fromClubName: sellerClub.name,
    toClubId: userClub.id,
    toClubName: userClub.name,
    fee: clauseAmount,
    wage: offeredWage,
    date: state.currentDate,
    round: state.currentRound,
    seasonYear: state.currentSeasonYear,
    category: 'RELEASE_CLAUSE',
    direction: 'IN',
    notes: 'Pagamento integral da multa rescisória',
  };

  return {
    accepted: true,
    feedbackText: `Multa paga! ${player.name} rescindiu com o ${sellerClub.name} e assinou imediatamente com o ${userClub.name}!`,
    updatedState: {
      ...state,
      clubs: updatedClubs,
      inbox: [inboxMsg, ...state.inbox],
      transferHistory: [historyRecord, ...(state.transferHistory || [])],
    },
  };
}

/**
 * Mid-season alerts (Bosman risk warning at Round 18, Veteran retirement announcements at Round 20,
 * and occasional CPU pre-contract approaches if user leaves key expiring players unrenewed past Round 26).
 */
export function processMidSeasonContractEvents(
  state: GameSave,
  previousRound: number
): {
  updatedClubs: Club[];
  contractInboxMessages: InboxMessage[];
  newDeals: TransferHistoryRecord[];
} {
  let updatedClubs = state.clubs;
  const contractInboxMessages: InboxMessage[] = [];
  const newDeals: TransferHistoryRecord[] = [];

  const userClub = updatedClubs.find((c) => c.id === state.userClubId);
  if (!userClub) {
    return { updatedClubs, contractInboxMessages, newDeals };
  }

  // 1. Round 18: Mid-season Bosman alert for expiring contracts
  if (previousRound < 18 && state.currentRound >= 18) {
    const expiringPlayers = userClub.squad.filter(
      (p) => !p.isLoan && p.contractYears <= 1 && !p.retiringAtSeasonEnd && !p.preContractClubId
    );
    if (expiringPlayers.length > 0) {
      const namesPreview = expiringPlayers
        .slice(0, 4)
        .map((p) => `${p.name} (${p.detailedRole}, OVR ${p.overall})`)
        .join(', ');
      contractInboxMessages.push({
        id: `contract_warn_r18_${state.currentSeasonYear}`,
        title: `⚠️ Alerta de Fim de Contrato (${expiringPlayers.length} atleta${expiringPlayers.length > 1 ? 's' : ''})`,
        message: `Atenção, professor! Os seguintes atletas entraram nos últimos 6 meses de vínculo e já podem assinar pré-contrato gratuito com rivais: ${namesPreview}${expiringPlayers.length > 4 ? ` e mais ${expiringPlayers.length - 4}` : ''}. Acesse Escalação > Contratos & Multas para negociar a renovação!`,
        date: state.currentDate,
        round: state.currentRound,
        read: false,
        type: 'BOARD',
      });
    }
  }

  // 2. Round 20: Veteran Retirement Announcements (age >= 35)
  if (previousRound < 20 && state.currentRound >= 20) {
    const userRetiringNames: string[] = [];
    updatedClubs = updatedClubs.map((club) => {
      const nextSquad = club.squad.map((p) => {
        if (p.retiringAtSeasonEnd) return p;
        const shouldAnnounce =
          p.age >= 37 || (p.age === 36 && hashPlayerId(p.id + state.currentSeasonYear) % 2 === 0) ||
          (p.age === 35 && hashPlayerId(p.id + state.currentSeasonYear) % 4 === 0);

        if (shouldAnnounce) {
          if (club.id === state.userClubId) {
            userRetiringNames.push(`${p.name} (${p.age} anos, ${p.detailedRole})`);
          }
          return { ...p, retiringAtSeasonEnd: true };
        }
        return p;
      });
      return { ...club, squad: nextSquad };
    });

    if (userRetiringNames.length > 0) {
      contractInboxMessages.push({
        id: `retire_announce_${state.currentSeasonYear}`,
        title: `👟 Anúncio de Aposentadoria no Fim da Temporada`,
        message: `Em coletiva emocionante no CT, ${userRetiringNames.join(' e ')} comunicou oficialmente que encerrará a carreira profissional ao término da temporada ${state.currentSeasonYear}. Planeje a reposição no mercado ou na base!`,
        date: state.currentDate,
        round: state.currentRound,
        read: false,
        type: 'BOARD',
      });
    }
  }

  // 3. Rounds 27..35: Small chance a CPU club signs a Bosman pre-contract with an unrenewed user player
  if (state.currentRound >= 27 && state.currentRound <= 35 && Math.random() < 0.08) {
    const latestUserClub = updatedClubs.find((c) => c.id === state.userClubId);
    const vulnerablePool = (latestUserClub?.squad || []).filter(
      (p) =>
        !p.isLoan &&
        p.contractYears <= 1 &&
        !p.preContractClubId &&
        !p.retiringAtSeasonEnd &&
        p.overall >= 72
    );

    if (latestUserClub && vulnerablePool.length > 0) {
      const target = vulnerablePool[Math.floor(Math.random() * vulnerablePool.length)];
      const suitors = updatedClubs.filter(
        (c) =>
          c.id !== latestUserClub.id &&
          c.reputation >= Math.max(2, latestUserClub.reputation - 1) &&
          c.division === latestUserClub.division
      );
      if (suitors.length > 0) {
        const suitor = suitors[Math.floor(Math.random() * suitors.length)];
        const offeredWage = Math.round((target.wage * 1.2) / 1000) * 1000;

        updatedClubs = updatedClubs.map((c) => {
          if (c.id !== latestUserClub.id) return c;
          return {
            ...c,
            squad: c.squad.map((p) =>
              p.id === target.id
                ? {
                    ...p,
                    preContractClubId: suitor.id,
                    preContractClubName: suitor.name,
                    preContractWage: offeredWage,
                    preContractYears: 3,
                  }
                : p
            ),
          };
        });

        contractInboxMessages.push({
          id: `cpu_bosman_steal_${Date.now()}_${target.id}`,
          title: `🚨 Pré-Contrato Assinado: ${target.name} acertou com o ${suitor.name}`,
          message: `Sem acordo de renovação até a reta final do ano, ${target.name} (${target.detailedRole}, OVR ${target.overall}) assinou um pré-contrato com o ${suitor.name} pela Lei Bosman. Ele cumprirá o restante da temporada atual e deixará o ${latestUserClub.name} sem custos em 15 de Janeiro!`,
          date: state.currentDate,
          round: state.currentRound,
          read: false,
          type: 'TRANSFER',
        });

        newDeals.push({
          id: `tr_cpu_bosman_${Date.now()}_${target.id}`,
          playerId: target.id,
          playerName: target.name,
          playerRole: target.detailedRole,
          playerOverall: target.overall,
          playerAge: target.age,
          fromClubId: latestUserClub.id,
          fromClubName: latestUserClub.name,
          toClubId: suitor.id,
          toClubName: suitor.name,
          fee: 0,
          wage: offeredWage,
          date: state.currentDate,
          round: state.currentRound,
          seasonYear: state.currentSeasonYear,
          category: 'PRE_CONTRACT',
          direction: 'OUT',
          notes: `Saída via Pré-Contrato em 15/01/${state.currentSeasonYear + 1}`,
        });
      }
    }
  }

  return { updatedClubs, contractInboxMessages, newDeals };
}

function rebalanceClubLineup(squad: Player[]): Player[] {
  // Ensure 11 starters (1 GK + 10 outfield) if retirements/departures removed starters
  const currentStarters = squad.filter((p) => p.isStarter);
  if (currentStarters.length === 11 && currentStarters.filter((p) => p.position === 'GK').length === 1) {
    return squad;
  }

  const sortedByOvr = [...squad].sort((a, b) => b.overall - a.overall);
  const bestGk = sortedByOvr.find((p) => p.position === 'GK') || sortedByOvr[0];
  const starterIds = new Set<string>(bestGk ? [bestGk.id] : []);

  for (const p of sortedByOvr) {
    if (starterIds.size >= 11) break;
    if (p.id === bestGk?.id || p.position === 'GK') continue;
    starterIds.add(p.id);
  }

  // Fallback if fewer than 10 non-GK players exist
  for (const p of sortedByOvr) {
    if (starterIds.size >= 11) break;
    starterIds.add(p.id);
  }

  let benchAssigned = 0;
  return squad.map((p) => {
    if (starterIds.has(p.id)) {
      return { ...p, isStarter: true, isSubstitute: false };
    }
    if (benchAssigned < 9) {
      benchAssigned += 1;
      return { ...p, isStarter: false, isSubstitute: true };
    }
    return { ...p, isStarter: false, isSubstitute: false };
  });
}

/**
 * Executed on Season Turn (Jan 15 of nextYear):
 * 1. Retires veterans (retiringAtSeasonEnd or age >= 37).
 * 2. Ages all active players (+1 year), applies subtle youth maturation / veteran decline, decrements contractYears (-1).
 * 3. Executes Bosman Pre-Contracts (moves players to preContractClubId).
 * 4. Releases unrenewed user players (contractYears <= 0) to Free Agents and refreshes CPU contracts.
 * 5. Ensures minimum squad depth and valid 11 starters for every club.
 */
export function processAnnualSquadLifecycle(
  clubs: Club[],
  freeAgents: Player[],
  userClubId: string,
  endingYear: number,
  nextSeasonStartDate: string,
  protectedPendingPlayerIds?: Set<string>,
  preserveStatsForContinent?: 'EU' | 'SA_BR'
): {
  updatedClubs: Club[];
  updatedFreeAgents: Player[];
  lifecycleInboxMessages: InboxMessage[];
  newlyMintedCoaches: RealCoachProfile[];
} {
  const userRetired: string[] = [];
  const leagueNotableRetired: string[] = [];
  const newlyMintedCoaches: RealCoachProfile[] = [];
  const coachFormations: FormationType[] = ['4-3-3', '4-2-3-1', '4-4-2', '3-5-2', '4-1-4-1'];
  const coachMentalities: TacticalMentality[] = ['Ofensivo', 'Equilibrado', 'Pressão Total', 'Defensivo'];
  const coachPassings: PassingStyle[] = ['Curto (Posse)', 'Misto', 'Longo (Contra-ataque)'];
  const regenFirstNames = ['Kauã', 'Breno', 'Estêvão', 'Ryan', 'Vitor', 'Riquelme', 'Matheus', 'Arthur', 'Luighi', 'Lorran'];
  const regenLastNames = ['Conceição', 'Almeida', 'Teixeira', 'Nogueira', 'Santana', 'Borges', 'Gomes', 'Pacheco', 'Menezes', 'Ferreira'];
  const userPreContractArrivals: string[] = [];
  const userPreContractDepartures: string[] = [];
  const userExpiredDepartures: string[] = [];

  // Pending pre-contract transfers to move after aging
  const incomingPreContractsByClub = new Map<string, Player[]>();
  const newlyReleasedFreeAgents: Player[] = [];

  // Step 1 & 2: Process each club's squad (retirements, aging, pre-contract departures, contract expirations)
  const intermediateClubs = clubs.map((club) => {
    const isUser = club.id === userClubId;

    // Sort CPU squad by overall to know core players CPU would naturally renew (up to 25 of 30)
    const cpuCoreIds = new Set(
      [...club.squad]
        .sort((a, b) => b.overall - a.overall)
        .slice(0, 25)
        .map((p) => p.id)
    );

    const survivingSquad: Player[] = [];

    for (const rawPlayer of club.squad) {
      const isProtectedPending = Boolean(protectedPendingPlayerIds?.has(rawPlayer.id));
      // Return loaned players on season turn if loan ended, or keep if active
      const willRetire =
        !isProtectedPending &&
        (rawPlayer.retiringAtSeasonEnd ||
          rawPlayer.age >= 38 ||
          (rawPlayer.age >= 36 && hashPlayerId(rawPlayer.id + endingYear) % 3 === 0));

      if (willRetire && !rawPlayer.isLoan) {
        if (isUser) {
          userRetired.push(`${rawPlayer.name} (${rawPlayer.detailedRole}, ${rawPlayer.age} anos)`);
        } else if (rawPlayer.overall >= 79) {
          leagueNotableRetired.push(`${rawPlayer.name} (${club.shortName})`);
        }

        // Notable retiring veterans earn their coaching license and join the Coaching Carousel!
        if ((isUser || rawPlayer.overall >= 76) && newlyMintedCoaches.length < 7) {
          const hCoach = hashPlayerId(rawPlayer.id + endingYear);
          const prestige = Math.max(60, Math.min(89, rawPlayer.overall - 3 + (isUser ? 3 : 0)));
          const preferredFormation = coachFormations[hCoach % coachFormations.length];
          const mentality: TacticalMentality =
            rawPlayer.position === 'FW'
              ? 'Ofensivo'
              : rawPlayer.position === 'DF' || rawPlayer.position === 'GK'
              ? coachMentalities[(hCoach + 2) % coachMentalities.length]
              : coachMentalities[hCoach % coachMentalities.length];
          const passing = coachPassings[hCoach % coachPassings.length];
          newlyMintedCoaches.push({
            id: `ex_player_coach_${endingYear + 1}_${rawPlayer.id}`,
            name: rawPlayer.name,
            nationality: club.country || 'Brasil',
            age: rawPlayer.age + 1,
            prestige,
            preferredFormation,
            mentality,
            passing,
            styleLabel: `Ex-${rawPlayer.detailedRole} · Licença PRO (${preferredFormation})`,
            monthlySalaryDemand: Math.round((prestige * 5200) / 1000) * 1000,
            signingFee: Math.round((prestige * 11000) / 1000) * 1000,
          });
        }

        // Spawn a young high-potential Academy Regen for CPU clubs losing an idol
        if (!isUser && rawPlayer.overall >= 75 && survivingSquad.length < MAX_SQUAD_SIZE) {
          const hRegen = hashPlayerId(`regen_${rawPlayer.id}_${endingYear}`);
          const regenOvr = Math.max(62, Math.min(73, rawPlayer.overall - 12));
          const regenPot = Math.min(92, Math.max(80, rawPlayer.overall + 4));
          const rName = `${regenFirstNames[hRegen % regenFirstNames.length]} ${
            regenLastNames[(hRegen >> 3) % regenLastNames.length]
          }`;
          const regenEcon = recalculatePlayerEconomics(regenOvr, 17, club.division, club);
          survivingSquad.push(
            ensurePlayerContractFields({
              id: `regen_${endingYear + 1}_${club.id}_${rawPlayer.id}`,
              name: rName,
              position: rawPlayer.position,
              detailedRole: rawPlayer.detailedRole,
              overall: regenOvr,
              potential: regenPot,
              age: 17,
              condition: 100,
              morale: 'Excelente',
              wage: regenEcon.wage,
              marketValue: regenEcon.marketValue,
              contractYears: 4,
              preferredFoot: hRegen % 3 === 0 ? 'Canhoto' : 'Destro',
              specialSkill: 'Joia da Base (Regen)',
              matches: 0,
              goals: 0,
              assists: 0,
              yellowCards: 0,
              redCards: 0,
              isSuspended: false,
              injuryWeeks: 0,
              isStarter: false,
              isSubstitute: true,
              squadNumber: rawPlayer.squadNumber || 30,
              ratingAverage: 6.7,
            })
          );
        }

        continue;
      }

      // Annual aging + subtle physical progression/decline
      const newAge = rawPlayer.age + 1;
      let newOverall = rawPlayer.overall;
      let newMarketValue = rawPlayer.marketValue;
      let newWage = rawPlayer.wage;

      if (newAge <= 23 && newOverall < (rawPlayer.potential || newOverall + 4)) {
        const growthRoll = hashPlayerId(rawPlayer.id + endingYear);
        const growthStep = newAge <= 20 && growthRoll % 3 === 0 ? 2 : growthRoll % 2 === 0 ? 1 : 0;
        if (growthStep > 0) {
          newOverall = Math.min(99, Math.min(rawPlayer.potential || 99, newOverall + growthStep));
          const updatedEcon = recalculatePlayerEconomics(newOverall, newAge, club.division, club);
          newMarketValue = Math.max(newMarketValue, updatedEcon.marketValue);
          if (!isUser) {
            newWage = Math.round((newWage * 0.7 + updatedEcon.wage * 0.3) / 500) * 500;
          }
        }
      } else if (newAge >= 33) {
        const declineStep = newAge >= 36 ? 2 : newAge >= 34 ? 1 : hashPlayerId(rawPlayer.id + endingYear) % 2 === 0 ? 1 : 0;
        if (declineStep > 0) {
          newOverall = Math.max(52, newOverall - declineStep);
          const updatedEcon = recalculatePlayerEconomics(newOverall, newAge, club.division, club);
          newMarketValue = Math.min(newMarketValue, Math.max(updatedEcon.marketValue, Math.round(newMarketValue * 0.84)));
          if (!isUser) {
            newWage = Math.max(500, Math.round((newWage * 0.85 + updatedEcon.wage * 0.15) / 500) * 500);
          }
        }
      }

      const preserveMidSeasonStats =
        (preserveStatsForContinent === 'EU' && isSplitCalendarClub(club)) ||
        (preserveStatsForContinent === 'SA_BR' && !isSplitCalendarClub(club));

      const agedPlayer: Player = {
        ...rawPlayer,
        age: newAge,
        overall: newOverall,
        marketValue: newMarketValue,
        wage: newWage,
        contractYears: (rawPlayer.contractYears || 2) - 1,
        condition: 100,
        yellowCards: preserveMidSeasonStats ? rawPlayer.yellowCards : 0,
        redCards: preserveMidSeasonStats ? rawPlayer.redCards : 0,
        competitionYellowCards: preserveMidSeasonStats
          ? rawPlayer.competitionYellowCards || {}
          : {},
        competitionRedCards: preserveMidSeasonStats ? rawPlayer.competitionRedCards || {} : {},
        suspensions: preserveMidSeasonStats ? rawPlayer.suspensions || [] : [],
        isSuspended: preserveMidSeasonStats ? rawPlayer.isSuspended : false,
        injuryWeeks: preserveMidSeasonStats ? rawPlayer.injuryWeeks : 0,
        injuryDetails: preserveMidSeasonStats ? rawPlayer.injuryDetails : undefined,
        matches: preserveMidSeasonStats ? rawPlayer.matches : 0,
        goals: preserveMidSeasonStats ? rawPlayer.goals : 0,
        assists: preserveMidSeasonStats ? rawPlayer.assists : 0,
      };

      // Check Bosman Pre-Contract move!
      if (agedPlayer.preContractClubId) {
        const destClubId = agedPlayer.preContractClubId;
        const destClub = clubs.find((c) => c.id === destClubId);
        const transferred: Player = {
          ...agedPlayer,
          wage: agedPlayer.preContractWage || agedPlayer.wage,
          contractYears: agedPlayer.preContractYears || 3,
          releaseClause: computeDefaultReleaseClause(agedPlayer),
          preContractClubId: undefined,
          preContractClubName: undefined,
          preContractWage: undefined,
          preContractYears: undefined,
          isStarter: false,
          isSubstitute: true,
          isListedForSale: false,
          isListedForLoan: false,
          morale: 'Excelente',
        };

        const list = incomingPreContractsByClub.get(destClubId) || [];
        list.push(transferred);
        incomingPreContractsByClub.set(destClubId, list);

        if (destClubId === userClubId) {
          userPreContractArrivals.push(
            `${transferred.name} (${transferred.detailedRole}, OVR ${transferred.overall}, ex-${club.shortName})`
          );
        }
        if (isUser && destClub) {
          userPreContractDepartures.push(`${transferred.name} (foi para o ${destClub.name})`);
        }
        continue;
      }

      // Check Contract Expiration (contractYears <= 0)
      if (!agedPlayer.isLoan && agedPlayer.contractYears <= 0 && !isProtectedPending) {
        if (isUser) {
          userExpiredDepartures.push(`${agedPlayer.name} (${agedPlayer.detailedRole}, OVR ${agedPlayer.overall})`);
          newlyReleasedFreeAgents.push({
            ...agedPlayer,
            contractYears: 2,
            releaseClause: computeDefaultReleaseClause(agedPlayer),
            isStarter: false,
            isSubstitute: false,
            isListedForSale: false,
            isListedForLoan: false,
          });
          continue;
        } else {
          // CPU club renews core players automatically; surplus players enter Free Agents
          if (cpuCoreIds.has(agedPlayer.id)) {
            survivingSquad.push({
              ...agedPlayer,
              contractYears: agedPlayer.age >= 33 ? 1 : 2 + (hashPlayerId(agedPlayer.id) % 2),
              releaseClause: computeDefaultReleaseClause(agedPlayer),
            });
          } else {
            newlyReleasedFreeAgents.push({
              ...agedPlayer,
              contractYears: 2,
              releaseClause: computeDefaultReleaseClause(agedPlayer),
              isStarter: false,
              isSubstitute: false,
            });
          }
          continue;
        }
      }

      survivingSquad.push({
        ...agedPlayer,
        releaseClause: agedPlayer.releaseClause || computeDefaultReleaseClause(agedPlayer),
      });
    }

    return {
      ...club,
      squad: survivingSquad,
    };
  });

  // Step 3: Deliver incoming Pre-Contract players & enforce strict positional minimums via Free Agents + Academy Newgens
  const availableFreeAgentsPool: Player[] = [...newlyReleasedFreeAgents, ...freeAgents]
    .filter((p) => p.age < 36 && !p.retiringAtSeasonEnd)
    .sort((a, b) => b.overall - a.overall);
  const takenFreeAgentIds = new Set<string>();

  const updatedClubs = intermediateClubs.map((club) => {
    const arrivals = incomingPreContractsByClub.get(club.id) || [];
    const usedNums = new Set(club.squad.map((p) => p.squadNumber));
    let nextNum = 12;
    const assignNumber = (numHint?: number) => {
      if (numHint && numHint >= 1 && numHint <= 99 && !usedNums.has(numHint)) {
        usedNums.add(numHint);
        return numHint;
      }
      while (usedNums.has(nextNum) && nextNum < 99) {
        nextNum += 1;
      }
      usedNums.add(nextNum);
      return nextNum;
    };

    const numberedArrivals = arrivals.map((p) => ({
      ...p,
      squadNumber: assignNumber(p.squadNumber),
    }));

    const combinedSquad = [...club.squad, ...numberedArrivals];

    // Enforce AI club positional minimums (>= 2 GK, >= 5 DF, >= 6 MF, >= 4 FW, >= 22 total)
    if (club.id !== userClubId) {
      const targetAvgOvr =
        combinedSquad.length > 0
          ? Math.round(combinedSquad.reduce((s, p) => s + p.overall, 0) / combinedSquad.length)
          : 70;
      const pullFreeAgentForPos = (pos: Player['position']) => {
        if (combinedSquad.length >= MAX_SQUAD_SIZE) return false;
        const candidateIdx = availableFreeAgentsPool.findIndex(
          (fa) =>
            !takenFreeAgentIds.has(fa.id) &&
            fa.position === pos &&
            fa.overall >= targetAvgOvr - 8 &&
            fa.overall <= targetAvgOvr + 7
        );
        if (candidateIdx === -1) return false;
        const fa = availableFreeAgentsPool[candidateIdx];
        takenFreeAgentIds.add(fa.id);
        combinedSquad.push(
          ensurePlayerContractFields(
            {
              ...fa,
              age: Math.min(35, fa.age + 1),
              contractYears: fa.age >= 32 ? 1 : 2,
              condition: 100,
              matches: 0,
              goals: 0,
              assists: 0,
              yellowCards: 0,
              redCards: 0,
              squadNumber: assignNumber(),
              isStarter: false,
              isSubstitute: false,
              isListedForSale: false,
              isListedForLoan: false,
            },
            club.country
          )
        );
        return true;
      };

      const countPos = (pos: Player['position']) =>
        combinedSquad.filter((p) => p.position === pos).length;

      while (countPos('GK') < 2 && pullFreeAgentForPos('GK')) {
        /* pull free-agent GK */
      }
      while (countPos('DF') < 5 && pullFreeAgentForPos('DF')) {
        /* pull free-agent DF */
      }
      while (countPos('MF') < 6 && pullFreeAgentForPos('MF')) {
        /* pull free-agent MF */
      }
      while (countPos('FW') < 4 && pullFreeAgentForPos('FW')) {
        /* pull free-agent FW */
      }
    }

    const targetMinDepth =
      club.id === userClubId
        ? Math.max(22, Math.min(MAX_SQUAD_SIZE, combinedSquad.length))
        : MAX_SQUAD_SIZE;
    const withDepth = trimSquadToMaxPlayers(
      ensureMinimumSquadDepth(
        club.id,
        club.division,
        combinedSquad,
        targetMinDepth,
        true,
        club.country || 'Brasil',
        endingYear + 1
      ),
      MAX_SQUAD_SIZE,
      true
    ).map((p) => ensurePlayerContractFields(p, club.country));

    return {
      ...club,
      squad: rebalanceClubLineup(withDepth),
    };
  });

  // Step 4: Age & clean up Free Agents pool (exclude players just recruited by AI clubs)
  const agedExistingFreeAgents = freeAgents
    .filter((p) => !takenFreeAgentIds.has(p.id) && p.age < 36 && !p.retiringAtSeasonEnd)
    .map((p) =>
      ensurePlayerContractFields({
        ...p,
        age: p.age + 1,
        condition: 100,
        matches: 0,
        goals: 0,
        assists: 0,
      })
    );

  const remainingReleased = newlyReleasedFreeAgents.filter((p) => !takenFreeAgentIds.has(p.id));
  const updatedFreeAgents = [...remainingReleased, ...agedExistingFreeAgents]
    .sort((a, b) => b.overall - a.overall)
    .slice(0, 55);

  // Step 5: Compose informative Inbox summary for the user
  const lifecycleInboxMessages: InboxMessage[] = [];
  const nextYear = endingYear + 1;
  const isAugustTurn = nextSeasonStartDate.slice(5, 7) === '08';
  const seasonDisplayLabel = isAugustTurn
    ? `${nextYear}/${String(nextYear + 1).slice(-2)}`
    : String(nextYear);
  const dateFormatted = /^\d{4}-\d{2}-\d{2}$/.test(nextSeasonStartDate)
    ? `${nextSeasonStartDate.slice(8, 10)}/${nextSeasonStartDate.slice(5, 7)}/${nextSeasonStartDate.slice(0, 4)}`
    : `15/01/${nextYear}`;

  if (userPreContractArrivals.length > 0) {
    lifecycleInboxMessages.push({
      id: `precontract_arrivals_${nextYear}`,
      title: `🤝 Apresentação Oficial dos Reforços de Pré-Contrato!`,
      message: `Os atletas contratados via Lei Bosman se apresentaram hoje no CT e já estão integrados ao elenco para ${seasonDisplayLabel}: ${userPreContractArrivals.join(', ')}.`,
      date: dateFormatted,
      round: 1,
      read: false,
      type: 'TRANSFER',
    });
  }

  if (userRetired.length > 0 || userExpiredDepartures.length > 0 || userPreContractDepartures.length > 0) {
    const parts: string[] = [];
    if (userRetired.length > 0) {
      parts.push(`Aposentadorias confirmadas: ${userRetired.join(', ')}.`);
    }
    if (userPreContractDepartures.length > 0) {
      parts.push(`Saídas por pré-contrato: ${userPreContractDepartures.join(', ')}.`);
    }
    if (userExpiredDepartures.length > 0) {
      parts.push(`Vínculos encerrados (livres no mercado): ${userExpiredDepartures.join(', ')}.`);
    }

    lifecycleInboxMessages.push({
      id: `squad_turnover_${nextYear}`,
      title: `📋 Balanço de Virada de Elenco e Contratos (${seasonDisplayLabel})`,
      message: `${parts.join(' ')} Todos os atletas do elenco completaram mais um ano de carreira e tiveram 1 temporada descontada de seus contratos.`,
      date: dateFormatted,
      round: 1,
      read: false,
      type: 'BOARD',
    });
  } else if (leagueNotableRetired.length > 0) {
    lifecycleInboxMessages.push({
      id: `league_retirements_${nextYear}`,
      title: `👟 Veteranos Penduram as Chuteiras para ${seasonDisplayLabel}`,
      message: `A virada de temporada marcou a despedida dos gramados de nomes conhecidos como ${leagueNotableRetired.slice(0, 5).join(', ')}. Verifique a duração dos contratos do seu elenco em Escalação > Contratos & Multas (${dateFormatted}).`,
      date: dateFormatted,
      round: 1,
      read: false,
      type: 'BOARD',
    });
  }

  if (newlyMintedCoaches.length > 0) {
    lifecycleInboxMessages.push({
      id: `ex_players_coaches_${nextYear}`,
      title: `🎓 Ídolos Viram Treinadores na Temporada ${nextYear}!`,
      message: `Após pendurarem as chuteiras, ${newlyMintedCoaches
        .map((c) => `${c.name} (${c.preferredFormation})`)
        .join(', ')} concluíram a Licença PRO e já estão disponíveis no Mercado de Treinadores para assumir clubes na nova temporada!`,
      date: dateFormatted,
      round: 1,
      read: false,
      type: 'BOARD',
    });
  }

  return {
    updatedClubs,
    updatedFreeAgents,
    lifecycleInboxMessages,
    newlyMintedCoaches,
  };
}
