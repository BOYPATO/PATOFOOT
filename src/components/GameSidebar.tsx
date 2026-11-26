import React from 'react';
import { Club, Fixture } from '../types/game';
import { PatoLogo } from './PatoLogo';
import { ClubCrest } from './ClubCrest';
import { LanguageSwitcher } from './LanguageSwitcher';
import { soundEngine } from '../services/soundEngine';
import { countActiveSponsors } from '../utils/sponsorEngine';
import { formatShortDate } from '../utils/calendarUtils';
import { COMPETITIONS_CATALOG } from '../utils/competitionsEngine';
import {
  Award,
  Briefcase,
  Building2,
  CalendarDays,
  Compass,
  Crown,
  Dumbbell,
  Globe,
  Handshake,
  HelpCircle,
  History,
  LayoutDashboard,
  LogOut,
  Mail,
  PanelLeftClose,
  PanelLeftOpen,
  RefreshCw,
  Settings,
  Shield,
  ShoppingBag,
  Sliders,
  Trophy,
  UserCheck,
  Users,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';

export interface NavItemConfig {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
}

interface NavGroupConfig {
  groupTitle: string;
  items: NavItemConfig[];
}

interface GameSidebarProps {
  userClub: Club;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  collapsed: boolean;
  onToggleCollapsed: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
  unreadCount: number;
  scoutingBadge?: number;
  marketBadge?: number;
  jobOffersBadge?: number;
  selecaoBadge?: number;
  upcomingFixture?: Fixture | null;
  upcomingOpponent?: Club | null;
  onInspectOpponent?: (clubId: string) => void;
  isMuted?: boolean;
  onToggleMute?: () => void;
  onOpenSettingsModal?: () => void;
  onOpenGuideModal?: () => void;
  onOpenOfficialSite?: () => void;
  onSaveAndExitToTitle?: () => void;
  onOpenOct2026GlobalSyncModal?: () => void;
  isSyncingOct2026Global?: boolean;
  autoSaveEnabled?: boolean;
}

export const GameSidebar: React.FC<GameSidebarProps> = ({
  userClub,
  activeTab,
  setActiveTab,
  collapsed,
  onToggleCollapsed,
  mobileOpen,
  onCloseMobile,
  unreadCount,
  scoutingBadge,
  marketBadge,
  jobOffersBadge,
  selecaoBadge,
  upcomingFixture,
  upcomingOpponent,
  onInspectOpponent,
  isMuted = false,
  onToggleMute,
  onOpenSettingsModal,
  onOpenGuideModal,
  onOpenOfficialSite,
  onSaveAndExitToTitle,
  onOpenOct2026GlobalSyncModal,
  isSyncingOct2026Global = false,
  autoSaveEnabled = true,
}) => {
  const openSponsorSlots = Math.max(0, 4 - countActiveSponsors(userClub.sponsors));

  const navGroups: NavGroupConfig[] = [
    {
      groupTitle: 'Comando',
      items: [
        { id: 'hub', label: 'Central do Clube', icon: LayoutDashboard },
        {
          id: 'inbox',
          label: 'Notícias',
          icon: Mail,
          badge: unreadCount > 0 ? unreadCount : undefined,
        },
        { id: 'calendar', label: 'Calendário', icon: CalendarDays },
      ],
    },
    {
      groupTitle: 'Futebol',
      items: [
        { id: 'players', label: 'Meus Jogadores', icon: UserCheck },
        { id: 'squad', label: 'Escalação & Campo', icon: Users },
        { id: 'tactics', label: 'Táticas', icon: Sliders },
        { id: 'training', label: 'Treinos', icon: Dumbbell },
      ],
    },
    {
      groupTitle: 'Competições & Mundo',
      items: [
        { id: 'standings', label: 'Classificação', icon: Trophy },
        { id: 'clubs', label: 'Outros Times', icon: Shield },
        { id: 'trophies', label: 'Sala de Troféus', icon: Award },
        { id: 'history', label: 'Histórico & Recordes', icon: History },
      ],
    },
    {
      groupTitle: 'Seleções & FIFA',
      items: [
        {
          id: 'selecao_minha',
          label: 'Minha Seleção',
          icon: Crown,
          badge: selecaoBadge && selecaoBadge > 0 ? selecaoBadge : undefined,
        },
        {
          id: 'selecao_mundo',
          label: 'Seleções & Torneios',
          icon: Globe,
        },
      ],
    },
    {
      groupTitle: 'Mercado & Gestão',
      items: [
        {
          id: 'market',
          label: 'Mercado da Bola',
          icon: ShoppingBag,
          badge: marketBadge && marketBadge > 0 ? marketBadge : undefined,
        },
        {
          id: 'scouting',
          label: 'Olheiros & Base',
          icon: Compass,
          badge: scoutingBadge && scoutingBadge > 0 ? scoutingBadge : undefined,
        },
        {
          id: 'finances',
          label: 'Finanças & Estádio',
          icon: Building2,
          badge: userClub.finances.balance < 0 ? 1 : undefined,
        },
        {
          id: 'sponsors',
          label: 'Patrocinadores',
          icon: Handshake,
          badge: openSponsorSlots > 0 ? openSponsorSlots : undefined,
        },
        {
          id: 'board',
          label: 'Diretoria & Carreira',
          icon: Briefcase,
          badge: jobOffersBadge && jobOffersBadge > 0 ? jobOffersBadge : undefined,
        },
      ],
    },
  ];

  const handleSelect = (id: string) => {
    soundEngine.playClick();
    setActiveTab(id);
    onCloseMobile();
  };

  const compMeta = upcomingFixture
    ? COMPETITIONS_CATALOG[upcomingFixture.competition]
    : null;

  const renderNavContent = (isCompact: boolean, isMobileDrawer: boolean) => (
    <div
      className={`flex flex-col h-full bg-[#090f1d] border-r border-slate-800/80 text-slate-200 select-none ${
        isMobileDrawer ? 'pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]' : ''
      }`}
    >
      {/* Brand Header */}
      <div
        className={`${isMobileDrawer ? 'h-14' : 'h-16'} px-4 border-b border-slate-800/80 flex items-center ${
          isCompact ? 'justify-center' : 'justify-between'
        } shrink-0`}
      >
        {!isCompact && (
          <button
            type="button"
            onClick={() => handleSelect('hub')}
            className="flex items-center gap-2.5 min-w-0 cursor-pointer group"
          >
            <PatoLogo size={28} />
            <span className="font-bold text-sm tracking-tight text-white group-hover:text-sky-300 transition-colors whitespace-nowrap">
              PATOFOOT 2027
            </span>
          </button>
        )}

        {isMobileDrawer ? (
          <button
            type="button"
            onClick={onCloseMobile}
            title="Fechar menu"
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/70 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        ) : (
          <button
            type="button"
            onClick={() => {
              soundEngine.playClick();
              onToggleCollapsed();
            }}
            title={isCompact ? 'Expandir menu lateral' : 'Recolher menu lateral'}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/70 transition-colors cursor-pointer"
          >
            {isCompact ? (
              <PanelLeftOpen className="w-4 h-4 text-sky-400" />
            ) : (
              <PanelLeftClose className="w-4 h-4" />
            )}
          </button>
        )}
      </div>

      {/* Grouped Navigation Links */}
      <div className="flex-1 overflow-y-auto px-2.5 py-3 space-y-4">
        {navGroups.map((group) => (
          <div key={group.groupTitle} className="space-y-0.5">
            {!isCompact && (
              <div className="px-2.5 pb-1 text-[11px] font-semibold text-slate-500 whitespace-nowrap">
                {group.groupTitle}
              </div>
            )}

            {group.items.map((item) => {
              const Icon = item.icon;
              const isActive =
                activeTab === item.id ||
                (item.id === 'selecao_minha' && activeTab === 'selecao');
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleSelect(item.id)}
                  title={isCompact ? item.label : undefined}
                  className={`w-full flex items-center ${
                    isCompact
                      ? 'justify-center px-2 py-2.5'
                      : isMobileDrawer
                      ? 'justify-between px-3 py-2.5 min-h-[42px]'
                      : 'justify-between px-2.5 py-2'
                  } rounded-xl text-[13px] transition-colors relative cursor-pointer ${
                    isActive
                      ? 'bg-sky-500/15 text-sky-300 border border-sky-500/30 font-semibold'
                      : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/50 border border-transparent font-medium'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Icon
                      className={`w-4 h-4 shrink-0 ${
                        isActive ? 'text-sky-400' : 'text-slate-400'
                      }`}
                    />
                    {!isCompact && (
                      <span className="truncate whitespace-nowrap">{item.label}</span>
                    )}
                  </div>

                  {item.badge !== undefined && item.badge > 0 && (
                    <span
                      className={`${
                        isCompact
                          ? 'absolute top-1 right-1 w-4 h-4 text-[9px]'
                          : 'px-1.5 py-0.5 text-[10px] min-w-[20px]'
                      } rounded-md bg-sky-500 text-slate-950 font-mono font-bold tabular-nums flex items-center justify-center shrink-0`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        ))}

        {/* Mobile Drawer System & Preferences Utilities (restores desktop-header controls on phones) */}
        {isMobileDrawer && (
          <div className="pt-3 mt-2 border-t border-slate-800/80 space-y-2.5">
            <div className="px-2.5 text-[11px] font-semibold text-slate-500">
              Sistema & Preferências
            </div>

            <div className="px-1 flex items-center justify-between gap-2">
              <span className="text-xs text-slate-400 font-medium pl-1.5">Idioma</span>
              <LanguageSwitcher compact align="right" />
            </div>

            <div className="grid grid-cols-2 gap-1.5 px-1">
              {onToggleMute && (
                <button
                  type="button"
                  onClick={() => {
                    onToggleMute();
                    soundEngine.playClick();
                  }}
                  className="min-h-[40px] px-2.5 py-2 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-800 text-xs font-semibold text-slate-200 flex items-center gap-2 cursor-pointer transition-colors"
                >
                  {isMuted ? (
                    <VolumeX className="w-4 h-4 text-rose-400 shrink-0" />
                  ) : (
                    <Volume2 className="w-4 h-4 text-sky-400 shrink-0" />
                  )}
                  <span className="truncate">{isMuted ? 'Sem Som' : 'Som Ativo'}</span>
                </button>
              )}

              {onOpenSettingsModal && (
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playClick();
                    onCloseMobile();
                    onOpenSettingsModal();
                  }}
                  className="min-h-[40px] px-2.5 py-2 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-800 text-xs font-semibold text-slate-200 flex items-center gap-2 cursor-pointer transition-colors"
                >
                  <Settings className="w-4 h-4 text-sky-400 shrink-0" />
                  <span className="truncate">Ajustes</span>
                </button>
              )}

              {onOpenGuideModal && (
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playClick();
                    onCloseMobile();
                    onOpenGuideModal();
                  }}
                  className="min-h-[40px] px-2.5 py-2 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-800 text-xs font-semibold text-emerald-300 flex items-center gap-2 cursor-pointer transition-colors"
                >
                  <HelpCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="truncate">Manual</span>
                </button>
              )}

              {onOpenOct2026GlobalSyncModal && (
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playClick();
                    onCloseMobile();
                    onOpenOct2026GlobalSyncModal();
                  }}
                  className="min-h-[40px] px-2.5 py-2 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-800 text-xs font-semibold text-sky-300 flex items-center gap-2 cursor-pointer transition-colors"
                >
                  <RefreshCw
                    className={`w-4 h-4 text-sky-400 shrink-0 ${
                      isSyncingOct2026Global ? 'animate-spin' : ''
                    }`}
                  />
                  <span className="truncate">IA Elencos</span>
                </button>
              )}

              {onOpenOfficialSite && (
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playClick();
                    onCloseMobile();
                    onOpenOfficialSite();
                  }}
                  className="col-span-2 min-h-[40px] px-2.5 py-2 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/35 text-xs font-semibold text-emerald-300 flex items-center justify-center gap-2 cursor-pointer transition-colors"
                >
                  <Globe className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="truncate">Site Oficial, Baixar App &amp; Convidar Amigos</span>
                </button>
              )}
            </div>

            {onSaveAndExitToTitle && (
              <div className="px-1 pt-0.5">
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playClick();
                    onCloseMobile();
                    onSaveAndExitToTitle();
                  }}
                  className="w-full min-h-[42px] px-3 py-2 rounded-xl bg-rose-950/35 hover:bg-rose-950/60 border border-rose-500/30 text-xs font-semibold text-rose-200 flex items-center justify-center gap-2 cursor-pointer transition-colors"
                >
                  <LogOut className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>{autoSaveEnabled ? 'Salvar e Voltar ao Início' : 'Voltar ao Início'}</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom Next Match Mini-Card (Expanded Mode) */}
      {!isCompact && upcomingFixture && upcomingOpponent && (
        <div className="p-3 border-t border-slate-800/80 shrink-0">
          <button
            type="button"
            onClick={() => {
              soundEngine.playClick();
              if (onInspectOpponent) {
                onInspectOpponent(upcomingOpponent.id);
              } else {
                handleSelect('hub');
              }
            }}
            title={`Inspecionar ${upcomingOpponent.name}`}
            className="w-full text-left p-2.5 rounded-xl bg-slate-900/80 hover:bg-slate-800/80 border border-slate-800 transition-colors cursor-pointer"
          >
            <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1.5">
              <span className="truncate">{compMeta?.shortName || 'Próximo Jogo'}</span>
              {upcomingFixture.date && (
                <span className="font-mono tabular-nums text-sky-400 shrink-0">
                  {formatShortDate(upcomingFixture.date)}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <ClubCrest club={upcomingOpponent} size="sm" rounded="md" />
              <div className="min-w-0 flex-1">
                <div className="text-xs font-semibold text-white truncate">
                  vs {upcomingOpponent.shortName}
                </div>
                <div className="text-[11px] text-slate-500 truncate">
                  {upcomingFixture.homeTeamId === userClub.id ? 'Em Casa' : 'Fora de Casa'} · Ver time
                </div>
              </div>
            </div>
          </button>
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* Desktop Sticky Sidebar */}
      <aside
        className={`hidden lg:block shrink-0 sticky top-0 h-screen z-30 transition-[width] duration-200 ${
          collapsed ? 'w-[68px]' : 'w-60'
        }`}
      >
        {renderNavContent(collapsed, false)}
      </aside>

      {/* Mobile Drawer Overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs"
            onClick={onCloseMobile}
          />
          <div className="relative w-72 max-w-[85vw] h-[100dvh] z-10 shadow-2xl">
            {renderNavContent(false, true)}
          </div>
        </div>
      )}
    </>
  );
};
