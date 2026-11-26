import { Club, CompetitionType, Fixture, GameSave, Standing } from '../types/game';
import {
  build32ClubContinentalCompetition,
  build36ClubUefaLeagueCompetition,
  buildSerieDRegionalizedGroups,
  COMPETITIONS_CATALOG,
} from './competitionsEngine';
import {
  assignVariedMatchDaySlot,
  getAfcChampionsCalendarDates,
  getContinentalFinalDates,
  getRoundDate,
  getSerieDScheduleDates,
  getUefaCompetitionCalendarDates,
} from './calendarUtils';
import {
  computeConmebolContinentalQualifiers,
  seedContinentalGroupsWithCountryProtection,
} from './southAmericaLeaguesEngine';
import { computeUefaContinentalQualifiers } from './europeLeaguesEngine';
import { buildBalancedEightRoundConferenceFixtures } from './afcChampionsEngine';
import { computeSuperMundial32Qualifiers, generateSuperMundialFixtures } from './superClubWorldCupEngine';
import { getClubSectorRatings } from './clubRatingsEngine';
import { withWorldGuestClubs } from './intercontinentalEngine';
import { resolveCupChampionId } from './multiLeagueEngine';

function shuffleArray<T>(items: T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function getCompetitionSeasonYear(save: GameSave, competition: CompetitionType): number {
  const isEu =
    competition === 'champions_league' ||
    competition === 'europa_league' ||
    competition === 'conference_league' ||
    competition === 'afc_champions';
  if (isEu) {
    return save.europeSeasonYear ?? save.currentSeasonYear;
  }
  return save.saSeasonYear ?? save.currentSeasonYear;
}

export function getClubCompetitionFixturesAndStandings(
  save: GameSave,
  competition: CompetitionType
): { fixtures: Fixture[]; standings: Standing[] } {
  switch (competition) {
    case 'libertadores':
      return {
        fixtures: save.fixturesLibertadores || [],
        standings: save.standingsLibertadores || [],
      };
    case 'sulamericana':
      return {
        fixtures: save.fixturesSulamericana || [],
        standings: save.standingsSulamericana || [],
      };
    case 'copa_internacional':
      return {
        fixtures: save.fixturesCopaInternacional || [],
        standings: save.standingsCopaInternacional || [],
      };
    case 'super_mundial_clubes':
      return {
        fixtures: save.fixturesSuperMundial || [],
        standings: save.standingsSuperMundial || [],
      };
    case 'champions_league':
      return {
        fixtures: save.fixturesChampionsLeague || [],
        standings: save.standingsChampionsLeague || [],
      };
    case 'europa_league':
      return {
        fixtures: save.fixturesEuropaLeague || [],
        standings: save.standingsEuropaLeague || [],
      };
    case 'conference_league':
      return {
        fixtures: save.fixturesConferenceLeague || [],
        standings: save.standingsConferenceLeague || [],
      };
    case 'afc_champions':
      return {
        fixtures: save.fixturesAfcChampions || [],
        standings: save.standingsAfcChampions || [],
      };
    case 'serie_d':
      return {
        fixtures: save.fixturesD || [],
        standings: save.standingsD || [],
      };
    case 'copa_brasil':
      return {
        fixtures: save.fixturesCopaBrasil || [],
        standings: [],
      };
    case 'concacaf_champions':
      return {
        fixtures: save.fixturesConcacafChampions || [],
        standings: [],
      };
    case 'intercontinental':
      return {
        fixtures: save.fixturesIntercontinental || [],
        standings: [],
      };
    default:
      return { fixtures: [], standings: [] };
  }
}

export const DRAWABLE_SHUFFLED_COMPETITIONS: CompetitionType[] = [
  'libertadores',
  'sulamericana',
  'copa_internacional',
  'super_mundial_clubes',
  'champions_league',
  'europa_league',
  'conference_league',
  'afc_champions',
  'serie_d',
  'copa_brasil',
  'concacaf_champions',
];

export function canRegenerateClubCompetitionDraw(
  save: GameSave,
  competition: CompetitionType
): boolean {
  if (!DRAWABLE_SHUFFLED_COMPETITIONS.includes(competition)) return false;
  const { fixtures } = getClubCompetitionFixturesAndStandings(save, competition);
  if (fixtures.length === 0) return false;
  return !fixtures.some((f) => f.played);
}

function resolveClubDrawSeedOrder(
  ids: string[],
  clubs: Club[],
  defendingChampId?: string | null
): string[] {
  const clubMap = new Map(clubs.map((c) => [c.id, c]));
  return Array.from(new Set(ids))
    .filter((id) => clubMap.has(id))
    .sort((aId, bId) => {
      if (defendingChampId) {
        if (aId === defendingChampId && bId !== defendingChampId) return -1;
        if (bId === defendingChampId && aId !== defendingChampId) return 1;
      }
      const ca = clubMap.get(aId)!;
      const cb = clubMap.get(bId)!;
      const oa = getClubSectorRatings(ca).overall;
      const ob = getClubSectorRatings(cb).overall;
      if (ob !== oa) return ob - oa;
      if (cb.reputation !== ca.reputation) return cb.reputation - ca.reputation;
      return cb.stadium.capacity - ca.stadium.capacity;
    });
}

function seedSerieDGroupsWithShuffle(clubIds: string[], clubs: Club[]): string[][] {
  const clubMap = new Map(clubs.map((c) => [c.id, c]));
  const unique96Clubs = Array.from(new Set(clubIds))
    .map((id) => clubMap.get(id))
    .filter((c): c is Club => Boolean(c))
    .slice(0, 96);

  return buildSerieDRegionalizedGroups(unique96Clubs, { shuffleWithinRegion: true }).map((grp) =>
    grp.map((c) => c.id)
  );
}

function buildSerieDFromGroups(
  groupClubsList: string[][],
  year: number
): { fixtures: Fixture[]; standings: Standing[] } {
  const firstHalfTemplate: Array<Array<[number, number]>> = [
    [
      [0, 5],
      [1, 4],
      [2, 3],
    ],
    [
      [4, 0],
      [5, 3],
      [1, 2],
    ],
    [
      [0, 3],
      [2, 5],
      [4, 1],
    ],
    [
      [2, 0],
      [3, 1],
      [5, 4],
    ],
    [
      [0, 1],
      [4, 2],
      [3, 5],
    ],
  ];
  const fullTenRoundsTemplate: Array<Array<[number, number]>> = [
    ...firstHalfTemplate,
    ...firstHalfTemplate.map((pairs) => pairs.map(([h, a]) => [a, h] as [number, number])),
  ];

  const serieDDates = getSerieDScheduleDates(year);
  const firstOfficialDate = serieDDates[0] || `${year}-04-04`;
  const finalOfficialDate = serieDDates[serieDDates.length - 1] || `${year}-09-12`;
  const fixtures: Fixture[] = [];
  const standings: Standing[] = [];

  for (let gIdx = 0; gIdx < 16; gIdx++) {
    const groupCode = String(gIdx + 1).padStart(2, '0');
    const groupName = `Grupo A${groupCode}`;
    const groupSlice = groupClubsList[gIdx] || [];
    if (groupSlice.length === 0) continue;

    groupSlice.forEach((teamId) => {
      standings.push({
        teamId,
        played: 0,
        won: 0,
        drawn: 0,
        lost: 0,
        goalsFor: 0,
        goalsAgainst: 0,
        goalDifference: 0,
        points: 0,
        form: [],
        group: groupName,
      });
    });

    if (groupSlice.length < 6) continue;

    fullTenRoundsTemplate.forEach((pairs, rIdx) => {
      const roundNum = rIdx + 1;
      const roundDate = serieDDates[rIdx] || getRoundDate(roundNum, year).date;
      const prevRoundDate = rIdx > 0 ? serieDDates[rIdx - 1] : undefined;
      const nextRoundDate = rIdx + 1 < fullTenRoundsTemplate.length ? serieDDates[rIdx + 1] : undefined;
      pairs.forEach(([hIdx, aIdx], mIdx) => {
        const slot = assignVariedMatchDaySlot(
          roundDate,
          mIdx + gIdx * 3,
          roundNum,
          fullTenRoundsTemplate.length,
          `serie_d_${year}`,
          {
            minDate: firstOfficialDate,
            maxDate: finalOfficialDate,
            prevRoundBaseDate: prevRoundDate,
            nextRoundBaseDate: nextRoundDate,
            region: 'south_america',
            fallbackTime: mIdx === 0 ? '16:00' : '15:00',
          }
        );
        fixtures.push({
          id: `sd_g${groupCode}_r${roundNum}_m${mIdx}`,
          round: roundNum,
          competition: 'serie_d',
          cupPhase: `${groupName} • Rodada ${roundNum}`,
          homeTeamId: groupSlice[hIdx],
          awayTeamId: groupSlice[aIdx],
          homeScore: null,
          awayScore: null,
          played: false,
          date: slot.date,
          time: slot.time,
        });
      });
    });
  }

  const pushTwoLeggedSerieDStage = (
    stagePrefix: string,
    cupPhaseLabel: string,
    tiesCount: number,
    idaRound: number,
    voltaRound: number,
    idaSlotIdx: number,
    voltaSlotIdx: number
  ) => {
    const idaDate = serieDDates[idaSlotIdx] || getRoundDate(idaRound, year).date;
    const voltaDate = serieDDates[voltaSlotIdx] || getRoundDate(voltaRound, year).date;

    for (let i = 0; i < tiesCount; i++) {
      const idaId = tiesCount === 1 ? `${stagePrefix}_ida` : `${stagePrefix}_m${i}_ida`;
      const voltaId = tiesCount === 1 ? `${stagePrefix}_volta` : `${stagePrefix}_m${i}_volta`;
      fixtures.push({
        id: idaId,
        round: idaRound,
        competition: 'serie_d',
        cupPhase: cupPhaseLabel,
        leg: 1,
        homeTeamId: 'tbd',
        awayTeamId: 'tbd',
        homeScore: null,
        awayScore: null,
        played: false,
        date: idaDate,
        time: '16:00',
      });
      fixtures.push({
        id: voltaId,
        round: voltaRound,
        competition: 'serie_d',
        cupPhase: cupPhaseLabel,
        leg: 2,
        homeTeamId: 'tbd',
        awayTeamId: 'tbd',
        homeScore: null,
        awayScore: null,
        played: false,
        date: voltaDate,
        time: '16:00',
      });
    }
  };

  pushTwoLeggedSerieDStage('sd_f2', '2ª Fase', 32, 11, 12, 10, 11);
  pushTwoLeggedSerieDStage('sd_f3', '3ª Fase', 16, 13, 14, 12, 13);
  pushTwoLeggedSerieDStage('sd_oitavas', 'Oitavas de Final', 8, 15, 16, 14, 15);
  pushTwoLeggedSerieDStage('sd_quartas', 'Quartas de Final (Valendo Acesso)', 4, 17, 18, 16, 17);
  pushTwoLeggedSerieDStage('sd_semi', 'Semifinal', 2, 19, 20, 18, 19);
  pushTwoLeggedSerieDStage('sd_final', 'Grande Final da Série D', 1, 21, 22, 20, 21);

  return { fixtures, standings };
}

/**
 * Gera um sorteio real e aleatório (respeitando potes, cabeças de chave e trava por país quando aplicável)
 * para qualquer campeonato de clubes ainda não iniciado (0 partidas disputadas).
 */
export function regenerateClubCompetitionDraw(
  save: GameSave,
  competition: CompetitionType
): { updatedSave: GameSave; regenerated: boolean; feedback: string } {
  const allClubs = withWorldGuestClubs(save.clubs);
  const clubsMap = new Map(allClubs.map((c) => [c.id, c]));
  const year = getCompetitionSeasonYear(save, competition);
  const compName = COMPETITIONS_CATALOG[competition]?.name || competition;
  const currentDrawn = save.drawnCompetitions || [];
  const nextDrawn = currentDrawn.includes(competition)
    ? currentDrawn
    : [...currentDrawn, competition];

  const { fixtures: existingFixtures, standings: existingStandings } =
    getClubCompetitionFixturesAndStandings(save, competition);

  if (existingFixtures.length === 0 || existingFixtures.some((f) => f.played)) {
    return {
      updatedSave: { ...save, drawnCompetitions: nextDrawn },
      regenerated: false,
      feedback: `${compName} já está em andamento — exibindo o sorteio oficial vigente.`,
    };
  }

  const groupLetters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

  if (competition === 'libertadores') {
    const libChampId = resolveCupChampionId(save.fixturesLibertadores);
    const sulaChampId = resolveCupChampionId(save.fixturesSulamericana);
    let ids = existingStandings.map((s) => s.teamId).filter((id) => clubsMap.has(id));
    if (ids.length < 32) {
      ids = computeConmebolContinentalQualifiers({
        clubs: allClubs,
        standingsA: save.standingsA,
        standingsSouthAmerica: save.standingsSouthAmerica,
        libertadoresChampId: libChampId,
        sulamericanaChampId: sulaChampId,
      }).libertadoresIds;
    }
    const seededGroups = seedContinentalGroupsWithCountryProtection(
      ids.slice(0, 32),
      allClubs,
      libChampId,
      { shufflePots: true }
    );
    const groups: Record<string, string[]> = {};
    groupLetters.forEach((l, idx) => {
      groups[`Grupo ${l}`] = seededGroups[idx] || [];
    });
    const { libertadoresFinalDate } = getContinentalFinalDates(year);
    const built = build32ClubContinentalCompetition(
      'libertadores',
      'lib',
      groups,
      year,
      'lib_grande_final',
      'Grande Final da Glória Eterna',
      'Estádio Centenario (Montevidéu)',
      libertadoresFinalDate,
      '21:30'
    );
    return {
      updatedSave: {
        ...save,
        fixturesLibertadores: built.fixtures,
        standingsLibertadores: built.standings,
        drawnCompetitions: nextDrawn,
      },
      regenerated: true,
      feedback: `Sorteio oficial da ${compName} ${year} gerado! 8 grupos sorteados com proteção por país.`,
    };
  }

  if (competition === 'sulamericana') {
    const libChampId = resolveCupChampionId(save.fixturesLibertadores);
    const sulaChampId = resolveCupChampionId(save.fixturesSulamericana);
    let ids = existingStandings.map((s) => s.teamId).filter((id) => clubsMap.has(id));
    if (ids.length < 32) {
      ids = computeConmebolContinentalQualifiers({
        clubs: allClubs,
        standingsA: save.standingsA,
        standingsSouthAmerica: save.standingsSouthAmerica,
        libertadoresChampId: libChampId,
        sulamericanaChampId: sulaChampId,
      }).sulamericanaIds;
    }
    const seededGroups = seedContinentalGroupsWithCountryProtection(
      ids.slice(0, 32),
      allClubs,
      sulaChampId,
      { shufflePots: true }
    );
    const groups: Record<string, string[]> = {};
    groupLetters.forEach((l, idx) => {
      groups[`Grupo ${l}`] = seededGroups[idx] || [];
    });
    const { sulamericanaFinalDate } = getContinentalFinalDates(year);
    const built = build32ClubContinentalCompetition(
      'sulamericana',
      'sula',
      groups,
      year,
      'sula_final',
      'Grande Final Sul-Americana',
      'Estádio Metropolitano (Barranquilla)',
      sulamericanaFinalDate,
      '19:30'
    );
    return {
      updatedSave: {
        ...save,
        fixturesSulamericana: built.fixtures,
        standingsSulamericana: built.standings,
        drawnCompetitions: nextDrawn,
      },
      regenerated: true,
      feedback: `Sorteio oficial da ${compName} ${year} gerado! Grupos A–H sorteados.`,
    };
  }

  if (competition === 'copa_internacional') {
    const ids = existingStandings.map((s) => s.teamId).filter((id) => clubsMap.has(id));
    const seededGroups = seedContinentalGroupsWithCountryProtection(
      ids.slice(0, 32),
      allClubs,
      undefined,
      { shufflePots: true }
    );
    const groups: Record<string, string[]> = {};
    groupLetters.forEach((l, idx) => {
      groups[`Grupo ${l}`] = seededGroups[idx] || [];
    });
    const { sulamericanaFinalDate } = getContinentalFinalDates(year);
    const built = build32ClubContinentalCompetition(
      'copa_internacional',
      'cint',
      groups,
      year,
      'cint_final',
      'Grande Final da Champions Internacional',
      'King Abdullah Sports City (Jeddah)',
      sulamericanaFinalDate,
      '20:00'
    );
    return {
      updatedSave: {
        ...save,
        fixturesCopaInternacional: built.fixtures,
        standingsCopaInternacional: built.standings,
        drawnCompetitions: nextDrawn,
      },
      regenerated: true,
      feedback: `Sorteio oficial da ${compName} ${year} gerado!`,
    };
  }

  if (competition === 'super_mundial_clubes') {
    let ids = existingStandings.map((s) => s.teamId).filter((id) => clubsMap.has(id));
    if (ids.length < 32) {
      ids = computeSuperMundial32Qualifiers(save).map((q) => q.clubId);
    }
    const smwcGroups = seedContinentalGroupsWithCountryProtection(
      ids.slice(0, 32),
      allClubs,
      save.reigningUclChampId,
      { shufflePots: true }
    );
    const built = generateSuperMundialFixtures(save, year, smwcGroups);
    return {
      updatedSave: {
        ...save,
        fixturesSuperMundial: built.fixtures,
        standingsSuperMundial: built.standings,
        drawnCompetitions: nextDrawn,
      },
      regenerated: true,
      feedback: `Sorteio do Super Mundial de Clubes FIFA ${year} gerado! 8 grupos A–H definidos.`,
    };
  }

  if (
    competition === 'champions_league' ||
    competition === 'europa_league' ||
    competition === 'conference_league'
  ) {
    const defChamp =
      competition === 'champions_league'
        ? save.reigningUclChampId
        : competition === 'europa_league'
        ? save.reigningUelChampId
        : save.reigningUeclChampId;

    let ids = existingStandings.map((s) => s.teamId).filter((id) => clubsMap.has(id));
    if (ids.length < 36) {
      const q = computeUefaContinentalQualifiers({
        clubs: allClubs,
        standingsEurope: save.standingsEurope,
        uclTitleHolderId: save.reigningUclChampId,
        uelTitleHolderId: save.reigningUelChampId,
        ueclTitleHolderId: save.reigningUeclChampId,
      });
      ids =
        competition === 'champions_league'
          ? q.championsLeagueIds
          : competition === 'europa_league'
          ? q.europaLeagueIds
          : q.conferenceLeagueIds;
    }

    const ordered36 = resolveClubDrawSeedOrder(ids, allClubs, defChamp).slice(0, 36);
    const isConference = competition === 'conference_league';
    const potSize = isConference ? 6 : 9;
    const potCount = isConference ? 6 : 4;
    const shuffled36: string[] = [];
    for (let p = 0; p < potCount; p++) {
      const slice = ordered36.slice(p * potSize, (p + 1) * potSize);
      if (p === 0 && defChamp && slice[0] === defChamp) {
        shuffled36.push(slice[0], ...shuffleArray(slice.slice(1)));
      } else {
        shuffled36.push(...shuffleArray(slice));
      }
    }

    const uefaDates = getUefaCompetitionCalendarDates(year);
    const built = build36ClubUefaLeagueCompetition({
      competition,
      prefix: competition === 'champions_league' ? 'ucl' : competition === 'europa_league' ? 'uel' : 'uecl',
      seededClubIds: shuffled36,
      leagueRoundsCount: isConference ? 6 : 8,
      year,
      finalFixtureId:
        competition === 'champions_league'
          ? 'ucl_final'
          : competition === 'europa_league'
          ? 'uel_final'
          : 'uecl_final',
      finalPhaseTitle:
        competition === 'champions_league'
          ? 'Grande Final da UEFA Champions League'
          : competition === 'europa_league'
          ? 'Grande Final da UEFA Europa League'
          : 'Grande Final da UEFA Conference League',
      finalStadiumName:
        competition === 'champions_league'
          ? 'Estádio Metropolitano (Madrid)'
          : competition === 'europa_league'
          ? 'Waldstadion (Frankfurt)'
          : 'Beşiktaş Stadium (Istambul)',
      finalDate:
        competition === 'champions_league'
          ? uefaDates.uclFinalDate
          : competition === 'europa_league'
          ? uefaDates.uelFinalDate
          : uefaDates.ueclFinalDate,
      defaultKickoffTime: '16:00',
    });

    const patch: Partial<GameSave> =
      competition === 'champions_league'
        ? { fixturesChampionsLeague: built.fixtures, standingsChampionsLeague: built.standings }
        : competition === 'europa_league'
        ? { fixturesEuropaLeague: built.fixtures, standingsEuropaLeague: built.standings }
        : { fixturesConferenceLeague: built.fixtures, standingsConferenceLeague: built.standings };

    return {
      updatedSave: {
        ...save,
        ...patch,
        drawnCompetitions: nextDrawn,
      },
      regenerated: true,
      feedback: `Sorteio da Fase de Liga da ${compName} gerado! Novos confrontos definidos pelos potes UEFA.`,
    };
  }

  if (competition === 'afc_champions') {
    const westRows = existingStandings
      .filter((s) => s.group === 'Conferência Oeste')
      .map((s) => s.teamId);
    const eastRows = existingStandings
      .filter((s) => s.group === 'Conferência Leste')
      .map((s) => s.teamId);
    if (westRows.length === 16 && eastRows.length === 16) {
      const shuffleConfByPots = (ids: string[]) => {
        const ordered = resolveClubDrawSeedOrder(ids, allClubs);
        return [
          ...shuffleArray(ordered.slice(0, 4)),
          ...shuffleArray(ordered.slice(4, 8)),
          ...shuffleArray(ordered.slice(8, 12)),
          ...shuffleArray(ordered.slice(12, 16)),
        ];
      };
      const westIds = shuffleConfByPots(westRows);
      const eastIds = shuffleConfByPots(eastRows);
      const cal = getAfcChampionsCalendarDates(year);

      const newWestFixes = buildBalancedEightRoundConferenceFixtures(
        westIds,
        'Conferência Oeste',
        'west',
        year,
        cal.leagueDates,
        clubsMap
      );
      const newEastFixes = buildBalancedEightRoundConferenceFixtures(
        eastIds,
        'Conferência Leste',
        'east',
        year,
        cal.leagueDates,
        clubsMap
      );
      const knockoutSkeleton = existingFixtures.filter(
        (f) => !(f.cupPhase || '').toLowerCase().includes('fase de liga')
      );
      const newStandings: Standing[] = [
        ...westIds.map((teamId) => ({
          teamId,
          played: 0,
          won: 0,
          drawn: 0,
          lost: 0,
          goalsFor: 0,
          goalsAgainst: 0,
          goalDifference: 0,
          points: 0,
          form: [] as ('V' | 'E' | 'D')[],
          group: 'Conferência Oeste',
        })),
        ...eastIds.map((teamId) => ({
          teamId,
          played: 0,
          won: 0,
          drawn: 0,
          lost: 0,
          goalsFor: 0,
          goalsAgainst: 0,
          goalDifference: 0,
          points: 0,
          form: [] as ('V' | 'E' | 'D')[],
          group: 'Conferência Leste',
        })),
      ];

      return {
        updatedSave: {
          ...save,
          fixturesAfcChampions: [...newWestFixes, ...newEastFixes, ...knockoutSkeleton],
          standingsAfcChampions: newStandings,
          drawnCompetitions: nextDrawn,
        },
        regenerated: true,
        feedback: `Sorteio da ${compName} gerado! Novos duelos das conferências Oeste e Leste definidos.`,
      };
    }
  }

  if (competition === 'serie_d') {
    const rawIds = existingStandings.map((s) => s.teamId).filter((id) => clubsMap.has(id));
    const fallbackIds =
      rawIds.length >= 96
        ? rawIds
        : allClubs
            .filter((c) => c.division === 'D')
            .slice(0, 96)
            .map((c) => c.id);
    const groupsList = seedSerieDGroupsWithShuffle(fallbackIds, allClubs);
    const built = buildSerieDFromGroups(groupsList, year);
    return {
      updatedSave: {
        ...save,
        fixturesD: built.fixtures,
        standingsD: built.standings,
        drawnCompetitions: nextDrawn,
      },
      regenerated: true,
      feedback: `Sorteio do Brasileirão Série D ${year} gerado! 16 grupos (A01–A16) definidos.`,
    };
  }

  if (competition === 'copa_brasil') {
    const f1Fixtures = existingFixtures.filter((f) => f.id.startsWith('cdb_f1_m'));
    const f2DirectFixtures = existingFixtures.filter(
      (f) => f.cupPhase === '2ª Fase' && f.homeTeamId !== 'tbd' && f.awayTeamId !== 'tbd'
    );
    const f1Homes = shuffleArray(f1Fixtures.map((f) => f.homeTeamId));
    const f1Aways = shuffleArray(f1Fixtures.map((f) => f.awayTeamId));
    const f2DirectHomes = shuffleArray(f2DirectFixtures.map((f) => f.homeTeamId));
    const f2DirectAways = shuffleArray(f2DirectFixtures.map((f) => f.awayTeamId));

    const f1Map = new Map<string, [string, string]>();
    f1Fixtures.forEach((f, idx) => {
      f1Map.set(f.id, [f1Homes[idx] || f.homeTeamId, f1Aways[idx] || f.awayTeamId]);
    });
    const f2DirectMap = new Map<string, [string, string]>();
    f2DirectFixtures.forEach((f, idx) => {
      f2DirectMap.set(f.id, [f2DirectHomes[idx] || f.homeTeamId, f2DirectAways[idx] || f.awayTeamId]);
    });

    const updatedFixtures = existingFixtures.map((f) => {
      const f1Pair = f1Map.get(f.id);
      if (f1Pair) return { ...f, homeTeamId: f1Pair[0], awayTeamId: f1Pair[1] };
      const f2Pair = f2DirectMap.get(f.id);
      if (f2Pair) return { ...f, homeTeamId: f2Pair[0], awayTeamId: f2Pair[1] };
      return f;
    });

    return {
      updatedSave: {
        ...save,
        fixturesCopaBrasil: updatedFixtures,
        drawnCompetitions: nextDrawn,
      },
      regenerated: true,
      feedback: `Sorteio oficial da Copa do Brasil ${year} gerado! Chaves da 1ª e 2ª Fase sorteadas.`,
    };
  }

  if (competition === 'concacaf_champions') {
    const r1Ida = existingFixtures.filter((f) => f.cupPhase === 'Primeira Rodada' && f.leg === 1);
    const r1Homes = shuffleArray(r1Ida.map((f) => f.homeTeamId));
    const r1Aways = shuffleArray(r1Ida.map((f) => f.awayTeamId));
    const r1PairByIdx = new Map<string, [string, string]>();
    r1Ida.forEach((f, idx) => {
      const key = f.id.replace(/_ida$/, '');
      r1PairByIdx.set(key, [r1Homes[idx] || f.homeTeamId, r1Aways[idx] || f.awayTeamId]);
    });
    const updatedFixtures = existingFixtures.map((f) => {
      const baseId = f.id.replace(/_(ida|volta)$/, '');
      const pair = r1PairByIdx.get(baseId);
      if (!pair) return f;
      if (f.leg === 1) {
        return {
          ...f,
          homeTeamId: pair[0],
          awayTeamId: pair[1],
          stadiumName: clubsMap.get(pair[0])?.stadium.name || f.stadiumName,
        };
      }
      return {
        ...f,
        homeTeamId: pair[1],
        awayTeamId: pair[0],
        stadiumName: clubsMap.get(pair[1])?.stadium.name || f.stadiumName,
      };
    });

    return {
      updatedSave: {
        ...save,
        fixturesConcacafChampions: updatedFixtures,
        drawnCompetitions: nextDrawn,
      },
      regenerated: true,
      feedback: `Sorteio oficial da ${compName} ${year} gerado!`,
    };
  }

  return {
    updatedSave: { ...save, drawnCompetitions: nextDrawn },
    regenerated: false,
    feedback: `Cerimônia de sorteio de ${compName} concluída.`,
  };
}
