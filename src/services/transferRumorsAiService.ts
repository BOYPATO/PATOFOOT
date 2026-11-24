import { GameSave, TransferRumor, TransferRumorHeat } from '../types/game';
import {
  buildFallbackTransferRumors,
  selectTransferRumorCandidates,
  TransferRumorCandidate,
} from '../utils/transferRumorsEngine';

export interface FetchTransferRumorsResult {
  rumors: TransferRumor[];
  usedAi: boolean;
  generatedAt: string;
  errorMessage?: string;
}

const SESSION_CACHE_PREFIX = 'patofoot_transfer_rumors_v1_';
const memoryRumorsCache = new Map<string, FetchTransferRumorsResult>();

function makeCacheKey(state: GameSave): string {
  return `${state.userClubId}:${state.currentSeasonYear}:${state.currentRound}`;
}

function readCachedRumors(key: string): FetchTransferRumorsResult | null {
  const mem = memoryRumorsCache.get(key);
  if (mem) return mem;

  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(`${SESSION_CACHE_PREFIX}${key}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as FetchTransferRumorsResult;
    if (parsed && Array.isArray(parsed.rumors) && parsed.rumors.length > 0) {
      memoryRumorsCache.set(key, parsed);
      return parsed;
    }
  } catch {
    // Ignore storage read issues
  }
  return null;
}

function writeCachedRumors(key: string, payload: FetchTransferRumorsResult): void {
  memoryRumorsCache.set(key, payload);
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(`${SESSION_CACHE_PREFIX}${key}`, JSON.stringify(payload));
  } catch {
    // Ignore storage quota issues
  }
}

export function getCachedTransferRumorsForRound(state: GameSave): FetchTransferRumorsResult | null {
  return readCachedRumors(makeCacheKey(state));
}

function mergeAiRumorsWithCandidates(
  candidates: TransferRumorCandidate[],
  aiItems: Array<{
    id: string;
    headline: string;
    summary: string;
    sourceOutlet: string;
    heatLevel: TransferRumorHeat;
  }>
): TransferRumor[] {
  const fallbackList = buildFallbackTransferRumors(candidates);
  const aiById = new Map(aiItems.map((item) => [item.id, item]));

  return fallbackList.map((base) => {
    const aiItem = aiById.get(base.id);
    if (!aiItem || !aiItem.headline || !aiItem.summary) {
      return base;
    }
    return {
      ...base,
      headline: aiItem.headline,
      summary: aiItem.summary,
      sourceOutlet: aiItem.sourceOutlet || base.sourceOutlet,
      heatLevel: aiItem.heatLevel || base.heatLevel,
      generatedByAi: true,
    };
  });
}

export async function fetchAiTransferRumors(
  state: GameSave,
  options?: { forceRefresh?: boolean }
): Promise<FetchTransferRumorsResult> {
  const cacheKey = makeCacheKey(state);
  if (!options?.forceRefresh) {
    const cached = readCachedRumors(cacheKey);
    if (cached && cached.usedAi) {
      return cached;
    }
  }

  const candidates = selectTransferRumorCandidates(state, 9);
  if (candidates.length === 0) {
    return {
      rumors: [],
      usedAi: false,
      generatedAt: new Date().toISOString(),
      errorMessage: 'Não há jogadores elegíveis suficientes no momento.',
    };
  }

  const userClub = state.clubs.find((c) => c.id === state.userClubId);

  try {
    const response = await fetch('/api/transfers/rumors', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        candidates,
        seasonYear: state.currentSeasonYear,
        round: state.currentRound,
        currentDate: state.currentDate,
        userClubName: userClub?.name || 'Seu Clube',
      }),
    });

    if (!response.ok) {
      let apiMsg = 'Serviço de IA indisponível no momento. Exibindo notas de apuração local.';
      try {
        const errPayload = (await response.json()) as { message?: string };
        if (errPayload?.message) apiMsg = `${errPayload.message} Exibindo apuração local.`;
      } catch {
        // Ignore parse error
      }
      const fallbackResult: FetchTransferRumorsResult = {
        rumors: buildFallbackTransferRumors(candidates),
        usedAi: false,
        generatedAt: new Date().toISOString(),
        errorMessage: apiMsg,
      };
      return fallbackResult;
    }

    const data = (await response.json()) as {
      rumors?: Array<{
        id: string;
        headline: string;
        summary: string;
        sourceOutlet: string;
        heatLevel: TransferRumorHeat;
      }>;
      usedAi?: boolean;
    };

    const aiItems = Array.isArray(data.rumors) ? data.rumors : [];
    const merged = mergeAiRumorsWithCandidates(candidates, aiItems);
    const anyAiUsed = Boolean(data.usedAi) && merged.some((r) => r.generatedByAi);

    const result: FetchTransferRumorsResult = {
      rumors: merged,
      usedAi: anyAiUsed,
      generatedAt: new Date().toISOString(),
      errorMessage: anyAiUsed
        ? undefined
        : 'A IA retornou resposta vazia. Exibindo apuração local.',
    };

    if (anyAiUsed) {
      writeCachedRumors(cacheKey, result);
    }
    return result;
  } catch {
    return {
      rumors: buildFallbackTransferRumors(candidates),
      usedAi: false,
      generatedAt: new Date().toISOString(),
      errorMessage: 'Falha de conexão ao consultar a IA. Exibindo apuração local.',
    };
  }
}
