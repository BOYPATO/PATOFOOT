import { Club, PendingTransferDeal, Player, WatchlistEntry } from '../types/game';
import { findPendingTransferForPlayer } from './transferWindowEngine';

export type WatchlistAvailabilityKind =
  | 'FREE_AGENT'
  | 'BOSMAN'
  | 'LOAN_LISTED'
  | 'UNDER_CONTRACT';

export interface ResolvedWatchlistItem {
  entry: WatchlistEntry;
  player: Player;
  club: Club | null;
  availabilityKind: WatchlistAvailabilityKind;
  pendingDeal?: PendingTransferDeal;
  affordableNow: boolean;
}

export function isPlayerInWatchlist(
  watchlist: WatchlistEntry[] | undefined,
  playerId: string
): boolean {
  if (!watchlist || watchlist.length === 0) return false;
  return watchlist.some((item) => item.playerId === playerId);
}

export function toggleWatchlistEntry(
  watchlist: WatchlistEntry[] | undefined,
  playerId: string,
  currentDate: string
): { updated: WatchlistEntry[]; added: boolean } {
  const list = watchlist || [];
  const exists = list.some((item) => item.playerId === playerId);
  if (exists) {
    return {
      updated: list.filter((item) => item.playerId !== playerId),
      added: false,
    };
  }
  return {
    updated: [{ playerId, addedAt: currentDate }, ...list],
    added: true,
  };
}

export function removeWatchlistEntry(
  watchlist: WatchlistEntry[] | undefined,
  playerId: string
): WatchlistEntry[] {
  if (!watchlist || watchlist.length === 0) return [];
  return watchlist.filter((item) => item.playerId !== playerId);
}

export function resolveWatchlistItems(params: {
  watchlist: WatchlistEntry[] | undefined;
  allClubs: Club[];
  freeAgents: Player[];
  userClub: Club;
  pendingTransfers?: PendingTransferDeal[];
}): ResolvedWatchlistItem[] {
  const { watchlist, allClubs, freeAgents, userClub, pendingTransfers = [] } = params;
  if (!watchlist || watchlist.length === 0) return [];

  const userPlayerIds = new Set(userClub.squad.map((p) => p.id));

  const playerMap = new Map<string, { player: Player; club: Club | null }>();
  for (const club of allClubs) {
    if (club.id === userClub.id) continue;
    for (const p of club.squad) {
      playerMap.set(p.id, { player: p, club });
    }
  }
  for (const fa of freeAgents) {
    if (!userPlayerIds.has(fa.id)) {
      playerMap.set(fa.id, { player: fa, club: null });
    }
  }

  const results: ResolvedWatchlistItem[] = [];
  const seen = new Set<string>();

  for (const entry of watchlist) {
    if (seen.has(entry.playerId) || userPlayerIds.has(entry.playerId)) continue;
    seen.add(entry.playerId);

    const match = playerMap.get(entry.playerId);
    if (!match) continue;

    const { player, club } = match;
    const isBosman =
      Boolean(club) &&
      (player.contractYears || 2) <= 1 &&
      !player.isLoan &&
      !player.retiringAtSeasonEnd;
    const isLoanCandidate =
      Boolean(club) &&
      !player.isLoan &&
      (Boolean(player.isListedForLoan) || (!player.isStarter && player.age <= 23));

    const availabilityKind: WatchlistAvailabilityKind = !club
      ? 'FREE_AGENT'
      : isBosman
      ? 'BOSMAN'
      : isLoanCandidate
      ? 'LOAN_LISTED'
      : 'UNDER_CONTRACT';

    const estimatedUpfrontCost = !club
      ? 0
      : isBosman
      ? 0
      : player.marketValue || 0;

    results.push({
      entry,
      player,
      club,
      availabilityKind,
      pendingDeal: findPendingTransferForPlayer(pendingTransfers, player.id),
      affordableNow: userClub.finances.balance >= estimatedUpfrontCost,
    });
  }

  return results;
}
