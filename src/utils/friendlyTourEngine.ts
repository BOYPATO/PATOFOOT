import { Club, Fixture, InboxMessage } from '../types/game';
import { addDays, formatShortDate } from './calendarUtils';
import {
  MIN_MATCH_REST_HOURS,
  getDefaultKickoffTimeForDate,
  meetsMinRestInterval,
} from './scheduleConflictResolver';

export type FriendlyPackageId = 'USA_TOUR' | 'ASIA_TOUR' | 'EURO_CHALLENGE' | 'HOME_FESTIVAL';

export interface FriendlyTourPackage {
  id: FriendlyPackageId;
  title: string;
  subtitle: string;
  badge: string;
  matchesCount: 1 | 2;
  commercialFeePerMatch: number;
  xpBonusLabel: string;
  staminaNote: string;
  stadiumOverride?: string;
}

export function getFriendlyPackagesForClub(userClub: Club): FriendlyTourPackage[] {
  const repScale = Math.max(1, userClub.reputation || 3);
  const divMult =
    userClub.division === 'EU'
      ? 1.55
      : userClub.division === 'A' || userClub.division === 'SA' || userClub.division === 'WL'
      ? 1.15
      : userClub.division === 'B'
      ? 0.65
      : 0.4;

  const round50k = (v: number) => Math.max(150_000, Math.round(v / 50_000) * 50_000);

  return [
    {
      id: 'USA_TOUR',
      title: 'Excursão EUA · US Soccer Tour',
      subtitle: '2 amistosos comerciais em Miami e Orlando contra estrelas da América do Norte',
      badge: '🇺🇸',
      matchesCount: 2,
      commercialFeePerMatch: round50k(1_350_000 * (repScale / 3) * divMult),
      xpBonusLabel: '+8% Progresso de Treino e +Moral Internacional',
      staminaNote: 'Exige 2 datas livres na agenda',
      stadiumOverride: 'Hard Rock Stadium (Miami)',
    },
    {
      id: 'ASIA_TOUR',
      title: 'Giro Asiático · Riad & Tóquio',
      subtitle: '2 superjogos patrocinados contra potências sauditas e japonesas',
      badge: '🌏',
      matchesCount: 2,
      commercialFeePerMatch: round50k(1_850_000 * (repScale / 3) * divMult),
      xpBonusLabel: 'Maior cota comercial por partida + Exposição Global',
      staminaNote: 'Exige 2 datas livres na agenda',
      stadiumOverride: 'Kingdom Arena / Estádio Nacional de Tóquio',
    },
    {
      id: 'EURO_CHALLENGE',
      title: 'Desafio Internacional Europeu',
      subtitle: '1 amistoso de luxo contra clube tradicional europeu para testar o time titular',
      badge: '🇪🇺',
      matchesCount: 1,
      commercialFeePerMatch: round50k(1_600_000 * (repScale / 3) * divMult),
      xpBonusLabel: '+12% XP técnico para titulares e jovens utilizados',
      staminaNote: 'Apenas 1 data livre necessária',
      stadiumOverride: 'Arena Internacional (Campo Neutro)',
    },
    {
      id: 'HOME_FESTIVAL',
      title: 'Amistoso Festivo no Seu Estádio',
      subtitle: 'Receba um convidado no seu estádio para faturar bilheteria + cota de TV sem viagem',
      badge: '🏟️',
      matchesCount: 1,
      commercialFeePerMatch: round50k(750_000 * (repScale / 3) * divMult),
      xpBonusLabel: 'Soma Cota de TV + 100% da Bilheteria em Casa',
      staminaNote: 'Baixo desgaste físico · Ideal para dar ritmo aos reservas',
    },
  ];
}

/**
 * Encontra as próximas datas livres para o clube do usuário respeitando estritamente
 * o intervalo mínimo regulamentar de 66 horas em relação a qualquer jogo marcado.
 */
export function findAvailableFriendlyDates(params: {
  currentDate: string;
  userClubId: string;
  allFixtures: Fixture[];
  neededCount: number;
  kickoffTime?: string;
}): string[] {
  const { currentDate, userClubId, allFixtures, neededCount, kickoffTime = '20:00' } = params;
  const userMatches = allFixtures
    .filter((f) => (f.homeTeamId === userClubId || f.awayTeamId === userClubId) && Boolean(f.date))
    .map((f) => ({
      date: f.date as string,
      time: f.time || getDefaultKickoffTimeForDate(f.date as string),
    }));

  const chosen: Array<{ date: string; time: string }> = [];
  const cursor = addDays(currentDate, 3);

  for (let step = 0; step < 150 && chosen.length < neededCount; step++) {
    const candidate = addDays(cursor, step);
    const allExisting = [...userMatches, ...chosen];
    const hasConflict = allExisting.some(
      (existing) =>
        !meetsMinRestInterval(existing.date, existing.time, candidate, kickoffTime, MIN_MATCH_REST_HOURS)
    );
    if (!hasConflict) {
      chosen.push({ date: candidate, time: kickoffTime });
    }
  }

  return chosen.map((c) => c.date);
}

export function scheduleFriendlyTourFixtures(params: {
  pkg: FriendlyTourPackage;
  userClub: Club;
  allClubs: Club[];
  allFixtures: Fixture[];
  currentDate: string;
  currentRound: number;
  preferredOpponentId?: string;
}): {
  success: boolean;
  errorMessage?: string;
  createdFixtures: Fixture[];
  inboxMessage?: InboxMessage;
} {
  const {
    pkg,
    userClub,
    allClubs,
    allFixtures,
    currentDate,
    currentRound,
    preferredOpponentId,
  } = params;

  const existingUnplayedFriendlies = allFixtures.filter(
    (f) =>
      f.competition === 'amistoso_internacional' &&
      !f.played &&
      (f.homeTeamId === userClub.id || f.awayTeamId === userClub.id)
  );
  if (existingUnplayedFriendlies.length >= 3) {
    return {
      success: false,
      errorMessage:
        'Seu clube já possui 3 amistosos agendados no calendário. Dispute os atuais antes de marcar nova excursão.',
      createdFixtures: [],
    };
  }

  const kickoffTime = pkg.id === 'HOME_FESTIVAL' ? '20:00' : '21:30';
  const freeDates = findAvailableFriendlyDates({
    currentDate,
    userClubId: userClub.id,
    allFixtures,
    neededCount: pkg.matchesCount,
    kickoffTime,
  });

  if (freeDates.length < pkg.matchesCount) {
    return {
      success: false,
      errorMessage:
        'Não há datas livres suficientes nos próximos meses respeitando o intervalo mínimo regulamentar de 66 horas entre partidas.',
      createdFixtures: [],
    };
  }

  const others = allClubs.filter((c) => c.id !== userClub.id);
  let candidatePool: Club[] = [];

  if (pkg.id === 'USA_TOUR') {
    candidatePool = others.filter(
      (c) => c.worldLeagueId === 'usa_mls' || c.worldLeagueId === 'mex_ligamx'
    );
  } else if (pkg.id === 'ASIA_TOUR') {
    candidatePool = others.filter(
      (c) => c.worldLeagueId === 'sau_pro' || c.worldLeagueId === 'jpn_j1'
    );
  } else if (pkg.id === 'EURO_CHALLENGE') {
    candidatePool = others.filter((c) => c.division === 'EU');
  } else if (preferredOpponentId) {
    const exact = others.find((c) => c.id === preferredOpponentId);
    if (exact) candidatePool = [exact];
  }

  if (candidatePool.length < pkg.matchesCount) {
    candidatePool = [...others].sort((a, b) => b.reputation - a.reputation);
  }

  // Deterministic varied selection by currentDate
  const seed = currentDate.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  const rotated = [...candidatePool].sort((a, b) => {
    const ha = (a.name.charCodeAt(0) * 19 + seed) % 37;
    const hb = (b.name.charCodeAt(0) * 19 + seed) % 37;
    return ha - hb;
  });

  // Build quick map of each opponent's busy matches so friendlies strictly obey the 66h rule for opponents too
  const busyMatchesByClub = new Map<string, Array<{ date: string; time: string }>>();
  for (const fx of allFixtures) {
    if (!fx.date) continue;
    const item = { date: fx.date, time: fx.time || getDefaultKickoffTimeForDate(fx.date) };
    for (const tid of [fx.homeTeamId, fx.awayTeamId]) {
      if (!tid || tid === 'tbd' || tid.startsWith('TBD')) continue;
      const arr = busyMatchesByClub.get(tid);
      if (arr) arr.push(item);
      else busyMatchesByClub.set(tid, [item]);
    }
  }

  const pickFreeOpponentForDate = (dateStr: string, usedIds: Set<string>): Club => {
    const poolsToTry = [rotated, others];
    // Pass 1: opponent has >= 90h ideal spacing
    for (const pool of poolsToTry) {
      const ideal = pool.find((c) => {
        if (usedIds.has(c.id)) return false;
        const matches = busyMatchesByClub.get(c.id) || [];
        return matches.every((m) => meetsMinRestInterval(m.date, m.time, dateStr, kickoffTime, 90));
      });
      if (ideal) return ideal;
    }
    // Pass 2: opponent strictly respects >= 66h rule
    for (const pool of poolsToTry) {
      const valid66h = pool.find((c) => {
        if (usedIds.has(c.id)) return false;
        const matches = busyMatchesByClub.get(c.id) || [];
        return matches.every((m) =>
          meetsMinRestInterval(m.date, m.time, dateStr, kickoffTime, MIN_MATCH_REST_HOURS)
        );
      });
      if (valid66h) return valid66h;
    }
    return rotated.find((c) => !usedIds.has(c.id)) || rotated[0] || others[0] || userClub;
  };

  const usedOppIds = new Set<string>();
  const opponents: Club[] = freeDates.map((dateStr) => {
    const picked = pickFreeOpponentForDate(dateStr, usedOppIds);
    usedOppIds.add(picked.id);
    return picked;
  });
  const tourId = `tour_${pkg.id}_${Date.now()}`;

  const createdFixtures: Fixture[] = freeDates.map((dateStr, idx) => {
    const opp = opponents[idx] || others[idx] || userClub;
    const isHome = pkg.id === 'HOME_FESTIVAL' ? true : idx % 2 === 0;
    return {
      id: `fr_${tourId}_${idx + 1}`,
      round: currentRound,
      competition: 'amistoso_internacional',
      homeTeamId: isHome ? userClub.id : opp.id,
      awayTeamId: isHome ? opp.id : userClub.id,
      homeScore: null,
      awayScore: null,
      played: false,
      date: dateStr,
      time: pkg.id === 'HOME_FESTIVAL' ? '20:00' : '21:30',
      stadiumName:
        pkg.id === 'HOME_FESTIVAL'
          ? userClub.stadium.name
          : pkg.stadiumOverride || opp.stadium.name,
      cupPhase: pkg.title,
      friendlyCommercialFee: pkg.commercialFeePerMatch,
      friendlyTourId: tourId,
      friendlyTourTitle: pkg.title,
    };
  });

  const totalGuaranteed = pkg.commercialFeePerMatch * createdFixtures.length;
  const fmtMoney = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  }).format(totalGuaranteed);

  const datesSummary = createdFixtures
    .map((f) => {
      const oppId = f.homeTeamId === userClub.id ? f.awayTeamId : f.homeTeamId;
      const oppName = allClubs.find((c) => c.id === oppId)?.shortName || 'Adversário';
      return `${formatShortDate(f.date || currentDate)} vs ${oppName}`;
    })
    .join(' · ');

  const inboxMessage: InboxMessage = {
    id: `inbox_${tourId}`,
    title: `${pkg.badge} Agenda Confirmada: ${pkg.title}`,
    message: `O departamento comercial confirmou ${
      createdFixtures.length === 1 ? 'o amistoso' : `os ${createdFixtures.length} jogos`
    } (${datesSummary}). A cota garantida total é de ${fmtMoney}, creditada automaticamente no caixa ao final de cada partida disputada!`,
    date: currentDate,
    round: currentRound,
    read: false,
    type: 'FINANCE',
  };

  return {
    success: true,
    createdFixtures,
    inboxMessage,
  };
}
