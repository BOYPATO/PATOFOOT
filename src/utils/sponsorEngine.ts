import {
  Club,
  Fixture,
  InboxMessage,
  SponsorContract,
  SponsorOption,
  SponsorSlotType,
  SponsorStrategyProfile,
} from '../types/game';
import { recordFinanceLedgerMutation } from './financialFairPlayEngine';
import { getClubEconomyProfile } from './clubEconomyScale';

export interface SponsorSlotMeta {
  slot: SponsorSlotType;
  order: number;
  title: string;
  shortTitle: string;
  jerseyLocation: string;
  description: string;
}

export const SPONSOR_SLOTS_ORDER: SponsorSlotType[] = [
  'MASTER',
  'KIT_SUPPLIER',
  'SLEEVE',
  'SHORTS_STADIUM',
];

export const SPONSOR_SLOTS_META: Record<SponsorSlotType, SponsorSlotMeta> = {
  MASTER: {
    slot: 'MASTER',
    order: 1,
    title: 'Patrocinador Master',
    shortTitle: '1. Master (Peito)',
    jerseyLocation: 'Peito Frontal da Camisa',
    description: 'Principal cota comercial do clube, com maior aporte fixo por rodada e luvas de assinatura.',
  },
  KIT_SUPPLIER: {
    slot: 'KIT_SUPPLIER',
    order: 2,
    title: 'Fornecedor Esportivo',
    shortTitle: '2. Material Esportivo',
    jerseyLocation: 'Peito Direito & Uniformes',
    description: 'Marca oficial responsável pelos uniformes de jogo, treino e royalties da loja oficial.',
  },
  SLEEVE: {
    slot: 'SLEEVE',
    order: 3,
    title: 'Patrocínio de Mangas',
    shortTitle: '3. Mangas & Omoplatas',
    jerseyLocation: 'Mangas Esquerda e Direita',
    description: 'Cota de destaque em transmissões de TV, combinando renda por rodada e bônus de desempenho.',
  },
  SHORTS_STADIUM: {
    slot: 'SHORTS_STADIUM',
    order: 4,
    title: 'Barra, Calção & Arena',
    shortTitle: '4. Barra & Placas',
    jerseyLocation: 'Barra Traseira, Calção e Placas de Campo',
    description: 'Cota complementar de exposição no uniforme e painéis de LED ao redor do gramado.',
  },
};

interface RawSponsorTemplate {
  id: string;
  slot: SponsorSlotType;
  companyName: string;
  sector: string;
  shortLabel: string;
  accentColor: string;
  profile: SponsorStrategyProfile;
  baseSigning: number;
  basePerRound: number;
  baseWinBonus: number;
  baseGoalBonus: number;
  totalRounds: number;
  terminationRatio: number;
}

// 6 distinct options for each of the 4 sponsorship slots (24 sponsors total)
const RAW_SPONSOR_CATALOG: RawSponsorTemplate[] = [
  // ================= SLOT 1: MASTER =================
  {
    id: 'sp_master_atlantico',
    slot: 'MASTER',
    companyName: 'Banco Atlântico Digital',
    sector: 'Banco & Finanças',
    shortLabel: 'ATLÂNTICO',
    accentColor: '#38BDF8',
    profile: 'Renda Fixa',
    baseSigning: 2400000,
    basePerRound: 460000,
    baseWinBonus: 45000,
    baseGoalBonus: 10000,
    totalRounds: 38,
    terminationRatio: 0.35,
  },
  {
    id: 'sp_master_voebrasil',
    slot: 'MASTER',
    companyName: 'VoeBrasil Linhas Aéreas',
    sector: 'Aviação Comercial',
    shortLabel: 'VOEBRASIL',
    accentColor: '#F59E0B',
    profile: 'Equilibrado',
    baseSigning: 3200000,
    basePerRound: 390000,
    baseWinBonus: 110000,
    baseGoalBonus: 22000,
    totalRounds: 38,
    terminationRatio: 0.35,
  },
  {
    id: 'sp_master_trovao',
    slot: 'MASTER',
    companyName: 'Trovão Motors EV',
    sector: 'Indústria Automotiva',
    shortLabel: 'TROVÃO EV',
    accentColor: '#10B981',
    profile: 'Bônus por Vitória',
    baseSigning: 1900000,
    basePerRound: 310000,
    baseWinBonus: 230000,
    baseGoalBonus: 45000,
    totalRounds: 19,
    terminationRatio: 0.3,
  },
  {
    id: 'sp_master_neopay',
    slot: 'MASTER',
    companyName: 'NeoPay Pagamentos',
    sector: 'Fintech & Meios de Pagamento',
    shortLabel: 'NEOPAY',
    accentColor: '#22D3EE',
    profile: 'Luvas Imediatas',
    baseSigning: 5400000,
    basePerRound: 320000,
    baseWinBonus: 65000,
    baseGoalBonus: 15000,
    totalRounds: 38,
    terminationRatio: 0.45,
  },
  {
    id: 'sp_master_petrosul',
    slot: 'MASTER',
    companyName: 'PetroSul Energia',
    sector: 'Energia & Combustíveis',
    shortLabel: 'PETROSUL',
    accentColor: '#FBBF24',
    profile: 'Renda Fixa',
    baseSigning: 2800000,
    basePerRound: 435000,
    baseWinBonus: 70000,
    baseGoalBonus: 12000,
    totalRounds: 19,
    terminationRatio: 0.3,
  },
  {
    id: 'sp_master_megarede',
    slot: 'MASTER',
    companyName: 'MegaRede Atacadista',
    sector: 'Varejo Nacional',
    shortLabel: 'MEGAREDE',
    accentColor: '#F43F5E',
    profile: 'Equilibrado',
    baseSigning: 3000000,
    basePerRound: 375000,
    baseWinBonus: 135000,
    baseGoalBonus: 25000,
    totalRounds: 19,
    terminationRatio: 0.3,
  },

  // ================= SLOT 2: KIT SUPPLIER (MATERIAL ESPORTIVO) =================
  {
    id: 'sp_kit_vertice',
    slot: 'KIT_SUPPLIER',
    companyName: 'Vértice Athletic',
    sector: 'Material Esportivo Global',
    shortLabel: 'VÉRTICE',
    accentColor: '#38BDF8',
    profile: 'Renda Fixa',
    baseSigning: 1600000,
    basePerRound: 245000,
    baseWinBonus: 30000,
    baseGoalBonus: 8000,
    totalRounds: 38,
    terminationRatio: 0.35,
  },
  {
    id: 'sp_kit_kronos',
    slot: 'KIT_SUPPLIER',
    companyName: 'Kronos ProWear',
    sector: 'Artigos Esportivos Europeus',
    shortLabel: 'KRONOS',
    accentColor: '#10B981',
    profile: 'Bônus por Vitória',
    baseSigning: 1200000,
    basePerRound: 185000,
    baseWinBonus: 130000,
    baseGoalBonus: 25000,
    totalRounds: 38,
    terminationRatio: 0.3,
  },
  {
    id: 'sp_kit_pampa',
    slot: 'KIT_SUPPLIER',
    companyName: 'Pampa Sports Brasil',
    sector: 'Confecção Esportiva Nacional',
    shortLabel: 'PAMPA',
    accentColor: '#F59E0B',
    profile: 'Equilibrado',
    baseSigning: 1800000,
    basePerRound: 215000,
    baseWinBonus: 65000,
    baseGoalBonus: 14000,
    totalRounds: 19,
    terminationRatio: 0.25,
  },
  {
    id: 'sp_kit_solis',
    slot: 'KIT_SUPPLIER',
    companyName: 'Solis Kit Co.',
    sector: 'Moda & Performance',
    shortLabel: 'SOLIS',
    accentColor: '#FB923C',
    profile: 'Luvas Imediatas',
    baseSigning: 3100000,
    basePerRound: 175000,
    baseWinBonus: 40000,
    baseGoalBonus: 10000,
    totalRounds: 38,
    terminationRatio: 0.4,
  },
  {
    id: 'sp_kit_furia',
    slot: 'KIT_SUPPLIER',
    companyName: 'Fúria Esportes',
    sector: 'Equipamentos de Futebol',
    shortLabel: 'FÚRIA',
    accentColor: '#EF4444',
    profile: 'Equilibrado',
    baseSigning: 1350000,
    basePerRound: 205000,
    baseWinBonus: 75000,
    baseGoalBonus: 16000,
    totalRounds: 15,
    terminationRatio: 0.2,
  },
  {
    id: 'sp_kit_aether',
    slot: 'KIT_SUPPLIER',
    companyName: 'Aether Performance',
    sector: 'Alta Tecnologia Esportiva',
    shortLabel: 'AETHER',
    accentColor: '#22D3EE',
    profile: 'Renda Fixa',
    baseSigning: 2000000,
    basePerRound: 235000,
    baseWinBonus: 50000,
    baseGoalBonus: 12000,
    totalRounds: 38,
    terminationRatio: 0.35,
  },

  // ================= SLOT 3: SLEEVE (MANGAS & OMOPLATAS) =================
  {
    id: 'sp_sleeve_fibramax',
    slot: 'SLEEVE',
    companyName: 'FibraMax Telecom',
    sector: 'Telecomunicações & 5G',
    shortLabel: 'FIBRAMAX',
    accentColor: '#38BDF8',
    profile: 'Renda Fixa',
    baseSigning: 950000,
    basePerRound: 155000,
    baseWinBonus: 20000,
    baseGoalBonus: 5000,
    totalRounds: 19,
    terminationRatio: 0.3,
  },
  {
    id: 'sp_sleeve_guarana',
    slot: 'SLEEVE',
    companyName: 'Guaraná Imperial',
    sector: 'Bebidas & Refrigerantes',
    shortLabel: 'IMPERIAL',
    accentColor: '#10B981',
    profile: 'Bônus por Vitória',
    baseSigning: 750000,
    basePerRound: 115000,
    baseWinBonus: 85000,
    baseGoalBonus: 28000,
    totalRounds: 19,
    terminationRatio: 0.25,
  },
  {
    id: 'sp_sleeve_horizonte',
    slot: 'SLEEVE',
    companyName: 'Construtora Horizonte',
    sector: 'Engenharia & Imóveis',
    shortLabel: 'HORIZONTE',
    accentColor: '#F59E0B',
    profile: 'Luvas Imediatas',
    baseSigning: 1950000,
    basePerRound: 110000,
    baseWinBonus: 30000,
    baseGoalBonus: 8000,
    totalRounds: 38,
    terminationRatio: 0.4,
  },
  {
    id: 'sp_sleeve_seguroforte',
    slot: 'SLEEVE',
    companyName: 'SeguroForte Brasil',
    sector: 'Seguros & Previdência',
    shortLabel: 'SEGUROFORTE',
    accentColor: '#60A5FA',
    profile: 'Equilibrado',
    baseSigning: 1100000,
    basePerRound: 138000,
    baseWinBonus: 48000,
    baseGoalBonus: 10000,
    totalRounds: 19,
    terminationRatio: 0.3,
  },
  {
    id: 'sp_sleeve_agrovale',
    slot: 'SLEEVE',
    companyName: 'AgroVale Alimentos',
    sector: 'Agronegócio & Exportação',
    shortLabel: 'AGROVALE',
    accentColor: '#34D399',
    profile: 'Renda Fixa',
    baseSigning: 1050000,
    basePerRound: 148000,
    baseWinBonus: 28000,
    baseGoalBonus: 6000,
    totalRounds: 38,
    terminationRatio: 0.3,
  },
  {
    id: 'sp_sleeve_veloce',
    slot: 'SLEEVE',
    companyName: 'Veloce Logística Express',
    sector: 'Transporte & Entregas',
    shortLabel: 'VELOCE',
    accentColor: '#FB7185',
    profile: 'Bônus por Vitória',
    baseSigning: 850000,
    basePerRound: 122000,
    baseWinBonus: 92000,
    baseGoalBonus: 18000,
    totalRounds: 15,
    terminationRatio: 0.25,
  },

  // ================= SLOT 4: SHORTS & STADIUM (BARRA, CALÇÃO & ARENA) =================
  {
    id: 'sp_shorts_alvorada',
    slot: 'SHORTS_STADIUM',
    companyName: 'Supermercados Alvorada',
    sector: 'Rede de Supermercados',
    shortLabel: 'ALVORADA',
    accentColor: '#F59E0B',
    profile: 'Renda Fixa',
    baseSigning: 650000,
    basePerRound: 105000,
    baseWinBonus: 15000,
    baseGoalBonus: 4000,
    totalRounds: 19,
    terminationRatio: 0.25,
  },
  {
    id: 'sp_shorts_eletrolar',
    slot: 'SHORTS_STADIUM',
    companyName: 'EletroLar Brasil',
    sector: 'Eletrodomésticos & Móveis',
    shortLabel: 'ELETROLAR',
    accentColor: '#38BDF8',
    profile: 'Luvas Imediatas',
    baseSigning: 1350000,
    basePerRound: 78000,
    baseWinBonus: 22000,
    baseGoalBonus: 5000,
    totalRounds: 38,
    terminationRatio: 0.35,
  },
  {
    id: 'sp_shorts_vidamais',
    slot: 'SHORTS_STADIUM',
    companyName: 'Farmácias VidaMais',
    sector: 'Saúde & Bem-Estar',
    shortLabel: 'VIDAMAIS',
    accentColor: '#10B981',
    profile: 'Equilibrado',
    baseSigning: 750000,
    basePerRound: 92000,
    baseWinBonus: 35000,
    baseGoalBonus: 8000,
    totalRounds: 15,
    terminationRatio: 0.2,
  },
  {
    id: 'sp_shorts_cafeouro',
    slot: 'SHORTS_STADIUM',
    companyName: 'Café Ouro Preto',
    sector: 'Indústria Alimentícia',
    shortLabel: 'OURO PRETO',
    accentColor: '#D97706',
    profile: 'Bônus por Vitória',
    baseSigning: 550000,
    basePerRound: 76000,
    baseWinBonus: 68000,
    baseGoalBonus: 16000,
    totalRounds: 19,
    terminationRatio: 0.25,
  },
  {
    id: 'sp_shorts_cruzeirosul',
    slot: 'SHORTS_STADIUM',
    companyName: 'Postos Cruzeiro do Sul',
    sector: 'Rede de Combustíveis',
    shortLabel: 'CRUZEIRO SUL',
    accentColor: '#22D3EE',
    profile: 'Renda Fixa',
    baseSigning: 720000,
    basePerRound: 112000,
    baseWinBonus: 12000,
    baseGoalBonus: 3000,
    totalRounds: 38,
    terminationRatio: 0.3,
  },
  {
    id: 'sp_shorts_technorte',
    slot: 'SHORTS_STADIUM',
    companyName: 'TechNorte Cloud',
    sector: 'Tecnologia & Dados',
    shortLabel: 'TECHNORTE',
    accentColor: '#34D399',
    profile: 'Bônus por Vitória',
    baseSigning: 680000,
    basePerRound: 85000,
    baseWinBonus: 58000,
    baseGoalBonus: 19000,
    totalRounds: 19,
    terminationRatio: 0.25,
  },
];

function roundToNearestThousand(val: number): number {
  if (val >= 100000) {
    return Math.round(val / 10000) * 10000;
  }
  if (val < 20000) {
    return Math.max(500, Math.round(val / 500) * 500);
  }
  return Math.round(val / 1000) * 1000;
}

/**
 * Computes club commercial multiplier based on division, league tier, and reputation (1-5)
 */
export function getClubCommercialMultiplier(club: Club): number {
  const divFactor = getClubEconomyProfile(club).commercialMult;
  const repFactor = 0.68 + (club.reputation || 3) * 0.1; // rep 5 => 1.18, rep 3 => 0.98, rep 1 => 0.78
  return divFactor * repFactor;
}

/**
 * Returns the 6 available sponsor proposals for a specific slot, scaled to the club's tier
 */
export function getAvailableSponsorOptionsForSlot(
  club: Club,
  slot: SponsorSlotType
): SponsorOption[] {
  const mult = getClubCommercialMultiplier(club);

  return RAW_SPONSOR_CATALOG.filter((tpl) => tpl.slot === slot).map((tpl) => {
    const signingBonus = roundToNearestThousand(tpl.baseSigning * mult);
    const perRoundAmount = roundToNearestThousand(tpl.basePerRound * mult);
    const winBonus = roundToNearestThousand(tpl.baseWinBonus * mult);
    const goalBonus = roundToNearestThousand(tpl.baseGoalBonus * mult);
    const totalFixedContract = signingBonus + perRoundAmount * tpl.totalRounds;
    const terminationFee = roundToNearestThousand(totalFixedContract * tpl.terminationRatio * 0.35);

    return {
      id: tpl.id,
      slot: tpl.slot,
      companyName: tpl.companyName,
      sector: tpl.sector,
      shortLabel: tpl.shortLabel,
      accentColor: tpl.accentColor,
      profile: tpl.profile,
      signingBonus,
      perRoundAmount,
      winBonus,
      goalBonus,
      totalRounds: tpl.totalRounds,
      terminationFee,
    };
  });
}

/**
 * Calculates total guaranteed per-round sponsor revenue across all active slots (up to 4)
 */
export function calculateActiveSponsorsPerRound(
  sponsors?: Partial<Record<SponsorSlotType, SponsorContract>>
): number {
  if (!sponsors) return 0;
  return SPONSOR_SLOTS_ORDER.reduce((sum, slot) => {
    const contract = sponsors[slot];
    return sum + (contract ? contract.perRoundAmount : 0);
  }, 0);
}

/**
 * Counts how many of the 4 sponsor slots are currently filled
 */
export function countActiveSponsors(
  sponsors?: Partial<Record<SponsorSlotType, SponsorContract>>
): number {
  if (!sponsors) return 0;
  return SPONSOR_SLOTS_ORDER.filter((slot) => Boolean(sponsors[slot])).length;
}

/**
 * Signs (or replaces) a sponsor in one of the 4 slots, crediting signing bonus and handling early termination if needed
 */
export function signSponsorContract(
  club: Club,
  option: SponsorOption,
  currentRound: number,
  currentDate: string
): {
  success: boolean;
  errorMessage?: string;
  updatedClub: Club;
  inboxMessage?: InboxMessage;
} {
  const currentSponsors = { ...(club.sponsors || {}) };
  const existing = currentSponsors[option.slot];

  let penaltyToPay = 0;
  if (existing && existing.roundsRemaining > 0) {
    if (existing.id === option.id) {
      return {
        success: false,
        errorMessage: 'Este patrocinador já possui contrato vigente nesta cota.',
        updatedClub: club,
      };
    }
    // Proportional termination fee based on remaining rounds
    const remainingRatio = existing.roundsRemaining / Math.max(1, existing.totalRounds);
    penaltyToPay = roundToNearestThousand(existing.terminationFee * (0.4 + 0.6 * remainingRatio));
  }

  // Check if club balance + new signing bonus covers any termination fee
  if (club.finances.balance + option.signingBonus < penaltyToPay) {
    return {
      success: false,
      errorMessage: 'Saldo insuficiente para arcar com a multa rescisória do patrocinador atual.',
      updatedClub: club,
    };
  }

  const newContract: SponsorContract = {
    ...option,
    roundsRemaining: option.totalRounds,
    signedAtRound: currentRound,
  };

  currentSponsors[option.slot] = newContract;
  const newWeeklySponsor = calculateActiveSponsorsPerRound(currentSponsors);

  const slotTitle = SPONSOR_SLOTS_META[option.slot].title;
  let nextFinances = recordFinanceLedgerMutation(
    {
      ...club.finances,
      weeklySponsor: newWeeklySponsor,
    },
    {
      date: currentDate,
      category: 'SPONSORS',
      type: 'INCOME',
      amount: option.signingBonus,
      description: `Luvas de Patrocínio ${slotTitle}: ${option.companyName}`,
      applyToBalance: true,
    }
  );
  if (penaltyToPay > 0 && existing) {
    nextFinances = recordFinanceLedgerMutation(nextFinances, {
      date: currentDate,
      category: 'FINANCE_FEES',
      type: 'EXPENSE',
      amount: penaltyToPay,
      description: `Multa rescisória de patrocínio (${existing.companyName})`,
      applyToBalance: true,
    });
  }

  const updatedClub: Club = {
    ...club,
    sponsors: currentSponsors,
    finances: nextFinances,
  };

  const formatBRL = (v: number) =>
    new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      maximumFractionDigits: 0,
    }).format(v);

  const penaltyNote =
    penaltyToPay > 0 && existing
      ? ` A rescisão com ${existing.companyName} custou ${formatBRL(penaltyToPay)}.`
      : '';

  const inboxMessage: InboxMessage = {
    id: `sponsor_sign_${option.slot}_${Date.now()}`,
    title: `Novo ${slotTitle}: ${option.companyName}`,
    message: `O departamento comercial do ${club.name} fechou acordo de ${slotTitle} com a ${option.companyName} por ${option.totalRounds} rodadas! O clube recebeu ${formatBRL(option.signingBonus)} de luvas à vista e passará a faturar ${formatBRL(option.perRoundAmount)} fixos por rodada, além de ${formatBRL(option.winBonus)} por vitória.${penaltyNote}`,
    date: currentDate,
    round: currentRound,
    read: false,
    type: 'FINANCE',
  };

  return {
    success: true,
    updatedClub,
    inboxMessage,
  };
}

/**
 * Terminates an active sponsor slot without signing a replacement
 */
export function terminateSponsorSlot(
  club: Club,
  slot: SponsorSlotType,
  currentRound: number,
  currentDate: string
): {
  success: boolean;
  errorMessage?: string;
  updatedClub: Club;
  inboxMessage?: InboxMessage;
} {
  const currentSponsors = { ...(club.sponsors || {}) };
  const existing = currentSponsors[slot];
  if (!existing) {
    return { success: false, updatedClub: club };
  }

  const remainingRatio = existing.roundsRemaining / Math.max(1, existing.totalRounds);
  const penaltyToPay = roundToNearestThousand(existing.terminationFee * (0.4 + 0.6 * remainingRatio));

  if (club.finances.balance < penaltyToPay) {
    return {
      success: false,
      errorMessage: 'Saldo em caixa insuficiente para pagar a multa rescisória.',
      updatedClub: club,
    };
  }

  delete currentSponsors[slot];
  const newWeeklySponsor = calculateActiveSponsorsPerRound(currentSponsors);

  const formatBRL = (v: number) =>
    new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      maximumFractionDigits: 0,
    }).format(v);

  const nextFinances = recordFinanceLedgerMutation(
    {
      ...club.finances,
      weeklySponsor: newWeeklySponsor,
    },
    {
      date: currentDate,
      category: 'FINANCE_FEES',
      type: 'EXPENSE',
      amount: penaltyToPay,
      description: `Rescisão de Patrocínio (${existing.companyName} · ${SPONSOR_SLOTS_META[slot].title})`,
      applyToBalance: true,
    }
  );

  const updatedClub: Club = {
    ...club,
    sponsors: currentSponsors,
    finances: nextFinances,
  };

  const inboxMessage: InboxMessage = {
    id: `sponsor_term_${slot}_${Date.now()}`,
    title: `Rescisão de Patrocínio: ${existing.companyName}`,
    message: `O contrato com ${existing.companyName} (${SPONSOR_SLOTS_META[slot].title}) foi rescindido mediante pagamento de multa de ${formatBRL(penaltyToPay)}. O espaço está livre para novas propostas comerciais.`,
    date: currentDate,
    round: currentRound,
    read: false,
    type: 'FINANCE',
  };

  return {
    success: true,
    updatedClub,
    inboxMessage,
  };
}

/**
 * Previews total sponsor payout for a completed match (used in MatchSimulatorModal post-match bar)
 */
export function previewMatchSponsorPayout(
  club: Club,
  userWon: boolean,
  userGoals: number
): {
  totalPayout: number;
  fixedTotal: number;
  bonusTotal: number;
  activeCount: number;
} {
  const sponsors = club.sponsors;
  const activeCount = countActiveSponsors(sponsors);

  if (!sponsors || activeCount === 0) {
    // Fallback to legacy weeklySponsor if no structured sponsors signed yet
    const fallbackFixed = club.finances.weeklySponsor || 0;
    return {
      totalPayout: fallbackFixed,
      fixedTotal: fallbackFixed,
      bonusTotal: 0,
      activeCount: 0,
    };
  }

  let fixedTotal = 0;
  let bonusTotal = 0;

  SPONSOR_SLOTS_ORDER.forEach((slot) => {
    const c = sponsors[slot];
    if (c) {
      fixedTotal += c.perRoundAmount;
      if (userWon) bonusTotal += c.winBonus;
      if (userGoals > 0) bonusTotal += c.goalBonus * userGoals;
    }
  });

  return {
    totalPayout: fixedTotal + bonusTotal,
    fixedTotal,
    bonusTotal,
    activeCount,
  };
}

/**
 * Processes round-end sponsorship revenue & contract countdown for the user club (and weeklySponsor for CPU clubs)
 */
export function processRoundSponsors(
  allClubs: Club[],
  userClubId: string,
  userFixture: Fixture,
  currentRound: number,
  currentDate: string
): {
  updatedClubs: Club[];
  sponsorInboxMessages: InboxMessage[];
} {
  const sponsorInboxMessages: InboxMessage[] = [];
  const isUserHome = userFixture.homeTeamId === userClubId;
  const userGoals = isUserHome ? userFixture.homeScore || 0 : userFixture.awayScore || 0;
  const oppGoals = isUserHome ? userFixture.awayScore || 0 : userFixture.homeScore || 0;

  let userWon = userGoals > oppGoals;
  if (userFixture.penaltiesHome !== undefined && userFixture.penaltiesAway !== undefined) {
    userWon = isUserHome
      ? userFixture.penaltiesHome > userFixture.penaltiesAway
      : userFixture.penaltiesAway > userFixture.penaltiesHome;
  }

  const formatBRL = (v: number) =>
    new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      maximumFractionDigits: 0,
    }).format(v);

  const updatedClubs = allClubs.map((club) => {
    if (club.id !== userClubId) {
      // CPU clubs collect their standard weeklySponsor net of wages
      return club;
    }

    const tvWinBonus =
      userWon && (club.finances.commercialHub?.tvContract?.winBonusPerMatch || 0) > 0
        ? club.finances.commercialHub!.tvContract!.winBonusPerMatch
        : 0;
    const tvNetworkLabel =
      club.finances.commercialHub?.tvContract?.networkName || 'TV & Streaming';

    const applyTvWinBonus = (fin: Club['finances']): Club['finances'] =>
      tvWinBonus > 0
        ? recordFinanceLedgerMutation(fin, {
            date: currentDate,
            category: 'TV_BROADCAST',
            type: 'INCOME',
            amount: tvWinBonus,
            description: `Bônus de Audiência por Vitória (${tvNetworkLabel} · Rodada ${currentRound})`,
            applyToBalance: true,
          })
        : fin;

    const activeCount = countActiveSponsors(club.sponsors);
    if (!club.sponsors || activeCount === 0) {
      // If user hasn't signed custom sponsors yet, credit any base weeklySponsor if > 0
      const baseAmount = club.finances.weeklySponsor || 0;
      let nextFin = club.finances;
      if (baseAmount > 0) {
        nextFin = recordFinanceLedgerMutation(nextFin, {
          date: currentDate,
          category: 'SPONSORS',
          type: 'INCOME',
          amount: baseAmount,
          description: `Cota comercial padrão (Rodada ${currentRound})`,
          applyToBalance: true,
        });
      }
      nextFin = applyTvWinBonus(nextFin);
      if (nextFin === club.finances) return club;
      return {
        ...club,
        finances: nextFin,
      };
    }

    const nextSponsors: Partial<Record<SponsorSlotType, SponsorContract>> = {};
    let roundPayout = 0;

    SPONSOR_SLOTS_ORDER.forEach((slot) => {
      const contract = club.sponsors?.[slot];
      if (!contract) return;

      roundPayout += contract.perRoundAmount;
      if (userWon) roundPayout += contract.winBonus;
      if (userGoals > 0) roundPayout += contract.goalBonus * userGoals;

      const nextRemaining = contract.roundsRemaining - 1;
      if (nextRemaining > 0) {
        nextSponsors[slot] = {
          ...contract,
          roundsRemaining: nextRemaining,
        };
      } else {
        sponsorInboxMessages.push({
          id: `sponsor_exp_${slot}_${Date.now()}`,
          title: `Fim de Contrato: ${contract.companyName} (${SPONSOR_SLOTS_META[slot].title})`,
          message: `O vínculo de patrocínio com ${contract.companyName} chegou ao fim após ${contract.totalRounds} rodadas. Acesse a área de Patrocinadores para escolher uma nova marca para a cota de ${SPONSOR_SLOTS_META[slot].title} e embolsar novas luvas!`,
          date: currentDate,
          round: currentRound,
          read: false,
          type: 'FINANCE',
        });
      }
    });

    const newWeeklySponsor = calculateActiveSponsorsPerRound(nextSponsors);

    // Optional milestone notification if bonus was big
    if (roundPayout > 0 && sponsorInboxMessages.length === 0 && currentRound % 5 === 0) {
      sponsorInboxMessages.push({
        id: `sponsor_rep_${currentRound}_${Date.now()}`,
        title: `Repasse de Patrocinadores: +${formatBRL(roundPayout)}`,
        message: `Seus ${activeCount} patrocinadores oficiais creditaram ${formatBRL(roundPayout)} referente à Rodada ${currentRound} (cotas fixas + bônus de desempenho em campo).`,
        date: currentDate,
        round: currentRound,
        read: false,
        type: 'FINANCE',
      });
    }

    const afterSponsorsFin = recordFinanceLedgerMutation(
      {
        ...club.finances,
        weeklySponsor: newWeeklySponsor,
      },
      {
        date: currentDate,
        category: 'SPONSORS',
        type: 'INCOME',
        amount: roundPayout,
        description: `Patrocínios Rodada ${currentRound} (${activeCount} cotas${userWon ? ' + bônus vitória' : ''})`,
        applyToBalance: true,
      }
    );

    return {
      ...club,
      sponsors: nextSponsors,
      finances: applyTvWinBonus(afterSponsorsFin),
    };
  });

  return {
    updatedClubs,
    sponsorInboxMessages,
  };
}
