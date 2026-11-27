import {
  Club,
  GameSave,
  MAX_SQUAD_SIZE,
  Player,
  YouthAcademyBoy,
} from '../types/game';
import { getPlayerRenewalExpectations } from './contractLifecycleEngine';
import { getClubInfrastructureUpgradeCosts } from './clubEconomyScale';
import { getClubSeasonLoanCounts } from './loanEngine';
import { countActiveSponsors } from './sponsorEngine';
import { resolveClubLineupTacticalReport } from './tacticalPositioningEngine';
import { getTransferWindowStatus } from './transferWindowEngine';
import {
  getTryoutCost,
  getYouthUpgradeCost,
  MAX_YOUTH_ACADEMY_PLAYERS,
} from './youthAcademyEngine';

export type ManagementTipCategory =
  | 'CONTRATOS'
  | 'BASE'
  | 'FINANCAS'
  | 'ELENCO'
  | 'MERCADO';

export type ManagementTipPriority = 'URGENTE' | 'ATENCAO' | 'OPORTUNIDADE';

export type ManagementTipActionTarget =
  | 'contracts'
  | 'youth'
  | 'scouting'
  | 'finances'
  | 'sponsors'
  | 'squad'
  | 'tactics'
  | 'training'
  | 'market'
  | 'market_free'
  | 'market_bosman';

export interface ManagementTip {
  id: string;
  category: ManagementTipCategory;
  priority: ManagementTipPriority;
  title: string;
  summary: string;
  metricLabel: string;
  actionLabel: string;
  actionTarget: ManagementTipActionTarget;
  featuredPlayers?: Player[];
}

export interface ManagementTipsReport {
  tips: ManagementTip[];
  countsByCategory: Record<ManagementTipCategory, number>;
  urgentCount: number;
  attentionCount: number;
  opportunityCount: number;
  healthSummary: string;
}

export const MANAGEMENT_TIP_CATEGORY_LABELS: Record<ManagementTipCategory, string> = {
  CONTRATOS: 'Contratos',
  BASE: 'Base',
  FINANCAS: 'Finanças',
  ELENCO: 'Elenco',
  MERCADO: 'Mercado',
};

const PRIORITY_WEIGHT: Record<ManagementTipPriority, number> = {
  URGENTE: 0,
  ATENCAO: 1,
  OPORTUNIDADE: 2,
};

function formatCompactBrl(val: number): string {
  const abs = Math.abs(val);
  const sign = val < 0 ? '-' : '';
  if (abs >= 1_000_000) {
    return `${sign}R$ ${(abs / 1_000_000).toFixed(1).replace('.', ',')} mi`;
  }
  if (abs >= 1_000) {
    return `${sign}R$ ${Math.round(abs / 1_000)} mil`;
  }
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  }).format(val);
}

function joinNames(names: string[], max = 3): string {
  const sliced = names.slice(0, max);
  if (sliced.length === 0) return '';
  if (sliced.length === 1) return sliced[0];
  if (sliced.length === 2) return `${sliced[0]} e ${sliced[1]}`;
  return `${sliced.slice(0, -1).join(', ')} e ${sliced[sliced.length - 1]}`;
}

export function buildManagementTipsReport(
  gameState: GameSave,
  userClub: Club
): ManagementTipsReport {
  const tips: ManagementTip[] = [];
  const squad = userClub.squad || [];
  const avgSquadOvr =
    squad.length > 0
      ? Math.round(squad.reduce((sum, p) => sum + p.overall, 0) / squad.length)
      : 68;
  const monthlyPayroll = squad.reduce((sum, p) => sum + (p.wage || 0), 0);
  const balance = userClub.finances.balance;

  // ---------------------------------------------------------------------------
  // 1. CONTRATOS
  // ---------------------------------------------------------------------------
  const renewableExpiring = squad
    .filter(
      (p) =>
        !p.isLoan &&
        p.contractYears <= 1 &&
        !p.retiringAtSeasonEnd &&
        !p.preContractClubId
    )
    .sort((a, b) => {
      const starterDelta = Number(b.isStarter) - Number(a.isStarter);
      if (starterDelta !== 0) return starterDelta;
      return b.overall - a.overall;
    });

  const criticalExpiring = renewableExpiring.filter(
    (p) =>
      p.isStarter ||
      p.overall >= avgSquadOvr ||
      (p.age <= 24 && (p.potential || p.overall + 3) >= avgSquadOvr + 2)
  );

  if (criticalExpiring.length > 0) {
    const topPlayers = criticalExpiring.slice(0, 3);
    const totalEstimatedWageDelta = topPlayers.reduce((sum, p) => {
      const exp = getPlayerRenewalExpectations(p, userClub);
      return sum + Math.max(0, exp.desiredWage - p.wage);
    }, 0);

    tips.push({
      id: `contracts_critical_${criticalExpiring.length}`,
      category: 'CONTRATOS',
      priority: 'URGENTE',
      title: `${criticalExpiring.length} titular(es) ou destaque(s) no último ano de contrato`,
      summary: `${joinNames(
        topPlayers.map((p) => `${p.name} (${p.overall})`)
      )} podem assinar pré-contrato de graça com rivais se não renovarem antes da virada. Impacto salarial estimado dos principais ajustes: +${formatCompactBrl(
        totalEstimatedWageDelta
      )}/mês.`,
      metricLabel: `${renewableExpiring.length} vencendo · Risco de saída livre`,
      actionLabel: 'Renovar Contratos',
      actionTarget: 'contracts',
      featuredPlayers: topPlayers,
    });
  } else if (renewableExpiring.length > 0) {
    const topPlayers = renewableExpiring.slice(0, 3);
    tips.push({
      id: `contracts_depth_${renewableExpiring.length}`,
      category: 'CONTRATOS',
      priority: 'ATENCAO',
      title: `${renewableExpiring.length} contrato(s) do elenco expiram ao fim da temporada`,
      summary: `Atletas como ${joinNames(
        topPlayers.map((p) => p.name)
      )} estão no último ano de vínculo. Avalie quem merece renovação e quem pode ser negociado antes de perder valor de mercado.`,
      metricLabel: `${renewableExpiring.length} vínculo(s) em 1 ano`,
      actionLabel: 'Gerir Contratos',
      actionTarget: 'contracts',
      featuredPlayers: topPlayers,
    });
  }

  const retiringPlayers = squad
    .filter((p) => p.retiringAtSeasonEnd)
    .sort((a, b) => b.overall - a.overall);
  if (retiringPlayers.length > 0) {
    const featured = retiringPlayers.slice(0, 3);
    tips.push({
      id: `contracts_retiring_${retiringPlayers.length}`,
      category: 'CONTRATOS',
      priority: 'ATENCAO',
      title: `Planeje a reposição de ${retiringPlayers.length} veterano(s) em aposentadoria`,
      summary: `${joinNames(
        featured.map((p) => `${p.name} (${p.detailedRole}, ${p.age}a)`)
      )} encerram a carreira nesta temporada. Prepare um sucessor na base ou monitore o mercado sem custos.`,
      metricLabel: `${retiringPlayers.length} despedida(s) confirmada(s)`,
      actionLabel: 'Ver Sucessores',
      actionTarget: 'youth',
      featuredPlayers: featured,
    });
  }

  const preContractDepartures = squad
    .filter((p) => Boolean(p.preContractClubId))
    .sort((a, b) => b.overall - a.overall);
  if (preContractDepartures.length > 0) {
    const featured = preContractDepartures.slice(0, 3);
    tips.push({
      id: `contracts_pre_departures_${preContractDepartures.length}`,
      category: 'CONTRATOS',
      priority: 'ATENCAO',
      title: `${preContractDepartures.length} jogador(es) já acertaram saída por pré-contrato`,
      summary: `${joinNames(
        featured.map((p) => `${p.name} → ${p.preContractClubName || 'novo clube'}`)
      )} deixarão o elenco ao fim do vínculo. Antecipe reposições para não abrir lacunas no grupo.`,
      metricLabel: `${preContractDepartures.length} saída(s) programada(s)`,
      actionLabel: 'Buscar Reposições',
      actionTarget: 'market_bosman',
      featuredPlayers: featured,
    });
  }

  // ---------------------------------------------------------------------------
  // 2. CATEGORIAS DE BASE
  // ---------------------------------------------------------------------------
  const academy = userClub.youthAcademy;
  const academyPlayers: YouthAcademyBoy[] = academy?.players || [];
  const pendingTryoutCandidates = (academy?.lastTryoutCandidates || []).filter(
    (c) => !c.recruited && !c.dismissed
  );
  const promotableBoys = academyPlayers
    .filter(
      (b) =>
        b.player.age >= 17 ||
        b.player.overall >= Math.max(60, avgSquadOvr - 7) ||
        (b.player.potential || 0) >= 84
    )
    .sort(
      (a, b) =>
        b.player.overall - a.player.overall ||
        (b.player.potential || 0) - (a.player.potential || 0)
    );

  if (pendingTryoutCandidates.length > 0 && academyPlayers.length < MAX_YOUTH_ACADEMY_PLAYERS) {
    const bestCandidate = [...pendingTryoutCandidates].sort(
      (a, b) =>
        (b.player.potential || 0) - (a.player.potential || 0) ||
        b.player.overall - a.player.overall
    )[0];
    tips.push({
      id: `youth_pending_tryout_${pendingTryoutCandidates.length}`,
      category: 'BASE',
      priority: (bestCandidate?.player.potential || 0) >= 83 ? 'ATENCAO' : 'OPORTUNIDADE',
      title: `${pendingTryoutCandidates.length} garoto(s) da peneira aguardando avaliação`,
      summary: `Você tem vagas abertas na base (${academyPlayers.length}/${MAX_YOUTH_ACADEMY_PLAYERS}) e ${pendingTryoutCandidates.length} jovens observados na última seletiva${
        bestCandidate
          ? `, liderados por ${bestCandidate.player.name} (${bestCandidate.player.detailedRole}, POT ${bestCandidate.player.potential})`
          : ''
      }.`,
      metricLabel: `${academyPlayers.length}/${MAX_YOUTH_ACADEMY_PLAYERS} vagas na base`,
      actionLabel: 'Avaliar Peneira',
      actionTarget: 'youth',
    });
  }

  if (promotableBoys.length > 0 && squad.length < MAX_SQUAD_SIZE) {
    const topBoy = promotableBoys[0];
    const tightBudget = balance < monthlyPayroll * 1.5;
    tips.push({
      id: `youth_promote_${promotableBoys.length}`,
      category: 'BASE',
      priority: tightBudget ? 'ATENCAO' : 'OPORTUNIDADE',
      title: `${promotableBoys.length} promessa(s) pronta(s) para subir ao profissional`,
      summary: tightBudget
        ? `Com a folha apertada, promover ${topBoy.player.name} (${topBoy.player.detailedRole}, OVR ${topBoy.player.overall} · POT ${topBoy.player.potential}) garante profundidade a salário baixo e valorização rápida.`
        : `${topBoy.player.name} (${topBoy.player.detailedRole}, ${topBoy.player.age}a, OVR ${topBoy.player.overall} · POT ${topBoy.player.potential}) já tem nível para ganhar minutos no elenco principal.`,
      metricLabel: `${promotableBoys.length} pronto(s) p/ subir`,
      actionLabel: 'Promover na Base',
      actionTarget: 'youth',
    });
  } else if (academyPlayers.length >= 4 && squad.length >= MAX_SQUAD_SIZE) {
    tips.push({
      id: 'youth_blocked_by_squad_cap',
      category: 'BASE',
      priority: 'ATENCAO',
      title: `Elenco no limite (${MAX_SQUAD_SIZE}/${MAX_SQUAD_SIZE}) trava promoções da base`,
      summary: `Há ${academyPlayers.length} jovens no CT aguardando espaço, mas o elenco profissional atingiu o teto de ${MAX_SQUAD_SIZE} atletas. Negocie ou empreste excedentes para abrir vaga.`,
      metricLabel: `${squad.length}/${MAX_SQUAD_SIZE} atletas · Base bloqueada`,
      actionLabel: 'Liberar Vagas no Elenco',
      actionTarget: 'squad',
    });
  } else if (academyPlayers.length <= 3) {
    const tryoutCost = getTryoutCost(userClub, 'COMUNITARIA');
    const canAfford = balance >= tryoutCost;
    tips.push({
      id: `youth_low_stock_${academyPlayers.length}`,
      category: 'BASE',
      priority: 'OPORTUNIDADE',
      title: `Base com ${MAX_YOUTH_ACADEMY_PLAYERS - academyPlayers.length} vagas abertas para novos talentos`,
      summary: canAfford
        ? `Sua academia tem apenas ${academyPlayers.length}/${MAX_YOUTH_ACADEMY_PLAYERS} garotos. Uma Peneira Comunitária custa ${formatCompactBrl(
            tryoutCost
          )} e ajuda a revelar ativos baratos para o clube.`
        : `Sua academia tem apenas ${academyPlayers.length}/${MAX_YOUTH_ACADEMY_PLAYERS} garotos. Assim que reforçar o caixa (${formatCompactBrl(
            tryoutCost
          )}), agende uma nova peneira.`,
      metricLabel: `${academyPlayers.length}/${MAX_YOUTH_ACADEMY_PLAYERS} ocupadas`,
      actionLabel: 'Abrir Categorias de Base',
      actionTarget: 'youth',
    });
  }

  const youthLevel = userClub.finances.youthAcademyLevel || 1;
  const youthUpgradeCost = getYouthUpgradeCost(youthLevel, userClub);
  if (youthLevel < 5 && balance >= youthUpgradeCost * 1.45) {
    tips.push({
      id: `youth_upgrade_lvl_${youthLevel}`,
      category: 'BASE',
      priority: 'OPORTUNIDADE',
      title: `Caixa permite evoluir a Base para o Nível ${youthLevel + 1}/5`,
      summary: `Investir ${formatCompactBrl(
        youthUpgradeCost
      )} nas categorias de base aumenta o teto de potencial e a qualidade inicial das futuras peneiras.`,
      metricLabel: `Base Nv.${youthLevel}/5 · Saldo folgado`,
      actionLabel: 'Melhorar Estrutura',
      actionTarget: 'finances',
    });
  }

  // ---------------------------------------------------------------------------
  // 3. FINANÇAS & PATROCÍNIO
  // ---------------------------------------------------------------------------
  const activeSponsorsCount = countActiveSponsors(userClub.sponsors);
  const openSponsorSlots = Math.max(0, 4 - activeSponsorsCount);
  const infraCosts = getClubInfrastructureUpgradeCosts(userClub);

  if (balance < 0 || userClub.finances.activePunishment) {
    tips.push({
      id: 'finance_red_alert',
      category: 'FINANCAS',
      priority: 'URGENTE',
      title:
        balance < 0
          ? `Caixa negativo em ${formatCompactBrl(balance)} ameaça o Fair Play`
          : 'Clube sob restrição de Fair Play Financeiro',
      summary: `Com folha mensal de ${formatCompactBrl(
        monthlyPayroll
      )}, priorize fechar patrocínios, vender atletas fora dos planos ou reduzir custos antes da auditoria de fim de temporada.`,
      metricLabel: balance < 0 ? `Déficit ${formatCompactBrl(balance)}` : 'Alerta FFP ativo',
      actionLabel: 'Revisar Finanças',
      actionTarget: 'finances',
    });
  } else if (monthlyPayroll > 0 && balance < monthlyPayroll * 1.35) {
    tips.push({
      id: 'finance_thin_reserve',
      category: 'FINANCAS',
      priority: 'ATENCAO',
      title: 'Reserva em caixa cobre menos de 2 meses de folha salarial',
      summary: `O saldo atual (${formatCompactBrl(
        balance
      )}) está próximo da folha de ${formatCompactBrl(
        monthlyPayroll
      )}/mês. Evite gastos altos até ampliar receitas com bilheteria ou patrocínios.`,
      metricLabel: `${formatCompactBrl(balance)} em caixa`,
      actionLabel: 'Controlar Orçamento',
      actionTarget: 'finances',
    });
  }

  if (openSponsorSlots > 0) {
    tips.push({
      id: `finance_sponsors_${openSponsorSlots}`,
      category: 'FINANCAS',
      priority: openSponsorSlots >= 2 || balance < monthlyPayroll * 1.5 ? 'URGENTE' : 'ATENCAO',
      title: `${openSponsorSlots} cota(s) de patrocínio disponível(is) para assinatura`,
      summary: `O uniforme ainda tem ${openSponsorSlots} espaço(s) sem parceiro comercial. Fechar novos contratos garante luvas imediatas e renda extra por rodada.`,
      metricLabel: `${activeSponsorsCount}/4 cotas preenchidas`,
      actionLabel: 'Assinar Patrocínios',
      actionTarget: 'sponsors',
    });
  }

  if (
    balance >= infraCosts.trainingUpgrade * 1.7 &&
    (userClub.finances.trainingFacilityLevel < 5 || userClub.stadium.level < 5)
  ) {
    const canUpgradeCt = userClub.finances.trainingFacilityLevel < 5;
    tips.push({
      id: 'finance_infra_surplus',
      category: 'FINANCAS',
      priority: 'OPORTUNIDADE',
      title: canUpgradeCt
        ? `Superávit permite evoluir o CT para o Nível ${
            userClub.finances.trainingFacilityLevel + 1
          }/5`
        : `Superávit permite ampliar a Arena (Nível ${userClub.stadium.level}/5)`,
      summary: canUpgradeCt
        ? `Com ${formatCompactBrl(
            balance
          )} disponíveis, investir ${formatCompactBrl(
            infraCosts.trainingUpgrade
          )} no Centro de Treinamento acelera a evolução e a recuperação do elenco.`
        : `Seu caixa comporta ampliar a capacidade do estádio para gerar maior bilheteria fixa em jogos em casa.`,
      metricLabel: `CT Nv.${userClub.finances.trainingFacilityLevel} · Arena Nv.${userClub.stadium.level}`,
      actionLabel: 'Ir para Estádio & CT',
      actionTarget: 'finances',
    });
  }

  // ---------------------------------------------------------------------------
  // 4. GESTÃO DO ELENCO & PREPARAÇÃO
  // ---------------------------------------------------------------------------
  const tacticalReport = resolveClubLineupTacticalReport(userClub);
  if (tacticalReport.wrongPositionCount > 0) {
    const outPlayers = tacticalReport.outOfPositionAssignments
      .map((a) => a.player)
      .slice(0, 3);
    tips.push({
      id: `squad_wrong_positions_${tacticalReport.wrongPositionCount}_${tacticalReport.totalPenaltyPoints}`,
      category: 'ELENCO',
      priority: tacticalReport.totalPenaltyPoints >= 5 ? 'URGENTE' : 'ATENCAO',
      title: `${tacticalReport.wrongPositionCount} titular(es) improvisado(s) perdendo rendimento`,
      summary: `${joinNames(
        outPlayers.map((p) => p.name)
      )} estão atuando fora da função ideal na escalação atual (-${tacticalReport.totalPenaltyPoints} pts somados de Over efetivo). Ajuste o esquema ou posicione substitutos naturais.`,
      metricLabel: `-${tacticalReport.totalPenaltyPoints} OVR tático`,
      actionLabel: 'Ajustar Escalação',
      actionTarget: 'tactics',
      featuredPlayers: outPlayers,
    });
  }

  const tiredStarters = squad
    .filter((p) => p.isStarter && p.injuryWeeks === 0 && p.condition < 68)
    .sort((a, b) => a.condition - b.condition);
  const injuredCount = squad.filter((p) => p.injuryWeeks > 0).length;
  if (tiredStarters.length >= 2 || injuredCount >= 3) {
    const featured = tiredStarters.slice(0, 3);
    tips.push({
      id: `squad_fatigue_${tiredStarters.length}_${injuredCount}`,
      category: 'ELENCO',
      priority: tiredStarters.length >= 4 || injuredCount >= 4 ? 'URGENTE' : 'ATENCAO',
      title:
        tiredStarters.length >= 2
          ? `${tiredStarters.length} titular(es) com desgaste físico elevado`
          : `${injuredCount} atleta(s) no Departamento Médico`,
      summary:
        tiredStarters.length >= 2
          ? `${joinNames(
              featured.map((p) => `${p.name} (${Math.round(p.condition)}%)`)
            )} estão abaixo de 68% de condição física. Considere poupar na próxima rodada ou aliviar o treino.`
          : `O DM soma ${injuredCount} baixas simultâneas. Utilize o rodízio do banco e promova jovens ou reservas para preservar o time titular.`,
      metricLabel:
        tiredStarters.length >= 2
          ? `${tiredStarters.length} titulares cansados`
          : `${injuredCount} lesionado(s)`,
      actionLabel: 'Treino & Recuperação',
      actionTarget: 'training',
      featuredPlayers: featured,
    });
  }

  if (squad.length <= 18) {
    tips.push({
      id: `squad_short_${squad.length}`,
      category: 'ELENCO',
      priority: 'URGENTE',
      title: `Elenco curto (${squad.length} atletas) aumenta risco na temporada`,
      summary: `Com menos de 19 jogadores inscritos, suspensões e lesões podem deixar o banco desfalcado. Busque agentes livres ou garotos da base.`,
      metricLabel: `${squad.length}/${MAX_SQUAD_SIZE} inscritos`,
      actionLabel: 'Ver Agentes Livres',
      actionTarget: 'market_free',
    });
  }

  const lowMoralePlayers = squad.filter(
    (p) => p.morale === 'Baixa' || p.morale === 'Péssima'
  );
  if (lowMoralePlayers.length >= 3) {
    const featured = [...lowMoralePlayers]
      .sort((a, b) => b.overall - a.overall)
      .slice(0, 3);
    tips.push({
      id: `squad_morale_${lowMoralePlayers.length}`,
      category: 'ELENCO',
      priority: 'ATENCAO',
      title: `${lowMoralePlayers.length} jogador(es) com moral baixa no vestiário`,
      summary: `Atletas como ${joinNames(
        featured.map((p) => p.name)
      )} perderam confiança recentemente. Dar minutos em campo ou resolver demandas contratuais ajuda a recuperar o ambiente.`,
      metricLabel: `${lowMoralePlayers.length} insatisfeito(s)`,
      actionLabel: 'Analisar Elenco',
      actionTarget: 'squad',
      featuredPlayers: featured,
    });
  }

  // ---------------------------------------------------------------------------
  // 5. MERCADO & EMPRÉSTIMOS
  // ---------------------------------------------------------------------------
  const pendingOffers = (gameState.transferOffers || []).filter(
    (o) => o.status === 'PENDING'
  );
  if (pendingOffers.length > 0) {
    const offeredPlayers = pendingOffers
      .map((o) => squad.find((p) => p.id === o.playerId))
      .filter((p): p is Player => Boolean(p))
      .slice(0, 3);

    tips.push({
      id: `market_pending_offers_${pendingOffers.length}`,
      category: 'MERCADO',
      priority: 'URGENTE',
      title: `${pendingOffers.length} proposta(s) oficial(is) aguardando decisão`,
      summary:
        offeredPlayers.length > 0
          ? `Outros clubes fizeram oferta por ${joinNames(
              offeredPlayers.map((p) => p.name)
            )}. Aceite, faça contraproposta ou recuse antes que a negociação esfrie.`
          : `Existem ${pendingOffers.length} propostas em aberto no mercado esperando sua resposta oficial.`,
      metricLabel: `${pendingOffers.length} oferta(s) pendente(s)`,
      actionLabel: 'Abrir Mercado',
      actionTarget: 'market',
      featuredPlayers: offeredPlayers,
    });
  }

  const windowStatus = getTransferWindowStatus(gameState.currentDate, userClub);
  const loanCounts = getClubSeasonLoanCounts({
    club: userClub,
    transferHistory: gameState.transferHistory,
    currentSeasonYear: gameState.currentSeasonYear,
    saSeasonYear: gameState.saSeasonYear,
    europeSeasonYear: gameState.europeSeasonYear,
  });

  if (windowStatus.isOpen && windowStatus.isDeadlineWeek) {
    tips.push({
      id: `market_deadline_${windowStatus.windowCode}`,
      category: 'MERCADO',
      priority: 'URGENTE',
      title: `Reta final da janela de transferências (fecha em ${windowStatus.closesOnDisplay})`,
      summary: `Restam ${windowStatus.daysUntilChange} dia(s) para inscrever reforços imediatamente. Você ainda tem ${loanCounts.remainingLoansIn}/${loanCounts.maxLoansIn} vaga(s) de empréstimo na temporada.`,
      metricLabel: `Fecha ${windowStatus.closesOnDisplay}`,
      actionLabel: 'Explorar Mercado',
      actionTarget: 'market',
    });
  }

  const youngReservesToLoan = squad
    .filter(
      (p) =>
        !p.isStarter &&
        !p.isLoan &&
        p.age <= 22 &&
        p.injuryWeeks === 0 &&
        p.overall < avgSquadOvr
    )
    .sort((a, b) => (b.potential || b.overall) - (a.potential || a.overall));

  if (
    squad.length >= 25 &&
    loanCounts.remainingLoansOut > 0 &&
    youngReservesToLoan.length >= 2
  ) {
    const featured = youngReservesToLoan.slice(0, 3);
    tips.push({
      id: `market_loan_out_${youngReservesToLoan.length}`,
      category: 'MERCADO',
      priority: 'OPORTUNIDADE',
      title: `Empreste jovens reservas para dar rodagem e aliviar a folha`,
      summary: `${joinNames(
        featured.map((p) => `${p.name} (${p.age}a)`)
      )} têm pouco espaço no time principal. Você ainda pode emprestar até ${loanCounts.remainingLoansOut} atleta(s) nesta temporada.`,
      metricLabel: `${loanCounts.remainingLoansOut}/${loanCounts.maxLoansOut} empréstimos livres`,
      actionLabel: 'Gerir no Elenco',
      actionTarget: 'squad',
      featuredPlayers: featured,
    });
  }

  const buyOptionLoans = squad.filter(
    (p) => p.isLoan && (p.loanBuyOptionFee || 0) > 0 && balance >= (p.loanBuyOptionFee || 0) * 1.15
  );
  if (buyOptionLoans.length > 0) {
    const target = buyOptionLoans[0];
    tips.push({
      id: `market_loan_buy_${target.id}`,
      category: 'MERCADO',
      priority: 'OPORTUNIDADE',
      title: `Opção de compra acessível por ${target.name}`,
      summary: `O atleta emprestado (${target.detailedRole}, OVR ${target.overall}) possui cláusula de compra fixada em ${formatCompactBrl(
        target.loanBuyOptionFee || 0
      )} e cabe no caixa atual do clube.`,
      metricLabel: `Compra: ${formatCompactBrl(target.loanBuyOptionFee || 0)}`,
      actionLabel: 'Avaliar no Elenco',
      actionTarget: 'squad',
      featuredPlayers: [target],
    });
  }

  if (!windowStatus.isOpen && squad.length < MAX_SQUAD_SIZE && pendingOffers.length === 0) {
    tips.push({
      id: `market_bosman_planning_${windowStatus.windowCode}`,
      category: 'MERCADO',
      priority: 'OPORTUNIDADE',
      title: 'Janela fechada: aproveite pré-contratos (Bosman) e agentes livres',
      summary: `A janela só reabre em ${windowStatus.nextOpenDisplay}, mas já é possível fechar pré-contratos sem custo de transferência ou contratar jogadores sem clube.`,
      metricLabel: `Reabre em ${windowStatus.nextOpenDisplay}`,
      actionLabel: 'Ver Pré-Contratos',
      actionTarget: 'market_bosman',
    });
  }

  // ---------------------------------------------------------------------------
  // Fallback construtivo caso o clube esteja com tudo sob controle
  // ---------------------------------------------------------------------------
  if (tips.length < 2) {
    const activeScoutingMissions = (gameState.scoutingNetwork?.missions || []).filter(
      (m) => m.status === 'ACTIVE'
    ).length;

    if (activeScoutingMissions === 0) {
      tips.push({
        id: 'proactive_scouting_idle',
        category: 'MERCADO',
        priority: 'OPORTUNIDADE',
        title: 'Rede de olheiros disponível para mapear reforços',
        summary:
          'Nenhuma missão de observação está em andamento. Envie seus olheiros para descobrir promessas abaixo do valor de mercado antes dos rivais.',
        metricLabel: 'Olheiros livres',
        actionLabel: 'Enviar Olheiro',
        actionTarget: 'scouting',
      });
    }

    tips.push({
      id: 'proactive_contracts_shield',
      category: 'CONTRATOS',
      priority: 'OPORTUNIDADE',
      title: 'Gestão em dia: blinde suas principais peças',
      summary:
        'As finanças e contratos imediatos estão equilibrados. Revise as multas rescisórias de jovens valorizados para evitar investidas surpresa.',
      metricLabel: 'Clube equilibrado',
      actionLabel: 'Revisar Contratos',
      actionTarget: 'contracts',
    });
  }

  tips.sort((a, b) => PRIORITY_WEIGHT[a.priority] - PRIORITY_WEIGHT[b.priority]);

  const cappedTips = tips.slice(0, 10);

  const countsByCategory: Record<ManagementTipCategory, number> = {
    CONTRATOS: 0,
    BASE: 0,
    FINANCAS: 0,
    ELENCO: 0,
    MERCADO: 0,
  };
  let urgentCount = 0;
  let attentionCount = 0;
  let opportunityCount = 0;

  for (const tip of cappedTips) {
    countsByCategory[tip.category] += 1;
    if (tip.priority === 'URGENTE') urgentCount += 1;
    else if (tip.priority === 'ATENCAO') attentionCount += 1;
    else opportunityCount += 1;
  }

  const healthSummary =
    urgentCount > 0
      ? `${urgentCount} prioridade(s) imediata(s) detectada(s) na rotina do clube.`
      : attentionCount > 0
      ? `${attentionCount} ponto(s) de atenção para manter o planejamento sustentável.`
      : 'Gestão estável · Foco em oportunidades de crescimento e mercado.';

  return {
    tips: cappedTips,
    countsByCategory,
    urgentCount,
    attentionCount,
    opportunityCount,
    healthSummary,
  };
}
