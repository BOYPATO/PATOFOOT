import { Club, DetailedRole, InboxMessage, Player, Position } from '../types/game';
import { computeClubStaffBonuses } from './coachingCarouselEngine';

export const ROLE_TO_BROAD_POSITION: Record<DetailedRole, Position> = {
  GOL: 'GK',
  ZAG: 'DF',
  LAT: 'DF',
  VOL: 'MF',
  MEI: 'MF',
  ATA: 'FW',
};

export const DETAILED_ROLE_LABELS: Record<DetailedRole, string> = {
  GOL: 'Goleiro (GOL)',
  ZAG: 'Zagueiro (ZAG)',
  LAT: 'Lateral / Ala (LAT)',
  VOL: 'Volante (VOL)',
  MEI: 'Meia / Armador (MEI)',
  ATA: 'Atacante / Ponta (ATA)',
};

// Players already dominate multiple positions within their own field sector (ZAG<->LAT, VOL<->MEI, ATA<->ME/MD).
// Retraining in the CT unlocks cross-sector secondary roles without OVR loss.
const COMPATIBLE_RETRAINING_ROLES: Record<DetailedRole, DetailedRole[]> = {
  GOL: [],
  ZAG: ['VOL', 'MEI'],
  LAT: ['VOL', 'MEI', 'ATA'],
  VOL: ['ZAG', 'LAT', 'ATA'],
  MEI: ['ATA', 'LAT', 'ZAG'],
  ATA: ['MEI', 'LAT', 'VOL'],
};

export function getAvailableRetrainingRoles(player: Player): DetailedRole[] {
  const base = COMPATIBLE_RETRAINING_ROLES[player.detailedRole] || [];
  const alreadyLearned = new Set(player.secondaryRoles || []);
  return base.filter((role) => role !== player.detailedRole && !alreadyLearned.has(role));
}

export function computeDailyRetrainingGain(player: Player, club: Club): number {
  const ctLevel = Math.max(1, Math.min(5, club.finances.trainingFacilityLevel || 2));
  const staffBonuses = computeClubStaffBonuses(club);

  let baseDaily = 3.2 + (ctLevel - 1) * 0.65;
  if (player.age <= 21) baseDaily *= 1.35;
  else if (player.age <= 25) baseDaily *= 1.15;
  else if (player.age >= 31) baseDaily *= 0.78;

  baseDaily *= staffBonuses.retrainingSpeedMultiplier;
  return Math.max(2, Math.round(baseDaily));
}

export function progressClubSquadPositionRetraining(params: {
  club: Club;
  days: number;
  currentDate: string;
  currentRound: number;
  isUserClub: boolean;
}): {
  updatedSquad: Player[];
  inboxMessages: InboxMessage[];
} {
  const { club, days, currentDate, currentRound, isUserClub } = params;
  const inboxMessages: InboxMessage[] = [];
  if (days <= 0) {
    return { updatedSquad: club.squad, inboxMessages };
  }

  const updatedSquad = club.squad.map((p) => {
    if (!p.retrainingTargetRole || p.injuryWeeks > 0) return p;

    const target = p.retrainingTargetRole;
    const dailyGain = computeDailyRetrainingGain(p, club);
    const nextProgress = (p.retrainingProgress || 0) + dailyGain * days;

    if (nextProgress >= 100) {
      const existingSecondary = p.secondaryRoles || [];
      const nextSecondary = existingSecondary.includes(target)
        ? existingSecondary
        : [...existingSecondary, target];

      if (isUserClub) {
        inboxMessages.push({
          id: `retrain_done_${Date.now()}_${p.id}_${target}`,
          title: `🎯 Nova Função Dominada: ${p.name} agora atua como ${target}!`,
          message: `O trabalho tático no Centro de Treinamento deu resultado! ${p.name} concluiu 100% da adaptação para atuar como ${DETAILED_ROLE_LABELS[target]} sem perda de rendimento. Você também pode converter ${target} na posição principal dele no CT quando desejar.`,
          date: currentDate,
          round: currentRound,
          read: false,
          type: 'BOARD',
        });
      }

      return {
        ...p,
        secondaryRoles: nextSecondary,
        retrainingTargetRole: undefined,
        retrainingProgress: 0,
      };
    }

    return {
      ...p,
      retrainingProgress: Math.min(99, Math.round(nextProgress)),
    };
  });

  return { updatedSquad, inboxMessages };
}

export function switchPlayerPrimaryRoleToLearned(
  player: Player,
  newPrimaryRole: DetailedRole
): Player {
  const currentPrimary = player.detailedRole;
  if (currentPrimary === newPrimaryRole) return player;

  const prevSecondary = (player.secondaryRoles || []).filter((r) => r !== newPrimaryRole);
  const nextSecondary = prevSecondary.includes(currentPrimary)
    ? prevSecondary
    : [...prevSecondary, currentPrimary];

  return {
    ...player,
    detailedRole: newPrimaryRole,
    position: ROLE_TO_BROAD_POSITION[newPrimaryRole],
    secondaryRoles: nextSecondary,
  };
}
