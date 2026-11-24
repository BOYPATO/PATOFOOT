import { Club, InboxMessage, TrophyRecord } from '../types/game';

export interface ClubReputationDeltaSummary {
  clubId: string;
  clubName: string;
  oldRep: number;
  newRep: number;
  reason: string;
}

export interface DynamicReputationRolloverResult {
  updatedClubs: Club[];
  userDelta: ClubReputationDeltaSummary | null;
  inboxMessages: InboxMessage[];
}

/**
 * Dynamically updates Club.reputation (1..5) and fractional reputationProgress (-1..+1)
 * on season rollover based on titles won, promotions, relegations, and top finishes.
 */
export function applySeasonalClubReputationUpdates(params: {
  clubs: Club[];
  userClubId: string;
  seasonYear: number;
  seasonDisplayLabel: string;
  dateFormatted: string;
  trophiesThisSeason: TrophyRecord[];
  championClubIds?: string[];
  runnerUpOrTop4ClubIds?: string[];
  promotedClubIds?: string[];
  relegatedClubIds?: string[];
  scopeDivisions: Array<Club['division']>;
}): DynamicReputationRolloverResult {
  const {
    clubs,
    userClubId,
    seasonYear,
    seasonDisplayLabel,
    dateFormatted,
    trophiesThisSeason,
    championClubIds = [],
    runnerUpOrTop4ClubIds = [],
    promotedClubIds = [],
    relegatedClubIds = [],
    scopeDivisions,
  } = params;

  const scopeSet = new Set(scopeDivisions);
  const champSet = new Set(championClubIds);
  const topSet = new Set(runnerUpOrTop4ClubIds);
  const promotedSet = new Set(promotedClubIds);
  const relegatedSet = new Set(relegatedClubIds);

  const clubIdByName = new Map<string, string>();
  for (const c of clubs) {
    if (c.name) clubIdByName.set(c.name.trim().toLowerCase(), c.id);
    if (c.shortName) clubIdByName.set(c.shortName.trim().toLowerCase(), c.id);
  }

  const trophyCountByClub = new Map<string, number>();
  const continentalChampSet = new Set<string>();
  for (const t of trophiesThisSeason) {
    if (t.year !== seasonYear || !t.championTeamName) continue;
    const champId = clubIdByName.get(t.championTeamName.trim().toLowerCase());
    if (!champId) continue;
    trophyCountByClub.set(champId, (trophyCountByClub.get(champId) || 0) + 1);
    const compLower = (t.competition || '').toLowerCase();
    if (
      compLower.includes('libertadores') ||
      compLower.includes('champions') ||
      compLower.includes('europa') ||
      compLower.includes('sul-americana') ||
      compLower.includes('mundial')
    ) {
      continentalChampSet.add(champId);
    }
  }

  let userDelta: ClubReputationDeltaSummary | null = null;
  const inboxMessages: InboxMessage[] = [];

  const updatedClubs = clubs.map((club) => {
    if (!scopeSet.has(club.division)) return club;

    let delta = 0;
    const reasons: string[] = [];

    if (promotedSet.has(club.id)) {
      delta += 0.6;
      reasons.push('acesso conquistado');
    }
    if (relegatedSet.has(club.id)) {
      delta -= 0.75;
      reasons.push('rebaixamento na liga');
    }
    if (champSet.has(club.id)) {
      delta += 0.75;
      reasons.push('título nacional');
    } else if (topSet.has(club.id)) {
      delta += 0.25;
      reasons.push('G-4 / campanha de destaque');
    }

    if (continentalChampSet.has(club.id)) {
      delta += 0.9;
      reasons.push('taça continental');
    } else if ((trophyCountByClub.get(club.id) || 0) >= 2 && !champSet.has(club.id)) {
      delta += 0.45;
      reasons.push('múltiplas taças');
    }

    if (delta === 0) return club;

    const currentRep = Math.max(1, Math.min(5, club.reputation || 2));
    let nextProgress = (club.reputationProgress || 0) + delta;
    let nextRep = currentRep;

    while (nextProgress >= 1.0 && nextRep < 5) {
      nextProgress -= 1.0;
      nextRep += 1;
    }
    while (nextProgress <= -1.0 && nextRep > 1) {
      nextProgress += 1.0;
      nextRep -= 1;
    }

    if (nextRep === 5 && nextProgress > 0) nextProgress = 0;
    if (nextRep === 1 && nextProgress < 0) nextProgress = 0;
    nextProgress = Math.round(nextProgress * 100) / 100;

    if (nextRep !== currentRep && club.id === userClubId) {
      const reasonText = reasons.length > 0 ? reasons.join(', ') : 'desempenho na temporada';
      userDelta = {
        clubId: club.id,
        clubName: club.name,
        oldRep: currentRep,
        newRep: nextRep,
        reason: reasonText,
      };
      const roseUp = nextRep > currentRep;
      inboxMessages.push({
        id: `msg_dyn_rep_${club.id}_${seasonYear}_${nextRep}`,
        title: roseUp
          ? `Prestígio Global em Alta: ${club.shortName} alcança ${nextRep} Estrelas`
          : `Revisão de Prestígio: ${club.shortName} cai para ${nextRep} Estrelas`,
        message: roseUp
          ? `Após uma temporada marcada por ${reasonText} em ${seasonDisplayLabel}, o ${club.name} subiu de ${currentRep} para ${nextRep} estrelas no ranking de prestígio. Isso amplia atratividade no mercado e receitas comerciais.`
          : `Os impactos de ${reasonText} em ${seasonDisplayLabel} reduziram a avaliação de prestígio do ${club.name} de ${currentRep} para ${nextRep} estrelas.`,
        date: dateFormatted,
        round: 1,
        read: false,
        type: roseUp ? 'AWARD' : 'BOARD',
      });
    }

    return {
      ...club,
      reputation: nextRep,
      reputationProgress: nextProgress,
    };
  });

  return {
    updatedClubs,
    userDelta,
    inboxMessages,
  };
}
