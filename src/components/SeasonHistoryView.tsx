import React, { useMemo, useState } from 'react';
import {
  Award,
  BarChart3,
  Calendar,
  Crown,
  Flame,
  Globe,
  History,
  Medal,
  Search,
  Shield,
  Sparkles,
  Star,
  Target,
  Trophy,
  Users,
} from 'lucide-react';
import {
  Club,
  GameSave,
  SeasonCompetitionArchive,
  SeasonHistoryRecord,
  SeasonTeamOfTheYearSlot,
} from '../types/game';
import {
  computeAllTimeGeneralHistory,
  getUnifiedSeasonHistoryRecords,
} from '../utils/seasonHistoryEngine';
import { soundEngine } from '../services/soundEngine';

interface SeasonHistoryViewProps {
  gameState: GameSave;
  userClub: Club;
  onInspectClub: (clubId: string) => void;
  onInspectPlayer: (clubId: string, playerId: string) => void;
  onOpenUserSquad: () => void;
}

type TopMode = 'YEAR_BY_YEAR' | 'ALL_TIME';
type YearSubTab = 'honors' | 'champions' | 'toty' | 'scorers';
type AllTimeSubTab = 'clubs' | 'scorers' | 'legends';
type CompTierFilter = 'ALL' | 'CONTINENTAL_WORLD' | 'NACIONAL' | 'COPA' | 'ESTADUAL';
type ScorerSortKey = 'GOALS' | 'ASSISTS' | 'CONTRIBUTIONS';

export const SeasonHistoryView: React.FC<SeasonHistoryViewProps> = ({
  gameState,
  userClub,
  onInspectClub,
  onInspectPlayer,
  onOpenUserSquad,
}) => {
  const [topMode, setTopMode] = useState<TopMode>('YEAR_BY_YEAR');
  const [yearSubTab, setYearSubTab] = useState<YearSubTab>('honors');
  const [allTimeSubTab, setAllTimeSubTab] = useState<AllTimeSubTab>('clubs');

  const { allSeasons, completedSeasons } = useMemo(
    () => getUnifiedSeasonHistoryRecords(gameState),
    [gameState]
  );

  // Default selected season: most recent completed season if available, else the user's live active season
  const defaultSeasonId = useMemo(() => {
    const userIsEu = userClub.division === 'EU';
    const matchingCompleted = completedSeasons.find((s) =>
      userIsEu ? s.continentScope === 'EU' : s.continentScope === 'SA_BR'
    );
    if (matchingCompleted) return matchingCompleted.id;
    if (completedSeasons[0]) return completedSeasons[0].id;
    return allSeasons[0]?.id || '';
  }, [allSeasons, completedSeasons, userClub.division]);

  const [selectedSeasonId, setSelectedSeasonId] = useState<string>('');
  const activeSeason: SeasonHistoryRecord | undefined = useMemo(() => {
    const targetId = selectedSeasonId || defaultSeasonId;
    return allSeasons.find((s) => s.id === targetId) || allSeasons[0];
  }, [allSeasons, selectedSeasonId, defaultSeasonId]);

  // Year-by-year filters
  const [continentFilter, setContinentFilter] = useState<'ALL' | 'SA_BR' | 'EU'>('ALL');
  const [compTierFilter, setCompTierFilter] = useState<CompTierFilter>('ALL');
  const [compSearch, setCompSearch] = useState('');
  const [totyVariant, setTotyVariant] = useState<'CONTINENTAL' | 'USER_LEAGUE'>('CONTINENTAL');
  const [yearScorerSort, setYearScorerSort] = useState<ScorerSortKey>('GOALS');
  const [yearScorerSearch, setYearScorerSearch] = useState('');

  // All-time filters
  const [includeLiveInAllTime, setIncludeLiveInAllTime] = useState<boolean>(true);
  const [allTimeCompFilter, setAllTimeCompFilter] = useState<string>('ALL');
  const [allTimeClubSearch, setAllTimeClubSearch] = useState('');
  const [allTimePlayerSort, setAllTimePlayerSort] = useState<ScorerSortKey>('GOALS');
  const [allTimePlayerSearch, setAllTimePlayerSearch] = useState('');

  const allTimeSummary = useMemo(
    () => computeAllTimeGeneralHistory(gameState, includeLiveInAllTime, allTimeCompFilter),
    [gameState, includeLiveInAllTime, allTimeCompFilter]
  );

  const activeClubIdsSet = useMemo(
    () => new Set(gameState.clubs.map((c) => c.id)),
    [gameState.clubs]
  );

  const activePlayerClubLookup = useMemo(() => {
    const map = new Map<string, string>();
    gameState.clubs.forEach((club) => {
      club.squad.forEach((p) => {
        map.set(p.id, club.id);
      });
    });
    return map;
  }, [gameState.clubs]);

  const handleClickClub = (clubId?: string) => {
    if (!clubId || !activeClubIdsSet.has(clubId)) return;
    soundEngine.playClick();
    if (clubId === userClub.id) {
      onOpenUserSquad();
    } else {
      onInspectClub(clubId);
    }
  };

  const handleClickPlayer = (playerId?: string, fallbackClubId?: string) => {
    if (!playerId) return;
    const currentClubId = activePlayerClubLookup.get(playerId);
    if (currentClubId) {
      soundEngine.playClick();
      if (currentClubId === userClub.id) {
        onOpenUserSquad();
      } else {
        onInspectPlayer(currentClubId, playerId);
      }
      return;
    }
    if (fallbackClubId && activeClubIdsSet.has(fallbackClubId)) {
      handleClickClub(fallbackClubId);
    }
  };

  const visibleSeasons = useMemo(() => {
    return allSeasons.filter((s) => {
      if (continentFilter === 'ALL') return true;
      return s.continentScope === continentFilter;
    });
  }, [allSeasons, continentFilter]);

  const filteredSeasonCompetitions = useMemo(() => {
    if (!activeSeason) return [];
    const q = compSearch.trim().toLowerCase();
    return activeSeason.competitions.filter((c) => {
      if (compTierFilter === 'CONTINENTAL_WORLD') {
        if (c.tier !== 'CONTINENTAL' && c.tier !== 'MUNDIAL') return false;
      } else if (compTierFilter !== 'ALL' && c.tier !== compTierFilter) {
        return false;
      }
      if (q) {
        const hay = `${c.competitionName} ${c.shortName} ${c.championClubName} ${c.runnerUpClubName} ${
          c.topScorer?.playerName || ''
        }`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [activeSeason, compTierFilter, compSearch]);

  const yearPlayersRanking = useMemo(() => {
    if (!activeSeason) return [];
    const mergedMap = new Map(
      activeSeason.topPerformersSnapshot.map((p) => [p.playerId, p])
    );
    activeSeason.topScorersOverall.forEach((p) => mergedMap.set(p.playerId, p));
    activeSeason.topAssistersOverall.forEach((p) => mergedMap.set(p.playerId, p));

    const q = yearScorerSearch.trim().toLowerCase();
    return Array.from(mergedMap.values())
      .filter((p) => {
        if (yearScorerSort === 'GOALS' && p.goals <= 0) return false;
        if (yearScorerSort === 'ASSISTS' && p.assists <= 0) return false;
        if (yearScorerSort === 'CONTRIBUTIONS' && p.goals + p.assists <= 0) return false;
        if (q) {
          const hay = `${p.playerName} ${p.clubName} ${p.clubShortName} ${p.detailedRole}`.toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (yearScorerSort === 'GOALS') {
          if (b.goals !== a.goals) return b.goals - a.goals;
          if (b.assists !== a.assists) return b.assists - a.assists;
          return a.matches - b.matches;
        }
        if (yearScorerSort === 'ASSISTS') {
          if (b.assists !== a.assists) return b.assists - a.assists;
          if (b.goals !== a.goals) return b.goals - a.goals;
          return a.matches - b.matches;
        }
        const ca = a.goals + a.assists;
        const cb = b.goals + b.assists;
        if (cb !== ca) return cb - ca;
        if (b.goals !== a.goals) return b.goals - a.goals;
        return a.matches - b.matches;
      })
      .slice(0, 40);
  }, [activeSeason, yearScorerSort, yearScorerSearch]);

  const filteredAllTimeClubs = useMemo(() => {
    const q = allTimeClubSearch.trim().toLowerCase();
    return allTimeSummary.clubTitleRankings.filter((c) => {
      if (!q) return true;
      return `${c.clubName} ${c.clubShortName}`.toLowerCase().includes(q);
    });
  }, [allTimeSummary.clubTitleRankings, allTimeClubSearch]);

  const filteredAllTimePlayers = useMemo(() => {
    const q = allTimePlayerSearch.trim().toLowerCase();
    const baseList =
      allTimePlayerSort === 'ASSISTS'
        ? allTimeSummary.allTimeAssisters
        : allTimeSummary.allTimeScorers;

    const combinedMap = new Map(allTimeSummary.allTimeScorers.map((p) => [p.playerId, p]));
    allTimeSummary.allTimeAssisters.forEach((p) => combinedMap.set(p.playerId, p));

    const source =
      allTimePlayerSort === 'CONTRIBUTIONS' ? Array.from(combinedMap.values()) : baseList;

    return [...source]
      .filter((p) => {
        if (!q) return true;
        const hay = `${p.playerName} ${p.latestClubName} ${p.clubsRepresented.join(' ')} ${p.detailedRole}`.toLowerCase();
        return hay.includes(q);
      })
      .sort((a, b) => {
        if (allTimePlayerSort === 'GOALS') {
          if (b.goals !== a.goals) return b.goals - a.goals;
          if (b.assists !== a.assists) return b.assists - a.assists;
          return a.matches - b.matches;
        }
        if (allTimePlayerSort === 'ASSISTS') {
          if (b.assists !== a.assists) return b.assists - a.assists;
          if (b.goals !== a.goals) return b.goals - a.goals;
          return a.matches - b.matches;
        }
        if (b.goalContributions !== a.goalContributions) {
          return b.goalContributions - a.goalContributions;
        }
        return b.goals - a.goals;
      })
      .slice(0, 50);
  }, [
    allTimeSummary.allTimeScorers,
    allTimeSummary.allTimeAssisters,
    allTimePlayerSort,
    allTimePlayerSearch,
  ]);

  const activeTotyLineup: SeasonTeamOfTheYearSlot[] = useMemo(() => {
    if (!activeSeason) return [];
    if (
      totyVariant === 'USER_LEAGUE' &&
      activeSeason.userLeagueTeamOfTheYear &&
      activeSeason.userLeagueTeamOfTheYear.length > 0
    ) {
      return activeSeason.userLeagueTeamOfTheYear;
    }
    return activeSeason.teamOfTheYear;
  }, [activeSeason, totyVariant]);

  const activeTotyTitle = useMemo(() => {
    if (!activeSeason) return 'Seleção da Temporada';
    if (
      totyVariant === 'USER_LEAGUE' &&
      activeSeason.userLeagueTeamOfTheYearTitle &&
      activeSeason.userLeagueTeamOfTheYear &&
      activeSeason.userLeagueTeamOfTheYear.length > 0
    ) {
      return activeSeason.userLeagueTeamOfTheYearTitle;
    }
    return activeSeason.teamOfTheYearTitle;
  }, [activeSeason, totyVariant]);

  const renderTacticalPitch = (
    lineup: SeasonTeamOfTheYearSlot[],
    pitchTitle: string,
    pitchSubLabel: string
  ) => {
    if (lineup.length === 0) {
      return (
        <div className="bg-[#090f1d] border border-slate-800 rounded-2xl p-8 text-center">
          <Users className="w-8 h-8 text-slate-600 mx-auto mb-2" />
          <p className="text-sm font-bold text-slate-300">
            Seleção dos 11 Ideais indisponível para este registro
          </p>
          <p className="text-xs text-slate-500 mt-1">
            Registros anteriores ao arquivo tático completo exibem os campeões e honrarias oficiais.
          </p>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
        {/* Visual 4-3-3 Pitch */}
        <div className="xl:col-span-6 bg-[#07111a] border border-slate-800 rounded-2xl overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-800 bg-[#090f1d] flex items-center justify-between gap-2">
            <div className="min-w-0">
              <div className="text-xs font-extrabold text-white truncate">{pitchTitle}</div>
              <div className="text-[11px] text-slate-400 truncate">{pitchSubLabel}</div>
            </div>
            <span className="text-[11px] font-mono font-bold text-emerald-400 tabular-nums shrink-0">
              4-3-3 OFICIAL
            </span>
          </div>

          <div
            className="relative w-full aspect-[4/5] max-h-[540px] mx-auto select-none overflow-hidden"
            style={{
              background:
                'repeating-linear-gradient(180deg, #0b2419 0px, #0b2419 38px, #0d2b1e 38px, #0d2b1e 76px)',
            }}
          >
            {/* Crisp SVG Pitch Lines */}
            <svg
              viewBox="0 0 100 125"
              className="absolute inset-0 w-full h-full pointer-events-none opacity-30"
              preserveAspectRatio="none"
            >
              <rect
                x="5"
                y="5"
                width="90"
                height="115"
                fill="none"
                stroke="#94a3b8"
                strokeWidth="0.6"
              />
              <line x1="5" y1="62.5" x2="95" y2="62.5" stroke="#94a3b8" strokeWidth="0.6" />
              <circle
                cx="50"
                cy="62.5"
                r="11"
                fill="none"
                stroke="#94a3b8"
                strokeWidth="0.6"
              />
              <rect
                x="24"
                y="5"
                width="52"
                height="17"
                fill="none"
                stroke="#94a3b8"
                strokeWidth="0.6"
              />
              <rect
                x="24"
                y="103"
                width="52"
                height="17"
                fill="none"
                stroke="#94a3b8"
                strokeWidth="0.6"
              />
            </svg>

            {lineup.map((slot) => {
              const isUserPlayer = slot.clubId === userClub.id;
              const shortLastName =
                slot.playerName.split(' ').length > 1
                  ? slot.playerName.split(' ').slice(-1)[0]
                  : slot.playerName;

              return (
                <button
                  key={slot.slotId}
                  type="button"
                  onClick={() => handleClickPlayer(slot.playerId, slot.clubId)}
                  style={{
                    left: `${slot.pitchX}%`,
                    top: `${slot.pitchY}%`,
                  }}
                  title={`${slot.playerName} (${slot.clubName}) · Nota ${slot.seasonRating.toFixed(
                    1
                  )} · ${slot.goals}G ${slot.assists}A`}
                  className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center group cursor-pointer focus:outline-none z-10"
                >
                  <div className="relative">
                    <div
                      className={`w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex flex-col items-center justify-center font-black text-[11px] shadow-lg transition-transform group-hover:scale-110 border ${
                        slot.isPlayerOfTheYear
                          ? 'border-amber-400 ring-2 ring-amber-400/35'
                          : isUserPlayer
                          ? 'border-sky-400 ring-2 ring-sky-400/30'
                          : 'border-white/25'
                      }`}
                      style={{
                        backgroundColor: slot.clubColors.primary,
                        color: slot.clubColors.text,
                      }}
                    >
                      <span className="leading-none text-[10px] opacity-85">{slot.slotLabel}</span>
                      <span className="leading-none font-mono tabular-nums text-xs mt-0.5">
                        {slot.overall}
                      </span>
                    </div>

                    {slot.isPlayerOfTheYear && (
                      <span className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center shadow">
                        <Crown className="w-3 h-3" />
                      </span>
                    )}
                  </div>

                  <div className="mt-1 px-1.5 py-0.5 rounded bg-slate-950/90 border border-slate-800 text-center max-w-[92px]">
                    <div
                      className={`text-[10px] font-bold truncate leading-tight ${
                        slot.isPlayerOfTheYear
                          ? 'text-amber-300'
                          : isUserPlayer
                          ? 'text-sky-300'
                          : 'text-white'
                      }`}
                    >
                      {shortLastName}
                    </div>
                    <div className="text-[9px] font-mono text-slate-400 tabular-nums leading-tight">
                      {slot.clubShortName.slice(0, 3).toUpperCase()} · {slot.seasonRating.toFixed(1)}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* 11 Ideais Statistical Table */}
        <div className="xl:col-span-6 bg-[#090f1d] border border-slate-800 rounded-2xl overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between gap-2">
            <div>
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-200">
                Ficha Oficial dos 11 Eleitos
              </h4>
              <p className="text-[11px] text-slate-400">
                Clique em qualquer atleta ou clube ativo para inspecionar o perfil completo
              </p>
            </div>
            <span className="text-[11px] font-mono text-slate-400 tabular-nums shrink-0">
              11 titulares
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-[#070c16]">
                  <th className="py-2.5 pl-4 pr-2">Pos</th>
                  <th className="py-2.5 px-2">Jogador</th>
                  <th className="py-2.5 px-2">Clube</th>
                  <th className="py-2.5 px-2 text-right">OVR</th>
                  <th className="py-2.5 px-2 text-right">J</th>
                  <th className="py-2.5 px-2 text-right">G</th>
                  <th className="py-2.5 px-2 text-right">A</th>
                  <th className="py-2.5 pl-2 pr-4 text-right">Nota</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70 text-xs">
                {lineup.map((slot) => {
                  const isMine = slot.clubId === userClub.id;
                  return (
                    <tr
                      key={slot.slotId}
                      onClick={() => handleClickPlayer(slot.playerId, slot.clubId)}
                      className={`transition-colors cursor-pointer ${
                        isMine ? 'bg-sky-950/20 hover:bg-sky-950/35' : 'hover:bg-slate-800/40'
                      }`}
                    >
                      <td className="py-2.5 pl-4 pr-2 font-mono font-bold text-[11px] text-slate-300 tabular-nums">
                        {slot.slotLabel}
                      </td>
                      <td className="py-2.5 px-2">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span
                            className={`font-bold truncate ${
                              slot.isPlayerOfTheYear
                                ? 'text-amber-300'
                                : isMine
                                ? 'text-sky-300'
                                : 'text-white'
                            }`}
                          >
                            {slot.playerName}
                          </span>
                          {slot.isPlayerOfTheYear && (
                            <Crown className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                          )}
                        </div>
                      </td>
                      <td className="py-2.5 px-2">
                        <div className="flex items-center gap-1.5">
                          <span
                            className="w-2.5 h-2.5 rounded-sm shrink-0 border border-white/20"
                            style={{ backgroundColor: slot.clubColors.primary }}
                          />
                          <span className="text-slate-300 truncate max-w-[110px]">
                            {slot.clubShortName}
                          </span>
                        </div>
                      </td>
                      <td className="py-2.5 px-2 text-right font-mono font-bold text-slate-200 tabular-nums">
                        {slot.overall}
                      </td>
                      <td className="py-2.5 px-2 text-right font-mono text-slate-400 tabular-nums">
                        {slot.matches}
                      </td>
                      <td className="py-2.5 px-2 text-right font-mono font-bold text-emerald-400 tabular-nums">
                        {slot.goals}
                      </td>
                      <td className="py-2.5 px-2 text-right font-mono font-bold text-sky-400 tabular-nums">
                        {slot.assists}
                      </td>
                      <td className="py-2.5 pl-2 pr-4 text-right font-mono font-bold text-amber-400 tabular-nums">
                        {slot.seasonRating.toFixed(1)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  const renderHonorIcon = (category: string) => {
    switch (category) {
      case 'BOLA_DE_OURO_MUNDIAL':
        return <Globe className="w-4 h-4 text-amber-400 shrink-0" />;
      case 'CRAQUE_DO_ANO':
        return <Crown className="w-4 h-4 text-amber-400 shrink-0" />;
      case 'ARTILHEIRO_GERAL':
        return <Target className="w-4 h-4 text-emerald-400 shrink-0" />;
      case 'GARCOM_DO_ANO':
        return <Sparkles className="w-4 h-4 text-sky-400 shrink-0" />;
      case 'MELHOR_GOLEIRO':
        return <Shield className="w-4 h-4 text-indigo-400 shrink-0" />;
      case 'REVELACAO_SUB21':
        return <Flame className="w-4 h-4 text-rose-400 shrink-0" />;
      default:
        return <Award className="w-4 h-4 text-amber-300 shrink-0" />;
    }
  };

  const renderCompetitionRow = (comp: SeasonCompetitionArchive) => {
    const isUserChamp = comp.isDecided && comp.championClubId === userClub.id;
    return (
      <tr
        key={comp.competitionId}
        className={`transition-colors ${
          isUserChamp ? 'bg-sky-950/20 hover:bg-sky-950/35' : 'hover:bg-slate-800/35'
        }`}
      >
        <td className="py-3 pl-4 pr-3">
          <div className="font-bold text-white text-xs">{comp.competitionName}</div>
          <div className="text-[11px] text-slate-400">
            {comp.region === 'BRASIL'
              ? 'Brasil'
              : comp.region === 'SUL_AMERICANA'
              ? 'América do Sul'
              : comp.region === 'EUROPA'
              ? 'Europa'
              : comp.region === 'NORTE_ASIA_AFRICA'
              ? 'Norte, Ásia & África'
              : 'Mundial'}{' '}
            ·{' '}
            {comp.isDecided ? (
              <span className="text-emerald-400 font-semibold">Campeão Definido</span>
            ) : (
              <span className="text-amber-400 font-semibold">Líder / Em Disputa</span>
            )}
          </div>
        </td>

        <td className="py-3 px-3">
          <button
            type="button"
            onClick={() => handleClickClub(comp.championClubId)}
            className="flex items-center gap-2 text-left group cursor-pointer"
          >
            {comp.championColors && (
              <span
                className="w-6 h-6 rounded-lg flex items-center justify-center font-black text-[10px] border border-white/15 shrink-0"
                style={{
                  backgroundColor: comp.championColors.primary,
                  color: comp.championColors.text,
                }}
              >
                {(comp.championClubShortName || comp.championClubName).slice(0, 3).toUpperCase()}
              </span>
            )}
            <div className="min-w-0">
              <div
                className={`text-xs font-extrabold truncate group-hover:underline ${
                  isUserChamp ? 'text-sky-300' : 'text-white'
                }`}
              >
                {comp.championClubName}
              </div>
              {comp.campaignSummary && (
                <div className="text-[11px] font-mono text-slate-400 tabular-nums">
                  {comp.campaignSummary}
                </div>
              )}
            </div>
          </button>
        </td>

        <td className="py-3 px-3">
          <button
            type="button"
            onClick={() => handleClickClub(comp.runnerUpClubId)}
            className="text-xs text-slate-300 hover:text-white cursor-pointer text-left"
          >
            {comp.runnerUpClubName}
          </button>
        </td>

        <td className="py-3 px-3">
          {comp.topScorer ? (
            <button
              type="button"
              onClick={() => handleClickPlayer(comp.topScorer?.playerId, comp.topScorer?.clubId)}
              className="text-left group cursor-pointer"
            >
              <div className="text-xs font-bold text-emerald-300 group-hover:underline">
                {comp.topScorer.playerName}
              </div>
              <div className="text-[11px] font-mono text-slate-400 tabular-nums">
                {comp.topScorer.goals} {comp.topScorer.goals === 1 ? 'gol' : 'gols'} ·{' '}
                {comp.topScorer.clubShortName}
              </div>
            </button>
          ) : (
            <span className="text-[11px] text-slate-500">—</span>
          )}
        </td>

        <td className="py-3 pl-3 pr-4">
          {comp.bestPlayer ? (
            <button
              type="button"
              onClick={() => handleClickPlayer(comp.bestPlayer?.playerId, comp.bestPlayer?.clubId)}
              className="text-left group cursor-pointer"
            >
              <div className="text-xs font-bold text-amber-300 group-hover:underline">
                {comp.bestPlayer.playerName}
              </div>
              <div className="text-[11px] font-mono text-slate-400 tabular-nums">
                {comp.bestPlayer.clubShortName} · {comp.bestPlayer.statHighlight}
              </div>
            </button>
          ) : (
            <span className="text-[11px] text-slate-500">—</span>
          )}
        </td>
      </tr>
    );
  };

  return (
    <div className="space-y-5">
      {/* Main Header & Primary Mode Switcher (Ano a Ano vs Histórico Geral) */}
      <div className="bg-[#090f1d] border border-slate-800 rounded-2xl p-4 sm:p-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-sky-400 flex items-center gap-1.5">
              <History className="w-3.5 h-3.5 shrink-0" />
              <span>Arquivo Oficial · Campeões, Artilheiros, Time do Ano & Recordes</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white mt-0.5">
              Almanaque Histórico & Recordes
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Consulte todos os campeões, artilheiros, garçons, Seleção da Temporada (11 Ideais) ano
              a ano e o ranking acumulado de todas as temporadas disputadas.
            </p>
          </div>

          <div className="flex items-center gap-2 bg-[#070c16] p-1 rounded-xl border border-slate-800 self-start lg:self-auto">
            <button
              type="button"
              onClick={() => {
                soundEngine.playClick();
                setTopMode('YEAR_BY_YEAR');
              }}
              className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                topMode === 'YEAR_BY_YEAR'
                  ? 'bg-sky-400 text-slate-950'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/70'
              }`}
            >
              <Calendar className="w-3.5 h-3.5 shrink-0" />
              <span>Histórico Ano a Ano</span>
            </button>

            <button
              type="button"
              onClick={() => {
                soundEngine.playClick();
                setTopMode('ALL_TIME');
              }}
              className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                topMode === 'ALL_TIME'
                  ? 'bg-amber-400 text-slate-950'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/70'
              }`}
            >
              <Trophy className="w-3.5 h-3.5 shrink-0" />
              <span>Histórico Geral (Todas as Temporadas)</span>
            </button>
          </div>
        </div>
      </div>

      {/* =========================================================================
          MODE 1: HISTÓRICO ANO A ANO (ALMANAQUE POR TEMPORADA)
         ========================================================================= */}
      {topMode === 'YEAR_BY_YEAR' && activeSeason && (
        <div className="space-y-5">
          {/* Season Picker Bar + Continent Filter */}
          <div className="bg-[#090f1d] border border-slate-800 rounded-2xl p-4 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Selecione a Temporada ·{' '}
                <span className="font-mono text-slate-400 tabular-nums">
                  {completedSeasons.length}{' '}
                  {completedSeasons.length === 1 ? 'temporada encerrada' : 'temporadas encerradas'}{' '}
                  + parciais ao vivo
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                {(
                  [
                    { id: 'ALL', label: 'Todos os Ciclos' },
                    { id: 'SA_BR', label: 'Américas, Brasil, Ásia & África' },
                    { id: 'EU', label: 'Europa (UEFA)' },
                  ] as const
                ).map((cf) => (
                  <button
                    key={cf.id}
                    type="button"
                    onClick={() => {
                      soundEngine.playClick();
                      setContinentFilter(cf.id);
                      const nextList = allSeasons.filter((s) =>
                        cf.id === 'ALL' ? true : s.continentScope === cf.id
                      );
                      if (nextList.length > 0 && !nextList.some((s) => s.id === activeSeason.id)) {
                        setSelectedSeasonId(nextList[0].id);
                      }
                    }}
                    className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      continentFilter === cf.id
                        ? 'bg-slate-800 text-sky-300 border border-sky-500/40'
                        : 'text-slate-400 hover:text-slate-200 border border-transparent'
                    }`}
                  >
                    {cf.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {visibleSeasons.map((season) => {
                const isSelected = season.id === activeSeason.id;
                const scopeTag =
                  season.continentScope === 'EU' ? 'Europa' : 'Américas/BR/Ásia/África';
                return (
                  <button
                    key={season.id}
                    type="button"
                    onClick={() => {
                      soundEngine.playClick();
                      setSelectedSeasonId(season.id);
                    }}
                    className={`px-3.5 py-2 rounded-xl border text-left transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      isSelected
                        ? 'bg-sky-500/15 border-sky-400 text-white'
                        : 'bg-[#070c16] border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <div className="text-xs font-black font-mono tabular-nums flex items-center gap-1.5">
                      <span>Temporada {season.seasonLabel}</span>
                      {season.isLivePreview && (
                        <span className="text-[10px] font-sans font-bold text-amber-400">
                          · Ao Vivo
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-slate-400">
                      {scopeTag} ·{' '}
                      {season.isLivePreview ? 'Parcial em andamento' : 'Arquivo oficial'}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Year Sub-Navigation */}
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
              {(
                [
                  { id: 'honors', label: 'Resumo & Premiações', icon: Award },
                  {
                    id: 'champions',
                    label: `Campeões & Vices (${activeSeason.competitions.length})`,
                    icon: Trophy,
                  },
                  { id: 'toty', label: 'Time do Ano (11 Ideais)', icon: Users },
                  { id: 'scorers', label: 'Artilheiros & Garçons', icon: Target },
                ] as const
              ).map((tab) => {
                const Icon = tab.icon;
                const active = yearSubTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => {
                      soundEngine.playClick();
                      setYearSubTab(tab.id);
                    }}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      active
                        ? 'bg-slate-800 text-white border-sky-400/50'
                        : 'bg-[#090f1d] text-slate-400 border-slate-800 hover:text-slate-200'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5 shrink-0" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            <div className="text-xs text-slate-400 font-mono tabular-nums">
              {activeSeason.continentScope === 'EU'
                ? 'Ciclo Europeu'
                : 'Ciclo Américas, Brasil, Ásia & África'}{' '}
              · {activeSeason.seasonLabel}
              {activeSeason.isLivePreview ? ' · Dados parciais da temporada ativa' : ' · Encerrada'}
            </div>
          </div>

          {/* SUB-TAB 1: RESUMO & GRANDES HONRARIAS DO ANO */}
          {yearSubTab === 'honors' && (
            <div className="space-y-5">
              {/* KPI Summary Strip */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="bg-[#090f1d] border border-slate-800 rounded-xl p-4">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                    Competições Registradas
                  </span>
                  <div className="text-xl font-black font-mono text-white tabular-nums mt-1">
                    {activeSeason.competitions.filter((c) => c.isDecided).length}
                    <span className="text-sm font-normal text-slate-500">
                      /{activeSeason.competitions.length}
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400">Torneios com campeão definido</span>
                </div>

                <div className="bg-[#090f1d] border border-slate-800 rounded-xl p-4">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                    Títulos do {userClub.shortName}
                  </span>
                  <div className="text-xl font-black font-mono text-sky-400 tabular-nums mt-1">
                    {
                      activeSeason.competitions.filter(
                        (c) => c.isDecided && (c.userWon || c.championClubId === userClub.id)
                      ).length
                    }
                  </div>
                  <span className="text-[11px] text-slate-400">
                    Conquistas nesta edição ({activeSeason.seasonLabel})
                  </span>
                </div>

                <div className="bg-[#090f1d] border border-slate-800 rounded-xl p-4">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                    Artilheiro Geral do Ano
                  </span>
                  <div className="text-sm font-extrabold text-emerald-400 truncate mt-1">
                    {activeSeason.topScorersOverall[0]?.playerName || 'Sem gols registrados'}
                  </div>
                  <span className="text-[11px] font-mono text-slate-400 tabular-nums">
                    {activeSeason.topScorersOverall[0]
                      ? `${activeSeason.topScorersOverall[0].goals} gols · ${activeSeason.topScorersOverall[0].clubShortName}`
                      : 'Aguardando jogos'}
                  </span>
                </div>

                <div className="bg-[#090f1d] border border-slate-800 rounded-xl p-4">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                    Garçom Geral do Ano
                  </span>
                  <div className="text-sm font-extrabold text-amber-400 truncate mt-1">
                    {activeSeason.topAssistersOverall[0]?.playerName || 'Sem assistências'}
                  </div>
                  <span className="text-[11px] font-mono text-slate-400 tabular-nums">
                    {activeSeason.topAssistersOverall[0]
                      ? `${activeSeason.topAssistersOverall[0].assists} assist. · ${activeSeason.topAssistersOverall[0].clubShortName}`
                      : 'Aguardando jogos'}
                  </span>
                </div>
              </div>

              {/* 6 Major Season Honors Grid */}
              <div className="bg-[#090f1d] border border-slate-800 rounded-2xl p-4 sm:p-5">
                <div className="flex items-center justify-between gap-2 pb-3 mb-4 border-b border-slate-800">
                  <div>
                    <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
                      <Crown className="w-4 h-4 text-amber-400 shrink-0" />
                      <span>Premiação Oficial da Temporada {activeSeason.seasonLabel}</span>
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Vencedores individuais e comando técnico consagrados no ciclo
                    </p>
                  </div>
                </div>

                {activeSeason.majorHonors.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5">
                    {activeSeason.majorHonors.map((honor) => {
                      const isMine = honor.userWon || honor.clubId === userClub.id;
                      return (
                        <div
                          key={honor.category}
                          onClick={() =>
                            honor.category === 'TREINADOR_DO_ANO'
                              ? handleClickClub(honor.clubId)
                              : handleClickPlayer(honor.winnerId, honor.clubId)
                          }
                          className={`p-4 rounded-xl border transition-colors cursor-pointer ${
                            isMine
                              ? 'bg-sky-950/20 border-sky-500/40 hover:bg-sky-950/30'
                              : 'bg-[#070c16] border-slate-800 hover:border-slate-700'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                              {renderHonorIcon(honor.category)}
                              <span>{honor.title}</span>
                            </span>
                            {honor.overall && (
                              <span className="text-[11px] font-mono font-bold text-slate-300 tabular-nums">
                                OVR {honor.overall}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-3 mt-3">
                            <div
                              className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs border border-white/15 shrink-0"
                              style={{
                                backgroundColor: honor.clubColors.primary,
                                color: honor.clubColors.text,
                              }}
                            >
                              {honor.clubShortName.slice(0, 3).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <div
                                className={`text-sm font-black truncate ${
                                  isMine ? 'text-sky-300' : 'text-white'
                                }`}
                              >
                                {honor.winnerName}
                              </div>
                              <div className="text-[11px] text-slate-400 truncate tabular-nums">
                                {honor.winnerRole} · {honor.clubName}
                              </div>
                            </div>
                          </div>

                          <div className="mt-3 pt-2.5 border-t border-slate-800/80 text-[11px] font-mono text-slate-300 tabular-nums">
                            {honor.statLine}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 py-4">
                    Nenhuma honraria individual registrada para esta temporada.
                  </p>
                )}
              </div>

              {/* Principal Champions Preview Table */}
              <div className="bg-[#090f1d] border border-slate-800 rounded-2xl overflow-hidden">
                <div className="px-4 py-3.5 border-b border-slate-800 flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-extrabold text-white">
                      Principais Campeões da Temporada {activeSeason.seasonLabel}
                    </h3>
                    <p className="text-xs text-slate-400">
                      Torneios mundiais, continentais, ligas nacionais e copas principais
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      soundEngine.playClick();
                      setYearSubTab('champions');
                    }}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-bold text-sky-300 whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    Ver Todas ({activeSeason.competitions.length})
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-800 text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-[#070c16]">
                        <th className="py-2.5 pl-4 pr-3">Competição</th>
                        <th className="py-2.5 px-3">Campeão / Líder</th>
                        <th className="py-2.5 px-3">Vice-Campeão</th>
                        <th className="py-2.5 px-3">Artilheiro</th>
                        <th className="py-2.5 pl-3 pr-4">Destaque</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/70">
                      {activeSeason.competitions
                        .filter((c) => c.tier !== 'ESTADUAL')
                        .slice(0, 12)
                        .map((comp) => renderCompetitionRow(comp))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* SUB-TAB 2: QUADRO COMPLETO DE CAMPEÕES & VICES */}
          {yearSubTab === 'champions' && (
            <div className="bg-[#090f1d] border border-slate-800 rounded-2xl overflow-hidden">
              <div className="p-4 border-b border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0">
                  {(
                    [
                      { id: 'ALL', label: 'Todas' },
                      { id: 'CONTINENTAL_WORLD', label: 'Continentais & Mundial' },
                      { id: 'NACIONAL', label: 'Ligas Nacionais' },
                      { id: 'COPA', label: 'Copas & Supercopas' },
                      { id: 'ESTADUAL', label: 'Estaduais' },
                    ] as const
                  ).map((tf) => (
                    <button
                      key={tf.id}
                      type="button"
                      onClick={() => {
                        soundEngine.playClick();
                        setCompTierFilter(tf.id);
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                        compTierFilter === tf.id
                          ? 'bg-sky-400 text-slate-950'
                          : 'bg-[#070c16] text-slate-300 border border-slate-800 hover:text-white'
                      }`}
                    >
                      {tf.label}
                    </button>
                  ))}
                </div>

                <div className="relative w-full lg:w-72">
                  <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={compSearch}
                    onChange={(e) => setCompSearch(e.target.value)}
                    placeholder="Filtrar competição, campeão ou artilheiro..."
                    className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-[#070c16] border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-[#070c16]">
                      <th className="py-2.5 pl-4 pr-3">Competição</th>
                      <th className="py-2.5 px-3">Campeão / Líder</th>
                      <th className="py-2.5 px-3">Vice-Campeão</th>
                      <th className="py-2.5 px-3">Artilheiro do Torneio</th>
                      <th className="py-2.5 pl-3 pr-4">Craque / Destaque</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/70">
                    {filteredSeasonCompetitions.length > 0 ? (
                      filteredSeasonCompetitions.map((comp) => renderCompetitionRow(comp))
                    ) : (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-xs text-slate-400">
                          Nenhuma competição encontrada para o filtro selecionado nesta temporada.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* SUB-TAB 3: TIME DO ANO (SELEÇÃO DOS 11 IDEAIS) */}
          {yearSubTab === 'toty' && (
            <div className="space-y-4">
              {activeSeason.userLeagueTeamOfTheYear &&
                activeSeason.userLeagueTeamOfTheYear.length > 0 && (
                  <div className="flex items-center gap-2 bg-[#090f1d] border border-slate-800 rounded-xl p-2 w-fit">
                    <button
                      type="button"
                      onClick={() => {
                        soundEngine.playClick();
                        setTotyVariant('CONTINENTAL');
                      }}
                      className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                        totyVariant === 'CONTINENTAL'
                          ? 'bg-sky-400 text-slate-950'
                          : 'text-slate-300 hover:text-white'
                      }`}
                    >
                      Seleção Geral / Continental
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        soundEngine.playClick();
                        setTotyVariant('USER_LEAGUE');
                      }}
                      className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                        totyVariant === 'USER_LEAGUE'
                          ? 'bg-amber-400 text-slate-950'
                          : 'text-slate-300 hover:text-white'
                      }`}
                    >
                      Seleção da Liga Disputada
                    </button>
                  </div>
                )}

              {renderTacticalPitch(
                activeTotyLineup,
                activeTotyTitle,
                activeSeason.isLivePreview
                  ? 'Seleção parcial baseada no desempenho acumulado até a rodada atual'
                  : 'Escalação oficial eleita ao término da temporada'
              )}
            </div>
          )}

          {/* SUB-TAB 4: ARTILHEIROS & GARÇONS DO ANO */}
          {yearSubTab === 'scorers' && (
            <div className="bg-[#090f1d] border border-slate-800 rounded-2xl overflow-hidden">
              <div className="p-4 border-b border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0">
                  {(
                    [
                      { id: 'GOALS', label: 'Artilheiros (Gols)' },
                      { id: 'ASSISTS', label: 'Garçons (Assistências)' },
                      { id: 'CONTRIBUTIONS', label: 'Participações Diretas (G+A)' },
                    ] as const
                  ).map((sk) => (
                    <button
                      key={sk.id}
                      type="button"
                      onClick={() => {
                        soundEngine.playClick();
                        setYearScorerSort(sk.id);
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                        yearScorerSort === sk.id
                          ? 'bg-emerald-400 text-slate-950'
                          : 'bg-[#070c16] text-slate-300 border border-slate-800 hover:text-white'
                      }`}
                    >
                      {sk.label}
                    </button>
                  ))}
                </div>

                <div className="relative w-full lg:w-72">
                  <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={yearScorerSearch}
                    onChange={(e) => setYearScorerSearch(e.target.value)}
                    placeholder="Buscar jogador ou clube..."
                    className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-[#070c16] border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-[#070c16]">
                      <th className="py-2.5 pl-4 pr-2 w-10">#</th>
                      <th className="py-2.5 px-3">Jogador</th>
                      <th className="py-2.5 px-3">Clube</th>
                      <th className="py-2.5 px-2 text-right">OVR</th>
                      <th className="py-2.5 px-2 text-right">Jogos</th>
                      <th className="py-2.5 px-2 text-right">Gols</th>
                      <th className="py-2.5 px-2 text-right">Assist.</th>
                      <th className="py-2.5 px-2 text-right">G+A</th>
                      <th className="py-2.5 pl-2 pr-4 text-right">Média G/J</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/70 text-xs">
                    {yearPlayersRanking.length > 0 ? (
                      yearPlayersRanking.map((p, idx) => {
                        const isMine = p.clubId === userClub.id;
                        const gpm = p.matches > 0 ? (p.goals / p.matches).toFixed(2) : '0.00';
                        return (
                          <tr
                            key={p.playerId}
                            onClick={() => handleClickPlayer(p.playerId, p.clubId)}
                            className={`transition-colors cursor-pointer ${
                              isMine
                                ? 'bg-sky-950/20 hover:bg-sky-950/35'
                                : 'hover:bg-slate-800/35'
                            }`}
                          >
                            <td className="py-2.5 pl-4 pr-2 font-mono font-bold text-slate-400 tabular-nums">
                              {idx + 1}º
                            </td>
                            <td className="py-2.5 px-3">
                              <div
                                className={`font-bold ${isMine ? 'text-sky-300' : 'text-white'}`}
                              >
                                {p.playerName}
                              </div>
                              <div className="text-[11px] text-slate-400 tabular-nums">
                                {p.detailedRole} · {p.age} anos
                              </div>
                            </td>
                            <td className="py-2.5 px-3">
                              <div className="flex items-center gap-2">
                                <span
                                  className="w-3 h-3 rounded-sm border border-white/20 shrink-0"
                                  style={{ backgroundColor: p.clubColors.primary }}
                                />
                                <span className="text-slate-200">{p.clubName}</span>
                              </div>
                            </td>
                            <td className="py-2.5 px-2 text-right font-mono font-bold text-slate-300 tabular-nums">
                              {p.overall}
                            </td>
                            <td className="py-2.5 px-2 text-right font-mono text-slate-400 tabular-nums">
                              {p.matches}
                            </td>
                            <td className="py-2.5 px-2 text-right font-mono font-black text-emerald-400 tabular-nums">
                              {p.goals}
                            </td>
                            <td className="py-2.5 px-2 text-right font-mono font-bold text-sky-400 tabular-nums">
                              {p.assists}
                            </td>
                            <td className="py-2.5 px-2 text-right font-mono font-bold text-amber-300 tabular-nums">
                              {p.goals + p.assists}
                            </td>
                            <td className="py-2.5 pl-2 pr-4 text-right font-mono text-slate-300 tabular-nums">
                              {gpm.replace('.', ',')}
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={9} className="py-8 text-center text-xs text-slate-400">
                          Ainda não há gols ou assistências computados para este filtro na temporada.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          MODE 2: HISTÓRICO GERAL DE TODAS AS TEMPORADAS JOGADAS
         ========================================================================= */}
      {topMode === 'ALL_TIME' && (
        <div className="space-y-5">
          {/* All-Time Control & KPI Bar */}
          <div className="bg-[#090f1d] border border-slate-800 rounded-2xl p-4 space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
                  <Globe className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>Ranking Acumulado de Todas as Temporadas Jogadas</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Soma perpétua de títulos, vices, gols, assistências e seleções do ano em toda a
                  história do save.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  soundEngine.playClick();
                  setIncludeLiveInAllTime((prev) => !prev);
                }}
                className={`px-3.5 py-2 rounded-xl border text-xs font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer self-start lg:self-auto ${
                  includeLiveInAllTime
                    ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                    : 'bg-[#070c16] border-slate-800 text-slate-300 hover:border-slate-700'
                }`}
              >
                {includeLiveInAllTime
                  ? 'Incluindo Temporada Atual (Ao Vivo)'
                  : 'Apenas Temporadas Encerradas'}
              </button>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 pt-2 border-t border-slate-800">
              <div className="bg-[#070c16] border border-slate-800 rounded-xl p-3.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                  Ciclos Computados
                </span>
                <strong className="text-lg font-black font-mono text-white tabular-nums mt-0.5 block">
                  {allTimeSummary.seasonsEvaluatedCount}
                </strong>
                <span className="text-[11px] text-slate-500 tabular-nums">
                  {allTimeSummary.completedSeasonsCount} encerrados no arquivo
                </span>
              </div>

              <div className="bg-[#070c16] border border-slate-800 rounded-xl p-3.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                  Títulos Oficiais Decididos
                </span>
                <strong className="text-lg font-black font-mono text-amber-400 tabular-nums mt-0.5 block">
                  {allTimeSummary.totalTitlesDecided}
                </strong>
                <span className="text-[11px] text-slate-500">Troféus entregues no save</span>
              </div>

              <div className="bg-[#070c16] border border-slate-800 rounded-xl p-3.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                  Maior Campeão Geral
                </span>
                <strong className="text-sm font-extrabold text-white truncate mt-1 block">
                  {allTimeSummary.clubTitleRankings[0]?.clubName || 'Nenhum campeão ainda'}
                </strong>
                <span className="text-[11px] font-mono text-slate-400 tabular-nums">
                  {allTimeSummary.clubTitleRankings[0]
                    ? `${allTimeSummary.clubTitleRankings[0].totalTitles} títulos acumulados`
                    : 'Dispute finais para inaugurar'}
                </span>
              </div>

              <div className="bg-[#070c16] border border-slate-800 rounded-xl p-3.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                  Maior Artilheiro da História
                </span>
                <strong className="text-sm font-extrabold text-emerald-400 truncate mt-1 block">
                  {allTimeSummary.allTimeScorers[0]?.playerName || 'Sem gols registrados'}
                </strong>
                <span className="text-[11px] font-mono text-slate-400 tabular-nums">
                  {allTimeSummary.allTimeScorers[0]
                    ? `${allTimeSummary.allTimeScorers[0].goals} gols em ${allTimeSummary.allTimeScorers[0].matches} jogos`
                    : 'Jogue partidas para registrar'}
                </span>
              </div>
            </div>
          </div>

          {/* All-Time Sub-Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {(
              [
                { id: 'clubs', label: 'Maiores Campeões (Títulos por Clube)', icon: Trophy },
                { id: 'scorers', label: 'Maiores Artilheiros & Garçons Gerais', icon: BarChart3 },
                {
                  id: 'legends',
                  label: 'Hall da Fama, Recordes & Seleção de Todos os Tempos',
                  icon: Star,
                },
              ] as const
            ).map((tab) => {
              const Icon = tab.icon;
              const active = allTimeSubTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    soundEngine.playClick();
                    setAllTimeSubTab(tab.id);
                  }}
                  className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    active
                      ? 'bg-slate-800 text-amber-300 border-amber-400/50'
                      : 'bg-[#090f1d] text-slate-400 border-slate-800 hover:text-slate-200'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 shrink-0" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* ALL-TIME SUB-TAB 1: MAIORES CAMPEÕES */}
          {allTimeSubTab === 'clubs' && (
            <div className="bg-[#090f1d] border border-slate-800 rounded-2xl overflow-hidden">
              <div className="p-4 border-b border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2.5">
                  <label className="text-xs font-bold text-slate-300 whitespace-nowrap">
                    Competição:
                  </label>
                  <select
                    value={allTimeCompFilter}
                    onChange={(e) => setAllTimeCompFilter(e.target.value)}
                    className="px-3 py-1.5 rounded-lg bg-[#070c16] border border-slate-800 text-xs text-white focus:outline-none focus:border-amber-400"
                  >
                    <option value="ALL">Todas as Competições Oficiais</option>
                    {allTimeSummary.availableCompetitionsForFilter.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="relative w-full lg:w-72">
                  <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={allTimeClubSearch}
                    onChange={(e) => setAllTimeClubSearch(e.target.value)}
                    placeholder="Buscar clube no ranking histórico..."
                    className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-[#070c16] border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-[#070c16]">
                      <th className="py-2.5 pl-4 pr-2 w-10">#</th>
                      <th className="py-2.5 px-3">Clube</th>
                      <th className="py-2.5 px-2 text-right">Títulos</th>
                      <th className="py-2.5 px-2 text-right">Vices</th>
                      <th className="py-2.5 px-2 text-right">Mundial</th>
                      <th className="py-2.5 px-2 text-right">Cont.</th>
                      <th className="py-2.5 px-2 text-right">Ligas</th>
                      <th className="py-2.5 px-2 text-right">Copas</th>
                      <th className="py-2.5 px-2 text-right">Est.</th>
                      <th className="py-2.5 pl-3 pr-4">Temporadas Campeãs</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/70 text-xs">
                    {filteredAllTimeClubs.length > 0 ? (
                      filteredAllTimeClubs.map((entry, idx) => (
                        <tr
                          key={entry.clubKey}
                          onClick={() => handleClickClub(entry.clubId)}
                          className={`transition-colors cursor-pointer ${
                            entry.isUserClub
                              ? 'bg-sky-950/20 hover:bg-sky-950/35'
                              : 'hover:bg-slate-800/35'
                          }`}
                        >
                          <td className="py-3 pl-4 pr-2 font-mono font-bold text-slate-400 tabular-nums">
                            {idx + 1}º
                          </td>
                          <td className="py-3 px-3">
                            <div className="flex items-center gap-2.5">
                              <span
                                className="w-6 h-6 rounded-lg flex items-center justify-center font-black text-[10px] border border-white/15 shrink-0"
                                style={{
                                  backgroundColor: entry.clubColors.primary,
                                  color: entry.clubColors.text,
                                }}
                              >
                                {entry.clubShortName.slice(0, 3).toUpperCase()}
                              </span>
                              <span
                                className={`font-extrabold ${
                                  entry.isUserClub ? 'text-sky-300' : 'text-white'
                                }`}
                              >
                                {entry.clubName}
                              </span>
                            </div>
                          </td>
                          <td className="py-3 px-2 text-right font-mono font-black text-amber-400 text-sm tabular-nums">
                            {entry.totalTitles}
                          </td>
                          <td className="py-3 px-2 text-right font-mono text-slate-300 tabular-nums">
                            {entry.runnerUps}
                          </td>
                          <td className="py-3 px-2 text-right font-mono text-slate-300 tabular-nums">
                            {entry.worldTitles}
                          </td>
                          <td className="py-3 px-2 text-right font-mono text-slate-300 tabular-nums">
                            {entry.continentalTitles}
                          </td>
                          <td className="py-3 px-2 text-right font-mono text-slate-300 tabular-nums">
                            {entry.nationalLeagueTitles}
                          </td>
                          <td className="py-3 px-2 text-right font-mono text-slate-300 tabular-nums">
                            {entry.cupTitles}
                          </td>
                          <td className="py-3 px-2 text-right font-mono text-slate-400 tabular-nums">
                            {entry.stateTitles}
                          </td>
                          <td className="py-3 pl-3 pr-4 font-mono text-[11px] text-slate-400 tabular-nums">
                            {entry.seasonsWonLabels.length > 0
                              ? entry.seasonsWonLabels.join(' · ')
                              : '—'}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={10} className="py-8 text-center text-xs text-slate-400">
                          Nenhum título oficial computado ainda para este filtro. Dispute e conclua
                          campeonatos para popular o ranking geral de campeões!
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ALL-TIME SUB-TAB 2: MAIORES ARTILHEIROS & GARÇONS DA HISTÓRIA */}
          {allTimeSubTab === 'scorers' && (
            <div className="bg-[#090f1d] border border-slate-800 rounded-2xl overflow-hidden">
              <div className="p-4 border-b border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0">
                  {(
                    [
                      { id: 'GOALS', label: 'Maiores Artilheiros (Gols)' },
                      { id: 'ASSISTS', label: 'Maiores Garçons (Assistências)' },
                      { id: 'CONTRIBUTIONS', label: 'Mais Participações (G+A)' },
                    ] as const
                  ).map((sk) => (
                    <button
                      key={sk.id}
                      type="button"
                      onClick={() => {
                        soundEngine.playClick();
                        setAllTimePlayerSort(sk.id);
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                        allTimePlayerSort === sk.id
                          ? 'bg-emerald-400 text-slate-950'
                          : 'bg-[#070c16] text-slate-300 border border-slate-800 hover:text-white'
                      }`}
                    >
                      {sk.label}
                    </button>
                  ))}
                </div>

                <div className="relative w-full lg:w-72">
                  <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={allTimePlayerSearch}
                    onChange={(e) => setAllTimePlayerSearch(e.target.value)}
                    placeholder="Buscar atleta ou clube na história..."
                    className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-[#070c16] border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-400"
                  />
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-[#070c16]">
                      <th className="py-2.5 pl-4 pr-2 w-10">#</th>
                      <th className="py-2.5 px-3">Jogador</th>
                      <th className="py-2.5 px-3">Clube Atual / Passagens</th>
                      <th className="py-2.5 px-2 text-right">Temp.</th>
                      <th className="py-2.5 px-2 text-right">Jogos</th>
                      <th className="py-2.5 px-2 text-right">Gols</th>
                      <th className="py-2.5 px-2 text-right">Assist.</th>
                      <th className="py-2.5 px-2 text-right">G+A</th>
                      <th className="py-2.5 px-2 text-right">Média G/J</th>
                      <th className="py-2.5 pl-2 pr-4 text-right">Artilharias</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/70 text-xs">
                    {filteredAllTimePlayers.length > 0 ? (
                      filteredAllTimePlayers.map((p, idx) => (
                        <tr
                          key={p.playerId}
                          onClick={() => handleClickPlayer(p.playerId, p.latestClubId)}
                          className={`transition-colors cursor-pointer ${
                            p.isUserClubPlayer
                              ? 'bg-sky-950/20 hover:bg-sky-950/35'
                              : 'hover:bg-slate-800/35'
                          }`}
                        >
                          <td className="py-2.5 pl-4 pr-2 font-mono font-bold text-slate-400 tabular-nums">
                            {idx + 1}º
                          </td>
                          <td className="py-2.5 px-3">
                            <div
                              className={`font-bold ${
                                p.isUserClubPlayer ? 'text-sky-300' : 'text-white'
                              }`}
                            >
                              {p.playerName}
                            </div>
                            <div className="text-[11px] text-slate-400 tabular-nums">
                              {p.detailedRole} · Auge OVR {p.peakOverall} ·{' '}
                              {p.isActiveInSquads ? 'Em atividade' : 'Histórico / Aposentado'}
                            </div>
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="flex items-center gap-2">
                              <span
                                className="w-3 h-3 rounded-sm border border-white/20 shrink-0"
                                style={{ backgroundColor: p.latestClubColors.primary }}
                              />
                              <span className="text-slate-200 font-semibold">
                                {p.latestClubShortName}
                              </span>
                            </div>
                            {p.clubsRepresented.length > 1 && (
                              <div className="text-[10px] text-slate-400 truncate max-w-[180px]">
                                Clubes: {p.clubsRepresented.join(' · ')}
                              </div>
                            )}
                          </td>
                          <td className="py-2.5 px-2 text-right font-mono text-slate-300 tabular-nums">
                            {Math.max(1, p.seasonsRecorded)}
                          </td>
                          <td className="py-2.5 px-2 text-right font-mono text-slate-400 tabular-nums">
                            {p.matches}
                          </td>
                          <td className="py-2.5 px-2 text-right font-mono font-black text-emerald-400 text-sm tabular-nums">
                            {p.goals}
                          </td>
                          <td className="py-2.5 px-2 text-right font-mono font-bold text-sky-400 tabular-nums">
                            {p.assists}
                          </td>
                          <td className="py-2.5 px-2 text-right font-mono font-bold text-amber-300 tabular-nums">
                            {p.goalContributions}
                          </td>
                          <td className="py-2.5 px-2 text-right font-mono text-slate-300 tabular-nums">
                            {p.goalsPerMatch.toFixed(2).replace('.', ',')}
                          </td>
                          <td className="py-2.5 pl-2 pr-4 text-right font-mono font-bold text-amber-400 tabular-nums">
                            {p.goldenBootsCount}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={10} className="py-8 text-center text-xs text-slate-400">
                          Nenhum jogador com estatísticas acumuladas para este filtro ainda.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ALL-TIME SUB-TAB 3: HALL DA FAMA, RECORDES & SELEÇÃO DE TODOS OS TEMPOS */}
          {allTimeSubTab === 'legends' && (
            <div className="space-y-5">
              {/* Single-Season All-Time Records */}
              {allTimeSummary.singleSeasonRecords.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3.5">
                  {allTimeSummary.singleSeasonRecords.map((rec) => (
                    <div
                      key={rec.recordType}
                      onClick={() =>
                        rec.playerId
                          ? handleClickPlayer(rec.playerId, rec.clubId)
                          : handleClickClub(rec.clubId)
                      }
                      className="bg-[#090f1d] border border-slate-800 hover:border-slate-700 rounded-xl p-4 cursor-pointer transition-colors"
                    >
                      <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 block">
                        Recorde Histórico · Temp. {rec.seasonLabel}
                      </span>
                      <div className="text-xs font-semibold text-slate-300 mt-0.5">{rec.label}</div>
                      <div className="flex items-baseline justify-between gap-2 mt-3">
                        <div className="min-w-0">
                          <div className="text-sm font-black text-white truncate">
                            {rec.holderName}
                          </div>
                          <div className="text-[11px] text-slate-400 truncate">
                            {rec.holderSubLabel}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="text-xl font-black font-mono text-emerald-400 tabular-nums">
                            {rec.value}
                          </span>
                          <span className="text-[10px] text-slate-400 block">{rec.unitLabel}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* All-Time Best XI (4-3-3) */}
              {renderTacticalPitch(
                allTimeSummary.allTimeTeamOfTheYear,
                'Seleção Histórica de Todos os Tempos',
                'Os 11 maiores nomes consagrados na soma de todas as temporadas disputadas no save'
              )}

              {/* Hall of Fame Table: Most Laureated Players */}
              <div className="bg-[#090f1d] border border-slate-800 rounded-2xl overflow-hidden">
                <div className="px-4 py-3.5 border-b border-slate-800 flex items-center justify-between gap-2">
                  <div>
                    <h4 className="text-sm font-extrabold text-white flex items-center gap-2">
                      <Medal className="w-4 h-4 text-amber-400 shrink-0" />
                      <span>Hall da Fama · Jogadores Mais Premiados da História</span>
                    </h4>
                    <p className="text-xs text-slate-400">
                      Soma de troféus de Craque do Ano, presenças no Time do Ano, Artilharias e
                      estatísticas gerais
                    </p>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-800 text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-[#070c16]">
                        <th className="py-2.5 pl-4 pr-2 w-10">#</th>
                        <th className="py-2.5 px-3">Atleta</th>
                        <th className="py-2.5 px-3">Clubes</th>
                        <th className="py-2.5 px-2 text-right">Craque do Ano</th>
                        <th className="py-2.5 px-2 text-right">Time do Ano</th>
                        <th className="py-2.5 px-2 text-right">Artilharias</th>
                        <th className="py-2.5 px-2 text-right">Garçom / Luva</th>
                        <th className="py-2.5 px-2 text-right">Gols</th>
                        <th className="py-2.5 pl-2 pr-4 text-right">Assist.</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/70 text-xs">
                      {allTimeSummary.hallOfFamePlayers.length > 0 ? (
                        allTimeSummary.hallOfFamePlayers.map((p, idx) => (
                          <tr
                            key={p.playerId}
                            onClick={() => handleClickPlayer(p.playerId, p.latestClubId)}
                            className={`transition-colors cursor-pointer ${
                              p.isUserClubPlayer
                                ? 'bg-sky-950/20 hover:bg-sky-950/35'
                                : 'hover:bg-slate-800/35'
                            }`}
                          >
                            <td className="py-2.5 pl-4 pr-2 font-mono font-bold text-slate-400 tabular-nums">
                              {idx + 1}º
                            </td>
                            <td className="py-2.5 px-3">
                              <div className="font-bold text-white">{p.playerName}</div>
                              <div className="text-[11px] text-slate-400 tabular-nums">
                                {p.detailedRole} · Auge OVR {p.peakOverall}
                              </div>
                            </td>
                            <td className="py-2.5 px-3 text-slate-300">
                              {p.clubsRepresented.join(' · ') || p.latestClubShortName}
                            </td>
                            <td className="py-2.5 px-2 text-right font-mono font-black text-amber-400 tabular-nums">
                              {p.mvpAwardsCount}
                            </td>
                            <td className="py-2.5 px-2 text-right font-mono font-bold text-sky-400 tabular-nums">
                              {p.totyAppearances}x
                            </td>
                            <td className="py-2.5 px-2 text-right font-mono font-bold text-emerald-400 tabular-nums">
                              {p.goldenBootsCount}
                            </td>
                            <td className="py-2.5 px-2 text-right font-mono text-slate-300 tabular-nums">
                              {p.playmakerAwardsCount + p.bestKeeperAwardsCount}
                            </td>
                            <td className="py-2.5 px-2 text-right font-mono font-bold text-slate-200 tabular-nums">
                              {p.goals}
                            </td>
                            <td className="py-2.5 pl-2 pr-4 text-right font-mono text-slate-300 tabular-nums">
                              {p.assists}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={9} className="py-8 text-center text-xs text-slate-400">
                            Os vencedores de Craque do Ano, Artilharia e Time do Ano aparecerão aqui
                            conforme as temporadas avançam.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
