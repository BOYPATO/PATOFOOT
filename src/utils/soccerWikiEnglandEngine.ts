import soccerWikiEnglandRaw from '../data/soccerWikiInglaterra.json';
import { Club, GameSave, Player } from '../types/game';
import {
  PickedSoccerWikiPlayer,
  ResolvedPlayerMedia,
  SoccerWikiClubEntry,
  SoccerWikiCompEntry,
  SoccerWikiInternationalEntry,
  SoccerWikiManagerEntry,
  SoccerWikiPlayerEntry,
  SoccerWikiPlayerImageExtra,
  SoccerWikiStadiumEntry,
} from './soccerWikiBrazilEngine';

export const CURRENT_SOCCERWIKI_ENGLAND_VERSION = 1;

interface SoccerWikiEnglandPack {
  PlayerData: SoccerWikiPlayerEntry[];
  ClubData: SoccerWikiClubEntry[];
  LeagueData: SoccerWikiCompEntry[];
  CupData: SoccerWikiCompEntry[];
  StadiumData: SoccerWikiStadiumEntry[];
  ManagerData: SoccerWikiManagerEntry[];
  InternationalData: SoccerWikiInternationalEntry[];
  PlayerImages?: Record<string, SoccerWikiPlayerImageExtra>;
}

const pack = soccerWikiEnglandRaw as unknown as SoccerWikiEnglandPack;

export const SOCCERWIKI_ENGLAND_SUMMARY = {
  playersCount: pack.PlayerData?.length || 0,
  clubsCount: pack.ClubData?.length || 0,
  leaguesCount: pack.LeagueData?.length || 0,
  cupsCount: pack.CupData?.length || 0,
  stadiumsCount: pack.StadiumData?.length || 0,
  managersCount: pack.ManagerData?.length || 0,
};

export const SOCCERWIKI_ENGLAND_COMPETITION_LOGOS: Record<string, string> = {
  eng_premier: 'https://cdn.soccerwiki.org/images/logos/leagues/28.png',
  eng_championship: 'https://cdn.soccerwiki.org/images/logos/leagues/29.png',
  eng_league_one: 'https://cdn.soccerwiki.org/images/logos/leagues/30.png',
  eng_league_two: 'https://cdn.soccerwiki.org/images/logos/leagues/31.png',
  eng_national_league: 'https://cdn.soccerwiki.org/images/logos/leagues/32.png',
  fa_cup: 'https://cdn.soccerwiki.org/images/logos/cups/2.png',
  efl_cup: 'https://cdn.soccerwiki.org/images/logos/cups/3.png',
  efl_trophy: 'https://cdn.soccerwiki.org/images/logos/cups/8.jpg',
  community_shield: 'https://cdn.soccerwiki.org/images/logos/cups/106.png',
};

export const SOCCERWIKI_ENGLAND_NT_LOGO =
  pack.InternationalData?.find((it) => it.ID === 'ENG')?.ImageURL ||
  'https://cdn.soccerwiki.org/images/international/ENG.png';

/**
 * Mapeamento oficial verificado dos clubes da pirâmide inglesa
 * (Premier League, EFL Championship, EFL League One e EFL League Two)
 * para seus IDs oficiais no pacote SoccerWiki Inglaterra.
 */
export const ENGLAND_CLUB_ID_TO_SOCCERWIKI_ID: Record<string, number> = {
  // Premier League (20)
  eu_ars: 1, // Arsenal
  eu_liv: 44, // Liverpool
  eu_mci: 47, // Manchester City
  eu_che: 21, // Chelsea
  eu_new: 52, // Newcastle United
  eu_avl: 2, // Aston Villa
  eu_nfo: 55, // Nottingham Forest
  eu_bha: 12, // Brighton & Hove Albion
  eu_bou: 9, // AFC Bournemouth
  eu_bre: 11, // Brentford
  eu_ful: 32, // Fulham
  eu_cry: 27, // Crystal Palace
  eu_eve: 31, // Everton
  eu_whu: 85, // West Ham United
  eu_mun: 49, // Manchester United
  eu_wol: 88, // Wolverhampton Wanderers
  eu_tot: 80, // Tottenham Hotspur
  eu_lee: 40, // Leeds United
  eu_bur: 15, // Burnley
  eu_sun: 76, // Sunderland

  // EFL Championship (24)
  eu_lei: 41, // Leicester City
  eu_ips: 38, // Ipswich Town
  eu_sou: 72, // Southampton
  eu_shu: 70, // Sheffield United
  eu_cov: 25, // Coventry City
  eu_brc: 13, // Bristol City
  eu_rov: 5, // Blackburn Rovers
  eu_mil: 51, // Millwall
  eu_wba: 84, // West Bromwich Albion
  eu_mid: 50, // Middlesbrough
  eu_swa: 77, // Swansea City (EFL)
  eu_shw: 71, // Sheffield Wednesday
  eu_nor: 54, // Norwich City
  eu_wat: 83, // Watford
  eu_qpr: 64, // Queens Park Rangers
  eu_pom: 62, // Portsmouth
  eu_oxf: 58, // Oxford United
  eu_stk: 75, // Stoke City
  eu_der: 29, // Derby County
  eu_pne: 61, // Preston North End
  eu_hul: 37, // Hull City
  eu_bir: 4, // Birmingham City
  eu_wre: 89, // Wrexham AFC (EFL)
  eu_cha: 20, // Charlton Athletic

  // EFL League One (24)
  eu_lut: 45, // Luton Town
  eu_ply: 60, // Plymouth Argyle
  eu_car: 18, // Cardiff City (EFL)
  eu_ley: 42, // Leyton Orient
  eu_wyc: 90, // Wycombe Wanderers
  eu_sto: 74, // Stockport County
  eu_rea: 65, // Reading
  eu_bol: 7, // Bolton Wanderers
  eu_bla: 6, // Blackpool
  eu_hud: 36, // Huddersfield Town
  eu_lin: 43, // Lincoln City
  eu_bar: 3, // Barnsley
  eu_rot: 67, // Rotherham United
  eu_ste: 849, // Stevenage
  eu_wig: 86, // Wigan Athletic
  eu_exe: 840, // Exeter City
  eu_man: 48, // Mansfield Town
  eu_pet: 59, // Peterborough United
  eu_brt: 736, // Burton Albion
  eu_nta: 53, // Northampton Town
  eu_don: 30, // Doncaster Rovers
  eu_pva: 63, // Port Vale
  eu_bra_eng: 10, // Bradford City
  eu_wim: 1445, // AFC Wimbledon

  // EFL League Two (24)
  eu_cra: 838, // Crawley Town
  eu_brr: 14, // Bristol Rovers
  eu_cam: 17, // Cambridge United
  eu_shr: 487, // Shrewsbury Town
  eu_wal: 82, // Walsall
  eu_not: 56, // Notts County
  eu_chs: 23, // Chesterfield
  eu_gri: 34, // Grimsby Town
  eu_col: 24, // Colchester United
  eu_sal: 4077, // Salford City
  eu_cre: 26, // Crewe Alexandra
  eu_fle: 1604, // Fleetwood Town
  eu_bro: 3226, // Bromley FC
  eu_gil: 33, // Gillingham
  eu_har: 2859, // Harrogate Town
  eu_mkd: 87, // Milton Keynes Dons
  eu_tra: 81, // Tranmere Rovers
  eu_acc: 557, // Accrington Stanley
  eu_swi: 78, // Swindon Town
  eu_brw: 1326, // Barrow AFC
  eu_chl: 22, // Cheltenham Town
  eu_bnt: 614, // Barnet
  eu_old: 57, // Oldham Athletic
  eu_roc: 66, // Rochdale AFC
  eu_yor: 92, // York City
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

function normClubKey(value: string): string {
  return normKey(value)
    .replace(/\b(fc|afc)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function titleCaseBritishWord(word: string): string {
  if (!word) return '';
  if (word.includes('-')) {
    return word
      .split('-')
      .map((part) => titleCaseBritishWord(part))
      .join('-');
  }
  if (word.includes("'")) {
    const parts = word.split("'");
    if (parts.length === 2 && parts[0].length <= 2) {
      return (
        parts[0].charAt(0).toUpperCase() +
        parts[0].slice(1).toLowerCase() +
        "'" +
        titleCaseBritishWord(parts[1])
      );
    }
  }
  const lower = word.toLowerCase();
  if (lower === 'jr' || lower === 'jr.') return 'Jr.';
  if (lower.startsWith('mc') && lower.length > 3) {
    return 'Mc' + lower.charAt(2).toUpperCase() + lower.slice(3);
  }
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}

export function formatSoccerWikiEnglishPlayerName(entry: SoccerWikiPlayerEntry): string {
  const fore = (entry.Forename || '')
    .trim()
    .split(/\s+/)
    .map((w) => (w.length === 1 ? w.toUpperCase() : titleCaseBritishWord(w)))
    .join(' ');
  const sur = (entry.Surname || '')
    .trim()
    .split(/\s+/)
    .map((w) => titleCaseBritishWord(w))
    .join(' ');
  if (!fore) return sur;
  if (!sur) return fore;
  return `${fore} ${sur}`;
}

let clubByIdMap: Map<number, SoccerWikiClubEntry> | null = null;
let clubByNameMap: Map<string, SoccerWikiClubEntry> | null = null;

function ensureClubIndex() {
  if (clubByIdMap && clubByNameMap) return;
  clubByIdMap = new Map<number, SoccerWikiClubEntry>();
  clubByNameMap = new Map<string, SoccerWikiClubEntry>();
  for (const club of pack.ClubData || []) {
    clubByIdMap.set(club.ID, club);
    if (club.Name) {
      clubByNameMap.set(normKey(club.Name), club);
      clubByNameMap.set(normClubKey(club.Name), club);
    }
  }
}

export function isEnglishPyramidClub(club: Pick<Club, 'country' | 'europeanLeagueId'>): boolean {
  if (club.country === 'Inglaterra') return true;
  if (club.europeanLeagueId && club.europeanLeagueId.startsWith('eng_')) return true;
  return false;
}

export function resolveSoccerWikiEnglandClubData(
  clubId: string,
  clubName?: string,
  shortName?: string
): { soccerWikiId: number; logoUrl?: string; officialName?: string; officialShortName?: string } | null {
  ensureClubIndex();
  const explicitId = ENGLAND_CLUB_ID_TO_SOCCERWIKI_ID[clubId];
  let matched = explicitId ? clubByIdMap!.get(explicitId) : undefined;

  if (!matched && explicitId && (explicitId === 18 || explicitId === 77 || explicitId === 89)) {
    return {
      soccerWikiId: explicitId,
      logoUrl: `https://cdn.soccerwiki.org/images/logos/clubs/${explicitId}.png`,
    };
  }

  if (!matched && clubName) {
    matched = clubByNameMap!.get(normKey(clubName)) || clubByNameMap!.get(normClubKey(clubName));
  }
  if (!matched && shortName) {
    matched = clubByNameMap!.get(normKey(shortName)) || clubByNameMap!.get(normClubKey(shortName));
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
  }
}

export function resolveSoccerWikiEnglandManagerPhoto(
  managerName?: string
): { soccerWikiId: number; photoUrl?: string } | null {
  if (!managerName) return null;
  ensureManagerIndex();
  const hit = managerPhotoMap!.get(normKey(managerName));
  if (hit && hit.photoUrl) {
    return { soccerWikiId: hit.id, photoUrl: hit.photoUrl };
  }
  const asPlayer = resolveSoccerWikiEnglandPlayerMedia(managerName, 'Inglaterra');
  if (asPlayer?.photoUrl) {
    return { soccerWikiId: asPlayer.soccerWikiId, photoUrl: asPlayer.photoUrl };
  }
  if (hit) {
    return { soccerWikiId: hit.id, photoUrl: hit.photoUrl };
  }
  return null;
}

let exactPlayerMap: Map<string, SoccerWikiPlayerEntry> | null = null;
let fillerPoolWithPhotos: PickedSoccerWikiPlayer[] | null = null;
let fillerPoolAll: PickedSoccerWikiPlayer[] | null = null;
const reservedEnglandPlayerKeys = new Set<string>();

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
  return candidate.ID > existing.ID ? candidate : existing;
}

function ensurePlayerIndex() {
  if (exactPlayerMap && fillerPoolWithPhotos && fillerPoolAll) return;

  exactPlayerMap = new Map<string, SoccerWikiPlayerEntry>();
  const withPhotoList: PickedSoccerWikiPlayer[] = [];
  const withoutPhotoList: PickedSoccerWikiPlayer[] = [];
  const seenDisplayKeys = new Set<string>();

  for (const p of pack.PlayerData || []) {
    const fore = (p.Forename || '').trim();
    const sur = (p.Surname || '').trim();
    const fullA = normKey(`${fore} ${sur}`);
    const display = formatSoccerWikiEnglishPlayerName(p);
    const displayKey = normKey(display);

    if (fullA) exactPlayerMap.set(fullA, preferBetterPlayerEntry(exactPlayerMap.get(fullA), p));
    if (displayKey) {
      exactPlayerMap.set(displayKey, preferBetterPlayerEntry(exactPlayerMap.get(displayKey), p));
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

  // Prefer prime-age / modern EFL & Premier League players (IDs ~70,000–145,000 first, then rest)
  withPhotoList.sort((a, b) => {
    const aPrime = a.soccerWikiId >= 70000 && a.soccerWikiId <= 148000 ? 1 : 0;
    const bPrime = b.soccerWikiId >= 70000 && b.soccerWikiId <= 148000 ? 1 : 0;
    if (aPrime !== bPrime) return bPrime - aPrime;
    return b.soccerWikiId - a.soccerWikiId;
  });
  withoutPhotoList.sort((a, b) => b.soccerWikiId - a.soccerWikiId);

  fillerPoolWithPhotos = withPhotoList;
  fillerPoolAll = [...withPhotoList, ...withoutPhotoList];
}

const CURATED_ENGLAND_PLAYER_ALIASES: Record<string, string[]> = {
  'jamie bynoe gittens': ['jamie gittens'],
  'bynoe gittens': ['jamie gittens'],
  'emile smith rowe': ['emile smith rowe'],
  'trent alexander arnold': ['trent alexander arnold'],
  'marc guehi': ['marc guehi'],
  'tino livramento': ['tino livramento', 'valentino livramento'],
  'valentino livramento': ['tino livramento'],
  'jobe bellingham': ['jobe bellingham'],
  'jude bellingham': ['jude bellingham'],
  'samuel iling junior': ['samuel iling junior'],
  'iling junior': ['samuel iling junior'],
  'cj egan riley': ['c j egan riley'],
  'cj hamilton': ['c j hamilton'],
  'aj bridge': ['a j bridge'],
  'jj gabriel': ['j j gabriel'],
  'dj esdaille': ['d j esdaille'],
};

export function registerReservedEnglandPlayerNames(names: Iterable<string>): void {
  for (const raw of names) {
    const k = normKey(raw);
    if (k) reservedEnglandPlayerKeys.add(k);
  }
}

export function resolveSoccerWikiEnglandPlayerMedia(
  playerName: string,
  nationality?: string
): ResolvedPlayerMedia | null {
  if (!playerName) return null;
  if (nationality && nationality !== 'Inglaterra') return null;

  ensurePlayerIndex();
  const key = normKey(playerName);
  if (!key) return null;

  let hit = exactPlayerMap!.get(key);

  if (!hit && CURATED_ENGLAND_PLAYER_ALIASES[key]) {
    for (const alt of CURATED_ENGLAND_PLAYER_ALIASES[key]) {
      hit = exactPlayerMap!.get(normKey(alt));
      if (hit) break;
    }
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
 * Seleciona de forma determinística um jogador inglês real e com retrato oficial
 * do banco SoccerWiki Inglaterra para compor os elencos da Premier League,
 * Championship, League One e League Two sem duplicatas entre clubes.
 */
export function pickSoccerWikiEnglishPlayer(
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
    return { name: `Player ${slotIdx + 1}`, soccerWikiId: 0 };
  }

  const clubHash = clubId
    .split('')
    .reduce((acc, ch, idx) => (acc * 41 + ch.charCodeAt(0) * (idx + 7)) >>> 0, 23);

  const usableSpan = pool.length;
  const startOffset = (clubHash * 31 + slotIdx * 89) % usableSpan;

  for (let step = 0; step < usableSpan; step++) {
    const candidate = pool[(startOffset + step) % usableSpan];
    const lower = candidate.name.toLowerCase();
    const norm = normKey(candidate.name);
    if (usedClubNames.has(lower)) continue;
    if (reservedEnglandPlayerKeys.has(norm)) continue;
    if (globalUsedIds && globalUsedIds.has(candidate.soccerWikiId)) continue;
    if (globalUsedIds) globalUsedIds.add(candidate.soccerWikiId);
    return candidate;
  }

  return pool[(clubHash + slotIdx) % pool.length];
}

export function enrichPlayerWithSoccerWikiEnglandMedia(
  player: Player,
  fallbackCountry: string = 'Inglaterra'
): Player {
  const nat = player.nationality || fallbackCountry;
  if (nat !== 'Inglaterra') return player;
  if (player.photoUrl && player.soccerWikiId) return player;

  const media = resolveSoccerWikiEnglandPlayerMedia(player.name, 'Inglaterra');
  if (!media) return player;

  return {
    ...player,
    soccerWikiId: player.soccerWikiId ?? media.soccerWikiId,
    photoUrl: player.photoUrl || media.photoUrl,
    actionPhotoUrl: player.actionPhotoUrl || media.actionPhotoUrl,
  };
}

export function enrichClubWithSoccerWikiEngland(club: Club): Club {
  const isEngPyramid = isEnglishPyramidClub(club);
  const resolvedClub = isEngPyramid
    ? resolveSoccerWikiEnglandClubData(club.id, club.name, club.shortName)
    : null;
  const resolvedMgr = isEngPyramid
    ? resolveSoccerWikiEnglandManagerPhoto(club.managerName)
    : null;

  const enrichedSquad = (club.squad || []).map((p) =>
    enrichPlayerWithSoccerWikiEnglandMedia(p, club.country || 'Estrangeiro')
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
 * Atualiza saves existentes com o pacote oficial SoccerWiki Inglaterra:
 * - Escudos oficiais dos clubes da Premier League, Championship, League One e League Two
 * - Retratos oficiais de atletas ingleses (em qualquer liga do mundo) e técnicos na Inglaterra
 * - Substituição de nomes genéricos antigos (_gen_ / _depth_) em clubes ingleses da CPU por atletas reais do SoccerWiki Inglaterra
 */
export function upgradeSaveWithSoccerWikiEngland(
  save: GameSave,
  freshClubsById: Map<string, Club>
): GameSave {
  const needsFullSquadUpgrade =
    (save.soccerWikiEnglandVersion ?? 0) < CURRENT_SOCCERWIKI_ENGLAND_VERSION;

  const globalUsedIds = new Set<number>();
  for (const c of save.clubs || []) {
    for (const p of c.squad || []) {
      if ((p.nationality || c.country) === 'Inglaterra') {
        registerReservedEnglandPlayerNames([p.name]);
        if (p.soccerWikiId) globalUsedIds.add(p.soccerWikiId);
      }
    }
  }

  const upgradedClubs = (save.clubs || []).map((club) => {
    const isEngPyramid = isEnglishPyramidClub(club);
    if (!isEngPyramid) {
      return {
        ...club,
        squad: (club.squad || []).map((p) =>
          enrichPlayerWithSoccerWikiEnglandMedia(p, club.country || 'Estrangeiro')
        ),
      };
    }

    const isUserClub = club.id === save.userClubId || club.isUser;
    const template = freshClubsById.get(club.id);

    // If a Premier League / Championship club received a new official seeded roster in freshClubsById and wasn't customized by user, upgrade filler slots cleanly
    let nextSquad = club.squad || [];

    if (needsFullSquadUpgrade && !isUserClub) {
      // If club previously had 100% _gen_ players and template now has real seeded stars, adopt template squad while keeping club IDs clean
      const allWereGeneric =
        nextSquad.length > 0 &&
        nextSquad.every((p) => p.id.includes('_gen_') || p.id.includes('_depth_'));
      if (allWereGeneric && template && template.squad && template.squad.length > 0) {
        nextSquad = template.squad.map((tp) => {
          if (tp.soccerWikiId) globalUsedIds.add(tp.soccerWikiId);
          registerReservedEnglandPlayerNames([tp.name]);
          return { ...tp };
        });
      } else if (club.country === 'Inglaterra') {
        const usedClubNames = new Set<string>(
          nextSquad
            .filter((p) => !p.id.includes('_gen_') && !p.id.includes('_depth_'))
            .map((p) => p.name.toLowerCase())
        );

        nextSquad = nextSquad.map((p, idx) => {
          const isLegacyFiller = p.id.includes('_gen_') || p.id.includes('_depth_');
          if (!isLegacyFiller || (p.nationality && p.nationality !== 'Inglaterra')) {
            usedClubNames.add(p.name.toLowerCase());
            return enrichPlayerWithSoccerWikiEnglandMedia(p, 'Inglaterra');
          }
          const picked = pickSoccerWikiEnglishPlayer(
            club.id,
            idx,
            usedClubNames,
            globalUsedIds
          );
          usedClubNames.add(picked.name.toLowerCase());
          return {
            ...p,
            name: picked.name,
            nationality: 'Inglaterra',
            soccerWikiId: picked.soccerWikiId || p.soccerWikiId,
            photoUrl: picked.photoUrl || p.photoUrl,
            actionPhotoUrl: picked.actionPhotoUrl || p.actionPhotoUrl,
          };
        });
      }
    }

    return enrichClubWithSoccerWikiEngland({
      ...club,
      logoUrl: club.logoUrl || template?.logoUrl,
      soccerWikiId: club.soccerWikiId ?? template?.soccerWikiId,
      squad: nextSquad,
    });
  });

  const upgradedMarket = (save.transferMarket || []).map((p) =>
    enrichPlayerWithSoccerWikiEnglandMedia(p, p.nationality || 'Brasil')
  );

  return {
    ...save,
    soccerWikiEnglandVersion: CURRENT_SOCCERWIKI_ENGLAND_VERSION,
    clubs: upgradedClubs,
    transferMarket: upgradedMarket,
  };
}
