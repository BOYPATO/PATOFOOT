import { Club, Fixture, SouthAmericanCupId, SouthAmericanLeagueId } from '../types/game';
import { getClubsForSouthAmericanLeague } from './southAmericaLeaguesEngine';
import { assignSingleLegSlots, assignTwoLeggedSlots, resolveTieWinner } from './multiLeagueEngine';
import { getClubStadiumName } from './englishCupsEngine';
import { structureSouthAmericanCupCalendar } from './competitionsEngine';

export const SOUTH_AMERICAN_CUP_IDS: SouthAmericanCupId[] = [
  'sa_copa_argentina',
  'sa_supercopa_argentina',
  'sa_copa_colombia',
  'sa_superliga_colombia',
  'sa_copa_uruguay',
  'sa_supercopa_uruguay',
  'sa_copa_ecuador',
  'sa_supercopa_ecuador',
  'sa_copa_chile',
  'sa_supercopa_chile',
  'sa_copa_paraguay',
  'sa_supercopa_paraguay',
  'sa_copa_peru',
  'sa_supercopa_peru',
  'sa_copa_bolivia',
  'sa_supercopa_bolivia',
  'sa_copa_venezuela',
  'sa_supercopa_venezuela',
];

export function isSouthAmericanCup(comp: string): comp is SouthAmericanCupId {
  return (SOUTH_AMERICAN_CUP_IDS as string[]).includes(comp);
}

export function flattenSouthAmericanCupsFixtures(
  fixturesMap?: Partial<Record<SouthAmericanCupId, Fixture[]>>
): Fixture[] {
  if (!fixturesMap) return [];
  return Object.values(fixturesMap).flat().filter(Boolean);
}

// Pseudo-shuffle determinístico por ano/seed
function pseudoShuffle<T>(arr: T[], seedSalt: number = 42): T[] {
  const result = [...arr];
  let seed = Math.abs(seedSalt) + 1;
  for (let i = result.length - 1; i > 0; i--) {
    seed = (seed * 9301 + 49297) % 233280;
    const rnd = seed / 233280;
    const j = Math.floor(rnd * (i + 1));
    const temp = result[i];
    result[i] = result[j];
    result[j] = temp;
  }
  return result;
}

// ==========================================
// 1. ARGENTINA: Copa Argentina & Supercopa Argentina
// ==========================================
export function generateCopaArgentinaFixtures(
  clubs: Club[],
  seasonYear: number = 2026,
  leagueFixtures: Fixture[] = []
): Fixture[] {
  const argClubs = getClubsForSouthAmericanLeague(clubs, 'liga_arg');
  const pool = pseudoShuffle(argClubs, seasonYear + 11).slice(0, 16);
  while (pool.length < 16) {
    pool.push({ id: `arg_dummy_${pool.length}` } as Club);
  }

  const cal = structureSouthAmericanCupCalendar('sa_copa_argentina', seasonYear, leagueFixtures);
  const oitavas = cal.datesByPhase.oitavas || [`${seasonYear}-03-11`, `${seasonYear}-03-18`, `${seasonYear}-03-25`];
  const quartas = cal.datesByPhase.quartas || [`${seasonYear}-05-13`, `${seasonYear}-05-20`];
  const semi = cal.datesByPhase.semifinal || [`${seasonYear}-09-09`, `${seasonYear}-09-16`];
  const finalDate = cal.datesByPhase.final?.[0] || `${seasonYear}-11-04`;

  const fixtures: Fixture[] = [];

  // Oitavas de Final (8 jogos em jogo único)
  for (let i = 0; i < 8; i++) {
    const h = pool[i];
    const a = pool[15 - i];
    fixtures.push({
      id: `sa_c_arg_r16_m${i}`,
      round: 1,
      competition: 'sa_copa_argentina',
      cupPhase: 'Oitavas de Final',
      homeTeamId: h.id,
      awayTeamId: a.id,
      homeScore: null,
      awayScore: null,
      played: false,
      date: oitavas[i % oitavas.length],
      time: i % 2 === 0 ? '19:30' : '21:30',
      stadiumName: h.stadium?.name || getClubStadiumName(h),
    });
  }

  // Quartas de Final (4 jogos em jogo único)
  for (let i = 0; i < 4; i++) {
    fixtures.push({
      id: `sa_c_arg_qf_m${i}`,
      round: 2,
      competition: 'sa_copa_argentina',
      cupPhase: 'Quartas de Final',
      homeTeamId: 'tbd',
      awayTeamId: 'tbd',
      homeScore: null,
      awayScore: null,
      played: false,
      date: quartas[i % quartas.length],
      time: i % 2 === 0 ? '19:30' : '21:30',
      stadiumName: 'A definir',
    });
  }

  // Semifinais (2 jogos em jogo único)
  for (let i = 0; i < 2; i++) {
    fixtures.push({
      id: `sa_c_arg_sf_m${i}`,
      round: 3,
      competition: 'sa_copa_argentina',
      cupPhase: 'Semifinal',
      homeTeamId: 'tbd',
      awayTeamId: 'tbd',
      homeScore: null,
      awayScore: null,
      played: false,
      date: semi[i % semi.length],
      time: '21:00',
      stadiumName: 'A definir (Campo Neutro)',
    });
  }

  // Grande Final (Jogo único em campo neutro em Córdoba)
  fixtures.push({
    id: 'sa_c_arg_final',
    round: 4,
    competition: 'sa_copa_argentina',
    cupPhase: 'Grande Final',
    homeTeamId: 'tbd',
    awayTeamId: 'tbd',
    homeScore: null,
    awayScore: null,
    played: false,
    date: finalDate,
    time: '21:30',
    stadiumName: 'Estadio Mario Alberto Kempes (Córdoba)',
  });

  return fixtures;
}

export function generateSupercopaArgentinaFixtures(
  clubs: Club[],
  seasonYear: number = 2026,
  leagueFixtures: Fixture[] = []
): Fixture[] {
  const argClubs = getClubsForSouthAmericanLeague(clubs, 'liga_arg');
  const t1 = argClubs[0]?.id || 'riv';
  const t2 = argClubs[1]?.id || 'boc';
  const cal = structureSouthAmericanCupCalendar('sa_supercopa_argentina', seasonYear, leagueFixtures);
  const finalDate = cal.datesByPhase.final?.[0] || `${seasonYear}-03-04`;

  return [
    {
      id: 'sa_super_arg_final',
      round: 1,
      competition: 'sa_supercopa_argentina',
      cupPhase: 'Supercopa Argentina',
      homeTeamId: t1,
      awayTeamId: t2,
      homeScore: null,
      awayScore: null,
      played: false,
      date: finalDate,
      time: '21:15',
      stadiumName: 'Estadio Malvinas Argentinas (Mendoza)',
    },
  ];
}

// ==========================================
// 2. COLÔMBIA: Copa Colombia & Superliga Colombiana
// ==========================================
export function generateCopaColombiaFixtures(
  clubs: Club[],
  seasonYear: number = 2026,
  leagueFixtures: Fixture[] = []
): Fixture[] {
  const colClubs = getClubsForSouthAmericanLeague(clubs, 'liga_col');
  const pool = pseudoShuffle(colClubs, seasonYear + 22).slice(0, 16);
  while (pool.length < 16) {
    pool.push({ id: `col_dummy_${pool.length}` } as Club);
  }

  const cal = structureSouthAmericanCupCalendar('sa_copa_colombia', seasonYear, leagueFixtures);
  const r16_ida = cal.datesByPhase.oitavas_ida?.[0] || `${seasonYear}-03-11`;
  const r16_volta = cal.datesByPhase.oitavas_volta?.[0] || `${seasonYear}-03-25`;
  const qf_ida = cal.datesByPhase.quartas_ida?.[0] || `${seasonYear}-05-13`;
  const qf_volta = cal.datesByPhase.quartas_volta?.[0] || `${seasonYear}-05-27`;
  const sf_ida = cal.datesByPhase.semifinal_ida?.[0] || `${seasonYear}-09-09`;
  const sf_volta = cal.datesByPhase.semifinal_volta?.[0] || `${seasonYear}-09-23`;
  const fin_volta = cal.datesByPhase.final_volta?.[0] || `${seasonYear}-11-04`;

  const fixtures: Fixture[] = [];

  // Oitavas (8 confrontos em jogo único)
  for (let i = 0; i < 8; i++) {
    const h = pool[i];
    const a = pool[15 - i];
    fixtures.push({
      id: `sa_c_col_r16_m${i}`,
      round: 1,
      competition: 'sa_copa_colombia',
      cupPhase: 'Oitavas de Final',
      homeTeamId: h.id,
      awayTeamId: a.id,
      homeScore: null,
      awayScore: null,
      played: false,
      date: i % 2 === 0 ? r16_ida : r16_volta,
      time: i % 2 === 0 ? '19:00' : '21:15',
      stadiumName: h.stadium?.name || getClubStadiumName(h),
    });
  }

  // Quartas (4 confrontos)
  for (let i = 0; i < 4; i++) {
    fixtures.push({
      id: `sa_c_col_qf_m${i}`,
      round: 2,
      competition: 'sa_copa_colombia',
      cupPhase: 'Quartas de Final',
      homeTeamId: 'tbd',
      awayTeamId: 'tbd',
      homeScore: null,
      awayScore: null,
      played: false,
      date: i % 2 === 0 ? qf_ida : qf_volta,
      time: '20:00',
      stadiumName: 'A definir',
    });
  }

  // Semifinais (2 confrontos de ida e volta)
  for (let i = 0; i < 2; i++) {
    fixtures.push({
      id: `sa_c_col_sf_m${i}_ida`,
      round: 3,
      competition: 'sa_copa_colombia',
      cupPhase: 'Semifinal • Ida',
      leg: 1,
      homeTeamId: 'tbd',
      awayTeamId: 'tbd',
      homeScore: null,
      awayScore: null,
      played: false,
      date: sf_ida,
      time: '20:00',
      stadiumName: 'A definir',
    });
    fixtures.push({
      id: `sa_c_col_sf_m${i}_volta`,
      round: 4,
      competition: 'sa_copa_colombia',
      cupPhase: 'Semifinal • Volta',
      leg: 2,
      homeTeamId: 'tbd',
      awayTeamId: 'tbd',
      homeScore: null,
      awayScore: null,
      played: false,
      date: sf_volta,
      time: '20:00',
      stadiumName: 'A definir',
    });
  }

  // Grande Final (Jogo único em campo neutro)
  fixtures.push({
    id: 'sa_c_col_final',
    round: 5,
    competition: 'sa_copa_colombia',
    cupPhase: 'Grande Final',
    homeTeamId: 'tbd',
    awayTeamId: 'tbd',
    homeScore: null,
    awayScore: null,
    played: false,
    date: fin_volta,
    time: '20:30',
    stadiumName: 'Estadio Metropolitano Roberto Meléndez (Barranquilla)',
  });

  return fixtures;
}

export function generateSuperligaColombiaFixtures(
  clubs: Club[],
  seasonYear: number = 2026,
  leagueFixtures: Fixture[] = []
): Fixture[] {
  const colClubs = getClubsForSouthAmericanLeague(clubs, 'liga_col');
  const t1 = colClubs[0]?.id || 'mil';
  const t2 = colClubs[1]?.id || 'sfe';
  const cal = structureSouthAmericanCupCalendar('sa_superliga_colombia', seasonYear, leagueFixtures);
  const idaDate = cal.datesByPhase.final_ida?.[0] || `${seasonYear}-01-28`;

  return [
    {
      id: 'sa_super_col_final',
      round: 1,
      competition: 'sa_superliga_colombia',
      cupPhase: 'Superliga BetPlay Dimayor',
      homeTeamId: t1,
      awayTeamId: t2,
      homeScore: null,
      awayScore: null,
      played: false,
      date: idaDate,
      time: '20:00',
      stadiumName: 'Estadio Atanasio Girardot (Medellín)',
    },
  ];
}

// ==========================================
// 3. URUGUAI: Copa Uruguay & Supercopa Uruguaya
// ==========================================
export function generateCopaUruguayFixtures(
  clubs: Club[],
  seasonYear: number = 2026,
  leagueFixtures: Fixture[] = []
): Fixture[] {
  const uruClubs = getClubsForSouthAmericanLeague(clubs, 'liga_uru');
  const pool = pseudoShuffle(uruClubs, seasonYear + 33).slice(0, 16);
  while (pool.length < 16) {
    pool.push({ id: `uru_dummy_${pool.length}` } as Club);
  }

  const cal = structureSouthAmericanCupCalendar('sa_copa_uruguay', seasonYear, leagueFixtures);
  const r16Date = cal.datesByPhase.oitavas?.[0] || `${seasonYear}-03-18`;
  const qfDate = cal.datesByPhase.quartas?.[0] || `${seasonYear}-05-20`;
  const sf_ida = cal.datesByPhase.semifinal_ida?.[0] || `${seasonYear}-09-16`;
  const sf_volta = cal.datesByPhase.semifinal_volta?.[0] || `${seasonYear}-09-30`;
  const finDate = cal.datesByPhase.final?.[0] || `${seasonYear}-11-04`;

  const fixtures: Fixture[] = [];

  // Oitavas (8 jogos)
  for (let i = 0; i < 8; i++) {
    const h = pool[i];
    const a = pool[15 - i];
    fixtures.push({
      id: `sa_c_uru_r16_m${i}`,
      round: 1,
      competition: 'sa_copa_uruguay',
      cupPhase: 'Oitavas de Final',
      homeTeamId: h.id,
      awayTeamId: a.id,
      homeScore: null,
      awayScore: null,
      played: false,
      date: r16Date,
      time: i % 2 === 0 ? '19:30' : '21:30',
      stadiumName: h.stadium?.name || getClubStadiumName(h),
    });
  }

  // Quartas (4 jogos)
  for (let i = 0; i < 4; i++) {
    fixtures.push({
      id: `sa_c_uru_qf_m${i}`,
      round: 2,
      competition: 'sa_copa_uruguay',
      cupPhase: 'Quartas de Final',
      homeTeamId: 'tbd',
      awayTeamId: 'tbd',
      homeScore: null,
      awayScore: null,
      played: false,
      date: qfDate,
      time: '20:00',
      stadiumName: 'A definir',
    });
  }

  // Semifinais (2 jogos de ida e volta)
  for (let i = 0; i < 2; i++) {
    fixtures.push({
      id: `sa_c_uru_sf_m${i}_ida`,
      round: 3,
      competition: 'sa_copa_uruguay',
      cupPhase: 'Semifinal • Ida',
      leg: 1,
      homeTeamId: 'tbd',
      awayTeamId: 'tbd',
      homeScore: null,
      awayScore: null,
      played: false,
      date: sf_ida,
      time: '20:00',
      stadiumName: 'A definir',
    });
    fixtures.push({
      id: `sa_c_uru_sf_m${i}_volta`,
      round: 4,
      competition: 'sa_copa_uruguay',
      cupPhase: 'Semifinal • Volta',
      leg: 2,
      homeTeamId: 'tbd',
      awayTeamId: 'tbd',
      homeScore: null,
      awayScore: null,
      played: false,
      date: sf_volta,
      time: '20:00',
      stadiumName: 'A definir',
    });
  }

  // Grande Final (Estadio Centenario)
  fixtures.push({
    id: 'sa_c_uru_final',
    round: 5,
    competition: 'sa_copa_uruguay',
    cupPhase: 'Grande Final',
    homeTeamId: 'tbd',
    awayTeamId: 'tbd',
    homeScore: null,
    awayScore: null,
    played: false,
    date: finDate,
    time: '20:30',
    stadiumName: 'Estadio Centenario (Montevidéu)',
  });

  return fixtures;
}

export function generateSupercopaUruguayFixtures(
  clubs: Club[],
  seasonYear: number = 2026,
  leagueFixtures: Fixture[] = []
): Fixture[] {
  const uruClubs = getClubsForSouthAmericanLeague(clubs, 'liga_uru');
  const t1 = uruClubs[0]?.id || 'pen';
  const t2 = uruClubs[1]?.id || 'nac';
  const cal = structureSouthAmericanCupCalendar('sa_supercopa_uruguay', seasonYear, leagueFixtures);
  const finalDate = cal.datesByPhase.final?.[0] || `${seasonYear}-02-01`;

  return [
    {
      id: 'sa_super_uru_final',
      round: 1,
      competition: 'sa_supercopa_uruguay',
      cupPhase: 'Supercopa Uruguaya',
      homeTeamId: t1,
      awayTeamId: t2,
      homeScore: null,
      awayScore: null,
      played: false,
      date: finalDate,
      time: '20:30',
      stadiumName: 'Estadio Centenario (Montevidéu)',
    },
  ];
}

// ==========================================
// 4. EQUADOR: Copa Ecuador & Supercopa de Ecuador
// ==========================================
export function generateCopaEcuadorFixtures(
  clubs: Club[],
  seasonYear: number = 2026,
  leagueFixtures: Fixture[] = []
): Fixture[] {
  const equClubs = getClubsForSouthAmericanLeague(clubs, 'liga_equ');
  const pool = pseudoShuffle(equClubs, seasonYear + 44).slice(0, 16);
  while (pool.length < 16) {
    pool.push({ id: `equ_dummy_${pool.length}` } as Club);
  }

  const cal = structureSouthAmericanCupCalendar('sa_copa_ecuador', seasonYear, leagueFixtures);
  const r16Date = cal.datesByPhase.oitavas?.[0] || `${seasonYear}-04-08`;
  const qfDate = cal.datesByPhase.quartas?.[0] || `${seasonYear}-06-10`;
  const sf_ida = cal.datesByPhase.semifinal_ida?.[0] || `${seasonYear}-08-12`;
  const sf_volta = cal.datesByPhase.semifinal_volta?.[0] || `${seasonYear}-08-26`;
  const finDate = cal.datesByPhase.final?.[0] || `${seasonYear}-11-04`;

  const fixtures: Fixture[] = [];

  // Oitavas (8 jogos)
  for (let i = 0; i < 8; i++) {
    const h = pool[i];
    const a = pool[15 - i];
    fixtures.push({
      id: `sa_c_equ_r16_m${i}`,
      round: 1,
      competition: 'sa_copa_ecuador',
      cupPhase: 'Oitavas de Final',
      homeTeamId: h.id,
      awayTeamId: a.id,
      homeScore: null,
      awayScore: null,
      played: false,
      date: r16Date,
      time: '19:30',
      stadiumName: h.stadium?.name || getClubStadiumName(h),
    });
  }

  // Quartas (4 jogos)
  for (let i = 0; i < 4; i++) {
    fixtures.push({
      id: `sa_c_equ_qf_m${i}`,
      round: 2,
      competition: 'sa_copa_ecuador',
      cupPhase: 'Quartas de Final',
      homeTeamId: 'tbd',
      awayTeamId: 'tbd',
      homeScore: null,
      awayScore: null,
      played: false,
      date: qfDate,
      time: '19:30',
      stadiumName: 'A definir',
    });
  }

  // Semifinais (Ida e Volta)
  for (let i = 0; i < 2; i++) {
    fixtures.push({
      id: `sa_c_equ_sf_m${i}_ida`,
      round: 3,
      competition: 'sa_copa_ecuador',
      cupPhase: 'Semifinal • Ida',
      leg: 1,
      homeTeamId: 'tbd',
      awayTeamId: 'tbd',
      homeScore: null,
      awayScore: null,
      played: false,
      date: sf_ida,
      time: '19:30',
      stadiumName: 'A definir',
    });
    fixtures.push({
      id: `sa_c_equ_sf_m${i}_volta`,
      round: 4,
      competition: 'sa_copa_ecuador',
      cupPhase: 'Semifinal • Volta',
      leg: 2,
      homeTeamId: 'tbd',
      awayTeamId: 'tbd',
      homeScore: null,
      awayScore: null,
      played: false,
      date: sf_volta,
      time: '19:30',
      stadiumName: 'A definir',
    });
  }

  // Grande Final
  fixtures.push({
    id: 'sa_c_equ_final',
    round: 5,
    competition: 'sa_copa_ecuador',
    cupPhase: 'Grande Final',
    homeTeamId: 'tbd',
    awayTeamId: 'tbd',
    homeScore: null,
    awayScore: null,
    played: false,
    date: finDate,
    time: '20:00',
    stadiumName: 'Estadio Rodrigo Paz Delgado (Quito)',
  });

  return fixtures;
}

export function generateSupercopaEcuadorFixtures(
  clubs: Club[],
  seasonYear: number = 2026,
  leagueFixtures: Fixture[] = []
): Fixture[] {
  const equClubs = getClubsForSouthAmericanLeague(clubs, 'liga_equ');
  const t1 = equClubs[0]?.id || 'ldu';
  const t2 = equClubs[1]?.id || 'bar_sc';
  const cal = structureSouthAmericanCupCalendar('sa_supercopa_ecuador', seasonYear, leagueFixtures);
  const finalDate = cal.datesByPhase.final?.[0] || `${seasonYear}-02-08`;

  return [
    {
      id: 'sa_super_equ_final',
      round: 1,
      competition: 'sa_supercopa_ecuador',
      cupPhase: 'Supercopa de Ecuador',
      homeTeamId: t1,
      awayTeamId: t2,
      homeScore: null,
      awayScore: null,
      played: false,
      date: finalDate,
      time: '19:30',
      stadiumName: 'Estadio Monumental Banco Pichincha (Guayaquil)',
    },
  ];
}

// ==========================================
// 5. CHILE: Copa Chile & Supercopa de Chile
// ==========================================
export function generateCopaChileFixtures(
  clubs: Club[],
  seasonYear: number = 2026,
  leagueFixtures: Fixture[] = []
): Fixture[] {
  const chiClubs = getClubsForSouthAmericanLeague(clubs, 'liga_chi');
  const pool = pseudoShuffle(chiClubs, seasonYear + 55).slice(0, 16);
  while (pool.length < 16) {
    pool.push({ id: `chi_dummy_${pool.length}` } as Club);
  }

  const cal = structureSouthAmericanCupCalendar('sa_copa_chile', seasonYear, leagueFixtures);
  const r16Date = cal.datesByPhase.oitavas?.[0] || `${seasonYear}-04-15`;
  const qfDate = cal.datesByPhase.quartas?.[0] || `${seasonYear}-06-17`;
  const sf_ida = cal.datesByPhase.semifinal_ida?.[0] || `${seasonYear}-08-19`;
  const sf_volta = cal.datesByPhase.semifinal_volta?.[0] || `${seasonYear}-09-02`;
  const finDate = cal.datesByPhase.final?.[0] || `${seasonYear}-11-04`;

  const fixtures: Fixture[] = [];

  // Oitavas (8 jogos)
  for (let i = 0; i < 8; i++) {
    const h = pool[i];
    const a = pool[15 - i];
    fixtures.push({
      id: `sa_c_chi_r16_m${i}`,
      round: 1,
      competition: 'sa_copa_chile',
      cupPhase: 'Oitavas de Final',
      homeTeamId: h.id,
      awayTeamId: a.id,
      homeScore: null,
      awayScore: null,
      played: false,
      date: r16Date,
      time: '20:00',
      stadiumName: h.stadium?.name || getClubStadiumName(h),
    });
  }

  // Quartas (4 jogos)
  for (let i = 0; i < 4; i++) {
    fixtures.push({
      id: `sa_c_chi_qf_m${i}`,
      round: 2,
      competition: 'sa_copa_chile',
      cupPhase: 'Quartas de Final',
      homeTeamId: 'tbd',
      awayTeamId: 'tbd',
      homeScore: null,
      awayScore: null,
      played: false,
      date: qfDate,
      time: '20:00',
      stadiumName: 'A definir',
    });
  }

  // Semifinais (Ida e Volta)
  for (let i = 0; i < 2; i++) {
    fixtures.push({
      id: `sa_c_chi_sf_m${i}_ida`,
      round: 3,
      competition: 'sa_copa_chile',
      cupPhase: 'Semifinal • Ida',
      leg: 1,
      homeTeamId: 'tbd',
      awayTeamId: 'tbd',
      homeScore: null,
      awayScore: null,
      played: false,
      date: sf_ida,
      time: '20:00',
      stadiumName: 'A definir',
    });
    fixtures.push({
      id: `sa_c_chi_sf_m${i}_volta`,
      round: 4,
      competition: 'sa_copa_chile',
      cupPhase: 'Semifinal • Volta',
      leg: 2,
      homeTeamId: 'tbd',
      awayTeamId: 'tbd',
      homeScore: null,
      awayScore: null,
      played: false,
      date: sf_volta,
      time: '20:00',
      stadiumName: 'A definir',
    });
  }

  // Grande Final
  fixtures.push({
    id: 'sa_c_chi_final',
    round: 5,
    competition: 'sa_copa_chile',
    cupPhase: 'Grande Final',
    homeTeamId: 'tbd',
    awayTeamId: 'tbd',
    homeScore: null,
    awayScore: null,
    played: false,
    date: finDate,
    time: '20:30',
    stadiumName: 'Estadio Nacional Julio Martínez Prádanos (Santiago)',
  });

  return fixtures;
}

export function generateSupercopaChileFixtures(
  clubs: Club[],
  seasonYear: number = 2026,
  leagueFixtures: Fixture[] = []
): Fixture[] {
  const chiClubs = getClubsForSouthAmericanLeague(clubs, 'liga_chi');
  const t1 = chiClubs[0]?.id || 'col';
  const t2 = chiClubs[1]?.id || 'uca';
  const cal = structureSouthAmericanCupCalendar('sa_supercopa_chile', seasonYear, leagueFixtures);
  const finalDate = cal.datesByPhase.final?.[0] || `${seasonYear}-02-15`;

  return [
    {
      id: 'sa_super_chi_final',
      round: 1,
      competition: 'sa_supercopa_chile',
      cupPhase: 'Supercopa de Chile',
      homeTeamId: t1,
      awayTeamId: t2,
      homeScore: null,
      awayScore: null,
      played: false,
      date: finalDate,
      time: '19:00',
      stadiumName: 'Estadio Sausalito (Viña del Mar)',
    },
  ];
}

// ==========================================
// 6. PARAGUAI: Copa Paraguay & Supercopa Paraguay
// ==========================================
export function generateCopaParaguayFixtures(
  clubs: Club[],
  seasonYear: number = 2026,
  leagueFixtures: Fixture[] = []
): Fixture[] {
  const parClubs = getClubsForSouthAmericanLeague(clubs, 'liga_par');
  const pool = pseudoShuffle(parClubs, seasonYear + 66).slice(0, 12);
  while (pool.length < 12) {
    pool.push({ id: `par_dummy_${pool.length}` } as Club);
  }

  const cal = structureSouthAmericanCupCalendar('sa_copa_paraguay', seasonYear, leagueFixtures);
  const r16Date = cal.datesByPhase.oitavas?.[0] || `${seasonYear}-04-22`;
  const qfDate = cal.datesByPhase.quartas?.[0] || `${seasonYear}-06-24`;
  const sfDate = cal.datesByPhase.semifinal?.[0] || `${seasonYear}-09-23`;
  const finDate = cal.datesByPhase.final?.[0] || `${seasonYear}-11-04`;

  const fixtures: Fixture[] = [];

  // 1ª Fase Preliminar (4 jogos entre os times 5 a 12)
  for (let i = 0; i < 4; i++) {
    const h = pool[4 + i];
    const a = pool[11 - i];
    fixtures.push({
      id: `sa_c_par_f1_m${i}`,
      round: 1,
      competition: 'sa_copa_paraguay',
      cupPhase: 'Fase Preliminar',
      homeTeamId: h.id,
      awayTeamId: a.id,
      homeScore: null,
      awayScore: null,
      played: false,
      date: r16Date,
      time: '19:00',
      stadiumName: h.stadium?.name || getClubStadiumName(h),
    });
  }

  // Quartas de Final (4 jogos: Top 4 seeds vs 4 vencedores)
  for (let i = 0; i < 4; i++) {
    const h = pool[i];
    fixtures.push({
      id: `sa_c_par_qf_m${i}`,
      round: 2,
      competition: 'sa_copa_paraguay',
      cupPhase: 'Quartas de Final',
      homeTeamId: h.id,
      awayTeamId: 'tbd',
      homeScore: null,
      awayScore: null,
      played: false,
      date: qfDate,
      time: '19:30',
      stadiumName: h.stadium?.name || getClubStadiumName(h),
    });
  }

  // Semifinais (2 jogos)
  for (let i = 0; i < 2; i++) {
    fixtures.push({
      id: `sa_c_par_sf_m${i}`,
      round: 3,
      competition: 'sa_copa_paraguay',
      cupPhase: 'Semifinal',
      homeTeamId: 'tbd',
      awayTeamId: 'tbd',
      homeScore: null,
      awayScore: null,
      played: false,
      date: sfDate,
      time: '20:00',
      stadiumName: 'A definir',
    });
  }

  // Grande Final
  fixtures.push({
    id: 'sa_c_par_final',
    round: 4,
    competition: 'sa_copa_paraguay',
    cupPhase: 'Grande Final',
    homeTeamId: 'tbd',
    awayTeamId: 'tbd',
    homeScore: null,
    awayScore: null,
    played: false,
    date: finDate,
    time: '20:30',
    stadiumName: 'Estadio Defensores del Chaco (Assunção)',
  });

  return fixtures;
}

export function generateSupercopaParaguayFixtures(
  clubs: Club[],
  seasonYear: number = 2026,
  leagueFixtures: Fixture[] = []
): Fixture[] {
  const parClubs = getClubsForSouthAmericanLeague(clubs, 'liga_par');
  const t1 = parClubs[0]?.id || 'oli';
  const t2 = parClubs[1]?.id || 'cer';
  const cal = structureSouthAmericanCupCalendar('sa_supercopa_paraguay', seasonYear, leagueFixtures);
  const finalDate = cal.datesByPhase.final?.[0] || `${seasonYear}-02-22`;

  return [
    {
      id: 'sa_super_par_final',
      round: 1,
      competition: 'sa_supercopa_paraguay',
      cupPhase: 'Supercopa Paraguay',
      homeTeamId: t1,
      awayTeamId: t2,
      homeScore: null,
      awayScore: null,
      played: false,
      date: finalDate,
      time: '19:30',
      stadiumName: 'Estadio Defensores del Chaco (Assunção)',
    },
  ];
}

// ==========================================
// 7. PERU: Copa Bicentenario & Supercopa Peruana
// ==========================================
export function generateCopaPeruFixtures(
  clubs: Club[],
  seasonYear: number = 2026,
  leagueFixtures: Fixture[] = []
): Fixture[] {
  const perClubs = getClubsForSouthAmericanLeague(clubs, 'liga_per');
  const pool = pseudoShuffle(perClubs, seasonYear + 77).slice(0, 16);
  while (pool.length < 16) {
    pool.push({ id: `per_dummy_${pool.length}` } as Club);
  }

  const cal = structureSouthAmericanCupCalendar('sa_copa_peru', seasonYear, leagueFixtures);
  const r16Date = cal.datesByPhase.oitavas?.[0] || `${seasonYear}-04-29`;
  const qfDate = cal.datesByPhase.quartas?.[0] || `${seasonYear}-07-01`;
  const sf_ida = cal.datesByPhase.semifinal_ida?.[0] || `${seasonYear}-09-09`;
  const sf_volta = cal.datesByPhase.semifinal_volta?.[0] || `${seasonYear}-09-23`;
  const finDate = cal.datesByPhase.final?.[0] || `${seasonYear}-11-04`;

  const fixtures: Fixture[] = [];

  // Oitavas (8 jogos)
  for (let i = 0; i < 8; i++) {
    const h = pool[i];
    const a = pool[15 - i];
    fixtures.push({
      id: `sa_c_per_r16_m${i}`,
      round: 1,
      competition: 'sa_copa_peru',
      cupPhase: 'Oitavas de Final',
      homeTeamId: h.id,
      awayTeamId: a.id,
      homeScore: null,
      awayScore: null,
      played: false,
      date: r16Date,
      time: '20:00',
      stadiumName: h.stadium?.name || getClubStadiumName(h),
    });
  }

  // Quartas (4 jogos)
  for (let i = 0; i < 4; i++) {
    fixtures.push({
      id: `sa_c_per_qf_m${i}`,
      round: 2,
      competition: 'sa_copa_peru',
      cupPhase: 'Quartas de Final',
      homeTeamId: 'tbd',
      awayTeamId: 'tbd',
      homeScore: null,
      awayScore: null,
      played: false,
      date: qfDate,
      time: '20:00',
      stadiumName: 'A definir',
    });
  }

  // Semifinais (Ida e Volta)
  for (let i = 0; i < 2; i++) {
    fixtures.push({
      id: `sa_c_per_sf_m${i}_ida`,
      round: 3,
      competition: 'sa_copa_peru',
      cupPhase: 'Semifinal • Ida',
      leg: 1,
      homeTeamId: 'tbd',
      awayTeamId: 'tbd',
      homeScore: null,
      awayScore: null,
      played: false,
      date: sf_ida,
      time: '20:00',
      stadiumName: 'A definir',
    });
    fixtures.push({
      id: `sa_c_per_sf_m${i}_volta`,
      round: 4,
      competition: 'sa_copa_peru',
      cupPhase: 'Semifinal • Volta',
      leg: 2,
      homeTeamId: 'tbd',
      awayTeamId: 'tbd',
      homeScore: null,
      awayScore: null,
      played: false,
      date: sf_volta,
      time: '20:00',
      stadiumName: 'A definir',
    });
  }

  // Grande Final
  fixtures.push({
    id: 'sa_c_per_final',
    round: 5,
    competition: 'sa_copa_peru',
    cupPhase: 'Grande Final',
    homeTeamId: 'tbd',
    awayTeamId: 'tbd',
    homeScore: null,
    awayScore: null,
    played: false,
    date: finDate,
    time: '20:30',
    stadiumName: 'Estadio Nacional de Lima (Lima)',
  });

  return fixtures;
}

export function generateSupercopaPeruFixtures(
  clubs: Club[],
  seasonYear: number = 2026,
  leagueFixtures: Fixture[] = []
): Fixture[] {
  const perClubs = getClubsForSouthAmericanLeague(clubs, 'liga_per');
  const t1 = perClubs[0]?.id || 'uni';
  const t2 = perClubs[1]?.id || 'scr';
  const cal = structureSouthAmericanCupCalendar('sa_supercopa_peru', seasonYear, leagueFixtures);
  const finalDate = cal.datesByPhase.final?.[0] || `${seasonYear}-03-01`;

  return [
    {
      id: 'sa_super_per_final',
      round: 1,
      competition: 'sa_supercopa_peru',
      cupPhase: 'Supercopa Peruana',
      homeTeamId: t1,
      awayTeamId: t2,
      homeScore: null,
      awayScore: null,
      played: false,
      date: finalDate,
      time: '20:00',
      stadiumName: 'Estadio Nacional de Lima (Lima)',
    },
  ];
}

// ==========================================
// 8. BOLÍVIA: Copa Bolivia & Supercopa de Bolivia
// ==========================================
export function generateCopaBoliviaFixtures(
  clubs: Club[],
  seasonYear: number = 2026,
  leagueFixtures: Fixture[] = []
): Fixture[] {
  const bolClubs = getClubsForSouthAmericanLeague(clubs, 'liga_bol');
  const pool = pseudoShuffle(bolClubs, seasonYear + 88).slice(0, 16);
  while (pool.length < 16) {
    pool.push({ id: `bol_dummy_${pool.length}` } as Club);
  }

  const cal = structureSouthAmericanCupCalendar('sa_copa_bolivia', seasonYear, leagueFixtures);
  const r16Date = cal.datesByPhase.oitavas?.[0] || `${seasonYear}-04-22`;
  const qfDate = cal.datesByPhase.quartas?.[0] || `${seasonYear}-07-08`;
  const sf_ida = cal.datesByPhase.semifinal_ida?.[0] || `${seasonYear}-09-16`;
  const sf_volta = cal.datesByPhase.semifinal_volta?.[0] || `${seasonYear}-09-30`;
  const finDate = cal.datesByPhase.final?.[0] || `${seasonYear}-11-04`;

  const fixtures: Fixture[] = [];

  // Oitavas (8 jogos)
  for (let i = 0; i < 8; i++) {
    const h = pool[i];
    const a = pool[15 - i];
    fixtures.push({
      id: `sa_c_bol_r16_m${i}`,
      round: 1,
      competition: 'sa_copa_bolivia',
      cupPhase: 'Oitavas de Final',
      homeTeamId: h.id,
      awayTeamId: a.id,
      homeScore: null,
      awayScore: null,
      played: false,
      date: r16Date,
      time: '19:30',
      stadiumName: h.stadium?.name || getClubStadiumName(h),
    });
  }

  // Quartas (4 jogos)
  for (let i = 0; i < 4; i++) {
    fixtures.push({
      id: `sa_c_bol_qf_m${i}`,
      round: 2,
      competition: 'sa_copa_bolivia',
      cupPhase: 'Quartas de Final',
      homeTeamId: 'tbd',
      awayTeamId: 'tbd',
      homeScore: null,
      awayScore: null,
      played: false,
      date: qfDate,
      time: '19:30',
      stadiumName: 'A definir',
    });
  }

  // Semifinais (Ida e Volta)
  for (let i = 0; i < 2; i++) {
    fixtures.push({
      id: `sa_c_bol_sf_m${i}_ida`,
      round: 3,
      competition: 'sa_copa_bolivia',
      cupPhase: 'Semifinal • Ida',
      leg: 1,
      homeTeamId: 'tbd',
      awayTeamId: 'tbd',
      homeScore: null,
      awayScore: null,
      played: false,
      date: sf_ida,
      time: '19:30',
      stadiumName: 'A definir',
    });
    fixtures.push({
      id: `sa_c_bol_sf_m${i}_volta`,
      round: 4,
      competition: 'sa_copa_bolivia',
      cupPhase: 'Semifinal • Volta',
      leg: 2,
      homeTeamId: 'tbd',
      awayTeamId: 'tbd',
      homeScore: null,
      awayScore: null,
      played: false,
      date: sf_volta,
      time: '19:30',
      stadiumName: 'A definir',
    });
  }

  // Grande Final
  fixtures.push({
    id: 'sa_c_bol_final',
    round: 5,
    competition: 'sa_copa_bolivia',
    cupPhase: 'Grande Final',
    homeTeamId: 'tbd',
    awayTeamId: 'tbd',
    homeScore: null,
    awayScore: null,
    played: false,
    date: finDate,
    time: '20:00',
    stadiumName: 'Estadio Hernando Siles (La Paz)',
  });

  return fixtures;
}

export function generateSupercopaBoliviaFixtures(
  clubs: Club[],
  seasonYear: number = 2026,
  leagueFixtures: Fixture[] = []
): Fixture[] {
  const bolClubs = getClubsForSouthAmericanLeague(clubs, 'liga_bol');
  const t1 = bolClubs[0]?.id || 'bol_bol';
  const t2 = bolClubs[1]?.id || 'bol_str';
  const cal = structureSouthAmericanCupCalendar('sa_supercopa_bolivia', seasonYear, leagueFixtures);
  const finalDate = cal.datesByPhase.final?.[0] || `${seasonYear}-02-25`;

  return [
    {
      id: 'sa_super_bol_final',
      round: 1,
      competition: 'sa_supercopa_bolivia',
      cupPhase: 'Supercopa de Bolivia',
      homeTeamId: t1,
      awayTeamId: t2,
      homeScore: null,
      awayScore: null,
      played: false,
      date: finalDate,
      time: '19:30',
      stadiumName: 'Estadio Felix Capriles (Cochabamba)',
    },
  ];
}

// ==========================================
// 9. VENEZUELA: Copa Venezuela & Supercopa de Venezuela
// ==========================================
export function generateCopaVenezuelaFixtures(
  clubs: Club[],
  seasonYear: number = 2026,
  leagueFixtures: Fixture[] = []
): Fixture[] {
  const venClubs = getClubsForSouthAmericanLeague(clubs, 'liga_ven');
  const pool = pseudoShuffle(venClubs, seasonYear + 99).slice(0, 14);
  while (pool.length < 14) {
    pool.push({ id: `ven_dummy_${pool.length}` } as Club);
  }

  const cal = structureSouthAmericanCupCalendar('sa_copa_venezuela', seasonYear, leagueFixtures);
  const f1Date = cal.datesByPhase.oitavas?.[0] || `${seasonYear}-04-29`;
  const qfDate = cal.datesByPhase.quartas?.[0] || `${seasonYear}-07-15`;
  const sf_ida = cal.datesByPhase.semifinal_ida?.[0] || `${seasonYear}-09-23`;
  const sf_volta = cal.datesByPhase.semifinal_volta?.[0] || `${seasonYear}-10-07`;
  const finDate = cal.datesByPhase.final?.[0] || `${seasonYear}-11-04`;

  const fixtures: Fixture[] = [];

  // 1ª Fase Preliminar (6 jogos entre os times 2 a 13)
  for (let i = 0; i < 6; i++) {
    const h = pool[2 + i];
    const a = pool[13 - i];
    fixtures.push({
      id: `sa_c_ven_f1_m${i}`,
      round: 1,
      competition: 'sa_copa_venezuela',
      cupPhase: 'Fase Preliminar',
      homeTeamId: h.id,
      awayTeamId: a.id,
      homeScore: null,
      awayScore: null,
      played: false,
      date: f1Date,
      time: '19:00',
      stadiumName: h.stadium?.name || getClubStadiumName(h),
    });
  }

  // Quartas (4 jogos: Top 2 seeds + 6 vencedores da 1ª Fase)
  for (let i = 0; i < 4; i++) {
    const h = i < 2 ? pool[i].id : 'tbd';
    fixtures.push({
      id: `sa_c_ven_qf_m${i}`,
      round: 2,
      competition: 'sa_copa_venezuela',
      cupPhase: 'Quartas de Final',
      homeTeamId: h,
      awayTeamId: 'tbd',
      homeScore: null,
      awayScore: null,
      played: false,
      date: qfDate,
      time: '19:00',
      stadiumName: i < 2 ? (pool[i].stadium?.name || getClubStadiumName(pool[i])) : 'A definir',
    });
  }

  // Semifinais (Ida e Volta)
  for (let i = 0; i < 2; i++) {
    fixtures.push({
      id: `sa_c_ven_sf_m${i}_ida`,
      round: 3,
      competition: 'sa_copa_venezuela',
      cupPhase: 'Semifinal • Ida',
      leg: 1,
      homeTeamId: 'tbd',
      awayTeamId: 'tbd',
      homeScore: null,
      awayScore: null,
      played: false,
      date: sf_ida,
      time: '19:00',
      stadiumName: 'A definir',
    });
    fixtures.push({
      id: `sa_c_ven_sf_m${i}_volta`,
      round: 4,
      competition: 'sa_copa_venezuela',
      cupPhase: 'Semifinal • Volta',
      leg: 2,
      homeTeamId: 'tbd',
      awayTeamId: 'tbd',
      homeScore: null,
      awayScore: null,
      played: false,
      date: sf_volta,
      time: '19:00',
      stadiumName: 'A definir',
    });
  }

  // Grande Final
  fixtures.push({
    id: 'sa_c_ven_final',
    round: 5,
    competition: 'sa_copa_venezuela',
    cupPhase: 'Grande Final',
    homeTeamId: 'tbd',
    awayTeamId: 'tbd',
    homeScore: null,
    awayScore: null,
    played: false,
    date: finDate,
    time: '19:30',
    stadiumName: 'Estadio Olímpico de la UCV (Caracas)',
  });

  return fixtures;
}

export function generateSupercopaVenezuelaFixtures(
  clubs: Club[],
  seasonYear: number = 2026,
  leagueFixtures: Fixture[] = []
): Fixture[] {
  const venClubs = getClubsForSouthAmericanLeague(clubs, 'liga_ven');
  const t1 = venClubs[0]?.id || 'car';
  const t2 = venClubs[1]?.id || 'ven_dtv';
  const cal = structureSouthAmericanCupCalendar('sa_supercopa_venezuela', seasonYear, leagueFixtures);
  const finalDate = cal.datesByPhase.final?.[0] || `${seasonYear}-03-01`;

  return [
    {
      id: 'sa_super_ven_final',
      round: 1,
      competition: 'sa_supercopa_venezuela',
      cupPhase: 'Supercopa de Venezuela',
      homeTeamId: t1,
      awayTeamId: t2,
      homeScore: null,
      awayScore: null,
      played: false,
      date: finalDate,
      time: '19:00',
      stadiumName: 'Polideportivo de Pueblo Nuevo (San Cristóbal)',
    },
  ];
}

// ==========================================
// Gerador Geral de Todas as Copas Sul-Americanas
// ==========================================
export function generateAllSouthAmericanCupsFixtures(
  clubs: Club[],
  seasonYear: number = 2026,
  allLeagueFixtures: Fixture[] = []
): Partial<Record<SouthAmericanCupId, Fixture[]>> {
  return {
    sa_copa_argentina: generateCopaArgentinaFixtures(clubs, seasonYear, allLeagueFixtures),
    sa_supercopa_argentina: generateSupercopaArgentinaFixtures(clubs, seasonYear, allLeagueFixtures),
    sa_copa_colombia: generateCopaColombiaFixtures(clubs, seasonYear, allLeagueFixtures),
    sa_superliga_colombia: generateSuperligaColombiaFixtures(clubs, seasonYear, allLeagueFixtures),
    sa_copa_uruguay: generateCopaUruguayFixtures(clubs, seasonYear, allLeagueFixtures),
    sa_supercopa_uruguay: generateSupercopaUruguayFixtures(clubs, seasonYear, allLeagueFixtures),
    sa_copa_ecuador: generateCopaEcuadorFixtures(clubs, seasonYear, allLeagueFixtures),
    sa_supercopa_ecuador: generateSupercopaEcuadorFixtures(clubs, seasonYear, allLeagueFixtures),
    sa_copa_chile: generateCopaChileFixtures(clubs, seasonYear, allLeagueFixtures),
    sa_supercopa_chile: generateSupercopaChileFixtures(clubs, seasonYear, allLeagueFixtures),
    sa_copa_paraguay: generateCopaParaguayFixtures(clubs, seasonYear, allLeagueFixtures),
    sa_supercopa_paraguay: generateSupercopaParaguayFixtures(clubs, seasonYear, allLeagueFixtures),
    sa_copa_peru: generateCopaPeruFixtures(clubs, seasonYear, allLeagueFixtures),
    sa_supercopa_peru: generateSupercopaPeruFixtures(clubs, seasonYear, allLeagueFixtures),
    sa_copa_bolivia: generateCopaBoliviaFixtures(clubs, seasonYear, allLeagueFixtures),
    sa_supercopa_bolivia: generateSupercopaBoliviaFixtures(clubs, seasonYear, allLeagueFixtures),
    sa_copa_venezuela: generateCopaVenezuelaFixtures(clubs, seasonYear, allLeagueFixtures),
    sa_supercopa_venezuela: generateSupercopaVenezuelaFixtures(clubs, seasonYear, allLeagueFixtures),
  };
}

// ==========================================
// Chaveamento Dinâmico de Copas Sul-Americanas
// ==========================================
export function syncSouthAmericanCupsKnockoutBrackets(params: {
  fixturesSouthAmericanCups?: Partial<Record<SouthAmericanCupId, Fixture[]>>;
  clubs?: Club[];
}): Partial<Record<SouthAmericanCupId, Fixture[]>> {
  const { fixturesSouthAmericanCups, clubs = [] } = params;
  if (!fixturesSouthAmericanCups) return {};

  const result: Partial<Record<SouthAmericanCupId, Fixture[]>> = { ...fixturesSouthAmericanCups };
  const clubsMap = new Map<string, Club>(clubs.map((c) => [c.id, c]));
  const getFix = (list: Fixture[], id: string) => list.find((f) => f.id === id);

  const updateStadiumIfKnown = (fixtures: Fixture[], fixId: string, homeId?: string | null) => {
    if (!homeId || !clubsMap.has(homeId)) return fixtures;
    const stadium = getClubStadiumName(clubsMap.get(homeId));
    return fixtures.map((f) =>
      f.id === fixId && (f.stadiumName || '').includes('definir')
        ? { ...f, stadiumName: stadium }
        : f
    );
  };

  // Helper padrão para copas de 16 clubes em jogo único até SF (ou ida/volta)
  const syncStandard16Bracket = (
    cupKey: SouthAmericanCupId,
    prefix: string,
    isTwoLeggedSemi: boolean = false
  ) => {
    if (!result[cupKey]) return;
    let fix = [...result[cupKey]!];

    // R16 -> QF
    for (let i = 0; i < 4; i++) {
      const w0 = resolveTieWinner(undefined, getFix(fix, `${prefix}_r16_m${i * 2}`));
      const w1 = resolveTieWinner(undefined, getFix(fix, `${prefix}_r16_m${i * 2 + 1}`));
      if (w0 || w1) {
        fix = assignSingleLegSlots(fix, `${prefix}_qf_m${i}`, w0, w1);
        fix = updateStadiumIfKnown(fix, `${prefix}_qf_m${i}`, w0);
      }
    }

    // QF -> SF
    for (let i = 0; i < 2; i++) {
      const w0 = resolveTieWinner(undefined, getFix(fix, `${prefix}_qf_m${i * 2}`));
      const w1 = resolveTieWinner(undefined, getFix(fix, `${prefix}_qf_m${i * 2 + 1}`));
      if (w0 || w1) {
        if (isTwoLeggedSemi) {
          fix = assignTwoLeggedSlots(fix, `${prefix}_sf_m${i}_ida`, `${prefix}_sf_m${i}_volta`, w0, w1);
          fix = updateStadiumIfKnown(fix, `${prefix}_sf_m${i}_ida`, w0);
          fix = updateStadiumIfKnown(fix, `${prefix}_sf_m${i}_volta`, w1);
        } else {
          fix = assignSingleLegSlots(fix, `${prefix}_sf_m${i}`, w0, w1);
          fix = updateStadiumIfKnown(fix, `${prefix}_sf_m${i}`, w0);
        }
      }
    }

    // SF -> Final
    const sf0W = isTwoLeggedSemi
      ? resolveTieWinner(getFix(fix, `${prefix}_sf_m0_ida`), getFix(fix, `${prefix}_sf_m0_volta`))
      : resolveTieWinner(undefined, getFix(fix, `${prefix}_sf_m0`));
    const sf1W = isTwoLeggedSemi
      ? resolveTieWinner(getFix(fix, `${prefix}_sf_m1_ida`), getFix(fix, `${prefix}_sf_m1_volta`))
      : resolveTieWinner(undefined, getFix(fix, `${prefix}_sf_m1`));

    if (sf0W || sf1W) {
      fix = assignSingleLegSlots(fix, `${prefix}_final`, sf0W, sf1W);
    }

    result[cupKey] = fix;
  };

  // 1. Argentina
  syncStandard16Bracket('sa_copa_argentina', 'sa_c_arg', false);

  // 2. Colômbia
  syncStandard16Bracket('sa_copa_colombia', 'sa_c_col', true);

  // 3. Uruguai
  syncStandard16Bracket('sa_copa_uruguay', 'sa_c_uru', true);

  // 4. Equador
  syncStandard16Bracket('sa_copa_ecuador', 'sa_c_equ', true);

  // 5. Chile
  syncStandard16Bracket('sa_copa_chile', 'sa_c_chi', true);

  // 6. Paraguai (12 clubes: 4 jogos preliminares -> QF)
  if (result.sa_copa_paraguay) {
    let fix = [...result.sa_copa_paraguay];
    // Preliminares -> QF away slot
    for (let i = 0; i < 4; i++) {
      const winner = resolveTieWinner(undefined, getFix(fix, `sa_c_par_f1_m${i}`));
      if (winner) {
        fix = fix.map((f) => (f.id === `sa_c_par_qf_m${i}` ? { ...f, awayTeamId: winner } : f));
      }
    }
    // QF -> SF
    for (let i = 0; i < 2; i++) {
      const w0 = resolveTieWinner(undefined, getFix(fix, `sa_c_par_qf_m${i * 2}`));
      const w1 = resolveTieWinner(undefined, getFix(fix, `sa_c_par_qf_m${i * 2 + 1}`));
      if (w0 || w1) {
        fix = assignSingleLegSlots(fix, `sa_c_par_sf_m${i}`, w0, w1);
        fix = updateStadiumIfKnown(fix, `sa_c_par_sf_m${i}`, w0);
      }
    }
    // SF -> Final
    const sf0W = resolveTieWinner(undefined, getFix(fix, 'sa_c_par_sf_m0'));
    const sf1W = resolveTieWinner(undefined, getFix(fix, 'sa_c_par_sf_m1'));
    if (sf0W || sf1W) {
      fix = assignSingleLegSlots(fix, 'sa_c_par_final', sf0W, sf1W);
    }
    result.sa_copa_paraguay = fix;
  }

  // 7. Peru
  syncStandard16Bracket('sa_copa_peru', 'sa_c_per', true);

  // 8. Bolívia
  syncStandard16Bracket('sa_copa_bolivia', 'sa_c_bol', true);

  // 9. Venezuela (14 clubes: 6 preliminares -> QF)
  if (result.sa_copa_venezuela) {
    let fix = [...result.sa_copa_venezuela];
    // Preliminares -> QF slots
    const w0 = resolveTieWinner(undefined, getFix(fix, 'sa_c_ven_f1_m0'));
    const w1 = resolveTieWinner(undefined, getFix(fix, 'sa_c_ven_f1_m1'));
    const w2 = resolveTieWinner(undefined, getFix(fix, 'sa_c_ven_f1_m2'));
    const w3 = resolveTieWinner(undefined, getFix(fix, 'sa_c_ven_f1_m3'));
    const w4 = resolveTieWinner(undefined, getFix(fix, 'sa_c_ven_f1_m4'));
    const w5 = resolveTieWinner(undefined, getFix(fix, 'sa_c_ven_f1_m5'));

    if (w0) fix = fix.map((f) => (f.id === 'sa_c_ven_qf_m0' ? { ...f, awayTeamId: w0 } : f));
    if (w1) fix = fix.map((f) => (f.id === 'sa_c_ven_qf_m1' ? { ...f, awayTeamId: w1 } : f));
    if (w2 || w3) {
      fix = assignSingleLegSlots(fix, 'sa_c_ven_qf_m2', w2, w3);
      fix = updateStadiumIfKnown(fix, 'sa_c_ven_qf_m2', w2);
    }
    if (w4 || w5) {
      fix = assignSingleLegSlots(fix, 'sa_c_ven_qf_m3', w4, w5);
      fix = updateStadiumIfKnown(fix, 'sa_c_ven_qf_m3', w4);
    }

    // QF -> SF
    for (let i = 0; i < 2; i++) {
      const qf0W = resolveTieWinner(undefined, getFix(fix, `sa_c_ven_qf_m${i * 2}`));
      const qf1W = resolveTieWinner(undefined, getFix(fix, `sa_c_ven_qf_m${i * 2 + 1}`));
      if (qf0W || qf1W) {
        fix = assignTwoLeggedSlots(fix, `sa_c_ven_sf_m${i}_ida`, `sa_c_ven_sf_m${i}_volta`, qf0W, qf1W);
        fix = updateStadiumIfKnown(fix, `sa_c_ven_sf_m${i}_ida`, qf0W);
        fix = updateStadiumIfKnown(fix, `sa_c_ven_sf_m${i}_volta`, qf1W);
      }
    }

    // SF -> Final
    const sf0W = resolveTieWinner(getFix(fix, 'sa_c_ven_sf_m0_ida'), getFix(fix, 'sa_c_ven_sf_m0_volta'));
    const sf1W = resolveTieWinner(getFix(fix, 'sa_c_ven_sf_m1_ida'), getFix(fix, 'sa_c_ven_sf_m1_volta'));
    if (sf0W || sf1W) {
      fix = assignSingleLegSlots(fix, 'sa_c_ven_final', sf0W, sf1W);
    }
    result.sa_copa_venezuela = fix;
  }

  return result;
}
