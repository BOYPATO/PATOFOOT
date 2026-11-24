import { Club, Player } from '../types/game';
import { EconomyTierId, getClubEconomyProfile } from './clubEconomyScale';

export type TransferWillingnessDealType =
  | 'PURCHASE'
  | 'FREE_AGENT'
  | 'LOAN'
  | 'PRE_CONTRACT'
  | 'RELEASE_CLAUSE'
  | 'SCOUT';

export interface PlayerWillingnessResult {
  willing: boolean;
  clubLevelOvr: number;
  maxAcceptableOvr: number;
  hardTierCap: number;
  tierLabel: string;
  reason?: string;
}

export function getClubEffectiveLevelOvr(club: Club): number {
  const profile = getClubEconomyProfile(club);
  const squad = club.squad || [];
  let squadTop11Avg = profile.prestigeOvrAnchor;

  if (squad.length > 0) {
    const topSlice = [...squad]
      .sort((a, b) => b.overall - a.overall)
      .slice(0, Math.min(11, squad.length));
    squadTop11Avg = topSlice.reduce((sum, p) => sum + p.overall, 0) / topSlice.length;
  }

  const rep = Math.max(1, Math.min(5, club.reputation || 2));
  const repDelta = (rep - 3) * 1.15;
  const tierAnchor = profile.prestigeOvrAnchor + repDelta;

  return Math.round((squadTop11Avg * 0.58 + tierAnchor * 0.42) * 10) / 10;
}

function getTierHardOvrCap(tierId: EconomyTierId, reputation: number): number {
  const rep = Math.max(1, Math.min(5, reputation || 2));
  switch (tierId) {
    case 'EST':
      return 66;
    case 'BR_D':
      return rep >= 3 ? 71 : 69;
    case 'EU_4':
      return rep >= 3 ? 72 : 70;
    case 'BR_C':
      return rep >= 3 ? 75 : 73;
    case 'TIER_LOWER_PRO':
      return rep >= 3 ? 76 : 74;
    case 'EU_3':
      return rep >= 4 ? 79 : 77;
    case 'SA_MID':
      return rep >= 4 ? 80 : 78;
    case 'BR_B':
      return rep >= 4 ? 81 : 79;
    case 'WL_HIGH':
      return rep >= 4 ? 85 : 82;
    case 'SA_TOP':
      return rep >= 4 ? 86 : 82;
    case 'EU_2':
      return rep >= 4 ? 86 : 83;
    case 'BR_A':
      return rep >= 5 ? 90 : rep === 4 ? 87 : 84;
    case 'WL_ELITE':
      return rep >= 4 ? 95 : 89;
    case 'EU_TOP5':
      return rep >= 5 ? 99 : rep === 4 ? 91 : 86;
    default:
      return 86;
  }
}

function getTierRank(tierId: EconomyTierId): number {
  switch (tierId) {
    case 'EST':
      return 1;
    case 'BR_D':
      return 2;
    case 'EU_4':
      return 2.5;
    case 'BR_C':
      return 3;
    case 'TIER_LOWER_PRO':
      return 3.5;
    case 'EU_3':
      return 4;
    case 'SA_MID':
      return 4.2;
    case 'BR_B':
      return 4.5;
    case 'WL_HIGH':
      return 5.5;
    case 'SA_TOP':
      return 5.8;
    case 'EU_2':
      return 6.0;
    case 'BR_A':
      return 7.0;
    case 'WL_ELITE':
      return 7.5;
    case 'EU_TOP5':
      return 8.5;
    default:
      return 5;
  }
}

export function evaluatePlayerClubWillingness(
  targetClub: Club,
  player: Pick<Player, 'name' | 'overall' | 'age' | 'potential'>,
  options?: {
    dealType?: TransferWillingnessDealType;
    sellerClub?: Club;
  }
): PlayerWillingnessResult {
  const dealType = options?.dealType || 'PURCHASE';
  const targetProfile = getClubEconomyProfile(targetClub);
  const clubLevelOvr = getClubEffectiveLevelOvr(targetClub);
  const hardTierCap = getTierHardOvrCap(targetProfile.tierId, targetClub.reputation);

  // Tolerância realista por tipo de negociação:
  // Jogadores aceitam um degrau esportivo razoável (~+7 OVR acima da média do time),
  // jovens emprestados ou veteranos livres aceitam até +2 extra para ter minutos.
  let maxGapAboveClub = 7;
  if (dealType === 'LOAN' && player.age <= 23) {
    maxGapAboveClub += 2;
  } else if (dealType === 'FREE_AGENT' && player.age >= 32) {
    maxGapAboveClub += 2;
  } else if (dealType === 'SCOUT' && player.age <= 20) {
    maxGapAboveClub += 1;
  }

  let maxAcceptableOvr = Math.min(hardTierCap, Math.round(clubLevelOvr) + maxGapAboveClub);

  // Se houver clube vendedor em prateleira bem superior, atleta titular/destaque não aceita descer degrau brusco
  if (options?.sellerClub && dealType !== 'FREE_AGENT') {
    const sellerProfile = getClubEconomyProfile(options.sellerClub);
    const tierDrop = getTierRank(sellerProfile.tierId) - getTierRank(targetProfile.tierId);
    const sellerLevelOvr = getClubEffectiveLevelOvr(options.sellerClub);

    if (tierDrop >= 2.5 && player.overall >= sellerLevelOvr - 4) {
      maxAcceptableOvr = Math.min(maxAcceptableOvr, Math.round(clubLevelOvr) + 3);
    } else if (tierDrop >= 1.5 && player.overall >= sellerLevelOvr) {
      maxAcceptableOvr = Math.min(maxAcceptableOvr, Math.round(clubLevelOvr) + 5);
    }
  }

  const willing = player.overall <= maxAcceptableOvr;

  if (willing) {
    return {
      willing: true,
      clubLevelOvr: Math.round(clubLevelOvr),
      maxAcceptableOvr,
      hardTierCap,
      tierLabel: targetProfile.tierLabel,
    };
  }

  const dealVerb =
    dealType === 'LOAN'
      ? 'ir por empréstimo para'
      : dealType === 'PRE_CONTRACT'
      ? 'assinar pré-contrato com'
      : dealType === 'RELEASE_CLAUSE'
      ? 'se transferir via multa rescisória para'
      : 'negociar com';

  const reason = `${player.name} (OVR ${player.overall}) recusou ${dealVerb} o ${targetClub.shortName}. Atletas desse nível buscam clubes de prateleira superior (${targetProfile.tierLabel} · nível atual do elenco ~OVR ${Math.round(
    clubLevelOvr
  )}, teto aceito até OVR ${maxAcceptableOvr}).`;

  return {
    willing: false,
    clubLevelOvr: Math.round(clubLevelOvr),
    maxAcceptableOvr,
    hardTierCap,
    tierLabel: targetProfile.tierLabel,
    reason,
  };
}
