import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  CareerChallengeId,
  Club,
  Division,
  EuropeanLeagueId,
  GameSave,
  ManagerSpecialtyId,
  WorldLeagueId,
} from '../types/game';
import { MANAGER_SPECIALTIES } from '../utils/managerSpecialtyEngine';
import {
  CAREER_CHALLENGES,
  getCareerChallengeDefinition,
  pickRecommendedClubForChallenge,
} from '../utils/careerChallengesEngine';
import { soundEngine } from '../services/soundEngine';
import { PatoLogo } from './PatoLogo';
import { ClubCrest } from './ClubCrest';
import { PWAInstallButton } from './PWAInstallButton';
import { LanguageSwitcher } from './LanguageSwitcher';
import { getCurrentRealWorldSyncPeriod } from '../services/october2026SquadAiService';
import { formatEuropeanSeason, formatShortDate } from '../utils/calendarUtils';
import {
  CAREER_SLOT_NUMBERS,
  SaveSlotNumber,
  SaveSlotSummary,
  findFirstAvailableSlotSync,
  getAllSlotSummariesSync,
  loadCareerSave,
  persistCareerSave,
  refreshSaveSlotSummaries,
} from '../utils/saveStorageEngine';
import { getClubSectorRatings } from '../utils/clubRatingsEngine';
import {
  SOUTH_AMERICAN_LEAGUE_IDS,
  SOUTH_AMERICAN_LEAGUES_META,
  getClubSouthAmericanLeagueId,
} from '../utils/southAmericaLeaguesEngine';
import {
  EUROPEAN_LEAGUE_IDS,
  EUROPEAN_LEAGUES_META,
  getClubEuropeanLeagueId,
} from '../utils/europeLeaguesEngine';
import {
  NORTH_AMERICAN_LEAGUE_IDS,
  ASIA_RUSSIA_LEAGUE_IDS,
  AFRICA_LEAGUE_IDS,
  WORLD_LEAGUES_META,
  getClubWorldLeagueId,
  isSplitCalendarClub,
} from '../utils/worldLeaguesEngine';
import {
  BrazilianStateUF,
  ESTADUAIS_2026_CONFIG,
  getClubEstadualConfig,
  getEstadualConfigByUf,
} from '../data/estaduais2026Config';
import {
  Play,
  PlusCircle,
  FolderOpen,
  BookOpen,
  Settings,
  Save,
  CheckCircle2,
  LogIn,
  UserPlus,
  Eye,
  EyeOff,
  ShieldCheck,
  LogOut,
  UserCheck,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Globe,
  RefreshCw,
  Search,
  Cloud,
  X,
  KeyRound,
  Mail,
  ArrowLeft,
} from 'lucide-react';
import {
  useTrainerAuth,
  loginTrainerWithNameAndPassword,
  registerTrainerWithNameAndPassword,
  loginTrainerWithGooglePopup,
  syncTrainerFavoriteClub,
  sendFirebasePasswordReset,
  resetTrainerPasswordWithRecovery,
  recoverTrainerLoginsByEmail,
  listDeviceSavedTrainerLogins,
  type RecoveredLoginMatch,
} from '../services/trainerAuthService';

interface TitleScreenProps {
  clubs: Club[];
  savedCareer: GameSave | null;
  hasAnySlotSave?: boolean;
  slotsRefreshKey?: number;
  initialOpenClubPicker?: boolean;
  onConsumeInitialPicker?: () => void;
  onRequestClubsCatalog?: () => void;
  onStartCareer: (
    selectedClubId: string,
    managerName: string,
    targetSlotNum?: SaveSlotNumber,
    options?: {
      managerSpecialty?: ManagerSpecialtyId;
      challengeId?: CareerChallengeId;
    }
  ) => void;
  onLoadSave?: (save: GameSave) => void;
  onResumeSavedGame: () => void;
  onOpenSaveManager: () => void;
  onOpenSettings: () => void;
  onOpenGuide?: (tab?: 'guide' | 'changelog') => void;
  onOpenOfficialSite?: () => void;
  onOpenOct2026GlobalSyncModal?: () => void;
  isSyncingOct2026Global?: boolean;
  oct2026SyncedCount?: number;
  oct2026TotalClubsCount?: number;
}

type CareerPickerRegion = Division | 'NA' | 'ASIA_RUS' | 'AFRICA';

interface CareerLeagueScrollBarProps {
  title: string;
  subtitle?: string;
  accentColor?: 'sky' | 'emerald' | 'amber';
  children: React.ReactNode;
}

const CareerLeagueScrollBar: React.FC<CareerLeagueScrollBarProps> = React.memo(({
  title,
  subtitle,
  accentColor = 'sky',
  children,
}) => {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const dragState = useRef<{
    isDown: boolean;
    startX: number;
    startScrollLeft: number;
    dragged: boolean;
  }>({
    isDown: false,
    startX: 0,
    startScrollLeft: 0,
    dragged: false,
  });

  const updateScrollEdges = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const maxScroll = el.scrollWidth - el.clientWidth;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(maxScroll - el.scrollLeft > 4);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    updateScrollEdges();

    const handleWheel = (e: WheelEvent) => {
      if (el.scrollWidth <= el.clientWidth) return;
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
        e.preventDefault();
        el.scrollLeft += e.deltaY;
        updateScrollEdges();
      }
    };

    const resizeObserver = new ResizeObserver(() => updateScrollEdges());
    resizeObserver.observe(el);
    el.addEventListener('wheel', handleWheel, { passive: false });
    el.addEventListener('scroll', updateScrollEdges, { passive: true });

    return () => {
      resizeObserver.disconnect();
      el.removeEventListener('wheel', handleWheel);
      el.removeEventListener('scroll', updateScrollEdges);
    };
  }, [updateScrollEdges]);

  const scrollByStep = (direction: -1 | 1) => {
    const el = scrollRef.current;
    if (!el) return;
    soundEngine.playClick();
    const step = Math.max(220, Math.round(el.clientWidth * 0.65));
    el.scrollBy({ left: direction * step, behavior: 'smooth' });
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = scrollRef.current;
    if (!el) return;
    dragState.current = {
      isDown: true,
      startX: e.pageX - el.offsetLeft,
      startScrollLeft: el.scrollLeft,
      dragged: false,
    };
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = scrollRef.current;
    if (!el || !dragState.current.isDown) return;
    const x = e.pageX - el.offsetLeft;
    const walk = x - dragState.current.startX;
    if (Math.abs(walk) > 6) {
      dragState.current.dragged = true;
      el.scrollLeft = dragState.current.startScrollLeft - walk;
    }
  };

  const handleMouseUpOrLeave = () => {
    dragState.current.isDown = false;
  };

  const handleCaptureClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (dragState.current.dragged) {
      e.stopPropagation();
      e.preventDefault();
      dragState.current.dragged = false;
    }
  };

  return (
    <div className="mt-3 shrink-0 bg-slate-900/75 border border-slate-800 rounded-xl p-2.5 space-y-2">
      <div className="flex items-center justify-between gap-2 px-0.5">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className={`text-[11px] font-black uppercase tracking-wider truncate ${
              accentColor === 'emerald'
                ? 'text-emerald-300'
                : accentColor === 'amber'
                ? 'text-amber-300'
                : 'text-sky-300'
            }`}
          >
            {title}
          </span>
          {subtitle && (
            <span className="hidden sm:inline text-[11px] text-slate-400 truncate">
              · {subtitle}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => scrollByStep(-1)}
            disabled={!canScrollLeft}
            title="Rolar ligas para a esquerda"
            className="w-7 h-7 rounded-lg bg-slate-950 hover:bg-slate-800 disabled:opacity-35 disabled:cursor-not-allowed border border-slate-700 text-slate-200 flex items-center justify-center transition-colors cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => scrollByStep(1)}
            disabled={!canScrollRight}
            title="Rolar ligas para a direita"
            className="w-7 h-7 rounded-lg bg-slate-950 hover:bg-slate-800 disabled:opacity-35 disabled:cursor-not-allowed border border-slate-700 text-slate-200 flex items-center justify-center transition-colors cursor-pointer"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div
        ref={scrollRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUpOrLeave}
        onMouseLeave={handleMouseUpOrLeave}
        onClickCapture={handleCaptureClick}
        className="flex items-center gap-1.5 overflow-x-auto horizontal-league-scroll pb-2 pt-0.5 min-w-0 select-none cursor-grab active:cursor-grabbing"
      >
        {children}
      </div>
    </div>
  );
});

interface ClubPickerCardProps {
  club: Club;
  isSelected: boolean;
  sectors: ReturnType<typeof getClubSectorRatings>;
  onSelect: (clubId: string) => void;
}

const ClubPickerCard: React.FC<ClubPickerCardProps> = React.memo(({
  club,
  isSelected,
  sectors,
  onSelect,
}) => (
  <button
    type="button"
    onClick={() => {
      soundEngine.playClick();
      onSelect(club.id);
    }}
    className={`p-3 rounded-xl border flex flex-col gap-2 transition-colors cursor-pointer text-left ${
      isSelected
        ? 'bg-sky-950/70 border-sky-400'
        : 'bg-slate-900/60 border-slate-800 hover:bg-slate-900'
    }`}
  >
    <div className="flex items-center justify-between gap-2 w-full">
      <div className="flex items-center gap-2.5 min-w-0">
        <ClubCrest club={club} size="md" />
        <div className="min-w-0">
          <h4 className="font-bold text-xs text-white truncate">{club.shortName}</h4>
          <span className="text-[10px] text-sky-400">
            {'★'.repeat(club.reputation)}
          </span>
        </div>
      </div>
      <span className="px-1.5 py-0.5 rounded-md bg-slate-950/90 border border-slate-700/80 text-[11px] font-black font-mono tabular-nums text-emerald-400 shrink-0">
        {sectors.overall}
      </span>
    </div>

    <div className="grid grid-cols-3 gap-1 pt-1.5 border-t border-slate-800/80 text-[10px] font-mono tabular-nums text-center">
      <div className="text-slate-400">
        DEF <strong className="text-sky-300">{sectors.defense}</strong>
      </div>
      <div className="text-slate-400">
        MEI <strong className="text-amber-300">{sectors.midfield}</strong>
      </div>
      <div className="text-slate-400">
        ATA <strong className="text-rose-300">{sectors.attack}</strong>
      </div>
    </div>
  </button>
));

const PICKER_INITIAL_BATCH = 42;

export const TitleScreen: React.FC<TitleScreenProps> = React.memo(({
  clubs,
  savedCareer,
  hasAnySlotSave = false,
  slotsRefreshKey = 0,
  initialOpenClubPicker = false,
  onConsumeInitialPicker,
  onRequestClubsCatalog,
  onStartCareer,
  onLoadSave,
  onResumeSavedGame,
  onOpenSaveManager,
  onOpenSettings,
  onOpenGuide,
  onOpenOfficialSite,
  onOpenOct2026GlobalSyncModal,
  isSyncingOct2026Global = false,
  oct2026SyncedCount = 0,
  oct2026TotalClubsCount = 0,
}) => {
  const { session: authSession, logout: handleLogoutTrainer } = useTrainerAuth();

  const [authMode, setAuthMode] = useState<'login' | 'register' | 'recover'>('login');
  const [loginNameInput, setLoginNameInput] = useState<string>('');
  const [passwordInput, setPasswordInput] = useState<string>('');
  const [confirmPasswordInput, setConfirmPasswordInput] = useState<string>('');
  const [registerRecoveryEmail, setRegisterRecoveryEmail] = useState<string>('');
  const [registerRecoveryKeyword, setRegisterRecoveryKeyword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [isSubmittingAuth, setIsSubmittingAuth] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authSuccess, setAuthSuccess] = useState<string | null>(null);

  const [recoverTab, setRecoverTab] = useState<'password' | 'login'>('password');
  const [recoverPasswordMethod, setRecoverPasswordMethod] = useState<'secret' | 'email'>('secret');
  const [recoverLoginInput, setRecoverLoginInput] = useState<string>('');
  const [recoverEmailInput, setRecoverEmailInput] = useState<string>('');
  const [recoverKeywordInput, setRecoverKeywordInput] = useState<string>('');
  const [recoverNewPasswordInput, setRecoverNewPasswordInput] = useState<string>('');
  const [recoverConfirmPasswordInput, setRecoverConfirmPasswordInput] = useState<string>('');
  const [recoveredLogins, setRecoveredLogins] = useState<RecoveredLoginMatch[]>([]);
  const [hasSearchedRecoverLogin, setHasSearchedRecoverLogin] = useState<boolean>(false);

  const deviceLoginHints = useMemo(() => {
    if (authMode !== 'recover') return [];
    return listDeviceSavedTrainerLogins();
  }, [authMode]);

  const [managerName, setManagerName] = useState<string>(
    savedCareer?.managerName || authSession?.displayName || 'Alex Dantas'
  );
  const [selectedDivision, setSelectedDivision] = useState<CareerPickerRegion>('A');
  const [selectedEstadualUf, setSelectedEstadualUf] = useState<BrazilianStateUF | 'ALL'>('ALL');
  const [selectedSaCountry, setSelectedSaCountry] = useState<string>('ALL');
  const [selectedEuLeague, setSelectedEuLeague] = useState<EuropeanLeagueId | 'ALL'>('ALL');
  const [selectedWlLeague, setSelectedWlLeague] = useState<WorldLeagueId | 'ALL'>('ALL');
  const [selectedClubId, setSelectedClubId] = useState<string>(
    authSession?.favoriteClubId || 'fla'
  );
  const [showClubPicker, setShowClubPicker] = useState<boolean>(
    Boolean(authSession) && initialOpenClubPicker
  );
  const [targetCareerSlot, setTargetCareerSlot] = useState<SaveSlotNumber>(() =>
    findFirstAvailableSlotSync()
  );
  const [slotSummaries, setSlotSummaries] = useState<
    Record<SaveSlotNumber, SaveSlotSummary | null>
  >(() => getAllSlotSummariesSync());
  const [loadingSlotNum, setLoadingSlotNum] = useState<SaveSlotNumber | null>(null);
  const [clubSearchQuery, setClubSearchQuery] = useState<string>('');
  const [visibleClubsLimit, setVisibleClubsLimit] = useState<number>(PICKER_INITIAL_BATCH);
  const [backedUpSlotNum, setBackedUpSlotNum] = useState<SaveSlotNumber | null>(null);
  const [selectedSpecialty, setSelectedSpecialty] = useState<ManagerSpecialtyId>('TATICO');
  const [selectedChallenge, setSelectedChallenge] = useState<CareerChallengeId>('LIVRE');

  // Hydrate all 5 career slot summaries lightweight on mount and after save modal changes
  useEffect(() => {
    let active = true;
    setSlotSummaries(getAllSlotSummariesSync());
    void refreshSaveSlotSummaries().then(() => {
      if (!active) return;
      setSlotSummaries(getAllSlotSummariesSync());
    });
    return () => {
      active = false;
    };
  }, [savedCareer, slotsRefreshKey]);

  const occupiedSlotsCount = useMemo(
    () => CAREER_SLOT_NUMBERS.filter((n) => Boolean(slotSummaries[n])).length,
    [slotSummaries]
  );

  const openClubPickerForSlot = useCallback(
    (slotNum?: SaveSlotNumber) => {
      soundEngine.playClick();
      onRequestClubsCatalog?.();
      setBackedUpSlotNum(null);
      setClubSearchQuery('');
      const chosenSlot = slotNum ?? findFirstAvailableSlotSync();
      setTargetCareerSlot(chosenSlot);
      if (authSession?.displayName) {
        setManagerName(authSession.displayName);
      }
      setShowClubPicker(true);
    },
    [authSession?.displayName, onRequestClubsCatalog]
  );

  const handleQuickLoadSlot = useCallback(
    async (slotNum: SaveSlotNumber) => {
      if (loadingSlotNum !== null) return;
      soundEngine.playClick();
      setLoadingSlotNum(slotNum);
      try {
        const save = await loadCareerSave(`brasfoot_slot_${slotNum}`);
        if (save && onLoadSave) {
          onLoadSave(save);
        } else {
          onOpenSaveManager();
        }
      } finally {
        setLoadingSlotNum(null);
      }
    },
    [loadingSlotNum, onLoadSave, onOpenSaveManager]
  );

  const allEstadualParticipantIds = useMemo(
    () => (showClubPicker ? new Set(ESTADUAIS_2026_CONFIG.flatMap((cfg) => cfg.defaultClubIds)) : new Set<string>()),
    [showClubPicker]
  );

  // Lazy single-pass index of all 963 clubs — only computed when Club Picker is opened for instant Home boot!
  const clubCatalogIndex = useMemo(() => {
    const clubById = new Map<string, Club>();
    const byDivision: Record<CareerPickerRegion, Club[]> = {
      A: [],
      B: [],
      C: [],
      D: [],
      EST: [],
      SA: [],
      NA: [],
      EU: [],
      WL: [],
      ASIA_RUS: [],
      AFRICA: [],
    };
    const estByUf = new Map<BrazilianStateUF, Club[]>();
    const saByCountry = new Map<string, Club[]>();
    const euByLeague = new Map<EuropeanLeagueId, Club[]>();
    const wlByLeague = new Map<WorldLeagueId, Club[]>();
    const allPlayableClubs: Club[] = [];

    if (!showClubPicker || clubs.length === 0) {
      return {
        clubById,
        byDivision,
        estByUf,
        saByCountry,
        euByLeague,
        wlByLeague,
        allPlayableClubs,
      };
    }

    const naSet = new Set<string>(NORTH_AMERICAN_LEAGUE_IDS);
    const asiaSet = new Set<string>(ASIA_RUSSIA_LEAGUE_IDS);

    const estCfgById = new Map<string, BrazilianStateUF[]>();
    for (const cfg of ESTADUAIS_2026_CONFIG) {
      estByUf.set(cfg.uf, []);
      for (const cid of cfg.defaultClubIds) {
        const list = estCfgById.get(cid);
        if (list) list.push(cfg.uf);
        else estCfgById.set(cid, [cfg.uf]);
      }
    }

    for (const c of clubs) {
      clubById.set(c.id, c);
      if (c.id.startsWith('guest_')) continue;
      allPlayableClubs.push(c);

      if (c.division === 'A' || c.division === 'B' || c.division === 'C' || c.division === 'D') {
        byDivision[c.division].push(c);
      }

      if (
        c.division !== 'EU' &&
        c.division !== 'SA' &&
        c.division !== 'WL' &&
        (c.division === 'EST' || allEstadualParticipantIds.has(c.id))
      ) {
        byDivision.EST.push(c);
        const mappedUfs = estCfgById.get(c.id);
        if (mappedUfs && mappedUfs.length > 0) {
          for (const uf of mappedUfs) {
            estByUf.get(uf)?.push(c);
          }
        } else if (c.division === 'EST' && c.state) {
          const ufList = estByUf.get(c.state as BrazilianStateUF);
          if (ufList) ufList.push(c);
        }
      }

      if (c.division === 'SA') {
        byDivision.SA.push(c);
        const country = c.country || '';
        const list = saByCountry.get(country);
        if (list) list.push(c);
        else saByCountry.set(country, [c]);
      } else if (c.division === 'EU') {
        byDivision.EU.push(c);
        const euId = getClubEuropeanLeagueId(c);
        if (euId) {
          const list = euByLeague.get(euId);
          if (list) list.push(c);
          else euByLeague.set(euId, [c]);
        }
      } else if (c.division === 'WL') {
        byDivision.WL.push(c);
        const wlId = getClubWorldLeagueId(c);
        if (wlId) {
          const list = wlByLeague.get(wlId);
          if (list) list.push(c);
          else wlByLeague.set(wlId, [c]);
          if (naSet.has(wlId)) byDivision.NA.push(c);
          else if (asiaSet.has(wlId)) byDivision.ASIA_RUS.push(c);
          else byDivision.AFRICA.push(c);
        }
      }
    }

    return {
      clubById,
      byDivision,
      estByUf,
      saByCountry,
      euByLeague,
      wlByLeague,
      allPlayableClubs,
    };
  }, [showClubPicker, clubs, allEstadualParticipantIds]);

  const sectorRatingsCache = useMemo(
    () => new Map<string, ReturnType<typeof getClubSectorRatings>>(),
    [clubs]
  );

  const getCachedSectorRatings = useCallback(
    (club: Club) => {
      let cached = sectorRatingsCache.get(club.id);
      if (!cached) {
        cached = getClubSectorRatings(club);
        sectorRatingsCache.set(club.id, cached);
      }
      return cached;
    },
    [sectorRatingsCache]
  );

  useEffect(() => {
    if (authSession) {
      setManagerName((prev) =>
        !prev || prev === 'Alex Dantas' ? authSession.displayName : prev
      );
      if (authSession.favoriteClubId) {
        const favClub = clubCatalogIndex.clubById.get(authSession.favoriteClubId);
        if (favClub) {
          setSelectedClubId(favClub.id);
          if (favClub.division === 'WL') {
            const wlId = getClubWorldLeagueId(favClub);
            if (wlId && (NORTH_AMERICAN_LEAGUE_IDS as readonly string[]).includes(wlId)) {
              setSelectedDivision('NA');
            } else if (wlId && (ASIA_RUSSIA_LEAGUE_IDS as readonly string[]).includes(wlId)) {
              setSelectedDivision('ASIA_RUS');
            } else {
              setSelectedDivision('AFRICA');
            }
            setSelectedWlLeague(wlId || 'ALL');
          } else {
            setSelectedDivision(favClub.division);
            if (favClub.division === 'EST' && favClub.state) {
              setSelectedEstadualUf(favClub.state as BrazilianStateUF);
            }
          }
        }
      }
    }
  }, [authSession, clubCatalogIndex]);

  useEffect(() => {
    if (initialOpenClubPicker && authSession) {
      onRequestClubsCatalog?.();
      setTargetCareerSlot(findFirstAvailableSlotSync());
      setShowClubPicker(true);
      onConsumeInitialPicker?.();
    }
  }, [initialOpenClubPicker, authSession, onConsumeInitialPicker, onRequestClubsCatalog]);

  useEffect(() => {
    if (showClubPicker && clubs.length === 0) {
      onRequestClubsCatalog?.();
    }
  }, [showClubPicker, clubs.length, onRequestClubsCatalog]);

  useEffect(() => {
    setVisibleClubsLimit(PICKER_INITIAL_BATCH);
  }, [
    showClubPicker,
    selectedDivision,
    selectedEstadualUf,
    selectedSaCountry,
    selectedEuLeague,
    selectedWlLeague,
    clubSearchQuery,
  ]);

  const divisionClubs = useMemo(() => {
    if (!showClubPicker) return [];
    const q = clubSearchQuery.trim().toLowerCase();

    // Global instant search across all 930+ clubs when typing 2+ characters
    if (q.length >= 2) {
      return clubCatalogIndex.allPlayableClubs.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.shortName.toLowerCase().includes(q) ||
          (c.country || '').toLowerCase().includes(q) ||
          (c.state || '').toLowerCase().includes(q)
      );
    }

    let baseList: Club[];
    if (selectedDivision === 'NA' || selectedDivision === 'ASIA_RUS' || selectedDivision === 'AFRICA') {
      baseList =
        selectedWlLeague !== 'ALL'
          ? clubCatalogIndex.wlByLeague.get(selectedWlLeague) || []
          : clubCatalogIndex.byDivision[selectedDivision];
    } else if (selectedDivision === 'EST') {
      baseList =
        selectedEstadualUf !== 'ALL'
          ? clubCatalogIndex.estByUf.get(selectedEstadualUf) || []
          : clubCatalogIndex.byDivision.EST;
    } else if (selectedDivision === 'SA' && selectedSaCountry !== 'ALL') {
      baseList = clubCatalogIndex.saByCountry.get(selectedSaCountry) || [];
    } else if (selectedDivision === 'EU' && selectedEuLeague !== 'ALL') {
      baseList = clubCatalogIndex.euByLeague.get(selectedEuLeague) || [];
    } else {
      baseList = clubCatalogIndex.byDivision[selectedDivision] || [];
    }

    if (!q) return baseList;
    return baseList.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.shortName.toLowerCase().includes(q) ||
        (c.country || '').toLowerCase().includes(q)
    );
  }, [
    showClubPicker,
    selectedDivision,
    selectedEstadualUf,
    selectedSaCountry,
    selectedEuLeague,
    selectedWlLeague,
    clubSearchQuery,
    clubCatalogIndex,
  ]);

  const visibleDivisionClubs = useMemo(
    () => divisionClubs.slice(0, visibleClubsLimit),
    [divisionClubs, visibleClubsLimit]
  );

  const selectedClub =
    clubCatalogIndex.clubById.get(selectedClubId) || divisionClubs[0] || clubs[0];

  const savedClub = savedCareer
    ? savedCareer.clubs.find((c) => c.id === savedCareer.userClubId) || savedCareer.clubs[0]
    : null;

  const formatCurrency = useCallback((amount: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      maximumFractionDigits: 0,
    }).format(amount);
  }, []);

  useEffect(() => {
    if (!authSession) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeTag = (document.activeElement?.tagName || '').toLowerCase();
      if (activeTag === 'input' || activeTag === 'textarea') return;
      if (e.key === 'Enter' && !showClubPicker) {
        if (savedCareer) {
          onResumeSavedGame();
        } else {
          setShowClubPicker(true);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [authSession, showClubPicker, savedCareer, onResumeSavedGame]);

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmittingAuth) return;
    soundEngine.playClick();
    setAuthError(null);
    setAuthSuccess(null);

    const cleanName = loginNameInput.trim();
    if (cleanName.length < 2) {
      setAuthError('Digite seu nome ou login (mínimo de 2 letras).');
      return;
    }
    if (passwordInput.length < 4) {
      setAuthError('Digite uma senha com pelo menos 4 caracteres.');
      return;
    }
    if (authMode === 'register' && passwordInput !== confirmPasswordInput) {
      setAuthError('As senhas digitadas não conferem. Repita a mesma senha nos dois campos.');
      return;
    }

    setIsSubmittingAuth(true);
    try {
      if (authMode === 'register') {
        const created = await registerTrainerWithNameAndPassword(
          cleanName,
          passwordInput,
          selectedClubId,
          {
            recoveryEmail: registerRecoveryEmail.trim() || undefined,
            recoveryKeyword: registerRecoveryKeyword.trim() || undefined,
          }
        );
        setManagerName(created.displayName);
      } else {
        const logged = await loginTrainerWithNameAndPassword(cleanName, passwordInput);
        setManagerName(logged.displayName);
      }
      setPasswordInput('');
      setConfirmPasswordInput('');
      setRegisterRecoveryEmail('');
      setRegisterRecoveryKeyword('');
      setAuthError(null);
      setAuthSuccess(null);
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : 'Não foi possível concluir o acesso. Tente novamente.';
      setAuthError(msg);
    } finally {
      setIsSubmittingAuth(false);
    }
  };

  const openRecoveryMode = (initialTab: 'password' | 'login' = 'password') => {
    soundEngine.playClick();
    setAuthMode('recover');
    setRecoverTab(initialTab);
    setAuthError(null);
    setAuthSuccess(null);
    setRecoveredLogins([]);
    setHasSearchedRecoverLogin(false);
    if (loginNameInput.trim() && !recoverLoginInput.trim()) {
      setRecoverLoginInput(loginNameInput.trim());
      if (loginNameInput.includes('@') && !recoverEmailInput.trim()) {
        setRecoverEmailInput(loginNameInput.trim());
      }
    }
  };

  const handleRecoverPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmittingAuth) return;
    soundEngine.playClick();
    setAuthError(null);
    setAuthSuccess(null);
    setIsSubmittingAuth(true);

    try {
      if (recoverPasswordMethod === 'email') {
        const sent = await sendFirebasePasswordReset(recoverEmailInput);
        setAuthSuccess(
          `Link de redefinição enviado para ${sent.email}. Verifique sua caixa de entrada (e o spam) para criar uma nova senha.`
        );
      } else {
        if (recoverNewPasswordInput.length < 4) {
          throw new Error('A nova senha deve ter pelo menos 4 caracteres.');
        }
        if (recoverNewPasswordInput !== recoverConfirmPasswordInput) {
          throw new Error('As novas senhas não conferem. Repita a mesma senha nos dois campos.');
        }
        const resetResult = await resetTrainerPasswordWithRecovery({
          login: recoverLoginInput,
          recoveryEmail: recoverEmailInput.trim() || undefined,
          recoveryKeyword: recoverKeywordInput.trim() || undefined,
          newPassword: recoverNewPasswordInput,
        });
        setLoginNameInput(resetResult.displayName);
        setPasswordInput('');
        setRecoverKeywordInput('');
        setRecoverNewPasswordInput('');
        setRecoverConfirmPasswordInput('');
        setAuthMode('login');
        setAuthSuccess(
          `Senha redefinida para "${resetResult.displayName}"! Digite sua nova senha para entrar.`
        );
      }
    } catch (err) {
      setAuthError(
        err instanceof Error
          ? err.message
          : 'Não foi possível recuperar sua senha agora. Tente novamente.'
      );
    } finally {
      setIsSubmittingAuth(false);
    }
  };

  const handleRecoverLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmittingAuth) return;
    soundEngine.playClick();
    setAuthError(null);
    setAuthSuccess(null);
    setIsSubmittingAuth(true);

    try {
      const matches = await recoverTrainerLoginsByEmail(recoverEmailInput);
      setRecoveredLogins(matches);
      setHasSearchedRecoverLogin(true);
      if (matches.length === 0) {
        setAuthError(
          'Nenhum login encontrado vinculado a este e-mail. Confira o endereço digitado ou veja as contas salvas neste aparelho abaixo.'
        );
      }
    } catch (err) {
      setAuthError(
        err instanceof Error
          ? err.message
          : 'Não foi possível buscar seu login agora. Tente novamente.'
      );
    } finally {
      setIsSubmittingAuth(false);
    }
  };

  const handleSelectRecoveredLogin = (displayName: string) => {
    soundEngine.playClick();
    setLoginNameInput(displayName);
    setRecoverLoginInput(displayName);
    setAuthMode('login');
    setAuthError(null);
    setAuthSuccess(`Login "${displayName}" preenchido. Agora digite sua senha para entrar.`);
  };

  const handleGoogleLogin = async () => {
    if (isSubmittingAuth) return;
    soundEngine.playClick();
    setAuthError(null);
    setAuthSuccess(null);
    setIsSubmittingAuth(true);
    try {
      const logged = await loginTrainerWithGooglePopup();
      setManagerName(logged.displayName);
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : 'Não foi possível entrar com o Google.';
      setAuthError(msg);
    } finally {
      setIsSubmittingAuth(false);
    }
  };

  const firstFreeSlotForBackup = useMemo<SaveSlotNumber>(() => {
    for (const n of CAREER_SLOT_NUMBERS) {
      if (!slotSummaries[n]) return n;
    }
    return 1;
  }, [slotSummaries]);

  const handleBackupCurrentCareerToFreeSlot = async () => {
    if (!savedCareer || !savedClub) return;
    soundEngine.playClick();
    const chosenBackupSlot = firstFreeSlotForBackup;
    const backup: GameSave = {
      ...savedCareer,
      savedAt: new Date().toLocaleString('pt-BR'),
      saveName: `Espaço ${chosenBackupSlot} · ${savedClub.shortName}`,
    };
    const ok = await persistCareerSave(`brasfoot_slot_${chosenBackupSlot}`, backup);
    if (ok) {
      setBackedUpSlotNum(chosenBackupSlot);
      setSlotSummaries(getAllSlotSummariesSync());
      if (targetCareerSlot === chosenBackupSlot) {
        const nextFree = CAREER_SLOT_NUMBERS.find(
          (n) => n !== chosenBackupSlot && !slotSummaries[n]
        );
        if (nextFree) setTargetCareerSlot(nextFree);
      }
    }
  };

  const handleConfirmStart = () => {
    soundEngine.playWhistle(false);
    const chosenManager =
      managerName.trim() || authSession?.displayName || 'Treinador';
    syncTrainerFavoriteClub(authSession, selectedClubId).catch(() => {});
    onStartCareer(selectedClubId, chosenManager, targetCareerSlot, {
      managerSpecialty: selectedSpecialty,
      challengeId: selectedChallenge,
    });
  };

  return (
    <div className="relative min-h-[100dvh] bg-[#070c16] text-white flex flex-col justify-between overflow-x-clip select-none">
      {/* Subtle Lightweight Atmospheric Backdrop */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            'radial-gradient(circle at 50% 45%, rgba(14, 165, 233, 0.12), transparent 52%), radial-gradient(circle at 12% 10%, rgba(2, 132, 199, 0.12), transparent 40%), radial-gradient(circle at 88% 90%, rgba(6, 182, 212, 0.10), transparent 40%)',
        }}
      />

      {/* Top Navigation Bar */}
      <header className="relative z-20 max-w-6xl mx-auto w-full px-3 sm:px-6 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3 flex flex-wrap sm:flex-nowrap items-center justify-between gap-2 sm:gap-4 border-b border-slate-800/70">
        <div className="flex items-center gap-2 sm:gap-2.5 whitespace-nowrap shrink-0">
          <PatoLogo size={28} />
          <span className="text-sm sm:text-lg font-extrabold tracking-wider text-sky-400 font-display">
            PATOFOOT <span className="text-white">2027</span>
          </span>
        </div>

        {authSession ? (
          <nav className="hidden md:flex items-center gap-5 text-xs font-semibold text-slate-400">
            <button
              type="button"
              onClick={() => openClubPickerForSlot()}
              className="hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Nova Carreira
            </button>
            <button
              type="button"
              onClick={() => {
                soundEngine.playClick();
                onOpenSaveManager();
              }}
              className="hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Saves & Backups
            </button>
            <button
              type="button"
              onClick={() => {
                soundEngine.playClick();
                onOpenSettings();
              }}
              className="hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Configurações
            </button>
            {onOpenGuide && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playClick();
                    onOpenGuide('guide');
                  }}
                  className="hover:text-emerald-300 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  Como Jogar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playClick();
                    onOpenGuide('changelog');
                  }}
                  className="hover:text-sky-300 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  v1.0 Novidades
                </button>
              </>
            )}
          </nav>
        ) : (
          <div className="hidden md:flex items-center gap-2 text-xs text-slate-400">
            <ShieldCheck className="w-4 h-4 text-sky-400 shrink-0" />
            <span>Área de Acesso do Treinador · Login Permanente</span>
          </div>
        )}

        <div className="flex items-center flex-wrap sm:flex-nowrap justify-end gap-1.5 sm:gap-2.5 ml-auto">
          <LanguageSwitcher compact />
          {authSession && (
            <div className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1 sm:py-1.5 rounded-xl bg-[#0c1424] border border-slate-800">
              <UserCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-400 shrink-0" />
              <div className="text-left leading-tight hidden sm:block">
                <span className="text-xs font-bold text-white block max-w-[140px] truncate">
                  {authSession.displayName}
                </span>
                <span className="text-[10px] text-emerald-400 font-medium block">
                  Conectado sempre
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  soundEngine.playClick();
                  setShowClubPicker(false);
                  handleLogoutTrainer();
                }}
                title="Sair da conta atual"
                className="sm:ml-1 px-2 sm:px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-rose-950/60 border border-slate-800 hover:border-rose-500/40 text-[11px] font-semibold text-slate-300 hover:text-rose-300 flex items-center gap-1 whitespace-nowrap shrink-0 cursor-pointer transition-colors"
              >
                <LogOut className="w-3.5 h-3.5 shrink-0" />
                <span>Sair</span>
              </button>
            </div>
          )}

          <PWAInstallButton alwaysShow compact iconOnlyOnMobile />

          {onOpenOfficialSite && (
            <button
              type="button"
              onClick={() => {
                soundEngine.playClick();
                onOpenOfficialSite();
              }}
              title="Abrir Site Oficial, Baixar App e Link para Convidar Amigos"
              aria-label="Site Oficial e Convidar Amigos"
              className="p-2 sm:px-3 sm:py-2 rounded-xl bg-[#0c1424] hover:bg-slate-800/80 border border-slate-800 text-xs font-semibold text-sky-300 hover:text-sky-200 flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer transition-colors"
            >
              <Globe className="w-4 h-4 shrink-0" />
              <span className="hidden sm:inline">Site &amp; Baixar</span>
            </button>
          )}

          {onOpenGuide && (
            <button
              type="button"
              onClick={() => {
                soundEngine.playClick();
                onOpenGuide('guide');
              }}
              title="Manual · Como Jogar & Novidades v1.0"
              aria-label="Manual"
              className="p-2 sm:px-3 sm:py-2 rounded-xl bg-[#0c1424] hover:bg-slate-800/80 border border-slate-800 text-xs font-semibold text-emerald-300 hover:text-emerald-200 flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer transition-colors"
            >
              <BookOpen className="w-4 h-4 shrink-0" />
              <span className="hidden sm:inline">Manual</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              soundEngine.playClick();
              onOpenSettings();
            }}
            title="Configurações"
            aria-label="Configurações"
            className="p-2 sm:px-3.5 sm:py-2 rounded-xl bg-[#0c1424] hover:bg-slate-800/80 border border-slate-800 text-xs font-semibold text-slate-200 hover:text-white flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer transition-colors"
          >
            <Settings className="w-4 h-4 text-sky-400 shrink-0" />
            <span className="hidden sm:inline">Configurações</span>
          </button>
        </div>
      </header>

      {/* Main Title Hub */}
      <main className="relative z-10 max-w-6xl mx-auto w-full px-3.5 sm:px-6 py-4 sm:py-6 flex flex-col items-center">
        {/* Compact Brand Strip */}
        <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-3 mb-5">
          <div className="flex items-center gap-3.5 text-center sm:text-left">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-[#0c1424] border border-sky-400/50 flex items-center justify-center p-2 shrink-0">
              <PatoLogo size={42} />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold font-display tracking-tight text-white leading-none">
                PATOFOOT <span className="text-sky-400">2027</span>
              </h1>
              <p className="mt-1 text-xs text-slate-400">
                930+ clubes mundiais · 27 estaduais · Copa do Mundo · 5 espaços de carreira
              </p>
            </div>
          </div>

          {authSession && (
            <button
              type="button"
              onClick={() => openClubPickerForSlot()}
              className="w-full sm:w-auto py-2.5 px-4 rounded-xl bg-sky-400 hover:bg-sky-300 text-slate-950 font-black text-xs sm:text-sm flex items-center justify-center gap-2 whitespace-nowrap shrink-0 cursor-pointer transition-colors"
            >
              <PlusCircle className="w-4 h-4 shrink-0" />
              <span>Criar Nova Carreira</span>
            </button>
          )}
        </div>

        {/* Gate 1: Trainer Login / Account Creation / Recovery when not authenticated */}
        {!authSession ? (
          <div className="w-full max-w-md bg-[#0c1424]/95 border border-slate-800 rounded-2xl p-6 sm:p-7 shadow-2xl">
            {authMode === 'recover' ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      soundEngine.playClick();
                      setAuthMode('login');
                      setAuthError(null);
                      setAuthSuccess(null);
                    }}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-300 hover:text-white cursor-pointer transition-colors"
                  >
                    <ArrowLeft className="w-3.5 h-3.5 shrink-0" />
                    <span>Voltar para Entrar</span>
                  </button>
                  <span className="text-[11px] font-bold text-sky-400 uppercase tracking-wider">
                    Recuperação de Conta
                  </span>
                </div>

                {/* Recovery Sub-tabs: Password vs Login */}
                <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-slate-950 border border-slate-800">
                  <button
                    type="button"
                    onClick={() => {
                      soundEngine.playClick();
                      setRecoverTab('password');
                      setAuthError(null);
                      setAuthSuccess(null);
                    }}
                    className={`py-2 px-3 rounded-lg text-xs font-extrabold flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
                      recoverTab === 'password'
                        ? 'bg-sky-400 text-slate-950 shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <KeyRound className="w-3.5 h-3.5 shrink-0" />
                    <span>Esqueci a Senha</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      soundEngine.playClick();
                      setRecoverTab('login');
                      setAuthError(null);
                      setAuthSuccess(null);
                    }}
                    className={`py-2 px-3 rounded-lg text-xs font-extrabold flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
                      recoverTab === 'login'
                        ? 'bg-sky-400 text-slate-950 shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Search className="w-3.5 h-3.5 shrink-0" />
                    <span>Esqueci o Login</span>
                  </button>
                </div>

                {recoverTab === 'password' ? (
                  <form onSubmit={handleRecoverPasswordSubmit} className="space-y-3.5">
                    <div>
                      <h2 className="text-base font-extrabold text-white">
                        Redefinir sua Senha
                      </h2>
                      <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                        Escolha se prefere redefinir na hora com sua palavra secreta / e-mail de recuperação ou receber um link oficial por e-mail.
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          soundEngine.playClick();
                          setRecoverPasswordMethod('secret');
                          setAuthError(null);
                          setAuthSuccess(null);
                        }}
                        className={`py-2 px-2.5 rounded-xl border text-[11px] font-bold text-center cursor-pointer transition-colors ${
                          recoverPasswordMethod === 'secret'
                            ? 'bg-sky-500/15 border-sky-400 text-sky-200'
                            : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        Palavra Secreta / E-mail
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          soundEngine.playClick();
                          setRecoverPasswordMethod('email');
                          setAuthError(null);
                          setAuthSuccess(null);
                        }}
                        className={`py-2 px-2.5 rounded-xl border text-[11px] font-bold text-center cursor-pointer transition-colors ${
                          recoverPasswordMethod === 'email'
                            ? 'bg-sky-500/15 border-sky-400 text-sky-200'
                            : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        Enviar Link por E-mail
                      </button>
                    </div>

                    {recoverPasswordMethod === 'email' ? (
                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                          E-mail da sua conta
                        </label>
                        <input
                          type="email"
                          autoComplete="email"
                          value={recoverEmailInput}
                          onChange={(e) => {
                            setRecoverEmailInput(e.target.value);
                            if (authError) setAuthError(null);
                          }}
                          placeholder="Ex: seuemail@gmail.com"
                          className="w-full bg-slate-950 border border-slate-700/90 focus:border-sky-400 rounded-xl px-3.5 py-2.5 text-sm text-white font-semibold placeholder-slate-500 focus:outline-none transition-colors"
                        />
                      </div>
                    ) : (
                      <>
                        <div>
                          <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                            Seu Nome ou Login
                          </label>
                          <input
                            type="text"
                            autoComplete="username"
                            value={recoverLoginInput}
                            onChange={(e) => {
                              setRecoverLoginInput(e.target.value);
                              if (authError) setAuthError(null);
                            }}
                            placeholder="Ex: Alex Dantas"
                            className="w-full bg-slate-950 border border-slate-700/90 focus:border-sky-400 rounded-xl px-3.5 py-2.5 text-sm text-white font-semibold placeholder-slate-500 focus:outline-none transition-colors"
                          />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                              Palavra Secreta
                            </label>
                            <input
                              type="text"
                              value={recoverKeywordInput}
                              onChange={(e) => {
                                setRecoverKeywordInput(e.target.value);
                                if (authError) setAuthError(null);
                              }}
                              placeholder="Time ou apelido"
                              className="w-full bg-slate-950 border border-slate-700/90 focus:border-sky-400 rounded-xl px-3 py-2.5 text-sm text-white font-semibold placeholder-slate-500 focus:outline-none transition-colors"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                              E-mail de Recuperação
                            </label>
                            <input
                              type="email"
                              value={recoverEmailInput}
                              onChange={(e) => {
                                setRecoverEmailInput(e.target.value);
                                if (authError) setAuthError(null);
                              }}
                              placeholder="seucadastro@..."
                              className="w-full bg-slate-950 border border-slate-700/90 focus:border-sky-400 rounded-xl px-3 py-2.5 text-sm text-white font-semibold placeholder-slate-500 focus:outline-none transition-colors"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                              Nova Senha
                            </label>
                            <input
                              type={showPassword ? 'text' : 'password'}
                              autoComplete="new-password"
                              value={recoverNewPasswordInput}
                              onChange={(e) => {
                                setRecoverNewPasswordInput(e.target.value);
                                if (authError) setAuthError(null);
                              }}
                              placeholder="Mín. 4 caracteres"
                              className="w-full bg-slate-950 border border-slate-700/90 focus:border-sky-400 rounded-xl px-3 py-2.5 text-sm text-white font-semibold placeholder-slate-500 focus:outline-none transition-colors"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                              Confirmar Nova Senha
                            </label>
                            <input
                              type={showPassword ? 'text' : 'password'}
                              autoComplete="new-password"
                              value={recoverConfirmPasswordInput}
                              onChange={(e) => {
                                setRecoverConfirmPasswordInput(e.target.value);
                                if (authError) setAuthError(null);
                              }}
                              placeholder="Repita a senha"
                              className="w-full bg-slate-950 border border-slate-700/90 focus:border-sky-400 rounded-xl px-3 py-2.5 text-sm text-white font-semibold placeholder-slate-500 focus:outline-none transition-colors"
                            />
                          </div>
                        </div>
                      </>
                    )}

                    {authSuccess && (
                      <div className="p-3 rounded-xl bg-emerald-950/50 border border-emerald-500/40 text-xs text-emerald-200 flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                        <span className="leading-relaxed">{authSuccess}</span>
                      </div>
                    )}

                    {authError && (
                      <div className="p-3 rounded-xl bg-rose-950/50 border border-rose-500/40 text-xs text-rose-200 flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                        <span className="leading-relaxed">{authError}</span>
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={isSubmittingAuth}
                      className="w-full py-3 px-5 rounded-xl bg-sky-400 hover:bg-sky-300 disabled:opacity-60 text-slate-950 font-black text-sm flex items-center justify-center gap-2 whitespace-nowrap shrink-0 cursor-pointer transition-colors shadow-lg shadow-sky-500/20"
                    >
                      {recoverPasswordMethod === 'email' ? (
                        <>
                          <Mail className="w-4 h-4 shrink-0" />
                          <span>
                            {isSubmittingAuth ? 'Enviando Link...' : 'Enviar Link de Redefinição'}
                          </span>
                        </>
                      ) : (
                        <>
                          <KeyRound className="w-4 h-4 shrink-0" />
                          <span>
                            {isSubmittingAuth ? 'Redefinindo...' : 'Redefinir Senha Agora'}
                          </span>
                        </>
                      )}
                    </button>
                  </form>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <h2 className="text-base font-extrabold text-white">
                        Encontrar seu Login
                      </h2>
                      <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                        Digite o e-mail de recuperação vinculado à sua conta ou escolha uma conta usada anteriormente neste aparelho.
                      </p>
                    </div>

                    <form onSubmit={handleRecoverLoginSubmit} className="space-y-2.5">
                      <label className="block text-xs font-semibold text-slate-300">
                        E-mail de Recuperação
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="email"
                          autoComplete="email"
                          value={recoverEmailInput}
                          onChange={(e) => {
                            setRecoverEmailInput(e.target.value);
                            if (authError) setAuthError(null);
                          }}
                          placeholder="Ex: seuemail@gmail.com"
                          className="flex-1 min-w-0 bg-slate-950 border border-slate-700/90 focus:border-sky-400 rounded-xl px-3.5 py-2.5 text-sm text-white font-semibold placeholder-slate-500 focus:outline-none transition-colors"
                        />
                        <button
                          type="submit"
                          disabled={isSubmittingAuth}
                          className="px-4 py-2.5 rounded-xl bg-sky-400 hover:bg-sky-300 disabled:opacity-60 text-slate-950 font-black text-xs whitespace-nowrap shrink-0 cursor-pointer transition-colors"
                        >
                          {isSubmittingAuth ? 'Buscando...' : 'Buscar'}
                        </button>
                      </div>
                    </form>

                    {hasSearchedRecoverLogin && recoveredLogins.length > 0 && (
                      <div className="p-3 rounded-xl bg-emerald-950/35 border border-emerald-500/35 space-y-2">
                        <p className="text-[11px] font-bold text-emerald-300 uppercase tracking-wider">
                          Login(s) encontrado(s)
                        </p>
                        {recoveredLogins.map((item) => (
                          <div
                            key={item.usernameKey}
                            className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-slate-950/90 border border-slate-800"
                          >
                            <div className="min-w-0">
                              <span className="text-xs font-extrabold text-white block truncate">
                                {item.displayName}
                              </span>
                              <span className="text-[10px] text-slate-400 block">
                                @{item.usernameKey}
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleSelectRecoveredLogin(item.displayName)}
                              className="px-2.5 py-1.5 rounded-lg bg-sky-400 hover:bg-sky-300 text-slate-950 font-black text-[11px] whitespace-nowrap shrink-0 cursor-pointer"
                            >
                              Usar login
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {authError && (
                      <div className="p-3 rounded-xl bg-rose-950/50 border border-rose-500/40 text-xs text-rose-200 flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                        <span className="leading-relaxed">{authError}</span>
                      </div>
                    )}

                    {deviceLoginHints.length > 0 && (
                      <div className="pt-2 border-t border-slate-800 space-y-2">
                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                          Contas usadas neste aparelho
                        </p>
                        <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                          {deviceLoginHints.map((hint) => (
                            <div
                              key={hint.usernameKey}
                              className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-slate-950 border border-slate-800"
                            >
                              <div className="min-w-0">
                                <span className="text-xs font-bold text-white block truncate">
                                  {hint.displayName}
                                </span>
                                <span className="text-[10px] text-slate-400 block truncate">
                                  {hint.maskedEmail
                                    ? hint.maskedEmail
                                    : `@${hint.usernameKey}`}
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => handleSelectRecoveredLogin(hint.displayName)}
                                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-sky-400 text-slate-200 hover:text-slate-950 font-bold text-[11px] cursor-pointer transition-colors"
                                >
                                  Usar
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div className="pt-2 border-t border-slate-800">
                  <p className="text-[11px] text-slate-400 mb-2">
                    Entrou com sua conta Google antes?
                  </p>
                  <button
                    type="button"
                    disabled={isSubmittingAuth}
                    onClick={handleGoogleLogin}
                    className="w-full py-2.5 px-4 rounded-xl bg-slate-950 hover:bg-slate-900 border border-slate-800 text-xs font-bold text-slate-200 hover:text-white flex items-center justify-center gap-2 whitespace-nowrap shrink-0 cursor-pointer transition-colors"
                  >
                    <span className="w-4 h-4 rounded-full bg-white text-slate-950 font-black text-[10px] flex items-center justify-center shrink-0">
                      G
                    </span>
                    <span>Entrar com Conta Google</span>
                  </button>
                </div>
              </div>
            ) : (
              <>
                {/* Mode Switcher Tabs */}
                <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-slate-950 border border-slate-800 mb-5">
                  <button
                    type="button"
                    onClick={() => {
                      soundEngine.playClick();
                      setAuthMode('login');
                      setAuthError(null);
                    }}
                    className={`py-2.5 px-3 rounded-lg text-xs font-extrabold flex items-center justify-center gap-2 whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
                      authMode === 'login'
                        ? 'bg-sky-400 text-slate-950 shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <LogIn className="w-3.5 h-3.5 shrink-0" />
                    <span>Entrar no Jogo</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      soundEngine.playClick();
                      setAuthMode('register');
                      setAuthError(null);
                      setAuthSuccess(null);
                    }}
                    className={`py-2.5 px-3 rounded-lg text-xs font-extrabold flex items-center justify-center gap-2 whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
                      authMode === 'register'
                        ? 'bg-sky-400 text-slate-950 shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <UserPlus className="w-3.5 h-3.5 shrink-0" />
                    <span>Criar Acesso</span>
                  </button>
                </div>

                <div className="mb-4">
                  <h2 className="text-base sm:text-lg font-extrabold text-white">
                    {authMode === 'login'
                      ? 'Acesse sua Conta de Treinador'
                      : 'Crie seu Acesso no Jogo'}
                  </h2>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                    {authMode === 'login'
                      ? 'Digite seu nome (ou login/e-mail) e sua senha para liberar o menu principal.'
                      : 'Escolha seu nome de treinador e uma senha. Informe um e-mail ou palavra secreta para recuperar a conta se esquecer.'}
                  </p>
                </div>

                <form onSubmit={handleAuthSubmit} className="space-y-3.5">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Seu Nome, Login ou E-mail
                    </label>
                    <input
                      type="text"
                      autoComplete="username"
                      value={loginNameInput}
                      onChange={(e) => {
                        setLoginNameInput(e.target.value);
                        if (authError) setAuthError(null);
                      }}
                      placeholder="Ex: Alex Dantas"
                      className="w-full bg-slate-950 border border-slate-700/90 focus:border-sky-400 rounded-xl px-3.5 py-2.5 text-sm text-white font-semibold placeholder-slate-500 focus:outline-none transition-colors"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <label className="block text-xs font-semibold text-slate-300">
                        Senha
                      </label>
                      {authMode === 'login' && (
                        <button
                          type="button"
                          onClick={() => openRecoveryMode('password')}
                          className="text-[11px] font-bold text-sky-400 hover:text-sky-300 transition-colors cursor-pointer"
                        >
                          Esqueci senha ou login
                        </button>
                      )}
                    </div>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        autoComplete={authMode === 'login' ? 'current-password' : 'new-password'}
                        value={passwordInput}
                        onChange={(e) => {
                          setPasswordInput(e.target.value);
                          if (authError) setAuthError(null);
                        }}
                        placeholder={
                          authMode === 'login'
                            ? 'Digite sua senha'
                            : 'Crie uma senha (mín. 4 caracteres)'
                        }
                        className="w-full bg-slate-950 border border-slate-700/90 focus:border-sky-400 rounded-xl pl-3.5 pr-10 py-2.5 text-sm text-white font-semibold placeholder-slate-500 focus:outline-none transition-colors"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((prev) => !prev)}
                        tabIndex={-1}
                        title={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-white cursor-pointer"
                      >
                        {showPassword ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  {authMode === 'register' && (
                    <>
                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                          Confirmar Senha
                        </label>
                        <input
                          type={showPassword ? 'text' : 'password'}
                          autoComplete="new-password"
                          value={confirmPasswordInput}
                          onChange={(e) => {
                            setConfirmPasswordInput(e.target.value);
                            if (authError) setAuthError(null);
                          }}
                          placeholder="Repita sua senha"
                          className="w-full bg-slate-950 border border-slate-700/90 focus:border-sky-400 rounded-xl px-3.5 py-2.5 text-sm text-white font-semibold placeholder-slate-500 focus:outline-none transition-colors"
                        />
                      </div>

                      <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2.5">
                        <div className="flex items-center gap-1.5 text-[11px] font-bold text-sky-300">
                          <KeyRound className="w-3.5 h-3.5 shrink-0" />
                          <span>Recuperação de Conta (opcional, recomendado)</span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          <div>
                            <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                              E-mail de recuperação
                            </label>
                            <input
                              type="email"
                              autoComplete="email"
                              value={registerRecoveryEmail}
                              onChange={(e) => {
                                setRegisterRecoveryEmail(e.target.value);
                                if (authError) setAuthError(null);
                              }}
                              placeholder="seuemail@gmail.com"
                              className="w-full bg-[#0c1424] border border-slate-700/90 focus:border-sky-400 rounded-lg px-2.5 py-2 text-xs text-white font-semibold placeholder-slate-500 focus:outline-none transition-colors"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                              Palavra secreta
                            </label>
                            <input
                              type="text"
                              value={registerRecoveryKeyword}
                              onChange={(e) => {
                                setRegisterRecoveryKeyword(e.target.value);
                                if (authError) setAuthError(null);
                              }}
                              placeholder="Ex: seu time ou apelido"
                              className="w-full bg-[#0c1424] border border-slate-700/90 focus:border-sky-400 rounded-lg px-2.5 py-2 text-xs text-white font-semibold placeholder-slate-500 focus:outline-none transition-colors"
                            />
                          </div>
                        </div>
                      </div>
                    </>
                  )}

                  <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-950/30 border border-emerald-500/25 text-[11px] text-emerald-300">
                    <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Sessão permanente ativada — você continuará logado sempre</span>
                  </div>

                  {authSuccess && (
                    <div className="p-3 rounded-xl bg-emerald-950/50 border border-emerald-500/40 text-xs text-emerald-200 flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      <span className="leading-relaxed">{authSuccess}</span>
                    </div>
                  )}

                  {authError && (
                    <div className="p-3 rounded-xl bg-rose-950/50 border border-rose-500/40 text-xs text-rose-200 space-y-2">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                        <span className="leading-relaxed">{authError}</span>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                        {authMode === 'login' && (
                          <button
                            type="button"
                            onClick={() => openRecoveryMode('password')}
                            className="text-[11px] font-bold text-amber-300 hover:text-amber-200 underline cursor-pointer"
                          >
                            Recuperar senha ou login →
                          </button>
                        )}
                        {authMode === 'login' && authError.includes('Criar Acesso') && (
                          <button
                            type="button"
                            onClick={() => {
                              soundEngine.playClick();
                              setAuthMode('register');
                              setAuthError(null);
                            }}
                            className="text-[11px] font-bold text-sky-300 hover:text-sky-200 underline cursor-pointer"
                          >
                            Mudar para Criar Acesso agora →
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isSubmittingAuth}
                    className="w-full py-3.5 px-5 rounded-xl bg-sky-400 hover:bg-sky-300 disabled:opacity-60 text-slate-950 font-black text-sm flex items-center justify-center gap-2 whitespace-nowrap shrink-0 cursor-pointer transition-colors shadow-lg shadow-sky-500/20"
                  >
                    {authMode === 'login' ? (
                      <>
                        <LogIn className="w-4 h-4 shrink-0" />
                        <span>
                          {isSubmittingAuth ? 'Entrando no Jogo...' : 'Entrar no PATOFOOT 2027'}
                        </span>
                      </>
                    ) : (
                      <>
                        <UserPlus className="w-4 h-4 shrink-0" />
                        <span>
                          {isSubmittingAuth
                            ? 'Criando seu Acesso...'
                            : 'Criar Acesso e Entrar no Jogo'}
                        </span>
                      </>
                    )}
                  </button>
                </form>

                {authMode === 'login' && (
                  <div className="mt-3 flex items-center justify-center gap-4 text-[11px]">
                    <button
                      type="button"
                      onClick={() => openRecoveryMode('password')}
                      className="text-slate-400 hover:text-sky-300 font-semibold transition-colors cursor-pointer"
                    >
                      Recuperar senha
                    </button>
                    <span className="text-slate-700">·</span>
                    <button
                      type="button"
                      onClick={() => openRecoveryMode('login')}
                      className="text-slate-400 hover:text-sky-300 font-semibold transition-colors cursor-pointer"
                    >
                      Esqueci meu login
                    </button>
                  </div>
                )}

                <div className="relative my-4 flex items-center justify-center">
                  <div className="border-t border-slate-800 w-full" />
                  <span className="px-3 bg-[#0c1424] text-[11px] text-slate-500 whitespace-nowrap">
                    ou acesse rápido
                  </span>
                  <div className="border-t border-slate-800 w-full" />
                </div>

                <button
                  type="button"
                  disabled={isSubmittingAuth}
                  onClick={handleGoogleLogin}
                  className="w-full py-2.5 px-4 rounded-xl bg-slate-950 hover:bg-slate-900 border border-slate-800 text-xs font-bold text-slate-200 hover:text-white flex items-center justify-center gap-2 whitespace-nowrap shrink-0 cursor-pointer transition-colors"
                >
                  <span className="w-4 h-4 rounded-full bg-white text-slate-950 font-black text-[10px] flex items-center justify-center shrink-0">
                    G
                  </span>
                  <span>Entrar com Conta Google</span>
                </button>
              </>
            )}
          </div>
        ) : (
          <div className="w-full space-y-4">
            {/* Primary Instant-Resume Card OR Quick Welcome Banner */}
            {savedCareer && savedClub ? (
              <div className="w-full bg-slate-950/95 border border-sky-500/40 rounded-2xl p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5 min-w-0">
                  <div
                    className="w-14 h-14 rounded-2xl flex items-center justify-center font-black text-lg border-2 border-white/20 shrink-0"
                    style={{
                      backgroundColor: savedClub.colors.primary,
                      color: savedClub.colors.text,
                    }}
                  >
                    {savedClub.initials}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 text-[11px] font-bold text-sky-400 uppercase tracking-wider">
                      <span>Última Carreira Jogada</span>
                      <span className="text-slate-600">·</span>
                      <span className="text-slate-400 font-normal normal-case tabular-nums">
                        {formatShortDate(savedCareer.currentDate)}
                      </span>
                    </div>
                    <h2 className="text-lg sm:text-xl font-black text-white truncate mt-0.5">
                      {savedClub.name}
                    </h2>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-slate-300 mt-0.5 tabular-nums">
                      <span>Téc. {savedCareer.managerName}</span>
                      <span className="text-slate-600">·</span>
                      <span>
                        {savedClub.division === 'EU'
                          ? (() => {
                              const euId = getClubEuropeanLeagueId(savedClub);
                              return euId ? EUROPEAN_LEAGUES_META[euId].shortName : 'Europa';
                            })()
                          : savedClub.division === 'SA'
                          ? (() => {
                              const saId = getClubSouthAmericanLeagueId(savedClub);
                              return saId ? SOUTH_AMERICAN_LEAGUES_META[saId].shortName : 'América do Sul';
                            })()
                          : savedClub.division === 'WL'
                          ? (() => {
                              const wlId = getClubWorldLeagueId(savedClub);
                              return wlId ? WORLD_LEAGUES_META[wlId].shortName : 'Internacional';
                            })()
                          : savedClub.division === 'EST'
                          ? getClubEstadualConfig(savedClub)?.shortName || 'Estadual'
                          : `Série ${savedClub.division}`}{' '}
                        {isSplitCalendarClub(savedClub)
                          ? formatEuropeanSeason(savedCareer.currentSeasonYear)
                          : savedCareer.currentSeasonYear}
                      </span>
                      <span className="text-slate-600">·</span>
                      <span>
                        Rod. {savedCareer.currentRound}/{savedCareer.totalRounds}
                      </span>
                      <span className="text-slate-600">·</span>
                      <span className="text-emerald-400 font-mono font-bold">
                        {formatCurrency(savedClub.finances.balance)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      soundEngine.playClick();
                      onResumeSavedGame();
                    }}
                    className="py-3 px-6 rounded-xl bg-sky-400 hover:bg-sky-300 text-slate-950 font-black text-sm flex items-center justify-center gap-2 whitespace-nowrap shrink-0 cursor-pointer transition-colors"
                  >
                    <Play className="w-4 h-4 fill-slate-950 shrink-0" />
                    <span>Continuar Agora</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="w-full bg-slate-950/90 border border-slate-800 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-base sm:text-lg font-black text-white">
                    Pronto para assumir um clube?
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Escolha um dos 5 espaços abaixo para criar sua carreira ou importe um backup .json.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => openClubPickerForSlot(1)}
                  className="w-full sm:w-auto py-3 px-6 rounded-xl bg-sky-400 hover:bg-sky-300 text-slate-950 font-black text-sm flex items-center justify-center gap-2 whitespace-nowrap shrink-0 cursor-pointer transition-colors"
                >
                  <Play className="w-4 h-4 fill-slate-950 shrink-0" />
                  <span>Começar Agora</span>
                </button>
              </div>
            )}

            {/* Direct 5 Career Spaces Launcher */}
            <section className="w-full bg-slate-950/90 border border-slate-800 rounded-2xl p-4 sm:p-5">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3.5">
                <div className="flex items-center gap-2">
                  <FolderOpen className="w-4 h-4 text-amber-400 shrink-0" />
                  <h3 className="text-xs sm:text-sm font-extrabold text-white">
                    Espaços de Carreira ({occupiedSlotsCount}/5 em uso)
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playClick();
                    onOpenSaveManager();
                  }}
                  className="text-xs font-semibold text-sky-400 hover:text-sky-300 flex items-center gap-1.5 cursor-pointer"
                >
                  <Cloud className="w-3.5 h-3.5 shrink-0" />
                  <span>Nuvem, Backups &amp; Excluir</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
                {CAREER_SLOT_NUMBERS.map((slotNum) => {
                  const summary = slotSummaries[slotNum];
                  const isLoadingThis = loadingSlotNum === slotNum;

                  if (summary) {
                    return (
                      <button
                        key={slotNum}
                        type="button"
                        disabled={loadingSlotNum !== null}
                        onClick={() => void handleQuickLoadSlot(slotNum)}
                        className="group p-3 rounded-xl bg-slate-900/90 hover:bg-slate-800/90 border border-slate-800 hover:border-sky-400/60 text-left flex flex-col justify-between gap-2.5 transition-colors cursor-pointer disabled:opacity-60"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <div
                              className="w-8 h-8 rounded-lg flex items-center justify-center font-black text-[11px] border border-white/15 shrink-0"
                              style={{
                                backgroundColor: summary.clubColors.primary,
                                color: summary.clubColors.text,
                              }}
                            >
                              {summary.clubInitials}
                            </div>
                            <div className="min-w-0">
                              <span className="text-[10px] font-mono text-slate-500 block leading-none">
                                ESPAÇO {slotNum}
                              </span>
                              <div className="text-xs font-extrabold text-white truncate mt-0.5">
                                {summary.clubShortName || summary.clubName}
                              </div>
                            </div>
                          </div>
                          <span className="px-2 py-0.5 rounded-md bg-sky-500/15 text-sky-300 group-hover:bg-sky-400 group-hover:text-slate-950 text-[10px] font-black transition-colors shrink-0">
                            {isLoadingThis ? '...' : 'Jogar'}
                          </span>
                        </div>

                        <div className="text-[11px] text-slate-400 truncate tabular-nums border-t border-slate-800/80 pt-2">
                          {summary.managerName} · {summary.currentSeasonYear} · R{summary.currentRound}
                        </div>
                      </button>
                    );
                  }

                  return (
                    <button
                      key={slotNum}
                      type="button"
                      onClick={() => openClubPickerForSlot(slotNum)}
                      className="group p-3 rounded-xl bg-slate-950/60 hover:bg-slate-900 border border-dashed border-slate-800 hover:border-sky-400/60 text-left flex flex-col justify-between gap-2.5 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-mono text-slate-500">
                          ESPAÇO {slotNum}
                        </span>
                        <PlusCircle className="w-4 h-4 text-slate-500 group-hover:text-sky-400 transition-colors shrink-0" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-300 group-hover:text-white transition-colors">
                          Nova Carreira
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          Espaço livre
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>

            {/* Dedicated Pre-Career Squad Updater Card (API & IA) */}
            {onOpenOct2026GlobalSyncModal && (
              <section className="w-full bg-slate-950/95 border border-sky-500/35 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3.5">
                <div className="flex items-start sm:items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-sky-500/15 border border-sky-500/35 flex items-center justify-center shrink-0">
                    {isSyncingOct2026Global ? (
                      <RefreshCw className="w-5 h-5 text-sky-400 animate-spin" />
                    ) : (
                      <Globe className="w-5 h-5 text-sky-400" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-xs sm:text-sm font-black text-white">
                        Atualizar Elencos via API &amp; IA ({getCurrentRealWorldSyncPeriod().fullLabel})
                      </h3>
                      {oct2026TotalClubsCount > 0 && (
                        <span className="text-[11px] font-mono tabular-nums font-bold text-sky-300">
                          {oct2026SyncedCount}/{oct2026TotalClubsCount} clubes
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
                      Atualize técnicos, contratações e elencos pela API ao vivo ou IA antes de iniciar um novo save. Os elencos baixados entram automaticamente em toda nova carreira.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playClick();
                    onOpenOct2026GlobalSyncModal();
                  }}
                  className="w-full sm:w-auto py-2.5 px-4 rounded-xl bg-sky-400 hover:bg-sky-300 text-slate-950 text-xs font-black flex items-center justify-center gap-2 whitespace-nowrap shrink-0 transition-colors cursor-pointer"
                >
                  <RefreshCw
                    className={`w-4 h-4 shrink-0 ${isSyncingOct2026Global ? 'animate-spin' : ''}`}
                  />
                  <span className="tabular-nums">
                    {isSyncingOct2026Global
                      ? `Sincronizando (${oct2026SyncedCount}/${oct2026TotalClubsCount})...`
                      : 'Atualizar Elencos (API / IA)'}
                  </span>
                </button>
              </section>
            )}

            {/* Compact Quick Tools Row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <button
                type="button"
                onClick={() => {
                  soundEngine.playClick();
                  onOpenSaveManager();
                }}
                className="py-2.5 px-3.5 rounded-xl bg-slate-950/90 hover:bg-slate-900 border border-slate-800 text-xs font-bold text-slate-200 hover:text-white flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <FolderOpen className="w-4 h-4 text-amber-400 shrink-0" />
                <span className="truncate">
                  {hasAnySlotSave ? 'Gerenciar Saves / Nuvem' : 'Nuvem & Backup (.json)'}
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  soundEngine.playClick();
                  onOpenSettings();
                }}
                className="py-2.5 px-3.5 rounded-xl bg-slate-950/90 hover:bg-slate-900 border border-slate-800 text-xs font-bold text-slate-200 hover:text-white flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <Settings className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="truncate">Configurações</span>
              </button>

              {onOpenGuide && (
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playClick();
                    onOpenGuide('guide');
                  }}
                  className="py-2.5 px-3.5 rounded-xl bg-slate-950/90 hover:bg-slate-900 border border-slate-800 text-xs font-bold text-slate-200 hover:text-white flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <BookOpen className="w-4 h-4 text-sky-400 shrink-0" />
                  <span className="truncate">Manual &amp; Novidades</span>
                </button>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Footer Strip */}
      <footer className="relative z-10 border-t border-slate-900 bg-black/80 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-wrap items-center justify-between gap-2 sm:gap-4 text-xs text-slate-500">
          <span>PATOFOOT Edição 2027 · Simulador de Futebol Manager</span>
          <span>Calendário Completo · Lei Bosman · Olheiros · Seleção Brasileira</span>
        </div>
      </footer>

      {/* Club Picker Modal for Starting Another Career */}
      {showClubPicker && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-start justify-center p-2 sm:p-4 pt-[max(0.5rem,env(safe-area-inset-top))] pb-[max(0.5rem,env(safe-area-inset-bottom))] overflow-y-auto">
          <div className="bg-slate-950 border border-slate-800 rounded-2xl w-full max-w-5xl shadow-2xl my-auto flex flex-col max-h-[94dvh] overflow-hidden">
            {/* Pinned Compact Modal Header */}
            <div className="shrink-0 flex items-center justify-between gap-3 px-5 sm:px-6 py-3.5 border-b border-slate-800 bg-slate-950">
              <div className="flex items-center gap-3 min-w-0">
                <PatoLogo size={32} />
                <div className="min-w-0">
                  <h3 className="text-base sm:text-lg font-black text-white truncate">
                    Começar Nova Carreira
                  </h3>
                  <p className="text-xs text-slate-400 truncate">
                    Role para baixo para ver todos os clubes, filtros e detalhes do time escolhido
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {onOpenOct2026GlobalSyncModal && (
                  <button
                    type="button"
                    onClick={() => {
                      soundEngine.playClick();
                      onOpenOct2026GlobalSyncModal();
                    }}
                    className="px-3 py-2 rounded-xl bg-sky-500/15 hover:bg-sky-500/25 border border-sky-500/40 text-sky-300 hover:text-white text-xs font-bold flex items-center gap-1.5 whitespace-nowrap transition-colors cursor-pointer"
                    title="Atualizar elencos pela API ou IA antes de iniciar o save"
                  >
                    <RefreshCw
                      className={`w-3.5 h-3.5 text-sky-400 shrink-0 ${
                        isSyncingOct2026Global ? 'animate-spin' : ''
                      }`}
                    />
                    <span className="hidden sm:inline">Atualizar Elencos (API / IA)</span>
                    <span className="sm:hidden">API / IA</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playClick();
                    setShowClubPicker(false);
                  }}
                  className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer shrink-0"
                  title="Fechar"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Single Smooth Scrollable Body for Filters, Challenges, Club Grid & Selected Details */}
            <div
              className="flex-1 min-h-0 overflow-y-auto px-5 sm:px-6 py-4 space-y-3"
              onScroll={(e) => {
                const el = e.currentTarget;
                if (
                  visibleClubsLimit < divisionClubs.length &&
                  el.scrollHeight - el.scrollTop - el.clientHeight < 280
                ) {
                  setVisibleClubsLimit((prev) =>
                    Math.min(divisionClubs.length, prev + PICKER_INITIAL_BATCH)
                  );
                }
              }}
            >
              {/* Division Tabs */}
              <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800 overflow-x-auto horizontal-league-scroll max-w-full">
                {(
                  [
                    { id: 'A', label: 'Série A' },
                    { id: 'B', label: 'Série B' },
                    { id: 'C', label: 'Série C' },
                    { id: 'D', label: 'Série D' },
                    { id: 'EST', label: 'Estaduais (27)' },
                    { id: 'SA', label: 'América do Sul' },
                    { id: 'NA', label: 'América do Norte' },
                    { id: 'EU', label: 'Europa' },
                    { id: 'ASIA_RUS', label: 'Ásia & Rússia' },
                    { id: 'AFRICA', label: 'África' },
                  ] as const
                ).map((tab) => {
                  const tabClubs = clubCatalogIndex.byDivision[tab.id];
                  const divCount = tabClubs.length;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => {
                        soundEngine.playClick();
                        setSelectedDivision(tab.id);
                        setClubSearchQuery('');
                        if (tab.id !== 'EST') {
                          setSelectedEstadualUf('ALL');
                        }
                        if (tab.id !== 'SA') {
                          setSelectedSaCountry('ALL');
                        }
                        if (tab.id !== 'EU') {
                          setSelectedEuLeague('ALL');
                        }
                        setSelectedWlLeague('ALL');
                        if (tabClubs[0]) setSelectedClubId(tabClubs[0].id);
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                        selectedDivision === tab.id
                          ? 'bg-sky-400 text-slate-950 font-black'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <span>{tab.label}</span>{' '}
                      <span className="font-mono tabular-nums opacity-75">({divCount})</span>
                    </button>
                  );
                })}
              </div>

            {/* Brazilian 27 State Championships Scrollable Bar */}
            {selectedDivision === 'EST' && (
              <CareerLeagueScrollBar
                title="Campeonatos Estaduais do Brasil 2027 (27 Unidades Federativas)"
                subtitle="Selecione qualquer estado para comandar um clube e disputar vagas na Série D, Copa do Brasil, Copa do Nordeste ou Copa Verde"
                accentColor="emerald"
              >
                <button
                  type="button"
                  onClick={(e) => {
                    soundEngine.playClick();
                    setSelectedEstadualUf('ALL');
                    const firstEst = clubCatalogIndex.byDivision.EST[0];
                    if (firstEst) setSelectedClubId(firstEst.id);
                    const btn = e.currentTarget;
                    btn.parentElement?.scrollTo({ left: 0, behavior: 'smooth' });
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                    selectedEstadualUf === 'ALL'
                      ? 'bg-emerald-400 text-slate-950 font-black shadow-sm'
                      : 'bg-slate-950 text-slate-300 hover:text-white border border-slate-800 hover:border-slate-700'
                  }`}
                >
                  Todos os 27 Estaduais ({clubCatalogIndex.byDivision.EST.length})
                </button>
                {ESTADUAIS_2026_CONFIG.map((cfg) => {
                  const stateClubs = clubCatalogIndex.estByUf.get(cfg.uf) || [];
                  const active = selectedEstadualUf === cfg.uf;
                  return (
                    <button
                      key={cfg.uf}
                      type="button"
                      onClick={(e) => {
                        soundEngine.playClick();
                        setSelectedEstadualUf(cfg.uf);
                        if (stateClubs[0]) {
                          setSelectedClubId(stateClubs[0].id);
                        }
                        const btn = e.currentTarget;
                        const parent = btn.parentElement;
                        if (parent) {
                          const targetScroll =
                            btn.offsetLeft - parent.clientWidth / 2 + btn.clientWidth / 2;
                          parent.scrollTo({ left: Math.max(0, targetScroll), behavior: 'smooth' });
                        }
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap shrink-0 transition-colors flex items-center gap-1.5 cursor-pointer ${
                        active
                          ? 'bg-emerald-400 text-slate-950 font-black shadow-sm'
                          : 'bg-slate-950 text-slate-300 hover:text-white border border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <span>{cfg.shortName}</span>
                      <span className="font-mono tabular-nums opacity-75">
                        ({stateClubs.length})
                      </span>
                    </button>
                  );
                })}
              </CareerLeagueScrollBar>
            )}

            {/* South American National League Scrollable Bar */}
            {selectedDivision === 'SA' && (
              <CareerLeagueScrollBar
                title={`Ligas da América do Sul (${SOUTH_AMERICAN_LEAGUE_IDS.length} Ligas Nacionais)`}
                subtitle="Arraste a barra, use a roda do mouse ou clique nas setas para ver todas"
                accentColor="emerald"
              >
                <button
                  type="button"
                  onClick={(e) => {
                    soundEngine.playClick();
                    setSelectedSaCountry('ALL');
                    const firstSa = clubCatalogIndex.byDivision.SA[0];
                    if (firstSa) setSelectedClubId(firstSa.id);
                    const btn = e.currentTarget;
                    btn.parentElement?.scrollTo({ left: 0, behavior: 'smooth' });
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                    selectedSaCountry === 'ALL'
                      ? 'bg-emerald-400 text-slate-950 font-black shadow-sm'
                      : 'bg-slate-950 text-slate-300 hover:text-white border border-slate-800 hover:border-slate-700'
                  }`}
                >
                  🌎 Todas as 9 Ligas ({clubCatalogIndex.byDivision.SA.length})
                </button>
                {SOUTH_AMERICAN_LEAGUE_IDS.map((saId) => {
                  const meta = SOUTH_AMERICAN_LEAGUES_META[saId];
                  const countryClubs = clubCatalogIndex.saByCountry.get(meta.country) || [];
                  const active = selectedSaCountry === meta.country;
                  return (
                    <button
                      key={saId}
                      type="button"
                      onClick={(e) => {
                        soundEngine.playClick();
                        setSelectedSaCountry(meta.country);
                        if (countryClubs[0]) {
                          setSelectedClubId(countryClubs[0].id);
                        }
                        const btn = e.currentTarget;
                        const parent = btn.parentElement;
                        if (parent) {
                          const targetScroll =
                            btn.offsetLeft - parent.clientWidth / 2 + btn.clientWidth / 2;
                          parent.scrollTo({ left: Math.max(0, targetScroll), behavior: 'smooth' });
                        }
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap shrink-0 transition-colors flex items-center gap-1.5 cursor-pointer ${
                        active
                          ? 'bg-emerald-400 text-slate-950 font-black shadow-sm'
                          : 'bg-slate-950 text-slate-300 hover:text-white border border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <span>{meta.flagEmoji}</span>
                      <span>{meta.country}</span>
                      <span className="font-mono tabular-nums opacity-75">
                        ({countryClubs.length})
                      </span>
                    </button>
                  );
                })}
              </CareerLeagueScrollBar>
            )}

            {/* European National League Scrollable Bar */}
            {selectedDivision === 'EU' && (
              <CareerLeagueScrollBar
                title={`Ligas da Europa (${EUROPEAN_LEAGUE_IDS.length} Ligas Nacionais)`}
                subtitle="Arraste a barra, use a roda do mouse ou clique nas setas para ver todas"
                accentColor="sky"
              >
                <button
                  type="button"
                  onClick={(e) => {
                    soundEngine.playClick();
                    setSelectedEuLeague('ALL');
                    const firstEu = clubCatalogIndex.byDivision.EU[0];
                    if (firstEu) setSelectedClubId(firstEu.id);
                    const btn = e.currentTarget;
                    btn.parentElement?.scrollTo({ left: 0, behavior: 'smooth' });
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                    selectedEuLeague === 'ALL'
                      ? 'bg-sky-400 text-slate-950 font-black shadow-sm'
                      : 'bg-slate-950 text-slate-300 hover:text-white border border-slate-800 hover:border-slate-700'
                  }`}
                >
                  🌍 Todas as 13 Ligas ({clubCatalogIndex.byDivision.EU.length})
                </button>
                {EUROPEAN_LEAGUE_IDS.map((euId) => {
                  const meta = EUROPEAN_LEAGUES_META[euId];
                  const leagueClubs = clubCatalogIndex.euByLeague.get(euId) || [];
                  const active = selectedEuLeague === euId;
                  return (
                    <button
                      key={euId}
                      type="button"
                      onClick={(e) => {
                        soundEngine.playClick();
                        setSelectedEuLeague(euId);
                        if (leagueClubs[0]) {
                          setSelectedClubId(leagueClubs[0].id);
                        }
                        const btn = e.currentTarget;
                        const parent = btn.parentElement;
                        if (parent) {
                          const targetScroll =
                            btn.offsetLeft - parent.clientWidth / 2 + btn.clientWidth / 2;
                          parent.scrollTo({ left: Math.max(0, targetScroll), behavior: 'smooth' });
                        }
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap shrink-0 transition-colors flex items-center gap-1.5 cursor-pointer ${
                        active
                          ? 'bg-sky-400 text-slate-950 font-black shadow-sm'
                          : 'bg-slate-950 text-slate-300 hover:text-white border border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <span>{meta.flagEmoji}</span>
                      <span>{meta.shortName}</span>
                      <span className="font-mono tabular-nums opacity-75">
                        ({leagueClubs.length})
                      </span>
                    </button>
                  );
                })}
              </CareerLeagueScrollBar>
            )}

            {/* North America, Asia & Russia, and Africa Scrollable League Bars */}
            {(selectedDivision === 'NA' ||
              selectedDivision === 'ASIA_RUS' ||
              selectedDivision === 'AFRICA') &&
              (() => {
                const groupIds =
                  selectedDivision === 'NA'
                    ? NORTH_AMERICAN_LEAGUE_IDS
                    : selectedDivision === 'ASIA_RUS'
                    ? ASIA_RUSSIA_LEAGUE_IDS
                    : AFRICA_LEAGUE_IDS;
                const barTitle =
                  selectedDivision === 'NA'
                    ? 'Ligas da América do Norte (EUA, México & Canadá · Vagas Internacionais e Mundial)'
                    : selectedDivision === 'ASIA_RUS'
                    ? 'Ligas da Ásia & Rússia (Arábia Saudita, Japão & Rússia · Temporada 2026/27)'
                    : 'Ligas da África (Egito & Marrocos · Vagas Internacionais e Mundial)';
                const groupClubs = clubCatalogIndex.byDivision[selectedDivision];
                const groupTotal = groupClubs.length;

                return (
                  <CareerLeagueScrollBar
                    title={barTitle}
                    subtitle="Dão vagas diretas à Champions Internacional FIFA e ao Mundial de Clubes"
                    accentColor="amber"
                  >
                    <button
                      type="button"
                      onClick={(e) => {
                        soundEngine.playClick();
                        setSelectedWlLeague('ALL');
                        const firstWl = groupClubs[0];
                        if (firstWl) setSelectedClubId(firstWl.id);
                        const btn = e.currentTarget;
                        btn.parentElement?.scrollTo({ left: 0, behavior: 'smooth' });
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                        selectedWlLeague === 'ALL'
                          ? 'bg-amber-400 text-slate-950 font-black shadow-sm'
                          : 'bg-slate-950 text-slate-300 hover:text-white border border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      🌐 Todas da Região ({groupTotal})
                    </button>
                    {groupIds.map((wlId) => {
                      const meta = WORLD_LEAGUES_META[wlId];
                      const leagueClubs = clubCatalogIndex.wlByLeague.get(wlId) || [];
                      const active = selectedWlLeague === wlId;
                      return (
                        <button
                          key={wlId}
                          type="button"
                          onClick={(e) => {
                            soundEngine.playClick();
                            setSelectedWlLeague(wlId);
                            if (leagueClubs[0]) {
                              setSelectedClubId(leagueClubs[0].id);
                            }
                            const btn = e.currentTarget;
                            const parent = btn.parentElement;
                            if (parent) {
                              const targetScroll =
                                btn.offsetLeft - parent.clientWidth / 2 + btn.clientWidth / 2;
                              parent.scrollTo({ left: Math.max(0, targetScroll), behavior: 'smooth' });
                            }
                          }}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap shrink-0 transition-colors flex items-center gap-1.5 cursor-pointer ${
                            active
                              ? 'bg-amber-400 text-slate-950 font-black shadow-sm'
                              : 'bg-slate-950 text-slate-300 hover:text-white border border-slate-800 hover:border-slate-700'
                          }`}
                        >
                          <span>{meta.flagEmoji}</span>
                          <span>
                            {meta.country} · {meta.shortName}
                          </span>
                          <span className="font-mono tabular-nums opacity-75">
                            ({leagueClubs.length})
                          </span>
                        </button>
                      );
                    })}
                  </CareerLeagueScrollBar>
                );
              })()}

            {/* Career Slot Selector (5 Espaços) + Optional Safe Backup */}
            <div className="mt-3 px-3.5 py-2.5 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-wrap items-center justify-between gap-2.5 text-xs">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] font-bold text-slate-400 mr-1">
                  Salvar nova carreira em:
                </span>
                {CAREER_SLOT_NUMBERS.map((n) => {
                  const occupied = slotSummaries[n];
                  const active = targetCareerSlot === n;
                  return (
                    <button
                      key={n}
                      type="button"
                      onClick={() => {
                        soundEngine.playClick();
                        setTargetCareerSlot(n);
                      }}
                      title={
                        occupied
                          ? `Substituir ${occupied.clubShortName} (Espaço ${n})`
                          : `Espaço ${n} disponível`
                      }
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors cursor-pointer flex items-center gap-1 ${
                        active
                          ? 'bg-sky-400 text-slate-950'
                          : occupied
                          ? 'bg-slate-950 text-amber-300 border border-amber-500/30 hover:border-amber-400'
                          : 'bg-slate-950 text-slate-300 border border-slate-800 hover:border-slate-600'
                      }`}
                    >
                      <span>Espaço {n}</span>
                      {occupied ? (
                        <span className="opacity-80 font-normal truncate max-w-[68px]">
                          ({occupied.clubShortName})
                        </span>
                      ) : (
                        <span className="opacity-70 font-normal">· Livre</span>
                      )}
                    </button>
                  );
                })}
              </div>

              {savedCareer && savedClub && (
                backedUpSlotNum ? (
                  <span className="text-emerald-400 font-semibold flex items-center gap-1.5 whitespace-nowrap shrink-0">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{savedClub.shortName} salvo no Espaço {backedUpSlotNum}!</span>
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={handleBackupCurrentCareerToFreeSlot}
                    className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-sky-300 font-semibold flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer transition-colors text-[11px]"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>Guardar {savedClub.shortName} no Espaço {firstFreeSlotForBackup}</span>
                  </button>
                )
              )}
            </div>

            {/* Manager Name & Global Club Search */}
            <div className="py-3.5 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2.5">
              <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-0">
                <label className="text-xs font-semibold text-slate-300 whitespace-nowrap">
                  Treinador:
                </label>
                <input
                  type="text"
                  value={managerName}
                  onChange={(e) => setManagerName(e.target.value)}
                  placeholder="Ex: Alex Dantas"
                  className="w-full sm:w-48 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white font-semibold placeholder-slate-500 focus:outline-none focus:border-sky-400"
                />
                <div className="relative flex-1 min-w-[200px] max-w-xs">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={clubSearchQuery}
                    onChange={(e) => setClubSearchQuery(e.target.value)}
                    placeholder="Buscar em todos os 930+ clubes..."
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-8 pr-3 py-2 text-sm text-white font-semibold placeholder-slate-500 focus:outline-none focus:border-sky-400"
                  />
                </div>
              </div>

              {selectedClub?.managerName && (
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playClick();
                    setManagerName(selectedClub.managerName);
                  }}
                  className="px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-semibold text-sky-300 hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  Usar Técnico Real: {selectedClub.managerName}
                </button>
              )}
            </div>

            {/* Career Mode (Desafios Prontos) & Manager Specialty */}
            <div className="py-3 border-b border-slate-800 grid grid-cols-1 lg:grid-cols-12 gap-3 text-xs">
              {/* Desafios Prontos */}
              <div className="lg:col-span-6 space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-bold text-slate-400">
                    Modo / Desafio de Carreira
                  </span>
                  {selectedChallenge !== 'LIVRE' && (
                    <button
                      type="button"
                      onClick={() => {
                        soundEngine.playClick();
                        const rec = pickRecommendedClubForChallenge(
                          selectedChallenge,
                          clubCatalogIndex.allPlayableClubs
                        );
                        if (rec) {
                          setClubSearchQuery('');
                          if (
                            rec.division === 'A' ||
                            rec.division === 'B' ||
                            rec.division === 'C' ||
                            rec.division === 'D' ||
                            rec.division === 'EST' ||
                            rec.division === 'SA' ||
                            rec.division === 'EU'
                          ) {
                            setSelectedDivision(rec.division);
                          }
                          setSelectedClubId(rec.id);
                        }
                      }}
                      className="text-[11px] font-bold text-amber-300 hover:text-amber-200 underline underline-offset-2 cursor-pointer whitespace-nowrap"
                    >
                      Sugerir Clube Ideal
                    </button>
                  )}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {CAREER_CHALLENGES.map((ch) => {
                    const active = selectedChallenge === ch.id;
                    return (
                      <button
                        key={ch.id}
                        type="button"
                        onClick={() => {
                          soundEngine.playClick();
                          setSelectedChallenge(ch.id);
                          if (ch.id === 'SERIE_D_LIBERTADORES') {
                            const rec = pickRecommendedClubForChallenge(
                              ch.id,
                              clubCatalogIndex.allPlayableClubs
                            );
                            if (rec) {
                              setSelectedDivision('D');
                              setSelectedClubId(rec.id);
                            }
                          } else if (ch.id === 'SEM_CLUBE_ZERO') {
                            const rec = pickRecommendedClubForChallenge(
                              ch.id,
                              clubCatalogIndex.allPlayableClubs
                            );
                            if (rec) {
                              setSelectedDivision(rec.division === 'EST' ? 'EST' : 'D');
                              setSelectedClubId(rec.id);
                            }
                          }
                        }}
                        className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-colors cursor-pointer whitespace-nowrap ${
                          active
                            ? 'bg-amber-400 text-slate-950 font-black'
                            : 'bg-slate-900 text-slate-300 border border-slate-800 hover:border-slate-600 hover:text-white'
                        }`}
                      >
                        {ch.shortLabel}
                      </button>
                    );
                  })}
                </div>
                {(() => {
                  const def = getCareerChallengeDefinition(selectedChallenge);
                  return (
                    <p className="text-[11px] text-slate-400 leading-snug">
                      <strong className="text-slate-200">{def.title}</strong> · {def.targetDescription}
                    </p>
                  );
                })()}
              </div>

              {/* Especialidade do Técnico */}
              <div className="lg:col-span-6 space-y-1.5">
                <span className="text-[11px] font-bold text-slate-400 block">
                  Especialidade do Treinador
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                  {MANAGER_SPECIALTIES.map((sp) => {
                    const active = selectedSpecialty === sp.id;
                    return (
                      <button
                        key={sp.id}
                        type="button"
                        onClick={() => {
                          soundEngine.playClick();
                          setSelectedSpecialty(sp.id);
                        }}
                        title={sp.bullets.join(' | ')}
                        className={`px-2.5 py-1.5 rounded-lg text-left transition-colors cursor-pointer border ${
                          active
                            ? 'bg-sky-500/20 border-sky-400 text-white'
                            : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-600'
                        }`}
                      >
                        <div
                          className={`text-[11px] font-bold truncate ${
                            active ? 'text-sky-300' : 'text-white'
                          }`}
                        >
                          {sp.title}
                        </div>
                        <div className="text-[10px] text-slate-400 truncate mt-0.5">
                          {sp.shortTag}
                        </div>
                      </button>
                    );
                  })}
                </div>
                {(() => {
                  const activeSp =
                    MANAGER_SPECIALTIES.find((s) => s.id === selectedSpecialty) ||
                    MANAGER_SPECIALTIES[0];
                  return (
                    <p className="text-[11px] text-sky-300/90 leading-snug">
                      {activeSp.bullets.join(' · ')}
                    </p>
                  );
                })()}
              </div>
            </div>

            {/* Club Grid & Selected Details */}
            <div className="pt-2 pb-2 grid grid-cols-1 md:grid-cols-12 gap-5 items-start">
              <div className="md:col-span-7">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {visibleDivisionClubs.map((club) => (
                    <ClubPickerCard
                      key={club.id}
                      club={club}
                      isSelected={selectedClubId === club.id}
                      sectors={getCachedSectorRatings(club)}
                      onSelect={setSelectedClubId}
                    />
                  ))}
                </div>
                {visibleClubsLimit < divisionClubs.length && (
                  <button
                    type="button"
                    onClick={() =>
                      setVisibleClubsLimit((prev) =>
                        Math.min(divisionClubs.length, prev + PICKER_INITIAL_BATCH)
                      )
                    }
                    className="mt-3 w-full py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-semibold text-sky-300 cursor-pointer transition-colors"
                  >
                    Mostrar mais clubes ({divisionClubs.length - visibleClubsLimit} restantes)
                  </button>
                )}
              </div>

              {selectedClub && (() => {
                const selectedSectors = getCachedSectorRatings(selectedClub);
                return (
                <div className="md:col-span-5 md:sticky md:top-0 bg-slate-900/90 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between gap-3 mb-4">
                      <div className="flex items-center gap-3.5 min-w-0">
                        <ClubCrest club={selectedClub} size="xl" rounded="2xl" />
                        <div className="min-w-0">
                          <h3 className="text-lg font-black text-white truncate">
                            {selectedClub.name}
                          </h3>
                          <p className="text-xs text-slate-400">
                            {selectedClub.division === 'EU' ? (
                              <>
                                {selectedClub.country || 'Europa'} ·{' '}
                                {(() => {
                                  const euLeagueId = getClubEuropeanLeagueId(selectedClub);
                                  return euLeagueId
                                    ? EUROPEAN_LEAGUES_META[euLeagueId].name
                                    : 'UEFA';
                                })()}
                              </>
                            ) : selectedClub.division === 'SA' ? (
                              <>
                                {selectedClub.country || 'América do Sul'} ·{' '}
                                {(() => {
                                  const saLeagueId = getClubSouthAmericanLeagueId(selectedClub);
                                  return saLeagueId
                                    ? SOUTH_AMERICAN_LEAGUES_META[saLeagueId].name
                                    : 'CONMEBOL';
                                })()}
                              </>
                            ) : selectedClub.division === 'WL' ? (
                              <>
                                {selectedClub.country || 'Internacional'} ·{' '}
                                {(() => {
                                  const wlLeagueId = getClubWorldLeagueId(selectedClub);
                                  return wlLeagueId
                                    ? WORLD_LEAGUES_META[wlLeagueId].name
                                    : 'Liga Internacional';
                                })()}
                              </>
                            ) : selectedClub.division === 'EST' ? (
                              <>
                                {selectedClub.state} ·{' '}
                                {getClubEstadualConfig(selectedClub)?.name || 'Campeonato Estadual'}
                              </>
                            ) : (
                              <>
                                {selectedClub.state} · Série {selectedClub.division} ·{' '}
                                {getClubEstadualConfig(selectedClub)?.shortName || 'Estadual'}
                              </>
                            )}
                          </p>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                          OVR
                        </div>
                        <div className="text-2xl font-black font-mono tabular-nums text-emerald-400 leading-none">
                          {selectedSectors.overall}
                        </div>
                      </div>
                    </div>

                    {/* Sector Ratings Breakdown (DEF / MEI / ATA) */}
                    <div className="mb-4 p-3 rounded-xl bg-slate-950/80 border border-slate-800/90 grid grid-cols-3 gap-2.5">
                      <div>
                        <div className="flex items-center justify-between text-[11px] mb-1">
                          <span className="font-semibold text-slate-400">Defesa</span>
                          <strong className="font-mono tabular-nums text-sky-400">
                            {selectedSectors.defense}
                          </strong>
                        </div>
                        <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
                          <div
                            className="h-full bg-sky-400 rounded-full"
                            style={{ width: `${Math.min(100, Math.max(20, (selectedSectors.defense - 40) * 1.9))}%` }}
                          />
                        </div>
                      </div>

                      <div>
                        <div className="flex items-center justify-between text-[11px] mb-1">
                          <span className="font-semibold text-slate-400">Meio</span>
                          <strong className="font-mono tabular-nums text-amber-400">
                            {selectedSectors.midfield}
                          </strong>
                        </div>
                        <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
                          <div
                            className="h-full bg-amber-400 rounded-full"
                            style={{ width: `${Math.min(100, Math.max(20, (selectedSectors.midfield - 40) * 1.9))}%` }}
                          />
                        </div>
                      </div>

                      <div>
                        <div className="flex items-center justify-between text-[11px] mb-1">
                          <span className="font-semibold text-slate-400">Ataque</span>
                          <strong className="font-mono tabular-nums text-rose-400">
                            {selectedSectors.attack}
                          </strong>
                        </div>
                        <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
                          <div
                            className="h-full bg-rose-400 rounded-full"
                            style={{ width: `${Math.min(100, Math.max(20, (selectedSectors.attack - 40) * 1.9))}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2 text-xs text-slate-300">
                      <div className="flex justify-between py-1.5 border-b border-slate-800">
                        <span className="text-slate-400">Técnico Real (2027)</span>
                        <strong className="text-amber-300">{selectedClub.managerName}</strong>
                      </div>
                      <div className="flex justify-between py-1.5 border-b border-slate-800">
                        <span className="text-slate-400">Estádio</span>
                        <strong className="text-white">{selectedClub.stadium.name}</strong>
                      </div>
                      <div className="flex justify-between py-1.5 border-b border-slate-800">
                        <span className="text-slate-400">Capacidade</span>
                        <strong className="text-white font-mono tabular-nums">
                          {selectedClub.stadium.capacity.toLocaleString('pt-BR')} lugares
                        </strong>
                      </div>
                      <div className="flex justify-between py-1.5 border-b border-slate-800">
                        <span className="text-slate-400">Orçamento Base</span>
                        <strong className="text-sky-400 font-mono tabular-nums">
                          {formatCurrency(selectedClub.finances.balance)}
                        </strong>
                      </div>
                      <div className="flex justify-between py-1.5 border-b border-slate-800">
                        <span className="text-slate-400">Elenco</span>
                        <strong className="text-white tabular-nums">
                          {selectedClub.squad.length} atletas
                        </strong>
                      </div>
                    </div>

                    <div className="mt-4 space-y-2.5">
                      {selectedClub.rivals && selectedClub.rivals.length > 0 && (
                        <div>
                          <span className="text-[11px] font-semibold text-amber-400 block mb-0.5">
                            Principais Rivais
                          </span>
                          <p className="text-xs text-slate-300 leading-relaxed">
                            {selectedClub.rivals
                              .map((rId) => clubCatalogIndex.clubById.get(rId)?.shortName)
                              .filter(Boolean)
                              .join(' · ')}
                          </p>
                        </div>
                      )}

                      <div>
                        <span className="text-[11px] font-semibold text-slate-400 block mb-0.5">
                          Principais Atletas
                        </span>
                        <p className="text-xs text-slate-300 leading-relaxed tabular-nums">
                          {selectedClub.squad
                            .slice(0, 4)
                            .map((p) => `${p.name} (${p.overall})`)
                            .join(' · ')}
                        </p>
                      </div>
                    </div>
                  </div>

                  </div>
                );
              })()}
            </div>
            </div>

            {/* Sticky Bottom Action Footer — Always Visible */}
            <div className="shrink-0 px-3.5 sm:px-6 py-3 sm:py-3.5 border-t border-slate-800 bg-slate-950/95 flex flex-wrap items-center justify-between gap-2.5 sm:gap-3">
              {selectedClub ? (
                <div className="flex items-center gap-2.5 min-w-0">
                  <ClubCrest club={selectedClub} size="sm" rounded="lg" />
                  <div className="min-w-0">
                    <div className="text-xs font-black text-white truncate">
                      {selectedClub.name}
                    </div>
                    <div className="text-[11px] text-slate-400 truncate tabular-nums">
                      OVR {getCachedSectorRatings(selectedClub).overall} · Orçamento{' '}
                      {formatCurrency(selectedClub.finances.balance)}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-xs text-slate-400">Selecione um clube para começar</div>
              )}

              <div className="flex items-center gap-2 w-full sm:w-auto sm:ml-auto">
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playClick();
                    setShowClubPicker(false);
                  }}
                  className="px-3.5 sm:px-4 py-2.5 sm:py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-800 whitespace-nowrap shrink-0 cursor-pointer transition-colors"
                >
                  Voltar
                </button>
                {selectedClub && (
                  <button
                    type="button"
                    onClick={handleConfirmStart}
                    className="flex-1 sm:flex-initial px-4 sm:px-5 py-2.5 rounded-xl bg-sky-400 hover:bg-sky-300 text-slate-950 font-black text-xs whitespace-nowrap shrink-0 cursor-pointer transition-colors text-center"
                  >
                    Assumir {selectedClub.shortName} (Espaço {targetCareerSlot})
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});
