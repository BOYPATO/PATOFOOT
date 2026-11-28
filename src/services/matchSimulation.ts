import { Club, Player, MatchEvent, MatchStats, Fixture, Standing } from '../types/game';
import { getMatchRivalryInfo } from '../utils/rivalryEngine';
import { getClubSectorRatings } from '../utils/clubRatingsEngine';

// Helper to calculate team's starting lineup power across Defense, Midfield, and Attack
export function getLineupPower(club: Club): { attack: number; midfield: number; defense: number; overall: number } {
  const sectors = getClubSectorRatings(club, { matchReady: true });
  return {
    attack: sectors.rawAttack,
    midfield: sectors.rawMidfield,
    defense: sectors.rawDefense,
    overall: sectors.rawOverall,
  };
}

// Generate realistic commentary strings in Portuguese
export const COMMENTARY_TEMPLATES = {
  goal: [
    (scorer: string, team: string) => `GOOOOL! É DO ${team.toUpperCase()}! ${scorer} bate colocado no cantinho sem chances para o goleiro!`,
    (scorer: string, team: string) => `GOLAÇO ESPETACULAR! ${scorer} solta uma bomba da intermediária e estufa a rede! Festa da torcida do ${team}!`,
    (scorer: string, team: string, assist?: string) => assist ? `GOOOL! Bela jogada de ${assist}, cruzamento perfeito e ${scorer} testa firme para o fundo das redes!` : `GOOOL! ${scorer} aproveita o rebote e manda pra dentro!`,
    (scorer: string, team: string) => `QUE PINTURA! ${scorer} dribla o zagueiro e finaliza com categoria! É gol do ${team}!`,
  ],
  save: [
    (keeper: string) => `DEFESAÇA! ${keeper} se estica todo e espalma uma bola quase no ângulo!`,
    (keeper: string) => `MILAGRE DE ${keeper}! Defesa espetacular com a ponta dos dedos salvando o gol!`,
    (keeper: string) => `${keeper} sai com coragem nos pés do atacante e fica com a bola!`,
  ],
  woodwork: [
    (shooter: string) => `NO TRAVESSÃO! Chutaço de ${shooter} que carimba o travessão e quase abre o placar!`,
    (shooter: string) => `NA TRAVE! ${shooter} bate cruzado, a bola resvala na trave e sai pela linha de fundo!`,
  ],
  yellow: [
    (player: string) => `Cartão amarelo para ${player} após falta dura matando o contra-ataque.`,
    (player: string) => `Entrada forte de ${player}. O árbitro não titubeia e apresenta o cartão amarelo!`,
  ],
  red: [
    (player: string) => `CARTÃO VERMELHO DIRETO! Entrada violenta de ${player}! O árbitro expulsa o jogador de campo!`,
    (player: string) => `Segundo amarelo e VERMELHO para ${player}! Foi pro chuveiro mais cedo!`,
  ],
  foul: [
    (fouler: string) => `Falta marcada em cima de ${fouler}. Lance truncado no meio de campo.`,
  ],
};

function samplePoissonGoals(lambda: number): number {
  const clampedLambda = Math.max(0.08, Math.min(5.2, lambda));
  const L = Math.exp(-clampedLambda);
  let k = 0;
  let p = 1;
  do {
    k++;
    p *= Math.random();
  } while (p > L && k < 9);
  return k - 1;
}

function pickWeightedByOverall(pool: Player[]): Player | undefined {
  if (pool.length === 0) return undefined;
  const weights = pool.map((p) => Math.max(1, Math.pow(Math.max(45, p.overall) - 42, 1.6)));
  const total = weights.reduce((acc, w) => acc + w, 0);
  let r = Math.random() * total;
  for (let i = 0; i < pool.length; i++) {
    r -= weights[i];
    if (r <= 0) return pool[i];
  }
  return pool[pool.length - 1];
}

// Fast simulation for CPU matches (uses DEF vs ATA and MEI vs MEI sector matchups)
export function simulateQuickMatch(
  homeClub: Club,
  awayClub: Club,
  fixture: Fixture,
  leg1Fixture?: Fixture
): Fixture {
  const homePower = getLineupPower(homeClub);
  const awayPower = getLineupPower(awayClub);

  // Midfield battle controls possession & chance creation (+2.5 home pitch familiarity)
  const midDiff = (homePower.midfield + 2.5) - awayPower.midfield;
  const homePossession = Math.min(74, Math.max(26, Math.round(50 + midDiff * 1.3)));
  const awayPossession = 100 - homePossession;

  // Sector duel: Home Attack vs Away Defense & Away Attack vs Home Defense
  const homeAtkVsDef = (homePower.attack + 2.6) - awayPower.defense;
  const awayAtkVsDef = awayPower.attack - (homePower.defense + 1.4);

  const homeExp = Math.max(
    0.18,
    Math.min(4.4, 1.38 + homeAtkVsDef * 0.068 + midDiff * 0.032)
  );
  const awayExp = Math.max(
    0.12,
    Math.min(3.9, 1.04 + awayAtkVsDef * 0.068 - midDiff * 0.032)
  );

  const homeScore = samplePoissonGoals(homeExp);
  const awayScore = samplePoissonGoals(awayExp);

  const homeShots = Math.max(homeScore + 2, Math.round(homeExp * 5.2 + Math.random() * 5));
  const awayShots = Math.max(awayScore + 1, Math.round(awayExp * 4.8 + Math.random() * 5));

  // Attendance (boosted in historic & state derbies)
  const rivalry = getMatchRivalryInfo(homeClub, awayClub);
  const minAttRatio = rivalry ? rivalry.minAttendanceRatio : 0.65;
  const maxAttRatio = rivalry ? rivalry.maxAttendanceRatio : 0.95;
  const attRatio = minAttRatio + Math.random() * (maxAttRatio - minAttRatio);
  const attendance = Math.min(homeClub.stadium.capacity, Math.round(homeClub.stadium.capacity * attRatio));
  const ticketRevenue = attendance * homeClub.stadium.ticketPrice;

  // Pick scorers and assisters from starters with realistic positional + overall weighting
  const homeStarters = homeClub.squad.filter((p) => p.isStarter);
  const awayStarters = awayClub.squad.filter((p) => p.isStarter);

  const pickGoalScorer = (starters: Player[]): Player | undefined => {
    const attackers = starters.filter((p) => p.position === 'FW');
    const mids = starters.filter((p) => p.position === 'MF');
    const defs = starters.filter((p) => p.position === 'DF');
    const roll = Math.random();
    if (roll < 0.64 && attackers.length > 0) {
      return pickWeightedByOverall(attackers);
    }
    if (roll < 0.91 && mids.length > 0) {
      return pickWeightedByOverall(mids);
    }
    if (defs.length > 0) {
      return pickWeightedByOverall(defs);
    }
    return starters[0];
  };

  const pickGoalAssister = (starters: Player[], scorerId?: string): Player | undefined => {
    if (Math.random() > 0.75) return undefined; // ~25% unassisted (rebound, solo, set piece)
    const candidates = starters.filter((p) => p.id !== scorerId && p.position !== 'GK');
    if (candidates.length === 0) return undefined;
    const creators = candidates.filter(
      (p) => p.detailedRole === 'MEI' || p.detailedRole === 'LAT' || p.position === 'FW'
    );
    const pool = creators.length > 0 && Math.random() < 0.82 ? creators : candidates;
    return pickWeightedByOverall(pool);
  };

  const isUserInvolved = Boolean(homeClub.isUser || awayClub.isUser);
  const events: MatchEvent[] = [];

  for (let g = 0; g < homeScore; g++) {
    const minute = Math.floor(Math.random() * 88) + 2;
    const scorer = pickGoalScorer(homeStarters);
    const assister = pickGoalAssister(homeStarters, scorer?.id);
    events.push({
      id: `ev_h_${g}_${minute}`,
      minute,
      type: 'GOL',
      teamId: homeClub.id,
      playerId: scorer?.id,
      playerName: scorer ? scorer.name : 'Atacante',
      assistPlayerId: assister?.id,
      assistPlayerName: assister?.name,
      description: isUserInvolved
        ? `GOL do ${homeClub.shortName}! Marcado por ${scorer ? scorer.name : 'Jogador'}${assister ? ` (passe de ${assister.name})` : ''}.`
        : '',
      isHomeTeam: true,
    });
  }

  for (let g = 0; g < awayScore; g++) {
    const minute = Math.floor(Math.random() * 88) + 2;
    const scorer = pickGoalScorer(awayStarters);
    const assister = pickGoalAssister(awayStarters, scorer?.id);
    events.push({
      id: `ev_a_${g}_${minute}`,
      minute,
      type: 'GOL',
      teamId: awayClub.id,
      playerId: scorer?.id,
      playerName: scorer ? scorer.name : 'Atacante',
      assistPlayerId: assister?.id,
      assistPlayerName: assister?.name,
      description: isUserInvolved
        ? `GOL do ${awayClub.shortName}! Marcado por ${scorer ? scorer.name : 'Jogador'}${assister ? ` (passe de ${assister.name})` : ''}.`
        : '',
      isHomeTeam: false,
    });
  }

  // Yellow and Red cards distribution (slightly higher intensity in derbies)
  const derbyCardExtra = rivalry ? (Math.random() < 0.6 ? 1 : 0) : 0;
  const homeYellowCount = Math.floor(Math.random() * 3) + derbyCardExtra;
  const awayYellowCount = Math.floor(Math.random() * 3) + (rivalry && Math.random() < 0.5 ? 1 : 0);
  const redChance = rivalry ? 0.08 : 0.05;
  const homeRedCount = Math.random() < redChance ? 1 : 0;
  const awayRedCount = Math.random() < redChance ? 1 : 0;

  // Defenders and Midfielders commit more fouls
  const getFoulerCandidates = (starters: Player[]) => {
    const defensive = starters.filter((p) => p.position === 'DF' || p.position === 'MF');
    return defensive.length > 0 ? defensive : starters;
  };

  const homeDefPool = getFoulerCandidates(homeStarters);
  const awayDefPool = getFoulerCandidates(awayStarters);

  for (let y = 0; y < homeYellowCount; y++) {
    const minute = Math.floor(Math.random() * 85) + 5;
    const fouler = homeDefPool[Math.floor(Math.random() * homeDefPool.length)] || homeStarters[0];
    events.push({
      id: `ev_hy_${y}_${minute}`,
      minute,
      type: 'CARTAO_AMARELO',
      teamId: homeClub.id,
      playerId: fouler?.id,
      playerName: fouler ? fouler.name : 'Jogador',
      description: isUserInvolved
        ? `Cartão amarelo para ${fouler ? fouler.name : 'Jogador'} (${homeClub.shortName}) após falta dura.`
        : '',
      isHomeTeam: true,
    });
  }

  for (let y = 0; y < awayYellowCount; y++) {
    const minute = Math.floor(Math.random() * 85) + 5;
    const fouler = awayDefPool[Math.floor(Math.random() * awayDefPool.length)] || awayStarters[0];
    events.push({
      id: `ev_ay_${y}_${minute}`,
      minute,
      type: 'CARTAO_AMARELO',
      teamId: awayClub.id,
      playerId: fouler?.id,
      playerName: fouler ? fouler.name : 'Jogador',
      description: isUserInvolved
        ? `Cartão amarelo para ${fouler ? fouler.name : 'Jogador'} (${awayClub.shortName}) após falta dura.`
        : '',
      isHomeTeam: false,
    });
  }

  for (let r = 0; r < homeRedCount; r++) {
    const minute = Math.floor(Math.random() * 50) + 40;
    const fouler = homeDefPool[Math.floor(Math.random() * homeDefPool.length)] || homeStarters[0];
    events.push({
      id: `ev_hr_${r}_${minute}`,
      minute,
      type: 'CARTAO_VERMELHO',
      teamId: homeClub.id,
      playerId: fouler?.id,
      playerName: fouler ? fouler.name : 'Jogador',
      description: isUserInvolved
        ? `CARTÃO VERMELHO para ${fouler ? fouler.name : 'Jogador'} (${homeClub.shortName})! Expulso de campo!`
        : '',
      isHomeTeam: true,
    });
  }

  for (let r = 0; r < awayRedCount; r++) {
    const minute = Math.floor(Math.random() * 50) + 40;
    const fouler = awayDefPool[Math.floor(Math.random() * awayDefPool.length)] || awayStarters[0];
    events.push({
      id: `ev_ar_${r}_${minute}`,
      minute,
      type: 'CARTAO_VERMELHO',
      teamId: awayClub.id,
      playerId: fouler?.id,
      playerName: fouler ? fouler.name : 'Jogador',
      description: isUserInvolved
        ? `CARTÃO VERMELHO para ${fouler ? fouler.name : 'Jogador'} (${awayClub.shortName})! Expulso de campo!`
        : '',
      isHomeTeam: false,
    });
  }

  events.sort((a, b) => a.minute - b.minute);

  const homeXG =
    Math.round(
      Math.max(
        homeScore * 0.42,
        homeExp * (0.78 + Math.random() * 0.42) + homeShots * 0.025
      ) * 100
    ) / 100;
  const awayXG =
    Math.round(
      Math.max(
        awayScore * 0.42,
        awayExp * (0.78 + Math.random() * 0.42) + awayShots * 0.025
      ) * 100
    ) / 100;

  const stats: MatchStats = {
    homeShots,
    awayShots,
    homeShotsOnTarget: Math.round(homeShots * 0.45) + homeScore,
    awayShotsOnTarget: Math.round(awayShots * 0.45) + awayScore,
    homePossession,
    awayPossession,
    homeCorners: Math.floor(Math.random() * 8) + 2,
    awayCorners: Math.floor(Math.random() * 7) + 1,
    homeFouls: Math.floor(Math.random() * 12) + 6,
    awayFouls: Math.floor(Math.random() * 13) + 6,
    homeYellowCards: homeYellowCount,
    awayYellowCards: awayYellowCount,
    homeRedCards: homeRedCount,
    awayRedCards: awayRedCount,
    homePassAccuracy: 78 + Math.floor(Math.random() * 12),
    awayPassAccuracy: 76 + Math.floor(Math.random() * 12),
    homeXG,
    awayXG,
  };

  // Check if knockout tie resolution is needed
  let penaltiesHome: number | undefined = undefined;
  let penaltiesAway: number | undefined = undefined;
  let aggregateWinnerId: string | undefined = undefined;
  let aggregateHomeScore: number | undefined = undefined;
  let aggregateAwayScore: number | undefined = undefined;

  const phaseLower = (fixture.cupPhase || '').toLowerCase();
  const isKnockout = Boolean(
    fixture.competition === 'copa_brasil' ||
    fixture.competition === 'supercopa_brasil' ||
    fixture.competition === 'recopa_sulamericana' ||
    fixture.competition === 'uefa_supercup' ||
    fixture.competition === 'concacaf_champions' ||
    (fixture.competition === 'afc_champions' && (fixture.leg !== undefined || fixture.round >= 9)) ||
    (fixture.competition === 'usa_mls' && fixture.id.includes('_po_')) ||
    fixture.id.includes('_playoff_') ||
    fixture.leg !== undefined ||
    phaseLower.includes('play-off') ||
    phaseLower.includes('playoff') ||
    phaseLower.includes('barrage') ||
    phaseLower.includes('1ª fase') ||
    phaseLower.includes('2ª fase') ||
    phaseLower.includes('3ª fase') ||
    phaseLower.includes('4ª fase') ||
    phaseLower.includes('5ª fase') ||
    phaseLower.includes('wild card') ||
    phaseLower.includes('primeira rodada') ||
    phaseLower.includes('final') ||
    phaseLower.includes('semifinal') ||
    phaseLower.includes('oitavas') ||
    phaseLower.includes('quartas') ||
    phaseLower.includes('decisão')
  );

  let needsPenalties = false;
  if (isKnockout && fixture.leg === 2 && leg1Fixture && leg1Fixture.played) {
    // leg1 was played at awayClub's home (leg1.homeScore = awayClub goals, leg1.awayScore = homeClub goals)
    const leg1GoalsForCurrentHome =
      leg1Fixture.awayTeamId === homeClub.id
        ? (leg1Fixture.awayScore ?? 0)
        : (leg1Fixture.homeScore ?? 0);
    const leg1GoalsForCurrentAway =
      leg1Fixture.homeTeamId === awayClub.id
        ? (leg1Fixture.homeScore ?? 0)
        : (leg1Fixture.awayScore ?? 0);

    aggregateHomeScore = homeScore + leg1GoalsForCurrentHome;
    aggregateAwayScore = awayScore + leg1GoalsForCurrentAway;

    if (aggregateHomeScore > aggregateAwayScore) {
      aggregateWinnerId = homeClub.id;
    } else if (aggregateAwayScore > aggregateHomeScore) {
      aggregateWinnerId = awayClub.id;
    } else if (fixture.competition === 'concacaf_champions') {
      // Regra oficial do Gol Fora de Casa (Concacaf Champions Cup)
      const homeClubAwayGoals = leg1GoalsForCurrentHome; // marcados fora na Ida
      const awayClubAwayGoals = awayScore; // marcados fora na Volta
      if (homeClubAwayGoals > awayClubAwayGoals) {
        aggregateWinnerId = homeClub.id;
      } else if (awayClubAwayGoals > homeClubAwayGoals) {
        aggregateWinnerId = awayClub.id;
      } else {
        needsPenalties = true;
      }
    } else {
      needsPenalties = true;
    }
  } else if (isKnockout && fixture.leg !== 1) {
    if (homeScore > awayScore) {
      aggregateWinnerId = homeClub.id;
    } else if (awayScore > homeScore) {
      aggregateWinnerId = awayClub.id;
    } else {
      needsPenalties = true;
    }
  }

  if (needsPenalties) {
    const homeWins = Math.random() < 0.52;
    if (homeWins) {
      penaltiesHome = 4 + Math.floor(Math.random() * 2);
      penaltiesAway = Math.max(1, penaltiesHome - (Math.random() < 0.65 ? 1 : 2));
      aggregateWinnerId = homeClub.id;
    } else {
      penaltiesAway = 4 + Math.floor(Math.random() * 2);
      penaltiesHome = Math.max(1, penaltiesAway - (Math.random() < 0.65 ? 1 : 2));
      aggregateWinnerId = awayClub.id;
    }

    if (isUserInvolved) {
      events.push({
        id: `ev_pen_cpu_${Date.now()}`,
        minute: 120,
        type: 'FIM_JOGO',
        teamId: aggregateWinnerId,
        playerName: 'Disputa de Pênaltis',
        description: `🧤 DECISÃO POR PÊNALTIS: ${homeClub.shortName} (${penaltiesHome}) x (${penaltiesAway}) ${awayClub.shortName}. ${homeWins ? homeClub.name : awayClub.name} vence!`,
        isHomeTeam: homeWins,
      });
    }
  }

  return {
    ...fixture,
    homeScore,
    awayScore,
    played: true,
    attendance,
    ticketRevenue,
    events,
    stats: isUserInvolved ? stats : undefined,
    aggregateHomeScore,
    aggregateAwayScore,
    penaltiesHome,
    penaltiesAway,
    aggregateWinnerId,
  };
}

// Update table standings after matches in a round
export function updateStandings(
  standings: Standing[],
  completedFixtures: Fixture[]
): Standing[] {
  const standingsMap = new Map<string, Standing>(
    standings.map((s) => [s.teamId, { ...s, form: [...s.form] }])
  );

  completedFixtures.forEach((f) => {
    if (f.homeScore === null || f.awayScore === null) return;

    const home = standingsMap.get(f.homeTeamId);
    const away = standingsMap.get(f.awayTeamId);

    if (home) {
      home.played += 1;
      home.goalsFor += f.homeScore;
      home.goalsAgainst += f.awayScore;
      home.goalDifference = home.goalsFor - home.goalsAgainst;

      if (f.homeScore > f.awayScore) {
        home.won += 1;
        home.points += 3;
        home.form.unshift('V');
      } else if (f.homeScore === f.awayScore) {
        home.drawn += 1;
        home.points += 1;
        home.form.unshift('E');
      } else {
        home.lost += 1;
        home.form.unshift('D');
      }
      home.form = home.form.slice(0, 5);
    }

    if (away) {
      away.played += 1;
      away.goalsFor += f.awayScore;
      away.goalsAgainst += f.homeScore;
      away.goalDifference = away.goalsFor - away.goalsAgainst;

      if (f.awayScore > f.homeScore) {
        away.won += 1;
        away.points += 3;
        away.form.unshift('V');
      } else if (f.awayScore === f.homeScore) {
        away.drawn += 1;
        away.points += 1;
        away.form.unshift('E');
      } else {
        away.lost += 1;
        away.form.unshift('D');
      }
      away.form = away.form.slice(0, 5);
    }
  });

  // Sort by Points DESC, Wins DESC, Goal Difference DESC, Goals For DESC
  return Array.from(standingsMap.values()).sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.won !== a.won) return b.won - a.won;
    if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
    return b.goalsFor - a.goalsFor;
  });
}
