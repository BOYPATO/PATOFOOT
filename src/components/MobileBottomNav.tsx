import React from 'react';
import {
  LayoutDashboard,
  Users,
  Sliders,
  Trophy,
  Menu,
} from 'lucide-react';
import { soundEngine } from '../services/soundEngine';

interface MobileBottomNavProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onOpenMoreMenu: () => void;
  badgeCount?: number;
}

const PRIMARY_MOBILE_TABS = [
  { id: 'hub', label: 'Central', icon: LayoutDashboard },
  { id: 'squad', label: 'Elenco', icon: Users },
  { id: 'tactics', label: 'Táticas', icon: Sliders },
  { id: 'standings', label: 'Tabela', icon: Trophy },
] as const;

export const MobileBottomNav: React.FC<MobileBottomNavProps> = React.memo(
  ({ activeTab, setActiveTab, onOpenMoreMenu, badgeCount = 0 }) => {
    const isSecondaryTabActive = !PRIMARY_MOBILE_TABS.some((t) => t.id === activeTab);

    return (
      <nav
        aria-label="Navegação rápida mobile"
        className="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-[#090f1d]/95 backdrop-blur-md border-t border-slate-800/90 pb-[env(safe-area-inset-bottom)]"
      >
        <div className="grid grid-cols-5 h-14 max-w-lg mx-auto">
          {PRIMARY_MOBILE_TABS.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  soundEngine.playClick();
                  setActiveTab(item.id);
                }}
                aria-current={isActive ? 'page' : undefined}
                className={`min-h-[44px] flex flex-col items-center justify-center gap-0.5 transition-colors cursor-pointer ${
                  isActive ? 'text-sky-400' : 'text-slate-400 active:text-slate-200'
                }`}
              >
                <Icon className="w-5 h-5 shrink-0" />
                <span className="text-[10px] font-semibold tracking-tight leading-none">
                  {item.label}
                </span>
              </button>
            );
          })}

          <button
            type="button"
            onClick={() => {
              soundEngine.playClick();
              onOpenMoreMenu();
            }}
            className={`relative min-h-[44px] flex flex-col items-center justify-center gap-0.5 transition-colors cursor-pointer ${
              isSecondaryTabActive ? 'text-sky-400' : 'text-slate-400 active:text-slate-200'
            }`}
          >
            <span className="relative inline-flex">
              <Menu className="w-5 h-5 shrink-0" />
              {badgeCount > 0 && (
                <span className="absolute -top-1.5 -right-2.5 min-w-[15px] h-[15px] px-1 rounded-full bg-emerald-400 text-slate-950 text-[9px] font-black font-mono flex items-center justify-center leading-none">
                  {badgeCount > 9 ? '9+' : badgeCount}
                </span>
              )}
            </span>
            <span className="text-[10px] font-semibold tracking-tight leading-none">
              Mais
            </span>
          </button>
        </div>
      </nav>
    );
  }
);
