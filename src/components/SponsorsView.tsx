import React, { useState, useMemo } from 'react';
import {
  Club,
  SponsorOption,
  SponsorSlotType,
  SponsorStrategyProfile,
} from '../types/game';
import {
  SPONSOR_SLOTS_META,
  SPONSOR_SLOTS_ORDER,
  calculateActiveSponsorsPerRound,
  countActiveSponsors,
  getAvailableSponsorOptionsForSlot,
} from '../utils/sponsorEngine';
import { soundEngine } from '../services/soundEngine';
import confetti from 'canvas-confetti';
import {
  Handshake,
  DollarSign,
  TrendingUp,
  Award,
  Check,
  X,
  RefreshCw,
  ShieldCheck,
  Calendar,
} from 'lucide-react';

interface SponsorsViewProps {
  club: Club;
  onSignSponsor: (option: SponsorOption) => { success: boolean; errorMessage?: string };
  onTerminateSponsor: (slot: SponsorSlotType) => { success: boolean; errorMessage?: string };
}

export const SponsorsView: React.FC<SponsorsViewProps> = ({
  club,
  onSignSponsor,
  onTerminateSponsor,
}) => {
  const initialOpenSlot =
    SPONSOR_SLOTS_ORDER.find((s) => !club.sponsors?.[s]) || 'MASTER';

  const [selectedSlot, setSelectedSlot] = useState<SponsorSlotType>(initialOpenSlot);
  const [profileFilter, setProfileFilter] = useState<'ALL' | SponsorStrategyProfile>('ALL');
  const [confirmingReplaceOption, setConfirmingReplaceOption] = useState<SponsorOption | null>(null);
  const [confirmingTerminateSlot, setConfirmingTerminateSlot] = useState<SponsorSlotType | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const formatBRL = (val: number) =>
    new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      maximumFractionDigits: 0,
    }).format(val);

  const activeSponsorsCount = countActiveSponsors(club.sponsors);
  const totalFixedPerRound = calculateActiveSponsorsPerRound(club.sponsors);
  const totalMaxWinBonus = SPONSOR_SLOTS_ORDER.reduce((sum, s) => {
    const c = club.sponsors?.[s];
    return sum + (c ? c.winBonus : 0);
  }, 0);
  const totalGoalBonus = SPONSOR_SLOTS_ORDER.reduce((sum, s) => {
    const c = club.sponsors?.[s];
    return sum + (c ? c.goalBonus : 0);
  }, 0);

  const slotOptions = useMemo(
    () => getAvailableSponsorOptionsForSlot(club, selectedSlot),
    [club, selectedSlot]
  );

  const filteredOptions = useMemo(() => {
    if (profileFilter === 'ALL') return slotOptions;
    return slotOptions.filter((opt) => opt.profile === profileFilter);
  }, [slotOptions, profileFilter]);

  const activeSlotContract = club.sponsors?.[selectedSlot];

  const computeProRataPenalty = (slot: SponsorSlotType): number => {
    const existing = club.sponsors?.[slot];
    if (!existing || existing.roundsRemaining <= 0) return 0;
    const ratio = existing.roundsRemaining / Math.max(1, existing.totalRounds);
    const raw = existing.terminationFee * (0.4 + 0.6 * ratio);
    return raw >= 100000 ? Math.round(raw / 10000) * 10000 : Math.round(raw / 1000) * 1000;
  };

  const handleChooseOption = (option: SponsorOption) => {
    soundEngine.playClick();
    if (activeSlotContract && activeSlotContract.id !== option.id && activeSlotContract.roundsRemaining > 0) {
      setConfirmingReplaceOption(option);
      return;
    }
    executeSign(option);
  };

  const executeSign = (option: SponsorOption) => {
    const result = onSignSponsor(option);
    if (!result.success) {
      soundEngine.playWhistle(false);
      setFeedback({
        type: 'error',
        text: result.errorMessage || 'Não foi possível assinar o contrato.',
      });
      setConfirmingReplaceOption(null);
      return;
    }

    soundEngine.playFanfare();
    confetti({ particleCount: 90, spread: 75, origin: { y: 0.6 } });
    setConfirmingReplaceOption(null);

    const nextEmpty = SPONSOR_SLOTS_ORDER.find(
      (s) => s !== option.slot && !club.sponsors?.[s]
    );

    setFeedback({
      type: 'success',
      text: nextEmpty
        ? `Contrato assinado com ${option.companyName}! Luvas de ${formatBRL(option.signingBonus)} creditadas. Escolha agora a cota: ${SPONSOR_SLOTS_META[nextEmpty].title}.`
        : `Contrato assinado com ${option.companyName}! Luvas de ${formatBRL(option.signingBonus)} creditadas no caixa do clube!`,
    });

    if (nextEmpty) {
      setSelectedSlot(nextEmpty);
    }

    setTimeout(() => setFeedback(null), 4500);
  };

  const executeTerminate = (slot: SponsorSlotType) => {
    const contractName = club.sponsors?.[slot]?.companyName || 'Patrocinador';
    const result = onTerminateSponsor(slot);
    if (!result.success) {
      soundEngine.playWhistle(false);
      setFeedback({
        type: 'error',
        text: result.errorMessage || 'Saldo insuficiente para rescindir o contrato.',
      });
      setConfirmingTerminateSlot(null);
      return;
    }

    soundEngine.playClick();
    setConfirmingTerminateSlot(null);
    setFeedback({
      type: 'success',
      text: `Contrato com ${contractName} encerrado. A cota está livre para novas propostas.`,
    });
    setTimeout(() => setFeedback(null), 3500);
  };

  const masterSponsor = club.sponsors?.MASTER;
  const kitSponsor = club.sponsors?.KIT_SUPPLIER;
  const sleeveSponsor = club.sponsors?.SLEEVE;
  const shortsSponsor = club.sponsors?.SHORTS_STADIUM;

  return (
    <div className="space-y-6">
      {/* Feedback Banner */}
      {feedback && (
        <div
          className={`rounded-xl px-4 py-3 text-xs font-semibold flex items-center justify-between border ${
            feedback.type === 'success'
              ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-200'
              : 'bg-rose-950/60 border-rose-500/40 text-rose-200'
          }`}
        >
          <span>{feedback.text}</span>
          <button
            onClick={() => setFeedback(null)}
            className="p-1 text-slate-400 hover:text-white cursor-pointer"
            aria-label="Fechar aviso"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Top KPI Summary Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-950 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between text-slate-400 mb-1.5">
            <span className="text-xs font-medium">Cotas Preenchidas</span>
            <Handshake className="w-4 h-4 text-sky-400" />
          </div>
          <p className="text-xl font-bold text-white font-mono tabular-nums">
            {activeSponsorsCount} / 4 Patrocinadores
          </p>
          <p className="text-xs text-slate-500 mt-1">
            {activeSponsorsCount === 4
              ? 'Todas as 4 cotas comerciais ativas'
              : `${4 - activeSponsorsCount} cota(s) aberta(s) para escolha`}
          </p>
        </div>

        <div className="bg-slate-950 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between text-slate-400 mb-1.5">
            <span className="text-xs font-medium">Receita Fixa / Rodada</span>
            <DollarSign className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-xl font-bold text-emerald-400 font-mono tabular-nums">
            {formatBRL(totalFixedPerRound)}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            Garantido todo jogo das 4 cotas somadas
          </p>
        </div>

        <div className="bg-slate-950 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between text-slate-400 mb-1.5">
            <span className="text-xs font-medium">Bônus por Vitória & Gols</span>
            <TrendingUp className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-xl font-bold text-amber-400 font-mono tabular-nums">
            +{formatBRL(totalMaxWinBonus)}
          </p>
          <p className="text-xs text-slate-500 mt-1 tabular-nums">
            Por vitória · +{formatBRL(totalGoalBonus)} por gol marcado
          </p>
        </div>

        <div className="bg-slate-950 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between text-slate-400 mb-1.5">
            <span className="text-xs font-medium">Saldo Disponível</span>
            <Award className="w-4 h-4 text-sky-400" />
          </div>
          <p className="text-xl font-bold text-sky-400 font-mono tabular-nums">
            {formatBRL(club.finances.balance)}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            Luvas entram à vista na assinatura
          </p>
        </div>
      </div>

      {/* Main Split: Left (Jersey Preview + 4 Active Slots) | Right (Sponsor Proposals Selector) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Official Uniform Preview & 4 Slots Overview */}
        <div className="lg:col-span-4 bg-slate-950 border border-slate-800 rounded-xl p-5 space-y-5">
          <div className="border-b border-slate-800 pb-3">
            <h2 className="text-base font-bold text-white">
              Manto Oficial · {club.shortName}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Clique em qualquer uma das 4 cotas abaixo para escolher ou alterar o patrocinador.
            </p>
          </div>

          {/* Interactive SVG Club Kit with Live 4 Sponsor Brands */}
          <div className="bg-slate-900/70 rounded-xl p-4 flex flex-col items-center justify-center relative border border-slate-800/80">
            <svg
              viewBox="0 0 280 260"
              className="w-full max-w-[230px] h-auto drop-shadow-xl"
              role="img"
              aria-label={`Uniforme do ${club.name} com patrocinadores`}
            >
              {/* Jersey Drop Shadow / Base */}
              <path
                d="M78,24 L112,18 C122,32 158,32 168,18 L202,24 L254,68 L232,110 L198,92 L198,232 L82,232 L82,92 L48,110 L26,68 Z"
                fill={club.colors.primary}
                stroke={club.colors.secondary}
                strokeWidth="3.5"
                strokeLinejoin="round"
              />

              {/* Secondary Accent Vertical/Chest Stripe */}
              <rect
                x="84"
                y="116"
                width="112"
                height="38"
                fill={club.colors.secondary}
                opacity="0.22"
              />

              {/* Collar trim */}
              <path
                d="M112,18 C124,36 156,36 168,18"
                fill="none"
                stroke={club.colors.secondary}
                strokeWidth="4"
              />

              {/* Sleeve Cuffs */}
              <line
                x1="28"
                y1="72"
                x2="50"
                y2="108"
                stroke={club.colors.secondary}
                strokeWidth="5"
              />
              <line
                x1="252"
                y1="72"
                x2="230"
                y2="108"
                stroke={club.colors.secondary}
                strokeWidth="5"
              />

              {/* Club Crest (Left Chest from viewer's right) */}
              <circle
                cx="172"
                cy="74"
                r="14"
                fill={club.colors.secondary}
                stroke={club.colors.text}
                strokeWidth="1.5"
              />
              <text
                x="172"
                y="78"
                textAnchor="middle"
                fontSize="8.5"
                fontWeight="800"
                fill={club.colors.primary}
              >
                {club.initials}
              </text>

              {/* SLOT 2: KIT SUPPLIER (Right Chest) */}
              <g
                onClick={() => {
                  soundEngine.playClick();
                  setSelectedSlot('KIT_SUPPLIER');
                }}
                className="cursor-pointer"
              >
                <rect
                  x="92"
                  y="63"
                  width="46"
                  height="20"
                  rx="3"
                  fill={selectedSlot === 'KIT_SUPPLIER' ? 'rgba(56,189,248,0.28)' : 'rgba(0,0,0,0.32)'}
                  stroke={selectedSlot === 'KIT_SUPPLIER' ? '#38BDF8' : 'rgba(255,255,255,0.25)'}
                  strokeWidth="1.2"
                />
                <text
                  x="115"
                  y="76"
                  textAnchor="middle"
                  fontSize="7.5"
                  fontWeight="800"
                  fill="#FFFFFF"
                >
                  {kitSponsor ? kitSponsor.shortLabel : '+ FORNEC.'}
                </text>
              </g>

              {/* SLOT 1: MASTER SPONSOR (Center Chest) */}
              <g
                onClick={() => {
                  soundEngine.playClick();
                  setSelectedSlot('MASTER');
                }}
                className="cursor-pointer"
              >
                <rect
                  x="90"
                  y="119"
                  width="100"
                  height="32"
                  rx="4"
                  fill={selectedSlot === 'MASTER' ? 'rgba(56,189,248,0.32)' : 'rgba(0,0,0,0.45)'}
                  stroke={selectedSlot === 'MASTER' ? '#38BDF8' : 'rgba(255,255,255,0.35)'}
                  strokeWidth="1.5"
                />
                <text
                  x="140"
                  y="139"
                  textAnchor="middle"
                  fontSize="11"
                  fontWeight="900"
                  letterSpacing="0.6"
                  fill="#FFFFFF"
                >
                  {masterSponsor ? masterSponsor.shortLabel : '+ MASTER'}
                </text>
              </g>

              {/* SLOT 3: SLEEVE SPONSOR (Both Sleeves) */}
              <g
                onClick={() => {
                  soundEngine.playClick();
                  setSelectedSlot('SLEEVE');
                }}
                className="cursor-pointer"
              >
                <rect
                  x="39"
                  y="60"
                  width="36"
                  height="16"
                  rx="2.5"
                  transform="rotate(-28 57 68)"
                  fill={selectedSlot === 'SLEEVE' ? 'rgba(56,189,248,0.32)' : 'rgba(0,0,0,0.42)'}
                  stroke={selectedSlot === 'SLEEVE' ? '#38BDF8' : 'rgba(255,255,255,0.28)'}
                  strokeWidth="1"
                />
                <text
                  x="57"
                  y="71"
                  textAnchor="middle"
                  fontSize="6"
                  fontWeight="800"
                  transform="rotate(-28 57 68)"
                  fill="#FFFFFF"
                >
                  {sleeveSponsor ? sleeveSponsor.shortLabel.slice(0, 8) : '+ MANGA'}
                </text>

                <rect
                  x="205"
                  y="60"
                  width="36"
                  height="16"
                  rx="2.5"
                  transform="rotate(28 223 68)"
                  fill={selectedSlot === 'SLEEVE' ? 'rgba(56,189,248,0.32)' : 'rgba(0,0,0,0.42)'}
                  stroke={selectedSlot === 'SLEEVE' ? '#38BDF8' : 'rgba(255,255,255,0.28)'}
                  strokeWidth="1"
                />
                <text
                  x="223"
                  y="71"
                  textAnchor="middle"
                  fontSize="6"
                  fontWeight="800"
                  transform="rotate(28 223 68)"
                  fill="#FFFFFF"
                >
                  {sleeveSponsor ? sleeveSponsor.shortLabel.slice(0, 8) : '+ MANGA'}
                </text>
              </g>

              {/* SLOT 4: HEM / SHORTS / STADIUM SPONSOR */}
              <g
                onClick={() => {
                  soundEngine.playClick();
                  setSelectedSlot('SHORTS_STADIUM');
                }}
                className="cursor-pointer"
              >
                <rect
                  x="96"
                  y="196"
                  width="88"
                  height="22"
                  rx="3.5"
                  fill={selectedSlot === 'SHORTS_STADIUM' ? 'rgba(56,189,248,0.32)' : 'rgba(0,0,0,0.42)'}
                  stroke={selectedSlot === 'SHORTS_STADIUM' ? '#38BDF8' : 'rgba(255,255,255,0.3)'}
                  strokeWidth="1.2"
                />
                <text
                  x="140"
                  y="210"
                  textAnchor="middle"
                  fontSize="8"
                  fontWeight="800"
                  fill="#FFFFFF"
                >
                  {shortsSponsor ? shortsSponsor.shortLabel : '+ BARRA / ARENA'}
                </text>
              </g>
            </svg>
          </div>

          {/* 4 Slot Interactive Cards */}
          <div className="divide-y divide-slate-800/80 border-t border-slate-800">
            {SPONSOR_SLOTS_ORDER.map((slot) => {
              const meta = SPONSOR_SLOTS_META[slot];
              const contract = club.sponsors?.[slot];
              const isSelected = selectedSlot === slot;

              return (
                <div key={slot} className="py-3 first:pt-3 last:pb-0">
                  <button
                    type="button"
                    onClick={() => {
                      soundEngine.playClick();
                      setSelectedSlot(slot);
                      setConfirmingReplaceOption(null);
                    }}
                    className={`w-full text-left p-3 rounded-lg transition-colors cursor-pointer border ${
                      isSelected
                        ? 'bg-sky-950/40 border-sky-500/60'
                        : 'bg-slate-900/50 border-slate-800/80 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-slate-200">
                        {meta.order}. {meta.title}
                      </span>
                      <span
                        className={`text-xs font-mono tabular-nums font-semibold ${
                          contract ? 'text-emerald-400' : 'text-amber-400'
                        }`}
                      >
                        {contract ? `${formatBRL(contract.perRoundAmount)}/rod` : 'Vago · Escolher'}
                      </span>
                    </div>

                    {contract ? (
                      <div className="mt-1 flex items-center justify-between text-xs text-slate-400">
                        <span className="font-semibold text-white truncate">
                          {contract.companyName}
                        </span>
                        <span className="font-mono tabular-nums shrink-0">
                          {contract.roundsRemaining} rod restantes
                        </span>
                      </div>
                    ) : (
                      <p className="mt-1 text-xs text-slate-500">
                        Nenhum patrocinador ativo · 6 propostas disponíveis
                      </p>
                    )}
                  </button>

                  {contract && isSelected && confirmingTerminateSlot !== slot && (
                    <div className="mt-1.5 flex justify-end">
                      <button
                        type="button"
                        onClick={() => {
                          soundEngine.playClick();
                          setConfirmingTerminateSlot(slot);
                        }}
                        className="text-xs text-rose-400 hover:text-rose-300 cursor-pointer"
                      >
                        Rescindir contrato atual
                      </button>
                    </div>
                  )}

                  {contract && confirmingTerminateSlot === slot && (
                    <div className="mt-2 p-2.5 rounded-lg bg-rose-950/40 border border-rose-500/40 text-xs space-y-2">
                      <p className="text-rose-200">
                        Rescindir com <strong>{contract.companyName}</strong>? Multa proporcional:{' '}
                        <strong className="font-mono tabular-nums">
                          {formatBRL(computeProRataPenalty(slot))}
                        </strong>
                        .
                      </p>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => executeTerminate(slot)}
                          className="px-3 py-1 rounded bg-rose-600 hover:bg-rose-500 text-white font-semibold cursor-pointer whitespace-nowrap"
                        >
                          Confirmar Rescisão
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmingTerminateSlot(null)}
                          className="px-3 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer whitespace-nowrap"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Options Selector for the Selected Slot */}
        <div className="lg:col-span-8 space-y-4">
          {/* 4 Slot Step Tabs */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-1.5 flex items-center gap-1 overflow-x-auto">
            {SPONSOR_SLOTS_ORDER.map((slot) => {
              const meta = SPONSOR_SLOTS_META[slot];
              const isFilled = Boolean(club.sponsors?.[slot]);
              const isSelected = selectedSlot === slot;

              return (
                <button
                  key={slot}
                  type="button"
                  onClick={() => {
                    soundEngine.playClick();
                    setSelectedSlot(slot);
                    setConfirmingReplaceOption(null);
                  }}
                  className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-sky-500 text-slate-950'
                      : 'text-slate-300 hover:text-white hover:bg-slate-900'
                  }`}
                >
                  {isFilled && (
                    <Check
                      className={`w-3.5 h-3.5 shrink-0 ${
                        isSelected ? 'text-slate-950' : 'text-emerald-400'
                      }`}
                    />
                  )}
                  <span>{meta.shortTitle}</span>
                </button>
              );
            })}
          </div>

          {/* Slot Header & Strategy Filter */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-lg font-bold text-white">
                  Propostas para {SPONSOR_SLOTS_META[selectedSlot].title}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  {SPONSOR_SLOTS_META[selectedSlot].jerseyLocation} ·{' '}
                  {SPONSOR_SLOTS_META[selectedSlot].description}
                </p>
              </div>

              {/* Filter by Commercial Strategy */}
              <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-lg overflow-x-auto">
                {(
                  [
                    'ALL',
                    'Renda Fixa',
                    'Equilibrado',
                    'Bônus por Vitória',
                    'Luvas Imediatas',
                  ] as const
                ).map((prof) => (
                  <button
                    key={prof}
                    type="button"
                    onClick={() => {
                      soundEngine.playClick();
                      setProfileFilter(prof);
                    }}
                    className={`px-2.5 py-1 rounded text-xs font-medium whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                      profileFilter === prof
                        ? 'bg-slate-800 text-sky-300 font-semibold'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {prof === 'ALL' ? 'Todas (6)' : prof}
                  </button>
                ))}
              </div>
            </div>

            {/* Inline Confirmation Banner if Replacing an Active Sponsor */}
            {confirmingReplaceOption && activeSlotContract && (
              <div className="bg-amber-950/40 border border-amber-500/40 rounded-xl p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h4 className="text-sm font-bold text-amber-200">
                      Substituir {activeSlotContract.companyName} por{' '}
                      {confirmingReplaceOption.companyName}?
                    </h4>
                    <p className="text-xs text-slate-300 mt-1">
                      Você receberá{' '}
                      <strong className="text-emerald-400 font-mono tabular-nums">
                        +{formatBRL(confirmingReplaceOption.signingBonus)}
                      </strong>{' '}
                      de luvas da nova marca e pagará{' '}
                      <strong className="text-rose-400 font-mono tabular-nums">
                        -{formatBRL(computeProRataPenalty(selectedSlot))}
                      </strong>{' '}
                      de multa rescisória pelo contrato atual (saldo líquido imediato:{' '}
                      <strong className="text-white font-mono tabular-nums">
                        {formatBRL(
                          confirmingReplaceOption.signingBonus -
                            computeProRataPenalty(selectedSlot)
                        )}
                      </strong>
                      ).
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => executeSign(confirmingReplaceOption)}
                    className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs cursor-pointer whitespace-nowrap"
                  >
                    Confirmar Troca de Patrocinador
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmingReplaceOption(null)}
                    className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-xs cursor-pointer whitespace-nowrap"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}

            {/* 6 Sponsor Options Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredOptions.map((option) => {
                const isCurrentSponsor = activeSlotContract?.id === option.id;
                const guaranteedTotal =
                  option.signingBonus + option.perRoundAmount * option.totalRounds;

                return (
                  <div
                    key={option.id}
                    className={`rounded-xl p-4 border flex flex-col justify-between transition-colors ${
                      isCurrentSponsor
                        ? 'bg-emerald-950/20 border-emerald-500/50'
                        : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="space-y-3">
                      {/* Brand Header */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className="w-10 h-10 rounded-lg flex items-center justify-center font-black text-xs shrink-0 text-slate-950"
                            style={{ backgroundColor: option.accentColor }}
                          >
                            {option.shortLabel.slice(0, 3)}
                          </div>
                          <div className="min-w-0">
                            <h4 className="text-sm font-bold text-white truncate">
                              {option.companyName}
                            </h4>
                            <p className="text-xs text-slate-400 truncate">
                              {option.sector} · {option.profile}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Financial Figures Breakdown */}
                      <div className="pt-2 border-t border-slate-800/80 space-y-2 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400">Luvas na Assinatura (À Vista)</span>
                          <span className="font-mono tabular-nums font-bold text-sky-400">
                            +{formatBRL(option.signingBonus)}
                          </span>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-slate-400">Valor Fixo por Rodada</span>
                          <span className="font-mono tabular-nums font-bold text-emerald-400">
                            {formatBRL(option.perRoundAmount)} / jogo
                          </span>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-slate-400">Bônus Vitória · Gol</span>
                          <span className="font-mono tabular-nums font-semibold text-amber-300">
                            +{formatBRL(option.winBonus)} · +{formatBRL(option.goalBonus)}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-slate-400 pt-1 border-t border-slate-800/50">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 text-slate-500" />
                            <span>Contrato de {option.totalRounds} rodadas</span>
                          </span>
                          <span
                            className="font-mono tabular-nums text-slate-300"
                            title="Soma das luvas + parcelas fixas"
                          >
                            Garantido: {formatBRL(guaranteedTotal)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Action CTA */}
                    <div className="mt-4 pt-3 border-t border-slate-800/80">
                      {isCurrentSponsor ? (
                        <div className="w-full py-2 px-4 rounded-lg bg-emerald-500/15 text-emerald-300 font-bold text-xs flex items-center justify-center gap-1.5 whitespace-nowrap">
                          <ShieldCheck className="w-4 h-4 shrink-0" />
                          <span>
                            Patrocinador Ativo ({activeSlotContract.roundsRemaining} rodadas)
                          </span>
                        </div>
                      ) : activeSlotContract ? (
                        <button
                          type="button"
                          onClick={() => handleChooseOption(option)}
                          className="w-full py-2 px-4 rounded-lg bg-slate-800 hover:bg-sky-500 text-slate-200 hover:text-slate-950 font-bold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
                        >
                          <RefreshCw className="w-3.5 h-3.5 shrink-0" />
                          <span>Trocar para {option.shortLabel}</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleChooseOption(option)}
                          className="w-full py-2 px-4 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
                        >
                          <Handshake className="w-4 h-4 shrink-0" />
                          <span>Escolher {option.shortLabel}</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
