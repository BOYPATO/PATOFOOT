import React, { useMemo, useState } from 'react';
import {
  Club,
  DetailedRole,
  MAX_SQUAD_SIZE,
  YouthAcademyBoy,
  YouthAcademyState,
  YouthAgeGroupFilter,
  YouthTryoutTier,
} from '../types/game';
import {
  MAX_YOUTH_ACADEMY_PLAYERS,
  YOUTH_TRYOUT_TIERS,
  createInitialYouthAcademy,
  getTryoutCost,
  getYouthUpgradeCost,
} from '../utils/youthAcademyEngine';
import { formatPlayerNationalityFull } from '../utils/nationalityUtils';
import { PlayerAvatar } from './PlayerAvatar';
import { comparePlayersByPosition } from '../utils/playerOrdering';
import { usePlayerInspection } from '../context/PlayerInspectionContext';
import { soundEngine } from '../services/soundEngine';
import {
  GraduationCap,
  UserPlus,
  Users,
  Trash2,
  CheckCircle2,
  XCircle,
  ArrowUpRight,
  Search,
  Star,
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface YouthAcademySectionProps {
  userClub: Club;
  currentDate: string;
  onRunTryout: (params: {
    tier: YouthTryoutTier;
    roleFocus: DetailedRole | 'ALL';
    ageGroup: YouthAgeGroupFilter;
  }) => {
    success: boolean;
    errorMessage?: string;
    candidatesCount?: number;
  };
  onRecruitCandidate: (candidateId: string) => {
    success: boolean;
    errorMessage?: string;
    boyName?: string;
  };
  onDismissCandidate: (candidateId: string) => void;
  onPromoteBoy: (boyId: string) => {
    success: boolean;
    errorMessage?: string;
    playerName?: string;
  };
  onReleaseBoy: (boyId: string) => void;
  onUpgradeYouthAcademy: () => {
    success: boolean;
    errorMessage?: string;
    newLevel?: number;
  };
}

export const YouthAcademySection: React.FC<YouthAcademySectionProps> = ({
  userClub,
  currentDate,
  onRunTryout,
  onRecruitCandidate,
  onDismissCandidate,
  onPromoteBoy,
  onReleaseBoy,
  onUpgradeYouthAcademy,
}) => {
  const inspection = usePlayerInspection();
  const academy: YouthAcademyState = useMemo(
    () => userClub.youthAcademy || createInitialYouthAcademy(userClub, currentDate),
    [userClub, currentDate]
  );

  // Peneira Configuration State
  const [selectedTier, setSelectedTier] = useState<YouthTryoutTier>('COMUNITARIA');
  const [roleFocus, setRoleFocus] = useState<DetailedRole | 'ALL'>('ALL');
  const [ageGroup, setAgeGroup] = useState<YouthAgeGroupFilter>('ALL');

  // Academy Roster Filter & Release Confirmation
  const [rosterRoleFilter, setRosterRoleFilter] = useState<DetailedRole | 'ALL'>('ALL');
  const [confirmReleaseId, setConfirmReleaseId] = useState<string | null>(null);

  // Inline Feedback Banner
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

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

  const activeTryoutCandidates = useMemo(
    () => academy.lastTryoutCandidates.filter((c) => !c.dismissed),
    [academy.lastTryoutCandidates]
  );

  const pendingTryoutCandidates = useMemo(
    () => activeTryoutCandidates.filter((c) => !c.recruited),
    [activeTryoutCandidates]
  );

  const filteredAcademyPlayers = useMemo(() => {
    const list =
      rosterRoleFilter === 'ALL'
        ? academy.players
        : academy.players.filter((b) => b.player.detailedRole === rosterRoleFilter);
    return [...list].sort((a, b) => comparePlayersByPosition(a.player, b.player));
  }, [academy.players, rosterRoleFilter]);

  const openSlots = Math.max(0, MAX_YOUTH_ACADEMY_PLAYERS - academy.players.length);
  const isAcademyFull = academy.players.length >= MAX_YOUTH_ACADEMY_PLAYERS;
  const currentTryoutCost = getTryoutCost(userClub, selectedTier);
  const youthLevel = Math.max(1, Math.min(5, userClub.finances.youthAcademyLevel || 1));
  const upgradeCost = getYouthUpgradeCost(youthLevel, userClub);

  const handleExecuteTryout = () => {
    soundEngine.playClick();
    const res = onRunTryout({
      tier: selectedTier,
      roleFocus,
      ageGroup,
    });

    if (!res.success) {
      soundEngine.playWhistle(false);
      setFeedback({
        type: 'error',
        text: res.errorMessage || 'Não foi possível realizar a peneira.',
      });
      return;
    }

    soundEngine.playFanfare();
    setFeedback({
      type: 'success',
      text: `${YOUTH_TRYOUT_TIERS[selectedTier].label} concluída! ${res.candidatesCount || YOUTH_TRYOUT_TIERS[selectedTier].candidatesCount} garotos se destacaram nos testes e aguardam sua aprovação abaixo.`,
    });
  };

  const handleApproveBoy = (candidateId: string) => {
    soundEngine.playClick();
    const res = onRecruitCandidate(candidateId);
    if (!res.success) {
      soundEngine.playWhistle(false);
      setFeedback({
        type: 'error',
        text: res.errorMessage || 'Limite de 10 jogadores na base atingido.',
      });
      return;
    }

    soundEngine.playFanfare();
    setFeedback({
      type: 'success',
      text: `${res.boyName || 'Garoto'} foi aprovado na peneira e integrado ao alojamento da base (${academy.players.length + 1}/${MAX_YOUTH_ACADEMY_PLAYERS})!`,
    });
  };

  const handlePromoteToPro = (boy: YouthAcademyBoy) => {
    const res = onPromoteBoy(boy.id);
    if (!res.success) {
      soundEngine.playWhistle(false);
      setFeedback({
        type: 'error',
        text: res.errorMessage || 'Não foi possível promover o atleta.',
      });
      return;
    }

    soundEngine.playFanfare();
    confetti({ particleCount: 75, spread: 65 });
    setFeedback({
      type: 'success',
      text: `${boy.player.name} (${boy.player.detailedRole}, ${boy.player.age} anos) assinou contrato profissional e subiu para o elenco principal do ${userClub.name}!`,
    });
  };

  const handleUpgradeStructure = () => {
    soundEngine.playClick();
    const res = onUpgradeYouthAcademy();
    if (!res.success) {
      soundEngine.playWhistle(false);
      setFeedback({
        type: 'error',
        text: res.errorMessage || 'Saldo insuficiente para ampliar o CT da Base.',
      });
      return;
    }
    soundEngine.playFanfare();
    setFeedback({
      type: 'success',
      text: `Estrutura das Categorias de Base ampliada para o Nível ${res.newLevel}/5! As próximas peneiras revelarão talentos mais fortes e a evolução diária aumentou.`,
    });
  };

  return (
    <div className="space-y-6">
      {/* Inline Feedback Banner */}
      {feedback && (
        <div
          className={`rounded-xl border px-4 py-3 flex flex-wrap items-center justify-between gap-3 text-xs ${
            feedback.type === 'success'
              ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200'
              : 'bg-rose-950/40 border-rose-500/40 text-rose-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
            )}
            <span>{feedback.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-slate-400 hover:text-white font-semibold whitespace-nowrap shrink-0 cursor-pointer"
          >
            Fechar
          </button>
        </div>
      )}

      {/* Youth Academy Capacity & Infrastructure Overview */}
      <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shrink-0">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                Categorias de Base do {userClub.shortName} · Alojamento & Peneiras
              </h3>
              <p className="text-xs text-slate-400 mt-0.5 tabular-nums">
                <span>Capacidade máxima: {MAX_YOUTH_ACADEMY_PLAYERS} atletas na base</span>
                <span className="mx-1.5">·</span>
                <span>
                  Elenco Profissional:{' '}
                  <strong
                    className={
                      userClub.squad.length >= MAX_SQUAD_SIZE
                        ? 'text-amber-300'
                        : 'text-emerald-300'
                    }
                  >
                    {userClub.squad.length}/{MAX_SQUAD_SIZE} atletas
                  </strong>
                </span>
                <span className="mx-1.5">·</span>
                <span>Estrutura Nível {youthLevel}/5</span>
                <span className="mx-1.5">·</span>
                <span>Evolução diária: +{3 + youthLevel}% por treino</span>
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {youthLevel < 5 && (
              <button
                type="button"
                onClick={handleUpgradeStructure}
                className="px-3.5 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-semibold text-sky-300 hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer tabular-nums flex items-center gap-1.5"
              >
                <ArrowUpRight className="w-3.5 h-3.5 text-sky-400" />
                <span>Ampliar CT da Base Nv.{youthLevel + 1} ({formatCompactCurrency(upgradeCost)})</span>
              </button>
            )}
          </div>
        </div>

        {/* 10-Slot Visual Occupancy Meter */}
        <div className="bg-slate-900/70 border border-slate-800/90 rounded-xl p-4 space-y-2.5 tabular-nums">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="font-semibold text-slate-200">
              Ocupação do Alojamento da Base:{' '}
              <strong className={isAcademyFull ? 'text-amber-400' : 'text-emerald-400'}>
                {academy.players.length}/{MAX_YOUTH_ACADEMY_PLAYERS} jogadores
              </strong>
            </span>
            <span className="text-slate-400">
              {openSlots > 0
                ? `${openSlots} ${openSlots === 1 ? 'vaga aberta' : 'vagas abertas'} para novos garotos`
                : 'Base completa (10/10) — promova ou dispense para abrir vaga'}
            </span>
          </div>

          <div className="grid grid-cols-10 gap-1.5">
            {Array.from({ length: MAX_YOUTH_ACADEMY_PLAYERS }).map((_, idx) => {
              const filled = idx < academy.players.length;
              return (
                <div
                  key={idx}
                  className={`h-2.5 rounded-sm transition-colors ${
                    filled
                      ? isAcademyFull
                        ? 'bg-amber-400'
                        : 'bg-emerald-400'
                      : 'bg-slate-800'
                  }`}
                  title={
                    filled
                      ? `Vaga ${idx + 1}: ${academy.players[idx]?.player.name}`
                      : `Vaga ${idx + 1}: Disponível`
                  }
                />
              );
            })}
          </div>

          <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-400 pt-0.5">
            <span>Peneiras realizadas: {academy.totalTryoutsHeld}</span>
            <span>·</span>
            <span>Garotos promovidos ao profissional: {academy.totalPromotedCount}</span>
          </div>
        </div>
      </div>

      {/* SECTION 1: ORGANIZAR PENEIRAS PARA RECRUTAR GAROTOS */}
      <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Search className="w-4 h-4 text-sky-400" />
              <span>Organizar Peneira (Recrutamento de Garotos)</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Abra avaliações para garotos de 15 a 18 anos, analise o relatório da banca técnica e aprove os melhores nomes para as 10 vagas da base.
            </p>
          </div>
        </div>

        {/* Tryout Tier Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
          {(['COMUNITARIA', 'ESTADUAL', 'NACIONAL'] as YouthTryoutTier[]).map((tierKey) => {
            const tier = YOUTH_TRYOUT_TIERS[tierKey];
            const cost = getTryoutCost(userClub, tierKey);
            const active = selectedTier === tierKey;

            return (
              <button
                key={tierKey}
                type="button"
                onClick={() => {
                  soundEngine.playClick();
                  setSelectedTier(tierKey);
                }}
                className={`text-left p-4 rounded-xl border transition-colors cursor-pointer flex flex-col justify-between gap-3 ${
                  active
                    ? 'bg-sky-950/40 border-sky-400 text-white'
                    : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:border-slate-700 hover:bg-slate-900'
                }`}
              >
                <div className="space-y-1.5">
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="font-bold text-sm text-white">{tier.label}</h4>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">{tier.description}</p>
                </div>

                <div className="pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-xs tabular-nums">
                  <span className="text-slate-300">
                    Revela <strong>{tier.candidatesCount} garotos</strong>
                  </span>
                  <strong className="text-emerald-400 font-mono font-bold">
                    {formatCurrency(cost)}
                  </strong>
                </div>
              </button>
            );
          })}
        </div>

        {/* Filters & Run Tryout Action */}
        <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-4 flex flex-wrap items-end justify-between gap-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="space-y-1">
              <label className="block text-[11px] font-semibold text-slate-400">
                Posição Buscada na Peneira
              </label>
              <select
                value={roleFocus}
                onChange={(e) => setRoleFocus(e.target.value as DetailedRole | 'ALL')}
                className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-400"
              >
                <option value="ALL">Todas as Posições</option>
                <option value="GOL">Goleiros (GOL)</option>
                <option value="LAT">Laterais (LAT)</option>
                <option value="ZAG">Zagueiros (ZAG)</option>
                <option value="VOL">Volantes (VOL)</option>
                <option value="MEI">Meias Armadores (MEI)</option>
                <option value="ATA">Atacantes (ATA)</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="block text-[11px] font-semibold text-slate-400">
                Faixa Etária dos Garotos
              </label>
              <select
                value={ageGroup}
                onChange={(e) => setAgeGroup(e.target.value as YouthAgeGroupFilter)}
                className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-400"
              >
                <option value="ALL">Todas (15 a 18 anos)</option>
                <option value="SUB_15">Sub-15 (15 anos)</option>
                <option value="SUB_17">Sub-17 (16 e 17 anos)</option>
                <option value="SUB_20">Sub-20 (18 anos)</option>
              </select>
            </div>
          </div>

          <button
            type="button"
            onClick={handleExecuteTryout}
            className="px-5 py-2.5 rounded-xl bg-sky-400 hover:bg-sky-300 text-slate-950 font-black text-xs sm:text-sm transition-colors whitespace-nowrap shrink-0 cursor-pointer tabular-nums shadow-lg shadow-sky-500/15"
          >
            Realizar Peneira ({formatCurrency(currentTryoutCost)})
          </button>
        </div>

        {/* Tryout Evaluation Board (Boys Discovered in Last Tryout) */}
        {activeTryoutCandidates.length > 0 && (
          <div className="pt-2 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-800 pt-4">
              <div>
                <h4 className="text-sm font-bold text-white">
                  Garotos Avaliados na Última Peneira ({pendingTryoutCandidates.length} aguardando decisão)
                </h4>
                <p className="text-xs text-slate-400">
                  {academy.lastTryoutLabel || 'Peneira Oficial'} · Aprove os melhores talentos para integrarem o grupo de até {MAX_YOUTH_ACADEMY_PLAYERS} atletas da base.
                </p>
              </div>
              <span className="text-xs text-slate-400 tabular-nums">
                Vagas livres na base: <strong className="text-white">{openSlots}</strong>
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {activeTryoutCandidates.map((cand) => {
                const p = cand.player;
                const pot = p.potential || p.overall + 8;
                const isGem = cand.potentialTier === 'Joia da Base';

                return (
                  <div
                    key={cand.id}
                    className={`rounded-xl border p-4 flex flex-col justify-between gap-3 ${
                      cand.recruited
                        ? 'bg-emerald-950/20 border-emerald-500/40'
                        : isGem
                        ? 'bg-slate-900/90 border-amber-500/40'
                        : 'bg-slate-900/70 border-slate-800'
                    }`}
                  >
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2.5 min-w-0">
                          <PlayerAvatar
                            player={p}
                            club={userClub}
                            clubPrimaryColor={userClub.colors.primary}
                            clubTextColor={userClub.colors.text}
                            size="sm"
                          />
                          <div className="min-w-0">
                            <button
                              type="button"
                              onClick={() => {
                                soundEngine.playClick();
                                inspection?.inspectPlayer(p, userClub);
                              }}
                              className="font-bold text-sm text-white hover:text-sky-300 transition-colors truncate block text-left cursor-pointer max-w-full"
                            >
                              {p.name}
                            </button>
                            <p className="text-xs text-slate-400 tabular-nums mt-0.5">
                              <strong className="text-sky-300">{p.detailedRole}</strong>
                              <span className="mx-1.5">·</span>
                              <span>{p.age} anos ({cand.categoryLabel})</span>
                              <span className="mx-1.5">·</span>
                              <span>{formatPlayerNationalityFull(p, userClub.country)}</span>
                              <span className="mx-1.5">·</span>
                              <span>{cand.originCity}</span>
                            </p>
                          </div>
                        </div>

                        <div className="text-right shrink-0 tabular-nums">
                          <div className="text-xs text-slate-400">OVR / POT</div>
                          <div className="text-sm font-mono font-black text-white">
                            {p.overall} <span className="text-slate-500">/</span>{' '}
                            <span className="text-sky-400">{pot}</span>
                          </div>
                        </div>
                      </div>

                      <div className="text-xs text-slate-300 flex flex-wrap items-center gap-1.5">
                        <Star
                          className={`w-3.5 h-3.5 shrink-0 ${
                            isGem ? 'text-amber-400 fill-amber-400' : 'text-sky-400'
                          }`}
                        />
                        <span className={isGem ? 'text-amber-300 font-semibold' : 'text-sky-300 font-semibold'}>
                          {cand.potentialTier}
                        </span>
                        <span className="text-slate-600">·</span>
                        <span className="text-slate-400">{p.specialSkill}</span>
                        <span className="text-slate-600">·</span>
                        <span className="text-slate-400">{p.preferredFoot}</span>
                      </div>

                      <p className="text-[11px] text-slate-400 leading-relaxed">
                        “{cand.evaluatorNote}”
                      </p>
                    </div>

                    <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between gap-2">
                      {cand.recruited ? (
                        <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Integrado à Base do Clube</span>
                        </span>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => {
                              soundEngine.playClick();
                              onDismissCandidate(cand.id);
                            }}
                            className="px-3 py-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                          >
                            Dispensar
                          </button>

                          <button
                            type="button"
                            disabled={isAcademyFull}
                            onClick={() => handleApproveBoy(cand.id)}
                            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                              isAcademyFull
                                ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                                : 'bg-emerald-400 hover:bg-emerald-300 text-slate-950 cursor-pointer'
                            }`}
                          >
                            <UserPlus className="w-3.5 h-3.5" />
                            <span>{isAcademyFull ? 'Base Lotada (10/10)' : 'Aprovar para a Base'}</span>
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* SECTION 2: ELENCO DA BASE DO CLUBE (ATÉ 10 JOGADORES) */}
      <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2 tabular-nums">
              <Users className="w-4 h-4 text-emerald-400" />
              <span>
                Elenco da Base do Clube ({academy.players.length}/{MAX_YOUTH_ACADEMY_PLAYERS} Jogadores)
              </span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Os garotos alojados evoluem automaticamente nos treinos diários da base antes de subirem ao elenco profissional.
            </p>
          </div>

          {/* Role Filter */}
          <div className="flex items-center gap-1 p-1 bg-slate-900 rounded-lg overflow-x-auto">
            {(['ALL', 'GOL', 'LAT', 'ZAG', 'VOL', 'MEI', 'ATA'] as const).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => {
                  soundEngine.playClick();
                  setRosterRoleFilter(r);
                }}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  rosterRoleFilter === r
                    ? 'bg-slate-800 text-white font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {r === 'ALL' ? 'Todos' : r}
              </button>
            ))}
          </div>
        </div>

        {filteredAcademyPlayers.length === 0 ? (
          <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-8 text-center space-y-2">
            <p className="text-sm font-semibold text-slate-300">
              Nenhum garoto encontrado nesta posição na base ({academy.players.length}/{MAX_YOUTH_ACADEMY_PLAYERS} vagas ocupadas).
            </p>
            <p className="text-xs text-slate-500">
              Realize uma peneira acima para recrutar novos talentos Sub-15, Sub-17 e Sub-20!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredAcademyPlayers.map((boy) => {
              const p = boy.player;
              const pot = p.potential || p.overall + 6;
              const progress = Math.min(100, p.trainingProgress || 0);
              const isConfirmingRelease = confirmReleaseId === boy.id;

              return (
                <div
                  key={boy.id}
                  className="bg-slate-900/70 border border-slate-800 rounded-xl p-4 flex flex-col justify-between gap-3.5"
                >
                  <div className="space-y-2.5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-2.5 min-w-0">
                        <PlayerAvatar
                          player={p}
                          club={userClub}
                          clubPrimaryColor={userClub.colors.primary}
                          clubTextColor={userClub.colors.text}
                          size="sm"
                        />
                        <div className="min-w-0">
                          <button
                            type="button"
                            onClick={() => {
                              soundEngine.playClick();
                              inspection?.inspectPlayer(p, userClub);
                            }}
                            className="font-bold text-sm sm:text-base text-white hover:text-sky-300 transition-colors truncate block text-left cursor-pointer max-w-full"
                          >
                            {p.name}
                          </button>
                          <p className="text-xs text-slate-400 tabular-nums mt-0.5">
                            <strong className="text-sky-300">{p.detailedRole}</strong>
                            <span className="mx-1.5">·</span>
                            <span>{p.age} anos ({boy.categoryLabel})</span>
                            <span className="mx-1.5">·</span>
                            <span>{formatPlayerNationalityFull(p, userClub.country)}</span>
                            <span className="mx-1.5">·</span>
                            <span>{boy.originCity}</span>
                          </p>
                        </div>
                      </div>

                      <div className="text-right shrink-0 tabular-nums">
                        <span className="block text-[11px] text-slate-500">Força / Potencial</span>
                        <strong className="text-base font-mono font-black text-white">
                          {p.overall} <span className="text-slate-600">/</span>{' '}
                          <span className="text-emerald-400">{pot}</span>
                        </strong>
                      </div>
                    </div>

                    {/* Clean Unboxed Metadata */}
                    <div className="text-xs text-slate-300 flex flex-wrap items-center gap-1.5 tabular-nums">
                      <span
                        className={
                          boy.potentialTier === 'Joia da Base'
                            ? 'text-amber-300 font-semibold'
                            : 'text-emerald-300 font-semibold'
                        }
                      >
                        {boy.potentialTier}
                      </span>
                      <span className="text-slate-600">·</span>
                      <span className="text-slate-300">{p.specialSkill}</span>
                      <span className="text-slate-600">·</span>
                      <span className="text-slate-400">{p.preferredFoot}</span>
                      <span className="text-slate-600">·</span>
                      <span className="text-slate-400">{boy.tryoutSource}</span>
                    </div>

                    {/* Youth Development Progress Bar */}
                    <div className="space-y-1 tabular-nums">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-400">
                          Evolução no CT da Base {p.evolutionsCount ? `(+${p.evolutionsCount} OVR ganho)` : ''}
                        </span>
                        <span className="font-mono text-sky-400 font-semibold">
                          {p.overall >= pot ? 'Teto atingido na base' : `${progress}% para OVR ${p.overall + 1}`}
                        </span>
                      </div>
                      <div className="h-1.5 w-full bg-slate-950 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-400 transition-all duration-200"
                          style={{ width: `${Math.max(6, progress)}%` }}
                        />
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400 tabular-nums pt-0.5">
                      <span>Passe estimado: <strong className="text-slate-200 font-mono">{formatCompactCurrency(p.marketValue)}</strong></span>
                      <span>1º Contrato Pro: <strong className="text-slate-200 font-mono">{formatCurrency(p.wage)}/mês</strong></span>
                    </div>
                  </div>

                  {/* Actions: Promote to Senior Squad or Release from 10-slot Base */}
                  <div className="pt-3 border-t border-slate-800/90 flex flex-wrap items-center justify-between gap-2">
                    {isConfirmingRelease ? (
                      <div className="flex items-center gap-2 w-full justify-between">
                        <span className="text-xs text-rose-300">Liberar vaga na base?</span>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setConfirmReleaseId(null)}
                            className="px-2.5 py-1.5 rounded-lg bg-slate-800 text-slate-300 text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer"
                          >
                            Cancelar
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              soundEngine.playClick();
                              onReleaseBoy(boy.id);
                              setConfirmReleaseId(null);
                              setFeedback({
                                type: 'success',
                                text: `${p.name} foi liberado das categorias de base. Vaga aberta no alojamento (${academy.players.length - 1}/${MAX_YOUTH_ACADEMY_PLAYERS}).`,
                              });
                            }}
                            className="px-3 py-1.5 rounded-lg bg-rose-500 hover:bg-rose-400 text-slate-950 text-xs font-bold whitespace-nowrap shrink-0 cursor-pointer"
                          >
                            Confirmar Dispensa
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            soundEngine.playClick();
                            setConfirmReleaseId(boy.id);
                          }}
                          className="px-3 py-2 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-rose-300 text-xs font-semibold transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
                          title="Dispensar da base para abrir vaga"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Dispensar</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handlePromoteToPro(boy)}
                          className="px-4 py-2 rounded-lg bg-sky-400 hover:bg-sky-300 text-slate-950 font-black text-xs transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
                        >
                          <UserPlus className="w-3.5 h-3.5" />
                          <span>Promover ao Profissional</span>
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
    </div>
  );
};
