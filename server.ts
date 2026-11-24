import 'dotenv/config';
import crypto from 'crypto';
import fs from 'fs';
import zlib from 'zlib';
import { execSync } from 'child_process';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  type GenerateContentConfig,
  type GenerateContentResponse,
  GoogleGenAI,
  Type,
} from '@google/genai';
import { requireAuth, type AuthRequest } from './src/middleware/auth.ts';
import { getOrCreateUser, updateSqlUserProfile } from './src/db/users.ts';
import {
  deleteUserSqlCareerSave,
  getUserSqlCareerSave,
  isValidSqlSlotId,
  listHallOfFameLeaderboard,
  listUserSqlCareerSaveSummaries,
  upsertUserSqlCareerSave,
} from './src/db/careerSaves.ts';
import {
  fetchClubRosterFromExternalApis,
  getRosterApiProvidersStatus,
  type RosterApiSourceId,
} from './src/server/footballRosterApi.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface StoredTrainerAccount {
  uid: string;
  displayName: string;
  usernameKey: string;
  passwordSalt: string;
  passwordHash: string;
  favoriteClubId: string;
  createdAt: string;
  updatedAt: string;
}

const ACCOUNTS_DIR = path.join(__dirname, 'data');
const ACCOUNTS_FILE = path.join(ACCOUNTS_DIR, 'trainer-accounts.json');

function normalizeServerUsernameKey(raw: string): string {
  const withoutDomain = String(raw || '')
    .trim()
    .split('@')[0];
  const ascii = withoutDomain
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9._\-]+/g, '.')
    .replace(/\.{2,}/g, '.')
    .replace(/^[._\-]+|[._\-]+$/g, '');
  const safe = ascii.slice(0, 60);
  if (safe.length === 1) return `${safe}1`;
  return safe;
}

function readTrainerAccounts(): StoredTrainerAccount[] {
  try {
    if (!fs.existsSync(ACCOUNTS_FILE)) return [];
    const content = fs.readFileSync(ACCOUNTS_FILE, 'utf-8');
    const parsed = JSON.parse(content);
    return Array.isArray(parsed) ? (parsed as StoredTrainerAccount[]) : [];
  } catch {
    return [];
  }
}

function writeTrainerAccounts(accounts: StoredTrainerAccount[]): void {
  try {
    if (!fs.existsSync(ACCOUNTS_DIR)) {
      fs.mkdirSync(ACCOUNTS_DIR, { recursive: true });
    }
    fs.writeFileSync(ACCOUNTS_FILE, JSON.stringify(accounts, null, 2), 'utf-8');
  } catch (err) {
    console.error('[Trainer Auth Store Write Error]:', err);
  }
}

function hashPasswordWithSalt(password: string, saltHex: string): string {
  return crypto.scryptSync(password, Buffer.from(saltHex, 'hex'), 64).toString('hex');
}

function verifyPasswordHash(password: string, saltHex: string, expectedHashHex: string): boolean {
  try {
    const computed = Buffer.from(hashPasswordWithSalt(password, saltHex), 'hex');
    const expected = Buffer.from(expectedHashHex, 'hex');
    if (computed.length !== expected.length) return false;
    return crypto.timingSafeEqual(computed, expected);
  } catch {
    return false;
  }
}

const SESSION_SIGNING_SECRET =
  (process.env.SESSION_SECRET && process.env.SESSION_SECRET.trim()) ||
  crypto.randomBytes(32).toString('hex');

function issueServerSessionToken(uid: string): string {
  const payload = Buffer.from(
    JSON.stringify({ uid, exp: Date.now() + 7 * 24 * 60 * 60 * 1000 }),
    'utf8'
  ).toString('base64url');
  const sig = crypto
    .createHmac('sha256', SESSION_SIGNING_SECRET)
    .update(payload)
    .digest('base64url');
  return `${payload}.${sig}`;
}

function verifyServerSessionToken(authHeader: string | undefined): string | null {
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.slice(7).trim();
  const dotIdx = token.indexOf('.');
  if (dotIdx <= 0 || dotIdx >= token.length - 1) return null;
  const payload = token.slice(0, dotIdx);
  const sig = token.slice(dotIdx + 1);
  try {
    const expectedSig = crypto
      .createHmac('sha256', SESSION_SIGNING_SECRET)
      .update(payload)
      .digest('base64url');
    const a = Buffer.from(sig, 'utf8');
    const b = Buffer.from(expectedSig, 'utf8');
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
    const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as {
      uid?: string;
      exp?: number;
    };
    if (!parsed.uid || typeof parsed.exp !== 'number' || parsed.exp < Date.now()) {
      return null;
    }
    return parsed.uid;
  } catch {
    return null;
  }
}

interface PlayerNationalityInput {
  id: string;
  name: string;
  clubName?: string;
  role?: string;
  age?: number;
  fallbackCountry?: string;
}

interface PlayerOverallInput {
  id: string;
  name: string;
  clubId?: string;
  clubName?: string;
  division?: string;
  reputation?: number;
  role?: string;
  age?: number;
  isStarter?: boolean;
  currentOverall?: number;
}

interface SouthAmericaClubCalibrationInput {
  id: string;
  name: string;
  reputation?: number;
}

interface CalibratedSouthAmericaClubOutput {
  clubId: string;
  managerName: string;
  def: number;
  mei: number;
  ata: number;
  keyPlayers: Array<{
    name: string;
    role: 'GOL' | 'ZAG' | 'LAT' | 'VOL' | 'MEI' | 'ATA';
    age: number;
    overall: number;
    nationality: string;
  }>;
}

interface EuropeClubCalibrationInput {
  id: string;
  name: string;
  reputation?: number;
}

interface CalibratedEuropeClubOutput {
  clubId: string;
  managerName: string;
  def: number;
  mei: number;
  ata: number;
  keyPlayers: Array<{
    name: string;
    role: 'GOL' | 'ZAG' | 'LAT' | 'VOL' | 'MEI' | 'ATA';
    age: number;
    overall: number;
    nationality: string;
  }>;
}

interface WorldClubCalibrationInput {
  id: string;
  name: string;
  reputation?: number;
}

interface CalibratedWorldClubOutput {
  clubId: string;
  managerName: string;
  def: number;
  mei: number;
  ata: number;
  keyPlayers: Array<{
    name: string;
    role: 'GOL' | 'ZAG' | 'LAT' | 'VOL' | 'MEI' | 'ATA';
    age: number;
    overall: number;
    nationality: string;
  }>;
}

interface Oct2026ClubSquadInput {
  id: string;
  name: string;
  country?: string;
  leagueName?: string;
  division?: string;
  reputation?: number;
}

interface Oct2026SquadPlayerOutput {
  name: string;
  role: 'GOL' | 'ZAG' | 'LAT' | 'VOL' | 'MEI' | 'ATA';
  age: number;
  overall: number;
  nationality: string;
  jerseyNumber: number;
  isStarter: boolean;
}

interface Oct2026ClubSquadOutput {
  clubId: string;
  managerName: string;
  updatedAt: string;
  monthKey?: string;
  source?: RosterApiSourceId;
  sourceLabel?: string;
  players: Oct2026SquadPlayerOutput[];
}

const NATIONALITIES_CACHE_FILE = path.join(ACCOUNTS_DIR, 'player-nationalities-cache.json');
const OCT2026_SQUADS_CACHE_FILE = path.join(ACCOUNTS_DIR, 'club-squads-oct2026-cache.json');

interface GroundingSourceLink {
  title: string;
  uri: string;
}

// Persistent in-memory + disk server cache for AI-resolved real-life nationalities, overalls & October 2026 squads
const resolvedNationalityCache = new Map<string, string>();
const resolvedOverallCache = new Map<string, number>();
const resolvedSouthAmericaClubCache = new Map<string, CalibratedSouthAmericaClubOutput>();
const resolvedEuropeClubCache = new Map<string, CalibratedEuropeClubOutput>();
const resolvedWorldClubCache = new Map<string, CalibratedWorldClubOutput>();
const resolvedOct2026SquadCache = new Map<string, Oct2026ClubSquadOutput>();

function loadPersistedNationalityCache(): void {
  try {
    if (!fs.existsSync(NATIONALITIES_CACHE_FILE)) return;
    const raw = fs.readFileSync(NATIONALITIES_CACHE_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') {
      for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
        if (typeof v === 'string' && v.trim()) {
          resolvedNationalityCache.set(k, v.trim());
        }
      }
    }
  } catch {
    // Ignore corrupted cache file
  }
}

function savePersistedNationalityCache(): void {
  try {
    if (!fs.existsSync(ACCOUNTS_DIR)) {
      fs.mkdirSync(ACCOUNTS_DIR, { recursive: true });
    }
    const obj: Record<string, string> = {};
    for (const [k, v] of resolvedNationalityCache.entries()) {
      obj[k] = v;
    }
    fs.writeFileSync(NATIONALITIES_CACHE_FILE, JSON.stringify(obj, null, 2), 'utf-8');
  } catch (err) {
    console.error('[Nationality Cache Write Error]:', err);
  }
}

function loadPersistedOct2026SquadCache(): void {
  try {
    if (!fs.existsSync(OCT2026_SQUADS_CACHE_FILE)) return;
    const raw = fs.readFileSync(OCT2026_SQUADS_CACHE_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') {
      for (const [k, v] of Object.entries(parsed as Record<string, Oct2026ClubSquadOutput>)) {
        if (v && v.clubId && Array.isArray(v.players) && v.players.length > 0) {
          resolvedOct2026SquadCache.set(k, v);
        }
      }
    }
  } catch {
    // Ignore corrupted cache file
  }
}

function savePersistedOct2026SquadCache(): void {
  try {
    if (!fs.existsSync(ACCOUNTS_DIR)) {
      fs.mkdirSync(ACCOUNTS_DIR, { recursive: true });
    }
    const obj: Record<string, Oct2026ClubSquadOutput> = {};
    for (const [k, v] of resolvedOct2026SquadCache.entries()) {
      obj[k] = v;
    }
    fs.writeFileSync(OCT2026_SQUADS_CACHE_FILE, JSON.stringify(obj, null, 2), 'utf-8');
  } catch (err) {
    console.error('[Oct2026 Squad Cache Write Error]:', err);
  }
}

loadPersistedNationalityCache();
loadPersistedOct2026SquadCache();

function extractJsonArrayFromText(rawText: string): Array<{ id: string; nationality: string }> | null {
  const cleaned = (rawText || '')
    .replace(/```json/gi, '')
    .replace(/```/g, '')
    .trim();
  if (!cleaned) return null;
  try {
    const direct = JSON.parse(cleaned);
    if (Array.isArray(direct)) return direct as Array<{ id: string; nationality: string }>;
  } catch {
    // Try extracting the outermost [...] JSON array block
  }
  const start = cleaned.indexOf('[');
  const end = cleaned.lastIndexOf(']');
  if (start !== -1 && end > start) {
    try {
      const sliced = JSON.parse(cleaned.slice(start, end + 1));
      if (Array.isArray(sliced)) return sliced as Array<{ id: string; nationality: string }>;
    } catch {
      return null;
    }
  }
  return null;
}

function makeCacheKey(p: PlayerNationalityInput): string {
  return `${(p.name || '').trim().toLowerCase()}|${(p.clubName || '').trim().toLowerCase()}`;
}

function makeOverallCacheKey(p: PlayerOverallInput): string {
  return `${(p.clubId || '').trim().toLowerCase()}|${(p.name || '').trim().toLowerCase()}|${p.division || ''}`;
}

const PRIMARY_GEMINI_MODEL = 'gemini-4-hydrogen';
const FALLBACK_GEMINI_MODEL = 'gemini-3.1-flash-lite';
const CANDIDATE_TEXT_MODELS = [PRIMARY_GEMINI_MODEL, FALLBACK_GEMINI_MODEL] as const;

let groundedSearchCooldownUntil = 0;
const modelQuotaCooldownUntil: Record<string, number> = {};

function isGeminiQuotaError(err: unknown): boolean {
  if (!err) return false;
  const anyErr = err as { status?: number; code?: number; message?: string };
  if (anyErr.status === 429 || anyErr.code === 429) return true;
  const text = String(anyErr.message ?? err).toLowerCase();
  return (
    text.includes('429') ||
    text.includes('resource_exhausted') ||
    text.includes('exceeded your current quota') ||
    text.includes('rate limit') ||
    text.includes('quota')
  );
}

function getGenAIClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || !apiKey.trim()) {
    return null;
  }
  return new GoogleGenAI({
    apiKey: apiKey.trim(),
    httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
  });
}

function sleepMs(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function generateGroundedIfAvailable(
  ai: GoogleGenAI,
  contents: string,
  systemInstruction: string
): Promise<{ response: GenerateContentResponse; modelUsed: string } | null> {
  const now = Date.now();
  if (now < groundedSearchCooldownUntil) {
    return null;
  }

  for (const model of CANDIDATE_TEXT_MODELS) {
    if (Date.now() < (modelQuotaCooldownUntil[model] || 0)) {
      continue;
    }
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents,
          config: {
            systemInstruction,
            tools: [{ googleSearch: {} }],
          },
        });
        return { response, modelUsed: model };
      } catch (err) {
        if (isGeminiQuotaError(err)) {
          if (attempt === 0) {
            await sleepMs(1400);
            continue;
          }
          groundedSearchCooldownUntil = Date.now() + 30_000;
          modelQuotaCooldownUntil[model] = Date.now() + 25_000;
          break;
        }
        // Non-quota grounded tool failure: fall through quietly to structured schema call
        return null;
      }
    }
  }

  return null;
}

async function generateStructuredWithFallback(
  ai: GoogleGenAI,
  contents: string,
  config: GenerateContentConfig
): Promise<{ response: GenerateContentResponse; modelUsed: string } | null> {
  for (const model of CANDIDATE_TEXT_MODELS) {
    if (Date.now() < (modelQuotaCooldownUntil[model] || 0)) {
      continue;
    }
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents,
          config,
        });
        return { response, modelUsed: model };
      } catch (err) {
        if (isGeminiQuotaError(err)) {
          if (attempt === 0) {
            await sleepMs(1400);
            continue;
          }
          modelQuotaCooldownUntil[model] = Date.now() + 25_000;
          break;
        }
        throw err;
      }
    }
  }

  return null;
}

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.set('trust proxy', 1);
  app.disable('x-powered-by');

  // Security headers (compatible with iframe preview — intentionally omits X-Frame-Options)
  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    next();
  });

  // Zero-dependency Brotli / Gzip compression for fast mobile & web loading (JSON / JS / CSS / HTML / SVG)
  const COMPRESSIBLE_RE = /^(text\/|application\/(json|javascript|xml|manifest\+json)|image\/svg\+xml)/i;
  app.use((req, res, next) => {
    const acceptEncoding = String(req.headers['accept-encoding'] || '');
    const useBrotli = /\bbr\b/i.test(acceptEncoding);
    const useGzip = !useBrotli && /\bgzip\b/i.test(acceptEncoding);
    if (!useBrotli && !useGzip) {
      next();
      return;
    }

    const originalSend = res.send.bind(res);
    res.send = ((body?: unknown) => {
      try {
        if (res.headersSent || res.getHeader('Content-Encoding')) {
          return originalSend(body);
        }
        const contentType = String(res.getHeader('Content-Type') || '');
        if (!COMPRESSIBLE_RE.test(contentType)) {
          return originalSend(body);
        }
        const rawBuf = Buffer.isBuffer(body)
          ? body
          : typeof body === 'string'
          ? Buffer.from(body, 'utf8')
          : null;
        if (!rawBuf || rawBuf.length < 1024) {
          return originalSend(body);
        }
        const compressed = useBrotli
          ? zlib.brotliCompressSync(rawBuf, {
              params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 4 },
            })
          : zlib.gzipSync(rawBuf, { level: 6 });
        res.setHeader('Content-Encoding', useBrotli ? 'br' : 'gzip');
        res.setHeader('Vary', 'Accept-Encoding');
        res.setHeader('Content-Length', String(compressed.length));
        return originalSend(compressed);
      } catch {
        return originalSend(body);
      }
    }) as typeof res.send;
    next();
  });

  app.use(express.json({ limit: '2mb' }));

  // Zero-dependency sliding-window rate limiter for production quota & auth protection
  interface RateBucket {
    count: number;
    resetAt: number;
  }
  const createRateLimiter = (opts: {
    windowMs: number;
    max: number;
    message: string;
    bucketPrefix: string;
  }) => {
    const store = new Map<string, RateBucket>();
    const cleanupTimer = setInterval(() => {
      const now = Date.now();
      for (const [k, entry] of store.entries()) {
        if (entry.resetAt <= now) {
          store.delete(k);
        }
      }
    }, Math.max(60_000, opts.windowMs));
    cleanupTimer.unref?.();

    return (req: express.Request, res: express.Response, next: express.NextFunction) => {
      const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
      const key = `${opts.bucketPrefix}:${clientIp}`;
      const now = Date.now();
      const existing = store.get(key);

      if (!existing || existing.resetAt <= now) {
        store.set(key, { count: 1, resetAt: now + opts.windowMs });
        next();
        return;
      }

      if (existing.count >= opts.max) {
        const retryAfterSeconds = Math.max(1, Math.ceil((existing.resetAt - now) / 1000));
        res.setHeader('Retry-After', String(retryAfterSeconds));
        res.status(429).json({
          error: 'RATE_LIMITED',
          message: opts.message,
          retryAfterSeconds,
        });
        return;
      }

      existing.count += 1;
      next();
    };
  };

  const authRateLimiter = createRateLimiter({
    windowMs: 15 * 60 * 1000,
    max: 25,
    bucketPrefix: 'auth',
    message: 'Muitas tentativas de acesso em sequência. Aguarde alguns minutos e tente novamente.',
  });

  const aiRateLimiter = createRateLimiter({
    windowMs: 10 * 60 * 1000,
    max: 30,
    bucketPrefix: 'ai',
    message: 'Limite temporário de requisições inteligentes atingido. Aguarde alguns instantes.',
  });

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', app: 'PATOFOOT 2026', version: '1.0.0' });
  });

  // Helper to resolve public canonical base URL for custom domains (SEO + App Store verification)
  const resolvePublicOrigin = (req: express.Request): string => {
    const envUrl = String(process.env.APP_URL || '').trim();
    if (/^https?:\/\/[^/\s<>"']+$/i.test(envUrl) && !envUrl.includes('MY_APP_URL')) {
      return envUrl.replace(/\/+$/, '');
    }
    const rawHost = String(req.get('host') || '').trim();
    const safeHost = /^[a-z0-9.-]+(?::\d{1,5})?$/i.test(rawHost) ? rawHost : '';
    const proto = req.protocol === 'https' || req.get('x-forwarded-proto') === 'https' ? 'https' : 'http';
    if (safeHost) return `${proto}://${safeHost}`;
    return 'https://patofoot.app';
  };

  // Google Play Store Trusted Web Activity (TWA) / Digital Asset Links verification
  app.get('/.well-known/assetlinks.json', (_req, res) => {
    const packageName =
      String(process.env.ANDROID_APP_PACKAGE || 'com.patofoot.manager2026').trim() ||
      'com.patofoot.manager2026';
    const rawFingerprints = String(process.env.ANDROID_SHA256_FINGERPRINTS || '')
      .split(',')
      .map((fp) => fp.trim())
      .filter((fp) => fp.length >= 16);

    const fingerprints =
      rawFingerprints.length > 0
        ? rawFingerprints
        : ['SUBSTITUA_PELO_SHA256_DA_GOOGLE_PLAY_OU_DEFINA_ANDROID_SHA256_FINGERPRINTS'];

    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.json([
      {
        relation: ['delegate_permission/common.handle_all_urls'],
        target: {
          namespace: 'android_app',
          package_name: packageName,
          sha256_cert_fingerprints: fingerprints,
        },
      },
    ]);
  });

  // Apple App Store Universal Links verification (must be application/json without file extension)
  app.get('/.well-known/apple-app-site-association', (_req, res) => {
    const teamId = String(process.env.APPLE_TEAM_ID || 'TEAMID').trim() || 'TEAMID';
    const bundleId =
      String(process.env.IOS_BUNDLE_ID || 'com.patofoot.manager2026').trim() ||
      'com.patofoot.manager2026';
    const appID = `${teamId}.${bundleId}`;

    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.json({
      applinks: {
        apps: [],
        details: [
          {
            appID,
            paths: ['/', '/site', '/site/*'],
          },
        ],
      },
      webcredentials: {
        apps: [appID],
      },
    });
  });

  // Domain-aware SEO endpoints (automatically adapt when mapped to any custom domain)
  app.get('/robots.txt', (req, res) => {
    const origin = resolvePublicOrigin(req);
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.send(`User-agent: *\nAllow: /\n\nSitemap: ${origin}/sitemap.xml\n`);
  });

  app.get('/sitemap.xml', (req, res) => {
    const origin = resolvePublicOrigin(req);
    const today = new Date().toISOString().slice(0, 10);
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${origin}/</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${origin}/site</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
  </url>
</urlset>
`;
    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.send(xml);
  });

  // Authenticated PostgreSQL Cloud SQL API routes (Firebase Auth ID token verification)
  const sqlSaveBodyParser = express.json({ limit: '16mb' });

  app.post('/api/sql/users/sync', requireAuth, async (req: AuthRequest, res) => {
    try {
      const tokenUser = req.user!;
      const body = (req.body || {}) as {
        displayName?: string;
        usernameKey?: string;
        favoriteClubId?: string;
      };
      const userRecord = await getOrCreateUser({
        uid: tokenUser.uid,
        email: tokenUser.email || `${tokenUser.uid}@acesso.patofoot.app`,
        displayName:
          typeof body.displayName === 'string' && body.displayName.trim().length >= 2
            ? body.displayName.trim()
            : tokenUser.name,
        usernameKey: typeof body.usernameKey === 'string' ? body.usernameKey : undefined,
        favoriteClubId:
          typeof body.favoriteClubId === 'string' ? body.favoriteClubId : undefined,
      });
      res.json({
        uid: userRecord.uid,
        displayName: userRecord.displayName,
        usernameKey: userRecord.usernameKey,
        favoriteClubId: userRecord.favoriteClubId,
      });
    } catch (error) {
      console.error('Failed to sync trainer profile:', error);
      res.status(500).json({ error: 'Failed to synchronize trainer account.' });
    }
  });

  app.patch('/api/sql/users/profile', requireAuth, async (req: AuthRequest, res) => {
    try {
      const tokenUser = req.user!;
      const body = (req.body || {}) as {
        displayName?: string;
        favoriteClubId?: string;
      };
      await getOrCreateUser({
        uid: tokenUser.uid,
        email: tokenUser.email || `${tokenUser.uid}@acesso.patofoot.app`,
        displayName: tokenUser.name,
      });
      const updated = await updateSqlUserProfile(tokenUser.uid, {
        displayName: typeof body.displayName === 'string' ? body.displayName : undefined,
        favoriteClubId:
          typeof body.favoriteClubId === 'string' ? body.favoriteClubId : undefined,
      });
      res.json({ ok: true, profile: updated });
    } catch (error) {
      console.error('Failed to update trainer profile:', error);
      res.status(500).json({ error: 'Failed to update trainer profile.' });
    }
  });

  app.get('/api/sql/saves', requireAuth, async (req: AuthRequest, res) => {
    try {
      const tokenUser = req.user!;
      const rows = await listUserSqlCareerSaveSummaries(tokenUser.uid);
      res.json({
        saves: rows.map((row) => ({
          slotId: row.slotId,
          clubId: row.clubId,
          clubName: row.clubName,
          clubShortName: row.clubShortName,
          clubPrimaryColor: row.clubPrimaryColor,
          clubSecondaryColor: row.clubSecondaryColor,
          division: row.division,
          managerName: row.managerName,
          seasonYear: row.seasonYear,
          round: row.round,
          currentDate: row.currentDate,
          clubBalance: row.clubBalance,
          partCount: 1,
          updatedAtIso:
            row.updatedAt instanceof Date
              ? row.updatedAt.toISOString()
              : new Date(row.updatedAt).toISOString(),
        })),
      });
    } catch (error) {
      console.error('Failed to list SQL career saves:', error);
      res.status(500).json({ error: 'Failed to load cloud career saves.' });
    }
  });

  app.get('/api/sql/saves/:slotId', requireAuth, async (req: AuthRequest, res) => {
    const slotId = String(req.params.slotId || '');
    if (!isValidSqlSlotId(slotId)) {
      res.status(400).json({ error: 'Invalid career slot ID.' });
      return;
    }
    try {
      const tokenUser = req.user!;
      const row = await getUserSqlCareerSave(tokenUser.uid, slotId);
      if (!row) {
        res.status(404).json({ error: 'Career save not found.' });
        return;
      }
      const inflated = zlib.gunzipSync(Buffer.from(row.payloadCompressed, 'base64')).toString('utf-8');
      const parsed = JSON.parse(inflated);
      res.json({ save: parsed });
    } catch (error) {
      console.error('Failed to load SQL career save:', error);
      res.status(500).json({ error: 'Failed to download cloud career save.' });
    }
  });

  app.put('/api/sql/saves/:slotId', sqlSaveBodyParser, requireAuth, async (req: AuthRequest, res) => {
    const slotId = String(req.params.slotId || '');
    if (!isValidSqlSlotId(slotId)) {
      res.status(400).json({ error: 'Invalid career slot ID.' });
      return;
    }
    const body = (req.body || {}) as {
      save?: Record<string, unknown>;
      summary?: {
        clubId?: string;
        clubName?: string;
        clubShortName?: string;
        clubPrimaryColor?: string;
        clubSecondaryColor?: string;
        division?: string;
        managerName?: string;
        seasonYear?: number;
        round?: number;
        currentDate?: string;
        clubBalance?: number;
        trophiesCount?: number;
        hallOfFamePoints?: number;
        winRatePct?: number;
      };
    };

    if (!body.save || typeof body.save !== 'object' || !Array.isArray(body.save.clubs)) {
      res.status(400).json({ error: 'Invalid career save payload.' });
      return;
    }

    try {
      const tokenUser = req.user!;
      const summary = body.summary || {};
      const managerName = String(summary.managerName || body.save.managerName || tokenUser.name || 'Treinador')
        .trim()
        .slice(0, 80);
      const clubId = String(summary.clubId || body.save.userClubId || 'fla').trim().slice(0, 40);

      const userRecord = await getOrCreateUser({
        uid: tokenUser.uid,
        email: tokenUser.email || `${tokenUser.uid}@acesso.patofoot.app`,
        displayName: managerName,
        favoriteClubId: clubId,
      });

      const rawJson = JSON.stringify(body.save);
      const payloadCompressed = zlib.gzipSync(Buffer.from(rawJson, 'utf-8'), { level: 6 }).toString('base64');

      const savedRow = await upsertUserSqlCareerSave({
        userId: userRecord.id,
        slotId,
        clubId,
        clubName: String(summary.clubName || 'Clube').trim().slice(0, 80),
        clubShortName: String(summary.clubShortName || 'CLB').trim().slice(0, 32),
        clubPrimaryColor: String(summary.clubPrimaryColor || '#10b981').slice(0, 16),
        clubSecondaryColor: String(summary.clubSecondaryColor || '#0f172a').slice(0, 16),
        division: String(summary.division || 'A').slice(0, 16),
        managerName,
        seasonYear: Math.max(2025, Math.min(2150, Math.round(Number(summary.seasonYear || 2026)))),
        round: Math.max(1, Math.min(120, Math.round(Number(summary.round || 1)))),
        currentDate: String(summary.currentDate || '2026-01-11').slice(0, 20),
        clubBalance: Number.isFinite(Number(summary.clubBalance)) ? Number(summary.clubBalance) : 0,
        payloadCompressed,
        trophiesCount: Number(summary.trophiesCount || 0),
        hallOfFamePoints: Number(summary.hallOfFamePoints || 0),
        winRatePct: Number(summary.winRatePct || 0),
      });

      res.json({
        summary: {
          slotId: savedRow.slotId,
          clubId: savedRow.clubId,
          clubName: savedRow.clubName,
          clubShortName: savedRow.clubShortName,
          clubPrimaryColor: savedRow.clubPrimaryColor,
          clubSecondaryColor: savedRow.clubSecondaryColor,
          division: savedRow.division,
          managerName: savedRow.managerName,
          seasonYear: savedRow.seasonYear,
          round: savedRow.round,
          currentDate: savedRow.currentDate,
          clubBalance: savedRow.clubBalance,
          partCount: 1,
          updatedAtIso:
            savedRow.updatedAt instanceof Date
              ? savedRow.updatedAt.toISOString()
              : new Date(savedRow.updatedAt).toISOString(),
        },
      });
    } catch (error) {
      console.error('Failed to upsert SQL career save:', error);
      res.status(500).json({ error: 'Failed to save career data to cloud.' });
    }
  });

  app.delete('/api/sql/saves/:slotId', requireAuth, async (req: AuthRequest, res) => {
    const slotId = String(req.params.slotId || '');
    if (!isValidSqlSlotId(slotId)) {
      res.status(400).json({ error: 'Invalid career slot ID.' });
      return;
    }
    try {
      const tokenUser = req.user!;
      await deleteUserSqlCareerSave(tokenUser.uid, slotId);
      res.json({ ok: true });
    } catch (error) {
      console.error('Failed to delete SQL career save:', error);
      res.status(500).json({ error: 'Failed to delete cloud career save.' });
    }
  });

  app.get('/api/sql/hall-of-fame', requireAuth, async (req: AuthRequest, res) => {
    try {
      const limit = Number(req.query.limit || 20);
      const entries = await listHallOfFameLeaderboard(limit);
      res.json({ entries });
    } catch (error) {
      console.error('Failed to load Hall of Fame entries:', error);
      res.status(500).json({ error: 'Failed to load Hall of Fame rankings.' });
    }
  });

  app.use('/api/auth', authRateLimiter);
  app.use(
    [
      '/api/players/nationalities',
      '/api/players/overalls',
      '/api/leagues/south-america/calibrate',
      '/api/leagues/europe/calibrate',
      '/api/leagues/world/calibrate',
      '/api/clubs/squads/october-2026',
      '/api/transfers/rumors',
    ],
    (req, res, next) => {
      if (req.method === 'POST') {
        aiRateLimiter(req, res, next);
        return;
      }
      next();
    },
  );

  app.post('/api/auth/register', (req, res) => {
    const rawName = String(req.body?.displayName ?? '').trim();
    const rawPassword = String(req.body?.password ?? '');
    const rawClubId = String(req.body?.favoriteClubId ?? 'fla').trim() || 'fla';

    if (rawName.length < 2 || rawName.length > 60) {
      res.status(400).json({
        error: 'INVALID_NAME',
        message: 'Informe seu nome ou login entre 2 e 60 caracteres.',
      });
      return;
    }

    const usernameKey = normalizeServerUsernameKey(rawName);
    if (usernameKey.length < 2) {
      res.status(400).json({
        error: 'INVALID_LOGIN',
        message: 'Use letras ou números válidos para criar seu login.',
      });
      return;
    }

    if (rawPassword.length < 4 || rawPassword.length > 128) {
      res.status(400).json({
        error: 'INVALID_PASSWORD',
        message: 'A senha deve ter pelo menos 4 caracteres.',
      });
      return;
    }

    const accounts = readTrainerAccounts();
    const existing = accounts.find((acc) => acc.usernameKey === usernameKey);
    if (existing) {
      res.status(409).json({
        error: 'ACCOUNT_EXISTS',
        message: 'Já existe um acesso cadastrado com esse nome/login. Clique em "Entrar no Jogo" e digite sua senha.',
      });
      return;
    }

    const saltHex = crypto.randomBytes(16).toString('hex');
    const passwordHash = hashPasswordWithSalt(rawPassword, saltHex);
    const nowIso = new Date().toISOString();
    const uid = `usr_${crypto.randomBytes(10).toString('hex')}`;
    const safeClubId = /^[a-zA-Z0-9_\-]{2,32}$/.test(rawClubId) ? rawClubId : 'fla';

    const newAccount: StoredTrainerAccount = {
      uid,
      displayName: rawName,
      usernameKey,
      passwordSalt: saltHex,
      passwordHash,
      favoriteClubId: safeClubId,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    accounts.push(newAccount);
    writeTrainerAccounts(accounts);

    res.status(201).json({
      uid: newAccount.uid,
      displayName: newAccount.displayName,
      usernameKey: newAccount.usernameKey,
      favoriteClubId: newAccount.favoriteClubId,
      createdAt: newAccount.createdAt,
      sessionToken: issueServerSessionToken(newAccount.uid),
    });
  });

  app.post('/api/auth/login', (req, res) => {
    const rawLogin = String(req.body?.login ?? '').trim();
    const rawPassword = String(req.body?.password ?? '');
    const usernameKey = normalizeServerUsernameKey(rawLogin);

    if (!usernameKey || usernameKey.length < 2) {
      res.status(400).json({
        error: 'INVALID_LOGIN',
        message: 'Digite seu nome ou login para entrar.',
      });
      return;
    }

    if (!rawPassword) {
      res.status(400).json({
        error: 'MISSING_PASSWORD',
        message: 'Digite sua senha para entrar no jogo.',
      });
      return;
    }

    const accounts = readTrainerAccounts();
    const found = accounts.find(
      (acc) =>
        acc.usernameKey === usernameKey ||
        acc.displayName.toLowerCase() === rawLogin.toLowerCase()
    );

    if (!found) {
      res.status(404).json({
        error: 'ACCOUNT_NOT_FOUND',
        message: 'Nenhum acesso encontrado com esse nome/login. Use a aba "Criar Acesso" para se cadastrar.',
      });
      return;
    }

    const isPasswordValid = verifyPasswordHash(
      rawPassword,
      found.passwordSalt,
      found.passwordHash
    );
    if (!isPasswordValid) {
      res.status(401).json({
        error: 'WRONG_PASSWORD',
        message: 'Senha incorreta. Confira a senha digitada e tente novamente.',
      });
      return;
    }

    res.json({
      uid: found.uid,
      displayName: found.displayName,
      usernameKey: found.usernameKey,
      favoriteClubId: found.favoriteClubId,
      createdAt: found.createdAt,
      sessionToken: issueServerSessionToken(found.uid),
    });
  });

  app.post('/api/auth/club', (req, res) => {
    const authenticatedUid = verifyServerSessionToken(req.headers.authorization);
    const uid = String(req.body?.uid ?? '').trim();
    const rawClubId = String(req.body?.favoriteClubId ?? '').trim();
    if (!authenticatedUid || !uid || authenticatedUid !== uid) {
      res.status(401).json({ error: 'UNAUTHORIZED' });
      return;
    }
    if (!/^[a-zA-Z0-9_\-]{2,32}$/.test(rawClubId)) {
      res.status(400).json({ error: 'INVALID_INPUT' });
      return;
    }
    const accounts = readTrainerAccounts();
    const idx = accounts.findIndex((acc) => acc.uid === authenticatedUid);
    if (idx >= 0) {
      accounts[idx] = {
        ...accounts[idx],
        favoriteClubId: rawClubId,
        updatedAt: new Date().toISOString(),
      };
      writeTrainerAccounts(accounts);
    }
    res.json({ ok: true });
  });

  app.get('/api/players/nationalities/status', (_req, res) => {
    const hasKey = Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim());
    res.json({
      configured: hasKey,
      cachedPlayers: resolvedNationalityCache.size,
      model: 'gemini-4-hydrogen',
    });
  });

  app.post('/api/players/nationalities', async (req, res) => {
    try {
      const rawPlayers = Array.isArray(req.body?.players)
        ? (req.body.players as PlayerNationalityInput[])
        : [];
      const forceRefresh = Boolean(req.body?.forceRefresh);

      if (rawPlayers.length === 0) {
        res.json({
          nationalities: {},
          resolvedCount: 0,
          cachedCount: 0,
          usedAi: false,
          usedGoogleSearch: false,
          groundingSources: [],
          model: 'gemini-4-hydrogen',
        });
        return;
      }

      // Limit single request size to protect latency (client batches in chunks of 50)
      const players = rawPlayers.slice(0, 120);
      const nationalitiesById: Record<string, string> = {};
      const uncached: PlayerNationalityInput[] = [];
      let cachedCount = 0;

      for (const p of players) {
        if (!p || !p.id || !p.name) continue;
        const cached = !forceRefresh ? resolvedNationalityCache.get(makeCacheKey(p)) : undefined;
        if (cached) {
          nationalitiesById[p.id] = cached;
          cachedCount += 1;
        } else {
          uncached.push(p);
        }
      }

      if (uncached.length === 0) {
        res.json({
          nationalities: nationalitiesById,
          resolvedCount: Object.keys(nationalitiesById).length,
          cachedCount,
          usedAi: true,
          usedGoogleSearch: false,
          groundingSources: [],
          model: 'gemini-4-hydrogen',
        });
        return;
      }

      const ai = getGenAIClient();
      if (!ai) {
        res.status(503).json({
          error: 'API_KEY_MISSING',
          message: 'Chave GEMINI_API_KEY não configurada no servidor.',
          nationalities: nationalitiesById,
          resolvedCount: Object.keys(nationalitiesById).length,
          cachedCount,
          usedAi: false,
          usedGoogleSearch: false,
          groundingSources: [],
        });
        return;
      }

      const groundingSourcesMap = new Map<string, GroundingSourceLink>();
      let usedGoogleSearch = false;
      let wroteNewCacheEntries = false;

      // Process in chunks of 50 players using Gemini 3.8 Flash + Google Search Grounding
      const CHUNK_SIZE = 50;
      for (let offset = 0; offset < uncached.length; offset += CHUNK_SIZE) {
        const batch = uncached.slice(offset, offset + CHUNK_SIZE);
        const promptLines = batch.map(
          (p) =>
            `- id="${p.id}" | nome="${p.name}" | clube="${p.clubName || 'Sem Clube'}" | pos="${
              p.role || ''
            }" | idade=${p.age || 25} | paisClube="${p.fallbackCountry || 'Brasil'}"`
        );

        const basePrompt = [
          'Pesquise e verifique na vida real a nacionalidade esportiva oficial FIFA (país de seleção principal que o atleta representa ou nasceu) de cada jogador de futebol listado abaixo.',
          'Regras estritas:',
          '1. Use a busca Google Search quando necessário para confirmar atletas naturalizados, dupla nacionalidade FIFA ou transferidos recentemente.',
          '2. Retorne o nome do país SEMPRE em português do Brasil (ex.: "Brasil", "Argentina", "Uruguai", "Paraguai", "Colômbia", "Equador", "Chile", "Venezuela", "Peru", "Bolívia", "Holanda", "França", "Espanha", "Portugal", "Angola", "Inglaterra", "Alemanha", "Itália", "Bélgica", "Croácia", "Suíça", "Noruega", "Sérvia", "Turquia", "Armênia", "Rússia", "Coreia do Sul", "Canadá", "Estados Unidos", "México", "Marrocos", "Senegal", "Nigéria", "Gana", "Costa do Marfim", "Camarões", "Egito", "Argélia", "Guiné", "Burkina Faso", "Gabão", "Tunísia", "RD Congo", "Palestina", "Albânia", "Uzbequistão", "Japão", "Áustria", "Dinamarca", "Suécia", "Polônia", "Grécia", "Escócia", "País de Gales", "Irlanda", "Ucrânia", "Geórgia", "Eslovênia", "Eslováquia", "República Tcheca", "Hungria", "Bósnia e Herzegovina", "Kosovo", "Israel", "Irã", "Cuba", "Arábia Saudita").',
          '3. Exemplos importantes de nacionalidade esportiva FIFA real: Iñaki Williams (Athletic) = "Gana"; Dean Huijsen, Robin Le Normand e Aymeric Laporte = "Espanha"; Matheus Nunes (Man City) = "Portugal"; Matty Cash (Aston Villa) = "Polônia"; Johnny Cardoso e Malik Tillman = "Estados Unidos"; Rayan Aït-Nouri, Amine Gouiri e Anis Hadj Moussa = "Argélia"; Serhou Guirassy = "Guiné"; Edmond Tapsoba = "Burkina Faso"; Bryan Mbeumo e Zambo Anguissa = "Camarões"; Amir Rrahmani = "Kosovo"; Matías Zaldivia = "Chile"; Guillermo Viscarra, Marc Enoumba e Luciano Ursino = "Bolívia"; Claudio Aquino = "Paraguai"; Bastos (Botafogo) = "Angola"; Rossi (Flamengo) = "Argentina"; Arrascaeta e De La Cruz = "Uruguai".',
          '4. Caso o nome seja claramente genérico/fictício sem atleta real correspondente, mantenha paisClube.',
          '5. Responda APENAS um array JSON puro no formato exato [{"id":"...","nationality":"..."}], sem texto extra antes ou depois.',
          '',
          'Jogadores para pesquisar:',
          ...promptLines,
        ].join('\n');

        let parsed: Array<{ id: string; nationality: string }> | null = null;
        let hitQuotaLimit = false;

        const groundedResult = await generateGroundedIfAvailable(
          ai,
          basePrompt,
          'Você é um pesquisador oficial de dados FIFA e scouting mundial. Utilize Google Search para confirmar a seleção/nacionalidade real de cada jogador de futebol e retorne estritamente um JSON array [{"id":"...","nationality":"..."}] em português do Brasil.'
        );

        if (groundedResult) {
          const chunks =
            groundedResult.response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
          for (const ch of chunks) {
            const uri = ch.web?.uri;
            const title = ch.web?.title;
            if (uri && !groundingSourcesMap.has(uri)) {
              usedGoogleSearch = true;
              groundingSourcesMap.set(uri, {
                uri,
                title: (title || 'Fonte Web').trim(),
              });
            }
          }

          parsed = extractJsonArrayFromText(groundedResult.response.text || '');
        }

        // Structured schema fallback if grounded text wasn't available or couldn't be parsed as JSON
        if (!parsed || parsed.length === 0) {
          const structuredResult = await generateStructuredWithFallback(ai, basePrompt, {
            systemInstruction:
              'Você é um especialista enciclopédico em futebol brasileiro, sul-americano e internacional. Responda exclusivamente em JSON válido seguindo o schema solicitado.',
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: {
                    type: Type.STRING,
                    description: 'O mesmo id exato do jogador enviado na entrada.',
                  },
                  nationality: {
                    type: Type.STRING,
                    description: 'Nome do país da nacionalidade real FIFA em português do Brasil.',
                  },
                },
                required: ['id', 'nationality'],
              },
            },
          });

          if (!structuredResult) {
            hitQuotaLimit = true;
          } else {
            parsed = extractJsonArrayFromText(structuredResult.response.text || '[]');
          }
        }

        if (Array.isArray(parsed)) {
          const inputById = new Map<string, PlayerNationalityInput>(batch.map((b) => [b.id, b]));
          for (const item of parsed) {
            if (!item || !item.id || !item.nationality) continue;
            const cleanCountry = String(item.nationality).trim();
            if (!cleanCountry) continue;
            nationalitiesById[item.id] = cleanCountry;
            const orig = inputById.get(item.id);
            if (orig) {
              resolvedNationalityCache.set(makeCacheKey(orig), cleanCountry);
              wroteNewCacheEntries = true;
            }
          }
        }

        if (hitQuotaLimit) {
          if (wroteNewCacheEntries) {
            savePersistedNationalityCache();
          }
          res.json({
            nationalities: nationalitiesById,
            resolvedCount: Object.keys(nationalitiesById).length,
            cachedCount,
            usedAi: Object.keys(nationalitiesById).length > cachedCount,
            quotaLimited: true,
            usedGoogleSearch,
            groundingSources: Array.from(groundingSourcesMap.values()).slice(0, 10),
            model: PRIMARY_GEMINI_MODEL,
          });
          return;
        }
      }

      if (wroteNewCacheEntries) {
        savePersistedNationalityCache();
      }

      res.json({
        nationalities: nationalitiesById,
        resolvedCount: Object.keys(nationalitiesById).length,
        cachedCount,
        usedAi: true,
        usedGoogleSearch,
        groundingSources: Array.from(groundingSourcesMap.values()).slice(0, 10),
        model: PRIMARY_GEMINI_MODEL,
      });
    } catch (err: unknown) {
      if (isGeminiQuotaError(err)) {
        res.json({
          nationalities: {},
          resolvedCount: 0,
          cachedCount: 0,
          usedAi: false,
          quotaLimited: true,
          usedGoogleSearch: false,
          groundingSources: [],
        });
        return;
      }
      const msg = err instanceof Error ? err.message : String(err);
      console.error('[Gemini Nationality API Error]:', msg);
      res.status(500).json({
        error: 'AI_REQUEST_FAILED',
        message: 'Não foi possível consultar a IA no momento; mantendo nacionalidades verificadas locais.',
      });
    }
  });

  app.post('/api/players/overalls', async (req, res) => {
    try {
      const rawPlayers = Array.isArray(req.body?.players)
        ? (req.body.players as PlayerOverallInput[])
        : [];

      if (rawPlayers.length === 0) {
        res.json({
          overalls: {},
          resolvedCount: 0,
          cachedCount: 0,
          usedAi: false,
          model: 'gemini-4-hydrogen',
        });
        return;
      }

      const players = rawPlayers.slice(0, 180);
      const overallsById: Record<string, number> = {};
      const uncached: PlayerOverallInput[] = [];
      let cachedCount = 0;

      for (const p of players) {
        if (!p || !p.id || !p.name) continue;
        const cached = resolvedOverallCache.get(makeOverallCacheKey(p));
        if (typeof cached === 'number') {
          overallsById[p.id] = cached;
          cachedCount += 1;
        } else {
          uncached.push(p);
        }
      }

      if (uncached.length === 0) {
        res.json({
          overalls: overallsById,
          resolvedCount: Object.keys(overallsById).length,
          cachedCount,
          usedAi: true,
          model: 'gemini-4-hydrogen',
        });
        return;
      }

      const ai = getGenAIClient();
      if (!ai) {
        res.status(503).json({
          error: 'API_KEY_MISSING',
          message: 'Chave GEMINI_API_KEY não configurada no servidor.',
          overalls: overallsById,
          resolvedCount: Object.keys(overallsById).length,
          cachedCount,
          usedAi: false,
        });
        return;
      }

      const CHUNK_SIZE = 60;
      for (let offset = 0; offset < uncached.length; offset += CHUNK_SIZE) {
        const batch = uncached.slice(offset, offset + CHUNK_SIZE);
        const promptLines = batch.map(
          (p) =>
            `- id="${p.id}" | nome="${p.name}" | clube="${p.clubName || 'Sem Clube'}" | div="${
              p.division || 'A'
            }" | rep=${p.reputation || 3} | pos="${p.role || 'MEI'}" | idade=${
              p.age || 25
            } | titular=${p.isStarter ? 'sim' : 'nao'} | atual=${p.currentOverall || 70}`
        );

        const structuredResult = await generateStructuredWithFallback(
          ai,
          [
            'Defina o Overall (força geral de 48 a 93) realista de cada jogador listado abaixo, seguindo rigorosamente a hierarquia real do futebol mundial, europeu, brasileiro e sul-americano (padrão EA FC / Football Manager 2026):',
            'Regras estritas de escala por divisão e nível real:',
            '1. EUROPA (div="EU"): Superestrelas mundiais de Real Madrid, Man City, Liverpool, Arsenal, Barcelona, Bayern, Inter, PSG (ex.: Mbappé, Haaland, Vinícius Jr., Rodri, Salah, Saka, Bellingham, Kane, Lamine Yamal, Vitinha) = 86 a 92. Titulares fortes da Premier League/LaLiga/Serie A/Bundesliga/Ligue 1 = 78 a 85. Titulares de Portugal/Holanda/Bélgica/Turquia/Grécia ou clubes médios das Top 5 = 71 a 80. EFL Championship (2ª Inglaterra) = 67 a 76. EFL League One (3ª Inglaterra) = 60 a 69. EFL League Two (4ª Inglaterra) = 54 a 64.',
            '2. SÉRIE A BRASIL (div="A"): Craques absolutos do continente (ex.: Pedro, Arrascaeta, Estêvão, Neymar, Raphael Veiga, Hulk, Gerson, Luiz Henrique, Memphis Depay, Rodrigo Garro, Alan Patrick, Jhon Arias) = 82 a 86. Titulares fortes de clubes G-6/G-12 = 77 a 81. Titulares médios/clubes menores da Série A = 72 a 76. Reservas da Série A = 67 a 74.',
            '3. AMÉRICA DO SUL (div="SA", 9 ligas CONMEBOL): Estrelas de River Plate, Boca Juniors, Racing, Vélez, Peñarol, Nacional, Atl. Nacional, IDV, LDU, Colo-Colo, Olimpia = 76 a 82. Titulares médios da Argentina/Colômbia/Uruguai/Equador/Chile/Paraguai = 68 a 75. Titulares de clubes menores do Peru/Bolívia/Venezuela = 62 a 69. Reservas = 58 a 68.',
            '4. LIGAS MUNDIAIS (div="WL" — América do Norte EUA/México, Ásia/Rússia Arábia Saudita/Japão/Rússia e África Egito/Marrocos): Superestrelas globais (ex.: Lionel Messi, Cristiano Ronaldo, Benzema, Theo Hernández, Rúben Neves, Bounou, Cancelo, Son Heung-min, Rodrigo De Paul) = 83 a 89. Destaques de Al-Hilal, Al-Nassr, Al-Ittihad, Al-Ahli, Inter Miami, Club América, Monterrey, Zenit, Krasnodar, Spartak, Al Ahly, Vissel Kobe = 77 a 83. Titulares médios da MLS, Liga MX, Saudi Pro League, J1 League, Premier Liga Russa, Egito e Botola Pro = 70 a 77. Clubes menores e reservas = 62 a 70.',
            '5. SÉRIE B (div="B"): Destaques da divisão = 71 a 75. Titulares médios da Série B = 66 a 71. Reservas = 60 a 66.',
            '6. SÉRIE C (div="C"): Destaques da Série C = 64 a 67. Titulares comuns = 60 a 64. Reservas = 55 a 60.',
            '7. SÉRIE D (div="D"): Destaques da Série D = 58 a 62. Titulares comuns = 53 a 58. Reservas = 48 a 54.',
            '8. Respeite a posição (GOL, ZAG, LAT, VOL, MEI, ATA) e o momento real da carreira em 2026 conforme a idade.',
            '',
            'Jogadores para calibrar:',
            ...promptLines,
          ].join('\n'),
          {
            systemInstruction:
              'Você é o head scout chefe de ratings do futebol mundial (UEFA e CONMEBOL) em 2026. Retorne exclusivamente JSON válido conforme o schema solicitado, com números inteiros realistas e equilibrados entre as divisões.',
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: {
                    type: Type.STRING,
                    description: 'O mesmo id exato do jogador enviado na entrada.',
                  },
                  overall: {
                    type: Type.INTEGER,
                    description: 'Overall realista inteiro entre 48 e 93.',
                  },
                },
                required: ['id', 'overall'],
              },
            },
          }
        );

        if (!structuredResult) {
          res.json({
            overalls: overallsById,
            resolvedCount: Object.keys(overallsById).length,
            cachedCount,
            usedAi: Object.keys(overallsById).length > cachedCount,
            quotaLimited: true,
            model: PRIMARY_GEMINI_MODEL,
          });
          return;
        }

        const rawText = structuredResult.response.text || '[]';
        const parsed = JSON.parse(rawText) as Array<{ id: string; overall: number }>;

        if (Array.isArray(parsed)) {
          const inputById = new Map<string, PlayerOverallInput>(batch.map((b) => [b.id, b]));
          for (const item of parsed) {
            if (!item || !item.id || typeof item.overall !== 'number') continue;
            const clamped = Math.max(48, Math.min(93, Math.round(item.overall)));
            overallsById[item.id] = clamped;
            const orig = inputById.get(item.id);
            if (orig) {
              resolvedOverallCache.set(makeOverallCacheKey(orig), clamped);
            }
          }
        }
      }

      res.json({
        overalls: overallsById,
        resolvedCount: Object.keys(overallsById).length,
        cachedCount,
        usedAi: true,
        model: PRIMARY_GEMINI_MODEL,
      });
    } catch (err: unknown) {
      if (isGeminiQuotaError(err)) {
        res.json({
          overalls: {},
          resolvedCount: 0,
          cachedCount: 0,
          usedAi: false,
          quotaLimited: true,
        });
        return;
      }
      const msg = err instanceof Error ? err.message : String(err);
      console.error('[Gemini Overalls API Error]:', msg);
      res.status(500).json({
        error: 'AI_REQUEST_FAILED',
        message: 'Não foi possível calibrar via IA agora; mantendo curva realista local.',
      });
    }
  });

  app.post('/api/leagues/south-america/calibrate', async (req, res) => {
    try {
      const leagueId = String(req.body?.leagueId ?? '').trim();
      const country = String(req.body?.country ?? 'América do Sul').trim();
      const leagueName = String(req.body?.leagueName ?? 'Liga Sul-Americana').trim();
      const forceRefresh = Boolean(req.body?.forceRefresh);
      const rawClubs = Array.isArray(req.body?.clubs)
        ? (req.body.clubs as SouthAmericaClubCalibrationInput[]).slice(0, 22)
        : [];

      if (rawClubs.length === 0) {
        res.json({
          leagueId,
          clubs: [],
          usedAi: false,
          model: 'gemini-4-hydrogen',
        });
        return;
      }

      const calibratedResults: CalibratedSouthAmericaClubOutput[] = [];
      const uncachedClubs: SouthAmericaClubCalibrationInput[] = [];

      for (const c of rawClubs) {
        if (!c || !c.id || !c.name) continue;
        const cached = !forceRefresh ? resolvedSouthAmericaClubCache.get(c.id) : undefined;
        if (cached) {
          calibratedResults.push(cached);
        } else {
          uncachedClubs.push(c);
        }
      }

      if (uncachedClubs.length === 0) {
        res.json({
          leagueId,
          clubs: calibratedResults,
          usedAi: true,
          cached: true,
          model: 'gemini-4-hydrogen',
        });
        return;
      }

      const ai = getGenAIClient();
      if (!ai) {
        res.status(503).json({
          error: 'API_KEY_MISSING',
          message: 'Chave GEMINI_API_KEY não configurada no servidor.',
          leagueId,
          clubs: calibratedResults,
          usedAi: false,
        });
        return;
      }

      const CHUNK_SIZE = 10;
      const validRoles = new Set(['GOL', 'ZAG', 'LAT', 'VOL', 'MEI', 'ATA']);

      for (let offset = 0; offset < uncachedClubs.length; offset += CHUNK_SIZE) {
        const batch = uncachedClubs.slice(offset, offset + CHUNK_SIZE);
        const clubLines = batch.map(
          (c) => `- clubId="${c.id}" | clube="${c.name}" | pais="${country}" | rep=${c.reputation || 3}`
        );

        const structuredResult = await generateStructuredWithFallback(
          ai,
          [
            `Calibre com fidelidade à vida real (temporada 2025/2026) os clubes abaixo da ${leagueName} (${country} - CONMEBOL).`,
            'Regras obrigatórias:',
            '1. Informe o nome real do treinador atual ou mais emblemático recente de cada clube em managerName.',
            '2. Defina os níveis realistas de Defesa (def), Meio-campo (mei) e Ataque (ata) na escala 58 a 83:',
            '   - Gigantes continentais (River Plate, Boca Juniors, Racing, Vélez, Peñarol, Nacional, Atl. Nacional, IDV, LDU, Colo-Colo, Olimpia): 74 a 82.',
            '   - Clubes tradicionais competitivos da Argentina, Colômbia, Uruguai, Equador, Chile e Paraguai: 68 a 75.',
            '   - Clubes médios/menores do Peru, Bolívia, Venezuela, Chile, Uruguai, Paraguai, Equador e Colômbia: 61 a 69.',
            '3. Para cada clube, liste 3 jogadores titulares reais atuais em keyPlayers com: name (nome conhecido real), role estritamente entre "GOL", "ZAG", "LAT", "VOL", "MEI" ou "ATA", age (idade real aproximada 17-41), overall (58 a 83 coerente com o clube) e nationality (país em português do Brasil, ex.: "Argentina", "Colômbia", "Uruguai", "Paraguai", "Chile", "Equador", "Peru", "Bolívia", "Venezuela", "Brasil").',
            '',
            'Clubes para calibrar:',
            ...clubLines,
          ].join('\n'),
          {
            systemInstruction:
              'Você é o diretor chefe de scouting sul-americano (CONMEBOL) especialista nas 10 ligas nacionais da América do Sul. Responda exclusivamente em JSON válido seguindo o schema.',
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  clubId: { type: Type.STRING },
                  managerName: { type: Type.STRING },
                  def: { type: Type.INTEGER },
                  mei: { type: Type.INTEGER },
                  ata: { type: Type.INTEGER },
                  keyPlayers: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        name: { type: Type.STRING },
                        role: { type: Type.STRING },
                        age: { type: Type.INTEGER },
                        overall: { type: Type.INTEGER },
                        nationality: { type: Type.STRING },
                      },
                      required: ['name', 'role', 'age', 'overall', 'nationality'],
                    },
                  },
                },
                required: ['clubId', 'managerName', 'def', 'mei', 'ata', 'keyPlayers'],
              },
            },
          }
        );

        if (!structuredResult) {
          res.json({
            leagueId,
            clubs: calibratedResults,
            usedAi: calibratedResults.length > 0,
            quotaLimited: true,
            cached: false,
            model: PRIMARY_GEMINI_MODEL,
          });
          return;
        }

        const rawText = structuredResult.response.text || '[]';
        const parsed = JSON.parse(rawText) as CalibratedSouthAmericaClubOutput[];

        if (Array.isArray(parsed)) {
          for (const item of parsed) {
            if (!item || !item.clubId) continue;
            const sanitized: CalibratedSouthAmericaClubOutput = {
              clubId: item.clubId,
              managerName: String(item.managerName || '').trim() || 'Treinador Principal',
              def: Math.max(58, Math.min(84, Math.round(Number(item.def) || 68))),
              mei: Math.max(58, Math.min(84, Math.round(Number(item.mei) || 68))),
              ata: Math.max(58, Math.min(84, Math.round(Number(item.ata) || 68))),
              keyPlayers: Array.isArray(item.keyPlayers)
                ? item.keyPlayers.slice(0, 4).map((kp) => {
                    const normRole = String(kp.role || 'MEI').toUpperCase().trim();
                    const safeRole = (validRoles.has(normRole) ? normRole : 'MEI') as
                      | 'GOL'
                      | 'ZAG'
                      | 'LAT'
                      | 'VOL'
                      | 'MEI'
                      | 'ATA';
                    return {
                      name: String(kp.name || '').trim(),
                      role: safeRole,
                      age: Math.max(17, Math.min(42, Math.round(Number(kp.age) || 26))),
                      overall: Math.max(58, Math.min(85, Math.round(Number(kp.overall) || 70))),
                      nationality: String(kp.nationality || country).trim() || country,
                    };
                  }).filter((kp) => kp.name.length >= 2)
                : [],
            };
            resolvedSouthAmericaClubCache.set(sanitized.clubId, sanitized);
            calibratedResults.push(sanitized);
          }
        }
      }

      res.json({
        leagueId,
        clubs: calibratedResults,
        usedAi: true,
        cached: false,
        model: PRIMARY_GEMINI_MODEL,
      });
    } catch (err: unknown) {
      if (isGeminiQuotaError(err)) {
        res.json({
          leagueId: String(req.body?.leagueId ?? ''),
          clubs: [],
          usedAi: false,
          quotaLimited: true,
        });
        return;
      }
      const msg = err instanceof Error ? err.message : String(err);
      console.error('[Gemini South America League Calibration Error]:', msg);
      res.status(500).json({
        error: 'AI_REQUEST_FAILED',
        message: 'Não foi possível calibrar a liga sul-americana via IA neste momento.',
      });
    }
  });

  app.post('/api/leagues/europe/calibrate', async (req, res) => {
    try {
      const leagueId = String(req.body?.leagueId ?? '').trim();
      const country = String(req.body?.country ?? 'Europa').trim();
      const leagueName = String(req.body?.leagueName ?? 'Liga Europeia').trim();
      const tier = Math.max(1, Math.min(4, Number(req.body?.tier) || 1));
      const forceRefresh = Boolean(req.body?.forceRefresh);
      const rawClubs = Array.isArray(req.body?.clubs)
        ? (req.body.clubs as EuropeClubCalibrationInput[]).slice(0, 26)
        : [];

      if (rawClubs.length === 0) {
        res.json({
          leagueId,
          clubs: [],
          usedAi: false,
          model: 'gemini-4-hydrogen',
        });
        return;
      }

      const calibratedResults: CalibratedEuropeClubOutput[] = [];
      const uncachedClubs: EuropeClubCalibrationInput[] = [];

      for (const c of rawClubs) {
        if (!c || !c.id || !c.name) continue;
        const cached = !forceRefresh ? resolvedEuropeClubCache.get(c.id) : undefined;
        if (cached) {
          calibratedResults.push(cached);
        } else {
          uncachedClubs.push(c);
        }
      }

      if (uncachedClubs.length === 0) {
        res.json({
          leagueId,
          clubs: calibratedResults,
          usedAi: true,
          cached: true,
          model: 'gemini-4-hydrogen',
        });
        return;
      }

      const ai = getGenAIClient();
      if (!ai) {
        res.status(503).json({
          error: 'API_KEY_MISSING',
          message: 'Chave GEMINI_API_KEY não configurada no servidor.',
          leagueId,
          clubs: calibratedResults,
          usedAi: false,
        });
        return;
      }

      const minSector = tier === 4 ? 54 : tier === 3 ? 58 : tier === 2 ? 65 : 67;
      const maxSector = tier === 4 ? 66 : tier === 3 ? 72 : tier === 2 ? 78 : 91;

      const CHUNK_SIZE = 12;
      const validRoles = new Set(['GOL', 'ZAG', 'LAT', 'VOL', 'MEI', 'ATA']);

      for (let offset = 0; offset < uncachedClubs.length; offset += CHUNK_SIZE) {
        const batch = uncachedClubs.slice(offset, offset + CHUNK_SIZE);
        const clubLines = batch.map(
          (c) => `- clubId="${c.id}" | clube="${c.name}" | pais="${country}" | divisao=${tier}ª | rep=${c.reputation || 3}`
        );

        const structuredResult = await generateStructuredWithFallback(
          ai,
          [
            `Calibre com fidelidade à temporada europeia 2025/2026 os clubes abaixo da ${leagueName} (${country} - ${tier}ª Divisão UEFA).`,
            'Regras obrigatórias de atualização 2026:',
            '1. Informe o nome real do técnico atual em 2025/2026 de cada clube em managerName.',
            `2. Defina os níveis realistas de Defesa (def), Meio-campo (mei) e Ataque (ata) estritamente na faixa ${minSector} a ${maxSector}:`,
            '   - Gigantes da Champions League (Real Madrid, Man City, Liverpool, Arsenal, Barcelona, Bayern, Inter, PSG): 84 a 90.',
            '   - Fortes das Top 5 ligas (Atlético Madrid, Chelsea, Aston Villa, Newcastle, Tottenham, Napoli, Milan, Juventus, Leverkusen, Dortmund, Marseille, Monaco) e gigantes de Portugal/Holanda/Turquia (Sporting, Benfica, Porto, PSV, Galatasaray, Fenerbahçe): 77 a 84.',
            '   - Clubes médios/menores da 1ª Divisão Europeia (Espanha, Itália, Alemanha, França, Portugal, Holanda, Bélgica, Turquia, Grécia): 68 a 77.',
            '   - EFL Championship (2ª Inglaterra): 66 a 76. EFL League One (3ª Inglaterra): 59 a 69. EFL League Two (4ª Inglaterra): 55 a 63.',
            `3. Para cada clube, liste 4 jogadores titulares reais do elenco 2025/2026 em keyPlayers com: name (nome conhecido real), role estritamente entre "GOL", "ZAG", "LAT", "VOL", "MEI" ou "ATA", age (idade em 2026 entre 16 e 41), overall (${minSector} a ${maxSector + 1} coerente com a divisão) e nationality (país em português do Brasil, ex.: "Inglaterra", "Espanha", "França", "Alemanha", "Itália", "Portugal", "Holanda", "Bélgica", "Turquia", "Grécia", "Brasil", "Argentina", "Noruega", "Egito").`,
            '',
            'Clubes para calibrar:',
            ...clubLines,
          ].join('\n'),
          {
            systemInstruction:
              'Você é o diretor chefe de scouting europeu (UEFA) especialista na temporada 2025/2026 das 4 divisões da Inglaterra e das primeiras divisões da Alemanha, França, Espanha, Itália, Portugal, Holanda, Bélgica, Turquia e Grécia. Responda exclusivamente em JSON válido seguindo o schema.',
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  clubId: { type: Type.STRING },
                  managerName: { type: Type.STRING },
                  def: { type: Type.INTEGER },
                  mei: { type: Type.INTEGER },
                  ata: { type: Type.INTEGER },
                  keyPlayers: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        name: { type: Type.STRING },
                        role: { type: Type.STRING },
                        age: { type: Type.INTEGER },
                        overall: { type: Type.INTEGER },
                        nationality: { type: Type.STRING },
                      },
                      required: ['name', 'role', 'age', 'overall', 'nationality'],
                    },
                  },
                },
                required: ['clubId', 'managerName', 'def', 'mei', 'ata', 'keyPlayers'],
              },
            },
          }
        );

        if (!structuredResult) {
          res.json({
            leagueId,
            clubs: calibratedResults,
            usedAi: calibratedResults.length > 0,
            quotaLimited: true,
            cached: false,
            model: PRIMARY_GEMINI_MODEL,
          });
          return;
        }

        const rawText = structuredResult.response.text || '[]';
        const parsed = JSON.parse(rawText) as CalibratedEuropeClubOutput[];

        if (Array.isArray(parsed)) {
          for (const item of parsed) {
            if (!item || !item.clubId) continue;
            const sanitized: CalibratedEuropeClubOutput = {
              clubId: item.clubId,
              managerName: String(item.managerName || '').trim() || 'Treinador Principal',
              def: Math.max(minSector, Math.min(maxSector, Math.round(Number(item.def) || 72))),
              mei: Math.max(minSector, Math.min(maxSector, Math.round(Number(item.mei) || 72))),
              ata: Math.max(minSector, Math.min(maxSector, Math.round(Number(item.ata) || 72))),
              keyPlayers: Array.isArray(item.keyPlayers)
                ? item.keyPlayers
                    .slice(0, 5)
                    .map((kp) => {
                      const normRole = String(kp.role || 'MEI').toUpperCase().trim();
                      const safeRole = (validRoles.has(normRole) ? normRole : 'MEI') as
                        | 'GOL'
                        | 'ZAG'
                        | 'LAT'
                        | 'VOL'
                        | 'MEI'
                        | 'ATA';
                      return {
                        name: String(kp.name || '').trim(),
                        role: safeRole,
                        age: Math.max(16, Math.min(42, Math.round(Number(kp.age) || 26))),
                        overall: Math.max(
                          minSector - 2,
                          Math.min(maxSector + 2, Math.round(Number(kp.overall) || 74))
                        ),
                        nationality: String(kp.nationality || country).trim() || country,
                      };
                    })
                    .filter((kp) => kp.name.length >= 2)
                : [],
            };
            resolvedEuropeClubCache.set(sanitized.clubId, sanitized);
            calibratedResults.push(sanitized);
          }
        }
      }

      res.json({
        leagueId,
        clubs: calibratedResults,
        usedAi: true,
        cached: false,
        model: PRIMARY_GEMINI_MODEL,
      });
    } catch (err: unknown) {
      if (isGeminiQuotaError(err)) {
        res.json({
          leagueId: String(req.body?.leagueId ?? ''),
          clubs: [],
          usedAi: false,
          quotaLimited: true,
        });
        return;
      }
      const msg = err instanceof Error ? err.message : String(err);
      console.error('[Gemini Europe League Calibration Error]:', msg);
      res.status(500).json({
        error: 'AI_REQUEST_FAILED',
        message: 'Não foi possível calibrar a liga europeia via IA neste momento.',
      });
    }
  });

  app.post('/api/leagues/world/calibrate', async (req, res) => {
    try {
      const leagueId = String(req.body?.leagueId ?? '').trim();
      const country = String(req.body?.country ?? 'Internacional').trim();
      const leagueName = String(req.body?.leagueName ?? 'Liga Mundial').trim();
      const forceRefresh = Boolean(req.body?.forceRefresh);
      const rawClubs = Array.isArray(req.body?.clubs)
        ? (req.body.clubs as WorldClubCalibrationInput[]).slice(0, 24)
        : [];

      if (rawClubs.length === 0) {
        res.json({
          leagueId,
          clubs: [],
          usedAi: false,
          model: 'gemini-4-hydrogen',
        });
        return;
      }

      const calibratedResults: CalibratedWorldClubOutput[] = [];
      const uncachedClubs: WorldClubCalibrationInput[] = [];

      for (const c of rawClubs) {
        if (!c || !c.id || !c.name) continue;
        const cached = !forceRefresh ? resolvedWorldClubCache.get(c.id) : undefined;
        if (cached) {
          calibratedResults.push(cached);
        } else {
          uncachedClubs.push(c);
        }
      }

      if (uncachedClubs.length === 0) {
        res.json({
          leagueId,
          clubs: calibratedResults,
          usedAi: true,
          cached: true,
          model: 'gemini-4-hydrogen',
        });
        return;
      }

      const ai = getGenAIClient();
      if (!ai) {
        res.status(503).json({
          error: 'API_KEY_MISSING',
          message: 'Chave GEMINI_API_KEY não configurada no servidor.',
          leagueId,
          clubs: calibratedResults,
          usedAi: false,
        });
        return;
      }

      const minSector = 65;
      const maxSector = 87;
      const CHUNK_SIZE = 10;
      const validRoles = new Set(['GOL', 'ZAG', 'LAT', 'VOL', 'MEI', 'ATA']);

      for (let offset = 0; offset < uncachedClubs.length; offset += CHUNK_SIZE) {
        const batch = uncachedClubs.slice(offset, offset + CHUNK_SIZE);
        const clubLines = batch.map(
          (c) => `- clubId="${c.id}" | clube="${c.name}" | pais="${country}" | rep=${c.reputation || 3}`
        );

        const basePrompt = [
          `Pesquise e calibre com fidelidade à temporada atual de 2026 os clubes abaixo da ${leagueName} (${country}).`,
          'Regras obrigatórias de atualização 2026:',
          '1. Informe o nome real do técnico atual em 2026 de cada clube em managerName.',
          `2. Defina os níveis realistas de Defesa (def), Meio-campo (mei) e Ataque (ata) estritamente na faixa ${minSector} a ${maxSector}:`,
          '   - Potências Sauditas / Norte-Americanas / Russas (Al-Hilal, Al-Nassr, Al-Ittihad, Al-Ahli, Inter Miami, Club América, Monterrey, Cruz Azul, Zenit, Krasnodar, Spartak Moscou): 78 a 86.',
          '   - Gigantes do Japão e da África (Vissel Kobe, Sanfrecce Hiroshima, Kashima Antlers, Yokohama F. Marinos, Al Ahly, Pyramids, Zamalek, Raja Casablanca, Wydad Casablanca, AS FAR, RS Berkane) e fortes de MLS/Liga MX/Rússia: 74 a 81.',
          '   - Clubes médios/menores dessas ligas nacionais: 66 a 74.',
          `3. Para cada clube, liste 4 jogadores titulares reais do elenco de 2026 em keyPlayers com: name (nome conhecido real), role estritamente entre "GOL", "ZAG", "LAT", "VOL", "MEI" ou "ATA", age (idade em 2026 entre 17 e 42), overall (${minSector} a ${maxSector + 2}) e nationality (país em português do Brasil, ex.: "Estados Unidos", "México", "Arábia Saudita", "Japão", "Rússia", "Egito", "Marrocos", "Argentina", "Brasil", "Portugal", "França", "Espanha", "Uruguai", "Colômbia", "Senegal", "Coreia do Sul").`,
          '4. Retorne APENAS JSON puro no formato exato de array de objetos seguindo as chaves clubId, managerName, def, mei, ata e keyPlayers.',
          '',
          'Clubes para calibrar:',
          ...clubLines,
        ].join('\n');

        let parsed: CalibratedWorldClubOutput[] | null = null;

        const groundedWorldResult = await generateGroundedIfAvailable(
          ai,
          basePrompt,
          'Você é o diretor global de scouting FIFA especialista na temporada 2026 da MLS (EUA), Liga MX (México), Saudi Pro League (Arábia Saudita), J1 League (Japão), Premier Liga (Rússia), Liga Egípcia e Botola Pro (Marrocos). Use Google Search para verificar elencos e técnicos atuais de 2026 e responda estritamente um array JSON válido.'
        );

        if (groundedWorldResult) {
          const cleaned = (groundedWorldResult.response.text || '')
            .replace(/```json/gi, '')
            .replace(/```/g, '')
            .trim();
          const startIdx = cleaned.indexOf('[');
          const endIdx = cleaned.lastIndexOf(']');
          if (startIdx !== -1 && endIdx > startIdx) {
            try {
              const candidate = JSON.parse(cleaned.slice(startIdx, endIdx + 1));
              if (Array.isArray(candidate) && candidate.length > 0) {
                parsed = candidate as CalibratedWorldClubOutput[];
              }
            } catch {
              // Fall through to structured schema
            }
          }
        }

        // Structured schema fallback
        if (!parsed || parsed.length === 0) {
          const structuredWorldResult = await generateStructuredWithFallback(ai, basePrompt, {
            systemInstruction:
              'Você é o diretor global de scouting FIFA especialista na temporada 2026 da América do Norte (EUA e México), Ásia/Rússia (Arábia Saudita, Japão e Rússia) e África (Egito e Marrocos). Responda exclusivamente em JSON válido seguindo o schema.',
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  clubId: { type: Type.STRING },
                  managerName: { type: Type.STRING },
                  def: { type: Type.INTEGER },
                  mei: { type: Type.INTEGER },
                  ata: { type: Type.INTEGER },
                  keyPlayers: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        name: { type: Type.STRING },
                        role: { type: Type.STRING },
                        age: { type: Type.INTEGER },
                        overall: { type: Type.INTEGER },
                        nationality: { type: Type.STRING },
                      },
                      required: ['name', 'role', 'age', 'overall', 'nationality'],
                    },
                  },
                },
                required: ['clubId', 'managerName', 'def', 'mei', 'ata', 'keyPlayers'],
              },
            },
          });

          if (!structuredWorldResult) {
            res.json({
              leagueId,
              clubs: calibratedResults,
              usedAi: calibratedResults.length > 0,
              quotaLimited: true,
              cached: false,
              model: PRIMARY_GEMINI_MODEL,
            });
            return;
          }

          const rawText = structuredWorldResult.response.text || '[]';
          parsed = JSON.parse(rawText) as CalibratedWorldClubOutput[];
        }

        if (Array.isArray(parsed)) {
          for (const item of parsed) {
            if (!item || !item.clubId) continue;
            const sanitized: CalibratedWorldClubOutput = {
              clubId: item.clubId,
              managerName: String(item.managerName || '').trim() || 'Treinador Principal',
              def: Math.max(minSector, Math.min(maxSector, Math.round(Number(item.def) || 72))),
              mei: Math.max(minSector, Math.min(maxSector, Math.round(Number(item.mei) || 72))),
              ata: Math.max(minSector, Math.min(maxSector, Math.round(Number(item.ata) || 73))),
              keyPlayers: Array.isArray(item.keyPlayers)
                ? item.keyPlayers
                    .slice(0, 5)
                    .map((kp) => {
                      const normRole = String(kp.role || 'MEI').toUpperCase().trim();
                      const safeRole = (validRoles.has(normRole) ? normRole : 'MEI') as
                        | 'GOL'
                        | 'ZAG'
                        | 'LAT'
                        | 'VOL'
                        | 'MEI'
                        | 'ATA';
                      return {
                        name: String(kp.name || '').trim(),
                        role: safeRole,
                        age: Math.max(16, Math.min(42, Math.round(Number(kp.age) || 26))),
                        overall: Math.max(
                          minSector - 2,
                          Math.min(maxSector + 3, Math.round(Number(kp.overall) || 74))
                        ),
                        nationality: String(kp.nationality || country).trim() || country,
                      };
                    })
                    .filter((kp) => kp.name.length >= 2)
                : [],
            };
            resolvedWorldClubCache.set(sanitized.clubId, sanitized);
            calibratedResults.push(sanitized);
          }
        }
      }

      res.json({
        leagueId,
        clubs: calibratedResults,
        usedAi: true,
        cached: false,
        model: PRIMARY_GEMINI_MODEL,
      });
    } catch (err: unknown) {
      if (isGeminiQuotaError(err)) {
        res.json({
          leagueId: String(req.body?.leagueId ?? ''),
          clubs: [],
          usedAi: false,
          quotaLimited: true,
        });
        return;
      }
      const msg = err instanceof Error ? err.message : String(err);
      console.error('[Gemini World League Calibration Error]:', msg);
      res.status(500).json({
        error: 'AI_REQUEST_FAILED',
        message: 'Não foi possível calibrar a liga mundial via IA neste momento.',
      });
    }
  });

  app.get('/api/clubs/squads/october-2026/cache', (_req, res) => {
    const clubsById: Record<string, Oct2026ClubSquadOutput> = {};
    for (const [clubId, profile] of resolvedOct2026SquadCache.entries()) {
      if (profile && profile.clubId && Array.isArray(profile.players) && profile.players.length > 0) {
        clubsById[clubId] = profile;
      }
    }
    res.json({
      clubsById,
      count: Object.keys(clubsById).length,
      model: PRIMARY_GEMINI_MODEL,
    });
  });

  app.get('/api/clubs/squads/monthly-sync/status', (_req, res) => {
    const ptMonthsShort = [
      'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
      'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez',
    ];
    const ptMonthsFull = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
    ];
    const now = new Date();
    const year = now.getFullYear();
    const monthIdx = now.getMonth();
    const monthKey = `${year}-${String(monthIdx + 1).padStart(2, '0')}`;
    const shortLabel = `${ptMonthsShort[monthIdx] || 'Nov'}/${year}`;
    const fullLabel = `${ptMonthsFull[monthIdx] || 'Novembro'} de ${year}`;

    let syncedThisMonthCount = 0;
    let lastUpdatedAt: string | null = null;
    const sourcesBreakdown: Record<string, number> = {};

    for (const profile of resolvedOct2026SquadCache.values()) {
      if (!profile || !Array.isArray(profile.players) || profile.players.length === 0) continue;
      const isThisMonth =
        profile.monthKey === monthKey ||
        (typeof profile.updatedAt === 'string' && profile.updatedAt.startsWith(monthKey));
      if (isThisMonth) {
        syncedThisMonthCount += 1;
        const srcKey = profile.source || 'GEMINI_SEARCH';
        sourcesBreakdown[srcKey] = (sourcesBreakdown[srcKey] || 0) + 1;
      }
      if (
        typeof profile.updatedAt === 'string' &&
        (!lastUpdatedAt || profile.updatedAt > lastUpdatedAt)
      ) {
        lastUpdatedAt = profile.updatedAt;
      }
    }

    res.json({
      monthKey,
      shortLabel,
      fullLabel,
      providers: getRosterApiProvidersStatus(),
      syncedThisMonthCount,
      totalCachedCount: resolvedOct2026SquadCache.size,
      lastUpdatedAt,
      sourcesBreakdown,
      model: PRIMARY_GEMINI_MODEL,
    });
  });

  const handleMonthlySquadSync: express.RequestHandler = async (req, res) => {
    const ptMonthsFull = [
      'Janeiro',
      'Fevereiro',
      'Março',
      'Abril',
      'Maio',
      'Junho',
      'Julho',
      'Agosto',
      'Setembro',
      'Outubro',
      'Novembro',
      'Dezembro',
    ];
    const now = new Date();
    const defaultYear = now.getFullYear();
    const defaultMonthKey = `${defaultYear}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const defaultFullLabel = `${ptMonthsFull[now.getMonth()] || 'Novembro'} de ${defaultYear}`;
    const reqPeriod = req.body?.targetPeriod as
      | { monthKey?: string; fullLabel?: string; year?: number }
      | undefined;
    const syncMonthKey =
      typeof reqPeriod?.monthKey === 'string' && /^\d{4}-\d{2}$/.test(reqPeriod.monthKey)
        ? reqPeriod.monthKey
        : defaultMonthKey;
    const syncFullLabel =
      typeof reqPeriod?.fullLabel === 'string' && reqPeriod.fullLabel.trim().length > 0
        ? reqPeriod.fullLabel.trim().slice(0, 60)
        : defaultFullLabel;
    const syncYear =
      typeof reqPeriod?.year === 'number' &&
      Number.isFinite(reqPeriod.year) &&
      reqPeriod.year >= 2020 &&
      reqPeriod.year <= 2040
        ? Math.round(reqPeriod.year)
        : defaultYear;

    const preferredProviderRaw = String(req.body?.preferredProvider || 'AUTO').toUpperCase();
    const preferredProvider: 'AUTO' | 'FOOTBALL_API_FIRST' | 'GEMINI_SEARCH' =
      preferredProviderRaw === 'GEMINI_SEARCH'
        ? 'GEMINI_SEARCH'
        : preferredProviderRaw === 'FOOTBALL_API_FIRST'
        ? 'FOOTBALL_API_FIRST'
        : 'AUTO';

    try {
      const forceRefresh = Boolean(req.body?.forceRefresh);
      const rawClubs = Array.isArray(req.body?.clubs)
        ? (req.body.clubs as Oct2026ClubSquadInput[])
            .slice(0, 6)
            .filter((c) => c && typeof c.id === 'string' && typeof c.name === 'string')
            .map((c) => ({
              id: c.id.trim().slice(0, 64),
              name: c.name.trim().slice(0, 96),
              country: typeof c.country === 'string' ? c.country.trim().slice(0, 48) : 'Brasil',
              leagueName:
                typeof c.leagueName === 'string' ? c.leagueName.trim().slice(0, 80) : undefined,
              division: typeof c.division === 'string' ? c.division.trim().slice(0, 12) : undefined,
              reputation:
                typeof c.reputation === 'number' && Number.isFinite(c.reputation)
                  ? Math.max(1, Math.min(5, Math.round(c.reputation)))
                  : 3,
            }))
            .filter((c) => c.id.length > 0 && c.name.length > 0)
        : [];

      if (rawClubs.length === 0) {
        res.json({
          clubs: [],
          groundingSources: [],
          providerCounts: {},
          usedExternalApi: false,
          usedAi: false,
          usedGoogleSearch: false,
          cachedCount: 0,
          monthKey: syncMonthKey,
          totalCachedOnServer: resolvedOct2026SquadCache.size,
          model: PRIMARY_GEMINI_MODEL,
        });
        return;
      }

      const results: Oct2026ClubSquadOutput[] = [];
      const uncached: Oct2026ClubSquadInput[] = [];
      const groundingSourcesMap = new Map<string, GroundingSourceLink>();
      const providerCounts: Record<string, number> = {};
      let cachedCount = 0;
      let usedExternalApi = false;
      let usedAi = false;
      let usedGoogleSearch = false;

      for (const c of rawClubs) {
        const cached = !forceRefresh ? resolvedOct2026SquadCache.get(c.id) : undefined;
        const isFreshThisMonth = Boolean(
          cached &&
            cached.players.length >= 16 &&
            (cached.monthKey === syncMonthKey ||
              (typeof cached.updatedAt === 'string' && cached.updatedAt.startsWith(syncMonthKey)))
        );
        if (cached && isFreshThisMonth) {
          results.push(cached);
          cachedCount += 1;
        } else {
          uncached.push(c);
        }
      }

      if (uncached.length === 0) {
        res.json({
          clubs: results,
          groundingSources: [],
          providerCounts,
          usedExternalApi: false,
          usedAi: false,
          usedGoogleSearch: false,
          cached: true,
          cachedCount,
          monthKey: syncMonthKey,
          totalCachedOnServer: resolvedOct2026SquadCache.size,
          model: PRIMARY_GEMINI_MODEL,
        });
        return;
      }

      // Phase 1: Try live external Football Roster REST APIs (API-Football v3 -> Football-Data.org v4 -> TheSportsDB)
      const needsAiFallback: Oct2026ClubSquadInput[] = [];
      if (preferredProvider !== 'GEMINI_SEARCH') {
        const externalResults = await Promise.all(
          uncached.map((clubQuery) =>
            fetchClubRosterFromExternalApis(clubQuery).catch(() => null)
          )
        );

        for (let idx = 0; idx < uncached.length; idx++) {
          const queryClub = uncached[idx];
          const ext = externalResults[idx];
          if (ext && ext.players.length >= 10) {
            const sanitizedClub: Oct2026ClubSquadOutput = {
              clubId: queryClub.id,
              managerName: ext.managerName,
              updatedAt: new Date().toISOString(),
              monthKey: syncMonthKey,
              source: ext.source,
              sourceLabel: ext.sourceLabel,
              players: ext.players.slice(0, 30),
            };
            resolvedOct2026SquadCache.set(sanitizedClub.clubId, sanitizedClub);
            for (const p of sanitizedClub.players) {
              if (p.nationality) {
                resolvedNationalityCache.set(p.name.toLowerCase(), p.nationality);
              }
            }
            results.push(sanitizedClub);
            usedExternalApi = true;
            for (const srcId of ext.sourcesUsed || [ext.source]) {
              providerCounts[srcId] = (providerCounts[srcId] || 0) + 1;
            }
            for (const link of ext.sourceUrls || []) {
              if (link?.uri && !groundingSourcesMap.has(link.uri)) {
                groundingSourcesMap.set(link.uri, {
                  uri: link.uri,
                  title: `${link.title} (${syncFullLabel})`,
                });
              }
            }
          } else {
            needsAiFallback.push(queryClub);
          }
        }
      } else {
        needsAiFallback.push(...uncached);
      }

      // Phase 2: Use Gemini + Google Search (gemini-4-hydrogen) for clubs not covered by external football APIs
      if (needsAiFallback.length > 0) {
        const ai = getGenAIClient();
        if (!ai) {
          savePersistedOct2026SquadCache();
          savePersistedNationalityCache();
          if (results.length > 0) {
            res.json({
              clubs: results,
              groundingSources: Array.from(groundingSourcesMap.values()).slice(0, 8),
              providerCounts,
              usedExternalApi,
              usedAi: false,
              usedGoogleSearch: false,
              cached: false,
              cachedCount,
              monthKey: syncMonthKey,
              totalCachedOnServer: resolvedOct2026SquadCache.size,
              model: PRIMARY_GEMINI_MODEL,
            });
            return;
          }
          res.status(503).json({
            error: 'ROSTER_PROVIDERS_UNAVAILABLE',
            message:
              'Nenhum elenco encontrado nas APIs de futebol ao vivo e a busca complementar de IA não está configurada no servidor.',
            clubs: results,
            groundingSources: [],
            providerCounts,
            usedExternalApi,
            usedAi: false,
            usedGoogleSearch: false,
            cachedCount,
            monthKey: syncMonthKey,
            totalCachedOnServer: resolvedOct2026SquadCache.size,
          });
          return;
        }

        const validRoles = new Set(['GOL', 'ZAG', 'LAT', 'VOL', 'MEI', 'ATA']);
        const CHUNK_SIZE = needsAiFallback.length <= 2 ? 2 : 5;
        const minPlayersTarget = needsAiFallback.length <= 2 ? 24 : 22;

        for (let offset = 0; offset < needsAiFallback.length; offset += CHUNK_SIZE) {
          const batch = needsAiFallback.slice(offset, offset + CHUNK_SIZE);
          const clubLines = batch.map(
            (c) =>
              `- clubId="${c.id}" | clube="${c.name}" | pais="${c.country || 'Brasil'}" | liga="${
                c.leagueName || c.division || '1ª Divisão'
              }" | reputacao=${c.reputation || 3}`
          );

          const promptText = [
            `Pesquise na web (Google Search) o elenco profissional real e atualizado de ${syncFullLabel.toUpperCase()} para cada clube listado abaixo.`,
            `Regras obrigatórias de atualização mensal (${syncFullLabel}):`,
            `1. Informe o nome real do técnico atual em ${syncFullLabel} em managerName.`,
            `2. Liste entre ${minPlayersTarget} e 28 jogadores reais do elenco atual de ${syncFullLabel} (incluindo contratações, chegadas e saídas confirmadas até ${syncFullLabel}), cobrindo todas as posições de forma equilibrada: 3 goleiros (GOL), 4 a 6 zagueiros (ZAG), 4 laterais (LAT), 4 a 5 volantes (VOL), 4 a 5 meias (MEI) e 4 a 6 atacantes (ATA).`,
            '3. Marque exatamente 11 atletas titulares habituais com "isStarter": true (1 GOL e 10 de linha) e os demais com "isStarter": false.',
            '4. Em "role" use estritamente: "GOL", "ZAG", "LAT", "VOL", "MEI" ou "ATA".',
            `5. Em "age" informe a idade real em ${syncFullLabel} (16 a 46). Em "jerseyNumber" informe o número da camisa (1 a 99). Em "nationality" informe o país em português do Brasil.`,
            `6. Em "overall" calibre com realismo em ${syncFullLabel} (${syncYear}) conforme a força real do clube e divisão (gigantes europeus: 76–91; Série A Brasil / grandes da América, Arábia, México, MLS e Rússia: 70–88; Série B / ligas médias: 63–76; Série C/D / divisões inferiores: 54–69).`,
            '7. Retorne APENAS um array JSON puro (sem texto extra) com TODOS os clubes solicitados no formato:',
            '[{"clubId":"...","managerName":"...","players":[{"name":"...","role":"GOL","age":28,"overall":82,"nationality":"Brasil","jerseyNumber":1,"isStarter":true}]}]',
            '',
            `Clubes para pesquisar elenco de ${syncFullLabel}:`,
            ...clubLines,
          ].join('\n');

          let parsedBatch: Array<{
            clubId: string;
            managerName?: string;
            players?: Array<{
              name?: string;
              role?: string;
              age?: number;
              overall?: number;
              nationality?: string;
              jerseyNumber?: number;
              isStarter?: boolean;
            }>;
          }> | null = null;

          const groundedOctResult = await generateGroundedIfAvailable(
            ai,
            promptText,
            `Você é um especialista mundial em bancos de dados de futebol em ${syncFullLabel} (Transfermarkt, SofaScore, FIFA, CBF, CONMEBOL, UEFA, CONCACAF, AFC e CAF). Use Google Search para consultar as transferências mais recentes até ${syncFullLabel} e retorne exclusivamente JSON válido para todos os clubes solicitados.`
          );

          if (groundedOctResult) {
            const chunks =
              groundedOctResult.response.candidates?.[0]?.groundingMetadata?.groundingChunks;
            if (Array.isArray(chunks)) {
              for (const ch of chunks) {
                const uri = ch?.web?.uri;
                const title = ch?.web?.title;
                if (uri && typeof uri === 'string' && !groundingSourcesMap.has(uri)) {
                  usedGoogleSearch = true;
                  groundingSourcesMap.set(uri, {
                    uri,
                    title:
                      typeof title === 'string' && title.trim()
                        ? title.trim()
                        : `Fonte Web ${syncFullLabel}`,
                  });
                }
              }
            }

            const cleaned = (groundedOctResult.response.text || '')
              .replace(/```json/gi, '')
              .replace(/```/g, '')
              .trim();
            const startIdx = cleaned.indexOf('[');
            const endIdx = cleaned.lastIndexOf(']');
            if (startIdx !== -1 && endIdx > startIdx) {
              try {
                const candidate = JSON.parse(cleaned.slice(startIdx, endIdx + 1));
                if (Array.isArray(candidate) && candidate.length > 0) {
                  parsedBatch = candidate;
                }
              } catch {
                // Fall through to structured schema
              }
            }
          }

          if (!parsedBatch || parsedBatch.length === 0) {
            const fallbackResult = await generateStructuredWithFallback(ai, promptText, {
              systemInstruction:
                `Você é um especialista mundial em bancos de dados de futebol em ${syncFullLabel}. Liste os jogadores reais de cada clube solicitado em ${syncFullLabel} e retorne exclusivamente JSON válido seguindo o schema.`,
              responseMimeType: 'application/json',
              responseSchema: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    clubId: { type: Type.STRING },
                    managerName: { type: Type.STRING },
                    players: {
                      type: Type.ARRAY,
                      items: {
                        type: Type.OBJECT,
                        properties: {
                          name: { type: Type.STRING },
                          role: { type: Type.STRING },
                          age: { type: Type.INTEGER },
                          overall: { type: Type.INTEGER },
                          nationality: { type: Type.STRING },
                          jerseyNumber: { type: Type.INTEGER },
                          isStarter: { type: Type.BOOLEAN },
                        },
                        required: [
                          'name',
                          'role',
                          'age',
                          'overall',
                          'nationality',
                          'jerseyNumber',
                          'isStarter',
                        ],
                      },
                    },
                  },
                  required: ['clubId', 'managerName', 'players'],
                },
              },
            });

            if (!fallbackResult) {
              savePersistedOct2026SquadCache();
              savePersistedNationalityCache();
              res.json({
                clubs: results,
                groundingSources: Array.from(groundingSourcesMap.values()).slice(0, 8),
                providerCounts,
                usedExternalApi,
                usedAi,
                usedGoogleSearch,
                quotaLimited: true,
                cached: false,
                cachedCount,
                monthKey: syncMonthKey,
                totalCachedOnServer: resolvedOct2026SquadCache.size,
                model: PRIMARY_GEMINI_MODEL,
              });
              return;
            }

            const rawFallback = fallbackResult.response.text || '[]';
            parsedBatch = JSON.parse(rawFallback);
          }

          if (Array.isArray(parsedBatch)) {
            for (const item of parsedBatch) {
              if (!item || !item.clubId) continue;
              const inputMeta = batch.find(
                (b) =>
                  b.id === item.clubId ||
                  b.id.toLowerCase() === String(item.clubId).trim().toLowerCase()
              );
              const resolvedClubId = inputMeta ? inputMeta.id : item.clubId;
              const fallbackCountry = inputMeta?.country || 'Brasil';
              const seenNames = new Set<string>();
              const sanitizedPlayers: Oct2026SquadPlayerOutput[] = [];

              if (Array.isArray(item.players)) {
                for (let idx = 0; idx < item.players.length && sanitizedPlayers.length < 30; idx++) {
                  const rawP = item.players[idx];
                  const cleanName = String(rawP?.name || '').trim();
                  if (cleanName.length < 2) continue;
                  const normKey = cleanName.toLowerCase();
                  if (seenNames.has(normKey)) continue;
                  seenNames.add(normKey);

                  const normRole = String(rawP?.role || 'MEI').toUpperCase().trim();
                  const safeRole = (validRoles.has(normRole) ? normRole : 'MEI') as
                    | 'GOL'
                    | 'ZAG'
                    | 'LAT'
                    | 'VOL'
                    | 'MEI'
                    | 'ATA';

                  const cleanNat =
                    String(rawP?.nationality || fallbackCountry).trim() || fallbackCountry;

                  sanitizedPlayers.push({
                    name: cleanName,
                    role: safeRole,
                    age: Math.max(16, Math.min(46, Math.round(Number(rawP?.age) || 25))),
                    overall: Math.max(52, Math.min(93, Math.round(Number(rawP?.overall) || 73))),
                    nationality: cleanNat,
                    jerseyNumber: Math.max(
                      1,
                      Math.min(99, Math.round(Number(rawP?.jerseyNumber) || idx + 1))
                    ),
                    isStarter: Boolean(rawP?.isStarter),
                  });

                  resolvedNationalityCache.set(normKey, cleanNat);
                }
              }

              if (sanitizedPlayers.length > 0) {
                const sanitizedClub: Oct2026ClubSquadOutput = {
                  clubId: resolvedClubId,
                  managerName: String(item.managerName || '').trim() || 'Treinador Principal',
                  updatedAt: new Date().toISOString(),
                  monthKey: syncMonthKey,
                  source: 'GEMINI_SEARCH',
                  sourceLabel: usedGoogleSearch ? 'Gemini + Google Search' : 'Gemini Live Roster',
                  players: sanitizedPlayers.slice(0, 30),
                };
                resolvedOct2026SquadCache.set(sanitizedClub.clubId, sanitizedClub);
                results.push(sanitizedClub);
                usedAi = true;
                providerCounts.GEMINI_SEARCH = (providerCounts.GEMINI_SEARCH || 0) + 1;
              }
            }
          }
        }
      }

      savePersistedOct2026SquadCache();
      savePersistedNationalityCache();

      res.json({
        clubs: results,
        groundingSources: Array.from(groundingSourcesMap.values()).slice(0, 8),
        providerCounts,
        usedExternalApi,
        usedAi,
        usedGoogleSearch,
        cached: false,
        cachedCount,
        monthKey: syncMonthKey,
        totalCachedOnServer: resolvedOct2026SquadCache.size,
        model: PRIMARY_GEMINI_MODEL,
      });
    } catch (err: unknown) {
      if (isGeminiQuotaError(err)) {
        res.json({
          clubs: [],
          groundingSources: [],
          providerCounts: {},
          usedExternalApi: false,
          usedAi: false,
          usedGoogleSearch: false,
          quotaLimited: true,
          monthKey: syncMonthKey,
          totalCachedOnServer: resolvedOct2026SquadCache.size,
        });
        return;
      }
      const msg = err instanceof Error ? err.message : String(err);
      console.error('[Monthly Squad API Sync Error]:', msg);
      res.status(500).json({
        error: 'ROSTER_SYNC_FAILED',
        message: `Não foi possível atualizar os elencos de ${syncFullLabel} pela API neste momento.`,
      });
    }
  };

  app.post('/api/clubs/squads/monthly-sync', handleMonthlySquadSync);
  app.post('/api/clubs/squads/october-2026', handleMonthlySquadSync);

  app.post('/api/transfers/rumors', async (req, res) => {
    try {
      const body = req.body as {
        candidates?: Array<{
          id?: string;
          playerName?: string;
          playerRole?: string;
          playerAge?: number;
          playerOverall?: number;
          marketValue?: number;
          estimatedFee?: number;
          matches?: number;
          goals?: number;
          assists?: number;
          ratingAverage?: number;
          contractYears?: number;
          currentClubName?: string;
          currentClubShortName?: string;
          interestedClubName?: string;
          interestedClubShortName?: string;
          category?: string;
          reasonTag?: string;
        }>;
        seasonYear?: number;
        round?: number;
        currentDate?: string;
        userClubName?: string;
      };

      const rawCandidates = Array.isArray(body?.candidates) ? body.candidates : [];
      if (rawCandidates.length === 0) {
        res.status(400).json({ error: 'NO_CANDIDATES', message: 'Nenhum candidato informado.' });
        return;
      }

      const ai = getGenAIClient();
      if (!ai) {
        res.status(503).json({
          error: 'AI_UNAVAILABLE',
          message: 'GEMINI_API_KEY não configurada no servidor.',
        });
        return;
      }

      const candidatesSlice = rawCandidates.slice(0, 12).map((c) => ({
        id: String(c.id || '').trim(),
        playerName: String(c.playerName || '').trim(),
        playerRole: String(c.playerRole || '').trim(),
        playerAge: Number(c.playerAge || 24),
        playerOverall: Number(c.playerOverall || 70),
        marketValueBRL: Number(c.marketValue || 0),
        estimatedFeeBRL: Number(c.estimatedFee || 0),
        matches: Number(c.matches || 0),
        goals: Number(c.goals || 0),
        assists: Number(c.assists || 0),
        ratingAverage: Number(c.ratingAverage || 6.8),
        contractYears: Number(c.contractYears || 2),
        currentClubName: String(c.currentClubName || '').trim(),
        interestedClubName: String(c.interestedClubName || '').trim(),
        category: String(c.category || 'LEAGUE_BUZZ'),
        reasonTag: String(c.reasonTag || '').trim(),
      }));

      const RUMOR_MODEL = 'gemini-4-hydrogen';
      const systemInstruction =
        'Você é um setorista especialista em mercado da bola brasileiro e internacional. ' +
        'Escreva notícias curtas, realistas e jornalísticas em português (PT-BR) sobre rumores de transferências baseados EXCLUSIVAMENTE nos dados reais da temporada fornecidos (jogos, gols, assistências, nota média, OVR, contrato e valor de mercado/estimado em BRL). ' +
        'Nunca invente clubes ou estatísticas diferentes dos fornecidos. Retorne apenas JSON válido no schema solicitado.';

      const userPrompt =
        `Temporada ${Number(body?.seasonYear || 2026)}, Rodada ${Number(body?.round || 1)} (${String(body?.currentDate || '')}). ` +
        `Clube do treinador: ${String(body?.userClubName || 'Clube')}.\n` +
        `Para CADA candidato abaixo, gere:\n` +
        `- id: exatamente o id enviado\n` +
        `- headline: manchete curta e direta (max 95 caracteres)\n` +
        `- summary: nota jornalística de 2 frases citando desempenho em campo (gols/assistências/nota média/OVR quando relevantes) e o contexto financeiro/valor de mercado\n` +
        `- sourceOutlet: nome realista de veículo fictício de imprensa esportiva brasileira/internacional (ex: "Diário da Bola", "Bastidores FC", "Gazeta do Mercado", "Radar da Janela", "Placar Sul")\n` +
        `- heatLevel: "HOT" (negociação quente/urgente), "WARM" (sondagem avançada) ou "WATCH" (monitoramento inicial)\n\n` +
        `Candidatos:\n${JSON.stringify(candidatesSlice)}`;

      const response = await ai.models.generateContent({
        model: RUMOR_MODEL,
        contents: userPrompt,
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                headline: { type: Type.STRING },
                summary: { type: Type.STRING },
                sourceOutlet: { type: Type.STRING },
                heatLevel: { type: Type.STRING },
              },
              required: ['id', 'headline', 'summary', 'sourceOutlet', 'heatLevel'],
            },
          },
        },
      });

      const rawText = (response.text || '').trim();
      if (!rawText) {
        res.status(502).json({
          error: 'EMPTY_AI_RESPONSE',
          message: 'A IA não retornou conteúdo para os rumores.',
        });
        return;
      }

      const parsed = JSON.parse(rawText) as Array<{
        id?: string;
        headline?: string;
        summary?: string;
        sourceOutlet?: string;
        heatLevel?: string;
      }>;

      const rumors = (Array.isArray(parsed) ? parsed : [])
        .filter((item) => item && typeof item.id === 'string' && typeof item.headline === 'string')
        .map((item) => {
          const heatUpper = String(item.heatLevel || '').toUpperCase();
          const heatLevel =
            heatUpper === 'HOT' || heatUpper === 'WARM' || heatUpper === 'WATCH'
              ? heatUpper
              : 'WARM';
          return {
            id: String(item.id).trim(),
            headline: String(item.headline).trim().slice(0, 140),
            summary: String(item.summary || '').trim().slice(0, 380),
            sourceOutlet: String(item.sourceOutlet || 'Diário da Bola').trim().slice(0, 48),
            heatLevel,
          };
        });

      res.json({
        rumors,
        usedAi: true,
        model: RUMOR_MODEL,
      });
    } catch (err: unknown) {
      if (isGeminiQuotaError(err)) {
        res.status(429).json({
          error: 'QUOTA_EXCEEDED',
          message: 'Limite temporário da IA atingido. Tente novamente em instantes.',
        });
        return;
      }
      const msg = err instanceof Error ? err.message : String(err);
      console.error('[Gemini Transfer Rumors Error]:', msg);
      res.status(500).json({
        error: 'AI_REQUEST_FAILED',
        message: 'Não foi possível gerar os rumores de transferência via IA agora.',
      });
    }
  });

  // Clean JSON 404 for unknown API endpoints
  app.use('/api', (_req, res) => {
    res.status(404).json({
      error: 'NOT_FOUND',
      message: 'Rota da API não encontrada.',
    });
  });

  if (process.env.NODE_ENV !== 'production') {
    const requiredRoster = path.join(__dirname, 'src', 'data', 'europeTop5Rosters2026.ts');
    if (!fs.existsSync(requiredRoster)) {
      console.log('[Server] European roster files missing, generating via prebuild...');
      try {
        execSync('npm run prebuild', { stdio: 'inherit', cwd: __dirname });
      } catch (err) {
        console.error('[Server] Failed to generate roster files:', err);
      }
    }

    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
        ws: false,
      },
      appType: 'spa',
    });

    // Vite 8 still calls transport.connect() inside /@vite/client even with hmr: false and ws: false,
    // which attempts to open a WebSocket on port 24678 and throws "WebSocket closed without opened."
    // Stub wsTransport methods as no-ops while keeping transport.connect() active so
    // normalizeModuleRunnerTransport marks the client connected (preventing SendBeforeConnectError
    // from plugins like vite-plugin-pwa that call import.meta.hot.send()) without opening a WebSocket.
    app.get('/@vite/client', async (_req, res, next) => {
      try {
        const result = await vite.transformRequest('/@vite/client');
        if (!result) {
          next();
          return;
        }
        const patchedCode = result.code
          .replace(
            'console.debug("[vite] connecting...");',
            '/* [vite] HMR disabled */',
          )
          .replace(
            'await wsTransport.connect(handlers);',
            'return; /* [vite] HMR WebSocket connect disabled */',
          )
          .replace(
            'await wsTransport.disconnect();',
            'return; /* [vite] HMR WebSocket disconnect disabled */',
          )
          .replace(
            'wsTransport.send(data);',
            '/* [vite] HMR WebSocket send disabled */',
          );
        res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
        res.setHeader('Cache-Control', 'no-cache');
        res.send(patchedCode);
      } catch (err) {
        next(err);
      }
    });

    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    const staticCompressedCache = new Map<string, { br: Buffer; gzip: Buffer }>();
    const STATIC_TEXT_EXT_RE = /\.(js|mjs|css|html|svg|json|webmanifest|txt)$/i;

    // Serve compressed hashed static assets with long-term immutable caching for instant repeat loads
    app.use((req, res, next) => {
      if (req.method !== 'GET' && req.method !== 'HEAD') {
        next();
        return;
      }
      const cleanPath = req.path.replace(/\.\.+/g, '');
      if (!STATIC_TEXT_EXT_RE.test(cleanPath)) {
        next();
        return;
      }
      const filePath = path.resolve(distPath, `.${cleanPath}`);
      if (
        !filePath.startsWith(distPath + path.sep) ||
        !fs.existsSync(filePath) ||
        !fs.statSync(filePath).isFile()
      ) {
        next();
        return;
      }
      const acceptEncoding = String(req.headers['accept-encoding'] || '');
      const useBrotli = /\bbr\b/i.test(acceptEncoding);
      const useGzip = !useBrotli && /\bgzip\b/i.test(acceptEncoding);
      if (!useBrotli && !useGzip) {
        next();
        return;
      }

      try {
        let entry = staticCompressedCache.get(filePath);
        if (!entry) {
          const raw = fs.readFileSync(filePath);
          if (raw.length < 1024) {
            next();
            return;
          }
          entry = {
            br: zlib.brotliCompressSync(raw, {
              params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 5 },
            }),
            gzip: zlib.gzipSync(raw, { level: 6 }),
          };
          if (staticCompressedCache.size < 120) {
            staticCompressedCache.set(filePath, entry);
          }
        }

        const isHashedAsset = cleanPath.startsWith('/assets/');
        res.setHeader(
          'Cache-Control',
          isHashedAsset ? 'public, max-age=31536000, immutable' : 'no-cache'
        );
        res.type(path.extname(filePath));
        res.setHeader('Content-Encoding', useBrotli ? 'br' : 'gzip');
        res.setHeader('Vary', 'Accept-Encoding');
        const payload = useBrotli ? entry.br : entry.gzip;
        res.setHeader('Content-Length', String(payload.length));
        if (req.method === 'HEAD') {
          res.status(200).end();
        } else {
          res.status(200).end(payload);
        }
      } catch {
        next();
      }
    });

    app.use(
      express.static(distPath, {
        maxAge: '7d',
        setHeaders(res, filePath) {
          if (filePath.includes(`${path.sep}assets${path.sep}`)) {
            res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
          } else if (filePath.endsWith('.html') || filePath.endsWith('sw.js') || filePath.endsWith('.webmanifest')) {
            res.setHeader('Cache-Control', 'no-cache');
          }
        },
      })
    );
    app.get('*', (_req, res) => {
      res.setHeader('Cache-Control', 'no-cache');
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });

  const handleShutdown = () => {
    server.close(() => {
      process.exit(0);
    });
  };
  process.on('SIGTERM', handleShutdown);
  process.on('SIGINT', handleShutdown);
}

startServer();
