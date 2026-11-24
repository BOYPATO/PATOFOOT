import React, { useMemo, useState } from 'react';
import { Club, GameSave, Player } from '../types/game';
import {
  DeadlineBargainTarget,
  DeadlineDaySession,
  DeadlineFlashOffer,
  buildRandomRivalDeadlineHeadlines,
} from '../utils/deadlineDayEngine';
import { soundEngine } from '../services/soundEngine';
import {
  ArrowRight,
  Clock,
  Flame,
  Handshake,
  Newspaper,
  ShoppingBag,
  Sparkles,
  Tag,
  X,
  CheckCircle2,
  XCircle,
} from 'lucide-react';

interface DeadlineDayModalProps {
  session: DeadlineDaySession;
  userClub: Club;
  allClubs: Club[];
  gameState: GameSave;
  onAcceptFlashOffer: (offer: DeadlineFlashOffer, finalAmount: number) => void;
  onSignBargainPlayer: (target: DeadlineBargainTarget) => boolean;
  onUpdateSession: (next: DeadlineDaySession) => void;
  onCloseWindowComplete: (windowKey: string) => void;
  onMinimize: () => void;
}

export const DeadlineDayModal: React.FC<DeadlineDayModalProps> = ({
  session,
  userClub,
  allClubs,
  onAcceptFlashOffer,
  onSignBargainPlayer,
  onUpdateSession,
  onCloseWindowComplete,
  onMinimize,
}) => {
  const [feedback, setFeedback] = useState<string | null>(null);

  const otherClubs = useMemo(
    () => allClubs.filter((c) => c.id !== userClub.id && !c.id.startsWith('guest_') && c.squad.length >= 16),
    [allClubs, userClub.id]
  );

  const formatMoney = (val: number) => {
    if (val >= 1_000_000) {
      return `R$ ${(val / 1_000_000).toFixed(2).replace('.', ',')} mi`;
    }
    if (val >= 1_000) {
      return `R$ ${Math.round(val / 1_000)} mil`;
    }
    return `R$ ${val.toLocaleString('pt-BR')}`;
  };

  const isClosed = session.currentHour >= 24;
  const hourDisplay = isClosed
    ? '23:59 · ENCERRADA'
    : `${String(session.currentHour).padStart(2, '0')}:00`;
  const hoursRemaining = Math.max(0, 24 - session.currentHour);

  const notify = (msg: string) => {
    setFeedback(msg);
    setTimeout(() => {
      setFeedback((prev) => (prev === msg ? null : prev));
    }, 4000);
  };

  const handleAdvanceTwoHours = () => {
    if (isClosed) return;
    soundEngine.playClick();
    const nextHour = Math.min(24, session.currentHour + 2);
    const label = nextHour >= 24 ? '23:59' : `${String(nextHour).padStart(2, '0')}:00`;
    const rivalNews = buildRandomRivalDeadlineHeadlines(otherClubs, label, 2);

    // If closing, append closing headline
    const closingHeadline =
      nextHour >= 24
        ? [
            {
              id: `dd_close_${Date.now()}`,
              hourLabel: '23:59',
              headline: `JANELA ENCERRADA! O sistema do BID fechou às 23h59. Todos os registros confirmados já estão regularizados no seu elenco.`,
              highlight: true,
            },
          ]
        : [];

    onUpdateSession({
      ...session,
      currentHour: nextHour,
      newsFeed: [...closingHeadline, ...rivalNews, ...session.newsFeed].slice(0, 20),
    });
  };

  const handleAcceptOffer = (offer: DeadlineFlashOffer) => {
    if (isClosed || offer.status !== 'PENDING') return;
    soundEngine.playFanfare();
    onAcceptFlashOffer(offer, offer.offerAmount);
    const hourLabel = `${String(session.currentHour).padStart(2, '0')}:15`;
    onUpdateSession({
      ...session,
      flashOffers: session.flashOffers.map((o) =>
        o.id === offer.id ? { ...o, status: 'ACCEPTED' } : o
      ),
      newsFeed: [
        {
          id: `dd_acc_${Date.now()}`,
          hourLabel,
          headline: `NEGÓCIO FECHADO! ${userClub.shortName} vendeu ${offer.playerName} para o ${offer.buyerClubShortName} por ${formatMoney(offer.offerAmount)}!`,
          highlight: true,
        },
        ...session.newsFeed,
      ],
    });
    notify(`Venda concluída: ${offer.playerName} saiu por ${formatMoney(offer.offerAmount)}!`);
  };

  const handleCounterOffer = (offer: DeadlineFlashOffer) => {
    if (isClosed || offer.status !== 'PENDING') return;
    soundEngine.playClick();
    const accepted = Math.random() < 0.62;
    const hourLabel = `${String(session.currentHour).padStart(2, '0')}:25`;
    if (accepted) {
      soundEngine.playFanfare();
      onAcceptFlashOffer(offer, offer.counterAmount);
      onUpdateSession({
        ...session,
        flashOffers: session.flashOffers.map((o) =>
          o.id === offer.id ? { ...o, status: 'COUNTER_ACCEPTED' } : o
        ),
        newsFeed: [
          {
            id: `dd_cnt_ok_${Date.now()}`,
            hourLabel,
            headline: `CONTRAPROPOSTA ACEITA! ${offer.buyerClubShortName} topou pagar ${formatMoney(offer.counterAmount)} (+15%) por ${offer.playerName}!`,
            highlight: true,
          },
          ...session.newsFeed,
        ],
      });
      notify(`Sucesso! ${offer.buyerClubShortName} aceitou pagar ${formatMoney(offer.counterAmount)}!`);
    } else {
      onUpdateSession({
        ...session,
        flashOffers: session.flashOffers.map((o) =>
          o.id === offer.id ? { ...o, status: 'COUNTER_REJECTED' } : o
        ),
        newsFeed: [
          {
            id: `dd_cnt_no_${Date.now()}`,
            hourLabel,
            headline: `${offer.buyerClubShortName} desistiu da contraproposta de ${formatMoney(offer.counterAmount)} por ${offer.playerName} e encerrou conversas.`,
          },
          ...session.newsFeed,
        ],
      });
      notify(`${offer.buyerClubShortName} recuou da contraproposta. ${offer.playerName} permanece no elenco.`);
    }
  };

  const handleRejectOffer = (offer: DeadlineFlashOffer) => {
    if (offer.status !== 'PENDING') return;
    soundEngine.playClick();
    onUpdateSession({
      ...session,
      flashOffers: session.flashOffers.map((o) =>
        o.id === offer.id ? { ...o, status: 'REJECTED' } : o
      ),
    });
    notify(`Proposta do ${offer.buyerClubShortName} por ${offer.playerName} recusada.`);
  };

  const handleSignBargain = (target: DeadlineBargainTarget) => {
    if (isClosed || target.signed) return;
    if (userClub.finances.balance < target.bargainPrice) {
      notify('Saldo em caixa insuficiente para fechar esta oportunidade agora.');
      return;
    }
    if (userClub.squad.length >= 30) {
      notify('Elenco já está no limite máximo de 30 jogadores. Venda um atleta antes.');
      return;
    }
    const ok = onSignBargainPlayer(target);
    if (!ok) {
      notify('Não foi possível concluir a inscrição deste jogador agora.');
      return;
    }
    soundEngine.playFanfare();
    const hourLabel = `${String(session.currentHour).padStart(2, '0')}:35`;
    onUpdateSession({
      ...session,
      bargainTargets: session.bargainTargets.map((b) =>
        b.id === target.id ? { ...b, signed: true } : b
      ),
      newsFeed: [
        {
          id: `dd_sign_${Date.now()}`,
          hourLabel,
          headline: `REFORÇO NO BID! ${userClub.shortName} anunciou ${target.player.name} (${target.player.detailedRole}, OVR ${target.player.overall}) em negócio relâmpago!`,
          highlight: true,
        },
        ...session.newsFeed,
      ],
    });
    notify(`${target.player.name} regularizado no BID e já integrado ao seu elenco!`);
  };

  return (
    <div className="fixed inset-0 z-[65] bg-slate-950/90 backdrop-blur-md flex items-start justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-[#090f1d] border border-amber-500/45 rounded-2xl w-full max-w-5xl my-auto shadow-2xl overflow-hidden flex flex-col max-h-[94vh]">
        {/* Top Broadcast Bar */}
        <div className="bg-slate-950 px-5 py-4 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-400/40 flex items-center justify-center shrink-0">
              <Flame className="w-5 h-5 text-amber-400" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-xs text-amber-300 font-bold">
                <span>PLANTÃO: ÚLTIMO DIA DA JANELA</span>
                <span aria-hidden="true">·</span>
                <span className="text-slate-400 font-normal truncate">{session.windowLabel}</span>
              </div>
              <h2 className="text-base sm:text-lg font-black text-white truncate">
                Fechamento do Mercado ({session.closesOnDisplay})
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="px-3.5 py-2 rounded-xl bg-slate-900 border border-amber-500/40 text-right tabular-nums">
              <div className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold flex items-center justify-end gap-1">
                <Clock className="w-3 h-3 text-amber-400" />
                <span>{isClosed ? 'BID Fechado' : `Faltam ${hoursRemaining}h`}</span>
              </div>
              <div className="text-sm font-black font-mono text-amber-300">{hourDisplay}</div>
            </div>

            <div className="hidden sm:block px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-right tabular-nums">
              <div className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
                Caixa Disponível
              </div>
              <div className="text-sm font-black font-mono text-emerald-400">
                {formatMoney(userClub.finances.balance)}
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                soundEngine.playClick();
                onMinimize();
              }}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              title="Minimizar plantão"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Hour Progress Bar */}
        <div className="h-1.5 bg-slate-900 w-full">
          <div
            className="h-full bg-gradient-to-r from-sky-400 via-amber-400 to-rose-500 transition-all duration-300"
            style={{ width: `${Math.min(100, Math.max(8, ((session.currentHour - 12) / 12) * 100))}%` }}
          />
        </div>

        {feedback && (
          <div className="mx-5 mt-4 px-4 py-2.5 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-xs font-semibold text-emerald-200 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{feedback}</span>
          </div>
        )}

        {/* Main 3-Column Body */}
        <div className="flex-1 min-h-0 overflow-y-auto p-5 grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Column 1: Propostas Relâmpago pelos seus atletas */}
          <section className="lg:col-span-4 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <h3 className="text-xs font-black uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
                <Handshake className="w-4 h-4" />
                <span>Propostas Relâmpago</span>
              </h3>
              <span className="text-[11px] font-mono text-slate-400 tabular-nums">
                {session.flashOffers.filter((o) => o.status === 'PENDING').length} pendentes
              </span>
            </div>

            {session.flashOffers.length === 0 ? (
              <p className="text-xs text-slate-400 py-4">
                Nenhuma proposta urgente recebida nesta janela.
              </p>
            ) : (
              <div className="space-y-3">
                {session.flashOffers.map((offer) => {
                  const isPending = offer.status === 'PENDING';
                  return (
                    <div
                      key={offer.id}
                      className={`p-3.5 rounded-xl border text-xs space-y-2.5 ${
                        isPending
                          ? 'bg-slate-900/90 border-amber-500/35'
                          : 'bg-slate-950/70 border-slate-800/80 opacity-80'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="font-bold text-white truncate">{offer.playerName}</div>
                          <div className="text-[11px] text-slate-400 tabular-nums">
                            {offer.playerRole} · OVR {offer.playerOverall} · {offer.playerAge} anos
                          </div>
                        </div>
                        <span className="text-[11px] font-mono text-slate-500 shrink-0">
                          {offer.hourLabel}
                        </span>
                      </div>

                      <div className="text-[11px] text-slate-300">
                        Oferta do <strong className="text-sky-300">{offer.buyerClubName}</strong>:{' '}
                        <strong className="text-emerald-400 font-mono tabular-nums">
                          {formatMoney(offer.offerAmount)}
                        </strong>
                      </div>

                      {isPending && !isClosed ? (
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          <button
                            type="button"
                            onClick={() => handleAcceptOffer(offer)}
                            className="flex-1 py-1.5 px-2.5 rounded-lg bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-black text-[11px] whitespace-nowrap cursor-pointer transition-colors"
                          >
                            Aceitar
                          </button>
                          <button
                            type="button"
                            onClick={() => handleCounterOffer(offer)}
                            className="flex-1 py-1.5 px-2.5 rounded-lg bg-amber-400/20 hover:bg-amber-400/30 border border-amber-400/40 text-amber-200 font-bold text-[11px] whitespace-nowrap cursor-pointer transition-colors"
                            title={`Pedir ${formatMoney(offer.counterAmount)} (+15%)`}
                          >
                            Pedir +15%
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRejectOffer(offer)}
                            className="py-1.5 px-2.5 rounded-lg bg-slate-800 hover:bg-rose-950/70 border border-slate-700 text-slate-300 hover:text-rose-300 font-semibold text-[11px] cursor-pointer transition-colors"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div className="text-[11px] font-semibold text-slate-400">
                          {offer.status === 'ACCEPTED' && 'Venda concluída pelo valor ofertado.'}
                          {offer.status === 'COUNTER_ACCEPTED' &&
                            `Vendido na contraproposta por ${formatMoney(offer.counterAmount)}!`}
                          {offer.status === 'COUNTER_REJECTED' && 'Clube comprador desistiu.'}
                          {offer.status === 'REJECTED' && 'Proposta recusada por você.'}
                          {offer.status === 'PENDING' && isClosed && 'Expirada no fechamento.'}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Column 2: Pechinchas & Oportunidades de Última Hora */}
          <section className="lg:col-span-5 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <h3 className="text-xs font-black uppercase tracking-wider text-sky-300 flex items-center gap-1.5">
                <Tag className="w-4 h-4" />
                <span>Pechinchas de Última Hora</span>
              </h3>
              <span className="text-[11px] text-slate-400">
                Descontos de 15% a 25% · Registro imediato
              </span>
            </div>

            <div className="space-y-2.5">
              {session.bargainTargets.map((target) => {
                const canAfford = userClub.finances.balance >= target.bargainPrice;
                const squadFull = userClub.squad.length >= 30;
                return (
                  <div
                    key={target.id}
                    className={`p-3.5 rounded-xl border text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                      target.signed
                        ? 'bg-emerald-950/25 border-emerald-500/40'
                        : 'bg-slate-900/85 border-slate-800'
                    }`}
                  >
                    <div className="min-w-0 space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white truncate">{target.player.name}</span>
                        <span className="font-mono font-black text-emerald-400 tabular-nums">
                          OVR {target.player.overall}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 tabular-nums">
                        {target.player.detailedRole} · {target.player.age} anos · {target.sellerClubName}
                      </div>
                      <div className="text-[11px] text-sky-300 font-medium">
                        {target.tagLabel} · Salário {formatMoney(target.requestedWage)}/mês
                      </div>
                    </div>

                    <div className="flex items-center sm:flex-col sm:items-end justify-between gap-2 shrink-0">
                      <div className="text-right tabular-nums">
                        {target.bargainPrice === 0 ? (
                          <div className="font-mono font-black text-emerald-400">Custo Zero</div>
                        ) : (
                          <>
                            <div className="text-[10px] text-slate-500 line-through font-mono">
                              {formatMoney(target.marketValue)}
                            </div>
                            <div className="font-mono font-black text-amber-300">
                              {formatMoney(target.bargainPrice)}{' '}
                              <span className="text-[10px] text-emerald-400">
                                (-{target.discountPct}%)
                              </span>
                            </div>
                          </>
                        )}
                      </div>

                      {target.signed ? (
                        <span className="text-[11px] font-bold text-emerald-400 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Contratado</span>
                        </span>
                      ) : (
                        <button
                          type="button"
                          disabled={isClosed || !canAfford || squadFull}
                          onClick={() => handleSignBargain(target)}
                          className="px-3 py-1.5 rounded-lg bg-sky-400 hover:bg-sky-300 disabled:opacity-45 disabled:cursor-not-allowed text-slate-950 font-black text-[11px] flex items-center gap-1 whitespace-nowrap cursor-pointer transition-colors"
                        >
                          <ShoppingBag className="w-3.5 h-3.5" />
                          <span>{!canAfford ? 'Sem Caixa' : squadFull ? 'Elenco Cheio' : 'Contratar'}</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Column 3: Plantão de Notícias Ao Vivo */}
          <section className="lg:col-span-3 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <Newspaper className="w-4 h-4 text-sky-400" />
                <span>Plantão Ao Vivo</span>
              </h3>
            </div>

            <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
              {session.newsFeed.map((item) => (
                <div
                  key={item.id}
                  className={`p-3 rounded-xl border text-[11px] leading-relaxed ${
                    item.highlight
                      ? 'bg-sky-950/40 border-sky-500/35 text-sky-100'
                      : 'bg-slate-950/75 border-slate-800/80 text-slate-300'
                  }`}
                >
                  <div className="font-mono text-[10px] font-bold text-amber-400 mb-0.5 tabular-nums">
                    {item.hourLabel}
                  </div>
                  <p>{item.headline}</p>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Footer Action Bar */}
        <div className="px-5 py-4 bg-slate-950 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-slate-400">
            {isClosed
              ? 'Janela encerrada com sucesso! Todos os negócios já estão no seu elenco.'
              : 'Avance as horas para acompanhar movimentações de rivais ou finalize quando estiver pronto.'}
          </p>

          <div className="flex items-center gap-2.5 shrink-0">
            {!isClosed ? (
              <>
                <button
                  type="button"
                  onClick={handleAdvanceTwoHours}
                  className="px-4 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs flex items-center gap-1.5 whitespace-nowrap cursor-pointer transition-colors"
                >
                  <Clock className="w-4 h-4" />
                  <span>Avançar +2 Horas</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playClick();
                    onCloseWindowComplete(session.windowKey);
                  }}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-bold text-xs flex items-center gap-1.5 whitespace-nowrap cursor-pointer transition-colors"
                >
                  <span>Encerrar Plantão</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => {
                  soundEngine.playClick();
                  onCloseWindowComplete(session.windowKey);
                }}
                className="px-5 py-2.5 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-black text-xs flex items-center gap-1.5 whitespace-nowrap cursor-pointer transition-colors"
              >
                <Sparkles className="w-4 h-4" />
                <span>Voltar à Carreira</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
