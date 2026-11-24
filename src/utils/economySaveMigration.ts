import { Club, Division, GameSave, Player } from '../types/game';
import { BRAZIL_CURATED_ROSTERS_2026 } from '../data/brazilCuratedRosters2026';
import { getClubEconomyProfile } from './clubEconomyScale';
import { computeRealisticPotential, recalculatePlayerEconomics } from './clubRatingsEngine';
import { computeDefaultReleaseClause } from './contractLifecycleEngine';
import {
  AVAILABLE_TECHNICAL_STAFF_POOL,
  scaleCoachWageForClub,
} from './coachingCarouselEngine';
import { getScoutWeeklySalaryForClub } from './scoutingEngine';

export const CURRENT_ECONOMY_BALANCE_VERSION = 2;

function inferFreeAgentTierDivision(overall: number): Division {
  if (overall <= 62) return 'EST';
  if (overall <= 67) return 'D';
  if (overall <= 71) return 'C';
  if (overall <= 75) return 'B';
  return 'A';
}

function normalizeNameForCuratedLookup(name: string): string {
  return (name || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function repairNameCollisionOverall(player: Player, club: Club): Player {
  const econProfile = getClubEconomyProfile(club);
  const isLowerBrazilianTier =
    club.division === 'EST' ||
    club.division === 'D' ||
    club.division === 'C' ||
    econProfile.tierId === 'EU_4';

  if (!isLowerBrazilianTier) {
    return player;
  }

  // 1. Curated lower-tier players (e.g. _pot26_ in Potiguar like ASSU's Weverton/Fábio)
  // that were accidentally overwritten by global Série A star name collisions
  if (player.id.includes(`${club.id}_pot26_`)) {
    const potTuples = BRAZIL_CURATED_ROSTERS_2026.potiguar?.[club.id];
    if (potTuples) {
      const normPlayer = normalizeNameForCuratedLookup(player.name);
      const matchedTuple = potTuples.find(
        (t) => normalizeNameForCuratedLookup(t[0]) === normPlayer
      );
      if (matchedTuple) {
        const baseCuratedOvr = matchedTuple[2];
        // Allow up to +4 organic evolution, but cure +25 OVR collisions (52 -> 82)
        if (player.overall > baseCuratedOvr + 6) {
          const repairedOvr = Math.min(econProfile.hardOvrCap, baseCuratedOvr + 2);
          return {
            ...player,
            overall: repairedOvr,
            seasonStartOverall: repairedOvr,
            potential: Math.max(
              repairedOvr,
              computeRealisticPotential(repairedOvr, player.age, club.division)
            ),
          };
        }
      }
    }
  }

  // 2. Procedural players (_p_, _gen_, _depth_, regen_) on lower-tier clubs inflated past tier hardOvrCap
  const isProceduralOwn =
    player.id.startsWith(`${club.id}_p_`) ||
    player.id.startsWith(`${club.id}_gen_`) ||
    player.id.startsWith(`${club.id}_depth_`) ||
    player.id.includes(`_${club.id}_`);
  if (isProceduralOwn && player.overall > econProfile.hardOvrCap + 4) {
    const clampedOvr = Math.max(
      48,
      Math.min(econProfile.hardOvrCap - 2, econProfile.prestigeOvrAnchor + 1)
    );
    return {
      ...player,
      overall: clampedOvr,
      seasonStartOverall: clampedOvr,
      potential: Math.max(
        clampedOvr,
        computeRealisticPotential(clampedOvr, player.age, club.division)
      ),
    };
  }

  return player;
}

function rebalanceClubPlayer(rawPlayer: Player, club: Club): Player {
  const player = repairNameCollisionOverall(rawPlayer, club);
  const econ = recalculatePlayerEconomics(
    player.overall,
    player.age,
    club.division,
    club
  );

  const wage =
    player.isLoan && player.loanWageContributionPct !== undefined
      ? Math.max(500, Math.round((econ.wage * player.loanWageContributionPct) / 100))
      : econ.wage;

  const loanOriginalWage = player.isLoan ? econ.wage : player.loanOriginalWage;
  const marketValue = econ.marketValue;
  const releaseClause = computeDefaultReleaseClause(
    { ...player, marketValue },
    club
  );

  const askStep = marketValue < 250_000 ? 10_000 : 50_000;
  const askingPrice =
    player.askingPrice !== undefined
      ? Math.max(10_000, Math.round((marketValue * 1.1) / askStep) * askStep)
      : undefined;

  return {
    ...player,
    marketValue,
    wage,
    loanOriginalWage,
    releaseClause,
    askingPrice,
  };
}

/**
 * Save recalibration (economyBalanceVersion = 2):
 * Repairs lower-tier name-collision OVR outliers and recalibrates player wages,
 * market values, release clauses, coaches, scouting salaries, and weeklyExpenses
 * across all divisions without altering club cash balance, match records, or career progress.
 */
export function rebalanceSaveEconomy(save: GameSave): GameSave {
  if ((save.economyBalanceVersion ?? 0) >= CURRENT_ECONOMY_BALANCE_VERSION) {
    return save;
  }

  const rebalancedClubs = (save.clubs || []).map((club) => {
    const rebalancedSquad = (club.squad || []).map((player) =>
      rebalanceClubPlayer(player, club)
    );

    const rebalancedCoaches = club.coaches
      ? club.coaches.map((coach) => {
          const basePoolWage =
            AVAILABLE_TECHNICAL_STAFF_POOL.find((item) => item.id === coach.id)?.wage ??
            coach.stars * 6_500 + 8_000;
          return {
            ...coach,
            wage: scaleCoachWageForClub(basePoolWage, club),
          };
        })
      : undefined;

    const econProfile = getClubEconomyProfile(club);
    const rep = Math.max(1, Math.min(5, club.reputation || 2));
    const newMonthlyPayroll = rebalancedSquad.reduce((sum, p) => sum + (p.wage || 0), 0);
    const weeklyPayrollEstimate = Math.round(newMonthlyPayroll / 4.3);
    const weeklyOps = Math.round(
      14_000 * Math.max(0.12, econProfile.facilityMult) * (0.85 + rep * 0.12)
    );
    const minWeeklyExpenses =
      econProfile.tierId === 'EST' ? 7_500 : econProfile.tierId === 'BR_D' ? 9_500 : 12_000;
    const weeklyExpenses = Math.max(minWeeklyExpenses, weeklyPayrollEstimate + weeklyOps);

    return {
      ...club,
      squad: rebalancedSquad,
      coaches: rebalancedCoaches,
      finances: {
        ...club.finances,
        weeklyExpenses,
      },
    };
  });

  const rebalancedFreeAgents = (save.transferMarket || []).map((player) => {
    const div = inferFreeAgentTierDivision(player.overall);
    const econ = recalculatePlayerEconomics(player.overall, player.age, div);
    return {
      ...player,
      marketValue: econ.marketValue,
      wage: econ.wage,
      releaseClause: computeDefaultReleaseClause({
        ...player,
        marketValue: econ.marketValue,
      }),
    };
  });

  const userClub =
    rebalancedClubs.find((c) => c.id === save.userClubId) || rebalancedClubs[0];

  const rebalancedScoutingNetwork = save.scoutingNetwork
    ? {
        ...save.scoutingNetwork,
        scouts: (save.scoutingNetwork.scouts || []).map((scout) => {
          const baseByRegion =
            scout.specialtyRegion === 'BRASIL'
              ? 18_000
              : scout.specialtyRegion === 'AMERICA_SUL'
              ? 20_000
              : 22_000;
          const baseSalary = scout.id.startsWith('scout_4th_')
            ? 22_000 + scout.stars * 6_000
            : baseByRegion + scout.stars * 6_200;
          return {
            ...scout,
            weeklySalary: getScoutWeeklySalaryForClub(userClub, baseSalary),
          };
        }),
        prospects: (save.scoutingNetwork.prospects || []).map((prospect) => {
          if (prospect.isSigned) return prospect;
          const tierDiv = inferFreeAgentTierDivision(prospect.player.overall);
          const econ = recalculatePlayerEconomics(
            prospect.player.overall,
            prospect.player.age,
            tierDiv
          );
          const step = econ.marketValue < 250_000 ? 10_000 : 50_000;
          const askingFee = Math.max(
            10_000,
            Math.round((econ.marketValue * 1.12) / step) * step
          );
          return {
            ...prospect,
            player: {
              ...prospect.player,
              marketValue: econ.marketValue,
              wage: econ.wage,
            },
            estimatedMarketValue: econ.marketValue,
            askingFee,
            estimatedValueMin: Math.max(10_000, Math.round((econ.marketValue * 0.85) / 5_000) * 5_000),
            estimatedValueMax: Math.max(15_000, Math.round((econ.marketValue * 1.2) / 5_000) * 5_000),
          };
        }),
      }
    : save.scoutingNetwork;

  return {
    ...save,
    clubs: rebalancedClubs,
    transferMarket: rebalancedFreeAgents,
    scoutingNetwork: rebalancedScoutingNetwork,
    economyBalanceVersion: CURRENT_ECONOMY_BALANCE_VERSION,
  };
}
