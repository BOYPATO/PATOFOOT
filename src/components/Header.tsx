import React, { useMemo } from 'react';
import { Club } from '../types/game';
import { ClubCrest } from './ClubCrest';
import { PWAInstallButton } from './PWAInstallButton';
import { LanguageSwitcher } from './LanguageSwitcher';
import {
  Volume2,
  VolumeX,
  Save,
  Calendar,
  Wallet,
  Trophy,
  PlayCircle,
  HelpCircle,
  Settings,
  LogOut,
  Menu,
  Plus,
  Search,
  RefreshCw,
} from 'lucide-react';
import { soundEngine } from '../services/soundEngine';
import { getCurrentRealWorldSyncPeriod } from '../services/october2026SquadAiService';
import { formatEuropeanSeason, formatShortDate } from '../utils/calendarUtils';
import { getClubSectorRatings } from '../utils/clubRatingsEngine';
import {
  SOUTH_AMERICAN_LEAGUES_META,
  getClubSouthAmericanLeagueId,
} from '../utils/southAmericaLeaguesEngine';
import {
  EUROPEAN_LEAGUES_META,
  getClubEuropeanLeagueId,
} from '../utils/europeLeaguesEngine';
import {
  WORLD_LEAGUES_META,
  getClubWorldLeagueId,
  isSplitCalendarClub,
} from '../utils/worldLeaguesEngine';

interface HeaderProps {
  userClub: Club;
  managerName: string;
  currentRound: number;
  totalRounds: number;
  seasonYear: number;
  europeSeasonYear?: number;
  currentDate?: string;
  isTodayMatchDay?: boolean;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onOpenMobileMenu: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
  onOpenSaveModal: () => void;
  onOpenSettingsModal: () => void;
  onOpenGuideModal?: () => void;
  onOpenGlobalSearch: () => void;
  onSaveAndExitToTitle: () => void;
  onOpenMatchModal: () => void;
  onAdvanceDay?: () => void;
  hasUpcomingMatch?: boolean;
  onFinishSeason?: () => void;
  autoSaveEnabled?: boolean;
  onOpenOct2026GlobalSyncModal?: () => void;
  isSyncingOct2026Global?: boolean;
  oct2026SyncedCount?: number;
  oct2026TotalClubsCount?: number;
}

const SECTION_LABELS: Record<string, string> = {
  hub: 'Central do Clube',
  players: 'Meus Jogadores',
  squad: 'Escalação & Campo',
  calendar: 'Calendário',
  training: 'Centro de Treino',
  tactics: 'Instruções Táticas',
  standings: 'Classificação',
  clubs: 'Outros Times',
  market: 'Mercado da Bola',
  scouting: 'Olheiros & Base',
  youth: 'Olheiros & Base',
  finances: 'Finanças & Estádio',
  sponsors: 'Patrocinadores',
  board: 'Diretoria & Carreira',
  selecao: 'Minha Seleção',
  selecao_minha: 'Minha Seleção',
  selecao_mundo: 'Seleções & Torneios',
  inbox: 'Notícias',
  trophies: 'Sala de Troféus',
  history: 'Histórico & Recordes',
};

export const Header: React.FC<HeaderProps> = React.memo(({
  userClub,
  managerName,
  currentRound,
  totalRounds,
  seasonYear,
  europeSeasonYear,
  currentDate = '2026-01-15',
  isTodayMatchDay = false,
  activeTab,
  setActiveTab,
  onOpenMobileMenu,
  isMuted,
  onToggleMute,
  onOpenSaveModal,
  onOpenSettingsModal,
  onOpenGuideModal,
  onOpenGlobalSearch,
  onSaveAndExitToTitle,
  onOpenMatchModal,
  onAdvanceDay,
  hasUpcomingMatch = true,
  onFinishSeason,
  autoSaveEnabled = true,
  onOpenOct2026GlobalSyncModal,
  isSyncingOct2026Global = false,
  oct2026SyncedCount = 0,
  oct2026TotalClubsCount = 0,
}) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const activeSectionTitle = SECTION_LABELS[activeTab] || 'Central do Clube';
  const clubSectors = useMemo(() => getClubSectorRatings(userClub), [userClub]);
  const deltaText =
    clubSectors.deltaOverall > 0
      ? `+${clubSectors.deltaOverall}`
      : clubSectors.deltaOverall < 0
      ? `${clubSectors.deltaOverall}`
      : null;

  return (
    <header className="sticky top-0 z-20 bg-[#090f1d]/95 backdrop-blur-md border-b border-slate-800/80 text-white pt-[env(safe-area-inset-top)]">
      <div className="h-14 sm:h-16 px-2.5 sm:px-6 flex items-center justify-between gap-1.5 sm:gap-4">
        {/* Left Zone: Mobile Menu Trigger + Club Identity & Current Breadcrumb */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
          <button
            type="button"
            onClick={() => {
              soundEngine.playClick();
              onOpenMobileMenu();
            }}
            title="Abrir menu de navegação"
            aria-label="Abrir menu de navegação"
            className="lg:hidden p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 shrink-0 cursor-pointer"
          >
            <Menu className="w-5 h-5" />
          </button>

          <button
            type="button"
            onClick={() => {
              soundEngine.playClick();
              setActiveTab('hub');
            }}
            title="Ir para a Central do Clube"
            className="flex items-center gap-2 sm:gap-2.5 text-left min-w-0 cursor-pointer group"
          >
            <div className="shrink-0 sm:hidden">
              <ClubCrest club={userClub} size="sm" />
            </div>
            <div className="hidden sm:block shrink-0">
              <ClubCrest club={userClub} size="md" />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2 text-[13px] sm:text-sm font-bold text-white truncate">
                <span className="truncate group-hover:text-sky-300 transition-colors">
                  {userClub.name}
                </span>
                <span className="hidden sm:inline text-slate-600" aria-hidden="true">
                  /
                </span>
                <span className="hidden sm:inline text-xs font-medium text-sky-400 whitespace-nowrap">
                  {activeSectionTitle}
                </span>
              </div>
              <div className="text-[11px] text-slate-400 truncate flex items-center gap-1.5">
                <span>
                  {userClub.division === 'EU'
                    ? (() => {
                        const euId = getClubEuropeanLeagueId(userClub);
                        return euId ? EUROPEAN_LEAGUES_META[euId].shortName : 'UEFA';
                      })()
                    : userClub.division === 'SA'
                    ? (() => {
                        const saId = getClubSouthAmericanLeagueId(userClub);
                        return saId ? SOUTH_AMERICAN_LEAGUES_META[saId].shortName : 'CONMEBOL';
                      })()
                    : userClub.division === 'WL'
                    ? (() => {
                        const wlId = getClubWorldLeagueId(userClub);
                        return wlId ? WORLD_LEAGUES_META[wlId].shortName : 'Liga Internacional';
                      })()
                    : `Série ${userClub.division}`}
                </span>
                <span className="text-slate-600" aria-hidden="true">
                  ·
                </span>
                <span className="font-mono tabular-nums text-emerald-400 font-semibold">
                  OVR {clubSectors.overall}
                  {deltaText && (
                    <span
                      className={
                        clubSectors.deltaOverall > 0
                          ? 'text-emerald-300 ml-0.5'
                          : 'text-rose-400 ml-0.5'
                      }
                    >
                      ({deltaText})
                    </span>
                  )}
                </span>
                <span className="hidden md:inline font-mono tabular-nums text-slate-400">
                  · DEF <strong className="text-sky-300">{clubSectors.defense}</strong> · MEI{' '}
                  <strong className="text-amber-300">{clubSectors.midfield}</strong> · ATA{' '}
                  <strong className="text-rose-300">{clubSectors.attack}</strong>
                </span>
              </div>
            </div>
          </button>
        </div>

        {/* Center Zone: Date, Round & +1 Day Training */}
        <div className="hidden xl:flex items-center gap-2.5 bg-slate-900/70 px-3 py-1.5 rounded-xl border border-slate-800/80 text-xs shrink-0">
          <button
            type="button"
            onClick={() => {
              soundEngine.playClick();
              setActiveTab('calendar');
            }}
            className="flex items-center gap-1.5 text-slate-200 hover:text-sky-300 font-semibold transition-colors whitespace-nowrap cursor-pointer"
            title="Abrir Calendário Completo"
          >
            <Calendar className="w-3.5 h-3.5 text-sky-400" />
            <span className="tabular-nums">
              {formatShortDate(currentDate)}/{currentDate.slice(2, 4)}
            </span>
          </button>

          <span className="text-slate-700" aria-hidden="true">
            ·
          </span>

          <span className="text-slate-400 font-mono tabular-nums whitespace-nowrap">
            {isSplitCalendarClub(userClub)
              ? formatEuropeanSeason(europeSeasonYear ?? seasonYear)
              : seasonYear}{' '}
            · R{currentRound}/{totalRounds}
          </span>

          {onAdvanceDay && (
            <button
              type="button"
              onClick={() => {
                soundEngine.playClick();
                onAdvanceDay();
              }}
              className="ml-1 px-2.5 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 text-[11px] font-semibold border border-emerald-500/30 transition-colors flex items-center gap-1 whitespace-nowrap cursor-pointer"
              title="Avançar 1 Dia de Treino e Descanso (+20% Físico para o elenco)"
            >
              <Plus className="w-3 h-3" />
              <span>1 Dia (+20% Físico)</span>
            </button>
          )}
        </div>

        {/* Right Zone: Global Search, Cash, Utility Icons & Primary Match CTA */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <button
            type="button"
            onClick={() => {
              soundEngine.playClick();
              onOpenGlobalSearch();
            }}
            title="Pesquisar jogadores, times ou competições (Ctrl + K)"
            aria-label="Pesquisar"
            className="flex items-center gap-2 bg-slate-900/80 hover:bg-slate-800 border border-slate-800 hover:border-sky-500/40 p-2 sm:px-3 sm:py-1.5 rounded-xl text-xs font-semibold text-slate-200 hover:text-white transition-colors whitespace-nowrap cursor-pointer"
          >
            <Search className="w-4 h-4 text-sky-400 shrink-0" />
            <span className="hidden md:inline">Pesquisar</span>
            <span className="hidden lg:inline text-[10px] font-mono text-slate-500 ml-0.5">
              Ctrl K
            </span>
          </button>

          {onOpenOct2026GlobalSyncModal && (() => {
            const realSyncPeriod = getCurrentRealWorldSyncPeriod();
            return (
            <button
              type="button"
              onClick={() => {
                soundEngine.playClick();
                onOpenOct2026GlobalSyncModal();
              }}
              title={`Atualizar elencos de todos os times com IA (${realSyncPeriod.fullLabel})`}
              className={`hidden md:flex items-center gap-1.5 border px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                isSyncingOct2026Global
                  ? 'bg-sky-950/60 border-sky-400/50 text-sky-200'
                  : 'bg-slate-900/80 hover:bg-slate-800 border-slate-800 hover:border-sky-500/40 text-sky-300 hover:text-white'
              }`}
            >
              <RefreshCw
                className={`w-3.5 h-3.5 text-sky-400 shrink-0 ${
                  isSyncingOct2026Global ? 'animate-spin' : ''
                }`}
              />
              <span>IA {realSyncPeriod.shortLabel}</span>
              {oct2026TotalClubsCount > 0 && (
                <span className="hidden xl:inline font-mono tabular-nums text-[10px] text-slate-400">
                  {oct2026SyncedCount}/{oct2026TotalClubsCount}
                </span>
              )}
            </button>
            );
          })()}

          <button
            type="button"
            onClick={() => {
              soundEngine.playClick();
              setActiveTab('finances');
            }}
            title="Ver Finanças & Estádio"
            className={`hidden sm:flex items-center gap-1.5 bg-slate-900/80 hover:bg-slate-800/80 border px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
              userClub.finances.balance < 0
                ? 'border-rose-500/40 text-rose-300'
                : 'border-slate-800 text-sky-300'
            }`}
          >
            <Wallet
              className={`w-3.5 h-3.5 ${
                userClub.finances.balance < 0 ? 'text-rose-400' : 'text-sky-400'
              }`}
            />
            <span className="font-mono tabular-nums">
              {formatCurrency(userClub.finances.balance)}
            </span>
          </button>

          <PWAInstallButton compact className="hidden sm:inline-flex" />

          <button
            type="button"
            onClick={() => {
              onToggleMute();
              soundEngine.playClick();
            }}
            title={isMuted ? 'Ativar som' : 'Silenciar som'}
            className="hidden md:flex p-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white transition-colors border border-slate-800 cursor-pointer"
          >
            {isMuted ? (
              <VolumeX className="w-4 h-4 text-rose-400" />
            ) : (
              <Volume2 className="w-4 h-4 text-slate-300" />
            )}
          </button>

          {onOpenGuideModal && (
            <button
              type="button"
              onClick={() => {
                soundEngine.playClick();
                onOpenGuideModal();
              }}
              title="Manual · Como Jogar & Novidades v1.0"
              className="hidden sm:flex p-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-emerald-300 hover:text-emerald-200 transition-colors border border-slate-800 cursor-pointer"
            >
              <HelpCircle className="w-4 h-4" />
            </button>
          )}

          <div className="hidden sm:block">
            <LanguageSwitcher compact />
          </div>

          <button
            type="button"
            onClick={() => {
              soundEngine.playClick();
              onOpenSettingsModal();
            }}
            title="Configurações do Jogo"
            className="hidden md:flex p-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white transition-colors border border-slate-800 cursor-pointer"
          >
            <Settings className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => {
              soundEngine.playClick();
              onOpenSaveModal();
            }}
            title="Salvar / Gerenciar Carreira"
            aria-label="Salvar carreira"
            className="p-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white transition-colors border border-slate-800 cursor-pointer"
          >
            <Save className="w-4 h-4 text-sky-400" />
          </button>

          <button
            type="button"
            onClick={() => {
              soundEngine.playClick();
              onSaveAndExitToTitle();
            }}
            title={
              autoSaveEnabled
                ? 'Salvar no IndexedDB e Voltar à Página Inicial'
                : 'Voltar à Página Inicial (Salvamento Automático desativado)'
            }
            className="hidden lg:flex px-2.5 py-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white transition-colors border border-slate-800 items-center gap-1.5 text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5 text-slate-400" />
            <span>Sair</span>
          </button>

          {!hasUpcomingMatch && onFinishSeason ? (
            <button
              type="button"
              onClick={() => {
                soundEngine.playClick();
                onFinishSeason();
              }}
              className="flex items-center gap-1.5 px-2.5 sm:px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs sm:text-sm transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Trophy className="w-4 h-4 shrink-0" />
              <span className="sm:hidden">Encerrar</span>
              <span className="hidden sm:inline">Retrospectiva</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                soundEngine.playClick();
                onOpenMatchModal();
              }}
              className={`flex items-center gap-1.5 px-2.5 sm:px-4 py-2 rounded-xl text-slate-950 font-bold text-xs sm:text-sm transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                isTodayMatchDay
                  ? 'bg-emerald-400 hover:bg-emerald-300'
                  : 'bg-sky-400 hover:bg-sky-300'
              }`}
            >
              <PlayCircle className="w-4 h-4 shrink-0" />
              <span className="sm:hidden">{isTodayMatchDay ? 'Jogar' : 'Rodada'}</span>
              <span className="hidden sm:inline">
                {isTodayMatchDay ? 'Jogar Hoje' : 'Jogar Rodada'}
              </span>
            </button>
          )}
        </div>
      </div>

      {/* Compact Mobile & Tablet Utility Bar (< xl) so Date, Round, Cash and +1 Day stay 1-tap accessible */}
      <div className="xl:hidden border-t border-slate-800/70 bg-slate-950/60 px-2.5 sm:px-6 py-1.5 flex items-center justify-between gap-2 text-[11px] overflow-x-auto no-native-scrollbar">
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => {
              soundEngine.playClick();
              setActiveTab('calendar');
            }}
            className="inline-flex items-center gap-1.5 text-slate-200 hover:text-sky-300 font-semibold whitespace-nowrap cursor-pointer"
          >
            <Calendar className="w-3.5 h-3.5 text-sky-400 shrink-0" />
            <span className="font-mono tabular-nums">
              {formatShortDate(currentDate)}/{currentDate.slice(2, 4)}
            </span>
          </button>
          <span className="text-slate-700" aria-hidden="true">·</span>
          <span className="text-slate-400 font-mono tabular-nums whitespace-nowrap">
            {isSplitCalendarClub(userClub)
              ? formatEuropeanSeason(europeSeasonYear ?? seasonYear)
              : seasonYear}{' '}
            · R{currentRound}/{totalRounds}
          </span>
          <button
            type="button"
            onClick={() => {
              soundEngine.playClick();
              setActiveTab('finances');
            }}
            className={`sm:hidden inline-flex items-center gap-1 font-mono tabular-nums font-semibold whitespace-nowrap cursor-pointer ${
              userClub.finances.balance < 0 ? 'text-rose-300' : 'text-sky-300'
            }`}
          >
            <span className="text-slate-700 font-sans" aria-hidden="true">·</span>
            <Wallet className="w-3 h-3 shrink-0" />
            <span>{formatCurrency(userClub.finances.balance)}</span>
          </button>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <PWAInstallButton compact iconOnlyOnMobile className="lg:hidden" />
          {onAdvanceDay && (
            <button
              type="button"
              onClick={() => {
                soundEngine.playClick();
                onAdvanceDay();
              }}
              className="px-2.5 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 text-[11px] font-semibold border border-emerald-500/30 transition-colors inline-flex items-center gap-1 whitespace-nowrap cursor-pointer"
            >
              <Plus className="w-3 h-3 shrink-0" />
              <span>+1 Dia</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
});
