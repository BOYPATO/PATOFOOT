import {
  Club,
  CoachMovementRecord,
  CoachStaff,
  CoachingCarouselState,
  Division,
  FormationType,
  GameSave,
  InboxMessage,
  ManagerCareerStint,
  ManagerJobOffer,
  PassingStyle,
  RealCoachProfile,
  Standing,
  TacticalMentality,
} from '../types/game';
import { formatShortDate } from './calendarUtils';
import { formatCurrency } from './individualAwardsEngine';
import {
  computeManagerSalary,
  generateBoardSeasonGoals,
  getClubSquadAvgOverall,
} from './boardCareerEngine';
import { recordFinanceLedgerMutation } from './financialFairPlayEngine';
import { resolveSoccerWikiManagerPhoto } from './soccerWikiBrazilEngine';
import { resolveSoccerWikiEnglandManagerPhoto } from './soccerWikiEnglandEngine';
import { getClubEconomyProfile } from './clubEconomyScale';
import {
  EUROPEAN_LEAGUES_META,
  getClubEuropeanLeagueId,
} from './europeLeaguesEngine';
import {
  getClubSouthAmericanLeagueId,
  SOUTH_AMERICAN_LEAGUES_META,
} from './southAmericaLeaguesEngine';
import {
  getClubWorldLeagueId,
  WORLD_LEAGUES_META,
} from './worldLeaguesEngine';
import { getClubEstadualConfig } from '../data/estaduais2026Config';

function resolveAnySoccerWikiCoachPhoto(name: string) {
  return resolveSoccerWikiManagerPhoto(name) || resolveSoccerWikiEnglandManagerPhoto(name);
}

// Catálogo de treinadores reais livres no mercado (Temporada 2026)
export const INITIAL_FREE_AGENT_REAL_COACHES: RealCoachProfile[] = [
  {
    id: 'rc_jorge_jesus',
    name: 'Jorge Jesus',
    nationality: 'Portugal',
    age: 71,
    prestige: 93,
    preferredFormation: '4-4-2',
    mentality: 'Pressão Total',
    passing: 'Curto (Posse)',
    styleLabel: 'Linha Alta & Sufoco Ofensivo',
    monthlySalaryDemand: 1_950_000,
    signingFee: 4_800_000,
  },
  {
    id: 'rc_filipe_luis',
    name: 'Filipe Luís',
    nationality: 'Brasil',
    age: 40,
    prestige: 89,
    preferredFormation: '4-2-3-1',
    mentality: 'Ofensivo',
    passing: 'Curto (Posse)',
    styleLabel: 'Pressão Pós-Perda & Jogo Apoiado',
    monthlySalaryDemand: 1_150_000,
    signingFee: 2_600_000,
  },
  {
    id: 'rc_luis_castro',
    name: 'Luís Castro',
    nationality: 'Portugal',
    age: 64,
    prestige: 88,
    preferredFormation: '4-2-3-1',
    mentality: 'Ofensivo',
    passing: 'Curto (Posse)',
    styleLabel: 'Controle Posicional Europeu',
    monthlySalaryDemand: 1_450_000,
    signingFee: 3_400_000,
  },
  {
    id: 'rc_vojvoda',
    name: 'Juan Pablo Vojvoda',
    nationality: 'Argentina',
    age: 50,
    prestige: 87,
    preferredFormation: '3-5-2',
    mentality: 'Ofensivo',
    passing: 'Misto',
    styleLabel: 'Intensidade & Transição Vertical',
    monthlySalaryDemand: 1_100_000,
    signingFee: 2_500_000,
  },
  {
    id: 'rc_sampaoli',
    name: 'Jorge Sampaoli',
    nationality: 'Argentina',
    age: 65,
    prestige: 86,
    preferredFormation: '3-4-3',
    mentality: 'Pressão Total',
    passing: 'Curto (Posse)',
    styleLabel: 'Ataque Posicional & Amplitude',
    monthlySalaryDemand: 1_300_000,
    signingFee: 2_900_000,
  },
  {
    id: 'rc_fernando_diniz',
    name: 'Fernando Diniz',
    nationality: 'Brasil',
    age: 51,
    prestige: 85,
    preferredFormation: '4-3-3',
    mentality: 'Ofensivo',
    passing: 'Curto (Posse)',
    styleLabel: 'Posse Associativa & Aproximação',
    monthlySalaryDemand: 1_050_000,
    signingFee: 2_200_000,
  },
  {
    id: 'rc_felipao',
    name: 'Luiz Felipe Scolari',
    nationality: 'Brasil',
    age: 77,
    prestige: 85,
    preferredFormation: '4-2-3-1',
    mentality: 'Defensivo',
    passing: 'Longo (Contra-ataque)',
    styleLabel: 'Copero & Solidez em Mata-Mata',
    monthlySalaryDemand: 980_000,
    signingFee: 2_100_000,
  },
  {
    id: 'rc_crespo',
    name: 'Hernán Crespo',
    nationality: 'Argentina',
    age: 50,
    prestige: 84,
    preferredFormation: '3-5-2',
    mentality: 'Ofensivo',
    passing: 'Misto',
    styleLabel: 'Jogo Vertical Sul-Americano',
    monthlySalaryDemand: 950_000,
    signingFee: 2_000_000,
  },
  {
    id: 'rc_zubeldia',
    name: 'Luis Zubeldía',
    nationality: 'Argentina',
    age: 45,
    prestige: 84,
    preferredFormation: '4-2-3-1',
    mentality: 'Ofensivo',
    passing: 'Misto',
    styleLabel: 'Compactação & Transição Rápida',
    monthlySalaryDemand: 920_000,
    signingFee: 1_950_000,
  },
  {
    id: 'rc_quinteros',
    name: 'Gustavo Quinteros',
    nationality: 'Argentina',
    age: 60,
    prestige: 83,
    preferredFormation: '4-2-3-1',
    mentality: 'Ofensivo',
    passing: 'Misto',
    styleLabel: 'Equilíbrio Continental',
    monthlySalaryDemand: 880_000,
    signingFee: 1_850_000,
  },
  {
    id: 'rc_ramon_diaz',
    name: 'Ramón Díaz',
    nationality: 'Argentina',
    age: 66,
    prestige: 83,
    preferredFormation: '4-3-3',
    mentality: 'Equilibrado',
    passing: 'Misto',
    styleLabel: 'Gestão de Vestiário & Ataque Direto',
    monthlySalaryDemand: 900_000,
    signingFee: 1_900_000,
  },
  {
    id: 'rc_roger_machado',
    name: 'Roger Machado',
    nationality: 'Brasil',
    age: 50,
    prestige: 82,
    preferredFormation: '4-2-3-1',
    mentality: 'Equilibrado',
    passing: 'Curto (Posse)',
    styleLabel: 'Organização Tática & Corredores',
    monthlySalaryDemand: 780_000,
    signingFee: 1_600_000,
  },
  {
    id: 'rc_mano_menezes',
    name: 'Mano Menezes',
    nationality: 'Brasil',
    age: 63,
    prestige: 81,
    preferredFormation: '4-2-3-1',
    mentality: 'Defensivo',
    passing: 'Longo (Contra-ataque)',
    styleLabel: 'Consistência Defensiva & Transição',
    monthlySalaryDemand: 760_000,
    signingFee: 1_550_000,
  },
  {
    id: 'rc_pedro_caixinha',
    name: 'Pedro Caixinha',
    nationality: 'Portugal',
    age: 55,
    prestige: 81,
    preferredFormation: '4-3-3',
    mentality: 'Ofensivo',
    passing: 'Misto',
    styleLabel: 'Pressão Alta & Jogo Vertical',
    monthlySalaryDemand: 740_000,
    signingFee: 1_500_000,
  },
  {
    id: 'rc_carille',
    name: 'Fábio Carille',
    nationality: 'Brasil',
    age: 52,
    prestige: 80,
    preferredFormation: '4-1-4-1',
    mentality: 'Defensivo',
    passing: 'Longo (Contra-ataque)',
    styleLabel: 'Bloco Compacto & Eficiência',
    monthlySalaryDemand: 680_000,
    signingFee: 1_350_000,
  },
  {
    id: 'rc_pezzolano',
    name: 'Paulo Pezzolano',
    nationality: 'Uruguai',
    age: 42,
    prestige: 80,
    preferredFormation: '3-4-3',
    mentality: 'Ofensivo',
    passing: 'Misto',
    styleLabel: 'Dinâmica Intensa Uruguaia',
    monthlySalaryDemand: 690_000,
    signingFee: 1_400_000,
  },
  {
    id: 'rc_luxemburgo',
    name: 'Vanderlei Luxemburgo',
    nationality: 'Brasil',
    age: 73,
    prestige: 79,
    preferredFormation: '4-4-2',
    mentality: 'Equilibrado',
    passing: 'Curto (Posse)',
    styleLabel: 'Leitura Clássica & Talento Individual',
    monthlySalaryDemand: 620_000,
    signingFee: 1_200_000,
  },
  {
    id: 'rc_osorio',
    name: 'Juan Carlos Osorio',
    nationality: 'Colômbia',
    age: 64,
    prestige: 78,
    preferredFormation: '4-3-3',
    mentality: 'Ofensivo',
    passing: 'Curto (Posse)',
    styleLabel: 'Rotação Tática & Amplitude',
    monthlySalaryDemand: 590_000,
    signingFee: 1_150_000,
  },
  {
    id: 'rc_leo_conde',
    name: 'Léo Condé',
    nationality: 'Brasil',
    age: 47,
    prestige: 78,
    preferredFormation: '4-2-3-1',
    mentality: 'Equilibrado',
    passing: 'Misto',
    styleLabel: 'Equilíbrio & Bola Parada Forte',
    monthlySalaryDemand: 480_000,
    signingFee: 950_000,
  },
  {
    id: 'rc_antonio_oliveira',
    name: 'António Oliveira',
    nationality: 'Portugal',
    age: 43,
    prestige: 77,
    preferredFormation: '4-3-3',
    mentality: 'Equilibrado',
    passing: 'Misto',
    styleLabel: 'Transição Rápida pelos Flancos',
    monthlySalaryDemand: 490_000,
    signingFee: 980_000,
  },
  {
    id: 'rc_guto_ferreira',
    name: 'Guto Ferreira',
    nationality: 'Brasil',
    age: 60,
    prestige: 76,
    preferredFormation: '4-4-2',
    mentality: 'Defensivo',
    passing: 'Longo (Contra-ataque)',
    styleLabel: 'Especialista em Acessos',
    monthlySalaryDemand: 410_000,
    signingFee: 820_000,
  },
  {
    id: 'rc_rafael_paiva',
    name: 'Rafael Paiva',
    nationality: 'Brasil',
    age: 41,
    prestige: 75,
    preferredFormation: '4-2-3-1',
    mentality: 'Equilibrado',
    passing: 'Curto (Posse)',
    styleLabel: 'Valorização da Base & Equilíbrio',
    monthlySalaryDemand: 380_000,
    signingFee: 750_000,
  },
  {
    id: 'rc_ze_ricardo',
    name: 'Zé Ricardo',
    nationality: 'Brasil',
    age: 54,
    prestige: 74,
    preferredFormation: '4-2-3-1',
    mentality: 'Equilibrado',
    passing: 'Misto',
    styleLabel: 'Organização de Setores',
    monthlySalaryDemand: 340_000,
    signingFee: 680_000,
  },
  {
    id: 'rc_jorginho',
    name: 'Jorginho',
    nationality: 'Brasil',
    age: 61,
    prestige: 74,
    preferredFormation: '4-4-2',
    mentality: 'Equilibrado',
    passing: 'Misto',
    styleLabel: 'Transição Segura',
    monthlySalaryDemand: 330_000,
    signingFee: 650_000,
  },
  {
    id: 'rc_lisca',
    name: 'Lisca',
    nationality: 'Brasil',
    age: 53,
    prestige: 74,
    preferredFormation: '4-2-3-1',
    mentality: 'Ofensivo',
    passing: 'Misto',
    styleLabel: 'Motivação & Choque de Gestão',
    monthlySalaryDemand: 320_000,
    signingFee: 620_000,
  },
  {
    id: 'rc_morinigo',
    name: 'Gustavo Morínigo',
    nationality: 'Paraguai',
    age: 48,
    prestige: 74,
    preferredFormation: '4-4-2',
    mentality: 'Equilibrado',
    passing: 'Misto',
    styleLabel: 'Pegada Competitiva Paraguaia',
    monthlySalaryDemand: 310_000,
    signingFee: 600_000,
  },
  {
    id: 'rc_fabio_matias',
    name: 'Fábio Matias',
    nationality: 'Brasil',
    age: 46,
    prestige: 73,
    preferredFormation: '4-3-3',
    mentality: 'Ofensivo',
    passing: 'Curto (Posse)',
    styleLabel: 'Desenvolvimento de Jovens',
    monthlySalaryDemand: 280_000,
    signingFee: 540_000,
  },
  {
    id: 'rc_dal_pozzo',
    name: 'Gilmar Dal Pozzo',
    nationality: 'Brasil',
    age: 56,
    prestige: 73,
    preferredFormation: '4-4-2',
    mentality: 'Defensivo',
    passing: 'Longo (Contra-ataque)',
    styleLabel: 'Firmeza Defensiva',
    monthlySalaryDemand: 270_000,
    signingFee: 520_000,
  },
  {
    id: 'rc_barroca',
    name: 'Eduardo Barroca',
    nationality: 'Brasil',
    age: 43,
    prestige: 72,
    preferredFormation: '4-3-3',
    mentality: 'Equilibrado',
    passing: 'Curto (Posse)',
    styleLabel: 'Saída Apoiada desde a Defesa',
    monthlySalaryDemand: 250_000,
    signingFee: 480_000,
  },
  {
    id: 'rc_william_batista',
    name: 'William Batista',
    nationality: 'Brasil',
    age: 32,
    prestige: 72,
    preferredFormation: '4-2-3-1',
    mentality: 'Ofensivo',
    passing: 'Curto (Posse)',
    styleLabel: 'Escola Moderna de Construção',
    monthlySalaryDemand: 240_000,
    signingFee: 460_000,
  },
  {
    id: 'rc_chamusca',
    name: 'Marcelo Chamusca',
    nationality: 'Brasil',
    age: 59,
    prestige: 71,
    preferredFormation: '4-2-3-1',
    mentality: 'Equilibrado',
    passing: 'Misto',
    styleLabel: 'Regularidade em Pontos Corridos',
    monthlySalaryDemand: 210_000,
    signingFee: 410_000,
  },
  {
    id: 'rc_dado',
    name: 'Dado Cavalcanti',
    nationality: 'Brasil',
    age: 44,
    prestige: 70,
    preferredFormation: '4-3-3',
    mentality: 'Equilibrado',
    passing: 'Curto (Posse)',
    styleLabel: 'Construção pelo Setor Central',
    monthlySalaryDemand: 190_000,
    signingFee: 360_000,
  },
  {
    id: 'rc_gareth_southgate',
    name: 'Gareth Southgate',
    nationality: 'Inglaterra',
    age: 55,
    prestige: 88,
    preferredFormation: '4-2-3-1',
    mentality: 'Equilibrado',
    passing: 'Curto (Posse)',
    styleLabel: 'Gestão de Seleções & Organização Tática',
    monthlySalaryDemand: 1_550_000,
    signingFee: 3_500_000,
  },
  {
    id: 'rc_graham_potter',
    name: 'Graham Potter',
    nationality: 'Inglaterra',
    age: 50,
    prestige: 84,
    preferredFormation: '3-4-3',
    mentality: 'Ofensivo',
    passing: 'Curto (Posse)',
    styleLabel: 'Fluidez Tática & Construção Apoiada',
    monthlySalaryDemand: 1_100_000,
    signingFee: 2_400_000,
  },
  {
    id: 'rc_sean_dyche',
    name: 'Sean Dyche',
    nationality: 'Inglaterra',
    age: 54,
    prestige: 81,
    preferredFormation: '4-4-2',
    mentality: 'Defensivo',
    passing: 'Longo (Contra-ataque)',
    styleLabel: 'Solidez Física & Bola Aérea Inglesa',
    monthlySalaryDemand: 890_000,
    signingFee: 1_900_000,
  },
  {
    id: 'rc_gary_oneil',
    name: "Gary O'Neil",
    nationality: 'Inglaterra',
    age: 42,
    prestige: 79,
    preferredFormation: '4-2-3-1',
    mentality: 'Equilibrado',
    passing: 'Misto',
    styleLabel: 'Transição Rápida & Adaptação ao Rival',
    monthlySalaryDemand: 680_000,
    signingFee: 1_400_000,
  },
  {
    id: 'rc_steven_gerrard',
    name: 'Steven Gerrard',
    nationality: 'Inglaterra',
    age: 45,
    prestige: 78,
    preferredFormation: '4-3-3',
    mentality: 'Ofensivo',
    passing: 'Misto',
    styleLabel: 'Intensidade no Meio & Liderança',
    monthlySalaryDemand: 720_000,
    signingFee: 1_500_000,
  },
  {
    id: 'rc_jurgen_klopp',
    name: 'Jürgen Klopp',
    nationality: 'Alemanha',
    age: 58,
    prestige: 96,
    preferredFormation: '4-3-3',
    mentality: 'Pressão Total',
    passing: 'Misto',
    styleLabel: 'Gegenpressing & Intensidade Máxima',
    monthlySalaryDemand: 2_800_000,
    signingFee: 6_500_000,
  },
  {
    id: 'rc_zinedine_zidane',
    name: 'Zinédine Zidane',
    nationality: 'França',
    age: 53,
    prestige: 95,
    preferredFormation: '4-3-3',
    mentality: 'Ofensivo',
    passing: 'Curto (Posse)',
    styleLabel: 'Gestão de Galácticos & Decisão Continental',
    monthlySalaryDemand: 2_600_000,
    signingFee: 6_000_000,
  },
  {
    id: 'rc_xavi_hernandez',
    name: 'Xavi Hernández',
    nationality: 'Espanha',
    age: 46,
    prestige: 88,
    preferredFormation: '4-3-3',
    mentality: 'Ofensivo',
    passing: 'Curto (Posse)',
    styleLabel: 'Jogo de Posição & Posse Catalã',
    monthlySalaryDemand: 1_800_000,
    signingFee: 4_100_000,
  },
  {
    id: 'rc_roberto_mancini',
    name: 'Roberto Mancini',
    nationality: 'Itália',
    age: 61,
    prestige: 87,
    preferredFormation: '4-3-3',
    mentality: 'Equilibrado',
    passing: 'Curto (Posse)',
    styleLabel: 'Organização Italiana & Versatilidade',
    monthlySalaryDemand: 1_650_000,
    signingFee: 3_600_000,
  },
  {
    id: 'rc_mauricio_pochettino',
    name: 'Mauricio Pochettino',
    nationality: 'Argentina',
    age: 54,
    prestige: 86,
    preferredFormation: '4-2-3-1',
    mentality: 'Pressão Total',
    passing: 'Curto (Posse)',
    styleLabel: 'Pressão Alta & Desenvolvimento de Jovens',
    monthlySalaryDemand: 1_600_000,
    signingFee: 3_500_000,
  },
  {
    id: 'rc_erik_ten_hag',
    name: 'Erik ten Hag',
    nationality: 'Holanda',
    age: 56,
    prestige: 85,
    preferredFormation: '4-2-3-1',
    mentality: 'Ofensivo',
    passing: 'Curto (Posse)',
    styleLabel: 'Transição Dinâmica & Rigor Tático',
    monthlySalaryDemand: 1_500_000,
    signingFee: 3_200_000,
  },
  {
    id: 'rc_sergio_conceicao',
    name: 'Sérgio Conceição',
    nationality: 'Portugal',
    age: 51,
    prestige: 86,
    preferredFormation: '4-4-2',
    mentality: 'Pressão Total',
    passing: 'Misto',
    styleLabel: 'Competitividade Feroz & Pressão Coletiva',
    monthlySalaryDemand: 1_550_000,
    signingFee: 3_400_000,
  },
  {
    id: 'rc_luciano_spalletti',
    name: 'Luciano Spalletti',
    nationality: 'Itália',
    age: 67,
    prestige: 88,
    preferredFormation: '4-3-3',
    mentality: 'Ofensivo',
    passing: 'Curto (Posse)',
    styleLabel: 'Amplitude Tática & Construção Apoiada',
    monthlySalaryDemand: 1_650_000,
    signingFee: 3_700_000,
  },
  {
    id: 'rc_joachim_low',
    name: 'Joachim Löw',
    nationality: 'Alemanha',
    age: 66,
    prestige: 85,
    preferredFormation: '4-2-3-1',
    mentality: 'Ofensivo',
    passing: 'Curto (Posse)',
    styleLabel: 'Posse Progressiva & Escola Alemã',
    monthlySalaryDemand: 1_350_000,
    signingFee: 2_800_000,
  },
  {
    id: 'rc_rafael_benitez',
    name: 'Rafael Benítez',
    nationality: 'Espanha',
    age: 65,
    prestige: 83,
    preferredFormation: '4-2-3-1',
    mentality: 'Defensivo',
    passing: 'Misto',
    styleLabel: 'Compactação Estratégica & Copas',
    monthlySalaryDemand: 1_150_000,
    signingFee: 2_300_000,
  },
];

// Perfis detalhados dos principais treinadores reais empregados nos clubes em 2026
const KNOWN_EMPLOYED_COACH_PROFILES: Record<
  string,
  {
    nationality: string;
    age: number;
    prestige: number;
    preferredFormation: FormationType;
    mentality: TacticalMentality;
    passing: PassingStyle;
    styleLabel: string;
  }
> = {
  'Leonardo Jardim': {
    nationality: 'Portugal',
    age: 51,
    prestige: 91,
    preferredFormation: '4-2-3-1',
    mentality: 'Ofensivo',
    passing: 'Curto (Posse)',
    styleLabel: 'Equilíbrio Europeu & Transição Letal',
  },
  'Abel Ferreira': {
    nationality: 'Portugal',
    age: 47,
    prestige: 93,
    preferredFormation: '4-2-3-1',
    mentality: 'Ofensivo',
    passing: 'Misto',
    styleLabel: 'Cabeça Fria & Intensidade Competitiva',
  },
  'Dorival Júnior': {
    nationality: 'Brasil',
    age: 63,
    prestige: 89,
    preferredFormation: '4-2-3-1',
    mentality: 'Equilibrado',
    passing: 'Curto (Posse)',
    styleLabel: 'Toque Refinado & Decisão em Copas',
  },
  'Clarence Seedorf': {
    nationality: 'Holanda',
    age: 49,
    prestige: 86,
    preferredFormation: '4-3-3',
    mentality: 'Ofensivo',
    passing: 'Curto (Posse)',
    styleLabel: 'Escola Holandesa & Domínio de Meio',
  },
  Tite: {
    nationality: 'Brasil',
    age: 64,
    prestige: 90,
    preferredFormation: '4-1-4-1',
    mentality: 'Equilibrado',
    passing: 'Curto (Posse)',
    styleLabel: 'Equilíbrio Entre Linhas & Solidez',
  },
  'Eduardo Domínguez': {
    nationality: 'Argentina',
    age: 47,
    prestige: 86,
    preferredFormation: '4-2-3-1',
    mentality: 'Ofensivo',
    passing: 'Misto',
    styleLabel: 'Competitividade & Jogo Vertical',
  },
  'Artur Jorge': {
    nationality: 'Portugal',
    age: 54,
    prestige: 89,
    preferredFormation: '4-2-3-1',
    mentality: 'Ofensivo',
    passing: 'Misto',
    styleLabel: 'Ataque Vertical & Pressão Alta',
  },
  'Renato Gaúcho': {
    nationality: 'Brasil',
    age: 63,
    prestige: 86,
    preferredFormation: '4-2-3-1',
    mentality: 'Ofensivo',
    passing: 'Misto',
    styleLabel: 'Gestão de Estrelas & Poder Ofensivo',
  },
  'Eduardo Baptista': {
    nationality: 'Brasil',
    age: 53,
    prestige: 81,
    preferredFormation: '4-2-3-1',
    mentality: 'Equilibrado',
    passing: 'Misto',
    styleLabel: 'Organização Tática & Bola Aérea',
  },
  Marcão: {
    nationality: 'Brasil',
    age: 53,
    prestige: 79,
    preferredFormation: '4-2-3-1',
    mentality: 'Equilibrado',
    passing: 'Curto (Posse)',
    styleLabel: 'Identidade Tricolor & Equilíbrio',
  },
  'Pedro Emanuel': {
    nationality: 'Portugal',
    age: 51,
    prestige: 81,
    preferredFormation: '4-3-3',
    mentality: 'Equilibrado',
    passing: 'Misto',
    styleLabel: 'Disciplina Tática Portuguesa',
  },
  'Rogério Ceni': {
    nationality: 'Brasil',
    age: 53,
    prestige: 85,
    preferredFormation: '4-3-3',
    mentality: 'Ofensivo',
    passing: 'Curto (Posse)',
    styleLabel: 'Construção Limpa & Protagonismo',
  },
  'Odair Hellmann': {
    nationality: 'Brasil',
    age: 49,
    prestige: 81,
    preferredFormation: '4-2-3-1',
    mentality: 'Equilibrado',
    passing: 'Misto',
    styleLabel: 'Compactação & Contra-Golpe Rápido',
  },
  Cuca: {
    nationality: 'Brasil',
    age: 62,
    prestige: 85,
    preferredFormation: '4-3-3',
    mentality: 'Ofensivo',
    passing: 'Longo (Contra-ataque)',
    styleLabel: 'Bola Longa, Velocidade & Encaixes',
  },
  'Vagner Mancini': {
    nationality: 'Brasil',
    age: 59,
    prestige: 79,
    preferredFormation: '4-2-3-1',
    mentality: 'Equilibrado',
    passing: 'Misto',
    styleLabel: 'Transição Direta & Reação',
  },
  'Jair Ventura': {
    nationality: 'Brasil',
    age: 46,
    prestige: 78,
    preferredFormation: '4-1-4-1',
    mentality: 'Defensivo',
    passing: 'Longo (Contra-ataque)',
    styleLabel: 'Bloco Baixo & Contra-Ataque Veloz',
  },
  'Fernando Seabra': {
    nationality: 'Brasil',
    age: 48,
    prestige: 79,
    preferredFormation: '4-3-3',
    mentality: 'Ofensivo',
    passing: 'Curto (Posse)',
    styleLabel: 'Pressão Coordenada & Base Forte',
  },
  'Rafael Lacerda': {
    nationality: 'Brasil',
    age: 41,
    prestige: 76,
    preferredFormation: '4-2-3-1',
    mentality: 'Equilibrado',
    passing: 'Misto',
    styleLabel: 'Competitividade & Força Local',
  },
  'Thiago Carpini': {
    nationality: 'Brasil',
    age: 41,
    prestige: 79,
    preferredFormation: '4-2-3-1',
    mentality: 'Equilibrado',
    passing: 'Misto',
    styleLabel: 'Intensidade & Organização',
  },
  'Rafael Guanaes': {
    nationality: 'Brasil',
    age: 44,
    prestige: 79,
    preferredFormation: '4-3-3',
    mentality: 'Ofensivo',
    passing: 'Curto (Posse)',
    styleLabel: 'Jogo Coletivo Moderno',
  },
  'Paulo Autuori': {
    nationality: 'Brasil',
    age: 69,
    prestige: 83,
    preferredFormation: '4-2-3-1',
    mentality: 'Equilibrado',
    passing: 'Curto (Posse)',
    styleLabel: 'Experiência Campeã & Gestão',
  },
  'Marcelo Gallardo': {
    nationality: 'Argentina',
    age: 50,
    prestige: 92,
    preferredFormation: '4-3-3',
    mentality: 'Pressão Total',
    passing: 'Curto (Posse)',
    styleLabel: 'Dinâmica Monumental & Pressão',
  },
  'Fernando Gago': {
    nationality: 'Argentina',
    age: 39,
    prestige: 84,
    preferredFormation: '4-3-3',
    mentality: 'Ofensivo',
    passing: 'Curto (Posse)',
    styleLabel: 'Saída Limpa & Posse Ofensiva',
  },
  'Gabriel Milito': {
    nationality: 'Argentina',
    age: 45,
    prestige: 84,
    preferredFormation: '3-4-3',
    mentality: 'Ofensivo',
    passing: 'Curto (Posse)',
    styleLabel: 'Linha de Três & Posse Agressiva',
  },
};

// Mercado real de preparadores e auxiliares para o Centro de Treinamento
export const AVAILABLE_TECHNICAL_STAFF_POOL: CoachStaff[] = [
  // Preparadores Físicos
  {
    id: 'staff_paulo_paixao',
    name: 'Paulo Paixão',
    role: 'Preparador Físico',
    stars: 5,
    wage: 62_000,
    bonusDescription: '-32% desgaste físico nos treinos e recuperação acelerada',
  },
  {
    id: 'staff_bruno_mazziotti',
    name: 'Bruno Mazziotti',
    role: 'Preparador Físico',
    stars: 5,
    wage: 58_000,
    bonusDescription: '-30% desgaste físico e prevenção avançada de lesões',
  },
  {
    id: 'staff_cristiano_nunes',
    name: 'Cristiano Nunes',
    role: 'Preparador Físico',
    stars: 4,
    wage: 44_000,
    bonusDescription: '-25% desgaste físico e alta explosão muscular',
  },
  {
    id: 'staff_octavio_manera',
    name: 'Octavio Manera',
    role: 'Preparador Físico',
    stars: 4,
    wage: 42_000,
    bonusDescription: '-24% desgaste físico em calendário congestionado',
  },
  {
    id: 'staff_elliot_paiva',
    name: ' Marcos Seixas',
    role: 'Preparador Físico',
    stars: 3,
    wage: 28_000,
    bonusDescription: '-18% desgaste físico semanal do elenco',
  },

  // Treinadores de Ataque
  {
    id: 'staff_alex_cabecao',
    name: 'Alex de Souza',
    role: 'Treinador de Ataque',
    stars: 5,
    wage: 60_000,
    bonusDescription: '+40% de XP para Meias e Atacantes · Refino em finalização',
  },
  {
    id: 'staff_washington_cv',
    name: 'Washington Coração Valente',
    role: 'Treinador de Ataque',
    stars: 4,
    wage: 43_000,
    bonusDescription: '+32% de XP para Centroavantes · Posicionamento na área',
  },
  {
    id: 'staff_elano',
    name: 'Elano Blumer',
    role: 'Treinador de Ataque',
    stars: 4,
    wage: 40_000,
    bonusDescription: '+30% de XP para Pontas e Meias · Bola parada ofensiva',
  },
  {
    id: 'staff_borges',
    name: 'Humberlito Borges',
    role: 'Treinador de Ataque',
    stars: 3,
    wage: 26_000,
    bonusDescription: '+22% de XP em finalização de curta distância',
  },

  // Treinadores de Defesa
  {
    id: 'staff_juan_silveira',
    name: 'Juan Silveira',
    role: 'Treinador de Defesa',
    stars: 5,
    wage: 56_000,
    bonusDescription: '+38% de XP para Zagueiros e Laterais · Antecipação limpa',
  },
  {
    id: 'staff_ricardo_rocha',
    name: 'Ricardo Rocha',
    role: 'Treinador de Defesa',
    stars: 4,
    wage: 42_000,
    bonusDescription: '+30% de XP para Defensores · Liderança de linha alta',
  },
  {
    id: 'staff_chicão',
    name: 'Chicão',
    role: 'Treinador de Defesa',
    stars: 4,
    wage: 38_000,
    bonusDescription: '+28% de XP para Zagueiros · Jogo aéreo e faltas',
  },
  {
    id: 'staff_edu_dracena',
    name: 'Edu Dracena',
    role: 'Treinador de Defesa',
    stars: 3,
    wage: 27_000,
    bonusDescription: '+20% de XP em cobertura defensiva',
  },

  // Treinadores de Goleiros
  {
    id: 'staff_dida',
    name: 'Nelson Dida',
    role: 'Treinador de Goleiros',
    stars: 5,
    wage: 55_000,
    bonusDescription: '+42% de XP para Goleiros · Especialista em pênaltis',
  },
  {
    id: 'staff_taffarel_mkt',
    name: 'Cláudio Taffarel',
    role: 'Treinador de Goleiros',
    stars: 5,
    wage: 58_000,
    bonusDescription: '+45% de XP para Goleiros · Reflexo e saída de gol',
  },
  {
    id: 'staff_prass',
    name: 'Fernando Prass',
    role: 'Treinador de Goleiros',
    stars: 4,
    wage: 40_000,
    bonusDescription: '+32% de XP para Goleiros · Decisão sob pressão',
  },
  {
    id: 'staff_victor_bagy',
    name: 'Victor Bagy',
    role: 'Treinador de Goleiros',
    stars: 4,
    wage: 39_000,
    bonusDescription: '+30% de XP para Goleiros · Envergadura e 1 contra 1',
  },
  {
    id: 'staff_araha',
    name: 'Aranha',
    role: 'Treinador de Goleiros',
    stars: 3,
    wage: 25_000,
    bonusDescription: '+22% de XP para Goleiros jovens',
  },

  // Médicos-Chefes (Departamento Médico & Prevenção)
  {
    id: 'staff_rodrigo_lasmar',
    name: 'Dr. Rodrigo Lasmar',
    role: 'Médico-Chefe',
    stars: 5,
    wage: 62_000,
    bonusDescription: '-35% tempo de recuperação no DM · -30% risco de lesão muscular',
  },
  {
    id: 'staff_joaquim_grava',
    name: 'Dr. Joaquim Grava',
    role: 'Médico-Chefe',
    stars: 5,
    wage: 58_000,
    bonusDescription: '-32% tempo de recuperação no DM · Cirurgia e reabilitação de elite',
  },
  {
    id: 'staff_marcio_tannure',
    name: 'Dr. Márcio Tannure',
    role: 'Médico-Chefe',
    stars: 4,
    wage: 44_000,
    bonusDescription: '-24% tempo no DM · Controle fisiológico avançado',
  },
  {
    id: 'staff_gustavo_magliocca',
    name: 'Dr. André Pedrinelli',
    role: 'Médico-Chefe',
    stars: 4,
    wage: 40_000,
    bonusDescription: '-22% tempo no DM · Prevenção articular',
  },
  {
    id: 'staff_fabio_novo',
    name: 'Dr. Fábio Novo',
    role: 'Médico-Chefe',
    stars: 3,
    wage: 26_000,
    bonusDescription: '-15% tempo de recuperação de lesões leves e moderadas',
  },

  // Analistas de Desempenho & Tática
  {
    id: 'staff_matheus_bachi',
    name: 'Matheus Bachi',
    role: 'Analista de Desempenho',
    stars: 5,
    wage: 52_000,
    bonusDescription: '+45% velocidade de adaptação a nova posição · +Bola parada tática',
  },
  {
    id: 'staff_bruno_baquete',
    name: 'Bruno Baquete',
    role: 'Analista de Desempenho',
    stars: 4,
    wage: 38_000,
    bonusDescription: '+35% velocidade em reconversão de função · Leitura de adversários',
  },
  {
    id: 'staff_thomaz_araujo',
    name: 'Thomaz Araújo',
    role: 'Analista de Desempenho',
    stars: 4,
    wage: 36_000,
    bonusDescription: '+32% adaptação tática · +XP para Meio-Campistas e Laterais',
  },
  {
    id: 'staff_lucas_oliveira_ana',
    name: 'Lucas Oliveira',
    role: 'Analista de Desempenho',
    stars: 3,
    wage: 24_000,
    bonusDescription: '+20% adaptação a novas posições no CT',
  },
];

export function scaleCoachWageForClub(baseWeeklyWage: number, club?: Club): number {
  const mult = club ? getClubEconomyProfile(club).coachSalaryMult : 1.0;
  const raw = baseWeeklyWage * mult;
  const step = raw < 5_000 ? 250 : 1_000;
  return Math.max(1_500, Math.round(raw / step) * step);
}

export function getScaledTechnicalStaffPoolForClub(club: Club): CoachStaff[] {
  return AVAILABLE_TECHNICAL_STAFF_POOL.map((staff) => ({
    ...staff,
    wage: scaleCoachWageForClub(staff.wage, club),
  }));
}

export interface ClubStaffBonuses {
  dailyConditionBonus: number;
  extraMedicalRecoveryChance: number;
  injuryRiskMultiplier: number;
  retrainingSpeedMultiplier: number;
  setPieceBonus: number;
  gkXpMultiplier: number;
  defXpMultiplier: number;
  attXpMultiplier: number;
}

export function computeClubStaffBonuses(club: Club): ClubStaffBonuses {
  const coaches = club.coaches || [];
  const phys = coaches.find((c) => c.role === 'Preparador Físico');
  const med = coaches.find((c) => c.role === 'Médico-Chefe');
  const ana = coaches.find((c) => c.role === 'Analista de Desempenho');
  const gk = coaches.find((c) => c.role === 'Treinador de Goleiros');
  const def = coaches.find((c) => c.role === 'Treinador de Defesa');
  const att = coaches.find((c) => c.role === 'Treinador de Ataque');

  return {
    dailyConditionBonus: phys ? phys.stars * 1.6 : 0,
    extraMedicalRecoveryChance: med ? med.stars * 0.1 : 0, // up to 50% chance of +1 extra day healed per day!
    injuryRiskMultiplier: med ? Math.max(0.65, 1 - med.stars * 0.065) : 1,
    retrainingSpeedMultiplier: 1 + (ana ? ana.stars * 0.1 : 0),
    setPieceBonus: ana ? ana.stars * 0.004 : 0,
    gkXpMultiplier: 1 + (gk ? gk.stars * 0.07 : 0),
    defXpMultiplier: 1 + (def ? def.stars * 0.06 : 0),
    attXpMultiplier: 1 + (att ? att.stars * 0.06 : 0),
  };
}

export function buildRealCoachProfileFromName(
  coachName: string,
  club?: Club
): RealCoachProfile {
  const cleanName = coachName.trim();
  const fromFreePool = INITIAL_FREE_AGENT_REAL_COACHES.find(
    (c) => c.name.toLowerCase() === cleanName.toLowerCase()
  );
  if (fromFreePool) {
    const swFree = resolveAnySoccerWikiCoachPhoto(fromFreePool.name);
    return swFree
      ? {
          ...fromFreePool,
          photoUrl: fromFreePool.photoUrl || swFree.photoUrl,
          soccerWikiId: fromFreePool.soccerWikiId ?? swFree.soccerWikiId,
        }
      : { ...fromFreePool };
  }

  const swCoach = resolveAnySoccerWikiCoachPhoto(cleanName);
  const known = KNOWN_EMPLOYED_COACH_PROFILES[cleanName];
  if (known) {
    const monthlySalaryDemand = Math.round((known.prestige * 13_500) / 10_000) * 10_000;
    return {
      id: `rc_${cleanName.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
      name: cleanName,
      nationality: known.nationality,
      age: known.age,
      prestige: known.prestige,
      preferredFormation: known.preferredFormation,
      mentality: known.mentality,
      passing: known.passing,
      styleLabel: known.styleLabel,
      monthlySalaryDemand,
      signingFee: monthlySalaryDemand * 2,
      photoUrl: swCoach?.photoUrl,
      soccerWikiId: swCoach?.soccerWikiId,
    };
  }

  const div = club?.division || 'C';
  const basePrestige =
    div === 'A'
      ? 79 + (club?.reputation || 3) * 2
      : div === 'SA'
      ? 78 + (club?.reputation || 3) * 2
      : div === 'B'
      ? 72 + (club?.reputation || 2) * 2
      : div === 'C'
      ? 66 + (club?.reputation || 2) * 2
      : 61 + (club?.reputation || 1) * 2;

  const hash = cleanName.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  const formations: FormationType[] = ['4-2-3-1', '4-3-3', '4-4-2', '3-5-2', '4-1-4-1'];
  const mentalities: TacticalMentality[] = ['Equilibrado', 'Ofensivo', 'Defensivo'];
  const styles = [
    'Equilíbrio Competitivo',
    'Transição Rápida',
    'Organização Defensiva',
    'Jogo Apoiado & Posse',
    'Bola Parada & Marcação Forte',
  ];

  const prestige = Math.min(92, Math.max(58, basePrestige));
  const salary =
    div === 'A' || div === 'SA'
      ? 520_000
      : div === 'B'
      ? 240_000
      : div === 'C'
      ? 110_000
      : 65_000;

  return {
    id: `rc_${cleanName.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
    name: cleanName,
    nationality: club?.country && club.country !== 'Brasil' ? club.country : 'Brasil',
    age: 41 + (hash % 22),
    prestige,
    preferredFormation: club?.tactics?.formation || formations[hash % formations.length],
    mentality: club?.tactics?.mentality || mentalities[hash % mentalities.length],
    passing: club?.tactics?.passing || 'Misto',
    styleLabel: styles[hash % styles.length],
    monthlySalaryDemand: salary,
    signingFee: salary * 2,
    photoUrl: swCoach?.photoUrl,
    soccerWikiId: swCoach?.soccerWikiId,
  };
}

export function createInitialCoachingCarousel(clubs: Club[]): CoachingCarouselState {
  const clubCoachSecurity: Record<string, number> = {};
  const employedNames = new Set(clubs.map((c) => c.managerName.trim().toLowerCase()));

  clubs.forEach((c) => {
    const seedOffset = (c.id.charCodeAt(0) * 5 + c.id.charCodeAt(c.id.length - 1)) % 14;
    clubCoachSecurity[c.id] = 68 + seedOffset; // 68% to 81% starting security
  });

  const freeAgentCoaches = INITIAL_FREE_AGENT_REAL_COACHES.filter(
    (coach) => !employedNames.has(coach.name.trim().toLowerCase())
  ).map((coach) => {
    const sw = resolveAnySoccerWikiCoachPhoto(coach.name);
    return sw
      ? {
          ...coach,
          photoUrl: coach.photoUrl || sw.photoUrl,
          soccerWikiId: coach.soccerWikiId ?? sw.soccerWikiId,
        }
      : coach;
  });

  return {
    clubCoachSecurity,
    freeAgentCoaches,
    movementHistory: [],
  };
}

export function ensureCoachingCarouselState(state: GameSave): CoachingCarouselState {
  const existing = state.coachingCarousel;
  if (!existing) {
    return createInitialCoachingCarousel(state.clubs);
  }

  const employedNames = new Set(state.clubs.map((c) => c.managerName.trim().toLowerCase()));
  const nextSecurity: Record<string, number> = { ...existing.clubCoachSecurity };
  state.clubs.forEach((c) => {
    if (typeof nextSecurity[c.id] !== 'number') {
      nextSecurity[c.id] = 72;
    }
  });

  const seenFreeIds = new Set<string>();
  const cleanedFree = (existing.freeAgentCoaches || []).filter((coach) => {
    const key = coach.name.trim().toLowerCase();
    if (employedNames.has(key) || seenFreeIds.has(key)) return false;
    seenFreeIds.add(key);
    return true;
  });

  // Top up from initial pool if needed
  INITIAL_FREE_AGENT_REAL_COACHES.forEach((tmpl) => {
    const key = tmpl.name.trim().toLowerCase();
    if (!employedNames.has(key) && !seenFreeIds.has(key)) {
      seenFreeIds.add(key);
      cleanedFree.push(tmpl);
    }
  });

  return {
    clubCoachSecurity: nextSecurity,
    freeAgentCoaches: cleanedFree.map((coach) => {
      if (coach.photoUrl) return coach;
      const sw = resolveAnySoccerWikiCoachPhoto(coach.name);
      return sw ? { ...coach, photoUrl: sw.photoUrl, soccerWikiId: sw.soccerWikiId } : coach;
    }),
    movementHistory: (existing.movementHistory || []).slice(0, 80),
  };
}

interface LeagueContextForCarousel {
  leagueKey: string;
  leagueLabel: string;
  table: Standing[];
  relegationSlots: number;
  targetPrestigeBase: number;
  isMajorVisibility: boolean;
}

function resolveClubLeagueContext(state: GameSave, club: Club): LeagueContextForCarousel {
  if (club.division === 'EU') {
    const euId = getClubEuropeanLeagueId(club);
    const meta = euId ? EUROPEAN_LEAGUES_META[euId] : undefined;
    return {
      leagueKey: `EU::${euId || 'unknown'}`,
      leagueLabel: meta?.shortName || meta?.name || club.country || 'Europa',
      table: euId ? state.standingsEurope?.[euId] || [] : [],
      relegationSlots: meta?.relegationSlots ?? 3,
      targetPrestigeBase: meta?.tier === 1 ? 84 : 74,
      isMajorVisibility: meta?.tier === 1 || club.reputation >= 4,
    };
  }
  if (club.division === 'SA') {
    const saId = getClubSouthAmericanLeagueId(club);
    const meta = saId ? SOUTH_AMERICAN_LEAGUES_META[saId] : undefined;
    return {
      leagueKey: `SA::${saId || 'unknown'}`,
      leagueLabel: meta?.shortName || club.country || 'América do Sul',
      table: saId ? state.standingsSouthAmerica?.[saId] || [] : [],
      relegationSlots: meta?.relegationSlots ?? 2,
      targetPrestigeBase: 81,
      isMajorVisibility: club.reputation >= 4,
    };
  }
  if (club.division === 'WL') {
    const wlId = getClubWorldLeagueId(club);
    const meta = wlId ? WORLD_LEAGUES_META[wlId] : undefined;
    return {
      leagueKey: `WL::${wlId || 'unknown'}`,
      leagueLabel: meta?.shortName || club.country || 'Liga Internacional',
      table: wlId ? state.standingsWorldLeagues?.[wlId] || [] : [],
      relegationSlots: meta?.relegationSlots ?? 2,
      targetPrestigeBase: 80,
      isMajorVisibility: club.reputation >= 4,
    };
  }
  if (club.division === 'EST') {
    const cfg = getClubEstadualConfig(club);
    const groupName = cfg?.name || 'Campeonato Potiguar (RN)';
    return {
      leagueKey: `EST::${cfg?.uf || club.state}`,
      leagueLabel: cfg?.shortName || `Estadual ${club.state}`,
      table: (state.standingsEstadual || []).filter((s) => s.group === groupName),
      relegationSlots: 2,
      targetPrestigeBase: 68,
      isMajorVisibility: false,
    };
  }
  if (club.division === 'D') {
    const table = state.standingsD || [];
    const row = table.find((s) => s.teamId === club.id);
    const groupTable = row?.group ? table.filter((s) => s.group === row.group) : table;
    return {
      leagueKey: `D::${row?.group || 'all'}`,
      leagueLabel: 'Série D',
      table: groupTable,
      relegationSlots: 2,
      targetPrestigeBase: 68,
      isMajorVisibility: false,
    };
  }
  const table =
    club.division === 'A'
      ? state.standingsA || []
      : club.division === 'B'
      ? state.standingsB || []
      : state.standingsC || [];
  return {
    leagueKey: `BR::${club.division}`,
    leagueLabel: `Série ${club.division}`,
    table,
    relegationSlots: 4,
    targetPrestigeBase: club.division === 'A' ? 83 : club.division === 'B' ? 75 : 70,
    isMajorVisibility: club.division === 'A',
  };
}

export function getCoachSecurityDescriptor(security: number): {
  label: string;
  colorClass: string;
  barClass: string;
} {
  if (security >= 78) {
    return {
      label: 'Prestigiado',
      colorClass: 'text-emerald-400',
      barClass: 'bg-emerald-400',
    };
  }
  if (security >= 56) {
    return {
      label: 'Cargo Estável',
      colorClass: 'text-sky-400',
      barClass: 'bg-sky-400',
    };
  }
  if (security >= 36) {
    return {
      label: 'Pressionado',
      colorClass: 'text-amber-400',
      barClass: 'bg-amber-400',
    };
  }
  return {
    label: 'Na Corda Bamba',
    colorClass: 'text-rose-400',
    barClass: 'bg-rose-500',
  };
}

/**
 * Avalia os treinadores de todos os clubes da CPU a cada rodada (Brasil, Europa, América do Sul e Mundo),
 * demite comandantes em crise e contrata treinadores reais livres no mercado (podendo convidar o usuário).
 */
export function processRoundCoachingCarousel(state: GameSave): GameSave {
  const carousel = ensureCoachingCarouselState(state);
  const updatedSecurity: Record<string, number> = { ...carousel.clubCoachSecurity };
  let freePool = [...carousel.freeAgentCoaches];
  const newMovements: CoachMovementRecord[] = [];
  const newInbox: InboxMessage[] = [];
  let updatedCareer = state.managerCareer;

  // Sync user club security with boardConfidence
  if (state.managerCareer) {
    updatedSecurity[state.userClubId] = state.managerCareer.boardConfidence;
  }

  // Build expected power rank per league group across ALL divisions
  const leagueClubsByKey = new Map<string, Club[]>();
  const ctxByClubId = new Map<string, LeagueContextForCarousel>();

  state.clubs.forEach((club) => {
    const ctx = resolveClubLeagueContext(state, club);
    ctxByClubId.set(club.id, ctx);
    const list = leagueClubsByKey.get(ctx.leagueKey) || [];
    list.push(club);
    leagueClubsByKey.set(ctx.leagueKey, list);
  });

  const expectedRanksByClub: Record<string, number> = {};
  leagueClubsByKey.forEach((groupClubs) => {
    groupClubs
      .map((c) => ({
        id: c.id,
        power: c.reputation * 7.5 + getClubSquadAvgOverall(c),
      }))
      .sort((a, b) => b.power - a.power)
      .forEach((entry, idx) => {
        expectedRanksByClub[entry.id] = idx + 1;
      });
  });

  const sackingCandidates: Array<{
    club: Club;
    ctx: LeagueContextForCarousel;
    currentPos: number;
    expectedPos: number;
    securityAfter: number;
    z4Start: number;
  }> = [];

  state.clubs.forEach((club) => {
    if (club.id === state.userClubId) return;

    const ctx = ctxByClubId.get(club.id);
    if (!ctx || ctx.table.length === 0) return;

    const rowIdx = ctx.table.findIndex((s) => s.teamId === club.id);
    const row = rowIdx >= 0 ? ctx.table[rowIdx] : undefined;
    if (!row || row.played < 4) return;

    const prevSec = updatedSecurity[club.id] ?? 72;
    const currentPos = rowIdx + 1;
    const expectedPos = expectedRanksByClub[club.id] || Math.ceil(ctx.table.length / 2);
    const underperformance = currentPos - expectedPos;
    const recentForm = (row.form || []).slice(-4);
    const recentWins = recentForm.filter((r) => r === 'V').length;
    const recentLosses = recentForm.filter((r) => r === 'D').length;
    const z4Start = Math.max(6, ctx.table.length - ctx.relegationSlots + 1);

    let delta = 0;
    if (underperformance >= 6) delta -= 7;
    else if (underperformance >= 3) delta -= 4;
    else if (underperformance <= -4) delta += 5;
    else if (underperformance <= -1) delta += 2;

    if (currentPos >= z4Start) delta -= 5;
    if (recentLosses >= 3) delta -= 6;
    if (recentWins >= 3) delta += 6;

    const nextSec = Math.max(10, Math.min(96, prevSec + delta));
    updatedSecurity[club.id] = nextSec;

    if (nextSec <= 24 && row.played >= 5) {
      sackingCandidates.push({
        club,
        ctx,
        currentPos,
        expectedPos,
        securityAfter: nextSec,
        z4Start,
      });
    }
  });

  // Sort worst security first; cap at 3 sackings globally per round
  sackingCandidates.sort((a, b) => a.securityAfter - b.securityAfter);
  const clubsToChangeCoach = sackingCandidates.slice(0, 3);

  if (clubsToChangeCoach.length === 0) {
    return {
      ...state,
      coachingCarousel: {
        ...carousel,
        clubCoachSecurity: updatedSecurity,
        freeAgentCoaches: freePool,
      },
    };
  }

  const clubReplacements = new Map<
    string,
    { newCoach: RealCoachProfile; severance: number; oldCoachName: string }
  >();

  const userClub = state.clubs.find((c) => c.id === state.userClubId);
  const userRep = updatedCareer?.managerReputation || 55;
  const userPendingOffersCount =
    updatedCareer?.jobOffers.filter((o) => o.status === 'PENDING').length || 0;
  let offeredUserThisRound = false;

  for (const item of clubsToChangeCoach) {
    const { club, ctx, currentPos, z4Start } = item;
    const oldCoachName = club.managerName;
    const oldCoachProfile = buildRealCoachProfileFromName(oldCoachName, club);

    const targetPrestige =
      club.reputation >= 5
        ? Math.max(ctx.targetPrestigeBase, 88)
        : club.reputation === 4
        ? Math.max(ctx.targetPrestigeBase - 2, 82)
        : Math.min(ctx.targetPrestigeBase, 76);

    const affordableCandidates = freePool
      .filter(
        (c) =>
          c.name.toLowerCase() !== oldCoachName.toLowerCase() &&
          club.finances.balance >= c.signingFee * 0.35
      )
      .sort(
        (a, b) =>
          Math.abs(a.prestige - targetPrestige) - Math.abs(b.prestige - targetPrestige)
      );

    const hiredCoach = affordableCandidates[0] || freePool[0];
    if (!hiredCoach) continue;

    freePool = freePool.filter((c) => c.id !== hiredCoach.id);
    if (!freePool.some((c) => c.name.toLowerCase() === oldCoachProfile.name.toLowerCase())) {
      freePool.push({
        ...oldCoachProfile,
        prestige: Math.max(60, oldCoachProfile.prestige - 1),
      });
    }

    const severance = Math.min(
      Math.max(180_000, Math.round(club.finances.balance * 0.04)),
      oldCoachProfile.monthlySalaryDemand * 2
    );

    clubReplacements.set(club.id, {
      newCoach: hiredCoach,
      severance,
      oldCoachName,
    });

    updatedSecurity[club.id] = 75;

    const reasonText =
      currentPos >= z4Start
        ? `Queda para a zona de rebaixamento (${currentPos}º lugar · ${ctx.leagueLabel})`
        : `Campanha abaixo da meta (${currentPos}º lugar · ${ctx.leagueLabel})`;

    const movement: CoachMovementRecord = {
      id: `cmov_${club.id}_r${state.currentRound}_${Date.now()}_${newMovements.length}`,
      entityType: 'CLUB',
      date: state.currentDate,
      round: state.currentRound,
      seasonYear: state.currentSeasonYear,
      clubId: club.id,
      clubName: club.name,
      clubDivision: club.division,
      sackedCoachName: oldCoachName,
      hiredCoachName: hiredCoach.name,
      severancePaid: severance,
      reason: reasonText,
      eventType: 'SACKED_AND_HIRED',
    };
    newMovements.push(movement);

    const isRelevantToUser =
      club.division === userClub?.division ||
      ctx.isMajorVisibility ||
      (userClub?.rivals || []).includes(club.id);

    if (isRelevantToUser) {
      newInbox.push({
        id: `msg_carousel_${club.id}_r${state.currentRound}_${Date.now()}_${newInbox.length}`,
        title: `Dança das Cadeiras: ${club.shortName} demite ${oldCoachName} e anuncia ${hiredCoach.name}`,
        message: `Pressionada pelos resultados (${reasonText}), a diretoria do ${club.name} pagou rescisão de ${formatCurrency(
          severance
        )} para encerrar o ciclo de ${oldCoachName}. O clube anunciou ${
          hiredCoach.name
        } (${hiredCoach.styleLabel}, esquema ${hiredCoach.preferredFormation}).`,
        date: formatShortDate(state.currentDate),
        round: state.currentRound,
        read: false,
        type: 'BOARD',
      });
    }

    // If user manager is thriving and matches the sacking club's level, the club board can reach out immediately!
    const sameHemisphere = (club.division === 'EU') === (userClub?.division === 'EU');
    const qualifiesByRep = userRep >= club.reputation * 15 - 6;
    const alreadyOffered = updatedCareer?.jobOffers.some(
      (o) => o.clubId === club.id && o.status === 'PENDING'
    );
    if (
      !offeredUserThisRound &&
      updatedCareer &&
      !updatedCareer.lastDismissal &&
      updatedCareer.boardConfidence >= 64 &&
      userPendingOffersCount < 3 &&
      qualifiesByRep &&
      !alreadyOffered &&
      (sameHemisphere || userRep >= 70) &&
      Math.random() < (userPendingOffersCount === 0 ? 0.65 : 0.3)
    ) {
      offeredUserThisRound = true;
      const offeredSalary = Math.round(
        computeManagerSalary(club, Math.max(userRep, 55)) * 1.15
      );
      const urgentOffer: ManagerJobOffer = {
        id: `job_offer_vacant_${club.id}_r${state.currentRound}_${Date.now()}`,
        clubId: club.id,
        clubName: club.name,
        clubShortName: club.shortName,
        clubDivision: club.division,
        clubReputation: club.reputation,
        clubSquadAvgOvr: getClubSquadAvgOverall(club),
        clubColors: club.colors,
        transferBudgetPreview: Math.max(0, club.finances.balance),
        offeredMonthlySalary: offeredSalary,
        contractYears: 2,
        reason: `Após demitir ${oldCoachName} (${reasonText}), a diretoria abriu negociação para você assumir imediatamente.`,
        createdDate: formatShortDate(state.currentDate),
        expiresRound: Math.min(38, state.currentRound + 5),
        status: 'PENDING',
      };
      updatedCareer = {
        ...updatedCareer,
        jobOffers: [urgentOffer, ...updatedCareer.jobOffers].slice(0, 12),
      };
      newInbox.unshift({
        id: `msg_vacant_offer_${club.id}_${Date.now()}`,
        title: `Convite Imediato: ${club.name} quer você no lugar de ${oldCoachName}!`,
        message: `Logo após a saída de ${oldCoachName}, a presidência do ${club.name} (${ctx.leagueLabel}) procurou seu empresário com proposta oficial de ${formatCurrency(
          offeredSalary
        )}/mês. Analise na aba Diretoria -> Propostas!`,
        date: formatShortDate(state.currentDate),
        round: state.currentRound,
        read: false,
        type: 'JOB_OFFER',
        jobOfferId: urgentOffer.id,
      });
    }
  }

  const updatedClubs = state.clubs.map((c) => {
    const rep = clubReplacements.get(c.id);
    if (!rep) return c;
    return {
      ...c,
      managerName: rep.newCoach.name,
      tactics: {
        ...c.tactics,
        formation: rep.newCoach.preferredFormation,
        mentality: rep.newCoach.mentality,
        passing: rep.newCoach.passing,
      },
      finances: {
        ...c.finances,
        balance: Math.max(0, c.finances.balance - rep.severance),
        totalExpensesSeason: c.finances.totalExpensesSeason + rep.severance,
      },
    };
  });

  return {
    ...state,
    clubs: updatedClubs,
    managerCareer: updatedCareer,
    inbox: [...newInbox, ...state.inbox],
    coachingCarousel: {
      clubCoachSecurity: updatedSecurity,
      freeAgentCoaches: freePool,
      movementHistory: [...newMovements, ...carousel.movementHistory].slice(0, 100),
    },
  };
}

/**
 * Permite ao usuário (como presidente/gestor do clube) demitir o treinador atual
 * do próprio clube e contratar imediatamente um treinador real livre no mercado.
 */
export function hireRealHeadCoachForUserClub(
  state: GameSave,
  coachId: string
): {
  success: boolean;
  feedbackText: string;
  updatedState: GameSave;
} {
  const carousel = ensureCoachingCarouselState(state);
  const userClub = state.clubs.find((c) => c.id === state.userClubId);
  const targetCoach = carousel.freeAgentCoaches.find((c) => c.id === coachId);

  if (!userClub || !targetCoach) {
    return {
      success: false,
      feedbackText: 'Treinador não encontrado no mercado.',
      updatedState: state,
    };
  }

  const outgoingName = state.managerName;
  const currentMonthlySalary = state.managerCareer?.monthlySalary || 180_000;
  const severanceFee = Math.round(currentMonthlySalary * 1.5);
  const totalDealCost = severanceFee + targetCoach.signingFee;

  if (userClub.finances.balance < totalDealCost) {
    return {
      success: false,
      feedbackText: `Saldo insuficiente em caixa. A rescisão (${formatCurrency(
        severanceFee
      )}) + luvas de ${targetCoach.name} (${formatCurrency(
        targetCoach.signingFee
      )}) exigem ${formatCurrency(totalDealCost)}.`,
      updatedState: state,
    };
  }

  // Return outgoing coach to free agent pool if they match a real profile
  const outgoingProfile = buildRealCoachProfileFromName(outgoingName, userClub);
  let nextFreePool = carousel.freeAgentCoaches.filter((c) => c.id !== targetCoach.id);
  if (
    outgoingName.trim().toLowerCase() !== targetCoach.name.trim().toLowerCase() &&
    !nextFreePool.some((c) => c.name.toLowerCase() === outgoingName.trim().toLowerCase())
  ) {
    nextFreePool = [outgoingProfile, ...nextFreePool];
  }

  const updatedClubs = state.clubs.map((c) => {
    if (c.id !== userClub.id) return c;
    return {
      ...c,
      managerName: targetCoach.name,
      tactics: {
        ...c.tactics,
        formation: targetCoach.preferredFormation,
        mentality: targetCoach.mentality,
        passing: targetCoach.passing,
      },
      finances: recordFinanceLedgerMutation(c.finances, {
        date: state.currentDate,
        category: 'STAFF_SCOUTS',
        type: 'EXPENSE',
        amount: totalDealCost,
        description: `Troca de Técnico: contratação de ${targetCoach.name} e rescisão`,
        applyToBalance: true,
      }),
    };
  });

  const movement: CoachMovementRecord = {
    id: `cmov_user_hire_${Date.now()}`,
    date: state.currentDate,
    round: state.currentRound,
    seasonYear: state.currentSeasonYear,
    clubId: userClub.id,
    clubName: userClub.name,
    clubDivision: userClub.division,
    sackedCoachName: outgoingName,
    hiredCoachName: targetCoach.name,
    severancePaid: totalDealCost,
    reason: 'Troca de comando definida pela presidência do clube',
    eventType: 'USER_HIRED_COACH',
  };

  const prevCareer = state.managerCareer;
  const closedStints: ManagerCareerStint[] = prevCareer
    ? prevCareer.careerStints.map((stint, idx) =>
        idx === 0 && stint.statusLabel === 'Cargo Atual'
          ? {
              ...stint,
              endDate: state.currentDate,
              statusLabel: 'Substituído pela Diretoria',
            }
          : stint
      )
    : [];

  const newStint: ManagerCareerStint = {
    id: `stint_${userClub.id}_coach_${Date.now()}`,
    clubId: userClub.id,
    clubName: userClub.name,
    clubColors: userClub.colors,
    divisionAtStart: userClub.division,
    startYear: state.currentSeasonYear,
    startDate: state.currentDate,
    matches: 0,
    wins: 0,
    draws: 0,
    losses: 0,
    trophiesWon: 0,
    statusLabel: 'Cargo Atual',
  };

  const inboxMsg: InboxMessage = {
    id: `msg_hire_coach_${Date.now()}`,
    title: `Novo Comandante: ${targetCoach.name} assume o ${userClub.name}!`,
    message: `A diretoria do ${userClub.name} oficializou a saída de ${outgoingName} e anunciou ${
      targetCoach.name
    } (${targetCoach.nationality}, ${targetCoach.styleLabel}). O esquema base foi ajustado para ${
      targetCoach.preferredFormation
    } e o investimento total entre rescisão e luvas foi de ${formatCurrency(totalDealCost)}.`,
    date: formatShortDate(state.currentDate),
    round: state.currentRound,
    read: false,
    type: 'BOARD',
  };

  const updatedState: GameSave = {
    ...state,
    managerName: targetCoach.name,
    saveName: `Patofoot - ${targetCoach.name}`,
    clubs: updatedClubs,
    inbox: [inboxMsg, ...state.inbox],
    managerCareer: prevCareer
      ? {
          ...prevCareer,
          boardConfidence: 78,
          fanConfidence: Math.min(95, Math.max(72, prevCareer.fanConfidence + 8)),
          managerReputation: Math.max(prevCareer.managerReputation, targetCoach.prestige),
          monthlySalary: targetCoach.monthlySalaryDemand,
          warningsIssued: 0,
          careerStints: [newStint, ...closedStints],
          lastEvaluationNote: `${targetCoach.name} apresentado oficialmente com amplo respaldo do conselho e da arquibancada.`,
        }
      : undefined,
    coachingCarousel: {
      clubCoachSecurity: {
        ...carousel.clubCoachSecurity,
        [userClub.id]: 78,
      },
      freeAgentCoaches: nextFreePool,
      movementHistory: [movement, ...carousel.movementHistory].slice(0, 80),
    },
  };

  return {
    success: true,
    feedbackText: `${targetCoach.name} assumiu o comando do ${userClub.name}! Esquema ${targetCoach.preferredFormation} (${targetCoach.styleLabel}) ativado.`,
    updatedState,
  };
}

/**
 * Permite ao treinador pedir demissão voluntariamente do clube atual
 * e receber convites imediatos do mercado para escolher o próximo destino.
 */
export function resignUserFromCurrentClub(state: GameSave): {
  updatedState: GameSave;
  offersCount: number;
} {
  const carousel = ensureCoachingCarouselState(state);
  const userClub = state.clubs.find((c) => c.id === state.userClubId);
  if (!userClub || !state.managerCareer) {
    return { updatedState: state, offersCount: 0 };
  }

  const userRep = state.managerCareer.managerReputation || 55;
  const candidateClubs = state.clubs
    .filter((c) => c.id !== userClub.id)
    .map((c) => {
      const clubTargetRep = c.reputation * 18;
      const diff = Math.abs(clubTargetRep - userRep);
      const sec = carousel.clubCoachSecurity[c.id] ?? 70;
      const sameCal = (c.division === 'EU') === (userClub.division === 'EU') ? -8 : 6;
      return { club: c, score: diff + sec * 0.35 + sameCal };
    })
    .sort((a, b) => a.score - b.score)
    .slice(0, 3);

  const generatedOffers: ManagerJobOffer[] = candidateClubs.map(({ club }, idx) => {
    const avgOvr = getClubSquadAvgOverall(club);
    const salary = computeManagerSalary(club, userRep);
    return {
      id: `offer_resign_${club.id}_${Date.now()}_${idx}`,
      clubId: club.id,
      clubName: club.name,
      clubShortName: club.shortName,
      clubDivision: club.division,
      clubReputation: club.reputation,
      clubSquadAvgOvr: avgOvr,
      clubColors: club.colors,
      transferBudgetPreview: Math.max(0, club.finances.balance),
      offeredMonthlySalary: salary,
      contractYears: 2,
      reason: `Convite imediato após sua saída de comum acordo do ${userClub.shortName}`,
      createdDate: formatShortDate(state.currentDate),
      expiresRound: state.currentRound + 5,
      status: 'PENDING',
    };
  });

  const movement: CoachMovementRecord = {
    id: `cmov_resign_${Date.now()}`,
    entityType: 'CLUB',
    date: state.currentDate,
    round: state.currentRound,
    seasonYear: state.currentSeasonYear,
    clubId: userClub.id,
    clubName: userClub.name,
    clubDivision: userClub.division,
    sackedCoachName: state.managerName,
    reason: 'Pedido de demissão oficializado pelo treinador',
    eventType: 'USER_RESIGNED',
  };

  const inboxMsg: InboxMessage = {
    id: `msg_resign_${Date.now()}`,
    title: `Entrevista Coletiva: Você entregou o cargo no ${userClub.shortName}`,
    message: `Você comunicou oficialmente sua saída do ${userClub.name}. Seu empresário já reuniu ${generatedOffers.length} propostas oficiais na mesa para você definir o próximo clube da carreira!`,
    date: formatShortDate(state.currentDate),
    round: state.currentRound,
    read: false,
    type: 'JOB_OFFER',
  };

  const updatedStints = state.managerCareer.careerStints.map((stint, idx) =>
    idx === 0 && stint.statusLabel === 'Cargo Atual'
      ? {
          ...stint,
          endDate: state.currentDate,
          statusLabel: 'Pediu Demissão' as const,
        }
      : stint
  );

  const updatedState: GameSave = {
    ...state,
    inbox: [inboxMsg, ...state.inbox],
    managerCareer: {
      ...state.managerCareer,
      careerStints: updatedStints,
      jobOffers: [
        ...generatedOffers,
        ...state.managerCareer.jobOffers.map((o) =>
          o.status === 'PENDING' ? { ...o, status: 'EXPIRED' as const } : o
        ),
      ].slice(0, 12),
    },
    coachingCarousel: {
      ...carousel,
      movementHistory: [movement, ...carousel.movementHistory].slice(0, 100),
    },
  };

  return {
    updatedState,
    offersCount: generatedOffers.length,
  };
}

/**
 * Permite ao treinador se candidatar diretamente a um clube cujo técnico está pressionado/na corda bamba.
 */
export function applyForClubCoachingJob(
  state: GameSave,
  targetClubId: string
): {
  accepted: boolean;
  feedbackText: string;
  updatedState: GameSave;
} {
  const carousel = ensureCoachingCarouselState(state);
  const targetClub = state.clubs.find((c) => c.id === targetClubId);
  const career = state.managerCareer;

  if (!targetClub || !career) {
    return {
      accepted: false,
      feedbackText: 'Clube ou carreira indisponível no momento.',
      updatedState: state,
    };
  }

  if (targetClub.id === state.userClubId) {
    return {
      accepted: false,
      feedbackText: 'Você já comanda este clube atualmente.',
      updatedState: state,
    };
  }

  const existingPending = career.jobOffers.find(
    (o) => o.clubId === targetClub.id && o.status === 'PENDING'
  );
  if (existingPending) {
    return {
      accepted: true,
      feedbackText: `O ${targetClub.name} já enviou uma proposta oficial que aguarda sua assinatura na aba Propostas!`,
      updatedState: state,
    };
  }

  const security = carousel.clubCoachSecurity[targetClub.id] ?? 72;
  if (security > 55) {
    return {
      accepted: false,
      feedbackText: `A diretoria do ${targetClub.name} informou que respalda o trabalho atual de ${targetClub.managerName} (estabilidade ${security}%).`,
      updatedState: state,
    };
  }

  const requiredRep = Math.max(30, targetClub.reputation * 16 - (55 - security) * 0.4);
  if (career.managerReputation < requiredRep) {
    return {
      accepted: false,
      feedbackText: `O conselho do ${targetClub.name} avaliou seu currículo (prestígio ${career.managerReputation}/100), mas busca um perfil com reputação mínima de ${Math.round(
        requiredRep
      )}/100.`,
      updatedState: state,
    };
  }

  const avgOvr = getClubSquadAvgOverall(targetClub);
  const salary = computeManagerSalary(targetClub, career.managerReputation || 55);

  const newOffer: ManagerJobOffer = {
    id: `offer_apply_${targetClub.id}_${Date.now()}`,
    clubId: targetClub.id,
    clubName: targetClub.name,
    clubShortName: targetClub.shortName,
    clubDivision: targetClub.division,
    clubReputation: targetClub.reputation,
    clubSquadAvgOvr: avgOvr,
    clubColors: targetClub.colors,
    transferBudgetPreview: Math.max(0, targetClub.finances.balance),
    offeredMonthlySalary: salary,
    contractYears: 2,
    reason: `Candidatura aprovada pela diretoria para substituir ${targetClub.managerName} (estabilidade ${security}%)`,
    createdDate: formatShortDate(state.currentDate),
    expiresRound: state.currentRound + 4,
    status: 'PENDING',
  };

  const inboxMsg: InboxMessage = {
    id: `msg_apply_success_${targetClub.id}_${Date.now()}`,
    title: `Proposta Oficial Recebida: ${targetClub.name} aprova seu nome!`,
    message: `Após sua sondagem, o presidente do ${targetClub.name} decidiu abrir negociação para substituir ${targetClub.managerName} e formalizou proposta oficial com salário de ${formatCurrency(
      salary
    )}/mês!`,
    date: formatShortDate(state.currentDate),
    round: state.currentRound,
    read: false,
    type: 'JOB_OFFER',
    jobOfferId: newOffer.id,
  };

  const updatedState: GameSave = {
    ...state,
    inbox: [inboxMsg, ...state.inbox],
    managerCareer: {
      ...career,
      jobOffers: [newOffer, ...career.jobOffers].slice(0, 12),
    },
  };

  return {
    accepted: true,
    feedbackText: `Sondagem bem-sucedida! O ${targetClub.name} enviou proposta oficial de ${formatCurrency(
      salary
    )}/mês na aba Propostas.`,
    updatedState,
  };
}

/**
 * Sincroniza o registro da Dança das Cadeiras quando o usuário aceita proposta de outro clube,
 * colocando um treinador real livre no clube anterior.
 */
export function syncCarouselAfterUserClubSwitch(
  prevState: GameSave,
  nextState: GameSave,
  leftReason: string
): GameSave {
  const prevCarousel = ensureCoachingCarouselState(prevState);
  const oldClubId = prevState.userClubId;
  const newClubId = nextState.userClubId;
  if (oldClubId === newClubId) return nextState;

  const oldClub = nextState.clubs.find((c) => c.id === oldClubId);
  const newClubPrev = prevState.clubs.find((c) => c.id === newClubId);

  let freePool = [...prevCarousel.freeAgentCoaches];

  // Pick a real free agent coach for the old club left by the user
  let hiredForOldClub: RealCoachProfile | undefined;
  if (oldClub && freePool.length > 0) {
    const targetPrestige =
      oldClub.division === 'EU' || oldClub.division === 'WL'
        ? Math.min(92, 68 + oldClub.reputation * 4)
        : oldClub.division === 'A' || oldClub.division === 'SA'
        ? 83
        : oldClub.division === 'B'
        ? 75
        : 70;
    const sorted = [...freePool].sort(
      (a, b) => Math.abs(a.prestige - targetPrestige) - Math.abs(b.prestige - targetPrestige)
    );
    hiredForOldClub = sorted[0];
    freePool = freePool.filter((c) => c.id !== hiredForOldClub!.id);
  }

  // Put displaced coach from new club into free agent pool
  if (newClubPrev && newClubPrev.managerName) {
    const displacedProfile = buildRealCoachProfileFromName(newClubPrev.managerName, newClubPrev);
    if (!freePool.some((c) => c.name.toLowerCase() === displacedProfile.name.toLowerCase())) {
      freePool.push(displacedProfile);
    }
  }

  const updatedClubs = nextState.clubs.map((c) => {
    if (c.id === oldClubId && hiredForOldClub) {
      return {
        ...c,
        managerName: hiredForOldClub.name,
        tactics: {
          ...c.tactics,
          formation: hiredForOldClub.preferredFormation,
          mentality: hiredForOldClub.mentality,
          passing: hiredForOldClub.passing,
        },
      };
    }
    return c;
  });

  // Ensure new club goals stay crisp (passing all cup fixtures!)
  const targetClubUpdated = updatedClubs.find((c) => c.id === newClubId);
  const refreshedGoals =
    targetClubUpdated && nextState.managerCareer
      ? generateBoardSeasonGoals(
          targetClubUpdated,
          updatedClubs,
          nextState.currentSeasonYear,
          nextState.fixturesCopaBrasil,
          nextState.fixturesLibertadores,
          nextState.fixturesSulamericana,
          nextState.fixturesChampionsLeague,
          nextState.fixturesEuropaLeague,
          nextState.fixturesConferenceLeague,
          nextState.fixturesCopaInternacional,
          nextState.fixturesConcacafChampions,
          nextState.fixturesAfcChampions
        )
      : nextState.managerCareer?.seasonGoals || [];

  const movements: CoachMovementRecord[] = [];
  if (newClubPrev) {
    movements.push({
      id: `cmov_user_app_${newClubId}_${Date.now()}`,
      entityType: 'CLUB',
      date: nextState.currentDate,
      round: nextState.currentRound,
      seasonYear: nextState.currentSeasonYear,
      clubId: newClubId,
      clubName: newClubPrev.name,
      clubDivision: newClubPrev.division,
      sackedCoachName: newClubPrev.managerName,
      hiredCoachName: nextState.managerName,
      reason: `Apresentação oficial (${leftReason})`,
      eventType: 'USER_APPOINTED',
    });
  }
  if (oldClub && hiredForOldClub) {
    movements.push({
      id: `cmov_old_fill_${oldClubId}_${Date.now() + 1}`,
      entityType: 'CLUB',
      date: nextState.currentDate,
      round: nextState.currentRound,
      seasonYear: nextState.currentSeasonYear,
      clubId: oldClubId,
      clubName: oldClub.name,
      clubDivision: oldClub.division,
      sackedCoachName: prevState.managerName,
      hiredCoachName: hiredForOldClub.name,
      reason:
        leftReason === 'Demitido pela Diretoria'
          ? `Demissão de ${prevState.managerName} · reposição imediata da diretoria`
          : `Reposição imediata após saída de ${prevState.managerName}`,
      eventType: leftReason === 'Demitido pela Diretoria' ? 'USER_SACKED' : 'SACKED_AND_HIRED',
    });
  }

  return {
    ...nextState,
    clubs: updatedClubs,
    managerCareer: nextState.managerCareer
      ? {
          ...nextState.managerCareer,
          seasonGoals: refreshedGoals,
        }
      : undefined,
    coachingCarousel: {
      clubCoachSecurity: {
        ...prevCarousel.clubCoachSecurity,
        [oldClubId]: 75,
        [newClubId]: 76,
      },
      freeAgentCoaches: freePool,
      movementHistory: [...movements, ...prevCarousel.movementHistory].slice(0, 100),
    },
  };
}
