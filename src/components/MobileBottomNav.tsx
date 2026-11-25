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
        className="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-[#080e1c]/96 backdrop-blur-md border-t border-slate-800/90 shadow-[0_-8px_24px_rgba(2,6,23,0.55)] pb-[env(safe-area-inset-bottom)]"
      >
        <div className="grid grid-cols-5 h-[58px] max-w-lg mx-auto px-1">
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
                className={`relative min-h-[44px] flex flex-col items-center justify-center gap-1 transition-colors cursor-pointer active:scale-95 ${
                  isActive ? 'text-sky-400' : 'text-slate-400 active:text-slate-200'
                }`}
              >
                {isActive && (
                  <span
                    aria-hidden="true"
                    className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-sky-400"
                  />
                )}
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
            className={`relative min-h-[44px] flex flex-col items-center justify-center gap-1 transition-colors cursor-pointer active:scale-95 ${
              isSecondaryTabActive ? 'text-sky-400' : 'text-slate-400 active:text-slate-200'
            }`}
          >
            {isSecondaryTabActive && (
              <span
                aria-hidden="true"
                className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-sky-400"
              />
            )}
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
