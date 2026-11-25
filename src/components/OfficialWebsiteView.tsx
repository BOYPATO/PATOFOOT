import React, { useState } from 'react';
import {
  ArrowRight,
  Check,
  ChevronDown,
  Copy,
  Download,
  Globe,
  Laptop,
  Play,
  Share2,
  Smartphone,
  WifiOff,
} from 'lucide-react';
import heroStadiumImg from '../assets/images/launch_hero_stadium_1795557645142.jpg';
import tacticsBoardImg from '../assets/images/launch_tactics_board_1795557647795.jpg';
import tunnelPitchImg from '../assets/images/launch_tunnel_pitch_1795557646780.jpg';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { soundEngine } from '../services/soundEngine';

interface OfficialWebsiteViewProps {
  hasSavedCareer: boolean;
  savedClubName?: string;
  onEnterWebGame: () => void;
  onStartNewCareerDirect: () => void;
  onResumeCareerDirect?: () => void;
}

type PlatformTab = 'web' | 'android' | 'ios' | 'desktop';

const FAQ_ITEMS: Array<{ q: string; a: string }> = [
  {
    q: 'O PATOFOOT 2026 é gratuito para jogar no site e no aplicativo?',
    a: 'Sim. Todos os 930+ clubes, 27 campeonatos estaduais, ligas internacionais, Copa do Mundo de 48 seleções e o aplicativo instalável são 100% gratuitos, sem anúncios intrusivos ou travas de temporadas.',
  },
  {
    q: 'Como instalar como aplicativo no celular Android ou iPhone?',
    a: 'No Android (Chrome ou Edge), clique em "Instalar App" nesta página para adicionar o PATOFOOT 2026 direto à tela inicial em tela cheia. No iPhone ou iPad (Safari), toque no botão Compartilhar e escolha "Adicionar à Tela de Início".',
  },
  {
    q: 'Posso jogar sem internet depois de instalar o app?',
    a: 'Sim. O aplicativo usa Service Worker com cache offline completo dos recursos do jogo e salva suas carreiras localmente no dispositivo, sincronizando automaticamente na nuvem quando você estiver conectado.',
  },
  {
    q: 'Quantas carreiras posso manter ao mesmo tempo?',
    a: 'Você conta com 5 espaços independentes de carreira, salvamento automático configurável (a cada 10, 30 ou 60 minutos) e suporte a vários idiomas diretamente nas configurações.',
  },
];

const COMPETITIONS_CATALOG_GROUPS: Array<{
  title: string;
  items: string[];
}> = [
  {
    title: 'Brasil Completo',
    items: [
      'Brasileirão Séries A, B, C e D com acesso e rebaixamento reais',
      'Todos os 27 Campeonatos Estaduais com elencos oficiais 2026',
      'Copa do Brasil, Copa do Nordeste, Copa Verde e Supercopa Rei',
      'Premiações oficiais por posição e participação pagas ao caixa',
    ],
  },
  {
    title: 'América do Sul',
    items: [
      'Ligas nacionais da Argentina, Colômbia, Uruguai, Chile, Equador, Paraguai, Peru, Bolívia e Venezuela',
      'Copa Libertadores da América, Copa Sul-Americana e Recopa',
      'Copas nacionais sul-americanas e janela de transferências sincronizada',
    ],
  },
  {
    title: 'Europa & Resto do Mundo',
    items: [
      'Inglaterra (4 divisões), Espanha, Itália, Alemanha, França, Portugal, Holanda, Bélgica, Turquia, Grécia, Escócia, Suíça e Nórdicos',
      'MLS (EUA), Liga MX (México), Canadá, Arábia Saudita, Japão, Rússia, Egito e Marrocos',
      'Champions League, Europa League, Conference, Concacaf, AFC e Mundial de Clubes',
    ],
  },
  {
    title: 'Seleções & Copa do Mundo',
    items: [
      'Ciclos completos de 2026 a 2038 com 48 seleções classificadas',
      'Eliminatórias continentais, Copa América, Eurocopa e amistosos em Data FIFA',
      'Convocação real de atletas dos clubes e comando simultâneo de clube e seleção',
    ],
  },
];

export const OfficialWebsiteView: React.FC<OfficialWebsiteViewProps> = ({
  hasSavedCareer,
  savedClubName,
  onEnterWebGame,
  onStartNewCareerDirect,
  onResumeCareerDirect,
}) => {
  const { isInstallable, isInstalled, isIOS, promptInstall } = usePWAInstall();
  const [activePlatform, setActivePlatform] = useState<PlatformTab>(() =>
    isIOS ? 'ios' : 'web'
  );
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);
  const [copiedLink, setCopiedLink] = useState(false);
  const [installFeedback, setInstallFeedback] = useState<string | null>(null);
  const [heroImgFailed, setHeroImgFailed] = useState(false);
  const [tacticsImgFailed, setTacticsImgFailed] = useState(false);
  const [tunnelImgFailed, setTunnelImgFailed] = useState(false);

  const shareUrl =
    typeof window !== 'undefined' ? window.location.origin : 'https://patofoot2026.app';

  const handleInstallAction = async () => {
    soundEngine.playClick();
    if (isInstalled) {
      setInstallFeedback('O PATOFOOT 2026 já está instalado neste dispositivo.');
      return;
    }
    if (isInstallable) {
      const accepted = await promptInstall();
      setInstallFeedback(
        accepted
          ? 'Instalação iniciada! O ícone do PATOFOOT 2026 aparecerá na sua tela inicial.'
          : 'Você pode instalar o aplicativo a qualquer momento pelo menu do navegador.'
      );
      return;
    }
    if (isIOS) {
      setActivePlatform('ios');
      setInstallFeedback(
        'No Safari do iPhone/iPad: toque em Compartilhar e selecione "Adicionar à Tela de Início".'
      );
      return;
    }
    setActivePlatform('android');
    setInstallFeedback(
      'No Chrome ou Edge, abra o menu do navegador (⋮) e toque em "Instalar aplicativo" ou "Adicionar à tela inicial".'
    );
  };

  const handleCopyShareLink = async () => {
    soundEngine.playClick();
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopiedLink(true);
      window.setTimeout(() => setCopiedLink(false), 2400);
    } catch {
      setInstallFeedback(`Copie o endereço: ${shareUrl}`);
    }
  };

  const handleNativeShare = async () => {
    soundEngine.playClick();
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        await navigator.share({
          title: 'PATOFOOT 2026 – Futebol Manager Mundial',
          text: 'Jogue PATOFOOT 2026 grátis na Web ou instale como App: 930+ clubes, 27 estaduais, simulação 2D e Copa do Mundo.',
          url: shareUrl,
        });
        return;
      } catch {
        // Fallback to copy
      }
    }
    await handleCopyShareLink();
  };

  const scrollToSection = (sectionId: string) => {
    soundEngine.playClick();
    const target = document.getElementById(sectionId);
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="min-h-[100dvh] overflow-x-clip bg-[#020617] text-slate-100 selection:bg-sky-400/30 selection:text-white">
      {/* Top Bar: Strict 3-zone contract */}
      <header className="sticky top-0 z-40 bg-[#020617]/90 backdrop-blur-md border-b border-slate-800/80 pt-[env(safe-area-inset-top)]">
        <div className="max-w-7xl mx-auto px-3.5 sm:px-6 lg:px-8 h-14 sm:h-16 flex items-center justify-between gap-3 sm:gap-8">
          <a
            href="#inicio"
            onClick={(e) => {
              e.preventDefault();
              scrollToSection('inicio');
            }}
            className="font-display text-base sm:text-lg font-extrabold tracking-tight text-white whitespace-nowrap shrink-0"
          >
            PATOFOOT <span className="text-emerald-400">2026</span>
          </a>

          <nav
            aria-label="Navegação principal"
            className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-300"
          >
            <button
              type="button"
              onClick={() => scrollToSection('recursos')}
              className="hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Recursos
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('web-e-app')}
              className="hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Web e App
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('competicoes')}
              className="hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Competições
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('perguntas')}
              className="hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Perguntas
            </button>
          </nav>

          <div className="flex items-center shrink-0">
            <button
              type="button"
              onClick={() => {
                soundEngine.playClick();
                onEnterWebGame();
              }}
              className="px-3.5 sm:px-4 py-2 rounded-lg bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-bold text-xs sm:text-sm transition-colors whitespace-nowrap shrink-0 cursor-pointer inline-flex items-center gap-1.5 sm:gap-2"
            >
              <Play className="w-3.5 h-3.5 fill-current shrink-0" />
              <span>Jogar Agora</span>
            </button>
          </div>
        </div>
      </header>

      <main>
        {/* 1. Hero Section */}
        <section id="inicio" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 sm:pt-16 pb-12 sm:pb-16">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-stretch">
            <div className="lg:col-span-6 flex flex-col justify-center">
              <p className="text-xs sm:text-sm font-medium text-slate-400 mb-4">
                Site Oficial · Versão Web Instantânea · App Android, iOS e Desktop
              </p>

              <h1
                className="font-display font-extrabold tracking-tight text-white leading-[1.06]"
                style={{
                  fontSize: 'clamp(2.25rem, 4.2vw, 3.75rem)',
                  textWrap: 'balance',
                }}
              >
                Assuma qualquer clube do mundo e leve sua gestão ao topo.
              </h1>

              <p className="mt-5 text-base sm:text-lg text-slate-300 leading-relaxed max-w-xl">
                PATOFOOT 2026 reúne mais de 930 clubes, 27 estaduais brasileiros, simulação 2D em
                tempo real, mercado da bola completo, finanças com premiações reais e Copa do Mundo
                de 48 seleções — direto no navegador ou instalado como aplicativo.
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-4">
                {hasSavedCareer && onResumeCareerDirect ? (
                  <button
                    type="button"
                    onClick={() => {
                      soundEngine.playClick();
                      onResumeCareerDirect();
                    }}
                    className="px-6 py-3.5 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-extrabold text-sm sm:text-base transition-colors inline-flex items-center gap-2.5 whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <Play className="w-4 h-4 fill-current shrink-0" />
                    <span>
                      {savedClubName
                        ? `Continuar com ${savedClubName}`
                        : 'Continuar Carreira na Web'}
                    </span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      soundEngine.playClick();
                      onEnterWebGame();
                    }}
                    className="px-6 py-3.5 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-extrabold text-sm sm:text-base transition-colors inline-flex items-center gap-2.5 whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <Play className="w-4 h-4 fill-current shrink-0" />
                    <span>Jogar na Web Agora</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => scrollToSection('web-e-app')}
                  className="px-5 py-3.5 rounded-xl border border-slate-700 hover:border-slate-500 text-slate-200 hover:text-white font-semibold text-sm sm:text-base transition-colors inline-flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <Download className="w-4 h-4 shrink-0" />
                  <span>{isInstalled ? 'App Instalado' : 'Instalar como App'}</span>
                </button>
              </div>

              {hasSavedCareer && (
                <div className="mt-4 flex items-center gap-4 text-xs text-slate-400">
                  <button
                    type="button"
                    onClick={() => {
                      soundEngine.playClick();
                      onEnterWebGame();
                    }}
                    className="hover:text-white underline underline-offset-4 cursor-pointer transition-colors"
                  >
                    Abrir menu de espaços salvos
                  </button>
                  <span aria-hidden="true">·</span>
                  <button
                    type="button"
                    onClick={() => {
                      soundEngine.playClick();
                      onStartNewCareerDirect();
                    }}
                    className="hover:text-white underline underline-offset-4 cursor-pointer transition-colors"
                  >
                    Começar nova carreira
                  </button>
                </div>
              )}
            </div>

            <div className="lg:col-span-6">
              <div className="relative h-full min-h-[260px] sm:min-h-[360px] rounded-2xl overflow-hidden border border-slate-800 bg-[#0b1220]">
                {!heroImgFailed ? (
                  <img
                    src={heroStadiumImg}
                    alt="Estádio iluminado à noite pronto para a temporada do PATOFOOT 2026"
                    referrerPolicy="no-referrer"
                    onError={() => setHeroImgFailed(true)}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-slate-900 via-[#0b1220] to-emerald-950/50 flex items-center justify-center p-8 text-center">
                    <span className="font-display text-2xl font-extrabold text-white">
                      PATOFOOT 2026
                    </span>
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-[#020617]/85 via-[#020617]/20 to-transparent" />
                <div className="absolute bottom-4 left-5 right-5 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-200">
                  <span className="font-semibold">Temporada 2026 pronta para jogar</span>
                  <span className="font-mono tabular-nums text-slate-300">
                    Web · Android · iOS · Desktop
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Full-width 4-Column Quantified Strip */}
          <div className="mt-10 grid grid-cols-2 lg:grid-cols-4 border-y border-slate-800/90 divide-y lg:divide-y-0 lg:divide-x divide-slate-800/90 tabular-nums">
            <div className="py-5 px-2 sm:px-5">
              <div className="font-mono text-2xl sm:text-3xl font-bold text-white">930+</div>
              <div className="text-xs sm:text-sm text-slate-400 mt-1">
                Clubes jogáveis nas 5 confederações
              </div>
            </div>
            <div className="py-5 px-2 sm:px-5">
              <div className="font-mono text-2xl sm:text-3xl font-bold text-white">27 + 4</div>
              <div className="text-xs sm:text-sm text-slate-400 mt-1">
                Estaduais brasileiros e Séries A, B, C e D
              </div>
            </div>
            <div className="py-5 px-2 sm:px-5">
              <div className="font-mono text-2xl sm:text-3xl font-bold text-white">48</div>
              <div className="text-xs sm:text-sm text-slate-400 mt-1">
                Seleções na Copa do Mundo 2026–2038
              </div>
            </div>
            <div className="py-5 px-2 sm:px-5">
              <div className="font-mono text-2xl sm:text-3xl font-bold text-emerald-400">100%</div>
              <div className="text-xs sm:text-sm text-slate-400 mt-1">
                Gratuito na Web e instalável offline
              </div>
            </div>
          </div>
        </section>

        {/* 2. Core Capabilities — Asymmetric Bento Grid */}
        <section id="recursos" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-20">
          <div className="max-w-2xl mb-10">
            <h2 className="font-display text-2xl sm:text-4xl font-extrabold tracking-tight text-white">
              Controle completo dentro e fora de campo
            </h2>
            <p className="mt-3 text-sm sm:text-base text-slate-400 leading-relaxed">
              Cada decisão de escalação, contratação, preparação física e finanças impacta o
              desempenho do clube ao longo das temporadas.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* 01 Wide Card */}
            <article className="lg:col-span-2 rounded-2xl border border-slate-800 bg-[#0b1220] overflow-hidden grid grid-cols-1 md:grid-cols-12">
              <div className="md:col-span-6 p-6 sm:p-8 flex flex-col justify-between">
                <div>
                  <span className="font-mono text-xs text-slate-400">01. Tática e Partida</span>
                  <h3 className="mt-2 font-display text-xl sm:text-2xl font-bold text-white">
                    Prancheta livre, versatilidade por setor e simulação 2D
                  </h3>
                  <p className="mt-3 text-sm text-slate-300 leading-relaxed">
                    Posicione seus titulares livremente no gramado, aproveite atletas versáteis no
                    mesmo setor sem perder Overall (ZAG↔LAT, VOL↔MC, Ponta↔ME/MD/CA) e faça
                    substituições e ajustes táticos durante a partida ao vivo.
                  </p>
                </div>
                <p className="mt-6 text-xs text-slate-400">
                  7 formações base · 27 zonas táticas · Penaltis, faltas e escanteios configuráveis
                </p>
              </div>
              <div className="md:col-span-6 min-h-[220px] bg-slate-900">
                {!tacticsImgFailed ? (
                  <img
                    src={tacticsBoardImg}
                    alt="Prancheta tática de futebol sobre mesa de treinador"
                    referrerPolicy="no-referrer"
                    onError={() => setTacticsImgFailed(true)}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-slate-900 to-slate-800" />
                )}
              </div>
            </article>

            {/* 02 Card */}
            <article className="rounded-2xl border border-slate-800 bg-[#0b1220] p-6 sm:p-8 flex flex-col justify-between">
              <div>
                <span className="font-mono text-xs text-slate-400">02. Economia Real</span>
                <h3 className="mt-2 font-display text-xl font-bold text-white">
                  Mercado da bola, estádio e premiações oficiais
                </h3>
                <p className="mt-3 text-sm text-slate-300 leading-relaxed">
                  Negocie compras, trocas, empréstimos com opção de compra e pré-contratos pela Lei
                  Bosman. Arrecade com sócio-torcedor, patrocínios, Naming Rights e premiações reais
                  pagas no encerramento de cada liga e copa.
                </p>
              </div>
              <p className="mt-6 text-xs text-slate-400">
                Fair Play Financeiro · Reforma de estádio e CT · Base revelando joias
              </p>
            </article>

            {/* 03 Card */}
            <article className="rounded-2xl border border-slate-800 bg-[#0b1220] p-6 sm:p-8 flex flex-col justify-between">
              <div>
                <span className="font-mono text-xs text-slate-400">03. Calendário Profissional</span>
                <h3 className="mt-2 font-display text-xl font-bold text-white">
                  Descanso mínimo de 66 horas e gestão física
                </h3>
                <p className="mt-3 text-sm text-slate-300 leading-relaxed">
                  Calendário respeitando o intervalo mínimo de 66 horas entre partidas oficiais,
                  controle de departamento médico, suspensões por competição, datas FIFA e
                  calendário sincronizado entre Brasil e Europa.
                </p>
              </div>
              <p className="mt-6 text-xs text-slate-400">
                Sem jogos em dias seguidos · Rotação de elenco · Auxiliar técnico inteligente
              </p>
            </article>

            {/* 04 Wide Card */}
            <article className="lg:col-span-2 rounded-2xl border border-slate-800 bg-[#0b1220] overflow-hidden grid grid-cols-1 md:grid-cols-12">
              <div className="md:col-span-6 min-h-[220px] bg-slate-900 order-2 md:order-1">
                {!tunnelImgFailed ? (
                  <img
                    src={tunnelPitchImg}
                    alt="Túnel de acesso ao gramado iluminado antes de partida noturna"
                    referrerPolicy="no-referrer"
                    onError={() => setTunnelImgFailed(true)}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-slate-900 to-slate-800" />
                )}
              </div>
              <div className="md:col-span-6 p-6 sm:p-8 flex flex-col justify-between order-1 md:order-2">
                <div>
                  <span className="font-mono text-xs text-slate-400">04. Sempre Atualizado</span>
                  <h3 className="mt-2 font-display text-xl sm:text-2xl font-bold text-white">
                    Elencos 2026 atualizáveis, nuvem e vários idiomas
                  </h3>
                  <p className="mt-3 text-sm text-slate-300 leading-relaxed">
                    Jogue com elencos brasileiros e mundiais de 2026, atualize plantéis via API
                    quando desejar, escolha entre vários idiomas e salve até 5 carreiras com
                    auto-salvamento configurável a cada 10, 30 ou 60 minutos.
                  </p>
                </div>
                <p className="mt-6 text-xs text-slate-400">
                  Português, Inglês, Espanhol, Francês, Italiano e Alemão · 5 espaços de save
                </p>
              </div>
            </article>
          </div>
        </section>

        {/* 3. Web & App Distribution Hub */}
        <section
          id="web-e-app"
          className="border-y border-slate-800/80 bg-[#070d1a] py-14 sm:py-20"
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-8">
              <div className="max-w-2xl">
                <h2 className="font-display text-2xl sm:text-4xl font-extrabold tracking-tight text-white">
                  Jogue na Web ou instale o Aplicativo
                </h2>
                <p className="mt-3 text-sm sm:text-base text-slate-400 leading-relaxed">
                  Uma única experiência sincronizada para navegador, celular Android, iPhone/iPad e
                  computador, com funcionamento offline e tela cheia.
                </p>
              </div>

              {/* Interactive Platform Segmented Switch */}
              <div
                role="tablist"
                aria-label="Plataformas suportadas"
                className="inline-flex flex-wrap items-center gap-1 p-1 rounded-xl bg-slate-950 border border-slate-800 self-start"
              >
                {(
                  [
                    { id: 'web', label: 'Web', icon: Globe },
                    { id: 'android', label: 'Android', icon: Smartphone },
                    { id: 'ios', label: 'iPhone / iPad', icon: Smartphone },
                    { id: 'desktop', label: 'PC / Mac', icon: Laptop },
                  ] as const
                ).map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    type="button"
                    role="tab"
                    aria-selected={activePlatform === id}
                    onClick={() => {
                      soundEngine.playClick();
                      setActivePlatform(id);
                      setInstallFeedback(null);
                    }}
                    className={`px-3.5 py-2 rounded-lg text-xs sm:text-sm font-semibold inline-flex items-center gap-2 whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                      activePlatform === id
                        ? 'bg-emerald-400 text-slate-950'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5 shrink-0" />
                    <span>{label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
              {/* Platform Details Card */}
              <div className="lg:col-span-7 rounded-2xl border border-slate-800 bg-[#0b1220] p-6 sm:p-8 flex flex-col justify-between">
                {activePlatform === 'web' && (
                  <div>
                    <h3 className="font-display text-xl sm:text-2xl font-bold text-white">
                      Versão Web Instantânea (Navegador)
                    </h3>
                    <p className="mt-2.5 text-sm text-slate-300 leading-relaxed">
                      Abra e jogue imediatamente em qualquer navegador moderno (Chrome, Edge,
                      Safari ou Firefox) sem precisar baixar arquivos pesados. Ideal para jogar no
                      computador, tablet ou celular com carregamento instantâneo.
                    </p>
                    <ul className="mt-5 space-y-2.5 text-sm text-slate-300">
                      <li className="flex items-start gap-2.5">
                        <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                        <span>Acesso imediato em tela ampla ou responsiva no celular</span>
                      </li>
                      <li className="flex items-start gap-2.5">
                        <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                        <span>Conta de treinador com sessão permanente e 5 espaços de save</span>
                      </li>
                      <li className="flex items-start gap-2.5">
                        <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                        <span>Exportação e importação de backup .json em qualquer dispositivo</span>
                      </li>
                    </ul>
                    <div className="mt-7">
                      <button
                        type="button"
                        onClick={() => {
                          soundEngine.playClick();
                          onEnterWebGame();
                        }}
                        className="px-5 py-3 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-extrabold text-sm inline-flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer transition-colors"
                      >
                        <Play className="w-4 h-4 fill-current shrink-0" />
                        <span>Abrir Jogo na Web</span>
                      </button>
                    </div>
                  </div>
                )}

                {activePlatform === 'android' && (
                  <div>
                    <h3 className="font-display text-xl sm:text-2xl font-bold text-white">
                      Aplicativo Android (PWA Instalável)
                    </h3>
                    <p className="mt-2.5 text-sm text-slate-300 leading-relaxed">
                      Instale o PATOFOOT 2026 diretamente na tela inicial do seu Android. O jogo
                      abre em modo aplicativo (sem barra do navegador), com ícone adaptativo e
                      suporte offline via Service Worker.
                    </p>
                    <ol className="mt-5 space-y-2.5 text-sm text-slate-300 list-decimal list-inside">
                      <li>Abra o endereço oficial no Google Chrome ou Microsoft Edge do celular.</li>
                      <li>
                        Clique em <strong className="text-white">Instalar App no Android</strong>{' '}
                        abaixo ou toque no menu <strong className="text-white">(⋮)</strong> →{' '}
                        <strong className="text-white">Instalar aplicativo</strong>.
                      </li>
                      <li>
                        Confirme para criar o atalho oficial na tela inicial e jogar em tela cheia.
                      </li>
                    </ol>
                    <div className="mt-7 flex flex-wrap items-center gap-3">
                      <button
                        type="button"
                        onClick={() => void handleInstallAction()}
                        className="px-5 py-3 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-extrabold text-sm inline-flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer transition-colors"
                      >
                        <Download className="w-4 h-4 shrink-0" />
                        <span>
                          {isInstalled ? 'Aplicativo já instalado' : 'Instalar App no Android'}
                        </span>
                      </button>
                    </div>
                  </div>
                )}

                {activePlatform === 'ios' && (
                  <div>
                    <h3 className="font-display text-xl sm:text-2xl font-bold text-white">
                      Aplicativo para iPhone e iPad (iOS Safari)
                    </h3>
                    <p className="mt-2.5 text-sm text-slate-300 leading-relaxed">
                      O PATOFOOT 2026 inclui ícone Apple Touch em alta resolução e modo tela cheia
                      para iOS, rodando como aplicativo nativo na tela inicial do iPhone ou iPad.
                    </p>
                    <ol className="mt-5 space-y-2.5 text-sm text-slate-300 list-decimal list-inside">
                      <li>Abra este site no navegador <strong className="text-white">Safari</strong> do seu iPhone ou iPad.</li>
                      <li>
                        Toque no botão <strong className="text-white">Compartilhar</strong> na barra
                        inferior do Safari.
                      </li>
                      <li>
                        Role a lista e toque em{' '}
                        <strong className="text-white">Adicionar à Tela de Início</strong> e
                        depois em <strong className="text-white">Adicionar</strong>.
                      </li>
                    </ol>
                    <div className="mt-7">
                      <button
                        type="button"
                        onClick={() => {
                          soundEngine.playClick();
                          onEnterWebGame();
                        }}
                        className="px-5 py-3 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-extrabold text-sm inline-flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer transition-colors"
                      >
                        <Play className="w-4 h-4 fill-current shrink-0" />
                        <span>Jogar no Safari Agora</span>
                      </button>
                    </div>
                  </div>
                )}

                {activePlatform === 'desktop' && (
                  <div>
                    <h3 className="font-display text-xl sm:text-2xl font-bold text-white">
                      Aplicativo Desktop (Windows, macOS e Linux)
                    </h3>
                    <p className="mt-2.5 text-sm text-slate-300 leading-relaxed">
                      Transforme o PATOFOOT 2026 em um aplicativo dedicado na barra de tarefas ou
                      Dock do seu computador, com janela própria, atalhos rápidos e cache offline.
                    </p>
                    <ol className="mt-5 space-y-2.5 text-sm text-slate-300 list-decimal list-inside">
                      <li>Abra este endereço no Google Chrome, Microsoft Edge ou Brave.</li>
                      <li>
                        Clique no botão <strong className="text-white">Instalar no PC / Mac</strong>{' '}
                        abaixo ou no ícone de instalação na barra de endereços.
                      </li>
                      <li>
                        Fixe o PATOFOOT 2026 na barra de tarefas para abrir direto em janela própria.
                      </li>
                    </ol>
                    <div className="mt-7">
                      <button
                        type="button"
                        onClick={() => void handleInstallAction()}
                        className="px-5 py-3 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-extrabold text-sm inline-flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer transition-colors"
                      >
                        <Download className="w-4 h-4 shrink-0" />
                        <span>
                          {isInstalled ? 'Aplicativo já instalado' : 'Instalar no PC / Mac'}
                        </span>
                      </button>
                    </div>
                  </div>
                )}

                {installFeedback && (
                  <p className="mt-4 text-xs text-sky-300 bg-sky-950/40 border border-sky-500/30 rounded-xl px-3.5 py-2.5">
                    {installFeedback}
                  </p>
                )}
              </div>

              {/* Share & Offline Readiness Card */}
              <div className="lg:col-span-5 rounded-2xl border border-slate-800 bg-[#0b1220] p-6 sm:p-8 flex flex-col justify-between gap-6">
                <div>
                  <h3 className="font-display text-lg sm:text-xl font-bold text-white">
                    Link Oficial de Acesso &amp; Divulgação
                  </h3>
                  <p className="mt-2 text-sm text-slate-400 leading-relaxed">
                    Envie o endereço abaixo para jogar no celular ou compartilhar o lançamento com
                    amigos.
                  </p>

                  <div className="mt-4 p-3 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs text-slate-300 break-all">
                    {shareUrl}
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2.5">
                    <button
                      type="button"
                      onClick={() => void handleCopyShareLink()}
                      className="flex-1 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-bold text-white inline-flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer transition-colors"
                    >
                      {copiedLink ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          <span>Link Copiado</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 shrink-0" />
                          <span>Copiar Link</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => void handleNativeShare()}
                      className="flex-1 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-bold text-sky-300 inline-flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer transition-colors"
                    >
                      <Share2 className="w-3.5 h-3.5 shrink-0" />
                      <span>Compartilhar</span>
                    </button>
                  </div>
                </div>

                <div className="pt-5 border-t border-slate-800/80 space-y-2.5 text-xs text-slate-300">
                  <div className="flex items-center gap-2.5">
                    <WifiOff className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Modo Offline ativo automaticamente após o primeiro acesso</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <Smartphone className="w-4 h-4 text-sky-400 shrink-0" />
                    <span>Interface adaptada para celular, tablet e tela widescreen</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 4. Competitions Coverage */}
        <section id="competicoes" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-20">
          <div className="max-w-2xl mb-10">
            <h2 className="font-display text-2xl sm:text-4xl font-extrabold tracking-tight text-white">
              Todas as grandes ligas e copas em um só jogo
            </h2>
            <p className="mt-3 text-sm sm:text-base text-slate-400 leading-relaxed">
              Comece num clube estadual da Série D brasileira ou assuma uma potência europeia
              buscando a tríplice coroa e o Mundial.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {COMPETITIONS_CATALOG_GROUPS.map((group) => (
              <div
                key={group.title}
                className="rounded-2xl border border-slate-800 bg-[#0b1220] p-6"
              >
                <h3 className="font-display text-lg font-bold text-white mb-3.5">
                  {group.title}
                </h3>
                <ul className="space-y-2.5 text-sm text-slate-300">
                  {group.items.map((item) => (
                    <li key={item} className="flex items-start gap-2.5 leading-relaxed">
                      <span className="text-emerald-400 font-bold select-none">·</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        {/* 5. FAQ Accordion */}
        <section
          id="perguntas"
          className="border-t border-slate-800/80 bg-[#070d1a] py-14 sm:py-20"
        >
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight text-white mb-8">
              Perguntas frequentes
            </h2>

            <div className="divide-y divide-slate-800 border-y border-slate-800">
              {FAQ_ITEMS.map((item, idx) => {
                const isOpen = openFaqIndex === idx;
                return (
                  <div key={item.q}>
                    <button
                      type="button"
                      onClick={() => {
                        soundEngine.playClick();
                        setOpenFaqIndex(isOpen ? null : idx);
                      }}
                      className="w-full py-5 flex items-center justify-between gap-4 text-left cursor-pointer group"
                    >
                      <span className="text-sm sm:text-base font-semibold text-white group-hover:text-emerald-300 transition-colors">
                        {item.q}
                      </span>
                      <ChevronDown
                        className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-200 ${
                          isOpen ? 'rotate-180 text-emerald-400' : ''
                        }`}
                      />
                    </button>
                    {isOpen && (
                      <p className="pb-5 text-sm text-slate-300 leading-relaxed">{item.a}</p>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Final Launch Conversion Block */}
            <div className="mt-14 rounded-2xl border border-slate-800 bg-[#0b1220] p-7 sm:p-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
              <div>
                <h3 className="font-display text-xl sm:text-2xl font-extrabold text-white">
                  Pronto para estrear na beira do campo?
                </h3>
                <p className="mt-2 text-sm text-slate-400">
                  Escolha seu clube agora e comece sua carreira na temporada 2026.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  soundEngine.playClick();
                  onEnterWebGame();
                }}
                className="px-6 py-3.5 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-extrabold text-sm inline-flex items-center justify-center gap-2 whitespace-nowrap shrink-0 cursor-pointer transition-colors"
              >
                <span>Abrir PATOFOOT 2026</span>
                <ArrowRight className="w-4 h-4 shrink-0" />
              </button>
            </div>
          </div>
        </section>
      </main>

      {/* Quiet Footer */}
      <footer className="border-t border-slate-800/80 bg-[#020617]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-[max(2rem,env(safe-area-inset-bottom))] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div className="font-display font-bold text-slate-300">
            PATOFOOT 2026 · Futebol Manager Mundial
          </div>
          <div className="flex flex-wrap items-center justify-center gap-5">
            <button
              type="button"
              onClick={() => scrollToSection('recursos')}
              className="hover:text-slate-300 transition-colors cursor-pointer"
            >
              Recursos
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('web-e-app')}
              className="hover:text-slate-300 transition-colors cursor-pointer"
            >
              Web e App
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('competicoes')}
              className="hover:text-slate-300 transition-colors cursor-pointer"
            >
              Competições
            </button>
            <button
              type="button"
              onClick={() => {
                soundEngine.playClick();
                onEnterWebGame();
              }}
              className="text-emerald-400 hover:text-emerald-300 font-semibold transition-colors cursor-pointer"
            >
              Entrar no Jogo
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
};
