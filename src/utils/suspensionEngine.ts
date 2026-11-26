import {
  Club,
  CompetitionType,
  InboxMessage,
  MatchEvent,
  Player,
  PlayerSuspension,
} from '../types/game';
import { COMPETITIONS_CATALOG } from './competitionsEngine';

/**
 * Checks if a player has an active suspension for a given competition,
 * or across any competition if no competition is specified.
 */
export function isPlayerSuspendedInCompetition(
  player: Player,
  competition?: CompetitionType
): boolean {
  if (!player.suspensions || player.suspensions.length === 0) {
    return false;
  }

  if (competition) {
    return player.suspensions.some(
      (s) => s.competition === competition && s.matchesRemaining > 0
    );
  }

  return player.suspensions.some((s) => s.matchesRemaining > 0);
}

/**
 * Returns the active suspension details for a specific competition, if any.
 */
export function getPlayerSuspensionInCompetition(
  player: Player,
  competition: CompetitionType
): PlayerSuspension | undefined {
  return player.suspensions?.find(
    (s) => s.competition === competition && s.matchesRemaining > 0
  );
}

/**
 * Picks a realistic fouler among active on-pitch starters (excluding already sent-off players).
 * Defenders & defensive midfielders draw more fouls/cards than forwards; goalkeepers very rarely.
 */
export function pickWeightedFouler(
  starters: Player[],
  redCardPlayerIds?: Set<string>
): Player | undefined {
  const active = starters.filter((p) => !redCardPlayerIds || !redCardPlayerIds.has(p.id));
  if (active.length === 0) return undefined;

  const weighted: Player[] = [];
  for (const p of active) {
    let w = 2;
    if (p.detailedRole === 'VOL' || p.detailedRole === 'ZAG') w = 5;
    else if (p.detailedRole === 'LAT') w = 4;
    else if (p.detailedRole === 'MEI') w = 3;
    else if (p.detailedRole === 'ATA') w = 2;
    else if (p.position === 'GK') w = 1;
    for (let i = 0; i < w; i++) weighted.push(p);
  }

  return weighted[Math.floor(Math.random() * weighted.length)] || active[0];
}

/**
 * Processes cards received by a player during a match in a given competition.
 * - Direct red card (or 2nd yellow expulsion): 1-match automatic suspension in that competition.
 * - Every 3 accumulated yellow cards in that competition: 1-match automatic suspension.
 */
export function recordPlayerCards(
  player: Player,
  yellowsInMatch: number,
  redsInMatch: number,
  competition: CompetitionType,
  date: string,
  round: number,
  isUserClub: boolean
): { updatedPlayer: Player; generatedMessages: InboxMessage[] } {
  if (yellowsInMatch === 0 && redsInMatch === 0) {
    return { updatedPlayer: player, generatedMessages: [] };
  }

  const generatedMessages: InboxMessage[] = [];
  const compMeta = COMPETITIONS_CATALOG[competition] || COMPETITIONS_CATALOG.serie_a;

  const currentCompYellows = player.competitionYellowCards?.[competition] || 0;
  const currentCompReds = player.competitionRedCards?.[competition] || 0;

  // If the player was sent off in this match (direct red or 2nd yellow -> red),
  // the red card already triggers 1 match suspension. Only count pure yellow accumulation
  // when no red card was shown (so a 2nd-yellow expulsion doesn't double-trigger a 3-yellow ban).
  const effectiveYellowDeltaForCycle = redsInMatch > 0 ? 0 : yellowsInMatch;
  const newCompYellows = currentCompYellows + effectiveYellowDeltaForCycle;
  const newCompReds = currentCompReds + redsInMatch;

  const currentSuspensions: PlayerSuspension[] = [...(player.suspensions || [])];

  // 1. Check for Red Card in this competition (1 match out)
  if (redsInMatch > 0) {
    const existingRedSuspension = currentSuspensions.find(
      (s) => s.competition === competition && s.reason === 'RED_CARD'
    );

    if (existingRedSuspension) {
      existingRedSuspension.matchesRemaining = Math.max(existingRedSuspension.matchesRemaining, 1);
    } else {
      currentSuspensions.push({
        competition,
        matchesRemaining: 1,
        reason: 'RED_CARD',
        originMatchDate: date,
        notes: `Expulso com cartão vermelho no ${compMeta.shortName} (1 jogo fora)`,
      });
    }

    if (isUserClub) {
      generatedMessages.push({
        id: `susp_red_${Date.now()}_${player.id}_${competition}`,
        title: `🟥 EXPULSÃO: ${player.name} suspenso por 1 jogo no ${compMeta.shortName}!`,
        message: `O atleta ${player.name} (#${player.squadNumber}, ${player.detailedRole}) recebeu cartão vermelho no ${compMeta.name} e cumprirá 1 partida de suspensão automática no próximo compromisso desta competição.`,
        date,
        round,
        read: false,
        type: 'SUSPENSION',
        suspensionDetails: {
          playerId: player.id,
          playerName: player.name,
          playerRole: player.detailedRole,
          squadNumber: player.squadNumber,
          overall: player.overall,
          competition,
          competitionName: compMeta.name,
          reason: 'RED_CARD',
          matchesSuspended: 1,
          yellowCardsInCompetition: newCompYellows,
        },
      });
    }
  }

  // 2. Check for 3 Accumulated Yellow Cards in this competition (1 match out)
  const willBeSuspendedForYellows = redsInMatch === 0 && newCompYellows >= 3;
  if (willBeSuspendedForYellows) {
    const existingYellowSuspension = currentSuspensions.find(
      (s) => s.competition === competition && s.reason === 'YELLOW_CARDS'
    );

    if (existingYellowSuspension) {
      existingYellowSuspension.matchesRemaining = Math.max(existingYellowSuspension.matchesRemaining, 1);
    } else {
      currentSuspensions.push({
        competition,
        matchesRemaining: 1,
        reason: 'YELLOW_CARDS',
        originMatchDate: date,
        notes: `3º cartão amarelo acumulado no ${compMeta.shortName} (1 jogo fora)`,
      });
    }

    if (isUserClub) {
      generatedMessages.push({
        id: `susp_yellow_${Date.now()}_${player.id}_${competition}`,
        title: `🟨🟥 3º AMARELO: ${player.name} suspenso por 1 jogo no ${compMeta.shortName}!`,
        message: `O atleta ${player.name} (#${player.squadNumber}, ${player.detailedRole}) acumulou o 3º cartão amarelo no ${compMeta.name} e desfalcará a equipe por 1 partida de suspensão automática no próximo confronto desta competição.`,
        date,
        round,
        read: false,
        type: 'SUSPENSION',
        suspensionDetails: {
          playerId: player.id,
          playerName: player.name,
          playerRole: player.detailedRole,
          squadNumber: player.squadNumber,
          overall: player.overall,
          competition,
          competitionName: compMeta.name,
          reason: 'YELLOW_CARDS',
          matchesSuspended: 1,
          yellowCardsInCompetition: newCompYellows,
        },
      });
    }
  }

  const hasAnyActiveSuspension = currentSuspensions.some((s) => s.matchesRemaining > 0);

  const updatedPlayer: Player = {
    ...player,
    yellowCards: player.yellowCards + yellowsInMatch,
    redCards: player.redCards + redsInMatch,
    competitionYellowCards: {
      ...(player.competitionYellowCards || {}),
      [competition]: newCompYellows,
    },
    competitionRedCards: {
      ...(player.competitionRedCards || {}),
      [competition]: newCompReds,
    },
    suspensions: currentSuspensions,
    isSuspended: hasAnyActiveSuspension,
  };

  return { updatedPlayer, generatedMessages };
}

/**
 * Decrements served suspensions for players who sat out a match in that competition.
 * Resets the 3-yellow cycle cleanly upon fulfilling a yellow-card accumulation ban.
 */
export function serveSquadCompetitionSuspensions(
  squad: Player[],
  competition: CompetitionType,
  date: string,
  round: number,
  isUserClub: boolean
): { updatedSquad: Player[]; generatedMessages: InboxMessage[] } {
  const generatedMessages: InboxMessage[] = [];
  const compMeta = COMPETITIONS_CATALOG[competition] || COMPETITIONS_CATALOG.serie_a;

  const updatedSquad = squad.map((player) => {
    if (!player.suspensions || player.suspensions.length === 0) {
      return player;
    }

    let servedYellowSuspension = false;
    let servedRedSuspension = false;
    const remainingSuspensions: PlayerSuspension[] = [];

    player.suspensions.forEach((s) => {
      if (s.competition === competition && s.matchesRemaining > 0) {
        if (s.reason === 'YELLOW_CARDS') servedYellowSuspension = true;
        if (s.reason === 'RED_CARD') servedRedSuspension = true;

        const newMatchesRemaining = s.matchesRemaining - 1;
        if (newMatchesRemaining > 0) {
          remainingSuspensions.push({
            ...s,
            matchesRemaining: newMatchesRemaining,
          });
        }
      } else {
        remainingSuspensions.push(s);
      }
    });

    if (!servedYellowSuspension && !servedRedSuspension) {
      return player;
    }

    const updatedCompYellows = { ...(player.competitionYellowCards || {}) };
    if (servedYellowSuspension) {
      updatedCompYellows[competition] = Math.max(0, (updatedCompYellows[competition] || 0) - 3);
    }

    const hasAnyRemaining = remainingSuspensions.some((s) => s.matchesRemaining > 0);
    const primaryServedReason: 'YELLOW_CARDS' | 'RED_CARD' = servedRedSuspension
      ? 'RED_CARD'
      : 'YELLOW_CARDS';

    if (isUserClub) {
      generatedMessages.push({
        id: `susp_served_${Date.now()}_${player.id}_${competition}`,
        title: `✅ SUSPENSÃO CUMPRIDA: ${player.name} liberado no ${compMeta.shortName}!`,
        message: `O atleta ${player.name} (#${player.squadNumber}, ${player.detailedRole}) cumpriu a partida de suspensão automática no ${compMeta.name}. ${
          servedYellowSuspension
            ? 'Seu ciclo de 3 cartões amarelos foi zerado'
            : 'Sua punição por cartão vermelho foi encerrada'
        } e ele está novamente liberado para jogar!`,
        date,
        round,
        read: false,
        type: 'SUSPENSION',
        suspensionDetails: {
          playerId: player.id,
          playerName: player.name,
          playerRole: player.detailedRole,
          squadNumber: player.squadNumber,
          overall: player.overall,
          competition,
          competitionName: compMeta.name,
          reason: primaryServedReason,
          matchesSuspended: 0,
          yellowCardsInCompetition: updatedCompYellows[competition] || 0,
          cleared: true,
        },
      });
    }

    return {
      ...player,
      competitionYellowCards: updatedCompYellows,
      suspensions: remainingSuspensions,
      isSuspended: hasAnyRemaining,
    };
  });

  return { updatedSquad, generatedMessages };
}

/**
 * Sanitizes the squad before entering a match in competition `competition`:
 * Ensures any suspended player in this competition is removed from the starting lineup and bench.
 */
export function sanitizeLineupForCompetition(
  squad: Player[],
  competition: CompetitionType
): { sanitizedSquad: Player[]; benchedNames: string[] } {
  const benchedNames: string[] = [];

  const sanitizedSquad = squad.map((player) => {
    const isSuspendedHere = isPlayerSuspendedInCompetition(player, competition);

    if (isSuspendedHere && (player.isStarter || player.isSubstitute)) {
      benchedNames.push(player.name);
      return {
        ...player,
        isStarter: false,
        isSubstitute: false,
        pitchSlot: undefined,
      };
    }

    return player;
  });

  return { sanitizedSquad, benchedNames };
}

export interface MatchDisciplinaryPreview {
  suspendedNextMatch: Array<{
    playerId: string;
    playerName: string;
    reason: 'RED_CARD' | 'YELLOW_CARDS';
    yellowsInComp: number;
  }>;
  penduradosNow: Array<{
    playerId: string;
    playerName: string;
    yellowsInComp: number;
  }>;
}

/**
 * Previews who from `club` will miss the next match in `competition` (direct/2nd-yellow red card
 * or 3rd accumulated yellow card) and who is now pendurado (2/3 yellows) based on match events.
 */
export function previewMatchDisciplinaryImpact(
  club: Club,
  events: MatchEvent[],
  competition: CompetitionType
): MatchDisciplinaryPreview {
  if (competition === 'amistoso_internacional') {
    return { suspendedNextMatch: [], penduradosNow: [] };
  }

  const suspendedNextMatch: MatchDisciplinaryPreview['suspendedNextMatch'] = [];
  const penduradosNow: MatchDisciplinaryPreview['penduradosNow'] = [];

  for (const player of club.squad) {
    const yellowsInMatch = events.filter(
      (e) => e.type === 'CARTAO_AMARELO' && e.teamId === club.id && e.playerId === player.id
    ).length;
    const redsInMatch = events.filter(
      (e) => e.type === 'CARTAO_VERMELHO' && e.teamId === club.id && e.playerId === player.id
    ).length;

    if (yellowsInMatch === 0 && redsInMatch === 0) continue;

    const prevYellows = player.competitionYellowCards?.[competition] || 0;
    const nextYellows = redsInMatch > 0 ? prevYellows : prevYellows + yellowsInMatch;

    if (redsInMatch > 0) {
      suspendedNextMatch.push({
        playerId: player.id,
        playerName: player.name,
        reason: 'RED_CARD',
        yellowsInComp: nextYellows,
      });
    } else if (nextYellows >= 3) {
      suspendedNextMatch.push({
        playerId: player.id,
        playerName: player.name,
        reason: 'YELLOW_CARDS',
        yellowsInComp: nextYellows,
      });
    } else if (nextYellows === 2) {
      penduradosNow.push({
        playerId: player.id,
        playerName: player.name,
        yellowsInComp: 2,
      });
    }
  }

  return { suspendedNextMatch, penduradosNow };
}
