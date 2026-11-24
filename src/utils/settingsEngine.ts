export type GameDifficulty = 'CASUAL' | 'PADRAO' | 'REALISTA';
export type PerformanceMode = 'AUTO' | 'ALTO' | 'LEVE';
/** 0 = contínuo (a cada ação), ou intervalo em minutos (5, 10, 30, 60) */
export type AutoSaveIntervalMinutes = 0 | 5 | 10 | 30 | 60;
export type GameLanguage = 'pt-BR' | 'en' | 'es' | 'fr' | 'it' | 'de';

export interface GameLanguageMeta {
  code: GameLanguage;
  nativeName: string;
  shortCode: string;
  flag: string;
  regionLabel: string;
}

export const GAME_LANGUAGES_META: GameLanguageMeta[] = [
  { code: 'pt-BR', nativeName: 'Português', shortCode: 'PT', flag: '🇧🇷', regionLabel: 'Brasil' },
  { code: 'en', nativeName: 'English', shortCode: 'EN', flag: '🇺🇸', regionLabel: 'International' },
  { code: 'es', nativeName: 'Español', shortCode: 'ES', flag: '🇪🇸', regionLabel: 'España / LATAM' },
  { code: 'fr', nativeName: 'Français', shortCode: 'FR', flag: '🇫🇷', regionLabel: 'France' },
  { code: 'it', nativeName: 'Italiano', shortCode: 'IT', flag: '🇮🇹', regionLabel: 'Italia' },
  { code: 'de', nativeName: 'Deutsch', shortCode: 'DE', flag: '🇩🇪', regionLabel: 'Deutschland' },
];

export function isValidGameLanguage(value: unknown): value is GameLanguage {
  return (
    value === 'pt-BR' ||
    value === 'en' ||
    value === 'es' ||
    value === 'fr' ||
    value === 'it' ||
    value === 'de'
  );
}

export const AUTO_SAVE_INTERVAL_OPTIONS: AutoSaveIntervalMinutes[] = [0, 5, 10, 30, 60];

export function getAutoSaveIntervalLabel(minutes: AutoSaveIntervalMinutes): string {
  if (minutes === 0) return 'Contínuo';
  return `${minutes} min`;
}

export interface GameSettings {
  masterVolume: number; // 0 to 100
  isMuted: boolean;
  defaultMatchSpeed: 1 | 2 | 4;
  defaultShowSectorMap: boolean;
  pauseAtHalftime: boolean;
  enableConfetti: boolean;
  autoSaveEnabled: boolean;
  autoSaveIntervalMinutes: AutoSaveIntervalMinutes;
  difficulty: GameDifficulty;
  performanceMode: PerformanceMode;
  language: GameLanguage;
  hasDismissedOnboarding?: boolean;
}

const SETTINGS_STORAGE_KEY = 'patofoot_game_settings_v1';

export const DEFAULT_GAME_SETTINGS: GameSettings = {
  masterVolume: 80,
  isMuted: false,
  defaultMatchSpeed: 1,
  defaultShowSectorMap: true,
  pauseAtHalftime: true,
  enableConfetti: true,
  autoSaveEnabled: true,
  autoSaveIntervalMinutes: 0,
  difficulty: 'PADRAO',
  performanceMode: 'AUTO',
  language: 'pt-BR',
  hasDismissedOnboarding: false,
};

/**
 * Automatically detects mobile touch devices, reduced-motion preferences, or low-core CPUs
 * when performanceMode is 'AUTO', enabling smooth low-overhead rendering on phones & older PCs.
 */
export function resolveEffectiveLiteMode(mode: PerformanceMode = 'AUTO'): boolean {
  if (mode === 'LEVE') return true;
  if (mode === 'ALTO') return false;
  if (typeof window === 'undefined') return false;

  try {
    const prefersReducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return true;

    const isCoarsePointer = window.matchMedia?.('(pointer: coarse)').matches;
    const isSmallViewport = window.innerWidth <= 820;
    const lowCores =
      typeof navigator !== 'undefined' &&
      typeof navigator.hardwareConcurrency === 'number' &&
      navigator.hardwareConcurrency > 0 &&
      navigator.hardwareConcurrency <= 4;
    const lowMemory =
      typeof navigator !== 'undefined' &&
      'deviceMemory' in navigator &&
      typeof (navigator as unknown as { deviceMemory?: number }).deviceMemory === 'number' &&
      ((navigator as unknown as { deviceMemory?: number }).deviceMemory as number) <= 4;

    return Boolean((isCoarsePointer && isSmallViewport) || lowCores || lowMemory);
  } catch {
    return false;
  }
}

export function applyPerformanceModeToDocument(mode: PerformanceMode = 'AUTO'): boolean {
  const isLite = resolveEffectiveLiteMode(mode);
  if (typeof document !== 'undefined') {
    document.documentElement.dataset.perf = isLite ? 'lite' : 'high';
  }
  return isLite;
}

export function loadGameSettings(): GameSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    const legacyMuted = localStorage.getItem('brasfoot_muted');
    if (!raw) {
      return {
        ...DEFAULT_GAME_SETTINGS,
        isMuted: legacyMuted === 'true',
      };
    }
    const parsed = JSON.parse(raw) as Partial<GameSettings>;
    const speed =
      parsed.defaultMatchSpeed === 1 ||
      parsed.defaultMatchSpeed === 2 ||
      parsed.defaultMatchSpeed === 4
        ? parsed.defaultMatchSpeed
        : DEFAULT_GAME_SETTINGS.defaultMatchSpeed;
    const difficulty: GameDifficulty =
      parsed.difficulty === 'CASUAL' ||
      parsed.difficulty === 'PADRAO' ||
      parsed.difficulty === 'REALISTA'
        ? parsed.difficulty
        : DEFAULT_GAME_SETTINGS.difficulty;
    const performanceMode: PerformanceMode =
      parsed.performanceMode === 'AUTO' ||
      parsed.performanceMode === 'ALTO' ||
      parsed.performanceMode === 'LEVE'
        ? parsed.performanceMode
        : DEFAULT_GAME_SETTINGS.performanceMode;

    const autoSaveIntervalMinutes: AutoSaveIntervalMinutes =
      parsed.autoSaveIntervalMinutes === 0 ||
      parsed.autoSaveIntervalMinutes === 5 ||
      parsed.autoSaveIntervalMinutes === 10 ||
      parsed.autoSaveIntervalMinutes === 30 ||
      parsed.autoSaveIntervalMinutes === 60
        ? parsed.autoSaveIntervalMinutes
        : DEFAULT_GAME_SETTINGS.autoSaveIntervalMinutes;

    const language: GameLanguage = isValidGameLanguage(parsed.language)
      ? parsed.language
      : DEFAULT_GAME_SETTINGS.language;

    return {
      masterVolume:
        typeof parsed.masterVolume === 'number'
          ? Math.max(0, Math.min(100, Math.round(parsed.masterVolume)))
          : DEFAULT_GAME_SETTINGS.masterVolume,
      isMuted:
        typeof parsed.isMuted === 'boolean'
          ? parsed.isMuted
          : legacyMuted === 'true',
      defaultMatchSpeed: speed,
      defaultShowSectorMap:
        typeof parsed.defaultShowSectorMap === 'boolean'
          ? parsed.defaultShowSectorMap
          : DEFAULT_GAME_SETTINGS.defaultShowSectorMap,
      pauseAtHalftime:
        typeof parsed.pauseAtHalftime === 'boolean'
          ? parsed.pauseAtHalftime
          : DEFAULT_GAME_SETTINGS.pauseAtHalftime,
      enableConfetti:
        typeof parsed.enableConfetti === 'boolean'
          ? parsed.enableConfetti
          : DEFAULT_GAME_SETTINGS.enableConfetti,
      autoSaveEnabled:
        typeof parsed.autoSaveEnabled === 'boolean'
          ? parsed.autoSaveEnabled
          : DEFAULT_GAME_SETTINGS.autoSaveEnabled,
      autoSaveIntervalMinutes,
      difficulty,
      performanceMode,
      language,
      hasDismissedOnboarding:
        typeof parsed.hasDismissedOnboarding === 'boolean'
          ? parsed.hasDismissedOnboarding
          : DEFAULT_GAME_SETTINGS.hasDismissedOnboarding,
    };
  } catch {
    return { ...DEFAULT_GAME_SETTINGS };
  }
}

export function saveGameSettings(settings: GameSettings): void {
  try {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
    localStorage.setItem('brasfoot_muted', String(settings.isMuted));
  } catch {
    // Ignore storage quota errors
  }
}
