import { Club, Fixture, Player } from '../types/game';

export interface CompetitionPlayerStatEntry {
  player: Player;
  club: Club;
  matchesPlayed: number;
  goals: number;
  assists: number;
  goalContributions: number;
  goalsPerMatch: number;
  yellowCards: number;
  redCards: number;
  disciplinePoints: number;
}

export interface CompetitionAggregateSummary {
  playedMatches: number;
  totalMatches: number;
  totalGoals: number;
  avgGoalsPerMatch: number;
  totalAssists: number;
  totalYellowCards: number;
  totalRedCards: number;
}

export interface TeamOfTheRoundSlot {
  slotId: string;
  slotLabel: string;
  pitchX: number;
  pitchY: number;
  player: Player;
  club: Club;
  rating: number;
  goalsInRound: number;
  assistsInRound: number;
  savesInRound: number;
  cleanSheet: boolean;
  matchScoreLabel: string;
  isPlayerOfTheRound: boolean;
}

export interface TeamOfTheRoundResult {
  round: number;
  playedMatchesCount: number;
  totalMatchesInRound: number;
  lineup: TeamOfTheRoundSlot[];
  playerOfTheRound: TeamOfTheRoundSlot | null;
  userHonorees: TeamOfTheRoundSlot[];
}

function deterministicHash(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 4294967295;
}

/**
 * Aggregates exact per-competition player statistics directly from played fixtures
 * so goals, assists, G+A, and cards never leak across different tournaments.
 */
export function computeCompetitionPlayerStats(
  fixtures: Fixture[],
  clubs: Club[]
): {
  entries: CompetitionPlayerStatEntry[];
  summary: CompetitionAggregateSummary;
} {
  const playedFixtures = fixtures.filter((f) => f.played);

  const clubMap = new Map<string, Club>();
  const playerById = new Map<string, { player: Player; club: Club }>();
  const playerByClubAndName = new Map<string, { player: Player; club: Club }>();

  clubs.forEach((club) => {
    clubMap.set(club.id, club);
    club.squad.forEach((player) => {
      playerById.set(player.id, { player, club });
      playerByClubAndName.set(`${club.id}::${player.name}`, { player, club });
    });
  });

  const clubMatchesPlayed = new Map<string, number>();
  const statsByPlayerId = new Map<
    string,
    {
      player: Player;
      club: Club;
      goals: number;
      assists: number;
      yellowCards: number;
      redCards: number;
      fixtureIdsWithEvent: Set<string>;
    }
  >();

  const ensureRecord = (player: Player, club: Club) => {
    let rec = statsByPlayerId.get(player.id);
    if (!rec) {
      rec = {
        player,
        club,
        goals: 0,
        assists: 0,
        yellowCards: 0,
        redCards: 0,
        fixtureIdsWithEvent: new Set<string>(),
      };
      statsByPlayerId.set(player.id, rec);
    }
    return rec;
  };

  let totalGoals = 0;
  let totalAssists = 0;
  let totalYellowCards = 0;
  let totalRedCards = 0;

  playedFixtures.forEach((fix) => {
    clubMatchesPlayed.set(fix.homeTeamId, (clubMatchesPlayed.get(fix.homeTeamId) || 0) + 1);
    clubMatchesPlayed.set(fix.awayTeamId, (clubMatchesPlayed.get(fix.awayTeamId) || 0) + 1);
    totalGoals += (fix.homeScore || 0) + (fix.awayScore || 0);

    (fix.events || []).forEach((ev) => {
      if (ev.type === 'GOL' || ev.type === 'PENALTI_GOL') {
        const resolvedScorer =
          (ev.playerId && playerById.get(ev.playerId)) ||
          (ev.teamId && ev.playerName ? playerByClubAndName.get(`${ev.teamId}::${ev.playerName}`) : undefined);

        if (resolvedScorer) {
          const rec = ensureRecord(resolvedScorer.player, resolvedScorer.club);
          rec.goals += 1;
          rec.fixtureIdsWithEvent.add(fix.id);
        }

        const resolvedAssister =
          (ev.assistPlayerId && playerById.get(ev.assistPlayerId)) ||
          (ev.teamId && ev.assistPlayerName
            ? playerByClubAndName.get(`${ev.teamId}::${ev.assistPlayerName}`)
            : undefined);

        if (resolvedAssister && resolvedAssister.player.id !== resolvedScorer?.player.id) {
          const assistRec = ensureRecord(resolvedAssister.player, resolvedAssister.club);
          assistRec.assists += 1;
          assistRec.fixtureIdsWithEvent.add(fix.id);
          totalAssists += 1;
        }
      } else if (ev.type === 'CARTAO_AMARELO') {
        totalYellowCards += 1;
        const resolved =
          (ev.playerId && playerById.get(ev.playerId)) ||
          (ev.teamId && ev.playerName ? playerByClubAndName.get(`${ev.teamId}::${ev.playerName}`) : undefined);
        if (resolved) {
          const rec = ensureRecord(resolved.player, resolved.club);
          rec.yellowCards += 1;
          rec.fixtureIdsWithEvent.add(fix.id);
        }
      } else if (ev.type === 'CARTAO_VERMELHO') {
        totalRedCards += 1;
        const resolved =
          (ev.playerId && playerById.get(ev.playerId)) ||
          (ev.teamId && ev.playerName ? playerByClubAndName.get(`${ev.teamId}::${ev.playerName}`) : undefined);
        if (resolved) {
          const rec = ensureRecord(resolved.player, resolved.club);
          rec.redCards += 1;
          rec.fixtureIdsWithEvent.add(fix.id);
        }
      } else if (ev.type === 'SUBSTITUICAO' && ev.playerId) {
        const resolved = playerById.get(ev.playerId);
        if (resolved) {
          const rec = ensureRecord(resolved.player, resolved.club);
          rec.fixtureIdsWithEvent.add(fix.id);
        }
      }
    });
  });

  const entries: CompetitionPlayerStatEntry[] = [];
  statsByPlayerId.forEach((rec) => {
    const clubGames = clubMatchesPlayed.get(rec.club.id) || 1;
    const minAppearances = Math.max(1, rec.fixtureIdsWithEvent.size);
    const estimatedMatches = rec.player.isStarter
      ? Math.max(minAppearances, clubGames)
      : Math.min(clubGames, Math.max(minAppearances, Math.ceil(clubGames * 0.45)));

    const goalContributions = rec.goals + rec.assists;
    const goalsPerMatch = estimatedMatches > 0 ? Math.round((rec.goals / estimatedMatches) * 100) / 100 : 0;
    const disciplinePoints = rec.yellowCards + rec.redCards * 3;

    entries.push({
      player: rec.player,
      club: rec.club,
      matchesPlayed: estimatedMatches,
      goals: rec.goals,
      assists: rec.assists,
      goalContributions,
      goalsPerMatch,
      yellowCards: rec.yellowCards,
      redCards: rec.redCards,
      disciplinePoints,
    });
  });

  const summary: CompetitionAggregateSummary = {
    playedMatches: playedFixtures.length,
    totalMatches: fixtures.length,
    totalGoals,
    avgGoalsPerMatch:
      playedFixtures.length > 0 ? Math.round((totalGoals / playedFixtures.length) * 100) / 100 : 0,
    totalAssists,
    totalYellowCards,
    totalRedCards,
  };

  return { entries, summary };
}

/**
 * Builds the 4-3-3 Team of the Round ("Seleção da Rodada") and crowns the
 * "Craque da Rodada" from all played matches of a specific competition round.
 */
export function buildTeamOfTheRound(
  fixtures: Fixture[],
  round: number,
  clubs: Club[],
  userClubId?: string
): TeamOfTheRoundResult {
  const roundFixtures = fixtures.filter((f) => f.round === round);
  const playedRoundFixtures = roundFixtures.filter((f) => f.played);

  if (playedRoundFixtures.length === 0) {
    return {
      round,
      playedMatchesCount: 0,
      totalMatchesInRound: roundFixtures.length,
      lineup: [],
      playerOfTheRound: null,
      userHonorees: [],
    };
  }

  const clubMap = new Map<string, Club>();
  clubs.forEach((c) => clubMap.set(c.id, c));

  interface CandidatePerformance {
    player: Player;
    club: Club;
    rating: number;
    goalsInRound: number;
    assistsInRound: number;
    savesInRound: number;
    cleanSheet: boolean;
    matchScoreLabel: string;
  }

  const bestCandidateByPlayerId = new Map<string, CandidatePerformance>();

  playedRoundFixtures.forEach((fix) => {
    const homeClub = clubMap.get(fix.homeTeamId);
    const awayClub = clubMap.get(fix.awayTeamId);
    if (!homeClub || !awayClub) return;

    const homeScore = fix.homeScore ?? 0;
    const awayScore = fix.awayScore ?? 0;
    const matchScoreLabel = `${homeClub.initials} ${homeScore} x ${awayScore} ${awayClub.initials}`;
    const events = fix.events || [];

    const evaluateClubSquad = (club: Club, teamScore: number, oppScore: number) => {
      const goalDiff = teamScore - oppScore;
      const cleanSheet = oppScore === 0;

      club.squad.forEach((p) => {
        let goals = 0;
        let assists = 0;
        let saves = 0;
        let woodwork = 0;
        let yellows = 0;
        let reds = 0;
        let subbedIn = false;

        events.forEach((ev) => {
          if (ev.teamId !== club.id) return;
          const matchesIdOrName = ev.playerId ? ev.playerId === p.id : ev.playerName === p.name;
          const matchesAssist = ev.assistPlayerId
            ? ev.assistPlayerId === p.id
            : ev.assistPlayerName === p.name;

          if ((ev.type === 'GOL' || ev.type === 'PENALTI_GOL') && matchesIdOrName) {
            goals += 1;
          }
          if ((ev.type === 'GOL' || ev.type === 'PENALTI_GOL') && matchesAssist && !matchesIdOrName) {
            assists += 1;
          }
          if (ev.type === 'DEFESAÇA' && matchesIdOrName) {
            saves += 1;
          }
          if (ev.type === 'CHUTE_TRAVE' && matchesIdOrName) {
            woodwork += 1;
          }
          if (ev.type === 'CARTAO_AMARELO' && matchesIdOrName) {
            yellows += 1;
          }
          if (ev.type === 'CARTAO_VERMELHO' && matchesIdOrName) {
            reds += 1;
          }
          if (ev.type === 'SUBSTITUICAO' && ev.playerId === p.id) {
            subbedIn = true;
          }
        });

        const participated =
          p.isStarter || subbedIn || goals > 0 || assists > 0 || saves > 0 || yellows > 0 || reds > 0;
        if (!participated) return;

        const variance = (deterministicHash(`${fix.id}_${p.id}`) - 0.42) * 0.55;
        let score = 6.15 + (p.overall - 68) * 0.036 + variance;

        // Result impact
        if (goalDiff > 0) {
          score += goalDiff >= 3 ? 0.88 : goalDiff === 2 ? 0.68 : 0.46;
        } else if (goalDiff === 0) {
          score += 0.08;
        } else {
          score -= Math.abs(goalDiff) >= 3 ? 0.62 : 0.34;
        }

        // Defensive & clean sheet bonuses
        if (cleanSheet) {
          if (p.position === 'GK') score += 0.95;
          else if (p.position === 'DF') score += 0.78;
          else if (p.detailedRole === 'VOL') score += 0.35;
        } else if (oppScore >= 3) {
          if (p.position === 'GK' || p.position === 'DF') score -= 0.45;
        }

        // Individual contributions
        score += goals * 1.35;
        score += assists * 0.9;
        score += Math.min(1.1, saves * 0.55);
        score += Math.min(0.4, woodwork * 0.2);
        score -= yellows * 0.35;
        score -= reds * 1.85;

        const clampedRating = Math.round(Math.max(4.5, Math.min(10.0, score)) * 10) / 10;

        const existing = bestCandidateByPlayerId.get(p.id);
        if (!existing || clampedRating > existing.rating) {
          bestCandidateByPlayerId.set(p.id, {
            player: p,
            club,
            rating: clampedRating,
            goalsInRound: goals,
            assistsInRound: assists,
            savesInRound: saves,
            cleanSheet,
            matchScoreLabel,
          });
        }
      });
    };

    evaluateClubSquad(homeClub, homeScore, awayScore);
    evaluateClubSquad(awayClub, awayScore, homeScore);
  });

  const allCandidates = Array.from(bestCandidateByPlayerId.values()).sort((a, b) => {
    if (b.rating !== a.rating) return b.rating - a.rating;
    const contribB = b.goalsInRound * 2 + b.assistsInRound;
    const contribA = a.goalsInRound * 2 + a.assistsInRound;
    if (contribB !== contribA) return contribB - contribA;
    return b.player.overall - a.player.overall;
  });

  const usedIds = new Set<string>();
  const pickBest = (
    primaryPredicate: (c: CandidatePerformance) => boolean,
    fallbackPredicate?: (c: CandidatePerformance) => boolean
  ): CandidatePerformance | null => {
    const primary = allCandidates.find((c) => !usedIds.has(c.player.id) && primaryPredicate(c));
    if (primary) {
      usedIds.add(primary.player.id);
      return primary;
    }
    if (fallbackPredicate) {
      const fallback = allCandidates.find((c) => !usedIds.has(c.player.id) && fallbackPredicate(c));
      if (fallback) {
        usedIds.add(fallback.player.id);
        return fallback;
      }
    }
    const anyLeft = allCandidates.find((c) => !usedIds.has(c.player.id));
    if (anyLeft) {
      usedIds.add(anyLeft.player.id);
      return anyLeft;
    }
    return null;
  };

  const formationBlueprint: {
    slotId: string;
    slotLabel: string;
    pitchX: number;
    pitchY: number;
    primary: (c: CandidatePerformance) => boolean;
    fallback: (c: CandidatePerformance) => boolean;
  }[] = [
    {
      slotId: 'GK',
      slotLabel: 'GOL',
      pitchX: 50,
      pitchY: 88,
      primary: (c) => c.player.position === 'GK',
      fallback: (c) => c.player.position === 'GK',
    },
    {
      slotId: 'LB',
      slotLabel: 'LE',
      pitchX: 16,
      pitchY: 67,
      primary: (c) => c.player.detailedRole === 'LAT',
      fallback: (c) => c.player.position === 'DF',
    },
    {
      slotId: 'CB1',
      slotLabel: 'ZAG',
      pitchX: 38,
      pitchY: 72,
      primary: (c) => c.player.detailedRole === 'ZAG',
      fallback: (c) => c.player.position === 'DF',
    },
    {
      slotId: 'CB2',
      slotLabel: 'ZAG',
      pitchX: 62,
      pitchY: 72,
      primary: (c) => c.player.detailedRole === 'ZAG',
      fallback: (c) => c.player.position === 'DF',
    },
    {
      slotId: 'RB',
      slotLabel: 'LD',
      pitchX: 84,
      pitchY: 67,
      primary: (c) => c.player.detailedRole === 'LAT',
      fallback: (c) => c.player.position === 'DF',
    },
    {
      slotId: 'CM1',
      slotLabel: 'MEI',
      pitchX: 27,
      pitchY: 44,
      primary: (c) => c.player.detailedRole === 'MEI',
      fallback: (c) => c.player.position === 'MF',
    },
    {
      slotId: 'CDM',
      slotLabel: 'VOL',
      pitchX: 50,
      pitchY: 51,
      primary: (c) => c.player.detailedRole === 'VOL',
      fallback: (c) => c.player.position === 'MF',
    },
    {
      slotId: 'CM2',
      slotLabel: 'MEI',
      pitchX: 73,
      pitchY: 44,
      primary: (c) => c.player.detailedRole === 'MEI',
      fallback: (c) => c.player.position === 'MF',
    },
    {
      slotId: 'LW',
      slotLabel: 'ATA',
      pitchX: 21,
      pitchY: 19,
      primary: (c) => c.player.position === 'FW',
      fallback: (c) => c.player.position === 'MF',
    },
    {
      slotId: 'ST',
      slotLabel: 'CA',
      pitchX: 50,
      pitchY: 14,
      primary: (c) => c.player.position === 'FW',
      fallback: (c) => c.player.position === 'MF',
    },
    {
      slotId: 'RW',
      slotLabel: 'ATA',
      pitchX: 79,
      pitchY: 19,
      primary: (c) => c.player.position === 'FW',
      fallback: (c) => c.player.position === 'MF',
    },
  ];

  const lineup: TeamOfTheRoundSlot[] = [];
  formationBlueprint.forEach((bp) => {
    const chosen = pickBest(bp.primary, bp.fallback);
    if (chosen) {
      lineup.push({
        slotId: bp.slotId,
        slotLabel: bp.slotLabel,
        pitchX: bp.pitchX,
        pitchY: bp.pitchY,
        player: chosen.player,
        club: chosen.club,
        rating: chosen.rating,
        goalsInRound: chosen.goalsInRound,
        assistsInRound: chosen.assistsInRound,
        savesInRound: chosen.savesInRound,
        cleanSheet: chosen.cleanSheet,
        matchScoreLabel: chosen.matchScoreLabel,
        isPlayerOfTheRound: false,
      });
    }
  });

  let playerOfTheRound: TeamOfTheRoundSlot | null = null;
  if (lineup.length > 0) {
    const sortedLineup = [...lineup].sort((a, b) => {
      if (b.rating !== a.rating) return b.rating - a.rating;
      const ca = a.goalsInRound * 2 + a.assistsInRound;
      const cb = b.goalsInRound * 2 + b.assistsInRound;
      if (cb !== ca) return cb - ca;
      return b.player.overall - a.player.overall;
    });
    const mvpId = sortedLineup[0].player.id;
    lineup.forEach((slot) => {
      if (slot.player.id === mvpId) {
        slot.isPlayerOfTheRound = true;
        playerOfTheRound = slot;
      }
    });
  }

  const userHonorees = userClubId ? lineup.filter((s) => s.club.id === userClubId) : [];

  return {
    round,
    playedMatchesCount: playedRoundFixtures.length,
    totalMatchesInRound: roundFixtures.length,
    lineup,
    playerOfTheRound,
    userHonorees,
  };
}
