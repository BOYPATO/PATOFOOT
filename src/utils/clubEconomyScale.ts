import type {
  Club,
  Division,
  EuropeanLeagueId,
  SouthAmericanLeagueId,
  WorldLeagueId,
} from '../types/game';

const EU_COUNTRY_TO_LEAGUE: Record<string, EuropeanLeagueId> = {
  Inglaterra: 'eng_premier',
  'País de Gales': 'eng_championship',
  Espanha: 'esp_laliga',
  Itália: 'ita_serie_a',
  Alemanha: 'ger_bundesliga',
  França: 'fra_ligue1',
  Portugal: 'por_primeira',
  Holanda: 'ned_eredivisie',
  Bélgica: 'bel_pro_league',
  Turquia: 'tur_super_lig',
  Grécia: 'gre_super_league',
  Noruega: 'nor_eliteserien',
  Dinamarca: 'den_superliga',
  Suíça: 'sui_super_league',
  Suécia: 'swe_allsvenskan',
  Escócia: 'sco_premiership',
};

const SA_COUNTRY_TO_LEAGUE: Record<string, SouthAmericanLeagueId> = {
  Argentina: 'liga_arg',
  'Colômbia': 'liga_col',
  Colombia: 'liga_col',
  Uruguai: 'liga_uru',
  Equador: 'liga_equ',
  Chile: 'liga_chi',
  Paraguai: 'liga_par',
  Peru: 'liga_per',
  'Bolívia': 'liga_bol',
  Bolivia: 'liga_bol',
  Venezuela: 'liga_ven',
};

const WL_COUNTRY_TO_LEAGUE: Record<string, WorldLeagueId> = {
  'Estados Unidos': 'usa_mls',
  México: 'mex_ligamx',
  Canadá: 'can_cpl',
  'Arábia Saudita': 'sau_pro',
  Japão: 'jpn_j1',
  Rússia: 'rus_premier',
  Egito: 'egy_premier',
  Marrocos: 'mar_botola',
};

function resolveEuLeagueId(club?: ClubEconomyContext | null): EuropeanLeagueId | null {
  if (!club || club.division !== 'EU') return null;
  if (
    club.id === 'eu_sp1_cel' ||
    club.id === 'eu_ibe' ||
    club.id === 'eu_ucr' ||
    club.id?.startsWith('eu_esp3_') ||
    club.id?.startsWith('eu_ita3_') ||
    club.id?.startsWith('eu_fra3_') ||
    club.id?.startsWith('eu_ger3_') ||
    club.id?.startsWith('eu_eng5_') ||
    club.id?.startsWith('eu_por2_')
  ) {
    return null;
  }
  if (club.europeanLeagueId) return club.europeanLeagueId;
  if (club.id === 'eu_shk' || club.id?.startsWith('eu_sp1_')) return 'eu_special_1';
  if (club.id?.startsWith('eu_sp2_')) return 'eu_special_2';
  return EU_COUNTRY_TO_LEAGUE[club.country || ''] || 'eng_premier';
}

function resolveSaLeagueId(club?: ClubEconomyContext | null): SouthAmericanLeagueId | null {
  if (!club || club.division !== 'SA') return null;
  if (club.southAmericanLeagueId) return club.southAmericanLeagueId;
  return SA_COUNTRY_TO_LEAGUE[(club.country || '').trim()] || null;
}

function resolveWlLeagueId(club?: ClubEconomyContext | null): WorldLeagueId | null {
  if (!club || club.division !== 'WL') return null;
  if (club.worldLeagueId) return club.worldLeagueId;
  return WL_COUNTRY_TO_LEAGUE[(club.country || '').trim()] || null;
}

export type EconomyTierId =
  | 'EST'
  | 'BR_D'
  | 'BR_C'
  | 'EU_4'
  | 'TIER_LOWER_PRO'
  | 'BR_B'
  | 'EU_3'
  | 'SA_MID'
  | 'SA_TOP'
  | 'EU_2'
  | 'WL_HIGH'
  | 'BR_A'
  | 'EU_TOP5'
  | 'WL_ELITE';

export interface ClubEconomyProfile {
  tierId: EconomyTierId;
  tierLabel: string;
  playerValueFloor: number;
  playerWageFloor: number;
  playerWageScale: number;
  playerValueScale: number;
  facilityMult: number;
  scoutSalaryMult: number;
  scoutMissionMult: number;
  coachSalaryMult: number;
  broadcastBaseBase: number;
  broadcastBasePerRep: number;
  commercialMult: number;
  overdraftLimit: number;
  bankLoanBase: number;
  matchOpsFixed: number;
  perFanOps: number;
  awayTravelCost: number;
  perFanConcession: number;
  refTicket: number;
  socioDivBonus: number;
  socioRefFee: number;
  socioDefaultFee: number;
  socioCampaignMult: number;
  youthTryoutMult: number;
  youthUpgradeMult: number;
  youthWageFloor: number;
  youthWageCap: number;
  managerSalaryFloor: number;
  clauseFloor: number;
  clauseMinFloor: number;
  prestigeOvrAnchor: number;
  hardOvrCap: number;
}

export type ClubEconomyContext =
  | Pick<
      Club,
      'id' | 'division' | 'reputation' | 'country' | 'europeanLeagueId' | 'southAmericanLeagueId' | 'worldLeagueId'
    >
  | {
      id?: string;
      division?: Division;
      reputation?: number;
      country?: string;
      europeanLeagueId?: Club['europeanLeagueId'];
      southAmericanLeagueId?: Club['southAmericanLeagueId'];
      worldLeagueId?: Club['worldLeagueId'];
    };

const ECONOMY_PROFILES: Record<EconomyTierId, ClubEconomyProfile> = {
  EST: {
    tierId: 'EST',
    tierLabel: 'Estadual',
    playerValueFloor: 35_000,
    playerWageFloor: 1_000,
    playerWageScale: 0.30,
    playerValueScale: 0.38,
    facilityMult: 0.12,
    scoutSalaryMult: 0.045,
    scoutMissionMult: 0.08,
    coachSalaryMult: 0.08,
    broadcastBaseBase: 42_000,
    broadcastBasePerRep: 12_000,
    commercialMult: 0.045,
    overdraftLimit: 600_000,
    bankLoanBase: 750_000,
    matchOpsFixed: 4_800,
    perFanOps: 2.2,
    awayTravelCost: 6_000,
    perFanConcession: 5.5,
    refTicket: 20,
    socioDivBonus: 1_200,
    socioRefFee: 22,
    socioDefaultFee: 20,
    socioCampaignMult: 0.05,
    youthTryoutMult: 0.1,
    youthUpgradeMult: 0.14,
    youthWageFloor: 800,
    youthWageCap: 2_200,
    managerSalaryFloor: 3_000,
    clauseFloor: 80_000,
    clauseMinFloor: 60_000,
    prestigeOvrAnchor: 55,
    hardOvrCap: 66,
  },
  BR_D: {
    tierId: 'BR_D',
    tierLabel: 'Série D',
    playerValueFloor: 60_000,
    playerWageFloor: 1_400,
    playerWageScale: 0.40,
    playerValueScale: 0.55,
    facilityMult: 0.2,
    scoutSalaryMult: 0.09,
    scoutMissionMult: 0.16,
    coachSalaryMult: 0.15,
    broadcastBaseBase: 115_000,
    broadcastBasePerRep: 30_000,
    commercialMult: 0.1,
    overdraftLimit: 1_800_000,
    bankLoanBase: 2_500_000,
    matchOpsFixed: 11_000,
    perFanOps: 3.5,
    awayTravelCost: 14_000,
    perFanConcession: 7.0,
    refTicket: 25,
    socioDivBonus: 2_800,
    socioRefFee: 26,
    socioDefaultFee: 25,
    socioCampaignMult: 0.12,
    youthTryoutMult: 0.22,
    youthUpgradeMult: 0.28,
    youthWageFloor: 1_100,
    youthWageCap: 3_500,
    managerSalaryFloor: 5_000,
    clauseFloor: 150_000,
    clauseMinFloor: 100_000,
    prestigeOvrAnchor: 61,
    hardOvrCap: 70,
  },
  BR_C: {
    tierId: 'BR_C',
    tierLabel: 'Série C',
    playerValueFloor: 90_000,
    playerWageFloor: 2_800,
    playerWageScale: 0.56,
    playerValueScale: 0.72,
    facilityMult: 0.38,
    scoutSalaryMult: 0.2,
    scoutMissionMult: 0.32,
    coachSalaryMult: 0.3,
    broadcastBaseBase: 240_000,
    broadcastBasePerRep: 55_000,
    commercialMult: 0.22,
    overdraftLimit: 4_500_000,
    bankLoanBase: 6_000_000,
    matchOpsFixed: 26_000,
    perFanOps: 5.0,
    awayTravelCost: 30_000,
    perFanConcession: 8.5,
    refTicket: 34,
    socioDivBonus: 4_500,
    socioRefFee: 32,
    socioDefaultFee: 30,
    socioCampaignMult: 0.22,
    youthTryoutMult: 0.45,
    youthUpgradeMult: 0.5,
    youthWageFloor: 2_000,
    youthWageCap: 6_500,
    managerSalaryFloor: 10_000,
    clauseFloor: 250_000,
    clauseMinFloor: 180_000,
    prestigeOvrAnchor: 65,
    hardOvrCap: 75,
  },
  EU_4: {
    tierId: 'EU_4',
    tierLabel: '4ª Divisão Europeia',
    playerValueFloor: 100_000,
    playerWageFloor: 3_500,
    playerWageScale: 0.58,
    playerValueScale: 0.75,
    facilityMult: 0.42,
    scoutSalaryMult: 0.22,
    scoutMissionMult: 0.36,
    coachSalaryMult: 0.34,
    broadcastBaseBase: 340_000,
    broadcastBasePerRep: 85_000,
    commercialMult: 0.28,
    overdraftLimit: 5_000_000,
    bankLoanBase: 7_500_000,
    matchOpsFixed: 32_000,
    perFanOps: 5.5,
    awayTravelCost: 28_000,
    perFanConcession: 11.0,
    refTicket: 42,
    socioDivBonus: 5_500,
    socioRefFee: 40,
    socioDefaultFee: 38,
    socioCampaignMult: 0.28,
    youthTryoutMult: 0.5,
    youthUpgradeMult: 0.55,
    youthWageFloor: 2_500,
    youthWageCap: 8_000,
    managerSalaryFloor: 15_000,
    clauseFloor: 300_000,
    clauseMinFloor: 220_000,
    prestigeOvrAnchor: 64,
    hardOvrCap: 71,
  },
  TIER_LOWER_PRO: {
    tierId: 'TIER_LOWER_PRO',
    tierLabel: '1ª Divisão Emergente',
    playerValueFloor: 110_000,
    playerWageFloor: 4_000,
    playerWageScale: 0.62,
    playerValueScale: 0.78,
    facilityMult: 0.45,
    scoutSalaryMult: 0.24,
    scoutMissionMult: 0.38,
    coachSalaryMult: 0.36,
    broadcastBaseBase: 380_000,
    broadcastBasePerRep: 95_000,
    commercialMult: 0.3,
    overdraftLimit: 6_000_000,
    bankLoanBase: 8_000_000,
    matchOpsFixed: 35_000,
    perFanOps: 5.5,
    awayTravelCost: 34_000,
    perFanConcession: 10.0,
    refTicket: 38,
    socioDivBonus: 6_000,
    socioRefFee: 38,
    socioDefaultFee: 35,
    socioCampaignMult: 0.3,
    youthTryoutMult: 0.55,
    youthUpgradeMult: 0.6,
    youthWageFloor: 2_800,
    youthWageCap: 9_000,
    managerSalaryFloor: 15_000,
    clauseFloor: 320_000,
    clauseMinFloor: 240_000,
    prestigeOvrAnchor: 66,
    hardOvrCap: 75,
  },
  BR_B: {
    tierId: 'BR_B',
    tierLabel: 'Série B',
    playerValueFloor: 150_000,
    playerWageFloor: 6_500,
    playerWageScale: 0.74,
    playerValueScale: 0.9,
    facilityMult: 0.65,
    scoutSalaryMult: 0.45,
    scoutMissionMult: 0.6,
    coachSalaryMult: 0.55,
    broadcastBaseBase: 680_000,
    broadcastBasePerRep: 140_000,
    commercialMult: 0.52,
    overdraftLimit: 10_000_000,
    bankLoanBase: 16_000_000,
    matchOpsFixed: 64_000,
    perFanOps: 6.5,
    awayTravelCost: 68_000,
    perFanConcession: 11.5,
    refTicket: 48,
    socioDivBonus: 9_000,
    socioRefFee: 42,
    socioDefaultFee: 40,
    socioCampaignMult: 0.45,
    youthTryoutMult: 0.75,
    youthUpgradeMult: 0.8,
    youthWageFloor: 4_500,
    youthWageCap: 12_000,
    managerSalaryFloor: 24_000,
    clauseFloor: 450_000,
    clauseMinFloor: 350_000,
    prestigeOvrAnchor: 69,
    hardOvrCap: 80,
  },
  EU_3: {
    tierId: 'EU_3',
    tierLabel: 'Liga Europeia Intermediária',
    playerValueFloor: 160_000,
    playerWageFloor: 7_500,
    playerWageScale: 0.74,
    playerValueScale: 0.92,
    facilityMult: 0.68,
    scoutSalaryMult: 0.48,
    scoutMissionMult: 0.62,
    coachSalaryMult: 0.58,
    broadcastBaseBase: 820_000,
    broadcastBasePerRep: 175_000,
    commercialMult: 0.58,
    overdraftLimit: 12_000_000,
    bankLoanBase: 18_000_000,
    matchOpsFixed: 68_000,
    perFanOps: 6.5,
    awayTravelCost: 65_000,
    perFanConcession: 13.0,
    refTicket: 52,
    socioDivBonus: 10_000,
    socioRefFee: 48,
    socioDefaultFee: 45,
    socioCampaignMult: 0.52,
    youthTryoutMult: 0.78,
    youthUpgradeMult: 0.82,
    youthWageFloor: 5_000,
    youthWageCap: 13_500,
    managerSalaryFloor: 25_000,
    clauseFloor: 500_000,
    clauseMinFloor: 380_000,
    prestigeOvrAnchor: 68,
    hardOvrCap: 78,
  },
  SA_MID: {
    tierId: 'SA_MID',
    tierLabel: '1ª Divisão Sul-Americana',
    playerValueFloor: 150_000,
    playerWageFloor: 7_000,
    playerWageScale: 0.76,
    playerValueScale: 0.92,
    facilityMult: 0.65,
    scoutSalaryMult: 0.45,
    scoutMissionMult: 0.6,
    coachSalaryMult: 0.55,
    broadcastBaseBase: 760_000,
    broadcastBasePerRep: 165_000,
    commercialMult: 0.55,
    overdraftLimit: 12_000_000,
    bankLoanBase: 18_000_000,
    matchOpsFixed: 65_000,
    perFanOps: 6.5,
    awayTravelCost: 75_000,
    perFanConcession: 12.0,
    refTicket: 46,
    socioDivBonus: 10_000,
    socioRefFee: 44,
    socioDefaultFee: 42,
    socioCampaignMult: 0.5,
    youthTryoutMult: 0.75,
    youthUpgradeMult: 0.8,
    youthWageFloor: 4_500,
    youthWageCap: 12_500,
    managerSalaryFloor: 24_000,
    clauseFloor: 480_000,
    clauseMinFloor: 350_000,
    prestigeOvrAnchor: 69,
    hardOvrCap: 79,
  },
  SA_TOP: {
    tierId: 'SA_TOP',
    tierLabel: 'Elite Sul-Americana',
    playerValueFloor: 220_000,
    playerWageFloor: 10_000,
    playerWageScale: 0.90,
    playerValueScale: 0.98,
    facilityMult: 0.95,
    scoutSalaryMult: 0.85,
    scoutMissionMult: 0.88,
    coachSalaryMult: 0.88,
    broadcastBaseBase: 1_850_000,
    broadcastBasePerRep: 340_000,
    commercialMult: 0.9,
    overdraftLimit: 24_000_000,
    bankLoanBase: 36_000_000,
    matchOpsFixed: 120_000,
    perFanOps: 7.5,
    awayTravelCost: 125_000,
    perFanConcession: 15.0,
    refTicket: 62,
    socioDivBonus: 18_000,
    socioRefFee: 56,
    socioDefaultFee: 52,
    socioCampaignMult: 0.9,
    youthTryoutMult: 0.95,
    youthUpgradeMult: 0.95,
    youthWageFloor: 7_000,
    youthWageCap: 18_000,
    managerSalaryFloor: 32_000,
    clauseFloor: 700_000,
    clauseMinFloor: 450_000,
    prestigeOvrAnchor: 74,
    hardOvrCap: 84,
  },
  EU_2: {
    tierId: 'EU_2',
    tierLabel: '2ª Prateleira Europeia',
    playerValueFloor: 240_000,
    playerWageFloor: 12_000,
    playerWageScale: 0.92,
    playerValueScale: 1.0,
    facilityMult: 1.0,
    scoutSalaryMult: 0.9,
    scoutMissionMult: 0.92,
    coachSalaryMult: 0.92,
    broadcastBaseBase: 2_350_000,
    broadcastBasePerRep: 420_000,
    commercialMult: 1.05,
    overdraftLimit: 28_000_000,
    bankLoanBase: 42_000_000,
    matchOpsFixed: 140_000,
    perFanOps: 8.5,
    awayTravelCost: 135_000,
    perFanConcession: 17.0,
    refTicket: 72,
    socioDivBonus: 20_000,
    socioRefFee: 65,
    socioDefaultFee: 60,
    socioCampaignMult: 1.0,
    youthTryoutMult: 1.0,
    youthUpgradeMult: 1.0,
    youthWageFloor: 8_500,
    youthWageCap: 20_000,
    managerSalaryFloor: 36_000,
    clauseFloor: 800_000,
    clauseMinFloor: 500_000,
    prestigeOvrAnchor: 74,
    hardOvrCap: 85,
  },
  WL_HIGH: {
    tierId: 'WL_HIGH',
    tierLabel: 'Liga Internacional Principal',
    playerValueFloor: 220_000,
    playerWageFloor: 10_000,
    playerWageScale: 0.92,
    playerValueScale: 0.98,
    facilityMult: 0.95,
    scoutSalaryMult: 0.85,
    scoutMissionMult: 0.9,
    coachSalaryMult: 0.9,
    broadcastBaseBase: 2_100_000,
    broadcastBasePerRep: 380_000,
    commercialMult: 0.95,
    overdraftLimit: 25_000_000,
    bankLoanBase: 38_000_000,
    matchOpsFixed: 130_000,
    perFanOps: 8.0,
    awayTravelCost: 135_000,
    perFanConcession: 16.0,
    refTicket: 68,
    socioDivBonus: 18_000,
    socioRefFee: 60,
    socioDefaultFee: 56,
    socioCampaignMult: 0.95,
    youthTryoutMult: 0.95,
    youthUpgradeMult: 0.95,
    youthWageFloor: 7_500,
    youthWageCap: 19_000,
    managerSalaryFloor: 34_000,
    clauseFloor: 750_000,
    clauseMinFloor: 480_000,
    prestigeOvrAnchor: 73,
    hardOvrCap: 84,
  },
  BR_A: {
    tierId: 'BR_A',
    tierLabel: 'Série A',
    playerValueFloor: 250_000,
    playerWageFloor: 12_000,
    playerWageScale: 0.94,
    playerValueScale: 1.0,
    facilityMult: 1.0,
    scoutSalaryMult: 1.0,
    scoutMissionMult: 1.0,
    coachSalaryMult: 1.0,
    broadcastBaseBase: 2_100_000,
    broadcastBasePerRep: 380_000,
    commercialMult: 1.0,
    overdraftLimit: 30_000_000,
    bankLoanBase: 45_000_000,
    matchOpsFixed: 135_000,
    perFanOps: 7.0,
    awayTravelCost: 145_000,
    perFanConcession: 16.0,
    refTicket: 68,
    socioDivBonus: 22_000,
    socioRefFee: 60,
    socioDefaultFee: 55,
    socioCampaignMult: 1.0,
    youthTryoutMult: 1.0,
    youthUpgradeMult: 1.0,
    youthWageFloor: 8_500,
    youthWageCap: 22_000,
    managerSalaryFloor: 35_000,
    clauseFloor: 800_000,
    clauseMinFloor: 500_000,
    prestigeOvrAnchor: 76,
    hardOvrCap: 89,
  },
  EU_TOP5: {
    tierId: 'EU_TOP5',
    tierLabel: 'Top-5 Europeu',
    playerValueFloor: 350_000,
    playerWageFloor: 18_000,
    playerWageScale: 1.10,
    playerValueScale: 1.08,
    facilityMult: 1.2,
    scoutSalaryMult: 1.15,
    scoutMissionMult: 1.1,
    coachSalaryMult: 1.15,
    broadcastBaseBase: 4_300_000,
    broadcastBasePerRep: 750_000,
    commercialMult: 1.35,
    overdraftLimit: 55_000_000,
    bankLoanBase: 75_000_000,
    matchOpsFixed: 185_000,
    perFanOps: 9.0,
    awayTravelCost: 175_000,
    perFanConcession: 20.0,
    refTicket: 84,
    socioDivBonus: 28_000,
    socioRefFee: 74,
    socioDefaultFee: 66,
    socioCampaignMult: 1.2,
    youthTryoutMult: 1.2,
    youthUpgradeMult: 1.2,
    youthWageFloor: 12_000,
    youthWageCap: 30_000,
    managerSalaryFloor: 45_000,
    clauseFloor: 1_200_000,
    clauseMinFloor: 750_000,
    prestigeOvrAnchor: 80,
    hardOvrCap: 99,
  },
  WL_ELITE: {
    tierId: 'WL_ELITE',
    tierLabel: 'Elite Financeira Mundial',
    playerValueFloor: 300_000,
    playerWageFloor: 16_000,
    playerWageScale: 1.15,
    playerValueScale: 1.05,
    facilityMult: 1.25,
    scoutSalaryMult: 1.15,
    scoutMissionMult: 1.15,
    coachSalaryMult: 1.2,
    broadcastBaseBase: 4_200_000,
    broadcastBasePerRep: 720_000,
    commercialMult: 1.4,
    overdraftLimit: 55_000_000,
    bankLoanBase: 70_000_000,
    matchOpsFixed: 175_000,
    perFanOps: 8.5,
    awayTravelCost: 175_000,
    perFanConcession: 18.0,
    refTicket: 80,
    socioDivBonus: 22_000,
    socioRefFee: 70,
    socioDefaultFee: 64,
    socioCampaignMult: 1.15,
    youthTryoutMult: 1.2,
    youthUpgradeMult: 1.2,
    youthWageFloor: 11_000,
    youthWageCap: 28_000,
    managerSalaryFloor: 45_000,
    clauseFloor: 1_000_000,
    clauseMinFloor: 650_000,
    prestigeOvrAnchor: 77,
    hardOvrCap: 94,
  },
};

export function resolveClubEconomyTier(club?: ClubEconomyContext | null): EconomyTierId {
  if (!club) return 'BR_A';

  const euId = resolveEuLeagueId(club);
  if (euId) {
    if (
      euId === 'eng_premier' ||
      euId === 'esp_laliga' ||
      euId === 'ita_serie_a' ||
      euId === 'ger_bundesliga' ||
      euId === 'fra_ligue1'
    ) {
      return 'EU_TOP5';
    }
    if (
      euId === 'eng_championship' ||
      euId === 'ger_bundesliga2' ||
      euId === 'fra_ligue2' ||
      euId === 'esp_laliga2' ||
      euId === 'ita_serie_b' ||
      euId === 'por_primeira' ||
      euId === 'ned_eredivisie' ||
      euId === 'tur_super_lig' ||
      euId === 'bel_pro_league' ||
      euId === 'gre_super_league' ||
      euId === 'eu_special_1'
    ) {
      return 'EU_2';
    }
    if (euId === 'eng_league_two') {
      return 'EU_4';
    }
    return 'EU_3';
  }

  const saId = resolveSaLeagueId(club);
  if (saId) {
    if (saId === 'liga_arg') return 'SA_TOP';
    if (saId === 'liga_per' || saId === 'liga_bol' || saId === 'liga_ven') {
      return 'TIER_LOWER_PRO';
    }
    return 'SA_MID';
  }

  const wlId = resolveWlLeagueId(club);
  if (wlId) {
    if (wlId === 'sau_pro') return 'WL_ELITE';
    if (
      wlId === 'usa_mls' ||
      wlId === 'mex_ligamx' ||
      wlId === 'rus_premier' ||
      wlId === 'jpn_j1'
    ) {
      return 'WL_HIGH';
    }
    return 'TIER_LOWER_PRO';
  }

  if (club.division === 'EST') return 'EST';
  if (club.division === 'D') return 'BR_D';
  if (club.division === 'C') return 'BR_C';
  if (club.division === 'B') return 'BR_B';
  if (club.division === 'EU') {
    if (club.id?.startsWith('eu_eng5_')) return 'EU_4';
    return club.id?.startsWith('eu_esp3_') ||
      club.id?.startsWith('eu_ita3_') ||
      club.id?.startsWith('eu_fra3_') ||
      club.id?.startsWith('eu_ger3_') ||
      club.id?.startsWith('eu_por2_')
      ? 'EU_3'
      : 'EU_2';
  }
  if (club.division === 'SA') return 'SA_MID';
  if (club.division === 'WL') return 'WL_HIGH';
  return 'BR_A';
}

export function getClubEconomyProfile(club?: ClubEconomyContext | null): ClubEconomyProfile {
  const tierId = resolveClubEconomyTier(club);
  const base = ECONOMY_PROFILES[tierId];
  const euId = club ? resolveEuLeagueId(club) : null;

  // Pequeno ajuste fino para Premier League dentro do Top-5
  if (euId === 'eng_premier') {
    return {
      ...base,
      tierLabel: 'Premier League',
      broadcastBaseBase: 4_850_000,
      commercialMult: 1.45,
      overdraftLimit: 65_000_000,
      bankLoanBase: 85_000_000,
      prestigeOvrAnchor: 82,
    };
  }

  if (euId === 'eng_championship') {
    return {
      ...base,
      tierLabel: 'Championship (2ª ING)',
      broadcastBaseBase: 2_600_000,
      commercialMult: 1.1,
    };
  }

  if (euId === 'ger_bundesliga2') {
    return {
      ...base,
      tierLabel: '2. Bundesliga (2ª ALE)',
      broadcastBaseBase: 2_100_000,
      commercialMult: 1.05,
    };
  }

  if (euId === 'fra_ligue2') {
    return {
      ...base,
      tierLabel: 'Ligue 2 BKT (2ª FRA)',
      broadcastBaseBase: 1_850_000,
      commercialMult: 1.0,
    };
  }

  if (euId === 'esp_laliga2') {
    return {
      ...base,
      tierLabel: 'LALIGA HYPERMOTION (2ª ESP)',
      broadcastBaseBase: 2_000_000,
      commercialMult: 1.03,
    };
  }

  if (euId === 'ita_serie_b') {
    return {
      ...base,
      tierLabel: 'Serie BKT (2ª ITA)',
      broadcastBaseBase: 1_900_000,
      commercialMult: 1.01,
    };
  }

  if (euId === 'eng_league_one') {
    return {
      ...base,
      tierLabel: 'League One (3ª ING)',
    };
  }

  if (club?.id?.startsWith('eu_esp3_')) {
    return {
      ...base,
      tierLabel: 'Primera/Segunda Federación (ESP)',
    };
  }

  if (club?.id?.startsWith('eu_ita3_')) {
    return {
      ...base,
      tierLabel: 'Serie C (ITA)',
    };
  }

  if (club?.id?.startsWith('eu_fra3_')) {
    return {
      ...base,
      tierLabel: 'Championnat National (FRA)',
    };
  }

  if (club?.id?.startsWith('eu_ger3_')) {
    return {
      ...base,
      tierLabel: '3. Liga / Regionalliga (ALE)',
    };
  }

  if (club?.id?.startsWith('eu_eng5_')) {
    return {
      ...base,
      tierLabel: 'Non-League / National League (ING)',
    };
  }

  if (club?.id?.startsWith('eu_por2_')) {
    return {
      ...base,
      tierLabel: 'Liga Portugal 2 / Liga 3 (POR)',
    };
  }

  return base;
}

export function getClubFacilityMonthlyUpkeepBreakdown(club: Club): {
  stadiumUpkeep: number;
  trainingUpkeep: number;
  medicalUpkeep: number;
  youthUpkeep: number;
  totalMonthlyUpkeep: number;
} {
  const profile = getClubEconomyProfile(club);
  const mult = profile.facilityMult;
  const stadiumUpkeep = Math.round((club.stadium.level || club.finances.stadiumLevel || 2) * 85_000 * mult);
  const trainingUpkeep = Math.round((club.finances.trainingFacilityLevel || 2) * 55_000 * mult);
  const medicalUpkeep = Math.round((club.finances.medicalFacilityLevel || 2) * 35_000 * mult);
  const youthUpkeep = Math.round((club.finances.youthAcademyLevel || 2) * 35_000 * mult);

  return {
    stadiumUpkeep,
    trainingUpkeep,
    medicalUpkeep,
    youthUpkeep,
    totalMonthlyUpkeep: stadiumUpkeep + trainingUpkeep + medicalUpkeep + youthUpkeep,
  };
}

export function getClubInfrastructureUpgradeCosts(club: Club): {
  stadiumPlus5k: number;
  stadiumPlus10k: number;
  trainingUpgrade: number;
  medicalUpgrade: number;
  youthUpgrade: number;
} {
  const profile = getClubEconomyProfile(club);
  const mult = Math.max(0.14, profile.facilityMult);
  const round50k = (val: number) => Math.max(250_000, Math.round(val / 50_000) * 50_000);
  return {
    stadiumPlus5k: round50k(8_000_000 * mult),
    stadiumPlus10k: round50k(15_000_000 * mult),
    trainingUpgrade: round50k(6_000_000 * mult),
    medicalUpgrade: round50k(5_000_000 * mult),
    youthUpgrade: round50k(7_000_000 * mult),
  };
}
