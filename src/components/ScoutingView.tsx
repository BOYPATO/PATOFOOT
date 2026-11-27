import React, { useEffect, useMemo, useState } from 'react';
import {
  Club,
  DetailedRole,
  ScoutAgeFocus,
  ScoutMissionDepth,
  ScoutRegionCategory,
  ScoutStaffMember,
  ScoutedProspect,
  ScoutingNetworkState,
  YouthAgeGroupFilter,
  YouthTrainingFocus,
  YouthTrainingIntensity,
  YouthTryoutTier,
} from '../types/game';
import {
  SCOUTING_REGIONS,
  SCOUT_AGE_PROFILES,
  SCOUT_MISSION_DEPTHS,
  ScoutingRegionInfo,
  calculateMissionCost,
  getHireFourthScoutCost,
  getUpgradeScoutCost,
} from '../utils/scoutingEngine';
import {
  MAX_YOUTH_ACADEMY_PLAYERS,
  createInitialYouthAcademy,
} from '../utils/youthAcademyEngine';
import { getClubEconomyProfile } from '../utils/clubEconomyScale';
import { evaluatePlayerClubWillingness } from '../utils/transferWillingnessEngine';
import { YouthAcademySection } from './YouthAcademySection';
import { getTransferWindowStatus } from '../utils/transferWindowEngine';
import { formatPlayerNationalityFull, getNationalityInfo } from '../utils/nationalityUtils';
import { PlayerAvatar } from './PlayerAvatar';
import { comparePlayersByPosition } from '../utils/playerOrdering';
import { usePlayerInspection } from '../context/PlayerInspectionContext';
import { soundEngine } from '../services/soundEngine';
import {
  Compass,
  Globe,
  MapPin,
  Search,
  Star,
  Bookmark,
  UserPlus,
  Clock,
  CheckCircle2,
  XCircle,
  TrendingUp,
  Users,
  Trash2,
  ArrowUpRight,
  DollarSign,
  GraduationCap,
} from 'lucide-react';
import confetti from 'canvas-confetti';

export type ScoutingSubTab = 'dispatch' | 'academy' | 'prospects' | 'shortlist' | 'staff';

interface ScoutingViewProps {
  userClub: Club;
  scoutingNetwork: ScoutingNetworkState;
  currentDate: string;
  initialSubTab?: ScoutingSubTab;
  onDispatchMission: (params: {
    scoutId: string;
    regionId: string;
    roleFocus: DetailedRole | 'ALL';
    ageFocus: ScoutAgeFocus;
    depth: ScoutMissionDepth;
  }) => {
    success: boolean;
    errorMessage?: string;
    immediateCount?: number;
    missionId?: string;
  };
  onToggleShortlist: (prospectId: string) => void;
  onDismissProspect: (prospectId: string) => void;
  onSignProspect: (
    prospect: ScoutedProspect,
    transferFee: number,
    wage: number,
    contractYears?: number
  ) => boolean;
  onUpgradeScout: (scoutId: string) => { success: boolean; errorMessage?: string };
  onHireFourthScout: (specialty: ScoutRegionCategory) => { success: boolean; errorMessage?: string };
  onRunYouthTryout: (params: {
    tier: YouthTryoutTier;
    roleFocus: DetailedRole | 'ALL';
    ageGroup: YouthAgeGroupFilter;
  }) => {
    success: boolean;
    errorMessage?: string;
    candidatesCount?: number;
  };
  onRecruitYouthCandidate: (candidateId: string) => {
    success: boolean;
    errorMessage?: string;
    boyName?: string;
  };
  onDismissYouthCandidate: (candidateId: string) => void;
  onPromoteYouthBoy: (boyId: string) => {
    success: boolean;
    errorMessage?: string;
    playerName?: string;
  };
  onReleaseYouthBoy: (boyId: string) => void;
  onUpgradeYouthAcademy: () => {
    success: boolean;
    errorMessage?: string;
    newLevel?: number;
  };
  onUpdateYouthTrainingPlan?: (params: {
    trainingFocus?: YouthTrainingFocus;
    trainingIntensity?: YouthTrainingIntensity;
  }) => void;
  onSetYouthBoyFocus?: (boyId: string, focus: YouthTrainingFocus | 'PADRAO') => void;
  onRunYouthTrainingSession?: () => {
    success: boolean;
    errorMessage?: string;
    evolvedBoys?: Array<{ name: string; role: DetailedRole; newOvr: number; delta: number }>;
    trainedCount?: number;
  };
  onAdvanceDay?: () => void;
}

export const ScoutingView: React.FC<ScoutingViewProps> = ({
  userClub,
  scoutingNetwork,
  currentDate,
  initialSubTab,
  onDispatchMission,
  onToggleShortlist,
  onDismissProspect,
  onSignProspect,
  onUpgradeScout,
  onHireFourthScout,
  onRunYouthTryout,
  onRecruitYouthCandidate,
  onDismissYouthCandidate,
  onPromoteYouthBoy,
  onReleaseYouthBoy,
  onUpgradeYouthAcademy,
  onUpdateYouthTrainingPlan,
  onSetYouthBoyFocus,
  onRunYouthTrainingSession,
  onAdvanceDay,
}) => {
  const inspection = usePlayerInspection();
  const [subTab, setSubTab] = useState<ScoutingSubTab>(
    initialSubTab ||
      (scoutingNetwork.prospects.filter((p) => !p.isDismissed).length > 0 ? 'prospects' : 'dispatch')
  );

  useEffect(() => {
    if (initialSubTab) {
      setSubTab(initialSubTab);
    }
  }, [initialSubTab]);

  const youthRosterCount = useMemo(() => {
    const academy = userClub.youthAcademy || createInitialYouthAcademy(userClub, currentDate);
    return academy.players.length;
  }, [userClub, currentDate]);

  // Mission Dispatch Form State
  const [regionFilterCategory, setRegionFilterCategory] = useState<'ALL' | ScoutRegionCategory>('ALL');
  const [selectedRegionId, setSelectedRegionId] = useState<string>(SCOUTING_REGIONS[0].id);
  const availableScouts = scoutingNetwork.scouts.filter((s) => !s.activeMissionId);
  const [selectedScoutId, setSelectedScoutId] = useState<string>(
    availableScouts[0]?.id || scoutingNetwork.scouts[0]?.id || ''
  );
  const [roleFocus, setRoleFocus] = useState<DetailedRole | 'ALL'>('ALL');
  const [ageFocus, setAgeFocus] = useState<ScoutAgeFocus>('JOIAS_BASE');
  const [missionDepth, setMissionDepth] = useState<ScoutMissionDepth>('EXPRESSO');
  const [dispatchBanner, setDispatchBanner] = useState<{
    type: 'success' | 'error';
    text: string;
    actionLabel?: string;
    onAction?: () => void;
  } | null>(null);

  // Discovered Prospects Filter & Sort State
  const [prospectSearch, setProspectSearch] = useState<string>('');
  const [prospectRegionFilter, setProspectRegionFilter] = useState<string>('ALL');
  const [prospectRoleFilter, setProspectRoleFilter] = useState<string>('ALL');
  const [minPotentialFilter, setMinPotentialFilter] = useState<number>(75);
  const [sortBy, setSortBy] = useState<'POTENTIAL' | 'OVERALL' | 'POS_ASC' | 'VALUE_ASC' | 'AGE_ASC'>('POTENTIAL');

  // Staff Hiring & Feedback State
  const [newScoutSpecialty, setNewScoutSpecialty] = useState<ScoutRegionCategory>('AMERICA_SUL');
  const [staffFeedback, setStaffFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Direct Signing Negotiation Modal
  const [negotiatingProspect, setNegotiatingProspect] = useState<ScoutedProspect | null>(null);
  const [offerFee, setOfferFee] = useState<number>(0);
  const [offerWage, setOfferWage] = useState<number>(0);
  const [offerContractYears, setOfferContractYears] = useState<number>(4);
  const [negotiationResult, setNegotiationResult] = useState<{ success: boolean; msg: string } | null>(null);

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      maximumFractionDigits: 0,
    }).format(val);

  const formatCompactCurrency = (val: number) => {
    if (val >= 1000000) {
      return `R$ ${(val / 1000000).toFixed(2).replace('.', ',')} mi`;
    }
    return `R$ ${Math.round(val / 1000)} mil`;
  };

  const formatDateBR = (dateStr?: string) => {
    if (!dateStr || !dateStr.includes('-')) return dateStr || '';
    const [y, m, d] = dateStr.split('-');
    return `${d}/${m}/${y}`;
  };

  // Ensure selectedScoutId points to a valid scout
  const effectiveSelectedScout: ScoutStaffMember | undefined = useMemo(() => {
    const exact = scoutingNetwork.scouts.find((s) => s.id === selectedScoutId);
    if (exact && !exact.activeMissionId) return exact;
    return availableScouts[0] || exact || scoutingNetwork.scouts[0];
  }, [scoutingNetwork.scouts, selectedScoutId, availableScouts]);

  const selectedRegion: ScoutingRegionInfo = useMemo(
    () => SCOUTING_REGIONS.find((r) => r.id === selectedRegionId) || SCOUTING_REGIONS[0],
    [selectedRegionId]
  );

  const filteredRegions = useMemo(() => {
    if (regionFilterCategory === 'ALL') return SCOUTING_REGIONS;
    return SCOUTING_REGIONS.filter((r) => r.category === regionFilterCategory);
  }, [regionFilterCategory]);

  const activeMissions = useMemo(
    () => scoutingNetwork.missions.filter((m) => m.status === 'ACTIVE'),
    [scoutingNetwork.missions]
  );

  const visibleProspects = useMemo(
    () => scoutingNetwork.prospects.filter((p) => !p.isDismissed),
    [scoutingNetwork.prospects]
  );

  const shortlistedProspects = useMemo(
    () => scoutingNetwork.prospects.filter((p) => p.isShortlisted && !p.isDismissed),
    [scoutingNetwork.prospects]
  );

  const filteredAndSortedProspects = useMemo(() => {
    const basePool = subTab === 'shortlist' ? shortlistedProspects : visibleProspects;

    const filtered = basePool.filter((item) => {
      if (prospectRegionFilter !== 'ALL' && item.regionId !== prospectRegionFilter) return false;
      if (prospectRoleFilter !== 'ALL' && item.player.detailedRole !== prospectRoleFilter) return false;
      if (item.potentialMax < minPotentialFilter) return false;
      if (prospectSearch.trim()) {
        const q = prospectSearch.toLowerCase();
        const matchName = item.player.name.toLowerCase().includes(q);
        const matchCountry = item.country.toLowerCase().includes(q);
        const matchRegion = item.regionName.toLowerCase().includes(q);
        const matchClub = item.originClubName.toLowerCase().includes(q);
        if (!matchName && !matchCountry && !matchRegion && !matchClub) return false;
      }
      return true;
    });

    return [...filtered].sort((a, b) => {
      if (sortBy === 'POS_ASC') {
        return comparePlayersByPosition(a.player, b.player);
      }
      if (sortBy === 'POTENTIAL') {
        return b.potentialMax - a.potentialMax || b.player.overall - a.player.overall;
      }
      if (sortBy === 'OVERALL') {
        return b.player.overall - a.player.overall || b.potentialMax - a.potentialMax;
      }
      if (sortBy === 'VALUE_ASC') {
        return a.estimatedMarketValue - b.estimatedMarketValue;
      }
      return a.player.age - b.player.age || b.potentialMax - a.potentialMax;
    });
  }, [
    subTab,
    shortlistedProspects,
    visibleProspects,
    prospectRegionFilter,
    prospectRoleFilter,
    minPotentialFilter,
    prospectSearch,
    sortBy,
  ]);

  const currentMissionCost = useMemo(() => {
    if (!effectiveSelectedScout) {
      const mult = getClubEconomyProfile(userClub).scoutMissionMult;
      return Math.max(5_000, Math.round((selectedRegion.baseCost * mult) / 1_000) * 1_000);
    }
    return calculateMissionCost(selectedRegion, missionDepth, effectiveSelectedScout, userClub);
  }, [selectedRegion, missionDepth, effectiveSelectedScout, userClub]);

  const handleConfirmDispatch = () => {
    soundEngine.playClick();
    if (!effectiveSelectedScout) {
      setDispatchBanner({
        type: 'error',
        text: 'Nenhum olheiro disponível no momento.',
      });
      return;
    }

    const res = onDispatchMission({
      scoutId: effectiveSelectedScout.id,
      regionId: selectedRegion.id,
      roleFocus,
      ageFocus,
      depth: missionDepth,
    });

    if (!res.success) {
      soundEngine.playWhistle(false);
      setDispatchBanner({
        type: 'error',
        text: res.errorMessage || 'Não foi possível enviar o olheiro.',
      });
      return;
    }

    if (missionDepth === 'EXPRESSO') {
      soundEngine.playFanfare();
      setProspectRegionFilter(selectedRegion.id);
      setMinPotentialFilter(70);
      setDispatchBanner({
        type: 'success',
        text: `Relatório concluído! ${effectiveSelectedScout.name} mapeou ${res.immediateCount || 4} talentos em ${selectedRegion.name} (${selectedRegion.country}).`,
      });
      setSubTab('prospects');
    } else {
      const days = SCOUT_MISSION_DEPTHS[missionDepth].days;
      setDispatchBanner({
        type: 'success',
        text: `Missão iniciada! ${effectiveSelectedScout.name} embarcou para ${selectedRegion.name} (${selectedRegion.country}) e enviará o relatório completo em ${days} dias.`,
      });
      // Switch selected scout to next free scout if available
      const nextFree = scoutingNetwork.scouts.find(
        (s) => s.id !== effectiveSelectedScout.id && !s.activeMissionId
      );
      if (nextFree) setSelectedScoutId(nextFree.id);
    }
  };

  const openSigningModal = (prospect: ScoutedProspect) => {
    soundEngine.playClick();
    setNegotiatingProspect(prospect);
    setOfferFee(prospect.estimatedMarketValue);
    setOfferWage(Math.round(prospect.player.wage * 1.1));
    setOfferContractYears(
      prospect.player.age >= 35 ? 2 : prospect.player.age >= 30 ? 3 : 4
    );
    setNegotiationResult(null);
  };

  const handleSubmitOffer = () => {
    if (!negotiatingProspect) return;
    soundEngine.playClick();

    const willingness = evaluatePlayerClubWillingness(userClub, negotiatingProspect.player, {
      dealType: 'SCOUT',
    });
    if (!willingness.willing) {
      soundEngine.playWhistle(false);
      setNegotiationResult({
        success: false,
        msg:
          willingness.reason ||
          `${negotiatingProspect.player.name} (OVR ${negotiatingProspect.player.overall}) recusou a proposta por considerar o ${userClub.shortName} abaixo do seu patamar atual.`,
      });
      return;
    }

    if (userClub.finances.balance < offerFee) {
      setNegotiationResult({
        success: false,
        msg: `Saldo insuficiente em caixa. Seu clube dispõe de ${formatCurrency(userClub.finances.balance)}.`,
      });
      return;
    }

    const minClubFee = Math.round(negotiatingProspect.askingFee * 0.94);
    const minPlayerWage = Math.round(negotiatingProspect.player.wage * 1.0);

    if (offerFee < minClubFee) {
      soundEngine.playWhistle(false);
      setNegotiationResult({
        success: false,
        msg: `O ${negotiatingProspect.originClubName} recusou a oferta e exige pelo menos ${formatCurrency(minClubFee)} para liberar ${negotiatingProspect.player.name}.`,
      });
      return;
    }

    if (offerWage < minPlayerWage) {
      soundEngine.playWhistle(false);
      setNegotiationResult({
        success: false,
        msg: `O estafe de ${negotiatingProspect.player.name} recusou a proposta salarial (mínimo pedido: ${formatCurrency(minPlayerWage)}/mês).`,
      });
      return;
    }

    const signed = onSignProspect(
      negotiatingProspect,
      offerFee,
      offerWage,
      offerContractYears
    );
    if (signed) {
      const winStatus = getTransferWindowStatus(currentDate, userClub);
      soundEngine.playFanfare();
      confetti({ particleCount: 85, spread: 75 });
      setNegotiationResult({
        success: true,
        msg: winStatus.isOpen
          ? `Negócio fechado! ${negotiatingProspect.player.name} (${negotiatingProspect.regionName}) assinou por ${offerContractYears} ${offerContractYears === 1 ? 'ano' : 'anos'} com o ${userClub.name} e já integra seu elenco!`
          : `Negócio fechado! ${negotiatingProspect.player.name} (${negotiatingProspect.regionName}) assinou por ${offerContractYears} ${offerContractYears === 1 ? 'ano' : 'anos'} com o ${userClub.name} e se apresentará na abertura da janela em ${winStatus.nextOpenDisplay}!`,
      });
      setTimeout(() => {
        setNegotiatingProspect(null);
      }, 1900);
    } else {
      soundEngine.playWhistle(false);
      setNegotiationResult({
        success: false,
        msg: 'Não foi possível concluir a contratação no momento (verifique limite de elenco ou pendências).',
      });
    }
  };

  const renderStars = (count: number) => (
    <span className="inline-flex items-center gap-0.5 text-amber-400" aria-label={`${count} estrelas`}>
      {Array.from({ length: 5 }).map((_, idx) => (
        <Star
          key={idx}
          className={`w-3.5 h-3.5 ${idx < count ? 'fill-amber-400 text-amber-400' : 'text-slate-700'}`}
        />
      ))}
    </span>
  );

  const distinctMappedRegions = useMemo(() => {
    const map = new Map<string, string>();
    visibleProspects.forEach((p) => {
      map.set(p.regionId, `${p.regionName} (${p.country})`);
    });
    return Array.from(map.entries());
  }, [visibleProspects]);

  return (
    <div className="space-y-6">
      {/* Top Overview & Segmented Navigation */}
      <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-sky-500/15 border border-sky-500/30 text-sky-400 flex items-center justify-center shrink-0">
              <Compass className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight">
                Rede de Olheiros & Categorias de Base
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Envie observadores pelo mundo ou organize peneiras para recrutar e desenvolver até {MAX_YOUTH_ACADEMY_PLAYERS} garotos na base do clube.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-5 text-xs text-slate-400 tabular-nums">
            <div>
              <span className="block text-slate-500">Olheiros Livres</span>
              <strong className="text-white text-sm font-semibold">
                {availableScouts.length}/{scoutingNetwork.scouts.length} disponíveis
              </strong>
            </div>
            <span className="text-slate-800" aria-hidden="true">|</span>
            <div>
              <span className="block text-slate-500">Talentos Mapeados</span>
              <strong className="text-sky-400 text-sm font-semibold">{visibleProspects.length} atletas</strong>
            </div>
            <span className="text-slate-800" aria-hidden="true">|</span>
            <div>
              <span className="block text-slate-500">Base do Clube</span>
              <strong className="text-emerald-400 text-sm font-semibold">
                {youthRosterCount}/{MAX_YOUTH_ACADEMY_PLAYERS} garotos
              </strong>
            </div>
            <span className="text-slate-800" aria-hidden="true">|</span>
            <div>
              <span className="block text-slate-500">Verba em Caixa</span>
              <strong className="text-emerald-400 text-sm font-mono font-semibold">
                {formatCurrency(userClub.finances.balance)}
              </strong>
            </div>
          </div>
        </div>

        {/* Clean Segmented Control */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-900 rounded-xl overflow-x-auto">
          <button
            onClick={() => {
              soundEngine.playClick();
              setSubTab('dispatch');
            }}
            className={`px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              subTab === 'dispatch'
                ? 'bg-sky-400 text-slate-950 font-bold shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/70'
            }`}
          >
            Enviar Olheiros {activeMissions.length > 0 ? `(${activeMissions.length} em viagem)` : ''}
          </button>
          <button
            onClick={() => {
              soundEngine.playClick();
              setSubTab('academy');
            }}
            className={`px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer flex items-center gap-1.5 tabular-nums ${
              subTab === 'academy'
                ? 'bg-emerald-400 text-slate-950 font-bold shadow-sm'
                : 'text-emerald-300 hover:text-white hover:bg-slate-800/70'
            }`}
          >
            <GraduationCap className="w-4 h-4 shrink-0" />
            <span>
              Base do Clube & Peneiras ({youthRosterCount}/{MAX_YOUTH_ACADEMY_PLAYERS})
            </span>
          </button>
          <button
            onClick={() => {
              soundEngine.playClick();
              setSubTab('prospects');
            }}
            className={`px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              subTab === 'prospects'
                ? 'bg-sky-400 text-slate-950 font-bold shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/70'
            }`}
          >
            Talentos Descobertos ({visibleProspects.length})
          </button>
          <button
            onClick={() => {
              soundEngine.playClick();
              setSubTab('shortlist');
            }}
            className={`px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              subTab === 'shortlist'
                ? 'bg-sky-400 text-slate-950 font-bold shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/70'
            }`}
          >
            Lista de Observação ({shortlistedProspects.length})
          </button>
          <button
            onClick={() => {
              soundEngine.playClick();
              setSubTab('staff');
            }}
            className={`px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              subTab === 'staff'
                ? 'bg-sky-400 text-slate-950 font-bold shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/70'
            }`}
          >
            Equipe de Olheiros ({scoutingNetwork.scouts.length}/4)
          </button>
        </div>
      </div>

      {/* Inline Feedback Banner */}
      {dispatchBanner && (
        <div
          className={`rounded-xl border px-4 py-3 flex flex-wrap items-center justify-between gap-3 text-xs ${
            dispatchBanner.type === 'success'
              ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200'
              : 'bg-rose-950/40 border-rose-500/40 text-rose-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {dispatchBanner.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
            )}
            <span>{dispatchBanner.text}</span>
          </div>
          <button
            onClick={() => setDispatchBanner(null)}
            className="text-slate-400 hover:text-white font-semibold whitespace-nowrap shrink-0 cursor-pointer"
          >
            Fechar
          </button>
        </div>
      )}

      {/* SUBTAB 1: DISPATCH SCOUTS TO REGIONS OR COUNTRIES */}
      {subTab === 'dispatch' && (
        <div className="space-y-6">
          {/* Active Expeditions Progress Bar (if any) */}
          {activeMissions.length > 0 && (
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Clock className="w-4 h-4 text-sky-400" />
                    <span>Viagens de Observação em Andamento ({activeMissions.length})</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Os relatórios chegam automaticamente conforme os dias avançam no calendário ou após as rodadas.
                  </p>
                </div>

                {onAdvanceDay && (
                  <button
                    onClick={() => {
                      soundEngine.playClick();
                      onAdvanceDay();
                    }}
                    className="px-3.5 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-sky-300 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    Avançar +1 Dia no Calendário
                  </button>
                )}
              </div>

              <div className="divide-y divide-slate-800/80">
                {activeMissions.map((mission) => {
                  const pct =
                    mission.totalDays > 0
                      ? Math.round(((mission.totalDays - mission.daysRemaining) / mission.totalDays) * 100)
                      : 100;
                  return (
                    <div key={mission.id} className="py-3 first:pt-0 last:pb-0 flex flex-wrap items-center justify-between gap-4">
                      <div>
                        <p className="text-sm font-semibold text-white">
                          {mission.regionName} · {mission.country}
                        </p>
                        <p className="text-xs text-slate-400 mt-0.5">
                          <span>Olheiro: {mission.scoutName}</span>
                          <span className="mx-1.5">·</span>
                          <span>Posição: {mission.roleFocus === 'ALL' ? 'Todas' : mission.roleFocus}</span>
                          <span className="mx-1.5">·</span>
                          <span>{SCOUT_AGE_PROFILES[mission.ageFocus].label}</span>
                        </p>
                      </div>

                      <div className="w-full sm:w-56 space-y-1.5 tabular-nums">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-400">Retorno estimado</span>
                          <strong className="text-sky-400 font-mono">
                            {mission.daysRemaining} {mission.daysRemaining === 1 ? 'dia restante' : 'dias restantes'}
                          </strong>
                        </div>
                        <div className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-sky-400 transition-transform duration-200 origin-left"
                            style={{ transform: `scaleX(${Math.max(0.08, pct / 100)})` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Main 2-Column Mission Planner */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Column (7 cols): Region & Country Selector */}
            <div className="lg:col-span-7 bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-bold text-white">01. Escolha a Região ou País</h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Cada polo formador concentra perfis técnicos, custos de viagem e valores de mercado próprios.
                  </p>
                </div>

                {/* Macro-Region Filter Buttons */}
                <div className="flex items-center gap-1 p-1 bg-slate-900 rounded-lg">
                  {(
                    [
                      { id: 'ALL', label: 'Todos' },
                      { id: 'BRASIL', label: 'Brasil' },
                      { id: 'AMERICA_SUL', label: 'América do Sul' },
                      { id: 'INTERNACIONAL', label: 'Internacional' },
                    ] as const
                  ).map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => {
                        soundEngine.playClick();
                        setRegionFilterCategory(cat.id);
                      }}
                      className={`px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                        regionFilterCategory === cat.id
                          ? 'bg-slate-800 text-white font-semibold shadow-sm'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {filteredRegions.map((region) => {
                  const isSelected = region.id === selectedRegion.id;
                  const isSpecialtyMatch =
                    effectiveSelectedScout?.specialtyRegion === region.category;

                  return (
                    <button
                      key={region.id}
                      type="button"
                      onClick={() => {
                        soundEngine.playClick();
                        setSelectedRegionId(region.id);
                      }}
                      className={`text-left p-4 rounded-xl border transition-colors cursor-pointer flex flex-col justify-between gap-2.5 ${
                        isSelected
                          ? 'bg-sky-950/35 border-sky-400 text-white'
                          : 'bg-slate-900/50 border-slate-800/90 text-slate-300 hover:border-slate-700 hover:bg-slate-900'
                      }`}
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h4 className="font-bold text-sm text-white">{region.name}</h4>
                            <p className="text-[11px] text-slate-400 mt-0.5">
                              <span>{region.country}</span>
                              <span className="mx-1.5">·</span>
                              <span>{region.statesOrCities}</span>
                            </p>
                          </div>
                          <Globe
                            className={`w-4 h-4 shrink-0 ${
                              isSelected ? 'text-sky-400' : 'text-slate-600'
                            }`}
                          />
                        </div>

                        <p className="text-xs text-slate-300 mt-2.5 leading-relaxed">
                          {region.talentProfile}
                        </p>
                      </div>

                      <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400 tabular-nums">
                        <span>
                          Foco natural: {region.preferredRoles.slice(0, 3).join(' · ')}
                        </span>
                        <span className="font-mono font-semibold text-sky-300">
                          {formatCompactCurrency(
                            Math.max(
                              5_000,
                              Math.round(
                                (region.baseCost * getClubEconomyProfile(userClub).scoutMissionMult) /
                                  1_000
                              ) * 1_000
                            )
                          )}
                          {isSpecialtyMatch ? ' (-10%)' : ''}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Right Column (5 cols): Mission Parameters & Dispatch */}
            <div className="lg:col-span-5 bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-5">
              <div>
                <h3 className="text-base font-bold text-white">02. Configurar Missão de Observação</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Destino selecionado: <strong className="text-sky-300">{selectedRegion.name} ({selectedRegion.country})</strong>
                </p>
              </div>

              {/* Scout Selection */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-300">
                  Olheiro Designado
                </label>
                <div className="space-y-2">
                  {scoutingNetwork.scouts.map((scout) => {
                    const isBusy = Boolean(scout.activeMissionId);
                    const isSelected = effectiveSelectedScout?.id === scout.id && !isBusy;
                    const hasBonus = scout.specialtyRegion === selectedRegion.category;

                    return (
                      <button
                        key={scout.id}
                        type="button"
                        disabled={isBusy}
                        onClick={() => {
                          soundEngine.playClick();
                          setSelectedScoutId(scout.id);
                        }}
                        className={`w-full text-left px-3.5 py-2.5 rounded-xl border transition-colors flex items-center justify-between gap-2 ${
                          isBusy
                            ? 'bg-slate-900/30 border-slate-800/60 opacity-55 cursor-not-allowed'
                            : isSelected
                            ? 'bg-sky-950/35 border-sky-400 cursor-pointer'
                            : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 cursor-pointer'
                        }`}
                      >
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-white truncate">{scout.name}</p>
                          <p className="text-[11px] text-slate-400 truncate mt-0.5">
                            <span>{scout.specialtyLabel}</span>
                            {hasBonus && !isBusy && (
                              <>
                                <span className="mx-1">·</span>
                                <span className="text-emerald-400 font-medium">Domínio da região</span>
                              </>
                            )}
                            {isBusy && (
                              <>
                                <span className="mx-1">·</span>
                                <span className="text-amber-400">Em viagem</span>
                              </>
                            )}
                          </p>
                        </div>
                        <div className="shrink-0">{renderStars(scout.stars)}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Position Focus */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-300">
                  Posição Alvo
                </label>
                <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5">
                  {(['ALL', 'GOL', 'LAT', 'ZAG', 'VOL', 'MEI', 'ATA'] as const).map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => {
                        soundEngine.playClick();
                        setRoleFocus(r);
                      }}
                      className={`py-2 px-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                        roleFocus === r
                          ? 'bg-sky-400 text-slate-950 font-bold'
                          : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800'
                      }`}
                    >
                      {r === 'ALL' ? 'Todas' : r}
                    </button>
                  ))}
                </div>
              </div>

              {/* Age / Talent Profile */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-300">
                  Perfil Etário & Foco de Prospecção
                </label>
                <div className="space-y-1.5">
                  {(Object.keys(SCOUT_AGE_PROFILES) as ScoutAgeFocus[]).map((key) => {
                    const prof = SCOUT_AGE_PROFILES[key];
                    const active = ageFocus === key;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => {
                          soundEngine.playClick();
                          setAgeFocus(key);
                        }}
                        className={`w-full text-left px-3.5 py-2.5 rounded-xl border transition-colors cursor-pointer ${
                          active
                            ? 'bg-sky-950/35 border-sky-400 text-white'
                            : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:border-slate-700'
                        }`}
                      >
                        <div className="text-xs font-bold text-white">{prof.label}</div>
                        <div className="text-[11px] text-slate-400 mt-0.5">{prof.description}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Mission Depth */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-300">
                  Escopo da Cobertura
                </label>
                <div className="space-y-1.5">
                  {(Object.keys(SCOUT_MISSION_DEPTHS) as ScoutMissionDepth[]).map((key) => {
                    const meta = SCOUT_MISSION_DEPTHS[key];
                    const active = missionDepth === key;
                    const optionCost = effectiveSelectedScout
                      ? calculateMissionCost(selectedRegion, key, effectiveSelectedScout, userClub)
                      : Math.max(
                          5_000,
                          Math.round(
                            (selectedRegion.baseCost *
                              meta.costMultiplier *
                              getClubEconomyProfile(userClub).scoutMissionMult) /
                              1_000
                          ) * 1_000
                        );

                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => {
                          soundEngine.playClick();
                          setMissionDepth(key);
                        }}
                        className={`w-full text-left px-3.5 py-2.5 rounded-xl border transition-colors cursor-pointer ${
                          active
                            ? 'bg-sky-950/35 border-sky-400 text-white'
                            : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-bold text-white">{meta.label}</span>
                          <span className="text-xs font-mono font-semibold text-emerald-400 tabular-nums">
                            {formatCurrency(optionCost)}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5">{meta.description}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Cost Summary & Primary Action */}
              <div className="pt-3 border-t border-slate-800 space-y-3">
                <div className="flex items-center justify-between text-xs tabular-nums">
                  <span className="text-slate-400">Custo operacional da missão</span>
                  <strong className="text-base font-mono font-bold text-white">
                    {formatCurrency(currentMissionCost)}
                  </strong>
                </div>

                <button
                  type="button"
                  disabled={availableScouts.length === 0}
                  onClick={handleConfirmDispatch}
                  className={`w-full py-3 px-4 rounded-xl text-xs sm:text-sm font-bold transition-colors flex items-center justify-center gap-2 whitespace-nowrap shrink-0 ${
                    availableScouts.length === 0
                      ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                      : 'bg-sky-400 hover:bg-sky-300 text-slate-950 cursor-pointer shadow-lg shadow-sky-500/20'
                  }`}
                >
                  <Compass className="w-4 h-4" />
                  <span>
                    {availableScouts.length === 0
                      ? 'Todos os Olheiros Estão em Viagem'
                      : missionDepth === 'EXPRESSO'
                      ? `Gerar Relatório de ${selectedRegion.shortName}`
                      : `Enviar Olheiro para ${selectedRegion.shortName}`}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB 2 & 3: DISCOVERED TALENTS LIST & SHORTLIST */}
      {(subTab === 'prospects' || subTab === 'shortlist') && (
        <div className="space-y-5">
          {/* Filter & Sorting Toolbar */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
              <input
                type="text"
                value={prospectSearch}
                onChange={(e) => setProspectSearch(e.target.value)}
                placeholder="Buscar atleta, clube ou país..."
                className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-sky-400"
              />
            </div>

            <div>
              <select
                value={prospectRegionFilter}
                onChange={(e) => setProspectRegionFilter(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-sky-400"
              >
                <option value="ALL">Todas as Regiões / Países</option>
                {distinctMappedRegions.map(([regId, label]) => (
                  <option key={regId} value={regId}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <select
                value={prospectRoleFilter}
                onChange={(e) => setProspectRoleFilter(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-sky-400"
              >
                <option value="ALL">Todas as Posições</option>
                <option value="GOL">Goleiro (GOL)</option>
                <option value="LAT">Lateral (LAT)</option>
                <option value="ZAG">Zagueiro (ZAG)</option>
                <option value="VOL">Volante (VOL)</option>
                <option value="MEI">Meia (MEI)</option>
                <option value="ATA">Atacante (ATA)</option>
              </select>
            </div>

            <div className="flex items-center gap-2 px-1 tabular-nums">
              <span className="text-slate-400 shrink-0">Potencial Mín:</span>
              <input
                type="range"
                min={65}
                max={92}
                value={minPotentialFilter}
                onChange={(e) => setMinPotentialFilter(Number(e.target.value))}
                className="w-full accent-sky-400 cursor-pointer"
              />
              <span className="font-mono font-bold text-sky-400 w-7 text-right">
                {minPotentialFilter}
              </span>
            </div>

            <div>
              <select
                value={sortBy}
                onChange={(e) =>
                  setSortBy(e.target.value as 'POTENTIAL' | 'OVERALL' | 'POS_ASC' | 'VALUE_ASC' | 'AGE_ASC')
                }
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-sky-400"
              >
                <option value="POTENTIAL">Ordenar: Maior Potencial</option>
                <option value="OVERALL">Ordenar: Maior Força Atual</option>
                <option value="POS_ASC">Ordenar: Posição (GOL → ATA)</option>
                <option value="VALUE_ASC">Ordenar: Menor Valor Estimado</option>
                <option value="AGE_ASC">Ordenar: Mais Jovens</option>
              </select>
            </div>
          </div>

          {/* Empty State */}
          {filteredAndSortedProspects.length === 0 ? (
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-10 text-center space-y-3">
              <MapPin className="w-8 h-8 text-slate-600 mx-auto" />
              <h3 className="text-base font-bold text-white">
                {subTab === 'shortlist'
                  ? 'Nenhum jogador salvo na Lista de Observação'
                  : visibleProspects.length === 0
                  ? 'Nenhum relatório de olheiro gerado ainda'
                  : 'Nenhum talento corresponde aos filtros atuais'}
              </h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                {subTab === 'shortlist'
                  ? 'Marque jogadores descobertos pelos seus olheiros em "Observar" para acompanhá-los de perto aqui.'
                  : visibleProspects.length === 0
                  ? 'Escolha uma região brasileira ou país estrangeiro na aba Enviar Olheiros para gerar sua primeira lista de talentos com potencial e valor estimado.'
                  : 'Reduza o filtro de potencial mínimo ou selecione Todas as Regiões para visualizar todos os nomes mapeados.'}
              </p>
              {visibleProspects.length === 0 && (
                <button
                  type="button"
                  onClick={() => setSubTab('dispatch')}
                  className="mt-2 px-4 py-2 rounded-lg bg-sky-400 hover:bg-sky-300 text-slate-950 font-bold text-xs transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  Enviar Olheiro Agora
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredAndSortedProspects.map((prospect) => {
                const { player } = prospect;
                const tierColor =
                  prospect.recommendationTier === 'Joia Rara'
                    ? 'text-amber-300'
                    : prospect.recommendationTier === 'Alto Potencial'
                    ? 'text-sky-300'
                    : prospect.recommendationTier === 'Bom Custo-Benefício'
                    ? 'text-emerald-300'
                    : 'text-slate-400';

                return (
                  <div
                    key={prospect.id}
                    className="bg-slate-950 border border-slate-800 hover:border-slate-700 rounded-2xl p-5 flex flex-col justify-between gap-4 transition-colors"
                  >
                    <div className="space-y-3.5">
                      {/* Header: Quiet Kicker + Player Name + OVR / POT */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-2.5 min-w-0">
                          <PlayerAvatar player={player} size="sm" />
                          <div className="min-w-0">
                            <div className="text-[11px] font-medium text-slate-400 flex items-center gap-1.5 flex-wrap">
                              <span className={`font-semibold ${tierColor}`}>
                                {prospect.recommendationTier}
                              </span>
                              <span aria-hidden="true">·</span>
                              <span>{prospect.regionName}</span>
                            </div>

                            <button
                              type="button"
                              onClick={() => {
                                soundEngine.playClick();
                                inspection?.inspectPlayer(player, null);
                              }}
                              className="text-base font-bold text-white hover:text-sky-300 transition-colors mt-0.5 truncate block text-left cursor-pointer max-w-full"
                            >
                              {player.name}
                            </button>

                          {/* Clean Unboxed Metadata */}
                          <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1.5 flex-wrap tabular-nums">
                            <strong className="text-sky-400 font-semibold">{player.detailedRole}</strong>
                            <span aria-hidden="true">·</span>
                            <span>{player.age} anos</span>
                            <span aria-hidden="true">·</span>
                            <span>{formatPlayerNationalityFull(player, prospect.country)}</span>
                            <span aria-hidden="true">·</span>
                            <span>Pé {player.preferredFoot}</span>
                            <span aria-hidden="true">·</span>
                            <span className="text-slate-300">{prospect.originClubName}</span>
                          </p>
                          </div>
                        </div>

                        {/* Current Overall & Estimated Potential */}
                        <div className="flex items-center gap-3 shrink-0 tabular-nums text-right">
                          <div>
                            <span className="block text-[10px] text-slate-500">Atual</span>
                            <span className="text-lg font-mono font-bold text-white">
                              {player.overall}
                            </span>
                          </div>
                          <div className="h-7 w-px bg-slate-800" aria-hidden="true" />
                          <div>
                            <span className="block text-[10px] text-sky-400">Potencial</span>
                            <span className="text-lg font-mono font-bold text-sky-300">
                              {prospect.potentialMin === prospect.potentialMax
                                ? prospect.potentialMax
                                : `${prospect.potentialMin}–${prospect.potentialMax}`}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Potential Evolution Bar */}
                      <div className="space-y-1 tabular-nums">
                        <div className="flex items-center justify-between text-[11px] text-slate-400">
                          <span>Habilidade em destaque: <strong className="text-slate-200 font-medium">{player.specialSkill}</strong></span>
                          <span>Margem +{Math.max(1, prospect.potentialMax - player.overall)} pts</span>
                        </div>
                        <div className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden relative">
                          <div
                            className="h-full bg-sky-500/35 rounded-full origin-left"
                            style={{ width: `${Math.min(100, prospect.potentialMax)}%` }}
                          />
                          <div
                            className="h-full bg-sky-400 rounded-full absolute inset-y-0 left-0"
                            style={{ width: `${Math.min(100, player.overall)}%` }}
                          />
                        </div>
                      </div>

                      {/* Estimated Market Value & Wage Breakdown */}
                      <div className="pt-3 border-t border-slate-800/80 grid grid-cols-2 gap-4 text-xs tabular-nums">
                        <div>
                          <span className="text-[11px] text-slate-500 block">
                            Valor de Mercado Estimado
                          </span>
                          <strong className="text-emerald-400 font-mono text-sm font-bold block mt-0.5">
                            {formatCurrency(prospect.estimatedMarketValue)}
                          </strong>
                          <span className="text-[11px] text-slate-500 font-mono">
                            Faixa: {formatCompactCurrency(prospect.estimatedValueMin)} – {formatCompactCurrency(prospect.estimatedValueMax)}
                          </span>
                        </div>

                        <div>
                          <span className="text-[11px] text-slate-500 block">
                            Salário Estimado & Relatório
                          </span>
                          <strong className="text-slate-200 font-mono text-sm font-semibold block mt-0.5">
                            {formatCurrency(player.wage)}/mês
                          </strong>
                          <span className="text-[11px] text-slate-500">
                            Por {prospect.scoutName} · {formatDateBR(prospect.discoveredDate)}
                          </span>
                        </div>
                      </div>

                      {/* Scout Observation Summary */}
                      <p className="text-xs text-slate-400 leading-relaxed">
                        {prospect.scoutReportSummary}
                      </p>
                    </div>

                    {/* Action Bar */}
                    <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2">
                      {prospect.isSigned ? (
                        <div className="w-full py-2 text-center text-xs font-semibold text-emerald-400 flex items-center justify-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Contratado pelo {userClub.shortName}</span>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                soundEngine.playClick();
                                onToggleShortlist(prospect.id);
                              }}
                              className={`py-2 px-3 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer border ${
                                prospect.isShortlisted
                                  ? 'bg-amber-500/15 border-amber-500/40 text-amber-300'
                                  : 'bg-slate-900 border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800'
                              }`}
                            >
                              <Bookmark
                                className={`w-3.5 h-3.5 ${
                                  prospect.isShortlisted ? 'fill-amber-300 text-amber-300' : ''
                                }`}
                              />
                              <span>{prospect.isShortlisted ? 'Observando' : 'Observar'}</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                soundEngine.playClick();
                                onDismissProspect(prospect.id);
                              }}
                              title="Arquivar relatório deste jogador"
                              className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-rose-300 transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          <button
                            type="button"
                            onClick={() => openSigningModal(prospect)}
                            className="py-2 px-4 rounded-lg bg-sky-400 hover:bg-sky-300 text-slate-950 font-bold text-xs transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
                          >
                            <UserPlus className="w-3.5 h-3.5" />
                            <span>Negociar Contratação</span>
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* SUBTAB 4: SCOUTING STAFF MANAGEMENT */}
      {subTab === 'staff' && (
        <div className="space-y-6">
          {staffFeedback && (
            <div
              className={`rounded-xl border px-4 py-3 flex items-center justify-between text-xs ${
                staffFeedback.type === 'success'
                  ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200'
                  : 'bg-rose-950/40 border-rose-500/40 text-rose-200'
              }`}
            >
              <span>{staffFeedback.text}</span>
              <button
                type="button"
                onClick={() => setStaffFeedback(null)}
                className="text-slate-400 hover:text-white font-semibold cursor-pointer"
              >
                Fechar
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {scoutingNetwork.scouts.map((scout) => {
              const upgradeCost = getUpgradeScoutCost(scout, userClub);
              const isMaxStars = scout.stars >= 5;

              return (
                <div
                  key={scout.id}
                  className="bg-slate-950 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between gap-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h4 className="text-base font-bold text-white">{scout.name}</h4>
                      <p className="text-xs text-slate-400 mt-0.5">
                        <span>{getNationalityInfo(scout.nationality).fullLabel}</span>
                        <span className="mx-1.5">·</span>
                        <span>{scout.specialtyLabel}</span>
                      </p>
                      <p className="text-xs text-slate-500 mt-2">
                        Status atual:{' '}
                        <span className={scout.activeMissionId ? 'text-amber-400' : 'text-emerald-400'}>
                          {scout.activeMissionId ? 'Em missão externa' : 'Disponível para viagem'}
                        </span>
                      </p>
                    </div>

                    <div className="text-right space-y-1">
                      {renderStars(scout.stars)}
                      <p className="text-[11px] text-slate-500 font-mono tabular-nums">
                        Precisão Nível {scout.stars}/5
                      </p>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-3">
                    <span className="text-xs text-slate-400">
                      Olheiros 5★ reduzem a margem de erro no potencial e no valor estimado.
                    </span>

                    {isMaxStars ? (
                      <span className="text-xs font-semibold text-amber-400 whitespace-nowrap shrink-0">
                        Nível Máximo (5★)
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          soundEngine.playClick();
                          const res = onUpgradeScout(scout.id);
                          setStaffFeedback({
                            type: res.success ? 'success' : 'error',
                            text: res.success
                              ? `${scout.name} concluiu curso de análise de desempenho e subiu para ${scout.stars + 1} estrelas!`
                              : res.errorMessage || 'Saldo insuficiente para aprimorar olheiro.',
                          });
                        }}
                        className="py-2 px-3.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-sky-300 font-semibold text-xs transition-colors whitespace-nowrap shrink-0 cursor-pointer flex items-center gap-1.5 tabular-nums"
                      >
                        <TrendingUp className="w-3.5 h-3.5" />
                        <span>Aprimorar ({formatCompactCurrency(upgradeCost)})</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Hire 4th Specialist Scout if club currently has < 4 */}
          {scoutingNetwork.scouts.length < 4 && (
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 flex flex-wrap items-center justify-between gap-4">
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <Users className="w-4 h-4 text-sky-400" />
                  <span>Expandir Departamento de Captação (4º Olheiro)</span>
                </h4>
                <p className="text-xs text-slate-400">
                  Contrate um quarto observador exclusivo para cobrir múltiplos países simultaneamente.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <select
                  value={newScoutSpecialty}
                  onChange={(e) => setNewScoutSpecialty(e.target.value as ScoutRegionCategory)}
                  className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-400"
                >
                  <option value="AMERICA_SUL">Especialidade: América do Sul</option>
                  <option value="BRASIL">Especialidade: Brasil</option>
                  <option value="INTERNACIONAL">Especialidade: Internacional</option>
                </select>

                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playClick();
                    const res = onHireFourthScout(newScoutSpecialty);
                    setStaffFeedback({
                      type: res.success ? 'success' : 'error',
                      text: res.success
                        ? 'Novo olheiro contratado! Sua equipe agora conta com 4 observadores ativos.'
                        : res.errorMessage || 'Não foi possível contratar o olheiro.',
                    });
                  }}
                  className="py-2 px-4 rounded-lg bg-sky-400 hover:bg-sky-300 text-slate-950 font-bold text-xs transition-colors whitespace-nowrap shrink-0 cursor-pointer tabular-nums"
                >
                  Contratar 4º Olheiro ({formatCurrency(getHireFourthScoutCost(userClub))})
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* SUBTAB ACADEMY: BASE DO CLUBE (ATÉ 10 JOGADORES) & PENEIRAS */}
      {subTab === 'academy' && (
        <YouthAcademySection
          userClub={userClub}
          currentDate={currentDate}
          onRunTryout={onRunYouthTryout}
          onRecruitCandidate={onRecruitYouthCandidate}
          onDismissCandidate={onDismissYouthCandidate}
          onPromoteBoy={onPromoteYouthBoy}
          onReleaseBoy={onReleaseYouthBoy}
          onUpgradeYouthAcademy={onUpgradeYouthAcademy}
          onUpdateTrainingPlan={onUpdateYouthTrainingPlan}
          onSetBoyFocus={onSetYouthBoyFocus}
          onRunTrainingSession={onRunYouthTrainingSession}
        />
      )}

      {/* NEGOTIATION MODAL FOR SCOUTED PROSPECT */}
      {negotiatingProspect && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-start justify-center p-2 sm:p-4 overflow-y-auto">
          <div className="bg-slate-950 border border-slate-800 rounded-2xl w-full max-w-lg p-6 my-auto shadow-2xl space-y-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs text-sky-400 font-semibold">
                  Negociação Internacional / Regional · {negotiatingProspect.regionName} ({negotiatingProspect.country})
                </p>
                <h3 className="text-lg font-bold text-white mt-0.5">
                  {negotiatingProspect.player.name}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5 tabular-nums">
                  <span>{negotiatingProspect.player.detailedRole}</span>
                  <span className="mx-1.5">·</span>
                  <span>{negotiatingProspect.player.age} anos</span>
                  <span className="mx-1.5">·</span>
                  <span>
                    {formatPlayerNationalityFull(
                      negotiatingProspect.player,
                      negotiatingProspect.country
                    )}
                  </span>
                  <span className="mx-1.5">·</span>
                  <span>Clube atual: {negotiatingProspect.originClubName}</span>
                </p>
              </div>

              <button
                type="button"
                onClick={() => setNegotiatingProspect(null)}
                className="text-xs text-slate-400 hover:text-white font-semibold cursor-pointer"
              >
                Fechar
              </button>
            </div>

            {/* Key Scouting Metrics */}
            <div className="grid grid-cols-3 gap-3 bg-slate-900/70 border border-slate-800 rounded-xl p-3.5 text-xs tabular-nums">
              <div>
                <span className="text-slate-500 block">Força Atual</span>
                <strong className="text-white font-mono text-base font-bold">
                  {negotiatingProspect.player.overall}
                </strong>
              </div>
              <div>
                <span className="text-slate-500 block">Potencial Estimado</span>
                <strong className="text-sky-400 font-mono text-base font-bold">
                  {negotiatingProspect.potentialMin}–{negotiatingProspect.potentialMax}
                </strong>
              </div>
              <div>
                <span className="text-slate-500 block">Valor Estimado</span>
                <strong className="text-emerald-400 font-mono text-sm font-bold">
                  {formatCompactCurrency(negotiatingProspect.estimatedMarketValue)}
                </strong>
              </div>
            </div>

            {!getTransferWindowStatus(currentDate, userClub).isOpen && (
              <div className="rounded-xl border border-amber-500/40 bg-amber-950/30 p-3 text-xs text-amber-200 space-y-1">
                <div className="font-bold text-amber-300 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 shrink-0" />
                  <span>Janela Fechada · Contratação para Próxima Janela</span>
                </div>
                <p className="text-slate-300 leading-relaxed">
                  {userClub.division === 'EU'
                    ? 'Na Europa, a janela oficial abre de 01/01 a 31/01 e de 01/07 a 31/08.'
                    : 'A janela de registros está fechada no momento.'}{' '}
                  O acordo é fechado agora e o atleta se apresenta ao {userClub.shortName} em{' '}
                  <strong className="text-white font-mono">
                    {getTransferWindowStatus(currentDate, userClub).nextWindowLabel}
                  </strong>
                  .
                </p>
              </div>
            )}

            {(() => {
              const scoutWillingness = evaluatePlayerClubWillingness(
                userClub,
                negotiatingProspect.player,
                { dealType: 'SCOUT' }
              );
              if (scoutWillingness.willing) return null;
              return (
                <div className="rounded-xl border border-rose-500/40 bg-rose-950/35 p-3 text-xs text-rose-200 leading-relaxed">
                  <strong className="text-rose-300 block mb-0.5">
                    Recusa provável por degrau competitivo
                  </strong>
                  <span>{scoutWillingness.reason}</span>
                </div>
              );
            })()}

            {/* Offer Sliders */}
            <div className="space-y-4 tabular-nums">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-300 font-semibold">
                    Oferta de Transferência ao {negotiatingProspect.originClubName}
                  </span>
                  <strong className="text-emerald-400 font-mono text-sm">
                    {formatCurrency(offerFee)}
                  </strong>
                </div>
                <input
                  type="range"
                  min={Math.round(negotiatingProspect.estimatedValueMin * 0.7)}
                  max={Math.round(negotiatingProspect.estimatedValueMax * 1.4)}
                  step={negotiatingProspect.estimatedMarketValue < 250_000 ? 5_000 : 50_000}
                  value={offerFee}
                  onChange={(e) => setOfferFee(Number(e.target.value))}
                  className="w-full accent-sky-400 cursor-pointer"
                />
                <div className="flex justify-between text-[11px] text-slate-500 font-mono">
                  <span>Faixa estimada: {formatCompactCurrency(negotiatingProspect.estimatedValueMin)}</span>
                  <span>até {formatCompactCurrency(negotiatingProspect.estimatedValueMax)}</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-300 font-semibold">Proposta Salarial Mensal</span>
                  <strong className="text-sky-300 font-mono text-sm">
                    {formatCurrency(offerWage)}/mês
                  </strong>
                </div>
                <input
                  type="range"
                  min={Math.max(1_500, Math.round(negotiatingProspect.player.wage * 0.8))}
                  max={Math.round(negotiatingProspect.player.wage * 1.8)}
                  step={negotiatingProspect.player.wage < 15_000 ? 500 : 1_000}
                  value={offerWage}
                  onChange={(e) => setOfferWage(Number(e.target.value))}
                  className="w-full accent-sky-400 cursor-pointer"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-300 font-semibold">
                    Duração do Contrato (Anos)
                  </span>
                  <strong className="text-emerald-400 font-mono text-sm">
                    {offerContractYears} {offerContractYears === 1 ? 'ano' : 'anos'}
                  </strong>
                </div>
                <div className="grid grid-cols-5 gap-1.5">
                  {[1, 2, 3, 4, 5].map((yrs) => {
                    const blockedByAge = negotiatingProspect.player.age >= 35 && yrs > 3;
                    return (
                      <button
                        key={yrs}
                        type="button"
                        disabled={blockedByAge}
                        onClick={() => {
                          soundEngine.playClick();
                          setOfferContractYears(yrs);
                        }}
                        className={`py-2 rounded-lg border font-mono font-bold text-xs transition-colors cursor-pointer disabled:opacity-35 disabled:cursor-not-allowed ${
                          offerContractYears === yrs
                            ? 'bg-sky-400 text-slate-950 border-sky-300 font-black'
                            : 'bg-slate-900 text-slate-300 border-slate-700 hover:bg-slate-800'
                        }`}
                      >
                        {yrs} {yrs === 1 ? 'ano' : 'anos'}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {negotiationResult && (
              <div
                className={`rounded-xl border p-3 text-xs ${
                  negotiationResult.success
                    ? 'bg-emerald-950/50 border-emerald-500/40 text-emerald-200'
                    : 'bg-rose-950/50 border-rose-500/40 text-rose-200'
                }`}
              >
                {negotiationResult.msg}
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setNegotiatingProspect(null)}
                className="px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSubmitOffer}
                className="px-5 py-2 rounded-lg bg-sky-400 hover:bg-sky-300 text-slate-950 font-bold text-xs transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
              >
                <DollarSign className="w-3.5 h-3.5" />
                <span>Enviar Proposta Oficial</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
