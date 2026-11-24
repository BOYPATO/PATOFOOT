import React, { useState, useMemo, useEffect } from 'react';
import { Club } from '../types/game';
import {
  computeOct2026CoverageSummary,
  fetchMonthlyRosterApiStatus,
  getCachedOct2026SquadProfiles,
  getCurrentRealWorldSyncPeriod,
  getLastMonthlySyncMeta,
  MonthlyRosterApiStatus,
  Oct2026BatchProgress,
  Oct2026GroundingSource,
  Oct2026SyncRegionScope,
  resolveClubLeagueDisplayName,
  RosterSyncProviderPreference,
} from '../services/october2026SquadAiService';
import { soundEngine } from '../services/soundEngine';
import {
  CalendarClock,
  CheckCircle2,
  Database,
  ExternalLink,
  Globe,
  PauseCircle,
  Play,
  RefreshCw,
  Shield,
  Sparkles,
  Users,
  X,
} from 'lucide-react';

export interface RecentUpdatedClubItem {
  clubId: string;
  clubName: string;
  initials: string;
  primaryColor: string;
  textColor: string;
  leagueLabel: string;
  managerName: string;
  topPlayers: string[];
  avgOvr: number;
  sourceLabel?: string;
}

interface Oct2026GlobalSyncModalProps {
  isOpen: boolean;
  clubs: Club[];
  userClub?: Club | null;
  syncedClubIds?: string[];
  cacheVersion?: number;
  isSyncing: boolean;
  isSyncingSingleClub?: boolean;
  activeScope: Oct2026SyncRegionScope | null;
  progress: Oct2026BatchProgress | null;
  statusMessage: string | null;
  groundingSources: Oct2026GroundingSource[];
  recentUpdatedClubs: RecentUpdatedClubItem[];
  onStartSync: (
    scope: Oct2026SyncRegionScope,
    forceRefresh: boolean,
    preferredProvider?: RosterSyncProviderPreference
  ) => void;
  onSyncSingleClub?: (club: Club) => void;
  onStopSync: () => void;
  onClose: () => void;
}

export const Oct2026GlobalSyncModal: React.FC<Oct2026GlobalSyncModalProps> = ({
  isOpen,
  clubs,
  userClub = null,
  syncedClubIds = [],
  cacheVersion = 0,
  isSyncing,
  isSyncingSingleClub = false,
  activeScope,
  progress,
  statusMessage,
  groundingSources,
  recentUpdatedClubs,
  onStartSync,
  onSyncSingleClub,
  onStopSync,
  onClose,
}) => {
  const [selectedScope, setSelectedScope] = useState<Oct2026SyncRegionScope>('ALL');
  const [forceRefreshAll, setForceRefreshAll] = useState<boolean>(false);
  const [providerPref, setProviderPref] = useState<RosterSyncProviderPreference>('AUTO');
  const [apiStatus, setApiStatus] = useState<MonthlyRosterApiStatus | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    let active = true;
    void fetchMonthlyRosterApiStatus().then((status) => {
      if (active && status) {
        setApiStatus(status);
      }
    });
    return () => {
      active = false;
    };
  }, [isOpen, cacheVersion]);

  const coverage = useMemo(() => {
    void cacheVersion;
    if (!isOpen) return null;
    return computeOct2026CoverageSummary(
      clubs,
      syncedClubIds,
      getCachedOct2026SquadProfiles()
    );
  }, [isOpen, clubs, syncedClubIds, cacheVersion]);

  if (!isOpen || !coverage) return null;

  const realSyncPeriod = getCurrentRealWorldSyncPeriod();
  const lastMeta = getLastMonthlySyncMeta();
  const isCurrentMonthStarted = Boolean(
    lastMeta && lastMeta.lastMonthKey === realSyncPeriod.monthKey && coverage.syncedClubs > 0
  );
  const selectedRegionMeta =
    coverage.regions.find((r) => r.scope === selectedScope) || coverage.regions[0];
  const pendingInScope = Math.max(
    0,
    selectedRegionMeta.totalClubs - selectedRegionMeta.syncedClubs
  );

  const progressPct =
    progress && progress.totalCount > 0
      ? Math.min(100, Math.round((progress.completedCount / progress.totalCount) * 100))
      : coverage.percentage;

  const activeProviders = (apiStatus?.providers || []).filter((p) => p.enabled);
  const busy = isSyncing || isSyncingSingleClub;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-start justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-[#090f1d] border border-slate-800 rounded-2xl w-full max-w-4xl my-auto shadow-2xl flex flex-col max-h-[94vh] overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between gap-4 bg-[#070c16]">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-sky-500/15 border border-sky-500/35 flex items-center justify-center shrink-0">
              <Globe className="w-5 h-5 text-sky-400" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-extrabold text-white truncate">
                API de Elencos Mensal · {realSyncPeriod.fullLabel}
              </h2>
              <p className="text-xs text-slate-400 truncate">
                Fusão Multi-API ao vivo: ESPN Soccer + Wikipedia Live + TheSportsDB + API-Football + Gemini Search
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              soundEngine.playClick();
              onClose();
            }}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-900 transition-colors cursor-pointer shrink-0"
            title="Fechar painel (a sincronização continua caso esteja ativa)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 min-h-0 overflow-y-auto p-5 sm:p-6 space-y-5">
          {/* Live API Connections & Monthly Status Strip */}
          <div className="bg-[#0c1424] border border-slate-800 rounded-xl p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <Database className="w-4 h-4 text-emerald-400 shrink-0" />
                <div className="text-xs min-w-0">
                  <div className="font-bold text-white flex flex-wrap items-center gap-2">
                    <span>Fusão Multi-API Ativa</span>
                    <span className="text-slate-600">·</span>
                    <span className="text-emerald-400 font-semibold">
                      {activeProviders.length > 0
                        ? activeProviders.map((p) => p.name).join(' + ')
                        : 'ESPN Soccer API + Wikipedia Live API + TheSportsDB API + Gemini Search'}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                    <span className="inline-flex items-center gap-1">
                      <CalendarClock className="w-3 h-3 text-sky-400" />
                      <span>Ciclo mensal ativo: {realSyncPeriod.fullLabel}</span>
                    </span>
                    <span className="text-slate-700">·</span>
                    <span>
                      {isCurrentMonthStarted && lastMeta?.lastSyncedAt
                        ? `Última atualização neste mês: ${new Date(
                            lastMeta.lastSyncedAt
                          ).toLocaleString('pt-BR')}`
                        : `Nova atualização mensal (${realSyncPeriod.shortLabel}) pronta para baixar sob demanda`}
                    </span>
                  </div>
                </div>
              </div>

              {userClub && onSyncSingleClub && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    soundEngine.playClick();
                    onSyncSingleClub(userClub);
                  }}
                  className="px-3.5 py-2 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50 transition-colors"
                >
                  <Shield className="w-3.5 h-3.5 shrink-0" />
                  <span>
                    {isSyncingSingleClub
                      ? `Atualizando ${userClub.shortName}...`
                      : `Atualizar ${userClub.shortName} (${realSyncPeriod.shortLabel})`}
                  </span>
                </button>
              )}
            </div>

            {/* Global Coverage Progress */}
            <div className="pt-2.5 border-t border-slate-800/80 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="text-[11px] font-semibold text-slate-400">
                    Cobertura Mensal ({realSyncPeriod.slashLabel})
                  </div>
                  <div className="text-lg font-black text-white font-mono tabular-nums">
                    {coverage.syncedClubs} / {coverage.totalClubs} clubes sincronizados ({coverage.percentage}%)
                  </div>
                </div>

                <div className="text-xs text-slate-400 font-mono tabular-nums">
                  {coverage.pendingClubs === 0 ? (
                    <span className="text-emerald-400 font-bold flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                      <span>100% atualizados em {realSyncPeriod.shortLabel}</span>
                    </span>
                  ) : (
                    <span>
                      <strong className="text-sky-300">{coverage.pendingClubs}</strong> clubes aguardando atualização em {realSyncPeriod.shortLabel}
                    </span>
                  )}
                </div>
              </div>

              <div className="w-full h-2 rounded-full bg-slate-900 overflow-hidden">
                <div
                  className="h-full bg-sky-400 transition-all duration-300"
                  style={{ width: `${Math.max(2, coverage.percentage)}%` }}
                />
              </div>
            </div>
          </div>

          {/* Live Batch Execution Monitor (when running or after status feedback) */}
          {(busy || statusMessage) && (
            <div className="bg-[#0c1424] border border-sky-500/40 rounded-xl p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <RefreshCw
                    className={`w-4 h-4 text-sky-400 shrink-0 ${busy ? 'animate-spin' : ''}`}
                  />
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-white truncate">
                      {isSyncing && progress
                        ? `Consultando API (${progress.completedCount}/${progress.totalCount}): ${progress.currentBatchLabel}`
                        : statusMessage ||
                          `Pronto para atualizar elencos de ${realSyncPeriod.fullLabel}`}
                    </div>
                    {isSyncing && progress && (
                      <div className="text-[11px] text-slate-400 font-mono tabular-nums mt-0.5">
                        +{progress.newlyUpdatedInSession} clubes gravados nesta sessão · Cache mensal salvo automaticamente
                        {activeScope ? ` · Escopo: ${activeScope}` : ''}
                      </div>
                    )}
                  </div>
                </div>

                {isSyncing && (
                  <button
                    type="button"
                    onClick={() => {
                      soundEngine.playClick();
                      onStopSync();
                    }}
                    className="px-3.5 py-2 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 text-xs font-bold flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer transition-colors"
                  >
                    <PauseCircle className="w-4 h-4 shrink-0" />
                    <span>Pausar e Manter Progresso</span>
                  </button>
                )}
              </div>

              {isSyncing && progress && progress.totalCount > 0 && (
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[11px] font-mono tabular-nums text-slate-400">
                    <span>Progresso do lote selecionado</span>
                    <span className="text-sky-300 font-bold">{progressPct}%</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-900 overflow-hidden">
                    <div
                      className="h-full bg-emerald-400 transition-all duration-300"
                      style={{ width: `${Math.max(3, progressPct)}%` }}
                    />
                  </div>
                </div>
              )}

              {!busy && statusMessage && (
                <p className="text-xs text-slate-300 leading-relaxed">{statusMessage}</p>
              )}

              {groundingSources.length > 0 && (
                <div className="pt-2 border-t border-slate-800 flex flex-wrap items-center gap-2 text-[11px]">
                  <span className="text-slate-400 font-semibold">
                    Fontes consultadas ({realSyncPeriod.slashLabel}):
                  </span>
                  {groundingSources.slice(0, 6).map((src, idx) => (
                    <a
                      key={`${src.uri}-${idx}`}
                      href={src.uri}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-sky-300 hover:text-white transition-colors"
                    >
                      <span className="truncate max-w-[190px]">{src.title}</span>
                      <ExternalLink className="w-3 h-3 shrink-0" />
                    </a>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Region / Scope Selector Grid */}
          <div className="space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Escolha o Escopo e Modo da API
              </h3>

              <div className="flex flex-wrap items-center gap-3">
                <select
                  value={providerPref}
                  onChange={(e) =>
                    setProviderPref(e.target.value as RosterSyncProviderPreference)
                  }
                  disabled={busy}
                  className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-slate-200 focus:outline-none focus:border-sky-400 cursor-pointer"
                  aria-label="Modo de fonte da API de elencos"
                >
                  <option value="AUTO">Modo: Todas as APIs Combinadas (Fusão Completa)</option>
                  <option value="GEMINI_SEARCH">Modo: Pesquisa Web IA Direta</option>
                </select>

                <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={forceRefreshAll}
                    onChange={(e) => setForceRefreshAll(e.target.checked)}
                    disabled={busy}
                    className="rounded border-slate-700 bg-slate-900 accent-sky-400 cursor-pointer"
                  />
                  <span>Forçar reconsulta na API</span>
                </label>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {coverage.regions.map((reg) => {
                const isSelected = selectedScope === reg.scope;
                const pct =
                  reg.totalClubs > 0
                    ? Math.round((reg.syncedClubs / reg.totalClubs) * 100)
                    : 0;
                const isDone = reg.totalClubs > 0 && reg.syncedClubs >= reg.totalClubs;

                return (
                  <button
                    key={reg.scope}
                    type="button"
                    disabled={busy}
                    onClick={() => {
                      soundEngine.playClick();
                      setSelectedScope(reg.scope);
                    }}
                    className={`p-3.5 rounded-xl border text-left transition-colors cursor-pointer disabled:opacity-60 flex flex-col justify-between gap-2.5 ${
                      isSelected
                        ? 'bg-sky-950/35 border-sky-400 text-white'
                        : 'bg-[#0c1424] border-slate-800 hover:border-slate-700 text-slate-200'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-white truncate">
                          {reg.label}
                        </span>
                        <span
                          className={`text-[11px] font-mono tabular-nums font-bold shrink-0 ${
                            isDone ? 'text-emerald-400' : 'text-sky-300'
                          }`}
                        >
                          {reg.syncedClubs}/{reg.totalClubs}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">
                        {reg.subtitle}
                      </p>
                    </div>

                    <div className="w-full h-1.5 rounded-full bg-slate-900 overflow-hidden">
                      <div
                        className={`h-full transition-all ${
                          isDone ? 'bg-emerald-400' : 'bg-sky-400'
                        }`}
                        style={{ width: `${Math.max(2, pct)}%` }}
                      />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Recently Updated Clubs Feed */}
          <div className="bg-[#0c1424] border border-slate-800 rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="text-xs font-bold text-white">
                  Clubes Atualizados pela API em {realSyncPeriod.fullLabel}
                </span>
              </div>
              <span className="text-[11px] text-slate-400 font-mono tabular-nums">
                Exibindo últimos {Math.min(12, recentUpdatedClubs.length || coverage.syncedClubs)} atualizados
              </span>
            </div>

            {recentUpdatedClubs.length > 0 ? (
              <div className="divide-y divide-slate-800/80 max-h-56 overflow-y-auto">
                {recentUpdatedClubs.slice(0, 12).map((item) => (
                  <div
                    key={item.clubId}
                    className="px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className="w-7 h-7 rounded-lg flex items-center justify-center font-black text-[10px] border border-white/15 shrink-0"
                        style={{
                          backgroundColor: item.primaryColor,
                          color: item.textColor,
                        }}
                      >
                        {item.initials}
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-white truncate">
                          {item.clubName}{' '}
                          <span className="font-normal text-slate-400">
                            · {item.leagueLabel} · Téc. {item.managerName}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400 truncate">
                          {item.sourceLabel ? `${item.sourceLabel} · ` : ''}
                          Destaques {realSyncPeriod.shortLabel}: {item.topPlayers.join(' · ')}
                        </div>
                      </div>
                    </div>

                    <div className="text-right font-mono tabular-nums text-emerald-400 font-bold shrink-0">
                      OVR {item.avgOvr} · 30 atletas
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="px-4 py-6 text-center text-xs text-slate-400">
                {coverage.syncedClubs > 0 ? (
                  <span>
                    Já existem{' '}
                    <strong className="text-emerald-300 font-mono tabular-nums">
                      {coverage.syncedClubs}
                    </strong>{' '}
                    clubes atualizados pela API em {realSyncPeriod.fullLabel} (como{' '}
                    {clubs
                      .filter((c) => Boolean(getCachedOct2026SquadProfiles()[c.id]))
                      .slice(0, 5)
                      .map((c) => `${c.shortName} (${resolveClubLeagueDisplayName(c)})`)
                      .join(', ')}
                    ). Clique abaixo para atualizar os clubes restantes!
                  </span>
                ) : (
                  <span>
                    Clique no botão abaixo para consultar a API ao vivo e atualizar técnicos, contratações, camisas, idades e elencos de {realSyncPeriod.fullLabel} sempre que desejar.
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-800 bg-[#070c16] flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-slate-400">
            Cache mensal automático ({realSyncPeriod.shortLabel}) · Você pode fechar esta janela durante a atualização.
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => {
                soundEngine.playClick();
                onClose();
              }}
              className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-bold text-slate-200 hover:text-white whitespace-nowrap shrink-0 cursor-pointer transition-colors"
            >
              Fechar
            </button>

            {isSyncing ? (
              <button
                type="button"
                onClick={() => {
                  soundEngine.playClick();
                  onStopSync();
                }}
                className="px-5 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer transition-colors"
              >
                <PauseCircle className="w-4 h-4 shrink-0" />
                <span>Pausar Sincronização</span>
              </button>
            ) : (
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  soundEngine.playClick();
                  const shouldForce = forceRefreshAll || pendingInScope === 0;
                  onStartSync(selectedScope, shouldForce, providerPref);
                }}
                className="px-5 py-2.5 rounded-xl bg-sky-400 hover:bg-sky-300 text-slate-950 font-black text-xs sm:text-sm flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50 transition-colors shadow-lg shadow-sky-500/20"
              >
                {pendingInScope === 0 && !forceRefreshAll ? (
                  <>
                    <Sparkles className="w-4 h-4 shrink-0" />
                    <span>Revalidar {selectedRegionMeta.label} ({realSyncPeriod.shortLabel})</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 fill-slate-950 shrink-0" />
                    <span>
                      {selectedScope === 'ALL'
                        ? forceRefreshAll
                          ? `Atualizar Todos os ${selectedRegionMeta.totalClubs} Times (${realSyncPeriod.shortLabel})`
                          : `Atualizar Todos os Times (${pendingInScope} pendentes · ${realSyncPeriod.shortLabel})`
                        : `Atualizar ${selectedRegionMeta.label} (${
                            forceRefreshAll ? selectedRegionMeta.totalClubs : pendingInScope
                          } clubes · ${realSyncPeriod.shortLabel})`}
                    </span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
