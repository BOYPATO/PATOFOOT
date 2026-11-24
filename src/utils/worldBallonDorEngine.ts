import {
  Club,
  GameSave,
  InboxMessage,
  Player,
  WorldBallonDorAward,
  WorldBallonDorCandidate,
} from '../types/game';
import {
  EUROPEAN_LEAGUES_META,
  getClubEuropeanLeagueId,
} from './europeLeaguesEngine';
import {
  SOUTH_AMERICAN_LEAGUES_META,
  getClubSouthAmericanLeagueId,
} from './southAmericaLeaguesEngine';
import {
  WORLD_LEAGUES_META,
  getClubWorldLeagueId,
} from './worldLeaguesEngine';
import { resolveCupChampionId } from './multiLeagueEngine';

function getClubLeaguePrestige(club: Club): { label: string; multiplier: number } {
  if (club.division === 'EU') {
    const euId = getClubEuropeanLeagueId(club);
    const meta = euId ? EUROPEAN_LEAGUES_META[euId] : null;
    const isTop5 =
      euId === 'eng_premier' ||
      euId === 'esp_laliga' ||
      euId === 'ita_serie_a' ||
      euId === 'ger_bundesliga' ||
      euId === 'fra_ligue1';
    const isSecondTier =
      euId === 'eng_championship' || euId === 'eng_league_one' || euId === 'eng_league_two';
    return {
      label: meta ? meta.shortName : 'Europa',
      multiplier: isTop5 ? 1.12 : isSecondTier ? 0.88 : 1.03,
    };
  }

  if (club.division === 'SA') {
    const saId = getClubSouthAmericanLeagueId(club);
    const meta = saId ? SOUTH_AMERICAN_LEAGUES_META[saId] : null;
    return {
      label: meta ? meta.shortName : 'América do Sul',
      multiplier: saId === 'liga_arg' ? 1.03 : 0.98,
    };
  }

  if (club.division === 'WL') {
    const wlId = getClubWorldLeagueId(club);
    const meta = wlId ? WORLD_LEAGUES_META[wlId] : null;
    return {
      label: meta ? meta.shortName : 'Liga Internacional',
      multiplier: wlId === 'sau_pro' || wlId === 'usa_mls' || wlId === 'mex_ligamx' ? 1.01 : 0.96,
    };
  }

  if (club.division === 'A') {
    return { label: 'Brasileirão Série A', multiplier: 1.05 };
  }
  if (club.division === 'B') {
    return { label: 'Brasileirão Série B', multiplier: 0.88 };
  }
  if (club.division === 'C') {
    return { label: 'Brasileirão Série C', multiplier: 0.82 };
  }
  return { label: 'Brasileirão Série D', multiplier: 0.78 };
}

function collectSeasonChampionClubIds(state: GameSave, targetYear: number): Map<string, number> {
  const bonusByClubId = new Map<string, number>();
  const addBonus = (clubId: string | undefined, pts: number) => {
    if (!clubId || clubId === 'tbd') return;
    bonusByClubId.set(clubId, (bonusByClubId.get(clubId) || 0) + pts);
  };

  // Continental & World Cup Champions
  addBonus(resolveCupChampionId(state.fixturesChampionsLeague), 42);
  addBonus(resolveCupChampionId(state.fixturesLibertadores), 36);
  addBonus(resolveCupChampionId(state.fixturesSuperMundial), 48);
  addBonus(resolveCupChampionId(state.fixturesIntercontinental), 28);
  addBonus(resolveCupChampionId(state.fixturesCopaInternacional), 26);
  addBonus(resolveCupChampionId(state.fixturesConcacafChampions), 28);
  addBonus(resolveCupChampionId(state.fixturesEuropaLeague), 22);
  addBonus(resolveCupChampionId(state.fixturesSulamericana), 20);
  addBonus(resolveCupChampionId(state.fixturesCopaBrasil), 18);

  // League Leaders / Champions
  if ((state.standingsA?.[0]?.played || 0) >= 10) {
    addBonus(state.standingsA[0]?.teamId, 24);
  }
  if (state.standingsEurope) {
    for (const [euId, list] of Object.entries(state.standingsEurope)) {
      if ((list?.[0]?.played || 0) >= 10) {
        const isTop5 =
          euId === 'eng_premier' ||
          euId === 'esp_laliga' ||
          euId === 'ita_serie_a' ||
          euId === 'ger_bundesliga' ||
          euId === 'fra_ligue1';
        addBonus(list?.[0]?.teamId, isTop5 ? 28 : 16);
      }
    }
  }
  if (state.standingsSouthAmerica) {
    for (const list of Object.values(state.standingsSouthAmerica)) {
      if ((list?.[0]?.played || 0) >= 10) {
        addBonus(list?.[0]?.teamId, 16);
      }
    }
  }
  if (state.standingsWorldLeagues) {
    for (const list of Object.values(state.standingsWorldLeagues)) {
      if ((list?.[0]?.played || 0) >= 10) {
        addBonus(list?.[0]?.teamId, 15);
      }
    }
  }

  // Also check trophyHistory for targetYear
  for (const t of state.trophyHistory || []) {
    if (t.year === targetYear) {
      const winnerClub = state.clubs.find((c) => c.name === t.championTeamName);
      if (winnerClub) {
        addBonus(winnerClub.id, 14);
      }
    }
  }

  return bonusByClubId;
}

function scorePlayerForBallonDor(
  player: Player,
  club: Club,
  clubTitleBonus: number,
  hasSeasonMatches: boolean
): { points: number; leagueLabel: string } {
  const { label: leagueLabel, multiplier } = getClubLeaguePrestige(club);

  if (!hasSeasonMatches) {
    // Early-season live projection before matches accumulate
    const baseProj =
      (player.overall - 68) * 9.5 +
      (player.ratingAverage - 6.5) * 22 +
      club.reputation * 3.5 +
      (player.position === 'FW' ? 6 : player.position === 'MF' ? 4 : 1);
    return {
      points: Math.max(10, Math.round(baseProj * multiplier)),
      leagueLabel,
    };
  }

  const goalWeight =
    player.position === 'FW'
      ? 4.4
      : player.position === 'MF'
      ? 5.3
      : player.position === 'DF'
      ? 6.8
      : 8.0;
  const assistWeight = 3.5;

  const goalsScore = player.goals * goalWeight;
  const assistsScore = player.assists * assistWeight;
  const matchesCap = Math.min(48, player.matches);
  const consistencyScore =
    player.matches >= 4 ? (player.ratingAverage - 6.2) * 32 + matchesCap * 0.75 : 0;
  const gkCleanBonus =
    player.position === 'GK' && player.matches >= 10
      ? Math.max(0, (player.ratingAverage - 6.6) * 28 + (player.overall - 76) * 1.8)
      : 0;
  const worldClassBase = Math.max(0, (player.overall - 72) * 3.9);
  const disciplinePenalty = player.redCards * 5;

  const rawPoints =
    (goalsScore +
      assistsScore +
      consistencyScore +
      gkCleanBonus +
      worldClassBase +
      clubTitleBonus -
      disciplinePenalty) *
    multiplier;

  return {
    points: Math.max(5, Math.round(rawPoints)),
    leagueLabel,
  };
}

/**
 * Computes the live or season-end World Ballon d'Or Top 10, Podium (Gold/Silver/Bronze),
 * and Golden Boy U-21 across all leagues in the world.
 */
export function computeWorldBallonDorStandings(
  state: GameSave,
  targetYear?: number
): WorldBallonDorAward {
  const year = targetYear ?? state.currentSeasonYear;
  const clubTitleBonuses = collectSeasonChampionClubIds(state, year);

  const maxMatchesAnyPlayer = state.clubs.reduce((maxM, club) => {
    const clubMax = club.squad.reduce((m, p) => (p.matches > m ? p.matches : m), 0);
    return clubMax > maxM ? clubMax : maxM;
  }, 0);
  const hasSeasonMatches = maxMatchesAnyPlayer >= 3;

  const allScored: WorldBallonDorCandidate[] = [];

  for (const club of state.clubs) {
    const titleBonus = clubTitleBonuses.get(club.id) || 0;
    for (const player of club.squad) {
      if (hasSeasonMatches && player.matches < 2 && player.overall < 84) continue;
      const { points, leagueLabel } = scorePlayerForBallonDor(
        player,
        club,
        titleBonus,
        hasSeasonMatches
      );
      allScored.push({
        rank: 0,
        playerId: player.id,
        playerName: player.name,
        nationality: player.nationality || 'Brasil',
        detailedRole: player.detailedRole,
        age: player.age,
        overall: player.overall,
        clubId: club.id,
        clubName: club.name,
        clubShortName: club.shortName,
        clubColors: club.colors,
        leagueLabel,
        goals: player.goals,
        assists: player.assists,
        matches: player.matches,
        ratingAverage: player.ratingAverage,
        ballonDorPoints: points,
        userWon: club.id === state.userClubId,
      });
    }
  }

  allScored.sort((a, b) => {
    if (b.ballonDorPoints !== a.ballonDorPoints) return b.ballonDorPoints - a.ballonDorPoints;
    if (b.goals + b.assists !== a.goals + a.assists) {
      return b.goals + b.assists - (a.goals + a.assists);
    }
    return b.overall - a.overall;
  });

  const top10 = allScored.slice(0, 10).map((cand, idx) => ({
    ...cand,
    rank: idx + 1,
  }));

  const u21Pool = allScored.filter((c) => c.age <= 21);
  const goldenBoyU21 = u21Pool[0]
    ? {
        ...u21Pool[0],
        rank: 1,
      }
    : undefined;

  const fallbackCandidate = (rank: number, name: string): WorldBallonDorCandidate => ({
    rank,
    playerId: `fallback_bd_${rank}`,
    playerName: name,
    nationality: 'Brasil',
    detailedRole: 'ATA',
    age: 25,
    overall: 90 - rank,
    clubId: state.userClubId,
    clubName: 'Futebol Mundial',
    clubShortName: 'MUN',
    clubColors: { primary: '#f59e0b', secondary: '#0f172a', text: '#ffffff' },
    leagueLabel: 'Futebol Mundial',
    goals: 0,
    assists: 0,
    matches: 0,
    ratingAverage: 7.5,
    ballonDorPoints: 100 - rank * 10,
    userWon: false,
  });

  return {
    year,
    awardedAtDate: state.currentDate,
    winner: top10[0] || fallbackCandidate(1, 'Melhor do Mundo'),
    silver: top10[1] || fallbackCandidate(2, 'Bola de Prata'),
    bronze: top10[2] || fallbackCandidate(3, 'Bola de Bronze'),
    goldenBoyU21,
    top10,
  };
}

/**
 * Awards the official annual World Ballon d'Or at the end of a calendar/season cycle,
 * granting +1 OVR and market value boost to the winner (and Golden Boy U-21) + club prestige bonus.
 */
export function processWorldBallonDorCeremony(
  state: GameSave,
  ceremonyYear: number,
  ceremonyDate: string
): { updatedState: GameSave; award: WorldBallonDorAward | null } {
  const existing = state.worldBallonDorHistory || [];
  if (existing.some((a) => a.year === ceremonyYear)) {
    return {
      updatedState: state,
      award: existing.find((a) => a.year === ceremonyYear) || null,
    };
  }

  const computed = computeWorldBallonDorStandings(state, ceremonyYear);
  const award: WorldBallonDorAward = {
    ...computed,
    year: ceremonyYear,
    awardedAtDate: ceremonyDate,
  };

  const winnerId = award.winner.playerId;
  const winnerClubId = award.winner.clubId;
  const goldenBoyId = award.goldenBoyU21?.playerId;

  const updatedClubs = state.clubs.map((club) => {
    const hasWinner = club.id === winnerClubId;
    const hasGoldenBoy = Boolean(goldenBoyId && club.squad.some((p) => p.id === goldenBoyId));
    if (!hasWinner && !hasGoldenBoy) return club;

    const prestigePrize = hasWinner ? 15_000_000 : 0;
    return {
      ...club,
      finances:
        prestigePrize > 0
          ? {
              ...club.finances,
              balance: club.finances.balance + prestigePrize,
              totalIncomeSeason: club.finances.totalIncomeSeason + prestigePrize,
            }
          : club.finances,
      squad: club.squad.map((p) => {
        if (p.id === winnerId) {
          return {
            ...p,
            overall: Math.min(99, p.overall + 1),
            marketValue: p.marketValue + 35_000_000,
            morale: 'Excelente' as const,
          };
        }
        if (goldenBoyId && p.id === goldenBoyId) {
          return {
            ...p,
            overall: Math.min(99, p.overall + 1),
            marketValue: p.marketValue + 18_000_000,
            morale: 'Excelente' as const,
          };
        }
        return p;
      }),
    };
  });

  const userWonGold = award.winner.clubId === state.userClubId;
  const galaMsg: InboxMessage = {
    id: `msg_ballon_dor_${ceremonyYear}_${Date.now()}`,
    title: userWonGold
      ? `🥇 BOLA DE OURO NO SEU CLUBE! ${award.winner.playerName} é eleito o Melhor do Mundo em ${ceremonyYear}!`
      : `🌍 Gala Bola de Ouro ${ceremonyYear}: ${award.winner.playerName} (${award.winner.clubShortName}) é o Melhor do Mundo!`,
    message: `Em cerimônia histórica da temporada ${ceremonyYear}, ${award.winner.playerName} (${award.winner.clubName} · ${award.winner.leagueLabel}) conquistou a Bola de Ouro Mundial com ${award.winner.goals} gols e ${award.winner.assists} assistências (${award.winner.ballonDorPoints} pts)! Pódio completo: 2º ${award.silver.playerName} (${award.silver.clubShortName}) com a Bola de Prata e 3º ${award.bronze.playerName} (${award.bronze.clubShortName}) com a Bola de Bronze.${
      award.goldenBoyU21
        ? ` Jovem Sub-21 do Mundo (Golden Boy): ${award.goldenBoyU21.playerName} (${award.goldenBoyU21.clubShortName}).`
        : ''
    }${
      userWonGold
        ? ' Seu clube recebeu +R$ 15.000.000 de bônus internacional de imagem e o craque subiu +1 de Overall!'
        : ''
    }`,
    date: ceremonyDate,
    round: state.currentRound,
    read: false,
    type: 'AWARD',
  };

  return {
    updatedState: {
      ...state,
      clubs: updatedClubs,
      worldBallonDorHistory: [award, ...existing],
      inbox: [galaMsg, ...state.inbox],
    },
    award,
  };
}
