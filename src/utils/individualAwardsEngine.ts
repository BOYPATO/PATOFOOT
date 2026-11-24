import {
  Club,
  Fixture,
  GameSave,
  InboxMessage,
  IndividualAwardCategory,
  IndividualAwardRecord,
  Player,
  Standing,
} from '../types/game';
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  }).format(value);
}

export type AwardDivisionCode = 'A' | 'B' | 'C' | 'D';

export const DIVISION_CHAMPIONSHIP_NAMES: Record<AwardDivisionCode, string> = {
  A: 'Brasileirão Série A',
  B: 'Brasileirão Série B',
  C: 'Brasileirão Série C',
  D: 'Brasileirão Série D',
};

export const INDIVIDUAL_AWARD_PRIZES: Record<
  AwardDivisionCode,
  Record<IndividualAwardCategory, number>
> = {
  A: {
    BEST_PLAYER: 3_500_000,
    TOP_SCORER: 2_500_000,
    REVELATION: 1_500_000,
    BEST_GOALKEEPER: 1_500_000,
  },
  B: {
    BEST_PLAYER: 1_200_000,
    TOP_SCORER: 900_000,
    REVELATION: 550_000,
    BEST_GOALKEEPER: 550_000,
  },
  C: {
    BEST_PLAYER: 450_000,
    TOP_SCORER: 350_000,
    REVELATION: 200_000,
    BEST_GOALKEEPER: 200_000,
  },
  D: {
    BEST_PLAYER: 200_000,
    TOP_SCORER: 150_000,
    REVELATION: 90_000,
    BEST_GOALKEEPER: 90_000,
  },
};

export const INDIVIDUAL_AWARD_TITLES: Record<IndividualAwardCategory, string> = {
  BEST_PLAYER: 'Craque do Campeonato',
  TOP_SCORER: 'Artilheiro do Campeonato',
  REVELATION: 'Revelação Sub-21',
  BEST_GOALKEEPER: 'Melhor Goleiro',
};

const MARKET_VALUE_BOOST_PCT: Record<IndividualAwardCategory, number> = {
  BEST_PLAYER: 0.18,
  TOP_SCORER: 0.15,
  REVELATION: 0.22,
  BEST_GOALKEEPER: 0.12,
};

export interface EvaluatedAwardCandidate {
  player: Player;
  club: Club;
  standingRank: number;
  standing: Standing | undefined;
  leagueGoals: number;
  leagueAssists: number;
  seasonGoals: number;
  seasonAssists: number;
  effectiveGoals: number;
  effectiveAssists: number;
  matchesPlayed: number;
  score: number;
  statHighlight: string;
}

export interface DivisionAwardRace {
  division: AwardDivisionCode;
  competitionName: string;
  playedFixturesCount: number;
  totalFixturesCount: number;
  bestPlayers: EvaluatedAwardCandidate[];
  topScorers: EvaluatedAwardCandidate[];
  revelations: EvaluatedAwardCandidate[];
  bestGoalkeepers: EvaluatedAwardCandidate[];
}

function getDivisionFixturesAndStandings(
  state: GameSave,
  division: AwardDivisionCode
): { fixtures: Fixture[]; standings: Standing[] } {
  switch (division) {
    case 'A':
      return { fixtures: state.fixturesA || [], standings: state.standingsA || [] };
    case 'B':
      return { fixtures: state.fixturesB || [], standings: state.standingsB || [] };
    case 'C':
      return { fixtures: state.fixturesC || [], standings: state.standingsC || [] };
    case 'D':
      return { fixtures: state.fixturesD || [], standings: state.standingsD || [] };
  }
}

function getStandingBonus(rank: number): number {
  if (rank === 1) return 26;
  if (rank === 2) return 18;
  if (rank <= 4) return 12;
  if (rank <= 8) return 6;
  if (rank <= 12) return 2;
  return 0;
}

export function evaluateDivisionAwardCandidates(
  state: GameSave,
  division: AwardDivisionCode
): DivisionAwardRace {
  const { fixtures, standings } = getDivisionFixturesAndStandings(state, division);
  const competitionName = DIVISION_CHAMPIONSHIP_NAMES[division];

  const divisionClubIds = new Set(standings.map((s) => s.teamId));
  const divisionClubs = state.clubs.filter(
    (c) => divisionClubIds.has(c.id) || c.division === division
  );

  const standingRankMap = new Map<string, number>();
  const standingObjMap = new Map<string, Standing>();
  standings.forEach((s, index) => {
    standingRankMap.set(s.teamId, index + 1);
    standingObjMap.set(s.teamId, s);
  });

  // Extract exact championship goals and assists from played fixtures in this division
  const leagueGoalsByPlayerId = new Map<string, number>();
  const leagueAssistsByPlayerId = new Map<string, number>();
  const playerLookupByTeamAndName = new Map<string, string>();

  for (const club of divisionClubs) {
    for (const p of club.squad) {
      playerLookupByTeamAndName.set(`${club.id}::${p.name.toLowerCase()}`, p.id);
    }
  }

  const playedFixtures = fixtures.filter((f) => f.played);
  for (const fx of playedFixtures) {
    if (!fx.events) continue;
    for (const ev of fx.events) {
      if (ev.type !== 'GOL') continue;
      const scorerId =
        ev.playerId ||
        playerLookupByTeamAndName.get(`${ev.teamId}::${(ev.playerName || '').toLowerCase()}`);
      if (scorerId) {
        leagueGoalsByPlayerId.set(scorerId, (leagueGoalsByPlayerId.get(scorerId) || 0) + 1);
      }

      if (ev.assistPlayerName) {
        const assisterId = playerLookupByTeamAndName.get(
          `${ev.teamId}::${ev.assistPlayerName.toLowerCase()}`
        );
        if (assisterId) {
          leagueAssistsByPlayerId.set(
            assisterId,
            (leagueAssistsByPlayerId.get(assisterId) || 0) + 1
          );
        }
      }
    }
  }

  const allEntries: {
    player: Player;
    club: Club;
    standingRank: number;
    standing: Standing | undefined;
    leagueGoals: number;
    leagueAssists: number;
    seasonGoals: number;
    seasonAssists: number;
    effectiveGoals: number;
    effectiveAssists: number;
    matchesPlayed: number;
  }[] = [];

  for (const club of divisionClubs) {
    const rank = standingRankMap.get(club.id) || 12;
    const st = standingObjMap.get(club.id);
    for (const player of club.squad) {
      const lGoals = leagueGoalsByPlayerId.get(player.id) || 0;
      const lAssists = leagueAssistsByPlayerId.get(player.id) || 0;
      const sGoals = player.goals || 0;
      const sAssists = player.assists || 0;
      // Use league fixture goals primarily; if fixture events had legacy unattributed goals, never exceed season goals
      const effectiveGoals = lGoals > 0 ? lGoals : Math.min(sGoals, st?.goalsFor ?? sGoals);
      const effectiveAssists = Math.max(lAssists, sAssists);
      const matchesPlayed = Math.max(player.matches || 0, lGoals > 0 ? 1 : 0);

      allEntries.push({
        player,
        club,
        standingRank: rank,
        standing: st,
        leagueGoals: lGoals,
        leagueAssists: lAssists,
        seasonGoals: sGoals,
        seasonAssists: sAssists,
        effectiveGoals,
        effectiveAssists,
        matchesPlayed,
      });
    }
  }

  // 1. TOP SCORER (Artilheiro do Campeonato)
  const topScorers: EvaluatedAwardCandidate[] = [...allEntries]
    .map((entry) => {
      const efficiencyBonus =
        entry.matchesPlayed > 0 ? (entry.effectiveGoals / entry.matchesPlayed) * 3 : 0;
      const score =
        entry.effectiveGoals * 100 +
        entry.seasonGoals * 2 +
        entry.effectiveAssists * 1.5 +
        efficiencyBonus +
        (25 - entry.standingRank) * 0.25 +
        entry.player.overall * 0.1;
      const jLabel = entry.matchesPlayed === 1 ? 'jogo' : 'jogos';
      const gLabel = entry.effectiveGoals === 1 ? 'gol' : 'gols';
      const statHighlight =
        entry.seasonGoals > entry.effectiveGoals
          ? `${entry.effectiveGoals} ${gLabel} na liga · ${entry.seasonGoals} na temporada (${entry.matchesPlayed} ${jLabel})`
          : `${entry.effectiveGoals} ${gLabel} em ${entry.matchesPlayed} ${jLabel}`;

      return {
        ...entry,
        score,
        statHighlight,
      };
    })
    .sort((a, b) => {
      if (b.effectiveGoals !== a.effectiveGoals) return b.effectiveGoals - a.effectiveGoals;
      if (b.seasonGoals !== a.seasonGoals) return b.seasonGoals - a.seasonGoals;
      if (a.matchesPlayed !== b.matchesPlayed && a.effectiveGoals > 0) {
        return a.matchesPlayed - b.matchesPlayed;
      }
      if (b.effectiveAssists !== a.effectiveAssists) {
        return b.effectiveAssists - a.effectiveAssists;
      }
      return b.score - a.score;
    })
    .slice(0, 5);

  // 2. BEST PLAYER / MVP (Craque do Campeonato)
  const bestPlayers: EvaluatedAwardCandidate[] = [...allEntries]
    .filter((e) => e.matchesPlayed > 0 || e.player.isStarter)
    .map((entry) => {
      const participationFactor =
        entry.matchesPlayed >= 12 ? 1 : entry.matchesPlayed >= 5 ? 0.88 : 0.72;
      const ratingVal = entry.player.ratingAverage || 6.8;
      const roleBonus =
        entry.player.detailedRole === 'MEI'
          ? entry.effectiveAssists * 1.1 + 4
          : entry.player.detailedRole === 'VOL' || entry.player.detailedRole === 'ZAG'
          ? 6
          : 0;
      const rawScore =
        entry.effectiveGoals * 4.1 +
        entry.seasonGoals * 1.1 +
        entry.effectiveAssists * 2.9 +
        entry.player.overall * 1.38 +
        ratingVal * 7.5 +
        getStandingBonus(entry.standingRank) +
        roleBonus;
      const score = rawScore * participationFactor;

      const parts: string[] = [];
      if (entry.effectiveGoals > 0) {
        parts.push(`${entry.effectiveGoals} ${entry.effectiveGoals === 1 ? 'gol' : 'gols'}`);
      }
      if (entry.effectiveAssists > 0) {
        parts.push(`${entry.effectiveAssists} assist.`);
      }
      parts.push(`${entry.matchesPlayed} jogos`);
      if (entry.standingRank === 1 && (entry.standing?.played || 0) >= 10) {
        parts.push('Campeão');
      } else if (entry.standingRank <= 4 && (entry.standing?.played || 0) >= 10) {
        parts.push(`${entry.standingRank}º lugar`);
      }

      return {
        ...entry,
        score,
        statHighlight: parts.join(' · '),
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  // 3. REVELATION SUB-21 (Revelação do Campeonato)
  let youngPool = allEntries.filter(
    (e) => e.player.age <= 21 && (e.matchesPlayed > 0 || e.player.isStarter)
  );
  if (youngPool.length === 0) {
    youngPool = allEntries.filter((e) => e.player.age <= 23);
  }
  const revelations: EvaluatedAwardCandidate[] = youngPool
    .map((entry) => {
      const participationBonus = Math.min(entry.matchesPlayed, 30) * 0.7;
      const score =
        entry.effectiveGoals * 3.8 +
        entry.seasonGoals * 1.0 +
        entry.effectiveAssists * 2.8 +
        entry.player.overall * 1.45 +
        participationBonus +
        getStandingBonus(entry.standingRank) * 0.65;

      const parts: string[] = [`${entry.player.age} anos`, `OVR ${entry.player.overall}`];
      if (entry.effectiveGoals > 0) {
        parts.push(`${entry.effectiveGoals} ${entry.effectiveGoals === 1 ? 'gol' : 'gols'}`);
      }
      if (entry.effectiveAssists > 0) {
        parts.push(`${entry.effectiveAssists} assist.`);
      }
      parts.push(`${entry.matchesPlayed} jogos`);

      return {
        ...entry,
        score,
        statHighlight: parts.join(' · '),
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  // 4. BEST GOALKEEPER (Melhor Goleiro / Luva de Ouro)
  // Pick primary GK per club so backup GKs on good defenses don't steal the award with 0 matches
  const primaryKeepersPerClub: typeof allEntries = [];
  for (const club of divisionClubs) {
    const clubKeepers = allEntries.filter(
      (e) =>
        e.club.id === club.id &&
        (e.player.position === 'GK' || e.player.detailedRole === 'GOL')
    );
    if (clubKeepers.length === 0) continue;
    clubKeepers.sort((a, b) => {
      if (b.matchesPlayed !== a.matchesPlayed) return b.matchesPlayed - a.matchesPlayed;
      if (a.player.isStarter !== b.player.isStarter) return a.player.isStarter ? -1 : 1;
      return b.player.overall - a.player.overall;
    });
    primaryKeepersPerClub.push(clubKeepers[0]);
  }

  const bestGoalkeepers: EvaluatedAwardCandidate[] = primaryKeepersPerClub
    .map((entry) => {
      const teamPlayed = Math.max(1, entry.standing?.played || 1);
      const goalsConceded = entry.standing?.goalsAgainst ?? 0;
      const concededPerMatch = goalsConceded / teamPlayed;
      const estimatedCleanSheets = Math.max(
        0,
        Math.round(teamPlayed * Math.max(0.12, 0.58 - concededPerMatch * 0.26))
      );
      const defenseScore =
        (entry.standing?.played || 0) > 0 ? (2.1 - concededPerMatch) * 28 : 0;
      const score =
        defenseScore +
        entry.player.overall * 1.35 +
        (entry.player.ratingAverage || 6.8) * 5.5 +
        getStandingBonus(entry.standingRank) * 0.8 +
        Math.min(entry.matchesPlayed, 38) * 0.35;

      const statHighlight =
        (entry.standing?.played || 0) > 0
          ? `${estimatedCleanSheets} jogos sem sofrer gols · Média ${concededPerMatch
              .toFixed(2)
              .replace('.', ',')} gol sofrido/jogo`
          : `OVR ${entry.player.overall} · Titular da meta`;

      return {
        ...entry,
        score,
        statHighlight,
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  return {
    division,
    competitionName,
    playedFixturesCount: playedFixtures.length,
    totalFixturesCount: fixtures.length,
    bestPlayers,
    topScorers,
    revelations,
    bestGoalkeepers,
  };
}

/**
 * Returns live award race leaders for the user's current national division (plus Série A if different).
 */
export function getCurrentSeasonAwardRaces(state: GameSave): DivisionAwardRace[] {
  const userClub = state.clubs.find((c) => c.id === state.userClubId);
  const userDiv: AwardDivisionCode =
    userClub?.division === 'B' || userClub?.division === 'C' || userClub?.division === 'D'
      ? userClub.division
      : 'A';

  const races: DivisionAwardRace[] = [evaluateDivisionAwardCandidates(state, userDiv)];
  if (userDiv !== 'A') {
    races.push(evaluateDivisionAwardCandidates(state, 'A'));
  }
  return races;
}

/**
 * Evaluates and delivers end-of-season individual awards (idempotent per seasonYear).
 * Credits financial bonuses to clubs, boosts player market value & overall, and sends official Inbox notices.
 */
export function processSeasonEndIndividualAwards(state: GameSave): {
  updatedState: GameSave;
  newlyAwarded: IndividualAwardRecord[];
} {
  const seasonYear = state.currentSeasonYear;
  const existingHistory = state.individualAwardsHistory || [];

  // Idempotency guard: if this season's awards were already processed, return them without re-crediting
  const alreadyProcessedForYear = existingHistory.filter((a) => a.year === seasonYear);
  if (alreadyProcessedForYear.length > 0) {
    return {
      updatedState: state,
      newlyAwarded: alreadyProcessedForYear,
    };
  }

  const userClub = state.clubs.find((c) => c.id === state.userClubId);
  const userDiv: AwardDivisionCode =
    userClub?.division === 'B' || userClub?.division === 'C' || userClub?.division === 'D'
      ? userClub.division
      : 'A';

  // Always crown Série A; if the user manages in Série B, C, or D, also crown their division's championship!
  const divisionsToCrown: AwardDivisionCode[] =
    userDiv === 'A' ? ['A'] : [userDiv, 'A'];

  const newlyAwarded: IndividualAwardRecord[] = [];
  const clubBonusMap = new Map<string, number>();
  const playerValueBoostMap = new Map<string, number>();
  const playerOvrBoostSet = new Set<string>();

  for (const div of divisionsToCrown) {
    const race = evaluateDivisionAwardCandidates(state, div);
    const categoryWinners: {
      category: IndividualAwardCategory;
      candidate: EvaluatedAwardCandidate | undefined;
    }[] = [
      { category: 'BEST_PLAYER', candidate: race.bestPlayers[0] },
      { category: 'TOP_SCORER', candidate: race.topScorers[0] },
      { category: 'REVELATION', candidate: race.revelations[0] },
      { category: 'BEST_GOALKEEPER', candidate: race.bestGoalkeepers[0] },
    ];

    for (const { category, candidate } of categoryWinners) {
      if (!candidate) continue;

      const prizeAmount = INDIVIDUAL_AWARD_PRIZES[div][category];
      const boostPct = MARKET_VALUE_BOOST_PCT[category];
      const rawBoost = Math.round((candidate.player.marketValue || 500_000) * boostPct);
      const marketValueBoost = Math.max(100_000, rawBoost);

      const record: IndividualAwardRecord = {
        id: `ind_award_${seasonYear}_${div}_${category}_${candidate.player.id}`,
        year: seasonYear,
        competition: race.competitionName,
        divisionCode: div,
        category,
        awardTitle: INDIVIDUAL_AWARD_TITLES[category],
        playerId: candidate.player.id,
        playerName: candidate.player.name,
        playerRole: candidate.player.detailedRole,
        playerAge: candidate.player.age,
        playerOverall: candidate.player.overall,
        clubId: candidate.club.id,
        clubName: candidate.club.name,
        clubColors: candidate.club.colors,
        userWon: candidate.club.id === state.userClubId,
        statHighlight: candidate.statHighlight,
        goals: candidate.effectiveGoals,
        assists: candidate.effectiveAssists,
        matches: candidate.matchesPlayed,
        prizeAmount,
        marketValueBoost,
      };

      newlyAwarded.push(record);
      clubBonusMap.set(
        candidate.club.id,
        (clubBonusMap.get(candidate.club.id) || 0) + prizeAmount
      );
      playerValueBoostMap.set(
        candidate.player.id,
        (playerValueBoostMap.get(candidate.player.id) || 0) + marketValueBoost
      );
      playerOvrBoostSet.add(candidate.player.id);
    }
  }

  // Apply financial prizes & player evolution/market value boosts across clubs
  const updatedClubs = state.clubs.map((club) => {
    const clubBonus = clubBonusMap.get(club.id) || 0;
    const hasWinningPlayer = club.squad.some((p) => playerValueBoostMap.has(p.id));
    if (clubBonus === 0 && !hasWinningPlayer) return club;

    const updatedSquad = club.squad.map((player) => {
      const valBoost = playerValueBoostMap.get(player.id) || 0;
      const getsOvrBoost = playerOvrBoostSet.has(player.id);
      if (valBoost === 0 && !getsOvrBoost) return player;

      const maxCap = Math.min(99, Math.max(player.overall, player.potential || 94));
      const nextOverall =
        getsOvrBoost && player.overall < maxCap ? player.overall + 1 : player.overall;

      return {
        ...player,
        overall: nextOverall,
        marketValue: player.marketValue + valBoost,
        morale: 'Excelente' as const,
      };
    });

    return {
      ...club,
      finances: {
        ...club.finances,
        balance: club.finances.balance + clubBonus,
        totalIncomeSeason: club.finances.totalIncomeSeason + clubBonus,
      },
      squad: updatedSquad,
    };
  });

  // Format Gala date (last week of November / ceremony date)
  const formattedCeremonyDate = `30/11/${seasonYear}`;
  const newInboxMessages: InboxMessage[] = [];

  const userWinners = newlyAwarded.filter((a) => a.userWon);
  if (userWinners.length > 0 && userClub) {
    const totalUserPrize = userWinners.reduce((acc, a) => acc + a.prizeAmount, 0);
    const winnersSummary = userWinners
      .map(
        (w) =>
          `• ${w.awardTitle} (${w.competition}): ${w.playerName} (${w.statHighlight}) — Bônus de ${formatCurrency(
            w.prizeAmount
          )}`
      )
      .join('\n');

    newInboxMessages.push({
      id: `msg_user_ind_awards_${seasonYear}`,
      title: `🏆 Noite de Gala ${seasonYear}: Atletas do ${userClub.shortName} Premiados!`,
      message: `Desempenho histórico! O elenco do ${userClub.name} brilhou na Premiação Individual da Temporada ${seasonYear}:\n${winnersSummary}\n\nOs cofres do clube receberam ${formatCurrency(
        totalUserPrize
      )} em premiações por desempenho individual, além de valorização imediata de mercado e moral máxima para os vencedores! Confira o registro perpétuo em Troféus → Honrarias.`,
      date: formattedCeremonyDate,
      round: state.currentRound,
      read: false,
      type: 'AWARD',
    });
  }

  // Official Season Gala Summary for the primary championship relevant to the user
  const primaryDivAwards = newlyAwarded.filter((a) => a.divisionCode === userDiv);
  if (primaryDivAwards.length > 0) {
    const compName = DIVISION_CHAMPIONSHIP_NAMES[userDiv];
    const galaLines = primaryDivAwards
      .map((a) => `${a.awardTitle}: ${a.playerName} (${a.clubName} · ${a.statHighlight})`)
      .join(' | ');

    newInboxMessages.push({
      id: `msg_gala_summary_${seasonYear}_${userDiv}`,
      title: `✨ Premiação Oficial ${compName} ${seasonYear}`,
      message: `A CBF divulgou os vencedores individuais de ${seasonYear} no ${compName}: ${galaLines}. Todos os vencedores históricos podem ser consultados na aba Honrarias dentro da Sala de Troféus.`,
      date: formattedCeremonyDate,
      round: state.currentRound,
      read: false,
      type: 'AWARD',
    });
  }

  const updatedState: GameSave = {
    ...state,
    clubs: updatedClubs,
    individualAwardsHistory: [...newlyAwarded, ...existingHistory],
    inbox: [...newInboxMessages, ...state.inbox],
  };

  return {
    updatedState,
    newlyAwarded,
  };
}
