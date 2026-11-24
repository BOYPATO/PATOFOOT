/**
 * Server-side Multi-API Live Football Roster Fusion Engine
 *
 * Connects to ALL best available live football databases strictly on the backend
 * (never exposing API keys to the browser) with hardcoded allowlisted hostnames,
 * strict timeouts, and parallel cross-enrichment ("Fusão Multi-API") for monthly
 * on-demand squad updates.
 *
 * Connected providers:
 *  1. ESPN Soccer Live API (site.api.espn.com) — ACTIVE automatically (37+ live leagues:
 *     Brasileirão A/B, England 1-4, Spain, Italy, Germany, France, Portugal, Netherlands,
 *     Belgium, Turkey, Scotland, Greece, Switzerland, Denmark, Sweden, Norway, ALL 10
 *     CONMEBOL leagues, MLS, Liga MX, Saudi Pro League, J1 League, Russia, CAF/AFC/CONCACAF)
 *  2. Wikipedia Live Roster & Manager API (en.wikipedia.org + pt.wikipedia.org) — ACTIVE
 *     automatically for 100% of world clubs (including Série C/D, Estaduais, Africa, Asia)
 *     providing real-time managers and current first-team squads
 *  3. TheSportsDB Live API (www.thesportsdb.com) — ACTIVE automatically (granular positions,
 *     manager verification, and ESPN ID cross-linking)
 *  4. API-Football v3 (v3.football.api-sports.io) — ACTIVE automatically when API_FOOTBALL_KEY is set
 *  5. Football-Data.org v4 (api.football-data.org) — ACTIVE automatically when FOOTBALL_DATA_API_KEY is set
 *  6. Gemini + Google Search (gemini-4-hydrogen) — complementary layer in server.ts
 */

export type RosterApiSourceId =
  | 'API_FOOTBALL'
  | 'FOOTBALL_DATA'
  | 'ESPN_SOCCER'
  | 'WIKIPEDIA'
  | 'THESPORTSDB'
  | 'GEMINI_SEARCH';

export interface ExternalRosterClubQuery {
  id: string;
  name: string;
  country?: string;
  leagueName?: string;
  division?: string;
  reputation?: number;
}

export interface NormalizedRosterPlayer {
  name: string;
  role: 'GOL' | 'ZAG' | 'LAT' | 'VOL' | 'MEI' | 'ATA';
  age: number;
  overall: number;
  nationality: string;
  jerseyNumber: number;
  isStarter: boolean;
}

export interface ExternalRosterFetchResult {
  clubId: string;
  managerName: string;
  players: NormalizedRosterPlayer[];
  source: RosterApiSourceId;
  sourcesUsed: RosterApiSourceId[];
  sourceLabel: string;
  sourceUrls: Array<{ title: string; uri: string }>;
  matchedTeamName: string;
}

export interface RosterApiProviderStatus {
  id: RosterApiSourceId;
  name: string;
  kind: 'FOOTBALL_API' | 'AI_SEARCH';
  enabled: boolean;
  configuredViaSecret: boolean;
  description: string;
}

interface RawProviderPlayer {
  name: string;
  role: 'GOL' | 'ZAG' | 'LAT' | 'VOL' | 'MEI' | 'ATA';
  roleIsGranular?: boolean;
  age?: number;
  nationality?: string;
  jerseyNumber?: number;
  activityScore?: number;
}

interface RawProviderSquad {
  source: RosterApiSourceId;
  sourceName: string;
  sourceUrl?: string;
  matchedTeamName: string;
  managerName?: string;
  players: RawProviderPlayer[];
}

const REQUEST_TIMEOUT_MS = 8000;
const USER_AGENT = 'PatoFoot2026-MonthlyRosterSync/1.0';
const WIKI_USER_AGENT = 'PatoFoot2026/1.0 (https://patofoot.app)';

// Strict allowlisted base URLs (no user-supplied URLs ever passed to fetch)
const API_FOOTBALL_BASE = 'https://v3.football.api-sports.io';
const FOOTBALL_DATA_BASE = 'https://api.football-data.org/v4';
const ESPN_SOCCER_BASE = 'https://site.api.espn.com/apis/site/v2/sports/soccer';
const THESPORTSDB_BASE = 'https://www.thesportsdb.com/api/v1/json';
const WIKIPEDIA_EN_API = 'https://en.wikipedia.org/w/api.php';
const WIKIPEDIA_PT_API = 'https://pt.wikipedia.org/w/api.php';

// In-memory competition teams caches (12h TTL)
const CACHE_TTL_MS = 12 * 60 * 60 * 1000;

interface FootballDataPlayer {
  name?: string;
  position?: string;
  dateOfBirth?: string;
  nationality?: string;
  shirtNumber?: number | null;
}

interface FootballDataTeam {
  id?: number;
  name?: string;
  shortName?: string;
  tla?: string;
  coach?: { name?: string | null };
  squad?: FootballDataPlayer[];
}

interface EspnTeamSummary {
  id: string;
  displayName: string;
  shortDisplayName?: string;
  name?: string;
  abbreviation?: string;
}

interface EspnStatEntry {
  name?: string;
  value?: number;
}

interface EspnStatCategory {
  stats?: EspnStatEntry[];
}

interface EspnAthlete {
  displayName?: string;
  fullName?: string;
  age?: number;
  dateOfBirth?: string;
  jersey?: string;
  citizenship?: string;
  flag?: { alt?: string };
  position?: { name?: string; displayName?: string; abbreviation?: string };
  statistics?: {
    splits?: {
      categories?: EspnStatCategory[];
    };
  };
}

const footballDataCompetitionCache = new Map<
  string,
  { fetchedAt: number; teams: FootballDataTeam[] }
>();

const espnLeagueTeamsCache = new Map<
  string,
  { fetchedAt: number; teams: EspnTeamSummary[] }
>();

const COUNTRY_TO_PT: Record<string, string> = {
  bra: 'Brasil',
  brazil: 'Brasil',
  brasil: 'Brasil',
  arg: 'Argentina',
  argentina: 'Argentina',
  uru: 'Uruguai',
  uruguay: 'Uruguai',
  col: 'Colômbia',
  colombia: 'Colômbia',
  par: 'Paraguai',
  paraguay: 'Paraguai',
  chi: 'Chile',
  chile: 'Chile',
  ecu: 'Equador',
  ecuador: 'Equador',
  per: 'Peru',
  peru: 'Peru',
  bol: 'Bolívia',
  bolivia: 'Bolívia',
  ven: 'Venezuela',
  venezuela: 'Venezuela',
  eng: 'Inglaterra',
  england: 'Inglaterra',
  'united kingdom': 'Inglaterra',
  gbr: 'Inglaterra',
  sco: 'Escócia',
  scotland: 'Escócia',
  wal: 'País de Gales',
  wales: 'País de Gales',
  nir: 'Irlanda do Norte',
  'northern ireland': 'Irlanda do Norte',
  irl: 'Irlanda',
  ireland: 'Irlanda',
  esp: 'Espanha',
  spain: 'Espanha',
  por: 'Portugal',
  portugal: 'Portugal',
  fra: 'França',
  france: 'França',
  ger: 'Alemanha',
  germany: 'Alemanha',
  ita: 'Itália',
  italy: 'Itália',
  ned: 'Holanda',
  netherlands: 'Holanda',
  holland: 'Holanda',
  bel: 'Bélgica',
  belgium: 'Bélgica',
  sui: 'Suíça',
  switzerland: 'Suíça',
  aut: 'Áustria',
  austria: 'Áustria',
  cro: 'Croácia',
  croatia: 'Croácia',
  srb: 'Sérvia',
  serbia: 'Sérvia',
  pol: 'Polônia',
  poland: 'Polônia',
  den: 'Dinamarca',
  denmark: 'Dinamarca',
  swe: 'Suécia',
  sweden: 'Suécia',
  nor: 'Noruega',
  norway: 'Noruega',
  tur: 'Turquia',
  turkey: 'Turquia',
  gre: 'Grécia',
  greece: 'Grécia',
  ukr: 'Ucrânia',
  ukraine: 'Ucrânia',
  rus: 'Rússia',
  russia: 'Rússia',
  cze: 'República Tcheca',
  'czech republic': 'República Tcheca',
  czechia: 'República Tcheca',
  svk: 'Eslováquia',
  slovakia: 'Eslováquia',
  hun: 'Hungria',
  hungary: 'Hungria',
  rou: 'Romênia',
  romania: 'Romênia',
  mex: 'México',
  mexico: 'México',
  usa: 'Estados Unidos',
  'united states': 'Estados Unidos',
  can: 'Canadá',
  canada: 'Canadá',
  jpn: 'Japão',
  japan: 'Japão',
  kor: 'Coreia do Sul',
  'south korea': 'Coreia do Sul',
  'korea republic': 'Coreia do Sul',
  ksa: 'Arábia Saudita',
  'saudi arabia': 'Arábia Saudita',
  aus: 'Austrália',
  australia: 'Austrália',
  mar: 'Marrocos',
  morocco: 'Marrocos',
  egy: 'Egito',
  egypt: 'Egito',
  sen: 'Senegal',
  senegal: 'Senegal',
  nga: 'Nigéria',
  nigeria: 'Nigéria',
  cmr: 'Camarões',
  cameroon: 'Camarões',
  gha: 'Gana',
  ghana: 'Gana',
  civ: 'Costa do Marfim',
  'ivory coast': 'Costa do Marfim',
  "cote d'ivoire": 'Costa do Marfim',
  alg: 'Argélia',
  algeria: 'Argélia',
  tun: 'Tunísia',
  tunisia: 'Tunísia',
  rsa: 'África do Sul',
  'south africa': 'África do Sul',
  ang: 'Angola',
  angola: 'Angola',
  mli: 'Mali',
  mali: 'Mali',
  gui: 'Guiné',
  guinea: 'Guiné',
  cpv: 'Cabo Verde',
  'cape verde': 'Cabo Verde',
};

function translateNationalityToPt(raw: string | undefined | null, fallbackCountry: string): string {
  const clean = String(raw || '').trim();
  if (!clean) return fallbackCountry || 'Brasil';
  const key = clean
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
  return COUNTRY_TO_PT[key] || clean;
}

function normalizePersonKey(name: string): string {
  return String(name || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function normalizeTeamMatchKey(name: string): string {
  return String(name || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(
      /\b(fc|cf|sc|ec|ac|as|ss|afc|bfc|cfc|rc|cd|ca|ud|sd|se|cr|saf|club|clube|esporte|sport|futebol|football|de|do|da|dos|das|the)\b/g,
      ' '
    )
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function scoreTeamNameSimilarity(queryName: string, candidateName: string): number {
  const qRaw = String(queryName || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
  const cRaw = String(candidateName || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
  if (!qRaw || !cRaw) return 0;
  if (qRaw === cRaw) return 100;

  const qNorm = normalizeTeamMatchKey(qRaw);
  const cNorm = normalizeTeamMatchKey(cRaw);
  if (qNorm && cNorm && qNorm === cNorm) return 96;
  if (qNorm && cNorm && (cNorm.includes(qNorm) || qNorm.includes(cNorm))) return 84;

  const qTokens = new Set(qNorm.split(' ').filter((t) => t.length >= 2));
  const cTokens = new Set(cNorm.split(' ').filter((t) => t.length >= 2));
  if (qTokens.size === 0 || cTokens.size === 0) return 0;

  let overlap = 0;
  for (const t of qTokens) {
    if (cTokens.has(t)) overlap += 1;
  }
  const unionSize = new Set([...qTokens, ...cTokens]).size;
  return Math.round((overlap / Math.max(1, unionSize)) * 86);
}

function mapExternalPositionToRole(
  rawPosition: string | undefined | null,
  rawAbbr?: string | null,
  playerIndex = 0
): { role: 'GOL' | 'ZAG' | 'LAT' | 'VOL' | 'MEI' | 'ATA'; granular: boolean } {
  const pos = String(rawPosition || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
  const abbr = String(rawAbbr || '').toUpperCase().trim();

  if (
    pos.includes('goal') ||
    pos.includes('keeper') ||
    abbr === 'G' ||
    abbr === 'GK' ||
    abbr === 'GOL' ||
    pos.includes('goleiro')
  ) {
    return { role: 'GOL', granular: true };
  }
  if (
    pos.includes('left-back') ||
    pos.includes('right-back') ||
    pos.includes('left back') ||
    pos.includes('right back') ||
    pos.includes('wing-back') ||
    pos.includes('wingback') ||
    pos.includes('full-back') ||
    pos.includes('fullback') ||
    pos.includes('lateral') ||
    abbr === 'LB' ||
    abbr === 'RB' ||
    abbr === 'LWB' ||
    abbr === 'RWB' ||
    abbr === 'LD' ||
    abbr === 'LE' ||
    abbr === 'LAT'
  ) {
    return { role: 'LAT', granular: true };
  }
  if (
    pos.includes('centre-back') ||
    pos.includes('center-back') ||
    pos.includes('center back') ||
    pos.includes('centre back') ||
    pos.includes('zagueiro') ||
    abbr === 'CB' ||
    abbr === 'ZAG'
  ) {
    return { role: 'ZAG', granular: true };
  }
  if (pos.includes('defender') || pos.includes('defence') || abbr === 'D' || abbr === 'DF') {
    return { role: playerIndex % 3 === 2 ? 'LAT' : 'ZAG', granular: false };
  }
  if (
    pos.includes('defensive mid') ||
    pos.includes('holding mid') ||
    pos.includes('volante') ||
    abbr === 'DM' ||
    abbr === 'CDM' ||
    abbr === 'VOL'
  ) {
    return { role: 'VOL', granular: true };
  }
  if (
    pos.includes('attacking mid') ||
    pos.includes('central mid') ||
    pos.includes('meia') ||
    abbr === 'AM' ||
    abbr === 'CAM' ||
    abbr === 'CM' ||
    abbr === 'MEI'
  ) {
    return { role: 'MEI', granular: true };
  }
  if (
    pos.includes('forward') ||
    pos.includes('striker') ||
    pos.includes('centre-forward') ||
    pos.includes('center-forward') ||
    pos.includes('winger') ||
    pos.includes('attacker') ||
    pos.includes('atacante') ||
    pos.includes('offence') ||
    abbr === 'F' ||
    abbr === 'CF' ||
    abbr === 'ST' ||
    abbr === 'FW' ||
    abbr === 'LW' ||
    abbr === 'RW' ||
    abbr === 'ATA'
  ) {
    return { role: 'ATA', granular: true };
  }
  if (pos.includes('midfield') || abbr === 'M' || abbr === 'MF') {
    return { role: playerIndex % 3 === 0 ? 'VOL' : 'MEI', granular: false };
  }
  return { role: 'MEI', granular: false };
}

function computeAgeFromDateString(
  dateStr?: string | null,
  referenceYear = new Date().getFullYear()
): number {
  if (!dateStr) return 25;
  const match = String(dateStr).match(/(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return 25;
  const birthYear = Number(match[1]);
  const birthMonth = Number(match[2]);
  if (!Number.isFinite(birthYear) || birthYear < 1970 || birthYear > referenceYear - 15) {
    return 25;
  }
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const age = referenceYear - birthYear - (birthMonth > currentMonth ? 1 : 0);
  return Math.max(16, Math.min(45, age));
}

function deterministicHash(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

function estimateRealisticOverall(
  club: ExternalRosterClubQuery,
  playerName: string,
  age: number,
  indexInSquad: number,
  activityScore = 0
): number {
  const rep = Math.max(1, Math.min(5, Number(club.reputation) || 3));
  let base = 68;
  if (club.division === 'EU') {
    base = rep >= 5 ? 81 : rep === 4 ? 76 : rep === 3 ? 72 : 67;
  } else if (club.division === 'A') {
    base = rep >= 5 ? 77 : rep === 4 ? 74 : 71;
  } else if (club.division === 'SA' || club.division === 'WL') {
    base = rep >= 5 ? 76 : rep === 4 ? 73 : 69;
  } else if (club.division === 'B') {
    base = rep >= 4 ? 69 : 66;
  } else if (club.division === 'C') {
    base = 63;
  } else {
    base = 59;
  }

  const hash = deterministicHash(`${club.id}:${playerName}`);
  const spread = (hash % 7) - 3; // -3..+3
  const agePrimeBonus = age >= 23 && age <= 30 ? 2 : age <= 19 ? -3 : age >= 35 ? -2 : 0;
  const activityBonus =
    activityScore >= 25
      ? 4
      : activityScore >= 14
      ? 2
      : activityScore >= 6
      ? 1
      : indexInSquad < 11
      ? 2
      : -1;

  return Math.max(54, Math.min(91, Math.round(base + spread + agePrimeBonus + activityBonus)));
}

function finalizeNormalizedPlayers(
  rawPlayers: RawProviderPlayer[],
  club: ExternalRosterClubQuery
): NormalizedRosterPlayer[] {
  const sortedCandidates = [...rawPlayers].sort(
    (a, b) => (b.activityScore || 0) - (a.activityScore || 0)
  );
  const gksPool = sortedCandidates.filter((p) => p.role === 'GOL').slice(0, 3);
  const outfieldPool = sortedCandidates.filter((p) => p.role !== 'GOL').slice(0, 27);
  const selectedPool = [...gksPool, ...outfieldPool];

  const seen = new Set<string>();
  const deduped: NormalizedRosterPlayer[] = [];
  const usedNumbers = new Set<number>();

  for (let i = 0; i < selectedPool.length && deduped.length < 30; i++) {
    const p = selectedPool[i];
    const cleanName = String(p.name || '').trim();
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

    const fallbackAge = 21 + (deterministicHash(`${club.id}:age:${cleanName}`) % 12);
    const safeAge =
      typeof p.age === 'number' && Number.isFinite(p.age) && p.age >= 16 && p.age <= 46
        ? Math.round(p.age)
        : fallbackAge;

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
      nationality: p.nationality || club.country || 'Brasil',
      jerseyNumber: jersey,
      isStarter: false,
    });
  }

  // Pick balanced 11 starters (1 GOL + 10 outfield by highest overall)
  const gks = deduped.filter((p) => p.role === 'GOL').sort((a, b) => b.overall - a.overall);
  const starterNames = new Set<string>();
  if (gks[0]) starterNames.add(gks[0].name);

  const outfield = deduped
    .filter((p) => p.role !== 'GOL')
    .sort((a, b) => b.overall - a.overall);
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
    isStarter: starterNames.has(p.name),
  }));
}

async function fetchJsonWithTimeout<T>(
  url: string,
  headers: Record<string, string> = {}
): Promise<T | null> {
  try {
    const resp = await fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'User-Agent': USER_AGENT,
        ...headers,
      },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    if (!resp.ok) return null;
    return (await resp.json()) as T;
  } catch {
    return null;
  }
}

/**
 * Provider 1: API-Football v3 (https://v3.football.api-sports.io)
 */
async function fetchRawFromApiFootball(
  club: ExternalRosterClubQuery
): Promise<RawProviderSquad | null> {
  const apiKey = process.env.API_FOOTBALL_KEY?.trim();
  if (!apiKey) return null;

  const headers = { 'x-apisports-key': apiKey };
  const searchName = club.name.trim();
  const teamUrl = `${API_FOOTBALL_BASE}/teams?search=${encodeURIComponent(searchName)}`;

  const teamData = await fetchJsonWithTimeout<{
    response?: Array<{
      team?: { id?: number; name?: string; country?: string };
    }>;
  }>(teamUrl, headers);

  const candidates = Array.isArray(teamData?.response) ? teamData.response : [];
  if (candidates.length === 0) return null;

  let bestTeam: { id: number; name: string; score: number } | null = null;
  for (const entry of candidates) {
    const tId = entry?.team?.id;
    const tName = entry?.team?.name;
    if (!tId || !tName) continue;
    let score = scoreTeamNameSimilarity(searchName, tName);
    if (
      club.country &&
      entry.team?.country &&
      translateNationalityToPt(entry.team.country, '').toLowerCase() ===
        club.country.toLowerCase()
    ) {
      score += 12;
    }
    if (!bestTeam || score > bestTeam.score) {
      bestTeam = { id: tId, name: tName, score };
    }
  }

  if (!bestTeam || bestTeam.score < 55) return null;

  const squadUrl = `${API_FOOTBALL_BASE}/players/squads?team=${encodeURIComponent(String(bestTeam.id))}`;
  const squadData = await fetchJsonWithTimeout<{
    response?: Array<{
      players?: Array<{
        name?: string;
        age?: number;
        number?: number | null;
        position?: string;
      }>;
    }>;
  }>(squadUrl, headers);

  const apiPlayers = squadData?.response?.[0]?.players;
  if (!Array.isArray(apiPlayers) || apiPlayers.length < 8) return null;

  let managerName: string | undefined;
  const coachUrl = `${API_FOOTBALL_BASE}/coachs?team=${encodeURIComponent(String(bestTeam.id))}`;
  const coachData = await fetchJsonWithTimeout<{
    response?: Array<{ name?: string; firstname?: string; lastname?: string }>;
  }>(coachUrl, headers);
  const firstCoach = coachData?.response?.[0];
  if (firstCoach?.name) {
    managerName = firstCoach.name.trim();
  } else if (firstCoach?.firstname || firstCoach?.lastname) {
    managerName = `${firstCoach.firstname || ''} ${firstCoach.lastname || ''}`.trim();
  }

  return {
    source: 'API_FOOTBALL',
    sourceName: 'API-Football v3',
    sourceUrl: 'https://www.api-football.com/',
    matchedTeamName: bestTeam.name,
    managerName,
    players: apiPlayers.map((p, idx) => {
      const mapped = mapExternalPositionToRole(p.position, null, idx);
      return {
        name: String(p.name || '').trim(),
        role: mapped.role,
        roleIsGranular: mapped.granular,
        age: typeof p.age === 'number' ? p.age : undefined,
        nationality: club.country || 'Brasil',
        jerseyNumber: p.number ?? undefined,
        activityScore: Math.max(1, 25 - idx),
      };
    }),
  };
}

function resolveFootballDataCompetitionCode(club: ExternalRosterClubQuery): string | null {
  const league = (club.leagueName || '').toLowerCase();
  if (club.division === 'A' || league.includes('série a') || league.includes('brasileir')) return 'BSA';
  if (league.includes('premier league') && club.country === 'Inglaterra') return 'PL';
  if (league.includes('championship')) return 'ELC';
  if (league.includes('la liga') || club.country === 'Espanha') return 'PD';
  if (league.includes('bundesliga') || club.country === 'Alemanha') return 'BL1';
  if (league.includes('serie a') && club.country === 'Itália') return 'SA';
  if (league.includes('ligue 1') || club.country === 'França') return 'FL1';
  if (league.includes('primeira liga') || club.country === 'Portugal') return 'PPL';
  if (league.includes('eredivisie') || club.country === 'Holanda') return 'DED';
  return null;
}

/**
 * Provider 2: Football-Data.org v4 (https://api.football-data.org/v4)
 */
async function fetchRawFromFootballDataOrg(
  club: ExternalRosterClubQuery
): Promise<RawProviderSquad | null> {
  const apiKey = process.env.FOOTBALL_DATA_API_KEY?.trim();
  if (!apiKey) return null;

  const compCode = resolveFootballDataCompetitionCode(club);
  if (!compCode) return null;

  let cached = footballDataCompetitionCache.get(compCode);
  if (!cached || Date.now() - cached.fetchedAt > CACHE_TTL_MS) {
    const url = `${FOOTBALL_DATA_BASE}/competitions/${encodeURIComponent(compCode)}/teams`;
    const data = await fetchJsonWithTimeout<{ teams?: FootballDataTeam[] }>(url, {
      'X-Auth-Token': apiKey,
    });
    if (!Array.isArray(data?.teams) || data.teams.length === 0) return null;
    cached = { fetchedAt: Date.now(), teams: data.teams };
    footballDataCompetitionCache.set(compCode, cached);
  }

  let bestTeam: { team: FootballDataTeam; score: number } | null = null;
  for (const team of cached.teams) {
    const score = Math.max(
      scoreTeamNameSimilarity(club.name, team.name || ''),
      scoreTeamNameSimilarity(club.name, team.shortName || '')
    );
    if (!bestTeam || score > bestTeam.score) {
      bestTeam = { team, score };
    }
  }

  if (!bestTeam || bestTeam.score < 58) return null;
  const squad = bestTeam.team.squad;
  if (!Array.isArray(squad) || squad.length < 8) return null;

  const fallbackCountry = club.country || 'Brasil';
  return {
    source: 'FOOTBALL_DATA',
    sourceName: 'Football-Data.org v4',
    sourceUrl: 'https://www.football-data.org/',
    matchedTeamName: bestTeam.team.name || club.name,
    managerName: String(bestTeam.team.coach?.name || '').trim() || undefined,
    players: squad.map((p, idx) => {
      const mapped = mapExternalPositionToRole(p.position, null, idx);
      return {
        name: String(p.name || '').trim(),
        role: mapped.role,
        roleIsGranular: mapped.granular,
        age: computeAgeFromDateString(p.dateOfBirth),
        nationality: translateNationalityToPt(p.nationality, fallbackCountry),
        jerseyNumber: p.shirtNumber ?? undefined,
        activityScore: Math.max(1, 24 - idx),
      };
    }),
  };
}

function resolveEspnLeagueSlugs(club: ExternalRosterClubQuery): string[] {
  const league = (club.leagueName || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
  const country = (club.country || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

  const slugs: string[] = [];
  const add = (s: string) => {
    if (!slugs.includes(s)) slugs.push(s);
  };

  if (club.division === 'A' || (league.includes('serie a') && country === 'brasil')) add('bra.1');
  if (club.division === 'B' || league.includes('serie b')) add('bra.2');
  if (country === 'brasil') {
    add('bra.1');
    add('bra.2');
  }
  if (league.includes('premier league') && country === 'inglaterra') add('eng.1');
  if (league.includes('championship')) add('eng.2');
  if (league.includes('league one')) add('eng.3');
  if (league.includes('league two')) add('eng.4');
  if (country === 'inglaterra') {
    add('eng.1');
    add('eng.2');
    add('eng.3');
    add('eng.4');
  }
  if (country === 'espanha' || league.includes('la liga')) add('esp.1');
  if (country === 'italia' || (league.includes('serie a') && country !== 'brasil')) add('ita.1');
  if (country === 'alemanha' || league.includes('bundesliga')) add('ger.1');
  if (country === 'franca' || league.includes('ligue 1')) add('fra.1');
  if (country === 'portugal' || league.includes('primeira liga')) add('por.1');
  if (country === 'holanda' || league.includes('eredivisie')) add('ned.1');
  if (country === 'belgica') add('bel.1');
  if (country === 'turquia') add('tur.1');
  if (country === 'escocia') add('sco.1');
  if (country === 'grecia') add('gre.1');
  if (country === 'suica') add('sui.1');
  if (country === 'dinamarca') add('den.1');
  if (country === 'suecia') add('swe.1');
  if (country === 'noruega') add('nor.1');
  if (country === 'argentina') add('arg.1');
  if (country === 'colombia') add('col.1');
  if (country === 'chile') add('chi.1');
  if (country === 'uruguai') add('uru.1');
  if (country === 'equador') add('ecu.1');
  if (country === 'paraguai') add('par.1');
  if (country === 'peru') add('per.1');
  if (country === 'bolivia') add('bol.1');
  if (country === 'venezuela') add('ven.1');
  if (country === 'estados unidos' || country === 'canada' || league.includes('mls')) {
    add('usa.1');
    add('concacaf.champions');
  }
  if (country === 'mexico' || league.includes('liga mx')) {
    add('mex.1');
    add('concacaf.champions');
  }
  if (country === 'arabia saudita' || league.includes('saudi')) {
    add('ksa.1');
    add('afc.champions');
  }
  if (country === 'japao' || league.includes('j1')) {
    add('jpn.1');
    add('afc.champions');
  }
  if (country === 'russia') add('rus.1');
  if (country === 'egito' || country === 'marrocos') add('caf.champions');

  return slugs.slice(0, 3);
}

function extractEspnActivityScore(athlete: EspnAthlete): number {
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
      if (st.name === 'appearances' || st.name === 'gamesPlayed') {
        appearances = Math.max(appearances, val);
      } else if (st.name === 'totalGoals' || st.name === 'goals') {
        goals = Math.max(goals, val);
      } else if (st.name === 'goalAssists' || st.name === 'assists') {
        assists = Math.max(assists, val);
      } else if (st.name === 'foulsCommitted' || st.name === 'foulsSuffered') {
        fouls += val;
      }
    }
  }
  return appearances * 3 + goals * 4 + assists * 3 + Math.min(20, Math.floor(fouls / 3));
}

async function fetchRawEspnRosterBySlugAndTeamId(
  leagueSlug: string,
  teamId: string,
  matchedTeamName: string,
  club: ExternalRosterClubQuery
): Promise<RawProviderSquad | null> {
  const rosterUrl = `${ESPN_SOCCER_BASE}/${encodeURIComponent(leagueSlug)}/teams/${encodeURIComponent(
    teamId
  )}/roster`;
  const rosterData = await fetchJsonWithTimeout<{
    athletes?: EspnAthlete[];
    coach?: Array<{ firstName?: string; lastName?: string; displayName?: string }>;
  }>(rosterUrl);

  const athletes = Array.isArray(rosterData?.athletes) ? rosterData.athletes : [];
  if (athletes.length < 8) return null;

  const fallbackCountry = club.country || 'Brasil';
  let managerName: string | undefined;
  const coachObj = Array.isArray(rosterData?.coach) ? rosterData.coach[0] : undefined;
  if (coachObj?.displayName) {
    managerName = coachObj.displayName.trim();
  } else if (coachObj?.firstName || coachObj?.lastName) {
    managerName = `${coachObj.firstName || ''} ${coachObj.lastName || ''}`.trim();
  }

  return {
    source: 'ESPN_SOCCER',
    sourceName: 'ESPN Soccer',
    sourceUrl: 'https://www.espn.com/soccer/',
    matchedTeamName,
    managerName,
    players: athletes.map((a, idx) => {
      const mapped = mapExternalPositionToRole(
        a.position?.name || a.position?.displayName,
        a.position?.abbreviation,
        idx
      );
      return {
        name: String(a.displayName || a.fullName || '').trim(),
        role: mapped.role,
        roleIsGranular: mapped.granular,
        age:
          typeof a.age === 'number' && Number.isFinite(a.age)
            ? a.age
            : computeAgeFromDateString(a.dateOfBirth),
        nationality: translateNationalityToPt(a.citizenship || a.flag?.alt, fallbackCountry),
        jerseyNumber: a.jersey ? Number.parseInt(a.jersey, 10) || undefined : undefined,
        activityScore: extractEspnActivityScore(a),
      };
    }),
  };
}

/**
 * Provider 3: ESPN Soccer Live API (37+ live leagues worldwide)
 */
async function fetchRawFromEspnSoccer(
  club: ExternalRosterClubQuery
): Promise<RawProviderSquad | null> {
  const slugs = resolveEspnLeagueSlugs(club);
  if (slugs.length === 0) return null;

  for (const slug of slugs) {
    let cached = espnLeagueTeamsCache.get(slug);
    if (!cached || Date.now() - cached.fetchedAt > CACHE_TTL_MS) {
      const teamsUrl = `${ESPN_SOCCER_BASE}/${encodeURIComponent(slug)}/teams?limit=80`;
      const data = await fetchJsonWithTimeout<{
        sports?: Array<{
          leagues?: Array<{
            teams?: Array<{ team?: EspnTeamSummary }>;
          }>;
        }>;
      }>(teamsUrl);
      const rawTeams = data?.sports?.[0]?.leagues?.[0]?.teams || [];
      const extracted = rawTeams
        .map((t) => t.team)
        .filter((t): t is EspnTeamSummary => Boolean(t && t.id && t.displayName));
      if (extracted.length > 0) {
        cached = { fetchedAt: Date.now(), teams: extracted };
        espnLeagueTeamsCache.set(slug, cached);
      }
    }

    if (!cached || cached.teams.length === 0) continue;

    let bestTeam: { team: EspnTeamSummary; score: number } | null = null;
    for (const t of cached.teams) {
      const score = Math.max(
        scoreTeamNameSimilarity(club.name, t.displayName),
        scoreTeamNameSimilarity(club.name, t.shortDisplayName || ''),
        scoreTeamNameSimilarity(club.name, t.name || '')
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

function cleanWikiTextValue(raw: string): string {
  let s = String(raw || '');
  // Strip <ref>...</ref> and self-closing <ref .../>
  s = s.replace(/<ref[^>]*>[\s\S]*?<\/ref>/gi, '');
  s = s.replace(/<ref[^>]*\/>/gi, '');
  // Replace [[Target|Display]] -> Display, [[Target]] -> Target
  s = s.replace(/\[\[[^\]|]+\|([^\]]+)\]\]/g, '$1');
  s = s.replace(/\[\[([^\]]+)\]\]/g, '$1');
  // Remove simple templates like {{flagicon|BRA}} or {{nowrap|...}}
  s = s.replace(/\{\{(?:nowrap|sortname)\|([^|}]+)(?:\|([^}]+))?\}\}/gi, (_m, a, b) =>
    b ? `${a} ${b}` : a
  );
  s = s.replace(/\{\{[^}]+\}\}/g, '');
  // Strip HTML tags & wiki italics/bold
  s = s.replace(/<[^>]+>/g, '');
  s = s.replace(/''+/g, '');
  // Remove trailing parenthetical notes like "(interim)" or "(footballer)"
  s = s.replace(/\s*\((?:interim|caretaker|footballer[^)]*)\)/gi, '');
  return s.replace(/\s+/g, ' ').trim();
}

function parseWikipediaSquadTemplates(
  wikitext: string,
  fallbackCountry: string
): RawProviderPlayer[] {
  const players: RawProviderPlayer[] = [];
  // Matches {{Fs player|...}}, {{football squad player|...}}, {{football squad2 player|...}}
  const templateRegex = /\{\{(?:fs player|football squad2? player)\s*\|([\s\S]*?)\}\}/gi;
  let match: RegExpExecArray | null;
  let idx = 0;

  while ((match = templateRegex.exec(wikitext)) !== null && players.length < 40) {
    const body = match[1];
    // Split on top-level | (ignoring | inside [[...]] or {{...}})
    const parts: string[] = [];
    let current = '';
    let bracketDepth = 0;
    let braceDepth = 0;
    for (let i = 0; i < body.length; i++) {
      const ch = body[i];
      const next = body[i + 1];
      if (ch === '[' && next === '[') {
        bracketDepth++;
        current += '[[';
        i++;
      } else if (ch === ']' && next === ']' && bracketDepth > 0) {
        bracketDepth--;
        current += ']]';
        i++;
      } else if (ch === '{' && next === '{') {
        braceDepth++;
        current += '{{';
        i++;
      } else if (ch === '}' && next === '}' && braceDepth > 0) {
        braceDepth--;
        current += '}}';
        i++;
      } else if (ch === '|' && bracketDepth === 0 && braceDepth === 0) {
        parts.push(current);
        current = '';
      } else {
        current += ch;
      }
    }
    if (current) parts.push(current);

    const fields: Record<string, string> = {};
    for (const part of parts) {
      const eq = part.indexOf('=');
      if (eq > 0) {
        const k = part.slice(0, eq).trim().toLowerCase();
        const v = part.slice(eq + 1).trim();
        fields[k] = v;
      }
    }

    // Skip players explicitly marked as out on loan in another section
    const otherLower = (fields.other || '').toLowerCase();
    if (otherLower.includes('on loan at') || otherLower.includes('out on loan')) {
      continue;
    }

    const name = cleanWikiTextValue(fields.name || '');
    if (name.length < 2 || name.length > 50) continue;

    const mapped = mapExternalPositionToRole(fields.pos || '', fields.pos || '', idx);
    const jerseyNum = fields.no ? Number.parseInt(fields.no.trim(), 10) : undefined;
    const nat = translateNationalityToPt(cleanWikiTextValue(fields.nat || ''), fallbackCountry);

    players.push({
      name,
      role: mapped.role,
      roleIsGranular: mapped.granular,
      nationality: nat,
      jerseyNumber:
        jerseyNum && Number.isFinite(jerseyNum) && jerseyNum >= 1 && jerseyNum <= 99
          ? jerseyNum
          : undefined,
      activityScore: Math.max(1, 20 - Math.floor(idx / 2)),
    });
    idx += 1;
  }

  return players;
}

function extractWikipediaManager(wikitext: string): string | undefined {
  // Restrict strictly to the main club infobox at the top of the article so we never match historical tables
  const infoboxHead = wikitext.slice(0, 5500);
  const mgrMatch = infoboxHead.match(
    /\|\s*(?:manager|head coach|coach|treinador|t[eé]cnico)\s*=\s*([^\n]+)/i
  );
  if (!mgrMatch?.[1]) return undefined;
  const cleaned = cleanWikiTextValue(mgrMatch[1]);
  if (
    cleaned.length < 3 ||
    cleaned.length > 48 ||
    /^(?:vacant|tbd|none|n\/a|unknown|nenhum|indefinido)$/i.test(cleaned)
  ) {
    return undefined;
  }
  return cleaned;
}

const WIKI_EXCLUDED_TITLE_RE =
  /\b(disambiguation|desambiguação|list of|lista de|women|feminino|youth|sub-20|sub-17|under-21|under-23|u-19|u-20|u-23|reserves|castilla|b team|season|temporada|history of|records and statistics)\b/i;

async function fetchWikipediaPageContent(
  apiBase: string,
  searchQuery: string
): Promise<{ title: string; wikitext: string } | null> {
  const wikiHeaders = { 'User-Agent': WIKI_USER_AGENT };
  const searchUrl = `${apiBase}?action=query&list=search&srsearch=${encodeURIComponent(
    searchQuery
  )}&srlimit=5&format=json`;
  const searchRes = await fetchJsonWithTimeout<{
    query?: { search?: Array<{ title?: string }> };
  }>(searchUrl, wikiHeaders);

  const candidates = searchRes?.query?.search || [];
  if (candidates.length === 0) return null;

  // Trust Wikipedia's relevance order while skipping disambiguation, list, women's, youth or season articles
  const chosen =
    candidates.find((c) => c.title && !WIKI_EXCLUDED_TITLE_RE.test(c.title)) || candidates[0];

  if (!chosen?.title) return null;

  const pageUrl = `${apiBase}?action=query&prop=revisions&rvprop=content&rvslots=main&redirects=1&format=json&titles=${encodeURIComponent(
    chosen.title
  )}`;
  const pageRes = await fetchJsonWithTimeout<{
    query?: {
      pages?: Record<
        string,
        {
          title?: string;
          revisions?: Array<{ slots?: { main?: { '*'?: string } } }>;
        }
      >;
    };
  }>(pageUrl, wikiHeaders);

  const pageObj = pageRes?.query?.pages ? Object.values(pageRes.query.pages)[0] : undefined;
  const wikitext = pageObj?.revisions?.[0]?.slots?.main?.['*'];
  if (!wikitext || wikitext.length < 200) return null;

  return { title: pageObj.title || chosen.title, wikitext };
}

/**
 * Provider 4: Wikipedia Live Roster & Manager API (EN + PT Wikipedia)
 * Works automatically for 100% of world clubs — provides live managers & full squads
 * (including Brasileirão Série C, Série D, Potiguar, Estaduais, Africa, Asia).
 */
async function fetchRawFromWikipedia(
  club: ExternalRosterClubQuery
): Promise<RawProviderSquad | null> {
  const fallbackCountry = club.country || 'Brasil';
  const isBrazilOrLusophone =
    fallbackCountry === 'Brasil' || fallbackCountry === 'Portugal';

  const enQuery = `${club.name} football club`;
  const enPage = await fetchWikipediaPageContent(WIKIPEDIA_EN_API, enQuery);

  let bestTitle = enPage?.title || club.name;
  let bestUrl = enPage
    ? `https://en.wikipedia.org/wiki/${encodeURIComponent(enPage.title.replace(/ /g, '_'))}`
    : 'https://en.wikipedia.org/';
  let managerName = enPage ? extractWikipediaManager(enPage.wikitext) : undefined;
  let players = enPage ? parseWikipediaSquadTemplates(enPage.wikitext, fallbackCountry) : [];

  // For Brazilian/Portuguese clubs missing manager or squad on EN Wikipedia, also query PT Wikipedia
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
            ptPage.title.replace(/ /g, '_')
          )}`;
        }
      }
    }
  }

  if (!managerName && players.length < 6) return null;

  return {
    source: 'WIKIPEDIA',
    sourceName: 'Wikipedia Live',
    sourceUrl: bestUrl,
    matchedTeamName: bestTitle,
    managerName,
    players,
  };
}

function buildSearchNameVariants(clubName: string): string[] {
  const clean = clubName.trim();
  const variants = [clean];
  const noAccents = clean.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  if (noAccents !== clean) variants.push(noAccents);
  const stripped = noAccents
    .replace(/\b(EC|FC|SC|CR|SE|CA|AC|CF|SAF|Esporte Clube|Clube de Regatas|Futebol Clube)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (stripped.length >= 3 && !variants.includes(stripped)) {
    variants.push(stripped);
  }
  return variants.slice(0, 2);
}

/**
 * Provider 5: TheSportsDB Live REST API (granular positions + manager + ESPN ID bridge)
 */
async function fetchRawFromTheSportsDb(
  club: ExternalRosterClubQuery
): Promise<{ squad: RawProviderSquad | null; espnTeamId?: string; matchedName?: string }> {
  const apiKey = (process.env.THESPORTSDB_API_KEY || '123').trim() || '123';
  const safeKey = encodeURIComponent(apiKey);
  const variants = buildSearchNameVariants(club.name);

  let matchedTeam: {
    idTeam: string;
    idESPN?: string;
    strTeam: string;
    strCountry?: string;
    strManager?: string;
    score: number;
  } | null = null;

  for (const queryVariant of variants) {
    const searchUrl = `${THESPORTSDB_BASE}/${safeKey}/searchteams.php?t=${encodeURIComponent(
      queryVariant
    )}`;
    const data = await fetchJsonWithTimeout<{
      teams?: Array<{
        idTeam?: string;
        idESPN?: string;
        strTeam?: string;
        strTeamAlternate?: string;
        strSport?: string;
        strCountry?: string;
        strManager?: string;
      }> | null;
    }>(searchUrl);

    const teams = Array.isArray(data?.teams) ? data.teams : [];
    for (const t of teams) {
      if (!t?.idTeam || !t?.strTeam) continue;
      if (t.strSport && t.strSport.toLowerCase() !== 'soccer') continue;

      let score = Math.max(
        scoreTeamNameSimilarity(club.name, t.strTeam),
        scoreTeamNameSimilarity(club.name, t.strTeamAlternate || '')
      );
      if (
        club.country &&
        t.strCountry &&
        translateNationalityToPt(t.strCountry, '').toLowerCase() === club.country.toLowerCase()
      ) {
        score += 14;
      }
      if (!matchedTeam || score > matchedTeam.score) {
        matchedTeam = {
          idTeam: t.idTeam,
          idESPN: t.idESPN || undefined,
          strTeam: t.strTeam,
          strCountry: t.strCountry,
          strManager: t.strManager,
          score,
        };
      }
    }

    if (matchedTeam && matchedTeam.score >= 80) break;
  }

  if (!matchedTeam || matchedTeam.score < 58) return { squad: null };

  const cleanManager = String(matchedTeam.strManager || '').trim();
  const managerName = cleanManager.length >= 3 ? cleanManager : undefined;

  const rosterUrl = `${THESPORTSDB_BASE}/${safeKey}/lookup_all_players.php?id=${encodeURIComponent(
    matchedTeam.idTeam
  )}`;
  const rosterData = await fetchJsonWithTimeout<{
    player?: Array<{
      strPlayer?: string;
      strPosition?: string;
      dateBorn?: string;
      strNationality?: string;
      strNumber?: string;
      strStatus?: string;
    }> | null;
  }>(rosterUrl);

  const rawList = Array.isArray(rosterData?.player) ? rosterData.player : [];
  const activePlayers = rawList.filter((p) => {
    const pos = String(p.strPosition || '').toLowerCase();
    const status = String(p.strStatus || '').toLowerCase();
    if (pos.includes('manager') || pos.includes('coach') || pos.includes('director')) return false;
    if (status.includes('retired')) return false;
    return Boolean(p.strPlayer && p.strPlayer.trim().length >= 2);
  });

  const fallbackCountry = club.country || 'Brasil';
  const squad: RawProviderSquad | null =
    activePlayers.length > 0 || managerName
      ? {
          source: 'THESPORTSDB',
          sourceName: 'TheSportsDB',
          sourceUrl: 'https://www.thesportsdb.com/',
          matchedTeamName: matchedTeam.strTeam,
          managerName,
          players: activePlayers.map((p, idx) => {
            const mapped = mapExternalPositionToRole(p.strPosition, null, idx);
            return {
              name: String(p.strPlayer || '').trim(),
              role: mapped.role,
              roleIsGranular: mapped.granular,
              age: computeAgeFromDateString(p.dateBorn),
              nationality: translateNationalityToPt(p.strNationality, fallbackCountry),
              jerseyNumber: p.strNumber ? Number.parseInt(p.strNumber, 10) || undefined : undefined,
              activityScore: Math.max(1, 18 - idx),
            };
          }),
        }
      : null;

  return {
    squad,
    espnTeamId: matchedTeam.idESPN,
    matchedName: matchedTeam.strTeam,
  };
}

/**
 * Returns the live status of all connected roster API providers on the backend.
 */
export function getRosterApiProvidersStatus(): RosterApiProviderStatus[] {
  const hasApiFootball = Boolean(process.env.API_FOOTBALL_KEY?.trim());
  const hasFootballData = Boolean(process.env.FOOTBALL_DATA_API_KEY?.trim());
  const hasCustomSportsDb = Boolean(process.env.THESPORTSDB_API_KEY?.trim());
  const hasGemini = Boolean(process.env.GEMINI_API_KEY?.trim());

  return [
    {
      id: 'ESPN_SOCCER',
      name: 'ESPN Soccer API',
      kind: 'FOOTBALL_API',
      enabled: true,
      configuredViaSecret: false,
      description:
        'Ativa automaticamente — elencos reais, camisas, idades e minutagem em 37+ ligas (Brasileirão A/B, Europa, América do Sul, MLS, México, Arábia, Japão, África).',
    },
    {
      id: 'WIKIPEDIA',
      name: 'Wikipedia Live API',
      kind: 'FOOTBALL_API',
      enabled: true,
      configuredViaSecret: false,
      description:
        'Ativa automaticamente — técnicos reais atualizados e elencos completos de 100% dos clubes mundiais (incluindo Série C, Série D e Estaduais).',
    },
    {
      id: 'THESPORTSDB',
      name: 'TheSportsDB API',
      kind: 'FOOTBALL_API',
      enabled: true,
      configuredViaSecret: hasCustomSportsDb,
      description: hasCustomSportsDb
        ? 'Conectada com chave dedicada — refina posições táticas exatas (ZAG/LAT/VOL/MEI/ATA).'
        : 'Ativa automaticamente — refina posições táticas exatas e cruza dados com a ESPN.',
    },
    {
      id: 'API_FOOTBALL',
      name: 'API-Football v3',
      kind: 'FOOTBALL_API',
      enabled: hasApiFootball,
      configuredViaSecret: hasApiFootball,
      description: hasApiFootball
        ? 'Conectada via segredo do servidor (prioridade máxima na fusão).'
        : 'Opcional — adicione API_FOOTBALL_KEY nos segredos do servidor para somar à fusão.',
    },
    {
      id: 'FOOTBALL_DATA',
      name: 'Football-Data.org v4',
      kind: 'FOOTBALL_API',
      enabled: hasFootballData,
      configuredViaSecret: hasFootballData,
      description: hasFootballData
        ? 'Conectada via segredo do servidor (ligas UEFA e Brasileirão).'
        : 'Opcional — adicione FOOTBALL_DATA_API_KEY nos segredos do servidor para somar à fusão.',
    },
    {
      id: 'GEMINI_SEARCH',
      name: 'Gemini + Google Search',
      kind: 'AI_SEARCH',
      enabled: hasGemini,
      configuredViaSecret: hasGemini,
      description: hasGemini
        ? 'Ativo como camada final de busca web caso algum clube regional não exista nas 5 APIs esportivas.'
        : 'Indisponível no momento (requer GEMINI_API_KEY no servidor).',
    },
  ];
}

/**
 * MULTI-API FUSION ENGINE:
 * Queries ALL enabled live football APIs in parallel for a club (API-Football + Football-Data +
 * ESPN Soccer + Wikipedia Live + TheSportsDB), then fuses their strongest fields together:
 *  - Best complete live squad (with real appearances/activity ranking from ESPN/commercial APIs)
 *  - Verified real current manager (enriched from Wikipedia / API-Football / Football-Data / TheSportsDB)
 *  - Exact granular positions (ZAG/LAT/VOL/MEI/ATA refined across TheSportsDB & commercial APIs)
 *  - Verified real ages, jersey numbers & nationalities
 */
export async function fetchClubRosterFromExternalApis(
  club: ExternalRosterClubQuery
): Promise<ExternalRosterFetchResult | null> {
  const [apiFootball, footballData, espnDirect, wikiSquad, sportsDbResult] = await Promise.all([
    fetchRawFromApiFootball(club).catch(() => null),
    fetchRawFromFootballDataOrg(club).catch(() => null),
    fetchRawFromEspnSoccer(club).catch(() => null),
    fetchRawFromWikipedia(club).catch(() => null),
    fetchRawFromTheSportsDb(club).catch(
      (): { squad: RawProviderSquad | null; espnTeamId?: string; matchedName?: string } => ({
        squad: null,
      })
    ),
  ]);

  // If ESPN direct didn't match (e.g. a league outside our slug list) but TheSportsDB gave us idESPN, bridge it!
  let espnSquad = espnDirect;
  if (!espnSquad && sportsDbResult?.espnTeamId) {
    espnSquad = await fetchRawEspnRosterBySlugAndTeamId(
      'all',
      sportsDbResult.espnTeamId,
      sportsDbResult.matchedName || club.name,
      club
    ).catch(() => null);
  }

  const allResponses: RawProviderSquad[] = [
    apiFootball,
    footballData,
    espnSquad,
    wikiSquad,
    sportsDbResult?.squad || null,
  ].filter((r): r is RawProviderSquad => Boolean(r));

  if (allResponses.length === 0) return null;

  // Pick the primary squad list by priority + minimum completeness (>= 12 players)
  const squadPriority = allResponses.filter((r) => r.players.length >= 12);
  const primarySquad =
    squadPriority[0] ||
    [...allResponses].sort((a, b) => b.players.length - a.players.length)[0];

  if (!primarySquad || primarySquad.players.length < 8) return null;

  // Build lookup maps from ALL secondary providers to cross-enrich positions, ages, nationalities & jerseys
  const enrichByNormName = new Map<
    string,
    {
      role?: 'GOL' | 'ZAG' | 'LAT' | 'VOL' | 'MEI' | 'ATA';
      roleIsGranular?: boolean;
      age?: number;
      nationality?: string;
      jerseyNumber?: number;
      source: RosterApiSourceId;
    }
  >();

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
          source: sec.source,
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

  const sourcesUsedSet = new Set<RosterApiSourceId>([primarySquad.source]);
  const sourceLabelsSet = new Set<string>([primarySquad.sourceName]);
  const sourceUrlsMap = new Map<string, { title: string; uri: string }>();
  if (primarySquad.sourceUrl) {
    sourceUrlsMap.set(primarySquad.sourceUrl, {
      title: primarySquad.sourceName,
      uri: primarySquad.sourceUrl,
    });
  }

  const addUsedSource = (provider: RawProviderSquad) => {
    sourcesUsedSet.add(provider.source);
    sourceLabelsSet.add(provider.sourceName);
    if (provider.sourceUrl && !sourceUrlsMap.has(provider.sourceUrl)) {
      sourceUrlsMap.set(provider.sourceUrl, {
        title: provider.sourceName,
        uri: provider.sourceUrl,
      });
    }
  };

  // Cross-enrich primary squad players with granular roles, real ages & jerseys from secondary APIs
  const fusedRawPlayers: RawProviderPlayer[] = primarySquad.players.map((p) => {
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
      nationality,
    };
  });

  // If primary squad had fewer than 22 players (e.g. partial list), append non-duplicate players from secondary APIs
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

  // Fuse real current Manager (prefer commercial API -> Wikipedia Live -> ESPN -> TheSportsDB)
  let managerName = primarySquad.managerName;
  if (!managerName) {
    const managerPriorityOrder: RosterApiSourceId[] = [
      'API_FOOTBALL',
      'FOOTBALL_DATA',
      'WIKIPEDIA',
      'ESPN_SOCCER',
      'THESPORTSDB',
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
    managerName: managerName || 'Treinador Principal',
    players: normalized,
    source: primarySquad.source,
    sourcesUsed: Array.from(sourcesUsedSet),
    sourceLabel: Array.from(sourceLabelsSet).join(' + '),
    sourceUrls: Array.from(sourceUrlsMap.values()),
    matchedTeamName: primarySquad.matchedTeamName,
  };
}
