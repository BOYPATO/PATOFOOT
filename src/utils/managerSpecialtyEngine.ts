import { ManagerSpecialtyId } from '../types/game';

export interface ManagerSpecialtyProfile {
  id: ManagerSpecialtyId;
  title: string;
  shortTag: string;
  summary: string;
  bullets: string[];
  accentColor: 'sky' | 'emerald' | 'amber' | 'rose';
  trainingSub23Multiplier: number;
  youthTryoutOvrBonus: number;
  transferBuyDiscountPct: number;
  transferSellBonusPct: number;
  matchChanceBonus: number;
  pepTalkBonus: number;
  initialBoardConfidenceDelta: number;
  initialFanConfidenceDelta: number;
}

export const MANAGER_SPECIALTIES: ManagerSpecialtyProfile[] = [
  {
    id: 'TATICO',
    title: 'Especialista Tático',
    shortTag: 'Mestre Tático',
    summary: 'Domina leitura de jogo, variações de esquema e controle de posse nas partidas.',
    bullets: [
      '+4% criação de jogadas e eficiência tática nas partidas',
      '+2 pontos extras de precisão nos passes sob ordens à beira do campo',
      'Retreinamento de posição de atletas 25% mais rápido',
    ],
    accentColor: 'sky',
    trainingSub23Multiplier: 1.0,
    youthTryoutOvrBonus: 0,
    transferBuyDiscountPct: 0,
    transferSellBonusPct: 0,
    matchChanceBonus: 0.008,
    pepTalkBonus: 0,
    initialBoardConfidenceDelta: 3,
    initialFanConfidenceDelta: 0,
  },
  {
    id: 'FORMADOR_BASE',
    title: 'Formador de Base',
    shortTag: 'Lapidador Sub-23',
    summary: 'Transforma promessas em titulares absolutos e valoriza talentos da base.',
    bullets: [
      '+30% velocidade de evolução em treinos para atletas Sub-23',
      'Peneiras da base revelam jovens com +2 de potencial médio',
      'Menor custo na lapidação de jovens talentos',
    ],
    accentColor: 'emerald',
    trainingSub23Multiplier: 1.3,
    youthTryoutOvrBonus: 2,
    transferBuyDiscountPct: 0,
    transferSellBonusPct: 4,
    matchChanceBonus: 0,
    pepTalkBonus: 0,
    initialBoardConfidenceDelta: 2,
    initialFanConfidenceDelta: 3,
  },
  {
    id: 'NEGOCIADOR',
    title: 'Negociador de Mercado',
    shortTag: 'Tubarão do Mercado',
    summary: 'Fecha reforços abaixo da pedida e arranca valores maiores em vendas.',
    bullets: [
      '10% de desconto na compra de jogadores e salários',
      '+10% de valorização nas propostas recebidas pelos seus atletas',
      'Maior margem financeira para atravessar janelas disputadas',
    ],
    accentColor: 'amber',
    trainingSub23Multiplier: 1.0,
    youthTryoutOvrBonus: 0,
    transferBuyDiscountPct: 10,
    transferSellBonusPct: 10,
    matchChanceBonus: 0,
    pepTalkBonus: 0,
    initialBoardConfidenceDelta: 4,
    initialFanConfidenceDelta: 0,
  },
  {
    id: 'MOTIVADOR',
    title: 'Motivador de Elenco',
    shortTag: 'Líder de Vestiário',
    summary: 'Extrai entrega máxima em jogos decisivos, clássicos e viradas no 2º tempo.',
    bullets: [
      '+20% impacto nas preleções do intervalo e gritos à beira do campo',
      '+2% recuperação extra de fôlego diário entre partidas',
      'Começa a carreira com +8 de apoio da torcida e +5 da diretoria',
    ],
    accentColor: 'rose',
    trainingSub23Multiplier: 1.05,
    youthTryoutOvrBonus: 0,
    transferBuyDiscountPct: 0,
    transferSellBonusPct: 0,
    matchChanceBonus: 0.004,
    pepTalkBonus: 0.006,
    initialBoardConfidenceDelta: 5,
    initialFanConfidenceDelta: 8,
  },
];

export function getManagerSpecialtyProfile(
  id?: ManagerSpecialtyId
): ManagerSpecialtyProfile {
  return (
    MANAGER_SPECIALTIES.find((s) => s.id === id) || MANAGER_SPECIALTIES[0]
  );
}
