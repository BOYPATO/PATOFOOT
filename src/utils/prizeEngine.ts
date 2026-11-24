import { Club, Fixture, InboxMessage, Standing, CompetitionType } from '../types/game';
import { getEstadualConfigByName } from '../data/estaduais2026Config';
import { recordFinanceLedgerMutation } from './financialFairPlayEngine';

export interface CupPhasePrize {
  competition: CompetitionType;
  phaseMatchString: string;
  phaseDisplayName: string;
  winnerPrize: number;
  runnerUpPrize?: number;
}

export const CUP_PRIZES_CATALOG: CupPhasePrize[] = [
  // Copa do Brasil 2026 (9 fases)
  {
    competition: 'copa_brasil',
    phaseMatchString: '1ª fase',
    phaseDisplayName: 'Classificação à 2ª Fase da Copa do Brasil',
    winnerPrize: 950000,
  },
  {
    competition: 'copa_brasil',
    phaseMatchString: '2ª fase',
    phaseDisplayName: 'Classificação à 3ª Fase da Copa do Brasil',
    winnerPrize: 1500000,
  },
  {
    competition: 'copa_brasil',
    phaseMatchString: '3ª fase',
    phaseDisplayName: 'Classificação à 4ª Fase da Copa do Brasil',
    winnerPrize: 2300000,
  },
  {
    competition: 'copa_brasil',
    phaseMatchString: '4ª fase',
    phaseDisplayName: 'Classificação à 5ª Fase da Copa do Brasil',
    winnerPrize: 3100000,
  },
  {
    competition: 'copa_brasil',
    phaseMatchString: '5ª fase',
    phaseDisplayName: 'Classificação às Oitavas da Copa do Brasil',
    winnerPrize: 3600000,
  },
  {
    competition: 'copa_brasil',
    phaseMatchString: 'oitavas',
    phaseDisplayName: 'Classificação às Quartas de Final',
    winnerPrize: 4700000,
  },
  {
    competition: 'copa_brasil',
    phaseMatchString: 'quartas',
    phaseDisplayName: 'Classificação à Semifinal',
    winnerPrize: 9900000,
  },
  {
    competition: 'copa_brasil',
    phaseMatchString: 'semi',
    phaseDisplayName: 'Classificação à Grande Final',
    winnerPrize: 33000000,
  },
  {
    competition: 'copa_brasil',
    phaseMatchString: 'final',
    phaseDisplayName: 'Título da Copa do Brasil',
    winnerPrize: 77000000,
    runnerUpPrize: 33000000,
  },

  // CONMEBOL Libertadores 2026
  {
    competition: 'libertadores',
    phaseMatchString: 'oitavas',
    phaseDisplayName: 'Classificação às Quartas da Libertadores',
    winnerPrize: 9200000,
  },
  {
    competition: 'libertadores',
    phaseMatchString: 'quartas',
    phaseDisplayName: 'Classificação à Semifinal da Libertadores',
    winnerPrize: 12000000,
  },
  {
    competition: 'libertadores',
    phaseMatchString: 'semi',
    phaseDisplayName: 'Classificação à Final da Glória Eterna',
    winnerPrize: 15000000,
  },
  {
    competition: 'libertadores',
    phaseMatchString: 'final',
    phaseDisplayName: 'Título da CONMEBOL Libertadores',
    winnerPrize: 125000000,
    runnerUpPrize: 40000000,
  },

  // CONMEBOL Sul-Americana 2026
  {
    competition: 'sulamericana',
    phaseMatchString: 'oitavas',
    phaseDisplayName: 'Classificação às Quartas da Sul-Americana',
    winnerPrize: 3800000,
  },
  {
    competition: 'sulamericana',
    phaseMatchString: 'quartas',
    phaseDisplayName: 'Classificação à Semifinal da Sul-Americana',
    winnerPrize: 4900000,
  },
  {
    competition: 'sulamericana',
    phaseMatchString: 'semi',
    phaseDisplayName: 'Classificação à Final Sul-Americana',
    winnerPrize: 6000000,
  },
  {
    competition: 'sulamericana',
    phaseMatchString: 'final',
    phaseDisplayName: 'Título da CONMEBOL Sul-Americana',
    winnerPrize: 32000000,
    runnerUpPrize: 12000000,
  },

  // Brasileirão Série D 2026 (Mata-Mata e Acesso)
  {
    competition: 'serie_d',
    phaseMatchString: 'quartas',
    phaseDisplayName: 'Acesso Garantido à Série C!',
    winnerPrize: 1800000,
  },
  {
    competition: 'serie_d',
    phaseMatchString: 'final',
    phaseDisplayName: 'Título do Brasileirão Série D',
    winnerPrize: 3200000,
    runnerUpPrize: 1200000,
  },

  // Supercopa do Brasil
  {
    competition: 'supercopa_brasil',
    phaseMatchString: 'supercopa',
    phaseDisplayName: 'Título da Supercopa do Brasil',
    winnerPrize: 12000000,
    runnerUpPrize: 6000000,
  },

  // Recopa Sul-Americana
  {
    competition: 'recopa_sulamericana',
    phaseMatchString: 'recopa',
    phaseDisplayName: 'Título da Recopa Sul-Americana',
    winnerPrize: 11000000,
    runnerUpPrize: 5500000,
  },

  // Campeonatos Estaduais
  {
    competition: 'estadual',
    phaseMatchString: 'quartas',
    phaseDisplayName: 'Classificação à Semifinal Estadual',
    winnerPrize: 450000,
  },
  {
    competition: 'estadual',
    phaseMatchString: 'semifinal',
    phaseDisplayName: 'Classificação à Final Estadual',
    winnerPrize: 1200000,
  },
  {
    competition: 'estadual',
    phaseMatchString: 'decisão',
    phaseDisplayName: 'Título de Campeão Estadual',
    winnerPrize: 5000000,
    runnerUpPrize: 1500000,
  },
  {
    competition: 'estadual',
    phaseMatchString: 'final',
    phaseDisplayName: 'Título de Campeão Estadual',
    winnerPrize: 5000000,
    runnerUpPrize: 1500000,
  },

  // Copa do Nordeste (Lampions League)
  {
    competition: 'copa_nordeste',
    phaseMatchString: 'quartas',
    phaseDisplayName: 'Classificação à Semifinal da Copa do Nordeste',
    winnerPrize: 750000,
  },
  {
    competition: 'copa_nordeste',
    phaseMatchString: 'semifinal',
    phaseDisplayName: 'Classificação à Final da Copa do Nordeste',
    winnerPrize: 1400000,
  },
  {
    competition: 'copa_nordeste',
    phaseMatchString: 'final',
    phaseDisplayName: 'Título de Campeão da Copa do Nordeste',
    winnerPrize: 4200000,
    runnerUpPrize: 1600000,
  },

  // Copa Verde (Norte, Centro-Oeste & ES)
  {
    competition: 'copa_verde',
    phaseMatchString: 'quartas',
    phaseDisplayName: 'Classificação à Semifinal da Copa Verde',
    winnerPrize: 550000,
  },
  {
    competition: 'copa_verde',
    phaseMatchString: 'semifinal',
    phaseDisplayName: 'Classificação à Final da Copa Verde',
    winnerPrize: 950000,
  },
  {
    competition: 'copa_verde',
    phaseMatchString: 'final',
    phaseDisplayName: 'Título de Campeão da Copa Verde',
    winnerPrize: 3200000,
    runnerUpPrize: 1200000,
  },

  // Copa Intercontinental / Mundial de Clubes
  {
    competition: 'intercontinental',
    phaseMatchString: 'quartas',
    phaseDisplayName: 'Classificação à Semifinal Mundial (Copa Challenger)',
    winnerPrize: 11000000,
  },
  {
    competition: 'intercontinental',
    phaseMatchString: 'semifinal',
    phaseDisplayName: 'Classificação à Final Mundial em Lusail',
    winnerPrize: 18000000,
  },
  {
    competition: 'intercontinental',
    phaseMatchString: 'final',
    phaseDisplayName: 'Título de Campeão Mundial de Clubes',
    winnerPrize: 110000000,
    runnerUpPrize: 35000000,
  },

  // Super Mundial de Clubes FIFA (32 Clubes — de 4 em 4 anos)
  {
    competition: 'super_mundial_clubes',
    phaseMatchString: 'oitavas',
    phaseDisplayName: 'Classificação às Quartas do Super Mundial FIFA',
    winnerPrize: 42000000,
  },
  {
    competition: 'super_mundial_clubes',
    phaseMatchString: 'quartas',
    phaseDisplayName: 'Classificação à Semifinal do Super Mundial FIFA',
    winnerPrize: 68000000,
  },
  {
    competition: 'super_mundial_clubes',
    phaseMatchString: 'semifinal',
    phaseDisplayName: 'Classificação à Grande Final do Super Mundial FIFA',
    winnerPrize: 105000000,
  },
  {
    competition: 'super_mundial_clubes',
    phaseMatchString: 'final',
    phaseDisplayName: 'Título do Super Mundial de Clubes FIFA (32 Clubes)',
    winnerPrize: 220000000,
    runnerUpPrize: 120000000,
  },

  // Champions Internacional FIFA (América do Norte, Ásia/Rússia e África)
  {
    competition: 'copa_internacional',
    phaseMatchString: 'oitavas',
    phaseDisplayName: 'Classificação às Quartas da Champions Internacional',
    winnerPrize: 8500000,
  },
  {
    competition: 'copa_internacional',
    phaseMatchString: 'quartas',
    phaseDisplayName: 'Classificação à Semifinal da Champions Internacional',
    winnerPrize: 12500000,
  },
  {
    competition: 'copa_internacional',
    phaseMatchString: 'semi',
    phaseDisplayName: 'Classificação à Final da Champions Internacional',
    winnerPrize: 18000000,
  },
  {
    competition: 'copa_internacional',
    phaseMatchString: 'final',
    phaseDisplayName: 'Título da Champions Internacional FIFA',
    winnerPrize: 95000000,
    runnerUpPrize: 32000000,
  },

  // Copa dos Campeões da CONCACAF (Concacaf Champions Cup · Fev–Mai · Premiação US$ 5M+ ao campeão)
  {
    competition: 'concacaf_champions',
    phaseMatchString: 'primeira rodada',
    phaseDisplayName: 'Classificação às Oitavas da Concacaf Champions Cup',
    winnerPrize: 3500000,
  },
  {
    competition: 'concacaf_champions',
    phaseMatchString: 'oitavas',
    phaseDisplayName: 'Classificação às Quartas da Concacaf Champions Cup',
    winnerPrize: 6000000,
  },
  {
    competition: 'concacaf_champions',
    phaseMatchString: 'quartas',
    phaseDisplayName: 'Classificação às Semifinais da Concacaf Champions Cup',
    winnerPrize: 9500000,
  },
  {
    competition: 'concacaf_champions',
    phaseMatchString: 'semifinais',
    phaseDisplayName: 'Classificação à Grande Final da Concacaf Champions Cup',
    winnerPrize: 14000000,
  },
  {
    competition: 'concacaf_champions',
    phaseMatchString: 'final',
    phaseDisplayName: 'Título da Copa dos Campeões da CONCACAF',
    winnerPrize: 30000000,
    runnerUpPrize: 12000000,
  },

  // Liga dos Campeões de Elite da AFC (AFC Champions League Elite · Ago–Mai)
  {
    competition: 'afc_champions',
    phaseMatchString: 'oitavas',
    phaseDisplayName: 'Classificação às Quartas da AFC Champions League Elite',
    winnerPrize: 7500000,
  },
  {
    competition: 'afc_champions',
    phaseMatchString: 'quartas',
    phaseDisplayName: 'Classificação à Semifinal da AFC Champions League Elite',
    winnerPrize: 12000000,
  },
  {
    competition: 'afc_champions',
    phaseMatchString: 'semifinal',
    phaseDisplayName: 'Classificação à Final da AFC Champions League Elite',
    winnerPrize: 20000000,
  },
  {
    competition: 'afc_champions',
    phaseMatchString: 'final',
    phaseDisplayName: 'Título da Liga dos Campeões de Elite da AFC',
    winnerPrize: 65000000,
    runnerUpPrize: 28000000,
  },

  // UEFA Champions League (Formato Fase de Liga 36 clubes + Playoffs + Mata-Mata)
  {
    competition: 'champions_league',
    phaseMatchString: 'playoffs',
    phaseDisplayName: 'Classificação às Oitavas da Champions League',
    winnerPrize: 35000000,
  },
  {
    competition: 'champions_league',
    phaseMatchString: 'oitavas',
    phaseDisplayName: 'Classificação às Quartas da Champions League',
    winnerPrize: 65000000,
  },
  {
    competition: 'champions_league',
    phaseMatchString: 'quartas',
    phaseDisplayName: 'Classificação à Semifinal da Champions League',
    winnerPrize: 80000000,
  },
  {
    competition: 'champions_league',
    phaseMatchString: 'semifinal',
    phaseDisplayName: 'Classificação à Final da Champions League',
    winnerPrize: 95000000,
  },
  {
    competition: 'champions_league',
    phaseMatchString: 'final',
    phaseDisplayName: 'Título da UEFA Champions League',
    winnerPrize: 165000000,
    runnerUpPrize: 95000000,
  },

  // UEFA Europa League (Formato Fase de Liga 36 clubes + Playoffs + Mata-Mata)
  {
    competition: 'europa_league',
    phaseMatchString: 'playoffs',
    phaseDisplayName: 'Classificação às Oitavas da Europa League',
    winnerPrize: 12000000,
  },
  {
    competition: 'europa_league',
    phaseMatchString: 'oitavas',
    phaseDisplayName: 'Classificação às Quartas da Europa League',
    winnerPrize: 18000000,
  },
  {
    competition: 'europa_league',
    phaseMatchString: 'quartas',
    phaseDisplayName: 'Classificação à Semifinal da Europa League',
    winnerPrize: 26000000,
  },
  {
    competition: 'europa_league',
    phaseMatchString: 'semifinal',
    phaseDisplayName: 'Classificação à Final da Europa League',
    winnerPrize: 38000000,
  },
  {
    competition: 'europa_league',
    phaseMatchString: 'final',
    phaseDisplayName: 'Título da UEFA Europa League',
    winnerPrize: 85000000,
    runnerUpPrize: 45000000,
  },

  // UEFA Conference League (Formato Fase de Liga 36 clubes + Playoffs + Mata-Mata)
  {
    competition: 'conference_league',
    phaseMatchString: 'playoffs',
    phaseDisplayName: 'Classificação às Oitavas da Conference League',
    winnerPrize: 6500000,
  },
  {
    competition: 'conference_league',
    phaseMatchString: 'oitavas',
    phaseDisplayName: 'Classificação às Quartas da Conference League',
    winnerPrize: 10000000,
  },
  {
    competition: 'conference_league',
    phaseMatchString: 'quartas',
    phaseDisplayName: 'Classificação à Semifinal da Conference League',
    winnerPrize: 15000000,
  },
  {
    competition: 'conference_league',
    phaseMatchString: 'semifinal',
    phaseDisplayName: 'Classificação à Final da Conference League',
    winnerPrize: 24000000,
  },
  {
    competition: 'conference_league',
    phaseMatchString: 'final',
    phaseDisplayName: 'Título da UEFA Conference League',
    winnerPrize: 50000000,
    runnerUpPrize: 26000000,
  },

  // UEFA Super Cup (Supercopa da UEFA — valores fixos: € 5 milhões campeão / € 4 milhões vice)
  {
    competition: 'uefa_supercup',
    phaseMatchString: 'supercopa',
    phaseDisplayName: 'Título da Supercopa da UEFA (€ 5 milhões / R$ 31M)',
    winnerPrize: 31000000,
    runnerUpPrize: 24800000,
  },

  // FA Community Shield (Supercopa da Inglaterra)
  {
    competition: 'eng_community_shield',
    phaseMatchString: 'supercopa',
    phaseDisplayName: 'Título da FA Community Shield em Wembley',
    winnerPrize: 12000000,
    runnerUpPrize: 5000000,
  },

  // Carabao Cup (EFL Cup / Copa da Liga Inglesa)
  {
    competition: 'eng_efl_cup',
    phaseMatchString: 'oitavas',
    phaseDisplayName: 'Classificação às Quartas da Carabao Cup',
    winnerPrize: 2000000,
  },
  {
    competition: 'eng_efl_cup',
    phaseMatchString: 'quartas',
    phaseDisplayName: 'Classificação à Semifinal da Carabao Cup',
    winnerPrize: 4500000,
  },
  {
    competition: 'eng_efl_cup',
    phaseMatchString: 'semifinal',
    phaseDisplayName: 'Classificação à Grande Final em Wembley da Carabao Cup',
    winnerPrize: 9000000,
  },
  {
    competition: 'eng_efl_cup',
    phaseMatchString: 'final',
    phaseDisplayName: 'Título da Carabao Cup em Wembley Stadium',
    winnerPrize: 25000000,
    runnerUpPrize: 12000000,
  },

  // Emirates FA Cup (Copa da Inglaterra)
  {
    competition: 'eng_fa_cup',
    phaseMatchString: '3ª rodada',
    phaseDisplayName: 'Classificação à 4ª Rodada da FA Cup',
    winnerPrize: 1500000,
  },
  {
    competition: 'eng_fa_cup',
    phaseMatchString: '4ª rodada',
    phaseDisplayName: 'Classificação às Oitavas de Final da FA Cup',
    winnerPrize: 3200000,
  },
  {
    competition: 'eng_fa_cup',
    phaseMatchString: 'oitavas',
    phaseDisplayName: 'Classificação às Quartas de Final da FA Cup',
    winnerPrize: 6500000,
  },
  {
    competition: 'eng_fa_cup',
    phaseMatchString: 'quartas',
    phaseDisplayName: 'Classificação à Semifinal em Wembley da FA Cup',
    winnerPrize: 14000000,
  },
  {
    competition: 'eng_fa_cup',
    phaseMatchString: 'semifinal',
    phaseDisplayName: 'Classificação à Grande Final da FA Cup em Wembley',
    winnerPrize: 25000000,
  },
  {
    competition: 'eng_fa_cup',
    phaseMatchString: 'final',
    phaseDisplayName: 'Título da Emirates FA Cup em Wembley Stadium',
    winnerPrize: 65000000,
    runnerUpPrize: 30000000,
  },

  // Espanha: Copa del Rey & Supercopa
  {
    competition: 'esp_copa_del_rey',
    phaseMatchString: 'quartas',
    phaseDisplayName: 'Classificação à Semifinal da Copa del Rey',
    winnerPrize: 10000000,
  },
  {
    competition: 'esp_copa_del_rey',
    phaseMatchString: 'semi',
    phaseDisplayName: 'Classificação à Grande Final da Copa del Rey em La Cartuja',
    winnerPrize: 22000000,
  },
  {
    competition: 'esp_copa_del_rey',
    phaseMatchString: 'final',
    phaseDisplayName: 'Título da Copa del Rey no Estadio de La Cartuja',
    winnerPrize: 55000000,
    runnerUpPrize: 25000000,
  },
  {
    competition: 'esp_supercopa',
    phaseMatchString: 'semi',
    phaseDisplayName: 'Classificação à Final da Supercopa de España',
    winnerPrize: 8000000,
  },
  {
    competition: 'esp_supercopa',
    phaseMatchString: 'final',
    phaseDisplayName: 'Título da Supercopa de España',
    winnerPrize: 25000000,
    runnerUpPrize: 12000000,
  },

  // Itália: Coppa Italia & Supercoppa
  {
    competition: 'ita_coppa_italia',
    phaseMatchString: 'quartas',
    phaseDisplayName: 'Classificação à Semifinal da Coppa Italia',
    winnerPrize: 9000000,
  },
  {
    competition: 'ita_coppa_italia',
    phaseMatchString: 'semi',
    phaseDisplayName: 'Classificação à Grande Final da Coppa Italia no Stadio Olimpico',
    winnerPrize: 20000000,
  },
  {
    competition: 'ita_coppa_italia',
    phaseMatchString: 'final',
    phaseDisplayName: 'Título da Coppa Italia Frecciarossa no Stadio Olimpico',
    winnerPrize: 50000000,
    runnerUpPrize: 22000000,
  },
  {
    competition: 'ita_supercoppa',
    phaseMatchString: 'semi',
    phaseDisplayName: 'Classificação à Final da Supercoppa Italiana',
    winnerPrize: 8000000,
  },
  {
    competition: 'ita_supercoppa',
    phaseMatchString: 'final',
    phaseDisplayName: 'Título da EA SPORTS FC Supercup',
    winnerPrize: 25000000,
    runnerUpPrize: 12000000,
  },

  // Alemanha: DFB-Pokal & Franz Beckenbauer Supercup
  {
    competition: 'ger_dfb_pokal',
    phaseMatchString: 'quartas',
    phaseDisplayName: 'Classificação à Semifinal da DFB-Pokal',
    winnerPrize: 10000000,
  },
  {
    competition: 'ger_dfb_pokal',
    phaseMatchString: 'semi',
    phaseDisplayName: 'Classificação à Grande Final da DFB-Pokal no Olympiastadion Berlin',
    winnerPrize: 22000000,
  },
  {
    competition: 'ger_dfb_pokal',
    phaseMatchString: 'final',
    phaseDisplayName: 'Título da DFB-Pokal no Olympiastadion Berlin',
    winnerPrize: 55000000,
    runnerUpPrize: 25000000,
  },
  {
    competition: 'ger_supercup',
    phaseMatchString: 'supercopa',
    phaseDisplayName: 'Título da Franz Beckenbauer Supercup',
    winnerPrize: 18000000,
    runnerUpPrize: 8000000,
  },

  // França: Coupe de France & Trophée des Champions
  {
    competition: 'fra_coupe_de_france',
    phaseMatchString: 'quartas',
    phaseDisplayName: 'Classificação à Semifinal da Coupe de France',
    winnerPrize: 8000000,
  },
  {
    competition: 'fra_coupe_de_france',
    phaseMatchString: 'semi',
    phaseDisplayName: 'Classificação à Grande Final da Coupe de France no Stade de France',
    winnerPrize: 18000000,
  },
  {
    competition: 'fra_coupe_de_france',
    phaseMatchString: 'final',
    phaseDisplayName: 'Título da Coupe de France no Stade de France',
    winnerPrize: 45000000,
    runnerUpPrize: 20000000,
  },
  {
    competition: 'fra_trophee_champions',
    phaseMatchString: 'supercopa',
    phaseDisplayName: 'Título do Trophée des Champions',
    winnerPrize: 15000000,
    runnerUpPrize: 6000000,
  },

  // Portugal: Taça de Portugal & Supertaça
  {
    competition: 'por_taca_portugal',
    phaseMatchString: 'semi',
    phaseDisplayName: 'Classificação à Grande Final da Taça de Portugal no Jamor',
    winnerPrize: 12000000,
  },
  {
    competition: 'por_taca_portugal',
    phaseMatchString: 'final',
    phaseDisplayName: 'Título da Taça de Portugal no Estádio Nacional do Jamor',
    winnerPrize: 35000000,
    runnerUpPrize: 15000000,
  },
  {
    competition: 'por_supertaca',
    phaseMatchString: 'supercopa',
    phaseDisplayName: 'Título da Supertaça Cândido de Oliveira',
    winnerPrize: 14000000,
    runnerUpPrize: 6000000,
  },

  // Holanda: KNVB Beker & Johan Cruijff Schaal
  {
    competition: 'ned_knvb_beker',
    phaseMatchString: 'semi',
    phaseDisplayName: 'Classificação à Grande Final da KNVB Beker em De Kuip',
    winnerPrize: 10000000,
  },
  {
    competition: 'ned_knvb_beker',
    phaseMatchString: 'final',
    phaseDisplayName: 'Título da KNVB Beker no De Kuip Rotterdam',
    winnerPrize: 30000000,
    runnerUpPrize: 14000000,
  },
  {
    competition: 'ned_johan_cruyff',
    phaseMatchString: 'supercopa',
    phaseDisplayName: 'Título da Johan Cruijff Schaal',
    winnerPrize: 12000000,
    runnerUpPrize: 5000000,
  },

  // Bélgica: Croky Cup & Supercopa da Bélgica
  {
    competition: 'bel_croky_cup',
    phaseMatchString: 'semi',
    phaseDisplayName: 'Classificação à Grande Final da Croky Cup no Stade Roi Baudouin',
    winnerPrize: 8000000,
  },
  {
    competition: 'bel_croky_cup',
    phaseMatchString: 'final',
    phaseDisplayName: 'Título da Croky Cup no Stade Roi Baudouin',
    winnerPrize: 25000000,
    runnerUpPrize: 10000000,
  },
  {
    competition: 'bel_supercup',
    phaseMatchString: 'supercopa',
    phaseDisplayName: 'Título da Supercopa da Bélgica',
    winnerPrize: 10000000,
    runnerUpPrize: 4000000,
  },

  // Turquia: Türkiye Kupası & Turkcell Süper Kupa
  {
    competition: 'tur_turkiye_kupasi',
    phaseMatchString: 'semi',
    phaseDisplayName: 'Classificação à Grande Final da Ziraat Türkiye Kupası',
    winnerPrize: 9000000,
  },
  {
    competition: 'tur_turkiye_kupasi',
    phaseMatchString: 'final',
    phaseDisplayName: 'Título da Ziraat Türkiye Kupası',
    winnerPrize: 28000000,
    runnerUpPrize: 12000000,
  },
  {
    competition: 'tur_super_kupa',
    phaseMatchString: 'supercopa',
    phaseDisplayName: 'Título da Turkcell Süper Kupa',
    winnerPrize: 12000000,
    runnerUpPrize: 5000000,
  },

  // Grécia: Betsson Kypello Elladas
  {
    competition: 'gre_kypello_elladas',
    phaseMatchString: 'semi',
    phaseDisplayName: 'Classificação à Grande Final da Copa da Grécia',
    winnerPrize: 7000000,
  },
  {
    competition: 'gre_kypello_elladas',
    phaseMatchString: 'final',
    phaseDisplayName: 'Título da Betsson Kypello Elladas',
    winnerPrize: 22000000,
    runnerUpPrize: 9000000,
  },

  // Noruega: NM Cupen
  {
    competition: 'nor_nm_cup',
    phaseMatchString: 'semi',
    phaseDisplayName: 'Classificação à Grande Final da NM Cupen em Ullevaal',
    winnerPrize: 6000000,
  },
  {
    competition: 'nor_nm_cup',
    phaseMatchString: 'final',
    phaseDisplayName: 'Título da NM Cupen no Ullevaal Stadion',
    winnerPrize: 20000000,
    runnerUpPrize: 8000000,
  },

  // Dinamarca: Oddset Pokalen
  {
    competition: 'den_dbu_pokalen',
    phaseMatchString: 'semi',
    phaseDisplayName: 'Classificação à Grande Final da DBU Pokalen no Parken',
    winnerPrize: 6000000,
  },
  {
    competition: 'den_dbu_pokalen',
    phaseMatchString: 'final',
    phaseDisplayName: 'Título da Oddset Pokalen (DBU) no Parken Stadion',
    winnerPrize: 20000000,
    runnerUpPrize: 8000000,
  },

  // Suíça: Schweizer Cup
  {
    competition: 'sui_schweizer_cup',
    phaseMatchString: 'semi',
    phaseDisplayName: 'Classificação à Grande Final da Schweizer Cup no Wankdorf',
    winnerPrize: 7000000,
  },
  {
    competition: 'sui_schweizer_cup',
    phaseMatchString: 'final',
    phaseDisplayName: 'Título da Schweizer Cup no Stadion Wankdorf',
    winnerPrize: 22000000,
    runnerUpPrize: 9000000,
  },

  // Suécia: Svenska Cupen
  {
    competition: 'swe_svenska_cupen',
    phaseMatchString: 'semi',
    phaseDisplayName: 'Classificação à Grande Final da Svenska Cupen',
    winnerPrize: 6000000,
  },
  {
    competition: 'swe_svenska_cupen',
    phaseMatchString: 'final',
    phaseDisplayName: 'Título da Svenska Cupen',
    winnerPrize: 20000000,
    runnerUpPrize: 8000000,
  },

  // Escócia: Scottish Cup
  {
    competition: 'sco_scottish_cup',
    phaseMatchString: 'semi',
    phaseDisplayName: 'Classificação à Grande Final da Scottish Cup no Hampden Park',
    winnerPrize: 7000000,
  },
  {
    competition: 'sco_scottish_cup',
    phaseMatchString: 'final',
    phaseDisplayName: 'Título da Scottish Cup em Hampden Park',
    winnerPrize: 24000000,
    runnerUpPrize: 10000000,
  },

  // Ligas Especiais: Taça Especial Europa 1 & 2
  {
    competition: 'eu_sp1_cup',
    phaseMatchString: 'semi',
    phaseDisplayName: 'Classificação à Grande Final da Taça Especial Europa 1',
    winnerPrize: 8000000,
  },
  {
    competition: 'eu_sp1_cup',
    phaseMatchString: 'final',
    phaseDisplayName: 'Título da Taça Especial Europa 1',
    winnerPrize: 25000000,
    runnerUpPrize: 10000000,
  },
  {
    competition: 'eu_sp2_cup',
    phaseMatchString: 'semi',
    phaseDisplayName: 'Classificação à Grande Final da Taça Especial Europa 2',
    winnerPrize: 8000000,
  },
  {
    competition: 'eu_sp2_cup',
    phaseMatchString: 'final',
    phaseDisplayName: 'Título da Taça Especial Europa 2',
    winnerPrize: 25000000,
    runnerUpPrize: 10000000,
  },

  // Copas Nacionais da América do Sul (18 Copas e Supercopas)
  // Argentina
  {
    competition: 'sa_copa_argentina',
    phaseMatchString: 'oitavas',
    phaseDisplayName: 'Classificação às Quartas da Copa Argentina',
    winnerPrize: 4000000,
  },
  {
    competition: 'sa_copa_argentina',
    phaseMatchString: 'quartas',
    phaseDisplayName: 'Classificação à Semifinal da Copa Argentina',
    winnerPrize: 8000000,
  },
  {
    competition: 'sa_copa_argentina',
    phaseMatchString: 'semi',
    phaseDisplayName: 'Classificação à Grande Final da Copa Argentina',
    winnerPrize: 16000000,
  },
  {
    competition: 'sa_copa_argentina',
    phaseMatchString: 'final',
    phaseDisplayName: 'Título da Copa Argentina',
    winnerPrize: 55000000,
    runnerUpPrize: 22000000,
  },
  {
    competition: 'sa_supercopa_argentina',
    phaseMatchString: 'final',
    phaseDisplayName: 'Título da Supercopa Argentina',
    winnerPrize: 20000000,
    runnerUpPrize: 8000000,
  },

  // Colômbia
  {
    competition: 'sa_copa_colombia',
    phaseMatchString: 'semi',
    phaseDisplayName: 'Classificação à Grande Final da Copa BetPlay Colômbia',
    winnerPrize: 10000000,
  },
  {
    competition: 'sa_copa_colombia',
    phaseMatchString: 'final',
    phaseDisplayName: 'Título da Copa BetPlay Colômbia',
    winnerPrize: 32000000,
    runnerUpPrize: 12000000,
  },
  {
    competition: 'sa_superliga_colombia',
    phaseMatchString: 'final',
    phaseDisplayName: 'Título da Superliga BetPlay da Colômbia',
    winnerPrize: 16000000,
    runnerUpPrize: 7000000,
  },

  // Uruguai
  {
    competition: 'sa_copa_uruguay',
    phaseMatchString: 'semi',
    phaseDisplayName: 'Classificação à Grande Final da Copa Uruguay AUF',
    winnerPrize: 8000000,
  },
  {
    competition: 'sa_copa_uruguay',
    phaseMatchString: 'final',
    phaseDisplayName: 'Título da Copa Uruguay',
    winnerPrize: 26000000,
    runnerUpPrize: 10000000,
  },
  {
    competition: 'sa_supercopa_uruguay',
    phaseMatchString: 'final',
    phaseDisplayName: 'Título da Supercopa Uruguaya',
    winnerPrize: 14000000,
    runnerUpPrize: 6000000,
  },

  // Equador
  {
    competition: 'sa_copa_ecuador',
    phaseMatchString: 'semi',
    phaseDisplayName: 'Classificação à Grande Final da Copa Ecuador FEF',
    winnerPrize: 8000000,
  },
  {
    competition: 'sa_copa_ecuador',
    phaseMatchString: 'final',
    phaseDisplayName: 'Título da Copa Ecuador',
    winnerPrize: 26000000,
    runnerUpPrize: 10000000,
  },
  {
    competition: 'sa_supercopa_ecuador',
    phaseMatchString: 'final',
    phaseDisplayName: 'Título da Supercopa Ecuador',
    winnerPrize: 14000000,
    runnerUpPrize: 6000000,
  },

  // Chile
  {
    competition: 'sa_copa_chile',
    phaseMatchString: 'semi',
    phaseDisplayName: 'Classificação à Grande Final da Copa Chile Coca-Cola Sin Azúcar',
    winnerPrize: 9000000,
  },
  {
    competition: 'sa_copa_chile',
    phaseMatchString: 'final',
    phaseDisplayName: 'Título da Copa Chile',
    winnerPrize: 30000000,
    runnerUpPrize: 12000000,
  },
  {
    competition: 'sa_supercopa_chile',
    phaseMatchString: 'final',
    phaseDisplayName: 'Título da Supercopa de Chile',
    winnerPrize: 15000000,
    runnerUpPrize: 6000000,
  },

  // Paraguai
  {
    competition: 'sa_copa_paraguay',
    phaseMatchString: 'semi',
    phaseDisplayName: 'Classificação à Grande Final da Copa Paraguay APF',
    winnerPrize: 7000000,
  },
  {
    competition: 'sa_copa_paraguay',
    phaseMatchString: 'final',
    phaseDisplayName: 'Título da Copa Paraguay',
    winnerPrize: 24000000,
    runnerUpPrize: 9000000,
  },
  {
    competition: 'sa_supercopa_paraguay',
    phaseMatchString: 'final',
    phaseDisplayName: 'Título da Supercopa Paraguay',
    winnerPrize: 12000000,
    runnerUpPrize: 5000000,
  },

  // Peru
  {
    competition: 'sa_copa_peru',
    phaseMatchString: 'semi',
    phaseDisplayName: 'Classificação à Grande Final da Copa Bicentenario',
    winnerPrize: 7000000,
  },
  {
    competition: 'sa_copa_peru',
    phaseMatchString: 'final',
    phaseDisplayName: 'Título da Copa Bicentenario do Peru',
    winnerPrize: 24000000,
    runnerUpPrize: 9000000,
  },
  {
    competition: 'sa_supercopa_peru',
    phaseMatchString: 'final',
    phaseDisplayName: 'Título da Supercopa Peruana',
    winnerPrize: 12000000,
    runnerUpPrize: 5000000,
  },

  // Bolívia
  {
    competition: 'sa_copa_bolivia',
    phaseMatchString: 'semi',
    phaseDisplayName: 'Classificação à Grande Final da Copa de la División Profesional',
    winnerPrize: 6000000,
  },
  {
    competition: 'sa_copa_bolivia',
    phaseMatchString: 'final',
    phaseDisplayName: 'Título da Copa de la División Profesional da Bolívia',
    winnerPrize: 20000000,
    runnerUpPrize: 8000000,
  },
  {
    competition: 'sa_supercopa_bolivia',
    phaseMatchString: 'final',
    phaseDisplayName: 'Título da Supercopa Boliviana',
    winnerPrize: 10000000,
    runnerUpPrize: 4000000,
  },

  // Venezuela
  {
    competition: 'sa_copa_venezuela',
    phaseMatchString: 'semi',
    phaseDisplayName: 'Classificação à Grande Final da Copa Venezuela',
    winnerPrize: 6000000,
  },
  {
    competition: 'sa_copa_venezuela',
    phaseMatchString: 'final',
    phaseDisplayName: 'Título da Copa Venezuela',
    winnerPrize: 20000000,
    runnerUpPrize: 8000000,
  },
  {
    competition: 'sa_supercopa_venezuela',
    phaseMatchString: 'final',
    phaseDisplayName: 'Título da Supercopa Venezuela',
    winnerPrize: 10000000,
    runnerUpPrize: 4000000,
  },

  // Copas Nacionais do Mundo (EUA, México, Canadá, Arábia Saudita, Japão, Rússia, Egito, Marrocos)
  {
    competition: 'wl_cup_usa',
    phaseMatchString: 'semi',
    phaseDisplayName: 'Classificação à Final da U.S. Open Cup',
    winnerPrize: 4000000,
  },
  {
    competition: 'wl_cup_usa',
    phaseMatchString: 'final',
    phaseDisplayName: 'Título da Lamar Hunt U.S. Open Cup',
    winnerPrize: 15000000,
    runnerUpPrize: 6000000,
  },
  {
    competition: 'wl_cup_mex',
    phaseMatchString: 'semi',
    phaseDisplayName: 'Classificação à Final da Copa MX',
    winnerPrize: 4000000,
  },
  {
    competition: 'wl_cup_mex',
    phaseMatchString: 'final',
    phaseDisplayName: 'Título da Copa MX',
    winnerPrize: 14000000,
    runnerUpPrize: 5500000,
  },
  {
    competition: 'wl_cup_can',
    phaseMatchString: 'semi',
    phaseDisplayName: 'Classificação à Final do Campeonato Canadense',
    winnerPrize: 2500000,
  },
  {
    competition: 'wl_cup_can',
    phaseMatchString: 'final',
    phaseDisplayName: 'Título do Campeonato Canadense',
    winnerPrize: 9000000,
    runnerUpPrize: 3500000,
  },
  {
    competition: 'wl_cup_sau',
    phaseMatchString: 'semi',
    phaseDisplayName: 'Classificação à Final da Copa do Rei Saudita',
    winnerPrize: 12000000,
  },
  {
    competition: 'wl_cup_sau',
    phaseMatchString: 'final',
    phaseDisplayName: 'Título da Copa do Rei Saudita',
    winnerPrize: 42000000,
    runnerUpPrize: 18000000,
  },
  {
    competition: 'wl_cup_jpn',
    phaseMatchString: 'semi',
    phaseDisplayName: 'Classificação à Final da Copa do Imperador',
    winnerPrize: 4500000,
  },
  {
    competition: 'wl_cup_jpn',
    phaseMatchString: 'final',
    phaseDisplayName: 'Título da Copa do Imperador do Japão',
    winnerPrize: 16000000,
    runnerUpPrize: 6500000,
  },
  {
    competition: 'wl_cup_rus',
    phaseMatchString: 'semi',
    phaseDisplayName: 'Classificação à Final da Copa da Rússia',
    winnerPrize: 5000000,
  },
  {
    competition: 'wl_cup_rus',
    phaseMatchString: 'final',
    phaseDisplayName: 'Título da Copa da Rússia',
    winnerPrize: 18000000,
    runnerUpPrize: 7500000,
  },
  {
    competition: 'wl_cup_egy',
    phaseMatchString: 'semi',
    phaseDisplayName: 'Classificação à Final da Copa do Egito',
    winnerPrize: 3000000,
  },
  {
    competition: 'wl_cup_egy',
    phaseMatchString: 'final',
    phaseDisplayName: 'Título da Copa do Egito',
    winnerPrize: 11000000,
    runnerUpPrize: 4500000,
  },
  {
    competition: 'wl_cup_mar',
    phaseMatchString: 'semi',
    phaseDisplayName: 'Classificação à Final da Coupe du Trône',
    winnerPrize: 2800000,
  },
  {
    competition: 'wl_cup_mar',
    phaseMatchString: 'final',
    phaseDisplayName: 'Título da Coupe du Trône do Marrocos',
    winnerPrize: 10000000,
    runnerUpPrize: 4000000,
  },
];

export const SERIE_A_END_PRIZES: Record<number, number> = {
  1: 50000000, // Campeão Brasileiro
  2: 45000000,
  3: 42000000,
  4: 38000000,
  5: 35000000,
  6: 33000000,
  7: 30000000,
  8: 28000000,
  9: 26000000,
  10: 24000000,
  11: 22000000,
  12: 20000000,
  13: 16000000,
  14: 15000000,
  15: 14000000,
  16: 12000000, // 16º (Permanência)
};

export const SERIE_B_END_PRIZES: Record<number, number> = {
  1: 12000000, // Campeão Série B + Acesso
  2: 8000000,
  3: 7000000,
  4: 6000000,
};

export interface PrizeAwardResult {
  awarded: boolean;
  amount: number;
  clubId: string;
  clubName: string;
  competitionName: string;
  phaseName: string;
  isChampion: boolean;
  inboxMessage?: InboxMessage;
}

/**
 * Checks if a completed fixture decided a cup tie or final, awarding phase prize money
 */
export function checkAndAwardCupPhasePrize(
  fixture: Fixture,
  allClubs: Club[],
  userClubId: string,
  currentRound: number,
  currentDate: string
): {
  updatedClubs: Club[];
  awardResult: PrizeAwardResult | null;
} {
  // Only cup ties can have phase knockout prizes
  const isCup =
    fixture.competition === 'copa_brasil' ||
    fixture.competition === 'supercopa_brasil' ||
    fixture.competition === 'recopa_sulamericana' ||
    fixture.competition === 'libertadores' ||
    fixture.competition === 'sulamericana' ||
    fixture.competition === 'champions_league' ||
    fixture.competition === 'europa_league' ||
    fixture.competition === 'conference_league' ||
    fixture.competition === 'uefa_supercup' ||
    fixture.competition === 'copa_internacional' ||
    fixture.competition === 'concacaf_champions' ||
    fixture.competition === 'afc_champions' ||
    fixture.competition === 'estadual' ||
    fixture.competition === 'copa_nordeste' ||
    fixture.competition === 'copa_verde' ||
    fixture.competition === 'intercontinental' ||
    fixture.competition === 'eng_community_shield' ||
    fixture.competition === 'eng_fa_cup' ||
    fixture.competition === 'eng_efl_cup' ||
    CUP_PRIZES_CATALOG.some((c) => c.competition === fixture.competition) ||
    (fixture.competition === 'serie_d' && fixture.leg !== undefined);

  if (!isCup || !fixture.played || fixture.homeScore === null || fixture.awayScore === null) {
    return { updatedClubs: allClubs, awardResult: null };
  }

  // If this is Leg 1, no tie is decided yet
  if (fixture.leg === 1) {
    return { updatedClubs: allClubs, awardResult: null };
  }

  // Determine tie winner
  let winnerId: string | null = null;
  let runnerUpId: string | null = null;

  if (fixture.aggregateWinnerId) {
    winnerId = fixture.aggregateWinnerId;
    runnerUpId = winnerId === fixture.homeTeamId ? fixture.awayTeamId : fixture.homeTeamId;
  } else if (fixture.penaltiesHome !== undefined && fixture.penaltiesAway !== undefined) {
    winnerId = fixture.penaltiesHome > fixture.penaltiesAway ? fixture.homeTeamId : fixture.awayTeamId;
    runnerUpId = winnerId === fixture.homeTeamId ? fixture.awayTeamId : fixture.homeTeamId;
  } else if (fixture.aggregateHomeScore !== undefined && fixture.aggregateAwayScore !== undefined) {
    if (fixture.aggregateHomeScore > fixture.aggregateAwayScore) {
      winnerId = fixture.homeTeamId;
      runnerUpId = fixture.awayTeamId;
    } else if (fixture.aggregateAwayScore > fixture.aggregateHomeScore) {
      winnerId = fixture.awayTeamId;
      runnerUpId = fixture.homeTeamId;
    }
  } else {
    // Single leg match
    if (fixture.homeScore > fixture.awayScore) {
      winnerId = fixture.homeTeamId;
      runnerUpId = fixture.awayTeamId;
    } else if (fixture.awayScore > fixture.homeScore) {
      winnerId = fixture.awayTeamId;
      runnerUpId = fixture.homeTeamId;
    }
  }

  if (!winnerId) {
    return { updatedClubs: allClubs, awardResult: null };
  }

  const phaseLower = (fixture.cupPhase || '').toLowerCase();
  const prizeConfig = CUP_PRIZES_CATALOG.find(
    (c) => c.competition === fixture.competition && phaseLower.includes(c.phaseMatchString)
  );

  if (!prizeConfig) {
    return { updatedClubs: allClubs, awardResult: null };
  }

  const isFinal = phaseLower.includes('final') || phaseLower.includes('decisão');
  const winnerClub = allClubs.find((c) => c.id === winnerId);
  const runnerUpClub = runnerUpId ? allClubs.find((c) => c.id === runnerUpId) : null;

  if (!winnerClub) {
    return { updatedClubs: allClubs, awardResult: null };
  }

  // Credit prize money (for Campeonatos Estaduais, scale realistically by each UF's federation quota)
  const estCfg =
    fixture.competition === 'estadual' && fixture.groupName
      ? getEstadualConfigByName(fixture.groupName)
      : undefined;
  const prizeAmount = estCfg
    ? isFinal
      ? estCfg.championPrize
      : phaseLower.includes('semi')
      ? Math.max(80000, Math.round(estCfg.championPrize * 0.25))
      : Math.max(40000, Math.round(estCfg.championPrize * 0.12))
    : prizeConfig.winnerPrize;
  const runnerUpAmount = isFinal
    ? estCfg
      ? estCfg.runnerUpPrize
      : prizeConfig.runnerUpPrize || 0
    : 0;

  const updatedClubs = allClubs.map((club) => {
    if (club.id === winnerId) {
      return {
        ...club,
        finances:
          club.id === userClubId
            ? recordFinanceLedgerMutation(club.finances, {
                date: currentDate,
                category: 'PRIZES',
                type: 'INCOME',
                amount: prizeAmount,
                description: `Premiação: ${prizeConfig.phaseDisplayName}`,
                applyToBalance: true,
              })
            : {
                ...club.finances,
                balance: club.finances.balance + prizeAmount,
                totalIncomeSeason: club.finances.totalIncomeSeason + prizeAmount,
              },
      };
    }
    if (runnerUpClub && club.id === runnerUpClub.id && runnerUpAmount > 0) {
      return {
        ...club,
        finances:
          club.id === userClubId
            ? recordFinanceLedgerMutation(club.finances, {
                date: currentDate,
                category: 'PRIZES',
                type: 'INCOME',
                amount: runnerUpAmount,
                description: `Premiação Vice-Campeão: ${fixture.cupPhase || prizeConfig.phaseDisplayName}`,
                applyToBalance: true,
              })
            : {
                ...club.finances,
                balance: club.finances.balance + runnerUpAmount,
                totalIncomeSeason: club.finances.totalIncomeSeason + runnerUpAmount,
              },
      };
    }
    return club;
  });

  const isUserWinner = winnerId === userClubId;
  const isUserRunnerUp = runnerUpId === userClubId;

  let inboxMsg: InboxMessage | undefined = undefined;

  if (isUserWinner) {
    inboxMsg = {
      id: `prize_${Date.now()}`,
      title: isFinal
        ? `🏆 PREMIAÇÃO DE CAMPEÃO: +${formatMoney(prizeAmount)}!`
        : `💰 PREMIAÇÃO POR FASE: +${formatMoney(prizeAmount)}!`,
      message: isFinal
        ? `PARABÉNS! Pelo título incontestável da ${fixture.cupPhase || prizeConfig.phaseDisplayName}, o ${winnerClub.name} faturou a bolada milionária de ${formatMoney(prizeAmount)}! A diretoria e a torcida estão em festa!`
        : `Excelente desempenho! Pela classificação à próxima fase (${prizeConfig.phaseDisplayName}), o ${winnerClub.name} garantiu a premiação oficial de ${formatMoney(prizeAmount)} da ${
            fixture.competition === 'champions_league' ||
            fixture.competition === 'europa_league' ||
            fixture.competition === 'conference_league'
              ? 'UEFA'
              : fixture.competition === 'concacaf_champions'
              ? 'CONCACAF'
              : fixture.competition === 'afc_champions'
              ? 'AFC'
              : fixture.competition === 'intercontinental' ||
                fixture.competition === 'copa_internacional'
              ? 'FIFA'
              : 'CBF / CONMEBOL'
          }. O valor já está disponível no caixa do clube!`,
      date: currentDate,
      round: currentRound,
      read: false,
      type: 'AWARD',
    };
  } else if (isUserRunnerUp && runnerUpAmount > 0) {
    inboxMsg = {
      id: `prize_runnerup_${Date.now()}`,
      title: `🥈 PREMIAÇÃO DE VICE-CAMPEÃO: +${formatMoney(runnerUpAmount)}`,
      message: `Pela excelente campanha e conquista do vice-campeonato na ${fixture.cupPhase || prizeConfig.phaseDisplayName}, o ${runnerUpClub?.name} recebeu a premiação de ${formatMoney(runnerUpAmount)} nos cofres do clube.`,
      date: currentDate,
      round: currentRound,
      read: false,
      type: 'AWARD',
    };
  }

  const awardResult: PrizeAwardResult = {
    awarded: true,
    amount: isUserWinner ? prizeAmount : runnerUpAmount,
    clubId: isUserWinner ? winnerId : runnerUpId || '',
    clubName: isUserWinner ? winnerClub.name : runnerUpClub?.name || '',
    competitionName: prizeConfig.competition,
    phaseName: prizeConfig.phaseDisplayName,
    isChampion: isFinal,
    inboxMessage: inboxMsg,
  };

  return { updatedClubs, awardResult };
}

/**
 * Distributes season-end league classification prize money at round 38
 */
export function awardLeagueEndPrizes(
  standingsA: Standing[],
  standingsB: Standing[],
  allClubs: Club[],
  userClubId: string,
  seasonYear: number,
  currentDate: string
): {
  updatedClubs: Club[];
  leagueEndInboxMessages: InboxMessage[];
} {
  const inboxMessages: InboxMessage[] = [];
  const prizeByTeamId = new Map<string, { div: 'A' | 'B'; prize: number; position: number; points: number }>();

  standingsA.forEach((st, idx) => {
    const position = idx + 1;
    const prize = SERIE_A_END_PRIZES[position] || 0;
    if (prize > 0) prizeByTeamId.set(st.teamId, { div: 'A', prize, position, points: st.points });
  });

  standingsB.forEach((st, idx) => {
    const position = idx + 1;
    const prize = SERIE_B_END_PRIZES[position] || 0;
    if (prize > 0) prizeByTeamId.set(st.teamId, { div: 'B', prize, position, points: st.points });
  });

  const updatedClubs = allClubs.map((club) => {
    const award = prizeByTeamId.get(club.id);
    if (!award || (club.division !== 'A' && club.division !== 'B')) return club;

    if (club.id === userClubId) {
      inboxMessages.push(
        award.div === 'A'
          ? {
              id: `msg_league_end_prize_${seasonYear}`,
              title: `💰 PREMIAÇÃO OFICIAL DO BRASILEIRÃO: +${formatMoney(award.prize)}!`,
              message: `Campanha encerrada no Campeonato Brasileiro Série A ${seasonYear}! O ${club.name} terminou na ${award.position}ª colocação (${award.points} pts) e recebeu a cota milionária de ${formatMoney(award.prize)} pelos direitos de transmissão e premiação final da CBF!`,
              date: currentDate,
              round: 38,
              read: false,
              type: 'AWARD',
            }
          : {
              id: `msg_league_end_prize_b_${seasonYear}`,
              title: `🚀 BÔNUS DE ACESSO À SÉRIE A: +${formatMoney(award.prize)}!`,
              message: `O ${club.name} conquistou o acesso para a elite do futebol brasileiro na ${award.position}ª posição com ${award.points} pontos! A CBF creditou a premiação de acesso no valor de ${formatMoney(award.prize)} nos cofres do clube!`,
              date: currentDate,
              round: 38,
              read: false,
              type: 'AWARD',
            }
      );
    }

    return {
      ...club,
      finances:
        club.id === userClubId
          ? recordFinanceLedgerMutation(club.finances, {
              date: currentDate,
              category: 'PRIZES',
              type: 'INCOME',
              amount: award.prize,
              description: `Premiação Série ${award.div} (${award.position}º lugar · ${seasonYear})`,
              applyToBalance: true,
            })
          : {
              ...club.finances,
              balance: club.finances.balance + award.prize,
              totalIncomeSeason: club.finances.totalIncomeSeason + award.prize,
            },
    };
  });

  return {
    updatedClubs,
    leagueEndInboxMessages: inboxMessages,
  };
}

export function formatMoney(val: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  }).format(val);
}
