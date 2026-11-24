import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import {
  Club,
  CompetitionType,
  Player,
} from '../types/game';
import {
  Search,
  X,
  Users,
  Shield,
  Trophy,
  ArrowUpRight,
  ShoppingBag,
  Clock,
  Trash2,
  Bookmark,
  BookmarkCheck,
} from 'lucide-react';
import { soundEngine } from '../services/soundEngine';
import { PlayerAvatar } from './PlayerAvatar';
import { comparePlayersByPosition } from '../utils/playerOrdering';
import { usePlayerInspection } from '../context/PlayerInspectionContext';
import { COMPETITIONS_CATALOG, CompetitionMeta } from '../utils/competitionsEngine';
import {
  SOUTH_AMERICAN_LEAGUES_META,
  isSouthAmericanLeague,
  getClubSouthAmericanLeagueId,
} from '../utils/southAmericaLeaguesEngine';
import {
  EUROPEAN_LEAGUES_META,
  isEuropeanLeague,
  isUefaContinental,
  getClubEuropeanLeagueId,
} from '../utils/europeLeaguesEngine';
import {
  WORLD_LEAGUES_META,
  isWorldLeague,
  isWorldInternational,
  getClubWorldLeagueId,
} from '../utils/worldLeaguesEngine';
import { getClubSectorRatings } from '../utils/clubRatingsEngine';
import { formatEuropeanSeason } from '../utils/calendarUtils';
import { resolvePlayerNationality } from '../utils/nationalityUtils';

type SearchTabFilter = 'ALL' | 'PLAYERS' | 'CLUBS' | 'COMPETITIONS';

const RECENT_SEARCHES_STORAGE_KEY = 'brasfoot_recent_global_searches_v1';
const MAX_RECENT_SEARCHES = 5;

interface RecentSearchRecord {
  id: string;
  kind: 'PLAYER' | 'CLUB' | 'COMPETITION';
  title: string;
  subtitle: string;
  badgeText: string;
  badgeBg?: string;
  badgeColor?: string;
  compId?: CompetitionType;
  clubId?: string;
  playerId?: string;
  playerName?: string;
  savedAt: number;
}

interface PlayerSearchEntry {
  kind: 'PLAYER';
  key: string;
  player: Player;
  club?: Club;
  isUserPlayer: boolean;
  isFreeAgent: boolean;
  nationality: string;
  normalizedSearchText: string;
  normalizedName: string;
}

interface ClubSearchEntry {
  kind: 'CLUB';
  key: string;
  club: Club;
  overall: number;
  leagueLabel: string;
  country: string;
  normalizedSearchText: string;
  normalizedName: string;
}

interface CompetitionSearchEntry {
  kind: 'COMPETITION';
  key: string;
  compId: CompetitionType;
  meta: CompetitionMeta;
  regionLabel: string;
  seasonLabel: string;
  normalizedSearchText: string;
  normalizedName: string;
}

type UnifiedSearchResult = PlayerSearchEntry | ClubSearchEntry | CompetitionSearchEntry;

interface ResolvedRecentItem {
  record: RecentSearchRecord;
  liveEntry?: UnifiedSearchResult;
}

interface GlobalSearchModalProps {
  isOpen: boolean;
  userClub: Club;
  allClubs: Club[];
  freeAgents: Player[];
  seasonYear: number;
  europeSeasonYear?: number;
  saSeasonYear?: number;
  onClose: () => void;
  onSelectClub: (clubId: string) => void;
  onSelectPlayerInClub: (clubId: string, playerId: string) => void;
  onSelectUserPlayer: (playerId: string) => void;
  onSelectFreeAgent: (playerName: string) => void;
  onSelectCompetition: (compId: CompetitionType) => void;
  watchlistPlayerIds?: string[];
  onToggleWatchlistPlayer?: (playerId: string) => void;
  onOpenWatchlist?: () => void;
}

function normalizeText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function loadRecentSearchesFromStorage(): RecentSearchRecord[] {
  try {
    const raw = window.localStorage.getItem(RECENT_SEARCHES_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (item): item is RecentSearchRecord =>
          Boolean(
            item &&
              typeof item === 'object' &&
              typeof item.id === 'string' &&
              typeof item.title === 'string' &&
              (item.kind === 'PLAYER' || item.kind === 'CLUB' || item.kind === 'COMPETITION')
          )
      )
      .slice(0, MAX_RECENT_SEARCHES);
  } catch {
    return [];
  }
}

function saveRecentSearchesToStorage(records: RecentSearchRecord[]): void {
  try {
    window.localStorage.setItem(
      RECENT_SEARCHES_STORAGE_KEY,
      JSON.stringify(records.slice(0, MAX_RECENT_SEARCHES))
    );
  } catch {
    // Ignore storage quota or private mode restrictions silently
  }
}

function buildRecentRecordFromEntry(item: UnifiedSearchResult): RecentSearchRecord {
  const now = Date.now();
  if (item.kind === 'COMPETITION') {
    return {
      id: `COMP:${item.compId}`,
      kind: 'COMPETITION',
      title: item.meta.name,
      subtitle: `Competição · ${item.regionLabel} · Edição ${item.seasonLabel}`,
      badgeText: item.meta.shortName.slice(0, 3).toUpperCase(),
      badgeBg: `${item.meta.primaryColor}22`,
      badgeColor: item.meta.primaryColor,
      compId: item.compId,
      savedAt: now,
    };
  }

  if (item.kind === 'CLUB') {
    return {
      id: `CLUB:${item.club.id}`,
      kind: 'CLUB',
      title: item.club.name,
      subtitle: `${item.leagueLabel} · ${item.country}`,
      badgeText: item.club.initials,
      badgeBg: item.club.colors.primary,
      badgeColor: item.club.colors.text,
      clubId: item.club.id,
      savedAt: now,
    };
  }

  const clubSubtitle = item.isUserPlayer
    ? `${item.club?.shortName || userFallbackLabel(item)} (Seu Elenco)`
    : item.club
    ? item.club.name
    : 'Livre no Mercado';

  return {
    id: `PLAYER:${item.player.id}:${normalizeText(item.player.name)}`,
    kind: 'PLAYER',
    title: item.player.name,
    subtitle: `${item.player.detailedRole} · ${item.player.age} anos · ${clubSubtitle}`,
    badgeText: item.club ? item.club.initials : 'LIV',
    badgeBg: item.club ? item.club.colors.primary : undefined,
    badgeColor: item.club ? item.club.colors.text : undefined,
    clubId: item.club?.id,
    playerId: item.player.id,
    playerName: item.player.name,
    savedAt: now,
  };
}

function userFallbackLabel(item: PlayerSearchEntry): string {
  return item.club?.name || 'Clube';
}

const ROLE_KEYWORDS: Record<string, string> = {
  GOL: 'gol goleiro guarda-redes',
  ZAG: 'zag zagueiro defensor central',
  LAT: 'lat lateral ala direito esquerdo',
  VOL: 'vol volante meio-campista trinco',
  MEI: 'mei meia armador meio-campo camisa 10',
  PON: 'pon ponta extremo atacante beirada',
  ATA: 'ata atacante centroavante artilheiro camisa 9',
};

function getClubLeagueShortLabel(club: Club): string {
  if (club.id.startsWith('guest_')) return 'Convidado Internacional';
  if (club.division === 'EU') {
    const euId = getClubEuropeanLeagueId(club);
    return euId ? EUROPEAN_LEAGUES_META[euId].shortName : 'UEFA';
  }
  if (club.division === 'SA') {
    const saId = getClubSouthAmericanLeagueId(club);
    return saId ? SOUTH_AMERICAN_LEAGUES_META[saId].shortName : 'América do Sul';
  }
  if (club.division === 'WL') {
    const wlId = getClubWorldLeagueId(club);
    return wlId ? WORLD_LEAGUES_META[wlId].shortName : 'Liga Internacional';
  }
  return `Brasileirão Série ${club.division}`;
}

function formatMoneyCompact(val: number): string {
  if (val >= 1_000_000) {
    const m = val / 1_000_000;
    return `R$ ${m >= 100 ? Math.round(m) : m.toFixed(1).replace('.', ',')}M`;
  }
  if (val >= 1_000) {
    return `R$ ${Math.round(val / 1_000)} mil`;
  }
  return `R$ ${val}`;
}

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({
  isOpen,
  userClub,
  allClubs,
  freeAgents,
  seasonYear,
  europeSeasonYear,
  saSeasonYear,
  onClose,
  onSelectClub,
  onSelectPlayerInClub,
  onSelectUserPlayer,
  onSelectFreeAgent,
  onSelectCompetition,
  watchlistPlayerIds = [],
  onToggleWatchlistPlayer,
  onOpenWatchlist,
}) => {
  const inspection = usePlayerInspection();
  const [query, setQuery] = useState<string>('');
  const [activeFilter, setActiveFilter] = useState<SearchTabFilter>('ALL');
  const [playerSortMode, setPlayerSortMode] = useState<'POS' | 'OVR'>('POS');
  const [highlightedIndex, setHighlightedIndex] = useState<number>(0);
  const [recentSearches, setRecentSearches] = useState<RecentSearchRecord[]>(() =>
    loadRecentSearchesFromStorage()
  );
  const inputRef = useRef<HTMLInputElement | null>(null);
  const watchlistSet = useMemo(() => new Set(watchlistPlayerIds), [watchlistPlayerIds]);

  useEffect(() => {
    if (isOpen) {
      setRecentSearches(loadRecentSearchesFromStorage());
      setHighlightedIndex(0);
      const timer = setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 30);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const recordRecentSelection = useCallback((record: RecentSearchRecord) => {
    setRecentSearches((prev) => {
      const updated = [
        { ...record, savedAt: Date.now() },
        ...prev.filter((r) => r.id !== record.id),
      ].slice(0, MAX_RECENT_SEARCHES);
      saveRecentSearchesToStorage(updated);
      return updated;
    });
  }, []);

  const handleRemoveRecentSearch = useCallback(
    (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      soundEngine.playClick();
      setRecentSearches((prev) => {
        const updated = prev.filter((r) => r.id !== id);
        saveRecentSearchesToStorage(updated);
        return updated;
      });
    },
    []
  );

  const handleClearAllRecentSearches = useCallback(() => {
    soundEngine.playClick();
    setRecentSearches([]);
    try {
      window.localStorage.removeItem(RECENT_SEARCHES_STORAGE_KEY);
    } catch {
      // Ignore storage errors silently
    }
  }, []);

  const euYear = europeSeasonYear ?? seasonYear;
  const southAmYear = saSeasonYear ?? seasonYear;

  // Pre-index players, clubs, and competitions while modal is open
  const { playerIndex, clubIndex, competitionIndex } = useMemo(() => {
    if (!isOpen) {
      return {
        playerIndex: [] as PlayerSearchEntry[],
        clubIndex: [] as ClubSearchEntry[],
        competitionIndex: [] as CompetitionSearchEntry[],
      };
    }

    const clubsEntries: ClubSearchEntry[] = allClubs.map((club) => {
      const ovr = getClubSectorRatings(club).overall;
      const leagueLabel = getClubLeagueShortLabel(club);
      const country = club.country || 'Brasil';
      const normalizedName = normalizeText(`${club.name} ${club.shortName}`);
      const normalizedSearchText = normalizeText(
        `${club.name} ${club.shortName} ${club.initials} ${country} ${club.state || ''} ${leagueLabel} ${club.stadium.name} ${club.managerName}`
      );
      return {
        kind: 'CLUB',
        key: `club_${club.id}`,
        club,
        overall: ovr,
        leagueLabel,
        country,
        normalizedSearchText,
        normalizedName,
      };
    });

    clubsEntries.sort((a, b) => b.overall - a.overall || a.club.name.localeCompare(b.club.name, 'pt-BR'));

    const playersEntries: PlayerSearchEntry[] = [];
    for (const club of allClubs) {
      const clubCountry = club.country || 'Brasil';
      const isUserClub = club.id === userClub.id;
      for (const player of club.squad) {
        const nat = resolvePlayerNationality(player, clubCountry);
        const roleWords = ROLE_KEYWORDS[player.detailedRole] || player.detailedRole;
        const normalizedName = normalizeText(player.name);
        const normalizedSearchText = normalizeText(
          `${player.name} ${roleWords} ${nat} ${club.name} ${club.shortName}`
        );
        playersEntries.push({
          kind: 'PLAYER',
          key: `pl_${club.id}_${player.id}`,
          player,
          club,
          isUserPlayer: isUserClub,
          isFreeAgent: false,
          nationality: nat,
          normalizedSearchText,
          normalizedName,
        });
      }
    }

    for (const fa of freeAgents) {
      const nat = resolvePlayerNationality(fa, fa.nationality || 'Brasil');
      const roleWords = ROLE_KEYWORDS[fa.detailedRole] || fa.detailedRole;
      const normalizedName = normalizeText(fa.name);
      const normalizedSearchText = normalizeText(
        `${fa.name} ${roleWords} ${nat} livre sem clube free agent`
      );
      playersEntries.push({
        kind: 'PLAYER',
        key: `fa_${fa.id}`,
        player: fa,
        club: undefined,
        isUserPlayer: false,
        isFreeAgent: true,
        nationality: nat,
        normalizedSearchText,
        normalizedName,
      });
    }

    playersEntries.sort(
      (a, b) => b.player.overall - a.player.overall || (b.player.marketValue || 0) - (a.player.marketValue || 0)
    );

    const compIds = Object.keys(COMPETITIONS_CATALOG) as CompetitionType[];
    const compsEntries: CompetitionSearchEntry[] = compIds.map((compId) => {
      const meta = COMPETITIONS_CATALOG[compId];
      const isEu = isEuropeanLeague(compId);
      const isUefa = isUefaContinental(compId);
      const isSa = isSouthAmericanLeague(compId);
      const isWl = isWorldLeague(compId);
      const isWorldInt = isWorldInternational(compId);

      const regionLabel = isEu
        ? EUROPEAN_LEAGUES_META[compId].country
        : isUefa || compId === 'uefa_supercup'
        ? 'Europa · UEFA'
        : isSa
        ? SOUTH_AMERICAN_LEAGUES_META[compId].country
        : isWl
        ? `${WORLD_LEAGUES_META[compId].country} · ${WORLD_LEAGUES_META[compId].macroRegionLabel}`
        : isWorldInt
        ? 'Norte, Ásia & África · FIFA'
        : meta.category === 'continental'
        ? 'América do Sul · CONMEBOL'
        : meta.category === 'world'
        ? 'Mundial · FIFA'
        : 'Brasil';

      const seasonLabel = isEu || isUefa || compId === 'uefa_supercup' ? formatEuropeanSeason(euYear) : String(southAmYear);
      const normalizedName = normalizeText(`${meta.name} ${meta.shortName}`);
      const normalizedSearchText = normalizeText(
        `${meta.name} ${meta.shortName} ${regionLabel} ${meta.formatSummary} ${meta.description}`
      );

      return {
        kind: 'COMPETITION',
        key: `comp_${compId}`,
        compId,
        meta,
        regionLabel,
        seasonLabel,
        normalizedSearchText,
        normalizedName,
      };
    });

    return {
      playerIndex: playersEntries,
      clubIndex: clubsEntries,
      competitionIndex: compsEntries,
    };
  }, [isOpen, allClubs, freeAgents, userClub.id, euYear, southAmYear]);

  const normalizedQuery = useMemo(() => normalizeText(query), [query]);
  const queryTokens = useMemo(
    () => (normalizedQuery ? normalizedQuery.split(/\s+/).filter(Boolean) : []),
    [normalizedQuery]
  );

  // Resolve recent searches against live game index and filter by active tab
  const visibleRecentItems: ResolvedRecentItem[] = useMemo(() => {
    if (queryTokens.length > 0 || recentSearches.length === 0) return [];

    return recentSearches
      .filter((rec) => {
        if (activeFilter === 'PLAYERS') return rec.kind === 'PLAYER';
        if (activeFilter === 'CLUBS') return rec.kind === 'CLUB';
        if (activeFilter === 'COMPETITIONS') return rec.kind === 'COMPETITION';
        return true;
      })
      .slice(0, MAX_RECENT_SEARCHES)
      .map((record) => {
        let liveEntry: UnifiedSearchResult | undefined;
        if (record.kind === 'COMPETITION' && record.compId) {
          liveEntry = competitionIndex.find((c) => c.compId === record.compId);
        } else if (record.kind === 'CLUB' && record.clubId) {
          liveEntry = clubIndex.find((c) => c.club.id === record.clubId);
        } else if (record.kind === 'PLAYER') {
          liveEntry =
            (record.playerId
              ? playerIndex.find((p) => p.player.id === record.playerId)
              : undefined) ||
            playerIndex.find(
              (p) => normalizeText(p.player.name) === normalizeText(record.playerName || record.title)
            );
        }
        return { record, liveEntry };
      });
  }, [
    queryTokens.length,
    recentSearches,
    activeFilter,
    competitionIndex,
    clubIndex,
    playerIndex,
  ]);

  const { matchedPlayers, matchedClubs, matchedCompetitions } = useMemo(() => {
    if (queryTokens.length === 0) {
      const topPlayers = playerIndex.slice(0, 24);
      if (playerSortMode === 'POS') {
        topPlayers.sort((a, b) => comparePlayersByPosition(a.player, b.player));
      }
      return {
        matchedPlayers: topPlayers,
        matchedClubs: clubIndex.slice(0, 18),
        matchedCompetitions: competitionIndex.slice(0, 16),
      };
    }

    const scoreMatch = (normalizedName: string, fullText: string): number => {
      for (const tok of queryTokens) {
        if (!fullText.includes(tok)) return -1;
      }
      if (normalizedName === normalizedQuery) return 1000;
      if (normalizedName.startsWith(normalizedQuery)) return 750;
      if (normalizedName.includes(normalizedQuery)) return 500;
      return 100;
    };

    const pMatches: Array<{ item: PlayerSearchEntry; score: number }> = [];
    for (const item of playerIndex) {
      const s = scoreMatch(item.normalizedName, item.normalizedSearchText);
      if (s > 0) {
        pMatches.push({ item, score: s + item.player.overall });
      }
    }
    if (playerSortMode === 'POS') {
      pMatches.sort((a, b) => {
        const tierA = Math.floor(a.score / 250);
        const tierB = Math.floor(b.score / 250);
        if (tierA !== tierB) return tierB - tierA;
        return comparePlayersByPosition(a.item.player, b.item.player);
      });
    } else {
      pMatches.sort((a, b) => b.score - a.score);
    }

    const cMatches: Array<{ item: ClubSearchEntry; score: number }> = [];
    for (const item of clubIndex) {
      const s = scoreMatch(item.normalizedName, item.normalizedSearchText);
      if (s > 0) {
        cMatches.push({ item, score: s + item.overall });
      }
    }
    cMatches.sort((a, b) => b.score - a.score);

    const compMatches: Array<{ item: CompetitionSearchEntry; score: number }> = [];
    for (const item of competitionIndex) {
      const s = scoreMatch(item.normalizedName, item.normalizedSearchText);
      if (s > 0) {
        compMatches.push({ item, score: s });
      }
    }
    compMatches.sort((a, b) => b.score - a.score);

    return {
      matchedPlayers: pMatches.slice(0, 50).map((m) => m.item),
      matchedClubs: cMatches.slice(0, 40).map((m) => m.item),
      matchedCompetitions: compMatches.slice(0, 35).map((m) => m.item),
    };
  }, [queryTokens, normalizedQuery, playerIndex, clubIndex, competitionIndex, playerSortMode]);

  const visibleResults: UnifiedSearchResult[] = useMemo(() => {
    if (activeFilter === 'PLAYERS') return matchedPlayers;
    if (activeFilter === 'CLUBS') return matchedClubs;
    if (activeFilter === 'COMPETITIONS') return matchedCompetitions;

    if (queryTokens.length === 0) {
      return [
        ...matchedCompetitions.slice(0, 4),
        ...matchedClubs.slice(0, 5),
        ...matchedPlayers.slice(0, 8),
      ];
    }

    return [
      ...matchedCompetitions.slice(0, 6),
      ...matchedClubs.slice(0, 8),
      ...matchedPlayers.slice(0, 18),
    ];
  }, [activeFilter, matchedPlayers, matchedClubs, matchedCompetitions, queryTokens.length]);

  const totalNavigableCount = visibleRecentItems.length + visibleResults.length;

  useEffect(() => {
    setHighlightedIndex(0);
  }, [normalizedQuery, activeFilter]);

  const executeSelection = (item: UnifiedSearchResult) => {
    soundEngine.playClick();
    recordRecentSelection(buildRecentRecordFromEntry(item));
    onClose();
    if (item.kind === 'COMPETITION') {
      onSelectCompetition(item.compId);
      return;
    }
    if (item.kind === 'CLUB') {
      onSelectClub(item.club.id);
      return;
    }
    if (item.isUserPlayer) {
      onSelectUserPlayer(item.player.id);
      return;
    }
    if (item.isFreeAgent || !item.club) {
      onSelectFreeAgent(item.player.name);
      return;
    }
    onSelectPlayerInClub(item.club.id, item.player.id);
  };

  const executeRecentSelection = (recent: ResolvedRecentItem) => {
    if (recent.liveEntry) {
      executeSelection(recent.liveEntry);
      return;
    }
    soundEngine.playClick();
    recordRecentSelection(recent.record);
    if (recent.record.kind === 'COMPETITION' && recent.record.compId) {
      onClose();
      onSelectCompetition(recent.record.compId);
      return;
    }
    if (recent.record.kind === 'CLUB' && recent.record.clubId) {
      onClose();
      onSelectClub(recent.record.clubId);
      return;
    }
    // Fallback if a player from a previous career save no longer exists in this save: fill search bar
    setQuery(recent.record.title);
    inputRef.current?.focus();
  };

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setHighlightedIndex((prev) =>
          totalNavigableCount > 0 ? (prev + 1) % totalNavigableCount : 0
        );
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setHighlightedIndex((prev) =>
          totalNavigableCount > 0
            ? (prev - 1 + totalNavigableCount) % totalNavigableCount
            : 0
        );
      } else if (e.key === 'Enter' && totalNavigableCount > 0) {
        e.preventDefault();
        if (highlightedIndex < visibleRecentItems.length) {
          executeRecentSelection(visibleRecentItems[highlightedIndex]);
        } else {
          const resultIdx = highlightedIndex - visibleRecentItems.length;
          if (visibleResults[resultIdx]) {
            executeSelection(visibleResults[resultIdx]);
          }
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  if (!isOpen) return null;

  const totalMatchesCount =
    matchedPlayers.length + matchedClubs.length + matchedCompetitions.length;

  const renderSearchResultRow = (
    item: UnifiedSearchResult,
    navIndex: number,
    keyPrefix: string = ''
  ) => {
    const isHighlighted = navIndex === highlightedIndex;

    if (item.kind === 'COMPETITION') {
      return (
        <div
          key={`${keyPrefix}${item.key}`}
          onMouseEnter={() => setHighlightedIndex(navIndex)}
          onClick={() => executeSelection(item)}
          className={`px-4 sm:px-5 py-3 flex items-center justify-between gap-3 cursor-pointer transition-colors ${
            isHighlighted ? 'bg-slate-800/70' : 'hover:bg-slate-900/60'
          }`}
        >
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center text-base border border-white/10 shrink-0"
              style={{ backgroundColor: `${item.meta.primaryColor}22` }}
            >
              <Trophy
                className="w-4 h-4"
                style={{ color: item.meta.primaryColor }}
              />
            </div>
            <div className="min-w-0">
              <div className="text-sm font-bold text-white truncate">
                {item.meta.name}
              </div>
              <div className="text-xs text-slate-400 truncate flex items-center gap-1.5 mt-0.5">
                <span>Competição</span>
                <span aria-hidden="true">·</span>
                <span>{item.regionLabel}</span>
                <span aria-hidden="true">·</span>
                <span className="font-mono tabular-nums text-sky-300">
                  Edição {item.seasonLabel}
                </span>
                <span className="hidden sm:inline" aria-hidden="true">
                  ·
                </span>
                <span className="hidden sm:inline truncate">
                  {item.meta.formatSummary}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 text-xs font-semibold text-sky-400 shrink-0">
            <span className="hidden sm:inline">Ver Tabela</span>
            <ArrowUpRight className="w-4 h-4" />
          </div>
        </div>
      );
    }

    if (item.kind === 'CLUB') {
      const isMine = item.club.id === userClub.id;
      return (
        <div
          key={`${keyPrefix}${item.key}`}
          onMouseEnter={() => setHighlightedIndex(navIndex)}
          onClick={() => executeSelection(item)}
          className={`px-4 sm:px-5 py-3 flex items-center justify-between gap-3 cursor-pointer transition-colors ${
            isHighlighted ? 'bg-slate-800/70' : 'hover:bg-slate-900/60'
          }`}
        >
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center font-black text-xs border border-white/15 shrink-0"
              style={{
                backgroundColor: item.club.colors.primary,
                color: item.club.colors.text,
              }}
            >
              {item.club.initials}
            </div>
            <div className="min-w-0">
              <div className="text-sm font-bold text-white truncate">
                {item.club.name}
                {isMine ? ' (Seu Clube)' : ''}
              </div>
              <div className="text-xs text-slate-400 truncate flex items-center gap-1.5 mt-0.5">
                <span>{item.leagueLabel}</span>
                <span aria-hidden="true">·</span>
                <span>{item.country}</span>
                <span aria-hidden="true">·</span>
                <span className="hidden sm:inline">
                  Téc. {item.club.managerName}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="text-right font-mono tabular-nums">
              <div className="text-xs font-bold text-emerald-400">
                OVR {item.overall}
              </div>
              <div className="text-[11px] text-slate-400">
                {item.club.squad.length} atletas
              </div>
            </div>
            <ArrowUpRight className="w-4 h-4 text-slate-400" />
          </div>
        </div>
      );
    }

    // PLAYER ROW
    return (
      <div
        key={`${keyPrefix}${item.key}`}
        onMouseEnter={() => setHighlightedIndex(navIndex)}
        onClick={() => executeSelection(item)}
        className={`px-4 sm:px-5 py-3 flex items-center justify-between gap-3 cursor-pointer transition-colors ${
          isHighlighted ? 'bg-slate-800/70' : 'hover:bg-slate-900/60'
        }`}
      >
        <div className="flex items-center gap-3 min-w-0">
          <PlayerAvatar
            player={item.player}
            club={item.club ?? null}
            clubPrimaryColor={item.club?.colors.primary}
            clubTextColor={item.club?.colors.text}
            size="sm"
            onClickInspect={(p, c) => {
              recordRecentSelection(buildRecentRecordFromEntry(item));
              onClose();
              inspection?.inspectPlayer(p, c ?? null);
            }}
          />

          <div className="min-w-0">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                soundEngine.playClick();
                recordRecentSelection(buildRecentRecordFromEntry(item));
                onClose();
                inspection?.inspectPlayer(item.player, item.club ?? null);
              }}
              className="text-sm font-bold text-white hover:text-sky-300 transition-colors truncate block text-left cursor-pointer max-w-full"
            >
              {item.player.name}
            </button>
            <div className="text-xs text-slate-400 truncate flex items-center gap-1.5 mt-0.5">
              <span className="font-semibold text-sky-300">
                {item.player.detailedRole}
              </span>
              <span aria-hidden="true">·</span>
              <span className="font-mono tabular-nums">
                {item.player.age} anos
              </span>
              <span aria-hidden="true">·</span>
              <span>{item.nationality}</span>
              <span aria-hidden="true">·</span>
              <span className="truncate text-slate-300">
                {item.isUserPlayer
                  ? `${item.club?.shortName} (Seu Elenco)`
                  : item.club
                  ? item.club.name
                  : 'Livre no Mercado'}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div className="text-right font-mono tabular-nums">
            <div className="text-xs font-bold text-emerald-400">
              OVR {item.player.overall}
            </div>
            <div className="text-[11px] text-slate-400">
              {item.isFreeAgent
                ? 'Sem Custo'
                : formatMoneyCompact(item.player.marketValue || 0)}
            </div>
          </div>

          {!item.isUserPlayer && onToggleWatchlistPlayer && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                soundEngine.playClick();
                onToggleWatchlistPlayer(item.player.id);
              }}
              title={
                watchlistSet.has(item.player.id)
                  ? 'Remover da Lista de Observação'
                  : 'Guardar na Lista de Observação'
              }
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-[11px] font-bold transition-colors cursor-pointer whitespace-nowrap ${
                watchlistSet.has(item.player.id)
                  ? 'bg-amber-400/15 border-amber-400/50 text-amber-300 hover:bg-rose-950/60 hover:border-rose-500/50 hover:text-rose-200'
                  : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200 hover:border-amber-400/50 hover:text-amber-200'
              }`}
            >
              {watchlistSet.has(item.player.id) ? (
                <BookmarkCheck className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              ) : (
                <Bookmark className="w-3.5 h-3.5 shrink-0" />
              )}
              <span className="hidden sm:inline">
                {watchlistSet.has(item.player.id) ? 'Na Lista' : 'Observar'}
              </span>
            </button>
          )}

          {!item.isUserPlayer && !item.isFreeAgent && item.club && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                soundEngine.playClick();
                recordRecentSelection(buildRecentRecordFromEntry(item));
                onClose();
                onSelectFreeAgent(item.player.name);
              }}
              title="Buscar este atleta no Mercado da Bola"
              className="hidden sm:flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-[11px] font-semibold text-slate-200 transition-colors cursor-pointer"
            >
              <ShoppingBag className="w-3 h-3 text-sky-400" />
              <span>Mercado</span>
            </button>
          )}

          <ArrowUpRight className="w-4 h-4 text-slate-400" />
        </div>
      </div>
    );
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-start justify-center p-2 sm:p-6 pt-8 sm:pt-14 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl bg-[#0b1220] border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[86vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Search Input Bar */}
        <div className="px-4 sm:px-5 py-3.5 border-b border-slate-800 flex items-center gap-3">
          <Search className="w-5 h-5 text-sky-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Pesquisar jogadores, times, países, posições ou competições..."
            className="flex-1 bg-transparent text-sm sm:text-base text-white placeholder-slate-500 focus:outline-none min-w-0"
          />
          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery('');
                inputRef.current?.focus();
              }}
              title="Limpar busca"
              className="px-2 py-1 text-xs text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              Limpar
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            title="Fechar pesquisa (Esc)"
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Interactive Category Segmented Filter Bar */}
        <div className="px-4 sm:px-5 py-2.5 border-b border-slate-800/80 bg-[#080e1a] flex items-center justify-between gap-3 overflow-x-auto">
          <div className="flex items-center gap-1 p-1 bg-slate-900/90 border border-slate-800 rounded-xl shrink-0">
            <button
              type="button"
              onClick={() => {
                soundEngine.playClick();
                setActiveFilter('ALL');
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                activeFilter === 'ALL'
                  ? 'bg-sky-400 text-slate-950 font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Todos {queryTokens.length > 0 ? `(${totalMatchesCount})` : ''}
            </button>
            <button
              type="button"
              onClick={() => {
                soundEngine.playClick();
                setActiveFilter('PLAYERS');
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                activeFilter === 'PLAYERS'
                  ? 'bg-sky-400 text-slate-950 font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Jogadores {queryTokens.length > 0 ? `(${matchedPlayers.length})` : ''}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                soundEngine.playClick();
                setActiveFilter('CLUBS');
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                activeFilter === 'CLUBS'
                  ? 'bg-sky-400 text-slate-950 font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              <span>Times {queryTokens.length > 0 ? `(${matchedClubs.length})` : ''}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                soundEngine.playClick();
                setActiveFilter('COMPETITIONS');
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                activeFilter === 'COMPETITIONS'
                  ? 'bg-sky-400 text-slate-950 font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Trophy className="w-3.5 h-3.5" />
              <span>Competições {queryTokens.length > 0 ? `(${matchedCompetitions.length})` : ''}</span>
            </button>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => {
                soundEngine.playClick();
                setPlayerSortMode((prev) => (prev === 'POS' ? 'OVR' : 'POS'));
              }}
              title="Alternar ordenação dos jogadores entre Posição (GOL → ATA) e Maior OVR"
              className="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap"
            >
              {playerSortMode === 'POS' ? 'Ordem: GOL → ATA' : 'Ordem: Maior OVR'}
            </button>
            {onOpenWatchlist && (
              <button
                type="button"
                onClick={() => {
                  soundEngine.playClick();
                  onClose();
                  onOpenWatchlist();
                }}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-amber-400/15 hover:bg-amber-400/25 border border-amber-400/40 text-amber-300 text-xs font-bold transition-colors cursor-pointer whitespace-nowrap tabular-nums"
              >
                <Bookmark className="w-3.5 h-3.5 text-amber-400" />
                <span>Lista de Observação ({watchlistSet.size})</span>
              </button>
            )}
            <span className="hidden lg:inline text-xs text-slate-500 whitespace-nowrap">
              {queryTokens.length === 0 ? 'Recentes & destaques' : 'Clique para abrir'}
            </span>
          </div>
        </div>

        {/* Results Scrollable List */}
        <div className="flex-1 min-h-0 overflow-y-auto">
          {/* Buscas Recentes Section (up to 5 items persisted in localStorage) */}
          {queryTokens.length === 0 && visibleRecentItems.length > 0 && (
            <div className="border-b border-slate-800">
              <div className="px-4 sm:px-5 py-2 bg-[#080e1a]/90 border-b border-slate-800/70 flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  <Clock className="w-3.5 h-3.5 text-sky-400" />
                  <span>Buscas Recentes</span>
                  <span className="font-mono tabular-nums text-slate-500">
                    ({visibleRecentItems.length}/{MAX_RECENT_SEARCHES})
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleClearAllRecentSearches}
                  className="flex items-center gap-1 text-[11px] font-semibold text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Limpar histórico</span>
                </button>
              </div>

              <div className="divide-y divide-slate-800/70">
                {visibleRecentItems.map((recentItem, idx) => {
                  const isHighlighted = idx === highlightedIndex;
                  const { record, liveEntry } = recentItem;

                  const displayTitle =
                    liveEntry?.kind === 'COMPETITION'
                      ? liveEntry.meta.name
                      : liveEntry?.kind === 'CLUB'
                      ? `${liveEntry.club.name}${liveEntry.club.id === userClub.id ? ' (Seu Clube)' : ''}`
                      : liveEntry?.kind === 'PLAYER'
                      ? liveEntry.player.name
                      : record.title;

                  const displaySubtitle =
                    liveEntry?.kind === 'COMPETITION'
                      ? `Competição · ${liveEntry.regionLabel} · Edição ${liveEntry.seasonLabel}`
                      : liveEntry?.kind === 'CLUB'
                      ? `${liveEntry.leagueLabel} · ${liveEntry.country}`
                      : liveEntry?.kind === 'PLAYER'
                      ? `${liveEntry.player.detailedRole} · ${liveEntry.player.age} anos · ${
                          liveEntry.isUserPlayer
                            ? `${liveEntry.club?.shortName} (Seu Elenco)`
                            : liveEntry.club
                            ? liveEntry.club.name
                            : 'Livre no Mercado'
                        }`
                      : record.subtitle;

                  const badgeBg =
                    liveEntry?.kind === 'COMPETITION'
                      ? `${liveEntry.meta.primaryColor}22`
                      : liveEntry?.kind === 'CLUB'
                      ? liveEntry.club.colors.primary
                      : liveEntry?.kind === 'PLAYER' && liveEntry.club
                      ? liveEntry.club.colors.primary
                      : record.badgeBg;

                  const badgeColor =
                    liveEntry?.kind === 'COMPETITION'
                      ? liveEntry.meta.primaryColor
                      : liveEntry?.kind === 'CLUB'
                      ? liveEntry.club.colors.text
                      : liveEntry?.kind === 'PLAYER' && liveEntry.club
                      ? liveEntry.club.colors.text
                      : record.badgeColor;

                  const badgeText =
                    liveEntry?.kind === 'CLUB'
                      ? liveEntry.club.initials
                      : liveEntry?.kind === 'PLAYER'
                      ? liveEntry.club
                        ? liveEntry.club.initials
                        : 'LIV'
                      : record.badgeText;

                  return (
                    <div
                      key={`recent_${record.id}`}
                      onMouseEnter={() => setHighlightedIndex(idx)}
                      onClick={() => executeRecentSelection(recentItem)}
                      className={`px-4 sm:px-5 py-2.5 flex items-center justify-between gap-3 cursor-pointer transition-colors ${
                        isHighlighted ? 'bg-slate-800/70' : 'hover:bg-slate-900/60'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {record.kind === 'COMPETITION' ? (
                          <div
                            className="w-8 h-8 rounded-xl flex items-center justify-center border border-white/10 shrink-0"
                            style={{ backgroundColor: badgeBg || '#0ea5e922' }}
                          >
                            <Trophy
                              className="w-4 h-4"
                              style={{ color: badgeColor || '#38bdf8' }}
                            />
                          </div>
                        ) : badgeBg ? (
                          <div
                            className="w-8 h-8 rounded-xl flex items-center justify-center font-black text-[11px] border border-white/15 shrink-0"
                            style={{
                              backgroundColor: badgeBg,
                              color: badgeColor || '#ffffff',
                            }}
                          >
                            {badgeText}
                          </div>
                        ) : (
                          <div className="w-8 h-8 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 flex items-center justify-center font-bold text-[11px] shrink-0">
                            {badgeText || 'LIV'}
                          </div>
                        )}

                        <div className="min-w-0">
                          <div className="text-sm font-bold text-white truncate">
                            {displayTitle}
                          </div>
                          <div className="text-xs text-slate-400 truncate mt-0.5">
                            {displaySubtitle}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {liveEntry?.kind === 'CLUB' && (
                          <span className="hidden sm:inline text-xs font-mono font-bold tabular-nums text-emerald-400">
                            OVR {liveEntry.overall}
                          </span>
                        )}
                        {liveEntry?.kind === 'PLAYER' && (
                          <span className="hidden sm:inline text-xs font-mono font-bold tabular-nums text-emerald-400">
                            OVR {liveEntry.player.overall}
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={(e) => handleRemoveRecentSearch(e, record.id)}
                          title="Remover das buscas recentes"
                          className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition-colors cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Section Header for Featured Suggestions when Recent Searches are also visible */}
          {queryTokens.length === 0 && visibleRecentItems.length > 0 && visibleResults.length > 0 && (
            <div className="px-4 sm:px-5 py-2 bg-[#080e1a]/70 border-b border-slate-800/70 text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Sugestões em Destaque
            </div>
          )}

          {visibleResults.length === 0 ? (
            <div className="px-6 py-14 text-center">
              <p className="text-sm font-semibold text-slate-200">
                Nenhum resultado encontrado para &ldquo;{query}&rdquo;
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Tente buscar pelo nome do jogador, posição (ATA, MEI, GOL), clube, país ou liga.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-800/70">
              {visibleResults.map((item, idx) =>
                renderSearchResultRow(item, visibleRecentItems.length + idx)
              )}
            </div>
          )}
        </div>

        {/* Clean Footer Hint */}
        <div className="px-4 sm:px-5 py-2.5 bg-[#080e1a] border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
          <span>
            Use <strong className="text-slate-300 font-mono">↑ ↓</strong> para navegar e{' '}
            <strong className="text-slate-300 font-mono">Enter</strong> para abrir
          </span>
          <span>
            Atalho rápido: <strong className="text-slate-300 font-mono">Ctrl + K</strong>
          </span>
        </div>
      </div>
    </div>
  );
};
