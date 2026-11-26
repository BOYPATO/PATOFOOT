import React from 'react';
import {
  Building2,
  CalendarDays,
  Compass,
  LayoutDashboard,
  Mail,
  ShoppingBag,
  Trophy,
  Users,
} from 'lucide-react';
import { soundEngine } from '../services/soundEngine';
import { ScrollableTabStrip } from './ScrollableTabStrip';

export function resolvePrimaryNavTabId(activeTab: string): string {
  if (activeTab === 'players' || activeTab === 'tactics') return 'squad';
  if (
    activeTab === 'clubs' ||
    activeTab === 'selecao' ||
    activeTab === 'selecao_minha' ||
    activeTab === 'selecao_mundo'
  ) {
    return 'standings';
  }
  if (activeTab === 'youth' || activeTab === 'training') return 'scouting';
  if (
    activeTab === 'sponsors' ||
    activeTab === 'board' ||
    activeTab === 'trophies' ||
    activeTab === 'history'
  ) {
    return 'finances';
  }
  return activeTab;
}

interface QuickTabsRibbonProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  sidebarCollapsed: boolean;
  unreadCount?: number;
  scoutingBadge?: number;
  marketBadge?: number;
  jobOffersBadge?: number;
  selecaoBadge?: number;
  financesAlert?: boolean;
  openSponsorSlots?: number;
  classicFastMode?: boolean;
}

export const QuickTabsRibbon: React.FC<QuickTabsRibbonProps> = React.memo(
  ({
    activeTab,
    setActiveTab,
    sidebarCollapsed,
    unreadCount = 0,
    scoutingBadge = 0,
    marketBadge = 0,
    jobOffersBadge = 0,
    selecaoBadge = 0,
    financesAlert = false,
    openSponsorSlots = 0,
    classicFastMode = false,
  }) => {
    const primaryActive = resolvePrimaryNavTabId(activeTab);
    const clubBadge =
      (financesAlert ? 1 : 0) +
      jobOffersBadge +
      (!classicFastMode ? openSponsorSlots : 0);

    const tabs = [
      { id: 'hub', label: 'Central', icon: LayoutDashboard },
      { id: 'squad', label: 'Time', icon: Users },
      { id: 'calendar', label: 'Calendário', icon: CalendarDays },
      { id: 'standings', label: 'Competições', icon: Trophy, badge: selecaoBadge },
      { id: 'market', label: 'Mercado', icon: ShoppingBag, badge: marketBadge },
      { id: 'scouting', label: 'Base & Treinos', icon: Compass, badge: scoutingBadge },
      { id: 'finances', label: 'Clube', icon: Building2, badge: clubBadge },
      { id: 'inbox', label: 'Notícias', icon: Mail, badge: unreadCount },
    ];

    return (
      <div
        className={`mb-3.5 sm:mb-4 bg-[#0b1220]/95 border border-slate-800/80 rounded-xl px-2 py-1.5 ${
          sidebarCollapsed ? 'block' : 'lg:hidden'
        }`}
      >
        <ScrollableTabStrip
          activeKey={primaryActive}
          ariaLabel="Navegação rápida principal"
          innerClassName="flex items-center gap-1.5"
        >
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = primaryActive === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                data-tab-active={isActive ? 'true' : undefined}
                aria-current={isActive ? 'page' : undefined}
                onClick={() => {
                  soundEngine.playClick();
                  setActiveTab(tab.id);
                }}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 min-h-[34px] rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
                  isActive
                    ? 'bg-sky-400 text-slate-950 font-bold shadow-sm'
                    : 'bg-slate-900/90 text-slate-300 hover:text-white hover:bg-slate-800 border border-slate-800/80'
                }`}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                <span>{tab.label}</span>
                {tab.badge !== undefined && tab.badge > 0 && (
                  <span
                    className={`font-mono text-[10px] tabular-nums px-1.5 py-0.2 rounded ${
                      isActive
                        ? 'bg-slate-950/20 text-slate-950 font-black'
                        : 'bg-sky-500/20 text-sky-300 font-bold'
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </ScrollableTabStrip>
      </div>
    );
  }
);
