import React, { useState } from 'react';
import {
  BookOpen,
  Calendar,
  CheckCircle2,
  Cloud,
  Globe,
  Play,
  Shield,
  Sparkles,
  Trophy,
  Users,
  Wallet,
  X,
} from 'lucide-react';
import { soundEngine } from '../services/soundEngine';

export type GameGuideTab = 'guide' | 'changelog';

interface GameGuideModalProps {
  initialTab?: GameGuideTab;
  onClose: () => void;
}

const GUIDE_SECTIONS = [
  {
    icon: Users,
    accent: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
    title: '1. Escalação, Táticas e Condição Física',
    points: [
      'Monte os 11 titulares em "Escalação & Campo" escolhendo formação (4-3-3, 4-4-2, 3-5-2 e mais) e estilo de jogo.',
      'Fique atento à barra de energia e ao moral dos atletas: rodar o elenco em jogos de Estadual ou Copa evita lesões e quedas de rendimento.',
      'Use o "Centro de Treino" para evoluir jovens promessas e adaptar jogadores a novas posições.',
    ],
  },
  {
    icon: Play,
    accent: 'text-sky-400 bg-sky-500/10 border-sky-500/30',
    title: '2. Simulação de Partidas 2D ao Vivo',
    points: [
      'No dia de jogo, clique em "Jogar Partida" para assistir no campo 2D com narração, estatísticas e substituições lado a lado sem perder o campo de vista.',
      'Você pode acelerar (1x, 2x, 4x), pausar para mudar tática/substituir até 5 jogadores ou usar a simulação instantânea quando quiser avançar rápido.',
    ],
  },
  {
    icon: Wallet,
    accent: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
    title: '3. Finanças, Estádio e Mercado da Bola',
    points: [
      'Acompanhe o gráfico mensal do saldo nos últimos 6 meses e o DRE completo em "Finanças & Estádio".',
      'Ajuste preços de ingressos (Popular, Cadeiras, VIP), plano de Sócio-Torcedor e feche os 4 espaços de patrocínio para manter o caixa no azul.',
      'No "Mercado da Bola", negocie compras, vendas, empréstimos e contratos livres respeitando o orçamento e o Fair Play Financeiro.',
    ],
  },
  {
    icon: Globe,
    accent: 'text-violet-400 bg-violet-500/10 border-violet-500/30',
    title: '4. Estaduais, Ligas Mundiais e Copa do Mundo',
    points: [
      'Dispute os 27 campeonatos estaduais, Séries A/B/C (24 clubes · 46 rodadas + Playoff 4º–7º) e Série D (96 clubes), Libertadores, Sul-Americana, 20 ligas europeias, ligas das Américas, Ásia e África.',
      'Aumente sua reputação para receber convites de Seleções Nacionais e disputar Eliminatórias, Copa América, Eurocopa e a Copa do Mundo de 48 seleções (ciclos 2027–2038).',
    ],
  },
  {
    icon: Cloud,
    accent: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30',
    title: '5. Salvamento Automático, Backup e PWA',
    points: [
      'Seu progresso é salvo automaticamente no navegador (IndexedDB). Entre com sua conta Google ou login de treinador para sincronizar slots na nuvem.',
      'Use "Saves & Backups" para manter até múltiplos slots ou exportar/importar arquivos .json de segurança.',
      'Clique em "Instalar App" no celular ou desktop para jogar em tela cheia como aplicativo nativo.',
    ],
  },
];

const RELEASE_HIGHLIGHTS = [
  'Base mundial completa com 946 clubes, 27 Estaduais brasileiros, Séries A/B, Série C (24 clubes · 46 rodadas + Playoff 4º–7º), Série D (96 clubes), 20 ligas europeias, América do Sul, MLS, Liga MX, Arábia Saudita, Japão, Rússia e África.',
  'Temporada inicial 2027 na América do Sul e 2026/27 na Europa, além de ciclo completo de Seleções e Copa do Mundo de 48 seleções (2030, 2034 e 2038) com calendários FIFA.',
  'Simulador de Partidas 2D ao vivo com layout lado a lado (campo fixo à esquerda + narração, placar e substituições à direita).',
  'Painel de Finanças & Estádio com gráfico de linha do histórico mensal do saldo nos últimos 6 meses, DRE detalhado, Sócio-Torcedor e Fair Play Financeiro.',
  'Retrospectiva Completa da Temporada comparando desempenho real do elenco com as metas da diretoria em 4 abas.',
  'PWA instalável (mobile e desktop) com suporte offline, saves comprimidos em IndexedDB/nuvem e backup em JSON.',
];

export const GameGuideModal: React.FC<GameGuideModalProps> = ({
  initialTab = 'guide',
  onClose,
}) => {
  const [tab, setTab] = useState<GameGuideTab>(initialTab);

  return (
    <div
      className="fixed inset-0 z-[70] bg-slate-950/85 backdrop-blur-md flex items-start justify-center p-2 sm:p-5 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          soundEngine.playClick();
          onClose();
        }
      }}
    >
      <div className="bg-[#0b1220] border border-slate-700/80 rounded-2xl w-full max-w-3xl my-auto max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="shrink-0 px-5 py-4 border-b border-slate-800 flex items-center justify-between gap-3 bg-[#090f1c]">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/35 flex items-center justify-center shrink-0">
              {tab === 'guide' ? (
                <BookOpen className="w-5 h-5 text-emerald-400" />
              ) : (
                <Sparkles className="w-5 h-5 text-sky-400" />
              )}
            </div>
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-extrabold font-display text-white truncate">
                {tab === 'guide' ? 'Manual Rápido · Como Jogar' : 'PATOFOOT · Versão 1.0'}
              </h2>
              <p className="text-xs text-slate-400 truncate">
                {tab === 'guide'
                  ? 'Tudo o que você precisa para começar sua carreira com o pé direito.'
                  : 'Notas de lançamento, recursos oficiais e créditos.'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              soundEngine.playClick();
              onClose();
            }}
            aria-label="Fechar"
            className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 transition-colors cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="px-5 pt-3 pb-2 border-b border-slate-800/80 flex items-center gap-2 bg-[#0b1220]">
          <button
            type="button"
            onClick={() => {
              soundEngine.playClick();
              setTab('guide');
            }}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
              tab === 'guide'
                ? 'bg-emerald-500 text-slate-950'
                : 'bg-slate-900 text-slate-300 hover:text-white border border-slate-800'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Como Jogar</span>
          </button>
          <button
            type="button"
            onClick={() => {
              soundEngine.playClick();
              setTab('changelog');
            }}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
              tab === 'changelog'
                ? 'bg-sky-400 text-slate-950'
                : 'bg-slate-900 text-slate-300 hover:text-white border border-slate-800'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Novidades v1.0 & Créditos</span>
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 min-h-0 overflow-y-auto p-5 space-y-4">
          {tab === 'guide' ? (
            <>
              <div className="grid grid-cols-1 gap-3.5">
                {GUIDE_SECTIONS.map((sec) => {
                  const Icon = sec.icon;
                  return (
                    <div
                      key={sec.title}
                      className="bg-[#070c16] border border-slate-800/90 rounded-xl p-4"
                    >
                      <div className="flex items-center gap-2.5 mb-2.5">
                        <div
                          className={`w-8 h-8 rounded-lg border flex items-center justify-center shrink-0 ${sec.accent}`}
                        >
                          <Icon className="w-4 h-4" />
                        </div>
                        <h3 className="text-sm font-bold text-white">{sec.title}</h3>
                      </div>
                      <ul className="space-y-1.5 text-xs text-slate-300 leading-relaxed">
                        {sec.points.map((pt, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400/80 shrink-0 mt-0.5" />
                            <span>{pt}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
              </div>

              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start gap-2.5">
                  <Calendar className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <p className="text-xs text-emerald-100 leading-relaxed">
                    <strong>Dica de ouro:</strong> acompanhe os objetivos da diretoria na aba{' '}
                    <strong>Diretoria & Carreira</strong> — cumprir as metas aumenta sua confiança,
                    libera bônus em caixa e abre portas para clubes maiores e Seleções.
                  </p>
                </div>
              </div>
            </>
          ) : (
            <div className="space-y-4">
              <div className="bg-gradient-to-br from-emerald-500/15 via-[#070c16] to-sky-500/15 border border-emerald-500/30 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">
                    Edição de Lançamento
                  </span>
                  <h3 className="text-lg font-extrabold font-display text-white mt-0.5">
                    PATOFOOT · v1.0.0
                  </h3>
                  <p className="text-xs text-slate-300 mt-0.5">
                    Simulador completo de futebol manager brasileiro e mundial.
                  </p>
                </div>
                <div className="flex items-center gap-2 text-xs font-mono text-sky-300 bg-[#070c16]/90 border border-slate-700/80 rounded-xl px-3 py-2">
                  <Trophy className="w-4 h-4 text-amber-400" />
                  <span>946 Clubes · 195 Seleções</span>
                </div>
              </div>

              <div className="bg-[#070c16] border border-slate-800/90 rounded-xl p-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-sky-300 mb-3">
                  Destaques desta versão
                </h4>
                <ul className="space-y-2 text-xs text-slate-300 leading-relaxed">
                  {RELEASE_HIGHLIGHTS.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-sky-400 shrink-0 mt-0.5" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="bg-[#070c16] border border-slate-800/90 rounded-xl p-4 flex items-start gap-3">
                <Shield className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div className="text-xs text-slate-400 leading-relaxed space-y-1">
                  <p className="text-slate-200 font-semibold">Sobre o Projeto</p>
                  <p>
                    Criado com foco em agilidade, profundidade tática e fidelidade aos calendários
                    do futebol brasileiro, sul-americano, europeu e mundial.
                  </p>
                  <p className="text-slate-500">
                    Dica: ative o salvamento automático em Configurações e mantenha backups na nuvem
                    ou em arquivo JSON para nunca perder sua carreira.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 border-t border-slate-800 bg-[#090f1c] flex items-center justify-between gap-3">
          <span className="text-[11px] text-slate-500 font-mono">PATOFOOT · v1.0.0</span>
          <button
            type="button"
            onClick={() => {
              soundEngine.playClick();
              onClose();
            }}
            className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-extrabold transition-colors cursor-pointer"
          >
            Entendi, vamos jogar!
          </button>
        </div>
      </div>
    </div>
  );
};
