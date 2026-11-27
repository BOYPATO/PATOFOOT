import { Club, GameSave, Player } from '../types/game';
import { getTransferWindowStatus } from './transferWindowEngine';

export interface DeadlineFlashOffer {
  id: string;
  playerId: string;
  playerName: string;
  playerRole: Player['detailedRole'];
  playerOverall: number;
  playerAge: number;
  buyerClubId: string;
  buyerClubName: string;
  buyerClubShortName: string;
  offerAmount: number;
  counterAmount: number;
  hourLabel: string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'COUNTER_ACCEPTED' | 'COUNTER_REJECTED';
}

export interface DeadlineBargainTarget {
  id: string;
  player: Player;
  sellerClubId?: string;
  sellerClubName: string;
  marketValue: number;
  bargainPrice: number;
  discountPct: number;
  requestedWage: number;
  tagLabel: string;
  signed?: boolean;
}

export interface DeadlineNewsItem {
  id: string;
  hourLabel: string;
  headline: string;
  highlight?: boolean;
}

export interface DeadlineDaySession {
  windowKey: string; // e.g. '2026_JAN_FEB' or '2026_JUL_AUG'
  windowLabel: string;
  closesOnDisplay: string;
  currentHour: number; // 12, 14, 16, 18, 20, 22, 24 (closed)
  flashOffers: DeadlineFlashOffer[];
  bargainTargets: DeadlineBargainTarget[];
  newsFeed: DeadlineNewsItem[];
}

export function getDeadlineDayWindowKey(
  dateStr?: string,
  clubOrDivision?: Pick<Club, 'division'> | Club['division']
): {
  isDeadlinePeriod: boolean;
  windowKey: string;
  windowLabel: string;
  closesOnDisplay: string;
  daysLeft: number;
} {
  const status = getTransferWindowStatus(dateStr, clubOrDivision);
  const year = (dateStr || '2026-01-11').slice(0, 4);
  const isDeadlinePeriod = status.isOpen && status.daysUntilChange <= 2;
  return {
    isDeadlinePeriod,
    windowKey: `${year}_${status.windowCode}`,
    windowLabel: status.windowTitle,
    closesOnDisplay: status.closesOnDisplay || '',
    daysLeft: status.daysUntilChange,
  };
}

export function generateDeadlineDaySession(
  save: GameSave,
  sellBonusPct: number = 0,
  buyDiscountPct: number = 0
): DeadlineDaySession {
  const userClub = save.clubs.find((c) => c.id === save.userClubId) || save.clubs[0];
  const info = getDeadlineDayWindowKey(save.currentDate, userClub);
  const otherClubs = save.clubs.filter(
    (c) => c.id !== userClub.id && !c.id.startsWith('guest_') && c.squad.length >= 16
  );

  // 1. Pick up to 3 enticing flash offers for user players
  const eligibleUserPlayers = [...userClub.squad]
    .filter((p) => !p.isLoan && p.injuryWeeks === 0 && !p.preContractClubId)
    .sort((a, b) => {
      const aListed = a.isListedForSale ? 12 : 0;
      const bListed = b.isListedForSale ? 12 : 0;
      return b.overall + bListed - (a.overall + aListed);
    });

  const offerCandidates = eligibleUserPlayers.slice(0, 8);
  const shuffledCandidates = [...offerCandidates].sort(() => Math.random() - 0.5).slice(0, 3);

  const buyersPool = [...otherClubs]
    .filter((c) => c.reputation >= Math.max(2, userClub.reputation - 1))
    .sort(() => Math.random() - 0.5);

  const sellMult = 1 + sellBonusPct / 100;
  const flashOffers: DeadlineFlashOffer[] = shuffledCandidates.map((p, idx) => {
    const buyer = buyersPool[idx] || otherClubs[idx] || userClub;
    const urgencyMult = 1.05 + Math.random() * 0.22;
    const baseOffer = Math.max(
      250_000,
      Math.round((p.marketValue * urgencyMult * sellMult) / 50_000) * 50_000
    );
    const counterAmount = Math.round((baseOffer * 1.15) / 50_000) * 50_000;
    const hours = ['12:30', '15:15', '18:40'];
    return {
      id: `dd_offer_${p.id}_${Date.now()}_${idx}`,
      playerId: p.id,
      playerName: p.name,
      playerRole: p.detailedRole,
      playerOverall: p.overall,
      playerAge: p.age,
      buyerClubId: buyer.id,
      buyerClubName: buyer.name,
      buyerClubShortName: buyer.shortName,
      offerAmount: baseOffer,
      counterAmount,
      hourLabel: hours[idx] || '19:00',
      status: 'PENDING',
    };
  });

  // 2. Pick up to 5 last-minute bargain opportunities (club players at 15-25% off + 1 top free agent)
  const userAvgOvr =
    userClub.squad.length > 0
      ? userClub.squad.reduce((s, p) => s + p.overall, 0) / userClub.squad.length
      : 72;

  const bargainTargets: DeadlineBargainTarget[] = [];
  const sampledSellerClubs = [...otherClubs]
    .filter((c) => c.squad.length >= 20)
    .sort(() => Math.random() - 0.5)
    .slice(0, 24);

  for (const club of sampledSellerClubs) {
    if (bargainTargets.length >= 4) break;
    const candidate = club.squad.find(
      (p) =>
        !p.isLoan &&
        p.injuryWeeks === 0 &&
        p.overall >= Math.max(60, Math.round(userAvgOvr - 4)) &&
        p.overall <= Math.min(91, Math.round(userAvgOvr + 6)) &&
        p.marketValue <= Math.max(userClub.finances.balance * 1.35, 8_000_000)
    );
    if (!candidate) continue;
    const baseDiscount = 15 + Math.floor(Math.random() * 11); // 15%..25%
    const totalDiscount = Math.min(35, baseDiscount + buyDiscountPct);
    const bargainPrice = Math.max(
      150_000,
      Math.round((candidate.marketValue * (1 - totalDiscount / 100)) / 50_000) * 50_000
    );
    const requestedWage = Math.max(
      15_000,
      Math.round((candidate.wage * (1 - buyDiscountPct / 100) * 1.05) / 5_000) * 5_000
    );
    bargainTargets.push({
      id: `dd_bargain_${candidate.id}_${Date.now()}`,
      player: candidate,
      sellerClubId: club.id,
      sellerClubName: club.shortName,
      marketValue: candidate.marketValue,
      bargainPrice,
      discountPct: totalDiscount,
      requestedWage,
      tagLabel: candidate.age <= 22 ? 'Joia em Liquidação' : 'Oportunidade de Fechamento',
    });
  }

  // Add 1 free agent gem if available
  const topFreeAgent = [...(save.transferMarket || [])]
    .filter((p) => p.overall >= Math.max(60, Math.round(userAvgOvr - 6)))
    .sort((a, b) => b.overall - a.overall)[0];

  if (topFreeAgent) {
    bargainTargets.push({
      id: `dd_free_${topFreeAgent.id}_${Date.now()}`,
      player: topFreeAgent,
      sellerClubName: 'Sem Clube (Livre)',
      marketValue: topFreeAgent.marketValue,
      bargainPrice: 0,
      discountPct: 100,
      requestedWage: Math.max(
        15_000,
        Math.round((topFreeAgent.wage * (1 - buyDiscountPct / 100)) / 5_000) * 5_000
      ),
      tagLabel: 'Livre no Mercado (Sem Taxa)',
    });
  }

  // 3. Initial live news feed
  const newsFeed: DeadlineNewsItem[] = [
    {
      id: `dd_news_open_${Date.now()}`,
      hourLabel: '12:00',
      headline: `Plantão ao vivo! Faltam poucas horas para o fechamento da ${info.windowLabel} (${info.closesOnDisplay}).`,
      highlight: true,
    },
    ...buildRandomRivalDeadlineHeadlines(otherClubs, '12:15', 2),
  ];

  return {
    windowKey: info.windowKey,
    windowLabel: info.windowLabel,
    closesOnDisplay: info.closesOnDisplay,
    currentHour: 12,
    flashOffers,
    bargainTargets,
    newsFeed,
  };
}

export function buildRandomRivalDeadlineHeadlines(
  otherClubs: Club[],
  hourLabel: string,
  count: number = 2
): DeadlineNewsItem[] {
  const results: DeadlineNewsItem[] = [];
  if (otherClubs.length < 2) return results;

  for (let i = 0; i < count; i++) {
    const seller = otherClubs[Math.floor(Math.random() * otherClubs.length)];
    const buyer = otherClubs[Math.floor(Math.random() * otherClubs.length)];
    if (!seller || !buyer || seller.id === buyer.id || seller.squad.length === 0) continue;
    const star = [...seller.squad].sort((a, b) => b.overall - a.overall)[
      Math.min(2, Math.floor(Math.random() * Math.min(6, seller.squad.length)))
    ];
    if (!star) continue;
    const feeM = Math.max(1, Math.round(star.marketValue / 1_000_000));
    const templates = [
      `FECHADO! ${buyer.shortName} acerta contratação relâmpago de ${star.name} (${star.detailedRole}, OVR ${star.overall}) junto ao ${seller.shortName} por cerca de R$ ${feeM} mi.`,
      `RUMOR QUENTE: ${buyer.shortName} corre contra o relógio no BID para registrar ${star.name} (ex-${seller.shortName}) antes das 23h59.`,
      `CHAPÉU NA JANELA! ${buyer.shortName} atravessa negociação e encaminha empréstimo de ${star.name} (${seller.shortName}).`,
    ];
    results.push({
      id: `dd_rival_${Date.now()}_${i}_${Math.random().toString(36).slice(2, 6)}`,
      hourLabel,
      headline: templates[i % templates.length],
    });
  }

  return results;
}
