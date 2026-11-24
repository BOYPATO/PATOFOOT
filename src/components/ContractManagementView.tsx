import React, { useMemo, useState } from 'react';
import { Club, Player } from '../types/game';
import { soundEngine } from '../services/soundEngine';
import {
  computeDefaultReleaseClause,
  getPlayerRenewalExpectations,
} from '../utils/contractLifecycleEngine';
import {
  formatPlayerNationalityFull,
  resolvePlayerNationality,
} from '../utils/nationalityUtils';
import { comparePlayersByPosition } from '../utils/playerOrdering';
import { PlayerAvatar } from './PlayerAvatar';
import { usePlayerInspection } from '../context/PlayerInspectionContext';
import confetti from 'canvas-confetti';
import {
  FileSignature,
  Search,
  CheckCircle2,
  XCircle,
  X,
  AlertTriangle,
  Shield,
} from 'lucide-react';

interface ContractManagementViewProps {
  userClub: Club;
  seasonYear: number;
  onRenewContract: (
    playerId: string,
    proposedYears: number,
    proposedWage: number,
    proposedReleaseClause: number,
    signingBonus: number
  ) => { accepted: boolean; feedbackText: string };
  onNavigateToBosmanMarket?: () => void;
}

export const ContractManagementView: React.FC<ContractManagementViewProps> = ({
  userClub,
  seasonYear,
  onRenewContract,
  onNavigateToBosmanMarket,
}) => {
  const inspection = usePlayerInspection();
  const [filterMode, setFilterMode] = useState<'ALL' | 'EXPIRING' | 'STARTERS' | 'VETERANS'>('ALL');
  const [sortMode, setSortMode] = useState<'POS_ASC' | 'EXPIRY_ASC'>('POS_ASC');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Renewal Modal state
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [proposedYears, setProposedYears] = useState<number>(3);
  const [proposedWage, setProposedWage] = useState<number>(50000);
  const [proposedClause, setProposedClause] = useState<number>(5000000);
  const [signingBonus, setSigningBonus] = useState<number>(0);
  const [feedback, setFeedback] = useState<{ accepted: boolean; text: string } | null>(null);

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      maximumFractionDigits: 0,
    }).format(val);

  const expiringCount = useMemo(
    () =>
      userClub.squad.filter(
        (p) => !p.isLoan && p.contractYears <= 1 && !p.retiringAtSeasonEnd && !p.preContractClubId
      ).length,
    [userClub.squad]
  );

  const retiringCount = useMemo(
    () => userClub.squad.filter((p) => p.retiringAtSeasonEnd || p.age >= 35).length,
    [userClub.squad]
  );

  const totalPayroll = useMemo(
    () => userClub.squad.reduce((acc, p) => acc + p.wage, 0),
    [userClub.squad]
  );

  const highestClause = useMemo(() => {
    if (userClub.squad.length === 0) return 0;
    return Math.max(
      ...userClub.squad.map((p) => p.releaseClause || computeDefaultReleaseClause(p))
    );
  }, [userClub.squad]);

  const filteredSquad = useMemo(() => {
    return [...userClub.squad]
      .filter((p) => {
        if (filterMode === 'EXPIRING') {
          if (p.isLoan || p.contractYears > 1) return false;
        } else if (filterMode === 'STARTERS') {
          if (!p.isStarter) return false;
        } else if (filterMode === 'VETERANS') {
          if (p.age < 33 && !p.retiringAtSeasonEnd) return false;
        }

        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const pNat = resolvePlayerNationality(p, userClub.country || 'Brasil').toLowerCase();
          if (
            !p.name.toLowerCase().includes(q) &&
            !p.detailedRole.toLowerCase().includes(q) &&
            !pNat.includes(q)
          ) {
            return false;
          }
        }
        return true;
      })
      .sort((a, b) => {
        if (sortMode === 'POS_ASC') {
          return comparePlayersByPosition(a, b);
        }
        if (a.contractYears !== b.contractYears) {
          return a.contractYears - b.contractYears;
        }
        return comparePlayersByPosition(a, b);
      });
  }, [userClub.squad, userClub.country, filterMode, sortMode, searchQuery]);

  const modalPlayer: Player | undefined = useMemo(
    () => userClub.squad.find((p) => p.id === selectedPlayerId),
    [userClub.squad, selectedPlayerId]
  );

  const expectations = useMemo(
    () => (modalPlayer ? getPlayerRenewalExpectations(modalPlayer, userClub) : null),
    [modalPlayer, userClub]
  );

  const handleOpenRenewalModal = (player: Player) => {
    soundEngine.playClick();
    const exp = getPlayerRenewalExpectations(player, userClub);
    setSelectedPlayerId(player.id);
    setProposedYears(exp.recommendedYears);
    setProposedWage(exp.desiredWage);
    setProposedClause(player.releaseClause || exp.suggestedReleaseClause);
    setSigningBonus(0);
    setFeedback(null);
  };

  const handleSubmitRenewal = () => {
    if (!modalPlayer) return;
    soundEngine.playClick();
    const result = onRenewContract(
      modalPlayer.id,
      proposedYears,
      proposedWage,
      proposedClause,
      signingBonus
    );
    setFeedback({ accepted: result.accepted, text: result.feedbackText });

    if (result.accepted) {
      soundEngine.playFanfare();
      confetti({ particleCount: 70, spread: 70 });
      setTimeout(() => {
        setSelectedPlayerId(null);
        setFeedback(null);
      }, 1500);
    } else {
      soundEngine.playWhistle(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Top Summary Section */}
      <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-slate-800">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <FileSignature className="w-5 h-5 text-sky-400 shrink-0" />
              <span>Gestão de Contratos, Multas Rescisórias & Ciclo de Carreira</span>
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Renove vínculos antes do último ano para evitar saídas gratuitas pela Lei Bosman, ajuste multas rescisórias e acompanhe veteranos próximos da aposentadoria.
            </p>
          </div>

          {onNavigateToBosmanMarket && (
            <button
              type="button"
              onClick={() => {
                soundEngine.playClick();
                onNavigateToBosmanMarket();
              }}
              className="px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Explorar Pré-Contratos no Mercado
            </button>
          )}
        </div>

        {/* 4-Metric KPI Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 pt-4">
          <div>
            <span className="text-xs text-slate-400 block">Último Ano (Risco Bosman)</span>
            <span
              className={`text-lg font-bold font-mono tabular-nums mt-0.5 block ${
                expiringCount > 0 ? 'text-amber-400' : 'text-emerald-400'
              }`}
            >
              {expiringCount} {expiringCount === 1 ? 'atleta' : 'atletas'}
            </span>
          </div>

          <div>
            <span className="text-xs text-slate-400 block">Folha Salarial Mensal</span>
            <span className="text-lg font-bold font-mono tabular-nums text-white mt-0.5 block">
              {formatCurrency(totalPayroll)}
            </span>
          </div>

          <div>
            <span className="text-xs text-slate-400 block">Maior Multa Rescisória</span>
            <span className="text-lg font-bold font-mono tabular-nums text-sky-400 mt-0.5 block">
              {formatCurrency(highestClause)}
            </span>
          </div>

          <div>
            <span className="text-xs text-slate-400 block">Veteranos 35+ / Aposentadoria</span>
            <span className="text-lg font-bold font-mono tabular-nums text-slate-200 mt-0.5 block">
              {retiringCount} no plantel
            </span>
          </div>
        </div>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1 p-1 bg-slate-900 rounded-lg overflow-x-auto">
          <button
            type="button"
            onClick={() => {
              soundEngine.playClick();
              setFilterMode('ALL');
            }}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              filterMode === 'ALL'
                ? 'bg-sky-500 text-slate-950 font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Todos ({userClub.squad.length})
          </button>
          <button
            type="button"
            onClick={() => {
              soundEngine.playClick();
              setFilterMode('EXPIRING');
            }}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              filterMode === 'EXPIRING'
                ? 'bg-amber-400 text-slate-950 font-bold'
                : 'text-slate-400 hover:text-amber-300'
            }`}
          >
            Último Ano ({expiringCount})
          </button>
          <button
            type="button"
            onClick={() => {
              soundEngine.playClick();
              setFilterMode('STARTERS');
            }}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              filterMode === 'STARTERS'
                ? 'bg-sky-500 text-slate-950 font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Titulares
          </button>
          <button
            type="button"
            onClick={() => {
              soundEngine.playClick();
              setFilterMode('VETERANS');
            }}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              filterMode === 'VETERANS'
                ? 'bg-sky-500 text-slate-950 font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Veteranos (33+)
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={sortMode}
            onChange={(e) => {
              soundEngine.playClick();
              setSortMode(e.target.value as 'POS_ASC' | 'EXPIRY_ASC');
            }}
            aria-label="Ordenar contratos"
            className="bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-sky-500 cursor-pointer"
          >
            <option value="POS_ASC">Ordenar: Posição (GOL → ATA)</option>
            <option value="EXPIRY_ASC">Ordenar: Vencimento Próximo</option>
          </select>

          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar atleta ou posição..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
            />
          </div>
        </div>
      </div>

      {/* Contracts Data Table */}
      <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden">
        {filteredSquad.length === 0 ? (
          <div className="p-10 text-center space-y-3">
            <p className="text-sm font-semibold text-slate-300">
              Nenhum atleta encontrado para o filtro selecionado.
            </p>
            <button
              type="button"
              onClick={() => {
                setFilterMode('ALL');
                setSearchQuery('');
              }}
              className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Limpar Filtros
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 bg-slate-900/60">
                  <th className="py-3 px-4 font-semibold">Atleta</th>
                  <th className="py-3 px-3 font-semibold text-center">Pos</th>
                  <th className="py-3 px-3 font-semibold text-center">OVR</th>
                  <th className="py-3 px-3 font-semibold text-right">Idade</th>
                  <th className="py-3 px-4 font-semibold text-right">Vínculo</th>
                  <th className="py-3 px-4 font-semibold text-right">Salário Mensal</th>
                  <th className="py-3 px-4 font-semibold text-right">Multa Rescisória</th>
                  <th className="py-3 px-4 font-semibold">Situação Contratual</th>
                  <th className="py-3 px-4 font-semibold text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {filteredSquad.map((player) => {
                  const clause = player.releaseClause || computeDefaultReleaseClause(player);
                  const endYear = seasonYear + (player.contractYears || 1) - 1;
                  const isExpiring =
                    !player.isLoan &&
                    player.contractYears <= 1 &&
                    !player.retiringAtSeasonEnd &&
                    !player.preContractClubId;

                  let statusText = 'Contrato blindado';
                  let statusClass = 'text-emerald-400';

                  if (player.isLoan) {
                    statusText = `Emprestado (${player.loanRoundsRemaining || 0} rodadas)`;
                    statusClass = 'text-sky-300';
                  } else if (player.retiringAtSeasonEnd) {
                    statusText = `Aposenta em Dez/${seasonYear}`;
                    statusClass = 'text-slate-300';
                  } else if (player.preContractClubId) {
                    statusText = `Pré-contrato c/ ${player.preContractClubName}`;
                    statusClass = 'text-rose-400 font-semibold';
                  } else if (isExpiring) {
                    statusText = 'Último ano · Risco Lei Bosman';
                    statusClass = 'text-amber-400 font-semibold';
                  } else if (player.age >= 35) {
                    statusText = 'Veterano em fim de carreira';
                    statusClass = 'text-slate-300';
                  }

                  const canClickRenew =
                    !player.isLoan && !player.retiringAtSeasonEnd && !player.preContractClubId;

                  return (
                    <tr
                      key={player.id}
                      className="hover:bg-slate-900/50 transition-colors"
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <PlayerAvatar
                            player={player}
                            club={userClub}
                            clubPrimaryColor={userClub.colors.primary}
                            clubTextColor={userClub.colors.text}
                            size="sm"
                          />
                          <div>
                            <button
                              type="button"
                              onClick={() => {
                                soundEngine.playClick();
                                inspection?.inspectPlayer(player, userClub);
                              }}
                              className="font-bold text-white hover:text-sky-300 transition-colors text-sm text-left cursor-pointer"
                            >
                              {player.name}
                            </button>
                            <div className="text-[11px] text-slate-400 mt-0.5 tabular-nums">
                              <span>#{player.squadNumber}</span>
                              <span aria-hidden="true"> · </span>
                              <span className="text-slate-300">
                                {formatPlayerNationalityFull(player, userClub.country)}
                              </span>
                              <span aria-hidden="true"> · </span>
                              <span>{player.isStarter ? 'Titular' : 'Reserva'}</span>
                              <span aria-hidden="true"> · </span>
                              <span>Passe {formatCurrency(player.marketValue)}</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-3 text-center font-bold text-sky-400">
                        {player.detailedRole}
                      </td>

                      <td className="py-3 px-3 text-center font-mono font-bold text-white tabular-nums">
                        {player.overall}
                      </td>

                      <td className="py-3 px-3 text-right font-mono text-slate-300 tabular-nums whitespace-nowrap">
                        {player.age} anos
                      </td>

                      <td className="py-3 px-4 text-right font-mono tabular-nums whitespace-nowrap">
                        <div
                          className={`font-bold ${
                            isExpiring ? 'text-amber-400' : 'text-white'
                          }`}
                        >
                          {player.isLoan
                            ? 'Empréstimo'
                            : `${player.contractYears} ${
                                player.contractYears === 1 ? 'ano' : 'anos'
                              }`}
                        </div>
                        {!player.isLoan && (
                          <div className="text-[11px] text-slate-500">até Dez/{endYear}</div>
                        )}
                      </td>

                      <td className="py-3 px-4 text-right font-mono text-slate-200 tabular-nums whitespace-nowrap">
                        {formatCurrency(player.wage)}
                      </td>

                      <td className="py-3 px-4 text-right font-mono text-sky-300 font-semibold tabular-nums whitespace-nowrap">
                        {player.isLoan ? '—' : formatCurrency(clause)}
                      </td>

                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center gap-1.5 ${statusClass}`}>
                          {isExpiring && <AlertTriangle className="w-3.5 h-3.5 shrink-0" />}
                          <span>{statusText}</span>
                        </span>
                      </td>

                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        {canClickRenew ? (
                          <button
                            type="button"
                            onClick={() => handleOpenRenewalModal(player)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                              isExpiring
                                ? 'bg-amber-400 hover:bg-amber-300 text-slate-950'
                                : 'bg-slate-800 hover:bg-slate-700 text-white border border-slate-700'
                            }`}
                          >
                            Renovar
                          </button>
                        ) : (
                          <span className="text-[11px] text-slate-500">Indisponível</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Interactive Contract Renewal & Release Clause Modal */}
      {modalPlayer && expectations && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-start justify-center p-2 sm:p-4 overflow-y-auto">
          <div className="bg-slate-950 border border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl relative space-y-5 my-auto">
            <button
              type="button"
              onClick={() => setSelectedPlayerId(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1.5 rounded-lg bg-slate-900 border border-slate-800 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Header */}
            <div className="pr-8">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <FileSignature className="w-5 h-5 text-sky-400 shrink-0" />
                <span>Renovação Contratual: {modalPlayer.name}</span>
              </h3>
              <p className="text-xs text-slate-400 mt-1 tabular-nums">
                <span>{modalPlayer.detailedRole}</span>
                <span aria-hidden="true"> · </span>
                <span>OVR {modalPlayer.overall}</span>
                <span aria-hidden="true"> · </span>
                <span>{modalPlayer.age} anos</span>
                <span aria-hidden="true"> · </span>
                <span className="text-slate-300">
                  {formatPlayerNationalityFull(modalPlayer, userClub.country)}
                </span>
                <span aria-hidden="true"> · </span>
                <span>Passe {formatCurrency(modalPlayer.marketValue)}</span>
              </p>
            </div>

            {/* Current vs Agent Expectations */}
            <div className="grid grid-cols-2 gap-4 py-3 border-y border-slate-800 text-xs tabular-nums">
              <div>
                <span className="text-slate-500 block">Salário Atual · Vínculo</span>
                <strong className="text-slate-200 font-mono text-sm">
                  {formatCurrency(modalPlayer.wage)}/mês
                </strong>
                <span className="text-slate-400 block mt-0.5">
                  Restam {modalPlayer.contractYears} ano(s)
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">Pedida do Empresário</span>
                <strong className="text-emerald-400 font-mono text-sm">
                  {formatCurrency(expectations.desiredWage)}/mês
                </strong>
                <span className="text-slate-400 block mt-0.5">
                  Duração ideal: {expectations.recommendedYears} ano(s)
                </span>
              </div>
            </div>

            {/* Contract Length Selector */}
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <label className="font-semibold text-slate-300">
                  Nova Duração do Vínculo (anos)
                </label>
                <span className="font-mono text-sky-400 font-bold tabular-nums">
                  Até Dez/{seasonYear + proposedYears - 1}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5]
                  .filter((yr) => yr <= expectations.maxAllowedYears)
                  .map((yr) => (
                    <button
                      key={yr}
                      type="button"
                      onClick={() => setProposedYears(yr)}
                      className={`flex-1 py-2 rounded-lg font-mono font-bold text-xs border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                        proposedYears === yr
                          ? 'bg-sky-500 text-slate-950 border-sky-400'
                          : 'bg-slate-900 text-slate-300 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      {yr} {yr === 1 ? 'ano' : 'anos'}
                    </button>
                  ))}
              </div>
            </div>

            {/* Proposed Monthly Salary */}
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <label className="font-semibold text-slate-300">Salário Mensal Proposto</label>
                <strong className="font-mono text-emerald-400 text-sm tabular-nums">
                  {formatCurrency(proposedWage)}/mês
                </strong>
              </div>
              <input
                type="range"
                min={Math.max(10000, Math.round(modalPlayer.wage * 0.75))}
                max={Math.max(expectations.desiredWage * 1.6, modalPlayer.wage * 1.8)}
                step={2000}
                value={proposedWage}
                onChange={(e) => setProposedWage(Number(e.target.value))}
                className="w-full accent-emerald-400 cursor-pointer"
              />
              <div className="flex items-center gap-2 pt-0.5">
                <button
                  type="button"
                  onClick={() => setProposedWage(expectations.minAcceptableWage)}
                  className="px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[11px] text-slate-300 whitespace-nowrap shrink-0 cursor-pointer"
                >
                  Piso ({formatCurrency(expectations.minAcceptableWage)})
                </button>
                <button
                  type="button"
                  onClick={() => setProposedWage(expectations.desiredWage)}
                  className="px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[11px] text-emerald-300 whitespace-nowrap shrink-0 cursor-pointer"
                >
                  Pedida ({formatCurrency(expectations.desiredWage)})
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setProposedWage(Math.round((expectations.desiredWage * 1.15) / 1000) * 1000)
                  }
                  className="px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[11px] text-sky-300 whitespace-nowrap shrink-0 cursor-pointer"
                >
                  Valorizar +15%
                </button>
              </div>
            </div>

            {/* Release Clause Slider */}
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <label className="font-semibold text-slate-300 flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-sky-400" />
                  <span>Nova Multa Rescisória</span>
                </label>
                <strong className="font-mono text-sky-300 text-sm tabular-nums">
                  {formatCurrency(proposedClause)}
                </strong>
              </div>
              <input
                type="range"
                min={expectations.minReleaseClause}
                max={expectations.maxReleaseClause}
                step={250000}
                value={proposedClause}
                onChange={(e) => setProposedClause(Number(e.target.value))}
                className="w-full accent-sky-400 cursor-pointer"
              />
              <div className="flex items-center justify-between text-[11px] text-slate-500 tabular-nums">
                <span>Mín: {formatCurrency(expectations.minReleaseClause)}</span>
                <span>Sugerida: {formatCurrency(expectations.suggestedReleaseClause)}</span>
                <span>Blindagem: {formatCurrency(expectations.maxReleaseClause)}</span>
              </div>
            </div>

            {/* Optional Signing Bonus (Luvas) */}
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <label className="font-semibold text-slate-300">
                  Luvas de Assinatura (À Vista do Caixa: {formatCurrency(userClub.finances.balance)})
                </label>
                <strong className="font-mono text-slate-200 tabular-nums">
                  {signingBonus > 0 ? formatCurrency(signingBonus) : 'Sem luvas'}
                </strong>
              </div>
              <input
                type="range"
                min={0}
                max={Math.min(
                  Math.max(0, userClub.finances.balance),
                  Math.max(200000, modalPlayer.wage * 6)
                )}
                step={25000}
                value={signingBonus}
                onChange={(e) => setSigningBonus(Number(e.target.value))}
                className="w-full accent-amber-400 cursor-pointer"
              />
            </div>

            {/* Feedback */}
            {feedback && (
              <div
                className={`p-3 rounded-xl text-xs font-semibold flex items-center gap-2 border ${
                  feedback.accepted
                    ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                    : 'bg-rose-500/15 border-rose-500/40 text-rose-300'
                }`}
              >
                {feedback.accepted ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                ) : (
                  <XCircle className="w-4 h-4 shrink-0 text-rose-400" />
                )}
                <span>{feedback.text}</span>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setSelectedPlayerId(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSubmitRenewal}
                className="px-5 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                Formalizar Proposta de Renovação
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
