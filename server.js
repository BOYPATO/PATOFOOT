var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

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

// src/lib/firebase-admin.ts
import { initializeApp, getApps } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

// firebase-applet-config.json
var firebase_applet_config_default = {
  projectId: "flawless-amphora-t5v9p",
  appId: "1:890017897560:web:76f271cf1197db17eb7e2d",
  apiKey: "AIzaSyAeeBqZ9RpOrKQHP4XqbhMJUqPqKUBCrEA",
  authDomain: "flawless-amphora-t5v9p.firebaseapp.com",
  firestoreDatabaseId: "ai-studio-patofoot2026-f1983665-fd14-4c5b-9eaf-02a501f19017",
  storageBucket: "flawless-amphora-t5v9p.firebasestorage.app",
  messagingSenderId: "890017897560",
  measurementId: "",
  oAuthClientId: "890017897560-55f63juuo2k7cf9dpt4htbsfnoffofjh.apps.googleusercontent.com",
  recaptchaSiteKey: ""
};

// src/lib/firebase-admin.ts
if (!getApps().length) {
  initializeApp({
    projectId: firebase_applet_config_default.projectId
  });
}
var adminAuth = getAuth();

// src/middleware/auth.ts
var requireAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized: Missing token" });
    return;
  }
  const token = authHeader.slice(7).trim();
  if (!token) {
    res.status(401).json({ error: "Unauthorized: Missing token" });
    return;
  }
  try {
    const decodedToken = await adminAuth.verifyIdToken(token);
    req.user = decodedToken;
    next();
  } catch (error) {
    console.error("Error verifying Firebase ID token:", error);
    res.status(401).json({ error: "Unauthorized: Invalid token" });
  }
};

// src/db/users.ts
import { eq } from "drizzle-orm";

// src/db/index.ts
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

// src/db/schema.ts
var schema_exports = {};
__export(schema_exports, {
  careerSaves: () => careerSaves,
  careerSavesRelations: () => careerSavesRelations,
  hallOfFameEntries: () => hallOfFameEntries,
  hallOfFameEntriesRelations: () => hallOfFameEntriesRelations,
  users: () => users,
  usersRelations: () => usersRelations
});
import { relations } from "drizzle-orm";
import {
  doublePrecision,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex
} from "drizzle-orm/pg-core";
var users = pgTable("users", {
  id: serial("id").primaryKey(),
  uid: text("uid").notNull().unique(),
  email: text("email").notNull(),
  displayName: text("display_name").notNull(),
  usernameKey: text("username_key").notNull(),
  favoriteClubId: text("favorite_club_id").notNull().default("fla"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});
var careerSaves = pgTable(
  "career_saves",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
    slotId: text("slot_id").notNull(),
    clubId: text("club_id").notNull(),
    clubName: text("club_name").notNull(),
    clubShortName: text("club_short_name").notNull(),
    clubPrimaryColor: text("club_primary_color").notNull().default("#10b981"),
    clubSecondaryColor: text("club_secondary_color").notNull().default("#0f172a"),
    division: text("division").notNull().default("A"),
    managerName: text("manager_name").notNull(),
    seasonYear: integer("season_year").notNull().default(2026),
    round: integer("round").notNull().default(1),
    currentDate: text("current_date").notNull().default("2026-01-11"),
    clubBalance: doublePrecision("club_balance").notNull().default(0),
    payloadCompressed: text("payload_compressed").notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull()
  },
  (table) => [uniqueIndex("career_saves_user_slot_idx").on(table.userId, table.slotId)]
);
var hallOfFameEntries = pgTable(
  "hall_of_fame_entries",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
    slotId: text("slot_id").notNull(),
    managerName: text("manager_name").notNull(),
    clubId: text("club_id").notNull(),
    clubName: text("club_name").notNull(),
    seasonYear: integer("season_year").notNull().default(2026),
    trophiesCount: integer("trophies_count").notNull().default(0),
    hallOfFamePoints: integer("hall_of_fame_points").notNull().default(0),
    winRatePct: integer("win_rate_pct").notNull().default(0),
    updatedAt: timestamp("updated_at").defaultNow().notNull()
  },
  (table) => [uniqueIndex("hall_of_fame_user_slot_idx").on(table.userId, table.slotId)]
);
var usersRelations = relations(users, ({ many }) => ({
  careerSaves: many(careerSaves),
  hallOfFameEntries: many(hallOfFameEntries)
}));
var careerSavesRelations = relations(careerSaves, ({ one }) => ({
  owner: one(users, {
    fields: [careerSaves.userId],
    references: [users.id]
  })
}));
var hallOfFameEntriesRelations = relations(hallOfFameEntries, ({ one }) => ({
  owner: one(users, {
    fields: [hallOfFameEntries.userId],
    references: [users.id]
  })
}));

// src/db/index.ts
var createPool = () => {
  if (!global._postgresPool) {
    global._postgresPool = new Pool({
      host: process.env.SQL_HOST,
      user: process.env.SQL_USER,
      password: process.env.SQL_PASSWORD,
      database: process.env.SQL_DB_NAME,
      max: 10,
      connectionTimeoutMillis: 15e3
    });
    global._postgresPool.on("error", (err) => {
      console.error("Unexpected error on idle SQL pool client:", err);
    });
  }
  return global._postgresPool;
};
var pool = createPool();
var db = drizzle(pool, { schema: schema_exports });

// src/db/users.ts
function sanitizeKey(raw, uid) {
  const base = raw.trim().split("@")[0].normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9._\-]+/g, ".").replace(/\.{2,}/g, ".").replace(/^[._\-]+|[._\-]+$/g, "").slice(0, 60);
  if (base.length >= 2) return base;
  return `coach.${uid.slice(0, 8).toLowerCase()}`;
}
async function getOrCreateUser(input) {
  const safeEmail = (input.email || `${input.uid}@acesso.patofoot.app`).trim().slice(0, 160);
  const safeKey = sanitizeKey(input.usernameKey || input.displayName || safeEmail, input.uid);
  const safeDisplayName = (input.displayName || safeEmail.split("@")[0] || "Treinador").trim().slice(0, 60) || "Treinador";
  const safeClubId = input.favoriteClubId && /^[a-zA-Z0-9_\-]{2,32}$/.test(input.favoriteClubId) ? input.favoriteClubId : "fla";
  try {
    const result = await db.insert(users).values({
      uid: input.uid,
      email: safeEmail,
      displayName: safeDisplayName,
      usernameKey: safeKey,
      favoriteClubId: safeClubId
    }).onConflictDoUpdate({
      target: users.uid,
      set: {
        email: safeEmail,
        ...input.displayName ? { displayName: safeDisplayName } : {},
        ...input.favoriteClubId ? { favoriteClubId: safeClubId } : {},
        updatedAt: /* @__PURE__ */ new Date()
      }
    }).returning();
    return result[0];
  } catch (error) {
    console.error("Database query failed in getOrCreateUser:", error);
    throw new Error("Failed to synchronize trainer account. Please try again later.", {
      cause: error
    });
  }
}
async function updateSqlUserProfile(uid, updates) {
  const patch = {
    updatedAt: /* @__PURE__ */ new Date()
  };
  if (updates.displayName && updates.displayName.trim().length >= 2) {
    patch.displayName = updates.displayName.trim().slice(0, 60);
  }
  if (updates.favoriteClubId && /^[a-zA-Z0-9_\-]{2,32}$/.test(updates.favoriteClubId)) {
    patch.favoriteClubId = updates.favoriteClubId;
  }
  try {
    const result = await db.update(users).set(patch).where(eq(users.uid, uid)).returning();
    return result[0] || null;
  } catch (error) {
    console.error("Database query failed in updateSqlUserProfile:", error);
    throw new Error("Failed to update trainer profile. Please try again later.", {
      cause: error
    });
  }
}

// src/db/careerSaves.ts
import { and, desc, eq as eq2 } from "drizzle-orm";
var ALLOWED_SQL_SLOT_IDS = [
  "autosave",
  "slot_1",
  "slot_2",
  "slot_3",
  "slot_4",
  "slot_5"
];
function isValidSqlSlotId(value) {
  return ALLOWED_SQL_SLOT_IDS.includes(value);
}
async function listUserSqlCareerSaveSummaries(uid) {
  try {
    const rows = await db.select({
      slotId: careerSaves.slotId,
      clubId: careerSaves.clubId,
      clubName: careerSaves.clubName,
      clubShortName: careerSaves.clubShortName,
      clubPrimaryColor: careerSaves.clubPrimaryColor,
      clubSecondaryColor: careerSaves.clubSecondaryColor,
      division: careerSaves.division,
      managerName: careerSaves.managerName,
      seasonYear: careerSaves.seasonYear,
      round: careerSaves.round,
      currentDate: careerSaves.currentDate,
      clubBalance: careerSaves.clubBalance,
      updatedAt: careerSaves.updatedAt
    }).from(careerSaves).innerJoin(users, eq2(careerSaves.userId, users.id)).where(eq2(users.uid, uid)).orderBy(desc(careerSaves.updatedAt));
    return rows;
  } catch (error) {
    console.error("Database query failed in listUserSqlCareerSaveSummaries:", error);
    throw new Error("Failed to load career save summaries. Please try again later.", {
      cause: error
    });
  }
}
async function getUserSqlCareerSave(uid, slotId) {
  try {
    const rows = await db.select({
      slotId: careerSaves.slotId,
      payloadCompressed: careerSaves.payloadCompressed,
      updatedAt: careerSaves.updatedAt
    }).from(careerSaves).innerJoin(users, eq2(careerSaves.userId, users.id)).where(and(eq2(users.uid, uid), eq2(careerSaves.slotId, slotId))).limit(1);
    return rows[0] || null;
  } catch (error) {
    console.error("Database query failed in getUserSqlCareerSave:", error);
    throw new Error("Failed to download career save. Please try again later.", {
      cause: error
    });
  }
}
async function upsertUserSqlCareerSave(input) {
  try {
    const now = /* @__PURE__ */ new Date();
    const saved = await db.insert(careerSaves).values({
      userId: input.userId,
      slotId: input.slotId,
      clubId: input.clubId,
      clubName: input.clubName,
      clubShortName: input.clubShortName,
      clubPrimaryColor: input.clubPrimaryColor,
      clubSecondaryColor: input.clubSecondaryColor,
      division: input.division,
      managerName: input.managerName,
      seasonYear: input.seasonYear,
      round: input.round,
      currentDate: input.currentDate,
      clubBalance: input.clubBalance,
      payloadCompressed: input.payloadCompressed,
      updatedAt: now
    }).onConflictDoUpdate({
      target: [careerSaves.userId, careerSaves.slotId],
      set: {
        clubId: input.clubId,
        clubName: input.clubName,
        clubShortName: input.clubShortName,
        clubPrimaryColor: input.clubPrimaryColor,
        clubSecondaryColor: input.clubSecondaryColor,
        division: input.division,
        managerName: input.managerName,
        seasonYear: input.seasonYear,
        round: input.round,
        currentDate: input.currentDate,
        clubBalance: input.clubBalance,
        payloadCompressed: input.payloadCompressed,
        updatedAt: now
      }
    }).returning({
      slotId: careerSaves.slotId,
      clubId: careerSaves.clubId,
      clubName: careerSaves.clubName,
      clubShortName: careerSaves.clubShortName,
      clubPrimaryColor: careerSaves.clubPrimaryColor,
      clubSecondaryColor: careerSaves.clubSecondaryColor,
      division: careerSaves.division,
      managerName: careerSaves.managerName,
      seasonYear: careerSaves.seasonYear,
      round: careerSaves.round,
      currentDate: careerSaves.currentDate,
      clubBalance: careerSaves.clubBalance,
      updatedAt: careerSaves.updatedAt
    });
    await db.insert(hallOfFameEntries).values({
      userId: input.userId,
      slotId: input.slotId,
      managerName: input.managerName,
      clubId: input.clubId,
      clubName: input.clubName,
      seasonYear: input.seasonYear,
      trophiesCount: Math.max(0, Math.round(input.trophiesCount ?? 0)),
      hallOfFamePoints: Math.max(0, Math.round(input.hallOfFamePoints ?? 0)),
      winRatePct: Math.max(0, Math.min(100, Math.round(input.winRatePct ?? 0))),
      updatedAt: now
    }).onConflictDoUpdate({
      target: [hallOfFameEntries.userId, hallOfFameEntries.slotId],
      set: {
        managerName: input.managerName,
        clubId: input.clubId,
        clubName: input.clubName,
        seasonYear: input.seasonYear,
        trophiesCount: Math.max(0, Math.round(input.trophiesCount ?? 0)),
        hallOfFamePoints: Math.max(0, Math.round(input.hallOfFamePoints ?? 0)),
        winRatePct: Math.max(0, Math.min(100, Math.round(input.winRatePct ?? 0))),
        updatedAt: now
      }
    });
    return saved[0];
  } catch (error) {
    console.error("Database query failed in upsertUserSqlCareerSave:", error);
    throw new Error("Failed to save career data. Please try again later.", {
      cause: error
    });
  }
}
async function deleteUserSqlCareerSave(uid, slotId) {
  try {
    const ownerRows = await db.select({ id: users.id }).from(users).where(eq2(users.uid, uid)).limit(1);
    const owner = ownerRows[0];
    if (!owner) return false;
    await db.delete(careerSaves).where(and(eq2(careerSaves.userId, owner.id), eq2(careerSaves.slotId, slotId)));
    await db.delete(hallOfFameEntries).where(and(eq2(hallOfFameEntries.userId, owner.id), eq2(hallOfFameEntries.slotId, slotId)));
    return true;
  } catch (error) {
    console.error("Database query failed in deleteUserSqlCareerSave:", error);
    throw new Error("Failed to delete career save. Please try again later.", {
      cause: error
    });
  }
}
async function listHallOfFameLeaderboard(limitCount = 20) {
  const safeLimit = Math.max(1, Math.min(50, Math.round(limitCount)));
  try {
    return await db.select({
      id: hallOfFameEntries.id,
      managerName: hallOfFameEntries.managerName,
      clubId: hallOfFameEntries.clubId,
      clubName: hallOfFameEntries.clubName,
      seasonYear: hallOfFameEntries.seasonYear,
      trophiesCount: hallOfFameEntries.trophiesCount,
      hallOfFamePoints: hallOfFameEntries.hallOfFamePoints,
      winRatePct: hallOfFameEntries.winRatePct,
      updatedAt: hallOfFameEntries.updatedAt
    }).from(hallOfFameEntries).orderBy(desc(hallOfFameEntries.hallOfFamePoints), desc(hallOfFameEntries.trophiesCount)).limit(safeLimit);
  } catch (error) {
    console.error("Database query failed in listHallOfFameLeaderboard:", error);
    throw new Error("Failed to load Hall of Fame rankings. Please try again later.", {
      cause: error
    });
  }
}

// src/server/footballRosterApi.ts
var REQUEST_TIMEOUT_MS = 8e3;
var USER_AGENT = "PatoFoot2026-MonthlyRosterSync/1.0";
var WIKI_USER_AGENT = "PatoFoot2026/1.0 (https://patofoot.app)";
var API_FOOTBALL_BASE = "https://v3.football.api-sports.io";
var FOOTBALL_DATA_BASE = "https://api.football-data.org/v4";
var ESPN_SOCCER_BASE = "https://site.api.espn.com/apis/site/v2/sports/soccer";
var THESPORTSDB_BASE = "https://www.thesportsdb.com/api/v1/json";
var WIKIPEDIA_EN_API = "https://en.wikipedia.org/w/api.php";
var WIKIPEDIA_PT_API = "https://pt.wikipedia.org/w/api.php";
var CACHE_TTL_MS = 12 * 60 * 60 * 1e3;
var footballDataCompetitionCache = /* @__PURE__ */ new Map();
var espnLeagueTeamsCache = /* @__PURE__ */ new Map();
var COUNTRY_TO_PT = {
  bra: "Brasil",
  brazil: "Brasil",
  brasil: "Brasil",
  arg: "Argentina",
  argentina: "Argentina",
  uru: "Uruguai",
  uruguay: "Uruguai",
  col: "Col\xF4mbia",
  colombia: "Col\xF4mbia",
  par: "Paraguai",
  paraguay: "Paraguai",
  chi: "Chile",
  chile: "Chile",
  ecu: "Equador",
  ecuador: "Equador",
  per: "Peru",
  peru: "Peru",
  bol: "Bol\xEDvia",
  bolivia: "Bol\xEDvia",
  ven: "Venezuela",
  venezuela: "Venezuela",
  eng: "Inglaterra",
  england: "Inglaterra",
  "united kingdom": "Inglaterra",
  gbr: "Inglaterra",
  sco: "Esc\xF3cia",
  scotland: "Esc\xF3cia",
  wal: "Pa\xEDs de Gales",
  wales: "Pa\xEDs de Gales",
  nir: "Irlanda do Norte",
  "northern ireland": "Irlanda do Norte",
  irl: "Irlanda",
  ireland: "Irlanda",
  esp: "Espanha",
  spain: "Espanha",
  por: "Portugal",
  portugal: "Portugal",
  fra: "Fran\xE7a",
  france: "Fran\xE7a",
  ger: "Alemanha",
  germany: "Alemanha",
  ita: "It\xE1lia",
  italy: "It\xE1lia",
  ned: "Holanda",
  netherlands: "Holanda",
  holland: "Holanda",
  bel: "B\xE9lgica",
  belgium: "B\xE9lgica",
  sui: "Su\xED\xE7a",
  switzerland: "Su\xED\xE7a",
  aut: "\xC1ustria",
  austria: "\xC1ustria",
  cro: "Cro\xE1cia",
  croatia: "Cro\xE1cia",
  srb: "S\xE9rvia",
  serbia: "S\xE9rvia",
  pol: "Pol\xF4nia",
  poland: "Pol\xF4nia",
  den: "Dinamarca",
  denmark: "Dinamarca",
  swe: "Su\xE9cia",
  sweden: "Su\xE9cia",
  nor: "Noruega",
  norway: "Noruega",
  tur: "Turquia",
  turkey: "Turquia",
  gre: "Gr\xE9cia",
  greece: "Gr\xE9cia",
  ukr: "Ucr\xE2nia",
  ukraine: "Ucr\xE2nia",
  rus: "R\xFAssia",
  russia: "R\xFAssia",
  cze: "Rep\xFAblica Tcheca",
  "czech republic": "Rep\xFAblica Tcheca",
  czechia: "Rep\xFAblica Tcheca",
  svk: "Eslov\xE1quia",
  slovakia: "Eslov\xE1quia",
  hun: "Hungria",
  hungary: "Hungria",
  rou: "Rom\xEAnia",
  romania: "Rom\xEAnia",
  mex: "M\xE9xico",
  mexico: "M\xE9xico",
  usa: "Estados Unidos",
  "united states": "Estados Unidos",
  can: "Canad\xE1",
  canada: "Canad\xE1",
  jpn: "Jap\xE3o",
  japan: "Jap\xE3o",
  kor: "Coreia do Sul",
  "south korea": "Coreia do Sul",
  "korea republic": "Coreia do Sul",
  ksa: "Ar\xE1bia Saudita",
  "saudi arabia": "Ar\xE1bia Saudita",
  aus: "Austr\xE1lia",
  australia: "Austr\xE1lia",
  mar: "Marrocos",
  morocco: "Marrocos",
  egy: "Egito",
  egypt: "Egito",
  sen: "Senegal",
  senegal: "Senegal",
  nga: "Nig\xE9ria",
  nigeria: "Nig\xE9ria",
  cmr: "Camar\xF5es",
  cameroon: "Camar\xF5es",
  gha: "Gana",
  ghana: "Gana",
  civ: "Costa do Marfim",
  "ivory coast": "Costa do Marfim",
  "cote d'ivoire": "Costa do Marfim",
  alg: "Arg\xE9lia",
  algeria: "Arg\xE9lia",
  tun: "Tun\xEDsia",
  tunisia: "Tun\xEDsia",
  rsa: "\xC1frica do Sul",
  "south africa": "\xC1frica do Sul",
  ang: "Angola",
  angola: "Angola",
  mli: "Mali",
  mali: "Mali",
  gui: "Guin\xE9",
  guinea: "Guin\xE9",
  cpv: "Cabo Verde",
  "cape verde": "Cabo Verde"
};
function translateNationalityToPt(raw, fallbackCountry) {
  const clean = String(raw || "").trim();
  if (!clean) return fallbackCountry || "Brasil";
  const key = clean.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  return COUNTRY_TO_PT[key] || clean;
}
function normalizePersonKey(name) {
  return String(name || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}
function normalizeTeamMatchKey(name) {
  return String(name || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(
    /\b(fc|cf|sc|ec|ac|as|ss|afc|bfc|cfc|rc|cd|ca|ud|sd|se|cr|saf|club|clube|esporte|sport|futebol|football|de|do|da|dos|das|the)\b/g,
    " "
  ).replace(/[^a-z0-9]+/g, " ").trim();
}
function scoreTeamNameSimilarity(queryName, candidateName) {
  const qRaw = String(queryName || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
  const cRaw = String(candidateName || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
  if (!qRaw || !cRaw) return 0;
  if (qRaw === cRaw) return 100;
  const qNorm = normalizeTeamMatchKey(qRaw);
  const cNorm = normalizeTeamMatchKey(cRaw);
  if (qNorm && cNorm && qNorm === cNorm) return 96;
  if (qNorm && cNorm && (cNorm.includes(qNorm) || qNorm.includes(cNorm))) return 84;
  const qTokens = new Set(qNorm.split(" ").filter((t) => t.length >= 2));
  const cTokens = new Set(cNorm.split(" ").filter((t) => t.length >= 2));
  if (qTokens.size === 0 || cTokens.size === 0) return 0;
  let overlap = 0;
  for (const t of qTokens) {
    if (cTokens.has(t)) overlap += 1;
  }
  const unionSize = (/* @__PURE__ */ new Set([...qTokens, ...cTokens])).size;
  return Math.round(overlap / Math.max(1, unionSize) * 86);
}
function mapExternalPositionToRole(rawPosition, rawAbbr, playerIndex = 0) {
  const pos = String(rawPosition || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
  const abbr = String(rawAbbr || "").toUpperCase().trim();
  if (pos.includes("goal") || pos.includes("keeper") || abbr === "G" || abbr === "GK" || abbr === "GOL" || pos.includes("goleiro")) {
    return { role: "GOL", granular: true };
  }
  if (pos.includes("left-back") || pos.includes("right-back") || pos.includes("left back") || pos.includes("right back") || pos.includes("wing-back") || pos.includes("wingback") || pos.includes("full-back") || pos.includes("fullback") || pos.includes("lateral") || abbr === "LB" || abbr === "RB" || abbr === "LWB" || abbr === "RWB" || abbr === "LD" || abbr === "LE" || abbr === "LAT") {
    return { role: "LAT", granular: true };
  }
  if (pos.includes("centre-back") || pos.includes("center-back") || pos.includes("center back") || pos.includes("centre back") || pos.includes("zagueiro") || abbr === "CB" || abbr === "ZAG") {
    return { role: "ZAG", granular: true };
  }
  if (pos.includes("defender") || pos.includes("defence") || abbr === "D" || abbr === "DF") {
    return { role: playerIndex % 3 === 2 ? "LAT" : "ZAG", granular: false };
  }
  if (pos.includes("defensive mid") || pos.includes("holding mid") || pos.includes("volante") || abbr === "DM" || abbr === "CDM" || abbr === "VOL") {
    return { role: "VOL", granular: true };
  }
  if (pos.includes("attacking mid") || pos.includes("central mid") || pos.includes("meia") || abbr === "AM" || abbr === "CAM" || abbr === "CM" || abbr === "MEI") {
    return { role: "MEI", granular: true };
  }
  if (pos.includes("forward") || pos.includes("striker") || pos.includes("centre-forward") || pos.includes("center-forward") || pos.includes("winger") || pos.includes("attacker") || pos.includes("atacante") || pos.includes("offence") || abbr === "F" || abbr === "CF" || abbr === "ST" || abbr === "FW" || abbr === "LW" || abbr === "RW" || abbr === "ATA") {
    return { role: "ATA", granular: true };
  }
  if (pos.includes("midfield") || abbr === "M" || abbr === "MF") {
    return { role: playerIndex % 3 === 0 ? "VOL" : "MEI", granular: false };
  }
  return { role: "MEI", granular: false };
}
function computeAgeFromDateString(dateStr, referenceYear = (/* @__PURE__ */ new Date()).getFullYear()) {
  if (!dateStr) return 25;
  const match = String(dateStr).match(/(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return 25;
  const birthYear = Number(match[1]);
  const birthMonth = Number(match[2]);
  if (!Number.isFinite(birthYear) || birthYear < 1970 || birthYear > referenceYear - 15) {
    return 25;
  }
  const now = /* @__PURE__ */ new Date();
  const currentMonth = now.getMonth() + 1;
  const age = referenceYear - birthYear - (birthMonth > currentMonth ? 1 : 0);
  return Math.max(16, Math.min(45, age));
}
function deterministicHash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}
function estimateRealisticOverall(club, playerName, age, indexInSquad, activityScore = 0) {
  const rep = Math.max(1, Math.min(5, Number(club.reputation) || 3));
  let base = 68;
  if (club.division === "EU") {
    base = rep >= 5 ? 81 : rep === 4 ? 76 : rep === 3 ? 72 : 67;
  } else if (club.division === "A") {
    base = rep >= 5 ? 77 : rep === 4 ? 74 : 71;
  } else if (club.division === "SA" || club.division === "WL") {
    base = rep >= 5 ? 76 : rep === 4 ? 73 : 69;
  } else if (club.division === "B") {
    base = rep >= 4 ? 69 : 66;
  } else if (club.division === "C") {
    base = 63;
  } else {
    base = 59;
  }
  const hash = deterministicHash(`${club.id}:${playerName}`);
  const spread = hash % 7 - 3;
  const agePrimeBonus = age >= 23 && age <= 30 ? 2 : age <= 19 ? -3 : age >= 35 ? -2 : 0;
  const activityBonus = activityScore >= 25 ? 4 : activityScore >= 14 ? 2 : activityScore >= 6 ? 1 : indexInSquad < 11 ? 2 : -1;
  return Math.max(54, Math.min(91, Math.round(base + spread + agePrimeBonus + activityBonus)));
}
function finalizeNormalizedPlayers(rawPlayers, club) {
  const sortedCandidates = [...rawPlayers].sort(
    (a, b) => (b.activityScore || 0) - (a.activityScore || 0)
  );
  const gksPool = sortedCandidates.filter((p) => p.role === "GOL").slice(0, 3);
  const outfieldPool = sortedCandidates.filter((p) => p.role !== "GOL").slice(0, 27);
  const selectedPool = [...gksPool, ...outfieldPool];
  const seen = /* @__PURE__ */ new Set();
  const deduped = [];
  const usedNumbers = /* @__PURE__ */ new Set();
  for (let i = 0; i < selectedPool.length && deduped.length < 30; i++) {
    const p = selectedPool[i];
    const cleanName = String(p.name || "").trim();
    if (cleanName.length < 2) continue;
    const key = normalizePersonKey(cleanName);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    let jersey = Number(p.jerseyNumber) || i + 1;
    if (!Number.isFinite(jersey) || jersey < 1 || jersey > 99) jersey = i + 1;
    while (usedNumbers.has(jersey)) {
      jersey = jersey >= 99 ? 1 : jersey + 1;
    }
    usedNumbers.add(jersey);
    const fallbackAge = 21 + deterministicHash(`${club.id}:age:${cleanName}`) % 12;
    const safeAge = typeof p.age === "number" && Number.isFinite(p.age) && p.age >= 16 && p.age <= 46 ? Math.round(p.age) : fallbackAge;
    const overall = estimateRealisticOverall(
      club,
      cleanName,
      safeAge,
      deduped.length,
      p.activityScore || 0
    );
    deduped.push({
      name: cleanName,
      role: p.role,
      age: safeAge,
      overall,
      nationality: p.nationality || club.country || "Brasil",
      jerseyNumber: jersey,
      isStarter: false
    });
  }
  const gks = deduped.filter((p) => p.role === "GOL").sort((a, b) => b.overall - a.overall);
  const starterNames = /* @__PURE__ */ new Set();
  if (gks[0]) starterNames.add(gks[0].name);
  const outfield = deduped.filter((p) => p.role !== "GOL").sort((a, b) => b.overall - a.overall);
  for (const p of outfield) {
    if (starterNames.size >= 11) break;
    starterNames.add(p.name);
  }
  for (const p of deduped) {
    if (starterNames.size >= 11) break;
    starterNames.add(p.name);
  }
  return deduped.map((p) => ({
    ...p,
    isStarter: starterNames.has(p.name)
  }));
}
async function fetchJsonWithTimeout(url, headers = {}) {
  try {
    const resp = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
        "User-Agent": USER_AGENT,
        ...headers
      },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
    });
    if (!resp.ok) return null;
    return await resp.json();
  } catch {
    return null;
  }
}
async function fetchRawFromApiFootball(club) {
  const apiKey = process.env.API_FOOTBALL_KEY?.trim();
  if (!apiKey) return null;
  const headers = { "x-apisports-key": apiKey };
  const searchName = club.name.trim();
  const teamUrl = `${API_FOOTBALL_BASE}/teams?search=${encodeURIComponent(searchName)}`;
  const teamData = await fetchJsonWithTimeout(teamUrl, headers);
  const candidates = Array.isArray(teamData?.response) ? teamData.response : [];
  if (candidates.length === 0) return null;
  let bestTeam = null;
  for (const entry of candidates) {
    const tId = entry?.team?.id;
    const tName = entry?.team?.name;
    if (!tId || !tName) continue;
    let score = scoreTeamNameSimilarity(searchName, tName);
    if (club.country && entry.team?.country && translateNationalityToPt(entry.team.country, "").toLowerCase() === club.country.toLowerCase()) {
      score += 12;
    }
    if (!bestTeam || score > bestTeam.score) {
      bestTeam = { id: tId, name: tName, score };
    }
  }
  if (!bestTeam || bestTeam.score < 55) return null;
  const squadUrl = `${API_FOOTBALL_BASE}/players/squads?team=${encodeURIComponent(String(bestTeam.id))}`;
  const squadData = await fetchJsonWithTimeout(squadUrl, headers);
  const apiPlayers = squadData?.response?.[0]?.players;
  if (!Array.isArray(apiPlayers) || apiPlayers.length < 8) return null;
  let managerName;
  const coachUrl = `${API_FOOTBALL_BASE}/coachs?team=${encodeURIComponent(String(bestTeam.id))}`;
  const coachData = await fetchJsonWithTimeout(coachUrl, headers);
  const firstCoach = coachData?.response?.[0];
  if (firstCoach?.name) {
    managerName = firstCoach.name.trim();
  } else if (firstCoach?.firstname || firstCoach?.lastname) {
    managerName = `${firstCoach.firstname || ""} ${firstCoach.lastname || ""}`.trim();
  }
  return {
    source: "API_FOOTBALL",
    sourceName: "API-Football v3",
    sourceUrl: "https://www.api-football.com/",
    matchedTeamName: bestTeam.name,
    managerName,
    players: apiPlayers.map((p, idx) => {
      const mapped = mapExternalPositionToRole(p.position, null, idx);
      return {
        name: String(p.name || "").trim(),
        role: mapped.role,
        roleIsGranular: mapped.granular,
        age: typeof p.age === "number" ? p.age : void 0,
        nationality: club.country || "Brasil",
        jerseyNumber: p.number ?? void 0,
        activityScore: Math.max(1, 25 - idx)
      };
    })
  };
}
function resolveFootballDataCompetitionCode(club) {
  const league = (club.leagueName || "").toLowerCase();
  if (club.division === "A" || league.includes("s\xE9rie a") || league.includes("brasileir")) return "BSA";
  if (league.includes("premier league") && club.country === "Inglaterra") return "PL";
  if (league.includes("championship")) return "ELC";
  if (league.includes("la liga") || club.country === "Espanha") return "PD";
  if (league.includes("bundesliga") || club.country === "Alemanha") return "BL1";
  if (league.includes("serie a") && club.country === "It\xE1lia") return "SA";
  if (league.includes("ligue 1") || club.country === "Fran\xE7a") return "FL1";
  if (league.includes("primeira liga") || club.country === "Portugal") return "PPL";
  if (league.includes("eredivisie") || club.country === "Holanda") return "DED";
  return null;
}
async function fetchRawFromFootballDataOrg(club) {
  const apiKey = process.env.FOOTBALL_DATA_API_KEY?.trim();
  if (!apiKey) return null;
  const compCode = resolveFootballDataCompetitionCode(club);
  if (!compCode) return null;
  let cached = footballDataCompetitionCache.get(compCode);
  if (!cached || Date.now() - cached.fetchedAt > CACHE_TTL_MS) {
    const url = `${FOOTBALL_DATA_BASE}/competitions/${encodeURIComponent(compCode)}/teams`;
    const data = await fetchJsonWithTimeout(url, {
      "X-Auth-Token": apiKey
    });
    if (!Array.isArray(data?.teams) || data.teams.length === 0) return null;
    cached = { fetchedAt: Date.now(), teams: data.teams };
    footballDataCompetitionCache.set(compCode, cached);
  }
  let bestTeam = null;
  for (const team of cached.teams) {
    const score = Math.max(
      scoreTeamNameSimilarity(club.name, team.name || ""),
      scoreTeamNameSimilarity(club.name, team.shortName || "")
    );
    if (!bestTeam || score > bestTeam.score) {
      bestTeam = { team, score };
    }
  }
  if (!bestTeam || bestTeam.score < 58) return null;
  const squad = bestTeam.team.squad;
  if (!Array.isArray(squad) || squad.length < 8) return null;
  const fallbackCountry = club.country || "Brasil";
  return {
    source: "FOOTBALL_DATA",
    sourceName: "Football-Data.org v4",
    sourceUrl: "https://www.football-data.org/",
    matchedTeamName: bestTeam.team.name || club.name,
    managerName: String(bestTeam.team.coach?.name || "").trim() || void 0,
    players: squad.map((p, idx) => {
      const mapped = mapExternalPositionToRole(p.position, null, idx);
      return {
        name: String(p.name || "").trim(),
        role: mapped.role,
        roleIsGranular: mapped.granular,
        age: computeAgeFromDateString(p.dateOfBirth),
        nationality: translateNationalityToPt(p.nationality, fallbackCountry),
        jerseyNumber: p.shirtNumber ?? void 0,
        activityScore: Math.max(1, 24 - idx)
      };
    })
  };
}
function resolveEspnLeagueSlugs(club) {
  const league = (club.leagueName || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const country = (club.country || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const slugs = [];
  const add = (s) => {
    if (!slugs.includes(s)) slugs.push(s);
  };
  if (club.division === "A" || league.includes("serie a") && country === "brasil") add("bra.1");
  if (club.division === "B" || league.includes("serie b")) add("bra.2");
  if (country === "brasil") {
    add("bra.1");
    add("bra.2");
  }
  if (league.includes("premier league") && country === "inglaterra") add("eng.1");
  if (league.includes("championship")) add("eng.2");
  if (league.includes("league one")) add("eng.3");
  if (league.includes("league two")) add("eng.4");
  if (country === "inglaterra") {
    add("eng.1");
    add("eng.2");
    add("eng.3");
    add("eng.4");
  }
  if (country === "espanha" || league.includes("la liga")) add("esp.1");
  if (country === "italia" || league.includes("serie a") && country !== "brasil") add("ita.1");
  if (country === "alemanha" || league.includes("bundesliga")) add("ger.1");
  if (country === "franca" || league.includes("ligue 1")) add("fra.1");
  if (country === "portugal" || league.includes("primeira liga")) add("por.1");
  if (country === "holanda" || league.includes("eredivisie")) add("ned.1");
  if (country === "belgica") add("bel.1");
  if (country === "turquia") add("tur.1");
  if (country === "escocia") add("sco.1");
  if (country === "grecia") add("gre.1");
  if (country === "suica") add("sui.1");
  if (country === "dinamarca") add("den.1");
  if (country === "suecia") add("swe.1");
  if (country === "noruega") add("nor.1");
  if (country === "argentina") add("arg.1");
  if (country === "colombia") add("col.1");
  if (country === "chile") add("chi.1");
  if (country === "uruguai") add("uru.1");
  if (country === "equador") add("ecu.1");
  if (country === "paraguai") add("par.1");
  if (country === "peru") add("per.1");
  if (country === "bolivia") add("bol.1");
  if (country === "venezuela") add("ven.1");
  if (country === "estados unidos" || country === "canada" || league.includes("mls")) {
    add("usa.1");
    add("concacaf.champions");
  }
  if (country === "mexico" || league.includes("liga mx")) {
    add("mex.1");
    add("concacaf.champions");
  }
  if (country === "arabia saudita" || league.includes("saudi")) {
    add("ksa.1");
    add("afc.champions");
  }
  if (country === "japao" || league.includes("j1")) {
    add("jpn.1");
    add("afc.champions");
  }
  if (country === "russia") add("rus.1");
  if (country === "egito" || country === "marrocos") add("caf.champions");
  return slugs.slice(0, 3);
}
function extractEspnActivityScore(athlete) {
  const categories = athlete.statistics?.splits?.categories;
  if (!Array.isArray(categories)) return 0;
  let appearances = 0;
  let goals = 0;
  let assists = 0;
  let fouls = 0;
  for (const cat of categories) {
    if (!Array.isArray(cat.stats)) continue;
    for (const st of cat.stats) {
      const val = Number(st.value) || 0;
      if (st.name === "appearances" || st.name === "gamesPlayed") {
        appearances = Math.max(appearances, val);
      } else if (st.name === "totalGoals" || st.name === "goals") {
        goals = Math.max(goals, val);
      } else if (st.name === "goalAssists" || st.name === "assists") {
        assists = Math.max(assists, val);
      } else if (st.name === "foulsCommitted" || st.name === "foulsSuffered") {
        fouls += val;
      }
    }
  }
  return appearances * 3 + goals * 4 + assists * 3 + Math.min(20, Math.floor(fouls / 3));
}
async function fetchRawEspnRosterBySlugAndTeamId(leagueSlug, teamId, matchedTeamName, club) {
  const rosterUrl = `${ESPN_SOCCER_BASE}/${encodeURIComponent(leagueSlug)}/teams/${encodeURIComponent(
    teamId
  )}/roster`;
  const rosterData = await fetchJsonWithTimeout(rosterUrl);
  const athletes = Array.isArray(rosterData?.athletes) ? rosterData.athletes : [];
  if (athletes.length < 8) return null;
  const fallbackCountry = club.country || "Brasil";
  let managerName;
  const coachObj = Array.isArray(rosterData?.coach) ? rosterData.coach[0] : void 0;
  if (coachObj?.displayName) {
    managerName = coachObj.displayName.trim();
  } else if (coachObj?.firstName || coachObj?.lastName) {
    managerName = `${coachObj.firstName || ""} ${coachObj.lastName || ""}`.trim();
  }
  return {
    source: "ESPN_SOCCER",
    sourceName: "ESPN Soccer",
    sourceUrl: "https://www.espn.com/soccer/",
    matchedTeamName,
    managerName,
    players: athletes.map((a, idx) => {
      const mapped = mapExternalPositionToRole(
        a.position?.name || a.position?.displayName,
        a.position?.abbreviation,
        idx
      );
      return {
        name: String(a.displayName || a.fullName || "").trim(),
        role: mapped.role,
        roleIsGranular: mapped.granular,
        age: typeof a.age === "number" && Number.isFinite(a.age) ? a.age : computeAgeFromDateString(a.dateOfBirth),
        nationality: translateNationalityToPt(a.citizenship || a.flag?.alt, fallbackCountry),
        jerseyNumber: a.jersey ? Number.parseInt(a.jersey, 10) || void 0 : void 0,
        activityScore: extractEspnActivityScore(a)
      };
    })
  };
}
async function fetchRawFromEspnSoccer(club) {
  const slugs = resolveEspnLeagueSlugs(club);
  if (slugs.length === 0) return null;
  for (const slug of slugs) {
    let cached = espnLeagueTeamsCache.get(slug);
    if (!cached || Date.now() - cached.fetchedAt > CACHE_TTL_MS) {
      const teamsUrl = `${ESPN_SOCCER_BASE}/${encodeURIComponent(slug)}/teams?limit=80`;
      const data = await fetchJsonWithTimeout(teamsUrl);
      const rawTeams = data?.sports?.[0]?.leagues?.[0]?.teams || [];
      const extracted = rawTeams.map((t) => t.team).filter((t) => Boolean(t && t.id && t.displayName));
      if (extracted.length > 0) {
        cached = { fetchedAt: Date.now(), teams: extracted };
        espnLeagueTeamsCache.set(slug, cached);
      }
    }
    if (!cached || cached.teams.length === 0) continue;
    let bestTeam = null;
    for (const t of cached.teams) {
      const score = Math.max(
        scoreTeamNameSimilarity(club.name, t.displayName),
        scoreTeamNameSimilarity(club.name, t.shortDisplayName || ""),
        scoreTeamNameSimilarity(club.name, t.name || "")
      );
      if (!bestTeam || score > bestTeam.score) {
        bestTeam = { team: t, score };
      }
    }
    if (bestTeam && bestTeam.score >= 58) {
      const roster = await fetchRawEspnRosterBySlugAndTeamId(
        slug,
        bestTeam.team.id,
        bestTeam.team.displayName,
        club
      );
      if (roster) return roster;
    }
  }
  return null;
}
function cleanWikiTextValue(raw) {
  let s = String(raw || "");
  s = s.replace(/<ref[^>]*>[\s\S]*?<\/ref>/gi, "");
  s = s.replace(/<ref[^>]*\/>/gi, "");
  s = s.replace(/\[\[[^\]|]+\|([^\]]+)\]\]/g, "$1");
  s = s.replace(/\[\[([^\]]+)\]\]/g, "$1");
  s = s.replace(
    /\{\{(?:nowrap|sortname)\|([^|}]+)(?:\|([^}]+))?\}\}/gi,
    (_m, a, b) => b ? `${a} ${b}` : a
  );
  s = s.replace(/\{\{[^}]+\}\}/g, "");
  s = s.replace(/<[^>]+>/g, "");
  s = s.replace(/''+/g, "");
  s = s.replace(/\s*\((?:interim|caretaker|footballer[^)]*)\)/gi, "");
  return s.replace(/\s+/g, " ").trim();
}
function parseWikipediaSquadTemplates(wikitext, fallbackCountry) {
  const players = [];
  const templateRegex = /\{\{(?:fs player|football squad2? player)\s*\|([\s\S]*?)\}\}/gi;
  let match;
  let idx = 0;
  while ((match = templateRegex.exec(wikitext)) !== null && players.length < 40) {
    const body = match[1];
    const parts = [];
    let current = "";
    let bracketDepth = 0;
    let braceDepth = 0;
    for (let i = 0; i < body.length; i++) {
      const ch = body[i];
      const next = body[i + 1];
      if (ch === "[" && next === "[") {
        bracketDepth++;
        current += "[[";
        i++;
      } else if (ch === "]" && next === "]" && bracketDepth > 0) {
        bracketDepth--;
        current += "]]";
        i++;
      } else if (ch === "{" && next === "{") {
        braceDepth++;
        current += "{{";
        i++;
      } else if (ch === "}" && next === "}" && braceDepth > 0) {
        braceDepth--;
        current += "}}";
        i++;
      } else if (ch === "|" && bracketDepth === 0 && braceDepth === 0) {
        parts.push(current);
        current = "";
      } else {
        current += ch;
      }
    }
    if (current) parts.push(current);
    const fields = {};
    for (const part of parts) {
      const eq3 = part.indexOf("=");
      if (eq3 > 0) {
        const k = part.slice(0, eq3).trim().toLowerCase();
        const v = part.slice(eq3 + 1).trim();
        fields[k] = v;
      }
    }
    const otherLower = (fields.other || "").toLowerCase();
    if (otherLower.includes("on loan at") || otherLower.includes("out on loan")) {
      continue;
    }
    const name = cleanWikiTextValue(fields.name || "");
    if (name.length < 2 || name.length > 50) continue;
    const mapped = mapExternalPositionToRole(fields.pos || "", fields.pos || "", idx);
    const jerseyNum = fields.no ? Number.parseInt(fields.no.trim(), 10) : void 0;
    const nat = translateNationalityToPt(cleanWikiTextValue(fields.nat || ""), fallbackCountry);
    players.push({
      name,
      role: mapped.role,
      roleIsGranular: mapped.granular,
      nationality: nat,
      jerseyNumber: jerseyNum && Number.isFinite(jerseyNum) && jerseyNum >= 1 && jerseyNum <= 99 ? jerseyNum : void 0,
      activityScore: Math.max(1, 20 - Math.floor(idx / 2))
    });
    idx += 1;
  }
  return players;
}
function extractWikipediaManager(wikitext) {
  const infoboxHead = wikitext.slice(0, 5500);
  const mgrMatch = infoboxHead.match(
    /\|\s*(?:manager|head coach|coach|treinador|t[eé]cnico)\s*=\s*([^\n]+)/i
  );
  if (!mgrMatch?.[1]) return void 0;
  const cleaned = cleanWikiTextValue(mgrMatch[1]);
  if (cleaned.length < 3 || cleaned.length > 48 || /^(?:vacant|tbd|none|n\/a|unknown|nenhum|indefinido)$/i.test(cleaned)) {
    return void 0;
  }
  return cleaned;
}
var WIKI_EXCLUDED_TITLE_RE = /\b(disambiguation|desambiguação|list of|lista de|women|feminino|youth|sub-20|sub-17|under-21|under-23|u-19|u-20|u-23|reserves|castilla|b team|season|temporada|history of|records and statistics)\b/i;
async function fetchWikipediaPageContent(apiBase, searchQuery) {
  const wikiHeaders = { "User-Agent": WIKI_USER_AGENT };
  const searchUrl = `${apiBase}?action=query&list=search&srsearch=${encodeURIComponent(
    searchQuery
  )}&srlimit=5&format=json`;
  const searchRes = await fetchJsonWithTimeout(searchUrl, wikiHeaders);
  const candidates = searchRes?.query?.search || [];
  if (candidates.length === 0) return null;
  const chosen = candidates.find((c) => c.title && !WIKI_EXCLUDED_TITLE_RE.test(c.title)) || candidates[0];
  if (!chosen?.title) return null;
  const pageUrl = `${apiBase}?action=query&prop=revisions&rvprop=content&rvslots=main&redirects=1&format=json&titles=${encodeURIComponent(
    chosen.title
  )}`;
  const pageRes = await fetchJsonWithTimeout(pageUrl, wikiHeaders);
  const pageObj = pageRes?.query?.pages ? Object.values(pageRes.query.pages)[0] : void 0;
  const wikitext = pageObj?.revisions?.[0]?.slots?.main?.["*"];
  if (!wikitext || wikitext.length < 200) return null;
  return { title: pageObj.title || chosen.title, wikitext };
}
async function fetchRawFromWikipedia(club) {
  const fallbackCountry = club.country || "Brasil";
  const isBrazilOrLusophone = fallbackCountry === "Brasil" || fallbackCountry === "Portugal";
  const enQuery = `${club.name} football club`;
  const enPage = await fetchWikipediaPageContent(WIKIPEDIA_EN_API, enQuery);
  let bestTitle = enPage?.title || club.name;
  let bestUrl = enPage ? `https://en.wikipedia.org/wiki/${encodeURIComponent(enPage.title.replace(/ /g, "_"))}` : "https://en.wikipedia.org/";
  let managerName = enPage ? extractWikipediaManager(enPage.wikitext) : void 0;
  let players = enPage ? parseWikipediaSquadTemplates(enPage.wikitext, fallbackCountry) : [];
  if (isBrazilOrLusophone && (!managerName || players.length < 10)) {
    const ptPage = await fetchWikipediaPageContent(
      WIKIPEDIA_PT_API,
      `${club.name} futebol clube`
    );
    if (ptPage) {
      if (!managerName) {
        managerName = extractWikipediaManager(ptPage.wikitext);
      }
      if (players.length < 10) {
        const ptPlayers = parseWikipediaSquadTemplates(ptPage.wikitext, fallbackCountry);
        if (ptPlayers.length > players.length) {
          players = ptPlayers;
          bestTitle = ptPage.title;
          bestUrl = `https://pt.wikipedia.org/wiki/${encodeURIComponent(
            ptPage.title.replace(/ /g, "_")
          )}`;
        }
      }
    }
  }
  if (!managerName && players.length < 6) return null;
  return {
    source: "WIKIPEDIA",
    sourceName: "Wikipedia Live",
    sourceUrl: bestUrl,
    matchedTeamName: bestTitle,
    managerName,
    players
  };
}
function buildSearchNameVariants(clubName) {
  const clean = clubName.trim();
  const variants = [clean];
  const noAccents = clean.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  if (noAccents !== clean) variants.push(noAccents);
  const stripped = noAccents.replace(/\b(EC|FC|SC|CR|SE|CA|AC|CF|SAF|Esporte Clube|Clube de Regatas|Futebol Clube)\b/gi, "").replace(/\s+/g, " ").trim();
  if (stripped.length >= 3 && !variants.includes(stripped)) {
    variants.push(stripped);
  }
  return variants.slice(0, 2);
}
async function fetchRawFromTheSportsDb(club) {
  const apiKey = (process.env.THESPORTSDB_API_KEY || "123").trim() || "123";
  const safeKey = encodeURIComponent(apiKey);
  const variants = buildSearchNameVariants(club.name);
  let matchedTeam = null;
  for (const queryVariant of variants) {
    const searchUrl = `${THESPORTSDB_BASE}/${safeKey}/searchteams.php?t=${encodeURIComponent(
      queryVariant
    )}`;
    const data = await fetchJsonWithTimeout(searchUrl);
    const teams = Array.isArray(data?.teams) ? data.teams : [];
    for (const t of teams) {
      if (!t?.idTeam || !t?.strTeam) continue;
      if (t.strSport && t.strSport.toLowerCase() !== "soccer") continue;
      let score = Math.max(
        scoreTeamNameSimilarity(club.name, t.strTeam),
        scoreTeamNameSimilarity(club.name, t.strTeamAlternate || "")
      );
      if (club.country && t.strCountry && translateNationalityToPt(t.strCountry, "").toLowerCase() === club.country.toLowerCase()) {
        score += 14;
      }
      if (!matchedTeam || score > matchedTeam.score) {
        matchedTeam = {
          idTeam: t.idTeam,
          idESPN: t.idESPN || void 0,
          strTeam: t.strTeam,
          strCountry: t.strCountry,
          strManager: t.strManager,
          score
        };
      }
    }
    if (matchedTeam && matchedTeam.score >= 80) break;
  }
  if (!matchedTeam || matchedTeam.score < 58) return { squad: null };
  const cleanManager = String(matchedTeam.strManager || "").trim();
  const managerName = cleanManager.length >= 3 ? cleanManager : void 0;
  const rosterUrl = `${THESPORTSDB_BASE}/${safeKey}/lookup_all_players.php?id=${encodeURIComponent(
    matchedTeam.idTeam
  )}`;
  const rosterData = await fetchJsonWithTimeout(rosterUrl);
  const rawList = Array.isArray(rosterData?.player) ? rosterData.player : [];
  const activePlayers = rawList.filter((p) => {
    const pos = String(p.strPosition || "").toLowerCase();
    const status = String(p.strStatus || "").toLowerCase();
    if (pos.includes("manager") || pos.includes("coach") || pos.includes("director")) return false;
    if (status.includes("retired")) return false;
    return Boolean(p.strPlayer && p.strPlayer.trim().length >= 2);
  });
  const fallbackCountry = club.country || "Brasil";
  const squad = activePlayers.length > 0 || managerName ? {
    source: "THESPORTSDB",
    sourceName: "TheSportsDB",
    sourceUrl: "https://www.thesportsdb.com/",
    matchedTeamName: matchedTeam.strTeam,
    managerName,
    players: activePlayers.map((p, idx) => {
      const mapped = mapExternalPositionToRole(p.strPosition, null, idx);
      return {
        name: String(p.strPlayer || "").trim(),
        role: mapped.role,
        roleIsGranular: mapped.granular,
        age: computeAgeFromDateString(p.dateBorn),
        nationality: translateNationalityToPt(p.strNationality, fallbackCountry),
        jerseyNumber: p.strNumber ? Number.parseInt(p.strNumber, 10) || void 0 : void 0,
        activityScore: Math.max(1, 18 - idx)
      };
    })
  } : null;
  return {
    squad,
    espnTeamId: matchedTeam.idESPN,
    matchedName: matchedTeam.strTeam
  };
}
function getRosterApiProvidersStatus() {
  const hasApiFootball = Boolean(process.env.API_FOOTBALL_KEY?.trim());
  const hasFootballData = Boolean(process.env.FOOTBALL_DATA_API_KEY?.trim());
  const hasCustomSportsDb = Boolean(process.env.THESPORTSDB_API_KEY?.trim());
  const hasGemini = Boolean(process.env.GEMINI_API_KEY?.trim());
  return [
    {
      id: "ESPN_SOCCER",
      name: "ESPN Soccer API",
      kind: "FOOTBALL_API",
      enabled: true,
      configuredViaSecret: false,
      description: "Ativa automaticamente \u2014 elencos reais, camisas, idades e minutagem em 37+ ligas (Brasileir\xE3o A/B, Europa, Am\xE9rica do Sul, MLS, M\xE9xico, Ar\xE1bia, Jap\xE3o, \xC1frica)."
    },
    {
      id: "WIKIPEDIA",
      name: "Wikipedia Live API",
      kind: "FOOTBALL_API",
      enabled: true,
      configuredViaSecret: false,
      description: "Ativa automaticamente \u2014 t\xE9cnicos reais atualizados e elencos completos de 100% dos clubes mundiais (incluindo S\xE9rie C, S\xE9rie D e Estaduais)."
    },
    {
      id: "THESPORTSDB",
      name: "TheSportsDB API",
      kind: "FOOTBALL_API",
      enabled: true,
      configuredViaSecret: hasCustomSportsDb,
      description: hasCustomSportsDb ? "Conectada com chave dedicada \u2014 refina posi\xE7\xF5es t\xE1ticas exatas (ZAG/LAT/VOL/MEI/ATA)." : "Ativa automaticamente \u2014 refina posi\xE7\xF5es t\xE1ticas exatas e cruza dados com a ESPN."
    },
    {
      id: "API_FOOTBALL",
      name: "API-Football v3",
      kind: "FOOTBALL_API",
      enabled: hasApiFootball,
      configuredViaSecret: hasApiFootball,
      description: hasApiFootball ? "Conectada via segredo do servidor (prioridade m\xE1xima na fus\xE3o)." : "Opcional \u2014 adicione API_FOOTBALL_KEY nos segredos do servidor para somar \xE0 fus\xE3o."
    },
    {
      id: "FOOTBALL_DATA",
      name: "Football-Data.org v4",
      kind: "FOOTBALL_API",
      enabled: hasFootballData,
      configuredViaSecret: hasFootballData,
      description: hasFootballData ? "Conectada via segredo do servidor (ligas UEFA e Brasileir\xE3o)." : "Opcional \u2014 adicione FOOTBALL_DATA_API_KEY nos segredos do servidor para somar \xE0 fus\xE3o."
    },
    {
      id: "GEMINI_SEARCH",
      name: "Gemini + Google Search",
      kind: "AI_SEARCH",
      enabled: hasGemini,
      configuredViaSecret: hasGemini,
      description: hasGemini ? "Ativo como camada final de busca web caso algum clube regional n\xE3o exista nas 5 APIs esportivas." : "Indispon\xEDvel no momento (requer GEMINI_API_KEY no servidor)."
    }
  ];
}
async function fetchClubRosterFromExternalApis(club) {
  const [apiFootball, footballData, espnDirect, wikiSquad, sportsDbResult] = await Promise.all([
    fetchRawFromApiFootball(club).catch(() => null),
    fetchRawFromFootballDataOrg(club).catch(() => null),
    fetchRawFromEspnSoccer(club).catch(() => null),
    fetchRawFromWikipedia(club).catch(() => null),
    fetchRawFromTheSportsDb(club).catch(
      () => ({
        squad: null
      })
    )
  ]);
  let espnSquad = espnDirect;
  if (!espnSquad && sportsDbResult?.espnTeamId) {
    espnSquad = await fetchRawEspnRosterBySlugAndTeamId(
      "all",
      sportsDbResult.espnTeamId,
      sportsDbResult.matchedName || club.name,
      club
    ).catch(() => null);
  }
  const allResponses = [
    apiFootball,
    footballData,
    espnSquad,
    wikiSquad,
    sportsDbResult?.squad || null
  ].filter((r) => Boolean(r));
  if (allResponses.length === 0) return null;
  const squadPriority = allResponses.filter((r) => r.players.length >= 12);
  const primarySquad = squadPriority[0] || [...allResponses].sort((a, b) => b.players.length - a.players.length)[0];
  if (!primarySquad || primarySquad.players.length < 8) return null;
  const enrichByNormName = /* @__PURE__ */ new Map();
  const secondaryProviders = allResponses.filter((r) => r !== primarySquad);
  for (const sec of secondaryProviders) {
    for (const p of sec.players) {
      const key = normalizePersonKey(p.name);
      if (!key) continue;
      const existing = enrichByNormName.get(key);
      if (!existing) {
        enrichByNormName.set(key, {
          role: p.role,
          roleIsGranular: p.roleIsGranular,
          age: p.age,
          nationality: p.nationality,
          jerseyNumber: p.jerseyNumber,
          source: sec.source
        });
      } else {
        if (!existing.roleIsGranular && p.roleIsGranular) {
          existing.role = p.role;
          existing.roleIsGranular = true;
        }
        if (!existing.age && p.age) existing.age = p.age;
        if (!existing.nationality && p.nationality) existing.nationality = p.nationality;
        if (!existing.jerseyNumber && p.jerseyNumber) existing.jerseyNumber = p.jerseyNumber;
      }
    }
  }
  const sourcesUsedSet = /* @__PURE__ */ new Set([primarySquad.source]);
  const sourceLabelsSet = /* @__PURE__ */ new Set([primarySquad.sourceName]);
  const sourceUrlsMap = /* @__PURE__ */ new Map();
  if (primarySquad.sourceUrl) {
    sourceUrlsMap.set(primarySquad.sourceUrl, {
      title: primarySquad.sourceName,
      uri: primarySquad.sourceUrl
    });
  }
  const addUsedSource = (provider) => {
    sourcesUsedSet.add(provider.source);
    sourceLabelsSet.add(provider.sourceName);
    if (provider.sourceUrl && !sourceUrlsMap.has(provider.sourceUrl)) {
      sourceUrlsMap.set(provider.sourceUrl, {
        title: provider.sourceName,
        uri: provider.sourceUrl
      });
    }
  };
  const fusedRawPlayers = primarySquad.players.map((p) => {
    const key = normalizePersonKey(p.name);
    const enrich = enrichByNormName.get(key);
    if (!enrich) return p;
    let enrichedSomething = false;
    let role = p.role;
    let roleIsGranular = p.roleIsGranular;
    if (!roleIsGranular && enrich.role && enrich.roleIsGranular) {
      role = enrich.role;
      roleIsGranular = true;
      enrichedSomething = true;
    }
    let age = p.age;
    if ((!age || age < 16) && enrich.age && enrich.age >= 16) {
      age = enrich.age;
      enrichedSomething = true;
    }
    let jerseyNumber = p.jerseyNumber;
    if (!jerseyNumber && enrich.jerseyNumber) {
      jerseyNumber = enrich.jerseyNumber;
      enrichedSomething = true;
    }
    let nationality = p.nationality;
    if (!nationality && enrich.nationality) {
      nationality = enrich.nationality;
      enrichedSomething = true;
    }
    if (enrichedSomething) {
      const secProv = secondaryProviders.find((s) => s.source === enrich.source);
      if (secProv) addUsedSource(secProv);
    }
    return {
      ...p,
      role,
      roleIsGranular,
      age,
      jerseyNumber,
      nationality
    };
  });
  if (fusedRawPlayers.length < 22) {
    const seenKeys = new Set(fusedRawPlayers.map((p) => normalizePersonKey(p.name)));
    for (const sec of secondaryProviders) {
      let addedFromSec = false;
      for (const p of sec.players) {
        if (fusedRawPlayers.length >= 28) break;
        const key = normalizePersonKey(p.name);
        if (!key || seenKeys.has(key)) continue;
        seenKeys.add(key);
        fusedRawPlayers.push(p);
        addedFromSec = true;
      }
      if (addedFromSec) addUsedSource(sec);
    }
  }
  let managerName = primarySquad.managerName;
  if (!managerName) {
    const managerPriorityOrder = [
      "API_FOOTBALL",
      "FOOTBALL_DATA",
      "WIKIPEDIA",
      "ESPN_SOCCER",
      "THESPORTSDB"
    ];
    for (const srcId of managerPriorityOrder) {
      const match = allResponses.find((r) => r.source === srcId && r.managerName);
      if (match?.managerName) {
        managerName = match.managerName;
        addUsedSource(match);
        break;
      }
    }
  }
  const normalized = finalizeNormalizedPlayers(fusedRawPlayers, club);
  if (normalized.length < 8) return null;
  return {
    clubId: club.id,
    managerName: managerName || "Treinador Principal",
    players: normalized,
    source: primarySquad.source,
    sourcesUsed: Array.from(sourcesUsedSet),
    sourceLabel: Array.from(sourceLabelsSet).join(" + "),
    sourceUrls: Array.from(sourceUrlsMap.values()),
    matchedTeamName: primarySquad.matchedTeamName
  };
}

// server.ts
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
var PRIMARY_GEMINI_MODEL = "gemini-4-hydrogen";
var FALLBACK_GEMINI_MODEL = "gemini-3.1-flash-lite";
var CANDIDATE_TEXT_MODELS = [PRIMARY_GEMINI_MODEL, FALLBACK_GEMINI_MODEL];
var groundedSearchCooldownUntil = 0;
var modelQuotaCooldownUntil = {};
function isGeminiQuotaError(err) {
  if (!err) return false;
  const anyErr = err;
  if (anyErr.status === 429 || anyErr.code === 429) return true;
  const text2 = String(anyErr.message ?? err).toLowerCase();
  return text2.includes("429") || text2.includes("resource_exhausted") || text2.includes("exceeded your current quota") || text2.includes("rate limit") || text2.includes("quota");
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
  const resolvePublicOrigin = (req) => {
    const envUrl = String(process.env.APP_URL || "").trim();
    if (/^https?:\/\/[^/\s<>"']+$/i.test(envUrl) && !envUrl.includes("MY_APP_URL")) {
      return envUrl.replace(/\/+$/, "");
    }
    const rawHost = String(req.get("host") || "").trim();
    const safeHost = /^[a-z0-9.-]+(?::\d{1,5})?$/i.test(rawHost) ? rawHost : "";
    const proto = req.protocol === "https" || req.get("x-forwarded-proto") === "https" ? "https" : "http";
    if (safeHost) return `${proto}://${safeHost}`;
    return "https://patofoot.app";
  };
  app.get("/.well-known/assetlinks.json", (_req, res) => {
    const packageName = String(process.env.ANDROID_APP_PACKAGE || "com.patofoot.manager2026").trim() || "com.patofoot.manager2026";
    const rawFingerprints = String(process.env.ANDROID_SHA256_FINGERPRINTS || "").split(",").map((fp) => fp.trim()).filter((fp) => fp.length >= 16);
    const fingerprints = rawFingerprints.length > 0 ? rawFingerprints : ["SUBSTITUA_PELO_SHA256_DA_GOOGLE_PLAY_OU_DEFINA_ANDROID_SHA256_FINGERPRINTS"];
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=3600");
    res.json([
      {
        relation: ["delegate_permission/common.handle_all_urls"],
        target: {
          namespace: "android_app",
          package_name: packageName,
          sha256_cert_fingerprints: fingerprints
        }
      }
    ]);
  });
  app.get("/.well-known/apple-app-site-association", (_req, res) => {
    const teamId = String(process.env.APPLE_TEAM_ID || "TEAMID").trim() || "TEAMID";
    const bundleId = String(process.env.IOS_BUNDLE_ID || "com.patofoot.manager2026").trim() || "com.patofoot.manager2026";
    const appID = `${teamId}.${bundleId}`;
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=3600");
    res.json({
      applinks: {
        apps: [],
        details: [
          {
            appID,
            paths: ["/", "/site", "/site/*"]
          }
        ]
      },
      webcredentials: {
        apps: [appID]
      }
    });
  });
  app.get("/robots.txt", (req, res) => {
    const origin = resolvePublicOrigin(req);
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=3600");
    res.send(`User-agent: *
Allow: /

Sitemap: ${origin}/sitemap.xml
`);
  });
  app.get("/sitemap.xml", (req, res) => {
    const origin = resolvePublicOrigin(req);
    const today = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
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
    res.setHeader("Content-Type", "application/xml; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=3600");
    res.send(xml);
  });
  const sqlSaveBodyParser = express.json({ limit: "16mb" });
  app.post("/api/sql/users/sync", requireAuth, async (req, res) => {
    try {
      const tokenUser = req.user;
      const body = req.body || {};
      const userRecord = await getOrCreateUser({
        uid: tokenUser.uid,
        email: tokenUser.email || `${tokenUser.uid}@acesso.patofoot.app`,
        displayName: typeof body.displayName === "string" && body.displayName.trim().length >= 2 ? body.displayName.trim() : tokenUser.name,
        usernameKey: typeof body.usernameKey === "string" ? body.usernameKey : void 0,
        favoriteClubId: typeof body.favoriteClubId === "string" ? body.favoriteClubId : void 0
      });
      res.json({
        uid: userRecord.uid,
        displayName: userRecord.displayName,
        usernameKey: userRecord.usernameKey,
        favoriteClubId: userRecord.favoriteClubId
      });
    } catch (error) {
      console.error("Failed to sync trainer profile:", error);
      res.status(500).json({ error: "Failed to synchronize trainer account." });
    }
  });
  app.patch("/api/sql/users/profile", requireAuth, async (req, res) => {
    try {
      const tokenUser = req.user;
      const body = req.body || {};
      await getOrCreateUser({
        uid: tokenUser.uid,
        email: tokenUser.email || `${tokenUser.uid}@acesso.patofoot.app`,
        displayName: tokenUser.name
      });
      const updated = await updateSqlUserProfile(tokenUser.uid, {
        displayName: typeof body.displayName === "string" ? body.displayName : void 0,
        favoriteClubId: typeof body.favoriteClubId === "string" ? body.favoriteClubId : void 0
      });
      res.json({ ok: true, profile: updated });
    } catch (error) {
      console.error("Failed to update trainer profile:", error);
      res.status(500).json({ error: "Failed to update trainer profile." });
    }
  });
  app.get("/api/sql/saves", requireAuth, async (req, res) => {
    try {
      const tokenUser = req.user;
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
          updatedAtIso: row.updatedAt instanceof Date ? row.updatedAt.toISOString() : new Date(row.updatedAt).toISOString()
        }))
      });
    } catch (error) {
      console.error("Failed to list SQL career saves:", error);
      res.status(500).json({ error: "Failed to load cloud career saves." });
    }
  });
  app.get("/api/sql/saves/:slotId", requireAuth, async (req, res) => {
    const slotId = String(req.params.slotId || "");
    if (!isValidSqlSlotId(slotId)) {
      res.status(400).json({ error: "Invalid career slot ID." });
      return;
    }
    try {
      const tokenUser = req.user;
      const row = await getUserSqlCareerSave(tokenUser.uid, slotId);
      if (!row) {
        res.status(404).json({ error: "Career save not found." });
        return;
      }
      const inflated = zlib.gunzipSync(Buffer.from(row.payloadCompressed, "base64")).toString("utf-8");
      const parsed = JSON.parse(inflated);
      res.json({ save: parsed });
    } catch (error) {
      console.error("Failed to load SQL career save:", error);
      res.status(500).json({ error: "Failed to download cloud career save." });
    }
  });
  app.put("/api/sql/saves/:slotId", sqlSaveBodyParser, requireAuth, async (req, res) => {
    const slotId = String(req.params.slotId || "");
    if (!isValidSqlSlotId(slotId)) {
      res.status(400).json({ error: "Invalid career slot ID." });
      return;
    }
    const body = req.body || {};
    if (!body.save || typeof body.save !== "object" || !Array.isArray(body.save.clubs)) {
      res.status(400).json({ error: "Invalid career save payload." });
      return;
    }
    try {
      const tokenUser = req.user;
      const summary = body.summary || {};
      const managerName = String(summary.managerName || body.save.managerName || tokenUser.name || "Treinador").trim().slice(0, 80);
      const clubId = String(summary.clubId || body.save.userClubId || "fla").trim().slice(0, 40);
      const userRecord = await getOrCreateUser({
        uid: tokenUser.uid,
        email: tokenUser.email || `${tokenUser.uid}@acesso.patofoot.app`,
        displayName: managerName,
        favoriteClubId: clubId
      });
      const rawJson = JSON.stringify(body.save);
      const payloadCompressed = zlib.gzipSync(Buffer.from(rawJson, "utf-8"), { level: 6 }).toString("base64");
      const savedRow = await upsertUserSqlCareerSave({
        userId: userRecord.id,
        slotId,
        clubId,
        clubName: String(summary.clubName || "Clube").trim().slice(0, 80),
        clubShortName: String(summary.clubShortName || "CLB").trim().slice(0, 32),
        clubPrimaryColor: String(summary.clubPrimaryColor || "#10b981").slice(0, 16),
        clubSecondaryColor: String(summary.clubSecondaryColor || "#0f172a").slice(0, 16),
        division: String(summary.division || "A").slice(0, 16),
        managerName,
        seasonYear: Math.max(2025, Math.min(2150, Math.round(Number(summary.seasonYear || 2026)))),
        round: Math.max(1, Math.min(120, Math.round(Number(summary.round || 1)))),
        currentDate: String(summary.currentDate || "2026-01-11").slice(0, 20),
        clubBalance: Number.isFinite(Number(summary.clubBalance)) ? Number(summary.clubBalance) : 0,
        payloadCompressed,
        trophiesCount: Number(summary.trophiesCount || 0),
        hallOfFamePoints: Number(summary.hallOfFamePoints || 0),
        winRatePct: Number(summary.winRatePct || 0)
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
          updatedAtIso: savedRow.updatedAt instanceof Date ? savedRow.updatedAt.toISOString() : new Date(savedRow.updatedAt).toISOString()
        }
      });
    } catch (error) {
      console.error("Failed to upsert SQL career save:", error);
      res.status(500).json({ error: "Failed to save career data to cloud." });
    }
  });
  app.delete("/api/sql/saves/:slotId", requireAuth, async (req, res) => {
    const slotId = String(req.params.slotId || "");
    if (!isValidSqlSlotId(slotId)) {
      res.status(400).json({ error: "Invalid career slot ID." });
      return;
    }
    try {
      const tokenUser = req.user;
      await deleteUserSqlCareerSave(tokenUser.uid, slotId);
      res.json({ ok: true });
    } catch (error) {
      console.error("Failed to delete SQL career save:", error);
      res.status(500).json({ error: "Failed to delete cloud career save." });
    }
  });
  app.get("/api/sql/hall-of-fame", requireAuth, async (req, res) => {
    try {
      const limit = Number(req.query.limit || 20);
      const entries = await listHallOfFameLeaderboard(limit);
      res.json({ entries });
    } catch (error) {
      console.error("Failed to load Hall of Fame entries:", error);
      res.status(500).json({ error: "Failed to load Hall of Fame rankings." });
    }
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
      model: "gemini-4-hydrogen"
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
          model: "gemini-4-hydrogen"
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
          model: "gemini-4-hydrogen"
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
          model: "gemini-4-hydrogen"
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
          model: "gemini-4-hydrogen"
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
          model: "gemini-4-hydrogen"
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
          model: "gemini-4-hydrogen"
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
          model: "gemini-4-hydrogen"
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
          model: "gemini-4-hydrogen"
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
          model: "gemini-4-hydrogen"
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
          model: "gemini-4-hydrogen"
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
  app.get("/api/clubs/squads/monthly-sync/status", (_req, res) => {
    const ptMonthsShort = [
      "Jan",
      "Fev",
      "Mar",
      "Abr",
      "Mai",
      "Jun",
      "Jul",
      "Ago",
      "Set",
      "Out",
      "Nov",
      "Dez"
    ];
    const ptMonthsFull = [
      "Janeiro",
      "Fevereiro",
      "Mar\xE7o",
      "Abril",
      "Maio",
      "Junho",
      "Julho",
      "Agosto",
      "Setembro",
      "Outubro",
      "Novembro",
      "Dezembro"
    ];
    const now = /* @__PURE__ */ new Date();
    const year = now.getFullYear();
    const monthIdx = now.getMonth();
    const monthKey = `${year}-${String(monthIdx + 1).padStart(2, "0")}`;
    const shortLabel = `${ptMonthsShort[monthIdx] || "Nov"}/${year}`;
    const fullLabel = `${ptMonthsFull[monthIdx] || "Novembro"} de ${year}`;
    let syncedThisMonthCount = 0;
    let lastUpdatedAt = null;
    const sourcesBreakdown = {};
    for (const profile of resolvedOct2026SquadCache.values()) {
      if (!profile || !Array.isArray(profile.players) || profile.players.length === 0) continue;
      const isThisMonth = profile.monthKey === monthKey || typeof profile.updatedAt === "string" && profile.updatedAt.startsWith(monthKey);
      if (isThisMonth) {
        syncedThisMonthCount += 1;
        const srcKey = profile.source || "GEMINI_SEARCH";
        sourcesBreakdown[srcKey] = (sourcesBreakdown[srcKey] || 0) + 1;
      }
      if (typeof profile.updatedAt === "string" && (!lastUpdatedAt || profile.updatedAt > lastUpdatedAt)) {
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
      model: PRIMARY_GEMINI_MODEL
    });
  });
  const handleMonthlySquadSync = async (req, res) => {
    const ptMonthsFull = [
      "Janeiro",
      "Fevereiro",
      "Mar\xE7o",
      "Abril",
      "Maio",
      "Junho",
      "Julho",
      "Agosto",
      "Setembro",
      "Outubro",
      "Novembro",
      "Dezembro"
    ];
    const now = /* @__PURE__ */ new Date();
    const defaultYear = now.getFullYear();
    const defaultMonthKey = `${defaultYear}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const defaultFullLabel = `${ptMonthsFull[now.getMonth()] || "Novembro"} de ${defaultYear}`;
    const reqPeriod = req.body?.targetPeriod;
    const syncMonthKey = typeof reqPeriod?.monthKey === "string" && /^\d{4}-\d{2}$/.test(reqPeriod.monthKey) ? reqPeriod.monthKey : defaultMonthKey;
    const syncFullLabel = typeof reqPeriod?.fullLabel === "string" && reqPeriod.fullLabel.trim().length > 0 ? reqPeriod.fullLabel.trim().slice(0, 60) : defaultFullLabel;
    const syncYear = typeof reqPeriod?.year === "number" && Number.isFinite(reqPeriod.year) && reqPeriod.year >= 2020 && reqPeriod.year <= 2040 ? Math.round(reqPeriod.year) : defaultYear;
    const preferredProviderRaw = String(req.body?.preferredProvider || "AUTO").toUpperCase();
    const preferredProvider = preferredProviderRaw === "GEMINI_SEARCH" ? "GEMINI_SEARCH" : preferredProviderRaw === "FOOTBALL_API_FIRST" ? "FOOTBALL_API_FIRST" : "AUTO";
    try {
      const forceRefresh = Boolean(req.body?.forceRefresh);
      const rawClubs = Array.isArray(req.body?.clubs) ? req.body.clubs.slice(0, 6).filter((c) => c && typeof c.id === "string" && typeof c.name === "string").map((c) => ({
        id: c.id.trim().slice(0, 64),
        name: c.name.trim().slice(0, 96),
        country: typeof c.country === "string" ? c.country.trim().slice(0, 48) : "Brasil",
        leagueName: typeof c.leagueName === "string" ? c.leagueName.trim().slice(0, 80) : void 0,
        division: typeof c.division === "string" ? c.division.trim().slice(0, 12) : void 0,
        reputation: typeof c.reputation === "number" && Number.isFinite(c.reputation) ? Math.max(1, Math.min(5, Math.round(c.reputation))) : 3
      })).filter((c) => c.id.length > 0 && c.name.length > 0) : [];
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
          model: PRIMARY_GEMINI_MODEL
        });
        return;
      }
      const results = [];
      const uncached = [];
      const groundingSourcesMap = /* @__PURE__ */ new Map();
      const providerCounts = {};
      let cachedCount = 0;
      let usedExternalApi = false;
      let usedAi = false;
      let usedGoogleSearch = false;
      for (const c of rawClubs) {
        const cached = !forceRefresh ? resolvedOct2026SquadCache.get(c.id) : void 0;
        const isFreshThisMonth = Boolean(
          cached && cached.players.length >= 16 && (cached.monthKey === syncMonthKey || typeof cached.updatedAt === "string" && cached.updatedAt.startsWith(syncMonthKey))
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
          model: PRIMARY_GEMINI_MODEL
        });
        return;
      }
      const needsAiFallback = [];
      if (preferredProvider !== "GEMINI_SEARCH") {
        const externalResults = await Promise.all(
          uncached.map(
            (clubQuery) => fetchClubRosterFromExternalApis(clubQuery).catch(() => null)
          )
        );
        for (let idx = 0; idx < uncached.length; idx++) {
          const queryClub = uncached[idx];
          const ext = externalResults[idx];
          if (ext && ext.players.length >= 10) {
            const sanitizedClub = {
              clubId: queryClub.id,
              managerName: ext.managerName,
              updatedAt: (/* @__PURE__ */ new Date()).toISOString(),
              monthKey: syncMonthKey,
              source: ext.source,
              sourceLabel: ext.sourceLabel,
              players: ext.players.slice(0, 30)
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
                  title: `${link.title} (${syncFullLabel})`
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
              model: PRIMARY_GEMINI_MODEL
            });
            return;
          }
          res.status(503).json({
            error: "ROSTER_PROVIDERS_UNAVAILABLE",
            message: "Nenhum elenco encontrado nas APIs de futebol ao vivo e a busca complementar de IA n\xE3o est\xE1 configurada no servidor.",
            clubs: results,
            groundingSources: [],
            providerCounts,
            usedExternalApi,
            usedAi: false,
            usedGoogleSearch: false,
            cachedCount,
            monthKey: syncMonthKey,
            totalCachedOnServer: resolvedOct2026SquadCache.size
          });
          return;
        }
        const validRoles = /* @__PURE__ */ new Set(["GOL", "ZAG", "LAT", "VOL", "MEI", "ATA"]);
        const CHUNK_SIZE = needsAiFallback.length <= 2 ? 2 : 5;
        const minPlayersTarget = needsAiFallback.length <= 2 ? 24 : 22;
        for (let offset = 0; offset < needsAiFallback.length; offset += CHUNK_SIZE) {
          const batch = needsAiFallback.slice(offset, offset + CHUNK_SIZE);
          const clubLines = batch.map(
            (c) => `- clubId="${c.id}" | clube="${c.name}" | pais="${c.country || "Brasil"}" | liga="${c.leagueName || c.division || "1\xAA Divis\xE3o"}" | reputacao=${c.reputation || 3}`
          );
          const promptText = [
            `Pesquise na web (Google Search) o elenco profissional real e atualizado de ${syncFullLabel.toUpperCase()} para cada clube listado abaixo.`,
            `Regras obrigat\xF3rias de atualiza\xE7\xE3o mensal (${syncFullLabel}):`,
            `1. Informe o nome real do t\xE9cnico atual em ${syncFullLabel} em managerName.`,
            `2. Liste entre ${minPlayersTarget} e 28 jogadores reais do elenco atual de ${syncFullLabel} (incluindo contrata\xE7\xF5es, chegadas e sa\xEDdas confirmadas at\xE9 ${syncFullLabel}), cobrindo todas as posi\xE7\xF5es de forma equilibrada: 3 goleiros (GOL), 4 a 6 zagueiros (ZAG), 4 laterais (LAT), 4 a 5 volantes (VOL), 4 a 5 meias (MEI) e 4 a 6 atacantes (ATA).`,
            '3. Marque exatamente 11 atletas titulares habituais com "isStarter": true (1 GOL e 10 de linha) e os demais com "isStarter": false.',
            '4. Em "role" use estritamente: "GOL", "ZAG", "LAT", "VOL", "MEI" ou "ATA".',
            `5. Em "age" informe a idade real em ${syncFullLabel} (16 a 46). Em "jerseyNumber" informe o n\xFAmero da camisa (1 a 99). Em "nationality" informe o pa\xEDs em portugu\xEAs do Brasil.`,
            `6. Em "overall" calibre com realismo em ${syncFullLabel} (${syncYear}) conforme a for\xE7a real do clube e divis\xE3o (gigantes europeus: 76\u201391; S\xE9rie A Brasil / grandes da Am\xE9rica, Ar\xE1bia, M\xE9xico, MLS e R\xFAssia: 70\u201388; S\xE9rie B / ligas m\xE9dias: 63\u201376; S\xE9rie C/D / divis\xF5es inferiores: 54\u201369).`,
            "7. Retorne APENAS um array JSON puro (sem texto extra) com TODOS os clubes solicitados no formato:",
            '[{"clubId":"...","managerName":"...","players":[{"name":"...","role":"GOL","age":28,"overall":82,"nationality":"Brasil","jerseyNumber":1,"isStarter":true}]}]',
            "",
            `Clubes para pesquisar elenco de ${syncFullLabel}:`,
            ...clubLines
          ].join("\n");
          let parsedBatch = null;
          const groundedOctResult = await generateGroundedIfAvailable(
            ai,
            promptText,
            `Voc\xEA \xE9 um especialista mundial em bancos de dados de futebol em ${syncFullLabel} (Transfermarkt, SofaScore, FIFA, CBF, CONMEBOL, UEFA, CONCACAF, AFC e CAF). Use Google Search para consultar as transfer\xEAncias mais recentes at\xE9 ${syncFullLabel} e retorne exclusivamente JSON v\xE1lido para todos os clubes solicitados.`
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
                    title: typeof title === "string" && title.trim() ? title.trim() : `Fonte Web ${syncFullLabel}`
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
              systemInstruction: `Voc\xEA \xE9 um especialista mundial em bancos de dados de futebol em ${syncFullLabel}. Liste os jogadores reais de cada clube solicitado em ${syncFullLabel} e retorne exclusivamente JSON v\xE1lido seguindo o schema.`,
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
                providerCounts,
                usedExternalApi,
                usedAi,
                usedGoogleSearch,
                quotaLimited: true,
                cached: false,
                cachedCount,
                monthKey: syncMonthKey,
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
                  monthKey: syncMonthKey,
                  source: "GEMINI_SEARCH",
                  sourceLabel: usedGoogleSearch ? "Gemini + Google Search" : "Gemini Live Roster",
                  players: sanitizedPlayers.slice(0, 30)
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
        model: PRIMARY_GEMINI_MODEL
      });
    } catch (err) {
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
          totalCachedOnServer: resolvedOct2026SquadCache.size
        });
        return;
      }
      const msg = err instanceof Error ? err.message : String(err);
      console.error("[Monthly Squad API Sync Error]:", msg);
      res.status(500).json({
        error: "ROSTER_SYNC_FAILED",
        message: `N\xE3o foi poss\xEDvel atualizar os elencos de ${syncFullLabel} pela API neste momento.`
      });
    }
  };
  app.post("/api/clubs/squads/monthly-sync", handleMonthlySquadSync);
  app.post("/api/clubs/squads/october-2026", handleMonthlySquadSync);
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
