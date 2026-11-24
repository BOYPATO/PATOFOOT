import React, { createContext, useContext } from 'react';
import { Club, Player } from '../types/game';

export interface PlayerInspectionContextValue {
  inspectPlayer: (player: Player, club?: Club | null) => void;
}

const PlayerInspectionContext = createContext<PlayerInspectionContextValue | null>(null);

export const PlayerInspectionProvider: React.FC<{
  onInspectPlayer: (player: Player, club?: Club | null) => void;
  children: React.ReactNode;
}> = ({ onInspectPlayer, children }) => {
  return (
    <PlayerInspectionContext.Provider value={{ inspectPlayer: onInspectPlayer }}>
      {children}
    </PlayerInspectionContext.Provider>
  );
};

export function usePlayerInspection(): PlayerInspectionContextValue | null {
  return useContext(PlayerInspectionContext);
}
