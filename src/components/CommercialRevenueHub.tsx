import React, { useMemo, useState } from 'react';
import { ActiveTransferClause, Club } from '../types/game';
import { soundEngine } from '../services/soundEngine';
import { formatBrlCompact, formatBrlFull } from '../utils/financialFairPlayEngine';
import {
  ARENA_EVENT_COOLDOWN_ROUNDS,
  ARENA_EVENT_MAX_PER_SEASON,
  calculateMerchandisingBreakdown,
  calculateMonthlyCommercialHubIncome,
  claimSolidarityPayout,
  CommercialAssetKey,
  FRIENDLY_TOUR_COOLDOWN_ROUNDS,
  FRIENDLY_TOUR_MAX_PER_SEASON,
  getArenaEventOptions,
  getAvailableSolidarityPayouts,
  getBoardCapitalOptions,
  getCommercialAssetSpecs,
  getDefaultCommercialHub,
  getNamingRightsOffers,
  getProfitableTourOptions,
  getTvBroadcastOffers,
  hostArenaEvent,
  launchSpecialJerseyCampaign,
  requestBoardOrSafCapital,
  scheduleProfitableTour,
  signNamingRightsContract,
  signTvBroadcastContract,
  upgradeCommercialArenaAsset,
} from '../utils/commercialRevenueEngine';
import {
  Building2,
  CheckCircle2,
  Coins,
  Globe2,
  Landmark,
  Music,
  Percent,
  Shirt,
  Tv,
  AlertTriangle,
} from 'lucide-react';

interface CommercialRevenueHubProps {
  club: Club;
  currentDate: string;
  currentRound: number;
  seasonYear: number;
  fanConfidence: number;
  transferClauses?: ActiveTransferClause[];
  onUpdateClub: (updatedClub: Club) => void;
}

type CommercialFilter = 'all' | 'contracts' | 'arena' | 'global';

export const CommercialRevenueHub: React.FC<CommercialRevenueHubProps> = ({
  club,
  currentDate,
  currentRound,
  seasonYear,
  fanConfidence,
  transferClauses = [],
  onUpdateClub,
}) => {
  const [filter, setFilter] = useState<CommercialFilter>('all');
  const [notice, setNotice] = useState<{ text: string; tone: 'success' | 'error' } | null>(
    null
  );

  const hub = useMemo(() => getDefaultCommercialHub(club), [club]);

  const monthlySummary = useMemo(
    () => calculateMonthlyCommercialHubIncome(club, fanConfidence, currentRound),
    [club, fanConfidence, currentRound]
  );

  const namingOffers = useMemo(
    () => getNamingRightsOffers(club, seasonYear),
    [club, seasonYear]
  );

  const tvOffers = useMemo(
    () => getTvBroadcastOffers(club, seasonYear),
    [club, seasonYear]
  );

  const merchBreakdown = useMemo(
    () => calculateMerchandisingBreakdown(club, fanConfidence, currentRound),
    [club, fanConfidence, currentRound]
  );

  const arenaEvents = useMemo(() => getArenaEventOptions(club), [club]);
  const tourOptions = useMemo(() => getProfitableTourOptions(club), [club]);
  const assetSpecs = useMemo(() => getCommercialAssetSpecs(club), [club]);
  const solidarityOffers = useMemo(
    () => getAvailableSolidarityPayouts(club, seasonYear, currentRound),
    [club, seasonYear, currentRound]
  );
  const boardOptions = useMemo(
    () => getBoardCapitalOptions(club, seasonYear),
    [club, seasonYear]
  );

  const clubReceivableClauses = useMemo(
    () =>
      transferClauses.filter((c) => c.direction === 'RECEIVABLE'),
    [transferClauses]
  );

  const eventCooldownLeft = Math.max(
    0,
    ARENA_EVENT_COOLDOWN_ROUNDS - (currentRound - (hub.lastArenaEventRound ?? -99))
  );
  const tourCooldownLeft = Math.max(
    0,
    FRIENDLY_TOUR_COOLDOWN_ROUNDS - (currentRound - (hub.lastTourRound ?? -99))
  );

  const notify = (text: string, tone: 'success' | 'error' = 'success') => {
    setNotice({ text, tone });
    if (tone === 'success') {
      soundEngine.playContractSigned();
    } else {
      soundEngine.playClick();
    }
  };

  const handleSignNamingRights = (offerId: string) => {
    const offer = namingOffers.find((o) => o.id === offerId);
    if (!offer) return;
    const res = signNamingRightsContract(club, offer, currentDate, seasonYear);
    if (!res.ok) {
      notify(res.error || 'Não foi possível assinar Naming Rights.', 'error');
      return;
    }
    onUpdateClub(res.updatedClub);
    notify(
      `Naming Rights assinado com ${offer.brandName}: estádio agora chama ${offer.arenaDisplayName} (+${formatBrlFull(offer.signingBonus)} à vista e +${formatBrlFull(offer.monthlyFee)}/mês).`
    );
  };

  const handleSignTvContract = (offerId: string) => {
    const offer = tvOffers.find((o) => o.id === offerId);
    if (!offer) return;
    const res = signTvBroadcastContract(club, offer, currentDate, seasonYear);
    if (!res.ok) {
      notify(res.error || 'Não foi possível fechar contrato de TV.', 'error');
      return;
    }
    onUpdateClub(res.updatedClub);
    notify(
      `Contrato de TV fechado com ${offer.networkName}: +${formatBrlFull(offer.signingBonus)} de luvas no caixa e cota mensal elevada para ${formatBrlFull(offer.estimatedMonthlyTotal)}/mês.`
    );
  };

  const handleLaunchJersey = (edition: 'THIRD_KIT' | 'COMMEMORATIVE') => {
    const res = launchSpecialJerseyCampaign(
      club,
      edition,
      currentRound,
      currentDate,
      seasonYear,
      fanConfidence
    );
    if (!res.ok) {
      notify(res.error || 'Campanha já realizada nesta temporada.', 'error');
      return;
    }
    onUpdateClub(res.updatedClub);
    notify(
      `Sucesso na Loja Oficial! ${res.unitsSold.toLocaleString('pt-BR')} camisas vendidas no lançamento (+${formatBrlFull(res.revenue)}) e impulso de vendas ativo pelas próximas 10 rodadas.`
    );
  };

  const handleHostEvent = (eventId: string) => {
    const res = hostArenaEvent(club, eventId, currentRound, currentDate);
    if (!res.ok) {
      notify(res.error || 'Não foi possível agendar o evento.', 'error');
      return;
    }
    onUpdateClub(res.updatedClub);
    notify(
      `Evento realizado na arena com lucro líquido de +${formatBrlFull(res.netProfit)} já creditado no caixa.`
    );
  };

  const handleScheduleTour = (tourId: string) => {
    const res = scheduleProfitableTour(club, tourId, currentRound, currentDate);
    if (!res.ok) {
      notify(res.error || 'Não foi possível realizar a turnê.', 'error');
      return;
    }
    onUpdateClub(res.updatedClub);
    notify(
      `Turnê internacional concluída! +${formatBrlFull(res.netRevenue)} líquidos no caixa e +${res.newSociosBonus.toLocaleString('pt-BR')} novos sócios-torcedores.`
    );
  };

  const handleUpgradeAsset = (assetKey: CommercialAssetKey) => {
    const res = upgradeCommercialArenaAsset(club, assetKey, currentDate);
    if (!res.ok) {
      notify(res.error || 'Não foi possível expandir o ativo comercial.', 'error');
      return;
    }
    onUpdateClub(res.updatedClub);
    notify(
      `Obra comercial concluída (Nível ${res.newLevel})! Receita mensal fixa e consumo por torcedor em dias de jogo aumentaram permanentemente.`
    );
  };

  const handleClaimSolidarity = (payoutId: string) => {
    const res = claimSolidarityPayout(
      club,
      payoutId,
      seasonYear,
      currentRound,
      currentDate
    );
    if (!res.ok) {
      notify(res.error || 'Repasse indisponível.', 'error');
      return;
    }
    onUpdateClub(res.updatedClub);
    notify(
      `Mecanismo de Solidariedade FIFA resgatado: +${formatBrlFull(res.amount)} creditados em Vendas & Repasses.`
    );
  };

  const handleBoardCapital = (
    optionId: 'BOARD_REINFORCEMENTS' | 'BOARD_INFRASTRUCTURE' | 'SAF_MINORITY_PARTNER'
  ) => {
    const res = requestBoardOrSafCapital(club, optionId, currentDate, seasonYear);
    if (!res.ok) {
      notify(res.error || 'Aporte não disponível.', 'error');
      return;
    }
    onUpdateClub(res.updatedClub);
    notify(
      `Aporte aprovado! +${formatBrlFull(res.amount)} injetados imediatamente no caixa do clube.`
    );
  };

  const showContracts = filter === 'all' || filter === 'contracts';
  const showArena = filter === 'all' || filter === 'arena';
  const showGlobal = filter === 'all' || filter === 'global';

  return (
    <div className="space-y-6">
      {/* KPI Summary Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="bg-[#0c1424] border border-slate-800/80 rounded-2xl p-4">
          <div className="text-xs text-slate-400">Receita Extra Mensal Ativa</div>
          <div className="text-2xl font-bold font-mono tabular-nums text-emerald-400 mt-1">
            +{formatBrlCompact(monthlySummary.totalExtraMonthlyIncome)}
            <span className="text-xs font-normal text-slate-400"> /mês</span>
          </div>
          <div className="text-xs text-slate-500 mt-1">
            Naming · TV Extra · Loja · VIP/Museu
          </div>
        </div>

        <div className="bg-[#0c1424] border border-slate-800/80 rounded-2xl p-4">
          <div className="text-xs text-slate-400">Naming Rights da Arena</div>
          <div className="text-base font-bold text-white mt-1 truncate">
            {hub.namingRights ? hub.namingRights.arenaDisplayName : 'Disponível para venda'}
          </div>
          <div className="text-xs text-slate-400 mt-1 font-mono tabular-nums">
            {hub.namingRights
              ? `+${formatBrlCompact(hub.namingRights.monthlyFee)}/mês · ${hub.namingRights.seasonsRemaining} temp.`
              : `Estádio atual: ${club.stadium.name}`}
          </div>
        </div>

        <div className="bg-[#0c1424] border border-slate-800/80 rounded-2xl p-4">
          <div className="text-xs text-slate-400">Contrato de TV & Streaming</div>
          <div className="text-base font-bold text-white mt-1 truncate">
            {hub.tvContract && hub.tvContract.seasonYear === seasonYear
              ? hub.tvContract.networkName
              : 'Cota padrão da liga'}
          </div>
          <div className="text-xs text-slate-400 mt-1 font-mono tabular-nums">
            {hub.tvContract && hub.tvContract.seasonYear === seasonYear
              ? `+${Math.round((hub.tvContract.monthlyMultiplier - 1) * 100)}% mensal · +${formatBrlCompact(hub.tvContract.winBonusPerMatch)}/vitória`
              : `Negocie para a temporada ${seasonYear}`}
          </div>
        </div>

        <div className="bg-[#0c1424] border border-slate-800/80 rounded-2xl p-4">
          <div className="text-xs text-slate-400">Loja Oficial & Merchandising</div>
          <div className="text-2xl font-bold font-mono tabular-nums text-sky-400 mt-1">
            {formatBrlCompact(merchBreakdown.totalMonthlyRevenue)}
            <span className="text-xs font-normal text-slate-400"> /mês</span>
          </div>
          <div className="text-xs text-slate-500 mt-1 font-mono tabular-nums">
            {merchBreakdown.starPlayersCount} astro(s) OVR 79+ · ~
            {merchBreakdown.estimatedMonthlyUnits.toLocaleString('pt-BR')} camisas/mês
          </div>
        </div>
      </div>

      {/* Feedback Notice */}
      {notice && (
        <div
          className={`flex items-center justify-between gap-4 rounded-xl border px-4 py-3 text-sm ${
            notice.tone === 'success'
              ? 'bg-emerald-950/40 border-emerald-700/60 text-emerald-200'
              : 'bg-amber-950/40 border-amber-700/60 text-amber-200'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {notice.tone === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            )}
            <span>{notice.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setNotice(null)}
            className="text-xs text-slate-300 hover:text-white whitespace-nowrap shrink-0 cursor-pointer"
          >
            Fechar
          </button>
        </div>
      )}

      {/* Interactive Filter Segmented Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-white">
            Central de Expansão Comercial & Receitas Extras
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Todas as receitas fechadas aqui entram no saldo em caixa, no Extrato Bancário e no fluxo mensal automático da temporada.
          </p>
        </div>

        <div className="flex items-center gap-1 p-1 bg-[#0c1424] border border-slate-800 rounded-xl overflow-x-auto">
          {(
            [
              { id: 'all', label: 'Todas (8)' },
              { id: 'contracts', label: 'Naming & TV' },
              { id: 'arena', label: 'Loja, Shows & VIP' },
              { id: 'global', label: 'Turnês, FIFA & Diretoria' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                soundEngine.playClick();
                setFilter(tab.id);
              }}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                filter === tab.id
                  ? 'bg-emerald-500 text-slate-950'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* SECTION 1 & 2: NAMING RIGHTS + TV & STREAMING */}
      {showContracts && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
          {/* 1. Naming Rights do Estádio */}
          <section className="bg-[#0c1424] border border-slate-800/80 rounded-2xl p-5 sm:p-6">
            <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-800/80">
              <div>
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <h3 className="text-base font-bold text-white">
                    1. Naming Rights do Estádio
                  </h3>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Venda o nome comercial da arena por 3 a 5 temporadas para embolsar luvas imediatas e renda mensal fixa.
                </p>
              </div>
              <div className="text-xs text-slate-400 font-mono tabular-nums whitespace-nowrap shrink-0">
                {club.stadium.capacity.toLocaleString('pt-BR')} lugares
              </div>
            </div>

            {hub.namingRights ? (
              <div className="pt-4 space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-400">Parceiro Comercial</span>
                  <span className="font-semibold text-white">
                    {hub.namingRights.brandName} · {hub.namingRights.sector}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-400">Nome Comercial Ativo</span>
                  <span className="font-bold text-emerald-400">
                    {hub.namingRights.arenaDisplayName}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-400">Parcela Mensal Garantida</span>
                  <span className="font-mono tabular-nums font-bold text-emerald-400">
                    +{formatBrlFull(hub.namingRights.monthlyFee)}/mês
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-400">Vigência Restante</span>
                  <span className="font-mono tabular-nums text-slate-200">
                    {hub.namingRights.seasonsRemaining} de {hub.namingRights.seasonsTotal}{' '}
                    temporada(s)
                  </span>
                </div>
                <p className="text-xs text-slate-500 pt-2 border-t border-slate-800/70">
                  Ao término do contrato, o estádio retorna automaticamente ao nome histórico (
                  {hub.namingRights.originalStadiumName}) e novas propostas são liberadas.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-800/70 mt-2">
                {namingOffers.map((offer) => (
                  <div
                    key={offer.id}
                    className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-white">
                        {offer.arenaDisplayName}
                      </div>
                      <div className="text-xs text-slate-400 mt-0.5">
                        {offer.brandName} · {offer.sector} · {offer.seasonsTotal} temporadas
                      </div>
                      <div className="text-xs font-mono tabular-nums text-emerald-400 mt-1">
                        Luvas {formatBrlFull(offer.signingBonus)} · +{formatBrlCompact(offer.monthlyFee)}/mês · Total est. {formatBrlCompact(offer.totalValueEstimate)}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleSignNamingRights(offer.id)}
                      className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      Assinar Naming
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* 2. Direitos de TV & Streaming */}
          <section className="bg-[#0c1424] border border-slate-800/80 rounded-2xl p-5 sm:p-6">
            <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-800/80">
              <div>
                <div className="flex items-center gap-2">
                  <Tv className="w-4 h-4 text-sky-400 shrink-0" />
                  <h3 className="text-base font-bold text-white">
                    2. Negociação de Direitos de TV & Streaming
                  </h3>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Escolha o modelo de transmissão da temporada {seasonYear}: luvas na assinatura, multiplicador mensal e bônus de audiência por vitória.
                </p>
              </div>
            </div>

            {hub.tvContract && hub.tvContract.seasonYear === seasonYear ? (
              <div className="pt-4 space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-400">Emissora / Plataforma</span>
                  <span className="font-semibold text-white">
                    {hub.tvContract.networkName}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-400">Acordo Mensal</span>
                  <span className="font-mono tabular-nums font-bold text-sky-400">
                    +{Math.round((hub.tvContract.monthlyMultiplier - 1) * 100)}% sobre cota base
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-400">Bônus de Audiência por Vitória</span>
                  <span className="font-mono tabular-nums font-bold text-emerald-400">
                    +{formatBrlFull(hub.tvContract.winBonusPerMatch)} por jogo vencido
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-400">Luvas Já Recebidas</span>
                  <span className="font-mono tabular-nums text-slate-200">
                    {formatBrlFull(hub.tvContract.signingBonus)}
                  </span>
                </div>
                <p className="text-xs text-slate-500 pt-2 border-t border-slate-800/70">
                  O contrato vigora até o encerramento de {seasonYear} e libera nova rodada de propostas na temporada seguinte.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-800/70 mt-2">
                {tvOffers.map((offer) => (
                  <div
                    key={offer.id}
                    className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-white">
                        {offer.networkName}{' '}
                        <span className="text-xs font-normal text-slate-400">
                          · {offer.profileLabel}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">{offer.description}</p>
                      <div className="text-xs font-mono tabular-nums text-sky-400 mt-1">
                        Luvas {formatBrlCompact(offer.signingBonus)} ·{' '}
                        {formatBrlCompact(offer.estimatedMonthlyTotal)}/mês (+
                        {Math.round((offer.monthlyMultiplier - 1) * 100)}%) · +
                        {formatBrlCompact(offer.winBonusPerMatch)}/vitória
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleSignTvContract(offer.id)}
                      className="px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      Fechar Acordo
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}

      {/* SECTION 3, 4 & 6: LOJA OFICIAL + SHOWS NA ARENA + CAMAROTES/MUSEU/PRAÇA */}
      {showArena && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
            {/* 3. Loja Oficial & Lançamento de Camisas */}
            <section className="bg-[#0c1424] border border-slate-800/80 rounded-2xl p-5 sm:p-6">
              <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-800/80">
                <div>
                  <div className="flex items-center gap-2">
                    <Shirt className="w-4 h-4 text-violet-400 shrink-0" />
                    <h3 className="text-base font-bold text-white">
                      3. Loja Oficial & Lançamento de Camisas
                    </h3>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    Receita mensal contínua impulsionada pelos craques do elenco (OVR 79+) e lançamentos sazonais de uniformes.
                  </p>
                </div>
                <div className="text-right font-mono tabular-nums shrink-0">
                  <div className="text-sm font-bold text-emerald-400">
                    +{formatBrlCompact(merchBreakdown.totalMonthlyRevenue)}/mês
                  </div>
                  <div className="text-xs text-slate-500">
                    {merchBreakdown.activeBoostMultiplier > 1
                      ? `Impulso +${Math.round((merchBreakdown.activeBoostMultiplier - 1) * 100)}% ativo`
                      : 'Ritmo regular'}
                  </div>
                </div>
              </div>

              <div className="pt-4 space-y-2 text-xs text-slate-400 border-b border-slate-800/70 pb-4">
                <div className="flex items-center justify-between">
                  <span>Base da Loja Oficial (sócios + torcida)</span>
                  <span className="font-mono tabular-nums text-slate-200">
                    {formatBrlFull(merchBreakdown.baseMonthlyRevenue)}/mês
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>
                    Efeito Craques ({merchBreakdown.starPlayersCount} atleta(s) OVR 79+)
                  </span>
                  <span className="font-mono tabular-nums text-violet-300">
                    +{formatBrlFull(merchBreakdown.starBonusMonthly)}/mês
                  </span>
                </div>
                {merchBreakdown.topStarNames.length > 0 && (
                  <div className="text-slate-500">
                    Maiores vendedores: {merchBreakdown.topStarNames.join(' · ')}
                  </div>
                )}
              </div>

              <div className="divide-y divide-slate-800/70 mt-1">
                <div className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-white">
                      Lançar 3º Uniforme Oficial {seasonYear}
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5">
                      Receita imediata estimada{' '}
                      <span className="font-mono tabular-nums text-emerald-400 font-semibold">
                        +{formatBrlFull(merchBreakdown.thirdKitLaunchRevenue)}
                      </span>{' '}
                      · +35% nas vendas mensais por 10 rodadas
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={hub.merchandising.thirdKitLaunchedSeason === seasonYear}
                    onClick={() => handleLaunchJersey('THIRD_KIT')}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors whitespace-nowrap shrink-0 ${
                      hub.merchandising.thirdKitLaunchedSeason === seasonYear
                        ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                        : 'bg-violet-500 hover:bg-violet-400 text-slate-950 cursor-pointer'
                    }`}
                  >
                    {hub.merchandising.thirdKitLaunchedSeason === seasonYear
                      ? 'Já Lançado'
                      : 'Lançar 3º Uniforme'}
                  </button>
                </div>

                <div className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-white">
                      Camisa Retrô / Edição Comemorativa
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5">
                      Receita imediata estimada{' '}
                      <span className="font-mono tabular-nums text-emerald-400 font-semibold">
                        +{formatBrlFull(merchBreakdown.commemorativeLaunchRevenue)}
                      </span>{' '}
                      · +25% nas vendas mensais por 10 rodadas
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={hub.merchandising.commemorativeLaunchedSeason === seasonYear}
                    onClick={() => handleLaunchJersey('COMMEMORATIVE')}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors whitespace-nowrap shrink-0 ${
                      hub.merchandising.commemorativeLaunchedSeason === seasonYear
                        ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                        : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 cursor-pointer'
                    }`}
                  >
                    {hub.merchandising.commemorativeLaunchedSeason === seasonYear
                      ? 'Já Lançada'
                      : 'Lançar Edição'}
                  </button>
                </div>
              </div>
            </section>

            {/* 4. Shows e Eventos na Arena */}
            <section className="bg-[#0c1424] border border-slate-800/80 rounded-2xl p-5 sm:p-6">
              <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-800/80">
                <div>
                  <div className="flex items-center gap-2">
                    <Music className="w-4 h-4 text-teal-400 shrink-0" />
                    <h3 className="text-base font-bold text-white">
                      4. Shows & Eventos na Arena (Datas sem Jogo)
                    </h3>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    Alugue o estádio para shows, festivais e feiras. Inclui custo automático de manutenção do gramado.
                  </p>
                </div>
                <div className="text-xs text-slate-400 font-mono tabular-nums whitespace-nowrap shrink-0">
                  {hub.eventsHostedThisSeason}/{ARENA_EVENT_MAX_PER_SEASON} na temporada
                </div>
              </div>

              {eventCooldownLeft > 0 && (
                <div className="mt-3 text-xs text-amber-300">
                  Gramado em recuperação: próximo evento disponível em {eventCooldownLeft}{' '}
                  rodada(s).
                </div>
              )}

              <div className="divide-y divide-slate-800/70 mt-2">
                {arenaEvents.map((ev) => {
                  const capBlocked = club.stadium.capacity < ev.minStadiumCapacity;
                  const disabled =
                    capBlocked ||
                    eventCooldownLeft > 0 ||
                    hub.eventsHostedThisSeason >= ARENA_EVENT_MAX_PER_SEASON;

                  return (
                    <div
                      key={ev.id}
                      className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-white">
                          {ev.title}{' '}
                          <span className="text-xs font-normal text-slate-400">
                            · {ev.category}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5">{ev.description}</p>
                        <div className="text-xs font-mono tabular-nums mt-1">
                          <span className="text-emerald-400 font-semibold">
                            Líquido +{formatBrlFull(ev.netProfit)}
                          </span>{' '}
                          <span className="text-slate-500">
                            (Bruto {formatBrlCompact(ev.grossRevenue)} · Gramado -
                            {formatBrlCompact(ev.pitchMaintenanceCost)})
                          </span>
                        </div>
                        {capBlocked && (
                          <div className="text-xs text-amber-400 mt-0.5">
                            Exige estádio com {ev.minStadiumCapacity.toLocaleString('pt-BR')}+ lugares
                          </div>
                        )}
                      </div>
                      <button
                        type="button"
                        disabled={disabled}
                        onClick={() => handleHostEvent(ev.id)}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors whitespace-nowrap shrink-0 ${
                          disabled
                            ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                            : 'bg-teal-400 hover:bg-teal-300 text-slate-950 cursor-pointer'
                        }`}
                      >
                        Agendar Evento
                      </button>
                    </div>
                  );
                })}
              </div>
            </section>
          </div>

          {/* 6. Camarotes VIP, Tour & Museu e Praça Gastronômica */}
          <section className="bg-[#0c1424] border border-slate-800/80 rounded-2xl p-5 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800/80">
              <div>
                <div className="flex items-center gap-2">
                  <Coins className="w-4 h-4 text-amber-400 shrink-0" />
                  <h3 className="text-base font-bold text-white">
                    6. Camarotes VIP, Tour & Museu e Praça Gastronômica
                  </h3>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Ativos comerciais permanentes na arena: geram receita fixa todo mês (mesmo sem jogos) e aumentam o gasto médio por torcedor em cada partida em casa.
                </p>
              </div>
              <div className="text-xs font-mono tabular-nums text-emerald-400 whitespace-nowrap shrink-0">
                Receita atual: +{formatBrlFull(monthlySummary.commercialAssetsMonthly)}/mês
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 pt-4">
              {assetSpecs.map((asset) => {
                const isMax = asset.currentLevel >= asset.maxLevel;
                return (
                  <div
                    key={asset.key}
                    className="flex flex-col justify-between gap-4 border-t lg:border-t-0 lg:border-l first:border-0 border-slate-800/70 pt-4 lg:pt-0 lg:pl-5 first:pt-0 first:pl-0"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="text-sm font-bold text-white">{asset.title}</h4>
                        <span className="text-xs font-mono tabular-nums text-amber-300">
                          Nível {asset.currentLevel}/{asset.maxLevel}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1">{asset.subtitle}</p>

                      <div className="mt-3 space-y-1.5 text-xs font-mono tabular-nums">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400 font-sans">Renda mensal atual</span>
                          <span className="text-emerald-400 font-semibold">
                            +{formatBrlFull(asset.currentMonthlyIncome)}/mês
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400 font-sans">Bônus matchday / fã</span>
                          <span className="text-sky-300">
                            +R$ {asset.currentPerFanMatchBonus.toFixed(2).replace('.', ',')}/torcedor
                          </span>
                        </div>
                        {!isMax && (
                          <div className="flex items-center justify-between text-slate-300 pt-1 border-t border-slate-800/60">
                            <span className="font-sans">Próximo nível</span>
                            <span>
                              +{formatBrlCompact(asset.nextMonthlyIncome)}/mês · +R${' '}
                              {asset.nextPerFanMatchBonus.toFixed(2).replace('.', ',')}/fã
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={isMax}
                      onClick={() => handleUpgradeAsset(asset.key)}
                      className={`w-full px-4 py-2 rounded-xl text-xs font-bold transition-colors whitespace-nowrap shrink-0 ${
                        isMax
                          ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                          : 'bg-amber-400 hover:bg-amber-300 text-slate-950 cursor-pointer'
                      }`}
                    >
                      {isMax
                        ? 'Nível Máximo Atingido'
                        : `Expandir · ${formatBrlCompact(asset.nextUpgradeCost)}`}
                    </button>
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      )}

      {/* SECTION 5, 7 & 8: TURNÊS INTERNACIONAIS + SOLIDARIEDADE FIFA + APORTE DIRETORIA/SAF */}
      {showGlobal && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
            {/* 5. Turnês e Amistosos Lucrativos */}
            <section className="bg-[#0c1424] border border-slate-800/80 rounded-2xl p-5 sm:p-6">
              <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-800/80">
                <div>
                  <div className="flex items-center gap-2">
                    <Globe2 className="w-4 h-4 text-sky-400 shrink-0" />
                    <h3 className="text-base font-bold text-white">
                      5. Turnês & Amistosos Lucrativos
                    </h3>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    Aproveite pausas e pré-temporada para jogar partidas comerciais no exterior, faturar cachê e ampliar sócios-torcedores.
                  </p>
                </div>
                <div className="text-xs text-slate-400 font-mono tabular-nums whitespace-nowrap shrink-0">
                  {hub.toursPlayedThisSeason}/{FRIENDLY_TOUR_MAX_PER_SEASON} na temporada
                </div>
              </div>

              {tourCooldownLeft > 0 && (
                <div className="mt-3 text-xs text-amber-300">
                  Janela de descanso do elenco: nova turnê liberada em {tourCooldownLeft}{' '}
                  rodada(s).
                </div>
              )}

              <div className="divide-y divide-slate-800/70 mt-2">
                {tourOptions.map((tour) => {
                  const disabled =
                    tourCooldownLeft > 0 ||
                    hub.toursPlayedThisSeason >= FRIENDLY_TOUR_MAX_PER_SEASON;
                  return (
                    <div
                      key={tour.id}
                      className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-white">
                          {tour.title}{' '}
                          <span className="text-xs font-normal text-slate-400">
                            · {tour.region}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5">{tour.description}</p>
                        <div className="text-xs font-mono tabular-nums mt-1">
                          <span className="text-emerald-400 font-semibold">
                            Líquido +{formatBrlFull(tour.netRevenue)}
                          </span>{' '}
                          <span className="text-sky-300">
                            · +{tour.newSociosBonus.toLocaleString('pt-BR')} sócios
                          </span>{' '}
                          <span className="text-slate-500">
                            · Físico -{tour.squadFatigueCost}%
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        disabled={disabled}
                        onClick={() => handleScheduleTour(tour.id)}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors whitespace-nowrap shrink-0 ${
                          disabled
                            ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                            : 'bg-sky-500 hover:bg-sky-400 text-slate-950 cursor-pointer'
                        }`}
                      >
                        Realizar Turnê
                      </button>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* 7. Cláusulas de Revenda & Mecanismo de Solidariedade FIFA */}
            <section className="bg-[#0c1424] border border-slate-800/80 rounded-2xl p-5 sm:p-6">
              <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-800/80">
                <div>
                  <div className="flex items-center gap-2">
                    <Percent className="w-4 h-4 text-emerald-400 shrink-0" />
                    <h3 className="text-base font-bold text-white">
                      7. Revenda & Solidariedade FIFA (Base)
                    </h3>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    Receba 5% a 10% sobre negociações internacionais de ex-atletas formados no clube e acompanhe suas cláusulas de futura venda.
                  </p>
                </div>
                <div className="text-xs font-mono tabular-nums text-emerald-400 whitespace-nowrap shrink-0">
                  Arrecadado: {formatBrlCompact(hub.totalSolidaritySeason)}
                </div>
              </div>

              <div className="divide-y divide-slate-800/70 mt-2">
                {solidarityOffers.length === 0 ? (
                  <div className="py-4 text-xs text-slate-400">
                    Nenhum novo repasse FIFA pendente nesta rodada. Novos relatórios de transferências de ex-atletas da base são auditados nas rodadas 1, 10 e 20.
                  </div>
                ) : (
                  solidarityOffers.map((item) => (
                    <div
                      key={item.id}
                      className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-white">
                          {item.playerName}{' '}
                          <span className="text-xs font-normal text-slate-400">
                            · {item.position} · vendido ao {item.destinationClub}
                          </span>
                        </div>
                        <div className="text-xs text-slate-400 mt-0.5">
                          {item.originNote} ({item.solidarityPct}% sobre{' '}
                          <span className="font-mono tabular-nums">
                            {formatBrlCompact(item.transferFeeReference)}
                          </span>
                          )
                        </div>
                        <div className="text-xs font-mono tabular-nums text-emerald-400 font-semibold mt-1">
                          Repasse disponível: +{formatBrlFull(item.payoutAmount)}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleClaimSolidarity(item.id)}
                        className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        Resgatar Repasse
                      </button>
                    </div>
                  ))
                )}
              </div>

              {clubReceivableClauses.length > 0 && (
                <div className="mt-4 pt-3 border-t border-slate-800/70">
                  <div className="text-xs font-semibold text-slate-300 mb-2">
                    Cláusulas de Revenda Ativas em Carteira ({clubReceivableClauses.length})
                  </div>
                  <div className="space-y-1.5 text-xs">
                    {clubReceivableClauses.slice(0, 5).map((cl) => (
                      <div
                        key={cl.id}
                        className="flex items-center justify-between text-slate-400"
                      >
                        <span className="truncate text-slate-200">
                          {cl.playerName} · {cl.counterpartyClubName}
                        </span>
                        <span className="font-mono tabular-nums text-emerald-400 shrink-0 ml-2">
                          {cl.sellOnPercentage ? `${cl.sellOnPercentage}% revenda` : 'Cláusula ativa'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </section>
          </div>

          {/* 8. Aporte da Diretoria / Parceria SAF */}
          <section className="bg-[#0c1424] border border-slate-800/80 rounded-2xl p-5 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800/80">
              <div>
                <div className="flex items-center gap-2">
                  <Landmark className="w-4 h-4 text-emerald-400 shrink-0" />
                  <h3 className="text-base font-bold text-white">
                    8. Aporte da Diretoria & Parceria Comercial SAF
                  </h3>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Solicite uma injeção de capital extraordinária (1 operação por temporada) para reforçar o caixa, financiar obras ou evitar déficit no Fair Play Financeiro.
                </p>
              </div>
              {hub.boardInvestment && hub.boardInvestment.usedSeasonYear === seasonYear && (
                <div className="text-xs font-mono tabular-nums text-emerald-400 whitespace-nowrap shrink-0">
                  Utilizado em {seasonYear}: +{formatBrlCompact(hub.boardInvestment.amountReceived)}
                </div>
              )}
            </div>

            {hub.boardInvestment && hub.boardInvestment.usedSeasonYear === seasonYear ? (
              <div className="pt-4 space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Operação Aprovada</span>
                  <span className="font-semibold text-white">
                    {hub.boardInvestment.label}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Capital Injetado</span>
                  <span className="font-mono tabular-nums font-bold text-emerald-400">
                    +{formatBrlFull(hub.boardInvestment.amountReceived)}
                  </span>
                </div>
                <div className="text-xs text-slate-400 pt-1">
                  {hub.boardInvestment.note}
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 pt-4">
                {boardOptions.map((opt) => (
                  <div
                    key={opt.id}
                    className="flex flex-col justify-between gap-4 border-t lg:border-t-0 lg:border-l first:border-0 border-slate-800/70 pt-4 lg:pt-0 lg:pl-5 first:pt-0 first:pl-0"
                  >
                    <div>
                      <h4 className="text-sm font-bold text-white">{opt.title}</h4>
                      <p className="text-xs text-slate-400 mt-1">{opt.subtitle}</p>
                      <div className="text-xl font-bold font-mono tabular-nums text-emerald-400 mt-3">
                        +{formatBrlFull(opt.amount)}
                      </div>
                      <p className="text-xs text-slate-500 mt-1.5">{opt.tradeoffNote}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleBoardCapital(opt.id)}
                      className="w-full px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      Solicitar Aporte
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
};
