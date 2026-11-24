import {
  Club,
  ClubBankLoan,
  ClubFinancialPunishment,
  Division,
  FinanceCategory,
  FinanceLedgerEntry,
  GameSave,
  InboxMessage,
  ManagerCareerState,
  ManagerJobOffer,
  MonthlyFinanceEntry,
  SeasonFinancialAuditReport,
} from '../types/game';
import { formatEuropeanSeason, formatShortDate } from './calendarUtils';
import { computeManagerSalary, getClubSquadAvgOverall } from './boardCareerEngine';
import { isSplitCalendarClub } from './worldLeaguesEngine';
import {
  getClubEconomyProfile,
  getClubFacilityMonthlyUpkeepBreakdown,
} from './clubEconomyScale';
import {
  calculateMonthlyCommercialHubIncome,
  getCommercialAssetsMatchdayPerFanBonus,
  rolloverClubCommercialHubForNewSeason,
} from './commercialRevenueEngine';

export interface FinanceCategoryMeta {
  id: FinanceCategory;
  label: string;
  shortLabel: string;
  type: 'INCOME' | 'EXPENSE';
  accentColor: string;
}

export const FINANCE_CATEGORY_META: Record<FinanceCategory, FinanceCategoryMeta> = {
  TICKETS: {
    id: 'TICKETS',
    label: 'Bilheteria & Matchday',
    shortLabel: 'Bilheteria',
    type: 'INCOME',
    accentColor: '#38bdf8',
  },
  SOCIOS: {
    id: 'SOCIOS',
    label: 'Programa Sócio-Torcedor',
    shortLabel: 'Sócios',
    type: 'INCOME',
    accentColor: '#34d399',
  },
  SPONSORS: {
    id: 'SPONSORS',
    label: 'Patrocínios & Cotas',
    shortLabel: 'Patrocínios',
    type: 'INCOME',
    accentColor: '#22d3ee',
  },
  TV_BROADCAST: {
    id: 'TV_BROADCAST',
    label: 'Direitos de Transmissão (TV & Streaming)',
    shortLabel: 'TV & Mídia',
    type: 'INCOME',
    accentColor: '#60a5fa',
  },
  MERCHANDISING: {
    id: 'MERCHANDISING',
    label: 'Loja Oficial & Camisas (Merchandising)',
    shortLabel: 'Loja & Camisas',
    type: 'INCOME',
    accentColor: '#a855f7',
  },
  COMMERCIAL_EVENTS: {
    id: 'COMMERCIAL_EVENTS',
    label: 'Naming Rights, Shows, Turnês & VIP',
    shortLabel: 'Arena & Eventos',
    type: 'INCOME',
    accentColor: '#14b8a6',
  },
  PRIZES: {
    id: 'PRIZES',
    label: 'Premiações & Metas',
    shortLabel: 'Premiações',
    type: 'INCOME',
    accentColor: '#fbbf24',
  },
  TRANSFERS_IN: {
    id: 'TRANSFERS_IN',
    label: 'Vendas & Empréstimos de Atletas',
    shortLabel: 'Vendas',
    type: 'INCOME',
    accentColor: '#10b981',
  },
  WAGES_SQUAD: {
    id: 'WAGES_SQUAD',
    label: 'Folha Salarial do Elenco',
    shortLabel: 'Folha Elenco',
    type: 'EXPENSE',
    accentColor: '#fb7185',
  },
  STAFF_SCOUTS: {
    id: 'STAFF_SCOUTS',
    label: 'Comissão Técnica, Olheiros & Técnico',
    shortLabel: 'Comissão',
    type: 'EXPENSE',
    accentColor: '#f97316',
  },
  MATCHDAY_OPS: {
    id: 'MATCHDAY_OPS',
    label: 'Operação de Jogos & Viagens',
    shortLabel: 'Operação/Viagens',
    type: 'EXPENSE',
    accentColor: '#f59e0b',
  },
  FACILITIES_UPKEEP: {
    id: 'FACILITIES_UPKEEP',
    label: 'Manutenção de Arena, CT & Base',
    shortLabel: 'Manutenção',
    type: 'EXPENSE',
    accentColor: '#a78bfa',
  },
  INFRASTRUCTURE: {
    id: 'INFRASTRUCTURE',
    label: 'Obras & Expansão Patrimonial',
    shortLabel: 'Obras & CT',
    type: 'EXPENSE',
    accentColor: '#ec4899',
  },
  TRANSFERS_OUT: {
    id: 'TRANSFERS_OUT',
    label: 'Contratações & Empréstimos',
    shortLabel: 'Compras',
    type: 'EXPENSE',
    accentColor: '#ef4444',
  },
  FINANCE_FEES: {
    id: 'FINANCE_FEES',
    label: 'Juros, Multas, Rescisões & Marketing',
    shortLabel: 'Taxas/Juros',
    type: 'EXPENSE',
    accentColor: '#94a3b8',
  },
};

export const INCOME_CATEGORIES_ORDER: FinanceCategory[] = [
  'SPONSORS',
  'TICKETS',
  'SOCIOS',
  'TV_BROADCAST',
  'MERCHANDISING',
  'COMMERCIAL_EVENTS',
  'PRIZES',
  'TRANSFERS_IN',
];

export const EXPENSE_CATEGORIES_ORDER: FinanceCategory[] = [
  'WAGES_SQUAD',
  'STAFF_SCOUTS',
  'MATCHDAY_OPS',
  'FACILITIES_UPKEEP',
  'TRANSFERS_OUT',
  'INFRASTRUCTURE',
  'FINANCE_FEES',
];

export const MONTH_CATALOG: ReadonlyArray<{
  month: number;
  short: string;
  full: string;
}> = [
  { month: 1, short: 'Jan', full: 'Janeiro' },
  { month: 2, short: 'Fev', full: 'Fevereiro' },
  { month: 3, short: 'Mar', full: 'Março' },
  { month: 4, short: 'Abr', full: 'Abril' },
  { month: 5, short: 'Mai', full: 'Maio' },
  { month: 6, short: 'Jun', full: 'Junho' },
  { month: 7, short: 'Jul', full: 'Julho' },
  { month: 8, short: 'Ago', full: 'Agosto' },
  { month: 9, short: 'Set', full: 'Setembro' },
  { month: 10, short: 'Out', full: 'Outubro' },
  { month: 11, short: 'Nov', full: 'Novembro' },
  { month: 12, short: 'Dez', full: 'Dezembro' },
];

export function formatBrlCompact(val: number): string {
  const sign = val < 0 ? '-' : '';
  const abs = Math.abs(val);
  if (abs >= 1_000_000_000) {
    return `${sign}R$ ${(abs / 1_000_000_000).toFixed(2).replace('.', ',')} bi`;
  }
  if (abs >= 1_000_000) {
    return `${sign}R$ ${(abs / 1_000_000).toFixed(1).replace('.', ',')} mi`;
  }
  if (abs >= 1_000) {
    return `${sign}R$ ${Math.round(abs / 1_000)} mil`;
  }
  return `${sign}R$ ${Math.round(abs)}`;
}

export function formatBrlFull(val: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  }).format(val);
}

export function parseDateYearMonth(
  dateStr: string | undefined,
  fallbackYear: number
): { year: number; month: number } {
  if (dateStr && /^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const [y, m] = dateStr.split('-').map(Number);
    return {
      year: y || fallbackYear,
      month: Math.min(12, Math.max(1, m || 1)),
    };
  }
  return { year: fallbackYear, month: 1 };
}

/**
 * Limite de cheque especial bancário permitido ao clube para compras/obras voluntárias.
 * Permite que uma gestão gastadora entre no vermelho caso ultrapasse suas reservas,
 * sujeitando o clube às punições do STJD e demissão ao fim da temporada.
 */
export function getClubOverdraftLimit(divisionOrClub: Division | Club): number {
  if (typeof divisionOrClub === 'string') {
    return getClubEconomyProfile({ division: divisionOrClub }).overdraftLimit;
  }
  return getClubEconomyProfile(divisionOrClub).overdraftLimit;
}

export function isClubUnderTransferBan(
  club: Club,
  currentDate: string
): { banned: boolean; untilDisplay?: string; reason?: string } {
  const punishment = club.finances.activePunishment;
  if (!punishment?.transferBanUntilDate) {
    return { banned: false };
  }
  if (currentDate < punishment.transferBanUntilDate) {
    const untilDisplay = formatShortDate(punishment.transferBanUntilDate);
    return {
      banned: true,
      untilDisplay,
      reason: `Transfer Ban ativo no STJD até ${untilDisplay} por violação do Fair Play Financeiro.`,
    };
  }
  return { banned: false };
}

export function recordFinanceLedgerMutation<T extends Club['finances']>(
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

export function getDefaultTicketPrices(club: Club): {
  popular: number;
  cadeiras: number;
  vip: number;
} {
  const cadeiras = Math.max(15, club.stadium.ticketPrice || 45);
  const popular =
    club.finances.popularTicketPrice ??
    Math.max(15, Math.min(cadeiras - 5, Math.round((cadeiras * 0.62) / 5) * 5));
  const vip =
    club.finances.vipTicketPrice ??
    Math.max(cadeiras + 35, Math.round((cadeiras * 2.55) / 10) * 10);
  return { popular, cadeiras, vip };
}

export function getDefaultSocioPlan(club: Club): {
  monthlyFee: number;
  ticketDiscountPct: number;
} {
  const baseDefaultFee = getClubEconomyProfile(club).socioDefaultFee;

  return {
    monthlyFee: club.finances.socioMonthlyFee ?? baseDefaultFee,
    ticketDiscountPct: club.finances.socioTicketDiscountPct ?? 35,
  };
}

export function calculateSocioMonthlyBreakdown(
  club: Club,
  fanConfidence: number = 68
): {
  totalSocios: number;
  monthlyFee: number;
  ticketDiscountPct: number;
  tiers: {
    popularCount: number;
    popularFee: number;
    popularRevenue: number;
    tradCount: number;
    tradFee: number;
    tradRevenue: number;
    vipCount: number;
    vipFee: number;
    vipRevenue: number;
  };
  totalMonthlyRevenue: number;
  projectedMonthlyGrowth: number;
  maxPotentialSocios: number;
} {
  const totalSocios = Math.max(0, club.finances.seasonTicketHolders || 0);
  const { monthlyFee, ticketDiscountPct } = getDefaultSocioPlan(club);

  const popularCount = Math.round(totalSocios * 0.56);
  const vipCount = Math.round(totalSocios * 0.12);
  const tradCount = Math.max(0, totalSocios - popularCount - vipCount);

  const popularFee = Math.max(15, Math.round(monthlyFee * 0.72));
  const tradFee = Math.max(25, Math.round(monthlyFee * 1.15));
  const vipFee = Math.max(65, Math.round(monthlyFee * 2.2));

  const popularRevenue = popularCount * popularFee;
  const tradRevenue = tradCount * tradFee;
  const vipRevenue = vipCount * vipFee;
  const totalMonthlyRevenue = popularRevenue + tradRevenue + vipRevenue;

  const rep = Math.max(1, club.reputation || 2);
  const clubProfile = getClubEconomyProfile(club);
  const divBonus = clubProfile.socioDivBonus;
  const repScale =
    clubProfile.tierId === 'EST'
      ? 1_800
      : clubProfile.tierId === 'BR_D'
      ? 3_600
      : clubProfile.tierId === 'BR_C' || clubProfile.tierId === 'EU_4'
      ? 6_000
      : 14_500;
  const maxPotentialSocios = Math.max(
    club.stadium.capacity * 1.65,
    rep * repScale + divBonus
  );

  // Value perception curve: fair fee + generous discount + high fan morale attracts members
  const referenceFee = clubProfile.socioRefFee;
  const feeValueScore = (referenceFee - monthlyFee) / referenceFee; // >0 if affordable, <0 if pricey
  const discountScore = (ticketDiscountPct - 30) / 100; // + if >30%
  const moraleScore = (fanConfidence - 55) / 100;
  const saturationRatio = Math.min(1.1, totalSocios / Math.max(1, maxPotentialSocios));

  const netGrowthRate = Math.max(
    -0.045,
    Math.min(
      0.045,
      (0.012 + feeValueScore * 0.032 + discountScore * 0.04 + moraleScore * 0.035) *
        (1 - saturationRatio * 0.65)
    )
  );
  const projectedMonthlyGrowth = Math.round(totalSocios * netGrowthRate);

  return {
    totalSocios,
    monthlyFee,
    ticketDiscountPct,
    tiers: {
      popularCount,
      popularFee,
      popularRevenue,
      tradCount,
      tradFee,
      tradRevenue,
      vipCount,
      vipFee,
      vipRevenue,
    },
    totalMonthlyRevenue,
    projectedMonthlyGrowth,
    maxPotentialSocios: Math.round(maxPotentialSocios),
  };
}

export interface MatchDayEconomicsResult {
  attendance: number;
  occupancyPct: number;
  socioAttendees: number;
  casualAttendees: number;
  sectorBreakdown: {
    popularSeats: number;
    cadeiraSeats: number;
    vipSeats: number;
    popularRev: number;
    cadeiraRev: number;
    vipRev: number;
  };
  gateGrossRevenue: number;
  concessionRevenue: number;
  totalMatchIncome: number;
  homeMatchOpsCost: number;
  netHomeMatchProfit: number;
  awayTravelCost: number;
  averageEffectiveTicket: number;
}

export function calculateMatchDayEconomics(
  homeClub: Club,
  awayClub: Club,
  options?: {
    isRivalry?: boolean;
    isKnockout?: boolean;
    fanConfidence?: number;
    randomJitter?: number; // -0.05..0.05 optional
  }
): MatchDayEconomicsResult {
  const cap = Math.max(4000, homeClub.stadium.capacity || 28000);
  const { popular, cadeiras, vip } = getDefaultTicketPrices(homeClub);
  const { ticketDiscountPct } = getDefaultSocioPlan(homeClub);
  const socios = Math.max(0, homeClub.finances.seasonTicketHolders || 0);

  const homeProfile = getClubEconomyProfile(homeClub);
  const awayProfile = getClubEconomyProfile(awayClub);
  const weightedAvgPrice = popular * 0.5 + cadeiras * 0.4 + vip * 0.1;
  const refAvgPrice = homeProfile.refTicket;

  // Price elasticity: overpriced sectors drop casual demand; fair/cheap prices pack stadium
  const priceRatio = weightedAvgPrice / Math.max(15, refAvgPrice);
  const priceElasticity =
    priceRatio <= 1
      ? Math.min(1.24, 1 + (1 - priceRatio) * 0.45)
      : Math.max(0.28, 1 - Math.pow(priceRatio - 1, 1.18) * 0.68);

  const repAppeal = 0.52 + ((homeClub.reputation + awayClub.reputation) / 10) * 0.34;
  const matchBoost =
    (options?.isRivalry ? 0.22 : 0) + (options?.isKnockout ? 0.14 : 0);
  const confidenceBoost = ((options?.fanConfidence ?? 68) - 60) * 0.0025;
  const jitter = options?.randomJitter ?? 0;

  const demandRate = Math.max(
    0.26,
    Math.min(0.99, (repAppeal + matchBoost + confidenceBoost + jitter) * priceElasticity)
  );

  // Active socios guarantee a realistic attendance floor based on stadium capacity & club base
  const socioCheckInRate = options?.isRivalry ? 0.48 : options?.isKnockout ? 0.42 : 0.32;
  const desiredAttendance = Math.round(cap * demandRate);
  const socioFloor = Math.min(Math.round(cap * 0.65), Math.round(socios * socioCheckInRate));
  const attendance = Math.min(cap, Math.max(socioFloor, desiredAttendance));
  const occupancyPct = Math.round((attendance / cap) * 100);

  const socioAttendees = Math.min(attendance, socioFloor);
  const casualAttendees = Math.max(0, attendance - socioAttendees);

  const popularSeats = Math.round(attendance * 0.52);
  const vipSeats = Math.round(attendance * (priceRatio > 1.35 ? 0.07 : 0.1));
  const cadeiraSeats = Math.max(0, attendance - popularSeats - vipSeats);

  // Socios receive configured ticket discount; casual fans pay 100%
  const discountFactor = 1 - Math.min(0.7, Math.max(0.1, ticketDiscountPct / 100));
  const socioShare = attendance > 0 ? socioAttendees / attendance : 0;
  const effectiveMultiplier = (1 - socioShare) * 1 + socioShare * discountFactor;

  const popularRev = Math.round(popularSeats * popular * effectiveMultiplier);
  const cadeiraRev = Math.round(cadeiraSeats * cadeiras * effectiveMultiplier);
  const vipRev = Math.round(vipSeats * vip * (1 - socioShare * (1 - discountFactor) * 0.5));
  const gateGrossRevenue = popularRev + cadeiraRev + vipRev;

  // Matchday concession, beverages, VIP boxes, museum & food plaza spending per fan
  const commercialAssetPerFanBonus = getCommercialAssetsMatchdayPerFanBonus(homeClub);
  const perFanConcession =
    homeProfile.perFanConcession +
    (homeClub.stadium.level || 2) * (homeProfile.facilityMult >= 0.6 ? 2.2 : 1.0) +
    commercialAssetPerFanBonus;
  const concessionRevenue = Math.round(attendance * perFanConcession);
  const totalMatchIncome = gateGrossRevenue + concessionRevenue;

  // Matchday stadium operating expenses (stewards, security, power, match fees)
  const homeMatchOpsCost = Math.round(
    homeProfile.matchOpsFixed + attendance * homeProfile.perFanOps
  );

  const awayTravelCost = awayProfile.awayTravelCost;

  return {
    attendance,
    occupancyPct,
    socioAttendees,
    casualAttendees,
    sectorBreakdown: {
      popularSeats,
      cadeiraSeats,
      vipSeats,
      popularRev,
      cadeiraRev,
      vipRev,
    },
    gateGrossRevenue,
    concessionRevenue,
    totalMatchIncome,
    homeMatchOpsCost,
    netHomeMatchProfit: totalMatchIncome - homeMatchOpsCost,
    awayTravelCost,
    averageEffectiveTicket: attendance > 0 ? Math.round(gateGrossRevenue / attendance) : cadeiras,
  };
}

export function getBankLoanLimitForClub(club: Club): number {
  const base = getClubEconomyProfile(club).bankLoanBase;
  return Math.round(base * (0.75 + (club.reputation || 2) * 0.1));
}

export function contractClubBankLoan(
  club: Club,
  principalAmount: number,
  termMonths: 6 | 12,
  currentDate: string
): { success: boolean; errorMessage?: string; updatedClub: Club } {
  if (club.finances.bankLoan && club.finances.bankLoan.principalRemaining > 0) {
    return {
      success: false,
      errorMessage: 'Já existe um contrato de empréstimo ativo. Quite o saldo atual antes de contratar outro.',
      updatedClub: club,
    };
  }
  const limit = getBankLoanLimitForClub(club);
  const amount = Math.round(principalAmount);
  if (amount <= 0 || amount > limit) {
    return {
      success: false,
      errorMessage: `Valor fora do limite de crédito aprovado (${formatBrlFull(limit)}).`,
      updatedClub: club,
    };
  }

  const rate = 0.021; // 2.1% a.m. (bem abaixo dos 3.5% do cheque especial)
  const factor = Math.pow(1 + rate, termMonths);
  const monthlyInstallment = Math.round((amount * rate * factor) / (factor - 1));

  const loan: ClubBankLoan = {
    principalRemaining: amount,
    originalPrincipal: amount,
    monthlyInstallment,
    monthsRemaining: termMonths,
    interestRateMonthly: rate,
    takenDate: currentDate,
  };

  const withLedger = recordFinanceLedgerMutation(
    { ...club.finances, bankLoan: loan },
    {
      date: currentDate,
      category: 'FINANCE_FEES',
      type: 'INCOME',
      amount,
      description: `Crédito Bancário Contratado (${termMonths}x de ${formatBrlCompact(monthlyInstallment)}/mês)`,
      applyToBalance: true,
    }
  );

  return {
    success: true,
    updatedClub: {
      ...club,
      finances: withLedger,
    },
  };
}

export function repayClubBankLoan(
  club: Club,
  currentDate: string
): { success: boolean; errorMessage?: string; updatedClub: Club } {
  const loan = club.finances.bankLoan;
  if (!loan || loan.principalRemaining <= 0) {
    return { success: false, errorMessage: 'Nenhum empréstimo ativo para quitar.', updatedClub: club };
  }
  const payoff = Math.round(loan.principalRemaining);
  if (club.finances.balance < payoff) {
    return {
      success: false,
      errorMessage: `Saldo insuficiente para quitação (${formatBrlFull(payoff)}).`,
      updatedClub: club,
    };
  }

  const nextFinances = recordFinanceLedgerMutation(
    { ...club.finances, bankLoan: null },
    {
      date: currentDate,
      category: 'FINANCE_FEES',
      type: 'EXPENSE',
      amount: payoff,
      description: `Quitação Antecipada de Empréstimo Bancário (economia nos juros futuros)`,
      applyToBalance: true,
    }
  );

  return {
    success: true,
    updatedClub: {
      ...club,
      finances: nextFinances,
    },
  };
}

export function launchSocioCampaign(
  club: Club,
  tier: 'digital' | 'matchday' | 'nacional',
  currentRound: number,
  currentDate: string
): {
  success: boolean;
  errorMessage?: string;
  updatedClub: Club;
  newMembersAdded: number;
  campaignCost: number;
} {
  const lastRound = club.finances.lastSocioCampaignRound ?? -99;
  if (currentRound - lastRound < 4) {
    const waitRounds = 4 - (currentRound - lastRound);
    return {
      success: false,
      errorMessage: `Aguarde mais ${waitRounds} rodada(s) para iniciar uma nova campanha de sócios.`,
      updatedClub: club,
      newMembersAdded: 0,
      campaignCost: 0,
    };
  }

  const mult = getClubEconomyProfile(club).socioCampaignMult;

  const specs = {
    digital: { cost: Math.max(12_000, Math.round(280_000 * mult)), baseGain: Math.max(80, Math.round(1450 * mult)), label: 'Campanha Digital Segmentada' },
    matchday: { cost: Math.max(30_000, Math.round(750_000 * mult)), baseGain: Math.max(190, Math.round(3850 * mult)), label: 'Ação Matchday & Embaixadores' },
    nacional: { cost: Math.max(65_000, Math.round(1_650_000 * mult)), baseGain: Math.max(380, Math.round(8200 * mult)), label: 'Mega Campanha Nacional de Sócios' },
  }[tier];

  const overdraft = getClubOverdraftLimit(club);
  if (club.finances.balance - specs.cost < -overdraft) {
    return {
      success: false,
      errorMessage: 'Limite bancário excedido para investir nesta campanha.',
      updatedClub: club,
      newMembersAdded: 0,
      campaignCost: specs.cost,
    };
  }

  const socioCalc = calculateSocioMonthlyBreakdown(club);
  const feeBonus = socioCalc.monthlyFee <= 50 ? 1.15 : socioCalc.monthlyFee >= 95 ? 0.78 : 1.0;
  const gain = Math.max(
    180,
    Math.min(
      Math.max(400, socioCalc.maxPotentialSocios - socioCalc.totalSocios),
      Math.round(specs.baseGain * feeBonus * (0.85 + (club.reputation || 2) * 0.08))
    )
  );

  const nextFinances = recordFinanceLedgerMutation(
    {
      ...club.finances,
      seasonTicketHolders: club.finances.seasonTicketHolders + gain,
      lastSocioGrowthDelta: gain,
      lastSocioCampaignRound: currentRound,
    },
    {
      date: currentDate,
      category: 'FINANCE_FEES',
      type: 'EXPENSE',
      amount: specs.cost,
      description: `${specs.label} (+${gain.toLocaleString('pt-BR')} novos sócios)`,
      applyToBalance: true,
    }
  );

  return {
    success: true,
    updatedClub: {
      ...club,
      finances: nextFinances,
    },
    newMembersAdded: gain,
    campaignCost: specs.cost,
  };
}

export function calculateClubMonthlyFixedFlow(
  club: Club,
  scoutingWeeklyTotal: number = 0,
  managerMonthlySalary: number = 0,
  fanConfidence: number = 68,
  currentRound: number = 1
): {
  monthlySquadWages: number;
  monthlyCoachesAndManager: number;
  monthlyScouts: number;
  monthlyFacilityUpkeep: number;
  monthlyStaffAndUpkeep: number;
  monthlyOverdraftInterest: number;
  monthlyBankLoanInstallment: number;
  monthlySafShareExpense: number;
  totalMonthlyFixedExpenses: number;
  monthlySocioRevenue: number;
  monthlyBroadcastBase: number;
  monthlyMerchandisingRevenue: number;
  monthlyNamingRightsRevenue: number;
  monthlyCommercialAssetsRevenue: number;
  totalMonthlyFixedIncome: number;
  estimatedMonthlyNetFixed: number;
} {
  const monthlySquadWages = club.squad.reduce((acc, p) => acc + (p.wage || 0), 0);

  const coachesMonthly = (club.coaches || []).reduce((acc, c) => acc + (c.wage || 0) * 4, 0);
  const monthlyCoachesAndManager = Math.round(coachesMonthly + managerMonthlySalary);
  const monthlyScouts = Math.round(scoutingWeeklyTotal * 4);
  const monthlyFacilityUpkeep = getClubFacilityMonthlyUpkeepBreakdown(club).totalMonthlyUpkeep;

  const monthlyStaffAndUpkeep = Math.round(
    monthlyCoachesAndManager + monthlyScouts + monthlyFacilityUpkeep
  );

  // Juros bancários de 3,5% ao mês sobre saldo negativo (cheque especial esportivo)
  const monthlyOverdraftInterest =
    club.finances.balance < 0 ? Math.round(Math.abs(club.finances.balance) * 0.035) : 0;

  const activeLoan = club.finances.bankLoan;
  const monthlyBankLoanInstallment =
    activeLoan && activeLoan.monthsRemaining > 0 ? activeLoan.monthlyInstallment : 0;

  const monthlySocioRevenue = calculateSocioMonthlyBreakdown(club, fanConfidence).totalMonthlyRevenue;
  const rep = Math.max(1, club.reputation || 2);
  const clubProfile = getClubEconomyProfile(club);
  const commercialMonthly = calculateMonthlyCommercialHubIncome(
    club,
    fanConfidence,
    currentRound
  );
  const rawBroadcastBase =
    clubProfile.broadcastBaseBase + rep * clubProfile.broadcastBasePerRep;
  const monthlyBroadcastBase = Math.round(
    rawBroadcastBase + commercialMonthly.tvContractBonusMonthly
  );
  const monthlyMerchandisingRevenue = commercialMonthly.merchandisingMonthly;
  const monthlyNamingRightsRevenue = commercialMonthly.namingRightsMonthly;
  const monthlyCommercialAssetsRevenue = commercialMonthly.commercialAssetsMonthly;
  const monthlySafShareExpense = commercialMonthly.safShareDeduction;

  const totalMonthlyFixedExpenses =
    monthlySquadWages +
    monthlyStaffAndUpkeep +
    monthlyOverdraftInterest +
    monthlyBankLoanInstallment +
    monthlySafShareExpense;

  const totalMonthlyFixedIncome =
    monthlySocioRevenue +
    monthlyBroadcastBase +
    monthlyMerchandisingRevenue +
    monthlyNamingRightsRevenue +
    monthlyCommercialAssetsRevenue;

  return {
    monthlySquadWages,
    monthlyCoachesAndManager,
    monthlyScouts,
    monthlyFacilityUpkeep,
    monthlyStaffAndUpkeep,
    monthlyOverdraftInterest,
    monthlyBankLoanInstallment,
    monthlySafShareExpense,
    totalMonthlyFixedExpenses,
    monthlySocioRevenue,
    monthlyBroadcastBase,
    monthlyMerchandisingRevenue,
    monthlyNamingRightsRevenue,
    monthlyCommercialAssetsRevenue,
    totalMonthlyFixedIncome,
    estimatedMonthlyNetFixed: totalMonthlyFixedIncome - totalMonthlyFixedExpenses,
  };
}

interface FiscalSlotMeta {
  slotIdx: number;
  month: number;
  year: number;
  short: string;
  full: string;
  monthKey: string;
}

export function getClubFiscalCalendar(isEu: boolean, baseSeasonYear: number): FiscalSlotMeta[] {
  if (!isEu) {
    return MONTH_CATALOG.map((m, idx) => ({
      slotIdx: idx,
      month: m.month,
      year: baseSeasonYear,
      short: m.short,
      full: m.full,
      monthKey: `${baseSeasonYear}-${String(m.month).padStart(2, '0')}`,
    }));
  }

  // European fiscal season: Ago..Dez (baseSeasonYear) + Jan..Jul (baseSeasonYear + 1)
  const euOrder = [8, 9, 10, 11, 12, 1, 2, 3, 4, 5, 6, 7];
  return euOrder.map((mNum, idx) => {
    const meta = MONTH_CATALOG[mNum - 1];
    const yr = mNum >= 8 ? baseSeasonYear : baseSeasonYear + 1;
    return {
      slotIdx: idx,
      month: mNum,
      year: yr,
      short: meta.short,
      full: meta.full,
      monthKey: `${yr}-${String(mNum).padStart(2, '0')}`,
    };
  });
}

function resolveFiscalSlotIndex(
  slots: FiscalSlotMeta[],
  year: number,
  month: number
): number {
  const exact = slots.findIndex((s) => s.year === year && s.month === month);
  if (exact >= 0) return exact;
  const targetKey = `${year}-${String(month).padStart(2, '0')}`;
  if (targetKey < slots[0].monthKey) return 0;
  return slots.length - 1;
}

/**
 * Garante que o clube possua o histórico dos 12 meses da temporada atual
 * (Jan–Dez na América do Sul, ou Ago–Jul na Europa).
 */
export function ensureClubMonthlyFinanceHistory(
  club: Club,
  currentDate: string,
  seasonYear: number
): Club {
  const isEu = isSplitCalendarClub(club);
  const slots = getClubFiscalCalendar(isEu, seasonYear);
  const { year: curYear, month: curMonth } = parseDateYearMonth(currentDate, seasonYear);
  const currentSlotIdx = resolveFiscalSlotIndex(slots, curYear, curMonth);
  const existing = club.finances.monthlyHistory;

  if (
    existing &&
    existing.length === 12 &&
    existing[0]?.month === slots[0].month &&
    existing[0]?.seasonYear === slots[0].year
  ) {
    return club;
  }

  const totalInc = club.finances.totalIncomeSeason || 0;
  const totalExp = club.finances.totalExpensesSeason || 0;
  const inferredStartBalance =
    club.finances.seasonStartBalance !== undefined
      ? club.finances.seasonStartBalance
      : club.finances.balance - totalInc + totalExp;

  const history: MonthlyFinanceEntry[] = [];
  let runningBalance = inferredStartBalance;
  const activeMonthsCount = Math.max(1, currentSlotIdx + 1);

  for (let i = 0; i < 12; i++) {
    const slot = slots[i];
    if (i < currentSlotIdx) {
      const monthInc = Math.round(totalInc / activeMonthsCount);
      const monthExp = Math.round(totalExp / activeMonthsCount);
      const closing = runningBalance + monthInc - monthExp;
      history.push({
        month: slot.month,
        monthLabel: slot.short,
        fullMonthName: slot.full,
        seasonYear: slot.year,
        openingBalance: runningBalance,
        closingBalance: closing,
        income: monthInc,
        expenses: monthExp,
        netFlow: monthInc - monthExp,
        recorded: true,
      });
      runningBalance = closing;
    } else if (i === currentSlotIdx) {
      const priorInc = history.reduce((s, e) => s + e.income, 0);
      const priorExp = history.reduce((s, e) => s + e.expenses, 0);
      const curInc = Math.max(0, totalInc - priorInc);
      const curExp = Math.max(0, totalExp - priorExp);
      const closing = club.finances.balance;
      history.push({
        month: slot.month,
        monthLabel: slot.short,
        fullMonthName: slot.full,
        seasonYear: slot.year,
        openingBalance: runningBalance,
        closingBalance: closing,
        income: curInc,
        expenses: curExp,
        netFlow: closing - runningBalance,
        recorded: true,
      });
      runningBalance = closing;
    } else {
      history.push({
        month: slot.month,
        monthLabel: slot.short,
        fullMonthName: slot.full,
        seasonYear: slot.year,
        openingBalance: runningBalance,
        closingBalance: runningBalance,
        income: 0,
        expenses: 0,
        netFlow: 0,
        recorded: false,
      });
    }
  }

  const monthKey = slots[currentSlotIdx].monthKey;

  return {
    ...club,
    finances: {
      ...club.finances,
      seasonStartBalance: inferredStartBalance,
      monthlyHistory: history,
      lastPayrollMonthKey: club.finances.lastPayrollMonthKey || monthKey,
      lastRecordedIncomeTotal: totalInc,
      lastRecordedExpensesTotal: totalExp,
    },
  };
}

/**
 * Sincroniza em tempo real o saldo e as receitas/despesas do mês corrente do clube do usuário
 * (ex: após compra/venda de jogador, bilheteria de jogo, premiação, patrocínio ou obra no estádio).
 */
export function syncUserClubLiveMonthlySnapshot(
  club: Club,
  currentDate: string,
  seasonYear: number
): Club {
  const isEu = isSplitCalendarClub(club);
  const baseClub = ensureClubMonthlyFinanceHistory(club, currentDate, seasonYear);
  const slots = getClubFiscalCalendar(isEu, seasonYear);
  const { year: curYear, month: curMonth } = parseDateYearMonth(currentDate, seasonYear);
  const idx = resolveFiscalSlotIndex(slots, curYear, curMonth);
  const history = [...(baseClub.finances.monthlyHistory || [])];

  const prevIncTotal = baseClub.finances.lastRecordedIncomeTotal ?? baseClub.finances.totalIncomeSeason;
  const prevExpTotal =
    baseClub.finances.lastRecordedExpensesTotal ?? baseClub.finances.totalExpensesSeason;

  const deltaInc = Math.max(0, baseClub.finances.totalIncomeSeason - prevIncTotal);
  const deltaExp = Math.max(0, baseClub.finances.totalExpensesSeason - prevExpTotal);

  if (history[idx]) {
    const entry = history[idx];
    const nextInc = entry.income + deltaInc;
    const nextExp = entry.expenses + deltaExp;
    const nextClosing = baseClub.finances.balance;

    history[idx] = {
      ...entry,
      income: nextInc,
      expenses: nextExp,
      closingBalance: nextClosing,
      netFlow: nextClosing - entry.openingBalance,
      recorded: true,
    };

    // Propaga saldo de abertura para meses futuros ainda não jogados
    for (let futureIdx = idx + 1; futureIdx < 12; futureIdx++) {
      if (!history[futureIdx].recorded) {
        history[futureIdx] = {
          ...history[futureIdx],
          openingBalance: nextClosing,
          closingBalance: nextClosing,
        };
      }
    }
  }

  return {
    ...baseClub,
    finances: {
      ...baseClub.finances,
      monthlyHistory: history,
      lastRecordedIncomeTotal: baseClub.finances.totalIncomeSeason,
      lastRecordedExpensesTotal: baseClub.finances.totalExpensesSeason,
    },
  };
}

/**
 * Processa a virada mensal do calendário (Jan–Dez na América do Sul ou Ago–Jul na Europa):
 * - Debita folha salarial mensal do elenco, comissão técnica, manutenção e juros bancários (se no vermelho)
 * - Credita receita mensal de sócios-torcedores e cota comercial fixa da divisão
 * - Registra fechamento e abertura no histórico mês a mês do gráfico Recharts
 * - Emite alertas da diretoria se o clube entrar no vermelho ou estiver gastando mais do que arrecada
 */
export function processMonthlyFinancialTurn(
  prevDate: string,
  state: GameSave
): GameSave {
  const userClubRaw = state.clubs.find((c) => c.id === state.userClubId);
  if (!userClubRaw) return state;

  const isEu = isSplitCalendarClub(userClubRaw);
  const activeFiscalYear = isEu
    ? state.europeSeasonYear ?? state.currentSeasonYear
    : state.currentSeasonYear;
  const slots = getClubFiscalCalendar(isEu, activeFiscalYear);

  // Primeiro sincroniza quaisquer transações ocorridas ainda na data anterior
  let userClub = syncUserClubLiveMonthlySnapshot(
    userClubRaw,
    prevDate || state.currentDate,
    activeFiscalYear
  );

  const { year: curYear, month: curMonth } = parseDateYearMonth(
    state.currentDate,
    activeFiscalYear
  );
  const curMonthKey = `${curYear}-${String(curMonth).padStart(2, '0')}`;

  if (curMonthKey < slots[0].monthKey || curMonthKey > slots[11].monthKey) {
    return {
      ...state,
      clubs: state.clubs.map((c) => (c.id === userClub.id ? userClub : c)),
    };
  }

  const curSlotIdx = resolveFiscalSlotIndex(slots, curYear, curMonth);
  const lastKey = userClub.finances.lastPayrollMonthKey || slots[0].monthKey;
  const [lastYearStr, lastMonthStr] = lastKey.split('-');
  const lastYear = Number(lastYearStr) || slots[0].year;
  const lastMonth = Number(lastMonthStr) || slots[0].month;
  const lastSlotIdx =
    lastKey < slots[0].monthKey ? 0 : resolveFiscalSlotIndex(slots, lastYear, lastMonth);

  const newInboxMessages: InboxMessage[] = [];

  // Verifica se algum Transfer Ban expirou na data atual
  if (
    userClub.finances.activePunishment?.transferBanUntilDate &&
    state.currentDate >= userClub.finances.activePunishment.transferBanUntilDate
  ) {
    userClub = {
      ...userClub,
      finances: {
        ...userClub.finances,
        activePunishment: {
          ...userClub.finances.activePunishment,
          transferBanUntilDate: undefined,
        },
      },
    };
    newInboxMessages.push({
      id: `msg_transfer_ban_lifted_${state.currentDate}_${Date.now()}`,
      title: `Fair Play Financeiro: Fim do Transfer Ban`,
      message: `O período de bloqueio de contratações imposto pelo Fair Play Financeiro ao ${userClub.name} chegou ao fim. O clube está novamente autorizado a registrar reforços nas janelas abertas.`,
      date: formatShortDate(state.currentDate),
      round: state.currentRound,
      read: false,
      type: 'FINANCE',
    });
  }

  if (curSlotIdx <= lastSlotIdx) {
    // Mesmo mês: apenas garante snapshot atualizado
    const syncedClub = syncUserClubLiveMonthlySnapshot(
      userClub,
      state.currentDate,
      activeFiscalYear
    );
    return {
      ...state,
      clubs: state.clubs.map((c) => (c.id === syncedClub.id ? syncedClub : c)),
      inbox: newInboxMessages.length > 0 ? [...newInboxMessages, ...state.inbox] : state.inbox,
    };
  }

  const scoutingWeekly = (state.scoutingNetwork?.scouts || []).reduce(
    (s, sc) => s + (sc.weeklySalary || 0),
    0
  );
  const managerSalary =
    state.managerCareer?.monthlySalary ??
    computeManagerSalary(userClub, state.managerCareer?.managerReputation ?? 50);
  const fanConf = state.managerCareer?.fanConfidence ?? 68;

  const history = [...(userClub.finances.monthlyHistory || [])];
  let balance = userClub.finances.balance;
  let totalInc = userClub.finances.totalIncomeSeason;
  let totalExp = userClub.finances.totalExpensesSeason;
  let breakdownWorking = { ...(userClub.finances.seasonBreakdown || {}) };
  let ledgerWorking = [...(userClub.finances.ledger || [])];
  let sociosCount = userClub.finances.seasonTicketHolders || 0;
  let lastSocioDelta = userClub.finances.lastSocioGrowthDelta || 0;
  let loanWorking = userClub.finances.bankLoan ? { ...userClub.finances.bankLoan } : null;

  const closingMonthName = isEu ? 'Maio' : 'Dezembro';
  const regulatorLabel = isEu ? 'Fair Play Financeiro da UEFA' : 'STJD';

  const appendTurnLedger = (
    cat: FinanceCategory,
    type: 'INCOME' | 'EXPENSE',
    amount: number,
    date: string,
    desc: string
  ) => {
    const clean = Math.round(amount);
    if (clean <= 0) return;
    breakdownWorking[cat] = (breakdownWorking[cat] || 0) + clean;
    ledgerWorking = [
      {
        id: `led_m_${cat}_${date}_${Math.random().toString(36).slice(2, 6)}`,
        date,
        category: cat,
        type,
        amount: clean,
        description: desc,
      },
      ...ledgerWorking,
    ].slice(0, 120);
  };

  for (let sIdx = lastSlotIdx + 1; sIdx <= curSlotIdx; sIdx++) {
    const slot = slots[sIdx];
    const slotDateStr = `${slot.year}-${String(slot.month).padStart(2, '0')}-01`;
    const tempClub: Club = {
      ...userClub,
      finances: {
        ...userClub.finances,
        balance,
        seasonTicketHolders: sociosCount,
        bankLoan: loanWorking,
      },
    };
    const fixed = calculateClubMonthlyFixedFlow(
      tempClub,
      scoutingWeekly,
      managerSalary,
      fanConf,
      state.currentRound
    );

    const openingBal = balance;
    const monthInc = fixed.totalMonthlyFixedIncome;
    const monthExp = fixed.totalMonthlyFixedExpenses;
    balance = balance + monthInc - monthExp;
    totalInc += monthInc;
    totalExp += monthExp;

    // Record itemized monthly income & expense breakdown
    appendTurnLedger(
      'SOCIOS',
      'INCOME',
      fixed.monthlySocioRevenue,
      slotDateStr,
      `Mensalidades Sócios-Torcedores · ${slot.full} (${sociosCount.toLocaleString('pt-BR')} ativos)`
    );
    const activeTvName = tempClub.finances.commercialHub?.tvContract?.networkName;
    appendTurnLedger(
      'TV_BROADCAST',
      'INCOME',
      fixed.monthlyBroadcastBase,
      slotDateStr,
      activeTvName
        ? `Cota Mensal TV & Streaming (${activeTvName}) · ${slot.full}`
        : `Cota Mensal de Transmissão & TV · ${slot.full}`
    );
    if (fixed.monthlyMerchandisingRevenue > 0) {
      appendTurnLedger(
        'MERCHANDISING',
        'INCOME',
        fixed.monthlyMerchandisingRevenue,
        slotDateStr,
        `Loja Oficial & Venda de Camisas · ${slot.full}`
      );
    }
    if (fixed.monthlyNamingRightsRevenue > 0) {
      const nrBrand = tempClub.finances.commercialHub?.namingRights?.brandName || 'Parceiro';
      appendTurnLedger(
        'COMMERCIAL_EVENTS',
        'INCOME',
        fixed.monthlyNamingRightsRevenue,
        slotDateStr,
        `Parcela Mensal Naming Rights (${nrBrand}) · ${slot.full}`
      );
    }
    if (fixed.monthlyCommercialAssetsRevenue > 0) {
      appendTurnLedger(
        'COMMERCIAL_EVENTS',
        'INCOME',
        fixed.monthlyCommercialAssetsRevenue,
        slotDateStr,
        `Camarotes VIP, Tour/Museu & Praça Comercial · ${slot.full}`
      );
    }
    appendTurnLedger(
      'WAGES_SQUAD',
      'EXPENSE',
      fixed.monthlySquadWages,
      slotDateStr,
      `Folha Salarial do Elenco · ${slot.full}`
    );
    appendTurnLedger(
      'STAFF_SCOUTS',
      'EXPENSE',
      fixed.monthlyCoachesAndManager + fixed.monthlyScouts,
      slotDateStr,
      `Comissão Técnica, Olheiros & Técnico · ${slot.full}`
    );
    appendTurnLedger(
      'FACILITIES_UPKEEP',
      'EXPENSE',
      fixed.monthlyFacilityUpkeep,
      slotDateStr,
      `Manutenção do Estádio, CT, DM & Base · ${slot.full}`
    );
    if (fixed.monthlySafShareExpense > 0) {
      appendTurnLedger(
        'FINANCE_FEES',
        'EXPENSE',
        fixed.monthlySafShareExpense,
        slotDateStr,
        `Repasse Parceria Comercial SAF (6%) · ${slot.full}`
      );
    }

    if (fixed.monthlyOverdraftInterest > 0) {
      appendTurnLedger(
        'FINANCE_FEES',
        'EXPENSE',
        fixed.monthlyOverdraftInterest,
        slotDateStr,
        `Juros Bancários do Cheque Especial (3,5%/mês) · ${slot.full}`
      );
    }

    if (loanWorking && loanWorking.monthsRemaining > 0) {
      const installment = fixed.monthlyBankLoanInstallment;
      const monthlyInterestPortion = Math.round(
        loanWorking.principalRemaining * loanWorking.interestRateMonthly
      );
      const principalPaid = Math.max(0, installment - monthlyInterestPortion);
      const nextPrincipal = Math.max(0, loanWorking.principalRemaining - principalPaid);
      const nextMonths = loanWorking.monthsRemaining - 1;

      appendTurnLedger(
        'FINANCE_FEES',
        'EXPENSE',
        installment,
        slotDateStr,
        `Parcela Empréstimo Bancário (${nextMonths} rest.) · ${slot.full}`
      );

      loanWorking =
        nextMonths > 0 && nextPrincipal > 0
          ? {
              ...loanWorking,
              principalRemaining: nextPrincipal,
              monthsRemaining: nextMonths,
            }
          : null;
    }

    // Dynamic monthly organic Socio-Torcedor growth/churn
    const socioTrend = calculateSocioMonthlyBreakdown(tempClub, fanConf);
    lastSocioDelta = socioTrend.projectedMonthlyGrowth;
    sociosCount = Math.max(500, sociosCount + lastSocioDelta);

    history[sIdx] = {
      month: slot.month,
      monthLabel: slot.short,
      fullMonthName: slot.full,
      seasonYear: slot.year,
      openingBalance: openingBal,
      closingBalance: balance,
      income: monthInc,
      expenses: monthExp,
      netFlow: monthInc - monthExp,
      recorded: true,
    };

    // Atualiza projeção base de abertura dos meses seguintes
    for (let f = sIdx + 1; f < 12; f++) {
      if (!history[f].recorded) {
        history[f] = {
          ...history[f],
          openingBalance: balance,
          closingBalance: balance,
        };
      }
    }

    if (balance < 0 && (openingBal >= 0 || sIdx === 5 || sIdx === 8 || sIdx === 9)) {
      newInboxMessages.unshift({
        id: `msg_red_alert_${activeFiscalYear}_s${sIdx}_${Date.now()}`,
        title: `Alerta Vermelho no Caixa (${slot.full}): Saldo de ${formatBrlFull(balance)}`,
        message: `Após o fechamento da folha salarial de ${slot.full} (${formatBrlFull(
          monthExp
        )}), o caixa do ${userClub.name} está negativo em ${formatBrlFull(
          balance
        )}${
          fixed.monthlyOverdraftInterest > 0
            ? `, incluindo ${formatBrlFull(fixed.monthlyOverdraftInterest)} de juros bancários`
            : ''
        }. ATENÇÃO: Se o clube encerrar a temporada no vermelho em ${closingMonthName}, o ${regulatorLabel} aplicará perda de pontos, Transfer Ban e o Conselho determinará sua DEMISSÃO IMEDIATA!`,
        date: formatShortDate(state.currentDate),
        round: state.currentRound,
        read: false,
        type: 'FINANCE',
      });
    } else if (sIdx === 7 && totalExp > totalInc && balance > 0 && balance < fixed.monthlySquadWages * 2) {
      newInboxMessages.unshift({
        id: `msg_deficit_warning_${activeFiscalYear}_s${sIdx}`,
        title: `Conselho Fiscal Alerta: Gastos Acima da Arrecadação na Temporada`,
        message: `Relatório de ${slot.full} aponta que o ${userClub.name} já gastou ${formatBrlFull(
          totalExp
        )} contra ${formatBrlFull(
          totalInc
        )} arrecadados na temporada. A reserva atual (${formatBrlFull(
          balance
        )}) cobre menos de duas folhas salariais — evite encerrar ${closingMonthName} no vermelho!`,
        date: formatShortDate(state.currentDate),
        round: state.currentRound,
        read: false,
        type: 'BOARD',
      });
    } else if (
      fixed.monthlySquadWages > Math.max(1, monthInc) * 0.68 &&
      balance < fixed.monthlySquadWages * 4 &&
      !state.inbox.some((m) => m.id === `msg_ffp_wage_cap_warning_${activeFiscalYear}`) &&
      !newInboxMessages.some((m) => m.id === `msg_ffp_wage_cap_warning_${activeFiscalYear}`)
    ) {
      const payrollRatio = Math.round((fixed.monthlySquadWages / Math.max(1, monthInc)) * 100);
      newInboxMessages.unshift({
        id: `msg_ffp_wage_cap_warning_${activeFiscalYear}`,
        title: `Alerta de Teto Salarial (${regulatorLabel}): Folha em ${payrollRatio}% da Receita`,
        message: `Relatório preventivo de ${slot.full}: a folha salarial do ${userClub.name} (${formatBrlFull(
          fixed.monthlySquadWages
        )}/mês) já compromete ${payrollRatio}% da receita fixa mensal. Sem redução salarial ou vendas na janela, o clube corre risco de encerrar ${closingMonthName} em desacordo com o Fair Play Financeiro.`,
        date: formatShortDate(state.currentDate),
        round: state.currentRound,
        read: false,
        type: 'FINANCE',
      });
    }
  }

  const nextMonthKey = slots[curSlotIdx].monthKey;

  const updatedUserClub: Club = {
    ...userClub,
    finances: {
      ...userClub.finances,
      balance,
      seasonTicketHolders: sociosCount,
      lastSocioGrowthDelta: lastSocioDelta,
      totalIncomeSeason: totalInc,
      totalExpensesSeason: totalExp,
      monthlyHistory: history,
      lastPayrollMonthKey: nextMonthKey,
      lastRecordedIncomeTotal: totalInc,
      lastRecordedExpensesTotal: totalExp,
      seasonBreakdown: breakdownWorking,
      ledger: ledgerWorking,
      bankLoan: loanWorking,
    },
  };

  // Se estiver no vermelho, reduz levemente a confiança da diretoria (-3 por mês no negativo)
  const updatedCareer: ManagerCareerState | undefined =
    state.managerCareer && balance < 0
      ? {
          ...state.managerCareer,
          boardConfidence: Math.max(8, state.managerCareer.boardConfidence - 3),
          lastEvaluationNote: `Conselho Fiscal preocupado com o saldo negativo de ${formatBrlFull(
            balance
          )} no caixa do clube.`,
        }
      : state.managerCareer;

  return {
    ...state,
    clubs: state.clubs.map((c) => (c.id === updatedUserClub.id ? updatedUserClub : c)),
    managerCareer: updatedCareer,
    inbox: newInboxMessages.length > 0 ? [...newInboxMessages, ...state.inbox] : state.inbox,
  };
}

function buildEmergencyOffersAfterFinancialDismissal(
  state: GameSave,
  sackedClub: Club,
  updatedManagerRep: number
): ManagerJobOffer[] {
  const candidates = state.clubs.filter(
    (c) => c.id !== sackedClub.id && c.division !== 'SA'
  );
  if (candidates.length === 0) return [];

  const sackedPower = sackedClub.reputation * 7.5 + getClubSquadAvgOverall(sackedClub);

  const scored = candidates.map((club) => {
    const avg = getClubSquadAvgOverall(club);
    const power = club.reputation * 7.5 + avg;
    // Clubes um degrau abaixo oferecem oportunidade de reconstrução após demissão fiscal
    const diff = Math.abs(sackedPower - 9 - power);
    return {
      club,
      avg,
      score: 100 - diff + Math.random() * 6,
    };
  });

  scored.sort((a, b) => b.score - a.score);

  const reasons = [
    'Diretoria oferece contrato com teto salarial rigoroso para você reconstruir sua carreira.',
    'Oportunidade imediata para assumir novo projeto esportivo na abertura da nova temporada.',
    'Convite para comandar equipe enxuta e recuperar seu prestígio após a saída turbulenta.',
  ];

  return scored.slice(0, 3).map(({ club, avg }, idx) => ({
    id: `fin_sacked_offer_${state.currentSeasonYear}_${club.id}_${idx}`,
    clubId: club.id,
    clubName: club.name,
    clubShortName: club.shortName,
    clubDivision: club.division,
    clubReputation: club.reputation,
    clubSquadAvgOvr: avg,
    clubColors: club.colors,
    transferBudgetPreview: Math.max(0, club.finances.balance),
    offeredMonthlySalary: Math.round(computeManagerSalary(club, updatedManagerRep) * 0.9),
    contractYears: 1,
    reason: reasons[idx % reasons.length],
    createdDate: `31/12/${state.currentSeasonYear}`,
    expiresRound: 6,
    status: 'PENDING',
  }));
}

/**
 * Auditoria Oficial de Encerramento de Temporada (Fair Play Financeiro & Conselho Fiscal):
 * Se o clube gastou mais do que arrecadou E terminou a temporada no vermelho (ou encerrou insolvente < 0),
 * aplica punições oficiais ao clube (Perda de Pontos no Brasileirão, Transfer Ban, Multa STJD e Penhora de Atleta)
 * e decreta a DEMISSÃO IMEDIATA do técnico com propostas de recomeço.
 */
export function evaluateAndApplySeasonEndFinancialFairPlay(state: GameSave): {
  updatedState: GameSave;
  auditReport: SeasonFinancialAuditReport;
} {
  const preUserClub = state.clubs.find((c) => c.id === state.userClubId) || state.clubs[0];
  const isEu = isSplitCalendarClub(preUserClub);
  const activeFiscalYear = isEu
    ? state.europeSeasonYear ?? state.currentSeasonYear
    : state.currentSeasonYear;

  // Garante fechamento até o fim da temporada (Maio do ano seguinte na Europa, Dezembro na América do Sul)
  const auditCloseDate = isEu ? `${activeFiscalYear + 1}-05-31` : `${activeFiscalYear}-12-15`;
  const auditDisplayDate = isEu ? `31/05/${activeFiscalYear + 1}` : `31/12/${activeFiscalYear}`;
  const stateAtClose = processMonthlyFinancialTurn(state.currentDate, {
    ...state,
    currentDate: auditCloseDate,
  });

  const userClub =
    stateAtClose.clubs.find((c) => c.id === stateAtClose.userClubId) || stateAtClose.clubs[0];
  const totalInc = userClub.finances.totalIncomeSeason;
  const totalExp = userClub.finances.totalExpensesSeason;
  const endingBalance = userClub.finances.balance;
  const startingBalance =
    userClub.finances.seasonStartBalance ?? endingBalance - totalInc + totalExp;
  const operationalResult = totalInc - totalExp;

  const spentMoreThanEarned = totalExp > totalInc;
  const endedInRed = endingBalance < 0;

  if (endedInRed) {
    const nextSeasonYear = activeFiscalYear + 1;
    const absDebt = Math.abs(endingBalance);
    const isSevereCollapse =
      (spentMoreThanEarned && absDebt >= 15_000_000) || absDebt >= 25_000_000;

    const pointsDeducted = isSevereCollapse ? 6 : 3;
    const fineRate = isSevereCollapse ? 0.08 : 0.05;
    const fineAmount = Math.max(250_000, Math.round((absDebt * fineRate) / 50_000) * 50_000);
    const transferBanUntilDate = isEu
      ? `${nextSeasonYear + 1}-01-01`
      : `${nextSeasonYear}-07-01`;
    const transferBanDisplay = isEu ? `01/01/${nextSeasonYear + 1}` : `01/07/${nextSeasonYear}`;
    const repPenaltyStars = isSevereCollapse && userClub.reputation > 1 ? 1 : 0;
    const managerRepLost = isSevereCollapse ? 12 : 8;
    const nextEditionLabel = isEu ? formatEuropeanSeason(nextSeasonYear) : String(nextSeasonYear);
    const curEditionLabel = isEu ? formatEuropeanSeason(activeFiscalYear) : String(activeFiscalYear);

    let forcedPlayerName: string | undefined;
    let forcedPlayerId: string | undefined;
    let forcedSaleAmount = 0;
    let updatedSquad = [...userClub.squad];
    let updatedTransferMarket = [...stateAtClose.transferMarket];

    if (updatedSquad.length > 18) {
      const sortedByValue = [...updatedSquad]
        .filter((p) => !p.isLoan)
        .sort((a, b) => b.marketValue - a.marketValue);
      const seizedPlayer = sortedByValue[0];
      if (seizedPlayer) {
        forcedPlayerId = seizedPlayer.id;
        forcedPlayerName = seizedPlayer.name;
        forcedSaleAmount = Math.round((seizedPlayer.marketValue * 0.75) / 50_000) * 50_000;
        updatedSquad = updatedSquad.filter((p) => p.id !== seizedPlayer.id);
        updatedTransferMarket = [
          {
            ...seizedPlayer,
            isStarter: false,
            isSubstitute: false,
            pitchSlot: undefined,
          },
          ...updatedTransferMarket,
        ];
      }
    }

    const punishment: ClubFinancialPunishment = {
      seasonYearApplied: nextSeasonYear,
      transferBanUntilDate,
      pointsDeducted,
      fineAmount,
      forcedPlayerSaleId: forcedPlayerId,
      forcedPlayerSaleName: forcedPlayerName,
      forcedSaleAmount,
      reputationPenaltyStars: repPenaltyStars,
      managerReputationLost: managerRepLost,
      severity: isSevereCollapse ? 'COLAPSO_FINANCEIRO' : 'GRAVE',
      summary: `Perda de -${pointsDeducted} pontos na liga ${nextEditionLabel}, Transfer Ban até ${transferBanDisplay}, multa de ${formatBrlFull(
        fineAmount
      )}${
        forcedPlayerName
          ? ` e leilão forçado de ${forcedPlayerName} (${formatBrlFull(forcedSaleAmount)})`
          : ''
      }.`,
    };

    const balanceAfterFineAndSeizure = endingBalance - fineAmount + forcedSaleAmount;
    const targetHistIdx = isEu ? 9 : 11; // Maio (slot 9) na Europa, Dezembro (slot 11) na América do Sul

    const updatedClubs = stateAtClose.clubs.map((c) => {
      if (c.id !== userClub.id) return c;
      const updatedHist = [...(c.finances.monthlyHistory || [])];
      if (updatedHist[targetHistIdx]) {
        updatedHist[targetHistIdx] = {
          ...updatedHist[targetHistIdx],
          expenses: updatedHist[targetHistIdx].expenses + fineAmount,
          income: updatedHist[targetHistIdx].income + forcedSaleAmount,
          closingBalance: balanceAfterFineAndSeizure,
          netFlow: balanceAfterFineAndSeizure - updatedHist[targetHistIdx].openingBalance,
          recorded: true,
        };
      }
      return {
        ...c,
        reputation: Math.max(1, c.reputation - repPenaltyStars),
        squad: updatedSquad,
        finances: {
          ...c.finances,
          balance: balanceAfterFineAndSeizure,
          totalExpensesSeason: c.finances.totalExpensesSeason + fineAmount,
          totalIncomeSeason: c.finances.totalIncomeSeason + forcedSaleAmount,
          lastRecordedExpensesTotal: c.finances.totalExpensesSeason + fineAmount,
          lastRecordedIncomeTotal: c.finances.totalIncomeSeason + forcedSaleAmount,
          monthlyHistory: updatedHist,
          activePunishment: punishment,
        },
      };
    });

    const baseCareer = stateAtClose.managerCareer;
    const nextManagerRep = Math.max(15, (baseCareer?.managerReputation || 55) - managerRepLost);

    const rescueOffers = buildEmergencyOffersAfterFinancialDismissal(
      { ...stateAtClose, clubs: updatedClubs },
      userClub,
      nextManagerRep
    );

    const dismissalInbox: InboxMessage = {
      id: `msg_fin_dismissal_${activeFiscalYear}_${Date.now()}`,
      title: `Fair Play Financeiro: Punições ao ${userClub.shortName} e Demissão Oficial`,
      message: `O ${userClub.name} encerrou a temporada ${curEditionLabel} no vermelho (${formatBrlFull(
        endingBalance
      )}), tendo gasto ${formatBrlFull(totalExp)} contra ${formatBrlFull(
        totalInc
      )} arrecadados. Foram aplicados -${pointsDeducted} pontos na liga ${nextEditionLabel}, Transfer Ban até ${transferBanDisplay} e multa de ${formatBrlFull(
        fineAmount
      )}. O Conselho decretou sua DEMISSÃO IMEDIATA por responsabilidade fiscal (-${managerRepLost} pts de reputação).`,
      date: auditDisplayDate,
      round: stateAtClose.totalRounds,
      read: false,
      type: 'FINANCE',
    };

    const updatedCareer: ManagerCareerState | undefined = baseCareer
      ? {
          ...baseCareer,
          boardConfidence: 5,
          fanConfidence: Math.max(10, baseCareer.fanConfidence - 25),
          managerReputation: nextManagerRep,
          jobOffers: [
            ...rescueOffers,
            ...baseCareer.jobOffers.filter((o) => o.status !== 'PENDING'),
          ].slice(0, 12),
          lastEvaluationNote: `Demitido pelo Conselho Fiscal após encerrar ${curEditionLabel} no vermelho (${formatBrlFull(
            endingBalance
          )}).`,
        }
      : undefined;

    return {
      updatedState: {
        ...stateAtClose,
        clubs: updatedClubs,
        transferMarket: updatedTransferMarket,
        managerCareer: updatedCareer,
        inbox: [dismissalInbox, ...stateAtClose.inbox],
      },
      auditReport: {
        seasonYear: activeFiscalYear,
        clubId: userClub.id,
        clubName: userClub.name,
        clubShortName: userClub.shortName,
        startingBalance,
        endingBalance,
        totalIncomeSeason: totalInc,
        totalExpensesSeason: totalExp,
        operationalResult,
        spentMoreThanEarned,
        endedInRed: true,
        wasSackedForFinances: true,
        punishment,
      },
    };
  }

  if (spentMoreThanEarned) {
    const curEditionLabel = isEu ? formatEuropeanSeason(activeFiscalYear) : String(activeFiscalYear);
    const warningMsg = `O clube gastou ${formatBrlFull(
      totalExp
    )} e arrecadou ${formatBrlFull(
      totalInc
    )} (déficit operacional de ${formatBrlFull(
      operationalResult
    )}), evitando punições apenas porque ainda restaram ${formatBrlFull(
      endingBalance
    )} em caixa. O Conselho Fiscal reduziu sua confiança em -12% e exige equilíbrio imediato!`;

    const warnInbox: InboxMessage = {
      id: `msg_fin_audit_warn_${activeFiscalYear}_${Date.now()}`,
      title: `Advertência do Conselho Fiscal: Déficit Operacional em ${curEditionLabel}`,
      message: warningMsg,
      date: auditDisplayDate,
      round: stateAtClose.totalRounds,
      read: false,
      type: 'FINANCE',
    };

    return {
      updatedState: {
        ...stateAtClose,
        managerCareer: stateAtClose.managerCareer
          ? {
              ...stateAtClose.managerCareer,
              boardConfidence: Math.max(25, stateAtClose.managerCareer.boardConfidence - 12),
              lastEvaluationNote:
                'Advertido pelo Conselho Fiscal por gastar mais do que arrecadou na temporada.',
            }
          : stateAtClose.managerCareer,
        inbox: [warnInbox, ...stateAtClose.inbox],
      },
      auditReport: {
        seasonYear: activeFiscalYear,
        clubId: userClub.id,
        clubName: userClub.name,
        clubShortName: userClub.shortName,
        startingBalance,
        endingBalance,
        totalIncomeSeason: totalInc,
        totalExpensesSeason: totalExp,
        operationalResult,
        spentMoreThanEarned: true,
        endedInRed: false,
        wasSackedForFinances: false,
        punishment: null,
        warningOnlyMessage: warningMsg,
      },
    };
  }

  return {
    updatedState: stateAtClose,
    auditReport: {
      seasonYear: activeFiscalYear,
      clubId: userClub.id,
      clubName: userClub.name,
      clubShortName: userClub.shortName,
      startingBalance,
      endingBalance,
      totalIncomeSeason: totalInc,
      totalExpensesSeason: totalExp,
      operationalResult,
      spentMoreThanEarned: false,
      endedInRed: false,
      wasSackedForFinances: false,
      punishment: null,
    },
  };
}

/**
 * Reinicia os acumuladores anuais e o gráfico mensal (Jan–Dez na América do Sul ou Ago–Jul na Europa)
 * na abertura de uma nova temporada, podendo filtrar apenas um continente (`targetContinent`).
 */
export function resetClubsFinancesForNewSeason(
  clubs: Club[],
  nextSeasonYear: number,
  _nextSeasonStartDate: string,
  targetContinent?: 'EU' | 'SA_BR'
): Club[] {
  return clubs.map((club) => {
    const isEu = isSplitCalendarClub(club);
    if (targetContinent === 'EU' && !isEu) return club;
    if (targetContinent === 'SA_BR' && isEu) return club;

    const slots = getClubFiscalCalendar(isEu, nextSeasonYear);
    const startBal = club.finances.balance;
    const freshHistory: MonthlyFinanceEntry[] = slots.map((slot, idx) => ({
      month: slot.month,
      monthLabel: slot.short,
      fullMonthName: slot.full,
      seasonYear: slot.year,
      openingBalance: startBal,
      closingBalance: startBal,
      income: 0,
      expenses: 0,
      netFlow: 0,
      recorded: idx === 0, // Mês inaugural (Ago na Europa, Jan na América do Sul) inicia aberto
    }));

    const existingPunishment = club.finances.activePunishment;
    const validPunishment =
      existingPunishment && existingPunishment.seasonYearApplied === nextSeasonYear
        ? existingPunishment
        : null;

    const priorRecorded = [
      ...(club.finances.previousMonthlyHistory || []).filter((e) => e.recorded),
      ...(club.finances.monthlyHistory || []).filter((e) => e.recorded),
    ].slice(-12);

    const { nextStadiumName, nextCommercialHub } =
      rolloverClubCommercialHubForNewSeason(club);

    return {
      ...club,
      stadium: {
        ...club.stadium,
        name: nextStadiumName,
      },
      finances: {
        ...club.finances,
        totalIncomeSeason: 0,
        totalExpensesSeason: 0,
        seasonStartBalance: startBal,
        monthlyHistory: freshHistory,
        previousMonthlyHistory: priorRecorded,
        lastPayrollMonthKey: slots[0].monthKey,
        lastRecordedIncomeTotal: 0,
        lastRecordedExpensesTotal: 0,
        activePunishment: validPunishment,
        seasonBreakdown: {},
        ledger: [],
        commercialHub: nextCommercialHub,
        lastSeasonPrizeReport: club.finances.lastSeasonPrizeReport ?? null,
      },
    };
  });
}

export interface LastSixMonthsBalancePoint {
  key: string;
  month: number;
  year: number;
  axisLabel: string;
  fullMonthLabel: string;
  openingBalance: number;
  saldo: number;
  income: number;
  expenses: number;
  netFlow: number;
  isCurrentMonth: boolean;
  isBaseline: boolean;
}

export interface LastSixMonthsBalanceSummary {
  points: LastSixMonthsBalancePoint[];
  periodLabel: string;
  firstBalance: number;
  currentBalance: number;
  sixMonthDelta: number;
  sixMonthDeltaPct: number | null;
  peakBalance: number;
  peakLabel: string;
  lowBalance: number;
  lowLabel: string;
  hasNegativeMonth: boolean;
}

/**
 * Monta a série histórica mensal dos últimos 6 meses consecutivos (incluindo o mês atual)
 * combinando o histórico arquivado da temporada anterior e os registros da temporada ativa.
 */
export function buildLastSixMonthsBalanceSeries(
  club: Club,
  currentDate: string,
  seasonYear: number
): LastSixMonthsBalanceSummary {
  const { year: curYear, month: curMonth } = parseDateYearMonth(currentDate, seasonYear);
  const recordedByKey = new Map<string, MonthlyFinanceEntry>();

  const combined = [
    ...(club.finances.previousMonthlyHistory || []),
    ...(club.finances.monthlyHistory || []),
  ];
  for (const entry of combined) {
    if (!entry) continue;
    const key = `${entry.seasonYear}-${String(entry.month).padStart(2, '0')}`;
    if (entry.recorded) {
      recordedByKey.set(key, entry);
    }
  }

  // Earliest known opening balance serves as honest baseline if fewer than 6 months have elapsed since start
  const sortedRecorded = Array.from(recordedByKey.values()).sort((a, b) =>
    a.seasonYear !== b.seasonYear ? a.seasonYear - b.seasonYear : a.month - b.month
  );
  const baselineBalance =
    sortedRecorded[0]?.openingBalance ??
    club.finances.seasonStartBalance ??
    club.finances.balance;

  const points: LastSixMonthsBalancePoint[] = [];
  for (let offset = -5; offset <= 0; offset++) {
    const totalMonths = curYear * 12 + (curMonth - 1) + offset;
    const yr = Math.floor(totalMonths / 12);
    const mo = ((totalMonths % 12) + 12) % 12 + 1;
    const meta = MONTH_CATALOG[mo - 1] || MONTH_CATALOG[0];
    const key = `${yr}-${String(mo).padStart(2, '0')}`;
    const shortYr = String(yr).slice(-2);
    const axisLabel = `${meta.short}/${shortYr}`;
    const fullMonthLabel = `${meta.full} de ${yr}`;
    const isCurrentMonth = offset === 0;
    const entry = recordedByKey.get(key);

    if (entry) {
      const closing = isCurrentMonth ? club.finances.balance : entry.closingBalance;
      points.push({
        key,
        month: mo,
        year: yr,
        axisLabel,
        fullMonthLabel,
        openingBalance: entry.openingBalance,
        saldo: closing,
        income: entry.income,
        expenses: entry.expenses,
        netFlow: closing - entry.openingBalance,
        isCurrentMonth,
        isBaseline: false,
      });
    } else {
      const bal = isCurrentMonth ? club.finances.balance : baselineBalance;
      points.push({
        key,
        month: mo,
        year: yr,
        axisLabel,
        fullMonthLabel,
        openingBalance: bal,
        saldo: bal,
        income: 0,
        expenses: 0,
        netFlow: 0,
        isCurrentMonth,
        isBaseline: !isCurrentMonth,
      });
    }
  }

  const firstBalance = points[0]?.saldo ?? club.finances.balance;
  const currentBalance = points[points.length - 1]?.saldo ?? club.finances.balance;
  const sixMonthDelta = currentBalance - firstBalance;
  const sixMonthDeltaPct =
    Math.abs(firstBalance) >= 1000
      ? Math.round((sixMonthDelta / Math.abs(firstBalance)) * 1000) / 10
      : null;

  let peakPoint = points[0];
  let lowPoint = points[0];
  for (const pt of points) {
    if (pt.saldo > peakPoint.saldo) peakPoint = pt;
    if (pt.saldo < lowPoint.saldo) lowPoint = pt;
  }

  return {
    points,
    periodLabel: `${points[0]?.axisLabel ?? ''} – ${points[points.length - 1]?.axisLabel ?? ''}`,
    firstBalance,
    currentBalance,
    sixMonthDelta,
    sixMonthDeltaPct,
    peakBalance: peakPoint?.saldo ?? currentBalance,
    peakLabel: peakPoint?.axisLabel ?? '',
    lowBalance: lowPoint?.saldo ?? currentBalance,
    lowLabel: lowPoint?.axisLabel ?? '',
    hasNegativeMonth: points.some((p) => p.saldo < 0),
  };
}
