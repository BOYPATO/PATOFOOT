import { Club, MatchEvent, Morale, Player, TouchlineShoutType } from '../types/game';
import { resolveClubLineupTacticalReport } from './tacticalPositioningEngine';

export interface TouchlineShoutConfig {
  id: TouchlineShoutType;
  label: string;
  shortDesc: string;
  durationMinutes: number;
  cooldownMinutes: number;
  userChanceDelta: number;
  oppChanceDelta: number;
  conversionDelta: number;
  possessionDelta: number;
  moraleStep: -1 | 0 | 1;
  commentaryTemplate: (managerName: string, clubShortName: string, captainName?: string) => string;
}

export const TOUCHLINE_SHOUTS: TouchlineShoutConfig[] = [
  {
    id: 'ELOGIAR_ENTREGA',
    label: 'Elogiar Entrega',
    shortDesc: '+Confiança e precisão na troca de passes por 12 min',
    durationMinutes: 12,
    cooldownMinutes: 14,
    userChanceDelta: 0.008,
    oppChanceDelta: -0.004,
    conversionDelta: 0.035,
    possessionDelta: 0.04,
    moraleStep: 1,
    commentaryTemplate: (managerName, clubShortName, captainName) =>
      `👏 Grito da Área Técnica: ${managerName} aplaude a postura do ${clubShortName}! ${
        captainName ? `O capitão ${captainName} repassa o incentivo e o time ganha confiança.` : 'O grupo ganha moral com o apoio.'
      }`,
  },
  {
    id: 'COBRAR_RACA',
    label: 'Cobrar Raça',
    shortDesc: '+Intensidade nos duelos e pressão imediata por 12 min',
    durationMinutes: 12,
    cooldownMinutes: 15,
    userChanceDelta: 0.013,
    oppChanceDelta: -0.006,
    conversionDelta: 0.02,
    possessionDelta: 0.05,
    moraleStep: 0,
    commentaryTemplate: (managerName, clubShortName, captainName) =>
      `🗣️ Grito da Área Técnica: ${managerName} cobra divididas firmes do ${clubShortName}! ${
        captainName ? `${captainName} chama a responsabilidade no grito!` : 'A equipe sobe a marcação imediatamente!'
      }`,
  },
  {
    id: 'ARRISCAR_CHUTES',
    label: 'Arriscar Chutes',
    shortDesc: '+Finalizações de média distância e presença na área',
    durationMinutes: 12,
    cooldownMinutes: 14,
    userChanceDelta: 0.017,
    oppChanceDelta: 0.004,
    conversionDelta: 0.04,
    possessionDelta: 0.02,
    moraleStep: 0,
    commentaryTemplate: (managerName, clubShortName) =>
      `🎯 Grito da Área Técnica: ${managerName} pede para o ${clubShortName} finalizar mais de fora da área e testar o goleiro!`,
  },
  {
    id: 'ESFRIAR_JOGO',
    label: 'Esfriar o Jogo',
    shortDesc: 'Cadencia a posse e corta o ímpeto ofensivo do rival',
    durationMinutes: 12,
    cooldownMinutes: 14,
    userChanceDelta: -0.006,
    oppChanceDelta: -0.016,
    conversionDelta: 0,
    possessionDelta: 0.06,
    moraleStep: 0,
    commentaryTemplate: (managerName, clubShortName, captainName) =>
      `🧊 Grito da Área Técnica: ${managerName} faz sinal de calma para o ${clubShortName} valorizar a posse! ${
        captainName ? `${captainName} orienta o posicionamento defensivo.` : 'O ritmo da partida diminui.'
      }`,
  },
  {
    id: 'PRESSAO_ASFIXIANTE',
    label: 'Pressionar Alto',
    shortDesc: 'Sufoca a saída rival (+ataque e posse, mais desgaste)',
    durationMinutes: 10,
    cooldownMinutes: 16,
    userChanceDelta: 0.019,
    oppChanceDelta: -0.008,
    conversionDelta: 0.025,
    possessionDelta: 0.08,
    moraleStep: 0,
    commentaryTemplate: (managerName, clubShortName, captainName) =>
      `⚡ Grito da Área Técnica: ${managerName} manda o ${clubShortName} adiantar as linhas e sufocar a saída de bola! ${
        captainName ? `${captainName} puxa a marcação pressão!` : 'Pressão sufocante no campo rival!'
      }`,
  },
  {
    id: 'TUDO_OU_NADA',
    label: 'Tudo ou Nada',
    shortDesc: 'Máxima agressividade pelo gol (expõe contra-ataques)',
    durationMinutes: 10,
    cooldownMinutes: 18,
    userChanceDelta: 0.028,
    oppChanceDelta: 0.015,
    conversionDelta: 0.06,
    possessionDelta: 0.05,
    moraleStep: 1,
    commentaryTemplate: (managerName, clubShortName, captainName) =>
      `🔥 Grito da Área Técnica: ${managerName} lança o ${clubShortName} no TUDO OU NADA! Todos à frente buscando o gol! ${
        captainName ? `${captainName} empurra o time inteiro pro ataque!` : ''
      }`,
  },
];

export function shiftPlayerMoraleStep(morale: Morale, step: -1 | 0 | 1): Morale {
  if (step === 0) return morale;
  const ladder: Morale[] = ['Péssima', 'Baixa', 'Regular', 'Boa', 'Excelente'];
  const idx = ladder.indexOf(morale);
  const safeIdx = idx === -1 ? 2 : idx;
  const nextIdx = Math.max(0, Math.min(ladder.length - 1, safeIdx + step));
  return ladder[nextIdx];
}

export function computeCaptainLeadershipScore(player: Player): number {
  let score = player.overall * 0.72;
  score += Math.min(18, Math.max(0, (player.age - 21) * 1.35));
  if (player.detailedRole === 'ZAG' || player.detailedRole === 'VOL' || player.position === 'GK') {
    score += 4.5;
  }
  const skill = (player.specialSkill || '').toLowerCase();
  if (
    skill.includes('xerife') ||
    skill.includes('líder') ||
    skill.includes('lider') ||
    skill.includes('maestro') ||
    skill.includes('capit') ||
    skill.includes('paredão')
  ) {
    score += 7;
  }
  if (player.morale === 'Excelente') score += 3;
  else if (player.morale === 'Boa') score += 1.5;
  return Math.min(99, Math.max(50, Math.round(score)));
}

export function computePenaltySkillScore(player: Player): number {
  let score = player.overall * 0.85;
  if (player.position === 'FW') score += 9;
  else if (player.detailedRole === 'MEI') score += 7;
  else if (player.position === 'MF') score += 4;
  else if (player.position === 'GK') score -= 12;

  const skill = (player.specialSkill || '').toLowerCase();
  if (
    skill.includes('finalizador') ||
    skill.includes('artilheiro') ||
    skill.includes('clínico') ||
    skill.includes('clinico') ||
    skill.includes('bola parada') ||
    skill.includes('frieza')
  ) {
    score += 8;
  }
  if (player.preferredFoot === 'Ambidestro') score += 3;
  return Math.min(99, Math.max(45, Math.round(score)));
}

export function computeFreekickSkillScore(player: Player): number {
  let score = player.overall * 0.84;
  if (player.detailedRole === 'MEI') score += 10;
  else if (player.detailedRole === 'LAT') score += 6;
  else if (player.position === 'FW') score += 5.5;
  else if (player.detailedRole === 'VOL') score += 4;
  else if (player.position === 'GK') score -= 15;

  const skill = (player.specialSkill || '').toLowerCase();
  if (
    skill.includes('maestro') ||
    skill.includes('bola parada') ||
    skill.includes('passe') ||
    skill.includes('chute') ||
    skill.includes('canhotinha')
  ) {
    score += 8;
  }
  if (player.preferredFoot === 'Canhoto' || player.preferredFoot === 'Ambidestro') {
    score += 2.5;
  }
  return Math.min(99, Math.max(45, Math.round(score)));
}

export function computeCornerSkillScore(player: Player): number {
  let score = player.overall * 0.83;
  if (player.detailedRole === 'MEI') score += 10;
  else if (player.detailedRole === 'LAT') score += 9;
  else if (player.detailedRole === 'VOL') score += 4;
  else if (player.detailedRole === 'ZAG') score -= 8; // Zagueiros vão para a área cabecear
  else if (player.position === 'GK') score -= 20;

  const skill = (player.specialSkill || '').toLowerCase();
  if (
    skill.includes('maestro') ||
    skill.includes('cruzamento') ||
    skill.includes('garçom') ||
    skill.includes('garcom') ||
    skill.includes('passe')
  ) {
    score += 7;
  }
  return Math.min(99, Math.max(45, Math.round(score)));
}

export function pickOptimalSetPieceTakers(starters: Player[]): {
  captainId?: string;
  penaltyTakerId?: string;
  freekickTakerId?: string;
  cornerTakerId?: string;
} {
  if (!starters || starters.length === 0) return {};
  const byCaptain = [...starters].sort(
    (a, b) => computeCaptainLeadershipScore(b) - computeCaptainLeadershipScore(a)
  );
  const byPenalty = [...starters].sort(
    (a, b) => computePenaltySkillScore(b) - computePenaltySkillScore(a)
  );
  const byFreekick = [...starters].sort(
    (a, b) => computeFreekickSkillScore(b) - computeFreekickSkillScore(a)
  );
  const byCorner = [...starters].sort(
    (a, b) => computeCornerSkillScore(b) - computeCornerSkillScore(a)
  );

  return {
    captainId: byCaptain[0]?.id,
    penaltyTakerId: byPenalty[0]?.id,
    freekickTakerId: byFreekick[0]?.id,
    cornerTakerId: byCorner[0]?.id,
  };
}

export interface ActivePitchSpecialists {
  captain: Player | undefined;
  captainLeadership: number;
  penaltyTaker: Player | undefined;
  penaltySkill: number;
  freekickTaker: Player | undefined;
  freekickSkill: number;
  cornerTaker: Player | undefined;
  cornerSkill: number;
}

export function resolveActiveTakersOnPitch(
  club: Club,
  redCardPlayerIds?: Set<string>
): ActivePitchSpecialists {
  const activeOnPitch = club.squad.filter(
    (p) => p.isStarter && (!redCardPlayerIds || !redCardPlayerIds.has(p.id))
  );

  const fallbackOptimal = pickOptimalSetPieceTakers(activeOnPitch);

  const captain =
    activeOnPitch.find((p) => p.id === club.tactics.captainId) ||
    activeOnPitch.find((p) => p.id === fallbackOptimal.captainId) ||
    activeOnPitch[0];

  const penaltyTaker =
    activeOnPitch.find((p) => p.id === club.tactics.penaltyTakerId) ||
    activeOnPitch.find((p) => p.id === fallbackOptimal.penaltyTakerId) ||
    activeOnPitch[0];

  const freekickTaker =
    activeOnPitch.find((p) => p.id === club.tactics.freekickTakerId) ||
    activeOnPitch.find((p) => p.id === fallbackOptimal.freekickTakerId) ||
    activeOnPitch[0];

  const cornerTaker =
    activeOnPitch.find((p) => p.id === club.tactics.cornerTakerId) ||
    activeOnPitch.find((p) => p.id === fallbackOptimal.cornerTakerId) ||
    activeOnPitch[0];

  return {
    captain,
    captainLeadership: captain ? computeCaptainLeadershipScore(captain) : 70,
    penaltyTaker,
    penaltySkill: penaltyTaker ? computePenaltySkillScore(penaltyTaker) : 70,
    freekickTaker,
    freekickSkill: freekickTaker ? computeFreekickSkillScore(freekickTaker) : 70,
    cornerTaker,
    cornerSkill: cornerTaker ? computeCornerSkillScore(cornerTaker) : 70,
  };
}

export interface LivePlayerMatchRating {
  playerId: string;
  playerName: string;
  clubId: string;
  clubShortName: string;
  detailedRole: Player['detailedRole'];
  squadNumber: number;
  rating: number;
  goals: number;
  assists: number;
  saves: number;
  yellowCards: number;
  redCards: number;
  isCaptain: boolean;
}

export function computeLiveMatchRatings(params: {
  homeClub: Club;
  awayClub: Club;
  homeScore: number;
  awayScore: number;
  minute: number;
  events: MatchEvent[];
  subbedInPlayerIds?: Set<string>;
  subbedOutPlayerIds?: Set<string>;
}): Map<string, LivePlayerMatchRating> {
  const {
    homeClub,
    awayClub,
    homeScore,
    awayScore,
    minute,
    events,
    subbedInPlayerIds = new Set(),
    subbedOutPlayerIds = new Set(),
  } = params;

  const map = new Map<string, LivePlayerMatchRating>();
  const progressFactor = Math.min(1, Math.max(0.15, minute / 90));

  const processClub = (club: Club, clubGoals: number, oppGoals: number) => {
    const activeCapId = resolveActiveTakersOnPitch(club).captain?.id;
    const tacticalReport = resolveClubLineupTacticalReport(club);

    for (const p of club.squad) {
      const participated =
        p.isStarter || subbedInPlayerIds.has(p.id) || subbedOutPlayerIds.has(p.id);
      if (!participated) continue;

      const slotFit = tacticalReport.assignmentByPlayerId.get(p.id)?.fit;
      const effectiveOvr = slotFit ? slotFit.effectiveOverall : p.overall;
      const outOfPositionDrag = slotFit && slotFit.overallPenalty >= 7 ? 0.35 * progressFactor : 0;

      let rating = 6.3 + ((effectiveOvr - 72) * 0.015) * progressFactor - outOfPositionDrag;

      const goals = events.filter(
        (e) =>
          (e.type === 'GOL' || e.type === 'PENALTI_GOL') &&
          e.teamId === club.id &&
          (e.playerId === p.id || e.playerName === p.name)
      ).length;

      const assists = events.filter(
        (e) =>
          (e.type === 'GOL' || e.type === 'PENALTI_GOL') &&
          e.teamId === club.id &&
          (e.assistPlayerId ? e.assistPlayerId === p.id : e.assistPlayerName === p.name)
      ).length;

      const missedPenalties = events.filter(
        (e) =>
          e.type === 'PENALTI_PERDIDO' &&
          e.teamId === club.id &&
          (e.playerId === p.id || e.playerName === p.name)
      ).length;

      const saves = events.filter(
        (e) =>
          e.type === 'DEFESAÇA' &&
          e.teamId === club.id &&
          (e.playerId === p.id || e.playerName === p.name)
      ).length;

      const woodworkHits = events.filter(
        (e) =>
          (e.type === 'CHUTE_TRAVE' || e.type === 'FALTA_PERIGOSA') &&
          e.teamId === club.id &&
          (e.playerId === p.id || e.playerName === p.name)
      ).length;

      const yellows = events.filter(
        (e) => e.type === 'CARTAO_AMARELO' && e.teamId === club.id && e.playerId === p.id
      ).length;

      const reds = events.filter(
        (e) => e.type === 'CARTAO_VERMELHO' && e.teamId === club.id && e.playerId === p.id
      ).length;

      rating += goals * 1.25;
      rating += assists * 0.75;
      rating += saves * 0.55;
      rating += woodworkHits * 0.22;
      rating -= missedPenalties * 0.85;
      rating -= yellows * 0.35;
      rating -= reds * 1.75;

      // Defensive / Clean sheet & team result contribution
      if (p.position === 'GK' || p.position === 'DF' || p.detailedRole === 'VOL') {
        if (oppGoals === 0 && minute >= 30) {
          rating += 0.55 * progressFactor;
        } else if (oppGoals >= 2) {
          rating -= Math.min(0.9, (oppGoals - 1) * 0.32);
        }
      }

      if (clubGoals > oppGoals) {
        rating += 0.35 * progressFactor;
      } else if (clubGoals < oppGoals) {
        rating -= 0.25 * progressFactor;
      }

      const isCaptain = p.id === club.tactics.captainId || p.id === activeCapId;
      if (isCaptain && clubGoals >= oppGoals && minute >= 45) {
        rating += 0.15;
      }

      const clamped = Math.round(Math.min(10.0, Math.max(3.5, rating)) * 10) / 10;

      map.set(p.id, {
        playerId: p.id,
        playerName: p.name,
        clubId: club.id,
        clubShortName: club.shortName,
        detailedRole: p.detailedRole,
        squadNumber: p.squadNumber,
        rating: clamped,
        goals,
        assists,
        saves,
        yellowCards: yellows,
        redCards: reds,
        isCaptain,
      });
    }
  };

  processClub(homeClub, homeScore, awayScore);
  processClub(awayClub, awayScore, homeScore);
  return map;
}

export function pickManOfTheMatch(
  ratingsMap: Map<string, LivePlayerMatchRating>
): LivePlayerMatchRating | null {
  const list = Array.from(ratingsMap.values());
  if (list.length === 0) return null;
  list.sort((a, b) => {
    if (b.rating !== a.rating) return b.rating - a.rating;
    if (b.goals !== a.goals) return b.goals - a.goals;
    if (b.assists !== a.assists) return b.assists - a.assists;
    return b.saves - a.saves;
  });
  return list[0];
}

export function applyPostMatchRatingsToSquad(
  squad: Player[],
  ratingsMap: Map<string, LivePlayerMatchRating>
): Player[] {
  return squad.map((p) => {
    const entry = ratingsMap.get(p.id);
    if (!entry) return p;
    const prevMatches = Math.max(0, (p.matches || 1) - 1);
    const prevAvg = p.ratingAverage && p.ratingAverage > 0 ? p.ratingAverage : 6.5;
    const newAvg =
      prevMatches === 0
        ? entry.rating
        : Math.round(((prevAvg * prevMatches + entry.rating) / (prevMatches + 1)) * 100) / 100;
    return {
      ...p,
      ratingAverage: Math.min(10, Math.max(4.0, newAvg)),
      lastMatchRating: entry.rating,
    };
  });
}
