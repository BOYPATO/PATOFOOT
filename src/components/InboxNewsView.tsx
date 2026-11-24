import React, { useState } from 'react';
import { InboxMessage, Club } from '../types/game';
import {
  Mail,
  CheckCircle2,
  AlertTriangle,
  Bell,
  DollarSign,
  Award,
  HeartPulse,
  Activity,
  Clock,
  Calendar,
  Sparkles,
  ShieldAlert,
  FileText,
  ChevronRight,
  CheckCheck,
  Stethoscope,
  BadgeCheck,
  User,
  ArrowRight,
  Compass,
  Briefcase,
  Globe,
  Mic,
  MessageSquare,
} from 'lucide-react';
import { soundEngine } from '../services/soundEngine';
import { getMedicalFacilityBonus } from '../utils/medicalEngine';

interface InboxNewsViewProps {
  messages: InboxMessage[];
  onMarkRead: (id: string) => void;
  userClub?: Club;
  onNavigateToSquad?: () => void;
  onNavigateToScouting?: () => void;
  onNavigateToHonors?: () => void;
  onNavigateToBoard?: (subTab?: 'goals' | 'locker_room' | 'press') => void;
  onNavigateToSelecao?: () => void;
  onNavigateToMarket?: () => void;
  onMarkAllRead?: () => void;
}

export const InboxNewsView: React.FC<InboxNewsViewProps> = ({
  messages,
  onMarkRead,
  userClub,
  onNavigateToSquad,
  onNavigateToScouting,
  onNavigateToHonors,
  onNavigateToBoard,
  onNavigateToSelecao,
  onNavigateToMarket,
  onMarkAllRead,
}) => {
  const [filterType, setFilterType] = useState<string>('ALL');

  const unreadCount = messages.filter((m) => !m.read).length;
  const medicalMessages = messages.filter((m) => m.type === 'INJURY');
  const unreadMedicalCount = medicalMessages.filter((m) => !m.read).length;

  const suspensionMessages = messages.filter((m) => m.type === 'SUSPENSION' || Boolean(m.suspensionDetails));
  const unreadSuspensionCount = suspensionMessages.filter((m) => !m.read).length;

  const injuredPlayersInSquad = userClub
    ? userClub.squad.filter((p) => p.injuryWeeks > 0 || p.injuryDetails)
    : [];

  const medicalFacilityLevel = userClub?.finances.medicalFacilityLevel || 2;
  const facilityBonus = getMedicalFacilityBonus(medicalFacilityLevel);

  const filteredMessages = messages.filter((msg) => {
    if (filterType === 'ALL') return true;
    if (filterType === 'INJURY') return msg.type === 'INJURY';
    if (filterType === 'SUSPENSION') return msg.type === 'SUSPENSION' || Boolean(msg.suspensionDetails);
    if (filterType === 'TRANSFER') return msg.type === 'TRANSFER' || msg.type === 'SCOUTING' || msg.type === 'JOB_OFFER' || msg.type === 'NATIONAL_TEAM';
    if (filterType === 'FINANCE')
      return (
        msg.type === 'FINANCE' ||
        msg.type === 'BOARD' ||
        msg.type === 'AWARD' ||
        msg.type === 'JOB_OFFER' ||
        msg.type === 'NATIONAL_TEAM' ||
        msg.type === 'PRESS' ||
        msg.type === 'DRESSING_ROOM'
      );
    if (filterType === 'LOCKER_PRESS')
      return msg.type === 'PRESS' || msg.type === 'DRESSING_ROOM';
    return true;
  });

  const getSeverityBadge = (severity?: string) => {
    switch (severity) {
      case 'Gravíssima':
        return {
          bg: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
          dot: 'bg-rose-500 animate-pulse',
        };
      case 'Grave':
        return {
          bg: 'bg-orange-500/20 text-orange-300 border-orange-500/40',
          dot: 'bg-orange-500',
        };
      case 'Moderada':
        return {
          bg: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
          dot: 'bg-amber-400',
        };
      case 'Leve':
      default:
        return {
          bg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
          dot: 'bg-emerald-400',
        };
    }
  };

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'ALTA_MEDICA':
        return {
          label: 'ALTA MÉDICA CONCEDIDA',
          bg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
          icon: BadgeCheck,
        };
      case 'TREINO_LEVE':
        return {
          label: 'TREINO COM BOLA',
          bg: 'bg-sky-500/20 text-sky-300 border-sky-500/40',
          icon: Activity,
        };
      case 'TRANSICAO':
        return {
          label: 'TRANSIÇÃO FÍSICA NO GRAMADO',
          bg: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
          icon: Clock,
        };
      case 'NOVA_LESAO':
      default:
        return {
          label: 'NOVO LAUDO CLÍNICO',
          bg: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
          icon: ShieldAlert,
        };
    }
  };

  return (
    <div className="space-y-5">
      {/* Top Banner with Summary & Actions */}
      <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl relative overflow-hidden">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-500/20 to-cyan-500/20 border border-sky-500/40 flex items-center justify-center text-sky-400 shadow-md">
            <Mail className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-black text-white tracking-wide">
                Central de Notícias & E-mails
              </h2>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-400 border border-sky-500/30 text-xs font-mono font-bold animate-pulse">
                  {unreadCount} novos
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400">
              Boletins médicos oficiais, laudos de reabilitação e comunicados do clube.
            </p>
          </div>
        </div>

        {/* Action button to mark all as read */}
        {onMarkAllRead && unreadCount > 0 && (
          <button
            onClick={() => {
              soundEngine.playClick();
              onMarkAllRead();
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs text-slate-300 hover:text-white transition-all cursor-pointer shrink-0 self-start md:self-auto"
          >
            <CheckCheck className="w-4 h-4 text-sky-400" />
            <span>Marcar todos como lidos</span>
          </button>
        )}
      </div>

      {/* Hospital & Medical Department Highlight Card */}
      <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 border border-rose-500/30 rounded-2xl p-4 sm:p-5 shadow-xl relative overflow-hidden">
        <div className="absolute -top-12 -right-12 w-48 h-48 bg-rose-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-4 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400">
              <HeartPulse className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase tracking-wider text-rose-400">
                  Departamento Médico & REFFIS
                </span>
                <span className="px-2 py-0.5 rounded bg-slate-800 text-[10px] text-slate-300 font-mono">
                  Instalações Nível {medicalFacilityLevel}/5
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                {facilityBonus.label}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center gap-2">
              <Stethoscope className="w-4 h-4 text-rose-400" />
              <span className="text-xs font-semibold text-slate-300">
                Atletas no DM:
              </span>
              <span className={`text-xs font-black font-mono ${injuredPlayersInSquad.length > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                {injuredPlayersInSquad.length} {injuredPlayersInSquad.length === 1 ? 'jogador' : 'jogadores'}
              </span>
            </div>

            {onNavigateToSquad && (
              <button
                onClick={() => {
                  soundEngine.playClick();
                  onNavigateToSquad();
                }}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-bold transition-all cursor-pointer"
              >
                <span>Ver Elenco</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Currently Injured Players Mini-List (if any) */}
        {injuredPlayersInSquad.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
            {injuredPlayersInSquad.map((p) => {
              const daysLeft = p.injuryDetails ? p.injuryDetails.remainingDays : p.injuryWeeks * 7;
              const totalDays = p.injuryDetails ? p.injuryDetails.initialDays : Math.max(daysLeft, 7);
              const pct = Math.min(100, Math.max(0, Math.round(((totalDays - daysLeft) / totalDays) * 100)));

              return (
                <div
                  key={p.id}
                  className="bg-slate-950/80 border border-slate-800 rounded-xl p-2.5 flex items-center justify-between gap-2"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-7 h-7 rounded-lg bg-rose-500/20 border border-rose-500/40 text-rose-300 font-black text-xs flex items-center justify-center shrink-0">
                      {p.squadNumber || p.detailedRole}
                    </div>
                    <div className="truncate">
                      <div className="text-xs font-bold text-white truncate flex items-center gap-1.5">
                        <span>{p.name}</span>
                        <span className="text-[10px] text-sky-400 font-mono">{p.detailedRole}</span>
                      </div>
                      <div className="text-[10px] text-slate-400 truncate">
                        {p.injuryDetails?.injuryType || 'Lesão Muscular'}
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-[10px] font-mono font-bold text-rose-400 block">
                      {daysLeft}d restantes
                    </span>
                    <span className="text-[9px] text-slate-500 font-mono">
                      {pct}% pronto
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex items-center gap-2 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-2.5 font-medium">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Departamento Médico Zerado! Todos os atletas do elenco principal estão saudáveis e 100% aptos para o próximo confronto.</span>
          </div>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <button
          onClick={() => {
            soundEngine.playClick();
            setFilterType('ALL');
          }}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
            filterType === 'ALL'
              ? 'bg-sky-400 text-slate-950 shadow-md shadow-sky-500/20'
              : 'bg-slate-950 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-900'
          }`}
        >
          <Mail className="w-3.5 h-3.5" />
          <span>Todas as Notícias ({messages.length})</span>
        </button>

        <button
          onClick={() => {
            soundEngine.playClick();
            setFilterType('INJURY');
          }}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
            filterType === 'INJURY'
              ? 'bg-rose-500 text-white shadow-md shadow-rose-500/20'
              : 'bg-slate-950 border border-slate-800 text-rose-300 hover:bg-slate-900'
          }`}
        >
          <HeartPulse className="w-3.5 h-3.5 text-rose-400" />
          <span>Boletins Médicos ({medicalMessages.length})</span>
          {unreadMedicalCount > 0 && (
            <span className="w-2 h-2 rounded-full bg-rose-400 animate-ping ml-0.5" />
          )}
        </button>

        <button
          onClick={() => {
            soundEngine.playClick();
            setFilterType('SUSPENSION');
          }}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
            filterType === 'SUSPENSION'
              ? 'bg-red-600 text-white shadow-md shadow-red-600/30'
              : 'bg-slate-950 border border-slate-800 text-red-300 hover:bg-slate-900'
          }`}
        >
          <span className="text-xs">🟥</span>
          <span>Disciplinar & Suspensões ({suspensionMessages.length})</span>
          {unreadSuspensionCount > 0 && (
            <span className="w-2 h-2 rounded-full bg-rose-400 animate-ping ml-0.5" />
          )}
        </button>

        <button
          onClick={() => {
            soundEngine.playClick();
            setFilterType('TRANSFER');
          }}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
            filterType === 'TRANSFER'
              ? 'bg-sky-400 text-slate-950 shadow-md shadow-sky-500/20'
              : 'bg-slate-950 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-900'
          }`}
        >
          <Award className="w-3.5 h-3.5" />
          <span>Transferências</span>
        </button>

        <button
          onClick={() => {
            soundEngine.playClick();
            setFilterType('FINANCE');
          }}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
            filterType === 'FINANCE'
              ? 'bg-cyan-400 text-slate-950 shadow-md shadow-cyan-500/20'
              : 'bg-slate-950 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-900'
          }`}
        >
          <DollarSign className="w-3.5 h-3.5" />
          <span>Finanças & Diretoria</span>
        </button>

        <button
          onClick={() => {
            soundEngine.playClick();
            setFilterType('LOCKER_PRESS');
          }}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
            filterType === 'LOCKER_PRESS'
              ? 'bg-amber-400 text-slate-950 shadow-md shadow-amber-500/20'
              : 'bg-slate-950 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-900'
          }`}
        >
          <Mail className="w-3.5 h-3.5" />
          <span>Vestiário & Coletivas</span>
        </button>
      </div>

      {/* Message List */}
      <div className="space-y-3.5">
        {filteredMessages.length === 0 ? (
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-8 text-center text-slate-400">
            <Mail className="w-8 h-8 mx-auto text-slate-600 mb-2 opacity-50" />
            <p className="text-sm font-semibold">Nenhuma mensagem encontrada nesta categoria.</p>
          </div>
        ) : (
          filteredMessages.map((msg) => {
            const isMedical = msg.type === 'INJURY' || Boolean(msg.medicalReport);
            const report = msg.medicalReport;

            // Render Dedicated Medical Report Card
            if (isMedical && report) {
              const sevBadge = getSeverityBadge(report.severity);
              const statusBadge = getStatusBadge(report.status);
              const StatusIcon = statusBadge.icon;
              const isCleared = report.status === 'ALTA_MEDICA' || report.remainingDays <= 0;

              return (
                <div
                  key={msg.id}
                  onClick={() => {
                    if (!msg.read) {
                      soundEngine.playClick();
                      onMarkRead(msg.id);
                    }
                  }}
                  className={`rounded-2xl border transition-all cursor-pointer overflow-hidden ${
                    msg.read
                      ? 'bg-slate-950/80 border-slate-800/90 text-slate-300 shadow-md'
                      : isCleared
                      ? 'bg-gradient-to-br from-emerald-950/40 via-slate-950 to-slate-950 border-emerald-500/50 ring-1 ring-emerald-500/40 shadow-xl'
                      : 'bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 border-rose-500/40 ring-1 ring-rose-500/30 shadow-xl'
                  }`}
                >
                  {/* Top Bar of Medical Report */}
                  <div className="bg-slate-900/90 border-b border-slate-800 px-4 sm:px-5 py-3 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className={`p-1 rounded-md border ${statusBadge.bg}`}>
                        <StatusIcon className="w-3.5 h-3.5" />
                      </div>
                      <span className="text-[11px] font-black uppercase tracking-wider text-slate-300">
                        HOSPITAL DO CLUBE • DEPARTAMENTO MÉDICO OFICIAL
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-[11px] font-mono text-slate-400">
                      <span>Rodada {msg.round}</span>
                      <span>•</span>
                      <span>{msg.date}</span>
                      {!msg.read && (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-400 text-slate-950 text-[10px] font-black uppercase tracking-wider animate-pulse ml-1">
                          Novo Laudo
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="p-4 sm:p-5 space-y-4">
                    {/* Header: Title and Status Badge */}
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className={`px-2.5 py-0.5 rounded-full border text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 ${statusBadge.bg}`}>
                            <StatusIcon className="w-3 h-3" />
                            {statusBadge.label}
                          </span>
                          <span className={`px-2.5 py-0.5 rounded-full border text-[10px] font-bold flex items-center gap-1.5 ${sevBadge.bg}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${sevBadge.dot}`} />
                            Grau: {report.severity}
                          </span>
                        </div>
                        <h3 className="text-base sm:text-lg font-black text-white leading-tight">
                          {msg.title}
                        </h3>
                      </div>

                      {/* Remaining Days Box */}
                      <div className={`px-4 py-2 rounded-xl border text-center shrink-0 ${
                        isCleared
                          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                          : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                      }`}>
                        <div className="text-[10px] uppercase font-bold tracking-wider opacity-80">
                          {isCleared ? 'Status' : 'Tempo de Recuperação'}
                        </div>
                        <div className="text-lg font-black font-mono">
                          {isCleared ? 'LIBERADO' : `${report.remainingDays} ${report.remainingDays === 1 ? 'dia' : 'dias'}`}
                        </div>
                        {!isCleared && (
                          <div className="text-[10px] text-slate-400 font-mono">
                            ~{Math.ceil(report.remainingDays / 7)} sem. restantes
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Patient / Player Card Row */}
                    <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3 sm:p-4 flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex flex-col items-center justify-center font-mono font-black text-white shadow-inner">
                          <span className="text-xs text-sky-400">#{report.squadNumber}</span>
                          <span className="text-[9px] text-slate-400">{report.playerRole}</span>
                        </div>

                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-black text-white">{report.playerName}</span>
                            <span className="px-1.5 py-0.2 rounded bg-sky-950 border border-sky-800 text-sky-300 text-[10px] font-mono font-bold">
                              OVR {report.overall}
                            </span>
                          </div>
                          <div className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
                            <span>Diagnóstico Clínico:</span>
                            <span className="font-semibold text-rose-300">{report.injuryName}</span>
                          </div>
                        </div>
                      </div>

                      {report.facilityReductionDays && report.facilityReductionDays > 0 && (
                        <div className="px-2.5 py-1 rounded-lg bg-sky-500/10 border border-sky-500/20 text-sky-300 text-[11px] font-medium flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-sky-400" />
                          <span>DM economizou <b>{report.facilityReductionDays} dias</b> de cicatrização</span>
                        </div>
                      )}
                    </div>

                    {/* Visual Rehabilitation Progress Stepper & Progress Bar */}
                    <div className="space-y-2 bg-slate-900/40 border border-slate-800/80 rounded-xl p-3.5">
                      <div className="flex items-center justify-between text-xs font-mono">
                        <span className="text-slate-400 flex items-center gap-1.5">
                          <Activity className="w-3.5 h-3.5 text-sky-400" />
                          <span>Evolução da Reabilitação:</span>
                          <b className="text-white">{report.progressPercentage}% concluído</b>
                        </span>
                        <span className="text-slate-400 font-semibold">
                          {isCleared
                            ? '100% Recuperado'
                            : `${report.initialDays - report.remainingDays} de ${report.initialDays} dias cumpridos`}
                        </span>
                      </div>

                      {/* Progress Bar */}
                      <div className="w-full h-2.5 bg-slate-950 rounded-full overflow-hidden p-0.5 border border-slate-800">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            isCleared
                              ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                              : report.progressPercentage >= 75
                              ? 'bg-gradient-to-r from-sky-500 to-cyan-400'
                              : report.progressPercentage >= 40
                              ? 'bg-gradient-to-r from-amber-500 to-yellow-400'
                              : 'bg-gradient-to-r from-rose-500 to-orange-400'
                          }`}
                          style={{ width: `${Math.max(5, report.progressPercentage)}%` }}
                        />
                      </div>

                      {/* 4 Stages Stepper */}
                      <div className="grid grid-cols-4 gap-2 pt-2 text-center text-[10px]">
                        {[
                          { label: 'Fisioterapia', active: report.progressPercentage >= 0, reached: report.progressPercentage >= 40 },
                          { label: 'Transição Campo', active: report.progressPercentage >= 40, reached: report.progressPercentage >= 75 },
                          { label: 'Treino c/ Bola', active: report.progressPercentage >= 75, reached: isCleared },
                          { label: 'Alta Médica', active: isCleared, reached: isCleared },
                        ].map((stg, i) => (
                          <div
                            key={i}
                            className={`p-1.5 rounded-lg border transition-all ${
                              stg.active
                                ? 'bg-sky-500/10 border-sky-500/30 text-sky-300 font-bold'
                                : 'bg-slate-950/60 border-slate-800 text-slate-500'
                            }`}
                          >
                            <div className="flex items-center justify-center gap-1 mb-0.5">
                              {stg.active ? (
                                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                              ) : (
                                <span className="w-1.5 h-1.5 rounded-full bg-slate-700" />
                              )}
                              <span>Fase {i + 1}</span>
                            </div>
                            <span className="block truncate">{stg.label}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Protocol & Doctor Observations */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                      <div className="bg-slate-950 border border-slate-800/80 rounded-xl p-3">
                        <div className="flex items-center gap-1.5 text-sky-400 font-bold uppercase tracking-wider text-[10px] mb-1">
                          <Stethoscope className="w-3.5 h-3.5" />
                          <span>Prescrição & Protocolo de Tratamento</span>
                        </div>
                        <p className="text-slate-300 leading-relaxed">
                          {report.treatmentPlan}
                        </p>
                      </div>

                      <div className="bg-slate-950 border border-slate-800/80 rounded-xl p-3">
                        <div className="flex items-center gap-1.5 text-amber-400 font-bold uppercase tracking-wider text-[10px] mb-1">
                          <FileText className="w-3.5 h-3.5" />
                          <span>Parecer Clínico do Chefe do DM</span>
                        </div>
                        <p className="text-slate-300 leading-relaxed italic">
                          "{report.doctorAdvice}"
                        </p>
                      </div>
                    </div>

                    {/* General explanatory text from message */}
                    <p className="text-xs text-slate-400 leading-relaxed border-t border-slate-800/60 pt-3">
                      {msg.message}
                    </p>
                  </div>
                </div>
              );
            }

            // Render Dedicated Disciplinary Suspension Card
            const isSuspension = msg.type === 'SUSPENSION' || Boolean(msg.suspensionDetails);
            const suspDetails = msg.suspensionDetails;

            if (isSuspension && suspDetails) {
              const isCleared = Boolean(suspDetails.cleared) || suspDetails.matchesSuspended === 0;
              const isRed = suspDetails.reason === 'RED_CARD';

              return (
                <div
                  key={msg.id}
                  onClick={() => {
                    if (!msg.read) {
                      soundEngine.playClick();
                      onMarkRead(msg.id);
                    }
                  }}
                  className={`rounded-2xl border transition-all cursor-pointer overflow-hidden ${
                    msg.read
                      ? 'bg-slate-950/80 border-slate-800/90 text-slate-300 shadow-md'
                      : isCleared
                      ? 'bg-gradient-to-br from-emerald-950/40 via-slate-950 to-slate-950 border-emerald-500/50 ring-1 ring-emerald-500/40 shadow-xl'
                      : isRed
                      ? 'bg-gradient-to-br from-red-950/40 via-slate-950 to-slate-950 border-red-500/50 ring-1 ring-red-500/40 shadow-xl'
                      : 'bg-gradient-to-br from-amber-950/30 via-slate-950 to-slate-950 border-amber-500/50 ring-1 ring-amber-500/40 shadow-xl'
                  }`}
                >
                  {/* Top Bar of Suspension Notice */}
                  <div className="bg-slate-900/90 border-b border-slate-800 px-4 sm:px-5 py-3 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm shadow ${
                          isCleared
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                            : isRed
                            ? 'bg-red-500/20 text-red-300 border border-red-500/40'
                            : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        }`}
                      >
                        {isCleared ? '✅' : isRed ? '🟥' : '🟨'}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-xs font-black uppercase tracking-wider ${
                              isCleared ? 'text-emerald-400' : isRed ? 'text-rose-400' : 'text-amber-400'
                            }`}
                          >
                            {isCleared
                              ? 'COMUNICADO DISCIPLINAR: SUSPENSÃO CUMPRIDA'
                              : isRed
                              ? 'EXPULSÃO: CARTÃO VERMELHO'
                              : 'SUSPENSÃO AUTOMÁTICA: 3º CARTÃO AMARELO'}
                          </span>
                          {!msg.read && (
                            <span className="w-2 h-2 rounded-full bg-rose-400 animate-pulse" />
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400">
                          {suspDetails.competitionName} • Rodada {msg.round} • {msg.date}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2.5 py-1 rounded-lg text-xs font-black border uppercase tracking-wider ${
                          isCleared
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                            : 'bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse'
                        }`}
                      >
                        {isCleared ? 'LIBERADO P/ JOGAR' : '1 JOGO DE SUSPENSÃO'}
                      </span>
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="p-4 sm:p-5 space-y-4">
                    {/* Player Info Card */}
                    <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-xl bg-slate-950 border border-slate-700 flex items-center justify-center font-black text-sky-400 text-sm shadow">
                          #{suspDetails.squadNumber || '10'}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-extrabold text-sm text-white">{suspDetails.playerName}</h4>
                            <span className="px-1.5 py-0.5 rounded bg-sky-950 text-sky-300 border border-sky-800 text-[10px] font-bold">
                              {suspDetails.playerRole}
                            </span>
                            <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px] font-mono font-bold">
                              Força {suspDetails.overall}
                            </span>
                          </div>
                          <p className="text-xs text-slate-400 mt-0.5">
                            Competição: <strong>{suspDetails.competitionName}</strong>
                          </p>
                        </div>
                      </div>

                      {onNavigateToSquad && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            soundEngine.playClick();
                            onNavigateToSquad();
                          }}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 border border-sky-500/40 text-xs font-bold transition-all cursor-pointer self-start sm:self-auto"
                        >
                          <span>Ajustar Escalação</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    {/* Explanatory Disciplinary Rule */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                      <div className="bg-slate-950 border border-slate-800/80 rounded-xl p-3">
                        <div className="flex items-center gap-1.5 text-amber-400 font-bold uppercase tracking-wider text-[10px] mb-1">
                          <ShieldAlert className="w-3.5 h-3.5" />
                          <span>Punição Aplicada</span>
                        </div>
                        <p className="text-slate-300 leading-relaxed">
                          {isCleared
                            ? `O atleta cumpriu a partida de suspensão automática e está novamente liberado. ${
                                suspDetails.reason === 'YELLOW_CARDS'
                                  ? 'O ciclo de 3 cartões amarelos nesta competição foi zerado.'
                                  : 'A suspensão por cartão vermelho foi concluída.'
                              }`
                            : isRed
                            ? 'Expulsão de campo durante a partida. O atleta deverá cumprir 1 partida de suspensão automática no próximo confronto desta competição.'
                            : `Acúmulo de 3 cartões amarelos nesta competição (${suspDetails.yellowCardsInCompetition || 3}º amarelo recebido). Desfalque automático por 1 jogo.`}
                        </p>
                      </div>

                      <div className="bg-slate-950 border border-slate-800/80 rounded-xl p-3">
                        <div className="flex items-center gap-1.5 text-sky-400 font-bold uppercase tracking-wider text-[10px] mb-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Abrangência da Punição</span>
                        </div>
                        <p className="text-slate-300 leading-relaxed">
                          Conforme o regulamento, a suspensão automática por cartões é cumprida exclusivamente no <strong>{suspDetails.competitionName}</strong>. O jogador segue apto para atuar em outros campeonatos ou copas.
                        </p>
                      </div>
                    </div>

                    {/* Original Message Text */}
                    <p className="text-xs text-slate-400 leading-relaxed border-t border-slate-800/60 pt-3">
                      {msg.message}
                    </p>
                  </div>
                </div>
              );
            }

            // Normal Message (Transfer, Finance, Board, Award)
            let Icon = Bell;
            let color = 'text-sky-400 bg-sky-500/10 border-sky-500/30';

            if (msg.type === 'TRANSFER') {
              Icon = Award;
              color = 'text-sky-300 bg-sky-500/20 border-sky-500/40';
            } else if (msg.type === 'SCOUTING') {
              Icon = Compass;
              color = 'text-sky-300 bg-sky-500/20 border-sky-500/40';
            } else if (msg.type === 'FINANCE') {
              Icon = DollarSign;
              color = 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30';
            } else if (msg.type === 'JOB_OFFER') {
              Icon = Briefcase;
              color = 'text-amber-300 bg-amber-500/20 border-amber-500/40';
            } else if (msg.type === 'NATIONAL_TEAM') {
              Icon = Globe;
              color = 'text-amber-300 bg-emerald-500/20 border-amber-400/50';
            } else if (msg.type === 'PRESS') {
              Icon = Mic;
              color = 'text-sky-300 bg-sky-500/20 border-sky-500/40';
            } else if (msg.type === 'DRESSING_ROOM') {
              Icon = MessageSquare;
              color = 'text-amber-300 bg-amber-500/20 border-amber-500/40';
            } else if (msg.type === 'INJURY') {
              Icon = AlertTriangle;
              color = 'text-rose-400 bg-rose-500/10 border-rose-500/30';
            }

            return (
              <div
                key={msg.id}
                onClick={() => {
                  if (!msg.read) {
                    soundEngine.playClick();
                    onMarkRead(msg.id);
                  }
                }}
                className={`p-4 sm:p-5 rounded-2xl border transition-all cursor-pointer ${
                  msg.read
                    ? 'bg-slate-950/70 border-slate-800 text-slate-400'
                    : 'bg-slate-950 border-sky-500/40 ring-1 ring-sky-500/30 text-white shadow-xl'
                }`}
              >
                <div className="flex items-start gap-3.5">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${color}`}>
                    <Icon className="w-5 h-5" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-1.5">
                      <h4 className="font-bold text-sm text-white flex items-center gap-2">
                        <span>{msg.title}</span>
                        {!msg.read && (
                          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                        )}
                      </h4>
                      <span className="text-[11px] text-slate-500 font-mono shrink-0">
                        Rodada {msg.round} • {msg.date}
                      </span>
                    </div>

                    <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-line">
                      {msg.message}
                    </p>

                    {msg.type === 'SCOUTING' && onNavigateToScouting && (
                      <div className="mt-3">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            soundEngine.playClick();
                            if (!msg.read) onMarkRead(msg.id);
                            onNavigateToScouting();
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 border border-sky-500/40 text-xs font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                        >
                          <span>Abrir Relatório de Talentos</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}

                    {(msg.type === 'TRANSFER' || msg.type === 'LOAN') && onNavigateToMarket && (
                      <div className="mt-3">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            soundEngine.playClick();
                            if (!msg.read) onMarkRead(msg.id);
                            onNavigateToMarket();
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-xs font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                        >
                          <span>
                            {msg.offerId
                              ? 'Responder Proposta na Central IA'
                              : 'Abrir Mercado & Central IA'}
                          </span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}

                    {msg.type === 'AWARD' && onNavigateToHonors && (
                      <div className="mt-3">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            soundEngine.playClick();
                            if (!msg.read) onMarkRead(msg.id);
                            onNavigateToHonors();
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                        >
                          <span>Ver Galeria de Honrarias</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}

                    {(msg.type === 'JOB_OFFER' ||
                      msg.type === 'BOARD' ||
                      msg.type === 'PRESS' ||
                      msg.type === 'DRESSING_ROOM') &&
                      onNavigateToBoard && (
                        <div className="mt-3">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              soundEngine.playClick();
                              if (!msg.read) onMarkRead(msg.id);
                              if (msg.type === 'PRESS') onNavigateToBoard('press');
                              else if (msg.type === 'DRESSING_ROOM') onNavigateToBoard('locker_room');
                              else onNavigateToBoard('goals');
                            }}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 border border-sky-500/40 text-xs font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                          >
                            <span>
                              {msg.type === 'JOB_OFFER'
                                ? 'Analisar Proposta na Diretoria'
                                : msg.type === 'PRESS'
                                ? 'Conceder Coletiva na Sala de Imprensa'
                                : msg.type === 'DRESSING_ROOM'
                                ? 'Reunir no Vestiário do CT'
                                : 'Abrir Sala da Diretoria'}
                            </span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}

                    {msg.type === 'NATIONAL_TEAM' && onNavigateToSelecao && (
                      <div className="mt-3">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            soundEngine.playClick();
                            if (!msg.read) onMarkRead(msg.id);
                            onNavigateToSelecao();
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-400/20 hover:bg-amber-400/30 text-amber-300 border border-amber-400/40 text-xs font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                        >
                          <span>Abrir Central da Seleção</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
