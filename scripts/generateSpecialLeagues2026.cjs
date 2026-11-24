const fs = require('fs');
const path = require('path');

const FILE_1 = path.join(__dirname, '../public/assets/aistudio/LIGA_ESPECIAL_1_31ed1971.txt');
const FILE_2 = path.join(__dirname, '../public/assets/aistudio/LIGA_ESPECIAL_2_87fc6044.txt');

const TARGET_TS_1 = path.join(__dirname, '../src/data/specialLeague1Rosters.ts');
const TARGET_TS_2 = path.join(__dirname, '../src/data/specialLeague2Rosters.ts');

const LEAGUE_1_CLUBS = {
  "1 LASK - AUSTRIA": {
    id: "eu_sp1_lask",
    name: "LASK Linz",
    shortName: "LASK",
    country: "Áustria",
    stateCode: "AUT",
    reputation: 3,
    primaryColor: "#111111",
    managerName: "Markus Schopp"
  },
  "2 RB SALZBURG - AUSTRIA": {
    id: "eu_sp1_rbs",
    name: "Red Bull Salzburg",
    shortName: "RB Salzburg",
    country: "Áustria",
    stateCode: "AUT",
    reputation: 4,
    primaryColor: "#D20A11",
    managerName: "Pepijn Lijnders"
  },
  "3 STURM - AUSTRIA": {
    id: "eu_sp1_stu",
    name: "SK Sturm Graz",
    shortName: "Sturm Graz",
    country: "Áustria",
    stateCode: "AUT",
    reputation: 3,
    primaryColor: "#000000",
    managerName: "Christian Ilzer"
  },
  "4 SK SLAVIA PRAGA": {
    id: "eu_sp1_sla",
    name: "SK Slavia Praga",
    shortName: "Slavia Praga",
    country: "República Tcheca",
    stateCode: "CZE",
    reputation: 4,
    primaryColor: "#D4021D",
    managerName: "Jindrich Trpisovsky"
  },
  "5 AC SPARTA PRAGA": {
    id: "eu_sp1_spa",
    name: "AC Sparta Praga",
    shortName: "Sparta Praga",
    country: "República Tcheca",
    stateCode: "CZE",
    reputation: 4,
    primaryColor: "#8A1538",
    managerName: "Lars Friis"
  },
  "6 FC VIKTORIA PLZEN": {
    id: "eu_sp1_plz",
    name: "FC Viktoria Plzen",
    shortName: "Viktoria Plzen",
    country: "República Tcheca",
    stateCode: "CZE",
    reputation: 3,
    primaryColor: "#004F9F",
    managerName: "Miroslav Koubek"
  },
  "7 KKS LECH POZNAN - POLONIA": {
    id: "eu_sp1_lec",
    name: "KKS Lech Poznan",
    shortName: "Lech Poznan",
    country: "Polônia",
    stateCode: "POL",
    reputation: 3,
    primaryColor: "#005CA9",
    managerName: "Niels Frederiksen"
  },
  "8 JAGIELLONIA - POLONIA": {
    id: "eu_sp1_jag",
    name: "Jagiellonia Bialystok",
    shortName: "Jagiellonia",
    country: "Polônia",
    stateCode: "POL",
    reputation: 3,
    primaryColor: "#F5D000",
    managerName: "Adrian Siemieniec"
  },
  "9 GNK DINAMO ZAGREB - CROACIA": {
    id: "eu_sp1_dzg",
    name: "GNK Dinamo Zagreb",
    shortName: "Dinamo Zagreb",
    country: "Croácia",
    stateCode: "CRO",
    reputation: 4,
    primaryColor: "#003399",
    managerName: "Nenad Bjelica"
  },
  "10 SABAH FK - AZERBAIJÃO": {
    id: "eu_sp1_sbh",
    name: "Sabah FK",
    shortName: "Sabah FK",
    country: "Azerbaijão",
    stateCode: "AZE",
    reputation: 2,
    primaryColor: "#1E3A8A",
    managerName: "Krunoslav Rendulic"
  },
  "11 SLOVAN BRATISLAVA - ESLOVAQUIA": {
    id: "eu_sp1_slv",
    name: "Slovan Bratislava",
    shortName: "Slovan Bratislava",
    country: "Eslováquia",
    stateCode: "SVK",
    reputation: 3,
    primaryColor: "#009FE3",
    managerName: "Vladimir Weiss"
  },
  "12 FERENCVAROSI TC - HUNGRIA": {
    id: "eu_sp1_frv",
    name: "Ferencvárosi TC",
    shortName: "Ferencváros",
    country: "Hungria",
    stateCode: "HUN",
    reputation: 3,
    primaryColor: "#007A3D",
    managerName: "Pascal Jansen"
  },
  "13 LEVSKI SOFIA - BULGARIA": {
    id: "eu_sp1_lev",
    name: "PFC Levski Sofia",
    shortName: "Levski Sofia",
    country: "Bulgária",
    stateCode: "BUL",
    reputation: 2,
    primaryColor: "#004B87",
    managerName: "Stanislav Genchev"
  },
  "14 OMONIA NICOSIA - CHIPRE": {
    id: "eu_sp1_omo",
    name: "AC Omonia Nicosia",
    shortName: "Omonia",
    country: "Chipre",
    stateCode: "CYP",
    reputation: 2,
    primaryColor: "#007A3D",
    managerName: "Valdas Dambrauskas"
  },
  "15 NK CELJE - ESLOVENIA": {
    id: "eu_sp1_cel",
    name: "NK Celje",
    shortName: "NK Celje",
    country: "Eslovênia",
    stateCode: "SVN",
    reputation: 2,
    primaryColor: "#003366",
    managerName: "Albert Riera"
  },
  "16 TORREENSE - PORTUGAL": {
    id: "eu_sp1_tor",
    name: "SC União Torreense",
    shortName: "Torreense",
    country: "Portugal",
    stateCode: "POR",
    reputation: 2,
    primaryColor: "#15803D",
    managerName: "Tiago Fernandes"
  }
};

const LEAGUE_2_CLUBS = {
  "1 FK JABLONES - TCHEQUIA": {
    id: "eu_sp2_jab",
    name: "FK Jablonec",
    shortName: "Jablonec",
    country: "República Tcheca",
    stateCode: "CZE",
    reputation: 2,
    primaryColor: "#008000",
    managerName: "Lubos Kozel"
  },
  "2 HNK HAJDUK SLIT - CROACIA": {
    id: "eu_sp2_haj",
    name: "HNK Hajduk Split",
    shortName: "Hajduk Split",
    country: "Croácia",
    stateCode: "CRO",
    reputation: 3,
    primaryColor: "#FFFFFF",
    managerName: "Gennaro Gattuso"
  },
  "3 CSKA DOFIA - BULGARIA": {
    id: "eu_sp2_csk",
    name: "PFC CSKA Sofia",
    shortName: "CSKA Sofia",
    country: "Bulgária",
    stateCode: "BUL",
    reputation: 3,
    primaryColor: "#DC2626",
    managerName: "Aleksandar Tomash"
  },
  "4 PAFOS FC - CHIPRE": {
    id: "eu_sp2_paf",
    name: "Pafos FC",
    shortName: "Pafos FC",
    country: "Chipre",
    stateCode: "CYP",
    reputation: 2,
    primaryColor: "#004B87",
    managerName: "Juan Carlos Carcedo"
  },
  "5 HAPOEL BEER SHEVA - ISRAEL": {
    id: "eu_sp2_hbs",
    name: "Hapoel Be'er Sheva",
    shortName: "Be'er Sheva",
    country: "Israel",
    stateCode: "ISR",
    reputation: 2,
    primaryColor: "#DC2626",
    managerName: "Ran Kozuch"
  },
  "6 FC ARARAT-ARMENIA": {
    id: "eu_sp2_ara",
    name: "FC Ararat-Armenia",
    shortName: "Ararat-Armenia",
    country: "Armênia",
    stateCode: "ARM",
    reputation: 2,
    primaryColor: "#B91C1C",
    managerName: "Vardan Minasyan"
  },
  "7 FC STEUA BUCARESTE - ROMENIA": {
    id: "eu_sp2_ste",
    name: "FCSB (Steaua Bucareste)",
    shortName: "Steaua Bucareste",
    country: "Romênia",
    stateCode: "ROU",
    reputation: 3,
    primaryColor: "#C00000",
    managerName: "Elias Charalambous"
  },
  "8 ESTRELA VERMELHA - SERVIA": {
    id: "eu_sp2_est",
    name: "Estrela Vermelha",
    shortName: "Estrela Vermelha",
    country: "Sérvia",
    stateCode: "SRB",
    reputation: 3,
    primaryColor: "#D4021D",
    managerName: "Vladan Milojevic"
  },
  "9 RIGA FC - LETONIA": {
    id: "eu_sp2_rig",
    name: "Riga FC",
    shortName: "Riga FC",
    country: "Letônia",
    stateCode: "LVA",
    reputation: 2,
    primaryColor: "#0055A5",
    managerName: "Simo Valakari"
  },
  "10 FC BORAC - BOSNIA": {
    id: "eu_sp2_bor",
    name: "FK Borac Banja Luka",
    shortName: "Borac",
    country: "Bósnia e Herzegovina",
    stateCode: "BIH",
    reputation: 2,
    primaryColor: "#DC2626",
    managerName: "Mladen Zizovic"
  },
  "11 LINCOLN RED - GIBRALTAR": {
    id: "eu_sp2_lri",
    name: "Lincoln Red Imps",
    shortName: "Lincoln Red",
    country: "Gibraltar",
    stateCode: "GIB",
    reputation: 1,
    primaryColor: "#DC2626",
    managerName: "Javi Muñoz"
  },
  "12 KF EGNATIA - ALBANIA": {
    id: "eu_sp2_egn",
    name: "KF Egnatia",
    shortName: "Egnatia",
    country: "Albânia",
    stateCode: "ALB",
    reputation: 1,
    primaryColor: "#1E3A8A",
    managerName: "Edlir Tetova"
  },
  "13 KAIRAT - ZAQUISTÃO": {
    id: "eu_sp2_kai",
    name: "FC Kairat Almaty",
    shortName: "Kairat",
    country: "Cazaquistão",
    stateCode: "KAZ",
    reputation: 2,
    primaryColor: "#FACC15",
    managerName: "Rafael Urazbakhtin"
  },
  "14 KUOPION PALLOSEURA - FILANDIA": {
    id: "eu_sp2_kup",
    name: "KuPS Kuopio",
    shortName: "KuPS",
    country: "Finlândia",
    stateCode: "FIN",
    reputation: 2,
    primaryColor: "#FACC15",
    managerName: "Jani Honkavaara"
  },
  "15 FC KAUNO ZALFIRIS - LITUANIA": {
    id: "eu_sp2_zal",
    name: "FK Kauno Žalgiris",
    shortName: "Kauno Žalgiris",
    country: "Lituânia",
    stateCode: "LTU",
    reputation: 1,
    primaryColor: "#15803D",
    managerName: "Saulius Širmelis"
  },
  "16 INTER ESCALDES - ANDORRA": {
    id: "eu_sp2_esc",
    name: "Inter Club d'Escaldes",
    shortName: "Inter Escaldes",
    country: "Andorra",
    stateCode: "AND",
    reputation: 1,
    primaryColor: "#0033A0",
    managerName: "Otger Canals"
  }
};

const POSITION_MAP = {
  "Goleiro": "GOL",
  "Zagueiro": "ZAG",
  "Lateral Esq.": "LAT",
  "Lateral Dir.": "LAT",
  "Esq. Lateral": "LAT",
  "Diretor Lateral": "LAT",
  "Volante": "VOL",
  "Meio-Campo": "MEI",
  "Meia Central": "MEI",
  "Meia Ofensivo": "MEI",
  "Meia Direita": "MEI",
  "Meia Esquerda": "MEI",
  "Ponta-Esquerda": "ATA",
  "Ponta-Direita": "ATA",
  "Ponta Direita": "ATA",
  "Atacante": "ATA",
  "Centroavante": "ATA",
  "Seg. Atacante": "ATA"
};

const NAME_FIXES = {
  "Buracos de Tomas": "Tomáš Holeš",
  "Mercados Doski": "Merchas Doski",
  "Príncipe Adu": "Prince Adu",
  "Moisés Usor": "Moses Usor",
  "Do Queiroz": "Du Queiroz",
  "Cristão Nwachukwu": "Christian Nwachukwu",
  "Arte Smakaj": "Art Smakaj",
  "Dennis Político": "Dennis Politic",
  "Birka de Emil": "Emils Birka",
  "Nem Maviram": "Emmanuel Maviram",
  "Lucas África": "Lucas Áfrico",
  "Leão Ribeiro": "Leo Ribeiro",
  "Paulo Ayongo": "Paul Ayongo",
  "Cristo Evzonas": "Christos Evzonas",
  "Vitória Neokleous": "Viktor Neokleous",
  "Livro Danila": "Danila Kniga",
  "Félix Passlack": "Felix Passlack",
  "Sansão Dweh": "Sampson Dweh"
};

const STAR_OVERRIDES = {
  // Red Star
  "Vasilije Kostov": 80,
  "Adem Avdic": 78,
  "Bamba Dieng": 78,
  "Rade Krunic": 77,
  "Marko Arnautovic": 77,
  "Timi Max Elsnik": 76,
  "Mirko Ivanic": 76,
  "Osman Bukari": 76,
  "Tomás Handel": 76,
  "Milos Veljkovic": 75,
  "Franklin Tebo Uchenna": 75,
  "Matheus": 75,

  // Dinamo Zagreb
  "Dion Beljo": 79,
  "Sergi Domínguez": 78,
  "Scott McKenna": 76,
  "Mislav Orsic": 76,
  "Dominik Kotarski": 76,
  "Luka Stojkovic": 76,
  "Luka Ivanušec": 76,
  "Niko Galesic": 75,
  "Arbër Hoxha": 75,
  "Matteo Pérez Vinlöf": 75,

  // RB Salzburg
  "Karim Konaté": 79,
  "Edmund Baidoo": 78,
  "Bartosz Mazurek": 78,
  "Christian Zawieschitzky": 77,
  "Kevin Boma": 77,
  "Valentin Zabransky": 77,
  "Soumaïla Diabate": 77,
  "Sota Kitano": 76,
  "Stefan Lainer": 75,
  "Jesper Lindström": 76,
  "Yorbe Vertessen": 76,
  "Abubakr Barry": 75,
  "Nikolas Veratschnig": 75,
  "Dominik Schmid": 75,

  // Sturm Graz
  "Luca Weinhandl": 79,
  "Jacob Peter Hödl": 78,
  "Otar Kiteishvili": 76,
  "Oumar Diakité": 76,
  "Nelson Weiper": 76,
  "Joshua Quarshie": 76,
  "Daniil Khudyakov": 75,
  "Jon Gorenc Stankovic": 75,
  "Filip Rózga": 75,

  // Slavia Praga
  "Stepan Chaloupek": 78,
  "Davi Moisés": 78,
  "Michal Sadílek": 77,
  "David Zima": 76,
  "Lukas Provod": 76,
  "David Jurásek": 76,
  "Igoh Ogbu": 75,
  "Emmanuel Ayaosi": 75,
  "Mojmír Chytil": 75,
  "Tomas Holes": 75,

  // Sparta Praga
  "Adam Karabec": 77,
  "Jonatan Braut Brunes": 77,
  "Patrik Vydra": 76,
  "John Mercado": 76,
  "Josimar Alcócer": 76,
  "Tobias Guddal": 75,
  "Adam Sevinsky": 75,
  "Ki-Jana Hoever": 75,
  "Matej Jurasek": 75,
  "Pavel Kaderabek": 74,

  // Hajduk Split
  "Marko Livaja": 77,
  "Michele Sego": 76,
  "Leander Dendoncker": 76,
  "Marin Soticek": 75,
  "Simun Hrgovic": 75,
  "Dario Maresic": 74,
  "Adrion Pajaziti": 74,
  "Khalil Fayad": 74,

  // Lech Poznan
  "Wojciech Mońka": 78,
  "Michał Gurgul": 76,
  "Antoni Kozubal": 76,
  "Patrik Wålemark": 76,
  "Luis Palma": 75,
  "Terry Yegbe": 75,
  "Mikael Ishak": 75,

  // Jagiellonia
  "Slawomir Abramowicz": 75,
  "Bernardo Vital": 75,
  "Jeremy Agbonifo": 75,
  "Norbert Wojtuszek": 74,
  "Aleksandar Cirkovic": 74,
  "Jesús Imaz": 74,

  // Steaua (FCSB)
  "Ștefan Târnovanu": 75,
  "Denis Drăguș": 75,
  "Meriton Korenica": 75,
  "David Miculescu": 74,
  "Joyskim Dawa": 74,
  "Siyabonga Ngezana": 74,

  // LASK
  "Moses Usor": 77,
  "Sasa Kalajdzic": 76,
  "Samuel Adeniran": 76,
  "Melayro Bogarde": 75,
  "Xavier Mbuyamba": 75,
  "Kasper Jørgensen": 75,

  // Pafos FC
  "Biel": 75,
  "David Luiz": 74,
  "Ken Sema": 74,
  "Vlad Dragomir": 74,
  "Radoslaw Majecki": 74,
  "Ivan Šunjić": 74,

  // CSKA Sofia
  "Jean-Philippe Gbamin": 75,
  "Stefano Sensi": 75,
  "Leandro Godoy": 75,
  "Fedor Lapoukhov": 75,
  "Ioannis Pittas": 75,

  // Ferencvaros
  "Naby Keïta": 75,
  "Kristoffer Zachariassen": 75,
  "Lenny Joseph": 75,
  "Veljko Birmancevic": 75,
  "Bamidele Yusuf": 75
};

const KNOWN_NATIONS = [
  "Peru", "Perú",
  "Dinamarca", "Suécia", "Noruega", "Finlândia", "Islândia", "Portugal", "Holanda", "Bélgica", "Turquia", "Grécia", "Brasil", "Alemanha", "França", "Espanha", "Itália",
  "Inglaterra", "Argentina", "Uruguai", "Colômbia", "Equador", "Paraguai", "Chile", "Venezuela", "Bolívia",
  "Costa do Marfim", "Nigéria", "Senegal", "Gana", "Camarões", "Marrocos", "Argélia", "Egito", "Tunísia",
  "Mali", "RD do Congo", "RD Congo", "Guiné", "Guiné-Bissau", "Burkina Faso", "Gabão", "Angola", "Togo",
  "Gâmbia", "Cabo Verde", "Moçambique", "Benim", "Benin", "África do Sul", "Zimbabué", "Zimbábue", "Congo", "Comores",
  "Libéria", "Tanzânia", "Jordânia", "Croácia", "Sérvia", "Servia", "Bósnia e Herzegovina", "Bósnia-Herzegovina", "Bósnia",
  "Montenegro", "Macedônia do Norte", "Macedónia do Norte", "Eslovênia", "Eslovénia", "Eslováquia", "República Checa", "República Tcheca",
  "Polônia", "Polónia", "Hungria", "Romênia", "Roménia", "Bulgária", "Ucrânia", "Rússia", "Geórgia", "Albânia", "Kosovo",
  "Chipre", "Israel", "Síria", "Irã", "Irão", "Iraque", "Azerbaijão", "Uzbequistão", "Cazaquistão",
  "Áustria", "Escócia", "Irlanda do Norte", "Irlanda", "País de Gales", "Estados Unidos", "Canadá", "México", "Costa Rica", "Panamá", "Jamaica", "Honduras",
  "Haiti", "Curaçao", "Trinidad e Tobago", "Suriname", "Japão", "Coréia do Sul", "Coreia do Sul", "Austrália", "Nova Zelândia",
  "Quênia", "Quénia", "Uganda", "Luxemburgo", "Madagáscar", "Serra Leoa", "Guiana", "Ilhas Faroé", "Letônia", "Letónia", "Líbano",
  "Sudão do Sul", "Somália", "Estônia", "Estónia", "Burundi", "Eritreia", "Ruanda", "Lituânia", "Guatemala", "Zâmbia", "Nova",
  "Mauritânia", "Barbados", "São Cristóvão e Nevis", "Dominica", "Granada", "Hong Kong", "Moldávia", "Suíça", "Suiça", "Ir",
  "Bielorrússia", "Armênia", "Arménia", "Guadalupe", "Líbia", "Martinica", "Filipinas", "Cuba", "Nicarágua", "Etiópia",
  "República Central Africana", "Gibraltar", "Andorra", "Guiné Equatorial"
].sort((a, b) => b.length - a.length);

function extractNationality(infoLines, fallbackCountry) {
  for (const line of infoLines) {
    if (line.includes("\t”\t") || line.endsWith("\t”") || line.trim() === "”") {
      return fallbackCountry;
    }
    for (const n of KNOWN_NATIONS) {
      const escaped = n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const re = new RegExp("(?:^|[\\s\\t,/()\\-–])(" + escaped + ")(?:$|[\\s\\t,/()\\-–])", "i");
      if (re.test(line)) {
        if (n === "Ir") return "Togo";
        if (n === "Nova") return "Nova Zelândia";
        if (n === "Estónia") return "Estônia";
        if (n === "Letónia") return "Letônia";
        if (n === "Polónia") return "Polônia";
        if (n === "Coréia do Sul") return "Coreia do Sul";
        if (n === "Servia") return "Sérvia";
        if (n === "Quénia") return "Quênia";
        if (n === "Eslovénia") return "Eslovênia";
        if (n === "Macedónia do Norte") return "Macedônia do Norte";
        if (n === "Bósnia-Herzegovina" || n === "Bósnia") return "Bósnia e Herzegovina";
        if (n === "República Checa") return "República Tcheca";
        if (n === "RD do Congo") return "RD Congo";
        if (n === "Zimbábue") return "Zimbábue";
        if (n === "Perú") return "Peru";
        if (n === "Arménia") return "Armênia";
        if (n === "Roménia") return "Romênia";
        if (n === "Suiça") return "Suíça";
        return n;
      }
    }
  }
  return fallbackCountry;
}

function parseMarketValue(fullInfo) {
  const decMillions = fullInfo.match(/(?:€|EUR)?\s*([0-9]+[.,][0-9]+)\s*(?:mi\b|milhas\b|m\b)/i);
  if (decMillions) {
    return parseFloat(decMillions[1].replace(",", ".")) * 1000000;
  }
  const decMilhoes = fullInfo.match(/(?:€|EUR)?\s*([0-9]+[.,][0-9]+)\s*milhões/i);
  if (decMilhoes) {
    return parseFloat(decMilhoes[1].replace(",", ".")) * 1000000;
  }
  const decMilAsMi = fullInfo.match(/(?:€|EUR)?\s*([0-9]+[.,][0-9]+)\s*mil\b/i);
  if (decMilAsMi) {
    return parseFloat(decMilAsMi[1].replace(",", ".")) * 1000000;
  }
  const intMillions = fullInfo.match(/(?:€|EUR)?\s*([0-9]{1,2})\s*(?:mi\b|milhas\b)/i);
  if (intMillions) {
    return parseInt(intMillions[1], 10) * 1000000;
  }
  const intMilhoes = fullInfo.match(/(?:€|EUR)?\s*([0-9]+)\s*milhões/i);
  if (intMilhoes) {
    const val = parseInt(intMilhoes[1], 10);
    return val >= 50 ? val * 1000 : val * 1000000;
  }
  const thousands = fullInfo.match(/(?:€|EUR)?\s*([0-9]+)\s*(?:mil\b|k\b)/i);
  if (thousands) {
    return parseInt(thousands[1], 10) * 1000;
  }
  return 350000;
}

function calculateOvr(name, marketVal, rep, age) {
  if (STAR_OVERRIDES[name]) {
    return STAR_OVERRIDES[name];
  }
  let ovr = 67;
  if (marketVal >= 12000000) ovr = 79;
  else if (marketVal >= 7000000) ovr = 78;
  else if (marketVal >= 4500000) ovr = 76;
  else if (marketVal >= 2500000) ovr = 75;
  else if (marketVal >= 1500000) ovr = 74;
  else if (marketVal >= 900000) ovr = 72;
  else if (marketVal >= 500000) ovr = 70;
  else if (marketVal >= 250000) ovr = 68;
  else ovr = 66;

  if (age >= 33 && marketVal < 1000000) {
    ovr = Math.min(ovr, 73);
  }
  if (rep >= 4 && ovr < 76) ovr += 1;
  if (rep <= 1 && ovr > 71) ovr = 71;

  return Math.max(62, Math.min(84, ovr));
}

function generateRosterFile(sourceTxt, targetTs, clubConfig, exportVarName) {
  const rawText = fs.readFileSync(sourceTxt, 'utf-8');
  const lines = rawText.split(/\r?\n/).map(l => l.trim());

  let currentClubHeader = null;
  const parsedClubs = {};
  for (const h of Object.keys(clubConfig)) {
    parsedClubs[h] = [];
  }

  let idx = 0;
  while (idx < lines.length) {
    const line = lines[idx];
    if (clubConfig[line]) {
      currentClubHeader = line;
      idx++;
      continue;
    }
    if (!currentClubHeader) {
      idx++;
      continue;
    }

    if (POSITION_MAP[line]) {
      const pos = POSITION_MAP[line];
      let name = (lines[idx - 1] || "").split("\t")[0].trim();
      if (NAME_FIXES[name]) name = NAME_FIXES[name];

      let number = 0;
      if (idx >= 2) {
        const numMatch = lines[idx - 2].match(/^([0-9]{1,2})\b/);
        if (numMatch) number = parseInt(numMatch[1], 10);
      }
      if (!number || number <= 0 || number > 99) {
        number = parsedClubs[currentClubHeader].length + 1;
      }

      const infoLines = [];
      let age = 25;
      for (let f = 1; f <= 5; f++) {
        if (idx + f >= lines.length) break;
        const nextLine = lines[idx + f];
        if (clubConfig[nextLine] || POSITION_MAP[nextLine]) break;
        infoLines.push(nextLine);
        const ageMatch = nextLine.match(/\(([0-9]{2})\)/);
        if (ageMatch && !ageMatch[1].startsWith("0")) {
          age = parseInt(ageMatch[1], 10);
        }
      }

      const clubCountry = clubConfig[currentClubHeader].country;
      const nationality = extractNationality(infoLines, clubCountry);
      const mktVal = parseMarketValue(infoLines.join(" \t "));
      const rep = clubConfig[currentClubHeader].reputation;
      const ovr = calculateOvr(name, mktVal, rep, age);

      parsedClubs[currentClubHeader].push([name, pos, ovr, age, number, nationality]);
    }
    idx++;
  }

  let tsCode = `import { DetailedRole } from '../types/game';\n\n`;
  tsCode += `export interface SpecialClubData {\n`;
  tsCode += `  id: string;\n`;
  tsCode += `  name: string;\n`;
  tsCode += `  shortName: string;\n`;
  tsCode += `  country: string;\n`;
  tsCode += `  stateCode: string;\n`;
  tsCode += `  reputation: number;\n`;
  tsCode += `  primaryColor: string;\n`;
  tsCode += `  managerName: string;\n`;
  tsCode += `  players: Array<[string, DetailedRole, number, number, number, string]>;\n`;
  tsCode += `}\n\n`;
  tsCode += `export const ${exportVarName}: SpecialClubData[] = [\n`;

  for (const [header, conf] of Object.entries(clubConfig)) {
    const players = parsedClubs[header] || [];
    const usedNumbers = new Set();
    const adjustedPlayers = players.map(p => {
      let [name, pos, ovr, age, num, nat] = p;
      while (usedNumbers.has(num) || num <= 0 || num > 99) {
        num = (num % 99) + 1;
      }
      usedNumbers.add(num);
      return [name, pos, ovr, age, num, nat];
    });

    tsCode += `  {\n`;
    tsCode += `    id: ${JSON.stringify(conf.id)},\n`;
    tsCode += `    name: ${JSON.stringify(conf.name)},\n`;
    tsCode += `    shortName: ${JSON.stringify(conf.shortName)},\n`;
    tsCode += `    country: ${JSON.stringify(conf.country)},\n`;
    tsCode += `    stateCode: ${JSON.stringify(conf.stateCode)},\n`;
    tsCode += `    reputation: ${conf.reputation},\n`;
    tsCode += `    primaryColor: ${JSON.stringify(conf.primaryColor)},\n`;
    tsCode += `    managerName: ${JSON.stringify(conf.managerName)},\n`;
    tsCode += `    players: [\n`;
    for (const p of adjustedPlayers) {
      tsCode += `      [${JSON.stringify(p[0])}, ${JSON.stringify(p[1])}, ${p[2]}, ${p[3]}, ${p[4]}, ${JSON.stringify(p[5])}],\n`;
    }
    tsCode += `    ],\n`;
    tsCode += `  },\n`;
  }

  tsCode += `];\n`;

  fs.writeFileSync(targetTs, tsCode, 'utf-8');
  console.log(`Generated ${targetTs} successfully with ${Object.keys(clubConfig).length} clubs.`);
}

generateRosterFile(FILE_1, TARGET_TS_1, LEAGUE_1_CLUBS, "SPECIAL_LEAGUE_1_2026");
generateRosterFile(FILE_2, TARGET_TS_2, LEAGUE_2_CLUBS, "SPECIAL_LEAGUE_2_2026");
