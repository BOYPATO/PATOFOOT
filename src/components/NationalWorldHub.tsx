import React, { useMemo, useState } from 'react';
import {
  Club,
  ConfederationCode,
  ContinentalCompId,
  ContinentalQualifierTrackId,
  FormationType,
  InternationalMatchFixture,
  NationalStandingRow,
  NationalTeamProfile,
  NationalTeamState,
  NationalTournamentEdition,
} from '../types/game';
import {
  Award,
  Crown,
  Globe,
  LayoutGrid,
  Medal,
  Minus,
  Play,
  Search,
  Shield,
  Shuffle,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Trophy,
  Users,
} from 'lucide-react';
import {
  EURO_2028_COHOSTS,
  getIntercontinentalPlayoffParticipants,
  getNationalTeamById,
  getNationalTournamentDrawInfo,
  getTeamSeasonInternationalFixtures,
  getWorldCup48SlotsSummary,
  isContinentalTrackComplete,
  isWorldCupQualifiersComplete,
  NATIONAL_TEAMS_CATALOG,
  ResolvedNationalPlayer,
  resolveNationalTeamPlayerPool,
  selectOptimalSelecaoSquad,
  sortNationalPlayersByPosition,
  WORLD_CUP_2030_COHOSTS,
} from '../utils/nationalTeamEngine';
import { formatShortDate } from '../utils/calendarUtils';
import { SelecaoTacticalBoard } from './SelecaoTacticalBoard';
import { soundEngine } from '../services/soundEngine';

const TRACK_TO_CONT_COMP: Record<ContinentalQualifierTrackId, ContinentalCompId> = {
  UEFA: 'eurocopa',
  CAF: 'copa_africana',
  AFC: 'copa_asia',
  CONCACAF: 'copa_america',
  OFC: 'copa_oceania',
};

export type WorldSubTab =
  | 'nations'
  | 'wc_qualifiers'
  | 'cont_qualifiers'
  | 'world_cup'
  | 'continentals'
  | 'ranking';

export const CONTINENTAL_COMP_META: {
  id: ContinentalCompId;
  shortLabel: string;
  confedLabel: string;
  cycleHint: string;
}[] = [
  {
    id: 'copa_america',
    shortLabel: 'Copa América',
    confedLabel: 'CONMEBOL (10) + Convidados · 16 Seleções (4×4 + Mata-Mata)',
    cycleHint: '2028 (incl. EUA, MEX, CAN, RUS, CRC, JAM) · 2032 · 2036',
  },
  {
    id: 'eurocopa',
    shortLabel: 'Eurocopa',
    confedLabel: 'UEFA · 24 Seleções (6 Grupos de 4 + Oitavas a Final · 51 jogos)',
    cycleHint: 'Elim. 12 Grupos (6×4 + 6×5) + Play-Off · Euro 2028 (UK/IRL) · 2032 · 2036',
  },
  {
    id: 'copa_ouro',
    shortLabel: 'Copa Ouro CONCACAF',
    confedLabel: 'CONCACAF · 16 Seleções (4 Grupos de 4 + Mata-Mata)',
    cycleHint: 'Ciclo Bienal Oficial (2027 · 2029 · 2031 · 2033 · 2035 · 2037)',
  },
  {
    id: 'copa_africana',
    shortLabel: 'Copa Africana',
    confedLabel: 'CAF · 32 Seleções (8 Grupos de 4 + Oitavas a Final)',
    cycleHint: 'Elim. 8×7 (56 Sel.) · Copa 2028 (UGA/TAN/KEN) · 2032 · 2036',
  },
  {
    id: 'copa_asia',
    shortLabel: 'Copa da Ásia',
    confedLabel: 'AFC · 32 Seleções (8 Grupos de 4 + Oitavas a Final)',
    cycleHint: 'Elim. 4×12 (2027/28) · Copa 2028 · 2032 · 2036',
  },
  {
    id: 'copa_oceania',
    shortLabel: 'Copa da Oceania',
    confedLabel: 'OFC · 8 Seleções (2 Grupos de 4 + Semifinais/Final)',
    cycleHint: 'Elim. 2027/31/35 · Copa 2028/32/36',
  },
  {
    id: 'nations_league',
    shortLabel: 'UEFA Nations League',
    confedLabel: 'UEFA · 54 Seleções (2026/27: 4 Ligas → 2028/29+: 3 Ligas A/B/C Suíço 3×6)',
    cycleHint: 'Bienal (2026/27, 2028/29, 2030/31...) · QF Ida/Volta (Mar) + Final Four (Jun)',
  },
];

export interface FifaRankRowItem {
  team: NationalTeamProfile;
  points: number;
  rank: number;
  prevRank?: number;
  rankDiff: number;
  meta?: {
    previousPoints?: number;
    previousRank?: number;
    lastDelta?: number;
    lastMatchDate?: string;
    lastMatchSummary?: string;
  };
}

interface NationalWorldHubProps {
  worldSubTab: WorldSubTab;
  onChangeWorldSubTab: (tab: WorldSubTab) => void;
  worldInspectTeamId: string;
  onSelectInspectTeam: (teamId: string) => void;
  nationalTeam: NationalTeamState;
  activeUserTeamId: string | null;
  allClubs: Club[];
  userClub: Club;
  calendarYear: number;
  managerReputation: number;
  fifaRankingRows: FifaRankRowItem[];
  onAppointNation: (team: NationalTeamProfile) => void;
  onLaunchMatch: (fix: InternationalMatchFixture) => void;
  renderTournamentHub: (
    edition: NationalTournamentEdition,
    mode: 'groups' | 'bracket' | 'matches',
    phaseFilter?: string,
    onChangePhaseFilter?: (p: string) => void
  ) => React.ReactNode;
  TeamCrest: React.ComponentType<{ team: NationalTeamProfile; size?: 'sm' | 'md' | 'lg' }>;
  formatCurrency: (val: number) => string;
  totalCompensationHistory: number;
  userClubCappedCount: number;
  onOpenTournamentDraw?: (compId: 'world_cup' | ContinentalCompId) => void;
}

const CONFED_FILTERS: (ConfederationCode | 'ALL')[] = [
  'ALL',
  'CONMEBOL',
  'UEFA',
  'CONCACAF',
  'CAF',
  'AFC',
  'OFC',
];

const OTHER_WC_QUAL_HINTS: Record<'UEFA' | 'CAF' | 'AFC' | 'CONCACAF' | 'OFC', { spotsPerGroup: number; label: string }> = {
  UEFA: {
    spotsPerGroup: 4,
    label: '54 seleções · 16 vagas totais (em 2030: ESP/POR sedes + 10 Liga 1 + 4 Play-Off UEFA · Potes 1–3 FIFA vs Pote 4)',
  },
  CAF: { spotsPerGroup: 1, label: '54 seleções (9×6 · sem Zanzibar e Reunião) · 9 vagas diretas (em 2030: MAR sede + 8) · Play-Off CAF (1 Repescagem)' },
  AFC: { spotsPerGroup: 1, label: '48 seleções (8×6 · 10 jogos) · 8 vagas diretas · Play-Off AFC (1 Repescagem)' },
  CONCACAF: { spotsPerGroup: 1, label: '16 seleções (4×4) · 6 vagas diretas (4 campeões + 2 melhores 2ºs) · 2 vagas na Repescagem Mundial' },
  OFC: { spotsPerGroup: 1, label: '11 seleções em tabela única (10 jogos) · 1º Vaga Direta · 2º Repescagem Mundial' },
};

export const NationalWorldHub: React.FC<NationalWorldHubProps> = ({
  worldSubTab,
  onChangeWorldSubTab,
  worldInspectTeamId,
  onSelectInspectTeam,
  nationalTeam,
  activeUserTeamId,
  allClubs,
  userClub,
  calendarYear,
  managerReputation,
  fifaRankingRows,
  onAppointNation,
  onLaunchMatch,
  renderTournamentHub,
  TeamCrest,
  formatCurrency,
  totalCompensationHistory,
  userClubCappedCount,
  onOpenTournamentDraw,
}) => {
  // Explorer filters
  const [nationSearch, setNationSearch] = useState('');
  const [nationConfed, setNationConfed] = useState<ConfederationCode | 'ALL'>('ALL');
  const [inspectDetailTab, setInspectDetailTab] = useState<'lineup' | 'squad' | 'matches'>('lineup');

  // WC Qualifiers filters
  const [qualConfed, setQualConfed] = useState<ConfederationCode | 'VAGAS' | 'REPESCAGEM'>('CONMEBOL');
  const [qualCycleMode, setQualCycleMode] = useState<'ACTIVE' | 'ARCHIVE'>('ACTIVE');
  const [selectedQualRound, setSelectedQualRound] = useState<number>(1);
  const [selectedOtherQualRound, setSelectedOtherQualRound] = useState<number>(1);

  // Continental Qualifiers filters
  const [contQualMode, setContQualMode] = useState<'ACTIVE' | 'ARCHIVE'>('ACTIVE');
  const [contQualTrack, setContQualTrack] = useState<ContinentalQualifierTrackId>('UEFA');
  const [selectedContQualRound, setSelectedContQualRound] = useState<number>(1);

  // World Cup & Continentals sub-modes
  const [wcSubMode, setWcSubMode] = useState<'groups' | 'bracket' | 'matches' | 'history'>('groups');
  const [wcMatchPhaseFilter, setWcMatchPhaseFilter] = useState<string>('ALL');
  const [selectedContinental, setSelectedContinental] = useState<ContinentalCompId>('copa_america');
  const [contSubMode, setContSubMode] = useState<'groups' | 'bracket' | 'matches'>('groups');

  // Ranking filters
  const [rankingConfedFilter, setRankingConfedFilter] = useState<ConfederationCode | 'ALL'>('ALL');
  const [rankingSearch, setRankingSearch] = useState('');
  const [rankingSort, setRankingSort] = useState<'POINTS' | 'MOVERS' | 'ALPHA'>('POINTS');

  const inspectTeam = getNationalTeamById(worldInspectTeamId);
  const inspectRankRow = useMemo(
    () => fifaRankingRows.find((r) => r.team.id === inspectTeam.id),
    [fifaRankingRows, inspectTeam.id]
  );

  // Catalog filtered for Nations Explorer
  const filteredNationsList = useMemo(() => {
    const q = nationSearch.trim().toLowerCase();
    return fifaRankingRows.filter(({ team }) => {
      if (nationConfed !== 'ALL' && team.confederation !== nationConfed) return false;
      if (
        q &&
        !team.name.toLowerCase().includes(q) &&
        !team.code.toLowerCase().includes(q) &&
        !team.federationCode.toLowerCase().includes(q)
      ) {
        return false;
      }
      return true;
    });
  }, [fifaRankingRows, nationSearch, nationConfed]);

  // Inspected nation player pool & 26-man squad
  const inspectPool = useMemo(
    () =>
      resolveNationalTeamPlayerPool(
        allClubs,
        nationalTeam.virtualPlayers,
        inspectTeam.id,
        userClub.id
      ),
    [allClubs, nationalTeam.virtualPlayers, inspectTeam.id, userClub.id]
  );

  const inspectPoolMap = useMemo(() => {
    const m = new Map<string, ResolvedNationalPlayer>();
    inspectPool.forEach((p) => m.set(p.id, p));
    return m;
  }, [inspectPool]);

  const inspectSquad = useMemo(() => {
    if (activeUserTeamId && inspectTeam.id === activeUserTeamId) {
      return {
        calledIds: nationalTeam.calledUpPlayerIds,
        starterIds: nationalTeam.starterPlayerIds,
        captainId: nationalTeam.captainPlayerId,
        formation: (nationalTeam.formation || '4-3-3') as FormationType,
      };
    }
    const auto = selectOptimalSelecaoSquad(
      allClubs,
      inspectTeam.id,
      nationalTeam.virtualPlayers,
      '4-3-3'
    );
    return {
      calledIds: auto.calledUpPlayerIds,
      starterIds: auto.starterPlayerIds,
      captainId: auto.captainPlayerId,
      formation: '4-3-3' as FormationType,
    };
  }, [
    activeUserTeamId,
    inspectTeam.id,
    nationalTeam.calledUpPlayerIds,
    nationalTeam.starterPlayerIds,
    nationalTeam.captainPlayerId,
    nationalTeam.formation,
    allClubs,
    nationalTeam.virtualPlayers,
  ]);

  const inspectCalledRoster = useMemo(() => {
    const resolved = inspectSquad.calledIds
      .map((id) => inspectPoolMap.get(id))
      .filter((x): x is ResolvedNationalPlayer => Boolean(x));
    return sortNationalPlayersByPosition(resolved, inspectSquad.starterIds);
  }, [inspectSquad.calledIds, inspectSquad.starterIds, inspectPoolMap]);

  const inspectFixtures = useMemo(
    () => getTeamSeasonInternationalFixtures(nationalTeam, inspectTeam.id, calendarYear),
    [nationalTeam, inspectTeam.id, calendarYear]
  );

  // Active vs archive World Cup Qualifiers
  const activeQualifiers = useMemo(() => {
    if (qualCycleMode === 'ARCHIVE' && nationalTeam.completedQualifiersArchive) {
      return nationalTeam.completedQualifiersArchive;
    }
    return nationalTeam.qualifiers;
  }, [qualCycleMode, nationalTeam.qualifiers, nationalTeam.completedQualifiersArchive]);

  // Active vs archive Continental Qualifiers
  const activeContQualifiers = useMemo(() => {
    if (contQualMode === 'ARCHIVE' && nationalTeam.completedContinentalQualifiersArchive) {
      return nationalTeam.completedContinentalQualifiersArchive;
    }
    return nationalTeam.continentalQualifiers;
  }, [contQualMode, nationalTeam.continentalQualifiers, nationalTeam.completedContinentalQualifiersArchive]);

  // Finalíssima fixture (if scheduled this year)
  const finalissimaFixtures = useMemo(
    () => (nationalTeam.seasonSchedule || []).filter((f) => f.competition === 'finalissima'),
    [nationalTeam.seasonSchedule]
  );

  // Ranking summaries
  const topRankedTeam = fifaRankingRows[0];
  const biggestMover = useMemo(() => {
    const withDiff = fifaRankingRows.filter((r) => (r.meta?.lastDelta || 0) > 0 || r.rankDiff > 0);
    if (withDiff.length === 0) return null;
    return [...withDiff].sort(
      (a, b) => b.rankDiff - a.rankDiff || (b.meta?.lastDelta || 0) - (a.meta?.lastDelta || 0)
    )[0];
  }, [fifaRankingRows]);

  const filteredRankingRows = useMemo(() => {
    const q = rankingSearch.trim().toLowerCase();
    const list = fifaRankingRows.filter((r) => {
      if (rankingConfedFilter !== 'ALL' && r.team.confederation !== rankingConfedFilter) return false;
      if (
        q &&
        !r.team.name.toLowerCase().includes(q) &&
        !r.team.code.toLowerCase().includes(q) &&
        !r.team.federationCode.toLowerCase().includes(q)
      ) {
        return false;
      }
      return true;
    });
    if (rankingSort === 'MOVERS') {
      return [...list].sort(
        (a, b) => b.rankDiff - a.rankDiff || (b.meta?.lastDelta || 0) - (a.meta?.lastDelta || 0)
      );
    }
    if (rankingSort === 'ALPHA') {
      return [...list].sort((a, b) => a.team.name.localeCompare(b.team.name));
    }
    return list;
  }, [fifaRankingRows, rankingConfedFilter, rankingSearch, rankingSort]);

  const jumpToInspectNation = (teamId: string) => {
    soundEngine.playClick();
    onSelectInspectTeam(teamId);
    onChangeWorldSubTab('nations');
  };

  return (
    <div className="space-y-5">
      {/* AREA 2 SUB-NAVIGATION */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1 p-1 bg-slate-950 border border-slate-800 rounded-xl overflow-x-auto max-w-full">
          {(
            [
              { id: 'nations', label: `Explorar Seleções (${NATIONAL_TEAMS_CATALOG.length})`, icon: Users },
              { id: 'wc_qualifiers', label: 'Eliminatórias da Copa', icon: Globe },
              { id: 'cont_qualifiers', label: 'Eliminatórias Continentais', icon: Shield },
              { id: 'world_cup', label: 'Copa do Mundo', icon: Trophy },
              { id: 'continentals', label: 'Continentais & Nations', icon: Medal },
              { id: 'ranking', label: 'Ranking FIFA', icon: Award },
            ] as const
          ).map((item) => {
            const Icon = item.icon;
            const active = worldSubTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  soundEngine.playClick();
                  onChangeWorldSubTab(item.id);
                }}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  active
                    ? 'bg-sky-400 text-slate-950 font-black'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ==================================================================== */}
      {/* WORLD TAB 1: EXPLORAR SELEÇÕES DO MUNDO (70 NAÇÕES)                  */}
      {/* ==================================================================== */}
      {worldSubTab === 'nations' && (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
          {/* LEFT 4 COLS: SEARCH + CONFEDERATION FILTER + NATIONS LIST */}
          <div className="xl:col-span-4 bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden">
            <div className="p-4 bg-black border-b border-slate-800 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-sm font-black text-white">Seleções Nacionais</h2>
                <span className="text-xs font-mono tabular-nums text-slate-400">
                  {filteredNationsList.length} exibidas
                </span>
              </div>

              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={nationSearch}
                  onChange={(e) => setNationSearch(e.target.value)}
                  placeholder="Buscar seleção ou federação..."
                  className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-400"
                />
              </div>

              <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800 overflow-x-auto">
                {CONFED_FILTERS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setNationConfed(c)}
                    className={`px-2 py-1 rounded text-[11px] font-bold whitespace-nowrap shrink-0 cursor-pointer ${
                      nationConfed === c
                        ? 'bg-sky-400 text-slate-950 font-black'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {c === 'ALL' ? 'Todas' : c}
                  </button>
                ))}
              </div>
            </div>

            <div className="divide-y divide-slate-800/60 max-h-[640px] overflow-y-auto">
              {filteredNationsList.map(({ team, rank }) => {
                const selected = team.id === inspectTeam.id;
                const isMine = activeUserTeamId === team.id;
                return (
                  <button
                    key={team.id}
                    type="button"
                    onClick={() => {
                      soundEngine.playClick();
                      onSelectInspectTeam(team.id);
                    }}
                    className={`w-full px-4 py-2.5 flex items-center justify-between gap-3 text-left transition-colors cursor-pointer ${
                      selected
                        ? 'bg-sky-500/15'
                        : isMine
                        ? 'bg-amber-500/10 hover:bg-amber-500/15'
                        : 'hover:bg-slate-900/50'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="w-6 text-[11px] font-mono tabular-nums text-slate-500 shrink-0">
                        #{rank}
                      </span>
                      <TeamCrest team={team} size="sm" />
                      <div className="min-w-0">
                        <span
                          className={`text-xs font-bold block truncate ${
                            selected ? 'text-sky-300 font-black' : isMine ? 'text-amber-300 font-black' : 'text-white'
                          }`}
                        >
                          {team.name}
                        </span>
                        <span className="text-[11px] text-slate-400">
                          {team.confederation} · {team.federationCode}
                        </span>
                      </div>
                    </div>

                    <div className="text-right font-mono tabular-nums shrink-0">
                      <span className="text-xs font-black text-amber-300 block">
                        OVR {team.strength}
                      </span>
                      {team.worldCupTitles > 0 && (
                        <span className="text-[10px] text-slate-400">{team.worldCupTitles}x Copa</span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* RIGHT 8 COLS: SELECTED NATION DOSSIER */}
          <div className="xl:col-span-8 space-y-4">
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-4 min-w-0">
                <TeamCrest team={inspectTeam} size="lg" />
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
                    <span className="text-sky-300 font-bold">{inspectTeam.confederation}</span>
                    <span aria-hidden="true">·</span>
                    <span>{inspectTeam.federationCode}</span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono tabular-nums">Ranking FIFA #{inspectRankRow?.rank || '-'}</span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono tabular-nums">Força {inspectTeam.strength}</span>
                  </div>
                  <h2 className="text-xl font-black text-white mt-0.5">{inspectTeam.name}</h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Estádio: {inspectTeam.homeStadium} · Copas do Mundo: {inspectTeam.worldCupTitles} · Títulos Continentais: {inspectTeam.continentalTitles}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2.5 shrink-0">
                {activeUserTeamId === inspectTeam.id ? (
                  <span className="text-xs font-black text-emerald-400">Seu Comando Atual</span>
                ) : managerReputation >= inspectTeam.minReputationToCoach ? (
                  <button
                    type="button"
                    onClick={() => onAppointNation(inspectTeam)}
                    className="px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-black whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    Assumir {inspectTeam.name}
                  </button>
                ) : (
                  <span className="text-xs text-slate-400 font-mono tabular-nums">
                    Requer Reputação {inspectTeam.minReputationToCoach}/100
                  </span>
                )}
              </div>
            </div>

            {/* Sub-switcher inside Nation Dossier */}
            <div className="flex items-center gap-1 p-1 bg-slate-950 border border-slate-800 rounded-xl w-fit">
              {(
                [
                  { id: 'lineup', label: 'Campo (11+15)', icon: LayoutGrid },
                  { id: 'squad', label: `Convocados (${inspectCalledRoster.length})`, icon: Users },
                  { id: 'matches', label: `Jogos em ${calendarYear} (${inspectFixtures.length})`, icon: Globe },
                ] as const
              ).map((t) => {
                const Icon = t.icon;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setInspectDetailTab(t.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap shrink-0 cursor-pointer ${
                      inspectDetailTab === t.id
                        ? 'bg-amber-400 text-slate-950 font-black'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{t.label}</span>
                  </button>
                );
              })}
            </div>

            {inspectDetailTab === 'lineup' && (
              <SelecaoTacticalBoard
                team={inspectTeam}
                isEditable={false}
                formation={inspectSquad.formation}
                tacticStyle={nationalTeam.tacticStyle}
                captainPlayerId={inspectSquad.captainId}
                calledUpPlayers={inspectCalledRoster}
                starterIds={inspectSquad.starterIds}
                readyFixture={null}
                onChangeFormation={() => {}}
                onChangeTacticStyle={() => {}}
                onSwapPlayers={() => {}}
                onAutoPickStartersOnly={() => {}}
                onSetCaptain={() => {}}
              />
            )}

            {inspectDetailTab === 'squad' && (
              <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden">
                <div className="p-4 bg-black border-b border-slate-800 flex items-center justify-between text-xs">
                  <span className="font-black text-white">
                    Elenco Convocado (26) · {inspectTeam.name}
                  </span>
                  <span className="text-slate-400 font-mono tabular-nums">
                    Pool Total: {inspectPool.length} atletas
                  </span>
                </div>
                <div className="overflow-x-auto max-h-[540px]">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-black text-slate-400 border-b border-slate-800 sticky top-0">
                      <tr>
                        <th className="py-2.5 px-3">#</th>
                        <th className="py-2.5 px-3">Atleta</th>
                        <th className="py-2.5 px-2">Clube</th>
                        <th className="py-2.5 px-2 text-center">Pos</th>
                        <th className="py-2.5 px-2 text-center">OVR</th>
                        <th className="py-2.5 px-3 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {inspectCalledRoster.map((p, i) => {
                        const isStarter = inspectSquad.starterIds.includes(p.id);
                        return (
                          <tr key={p.id} className="hover:bg-slate-900/40">
                            <td className="py-2 px-3 font-mono tabular-nums text-slate-500">
                              {i + 1}
                            </td>
                            <td className="py-2 px-3 font-bold text-white">
                              {p.name}{' '}
                              <span className="text-[11px] font-normal text-slate-400 font-mono tabular-nums">
                                {p.age}a
                              </span>
                            </td>
                            <td className="py-2 px-2 text-slate-300">{p.clubShortName}</td>
                            <td className="py-2 px-2 text-center font-mono text-slate-400">
                              {p.detailedRole}
                            </td>
                            <td className="py-2 px-2 text-center font-mono tabular-nums font-black text-amber-400">
                              {p.overall}
                            </td>
                            <td className="py-2 px-3 text-right">
                              <span
                                className={`text-xs font-bold ${
                                  isStarter ? 'text-emerald-400' : 'text-slate-400'
                                }`}
                              >
                                {isStarter ? 'Titular' : 'Suplente'}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {inspectDetailTab === 'matches' && (
              <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden">
                <div className="p-4 bg-black border-b border-slate-800 flex items-center justify-between text-xs">
                  <span className="font-black text-white">
                    Calendário {calendarYear} · {inspectTeam.name}
                  </span>
                </div>
                {inspectFixtures.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-400">
                    Nenhum compromisso oficial registrado em {calendarYear} para {inspectTeam.name}.
                  </div>
                ) : (
                  <div className="divide-y divide-slate-800/60">
                    {inspectFixtures.map((fix) => {
                      const h = getNationalTeamById(fix.homeTeamId);
                      const a = getNationalTeamById(fix.awayTeamId);
                      return (
                        <div
                          key={fix.id}
                          className="px-4 py-3 flex flex-wrap items-center justify-between gap-3 text-xs"
                        >
                          <div className="text-slate-400">
                            <span className="text-amber-300 font-bold">{fix.competitionName}</span> · {fix.phase}
                            <span className="block text-[11px] text-slate-500 font-mono tabular-nums">
                              {fix.date ? `${formatShortDate(fix.date)} · ${fix.time || '20:00'}` : fix.dateLabel} · {fix.stadiumName}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 font-mono tabular-nums">
                            <button
                              type="button"
                              onClick={() => onSelectInspectTeam(h.id)}
                              className="font-sans font-bold text-white hover:text-sky-300 cursor-pointer"
                            >
                              {h.name}
                            </button>
                            <span className="px-2.5 py-1 rounded bg-black border border-slate-800 font-black text-amber-300">
                              {fix.played ? `${fix.homeScore} x ${fix.awayScore}` : 'vs'}
                            </span>
                            <button
                              type="button"
                              onClick={() => onSelectInspectTeam(a.id)}
                              className="font-sans font-bold text-white hover:text-sky-300 cursor-pointer"
                            >
                              {a.name}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* WORLD TAB 2: ELIMINATÓRIAS DA COPA DO MUNDO (TODAS AS 6 CONFEDS)     */}
      {/* ==================================================================== */}
      {worldSubTab === 'wc_qualifiers' && activeQualifiers && (
        <div className="space-y-5">
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-black text-white">
                Eliminatórias da Copa do Mundo FIFA {activeQualifiers.targetWorldCupYear}
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                {qualConfed === 'VAGAS'
                  ? `Divisão Oficial FIFA das 48 Vagas · Copa do Mundo ${activeQualifiers.targetWorldCupYear}${
                      activeQualifiers.targetWorldCupYear === 2030
                        ? ' (6 Sedes descontadas + 40 via Eliminatórias + 2 Repescagem Intercontinental)'
                        : ' (46 vagas diretas por confederação + 2 Repescagem Intercontinental)'
                    }`
                  : qualConfed === 'REPESCAGEM'
                  ? 'Repescagem Intercontinental FIFA · 6 Seleções (1 CAF, 1 AFC, 1 CONMEBOL, 1 OFC, 2 CONCACAF) → 2 Vagas Finais em Março'
                  : qualConfed === 'CONMEBOL'
                  ? activeQualifiers.targetWorldCupYear === 2030
                    ? 'CONMEBOL · 10 Seleções (18 rodadas) · 6 vagas diretas (3 Sedes: ARG/PAR/URU + 3 via Eliminatórias) + 1 Repescagem Mundial'
                    : 'CONMEBOL · 10 Seleções em pontos corridos (18 rodadas) · 6 vagas diretas + 1 Repescagem Mundial'
                  : `Eliminatórias ${qualConfed} · ${OTHER_WC_QUAL_HINTS[qualConfed as 'UEFA' | 'CAF' | 'AFC' | 'CONCACAF' | 'OFC'].label}`}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {nationalTeam.completedQualifiersArchive && (
                <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800">
                  <button
                    type="button"
                    onClick={() => setQualCycleMode('ACTIVE')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold whitespace-nowrap shrink-0 cursor-pointer ${
                      qualCycleMode === 'ACTIVE'
                        ? 'bg-sky-400 text-slate-950 font-black'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Ciclo Copa {nationalTeam.qualifiers?.targetWorldCupYear || 2030}
                  </button>
                  <button
                    type="button"
                    onClick={() => setQualCycleMode('ARCHIVE')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold whitespace-nowrap shrink-0 cursor-pointer ${
                      qualCycleMode === 'ARCHIVE'
                        ? 'bg-sky-400 text-slate-950 font-black'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Ciclo Copa {nationalTeam.completedQualifiersArchive.targetWorldCupYear} (Concluído)
                  </button>
                </div>
              )}

              <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800 overflow-x-auto">
                {(
                  [
                    { id: 'VAGAS', label: 'Vagas (48)' },
                    { id: 'CONMEBOL', label: 'CONMEBOL' },
                    { id: 'UEFA', label: 'UEFA' },
                    { id: 'CAF', label: 'CAF' },
                    { id: 'AFC', label: 'AFC' },
                    { id: 'CONCACAF', label: 'CONCACAF' },
                    { id: 'OFC', label: 'OFC' },
                    { id: 'REPESCAGEM', label: 'Repescagem Mundial' },
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => {
                      setQualConfed(tab.id);
                      setSelectedOtherQualRound(1);
                    }}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold whitespace-nowrap shrink-0 cursor-pointer ${
                      qualConfed === tab.id
                        ? tab.id === 'REPESCAGEM'
                          ? 'bg-emerald-400 text-slate-950 font-black'
                          : 'bg-amber-400 text-slate-950 font-black'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {(() => {
            const wcQualDone = isWorldCupQualifiersComplete(nationalTeam.qualifiers);
            const wcDrawInfo = getNationalTournamentDrawInfo(
              nationalTeam,
              'world_cup',
              calendarYear
            );
            if (!wcQualDone || !wcDrawInfo || !wcDrawInfo.canDrawGroups) return null;
            return (
              <div className="bg-amber-500/10 border border-amber-400/35 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-xl bg-amber-400/20 border border-amber-400/40 text-amber-300 shrink-0">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-white">
                      Eliminatórias Concluídas · {wcDrawInfo.title}
                    </h3>
                    <p className="text-xs text-slate-300 mt-0.5">
                      As 48 seleções classificadas estão definidas nos 4 potes FIFA.{' '}
                      {wcDrawInfo.userTeamQualified
                        ? 'Sua seleção garantiu vaga!'
                        : 'Gere agora o sorteio oficial dos 12 grupos (A–L).'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playClick();
                    onOpenTournamentDraw?.('world_cup');
                  }}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-slate-950 text-xs font-black whitespace-nowrap shrink-0 cursor-pointer shadow-lg shadow-emerald-500/20"
                >
                  <Shuffle className="w-4 h-4" />
                  <span>
                    {wcDrawInfo.alreadyDrawn
                      ? 'Sortear / Rever Grupos da Copa'
                      : 'Gerar Sorteio da Copa do Mundo'}
                  </span>
                </button>
              </div>
            );
          })()}

          {qualConfed === 'VAGAS' ? (
            (() => {
              const slotRows = getWorldCup48SlotsSummary(activeQualifiers.targetWorldCupYear);
              const is2030 = activeQualifiers.targetWorldCupYear === 2030;
              const totalHosts = slotRows.reduce((acc, r) => acc + r.hostSpots, 0);
              const totalQualSpots = slotRows.reduce((acc, r) => acc + r.qualifierSpots, 0);
              return (
                <div className="space-y-5">
                  <div className="bg-slate-950 border border-amber-500/35 rounded-2xl overflow-hidden">
                    <div className="p-4 bg-black border-b border-slate-800 flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <h3 className="text-sm font-black text-amber-300">
                          Distribuição Oficial das 48 Vagas · Copa do Mundo FIFA {activeQualifiers.targetWorldCupYear}
                        </h3>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {is2030
                            ? 'Formato mantido de 48 seleções, descontando os 6 países-sede já classificados automaticamente de suas respectivas confederações.'
                            : 'Formato oficial FIFA de 48 seleções distribuídas pelas 6 confederações + 2 vagas finais na Repescagem Intercontinental.'}
                        </p>
                      </div>
                      <span className="px-2.5 py-1 rounded-lg bg-amber-500/15 border border-amber-400/40 text-amber-300 text-xs font-black">
                        TOTAL: 48 SELEÇÕES
                      </span>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-900/70 text-slate-400 border-b border-slate-800">
                          <tr>
                            <th className="py-2.5 px-4">Confederação</th>
                            <th className="py-2.5 px-3 text-center">Total Vagas Diretas</th>
                            <th className="py-2.5 px-3">Sedes (Classificadas)</th>
                            <th className="py-2.5 px-3 text-center">Em Disputa nas Eliminatórias</th>
                            <th className="py-2.5 px-4">Repescagem Mundial</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60">
                          {slotRows.map((sr) => (
                            <tr
                              key={sr.key}
                              onClick={() => {
                                if (sr.key === 'INTERCONTINENTAL') setQualConfed('REPESCAGEM');
                                else setQualConfed(sr.key);
                              }}
                              className="hover:bg-slate-900/50 cursor-pointer transition-colors"
                            >
                              <td className="py-3 px-4 font-bold text-white">{sr.confederationLabel}</td>
                              <td className="py-3 px-3 text-center font-mono font-black text-emerald-400 text-sm">
                                {sr.totalDirectSpots}
                              </td>
                              <td className="py-3 px-3 text-amber-300 font-semibold">
                                {sr.hostNamesLabel}
                              </td>
                              <td className="py-3 px-3 text-center font-mono font-black text-sky-300 text-sm">
                                {sr.key === 'INTERCONTINENTAL' ? '—' : sr.qualifierSpots}
                              </td>
                              <td className="py-3 px-4 text-slate-300">{sr.intercontinentalLabel}</td>
                            </tr>
                          ))}
                          <tr className="bg-black/80 font-black text-white border-t-2 border-slate-700">
                            <td className="py-3 px-4">TOTAL</td>
                            <td className="py-3 px-3 text-center font-mono text-amber-300 text-sm">48</td>
                            <td className="py-3 px-3 font-mono text-amber-300">{totalHosts}</td>
                            <td className="py-3 px-3 text-center font-mono text-sky-300 text-sm">{totalQualSpots}</td>
                            <td className="py-3 px-4 text-emerald-300">2 vagas finais (6 seleções)</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-2">
                      <h4 className="text-xs font-black text-emerald-300 uppercase tracking-wider">
                        Repescagem Intercontinental FIFA (6 Seleções → 2 Vagas)
                      </h4>
                      <p className="text-xs text-slate-300 leading-relaxed">
                        Reúne <strong className="text-white">6 seleções</strong>: 1 da CAF, 1 da AFC, 1 da CONMEBOL, 1 da OFC e{' '}
                        <strong className="text-amber-300">2 da CONCACAF</strong> (1 vaga padrão + 1 extra por ser a confederação da sede anterior, em 2026).
                        As <strong className="text-white">4 piores ranqueadas no Ranking FIFA</strong> disputam 2 semifinais em jogo único; as duas vencedoras encaram as{' '}
                        <strong className="text-emerald-300">2 melhores ranqueadas</strong> nas 2 finais de março de {activeQualifiers.targetWorldCupYear} pelas últimas 2 vagas na Copa.
                      </p>
                    </div>
                    <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-2">
                      <h4 className="text-xs font-black text-sky-300 uppercase tracking-wider">
                        Critérios FIFA de Desempate &amp; Repescagem Europeia
                      </h4>
                      <p className="text-xs text-slate-300 leading-relaxed">
                        Em igualdade de pontos na fase de grupos, vale a ordem FIFA:{' '}
                        <strong className="text-white">1º saldo de gols geral · 2º gols marcados · 3º confronto direto</strong> entre as equipes empatadas.
                        Na Europa (UEFA), o Play-Off reúne <strong className="text-white">16 seleções em 4 potes</strong> (Potes 1–3 pelo Ranking FIFA + Pote 4 da Liga 2 / Nations League), com{' '}
                        <strong className="text-sky-300">Pote 1 × Pote 4</strong> e <strong className="text-sky-300">Pote 2 × Pote 3</strong> e mando de campo para o melhor ranqueado.
                        {is2030 && (
                          <>
                            {' '}Em 2030, <strong className="text-amber-300">Espanha e Portugal</strong> já têm vagas garantidas!
                          </>
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })()
          ) : qualConfed === 'REPESCAGEM' ? (
            (() => {
              const icParticipants = getIntercontinentalPlayoffParticipants(
                activeQualifiers,
                nationalTeam.fifaRankingPoints
              );
              const icFixtures = (activeQualifiers.otherConfedFixtures || []).filter((f) =>
                f.phase.startsWith('Repescagem Intercontinental')
              );
              const icSemis = icFixtures
                .filter((f) => f.phase === 'Repescagem Intercontinental · Semifinal')
                .sort((a, b) => (a.knockoutSlot || 0) - (b.knockoutSlot || 0));
              const icFinals = icFixtures
                .filter((f) => f.phase === 'Repescagem Intercontinental · Final')
                .sort((a, b) => (a.knockoutSlot || 0) - (b.knockoutSlot || 0));

              return (
                <div className="space-y-5">
                  <div className="bg-slate-950 border border-emerald-500/35 rounded-2xl p-4 space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h3 className="text-sm font-black text-emerald-300">
                        Repescagem Intercontinental FIFA · Copa {activeQualifiers.targetWorldCupYear} (6 Seleções → 2 Vagas)
                      </h3>
                      <span className="text-[11px] font-mono text-slate-400">
                        Março de {activeQualifiers.targetWorldCupYear} · Chaveamento pelo Ranking FIFA
                      </span>
                    </div>
                    <p className="text-xs text-slate-300">
                      Participam <strong className="text-white">1 CAF · 1 AFC · 1 CONMEBOL · 1 OFC · 2 CONCACAF</strong>. As <strong className="text-emerald-300">2 melhores no Ranking FIFA</strong> avançam direto às 2 Finais; as <strong className="text-sky-300">4 demais</strong> disputam 2 Semifinais em jogo único (sem confronto da mesma confederação).
                    </p>
                  </div>

                  <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden">
                    <div className="px-4 py-3 bg-black border-b border-slate-800 flex items-center justify-between">
                      <span className="text-xs font-black text-white">
                        6 Seleções Classificadas / Projetadas (Ordem do Ranking FIFA)
                      </span>
                      <span className="text-[11px] text-slate-400">
                        #1 e #2 Cabeças de Chave (Final) · #3–#6 Semifinais
                      </span>
                    </div>
                    <div className="divide-y divide-slate-800/60">
                      {icParticipants.map((p) => {
                        const team = getNationalTeamById(p.teamId);
                        const isMine = activeUserTeamId === p.teamId;
                        return (
                          <div
                            key={p.teamId}
                            onClick={() => jumpToInspectNation(p.teamId)}
                            className={`px-4 py-3 flex flex-wrap items-center justify-between gap-3 cursor-pointer ${
                              isMine ? 'bg-amber-500/10' : 'hover:bg-slate-900/50'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <span
                                className={`w-7 h-7 rounded-lg flex items-center justify-center font-mono text-xs font-black ${
                                  p.hasByeToFinal
                                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                    : 'bg-sky-500/15 text-sky-300 border border-sky-500/35'
                                }`}
                              >
                                #{p.seedRank}
                              </span>
                              <TeamCrest team={team} size="sm" />
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className={`text-xs font-bold ${isMine ? 'text-amber-300 font-black' : 'text-white'}`}>
                                    {team.name}
                                  </span>
                                  <span className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700 text-[10px] font-bold text-slate-300">
                                    {p.confederation}
                                  </span>
                                </div>
                                <div className="text-[11px] text-slate-400">{p.qualificationLabel}</div>
                              </div>
                            </div>

                            <div className="flex items-center gap-3">
                              <span className="font-mono text-xs font-bold text-slate-300">
                                {Math.round(p.fifaPoints)} pts FIFA
                              </span>
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-black ${
                                  p.hasByeToFinal
                                    ? 'bg-emerald-500/15 border border-emerald-500/40 text-emerald-300'
                                    : 'bg-sky-500/15 border border-sky-500/40 text-sky-300'
                                }`}
                              >
                                {p.hasByeToFinal ? 'Direto na Final (Bye)' : 'Entra na Semifinal'}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {icFixtures.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {[
                        { title: 'Semifinais (4 Piores no Ranking FIFA)', list: icSemis, accent: 'text-sky-300' },
                        { title: 'Finais (Valendo as 2 Últimas Vagas na Copa)', list: icFinals, accent: 'text-emerald-300' },
                      ].map((sec) => (
                        <div
                          key={sec.title}
                          className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden"
                        >
                          <div className="px-4 py-3 bg-black border-b border-slate-800">
                            <span className={`text-xs font-black ${sec.accent}`}>{sec.title}</span>
                          </div>
                          {sec.list.length === 0 ? (
                            <div className="p-4 text-xs text-slate-500">
                              Aguardando definição dos vencedores das Semifinais.
                            </div>
                          ) : (
                            <div className="divide-y divide-slate-800/60">
                              {sec.list.map((fix) => {
                                const h = getNationalTeamById(fix.homeTeamId);
                                const a = getNationalTeamById(fix.awayTeamId);
                                const involvesUser =
                                  activeUserTeamId &&
                                  (fix.homeTeamId === activeUserTeamId || fix.awayTeamId === activeUserTeamId);
                                return (
                                  <div key={fix.id} className="p-4 space-y-2.5">
                                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                                      <span className={`font-bold ${sec.accent}`}>{fix.dateLabel}</span>
                                      <span className="font-mono text-slate-500">{fix.stadiumName}</span>
                                    </div>
                                    <div className="flex items-center justify-between gap-2">
                                      <button
                                        type="button"
                                        onClick={() => jumpToInspectNation(h.id)}
                                        className="flex items-center gap-2 min-w-0 flex-1 text-left hover:text-sky-300 cursor-pointer"
                                      >
                                        <TeamCrest team={h} size="sm" />
                                        <span className="text-xs font-bold text-white truncate">{h.name}</span>
                                      </button>
                                      <div className="px-3 py-1 rounded bg-black border border-slate-800 font-mono tabular-nums text-xs font-black text-amber-300 shrink-0 text-center">
                                        {fix.played ? (
                                          <>
                                            <span>
                                              {fix.homeScore} x {fix.awayScore}
                                            </span>
                                            {fix.penaltiesHome !== undefined && (
                                              <span className="block text-[9px] text-sky-300">
                                                ({fix.penaltiesHome}–{fix.penaltiesAway} pen)
                                              </span>
                                            )}
                                          </>
                                        ) : (
                                          'vs'
                                        )}
                                      </div>
                                      <button
                                        type="button"
                                        onClick={() => jumpToInspectNation(a.id)}
                                        className="flex items-center gap-2 min-w-0 flex-1 justify-end text-right hover:text-sky-300 cursor-pointer"
                                      >
                                        <span className="text-xs font-bold text-white truncate">{a.name}</span>
                                        <TeamCrest team={a} size="sm" />
                                      </button>
                                    </div>
                                    {fix.status === 'READY_FOR_USER' && !fix.played && involvesUser && (
                                      <button
                                        type="button"
                                        onClick={() => onLaunchMatch(fix)}
                                        className="w-full py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 text-[11px] font-black cursor-pointer"
                                      >
                                        Escalar Time &amp; Jogar Repescagem Mundial
                                      </button>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 text-xs text-slate-400">
                      Os confrontos oficiais da Repescagem Intercontinental serão gerados automaticamente assim que as eliminatórias de CONMEBOL, CAF (com Play-Off), AFC (com Play-Off), CONCACAF e OFC forem concluídas, sendo disputados em março de {activeQualifiers.targetWorldCupYear}.
                    </div>
                  )}
                </div>
              );
            })()
          ) : qualConfed === 'CONMEBOL' ? (
            (() => {
              const is2030 = activeQualifiers.targetWorldCupYear === 2030;
              const conmebolHosts2030 = new Set(['nt_arg', 'nt_par', 'nt_uru']);
              const conmebolDirectSet = new Set<string>(is2030 ? ['nt_arg', 'nt_par', 'nt_uru'] : []);
              for (const r of activeQualifiers.conmebolStandings) {
                if (conmebolDirectSet.size >= 6) break;
                conmebolDirectSet.add(r.teamId);
              }
              const conmebolPlayoffTeamId = activeQualifiers.conmebolStandings.find(
                (r) => !conmebolDirectSet.has(r.teamId)
              )?.teamId;

              return (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              <div className="lg:col-span-7 bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden">
                <div className="p-4 bg-black border-b border-slate-800 flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-black text-white">Tabela Oficial CONMEBOL · 10 Seleções</span>
                  <span className="text-xs text-slate-400">
                    {is2030
                      ? '3 Sedes (ARG/PAR/URU) + 3 Diretas · 1 Repescagem Mundial'
                      : '1º–6º Copa Direta · 7º Repescagem Mundial'}
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-black text-slate-400 border-b border-slate-800">
                      <tr>
                        <th className="py-2.5 px-3">#</th>
                        <th className="py-2.5 px-3">Seleção</th>
                        <th className="py-2.5 px-2 text-right">PTS</th>
                        <th className="py-2.5 px-2 text-right">J</th>
                        <th className="py-2.5 px-2 text-right">V</th>
                        <th className="py-2.5 px-2 text-right">E</th>
                        <th className="py-2.5 px-2 text-right">D</th>
                        <th className="py-2.5 px-2 text-right">GP:GC</th>
                        <th className="py-2.5 px-3 text-right">SG</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-mono tabular-nums">
                      {activeQualifiers.conmebolStandings.map((row, idx) => {
                        const t = getNationalTeamById(row.teamId);
                        const isMine = activeUserTeamId === row.teamId;
                        const pos = idx + 1;
                        const isHost2030 = is2030 && conmebolHosts2030.has(row.teamId);
                        const isDirect = conmebolDirectSet.has(row.teamId);
                        const isPlayoff = row.teamId === conmebolPlayoffTeamId;
                        return (
                          <tr
                            key={row.teamId}
                            onClick={() => jumpToInspectNation(row.teamId)}
                            className={`cursor-pointer transition-colors ${
                              isMine ? 'bg-amber-500/10 hover:bg-amber-500/15' : 'hover:bg-slate-900/50'
                            }`}
                          >
                            <td
                              className={`py-2.5 px-3 font-black ${
                                isHost2030
                                  ? 'text-amber-300'
                                  : isDirect
                                  ? 'text-emerald-400'
                                  : isPlayoff
                                  ? 'text-sky-400'
                                  : 'text-slate-500'
                              }`}
                            >
                              {pos}º
                            </td>
                            <td className="py-2.5 px-3 font-sans">
                              <div className="flex items-center gap-2.5">
                                <TeamCrest team={t} size="sm" />
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span
                                    className={`font-bold ${
                                      isMine ? 'text-amber-300 font-black' : 'text-white hover:text-sky-300'
                                    }`}
                                  >
                                    {t.name}
                                  </span>
                                  {isHost2030 ? (
                                    <span className="px-1.5 py-0.5 rounded bg-amber-500/15 border border-amber-400/40 text-amber-300 text-[10px] font-bold">
                                      SEDE 2030
                                    </span>
                                  ) : isDirect ? (
                                    <span className="text-[10px] text-emerald-400/90 font-semibold">
                                      Vaga Direta
                                    </span>
                                  ) : isPlayoff ? (
                                    <span className="px-1.5 py-0.5 rounded bg-sky-500/15 border border-sky-500/40 text-sky-300 text-[10px] font-bold">
                                      Repescagem Mundial
                                    </span>
                                  ) : null}
                                </div>
                              </div>
                            </td>
                            <td className="py-2.5 px-2 text-right font-black text-white text-sm">{row.points}</td>
                            <td className="py-2.5 px-2 text-right text-slate-300">{row.played}</td>
                            <td className="py-2.5 px-2 text-right text-emerald-400">{row.won}</td>
                            <td className="py-2.5 px-2 text-right text-slate-400">{row.drawn}</td>
                            <td className="py-2.5 px-2 text-right text-rose-400">{row.lost}</td>
                            <td className="py-2.5 px-2 text-right text-slate-400">
                              {row.goalsFor}:{row.goalsAgainst}
                            </td>
                            <td className="py-2.5 px-3 text-right font-bold text-slate-200">
                              {row.goalDifference > 0 ? `+${row.goalDifference}` : row.goalDifference}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="lg:col-span-5 bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden">
                <div className="p-4 bg-black border-b border-slate-800 flex items-center justify-between gap-2">
                  <span className="text-xs font-black text-white">Jogos da Rodada {selectedQualRound}/18</span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setSelectedQualRound((r) => Math.max(1, r - 1))}
                      className="px-2.5 py-1 rounded bg-slate-900 border border-slate-700 text-xs font-bold text-slate-200 hover:bg-slate-800 cursor-pointer"
                    >
                      Anterior
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedQualRound((r) => Math.min(18, r + 1))}
                      className="px-2.5 py-1 rounded bg-slate-900 border border-slate-700 text-xs font-bold text-slate-200 hover:bg-slate-800 cursor-pointer"
                    >
                      Próxima
                    </button>
                  </div>
                </div>

                <div className="divide-y divide-slate-800/60">
                  {activeQualifiers.conmebolFixtures
                    .filter((f) => f.qualifiersRound === selectedQualRound)
                    .map((fix) => {
                      const h = getNationalTeamById(fix.homeTeamId);
                      const a = getNationalTeamById(fix.awayTeamId);
                      const involvesUser =
                        activeUserTeamId &&
                        (fix.homeTeamId === activeUserTeamId || fix.awayTeamId === activeUserTeamId);
                      return (
                        <div key={fix.id} className="p-3.5 space-y-2">
                          <div className="flex items-center justify-between text-[11px] text-slate-500">
                            <span>{fix.dateLabel}</span>
                            <span className="font-mono tabular-nums">
                              Temp. {fix.seasonYear} · R{fix.triggerRound}
                            </span>
                          </div>
                          <div className="flex items-center justify-between gap-2">
                            <button
                              type="button"
                              onClick={() => jumpToInspectNation(h.id)}
                              className="flex items-center gap-2 min-w-0 flex-1 text-left hover:text-sky-300 cursor-pointer"
                            >
                              <TeamCrest team={h} size="sm" />
                              <span className="text-xs font-bold text-white truncate">{h.name}</span>
                            </button>

                            <div className="px-3 py-1 rounded bg-black border border-slate-800 font-mono tabular-nums text-xs font-black text-amber-300 shrink-0">
                              {fix.played ? `${fix.homeScore} x ${fix.awayScore}` : 'vs'}
                            </div>

                            <button
                              type="button"
                              onClick={() => jumpToInspectNation(a.id)}
                              className="flex items-center gap-2 min-w-0 flex-1 justify-end text-right hover:text-sky-300 cursor-pointer"
                            >
                              <span className="text-xs font-bold text-white truncate">{a.name}</span>
                              <TeamCrest team={a} size="sm" />
                            </button>
                          </div>

                          {fix.status === 'READY_FOR_USER' && !fix.played && involvesUser && (
                            <button
                              type="button"
                              onClick={() => onLaunchMatch(fix)}
                              className="w-full py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 text-[11px] font-black cursor-pointer"
                            >
                              Escalar Time & Jogar Partida
                            </button>
                          )}
                        </div>
                      );
                    })}
                </div>
              </div>
            </div>
              );
            })()
          ) : (
            (() => {
              const confKey = qualConfed as 'UEFA' | 'CAF' | 'AFC' | 'CONCACAF' | 'OFC';
              const confRows = activeQualifiers.otherConfedStandings?.[confKey] || [];
              const groups = Array.from(new Set(confRows.map((r) => r.group || 'Grupo A'))).sort();
              const confFixtures = (activeQualifiers.otherConfedFixtures || []).filter((f) =>
                f.competitionName.includes(`Eliminatórias ${confKey}`)
              );
              const isNewAfcFormat = confKey === 'AFC' && groups.length >= 6;
              const isNewUefaWcFormat =
                confKey === 'UEFA' &&
                groups.some((g) => g.startsWith('Liga 1') || g.startsWith('Liga 2'));
              const afcPlayoffFixes =
                confKey === 'AFC'
                  ? confFixtures.filter((f) => !f.group && f.phase.startsWith('Play-Off AFC'))
                  : [];
              const cafPlayoffFixes =
                confKey === 'CAF'
                  ? confFixtures.filter((f) => !f.group && f.phase.startsWith('Play-Off CAF'))
                  : [];
              const uefaPlayoffFixes =
                confKey === 'UEFA'
                  ? confFixtures.filter((f) => !f.group && f.phase.startsWith('Play-Off UEFA'))
                  : [];
              const uefaLeague2PlayoffSet = new Set<string>();
              if (isNewUefaWcFormat) {
                const l2Rows = confRows
                  .filter((r) => (r.group || '').startsWith('Liga 2'))
                  .slice()
                  .sort((a, b) => {
                    if (b.points !== a.points) return b.points - a.points;
                    if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
                    if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor;
                    return b.won - a.won;
                  });
                l2Rows.slice(0, 4).forEach((r) => uefaLeague2PlayoffSet.add(r.teamId));
              }
              const cafRunnerUpRankMap = new Map<string, number>();
              if (confKey === 'CAF') {
                const runnersUp = groups
                  .map((g) => confRows.filter((r) => r.group === g)[1])
                  .filter(Boolean)
                  .sort((a, b) => {
                    if (b.points !== a.points) return b.points - a.points;
                    if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
                    if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor;
                    return b.won - a.won;
                  });
                runnersUp.forEach((ru, i) => cafRunnerUpRankMap.set(ru.teamId, i + 1));
              }
              const concacafRunnerRankMap = new Map<string, number>();
              if (confKey === 'CONCACAF' && groups.length >= 4) {
                const concRunners = groups
                  .map((g) => confRows.filter((r) => r.group === g)[1])
                  .filter(Boolean)
                  .sort((a, b) => {
                    if (b.points !== a.points) return b.points - a.points;
                    if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
                    if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor;
                    return b.won - a.won;
                  });
                concRunners.forEach((ru, i) => concacafRunnerRankMap.set(ru.teamId, i + 1));
              }
              const totalOtherRounds =
                confKey === 'OFC'
                  ? groups.length === 1
                    ? 11
                    : 10
                  : isNewUefaWcFormat
                  ? 6
                  : confKey === 'UEFA' || confKey === 'CAF' || isNewAfcFormat
                  ? 10
                  : 6;
              const clampedRound = Math.min(totalOtherRounds, selectedOtherQualRound);
              const roundFixes = confFixtures.filter(
                (f) => Boolean(f.group) && f.id.includes(`_r${clampedRound}_`)
              );
              const directCut = isNewUefaWcFormat
                ? 4
                : isNewAfcFormat
                ? 1
                : confKey === 'AFC'
                ? 2
                : OTHER_WC_QUAL_HINTS[confKey].spotsPerGroup;
              const wc2030CohostSet = new Set<string>(WORLD_CUP_2030_COHOSTS);

              return (
                <div className="space-y-5">
                  {isNewUefaWcFormat && (
                    <div className="bg-slate-950 border border-sky-500/35 rounded-xl px-4 py-3 text-xs text-slate-300 leading-relaxed">
                      <strong className="text-sky-300">
                        Eliminatórias UEFA ({activeQualifiers.targetWorldCupYear} · 54 Seleções → 16 Vagas):
                      </strong>{' '}
                      <strong className="text-white">Liga 1 (36 seleções · 3 grupos de 12 · Set–Nov)</strong> e{' '}
                      <strong className="text-white">Liga 2 (18 seleções · 3 grupos de 6 · Mar–Set)</strong>.{' '}
                      {activeQualifiers.targetWorldCupYear === 2030 ? (
                        <>
                          Em <strong className="text-amber-300">2030</strong>, <strong className="text-amber-300">Espanha e Portugal</strong> já têm vaga garantida como sedes (2 sedes + <strong className="text-emerald-300">14 vagas via Eliminatórias</strong>: 10 diretas da Liga 1 + 4 no Play-Off UEFA = 16).{' '}
                        </>
                      ) : (
                        <>
                          Os <strong className="text-emerald-300">12 classificados diretos da Liga 1</strong> somam-se aos <strong className="text-sky-300">4 vencedores do Play-Off UEFA</strong> (total 16 vagas).{' '}
                        </>
                      )}
                      Play-Off UEFA em março de {activeQualifiers.targetWorldCupYear}: 16 seleções em 4 potes (Potes 1–3 pelo Ranking FIFA + Pote 4 da Liga 2), com <strong className="text-white">Pote 1 × Pote 4</strong> e <strong className="text-white">Pote 2 × Pote 3</strong> (mando do melhor ranqueado).
                    </div>
                  )}
                  {confKey === 'CAF' && (
                    <div className="bg-slate-950 border border-emerald-500/30 rounded-xl px-4 py-3 text-xs text-slate-300">
                      <strong className="text-emerald-300">Formato Oficial CAF (54 Seleções FIFA):</strong>{' '}
                      9 grupos de 6 seleções em ida e volta (10 rodadas · Zanzibar e Reunião não participam das Eliminatórias da Copa).{' '}
                      {activeQualifiers.targetWorldCupYear === 2030 ? (
                        <>
                          Em <strong className="text-amber-300">2030</strong>, <strong className="text-amber-300">Marrocos</strong> tem vaga garantida como país-sede (1 sede + <strong className="text-white">8 vagas diretas</strong> nas eliminatórias = 9), e o campeão do <strong className="text-sky-300">Play-Off CAF</strong> conquista 1 vaga na Repescagem Intercontinental.
                        </>
                      ) : (
                        <>
                          Os <strong className="text-white">9 campeões de grupo</strong> vão direto à Copa do Mundo e os <strong className="text-sky-300">4 melhores segundos colocados</strong> disputam o Play-Off da África por 1 vaga na Repescagem Intercontinental.
                        </>
                      )}
                    </div>
                  )}
                  {confKey === 'CONCACAF' && (
                    <div className="bg-slate-950 border border-amber-500/30 rounded-xl px-4 py-3 text-xs text-slate-300">
                      <strong className="text-amber-300">Vagas CONCACAF (Copa {activeQualifiers.targetWorldCupYear}):</strong>{' '}
                      Os <strong className="text-emerald-300">4 campeões de grupo + 2 melhores segundos colocados (6 seleções)</strong> garantem vaga direta na Copa do Mundo, e os <strong className="text-sky-300">2 próximos melhores segundos colocados (7º e 8º gerais)</strong> representam a CONCACAF na <strong className="text-white">Repescagem Intercontinental FIFA</strong> (1 vaga padrão + 1 vaga extra como confederação da sede anterior, 2026).
                    </div>
                  )}
                  <div
                    className={`grid gap-4 ${
                      groups.length === 1
                        ? 'grid-cols-1'
                        : isNewUefaWcFormat
                        ? 'grid-cols-1 xl:grid-cols-3'
                        : 'grid-cols-1 md:grid-cols-2'
                    }`}
                  >
                    {groups.map((grp) => {
                      const rows = confRows.filter((r) => r.group === grp);
                      const isUefaL1 = isNewUefaWcFormat && grp.startsWith('Liga 1');
                      const isUefaL2 = isNewUefaWcFormat && grp.startsWith('Liga 2');
                      const grpDirectCut = isUefaL2 ? 0 : directCut;
                      return (
                        <div
                          key={grp}
                          className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden"
                        >
                          <div className="px-4 py-3 bg-black border-b border-slate-800 flex flex-wrap items-center justify-between gap-2">
                            <span className="text-xs font-black text-white">
                              Eliminatórias {confKey} · {grp}
                            </span>
                            <span className="text-[11px] text-slate-400">
                              {isUefaL1
                                ? 'Top 4 Copa · 5º–8º Play-Off (6 jogos)'
                                : isUefaL2
                                ? '4 melhores gerais da Liga 2 → Play-Off UEFA'
                                : OTHER_WC_QUAL_HINTS[confKey].label}
                            </span>
                          </div>
                          <table className="w-full text-left text-xs">
                            <thead className="text-[11px] text-slate-500 border-b border-slate-800">
                              <tr>
                                <th className="py-2 px-3">#</th>
                                <th className="py-2 px-3">Seleção</th>
                                <th className="py-2 px-2 text-right">P</th>
                                <th className="py-2 px-2 text-right">J</th>
                                <th className="py-2 px-2 text-right">V</th>
                                <th className="py-2 px-3 text-right">SG</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800/50 font-mono tabular-nums">
                              {rows.map((r, idx) => {
                                const t = getNationalTeamById(r.teamId);
                                const isMine = activeUserTeamId === r.teamId;
                                const isDirectOfc = confKey === 'OFC' && groups.length === 1 && idx === 0;
                                const isPlayoffOfc = confKey === 'OFC' && groups.length === 1 && idx === 1;
                                const isPlayoffAfc = isNewAfcFormat && idx === 1;
                                const isWc2030Host =
                                  (isNewUefaWcFormat || confKey === 'CAF') &&
                                  activeQualifiers.targetWorldCupYear === 2030 &&
                                  wc2030CohostSet.has(r.teamId);
                                const isPlayoffUefaL1 = isUefaL1 && idx >= 4 && idx < 8;
                                const isPlayoffUefaL2 = isUefaL2 && uefaLeague2PlayoffSet.has(r.teamId);
                                const cafRunnerUpRank =
                                  confKey === 'CAF' && idx === 1 ? cafRunnerUpRankMap.get(r.teamId) : undefined;
                                const isPlayoffCaf = cafRunnerUpRank !== undefined && cafRunnerUpRank <= 4 && !isWc2030Host;
                                const concRunnerRank =
                                  confKey === 'CONCACAF' && idx === 1 ? concacafRunnerRankMap.get(r.teamId) : undefined;
                                const isDirectConcRunner = concRunnerRank !== undefined && concRunnerRank <= 2;
                                const isPlayoffConc = concRunnerRank !== undefined && concRunnerRank >= 3 && concRunnerRank <= 4;
                                return (
                                  <tr
                                    key={r.teamId}
                                    onClick={() => jumpToInspectNation(r.teamId)}
                                    className={`cursor-pointer ${
                                      isMine ? 'bg-amber-500/10' : 'hover:bg-slate-900/50'
                                    }`}
                                  >
                                    <td
                                      className={`py-2 px-3 font-bold ${
                                        idx < grpDirectCut || isWc2030Host || isDirectConcRunner
                                          ? 'text-emerald-400'
                                          : isPlayoffOfc ||
                                            isPlayoffAfc ||
                                            isPlayoffCaf ||
                                            isPlayoffConc ||
                                            isPlayoffUefaL1 ||
                                            isPlayoffUefaL2 ||
                                            (confKey === 'UEFA' && !isNewUefaWcFormat && idx === 1)
                                          ? 'text-sky-400'
                                          : 'text-slate-500'
                                      }`}
                                    >
                                      {idx + 1}
                                    </td>
                                    <td className="py-2 px-3 font-sans">
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <TeamCrest team={t} size="sm" />
                                        <span
                                          className={`font-semibold ${
                                            isMine ? 'text-amber-300 font-black' : 'text-white hover:text-sky-300'
                                          }`}
                                        >
                                          {t.name}
                                        </span>
                                        {isWc2030Host && (
                                          <span className="px-1.5 py-0.5 rounded bg-amber-500/15 border border-amber-400/40 text-amber-300 text-[10px] font-bold">
                                            SEDE 2030
                                          </span>
                                        )}
                                        {isDirectConcRunner && (
                                          <span className="px-1.5 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-[10px] font-bold">
                                            Vaga Direta ({concRunnerRank}º melhor 2º)
                                          </span>
                                        )}
                                        {isPlayoffConc && (
                                          <span className="px-1.5 py-0.5 rounded bg-sky-500/15 border border-sky-500/40 text-sky-300 text-[10px] font-bold">
                                            Repescagem Mundial
                                          </span>
                                        )}
                                        {isPlayoffUefaL2 && (
                                          <span className="px-1.5 py-0.5 rounded bg-sky-500/15 border border-sky-500/40 text-sky-300 text-[10px] font-bold">
                                            Play-Off UEFA
                                          </span>
                                        )}
                                        {isDirectOfc && (
                                          <span className="px-1.5 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-[10px] font-bold">
                                            Vaga Direta Copa
                                          </span>
                                        )}
                                        {isPlayoffOfc && (
                                          <span className="px-1.5 py-0.5 rounded bg-sky-500/15 border border-sky-500/40 text-sky-300 text-[10px] font-bold">
                                            Repescagem Mundial
                                          </span>
                                        )}
                                        {isPlayoffAfc && (
                                          <span className="px-1.5 py-0.5 rounded bg-sky-500/15 border border-sky-500/40 text-sky-300 text-[10px] font-bold">
                                            Play-Off AFC
                                          </span>
                                        )}
                                        {isPlayoffCaf && (
                                          <span className="px-1.5 py-0.5 rounded bg-sky-500/15 border border-sky-500/40 text-sky-300 text-[10px] font-bold">
                                            Play-Off CAF ({cafRunnerUpRank}º melhor 2º)
                                          </span>
                                        )}
                                      </div>
                                    </td>
                                    <td className="py-2 px-2 text-right font-black text-white">{r.points}</td>
                                    <td className="py-2 px-2 text-right text-slate-400">{r.played}</td>
                                    <td className="py-2 px-2 text-right text-slate-300">{r.won}</td>
                                    <td className="py-2 px-3 text-right text-slate-300">
                                      {r.goalDifference > 0 ? `+${r.goalDifference}` : r.goalDifference}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      );
                    })}
                  </div>

                  {/* Play-Off UEFA (16 seleções: 12 Liga 1 + 4 Liga 2 -> 4 Chaves -> Semis e Finais -> 4 vagas na Copa) */}
                  {confKey === 'UEFA' && uefaPlayoffFixes.length > 0 && (
                    <div className="bg-slate-950 border border-sky-500/35 rounded-2xl overflow-hidden">
                      <div className="px-4 py-3 bg-black border-b border-slate-800 flex flex-wrap items-center justify-between gap-2">
                        <span className="text-xs font-black text-sky-300">
                          Play-Off UEFA · Repescagem Europeia (16 Seleções · 4 Chaves · Semifinais → Finais por 4 Vagas na Copa {activeQualifiers.targetWorldCupYear})
                        </span>
                        <span className="text-[11px] font-mono text-slate-400">
                          {uefaPlayoffFixes.filter((f) => f.played).length}/{uefaPlayoffFixes.length} jogos disputados
                        </span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:gap-px bg-slate-800/40">
                        {uefaPlayoffFixes.map((fix) => {
                          const h = getNationalTeamById(fix.homeTeamId);
                          const a = getNationalTeamById(fix.awayTeamId);
                          const involvesUser =
                            activeUserTeamId &&
                            (fix.homeTeamId === activeUserTeamId || fix.awayTeamId === activeUserTeamId);
                          return (
                            <div key={fix.id} className="p-3.5 bg-slate-950 space-y-2">
                              <div className="flex items-center justify-between text-[11px] text-slate-400">
                                <span className="font-bold text-sky-300">
                                  {fix.phase} · {fix.dateLabel}
                                </span>
                                <span className="font-mono tabular-nums text-slate-500">{fix.stadiumName}</span>
                              </div>
                              <div className="flex items-center justify-between gap-2">
                                <button
                                  type="button"
                                  onClick={() => jumpToInspectNation(h.id)}
                                  className="flex items-center gap-2 min-w-0 flex-1 text-left hover:text-sky-300 cursor-pointer"
                                >
                                  <TeamCrest team={h} size="sm" />
                                  <span className="text-xs font-bold text-white truncate">{h.name}</span>
                                </button>
                                <div className="px-3 py-1 rounded bg-black border border-slate-800 font-mono tabular-nums text-xs font-black text-amber-300 shrink-0 text-center">
                                  {fix.played ? (
                                    <>
                                      <span>
                                        {fix.homeScore} x {fix.awayScore}
                                      </span>
                                      {fix.penaltiesHome !== undefined && (
                                        <span className="block text-[9px] text-sky-300">
                                          ({fix.penaltiesHome}–{fix.penaltiesAway} pen)
                                        </span>
                                      )}
                                    </>
                                  ) : (
                                    'vs'
                                  )}
                                </div>
                                <button
                                  type="button"
                                  onClick={() => jumpToInspectNation(a.id)}
                                  className="flex items-center gap-2 min-w-0 flex-1 justify-end text-right hover:text-sky-300 cursor-pointer"
                                >
                                  <span className="text-xs font-bold text-white truncate">{a.name}</span>
                                  <TeamCrest team={a} size="sm" />
                                </button>
                              </div>
                              {fix.status === 'READY_FOR_USER' && !fix.played && involvesUser && (
                                <button
                                  type="button"
                                  onClick={() => onLaunchMatch(fix)}
                                  className="w-full py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 text-[11px] font-black cursor-pointer"
                                >
                                  Escalar Time & Jogar Play-Off UEFA
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Play-Off AFC (8 segundos colocados -> Quartas, Semi e Final -> Repescagem Intercontinental) */}
                  {confKey === 'AFC' && afcPlayoffFixes.length > 0 && (
                    <div className="bg-slate-950 border border-rose-500/35 rounded-2xl overflow-hidden">
                      <div className="px-4 py-3 bg-black border-b border-slate-800 flex flex-wrap items-center justify-between gap-2">
                        <span className="text-xs font-black text-rose-300">
                          Play-Off AFC · 8 Segundos Colocados (Quartas → Semi → Final · Vaga na Repescagem Mundial)
                        </span>
                        <span className="text-[11px] font-mono text-slate-400">
                          {afcPlayoffFixes.filter((f) => f.played).length}/{afcPlayoffFixes.length} jogos disputados
                        </span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:gap-px bg-slate-800/40">
                        {afcPlayoffFixes.map((fix) => {
                          const h = getNationalTeamById(fix.homeTeamId);
                          const a = getNationalTeamById(fix.awayTeamId);
                          const involvesUser =
                            activeUserTeamId &&
                            (fix.homeTeamId === activeUserTeamId || fix.awayTeamId === activeUserTeamId);
                          return (
                            <div key={fix.id} className="p-3.5 bg-slate-950 space-y-2">
                              <div className="flex items-center justify-between text-[11px] text-slate-400">
                                <span className="font-bold text-rose-300">
                                  {fix.phase} · {fix.dateLabel}
                                </span>
                                <span className="font-mono tabular-nums text-slate-500">{fix.stadiumName}</span>
                              </div>
                              <div className="flex items-center justify-between gap-2">
                                <button
                                  type="button"
                                  onClick={() => jumpToInspectNation(h.id)}
                                  className="flex items-center gap-2 min-w-0 flex-1 text-left hover:text-sky-300 cursor-pointer"
                                >
                                  <TeamCrest team={h} size="sm" />
                                  <span className="text-xs font-bold text-white truncate">{h.name}</span>
                                </button>
                                <div className="px-3 py-1 rounded bg-black border border-slate-800 font-mono tabular-nums text-xs font-black text-amber-300 shrink-0 text-center">
                                  {fix.played ? (
                                    <>
                                      <span>
                                        {fix.homeScore} x {fix.awayScore}
                                      </span>
                                      {fix.penaltiesHome !== undefined && (
                                        <span className="block text-[9px] text-sky-300">
                                          ({fix.penaltiesHome}–{fix.penaltiesAway} pen)
                                        </span>
                                      )}
                                    </>
                                  ) : (
                                    'vs'
                                  )}
                                </div>
                                <button
                                  type="button"
                                  onClick={() => jumpToInspectNation(a.id)}
                                  className="flex items-center gap-2 min-w-0 flex-1 justify-end text-right hover:text-sky-300 cursor-pointer"
                                >
                                  <span className="text-xs font-bold text-white truncate">{a.name}</span>
                                  <TeamCrest team={a} size="sm" />
                                </button>
                              </div>
                              {fix.status === 'READY_FOR_USER' && !fix.played && involvesUser && (
                                <button
                                  type="button"
                                  onClick={() => onLaunchMatch(fix)}
                                  className="w-full py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 text-[11px] font-black cursor-pointer"
                                >
                                  Escalar Time & Jogar Play-Off AFC
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Play-Off CAF (4 melhores 2ºs colocados -> Semifinais e Final em jogo único -> Repescagem Intercontinental) */}
                  {confKey === 'CAF' && cafPlayoffFixes.length > 0 && (
                    <div className="bg-slate-950 border border-emerald-500/35 rounded-2xl overflow-hidden">
                      <div className="px-4 py-3 bg-black border-b border-slate-800 flex flex-wrap items-center justify-between gap-2">
                        <span className="text-xs font-black text-emerald-300">
                          Play-Off da África (CAF) · 4 Melhores 2ºs Colocados (Semifinais → Final em Jogo Único · Repescagem Mundial)
                        </span>
                        <span className="text-[11px] font-mono text-slate-400">
                          {cafPlayoffFixes.filter((f) => f.played).length}/{cafPlayoffFixes.length} jogos disputados
                        </span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:gap-px bg-slate-800/40">
                        {cafPlayoffFixes.map((fix) => {
                          const h = getNationalTeamById(fix.homeTeamId);
                          const a = getNationalTeamById(fix.awayTeamId);
                          const involvesUser =
                            activeUserTeamId &&
                            (fix.homeTeamId === activeUserTeamId || fix.awayTeamId === activeUserTeamId);
                          return (
                            <div key={fix.id} className="p-3.5 bg-slate-950 space-y-2">
                              <div className="flex items-center justify-between text-[11px] text-slate-400">
                                <span className="font-bold text-emerald-300">
                                  {fix.phase} · {fix.dateLabel}
                                </span>
                                <span className="font-mono tabular-nums text-slate-500">{fix.stadiumName}</span>
                              </div>
                              <div className="flex items-center justify-between gap-2">
                                <button
                                  type="button"
                                  onClick={() => jumpToInspectNation(h.id)}
                                  className="flex items-center gap-2 min-w-0 flex-1 text-left hover:text-sky-300 cursor-pointer"
                                >
                                  <TeamCrest team={h} size="sm" />
                                  <span className="text-xs font-bold text-white truncate">{h.name}</span>
                                </button>
                                <div className="px-3 py-1 rounded bg-black border border-slate-800 font-mono tabular-nums text-xs font-black text-amber-300 shrink-0 text-center">
                                  {fix.played ? (
                                    <>
                                      <span>
                                        {fix.homeScore} x {fix.awayScore}
                                      </span>
                                      {fix.penaltiesHome !== undefined && (
                                        <span className="block text-[9px] text-sky-300">
                                          ({fix.penaltiesHome}–{fix.penaltiesAway} pen)
                                        </span>
                                      )}
                                    </>
                                  ) : (
                                    'vs'
                                  )}
                                </div>
                                <button
                                  type="button"
                                  onClick={() => jumpToInspectNation(a.id)}
                                  className="flex items-center gap-2 min-w-0 flex-1 justify-end text-right hover:text-sky-300 cursor-pointer"
                                >
                                  <span className="text-xs font-bold text-white truncate">{a.name}</span>
                                  <TeamCrest team={a} size="sm" />
                                </button>
                              </div>
                              {fix.status === 'READY_FOR_USER' && !fix.played && involvesUser && (
                                <button
                                  type="button"
                                  onClick={() => onLaunchMatch(fix)}
                                  className="w-full py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 text-[11px] font-black cursor-pointer"
                                >
                                  Escalar Time & Jogar Play-Off CAF
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Fixtures for the selected Confederation */}
                  <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden">
                    <div className="p-4 bg-black border-b border-slate-800 flex flex-wrap items-center justify-between gap-2">
                      <span className="text-xs font-black text-white">
                        Jogos {confKey} · Rodada {clampedRound}/{totalOtherRounds}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setSelectedOtherQualRound((r) => Math.max(1, r - 1))}
                          className="px-2.5 py-1 rounded bg-slate-900 border border-slate-700 text-xs font-bold text-slate-200 hover:bg-slate-800 cursor-pointer"
                        >
                          Anterior
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setSelectedOtherQualRound((r) => Math.min(totalOtherRounds, r + 1))
                          }
                          className="px-2.5 py-1 rounded bg-slate-900 border border-slate-700 text-xs font-bold text-slate-200 hover:bg-slate-800 cursor-pointer"
                        >
                          Próxima
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:gap-px bg-slate-800/40">
                      {roundFixes.map((fix) => {
                        const h = getNationalTeamById(fix.homeTeamId);
                        const a = getNationalTeamById(fix.awayTeamId);
                        const involvesUser =
                          activeUserTeamId &&
                          (fix.homeTeamId === activeUserTeamId || fix.awayTeamId === activeUserTeamId);
                        return (
                          <div key={fix.id} className="p-3.5 bg-slate-950 space-y-2">
                            <div className="flex items-center justify-between text-[11px] text-slate-500">
                              <span>
                                {fix.group} · {fix.dateLabel}
                              </span>
                              <span className="font-mono tabular-nums">{fix.stadiumName}</span>
                            </div>
                            <div className="flex items-center justify-between gap-2">
                              <button
                                type="button"
                                onClick={() => jumpToInspectNation(h.id)}
                                className="flex items-center gap-2 min-w-0 flex-1 text-left hover:text-sky-300 cursor-pointer"
                              >
                                <TeamCrest team={h} size="sm" />
                                <span className="text-xs font-bold text-white truncate">{h.name}</span>
                              </button>
                              <div className="px-3 py-1 rounded bg-black border border-slate-800 font-mono tabular-nums text-xs font-black text-amber-300 shrink-0">
                                {fix.played ? `${fix.homeScore} x ${fix.awayScore}` : 'vs'}
                              </div>
                              <button
                                type="button"
                                onClick={() => jumpToInspectNation(a.id)}
                                className="flex items-center gap-2 min-w-0 flex-1 justify-end text-right hover:text-sky-300 cursor-pointer"
                              >
                                <span className="text-xs font-bold text-white truncate">{a.name}</span>
                                <TeamCrest team={a} size="sm" />
                              </button>
                            </div>

                            {fix.status === 'READY_FOR_USER' && !fix.played && involvesUser && (
                              <button
                                type="button"
                                onClick={() => onLaunchMatch(fix)}
                                className="w-full py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 text-[11px] font-black cursor-pointer"
                              >
                                Escalar Time & Jogar Partida
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })()
          )}
        </div>
      )}

      {/* ==================================================================== */}
      {/* WORLD TAB 3: ELIMINATÓRIAS CONTINENTAIS (EURO, CAN, ÁSIA, CONCACAF)  */}
      {/* ==================================================================== */}
      {worldSubTab === 'cont_qualifiers' && activeContQualifiers && (
        <div className="space-y-5">
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-black text-white">
                Eliminatórias Continentais · Ciclo {activeContQualifiers.targetContinentalYear}
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                {activeContQualifiers.tracks[contQualTrack]?.targetCompName}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {nationalTeam.completedContinentalQualifiersArchive && (
                <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800">
                  <button
                    type="button"
                    onClick={() => setContQualMode('ACTIVE')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold whitespace-nowrap shrink-0 cursor-pointer ${
                      contQualMode === 'ACTIVE'
                        ? 'bg-sky-400 text-slate-950 font-black'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Ciclo {nationalTeam.continentalQualifiers?.targetContinentalYear || 2028}
                  </button>
                  <button
                    type="button"
                    onClick={() => setContQualMode('ARCHIVE')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold whitespace-nowrap shrink-0 cursor-pointer ${
                      contQualMode === 'ARCHIVE'
                        ? 'bg-sky-400 text-slate-950 font-black'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Ciclo {nationalTeam.completedContinentalQualifiersArchive.targetContinentalYear} (Concluído)
                  </button>
                </div>
              )}

              <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800 overflow-x-auto">
                {(['UEFA', 'CAF', 'AFC', 'CONCACAF', 'OFC'] as ContinentalQualifierTrackId[]).map((tid) => (
                  <button
                    key={tid}
                    type="button"
                    onClick={() => {
                      setContQualTrack(tid);
                      setSelectedContQualRound(1);
                    }}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold whitespace-nowrap shrink-0 cursor-pointer ${
                      contQualTrack === tid
                        ? 'bg-amber-400 text-slate-950 font-black'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {tid === 'UEFA'
                      ? 'UEFA (Euro)'
                      : tid === 'CAF'
                      ? 'CAF (CAN)'
                      : tid === 'AFC'
                      ? 'AFC (Ásia)'
                      : tid === 'CONCACAF'
                      ? 'CONCACAF Nations'
                      : 'OFC (Oceania)'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* CONMEBOL qualification rule note */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs text-slate-300">
            <strong className="text-sky-300">Nota CONMEBOL:</strong> {activeContQualifiers.conmebolNote}
          </div>

          {(() => {
            const mappedCompId = TRACK_TO_CONT_COMP[contQualTrack];
            const trackDone = isContinentalTrackComplete(
              nationalTeam.continentalQualifiers,
              mappedCompId
            );
            const contDrawInfo = getNationalTournamentDrawInfo(
              nationalTeam,
              mappedCompId,
              calendarYear
            );
            if (!trackDone || !contDrawInfo || !contDrawInfo.canDrawGroups) return null;
            return (
              <div className="bg-amber-500/10 border border-amber-400/35 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-xl bg-amber-400/20 border border-amber-400/40 text-amber-300 shrink-0">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-white">
                      Classificados Definidos · {contDrawInfo.title}
                    </h3>
                    <p className="text-xs text-slate-300 mt-0.5">
                      As eliminatórias desta confederação foram encerradas ({contDrawInfo.participantCount} seleções nos potes). Gere o sorteio oficial para montar os grupos!
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playClick();
                    onOpenTournamentDraw?.(mappedCompId);
                  }}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-slate-950 text-xs font-black whitespace-nowrap shrink-0 cursor-pointer shadow-lg shadow-emerald-500/20"
                >
                  <Shuffle className="w-4 h-4" />
                  <span>
                    {contDrawInfo.alreadyDrawn
                      ? 'Sortear / Rever Grupos'
                      : 'Gerar Sorteio dos Grupos'}
                  </span>
                </button>
              </div>
            );
          })()}

          {(() => {
            const track = activeContQualifiers.tracks[contQualTrack];
            if (!track) return null;
            const groups = Array.from(new Set(track.standings.map((r) => r.group || 'Grupo A'))).sort();
            const clampedContRound = Math.min(track.totalRounds, Math.max(1, selectedContQualRound));
            const roundFixes = track.fixtures.filter(
              (f) => Boolean(f.group) && f.qualifiersRound === clampedContRound
            );
            const uefaEuroPlayoffFixes =
              track.id === 'UEFA'
                ? track.fixtures.filter((f) => !f.group && f.phase.startsWith('Play-Off Euro'))
                : [];
            const euro2028CohostSet = new Set<string>(EURO_2028_COHOSTS);

            return (
              <div className="space-y-5">
                {track.id === 'UEFA' && (
                  <div className="bg-slate-950 border border-sky-500/35 rounded-xl px-4 py-3 text-xs text-slate-300 leading-relaxed">
                    <strong className="text-sky-300">
                      Eliminatórias da Eurocopa {activeContQualifiers.targetContinentalYear} (54 Seleções → 24 Vagas):
                    </strong>{' '}
                    12 grupos sendo <strong className="text-white">6 grupos de 4 (A–F · Set–Nov)</strong> — protegendo os 8 quadrifinalistas da Nations League — e{' '}
                    <strong className="text-white">6 grupos de 5 (G–L · Mar–Nov)</strong>, respeitando restrições políticas (ESP×GIB, SER×KOS). Avançam diretamente os{' '}
                    <strong className="text-emerald-300">12 campeões + 8 melhores 2ºs (por média PPG = 20 vagas)</strong>
                    {activeContQualifiers.targetContinentalYear === 2028
                      ? ', com até 2 vagas reservadas aos anfitriões (Inglaterra, Escócia, País de Gales e Irlanda) caso não avancem direto'
                      : ''}
                    ; as últimas <strong className="text-sky-300">2 a 4 vagas</strong> são decididas na <strong className="text-sky-300">Repescagem (Play-Off Euro)</strong> em março de {activeContQualifiers.targetContinentalYear}.
                  </div>
                )}

                <div
                  className={`grid gap-4 ${
                    groups.length === 1
                      ? 'grid-cols-1'
                      : groups.length === 4 && track.id === 'AFC'
                      ? 'grid-cols-1 md:grid-cols-2'
                      : 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3'
                  }`}
                >
                  {groups.map((grp) => {
                    const rows = track.standings.filter((r) => r.group === grp);
                    const isUefaFiveGroup = track.id === 'UEFA' && rows.length === 5;
                    return (
                      <div
                        key={grp}
                        className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden"
                      >
                        <div className="px-4 py-2.5 bg-black border-b border-slate-800 flex items-center justify-between gap-2">
                          <span className="text-xs font-black text-white">
                            {grp}
                            {track.id === 'UEFA' && (
                              <span className="ml-1.5 text-[10px] font-semibold text-slate-400">
                                ({rows.length} sel. · {isUefaFiveGroup ? 'Mar–Nov' : 'Set–Nov'})
                              </span>
                            )}
                          </span>
                          <span className="text-[11px] text-slate-400">
                            {track.id === 'UEFA'
                              ? '1º direto · 2º Top 8 PPG'
                              : `Top ${track.qualifyPerGroup} ${
                                  track.id === 'OFC'
                                    ? 'vão à Copa da Oceania (2×4)'
                                    : track.id === 'AFC'
                                    ? 'vão à Copa da Ásia (32 sel.)'
                                    : track.id === 'CAF'
                                    ? 'vão à Copa Africana (32 sel.)'
                                    : 'diretos'
                                }`}
                          </span>
                        </div>
                        <table className="w-full text-left text-xs">
                          <thead className="text-[11px] text-slate-500 border-b border-slate-800">
                            <tr>
                              <th className="py-2 px-3">#</th>
                              <th className="py-2 px-2">Seleção</th>
                              <th className="py-2 px-2 text-right">P</th>
                              <th className="py-2 px-2 text-right">J</th>
                              <th className="py-2 px-2 text-right">V</th>
                              <th className="py-2 px-3 text-right">SG</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800/50 font-mono tabular-nums">
                            {rows.map((r, idx) => {
                              const t = getNationalTeamById(r.teamId);
                              const isMine = activeUserTeamId === r.teamId;
                              const isQualified = track.qualifiedTeamIds.includes(r.teamId);
                              const isEuro2028Host =
                                track.id === 'UEFA' &&
                                activeContQualifiers.targetContinentalYear === 2028 &&
                                euro2028CohostSet.has(r.teamId);
                              return (
                                <tr
                                  key={r.teamId}
                                  onClick={() => jumpToInspectNation(r.teamId)}
                                  className={`cursor-pointer ${
                                    isMine ? 'bg-amber-500/10' : 'hover:bg-slate-900/50'
                                  }`}
                                >
                                  <td
                                    className={`py-2 px-3 font-bold ${
                                      idx < track.qualifyPerGroup
                                        ? 'text-emerald-400'
                                        : isQualified
                                        ? 'text-sky-400'
                                        : 'text-slate-500'
                                    }`}
                                  >
                                    {idx + 1}
                                  </td>
                                  <td className="py-2 px-2 font-sans">
                                    <div className="flex items-center gap-1.5 min-w-0">
                                      <TeamCrest team={t} size="sm" />
                                      <span
                                        className={`font-semibold truncate ${
                                          isMine ? 'text-amber-300 font-black' : 'text-white hover:text-sky-300'
                                        }`}
                                      >
                                        {t.name}
                                      </span>
                                      {isEuro2028Host && (
                                        <span className="px-1.5 py-0.5 rounded bg-amber-500/15 border border-amber-400/40 text-amber-300 text-[9px] font-black shrink-0">
                                          SEDE 28
                                        </span>
                                      )}
                                    </div>
                                  </td>
                                  <td className="py-2 px-2 text-right font-black text-white">{r.points}</td>
                                  <td className="py-2 px-2 text-right text-slate-400">{r.played}</td>
                                  <td className="py-2 px-2 text-right text-slate-300">{r.won}</td>
                                  <td className="py-2 px-3 text-right text-slate-300">
                                    {r.goalDifference > 0 ? `+${r.goalDifference}` : r.goalDifference}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    );
                  })}
                </div>

                {/* Play-Off da Eurocopa (Repescagem em Março) */}
                {track.id === 'UEFA' && uefaEuroPlayoffFixes.length > 0 && (
                  <div className="bg-slate-950 border border-sky-500/35 rounded-2xl overflow-hidden">
                    <div className="px-4 py-3 bg-black border-b border-slate-800 flex flex-wrap items-center justify-between gap-2">
                      <span className="text-xs font-black text-sky-300">
                        Repescagem da Eurocopa {activeContQualifiers.targetContinentalYear} (Play-Off Euro · Março)
                      </span>
                      <span className="text-[11px] font-mono text-slate-400">
                        {uefaEuroPlayoffFixes.filter((f) => f.played).length}/{uefaEuroPlayoffFixes.length} jogos disputados
                      </span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:gap-px bg-slate-800/40">
                      {uefaEuroPlayoffFixes.map((fix) => {
                        const h = getNationalTeamById(fix.homeTeamId);
                        const a = getNationalTeamById(fix.awayTeamId);
                        const involvesUser =
                          activeUserTeamId &&
                          (fix.homeTeamId === activeUserTeamId || fix.awayTeamId === activeUserTeamId);
                        return (
                          <div key={fix.id} className="p-3.5 bg-slate-950 space-y-2">
                            <div className="flex items-center justify-between text-[11px] text-slate-400">
                              <span className="font-bold text-sky-300">
                                {fix.phase} · {fix.dateLabel}
                              </span>
                              <span className="font-mono tabular-nums text-slate-500">{fix.stadiumName}</span>
                            </div>
                            <div className="flex items-center justify-between gap-2">
                              <button
                                type="button"
                                onClick={() => jumpToInspectNation(h.id)}
                                className="flex items-center gap-2 min-w-0 flex-1 text-left hover:text-sky-300 cursor-pointer"
                              >
                                <TeamCrest team={h} size="sm" />
                                <span className="text-xs font-bold text-white truncate">{h.name}</span>
                              </button>
                              <div className="px-3 py-1 rounded bg-black border border-slate-800 font-mono tabular-nums text-xs font-black text-amber-300 shrink-0 text-center">
                                {fix.played ? (
                                  <>
                                    <span>
                                      {fix.homeScore} x {fix.awayScore}
                                    </span>
                                    {fix.penaltiesHome !== undefined && (
                                      <span className="block text-[9px] text-sky-300">
                                        ({fix.penaltiesHome}–{fix.penaltiesAway} pen)
                                      </span>
                                    )}
                                  </>
                                ) : (
                                  'vs'
                                )}
                              </div>
                              <button
                                type="button"
                                onClick={() => jumpToInspectNation(a.id)}
                                className="flex items-center gap-2 min-w-0 flex-1 justify-end text-right hover:text-sky-300 cursor-pointer"
                              >
                                <span className="text-xs font-bold text-white truncate">{a.name}</span>
                                <TeamCrest team={a} size="sm" />
                              </button>
                            </div>
                            {fix.status === 'READY_FOR_USER' && !fix.played && involvesUser && (
                              <button
                                type="button"
                                onClick={() => onLaunchMatch(fix)}
                                className="w-full py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 text-[11px] font-black cursor-pointer"
                              >
                                Escalar Time & Jogar Play-Off Euro
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Current qualified zone preview + Round matches */}
                <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden">
                  <div className="p-4 bg-black border-b border-slate-800 flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <span className="text-xs font-black text-white block">
                        {track.title} · Rodada {clampedContRound}/{track.totalRounds}
                      </span>
                      <span className="text-[11px] text-emerald-400">
                        {track.qualifiedTeamIds.length} seleções atualmente na zona de classificação
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setSelectedContQualRound(Math.max(1, clampedContRound - 1))}
                        className="px-2.5 py-1 rounded bg-slate-900 border border-slate-700 text-xs font-bold text-slate-200 hover:bg-slate-800 cursor-pointer"
                      >
                        Anterior
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setSelectedContQualRound(Math.min(track.totalRounds, clampedContRound + 1))
                        }
                        className="px-2.5 py-1 rounded bg-slate-900 border border-slate-700 text-xs font-bold text-slate-200 hover:bg-slate-800 cursor-pointer"
                      >
                        Próxima
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:gap-px bg-slate-800/40">
                    {roundFixes.map((fix) => {
                      const h = getNationalTeamById(fix.homeTeamId);
                      const a = getNationalTeamById(fix.awayTeamId);
                      const involvesUser =
                        activeUserTeamId &&
                        (fix.homeTeamId === activeUserTeamId || fix.awayTeamId === activeUserTeamId);
                      return (
                        <div key={fix.id} className="p-3.5 bg-slate-950 space-y-2">
                          <div className="flex items-center justify-between text-[11px] text-slate-500">
                            <span>
                              {fix.group} · {fix.dateLabel}
                            </span>
                            <span className="font-mono tabular-nums">{fix.stadiumName}</span>
                          </div>
                          <div className="flex items-center justify-between gap-2">
                            <button
                              type="button"
                              onClick={() => jumpToInspectNation(h.id)}
                              className="flex items-center gap-2 min-w-0 flex-1 text-left hover:text-sky-300 cursor-pointer"
                            >
                              <TeamCrest team={h} size="sm" />
                              <span className="text-xs font-bold text-white truncate">{h.name}</span>
                            </button>
                            <div className="px-3 py-1 rounded bg-black border border-slate-800 font-mono tabular-nums text-xs font-black text-amber-300 shrink-0">
                              {fix.played ? `${fix.homeScore} x ${fix.awayScore}` : 'vs'}
                            </div>
                            <button
                              type="button"
                              onClick={() => jumpToInspectNation(a.id)}
                              className="flex items-center gap-2 min-w-0 flex-1 justify-end text-right hover:text-sky-300 cursor-pointer"
                            >
                              <span className="text-xs font-bold text-white truncate">{a.name}</span>
                              <TeamCrest team={a} size="sm" />
                            </button>
                          </div>

                          {fix.status === 'READY_FOR_USER' && !fix.played && involvesUser && (
                            <button
                              type="button"
                              onClick={() => onLaunchMatch(fix)}
                              className="w-full py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 text-[11px] font-black cursor-pointer"
                            >
                              Escalar Time & Jogar Partida
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* ==================================================================== */}
      {/* WORLD TAB 4: COPA DO MUNDO FIFA (48 SELEÇÕES)                        */}
      {/* ==================================================================== */}
      {worldSubTab === 'world_cup' && nationalTeam.worldCup && (
        <div className="space-y-5">
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="text-xs text-amber-300 font-bold">
                Torneio Máximo de Seleções · 48 Nações (12 Grupos + Mata-Mata de 32)
              </div>
              <h2 className="text-lg font-black text-white mt-0.5">
                {nationalTeam.worldCup.title} · Sede: {nationalTeam.worldCup.hostName}
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                {nationalTeam.worldCup.year === 2030
                  ? 'Edição do Centenário (2030): jogos inaugurais na América do Sul em 8–9/06 (URU, ARG e PAR), sedes principais em Espanha, Portugal e Marrocos a partir de 13/06 e Grande Final em 21/07 no Santiago Bernabéu.'
                  : nationalTeam.worldCup.year === calendarYear
                  ? `Edição deste ano (${calendarYear})! Disputada no meio do ano (11 de Junho a 19 de Julho de ${calendarYear}).`
                  : `Edição oficial (${nationalTeam.worldCup.year}). Vagas preenchidas pelas Eliminatórias de todas as 6 confederações.`}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {(() => {
                const wcDrawInfo = getNationalTournamentDrawInfo(
                  nationalTeam,
                  'world_cup',
                  calendarYear
                );
                if (!wcDrawInfo) return null;
                return (
                  <button
                    type="button"
                    onClick={() => {
                      soundEngine.playClick();
                      onOpenTournamentDraw?.('world_cup');
                    }}
                    className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-black transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      wcDrawInfo.canDrawGroups && !wcDrawInfo.alreadyDrawn
                        ? 'bg-emerald-400 hover:bg-emerald-300 text-slate-950 shadow-lg shadow-emerald-500/20'
                        : 'bg-amber-400/15 hover:bg-amber-400/25 border border-amber-400/40 text-amber-300'
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>
                      {wcDrawInfo.canDrawGroups
                        ? wcDrawInfo.alreadyDrawn
                          ? 'Sortear / Rever Grupos'
                          : 'Gerar Sorteio'
                        : 'Rever Sorteio Oficial'}
                    </span>
                  </button>
                );
              })()}

              <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800 overflow-x-auto">
                {(
                  [
                    { id: 'groups', label: 'Grupos (A–L)' },
                    { id: 'bracket', label: 'Chaveamento Mata-Mata' },
                    { id: 'matches', label: 'Todos os Jogos' },
                    { id: 'history', label: 'Galeria de Campeões' },
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setWcSubMode(tab.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap shrink-0 cursor-pointer ${
                      wcSubMode === tab.id ? 'bg-amber-400 text-slate-950 font-black' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {(() => {
            const wcDrawInfo = getNationalTournamentDrawInfo(
              nationalTeam,
              'world_cup',
              calendarYear
            );
            if (!wcDrawInfo || !wcDrawInfo.canDrawGroups || wcDrawInfo.alreadyDrawn) return null;
            return (
              <div className="bg-amber-500/10 border border-amber-400/35 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-xl bg-amber-400/20 border border-amber-400/40 text-amber-300 shrink-0">
                    <Shuffle className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-white">
                      {wcDrawInfo.title} · Sorteio dos Grupos Disponível
                    </h3>
                    <p className="text-xs text-slate-300 mt-0.5">
                      Gere o sorteio oficial dos 4 potes FIFA para sortear os 12 grupos (A–L) antes da bola rolar!
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playClick();
                    onOpenTournamentDraw?.('world_cup');
                  }}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-slate-950 text-xs font-black whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <Shuffle className="w-4 h-4" />
                  <span>Gerar Sorteio dos Grupos</span>
                </button>
              </div>
            );
          })()}

          {wcSubMode === 'history' ? (
            <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden">
              <div className="p-4 bg-black border-b border-slate-800">
                <h3 className="text-sm font-black text-white">Histórico de Finais da Copa do Mundo FIFA</h3>
              </div>
              <div className="divide-y divide-slate-800/60">
                {(nationalTeam.pastWorldCups || []).map((rec) => {
                  const ch = getNationalTeamById(rec.championTeamId);
                  const ru = getNationalTeamById(rec.runnerUpTeamId);
                  return (
                    <div
                      key={rec.year}
                      className="px-5 py-3.5 flex flex-wrap items-center justify-between gap-3 text-xs"
                    >
                      <div className="font-mono tabular-nums">
                        <span className="text-amber-400 font-black text-sm">{rec.year}</span>
                        <span className="text-slate-400 ml-3">Sede: {rec.host}</span>
                      </div>

                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => jumpToInspectNation(ch.id)}
                          className="flex items-center gap-2 hover:text-sky-300 cursor-pointer"
                        >
                          <TeamCrest team={ch} size="sm" />
                          <span className="font-black text-white">{ch.name}</span>
                        </button>
                        <span className="px-2.5 py-0.5 rounded bg-black border border-slate-800 font-mono tabular-nums text-amber-300 font-bold">
                          {rec.scoreLabel}
                        </span>
                        <button
                          type="button"
                          onClick={() => jumpToInspectNation(ru.id)}
                          className="flex items-center gap-2 hover:text-sky-300 cursor-pointer"
                        >
                          <TeamCrest team={ru} size="sm" />
                          <span className="text-slate-300 font-medium">{ru.name}</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            renderTournamentHub(
              nationalTeam.worldCup,
              wcSubMode,
              wcMatchPhaseFilter,
              setWcMatchPhaseFilter
            )
          )}
        </div>
      )}

      {/* ==================================================================== */}
      {/* WORLD TAB 5: CONTINENTAIS, COPA OURO, NATIONS LEAGUE & FINALÍSSIMA   */}
      {/* ==================================================================== */}
      {worldSubTab === 'continentals' && nationalTeam.continentals && (
        <div className="space-y-5">
          {finalissimaFixtures.length > 0 && (
            <div className="bg-slate-950 border border-amber-500/40 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4">
              {finalissimaFixtures.map((fin) => {
                const h = getNationalTeamById(fin.homeTeamId);
                const a = getNationalTeamById(fin.awayTeamId);
                return (
                  <div key={fin.id} className="w-full flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <span className="text-xs font-bold text-amber-300 block">
                        {fin.competitionName} · {fin.stadiumName}
                      </span>
                      <span className="text-[11px] text-slate-400">
                        {fin.date ? formatShortDate(fin.date) : fin.dateLabel} · Campeão da Copa América vs Campeão da Eurocopa
                      </span>
                    </div>
                    <div className="flex items-center gap-3 font-mono tabular-nums">
                      <button
                        type="button"
                        onClick={() => jumpToInspectNation(h.id)}
                        className="flex items-center gap-2 font-sans font-black text-white hover:text-sky-300 cursor-pointer"
                      >
                        <TeamCrest team={h} size="sm" />
                        <span>{h.name}</span>
                      </button>
                      <span className="px-3 py-1 rounded bg-black border border-slate-800 text-amber-300 font-black text-xs">
                        {fin.played
                          ? `${fin.homeScore} x ${fin.awayScore}${
                              fin.penaltiesHome !== undefined ? ` (${fin.penaltiesHome}–${fin.penaltiesAway})` : ''
                            }`
                          : 'vs'}
                      </span>
                      <button
                        type="button"
                        onClick={() => jumpToInspectNation(a.id)}
                        className="flex items-center gap-2 font-sans font-black text-white hover:text-sky-300 cursor-pointer"
                      >
                        <span>{a.name}</span>
                        <TeamCrest team={a} size="sm" />
                      </button>
                      {fin.status === 'READY_FOR_USER' &&
                        !fin.played &&
                        activeUserTeamId &&
                        (fin.homeTeamId === activeUserTeamId || fin.awayTeamId === activeUserTeamId) && (
                          <button
                            type="button"
                            onClick={() => onLaunchMatch(fin)}
                            className="px-3 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-black cursor-pointer"
                          >
                            Jogar Finalíssima
                          </button>
                        )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {CONTINENTAL_COMP_META.map((meta) => {
              const ed = nationalTeam.continentals![meta.id];
              const active = selectedContinental === meta.id;
              const holder = ed?.championTeamId ? getNationalTeamById(ed.championTeamId) : null;
              return (
                <button
                  key={meta.id}
                  type="button"
                  onClick={() => {
                    soundEngine.playClick();
                    setSelectedContinental(meta.id);
                  }}
                  className={`text-left p-4 rounded-2xl border transition-colors cursor-pointer ${
                    active
                      ? 'bg-amber-500/10 border-amber-400 text-white'
                      : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-black text-white">{meta.shortLabel}</span>
                    <span className="text-[11px] font-mono tabular-nums text-amber-300">
                      {ed?.year || '-'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">{meta.confedLabel}</p>
                  <p className="text-[11px] text-slate-500 mt-1">
                    {holder ? `Campeão: ${holder.name}` : meta.cycleHint}
                  </p>
                </button>
              );
            })}
          </div>

          {(() => {
            const activeEdition = nationalTeam.continentals![selectedContinental];
            if (!activeEdition) return null;
            return (
              <div className="space-y-4">
                <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-base font-black text-white">
                      {activeEdition.title} · Sede: {activeEdition.hostName}
                    </h2>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {activeEdition.compId === 'nations_league'
                        ? activeEdition.year === 2026
                          ? 'Edição de Transição 2026/27 · Ligas A, B, C e D (54 seleções, 14 grupos) · Quartas Ida/Volta (Mar/2027) e Final Four (Jun/2027) antes da extinção da Liga D.'
                          : `Novo Formato Reformado ${activeEdition.year}/${String(activeEdition.year + 1).slice(-2)} · 3 Ligas (A, B e C · 18 seleções cada em 3×6 Sistema Suíço · 6 jogos) · Quartas Ida/Volta em Mar/${activeEdition.year + 1} e Final Four em Jun/${activeEdition.year + 1}.`
                        : activeEdition.compId === 'eurocopa'
                        ? `24 seleções em 6 grupos de 4 + Oitavas, Quartas, Semis e Final (51 jogos · 09/06 a 09/07/${activeEdition.year}${activeEdition.year === 2028 ? ' · Final em Wembley' : ''}).`
                        : activeEdition.year === calendarYear
                        ? `Torneio continental em disputa nesta temporada (${calendarYear})!`
                        : `Edição oficial (${activeEdition.year}). Classificados definidos pelas Eliminatórias Continentais.`}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {(() => {
                      const contDrawInfo = getNationalTournamentDrawInfo(
                        nationalTeam,
                        activeEdition.compId,
                        calendarYear
                      );
                      if (!contDrawInfo) return null;
                      return (
                        <button
                          type="button"
                          onClick={() => {
                            soundEngine.playClick();
                            onOpenTournamentDraw?.(activeEdition.compId);
                          }}
                          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-black transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                            contDrawInfo.canDrawGroups && !contDrawInfo.alreadyDrawn
                              ? 'bg-emerald-400 hover:bg-emerald-300 text-slate-950 shadow-lg shadow-emerald-500/20'
                              : 'bg-amber-400/15 hover:bg-amber-400/25 border border-amber-400/40 text-amber-300'
                          }`}
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>
                            {contDrawInfo.canDrawGroups
                              ? contDrawInfo.alreadyDrawn
                                ? 'Sortear / Rever Grupos'
                                : 'Gerar Sorteio'
                              : 'Rever Sorteio Oficial'}
                          </span>
                        </button>
                      );
                    })()}

                    <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800">
                      {(
                        [
                          { id: 'groups', label: 'Fase de Grupos' },
                          {
                            id: 'bracket',
                            label: activeEdition.compId === 'nations_league' ? 'Quartas & Final Four' : 'Mata-Mata & Final',
                          },
                          { id: 'matches', label: 'Todos os Jogos' },
                        ] as const
                      ).map((m) => (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => setContSubMode(m.id)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap shrink-0 cursor-pointer ${
                            contSubMode === m.id
                              ? 'bg-amber-400 text-slate-950 font-black'
                              : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          {m.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {(() => {
                  const contDrawInfo = getNationalTournamentDrawInfo(
                    nationalTeam,
                    activeEdition.compId,
                    calendarYear
                  );
                  if (!contDrawInfo || !contDrawInfo.canDrawGroups || contDrawInfo.alreadyDrawn) {
                    return null;
                  }
                  return (
                    <div className="bg-amber-500/10 border border-amber-400/35 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4">
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-xl bg-amber-400/20 border border-amber-400/40 text-amber-300 shrink-0">
                          <Shuffle className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="text-sm font-black text-white">
                            {contDrawInfo.title} · Sorteio de Grupos Disponível
                          </h3>
                          <p className="text-xs text-slate-300 mt-0.5">
                            {contDrawInfo.participantCount} seleções prontas nos potes oficiais. Clique para sortear os grupos e confrontos desta edição.
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          soundEngine.playClick();
                          onOpenTournamentDraw?.(activeEdition.compId);
                        }}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-slate-950 text-xs font-black whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        <Shuffle className="w-4 h-4" />
                        <span>Gerar Sorteio dos Grupos</span>
                      </button>
                    </div>
                  );
                })()}

                {renderTournamentHub(activeEdition, contSubMode)}
              </div>
            );
          })()}
        </div>
      )}

      {/* ==================================================================== */}
      {/* WORLD TAB 6: RANKING MUNDIAL DA FIFA (70 NAÇÕES)                     */}
      {/* ==================================================================== */}
      {worldSubTab === 'ranking' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl bg-slate-950 border border-amber-500/35">
              <div className="flex items-center justify-between text-xs text-amber-400 font-bold mb-1">
                <span>Líder do Ranking Mundial</span>
                <Crown className="w-4 h-4 text-amber-400" />
              </div>
              <div className="flex items-center gap-3 mt-2">
                {topRankedTeam && <TeamCrest team={topRankedTeam.team} size="md" />}
                <div>
                  <div className="text-base font-black text-white">{topRankedTeam?.team.name}</div>
                  <div className="text-xs text-amber-300 font-mono tabular-nums font-bold">
                    {topRankedTeam?.points.toFixed(1)} pts FIFA · {topRankedTeam?.team.confederation}
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950 border border-emerald-500/35">
              <div className="flex items-center justify-between text-xs text-emerald-400 font-bold mb-1">
                <span>Maior Salto no Ciclo</span>
                <TrendingUp className="w-4 h-4 text-emerald-400" />
              </div>
              {biggestMover ? (
                <div className="flex items-center gap-3 mt-2">
                  <TeamCrest team={biggestMover.team} size="md" />
                  <div>
                    <div className="text-base font-black text-white">{biggestMover.team.name}</div>
                    <div className="text-xs text-emerald-300 font-mono tabular-nums font-bold">
                      {biggestMover.rankDiff > 0 ? `+${biggestMover.rankDiff} posições` : 'Evolução'} ·{' '}
                      +{(biggestMover.meta?.lastDelta || 0).toFixed(1)} pts
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-xs text-slate-400 mt-2">
                  Dispute Datas FIFA e Eliminatórias para atualizar a variação do ranking mundial.
                </div>
              )}
            </div>

            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800">
              <div className="text-xs text-sky-400 font-bold mb-1">Impacto no {userClub.shortName}</div>
              <div className="text-base font-black text-white font-mono tabular-nums mt-2">
                {formatCurrency(totalCompensationHistory)}
              </div>
              <div className="text-xs text-slate-400 mt-0.5">
                {userClubCappedCount} atletas do clube com histórico de seleção
              </div>
            </div>
          </div>

          <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden">
            <div className="p-4 bg-black border-b border-slate-800 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm font-black text-white">
                    Ranking Mundial da FIFA · {NATIONAL_TEAMS_CATALOG.length} Seleções
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Atualizado em tempo real pelo algoritmo oficial FIFA SUM após cada partida
                  </p>
                </div>

                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={rankingSearch}
                    onChange={(e) => setRankingSearch(e.target.value)}
                    placeholder="Buscar seleção..."
                    className="pl-8 pr-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800 overflow-x-auto">
                  {CONFED_FILTERS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setRankingConfedFilter(c)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap shrink-0 cursor-pointer ${
                        rankingConfedFilter === c
                          ? 'bg-amber-400 text-slate-950 font-black'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {c === 'ALL' ? `Todas (${NATIONAL_TEAMS_CATALOG.length})` : c}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800">
                  {(
                    [
                      { id: 'POINTS' as const, label: 'Pontos FIFA' },
                      { id: 'MOVERS' as const, label: 'Maior Salto' },
                      { id: 'ALPHA' as const, label: 'Alfabética' },
                    ] as const
                  ).map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setRankingSort(s.id)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap shrink-0 cursor-pointer ${
                        rankingSort === s.id
                          ? 'bg-sky-400 text-slate-950 font-black'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="overflow-x-auto max-h-[640px]">
              <table className="w-full text-left text-xs">
                <thead className="bg-black text-slate-400 border-b border-slate-800 sticky top-0 z-10">
                  <tr>
                    <th className="py-2.5 px-3">#</th>
                    <th className="py-2.5 px-2">Var.</th>
                    <th className="py-2.5 px-3">Seleção</th>
                    <th className="py-2.5 px-2">Confed.</th>
                    <th className="py-2.5 px-2 text-center">OVR</th>
                    <th className="py-2.5 px-2 text-right">Pts FIFA</th>
                    <th className="py-2.5 px-2 text-right">Delta</th>
                    <th className="py-2.5 px-2 text-center">Copas</th>
                    <th className="py-2.5 px-3 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono tabular-nums">
                  {filteredRankingRows.map(({ team, points, rank, rankDiff, meta }) => {
                    const isMine = activeUserTeamId === team.id;
                    const eligible = managerReputation >= team.minReputationToCoach;
                    return (
                      <tr key={team.id} className={isMine ? 'bg-amber-500/10' : 'hover:bg-slate-900/40'}>
                        <td className="py-2.5 px-3 font-black text-slate-300">{rank}º</td>
                        <td className="py-2.5 px-2">
                          {rankDiff > 0 ? (
                            <span className="inline-flex items-center text-[11px] font-bold text-emerald-400">
                              <TrendingUp className="w-3 h-3 mr-0.5" />+{rankDiff}
                            </span>
                          ) : rankDiff < 0 ? (
                            <span className="inline-flex items-center text-[11px] font-bold text-rose-400">
                              <TrendingDown className="w-3 h-3 mr-0.5" />{rankDiff}
                            </span>
                          ) : (
                            <Minus className="w-2.5 h-2.5 text-slate-600" />
                          )}
                        </td>
                        <td className="py-2.5 px-3 font-sans">
                          <div className="flex items-center gap-2.5">
                            <TeamCrest team={team} size="sm" />
                            <div>
                              <span className={`font-bold ${isMine ? 'text-amber-300 font-black' : 'text-white'}`}>
                                {team.name}
                              </span>
                              <span className="text-[11px] text-slate-500 ml-1.5 font-mono">
                                {team.federationCode}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="py-2.5 px-2 text-slate-400 font-sans">{team.confederation}</td>
                        <td className="py-2.5 px-2 text-center font-bold text-sky-400">{team.strength}</td>
                        <td className="py-2.5 px-2 text-right font-black text-white">{points.toFixed(1)}</td>
                        <td className="py-2.5 px-2 text-right">
                          {meta?.lastDelta !== undefined ? (
                            <span
                              className={`text-[11px] font-bold ${
                                meta.lastDelta > 0
                                  ? 'text-emerald-400'
                                  : meta.lastDelta < 0
                                  ? 'text-rose-400'
                                  : 'text-slate-400'
                              }`}
                            >
                              {meta.lastDelta > 0 ? `+${meta.lastDelta.toFixed(1)}` : meta.lastDelta.toFixed(1)}
                            </span>
                          ) : (
                            <span className="text-slate-600">-</span>
                          )}
                        </td>
                        <td className="py-2.5 px-2 text-center text-amber-300">
                          {team.worldCupTitles > 0 ? `${team.worldCupTitles}x` : '-'}
                        </td>
                        <td className="py-2.5 px-3 text-right font-sans">
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => jumpToInspectNation(team.id)}
                              className="px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 border border-slate-700 text-[11px] font-semibold text-slate-200 whitespace-nowrap shrink-0 cursor-pointer"
                            >
                              Inspecionar
                            </button>

                            {isMine ? (
                              <span className="text-[11px] font-bold text-emerald-400 px-1.5">Seu Cargo</span>
                            ) : eligible ? (
                              <button
                                type="button"
                                onClick={() => onAppointNation(team)}
                                className="px-2.5 py-1 rounded bg-amber-400 hover:bg-amber-300 text-slate-950 text-[11px] font-black whitespace-nowrap shrink-0 cursor-pointer"
                              >
                                Assumir
                              </button>
                            ) : (
                              <span className="text-[11px] text-slate-500 font-mono tabular-nums">
                                Rep {team.minReputationToCoach}+
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
