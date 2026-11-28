import type { DetailedRole } from '../types/game';

export type ItalyCopaExtraPlayerTuple = [string, DetailedRole, number, number, number, string];

export interface ItalyCopaExtraClubData {
  id: string;
  name: string;
  shortName: string;
  reputation: number;
  primaryColor: string;
  stadiumName: string;
  managerName: string;
  players: ItalyCopaExtraPlayerTuple[];
}

interface ItalyCopaExtraClubSeed {
  id: string;
  name: string;
  shortName: string;
  reputation: number;
  primaryColor: string;
  stadiumName: string;
  managerName: string;
  baseOvr: number;
}

const ITALIAN_FIRST_NAMES = [
  'Alessandro', 'Andrea', 'Antonio', 'Christian', 'Daniele', 'Davide', 'Diego', 'Edoardo',
  'Emanuele', 'Enrico', 'Fabio', 'Federico', 'Filippo', 'Francesco', 'Gabriele', 'Giacomo',
  'Gianluca', 'Giorgio', 'Giovanni', 'Giuseppe', 'Jacopo', 'Leonardo', 'Lorenzo', 'Luca',
  'Luigi', 'Marco', 'Matteo', 'Mattia', 'Michele', 'Mirko', 'Niccolò', 'Nicola',
  'Paolo', 'Pietro', 'Raffaele', 'Riccardo', 'Roberto', 'Samuele', 'Simone', 'Stefano',
  'Tommaso', 'Valerio', 'Vincenzo', 'Vittorio',
];

const ITALIAN_LAST_NAMES = [
  'Rossi', 'Russo', 'Ferrari', 'Esposito', 'Bianchi', 'Romano', 'Colombo', 'Ricci',
  'Marino', 'Greco', 'Bruno', 'Gallo', 'Conti', 'De Luca', 'Mancini', 'Costa',
  'Giordano', 'Rizzo', 'Lombardi', 'Moretti', 'Barbieri', 'Fontana', 'Santoro', 'Mariani',
  'Rinaldi', 'Caruso', 'Ferrara', 'Galli', 'Martini', 'Leone', 'Longo', 'Gentile',
  'Martinelli', 'Vitale', 'Lombardo', 'Serra', 'Coppola', 'De Santis', 'D\'Angelo', 'Marchetti',
  'Parisi', 'Villa', 'Conte', 'Ferraro', 'Ferri', 'Fabbri', 'Bianco', 'Marini',
  'Grasso', 'Valentini', 'Messina', 'Sala', 'De Angelis', 'Gatti', 'Pellegrini', 'Palumbo',
];

const SQUAD_TEMPLATE: ReadonlyArray<{
  role: DetailedRole;
  ovrOffset: number;
  baseAge: number;
  shirt: number;
}> = [
  // Goleiros (2)
  { role: 'GOL', ovrOffset: 1, baseAge: 28, shirt: 1 },
  { role: 'GOL', ovrOffset: -2, baseAge: 22, shirt: 12 },
  // Zagueiros (4)
  { role: 'ZAG', ovrOffset: 2, baseAge: 29, shirt: 4 },
  { role: 'ZAG', ovrOffset: 1, baseAge: 26, shirt: 5 },
  { role: 'ZAG', ovrOffset: -1, baseAge: 24, shirt: 15 },
  { role: 'ZAG', ovrOffset: -2, baseAge: 21, shirt: 23 },
  // Laterais (4)
  { role: 'LAT', ovrOffset: 1, baseAge: 26, shirt: 2 },
  { role: 'LAT', ovrOffset: -2, baseAge: 22, shirt: 13 },
  { role: 'LAT', ovrOffset: 1, baseAge: 25, shirt: 3 },
  { role: 'LAT', ovrOffset: -2, baseAge: 23, shirt: 18 },
  // Meio-campo (7)
  { role: 'VOL', ovrOffset: 2, baseAge: 28, shirt: 6 },
  { role: 'VOL', ovrOffset: 0, baseAge: 24, shirt: 14 },
  { role: 'VOL', ovrOffset: -2, baseAge: 21, shirt: 21 },
  { role: 'MEI', ovrOffset: 2, baseAge: 27, shirt: 8 },
  { role: 'MEI', ovrOffset: 0, baseAge: 23, shirt: 16 },
  { role: 'MEI', ovrOffset: 2, baseAge: 26, shirt: 10 },
  { role: 'MEI', ovrOffset: -1, baseAge: 22, shirt: 20 },
  // Ataque (5)
  { role: 'ATA', ovrOffset: 1, baseAge: 25, shirt: 7 },
  { role: 'ATA', ovrOffset: 1, baseAge: 24, shirt: 11 },
  { role: 'ATA', ovrOffset: -2, baseAge: 20, shirt: 17 },
  { role: 'ATA', ovrOffset: 2, baseAge: 28, shirt: 9 },
  { role: 'ATA', ovrOffset: -1, baseAge: 23, shirt: 19 },
];

function hashString(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

function generateItalianSquad(clubId: string, baseOvr: number): ItalyCopaExtraPlayerTuple[] {
  let seed = hashString(clubId) || 193;
  const nextRand = (): number => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };

  const usedNames = new Set<string>();
  return SQUAD_TEMPLATE.map((slot, idx) => {
    let fullName = '';
    for (let attempt = 0; attempt < 25; attempt++) {
      const fn = ITALIAN_FIRST_NAMES[Math.floor(nextRand() * ITALIAN_FIRST_NAMES.length)];
      const ln = ITALIAN_LAST_NAMES[Math.floor(nextRand() * ITALIAN_LAST_NAMES.length)];
      const candidate = `${fn} ${ln}`;
      if (!usedNames.has(candidate)) {
        fullName = candidate;
        usedNames.add(candidate);
        break;
      }
    }
    if (!fullName) {
      fullName = `${ITALIAN_FIRST_NAMES[idx % ITALIAN_FIRST_NAMES.length]} ${ITALIAN_LAST_NAMES[(idx * 3) % ITALIAN_LAST_NAMES.length]}`;
    }

    const ovrJitter = Math.floor(nextRand() * 3) - 1;
    const ovr = Math.max(58, Math.min(72, baseOvr + slot.ovrOffset + ovrJitter));
    const ageJitter = Math.floor(nextRand() * 5) - 2;
    const age = Math.max(19, Math.min(35, slot.baseAge + ageJitter));
    const nat = nextRand() < 0.88 ? 'ITA' : nextRand() < 0.5 ? 'ARG' : 'CRO';

    return [fullName, slot.role, ovr, age, slot.shirt, nat];
  });
}

const ITALY_COPA_EXTRA_SEEDS: ItalyCopaExtraClubSeed[] = [
  {
    id: 'eu_ita3_cat',
    name: 'Catania FC',
    shortName: 'Catânia',
    reputation: 3,
    primaryColor: '#dc2626',
    stadiumName: 'Stadio Angelo Massimino',
    managerName: 'Domenico Toscano',
    baseOvr: 66,
  },
  {
    id: 'eu_ita3_pot',
    name: 'Potenza Calcio',
    shortName: 'Potência',
    reputation: 2,
    primaryColor: '#b91c1c',
    stadiumName: 'Stadio Alfredo Viviani',
    managerName: 'Pietro De Giorgio',
    baseOvr: 62,
  },
  {
    id: 'eu_ita3_rav',
    name: 'Ravenna FC',
    shortName: 'Ravenna',
    reputation: 2,
    primaryColor: '#991b1b',
    stadiumName: 'Stadio Bruno Benelli',
    managerName: 'Marco Marchionni',
    baseOvr: 62,
  },
  {
    id: 'eu_ita3_bre',
    name: 'Union Brescia',
    shortName: 'União Brescia',
    reputation: 3,
    primaryColor: '#1d4ed8',
    stadiumName: 'Stadio Mario Rigamonti',
    managerName: 'Rolando Maran',
    baseOvr: 65,
  },
];

export const ITALY_COPA_EXTRA_2026: ItalyCopaExtraClubData[] = ITALY_COPA_EXTRA_SEEDS.map(
  (seed) => ({
    id: seed.id,
    name: seed.name,
    shortName: seed.shortName,
    reputation: seed.reputation,
    primaryColor: seed.primaryColor,
    stadiumName: seed.stadiumName,
    managerName: seed.managerName,
    players: generateItalianSquad(seed.id, seed.baseOvr),
  })
);

export const ITALY_COPA_EXTRA_CLUB_IDS: string[] = ITALY_COPA_EXTRA_2026.map((c) => c.id);
