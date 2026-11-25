import React, { useEffect, useMemo, useState } from 'react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { ActiveTransferClause, Club, FinanceCategory, MonthlyFinanceEntry } from '../types/game';
import { soundEngine } from '../services/soundEngine';
import { CommercialRevenueHub } from './CommercialRevenueHub';
import { ScrollableTabStrip } from './ScrollableTabStrip';
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Ban,
  Building2,
  Coins,
  CreditCard,
  DollarSign,
  FileText,
  Handshake,
  Info,
  Landmark,
  LineChart as LineChartIcon,
  Megaphone,
  Receipt,
  Scale,
  Search,
  ShieldAlert,
  ShieldCheck,
  ShieldPlus,
  Sparkles,
  Ticket,
  TrendingDown,
  TrendingUp,
  Trophy,
  UserCheck,
  Users,
  Wallet,
} from 'lucide-react';
import { formatMoney } from '../utils/prizeEngine';
import {
  countActiveSponsors,
  SPONSOR_SLOTS_META,
  SPONSOR_SLOTS_ORDER,
} from '../utils/sponsorEngine';
import {
  buildLastSixMonthsBalanceSeries,
  calculateClubMonthlyFixedFlow,
  calculateMatchDayEconomics,
  calculateSocioMonthlyBreakdown,
  contractClubBankLoan,
  EXPENSE_CATEGORIES_ORDER,
  FINANCE_CATEGORY_META,
  formatBrlCompact,
  formatBrlFull,
  getBankLoanLimitForClub,
  getClubOverdraftLimit,
  getDefaultSocioPlan,
  getDefaultTicketPrices,
  INCOME_CATEGORIES_ORDER,
  isClubUnderTransferBan,
  LastSixMonthsBalancePoint,
  launchSocioCampaign,
  parseDateYearMonth,
  recordFinanceLedgerMutation,
  repayClubBankLoan,
  syncUserClubLiveMonthlySnapshot,
} from '../utils/financialFairPlayEngine';
import { isSplitCalendarClub } from '../utils/worldLeaguesEngine';
import {
  getClubFacilityMonthlyUpkeepBreakdown,
  getClubInfrastructureUpgradeCosts,
} from '../utils/clubEconomyScale';
import { getClubLeaguePrizePreview } from '../utils/seasonPrizeSettlementEngine';
import confetti from 'canvas-confetti';

interface FinancesStadiumViewProps {
  club: Club;
  currentDate?: string;
  currentRound?: number;
  seasonYear?: number;
  fanConfidence?: number;
  scoutingWeeklyWages?: number;
  managerMonthlySalary?: number;
  transferClauses?: ActiveTransferClause[];
  onUpdateFinancesAndStadium: (updatedClub: Club) => void;
  onNavigateToSponsors?: () => void;
}

type FinanceTabId =
  | 'overview'
  | 'revenue'
  | 'commercial'
  | 'expenses'
  | 'ledger'
  | 'infrastructure';

interface ChartMonthPoint {
  month: number;
  monthLabel: string;
  fullMonthName: string;
  recorded: boolean;
  saldoReal: number | null;
  saldoProjetado: number | null;
  receitas: number | null;
  despesas: number | null;
  openingBalance: number;
  closingBalance: number;
  netFlow: number;
}

export const FinancesStadiumView: React.FC<FinancesStadiumViewProps> = ({
  club,
  currentDate = '2026-01-15',
  currentRound = 1,
  seasonYear = 2026,
  fanConfidence = 68,
  scoutingWeeklyWages = 0,
  managerMonthlySalary = 45000,
  transferClauses = [],
  onUpdateFinancesAndStadium,
  onNavigateToSponsors,
}) => {
  const [activeTab, setActiveTab] = useState<FinanceTabId>('overview');
  const [chartMode, setChartMode] = useState<'balance' | 'flows'>('balance');
  const [showProjection, setShowProjection] = useState<boolean>(true);
  const [selectedMonth, setSelectedMonth] = useState<number>(() => {
    return parseDateYearMonth(currentDate, seasonYear).month;
  });
  const [selectedPrizeFilter, setSelectedPrizeFilter] = useState<
    'all' | 'minha_liga' | 'copas' | 'ligas'
  >('all');

  // Commercial Ticket Pricing (3 sectors)
  const initialPrices = getDefaultTicketPrices(club);
  const [popularPrice, setPopularPrice] = useState<number>(initialPrices.popular);
  const [cadeiraPrice, setCadeiraPrice] = useState<number>(initialPrices.cadeiras);
  const [vipPrice, setVipPrice] = useState<number>(initialPrices.vip);

  // Sócio-Torcedor Pricing
  const initialSocioPlan = getDefaultSocioPlan(club);
  const [socioFee, setSocioFee] = useState<number>(initialSocioPlan.monthlyFee);
  const [socioDiscount, setSocioDiscount] = useState<number>(initialSocioPlan.ticketDiscountPct);

  // Bank Loan configurator
  const bankLoanLimit = useMemo(() => getBankLoanLimitForClub(club), [club]);
  const [loanAmount, setLoanAmount] = useState<number>(() =>
    Math.max(250_000, Math.round((bankLoanLimit * 0.35) / 50_000) * 50_000)
  );
  const [loanTerm, setLoanTerm] = useState<6 | 12>(12);

  // Ledger filters
  const [ledgerTypeFilter, setLedgerTypeFilter] = useState<'ALL' | 'INCOME' | 'EXPENSE'>('ALL');
  const [ledgerCatFilter, setLedgerCatFilter] = useState<FinanceCategory | 'ALL'>('ALL');
  const [ledgerSearch, setLedgerSearch] = useState<string>('');

  const [feedback, setFeedback] = useState<{ text: string; tone: 'info' | 'warn' } | null>(null);

  useEffect(() => {
    const p = getDefaultTicketPrices(club);
    setPopularPrice(p.popular);
    setCadeiraPrice(p.cadeiras);
    setVipPrice(p.vip);

    const s = getDefaultSocioPlan(club);
    setSocioFee(s.monthlyFee);
    setSocioDiscount(s.ticketDiscountPct);
  }, [
    club.id,
    club.stadium.ticketPrice,
    club.finances.popularTicketPrice,
    club.finances.vipTicketPrice,
    club.finances.socioMonthlyFee,
    club.finances.socioTicketDiscountPct,
  ]);

  const formatCurrency = (val: number) => formatBrlFull(val);

  const clubWithHistory = useMemo(
    () => syncUserClubLiveMonthlySnapshot(club, currentDate, seasonYear),
    [club, currentDate, seasonYear]
  );

  const { month: activeCalendarMonth } = useMemo(
    () => parseDateYearMonth(currentDate, seasonYear),
    [currentDate, seasonYear]
  );

  const fixedFlow = useMemo(
    () =>
      calculateClubMonthlyFixedFlow(
        clubWithHistory,
        scoutingWeeklyWages,
        managerMonthlySalary,
        fanConfidence,
        currentRound
      ),
    [clubWithHistory, scoutingWeeklyWages, managerMonthlySalary, fanConfidence, currentRound]
  );

  const overdraftLimit = useMemo(
    () => getClubOverdraftLimit(club),
    [club]
  );

  const facilityUpkeep = useMemo(
    () => getClubFacilityMonthlyUpkeepBreakdown(club),
    [club]
  );

  const infraCosts = useMemo(
    () => getClubInfrastructureUpgradeCosts(club),
    [club]
  );

  const clubLeaguePrizePreview = useMemo(
    () => getClubLeaguePrizePreview(club),
    [club]
  );

  const transferBanInfo = useMemo(
    () => isClubUnderTransferBan(club, currentDate),
    [club, currentDate]
  );

  const lastSixMonths = useMemo(
    () => buildLastSixMonthsBalanceSeries(clubWithHistory, currentDate, seasonYear),
    [clubWithHistory, currentDate, seasonYear]
  );

  const chartData: ChartMonthPoint[] = useMemo(() => {
    const rawHistory: MonthlyFinanceEntry[] = clubWithHistory.finances.monthlyHistory || [];
    let projBalance = clubWithHistory.finances.balance;

    return rawHistory.map((entry) => {
      const isRecorded = isSplitCalendarClub(club)
        ? entry.recorded
        : entry.recorded || entry.month <= activeCalendarMonth;

      if (isRecorded) {
        projBalance = entry.closingBalance;
        return {
          month: entry.month,
          monthLabel: entry.monthLabel,
          fullMonthName: entry.fullMonthName,
          recorded: true,
          saldoReal: entry.closingBalance,
          saldoProjetado: entry.month === activeCalendarMonth ? entry.closingBalance : null,
          receitas: entry.income,
          despesas: entry.expenses,
          openingBalance: entry.openingBalance,
          closingBalance: entry.closingBalance,
          netFlow: entry.netFlow,
        };
      }

      const interestIfRed = projBalance < 0 ? Math.round(Math.abs(projBalance) * 0.035) : 0;
      const projIncome =
        fixedFlow.totalMonthlyFixedIncome + Math.round(club.finances.weeklySponsor * 3);
      const projExpense =
        fixedFlow.monthlySquadWages +
        fixedFlow.monthlyStaffAndUpkeep +
        fixedFlow.monthlyBankLoanInstallment +
        interestIfRed;
      const nextProj = projBalance + projIncome - projExpense;
      const openProj = projBalance;
      projBalance = nextProj;

      return {
        month: entry.month,
        monthLabel: entry.monthLabel,
        fullMonthName: entry.fullMonthName,
        recorded: false,
        saldoReal: null,
        saldoProjetado: nextProj,
        receitas: showProjection ? projIncome : null,
        despesas: showProjection ? projExpense : null,
        openingBalance: openProj,
        closingBalance: nextProj,
        netFlow: projIncome - projExpense,
      };
    });
  }, [
    clubWithHistory,
    activeCalendarMonth,
    fixedFlow,
    club.finances.weeklySponsor,
    showProjection,
  ]);

  const projectedDecBalance = chartData[11]?.closingBalance ?? club.finances.balance;
  const totalIncomeSeason = club.finances.totalIncomeSeason || 0;
  const totalExpensesSeason = club.finances.totalExpensesSeason || 0;
  const operationalNet = totalIncomeSeason - totalExpensesSeason;
  const spendingMoreThanEarning = totalExpensesSeason > totalIncomeSeason;
  const isInRedNow = club.finances.balance < 0;
  const willEndInRedProjected = projectedDecBalance < 0;

  // Payroll-to-revenue sustainability ratio
  const annualizedWageLoad = fixedFlow.monthlySquadWages * 12;
  const wageToRevenueRatio =
    totalIncomeSeason > 500_000
      ? Math.round(
          ((club.finances.seasonBreakdown?.WAGES_SQUAD || fixedFlow.monthlySquadWages) /
            Math.max(1, totalIncomeSeason)) *
            100
        )
      : Math.round(
          (annualizedWageLoad /
            Math.max(
              1,
              (fixedFlow.totalMonthlyFixedIncome + club.finances.weeklySponsor * 3) * 12
            )) *
            100
        );

  const selectedMonthPoint =
    chartData.find((d) => d.month === selectedMonth) ||
    chartData[Math.max(0, activeCalendarMonth - 1)] ||
    chartData[0];

  // Live preview of commercial changes using draft sliders
  const previewClub: Club = useMemo(
    () => ({
      ...club,
      stadium: {
        ...club.stadium,
        ticketPrice: cadeiraPrice,
      },
      finances: {
        ...club.finances,
        popularTicketPrice: popularPrice,
        vipTicketPrice: vipPrice,
        socioMonthlyFee: socioFee,
        socioTicketDiscountPct: socioDiscount,
      },
    }),
    [club, cadeiraPrice, popularPrice, vipPrice, socioFee, socioDiscount]
  );

  const liveMatchEconPreview = useMemo(
    () =>
      calculateMatchDayEconomics(previewClub, previewClub, {
        fanConfidence,
        randomJitter: 0,
      }),
    [previewClub, fanConfidence]
  );

  const liveSocioPreview = useMemo(
    () => calculateSocioMonthlyBreakdown(previewClub, fanConfidence),
    [previewClub, fanConfidence]
  );

  // DRE Breakdown reconciliation (supports legacy saves cleanly)
  const dreData = useMemo(() => {
    const bd = club.finances.seasonBreakdown || {};
    const incomeRows = INCOME_CATEGORIES_ORDER.map((cat) => ({
      category: cat,
      meta: FINANCE_CATEGORY_META[cat],
      amount: bd[cat] || 0,
    }));
    const mappedIncomeSum = incomeRows.reduce((s, r) => s + r.amount, 0);
    const legacyIncomeGap = Math.max(0, totalIncomeSeason - mappedIncomeSum);

    const expenseRows = EXPENSE_CATEGORIES_ORDER.map((cat) => ({
      category: cat,
      meta: FINANCE_CATEGORY_META[cat],
      amount: bd[cat] || 0,
    }));
    const mappedExpenseSum = expenseRows.reduce((s, r) => s + r.amount, 0);
    const legacyExpenseGap = Math.max(0, totalExpensesSeason - mappedExpenseSum);

    return {
      incomeRows,
      legacyIncomeGap,
      expenseRows,
      legacyExpenseGap,
    };
  }, [club.finances.seasonBreakdown, totalIncomeSeason, totalExpensesSeason]);

  // Top earners in squad
  const topEarners = useMemo(() => {
    return [...club.squad]
      .sort((a, b) => (b.wage || 0) - (a.wage || 0))
      .slice(0, 8);
  }, [club.squad]);

  // Filtered ledger
  const filteredLedger = useMemo(() => {
    const raw = club.finances.ledger || [];
    const q = ledgerSearch.trim().toLowerCase();
    return raw.filter((entry) => {
      if (ledgerTypeFilter !== 'ALL' && entry.type !== ledgerTypeFilter) return false;
      if (ledgerCatFilter !== 'ALL' && entry.category !== ledgerCatFilter) return false;
      if (q && !entry.description.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [club.finances.ledger, ledgerTypeFilter, ledgerCatFilter, ledgerSearch]);

  // Bank Loan installment preview
  const loanPreview = useMemo(() => {
    const rate = 0.021;
    const factor = Math.pow(1 + rate, loanTerm);
    const installment = Math.round((loanAmount * rate * factor) / (factor - 1));
    const totalPayback = installment * loanTerm;
    const totalInterest = Math.max(0, totalPayback - loanAmount);
    return { installment, totalPayback, totalInterest };
  }, [loanAmount, loanTerm]);

  const showToast = (text: string, tone: 'info' | 'warn' = 'info', ms = 3800) => {
    setFeedback({ text, tone });
    setTimeout(() => setFeedback(null), ms);
  };

  const handleApplyTicketPreset = (preset: 'popular' | 'equilibrado' | 'premium') => {
    soundEngine.playClick();
    const mult =
      club.division === 'A'
        ? 1
        : club.division === 'B'
        ? 0.68
        : club.division === 'C'
        ? 0.48
        : club.division === 'D' || club.division === 'EST'
        ? 0.35
        : 1.25;

    if (preset === 'popular') {
      setPopularPrice(Math.max(15, Math.round((25 * mult) / 5) * 5));
      setCadeiraPrice(Math.max(25, Math.round((45 * mult) / 5) * 5));
      setVipPrice(Math.max(60, Math.round((120 * mult) / 10) * 10));
    } else if (preset === 'equilibrado') {
      setPopularPrice(Math.max(20, Math.round((40 * mult) / 5) * 5));
      setCadeiraPrice(Math.max(30, Math.round((65 * mult) / 5) * 5));
      setVipPrice(Math.max(80, Math.round((170 * mult) / 10) * 10));
    } else {
      setPopularPrice(Math.max(25, Math.round((55 * mult) / 5) * 5));
      setCadeiraPrice(Math.max(40, Math.round((95 * mult) / 5) * 5));
      setVipPrice(Math.max(120, Math.round((260 * mult) / 10) * 10));
    }
  };

  const handleSaveTicketPrices = () => {
    soundEngine.playClick();
    const updated: Club = {
      ...club,
      stadium: {
        ...club.stadium,
        ticketPrice: cadeiraPrice,
      },
      finances: {
        ...club.finances,
        popularTicketPrice: popularPrice,
        vipTicketPrice: vipPrice,
      },
    };
    onUpdateFinancesAndStadium(updated);
    showToast(
      `Tabela de ingressos salva (Popular ${formatCurrency(popularPrice)} · Cadeiras ${formatCurrency(cadeiraPrice)} · VIP ${formatCurrency(vipPrice)}).`,
      'info'
    );
  };

  const handleSaveSocioPlan = () => {
    soundEngine.playClick();
    const updated: Club = {
      ...club,
      finances: {
        ...club.finances,
        socioMonthlyFee: socioFee,
        socioTicketDiscountPct: socioDiscount,
      },
    };
    onUpdateFinancesAndStadium(updated);
    showToast(
      `Plano Sócio-Torcedor atualizado: mensalidade base ${formatCurrency(socioFee)} e ${socioDiscount}% de desconto em jogos.`,
      'info'
    );
  };

  const handleLaunchSocioCampaign = (tier: 'digital' | 'matchday' | 'nacional') => {
    soundEngine.playClick();
    const res = launchSocioCampaign(previewClub, tier, currentRound, currentDate);
    if (!res.success) {
      showToast(res.errorMessage || 'Não foi possível iniciar a campanha.', 'warn', 4200);
      return;
    }
    soundEngine.playFanfare();
    onUpdateFinancesAndStadium(res.updatedClub);
    showToast(
      `Campanha concluída! +${res.newMembersAdded.toLocaleString('pt-BR')} novos sócios-torcedores aderiram ao programa (investimento de ${formatCurrency(res.campaignCost)}).`,
      'info',
      4500
    );
  };

  const handleContractLoan = () => {
    soundEngine.playClick();
    const res = contractClubBankLoan(club, loanAmount, loanTerm, currentDate);
    if (!res.success) {
      showToast(res.errorMessage || 'Operação bancária recusada.', 'warn', 4200);
      return;
    }
    soundEngine.playFanfare();
    onUpdateFinancesAndStadium(res.updatedClub);
    showToast(
      `Crédito aprovado! ${formatCurrency(loanAmount)} creditados em caixa (${loanTerm} parcelas de ${formatCurrency(loanPreview.installment)}/mês).`,
      'info',
      4500
    );
  };

  const handleRepayLoan = () => {
    soundEngine.playClick();
    const res = repayClubBankLoan(club, currentDate);
    if (!res.success) {
      showToast(res.errorMessage || 'Saldo insuficiente para quitar.', 'warn', 4200);
      return;
    }
    soundEngine.playFanfare();
    onUpdateFinancesAndStadium(res.updatedClub);
    showToast('Empréstimo bancário quitado integralmente! Juros futuros eliminados.', 'info', 4000);
  };

  const handleExpandStadium = (extraSeats: number, cost: number) => {
    soundEngine.playClick();
    const nextBalance = club.finances.balance - cost;
    if (nextBalance < -overdraftLimit) {
      showToast(
        `Limite bancário excedido! Cheque especial máximo: -${formatCurrency(overdraftLimit)}.`,
        'warn',
        4000
      );
      return;
    }

    const updatedFinances = recordFinanceLedgerMutation(club.finances, {
      date: currentDate,
      category: 'INFRASTRUCTURE',
      type: 'EXPENSE',
      amount: cost,
      description: `Ampliação da Arena (+${extraSeats.toLocaleString('pt-BR')} lugares em ${club.stadium.name})`,
      applyToBalance: true,
    });

    const updated: Club = {
      ...club,
      finances: updatedFinances,
      stadium: {
        ...club.stadium,
        capacity: club.stadium.capacity + extraSeats,
        level: Math.min(5, club.stadium.level + 1),
      },
    };

    soundEngine.playFanfare();
    confetti({ particleCount: 70, spread: 70 });
    onUpdateFinancesAndStadium(updated);

    if (nextBalance < 0) {
      showToast(
        `Obra financiada no cheque especial! Saldo negativo (${formatCurrency(nextBalance)}). Recupere o caixa até o fim do ano.`,
        'warn',
        5000
      );
    } else {
      showToast(
        `Obras concluídas! O estádio ${club.stadium.name} agora comporta ${(
          club.stadium.capacity + extraSeats
        ).toLocaleString('pt-BR')} torcedores!`,
        'info',
        4000
      );
    }
  };

  const handleUpgradeFacility = (
    facilityType: 'training' | 'medical' | 'youth',
    cost: number
  ) => {
    soundEngine.playClick();
    const nextBalance = club.finances.balance - cost;
    if (nextBalance < -overdraftLimit) {
      showToast(
        `Limite bancário excedido! Cheque especial máximo: -${formatCurrency(overdraftLimit)}.`,
        'warn',
        4000
      );
      return;
    }

    let nextLevel = 2;
    let facilityName = '';
    const patchedFinances = { ...club.finances };

    if (facilityType === 'training') {
      nextLevel = Math.min(5, patchedFinances.trainingFacilityLevel + 1);
      patchedFinances.trainingFacilityLevel = nextLevel;
      facilityName = 'Centro de Treinamento';
    } else if (facilityType === 'medical') {
      nextLevel = Math.min(5, patchedFinances.medicalFacilityLevel + 1);
      patchedFinances.medicalFacilityLevel = nextLevel;
      facilityName = 'Departamento Médico';
    } else {
      nextLevel = Math.min(5, patchedFinances.youthAcademyLevel + 1);
      patchedFinances.youthAcademyLevel = nextLevel;
      facilityName = 'Categorias de Base';
    }

    const updatedFinances = recordFinanceLedgerMutation(patchedFinances, {
      date: currentDate,
      category: 'INFRASTRUCTURE',
      type: 'EXPENSE',
      amount: cost,
      description: `Upgrade ${facilityName} (Nível ${nextLevel}/5)`,
      applyToBalance: true,
    });

    const updated: Club = {
      ...club,
      finances: updatedFinances,
    };

    soundEngine.playFanfare();
    confetti({ particleCount: 60, spread: 60 });
    onUpdateFinancesAndStadium(updated);

    if (nextBalance < 0) {
      showToast(
        `${facilityName} atualizado via crédito! Caixa no vermelho (${formatCurrency(nextBalance)}).`,
        'warn',
        5000
      );
    } else {
      showToast(
        `Upgrade concluído! ${facilityName} atingiu o Nível ${nextLevel}/5.`,
        'info',
        3500
      );
    }
  };

  const campaignCooldownLeft = Math.max(
    0,
    4 - (currentRound - (club.finances.lastSocioCampaignRound ?? -99))
  );

  return (
    <div className="space-y-6">
      {/* Feedback Banner */}
      {feedback && (
        <div
          className={`rounded-xl p-3.5 text-xs font-bold flex items-center gap-2.5 border ${
            feedback.tone === 'warn'
              ? 'bg-rose-500/15 border-rose-500/40 text-rose-200'
              : 'bg-sky-500/15 border-sky-500/40 text-sky-200'
          }`}
        >
          {feedback.tone === 'warn' ? (
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
          ) : (
            <Sparkles className="w-4 h-4 text-sky-400 shrink-0" />
          )}
          <span>{feedback.text}</span>
        </div>
      )}

      {/* Active STJD Punishment Banner if serving sanctions */}
      {club.finances.activePunishment && (
        <div className="bg-rose-950/35 border border-rose-500/40 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400 shrink-0">
              <Ban className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-rose-300">
                Punição Ativa do STJD · Fair Play Financeiro ({club.finances.activePunishment.seasonYearApplied})
              </div>
              <p className="text-xs text-slate-200 mt-0.5 leading-relaxed">
                {club.finances.activePunishment.summary}
              </p>
            </div>
          </div>
          {transferBanInfo.banned && (
            <span className="text-xs font-mono font-bold text-rose-300 bg-rose-500/15 border border-rose-500/30 px-3 py-1.5 rounded-xl whitespace-nowrap shrink-0">
              Transfer Ban até {transferBanInfo.untilDisplay}
            </span>
          )}
        </div>
      )}

      {/* Top Financial Executive KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Saldo em Caixa */}
        <div
          className={`bg-[#0c1424] border rounded-2xl p-4 ${
            isInRedNow ? 'border-rose-500/50' : 'border-slate-800/80'
          }`}
        >
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-300">
              Saldo em Caixa
            </span>
            <Wallet className={`w-4 h-4 ${isInRedNow ? 'text-rose-400' : 'text-sky-400'}`} />
          </div>
          <p
            className={`text-xl font-black font-mono tabular-nums ${
              isInRedNow ? 'text-rose-400' : 'text-sky-400'
            }`}
          >
            {formatCurrency(club.finances.balance)}
          </p>
          <span className="text-[11px] text-slate-400 mt-1 block tabular-nums">
            {isInRedNow
              ? `No vermelho · Juros 3,5%/mês (${formatBrlCompact(fixedFlow.monthlyOverdraftInterest)})`
              : club.finances.bankLoan && club.finances.bankLoan.principalRemaining > 0
              ? `Dívida bancária: ${formatBrlCompact(club.finances.bankLoan.principalRemaining)} (${club.finances.bankLoan.monthsRemaining}x)`
              : `Cheque especial até -${formatBrlCompact(overdraftLimit)}`}
          </span>
        </div>

        {/* KPI 2: Resultado no Ano */}
        <div
          className={`bg-[#0c1424] border rounded-2xl p-4 ${
            spendingMoreThanEarning ? 'border-amber-500/40' : 'border-slate-800/80'
          }`}
        >
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-300">
              Resultado no Ano
            </span>
            {operationalNet >= 0 ? (
              <TrendingUp className="w-4 h-4 text-emerald-400" />
            ) : (
              <TrendingDown className="w-4 h-4 text-amber-400" />
            )}
          </div>
          <p
            className={`text-xl font-black font-mono tabular-nums ${
              operationalNet >= 0 ? 'text-emerald-400' : 'text-amber-400'
            }`}
          >
            {operationalNet >= 0 ? '+' : ''}
            {formatCurrency(operationalNet)}
          </p>
          <span className="text-[11px] text-slate-400 mt-1 block tabular-nums">
            Entrou {formatBrlCompact(totalIncomeSeason)} · Saiu {formatBrlCompact(totalExpensesSeason)}
          </span>
        </div>

        {/* KPI 3: Custo Mensal & Peso da Folha */}
        <div className="bg-[#0c1424] border border-slate-800/80 rounded-2xl p-4">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-300">
              Despesa Fixa Mensal
            </span>
            <Users className="w-4 h-4 text-rose-400" />
          </div>
          <p className="text-xl font-black text-rose-400 font-mono tabular-nums">
            {formatCurrency(fixedFlow.totalMonthlyFixedExpenses)}
          </p>
          <span className="text-[11px] text-slate-400 mt-1 block tabular-nums">
            Elenco {formatBrlCompact(fixedFlow.monthlySquadWages)} ·{' '}
            <span
              className={
                wageToRevenueRatio > 70
                  ? 'text-rose-400 font-semibold'
                  : wageToRevenueRatio > 55
                  ? 'text-amber-300 font-semibold'
                  : 'text-emerald-400 font-semibold'
              }
            >
              {wageToRevenueRatio}% da receita
            </span>
          </span>
        </div>

        {/* KPI 4: Receitas Recorrentes (Sócios + TV + Patrocínios) */}
        <div className="bg-[#0c1424] border border-slate-800/80 rounded-2xl p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-cyan-300">
                Receita Fixa Mensal
              </span>
              <Handshake className="w-4 h-4 text-cyan-400" />
            </div>
            <p className="text-xl font-black text-emerald-400 font-mono tabular-nums">
              +{formatCurrency(fixedFlow.totalMonthlyFixedIncome)}
            </p>
            <span className="text-[11px] text-slate-400 mt-1 block tabular-nums">
              Sócios {formatBrlCompact(fixedFlow.monthlySocioRevenue)} · TV{' '}
              {formatBrlCompact(fixedFlow.monthlyBroadcastBase)} · {countActiveSponsors(club.sponsors)}/4 patrocínios
            </span>
          </div>
        </div>
      </div>

      {/* Sub-navigation Tabs */}
      <ScrollableTabStrip
        activeKey={activeTab}
        ariaLabel="Sub-abas de Finanças e Estádio"
        className="border-b border-slate-800/80 pb-2"
        innerClassName="flex items-center gap-2"
      >
        <button
          type="button"
          data-tab-active={activeTab === 'overview' ? 'true' : undefined}
          onClick={() => {
            soundEngine.playClick();
            setActiveTab('overview');
          }}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
            activeTab === 'overview'
              ? 'bg-sky-400 text-slate-950 shadow-lg shadow-sky-500/20'
              : 'bg-[#0c1424] text-slate-300 hover:text-white border border-slate-800'
          }`}
        >
          <LineChartIcon className="w-4 h-4" />
          <span>Visão Geral & DRE</span>
        </button>

        <button
          type="button"
          onClick={() => {
            soundEngine.playClick();
            setActiveTab('revenue');
          }}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
            activeTab === 'revenue'
              ? 'bg-emerald-400 text-slate-950 shadow-lg shadow-emerald-500/20'
              : 'bg-[#0c1424] text-slate-300 hover:text-white border border-slate-800'
          }`}
        >
          <Ticket className="w-4 h-4" />
          <span>Receitas: Sócios, Bilheteria & Patrocínios</span>
        </button>

        <button
          type="button"
          onClick={() => {
            soundEngine.playClick();
            setActiveTab('commercial');
          }}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
            activeTab === 'commercial'
              ? 'bg-emerald-400 text-slate-950 shadow-lg shadow-emerald-500/20'
              : 'bg-[#0c1424] text-slate-300 hover:text-white border border-slate-800'
          }`}
        >
          <Coins className="w-4 h-4" />
          <span>Expansão Comercial (8 Fontes)</span>
        </button>

        <button
          type="button"
          onClick={() => {
            soundEngine.playClick();
            setActiveTab('expenses');
          }}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
            activeTab === 'expenses'
              ? 'bg-rose-400 text-slate-950 shadow-lg shadow-rose-500/20'
              : 'bg-[#0c1424] text-slate-300 hover:text-white border border-slate-800'
          }`}
        >
          <CreditCard className="w-4 h-4" />
          <span>Gastos, Folha & Crédito</span>
        </button>

        <button
          type="button"
          onClick={() => {
            soundEngine.playClick();
            setActiveTab('ledger');
          }}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
            activeTab === 'ledger'
              ? 'bg-sky-400 text-slate-950 shadow-lg shadow-sky-500/20'
              : 'bg-[#0c1424] text-slate-300 hover:text-white border border-slate-800'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Extrato Bancário</span>
        </button>

        <button
          type="button"
          onClick={() => {
            soundEngine.playClick();
            setActiveTab('infrastructure');
          }}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
            activeTab === 'infrastructure'
              ? 'bg-amber-400 text-slate-950 shadow-lg shadow-amber-500/20'
              : 'bg-[#0c1424] text-slate-300 hover:text-white border border-slate-800'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Estádio, CT & Premiações</span>
        </button>
      </ScrollableTabStrip>

      {/* TAB 1: VISÃO GERAL, DRE & FLUXO DE CAIXA */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Histórico Mensal do Saldo — Últimos 6 Meses (Recharts LineChart) */}
          <div className="bg-[#0c1424] border border-slate-800/80 rounded-2xl p-5 sm:p-6">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-800/80">
              <div>
                <div className="flex items-center gap-2">
                  <LineChartIcon className="w-5 h-5 text-emerald-400 shrink-0" />
                  <h2 className="text-base sm:text-lg font-extrabold font-display text-white">
                    Histórico Mensal do Saldo · Últimos 6 Meses
                  </h2>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Evolução contínua do caixa do clube no período{' '}
                  <span className="text-slate-200 font-semibold font-mono tabular-nums">
                    {lastSixMonths.periodLabel}
                  </span>
                  . Passe o mouse sobre os pontos para detalhar cada mês.
                </p>
              </div>

              <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
                <div className="bg-[#070c16] border border-slate-800/90 rounded-xl px-3 py-2">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block">
                    Variação (6M)
                  </span>
                  <div className="flex items-center gap-1 mt-0.5">
                    {lastSixMonths.sixMonthDelta >= 0 ? (
                      <TrendingUp className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    ) : (
                      <TrendingDown className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                    )}
                    <strong
                      className={`text-xs sm:text-sm font-mono font-extrabold tabular-nums ${
                        lastSixMonths.sixMonthDelta >= 0 ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {lastSixMonths.sixMonthDelta >= 0 ? '+' : ''}
                      {formatBrlCompact(lastSixMonths.sixMonthDelta)}
                    </strong>
                  </div>
                  {lastSixMonths.sixMonthDeltaPct !== null && (
                    <span
                      className={`text-[10px] font-mono tabular-nums ${
                        lastSixMonths.sixMonthDelta >= 0 ? 'text-emerald-400/80' : 'text-rose-400/80'
                      }`}
                    >
                      {lastSixMonths.sixMonthDelta >= 0 ? '+' : ''}
                      {lastSixMonths.sixMonthDeltaPct.toFixed(1).replace('.', ',')}%
                    </span>
                  )}
                </div>

                <div className="bg-[#070c16] border border-slate-800/90 rounded-xl px-3 py-2">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block">
                    Pico ({lastSixMonths.peakLabel})
                  </span>
                  <strong className="text-xs sm:text-sm font-mono font-extrabold text-sky-400 tabular-nums mt-0.5 block">
                    {formatBrlCompact(lastSixMonths.peakBalance)}
                  </strong>
                </div>

                <div className="bg-[#070c16] border border-slate-800/90 rounded-xl px-3 py-2">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block">
                    Mínimo ({lastSixMonths.lowLabel})
                  </span>
                  <strong
                    className={`text-xs sm:text-sm font-mono font-extrabold tabular-nums mt-0.5 block ${
                      lastSixMonths.lowBalance < 0 ? 'text-rose-400' : 'text-amber-300'
                    }`}
                  >
                    {formatBrlCompact(lastSixMonths.lowBalance)}
                  </strong>
                </div>
              </div>
            </div>

            <div className="h-[250px] w-full mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={lastSixMonths.points}
                  margin={{ top: 14, right: 20, left: 8, bottom: 6 }}
                >
                  <CartesianGrid
                    stroke="rgba(148, 163, 184, 0.08)"
                    strokeDasharray="3 3"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="axisLabel"
                    stroke="#64748b"
                    tick={{ fill: '#cbd5e1', fontSize: 12, fontWeight: 600 }}
                    tickLine={false}
                    axisLine={{ stroke: 'rgba(148, 163, 184, 0.18)' }}
                  />
                  <YAxis
                    stroke="#64748b"
                    tick={{ fill: '#94a3b8', fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                    width={78}
                    tickFormatter={(val: number) => formatBrlCompact(val)}
                  />
                  <ReferenceLine
                    y={0}
                    stroke="#f43f5e"
                    strokeDasharray="4 4"
                    strokeOpacity={lastSixMonths.hasNegativeMonth ? 0.85 : 0.4}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload || payload.length === 0) return null;
                      const pt = payload[0]?.payload as LastSixMonthsBalancePoint | undefined;
                      if (!pt) return null;
                      const isNeg = pt.saldo < 0;
                      return (
                        <div className="bg-[#090f1d] border border-slate-700/90 rounded-xl p-3.5 shadow-2xl text-xs min-w-[230px]">
                          <div className="flex items-center justify-between gap-3 pb-2 mb-2 border-b border-slate-800">
                            <span className="font-bold text-white">{pt.fullMonthLabel}</span>
                            <span
                              className={`text-[10px] font-semibold ${
                                pt.isCurrentMonth
                                  ? 'text-emerald-300'
                                  : pt.isBaseline
                                  ? 'text-slate-400'
                                  : 'text-sky-300'
                              }`}
                            >
                              {pt.isCurrentMonth
                                ? 'Mês Atual'
                                : pt.isBaseline
                                ? 'Saldo Inicial'
                                : 'Fechado'}
                            </span>
                          </div>
                          <div className="space-y-1.5 font-mono tabular-nums">
                            <div className="flex items-center justify-between gap-4">
                              <span className="text-slate-400 font-sans">Abertura:</span>
                              <span className="text-slate-200">
                                {formatCurrency(pt.openingBalance)}
                              </span>
                            </div>
                            <div className="flex items-center justify-between gap-4">
                              <span className="text-slate-400 font-sans">Receitas:</span>
                              <span className="text-emerald-400">
                                +{formatCurrency(pt.income)}
                              </span>
                            </div>
                            <div className="flex items-center justify-between gap-4">
                              <span className="text-slate-400 font-sans">Despesas:</span>
                              <span className="text-rose-400">
                                -{formatCurrency(pt.expenses)}
                              </span>
                            </div>
                            <div className="flex items-center justify-between gap-4">
                              <span className="text-slate-400 font-sans">Resultado:</span>
                              <span
                                className={
                                  pt.netFlow >= 0 ? 'text-emerald-300' : 'text-rose-300'
                                }
                              >
                                {pt.netFlow >= 0 ? '+' : ''}
                                {formatCurrency(pt.netFlow)}
                              </span>
                            </div>
                            <div className="pt-1.5 mt-1.5 border-t border-slate-800 flex items-center justify-between gap-4 font-bold">
                              <span className="text-slate-200 font-sans">Saldo em Caixa:</span>
                              <span className={isNeg ? 'text-rose-400' : 'text-emerald-400'}>
                                {formatCurrency(pt.saldo)}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="saldo"
                    name="Saldo Mensal"
                    stroke={
                      lastSixMonths.currentBalance < 0
                        ? '#fb7185'
                        : lastSixMonths.sixMonthDelta >= 0
                        ? '#34d399'
                        : '#38bdf8'
                    }
                    strokeWidth={3}
                    dot={{
                      r: 4.5,
                      fill: '#0c1424',
                      stroke:
                        lastSixMonths.currentBalance < 0
                          ? '#fb7185'
                          : lastSixMonths.sixMonthDelta >= 0
                          ? '#34d399'
                          : '#38bdf8',
                      strokeWidth: 2.5,
                    }}
                    activeDot={{
                      r: 6.5,
                      fill:
                        lastSixMonths.currentBalance < 0
                          ? '#fb7185'
                          : lastSixMonths.sixMonthDelta >= 0
                          ? '#34d399'
                          : '#38bdf8',
                      stroke: '#ffffff',
                      strokeWidth: 2,
                    }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Resumo dos 6 meses abaixo do gráfico */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 mt-4 pt-4 border-t border-slate-800/80">
              {lastSixMonths.points.map((pt) => (
                <div
                  key={pt.key}
                  className={`rounded-xl px-3 py-2 border text-xs ${
                    pt.isCurrentMonth
                      ? 'bg-sky-500/10 border-sky-500/40'
                      : pt.saldo < 0
                      ? 'bg-rose-500/10 border-rose-500/30'
                      : 'bg-[#070c16] border-slate-800/90'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-bold text-slate-300">{pt.axisLabel}</span>
                    {pt.isCurrentMonth && (
                      <span className="text-[9px] font-bold uppercase tracking-wider text-sky-300">
                        Atual
                      </span>
                    )}
                  </div>
                  <strong
                    className={`font-mono tabular-nums text-xs sm:text-sm mt-1 block ${
                      pt.saldo < 0 ? 'text-rose-400' : 'text-white'
                    }`}
                  >
                    {formatBrlCompact(pt.saldo)}
                  </strong>
                  <span
                    className={`text-[10px] font-mono tabular-nums block ${
                      pt.isBaseline
                        ? 'text-slate-500'
                        : pt.netFlow >= 0
                        ? 'text-emerald-400'
                        : 'text-rose-400'
                    }`}
                  >
                    {pt.isBaseline
                      ? 'Saldo base'
                      : `${pt.netFlow >= 0 ? '+' : ''}${formatBrlCompact(pt.netFlow)}`}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* DRE por Categoria */}
          <div className="bg-[#0c1424] border border-slate-800/80 rounded-2xl p-5 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-800/80">
              <div>
                <h2 className="text-base sm:text-lg font-extrabold font-display text-white">
                  Demonstração do Resultado da Temporada (DRE · {seasonYear})
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Detalhamento completo das fontes de arrecadação e centros de custo do clube.
                </p>
              </div>
              <div className="flex items-center gap-4 text-xs font-mono tabular-nums">
                <span className="text-emerald-400 font-bold">
                  Receitas: {formatCurrency(totalIncomeSeason)}
                </span>
                <span className="text-slate-600">·</span>
                <span className="text-rose-400 font-bold">
                  Despesas: {formatCurrency(totalExpensesSeason)}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-5">
              {/* Column 1: Arrecadação */}
              <div className="bg-[#070c16] border border-slate-800/90 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                    <ArrowUpRight className="w-4 h-4" />
                    Arrecadação por Origem
                  </span>
                  <span className="text-xs font-mono font-bold text-emerald-400 tabular-nums">
                    {formatCurrency(totalIncomeSeason)}
                  </span>
                </div>

                <div className="space-y-2.5">
                  {dreData.incomeRows.map((row) => {
                    const pct =
                      totalIncomeSeason > 0
                        ? Math.round((row.amount / totalIncomeSeason) * 100)
                        : 0;
                    return (
                      <div key={row.category} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-300">{row.meta.label}</span>
                          <div className="flex items-center gap-2 font-mono tabular-nums">
                            <span className="text-[11px] text-slate-500">{pct}%</span>
                            <strong className="text-emerald-400 font-bold">
                              {formatCurrency(row.amount)}
                            </strong>
                          </div>
                        </div>
                        <div className="h-1.5 rounded-full bg-slate-900 overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${row.amount > 0 ? Math.max(3, pct) : 0}%`,
                              backgroundColor: row.meta.accentColor,
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}

                  {dreData.legacyIncomeGap > 0 && (
                    <div className="space-y-1 pt-1 border-t border-slate-800/60">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-400">Receitas Acumuladas Anteriores</span>
                        <strong className="text-emerald-300 font-mono tabular-nums">
                          {formatCurrency(dreData.legacyIncomeGap)}
                        </strong>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Column 2: Gastos */}
              <div className="bg-[#070c16] border border-slate-800/90 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <span className="text-xs font-bold uppercase tracking-wider text-rose-400 flex items-center gap-1.5">
                    <ArrowDownRight className="w-4 h-4" />
                    Despesas por Centro de Custo
                  </span>
                  <span className="text-xs font-mono font-bold text-rose-400 tabular-nums">
                    {formatCurrency(totalExpensesSeason)}
                  </span>
                </div>

                <div className="space-y-2.5">
                  {dreData.expenseRows.map((row) => {
                    const pct =
                      totalExpensesSeason > 0
                        ? Math.round((row.amount / totalExpensesSeason) * 100)
                        : 0;
                    return (
                      <div key={row.category} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-300">{row.meta.label}</span>
                          <div className="flex items-center gap-2 font-mono tabular-nums">
                            <span className="text-[11px] text-slate-500">{pct}%</span>
                            <strong className="text-rose-400 font-bold">
                              {formatCurrency(row.amount)}
                            </strong>
                          </div>
                        </div>
                        <div className="h-1.5 rounded-full bg-slate-900 overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${row.amount > 0 ? Math.max(3, pct) : 0}%`,
                              backgroundColor: row.meta.accentColor,
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}

                  {dreData.legacyExpenseGap > 0 && (
                    <div className="space-y-1 pt-1 border-t border-slate-800/60">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-400">Despesas Acumuladas Anteriores</span>
                        <strong className="text-rose-300 font-mono tabular-nums">
                          {formatCurrency(dreData.legacyExpenseGap)}
                        </strong>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
            {/* Left 8 Cols: Interactive Recharts Line Chart */}
            <div className="xl:col-span-8 bg-[#0c1424] border border-slate-800/80 rounded-2xl p-5 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800/80">
                <div>
                  <h2 className="text-base sm:text-lg font-extrabold font-display text-white">
                    Evolução do Saldo Mês a Mês · Temporada{' '}
                    <span className="tabular-nums">{seasonYear}</span>
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Passe o mouse ou clique em um mês para inspecionar entradas, saídas e fechamento de caixa.
                  </p>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <div className="flex items-center bg-[#070c16] border border-slate-800 rounded-xl p-1">
                    <button
                      type="button"
                      onClick={() => {
                        soundEngine.playClick();
                        setChartMode('balance');
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                        chartMode === 'balance'
                          ? 'bg-sky-500/20 text-sky-300'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Saldo em Caixa
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        soundEngine.playClick();
                        setChartMode('flows');
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                        chartMode === 'flows'
                          ? 'bg-sky-500/20 text-sky-300'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Receitas x Despesas
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      soundEngine.playClick();
                      setShowProjection((p) => !p);
                    }}
                    className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      showProjection
                        ? 'bg-slate-800 text-slate-100 border-slate-700'
                        : 'bg-[#070c16] text-slate-400 border-slate-800 hover:text-white'
                    }`}
                  >
                    {showProjection ? 'Projeção Ativa' : 'Mostrar Projeção'}
                  </button>
                </div>
              </div>

              {/* Legend Row */}
              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 mt-4 mb-2">
                {chartMode === 'balance' ? (
                  <>
                    <span className="flex items-center gap-1.5">
                      <span className="w-3 h-0.5 bg-sky-400 inline-block rounded-full" />
                      <span>Saldo Realizado</span>
                    </span>
                    {showProjection && (
                      <span className="flex items-center gap-1.5">
                        <span
                          className={`w-3 h-0.5 inline-block border-t-2 border-dashed ${
                            willEndInRedProjected ? 'border-rose-400' : 'border-cyan-300'
                          }`}
                        />
                        <span>Projeção de Fechamento</span>
                      </span>
                    )}
                    <span className="flex items-center gap-1.5">
                      <span className="w-3 h-0.5 inline-block border-t border-dashed border-rose-500" />
                      <span className="text-rose-300">Linha do Vermelho (R$ 0)</span>
                    </span>
                  </>
                ) : (
                  <>
                    <span className="flex items-center gap-1.5">
                      <span className="w-3 h-0.5 bg-emerald-400 inline-block rounded-full" />
                      <span>Arrecadação no Mês</span>
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-3 h-0.5 bg-rose-400 inline-block rounded-full" />
                      <span>Despesas no Mês</span>
                    </span>
                  </>
                )}
              </div>

              {/* Recharts Interactive LineChart */}
              <div className="h-[310px] w-full mt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={chartData}
                    margin={{ top: 14, right: 16, left: 8, bottom: 6 }}
                    onClick={(state) => {
                      if (state && typeof state.activeTooltipIndex === 'number') {
                        const clicked = chartData[state.activeTooltipIndex];
                        if (clicked) {
                          soundEngine.playClick();
                          setSelectedMonth(clicked.month);
                        }
                      }
                    }}
                  >
                    <CartesianGrid
                      stroke="rgba(148, 163, 184, 0.08)"
                      strokeDasharray="3 3"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="monthLabel"
                      stroke="#64748b"
                      tick={{ fill: '#94a3b8', fontSize: 12 }}
                      tickLine={false}
                      axisLine={{ stroke: 'rgba(148, 163, 184, 0.15)' }}
                    />
                    <YAxis
                      stroke="#64748b"
                      tick={{ fill: '#94a3b8', fontSize: 11 }}
                      tickLine={false}
                      axisLine={false}
                      width={76}
                      tickFormatter={(val: number) => formatBrlCompact(val)}
                    />
                    <ReferenceLine
                      y={0}
                      stroke="#f43f5e"
                      strokeDasharray="4 4"
                      strokeOpacity={0.75}
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (!active || !payload || payload.length === 0) return null;
                        const point = payload[0]?.payload as ChartMonthPoint | undefined;
                        if (!point) return null;
                        const isNeg = point.closingBalance < 0;
                        return (
                          <div className="bg-[#090f1d] border border-slate-700/90 rounded-xl p-3.5 shadow-2xl text-xs min-w-[220px]">
                            <div className="flex items-center justify-between gap-3 pb-2 mb-2 border-b border-slate-800">
                              <span className="font-bold text-white">
                                {point.fullMonthName} / {seasonYear}
                              </span>
                              <span className="text-[10px] font-semibold text-sky-300">
                                {point.recorded ? 'Realizado' : 'Projeção'}
                              </span>
                            </div>
                            <div className="space-y-1.5 font-mono tabular-nums">
                              <div className="flex items-center justify-between gap-4">
                                <span className="text-slate-400 font-sans">Saldo Inicial:</span>
                                <span className="text-slate-200">
                                  {formatCurrency(point.openingBalance)}
                                </span>
                              </div>
                              <div className="flex items-center justify-between gap-4">
                                <span className="text-slate-400 font-sans">Arrecadação:</span>
                                <span className="text-emerald-400">
                                  +{formatCurrency(point.receitas ?? 0)}
                                </span>
                              </div>
                              <div className="flex items-center justify-between gap-4">
                                <span className="text-slate-400 font-sans">Despesas:</span>
                                <span className="text-rose-400">
                                  -{formatCurrency(point.despesas ?? 0)}
                                </span>
                              </div>
                              <div className="pt-1.5 mt-1.5 border-t border-slate-800 flex items-center justify-between gap-4 font-bold">
                                <span className="text-slate-200 font-sans">Saldo Final:</span>
                                <span className={isNeg ? 'text-rose-400' : 'text-sky-400'}>
                                  {formatCurrency(point.closingBalance)}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      }}
                    />

                    {chartMode === 'balance' ? (
                      <>
                        <Line
                          type="monotone"
                          dataKey="saldoReal"
                          name="Saldo Realizado"
                          stroke="#38bdf8"
                          strokeWidth={3}
                          dot={{ r: 4, fill: '#0c1424', stroke: '#38bdf8', strokeWidth: 2 }}
                          activeDot={{ r: 6, fill: '#38bdf8', stroke: '#ffffff', strokeWidth: 2 }}
                          connectNulls={false}
                        />
                        {showProjection && (
                          <Line
                            type="monotone"
                            dataKey="saldoProjetado"
                            name="Projeção"
                            stroke={willEndInRedProjected ? '#fb7185' : '#67e8f9'}
                            strokeWidth={2}
                            strokeDasharray="6 5"
                            dot={{
                              r: 3,
                              fill: '#0c1424',
                              stroke: willEndInRedProjected ? '#fb7185' : '#67e8f9',
                              strokeWidth: 2,
                            }}
                            connectNulls
                          />
                        )}
                      </>
                    ) : (
                      <>
                        <Line
                          type="monotone"
                          dataKey="receitas"
                          name="Arrecadação"
                          stroke="#34d399"
                          strokeWidth={2.5}
                          dot={{ r: 3.5, fill: '#0c1424', stroke: '#34d399', strokeWidth: 2 }}
                          activeDot={{ r: 5.5, fill: '#34d399' }}
                        />
                        <Line
                          type="monotone"
                          dataKey="despesas"
                          name="Despesas"
                          stroke="#fb7185"
                          strokeWidth={2.5}
                          dot={{ r: 3.5, fill: '#0c1424', stroke: '#fb7185', strokeWidth: 2 }}
                          activeDot={{ r: 5.5, fill: '#fb7185' }}
                        />
                      </>
                    )}
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Interactive Month Selector & Detailed Strip */}
              <div className="mt-4 pt-4 border-t border-slate-800/80">
                <div className="grid grid-cols-6 sm:grid-cols-12 gap-1.5 mb-4">
                  {chartData.map((pt) => {
                    const isSelected = pt.month === selectedMonthPoint?.month;
                    const isNeg = pt.closingBalance < 0;
                    return (
                      <button
                        key={pt.month}
                        type="button"
                        onClick={() => {
                          soundEngine.playClick();
                          setSelectedMonth(pt.month);
                        }}
                        className={`py-1.5 px-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer text-center ${
                          isSelected
                            ? 'bg-sky-400 text-slate-950 font-bold'
                            : pt.recorded
                            ? isNeg
                              ? 'bg-rose-500/15 text-rose-300 border border-rose-500/30 hover:bg-rose-500/25'
                              : 'bg-[#070c16] text-slate-200 border border-slate-800 hover:border-slate-700'
                            : 'bg-[#070c16]/50 text-slate-500 border border-slate-800/50 hover:text-slate-300'
                        }`}
                      >
                        {pt.monthLabel}
                      </button>
                    );
                  })}
                </div>

                {selectedMonthPoint && (
                  <div className="bg-[#070c16] border border-slate-800/90 rounded-xl p-4 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                    <div>
                      <span className="text-slate-400 block">
                        {selectedMonthPoint.fullMonthName}{' '}
                        {selectedMonthPoint.recorded ? '(Realizado)' : '(Projetado)'}
                      </span>
                      <strong className="text-slate-200 font-mono tabular-nums text-sm mt-0.5 block">
                        Abertura {formatBrlCompact(selectedMonthPoint.openingBalance)}
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Arrecadação no Mês</span>
                      <strong className="text-emerald-400 font-mono tabular-nums text-sm mt-0.5 block">
                        +{formatCurrency(selectedMonthPoint.receitas ?? 0)}
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Gastos no Mês</span>
                      <strong className="text-rose-400 font-mono tabular-nums text-sm mt-0.5 block">
                        -{formatCurrency(selectedMonthPoint.despesas ?? 0)}
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Saldo Final do Mês</span>
                      <strong
                        className={`font-mono tabular-nums text-sm mt-0.5 block ${
                          selectedMonthPoint.closingBalance < 0
                            ? 'text-rose-400'
                            : 'text-sky-400'
                        }`}
                      >
                        {formatCurrency(selectedMonthPoint.closingBalance)}
                      </strong>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Right 4 Cols: Fair Play Financeiro */}
            <div className="xl:col-span-4 space-y-4">
              <div
                className={`bg-[#0c1424] border rounded-2xl p-5 ${
                  isInRedNow
                    ? 'border-rose-500/50'
                    : spendingMoreThanEarning || willEndInRedProjected
                    ? 'border-amber-500/40'
                    : 'border-slate-800/80'
                }`}
              >
                <div className="flex items-center gap-2.5 pb-3.5 border-b border-slate-800/80">
                  {isInRedNow ? (
                    <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0" />
                  ) : spendingMoreThanEarning || willEndInRedProjected ? (
                    <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
                  ) : (
                    <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
                  )}
                  <div>
                    <h3 className="text-sm font-extrabold font-display text-white">
                      Monitor de Fair Play Financeiro
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      Auditoria do Conselho Fiscal & STJD
                    </p>
                  </div>
                </div>

                {/* Status Diagnosis */}
                <div
                  className={`mt-4 p-3.5 rounded-xl border text-xs leading-relaxed ${
                    isInRedNow
                      ? 'bg-rose-500/10 border-rose-500/30 text-rose-200'
                      : spendingMoreThanEarning || willEndInRedProjected
                      ? 'bg-amber-500/10 border-amber-500/30 text-amber-200'
                      : 'bg-emerald-500/10 border-emerald-500/25 text-emerald-200'
                  }`}
                >
                  {isInRedNow ? (
                    <>
                      <strong className="block font-bold text-rose-300 mb-1">
                        RISCO MÁXIMO DE PUNIÇÃO E DEMISSÃO
                      </strong>
                      O clube está operando no vermelho ({formatCurrency(club.finances.balance)}). Se encerrar a temporada com saldo negativo, o STJD aplicará punições severas e haverá risco real de demissão!
                    </>
                  ) : willEndInRedProjected ? (
                    <>
                      <strong className="block font-bold text-amber-300 mb-1">
                        ALERTA: PROJEÇÃO TERMINA NO VERMELHO
                      </strong>
                      Mantido o ritmo atual, o caixa fechará em{' '}
                      <span className="font-mono font-bold">
                        {formatBrlCompact(projectedDecBalance)}
                      </span>
                      . Ajuste bilheteria, assine patrocínios ou negocie atletas.
                    </>
                  ) : spendingMoreThanEarning ? (
                    <>
                      <strong className="block font-bold text-amber-300 mb-1">
                        ATENÇÃO: GASTANDO MAIS DO QUE ARRECADA
                      </strong>
                      As despesas superam as receitas no ano ({formatCurrency(operationalNet)}), consumindo reservas de caixa.
                    </>
                  ) : (
                    <>
                      <strong className="block font-bold text-emerald-300 mb-1">
                        GESTÃO APROVADA PELO CONSELHO
                      </strong>
                      Contas equilibradas e projeção de fechamento positiva em{' '}
                      <span className="font-mono font-bold">
                        {formatBrlCompact(projectedDecBalance)}
                      </span>
                      .
                    </>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-slate-800/80 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Projeção Final da Temporada:</span>
                    <strong
                      className={`font-mono tabular-nums ${
                        projectedDecBalance < 0 ? 'text-rose-400' : 'text-sky-400'
                      }`}
                    >
                      {formatCurrency(projectedDecBalance)}
                    </strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Saldo Recorrente / Mês:</span>
                    <strong
                      className={`font-mono tabular-nums ${
                        fixedFlow.estimatedMonthlyNetFixed >= 0
                          ? 'text-emerald-400'
                          : 'text-amber-300'
                      }`}
                    >
                      {fixedFlow.estimatedMonthlyNetFixed >= 0 ? '+' : ''}
                      {formatCurrency(fixedFlow.estimatedMonthlyNetFixed)}
                    </strong>
                  </div>
                </div>

                {/* Statutory Rules of Punishment & Dismissal */}
                <div className="mt-4 pt-4 border-t border-slate-800/80">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-200 mb-2">
                    <Scale className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span>Sanções por Déficit no Fechamento</span>
                  </div>
                  <ul className="space-y-1.5 text-[11px] text-slate-400 leading-relaxed">
                    <li>
                      · <strong className="text-slate-200">Perda de Pontos:</strong> -3 a -6 pontos na liga seguinte (STJD).
                    </li>
                    <li>
                      · <strong className="text-slate-200">Transfer Ban:</strong> Proibição de contratar durante a 1ª janela.
                    </li>
                    <li>
                      · <strong className="text-slate-200">Penhora de Ativo:</strong> Leilão forçado de 1 titular para cobrir dívidas.
                    </li>
                    <li>
                      · <strong className="text-rose-300">Demissão do Técnico:</strong> Rescisão por responsabilidade fiscal.
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: RECEITAS — SÓCIOS, BILHETERIA EM 3 SETORES & PATROCÍNIOS */}
      {activeTab === 'revenue' && (
        <div className="space-y-6">
          {/* 1. Programa Sócio-Torcedor */}
          <div className="bg-[#0c1424] border border-slate-800/80 rounded-2xl p-5 sm:p-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800/80">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                  <UserCheck className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-extrabold font-display text-white">
                    Programa Sócio-Torcedor & Planos de Adesão
                  </h2>
                  <p className="text-xs text-slate-400">
                    Defina mensalidade e descontos nos ingressos para equilibrar receita fixa e crescimento da base.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4 text-xs font-mono tabular-nums bg-[#070c16] border border-slate-800 rounded-xl px-4 py-2.5">
                <div>
                  <span className="text-[10px] uppercase tracking-wider text-slate-400 block font-sans">
                    Sócios Ativos
                  </span>
                  <strong className="text-base text-white">
                    {liveSocioPreview.totalSocios.toLocaleString('pt-BR')}
                  </strong>
                </div>
                <div className="h-7 w-px bg-slate-800" />
                <div>
                  <span className="text-[10px] uppercase tracking-wider text-slate-400 block font-sans">
                    Receita / Mês
                  </span>
                  <strong className="text-base text-emerald-400">
                    {formatCurrency(liveSocioPreview.totalMonthlyRevenue)}
                  </strong>
                </div>
                <div className="h-7 w-px bg-slate-800" />
                <div>
                  <span className="text-[10px] uppercase tracking-wider text-slate-400 block font-sans">
                    Projeção Orgânica
                  </span>
                  <strong
                    className={`text-sm ${
                      liveSocioPreview.projectedMonthlyGrowth >= 0
                        ? 'text-sky-400'
                        : 'text-rose-400'
                    }`}
                  >
                    {liveSocioPreview.projectedMonthlyGrowth >= 0 ? '+' : ''}
                    {liveSocioPreview.projectedMonthlyGrowth.toLocaleString('pt-BR')}/mês
                  </strong>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-5">
              {/* Left 5 cols: Sliders & Save */}
              <div className="lg:col-span-5 bg-[#070c16] border border-slate-800 rounded-xl p-4 flex flex-col justify-between space-y-4">
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="font-semibold text-slate-300">Mensalidade Base</span>
                      <span className="font-mono font-bold text-emerald-400 text-sm tabular-nums">
                        {formatCurrency(socioFee)}/mês
                      </span>
                    </div>
                    <input
                      type="range"
                      min={25}
                      max={140}
                      step={5}
                      value={socioFee}
                      onChange={(e) => setSocioFee(Number(e.target.value))}
                      className="w-full accent-emerald-400 cursor-pointer"
                    />
                    <p className="text-[11px] text-slate-400 mt-1">
                      Mensalidades acessíveis aumentam adesões orgânicas; valores altos elevam a receita imediata, mas geram cancelamentos se o time oscilar.
                    </p>
                  </div>

                  <div>
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="font-semibold text-slate-300">
                        Desconto do Sócio no Ingresso
                      </span>
                      <span className="font-mono font-bold text-sky-400 text-sm tabular-nums">
                        {socioDiscount}% OFF
                      </span>
                    </div>
                    <input
                      type="range"
                      min={20}
                      max={65}
                      step={5}
                      value={socioDiscount}
                      onChange={(e) => setSocioDiscount(Number(e.target.value))}
                      className="w-full accent-sky-400 cursor-pointer"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleSaveSocioPlan}
                  className="w-full py-2.5 rounded-xl bg-emerald-400 hover:bg-emerald-300 font-black text-xs text-slate-950 transition-colors cursor-pointer whitespace-nowrap shrink-0"
                >
                  Salvar Política de Sócio-Torcedor
                </button>
              </div>

              {/* Right 7 cols: 3 Tier Breakdown + Acquisition Campaigns */}
              <div className="lg:col-span-7 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="bg-[#070c16] border border-slate-800 rounded-xl p-3.5">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                      Plano Popular (56%)
                    </span>
                    <p className="text-base font-black text-white font-mono tabular-nums mt-1">
                      {liveSocioPreview.tiers.popularCount.toLocaleString('pt-BR')}
                    </p>
                    <span className="text-[11px] text-emerald-400 font-mono tabular-nums block mt-0.5">
                      {formatCurrency(liveSocioPreview.tiers.popularFee)}/mês ·{' '}
                      {formatBrlCompact(liveSocioPreview.tiers.popularRevenue)}
                    </span>
                  </div>

                  <div className="bg-[#070c16] border border-slate-800 rounded-xl p-3.5">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-sky-300 block">
                      Tradicional (32%)
                    </span>
                    <p className="text-base font-black text-white font-mono tabular-nums mt-1">
                      {liveSocioPreview.tiers.tradCount.toLocaleString('pt-BR')}
                    </p>
                    <span className="text-[11px] text-emerald-400 font-mono tabular-nums block mt-0.5">
                      {formatCurrency(liveSocioPreview.tiers.tradFee)}/mês ·{' '}
                      {formatBrlCompact(liveSocioPreview.tiers.tradRevenue)}
                    </span>
                  </div>

                  <div className="bg-[#070c16] border border-slate-800 rounded-xl p-3.5">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-amber-300 block">
                      Camarote VIP (12%)
                    </span>
                    <p className="text-base font-black text-white font-mono tabular-nums mt-1">
                      {liveSocioPreview.tiers.vipCount.toLocaleString('pt-BR')}
                    </p>
                    <span className="text-[11px] text-emerald-400 font-mono tabular-nums block mt-0.5">
                      {formatCurrency(liveSocioPreview.tiers.vipFee)}/mês ·{' '}
                      {formatBrlCompact(liveSocioPreview.tiers.vipRevenue)}
                    </span>
                  </div>
                </div>

                {/* Recruitment Campaigns */}
                <div className="bg-[#070c16] border border-slate-800 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Megaphone className="w-4 h-4 text-sky-400" />
                      <span className="text-xs font-bold text-white uppercase tracking-wider">
                        Campanhas de Captação de Sócios
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-400 tabular-nums">
                      {campaignCooldownLeft > 0
                        ? `Próxima ação em ${campaignCooldownLeft} rodada(s)`
                        : `Teto potencial: ${liveSocioPreview.maxPotentialSocios.toLocaleString('pt-BR')} sócios`}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    {(
                      [
                        {
                          id: 'digital' as const,
                          title: 'Campanha Digital',
                          sub: 'Redes sociais & cashback',
                          mult: 1,
                          baseCost: 280_000,
                          baseGain: 1450,
                        },
                        {
                          id: 'matchday' as const,
                          title: 'Ação Matchday',
                          sub: 'Ídolos & Fan Fest',
                          mult: 1,
                          baseCost: 750_000,
                          baseGain: 3850,
                        },
                        {
                          id: 'nacional' as const,
                          title: 'Mega Nacional',
                          sub: 'TV aberta & embaixadores',
                          mult: 1,
                          baseCost: 1_650_000,
                          baseGain: 8200,
                        },
                      ] as const
                    ).map((camp) => {
                      const divScale =
                        club.division === 'A'
                          ? 1
                          : club.division === 'B'
                          ? 0.45
                          : club.division === 'C'
                          ? 0.22
                          : club.division === 'D' || club.division === 'EST'
                          ? 0.12
                          : 1.1;
                      const estCost = Math.round(camp.baseCost * divScale);
                      const estGain = Math.round(camp.baseGain * divScale);

                      return (
                        <button
                          key={camp.id}
                          type="button"
                          disabled={campaignCooldownLeft > 0}
                          onClick={() => handleLaunchSocioCampaign(camp.id)}
                          className="p-3 rounded-xl bg-[#0c1424] hover:bg-slate-800/80 disabled:opacity-45 border border-slate-800 hover:border-sky-500/40 text-left transition-colors cursor-pointer"
                        >
                          <span className="text-xs font-bold text-white block">{camp.title}</span>
                          <span className="text-[10px] text-slate-400 block">{camp.sub}</span>
                          <div className="mt-2 flex items-center justify-between text-[11px] font-mono tabular-nums">
                            <span className="text-emerald-400 font-bold">
                              ~+{estGain.toLocaleString('pt-BR')}
                            </span>
                            <span className="text-rose-300">{formatBrlCompact(estCost)}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 2. Bilheteria em 3 Setores & Simulador Matchday */}
          <div className="bg-[#0c1424] border border-slate-800/80 rounded-2xl p-5 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800/80">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-sky-400 shrink-0">
                  <Ticket className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-extrabold font-display text-white">
                    Bilheteria por Setor · {club.stadium.name} ({club.stadium.capacity.toLocaleString('pt-BR')} lugares)
                  </h2>
                  <p className="text-xs text-slate-400">
                    Demanda elástica realista: preços populares lotam o estádio e ampliam consumo no matchday; valores abusivos derrubam o público.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  type="button"
                  onClick={() => handleApplyTicketPreset('popular')}
                  className="px-2.5 py-1.5 rounded-lg bg-[#070c16] hover:bg-slate-800 border border-slate-800 text-[11px] font-bold text-emerald-300 cursor-pointer"
                >
                  Casa Cheia
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyTicketPreset('equilibrado')}
                  className="px-2.5 py-1.5 rounded-lg bg-[#070c16] hover:bg-slate-800 border border-slate-800 text-[11px] font-bold text-sky-300 cursor-pointer"
                >
                  Equilibrado
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyTicketPreset('premium')}
                  className="px-2.5 py-1.5 rounded-lg bg-[#070c16] hover:bg-slate-800 border border-slate-800 text-[11px] font-bold text-amber-300 cursor-pointer"
                >
                  Premium
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-5">
              {/* Sliders */}
              <div className="lg:col-span-6 bg-[#070c16] border border-slate-800 rounded-xl p-4 flex flex-col justify-between space-y-4">
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-semibold text-slate-300">Arquibancada Popular (52%)</span>
                      <span className="font-mono font-bold text-emerald-400 tabular-nums">
                        {formatCurrency(popularPrice)}
                      </span>
                    </div>
                    <input
                      type="range"
                      min={15}
                      max={90}
                      step={5}
                      value={popularPrice}
                      onChange={(e) => setPopularPrice(Number(e.target.value))}
                      className="w-full accent-emerald-400 cursor-pointer"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-semibold text-slate-300">Cadeiras Centrais (38%)</span>
                      <span className="font-mono font-bold text-sky-400 tabular-nums">
                        {formatCurrency(cadeiraPrice)}
                      </span>
                    </div>
                    <input
                      type="range"
                      min={25}
                      max={180}
                      step={5}
                      value={cadeiraPrice}
                      onChange={(e) => setCadeiraPrice(Number(e.target.value))}
                      className="w-full accent-sky-400 cursor-pointer"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-semibold text-slate-300">Camarote & Setor VIP (10%)</span>
                      <span className="font-mono font-bold text-amber-400 tabular-nums">
                        {formatCurrency(vipPrice)}
                      </span>
                    </div>
                    <input
                      type="range"
                      min={60}
                      max={450}
                      step={10}
                      value={vipPrice}
                      onChange={(e) => setVipPrice(Number(e.target.value))}
                      className="w-full accent-amber-400 cursor-pointer"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleSaveTicketPrices}
                  className="w-full py-2.5 rounded-xl bg-sky-400 hover:bg-sky-300 font-black text-xs text-slate-950 transition-colors cursor-pointer whitespace-nowrap shrink-0"
                >
                  Confirmar Preços dos Ingressos
                </button>
              </div>

              {/* Simulador de Jogo em Casa */}
              <div className="lg:col-span-6 bg-[#070c16] border border-slate-800 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                    Projeção por Jogo como Mandante
                  </span>
                  <span className="text-xs font-mono font-bold text-sky-400 tabular-nums">
                    {liveMatchEconPreview.occupancyPct}% de ocupação
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="bg-[#0c1424] border border-slate-800 rounded-lg p-3">
                    <span className="text-slate-400 block">Público Estimado</span>
                    <strong className="text-white font-mono text-sm tabular-nums block mt-0.5">
                      {liveMatchEconPreview.attendance.toLocaleString('pt-BR')} torcedores
                    </strong>
                    <span className="text-[10px] text-slate-500 tabular-nums">
                      {liveMatchEconPreview.socioAttendees.toLocaleString('pt-BR')} sócios ·{' '}
                      {liveMatchEconPreview.casualAttendees.toLocaleString('pt-BR')} avulsos
                    </span>
                  </div>

                  <div className="bg-[#0c1424] border border-slate-800 rounded-lg p-3">
                    <span className="text-slate-400 block">Ticket Médio Efetivo</span>
                    <strong className="text-sky-400 font-mono text-sm tabular-nums block mt-0.5">
                      {formatCurrency(liveMatchEconPreview.averageEffectiveTicket)}
                    </strong>
                    <span className="text-[10px] text-slate-500 tabular-nums">
                      Já considerando desconto de sócios
                    </span>
                  </div>
                </div>

                <div className="bg-[#0c1424] border border-slate-800 rounded-lg p-3 space-y-1.5 text-xs font-mono tabular-nums">
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-sans">Bilheteria Bruta (3 setores):</span>
                    <span className="text-slate-200">
                      {formatCurrency(liveMatchEconPreview.gateGrossRevenue)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-sans">
                      Consumo Matchday (Lojas & Bares):
                    </span>
                    <span className="text-emerald-300">
                      +{formatCurrency(liveMatchEconPreview.concessionRevenue)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-sans">
                      Custo Operacional da Arena:
                    </span>
                    <span className="text-rose-400">
                      -{formatCurrency(liveMatchEconPreview.homeMatchOpsCost)}
                    </span>
                  </div>
                  <div className="pt-1.5 mt-1.5 border-t border-slate-800 flex justify-between font-bold">
                    <span className="text-white font-sans">Lucro Líquido Estimado / Jogo:</span>
                    <span
                      className={
                        liveMatchEconPreview.netHomeMatchProfit >= 0
                          ? 'text-emerald-400'
                          : 'text-rose-400'
                      }
                    >
                      {liveMatchEconPreview.netHomeMatchProfit >= 0 ? '+' : ''}
                      {formatCurrency(liveMatchEconPreview.netHomeMatchProfit)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 3. Quadro das 4 Cotas de Patrocínio */}
          <div className="bg-[#0c1424] border border-slate-800/80 rounded-2xl p-5 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800/80">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0">
                  <Handshake className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-extrabold font-display text-white">
                    Patrocínios Ativos ({countActiveSponsors(club.sponsors)}/4 Cotas Preenchidas)
                  </h2>
                  <p className="text-xs text-slate-400">
                    Renda garantida por rodada: {formatCurrency(club.finances.weeklySponsor)} + bônus por vitória e gols marcados.
                  </p>
                </div>
              </div>

              {onNavigateToSponsors && (
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playClick();
                    onNavigateToSponsors();
                  }}
                  className="px-4 py-2 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-black text-xs transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  Negociar / Trocar Patrocinadores
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-4">
              {SPONSOR_SLOTS_ORDER.map((slot) => {
                const meta = SPONSOR_SLOTS_META[slot];
                const contract = club.sponsors?.[slot];
                return (
                  <div
                    key={slot}
                    className={`bg-[#070c16] border rounded-xl p-4 flex flex-col justify-between ${
                      contract ? 'border-slate-800' : 'border-dashed border-amber-500/35'
                    }`}
                  >
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                        {meta.shortTitle}
                      </span>
                      {contract ? (
                        <>
                          <strong className="text-sm font-bold text-white block mt-1 truncate">
                            {contract.companyName}
                          </strong>
                          <span className="text-[11px] text-slate-400 block">
                            {contract.sector} · {contract.roundsRemaining} rodadas restantes
                          </span>
                        </>
                      ) : (
                        <>
                          <strong className="text-sm font-bold text-amber-300 block mt-1">
                            Cota Disponível
                          </strong>
                          <span className="text-[11px] text-slate-400 block">
                            Receba luvas à vista ao assinar um novo parceiro.
                          </span>
                        </>
                      )}
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-slate-800 text-xs font-mono tabular-nums">
                      {contract ? (
                        <div className="flex justify-between">
                          <span className="text-slate-400 font-sans">Por rodada:</span>
                          <span className="text-cyan-400 font-bold">
                            +{formatCurrency(contract.perRoundAmount)}
                          </span>
                        </div>
                      ) : (
                        <span className="text-[11px] text-amber-400/80 font-sans">
                          Sem faturamento nesta cota
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: GASTOS, FOLHA SALARIAL & EMPRÉSTIMO BANCÁRIO */}
      {activeTab === 'expenses' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
            {/* Left 5 cols: Fixed Monthly Expenses Breakdown */}
            <div className="xl:col-span-5 bg-[#0c1424] border border-slate-800/80 rounded-2xl p-5 space-y-4">
              <div className="pb-3 border-b border-slate-800/80">
                <h2 className="text-base font-extrabold font-display text-white">
                  Compromissos Mensais do Clube
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Debitados automaticamente na virada de cada mês do calendário.
                </p>
              </div>

              <div className="space-y-2.5 text-xs">
                <div className="bg-[#070c16] border border-slate-800 rounded-xl p-3 flex items-center justify-between">
                  <div>
                    <span className="font-bold text-white block">Folha Salarial do Elenco</span>
                    <span className="text-[11px] text-slate-400">
                      {club.squad.length} atletas sob contrato ativo
                    </span>
                  </div>
                  <strong className="text-rose-400 font-mono tabular-nums text-sm">
                    -{formatCurrency(fixedFlow.monthlySquadWages)}
                  </strong>
                </div>

                <div className="bg-[#070c16] border border-slate-800 rounded-xl p-3 flex items-center justify-between">
                  <div>
                    <span className="font-bold text-white block">Comissão Técnica & Técnico</span>
                    <span className="text-[11px] text-slate-400">
                      {(club.coaches || []).length} auxiliares + técnico principal
                    </span>
                  </div>
                  <strong className="text-orange-400 font-mono tabular-nums text-sm">
                    -{formatCurrency(fixedFlow.monthlyCoachesAndManager)}
                  </strong>
                </div>

                <div className="bg-[#070c16] border border-slate-800 rounded-xl p-3 flex items-center justify-between">
                  <div>
                    <span className="font-bold text-white block">Departamento de Olheiros</span>
                    <span className="text-[11px] text-slate-400">
                      Folha mensal da equipe de captação
                    </span>
                  </div>
                  <strong className="text-amber-300 font-mono tabular-nums text-sm">
                    -{formatCurrency(fixedFlow.monthlyScouts)}
                  </strong>
                </div>

                <div className="bg-[#070c16] border border-slate-800 rounded-xl p-3 flex items-center justify-between">
                  <div>
                    <span className="font-bold text-white block">Manutenção de Estrutura</span>
                    <span className="text-[11px] text-slate-400 tabular-nums">
                      Arena Nv.{club.stadium.level} · CT Nv.{club.finances.trainingFacilityLevel} · DM Nv.{club.finances.medicalFacilityLevel} · Base Nv.{club.finances.youthAcademyLevel}
                    </span>
                  </div>
                  <strong className="text-violet-300 font-mono tabular-nums text-sm">
                    -{formatCurrency(fixedFlow.monthlyFacilityUpkeep)}
                  </strong>
                </div>

                {fixedFlow.monthlyBankLoanInstallment > 0 && (
                  <div className="bg-[#070c16] border border-amber-500/30 rounded-xl p-3 flex items-center justify-between">
                    <div>
                      <span className="font-bold text-amber-300 block">
                        Parcela Empréstimo Bancário
                      </span>
                      <span className="text-[11px] text-slate-400 tabular-nums">
                        {club.finances.bankLoan?.monthsRemaining} parcela(s) restante(s) · 2,1% a.m.
                      </span>
                    </div>
                    <strong className="text-amber-300 font-mono tabular-nums text-sm">
                      -{formatCurrency(fixedFlow.monthlyBankLoanInstallment)}
                    </strong>
                  </div>
                )}

                {fixedFlow.monthlyOverdraftInterest > 0 && (
                  <div className="bg-rose-950/30 border border-rose-500/40 rounded-xl p-3 flex items-center justify-between">
                    <div>
                      <span className="font-bold text-rose-300 block">
                        Juros do Cheque Especial
                      </span>
                      <span className="text-[11px] text-rose-200/75">
                        3,5% a.m. sobre caixa negativo
                      </span>
                    </div>
                    <strong className="text-rose-400 font-mono tabular-nums text-sm">
                      -{formatCurrency(fixedFlow.monthlyOverdraftInterest)}
                    </strong>
                  </div>
                )}

                <div className="bg-[#070c16] border border-slate-800 rounded-xl p-3 flex items-center justify-between">
                  <div>
                    <span className="font-bold text-slate-200 block">
                      Custo Médio de Viagem (Fora de Casa)
                    </span>
                    <span className="text-[11px] text-slate-400">
                      Voos, hotel e logística por jogo visitante
                    </span>
                  </div>
                  <strong className="text-slate-300 font-mono tabular-nums text-sm">
                    -{formatCurrency(liveMatchEconPreview.awayTravelCost)}/jogo
                  </strong>
                </div>
              </div>
            </div>

            {/* Right 7 cols: Top Earners Audit + Bank Loan Facility */}
            <div className="xl:col-span-7 space-y-6">
              {/* Auditoria de Salários */}
              <div className="bg-[#0c1424] border border-slate-800/80 rounded-2xl p-5">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
                  <div>
                    <h3 className="text-sm sm:text-base font-extrabold font-display text-white">
                      Maiores Salários do Elenco
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      Identifique contratos pesados para equilibrar o orçamento e liberar margem salarial.
                    </p>
                  </div>
                  <span className="text-xs font-mono font-bold text-rose-400 tabular-nums">
                    Total: {formatCurrency(fixedFlow.monthlySquadWages)}/mês
                  </span>
                </div>

                <div className="overflow-x-auto mt-3">
                  <table className="w-full text-xs text-left">
                    <thead>
                      <tr className="border-b border-slate-800 text-[11px] uppercase tracking-wider text-slate-400">
                        <th className="py-2 pr-3 font-semibold">Jogador</th>
                        <th className="py-2 px-2 font-semibold">Função</th>
                        <th className="py-2 px-2 font-semibold text-center">OVR</th>
                        <th className="py-2 px-2 font-semibold text-center">Contrato</th>
                        <th className="py-2 px-2 font-semibold text-right">Salário / Mês</th>
                        <th className="py-2 pl-2 font-semibold text-right">% Folha</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {topEarners.map((p) => {
                        const sharePct =
                          fixedFlow.monthlySquadWages > 0
                            ? ((p.wage / fixedFlow.monthlySquadWages) * 100).toFixed(1)
                            : '0.0';
                        return (
                          <tr key={p.id} className="hover:bg-slate-800/30">
                            <td className="py-2 pr-3 font-semibold text-white whitespace-nowrap">
                              {p.name}
                            </td>
                            <td className="py-2 px-2 text-slate-400">{p.detailedRole}</td>
                            <td className="py-2 px-2 text-center font-mono font-bold text-sky-400 tabular-nums">
                              {p.overall}
                            </td>
                            <td className="py-2 px-2 text-center font-mono text-slate-300 tabular-nums">
                              {p.contractYears || 1} ano(s)
                            </td>
                            <td className="py-2 px-2 text-right font-mono font-bold text-rose-300 tabular-nums whitespace-nowrap">
                              {formatCurrency(p.wage)}
                            </td>
                            <td className="py-2 pl-2 text-right font-mono text-slate-400 tabular-nums">
                              {sharePct}%
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Linha de Crédito Bancário */}
              <div className="bg-[#0c1424] border border-slate-800/80 rounded-2xl p-5">
                <div className="flex items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
                  <div className="flex items-center gap-2.5">
                    <Landmark className="w-5 h-5 text-amber-400 shrink-0" />
                    <div>
                      <h3 className="text-sm sm:text-base font-extrabold font-display text-white">
                        Tesouraria & Crédito Bancário (2,1% a.m.)
                      </h3>
                      <p className="text-[11px] text-slate-400">
                        Substitua o cheque especial caro (3,5% a.m.) ou antecipe capital para contratações e obras.
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-mono font-bold text-slate-300 tabular-nums">
                    Teto: {formatBrlCompact(bankLoanLimit)}
                  </span>
                </div>

                {club.finances.bankLoan && club.finances.bankLoan.principalRemaining > 0 ? (
                  <div className="mt-4 bg-[#070c16] border border-amber-500/30 rounded-xl p-4 space-y-4">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono tabular-nums">
                      <div>
                        <span className="text-slate-400 font-sans block">Saldo Devedor</span>
                        <strong className="text-amber-300 text-sm block mt-0.5">
                          {formatCurrency(club.finances.bankLoan.principalRemaining)}
                        </strong>
                      </div>
                      <div>
                        <span className="text-slate-400 font-sans block">Parcela Mensal</span>
                        <strong className="text-rose-400 text-sm block mt-0.5">
                          {formatCurrency(club.finances.bankLoan.monthlyInstallment)}
                        </strong>
                      </div>
                      <div>
                        <span className="text-slate-400 font-sans block">Restantes</span>
                        <strong className="text-white text-sm block mt-0.5">
                          {club.finances.bankLoan.monthsRemaining} mês(es)
                        </strong>
                      </div>
                      <div>
                        <span className="text-slate-400 font-sans block">Contratado em</span>
                        <strong className="text-slate-300 text-sm block mt-0.5">
                          {club.finances.bankLoan.takenDate}
                        </strong>
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={club.finances.balance < club.finances.bankLoan.principalRemaining}
                      onClick={handleRepayLoan}
                      className="w-full py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 disabled:opacity-40 font-black text-xs text-slate-950 transition-colors cursor-pointer"
                    >
                      Quitar Saldo Devedor Antecipadamente ({formatCurrency(club.finances.bankLoan.principalRemaining)})
                    </button>
                  </div>
                ) : (
                  <div className="mt-4 bg-[#070c16] border border-slate-800 rounded-xl p-4 space-y-4">
                    <div>
                      <div className="flex items-center justify-between text-xs mb-1.5">
                        <span className="font-semibold text-slate-300">Valor do Empréstimo</span>
                        <span className="font-mono font-bold text-amber-300 text-sm tabular-nums">
                          {formatCurrency(loanAmount)}
                        </span>
                      </div>
                      <input
                        type="range"
                        min={250_000}
                        max={bankLoanLimit}
                        step={250_000}
                        value={Math.min(bankLoanLimit, loanAmount)}
                        onChange={(e) => setLoanAmount(Number(e.target.value))}
                        className="w-full accent-amber-400 cursor-pointer"
                      />
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            soundEngine.playClick();
                            setLoanTerm(6);
                          }}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold border cursor-pointer ${
                            loanTerm === 6
                              ? 'bg-amber-400 text-slate-950 border-amber-400'
                              : 'bg-[#0c1424] text-slate-300 border-slate-800'
                          }`}
                        >
                          6 Parcelas
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            soundEngine.playClick();
                            setLoanTerm(12);
                          }}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold border cursor-pointer ${
                            loanTerm === 12
                              ? 'bg-amber-400 text-slate-950 border-amber-400'
                              : 'bg-[#0c1424] text-slate-300 border-slate-800'
                          }`}
                        >
                          12 Parcelas
                        </button>
                      </div>

                      <div className="text-xs font-mono tabular-nums text-right">
                        <span className="text-slate-400 font-sans block">
                          Parcela: <strong className="text-white">{formatCurrency(loanPreview.installment)}/mês</strong> · Juros totais:{' '}
                          <strong className="text-amber-300">{formatCurrency(loanPreview.totalInterest)}</strong>
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleContractLoan}
                      className="w-full py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 font-black text-xs text-slate-950 transition-colors cursor-pointer"
                    >
                      Contratar Crédito ({formatCurrency(loanAmount)} em {loanTerm}x)
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: EXTRATO BANCÁRIO CHRONOLÓGICO */}
      {activeTab === 'ledger' && (
        <div className="bg-[#0c1424] border border-slate-800/80 rounded-2xl p-5 sm:p-6 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-4 border-b border-slate-800/80">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-sky-400 shrink-0">
                <Receipt className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-extrabold font-display text-white">
                  Extrato Financeiro Detalhado
                </h2>
                <p className="text-xs text-slate-400">
                  Registro cronológico das últimas {Math.min(120, (club.finances.ledger || []).length)} movimentações em caixa.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={ledgerSearch}
                  onChange={(e) => setLedgerSearch(e.target.value)}
                  placeholder="Buscar lançamento..."
                  className="bg-[#070c16] border border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-sky-500"
                />
              </div>

              <select
                value={ledgerTypeFilter}
                onChange={(e) =>
                  setLedgerTypeFilter(e.target.value as 'ALL' | 'INCOME' | 'EXPENSE')
                }
                className="bg-[#070c16] border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-sky-500"
              >
                <option value="ALL">Todas as Operações</option>
                <option value="INCOME">Somente Entradas</option>
                <option value="EXPENSE">Somente Saídas</option>
              </select>

              <select
                value={ledgerCatFilter}
                onChange={(e) => setLedgerCatFilter(e.target.value as FinanceCategory | 'ALL')}
                className="bg-[#070c16] border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-sky-500"
              >
                <option value="ALL">Todas as Categorias</option>
                {[...INCOME_CATEGORIES_ORDER, ...EXPENSE_CATEGORIES_ORDER].map((cat) => (
                  <option key={cat} value={cat}>
                    {FINANCE_CATEGORY_META[cat].label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {filteredLedger.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400">
              Nenhum lançamento encontrado com os filtros atuais. Avance rodadas, dispute jogos ou negocie patrocínios para registrar movimentações.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-slate-800 text-[11px] uppercase tracking-wider text-slate-400">
                    <th className="py-2.5 pr-3 font-semibold">Data</th>
                    <th className="py-2.5 px-3 font-semibold">Categoria</th>
                    <th className="py-2.5 px-3 font-semibold">Descrição</th>
                    <th className="py-2.5 pl-3 font-semibold text-right">Valor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredLedger.map((entry) => {
                    const meta = FINANCE_CATEGORY_META[entry.category];
                    const isInc = entry.type === 'INCOME';
                    return (
                      <tr key={entry.id} className="hover:bg-slate-800/25">
                        <td className="py-2.5 pr-3 font-mono text-slate-400 tabular-nums whitespace-nowrap">
                          {entry.date}
                        </td>
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          <span
                            className="font-semibold text-[11px]"
                            style={{ color: meta?.accentColor || '#94a3b8' }}
                          >
                            {meta?.shortLabel || entry.category}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-slate-200">{entry.description}</td>
                        <td
                          className={`py-2.5 pl-3 text-right font-mono font-bold tabular-nums whitespace-nowrap ${
                            isInc ? 'text-emerald-400' : 'text-rose-400'
                          }`}
                        >
                          {isInc ? '+' : '-'}
                          {formatCurrency(entry.amount)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 5: ESTÁDIO, INSTALAÇÕES & PREMIAÇÕES OFICIAIS */}
      {activeTab === 'infrastructure' && (
        <div className="space-y-6">
          {/* Stadium Expansion */}
          <div className="bg-[#0c1424] border border-slate-800/80 rounded-2xl p-5 sm:p-6">
            <div className="flex items-center justify-between flex-wrap gap-2 mb-4 border-b border-slate-800/80 pb-3">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-sky-400" />
                <h2 className="text-base font-bold text-white">
                  Ampliação da Arena: {club.stadium.name} (
                  <span className="tabular-nums">
                    {club.stadium.capacity.toLocaleString('pt-BR')}
                  </span>{' '}
                  lugares · Nível {club.stadium.level}/5)
                </h2>
              </div>
              <span className="text-xs text-slate-400 tabular-nums">
                Custo mensal de manutenção:{' '}
                <strong className="text-slate-200 font-mono">
                  {formatCurrency(facilityUpkeep.stadiumUpkeep)}
                </strong>
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-[#070c16] rounded-xl border border-slate-800 flex items-center justify-between gap-3">
                <div>
                  <h4 className="text-xs font-bold text-white">+5.000 Cadeiras</h4>
                  <p className="text-[11px] text-slate-400 tabular-nums">
                    Capacidade passa para{' '}
                    {(club.stadium.capacity + 5000).toLocaleString('pt-BR')}
                  </p>
                  <span className="text-[11px] font-mono text-emerald-400 font-bold block mt-0.5 tabular-nums">
                    Investimento: {formatCurrency(infraCosts.stadiumPlus5k)}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleExpandStadium(5000, infraCosts.stadiumPlus5k)}
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-emerald-600 text-xs font-bold text-white border border-slate-700 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  Construir
                </button>
              </div>

              <div className="p-4 bg-[#070c16] rounded-xl border border-slate-800 flex items-center justify-between gap-3">
                <div>
                  <h4 className="text-xs font-bold text-white">
                    +10.000 Lugares (Nova Arquibancada)
                  </h4>
                  <p className="text-[11px] text-slate-400 tabular-nums">
                    Capacidade passa para{' '}
                    {(club.stadium.capacity + 10000).toLocaleString('pt-BR')}
                  </p>
                  <span className="text-[11px] font-mono text-emerald-400 font-bold block mt-0.5 tabular-nums">
                    Investimento: {formatCurrency(infraCosts.stadiumPlus10k)}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleExpandStadium(10000, infraCosts.stadiumPlus10k)}
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-emerald-600 text-xs font-bold text-white border border-slate-700 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  Construir
                </button>
              </div>
            </div>
          </div>

          {/* Facilities Upgrades */}
          <div className="bg-[#0c1424] border border-slate-800/80 rounded-2xl p-5 sm:p-6">
            <div className="flex items-center gap-2 mb-4 border-b border-slate-800/80 pb-3">
              <ShieldPlus className="w-5 h-5 text-sky-400" />
              <h2 className="text-base font-bold text-white">Instalações do Clube</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-[#070c16] border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-xs font-bold text-white">Centro de Treinamento (CT)</h4>
                    <span className="text-xs font-mono font-bold text-sky-400 tabular-nums">
                      Nível {club.finances.trainingFacilityLevel}/5
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mb-3">
                    Acelera a recuperação física entre jogos e potencializa a evolução técnica (manutenção{' '}
                    {formatBrlCompact(facilityUpkeep.trainingUpkeep)}/mês).
                  </p>
                </div>

                <button
                  type="button"
                  disabled={club.finances.trainingFacilityLevel >= 5}
                  onClick={() => handleUpgradeFacility('training', infraCosts.trainingUpgrade)}
                  className="w-full py-2 rounded-lg bg-sky-600 hover:bg-sky-500 disabled:opacity-40 text-white font-bold text-xs transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  {club.finances.trainingFacilityLevel >= 5
                    ? 'Nível Máximo'
                    : `Upgrade CT (${formatCurrency(infraCosts.trainingUpgrade)})`}
                </button>
              </div>

              <div className="bg-[#070c16] border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-xs font-bold text-white">Departamento Médico (DM)</h4>
                    <span className="text-xs font-mono font-bold text-rose-400 tabular-nums">
                      Nível {club.finances.medicalFacilityLevel}/5
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mb-3">
                    Reduz o tempo de recuperação de lesionados e previne traumas (manutenção{' '}
                    {formatBrlCompact(facilityUpkeep.medicalUpkeep)}/mês).
                  </p>
                </div>

                <button
                  type="button"
                  disabled={club.finances.medicalFacilityLevel >= 5}
                  onClick={() => handleUpgradeFacility('medical', infraCosts.medicalUpgrade)}
                  className="w-full py-2 rounded-lg bg-rose-600 hover:bg-rose-500 disabled:opacity-40 text-white font-bold text-xs transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  {club.finances.medicalFacilityLevel >= 5
                    ? 'Nível Máximo'
                    : `Upgrade DM (${formatCurrency(infraCosts.medicalUpgrade)})`}
                </button>
              </div>

              <div className="bg-[#070c16] border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-xs font-bold text-white">Categorias de Base</h4>
                    <span className="text-xs font-mono font-bold text-amber-400 tabular-nums">
                      Nível {club.finances.youthAcademyLevel}/5
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mb-3">
                    Gera jovens promessas com alto valor de venda futura (manutenção{' '}
                    {formatBrlCompact(facilityUpkeep.youthUpkeep)}/mês).
                  </p>
                </div>

                <button
                  type="button"
                  disabled={club.finances.youthAcademyLevel >= 5}
                  onClick={() => handleUpgradeFacility('youth', infraCosts.youthUpgrade)}
                  className="w-full py-2 rounded-lg bg-amber-600 hover:bg-amber-500 disabled:opacity-40 text-white font-bold text-xs transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  {club.finances.youthAcademyLevel >= 5
                    ? 'Nível Máximo'
                    : `Upgrade Base (${formatCurrency(infraCosts.youthUpgrade)})`}
                </button>
              </div>
            </div>
          </div>

          {/* Quadro Oficial de Premiações — Todas as Ligas e Copas (Participação + Posição) */}
          <div className="bg-[#0c1424] border border-amber-500/30 rounded-2xl p-5 sm:p-6 space-y-6">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                  <Trophy className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-extrabold font-display text-white">
                    Sistema Oficial de Premiações · Temporada{' '}
                    <span className="tabular-nums">{seasonYear}</span>
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Todas as ligas e copas pagam cota de participação + prêmio por posição no fim da temporada, incorporados integralmente ao orçamento da temporada seguinte.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 flex-wrap">
                {(
                  [
                    { id: 'all', label: 'Todas' },
                    { id: 'minha_liga', label: 'Minha Liga' },
                    { id: 'copas', label: 'Copas Continentais & Nacionais' },
                    { id: 'ligas', label: 'Ligas do Mundo' },
                  ] as const
                ).map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => {
                      soundEngine.playClick();
                      setSelectedPrizeFilter(f.id);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      selectedPrizeFilter === f.id
                        ? 'bg-amber-400 text-slate-950'
                        : 'text-slate-300 hover:text-white bg-[#070c16] border border-slate-800'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Comprovante de Premiações da Última Temporada Incorporadas ao Orçamento */}
            {club.finances.lastSeasonPrizeReport &&
              club.finances.lastSeasonPrizeReport.items.length > 0 && (
                <div className="rounded-xl border border-emerald-500/30 bg-[#070c16] overflow-hidden">
                  <div className="px-4 py-3.5 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <h3 className="text-sm font-bold text-emerald-300">
                        Último Repasse de Premiações Incorporado ao Orçamento ({club.finances.lastSeasonPrizeReport.seasonLabel})
                      </h3>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Pago no fechamento da temporada anterior e somado ao saldo inicial desta temporada.
                      </p>
                    </div>
                    <div className="text-left sm:text-right font-mono tabular-nums shrink-0">
                      <div className="text-base font-bold text-emerald-400">
                        +{formatMoney(club.finances.lastSeasonPrizeReport.totalSeasonEndAwarded)}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        Participação {formatBrlCompact(club.finances.lastSeasonPrizeReport.totalParticipationAwarded)} · Posição {formatBrlCompact(club.finances.lastSeasonPrizeReport.totalPositionAwarded)}
                      </div>
                    </div>
                  </div>
                  <div className="divide-y divide-slate-800/70 text-xs tabular-nums">
                    {club.finances.lastSeasonPrizeReport.items.map((item) => (
                      <div
                        key={`${item.competitionId}_${item.positionOrStageLabel}`}
                        className="px-4 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-1"
                      >
                        <div>
                          <span className="font-semibold text-white">{item.competitionName}</span>
                          <span className="text-slate-400"> · {item.positionOrStageLabel}</span>
                          <span className="text-slate-500">
                            {' '}
                            (Participação {formatBrlCompact(item.participationAmount)} + Posição{' '}
                            {formatBrlCompact(item.positionBonusAmount)})
                          </span>
                        </div>
                        <span className="font-mono font-bold text-emerald-400 shrink-0">
                          +{formatMoney(item.totalAmount)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            {/* Tabela Completa de Premiação da Liga Atual do Clube (1º ao último lugar) */}
            {(selectedPrizeFilter === 'all' || selectedPrizeFilter === 'minha_liga') && (
              <div className="bg-[#070c16] border border-slate-800/80 rounded-xl overflow-hidden">
                <div className="px-4 py-3.5 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-white">
                      Tabela Oficial da Sua Liga · {clubLeaguePrizePreview.leagueName} ({clubLeaguePrizePreview.country})
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Cota fixa de participação:{' '}
                      <strong className="text-sky-300 font-mono tabular-nums">
                        {formatMoney(clubLeaguePrizePreview.participationQuota)}
                      </strong>{' '}
                      para todos os clubes + bônus por colocação final (pago no encerramento e mantido no orçamento seguinte).
                    </p>
                  </div>
                  <div className="text-xs font-mono tabular-nums text-emerald-400 shrink-0">
                    1º: {formatBrlCompact(clubLeaguePrizePreview.championTotal)} · Último:{' '}
                    {formatBrlCompact(clubLeaguePrizePreview.lastPlaceTotal)}
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-900/70 text-slate-400 border-b border-slate-800">
                      <tr>
                        <th className="py-2 px-4 font-semibold">Posição</th>
                        <th className="py-2 px-4 font-semibold text-right">Participação</th>
                        <th className="py-2 px-4 font-semibold text-right">Mérito / Posição</th>
                        <th className="py-2 px-4 font-semibold text-right">Total ao Orçamento</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-mono tabular-nums">
                      {clubLeaguePrizePreview.rows.map((row) => (
                        <tr
                          key={row.position}
                          className={
                            row.position === 1
                              ? 'bg-amber-500/10 text-amber-200'
                              : row.position <= 4
                              ? 'bg-emerald-500/5 text-slate-200'
                              : 'text-slate-300 hover:bg-slate-900/40'
                          }
                        >
                          <td className="py-2 px-4 font-sans font-semibold">
                            {row.position}º lugar{row.position === 1 ? ' (Campeão)' : row.position === 2 ? ' (Vice)' : ''}
                          </td>
                          <td className="py-2 px-4 text-right text-slate-400">
                            {formatMoney(row.participation)}
                          </td>
                          <td className="py-2 px-4 text-right text-sky-300">
                            +{formatMoney(row.positionBonus)}
                          </td>
                          <td className="py-2 px-4 text-right font-bold text-emerald-400">
                            {formatMoney(row.total)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Copas Continentais, Mundiais, Nacionais e Ligas Globais */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {(selectedPrizeFilter === 'all' || selectedPrizeFilter === 'copas') && (
                <>
                  <div className="bg-[#070c16] border border-slate-800/80 rounded-xl p-4 space-y-2.5">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                      <h3 className="text-sm font-bold text-white">Copas Continentais UEFA</h3>
                      <span className="text-xs font-mono font-bold text-sky-300 tabular-nums">
                        Participação + Ranking 1º–36º
                      </span>
                    </div>
                    <div className="space-y-1.5 text-xs tabular-nums">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-slate-200 font-semibold">UEFA Champions League</span>
                        <strong className="text-emerald-400 font-mono">
                          Part. R$ 95M · Vitória R$ 11M · Título R$ 165M
                        </strong>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-slate-300">UEFA Europa League</span>
                        <strong className="text-emerald-400 font-mono">
                          Part. R$ 26M · Vitória R$ 2,8M · Título R$ 85M
                        </strong>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-slate-300">UEFA Conference League</span>
                        <strong className="text-emerald-400 font-mono">
                          Part. R$ 18M · Vitória R$ 2,2M · Título R$ 50M
                        </strong>
                      </div>
                    </div>
                  </div>

                  <div className="bg-[#070c16] border border-slate-800/80 rounded-xl p-4 space-y-2.5">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                      <h3 className="text-sm font-bold text-white">CONMEBOL & Mundiais FIFA</h3>
                      <span className="text-xs font-mono font-bold text-amber-300 tabular-nums">
                        Participação + Vitórias + Título
                      </span>
                    </div>
                    <div className="space-y-1.5 text-xs tabular-nums">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-slate-200 font-semibold">CONMEBOL Libertadores</span>
                        <strong className="text-emerald-400 font-mono">
                          Part. R$ 16,5M · Vitória R$ 1,8M · Título R$ 125M
                        </strong>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-slate-300">CONMEBOL Sul-Americana</span>
                        <strong className="text-emerald-400 font-mono">
                          Part. R$ 5,2M · Vitória R$ 650k · Título R$ 32M
                        </strong>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-slate-300">Super Mundial FIFA (32 Clubes)</span>
                        <strong className="text-emerald-400 font-mono">
                          Part. R$ 75M · Vitória R$ 10M · Título R$ 220M
                        </strong>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-slate-300">AFC Elite · Concacaf · Champions Int.</span>
                        <strong className="text-emerald-400 font-mono">
                          Part. R$ 4,5M–9M · Título até R$ 95M
                        </strong>
                      </div>
                    </div>
                  </div>

                  <div className="bg-[#070c16] border border-slate-800/80 rounded-xl p-4 space-y-2.5">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                      <h3 className="text-sm font-bold text-white">Copas do Brasil, Regionais & Estaduais</h3>
                      <span className="text-xs font-mono font-bold text-emerald-300 tabular-nums">
                        100% dos participantes pagos
                      </span>
                    </div>
                    <div className="space-y-1.5 text-xs tabular-nums">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-slate-200 font-semibold">Copa do Brasil</span>
                        <strong className="text-emerald-400 font-mono">
                          Part. R$ 800k–2,2M · Fases · Título R$ 77M
                        </strong>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-slate-300">Copa do Nordeste · Copa Verde</span>
                        <strong className="text-emerald-400 font-mono">
                          Part. R$ 1,6M / R$ 900k · Título até R$ 4,2M
                        </strong>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-slate-300">27 Estaduais (Todas as UFs)</span>
                        <strong className="text-emerald-400 font-mono">
                          Cota de participação + posição + título
                        </strong>
                      </div>
                    </div>
                  </div>

                  <div className="bg-[#070c16] border border-slate-800/80 rounded-xl p-4 space-y-2.5">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                      <h3 className="text-sm font-bold text-white">Copas Nacionais (Europa, América & Mundo)</h3>
                      <span className="text-xs font-mono font-bold text-cyan-300 tabular-nums">
                        Cota + Vitórias + Fases
                      </span>
                    </div>
                    <div className="space-y-1.5 text-xs tabular-nums">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-slate-200 font-semibold">FA Cup & Carabao Cup (ING)</span>
                        <strong className="text-emerald-400 font-mono">
                          Part. R$ 3,2M / 1,8M · Título R$ 65M / 25M
                        </strong>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-slate-300">Copa del Rey · DFB-Pokal · Coppa Italia</span>
                        <strong className="text-emerald-400 font-mono">
                          Part. ~8,5% · Bônus vitórias · Título R$ 50M–55M
                        </strong>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-slate-300">Copas Sul-Americanas & Mundiais (26 copas)</span>
                        <strong className="text-emerald-400 font-mono">
                          Participação + vitórias + fases até R$ 55M
                        </strong>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {(selectedPrizeFilter === 'all' || selectedPrizeFilter === 'ligas') && (
                <>
                  <div className="bg-[#070c16] border border-slate-800/80 rounded-xl p-4 space-y-2.5">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                      <h3 className="text-sm font-bold text-white">Brasileirão Séries A, B, C e D</h3>
                      <span className="text-xs font-mono font-bold text-emerald-300 tabular-nums">
                        Todos os clubes (1º ao último)
                      </span>
                    </div>
                    <div className="space-y-1.5 text-xs tabular-nums">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-emerald-300">Série A (20 clubes)</span>
                        <strong className="text-emerald-400 font-mono">
                          Part. R$ 10M + Posição (R$ 3,5M a R$ 50M)
                        </strong>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-slate-300">Série B (20 clubes)</span>
                        <strong className="text-emerald-400 font-mono">
                          Part. R$ 3,2M + Posição (R$ 400k a R$ 12M)
                        </strong>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-slate-300">Série C (20 clubes)</span>
                        <strong className="text-emerald-400 font-mono">
                          Part. R$ 1,2M + Posição (R$ 240k a R$ 4,5M)
                        </strong>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-slate-300">Série D (Todos os grupos)</span>
                        <strong className="text-emerald-400 font-mono">
                          Part. R$ 450k + Classificação + Acesso até R$ 3,2M
                        </strong>
                      </div>
                    </div>
                  </div>

                  <div className="bg-[#070c16] border border-slate-800/80 rounded-xl p-4 space-y-2.5">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                      <h3 className="text-sm font-bold text-white">Ligas Europeias, Sul-Americanas & Mundiais</h3>
                      <span className="text-xs font-mono font-bold text-sky-300 tabular-nums">
                        37 Ligas · 1º ao último lugar
                      </span>
                    </div>
                    <div className="space-y-1.5 text-xs tabular-nums">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-slate-200">Premier League · LaLiga · Bundesliga</span>
                        <strong className="text-emerald-400 font-mono">
                          Total 1º R$ 180M–229M · Último R$ 44M–55M
                        </strong>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-slate-300">Serie A · Ligue 1 · Portugal · Holanda · +13</span>
                        <strong className="text-emerald-400 font-mono">
                          Participação 24% + curva real de posição
                        </strong>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-slate-300">9 Ligas CONMEBOL · 8 Ligas Mundiais</span>
                        <strong className="text-emerald-400 font-mono">
                          Participação 20–22% + mérito por colocação
                        </strong>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 6: EXPANSÃO COMERCIAL & 8 NOVAS FONTES DE RECEITA */}
      {activeTab === 'commercial' && (
        <CommercialRevenueHub
          club={clubWithHistory}
          currentDate={currentDate}
          currentRound={currentRound}
          seasonYear={seasonYear}
          fanConfidence={fanConfidence}
          transferClauses={transferClauses}
          onUpdateClub={onUpdateFinancesAndStadium}
        />
      )}
    </div>
  );
};
