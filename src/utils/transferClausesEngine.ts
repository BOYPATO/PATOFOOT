import {
  ActiveTransferClause,
  Club,
  GameSave,
  InboxMessage,
  Player,
} from '../types/game';

export interface ClausePackageInput {
  sellOnPercentage: number; // 0 | 10 | 20 | 30
  enableGoalBonus: boolean;
  enableAppearancesBonus: boolean;
}

export function computeDefaultMilestoneBonusAmount(marketValue: number): number {
  const raw = Math.max(150_000, Math.round((marketValue * 0.08) / 50_000) * 50_000);
  return raw;
}

/**
 * Ao COMPRAR um atleta, incluir % de venda futura (mais-valia) e bônus por metas
 * reduz a pedida à vista exigida pelo clube vendedor!
 */
export function computePurchaseUpfrontDiscountFactor(pkg: ClausePackageInput): number {
  let discount = 0;
  if (pkg.sellOnPercentage === 10) discount += 0.06;
  else if (pkg.sellOnPercentage === 20) discount += 0.12;
  else if (pkg.sellOnPercentage >= 30) discount += 0.17;

  if (pkg.enableGoalBonus) discount += 0.04;
  if (pkg.enableAppearancesBonus) discount += 0.04;

  return Math.min(0.25, discount);
}

/**
 * Ao VENDER um atleta mantendo % de venda futura, o comprador ajusta levemente a oferta à vista,
 * mas garante participação lucrativa numa transferência futura e bônus por metas.
 */
export function computeSaleAdjustedUpfrontOffer(
  baseOfferPrice: number,
  pkg: ClausePackageInput
): number {
  let factor = 1;
  if (pkg.sellOnPercentage === 10) factor -= 0.04;
  else if (pkg.sellOnPercentage === 20) factor -= 0.08;
  else if (pkg.sellOnPercentage >= 30) factor -= 0.12;

  if (pkg.enableGoalBonus) factor -= 0.02;
  if (pkg.enableAppearancesBonus) factor -= 0.02;

  return Math.max(250_000, Math.round((baseOfferPrice * factor) / 50_000) * 50_000);
}

export function buildTransferClauseRecord(params: {
  player: Player;
  currentClub: Club;
  counterpartyClub: Club;
  direction: 'RECEIVABLE' | 'PAYABLE';
  pkg: ClausePackageInput;
  currentDate: string;
}): ActiveTransferClause | null {
  const { player, currentClub, counterpartyClub, direction, pkg, currentDate } = params;
  if (
    pkg.sellOnPercentage <= 0 &&
    !pkg.enableGoalBonus &&
    !pkg.enableAppearancesBonus
  ) {
    return null;
  }

  const bonusUnit = computeDefaultMilestoneBonusAmount(player.marketValue);
  const goalTarget = player.position === 'FW' ? 10 : player.position === 'MF' ? 6 : 4;
  const appTarget = 15;

  return {
    id: `cl_${direction.toLowerCase()}_${Date.now()}_${player.id}`,
    playerId: player.id,
    playerName: player.name,
    playerRole: player.detailedRole,
    currentClubId: currentClub.id,
    currentClubName: currentClub.name,
    counterpartyClubId: counterpartyClub.id,
    counterpartyClubName: counterpartyClub.name,
    direction,
    sellOnPercentage: pkg.sellOnPercentage,
    goalBonusAmount: pkg.enableGoalBonus ? bonusUnit : undefined,
    goalBonusTarget: pkg.enableGoalBonus ? goalTarget : undefined,
    goalsBaseline: player.goals || 0,
    goalBonusPaid: false,
    appearancesBonusAmount: pkg.enableAppearancesBonus ? bonusUnit : undefined,
    appearancesBonusTarget: pkg.enableAppearancesBonus ? appTarget : undefined,
    matchesBaseline: player.matches || 0,
    appearancesBonusPaid: false,
    settledSellOn: pkg.sellOnPercentage <= 0,
    createdDate: currentDate,
  };
}

/**
 * Valor à vista caso o usuário queira negociar o resgate antecipado de uma % de Venda Futura
 * (Receber dinheiro vivo agora vendendo a cláusula ao clube detentor, estilo Football Manager).
 */
export function computeSellOnClauseBuyoutPrice(
  clause: ActiveTransferClause,
  livePlayerMarketValue: number
): number {
  if (clause.sellOnPercentage <= 0 || clause.settledSellOn) return 0;
  // ~72% do valor teórico atual da fatia para liquidez imediata
  const raw = livePlayerMarketValue * (clause.sellOnPercentage / 100) * 0.72;
  return Math.max(150_000, Math.round(raw / 50_000) * 50_000);
}

/**
 * Avalia progresso de metas (gols/jogos) e eventuais revendas de atletas com cláusulas ativas.
 */
export function evaluateActiveTransferClausesProgress(save: GameSave): GameSave {
  const clauses = save.transferClauses || [];
  if (clauses.length === 0) return save;

  let userBalanceDelta = 0;
  const newInbox: InboxMessage[] = [];
  const clubByPlayerId = new Map<string, { club: Club; player: Player }>();

  for (const club of save.clubs) {
    for (const p of club.squad) {
      clubByPlayerId.set(p.id, { club, player: p });
    }
  }

  const fmt = (v: number) =>
    new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      maximumFractionDigits: 0,
    }).format(v);

  const updatedClauses = clauses
    .map((cl) => {
      const live = clubByPlayerId.get(cl.playerId);
      if (!live) return cl;

      const nextClause = { ...cl };

      // 1. Check if player moved to a 3rd club (triggers Sell-On Percentage!)
      if (!nextClause.settledSellOn && nextClause.sellOnPercentage > 0) {
        if (live.club.id !== nextClause.currentClubId) {
          const shareAmount = Math.round(
            live.player.marketValue * (nextClause.sellOnPercentage / 100)
          );
          if (nextClause.direction === 'RECEIVABLE') {
            userBalanceDelta += shareAmount;
            newInbox.push({
              id: `clause_sellon_in_${Date.now()}_${cl.id}`,
              title: `💰 Mais-Valia Recebida (${cl.sellOnPercentage}%): ${cl.playerName}`,
              message: `O atleta ${cl.playerName} transferiu-se para o ${live.club.name}! Pela cláusula de ${cl.sellOnPercentage}% de venda futura mantida pelo seu clube, ${fmt(shareAmount)} entraram automaticamente nos cofres!`,
              date: save.currentDate,
              round: save.currentRound,
              read: false,
              type: 'FINANCE',
            });
          } else {
            userBalanceDelta -= shareAmount;
            newInbox.push({
              id: `clause_sellon_out_${Date.now()}_${cl.id}`,
              title: `📄 Repasse de Venda Futura (${cl.sellOnPercentage}%): ${cl.playerName}`,
              message: `Com a transferência de ${cl.playerName}, foram repassados ${fmt(shareAmount)} ao ${cl.counterpartyClubName} referentes aos ${cl.sellOnPercentage}% de direitos acordados na compra.`,
              date: save.currentDate,
              round: save.currentRound,
              read: false,
              type: 'FINANCE',
            });
          }
          nextClause.settledSellOn = true;
          nextClause.currentClubId = live.club.id;
          nextClause.currentClubName = live.club.name;
        }
      }

      // 2. Check Goals Milestone
      if (
        !nextClause.goalBonusPaid &&
        nextClause.goalBonusAmount &&
        nextClause.goalBonusTarget
      ) {
        const goalsSinceDeal = Math.max(0, (live.player.goals || 0) - nextClause.goalsBaseline);
        if (goalsSinceDeal >= nextClause.goalBonusTarget) {
          nextClause.goalBonusPaid = true;
          if (nextClause.direction === 'RECEIVABLE') {
            userBalanceDelta += nextClause.goalBonusAmount;
            newInbox.push({
              id: `clause_goals_in_${Date.now()}_${cl.id}`,
              title: `🎯 Bônus por Meta Atingido: ${cl.playerName} (${nextClause.goalBonusTarget} gols)`,
              message: `${cl.playerName} alcançou a meta de ${nextClause.goalBonusTarget} gols pelo ${cl.currentClubName}! O bônus contratual de ${fmt(nextClause.goalBonusAmount)} foi creditado no caixa do seu clube.`,
              date: save.currentDate,
              round: save.currentRound,
              read: false,
              type: 'FINANCE',
            });
          } else {
            userBalanceDelta -= nextClause.goalBonusAmount;
            newInbox.push({
              id: `clause_goals_out_${Date.now()}_${cl.id}`,
              title: `🎯 Meta de Gols Cumprida: ${cl.playerName}`,
              message: `${cl.playerName} atingiu ${nextClause.goalBonusTarget} gols pelo seu clube! Conforme contrato, foi pago o bônus de ${fmt(nextClause.goalBonusAmount)} ao ${cl.counterpartyClubName}.`,
              date: save.currentDate,
              round: save.currentRound,
              read: false,
              type: 'FINANCE',
            });
          }
        }
      }

      // 3. Check Appearances Milestone
      if (
        !nextClause.appearancesBonusPaid &&
        nextClause.appearancesBonusAmount &&
        nextClause.appearancesBonusTarget
      ) {
        const appsSinceDeal = Math.max(
          0,
          (live.player.matches || 0) - nextClause.matchesBaseline
        );
        if (appsSinceDeal >= nextClause.appearancesBonusTarget) {
          nextClause.appearancesBonusPaid = true;
          if (nextClause.direction === 'RECEIVABLE') {
            userBalanceDelta += nextClause.appearancesBonusAmount;
            newInbox.push({
              id: `clause_apps_in_${Date.now()}_${cl.id}`,
              title: `📈 Bônus por Jogos Recebido: ${cl.playerName} (${nextClause.appearancesBonusTarget} jogos)`,
              message: `${cl.playerName} completou ${nextClause.appearancesBonusTarget} partidas pelo ${cl.currentClubName}! Seu clube recebeu ${fmt(nextClause.appearancesBonusAmount)} de bônus contratual.`,
              date: save.currentDate,
              round: save.currentRound,
              read: false,
              type: 'FINANCE',
            });
          } else {
            userBalanceDelta -= nextClause.appearancesBonusAmount;
            newInbox.push({
              id: `clause_apps_out_${Date.now()}_${cl.id}`,
              title: `📈 Meta de Partidas Cumprida: ${cl.playerName}`,
              message: `${cl.playerName} completou ${nextClause.appearancesBonusTarget} jogos pelo seu clube, acionando o bônus contratual de ${fmt(nextClause.appearancesBonusAmount)} ao ${cl.counterpartyClubName}.`,
              date: save.currentDate,
              round: save.currentRound,
              read: false,
              type: 'FINANCE',
            });
          }
        }
      }

      return nextClause;
    })
    .filter((cl) => {
      const sellOnDone = cl.sellOnPercentage <= 0 || Boolean(cl.settledSellOn);
      const goalsDone = !cl.goalBonusAmount || Boolean(cl.goalBonusPaid);
      const appsDone = !cl.appearancesBonusAmount || Boolean(cl.appearancesBonusPaid);
      return !(sellOnDone && goalsDone && appsDone);
    });

  if (userBalanceDelta === 0 && newInbox.length === 0) {
    return {
      ...save,
      transferClauses: updatedClauses,
    };
  }

  const updatedClubs = save.clubs.map((c) => {
    if (c.id !== save.userClubId) return c;
    return {
      ...c,
      finances: {
        ...c.finances,
        balance: c.finances.balance + userBalanceDelta,
        totalIncomeSeason:
          userBalanceDelta > 0
            ? c.finances.totalIncomeSeason + userBalanceDelta
            : c.finances.totalIncomeSeason,
        totalExpensesSeason:
          userBalanceDelta < 0
            ? c.finances.totalExpensesSeason + Math.abs(userBalanceDelta)
            : c.finances.totalExpensesSeason,
      },
    };
  });

  return {
    ...save,
    clubs: updatedClubs,
    transferClauses: updatedClauses,
    inbox: [...newInbox, ...save.inbox],
  };
}
