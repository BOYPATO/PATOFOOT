import soccerWikiRaw from '../../public/assets/aistudio/SoccerWiki_2026-11-02_-_Brasil_1793621877_70461a65.json';
import { Club, GameSave, Player } from '../types/game';

export const CURRENT_SOCCERWIKI_BRASIL_VERSION = 1;

export interface SoccerWikiPlayerEntry {
  ID: number;
  Forename: string;
  Surname: string;
  ImageURL: string;
}

export interface SoccerWikiClubEntry {
  ID: number;
  Name: string;
  ShortName: string;
  ImageURL: string;
}

export interface SoccerWikiCompEntry {
  ID: number;
  Name: string;
  ImageURL: string;
}

export interface SoccerWikiStadiumEntry {
  ID: number;
  Name: string;
}

export interface SoccerWikiManagerEntry {
  ID: number;
  Forename: string;
  Surname: string;
  ImageURL: string;
}

export interface SoccerWikiInternationalEntry {
  ID: string;
  Name: string;
  ShortName: string;
  ImageURL: string;
}

export interface SoccerWikiPlayerImageExtra {
  ImageActionURL?: string;
  ImagePeakURL?: string;
  ImageYouthURL?: string;
  ImageActionPeakURL?: string;
}

interface SoccerWikiPack {
  PlayerData: SoccerWikiPlayerEntry[];
  ClubData: SoccerWikiClubEntry[];
  LeagueData: SoccerWikiCompEntry[];
  CupData: SoccerWikiCompEntry[];
  StadiumData: SoccerWikiStadiumEntry[];
  ManagerData: SoccerWikiManagerEntry[];
  InternationalData: SoccerWikiInternationalEntry[];
  PlayerImages?: Record<string, SoccerWikiPlayerImageExtra>;
}

const pack = soccerWikiRaw as unknown as SoccerWikiPack;

export const SOCCERWIKI_BRASIL_SUMMARY = {
  playersCount: pack.PlayerData?.length || 0,
  clubsCount: pack.ClubData?.length || 0,
  leaguesCount: pack.LeagueData?.length || 0,
  cupsCount: pack.CupData?.length || 0,
  stadiumsCount: pack.StadiumData?.length || 0,
  managersCount: pack.ManagerData?.length || 0,
};

export const SOCCERWIKI_COMPETITION_LOGOS: Record<string, string> = {
  serie_a: 'https://cdn.soccerwiki.org/images/logos/leagues/14.png',
  serie_b: 'https://cdn.soccerwiki.org/images/logos/leagues/15.png',
  serie_c: 'https://cdn.soccerwiki.org/images/logos/leagues/151.png',
  serie_d: 'https://cdn.soccerwiki.org/images/logos/leagues/181.png',
  copa_brasil: 'https://cdn.soccerwiki.org/images/logos/cups/9.png',
  estadual: 'https://cdn.soccerwiki.org/images/logos/cups/203.jpg',
};

export const SOCCERWIKI_BRAZIL_NT_LOGO =
  pack.InternationalData?.find((it) => it.ID === 'BRA')?.ImageURL ||
  'https://cdn.soccerwiki.org/images/international/BRA.png';

/**
 * Mapeamento 100% verificado dos 156 clubes brasileiros (Séries A, B, C e D)
 * para seus IDs oficiais no pacote SoccerWiki Brasil.
 */
export const CLUB_ID_TO_SOCCERWIKI_ID: Record<string, number> = {
  // Série A (20)
  fla: 294,
  pal: 300,
  sao: 306,
  cor: 290,
  bot: 288,
  cam: 286,
  cru: 292,
  gre: 602,
  int: 298,
  flu: 295,
  vas: 307,
  bah: 1473,
  cap: 287,
  san: 304,
  rbb: 1447,
  vit: 1237,
  cfc: 291,
  cha: 2379,
  rem: 2476,
  mir: 2813,

  // Série B (20)
  for: 296,
  cea: 1458,
  spo: 923,
  juv: 299,
  ame: 1614,
  goi: 297,
  cui: 2416,
  cri: 1772,
  acg: 1581,
  ava: 1414,
  vil: 1457,
  nov: 3481,
  ope: 2848,
  crb: 2015,
  pon: 303,
  nau: 922,
  lon: 2881,
  sbe: 3122,
  ath: 6341,
  bsp: 2802,

  // Série C (20)
  ama: 6065,
  ana: 3075,
  bar: 4509,
  bpb: 3017,
  bru: 4483,
  cax: 2014,
  con: 3506,
  afe: 3426,
  fig: 293,
  flo: 5581,
  gua: 1515,
  lim: 3245,
  ita: 3487,
  itu: 2455,
  mar: 7039,
  mga: 3523,
  pay: 302,
  stc: 603,
  vre: 2475,
  ypi: 2850,

  // Série D (96)
  tun: 4768,
  agm: 2216,
  cmt: 3505,
  cst: 3848,
  bpa: 3509,
  sfp: 3771,
  ipa: 3844,
  tap: 3499,
  srs: 3718,
  cpo: 5077,
  man: 5536,
  nam: 2424,
  srr: 3795,
  pve: 3777,
  rba: 3038,
  toc: 3793,
  sam: 2395,
  alt: 4758,
  fer: 3032,
  igu: 3498,
  abc: 1785,
  arn: 924,
  trz: 2444,
  sou: 4763,
  cmp: 2396,
  csa: 2814,
  asa: 1645,
  ser: 4764,
  ret: 5833,
  cen: 2797,
  pet: 3794,
  mgy: 7117,
  afo: 3532,
  sal: 2013,
  dec: 3086,
  jua: 3067,
  jac: 4341,
  aal: 3511,
  bfe: 4794,
  jeq: 3479,
  bil: 3257,
  pba: 5595,
  vco: 3040,
  luv: 2494,
  mix: 2537,
  bsb: 289,
  gam: 3485,
  cei: 3492,
  oms: 3772,
  rbr: 4792,
  des: 5974,
  apa: 2620,
  gna: 3493,
  gtb: 4793,
  cra: 2446,
  anp: 3249,
  jat: 2490,
  inh: 3842,
  abe: 3074,
  tom: 3005,
  pou: 5513,
  ube: 4485,
  vnm: 3438,
  dgv: 4791,
  bet: 6664,
  itb: 6928,
  urt: 3776,
  nig: 2614,
  prj: 4288,
  mad: 2378,
  boa: 3018,
  ban: 2815,
  mrc: 7119,
  srj: 5056,
  por: 1232,
  ags: 3503,
  prc: 301,
  cas: 4364,
  cia: 3064,
  azu: 5973,
  sjs: 6461,
  and: 5067,
  rbp: 3497,
  joi: 2063,
  mdi: 2936,
  hlu: 5772,
  ccd: 3967,
  cvg: 3414,
  sca: 3036,
  bpe: 2478,
  sjr: 3502,
  ave: 3672,
  pel: 3059,
  nha: 3246,
  mon: 3251,
  gba: 3500,
};

function normKey(value: string): string {
  return (value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const LOWERCASE_PARTICLES = new Set(['da', 'de', 'do', 'das', 'dos', 'e']);

function titleCasePortuguese(raw: string): string {
  const cleaned = (raw || '').trim().replace(/\s+/g, ' ');
  if (!cleaned) return '';
  return cleaned
    .split(' ')
    .map((word, idx) => {
      if (!word) return '';
      if (word.includes('-')) {
        return word
          .split('-')
          .map((sub) =>
            sub.length <= 2 && sub === sub.toUpperCase() && idx > 0
              ? sub.toUpperCase()
              : sub.charAt(0).toLocaleUpperCase('pt-BR') + sub.slice(1).toLocaleLowerCase('pt-BR')
          )
          .join('-');
      }
      const lower = word.toLocaleLowerCase('pt-BR');
      if (idx > 0 && LOWERCASE_PARTICLES.has(lower)) {
        return lower;
      }
      return lower.charAt(0).toLocaleUpperCase('pt-BR') + lower.slice(1);
    })
    .join(' ');
}

const COMMON_FAMILY_SURNAMES = new Set([
  'silva',
  'da silva',
  'santos',
  'dos santos',
  'souza',
  'de souza',
  'sousa',
  'de sousa',
  'oliveira',
  'de oliveira',
  'pereira',
  'lima',
  'de lima',
  'ferreira',
  'costa',
  'da costa',
  'rodrigues',
  'almeida',
  'de almeida',
  'nascimento',
  'alves',
  'araujo',
  'de araujo',
  'ribeiro',
  'carvalho',
  'de carvalho',
  'gomes',
  'martins',
  'rocha',
  'da rocha',
  'barbosa',
  'barros',
  'freitas',
  'de freitas',
  'moreira',
  'cardoso',
  'teixeira',
  'correia',
  'mendes',
  'vieira',
  'monteiro',
  'melo',
  'de melo',
  'campos',
  'ramos',
  'reis',
  'dos reis',
  'dias',
  'castro',
  'de castro',
  'machado',
  'fernandes',
  'lopes',
  'marques',
  'borges',
  'medeiros',
  'goncalves',
  'batista',
  'miranda',
  'soares',
  'moura',
  'cavalcanti',
  'andrade',
  'de andrade',
  'azevedo',
  'duarte',
  'fonseca',
  'guimaraes',
  'macedo',
  'matos',
  'morais',
  'moraes',
  'neves',
  'nogueira',
  'pinto',
  'pires',
  'queiroz',
  'siqueira',
  'tavares',
  'vargas',
  'xavier',
  'bonfim',
  'conserva',
  'emboaba',
  'alcantara',
  'murara',
  'loureiro',
  'lourenco',
  'arruda',
  'bacelar',
  'torres',
  'fraga',
  'domingues',
  'dornellas',
  'calixto',
  'cirino',
  'farias',
  'avila',
  'barcellos',
  'signorini',
  'rechel',
  'burgel',
  'filho',
]);

export function formatSoccerWikiPlayerDisplayName(entry: SoccerWikiPlayerEntry): string {
  const fore = entry.Forename.trim();
  const surTitled = titleCasePortuguese(entry.Surname);
  if (!fore) return surTitled;
  if (!surTitled) return fore;

  const normFore = normKey(fore);
  const normSur = normKey(surTitled);

  if (normFore === normSur) return surTitled;

  if (normFore === 'junior' || normFore === 'neto') {
    if (normSur.endsWith('inho') || normSur.endsWith('ao')) {
      return surTitled;
    }
    return `${fore} ${surTitled}`;
  }

  if (COMMON_FAMILY_SURNAMES.has(normFore)) {
    return `${surTitled} ${titleCasePortuguese(fore)}`;
  }

  return `${fore} ${surTitled}`;
}

export interface ResolvedPlayerMedia {
  soccerWikiId: number;
  photoUrl?: string;
  actionPhotoUrl?: string;
}

export interface PickedSoccerWikiPlayer {
  name: string;
  soccerWikiId: number;
  photoUrl?: string;
  actionPhotoUrl?: string;
}

let clubByIdMap: Map<number, SoccerWikiClubEntry> | null = null;
let clubByNameMap: Map<string, SoccerWikiClubEntry> | null = null;

function ensureClubIndex() {
  if (clubByIdMap && clubByNameMap) return;
  clubByIdMap = new Map<number, SoccerWikiClubEntry>();
  clubByNameMap = new Map<string, SoccerWikiClubEntry>();
  for (const club of pack.ClubData || []) {
    clubByIdMap.set(club.ID, club);
    if (club.Name) clubByNameMap.set(normKey(club.Name), club);
    if (club.ShortName) clubByNameMap.set(normKey(club.ShortName), club);
  }
}

export function resolveSoccerWikiClubData(
  clubId: string,
  clubName?: string,
  shortName?: string
): { soccerWikiId: number; logoUrl?: string; officialName: string; officialShortName: string } | null {
  ensureClubIndex();
  const explicitId = CLUB_ID_TO_SOCCERWIKI_ID[clubId];
  let matched = explicitId ? clubByIdMap!.get(explicitId) : undefined;
  if (!matched && clubName) {
    matched = clubByNameMap!.get(normKey(clubName));
  }
  if (!matched && shortName) {
    matched = clubByNameMap!.get(normKey(shortName));
  }
  if (!matched) return null;
  return {
    soccerWikiId: matched.ID,
    logoUrl: matched.ImageURL && matched.ImageURL.trim() ? matched.ImageURL.trim() : undefined,
    officialName: matched.Name,
    officialShortName: matched.ShortName,
  };
}

let managerPhotoMap: Map<string, { id: number; photoUrl?: string }> | null = null;

function ensureManagerIndex() {
  if (managerPhotoMap) return;
  managerPhotoMap = new Map<string, { id: number; photoUrl?: string }>();

  const put = (key: string, entry: SoccerWikiManagerEntry) => {
    if (!key) return;
    const prev = managerPhotoMap!.get(key);
    const hasImg = Boolean(entry.ImageURL && entry.ImageURL.trim());
    if (!prev || (!prev.photoUrl && hasImg)) {
      managerPhotoMap!.set(key, {
        id: entry.ID,
        photoUrl: hasImg ? entry.ImageURL.trim() : undefined,
      });
    }
  };

  for (const m of pack.ManagerData || []) {
    const fore = (m.Forename || '').trim();
    const sur = (m.Surname || '').trim();
    put(normKey(`${fore} ${sur}`), m);
    put(normKey(`${sur} ${fore}`), m);
    if (sur.length >= 4) {
      put(normKey(sur), m);
    }
  }
}

export function resolveSoccerWikiManagerPhoto(
  managerName?: string
): { soccerWikiId: number; photoUrl?: string } | null {
  if (!managerName) return null;
  ensureManagerIndex();
  const hit = managerPhotoMap!.get(normKey(managerName));
  if (hit) {
    return { soccerWikiId: hit.id, photoUrl: hit.photoUrl };
  }
  // Fallback to player database for recently retired player-coaches (ex: Filipe Luís)
  const asPlayer = resolveSoccerWikiPlayerMedia(managerName, 'Brasil');
  if (asPlayer?.photoUrl) {
    return { soccerWikiId: asPlayer.soccerWikiId, photoUrl: asPlayer.photoUrl };
  }
  return null;
}

let exactPlayerMap: Map<string, SoccerWikiPlayerEntry> | null = null;
let mononymPlayerMap: Map<string, SoccerWikiPlayerEntry> | null = null;
let fillerPoolWithPhotos: PickedSoccerWikiPlayer[] | null = null;
let fillerPoolAll: PickedSoccerWikiPlayer[] | null = null;
const reservedSeededPlayerKeys = new Set<string>();

function resolveActionPhotoUrl(playerId: number): string | undefined {
  const extra = pack.PlayerImages?.[String(playerId)];
  const rel = extra?.ImageActionURL || extra?.ImageActionPeakURL;
  if (!rel || !rel.trim()) return undefined;
  return rel.startsWith('http')
    ? rel.trim()
    : `https://cdn.soccerwiki.org/images/player/${rel.trim()}`;
}

function preferBetterPlayerEntry(
  existing: SoccerWikiPlayerEntry | undefined,
  candidate: SoccerWikiPlayerEntry
): SoccerWikiPlayerEntry {
  if (!existing) return candidate;
  const existingHasImg = Boolean(existing.ImageURL && existing.ImageURL.trim());
  const candidateHasImg = Boolean(candidate.ImageURL && candidate.ImageURL.trim());
  if (!existingHasImg && candidateHasImg) return candidate;
  if (existingHasImg && !candidateHasImg) return existing;
  // Prefer more recent / active modern Brazilian player IDs when both have photos
  return candidate.ID > existing.ID ? candidate : existing;
}

function ensurePlayerIndex() {
  if (exactPlayerMap && mononymPlayerMap && fillerPoolWithPhotos && fillerPoolAll) return;

  exactPlayerMap = new Map<string, SoccerWikiPlayerEntry>();
  mononymPlayerMap = new Map<string, SoccerWikiPlayerEntry>();
  const withPhotoList: PickedSoccerWikiPlayer[] = [];
  const withoutPhotoList: PickedSoccerWikiPlayer[] = [];
  const seenDisplayKeys = new Set<string>();

  for (const p of pack.PlayerData || []) {
    const fore = (p.Forename || '').trim();
    const sur = (p.Surname || '').trim();
    const fullA = normKey(`${fore} ${sur}`);
    const fullB = normKey(`${sur} ${fore}`);
    const display = formatSoccerWikiPlayerDisplayName(p);
    const displayKey = normKey(display);

    if (fullA) exactPlayerMap.set(fullA, preferBetterPlayerEntry(exactPlayerMap.get(fullA), p));
    if (fullB) exactPlayerMap.set(fullB, preferBetterPlayerEntry(exactPlayerMap.get(fullB), p));
    if (displayKey) {
      exactPlayerMap.set(displayKey, preferBetterPlayerEntry(exactPlayerMap.get(displayKey), p));
    }

    const surNorm = normKey(sur);
    if (surNorm && surNorm.length >= 4) {
      mononymPlayerMap.set(surNorm, preferBetterPlayerEntry(mononymPlayerMap.get(surNorm), p));
    }

    if (display && displayKey && !seenDisplayKeys.has(displayKey)) {
      seenDisplayKeys.add(displayKey);
      const photoUrl = p.ImageURL && p.ImageURL.trim() ? p.ImageURL.trim() : undefined;
      const item: PickedSoccerWikiPlayer = {
        name: display,
        soccerWikiId: p.ID,
        photoUrl,
        actionPhotoUrl: resolveActionPhotoUrl(p.ID),
      };
      if (photoUrl) {
        withPhotoList.push(item);
      } else {
        withoutPhotoList.push(item);
      }
    }
  }

  // Prioritize active/modern registrations (higher IDs first, interleaved deterministically)
  withPhotoList.sort((a, b) => b.soccerWikiId - a.soccerWikiId);
  withoutPhotoList.sort((a, b) => b.soccerWikiId - a.soccerWikiId);

  fillerPoolWithPhotos = withPhotoList;
  fillerPoolAll = [...withPhotoList, ...withoutPhotoList];
}

// Explicit aliases for well-known Brazilian stars whose Apelido differs slightly from Forename+Surname
const CURATED_PLAYER_NAME_ALIASES: Record<string, string[]> = {
  'lucas paqueta': ['paqueta', 'lucas tolentino'],
  'pedro': ['pedro guilherme', 'abreu pedro'],
  'vitao': ['vitor eduardo', 'matos vitao'],
  'leo ortiz': ['leonardo ortiz'],
  'leo pereira': ['leonardo pereira'],
  'ayrton lucas': ['ayrton dantas'],
  'luiz araujo': ['luiz araujo'],
  'samuel lino': ['samuel lino'],
  'bruno henrique': ['bruno henrique pinto', 'bruno henrique'],
  'evertton araujo': ['evertton', 'evertton araujo'],
  'emerson royal': ['emerson aparecido', 'emerson royal'],
  'carlos miguel': ['carlos miguel'],
  'khellven': ['khellven', 'douglas khellven'],
  'jefte': ['jefte', 'jefte vital'],
  'vitor roque': ['vitor roque'],
  'paulinho': ['paulo henrique sampaio', 'sampaio paulinho', 'paulinho'],
  'murilo': ['murilo cerqueira', 'cerqueira murilo'],
  'marlon freitas': ['marlon freitas'],
  'lucas evangelista': ['lucas evangelista'],
  'rafinha alcantara': ['alcantara rafinha', 'rafinha'],
  'estêvão': ['estevao', 'estevao willian'],
  'estevao': ['estevao willian'],
  'endrick': ['endrick felipe', 'sousa endrick'],
  'vinicius jr': ['vinicius junior', 'paixao vinicius'],
  'rodrygo': ['rodrygo goes', 'goes rodrygo'],
  'raphinha': ['dias raphinha', 'raphael belloli'],
  'alisson': ['alisson becker', 'becker alisson'],
  'ederson': ['ederson moraes', 'moraes ederson'],
  'marquinhos': ['aoas marquinhos', 'marcos aoas'],
  'gabriel magalhaes': ['gabriel magalhaes'],
  'bruno guimaraes': ['bruno guimaraes'],
};

export function registerReservedRealPlayerNames(names: Iterable<string>): void {
  for (const raw of names) {
    const k = normKey(raw);
    if (k) reservedSeededPlayerKeys.add(k);
  }
}

export function resolveSoccerWikiPlayerMedia(
  playerName: string,
  nationality?: string
): ResolvedPlayerMedia | null {
  if (!playerName) return null;
  if (nationality && nationality !== 'Brasil') return null;

  ensurePlayerIndex();
  const key = normKey(playerName);
  if (!key) return null;

  let hit = exactPlayerMap!.get(key);

  if (!hit && CURATED_PLAYER_NAME_ALIASES[key]) {
    for (const alt of CURATED_PLAYER_NAME_ALIASES[key]) {
      hit = exactPlayerMap!.get(normKey(alt)) || mononymPlayerMap!.get(normKey(alt));
      if (hit) break;
    }
  }

  if (!hit && !key.includes(' ') && key.length >= 4) {
    hit = mononymPlayerMap!.get(key);
  }

  if (!hit && key.includes(' ')) {
    const parts = key.split(' ');
    const firstLast = `${parts[0]} ${parts[parts.length - 1]}`;
    hit = exactPlayerMap!.get(firstLast);
  }

  if (!hit) return null;

  const photoUrl = hit.ImageURL && hit.ImageURL.trim() ? hit.ImageURL.trim() : undefined;
  return {
    soccerWikiId: hit.ID,
    photoUrl,
    actionPhotoUrl: resolveActionPhotoUrl(hit.ID),
  };
}

/**
 * Seleciona de forma determinística um jogador brasileiro real e com foto oficial
 * do banco SoccerWiki (evitando duplicatas no clube e evitando colisões com craques já escalados).
 */
export function pickSoccerWikiBrazilianPlayer(
  clubId: string,
  slotIdx: number,
  usedClubNames: Set<string>,
  globalUsedIds?: Set<number>
): PickedSoccerWikiPlayer {
  ensurePlayerIndex();
  const pool =
    fillerPoolWithPhotos && fillerPoolWithPhotos.length > 0
      ? fillerPoolWithPhotos
      : fillerPoolAll || [];

  if (pool.length === 0) {
    return { name: `Atleta ${slotIdx + 1}`, soccerWikiId: 0 };
  }

  const clubHash = clubId
    .split('')
    .reduce((acc, ch, idx) => (acc * 37 + ch.charCodeAt(0) * (idx + 5)) >>> 0, 17);

  // Skip the top 140 ultra-famous global superstars when filling lower-division squads
  const safePoolStart = Math.min(140, Math.floor(pool.length * 0.04));
  const usableSpan = Math.max(1, pool.length - safePoolStart);
  const startOffset = (clubHash * 29 + slotIdx * 97) % usableSpan;

  for (let step = 0; step < usableSpan; step++) {
    const candidate = pool[safePoolStart + ((startOffset + step) % usableSpan)];
    const lower = candidate.name.toLowerCase();
    const norm = normKey(candidate.name);
    if (usedClubNames.has(lower)) continue;
    if (reservedSeededPlayerKeys.has(norm)) continue;
    if (globalUsedIds && globalUsedIds.has(candidate.soccerWikiId)) continue;
    if (globalUsedIds) globalUsedIds.add(candidate.soccerWikiId);
    return candidate;
  }

  const fallback = pool[(clubHash + slotIdx) % pool.length];
  return fallback;
}

export function enrichPlayerWithSoccerWikiMedia(
  player: Player,
  fallbackCountry: string = 'Brasil'
): Player {
  const nat = player.nationality || fallbackCountry;
  if (nat !== 'Brasil') return player;
  if (player.photoUrl && player.soccerWikiId) return player;

  const media = resolveSoccerWikiPlayerMedia(player.name, 'Brasil');
  if (!media) return player;

  return {
    ...player,
    soccerWikiId: player.soccerWikiId ?? media.soccerWikiId,
    photoUrl: player.photoUrl || media.photoUrl,
    actionPhotoUrl: player.actionPhotoUrl || media.actionPhotoUrl,
  };
}

export function enrichClubWithSoccerWikiBrasil(club: Club): Club {
  const isBrazil = (club.country || 'Brasil') === 'Brasil';
  const resolvedClub = isBrazil
    ? resolveSoccerWikiClubData(club.id, club.name, club.shortName)
    : null;
  const resolvedMgr = isBrazil ? resolveSoccerWikiManagerPhoto(club.managerName) : null;

  const enrichedSquad = (club.squad || []).map((p) =>
    enrichPlayerWithSoccerWikiMedia(p, club.country || 'Brasil')
  );

  return {
    ...club,
    soccerWikiId: club.soccerWikiId ?? resolvedClub?.soccerWikiId,
    logoUrl: club.logoUrl || resolvedClub?.logoUrl,
    managerPhotoUrl: club.managerPhotoUrl || resolvedMgr?.photoUrl,
    squad: enrichedSquad,
  };
}

/**
 * Atualiza saves existentes com o pacote oficial SoccerWiki Brasil:
 * - Escudos oficiais (156/156 clubes das Séries A, B, C e D)
 * - Identidades atualizadas de clubes regionais da Série D (preservando IDs de 3 letras e progresso do usuário)
 * - Retratos oficiais de atletas brasileiros e técnicos
 * - Substituição de nomes genéricos antigos (_gen_ / _depth_) em clubes brasileiros da CPU por atletas reais do SoccerWiki
 *   (preservando 100% dos elencos curados de Flamengo e Palmeiras e do clube do usuário!)
 */
export function upgradeSaveWithSoccerWikiBrasil(
  save: GameSave,
  freshClubsById: Map<string, Club>
): GameSave {
  const needsFullSquadUpgrade =
    (save.soccerWikiBrasilVersion ?? 0) < CURRENT_SOCCERWIKI_BRASIL_VERSION;

  const globalUsedIds = new Set<number>();
  for (const c of save.clubs || []) {
    for (const p of c.squad || []) {
      registerReservedRealPlayerNames([p.name]);
      if (p.soccerWikiId) globalUsedIds.add(p.soccerWikiId);
    }
  }

  const upgradedClubs = (save.clubs || []).map((club) => {
    const isBrazil = (club.country || 'Brasil') === 'Brasil';
    if (!isBrazil) {
      return {
        ...club,
        squad: (club.squad || []).map((p) =>
          enrichPlayerWithSoccerWikiMedia(p, club.country || 'Estrangeiro')
        ),
      };
    }

    const template = freshClubsById.get(club.id);
    const isUserClub = club.id === save.userClubId || club.isUser;

    // Update Série D regional club identity if migrated in SoccerWiki pack (never overwrite user's chosen club name if user is playing it, except crest!)
    const updatedBase: Club =
      needsFullSquadUpgrade && !isUserClub && club.division === 'D' && template
        ? {
            ...club,
            name: template.name,
            shortName: template.shortName,
            initials: template.initials,
            state: template.state,
            colors: template.colors,
            stadium: {
              ...club.stadium,
              name: template.stadium.name,
            },
            logoUrl: template.logoUrl || club.logoUrl,
            soccerWikiId: template.soccerWikiId ?? club.soccerWikiId,
          }
        : club;

    let nextSquad = updatedBase.squad || [];

    // Replace legacy synthetic _gen_ / _depth_ filler players on non-user Brazilian CPU clubs with real SoccerWiki players
    if (
      needsFullSquadUpgrade &&
      !isUserClub &&
      club.id !== 'fla' &&
      club.id !== 'pal' &&
      club.id !== 'abc' &&
      club.id !== 'arn' &&
      !club.id.startsWith('rn_')
    ) {
      const usedClubNames = new Set<string>(
        nextSquad
          .filter((p) => !p.id.includes('_gen_') && !p.id.includes('_depth_'))
          .map((p) => p.name.toLowerCase())
      );

      nextSquad = nextSquad.map((p, idx) => {
        const isLegacyFiller = p.id.includes('_gen_') || p.id.includes('_depth_');
        if (!isLegacyFiller || (p.nationality && p.nationality !== 'Brasil')) {
          usedClubNames.add(p.name.toLowerCase());
          return enrichPlayerWithSoccerWikiMedia(p, 'Brasil');
        }
        const picked = pickSoccerWikiBrazilianPlayer(
          club.id,
          idx,
          usedClubNames,
          globalUsedIds
        );
        usedClubNames.add(picked.name.toLowerCase());
        return {
          ...p,
          name: picked.name,
          nationality: 'Brasil',
          soccerWikiId: picked.soccerWikiId || p.soccerWikiId,
          photoUrl: picked.photoUrl || p.photoUrl,
          actionPhotoUrl: picked.actionPhotoUrl || p.actionPhotoUrl,
        };
      });
    }

    return enrichClubWithSoccerWikiBrasil({
      ...updatedBase,
      squad: nextSquad,
    });
  });

  const upgradedMarket = (save.transferMarket || []).map((p) =>
    enrichPlayerWithSoccerWikiMedia(p, p.nationality || 'Brasil')
  );

  return {
    ...save,
    soccerWikiBrasilVersion: CURRENT_SOCCERWIKI_BRASIL_VERSION,
    clubs: upgradedClubs,
    transferMarket: upgradedMarket,
  };
}
