import React, { useEffect, useState } from 'react';
import { Club, TrophyRecord, WorldBallonDorAward } from '../types/game';
import { ClubCrest } from './ClubCrest';
import { soundEngine } from '../services/soundEngine';
import { generateAndShareAchievementCard } from '../utils/shareCardGenerator';
import { Award, Crown, Download, Globe, Share2, Sparkles, Star, Trophy, X } from 'lucide-react';

export interface CelebrationPayload {
  kind: 'TROPHY' | 'BALLON_DOR';
  trophy?: TrophyRecord;
  ballonDor?: WorldBallonDorAward;
  club?: Club | null;
  managerName: string;
  careerTotalTitles: number;
}

interface CelebrationModalProps {
  celebration: CelebrationPayload;
  onOpenTrophyCabinet: () => void;
  onClose: () => void;
}

function getCelebrationTier(competition: string): {
  label: string;
  accentText: string;
  accentBorder: string;
  accentBg: string;
  badgeBg: string;
  headline: string;
  isNational: boolean;
} {
  const lower = competition.toLowerCase();
  if (lower.includes('copa do mundo') && !lower.includes('clubes')) {
    return {
      label: 'Glória Eterna · Seleção Nacional',
      accentText: 'text-amber-300',
      accentBorder: 'border-amber-400/50',
      accentBg: 'from-amber-500/20 via-yellow-500/10 to-[#090f1d]',
      badgeBg: 'bg-amber-400/15 border-amber-400/40 text-amber-300',
      headline: 'CAMPEÃO DO MUNDO!',
      isNational: true,
    };
  }
  if (
    lower.includes('eurocopa') ||
    lower.includes('copa américa') ||
    lower.includes('copa africana') ||
    lower.includes('copa da ásia') ||
    lower.includes('copa ouro') ||
    lower.includes('nations league') ||
    lower.includes('copa das nações') ||
    lower.includes('finalíssima')
  ) {
    return {
      label: 'Título Internacional de Seleções',
      accentText: 'text-sky-300',
      accentBorder: 'border-sky-400/50',
      accentBg: 'from-sky-500/20 via-emerald-500/10 to-[#090f1d]',
      badgeBg: 'bg-sky-400/15 border-sky-400/40 text-sky-300',
      headline: 'CAMPEÃO INTERNACIONAL!',
      isNational: true,
    };
  }
  if (
    lower.includes('mundial') ||
    lower.includes('intercontinental') ||
    lower.includes('libertadores') ||
    lower.includes('champions')
  ) {
    return {
      label: 'Conquista Continental & Mundial',
      accentText: 'text-amber-300',
      accentBorder: 'border-amber-400/50',
      accentBg: 'from-amber-500/20 via-emerald-500/10 to-[#090f1d]',
      badgeBg: 'bg-amber-400/15 border-amber-400/40 text-amber-300',
      headline: 'HISTÓRIA ESCRITA!',
      isNational: false,
    };
  }
  return {
    label: 'Taça Oficial Conquistada',
    accentText: 'text-emerald-300',
    accentBorder: 'border-emerald-400/45',
    accentBg: 'from-emerald-500/20 via-sky-500/10 to-[#090f1d]',
    badgeBg: 'bg-emerald-400/15 border-emerald-400/40 text-emerald-300',
    headline: 'É CAMPEÃO!',
    isNational: false,
  };
}

export const CelebrationModal: React.FC<CelebrationModalProps> = ({
  celebration,
  onOpenTrophyCabinet,
  onClose,
}) => {
  const [shareStatus, setShareStatus] = useState<string | null>(null);

  useEffect(() => {
    soundEngine.playFanfare();
  }, []);

  const handleShareBallonDor = async () => {
    if (!celebration.ballonDor) return;
    soundEngine.playClick();
    const bd = celebration.ballonDor;
    const res = await generateAndShareAchievementCard({
      kind: 'BALLON_DOR',
      clubName: bd.winner.clubName,
      clubInitials: celebration.club?.initials || bd.winner.clubShortName.slice(0, 3),
      primaryColor: bd.winner.clubColors?.primary || '#f59e0b',
      secondaryColor: bd.winner.clubColors?.secondary || '#0f172a',
      textColor: bd.winner.clubColors?.text || '#ffffff',
      managerName: celebration.managerName,
      headline: 'Bola de Ouro FIFA',
      subtitle: `${bd.winner.playerName} (${bd.winner.detailedRole} · OVR ${bd.winner.overall})`,
      yearLabel: String(bd.year),
      stats: [
        { label: 'Gols', value: String(bd.winner.goals) },
        { label: 'Assistências', value: String(bd.winner.assists) },
        { label: 'Nota Média', value: bd.winner.ratingAverage.toFixed(1) },
      ],
      highlightLine: `Melhor Jogador do Mundo em ${bd.year} · ${bd.winner.clubName}`,
    });
    setShareStatus(
      res === 'shared'
        ? 'Card compartilhado!'
        : res === 'downloaded'
        ? 'Imagem PNG salva no dispositivo!'
        : 'Não foi possível gerar o card.'
    );
    setTimeout(() => setShareStatus(null), 3500);
  };

  const handleShareTrophy = async () => {
    if (!celebration.trophy) return;
    soundEngine.playClick();
    const tr = celebration.trophy;
    const res = await generateAndShareAchievementCard({
      kind: 'TROPHY',
      clubName: tr.championTeamName,
      clubInitials: celebration.club?.initials || tr.championTeamName.slice(0, 3),
      primaryColor: celebration.club?.colors.primary || '#0ea5e9',
      secondaryColor: celebration.club?.colors.secondary || '#0f172a',
      textColor: celebration.club?.colors.text || '#ffffff',
      managerName: celebration.managerName,
      headline: getCelebrationTier(tr.competition).headline,
      subtitle: `${tr.competition} (${tr.seasonLabel || tr.year})`,
      yearLabel: String(tr.seasonLabel || tr.year),
      stats: [
        { label: 'Campeão', value: celebration.club?.shortName || tr.championTeamName.slice(0, 12) },
        { label: 'Taças na Carreira', value: `#${Math.max(1, celebration.careerTotalTitles)}` },
      ],
      highlightLine: tr.runnerUpTeamName
        ? `Vice-campeão: ${tr.runnerUpTeamName}`
        : `Temporada histórica de ${tr.year}`,
    });
    setShareStatus(
      res === 'shared'
        ? 'Card compartilhado!'
        : res === 'downloaded'
        ? 'Imagem PNG salva no dispositivo!'
        : 'Não foi possível gerar o card.'
    );
    setTimeout(() => setShareStatus(null), 3500);
  };

  if (celebration.kind === 'BALLON_DOR' && celebration.ballonDor) {
    const bd = celebration.ballonDor;
    const winner = bd.winner;
    return (
      <div className="fixed inset-0 z-[70] bg-slate-950/90 backdrop-blur-md flex items-start justify-center p-2 sm:p-4 overflow-y-auto">
        <div className="relative w-full max-w-lg rounded-3xl border border-amber-400/50 bg-[#090f1d] shadow-2xl overflow-hidden my-auto">
          <div className="absolute inset-x-0 top-0 h-44 bg-gradient-to-b from-amber-500/25 via-yellow-500/10 to-transparent pointer-events-none" />

          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar celebração"
            className="absolute top-4 right-4 z-10 p-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-700/80 text-slate-300 hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="relative p-6 sm:p-8 text-center space-y-5">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-400/15 border border-amber-400/40 text-[11px] font-bold uppercase tracking-wider text-amber-300">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Gala FIFA · Bola de Ouro {bd.year}</span>
            </div>

            <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-amber-300 via-yellow-400 to-amber-600 p-[2px] shadow-xl shadow-amber-500/20">
              <div className="w-full h-full rounded-[14px] bg-[#090f1d] flex items-center justify-center">
                <Award className="w-10 h-10 text-amber-300" />
              </div>
            </div>

            <div>
              <h2 className="text-2xl sm:text-3xl font-black font-display tracking-tight text-white">
                BOLA DE OURO NO ELENCO!
              </h2>
              <p className="text-base sm:text-lg font-extrabold text-amber-300 mt-1">
                {winner.playerName}
              </p>
              <p className="text-xs text-slate-400 mt-1">
                {winner.clubName} · {winner.detailedRole} · OVR {winner.overall}
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2.5 text-center font-mono tabular-nums">
              <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3">
                <div className="text-[10px] font-sans uppercase text-slate-400">Gols</div>
                <div className="text-lg font-black text-white mt-0.5">{winner.goals}</div>
              </div>
              <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3">
                <div className="text-[10px] font-sans uppercase text-slate-400">Assistências</div>
                <div className="text-lg font-black text-sky-300 mt-0.5">{winner.assists}</div>
              </div>
              <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3">
                <div className="text-[10px] font-sans uppercase text-slate-400">Nota Média</div>
                <div className="text-lg font-black text-amber-300 mt-0.5">
                  {winner.ratingAverage.toFixed(1)}
                </div>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed bg-slate-900/60 border border-slate-800 rounded-xl p-3.5">
              Sob o comando de <strong className="text-white">{celebration.managerName}</strong>,{' '}
              <strong className="text-amber-300">{winner.playerName}</strong> foi eleito o melhor jogador do planeta em {bd.year}, elevando o prestígio internacional do clube!
            </p>

            <div className="space-y-2.5 pt-1">
              <button
                type="button"
                onClick={() => void handleShareBallonDor()}
                className="w-full py-2.5 px-4 rounded-xl bg-sky-500/15 hover:bg-sky-500/25 border border-sky-400/40 text-sky-200 font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-colors"
              >
                <Share2 className="w-4 h-4 text-sky-300" />
                <span>{shareStatus || 'Baixar / Compartilhar Card (PNG)'}</span>
              </button>
              <div className="flex flex-col sm:flex-row items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playClick();
                    onClose();
                    onOpenTrophyCabinet();
                  }}
                  className="w-full sm:flex-1 py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-colors"
                >
                  <Trophy className="w-4 h-4 text-amber-400" />
                  <span>Ver Sala de Troféus</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playClick();
                    onClose();
                  }}
                  className="w-full sm:flex-1 py-2.5 px-4 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs cursor-pointer transition-colors"
                >
                  Continuar Carreira
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const trophy = celebration.trophy!;
  const tier = getCelebrationTier(trophy.competition);

  return (
    <div className="fixed inset-0 z-[70] bg-slate-950/90 backdrop-blur-md flex items-start justify-center p-2 sm:p-4 overflow-y-auto">
      <div
        className={`relative w-full max-w-lg rounded-3xl border ${tier.accentBorder} bg-[#090f1d] shadow-2xl overflow-hidden my-auto`}
      >
        <div
          className={`absolute inset-x-0 top-0 h-48 bg-gradient-to-b ${tier.accentBg} pointer-events-none`}
        />

        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar celebração"
          className="absolute top-4 right-4 z-10 p-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-700/80 text-slate-300 hover:text-white cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="relative p-6 sm:p-8 text-center space-y-5">
          <div
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-[11px] font-bold uppercase tracking-wider ${tier.badgeBg}`}
          >
            {tier.isNational ? (
              <Globe className="w-3.5 h-3.5" />
            ) : (
              <Crown className="w-3.5 h-3.5" />
            )}
            <span>{tier.label}</span>
          </div>

          <div className="flex items-center justify-center gap-4">
            {!tier.isNational && celebration.club && (
              <div className="p-2 rounded-2xl bg-slate-900/90 border border-slate-700/80 shadow-lg">
                <ClubCrest club={celebration.club} size="lg" />
              </div>
            )}
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-amber-300 via-yellow-400 to-amber-600 p-[2px] shadow-xl shadow-amber-500/20">
              <div className="w-full h-full rounded-[14px] bg-[#090f1d] flex items-center justify-center">
                <Trophy className={`w-10 h-10 ${tier.accentText}`} />
              </div>
            </div>
          </div>

          <div>
            <h2 className="text-2xl sm:text-3xl font-black font-display tracking-tight text-white">
              {tier.headline}
            </h2>
            <p className={`text-base sm:text-lg font-extrabold mt-1 ${tier.accentText}`}>
              {trophy.competition} · {trophy.year}
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Campeão: <strong className="text-white">{trophy.championTeamName}</strong>
              {trophy.runnerUpTeamName ? ` · Vice: ${trophy.runnerUpTeamName}` : ''}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 text-center">
            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3">
              <div className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
                Comandante
              </div>
              <div className="text-sm font-bold text-white mt-0.5 truncate">
                {celebration.managerName}
              </div>
            </div>
            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3">
              <div className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
                Taças na Carreira
              </div>
              <div className="text-sm font-black font-mono tabular-nums text-amber-300 mt-0.5 flex items-center justify-center gap-1">
                <Star className="w-3.5 h-3.5 fill-amber-300 text-amber-300" />
                <span>#{Math.max(1, celebration.careerTotalTitles)}</span>
              </div>
            </div>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed bg-slate-900/60 border border-slate-800 rounded-xl p-3.5">
            A torcida toma as ruas para celebrar mais uma conquista histórica! O troféu de{' '}
            <strong className="text-white">{trophy.competition} ({trophy.year})</strong> já foi gravado permanentemente na sua Sala de Troféus e somado ao seu legado no Hall da Fama.
          </p>

          <div className="space-y-2.5 pt-1">
            <button
              type="button"
              onClick={() => void handleShareTrophy()}
              className="w-full py-2.5 px-4 rounded-xl bg-sky-500/15 hover:bg-sky-500/25 border border-sky-400/40 text-sky-200 font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-colors"
            >
              <Download className="w-4 h-4 text-sky-300" />
              <span>{shareStatus || 'Baixar / Compartilhar Card de Título (PNG)'}</span>
            </button>
            <div className="flex flex-col sm:flex-row items-center gap-2.5">
              <button
                type="button"
                onClick={() => {
                  soundEngine.playClick();
                  onClose();
                  onOpenTrophyCabinet();
                }}
                className="w-full sm:flex-1 py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-colors"
              >
                <Trophy className="w-4 h-4 text-amber-400" />
                <span>Abrir Sala de Troféus</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  soundEngine.playClick();
                  onClose();
                }}
                className="w-full sm:flex-1 py-2.5 px-4 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-black text-xs cursor-pointer transition-colors"
              >
                Ergue a Taça e Continuar
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
