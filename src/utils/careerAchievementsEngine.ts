import { Club, GameSave } from '../types/game';

export type AchievementTier = 'BRONZE' | 'PRATA' | 'OURO' | 'LENDARIO';

export interface CareerAchievementItem {
  id: string;
  title: string;
  description: string;
  tier: AchievementTier;
  hallOfFameBonusPts: number;
  unlocked: boolean;
  progressCurrent: number;
  progressTarget: number;
  progressLabel: string;
}

export interface HallOfFameCoachEntry {
  rank: number;
  id: string;
  name: string;
  nationality: string;
  eraLabel: string;
  iconicClubs: string;
  majorTrophies: number;
  worldAndContinentalTitles: number;
  hallOfFamePoints: number;
  isUser: boolean;
}

const LEGENDARY_COACHES_BENCHMARK: Omit<HallOfFameCoachEntry, 'rank' | 'isUser'>[] = [
  {
    id: 'hof_ferguson',
    name: 'Sir Alex Ferguson',
    nationality: 'Escócia',
    eraLabel: 'Lenda Mundial',
    iconicClubs: 'Aberdeen · Manchester United',
    majorTrophies: 49,
    worldAndContinentalTitles: 6,
    hallOfFamePoints: 2480,
  },
  {
    id: 'hof_guardiola',
    name: 'Pep Guardiola',
    nationality: 'Espanha',
    eraLabel: 'Gênio Tático',
    iconicClubs: 'Barcelona · Bayern · Manchester City',
    majorTrophies: 39,
    worldAndContinentalTitles: 8,
    hallOfFamePoints: 2320,
  },
  {
    id: 'hof_ancelotti',
    name: 'Carlo Ancelotti',
    nationality: 'Itália',
    eraLabel: 'Rei da Europa',
    iconicClubs: 'Milan · Chelsea · PSG · Bayern · Real Madrid',
    majorTrophies: 30,
    worldAndContinentalTitles: 9,
    hallOfFamePoints: 2190,
  },
  {
    id: 'hof_mourinho',
    name: 'José Mourinho',
    nationality: 'Portugal',
    eraLabel: 'The Special One',
    iconicClubs: 'Porto · Chelsea · Inter · Real Madrid · Roma',
    majorTrophies: 26,
    worldAndContinentalTitles: 5,
    hallOfFamePoints: 1690,
  },
  {
    id: 'hof_tele',
    name: 'Telê Santana',
    nationality: 'Brasil',
    eraLabel: 'Mestre do Futebol-Arte',
    iconicClubs: 'Atlético-MG · Seleção Brasileira · São Paulo',
    majorTrophies: 16,
    worldAndContinentalTitles: 4,
    hallOfFamePoints: 1420,
  },
  {
    id: 'hof_felipao',
    name: 'Luiz Felipe Scolari',
    nationality: 'Brasil',
    eraLabel: 'Pentacampeão Mundial',
    iconicClubs: 'Grêmio · Palmeiras · Seleção Brasileira · Cruzeiro',
    majorTrophies: 27,
    worldAndContinentalTitles: 3,
    hallOfFamePoints: 1360,
  },
  {
    id: 'hof_abel',
    name: 'Abel Ferreira',
    nationality: 'Portugal',
    eraLabel: 'Era Moderna Sul-Americana',
    iconicClubs: 'PAOK · Palmeiras',
    majorTrophies: 10,
    worldAndContinentalTitles: 3,
    hallOfFamePoints: 940,
  },
  {
    id: 'hof_muricy',
    name: 'Muricy Ramalho',
    nationality: 'Brasil',
    eraLabel: 'Tricampeão Brasileiro Seguido',
    iconicClubs: 'Internacional · São Paulo · Fluminense · Santos',
    majorTrophies: 14,
    worldAndContinentalTitles: 1,
    hallOfFamePoints: 860,
  },
  {
    id: 'hof_ceni',
    name: 'Jorge Jesus',
    nationality: 'Portugal',
    eraLabel: 'Multicampeão Internacional',
    iconicClubs: 'Benfica · Flamengo · Al-Hilal',
    majorTrophies: 19,
    worldAndContinentalTitles: 2,
    hallOfFamePoints: 790,
  },
];

export function evaluateManagerAchievementsAndHallOfFame(
  state: GameSave,
  userClub: Club
): {
  achievements: CareerAchievementItem[];
  unlockedCount: number;
  totalCount: number;
  userHallOfFamePoints: number;
  userRankPosition: number;
  hallOfFameTable: HallOfFameCoachEntry[];
} {
  const career = state.managerCareer;
  const stints = career?.careerStints || [];
  const totalMatches = stints.reduce((acc, s) => acc + s.matches, 0);
  const totalWins = stints.reduce((acc, s) => acc + s.wins, 0);
  const totalDraws = stints.reduce((acc, s) => acc + s.draws, 0);

  const userTrophies = (state.trophyHistory || []).filter((t) => t.userWon);
  const persistedIds = new Set(state.unlockedAchievementIds || []);

  // Classify user trophies
  let worldTitles = 0;
  let continentalTitles = 0;
  let nationalLeagueTitles = 0;
  let nationalCupTitles = 0;
  let regionalTitles = 0;

  const trophiesByYear = new Map<number, number>();
  for (const t of userTrophies) {
    trophiesByYear.set(t.year, (trophiesByYear.get(t.year) || 0) + 1);
    const nameLower = t.competition.toLowerCase();
    if (
      nameLower.includes('mundial') ||
      nameLower.includes('intercontinental') ||
      nameLower.includes('copa do mundo')
    ) {
      worldTitles++;
    } else if (
      nameLower.includes('libertadores') ||
      nameLower.includes('champions') ||
      nameLower.includes('sul-americana') ||
      nameLower.includes('europa league') ||
      nameLower.includes('conference') ||
      nameLower.includes('recopa') ||
      nameLower.includes('copa américa') ||
      nameLower.includes('eurocopa') ||
      nameLower.includes('oceania') ||
      nameLower.includes('ofc') ||
      nameLower.includes('copa africana') ||
      nameLower.includes('copa da ásia') ||
      nameLower.includes('copa ouro')
    ) {
      continentalTitles++;
    } else if (
      nameLower.includes('copa do brasil') ||
      nameLower.includes('supercopa')
    ) {
      nationalCupTitles++;
    } else if (
      nameLower.includes('estadual') ||
      nameLower.includes('paulist') ||
      nameLower.includes('carioca') ||
      nameLower.includes('mineiro') ||
      nameLower.includes('gaúcho') ||
      nameLower.includes('nordeste')
    ) {
      regionalTitles++;
    } else {
      nationalLeagueTitles++;
    }
  }

  const maxTrophiesInSingleSeason = Array.from(trophiesByYear.values()).reduce(
    (m, v) => (v > m ? v : m),
    0
  );

  // Check lower division stints or titles
  const coachedLowerDiv =
    userClub.division === 'B' ||
    userClub.division === 'C' ||
    userClub.division === 'D' ||
    stints.some(
      (s) => s.divisionAtStart === 'B' || s.divisionAtStart === 'C' || s.divisionAtStart === 'D'
    );
  const lowerDivTrophyOrPromo =
    userTrophies.some((t) => {
      const l = t.competition.toLowerCase();
      return l.includes('série b') || l.includes('série c') || l.includes('série d') || l.includes('championship');
    }) ||
    (coachedLowerDiv && totalWins >= 15);

  // National Team wins / trophies
  const ntWins = state.nationalTeam?.coachWins || 0;
  const ntTrophies = state.nationalTeam?.trophiesWonWithSelecao || 0;

  // Individual awards / Ballon d'Or / Academy level
  const userBallonDorCount = (state.worldBallonDorHistory || []).filter(
    (b) => b.winner.userWon
  ).length;
  const userIndAwardsCount = (state.individualAwardsHistory || []).filter(
    (a) => a.userWon
  ).length;
  const facilityMax = Math.max(
    userClub.finances.trainingFacilityLevel || 1,
    userClub.finances.youthAcademyLevel || 1
  );

  const distinctClubsCoached = new Set([
    userClub.id,
    ...stints.map((s) => s.clubId),
  ]).size;

  const balanceMillions = Math.max(0, Math.floor(userClub.finances.balance / 1_000_000));

  const rawList: Array<Omit<CareerAchievementItem, 'unlocked'> & { condition: boolean }> = [
    {
      id: 'first_win',
      title: 'Primeira Vitória Oficial',
      description: 'Conquiste sua primeira vitória oficial na beira do gramado.',
      tier: 'BRONZE',
      hallOfFameBonusPts: 25,
      condition: totalWins >= 1,
      progressCurrent: Math.min(1, totalWins),
      progressTarget: 1,
      progressLabel: `${Math.min(1, totalWins)}/1 vitória`,
    },
    {
      id: 'first_trophy',
      title: 'Primeira Taça na Galeria',
      description: 'Levante seu primeiro troféu oficial comandando um clube ou seleção.',
      tier: 'BRONZE',
      hallOfFameBonusPts: 50,
      condition: userTrophies.length + ntTrophies >= 1,
      progressCurrent: Math.min(1, userTrophies.length + ntTrophies),
      progressTarget: 1,
      progressLabel: `${Math.min(1, userTrophies.length + ntTrophies)}/1 título`,
    },
    {
      id: 'centurion_coach',
      title: 'Cem Jogos na Área Técnica',
      description: 'Complete 100 partidas oficiais comandadas ao longo da carreira.',
      tier: 'PRATA',
      hallOfFameBonusPts: 80,
      condition: totalMatches >= 100,
      progressCurrent: Math.min(100, totalMatches),
      progressTarget: 100,
      progressLabel: `${Math.min(100, totalMatches)}/100 jogos`,
    },
    {
      id: 'cup_king',
      title: 'Copeiro Imortal',
      description: 'Vença uma Copa Nacional eliminatória ou Supercopa.',
      tier: 'PRATA',
      hallOfFameBonusPts: 75,
      condition: nationalCupTitles >= 1,
      progressCurrent: Math.min(1, nationalCupTitles),
      progressTarget: 1,
      progressLabel: `${Math.min(1, nationalCupTitles)}/1 copa nacional`,
    },
    {
      id: 'national_champion',
      title: 'Campeão Nacional',
      description: 'Conquiste um título de liga nacional na sua carreira.',
      tier: 'OURO',
      hallOfFameBonusPts: 130,
      condition: nationalLeagueTitles >= 1,
      progressCurrent: Math.min(1, nationalLeagueTitles),
      progressTarget: 1,
      progressLabel: `${Math.min(1, nationalLeagueTitles)}/1 liga nacional`,
    },
    {
      id: 'continental_glory',
      title: 'Rei do Continente',
      description: 'Conquiste Libertadores, Champions League, Sul-Americana, Europa League ou Champions Internacional.',
      tier: 'OURO',
      hallOfFameBonusPts: 180,
      condition: continentalTitles >= 1,
      progressCurrent: Math.min(1, continentalTitles),
      progressTarget: 1,
      progressLabel: `${Math.min(1, continentalTitles)}/1 título continental`,
    },
    {
      id: 'world_club_champ',
      title: 'Campeão do Mundo',
      description: 'Conquiste o Super Mundial de Clubes FIFA (32 Times), Copa Intercontinental ou Copa do Mundo.',
      tier: 'LENDARIO',
      hallOfFameBonusPts: 260,
      condition: worldTitles >= 1 || ntTrophies >= 1,
      progressCurrent: Math.min(1, worldTitles + ntTrophies),
      progressTarget: 1,
      progressLabel: `${Math.min(1, worldTitles + ntTrophies)}/1 título mundial`,
    },
    {
      id: 'treble_season',
      title: 'Tríplice Coroa Histórica',
      description: 'Conquiste 3 ou mais títulos oficiais em uma mesma temporada.',
      tier: 'LENDARIO',
      hallOfFameBonusPts: 240,
      condition: maxTrophiesInSingleSeason >= 3,
      progressCurrent: Math.min(3, maxTrophiesInSingleSeason),
      progressTarget: 3,
      progressLabel: `${Math.min(3, maxTrophiesInSingleSeason)}/3 taças no mesmo ano`,
    },
    {
      id: 'lower_division_hero',
      title: 'Herói do Acesso',
      description: 'Conquiste título de divisão de acesso ou vença 15 jogos nas Séries B, C ou D.',
      tier: 'PRATA',
      hallOfFameBonusPts: 110,
      condition: lowerDivTrophyOrPromo,
      progressCurrent: lowerDivTrophyOrPromo ? 1 : coachedLowerDiv ? Math.min(14, totalWins) : 0,
      progressTarget: lowerDivTrophyOrPromo ? 1 : 15,
      progressLabel: lowerDivTrophyOrPromo ? 'Concluído' : `${coachedLowerDiv ? Math.min(15, totalWins) : 0}/15 vitórias no acesso`,
    },
    {
      id: 'selecao_glory',
      title: 'Comandante de Seleção',
      description: 'Assuma uma Seleção Nacional e conquiste 5 vitórias em Datas FIFA ou um torneio oficial.',
      tier: 'OURO',
      hallOfFameBonusPts: 140,
      condition: ntWins >= 5 || ntTrophies >= 1,
      progressCurrent: ntTrophies >= 1 ? 5 : Math.min(5, ntWins),
      progressTarget: 5,
      progressLabel: ntTrophies >= 1 ? 'Campeão pela Seleção' : `${Math.min(5, ntWins)}/5 vitórias na Seleção`,
    },
    {
      id: 'youth_and_stars',
      title: 'Lapidador de Melhor do Mundo',
      description: 'Tenha um atleta eleito Bola de Ouro / Craque da Liga ou eleve o CT/Base ao Nível 4.',
      tier: 'OURO',
      hallOfFameBonusPts: 120,
      condition: userBallonDorCount >= 1 || userIndAwardsCount >= 1 || facilityMax >= 4,
      progressCurrent:
        userBallonDorCount >= 1 || userIndAwardsCount >= 1 ? 4 : Math.min(4, facilityMax),
      progressTarget: 4,
      progressLabel:
        userBallonDorCount >= 1
          ? 'Bola de Ouro no Clube!'
          : userIndAwardsCount >= 1
          ? `${userIndAwardsCount} prêmio(s) individual(is)`
          : `Estrutura Nível ${facilityMax}/4`,
    },
    {
      id: 'financial_tycoon',
      title: 'Magnata das Finanças',
      description: 'Alcance R$ 200 milhões ou mais de saldo positivo em caixa no seu clube.',
      tier: 'PRATA',
      hallOfFameBonusPts: 85,
      condition: balanceMillions >= 200,
      progressCurrent: Math.min(200, balanceMillions),
      progressTarget: 200,
      progressLabel: `R$ ${Math.min(200, balanceMillions)}M / R$ 200M`,
    },
    {
      id: 'global_prestige',
      title: 'Técnico de Elite Mundial',
      description: 'Alcance Reputação 80+ na carreira ou comande 2 ou mais clubes diferentes.',
      tier: 'PRATA',
      hallOfFameBonusPts: 95,
      condition: (career?.managerReputation || 50) >= 80 || distinctClubsCoached >= 2,
      progressCurrent:
        distinctClubsCoached >= 2 ? 80 : Math.min(80, career?.managerReputation || 50),
      progressTarget: 80,
      progressLabel:
        distinctClubsCoached >= 2
          ? `${distinctClubsCoached} clubes comandados`
          : `Reputação ${career?.managerReputation || 50}/80`,
    },
    {
      id: 'dynasty_5_titles',
      title: 'Dinastia de Campeão',
      description: 'Acumule 5 ou mais títulos oficiais conquistados na sua carreira.',
      tier: 'LENDARIO',
      hallOfFameBonusPts: 220,
      condition: userTrophies.length + ntTrophies >= 5,
      progressCurrent: Math.min(5, userTrophies.length + ntTrophies),
      progressTarget: 5,
      progressLabel: `${Math.min(5, userTrophies.length + ntTrophies)}/5 títulos`,
    },
  ];

  const achievements: CareerAchievementItem[] = rawList.map((item) => ({
    id: item.id,
    title: item.title,
    description: item.description,
    tier: item.tier,
    hallOfFameBonusPts: item.hallOfFameBonusPts,
    unlocked: item.condition || persistedIds.has(item.id),
    progressCurrent: item.condition || persistedIds.has(item.id) ? item.progressTarget : item.progressCurrent,
    progressTarget: item.progressTarget,
    progressLabel: item.progressLabel,
  }));

  const unlockedBonusPts = achievements
    .filter((a) => a.unlocked)
    .reduce((acc, a) => acc + a.hallOfFameBonusPts, 0);

  const trophyPts =
    worldTitles * 210 +
    ntTrophies * 220 +
    continentalTitles * 145 +
    nationalLeagueTitles * 95 +
    nationalCupTitles * 65 +
    regionalTitles * 25;

  const matchPts = totalWins * 4 + totalDraws * 1;
  const ballonDorCoachBonus = userBallonDorCount * 90;

  const userHallOfFamePoints = trophyPts + matchPts + unlockedBonusPts + ballonDorCoachBonus;

  const clubNamesList = Array.from(
    new Set([userClub.shortName, ...stints.map((s) => s.clubName)])
  )
    .slice(0, 3)
    .join(' · ');

  const userEntry: Omit<HallOfFameCoachEntry, 'rank'> = {
    id: 'hof_user_manager',
    name: state.managerName || 'Você (Treinador)',
    nationality: 'Carreira Ativa',
    eraLabel: `Temporada ${state.currentSeasonYear}`,
    iconicClubs: clubNamesList || userClub.name,
    majorTrophies: userTrophies.length + ntTrophies,
    worldAndContinentalTitles: worldTitles + continentalTitles + ntTrophies,
    hallOfFamePoints: userHallOfFamePoints,
    isUser: true,
  };

  const combined = [
    userEntry,
    ...LEGENDARY_COACHES_BENCHMARK.map((c) => ({ ...c, isUser: false })),
  ].sort((a, b) => {
    if (b.hallOfFamePoints !== a.hallOfFamePoints) return b.hallOfFamePoints - a.hallOfFamePoints;
    return b.majorTrophies - a.majorTrophies;
  });

  const hallOfFameTable: HallOfFameCoachEntry[] = combined.map((entry, idx) => ({
    ...entry,
    rank: idx + 1,
  }));

  const userRankPosition = hallOfFameTable.find((e) => e.isUser)?.rank || hallOfFameTable.length;

  return {
    achievements,
    unlockedCount: achievements.filter((a) => a.unlocked).length,
    totalCount: achievements.length,
    userHallOfFamePoints,
    userRankPosition,
    hallOfFameTable,
  };
}
