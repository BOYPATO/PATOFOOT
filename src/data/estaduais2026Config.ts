import { Club } from '../types/game';

export type BrazilianStateUF =
  | 'SP'
  | 'RJ'
  | 'MG'
  | 'RS'
  | 'PR'
  | 'SC'
  | 'BA'
  | 'PE'
  | 'CE'
  | 'RN'
  | 'GO'
  | 'PA'
  | 'AL'
  | 'PB'
  | 'SE'
  | 'MA'
  | 'PI'
  | 'MT'
  | 'MS'
  | 'DF'
  | 'ES'
  | 'AM'
  | 'TO'
  | 'AC'
  | 'RO'
  | 'RR'
  | 'AP';

export type EstadualKey =
  | 'paulistao'
  | 'carioca'
  | 'mineiro'
  | 'gaucho'
  | 'paranaense'
  | 'catarinense'
  | 'baiano'
  | 'pernambucano'
  | 'cearense'
  | 'potiguar'
  | 'goiano'
  | 'paraense'
  | 'alagoano'
  | 'paraibano'
  | 'sergipano'
  | 'maranhense'
  | 'piauiense'
  | 'matogrossense'
  | 'sulmatogrossense'
  | 'brasiliense'
  | 'capixaba'
  | 'amazonense'
  | 'tocantinense'
  | 'acreano'
  | 'rondoniense'
  | 'roraimense'
  | 'amapaense';

export type BrazilianMacroRegion = 'Sudeste' | 'Sul' | 'Nordeste' | 'Centro-Oeste' | 'Norte';

export type EstadualFirstPhaseModel =
  | 'SINGLE_ROUND_ROBIN'
  | 'TWO_GROUPS_CROSS'
  | 'THREE_GROUPS_CROSS_8R'
  | 'TWO_GROUPS_FULL_7R'
  | 'SINGLE_TABLE_POT_8R';

export type EstadualKnockoutModel =
  | 'TOP8_OVERALL_QF'
  | 'TOP4_PER_GROUP_QF'
  | 'THREE_GROUPS_BEST2_SF'
  | 'TOP2_BYE_3TO6_QF'
  | 'TWO_GROUPS_TOP1_BYE_2TO3_QF'
  | 'TOP1_BYE_2TO7_QF'
  | 'TOP4_OVERALL_SF';

export interface EstadualCompetitionConfig {
  key: EstadualKey;
  uf: BrazilianStateUF;
  name: string;
  shortName: string;
  federation: string;
  region: BrazilianMacroRegion;
  clubsCount: number;
  firstPhaseRounds: number;
  firstPhaseModel: EstadualFirstPhaseModel;
  knockoutModel: EstadualKnockoutModel;
  crossGroupQuarterfinals?: boolean;
  groups?: Array<{ groupLabel: string; clubIds: string[] }>;
  qfLegs: 0 | 1 | 2;
  sfLegs: 1 | 2;
  finalLegs: 1 | 2;
  finalStadiumName?: string;
  defaultClubIds: string[];
  formatSummary: string;
  championPrize: number;
  runnerUpPrize: number;
  rnfRank: number;
  serieDSpots: number;
  copaBrasilSpots: number;
  copaNordesteSpots: number;
  copaVerdeSpots: number;
  copaVerdeBlock?: 'Norte' | 'Centro-Oeste';
  copaSulSudesteSpots: number;
}

export const ESTADUAIS_2026_CONFIG: EstadualCompetitionConfig[] = [
  {
    key: 'paulistao',
    uf: 'SP',
    name: 'Campeonato Paulista',
    shortName: 'Paulistão',
    federation: 'FPF',
    region: 'Sudeste',
    clubsCount: 16,
    firstPhaseRounds: 8,
    firstPhaseModel: 'SINGLE_TABLE_POT_8R',
    knockoutModel: 'TOP8_OVERALL_QF',
    qfLegs: 1,
    sfLegs: 1,
    finalLegs: 2,
    finalStadiumName: 'Estádio do Pacaembu (São Paulo)',
    defaultClubIds: [
      'pal', 'cor', 'sao', 'san', 'rbb', 'mir',
      'nov', 'pon', 'bsp', 'sbe',
      'gua', 'afe', 'itu', 'lim',
      'por', 'ags',
    ],
    formatSummary: '16 clubes · 8 rodadas · Top 8 Quartas (Jogo Único) · Semifinal (Jogo Único) · Final Ida e Volta',
    championPrize: 5_000_000,
    runnerUpPrize: 2_200_000,
    rnfRank: 1,
    serieDSpots: 4,
    copaBrasilSpots: 6,
    copaNordesteSpots: 0,
    copaVerdeSpots: 0,
    copaSulSudesteSpots: 2,
  },
  {
    key: 'carioca',
    uf: 'RJ',
    name: 'Campeonato Carioca',
    shortName: 'Carioca',
    federation: 'FERJ',
    region: 'Sudeste',
    clubsCount: 12,
    firstPhaseRounds: 6,
    firstPhaseModel: 'TWO_GROUPS_CROSS',
    knockoutModel: 'TOP4_PER_GROUP_QF',
    crossGroupQuarterfinals: false,
    groups: [
      { groupLabel: 'Grupo A', clubIds: ['fla', 'vas', 'vre', 'nig', 'mad', 'rj_ban'] },
      { groupLabel: 'Grupo B', clubIds: ['bot', 'flu', 'prj', 'boa', 'mrc', 'srj'] },
    ],
    qfLegs: 1,
    sfLegs: 2,
    finalLegs: 1,
    finalStadiumName: 'Estádio do Maracanã (Rio de Janeiro)',
    defaultClubIds: ['fla', 'bot', 'flu', 'vas', 'vre', 'nig', 'prj', 'mad', 'boa', 'rj_ban', 'mrc', 'srj'],
    formatSummary: '12 clubes em 2 grupos cruzados (6 rodadas) · Quartas (Jogo Único) · Semifinal (Ida e Volta) · Final no Maracanã',
    championPrize: 4_500_000,
    runnerUpPrize: 2_000_000,
    rnfRank: 2,
    serieDSpots: 3,
    copaBrasilSpots: 6,
    copaNordesteSpots: 0,
    copaVerdeSpots: 0,
    copaSulSudesteSpots: 2,
  },
  {
    key: 'mineiro',
    uf: 'MG',
    name: 'Campeonato Mineiro',
    shortName: 'Mineiro',
    federation: 'FMF',
    region: 'Sudeste',
    clubsCount: 12,
    firstPhaseRounds: 8,
    firstPhaseModel: 'THREE_GROUPS_CROSS_8R',
    knockoutModel: 'THREE_GROUPS_BEST2_SF',
    groups: [
      { groupLabel: 'Grupo A', clubIds: ['cam', 'ath', 'tom', 'itb'] },
      { groupLabel: 'Grupo B', clubIds: ['cru', 'pou', 'ube', 'bet'] },
      { groupLabel: 'Grupo C', clubIds: ['ame', 'vnm', 'dgv', 'urt'] },
    ],
    qfLegs: 0,
    sfLegs: 2,
    finalLegs: 1,
    finalStadiumName: 'Estádio do Mineirão (Belo Horizonte)',
    defaultClubIds: ['cam', 'cru', 'ame', 'ath', 'tom', 'pou', 'ube', 'vnm', 'dgv', 'bet', 'itb', 'urt'],
    formatSummary: '12 clubes em 3 grupos cruzados (8 rodadas) · Líderes + melhor 2º nas Semifinais · Final no Mineirão',
    championPrize: 3_800_000,
    runnerUpPrize: 1_700_000,
    rnfRank: 3,
    serieDSpots: 3,
    copaBrasilSpots: 5,
    copaNordesteSpots: 0,
    copaVerdeSpots: 0,
    copaSulSudesteSpots: 2,
  },
  {
    key: 'gaucho',
    uf: 'RS',
    name: 'Campeonato Gaúcho',
    shortName: 'Gauchão',
    federation: 'FGF',
    region: 'Sul',
    clubsCount: 12,
    firstPhaseRounds: 6,
    firstPhaseModel: 'TWO_GROUPS_CROSS',
    knockoutModel: 'TOP4_PER_GROUP_QF',
    crossGroupQuarterfinals: true,
    groups: [
      { groupLabel: 'Grupo A', clubIds: ['gre', 'juv', 'ypi', 'sjr', 'pel', 'rs_slu'] },
      { groupLabel: 'Grupo B', clubIds: ['int', 'cax', 'bpe', 'ave', 'nha', 'gba'] },
    ],
    qfLegs: 1,
    sfLegs: 2,
    finalLegs: 2,
    defaultClubIds: ['gre', 'int', 'juv', 'cax', 'ypi', 'bpe', 'sjr', 'ave', 'pel', 'nha', 'rs_slu', 'gba'],
    formatSummary: '12 clubes em 2 grupos cruzados (6 rodadas) · Quartas (Jogo Único) · Semifinal e Final em Ida e Volta',
    championPrize: 3_500_000,
    runnerUpPrize: 1_600_000,
    rnfRank: 4,
    serieDSpots: 3,
    copaBrasilSpots: 5,
    copaNordesteSpots: 0,
    copaVerdeSpots: 0,
    copaSulSudesteSpots: 2,
  },
  {
    key: 'paranaense',
    uf: 'PR',
    name: 'Campeonato Paranaense',
    shortName: 'Paranaense',
    federation: 'FPF-PR',
    region: 'Sul',
    clubsCount: 12,
    firstPhaseRounds: 6,
    firstPhaseModel: 'TWO_GROUPS_CROSS',
    knockoutModel: 'TOP4_PER_GROUP_QF',
    crossGroupQuarterfinals: false,
    groups: [
      { groupLabel: 'Grupo A', clubIds: ['cap', 'ope', 'mga', 'cas', 'azu', 'and'] },
      { groupLabel: 'Grupo B', clubIds: ['cfc', 'lon', 'prc', 'cia', 'sjs', 'rbp'] },
    ],
    qfLegs: 2,
    sfLegs: 2,
    finalLegs: 2,
    defaultClubIds: ['cap', 'cfc', 'ope', 'lon', 'mga', 'prc', 'cas', 'cia', 'azu', 'sjs', 'and', 'rbp'],
    formatSummary: '12 clubes em 2 grupos (6 rodadas) · Quartas, Semifinal e Final em Ida e Volta',
    championPrize: 2_600_000,
    runnerUpPrize: 1_200_000,
    rnfRank: 5,
    serieDSpots: 3,
    copaBrasilSpots: 5,
    copaNordesteSpots: 0,
    copaVerdeSpots: 0,
    copaSulSudesteSpots: 2,
  },
  {
    key: 'catarinense',
    uf: 'SC',
    name: 'Campeonato Catarinense',
    shortName: 'Catarinense',
    federation: 'FCF',
    region: 'Sul',
    clubsCount: 12,
    firstPhaseRounds: 6,
    firstPhaseModel: 'TWO_GROUPS_CROSS',
    knockoutModel: 'TOP4_PER_GROUP_QF',
    crossGroupQuarterfinals: true,
    groups: [
      { groupLabel: 'Grupo A', clubIds: ['cha', 'ava', 'bru', 'joi', 'hlu', 'cvg'] },
      { groupLabel: 'Grupo B', clubIds: ['cri', 'fig', 'bar', 'mdi', 'ccd', 'sca'] },
    ],
    qfLegs: 2,
    sfLegs: 2,
    finalLegs: 2,
    defaultClubIds: ['cha', 'cri', 'ava', 'fig', 'bru', 'bar', 'joi', 'mdi', 'hlu', 'ccd', 'cvg', 'sca'],
    formatSummary: '12 clubes em 2 grupos cruzados (6 rodadas) · Quartas, Semifinal e Final em Ida e Volta',
    championPrize: 2_200_000,
    runnerUpPrize: 1_000_000,
    rnfRank: 8,
    serieDSpots: 3,
    copaBrasilSpots: 4,
    copaNordesteSpots: 0,
    copaVerdeSpots: 0,
    copaSulSudesteSpots: 2,
  },
  {
    key: 'baiano',
    uf: 'BA',
    name: 'Campeonato Baiano',
    shortName: 'Baianão',
    federation: 'FBF',
    region: 'Nordeste',
    clubsCount: 10,
    firstPhaseRounds: 9,
    firstPhaseModel: 'SINGLE_ROUND_ROBIN',
    knockoutModel: 'TOP4_OVERALL_SF',
    qfLegs: 0,
    sfLegs: 1,
    finalLegs: 1,
    finalStadiumName: 'Arena Fonte Nova (Salvador)',
    defaultClubIds: ['bah', 'vit', 'jua', 'jac', 'aal', 'bfe', 'jeq', 'bil', 'pba', 'vco'],
    formatSummary: '10 clubes · Turno único (9 rodadas) · Top 4 Semifinal e Final em Jogo Único',
    championPrize: 2_400_000,
    runnerUpPrize: 1_100_000,
    rnfRank: 9,
    serieDSpots: 3,
    copaBrasilSpots: 4,
    copaNordesteSpots: 3,
    copaVerdeSpots: 0,
    copaSulSudesteSpots: 0,
  },
  {
    key: 'pernambucano',
    uf: 'PE',
    name: 'Campeonato Pernambucano',
    shortName: 'Pernambucano',
    federation: 'FPF-PE',
    region: 'Nordeste',
    clubsCount: 10,
    firstPhaseRounds: 7,
    firstPhaseModel: 'SINGLE_ROUND_ROBIN',
    knockoutModel: 'TOP2_BYE_3TO6_QF',
    qfLegs: 1,
    sfLegs: 2,
    finalLegs: 2,
    defaultClubIds: ['spo', 'nau', 'stc', 'ret', 'cen', 'pet', 'mgy', 'afo', 'sal', 'dec'],
    formatSummary: '10 clubes · 7 rodadas · Top 2 direto na Semi, 3º–6º nas Quartas · Semifinal e Final Ida e Volta',
    championPrize: 2_100_000,
    runnerUpPrize: 950_000,
    rnfRank: 10,
    serieDSpots: 2,
    copaBrasilSpots: 4,
    copaNordesteSpots: 2,
    copaVerdeSpots: 0,
    copaSulSudesteSpots: 0,
  },
  {
    key: 'cearense',
    uf: 'CE',
    name: 'Campeonato Cearense',
    shortName: 'Cearense',
    federation: 'FCF-CE',
    region: 'Nordeste',
    clubsCount: 10,
    firstPhaseRounds: 5,
    firstPhaseModel: 'TWO_GROUPS_CROSS',
    knockoutModel: 'TWO_GROUPS_TOP1_BYE_2TO3_QF',
    groups: [
      { groupLabel: 'Grupo A', clubIds: ['for', 'fer', 'est_ce_mar', 'est_ce_hcr', 'est_ce_tir'] },
      { groupLabel: 'Grupo B', clubIds: ['cea', 'flo', 'igu', 'est_ce_cau', 'est_ce_qui'] },
    ],
    qfLegs: 1,
    sfLegs: 2,
    finalLegs: 2,
    defaultClubIds: ['for', 'cea', 'flo', 'fer', 'igu', 'est_ce_mar', 'est_ce_cau', 'est_ce_hcr', 'est_ce_qui', 'est_ce_tir'],
    formatSummary: '10 clubes em 2 grupos cruzados (5 rodadas) · Líderes na Semi e 2º/3º nas Quartas · Final Ida e Volta',
    championPrize: 2_100_000,
    runnerUpPrize: 950_000,
    rnfRank: 6,
    serieDSpots: 3,
    copaBrasilSpots: 4,
    copaNordesteSpots: 3,
    copaVerdeSpots: 0,
    copaSulSudesteSpots: 0,
  },
  {
    key: 'potiguar',
    uf: 'RN',
    name: 'Campeonato Potiguar',
    shortName: 'Potiguar',
    federation: 'FNF',
    region: 'Nordeste',
    clubsCount: 12,
    firstPhaseRounds: 11,
    firstPhaseModel: 'SINGLE_ROUND_ROBIN',
    knockoutModel: 'TOP8_OVERALL_QF',
    qfLegs: 2,
    sfLegs: 2,
    finalLegs: 2,
    defaultClubIds: [
      'abc', 'arn', 'rn_scn', 'rn_lag', 'rn_pot', 'rn_glo',
      'rn_brn', 'rn_qfc', 'rn_pcn', 'rn_ale', 'rn_ass', 'rn_mos',
    ],
    formatSummary: '12 clubes oficiais (FNF) · 11 rodadas em turno único · Top 8 Quartas, Semifinal e Final em Ida e Volta',
    championPrize: 1_500_000,
    runnerUpPrize: 700_000,
    rnfRank: 15,
    serieDSpots: 2,
    copaBrasilSpots: 3,
    copaNordesteSpots: 2,
    copaVerdeSpots: 0,
    copaSulSudesteSpots: 0,
  },
  {
    key: 'goiano',
    uf: 'GO',
    name: 'Campeonato Goiano',
    shortName: 'Goianão',
    federation: 'FGF-GO',
    region: 'Centro-Oeste',
    clubsCount: 12,
    firstPhaseRounds: 8,
    firstPhaseModel: 'SINGLE_TABLE_POT_8R',
    knockoutModel: 'TOP8_OVERALL_QF',
    qfLegs: 2,
    sfLegs: 2,
    finalLegs: 2,
    defaultClubIds: ['goi', 'acg', 'vil', 'ana', 'apa', 'gna', 'gtb', 'cra', 'anp', 'jat', 'inh', 'abe'],
    formatSummary: '12 clubes · 8 rodadas · Top 8 Quartas, Semifinal e Final em Ida e Volta',
    championPrize: 2_000_000,
    runnerUpPrize: 900_000,
    rnfRank: 7,
    serieDSpots: 3,
    copaBrasilSpots: 4,
    copaNordesteSpots: 0,
    copaVerdeSpots: 3,
    copaVerdeBlock: 'Centro-Oeste',
    copaSulSudesteSpots: 0,
  },
  {
    key: 'paraense',
    uf: 'PA',
    name: 'Campeonato Paraense',
    shortName: 'Parazão',
    federation: 'FPF-PA',
    region: 'Norte',
    clubsCount: 12,
    firstPhaseRounds: 6,
    firstPhaseModel: 'TWO_GROUPS_CROSS',
    knockoutModel: 'TOP8_OVERALL_QF',
    groups: [
      { groupLabel: 'Grupo A', clubIds: ['rem', 'agm', 'cst', 'sfp', 'est_pa_bra', 'est_pa_cap'] },
      { groupLabel: 'Grupo B', clubIds: ['pay', 'cmt', 'tun', 'bpa', 'ipa', 'est_pa_sfc'] },
    ],
    qfLegs: 1,
    sfLegs: 1,
    finalLegs: 2,
    defaultClubIds: [
      'rem', 'pay', 'agm', 'cmt', 'cst', 'tun', 'bpa', 'sfp', 'ipa',
      'est_pa_bra', 'est_pa_cap', 'est_pa_sfc',
    ],
    formatSummary: '12 clubes em 2 grupos cruzados (6 rodadas) · Top 8 Quartas, Semifinal e Final Ida e Volta',
    championPrize: 1_800_000,
    runnerUpPrize: 850_000,
    rnfRank: 12,
    serieDSpots: 2,
    copaBrasilSpots: 4,
    copaNordesteSpots: 0,
    copaVerdeSpots: 3,
    copaVerdeBlock: 'Norte',
    copaSulSudesteSpots: 0,
  },
  {
    key: 'alagoano',
    uf: 'AL',
    name: 'Campeonato Alagoano',
    shortName: 'Alagoano',
    federation: 'FAF',
    region: 'Nordeste',
    clubsCount: 8,
    firstPhaseRounds: 7,
    firstPhaseModel: 'SINGLE_ROUND_ROBIN',
    knockoutModel: 'TOP4_OVERALL_SF',
    qfLegs: 0,
    sfLegs: 2,
    finalLegs: 2,
    defaultClubIds: ['crb', 'csa', 'asa', 'est_al_pen', 'est_al_mur', 'est_al_cse', 'est_al_cor', 'est_al_ceo'],
    formatSummary: '8 clubes · Turno único (7 rodadas) · Top 4 Semifinal e Final Ida e Volta',
    championPrize: 1_300_000,
    runnerUpPrize: 600_000,
    rnfRank: 11,
    serieDSpots: 2,
    copaBrasilSpots: 4,
    copaNordesteSpots: 2,
    copaVerdeSpots: 0,
    copaSulSudesteSpots: 0,
  },
  {
    key: 'paraibano',
    uf: 'PB',
    name: 'Campeonato Paraibano',
    shortName: 'Paraibano',
    federation: 'FPF-PB',
    region: 'Nordeste',
    clubsCount: 10,
    firstPhaseRounds: 9,
    firstPhaseModel: 'SINGLE_ROUND_ROBIN',
    knockoutModel: 'TOP4_OVERALL_SF',
    qfLegs: 0,
    sfLegs: 2,
    finalLegs: 2,
    defaultClubIds: [
      'bpb', 'trz', 'sou', 'cmp',
      'est_pb_nac', 'est_pb_atp', 'est_pb_ser', 'est_pb_pob', 'est_pb_aut', 'est_pb_esp',
    ],
    formatSummary: '10 clubes · Turno único (9 rodadas) · Top 4 Semifinal e Final Ida e Volta',
    championPrize: 1_200_000,
    runnerUpPrize: 550_000,
    rnfRank: 16,
    serieDSpots: 2,
    copaBrasilSpots: 3,
    copaNordesteSpots: 2,
    copaVerdeSpots: 0,
    copaSulSudesteSpots: 0,
  },
  {
    key: 'sergipano',
    uf: 'SE',
    name: 'Campeonato Sergipano',
    shortName: 'Sergipano',
    federation: 'FSF',
    region: 'Nordeste',
    clubsCount: 10,
    firstPhaseRounds: 9,
    firstPhaseModel: 'SINGLE_ROUND_ROBIN',
    knockoutModel: 'TOP2_BYE_3TO6_QF',
    qfLegs: 1,
    sfLegs: 2,
    finalLegs: 2,
    defaultClubIds: [
      'con', 'ita', 'ser',
      'est_se_lag', 'est_se_fse', 'est_se_dor', 'est_se_ame', 'est_se_gua', 'est_se_atl', 'est_se_car',
    ],
    formatSummary: '10 clubes · Turno único (9 rodadas) · Mata-Mata (6 clubes) e Final Ida e Volta',
    championPrize: 1_100_000,
    runnerUpPrize: 500_000,
    rnfRank: 18,
    serieDSpots: 2,
    copaBrasilSpots: 3,
    copaNordesteSpots: 2,
    copaVerdeSpots: 0,
    copaSulSudesteSpots: 0,
  },
  {
    key: 'maranhense',
    uf: 'MA',
    name: 'Campeonato Maranhense',
    shortName: 'Maranhense',
    federation: 'FMF-MA',
    region: 'Nordeste',
    clubsCount: 8,
    firstPhaseRounds: 7,
    firstPhaseModel: 'SINGLE_ROUND_ROBIN',
    knockoutModel: 'TOP4_OVERALL_SF',
    qfLegs: 0,
    sfLegs: 2,
    finalLegs: 2,
    defaultClubIds: ['mar', 'sam', 'est_ma_mot', 'est_ma_imp', 'est_ma_cor', 'est_ma_pnh', 'est_ma_iad', 'est_ma_tnt'],
    formatSummary: '8 clubes · Turno único (7 rodadas) · Top 4 Semifinal e Final Ida e Volta',
    championPrize: 1_100_000,
    runnerUpPrize: 500_000,
    rnfRank: 17,
    serieDSpots: 2,
    copaBrasilSpots: 3,
    copaNordesteSpots: 2,
    copaVerdeSpots: 0,
    copaSulSudesteSpots: 0,
  },
  {
    key: 'piauiense',
    uf: 'PI',
    name: 'Campeonato Piauiense',
    shortName: 'Piauiense',
    federation: 'FFP',
    region: 'Nordeste',
    clubsCount: 8,
    firstPhaseRounds: 7,
    firstPhaseModel: 'SINGLE_ROUND_ROBIN',
    knockoutModel: 'TOP4_OVERALL_SF',
    qfLegs: 0,
    sfLegs: 2,
    finalLegs: 2,
    defaultClubIds: ['alt', 'est_pi_riv', 'est_pi_par', 'est_pi_fla', 'est_pi_4de', 'est_pi_oec', 'est_pi_cap', 'est_pi_cor'],
    formatSummary: '8 clubes · Turno único (7 rodadas) · Top 4 Semifinal e Final Ida e Volta',
    championPrize: 950_000,
    runnerUpPrize: 450_000,
    rnfRank: 20,
    serieDSpots: 2,
    copaBrasilSpots: 3,
    copaNordesteSpots: 2,
    copaVerdeSpots: 0,
    copaSulSudesteSpots: 0,
  },
  {
    key: 'matogrossense',
    uf: 'MT',
    name: 'Campeonato Mato-Grossense',
    shortName: 'Mato-Grossense',
    federation: 'FMF-MT',
    region: 'Centro-Oeste',
    clubsCount: 10,
    firstPhaseRounds: 9,
    firstPhaseModel: 'SINGLE_ROUND_ROBIN',
    knockoutModel: 'TOP2_BYE_3TO6_QF',
    qfLegs: 2,
    sfLegs: 2,
    finalLegs: 2,
    defaultClubIds: [
      'cui', 'luv', 'mix',
      'est_mt_uoo', 'est_mt_nov', 'est_mt_sin', 'est_mt_dom', 'est_mt_aca', 'est_mt_cei', 'est_mt_opo',
    ],
    formatSummary: '10 clubes · Turno único (9 rodadas) · Top 2 na Semi, 3º–6º nas Quartas · Final Ida e Volta',
    championPrize: 1_500_000,
    runnerUpPrize: 700_000,
    rnfRank: 13,
    serieDSpots: 2,
    copaBrasilSpots: 4,
    copaNordesteSpots: 0,
    copaVerdeSpots: 2,
    copaVerdeBlock: 'Centro-Oeste',
    copaSulSudesteSpots: 0,
  },
  {
    key: 'sulmatogrossense',
    uf: 'MS',
    name: 'Campeonato Sul-Mato-Grossense',
    shortName: 'Sul-Mato-Grossense',
    federation: 'FFMS',
    region: 'Centro-Oeste',
    clubsCount: 10,
    firstPhaseRounds: 9,
    firstPhaseModel: 'SINGLE_ROUND_ROBIN',
    knockoutModel: 'TOP8_OVERALL_QF',
    qfLegs: 2,
    sfLegs: 2,
    finalLegs: 2,
    defaultClubIds: [
      'oms', 'est_ms_cos', 'est_ms_dou', 'est_ms_agu', 'est_ms_cor',
      'est_ms_nav', 'est_ms_ivr', 'est_ms_ppr', 'est_ms_cra', 'est_ms_cem',
    ],
    formatSummary: '10 clubes · Turno único (9 rodadas) · Top 8 Quartas, Semifinal e Final Ida e Volta',
    championPrize: 900_000,
    runnerUpPrize: 420_000,
    rnfRank: 26,
    serieDSpots: 2,
    copaBrasilSpots: 3,
    copaNordesteSpots: 0,
    copaVerdeSpots: 1,
    copaVerdeBlock: 'Centro-Oeste',
    copaSulSudesteSpots: 0,
  },
  {
    key: 'brasiliense',
    uf: 'DF',
    name: 'Campeonato Brasiliense',
    shortName: 'Candangão',
    federation: 'FFDF',
    region: 'Centro-Oeste',
    clubsCount: 10,
    firstPhaseRounds: 9,
    firstPhaseModel: 'SINGLE_ROUND_ROBIN',
    knockoutModel: 'TOP4_OVERALL_SF',
    qfLegs: 0,
    sfLegs: 2,
    finalLegs: 1,
    finalStadiumName: 'Arena BRB Mané Garrincha (Brasília)',
    defaultClubIds: [
      'bsb', 'gam', 'cei',
      'est_df_cap', 'est_df_sam', 'est_df_par', 'est_df_rea', 'est_df_bra', 'est_df_cel', 'est_df_sob',
    ],
    formatSummary: '10 clubes · Turno único (9 rodadas) · Top 4 Semifinal Ida e Volta · Final no Mané Garrincha',
    championPrize: 1_300_000,
    runnerUpPrize: 600_000,
    rnfRank: 19,
    serieDSpots: 2,
    copaBrasilSpots: 3,
    copaNordesteSpots: 0,
    copaVerdeSpots: 2,
    copaVerdeBlock: 'Centro-Oeste',
    copaSulSudesteSpots: 0,
  },
  {
    key: 'capixaba',
    uf: 'ES',
    name: 'Campeonato Capixaba',
    shortName: 'Capixabão',
    federation: 'FES',
    region: 'Sudeste',
    clubsCount: 10,
    firstPhaseRounds: 9,
    firstPhaseModel: 'SINGLE_ROUND_ROBIN',
    knockoutModel: 'TOP8_OVERALL_QF',
    qfLegs: 2,
    sfLegs: 2,
    finalLegs: 2,
    defaultClubIds: [
      'rbr', 'des',
      'est_es_ser', 'est_es_pno', 'est_es_cap', 'est_es_nov', 'est_es_rea', 'est_es_vil', 'est_es_est', 'est_es_lin',
    ],
    formatSummary: '10 clubes · Turno único (9 rodadas) · Top 8 Quartas, Semifinal e Final Ida e Volta',
    championPrize: 1_050_000,
    runnerUpPrize: 480_000,
    rnfRank: 21,
    serieDSpots: 2,
    copaBrasilSpots: 3,
    copaNordesteSpots: 0,
    copaVerdeSpots: 2,
    copaVerdeBlock: 'Centro-Oeste',
    copaSulSudesteSpots: 0,
  },
  {
    key: 'amazonense',
    uf: 'AM',
    name: 'Campeonato Amazonense',
    shortName: 'Barezão',
    federation: 'FAF-AM',
    region: 'Norte',
    clubsCount: 8,
    firstPhaseRounds: 7,
    firstPhaseModel: 'TWO_GROUPS_FULL_7R',
    knockoutModel: 'TOP1_BYE_2TO7_QF',
    groups: [
      { groupLabel: 'Grupo A', clubIds: ['ama', 'man', 'tap', 'est_am_pri'] },
      { groupLabel: 'Grupo B', clubIds: ['am_fas', 'nam', 'srs', 'est_am_rni'] },
    ],
    qfLegs: 1,
    sfLegs: 2,
    finalLegs: 1,
    finalStadiumName: 'Arena da Amazônia (Manaus)',
    defaultClubIds: ['ama', 'man', 'nam', 'am_fas', 'tap', 'srs', 'est_am_pri', 'est_am_rni'],
    formatSummary: '8 clubes · 7 rodadas · Líder na Semi + 2º–7º nas Quartas · Final na Arena da Amazônia',
    championPrize: 1_250_000,
    runnerUpPrize: 580_000,
    rnfRank: 14,
    serieDSpots: 2,
    copaBrasilSpots: 4,
    copaNordesteSpots: 0,
    copaVerdeSpots: 2,
    copaVerdeBlock: 'Norte',
    copaSulSudesteSpots: 0,
  },
  {
    key: 'tocantinense',
    uf: 'TO',
    name: 'Campeonato Tocantinense',
    shortName: 'Tocantinense',
    federation: 'FTF',
    region: 'Norte',
    clubsCount: 8,
    firstPhaseRounds: 7,
    firstPhaseModel: 'SINGLE_ROUND_ROBIN',
    knockoutModel: 'TOP4_OVERALL_SF',
    qfLegs: 0,
    sfLegs: 2,
    finalLegs: 2,
    defaultClubIds: ['toc', 'est_to_arc', 'est_to_pal', 'est_to_uni', 'est_to_gup', 'est_to_cap', 'est_to_bel', 'est_to_bat'],
    formatSummary: '8 clubes · Turno único (7 rodadas) · Top 4 Semifinal e Final Ida e Volta',
    championPrize: 800_000,
    runnerUpPrize: 380_000,
    rnfRank: 22,
    serieDSpots: 2,
    copaBrasilSpots: 3,
    copaNordesteSpots: 0,
    copaVerdeSpots: 2,
    copaVerdeBlock: 'Centro-Oeste',
    copaSulSudesteSpots: 0,
  },
  {
    key: 'acreano',
    uf: 'AC',
    name: 'Campeonato Acreano',
    shortName: 'Acreano',
    federation: 'FFAC',
    region: 'Norte',
    clubsCount: 8,
    firstPhaseRounds: 7,
    firstPhaseModel: 'SINGLE_ROUND_ROBIN',
    knockoutModel: 'TOP4_OVERALL_SF',
    qfLegs: 0,
    sfLegs: 1,
    finalLegs: 1,
    finalStadiumName: 'Arena da Floresta (Rio Branco)',
    defaultClubIds: ['cpo', 'rba', 'est_ac_hum', 'est_ac_gal', 'est_ac_ind', 'est_ac_pld', 'est_ac_naq', 'est_ac_sao'],
    formatSummary: '8 clubes · Turno único (7 rodadas) · Top 4 Semifinal e Final em Jogo Único',
    championPrize: 750_000,
    runnerUpPrize: 350_000,
    rnfRank: 23,
    serieDSpots: 2,
    copaBrasilSpots: 3,
    copaNordesteSpots: 0,
    copaVerdeSpots: 2,
    copaVerdeBlock: 'Norte',
    copaSulSudesteSpots: 0,
  },
  {
    key: 'rondoniense',
    uf: 'RO',
    name: 'Campeonato Rondoniense',
    shortName: 'Rondoniense',
    federation: 'FFER',
    region: 'Norte',
    clubsCount: 8,
    firstPhaseRounds: 7,
    firstPhaseModel: 'SINGLE_ROUND_ROBIN',
    knockoutModel: 'TOP4_OVERALL_SF',
    qfLegs: 0,
    sfLegs: 2,
    finalLegs: 2,
    defaultClubIds: ['pve', 'est_ro_gaz', 'est_ro_pvh', 'est_ro_ji', 'est_ro_bar', 'est_ro_vil', 'est_ro_gua', 'est_ro_ari'],
    formatSummary: '8 clubes · Turno único (7 rodadas) · Top 4 Semifinal e Final Ida e Volta',
    championPrize: 750_000,
    runnerUpPrize: 350_000,
    rnfRank: 24,
    serieDSpots: 2,
    copaBrasilSpots: 3,
    copaNordesteSpots: 0,
    copaVerdeSpots: 2,
    copaVerdeBlock: 'Norte',
    copaSulSudesteSpots: 0,
  },
  {
    key: 'roraimense',
    uf: 'RR',
    name: 'Campeonato Roraimense',
    shortName: 'Roraimense',
    federation: 'FRF',
    region: 'Norte',
    clubsCount: 8,
    firstPhaseRounds: 7,
    firstPhaseModel: 'SINGLE_ROUND_ROBIN',
    knockoutModel: 'TOP4_OVERALL_SF',
    qfLegs: 0,
    sfLegs: 1,
    finalLegs: 1,
    finalStadiumName: 'Estádio Canarinho (Boa Vista)',
    defaultClubIds: ['srr', 'est_rr_gas', 'est_rr_mon', 'est_rr_san', 'est_rr_atl', 'est_rr_bar', 'est_rr_rio', 'est_rr_nau'],
    formatSummary: '8 clubes · Turno único (7 rodadas) · Top 4 Semifinal e Final em Jogo Único',
    championPrize: 700_000,
    runnerUpPrize: 320_000,
    rnfRank: 25,
    serieDSpots: 2,
    copaBrasilSpots: 3,
    copaNordesteSpots: 0,
    copaVerdeSpots: 2,
    copaVerdeBlock: 'Norte',
    copaSulSudesteSpots: 0,
  },
  {
    key: 'amapaense',
    uf: 'AP',
    name: 'Campeonato Amapaense',
    shortName: 'Amapaense',
    federation: 'FAF-AP',
    region: 'Norte',
    clubsCount: 8,
    firstPhaseRounds: 7,
    firstPhaseModel: 'SINGLE_ROUND_ROBIN',
    knockoutModel: 'TOP4_OVERALL_SF',
    qfLegs: 0,
    sfLegs: 2,
    finalLegs: 2,
    defaultClubIds: [
      'est_ap_tre', 'est_ap_ind', 'est_ap_san', 'est_ap_mac',
      'est_ap_ora', 'est_ap_ypi', 'est_ap_cri', 'est_ap_por',
    ],
    formatSummary: '8 clubes · Turno único (7 rodadas) · Top 4 Semifinal e Final Ida e Volta',
    championPrize: 700_000,
    runnerUpPrize: 320_000,
    rnfRank: 27,
    serieDSpots: 2,
    copaBrasilSpots: 3,
    copaNordesteSpots: 0,
    copaVerdeSpots: 1,
    copaVerdeBlock: 'Norte',
    copaSulSudesteSpots: 0,
  },
];

const CONFIG_BY_UF = new Map<string, EstadualCompetitionConfig>(
  ESTADUAIS_2026_CONFIG.map((cfg) => [cfg.uf, cfg])
);

const CONFIG_BY_NAME = new Map<string, EstadualCompetitionConfig>(
  ESTADUAIS_2026_CONFIG.map((cfg) => [cfg.name.toLowerCase(), cfg])
);

const CONFIG_BY_KEY = new Map<string, EstadualCompetitionConfig>(
  ESTADUAIS_2026_CONFIG.map((cfg) => [cfg.key, cfg])
);

export function getEstadualConfigByUf(uf?: string): EstadualCompetitionConfig | undefined {
  if (!uf) return undefined;
  return CONFIG_BY_UF.get(uf.toUpperCase());
}

export function getEstadualConfigByName(name?: string): EstadualCompetitionConfig | undefined {
  if (!name) return undefined;
  const norm = name.trim().toLowerCase();
  return (
    CONFIG_BY_NAME.get(norm) ||
    ESTADUAIS_2026_CONFIG.find(
      (c) => c.shortName.toLowerCase() === norm || norm.includes(c.shortName.toLowerCase())
    )
  );
}

export function getEstadualConfigByKey(key?: EstadualKey | string): EstadualCompetitionConfig | undefined {
  if (!key) return undefined;
  return CONFIG_BY_KEY.get(key);
}

export function getClubEstadualConfig(club?: Club | null): EstadualCompetitionConfig | undefined {
  if (!club) return undefined;
  if (!['A', 'B', 'C', 'D', 'EST'].includes(club.division)) return undefined;
  if (club.country && club.country !== 'Brasil') return undefined;
  return getEstadualConfigByUf(club.state);
}

export function getEstadualTotalRounds(cfg?: EstadualCompetitionConfig | null): number {
  if (!cfg) return 11;
  return cfg.firstPhaseRounds + (cfg.qfLegs > 0 ? cfg.qfLegs : 0) + cfg.sfLegs + cfg.finalLegs;
}
