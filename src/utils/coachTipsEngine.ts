import { Club, Fixture, GameSave } from '../types/game';
import { getMatchRivalryInfo } from './rivalryEngine';
import { getTransferWindowStatus } from './transferWindowEngine';
import { countActiveSponsors } from './sponsorEngine';
import { inspectPreMatchReadiness } from './quickLineupEngine';

export type CoachTipTone = 'amber' | 'emerald' | 'sky' | 'rose' | 'indigo';

export type CoachTipIconKey =
  | 'flame'
  | 'youth'
  | 'market'
  | 'alert'
  | 'fitness'
  | 'card'
  | 'contract'
  | 'sponsor'
  | 'scout'
  | 'trophy'
  | 'wallet'
  | 'lightbulb';

export type CoachTipActionTarget =
  | 'squad'
  | 'tactics'
  | 'market'
  | 'market_free'
  | 'youth'
  | 'scouting'
  | 'training'
  | 'contracts'
  | 'sponsors'
  | 'finances'
  | 'board'
  | 'inbox'
  | 'play';

export interface CoachTipItem {
  id: string;
  tag: string;
  message: string;
  ctaLabel: string;
  actionTarget: CoachTipActionTarget;
  tone: CoachTipTone;
  icon: CoachTipIconKey;
  priority: number;
}

interface BuildCoachTipsInput {
  userClub: Club;
  gameState: GameSave;
  upcomingFixture?: Fixture | null;
  upcomingOpponent?: Club | null;
  userPosition?: number;
  classicFastMode?: boolean;
}

export function buildContextualCoachTips({
  userClub,
  gameState,
  upcomingFixture,
  upcomingOpponent,
  userPosition,
  classicFastMode = false,
}: BuildCoachTipsInput): CoachTipItem[] {
  const tips: CoachTipItem[] = [];

  const transferWindow = getTransferWindowStatus(gameState.currentDate);
  const rivalry = getMatchRivalryInfo(userClub, upcomingOpponent);
  const readiness = inspectPreMatchReadiness(userClub, upcomingFixture?.competition);
  const openSponsorSlots = Math.max(0, 4 - countActiveSponsors(userClub.sponsors));

  const pendingOffersCount = (gameState.transferOffers || []).filter(
    (o) => o.status === 'PENDING'
  ).length;
  const pendingJobOffersCount = (gameState.managerCareer?.jobOffers || []).filter(
    (o) => o.status === 'PENDING'
  ).length;

  const avgSquadOvr =
    userClub.squad.length > 0
      ? Math.round(
          userClub.squad.reduce((sum, p) => sum + p.overall, 0) / userClub.squad.length
        )
      : 68;

  // 1. Próximo jogo é um clássico
  if (rivalry && upcomingOpponent && upcomingFixture) {
    tips.push({
      id: `derby_${upcomingFixture.id}`,
      tag: 'Clássico',
      message: `Próximo jogo é um clássico (${rivalry.derbyName} vs ${upcomingOpponent.shortName}) — vitória rende bônus de moral e reputação.`,
      ctaLabel: 'Preparar Tática',
      actionTarget: 'tactics',
      tone: 'amber',
      icon: 'flame',
      priority: 100,
    });
  }

  // 2. Titulares indisponíveis (lesionados/suspensos)
  const unavailableStarters = [
    ...readiness.injuredStarters,
    ...readiness.suspendedStarters,
  ];
  if (unavailableStarters.length > 0) {
    const names = unavailableStarters
      .slice(0, 2)
      .map((p) => p.name.split(' ')[0])
      .join(', ');
    const extra =
      unavailableStarters.length > 2
        ? ` +${unavailableStarters.length - 2}`
        : '';
    tips.push({
      id: `unavailable_${unavailableStarters.map((p) => p.id).join('_')}`,
      tag: 'Escalação',
      message: `${unavailableStarters.length} titular(es) fora do próximo jogo (${names}${extra}) — ajuste o 11 inicial.`,
      ctaLabel: 'Ajustar Time',
      actionTarget: 'squad',
      tone: 'rose',
      icon: 'alert',
      priority: 96,
    });
  }

  // 3. Proposta de transferência pendente
  if (pendingOffersCount > 0) {
    tips.push({
      id: `transfer_offers_${pendingOffersCount}`,
      tag: 'Proposta',
      message: `Você tem ${pendingOffersCount} ${
        pendingOffersCount === 1
          ? 'proposta de transferência aguardando'
          : 'propostas de transferência aguardando'
      } resposta no mercado.`,
      ctaLabel: 'Responder',
      actionTarget: 'market',
      tone: 'amber',
      icon: 'market',
      priority: 92,
    });
  }

  // 4. Mercado aberto ou reta final da janela
  if (transferWindow.isOpen) {
    if (transferWindow.isDeadlineWeek) {
      tips.push({
        id: `window_deadline_${transferWindow.windowCode}`,
        tag: 'Mercado',
        message: `Últimos dias da janela! O mercado fecha em ${transferWindow.closesOnDisplay} — hora de fechar reforços.`,
        ctaLabel: 'Ir ao Mercado',
        actionTarget: 'market',
        tone: 'rose',
        icon: 'market',
        priority: 89,
      });
    } else {
      tips.push({
        id: `window_open_${transferWindow.windowCode}`,
        tag: 'Mercado',
        message: `O mercado de transferências abriu (${transferWindow.windowTitle}) — busque reforços, empréstimos ou jogadores livres.`,
        ctaLabel: 'Abrir Mercado',
        actionTarget: 'market',
        tone: 'emerald',
        icon: 'market',
        priority: 82,
      });
    }
  }

  // 5. Base com talentos prontos para subir (idade >= 16)
  const youthBoys = userClub.youthAcademy?.players || [];
  const readyYouthBoys = youthBoys
    .filter((boy) => {
      const p = boy.player;
      if (p.age < 16) return false;
      return (
        p.overall >= Math.max(54, avgSquadOvr - 11) ||
        boy.potentialTier === 'Joia da Base' ||
        boy.potentialTier === 'Grande Promessa'
      );
    })
    .sort((a, b) => b.player.overall - a.player.overall);

  if (readyYouthBoys.length > 0) {
    const top = readyYouthBoys[0];
    tips.push({
      id: `youth_ready_${top.id}`,
      tag: 'Base',
      message: `Sua base tem ${readyYouthBoys.length} ${
        readyYouthBoys.length === 1 ? 'talento pronto' : 'talentos prontos'
      } para subir — destaque para ${top.player.name} (${top.player.age}a, OVR ${top.player.overall}).`,
      ctaLabel: 'Ver Base',
      actionTarget: 'youth',
      tone: 'emerald',
      icon: 'youth',
      priority: 86,
    });
  } else if (youthBoys.length > 0 && !userClub.youthAcademy?.lastTrainingSessionDate) {
    tips.push({
      id: `youth_train_${youthBoys.length}`,
      tag: 'Base',
      message: `Você tem ${youthBoys.length} jovem(ns) na base aguardando sessão de treino para evoluir antes de subir.`,
      ctaLabel: 'Treinar Base',
      actionTarget: 'youth',
      tone: 'sky',
      icon: 'youth',
      priority: 62,
    });
  }

  // 6. Titulares cansados (<75% físico)
  if (readiness.tiredStarters75.length >= 2) {
    tips.push({
      id: `tired_starters_${readiness.tiredStarters75.length}`,
      tag: 'Físico',
      message: `${readiness.tiredStarters75.length} titulares estão desgastados (<75% físico) — poupe atletas para evitar lesões.`,
      ctaLabel: 'Rodar Elenco',
      actionTarget: 'squad',
      tone: 'amber',
      icon: 'fitness',
      priority: 84,
    });
  }

  // 7. Titulares pendurados (2 amarelos)
  if (readiness.penduradosStarters.length > 0) {
    const names = readiness.penduradosStarters
      .slice(0, 2)
      .map((p) => p.name.split(' ')[0])
      .join(', ');
    tips.push({
      id: `pendurados_${readiness.penduradosStarters.map((p) => p.id).join('_')}`,
      tag: 'Cartões',
      message: `${readiness.penduradosStarters.length} titular(es) pendurado(s) com 2 amarelos (${names}) — próximo cartão gera suspensão.`,
      ctaLabel: 'Ver Elenco',
      actionTarget: 'squad',
      tone: 'amber',
      icon: 'card',
      priority: 76,
    });
  }

  // 8. Contratos vencendo no último ano
  const expiringContractsCount = userClub.squad.filter(
    (p) => !p.isLoan && p.contractYears <= 1 && !p.retiringAtSeasonEnd && !p.preContractClubId
  ).length;

  if (expiringContractsCount > 0) {
    tips.push({
      id: `contracts_expiring_${expiringContractsCount}`,
      tag: 'Contratos',
      message: `${expiringContractsCount} jogador(es) no último ano de contrato — renove antes que saiam de graça.`,
      ctaLabel: 'Renovar',
      actionTarget: 'contracts',
      tone: 'amber',
      icon: 'contract',
      priority: 74,
    });
  }

  // 9. Relatórios de olheiros disponíveis
  const scoutProspectsCount = (gameState.scoutingNetwork?.prospects || []).filter(
    (p) => !p.isDismissed
  ).length;
  if (scoutProspectsCount > 0) {
    tips.push({
      id: `scout_prospects_${scoutProspectsCount}`,
      tag: 'Olheiros',
      message: `Seus olheiros encontraram ${scoutProspectsCount} promessa(s) mapeada(s) pronta(s) para avaliação.`,
      ctaLabel: 'Ver Olheiros',
      actionTarget: 'scouting',
      tone: 'indigo',
      icon: 'scout',
      priority: 70,
    });
  }

  // 10. Finanças no vermelho ou patrocínios abertos
  if (userClub.finances.balance < 0) {
    tips.push({
      id: 'finances_negative',
      tag: 'Finanças',
      message: `O caixa do clube está negativo — venda reservas, ajuste a folha ou feche novos patrocínios.`,
      ctaLabel: 'Ver Finanças',
      actionTarget: 'finances',
      tone: 'rose',
      icon: 'wallet',
      priority: 85,
    });
  } else if (!classicFastMode && openSponsorSlots > 0) {
    tips.push({
      id: `sponsors_open_${openSponsorSlots}`,
      tag: 'Patrocínio',
      message: `Você tem ${openSponsorSlots} cota(s) de patrocínio livre(s) — feche acordo para reforçar a receita por rodada.`,
      ctaLabel: 'Patrocínios',
      actionTarget: 'sponsors',
      tone: 'emerald',
      icon: 'sponsor',
      priority: 68,
    });
  }

  // 11. Proposta de emprego na diretoria
  if (pendingJobOffersCount > 0) {
    tips.push({
      id: `job_offers_${pendingJobOffersCount}`,
      tag: 'Carreira',
      message: `Outro clube fez proposta pelo seu trabalho como técnico — avalie o convite na Diretoria.`,
      ctaLabel: 'Ver Convite',
      actionTarget: 'board',
      tone: 'sky',
      icon: 'trophy',
      priority: 79,
    });
  }

  // 12. Contexto de tabela / fase da temporada
  if (userPosition === 1 && gameState.currentRound >= 3) {
    tips.push({
      id: `table_leader_r${gameState.currentRound}`,
      tag: 'Liderança',
      message: `Você lidera o campeonato! Gerencie o físico dos titulares para sustentar a ponta até o fim.`,
      ctaLabel: 'Ver Treinos',
      actionTarget: 'training',
      tone: 'emerald',
      icon: 'trophy',
      priority: 55,
    });
  } else if (
    (gameState.transferMarket || []).length > 0 &&
    tips.length < 2
  ) {
    tips.push({
      id: 'free_agents_available',
      tag: 'Oportunidade',
      message: `Há jogadores livres sem custo de transferência no mercado — ótimas opções para encorpar o elenco.`,
      ctaLabel: 'Ver Livres',
      actionTarget: 'market_free',
      tone: 'sky',
      icon: 'lightbulb',
      priority: 50,
    });
  }

  // Fallback so the bar always stays informative if club is 100% calm
  if (tips.length === 0) {
    tips.push({
      id: 'calm_week_tip',
      tag: 'CT em Dia',
      message: `Elenco saudável e finanças equilibradas — tudo pronto para focar no próximo confronto.`,
      ctaLabel: 'Ver Escalação',
      actionTarget: 'squad',
      tone: 'sky',
      icon: 'lightbulb',
      priority: 10,
    });
  }

  return tips.sort((a, b) => b.priority - a.priority).slice(0, 6);
}
