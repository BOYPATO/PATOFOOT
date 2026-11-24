import React from 'react';
import { Club, Fixture } from '../types/game';
import { COMPETITIONS_CATALOG } from '../utils/competitionsEngine';
import { formatCalendarDate } from '../utils/calendarUtils';
import { soundEngine } from '../services/soundEngine';
import { Award, CheckCircle2, Trophy, Users, DollarSign, X } from 'lucide-react';

export interface InstantMatchSummaryData {
  fixture: Fixture;
  homeClub: Club;
  awayClub: Club;
  manOfTheMatchLabel: string;
}

interface InstantMatchResultModalProps {
  summary: InstantMatchSummaryData;
  userClubId: string;
  onClose: () => void;
}

export const InstantMatchResultModal: React.FC<InstantMatchResultModalProps> = ({
  summary,
  userClubId,
  onClose,
}) => {
  const { fixture, homeClub, awayClub, manOfTheMatchLabel } = summary;
  const compMeta = COMPETITIONS_CATALOG[fixture.competition] || COMPETITIONS_CATALOG.serie_a;
  const homeScore = fixture.homeScore ?? 0;
  const awayScore = fixture.awayScore ?? 0;

  const isUserHome = homeClub.id === userClubId;
  const userWon = fixture.aggregateWinnerId
    ? fixture.aggregateWinnerId === userClubId
    : isUserHome
    ? homeScore > awayScore
    : awayScore > homeScore;
  const isDraw = !fixture.aggregateWinnerId && homeScore === awayScore;

  const goalsAndCards = (fixture.events || []).filter(
    (e) =>
      e.type === 'GOL' ||
      e.type === 'PENALTI_GOL' ||
      e.type === 'CARTAO_AMARELO' ||
      e.type === 'CARTAO_VERMELHO' ||
      e.type === 'LESAO'
  );

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-start justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden my-auto">
        {/* Header */}
        <div className="bg-slate-950 px-5 py-3.5 border-b border-slate-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs min-w-0">
            <span>{compMeta.badgeEmoji}</span>
            <span className="font-bold text-sky-300 truncate">
              {fixture.cupPhase || `${compMeta.shortName} · Rodada ${fixture.round}`}
            </span>
            <span className="text-slate-600" aria-hidden="true">
              ·
            </span>
            <span className="text-slate-400 tabular-nums shrink-0">
              {fixture.date ? formatCalendarDate(fixture.date) : 'Resultado Instantâneo'}
            </span>
          </div>

          <button
            type="button"
            onClick={() => {
              soundEngine.playClick();
              onClose();
            }}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            title="Fechar resumo (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scoreboard */}
        <div className="p-6 border-b border-slate-800 bg-slate-950/60">
          <div className="text-center mb-3">
            <span
              className={`text-[11px] font-bold uppercase tracking-wider ${
                userWon
                  ? 'text-emerald-400'
                  : isDraw
                  ? 'text-amber-300'
                  : 'text-rose-400'
              }`}
            >
              {userWon
                ? 'Vitória Confirmada · Rodada Atualizada'
                : isDraw
                ? 'Empate Oficial · Rodada Atualizada'
                : 'Fim de Jogo · Rodada Atualizada'}
            </span>
          </div>

          <div className="grid grid-cols-12 items-center gap-3">
            <div className="col-span-5 flex items-center justify-end gap-3">
              <div className="text-right min-w-0">
                <div className="font-bold text-white text-sm sm:text-base truncate">
                  {homeClub.name}
                </div>
                <div className="text-[11px] text-slate-400 truncate">Mandante</div>
              </div>
              <div
                className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center font-black text-base sm:text-lg border border-white/15 shrink-0"
                style={{
                  backgroundColor: homeClub.colors.primary,
                  color: homeClub.colors.text,
                }}
              >
                {homeClub.initials}
              </div>
            </div>

            <div className="col-span-2 flex flex-col items-center justify-center">
              <div className="px-3.5 py-1.5 rounded-xl bg-black border border-slate-800 flex items-center gap-2 font-mono font-black text-2xl sm:text-3xl text-white tabular-nums">
                <span>{homeScore}</span>
                <span className="text-slate-600 text-base">x</span>
                <span>{awayScore}</span>
              </div>
              {fixture.aggregateHomeScore !== undefined &&
                fixture.aggregateAwayScore !== undefined && (
                  <span className="text-[11px] text-amber-300 font-semibold mt-1 tabular-nums">
                    Agregado: {fixture.aggregateHomeScore} x {fixture.aggregateAwayScore}
                  </span>
                )}
              {fixture.penaltiesHome !== undefined &&
                fixture.penaltiesAway !== undefined && (
                  <span className="text-[11px] text-emerald-300 font-bold mt-0.5 tabular-nums">
                    Pênaltis: {fixture.penaltiesHome} x {fixture.penaltiesAway}
                  </span>
                )}
            </div>

            <div className="col-span-5 flex items-center justify-start gap-3">
              <div
                className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center font-black text-base sm:text-lg border border-white/15 shrink-0"
                style={{
                  backgroundColor: awayClub.colors.primary,
                  color: awayClub.colors.text,
                }}
              >
                {awayClub.initials}
              </div>
              <div className="text-left min-w-0">
                <div className="font-bold text-white text-sm sm:text-base truncate">
                  {awayClub.name}
                </div>
                <div className="text-[11px] text-slate-400 truncate">Visitante</div>
              </div>
            </div>
          </div>
        </div>

        {/* Key Stats & Revenue */}
        <div className="px-6 py-4 border-b border-slate-800 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs tabular-nums">
          <div className="flex items-center gap-2 text-slate-300">
            <Award className="w-4 h-4 text-amber-400 shrink-0" />
            <div className="min-w-0">
              <span className="text-slate-500 block text-[11px]">Craque da Partida</span>
              <strong className="text-white truncate block">{manOfTheMatchLabel}</strong>
            </div>
          </div>
          <div className="flex items-center gap-2 text-slate-300">
            <Trophy className="w-4 h-4 text-rose-400 shrink-0" />
            <div>
              <span className="text-slate-500 block text-[11px]">xG (Gols Esperados)</span>
              <strong className="text-white font-mono">
                {(fixture.stats?.homeXG ?? homeScore * 0.85).toFixed(2)} x{' '}
                {(fixture.stats?.awayXG ?? awayScore * 0.85).toFixed(2)}
              </strong>
              <span className="text-[10px] text-slate-500 block">
                Finalizações: {fixture.stats?.homeShots ?? 0} x {fixture.stats?.awayShots ?? 0}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 text-slate-300">
            <Users className="w-4 h-4 text-sky-400 shrink-0" />
            <div>
              <span className="text-slate-500 block text-[11px]">Público & Posse</span>
              <strong className="text-white">
                {(fixture.attendance || 0).toLocaleString('pt-BR')} ·{' '}
                {fixture.stats?.homePossession ?? 50}%/{fixture.stats?.awayPossession ?? 50}%
              </strong>
            </div>
          </div>
          <div className="flex items-center gap-2 text-slate-300">
            <DollarSign className="w-4 h-4 text-emerald-400 shrink-0" />
            <div>
              <span className="text-slate-500 block text-[11px]">Renda de Bilheteria</span>
              <strong className="text-emerald-400 font-mono">
                R$ {(fixture.ticketRevenue || 0).toLocaleString('pt-BR')}
              </strong>
            </div>
          </div>
        </div>

        {/* Attack Zones & Post-Match Player Ratings */}
        {(fixture.stats?.homeAttackZones || (fixture.stats?.matchRatings && fixture.stats.matchRatings.length > 0)) && (
          <div className="px-6 py-4 border-b border-slate-800 grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-900/60">
            {fixture.stats?.homeAttackZones && fixture.stats?.awayAttackZones && (
              <div className="space-y-2 text-xs tabular-nums">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Ataque por Setores (Esq · Cen · Dir)
                </div>
                {[
                  { label: homeClub.shortName, z: fixture.stats.homeAttackZones, accent: 'text-sky-300' },
                  { label: awayClub.shortName, z: fixture.stats.awayAttackZones, accent: 'text-amber-300' },
                ].map((row) => (
                  <div key={row.label} className="space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className={`font-bold ${row.accent}`}>{row.label}</span>
                      <span className="font-mono text-slate-300">
                        {row.z.left}% · {row.z.center}% · {row.z.right}%
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-800 rounded overflow-hidden flex">
                      <div className="bg-sky-400 h-full" style={{ width: `${row.z.left}%` }} />
                      <div className="bg-emerald-400 h-full" style={{ width: `${row.z.center}%` }} />
                      <div className="bg-amber-400 h-full flex-1" />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {fixture.stats?.matchRatings && fixture.stats.matchRatings.length > 0 && (
              <div className="space-y-1.5 text-xs tabular-nums">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Melhores Notas em Campo (0–10)
                </div>
                <div className="divide-y divide-slate-800/70">
                  {fixture.stats.matchRatings.slice(0, 4).map((r) => (
                    <div key={r.playerId} className="py-1 flex items-center justify-between gap-2 text-[11px]">
                      <span className="text-slate-200 truncate">
                        {r.playerName}{' '}
                        <span className="text-slate-500">
                          · {r.clubId === homeClub.id ? homeClub.shortName : awayClub.shortName}
                          {r.goals > 0 ? ` · ${r.goals}G` : ''}
                          {r.assists > 0 ? ` · ${r.assists}A` : ''}
                        </span>
                      </span>
                      <span
                        className={`font-mono font-bold shrink-0 ${
                          r.rating >= 7.5 ? 'text-emerald-400' : 'text-sky-300'
                        }`}
                      >
                        {r.rating.toFixed(1)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Match Events Timeline */}
        <div className="p-6 max-h-64 overflow-y-auto">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
            <Trophy className="w-3.5 h-3.5 text-sky-400" />
            <span>Principais Lances da Súmula</span>
          </h4>

          {goalsAndCards.length === 0 ? (
            <p className="text-xs text-slate-400 py-3">
              Partida equilibrada e truncada no meio-campo, encerrada sem gols ou cartões graves.
            </p>
          ) : (
            <div className="divide-y divide-slate-800/80 text-xs">
              {goalsAndCards.map((ev) => (
                <div
                  key={ev.id}
                  className="py-2 flex items-center justify-between gap-3 tabular-nums"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="font-mono font-bold text-sky-400 w-8 shrink-0">
                      {ev.minute}&apos;
                    </span>
                    <span className="text-slate-200 truncate">{ev.description}</span>
                  </div>
                  <span className="text-[11px] text-slate-500 shrink-0">
                    {ev.isHomeTeam ? homeClub.shortName : awayClub.shortName}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer Button */}
        <div className="px-6 py-4 bg-slate-950 border-t border-slate-800 flex items-center justify-end">
          <button
            type="button"
            onClick={() => {
              soundEngine.playClick();
              onClose();
            }}
            className="px-5 py-2.5 rounded-xl bg-sky-400 hover:bg-sky-300 text-slate-950 font-black text-xs flex items-center gap-2 transition-colors cursor-pointer"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Continuar Carreira</span>
          </button>
        </div>
      </div>
    </div>
  );
};
