import React, { useEffect, useMemo, useState } from 'react';
import {
  ContinentalCompId,
  NationalStandingRow,
  NationalTeamProfile,
} from '../types/game';
import {
  getNationalTeamById,
  NationalTournamentDrawInfo,
} from '../utils/nationalTeamEngine';
import { soundEngine } from '../services/soundEngine';
import {
  CheckCircle2,
  FastForward,
  Globe,
  Play,
  Shuffle,
  Sparkles,
  Trophy,
  X,
} from 'lucide-react';

interface NationalTournamentDrawModalProps {
  isOpen: boolean;
  onClose: () => void;
  drawInfo: NationalTournamentDrawInfo | null;
  activeUserTeamId: string | null;
  onGenerateDraw: (compId: 'world_cup' | ContinentalCompId) => void;
  TeamCrest: React.ComponentType<{ team: NationalTeamProfile; size?: 'sm' | 'md' | 'lg' }>;
}

interface NationalGroupCard {
  id: string;
  groupName: string;
  rows: NationalStandingRow[];
}

export const NationalTournamentDrawModal: React.FC<NationalTournamentDrawModalProps> = ({
  isOpen,
  onClose,
  drawInfo,
  activeUserTeamId,
  onGenerateDraw,
  TeamCrest,
}) => {
  const [revealedCount, setRevealedCount] = useState<number>(0);
  const [autoDrawing, setAutoDrawing] = useState<boolean>(false);
  const [generatedNotice, setGeneratedNotice] = useState<boolean>(false);
  const [showPots, setShowPots] = useState<boolean>(true);

  const groupCards = useMemo<NationalGroupCard[]>(() => {
    if (!drawInfo) return [];
    const groupsMap = new Map<string, NationalStandingRow[]>();
    drawInfo.edition.standings.forEach((row) => {
      const grp = row.group || 'Grupo Único';
      const list = groupsMap.get(grp) || [];
      list.push(row);
      groupsMap.set(grp, list);
    });
    return Array.from(groupsMap.entries()).map(([groupName, rows]) => ({
      id: `${drawInfo.editionId}_${groupName}`,
      groupName,
      rows,
    }));
  }, [drawInfo]);

  useEffect(() => {
    if (!isOpen || !drawInfo) return;
    setGeneratedNotice(false);
    setAutoDrawing(false);
    if (drawInfo.alreadyDrawn || drawInfo.hasPlayedMatches) {
      setRevealedCount(groupCards.length);
    } else {
      setRevealedCount(0);
    }
  }, [isOpen, drawInfo?.editionId]);

  useEffect(() => {
    if (!isOpen || !autoDrawing) return;
    if (revealedCount >= groupCards.length) {
      setAutoDrawing(false);
      return;
    }
    const timer = window.setTimeout(() => {
      soundEngine.playClick();
      setRevealedCount((prev) => Math.min(groupCards.length, prev + 1));
    }, 320);
    return () => window.clearTimeout(timer);
  }, [isOpen, autoDrawing, revealedCount, groupCards.length]);

  if (!isOpen || !drawInfo) return null;

  const isComplete = revealedCount >= groupCards.length && groupCards.length > 0;
  const userGroupCard = activeUserTeamId
    ? groupCards.find((card) => card.rows.some((r) => r.teamId === activeUserTeamId))
    : undefined;

  const handleGenerateClick = () => {
    soundEngine.playFanfare();
    onGenerateDraw(drawInfo.compId);
    setGeneratedNotice(true);
    setRevealedCount(0);
    setAutoDrawing(true);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-slate-950 border border-amber-500/35 rounded-3xl w-full max-w-6xl my-auto max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-black via-slate-950 to-amber-950/20 border-b border-slate-800 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-amber-400/15 border border-amber-400/35 flex items-center justify-center shrink-0">
              <Trophy className="w-6 h-6 text-amber-400" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2 text-xs text-amber-300 font-bold">
                <Globe className="w-3.5 h-3.5" />
                <span>Cerimônia Oficial de Sorteio · Seleções ({drawInfo.year})</span>
                {drawInfo.qualifiersComplete && (
                  <span className="px-2 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/35 text-emerald-300 text-[10px] font-black">
                    Eliminatórias Concluídas
                  </span>
                )}
              </div>
              <h2 className="text-lg sm:text-xl font-black text-white mt-0.5">
                {drawInfo.title} · {drawInfo.hostName}
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                {drawInfo.participantCount} seleções classificadas distribuídas em {drawInfo.pots.length}{' '}
                {drawInfo.compId === 'nations_league' ? 'ligas oficiais' : 'potes por Ranking FIFA'} · {groupCards.length} grupos
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              soundEngine.playClick();
              onClose();
            }}
            className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action & Ceremony Controls Bar */}
        <div className="px-5 py-3.5 bg-slate-900/75 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {drawInfo.canDrawGroups && (
              <button
                type="button"
                onClick={handleGenerateClick}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-black text-xs transition-all cursor-pointer shadow-lg shadow-emerald-500/20"
              >
                <Shuffle className="w-3.5 h-3.5" />
                <span>
                  {drawInfo.alreadyDrawn
                    ? 'Sortear Novos Grupos'
                    : 'Gerar Sorteio dos Grupos'}
                </span>
              </button>
            )}

            {groupCards.length > 0 && !isComplete && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playClick();
                    setRevealedCount((prev) => Math.min(groupCards.length, prev + 1));
                  }}
                  className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs transition-all cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>
                    {revealedCount === 0 ? 'Revelar 1º Grupo' : 'Revelar Próximo Grupo'}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playClick();
                    setAutoDrawing((prev) => !prev);
                  }}
                  className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs border border-slate-700 transition-all cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5 text-amber-400" />
                  <span>{autoDrawing ? 'Pausar Revelação' : 'Revelar em Sequência'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playFanfare();
                    setAutoDrawing(false);
                    setRevealedCount(groupCards.length);
                  }}
                  className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs border border-slate-700 transition-all cursor-pointer"
                >
                  <FastForward className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Revelar Todos</span>
                </button>
              </>
            )}

            <button
              type="button"
              onClick={() => setShowPots((prev) => !prev)}
              className="px-3 py-2 rounded-xl bg-slate-950 hover:bg-slate-800 text-slate-300 text-xs font-bold border border-slate-800 transition-colors cursor-pointer"
            >
              {showPots ? 'Ocultar Potes' : 'Ver Potes dos Classificados'}
            </button>
          </div>

          <div className="flex items-center gap-3">
            {isComplete && (
              <span className="flex items-center gap-1.5 text-xs font-extrabold text-emerald-400">
                <CheckCircle2 className="w-4 h-4" />
                Grupos & Tabela Definidos!
              </span>
            )}
            <span className="text-xs font-mono font-bold text-slate-400 tabular-nums">
              Grupos Revelados: {revealedCount} / {groupCards.length}
            </span>
          </div>
        </div>

        {/* Status / Feedback Strip */}
        {generatedNotice && (
          <div className="px-5 py-2.5 bg-emerald-500/10 border-b border-emerald-500/30 text-xs text-emerald-300 font-bold flex flex-wrap items-center justify-between gap-2">
            <span>
              Sorteio oficial executado com sucesso! Novos grupos e confrontos de {drawInfo.title} foram gravados no calendário.
            </span>
            {userGroupCard && (
              <span className="text-amber-300 font-black">
                Sua Seleção caiu no {userGroupCard.groupName}
              </span>
            )}
          </div>
        )}

        {drawInfo.hasPlayedMatches && (
          <div className="px-5 py-2.5 bg-slate-900 border-b border-slate-800 text-xs text-slate-300">
            Esta edição já possui partidas disputadas. O sorteio permanece bloqueado para preservar os resultados em andamento.
          </div>
        )}

        {/* Body */}
        <div className="p-5 overflow-y-auto space-y-6 flex-1 min-h-0 bg-slate-950">
          {/* Pots of Qualified National Teams */}
          {showPots && drawInfo.pots.length > 0 && (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-black text-slate-300 uppercase tracking-wider">
                  {drawInfo.compId === 'nations_league'
                    ? 'Divisões Oficiais UEFA Nations League'
                    : 'Potes Oficiais do Sorteio (Ranking FIFA)'}
                </h3>
                {activeUserTeamId && (
                  <span className="text-[11px] font-bold text-amber-300">
                    {drawInfo.userTeamQualified
                      ? 'Sua Seleção está classificada e destacada em dourado'
                      : 'Sua Seleção não participa desta edição'}
                  </span>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {drawInfo.pots.map((pot) => (
                  <div
                    key={pot.label}
                    className="bg-slate-900/80 border border-slate-800 rounded-2xl p-3 space-y-2"
                  >
                    <div className="text-xs font-black text-amber-300 border-b border-slate-800 pb-1.5 flex items-center justify-between">
                      <span>{pot.label}</span>
                      <span className="text-[11px] font-mono text-slate-400">
                        {pot.teamIds.length} seleções
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {pot.teamIds.map((tid) => {
                        const team = getNationalTeamById(tid);
                        const isMine = activeUserTeamId === tid;
                        return (
                          <span
                            key={tid}
                            className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-[11px] font-bold border ${
                              isMine
                                ? 'bg-amber-500/20 border-amber-400 text-amber-200 font-black'
                                : 'bg-slate-950 border-slate-800 text-slate-200'
                            }`}
                          >
                            <TeamCrest team={team} size="sm" />
                            <span>{team.code}</span>
                          </span>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Group Cards */}
          {revealedCount === 0 && drawInfo.canDrawGroups && !drawInfo.alreadyDrawn ? (
            <div className="rounded-2xl border border-dashed border-amber-500/35 bg-slate-900/40 p-8 text-center space-y-3">
              <Shuffle className="w-8 h-8 text-amber-400 mx-auto" />
              <h3 className="text-base font-black text-white">
                Pronto para o Sorteio Oficial de {drawInfo.title}
              </h3>
              <p className="text-xs text-slate-400 max-w-xl mx-auto">
                Clique em <strong className="text-emerald-300">Gerar Sorteio dos Grupos</strong> acima para embaralhar os potes oficiais respeitando os cabeças de chave e regras de confederação, criando os novos grupos e confrontos da competição.
              </p>
              <button
                type="button"
                onClick={handleGenerateClick}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-black text-xs cursor-pointer transition-colors"
              >
                <Shuffle className="w-4 h-4" />
                <span>Gerar Sorteio Agora</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
              {groupCards.map((card, idx) => {
                const isRevealed = idx < revealedCount;
                const hasUser = Boolean(
                  activeUserTeamId && card.rows.some((r) => r.teamId === activeUserTeamId)
                );

                return (
                  <div
                    key={card.id}
                    className={`rounded-2xl border p-4 transition-all duration-300 ${
                      isRevealed
                        ? hasUser
                          ? 'bg-amber-950/20 border-amber-400/60 shadow-lg shadow-amber-500/10'
                          : 'bg-slate-900/90 border-slate-700/80'
                        : 'bg-slate-950 border-slate-800/60 opacity-45'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 pb-2 mb-2.5 border-b border-slate-800">
                      <span className="text-xs font-black text-white">
                        {card.groupName}
                      </span>
                      {hasUser && isRevealed && (
                        <span className="px-2 py-0.5 rounded bg-amber-400/20 border border-amber-400/40 text-amber-300 text-[10px] font-black">
                          Sua Seleção
                        </span>
                      )}
                    </div>

                    {isRevealed ? (
                      <div className="space-y-2">
                        {card.rows.map((row, rIdx) => {
                          const team = getNationalTeamById(row.teamId);
                          const isMine = activeUserTeamId === row.teamId;
                          return (
                            <div
                              key={row.teamId}
                              className={`flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-xl border text-xs ${
                                isMine
                                  ? 'bg-amber-500/15 border-amber-400/50 text-amber-200 font-black'
                                  : 'bg-slate-950/80 border-slate-800 text-slate-200'
                              }`}
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="text-[10px] font-mono text-slate-500 w-4 shrink-0">
                                  {rIdx + 1}.
                                </span>
                                <TeamCrest team={team} size="sm" />
                                <span className="truncate">{team.name}</span>
                              </div>
                              <span className="text-[10px] font-mono text-slate-400 shrink-0">
                                {team.confederation}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="py-6 text-center text-[11px] font-mono text-slate-600">
                        Aguardando bolinha do sorteio...
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
