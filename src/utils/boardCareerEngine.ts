import {
  BoardSeasonGoal,
  Club,
  Division,
  Fixture,
  GameSave,
  InboxMessage,
  ManagerCareerState,
  ManagerCareerStint,
  ManagerDismissalSummary,
  ManagerJobOffer,
  Standing,
} from '../types/game';
import { formatShortDate } from './calendarUtils';
import { formatCurrency } from './individualAwardsEngine';
import { getMatchRivalryInfo } from './rivalryEngine';
import {
  getClubSouthAmericanLeagueId,
  SOUTH_AMERICAN_LEAGUES_META,
} from './southAmericaLeaguesEngine';
import {
  EUROPEAN_LEAGUES_META,
  getClubEuropeanLeagueId,
} from './europeLeaguesEngine';
import { getClubEconomyProfile } from './clubEconomyScale';
import {
  getClubWorldLeagueId,
  WORLD_LEAGUES_META,
} from './worldLeaguesEngine';
import {
  ESTADUAIS_2026_CONFIG,
  EstadualCompetitionConfig,
  getClubEstadualConfig,
  getEstadualConfigByUf,
} from '../data/estaduais2026Config';

function resolveClubEstadualCfg(club?: Club): EstadualCompetitionConfig {
  return (
    (club ? getClubEstadualConfig(club) : undefined) ||
    getEstadualConfigByUf('RN') ||
    ESTADUAIS_2026_CONFIG[0]
  );
}

const CPU_REPLACEMENT_COACHES = [
  'Rogério Ceni',
  'Dorival Júnior',
  'Tite',
  'Renato Gaúcho',
  'Fernando Diniz',
  'Cuca',
  'Mano Menezes',
  'Juan Pablo Vojvoda',
  ' Eduardo Baptista',
  'Mozart Santos',
  'Jair Ventura',
  'Hélio dos Anjos',
];

export function getClubSquadAvgOverall(club: Club): number {
  if (!club.squad || club.squad.length === 0) return 68;
  const sorted = [...club.squad].sort((a, b) => b.overall - a.overall);
  const topEleven = sorted.slice(0, Math.min(11, sorted.length));
  const sum = topEleven.reduce((acc, p) => acc + p.overall, 0);
  return Math.round(sum / topEleven.length);
}

function getDivisionStandings(state: GameSave, division: Division, club?: Club): Standing[] {
  if (division === 'SA' && club) {
    const saLeagueId = getClubSouthAmericanLeagueId(club);
    if (saLeagueId && state.standingsSouthAmerica?.[saLeagueId]) {
      return state.standingsSouthAmerica[saLeagueId] || [];
    }
  }
  if (division === 'EU' && club) {
    const euLeagueId = getClubEuropeanLeagueId(club);
    if (euLeagueId && state.standingsEurope?.[euLeagueId]) {
      return state.standingsEurope[euLeagueId] || [];
    }
  }
  if (division === 'WL' && club) {
    const wlLeagueId = getClubWorldLeagueId(club);
    if (wlLeagueId && state.standingsWorldLeagues?.[wlLeagueId]) {
      return state.standingsWorldLeagues[wlLeagueId] || [];
    }
  }
  switch (division) {
    case 'A':
      return state.standingsA || [];
    case 'B':
      return state.standingsB || [];
    case 'C':
      return state.standingsC || [];
    case 'D':
      return state.standingsD || [];
    case 'EST': {
      const estName = resolveClubEstadualCfg(club).name;
      return (state.standingsEstadual || []).filter((s) => s.group === estName);
    }
    default:
      return state.standingsA || [];
  }
}

function getDivisionFixtures(state: GameSave, division: Division, club?: Club): Fixture[] {
  if (division === 'SA' && club) {
    const saLeagueId = getClubSouthAmericanLeagueId(club);
    if (saLeagueId && state.fixturesSouthAmerica?.[saLeagueId]) {
      return state.fixturesSouthAmerica[saLeagueId] || [];
    }
  }
  if (division === 'EU' && club) {
    const euLeagueId = getClubEuropeanLeagueId(club);
    if (euLeagueId && state.fixturesEurope?.[euLeagueId]) {
      return state.fixturesEurope[euLeagueId] || [];
    }
  }
  if (division === 'WL' && club) {
    const wlLeagueId = getClubWorldLeagueId(club);
    if (wlLeagueId && state.fixturesWorldLeagues?.[wlLeagueId]) {
      return state.fixturesWorldLeagues[wlLeagueId] || [];
    }
  }
  switch (division) {
    case 'A':
      return state.fixturesA || [];
    case 'B':
      return state.fixturesB || [];
    case 'C':
      return state.fixturesC || [];
    case 'D':
      return state.fixturesD || [];
    case 'EST': {
      const estName = resolveClubEstadualCfg(club).name;
      return (state.fixturesEstadual || []).filter((f) => f.groupName === estName);
    }
    default:
      return state.fixturesA || [];
  }
}

export function generateBoardSeasonGoals(
  club: Club,
  allClubs: Club[],
  seasonYear: number,
  fixturesCopaBrasil?: Fixture[],
  fixturesLibertadores?: Fixture[],
  fixturesSulamericana?: Fixture[],
  fixturesChampionsLeague?: Fixture[],
  fixturesEuropaLeague?: Fixture[],
  fixturesConferenceLeague?: Fixture[],
  fixturesCopaInternacional?: Fixture[],
  fixturesConcacafChampions?: Fixture[],
  fixturesAfcChampions?: Fixture[]
): BoardSeasonGoal[] {
  const saLeagueId = club.division === 'SA' ? getClubSouthAmericanLeagueId(club) : null;
  const saMeta = saLeagueId ? SOUTH_AMERICAN_LEAGUES_META[saLeagueId] : null;
  const euLeagueId = club.division === 'EU' ? getClubEuropeanLeagueId(club) : null;
  const euMeta = euLeagueId ? EUROPEAN_LEAGUES_META[euLeagueId] : null;
  const wlLeagueId = club.division === 'WL' ? getClubWorldLeagueId(club) : null;
  const wlMeta = wlLeagueId ? WORLD_LEAGUES_META[wlLeagueId] : null;
  const div =
    club.division === 'SA' || club.division === 'EU' || club.division === 'WL'
      ? 'A'
      : club.division;
  const estCfg = resolveClubEstadualCfg(club);
  const peers = allClubs
    .filter((c) =>
      euLeagueId
        ? getClubEuropeanLeagueId(c) === euLeagueId
        : saLeagueId
        ? getClubSouthAmericanLeagueId(c) === saLeagueId
        : wlLeagueId
        ? getClubWorldLeagueId(c) === wlLeagueId
        : div === 'EST'
        ? c.state === club.state || estCfg.defaultClubIds.includes(c.id)
        : c.division === div
    )
    .map((c) => ({
      id: c.id,
      power: c.reputation * 7.5 + getClubSquadAvgOverall(c),
    }))
    .sort((a, b) => b.power - a.power);

  const rankIndex = peers.findIndex((p) => p.id === club.id);
  const powerRank = rankIndex >= 0 ? rankIndex + 1 : 8;

  const goals: BoardSeasonGoal[] = [];

  // 1. Primary League Goal
  if (euMeta) {
    if (euMeta.tier > 1) {
      const promoSlots = euMeta.promotionSlots || 3;
      const safeCutoff = Math.max(12, euMeta.clubsCount - euMeta.relegationSlots);
      const nextTierLabel =
        euMeta.tier === 2
          ? 'Premier League'
          : euMeta.tier === 3
          ? 'EFL Championship'
          : 'EFL League One';
      if (powerRank <= promoSlots + 2) {
        goals.push({
          id: `goal_${seasonYear}_${club.id}_league`,
          category: 'LEAGUE',
          competitionLabel: euMeta.name,
          title: `Conquistar o Acesso à ${nextTierLabel} (G-${promoSlots})`,
          description: `Terminar entre os ${promoSlots} primeiros da ${euMeta.name} e subir de divisão na Inglaterra.`,
          targetPositionMax: promoSlots,
          rewardBonus: Math.round(euMeta.championPrize * 0.16),
          priority: 'Principal',
          status: 'ON_TRACK',
          currentProgressText: 'Início de campeonato',
        });
      } else if (powerRank <= 12) {
        goals.push({
          id: `goal_${seasonYear}_${club.id}_league`,
          category: 'LEAGUE',
          competitionLabel: euMeta.name,
          title: `Campanha Sólida na Parte de Cima (Top 10)`,
          description: `Fazer uma temporada competitiva na ${euMeta.name} e brigar na metade superior da tabela.`,
          targetPositionMax: 10,
          rewardBonus: Math.round(euMeta.championPrize * 0.08),
          priority: 'Principal',
          status: 'ON_TRACK',
          currentProgressText: 'Início de campeonato',
        });
      } else {
        goals.push({
          id: `goal_${seasonYear}_${club.id}_league`,
          category: 'LEAGUE',
          competitionLabel: euMeta.name,
          title: `Permanência na ${euMeta.name} (${safeCutoff}º ou acima)`,
          description: `Evitar a zona de rebaixamento na pirâmide inglesa ao fim das ${euMeta.totalRounds} rodadas.`,
          targetPositionMax: safeCutoff,
          rewardBonus: Math.round(euMeta.championPrize * 0.06),
          priority: 'Principal',
          status: 'ON_TRACK',
          currentProgressText: 'Início de campeonato',
        });
      }
    } else {
      const uclCutoff = euMeta.uclBerths;
      const uelCutoff = euMeta.uclBerths + euMeta.uelBerths;
      const ueclCutoff = uelCutoff + euMeta.ueclBerths;
      const safeCutoff = Math.max(ueclCutoff + 1, euMeta.clubsCount - euMeta.relegationSlots);

      if (powerRank <= 2) {
        goals.push({
          id: `goal_${seasonYear}_${club.id}_league`,
          category: 'LEAGUE',
          competitionLabel: euMeta.name,
          title: `Disputar o Título da ${euMeta.name} (Top 2)`,
          description: `Pelo peso e investimento em ${euMeta.country}, a diretoria exige brigar pelo título nacional e Champions League.`,
          targetPositionMax: 2,
          rewardBonus: Math.round(euMeta.championPrize * 0.14),
          priority: 'Principal',
          status: 'ON_TRACK',
          currentProgressText: 'Início de campeonato',
        });
      } else if (powerRank <= uclCutoff + 1) {
        goals.push({
          id: `goal_${seasonYear}_${club.id}_league`,
          category: 'LEAGUE',
          competitionLabel: euMeta.name,
          title: `Classificar à UEFA Champions League (G-${uclCutoff})`,
          description: `Terminar entre os ${uclCutoff} primeiros da ${euMeta.name} para garantir vaga na Champions League.`,
          targetPositionMax: uclCutoff,
          rewardBonus: Math.round(euMeta.championPrize * 0.1),
          priority: 'Principal',
          status: 'ON_TRACK',
          currentProgressText: 'Início de campeonato',
        });
      } else if (powerRank <= ueclCutoff + 1) {
        goals.push({
          id: `goal_${seasonYear}_${club.id}_league`,
          category: 'LEAGUE',
          competitionLabel: euMeta.name,
          title: `Vaga em Competição Europeia UEFA (Top ${ueclCutoff})`,
          description: `Assegurar classificação para a Europa League ou Conference League terminando até o ${ueclCutoff}º lugar.`,
          targetPositionMax: ueclCutoff,
          rewardBonus: Math.round(euMeta.championPrize * 0.06),
          priority: 'Principal',
          status: 'ON_TRACK',
          currentProgressText: 'Início de campeonato',
        });
      } else {
        goals.push({
          id: `goal_${seasonYear}_${club.id}_league`,
          category: 'LEAGUE',
          competitionLabel: euMeta.name,
          title: `Permanência na ${euMeta.name} (${safeCutoff}º ou acima)`,
          description: `Evitar as últimas ${euMeta.relegationSlots} posições e manter o clube na elite de ${euMeta.country}.`,
          targetPositionMax: safeCutoff,
          rewardBonus: Math.round(euMeta.championPrize * 0.045),
          priority: 'Principal',
          status: 'ON_TRACK',
          currentProgressText: 'Início de campeonato',
        });
      }
    }
  } else if (saMeta) {
    const libBerths = saMeta.libertadoresBerths;
    const sulaCutoff = saMeta.libertadoresBerths + saMeta.sulamericanaBerths;
    const safeCutoff = Math.max(sulaCutoff + 1, saMeta.clubsCount - saMeta.relegationSlots);
    if (powerRank <= 2) {
      goals.push({
        id: `goal_${seasonYear}_${club.id}_league`,
        category: 'LEAGUE',
        competitionLabel: saMeta.name,
        title: `Disputar o Título da ${saMeta.shortName} (Top 2)`,
        description: `Pela tradição do clube em ${saMeta.country}, a diretoria exige brigar pela taça nacional e vaga direta na Libertadores.`,
        targetPositionMax: 2,
        rewardBonus: Math.round(saMeta.championPrize * 0.18),
        priority: 'Principal',
        status: 'ON_TRACK',
        currentProgressText: 'Início de campeonato',
      });
    } else if (powerRank <= libBerths + 1) {
      goals.push({
        id: `goal_${seasonYear}_${club.id}_league`,
        category: 'LEAGUE',
        competitionLabel: saMeta.name,
        title: `Classificar à CONMEBOL Libertadores (G-${libBerths})`,
        description: `Terminar entre os ${libBerths} primeiros da ${saMeta.name} para garantir calendário nobre na Libertadores.`,
        targetPositionMax: libBerths,
        rewardBonus: Math.round(saMeta.championPrize * 0.12),
        priority: 'Principal',
        status: 'ON_TRACK',
        currentProgressText: 'Início de campeonato',
      });
    } else if (powerRank <= sulaCutoff + 2) {
      goals.push({
        id: `goal_${seasonYear}_${club.id}_league`,
        category: 'LEAGUE',
        competitionLabel: saMeta.name,
        title: `Vaga na CONMEBOL Sul-Americana (Top ${sulaCutoff})`,
        description: `Assegurar presença internacional terminando até a ${sulaCutoff}ª colocação na ${saMeta.shortName}.`,
        targetPositionMax: sulaCutoff,
        rewardBonus: Math.round(saMeta.championPrize * 0.08),
        priority: 'Principal',
        status: 'ON_TRACK',
        currentProgressText: 'Início de campeonato',
      });
    } else {
      goals.push({
        id: `goal_${seasonYear}_${club.id}_league`,
        category: 'LEAGUE',
        competitionLabel: saMeta.name,
        title: `Permanência na Elite de ${saMeta.country} (${safeCutoff}º ou acima)`,
        description: `Evitar as últimas ${saMeta.relegationSlots} posições e consolidar o clube na primeira divisão nacional.`,
        targetPositionMax: safeCutoff,
        rewardBonus: Math.round(saMeta.championPrize * 0.06),
        priority: 'Principal',
        status: 'ON_TRACK',
        currentProgressText: 'Início de campeonato',
      });
    }
  } else if (wlMeta) {
    const intCutoff = wlMeta.internationalBerths;
    const upperHalf = Math.min(10, Math.floor(wlMeta.clubsCount / 2));
    const safeCutoff =
      wlMeta.relegationSlots > 0
        ? wlMeta.clubsCount - wlMeta.relegationSlots
        : Math.max(intCutoff + 4, 12);

    if (powerRank <= 2) {
      goals.push({
        id: `goal_${seasonYear}_${club.id}_league`,
        category: 'LEAGUE',
        competitionLabel: wlMeta.name,
        title: `Disputar o Título da ${wlMeta.shortName} (Top 2)`,
        description: `Pelo alto investimento em ${wlMeta.country}, a diretoria exige brigar pelo título nacional e vaga no Mundial / Champions Internacional.`,
        targetPositionMax: 2,
        rewardBonus: Math.round(wlMeta.championPrize * 0.16),
        priority: 'Principal',
        status: 'ON_TRACK',
        currentProgressText: 'Início de campeonato',
      });
    } else if (powerRank <= intCutoff + 2) {
      goals.push({
        id: `goal_${seasonYear}_${club.id}_league`,
        category: 'LEAGUE',
        competitionLabel: wlMeta.name,
        title: `Classificar à Champions Internacional FIFA (G-${intCutoff})`,
        description: `Terminar entre os ${intCutoff} primeiros da ${wlMeta.name} para garantir calendário internacional.`,
        targetPositionMax: intCutoff,
        rewardBonus: Math.round(wlMeta.championPrize * 0.11),
        priority: 'Principal',
        status: 'ON_TRACK',
        currentProgressText: 'Início de campeonato',
      });
    } else if (powerRank <= upperHalf + 2) {
      goals.push({
        id: `goal_${seasonYear}_${club.id}_league`,
        category: 'LEAGUE',
        competitionLabel: wlMeta.name,
        title: `Terminar na Parte de Cima da ${wlMeta.shortName} (Top ${upperHalf})`,
        description: `Fazer campanha sólida em ${wlMeta.country} brigando na metade superior da tabela.`,
        targetPositionMax: upperHalf,
        rewardBonus: Math.round(wlMeta.championPrize * 0.07),
        priority: 'Principal',
        status: 'ON_TRACK',
        currentProgressText: 'Início de campeonato',
      });
    } else {
      goals.push({
        id: `goal_${seasonYear}_${club.id}_league`,
        category: 'LEAGUE',
        competitionLabel: wlMeta.name,
        title:
          wlMeta.relegationSlots > 0
            ? `Permanência na ${wlMeta.shortName} (${safeCutoff}º ou acima)`
            : `Campanha Competitiva na ${wlMeta.shortName} (Top ${safeCutoff})`,
        description:
          wlMeta.relegationSlots > 0
            ? `Evitar as últimas ${wlMeta.relegationSlots} posições e manter o clube na elite de ${wlMeta.country}.`
            : `Superar expectativas e fechar acima da ${safeCutoff}ª colocação na temporada regular.`,
        targetPositionMax: safeCutoff,
        rewardBonus: Math.round(wlMeta.championPrize * 0.05),
        priority: 'Principal',
        status: 'ON_TRACK',
        currentProgressText: 'Início de campeonato',
      });
    }
  } else if (div === 'A') {
    if (powerRank <= 3) {
      goals.push({
        id: `goal_${seasonYear}_${club.id}_league`,
        category: 'LEAGUE',
        competitionLabel: 'Brasileirão Série A',
        title: 'Disputar o Título Nacional (G-3)',
        description:
          'Pelo investimento e força do elenco, o conselho exige brigar na ponta e fechar no Top 3.',
        targetPositionMax: 3,
        rewardBonus: 8_500_000,
        priority: 'Principal',
        status: 'ON_TRACK',
        currentProgressText: 'Início de campeonato',
      });
    } else if (powerRank <= 7) {
      goals.push({
        id: `goal_${seasonYear}_${club.id}_league`,
        category: 'LEAGUE',
        competitionLabel: 'Brasileirão Série A',
        title: 'Classificação à Libertadores (G-6)',
        description:
          'Garantir calendário continental nobre terminando entre os 6 primeiros colocados.',
        targetPositionMax: 6,
        rewardBonus: 5_200_000,
        priority: 'Principal',
        status: 'ON_TRACK',
        currentProgressText: 'Início de campeonato',
      });
    } else if (powerRank <= 13) {
      goals.push({
        id: `goal_${seasonYear}_${club.id}_league`,
        category: 'LEAGUE',
        competitionLabel: 'Brasileirão Série A',
        title: 'Vaga na Copa Sul-Americana (Top 12)',
        description:
          'Fazer uma campanha segura e assegurar presença internacional ficando até a 12ª posição.',
        targetPositionMax: 12,
        rewardBonus: 3_000_000,
        priority: 'Principal',
        status: 'ON_TRACK',
        currentProgressText: 'Início de campeonato',
      });
    } else {
      goals.push({
        id: `goal_${seasonYear}_${club.id}_league`,
        category: 'LEAGUE',
        competitionLabel: 'Brasileirão Série A',
        title: 'Permanência na Série A (Fora do Z-4)',
        description:
          'Manter o clube na primeira divisão nacional terminando na 16ª colocação ou acima.',
        targetPositionMax: 16,
        rewardBonus: 2_500_000,
        priority: 'Principal',
        status: 'ON_TRACK',
        currentProgressText: 'Início de campeonato',
      });
    }
  } else if (div === 'EST') {
    const regCupText =
      estCfg.copaNordesteSpots > 0
        ? ', Copa do Nordeste'
        : estCfg.copaVerdeSpots > 0
        ? ', Copa Verde'
        : '';
    const nationalCutoff = Math.max(2, Math.min(estCfg.clubsCount - 2, estCfg.copaBrasilSpots));
    const koCutoff = estCfg.qfLegs > 0 ? Math.min(8, estCfg.clubsCount - 2) : 4;
    if (powerRank <= 2) {
      goals.push({
        id: `goal_${seasonYear}_${club.id}_league`,
        category: 'LEAGUE',
        competitionLabel: estCfg.name,
        title: `Finalista do ${estCfg.shortName}: Vaga na Série D, Copa do Brasil${regCupText} (Top 2)`,
        description: `Chegar à grande decisão do ${estCfg.name} para garantir calendário nacional completo na Série D e Copa do Brasil${regCupText}.`,
        targetPositionMax: 2,
        rewardBonus: Math.max(180_000, Math.round(estCfg.championPrize * 0.25)),
        priority: 'Principal',
        status: 'ON_TRACK',
        currentProgressText: 'Início do Estadual',
      });
    } else if (powerRank <= 4) {
      goals.push({
        id: `goal_${seasonYear}_${club.id}_league`,
        category: 'LEAGUE',
        competitionLabel: estCfg.name,
        title: `Conquistar Vaga na Série D e Copa do Brasil (Top ${nationalCutoff})`,
        description: `Terminar entre os ${nationalCutoff} primeiros colocados do ${estCfg.name} para assegurar vaga nacional na Série D e Copa do Brasil.`,
        targetPositionMax: nationalCutoff,
        rewardBonus: Math.max(140_000, Math.round(estCfg.championPrize * 0.18)),
        priority: 'Principal',
        status: 'ON_TRACK',
        currentProgressText: 'Início do Estadual',
      });
    } else {
      goals.push({
        id: `goal_${seasonYear}_${club.id}_league`,
        category: 'LEAGUE',
        competitionLabel: estCfg.name,
        title: `Classificar ao Mata-Mata do ${estCfg.shortName} (Top ${koCutoff})`,
        description: `Superar as ${estCfg.firstPhaseRounds} rodadas da 1ª fase do ${estCfg.name} e avançar às fases eliminatórias.`,
        targetPositionMax: koCutoff,
        rewardBonus: Math.max(95_000, Math.round(estCfg.championPrize * 0.12)),
        priority: 'Principal',
        status: 'ON_TRACK',
        currentProgressText: 'Início do Estadual',
      });
    }
  } else {
    const scale = div === 'B' ? 1 : div === 'C' ? 0.42 : 0.22;
    if (powerRank <= 3) {
      goals.push({
        id: `goal_${seasonYear}_${club.id}_league`,
        category: 'LEAGUE',
        competitionLabel: `Brasileirão Série ${div}`,
        title: `Brigar pelo Título e Acesso (Top 2 da Série ${div})`,
        description: `Somos favoritos na Série ${div}: subir com campanha de ponta entre os 2 primeiros.`,
        targetPositionMax: 2,
        rewardBonus: Math.round(2_500_000 * scale),
        priority: 'Principal',
        status: 'ON_TRACK',
        currentProgressText: 'Início de campeonato',
      });
    } else if (powerRank <= 8) {
      goals.push({
        id: `goal_${seasonYear}_${club.id}_league`,
        category: 'LEAGUE',
        competitionLabel: `Brasileirão Série ${div}`,
        title: `Conquistar o Acesso no G-4 da Série ${div}`,
        description: `Terminar entre os 4 primeiros colocados para garantir promoção de divisão.`,
        targetPositionMax: 4,
        rewardBonus: Math.round(1_900_000 * scale),
        priority: 'Principal',
        status: 'ON_TRACK',
        currentProgressText: 'Início de campeonato',
      });
    } else if (powerRank <= 14) {
      goals.push({
        id: `goal_${seasonYear}_${club.id}_league`,
        category: 'LEAGUE',
        competitionLabel: `Brasileirão Série ${div}`,
        title: `Terminar na Metade Superior (Top 10)`,
        description: `Consolidar o elenco sem sustos figurando entre os 10 primeiros da Série ${div}.`,
        targetPositionMax: 10,
        rewardBonus: Math.round(1_000_000 * scale),
        priority: 'Principal',
        status: 'ON_TRACK',
        currentProgressText: 'Início de campeonato',
      });
    } else {
      goals.push({
        id: `goal_${seasonYear}_${club.id}_league`,
        category: 'LEAGUE',
        competitionLabel: `Brasileirão Série ${div}`,
        title: `Evitar o Rebaixamento na Série ${div}`,
        description: `Ficar fora da zona de descenso (16º ou melhor) ao final das 38 rodadas.`,
        targetPositionMax: 16,
        rewardBonus: Math.round(750_000 * scale),
        priority: 'Principal',
        status: 'ON_TRACK',
        currentProgressText: 'Início de campeonato',
      });
    }
  }

  // 2. Copa do Brasil Goal (if participating)
  const inCopaBrasil = (fixturesCopaBrasil || []).some(
    (f) => f.homeTeamId === club.id || f.awayTeamId === club.id
  );
  if (inCopaBrasil) {
    if (club.reputation >= 5) {
      goals.push({
        id: `goal_${seasonYear}_${club.id}_cdb`,
        category: 'NATIONAL_CUP',
        competitionLabel: 'Copa do Brasil',
        title: 'Alcançar no mínimo as Quartas de Final',
        description: 'Chegar entre os 8 melhores da Copa do Brasil para honrar a camisa e o caixa.',
        targetCupPhase: 'quartas',
        rewardBonus: 2_800_000,
        priority: 'Secundária',
        status: 'ON_TRACK',
        currentProgressText: 'Em disputa no mata-mata',
      });
    } else {
      goals.push({
        id: `goal_${seasonYear}_${club.id}_cdb`,
        category: 'NATIONAL_CUP',
        competitionLabel: 'Copa do Brasil',
        title: 'Superar a estreia e avançar de fase',
        description: 'Garantir classificação na Copa do Brasil para embolsar cotas importantes.',
        targetCupPhase: 'quartas',
        rewardBonus: 1_100_000,
        priority: 'Secundária',
        status: 'ON_TRACK',
        currentProgressText: 'Em disputa no mata-mata',
      });
    }
  }

  // 3. Continental or Estadual Goal
  const inUcl = (fixturesChampionsLeague || []).some(
    (f) => f.homeTeamId === club.id || f.awayTeamId === club.id
  );
  const inUel = (fixturesEuropaLeague || []).some(
    (f) => f.homeTeamId === club.id || f.awayTeamId === club.id
  );
  const inUecl = (fixturesConferenceLeague || []).some(
    (f) => f.homeTeamId === club.id || f.awayTeamId === club.id
  );
  const inLiberta = (fixturesLibertadores || []).some(
    (f) => f.homeTeamId === club.id || f.awayTeamId === club.id
  );
  const inSula = (fixturesSulamericana || []).some(
    (f) => f.homeTeamId === club.id || f.awayTeamId === club.id
  );
  const inCopaInt = (fixturesCopaInternacional || []).some(
    (f) => f.homeTeamId === club.id || f.awayTeamId === club.id
  );
  const inConcacaf = (fixturesConcacafChampions || []).some(
    (f) => f.homeTeamId === club.id || f.awayTeamId === club.id
  );
  const inAfc = (fixturesAfcChampions || []).some(
    (f) => f.homeTeamId === club.id || f.awayTeamId === club.id
  );

  if (inUcl) {
    goals.push({
      id: `goal_${seasonYear}_${club.id}_continental`,
      category: 'CONTINENTAL',
      competitionLabel: 'UEFA Champions League',
      title:
        club.reputation >= 5
          ? 'Chegar às Quartas da Champions League'
          : 'Avançar às Oitavas da Champions League',
      description: 'Competir entre a elite europeia e avançar ao mata-mata da UEFA Champions League.',
      targetCupPhase: club.reputation >= 5 ? 'quartas' : 'oitavas',
      rewardBonus: 14_000_000,
      priority: 'Principal',
      status: 'ON_TRACK',
      currentProgressText: 'Fase de Grupos',
    });
  } else if (inUel) {
    goals.push({
      id: `goal_${seasonYear}_${club.id}_continental`,
      category: 'CONTINENTAL',
      competitionLabel: 'UEFA Europa League',
      title: 'Classificar ao Mata-Mata da Europa League',
      description: 'Superar a Fase de Grupos e representar o clube nas eliminatórias da UEFA.',
      targetCupPhase: 'oitavas',
      rewardBonus: 6_500_000,
      priority: 'Secundária',
      status: 'ON_TRACK',
      currentProgressText: 'Fase de Grupos',
    });
  } else if (inUecl) {
    goals.push({
      id: `goal_${seasonYear}_${club.id}_continental`,
      category: 'CONTINENTAL',
      competitionLabel: 'UEFA Conference League',
      title: 'Avançar às Oitavas da Conference League',
      description: 'Garantir classificação na fase de grupos da Conference League.',
      targetCupPhase: 'oitavas',
      rewardBonus: 3_800_000,
      priority: 'Secundária',
      status: 'ON_TRACK',
      currentProgressText: 'Fase de Grupos',
    });
  } else if (inCopaInt) {
    goals.push({
      id: `goal_${seasonYear}_${club.id}_continental`,
      category: 'CONTINENTAL',
      competitionLabel: 'Champions Internacional FIFA',
      title:
        club.reputation >= 5
          ? 'Chegar às Quartas da Champions Internacional'
          : 'Avançar às Oitavas da Champions Internacional',
      description:
        'Representar o país em alto nível no torneio internacional rumo ao Mundial de Clubes.',
      targetCupPhase: club.reputation >= 5 ? 'quartas' : 'oitavas',
      rewardBonus: club.reputation >= 5 ? 6_500_000 : 3_800_000,
      priority: 'Principal',
      status: 'ON_TRACK',
      currentProgressText: 'Fase de Grupos',
    });
  } else if (inLiberta) {
    goals.push({
      id: `goal_${seasonYear}_${club.id}_continental`,
      category: 'CONTINENTAL',
      competitionLabel: 'CONMEBOL Libertadores',
      title: club.reputation >= 5 ? 'Chegar às Quartas da Libertadores' : 'Avançar às Oitavas da Libertadores',
      description: 'Representar o país em alto nível no torneio mais cobiçado do continente.',
      targetCupPhase: club.reputation >= 5 ? 'quartas' : 'oitavas',
      rewardBonus: 4_000_000,
      priority: 'Principal',
      status: 'ON_TRACK',
      currentProgressText: 'Fase de Grupos',
    });
  } else if (inConcacaf) {
    goals.push({
      id: `goal_${seasonYear}_${club.id}_continental`,
      category: 'CONTINENTAL',
      competitionLabel: 'Copa dos Campeões da CONCACAF',
      title:
        club.reputation >= 4
          ? 'Chegar às Quartas da Concacaf Champions Cup'
          : 'Avançar às Oitavas da Concacaf Champions Cup',
      description: 'Brigar pelo título continental da América do Norte, Central e Caribe rumo ao Mundial da FIFA.',
      targetCupPhase: club.reputation >= 4 ? 'quartas' : 'oitavas',
      rewardBonus: 5_500_000,
      priority: 'Principal',
      status: 'ON_TRACK',
      currentProgressText: 'Fase Eliminatória',
    });
  } else if (inAfc) {
    goals.push({
      id: `goal_${seasonYear}_${club.id}_continental`,
      category: 'CONTINENTAL',
      competitionLabel: 'Liga dos Campeões de Elite da AFC',
      title:
        club.reputation >= 4
          ? 'Chegar às Quartas da AFC Champions Elite'
          : 'Avançar às Oitavas da AFC Champions Elite',
      description: 'Classificar entre os 8 melhores da conferência e buscar o título continental asiático na fase final na Arábia Saudita.',
      targetCupPhase: club.reputation >= 4 ? 'quartas' : 'oitavas',
      rewardBonus: 6_500_000,
      priority: 'Principal',
      status: 'ON_TRACK',
      currentProgressText: 'Fase de Liga',
    });
  } else if (inSula) {
    goals.push({
      id: `goal_${seasonYear}_${club.id}_continental`,
      category: 'CONTINENTAL',
      competitionLabel: 'CONMEBOL Sul-Americana',
      title: 'Classificar ao Mata-Mata da Sul-Americana',
      description: 'Superar a fase inicial e brigar nas eliminatórias continentais.',
      targetCupPhase: 'oitavas',
      rewardBonus: 2_000_000,
      priority: 'Secundária',
      status: 'ON_TRACK',
      currentProgressText: 'Fase de Grupos',
    });
  } else if (!saMeta && !euMeta && !wlMeta && div !== 'EST') {
    goals.push({
      id: `goal_${seasonYear}_${club.id}_estadual`,
      category: 'STATE_CUP',
      competitionLabel: estCfg.name,
      title: `Chegar às Semifinais do ${estCfg.shortName}`,
      description: 'Preparar o elenco com bons resultados diante dos rivais estaduais no início do ano.',
      targetPositionMax: 4,
      rewardBonus: div === 'A' ? 900_000 : div === 'B' ? 500_000 : 250_000,
      priority: 'Secundária',
      status: 'ON_TRACK',
      currentProgressText: 'Temporada Estadual',
    });
  }

  // 4. Financial Health Goal
  const finReward =
    club.division === 'EU'
      ? euMeta && euMeta.tier === 1
        ? 4_000_000
        : 1_200_000
      : club.division === 'WL'
      ? wlLeagueId === 'sau_pro'
        ? 3_200_000
        : 1_600_000
      : club.division === 'SA'
      ? 1_100_000
      : div === 'A'
      ? 1_500_000
      : div === 'B'
      ? 700_000
      : 300_000;
  goals.push({
    id: `goal_${seasonYear}_${club.id}_finance`,
    category: 'FINANCE',
    competitionLabel: 'Gestão Financeira',
    title: 'Encerrar a temporada com saldo positivo',
    description: 'Manter a folha salarial sob controle e o caixa do clube no azul.',
    rewardBonus: finReward,
    priority: 'Secundária',
    status: club.finances.balance >= 0 ? 'ON_TRACK' : 'AT_RISK',
    currentProgressText: `Saldo atual: ${formatCurrency(club.finances.balance)}`,
  });

  return goals;
}

export function computeInitialManagerReputation(club: Club): number {
  const baseByDiv =
    club.division === 'EU'
      ? club.europeanLeagueId === 'eng_league_two'
        ? 36
        : club.europeanLeagueId === 'eng_league_one'
        ? 46
        : club.europeanLeagueId === 'eng_championship'
        ? 58
        : 70
      : club.division === 'WL'
      ? club.worldLeagueId === 'sau_pro' || club.worldLeagueId === 'usa_mls'
        ? 66
        : 60
      : club.division === 'A' || club.division === 'SA'
      ? 64
      : club.division === 'B'
      ? 52
      : club.division === 'C'
      ? 40
      : 30;
  return Math.min(92, Math.max(25, baseByDiv + club.reputation * 3));
}

export function computeManagerSalary(club: Club, managerRep: number): number {
  const profile = getClubEconomyProfile(club);
  const divMult =
    profile.tierId === 'EU_TOP5'
      ? 24_000
      : profile.tierId === 'WL_ELITE'
      ? 25_000
      : profile.tierId === 'BR_A'
      ? 14_000
      : profile.tierId === 'EU_2' || profile.tierId === 'WL_HIGH'
      ? 12_500
      : profile.tierId === 'SA_TOP'
      ? 11_000
      : profile.tierId === 'EU_3' || profile.tierId === 'SA_MID'
      ? 7_000
      : profile.tierId === 'BR_B'
      ? 6_000
      : profile.tierId === 'TIER_LOWER_PRO' || profile.tierId === 'EU_4'
      ? 3_200
      : profile.tierId === 'BR_C'
      ? 2_400
      : profile.tierId === 'BR_D'
      ? 1_100
      : 600;
  const raw = club.reputation * divMult * 3.5 + managerRep * (divMult * 0.22);
  const step = raw < 15_000 ? 1_000 : 5_000;
  return Math.max(profile.managerSalaryFloor, Math.round(raw / step) * step);
}

export function createInitialManagerCareer(
  club: Club,
  allClubs: Club[],
  seasonYear: number,
  startDate: string,
  fixturesCopaBrasil?: Fixture[],
  fixturesLibertadores?: Fixture[],
  fixturesSulamericana?: Fixture[],
  fixturesChampionsLeague?: Fixture[],
  fixturesEuropaLeague?: Fixture[],
  fixturesConferenceLeague?: Fixture[],
  fixturesCopaInternacional?: Fixture[],
  fixturesConcacafChampions?: Fixture[],
  fixturesAfcChampions?: Fixture[]
): ManagerCareerState {
  const managerReputation = computeInitialManagerReputation(club);
  const monthlySalary = computeManagerSalary(club, managerReputation);
  const seasonGoals = generateBoardSeasonGoals(
    club,
    allClubs,
    seasonYear,
    fixturesCopaBrasil,
    fixturesLibertadores,
    fixturesSulamericana,
    fixturesChampionsLeague,
    fixturesEuropaLeague,
    fixturesConferenceLeague,
    fixturesCopaInternacional,
    fixturesConcacafChampions,
    fixturesAfcChampions
  );

  const initialStint: ManagerCareerStint = {
    id: `stint_${club.id}_${seasonYear}_1`,
    clubId: club.id,
    clubName: club.name,
    clubColors: club.colors,
    divisionAtStart: club.division,
    startYear: seasonYear,
    startDate,
    matches: 0,
    wins: 0,
    draws: 0,
    losses: 0,
    trophiesWon: 0,
    statusLabel: 'Cargo Atual',
  };

  return {
    boardConfidence: 74,
    fanConfidence: 72,
    managerReputation,
    monthlySalary,
    warningsIssued: 0,
    seasonGoals,
    jobOffers: [],
    careerStints: [initialStint],
    lastEvaluationNote:
      'A diretoria confia no seu planejamento para cumprir as metas traçadas nesta temporada.',
  };
}

function phaseRank(phase?: string): number {
  const p = (phase || '').toLowerCase();
  if (p.includes('grande final') || p.includes('decisão') || p === 'final') return 5;
  if (p.includes('semi')) return 4;
  if (p.includes('quartas')) return 3;
  if (p.includes('oitavas')) return 2;
  return 1;
}

function checkCupGoalProgress(
  clubId: string,
  fixtures: Fixture[] | undefined,
  targetPhaseKey: string,
  isSeasonFinished: boolean = false
): { status: BoardSeasonGoal['status']; text: string } {
  const clubFixtures = (fixtures || []).filter(
    (f) => f.homeTeamId === clubId || f.awayTeamId === clubId
  );
  if (clubFixtures.length === 0) {
    return isSeasonFinished
      ? { status: 'FAILED', text: 'Sem classificação à fase alvo' }
      : { status: 'ON_TRACK', text: 'Aguardando sorteio de chaves' };
  }

  const targetRank = phaseRank(targetPhaseKey);
  const highestReached = Math.max(...clubFixtures.map((f) => phaseRank(f.cupPhase)));
  const latestFixture = clubFixtures[clubFixtures.length - 1];
  const latestPhaseLabel = latestFixture?.cupPhase || 'Primeira Fase';

  if (highestReached >= targetRank) {
    return { status: 'ACHIEVED', text: `Meta batida (${latestPhaseLabel})` };
  }

  const hasUnplayed = clubFixtures.some((f) => !f.played);
  if (hasUnplayed && !isSeasonFinished) {
    return { status: 'ON_TRACK', text: `Em disputa · ${latestPhaseLabel}` };
  }

  // Check if eliminated in last deciding fixture or if season ended short of target
  if (isSeasonFinished) {
    return { status: 'FAILED', text: `Eliminado (${latestPhaseLabel})` };
  }

  if (latestFixture && latestFixture.played && latestFixture.leg !== 1) {
    const wonTie = latestFixture.aggregateWinnerId
      ? latestFixture.aggregateWinnerId === clubId
      : latestFixture.homeTeamId === clubId
      ? (latestFixture.homeScore ?? 0) > (latestFixture.awayScore ?? 0)
      : (latestFixture.awayScore ?? 0) > (latestFixture.homeScore ?? 0);

    if (!wonTie && highestReached < targetRank) {
      return { status: 'FAILED', text: `Eliminado (${latestPhaseLabel})` };
    }
  }

  return { status: 'ON_TRACK', text: `Participação: ${latestPhaseLabel}` };
}

export function syncBoardGoalsAndBonuses(
  state: GameSave,
  career: ManagerCareerState,
  isSeasonFinished: boolean = false
): {
  updatedGoals: BoardSeasonGoal[];
  newlyClaimedBonus: number;
  goalMessages: InboxMessage[];
} {
  const userClub = state.clubs.find((c) => c.id === state.userClubId);
  if (!userClub) {
    return { updatedGoals: career.seasonGoals, newlyClaimedBonus: 0, goalMessages: [] };
  }

  const divStandings = getDivisionStandings(state, userClub.division, userClub);
  const divFixtures = getDivisionFixtures(state, userClub.division, userClub);
  const rankIdx = divStandings.findIndex((s) => s.teamId === userClub.id);
  const currentPos = rankIdx >= 0 ? rankIdx + 1 : 10;
  const standingEntry = rankIdx >= 0 ? divStandings[rankIdx] : undefined;
  const allLeaguePlayed =
    divFixtures.length > 0 && divFixtures.every((f) => f.played);

  let newlyClaimedBonus = 0;
  const goalMessages: InboxMessage[] = [];

  const updatedGoals = career.seasonGoals.map((goal) => {
    let nextStatus = goal.status;
    let nextText = goal.currentProgressText;

    if (goal.category === 'LEAGUE' && goal.targetPositionMax) {
      const played = standingEntry?.played || 0;
      const pts = standingEntry?.points || 0;
      nextText =
        played > 0
          ? `Posição atual: ${currentPos}º lugar · ${pts} pts (${played}J)`
          : 'Aguardando 1ª rodada';

      if (allLeaguePlayed || isSeasonFinished) {
        nextStatus = currentPos <= goal.targetPositionMax ? 'ACHIEVED' : 'FAILED';
      } else if (played >= 3) {
        if (currentPos <= goal.targetPositionMax) {
          nextStatus = 'ON_TRACK';
        } else if (currentPos <= goal.targetPositionMax + 3) {
          nextStatus = 'AT_RISK';
        } else {
          nextStatus = 'AT_RISK';
        }
      }
    } else if (goal.category === 'NATIONAL_CUP') {
      const res = checkCupGoalProgress(
        userClub.id,
        state.fixturesCopaBrasil,
        goal.targetCupPhase || 'oitavas',
        isSeasonFinished
      );
      nextStatus = goal.status === 'ACHIEVED' ? 'ACHIEVED' : res.status;
      nextText = res.text;
    } else if (goal.category === 'CONTINENTAL') {
      const label = goal.competitionLabel.toLowerCase();
      const pool = label.includes('afc')
        ? state.fixturesAfcChampions
        : label.includes('concacaf')
        ? state.fixturesConcacafChampions
        : label.includes('internacional')
        ? state.fixturesCopaInternacional
        : label.includes('champions')
        ? state.fixturesChampionsLeague
        : label.includes('europa')
        ? state.fixturesEuropaLeague
        : label.includes('conference')
        ? state.fixturesConferenceLeague
        : label.includes('libertadores')
        ? state.fixturesLibertadores
        : state.fixturesSulamericana;
      const res = checkCupGoalProgress(
        userClub.id,
        pool,
        goal.targetCupPhase || 'oitavas',
        isSeasonFinished
      );
      nextStatus = goal.status === 'ACHIEVED' ? 'ACHIEVED' : res.status;
      nextText = res.text;
    } else if (goal.category === 'STATE_CUP') {
      const userEstCfg = resolveClubEstadualCfg(userClub);
      const estFixtures = (state.fixturesEstadual || []).filter(
        (f) => f.homeTeamId === userClub.id || f.awayTeamId === userClub.id
      );
      const reachedKnockout = estFixtures.some((f) => {
        const ph = (f.cupPhase || '').toLowerCase();
        return ph.includes('semi') || ph.includes('final') || ph.includes('decisão');
      });
      const statePool = (state.fixturesEstadual || []).filter(
        (f) => f.groupName === userEstCfg.name
      );
      const allEstPlayed = statePool.length > 0 && statePool.every((f) => f.played);

      if (reachedKnockout) {
        nextStatus = 'ACHIEVED';
        nextText = `Classificado às finais (${userEstCfg.shortName})`;
      } else if (allEstPlayed || isSeasonFinished) {
        const stateStandings = (state.standingsEstadual || []).filter(
          (s) => s.group === userEstCfg.name
        );
        const estRankIdx = stateStandings.findIndex((s) => s.teamId === userClub.id);
        if (estRankIdx >= 0 && estRankIdx < 4) {
          nextStatus = 'ACHIEVED';
          nextText = `${estRankIdx + 1}º colocado no ${userEstCfg.shortName}`;
        } else {
          nextStatus = 'FAILED';
          nextText = 'Encerrado fora das semifinais';
        }
      } else {
        nextText = `Em disputa (${userEstCfg.shortName})`;
      }
    } else if (goal.category === 'FINANCE') {
      const bal = userClub.finances.balance;
      nextText = `Saldo atual: ${formatCurrency(bal)}`;
      if (isSeasonFinished || allLeaguePlayed) {
        nextStatus = bal >= 0 ? 'ACHIEVED' : 'FAILED';
      } else {
        nextStatus = bal >= 0 ? 'ON_TRACK' : 'AT_RISK';
      }
    }

    let claimed = Boolean(goal.bonusClaimed);
    if (nextStatus === 'ACHIEVED' && !claimed) {
      claimed = true;
      newlyClaimedBonus += goal.rewardBonus;
      goalMessages.push({
        id: `msg_goal_achieved_${goal.id}_${Date.now()}`,
        title: `Meta da Diretoria Cumprida: ${goal.title}`,
        message: `O conselho deliberativo do ${userClub.name} parabeniza sua comissão técnica por atingir a meta "${goal.title}" (${goal.competitionLabel}). Foi liberado um bônus de ${formatCurrency(
          goal.rewardBonus
        )} diretamente no caixa do clube!`,
        date: formatShortDate(state.currentDate),
        round: state.currentRound,
        read: false,
        type: 'BOARD',
      });
    }

    return {
      ...goal,
      status: nextStatus,
      currentProgressText: nextText,
      bonusClaimed: claimed,
    };
  });

  return { updatedGoals, newlyClaimedBonus, goalMessages };
}

export function generateCoachingMarketOffers(
  state: GameSave,
  career: ManagerCareerState,
  count: number,
  isEmergencyFallback: boolean = false
): ManagerJobOffer[] {
  const userClub = state.clubs.find((c) => c.id === state.userClubId);
  if (!userClub) return [];

  const existingPendingClubIds = new Set(
    career.jobOffers.filter((o) => o.status === 'PENDING').map((o) => o.clubId)
  );

  const isUserEu = userClub.division === 'EU';
  const rep = career.managerReputation || 55;
  const allowCrossCalendar = rep >= 68 || isEmergencyFallback;

  const candidateClubs = state.clubs.filter(
    (c) =>
      c.id !== userClub.id &&
      (allowCrossCalendar || (isUserEu ? c.division === 'EU' : c.division !== 'EU')) &&
      !existingPendingClubIds.has(c.id)
  );

  if (candidateClubs.length === 0) return [];

  const userPower = userClub.reputation * 7.5 + getClubSquadAvgOverall(userClub);
  const carouselSecurity = state.coachingCarousel?.clubCoachSecurity || {};

  const scoredCandidates = candidateClubs.map((club) => {
    const clubAvg = getClubSquadAvgOverall(club);
    const clubPower = club.reputation * 7.5 + clubAvg;
    const sameHemisphere = (club.division === 'EU') === isUserEu;
    const sec = carouselSecurity[club.id] ?? 72;
    const coachPressuredBonus = sec <= 52 ? 18 : sec <= 60 ? 8 : 0;
    const calendarBonus = sameHemisphere ? 12 : 0;
    let desirability = 0;

    if (isEmergencyFallback) {
      // After dismissal, slightly smaller or pressured clubs offer a fresh start
      const diff = Math.abs(userPower - 7 - clubPower);
      desirability = 100 - diff + coachPressuredBonus + calendarBonus;
    } else {
      // Rewarding strong performance: ambitious peers, bigger clubs matching rep, or pressured benches
      const delta = clubPower - userPower;
      if (delta >= -3 && delta <= 16) {
        desirability = 100 - Math.abs(delta - 5) + coachPressuredBonus + calendarBonus;
      } else {
        desirability = 62 - Math.abs(delta) + coachPressuredBonus + calendarBonus;
      }
    }

    return {
      club,
      clubAvg,
      sec,
      score: desirability + Math.random() * 10,
    };
  });

  scoredCandidates.sort((a, b) => b.score - a.score);
  const picked = scoredCandidates.slice(0, count);

  const reasonsGood = [
    'Seu excelente aproveitamento recente chamou a atenção da diretoria.',
    'O conselho busca um treinador moderno para liderar o projeto esportivo.',
    'A torcida e a imprensa colocaram seu nome no topo da lista após grande fase.',
    'Seu trabalho tático valorizando o elenco despertou interesse imediato.',
  ];

  const reasonsEmergency = [
    'O clube busca um técnico experiente para reorganizar o vestiário imediatamente.',
    'Projeto de retomada com respaldo da diretoria para assumir já nesta rodada.',
    'Convite oficial para assumir o comando técnico após saída do antigo treinador.',
  ];

  return picked.map(({ club, clubAvg, sec }, idx) => {
    const offeredSalary = Math.round(
      computeManagerSalary(club, Math.max(career.managerReputation, 50)) * 1.12
    );
    const reasonPool = isEmergencyFallback ? reasonsEmergency : reasonsGood;
    const reason =
      sec <= 50 && !isEmergencyFallback
        ? `A diretoria decidiu trocar o comando (pressão no cargo: ${sec}%) e escolheu você como alvo nº 1.`
        : reasonPool[idx % reasonPool.length];
    return {
      id: `job_offer_${state.currentSeasonYear}_r${state.currentRound}_${club.id}_${Date.now() % 10000}_${idx}`,
      clubId: club.id,
      clubName: club.name,
      clubShortName: club.shortName,
      clubDivision: club.division,
      clubReputation: club.reputation,
      clubSquadAvgOvr: clubAvg,
      clubColors: club.colors,
      transferBudgetPreview: Math.max(0, club.finances.balance),
      offeredMonthlySalary: offeredSalary,
      contractYears: 2,
      reason,
      createdDate: formatShortDate(state.currentDate),
      expiresRound: Math.min(38, state.currentRound + 6),
      status: 'PENDING',
    };
  });
}

export function evaluatePostMatchCareerUpdate(
  state: GameSave,
  userFixture: Fixture
): {
  updatedCareer: ManagerCareerState;
  bonusCredited: number;
  generatedMessages: InboxMessage[];
  wasSacked: boolean;
} {
  const userClub = state.clubs.find((c) => c.id === state.userClubId);
  if (!userClub) {
    return {
      updatedCareer:
        state.managerCareer ||
        createInitialManagerCareer(state.clubs[0], state.clubs, state.currentSeasonYear, state.currentDate),
      bonusCredited: 0,
      generatedMessages: [],
      wasSacked: false,
    };
  }

  const baseCareer =
    state.managerCareer ||
    createInitialManagerCareer(
      userClub,
      state.clubs,
      state.currentSeasonYear,
      state.currentDate,
      state.fixturesCopaBrasil,
      state.fixturesLibertadores,
      state.fixturesSulamericana
    );

  const isHome = userFixture.homeTeamId === userClub.id;
  const oppId = isHome ? userFixture.awayTeamId : userFixture.homeTeamId;
  const oppClub = state.clubs.find((c) => c.id === oppId);

  const rivalry = getMatchRivalryInfo(userClub, oppClub);

  const userGoals = isHome ? userFixture.homeScore ?? 0 : userFixture.awayScore ?? 0;
  const oppGoals = isHome ? userFixture.awayScore ?? 0 : userFixture.homeScore ?? 0;
  const goalDiff = userGoals - oppGoals;

  const isWin = userFixture.aggregateWinnerId
    ? userFixture.aggregateWinnerId === userClub.id
    : goalDiff > 0;
  const isDraw = !userFixture.aggregateWinnerId && goalDiff === 0;

  const userAvg = getClubSquadAvgOverall(userClub);
  const oppAvg = oppClub ? getClubSquadAvgOverall(oppClub) : userAvg;
  const strengthDiff = oppAvg - userAvg; // positive if opponent is stronger

  let boardDelta = 0;
  let fanDelta = 0;
  let repDelta = 0;
  let evalNote = baseCareer.lastEvaluationNote;

  if (isWin) {
    boardDelta =
      3 +
      (strengthDiff >= 3 ? 2 : 0) +
      (goalDiff >= 3 ? 2 : 0) +
      (!isHome ? 1 : 0) +
      (rivalry ? rivalry.boardConfidenceExtra : 0);
    fanDelta =
      4 +
      (goalDiff >= 2 ? 3 : 0) +
      (strengthDiff >= 2 ? 2 : 0) +
      (rivalry ? rivalry.fanConfidenceExtra : 0);
    repDelta = rivalry
      ? Math.max(
          rivalry.reputationWinBonus,
          strengthDiff >= 2 || userFixture.competition === 'libertadores' ? 3 : 2
        )
      : strengthDiff >= 2 || userFixture.competition === 'libertadores'
      ? 2
      : 1;
    evalNote = rivalry
      ? `Festa nas arquibancadas! Vitória no ${rivalry.derbyName} (${userGoals}x${oppGoals} sobre o ${oppClub?.shortName || 'rival'}) rendeu +${repDelta} pts de reputação e elevou o moral da torcida!`
      : goalDiff >= 3
      ? `Atuação de gala na vitória por ${userGoals}x${oppGoals} contra o ${oppClub?.shortName || 'adversário'}!`
      : `Bom resultado conquistado diante do ${oppClub?.shortName || 'adversário'}. Diretoria satisfeita.`;
  } else if (isDraw) {
    boardDelta = strengthDiff >= 3 ? 1 : isHome && strengthDiff <= -4 ? -2 : 0;
    fanDelta = strengthDiff >= 3 ? 1 : isHome ? -2 : 0;
    repDelta = 0;
    evalNote = rivalry
      ? `Empate tenso no ${rivalry.derbyName} (${userGoals}x${oppGoals}) manteve o equilíbrio diante do ${oppClub?.shortName || 'rival'}.`
      : isHome
      ? `Empate em casa contra o ${oppClub?.shortName || 'adversário'} deixou a torcida dividida.`
      : `Ponto somado fora de casa diante do ${oppClub?.shortName || 'adversário'}.`;
  } else {
    const heavyLossPenalty = Math.abs(goalDiff) >= 3 ? -3 : 0;
    const upsetPenalty = strengthDiff <= -4 ? -2 : 0;
    boardDelta = -4 + heavyLossPenalty + upsetPenalty - (rivalry ? rivalry.boardConfidenceExtra : 0);
    fanDelta = -5 + heavyLossPenalty + (isHome ? -2 : 0) - (rivalry ? rivalry.fanConfidenceExtra : 0);
    repDelta = Math.abs(goalDiff) >= 3 || rivalry?.intensity === 'HISTORICO' ? -1 : 0;
    evalNote = rivalry
      ? `Derrota dolorosa no ${rivalry.derbyName} para o ${oppClub?.shortName || 'rival'} (${userGoals}x${oppGoals}) gerou forte protesto da torcida.`
      : Math.abs(goalDiff) >= 3
      ? `Derrota pesada (${userGoals}x${oppGoals}) gerou forte cobrança nos bastidores do clube.`
      : `Revés contra o ${oppClub?.shortName || 'adversário'} aumentou a pressão por resultados.`;
  }

  // Factor league standing vs target into board evaluation
  const divStandings = getDivisionStandings(state, userClub.division, userClub);
  const rankIdx = divStandings.findIndex((s) => s.teamId === userClub.id);
  const currentPos = rankIdx >= 0 ? rankIdx + 1 : 0;
  const standingRow = rankIdx >= 0 ? divStandings[rankIdx] : undefined;
  const leagueGoal = baseCareer.seasonGoals.find((g) => g.category === 'LEAGUE');
  if (standingRow && standingRow.played >= 5 && currentPos > 0) {
    const targetMax = leagueGoal?.targetPositionMax || 10;
    const z4Start = Math.max(8, divStandings.length - 3);
    if (currentPos >= z4Start) {
      boardDelta -= 2;
      fanDelta -= 2;
    } else if (currentPos >= targetMax + 5) {
      boardDelta -= 2;
    } else if (currentPos <= targetMax) {
      boardDelta += 1;
    }
  }

  // Update current career stint stats
  const updatedStints = baseCareer.careerStints.map((stint, idx) => {
    if (idx !== 0 || stint.clubId !== userClub.id) return stint;
    return {
      ...stint,
      matches: stint.matches + 1,
      wins: stint.wins + (isWin ? 1 : 0),
      draws: stint.draws + (isDraw ? 1 : 0),
      losses: stint.losses + (!isWin && !isDraw ? 1 : 0),
    };
  });

  const activeStint = updatedStints[0];
  const nextBoard = Math.max(0, Math.min(100, baseCareer.boardConfidence + boardDelta));
  const nextFan = Math.max(0, Math.min(100, baseCareer.fanConfidence + fanDelta));
  const nextRep = Math.max(15, Math.min(99, baseCareer.managerReputation + repDelta));

  // Sync goals & claim bonuses
  const { updatedGoals, newlyClaimedBonus, goalMessages } = syncBoardGoalsAndBonuses(
    state,
    baseCareer,
    false
  );

  // Expire outdated job offers
  let updatedOffers: ManagerJobOffer[] = baseCareer.jobOffers.map((o) =>
    o.status === 'PENDING' && state.currentRound > o.expiresRound
      ? { ...o, status: 'EXPIRED' }
      : o
  );

  const generatedMessages: InboxMessage[] = [...goalMessages];
  let warningsIssued = baseCareer.warningsIssued;
  let wasSacked = false;
  let lastDismissal: ManagerDismissalSummary | null = baseCareer.lastDismissal ?? null;
  let finalizedStints = updatedStints;

  if (isWin && rivalry) {
    generatedMessages.unshift({
      id: `msg_derby_win_${userClub.id}_${Date.now()}`,
      title: `Vitória no ${rivalry.derbyName}: +${repDelta} Reputação Conquistada!`,
      message: `Triunfo memorável sobre o rival ${oppClub?.name || 'adversário'} por ${userGoals}x${oppGoals}! Seu prestígio como treinador subiu para ${nextRep} (+${repDelta} pts de reputação), o apoio da torcida cresceu +${fanDelta}% e o clube ganhou +${rivalry.fanSocioWinBonus} novos sócios-torcedores!`,
      date: formatShortDate(state.currentDate),
      round: state.currentRound,
      read: false,
      type: 'AWARD',
    });
  }

  // Check Board Warning or Dismissal
  const sackDueToCrisis =
    Boolean(activeStint) &&
    ((activeStint.matches >= 5 && nextBoard <= 14) ||
      (activeStint.matches >= 3 && nextBoard <= 6));

  if (activeStint && sackDueToCrisis) {
    wasSacked = true;
    const severanceReceived = Math.round((baseCareer.monthlySalary || 180_000) * 1.5);
    const dismissalReason =
      currentPos > 0 && divStandings.length > 0 && currentPos >= Math.max(8, divStandings.length - 3)
        ? `Resultados insuficientes e queda para a zona de risco (${currentPos}º lugar)`
        : 'Sequência negativa derrubou a confiança da diretoria abaixo do limite aceitável';

    finalizedStints = updatedStints.map((stint, idx) =>
      idx === 0 && stint.statusLabel === 'Cargo Atual'
        ? {
            ...stint,
            endDate: state.currentDate,
            statusLabel: 'Demitido pela Diretoria',
          }
        : stint
    );

    lastDismissal = {
      id: `dismissal_club_${userClub.id}_${Date.now()}`,
      entityType: 'CLUB',
      entityId: userClub.id,
      entityName: userClub.name,
      reason: dismissalReason,
      confidenceAtDismissal: nextBoard,
      matches: activeStint.matches,
      wins: activeStint.wins,
      draws: activeStint.draws,
      losses: activeStint.losses,
      severanceReceived,
      date: state.currentDate,
      acknowledged: false,
    };

    const rescueOffers = generateCoachingMarketOffers(
      state,
      { ...baseCareer, jobOffers: updatedOffers, managerReputation: nextRep },
      3,
      true
    );
    updatedOffers = [...rescueOffers, ...updatedOffers];
    generatedMessages.unshift({
      id: `msg_sacked_${userClub.id}_${Date.now()}`,
      title: `Demissão Oficial: Encerramento de Ciclo no ${userClub.shortName}`,
      message: `Após reunião extraordinária, a diretoria do ${userClub.name} decidiu demitir você do comando técnico devido à queda crítica na confiança (${nextBoard}% · ${activeStint.wins}V/${activeStint.draws}E/${activeStint.losses}D). Multa rescisória estipulada: ${formatCurrency(
        severanceReceived
      )}. Três clubes já enviaram propostas imediatas para sua sequência na carreira!`,
      date: formatShortDate(state.currentDate),
      round: state.currentRound,
      read: false,
      type: 'BOARD',
    });
  } else if (activeStint && activeStint.matches >= 4) {
    if (nextBoard <= 22 && warningsIssued < 2) {
      warningsIssued = 2;
      generatedMessages.unshift({
        id: `msg_board_ultimatum_${userClub.id}_${Date.now()}`,
        title: `Ultimato da Presidência: Risco Iminente de Demissão no ${userClub.shortName}`,
        message: `A diretoria emitiu um ultimato formal após a confiança despencar para ${nextBoard}%. Sem reação imediata na próxima partida, a troca de comando será inevitável.`,
        date: formatShortDate(state.currentDate),
        round: state.currentRound,
        read: false,
        type: 'BOARD',
      });
    } else if (nextBoard <= 34 && warningsIssued === 0) {
      warningsIssued = 1;
      generatedMessages.unshift({
        id: `msg_board_warning_${userClub.id}_${Date.now()}`,
        title: `Reunião de Emergência: Diretoria Cobra Reação Imediata`,
        message: `O presidente do ${userClub.name} convocou você após a partida: a confiança caiu para ${nextBoard}%. Uma sequência de vitórias nas próximas rodadas é essencial para evitar a demissão.`,
        date: formatShortDate(state.currentDate),
        round: state.currentRound,
        read: false,
        type: 'BOARD',
      });
    }
  }

  // Generate new Coaching Market Job Offer when doing well on periodic rounds
  const pendingCount = updatedOffers.filter((o) => o.status === 'PENDING').length;
  const totalMatchesInStint = activeStint?.matches || 0;
  if (
    !wasSacked &&
    pendingCount < 3 &&
    totalMatchesInStint >= 5 &&
    ((totalMatchesInStint % 5 === 0 && nextBoard >= 64) ||
      (isWin && goalDiff >= 2 && nextRep >= 68 && totalMatchesInStint % 4 === 0))
  ) {
    const newOffers = generateCoachingMarketOffers(
      state,
      { ...baseCareer, jobOffers: updatedOffers, managerReputation: nextRep },
      1,
      false
    );
    if (newOffers.length > 0) {
      const offer = newOffers[0];
      updatedOffers = [offer, ...updatedOffers];
      const offerClubObj = state.clubs.find((c) => c.id === offer.clubId);
      const offerLeagueLabel =
        offer.clubDivision === 'WL' || offer.clubDivision === 'SA' || offer.clubDivision === 'EU'
          ? offerClubObj?.country || offer.clubDivision
          : offer.clubDivision === 'EST'
          ? resolveClubEstadualCfg(offerClubObj).shortName
          : `Série ${offer.clubDivision}`;
      generatedMessages.unshift({
        id: `msg_job_offer_${offer.id}`,
        title: `Proposta Oficial de Comando: ${offer.clubName} (${offerLeagueLabel})`,
        message: `Seu ótimo trabalho no ${userClub.shortName} despertou o interesse do ${offer.clubName}! O clube oferece salário mensal de ${formatCurrency(
          offer.offeredMonthlySalary
        )} e orçamento em caixa de ${formatCurrency(
          offer.transferBudgetPreview
        )}. Acesse a aba Diretoria para analisar o convite até a rodada ${offer.expiresRound}.`,
        date: formatShortDate(state.currentDate),
        round: state.currentRound,
        read: false,
        type: 'JOB_OFFER',
        jobOfferId: offer.id,
      });
    }
  }

  return {
    updatedCareer: {
      ...baseCareer,
      boardConfidence: nextBoard,
      fanConfidence: nextFan,
      managerReputation: nextRep,
      warningsIssued: nextBoard >= 52 ? 0 : warningsIssued,
      seasonGoals: updatedGoals,
      jobOffers: updatedOffers.slice(0, 12),
      careerStints: finalizedStints,
      lastEvaluationNote: evalNote,
      lastDismissal: wasSacked ? lastDismissal : null,
    },
    bonusCredited: newlyClaimedBonus,
    generatedMessages,
    wasSacked,
  };
}

export function acceptManagerJobOffer(
  state: GameSave,
  offerId: string,
  leftReason: 'Aceitou Proposta' | 'Demitido pela Diretoria' = 'Aceitou Proposta'
): GameSave {
  const career = state.managerCareer;
  if (!career) return state;

  const offer = career.jobOffers.find((o) => o.id === offerId);
  const targetClub = offer ? state.clubs.find((c) => c.id === offer.clubId) : undefined;
  const prevClub = state.clubs.find((c) => c.id === state.userClubId);

  if (!offer || !targetClub) return state;

  const replacementCoach =
    CPU_REPLACEMENT_COACHES[
      Math.floor(Math.random() * CPU_REPLACEMENT_COACHES.length)
    ].trim();

  const updatedClubs = state.clubs.map((c) => {
    if (c.id === state.userClubId) {
      return {
        ...c,
        isUser: false,
        managerName: replacementCoach,
      };
    }
    if (c.id === targetClub.id) {
      return {
        ...c,
        isUser: true,
        managerName: state.managerName,
      };
    }
    return c;
  });

  const updatedTargetClub = updatedClubs.find((c) => c.id === targetClub.id) || targetClub;

  const newSeasonGoals = generateBoardSeasonGoals(
    updatedTargetClub,
    updatedClubs,
    state.currentSeasonYear,
    state.fixturesCopaBrasil,
    state.fixturesLibertadores,
    state.fixturesSulamericana,
    state.fixturesChampionsLeague,
    state.fixturesEuropaLeague,
    state.fixturesConferenceLeague,
    state.fixturesCopaInternacional,
    state.fixturesConcacafChampions,
    state.fixturesAfcChampions
  );

  const closedStints: ManagerCareerStint[] = career.careerStints.map((stint, idx) =>
    idx === 0 && stint.statusLabel === 'Cargo Atual'
      ? {
          ...stint,
          endDate: state.currentDate,
          statusLabel: leftReason,
        }
      : stint
  );

  const newStint: ManagerCareerStint = {
    id: `stint_${targetClub.id}_${state.currentSeasonYear}_${Date.now()}`,
    clubId: targetClub.id,
    clubName: targetClub.name,
    clubColors: targetClub.colors,
    divisionAtStart: targetClub.division,
    startYear: state.currentSeasonYear,
    startDate: state.currentDate,
    matches: 0,
    wins: 0,
    draws: 0,
    losses: 0,
    trophiesWon: 0,
    statusLabel: 'Cargo Atual',
  };

  const updatedOffers = career.jobOffers.map((o) => {
    if (o.id === offerId) return { ...o, status: 'ACCEPTED' as const };
    if (o.status === 'PENDING') return { ...o, status: 'EXPIRED' as const };
    return o;
  });

  const leagueLabel =
    targetClub.division === 'EU' || targetClub.division === 'SA' || targetClub.division === 'WL'
      ? targetClub.country || targetClub.division
      : targetClub.division === 'EST'
      ? resolveClubEstadualCfg(targetClub).shortName
      : `Série ${targetClub.division}`;

  const welcomeMsg: InboxMessage = {
    id: `msg_new_club_${targetClub.id}_${Date.now()}`,
    title: `Apresentação Oficial: Novo Treinador do ${targetClub.name}!`,
    message: `Você deixou o comando do ${prevClub?.shortName || 'clube anterior'} e assinou contrato oficial com o ${targetClub.name} (${leagueLabel}) por ${offer.contractYears} temporadas, com salário de ${formatCurrency(
      offer.offeredMonthlySalary
    )}/mês. Confira as metas estabelecidas pela nova diretoria!`,
    date: formatShortDate(state.currentDate),
    round: state.currentRound,
    read: false,
    type: 'BOARD',
  };

  const baseUpdatedCareer: ManagerCareerState = {
    ...career,
    boardConfidence: 76,
    fanConfidence: 75,
    monthlySalary: offer.offeredMonthlySalary,
    warningsIssued: 0,
    seasonGoals: newSeasonGoals,
    jobOffers: updatedOffers,
    careerStints: [newStint, ...closedStints],
    lastEvaluationNote: `Apresentado oficialmente no ${targetClub.name}. Clima de otimismo entre conselheiros e torcedores!`,
    lastDismissal: null,
  };

  const tempState: GameSave = {
    ...state,
    userClubId: targetClub.id,
    clubs: updatedClubs,
    managerCareer: baseUpdatedCareer,
    inbox: [welcomeMsg, ...state.inbox],
  };

  const { updatedGoals } = syncBoardGoalsAndBonuses(tempState, baseUpdatedCareer, false);

  return {
    ...tempState,
    managerCareer: {
      ...baseUpdatedCareer,
      seasonGoals: updatedGoals,
    },
  };
}

export function declineManagerJobOffer(state: GameSave, offerId: string): GameSave {
  if (!state.managerCareer) return state;
  const offer = state.managerCareer.jobOffers.find((o) => o.id === offerId);
  if (!offer) return state;

  // Declining an external offer boosts current fan & board loyalty slightly!
  const updatedCareer: ManagerCareerState = {
    ...state.managerCareer,
    boardConfidence: Math.min(100, state.managerCareer.boardConfidence + 2),
    fanConfidence: Math.min(100, state.managerCareer.fanConfidence + 3),
    jobOffers: state.managerCareer.jobOffers.map((o) =>
      o.id === offerId ? { ...o, status: 'DECLINED' as const } : o
    ),
    lastEvaluationNote: `Você recusou a proposta do ${offer.clubShortName} e reafirmou compromisso com o clube. A torcida aplaudiu!`,
  };

  return {
    ...state,
    managerCareer: updatedCareer,
  };
}

export function requestBoardBudgetBoost(state: GameSave): {
  updatedState: GameSave;
  approved: boolean;
  amountGranted: number;
  feedbackText: string;
} {
  const userClub = state.clubs.find((c) => c.id === state.userClubId);
  const career = state.managerCareer;
  if (!userClub || !career) {
    return {
      updatedState: state,
      approved: false,
      amountGranted: 0,
      feedbackText: 'Dados da diretoria indisponíveis.',
    };
  }

  const lastReq = career.lastBudgetRequestRound ?? -20;
  if (state.currentRound - lastReq < 12) {
    const waitRounds = 12 - (state.currentRound - lastReq);
    return {
      updatedState: state,
      approved: false,
      amountGranted: 0,
      feedbackText: `O conselho avaliou um pedido recentemente. Aguarde mais ${waitRounds} rodadas para nova solicitação.`,
    };
  }

  if (career.boardConfidence < 72) {
    return {
      updatedState: state,
      approved: false,
      amountGranted: 0,
      feedbackText: `Pedido negado: a diretoria exige pelo menos 72% de confiança (atual: ${career.boardConfidence}%) para liberar verba extra.`,
    };
  }

  const baseGrant =
    userClub.division === 'EU' || userClub.division === 'WL'
      ? 6_500_000
      : userClub.division === 'A' || userClub.division === 'SA'
      ? 4_500_000
      : userClub.division === 'B'
      ? 1_600_000
      : userClub.division === 'C'
      ? 650_000
      : 300_000;
  const amountGranted = Math.round(baseGrant * (0.85 + userClub.reputation * 0.1));

  const updatedClubs = state.clubs.map((c) =>
    c.id === userClub.id
      ? {
          ...c,
          finances: {
            ...c.finances,
            balance: c.finances.balance + amountGranted,
            totalIncomeSeason: c.finances.totalIncomeSeason + amountGranted,
          },
        }
      : c
  );

  const msg: InboxMessage = {
    id: `msg_budget_boost_${Date.now()}`,
    title: `Aporte Extra Aprovado pelo Conselho: +${formatCurrency(amountGranted)}`,
    message: `Atendendo ao seu pedido formal e respaldado pelos bons resultados em campo, o conselho financeiro liberou um aporte extra de ${formatCurrency(
      amountGranted
    )} para reforçar o caixa do ${userClub.name}.`,
    date: formatShortDate(state.currentDate),
    round: state.currentRound,
    read: false,
    type: 'FINANCE',
  };

  const updatedState: GameSave = {
    ...state,
    clubs: updatedClubs,
    inbox: [msg, ...state.inbox],
    managerCareer: {
      ...career,
      boardConfidence: Math.max(60, career.boardConfidence - 6),
      lastBudgetRequestRound: state.currentRound,
      lastEvaluationNote: `Aporte extra de ${formatCurrency(
        amountGranted
      )} liberado; a diretoria espera retorno esportivo em campo.`,
    },
  };

  return {
    updatedState,
    approved: true,
    amountGranted,
    feedbackText: `Aporte aprovado! ${formatCurrency(
      amountGranted
    )} adicionados ao caixa do clube.`,
  };
}

export function refreshCareerForNewSeason(
  nextState: GameSave,
  trophiesWonThisYear: number
): ManagerCareerState {
  const userClub = nextState.clubs.find((c) => c.id === nextState.userClubId) || nextState.clubs[0];
  const prevCareer =
    nextState.managerCareer ||
    createInitialManagerCareer(
      userClub,
      nextState.clubs,
      nextState.currentSeasonYear,
      nextState.currentDate
    );

  const freshGoals = generateBoardSeasonGoals(
    userClub,
    nextState.clubs,
    nextState.currentSeasonYear,
    nextState.fixturesCopaBrasil,
    nextState.fixturesLibertadores,
    nextState.fixturesSulamericana,
    nextState.fixturesChampionsLeague,
    nextState.fixturesEuropaLeague,
    nextState.fixturesConferenceLeague,
    nextState.fixturesCopaInternacional,
    nextState.fixturesConcacafChampions,
    nextState.fixturesAfcChampions
  );

  // Also generate 1–2 preseason job offers if reputation/confidence was strong!
  const offseasonOffers =
    prevCareer.boardConfidence >= 72
      ? generateCoachingMarketOffers(nextState, prevCareer, 2, false)
      : [];

  const updatedStints = prevCareer.careerStints.map((stint, idx) =>
    idx === 0 && stint.clubId === userClub.id
      ? {
          ...stint,
          trophiesWon: stint.trophiesWon + trophiesWonThisYear,
        }
      : stint
  );

  return {
    ...prevCareer,
    boardConfidence: Math.max(70, Math.min(92, Math.round((prevCareer.boardConfidence + 75) / 2))),
    fanConfidence: Math.max(70, Math.min(95, Math.round((prevCareer.fanConfidence + 75) / 2))),
    warningsIssued: 0,
    lastBudgetRequestRound: undefined,
    seasonGoals: freshGoals,
    jobOffers: [...offseasonOffers, ...prevCareer.jobOffers.filter((o) => o.status !== 'PENDING')].slice(
      0,
      10
    ),
    careerStints: updatedStints,
    lastEvaluationNote: `Planejamento ${nextState.currentSeasonYear} aprovado junto ao conselho deliberativo.`,
  };
}

export function scoutCoachingVacancies(state: GameSave): {
  updatedState: GameSave;
  foundCount: number;
  feedbackText: string;
} {
  const career = state.managerCareer;
  if (!career) {
    return {
      updatedState: state,
      foundCount: 0,
      feedbackText: 'Carreira ainda não inicializada.',
    };
  }

  const pendingNow = career.jobOffers.filter((o) => o.status === 'PENDING');
  if (pendingNow.length >= 3) {
    return {
      updatedState: state,
      foundCount: 0,
      feedbackText:
        'Você já possui 3 propostas oficiais pendentes na mesa. Analise-as antes de sondar novos clubes.',
    };
  }

  const generated = generateCoachingMarketOffers(state, career, 2, false);
  if (generated.length === 0) {
    return {
      updatedState: state,
      foundCount: 0,
      feedbackText: 'Nenhum clube compatível está com o cargo aberto nesta rodada.',
    };
  }

  // Slight board annoyance (-2) if current board hears your agent is sounding out rivals
  const nextBoard = Math.max(20, career.boardConfidence - 2);

  return {
    updatedState: {
      ...state,
      managerCareer: {
        ...career,
        boardConfidence: nextBoard,
        jobOffers: [...generated, ...career.jobOffers].slice(0, 12),
        lastEvaluationNote:
          'Seu empresário sondou o mercado nacional e trouxe convites de clubes interessados.',
      },
    },
    foundCount: generated.length,
    feedbackText: `Seu empresário encontrou ${generated.length} ${
      generated.length === 1 ? 'clube interessado' : 'clubes interessados'
    } no seu perfil!`,
  };
}

export function scoutEmergencyClubOffers(state: GameSave): GameSave {
  const career = state.managerCareer;
  if (!career) return state;
  const freshOffers = generateCoachingMarketOffers(state, career, 3, true);
  if (freshOffers.length === 0) return state;
  return {
    ...state,
    managerCareer: {
      ...career,
      jobOffers: [...freshOffers, ...career.jobOffers].slice(0, 12),
    },
  };
}
