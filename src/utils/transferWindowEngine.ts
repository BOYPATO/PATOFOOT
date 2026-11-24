import {
  Club,
  GameSave,
  InboxMessage,
  MAX_SQUAD_SIZE,
  PendingTransferDeal,
  Player,
} from '../types/game';
import { daysBetween, getSeasonStartDate } from './calendarUtils';
import {
  computeDefaultReleaseClause,
  ensurePlayerContractFields,
} from './contractLifecycleEngine';

export { MAX_SQUAD_SIZE };

export function getClubProjectedSquadSize(
  club: Club,
  pendingTransfers: PendingTransferDeal[] = []
): number {
  let incoming = 0;
  let outgoing = 0;
  for (const deal of pendingTransfers) {
    if (deal.toClubId === club.id && deal.dealKind !== 'SWAP') {
      incoming += 1;
    }
    if (
      deal.fromClubId === club.id &&
      (deal.dealKind === 'SALE_OUT' || deal.dealKind === 'LOAN_OUT')
    ) {
      outgoing += 1;
    }
  }
  return Math.max(0, club.squad.length + incoming - outgoing);
}

export function canClubRegisterNewPlayer(
  club: Club,
  pendingTransfers: PendingTransferDeal[] = [],
  hasOutgoingSwap: boolean = false
): boolean {
  const projected = getClubProjectedSquadSize(club, pendingTransfers);
  if (hasOutgoingSwap) {
    return projected <= MAX_SQUAD_SIZE;
  }
  return projected < MAX_SQUAD_SIZE;
}

export interface TransferWindowStatus {
  isOpen: boolean;
  windowCode: 'JAN_FEB' | 'JUL_AUG' | 'CLOSED_MAR_JUN' | 'CLOSED_SEP_DEC';
  windowTitle: string;
  shortBadge: string;
  closesOnDate?: string; // YYYY-MM-DD when currently open
  closesOnDisplay?: string; // DD/MM/YYYY
  nextOpenDate: string; // YYYY-MM-DD (used as arrivalDate for pending transfers)
  nextOpenDisplay: string; // DD/MM/YYYY (human-facing presentation date)
  nextWindowLabel: string; // Ex: '01/07/2026 (Janela de Julho a Agosto)'
  daysUntilChange: number;
  isDeadlineWeek: boolean;
}

/**
 * Calcula o status oficial da Janela de Transferências para uma data YYYY-MM-DD (Calendário CBF):
 * - 1ª Janela ABERTA: 05/01 (01/01 internamente para abertura) até 03/03
 * - FECHADA: 04/03 até 19/07 -> reabre em 20/07 do mesmo ano
 * - 2ª Janela ABERTA: 20/07 até 11/09
 * - FECHADA: 12/09 até 31/12 -> reabre em Janeiro (05/01) do ano seguinte
 */
export function getTransferWindowStatus(dateStr?: string): TransferWindowStatus {
  const safeDate =
    dateStr && /^\d{4}-\d{2}-\d{2}$/.test(dateStr) ? dateStr : '2026-01-11';
  const [year, month, day] = safeDate.split('-').map(Number);

  // 1ª Janela: Janeiro até 03/03 (inclui 01/01..03/03 para abertura imediata dos estaduais)
  if (month === 1 || month === 2 || (month === 3 && day <= 3)) {
    const closesOnDate = `${year}-03-03`;
    const closesOnDisplay = `03/03/${year}`;
    const daysLeft = Math.max(0, daysBetween(safeDate, closesOnDate));
    const isDeadlineWeek =
      (month === 2 && day >= 25) || (month === 3 && day <= 3);

    return {
      isOpen: true,
      windowCode: 'JAN_FEB',
      windowTitle: '1ª Janela Aberta (Jan a 03/03)',
      shortBadge: '1ª Janela Aberta (até 03/03)',
      closesOnDate,
      closesOnDisplay,
      nextOpenDate: safeDate,
      nextOpenDisplay: 'Imediata',
      nextWindowLabel: 'Inscrição Imediata (1ª Janela Aberta)',
      daysUntilChange: daysLeft,
      isDeadlineWeek,
    };
  }

  // 2ª Janela: 20/07 até 11/09
  if ((month === 7 && day >= 20) || month === 8 || (month === 9 && day <= 11)) {
    const closesOnDate = `${year}-09-11`;
    const closesOnDisplay = `11/09/${year}`;
    const daysLeft = Math.max(0, daysBetween(safeDate, closesOnDate));
    const isDeadlineWeek = month === 9 && day >= 4 && day <= 11;

    return {
      isOpen: true,
      windowCode: 'JUL_AUG',
      windowTitle: '2ª Janela Aberta (20/07 a 11/09)',
      shortBadge: '2ª Janela Aberta (20/07–11/09)',
      closesOnDate,
      closesOnDisplay,
      nextOpenDate: safeDate,
      nextOpenDisplay: 'Imediata',
      nextWindowLabel: 'Inscrição Imediata (2ª Janela Aberta)',
      daysUntilChange: daysLeft,
      isDeadlineWeek,
    };
  }

  // Fechada: 04/03 até 19/07 (reabre em 20/07 do mesmo ano)
  if ((month === 3 && day >= 4) || (month >= 4 && month <= 6) || (month === 7 && day < 20)) {
    const nextOpenDate = `${year}-07-20`;
    const nextOpenDisplay = `20/07/${year}`;
    const daysUntil = Math.max(1, daysBetween(safeDate, nextOpenDate));

    return {
      isOpen: false,
      windowCode: 'CLOSED_MAR_JUN',
      windowTitle: 'Janela Fechada (Reabre em 20/07)',
      shortBadge: 'Janela Fechada · Abre 20/07',
      nextOpenDate,
      nextOpenDisplay,
      nextWindowLabel: `20/07/${year} (2ª Janela · 20/07 a 11/09)`,
      daysUntilChange: daysUntil,
      isDeadlineWeek: false,
    };
  }

  // Fechada: 12/09 até 31/12 (reabre em 05/01 do ano seguinte; apresentação na abertura da temporada)
  const nextYear = year + 1;
  const nextOpenDate = `${nextYear}-01-05`;
  const seasonOpenRefDate = getSeasonStartDate(nextYear);
  const nextOpenDisplay = `05/01/${nextYear}`;
  const daysUntil = Math.max(1, daysBetween(safeDate, seasonOpenRefDate));

  return {
    isOpen: false,
    windowCode: 'CLOSED_SEP_DEC',
    windowTitle: `Janela Fechada (Reabre em 05/01/${nextYear})`,
    shortBadge: `Janela Fechada · Abre 05/01/${nextYear}`,
    nextOpenDate,
    nextOpenDisplay,
    nextWindowLabel: `05/01/${nextYear} (1ª Janela · Jan a 03/03)`,
    daysUntilChange: daysUntil,
    isDeadlineWeek: false,
  };
}

export function isTransferWindowOpen(dateStr?: string): boolean {
  return getTransferWindowStatus(dateStr).isOpen;
}

export function findPendingTransferForPlayer(
  pendingTransfers: PendingTransferDeal[] | undefined,
  playerId: string
): PendingTransferDeal | undefined {
  if (!pendingTransfers || pendingTransfers.length === 0) return undefined;
  return pendingTransfers.find(
    (d) => d.playerId === playerId || d.swapOutPlayerId === playerId
  );
}

function rebalanceSquadAfterDeparture(squad: Player[]): Player[] {
  const startersCount = squad.filter((p) => p.isStarter).length;
  if (startersCount >= 11 || squad.length === 0) return squad;

  const needed = 11 - startersCount;
  const usedSlots = new Set(
    squad.filter((p) => p.isStarter && p.pitchSlot !== undefined).map((p) => p.pitchSlot as number)
  );
  const freeSlots: number[] = [];
  for (let s = 0; s < 11; s++) {
    if (!usedSlots.has(s)) freeSlots.push(s);
  }

  const healthyBench = [...squad]
    .filter((p) => !p.isStarter && p.injuryWeeks === 0 && !p.isSuspended)
    .sort((a, b) => b.overall - a.overall);
  const fallbackBench = [...squad]
    .filter((p) => !p.isStarter)
    .sort((a, b) => b.overall - a.overall);

  const promotedMap = new Map<string, number>();
  const pool = healthyBench.length >= needed ? healthyBench : fallbackBench;
  for (let i = 0; i < Math.min(needed, pool.length); i++) {
    promotedMap.set(pool[i].id, freeSlots[i] ?? i);
  }

  return squad.map((p) => {
    const assignedSlot = promotedMap.get(p.id);
    if (assignedSlot !== undefined) {
      return {
        ...p,
        isStarter: true,
        isSubstitute: false,
        pitchSlot: assignedSlot,
      };
    }
    return p;
  });
}

function formatDateBR(dateStr: string): string {
  if (!dateStr || !dateStr.includes('-')) return dateStr;
  const [y, m, d] = dateStr.split('-');
  return `${d}/${m}/${y}`;
}

/**
 * Processa mudanças de status da Janela de Transferências ao avançar datas ou virar a temporada,
 * emitindo comunicados oficiais na Caixa de Entrada e regularizando automaticamente todos os
 * jogadores já contratados/negociados (`pendingTransfers`) quando a janela abre!
 */
export function processTransferWindowTransitions(
  prevDate: string,
  state: GameSave,
  options?: { isNewSeasonTurn?: boolean }
): GameSave {
  const prevWin = getTransferWindowStatus(prevDate);
  const currWin = getTransferWindowStatus(state.currentDate);
  const newInbox: InboxMessage[] = [];

  // 1. Aviso de fechamento ou abertura de janela durante a temporada
  if (!options?.isNewSeasonTurn && prevDate !== state.currentDate) {
    if (prevWin.isOpen && !currWin.isOpen) {
      newInbox.push({
        id: `win_closed_${state.currentDate}_${Date.now()}`,
        title: `🔒 Janela de Transferências Encerrada`,
        message: `O período de registros foi encerrado hoje (${formatDateBR(
          state.currentDate
        )}). Você continua livre para negociar compras, empréstimos, trocas e atletas livres a qualquer momento, mas novos reforços só serão integrados ao elenco na reabertura da janela em ${
          currWin.nextOpenDisplay
        }.`,
        date: state.currentDate,
        round: state.currentRound,
        read: false,
        type: 'TRANSFER',
      });
    } else if (!prevWin.isOpen && currWin.isOpen) {
      newInbox.push({
        id: `win_opened_${state.currentDate}_${Date.now()}`,
        title: `🟢 ${currWin.windowTitle}!`,
        message: `O mercado de inscrições está oficialmente aberto até ${
          currWin.closesOnDisplay || 'o fim do bimestre'
        }! Contratações fechadas agora entram imediatamente no elenco, e eventuais acordos firmados fora da janela já podem ser regularizados no BID.`,
        date: state.currentDate,
        round: state.currentRound,
        read: false,
        type: 'TRANSFER',
      });
    }
  }

  // 2. Efetivar negócios engatilhados (`pendingTransfers`) se a janela estiver aberta
  const pendingList = state.pendingTransfers || [];
  if (!currWin.isOpen || pendingList.length === 0) {
    if (newInbox.length === 0) return state;
    return {
      ...state,
      inbox: [...newInbox, ...state.inbox],
    };
  }

  const dueDeals = pendingList.filter((d) => d.arrivalDate <= state.currentDate);
  const remainingDeals = pendingList.filter((d) => d.arrivalDate > state.currentDate);

  if (dueDeals.length === 0) {
    if (newInbox.length === 0) return state;
    return {
      ...state,
      inbox: [...newInbox, ...state.inbox],
    };
  }

  let clubs: Club[] = state.clubs.map((c) => ({ ...c, squad: [...c.squad] }));
  const arrivedUserNames: string[] = [];
  const departedUserNames: string[] = [];

  for (const deal of dueDeals) {
    const isIncomingToUser = deal.toClubId === state.userClubId;
    const isOutgoingFromUser = deal.fromClubId === state.userClubId;

    if (isIncomingToUser) {
      const userClubIdx = clubs.findIndex((c) => c.id === state.userClubId);
      if (userClubIdx < 0) continue;

      const fromClubIdx = deal.fromClubId
        ? clubs.findIndex((c) => c.id === deal.fromClubId)
        : -1;

      // Locate live player in seller club if still there, or fallback to snapshot
      let sourcePlayer: Player = deal.player;
      if (fromClubIdx >= 0) {
        const liveInSeller = clubs[fromClubIdx].squad.find((p) => p.id === deal.playerId);
        if (liveInSeller) {
          sourcePlayer = liveInSeller;
        }
        clubs[fromClubIdx] = {
          ...clubs[fromClubIdx],
          squad: rebalanceSquadAfterDeparture(
            clubs[fromClubIdx].squad.filter((p) => p.id !== deal.playerId)
          ),
        };
      } else if (options?.isNewSeasonTurn) {
        // Free agent / scouted player snapshot ages +1 across season turn
        sourcePlayer = {
          ...sourcePlayer,
          age: sourcePlayer.age + 1,
          condition: 100,
        };
      }

      // Handle swap-out player moving from userClub -> sellerClub simultaneously
      let currentUserSquad = clubs[userClubIdx].squad;
      if (deal.swapOutPlayerId && fromClubIdx >= 0) {
        const swapOut = currentUserSquad.find((p) => p.id === deal.swapOutPlayerId);
        if (swapOut) {
          currentUserSquad = rebalanceSquadAfterDeparture(
            currentUserSquad.filter((p) => p.id !== swapOut.id)
          );
          let sellerSquadBase = [...clubs[fromClubIdx].squad];
          while (sellerSquadBase.length >= MAX_SQUAD_SIZE) {
            const cut = [...sellerSquadBase]
              .filter((p) => !p.isStarter && !p.isLoan)
              .sort((a, b) => a.overall - b.overall)[0];
            if (!cut) break;
            sellerSquadBase = sellerSquadBase.filter((p) => p.id !== cut.id);
          }
          const sellerNextNum =
            Math.max(...sellerSquadBase.map((p) => p.squadNumber), 20) + 1;
          clubs[fromClubIdx] = {
            ...clubs[fromClubIdx],
            squad: [
              ...sellerSquadBase,
              {
                ...swapOut,
                isStarter: false,
                isSubstitute: true,
                pitchSlot: undefined,
                isListedForSale: false,
                isListedForLoan: false,
                squadNumber: sellerNextNum,
              },
            ].slice(0, MAX_SQUAD_SIZE),
          };
          departedUserNames.push(`${swapOut.name} (envolvido na troca c/ ${deal.fromClubName})`);
        }
      }

      // Avoid adding duplicate if somehow already in user squad
      if (!currentUserSquad.some((p) => p.id === sourcePlayer.id)) {
        const nextNum = Math.max(...currentUserSquad.map((p) => p.squadNumber), 20) + 1;
        let registeredPlayer: Player;

        if (deal.dealKind === 'LOAN_IN') {
          const durRounds = deal.loanDurationRounds || 19;
          const durMonths: 6 | 12 =
            deal.loanDurationMonths || (durRounds <= 20 ? 6 : 12);
          registeredPlayer = ensurePlayerContractFields({
            ...sourcePlayer,
            wage: deal.offeredWage,
            isStarter: false,
            isSubstitute: true,
            pitchSlot: undefined,
            isListedForSale: false,
            isListedForLoan: false,
            squadNumber: nextNum,
            isLoan: true,
            loanParentClubId: deal.fromClubId,
            loanCurrentClubId: state.userClubId,
            loanRoundsRemaining: durRounds,
            loanDurationMonths: durMonths,
            loanWageContributionPct: deal.loanWageSharePct ?? 50,
            loanOriginalWage: sourcePlayer.wage,
            loanBuyOptionFee: deal.loanBuyOptionFee,
            morale: 'Excelente',
          });
        } else {
          const years = Math.max(
            1,
            Math.min(
              5,
              deal.offeredContractYears || (deal.dealKind === 'RELEASE_CLAUSE' ? 4 : 3)
            )
          );
          registeredPlayer = ensurePlayerContractFields({
            ...sourcePlayer,
            wage: deal.offeredWage,
            contractYears: years,
            releaseClause: computeDefaultReleaseClause({
              ...sourcePlayer,
              wage: deal.offeredWage,
            }),
            preContractClubId: undefined,
            preContractClubName: undefined,
            preContractWage: undefined,
            preContractYears: undefined,
            isLoan: false,
            loanParentClubId: undefined,
            loanCurrentClubId: undefined,
            loanRoundsRemaining: undefined,
            loanDurationMonths: undefined,
            loanOriginalWage: undefined,
            isStarter: false,
            isSubstitute: true,
            pitchSlot: undefined,
            isListedForSale: false,
            isListedForLoan: false,
            squadNumber: nextNum,
            morale: 'Excelente',
          });
        }

        clubs[userClubIdx] = {
          ...clubs[userClubIdx],
          squad: [...currentUserSquad, registeredPlayer],
        };
        arrivedUserNames.push(
          `${registeredPlayer.name} (${registeredPlayer.detailedRole}, OVR ${registeredPlayer.overall}, ex-${deal.fromClubName})`
        );
      } else {
        clubs[userClubIdx] = {
          ...clubs[userClubIdx],
          squad: currentUserSquad,
        };
      }
    } else if (isOutgoingFromUser) {
      const userClubIdx = clubs.findIndex((c) => c.id === state.userClubId);
      const buyerClubIdx = clubs.findIndex((c) => c.id === deal.toClubId);
      if (userClubIdx < 0 || buyerClubIdx < 0) continue;

      const outPlayer = clubs[userClubIdx].squad.find((p) => p.id === deal.playerId);
      if (!outPlayer) continue;

      clubs[userClubIdx] = {
        ...clubs[userClubIdx],
        squad: rebalanceSquadAfterDeparture(
          clubs[userClubIdx].squad.filter((p) => p.id !== outPlayer.id)
        ),
      };

      let buyerBaseSquad = [...clubs[buyerClubIdx].squad];
      while (buyerBaseSquad.length >= MAX_SQUAD_SIZE) {
        const cut = [...buyerBaseSquad]
          .filter((p) => !p.isStarter && !p.isLoan)
          .sort((a, b) => a.overall - b.overall)[0];
        if (!cut) break;
        buyerBaseSquad = buyerBaseSquad.filter((p) => p.id !== cut.id);
      }

      const buyerNextNum =
        Math.max(...buyerBaseSquad.map((p) => p.squadNumber), 20) + 1;

      const movedPlayer: Player =
        deal.dealKind === 'LOAN_OUT'
          ? {
              ...outPlayer,
              isStarter: false,
              isSubstitute: true,
              pitchSlot: undefined,
              isListedForSale: false,
              isListedForLoan: false,
              isLoan: true,
              loanParentClubId: state.userClubId,
              loanCurrentClubId: deal.toClubId,
              loanRoundsRemaining: deal.loanDurationRounds || 19,
              loanDurationMonths:
                deal.loanDurationMonths ||
                ((deal.loanDurationRounds || 19) <= 20 ? 6 : 12),
              loanWageContributionPct: deal.loanWageSharePct ?? 70,
              loanOriginalWage: outPlayer.wage,
              loanBuyOptionFee: deal.loanBuyOptionFee,
              squadNumber: buyerNextNum,
            }
          : {
              ...outPlayer,
              wage: deal.offeredWage || outPlayer.wage,
              contractYears: 3,
              isStarter: false,
              isSubstitute: true,
              pitchSlot: undefined,
              isListedForSale: false,
              isListedForLoan: false,
              askingPrice: undefined,
              squadNumber: buyerNextNum,
            };

      clubs[buyerClubIdx] = {
        ...clubs[buyerClubIdx],
        squad: [...buyerBaseSquad, movedPlayer].slice(0, MAX_SQUAD_SIZE),
      };

      departedUserNames.push(
        `${outPlayer.name} (${deal.dealKind === 'LOAN_OUT' ? 'emprestado ao' : 'transferido ao'} ${deal.toClubName})`
      );
    }
  }

  if (arrivedUserNames.length > 0 || departedUserNames.length > 0) {
    const parts: string[] = [];
    if (arrivedUserNames.length > 0) {
      parts.push(
        `Reforços regularizados no BID e integrados ao elenco: ${arrivedUserNames.join(', ')}.`
      );
    }
    if (departedUserNames.length > 0) {
      parts.push(`Saídas concluídas na abertura da janela: ${departedUserNames.join(', ')}.`);
    }

    newInbox.unshift({
      id: `pending_tr_delivered_${state.currentDate}_${Date.now()}`,
      title:
        arrivedUserNames.length > 0
          ? `🛬 Apresentação Oficial na Abertura da Janela (${arrivedUserNames.length} reforço${
              arrivedUserNames.length > 1 ? 's' : ''
            })!`
          : `📤 Transferências Agendadas Efetivadas na Janela`,
      message: `${parts.join(
        ' '
      )} Os atletas recém-chegados já estão disponíveis na tela de Escalação!`,
      date: options?.isNewSeasonTurn ? formatDateBR(state.currentDate) : state.currentDate,
      round: state.currentRound,
      read: false,
      type: 'TRANSFER',
    });
  }

  return {
    ...state,
    clubs,
    pendingTransfers: remainingDeals,
    inbox: [...newInbox, ...state.inbox],
  };
}
