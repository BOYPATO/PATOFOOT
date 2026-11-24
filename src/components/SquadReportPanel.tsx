import React, { useMemo, useState } from 'react';
import { Club, DetailedRole, Player, Position } from '../types/game';
import { soundEngine } from '../services/soundEngine';
import { PieChart, Compass, ShoppingBag, Users, CheckCircle2, AlertTriangle } from 'lucide-react';
import {
  formatPlayerNationalityShort,
  resolvePlayerNationality,
} from '../utils/nationalityUtils';
import { comparePlayersByPosition } from '../utils/playerOrdering';
import { PlayerAvatar } from './PlayerAvatar';
import { usePlayerInspection } from '../context/PlayerInspectionContext';

interface SquadReportPanelProps {
  club: Club;
  compact?: boolean;
  selectedPositionFilter?: string;
  onSelectPositionFilter?: (positionCode: string) => void;
  onNavigateToMarket?: () => void;
  onNavigateToScouting?: () => void;
}

interface PieSliceData {
  id: string;
  code: string;
  label: string;
  shortLabel: string;
  count: number;
  percentage: number; // 0 to 100
  color: string;
  avgOverall: number;
  avgAge: number;
  totalMarketValue: number;
  availableCount: number;
  recommendedMin: number;
  players: Player[];
}

function getFormationRecommendedCounts(formation: string): Record<Position, number> {
  // Ideal depth = roughly 2 players per starting spot + 3rd goalkeeper
  const parts = formation.split('-').map((n) => parseInt(n, 10)).filter((n) => !isNaN(n));
  if (parts.length >= 3) {
    const defStarters = parts[0];
    const fwStarters = parts[parts.length - 1];
    const mfStarters = parts.slice(1, -1).reduce((a, b) => a + b, 0);
    return {
      GK: 3,
      DF: Math.max(6, defStarters * 2),
      MF: Math.max(6, mfStarters * 2),
      FW: Math.max(4, fwStarters * 2),
    };
  }
  return { GK: 3, DF: 8, MF: 7, FW: 5 };
}

export const SquadReportPanel: React.FC<SquadReportPanelProps> = ({
  club,
  compact = false,
  selectedPositionFilter,
  onSelectPositionFilter,
  onNavigateToMarket,
  onNavigateToScouting,
}) => {
  const inspection = usePlayerInspection();
  const [groupMode, setGroupMode] = useState<'SECTOR' | 'DETAILED'>('SECTOR');
  const [activeSliceId, setActiveSliceId] = useState<string | null>(null);
  const [hoveredSliceId, setHoveredSliceId] = useState<string | null>(null);

  const formatCurrencyCompact = (val: number) => {
    if (val >= 1000000) {
      return `R$ ${(val / 1000000).toFixed(1).replace('.', ',')} mi`;
    }
    if (val >= 1000) {
      return `R$ ${Math.round(val / 1000)} mil`;
    }
    return `R$ ${val}`;
  };

  const totalPlayers = club.squad.length;
  const recommendedBySector = useMemo(
    () => getFormationRecommendedCounts(club.tactics.formation),
    [club.tactics.formation]
  );

  const slices: PieSliceData[] = useMemo(() => {
    const computeSlice = (
      id: string,
      code: string,
      label: string,
      shortLabel: string,
      color: string,
      players: Player[],
      recommendedMin: number
    ): PieSliceData => {
      const count = players.length;
      const percentage = totalPlayers > 0 ? (count / totalPlayers) * 100 : 0;
      const avgOverall =
        count > 0
          ? Math.round((players.reduce((acc, p) => acc + p.overall, 0) / count) * 10) / 10
          : 0;
      const avgAge =
        count > 0
          ? Math.round((players.reduce((acc, p) => acc + p.age, 0) / count) * 10) / 10
          : 0;
      const totalMarketValue = players.reduce((acc, p) => acc + p.marketValue, 0);
      const availableCount = players.filter(
        (p) => p.injuryWeeks === 0 && !p.injuryDetails && !p.isSuspended
      ).length;

      return {
        id,
        code,
        label,
        shortLabel,
        count,
        percentage,
        color,
        avgOverall,
        avgAge,
        totalMarketValue,
        availableCount,
        recommendedMin,
        players: [...players].sort((a, b) => b.overall - a.overall),
      };
    };

    if (groupMode === 'SECTOR') {
      const gks = club.squad.filter((p) => p.position === 'GK');
      const dfs = club.squad.filter((p) => p.position === 'DF');
      const mfs = club.squad.filter((p) => p.position === 'MF');
      const fws = club.squad.filter((p) => p.position === 'FW');

      return [
        computeSlice('GK', 'GOL', 'Goleiros', 'GOL', '#F59E0B', gks, recommendedBySector.GK),
        computeSlice('DF', 'DEF', 'Defensores', 'DEF', '#38BDF8', dfs, recommendedBySector.DF),
        computeSlice('MF', 'MEI', 'Meias', 'MEI', '#10B981', mfs, recommendedBySector.MF),
        computeSlice('FW', 'ATA', 'Atacantes', 'ATA', '#F43F5E', fws, recommendedBySector.FW),
      ];
    }

    const roleMeta: Array<{
      role: DetailedRole;
      label: string;
      color: string;
      rec: number;
    }> = [
      { role: 'GOL', label: 'Goleiros (GOL)', color: '#F59E0B', rec: 3 },
      { role: 'LAT', label: 'Laterais (LAT)', color: '#06B6D4', rec: 4 },
      { role: 'ZAG', label: 'Zagueiros (ZAG)', color: '#38BDF8', rec: 4 },
      { role: 'VOL', label: 'Volantes (VOL)', color: '#10B981', rec: 3 },
      { role: 'MEI', label: 'Meias (MEI)', color: '#818CF8', rec: 4 },
      { role: 'ATA', label: 'Atacantes (ATA)', color: '#F43F5E', rec: 4 },
    ];

    return roleMeta.map((rm) =>
      computeSlice(
        rm.role,
        rm.role,
        rm.label,
        rm.role,
        rm.color,
        club.squad.filter((p) => p.detailedRole === rm.role),
        rm.rec
      )
    );
  }, [club.squad, groupMode, totalPlayers, recommendedBySector]);

  // Overall squad summary stats
  const squadAvgOverall = useMemo(() => {
    if (totalPlayers === 0) return 0;
    return (
      Math.round((club.squad.reduce((acc, p) => acc + p.overall, 0) / totalPlayers) * 10) / 10
    );
  }, [club.squad, totalPlayers]);

  const squadAvgAge = useMemo(() => {
    if (totalPlayers === 0) return 0;
    return Math.round((club.squad.reduce((acc, p) => acc + p.age, 0) / totalPlayers) * 10) / 10;
  }, [club.squad, totalPlayers]);

  const squadTotalValue = useMemo(
    () => club.squad.reduce((acc, p) => acc + p.marketValue, 0),
    [club.squad]
  );

  const clubCountry = club.country || 'Brasil';
  const squadForeignCount = useMemo(
    () =>
      club.squad.filter((p) => resolvePlayerNationality(p, clubCountry) !== clubCountry).length,
    [club.squad, clubCountry]
  );

  const effectiveFocusedId =
    hoveredSliceId ||
    (selectedPositionFilter && selectedPositionFilter !== 'ALL' ? selectedPositionFilter : null) ||
    activeSliceId;

  const focusedSlice = useMemo(
    () => slices.find((s) => s.id === effectiveFocusedId) || null,
    [slices, effectiveFocusedId]
  );

  // Build SVG Pie Chart paths
  const pieSegments = useMemo(() => {
    const cx = 120;
    const cy = 120;
    const radius = 102;
    let currentAngle = -Math.PI / 2; // Start at 12 o'clock

    const nonZeroSlices = slices.filter((s) => s.count > 0);

    return nonZeroSlices.map((slice) => {
      const fraction = totalPlayers > 0 ? slice.count / totalPlayers : 0;
      const angleSpan = fraction * Math.PI * 2;
      const startAngle = currentAngle;
      const endAngle = currentAngle + angleSpan;
      const midAngle = startAngle + angleSpan / 2;
      currentAngle = endAngle;

      const x1 = cx + radius * Math.cos(startAngle);
      const y1 = cy + radius * Math.sin(startAngle);
      const x2 = cx + radius * Math.cos(endAngle);
      const y2 = cy + radius * Math.sin(endAngle);
      const largeArcFlag = angleSpan > Math.PI ? 1 : 0;

      const pathData =
        nonZeroSlices.length === 1
          ? '' // Handled via full <circle>
          : `M ${cx} ${cy} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;

      // Label coordinates inside the pie wedge
      const labelRadius = radius * 0.63;
      const labelX = cx + labelRadius * Math.cos(midAngle);
      const labelY = cy + labelRadius * Math.sin(midAngle);

      // Slight radial pop-out offset when hovered/selected
      const popOffset = 5;
      const tx = popOffset * Math.cos(midAngle);
      const ty = popOffset * Math.sin(midAngle);

      return {
        slice,
        isFullCircle: nonZeroSlices.length === 1,
        cx,
        cy,
        radius,
        pathData,
        labelX,
        labelY,
        tx,
        ty,
      };
    });
  }, [slices, totalPlayers]);

  const handleSliceClick = (slice: PieSliceData) => {
    soundEngine.playClick();
    const nextId = activeSliceId === slice.id ? null : slice.id;
    setActiveSliceId(nextId);

    if (onSelectPositionFilter) {
      const nextFilter =
        selectedPositionFilter === slice.id ? 'ALL' : slice.id;
      onSelectPositionFilter(nextFilter);
    }
  };

  const deficientSectors = useMemo(
    () => slices.filter((s) => s.count < s.recommendedMin),
    [slices]
  );

  return (
    <section className="bg-slate-950 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl space-y-6">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-800/80">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <PieChart className="w-5 h-5 text-sky-400 shrink-0" />
            <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
              Relatório de Atletas · Distribuição por Posição
            </h3>
          </div>
          <p className="text-xs text-slate-400 flex items-center gap-1.5 flex-wrap tabular-nums">
            <span>{totalPlayers} atletas no plantel</span>
            <span aria-hidden="true">·</span>
            <span>{squadForeignCount} estrangeiros</span>
            <span aria-hidden="true">·</span>
            <span>Força média {squadAvgOverall.toFixed(1).replace('.', ',')}</span>
            <span aria-hidden="true">·</span>
            <span>Idade média {squadAvgAge.toFixed(1).replace('.', ',')} anos</span>
            <span aria-hidden="true">·</span>
            <span>Avaliação total {formatCurrencyCompact(squadTotalValue)}</span>
            <span aria-hidden="true">·</span>
            <span>Esquema base {club.tactics.formation}</span>
          </p>
        </div>

        {/* Mode Segmented Toggle */}
        <div className="flex items-center gap-1 p-1 bg-slate-900 rounded-lg">
          <button
            type="button"
            onClick={() => {
              soundEngine.playClick();
              setGroupMode('SECTOR');
              setActiveSliceId(null);
            }}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              groupMode === 'SECTOR'
                ? 'bg-sky-400 text-slate-950 font-bold'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            4 Setores
          </button>
          <button
            type="button"
            onClick={() => {
              soundEngine.playClick();
              setGroupMode('DETAILED');
              setActiveSliceId(null);
            }}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              groupMode === 'DETAILED'
                ? 'bg-sky-400 text-slate-950 font-bold'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            6 Funções Táticas
          </button>
        </div>
      </div>

      {/* Main Content Grid: Pie Chart + Sector Breakdown Table */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
        {/* Left (5 cols): Interactive SVG Pie Chart */}
        <div className="lg:col-span-5 flex flex-col items-center justify-center">
          {totalPlayers === 0 ? (
            <div className="w-56 h-56 rounded-full border border-slate-800 flex items-center justify-center text-xs text-slate-500">
              Sem atletas cadastrados
            </div>
          ) : (
            <div className="relative flex flex-col items-center">
              <svg
                viewBox="0 0 240 240"
                className="w-56 h-56 sm:w-64 sm:h-64 overflow-visible select-none"
                role="img"
                aria-label="Gráfico de pizza da distribuição de posições dos jogadores no plantel"
              >
                {pieSegments.map((seg) => {
                  const isFocused = effectiveFocusedId === seg.slice.id;
                  const isDimmed =
                    Boolean(effectiveFocusedId) && effectiveFocusedId !== seg.slice.id;

                  return (
                    <g
                      key={seg.slice.id}
                      onClick={() => handleSliceClick(seg.slice)}
                      onMouseEnter={() => setHoveredSliceId(seg.slice.id)}
                      onMouseLeave={() => setHoveredSliceId(null)}
                      className="cursor-pointer transition-all duration-150"
                      style={{
                        transform: isFocused ? `translate(${seg.tx}px, ${seg.ty}px)` : 'translate(0px, 0px)',
                        opacity: isDimmed ? 0.55 : 1,
                      }}
                    >
                      {seg.isFullCircle ? (
                        <circle
                          cx={seg.cx}
                          cy={seg.cy}
                          r={seg.radius}
                          fill={seg.slice.color}
                          stroke="#020617"
                          strokeWidth="2.5"
                        />
                      ) : (
                        <path
                          d={seg.pathData}
                          fill={seg.slice.color}
                          stroke="#020617"
                          strokeWidth="2.5"
                          strokeLinejoin="round"
                        />
                      )}

                      {seg.slice.percentage >= 8 && (
                        <g className="pointer-events-none">
                          <text
                            x={seg.labelX}
                            y={seg.labelY - 5}
                            textAnchor="middle"
                            dominantBaseline="central"
                            className="fill-slate-950 font-extrabold text-[11px]"
                          >
                            {seg.slice.shortLabel}
                          </text>
                          <text
                            x={seg.labelX}
                            y={seg.labelY + 9}
                            textAnchor="middle"
                            dominantBaseline="central"
                            className="fill-slate-950 font-mono font-bold text-[11px]"
                          >
                            {seg.slice.count} ({Math.round(seg.slice.percentage)}%)
                          </text>
                        </g>
                      )}
                    </g>
                  );
                })}
              </svg>

              {/* Interactive Caption Under Chart */}
              <div className="mt-2 text-center text-xs text-slate-400 tabular-nums min-h-[2.25rem]">
                {focusedSlice ? (
                  <div>
                    <strong className="text-white font-semibold">{focusedSlice.label}</strong>
                    <span className="mx-1.5">·</span>
                    <span className="font-mono text-sky-300">
                      {focusedSlice.count} {focusedSlice.count === 1 ? 'jogador' : 'jogadores'} (
                      {focusedSlice.percentage.toFixed(1).replace('.', ',')}%)
                    </span>
                    <span className="mx-1.5">·</span>
                    <span>Força média {focusedSlice.avgOverall.toFixed(1).replace('.', ',')}</span>
                  </div>
                ) : (
                  <span>
                    Passe o cursor ou clique em uma fatia do gráfico para detalhar o setor.
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right (7 cols): Quantitative Breakdown by Position */}
        <div className="lg:col-span-7 divide-y divide-slate-800/80 border-t lg:border-t-0 lg:border-l border-slate-800/80 pt-4 lg:pt-0 lg:pl-6">
          {slices.map((slice) => {
            const isSelected = effectiveFocusedId === slice.id;
            const isShort = slice.count < slice.recommendedMin;

            return (
              <button
                key={slice.id}
                type="button"
                onClick={() => handleSliceClick(slice)}
                onMouseEnter={() => setHoveredSliceId(slice.id)}
                onMouseLeave={() => setHoveredSliceId(null)}
                className={`w-full text-left py-3 first:pt-0 last:pb-0 px-2.5 -mx-2.5 rounded-xl transition-colors cursor-pointer flex items-center justify-between gap-4 ${
                  isSelected ? 'bg-slate-900/90' : 'hover:bg-slate-900/40'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span
                    className="w-3.5 h-3.5 rounded-sm shrink-0"
                    style={{ backgroundColor: slice.color }}
                    aria-hidden="true"
                  />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-white truncate">
                        {slice.label}
                      </span>
                      <span
                        className={`text-[11px] font-medium whitespace-nowrap ${
                          isShort ? 'text-amber-400' : 'text-emerald-400'
                        }`}
                      >
                        {isShort
                          ? `Abaixo do ideal (mín. ${slice.recommendedMin})`
                          : 'Cobertura ideal'}
                      </span>
                    </div>

                    <p className="text-xs text-slate-400 mt-0.5 tabular-nums flex items-center gap-1.5 flex-wrap">
                      <span>Força média {slice.avgOverall > 0 ? slice.avgOverall.toFixed(1).replace('.', ',') : '—'}</span>
                      <span aria-hidden="true">·</span>
                      <span>Idade média {slice.avgAge > 0 ? `${slice.avgAge.toFixed(1).replace('.', ',')}a` : '—'}</span>
                      <span aria-hidden="true">·</span>
                      <span>{slice.availableCount}/{slice.count} aptos</span>
                      <span aria-hidden="true">·</span>
                      <span>{formatCurrencyCompact(slice.totalMarketValue)}</span>
                    </p>
                  </div>
                </div>

                <div className="text-right shrink-0 font-mono tabular-nums">
                  <div className="text-base font-bold text-white">
                    {slice.count}{' '}
                    <span className="text-xs font-normal text-slate-400">
                      ({slice.percentage.toFixed(1).replace('.', ',')}%)
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected Sector Athlete Roster Detail (when expanded or when a slice is clicked) */}
      {(!compact || activeSliceId) && (
        <div className="pt-5 border-t border-slate-800/80 space-y-4">
          {/* Squad Balance Recommendation Row */}
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-slate-300">
              {deficientSectors.length === 0 ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>
                    Equilíbrio do plantel adequado para a formação <strong>{club.tactics.formation}</strong> em todos os setores.
                  </span>
                </>
              ) : (
                <>
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>
                    Atenção na profundidade do elenco: recomenda-se reforçar{' '}
                    <strong className="text-amber-300">
                      {deficientSectors.map((d) => `${d.label} (${d.count}/${d.recommendedMin})`).join(', ')}
                    </strong>
                    .
                  </span>
                </>
              )}
            </div>

            <div className="flex items-center gap-2">
              {onNavigateToScouting && (
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playClick();
                    onNavigateToScouting();
                  }}
                  className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-sky-300 font-semibold text-xs transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <Compass className="w-3.5 h-3.5" />
                  <span>Enviar Olheiros</span>
                </button>
              )}
              {onNavigateToMarket && (
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playClick();
                    onNavigateToMarket();
                  }}
                  className="px-3 py-1.5 rounded-lg bg-sky-400 hover:bg-sky-300 text-slate-950 font-bold text-xs transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <ShoppingBag className="w-3.5 h-3.5" />
                  <span>Ir ao Mercado</span>
                </button>
              )}
            </div>
          </div>

          {/* Detailed Player List for Selected Slice (or Top Athletes per Sector in Full View) */}
          {!compact && (
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <Users className="w-4 h-4 text-sky-400" />
                  <span>
                    {focusedSlice
                      ? `Atletas do Setor: ${focusedSlice.label} (${focusedSlice.count})`
                      : `Relação Completa por Posição (${totalPlayers} atletas)`}
                  </span>
                </h4>
                {activeSliceId && (
                  <button
                    type="button"
                    onClick={() => setActiveSliceId(null)}
                    className="text-xs text-sky-400 hover:text-sky-300 font-semibold cursor-pointer"
                  >
                    Mostrar todos os setores
                  </button>
                )}
              </div>

              <div className="overflow-x-auto border border-slate-800 rounded-xl">
                <table className="w-full text-left text-xs tabular-nums">
                  <thead className="bg-slate-900/80 text-slate-400 border-b border-slate-800">
                    <tr>
                      <th className="py-2.5 px-3">#</th>
                      <th className="py-2.5 px-3">Atleta</th>
                      <th className="py-2.5 px-3">Posição</th>
                      <th className="py-2.5 px-3 text-right">Força</th>
                      <th className="py-2.5 px-3 text-right">Potencial</th>
                      <th className="py-2.5 px-3 text-right">Idade</th>
                      <th className="py-2.5 px-3 text-right">Físico</th>
                      <th className="py-2.5 px-3 text-right">Valor de Mercado</th>
                      <th className="py-2.5 px-3">Situação no Elenco</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/70">
                    {(focusedSlice ? focusedSlice.players : club.squad)
                      .slice()
                      .sort((a, b) => comparePlayersByPosition(a, b))
                      .map((p) => {
                        const isInjured = p.injuryWeeks > 0 || Boolean(p.injuryDetails);
                        return (
                          <tr key={p.id} className="hover:bg-slate-900/50 transition-colors">
                            <td className="py-2.5 px-3 font-mono text-slate-500">
                              {p.squadNumber}
                            </td>
                            <td className="py-2.5 px-3 font-semibold text-white">
                              <div className="flex items-center gap-2">
                                <PlayerAvatar
                                  player={p}
                                  club={club}
                                  clubPrimaryColor={club.colors.primary}
                                  clubTextColor={club.colors.text}
                                  size="xs"
                                />
                                <button
                                  type="button"
                                  onClick={() => {
                                    soundEngine.playClick();
                                    inspection?.inspectPlayer(p, club);
                                  }}
                                  className="hover:text-sky-300 transition-colors text-left cursor-pointer"
                                >
                                  {p.name}
                                </button>{' '}
                                <span className="text-[11px] font-mono font-normal text-slate-400">
                                  · {formatPlayerNationalityShort(p, clubCountry)}
                                </span>
                              </div>
                            </td>
                            <td className="py-2.5 px-3 text-sky-300 font-semibold">
                              {p.detailedRole}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono font-bold text-white">
                              {p.overall}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono text-sky-400">
                              {p.potential || p.overall}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono text-slate-300">
                              {p.age}a
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono text-emerald-400">
                              {p.condition}%
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono text-slate-200">
                              {formatCurrencyCompact(p.marketValue)}
                            </td>
                            <td className="py-2.5 px-3 text-slate-400">
                              {isInjured
                                ? 'Departamento Médico'
                                : p.isStarter
                                ? 'Titular'
                                : p.isSubstitute
                                ? 'Banco de Reservas'
                                : 'Reserva'}
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
};
