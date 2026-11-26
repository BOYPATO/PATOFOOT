import React, { useEffect, useState } from 'react';
import {
  ArrowRight,
  Check,
  ChevronDown,
  Copy,
  Download,
  Globe,
  Laptop,
  MessageCircle,
  Play,
  Share2,
  ShieldCheck,
  Smartphone,
  WifiOff,
} from 'lucide-react';
import heroStadiumImg from '../assets/images/launch_hero_stadium_1795557645142.webp';
import tacticsBoardImg from '../assets/images/launch_tactics_board_1795557647795.webp';
import tunnelPitchImg from '../assets/images/launch_tunnel_pitch_1795557646780.webp';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { soundEngine } from '../services/soundEngine';

interface OfficialWebsiteViewProps {
  hasSavedCareer: boolean;
  savedClubName?: string;
  initialSection?: 'baixar-app' | 'compartilhar';
  onEnterWebGame: () => void;
  onStartNewCareerDirect: () => void;
  onResumeCareerDirect?: () => void;
}

type PlatformTab = 'android' | 'ios' | 'desktop' | 'web';

function detectPreferredPlatform(isIOS: boolean): PlatformTab {
  if (isIOS) return 'ios';
  if (typeof navigator !== 'undefined') {
    const ua = navigator.userAgent || '';
    if (/Android/i.test(ua)) return 'android';
    if (/Windows|Macintosh|Linux|CrOS/i.test(ua) && !/Mobile/i.test(ua)) return 'desktop';
  }
  return 'android';
}

const FAQ_ITEMS: Array<{ q: string; a: string }> = [
  {
    q: 'Se eu compartilhar o link do site com meus amigos, eles entram no meu save?',
    a: 'Não! O link oficial (/site) abre esta página pública de apresentação e download. Cada amigo cria o próprio login e senha no próprio celular ou computador e começa sua carreira do zero, com 5 espaços de save independentes. O seu progresso fica privado na sua conta e no seu dispositivo.',
  },
  {
    q: 'Como baixar e instalar o PATOFOOT 2027 no celular Android, iPhone ou PC?',
    a: 'No Android (Chrome ou Edge) e no PC/Mac (Chrome, Edge ou Brave), basta clicar em "Baixar / Instalar App" nesta página para instalar o jogo em tela cheia com ícone oficial. No iPhone ou iPad (Safari), toque em Compartilhar e selecione "Adicionar à Tela de Início".',
  },
  {
    q: 'O jogo é gratuito e funciona sem internet depois de instalado?',
    a: 'Sim. Todos os 930+ clubes, 27 campeonatos estaduais, ligas internacionais, 200+ jogadores livres reais no mercado e a Copa do Mundo de 48 seleções são 100% gratuitos. Após o primeiro acesso ou instalação, o app funciona offline e sincroniza na nuvem quando voltar a ter internet.',
  },
  {
    q: 'E se eu esquecer minha senha ou login depois de criar minha conta?',
    a: 'Na tela de entrada do jogo existe a opção "Esqueci minha senha ou login", permitindo recuperar seu nome de acesso pelo e-mail cadastrado ou redefinir sua senha com segurança.',
  },
  {
    q: 'Quantas carreiras posso manter ao mesmo tempo?',
    a: 'Cada jogador conta com 5 espaços independentes de carreira, salvamento automático configurável (a cada 10, 30 ou 60 minutos), backup em arquivo .json e suporte a 6 idiomas.',
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
      'Todos os 27 Campeonatos Estaduais com elencos oficiais 2027',
      'Copa do Brasil, Copa do Nordeste, Copa Verde e Supercopa Rei',
      'Premiações oficiais por posição e participação pagas direto ao caixa',
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
      'Ciclos completos de 2027 a 2038 com 48 seleções classificadas',
      'Eliminatórias continentais, Copa América, Eurocopa e amistosos em Data FIFA',
      'Convocação real de atletas dos clubes e comando simultâneo de clube e seleção',
    ],
  },
];

export const OfficialWebsiteView: React.FC<OfficialWebsiteViewProps> = ({
  hasSavedCareer,
  savedClubName,
  initialSection,
  onEnterWebGame,
  onStartNewCareerDirect,
  onResumeCareerDirect,
}) => {
  const { isInstallable, isInstalled, isIOS, promptInstall } = usePWAInstall();
  const [activePlatform, setActivePlatform] = useState<PlatformTab>(() =>
    detectPreferredPlatform(isIOS)
  );
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedInvite, setCopiedInvite] = useState(false);
  const [installFeedback, setInstallFeedback] = useState<string | null>(null);
  const [heroImgFailed, setHeroImgFailed] = useState(false);
  const [tacticsImgFailed, setTacticsImgFailed] = useState(false);
  const [tunnelImgFailed, setTunnelImgFailed] = useState(false);

  useEffect(() => {
    if (isIOS) {
      setActivePlatform('ios');
    }
  }, [isIOS]);

  useEffect(() => {
    if (!initialSection) return;
    const timer = window.setTimeout(() => {
      const target = document.getElementById(initialSection);
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 120);
    return () => window.clearTimeout(timer);
  }, [initialSection]);

  // Always share the public /site landing page so friends land on the game info + download page
  // instead of a root game session URL.
  const baseOrigin =
    typeof window !== 'undefined' && window.location.origin && window.location.origin !== 'null'
      ? window.location.origin.replace(/\/+$/, '')
      : 'https://patofoot.onrender.com';
  const publicSiteUrl = `${baseOrigin}/site`;
  const directDownloadUrl = `${baseOrigin}/baixar`;

  const inviteMessage = `Venha jogar PATOFOOT 2027! Futebol Manager grátis com 930+ clubes, 27 estaduais, simulação 2D ao vivo, 200+ jogadores livres e Copa do Mundo. Baixe o app ou jogue no navegador com sua própria carreira: ${publicSiteUrl}`;
  const whatsappShareHref = `https://wa.me/?text=${encodeURIComponent(inviteMessage)}`;

  const handleInstallAction = async () => {
    soundEngine.playClick();
    if (isInstalled) {
      setInstallFeedback('O PATOFOOT 2027 já está instalado como aplicativo neste dispositivo.');
      return;
    }
    if (isInstallable) {
      const accepted = await promptInstall();
      setInstallFeedback(
        accepted
          ? 'Download e instalação iniciados! O ícone do PATOFOOT 2027 aparecerá na sua tela inicial.'
          : 'Instalação cancelada. Você pode instalar o aplicativo quando quiser por este botão ou pelo menu do navegador.'
      );
      return;
    }
    if (isIOS) {
      setActivePlatform('ios');
      setInstallFeedback(
        'No Safari do iPhone/iPad: toque no botão Compartilhar (ícone com seta para cima) e selecione "Adicionar à Tela de Início".'
      );
      return;
    }
    if (activePlatform === 'desktop') {
      setInstallFeedback(
        'No Chrome, Edge ou Brave no PC/Mac: clique no ícone de instalação na barra de endereços (ou no menu ⋮ → Instalar PATOFOOT 2027).'
      );
      return;
    }
    setActivePlatform('android');
    setInstallFeedback(
      'No Chrome ou Edge do Android: abra o menu do navegador (⋮) no canto superior direito e toque em "Instalar aplicativo" ou "Adicionar à tela inicial".'
    );
  };

  const handleCopyShareLink = async (urlToCopy: string = publicSiteUrl) => {
    soundEngine.playClick();
    try {
      await navigator.clipboard.writeText(urlToCopy);
      setCopiedLink(true);
      window.setTimeout(() => setCopiedLink(false), 2600);
    } catch {
      setInstallFeedback(`Copie o link oficial: ${urlToCopy}`);
    }
  };

  const handleCopyInviteMessage = async () => {
    soundEngine.playClick();
    try {
      await navigator.clipboard.writeText(inviteMessage);
      setCopiedInvite(true);
      window.setTimeout(() => setCopiedInvite(false), 2600);
    } catch {
      setInstallFeedback(`Copie o convite: ${inviteMessage}`);
    }
  };

  const handleNativeShare = async () => {
    soundEngine.playClick();
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        await navigator.share({
          title: 'PATOFOOT 2027 – Futebol Manager Mundial',
          text: 'Baixe o app ou jogue PATOFOOT 2027 grátis: 930+ clubes, 27 estaduais, simulação 2D ao vivo e Copa do Mundo. Crie sua própria carreira!',
          url: publicSiteUrl,
        });
        return;
      } catch {
        // User cancelled or share unavailable — fallback to copy
      }
    }
    await handleCopyShareLink(publicSiteUrl);
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
            PATOFOOT <span className="text-emerald-400">2027</span>
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
              Sobre o Jogo
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('baixar-app')}
              className="hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Baixar Jogo
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
              onClick={() => scrollToSection('compartilhar')}
              className="hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Compartilhar
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
              <span>Jogar Grátis</span>
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
                Site Oficial PATOFOOT 2027 · Download para Android, iPhone, PC e Web
              </p>

              <h1
                className="font-display font-extrabold tracking-tight text-white leading-[1.06]"
                style={{
                  fontSize: 'clamp(2.25rem, 4.2vw, 3.75rem)',
                  textWrap: 'balance',
                }}
              >
                Assuma qualquer clube do mundo e construa sua própria carreira.
              </h1>

              <p className="mt-5 text-base sm:text-lg text-slate-300 leading-relaxed max-w-xl">
                PATOFOOT 2027 reúne mais de 930 clubes, 27 estaduais brasileiros, simulação 2D em
                tempo real, mercado da bola com 200+ jogadores livres reais, finanças completas e
                Copa do Mundo de 48 seleções — grátis no navegador ou instalado como aplicativo.
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-3.5">
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playClick();
                    onStartNewCareerDirect();
                  }}
                  className="px-6 py-3.5 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-extrabold text-sm sm:text-base transition-colors inline-flex items-center gap-2.5 whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <Play className="w-4 h-4 fill-current shrink-0" />
                  <span>Jogar Grátis Agora</span>
                </button>

                <button
                  type="button"
                  onClick={() => scrollToSection('baixar-app')}
                  className="px-5 py-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 hover:border-slate-500 text-white font-semibold text-sm sm:text-base transition-colors inline-flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <Download className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{isInstalled ? 'App Instalado' : 'Baixar / Instalar Jogo'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => scrollToSection('compartilhar')}
                  className="px-4 py-3.5 rounded-xl border border-slate-800 hover:border-sky-500/50 text-sky-300 hover:text-sky-200 font-semibold text-sm transition-colors inline-flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <Share2 className="w-4 h-4 shrink-0" />
                  <span>Enviar para Amigos</span>
                </button>
              </div>

              {hasSavedCareer && (
                <div className="mt-5 pt-4 border-t border-slate-800/80 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-400">
                  <span className="text-slate-300 font-medium">
                    Carreira salva apenas neste aparelho
                    {savedClubName ? ` (${savedClubName})` : ''}:
                  </span>
                  {onResumeCareerDirect && (
                    <button
                      type="button"
                      onClick={() => {
                        soundEngine.playClick();
                        onResumeCareerDirect();
                      }}
                      className="text-emerald-400 hover:text-emerald-300 font-semibold underline underline-offset-4 cursor-pointer transition-colors"
                    >
                      Retomar minha carreira
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      soundEngine.playClick();
                      onEnterWebGame();
                    }}
                    className="hover:text-white underline underline-offset-4 cursor-pointer transition-colors"
                  >
                    Abrir tela inicial e saves
                  </button>
                </div>
              )}
            </div>

            <div className="lg:col-span-6">
              <div className="relative h-full min-h-[260px] sm:min-h-[360px] rounded-2xl overflow-hidden border border-slate-800 bg-[#0b1220]">
                {!heroImgFailed ? (
                  <img
                    src={heroStadiumImg}
                    alt="Estádio iluminado à noite pronto para a temporada do PATOFOOT 2027"
                    referrerPolicy="no-referrer"
                    onError={() => setHeroImgFailed(true)}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-slate-900 via-[#0b1220] to-emerald-950/50 flex items-center justify-center p-8 text-center">
                    <span className="font-display text-2xl font-extrabold text-white">
                      PATOFOOT 2027
                    </span>
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-[#020617]/85 via-[#020617]/20 to-transparent" />
                <div className="absolute bottom-4 left-5 right-5 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-200">
                  <span className="font-semibold">Temporada 2027 pronta para jogar</span>
                  <span className="font-mono tabular-nums text-slate-300">
                    Android · iOS · PC · Web
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
                Seleções na Copa do Mundo 2027–2038
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
                  <span className="font-mono text-xs text-slate-400">01. Tática e Partida 2D</span>
                  <h3 className="mt-2 font-display text-xl sm:text-2xl font-bold text-white">
                    Prancheta livre, versatilidade por setor e simulação ao vivo
                  </h3>
                  <p className="mt-3 text-sm text-slate-300 leading-relaxed">
                    Posicione seus titulares livremente no gramado, aproveite atletas versáteis no
                    mesmo setor sem perder Overall (ZAG↔LAT, VOL↔MC, Ponta↔ME/MD/CA) e faça
                    substituições e ajustes táticos durante a partida ao vivo em 2D.
                  </p>
                </div>
                <p className="mt-6 text-xs text-slate-400">
                  7 formações base · 27 zonas táticas · Pênaltis, faltas e escanteios configuráveis
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
                <span className="font-mono text-xs text-slate-400">02. Mercado & Economia Real</span>
                <h3 className="mt-2 font-display text-xl font-bold text-white">
                  200+ jogadores livres reais, estádio e premiações oficiais
                </h3>
                <p className="mt-3 text-sm text-slate-300 leading-relaxed">
                  Contrate craques sem clube atualizados de 2027, negocie compras, trocas,
                  empréstimos com opção de compra e pré-contratos pela Lei Bosman. Arrecade com
                  sócio-torcedor, patrocínios, Naming Rights e premiações reais de cada competição.
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
                  Descanso mínimo de 66 horas, Seleções e Copa do Mundo
                </h3>
                <p className="mt-3 text-sm text-slate-300 leading-relaxed">
                  Calendário respeitando o intervalo mínimo de 66 horas entre jogos oficiais,
                  departamento médico, suspensões por competição, Data FIFA sincronizada entre
                  Brasil e Europa e comando de seleções rumo à Copa do Mundo de 48 times.
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
                  <span className="font-mono text-xs text-slate-400">04. Conta Própria & App Offline</span>
                  <h3 className="mt-2 font-display text-xl sm:text-2xl font-bold text-white">
                    Login individual, recuperação de senha e 5 espaços de save
                  </h3>
                  <p className="mt-3 text-sm text-slate-300 leading-relaxed">
                    Cada jogador cria sua conta privada com login, senha e recuperação de acesso,
                    mantém até 5 carreiras independentes, joga no celular ou computador com rolagem
                    fluida em todas as abas e atualiza os elencos 2027 antes de iniciar um save.
                  </p>
                </div>
                <p className="mt-6 text-xs text-slate-400">
                  Português, Inglês, Espanhol, Francês, Italiano e Alemão · Backup .json e nuvem
                </p>
              </div>
            </article>
          </div>
        </section>

        {/* 3. Download Hub & Share With Friends */}
        <section
          id="baixar-app"
          className="border-y border-slate-800/80 bg-[#070d1a] py-14 sm:py-20"
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-8">
              <div className="max-w-2xl">
                <h2 className="font-display text-2xl sm:text-4xl font-extrabold tracking-tight text-white">
                  Baixe o PATOFOOT 2027 ou jogue na Web
                </h2>
                <p className="mt-3 text-sm sm:text-base text-slate-400 leading-relaxed">
                  Escolha seu dispositivo abaixo para instalar o aplicativo oficial em tela cheia
                  com funcionamento offline, ou jogue instantaneamente pelo navegador.
                </p>
              </div>

              {/* Interactive Platform Segmented Switch */}
              <div
                role="tablist"
                aria-label="Plataformas suportadas para download"
                className="inline-flex flex-wrap items-center gap-1 p-1 rounded-xl bg-slate-950 border border-slate-800 self-start"
              >
                {(
                  [
                    { id: 'android', label: 'Android', icon: Smartphone },
                    { id: 'ios', label: 'iPhone / iPad', icon: Smartphone },
                    { id: 'desktop', label: 'PC / Mac', icon: Laptop },
                    { id: 'web', label: 'Web', icon: Globe },
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
              {/* Platform Download & Install Card */}
              <div className="lg:col-span-7 rounded-2xl border border-slate-800 bg-[#0b1220] p-6 sm:p-8 flex flex-col justify-between">
                {activePlatform === 'android' && (
                  <div>
                    <h3 className="font-display text-xl sm:text-2xl font-bold text-white">
                      Baixar Aplicativo para Android
                    </h3>
                    <p className="mt-2.5 text-sm text-slate-300 leading-relaxed">
                      Instale o PATOFOOT 2027 direto na tela inicial do seu celular Android sem
                      ocupar memória pesada de loja. O jogo abre em modo app (tela cheia sem barra
                      do navegador), com ícone oficial e modo offline automático.
                    </p>
                    <ol className="mt-5 space-y-2.5 text-sm text-slate-300 list-decimal list-inside">
                      <li>Abra este site oficial no Google Chrome ou Microsoft Edge do celular.</li>
                      <li>
                        Toque no botão{' '}
                        <strong className="text-white">Baixar / Instalar App Android</strong> abaixo
                        (ou abra o menu <strong className="text-white">⋮</strong> →{' '}
                        <strong className="text-white">Instalar aplicativo</strong>).
                      </li>
                      <li>
                        Confirme a instalação para criar o ícone do PATOFOOT 2027 no celular e jogar
                        mesmo sem internet.
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
                          {isInstalled
                            ? 'Aplicativo já instalado'
                            : 'Baixar / Instalar App Android'}
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          soundEngine.playClick();
                          onStartNewCareerDirect();
                        }}
                        className="px-4 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 font-semibold text-sm inline-flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer transition-colors"
                      >
                        <Play className="w-3.5 h-3.5 fill-current shrink-0" />
                        <span>Jogar pelo Navegador</span>
                      </button>
                    </div>
                  </div>
                )}

                {activePlatform === 'ios' && (
                  <div>
                    <h3 className="font-display text-xl sm:text-2xl font-bold text-white">
                      Instalar no iPhone e iPad (iOS Safari)
                    </h3>
                    <p className="mt-2.5 text-sm text-slate-300 leading-relaxed">
                      O PATOFOOT 2027 possui ícone Apple Touch em alta resolução e modo tela cheia
                      para iOS, funcionando como aplicativo direto na tela inicial do seu iPhone ou
                      iPad.
                    </p>
                    <ol className="mt-5 space-y-2.5 text-sm text-slate-300 list-decimal list-inside">
                      <li>
                        Abra o link oficial no navegador <strong className="text-white">Safari</strong>{' '}
                        do seu iPhone ou iPad.
                      </li>
                      <li>
                        Toque no botão <strong className="text-white">Compartilhar</strong> (ícone
                        do quadrado com seta para cima na barra inferior).
                      </li>
                      <li>
                        Role as opções, toque em{' '}
                        <strong className="text-white">Adicionar à Tela de Início</strong> e depois
                        em <strong className="text-white">Adicionar</strong>.
                      </li>
                    </ol>
                    <div className="mt-7 flex flex-wrap items-center gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          soundEngine.playClick();
                          onStartNewCareerDirect();
                        }}
                        className="px-5 py-3 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-extrabold text-sm inline-flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer transition-colors"
                      >
                        <Play className="w-4 h-4 fill-current shrink-0" />
                        <span>Abrir no Safari Agora</span>
                      </button>
                    </div>
                  </div>
                )}

                {activePlatform === 'desktop' && (
                  <div>
                    <h3 className="font-display text-xl sm:text-2xl font-bold text-white">
                      Baixar para Computador (Windows, macOS e Linux)
                    </h3>
                    <p className="mt-2.5 text-sm text-slate-300 leading-relaxed">
                      Instale o PATOFOOT 2027 como aplicativo de computador com janela dedicada,
                      atalho na barra de tarefas ou área de trabalho, tela widescreen completa e
                      suporte offline.
                    </p>
                    <ol className="mt-5 space-y-2.5 text-sm text-slate-300 list-decimal list-inside">
                      <li>Abra este site no Google Chrome, Microsoft Edge ou Brave.</li>
                      <li>
                        Clique em <strong className="text-white">Instalar no PC / Mac</strong> abaixo
                        (ou no ícone de instalação na barra de endereços do navegador).
                      </li>
                      <li>
                        Fixe o ícone do PATOFOOT 2027 na barra de tarefas ou Dock para abrir em 1
                        clique.
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
                          {isInstalled ? 'Aplicativo já instalado' : 'Instalar no PC / Mac'}
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          soundEngine.playClick();
                          onStartNewCareerDirect();
                        }}
                        className="px-4 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 font-semibold text-sm inline-flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer transition-colors"
                      >
                        <Play className="w-3.5 h-3.5 fill-current shrink-0" />
                        <span>Jogar na Web</span>
                      </button>
                    </div>
                  </div>
                )}

                {activePlatform === 'web' && (
                  <div>
                    <h3 className="font-display text-xl sm:text-2xl font-bold text-white">
                      Versão Web Instantânea (Sem Baixar Nada)
                    </h3>
                    <p className="mt-2.5 text-sm text-slate-300 leading-relaxed">
                      Prefere jogar direto no navegador? Abra e jogue imediatamente no Chrome, Edge,
                      Safari ou Firefox, no celular, tablet ou PC, com carregamento rápido e
                      salvamento seguro.
                    </p>
                    <ul className="mt-5 space-y-2.5 text-sm text-slate-300">
                      <li className="flex items-start gap-2.5">
                        <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                        <span>Criação de conta individual com login, senha e recuperação</span>
                      </li>
                      <li className="flex items-start gap-2.5">
                        <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                        <span>5 espaços de carreira salvos automaticamente por jogador</span>
                      </li>
                      <li className="flex items-start gap-2.5">
                        <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                        <span>Exportação e importação de backup .json para levar seu save onde quiser</span>
                      </li>
                    </ul>
                    <div className="mt-7">
                      <button
                        type="button"
                        onClick={() => {
                          soundEngine.playClick();
                          onStartNewCareerDirect();
                        }}
                        className="px-5 py-3 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-extrabold text-sm inline-flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer transition-colors"
                      >
                        <Play className="w-4 h-4 fill-current shrink-0" />
                        <span>Abrir Jogo na Web</span>
                      </button>
                    </div>
                  </div>
                )}

                {installFeedback && (
                  <p className="mt-4 text-xs text-sky-300 bg-sky-950/40 border border-sky-500/30 rounded-xl px-3.5 py-2.5 leading-relaxed">
                    {installFeedback}
                  </p>
                )}

                <div className="mt-6 pt-4 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
                  <span>Link direto da página de download:</span>
                  <button
                    type="button"
                    onClick={() => void handleCopyShareLink(directDownloadUrl)}
                    className="font-mono text-sky-300 hover:text-sky-200 underline underline-offset-4 cursor-pointer"
                  >
                    {directDownloadUrl}
                  </button>
                </div>
              </div>

              {/* Share With Friends Card (Clean Public /site Invite) */}
              <div
                id="compartilhar"
                className="lg:col-span-5 rounded-2xl border border-slate-800 bg-[#0b1220] p-6 sm:p-8 flex flex-col justify-between gap-6 scroll-mt-24"
              >
                <div>
                  <h3 className="font-display text-lg sm:text-xl font-bold text-white">
                    Compartilhar com Amigos
                  </h3>
                  <p className="mt-2 text-sm text-slate-300 leading-relaxed">
                    Use sempre este <strong className="text-white">Link Oficial do Site</strong>{' '}
                    para convidar amigos. Ele abre esta página de informações e download — nunca o
                    seu save.
                  </p>

                  <div className="mt-4 p-3 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs text-emerald-300 break-all">
                    {publicSiteUrl}
                  </div>

                  <div className="mt-3.5 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <a
                      href={whatsappShareHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => soundEngine.playClick()}
                      className="sm:col-span-2 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-extrabold inline-flex items-center justify-center gap-2 whitespace-nowrap transition-colors"
                    >
                      <MessageCircle className="w-4 h-4 shrink-0" />
                      <span>Enviar Convite no WhatsApp</span>
                    </a>

                    <button
                      type="button"
                      onClick={() => void handleCopyShareLink(publicSiteUrl)}
                      className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-bold text-white inline-flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer transition-colors"
                    >
                      {copiedLink ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          <span>Link Copiado</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 shrink-0" />
                          <span>Copiar Link /site</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => void handleNativeShare()}
                      className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-bold text-sky-300 inline-flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer transition-colors"
                    >
                      <Share2 className="w-3.5 h-3.5 shrink-0" />
                      <span>Compartilhar</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => void handleCopyInviteMessage()}
                      className="sm:col-span-2 px-4 py-2 rounded-xl bg-slate-950 hover:bg-slate-900 border border-slate-800 text-xs font-semibold text-slate-300 hover:text-white inline-flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer transition-colors"
                    >
                      {copiedInvite ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          <span>Mensagem de convite copiada!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 shrink-0" />
                          <span>Copiar texto pronto de convite</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                <div className="pt-5 border-t border-slate-800/80 space-y-2.5 text-xs text-slate-300">
                  <div className="flex items-start gap-2.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span>
                      <strong className="text-white">Saves 100% separados:</strong> cada amigo cria
                      sua própria conta e carreira no próprio aparelho — ninguém acessa o seu save.
                    </span>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <WifiOff className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                    <span>Modo offline ativo automaticamente após instalar ou abrir pela primeira vez</span>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <Smartphone className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                    <span>Mesma qualidade em celular Android, iPhone, tablet e tela widescreen</span>
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
                  Escolha seu clube agora, baixe o app e convide seus amigos para criarem suas
                  carreiras.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playClick();
                    onStartNewCareerDirect();
                  }}
                  className="px-6 py-3.5 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-extrabold text-sm inline-flex items-center justify-center gap-2 whitespace-nowrap shrink-0 cursor-pointer transition-colors"
                >
                  <span>Abrir PATOFOOT 2027</span>
                  <ArrowRight className="w-4 h-4 shrink-0" />
                </button>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Quiet Footer */}
      <footer className="border-t border-slate-800/80 bg-[#020617]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-[max(2rem,env(safe-area-inset-bottom))] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div className="font-display font-bold text-slate-300">
            PATOFOOT 2027 · Futebol Manager Mundial
          </div>
          <div className="flex flex-wrap items-center justify-center gap-5">
            <button
              type="button"
              onClick={() => scrollToSection('recursos')}
              className="hover:text-slate-300 transition-colors cursor-pointer"
            >
              Sobre o Jogo
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('baixar-app')}
              className="hover:text-slate-300 transition-colors cursor-pointer"
            >
              Baixar App
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('compartilhar')}
              className="hover:text-slate-300 transition-colors cursor-pointer"
            >
              Compartilhar
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
