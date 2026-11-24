import React, { useMemo, useState, useEffect } from 'react';
import {
  Club,
  GameSave,
  IndividualAwardCategory,
  IndividualAwardRecord,
  TrophyRecord,
} from '../types/game';
import {
  Trophy,
  Award,
  Medal,
  Star,
  Calendar,
  TrendingUp,
  Target,
  Sparkles,
  Shield,
  Crown,
  History,
  Globe,
  Share2,
} from 'lucide-react';
import { generateAndShareAchievementCard } from '../utils/shareCardGenerator';
import { getManagerSpecialtyProfile } from '../utils/managerSpecialtyEngine';
import { soundEngine } from '../services/soundEngine';
import { COMPETITIONS_CATALOG } from '../utils/competitionsEngine';
import {
  EvaluatedAwardCandidate,
  formatCurrency,
  getCurrentSeasonAwardRaces,
  INDIVIDUAL_AWARD_PRIZES,
  INDIVIDUAL_AWARD_TITLES,
} from '../utils/individualAwardsEngine';
import { computeWorldBallonDorStandings } from '../utils/worldBallonDorEngine';

interface TrophyCabinetViewProps {
  userClub: Club;
  trophyHistory: TrophyRecord[];
  individualAwardsHistory?: IndividualAwardRecord[];
  gameState: GameSave;
  managerName: string;
  seasonYear: number;
  initialSubTab?: 'trophies' | 'honors';
  onOpenAlmanacHistory?: () => void;
}

const CATEGORY_FILTER_OPTIONS: {
  id: 'ALL' | IndividualAwardCategory;
  label: string;
}[] = [
  { id: 'ALL', label: 'Todas Categorias' },
  { id: 'BEST_PLAYER', label: 'Craque do Campeonato' },
  { id: 'TOP_SCORER', label: 'Artilheiro' },
  { id: 'REVELATION', label: 'Revelação Sub-21' },
  { id: 'BEST_GOALKEEPER', label: 'Melhor Goleiro' },
];

function getCategoryIcon(category: IndividualAwardCategory) {
  switch (category) {
    case 'BEST_PLAYER':
      return <Crown className="w-4 h-4 text-amber-400 shrink-0" />;
    case 'TOP_SCORER':
      return <Target className="w-4 h-4 text-sky-400 shrink-0" />;
    case 'REVELATION':
      return <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />;
    case 'BEST_GOALKEEPER':
      return <Shield className="w-4 h-4 text-cyan-400 shrink-0" />;
  }
}

export const TrophyCabinetView: React.FC<TrophyCabinetViewProps> = ({
  userClub,
  trophyHistory,
  individualAwardsHistory = [],
  gameState,
  managerName,
  seasonYear,
  initialSubTab = 'trophies',
  onOpenAlmanacHistory,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'trophies' | 'honors'>(initialSubTab);
  const [selectedCategory, setSelectedCategory] = useState<'ALL' | IndividualAwardCategory>('ALL');
  const [selectedYear, setSelectedYear] = useState<string>('ALL');
  const [onlyMyClub, setOnlyMyClub] = useState<boolean>(false);

  useEffect(() => {
    setActiveSubTab(initialSubTab);
  }, [initialSubTab]);

  const userTrophies = useMemo(
    () => trophyHistory.filter((t) => t.userWon),
    [trophyHistory]
  );

  const userIndividualWins = useMemo(
    () => individualAwardsHistory.filter((a) => a.userWon || a.clubId === userClub.id),
    [individualAwardsHistory, userClub.id]
  );

  const userTotalIndividualPrize = useMemo(
    () => userIndividualWins.reduce((sum, a) => sum + a.prizeAmount, 0),
    [userIndividualWins]
  );

  const availableYears = useMemo(() => {
    const yearsSet = new Set<number>(individualAwardsHistory.map((a) => a.year));
    return Array.from(yearsSet).sort((a, b) => b - a);
  }, [individualAwardsHistory]);

  const filteredHonors = useMemo(() => {
    return individualAwardsHistory.filter((item) => {
      if (selectedCategory !== 'ALL' && item.category !== selectedCategory) return false;
      if (selectedYear !== 'ALL' && String(item.year) !== selectedYear) return false;
      if (onlyMyClub && !(item.userWon || item.clubId === userClub.id)) return false;
      return true;
    });
  }, [individualAwardsHistory, selectedCategory, selectedYear, onlyMyClub, userClub.id]);

  // Live current season award race for user's division + World Ballon d'Or
  const currentRaces = useMemo(() => getCurrentSeasonAwardRaces(gameState), [gameState]);
  const primaryRace = currentRaces[0];
  const worldBallonRace = useMemo(
    () => computeWorldBallonDorStandings(gameState, seasonYear),
    [gameState, seasonYear]
  );
  const worldBallonHistory = gameState.worldBallonDorHistory || [];

  const availableCompetitions = [
    COMPETITIONS_CATALOG.super_mundial_clubes,
    COMPETITIONS_CATALOG.intercontinental,
    COMPETITIONS_CATALOG.champions_league,
    COMPETITIONS_CATALOG.europa_league,
    COMPETITIONS_CATALOG.conference_league,
    COMPETITIONS_CATALOG.copa_internacional,
    COMPETITIONS_CATALOG.concacaf_champions,
    COMPETITIONS_CATALOG.afc_champions,
    COMPETITIONS_CATALOG.libertadores,
    COMPETITIONS_CATALOG.sulamericana,
    COMPETITIONS_CATALOG.serie_a,
    COMPETITIONS_CATALOG.serie_b,
    COMPETITIONS_CATALOG.serie_c,
    COMPETITIONS_CATALOG.copa_brasil,
    COMPETITIONS_CATALOG.estadual,
  ];

  const renderRaceCard = (
    category: IndividualAwardCategory,
    candidates: EvaluatedAwardCandidate[],
    prizeAmount: number
  ) => {
    const topThree = candidates.slice(0, 3);
    return (
      <div
        key={category}
        className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 flex flex-col justify-between"
      >
        <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-800/80">
          <div className="flex items-center gap-2 min-w-0">
            {getCategoryIcon(category)}
            <div className="min-w-0">
              <h5 className="text-sm font-bold text-white truncate">
                {INDIVIDUAL_AWARD_TITLES[category]}
              </h5>
              <p className="text-[11px] text-slate-400">
                Premiação ao fim do ano ·{' '}
                <span className="text-emerald-400 font-mono font-semibold tabular-nums">
                  {formatCurrency(prizeAmount)}
                </span>
              </p>
            </div>
          </div>
        </div>

        {topThree.length === 0 ? (
          <p className="text-xs text-slate-500 py-6 text-center">
            Aguardando partidas oficiais na temporada.
          </p>
        ) : (
          <div className="divide-y divide-slate-800/60 mt-1">
            {topThree.map((cand, idx) => {
              const isUserAthlete = cand.club.id === userClub.id;
              return (
                <div
                  key={cand.player.id}
                  className="py-2.5 flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className={`w-5 text-xs font-mono font-black tabular-nums shrink-0 ${
                        idx === 0
                          ? 'text-amber-400'
                          : idx === 1
                          ? 'text-slate-300'
                          : 'text-amber-700'
                      }`}
                    >
                      {idx + 1}º
                    </span>
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: cand.club.colors.primary }}
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`text-xs font-bold truncate ${
                            isUserAthlete ? 'text-sky-300' : 'text-white'
                          }`}
                        >
                          {cand.player.name}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 truncate tabular-nums">
                        {cand.player.detailedRole} · {cand.club.shortName} · {cand.statHighlight}
                      </p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-xs font-mono font-bold text-slate-200 tabular-nums">
                      OVR {cand.player.overall}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Manager Career Header */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
              <Trophy className="w-7 h-7" />
            </div>
            <div>
              <span className="text-[11px] uppercase font-bold tracking-wider text-amber-400">
                Carreira do Treinador · Temporada <span className="tabular-nums">{seasonYear}</span>
              </span>
              <h2 className="text-2xl font-black text-white leading-tight">{managerName}</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Comando atual: <strong className="text-white">{userClub.name}</strong> · Série{' '}
                {userClub.division} · Reputação{' '}
                <span className="tabular-nums font-semibold text-slate-200">
                  {userClub.reputation}/100
                </span>
              </p>
            </div>
          </div>

          {/* Segmented Tab Switcher: Sala de Troféus vs Honrarias */}
          <div className="flex items-center gap-1.5 bg-slate-950 p-1.5 rounded-xl border border-slate-800 self-start lg:self-auto">
            <button
              type="button"
              onClick={() => setActiveSubTab('trophies')}
              className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeSubTab === 'trophies'
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-900'
              }`}
            >
              <Trophy className="w-3.5 h-3.5 shrink-0" />
              <span>Sala de Troféus</span>
              <span
                className={`font-mono text-[11px] tabular-nums ${
                  activeSubTab === 'trophies' ? 'text-slate-950/80' : 'text-slate-500'
                }`}
              >
                ({userTrophies.length})
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveSubTab('honors')}
              className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeSubTab === 'honors'
                  ? 'bg-sky-400 text-slate-950 shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-900'
              }`}
            >
              <Award className="w-3.5 h-3.5 shrink-0" />
              <span>Honrarias</span>
              <span
                className={`font-mono text-[11px] tabular-nums ${
                  activeSubTab === 'honors' ? 'text-slate-950/80' : 'text-slate-500'
                }`}
              >
                ({individualAwardsHistory.length})
              </span>
            </button>

            {onOpenAlmanacHistory && (
              <button
                type="button"
                onClick={onOpenAlmanacHistory}
                className="px-3.5 py-2 rounded-lg text-xs font-bold flex items-center gap-2 text-emerald-300 hover:text-white hover:bg-slate-900 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <History className="w-3.5 h-3.5 shrink-0" />
                <span>Almanaque Geral</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* TAB 1: SALA DE TROFÉUS (CLUB TITLES) */}
      {activeSubTab === 'trophies' && (
        <>
          {/* Available Competitions Showcase */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-2">
              <Star className="w-4 h-4 text-amber-400" />
              Competições Disputáveis na Carreira
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              {availableCompetitions.map((comp) => {
                const timesWon = userTrophies.filter((t) => t.competition === comp.name).length;
                return (
                  <div
                    key={comp.id}
                    className={`p-3.5 rounded-xl border transition-all ${
                      timesWon > 0
                        ? 'bg-amber-950/20 border-amber-500/40'
                        : 'bg-slate-950/60 border-slate-800/80 opacity-85'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xl">{comp.badgeEmoji}</span>
                      <span
                        className={`text-xs font-mono font-bold tabular-nums ${
                          timesWon > 0 ? 'text-amber-300' : 'text-slate-500'
                        }`}
                      >
                        {timesWon > 0 ? `${timesWon}x Campeão` : '0x'}
                      </span>
                    </div>
                    <h4 className="font-bold text-white text-xs truncate">{comp.shortName}</h4>
                    <p className="text-[11px] text-slate-400 line-clamp-2 mt-0.5">
                      {comp.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Won Trophies Cabinet */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl">
            <div className="flex items-center justify-between gap-4 mb-5">
              <h3 className="font-bold text-white flex items-center gap-2">
                <Award className="w-5 h-5 text-amber-400" />
                Galeria de Títulos Conquistados ({userTrophies.length})
              </h3>
              <button
                type="button"
                onClick={() => setActiveSubTab('honors')}
                className="text-xs font-semibold text-sky-400 hover:text-sky-300 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                Ver Honrarias Individuais →
              </button>
            </div>

            {trophyHistory.length === 0 ? (
              <div className="text-center py-12 border border-dashed border-slate-800 rounded-xl bg-slate-950/40">
                <Medal className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                <p className="text-slate-300 font-semibold text-sm">
                  Sua galeria de troféus ainda aguarda a primeira conquista.
                </p>
                <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                  Dispute os Estaduais, Supercopa, Recopa, Copa do Brasil, Libertadores,
                  Sul-Americana e o Brasileirão para eternizar seu nome na história!
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {trophyHistory.map((trophy, idx) => (
                  <div
                    key={`${trophy.year}_${trophy.competition}_${idx}`}
                    className={`p-5 rounded-xl border ${
                      trophy.userWon
                        ? 'bg-amber-950/20 border-amber-500/40'
                        : 'bg-slate-950/60 border-slate-800'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-mono font-bold text-amber-300 flex items-center gap-1.5 tabular-nums">
                        <Calendar className="w-3.5 h-3.5" />
                        Temporada {trophy.seasonLabel || trophy.year}
                      </span>
                      {trophy.userWon && (
                        <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">
                          Conquistado
                        </span>
                      )}
                    </div>
                    <h4 className="text-base font-black text-white">{trophy.competition}</h4>
                    <div className="mt-3 pt-3 border-t border-slate-800/80 space-y-1 text-xs">
                      <div className="flex justify-between gap-2">
                        <span className="text-slate-400">Campeão</span>
                        <span className="font-bold text-amber-300 truncate">
                          {trophy.championTeamName}
                        </span>
                      </div>
                      <div className="flex justify-between gap-2">
                        <span className="text-slate-400">Vice-campeão</span>
                        <span className="text-slate-300 truncate">{trophy.runnerUpTeamName}</span>
                      </div>
                    </div>
                    {trophy.userWon && (
                      <button
                        type="button"
                        onClick={() => {
                          soundEngine.playClick();
                          const spec = getManagerSpecialtyProfile(gameState.managerSpecialty);
                          void generateAndShareAchievementCard({
                            kind: 'TROPHY',
                            clubName: trophy.championTeamName,
                            clubInitials: userClub.initials,
                            primaryColor: userClub.colors.primary,
                            secondaryColor: userClub.colors.secondary,
                            textColor: userClub.colors.text,
                            managerName,
                            specialtyLabel: spec.title,
                            headline: 'É CAMPEÃO!',
                            subtitle: `${trophy.competition} · ${trophy.seasonLabel || trophy.year}`,
                            yearLabel: String(trophy.seasonLabel || trophy.year),
                            stats: [
                              { label: 'Clube', value: userClub.shortName },
                              { label: 'Total de Taças', value: String(userTrophies.length) },
                            ],
                            highlightLine: trophy.runnerUpTeamName
                              ? `Vice-campeão: ${trophy.runnerUpTeamName}`
                              : undefined,
                          });
                        }}
                        className="mt-3 w-full py-1.5 px-3 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-[11px] font-bold text-sky-300 flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                      >
                        <Share2 className="w-3.5 h-3.5" />
                        <span>Compartilhar Card (PNG)</span>
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* TAB 2: HONRARIAS (INDIVIDUAL AWARDS ARCHIVE & CURRENT RACE) */}
      {activeSubTab === 'honors' && (
        <div className="space-y-6">
          {/* KPI Metrics Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Vencedores Históricos
              </span>
              <div className="mt-1 flex items-baseline justify-between">
                <span className="text-2xl font-black text-white font-mono tabular-nums">
                  {individualAwardsHistory.length}
                </span>
                <span className="text-xs text-slate-400 tabular-nums">
                  {availableYears.length}{' '}
                  {availableYears.length === 1 ? 'temporada' : 'temporadas'}
                </span>
              </div>
            </div>

            <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Atletas do {userClub.shortName}
              </span>
              <div className="mt-1 flex items-baseline justify-between">
                <span className="text-2xl font-black text-sky-400 font-mono tabular-nums">
                  {userIndividualWins.length}
                </span>
                <span className="text-xs text-slate-400">honrarias conquistadas</span>
              </div>
            </div>

            <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Bônus Financeiro Acumulado
              </span>
              <div className="mt-1 flex items-baseline justify-between">
                <span className="text-xl font-black text-emerald-400 font-mono tabular-nums">
                  {formatCurrency(userTotalIndividualPrize)}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Creditado ao caixa por prêmios individuais
              </p>
            </div>

            <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Bola de Ouro ({primaryRace.competitionName})
              </span>
              <div className="mt-1">
                <span className="text-xl font-black text-amber-400 font-mono tabular-nums">
                  {formatCurrency(INDIVIDUAL_AWARD_PRIZES[primaryRace.division].BEST_PLAYER)}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5 tabular-nums">
                Artilheiro:{' '}
                {formatCurrency(INDIVIDUAL_AWARD_PRIZES[primaryRace.division].TOP_SCORER)}
              </p>
            </div>
          </div>

          {/* WORLD BALLON D'OR & BEST PLAYER IN THE WORLD */}
          <div className="bg-slate-900/90 border border-amber-500/30 rounded-2xl p-6 shadow-xl space-y-5">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-4 border-b border-slate-800">
              <div>
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-400">
                  <Globe className="w-4 h-4 shrink-0" />
                  <span>Premiação Máxima FIFA · Todas as Ligas do Mundo</span>
                </div>
                <h3 className="text-lg font-black text-white mt-0.5">
                  Bola de Ouro Mundial & Melhor Jogador do Mundo
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Eleição anual global avaliando gols, assistências, nota média e títulos em todas as ligas (Europa, Brasil, América do Sul, América do Norte, Ásia e África). Vencedor recebe +1 OVR, +R$ 35M de valor de mercado e R$ 15M de bônus ao clube.
                </p>
              </div>
              <div className="text-right text-xs font-mono tabular-nums shrink-0">
                <span className="text-slate-400 block">Edições Entregues</span>
                <strong className="text-amber-300 text-base">{worldBallonHistory.length}</strong>
              </div>
            </div>

            {worldBallonHistory.length > 0 && (
              <div className="space-y-2.5">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  Galeria Oficial da Bola de Ouro Mundial
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {worldBallonHistory.map((award) => {
                    const userClubHadPodium =
                      award.winner.userWon || award.silver.userWon || award.bronze.userWon;
                    return (
                      <div
                        key={award.year}
                        className={`p-4 rounded-xl border ${
                          userClubHadPodium
                            ? 'bg-amber-950/20 border-amber-500/45'
                            : 'bg-slate-950/70 border-slate-800'
                        }`}
                      >
                        <div className="flex items-center justify-between text-xs pb-2.5 mb-2.5 border-b border-slate-800/80">
                          <span className="font-mono font-bold text-amber-300 tabular-nums">
                            Edição {award.year}
                          </span>
                          <span className="text-slate-400 font-mono tabular-nums">
                            {award.awardedAtDate}
                          </span>
                        </div>
                        <div className="space-y-2 text-xs">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-bold text-amber-300 truncate">
                              1º Bola de Ouro · {award.winner.playerName}
                            </span>
                            <span className="font-mono text-slate-300 tabular-nums shrink-0">
                              {award.winner.clubShortName} · {award.winner.goals}G {award.winner.assists}A
                            </span>
                          </div>
                          <div className="flex items-center justify-between gap-2 text-slate-300">
                            <span className="truncate">
                              2º Bola de Prata · {award.silver.playerName}
                            </span>
                            <span className="font-mono text-slate-400 tabular-nums shrink-0">
                              {award.silver.clubShortName} · {award.silver.goals}G {award.silver.assists}A
                            </span>
                          </div>
                          <div className="flex items-center justify-between gap-2 text-slate-400">
                            <span className="truncate">
                              3º Bola de Bronze · {award.bronze.playerName}
                            </span>
                            <span className="font-mono tabular-nums shrink-0">
                              {award.bronze.clubShortName} · {award.bronze.goals}G {award.bronze.assists}A
                            </span>
                          </div>
                          {award.goldenBoyU21 && (
                            <div className="pt-2 mt-1 border-t border-slate-800/70 flex items-center justify-between gap-2 text-emerald-300">
                              <span className="font-semibold truncate">
                                Golden Boy Sub-21 · {award.goldenBoyU21.playerName} ({award.goldenBoyU21.age}a)
                              </span>
                              <span className="font-mono text-slate-300 tabular-nums shrink-0">
                                {award.goldenBoyU21.clubShortName} · OVR {award.goldenBoyU21.overall}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Live Global Race Top 8 */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  Corrida Mundial ao Vivo ({seasonYear}) · Top 8 Favoritos
                </h4>
                {worldBallonRace.goldenBoyU21 && (
                  <span className="text-xs text-emerald-400 font-semibold tabular-nums">
                    Líder Golden Boy Sub-21: {worldBallonRace.goldenBoyU21.playerName} ({worldBallonRace.goldenBoyU21.clubShortName})
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                {worldBallonRace.top10.slice(0, 8).map((cand, idx) => {
                  const isMine = cand.clubId === userClub.id;
                  return (
                    <div
                      key={cand.playerId}
                      className={`px-3.5 py-2.5 rounded-xl border flex items-center justify-between gap-3 ${
                        isMine
                          ? 'bg-sky-950/25 border-sky-500/40'
                          : 'bg-slate-950/70 border-slate-800/90'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span
                          className={`w-6 text-xs font-mono font-black tabular-nums shrink-0 ${
                            idx === 0
                              ? 'text-amber-400'
                              : idx === 1
                              ? 'text-slate-200'
                              : idx === 2
                              ? 'text-amber-600'
                              : 'text-slate-500'
                          }`}
                        >
                          {idx + 1}º
                        </span>
                        <span
                          className="w-2.5 h-2.5 rounded-sm shrink-0 border border-white/15"
                          style={{ backgroundColor: cand.clubColors.primary }}
                        />
                        <div className="min-w-0">
                          <div
                            className={`text-xs font-bold truncate ${
                              isMine ? 'text-sky-300' : 'text-white'
                            }`}
                          >
                            {cand.playerName}{' '}
                            <span className="text-slate-400 font-normal">
                              ({cand.detailedRole} · {cand.nationality})
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-400 truncate tabular-nums">
                            {cand.clubName} · {cand.goals}G · {cand.assists}A · {cand.matches}J
                          </div>
                        </div>
                      </div>
                      <div className="text-right shrink-0 font-mono tabular-nums">
                        <div className="text-xs font-bold text-amber-300">
                          {cand.ballonDorPoints} pts
                        </div>
                        <div className="text-[10px] text-slate-400">OVR {cand.overall}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Historical Winners Archive */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-slate-800">
              <div>
                <h3 className="text-base font-black text-white flex items-center gap-2">
                  <Crown className="w-5 h-5 text-amber-400 shrink-0" />
                  Galeria Histórica de Honrarias Individuais
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Registro oficial perpétuo do Craque do Campeonato, Artilheiro, Revelação Sub-21 e
                  Melhor Goleiro entregues ao encerramento de cada temporada.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-200 focus:outline-none focus:border-sky-500 cursor-pointer tabular-nums"
                >
                  <option value="ALL">Todas as Temporadas</option>
                  {availableYears.map((yr) => (
                    <option key={yr} value={String(yr)}>
                      Temporada {yr}
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={() => setOnlyMyClub((prev) => !prev)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    onlyMyClub
                      ? 'bg-sky-500/15 border-sky-400/50 text-sky-300'
                      : 'bg-slate-950 border-slate-800 text-slate-300 hover:text-white'
                  }`}
                >
                  Apenas {userClub.shortName}
                </button>
              </div>
            </div>

            {/* Category Filter Bar */}
            <div className="flex items-center gap-1.5 overflow-x-auto py-3 border-b border-slate-800/70">
              {CATEGORY_FILTER_OPTIONS.map((opt) => {
                const isSelected = selectedCategory === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setSelectedCategory(opt.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      isSelected
                        ? 'bg-slate-800 text-white border border-slate-700'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-950/60 border border-transparent'
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>

            {/* Historical Winners Table / List */}
            {individualAwardsHistory.length === 0 ? (
              <div className="text-center py-10 mt-4 border border-dashed border-slate-800 rounded-xl bg-slate-950/40 px-4">
                <Award className="w-9 h-9 text-amber-400/70 mx-auto mb-2.5" />
                <p className="text-sm font-bold text-slate-200">
                  A primeira Gala de Honrarias acontecerá ao final da Temporada{' '}
                  <span className="tabular-nums">{seasonYear}</span>
                </p>
                <p className="text-xs text-slate-400 mt-1 max-w-xl mx-auto">
                  Ao concluir a última rodada em Novembro, os vencedores de Craque do Campeonato,
                  Artilheiro, Revelação Sub-21 e Melhor Goleiro recebem bônus em dinheiro para o
                  clube, valorização de passe e ficam eternizados nesta galeria. Acompanhe os
                  favoritos atuais logo abaixo!
                </p>
              </div>
            ) : filteredHonors.length === 0 ? (
              <div className="text-center py-10 mt-4 border border-dashed border-slate-800 rounded-xl bg-slate-950/40">
                <p className="text-sm font-semibold text-slate-300">
                  Nenhuma honraria encontrada para os filtros selecionados.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto mt-2">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      <th className="py-3 pr-4">Ano</th>
                      <th className="py-3 px-4">Honraria & Competição</th>
                      <th className="py-3 px-4">Vencedor</th>
                      <th className="py-3 px-4">Clube</th>
                      <th className="py-3 px-4">Desempenho na Temporada</th>
                      <th className="py-3 pl-4 text-right">Premiação & Impacto</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/70 text-xs">
                    {filteredHonors.map((award) => {
                      const isUserClubWinner = award.userWon || award.clubId === userClub.id;
                      return (
                        <tr
                          key={award.id}
                          className={`transition-colors ${
                            isUserClubWinner
                              ? 'bg-sky-950/20 hover:bg-sky-950/30'
                              : 'hover:bg-slate-950/50'
                          }`}
                        >
                          <td className="py-3.5 pr-4 font-mono font-black text-amber-300 tabular-nums whitespace-nowrap">
                            {award.year}
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-2">
                              {getCategoryIcon(award.category)}
                              <div>
                                <div className="font-bold text-white">{award.awardTitle}</div>
                                <div className="text-[11px] text-slate-400">
                                  {award.competition}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="py-3.5 px-4">
                            <div
                              className={`font-bold ${
                                isUserClubWinner ? 'text-sky-300' : 'text-white'
                              }`}
                            >
                              {award.playerName}
                            </div>
                            <div className="text-[11px] text-slate-400 tabular-nums">
                              {award.playerRole} · {award.playerAge} anos · OVR{' '}
                              {award.playerOverall}
                            </div>
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-2">
                              <span
                                className="w-2.5 h-2.5 rounded-full shrink-0"
                                style={{
                                  backgroundColor: award.clubColors?.primary || '#38bdf8',
                                }}
                              />
                              <span
                                className={`font-semibold ${
                                  isUserClubWinner ? 'text-sky-200' : 'text-slate-200'
                                }`}
                              >
                                {award.clubName}
                              </span>
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-slate-300 tabular-nums">
                            {award.statHighlight}
                          </td>
                          <td className="py-3.5 pl-4 text-right whitespace-nowrap">
                            <div className="font-mono font-bold text-emerald-400 tabular-nums">
                              +{formatCurrency(award.prizeAmount)}
                            </div>
                            <div className="text-[11px] text-slate-400 font-mono tabular-nums">
                              Passe +{formatCurrency(award.marketValueBoost)}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Live Race in Active Season */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-5">
              <div>
                <h3 className="text-base font-black text-white flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-sky-400 shrink-0" />
                  Corrida Pelos Prêmios · Temporada Atual ({seasonYear})
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Favoritos parciais no <strong className="text-slate-200">{primaryRace.competitionName}</strong>{' '}
                  com base em gols, assistências, nota média e campanha coletiva.
                </p>
              </div>
              <span className="text-xs font-mono text-slate-400 tabular-nums">
                Jogos computados: {primaryRace.playedFixturesCount}/{primaryRace.totalFixturesCount}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {renderRaceCard(
                'BEST_PLAYER',
                primaryRace.bestPlayers,
                INDIVIDUAL_AWARD_PRIZES[primaryRace.division].BEST_PLAYER
              )}
              {renderRaceCard(
                'TOP_SCORER',
                primaryRace.topScorers,
                INDIVIDUAL_AWARD_PRIZES[primaryRace.division].TOP_SCORER
              )}
              {renderRaceCard(
                'REVELATION',
                primaryRace.revelations,
                INDIVIDUAL_AWARD_PRIZES[primaryRace.division].REVELATION
              )}
              {renderRaceCard(
                'BEST_GOALKEEPER',
                primaryRace.bestGoalkeepers,
                INDIVIDUAL_AWARD_PRIZES[primaryRace.division].BEST_GOALKEEPER
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
