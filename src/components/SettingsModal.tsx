import React, { useState } from 'react';
import {
  AutoSaveIntervalMinutes,
  DEFAULT_GAME_SETTINGS,
  GAME_LANGUAGES_META,
  GameDifficulty,
  GameLanguage,
  GameSettings,
  PerformanceMode,
  getAutoSaveIntervalLabel,
  resolveEffectiveLiteMode,
} from '../utils/settingsEngine';
import { soundEngine } from '../services/soundEngine';
import { LanguageSwitcher } from './LanguageSwitcher';
import {
  Settings,
  Volume2,
  VolumeX,
  Sliders,
  Shield,
  RotateCcw,
  Trash2,
  CheckCircle2,
  X,
  LogOut,
  Play,
  Database,
  Clock,
  Globe,
} from 'lucide-react';

interface SettingsModalProps {
  settings: GameSettings;
  onUpdateSettings: (next: GameSettings) => void;
  onClose: () => void;
  initialSection?: 'audio' | 'match' | 'career';
  isInGame?: boolean;
  onSaveAndExitToTitle?: () => void;
  onClearAllSavedData?: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = React.memo(({
  settings,
  onUpdateSettings,
  onClose,
  initialSection = 'audio',
  isInGame = false,
  onSaveAndExitToTitle,
  onClearAllSavedData,
}) => {
  const [activeSection, setActiveSection] = useState<'audio' | 'match' | 'career'>(initialSection);
  const [confirmClearAll, setConfirmClearAll] = useState<boolean>(false);
  const [statusBanner, setStatusBanner] = useState<string | null>(null);

  const showFeedback = (msg: string) => {
    setStatusBanner(msg);
    setTimeout(() => setStatusBanner(null), 2400);
  };

  const handleToggleMute = () => {
    const nextMuted = !settings.isMuted;
    soundEngine.setMuted(nextMuted);
    onUpdateSettings({ ...settings, isMuted: nextMuted });
    if (!nextMuted) {
      soundEngine.playClick();
    }
  };

  const handleVolumeChange = (val: number) => {
    const nextMuted = val === 0 ? true : false;
    soundEngine.setVolume(val);
    soundEngine.setMuted(nextMuted);
    onUpdateSettings({
      ...settings,
      masterVolume: val,
      isMuted: nextMuted,
    });
  };

  const handleResetDefaults = () => {
    soundEngine.setVolume(DEFAULT_GAME_SETTINGS.masterVolume);
    soundEngine.setMuted(DEFAULT_GAME_SETTINGS.isMuted);
    onUpdateSettings({ ...DEFAULT_GAME_SETTINGS });
    soundEngine.playClick();
    showFeedback('Configurações restauradas para o padrão oficial.');
  };

  const difficultyOptions: Array<{
    id: GameDifficulty;
    label: string;
    summary: string;
  }> = [
    {
      id: 'CASUAL',
      label: 'Casual',
      summary: 'Orçamento inicial +15%, diretoria mais paciente e leve vantagem ofensiva.',
    },
    {
      id: 'PADRAO',
      label: 'Padrão',
      summary: 'Equilíbrio oficial de simulação, finanças e cobrança da diretoria.',
    },
    {
      id: 'REALISTA',
      label: 'Realista',
      summary: 'Orçamento inicial enxuto (-12%), diretoria rigorosa e rivais mais letais.',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/85 flex items-start justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-slate-950 border border-slate-800 rounded-2xl w-full max-w-2xl shadow-2xl p-5 sm:p-7 my-auto flex flex-col max-h-[92vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <Settings className="w-5 h-5 text-sky-400 shrink-0" />
            <div>
              <h3 className="text-lg font-bold text-white leading-tight">
                Configurações do Jogo
              </h3>
              <p className="text-xs text-slate-400">
                Áudio · Simulação de Partida · Salvamento IndexedDB &amp; Carreira
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <LanguageSwitcher compact />
            <button
              type="button"
              onClick={() => {
                soundEngine.playClick();
                onClose();
              }}
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-900 transition-colors cursor-pointer"
              title="Fechar configurações"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Section Tabs */}
        <div className="flex items-center gap-1 p-1 bg-slate-900 border border-slate-800 rounded-xl mt-4">
          <button
            type="button"
            onClick={() => {
              soundEngine.playClick();
              setActiveSection('audio');
            }}
            className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeSection === 'audio'
                ? 'bg-sky-400 text-slate-950 font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Volume2 className="w-3.5 h-3.5 shrink-0" />
            <span>Áudio &amp; Som</span>
          </button>

          <button
            type="button"
            onClick={() => {
              soundEngine.playClick();
              setActiveSection('match');
            }}
            className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeSection === 'match'
                ? 'bg-sky-400 text-slate-950 font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Sliders className="w-3.5 h-3.5 shrink-0" />
            <span>Partida &amp; Visual</span>
          </button>

          <button
            type="button"
            onClick={() => {
              soundEngine.playClick();
              setActiveSection('career');
            }}
            className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeSection === 'career'
                ? 'bg-sky-400 text-slate-950 font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Shield className="w-3.5 h-3.5 shrink-0" />
            <span>Carreira &amp; Salvamento</span>
          </button>
        </div>

        {statusBanner && (
          <div className="mt-4 px-3.5 py-2.5 rounded-xl bg-sky-950/50 border border-sky-500/30 text-xs text-sky-300 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-sky-400" />
            <span>{statusBanner}</span>
          </div>
        )}

        {/* Content Body */}
        <div className="flex-1 min-h-0 overflow-y-auto py-5 space-y-6">
          {activeSection === 'audio' && (
            <div className="space-y-6">
              {/* Mute Toggle */}
              <div className="flex items-center justify-between gap-4 pb-5 border-b border-slate-800/80">
                <div>
                  <h4 className="text-sm font-semibold text-white">Som Geral do Estádio e Menus</h4>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Ativa ou silencia apitos, gritos da torcida, chutes na trave e cliques.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleToggleMute}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer border ${
                    settings.isMuted
                      ? 'bg-rose-950/40 border-rose-500/40 text-rose-300 hover:bg-rose-950/60'
                      : 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300 hover:bg-emerald-950/60'
                  }`}
                >
                  {settings.isMuted ? (
                    <>
                      <VolumeX className="w-4 h-4" />
                      <span>Silenciado</span>
                    </>
                  ) : (
                    <>
                      <Volume2 className="w-4 h-4" />
                      <span>Som Ativado</span>
                    </>
                  )}
                </button>
              </div>

              {/* Volume Slider */}
              <div className="space-y-3 pb-5 border-b border-slate-800/80">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-semibold text-white">Volume Principal</h4>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Ajuste fino da intensidade sonora em tempo real.
                    </p>
                  </div>
                  <span className="text-sm font-mono font-bold text-sky-400 tabular-nums">
                    {settings.isMuted ? '0%' : `${settings.masterVolume}%`}
                  </span>
                </div>

                <input
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  value={settings.isMuted ? 0 : settings.masterVolume}
                  onChange={(e) => handleVolumeChange(Number(e.target.value))}
                  className="w-full accent-sky-400 h-2 bg-slate-800 rounded-lg cursor-pointer"
                />

                <div className="flex justify-between text-[11px] font-mono text-slate-500 tabular-nums">
                  <span>0%</span>
                  <span>25%</span>
                  <span>50%</span>
                  <span>75%</span>
                  <span>100%</span>
                </div>
              </div>

              {/* Audio Test Buttons */}
              <div className="space-y-2.5">
                <h4 className="text-xs font-semibold text-slate-300">
                  Testar Efeitos Sonoros
                </h4>
                <div className="flex flex-wrap items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => soundEngine.playWhistle(false)}
                    className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-semibold text-slate-200 flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer transition-colors"
                  >
                    <Play className="w-3.5 h-3.5 text-sky-400" />
                    <span>Testar Apito</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => soundEngine.playGoalRoar()}
                    className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-semibold text-slate-200 flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer transition-colors"
                  >
                    <Play className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Testar Grito de Gol</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => soundEngine.playFanfare()}
                    className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-semibold text-slate-200 flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer transition-colors"
                  >
                    <Play className="w-3.5 h-3.5 text-amber-400" />
                    <span>Testar Fanfarra de Título</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'match' && (
            <div className="space-y-6">
              {/* Default Match Speed */}
              <div className="space-y-2.5 pb-5 border-b border-slate-800/80">
                <div>
                  <h4 className="text-sm font-semibold text-white">
                    Velocidade Inicial do Simulador 2D
                  </h4>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Define o ritmo padrão do relógio ao iniciar cada partida (você ainda pode alterar durante o jogo).
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-2 pt-1">
                  {(
                    [
                      { val: 1, label: '1x Normal' },
                      { val: 2, label: '2x Rápido' },
                      { val: 4, label: '4x Turbo' },
                    ] as const
                  ).map((opt) => (
                    <button
                      key={opt.val}
                      type="button"
                      onClick={() => {
                        soundEngine.playClick();
                        onUpdateSettings({ ...settings, defaultMatchSpeed: opt.val });
                      }}
                      className={`py-2.5 px-3 rounded-xl text-xs font-bold border transition-colors whitespace-nowrap shrink-0 cursor-pointer tabular-nums ${
                        settings.defaultMatchSpeed === opt.val
                          ? 'bg-sky-400 border-sky-400 text-slate-950'
                          : 'bg-slate-900 border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Pause at Halftime */}
              <div className="flex items-center justify-between gap-4 pb-5 border-b border-slate-800/80">
                <div>
                  <h4 className="text-sm font-semibold text-white">
                    Pausa Automática no Intervalo (45&apos;)
                  </h4>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Para o cronômetro aos 45 minutos para preleção de vestiário e substituições.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playClick();
                    onUpdateSettings({
                      ...settings,
                      pauseAtHalftime: !settings.pauseAtHalftime,
                    });
                  }}
                  className={`px-4 py-2 rounded-xl text-xs font-bold border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    settings.pauseAtHalftime
                      ? 'bg-sky-950/60 border-sky-500/40 text-sky-300'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {settings.pauseAtHalftime ? 'Ativada' : 'Direto ao 2º Tempo'}
                </button>
              </div>

              {/* Default Sector Map */}
              <div className="flex items-center justify-between gap-4 pb-5 border-b border-slate-800/80">
                <div>
                  <h4 className="text-sm font-semibold text-white">
                    Mapa de Domínio de Setores no Radar 2D
                  </h4>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Exibe automaticamente as porcentagens de posse por faixa do gramado.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playClick();
                    onUpdateSettings({
                      ...settings,
                      defaultShowSectorMap: !settings.defaultShowSectorMap,
                    });
                  }}
                  className={`px-4 py-2 rounded-xl text-xs font-bold border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    settings.defaultShowSectorMap
                      ? 'bg-sky-950/60 border-sky-500/40 text-sky-300'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {settings.defaultShowSectorMap ? 'Visível' : 'Oculto'}
                </button>
              </div>

              {/* Confetti Celebrations */}
              <div className="flex items-center justify-between gap-4 pb-5 border-b border-slate-800/80">
                <div>
                  <h4 className="text-sm font-semibold text-white">
                    Celebrações Visuais e Confetes
                  </h4>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Dispara efeitos comemorativos na tela em gols do seu clube e conquistas de taça.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playClick();
                    onUpdateSettings({
                      ...settings,
                      enableConfetti: !settings.enableConfetti,
                    });
                  }}
                  className={`px-4 py-2 rounded-xl text-xs font-bold border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    settings.enableConfetti
                      ? 'bg-sky-950/60 border-sky-500/40 text-sky-300'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {settings.enableConfetti ? 'Ativado' : 'Desativado'}
                </button>
              </div>

              {/* Cross-Device Performance Mode (PC / Celular / Web) */}
              <div className="space-y-2.5 pb-5 border-b border-slate-800/80">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h4 className="text-sm font-semibold text-white">
                      Modo de Desempenho (PC, Celular e Web)
                    </h4>
                    <p className="text-xs text-slate-400 mt-0.5">
                      O modo Ultra Leve reduz desfoques da GPU e estabiliza o campo 2D em 30fps para rodar liso em celulares e PCs modestos.
                    </p>
                  </div>
                  <span className="text-[11px] font-mono text-emerald-400">
                    {resolveEffectiveLiteMode(settings.performanceMode)
                      ? 'Perfil Leve Ativo'
                      : 'Perfil Alto Ativo'}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                  {(
                    [
                      {
                        val: 'AUTO' as PerformanceMode,
                        label: 'Automático',
                        desc: 'Detecta celular/PC e ajusta sozinho',
                      },
                      {
                        val: 'LEVE' as PerformanceMode,
                        label: 'Ultra Leve',
                        desc: 'Máxima fluidez e economia de bateria',
                      },
                      {
                        val: 'ALTO' as PerformanceMode,
                        label: 'Qualidade Máxima',
                        desc: 'Todos os efeitos visuais ativados',
                      },
                    ] as const
                  ).map((opt) => {
                    const active = (settings.performanceMode || 'AUTO') === opt.val;
                    return (
                      <button
                        key={opt.val}
                        type="button"
                        onClick={() => {
                          soundEngine.playClick();
                          onUpdateSettings({
                            ...settings,
                            performanceMode: opt.val,
                            enableConfetti:
                              opt.val === 'LEVE' ? false : settings.enableConfetti,
                          });
                        }}
                        className={`p-3 rounded-xl text-left border transition-colors cursor-pointer ${
                          active
                            ? 'bg-emerald-500/15 border-emerald-400 text-white'
                            : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'
                        }`}
                      >
                        <div className="text-xs font-bold">{opt.label}</div>
                        <div className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                          {opt.desc}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Keyboard Shortcuts Reference */}
              <div className="bg-slate-900/75 border border-slate-800 rounded-xl p-4 space-y-3">
                <div>
                  <h4 className="text-sm font-bold text-white">
                    Atalhos Rápidos de Teclado
                  </h4>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Comandos ativos durante a simulação 2D da partida e na navegação geral da carreira:
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {[
                    { keyLabel: 'Espaço', desc: 'Pausar / Retomar jogo ou iniciar 2º Tempo' },
                    { keyLabel: '1 · 2 · 3', desc: 'Velocidade da partida (1x, 2x ou 4x)' },
                    { keyLabel: 'S', desc: 'Abrir painel de Substituições na partida' },
                    { keyLabel: '/ ou Ctrl+K', desc: 'Busca Global de atletas, clubes e ligas' },
                    { keyLabel: 'Esc', desc: 'Fechar janelas e modais abertos' },
                  ].map((sc) => (
                    <div
                      key={sc.keyLabel}
                      className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-slate-950 border border-slate-800"
                    >
                      <span className="text-slate-300">{sc.desc}</span>
                      <kbd className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 font-mono text-[11px] font-bold text-sky-300 whitespace-nowrap shrink-0">
                        {sc.keyLabel}
                      </kbd>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeSection === 'career' && (
            <div className="space-y-6">
              {/* Game Language Selector */}
              <div className="bg-slate-900/75 border border-slate-800 rounded-xl p-4 sm:p-5 space-y-3.5">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Globe className="w-4 h-4 text-sky-400 shrink-0" />
                      <h4 className="text-sm font-bold text-white">Idioma do Jogo</h4>
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Escolha o idioma da interface, menus, táticas e partidas.
                    </p>
                  </div>
                  <span
                    data-no-i18n="true"
                    className="text-xs font-mono font-bold text-sky-300 shrink-0"
                  >
                    {GAME_LANGUAGES_META.find((l) => l.code === settings.language)?.flag}{' '}
                    {GAME_LANGUAGES_META.find((l) => l.code === settings.language)?.nativeName}
                  </span>
                </div>

                <div data-no-i18n="true" className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {GAME_LANGUAGES_META.map((langOpt) => {
                    const active = (settings.language || 'pt-BR') === langOpt.code;
                    return (
                      <button
                        key={langOpt.code}
                        type="button"
                        onClick={() => {
                          soundEngine.playClick();
                          onUpdateSettings({
                            ...settings,
                            language: langOpt.code as GameLanguage,
                          });
                          showFeedback(`${langOpt.flag} ${langOpt.nativeName} (${langOpt.shortCode})`);
                        }}
                        className={`px-3 py-2.5 rounded-xl border text-left transition-colors cursor-pointer flex items-center gap-2.5 ${
                          active
                            ? 'bg-sky-400 border-sky-400 text-slate-950 font-black'
                            : 'bg-slate-950 border-slate-800 text-slate-200 hover:border-slate-600 hover:text-white'
                        }`}
                      >
                        <span className="text-base leading-none shrink-0" aria-hidden="true">
                          {langOpt.flag}
                        </span>
                        <div className="min-w-0">
                          <div className="text-xs font-bold truncate">{langOpt.nativeName}</div>
                          <div
                            className={`text-[10px] truncate ${
                              active ? 'text-slate-900 font-semibold' : 'text-slate-500'
                            }`}
                          >
                            {langOpt.regionLabel}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Auto-Save Switch + Interval Selector */}
              <div className="bg-slate-900/75 border border-slate-800 rounded-xl p-4 sm:p-5 space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2">
                      <Database
                        className={`w-4 h-4 shrink-0 ${
                          settings.autoSaveEnabled ? 'text-emerald-400' : 'text-slate-500'
                        }`}
                      />
                      <h4 className="text-sm font-bold text-white">
                        Salvamento Automático (IndexedDB)
                      </h4>
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Ative ou desative a gravação automática da carreira no banco local{' '}
                      <span className="font-mono text-slate-300">IndexedDB</span> e escolha a frequência ideal.
                    </p>
                  </div>

                  <div className="flex items-center gap-3 shrink-0 pt-0.5">
                    <span
                      className={`text-xs font-bold whitespace-nowrap ${
                        settings.autoSaveEnabled ? 'text-emerald-300' : 'text-slate-400'
                      }`}
                    >
                      {settings.autoSaveEnabled ? 'Ativado' : 'Desativado'}
                    </span>

                    <button
                      type="button"
                      role="switch"
                      aria-checked={settings.autoSaveEnabled}
                      aria-label="Ativar ou desativar salvamento automático no IndexedDB"
                      onClick={() => {
                        soundEngine.playClick();
                        const nextEnabled = !settings.autoSaveEnabled;
                        onUpdateSettings({
                          ...settings,
                          autoSaveEnabled: nextEnabled,
                        });
                        showFeedback(
                          nextEnabled
                            ? `Salvamento automático ativado (${getAutoSaveIntervalLabel(
                                settings.autoSaveIntervalMinutes ?? 0
                              )}).`
                            : 'Salvamento automático desativado. Use os Espaços 1–5 ou .json para salvar manualmente.'
                        );
                      }}
                      className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full border transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 ${
                        settings.autoSaveEnabled
                          ? 'bg-emerald-500 border-emerald-400'
                          : 'bg-slate-800 border-slate-700 hover:border-slate-600'
                      }`}
                    >
                      <span
                        className={`inline-block h-5 w-5 rounded-full bg-white shadow-md transition-transform ${
                          settings.autoSaveEnabled ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                </div>

                {/* Interval Selector */}
                <div
                  className={`pt-3 border-t border-slate-800/80 space-y-2.5 transition-opacity ${
                    settings.autoSaveEnabled ? 'opacity-100' : 'opacity-45 pointer-events-none'
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-200">
                      <Clock className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                      <span>Intervalo de Auto-Salvamento</span>
                    </div>
                    <span className="text-[11px] font-mono tabular-nums text-sky-300 font-bold">
                      {settings.autoSaveEnabled
                        ? (settings.autoSaveIntervalMinutes ?? 0) === 0
                          ? 'A cada ação'
                          : `A cada ${settings.autoSaveIntervalMinutes} min`
                        : 'Desligado'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                    {(
                      [
                        { val: 0 as AutoSaveIntervalMinutes, label: 'Contínuo', sub: 'A cada ação' },
                        { val: 5 as AutoSaveIntervalMinutes, label: '5 min', sub: 'Frequente' },
                        { val: 10 as AutoSaveIntervalMinutes, label: '10 min', sub: 'Equilibrado' },
                        { val: 30 as AutoSaveIntervalMinutes, label: '30 min', sub: 'Moderado' },
                        { val: 60 as AutoSaveIntervalMinutes, label: '60 min', sub: 'Espaçado' },
                      ] as const
                    ).map((opt) => {
                      const active = (settings.autoSaveIntervalMinutes ?? 0) === opt.val;
                      return (
                        <button
                          key={opt.val}
                          type="button"
                          disabled={!settings.autoSaveEnabled}
                          onClick={() => {
                            soundEngine.playClick();
                            onUpdateSettings({
                              ...settings,
                              autoSaveIntervalMinutes: opt.val,
                            });
                            showFeedback(
                              opt.val === 0
                                ? 'Auto-salvamento configurado para salvar continuamente a cada ação.'
                                : `Intervalo de auto-salvamento definido para cada ${opt.val} minutos.`
                            );
                          }}
                          className={`px-2.5 py-2 rounded-xl border text-center transition-colors cursor-pointer ${
                            active
                              ? 'bg-sky-400 border-sky-400 text-slate-950 font-black'
                              : 'bg-slate-950 border-slate-800 text-slate-300 hover:text-white hover:border-slate-600'
                          }`}
                        >
                          <div className="text-xs font-bold tabular-nums whitespace-nowrap">
                            {opt.label}
                          </div>
                          <div
                            className={`text-[10px] leading-tight mt-0.5 ${
                              active ? 'text-slate-900 font-semibold' : 'text-slate-500'
                            }`}
                          >
                            {opt.sub}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="pt-2.5 border-t border-slate-800/80 text-[11px] text-slate-400 leading-relaxed">
                  {settings.autoSaveEnabled ? (
                    (settings.autoSaveIntervalMinutes ?? 0) === 0 ? (
                      <span>
                        Estado atual sincronizado continuamente no{' '}
                        <strong className="text-emerald-300">IndexedDB</strong> a cada rodada,
                        contratação e ajuste tático.
                      </span>
                    ) : (
                      <span>
                        Auto-salvamento programado a cada{' '}
                        <strong className="text-emerald-300 tabular-nums">
                          {settings.autoSaveIntervalMinutes} minutos
                        </strong>{' '}
                        no IndexedDB (e também ao sair para a página inicial).
                      </span>
                    )
                  ) : (
                    <span>
                      Gravação automática no{' '}
                      <strong className="text-amber-300">IndexedDB desativada</strong> · Salve
                      manualmente quando quiser nos{' '}
                      <strong className="text-slate-200">Espaços 1–5</strong> ou exporte em{' '}
                      <strong className="text-slate-200">.json</strong>.
                    </span>
                  )}
                </div>
              </div>

              {/* Career Difficulty */}
              <div className="space-y-2.5 pb-5 border-b border-slate-800/80">
                <div>
                  <h4 className="text-sm font-semibold text-white">Nível de Exigência da Carreira</h4>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Influencia o desafio nas partidas e o orçamento inicial ao iniciar novas carreiras.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                  {difficultyOptions.map((opt) => {
                    const selected = settings.difficulty === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => {
                          soundEngine.playClick();
                          onUpdateSettings({ ...settings, difficulty: opt.id });
                        }}
                        className={`p-3.5 rounded-xl border text-left transition-colors cursor-pointer ${
                          selected
                            ? 'bg-sky-950/50 border-sky-400 text-white'
                            : 'bg-slate-900/70 border-slate-800 text-slate-300 hover:bg-slate-900'
                        }`}
                      >
                        <div className="text-xs font-bold text-white">{opt.label}</div>
                        <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                          {opt.summary}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Reset & Clear Storage */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={handleResetDefaults}
                  className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-semibold text-slate-300 hover:text-white flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-sky-400" />
                  <span>Restaurar Padrões</span>
                </button>

                {onClearAllSavedData && (
                  <div className="flex items-center gap-2">
                    {!confirmClearAll ? (
                      <button
                        type="button"
                        onClick={() => {
                          soundEngine.playClick();
                          setConfirmClearAll(true);
                        }}
                        className="px-3.5 py-2 rounded-xl bg-rose-950/30 hover:bg-rose-950/50 border border-rose-500/30 text-xs font-semibold text-rose-300 flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Apagar Todos os Saves</span>
                      </button>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-rose-300 font-medium">
                          Confirmar exclusão total?
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            soundEngine.playClick();
                            onClearAllSavedData();
                            setConfirmClearAll(false);
                            showFeedback('Todos os saves locais foram removidos.');
                          }}
                          className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold whitespace-nowrap shrink-0 cursor-pointer"
                        >
                          Sim, Apagar
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmClearAll(false)}
                          className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer"
                        >
                          Cancelar
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
          {isInGame && onSaveAndExitToTitle ? (
            <button
              type="button"
              onClick={() => {
                soundEngine.playClick();
                onSaveAndExitToTitle();
                onClose();
              }}
              className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-semibold text-sky-300 hover:text-white flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer transition-colors"
            >
              <LogOut className="w-4 h-4 text-sky-400" />
              <span>
                {settings.autoSaveEnabled
                  ? 'Salvar e Voltar à Página Inicial'
                  : 'Voltar à Página Inicial'}
              </span>
            </button>
          ) : (
            <span className="text-xs text-slate-500">
              Suas preferências ficam salvas automaticamente.
            </span>
          )}

          <button
            type="button"
            onClick={() => {
              soundEngine.playClick();
              onClose();
            }}
            className="px-5 py-2.5 rounded-xl bg-sky-400 hover:bg-sky-300 text-slate-950 font-bold text-xs whitespace-nowrap shrink-0 cursor-pointer transition-colors"
          >
            Concluir
          </button>
        </div>
      </div>
    </div>
  );
});
