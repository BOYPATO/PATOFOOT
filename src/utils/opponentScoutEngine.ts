import { Club, Fixture, GameSave, Player, Standing } from '../types/game';
import { getClubSectorRatings } from './clubRatingsEngine';
import { getClubSouthAmericanLeagueId } from './southAmericaLeaguesEngine';
import { getClubEuropeanLeagueId } from './europeLeaguesEngine';
import { getClubWorldLeagueId } from './worldLeaguesEngine';

export interface OpponentRecentMatch {
  fixtureId: string;
  date: string;
  result: 'V' | 'E' | 'D';
  scoreText: string;
  rivalShortName: string;
  isHome: boolean;
}

export interface OpponentScoutReport {
  opponentId: string;
  recentMatches: OpponentRecentMatch[];
  leaguePosition: number | null;
  leaguePoints: number | null;
  leagueTotalTeams: number;
  goalsFor: number;
  goalsAgainst: number;
  likelyFormation: string;
  likelyStyle: string;
  keyPlayer: Player | null;
  topScorer: Player | null;
  weakestSector: 'Ataque' | 'Meio-Campo' | 'Defesa';
  strongestSector: 'Ataque' | 'Meio-Campo' | 'Defesa';
  tacticalTip: string;
  threatLevel: 'ALTO' | 'MODERADO' | 'CONTROLÁVEL';
}

function collectPlayedFixturesForClub(save: GameSave, clubId: string): Fixture[] {
  const pools: Fixture[][] = [
    save.fixturesA || [],
    save.fixturesB || [],
    save.fixturesC || [],
    save.fixturesD || [],
    save.fixturesCopaBrasil || [],
    save.fixturesLibertadores || [],
    save.fixturesSulamericana || [],
    save.fixturesEstadual || [],
    save.fixturesCopaNordeste || [],
    save.fixturesCopaVerde || [],
    save.fixturesChampionsLeague || [],
    save.fixturesEuropaLeague || [],
    save.fixturesConferenceLeague || [],
    save.fixturesCopaInternacional || [],
    save.fixturesConcacafChampions || [],
    save.fixturesAfcChampions || [],
    save.fixturesIntercontinental || [],
    save.fixturesSuperMundial || [],
    save.fixturesEngFaCup || [],
    save.fixturesEngEflCup || [],
  ];

  if (save.fixturesSouthAmerica) {
    Object.values(save.fixturesSouthAmerica).forEach((list) => {
      if (list) pools.push(list);
    });
  }
  if (save.fixturesEurope) {
    Object.values(save.fixturesEurope).forEach((list) => {
      if (list) pools.push(list);
    });
  }
  if (save.fixturesWorldLeagues) {
    Object.values(save.fixturesWorldLeagues).forEach((list) => {
      if (list) pools.push(list);
    });
  }

  const played: Fixture[] = [];
  for (const pool of pools) {
    for (const f of pool) {
      if (
        f.played &&
        f.homeScore !== null &&
        f.awayScore !== null &&
        (f.homeTeamId === clubId || f.awayTeamId === clubId)
      ) {
        played.push(f);
      }
    }
  }

  return played.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
}

function findLeagueStanding(save: GameSave, club: Club): { pos: number | null; total: number; standing?: Standing } {
  let table: Standing[] = [];
  if (club.division === 'A') table = save.standingsA || [];
  else if (club.division === 'B') table = save.standingsB || [];
  else if (club.division === 'C') table = save.standingsC || [];
  else if (club.division === 'D') table = save.standingsD || [];
  else if (club.division === 'SA') {
    const id = getClubSouthAmericanLeagueId(club);
    table = (id && save.standingsSouthAmerica?.[id]) || [];
  } else if (club.division === 'EU') {
    const id = getClubEuropeanLeagueId(club);
    table = (id && save.standingsEurope?.[id]) || [];
  } else if (club.division === 'WL') {
    const id = getClubWorldLeagueId(club);
    table = (id && save.standingsWorldLeagues?.[id]) || [];
  } else {
    table = (save.standingsEstadual || []).filter((s) =>
      save.standingsEstadual?.some((x) => x.teamId === club.id && x.group === s.group)
    );
  }

  if (table.length === 0) return { pos: null, total: 0 };

  const ordered = [...table].sort(
    (a, b) =>
      b.points - a.points ||
      b.won - a.won ||
      b.goalDifference - a.goalDifference ||
      b.goalsFor - a.goalsFor
  );
  const idx = ordered.findIndex((s) => s.teamId === club.id);
  return {
    pos: idx >= 0 ? idx + 1 : null,
    total: ordered.length,
    standing: idx >= 0 ? ordered[idx] : undefined,
  };
}

export function buildOpponentScoutReport(
  userClub: Club,
  opponent: Club,
  allClubs: Club[],
  gameState: GameSave
): OpponentScoutReport {
  const clubsById = new Map<string, Club>(allClubs.map((c) => [c.id, c]));
  const recentRaw = collectPlayedFixturesForClub(gameState, opponent.id).slice(0, 5);

  const recentMatches: OpponentRecentMatch[] = recentRaw.map((f) => {
    const isHome = f.homeTeamId === opponent.id;
    const oppGoals = (isHome ? f.homeScore : f.awayScore) ?? 0;
    const rivalGoals = (isHome ? f.awayScore : f.homeScore) ?? 0;
    const rivalId = isHome ? f.awayTeamId : f.homeTeamId;
    const rivalClub = clubsById.get(rivalId);
    const result: 'V' | 'E' | 'D' =
      oppGoals > rivalGoals ? 'V' : oppGoals < rivalGoals ? 'D' : 'E';
    return {
      fixtureId: f.id,
      date: f.date || '',
      result,
      scoreText: `${oppGoals}x${rivalGoals}`,
      rivalShortName: rivalClub?.shortName || rivalClub?.initials || 'RIV',
      isHome,
    };
  });

  const { pos, total, standing } = findLeagueStanding(gameState, opponent);

  const healthySquad = opponent.squad.filter((p) => p.injuryWeeks === 0 && !p.isSuspended);
  const pool = healthySquad.length > 0 ? healthySquad : opponent.squad;

  const keyPlayer =
    [...pool].sort((a, b) => b.overall - a.overall)[0] || null;
  const topScorer =
    [...opponent.squad]
      .filter((p) => (p.goals || 0) > 0)
      .sort((a, b) => (b.goals || 0) - (a.goals || 0) || b.overall - a.overall)[0] ||
    [...pool].filter((p) => p.position === 'FW').sort((a, b) => b.overall - a.overall)[0] ||
    keyPlayer;

  const userSec = getClubSectorRatings(userClub);
  const oppSec = getClubSectorRatings(opponent);

  const sectors: Array<{ name: 'Ataque' | 'Meio-Campo' | 'Defesa'; val: number }> = [
    { name: 'Ataque', val: oppSec.attack },
    { name: 'Meio-Campo', val: oppSec.midfield },
    { name: 'Defesa', val: oppSec.defense },
  ];
  const sortedSectors = [...sectors].sort((a, b) => b.val - a.val);
  const strongestSector = sortedSectors[0].name;
  const weakestSector = sortedSectors[sortedSectors.length - 1].name;

  const ovrDiff = oppSec.overall - userSec.overall;
  const threatLevel: 'ALTO' | 'MODERADO' | 'CONTROLÁVEL' =
    ovrDiff >= 3 ? 'ALTO' : ovrDiff >= -2 ? 'MODERADO' : 'CONTROLÁVEL';

  const styleLabels: Record<string, string> = {
    'Ultra Defensivo': 'Bloco Baixo',
    Defensivo: 'Defensivo',
    Equilibrado: 'Equilibrado',
    Ofensivo: 'Ofensivo',
    'Ultra Ofensivo': 'Pressão Total',
  };
  const likelyFormation = opponent.tactics?.formation || '4-3-3';
  const rawMentality = opponent.tactics?.mentality || 'Equilibrado';
  const likelyStyle = styleLabels[rawMentality] || rawMentality;

  let tacticalTip: string;
  if (weakestSector === 'Defesa' && userSec.attack >= oppSec.defense) {
    tacticalTip = `A defesa adversária (OVR ${oppSec.defense}) é o ponto mais vulnerável. Explore transições rápidas e ataques pelas pontas.`;
  } else if (weakestSector === 'Meio-Campo') {
    tacticalTip = `O meio-campo rival (OVR ${oppSec.midfield}) cede espaços. Domine a posse de bola para controlar o ritmo do jogo.`;
  } else if (strongestSector === 'Ataque' && oppSec.attack > userSec.defense + 1) {
    tacticalTip = `Cuidado com o setor ofensivo deles (OVR ${oppSec.attack}). Mantenha a linha defensiva compacta e evite contra-ataques.`;
  } else if (threatLevel === 'CONTROLÁVEL') {
    tacticalTip = `Seu elenco tem superioridade técnica (${userSec.overall} vs ${oppSec.overall}). Pressione alto desde o início para buscar o placar.`;
  } else {
    tacticalTip = `Confronto equilibrado contra ${likelyFormation} (${likelyStyle}). Atenção especial a ${topScorer?.name || 'seu ataque'} e bolas paradas.`;
  }

  return {
    opponentId: opponent.id,
    recentMatches,
    leaguePosition: pos,
    leaguePoints: standing?.points ?? null,
    leagueTotalTeams: total,
    goalsFor: standing?.goalsFor ?? 0,
    goalsAgainst: standing?.goalsAgainst ?? 0,
    likelyFormation,
    likelyStyle,
    keyPlayer,
    topScorer,
    weakestSector,
    strongestSector,
    tacticalTip,
    threatLevel,
  };
}
