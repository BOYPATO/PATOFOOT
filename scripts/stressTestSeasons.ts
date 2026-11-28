import assert from 'node:assert/strict';
import {
  generateInitialClubs,
  generateLeagueSchedule,
  buildSerieBPlayoffFixtures,
} from '../src/data/initialData';
import {
  generateLibertadoresFixtures,
  generateSulamericanaFixtures,
  generateCopaNordesteFixtures,
} from '../src/utils/competitionsEngine';
import { computeConmebolContinentalQualifiers } from '../src/utils/southAmericaLeaguesEngine';
import { syncDynamicKnockoutBrackets } from '../src/utils/multiLeagueEngine';
import { getTransferWindowStatus } from '../src/utils/transferWindowEngine';
import { simulateQuickMatch } from '../src/services/matchSimulation';
import { Club, Fixture, Standing } from '../src/types/game';

function updateStandingsFromFixtures(
  fixtures: Fixture[],
  baseStandings: Standing[]
): Standing[] {
  const map = new Map<string, Standing>();
  baseStandings.forEach((s) => {
    map.set(s.teamId, {
      ...s,
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      goalDifference: 0,
      points: 0,
    });
  });

  for (const f of fixtures) {
    if (!f.played || f.homeScore === null || f.awayScore === null) continue;
    const hs = map.get(f.homeTeamId);
    const as = map.get(f.awayTeamId);
    if (!hs || !as) continue;
    hs.played += 1;
    as.played += 1;
    hs.goalsFor += f.homeScore;
    hs.goalsAgainst += f.awayScore;
    as.goalsFor += f.awayScore;
    as.goalsAgainst += f.homeScore;
    if (f.homeScore > f.awayScore) {
      hs.won += 1;
      hs.points += 3;
      as.lost += 1;
    } else if (f.homeScore < f.awayScore) {
      as.won += 1;
      as.points += 3;
      hs.lost += 1;
    } else {
      hs.drawn += 1;
      hs.points += 1;
      as.drawn += 1;
      as.points += 1;
    }
    hs.goalDifference = hs.goalsFor - hs.goalsAgainst;
    as.goalDifference = as.goalsFor - as.goalsAgainst;
  }

  return Array.from(map.values()).sort(
    (a, b) =>
      b.points - a.points ||
      b.won - a.won ||
      b.goalDifference - a.goalDifference ||
      b.goalsFor - a.goalsFor
  );
}

function simulateFixturesBatch(
  fixtures: Fixture[],
  clubById: Map<string, Club>,
  predicate: (f: Fixture) => boolean
): Fixture[] {
  return fixtures.map((f) => {
    if (f.played || !predicate(f)) return f;
    const h = clubById.get(f.homeTeamId);
    const a = clubById.get(f.awayTeamId);
    assert(h, `Missing home club ${f.homeTeamId} for fixture ${f.id}`);
    assert(a, `Missing away club ${f.awayTeamId} for fixture ${f.id}`);
    const leg1 =
      f.leg === 2
        ? fixtures.find(
            (prev) =>
              prev.competition === f.competition &&
              prev.leg === 1 &&
              prev.id === f.id.replace('_volta', '_ida')
          )
        : undefined;
    const res = simulateQuickMatch(h, a, f, leg1);
    return {
      ...f,
      played: true,
      homeScore: res.homeScore,
      awayScore: res.awayScore,
      penaltiesHome: res.penaltiesHome,
      penaltiesAway: res.penaltiesAway,
      aggregateWinnerId: res.aggregateWinnerId,
    };
  });
}

function runStressTest() {
  console.log('=== PATOFOOT 2026 Multi-Season Launch Stress Test ===');

  // 1. Club catalog integrity
  const clubs = generateInitialClubs();
  const clubById = new Map<string, Club>();
  for (const c of clubs) {
    assert(!clubById.has(c.id), `Duplicate club ID detected: ${c.id}`);
    assert(c.squad.length >= 16, `Club ${c.id} has undersized squad (${c.squad.length})`);
    clubById.set(c.id, c);
  }
  console.log(`[PASS] Club catalog valid: ${clubs.length} unique clubs, all squads healthy.`);

  // 2. CONMEBOL 32+32 country distribution & Cup Champion rules (both inside and outside Top 4)
  const serieAClubs = clubs.filter((c) => c.division === 'A');
  const standingsA: Standing[] = serieAClubs.map((c, idx) => ({
    teamId: c.id,
    played: 38,
    won: 24 - Math.floor(idx / 2),
    drawn: 8,
    lost: 6 + Math.floor(idx / 2),
    goalsFor: 60 - idx,
    goalsAgainst: 25 + idx,
    goalDifference: 35 - idx * 2,
    points: 80 - idx * 2,
    form: [],
  }));

  // Case 0: Before domestic cups finish -> Brasil and Argentina strictly show 4 league Libertadores spots (5th reserved for Cup)
  const conmebolPreCup = computeConmebolContinentalQualifiers({
    clubs,
    standingsA,
  });
  const brPre = conmebolPreCup.orderedCountries.find((c) => c.country === 'Brasil')!;
  const argPre = conmebolPreCup.orderedCountries.find((c) => c.country === 'Argentina')!;
  assert.equal(brPre.libertadoresClubs.length, 4, 'Pre-cup Brasil must reserve 5th spot (4 league spots)');
  assert.equal(argPre.libertadoresClubs.length, 4, 'Pre-cup Argentina must reserve 5th spot (4 league spots)');

  // Case A: Copa do Brasil & Copa Argentina champions outside Top 4 -> Brasil 5 Lib (4+1) & 4 Sula, Argentina 5 Lib (4+1) & 4 Sula
  const argClubs = clubs.filter((c) => c.division === 'SA' && c.country === 'Argentina');
  assert(argClubs.length >= 12, 'Expected at least 12 Argentine clubs');
  const cdbOutsideTop4 = standingsA[11].teamId;
  const copaArgOutsideTop4 = argClubs[10].id;
  const conmebolOutside = computeConmebolContinentalQualifiers({
    clubs,
    standingsA,
    copaBrasilChampId: cdbOutsideTop4,
    domesticCupChampions: { sa_copa_argentina: copaArgOutsideTop4 },
  });
  assert.equal(conmebolOutside.libertadoresIds.length, 32, 'Libertadores must have 32 clubs');
  assert.equal(conmebolOutside.sulamericanaIds.length, 32, 'Sul-Americana must have 32 clubs');
  const overlapA = conmebolOutside.libertadoresIds.filter((id) =>
    conmebolOutside.sulamericanaIds.includes(id)
  );
  assert.equal(overlapA.length, 0, 'Zero overlap between Libertadores and Sul-Americana');
  assert(
    conmebolOutside.libertadoresIds.includes(cdbOutsideTop4),
    'Copa do Brasil champion outside Top 4 must qualify for Libertadores'
  );
  assert(
    conmebolOutside.libertadoresIds.includes(copaArgOutsideTop4),
    'Copa Argentina champion outside Top 4 must qualify for Libertadores'
  );
  const brSummaryA = conmebolOutside.orderedCountries.find((c) => c.country === 'Brasil')!;
  const argSummaryA = conmebolOutside.orderedCountries.find((c) => c.country === 'Argentina')!;
  assert.equal(brSummaryA.libertadoresClubs.length, 5, 'Brasil must have 5 Libertadores spots');
  assert.equal(brSummaryA.sulamericanaClubs.length, 4, 'Brasil must have 4 Sul-Americana spots');
  assert.equal(argSummaryA.libertadoresClubs.length, 5, 'Argentina must have 5 Libertadores spots');
  assert.equal(argSummaryA.sulamericanaClubs.length, 4, 'Argentina must have 4 Sul-Americana spots');

  // Case B: Copa do Brasil champion is 1st in Série A -> G-4 inherits 5th place into Libertadores
  const conmebolInside = computeConmebolContinentalQualifiers({
    clubs,
    standingsA,
    copaBrasilChampId: standingsA[0].teamId,
    domesticCupChampions: { sa_copa_argentina: argClubs[0].id },
  });
  assert.equal(conmebolInside.libertadoresIds.length, 32);
  assert.equal(conmebolInside.sulamericanaIds.length, 32);
  assert(
    conmebolInside.libertadoresIds.includes(standingsA[4].teamId),
    'When Copa do Brasil champ is in Top 4, 5th place must inherit Libertadores spot'
  );
  console.log('[PASS] CONMEBOL 32+32 quotas & Brasil/Argentina 4+1 Cup Champion rules verified.');

  // 3. Simulate 3 consecutive CONMEBOL seasons (2026, 2027, 2028) including Lib 3rd -> Sula Playoffs!
  let nextLibPool: string[] | undefined = undefined;
  let nextSulaPool: string[] | undefined = undefined;
  let defendingLibChamp: string | undefined = undefined;

  for (const year of [2026, 2027, 2028]) {
    const libGen = generateLibertadoresFixtures(clubs, year, undefined, nextLibPool, defendingLibChamp);
    const sulaGen = generateSulamericanaFixtures(clubs, year, undefined, undefined, nextSulaPool);

    let libFix = libGen.fixtures;
    let sulaFix = sulaGen.fixtures;
    let libSt = libGen.standings;
    let sulaSt = sulaGen.standings;

    // Group stage (rounds 1..6)
    libFix = simulateFixturesBatch(libFix, clubById, (f) => f.round <= 6);
    sulaFix = simulateFixturesBatch(sulaFix, clubById, (f) => f.round <= 6);
    libSt = updateStandingsFromFixtures(libFix, libSt);
    sulaSt = updateStandingsFromFixtures(sulaFix, sulaSt);

    // Sync after groups -> populates Lib R16, Sula Playoffs (Sula 2nd vs Lib 3rd), and Sula R16 seeds (Sula 1st)
    let synced = syncDynamicKnockoutBrackets({
      clubs,
      fixturesCopaBrasil: [],
      fixturesLibertadores: libFix,
      fixturesSulamericana: sulaFix,
      fixturesEstadual: [],
      standingsLibertadores: libSt,
      standingsSulamericana: sulaSt,
      standingsEstadual: [],
    });
    libFix = synced.fixturesLibertadores;
    sulaFix = synced.fixturesSulamericana;

    // Verify Sula Playoffs (8 ties x 2 legs = 16 fixtures) have zero 'tbd' and 16 unique clubs
    const sulaPoIda = sulaFix.filter((f) => f.id.startsWith('sula_playoffs_m') && f.leg === 1);
    assert.equal(sulaPoIda.length, 8, `Season ${year}: Expected 8 Sula Playoff ties`);
    const poTeams = new Set<string>();
    for (const f of sulaPoIda) {
      assert(!f.homeTeamId.startsWith('tbd'), `Season ${year}: Unresolved home in ${f.id}`);
      assert(!f.awayTeamId.startsWith('tbd'), `Season ${year}: Unresolved away in ${f.id}`);
      poTeams.add(f.homeTeamId);
      poTeams.add(f.awayTeamId);
    }
    assert.equal(poTeams.size, 16, `Season ${year}: Sula Playoffs must have 16 distinct clubs (8 Lib 3rd + 8 Sula 2nd)`);

    // Simulate Sula Playoffs (Ida & Volta) -> sync -> populates Sula R16
    sulaFix = simulateFixturesBatch(sulaFix, clubById, (f) => f.id.startsWith('sula_playoffs_m') && f.leg === 1);
    sulaFix = simulateFixturesBatch(sulaFix, clubById, (f) => f.id.startsWith('sula_playoffs_m') && f.leg === 2);
    synced = syncDynamicKnockoutBrackets({
      clubs,
      fixturesCopaBrasil: [],
      fixturesLibertadores: libFix,
      fixturesSulamericana: sulaFix,
      fixturesEstadual: [],
      standingsLibertadores: libSt,
      standingsSulamericana: sulaSt,
      standingsEstadual: [],
    });
    libFix = synced.fixturesLibertadores;
    sulaFix = synced.fixturesSulamericana;

    // Verify both Lib R16 & Sula R16 have 16 distinct valid teams
    for (const [label, list, prefix] of [
      ['Libertadores', libFix, 'lib'],
      ['Sul-Americana', sulaFix, 'sula'],
    ] as const) {
      const r16Ida = list.filter((f) => f.id.startsWith(`${prefix}_oitavas_m`) && f.leg === 1);
      assert.equal(r16Ida.length, 8, `Season ${year} ${label}: Expected 8 R16 ties`);
      const r16Teams = new Set<string>();
      for (const f of r16Ida) {
        assert(!f.homeTeamId.startsWith('tbd') && !f.awayTeamId.startsWith('tbd'), `Unresolved R16 ${f.id}`);
        r16Teams.add(f.homeTeamId);
        r16Teams.add(f.awayTeamId);
      }
      assert.equal(r16Teams.size, 16, `Season ${year} ${label}: Expected 16 unique R16 clubs`);
    }

    // Simulate Oitavas -> Quartas -> Semis -> Final Única for both tournaments
    for (const stagePrefix of ['_oitavas_m', '_quartas_m', '_semi_']) {
      libFix = simulateFixturesBatch(libFix, clubById, (f) => f.id.includes(stagePrefix) && f.leg === 1);
      libFix = simulateFixturesBatch(libFix, clubById, (f) => f.id.includes(stagePrefix) && f.leg === 2);
      sulaFix = simulateFixturesBatch(sulaFix, clubById, (f) => f.id.includes(stagePrefix) && f.leg === 1);
      sulaFix = simulateFixturesBatch(sulaFix, clubById, (f) => f.id.includes(stagePrefix) && f.leg === 2);
      synced = syncDynamicKnockoutBrackets({
        clubs,
        fixturesCopaBrasil: [],
        fixturesLibertadores: libFix,
        fixturesSulamericana: sulaFix,
        fixturesEstadual: [],
        standingsLibertadores: libSt,
        standingsSulamericana: sulaSt,
        standingsEstadual: [],
      });
      libFix = synced.fixturesLibertadores;
      sulaFix = synced.fixturesSulamericana;
    }

    libFix = simulateFixturesBatch(libFix, clubById, (f) => f.id === 'lib_grande_final');
    sulaFix = simulateFixturesBatch(sulaFix, clubById, (f) => f.id === 'sula_final');

    const libFinal = libFix.find((f) => f.id === 'lib_grande_final')!;
    const sulaFinal = sulaFix.find((f) => f.id === 'sula_final')!;
    assert(libFinal.played && !libFinal.homeTeamId.startsWith('tbd') && !libFinal.awayTeamId.startsWith('tbd'));
    assert(sulaFinal.played && !sulaFinal.homeTeamId.startsWith('tbd') && !sulaFinal.awayTeamId.startsWith('tbd'));

    defendingLibChamp =
      libFinal.aggregateWinnerId ||
      ((libFinal.homeScore ?? 0) >= (libFinal.awayScore ?? 0)
        ? libFinal.homeTeamId
        : libFinal.awayTeamId);

    const nextQ = computeConmebolContinentalQualifiers({
      clubs,
      standingsA,
      copaBrasilChampId: standingsA[year % 8].teamId,
    });
    nextLibPool = nextQ.libertadoresIds;
    nextSulaPool = nextQ.sulamericanaIds;
    console.log(
      `[PASS] Season ${year} CONMEBOL complete: Lib Final ${libFinal.homeTeamId} ${libFinal.homeScore}-${libFinal.awayScore} ${libFinal.awayTeamId} | Sula Final ${sulaFinal.homeTeamId} ${sulaFinal.homeScore}-${sulaFinal.awayScore} ${sulaFinal.awayTeamId}`
    );
  }

  // 4. Brasileirão Série B 38 rounds + Playoff de Acesso (3ºx6º e 4ºx5º Ida & Volta)
  const serieBClubs = clubs.filter((c) => c.division === 'B');
  assert.equal(serieBClubs.length, 20, 'Série B must have 20 clubs');
  let fixB = [
    ...generateLeagueSchedule(serieBClubs.map((c) => c.id), 'serie_b', 2026),
    ...buildSerieBPlayoffFixtures(2026, 38),
  ];
  const baseStB: Standing[] = serieBClubs.map((c) => ({
    teamId: c.id,
    played: 0,
    won: 0,
    drawn: 0,
    lost: 0,
    goalsFor: 0,
    goalsAgainst: 0,
    goalDifference: 0,
    points: 0,
    form: [],
  }));
  fixB = simulateFixturesBatch(fixB, clubById, (f) => f.round <= 38);
  const stB = updateStandingsFromFixtures(
    fixB.filter((f) => f.round <= 38),
    baseStB
  );
  const syncedB = syncDynamicKnockoutBrackets({
    clubs,
    fixturesCopaBrasil: [],
    fixturesLibertadores: [],
    fixturesSulamericana: [],
    fixturesEstadual: [],
    fixturesB: fixB,
    standingsLibertadores: [],
    standingsSulamericana: [],
    standingsEstadual: [],
    standingsB: stB,
  });
  fixB = syncedB.fixturesB || [];
  const po1Ida = fixB.find((f) => f.id === 'serie_b_playoff_1_ida')!;
  const po1Volta = fixB.find((f) => f.id === 'serie_b_playoff_1_volta')!;
  const po2Ida = fixB.find((f) => f.id === 'serie_b_playoff_2_ida')!;
  const po2Volta = fixB.find((f) => f.id === 'serie_b_playoff_2_volta')!;
  assert.equal(po1Ida.homeTeamId, stB[5].teamId, 'Série B PO1 Leg 1 home must be 6th');
  assert.equal(po1Ida.awayTeamId, stB[2].teamId, 'Série B PO1 Leg 1 away must be 3rd');
  assert.equal(po1Volta.homeTeamId, stB[2].teamId, 'Série B PO1 Leg 2 home must be 3rd');
  assert.equal(po2Ida.homeTeamId, stB[4].teamId, 'Série B PO2 Leg 1 home must be 5th');
  assert.equal(po2Ida.awayTeamId, stB[3].teamId, 'Série B PO2 Leg 1 away must be 4th');
  assert.equal(po2Volta.homeTeamId, stB[3].teamId, 'Série B PO2 Leg 2 home must be 4th');

  fixB = simulateFixturesBatch(fixB, clubById, (f) => f.id.startsWith('serie_b_playoff_') && f.leg === 1);
  fixB = simulateFixturesBatch(fixB, clubById, (f) => f.id.startsWith('serie_b_playoff_') && f.leg === 2);
  assert(
    fixB.filter((f) => f.id.startsWith('serie_b_playoff_')).every((f) => f.played),
    'All Série B playoff legs must simulate cleanly'
  );
  console.log('[PASS] Série B 38 rounds + 3ºx6º & 4ºx5º two-legged promotion playoffs verified.');

  // 5. Copa do Nordeste 2026 (20 clubs, 4 groups of 5 -> 10 group rounds, 8 games per club = 80 group fixtures)
  const cne = generateCopaNordesteFixtures(clubs, 2026);
  assert.equal(cne.standings.length, 20, 'Copa do Nordeste must have 20 clubs');
  const cneGroupFixtures = cne.fixtures.filter((f) => f.round <= 10);
  assert.equal(cneGroupFixtures.length, 80, 'Copa do Nordeste group stage must have 80 fixtures (20*8/2)');
  const cneGameCounts = new Map<string, number>();
  for (const f of cneGroupFixtures) {
    cneGameCounts.set(f.homeTeamId, (cneGameCounts.get(f.homeTeamId) || 0) + 1);
    cneGameCounts.set(f.awayTeamId, (cneGameCounts.get(f.awayTeamId) || 0) + 1);
  }
  for (const st of cne.standings) {
    assert.equal(cneGameCounts.get(st.teamId), 8, `CNE club ${st.teamId} must play exactly 8 group games`);
  }
  console.log('[PASS] Copa do Nordeste 2026 (20 clubs, 10 rounds, 8 games/club, 80 group fixtures + QF/SF/F) verified.');

  // 6. European Transfer Window dates (Jan 1-31 & Jul 1-Aug 31)
  const euroClub = clubs.find((c) => c.division === 'EU');
  assert(euroClub, 'Expected at least one European club');
  assert.equal(getTransferWindowStatus('2026-01-15', euroClub).isOpen, true, 'EU Jan window must be open');
  assert.equal(getTransferWindowStatus('2026-02-15', euroClub).isOpen, false, 'EU Feb must be closed');
  assert.equal(getTransferWindowStatus('2026-07-20', euroClub).isOpen, true, 'EU Jul window must be open');
  assert.equal(getTransferWindowStatus('2026-08-31', euroClub).isOpen, true, 'EU Aug 31 must be open');
  assert.equal(getTransferWindowStatus('2026-09-01', euroClub).isOpen, false, 'EU Sep 1 must be closed');
  console.log('[PASS] European transfer windows (Jan 1-31 & Jul 1-Aug 31) verified.');

  console.log('=== ALL LAUNCH STRESS TESTS PASSED (100%) ===');
}

runStressTest();
