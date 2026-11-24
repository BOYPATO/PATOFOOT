import {
  BoardCapitalRecord,
  Club,
  ClubCommercialState,
  CommercialArenaAssets,
  FinanceCategory,
  FinanceLedgerEntry,
  NamingRightsContract,
  TvBroadcastContract,
  TvContractProfile,
} from '../types/game';
import { getClubEconomyProfile } from './clubEconomyScale';

function recordFinanceLedgerMutation<T extends Club['finances']>(
  finances: T,
  params: {
    date: string;
    category: FinanceCategory;
    type: 'INCOME' | 'EXPENSE';
    amount: number;
    description: string;
    applyToBalance?: boolean;
  }
): T {
  const cleanAmount = Math.max(0, Math.round(params.amount));
  if (cleanAmount <= 0) return finances;

  const prevBreakdown = { ...(finances.seasonBreakdown || {}) };
  prevBreakdown[params.category] = (prevBreakdown[params.category] || 0) + cleanAmount;

  const entry: FinanceLedgerEntry = {
    id: `led_${params.category}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    date: params.date,
    category: params.category,
    type: params.type,
    amount: cleanAmount,
    description: params.description,
  };

  const nextLedger = [entry, ...(finances.ledger || [])].slice(0, 120);

  return {
    ...finances,
    balance: params.applyToBalance
      ? params.type === 'INCOME'
        ? finances.balance + cleanAmount
        : finances.balance - cleanAmount
      : finances.balance,
    totalIncomeSeason:
      params.applyToBalance && params.type === 'INCOME'
        ? finances.totalIncomeSeason + cleanAmount
        : finances.totalIncomeSeason,
    totalExpensesSeason:
      params.applyToBalance && params.type === 'EXPENSE'
        ? finances.totalExpensesSeason + cleanAmount
        : finances.totalExpensesSeason,
    seasonBreakdown: prevBreakdown,
    ledger: nextLedger,
  };
}

export interface NamingRightsOffer {
  id: string;
  brandName: string;
  sector: string;
  arenaDisplayName: string;
  signingBonus: number;
  monthlyFee: number;
  seasonsTotal: number;
  totalValueEstimate: number;
}

export interface TvBroadcastOffer {
  id: string;
  networkName: string;
  profile: TvContractProfile;
  profileLabel: string;
  description: string;
  signingBonus: number;
  monthlyMultiplier: number;
  estimatedMonthlyTotal: number;
  winBonusPerMatch: number;
}

export interface ArenaEventOption {
  id: string;
  title: string;
  category: string;
  description: string;
  grossRevenue: number;
  pitchMaintenanceCost: number;
  netProfit: number;
  minStadiumCapacity: number;
}

export interface ProfitableTourOption {
  id: string;
  title: string;
  region: string;
  description: string;
  appearanceFee: number;
  travelCost: number;
  netRevenue: number;
  newSociosBonus: number;
  squadFatigueCost: number;
}

export type CommercialAssetKey = keyof CommercialArenaAssets;

export interface CommercialAssetSpec {
  key: CommercialAssetKey;
  title: string;
  subtitle: string;
  currentLevel: number;
  maxLevel: number;
  nextUpgradeCost: number;
  currentMonthlyIncome: number;
  nextMonthlyIncome: number;
  currentPerFanMatchBonus: number;
  nextPerFanMatchBonus: number;
}

export interface SolidarityPayoutOffer {
  id: string;
  playerName: string;
  position: string;
  originNote: string;
  destinationClub: string;
  transferFeeReference: number;
  solidarityPct: number;
  payoutAmount: number;
  availableFromRound: number;
}

export interface BoardCapitalOption {
  id: BoardCapitalRecord['optionId'];
  title: string;
  subtitle: string;
  amount: number;
  safMonthlySharePct: number;
  tradeoffNote: string;
}

export interface MonthlyCommercialIncomeSummary {
  namingRightsMonthly: number;
  merchandisingMonthly: number;
  commercialAssetsMonthly: number;
  tvContractMultiplier: number;
  tvContractBonusMonthly: number;
  safShareDeduction: number;
  totalExtraMonthlyIncome: number;
}

export function getDefaultCommercialHub(club?: Club): ClubCommercialState {
  const existing = club?.finances?.commercialHub;
  return {
    namingRights: existing?.namingRights ?? null,
    tvContract: existing?.tvContract ?? null,
    assets: {
      vipBoxesLevel: existing?.assets?.vipBoxesLevel ?? 0,
      museumTourLevel: existing?.assets?.museumTourLevel ?? 0,
      foodPlazaLevel: existing?.assets?.foodPlazaLevel ?? 0,
    },
    merchandising: {
      thirdKitLaunchedSeason: existing?.merchandising?.thirdKitLaunchedSeason ?? null,
      thirdKitName: existing?.merchandising?.thirdKitName,
      commemorativeLaunchedSeason:
        existing?.merchandising?.commemorativeLaunchedSeason ?? null,
      boostUntilRound: existing?.merchandising?.boostUntilRound ?? 0,
      boostMultiplier: existing?.merchandising?.boostMultiplier ?? 1,
      totalKitsSoldSeason: existing?.merchandising?.totalKitsSoldSeason ?? 0,
    },
    lastArenaEventRound: existing?.lastArenaEventRound ?? -99,
    eventsHostedThisSeason: existing?.eventsHostedThisSeason ?? 0,
    eventHistory: existing?.eventHistory ?? [],
    lastTourRound: existing?.lastTourRound ?? -99,
    toursPlayedThisSeason: existing?.toursPlayedThisSeason ?? 0,
    tourHistory: existing?.tourHistory ?? [],
    claimedSolidarityIds: existing?.claimedSolidarityIds ?? [],
    totalSolidaritySeason: existing?.totalSolidaritySeason ?? 0,
    boardInvestment: existing?.boardInvestment ?? null,
  };
}

function roundMoney(value: number, step = 10_000): number {
  if (value < 50_000) return Math.max(5_000, Math.round(value / 1_000) * 1_000);
  if (value < 500_000) return Math.round(value / 5_000) * 5_000;
  return Math.round(value / step) * step;
}

function getCommercialScaleFactor(club: Club): number {
  const profile = getClubEconomyProfile(club);
  const repFactor = 0.68 + Math.max(1, club.reputation || 2) * 0.14;
  return Math.max(0.035, profile.commercialMult * repFactor);
}

// ---------------------------------------------------------------------------
// 1. NAMING RIGHTS DO ESTÁDIO
// ---------------------------------------------------------------------------
export function getNamingRightsOffers(
  club: Club,
  seasonYear: number
): NamingRightsOffer[] {
  const scale = getCommercialScaleFactor(club);
  const stadiumCapBonus = Math.min(1.45, Math.max(0.65, (club.stadium.capacity || 25000) / 38000));
  const combined = scale * stadiumCapBonus;
  const shortClub = club.shortName || club.name.split(' ')[0];

  const templates = [
    {
      id: `nr_neo_${seasonYear}`,
      brandName: 'NeoBanco Digital',
      sector: 'Banco Digital',
      arenaDisplayName: `NeoBanco Arena ${shortClub}`,
      seasonsTotal: 3,
      bonusFactor: 4_800_000,
      monthlyFactor: 420_000,
    },
    {
      id: `nr_atlantico_${seasonYear}`,
      brandName: 'Energia Atlântico',
      sector: 'Energia & Infraestrutura',
      arenaDisplayName: `Arena Atlântico`,
      seasonsTotal: 4,
      bonusFactor: 6_200_000,
      monthlyFactor: 490_000,
    },
    {
      id: `nr_skyline_${seasonYear}`,
      brandName: 'SkyLine Airways',
      sector: 'Aviação Internacional',
      arenaDisplayName: `SkyLine Stadium`,
      seasonsTotal: 5,
      bonusFactor: 8_400_000,
      monthlyFactor: 560_000,
    },
  ];

  return templates.map((t) => {
    const signingBonus = roundMoney(t.bonusFactor * combined);
    const monthlyFee = roundMoney(t.monthlyFactor * combined);
    const totalValueEstimate = signingBonus + monthlyFee * 12 * t.seasonsTotal;
    return {
      id: t.id,
      brandName: t.brandName,
      sector: t.sector,
      arenaDisplayName: t.arenaDisplayName,
      signingBonus,
      monthlyFee,
      seasonsTotal: t.seasonsTotal,
      totalValueEstimate,
    };
  });
}

export function signNamingRightsContract(
  club: Club,
  offer: NamingRightsOffer,
  currentDate: string,
  seasonYear: number
): { ok: boolean; error?: string; updatedClub: Club } {
  const hub = getDefaultCommercialHub(club);
  if (hub.namingRights && hub.namingRights.seasonsRemaining > 0) {
    return {
      ok: false,
      error: `Já existe um contrato de Naming Rights vigente com ${hub.namingRights.brandName} (${hub.namingRights.seasonsRemaining} temp. restante(s)).`,
      updatedClub: club,
    };
  }

  const originalStadiumName =
    hub.namingRights?.originalStadiumName || club.stadium.name;

  const contract: NamingRightsContract = {
    id: offer.id,
    brandName: offer.brandName,
    sector: offer.sector,
    arenaDisplayName: offer.arenaDisplayName,
    originalStadiumName,
    signingBonus: offer.signingBonus,
    monthlyFee: offer.monthlyFee,
    seasonsTotal: offer.seasonsTotal,
    seasonsRemaining: offer.seasonsTotal,
    signedSeasonYear: seasonYear,
    signedDate: currentDate,
  };

  const nextFinances = recordFinanceLedgerMutation(
    {
      ...club.finances,
      commercialHub: {
        ...hub,
        namingRights: contract,
      },
    },
    {
      date: currentDate,
      category: 'COMMERCIAL_EVENTS',
      type: 'INCOME',
      amount: offer.signingBonus,
      description: `Luvas de Naming Rights (${offer.brandName} · ${offer.arenaDisplayName})`,
      applyToBalance: true,
    }
  );

  return {
    ok: true,
    updatedClub: {
      ...club,
      stadium: {
        ...club.stadium,
        name: offer.arenaDisplayName,
      },
      finances: nextFinances,
    },
  };
}

// ---------------------------------------------------------------------------
// 2. DIREITOS DE TV & STREAMING
// ---------------------------------------------------------------------------
export function getBaseMonthlyBroadcast(club: Club): number {
  const rep = Math.max(1, club.reputation || 2);
  const profile = getClubEconomyProfile(club);
  return Math.round(profile.broadcastBaseBase + rep * profile.broadcastBasePerRep);
}

export function getTvBroadcastOffers(
  club: Club,
  seasonYear: number
): TvBroadcastOffer[] {
  const baseMonthly = getBaseMonthlyBroadcast(club);
  const scale = getCommercialScaleFactor(club);

  const specs: Array<{
    id: string;
    networkName: string;
    profile: TvContractProfile;
    profileLabel: string;
    description: string;
    signingFactor: number;
    monthlyMultiplier: number;
    winBonusFactor: number;
  }> = [
    {
      id: `tv_fixo_${seasonYear}`,
      networkName: 'Rede Nacional TV Aberta',
      profile: 'FIXO',
      profileLabel: 'Cota Fixa Garantida',
      description:
        'Maior previsibilidade de fluxo mensal e luvas equilibradas na assinatura da temporada.',
      signingFactor: 2_600_000,
      monthlyMultiplier: 1.24,
      winBonusFactor: 65_000,
    },
    {
      id: `tv_streaming_${seasonYear}`,
      networkName: 'PrimePlay Sports Streaming',
      profile: 'STREAMING',
      profileLabel: 'Streaming + Luvas Altas',
      description:
        'Foco em audiência digital com bônus imediato agressivo no caixa para reforços.',
      signingFactor: 4_400_000,
      monthlyMultiplier: 1.15,
      winBonusFactor: 90_000,
    },
    {
      id: `tv_ppv_${seasonYear}`,
      networkName: 'MegaSports PPV & Clássicos',
      profile: 'PPV_CLASSICOS',
      profileLabel: 'Pay-Per-View & Performance',
      description:
        'Maior multiplicador mensal por audiência de grandes jogos e bônus reforçado por exposição.',
      signingFactor: 1_900_000,
      monthlyMultiplier: 1.32,
      winBonusFactor: 140_000,
    },
  ];

  return specs.map((s) => ({
    id: s.id,
    networkName: s.networkName,
    profile: s.profile,
    profileLabel: s.profileLabel,
    description: s.description,
    signingBonus: roundMoney(s.signingFactor * scale),
    monthlyMultiplier: s.monthlyMultiplier,
    estimatedMonthlyTotal: Math.round(baseMonthly * s.monthlyMultiplier),
    winBonusPerMatch: roundMoney(s.winBonusFactor * scale, 5_000),
  }));
}

export function signTvBroadcastContract(
  club: Club,
  offer: TvBroadcastOffer,
  currentDate: string,
  seasonYear: number
): { ok: boolean; error?: string; updatedClub: Club } {
  const hub = getDefaultCommercialHub(club);
  if (hub.tvContract && hub.tvContract.seasonYear === seasonYear) {
    return {
      ok: false,
      error: `O contrato de TV da temporada ${seasonYear} já foi fechado com ${hub.tvContract.networkName}.`,
      updatedClub: club,
    };
  }

  const contract: TvBroadcastContract = {
    id: offer.id,
    networkName: offer.networkName,
    profile: offer.profile,
    description: offer.description,
    signingBonus: offer.signingBonus,
    monthlyMultiplier: offer.monthlyMultiplier,
    winBonusPerMatch: offer.winBonusPerMatch,
    seasonYear,
    signedDate: currentDate,
  };

  const nextFinances = recordFinanceLedgerMutation(
    {
      ...club.finances,
      commercialHub: {
        ...hub,
        tvContract: contract,
      },
    },
    {
      date: currentDate,
      category: 'TV_BROADCAST',
      type: 'INCOME',
      amount: offer.signingBonus,
      description: `Luvas Contrato de TV (${offer.networkName} · ${offer.profileLabel})`,
      applyToBalance: true,
    }
  );

  return {
    ok: true,
    updatedClub: {
      ...club,
      finances: nextFinances,
    },
  };
}

// ---------------------------------------------------------------------------
// 3. LOJA OFICIAL & LANÇAMENTO DE CAMISAS (MERCHANDISING DINÂMICO)
// ---------------------------------------------------------------------------
export function calculateMerchandisingBreakdown(
  club: Club,
  fanConfidence: number = 68,
  currentRound: number = 1
): {
  starPlayersCount: number;
  topStarNames: string[];
  baseMonthlyRevenue: number;
  starBonusMonthly: number;
  activeBoostMultiplier: number;
  totalMonthlyRevenue: number;
  estimatedMonthlyUnits: number;
  thirdKitLaunchRevenue: number;
  commemorativeLaunchRevenue: number;
} {
  const hub = getDefaultCommercialHub(club);
  const scale = getCommercialScaleFactor(club);
  const stars = club.squad
    .filter((p) => p.overall >= 79)
    .sort((a, b) => b.overall - a.overall);
  const starPlayersCount = stars.length;
  const topStarNames = stars.slice(0, 3).map((p) => `${p.name} (${p.overall})`);

  const sociosFactor = Math.min(2.2, 0.7 + (club.finances.seasonTicketHolders || 2000) / 45000);
  const moraleFactor = 0.8 + Math.max(20, Math.min(100, fanConfidence)) * 0.004;

  const baseMonthlyRevenue = roundMoney(680_000 * scale * sociosFactor * moraleFactor, 5_000);
  const starBonusMonthly = roundMoney(
    starPlayersCount * 115_000 * scale * moraleFactor,
    5_000
  );

  const hasActiveBoost =
    (hub.merchandising.boostUntilRound || 0) >= currentRound &&
    (hub.merchandising.boostMultiplier || 1) > 1;
  const activeBoostMultiplier = hasActiveBoost
    ? hub.merchandising.boostMultiplier || 1.3
    : 1;

  const totalMonthlyRevenue = Math.round(
    (baseMonthlyRevenue + starBonusMonthly) * activeBoostMultiplier
  );

  const avgShirtPrice = 240;
  const estimatedMonthlyUnits = Math.max(80, Math.round(totalMonthlyRevenue / avgShirtPrice));

  const thirdKitLaunchRevenue = roundMoney(
    (1_950_000 + starPlayersCount * 220_000) * scale * moraleFactor
  );
  const commemorativeLaunchRevenue = roundMoney(
    (1_350_000 + starPlayersCount * 160_000) * scale * moraleFactor
  );

  return {
    starPlayersCount,
    topStarNames,
    baseMonthlyRevenue,
    starBonusMonthly,
    activeBoostMultiplier,
    totalMonthlyRevenue,
    estimatedMonthlyUnits,
    thirdKitLaunchRevenue,
    commemorativeLaunchRevenue,
  };
}

export function launchSpecialJerseyCampaign(
  club: Club,
  editionType: 'THIRD_KIT' | 'COMMEMORATIVE',
  currentRound: number,
  currentDate: string,
  seasonYear: number,
  fanConfidence: number = 68
): { ok: boolean; error?: string; revenue: number; unitsSold: number; updatedClub: Club } {
  const hub = getDefaultCommercialHub(club);
  const breakdown = calculateMerchandisingBreakdown(club, fanConfidence, currentRound);

  if (
    editionType === 'THIRD_KIT' &&
    hub.merchandising.thirdKitLaunchedSeason === seasonYear
  ) {
    return {
      ok: false,
      error: `O 3º Uniforme da temporada ${seasonYear} já foi lançado na loja oficial.`,
      revenue: 0,
      unitsSold: 0,
      updatedClub: club,
    };
  }
  if (
    editionType === 'COMMEMORATIVE' &&
    hub.merchandising.commemorativeLaunchedSeason === seasonYear
  ) {
    return {
      ok: false,
      error: `A Camisa Comemorativa da temporada ${seasonYear} já foi lançada.`,
      revenue: 0,
      unitsSold: 0,
      updatedClub: club,
    };
  }

  const revenue =
    editionType === 'THIRD_KIT'
      ? breakdown.thirdKitLaunchRevenue
      : breakdown.commemorativeLaunchRevenue;
  const unitsSold = Math.max(300, Math.round(revenue / 260));
  const label =
    editionType === 'THIRD_KIT'
      ? `Lançamento do 3º Uniforme Oficial ${seasonYear}`
      : `Edição Especial Comemorativa ${seasonYear}`;

  const nextHub: ClubCommercialState = {
    ...hub,
    merchandising: {
      ...hub.merchandising,
      thirdKitLaunchedSeason:
        editionType === 'THIRD_KIT' ? seasonYear : hub.merchandising.thirdKitLaunchedSeason,
      thirdKitName: editionType === 'THIRD_KIT' ? label : hub.merchandising.thirdKitName,
      commemorativeLaunchedSeason:
        editionType === 'COMMEMORATIVE'
          ? seasonYear
          : hub.merchandising.commemorativeLaunchedSeason,
      boostUntilRound: Math.max(hub.merchandising.boostUntilRound || 0, currentRound + 10),
      boostMultiplier: editionType === 'THIRD_KIT' ? 1.35 : 1.25,
      totalKitsSoldSeason: (hub.merchandising.totalKitsSoldSeason || 0) + unitsSold,
    },
  };

  const nextFinances = recordFinanceLedgerMutation(
    {
      ...club.finances,
      commercialHub: nextHub,
    },
    {
      date: currentDate,
      category: 'MERCHANDISING',
      type: 'INCOME',
      amount: revenue,
      description: `${label} (${unitsSold.toLocaleString('pt-BR')} camisas vendidas)`,
      applyToBalance: true,
    }
  );

  return {
    ok: true,
    revenue,
    unitsSold,
    updatedClub: {
      ...club,
      finances: nextFinances,
    },
  };
}

// ---------------------------------------------------------------------------
// 4. SHOWS E EVENTOS NA ARENA (DATAS SEM JOGO)
// ---------------------------------------------------------------------------
export const ARENA_EVENT_COOLDOWN_ROUNDS = 4;
export const ARENA_EVENT_MAX_PER_SEASON = 6;

export function getArenaEventOptions(club: Club): ArenaEventOption[] {
  const scale = getCommercialScaleFactor(club);
  const capFactor = Math.min(1.5, Math.max(0.55, (club.stadium.capacity || 22000) / 35000));
  const combined = scale * capFactor;

  const raw = [
    {
      id: 'evt_corporate_summit',
      title: 'Feira Corporativa & Convenção',
      category: 'Corporativo',
      description:
        'Locação de camarotes e áreas internas sem desgaste pesado do gramado.',
      grossFactor: 850_000,
      pitchCostFactor: 75_000,
      minStadiumCapacity: 5000,
    },
    {
      id: 'evt_national_festival',
      title: 'Festival Musical Nacional',
      category: 'Festival',
      description:
        'Grande público nas arquibancadas com excelente receita de aluguel e bares.',
      grossFactor: 1_950_000,
      pitchCostFactor: 290_000,
      minStadiumCapacity: 15000,
    },
    {
      id: 'evt_world_tour_show',
      title: 'Mega Show Internacional (Turnê Mundial)',
      category: 'Show Internacional',
      description:
        'Arena lotada em data sem jogo — maior faturamento único, exige revitalização rápida do gramado.',
      grossFactor: 3_600_000,
      pitchCostFactor: 540_000,
      minStadiumCapacity: 28000,
    },
  ];

  return raw.map((item) => {
    const grossRevenue = roundMoney(item.grossFactor * combined, 5_000);
    const pitchMaintenanceCost = roundMoney(item.pitchCostFactor * combined, 2_000);
    return {
      id: item.id,
      title: item.title,
      category: item.category,
      description: item.description,
      grossRevenue,
      pitchMaintenanceCost,
      netProfit: Math.max(5_000, grossRevenue - pitchMaintenanceCost),
      minStadiumCapacity: item.minStadiumCapacity,
    };
  });
}

export function hostArenaEvent(
  club: Club,
  eventId: string,
  currentRound: number,
  currentDate: string
): { ok: boolean; error?: string; netProfit: number; updatedClub: Club } {
  const hub = getDefaultCommercialHub(club);
  const option = getArenaEventOptions(club).find((e) => e.id === eventId);
  if (!option) {
    return { ok: false, error: 'Evento não encontrado.', netProfit: 0, updatedClub: club };
  }
  if (club.stadium.capacity < option.minStadiumCapacity) {
    return {
      ok: false,
      error: `Este evento exige estádio com pelo menos ${option.minStadiumCapacity.toLocaleString('pt-BR')} lugares.`,
      netProfit: 0,
      updatedClub: club,
    };
  }
  if (hub.eventsHostedThisSeason >= ARENA_EVENT_MAX_PER_SEASON) {
    return {
      ok: false,
      error: `Limite anual de ${ARENA_EVENT_MAX_PER_SEASON} grandes eventos na arena já foi atingido nesta temporada.`,
      netProfit: 0,
      updatedClub: club,
    };
  }
  const roundsSince = currentRound - (hub.lastArenaEventRound ?? -99);
  if (roundsSince < ARENA_EVENT_COOLDOWN_ROUNDS) {
    return {
      ok: false,
      error: `Aguarde mais ${ARENA_EVENT_COOLDOWN_ROUNDS - roundsSince} rodada(s) para preparar o gramado e liberar nova data de evento.`,
      netProfit: 0,
      updatedClub: club,
    };
  }

  let nextFinances = recordFinanceLedgerMutation(
    {
      ...club.finances,
      commercialHub: {
        ...hub,
        lastArenaEventRound: currentRound,
        eventsHostedThisSeason: hub.eventsHostedThisSeason + 1,
        eventHistory: [
          {
            id: `${option.id}_${currentRound}_${Date.now()}`,
            title: option.title,
            date: currentDate,
            round: currentRound,
            netProfit: option.netProfit,
          },
          ...(hub.eventHistory || []),
        ].slice(0, 10),
      },
    },
    {
      date: currentDate,
      category: 'COMMERCIAL_EVENTS',
      type: 'INCOME',
      amount: option.grossRevenue,
      description: `Aluguel da Arena: ${option.title}`,
      applyToBalance: true,
    }
  );

  nextFinances = recordFinanceLedgerMutation(nextFinances, {
    date: currentDate,
    category: 'FACILITIES_UPKEEP',
    type: 'EXPENSE',
    amount: option.pitchMaintenanceCost,
    description: `Revitalização do gramado pós-evento (${option.title})`,
    applyToBalance: true,
  });

  return {
    ok: true,
    netProfit: option.netProfit,
    updatedClub: {
      ...club,
      finances: nextFinances,
    },
  };
}

// ---------------------------------------------------------------------------
// 5. TURNÊS E AMISTOSOS LUCRATIVOS (PRÉ-TEMPORADA / PAUSA DATA FIFA)
// ---------------------------------------------------------------------------
export const FRIENDLY_TOUR_COOLDOWN_ROUNDS = 8;
export const FRIENDLY_TOUR_MAX_PER_SEASON = 3;

export function getProfitableTourOptions(club: Club): ProfitableTourOption[] {
  const scale = getCommercialScaleFactor(club);
  const sociosBase = Math.max(120, Math.round((club.finances.seasonTicketHolders || 3000) * 0.025));

  const raw = [
    {
      id: 'tour_usa_cup',
      title: 'Amistoso Comercial nos EUA',
      region: 'América do Norte',
      description:
        'Jogo festivo em Orlando/Miami com cota em dólar e captação de novos torcedores.',
      feeFactor: 2_350_000,
      travelFactor: 420_000,
      sociosMult: 1.0,
      fatigue: 4,
    },
    {
      id: 'tour_asia_trophy',
      title: 'Turnê Comercial Ásia (Tóquio / Seul)',
      region: 'Ásia',
      description:
        'Excelente retorno financeiro e forte impulso comercial de marca no mercado asiático.',
      feeFactor: 3_400_000,
      travelFactor: 680_000,
      sociosMult: 1.35,
      fatigue: 6,
    },
    {
      id: 'tour_middle_east',
      title: 'Super Desafio Oriente Médio',
      region: 'Oriente Médio',
      description:
        'Cachê premium pago por promotores internacionais em partida única de exibição.',
      feeFactor: 4_350_000,
      travelFactor: 850_000,
      sociosMult: 1.15,
      fatigue: 7,
    },
  ];

  return raw.map((t) => {
    const appearanceFee = roundMoney(t.feeFactor * scale, 5_000);
    const travelCost = roundMoney(t.travelFactor * scale, 2_000);
    return {
      id: t.id,
      title: t.title,
      region: t.region,
      description: t.description,
      appearanceFee,
      travelCost,
      netRevenue: Math.max(10_000, appearanceFee - travelCost),
      newSociosBonus: Math.max(60, Math.round(sociosBase * t.sociosMult)),
      squadFatigueCost: t.fatigue,
    };
  });
}

export function scheduleProfitableTour(
  club: Club,
  tourId: string,
  currentRound: number,
  currentDate: string
): {
  ok: boolean;
  error?: string;
  netRevenue: number;
  newSociosBonus: number;
  updatedClub: Club;
} {
  const hub = getDefaultCommercialHub(club);
  const option = getProfitableTourOptions(club).find((t) => t.id === tourId);
  if (!option) {
    return {
      ok: false,
      error: 'Turnê não encontrada.',
      netRevenue: 0,
      newSociosBonus: 0,
      updatedClub: club,
    };
  }
  if (hub.toursPlayedThisSeason >= FRIENDLY_TOUR_MAX_PER_SEASON) {
    return {
      ok: false,
      error: `Limite de ${FRIENDLY_TOUR_MAX_PER_SEASON} turnês lucrativas por temporada atingido.`,
      netRevenue: 0,
      newSociosBonus: 0,
      updatedClub: club,
    };
  }
  const roundsSince = currentRound - (hub.lastTourRound ?? -99);
  if (roundsSince < FRIENDLY_TOUR_COOLDOWN_ROUNDS) {
    return {
      ok: false,
      error: `Elenco precisa descansar: próxima janela para amistoso lucrativo em ${FRIENDLY_TOUR_COOLDOWN_ROUNDS - roundsSince} rodada(s).`,
      netRevenue: 0,
      newSociosBonus: 0,
      updatedClub: club,
    };
  }

  let nextFinances = recordFinanceLedgerMutation(
    {
      ...club.finances,
      seasonTicketHolders: (club.finances.seasonTicketHolders || 0) + option.newSociosBonus,
      commercialHub: {
        ...hub,
        lastTourRound: currentRound,
        toursPlayedThisSeason: hub.toursPlayedThisSeason + 1,
        tourHistory: [
          {
            id: `${option.id}_${currentRound}_${Date.now()}`,
            title: option.title,
            region: option.region,
            date: currentDate,
            round: currentRound,
            revenue: option.netRevenue,
            newSociosGained: option.newSociosBonus,
          },
          ...(hub.tourHistory || []),
        ].slice(0, 8),
      },
    },
    {
      date: currentDate,
      category: 'COMMERCIAL_EVENTS',
      type: 'INCOME',
      amount: option.appearanceFee,
      description: `Cachê Internacional: ${option.title} (${option.region})`,
      applyToBalance: true,
    }
  );

  nextFinances = recordFinanceLedgerMutation(nextFinances, {
    date: currentDate,
    category: 'MATCHDAY_OPS',
    type: 'EXPENSE',
    amount: option.travelCost,
    description: `Logística e voo da turnê (${option.title})`,
    applyToBalance: true,
  });

  // Apply light squad fatigue cost cleanly without injuring players
  const updatedSquad = club.squad.map((p) => ({
    ...p,
    condition: Math.max(58, (p.condition ?? 90) - option.squadFatigueCost),
  }));

  return {
    ok: true,
    netRevenue: option.netRevenue,
    newSociosBonus: option.newSociosBonus,
    updatedClub: {
      ...club,
      squad: updatedSquad,
      finances: nextFinances,
    },
  };
}

// ---------------------------------------------------------------------------
// 6. CAMAROTES VIP, TOUR & MUSEU E PRAÇA GASTRONÔMICA
// ---------------------------------------------------------------------------
export function getCommercialAssetSpecs(club: Club): CommercialAssetSpec[] {
  const hub = getDefaultCommercialHub(club);
  const scale = getCommercialScaleFactor(club);

  const defs: Array<{
    key: CommercialAssetKey;
    title: string;
    subtitle: string;
    baseCost: number;
    monthlyPerLevel: number;
    perFanPerLevel: number;
  }> = [
    {
      key: 'vipBoxesLevel',
      title: 'Camarotes VIP Corporativos',
      subtitle: 'Venda anual para empresas + hospitalidade premium em dias de jogo.',
      baseCost: 4_200_000,
      monthlyPerLevel: 380_000,
      perFanPerLevel: 2.8,
    },
    {
      key: 'museumTourLevel',
      title: 'Tour & Museu Interativo do Clube',
      subtitle: 'Receita turística diária com visitação à sala de troféus e gramado.',
      baseCost: 2_800_000,
      monthlyPerLevel: 265_000,
      perFanPerLevel: 1.5,
    },
    {
      key: 'foodPlazaLevel',
      title: 'Shopping & Praça Gastronômica',
      subtitle: 'Aluguel de lojas e aumento direto do ticket médio de bares na arena.',
      baseCost: 3_400_000,
      monthlyPerLevel: 310_000,
      perFanPerLevel: 2.3,
    },
  ];

  return defs.map((d) => {
    const level = hub.assets[d.key] || 0;
    const maxLevel = 3;
    const costMult = level === 0 ? 1 : level === 1 ? 1.55 : 2.25;
    const nextUpgradeCost =
      level < maxLevel ? roundMoney(d.baseCost * scale * costMult) : 0;
    const currentMonthlyIncome =
      level > 0 ? roundMoney(d.monthlyPerLevel * scale * level, 5_000) : 0;
    const nextMonthlyIncome =
      level < maxLevel
        ? roundMoney(d.monthlyPerLevel * scale * (level + 1), 5_000)
        : currentMonthlyIncome;

    const fanScale = scale >= 0.45 ? 1 : 0.55;
    const currentPerFanMatchBonus = Number((level * d.perFanPerLevel * fanScale).toFixed(1));
    const nextPerFanMatchBonus = Number(
      (Math.min(maxLevel, level + 1) * d.perFanPerLevel * fanScale).toFixed(1)
    );

    return {
      key: d.key,
      title: d.title,
      subtitle: d.subtitle,
      currentLevel: level,
      maxLevel,
      nextUpgradeCost,
      currentMonthlyIncome,
      nextMonthlyIncome,
      currentPerFanMatchBonus,
      nextPerFanMatchBonus,
    };
  });
}

export function getCommercialAssetsMatchdayPerFanBonus(club: Club): number {
  const specs = getCommercialAssetSpecs(club);
  return specs.reduce((acc, s) => acc + s.currentPerFanMatchBonus, 0);
}

export function upgradeCommercialArenaAsset(
  club: Club,
  assetKey: CommercialAssetKey,
  currentDate: string
): { ok: boolean; error?: string; cost: number; newLevel: number; updatedClub: Club } {
  const hub = getDefaultCommercialHub(club);
  const spec = getCommercialAssetSpecs(club).find((s) => s.key === assetKey);
  if (!spec) {
    return { ok: false, error: 'Ativo comercial não encontrado.', cost: 0, newLevel: 0, updatedClub: club };
  }
  if (spec.currentLevel >= spec.maxLevel) {
    return {
      ok: false,
      error: `${spec.title} já atingiu o nível máximo (Nível ${spec.maxLevel}).`,
      cost: 0,
      newLevel: spec.currentLevel,
      updatedClub: club,
    };
  }

  const overdraftLimit = getClubEconomyProfile(club).overdraftLimit;
  if (club.finances.balance - spec.nextUpgradeCost < -overdraftLimit) {
    return {
      ok: false,
      error: `Saldo + limite bancário insuficiente para investir em ${spec.title}.`,
      cost: spec.nextUpgradeCost,
      newLevel: spec.currentLevel,
      updatedClub: club,
    };
  }

  const newLevel = spec.currentLevel + 1;
  const nextFinances = recordFinanceLedgerMutation(
    {
      ...club.finances,
      commercialHub: {
        ...hub,
        assets: {
          ...hub.assets,
          [assetKey]: newLevel,
        },
      },
    },
    {
      date: currentDate,
      category: 'INFRASTRUCTURE',
      type: 'EXPENSE',
      amount: spec.nextUpgradeCost,
      description: `Expansão Comercial: ${spec.title} (Nível ${newLevel})`,
      applyToBalance: true,
    }
  );

  return {
    ok: true,
    cost: spec.nextUpgradeCost,
    newLevel,
    updatedClub: {
      ...club,
      finances: nextFinances,
    },
  };
}

// ---------------------------------------------------------------------------
// 7. MECANISMO DE SOLIDARIEDADE FIFA & CLÁUSULAS DE REVENDA
// ---------------------------------------------------------------------------
export function getAvailableSolidarityPayouts(
  club: Club,
  seasonYear: number,
  currentRound: number
): SolidarityPayoutOffer[] {
  const hub = getDefaultCommercialHub(club);
  const scale = getCommercialScaleFactor(club);
  const youthBonus = 0.75 + (club.finances.youthAcademyLevel || 1) * 0.22;
  const mult = scale * youthBonus;

  const seed = club.id.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  const alumniCatalog = [
    {
      suffix: 'w1',
      names: ['Lucas Ribeiro', 'Matheus Cunha Jr.', 'Gabriel Veron', 'Caio Henrique'],
      position: 'ATA',
      destinationClubs: ['FC Porto', 'Benfica', 'Brighton', 'Real Betis'],
      feeFactor: 32_000_000,
      solidarityPct: 5,
      availableFromRound: 1,
    },
    {
      suffix: 'w2',
      names: ['Rafael Veiga Filho', 'Pedro Bicalho', 'João Gomes Jr.', 'Andrey Silva'],
      position: 'MEI',
      destinationClubs: ['Wolverhampton', 'Olympique de Lyon', 'Sevilla', 'Ajax'],
      feeFactor: 44_000_000,
      solidarityPct: 5,
      availableFromRound: 10,
    },
    {
      suffix: 'w3',
      names: ['Murilo Costa', 'Luan Cândido', 'Kaiky Fernandes', 'Bruno Fuchs Jr.'],
      position: 'ZAG',
      destinationClubs: ['Nottingham Forest', 'PSV Eindhoven', 'Bologna', 'Sporting CP'],
      feeFactor: 26_000_000,
      solidarityPct: 10, // includes sell-on + FIFA solidarity
      availableFromRound: 20,
    },
  ];

  return alumniCatalog
    .map((entry, idx) => {
      const id = `sol_${club.id}_${seasonYear}_${entry.suffix}`;
      const name = entry.names[(seed + idx) % entry.names.length];
      const dest = entry.destinationClubs[(seed + idx * 2) % entry.destinationClubs.length];
      const transferFeeReference = roundMoney(entry.feeFactor * mult, 50_000);
      const payoutAmount = Math.max(
        15_000,
        roundMoney((transferFeeReference * entry.solidarityPct) / 100, 5_000)
      );
      return {
        id,
        playerName: name,
        position: entry.position,
        originNote:
          entry.solidarityPct >= 10
            ? 'Mais-valia + Mecanismo FIFA (Base)'
            : 'Mecanismo de Solidariedade FIFA (Clube Formador)',
        destinationClub: dest,
        transferFeeReference,
        solidarityPct: entry.solidarityPct,
        payoutAmount,
        availableFromRound: entry.availableFromRound,
      };
    })
    .filter(
      (item) =>
        currentRound >= item.availableFromRound &&
        !hub.claimedSolidarityIds.includes(item.id)
    );
}

export function claimSolidarityPayout(
  club: Club,
  payoutId: string,
  seasonYear: number,
  currentRound: number,
  currentDate: string
): { ok: boolean; error?: string; amount: number; updatedClub: Club } {
  const hub = getDefaultCommercialHub(club);
  const available = getAvailableSolidarityPayouts(club, seasonYear, currentRound);
  const target = available.find((p) => p.id === payoutId);
  if (!target) {
    return {
      ok: false,
      error: 'Repasse de solidariedade já foi resgatado ou não está disponível.',
      amount: 0,
      updatedClub: club,
    };
  }

  const nextFinances = recordFinanceLedgerMutation(
    {
      ...club.finances,
      commercialHub: {
        ...hub,
        claimedSolidarityIds: [...hub.claimedSolidarityIds, target.id],
        totalSolidaritySeason: (hub.totalSolidaritySeason || 0) + target.payoutAmount,
      },
    },
    {
      date: currentDate,
      category: 'TRANSFERS_IN',
      type: 'INCOME',
      amount: target.payoutAmount,
      description: `${target.originNote}: ${target.playerName} → ${target.destinationClub} (${target.solidarityPct}%)`,
      applyToBalance: true,
    }
  );

  return {
    ok: true,
    amount: target.payoutAmount,
    updatedClub: {
      ...club,
      finances: nextFinances,
    },
  };
}

// ---------------------------------------------------------------------------
// 8. APORTE DA DIRETORIA / PARCERIA SAF
// ---------------------------------------------------------------------------
export function getBoardCapitalOptions(
  club: Club,
  seasonYear: number
): BoardCapitalOption[] {
  const scale = getCommercialScaleFactor(club);

  return [
    {
      id: 'BOARD_REINFORCEMENTS',
      title: 'Aporte da Diretoria para Reforços',
      subtitle: `Injeção pontual de capital do conselho na temporada ${seasonYear}.`,
      amount: roundMoney(5_500_000 * scale),
      safMonthlySharePct: 0,
      tradeoffNote: 'Sem cessão de receitas futuras. Disponível 1 vez por temporada.',
    },
    {
      id: 'BOARD_INFRASTRUCTURE',
      title: 'Fundo Patrimonial (Estádio, CT & Base)',
      subtitle: 'Linha de investimento aprovada pelo conselho para modernização.',
      amount: roundMoney(7_500_000 * scale),
      safMonthlySharePct: 0,
      tradeoffNote: 'Aporte maior voltado a obras e fluxo de caixa. 1 vez por temporada.',
    },
    {
      id: 'SAF_MINORITY_PARTNER',
      title: 'Parceria Comercial SAF (Fatia Minoritária)',
      subtitle: 'Grupo investidor injeta capital pesado em troca de 6% da receita comercial mensal na temporada.',
      amount: roundMoney(14_500_000 * scale),
      safMonthlySharePct: 0.06,
      tradeoffNote: 'Repasse de 6% sobre a receita mensal de TV + Comercial até o fim da temporada.',
    },
  ];
}

export function requestBoardOrSafCapital(
  club: Club,
  optionId: BoardCapitalRecord['optionId'],
  currentDate: string,
  seasonYear: number
): { ok: boolean; error?: string; amount: number; updatedClub: Club } {
  const hub = getDefaultCommercialHub(club);
  if (hub.boardInvestment && hub.boardInvestment.usedSeasonYear === seasonYear) {
    return {
      ok: false,
      error: `O clube já utilizou ${hub.boardInvestment.label} nesta temporada (${seasonYear}).`,
      amount: 0,
      updatedClub: club,
    };
  }

  const option = getBoardCapitalOptions(club, seasonYear).find((o) => o.id === optionId);
  if (!option) {
    return { ok: false, error: 'Opção de aporte inválida.', amount: 0, updatedClub: club };
  }

  const record: BoardCapitalRecord = {
    usedSeasonYear: seasonYear,
    optionId: option.id,
    label: option.title,
    amountReceived: option.amount,
    safMonthlySharePct: option.safMonthlySharePct,
    note: option.tradeoffNote,
    signedDate: currentDate,
  };

  const nextFinances = recordFinanceLedgerMutation(
    {
      ...club.finances,
      commercialHub: {
        ...hub,
        boardInvestment: record,
      },
    },
    {
      date: currentDate,
      category: 'SPONSORS',
      type: 'INCOME',
      amount: option.amount,
      description: `${option.title} (${seasonYear})`,
      applyToBalance: true,
    }
  );

  return {
    ok: true,
    amount: option.amount,
    updatedClub: {
      ...club,
      finances: nextFinances,
    },
  };
}

// ---------------------------------------------------------------------------
// CÁLCULO MENSAL CONSOLIDADO PARA O FLUXO DE CAIXA REAL DO JOGO
// ---------------------------------------------------------------------------
export function calculateMonthlyCommercialHubIncome(
  club: Club,
  fanConfidence: number = 68,
  currentRound: number = 1
): MonthlyCommercialIncomeSummary {
  const hub = getDefaultCommercialHub(club);

  const namingRightsMonthly =
    hub.namingRights && hub.namingRights.seasonsRemaining > 0
      ? hub.namingRights.monthlyFee
      : 0;

  const merchandisingMonthly = calculateMerchandisingBreakdown(
    club,
    fanConfidence,
    currentRound
  ).totalMonthlyRevenue;

  const commercialAssetsMonthly = getCommercialAssetSpecs(club).reduce(
    (sum, spec) => sum + spec.currentMonthlyIncome,
    0
  );

  const baseBroadcast = getBaseMonthlyBroadcast(club);
  const tvContractMultiplier = hub.tvContract?.monthlyMultiplier ?? 1;
  const tvContractBonusMonthly = Math.max(
    0,
    Math.round(baseBroadcast * (tvContractMultiplier - 1))
  );

  const safSharePct = hub.boardInvestment?.safMonthlySharePct ?? 0;
  const grossCommercialBase =
    baseBroadcast +
    tvContractBonusMonthly +
    namingRightsMonthly +
    merchandisingMonthly +
    commercialAssetsMonthly;
  const safShareDeduction =
    safSharePct > 0 ? Math.round(grossCommercialBase * safSharePct) : 0;

  const totalExtraMonthlyIncome =
    namingRightsMonthly +
    merchandisingMonthly +
    commercialAssetsMonthly +
    tvContractBonusMonthly;

  return {
    namingRightsMonthly,
    merchandisingMonthly,
    commercialAssetsMonthly,
    tvContractMultiplier,
    tvContractBonusMonthly,
    safShareDeduction,
    totalExtraMonthlyIncome,
  };
}

/**
 * Atualiza contratos e contadores comerciais na virada de temporada.
 * Mantém permanentemente Camarotes VIP, Museu e Praça Gastronômica.
 */
export function rolloverClubCommercialHubForNewSeason(club: Club): {
  nextStadiumName: string;
  nextCommercialHub: ClubCommercialState | undefined;
} {
  const existing = club.finances.commercialHub;
  if (!existing) {
    return {
      nextStadiumName: club.stadium.name,
      nextCommercialHub: undefined,
    };
  }

  let nextStadiumName = club.stadium.name;
  let nextNamingRights = existing.namingRights ?? null;

  if (nextNamingRights) {
    const remaining = nextNamingRights.seasonsRemaining - 1;
    if (remaining <= 0) {
      nextStadiumName = nextNamingRights.originalStadiumName || club.stadium.name;
      nextNamingRights = null;
    } else {
      nextNamingRights = {
        ...nextNamingRights,
        seasonsRemaining: remaining,
      };
    }
  }

  return {
    nextStadiumName,
    nextCommercialHub: {
      ...existing,
      namingRights: nextNamingRights,
      tvContract: null, // Novo contrato de TV negociável a cada temporada
      merchandising: {
        ...existing.merchandising,
        thirdKitLaunchedSeason: null,
        commemorativeLaunchedSeason: null,
        boostUntilRound: 0,
        boostMultiplier: 1,
        totalKitsSoldSeason: 0,
      },
      lastArenaEventRound: -99,
      eventsHostedThisSeason: 0,
      lastTourRound: -99,
      toursPlayedThisSeason: 0,
      totalSolidaritySeason: 0,
      boardInvestment: null, // Novo aporte / parceria disponível na nova temporada
    },
  };
}
