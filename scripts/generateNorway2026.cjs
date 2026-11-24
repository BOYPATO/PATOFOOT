const fs = require('fs');
const path = require('path');

const NORWAY_TXT = path.join(__dirname, '../public/assets/aistudio/NORUEGA_63cbf0e0.txt');
const TARGET_TS = path.join(__dirname, '../src/data/norway2026Rosters.ts');

const CLUB_CONFIG = {
  "FK BODO/GLIMT": {
    id: "eu_bod_no",
    name: "FK Bodø/Glimt",
    shortName: "Bodø/Glimt",
    reputation: 4,
    primaryColor: "#FACC15",
    managerName: "Kjetil Knutsen"
  },
  "VIKING FK": {
    id: "eu_vik_no",
    name: "Viking FK",
    shortName: "Viking",
    reputation: 3,
    primaryColor: "#002B49",
    managerName: "Bjarte Lunde Aarsheim"
  },
  "MOLDE FK": {
    id: "eu_mol_no",
    name: "Molde FK",
    shortName: "Molde",
    reputation: 4,
    primaryColor: "#0055A5",
    managerName: "Erling Moe"
  },
  "ROSENBORG BK": {
    id: "eu_rbk_no",
    name: "Rosenborg BK",
    shortName: "Rosenborg",
    reputation: 4,
    primaryColor: "#FFFFFF",
    managerName: "Alfred Johansson"
  },
  "SK BRANN": {
    id: "eu_bra_no",
    name: "SK Brann",
    shortName: "Brann",
    reputation: 3,
    primaryColor: "#DC2626",
    managerName: "Eirik Horneland"
  },
  "TROMSO IL": {
    id: "eu_tro_no",
    name: "Tromsø IL",
    shortName: "Tromsø",
    reputation: 3,
    primaryColor: "#DC2626",
    managerName: "Jørgen Vik"
  },
  "SARPSBORG 08 FF": {
    id: "eu_sar_no",
    name: "Sarpsborg 08",
    shortName: "Sarpsborg",
    reputation: 2,
    primaryColor: "#004F9F",
    managerName: "Christian Michelsen"
  },
  "SANDEFJORD FOTBALL": {
    id: "eu_san_no",
    name: "Sandefjord Fotball",
    shortName: "Sandefjord",
    reputation: 2,
    primaryColor: "#004B87",
    managerName: "Andreas Tegström"
  },
  "LILLESTROM SK": {
    id: "eu_lil_no",
    name: "Lillestrøm SK",
    shortName: "Lillestrøm",
    reputation: 3,
    primaryColor: "#FACC15",
    managerName: "Dag-Eilev Fagermo"
  },
  "KRISTIANSUND BK": {
    id: "eu_kri_no",
    name: "Kristiansund BK",
    shortName: "Kristiansund",
    reputation: 2,
    primaryColor: "#1D4ED8",
    managerName: "Amund Skiri"
  },
  "FREDRIKSTAD FK": {
    id: "eu_fre_no",
    name: "Fredrikstad FK",
    shortName: "Fredrikstad",
    reputation: 3,
    primaryColor: "#DC2626",
    managerName: "Mikkjal Thomassen"
  },
  "AALESUNDS FK": {
    id: "eu_aal_no",
    name: "Aalesunds FK",
    shortName: "Aalesund",
    reputation: 2,
    primaryColor: "#FF6600",
    managerName: "Kjetil Rekdal"
  },
  "VALERENGA FOTBALL ELITE": {
    id: "eu_val_no",
    name: "Vålerenga Fotball",
    shortName: "Vålerenga",
    reputation: 3,
    primaryColor: "#003399",
    managerName: "Geir Bakke"
  },
  "HAMARKAMERATESE": {
    id: "eu_ham_no",
    name: "HamKam",
    shortName: "HamKam",
    reputation: 2,
    primaryColor: "#15803D",
    managerName: "Jakob Michelsen"
  },
  "KAMERATENE OSLO": {
    id: "eu_kfu_no",
    name: "KFUM-Kameratene Oslo",
    shortName: "KFUM Oslo",
    reputation: 2,
    primaryColor: "#DC2626",
    managerName: "Johannes Moesgaard"
  },
  "IK START": {
    id: "eu_sta_no",
    name: "IK Start",
    shortName: "IK Start",
    reputation: 2,
    primaryColor: "#FACC15",
    managerName: "Azar Karadas"
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
  "Seg. Atacante": "ATA",
  "Centroavante": "ATA"
};

const NAME_FIXES = {
  "Auklend Especial": "Sondre Auklend",
  "Olá Brynhildsen": "Ola Brynhildsen",
  "Saunas Eirik": "Eirik Saunes",
  "Olá, visitei": "Ola Visted",
  "Promessa Meliga Jr.": "Promise Meliga Jr.",
  "Alberto Posiadala": "Albert Posiadala",
  "Simão Elias Rusen": "Simen Elias Rusen",
  "Isaías Skovsgaard": "Isak Skovsgaard",
};

const STAR_OVR_OVERRIDES = {
  "Patrick Berg": 78,
  "Jens Petter Hauge": 78,
  "Fredrik Bjørkan": 76,
  "Håkon Evjen": 76,
  "Nikita Haikin": 76,
  "Fredrik Sjøvold": 75,
  "Odin Bjørtuft": 75,
  "Ola Brynhildsen": 76,
  "Henrik Falschener": 75,
  "Joe Bell": 76,
  "Kristoffer Askildsen": 75,
  "Pedro Christiansen": 76,
  "Erik Bothheim": 76,
  "Zlatko Tripic": 75,
  "Emil Breivik": 76,
  "Oskar Spiten": 75,
  "Jalal Abdullai": 75,
  "Sivert Sira Hansen": 75,
  "Mathias Løvik": 75,
  "Tomas Nemcik": 75,
  "Amin Chiakha": 76,
  "Emil Konradsen Ceide": 75,
  "Simen Bolkan Nordli": 75,
  "Noah Holm": 76,
  "Mathias Dyngeland": 75,
  "Neraysho Kasanwirjo": 75,
  "Kristian Eriksen": 75,
  "Bård Finne": 75,
  "Kristall Máni Ingason": 75,
  "Alexandre Warneryd": 75,
  "Vegard Erlien": 74,
  "Heine Åsen Larsen": 74,
  "Daniel Karlsbakk": 76,
  "Aimar Sher": 75,
  "Vetle Walle Egeli": 74,
  "Evangelos Patoulidis": 74,
  "Gustav Nyheim": 75,
  "Pontus Dahlberg": 74,
  "Daniel Bassi": 74,
  "Félix Vá": 74,
  "Leander Alvheim": 75,
  "Wilfred George Igor": 74,
  "Zymer Bytyqi": 74,
  "Max Nilsson": 75,
  "Salim Laghzaoui": 75,
  "Marcus Reed": 75,
  "Mathias Christensen": 75,
  "Fidel Brice Ambina": 76,
  "Dennis Gjengaar": 75,
  "Mathias Grundetjern": 75,
  "Odin Thiago Holm": 75,
  "Aksel Baran Potur": 75,
  "Magnus Wolff Eikrem": 75,
  "Jesper Cornelius": 75,
  "Sander Granheim": 75,
};

const KNOWN_NATIONS = [
  "Peru",
  "Portugal", "Holanda", "Bélgica", "Turquia", "Grécia", "Brasil", "Alemanha", "França", "Espanha", "Itália",
  "Inglaterra", "Argentina", "Uruguai", "Colômbia", "Equador", "Paraguai", "Chile", "Venezuela", "Bolívia",
  "Costa do Marfim", "Nigéria", "Senegal", "Gana", "Camarões", "Marrocos", "Argélia", "Egito", "Tunísia",
  "Mali", "RD do Congo", "RD Congo", "Guiné", "Guiné-Bissau", "Guiné Bissau", "Burkina Faso", "Gabão", "Angola", "Togo",
  "Gâmbia", "Cabo Verde", "Moçambique", "Benim", "Benin", "África do Sul", "Zimbabué", "Congo", "Comores",
  "Libéria", "Tanzânia", "Jordânia", "Croácia", "Sérvia", "Bósnia e Herzegovina", "Bósnia-Herzegovina",
  "Montenegro", "Macedônia do Norte", "Eslovênia", "Eslováquia", "República Checa", "República Tcheca",
  "Polônia", "Polónia", "Hungria", "Romênia", "Bulgária", "Ucrânia", "Rússia", "Geórgia", "Albânia", "Kosovo",
  "Chipre", "Israel", "Síria", "Irã", "Iraque", "Azerbaijão", "Uzbequistão", "Cazaquistão", "Dinamarca",
  "Suécia", "Noruega", "Finlândia", "Islândia", "Suíça", "Áustria", "Escócia", "Irlanda", "País de Gales",
  "Irlanda do Norte", "Estados Unidos", "Canadá", "México", "Costa Rica", "Panamá", "Jamaica", "Honduras",
  "Haiti", "Curaçao", "Trinidad e Tobago", "Suriname", "Japão", "Coreia do Sul", "Austrália", "Nova Zelândia",
  "Somália", "Quênia", "Uganda", "Santa Lúcia", "Eritreia"
];

function extractNationality(infoLines) {
  for (const line of infoLines) {
    let earliestPos = 999999;
    let earliestNation = null;
    for (const n of KNOWN_NATIONS) {
      const escaped = n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const re = new RegExp("(?:^|[\\s\\t,/()\\-–])(" + escaped + ")(?:$|[\\s\\t,/()\\-–])", "i");
      const match = line.match(re);
      if (match) {
        const idx = line.indexOf(match[1]);
        if (idx !== -1 && idx < earliestPos) {
          earliestPos = idx;
          earliestNation = n;
        }
      }
    }
    if (earliestNation) {
      if (earliestNation === "Polónia") return "Polônia";
      if (earliestNation === "RD do Congo") return "RD Congo";
      if (earliestNation === "Bósnia-Herzegovina") return "Bósnia e Herzegovina";
      if (earliestNation === "Guiné Bissau") return "Guiné-Bissau";
      return earliestNation;
    }
  }
  return "Noruega";
}

function parseMarketValue(fullInfo) {
  const decMillions = fullInfo.match(/(?:€|EUR)?\s*([0-9]+[.,][0-9]+)\s*(?:mi\b|milhões|milhas|m\b)/i);
  if (decMillions) {
    return parseFloat(decMillions[1].replace(",", ".")) * 1000000;
  }
  const decMilAsMi = fullInfo.match(/(?:€|EUR)?\s*([0-9]+[.,][0-9]+)\s*mil\b/i);
  if (decMilAsMi) {
    return parseFloat(decMilAsMi[1].replace(",", ".")) * 1000000;
  }
  const intMillions = fullInfo.match(/(?:€|EUR)?\s*([0-9]+)\s*(?:mi\b|milhas\b)/i);
  if (intMillions) {
    return parseInt(intMillions[1], 10) * 1000000;
  }
  const intMilhoes = fullInfo.match(/(?:€|EUR)?\s*([0-9]+)\s+milhões/i);
  if (intMilhoes) {
    return parseInt(intMilhoes[1], 10) * 1000;
  }
  const thousands = fullInfo.match(/(?:€|EUR)?\s*([0-9]+)\s*(?:mil\b|k\b)/i);
  if (thousands) {
    return parseInt(thousands[1], 10) * 1000;
  }
  return 300000;
}

function calculateOvr(name, marketVal, rep, age) {
  if (STAR_OVR_OVERRIDES[name]) {
    return STAR_OVR_OVERRIDES[name];
  }
  let ovr = 67;
  if (marketVal >= 10000000) ovr = 78;
  else if (marketVal >= 5000000) ovr = 76;
  else if (marketVal >= 3000000) ovr = 75;
  else if (marketVal >= 2000000) ovr = 74;
  else if (marketVal >= 1200000) ovr = 73;
  else if (marketVal >= 700000) ovr = 71;
  else if (marketVal >= 400000) ovr = 69;
  else if (marketVal >= 200000) ovr = 67;
  else ovr = 65;

  if (age >= 33 && marketVal < 1000000) {
    ovr = Math.min(ovr, 72);
  }
  if (rep >= 4 && ovr < 75) ovr += 1;
  if (rep <= 2 && ovr > 74) ovr -= 1;

  return Math.max(63, Math.min(84, ovr));
}

const rawText = fs.readFileSync(NORWAY_TXT, 'utf-8');
const lines = rawText.split(/\r?\n/).map(l => l.trim());

let currentClubHeader = null;
const parsedClubs = {};
for (const h of Object.keys(CLUB_CONFIG)) {
  parsedClubs[h] = [];
}

let idx = 0;
while (idx < lines.length) {
  const line = lines[idx];
  if (CLUB_CONFIG[line]) {
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
      if (CLUB_CONFIG[nextLine] || POSITION_MAP[nextLine]) break;
      infoLines.push(nextLine);
      const ageMatch = nextLine.match(/\(([0-9]{2})\)/);
      if (ageMatch && !ageMatch[1].startsWith("0")) {
        age = parseInt(ageMatch[1], 10);
      }
    }

    const nationality = extractNationality(infoLines);
    const mktVal = parseMarketValue(infoLines.join(" \t "));
    const rep = CLUB_CONFIG[currentClubHeader].reputation;
    const ovr = calculateOvr(name, mktVal, rep, age);

    parsedClubs[currentClubHeader].push([name, pos, ovr, age, number, nationality]);
  }
  idx++;
}

let tsCode = `import { DetailedRole } from '../types/game';\n\n`;
tsCode += `export interface NorwayClubData {\n`;
tsCode += `  id: string;\n`;
tsCode += `  name: string;\n`;
tsCode += `  shortName: string;\n`;
tsCode += `  reputation: number;\n`;
tsCode += `  primaryColor: string;\n`;
tsCode += `  managerName: string;\n`;
tsCode += `  players: Array<[string, DetailedRole, number, number, number, string]>;\n`;
tsCode += `}\n\n`;
tsCode += `export const NORWAY_LEAGUE_2026: NorwayClubData[] = [\n`;

for (const [header, conf] of Object.entries(CLUB_CONFIG)) {
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

fs.writeFileSync(TARGET_TS, tsCode, 'utf-8');
console.log(`Generated ${TARGET_TS} successfully with ${Object.keys(CLUB_CONFIG).length} clubs.`);
