import { Fixture } from '../types/game';

export const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

export const WEEKDAY_NAMES = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
export const WEEKDAY_FULL_NAMES = [
  'Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira',
  'Quinta-feira', 'Sexta-feira', 'Sábado'
];

/**
 * Official season start date: 2nd Sunday of January (Jan 11 in 2026 — opening of Campeonatos Estaduais per CBF 2026 calendar)
 */
export function getSeasonStartDate(year: number = 2026): string {
  if (year === 2026) return '2026-01-11';
  return getNthWeekdayOfMonth(year, 0, 0, 2); // 2nd Sunday of January (e.g., 2027-01-10, 2028-01-09, 2029-01-14, 2030-01-13)
}

/**
 * Returns YYYY-MM-DD for the 1st Sunday of February (Supercopa do Brasil date)
 */
export function getFirstSundayOfFebruary(year: number = 2026): string {
  const feb1 = new Date(year, 1, 1); // Month 1 = February
  const dayOfWeek = feb1.getDay(); // 0 = Sunday
  const offset = dayOfWeek === 0 ? 0 : 7 - dayOfWeek;
  return toDateString(new Date(year, 1, 1 + offset));
}

/**
 * Returns YYYY-MM-DD for the last Sunday of November
 */
export function getLastSundayOfNovember(year: number = 2026): string {
  const nov30 = new Date(year, 10, 30); // Month 10 = November
  const dayOfWeek = nov30.getDay(); // 0 = Sunday
  return toDateString(new Date(year, 10, 30 - dayOfWeek));
}

/**
 * Quadrennial tournament cycle for mid-year breaks:
 * - year % 4 === 2 (2026, 2030, 2034...): Copa do Mundo FIFA
 * - year % 4 === 3 (2027, 2031, 2035...): Sem parada de Copa no meio do ano
 * - year % 4 === 0 (2028, 2032, 2036...): Copa América & UEFA Euro
 * - year % 4 === 1 (2029, 2033, 2037...): Super Mundial de Clubes FIFA (32 clubes)
 */
export type MidYearTournamentCycleKind =
  | 'WORLD_CUP'
  | 'COPA_AMERICA_EURO'
  | 'SUPER_CLUB_WORLD_CUP'
  | 'NONE';

export function getMidYearTournamentCycle(year: number): {
  kind: MidYearTournamentCycleKind;
  pauseStart?: string;
  pauseEnd?: string;
  label: string;
} {
  const mod = ((year % 4) + 4) % 4;
  if (mod === 2) {
    // Copa do Mundo FIFA (2026: Recesso 01/06 + Copa 11/06–19/07 + Intertemporada até 20/07)
    if (year === 2026) {
      return {
        kind: 'WORLD_CUP',
        pauseStart: '2026-06-01',
        pauseEnd: '2026-07-20',
        label: 'Copa do Mundo FIFA 2026',
      };
    }
    if (year === 2030) {
      return {
        kind: 'WORLD_CUP',
        pauseStart: '2030-06-03',
        pauseEnd: '2030-07-22',
        label: 'Copa do Mundo FIFA 2030 (Centenário)',
      };
    }
    return {
      kind: 'WORLD_CUP',
      pauseStart: `${year}-06-04`,
      pauseEnd: `${year}-07-20`,
      label: `Copa do Mundo FIFA ${year}`,
    };
  }
  if (mod === 0 && year >= 2028) {
    // Copa América & UEFA Euro (2028, 2032, 2036...)
    return {
      kind: 'COPA_AMERICA_EURO',
      pauseStart: `${year}-06-09`,
      pauseEnd: `${year}-07-16`,
      label: `Copa América & UEFA Euro ${year}`,
    };
  }
  if (mod === 1 && year >= 2029) {
    // Super Mundial de Clubes FIFA (2029, 2033, 2037...)
    return {
      kind: 'SUPER_CLUB_WORLD_CUP',
      pauseStart: `${year}-06-14`,
      pauseEnd: `${year}-07-13`,
      label: `Super Mundial de Clubes FIFA ${year}`,
    };
  }
  // mod === 3 (2027, 2031, 2035...) — Sem parada de Copa no meio do ano!
  return {
    kind: 'NONE',
    label: 'Calendário Contínuo (Sem Parada de Copa)',
  };
}

/**
 * Dedicated Wednesday midweek slot starting from the Wednesday right after Supercopa in early February.
 */
export function getMidweekCupDate(weekIdx: number, year: number = 2026): string {
  return addDays(getFirstSundayOfFebruary(year), 3 + weekIdx * 7);
}

/**
 * Supercopa do Brasil single-match date (1st Sunday of February -> 2026-02-01)
 */
export function getSupercopaDate(year: number = 2026): string {
  return getFirstSundayOfFebruary(year);
}

/**
 * Recopa Sul-Americana two-legged dates (CBF 2026: 18/02 e 25/02)
 */
export function getRecopaDates(year: number = 2026): [string, string] {
  if (year === 2026) {
    return ['2026-02-18', '2026-02-25'];
  }
  return [getMidweekCupDate(2, year), getMidweekCupDate(3, year)];
}

/**
 * Campeonatos Estaduais dates: starts 2nd Sunday of January (11/01 in 2026), ending 08/03 for Série A states
 */
export function getEstadualScheduleDates(year: number = 2026): {
  groupDates: string[];
  semiDate: string;
  finalDate: string;
} {
  const start = getSeasonStartDate(year);
  return {
    groupDates: [
      start,
      addDays(start, 3),
      addDays(start, 7),
      addDays(start, 10),
      addDays(start, 14),
    ],
    semiDate: addDays(start, 49),
    finalDate: addDays(start, 56),
  };
}

/**
 * Unified schedule builder for all 27 Campeonatos Estaduais following CBF 2026 (11 datas oficiais: 11/01 a 08/03):
 * - Official 11 CBF dates: Dom 11/01, Qua 14/01, Dom 18/01, Qua 21/01, Dom 25/01, Dom 01/02, Dom 08/02, Sáb 14/02, Dom 22/02, Dom 01/03, Dom 08/03.
 * - States with 12 slots add Qua 04/03 to finish strictly on 08/03; longer tournaments (13–17 slots) expand smoothly via Saturdays without colliding with Série A/B Sundays or Libertadores.
 */
export function getEstadualTournamentScheduleDates(
  year: number = 2026,
  firstPhaseRounds: number = 8,
  qfLegs: 0 | 1 | 2 = 1,
  sfLegs: 1 | 2 = 2,
  finalLegs: 1 | 2 = 2
): {
  groupDates: string[];
  qfDates: string[];
  sfDates: string[];
  finalDates: string[];
} {
  const start = getSeasonStartDate(year); // 2026-01-11

  // 11 Datas Oficiais CBF dos Estaduais (offset exato a partir de 11/01/2026: +0,+3,+7,+10,+14,+21,+28,+34,+42,+49,+56)
  const official11Slots = [
    start,               // 11/01 (Dom)
    addDays(start, 3),   // 14/01 (Qua)
    addDays(start, 7),   // 18/01 (Dom)
    addDays(start, 10),  // 21/01 (Qua)
    addDays(start, 14),  // 25/01 (Dom)
    addDays(start, 21),  // 01/02 (Dom)
    addDays(start, 28),  // 08/02 (Dom)
    addDays(start, 34),  // 14/02 (Sáb Pré-Carnaval)
    addDays(start, 42),  // 22/02 (Dom)
    addDays(start, 49),  // 01/03 (Dom)
    addDays(start, 56),  // 08/03 (Dom — Final Oficial CBF)
  ];

  // Extra auxiliary dates cleanly slotted between official dates for states with 12–17 slots
  const extraAuxDates15 = [
    start,               // 11/01 (Dom)
    addDays(start, 3),   // 14/01 (Qua)
    addDays(start, 7),   // 18/01 (Dom)
    addDays(start, 10),  // 21/01 (Qua)
    addDays(start, 13),  // 24/01 (Sáb)
    addDays(start, 14),  // 25/01 (Dom)
    addDays(start, 20),  // 31/01 (Sáb)
    addDays(start, 21),  // 01/02 (Dom)
    addDays(start, 27),  // 07/02 (Sáb)
    addDays(start, 28),  // 08/02 (Dom)
    addDays(start, 34),  // 14/02 (Sáb)
    addDays(start, 42),  // 22/02 (Dom)
    addDays(start, 48),  // 28/02 (Sáb)
    addDays(start, 49),  // 01/03 (Dom)
    addDays(start, 52),  // 04/03 (Qua)
    addDays(start, 56),  // 08/03 (Dom)
    addDays(start, 62),  // 14/03 (Sáb)
    addDays(start, 69),  // 21/03 (Sáb)
  ];

  const safeFirstRounds = Math.max(1, Math.min(12, firstPhaseRounds));
  const totalSlotsNeeded = safeFirstRounds + qfLegs + sfLegs + finalLegs;

  let chosenTimeline: string[];
  if (totalSlotsNeeded <= 11) {
    // Distribute cleanly on the 11 official dates finishing strictly on the Final Sunday (08/03 in 2026)
    const trim = 11 - totalSlotsNeeded;
    chosenTimeline = [official11Slots[0], ...official11Slots.slice(1 + trim)];
  } else if (totalSlotsNeeded === 12) {
    // 11 official CBF slots + Wed 04/03 right before the 08/03 Final Sunday
    chosenTimeline = [
      ...official11Slots.slice(0, 10),
      addDays(start, 52), // 04/03 (Qua)
      official11Slots[10], // 08/03 (Dom)
    ];
  } else if (totalSlotsNeeded <= 16) {
    chosenTimeline = extraAuxDates15.slice(16 - totalSlotsNeeded, 16);
    chosenTimeline[0] = start;
  } else {
    chosenTimeline = extraAuxDates15.slice(0, totalSlotsNeeded);
  }

  let cursor = 0;
  const groupDates = chosenTimeline.slice(cursor, cursor + safeFirstRounds);
  cursor += safeFirstRounds;
  const qfDates = qfLegs > 0 ? chosenTimeline.slice(cursor, cursor + qfLegs) : [];
  cursor += qfLegs;
  const sfDates = chosenTimeline.slice(cursor, cursor + sfLegs);
  cursor += sfLegs;
  const finalDates = chosenTimeline.slice(cursor, cursor + finalLegs);

  return {
    groupDates,
    qfDates,
    sfDates,
    finalDates,
  };
}

/**
 * Campeonato Potiguar (RN): 11 single round-robin rounds + Quartas, Semifinal e Final
 */
export function getPotiguarScheduleDates(year: number = 2026): {
  groupDates: string[];
  qfIdaDate: string;
  qfVoltaDate: string;
  semiIdaDate: string;
  semiVoltaDate: string;
  finalIdaDate: string;
  finalVoltaDate: string;
} {
  const sched = getEstadualTournamentScheduleDates(year, 11, 2, 2, 2);
  return {
    groupDates: sched.groupDates,
    qfIdaDate: sched.qfDates[0],
    qfVoltaDate: sched.qfDates[1],
    semiIdaDate: sched.sfDates[0],
    semiVoltaDate: sched.sfDates[1],
    finalIdaDate: sched.finalDates[0],
    finalVoltaDate: sched.finalDates[1],
  };
}

/**
 * Copa do Nordeste & Copa Verde (Regionais): 7 group rounds + Quartas, Semifinal e Final (Ida e Volta)
 * CBF 2026 REGIONAIS slots: 25/03, 29/03, 08/04, 15/04, 29/04, 06/05, 20/05, 27/05, 03/06, 07/06 — encerrando antes da Copa do Mundo!
 */
export function getCopaNordesteScheduleDates(year: number = 2026): {
  groupDates: string[];
  qfIdaDate: string;
  qfVoltaDate: string;
  semiIdaDate: string;
  semiVoltaDate: string;
  finalIdaDate: string;
  finalVoltaDate: string;
} {
  if (year === 2026) {
    return {
      groupDates: [
        '2026-02-17',
        '2026-03-03',
        '2026-03-10',
        '2026-03-25',
        '2026-03-29',
        '2026-04-08',
        '2026-04-15',
      ],
      qfIdaDate: '2026-04-29',
      qfVoltaDate: '2026-05-06',
      semiIdaDate: '2026-05-20',
      semiVoltaDate: '2026-05-27',
      finalIdaDate: '2026-06-03',
      finalVoltaDate: '2026-06-07',
    };
  }

  const firstTueFeb = addDays(getFirstSundayOfFebruary(year), 16);
  const startMar25 = getNthWeekdayOfMonth(year, 2, 3, 4); // 4th Wed of March
  return {
    groupDates: [
      firstTueFeb,
      addDays(firstTueFeb, 14),
      addDays(firstTueFeb, 21),
      startMar25,
      addDays(startMar25, 4),
      addDays(startMar25, 14),
      addDays(startMar25, 21),
    ],
    qfIdaDate: addDays(startMar25, 35),
    qfVoltaDate: addDays(startMar25, 42),
    semiIdaDate: addDays(startMar25, 56),
    semiVoltaDate: addDays(startMar25, 63),
    finalIdaDate: addDays(startMar25, 70),
    finalVoltaDate: addDays(startMar25, 74),
  };
}

/**
 * Copa do Nordeste (Novo formato 20 clubes):
 * 4 grupos de 5 times em turno e returno (10 rodadas de grupos, 8 jogos por time)
 * + Quartas de Final, Semifinal e Final todas em Ida e Volta (6 datas de mata-mata).
 */
export function getCopaNordeste20ScheduleDates(year: number = 2026): {
  groupDates: string[];
  qfIdaDate: string;
  qfVoltaDate: string;
  semiIdaDate: string;
  semiVoltaDate: string;
  finalIdaDate: string;
  finalVoltaDate: string;
} {
  if (year === 2026) {
    return {
      groupDates: [
        '2026-01-21',
        '2026-01-28',
        '2026-02-04',
        '2026-02-18',
        '2026-02-25',
        '2026-03-04',
        '2026-03-18',
        '2026-03-25',
        '2026-04-08',
        '2026-04-15',
      ],
      qfIdaDate: '2026-04-29',
      qfVoltaDate: '2026-05-06',
      semiIdaDate: '2026-05-20',
      semiVoltaDate: '2026-05-27',
      finalIdaDate: '2026-06-03',
      finalVoltaDate: '2026-06-07',
    };
  }

  const startWedJan = getNthWeekdayOfMonth(year, 0, 3, 3); // 3rd Wed of Jan
  const qfIda = addDays(startWedJan, 98);
  return {
    groupDates: [
      startWedJan,
      addDays(startWedJan, 7),
      addDays(startWedJan, 14),
      addDays(startWedJan, 28),
      addDays(startWedJan, 35),
      addDays(startWedJan, 42),
      addDays(startWedJan, 56),
      addDays(startWedJan, 63),
      addDays(startWedJan, 77),
      addDays(startWedJan, 84),
    ],
    qfIdaDate: qfIda,
    qfVoltaDate: addDays(qfIda, 7),
    semiIdaDate: addDays(qfIda, 21),
    semiVoltaDate: addDays(qfIda, 28),
    finalIdaDate: addDays(qfIda, 35),
    finalVoltaDate: addDays(qfIda, 39),
  };
}

/**
 * Continental single-match Grand Finals in late November (Sul-Americana & Libertadores)
 * CBF 2026 PDF: Final Sul-Americana 21/11 (Sáb), Final Libertadores 28/11 (Sáb)
 */
export function getContinentalFinalDates(year: number = 2026): {
  sulamericanaFinalDate: string;
  libertadoresFinalDate: string;
} {
  if (year === 2026) {
    return {
      sulamericanaFinalDate: '2026-11-21',
      libertadoresFinalDate: '2026-11-28',
    };
  }
  const lastSatNov = getLastWeekdayOfMonth(year, 10, 6);
  return {
    sulamericanaFinalDate: addDays(lastSatNov, -7),
    libertadoresFinalDate: lastSatNov,
  };
}

/**
 * CONMEBOL Libertadores & Sul-Americana full schedule (Grupos + Mata-mata)
 */
export function getConmebolContinentalScheduleDates(year: number = 2026): {
  groupDates: string[];
  playoffIdaDate: string;
  playoffVoltaDate: string;
  oitavasIdaDate: string;
  oitavasVoltaDate: string;
  quartasIdaDate: string;
  quartasVoltaDate: string;
  semiIdaDate: string;
  semiVoltaDate: string;
  sulamericanaFinalDate: string;
  libertadoresFinalDate: string;
} {
  const finals = getContinentalFinalDates(year);
  if (year === 2026) {
    return {
      groupDates: [
        '2026-04-08',
        '2026-04-15',
        '2026-04-29',
        '2026-05-06',
        '2026-05-20',
        '2026-05-27',
      ],
      playoffIdaDate: '2026-07-22',
      playoffVoltaDate: '2026-07-29',
      oitavasIdaDate: '2026-08-12',
      oitavasVoltaDate: '2026-08-19',
      quartasIdaDate: '2026-09-09',
      quartasVoltaDate: '2026-09-16',
      semiIdaDate: '2026-10-14',
      semiVoltaDate: '2026-10-21',
      ...finals,
    };
  }

  const aprWed2 = getNthWeekdayOfMonth(year, 3, 3, 2);
  const augWed2 = getNthWeekdayOfMonth(year, 7, 3, 2);
  const sepWed2 = getNthWeekdayOfMonth(year, 8, 3, 2);
  const octWed2 = getNthWeekdayOfMonth(year, 9, 3, 2);
  return {
    groupDates: [
      aprWed2,
      addDays(aprWed2, 7),
      addDays(aprWed2, 21),
      addDays(aprWed2, 28),
      addDays(aprWed2, 42),
      addDays(aprWed2, 49),
    ],
    playoffIdaDate: addDays(augWed2, -21),
    playoffVoltaDate: addDays(augWed2, -14),
    oitavasIdaDate: augWed2,
    oitavasVoltaDate: addDays(augWed2, 7),
    quartasIdaDate: sepWed2,
    quartasVoltaDate: addDays(sepWed2, 7),
    semiIdaDate: octWed2,
    semiVoltaDate: addDays(octWed2, 7),
    ...finals,
  };
}

/**
 * Copa do Brasil official dates (9 fases — CBF 2026 PDF + dynamic years)
 */
export function getCopaBrasilScheduleDates(year: number = 2026): {
  f1Date: string;
  f2Date: string;
  f3Date: string;
  f4Date: string;
  f5IdaDate: string;
  f5VoltaDate: string;
  oitavasIdaDate: string;
  oitavasVoltaDate: string;
  quartasIdaDate: string;
  quartasVoltaDate: string;
  semiIdaDate: string;
  semiVoltaDate: string;
  finalDate: string;
} {
  if (year === 2026) {
    return {
      f1Date: '2026-02-18',
      f2Date: '2026-02-25',
      f3Date: '2026-03-11',
      f4Date: '2026-03-18',
      f5IdaDate: '2026-04-22',
      f5VoltaDate: '2026-05-13',
      oitavasIdaDate: '2026-08-02',
      oitavasVoltaDate: '2026-08-05',
      quartasIdaDate: '2026-08-26',
      quartasVoltaDate: '2026-09-02',
      semiIdaDate: '2026-11-01',
      semiVoltaDate: '2026-11-08',
      finalDate: '2026-12-06',
    };
  }

  const febWed3 = getNthWeekdayOfMonth(year, 1, 3, 3);
  const marWed2 = getNthWeekdayOfMonth(year, 2, 3, 2);
  const aprWed4 = getNthWeekdayOfMonth(year, 3, 3, 4);
  const augSun1 = getNthWeekdayOfMonth(year, 7, 0, 1);
  const augWed4 = getNthWeekdayOfMonth(year, 7, 3, 4);
  const novSun1 = getNthWeekdayOfMonth(year, 10, 0, 1);
  const decSun1 = getNthWeekdayOfMonth(year, 11, 0, 1);

  return {
    f1Date: febWed3,
    f2Date: addDays(febWed3, 7),
    f3Date: marWed2,
    f4Date: addDays(marWed2, 7),
    f5IdaDate: aprWed4,
    f5VoltaDate: addDays(aprWed4, 21),
    oitavasIdaDate: augSun1,
    oitavasVoltaDate: addDays(augSun1, 3),
    quartasIdaDate: augWed4,
    quartasVoltaDate: addDays(augWed4, 7),
    semiIdaDate: novSun1,
    semiVoltaDate: addDays(novSun1, 7),
    finalDate: decSun1,
  };
}

export interface FifaPauseWindow {
  id: string;
  name: string;
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  region: 'global' | 'europe' | 'south_america';
  type: 'fifa_standard' | 'fifa_super' | 'tournament' | 'repescagem';
  matchCount?: number;
  description: string;
  seasonEurope?: string; // e.g. '2026/27'
  yearSouthAmerica?: number; // e.g. 2026
}

/**
 * Official FIFA International Match Calendar pause milestones 2026-2030.
 * Quadrennial tournament pause policy:
 * - 2026: Copa do Mundo FIFA (11/06–19/07 + recesso/intertemporada Brasil)
 * - 2027: SEM parada de Copa no meio do ano
 * - 2028: Copa América & UEFA Euro (09/06–16/07)
 * - 2029: Super Mundial de Clubes FIFA (14/06–13/07)
 * - 2030: Copa do Mundo FIFA (08/06–21/07)
 */
export const OFFICIAL_FIFA_PAUSES_2026_2030: FifaPauseWindow[] = [
  // 2026
  {
    id: 'fifa_pause_mar_2026',
    name: 'Data FIFA de Março 2026',
    startDate: '2026-03-23',
    endDate: '2026-03-31',
    region: 'global',
    type: 'fifa_standard',
    matchCount: 2,
    description: 'Janela Padrão da FIFA de Março 2026 (Amistosos Preparatórios pré-Copa)',
    seasonEurope: '2025/26',
    yearSouthAmerica: 2026,
  },
  {
    id: 'fifa_pause_jun_prep_2026',
    name: 'Data FIFA de Junho 2026 (Amistosos)',
    startDate: '2026-06-01',
    endDate: '2026-06-09',
    region: 'global',
    type: 'fifa_standard',
    matchCount: 2,
    description: '1 a 9 de junho de 2026: Amistosos preparatórios oficiais pré-Copa do Mundo (2 jogos)',
    seasonEurope: '2025/26',
    yearSouthAmerica: 2026,
  },
  {
    id: 'fifa_pause_wc_2026',
    name: 'Copa do Mundo FIFA de 2026',
    startDate: '2026-06-11',
    endDate: '2026-07-19',
    region: 'global',
    type: 'tournament',
    description: 'Copa do Mundo FIFA de 2026 (Estados Unidos, México e Canadá) — Parada do calendário brasileiro com Recesso + Intertemporada até 20/07',
    yearSouthAmerica: 2026,
  },
  {
    id: 'fifa_pause_super_2026',
    name: 'Super Data FIFA (Set/Out 2026)',
    startDate: '2026-09-21',
    endDate: '2026-10-06',
    region: 'global',
    type: 'fifa_super',
    matchCount: 4,
    description: 'Super Data FIFA: Janela estendida de 16 dias com até 4 jogos por seleção',
    seasonEurope: '2026/27',
    yearSouthAmerica: 2026,
  },
  {
    id: 'fifa_pause_nov_2026',
    name: 'Data FIFA de Novembro 2026',
    startDate: '2026-11-09',
    endDate: '2026-11-17',
    region: 'global',
    type: 'fifa_standard',
    matchCount: 2,
    description: 'Janela Padrão da FIFA (2 jogos)',
    seasonEurope: '2026/27',
    yearSouthAmerica: 2026,
  },
  // 2027 (Sem parada de Copa no meio do ano — apenas Data FIFA padrão de Junho)
  {
    id: 'fifa_pause_mar_2027',
    name: 'Data FIFA de Março 2027',
    startDate: '2027-03-22',
    endDate: '2027-03-30',
    region: 'global',
    type: 'fifa_standard',
    matchCount: 2,
    description: 'Janela Padrão (2 jogos — Início das Eliminatórias Europeias para a Copa de 2030)',
    seasonEurope: '2026/27',
    yearSouthAmerica: 2027,
  },
  {
    id: 'fifa_pause_jun_2027',
    name: 'Data FIFA de Junho 2027',
    startDate: '2027-06-07',
    endDate: '2027-06-15',
    region: 'global',
    type: 'fifa_standard',
    matchCount: 2,
    description: 'Janela Padrão (2 jogos) — Sem paralisação longa de Copa no Brasil em 2027',
    seasonEurope: '2026/27',
    yearSouthAmerica: 2027,
  },
  {
    id: 'fifa_pause_super_2027',
    name: 'Super Data FIFA (Set/Out 2027)',
    startDate: '2027-09-20',
    endDate: '2027-10-05',
    region: 'global',
    type: 'fifa_super',
    matchCount: 4,
    description: 'Super Data FIFA: Janela estendida de 16 dias com até 4 jogos por seleção',
    seasonEurope: '2027/28',
    yearSouthAmerica: 2027,
  },
  {
    id: 'fifa_pause_nov_2027',
    name: 'Data FIFA de Novembro 2027',
    startDate: '2027-11-08',
    endDate: '2027-11-16',
    region: 'global',
    type: 'fifa_standard',
    matchCount: 2,
    description: 'Janela Padrão (2 jogos — Fim da fase de grupos das Eliminatórias Europeias)',
    seasonEurope: '2027/28',
    yearSouthAmerica: 2027,
  },
  // 2028 (Parada para Copa América 2028 & UEFA Euro 2028)
  {
    id: 'fifa_pause_mar_2028',
    name: 'Data FIFA de Março 2028',
    startDate: '2028-03-20',
    endDate: '2028-03-28',
    region: 'global',
    type: 'repescagem',
    matchCount: 2,
    description: 'Janela Padrão (Fase de playoffs/repescagem europeia)',
    seasonEurope: '2027/28',
    yearSouthAmerica: 2028,
  },
  {
    id: 'fifa_pause_jun_prep_2028',
    name: 'Data FIFA Pré-Torneios (Maio/Junho 2028)',
    startDate: '2028-05-29',
    endDate: '2028-06-06',
    region: 'global',
    type: 'fifa_standard',
    matchCount: 2,
    description: 'Janela Padrão (Amistosos preparatórios oficiais para a Euro e Copa América)',
    seasonEurope: '2027/28',
    yearSouthAmerica: 2028,
  },
  {
    id: 'fifa_pause_euro_copa_2028',
    name: 'Copas Continentais 2028 (Copa América, Euro, Copa Ouro, CAN, Ásia e OFC)',
    startDate: '2028-06-09',
    endDate: '2028-07-16',
    region: 'global',
    type: 'tournament',
    description: 'Junho/Julho 2028: Copa América, Eurocopa, Copa Ouro da CONCACAF, Copa da África (CAN), Copa da Ásia e Copa da Oceania — Parada do calendário',
    yearSouthAmerica: 2028,
  },
  {
    id: 'fifa_pause_super_2028',
    name: 'Super Data FIFA (Set/Out 2028)',
    startDate: '2028-09-18',
    endDate: '2028-10-03',
    region: 'global',
    type: 'fifa_super',
    matchCount: 4,
    description: 'Super Data FIFA: Janela de 16 dias com até 4 jogos — Início da UEFA Nations League',
    seasonEurope: '2028/29',
    yearSouthAmerica: 2028,
  },
  {
    id: 'fifa_pause_nov_2028',
    name: 'Data FIFA de Novembro 2028',
    startDate: '2028-11-13',
    endDate: '2028-11-21',
    region: 'global',
    type: 'fifa_standard',
    matchCount: 2,
    description: 'Janela Padrão (2 jogos)',
    seasonEurope: '2028/29',
    yearSouthAmerica: 2028,
  },
  // 2029 (Parada para Super Mundial de Clubes FIFA 2029)
  {
    id: 'fifa_pause_mar_2029',
    name: 'Data FIFA de Março 2029',
    startDate: '2029-03-19',
    endDate: '2029-03-27',
    region: 'global',
    type: 'fifa_standard',
    matchCount: 2,
    description: 'Janela Padrão (2 jogos)',
    seasonEurope: '2028/29',
    yearSouthAmerica: 2029,
  },
  {
    id: 'fifa_pause_jun_2029',
    name: 'Data FIFA de Junho 2029',
    startDate: '2029-06-04',
    endDate: '2029-06-12',
    region: 'global',
    type: 'fifa_standard',
    matchCount: 2,
    description: 'Janela Padrão (2 jogos — Finais da UEFA Nations League)',
    seasonEurope: '2028/29',
    yearSouthAmerica: 2029,
  },
  {
    id: 'fifa_pause_super_mundial_2029',
    name: 'Super Mundial de Clubes FIFA 2029 (32 Clubes)',
    startDate: '2029-06-14',
    endDate: '2029-07-13',
    region: 'global',
    type: 'tournament',
    description: 'Super Mundial de Clubes FIFA com 32 equipes e paralisação dos campeonatos nacionais no meio do ano',
    yearSouthAmerica: 2029,
  },
  {
    id: 'fifa_pause_super_2029',
    name: 'Data FIFA (Set/Out 2029)',
    startDate: '2029-09-29',
    endDate: '2029-10-09',
    region: 'global',
    type: 'fifa_super',
    matchCount: 4,
    description: '29 de setembro a 9 de outubro de 2029: Data FIFA com 4 jogos por seleção',
    seasonEurope: '2029/30',
    yearSouthAmerica: 2029,
  },
  {
    id: 'fifa_pause_nov_2029',
    name: 'Data FIFA de Novembro 2029',
    startDate: '2029-11-12',
    endDate: '2029-11-20',
    region: 'global',
    type: 'fifa_standard',
    matchCount: 2,
    description: 'Janela Padrão (2 jogos — Fim das Eliminatórias Sul-Americanas para a Copa de 2030)',
    seasonEurope: '2029/30',
    yearSouthAmerica: 2029,
  },
  // 2030 (Parada para Copa do Mundo FIFA 2030)
  {
    id: 'fifa_pause_mar_2030',
    name: 'Data FIFA de Março 2030',
    startDate: '2030-03-18',
    endDate: '2030-03-26',
    region: 'global',
    type: 'repescagem',
    matchCount: 2,
    description: 'Janela Padrão (Últimos confrontos de repescagem mundial e intercontinental)',
    seasonEurope: '2029/30',
    yearSouthAmerica: 2030,
  },
  {
    id: 'fifa_pause_jun_prep_2030',
    name: 'Período Pré-Copa e Amistosos Finais',
    startDate: '2030-06-03',
    endDate: '2030-06-11',
    region: 'global',
    type: 'fifa_standard',
    matchCount: 2,
    description: 'Período oficial de liberação e amistosos finais pré-Copa do Mundo de 2030',
    seasonEurope: '2029/30',
    yearSouthAmerica: 2030,
  },
  {
    id: 'fifa_pause_wc_2030',
    name: 'Copa do Mundo FIFA de 2030 (Centenário)',
    startDate: '2030-06-08',
    endDate: '2030-07-21',
    region: 'global',
    type: 'tournament',
    description: 'Copa do Mundo FIFA 2030: Jogos comemorativos do Centenário na América do Sul e sedes principais na Espanha, Portugal e Marrocos',
    yearSouthAmerica: 2030,
  },
  {
    id: 'fifa_pause_sep_2030',
    name: 'Data FIFA de Setembro/Outubro 2030 (4 jogos)',
    startDate: '2030-09-23',
    endDate: '2030-10-08',
    region: 'global',
    type: 'fifa_super',
    matchCount: 4,
    description: '23 de setembro a 8 de outubro de 2030: Data FIFA Pós-Copa (4 jogos)',
    seasonEurope: '2030/31',
    yearSouthAmerica: 2030,
  },
  {
    id: 'fifa_pause_nov_2030',
    name: 'Data FIFA de Novembro 2030',
    startDate: '2030-11-11',
    endDate: '2030-11-19',
    region: 'global',
    type: 'fifa_standard',
    matchCount: 2,
    description: 'Janela Padrão da FIFA de Novembro 2030',
    seasonEurope: '2030/31',
    yearSouthAmerica: 2030,
  },
];

/**
 * Generates dynamic FIFA + Quadrennial Tournament pause windows for years > 2030
 * following the exact cycle:
 * - year % 4 === 2 (2034, 2038...): Copa do Mundo FIFA
 * - year % 4 === 3 (2031, 2035...): Sem parada de Copa no meio do ano (apenas Data FIFA de Junho)
 * - year % 4 === 0 (2032, 2036...): Copa América & UEFA Euro
 * - year % 4 === 1 (2033, 2037...): Super Mundial de Clubes FIFA (32 clubes)
 */
function buildDynamicFifaPausesForYear(yr: number): FifaPauseWindow[] {
  if (yr <= 2030) {
    return OFFICIAL_FIFA_PAUSES_2026_2030.filter((w) => {
      const sY = parseInt(w.startDate.slice(0, 4), 10);
      const eY = parseInt(w.endDate.slice(0, 4), 10);
      return yr >= sY && yr <= eY;
    });
  }

  const dates = getFifaWindowDatesForYear(yr);
  const windows: FifaPauseWindow[] = [
    {
      id: `fifa_dyn_mar_${yr}`,
      name: `Data FIFA de Março ${yr}`,
      startDate: addDays(dates.mar1, -3),
      endDate: dates.mar2,
      region: 'global',
      type: 'fifa_standard',
      matchCount: 2,
      description: `Data FIFA Padrão de Março ${yr}`,
      yearSouthAmerica: yr,
    },
  ];

  const cycle = getMidYearTournamentCycle(yr);
  if (cycle.kind === 'WORLD_CUP') {
    windows.push({
      id: `fifa_dyn_wc_${yr}`,
      name: `Copa do Mundo FIFA ${yr}`,
      startDate: `${yr}-06-11`,
      endDate: `${yr}-07-19`,
      region: 'global',
      type: 'tournament',
      description: `Copa do Mundo FIFA de ${yr} — Parada oficial do calendário`,
      yearSouthAmerica: yr,
    });
  } else if (cycle.kind === 'COPA_AMERICA_EURO') {
    windows.push({
      id: `fifa_dyn_jun_prep_${yr}`,
      name: `Data FIFA Pré-Torneios ${yr}`,
      startDate: `${yr}-05-29`,
      endDate: `${yr}-06-06`,
      region: 'global',
      type: 'fifa_standard',
      matchCount: 2,
      description: `Amistosos preparatórios para Copa América e Euro ${yr}`,
      yearSouthAmerica: yr,
    });
    windows.push({
      id: `fifa_dyn_copa_euro_${yr}`,
      name: `Copa América e UEFA Euro ${yr}`,
      startDate: `${yr}-06-09`,
      endDate: `${yr}-07-16`,
      region: 'global',
      type: 'tournament',
      description: `Copa América ${yr} e UEFA Euro ${yr} — Parada oficial do calendário`,
      yearSouthAmerica: yr,
    });
  } else if (cycle.kind === 'SUPER_CLUB_WORLD_CUP') {
    windows.push({
      id: `fifa_dyn_jun_${yr}`,
      name: `Data FIFA de Junho ${yr}`,
      startDate: addDays(dates.jun1, -3),
      endDate: dates.jun2,
      region: 'global',
      type: 'fifa_standard',
      matchCount: 2,
      description: `Data FIFA Padrão de Junho ${yr}`,
      yearSouthAmerica: yr,
    });
    windows.push({
      id: `fifa_dyn_smwc_${yr}`,
      name: `Super Mundial de Clubes FIFA ${yr}`,
      startDate: `${yr}-06-14`,
      endDate: `${yr}-07-13`,
      region: 'global',
      type: 'tournament',
      description: `Super Mundial de Clubes FIFA ${yr} (32 clubes) — Parada oficial do calendário`,
      yearSouthAmerica: yr,
    });
  } else {
    // year % 4 === 3 (2031, 2035...): Apenas Data FIFA padrão de Junho, SEM parada de Copa!
    windows.push({
      id: `fifa_dyn_jun_${yr}`,
      name: `Data FIFA de Junho ${yr}`,
      startDate: addDays(dates.jun1, -3),
      endDate: dates.jun2,
      region: 'global',
      type: 'fifa_standard',
      matchCount: 2,
      description: `Data FIFA Padrão de Junho ${yr} — Sem parada de Copa`,
      yearSouthAmerica: yr,
    });
  }

  windows.push(
    {
      id: `fifa_dyn_sep_${yr}`,
      name: `Data FIFA de Setembro/Outubro ${yr}`,
      startDate: addDays(dates.sep1, -3),
      endDate: dates.oct2,
      region: 'global',
      type: 'fifa_super',
      matchCount: 4,
      description: `Janela FIFA de Setembro/Outubro ${yr}`,
      yearSouthAmerica: yr,
    },
    {
      id: `fifa_dyn_nov_${yr}`,
      name: `Data FIFA de Novembro ${yr}`,
      startDate: addDays(dates.nov1, -3),
      endDate: dates.nov2,
      region: 'global',
      type: 'fifa_standard',
      matchCount: 2,
      description: `Data FIFA Padrão de Novembro ${yr}`,
      yearSouthAmerica: yr,
    }
  );

  return windows;
}

/**
 * Automatically calculates all FIFA pause windows for a given season or calendar year.
 * Works continuously for 2026–2030 AND all subsequent quadrennial cycles (2031+).
 */
export function getFifaPausesForSeason(
  seasonStartYear: number,
  region: 'europe' | 'south_america'
): FifaPauseWindow[] {
  let periodStart: string;
  let periodEnd: string;

  if (region === 'europe') {
    periodStart = `${seasonStartYear}-08-01`;
    periodEnd = `${seasonStartYear + 1}-06-10`;
  } else {
    periodStart = `${seasonStartYear}-01-01`;
    periodEnd = `${seasonStartYear}-12-31`;
  }

  const yearsToCheck =
    region === 'europe' ? [seasonStartYear, seasonStartYear + 1] : [seasonStartYear];

  const allCandidates: FifaPauseWindow[] = [];
  const seenIds = new Set<string>();
  for (const yr of yearsToCheck) {
    for (const w of buildDynamicFifaPausesForYear(yr)) {
      if (!seenIds.has(w.id)) {
        seenIds.add(w.id);
        allCandidates.push(w);
      }
    }
  }

  return allCandidates.filter((w) => {
    if (region === 'europe' && w.region === 'south_america') return false;
    if (region === 'south_america' && w.region === 'europe') return false;
    return w.startDate <= periodEnd && w.endDate >= periodStart;
  });
}

/**
 * Filtered list of FIFA pause windows with optional year range & region.
 */
export function getFifaPauseWindows(options?: {
  fromYear?: number;
  toYear?: number;
  region?: 'europe' | 'south_america' | 'all';
}): FifaPauseWindow[] {
  const from = options?.fromYear || 2026;
  const to = options?.toYear || 2030;
  const reg = options?.region || 'all';

  const combined: FifaPauseWindow[] = [];
  const seenIds = new Set<string>();
  for (let yr = from; yr <= to; yr++) {
    for (const w of buildDynamicFifaPausesForYear(yr)) {
      if (seenIds.has(w.id)) continue;
      if (reg === 'europe' && w.region === 'south_america') continue;
      if (reg === 'south_america' && w.region === 'europe') continue;
      seenIds.add(w.id);
      combined.push(w);
    }
  }
  return combined;
}

/**
 * Checks if a specific date (YYYY-MM-DD) falls within any official FIFA pause.
 */
export function isDateInFifaPause(
  dateStr: string,
  region: 'europe' | 'south_america' | 'all' = 'all'
): boolean {
  const yr = parseInt(dateStr.slice(0, 4), 10) || 2026;
  return buildDynamicFifaPausesForYear(yr).some((w) => {
    if (region === 'europe' && w.region === 'south_america') return false;
    if (region === 'south_america' && w.region === 'europe') return false;
    return dateStr >= w.startDate && dateStr <= w.endDate;
  });
}

/**
 * Retrieves the specific FIFA pause window that covers a given date, if any.
 */
export function getFifaPauseForDate(
  dateStr: string,
  region: 'europe' | 'south_america' | 'all' = 'all'
): FifaPauseWindow | null {
  const yr = parseInt(dateStr.slice(0, 4), 10) || 2026;
  const found = buildDynamicFifaPausesForYear(yr).find((w) => {
    if (region === 'europe' && w.region === 'south_america') return false;
    if (region === 'south_america' && w.region === 'europe') return false;
    return dateStr >= w.startDate && dateStr <= w.endDate;
  });
  return found || null;
}

/**
 * Checks if a given weekend (Sunday and adjacent Saturday) overlaps with a FIFA pause.
 */
export function isWeekendInFifaPause(
  sundayDateStr: string,
  region: 'europe' | 'south_america' | 'all' = 'all'
): boolean {
  const satDateStr = addDays(sundayDateStr, -1);
  return isDateInFifaPause(sundayDateStr, region) || isDateInFifaPause(satDateStr, region);
}

/**
 * Exact CBF 2026 Brasileirão Série A 38 matchday dates (CALENDÁRIO DO FUTEBOL DO BRASIL 2026 - CBF):
 * - R01 (28/01 Qua) .. R18 (31/05 Dom)
 * - Parada Copa do Mundo: Recesso (01/06–30/06) + Copa (11/06–19/07) + Intertemporada (01/07–20/07)
 * - R19 (22/07 Qua) .. R38 (02/12 Qua)
 */
const SERIE_A_2026_DATES: string[] = [
  '2026-01-28', '2026-02-04', '2026-02-11', '2026-02-25', '2026-03-11', '2026-03-15', '2026-03-18', '2026-03-22',
  '2026-04-01', '2026-04-05', '2026-04-12', '2026-04-19', '2026-04-26', '2026-05-03', '2026-05-10', '2026-05-17', '2026-05-24', '2026-05-31',
  '2026-07-22', '2026-07-26', '2026-07-29', '2026-08-09', '2026-08-16', '2026-08-23', '2026-08-30', '2026-09-06', '2026-09-13', '2026-09-20',
  '2026-10-08', '2026-10-11', '2026-10-18', '2026-10-25', '2026-10-28', '2026-11-04', '2026-11-18', '2026-11-22', '2026-11-29', '2026-12-02',
];

/**
 * Exact CBF 2026 Brasileirão Série B 38 matchday dates (21/03 a 28/11, pausa Copa 10/06 a 20/07):
 */
const SERIE_B_2026_DATES: string[] = [
  '2026-03-21', '2026-03-31', '2026-04-04', '2026-04-11', '2026-04-18', '2026-04-25', '2026-05-02', '2026-05-09', '2026-05-16', '2026-05-23', '2026-05-30', '2026-06-09',
  '2026-07-21', '2026-07-25', '2026-07-28', '2026-08-08', '2026-08-11', '2026-08-15', '2026-08-18', '2026-08-22', '2026-08-29', '2026-09-05', '2026-09-08', '2026-09-12',
  '2026-09-15', '2026-09-19', '2026-09-26', '2026-10-03', '2026-10-06', '2026-10-10', '2026-10-17', '2026-10-24', '2026-10-31', '2026-11-07', '2026-11-10', '2026-11-14', '2026-11-21', '2026-11-28',
];

function buildDayTimeInfo(dateStr: string, round: number, totalRounds: number = 38): {
  date: string;
  time: string;
  dayOfWeek: string;
} {
  const [y, m, d] = dateStr.split('-').map(Number);
  const targetDate = new Date(y, m - 1, d);
  const dayOfWeekIndex = targetDate.getDay();
  const dayOfWeek = WEEKDAY_FULL_NAMES[dayOfWeekIndex];

  let time = '16:00';
  if (round === totalRounds) {
    time = '16:00';
  } else if (dayOfWeekIndex === 3 || dayOfWeekIndex === 4 || dayOfWeekIndex === 2) {
    time = round % 4 === 0 ? '21:30' : '19:30';
  } else if (dayOfWeekIndex === 6) {
    time = round % 2 === 0 ? '18:30' : '16:30';
  } else if (dayOfWeekIndex === 0) {
    time = round % 3 === 0 ? '18:30' : '16:00';
  }

  return { date: dateStr, time, dayOfWeek };
}

/**
 * Calculates authentic date and kickoff time for Brasileirão Série A & South American league rounds (1..38).
 * - 2026: Uses exact official CBF 2026 Série A schedule (28/01 to 02/12, Copa pause 01/06–20/07).
 * - 2027+: Dynamically obeys the quadrennial mid-year tournament rule:
 *   · 2027, 2031, 2035... (year % 4 === 3): NO Copa pause — continuous calendar!
 *   · 2028, 2032, 2036... (year % 4 === 0): Pause for Copa América & Euro!
 *   · 2029, 2033, 2037... (year % 4 === 1): Pause for Super Mundial de Clubes!
 *   · 2030, 2034, 2038... (year % 4 === 2): Pause for Copa do Mundo!
 */
export function getRoundDate(round: number, baseYear: number = 2026): { date: string; time: string; dayOfWeek: string } {
  if (baseYear === 2026) {
    const idx = Math.max(0, Math.min(37, round - 1));
    return buildDayTimeInfo(SERIE_A_2026_DATES[idx], round);
  }

  const seasonStart = getSeasonStartDate(baseYear); // 2nd Sun Jan
  const estadualFinalSun = addDays(seasonStart, 56); // 8 weeks after Estadual start (~Mar 07-12)
  const firstPostEstSun = addDays(estadualFinalSun, 7);
  const decFirstWed = getNthWeekdayOfMonth(baseYear, 11, 3, 1);

  const saPauses = getFifaPausesForSeason(baseYear, 'south_america');
  const pauses: [string, string][] = saPauses.map((p) => [p.startDate, p.endDate]);

  const cycle = getMidYearTournamentCycle(baseYear);
  if (cycle.pauseStart && cycle.pauseEnd) {
    pauses.push([cycle.pauseStart, cycle.pauseEnd]);
  }

  const isDateBlocked = (dStr: string): boolean =>
    pauses.some(([s, e]) => dStr >= s && dStr <= e);

  // Sundays from post-Estadual mid-March through late-Nov / early-Dec
  const availableSundays: string[] = [];
  let cursor = firstPostEstSun;
  while (cursor < decFirstWed) {
    const sat = addDays(cursor, -1);
    if (!isDateBlocked(cursor) && !isDateBlocked(sat)) {
      availableSundays.push(cursor);
    }
    cursor = addDays(cursor, 7);
  }

  // Opening Brasileirão Wednesday slots (late Jan -> early Mar, matching CBF 2026 R01..R05 structure)
  const earlyOpeningWeds = [
    addDays(seasonStart, 17), // ~Jan 27-31 (R01)
    addDays(seasonStart, 24), // ~Feb 03-07 (R02)
    addDays(seasonStart, 31), // ~Feb 10-14 (R03)
    addDays(seasonStart, 45), // ~Feb 24-28 (R04)
    addDays(seasonStart, 59), // ~Mar 10-14 (R05)
  ].filter((w) => !isDateBlocked(w));

  let matchDates: string[] = [...earlyOpeningWeds, ...availableSundays, decFirstWed]
    .filter((v, idx, arr) => arr.indexOf(v) === idx)
    .sort((a, b) => a.localeCompare(b));

  // If paused mid-year weeks push total below 38, add safe midweek Wednesdays avoiding FIFA pauses
  if (matchDates.length < 38) {
    const needed = 38 - matchDates.length;
    const midweekExtras: string[] = [];
    const copaBr = getCopaBrasilScheduleDates(baseYear);
    const conmebol = getConmebolContinentalScheduleDates(baseYear);
    const cupDates = new Set<string>([
      copaBr.f5IdaDate, copaBr.f5VoltaDate, copaBr.oitavasVoltaDate,
      copaBr.quartasIdaDate, copaBr.quartasVoltaDate,
      ...conmebol.groupDates,
      conmebol.oitavasIdaDate, conmebol.oitavasVoltaDate,
      conmebol.quartasIdaDate, conmebol.quartasVoltaDate,
      conmebol.semiIdaDate, conmebol.semiVoltaDate,
    ]);

    // First prefer clean non-cup Wednesdays between Mar and Nov
    let wedCursor = getNthWeekdayOfMonth(baseYear, 2, 3, 3);
    while (wedCursor < decFirstWed && midweekExtras.length < needed) {
      if (!isDateBlocked(wedCursor) && !matchDates.includes(wedCursor) && !cupDates.has(wedCursor)) {
        midweekExtras.push(wedCursor);
      }
      wedCursor = addDays(wedCursor, 7);
    }

    // Fallback to any non-FIFA Wednesday if still short
    if (midweekExtras.length < needed) {
      wedCursor = getNthWeekdayOfMonth(baseYear, 2, 3, 3);
      while (wedCursor < decFirstWed && midweekExtras.length < needed) {
        if (!isDateBlocked(wedCursor) && !matchDates.includes(wedCursor) && !midweekExtras.includes(wedCursor)) {
          midweekExtras.push(wedCursor);
        }
        wedCursor = addDays(wedCursor, 7);
      }
    }

    matchDates = [...matchDates, ...midweekExtras].sort((a, b) => a.localeCompare(b));
  } else if (matchDates.length > 38) {
    // Prune excess rounds cleanly (prefer pruning early midweeks first, keeping R01 and final R38)
    const earlyMidsToTrim = matchDates
      .slice(1, earlyOpeningWeds.length)
      .reverse();
    for (const em of earlyMidsToTrim) {
      if (matchDates.length <= 38) break;
      matchDates = matchDates.filter((d) => d !== em);
    }
    if (matchDates.length > 38) {
      const excess = matchDates.length - 38;
      const step = Math.floor(matchDates.length / (excess + 1));
      const removeSet = new Set<number>();
      for (let i = 1; i <= excess; i++) {
        removeSet.add(Math.min(matchDates.length - 2, Math.max(1, i * step)));
      }
      matchDates = matchDates.filter((_, idx) => !removeSet.has(idx));
    }
  }

  let dateStr: string;
  if (round <= 1) {
    dateStr = matchDates[0] || `${baseYear}-01-28`;
  } else if (round <= matchDates.length) {
    dateStr = matchDates[round - 1];
  } else {
    dateStr = addDays(matchDates[matchDates.length - 1], (round - matchDates.length) * 3);
  }

  return buildDayTimeInfo(dateStr, round, 38);
}

/**
 * Brasileirão Série B schedule (38 rounds, Saturdays & Tuesdays):
 * - 2026: Exact CBF 2026 Série B schedule (21/03 to 28/11, World Cup break 10/06–20/07).
 * - 2027+: Continuous in non-cup years (2027, 2031...); paused in Copa América (2028...), Super Mundial (2029...), World Cup (2030...).
 */
export function getSerieBRoundDate(round: number, baseYear: number = 2026): { date: string; time: string; dayOfWeek: string } {
  if (baseYear === 2026) {
    const idx = Math.max(0, Math.min(37, round - 1));
    return buildDayTimeInfo(SERIE_B_2026_DATES[idx], round, 38);
  }

  const startSat = getNthWeekdayOfMonth(baseYear, 2, 6, 3); // 3rd Saturday of March
  const endSat = getLastWeekdayOfMonth(baseYear, 10, 6); // Last Saturday of November

  const cycle = getMidYearTournamentCycle(baseYear);
  const pauseStart =
    cycle.kind === 'WORLD_CUP' && cycle.pauseStart
      ? addDays(cycle.pauseStart, 8) // Série B pauses ~Jun 10 before WC
      : cycle.pauseStart;
  const pauseEnd = cycle.pauseEnd;

  const isBlocked = (d: string) =>
    Boolean(pauseStart && pauseEnd && d >= pauseStart && d <= pauseEnd);

  const saturdays: string[] = [];
  let cur = startSat;
  while (cur <= endSat) {
    if (!isBlocked(cur)) saturdays.push(cur);
    cur = addDays(cur, 7);
  }

  let dates = [...saturdays];
  if (dates.length < 38) {
    const needed = 38 - dates.length;
    const tuesdays: string[] = [];
    let tCur = addDays(startSat, 10); // Tuesday
    while (tCur < endSat) {
      if (!isBlocked(tCur)) tuesdays.push(tCur);
      tCur = addDays(tCur, 7);
    }
    if (tuesdays.length > 0) {
      const step = tuesdays.length / needed;
      for (let i = 0; i < needed; i++) {
        const tIdx = Math.min(tuesdays.length - 1, Math.floor(i * step + step * 0.5));
        if (!dates.includes(tuesdays[tIdx])) {
          dates.push(tuesdays[tIdx]);
        }
      }
    }
    dates.sort((a, b) => a.localeCompare(b));
  }

  if (dates.length > 38) {
    const excess = dates.length - 38;
    const step = Math.floor(dates.length / (excess + 1));
    const removeSet = new Set<number>();
    for (let i = 1; i <= excess; i++) {
      removeSet.add(Math.min(dates.length - 2, Math.max(1, i * step)));
    }
    dates = dates.filter((_, idx) => !removeSet.has(idx));
  }

  if (round === 39) {
    const playoffDates = getSerieBPlayoffDates(baseYear);
    return buildDayTimeInfo(playoffDates.playoffIdaDate, 39, 40);
  }
  if (round >= 40) {
    const playoffDates = getSerieBPlayoffDates(baseYear);
    return buildDayTimeInfo(playoffDates.playoffVoltaDate, 40, 40);
  }

  const idx = Math.max(0, Math.min(dates.length - 1, round - 1));
  return buildDayTimeInfo(dates[idx] || endSat, round, 38);
}

/**
 * Datas dos Playoffs de Acesso da Série B (3º x 6º e 4º x 5º em Ida e Volta; os 2 vencedores sobem à Série A),
 * disputados logo após o encerramento da 38ª rodada.
 */
export function getSerieBPlayoffDates(baseYear: number = 2026): {
  regularEndDate: string;
  playoffIdaDate: string;
  playoffVoltaDate: string;
} {
  const regularEndDate =
    baseYear === 2026
      ? SERIE_B_2026_DATES[37]
      : getLastWeekdayOfMonth(baseYear, 10, 6);
  const playoffIdaDate = addDays(regularEndDate, 4);
  const playoffVoltaDate = addDays(regularEndDate, 7);
  return { regularEndDate, playoffIdaDate, playoffVoltaDate };
}

/**
 * Datas dos Playoffs de Acesso da Série C (4º x 7º e 5º x 6º em Ida e Volta; Final em Jogo Único),
 * encerrando a competição em novembro.
 */
export function getSerieCPlayoffDates(baseYear: number = 2027): {
  regularEndDate: string;
  semiIdaDate: string;
  semiVoltaDate: string;
  finalDate: string;
} {
  // 2º domingo de novembro (entre 08/11 e 14/11) encerra as 46 rodadas da fase regular
  const regularEndDate = getNthWeekdayOfMonth(baseYear, 10, 0, 2);
  // Semifinais Ida (Quinta, +4d) e Volta (Domingo, +7d) -> Final Jogo Único no último domingo de Nov (+14d, entre 22/11 e 28/11)
  const semiIdaDate = addDays(regularEndDate, 4);
  const semiVoltaDate = addDays(regularEndDate, 7);
  const finalDate = addDays(regularEndDate, 14);
  return { regularEndDate, semiIdaDate, semiVoltaDate, finalDate };
}

/**
 * Brasileirão Série C 2027+ schedule:
 * 24 clubes em turno e returno = 46 rodadas (início no 1º domingo de abril até 2º domingo de novembro),
 * seguidas pelos Playoffs de Acesso (4º–7º) encerrando em novembro.
 */
export function getSerieCRoundDate(
  round: number,
  baseYear: number = 2027
): { date: string; time: string; dayOfWeek: string } {
  const playoffDates = getSerieCPlayoffDates(baseYear);
  if (round === 47) return buildDayTimeInfo(playoffDates.semiIdaDate, 47, 49);
  if (round === 48) return buildDayTimeInfo(playoffDates.semiVoltaDate, 48, 49);
  if (round >= 49) return buildDayTimeInfo(playoffDates.finalDate, 49, 49);

  const startSun = getNthWeekdayOfMonth(baseYear, 3, 0, 1);
  const endSun = playoffDates.regularEndDate;

  const sundays: string[] = [];
  let cur = startSun;
  while (cur <= endSun) {
    sundays.push(cur);
    cur = addDays(cur, 7);
  }

  const dates: string[] = [...sundays];
  const neededMidweeks = Math.max(0, 46 - dates.length);
  if (neededMidweeks > 0 && sundays.length > 1) {
    // Distribui as rodadas de meio de semana (quarta-feira) de forma uniforme ao longo das semanas
    const availableWeeks = sundays.length - 1;
    const chosenWeeks = new Set<number>();
    for (let i = 0; i < neededMidweeks; i++) {
      let w = Math.floor(((i + 0.5) * availableWeeks) / neededMidweeks);
      w = Math.max(0, Math.min(availableWeeks - 1, w));
      while (chosenWeeks.has(w) && w < availableWeeks - 1) w++;
      while (chosenWeeks.has(w) && w > 0) w--;
      chosenWeeks.add(w);
    }
    Array.from(chosenWeeks)
      .sort((a, b) => a - b)
      .forEach((w) => {
        const mw = addDays(sundays[w], 3); // Quarta-feira
        if (mw < endSun && !dates.includes(mw)) {
          dates.push(mw);
        }
      });
    dates.sort((a, b) => a.localeCompare(b));
  }

  const idx = Math.max(0, Math.min(dates.length - 1, round - 1));
  return buildDayTimeInfo(dates[idx] || endSun, round, 46);
}

/**
 * Brasileirão Série D 2026/2027+ schedule (22 datas: 10 rodadas de grupos + 12 datas de mata-mata).
 * - CBF 2027: Início em 04/04/2027 e encerramento em 12/09/2027!
 */
export function getSerieDScheduleDates(year: number = 2027): string[] {
  if (year === 2027) {
    return [
      // 10 Rodadas Fase de Grupos (04/04/2027 a 06/06/2027)
      '2027-04-04', '2027-04-11', '2027-04-18', '2027-04-25', '2027-05-02',
      '2027-05-09', '2027-05-16', '2027-05-23', '2027-05-30', '2027-06-06',
      // 2ª Fase (Ida/Volta — 64 clubes)
      '2027-06-20', '2027-06-27',
      // 3ª Fase / 16-avos (Ida/Volta — 32 clubes, garante vaga na Série D seguinte)
      '2027-07-04', '2027-07-11',
      // 4ª Fase / Oitavas (Ida/Volta — 16 clubes)
      '2027-07-18', '2027-07-25',
      // 5ª Fase / Quartas de Final - Valendo Acesso (Ida/Volta — 8 clubes, ranqueados 1ºx8º..4ºx5º)
      '2027-08-08', '2027-08-15',
      // Semifinal (Ida/Volta — 4 clubes promovidos, ranqueados 1ºx4º e 2ºx3º)
      '2027-08-22', '2027-08-29',
      // Grande Final (Ida/Volta — encerramento oficial em 12/09/2027!)
      '2027-09-05', '2027-09-12',
    ];
  }

  if (year === 2026) {
    return [
      // 10 Rodadas Fase de Grupos
      '2026-04-05', '2026-04-12', '2026-04-19', '2026-04-26', '2026-05-03',
      '2026-05-10', '2026-05-17', '2026-05-24', '2026-05-31', '2026-06-14',
      // 2ª Fase (Ida/Volta)
      '2026-06-21', '2026-06-28',
      // 3ª Fase (Ida/Volta)
      '2026-07-05', '2026-07-12',
      // Oitavas (Ida/Volta)
      '2026-07-18', '2026-07-26',
      // Quartas / Acesso (Ida/Volta)
      '2026-08-09', '2026-08-16',
      // Semifinal (Ida/Volta)
      '2026-08-23', '2026-08-30',
      // Grande Final (Ida/Volta — encerrando na data oficial CBF 13/09/2026!)
      '2026-09-06', '2026-09-13',
    ];
  }

  const startSun = getNthWeekdayOfMonth(year, 3, 0, 1);
  const dates: string[] = [];
  for (let i = 0; i < 22; i++) {
    // Include 1-week breaks after group stage (idx 10) and after Round of 16 (idx 16)
    const breakWeeks = i >= 16 ? 2 : i >= 10 ? 1 : 0;
    dates.push(addDays(startSun, (i + breakWeeks) * 7));
  }
  return dates;
}

/**
 * Formats YYYY-MM-DD into "Quarta-feira, 15 de Abril de 2026"
 */
export function formatCalendarDate(dateStr: string): string {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  const weekday = WEEKDAY_FULL_NAMES[dt.getDay()];
  const monthName = MONTH_NAMES[dt.getMonth()];
  return `${weekday}, ${d} de ${monthName} de ${y}`;
}

/**
 * Formats YYYY-MM-DD into "Qua, 15/04"
 */
export function formatShortDate(dateStr: string): string {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  const weekday = WEEKDAY_NAMES[dt.getDay()];
  const dd = String(d).padStart(2, '0');
  const mm = String(m).padStart(2, '0');
  return `${weekday}, ${dd}/${mm}`;
}

/**
 * Adds N days to YYYY-MM-DD and returns new YYYY-MM-DD
 */
export function addDays(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + days);
  const nextY = dt.getFullYear();
  const nextM = String(dt.getMonth() + 1).padStart(2, '0');
  const nextD = String(dt.getDate()).padStart(2, '0');
  return `${nextY}-${nextM}-${nextD}`;
}

/**
 * Compares two dates: negative if d1 < d2, 0 if equal, positive if d1 > d2
 */
export function compareDates(d1: string, d2: string): number {
  return d1.localeCompare(d2);
}

/**
 * Calculates days between two YYYY-MM-DD dates (d2 - d1)
 */
export function daysBetween(d1: string, d2: string): number {
  const [y1, m1, day1] = d1.split('-').map(Number);
  const [y2, m2, day2] = d2.split('-').map(Number);
  const dt1 = new Date(y1, m1 - 1, day1);
  const dt2 = new Date(y2, m2 - 1, day2);
  const diffTime = dt2.getTime() - dt1.getTime();
  return Math.round(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Finds the earliest unplayed fixture for a club (including any overdue unplayed match
 * whose date fell before currentDate so no group-stage or knockout game can ever be skipped).
 */
export function getUpcomingClubFixture(
  fixtures: Fixture[],
  clubId: string,
  _currentDate: string
): Fixture | null {
  const isRealClub = (id?: string) =>
    Boolean(id && id !== 'tbd' && !id.startsWith('TBD'));

  const unplayed = fixtures.filter(
    (f) =>
      !f.played &&
      isRealClub(f.homeTeamId) &&
      isRealClub(f.awayTeamId) &&
      (f.homeTeamId === clubId || f.awayTeamId === clubId)
  );

  if (unplayed.length === 0) return null;

  return unplayed.sort((a, b) => {
    if (a.date && b.date) {
      const cmp = a.date.localeCompare(b.date);
      if (cmp !== 0) return cmp;
    } else if (a.date && !b.date) {
      return -1;
    } else if (!a.date && b.date) {
      return 1;
    }
    const legCmp = (a.leg || 0) - (b.leg || 0);
    if (legCmp !== 0) return legCmp;
    return (a.round || 0) - (b.round || 0);
  })[0];
}

/**
 * Returns grid of days for a monthly calendar view (including leading and trailing days)
 */
export function getMonthCalendarGrid(year: number, monthIndex: number): Date[] {
  const firstDayOfMonth = new Date(year, monthIndex, 1);
  const startDayOfWeek = firstDayOfMonth.getDay(); // 0 = Sunday
  
  const grid: Date[] = [];
  
  // Leading days from previous month
  for (let i = startDayOfWeek - 1; i >= 0; i--) {
    const d = new Date(year, monthIndex, 1 - (i + 1));
    grid.push(d);
  }

  // Days in current month
  const lastDayOfMonth = new Date(year, monthIndex + 1, 0).getDate();
  for (let day = 1; day <= lastDayOfMonth; day++) {
    grid.push(new Date(year, monthIndex, day));
  }

  // Trailing days to fill 35 or 42 grid cells
  const remainingCells = 42 - grid.length;
  if (remainingCells > 0 && remainingCells < 7) {
    for (let day = 1; day <= remainingCells; day++) {
      grid.push(new Date(year, monthIndex + 1, day));
    }
  } else if (grid.length < 35) {
    const fillTo35 = 35 - grid.length;
    for (let day = 1; day <= fillTo35; day++) {
      grid.push(new Date(year, monthIndex + 1, day));
    }
  }

  return grid;
}

/**
 * Converts Date object to YYYY-MM-DD
 */
export function toDateString(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Formats a European split-year season label (e.g. 2026 -> "2026/27")
 */
export function formatEuropeanSeason(startYear: number = 2026): string {
  const shortNext = String((startYear + 1) % 100).padStart(2, '0');
  return `${startYear}/${shortNext}`;
}

/**
 * Official European pre-season / Summer Window start date: August 1 of `startYear`
 */
export function getEuropeanSeasonStartDate(startYear: number = 2026): string {
  return `${startYear}-08-01`;
}

/**
 * Cutoff date after all European domestic leagues and UEFA Finals conclude in late May `startYear + 1`
 */
export function getEuropeanSeasonEndCutoffDate(startYear: number = 2026): string {
  return `${startYear + 1}-06-10`;
}

export function getNthWeekdayOfMonth(
  year: number,
  monthZero: number,
  weekday: number,
  nth: number
): string {
  const first = new Date(year, monthZero, 1);
  const diff = (weekday - first.getDay() + 7) % 7;
  const day = 1 + diff + (nth - 1) * 7;
  return toDateString(new Date(year, monthZero, day));
}

function getLastWeekdayOfMonth(year: number, monthZero: number, weekday: number): string {
  const last = new Date(year, monthZero + 1, 0);
  const diff = (last.getDay() - weekday + 7) % 7;
  return toDateString(new Date(year, monthZero, last.getDate() - diff));
}

export interface FifaWindowYearDates {
  mar1: string;
  mar2: string;
  jun1: string;
  jun2: string;
  sep1: string;
  sep2: string;
  oct1: string;
  oct2: string;
  nov1: string;
  nov2: string;
  // Super FIFA Window match dates (2027, 2028, 2029)
  superMatch1?: string;
  superMatch2?: string;
  superMatch3?: string;
  superMatch4?: string;
}

/**
 * Computes official real-world FIFA International Match Calendar dates (Thursday + Tuesday pairs
 * and 4-match Super Data FIFA windows) for European and global national teams up to 2030 World Cup.
 */
export function getFifaWindowDatesForYear(year: number): FifaWindowYearDates {
  if (year === 2026) {
    // 23 a 31 de março (Amistosos - 2 jogos)
    // 1 a 9 de junho (Amistosos - 2 jogos)
    // 21 de setembro a 6 de outubro (Data FIFA - 4 jogos)
    // 9 a 17 de novembro (Data FIFA - 2 jogos)
    return {
      mar1: '2026-03-26',
      mar2: '2026-03-31',
      jun1: '2026-06-04',
      jun2: '2026-06-09',
      sep1: '2026-09-24',
      sep2: '2026-09-28',
      oct1: '2026-10-02',
      oct2: '2026-10-06',
      nov1: '2026-11-12',
      nov2: '2026-11-17',
      superMatch1: '2026-09-24',
      superMatch2: '2026-09-28',
      superMatch3: '2026-10-02',
      superMatch4: '2026-10-06',
    };
  }

  if (year === 2027) {
    // 22 a 30 de março de 2027 (Data FIFA - 2 jogos)
    // 7 a 15 de junho de 2027 (Data FIFA - 2 jogos)
    // 20 de setembro a 5 de outubro de 2027 (Data FIFA - 4 jogos)
    // 8 a 16 de novembro de 2027 (Data FIFA - 2 jogos)
    return {
      mar1: '2027-03-25',
      mar2: '2027-03-30',
      jun1: '2027-06-10',
      jun2: '2027-06-15',
      sep1: '2027-09-23',
      sep2: '2027-09-26',
      oct1: '2027-09-30',
      oct2: '2027-10-05',
      nov1: '2027-11-11',
      nov2: '2027-11-16',
      superMatch1: '2027-09-23',
      superMatch2: '2027-09-26',
      superMatch3: '2027-09-30',
      superMatch4: '2027-10-05',
    };
  }

  if (year === 2028) {
    // 20 a 28 de março de 2028 (Data FIFA - 2 jogos)
    // 29 de maio a 6 de junho de 2028 (Data FIFA - 2 jogos)
    // 18 de setembro a 3 de outubro de 2028 (Data FIFA - 4 jogos)
    // 13 a 21 de novembro de 2028 (Data FIFA - 2 jogos)
    return {
      mar1: '2028-03-23',
      mar2: '2028-03-28',
      jun1: '2028-06-01',
      jun2: '2028-06-06',
      sep1: '2028-09-21',
      sep2: '2028-09-24',
      oct1: '2028-09-28',
      oct2: '2028-10-03',
      nov1: '2028-11-16',
      nov2: '2028-11-21',
      superMatch1: '2028-09-21',
      superMatch2: '2028-09-24',
      superMatch3: '2028-09-28',
      superMatch4: '2028-10-03',
    };
  }

  if (year === 2029) {
    // 19 a 27 de março de 2029 (Data FIFA - 2 jogos)
    // 4 a 12 de junho de 2029 (Data FIFA - 2 jogos)
    // 29 de setembro a 9 de outubro de 2029 (Data FIFA - 4 jogos)
    // 12 a 20 de novembro de 2029 (Data FIFA - 2 jogos)
    return {
      mar1: '2029-03-22',
      mar2: '2029-03-27',
      jun1: '2029-06-07',
      jun2: '2029-06-12',
      sep1: '2029-09-29',
      sep2: '2029-10-02',
      oct1: '2029-10-05',
      oct2: '2029-10-09',
      nov1: '2029-11-15',
      nov2: '2029-11-20',
      superMatch1: '2029-09-29',
      superMatch2: '2029-10-02',
      superMatch3: '2029-10-05',
      superMatch4: '2029-10-09',
    };
  }

  if (year === 2030) {
    // 18 a 26 de março de 2030 (Data FIFA - 2 jogos)
    // 3 a 11 de junho de 2030 (Data FIFA - 2 jogos)
    // 23 de setembro a 8 de outubro de 2030 (Data FIFA - 4 jogos)
    // 11 a 19 de novembro de 2030 (Data FIFA - 2 jogos)
    return {
      mar1: '2030-03-21',
      mar2: '2030-03-26',
      jun1: '2030-06-05',
      jun2: '2030-06-11',
      sep1: '2030-09-26',
      sep2: '2030-09-29',
      oct1: '2030-10-03',
      oct2: '2030-10-08',
      nov1: '2030-11-14',
      nov2: '2030-11-19',
      superMatch1: '2030-09-26',
      superMatch2: '2030-09-29',
      superMatch3: '2030-10-03',
      superMatch4: '2030-10-08',
    };
  }

  // Quadrennial calculation for 2031–2038+ matching official FIFA calendar cadence
  const rawMar4 = getNthWeekdayOfMonth(year, 2, 4, 4); // 4th Thursday of March
  const mar1 = Number(rawMar4.slice(8, 10)) > 25 ? addDays(rawMar4, -7) : rawMar4; // ~Mar 19–25
  const mar2 = addDays(mar1, 5); // Following Tuesday (~Mar 24–30)

  const firstJunThu = getNthWeekdayOfMonth(year, 5, 4, 1); // Jun 1–7
  let jun1 = firstJunThu;
  let jun2 = addDays(jun1, 5);
  if (year % 4 === 0) {
    // Continental Cup years (2032, 2036): late May / early June (finishes before Jun 9–14 tournaments)
    if (Number(firstJunThu.slice(8, 10)) >= 4) {
      jun1 = addDays(firstJunThu, -2); // ~Jun 2–5
    }
    jun2 = addDays(jun1, 4);
  } else if (year % 4 === 2) {
    // World Cup years (2034, 2038): early June pre-WC friendlies (finishes before Jun 11)
    jun1 = Number(firstJunThu.slice(8, 10)) > 5 ? addDays(firstJunThu, -2) : firstJunThu;
    jun2 = addDays(jun1, 4);
  } else {
    // Non-summer-tournament years (2031, 2033, 2035, 2037)
    jun1 = Number(firstJunThu.slice(8, 10)) < 4 ? addDays(firstJunThu, 7) : firstJunThu;
    jun2 = addDays(jun1, 5);
  }

  // Sep/Oct 16-day Super Data FIFA (4 games: Late Sep -> Early Oct)
  const thirdSepThu = getNthWeekdayOfMonth(year, 8, 4, 3); // Sep 15–21
  const sep1 = Number(thirdSepThu.slice(8, 10)) < 20 ? addDays(thirdSepThu, 7) : thirdSepThu; // ~Sep 20–26
  const sep2 = addDays(sep1, 3);
  const oct1 = addDays(sep1, 7);
  const oct2 = addDays(sep1, 12); // ~Oct 2–8

  const nov1 = getNthWeekdayOfMonth(year, 10, 4, 2); // 2nd Thursday of November (~Nov 8–14)
  const nov2 = addDays(nov1, 5); // Following Tuesday (~Nov 13–19)

  return {
    mar1,
    mar2,
    jun1,
    jun2,
    sep1,
    sep2,
    oct1,
    oct2,
    nov1,
    nov2,
    superMatch1: sep1,
    superMatch2: sep2,
    superMatch3: oct1,
    superMatch4: oct2,
  };
}

/**
 * Builds the 38 official European domestic weekend dates from the 3rd Sunday of August `startYear`
 * through the 3rd/4th Sunday of May `startYear + 1` (crossing December `startYear` -> January `startYear + 1`).
 * Explicitly protects real-life FIFA windows and Christmas/New Year breaks.
 */
export function getEuropeanLeagueWeekendSundays(startYear: number = 2026): string[] {
  const thirdSunAug = getNthWeekdayOfMonth(startYear, 7, 0, 3); // Month 7 = August, 0 = Sunday (~Aug 15-21)
  const lastSatMayNext = getLastWeekdayOfMonth(startYear + 1, 4, 6); // Last Saturday of May (UCL Final)
  const lastLeagueSunMay = addDays(lastSatMayNext, -6); // Sunday before UCL Final (~May 23-24)

  const allSundays: string[] = [];
  let cursor = thirdSunAug;
  while (cursor <= lastLeagueSunMay) {
    allSundays.push(cursor);
    cursor = addDays(cursor, 7);
  }

  // Dynamically calculate official FIFA pauses for European calendar in this season (2026 to 2030)
  const fifaPauses = getFifaPausesForSeason(startYear, 'europe');
  const fifaPauseRanges: [string, string][] = fifaPauses.map((p) => [p.startDate, p.endDate]);

  // Filter out Sundays falling strictly inside real FIFA international windows (checking full weekend)
  const nonFifaSundays = allSundays.filter(
    (sun) => !fifaPauseRanges.some(([start, end]) => {
      const sat = addDays(sun, -1);
      return (sun >= start && sun <= end) || (sat >= start && sat <= end);
    })
  );

  // Backfill if FIFA breaks reduce weekend count below 38 (prefer safe final May Sunday before June window, then non-UEFA/non-FIFA Wednesdays)
  if (nonFifaSundays.length < 38) {
    const uefaSched = getUefaCompetitionCalendarDates(startYear);
    const uefaSet = new Set<string>([
      ...uefaSched.uclLeagueDates,
      ...uefaSched.uelLeagueDates,
      ...uefaSched.ueclLeagueDates,
      uefaSched.playoffsIdaDate,
      uefaSched.playoffsVoltaDate,
      uefaSched.r16IdaDate,
      uefaSched.r16VoltaDate,
      uefaSched.qfIdaDate,
      uefaSched.qfVoltaDate,
      uefaSched.semiIdaDate,
      uefaSched.semiVoltaDate,
      uefaSched.uelFinalDate,
      uefaSched.ueclFinalDate,
      uefaSched.uclFinalDate,
    ]);

    const candidateList: string[] = [addDays(lastLeagueSunMay, 7)];
    // Every Wednesday from September of startYear through May of startYear + 1
    let wedCur = addDays(thirdSunAug, 17); // ~early Sep Wednesday
    while (wedCur <= lastLeagueSunMay) {
      const inWinterHol = wedCur >= `${startYear}-12-22` && wedCur <= `${startYear + 1}-01-05`;
      if (!inWinterHol) {
        candidateList.push(wedCur);
      }
      wedCur = addDays(wedCur, 7);
    }

    for (const c of candidateList) {
      if (nonFifaSundays.length >= 38) break;
      if (nonFifaSundays.includes(c) || uefaSet.has(c)) continue;
      // Avoid Thu UEL/UECL overlap too (+1 day)
      const thuNext = addDays(c, 1);
      if (uefaSet.has(thuNext)) continue;
      const inPause = fifaPauseRanges.some(([s, e]) => c >= s && c <= e);
      if (!inPause) {
        nonFifaSundays.push(c);
      }
    }
    nonFifaSundays.sort((a, b) => a.localeCompare(b));
  }

  // If still longer than 38 rounds, skip the Christmas/New Year winter break Sunday (~Dec 27 - Jan 2)
  if (nonFifaSundays.length > 38) {
    const decWinterBreak = nonFifaSundays.findIndex(
      (s) => s >= `${startYear}-12-24` && s <= `${startYear + 1}-01-03`
    );
    if (decWinterBreak >= 0) {
      nonFifaSundays.splice(decWinterBreak, 1);
    }
  }

  // Trim to exactly 38 rounds
  while (nonFifaSundays.length > 38) {
    // Drop the penultimate spare week
    nonFifaSundays.splice(nonFifaSundays.length - 2, 1);
  }

  return nonFifaSundays;
}

/**
 * Returns real-life split-year UEFA competition dates (`startYear` Sep–Dec + `startYear + 1` Jan–May):
 * - UCL & UEL: 8 League Phase rounds (6 in Sep–Dec `startYear` + 2 in late Jan `startYear + 1`)
 * - UECL: 6 League Phase rounds (Oct–Dec `startYear`)
 * - Playoffs (Feb `startYear + 1`), Round of 16 (Mar `startYear + 1`), Quarterfinals (Apr `startYear + 1`),
 *   Semifinals (Apr/May `startYear + 1`), and Single-Leg Finals in late May `startYear + 1`.
 */
/**
 * Returns official real-life split-year UEFA competition dates (`startYear` Sep–Dec + `startYear + 1` Jan–Jun):
 * Aligned with the official UEFA 2026/27 international calendar:
 * - Champions League (UCL): 8 League rounds + Knockouts (Playoffs Fev, R16 Mar, QF Abr, SF Abr/Mai, Final 5 de junho de 2027 no Metropolitano em Madrid)
 * - Europa League (UEL): 8 League rounds + Knockouts (Final 26 de maio de 2027 no Waldstadion em Frankfurt)
 * - Conference League (UECL): 6 League rounds + Knockouts (Final 2 de junho de 2027 no Beşiktaş Stadium em Istambul)
 */
export function getUefaCompetitionCalendarDates(startYear: number = 2026): {
  uclLeagueDates: string[];
  uelLeagueDates: string[];
  ueclLeagueDates: string[];
  playoffsIdaDate: string;
  playoffsVoltaDate: string;
  r16IdaDate: string;
  r16VoltaDate: string;
  qfIdaDate: string;
  qfVoltaDate: string;
  semiIdaDate: string;
  semiVoltaDate: string;
  uelFinalDate: string;
  ueclFinalDate: string;
  uclFinalDate: string;
} {
  const nextYear = startYear + 1;

  if (startYear === 2026) {
    return {
      // UCL: 8 rodadas (8-10 Set, 13-14 Out, 20-21 Out, 3-4 Nov, 24-25 Nov, 8-9 Dez, 19-20 Jan, 27 Jan)
      uclLeagueDates: [
        '2026-09-09',
        '2026-10-14',
        '2026-10-21',
        '2026-11-04',
        '2026-11-25',
        '2026-12-09',
        '2027-01-20',
        '2027-01-27',
      ],
      // UEL: 8 rodadas (16-17 Set, 15 Out, 22 Out, 5 Nov, 26 Nov, 10 Dez, 21 Jan, 28 Jan)
      uelLeagueDates: [
        '2026-09-17',
        '2026-10-15',
        '2026-10-22',
        '2026-11-05',
        '2026-11-26',
        '2026-12-10',
        '2027-01-21',
        '2027-01-28',
      ],
      // UECL: 6 rodadas (15 Out, 22 Out, 5 Nov, 26 Nov, 10 Dez, 17 Dez)
      ueclLeagueDates: [
        '2026-10-15',
        '2026-10-22',
        '2026-11-05',
        '2026-11-26',
        '2026-12-10',
        '2026-12-17',
      ],
      // Knockout stages
      playoffsIdaDate: '2027-02-17',
      playoffsVoltaDate: '2027-02-24',
      r16IdaDate: '2027-03-10',
      r16VoltaDate: '2027-03-17',
      qfIdaDate: '2027-04-07',
      qfVoltaDate: '2027-04-14',
      semiIdaDate: '2027-04-28',
      semiVoltaDate: '2027-05-05',
      uelFinalDate: '2027-05-26', // Waldstadion, Frankfurt
      ueclFinalDate: '2027-06-02', // Beşiktaş Stadium, Istambul
      uclFinalDate: '2027-06-05', // Estádio Metropolitano, Madrid
    };
  }

  // Fallback for subsequent seasons
  const sepWed3 = getNthWeekdayOfMonth(startYear, 8, 3, 3);
  const r2Wed = addDays(sepWed3, 14);
  const r3Wed = addDays(sepWed3, 35);
  const r4Wed = addDays(sepWed3, 49);
  const r5Wed = addDays(sepWed3, 70);
  const r6Wed = addDays(sepWed3, 84);
  const janWed3 = getNthWeekdayOfMonth(nextYear, 0, 3, 3);
  const janWed4 = addDays(janWed3, 7);

  const uclLeagueDates = [sepWed3, r2Wed, r3Wed, r4Wed, r5Wed, r6Wed, janWed3, janWed4];
  const uelLeagueDates = uclLeagueDates.map((d, i) => (i === 7 ? d : addDays(d, 1)));

  const ueclLeagueDates = [
    addDays(r2Wed, 1),
    addDays(r3Wed, 1),
    addDays(r4Wed, 1),
    addDays(r5Wed, 1),
    addDays(r6Wed, 1),
    addDays(r6Wed, 8),
  ];

  const playoffsIdaDate = getNthWeekdayOfMonth(nextYear, 1, 3, 2);
  const playoffsVoltaDate = addDays(playoffsIdaDate, 7);
  const r16IdaDate = getNthWeekdayOfMonth(nextYear, 2, 3, 1);
  const r16VoltaDate = addDays(r16IdaDate, 7);
  const qfIdaDate = getNthWeekdayOfMonth(nextYear, 3, 3, 2);
  const qfVoltaDate = addDays(qfIdaDate, 7);
  const semiIdaDate = getLastWeekdayOfMonth(nextYear, 3, 3);
  const semiVoltaDate = addDays(semiIdaDate, 7);

  const uclFinalDate = `${nextYear}-06-05`;
  const ueclFinalDate = addDays(uclFinalDate, -3);
  const uelFinalDate = addDays(uclFinalDate, -10);

  return {
    uclLeagueDates,
    uelLeagueDates,
    ueclLeagueDates,
    playoffsIdaDate,
    playoffsVoltaDate,
    r16IdaDate,
    r16VoltaDate,
    qfIdaDate,
    qfVoltaDate,
    semiIdaDate,
    semiVoltaDate,
    uelFinalDate,
    ueclFinalDate,
    uclFinalDate,
  };
}

/**
 * Returns authentic date schedule for each European league based on confirmed official dates:
 * - La Liga: 14-16 de agosto de 2026 até 30 de maio de 2027 (38 rodadas)
 * - Premier League: 21-22 de agosto de 2026 até 30 de maio de 2027 (38 rodadas)
 * - Ligue 1: 21-23 de agosto de 2026 até 29 de maio de 2027 (34 rodadas)
 * - Serie A: 22-23 de agosto de 2026 até 30 de maio de 2027 (38 rodadas)
 * - Bundesliga: 28 de agosto de 2026 até 22 de maio de 2027 (34 rodadas)
 * - Eredivisie: 7-9 de agosto de 2026 até 23 de maio de 2027 (34 rodadas)
 * - Liga Portugal: agosto de 2026 até 16 de maio de 2027 (34 rodadas)
 * - Jupiler Pro League: agosto de 2026 até 23 de maio de 2027 (34 rodadas)
 * - Demais ligas: início depois de 15 de agosto e término até o fim de maio,
 *   sem colisão com copas locais (terças/quartas), continentais (terças/quartas/quintas) e datas FIFA!
 */
export function getEuropeanLeagueScheduleDates(
  leagueId: string,
  totalRounds: number,
  seasonYear: number = 2026
): { date: string; time: string }[] {
  const nextYear = seasonYear + 1;

  // Real-life confirmed start and end limits
  let startSunday = `${seasonYear}-08-23`;
  let endSunday = `${nextYear}-05-30`;
  let finalDayOfWeek = 0; // Sunday = 0, Saturday = 6

  if (leagueId === 'esp_laliga') {
    // 14 a 16 de agosto de 2026 até 30 de maio de 2027
    startSunday = `${seasonYear}-08-16`;
    endSunday = `${nextYear}-05-30`;
  } else if (leagueId === 'esp_laliga2') {
    // 15 de agosto de 2026 até 16 de maio de 2027 (42 rodadas antes dos Play-offs 3º–6º em Ida e Volta)
    startSunday = `${seasonYear}-08-16`;
    endSunday = `${nextYear}-05-16`;
  } else if (leagueId === 'eng_premier') {
    // 21 e 22 de agosto de 2026 até 30 de maio de 2027
    startSunday = `${seasonYear}-08-23`;
    endSunday = `${nextYear}-05-30`;
  } else if (leagueId === 'fra_ligue1') {
    // 21 a 23 de agosto de 2026 até 22 de maio de 2027 (antes do Barrage Ligue 1 x Ligue 2)
    startSunday = `${seasonYear}-08-23`;
    endSunday = `${nextYear}-05-22`;
    finalDayOfWeek = 6;
  } else if (leagueId === 'fra_ligue2') {
    // 15 de agosto de 2026 até 15 de maio de 2027 (antes dos Play-offs 3º–5º e Barrage Ida/Volta)
    startSunday = `${seasonYear}-08-16`;
    endSunday = `${nextYear}-05-15`;
    finalDayOfWeek = 6;
  } else if (leagueId === 'ita_serie_a') {
    // 22 e 23 de agosto de 2026 até 30 de maio de 2027
    startSunday = `${seasonYear}-08-23`;
    endSunday = `${nextYear}-05-30`;
  } else if (leagueId === 'ita_serie_b') {
    // 16 de agosto de 2026 até 10 de maio de 2027 (38 rodadas antes dos Playoffs 3º–8º e Playout 16º×17º)
    startSunday = `${seasonYear}-08-16`;
    endSunday = `${nextYear}-05-10`;
  } else if (leagueId === 'ger_bundesliga' || leagueId === 'ger_bundesliga2') {
    // 28 de agosto de 2026 até 22 de maio de 2027 (antes do Playoff de Acesso/Rebaixamento)
    startSunday = `${seasonYear}-08-30`;
    endSunday = `${nextYear}-05-22`;
    finalDayOfWeek = 6;
  } else if (leagueId === 'ned_eredivisie') {
    // 7 a 9 de agosto de 2026 até 23 de maio de 2027
    startSunday = `${seasonYear}-08-09`;
    endSunday = `${nextYear}-05-23`;
  } else if (leagueId === 'por_primeira') {
    // Início agosto de 2026 até 16 de maio de 2027
    startSunday = `${seasonYear}-08-23`;
    endSunday = `${nextYear}-05-16`;
  } else if (leagueId === 'bel_pro_league') {
    // Encerramento em 23 de maio de 2027
    startSunday = `${seasonYear}-08-23`;
    endSunday = `${nextYear}-05-23`;
  } else {
    // Demais ligas: início depois de 15 de agosto até o fim de maio
    startSunday = `${seasonYear}-08-23`;
    endSunday = totalRounds <= 34 ? `${nextYear}-05-23` : `${nextYear}-05-30`;
  }

  // Snap startSunday to actual Sunday so Saturday/Sunday checks stay weekend-aligned across all years (2026–2035+)
  const rawStartDow = new Date(`${startSunday}T12:00:00Z`).getUTCDay();
  if (rawStartDow !== 0) {
    startSunday = addDays(startSunday, -rawStartDow);
  }

  // Generate candidate Sundays between startSunday and endSunday
  const candidateSundays: string[] = [];
  let cur = startSunday;
  while (cur <= endSunday) {
    candidateSundays.push(cur);
    cur = addDays(cur, 7);
  }

  // Dynamically calculate official FIFA pauses for European calendar in this season (2026 to 2030)
  const seasonFifaPauses = getFifaPausesForSeason(seasonYear, 'europe');
  const fifaPauses: [string, string][] = seasonFifaPauses.map((p) => [p.startDate, p.endDate]);

  // Specific cup / supercup pauses per country
  if (leagueId === 'esp_laliga') {
    fifaPauses.push([`${nextYear}-02-02`, `${nextYear}-02-07`]); // Supercopa da Espanha
  } else if (leagueId === 'ger_bundesliga' || leagueId === 'ger_bundesliga2') {
    // German winter break (late Dec to mid Jan)
    fifaPauses.push([`${seasonYear}-12-21`, `${nextYear}-01-08`]);
  }

  // Filter out dates falling inside pauses (weekend Saturday + Sunday protection)
  let availableSlots = candidateSundays.filter(
    (sun) => !fifaPauses.some(([pStart, pEnd]) => {
      const sat = addDays(sun, -1);
      return (sun >= pStart && sun <= pEnd) || (sat >= pStart && sat <= pEnd);
    })
  );

  // If available weekend slots are fewer than totalRounds, add Wednesday midweeks that don't collide with UEFA or FIFA
  if (availableSlots.length < totalRounds) {
    const needed = totalRounds - availableSlots.length;
    const midweeks: string[] = [];

    // Dynamically build set of all UEFA continental match dates to avoid collisions
    const uefaSchedule = getUefaCompetitionCalendarDates(seasonYear);
    const uefaMatches = new Set([
      ...uefaSchedule.uclLeagueDates,
      ...uefaSchedule.uelLeagueDates,
      ...uefaSchedule.ueclLeagueDates,
      uefaSchedule.playoffsIdaDate,
      uefaSchedule.playoffsVoltaDate,
      uefaSchedule.r16IdaDate,
      uefaSchedule.r16VoltaDate,
      uefaSchedule.qfIdaDate,
      uefaSchedule.qfVoltaDate,
      uefaSchedule.semiIdaDate,
      uefaSchedule.semiVoltaDate,
      uefaSchedule.uelFinalDate,
      uefaSchedule.ueclFinalDate,
      uefaSchedule.uclFinalDate,
    ]);

    const candidateMidweeks: string[] = [];
    let wedCur = addDays(startSunday, 10); // First mid-season Wednesday
    while (wedCur < endSunday) {
      const inWinterHol = wedCur >= `${seasonYear}-12-22` && wedCur <= `${nextYear}-01-05`;
      if (!inWinterHol) {
        candidateMidweeks.push(wedCur);
      }
      wedCur = addDays(wedCur, 7);
    }

    for (const cm of candidateMidweeks) {
      if (
        midweeks.length < needed &&
        !availableSlots.includes(cm) &&
        !uefaMatches.has(cm) &&
        !uefaMatches.has(addDays(cm, 1)) &&
        !fifaPauses.some(([s, e]) => cm >= s && cm <= e)
      ) {
        midweeks.push(cm);
      }
    }

    availableSlots = [...availableSlots, ...midweeks].sort((a, b) => a.localeCompare(b));
  } else if (availableSlots.length > totalRounds) {
    // Evenly trim spare rest weekends preserving first and last
    const excess = availableSlots.length - totalRounds;
    const step = Math.floor(availableSlots.length / (excess + 1));
    const toRemoveIndices = new Set<number>();
    for (let i = 1; i <= excess; i++) {
      const idx = Math.min(availableSlots.length - 2, Math.max(1, i * step));
      toRemoveIndices.add(idx);
    }
    availableSlots = availableSlots.filter((_, idx) => !toRemoveIndices.has(idx));
  }

  // Force exact Saturday end date if specified by league regulation (e.g. Bundesliga / Ligue 1),
  // only keeping literal endSunday if it is a Saturday and outside FIFA pauses; otherwise snap final slot to Saturday.
  if (finalDayOfWeek === 6 && availableSlots.length > 0) {
    const endDow = new Date(`${endSunday}T12:00:00Z`).getUTCDay();
    const endBlocked = fifaPauses.some(([s, e]) => endSunday >= s && endSunday <= e);
    if (endDow === 6 && !endBlocked) {
      availableSlots[availableSlots.length - 1] = endSunday;
    } else {
      const lastSlot = availableSlots[availableSlots.length - 1];
      const lastDow = new Date(`${lastSlot}T12:00:00Z`).getUTCDay();
      availableSlots[availableSlots.length - 1] = lastDow === 0 ? addDays(lastSlot, -1) : lastSlot;
    }
  }

  return availableSlots.slice(0, totalRounds).map((dateStr, idx) => {
    const isFinalRound = idx === totalRounds - 1;
    const isFirstRound = idx === 0;

    // Special opening date alignment for Bundesliga (Friday opening match on Aug 28, 2026)
    let actualDate = dateStr;
    if (leagueId === 'ger_bundesliga' && isFirstRound) {
      actualDate = `${seasonYear}-08-28`;
    }

    // Kickoff time: final round simultaneous at 16:00; others alternate 16:00 / 18:30 / 20:45
    let time = isFinalRound ? '16:00' : idx % 2 === 0 ? '16:00' : '18:30';
    if (leagueId === 'ger_bundesliga' && isFirstRound) time = '20:30';
    if (leagueId === 'esp_laliga' && isFirstRound) time = '21:00';
    if (leagueId === 'eng_premier' && isFirstRound) time = '12:30';

    return { date: actualDate, time };
  });
}

/**
 * Generates an exact 46-round schedule (Championship, League One, League Two)
 * from 2nd Saturday of August through early May, strictly avoiding all FIFA pauses
 * and UEFA midweek dates while spacing midweek Tuesdays evenly.
 */
export function getEflLeagueScheduleDates(
  totalRounds: number = 46,
  seasonYear: number = 2026
): { date: string; time: string }[] {
  const nextYear = seasonYear + 1;
  const startSat = getNthWeekdayOfMonth(seasonYear, 7, 6, 2); // 2nd Saturday of August
  const endSatLimit = `${nextYear}-05-10`;

  const seasonFifaPauses = getFifaPausesForSeason(seasonYear, 'europe');
  const fifaPauses: [string, string][] = seasonFifaPauses.map((p) => [p.startDate, p.endDate]);
  const isFifaBlocked = (dStr: string): boolean =>
    fifaPauses.some(([s, e]) => dStr >= s && dStr <= e);

  const uefaSchedule = getUefaCompetitionCalendarDates(seasonYear);
  const uefaMatches = new Set<string>([
    ...uefaSchedule.uclLeagueDates,
    ...uefaSchedule.uelLeagueDates,
    ...uefaSchedule.ueclLeagueDates,
    uefaSchedule.playoffsIdaDate,
    uefaSchedule.playoffsVoltaDate,
    uefaSchedule.r16IdaDate,
    uefaSchedule.r16VoltaDate,
    uefaSchedule.qfIdaDate,
    uefaSchedule.qfVoltaDate,
    uefaSchedule.semiIdaDate,
    uefaSchedule.semiVoltaDate,
    uefaSchedule.uelFinalDate,
    uefaSchedule.ueclFinalDate,
    uefaSchedule.uclFinalDate,
  ]);

  const saturdays: string[] = [];
  const candidateTuesdays: string[] = [];
  let curSat = startSat;
  while (curSat <= endSatLimit) {
    const sun = addDays(curSat, 1);
    if (!isFifaBlocked(curSat) && !isFifaBlocked(sun)) {
      saturdays.push(curSat);
    }
    const tue = addDays(curSat, 3);
    if (
      tue <= addDays(endSatLimit, -3) &&
      !isFifaBlocked(tue) &&
      !uefaMatches.has(tue) &&
      !uefaMatches.has(addDays(tue, 1))
    ) {
      candidateTuesdays.push(tue);
    }
    curSat = addDays(curSat, 7);
  }

  // Boxing Day (Dec 26) if not Sunday and not FIFA/UEFA and not already a Saturday
  const boxingDay = `${seasonYear}-12-26`;
  const boxingDow = new Date(`${boxingDay}T12:00:00Z`).getUTCDay();
  if (
    boxingDow !== 0 &&
    !saturdays.includes(boxingDay) &&
    !candidateTuesdays.includes(boxingDay) &&
    !isFifaBlocked(boxingDay) &&
    !uefaMatches.has(boxingDay)
  ) {
    candidateTuesdays.push(boxingDay);
    candidateTuesdays.sort((a, b) => a.localeCompare(b));
  }

  let selectedDates: string[] = [...saturdays];
  if (selectedDates.length < totalRounds) {
    const needed = totalRounds - selectedDates.length;
    const pickedIndices = new Set<number>();
    if (candidateTuesdays.length <= needed) {
      candidateTuesdays.forEach((d) => selectedDates.push(d));
    } else {
      for (let i = 0; i < needed; i++) {
        let idx = Math.floor(((i + 0.5) * candidateTuesdays.length) / needed);
        while (pickedIndices.has(idx) && idx + 1 < candidateTuesdays.length) idx++;
        while (pickedIndices.has(idx) && idx - 1 >= 0) idx--;
        pickedIndices.add(idx);
      }
      Array.from(pickedIndices)
        .sort((a, b) => a - b)
        .forEach((idx) => selectedDates.push(candidateTuesdays[idx]));
    }
  } else if (selectedDates.length > totalRounds) {
    selectedDates = selectedDates.slice(0, totalRounds);
  }

  selectedDates = Array.from(new Set(selectedDates))
    .sort((a, b) => a.localeCompare(b))
    .slice(0, totalRounds);

  return selectedDates.map((d) => {
    const dow = new Date(`${d}T12:00:00Z`).getUTCDay();
    const isMidweek = dow >= 1 && dow <= 4;
    return {
      date: d,
      time: isMidweek ? '19:45' : '15:00',
    };
  });
}

/**
 * Helper to resolve split-year season start date (Russia starts July 24; Europe/Saudi/Japan start August 1).
 */
export function getSplitSeasonStartDate(
  startYear: number = 2026,
  isRussiaLeague: boolean = false
): string {
  return isRussiaLeague ? `${startYear}-07-24` : `${startYear}-08-01`;
}

/**
 * Official AFC Champions League Elite (Liga dos Campeões de Elite da AFC) calendar:
 * - Season cycle Aug/Sep Y -> May 1 (Y+1)
 * - 8 League Phase matchdays (6 in Aug–Dec Y before Saudi Copa da Ásia pause, 2 in Feb Y+1)
 * - R16 (Ida & Volta) in March Y+1
 * - Centralized Finals in Saudi Arabia (QF, SF) and Grand Final on May 1 (Y+1)
 */
export function getAfcChampionsCalendarDates(startYear: number = 2026): {
  leagueDates: string[];
  r16IdaDate: string;
  r16VoltaDate: string;
  qfDate: string;
  sfDate: string;
  finalDate: string;
} {
  const nextYear = startYear + 1;
  if (startYear === 2026) {
    return {
      leagueDates: [
        '2026-08-18', // Rodada 1 (início em agosto 2026)
        '2026-09-15', // Rodada 2
        '2026-10-13', // Rodada 3
        '2026-10-27', // Rodada 4
        '2026-11-24', // Rodada 5
        '2026-12-08', // Rodada 6 (antes da pausa da Copa da Ásia)
        '2027-02-09', // Rodada 7 (retomada em fevereiro)
        '2027-02-16', // Rodada 8
      ],
      r16IdaDate: '2027-03-03',
      r16VoltaDate: '2027-03-10',
      qfDate: '2027-04-23',
      sfDate: '2027-04-27',
      finalDate: '2027-05-01', // 1º de maio de 2027 na Arábia Saudita
    };
  }

  return {
    leagueDates: [
      `${startYear}-08-18`,
      `${startYear}-09-15`,
      `${startYear}-10-13`,
      `${startYear}-10-27`,
      `${startYear}-11-24`,
      `${startYear}-12-08`,
      `${nextYear}-02-09`,
      `${nextYear}-02-16`,
    ],
    r16IdaDate: `${nextYear}-03-03`,
    r16VoltaDate: `${nextYear}-03-10`,
    qfDate: `${nextYear}-04-23`,
    sfDate: `${nextYear}-04-27`,
    finalDate: `${nextYear}-05-01`,
  };
}

/**
 * Shared split-year domestic league calendar builder for Saudi Pro League, Russian Premier League, and J1 League.
 */
function buildSplitAsianRussianLeagueDates(params: {
  startDate: string;
  endDate: string;
  pauseStart: string;
  pauseEnd: string;
  totalRounds: number;
  seasonYear: number;
  defaultTime: string;
  lateTime?: string;
}): { date: string; time: string }[] {
  const {
    startDate,
    endDate,
    pauseStart,
    pauseEnd,
    totalRounds,
    seasonYear,
    defaultTime,
    lateTime,
  } = params;

  const seasonFifaPauses = getFifaPausesForSeason(seasonYear, 'europe');
  const blockedWindows: [string, string][] = [
    ...seasonFifaPauses.map((p) => [p.startDate, p.endDate] as [string, string]),
    [pauseStart, pauseEnd],
  ];

  const afc = getAfcChampionsCalendarDates(seasonYear);
  const afcDates = new Set<string>([
    ...afc.leagueDates,
    afc.r16IdaDate,
    afc.r16VoltaDate,
    afc.qfDate,
    afc.sfDate,
    afc.finalDate,
  ]);

  const isDateBlocked = (d: string): boolean =>
    blockedWindows.some(([s, e]) => d >= s && d <= e);

  // Ensure startDate and endDate themselves never land on a FIFA pause or AFC matchday
  let safeStartDate = startDate;
  while (isDateBlocked(safeStartDate) || afcDates.has(safeStartDate)) {
    safeStartDate = addDays(safeStartDate, 1);
  }
  let safeEndDate = endDate;
  while (
    isDateBlocked(safeEndDate) ||
    afcDates.has(safeEndDate) ||
    (() => {
      const d = new Date(`${safeEndDate}T12:00:00Z`).getUTCDay();
      return d !== 6 && d !== 0;
    })()
  ) {
    safeEndDate = addDays(safeEndDate, -1);
  }

  // Build weekends (Saturday/Sunday) strictly inside (safeStartDate, safeEndDate) not blocked by pauses
  const interiorWeekends: string[] = [];
  let cursor = addDays(safeStartDate, 1);
  while (cursor < safeEndDate) {
    const dt = new Date(`${cursor}T12:00:00Z`);
    const dow = dt.getUTCDay();
    if (dow === 6) {
      const sun = addDays(cursor, 1);
      if (
        sun < safeEndDate &&
        cursor > addDays(safeStartDate, 1) &&
        !isDateBlocked(cursor) &&
        !isDateBlocked(sun) &&
        !afcDates.has(cursor) &&
        !afcDates.has(sun)
      ) {
        interiorWeekends.push(cursor);
      }
    }
    cursor = addDays(cursor, 1);
  }

  // Build non-colliding midweek Wednesdays (fallback Thursdays if AFC uses Wed)
  const interiorMidweeks: string[] = [];
  cursor = addDays(safeStartDate, 2);
  while (cursor < safeEndDate) {
    const dt = new Date(`${cursor}T12:00:00Z`);
    const dow = dt.getUTCDay();
    if (dow === 3) {
      if (!isDateBlocked(cursor) && !afcDates.has(cursor)) {
        interiorMidweeks.push(cursor);
      } else {
        const thu = addDays(cursor, 1);
        if (thu < safeEndDate && !isDateBlocked(thu) && !afcDates.has(thu)) {
          interiorMidweeks.push(thu);
        }
      }
    }
    cursor = addDays(cursor, 1);
  }

  const neededInterior = Math.max(0, totalRounds - 2);
  let chosenInterior: string[] = [];

  if (interiorWeekends.length >= neededInterior) {
    if (interiorWeekends.length === neededInterior) {
      chosenInterior = [...interiorWeekends];
    } else {
      const step = interiorWeekends.length / neededInterior;
      const used = new Set<number>();
      for (let i = 0; i < neededInterior; i++) {
        let idx = Math.min(interiorWeekends.length - 1, Math.floor(i * step + step * 0.5));
        while (used.has(idx) && idx + 1 < interiorWeekends.length) idx++;
        used.add(idx);
        chosenInterior.push(interiorWeekends[idx]);
      }
    }
  } else {
    chosenInterior = [...interiorWeekends];
    const deficit = neededInterior - chosenInterior.length;
    if (deficit > 0 && interiorMidweeks.length > 0) {
      const pickCount = Math.min(deficit, interiorMidweeks.length);
      const step = interiorMidweeks.length / pickCount;
      const usedM = new Set<number>();
      for (let i = 0; i < pickCount; i++) {
        let idx = Math.min(interiorMidweeks.length - 1, Math.floor(i * step + step * 0.5));
        while (usedM.has(idx) && idx + 1 < interiorMidweeks.length) idx++;
        usedM.add(idx);
        chosenInterior.push(interiorMidweeks[idx]);
      }
    }
    chosenInterior.sort((a, b) => a.localeCompare(b));
  }

  const finalSet = new Set<string>([safeStartDate, ...chosenInterior.slice(0, neededInterior), safeEndDate]);
  if (finalSet.size < totalRounds) {
    for (const mw of interiorMidweeks) {
      if (finalSet.size >= totalRounds) break;
      finalSet.add(mw);
    }
  }
  const finalDates = Array.from(finalSet).sort((a, b) => a.localeCompare(b));
  return finalDates.slice(0, totalRounds).map((dateStr, idx) => ({
    date: dateStr,
    time: idx === totalRounds - 1 ? defaultTime : idx % 2 === 0 ? defaultTime : lateTime || defaultTime,
  }));
}

/**
 * Arábia Saudita (Saudi Pro League - 34 rodadas):
 * - Início: 13 de agosto (YYYY-08-13)
 * - Pausa Copa da Ásia: YYYY-12-24 até (YYYY+1)-02-07
 * - Término: 29 de maio ((YYYY+1)-05-29)
 */
export function getSaudiLeagueScheduleDates(
  totalRounds: number = 34,
  seasonYear: number = 2026
): { date: string; time: string }[] {
  const nextYear = seasonYear + 1;
  return buildSplitAsianRussianLeagueDates({
    startDate: `${seasonYear}-08-13`,
    endDate: `${nextYear}-05-29`,
    pauseStart: `${seasonYear}-12-24`,
    pauseEnd: `${nextYear}-02-07`,
    totalRounds,
    seasonYear,
    defaultTime: '19:30',
    lateTime: '21:00',
  });
}

/**
 * Rússia (Premier Liga Russa - 30 rodadas):
 * - Início: 24 de julho (YYYY-07-24)
 * - Pausa de inverno: YYYY-12-07 até (YYYY+1)-02-26
 * - Término: 29 de maio ((YYYY+1)-05-29)
 */
export function getRussiaLeagueScheduleDates(
  totalRounds: number = 30,
  seasonYear: number = 2026
): { date: string; time: string }[] {
  const nextYear = seasonYear + 1;
  return buildSplitAsianRussianLeagueDates({
    startDate: `${seasonYear}-07-24`,
    endDate: `${nextYear}-05-29`,
    pauseStart: `${seasonYear}-12-07`,
    pauseEnd: `${nextYear}-02-26`,
    totalRounds,
    seasonYear,
    defaultTime: '15:00',
    lateTime: '18:00',
  });
}

/**
 * Japão (J1 League - 38 rodadas, calendário europeu a partir de 2026/27):
 * - Início: início de agosto (YYYY-08-08)
 * - Pausa de inverno: 3ª semana de dezembro (YYYY-12-20) até 2ª semana de fevereiro ((YYYY+1)-02-14)
 * - Término: fim de maio ((YYYY+1)-05-29)
 */
export function getJapanJ1LeagueScheduleDates(
  totalRounds: number = 38,
  seasonYear: number = 2026
): { date: string; time: string }[] {
  const nextYear = seasonYear + 1;
  return buildSplitAsianRussianLeagueDates({
    startDate: `${seasonYear}-08-08`,
    endDate: `${nextYear}-05-29`,
    pauseStart: `${seasonYear}-12-20`,
    pauseEnd: `${nextYear}-02-14`,
    totalRounds,
    seasonYear,
    defaultTime: '14:00',
    lateTime: '19:00',
  });
}

/**
 * Expands all official FIFA pause windows for a season/year into a Set of YYYY-MM-DD strings.
 */
export function getSeasonFifaBlockedDatesSet(
  seasonYear: number,
  region: 'europe' | 'south_america' = 'europe'
): Set<string> {
  const blocked = new Set<string>();
  const pauses = getFifaPausesForSeason(seasonYear, region);
  for (const w of pauses) {
    let cur = w.startDate;
    while (cur <= w.endDate) {
      blocked.add(cur);
      cur = addDays(cur, 1);
    }
  }
  return blocked;
}

/**
 * Returns a Set of all UEFA continental competition match dates (UCL/UEL/UECL) for a split-year season.
 */
export function getUefaBlockedDatesSet(seasonStartYear: number): Set<string> {
  const uefa = getUefaCompetitionCalendarDates(seasonStartYear);
  return new Set<string>([
    ...uefa.uclLeagueDates,
    ...uefa.uelLeagueDates,
    ...uefa.ueclLeagueDates,
    uefa.playoffsIdaDate,
    uefa.playoffsVoltaDate,
    uefa.r16IdaDate,
    uefa.r16VoltaDate,
    uefa.qfIdaDate,
    uefa.qfVoltaDate,
    uefa.semiIdaDate,
    uefa.semiVoltaDate,
    uefa.uelFinalDate,
    uefa.ueclFinalDate,
    uefa.uclFinalDate,
  ]);
}

function diffDaysIso(dateA: string, dateB: string): number {
  const [ya, ma, da] = dateA.split('-').map(Number);
  const [yb, mb, db] = dateB.split('-').map(Number);
  const msA = Date.UTC(ya, ma - 1, da);
  const msB = Date.UTC(yb, mb - 1, db);
  return Math.round((msA - msB) / 86400000);
}

/**
 * Adjusts domestic cup fixture dates so NO matchday collides with blocked dates
 * (national league dates, continental club dates, FIFA international breaks, or prior cups),
 * while strictly preserving chronological ordering across rounds and two-legged ties.
 */
export function resolveCupScheduleConflicts(
  fixtures: Fixture[],
  blockedDates: Set<string>,
  minDate: string,
  maxDate: string
): Fixture[] {
  if (fixtures.length === 0) return fixtures;

  // Collect ordered unique (round, leg) stage keys
  const stageKeys = Array.from(
    new Set(fixtures.map((f) => `${f.round}:${f.leg || 0}`))
  ).sort((a, b) => {
    const [ra, la] = a.split(':').map(Number);
    const [rb, lb] = b.split(':').map(Number);
    return ra !== rb ? ra - rb : la - lb;
  });

  const resolvedDateByStageAndOrig = new Map<string, string>();
  let prevStageMaxDate = '';

  for (const stageKey of stageKeys) {
    const stageFixtures = fixtures.filter(
      (f) => `${f.round}:${f.leg || 0}` === stageKey
    );
    const origDates = Array.from(
      new Set(stageFixtures.map((f) => f.date).filter((d): d is string => Boolean(d)))
    ).sort();
    const earliestOrig = origDates[0] || minDate;
    const effectiveMin = earliestOrig < minDate ? earliestOrig : minDate;
    const stageFloor =
      prevStageMaxDate && addDays(prevStageMaxDate, 3) > effectiveMin
        ? addDays(prevStageMaxDate, 3)
        : effectiveMin;

    let stageMax = prevStageMaxDate;

    for (const origDate of origDates) {
      const origDt = new Date(`${origDate}T12:00:00`);
      const origIsWeekend = origDt.getDay() === 0 || origDt.getDay() === 6;

      let chosen: string | null = null;
      if (!blockedDates.has(origDate) && origDate >= stageFloor && origDate <= maxDate) {
        chosen = origDate;
      } else {
        // Search outward from origDate up to 120 days forward/backward
        let bestScore = Infinity;
        for (let delta = 1; delta <= 120; delta++) {
          const candidates = [addDays(origDate, delta), addDays(origDate, -delta)];
          for (const cand of candidates) {
            if (cand < stageFloor || cand > maxDate) continue;
            if (blockedDates.has(cand)) continue;
            const dt = new Date(`${cand}T12:00:00`);
            const dow = dt.getDay();
            const isWeekend = dow === 0 || dow === 6;
            // Mildly prefer matching weekend/midweek nature of original date, avoid Friday unless needed
            const parityPenalty = isWeekend === origIsWeekend ? 0 : 0.4;
            const forwardBias = diffDaysIso(cand, origDate) >= 0 ? 0 : 0.15;
            const score = delta + parityPenalty + forwardBias;
            if (score < bestScore) {
              bestScore = score;
              chosen = cand;
            }
          }
          if (chosen && delta >= Math.ceil(bestScore)) break;
        }

        // Last-resort scan inside [stageFloor, maxDate] if +/-120 didn't hit
        if (!chosen) {
          let scan = stageFloor;
          while (scan <= maxDate) {
            if (!blockedDates.has(scan)) {
              chosen = scan;
              break;
            }
            scan = addDays(scan, 1);
          }
        }
      }

      const finalDate = chosen || (origDate < stageFloor ? stageFloor : origDate);
      resolvedDateByStageAndOrig.set(`${stageKey}|${origDate}`, finalDate);
      if (!stageMax || finalDate > stageMax) {
        stageMax = finalDate;
      }
    }

    if (stageMax && (!prevStageMaxDate || stageMax > prevStageMaxDate)) {
      prevStageMaxDate = stageMax;
    }
  }

  return fixtures.map((f) => {
    const key = `${f.round}:${f.leg || 0}|${f.date}`;
    const newDate = resolvedDateByStageAndOrig.get(key);
    return newDate && newDate !== f.date ? { ...f, date: newDate } : f;
  });
}

export interface VariedMatchDayOptions {
  keepLastRoundSimultaneous?: boolean;
  allowFridayMonday?: boolean;
  minDate?: string;
  maxDate?: string;
  prevRoundBaseDate?: string;
  nextRoundBaseDate?: string;
  region?: 'europe' | 'south_america' | 'all';
  midweekDays?: Array<'tue' | 'wed' | 'thu'>;
  fallbackTime?: string;
}

/**
 * Distributes individual fixtures of a round across realistic days of the week instead of
 * concentrating every match on Wednesday or Sunday:
 * - Weekend rounds (Sat/Sun): Friday night (~10%), Saturday (~40%), Sunday (~40%), Monday night (~10%).
 * - Midweek rounds (Tue/Wed/Thu): Tuesday (~20%), Wednesday (~45%), Thursday (~35%).
 * Preserves simultaneous final rounds, min/max season bounds, and FIFA pause windows.
 */
export function assignVariedMatchDaySlot(
  baseDate: string,
  matchIndex: number,
  roundNum: number,
  totalRounds: number,
  competitionSeed: string,
  options?: VariedMatchDayOptions
): { date: string; time: string } {
  const keepLast = options?.keepLastRoundSimultaneous !== false;
  const fallbackTime = options?.fallbackTime || '16:00';
  if (!baseDate || !/^\d{4}-\d{2}-\d{2}$/.test(baseDate)) {
    return { date: baseDate, time: fallbackTime };
  }

  if (keepLast && totalRounds > 1 && roundNum >= totalRounds) {
    return { date: baseDate, time: '16:00' };
  }

  let seedHash = 0;
  for (let i = 0; i < competitionSeed.length; i++) {
    seedHash = (seedHash * 31 + competitionSeed.charCodeAt(i)) >>> 0;
  }
  const mix = (seedHash + roundNum * 17 + matchIndex * 13 + roundNum * matchIndex * 7) >>> 0;
  const roll = mix % 20;
  const timePick = (arr: string[]) => arr[(mix >>> 3) % arr.length];

  const [y, m, d] = baseDate.split('-').map(Number);
  const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay(); // 0=Sun..6=Sat

  const baseInFifa = options?.region ? isDateInFifaPause(baseDate, options.region) : false;
  const isSafeDate = (cand: string): boolean => {
    if (options?.minDate && cand < options.minDate) return false;
    if (options?.maxDate && cand > options.maxDate) return false;
    if (options?.region && !baseInFifa && isDateInFifaPause(cand, options.region)) return false;
    return true;
  };
  const hasPrevGap = (cand: string, minDays: number): boolean => {
    if (!options?.prevRoundBaseDate) return true;
    return diffDaysIso(cand, options.prevRoundBaseDate) >= minDays;
  };
  const hasNextGap = (cand: string, minDays: number): boolean => {
    if (!options?.nextRoundBaseDate) return true;
    return diffDaysIso(options.nextRoundBaseDate, cand) >= minDays;
  };

  // Weekend rounds (Sunday, Saturday, or Friday-anchored weekend)
  if (dow === 0 || dow === 6 || dow === 5) {
    const satDate = dow === 6 ? baseDate : dow === 0 ? addDays(baseDate, -1) : addDays(baseDate, 1);
    const sunDate = addDays(satDate, 1);
    const friDate = addDays(satDate, -1);
    const monDate = addDays(sunDate, 1);

    const allowFriMon = options?.allowFridayMonday !== false;
    const canFri = allowFriMon && isSafeDate(friDate) && hasPrevGap(friDate, 3);
    const canSat = isSafeDate(satDate) && hasPrevGap(satDate, 2);
    const canSun = isSafeDate(sunDate);
    const canMon = allowFriMon && isSafeDate(monDate) && hasNextGap(monDate, 3);

    const friTimes = ['20:00', '21:00'];
    const satTimes = ['16:00', '16:30', '18:30', '19:00', '21:00'];
    const sunTimes = ['11:00', '16:00', '18:30', '20:00'];
    const monTimes = ['20:00', '20:30'];

    if (roll <= 1) {
      if (canFri) return { date: friDate, time: timePick(friTimes) };
      if (canSat) return { date: satDate, time: timePick(satTimes) };
      if (canSun) return { date: sunDate, time: timePick(sunTimes) };
    } else if (roll <= 9) {
      if (canSat) return { date: satDate, time: timePick(satTimes) };
      if (canSun) return { date: sunDate, time: timePick(sunTimes) };
    } else if (roll <= 17) {
      if (canSun) return { date: sunDate, time: timePick(sunTimes) };
      if (canSat) return { date: satDate, time: timePick(satTimes) };
    } else {
      if (canMon) return { date: monDate, time: timePick(monTimes) };
      if (canSun) return { date: sunDate, time: timePick(sunTimes) };
      if (canSat) return { date: satDate, time: timePick(satTimes) };
    }
    return { date: baseDate, time: fallbackTime };
  }

  // Midweek rounds (Tuesday, Wednesday, Thursday)
  if (dow === 2 || dow === 3 || dow === 4) {
    const wedDate = dow === 3 ? baseDate : dow === 2 ? addDays(baseDate, 1) : addDays(baseDate, -1);
    const tueDate = addDays(wedDate, -1);
    const thuDate = addDays(wedDate, 1);

    const allowed = options?.midweekDays || ['tue', 'wed', 'thu'];
    const canTue = allowed.includes('tue') && isSafeDate(tueDate) && hasPrevGap(tueDate, 2);
    const canWed = allowed.includes('wed') && isSafeDate(wedDate);
    const canThu = allowed.includes('thu') && isSafeDate(thuDate) && hasNextGap(thuDate, 2);

    const tueTimes = ['19:00', '19:30', '21:30'];
    const wedTimes = ['19:00', '19:30', '20:00', '21:30'];
    const thuTimes = ['19:00', '19:30', '20:00', '21:30'];

    if (allowed.length === 2 && allowed.includes('tue') && allowed.includes('wed')) {
      if (roll < 10 && canTue) return { date: tueDate, time: timePick(tueTimes) };
      if (canWed) return { date: wedDate, time: timePick(wedTimes) };
      if (canTue) return { date: tueDate, time: timePick(tueTimes) };
    } else if (allowed.length === 2 && allowed.includes('wed') && allowed.includes('thu')) {
      if (roll < 5 && canWed) return { date: wedDate, time: timePick(wedTimes) };
      if (canThu) return { date: thuDate, time: timePick(thuTimes) };
      if (canWed) return { date: wedDate, time: timePick(wedTimes) };
    } else {
      if (roll < 4) {
        if (canTue) return { date: tueDate, time: timePick(tueTimes) };
        if (canWed) return { date: wedDate, time: timePick(wedTimes) };
        if (canThu) return { date: thuDate, time: timePick(thuTimes) };
      } else if (roll < 13) {
        if (canWed) return { date: wedDate, time: timePick(wedTimes) };
        if (canThu) return { date: thuDate, time: timePick(thuTimes) };
        if (canTue) return { date: tueDate, time: timePick(tueTimes) };
      } else {
        if (canThu) return { date: thuDate, time: timePick(thuTimes) };
        if (canWed) return { date: wedDate, time: timePick(wedTimes) };
        if (canTue) return { date: tueDate, time: timePick(tueTimes) };
      }
    }
    return { date: baseDate, time: fallbackTime };
  }

  // Monday anchor
  return { date: baseDate, time: options?.fallbackTime || '20:00' };
}
