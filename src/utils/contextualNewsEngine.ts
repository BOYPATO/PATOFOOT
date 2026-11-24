import { Club, Fixture, GameSave, InboxMessage } from '../types/game';
import { getMatchRivalryInfo } from './rivalryEngine';
import { formatShortDate } from './calendarUtils';
import { getClubReleasedPlayersForFifa, getFifaWindowForDate } from './nationalTeamEngine';

export interface ContextualNewsInput {
  state: GameSave;
  completedFixture?: Fixture | null;
  upcomingFixture?: Fixture | null;
}

/**
 * Generates deduplicated contextual journalism and dressing-room buildup headlines
 * based on active career state:
 * 1) 5+ win streak across official club matches
 * 2) Reunion clash against a former club previously managed in managerCareer.stints
 * 3) Pre-match rivalry derby tension ahead of next scheduled clash
 * 4) Club players summoned to World Cup or Continental Cup tournaments
 */
export function generateContextualNewsMessages(input: ContextualNewsInput): InboxMessage[] {
  const { state, completedFixture, upcomingFixture } = input;
  const userClub = state.clubs.find((c) => c.id === state.userClubId);
  if (!userClub) return [];

  const existingIds = new Set(state.inbox.map((m) => m.id));
  const messages: InboxMessage[] = [];
  const dateDisplay = formatShortDate(state.currentDate || '2026-01-15');
  const seasonTag = state.currentSeasonYear;

  const pushUnique = (msg: InboxMessage) => {
    if (!existingIds.has(msg.id)) {
      existingIds.add(msg.id);
      messages.push(msg);
    }
  };

  // 1. 5+ Official Win Streak
  if (completedFixture && completedFixture.played) {
    const allClubPools: Fixture[] = [
      ...(state.fixturesA || []),
      ...(state.fixturesB || []),
      ...(state.fixturesC || []),
      ...(state.fixturesD || []),
      ...(state.fixturesEstadual || []),
      ...(state.fixturesCopaBrasil || []),
      ...(state.fixturesCopaNordeste || []),
      ...(state.fixturesCopaVerde || []),
      ...(state.fixturesLibertadores || []),
      ...(state.fixturesSulamericana || []),
      ...(state.fixturesChampionsLeague || []),
      ...(state.fixturesEuropaLeague || []),
      ...(state.fixturesConferenceLeague || []),
      ...(state.fixturesUefaSupercup || []),
      ...(state.fixturesAfcChampions || []),
      ...(state.fixturesConcacafChampions || []),
      ...(state.fixturesCopaInternacional || []),
      ...(state.fixturesEngFaCup || []),
      ...(state.fixturesEngEflCup || []),
      ...Object.values(state.fixturesEurope || {}).flat(),
      ...Object.values(state.fixturesSouthAmerica || {}).flat(),
      ...Object.values(state.fixturesWorldLeagues || {}).flat(),
      ...Object.values(state.fixturesEuropeanCups || {}).flat(),
      ...Object.values(state.fixturesSouthAmericanCups || {}).flat(),
      ...Object.values(state.fixturesWorldCups || {}).flat(),
    ];

    const playedUserMatches = allClubPools
      .filter(
        (f) =>
          f.played &&
          (f.homeTeamId === userClub.id || f.awayTeamId === userClub.id)
      )
      .sort((a, b) => (b.date || '').localeCompare(a.date || '') || b.round - a.round);

    let streak = 0;
    for (const m of playedUserMatches.slice(0, 12)) {
      const isHome = m.homeTeamId === userClub.id;
      const gf = isHome ? m.homeScore ?? 0 : m.awayScore ?? 0;
      const ga = isHome ? m.awayScore ?? 0 : m.homeScore ?? 0;
      const won =
        gf > ga ||
        (gf === ga && m.aggregateWinnerId === userClub.id);
      if (won) streak++;
      else break;
    }

    if (streak >= 5 && streak % 5 === 0) {
      pushUnique({
        id: `msg_ctx_winstreak_${userClub.id}_${seasonTag}_s${streak}`,
        title: `Imprensa Destaca Sequência: ${streak} Vitórias Seguidas do ${userClub.shortName}`,
        message: `Com moral em alta nos bastidores e ótima entrega tática, o ${userClub.name} atingiu ${streak} vitórias consecutivas na temporada! A torcida lota o ${userClub.stadium.name} e a diretoria reforça a confiança no seu trabalho.`,
        date: dateDisplay,
        round: state.currentRound,
        read: false,
        type: 'BOARD',
      });
    }
  }

  // 2 & 3. Upcoming Fixture Storytelling (Reunion vs Ex-Club + Pre-Derby Buildup)
  if (upcomingFixture && !upcomingFixture.played) {
    const oppId =
      upcomingFixture.homeTeamId === userClub.id
        ? upcomingFixture.awayTeamId
        : upcomingFixture.homeTeamId;
    const oppClub = state.clubs.find((c) => c.id === oppId);

    if (oppClub) {
      // 2. Former Club Reunion
      const exStints = (state.managerCareer?.careerStints || []).filter(
        (s) => s.clubId === oppClub.id && oppClub.id !== userClub.id
      );
      if (exStints.length > 0) {
        const lastStint = exStints[exStints.length - 1];
        const endYearLabel = lastStint.endDate ? lastStint.endDate.slice(0, 4) : seasonTag;
        pushUnique({
          id: `msg_ctx_exclub_${upcomingFixture.id}`,
          title: `Reencontro Especial: ${userClub.shortName} enfrenta seu ex-clube (${oppClub.shortName})`,
          message: `O próximo duelo coloca você frente a frente com o ${oppClub.name}, equipe que comandou entre ${lastStint.startYear} e ${endYearLabel}. Imprensa e torcida acompanham de perto o reencontro tático à beira do gramado.`,
          date: dateDisplay,
          round: state.currentRound,
          read: false,
          type: 'BOARD',
        });
      }

      // 3. Heated Pre-Derby Buildup
      const rivalry = getMatchRivalryInfo(userClub, oppClub);
      if (rivalry && upcomingFixture.date) {
        pushUnique({
          id: `msg_ctx_prederby_${upcomingFixture.id}`,
          title: `Semana de Clássico: ${rivalry.derbyName} agita os bastidores`,
          message: `O confronto entre ${userClub.name} e ${oppClub.name} (${rivalry.derbyName}) já mobiliza vestiário e arquibancadas. Ajuste a marcação e prepare a postura para o clássico!`,
          date: dateDisplay,
          round: state.currentRound,
          read: false,
          type: 'BOARD',
        });
      }
    }
  }

  // 4. Club Athletes Summoned for World Cup / Continental Cup
  if (state.currentDate) {
    const fifaWin = getFifaWindowForDate(state.currentDate);
    if (
      fifaWin &&
      (fifaWin.kind === 'WORLD_CUP' || fifaWin.kind === 'CONTINENTAL_CUP')
    ) {
      const released = getClubReleasedPlayersForFifa(
        userClub,
        state.clubs,
        state.nationalTeam
      );
      if (released.length > 0) {
        const namesList = released
          .slice(0, 5)
          .map((r) => `${r.playerName} (${r.nationalTeamCode})`)
          .join(', ');
        const extra = released.length > 5 ? ` e mais ${released.length - 5}` : '';
        pushUnique({
          id: `msg_ctx_fifa_tournament_${userClub.id}_${fifaWin.id}`,
          title: `Orgulho do CT na ${fifaWin.shortLabel}: ${released.length} atleta(s) convocados`,
          message: `Durante o torneio oficial "${fifaWin.name}", o ${userClub.name} cedeu ${released.length} jogador(es) às suas seleções: ${namesList}${extra}. O desempenho no torneio valoriza o passe dos atletas no mercado internacional.`,
          date: dateDisplay,
          round: state.currentRound,
          read: false,
          type: 'NATIONAL_TEAM',
        });
      }
    }
  }

  return messages;
}
