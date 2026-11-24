import {
  Club,
  DetailedRole,
  GameSave,
  Player,
  TransferRumor,
  TransferRumorCategory,
  TransferRumorHeat,
} from '../types/game';
import { findPendingTransferForPlayer } from './transferWindowEngine';

export interface TransferRumorCandidate {
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
  contractYears: number;
  currentClubId: string;
  currentClubName: string;
  currentClubShortName: string;
  currentClubDivision: string;
  interestedClubId: string;
  interestedClubName: string;
  interestedClubShortName: string;
  interestedClubDivision: string;
  category: TransferRumorCategory;
  defaultHeat: TransferRumorHeat;
  reasonTag: string;
  isUserPlayerInvolved: boolean;
}

const OUTLET_NAMES = [
  'Diário da Bola',
  'Bastidores FC',
  'Placar Express',
  'Gazeta do Mercado',
  'Central da Janela',
  'Radar Esportivo',
  'Hora do Lance',
  'Tribuna da Tática',
  'Observatório Sul',
];

function roundTransferFee(val: number): number {
  const safe = Math.max(150_000, Math.round(val));
  return Math.round(safe / 50_000) * 50_000;
}

function getEffectiveRating(p: Player): number {
  const raw = Number(p.ratingAverage || 0);
  if (raw > 0) return Number(raw.toFixed(1));
  return Number(Math.min(8.4, Math.max(6.2, 6.0 + (p.overall - 62) * 0.05)).toFixed(1));
}

function computePerformanceScore(p: Player): number {
  const matches = p.matches || 0;
  const goals = p.goals || 0;
  const assists = p.assists || 0;
  const rating = p.ratingAverage || 0;
  const contrib = goals * 3.2 + assists * 2.4;
  const ratingBonus = rating >= 7.0 ? (rating - 6.5) * 18 : 0;
  const moraleBonus = p.morale === 'Excelente' ? 6 : p.morale === 'Boa' ? 3 : 0;
  const youthBonus = p.age <= 22 && p.overall >= 72 ? 12 : 0;
  const contractBonus = p.contractYears <= 1 ? 9 : 0;
  const activityBonus = matches >= 3 ? Math.min(14, matches * 0.8) : 0;
  return (
    p.overall * 0.75 +
    contrib +
    ratingBonus +
    moraleBonus +
    youthBonus +
    contractBonus +
    activityBonus
  );
}

function computeEstimatedFee(p: Player): number {
  const goals = p.goals || 0;
  const assists = p.assists || 0;
  const rating = p.ratingAverage || 0;
  let mult = 1.04;
  if (goals >= 8 || assists >= 6 || rating >= 7.4) mult += 0.16;
  else if (goals >= 4 || assists >= 4 || rating >= 7.1) mult += 0.08;
  if (p.age <= 21 && p.overall >= 74) mult += 0.15;
  if (p.contractYears <= 1) mult -= 0.22;
  else if (p.contractYears === 2) mult -= 0.06;
  if (p.isListedForSale) mult -= 0.14;
  return roundTransferFee(p.marketValue * Math.max(0.65, mult));
}

function resolveReasonTag(p: Player, category: TransferRumorCategory): string {
  const goals = p.goals || 0;
  const assists = p.assists || 0;
  const rating = p.ratingAverage || 0;

  if (p.contractYears <= 1) return 'Contrato na Reta Final';
  if (goals >= 6) return 'Artilharia em Alta';
  if (assists >= 5) return 'Líder de Assistências';
  if (rating >= 7.3 && (p.matches || 0) >= 3) return 'Regularidade Acima da Média';
  if (p.age <= 22 && p.overall >= 72) return 'Jovem Promessa Valorizada';
  if (p.isListedForSale) return 'Disponível no Mercado';
  if (category === 'USER_PLAYER_TARGET') return 'Destaque no Elenco';
  if (category === 'OPPORTUNITY') return 'Encaixe Tático & Custo';
  return 'Movimentação de Janela';
}

function resolveDefaultHeat(p: Player, score: number): TransferRumorHeat {
  if (
    p.isListedForSale ||
    p.contractYears <= 1 ||
    (p.goals || 0) >= 7 ||
    (p.ratingAverage || 0) >= 7.4 ||
    score >= 86
  ) {
    return 'HOT';
  }
  if (score >= 70 || (p.goals || 0) >= 3 || (p.assists || 0) >= 3) {
    return 'WARM';
  }
  return 'WATCH';
}

function findRoleGapCount(club: Club): Record<string, number> {
  const counts: Record<string, number> = {
    GOL: 0,
    ZAG: 0,
    LD: 0,
    LE: 0,
    VOL: 0,
    MC: 0,
    MEI: 0,
    PE: 0,
    PD: 0,
    ATA: 0,
  };
  for (const p of club.squad) {
    counts[p.detailedRole] = (counts[p.detailedRole] || 0) + 1;
  }
  return counts;
}

/**
 * Selects up to `maxCandidates` realistic transfer rumor match-ups from the live GameSave,
 * grounded strictly in in-save player performance, market values, contract status, and club finances.
 */
export function selectTransferRumorCandidates(
  state: GameSave,
  maxCandidates: number = 9
): TransferRumorCandidate[] {
  const userClub = state.clubs.find((c) => c.id === state.userClubId);
  if (!userClub) return [];

  const pendingTransfers = state.pendingTransfers || [];
  const otherClubs = state.clubs.filter((c) => c.id !== userClub.id && c.squad.length > 0);
  if (otherClubs.length === 0) return [];

  const seed = state.currentSeasonYear * 31 + state.currentRound * 17;
  const candidates: TransferRumorCandidate[] = [];
  const usedPlayerIds = new Set<string>();

  const pushCandidate = (
    player: Player,
    currentClub: Club,
    interestedClub: Club,
    category: TransferRumorCategory,
    score: number
  ) => {
    if (usedPlayerIds.has(player.id)) return;
    if (currentClub.id === interestedClub.id) return;
    usedPlayerIds.add(player.id);

    const estimatedFee = computeEstimatedFee(player);
    candidates.push({
      id: `rumor-${state.currentSeasonYear}-${state.currentRound}-${player.id}`,
      playerId: player.id,
      playerName: player.name,
      playerRole: player.detailedRole,
      playerAge: player.age,
      playerOverall: player.overall,
      marketValue: player.marketValue,
      estimatedFee,
      matches: player.matches || 0,
      goals: player.goals || 0,
      assists: player.assists || 0,
      ratingAverage: getEffectiveRating(player),
      contractYears: player.contractYears,
      currentClubId: currentClub.id,
      currentClubName: currentClub.name,
      currentClubShortName: currentClub.shortName,
      currentClubDivision: currentClub.division,
      interestedClubId: interestedClub.id,
      interestedClubName: interestedClub.name,
      interestedClubShortName: interestedClub.shortName,
      interestedClubDivision: interestedClub.division,
      category,
      defaultHeat: resolveDefaultHeat(player, score),
      reasonTag: resolveReasonTag(player, category),
      isUserPlayerInvolved:
        currentClub.id === userClub.id || interestedClub.id === userClub.id,
    });
  };

  // 1. User club stars attracting external interest (2 to 3 rumors)
  const userCandidates = userClub.squad
    .filter(
      (p) =>
        !p.isLoan &&
        p.overall >= 65 &&
        !findPendingTransferForPlayer(pendingTransfers, p.id)
    )
    .map((player) => ({
      player,
      score: computePerformanceScore(player) + (player.isListedForSale ? 12 : 0),
    }))
    .sort((a, b) => b.score - a.score);

  let userTargetCount = 0;
  for (let i = 0; i < userCandidates.length && userTargetCount < 3; i += 1) {
    const { player, score } = userCandidates[i];
    const estimatedFee = computeEstimatedFee(player);
    const affordableClubs = otherClubs
      .filter(
        (c) =>
          c.finances.balance >= estimatedFee * 0.72 &&
          (c.division === 'EU' ||
            c.division === 'WL' ||
            c.division === 'A' ||
            c.reputation >= Math.max(40, userClub.reputation - 8))
      )
      .sort((a, b) => b.finances.balance - a.finances.balance);

    const fallbackPool =
      affordableClubs.length > 0
        ? affordableClubs
        : [...otherClubs].sort((a, b) => b.finances.balance - a.finances.balance);
    if (fallbackPool.length === 0) continue;

    const topWindow = Math.min(18, fallbackPool.length);
    const buyer = fallbackPool[(seed + i * 5) % topWindow];
    pushCandidate(player, userClub, buyer, 'USER_PLAYER_TARGET', score);
    userTargetCount += 1;
  }

  // 2. Market opportunities matching userClub squad needs & budget (3 to 4 rumors)
  const roleCounts = findRoleGapCount(userClub);
  const weakRoles = new Set(
    Object.entries(roleCounts)
      .filter(([, count]) => count <= 1)
      .map(([role]) => role)
  );
  const userAvgOvr =
    userClub.squad.length > 0
      ? userClub.squad.reduce((acc, p) => acc + p.overall, 0) / userClub.squad.length
      : 72;
  const budgetCap = Math.max(3_000_000, userClub.finances.balance * 1.15);

  const opportunityPool: Array<{ player: Player; club: Club; score: number }> = [];
  for (const club of otherClubs) {
    for (const p of club.squad) {
      if (p.isLoan || findPendingTransferForPlayer(pendingTransfers, p.id)) continue;
      if (p.overall < Math.max(64, Math.floor(userAvgOvr - 4))) continue;
      if (p.marketValue > budgetCap && p.contractYears > 1) continue;
      const roleFitBoost = weakRoles.has(p.detailedRole) ? 14 : 0;
      const bargainBoost = p.contractYears <= 1 || p.isListedForSale ? 10 : 0;
      const score = computePerformanceScore(p) + roleFitBoost + bargainBoost;
      opportunityPool.push({ player: p, club, score });
    }
  }
  opportunityPool.sort((a, b) => b.score - a.score);

  let oppCount = 0;
  const oppUsedClubs = new Set<string>();
  for (let i = 0; i < opportunityPool.length && oppCount < 3; i += 1) {
    const pick = opportunityPool[i];
    if (oppUsedClubs.has(pick.club.id) && oppCount < 2) continue;
    oppUsedClubs.add(pick.club.id);
    pushCandidate(pick.player, pick.club, userClub, 'OPPORTUNITY', pick.score);
    oppCount += 1;
  }

  // 3. League & international market buzz between rival clubs (up to maxCandidates)
  const buzzPool: Array<{ player: Player; club: Club; score: number }> = [];
  for (const club of otherClubs) {
    for (const p of club.squad) {
      if (p.isLoan || usedPlayerIds.has(p.id)) continue;
      if (findPendingTransferForPlayer(pendingTransfers, p.id)) continue;
      if (p.overall < 73 && (p.goals || 0) < 3 && (p.assists || 0) < 3) continue;
      const score = computePerformanceScore(p) + (p.marketValue >= 20_000_000 ? 10 : 0);
      buzzPool.push({ player: p, club, score });
    }
  }
  buzzPool.sort((a, b) => b.score - a.score);

  const richBuyers = [...otherClubs].sort((a, b) => b.finances.balance - a.finances.balance);
  const rotatedSlice = buzzPool.slice(0, 36);
  for (let i = 0; i < rotatedSlice.length && candidates.length < maxCandidates; i += 1) {
    const idx = (seed + i * 3) % rotatedSlice.length;
    const { player, club, score } = rotatedSlice[idx];
    if (usedPlayerIds.has(player.id)) continue;

    const fee = computeEstimatedFee(player);
    const eligibleBuyers = richBuyers.filter(
      (b) => b.id !== club.id && b.finances.balance >= fee * 0.7
    );
    const buyerPool = eligibleBuyers.length > 0 ? eligibleBuyers : richBuyers.filter((b) => b.id !== club.id);
    if (buyerPool.length === 0) continue;

    const buyer = buyerPool[(seed + i * 7) % Math.min(16, buyerPool.length)];
    pushCandidate(player, club, buyer, 'LEAGUE_BUZZ', score);
  }

  return candidates.slice(0, maxCandidates);
}

function formatCompactMoneyBrl(val: number): string {
  if (val >= 1_000_000) {
    return `R$ ${(val / 1_000_000).toFixed(1).replace('.', ',')}M`;
  }
  if (val >= 1_000) {
    return `R$ ${Math.round(val / 1_000)} mil`;
  }
  return `R$ ${val}`;
}

export function buildFallbackTransferRumors(
  candidates: TransferRumorCandidate[]
): TransferRumor[] {
  return candidates.map((c, idx) => {
    const statsParts: string[] = [];
    if (c.matches > 0) statsParts.push(`${c.matches} jogos`);
    if (c.goals > 0) statsParts.push(`${c.goals} gol${c.goals === 1 ? '' : 's'}`);
    if (c.assists > 0) statsParts.push(`${c.assists} assist.`);
    const statsLabel =
      statsParts.length > 0
        ? `${statsParts.join(', ')} e média ${c.ratingAverage.toFixed(1)}`
        : `OVR ${c.playerOverall} e regularidade técnica`;

    const feeStr = formatCompactMoneyBrl(c.estimatedFee);
    const marketStr = formatCompactMoneyBrl(c.marketValue);

    let headline = '';
    let summary = '';
    if (c.category === 'USER_PLAYER_TARGET') {
      headline = `${c.interestedClubShortName} monitora ${c.playerName} e avalia investida de ${feeStr}`;
      summary = `Com ${statsLabel} pelo ${c.currentClubShortName}, o ${c.playerRole} chamou atenção dos olheiros do ${c.interestedClubName}. Avaliado em ${marketStr}, o atleta pode receber abordagem oficial ainda nesta janela.`;
    } else if (c.category === 'OPPORTUNITY') {
      headline = `Oportunidade no radar: ${c.playerName} (${c.currentClubShortName}) agrada ao departamento de futebol`;
      summary = `Somando ${statsLabel} na temporada, o ${c.playerRole} de ${c.playerAge} anos tem passe estimado em ${feeStr} (valor de mercado ${marketStr}) e aparece como opção viável para reforçar o ${c.interestedClubShortName}.`;
    } else {
      headline = `${c.interestedClubShortName} estuda proposta por ${c.playerName}, destaque do ${c.currentClubShortName}`;
      summary = `Em grande fase (${statsLabel}), o ${c.playerRole} entrou na pauta do ${c.interestedClubName}. O negócio é projetado na casa de ${feeStr} diante do valor de mercado de ${marketStr}.`;
    }

    return {
      id: c.id,
      playerId: c.playerId,
      playerName: c.playerName,
      playerRole: c.playerRole,
      playerAge: c.playerAge,
      playerOverall: c.playerOverall,
      marketValue: c.marketValue,
      estimatedFee: c.estimatedFee,
      matches: c.matches,
      goals: c.goals,
      assists: c.assists,
      ratingAverage: c.ratingAverage,
      currentClubId: c.currentClubId,
      currentClubName: c.currentClubName,
      currentClubShortName: c.currentClubShortName,
      interestedClubId: c.interestedClubId,
      interestedClubName: c.interestedClubName,
      interestedClubShortName: c.interestedClubShortName,
      category: c.category,
      heatLevel: c.defaultHeat,
      sourceOutlet: OUTLET_NAMES[idx % OUTLET_NAMES.length],
      headline,
      summary,
      reasonTag: c.reasonTag,
      isUserPlayerInvolved: c.isUserPlayerInvolved,
      generatedByAi: false,
    };
  });
}
