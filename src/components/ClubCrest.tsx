import React, { useEffect, useState } from 'react';
import { Club } from '../types/game';
import { CompetitionMeta } from '../utils/competitionsEngine';

interface ClubCrestProps {
  club?: Pick<Club, 'name' | 'shortName' | 'initials' | 'colors' | 'logoUrl'> | null;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  className?: string;
  rounded?: 'md' | 'lg' | 'xl' | '2xl' | 'full';
}

const SIZE_CLASSES: Record<NonNullable<ClubCrestProps['size']>, string> = {
  xs: 'w-5 h-5 text-[9px]',
  sm: 'w-7 h-7 text-[10px]',
  md: 'w-9 h-9 text-xs',
  lg: 'w-12 h-12 text-sm',
  xl: 'w-16 h-16 text-lg',
  '2xl': 'w-20 h-20 text-xl',
};

const IMG_PADDING: Record<NonNullable<ClubCrestProps['size']>, string> = {
  xs: 'p-0.5',
  sm: 'p-0.5',
  md: 'p-1',
  lg: 'p-1',
  xl: 'p-1.5',
  '2xl': 'p-2',
};

const ROUNDED_CLASSES: Record<NonNullable<ClubCrestProps['rounded']>, string> = {
  md: 'rounded-md',
  lg: 'rounded-lg',
  xl: 'rounded-xl',
  '2xl': 'rounded-2xl',
  full: 'rounded-full',
};

export const ClubCrest: React.FC<ClubCrestProps> = ({
  club,
  size = 'md',
  className = '',
  rounded = 'xl',
}) => {
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    setImgError(false);
  }, [club?.logoUrl]);

  const sizeCls = SIZE_CLASSES[size];
  const roundedCls = ROUNDED_CLASSES[rounded];

  if (!club) {
    return (
      <div
        className={`inline-flex items-center justify-center shrink-0 font-black bg-slate-800 text-slate-400 border border-slate-700 ${sizeCls} ${roundedCls} ${className}`}
      >
        ?
      </div>
    );
  }

  if (club.logoUrl && !imgError) {
    return (
      <div
        className={`inline-flex items-center justify-center shrink-0 bg-white/95 border border-white/20 shadow-sm overflow-hidden ${sizeCls} ${IMG_PADDING[size]} ${roundedCls} ${className}`}
        title={club.shortName || club.name}
      >
        <img
          src={club.logoUrl}
          alt={club.shortName || club.name}
          loading="lazy"
          onError={() => setImgError(true)}
          className="w-full h-full object-contain select-none pointer-events-none drop-shadow-xs"
        />
      </div>
    );
  }

  return (
    <div
      className={`inline-flex items-center justify-center shrink-0 font-black tracking-tight shadow-sm border border-white/15 select-none ${sizeCls} ${roundedCls} ${className}`}
      style={{
        backgroundColor: club.colors?.primary || '#1e293b',
        color: club.colors?.text || '#ffffff',
      }}
      title={club.shortName || club.name}
    >
      {club.initials || club.shortName?.slice(0, 3).toUpperCase() || 'CLB'}
    </div>
  );
};

interface CompetitionCrestProps {
  meta?: Pick<CompetitionMeta, 'name' | 'shortName' | 'badgeEmoji' | 'primaryColor'> & {
    logoUrl?: string;
  };
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const COMP_SIZE_CLASSES: Record<NonNullable<CompetitionCrestProps['size']>, string> = {
  xs: 'w-5 h-5 text-xs',
  sm: 'w-7 h-7 text-sm',
  md: 'w-9 h-9 text-base',
  lg: 'w-12 h-12 text-xl',
  xl: 'w-14 h-14 text-2xl',
};

export const CompetitionCrest: React.FC<CompetitionCrestProps> = ({
  meta,
  size = 'md',
  className = '',
}) => {
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    setImgError(false);
  }, [meta?.logoUrl]);

  const sizeCls = COMP_SIZE_CLASSES[size];

  if (!meta) return null;

  if (meta.logoUrl && !imgError) {
    return (
      <div
        className={`inline-flex items-center justify-center shrink-0 bg-white/95 rounded-xl p-1 border border-white/20 shadow-sm overflow-hidden ${sizeCls} ${className}`}
        title={meta.name}
      >
        <img
          src={meta.logoUrl}
          alt={meta.shortName || meta.name}
          loading="lazy"
          onError={() => setImgError(true)}
          className="w-full h-full object-contain select-none pointer-events-none"
        />
      </div>
    );
  }

  return (
    <div
      className={`inline-flex items-center justify-center shrink-0 rounded-xl bg-slate-800/90 border border-slate-700/80 ${sizeCls} ${className}`}
      title={meta.name}
    >
      <span>{meta.badgeEmoji}</span>
    </div>
  );
};
