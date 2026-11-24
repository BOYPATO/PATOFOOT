import React, { useEffect, useState } from 'react';
import { Club, Player } from '../types/game';
import { usePlayerInspection } from '../context/PlayerInspectionContext';
import { soundEngine } from '../services/soundEngine';

interface PlayerAvatarProps {
  player: Pick<Player, 'name' | 'photoUrl' | 'squadNumber' | 'detailedRole'> &
    Partial<Player>;
  club?: Club | null;
  clubPrimaryColor?: string;
  clubTextColor?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  showNumberFallback?: boolean;
  disableInspection?: boolean;
  onClickInspect?: (player: Player, club?: Club | null) => void;
}

const AVATAR_SIZE_CLASSES: Record<NonNullable<PlayerAvatarProps['size']>, string> = {
  xs: 'w-6 h-6 text-[9px]',
  sm: 'w-8 h-8 text-[11px]',
  md: 'w-10 h-10 text-xs',
  lg: 'w-12 h-12 text-sm',
  xl: 'w-16 h-16 text-base',
};

function isFullPlayer(
  p: Pick<Player, 'name' | 'photoUrl' | 'squadNumber' | 'detailedRole'> & Partial<Player>
): p is Player {
  return typeof p.id === 'string' && typeof p.overall === 'number';
}

export const PlayerAvatar: React.FC<PlayerAvatarProps> = ({
  player,
  club = null,
  clubPrimaryColor,
  clubTextColor,
  size = 'sm',
  className = '',
  showNumberFallback = true,
  disableInspection = false,
  onClickInspect,
}) => {
  const [imgError, setImgError] = useState(false);
  const inspection = usePlayerInspection();

  useEffect(() => {
    setImgError(false);
  }, [player.photoUrl]);

  const sizeCls = AVATAR_SIZE_CLASSES[size];
  const canInspect =
    !disableInspection &&
    isFullPlayer(player) &&
    Boolean(onClickInspect || inspection);

  const handleInspectClick = (e: React.MouseEvent) => {
    if (!canInspect || !isFullPlayer(player)) return;
    e.stopPropagation();
    soundEngine.playClick();
    if (onClickInspect) {
      onClickInspect(player, club);
    } else if (inspection) {
      inspection.inspectPlayer(player, club);
    }
  };

  const interactiveCls = canInspect
    ? 'cursor-pointer hover:ring-2 hover:ring-sky-400/75 transition-all'
    : '';

  if (player.photoUrl && !imgError) {
    return (
      <div
        role={canInspect ? 'button' : undefined}
        tabIndex={canInspect ? 0 : undefined}
        onClick={canInspect ? handleInspectClick : undefined}
        onKeyDown={
          canInspect
            ? (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  e.stopPropagation();
                  soundEngine.playClick();
                  if (isFullPlayer(player)) {
                    if (onClickInspect) onClickInspect(player, club);
                    else inspection?.inspectPlayer(player, club);
                  }
                }
              }
            : undefined
        }
        className={`relative inline-flex items-center justify-center shrink-0 rounded-full overflow-hidden bg-slate-800 border border-white/20 shadow-sm ${sizeCls} ${interactiveCls} ${className}`}
        title={canInspect ? `${player.name} · Ver ficha completa` : player.name}
      >
        <img
          src={player.photoUrl}
          alt={player.name}
          loading="lazy"
          onError={() => setImgError(true)}
          className="w-full h-full object-cover object-top select-none pointer-events-none"
        />
      </div>
    );
  }

  const initials = player.name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('');

  return (
    <div
      role={canInspect ? 'button' : undefined}
      tabIndex={canInspect ? 0 : undefined}
      onClick={canInspect ? handleInspectClick : undefined}
      onKeyDown={
        canInspect
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                e.stopPropagation();
                soundEngine.playClick();
                if (isFullPlayer(player)) {
                  if (onClickInspect) onClickInspect(player, club);
                  else inspection?.inspectPlayer(player, club);
                }
              }
            }
          : undefined
      }
      className={`inline-flex items-center justify-center shrink-0 rounded-full font-black border border-white/15 shadow-xs select-none ${sizeCls} ${interactiveCls} ${className}`}
      style={{
        backgroundColor: clubPrimaryColor || club?.colors.primary || '#1e293b',
        color: clubTextColor || club?.colors.text || '#e2e8f0',
      }}
      title={canInspect ? `${player.name} · Ver ficha completa` : player.name}
    >
      {showNumberFallback && player.squadNumber ? player.squadNumber : initials || 'AT'}
    </div>
  );
};
