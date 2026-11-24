import { Player, CompetitionType, InboxMessage, PlayerSuspension } from '../types/game';
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
 * Processes cards received by a player during a match in a given competition.
 * - Accumulating 3 yellow cards in the competition triggers 1-match suspension.
 * - Receiving a red card triggers 1-match suspension in that competition.
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

  const newCompYellows = currentCompYellows + yellowsInMatch;
  const newCompReds = currentCompReds + redsInMatch;

  const currentSuspensions: PlayerSuspension[] = [...(player.suspensions || [])];

  // 1. Check for 3 Yellow Cards in this competition
  const willBeSuspendedForYellows = newCompYellows >= 3;
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
        notes: `3º cartão amarelo acumulado no ${compMeta.shortName}`,
      });
    }

    if (isUserClub) {
      generatedMessages.push({
        id: `susp_yellow_${Date.now()}_${player.id}_${competition}`,
        title: `🟨🟥 SUSPENSÃO AUTOMÁTICA: ${player.name} suspenso no ${compMeta.shortName}!`,
        message: `O atleta ${player.name} (#${player.squadNumber}, ${player.detailedRole}) recebeu o 3º cartão amarelo no ${compMeta.name} e desfalcará a equipe por 1 partida de suspensão automática no próximo confronto desta competição.`,
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

  // 2. Check for Red Card in this competition
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
        notes: `Expulso com cartão vermelho no ${compMeta.shortName}`,
      });
    }

    if (isUserClub) {
      generatedMessages.push({
        id: `susp_red_${Date.now()}_${player.id}_${competition}`,
        title: `🟥 EXPULSÃO: ${player.name} punido com Cartão Vermelho!`,
        message: `O atleta ${player.name} (#${player.squadNumber}, ${player.detailedRole}) foi expulso de campo no ${compMeta.name} e terá que cumprir 1 partida de suspensão automática no próximo confronto deste campeonato.`,
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
 * Clears yellow cards cycle (back to 0) upon completing 3-yellows suspension.
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

    let hasServedSuspension = false;
    let servedReason: 'YELLOW_CARDS' | 'RED_CARD' = 'YELLOW_CARDS';

    const remainingSuspensions: PlayerSuspension[] = [];

    player.suspensions.forEach((s) => {
      if (s.competition === competition && s.matchesRemaining > 0) {
        hasServedSuspension = true;
        servedReason = s.reason;
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

    if (!hasServedSuspension) {
      return player;
    }

    // Reset yellow counter in this competition if 3-yellow suspension was fulfilled
    const updatedCompYellows = { ...(player.competitionYellowCards || {}) };
    if (servedReason === 'YELLOW_CARDS') {
      updatedCompYellows[competition] = 0;
    }

    const hasAnyRemaining = remainingSuspensions.some((s) => s.matchesRemaining > 0);

    if (isUserClub) {
      generatedMessages.push({
        id: `susp_served_${Date.now()}_${player.id}_${competition}`,
        title: `✅ SUSPENSÃO CUMPRIDA: ${player.name} liberado no ${compMeta.shortName}!`,
        message: `Excelente notícia! O atleta ${player.name} (#${player.squadNumber}, ${player.detailedRole}) cumpriu a partida de suspensão automática no ${compMeta.name}. ${
          servedReason === 'YELLOW_CARDS' ? 'Seu ciclo de cartões amarelos foi zerado' : 'Sua punição por expulsão foi encerrada'
        } e ele está novamente à disposição do treinador para escalação!`,
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
          reason: servedReason,
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
