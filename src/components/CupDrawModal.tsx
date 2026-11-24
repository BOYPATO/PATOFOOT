import React, { useEffect, useMemo, useState } from 'react';
import { Club, CompetitionType, Fixture, Standing } from '../types/game';
import { COMPETITIONS_CATALOG } from '../utils/competitionsEngine';
import { getIntercontinentalSlotLabel } from '../utils/intercontinentalEngine';
import { soundEngine } from '../services/soundEngine';
import { X, Play, FastForward, CheckCircle2, Sparkles } from 'lucide-react';

interface CupDrawModalProps {
  isOpen: boolean;
  onClose: () => void;
  competition: CompetitionType;
  seasonYear: number;
  clubs: Club[];
  userClubId: string;
  fixtures: Fixture[];
  standings?: Standing[];
  canGenerateDraw?: boolean;
  alreadyDrawn?: boolean;
  onGenerateDraw?: (competition: CompetitionType) => void;
  onCompleteDraw?: (competition: CompetitionType) => void;
}

interface DrawCardItem {
  id: string;
  header: string;
  lines: Array<{ clubId: string; label: string; isUser: boolean }>;
}

export const CupDrawModal: React.FC<CupDrawModalProps> = ({
  isOpen,
  onClose,
  competition,
  seasonYear,
  clubs,
  userClubId,
  fixtures,
  standings = [],
  canGenerateDraw = false,
  alreadyDrawn = false,
  onGenerateDraw,
  onCompleteDraw,
}) => {
  const clubMap = useMemo(() => new Map(clubs.map((c) => [c.id, c])), [clubs]);
  const meta = COMPETITIONS_CATALOG[competition] || COMPETITIONS_CATALOG.copa_brasil;

  const drawCards = useMemo<DrawCardItem[]>(() => {
    const resolveName = (teamId: string): string => {
      if (teamId === 'TBD_UCL_CHAMP') return 'Campeão da UEFA Champions League';
      if (teamId.toUpperCase().startsWith('TBD')) return getIntercontinentalSlotLabel(teamId);
      return clubMap.get(teamId)?.name || teamId.toUpperCase();
    };

    const isUefaComp =
      competition === 'champions_league' ||
      competition === 'europa_league' ||
      competition === 'conference_league';

    if (isUefaComp && standings.length >= 36) {
      const leagueFixtures = fixtures.filter((f) =>
        (f.cupPhase || '').toLowerCase().includes('fase de liga')
      );
      const allLeagueDone =
        leagueFixtures.length > 0 && leagueFixtures.every((f) => f.played);

      // Enquanto a Fase de Liga estiver em andamento/início, exibe o Sorteio Oficial dos Potes (36 clubes) + Confrontos
      if (!allLeagueDone) {
        const seededRows = [...standings].sort((a, b) => {
          const ca = clubMap.get(a.teamId);
          const cb = clubMap.get(b.teamId);
          return (cb?.reputation || 0) - (ca?.reputation || 0);
        });
        const potCount = competition === 'conference_league' ? 6 : 4;
        const perPot = competition === 'conference_league' ? 6 : 9;

        const cards: DrawCardItem[] = Array.from({ length: potCount }, (_, pIdx) => {
          const slice = seededRows.slice(pIdx * perPot, (pIdx + 1) * perPot);
          return {
            id: `uefa_pot_${pIdx + 1}`,
            header: `Pote ${pIdx + 1} · Fase de Liga (${perPot} clubes)`,
            lines: slice.map((r) => {
              const c = clubMap.get(r.teamId);
              return {
                clubId: r.teamId,
                label: `${resolveName(r.teamId)}${c?.country ? ` · ${c.country}` : ''}`,
                isUser: r.teamId === userClubId,
              };
            }),
          };
        });

        const userLeagueMatches = leagueFixtures
          .filter((f) => f.homeTeamId === userClubId || f.awayTeamId === userClubId)
          .sort((a, b) => a.round - b.round);

        if (userLeagueMatches.length > 0) {
          cards.push({
            id: 'uefa_user_schedule',
            header: `Adversários Sorteados (${userLeagueMatches.length} rodadas)`,
            lines: userLeagueMatches.map((f) => {
              const isHome = f.homeTeamId === userClubId;
              const oppId = isHome ? f.awayTeamId : f.homeTeamId;
              return {
                clubId: oppId,
                label: `R${f.round} · ${resolveName(oppId)} (${isHome ? 'Casa' : 'Fora'})`,
                isUser: true,
              };
            }),
          });
        } else {
          const r1Matches = leagueFixtures.filter((f) => f.round === 1).slice(0, 6);
          if (r1Matches.length > 0) {
            cards.push({
              id: 'uefa_r1_highlights',
              header: 'Destaques Sorteados · Rodada 1',
              lines: r1Matches.map((f) => ({
                clubId: f.homeTeamId,
                label: `${clubMap.get(f.homeTeamId)?.shortName || resolveName(f.homeTeamId)} x ${
                  clubMap.get(f.awayTeamId)?.shortName || resolveName(f.awayTeamId)
                }`,
                isUser: f.homeTeamId === userClubId || f.awayTeamId === userClubId,
              })),
            });
          }
        }

        return cards;
      }
    }

    // Group-based draw (Libertadores, Sul-Americana, Série D, or legacy group format)
    const groupsMap = new Map<string, Standing[]>();
    standings.forEach((row) => {
      if (row.group && row.group !== 'Fase de Liga') {
        const list = groupsMap.get(row.group) || [];
        list.push(row);
        groupsMap.set(row.group, list);
      }
    });

    if (
      (competition === 'libertadores' ||
        competition === 'sulamericana' ||
        competition === 'copa_internacional' ||
        competition === 'super_mundial_clubes' ||
        competition === 'afc_champions' ||
        competition === 'champions_league' ||
        competition === 'europa_league' ||
        competition === 'conference_league' ||
        competition === 'serie_d') &&
      groupsMap.size > 0
    ) {
      const groupCards: DrawCardItem[] = Array.from(groupsMap.entries())
        .slice(0, 16)
        .map(([groupName, rows]) => ({
          id: `grp_${groupName}`,
          header: competition === 'afc_champions' ? `${groupName} (${rows.length} clubes)` : groupName,
          lines: rows.map((r, idx) => ({
            clubId: r.teamId,
            label:
              competition === 'afc_champions'
                ? `${idx + 1}. ${resolveName(r.teamId)}`
                : `Pote ${idx + 1} · ${resolveName(r.teamId)}`,
            isUser: r.teamId === userClubId,
          })),
        }));

      if (competition === 'afc_champions') {
        const leagueFixtures = fixtures.filter((f) =>
          (f.cupPhase || '').toLowerCase().includes('fase de liga')
        );
        const userMatches = leagueFixtures
          .filter((f) => f.homeTeamId === userClubId || f.awayTeamId === userClubId)
          .sort((a, b) => a.round - b.round);
        if (userMatches.length > 0) {
          groupCards.push({
            id: 'afc_user_schedule',
            header: `Seus 8 Adversários Sorteados`,
            lines: userMatches.map((f) => {
              const isHome = f.homeTeamId === userClubId;
              const oppId = isHome ? f.awayTeamId : f.homeTeamId;
              return {
                clubId: oppId,
                label: `R${f.round} · ${resolveName(oppId)} (${isHome ? 'Casa' : 'Fora'})`,
                isUser: true,
              };
            }),
          });
        } else {
          const r1Matches = leagueFixtures.filter((f) => f.round === 1).slice(0, 8);
          if (r1Matches.length > 0) {
            groupCards.push({
              id: 'afc_r1_highlights',
              header: 'Destaques Sorteados · Rodada 1',
              lines: r1Matches.map((f) => ({
                clubId: f.homeTeamId,
                label: `${clubMap.get(f.homeTeamId)?.shortName || resolveName(f.homeTeamId)} x ${
                  clubMap.get(f.awayTeamId)?.shortName || resolveName(f.awayTeamId)
                }`,
                isUser: f.homeTeamId === userClubId || f.awayTeamId === userClubId,
              })),
            });
          }
        }
      }

      return groupCards;
    }

    // Knockout Tie Draw (Copa do Brasil, CONCACAF, Intercontinental, or current active phase)
    const unplayedOrLatest = fixtures.filter((f) => !f.played);
    const sourceFixtures = unplayedOrLatest.length > 0 ? unplayedOrLatest : fixtures;
    const targetPhase = sourceFixtures[0]?.cupPhase || meta.shortName;
    const phaseFixtures = sourceFixtures.filter(
      (f) => (!f.cupPhase || f.cupPhase === targetPhase) && (f.leg === undefined || f.leg === 1)
    );

    return phaseFixtures.slice(0, 16).map((fix, idx) => ({
      id: fix.id,
      header: `${fix.cupPhase || 'Confronto Oficial'} · Chave ${String(idx + 1).padStart(2, '0')}`,
      lines: [
        {
          clubId: fix.homeTeamId,
          label: `${resolveName(fix.homeTeamId)} (Mandante)`,
          isUser: fix.homeTeamId === userClubId,
        },
        {
          clubId: fix.awayTeamId,
          label: `${resolveName(fix.awayTeamId)} (Visitante)`,
          isUser: fix.awayTeamId === userClubId,
        },
      ],
    }));
  }, [competition, standings, fixtures, clubMap, userClubId, meta.shortName]);

  const [revealedCount, setRevealedCount] = useState<number>(0);
  const [autoDrawing, setAutoDrawing] = useState<boolean>(false);
  const [generatedNotice, setGeneratedNotice] = useState<boolean>(false);

  useEffect(() => {
    if (!isOpen) return;
    setRevealedCount(0);
    setAutoDrawing(false);
    setGeneratedNotice(false);
  }, [isOpen, competition]);

  useEffect(() => {
    if (!isOpen || !autoDrawing) return;
    if (revealedCount >= drawCards.length) {
      setAutoDrawing(false);
      onCompleteDraw?.(competition);
      return;
    }
    const timer = setTimeout(() => {
      soundEngine.playCupDrawCue();
      setRevealedCount((prev) => prev + 1);
    }, 340);
    return () => clearTimeout(timer);
  }, [isOpen, autoDrawing, revealedCount, drawCards.length, competition, onCompleteDraw]);

  if (!isOpen) return null;

  const isDone = revealedCount >= drawCards.length;

  const handleTriggerRealDraw = () => {
    if (!canGenerateDraw || !onGenerateDraw) return;
    soundEngine.playCupDrawCue();
    onGenerateDraw(competition);
    setGeneratedNotice(true);
    setRevealedCount(0);
    setAutoDrawing(true);
  };

  const handleDrawNextBall = () => {
    if (isDone) return;
    soundEngine.playCupDrawCue();
    const next = revealedCount + 1;
    setRevealedCount(next);
    if (next >= drawCards.length) {
      soundEngine.playFanfare();
      onCompleteDraw?.(competition);
    }
  };

  const handleRevealAll = () => {
    soundEngine.playFanfare();
    setAutoDrawing(false);
    setRevealedCount(drawCards.length);
    onCompleteDraw?.(competition);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-start justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-slate-950 border border-slate-800 rounded-2xl w-full max-w-4xl my-auto shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-black px-6 py-4 border-b border-slate-900 flex items-center justify-between gap-4">
          <div>
            <div className="text-xs font-semibold text-sky-400 tabular-nums">
              Cerimônia Oficial de Sorteio · Temporada {seasonYear}
            </div>
            <h2 className="text-lg font-black text-white mt-0.5 flex items-center gap-2">
              <span>{meta.badgeEmoji}</span>
              <span>{meta.name}</span>
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Controls Bar */}
        <div className="bg-slate-900/70 px-6 py-3 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-slate-300 tabular-nums">
            Bolinhas sorteadas:{' '}
            <strong className="text-white font-mono">
              {revealedCount}/{drawCards.length}
            </strong>
            {generatedNotice && (
              <span className="ml-2.5 text-emerald-400 font-bold">
                · Potes sorteados e novos grupos gerados!
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {canGenerateDraw && onGenerateDraw && (
              <button
                type="button"
                onClick={handleTriggerRealDraw}
                className="px-3.5 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs cursor-pointer flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{alreadyDrawn ? 'Sortear Novos Grupos' : 'Gerar Sorteio dos Grupos'}</span>
              </button>
            )}

            {!isDone && (
              <>
                <button
                  type="button"
                  onClick={handleDrawNextBall}
                  className="px-3.5 py-1.5 rounded-lg bg-sky-400 hover:bg-sky-300 text-slate-950 font-bold text-xs cursor-pointer flex items-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Sortear Próxima Chave</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playClick();
                    setAutoDrawing((prev) => !prev);
                  }}
                  className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs cursor-pointer flex items-center gap-1.5"
                >
                  <Play className="w-3.5 h-3.5" />
                  <span>{autoDrawing ? 'Pausar Sorteio' : 'Sorteio Automático'}</span>
                </button>
                <button
                  type="button"
                  onClick={handleRevealAll}
                  className="px-3.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-amber-300 font-semibold text-xs cursor-pointer flex items-center gap-1.5"
                >
                  <FastForward className="w-3.5 h-3.5" />
                  <span>Revelar Tudo</span>
                </button>
              </>
            )}

            {isDone && (
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs cursor-pointer flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Concluir Cerimônia</span>
              </button>
            )}
          </div>
        </div>

        {/* Grid of Pots / Ties */}
        <div className="flex-1 min-h-0 overflow-y-auto p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {drawCards.map((card, index) => {
            const isRevealed = index < revealedCount;
            const hasUserClub = card.lines.some((l) => l.isUser);

            return (
              <div
                key={card.id}
                className={`rounded-xl border p-4 transition-all ${
                  !isRevealed
                    ? 'bg-slate-900/40 border-slate-800/70 opacity-60'
                    : hasUserClub
                    ? 'bg-sky-950/35 border-sky-400/60 ring-1 ring-sky-400/30'
                    : 'bg-slate-900/90 border-slate-800'
                }`}
              >
                <div className="text-xs font-bold text-slate-300 border-b border-slate-800 pb-2 mb-2.5 flex items-center justify-between">
                  <span>{card.header}</span>
                  {isRevealed && hasUserClub && (
                    <span className="text-[11px] text-sky-300 font-semibold">Seu Clube</span>
                  )}
                </div>

                {!isRevealed ? (
                  <div className="py-5 text-center text-xs text-slate-500 font-mono">
                    Pote aguardando abertura...
                  </div>
                ) : (
                  <div className="space-y-1.5 text-xs">
                    {card.lines.map((line, lIdx) => {
                      const cObj = clubMap.get(line.clubId);
                      return (
                        <div
                          key={`${card.id}_${lIdx}`}
                          className={`flex items-center gap-2 py-1 ${
                            line.isUser ? 'text-sky-300 font-bold' : 'text-slate-200'
                          }`}
                        >
                          <span
                            className="w-5 h-5 rounded flex items-center justify-center text-[9px] font-black shrink-0 border border-white/15"
                            style={{
                              backgroundColor: cObj?.colors.primary || '#1e293b',
                              color: cObj?.colors.text || '#ffffff',
                            }}
                          >
                            {cObj?.initials || '?'}
                          </span>
                          <span className="truncate">{line.label}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
