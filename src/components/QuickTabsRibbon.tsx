import React from 'react';
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
  History,
  LayoutDashboard,
  Mail,
  Shield,
  ShoppingBag,
  Sliders,
  Trophy,
  UserCheck,
  Users,
} from 'lucide-react';
import { soundEngine } from '../services/soundEngine';
import { ScrollableTabStrip } from './ScrollableTabStrip';

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
  }) => {
    const tabs = [
      { id: 'hub', label: 'Central', icon: LayoutDashboard },
      { id: 'inbox', label: 'Notícias', icon: Mail, badge: unreadCount },
      { id: 'calendar', label: 'Calendário', icon: CalendarDays },
      { id: 'players', label: 'Jogadores', icon: UserCheck },
      { id: 'squad', label: 'Escalação', icon: Users },
      { id: 'tactics', label: 'Táticas', icon: Sliders },
      { id: 'training', label: 'Treinos', icon: Dumbbell },
      { id: 'standings', label: 'Classificação', icon: Trophy },
      { id: 'clubs', label: 'Outros Times', icon: Shield },
      { id: 'market', label: 'Mercado', icon: ShoppingBag, badge: marketBadge },
      { id: 'scouting', label: 'Olheiros & Base', icon: Compass, badge: scoutingBadge },
      { id: 'finances', label: 'Finanças', icon: Building2, badge: financesAlert ? 1 : 0 },
      { id: 'sponsors', label: 'Patrocinadores', icon: Handshake, badge: openSponsorSlots },
      { id: 'board', label: 'Diretoria', icon: Briefcase, badge: jobOffersBadge },
      { id: 'selecao_minha', label: 'Minha Seleção', icon: Crown, badge: selecaoBadge },
      { id: 'selecao_mundo', label: 'Seleções & FIFA', icon: Globe },
      { id: 'trophies', label: 'Troféus', icon: Award },
      { id: 'history', label: 'Histórico', icon: History },
    ];

    return (
      <div
        className={`mb-3.5 sm:mb-4 bg-[#0b1220]/95 border border-slate-800/80 rounded-xl px-2 py-1.5 ${
          sidebarCollapsed ? 'block' : 'lg:hidden'
        }`}
      >
        <ScrollableTabStrip
          activeKey={activeTab}
          ariaLabel="Navegação rápida entre todas as abas"
          innerClassName="flex items-center gap-1.5"
        >
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive =
              activeTab === tab.id ||
              (tab.id === 'selecao_minha' && activeTab === 'selecao');
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
