// server.ts
import "dotenv/config";
import crypto from "crypto";
import fs from "fs";
import zlib from "zlib";
import { execSync } from "child_process";
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import {
  GoogleGenAI,
  Type
} from "@google/genai";
var __filename = fileURLToPath(import.meta.url);
var __dirname = path.dirname(__filename);
var ACCOUNTS_DIR = path.join(__dirname, "data");
var ACCOUNTS_FILE = path.join(ACCOUNTS_DIR, "trainer-accounts.json");
function normalizeServerUsernameKey(raw) {
  const withoutDomain = String(raw || "").trim().split("@")[0];
  const ascii = withoutDomain.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9._\-]+/g, ".").replace(/\.{2,}/g, ".").replace(/^[._\-]+|[._\-]+$/g, "");
  const safe = ascii.slice(0, 60);
  if (safe.length === 1) return `${safe}1`;
  return safe;
}
function readTrainerAccounts() {
  try {
    if (!fs.existsSync(ACCOUNTS_FILE)) return [];
    const content = fs.readFileSync(ACCOUNTS_FILE, "utf-8");
    const parsed = JSON.parse(content);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
function writeTrainerAccounts(accounts) {
  try {
    if (!fs.existsSync(ACCOUNTS_DIR)) {
      fs.mkdirSync(ACCOUNTS_DIR, { recursive: true });
    }
    fs.writeFileSync(ACCOUNTS_FILE, JSON.stringify(accounts, null, 2), "utf-8");
  } catch (err) {
    console.error("[Trainer Auth Store Write Error]:", err);
  }
}
function hashPasswordWithSalt(password, saltHex) {
  return crypto.scryptSync(password, Buffer.from(saltHex, "hex"), 64).toString("hex");
}
function verifyPasswordHash(password, saltHex, expectedHashHex) {
  try {
    const computed = Buffer.from(hashPasswordWithSalt(password, saltHex), "hex");
    const expected = Buffer.from(expectedHashHex, "hex");
    if (computed.length !== expected.length) return false;
    return crypto.timingSafeEqual(computed, expected);
  } catch {
    return false;
  }
}
var SESSION_SIGNING_SECRET = process.env.SESSION_SECRET && process.env.SESSION_SECRET.trim() || crypto.randomBytes(32).toString("hex");
function issueServerSessionToken(uid) {
  const payload = Buffer.from(
    JSON.stringify({ uid, exp: Date.now() + 7 * 24 * 60 * 60 * 1e3 }),
    "utf8"
  ).toString("base64url");
  const sig = crypto.createHmac("sha256", SESSION_SIGNING_SECRET).update(payload).digest("base64url");
  return `${payload}.${sig}`;
}
function verifyServerSessionToken(authHeader) {
  if (!authHeader || !authHeader.startsWith("Bearer ")) return null;
  const token = authHeader.slice(7).trim();
  const dotIdx = token.indexOf(".");
  if (dotIdx <= 0 || dotIdx >= token.length - 1) return null;
  const payload = token.slice(0, dotIdx);
  const sig = token.slice(dotIdx + 1);
  try {
    const expectedSig = crypto.createHmac("sha256", SESSION_SIGNING_SECRET).update(payload).digest("base64url");
    const a = Buffer.from(sig, "utf8");
    const b = Buffer.from(expectedSig, "utf8");
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (!parsed.uid || typeof parsed.exp !== "number" || parsed.exp < Date.now()) {
      return null;
    }
    return parsed.uid;
  } catch {
    return null;
  }
}
var NATIONALITIES_CACHE_FILE = path.join(ACCOUNTS_DIR, "player-nationalities-cache.json");
var OCT2026_SQUADS_CACHE_FILE = path.join(ACCOUNTS_DIR, "club-squads-oct2026-cache.json");
var resolvedNationalityCache = /* @__PURE__ */ new Map();
var resolvedOverallCache = /* @__PURE__ */ new Map();
var resolvedSouthAmericaClubCache = /* @__PURE__ */ new Map();
var resolvedEuropeClubCache = /* @__PURE__ */ new Map();
var resolvedWorldClubCache = /* @__PURE__ */ new Map();
var resolvedOct2026SquadCache = /* @__PURE__ */ new Map();
function loadPersistedNationalityCache() {
  try {
    if (!fs.existsSync(NATIONALITIES_CACHE_FILE)) return;
    const raw = fs.readFileSync(NATIONALITIES_CACHE_FILE, "utf-8");
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object") {
      for (const [k, v] of Object.entries(parsed)) {
        if (typeof v === "string" && v.trim()) {
          resolvedNationalityCache.set(k, v.trim());
        }
      }
    }
  } catch {
  }
}
function savePersistedNationalityCache() {
  try {
    if (!fs.existsSync(ACCOUNTS_DIR)) {
      fs.mkdirSync(ACCOUNTS_DIR, { recursive: true });
    }
    const obj = {};
    for (const [k, v] of resolvedNationalityCache.entries()) {
      obj[k] = v;
    }
    fs.writeFileSync(NATIONALITIES_CACHE_FILE, JSON.stringify(obj, null, 2), "utf-8");
  } catch (err) {
    console.error("[Nationality Cache Write Error]:", err);
  }
}
function loadPersistedOct2026SquadCache() {
  try {
    if (!fs.existsSync(OCT2026_SQUADS_CACHE_FILE)) return;
    const raw = fs.readFileSync(OCT2026_SQUADS_CACHE_FILE, "utf-8");
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object") {
      for (const [k, v] of Object.entries(parsed)) {
        if (v && v.clubId && Array.isArray(v.players) && v.players.length > 0) {
          resolvedOct2026SquadCache.set(k, v);
        }
      }
    }
  } catch {
  }
}
function savePersistedOct2026SquadCache() {
  try {
    if (!fs.existsSync(ACCOUNTS_DIR)) {
      fs.mkdirSync(ACCOUNTS_DIR, { recursive: true });
    }
    const obj = {};
    for (const [k, v] of resolvedOct2026SquadCache.entries()) {
      obj[k] = v;
    }
    fs.writeFileSync(OCT2026_SQUADS_CACHE_FILE, JSON.stringify(obj, null, 2), "utf-8");
  } catch (err) {
    console.error("[Oct2026 Squad Cache Write Error]:", err);
  }
}
loadPersistedNationalityCache();
loadPersistedOct2026SquadCache();
function extractJsonArrayFromText(rawText) {
  const cleaned = (rawText || "").replace(/```json/gi, "").replace(/```/g, "").trim();
  if (!cleaned) return null;
  try {
    const direct = JSON.parse(cleaned);
    if (Array.isArray(direct)) return direct;
  } catch {
  }
  const start = cleaned.indexOf("[");
  const end = cleaned.lastIndexOf("]");
  if (start !== -1 && end > start) {
    try {
      const sliced = JSON.parse(cleaned.slice(start, end + 1));
      if (Array.isArray(sliced)) return sliced;
    } catch {
      return null;
    }
  }
  return null;
}
function makeCacheKey(p) {
  return `${(p.name || "").trim().toLowerCase()}|${(p.clubName || "").trim().toLowerCase()}`;
}
function makeOverallCacheKey(p) {
  return `${(p.clubId || "").trim().toLowerCase()}|${(p.name || "").trim().toLowerCase()}|${p.division || ""}`;
}
var PRIMARY_GEMINI_MODEL = "gemini-3.8-flash";
var FALLBACK_GEMINI_MODEL = "gemini-3.1-flash-lite";
var CANDIDATE_TEXT_MODELS = [PRIMARY_GEMINI_MODEL, FALLBACK_GEMINI_MODEL];
var groundedSearchCooldownUntil = 0;
var modelQuotaCooldownUntil = {};
function isGeminiQuotaError(err) {
  if (!err) return false;
  const anyErr = err;
  if (anyErr.status === 429 || anyErr.code === 429) return true;
  const text = String(anyErr.message ?? err).toLowerCase();
  return text.includes("429") || text.includes("resource_exhausted") || text.includes("exceeded your current quota") || text.includes("rate limit") || text.includes("quota");
}
function getGenAIClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || !apiKey.trim()) {
    return null;
  }
  return new GoogleGenAI({
    apiKey: apiKey.trim(),
    httpOptions: { headers: { "User-Agent": "aistudio-build" } }
  });
}
function sleepMs(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
async function generateGroundedIfAvailable(ai, contents, systemInstruction) {
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
            tools: [{ googleSearch: {} }]
          }
        });
        return { response, modelUsed: model };
      } catch (err) {
        if (isGeminiQuotaError(err)) {
          if (attempt === 0) {
            await sleepMs(1400);
            continue;
          }
          groundedSearchCooldownUntil = Date.now() + 3e4;
          modelQuotaCooldownUntil[model] = Date.now() + 25e3;
          break;
        }
        return null;
      }
    }
  }
  return null;
}
async function generateStructuredWithFallback(ai, contents, config) {
  for (const model of CANDIDATE_TEXT_MODELS) {
    if (Date.now() < (modelQuotaCooldownUntil[model] || 0)) {
      continue;
    }
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents,
          config
        });
        return { response, modelUsed: model };
      } catch (err) {
        if (isGeminiQuotaError(err)) {
          if (attempt === 0) {
            await sleepMs(1400);
            continue;
          }
          modelQuotaCooldownUntil[model] = Date.now() + 25e3;
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
  const PORT = Number(process.env.PORT) || 3e3;
  app.set("trust proxy", 1);
  app.disable("x-powered-by");
  app.use((_req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
    next();
  });
  const COMPRESSIBLE_RE = /^(text\/|application\/(json|javascript|xml|manifest\+json)|image\/svg\+xml)/i;
  app.use((req, res, next) => {
    const acceptEncoding = String(req.headers["accept-encoding"] || "");
    const useBrotli = /\bbr\b/i.test(acceptEncoding);
    const useGzip = !useBrotli && /\bgzip\b/i.test(acceptEncoding);
    if (!useBrotli && !useGzip) {
      next();
      return;
    }
    const originalSend = res.send.bind(res);
    res.send = ((body) => {
      try {
        if (res.headersSent || res.getHeader("Content-Encoding")) {
          return originalSend(body);
        }
        const contentType = String(res.getHeader("Content-Type") || "");
        if (!COMPRESSIBLE_RE.test(contentType)) {
          return originalSend(body);
        }
        const rawBuf = Buffer.isBuffer(body) ? body : typeof body === "string" ? Buffer.from(body, "utf8") : null;
        if (!rawBuf || rawBuf.length < 1024) {
          return originalSend(body);
        }
        const compressed = useBrotli ? zlib.brotliCompressSync(rawBuf, {
          params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 4 }
        }) : zlib.gzipSync(rawBuf, { level: 6 });
        res.setHeader("Content-Encoding", useBrotli ? "br" : "gzip");
        res.setHeader("Vary", "Accept-Encoding");
        res.setHeader("Content-Length", String(compressed.length));
        return originalSend(compressed);
      } catch {
        return originalSend(body);
      }
    });
    next();
  });
  app.use(express.json({ limit: "2mb" }));
  const createRateLimiter = (opts) => {
    const store = /* @__PURE__ */ new Map();
    const cleanupTimer = setInterval(() => {
      const now = Date.now();
      for (const [k, entry] of store.entries()) {
        if (entry.resetAt <= now) {
          store.delete(k);
        }
      }
    }, Math.max(6e4, opts.windowMs));
    cleanupTimer.unref?.();
    return (req, res, next) => {
      const clientIp = req.ip || req.socket.remoteAddress || "unknown";
      const key = `${opts.bucketPrefix}:${clientIp}`;
      const now = Date.now();
      const existing = store.get(key);
      if (!existing || existing.resetAt <= now) {
        store.set(key, { count: 1, resetAt: now + opts.windowMs });
        next();
        return;
      }
      if (existing.count >= opts.max) {
        const retryAfterSeconds = Math.max(1, Math.ceil((existing.resetAt - now) / 1e3));
        res.setHeader("Retry-After", String(retryAfterSeconds));
        res.status(429).json({
          error: "RATE_LIMITED",
          message: opts.message,
          retryAfterSeconds
        });
        return;
      }
      existing.count += 1;
      next();
    };
  };
  const authRateLimiter = createRateLimiter({
    windowMs: 15 * 60 * 1e3,
    max: 25,
    bucketPrefix: "auth",
    message: "Muitas tentativas de acesso em sequ\xEAncia. Aguarde alguns minutos e tente novamente."
  });
  const aiRateLimiter = createRateLimiter({
    windowMs: 10 * 60 * 1e3,
    max: 30,
    bucketPrefix: "ai",
    message: "Limite tempor\xE1rio de requisi\xE7\xF5es inteligentes atingido. Aguarde alguns instantes."
  });
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", app: "PATOFOOT 2026", version: "1.0.0" });
  });
  app.use("/api/auth", authRateLimiter);
  app.use(
    [
      "/api/players/nationalities",
      "/api/players/overalls",
      "/api/leagues/south-america/calibrate",
      "/api/leagues/europe/calibrate",
      "/api/leagues/world/calibrate",
      "/api/clubs/squads/october-2026",
      "/api/transfers/rumors"
    ],
    (req, res, next) => {
      if (req.method === "POST") {
        aiRateLimiter(req, res, next);
        return;
      }
      next();
    }
  );
  app.post("/api/auth/register", (req, res) => {
    const rawName = String(req.body?.displayName ?? "").trim();
    const rawPassword = String(req.body?.password ?? "");
    const rawClubId = String(req.body?.favoriteClubId ?? "fla").trim() || "fla";
    if (rawName.length < 2 || rawName.length > 60) {
      res.status(400).json({
        error: "INVALID_NAME",
        message: "Informe seu nome ou login entre 2 e 60 caracteres."
      });
      return;
    }
    const usernameKey = normalizeServerUsernameKey(rawName);
    if (usernameKey.length < 2) {
      res.status(400).json({
        error: "INVALID_LOGIN",
        message: "Use letras ou n\xFAmeros v\xE1lidos para criar seu login."
      });
      return;
    }
    if (rawPassword.length < 4 || rawPassword.length > 128) {
      res.status(400).json({
        error: "INVALID_PASSWORD",
        message: "A senha deve ter pelo menos 4 caracteres."
      });
      return;
    }
    const accounts = readTrainerAccounts();
    const existing = accounts.find((acc) => acc.usernameKey === usernameKey);
    if (existing) {
      res.status(409).json({
        error: "ACCOUNT_EXISTS",
        message: 'J\xE1 existe um acesso cadastrado com esse nome/login. Clique em "Entrar no Jogo" e digite sua senha.'
      });
      return;
    }
    const saltHex = crypto.randomBytes(16).toString("hex");
    const passwordHash = hashPasswordWithSalt(rawPassword, saltHex);
    const nowIso = (/* @__PURE__ */ new Date()).toISOString();
    const uid = `usr_${crypto.randomBytes(10).toString("hex")}`;
    const safeClubId = /^[a-zA-Z0-9_\-]{2,32}$/.test(rawClubId) ? rawClubId : "fla";
    const newAccount = {
      uid,
      displayName: rawName,
      usernameKey,
      passwordSalt: saltHex,
      passwordHash,
      favoriteClubId: safeClubId,
      createdAt: nowIso,
      updatedAt: nowIso
    };
    accounts.push(newAccount);
    writeTrainerAccounts(accounts);
    res.status(201).json({
      uid: newAccount.uid,
      displayName: newAccount.displayName,
      usernameKey: newAccount.usernameKey,
      favoriteClubId: newAccount.favoriteClubId,
      createdAt: newAccount.createdAt,
      sessionToken: issueServerSessionToken(newAccount.uid)
    });
  });
  app.post("/api/auth/login", (req, res) => {
    const rawLogin = String(req.body?.login ?? "").trim();
    const rawPassword = String(req.body?.password ?? "");
    const usernameKey = normalizeServerUsernameKey(rawLogin);
    if (!usernameKey || usernameKey.length < 2) {
      res.status(400).json({
        error: "INVALID_LOGIN",
        message: "Digite seu nome ou login para entrar."
      });
      return;
    }
    if (!rawPassword) {
      res.status(400).json({
        error: "MISSING_PASSWORD",
        message: "Digite sua senha para entrar no jogo."
      });
      return;
    }
    const accounts = readTrainerAccounts();
    const found = accounts.find(
      (acc) => acc.usernameKey === usernameKey || acc.displayName.toLowerCase() === rawLogin.toLowerCase()
    );
    if (!found) {
      res.status(404).json({
        error: "ACCOUNT_NOT_FOUND",
        message: 'Nenhum acesso encontrado com esse nome/login. Use a aba "Criar Acesso" para se cadastrar.'
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
        error: "WRONG_PASSWORD",
        message: "Senha incorreta. Confira a senha digitada e tente novamente."
      });
      return;
    }
    res.json({
      uid: found.uid,
      displayName: found.displayName,
      usernameKey: found.usernameKey,
      favoriteClubId: found.favoriteClubId,
      createdAt: found.createdAt,
      sessionToken: issueServerSessionToken(found.uid)
    });
  });
  app.post("/api/auth/club", (req, res) => {
    const authenticatedUid = verifyServerSessionToken(req.headers.authorization);
    const uid = String(req.body?.uid ?? "").trim();
    const rawClubId = String(req.body?.favoriteClubId ?? "").trim();
    if (!authenticatedUid || !uid || authenticatedUid !== uid) {
      res.status(401).json({ error: "UNAUTHORIZED" });
      return;
    }
    if (!/^[a-zA-Z0-9_\-]{2,32}$/.test(rawClubId)) {
      res.status(400).json({ error: "INVALID_INPUT" });
      return;
    }
    const accounts = readTrainerAccounts();
    const idx = accounts.findIndex((acc) => acc.uid === authenticatedUid);
    if (idx >= 0) {
      accounts[idx] = {
        ...accounts[idx],
        favoriteClubId: rawClubId,
        updatedAt: (/* @__PURE__ */ new Date()).toISOString()
      };
      writeTrainerAccounts(accounts);
    }
    res.json({ ok: true });
  });
  app.get("/api/players/nationalities/status", (_req, res) => {
    const hasKey = Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim());
    res.json({
      configured: hasKey,
      cachedPlayers: resolvedNationalityCache.size,
      model: "gemini-3.8-flash"
    });
  });
  app.post("/api/players/nationalities", async (req, res) => {
    try {
      const rawPlayers = Array.isArray(req.body?.players) ? req.body.players : [];
      const forceRefresh = Boolean(req.body?.forceRefresh);
      if (rawPlayers.length === 0) {
        res.json({
          nationalities: {},
          resolvedCount: 0,
          cachedCount: 0,
          usedAi: false,
          usedGoogleSearch: false,
          groundingSources: [],
          model: "gemini-3.8-flash"
        });
        return;
      }
      const players = rawPlayers.slice(0, 120);
      const nationalitiesById = {};
      const uncached = [];
      let cachedCount = 0;
      for (const p of players) {
        if (!p || !p.id || !p.name) continue;
        const cached = !forceRefresh ? resolvedNationalityCache.get(makeCacheKey(p)) : void 0;
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
          model: "gemini-3.8-flash"
        });
        return;
      }
      const ai = getGenAIClient();
      if (!ai) {
        res.status(503).json({
          error: "API_KEY_MISSING",
          message: "Chave GEMINI_API_KEY n\xE3o configurada no servidor.",
          nationalities: nationalitiesById,
          resolvedCount: Object.keys(nationalitiesById).length,
          cachedCount,
          usedAi: false,
          usedGoogleSearch: false,
          groundingSources: []
        });
        return;
      }
      const groundingSourcesMap = /* @__PURE__ */ new Map();
      let usedGoogleSearch = false;
      let wroteNewCacheEntries = false;
      const CHUNK_SIZE = 50;
      for (let offset = 0; offset < uncached.length; offset += CHUNK_SIZE) {
        const batch = uncached.slice(offset, offset + CHUNK_SIZE);
        const promptLines = batch.map(
          (p) => `- id="${p.id}" | nome="${p.name}" | clube="${p.clubName || "Sem Clube"}" | pos="${p.role || ""}" | idade=${p.age || 25} | paisClube="${p.fallbackCountry || "Brasil"}"`
        );
        const basePrompt = [
          "Pesquise e verifique na vida real a nacionalidade esportiva oficial FIFA (pa\xEDs de sele\xE7\xE3o principal que o atleta representa ou nasceu) de cada jogador de futebol listado abaixo.",
          "Regras estritas:",
          "1. Use a busca Google Search quando necess\xE1rio para confirmar atletas naturalizados, dupla nacionalidade FIFA ou transferidos recentemente.",
          '2. Retorne o nome do pa\xEDs SEMPRE em portugu\xEAs do Brasil (ex.: "Brasil", "Argentina", "Uruguai", "Paraguai", "Col\xF4mbia", "Equador", "Chile", "Venezuela", "Peru", "Bol\xEDvia", "Holanda", "Fran\xE7a", "Espanha", "Portugal", "Angola", "Inglaterra", "Alemanha", "It\xE1lia", "B\xE9lgica", "Cro\xE1cia", "Su\xED\xE7a", "Noruega", "S\xE9rvia", "Turquia", "Arm\xEAnia", "R\xFAssia", "Coreia do Sul", "Canad\xE1", "Estados Unidos", "M\xE9xico", "Marrocos", "Senegal", "Nig\xE9ria", "Gana", "Costa do Marfim", "Camar\xF5es", "Egito", "Arg\xE9lia", "Guin\xE9", "Burkina Faso", "Gab\xE3o", "Tun\xEDsia", "RD Congo", "Palestina", "Alb\xE2nia", "Uzbequist\xE3o", "Jap\xE3o", "\xC1ustria", "Dinamarca", "Su\xE9cia", "Pol\xF4nia", "Gr\xE9cia", "Esc\xF3cia", "Pa\xEDs de Gales", "Irlanda", "Ucr\xE2nia", "Ge\xF3rgia", "Eslov\xEAnia", "Eslov\xE1quia", "Rep\xFAblica Tcheca", "Hungria", "B\xF3snia e Herzegovina", "Kosovo", "Israel", "Ir\xE3", "Cuba", "Ar\xE1bia Saudita").',
          '3. Exemplos importantes de nacionalidade esportiva FIFA real: I\xF1aki Williams (Athletic) = "Gana"; Dean Huijsen, Robin Le Normand e Aymeric Laporte = "Espanha"; Matheus Nunes (Man City) = "Portugal"; Matty Cash (Aston Villa) = "Pol\xF4nia"; Johnny Cardoso e Malik Tillman = "Estados Unidos"; Rayan A\xEFt-Nouri, Amine Gouiri e Anis Hadj Moussa = "Arg\xE9lia"; Serhou Guirassy = "Guin\xE9"; Edmond Tapsoba = "Burkina Faso"; Bryan Mbeumo e Zambo Anguissa = "Camar\xF5es"; Amir Rrahmani = "Kosovo"; Mat\xEDas Zaldivia = "Chile"; Guillermo Viscarra, Marc Enoumba e Luciano Ursino = "Bol\xEDvia"; Claudio Aquino = "Paraguai"; Bastos (Botafogo) = "Angola"; Rossi (Flamengo) = "Argentina"; Arrascaeta e De La Cruz = "Uruguai".',
          "4. Caso o nome seja claramente gen\xE9rico/fict\xEDcio sem atleta real correspondente, mantenha paisClube.",
          '5. Responda APENAS um array JSON puro no formato exato [{"id":"...","nationality":"..."}], sem texto extra antes ou depois.',
          "",
          "Jogadores para pesquisar:",
          ...promptLines
        ].join("\n");
        let parsed = null;
        let hitQuotaLimit = false;
        const groundedResult = await generateGroundedIfAvailable(
          ai,
          basePrompt,
          'Voc\xEA \xE9 um pesquisador oficial de dados FIFA e scouting mundial. Utilize Google Search para confirmar a sele\xE7\xE3o/nacionalidade real de cada jogador de futebol e retorne estritamente um JSON array [{"id":"...","nationality":"..."}] em portugu\xEAs do Brasil.'
        );
        if (groundedResult) {
          const chunks = groundedResult.response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
          for (const ch of chunks) {
            const uri = ch.web?.uri;
            const title = ch.web?.title;
            if (uri && !groundingSourcesMap.has(uri)) {
              usedGoogleSearch = true;
              groundingSourcesMap.set(uri, {
                uri,
                title: (title || "Fonte Web").trim()
              });
            }
          }
          parsed = extractJsonArrayFromText(groundedResult.response.text || "");
        }
        if (!parsed || parsed.length === 0) {
          const structuredResult = await generateStructuredWithFallback(ai, basePrompt, {
            systemInstruction: "Voc\xEA \xE9 um especialista enciclop\xE9dico em futebol brasileiro, sul-americano e internacional. Responda exclusivamente em JSON v\xE1lido seguindo o schema solicitado.",
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: {
                    type: Type.STRING,
                    description: "O mesmo id exato do jogador enviado na entrada."
                  },
                  nationality: {
                    type: Type.STRING,
                    description: "Nome do pa\xEDs da nacionalidade real FIFA em portugu\xEAs do Brasil."
                  }
                },
                required: ["id", "nationality"]
              }
            }
          });
          if (!structuredResult) {
            hitQuotaLimit = true;
          } else {
            parsed = extractJsonArrayFromText(structuredResult.response.text || "[]");
          }
        }
        if (Array.isArray(parsed)) {
          const inputById = new Map(batch.map((b) => [b.id, b]));
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
            model: PRIMARY_GEMINI_MODEL
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
        model: PRIMARY_GEMINI_MODEL
      });
    } catch (err) {
      if (isGeminiQuotaError(err)) {
        res.json({
          nationalities: {},
          resolvedCount: 0,
          cachedCount: 0,
          usedAi: false,
          quotaLimited: true,
          usedGoogleSearch: false,
          groundingSources: []
        });
        return;
      }
      const msg = err instanceof Error ? err.message : String(err);
      console.error("[Gemini Nationality API Error]:", msg);
      res.status(500).json({
        error: "AI_REQUEST_FAILED",
        message: "N\xE3o foi poss\xEDvel consultar a IA no momento; mantendo nacionalidades verificadas locais."
      });
    }
  });
  app.post("/api/players/overalls", async (req, res) => {
    try {
      const rawPlayers = Array.isArray(req.body?.players) ? req.body.players : [];
      if (rawPlayers.length === 0) {
        res.json({
          overalls: {},
          resolvedCount: 0,
          cachedCount: 0,
          usedAi: false,
          model: "gemini-3.8-flash"
        });
        return;
      }
      const players = rawPlayers.slice(0, 180);
      const overallsById = {};
      const uncached = [];
      let cachedCount = 0;
      for (const p of players) {
        if (!p || !p.id || !p.name) continue;
        const cached = resolvedOverallCache.get(makeOverallCacheKey(p));
        if (typeof cached === "number") {
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
          model: "gemini-3.8-flash"
        });
        return;
      }
      const ai = getGenAIClient();
      if (!ai) {
        res.status(503).json({
          error: "API_KEY_MISSING",
          message: "Chave GEMINI_API_KEY n\xE3o configurada no servidor.",
          overalls: overallsById,
          resolvedCount: Object.keys(overallsById).length,
          cachedCount,
          usedAi: false
        });
        return;
      }
      const CHUNK_SIZE = 60;
      for (let offset = 0; offset < uncached.length; offset += CHUNK_SIZE) {
        const batch = uncached.slice(offset, offset + CHUNK_SIZE);
        const promptLines = batch.map(
          (p) => `- id="${p.id}" | nome="${p.name}" | clube="${p.clubName || "Sem Clube"}" | div="${p.division || "A"}" | rep=${p.reputation || 3} | pos="${p.role || "MEI"}" | idade=${p.age || 25} | titular=${p.isStarter ? "sim" : "nao"} | atual=${p.currentOverall || 70}`
        );
        const structuredResult = await generateStructuredWithFallback(
          ai,
          [
            "Defina o Overall (for\xE7a geral de 48 a 93) realista de cada jogador listado abaixo, seguindo rigorosamente a hierarquia real do futebol mundial, europeu, brasileiro e sul-americano (padr\xE3o EA FC / Football Manager 2026):",
            "Regras estritas de escala por divis\xE3o e n\xEDvel real:",
            '1. EUROPA (div="EU"): Superestrelas mundiais de Real Madrid, Man City, Liverpool, Arsenal, Barcelona, Bayern, Inter, PSG (ex.: Mbapp\xE9, Haaland, Vin\xEDcius Jr., Rodri, Salah, Saka, Bellingham, Kane, Lamine Yamal, Vitinha) = 86 a 92. Titulares fortes da Premier League/LaLiga/Serie A/Bundesliga/Ligue 1 = 78 a 85. Titulares de Portugal/Holanda/B\xE9lgica/Turquia/Gr\xE9cia ou clubes m\xE9dios das Top 5 = 71 a 80. EFL Championship (2\xAA Inglaterra) = 67 a 76. EFL League One (3\xAA Inglaterra) = 60 a 69. EFL League Two (4\xAA Inglaterra) = 54 a 64.',
            '2. S\xC9RIE A BRASIL (div="A"): Craques absolutos do continente (ex.: Pedro, Arrascaeta, Est\xEAv\xE3o, Neymar, Raphael Veiga, Hulk, Gerson, Luiz Henrique, Memphis Depay, Rodrigo Garro, Alan Patrick, Jhon Arias) = 82 a 86. Titulares fortes de clubes G-6/G-12 = 77 a 81. Titulares m\xE9dios/clubes menores da S\xE9rie A = 72 a 76. Reservas da S\xE9rie A = 67 a 74.',
            '3. AM\xC9RICA DO SUL (div="SA", 9 ligas CONMEBOL): Estrelas de River Plate, Boca Juniors, Racing, V\xE9lez, Pe\xF1arol, Nacional, Atl. Nacional, IDV, LDU, Colo-Colo, Olimpia = 76 a 82. Titulares m\xE9dios da Argentina/Col\xF4mbia/Uruguai/Equador/Chile/Paraguai = 68 a 75. Titulares de clubes menores do Peru/Bol\xEDvia/Venezuela = 62 a 69. Reservas = 58 a 68.',
            '4. LIGAS MUNDIAIS (div="WL" \u2014 Am\xE9rica do Norte EUA/M\xE9xico, \xC1sia/R\xFAssia Ar\xE1bia Saudita/Jap\xE3o/R\xFAssia e \xC1frica Egito/Marrocos): Superestrelas globais (ex.: Lionel Messi, Cristiano Ronaldo, Benzema, Theo Hern\xE1ndez, R\xFAben Neves, Bounou, Cancelo, Son Heung-min, Rodrigo De Paul) = 83 a 89. Destaques de Al-Hilal, Al-Nassr, Al-Ittihad, Al-Ahli, Inter Miami, Club Am\xE9rica, Monterrey, Zenit, Krasnodar, Spartak, Al Ahly, Vissel Kobe = 77 a 83. Titulares m\xE9dios da MLS, Liga MX, Saudi Pro League, J1 League, Premier Liga Russa, Egito e Botola Pro = 70 a 77. Clubes menores e reservas = 62 a 70.',
            '5. S\xC9RIE B (div="B"): Destaques da divis\xE3o = 71 a 75. Titulares m\xE9dios da S\xE9rie B = 66 a 71. Reservas = 60 a 66.',
            '6. S\xC9RIE C (div="C"): Destaques da S\xE9rie C = 64 a 67. Titulares comuns = 60 a 64. Reservas = 55 a 60.',
            '7. S\xC9RIE D (div="D"): Destaques da S\xE9rie D = 58 a 62. Titulares comuns = 53 a 58. Reservas = 48 a 54.',
            "8. Respeite a posi\xE7\xE3o (GOL, ZAG, LAT, VOL, MEI, ATA) e o momento real da carreira em 2026 conforme a idade.",
            "",
            "Jogadores para calibrar:",
            ...promptLines
          ].join("\n"),
          {
            systemInstruction: "Voc\xEA \xE9 o head scout chefe de ratings do futebol mundial (UEFA e CONMEBOL) em 2026. Retorne exclusivamente JSON v\xE1lido conforme o schema solicitado, com n\xFAmeros inteiros realistas e equilibrados entre as divis\xF5es.",
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: {
                    type: Type.STRING,
                    description: "O mesmo id exato do jogador enviado na entrada."
                  },
                  overall: {
                    type: Type.INTEGER,
                    description: "Overall realista inteiro entre 48 e 93."
                  }
                },
                required: ["id", "overall"]
              }
            }
          }
        );
        if (!structuredResult) {
          res.json({
            overalls: overallsById,
            resolvedCount: Object.keys(overallsById).length,
            cachedCount,
            usedAi: Object.keys(overallsById).length > cachedCount,
            quotaLimited: true,
            model: PRIMARY_GEMINI_MODEL
          });
          return;
        }
        const rawText = structuredResult.response.text || "[]";
        const parsed = JSON.parse(rawText);
        if (Array.isArray(parsed)) {
          const inputById = new Map(batch.map((b) => [b.id, b]));
          for (const item of parsed) {
            if (!item || !item.id || typeof item.overall !== "number") continue;
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
        model: PRIMARY_GEMINI_MODEL
      });
    } catch (err) {
      if (isGeminiQuotaError(err)) {
        res.json({
          overalls: {},
          resolvedCount: 0,
          cachedCount: 0,
          usedAi: false,
          quotaLimited: true
        });
        return;
      }
      const msg = err instanceof Error ? err.message : String(err);
      console.error("[Gemini Overalls API Error]:", msg);
      res.status(500).json({
        error: "AI_REQUEST_FAILED",
        message: "N\xE3o foi poss\xEDvel calibrar via IA agora; mantendo curva realista local."
      });
    }
  });
  app.post("/api/leagues/south-america/calibrate", async (req, res) => {
    try {
      const leagueId = String(req.body?.leagueId ?? "").trim();
      const country = String(req.body?.country ?? "Am\xE9rica do Sul").trim();
      const leagueName = String(req.body?.leagueName ?? "Liga Sul-Americana").trim();
      const forceRefresh = Boolean(req.body?.forceRefresh);
      const rawClubs = Array.isArray(req.body?.clubs) ? req.body.clubs.slice(0, 22) : [];
      if (rawClubs.length === 0) {
        res.json({
          leagueId,
          clubs: [],
          usedAi: false,
          model: "gemini-3.8-flash"
        });
        return;
      }
      const calibratedResults = [];
      const uncachedClubs = [];
      for (const c of rawClubs) {
        if (!c || !c.id || !c.name) continue;
        const cached = !forceRefresh ? resolvedSouthAmericaClubCache.get(c.id) : void 0;
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
          model: "gemini-3.8-flash"
        });
        return;
      }
      const ai = getGenAIClient();
      if (!ai) {
        res.status(503).json({
          error: "API_KEY_MISSING",
          message: "Chave GEMINI_API_KEY n\xE3o configurada no servidor.",
          leagueId,
          clubs: calibratedResults,
          usedAi: false
        });
        return;
      }
      const CHUNK_SIZE = 10;
      const validRoles = /* @__PURE__ */ new Set(["GOL", "ZAG", "LAT", "VOL", "MEI", "ATA"]);
      for (let offset = 0; offset < uncachedClubs.length; offset += CHUNK_SIZE) {
        const batch = uncachedClubs.slice(offset, offset + CHUNK_SIZE);
        const clubLines = batch.map(
          (c) => `- clubId="${c.id}" | clube="${c.name}" | pais="${country}" | rep=${c.reputation || 3}`
        );
        const structuredResult = await generateStructuredWithFallback(
          ai,
          [
            `Calibre com fidelidade \xE0 vida real (temporada 2025/2026) os clubes abaixo da ${leagueName} (${country} - CONMEBOL).`,
            "Regras obrigat\xF3rias:",
            "1. Informe o nome real do treinador atual ou mais emblem\xE1tico recente de cada clube em managerName.",
            "2. Defina os n\xEDveis realistas de Defesa (def), Meio-campo (mei) e Ataque (ata) na escala 58 a 83:",
            "   - Gigantes continentais (River Plate, Boca Juniors, Racing, V\xE9lez, Pe\xF1arol, Nacional, Atl. Nacional, IDV, LDU, Colo-Colo, Olimpia): 74 a 82.",
            "   - Clubes tradicionais competitivos da Argentina, Col\xF4mbia, Uruguai, Equador, Chile e Paraguai: 68 a 75.",
            "   - Clubes m\xE9dios/menores do Peru, Bol\xEDvia, Venezuela, Chile, Uruguai, Paraguai, Equador e Col\xF4mbia: 61 a 69.",
            '3. Para cada clube, liste 3 jogadores titulares reais atuais em keyPlayers com: name (nome conhecido real), role estritamente entre "GOL", "ZAG", "LAT", "VOL", "MEI" ou "ATA", age (idade real aproximada 17-41), overall (58 a 83 coerente com o clube) e nationality (pa\xEDs em portugu\xEAs do Brasil, ex.: "Argentina", "Col\xF4mbia", "Uruguai", "Paraguai", "Chile", "Equador", "Peru", "Bol\xEDvia", "Venezuela", "Brasil").',
            "",
            "Clubes para calibrar:",
            ...clubLines
          ].join("\n"),
          {
            systemInstruction: "Voc\xEA \xE9 o diretor chefe de scouting sul-americano (CONMEBOL) especialista nas 10 ligas nacionais da Am\xE9rica do Sul. Responda exclusivamente em JSON v\xE1lido seguindo o schema.",
            responseMimeType: "application/json",
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
                        nationality: { type: Type.STRING }
                      },
                      required: ["name", "role", "age", "overall", "nationality"]
                    }
                  }
                },
                required: ["clubId", "managerName", "def", "mei", "ata", "keyPlayers"]
              }
            }
          }
        );
        if (!structuredResult) {
          res.json({
            leagueId,
            clubs: calibratedResults,
            usedAi: calibratedResults.length > 0,
            quotaLimited: true,
            cached: false,
            model: PRIMARY_GEMINI_MODEL
          });
          return;
        }
        const rawText = structuredResult.response.text || "[]";
        const parsed = JSON.parse(rawText);
        if (Array.isArray(parsed)) {
          for (const item of parsed) {
            if (!item || !item.clubId) continue;
            const sanitized = {
              clubId: item.clubId,
              managerName: String(item.managerName || "").trim() || "Treinador Principal",
              def: Math.max(58, Math.min(84, Math.round(Number(item.def) || 68))),
              mei: Math.max(58, Math.min(84, Math.round(Number(item.mei) || 68))),
              ata: Math.max(58, Math.min(84, Math.round(Number(item.ata) || 68))),
              keyPlayers: Array.isArray(item.keyPlayers) ? item.keyPlayers.slice(0, 4).map((kp) => {
                const normRole = String(kp.role || "MEI").toUpperCase().trim();
                const safeRole = validRoles.has(normRole) ? normRole : "MEI";
                return {
                  name: String(kp.name || "").trim(),
                  role: safeRole,
                  age: Math.max(17, Math.min(42, Math.round(Number(kp.age) || 26))),
                  overall: Math.max(58, Math.min(85, Math.round(Number(kp.overall) || 70))),
                  nationality: String(kp.nationality || country).trim() || country
                };
              }).filter((kp) => kp.name.length >= 2) : []
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
        model: PRIMARY_GEMINI_MODEL
      });
    } catch (err) {
      if (isGeminiQuotaError(err)) {
        res.json({
          leagueId: String(req.body?.leagueId ?? ""),
          clubs: [],
          usedAi: false,
          quotaLimited: true
        });
        return;
      }
      const msg = err instanceof Error ? err.message : String(err);
      console.error("[Gemini South America League Calibration Error]:", msg);
      res.status(500).json({
        error: "AI_REQUEST_FAILED",
        message: "N\xE3o foi poss\xEDvel calibrar a liga sul-americana via IA neste momento."
      });
    }
  });
  app.post("/api/leagues/europe/calibrate", async (req, res) => {
    try {
      const leagueId = String(req.body?.leagueId ?? "").trim();
      const country = String(req.body?.country ?? "Europa").trim();
      const leagueName = String(req.body?.leagueName ?? "Liga Europeia").trim();
      const tier = Math.max(1, Math.min(4, Number(req.body?.tier) || 1));
      const forceRefresh = Boolean(req.body?.forceRefresh);
      const rawClubs = Array.isArray(req.body?.clubs) ? req.body.clubs.slice(0, 26) : [];
      if (rawClubs.length === 0) {
        res.json({
          leagueId,
          clubs: [],
          usedAi: false,
          model: "gemini-3.8-flash"
        });
        return;
      }
      const calibratedResults = [];
      const uncachedClubs = [];
      for (const c of rawClubs) {
        if (!c || !c.id || !c.name) continue;
        const cached = !forceRefresh ? resolvedEuropeClubCache.get(c.id) : void 0;
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
          model: "gemini-3.8-flash"
        });
        return;
      }
      const ai = getGenAIClient();
      if (!ai) {
        res.status(503).json({
          error: "API_KEY_MISSING",
          message: "Chave GEMINI_API_KEY n\xE3o configurada no servidor.",
          leagueId,
          clubs: calibratedResults,
          usedAi: false
        });
        return;
      }
      const minSector = tier === 4 ? 54 : tier === 3 ? 58 : tier === 2 ? 65 : 67;
      const maxSector = tier === 4 ? 66 : tier === 3 ? 72 : tier === 2 ? 78 : 91;
      const CHUNK_SIZE = 12;
      const validRoles = /* @__PURE__ */ new Set(["GOL", "ZAG", "LAT", "VOL", "MEI", "ATA"]);
      for (let offset = 0; offset < uncachedClubs.length; offset += CHUNK_SIZE) {
        const batch = uncachedClubs.slice(offset, offset + CHUNK_SIZE);
        const clubLines = batch.map(
          (c) => `- clubId="${c.id}" | clube="${c.name}" | pais="${country}" | divisao=${tier}\xAA | rep=${c.reputation || 3}`
        );
        const structuredResult = await generateStructuredWithFallback(
          ai,
          [
            `Calibre com fidelidade \xE0 temporada europeia 2025/2026 os clubes abaixo da ${leagueName} (${country} - ${tier}\xAA Divis\xE3o UEFA).`,
            "Regras obrigat\xF3rias de atualiza\xE7\xE3o 2026:",
            "1. Informe o nome real do t\xE9cnico atual em 2025/2026 de cada clube em managerName.",
            `2. Defina os n\xEDveis realistas de Defesa (def), Meio-campo (mei) e Ataque (ata) estritamente na faixa ${minSector} a ${maxSector}:`,
            "   - Gigantes da Champions League (Real Madrid, Man City, Liverpool, Arsenal, Barcelona, Bayern, Inter, PSG): 84 a 90.",
            "   - Fortes das Top 5 ligas (Atl\xE9tico Madrid, Chelsea, Aston Villa, Newcastle, Tottenham, Napoli, Milan, Juventus, Leverkusen, Dortmund, Marseille, Monaco) e gigantes de Portugal/Holanda/Turquia (Sporting, Benfica, Porto, PSV, Galatasaray, Fenerbah\xE7e): 77 a 84.",
            "   - Clubes m\xE9dios/menores da 1\xAA Divis\xE3o Europeia (Espanha, It\xE1lia, Alemanha, Fran\xE7a, Portugal, Holanda, B\xE9lgica, Turquia, Gr\xE9cia): 68 a 77.",
            "   - EFL Championship (2\xAA Inglaterra): 66 a 76. EFL League One (3\xAA Inglaterra): 59 a 69. EFL League Two (4\xAA Inglaterra): 55 a 63.",
            `3. Para cada clube, liste 4 jogadores titulares reais do elenco 2025/2026 em keyPlayers com: name (nome conhecido real), role estritamente entre "GOL", "ZAG", "LAT", "VOL", "MEI" ou "ATA", age (idade em 2026 entre 16 e 41), overall (${minSector} a ${maxSector + 1} coerente com a divis\xE3o) e nationality (pa\xEDs em portugu\xEAs do Brasil, ex.: "Inglaterra", "Espanha", "Fran\xE7a", "Alemanha", "It\xE1lia", "Portugal", "Holanda", "B\xE9lgica", "Turquia", "Gr\xE9cia", "Brasil", "Argentina", "Noruega", "Egito").`,
            "",
            "Clubes para calibrar:",
            ...clubLines
          ].join("\n"),
          {
            systemInstruction: "Voc\xEA \xE9 o diretor chefe de scouting europeu (UEFA) especialista na temporada 2025/2026 das 4 divis\xF5es da Inglaterra e das primeiras divis\xF5es da Alemanha, Fran\xE7a, Espanha, It\xE1lia, Portugal, Holanda, B\xE9lgica, Turquia e Gr\xE9cia. Responda exclusivamente em JSON v\xE1lido seguindo o schema.",
            responseMimeType: "application/json",
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
                        nationality: { type: Type.STRING }
                      },
                      required: ["name", "role", "age", "overall", "nationality"]
                    }
                  }
                },
                required: ["clubId", "managerName", "def", "mei", "ata", "keyPlayers"]
              }
            }
          }
        );
        if (!structuredResult) {
          res.json({
            leagueId,
            clubs: calibratedResults,
            usedAi: calibratedResults.length > 0,
            quotaLimited: true,
            cached: false,
            model: PRIMARY_GEMINI_MODEL
          });
          return;
        }
        const rawText = structuredResult.response.text || "[]";
        const parsed = JSON.parse(rawText);
        if (Array.isArray(parsed)) {
          for (const item of parsed) {
            if (!item || !item.clubId) continue;
            const sanitized = {
              clubId: item.clubId,
              managerName: String(item.managerName || "").trim() || "Treinador Principal",
              def: Math.max(minSector, Math.min(maxSector, Math.round(Number(item.def) || 72))),
              mei: Math.max(minSector, Math.min(maxSector, Math.round(Number(item.mei) || 72))),
              ata: Math.max(minSector, Math.min(maxSector, Math.round(Number(item.ata) || 72))),
              keyPlayers: Array.isArray(item.keyPlayers) ? item.keyPlayers.slice(0, 5).map((kp) => {
                const normRole = String(kp.role || "MEI").toUpperCase().trim();
                const safeRole = validRoles.has(normRole) ? normRole : "MEI";
                return {
                  name: String(kp.name || "").trim(),
                  role: safeRole,
                  age: Math.max(16, Math.min(42, Math.round(Number(kp.age) || 26))),
                  overall: Math.max(
                    minSector - 2,
                    Math.min(maxSector + 2, Math.round(Number(kp.overall) || 74))
                  ),
                  nationality: String(kp.nationality || country).trim() || country
                };
              }).filter((kp) => kp.name.length >= 2) : []
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
        model: PRIMARY_GEMINI_MODEL
      });
    } catch (err) {
      if (isGeminiQuotaError(err)) {
        res.json({
          leagueId: String(req.body?.leagueId ?? ""),
          clubs: [],
          usedAi: false,
          quotaLimited: true
        });
        return;
      }
      const msg = err instanceof Error ? err.message : String(err);
      console.error("[Gemini Europe League Calibration Error]:", msg);
      res.status(500).json({
        error: "AI_REQUEST_FAILED",
        message: "N\xE3o foi poss\xEDvel calibrar a liga europeia via IA neste momento."
      });
    }
  });
  app.post("/api/leagues/world/calibrate", async (req, res) => {
    try {
      const leagueId = String(req.body?.leagueId ?? "").trim();
      const country = String(req.body?.country ?? "Internacional").trim();
      const leagueName = String(req.body?.leagueName ?? "Liga Mundial").trim();
      const forceRefresh = Boolean(req.body?.forceRefresh);
      const rawClubs = Array.isArray(req.body?.clubs) ? req.body.clubs.slice(0, 24) : [];
      if (rawClubs.length === 0) {
        res.json({
          leagueId,
          clubs: [],
          usedAi: false,
          model: "gemini-3.8-flash"
        });
        return;
      }
      const calibratedResults = [];
      const uncachedClubs = [];
      for (const c of rawClubs) {
        if (!c || !c.id || !c.name) continue;
        const cached = !forceRefresh ? resolvedWorldClubCache.get(c.id) : void 0;
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
          model: "gemini-3.8-flash"
        });
        return;
      }
      const ai = getGenAIClient();
      if (!ai) {
        res.status(503).json({
          error: "API_KEY_MISSING",
          message: "Chave GEMINI_API_KEY n\xE3o configurada no servidor.",
          leagueId,
          clubs: calibratedResults,
          usedAi: false
        });
        return;
      }
      const minSector = 65;
      const maxSector = 87;
      const CHUNK_SIZE = 10;
      const validRoles = /* @__PURE__ */ new Set(["GOL", "ZAG", "LAT", "VOL", "MEI", "ATA"]);
      for (let offset = 0; offset < uncachedClubs.length; offset += CHUNK_SIZE) {
        const batch = uncachedClubs.slice(offset, offset + CHUNK_SIZE);
        const clubLines = batch.map(
          (c) => `- clubId="${c.id}" | clube="${c.name}" | pais="${country}" | rep=${c.reputation || 3}`
        );
        const basePrompt = [
          `Pesquise e calibre com fidelidade \xE0 temporada atual de 2026 os clubes abaixo da ${leagueName} (${country}).`,
          "Regras obrigat\xF3rias de atualiza\xE7\xE3o 2026:",
          "1. Informe o nome real do t\xE9cnico atual em 2026 de cada clube em managerName.",
          `2. Defina os n\xEDveis realistas de Defesa (def), Meio-campo (mei) e Ataque (ata) estritamente na faixa ${minSector} a ${maxSector}:`,
          "   - Pot\xEAncias Sauditas / Norte-Americanas / Russas (Al-Hilal, Al-Nassr, Al-Ittihad, Al-Ahli, Inter Miami, Club Am\xE9rica, Monterrey, Cruz Azul, Zenit, Krasnodar, Spartak Moscou): 78 a 86.",
          "   - Gigantes do Jap\xE3o e da \xC1frica (Vissel Kobe, Sanfrecce Hiroshima, Kashima Antlers, Yokohama F. Marinos, Al Ahly, Pyramids, Zamalek, Raja Casablanca, Wydad Casablanca, AS FAR, RS Berkane) e fortes de MLS/Liga MX/R\xFAssia: 74 a 81.",
          "   - Clubes m\xE9dios/menores dessas ligas nacionais: 66 a 74.",
          `3. Para cada clube, liste 4 jogadores titulares reais do elenco de 2026 em keyPlayers com: name (nome conhecido real), role estritamente entre "GOL", "ZAG", "LAT", "VOL", "MEI" ou "ATA", age (idade em 2026 entre 17 e 42), overall (${minSector} a ${maxSector + 2}) e nationality (pa\xEDs em portugu\xEAs do Brasil, ex.: "Estados Unidos", "M\xE9xico", "Ar\xE1bia Saudita", "Jap\xE3o", "R\xFAssia", "Egito", "Marrocos", "Argentina", "Brasil", "Portugal", "Fran\xE7a", "Espanha", "Uruguai", "Col\xF4mbia", "Senegal", "Coreia do Sul").`,
          "4. Retorne APENAS JSON puro no formato exato de array de objetos seguindo as chaves clubId, managerName, def, mei, ata e keyPlayers.",
          "",
          "Clubes para calibrar:",
          ...clubLines
        ].join("\n");
        let parsed = null;
        const groundedWorldResult = await generateGroundedIfAvailable(
          ai,
          basePrompt,
          "Voc\xEA \xE9 o diretor global de scouting FIFA especialista na temporada 2026 da MLS (EUA), Liga MX (M\xE9xico), Saudi Pro League (Ar\xE1bia Saudita), J1 League (Jap\xE3o), Premier Liga (R\xFAssia), Liga Eg\xEDpcia e Botola Pro (Marrocos). Use Google Search para verificar elencos e t\xE9cnicos atuais de 2026 e responda estritamente um array JSON v\xE1lido."
        );
        if (groundedWorldResult) {
          const cleaned = (groundedWorldResult.response.text || "").replace(/```json/gi, "").replace(/```/g, "").trim();
          const startIdx = cleaned.indexOf("[");
          const endIdx = cleaned.lastIndexOf("]");
          if (startIdx !== -1 && endIdx > startIdx) {
            try {
              const candidate = JSON.parse(cleaned.slice(startIdx, endIdx + 1));
              if (Array.isArray(candidate) && candidate.length > 0) {
                parsed = candidate;
              }
            } catch {
            }
          }
        }
        if (!parsed || parsed.length === 0) {
          const structuredWorldResult = await generateStructuredWithFallback(ai, basePrompt, {
            systemInstruction: "Voc\xEA \xE9 o diretor global de scouting FIFA especialista na temporada 2026 da Am\xE9rica do Norte (EUA e M\xE9xico), \xC1sia/R\xFAssia (Ar\xE1bia Saudita, Jap\xE3o e R\xFAssia) e \xC1frica (Egito e Marrocos). Responda exclusivamente em JSON v\xE1lido seguindo o schema.",
            responseMimeType: "application/json",
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
                        nationality: { type: Type.STRING }
                      },
                      required: ["name", "role", "age", "overall", "nationality"]
                    }
                  }
                },
                required: ["clubId", "managerName", "def", "mei", "ata", "keyPlayers"]
              }
            }
          });
          if (!structuredWorldResult) {
            res.json({
              leagueId,
              clubs: calibratedResults,
              usedAi: calibratedResults.length > 0,
              quotaLimited: true,
              cached: false,
              model: PRIMARY_GEMINI_MODEL
            });
            return;
          }
          const rawText = structuredWorldResult.response.text || "[]";
          parsed = JSON.parse(rawText);
        }
        if (Array.isArray(parsed)) {
          for (const item of parsed) {
            if (!item || !item.clubId) continue;
            const sanitized = {
              clubId: item.clubId,
              managerName: String(item.managerName || "").trim() || "Treinador Principal",
              def: Math.max(minSector, Math.min(maxSector, Math.round(Number(item.def) || 72))),
              mei: Math.max(minSector, Math.min(maxSector, Math.round(Number(item.mei) || 72))),
              ata: Math.max(minSector, Math.min(maxSector, Math.round(Number(item.ata) || 73))),
              keyPlayers: Array.isArray(item.keyPlayers) ? item.keyPlayers.slice(0, 5).map((kp) => {
                const normRole = String(kp.role || "MEI").toUpperCase().trim();
                const safeRole = validRoles.has(normRole) ? normRole : "MEI";
                return {
                  name: String(kp.name || "").trim(),
                  role: safeRole,
                  age: Math.max(16, Math.min(42, Math.round(Number(kp.age) || 26))),
                  overall: Math.max(
                    minSector - 2,
                    Math.min(maxSector + 3, Math.round(Number(kp.overall) || 74))
                  ),
                  nationality: String(kp.nationality || country).trim() || country
                };
              }).filter((kp) => kp.name.length >= 2) : []
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
        model: PRIMARY_GEMINI_MODEL
      });
    } catch (err) {
      if (isGeminiQuotaError(err)) {
        res.json({
          leagueId: String(req.body?.leagueId ?? ""),
          clubs: [],
          usedAi: false,
          quotaLimited: true
        });
        return;
      }
      const msg = err instanceof Error ? err.message : String(err);
      console.error("[Gemini World League Calibration Error]:", msg);
      res.status(500).json({
        error: "AI_REQUEST_FAILED",
        message: "N\xE3o foi poss\xEDvel calibrar a liga mundial via IA neste momento."
      });
    }
  });
  app.get("/api/clubs/squads/october-2026/cache", (_req, res) => {
    const clubsById = {};
    for (const [clubId, profile] of resolvedOct2026SquadCache.entries()) {
      if (clubId === "fla" || clubId === "pal") continue;
      if (profile && profile.clubId && Array.isArray(profile.players) && profile.players.length > 0) {
        clubsById[clubId] = profile;
      }
    }
    res.json({
      clubsById,
      count: Object.keys(clubsById).length,
      model: PRIMARY_GEMINI_MODEL
    });
  });
  app.post("/api/clubs/squads/october-2026", async (req, res) => {
    try {
      const forceRefresh = Boolean(req.body?.forceRefresh);
      const rawClubs = Array.isArray(req.body?.clubs) ? req.body.clubs.slice(0, 6) : [];
      if (rawClubs.length === 0) {
        res.json({
          clubs: [],
          groundingSources: [],
          usedAi: false,
          usedGoogleSearch: false,
          cachedCount: 0,
          totalCachedOnServer: resolvedOct2026SquadCache.size,
          model: PRIMARY_GEMINI_MODEL
        });
        return;
      }
      const results = [];
      const uncached = [];
      let cachedCount = 0;
      for (const c of rawClubs) {
        if (!c || !c.id || !c.name) continue;
        const cached = !forceRefresh ? resolvedOct2026SquadCache.get(c.id) : void 0;
        if (cached && cached.players.length >= 18) {
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
          usedAi: true,
          usedGoogleSearch: false,
          cached: true,
          cachedCount,
          totalCachedOnServer: resolvedOct2026SquadCache.size,
          model: PRIMARY_GEMINI_MODEL
        });
        return;
      }
      const ai = getGenAIClient();
      if (!ai) {
        res.status(503).json({
          error: "API_KEY_MISSING",
          message: "Servi\xE7o de IA indispon\xEDvel no servidor neste momento.",
          clubs: results,
          groundingSources: [],
          usedAi: false,
          usedGoogleSearch: false,
          cachedCount,
          totalCachedOnServer: resolvedOct2026SquadCache.size
        });
        return;
      }
      const validRoles = /* @__PURE__ */ new Set(["GOL", "ZAG", "LAT", "VOL", "MEI", "ATA"]);
      const groundingSourcesMap = /* @__PURE__ */ new Map();
      let usedGoogleSearch = false;
      const CHUNK_SIZE = uncached.length <= 2 ? 2 : 5;
      const minPlayersTarget = uncached.length <= 2 ? 24 : 22;
      for (let offset = 0; offset < uncached.length; offset += CHUNK_SIZE) {
        const batch = uncached.slice(offset, offset + CHUNK_SIZE);
        const clubLines = batch.map(
          (c) => `- clubId="${c.id}" | clube="${c.name}" | pais="${c.country || "Brasil"}" | liga="${c.leagueName || c.division || "1\xAA Divis\xE3o"}" | reputacao=${c.reputation || 3}`
        );
        const promptText = [
          "Pesquise na web (Google Search) o elenco profissional real e atualizado de OUTUBRO DE 2026 para cada clube listado abaixo.",
          "Regras obrigat\xF3rias de atualiza\xE7\xE3o Outubro de 2026:",
          "1. Informe o nome real do t\xE9cnico atual em Outubro de 2026 em managerName.",
          `2. Liste entre ${minPlayersTarget} e 28 jogadores reais do elenco atual de Outubro de 2026 (incluindo contrata\xE7\xF5es, chegadas de meio de ano/ver\xE3o 2026 e sa\xEDdas confirmadas at\xE9 Outubro de 2026), cobrindo todas as posi\xE7\xF5es de forma equilibrada: 3 goleiros (GOL), 4 a 6 zagueiros (ZAG), 4 laterais (LAT), 4 a 5 volantes (VOL), 4 a 5 meias (MEI) e 4 a 6 atacantes (ATA).`,
          '3. Marque exatamente 11 atletas titulares habituais com "isStarter": true (1 GOL e 10 de linha) e os demais com "isStarter": false.',
          '4. Em "role" use estritamente: "GOL", "ZAG", "LAT", "VOL", "MEI" ou "ATA".',
          '5. Em "age" informe a idade real em Outubro de 2026 (16 a 46). Em "jerseyNumber" informe o n\xFAmero da camisa (1 a 99). Em "nationality" informe o pa\xEDs em portugu\xEAs do Brasil (ex.: "Brasil", "Argentina", "Uruguai", "Col\xF4mbia", "Paraguai", "Portugal", "Espanha", "Inglaterra", "Fran\xE7a", "Alemanha", "It\xE1lia", "Holanda", "Marrocos", "Egito", "Ar\xE1bia Saudita", "Jap\xE3o", "R\xFAssia", "M\xE9xico", "Estados Unidos").',
          '6. Em "overall" calibre com realismo FIFA/EA FC em Outubro de 2026 conforme a for\xE7a real do clube e divis\xE3o (gigantes europeus: 76\u201391; S\xE9rie A Brasil / grandes da Am\xE9rica, Ar\xE1bia, M\xE9xico, MLS e R\xFAssia: 70\u201388; S\xE9rie B / ligas m\xE9dias: 63\u201376; S\xE9rie C/D / divis\xF5es inferiores: 54\u201369).',
          "7. Retorne APENAS um array JSON puro (sem texto extra) com TODOS os clubes solicitados no formato:",
          '[{"clubId":"...","managerName":"...","players":[{"name":"...","role":"GOL","age":28,"overall":82,"nationality":"Brasil","jerseyNumber":1,"isStarter":true}]}]',
          "",
          "Clubes para pesquisar elenco de Outubro de 2026:",
          ...clubLines
        ].join("\n");
        let parsedBatch = null;
        const groundedOctResult = await generateGroundedIfAvailable(
          ai,
          promptText,
          "Voc\xEA \xE9 um especialista mundial em bancos de dados de futebol em Outubro de 2026 (Transfermarkt, SofaScore, FIFA, CBF, CONMEBOL, UEFA, CONCACAF, AFC e CAF). Use Google Search para consultar as transfer\xEAncias mais recentes at\xE9 Outubro de 2026 e retorne exclusivamente JSON v\xE1lido para todos os clubes solicitados."
        );
        if (groundedOctResult) {
          const chunks = groundedOctResult.response.candidates?.[0]?.groundingMetadata?.groundingChunks;
          if (Array.isArray(chunks)) {
            for (const ch of chunks) {
              const uri = ch?.web?.uri;
              const title = ch?.web?.title;
              if (uri && typeof uri === "string" && !groundingSourcesMap.has(uri)) {
                usedGoogleSearch = true;
                groundingSourcesMap.set(uri, {
                  uri,
                  title: typeof title === "string" && title.trim() ? title.trim() : "Fonte Web Outubro 2026"
                });
              }
            }
          }
          const cleaned = (groundedOctResult.response.text || "").replace(/```json/gi, "").replace(/```/g, "").trim();
          const startIdx = cleaned.indexOf("[");
          const endIdx = cleaned.lastIndexOf("]");
          if (startIdx !== -1 && endIdx > startIdx) {
            try {
              const candidate = JSON.parse(cleaned.slice(startIdx, endIdx + 1));
              if (Array.isArray(candidate) && candidate.length > 0) {
                parsedBatch = candidate;
              }
            } catch {
            }
          }
        }
        if (!parsedBatch || parsedBatch.length === 0) {
          const fallbackResult = await generateStructuredWithFallback(ai, promptText, {
            systemInstruction: "Voc\xEA \xE9 um especialista mundial em bancos de dados de futebol em Outubro de 2026. Liste os jogadores reais de cada clube solicitado em Outubro de 2026 e retorne exclusivamente JSON v\xE1lido seguindo o schema.",
            responseMimeType: "application/json",
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
                        isStarter: { type: Type.BOOLEAN }
                      },
                      required: [
                        "name",
                        "role",
                        "age",
                        "overall",
                        "nationality",
                        "jerseyNumber",
                        "isStarter"
                      ]
                    }
                  }
                },
                required: ["clubId", "managerName", "players"]
              }
            }
          });
          if (!fallbackResult) {
            savePersistedOct2026SquadCache();
            savePersistedNationalityCache();
            res.json({
              clubs: results,
              groundingSources: Array.from(groundingSourcesMap.values()).slice(0, 8),
              usedAi: results.length > 0,
              usedGoogleSearch,
              quotaLimited: true,
              cached: false,
              cachedCount,
              totalCachedOnServer: resolvedOct2026SquadCache.size,
              model: PRIMARY_GEMINI_MODEL
            });
            return;
          }
          const rawFallback = fallbackResult.response.text || "[]";
          parsedBatch = JSON.parse(rawFallback);
        }
        if (Array.isArray(parsedBatch)) {
          for (const item of parsedBatch) {
            if (!item || !item.clubId) continue;
            const inputMeta = batch.find(
              (b) => b.id === item.clubId || b.id.toLowerCase() === String(item.clubId).trim().toLowerCase()
            );
            const resolvedClubId = inputMeta ? inputMeta.id : item.clubId;
            const fallbackCountry = inputMeta?.country || "Brasil";
            const seenNames = /* @__PURE__ */ new Set();
            const sanitizedPlayers = [];
            if (Array.isArray(item.players)) {
              for (let idx = 0; idx < item.players.length && sanitizedPlayers.length < 30; idx++) {
                const rawP = item.players[idx];
                const cleanName = String(rawP?.name || "").trim();
                if (cleanName.length < 2) continue;
                const normKey = cleanName.toLowerCase();
                if (seenNames.has(normKey)) continue;
                seenNames.add(normKey);
                const normRole = String(rawP?.role || "MEI").toUpperCase().trim();
                const safeRole = validRoles.has(normRole) ? normRole : "MEI";
                const cleanNat = String(rawP?.nationality || fallbackCountry).trim() || fallbackCountry;
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
                  isStarter: Boolean(rawP?.isStarter)
                });
                resolvedNationalityCache.set(normKey, cleanNat);
              }
            }
            if (sanitizedPlayers.length > 0) {
              const sanitizedClub = {
                clubId: resolvedClubId,
                managerName: String(item.managerName || "").trim() || "Treinador Principal",
                updatedAt: (/* @__PURE__ */ new Date()).toISOString(),
                players: sanitizedPlayers.slice(0, 30)
              };
              resolvedOct2026SquadCache.set(sanitizedClub.clubId, sanitizedClub);
              results.push(sanitizedClub);
            }
          }
        }
      }
      savePersistedOct2026SquadCache();
      savePersistedNationalityCache();
      res.json({
        clubs: results,
        groundingSources: Array.from(groundingSourcesMap.values()).slice(0, 8),
        usedAi: true,
        usedGoogleSearch,
        cached: false,
        cachedCount,
        totalCachedOnServer: resolvedOct2026SquadCache.size,
        model: PRIMARY_GEMINI_MODEL
      });
    } catch (err) {
      if (isGeminiQuotaError(err)) {
        res.json({
          clubs: [],
          groundingSources: [],
          usedAi: false,
          usedGoogleSearch: false,
          quotaLimited: true,
          totalCachedOnServer: resolvedOct2026SquadCache.size
        });
        return;
      }
      const msg = err instanceof Error ? err.message : String(err);
      console.error("[Gemini Oct2026 Squad Sync Error]:", msg);
      res.status(500).json({
        error: "AI_REQUEST_FAILED",
        message: "N\xE3o foi poss\xEDvel pesquisar o elenco de Outubro de 2026 via IA neste momento."
      });
    }
  });
  app.post("/api/transfers/rumors", async (req, res) => {
    try {
      const body = req.body;
      const rawCandidates = Array.isArray(body?.candidates) ? body.candidates : [];
      if (rawCandidates.length === 0) {
        res.status(400).json({ error: "NO_CANDIDATES", message: "Nenhum candidato informado." });
        return;
      }
      const ai = getGenAIClient();
      if (!ai) {
        res.status(503).json({
          error: "AI_UNAVAILABLE",
          message: "GEMINI_API_KEY n\xE3o configurada no servidor."
        });
        return;
      }
      const candidatesSlice = rawCandidates.slice(0, 12).map((c) => ({
        id: String(c.id || "").trim(),
        playerName: String(c.playerName || "").trim(),
        playerRole: String(c.playerRole || "").trim(),
        playerAge: Number(c.playerAge || 24),
        playerOverall: Number(c.playerOverall || 70),
        marketValueBRL: Number(c.marketValue || 0),
        estimatedFeeBRL: Number(c.estimatedFee || 0),
        matches: Number(c.matches || 0),
        goals: Number(c.goals || 0),
        assists: Number(c.assists || 0),
        ratingAverage: Number(c.ratingAverage || 6.8),
        contractYears: Number(c.contractYears || 2),
        currentClubName: String(c.currentClubName || "").trim(),
        interestedClubName: String(c.interestedClubName || "").trim(),
        category: String(c.category || "LEAGUE_BUZZ"),
        reasonTag: String(c.reasonTag || "").trim()
      }));
      const RUMOR_MODEL = "gemini-4-hydrogen";
      const systemInstruction = "Voc\xEA \xE9 um setorista especialista em mercado da bola brasileiro e internacional. Escreva not\xEDcias curtas, realistas e jornal\xEDsticas em portugu\xEAs (PT-BR) sobre rumores de transfer\xEAncias baseados EXCLUSIVAMENTE nos dados reais da temporada fornecidos (jogos, gols, assist\xEAncias, nota m\xE9dia, OVR, contrato e valor de mercado/estimado em BRL). Nunca invente clubes ou estat\xEDsticas diferentes dos fornecidos. Retorne apenas JSON v\xE1lido no schema solicitado.";
      const userPrompt = `Temporada ${Number(body?.seasonYear || 2026)}, Rodada ${Number(body?.round || 1)} (${String(body?.currentDate || "")}). Clube do treinador: ${String(body?.userClubName || "Clube")}.
Para CADA candidato abaixo, gere:
- id: exatamente o id enviado
- headline: manchete curta e direta (max 95 caracteres)
- summary: nota jornal\xEDstica de 2 frases citando desempenho em campo (gols/assist\xEAncias/nota m\xE9dia/OVR quando relevantes) e o contexto financeiro/valor de mercado
- sourceOutlet: nome realista de ve\xEDculo fict\xEDcio de imprensa esportiva brasileira/internacional (ex: "Di\xE1rio da Bola", "Bastidores FC", "Gazeta do Mercado", "Radar da Janela", "Placar Sul")
- heatLevel: "HOT" (negocia\xE7\xE3o quente/urgente), "WARM" (sondagem avan\xE7ada) ou "WATCH" (monitoramento inicial)

Candidatos:
${JSON.stringify(candidatesSlice)}`;
      const response = await ai.models.generateContent({
        model: RUMOR_MODEL,
        contents: userPrompt,
        config: {
          systemInstruction,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                headline: { type: Type.STRING },
                summary: { type: Type.STRING },
                sourceOutlet: { type: Type.STRING },
                heatLevel: { type: Type.STRING }
              },
              required: ["id", "headline", "summary", "sourceOutlet", "heatLevel"]
            }
          }
        }
      });
      const rawText = (response.text || "").trim();
      if (!rawText) {
        res.status(502).json({
          error: "EMPTY_AI_RESPONSE",
          message: "A IA n\xE3o retornou conte\xFAdo para os rumores."
        });
        return;
      }
      const parsed = JSON.parse(rawText);
      const rumors = (Array.isArray(parsed) ? parsed : []).filter((item) => item && typeof item.id === "string" && typeof item.headline === "string").map((item) => {
        const heatUpper = String(item.heatLevel || "").toUpperCase();
        const heatLevel = heatUpper === "HOT" || heatUpper === "WARM" || heatUpper === "WATCH" ? heatUpper : "WARM";
        return {
          id: String(item.id).trim(),
          headline: String(item.headline).trim().slice(0, 140),
          summary: String(item.summary || "").trim().slice(0, 380),
          sourceOutlet: String(item.sourceOutlet || "Di\xE1rio da Bola").trim().slice(0, 48),
          heatLevel
        };
      });
      res.json({
        rumors,
        usedAi: true,
        model: RUMOR_MODEL
      });
    } catch (err) {
      if (isGeminiQuotaError(err)) {
        res.status(429).json({
          error: "QUOTA_EXCEEDED",
          message: "Limite tempor\xE1rio da IA atingido. Tente novamente em instantes."
        });
        return;
      }
      const msg = err instanceof Error ? err.message : String(err);
      console.error("[Gemini Transfer Rumors Error]:", msg);
      res.status(500).json({
        error: "AI_REQUEST_FAILED",
        message: "N\xE3o foi poss\xEDvel gerar os rumores de transfer\xEAncia via IA agora."
      });
    }
  });
  app.use("/api", (_req, res) => {
    res.status(404).json({
      error: "NOT_FOUND",
      message: "Rota da API n\xE3o encontrada."
    });
  });
  if (process.env.NODE_ENV !== "production") {
    const requiredRoster = path.join(__dirname, "src", "data", "europeTop5Rosters2026.ts");
    if (!fs.existsSync(requiredRoster)) {
      console.log("[Server] European roster files missing, generating via prebuild...");
      try {
        execSync("npm run prebuild", { stdio: "inherit", cwd: __dirname });
      } catch (err) {
        console.error("[Server] Failed to generate roster files:", err);
      }
    }
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
        ws: false
      },
      appType: "spa"
    });
    app.get("/@vite/client", async (_req, res, next) => {
      try {
        const result = await vite.transformRequest("/@vite/client");
        if (!result) {
          next();
          return;
        }
        const patchedCode = result.code.replace(
          'console.debug("[vite] connecting...");',
          "/* [vite] HMR disabled */"
        ).replace(
          "await wsTransport.connect(handlers);",
          "return; /* [vite] HMR WebSocket connect disabled */"
        ).replace(
          "await wsTransport.disconnect();",
          "return; /* [vite] HMR WebSocket disconnect disabled */"
        ).replace(
          "wsTransport.send(data);",
          "/* [vite] HMR WebSocket send disabled */"
        );
        res.setHeader("Content-Type", "application/javascript; charset=utf-8");
        res.setHeader("Cache-Control", "no-cache");
        res.send(patchedCode);
      } catch (err) {
        next(err);
      }
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, "dist");
    const staticCompressedCache = /* @__PURE__ */ new Map();
    const STATIC_TEXT_EXT_RE = /\.(js|mjs|css|html|svg|json|webmanifest|txt)$/i;
    app.use((req, res, next) => {
      if (req.method !== "GET" && req.method !== "HEAD") {
        next();
        return;
      }
      const cleanPath = req.path.replace(/\.\.+/g, "");
      if (!STATIC_TEXT_EXT_RE.test(cleanPath)) {
        next();
        return;
      }
      const filePath = path.resolve(distPath, `.${cleanPath}`);
      if (!filePath.startsWith(distPath + path.sep) || !fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
        next();
        return;
      }
      const acceptEncoding = String(req.headers["accept-encoding"] || "");
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
              params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 5 }
            }),
            gzip: zlib.gzipSync(raw, { level: 6 })
          };
          if (staticCompressedCache.size < 120) {
            staticCompressedCache.set(filePath, entry);
          }
        }
        const isHashedAsset = cleanPath.startsWith("/assets/");
        res.setHeader(
          "Cache-Control",
          isHashedAsset ? "public, max-age=31536000, immutable" : "no-cache"
        );
        res.type(path.extname(filePath));
        res.setHeader("Content-Encoding", useBrotli ? "br" : "gzip");
        res.setHeader("Vary", "Accept-Encoding");
        const payload = useBrotli ? entry.br : entry.gzip;
        res.setHeader("Content-Length", String(payload.length));
        if (req.method === "HEAD") {
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
        maxAge: "7d",
        setHeaders(res, filePath) {
          if (filePath.includes(`${path.sep}assets${path.sep}`)) {
            res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
          } else if (filePath.endsWith(".html") || filePath.endsWith("sw.js") || filePath.endsWith(".webmanifest")) {
            res.setHeader("Cache-Control", "no-cache");
          }
        }
      })
    );
    app.get("*", (_req, res) => {
      res.setHeader("Cache-Control", "no-cache");
      res.sendFile(path.join(distPath, "index.html"));
    });
  }
  const server = app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
  const handleShutdown = () => {
    server.close(() => {
      process.exit(0);
    });
  };
  process.on("SIGTERM", handleShutdown);
  process.on("SIGINT", handleShutdown);
}
startServer();
