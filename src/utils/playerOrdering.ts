import { DetailedRole, Player } from '../types/game';

/**
 * Canonical squad/market position order:
 * Goleiro -> Laterais -> Zagueiros -> Meio-campo (VOL, MEI) -> Atacantes
 */
export const CANONICAL_ROLE_LIST: readonly DetailedRole[] = [
  'GOL',
  'LAT',
  'ZAG',
  'VOL',
  'MEI',
  'ATA',
] as const;

export const CANONICAL_ROLE_ORDER: Record<DetailedRole, number> = {
  GOL: 0,
  LAT: 1,
  ZAG: 2,
  VOL: 3,
  MEI: 4,
  ATA: 5,
};

export type CanonicalPositionFilter =
  | 'ALL'
  | 'GOL'
  | 'LAT'
  | 'ZAG'
  | 'MEIO'
  | 'VOL'
  | 'MEI'
  | 'ATA';

export const CANONICAL_SECTOR_FILTER_OPTIONS: ReadonlyArray<{
  id: 'ALL' | 'GOL' | 'LAT' | 'ZAG' | 'MEIO' | 'ATA';
  label: string;
  shortLabel: string;
}> = [
  { id: 'ALL', label: 'Todos', shortLabel: 'Todos' },
  { id: 'GOL', label: 'Goleiros', shortLabel: 'GOL' },
  { id: 'LAT', label: 'Laterais', shortLabel: 'LAT' },
  { id: 'ZAG', label: 'Zagueiros', shortLabel: 'ZAG' },
  { id: 'MEIO', label: 'Meio-campo', shortLabel: 'MEI' },
  { id: 'ATA', label: 'Atacantes', shortLabel: 'ATA' },
] as const;

export const CANONICAL_ROLE_FILTER_OPTIONS: ReadonlyArray<{
  id: 'ALL' | DetailedRole;
  label: string;
}> = [
  { id: 'ALL', label: 'Todas as Posições' },
  { id: 'GOL', label: 'Goleiro (GOL)' },
  { id: 'LAT', label: 'Lateral (LAT)' },
  { id: 'ZAG', label: 'Zagueiro (ZAG)' },
  { id: 'VOL', label: 'Volante (VOL)' },
  { id: 'MEI', label: 'Meia (MEI)' },
  { id: 'ATA', label: 'Atacante (ATA)' },
] as const;

export const ROLE_FULL_LABEL_PT: Record<DetailedRole, string> = {
  GOL: 'Goleiro',
  LAT: 'Lateral / Ala',
  ZAG: 'Zagueiro',
  VOL: 'Volante',
  MEI: 'Meia',
  ATA: 'Atacante / Ponta',
};

export function getCanonicalRoleRank(role: DetailedRole | string | undefined): number {
  if (!role) return 99;
  return CANONICAL_ROLE_ORDER[role as DetailedRole] ?? 99;
}

export function matchesCanonicalPositionFilter(
  player: Pick<Player, 'detailedRole'>,
  filter: CanonicalPositionFilter | string
): boolean {
  if (!filter || filter === 'ALL') return true;
  if (filter === 'MEIO') {
    return player.detailedRole === 'VOL' || player.detailedRole === 'MEI';
  }
  if (filter === 'GK') return player.detailedRole === 'GOL';
  if (filter === 'DF') return player.detailedRole === 'LAT' || player.detailedRole === 'ZAG';
  if (filter === 'MF') return player.detailedRole === 'VOL' || player.detailedRole === 'MEI';
  if (filter === 'FW') return player.detailedRole === 'ATA';
  return player.detailedRole === filter;
}

export function getSectorGroupFromRole(
  role: DetailedRole
): 'GOL' | 'LAT' | 'ZAG' | 'MEIO' | 'ATA' {
  if (role === 'GOL') return 'GOL';
  if (role === 'LAT') return 'LAT';
  if (role === 'ZAG') return 'ZAG';
  if (role === 'VOL' || role === 'MEI') return 'MEIO';
  return 'ATA';
}

export function comparePlayersByPosition(
  a: Pick<Player, 'detailedRole' | 'overall' | 'name' | 'isStarter' | 'isSubstitute'>,
  b: Pick<Player, 'detailedRole' | 'overall' | 'name' | 'isStarter' | 'isSubstitute'>,
  options?: {
    ascending?: boolean;
    prioritizeStarters?: boolean;
  }
): number {
  const asc = options?.ascending ?? true;
  const rankA = getCanonicalRoleRank(a.detailedRole);
  const rankB = getCanonicalRoleRank(b.detailedRole);
  if (rankA !== rankB) {
    return asc ? rankA - rankB : rankB - rankA;
  }

  if (options?.prioritizeStarters) {
    const tierA = a.isStarter ? 2 : a.isSubstitute ? 1 : 0;
    const tierB = b.isStarter ? 2 : b.isSubstitute ? 1 : 0;
    if (tierA !== tierB) return tierB - tierA;
  }

  if (b.overall !== a.overall) {
    return b.overall - a.overall;
  }

  return a.name.localeCompare(b.name, 'pt-BR');
}
