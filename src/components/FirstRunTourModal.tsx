import React, { useState } from 'react';
import { soundEngine } from '../services/soundEngine';
import {
  ArrowLeft,
  ArrowRight,
  Calendar,
  CheckCircle2,
  Dumbbell,
  PlayCircle,
  Sliders,
  X,
} from 'lucide-react';

interface FirstRunTourModalProps {
  clubShortName: string;
  onNavigateTab: (tab: string) => void;
  onFinish: () => void;
}

const TOUR_STEPS = [
  {
    stepNum: 1,
    title: 'Escalação, Tática e 3 Perfis Prontos',
    subtitle: 'Monte seu time ideal e salve esquemas para alternar com 1 clique',
    description:
      'Na aba Táticas e Elenco, defina os 11 titulares, o capitão e os cobradores. Salve até 3 Perfis Táticos (ex.: Titular Ofensivo, Retranca Fora de Casa e Time Reserva) para trocar de esquema sem perder tempo entre rodadas.',
    tip: 'Dica rápida: ative o Assistente Técnico IA se quiser poupar automaticamente titulares cansados.',
    tab: 'tactics',
    ctaLabel: 'Ir para Táticas',
    icon: Sliders,
    accent: 'text-sky-400',
  },
  {
    stepNum: 2,
    title: 'Treinamento Inteligente & Foco Semanal',
    subtitle: 'Evite lesões e acelere a evolução dos seus atletas',
    description:
      'No Centro de Treinamento, o sistema analisa o cansaço médio do elenco e o calendário de jogos para recomendar o Foco ideal da semana (Físico, Técnico ou Tático). Também é possível lapidar jovens da base e retreinar posições.',
    tip: 'Dica rápida: contrate preparadores físicos e médicos para acelerar a recuperação entre jogos.',
    tab: 'training',
    ctaLabel: 'Abrir Treinamento',
    icon: Dumbbell,
    accent: 'text-emerald-400',
  },
  {
    stepNum: 3,
    title: 'Avanço Inteligente & Último Dia da Janela',
    subtitle: 'Ritmo ágil no PC e no celular, pausando só no que importa',
    description:
      'Use o botão Avanço Inteligente na Central do Clube ou no Calendário para pular dias vazios até o próximo jogo. O jogo pausa automaticamente se chegar proposta de transferência, lesão grave ou o Plantão do Último Dia da Janela!',
    tip: 'Dica rápida: acompanhe também os patrocínios e o caixa para manter o Fair Play Financeiro no azul.',
    tab: 'calendar',
    ctaLabel: 'Ver Calendário',
    icon: Calendar,
    accent: 'text-amber-400',
  },
  {
    stepNum: 4,
    title: 'Dia de Jogo 2D, Gritos, Preleção e xG',
    subtitle: 'Decida partidas ao vivo na beira do gramado',
    description:
      'Durante a partida 2D, use Gritos da Área Técnica (Pressionar Alto, Tudo ou Nada, Esfriar o Jogo), faça até 5 substituições e escolha a Preleção certa no intervalo. Ao final, acompanhe o xG (Gols Esperados) e as notas de 0 a 10.',
    tip: 'Conquistou um título? Baixe o Cartão Compartilhável em imagem PNG direto na celebração!',
    tab: 'hub',
    ctaLabel: 'Começar na Central',
    icon: PlayCircle,
    accent: 'text-rose-400',
  },
];

export const FirstRunTourModal: React.FC<FirstRunTourModalProps> = ({
  clubShortName,
  onNavigateTab,
  onFinish,
}) => {
  const [stepIdx, setStepIdx] = useState(0);
  const current = TOUR_STEPS[stepIdx];
  const Icon = current.icon;
  const isLast = stepIdx === TOUR_STEPS.length - 1;

  return (
    <div className="fixed inset-0 z-[75] bg-slate-950/85 backdrop-blur-sm flex items-start justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-[#0b1324] border border-slate-700/80 rounded-2xl w-full max-w-lg my-auto shadow-2xl overflow-hidden">
        {/* Progress Header */}
        <div className="px-5 py-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between gap-3">
          <div>
            <div className="text-[11px] font-semibold text-sky-400 tabular-nums">
              Tour Rápido · Passo {current.stepNum} de {TOUR_STEPS.length}
            </div>
            <h2 className="text-sm font-black text-white">
              Bem-vindo ao comando do {clubShortName}
            </h2>
          </div>

          <button
            type="button"
            onClick={() => {
              soundEngine.playClick();
              onFinish();
            }}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Pular tour"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 4-bar visual step progress */}
        <div className="grid grid-cols-4 gap-1 px-5 pt-4">
          {TOUR_STEPS.map((s, idx) => (
            <button
              key={s.stepNum}
              type="button"
              onClick={() => {
                soundEngine.playClick();
                setStepIdx(idx);
              }}
              className={`h-1.5 rounded-full transition-colors cursor-pointer ${
                idx <= stepIdx ? 'bg-sky-400' : 'bg-slate-800'
              }`}
              aria-label={`Ir para passo ${s.stepNum}`}
            />
          ))}
        </div>

        {/* Body */}
        <div className="p-5 sm:p-6 space-y-4">
          <div className="flex items-start gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center shrink-0">
              <Icon className={`w-6 h-6 ${current.accent}`} />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-white leading-snug">
                {current.title}
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">{current.subtitle}</p>
            </div>
          </div>

          <p className="text-sm text-slate-200 leading-relaxed">{current.description}</p>

          <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 text-xs text-slate-300 leading-relaxed">
            {current.tip}
          </div>
        </div>

        {/* Footer Controls */}
        <div className="px-5 py-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            {stepIdx > 0 ? (
              <button
                type="button"
                onClick={() => {
                  soundEngine.playClick();
                  setStepIdx((i) => Math.max(0, i - 1));
                }}
                className="px-3.5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-bold text-slate-200 flex items-center gap-1.5 whitespace-nowrap cursor-pointer transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Anterior</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  soundEngine.playClick();
                  onFinish();
                }}
                className="px-3 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white whitespace-nowrap cursor-pointer transition-colors"
              >
                Pular guia
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                soundEngine.playClick();
                onFinish();
                onNavigateTab(current.tab);
              }}
              className="px-3.5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-bold text-sky-300 whitespace-nowrap cursor-pointer transition-colors"
            >
              {current.ctaLabel}
            </button>

            {isLast ? (
              <button
                type="button"
                onClick={() => {
                  soundEngine.playClick();
                  onFinish();
                }}
                className="px-4 py-2.5 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-black text-xs flex items-center gap-1.5 whitespace-nowrap cursor-pointer transition-colors"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Concluir</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  soundEngine.playClick();
                  setStepIdx((i) => Math.min(TOUR_STEPS.length - 1, i + 1));
                }}
                className="px-4 py-2.5 rounded-xl bg-sky-400 hover:bg-sky-300 text-slate-950 font-black text-xs flex items-center gap-1.5 whitespace-nowrap cursor-pointer transition-colors"
              >
                <span>Próximo</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
