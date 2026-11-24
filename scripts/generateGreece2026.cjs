const fs = require('fs');
const path = require('path');

const GREECE_TXT = path.join(__dirname, '../public/assets/aistudio/GRECIA_4448b3b8.txt');
const TARGET_TS = path.join(__dirname, '../src/data/greece2026Rosters.ts');

const CLUB_CONFIG = {
  "OLYMPIACOS": {
    id: "eu_oly",
    name: "Olympiacos FC",
    shortName: "Olympiacos",
    reputation: 4,
    primaryColor: "#DC2626",
    managerName: "José Luis Mendilibar"
  },
  "PANATHINAIKOS": {
    id: "eu_pao",
    name: "Panathinaikos FC",
    shortName: "Panathinaikos",
    reputation: 4,
    primaryColor: "#007A33",
    managerName: "Rui Vitória"
  },
  "PAOK": {
    id: "eu_paok",
    name: "PAOK Salônica",
    shortName: "PAOK",
    reputation: 4,
    primaryColor: "#111111",
    managerName: "Răzvan Lucescu"
  },
  "AEK ATENAS": {
    id: "eu_aek",
    name: "AEK Atenas",
    shortName: "AEK Atenas",
    reputation: 4,
    primaryColor: "#FACC15",
    managerName: "Matías Almeyda"
  },
  "ARIS THESSALONIKI": {
    id: "eu_ari",
    name: "Aris Salônica",
    shortName: "Aris",
    reputation: 3,
    primaryColor: "#FACC15",
    managerName: "Marinos Ouzounidis"
  },
  "OFI CRETA": {
    id: "eu_ofi",
    name: "OFI Creta",
    shortName: "OFI Creta",
    reputation: 2,
    primaryColor: "#111111",
    managerName: "Milan Rastavac"
  },
  "LEVADIOKOS": {
    id: "eu_lev_gr",
    name: "Levadiakos FC",
    shortName: "Levadiakos",
    reputation: 2,
    primaryColor: "#16A34A",
    managerName: "Nikos Papadopoulos"
  },
  "ATROMITOS ATENAS": {
    id: "eu_atr",
    name: "Atromitos FC",
    shortName: "Atromitos",
    reputation: 2,
    primaryColor: "#0055A5",
    managerName: "Pablo García"
  },
  "VOLOS FC": {
    id: "eu_vol_gr",
    name: "Volos FC",
    shortName: "Volos",
    reputation: 2,
    primaryColor: "#1E3A8A",
    managerName: "Kostas Bratsos"
  },
  "PANETOLIKOS": {
    id: "eu_pne_gr",
    name: "Panetolikos FC",
    shortName: "Panetolikos",
    reputation: 2,
    primaryColor: "#F59E0B",
    managerName: "Giannis Petrakis"
  },
  "ASTERAS AKTOR": {
    id: "eu_ast",
    name: "Asteras Tripolis",
    shortName: "Asteras",
    reputation: 2,
    primaryColor: "#1E3A8A",
    managerName: "Savvas Pantelidis"
  },
  "KALAMATA FC": {
    id: "eu_kal_gr",
    name: "Kalamata FC",
    shortName: "Kalamata",
    reputation: 2,
    primaryColor: "#111111",
    managerName: "Nikos Anastopoulos"
  },
  "IRAKLIS SALONICA": {
    id: "eu_ira_gr",
    name: "Iraklis Salônica",
    shortName: "Iraklis",
    reputation: 2,
    primaryColor: "#0055A5",
    managerName: "Babis Tennes"
  },
  "KIFISIA FC": {
    id: "eu_kif",
    name: "AE Kifisia",
    shortName: "Kifisia",
    reputation: 2,
    primaryColor: "#0055A5",
    managerName: "Sebastián Leto"
  }
};

const POSITION_MAP = {
  "Goleiro": "GOL",
  "Zagueiro": "ZAG",
  "Lateral Esq.": "LAT",
  "Lateral Dir.": "LAT",
  "Esq. Lateral": "LAT",
  "Diretor Lateral": "LAT",
  "Lateral Direit": "LAT",
  "Lateral Esquer": "LAT",
  "Defensores": "ZAG",
  "Volante": "VOL",
  "Meio-Campo": "MEI",
  "Meia Central": "MEI",
  "Meia Ofensivo": "MEI",
  "Meia Direita": "MEI",
  "Meia Esquerda": "MEI",
  "Ponta-Esquerda": "ATA",
  "Ponta-Direita": "ATA",
  "Ponta Esquerda": "ATA",
  "Ponta Direita": "ATA",
  "Centroavante": "ATA",
  "Segundo Atacante": "ATA",
  "Atacante": "ATA"
};

const NAME_FIXES = {
  "de Marios Siabani": "Marios Siabanis",
  "Romano Yaremchuk": "Roman Yaremchuk",
  "Constantino Fortounis": "Konstantinos Fortounis",
  "Cristo Filho": "Christos Filis",
  "Cristo Alexiou": "Christos Alexiou",
  "Cristo Kamtsis": "Christos Kamtsis",
  "Milão Vitalis": "Milán Vitális",
  "Sócrates Dioudis": "Sokratis Dioudis",
  "Constantino Charoupas": "Konstantinos Charoupas",
  "Vasilios Atanásio": "Vasilios Athanasiou",
  "Teochari Tsingaras": "Theocharis Tsingaras",
  "Atanásio Karamanis": "Athanasios Karamanis",
  "Constantino Batos": "Konstantinos Batos",
  "Constantino Likourinos": "Konstantinos Lykourinos",
  "Keidi Nua": "Keidi Bare",
  "Constantino Pomonis": "Konstantinos Pomonis",
  "Crisanto Gezos": "Chrysanthos Gezos",
  "Ilíada Chatzitheodoridis": "Ilias Chatzitheodoridis",
  "Abacaxi": "Iñigo Piña",
  "Oh céus": "Nanú",
  "Constantino Policrácio": "Konstantinos Polykratis",
  "Constantino Apostolakis": "Konstantinos Apostolakis",
  "Constantino Lampsias": "Konstantinos Lampsias",
  "Constantino Roukounakis": "Konstantinos Roukounakis",
  "Imã Jagne": "Imam Jagne",
  "Lázaros Rota": "Lazaros Rota",
  "Lázaros Labrou": "Lazaros Labrou",
  "Jere Urons": "Jere Uronen"
};

const STAR_OVR_OVERRIDES = {
  "Leon Bailey": 82,
  "Azzedine Ounahi": 82,
  "Lovro Majer": 81,
  "Gustavo Sá": 81,
  "Luka Jović": 80,
  "Stefan Ortega": 80,
  "Stefan de Vrij": 80,
  "Santiago Hezze": 80,
  "Christos Zafeiris": 80,
  "Diego Costa": 80,
  "Andrija Zivkovic": 80,
  "Gustavo Puerta": 80,
  "Lorenzo Pirola": 79,
  "Jota Silva": 79,
  "Ayoub El Kaabi": 79,
  "Anass Salah-Eddine": 79,
  "Imrân Louza": 79,
  "Levi García": 79,
  "Davide Calabria": 79,
  "Facundo Pellistri": 79,
  "Simon Banza": 79,
  "Armando González": 79,
  "David Carmo": 78,
  "Panagiotis Retsos": 78,
  "Nair Tiknizyan": 78,
  "Roman Yaremchuk": 78,
  "Chiquinho": 78,
  "Remo Freuler": 78,
  "Gelson Martins": 78,
  "Rick van Drongelen": 78,
  "Victor Kristiansen": 78,
  "Pedro Chirivella": 78,
  "Iñaki Peña": 78,
  "Ognjen Ugresic": 78,
  "Kristijan Jakic": 78,
  "Mady Camara": 78,
  "Kiril Despodov": 78,
  "Harold Moukoudi": 78,
  "Kaan Kairinen": 78,
  "Răzvan Marin": 78,
  "Thomas Strakosha": 78,
  "Rafa Mir": 78,
  "Konstantinos Fortounis": 77,
  "Marius Mouandilmadji": 77,
  "Clayton": 77,
  "Santino Andino": 77,
  "Andreas Tetteh": 77,
  "Cyriel Dessers": 77,
  "Tom Louchet": 77,
  "Cherif Ndiaye": 77,
  "Giannis Michailidis": 77,
  "Greg Taylor": 77,
  "Fedor Chalov": 77,
  "Dimitrios Giannoulis": 77,
  "Taison": 77,
  "Jiri Pavlenka": 77,
  "Aboubakary Koita": 77,
  "Oleksandr Zubkov": 77,
  "Filipe Relvas": 77,
  "Lazaros Rota": 77,
  "Barnabás Varga": 77,
  "João Mário": 77,
  "Manu García": 77,
  "Ricardo Velho": 77,
  "Bruma": 77,
  "Abdul Rahman Baba": 76,
  "Domagoj Vida": 76,
  "Petros Mantalos": 76,
  "Moussa Sissoko": 76,
  "Adriano Jagusic": 76,
  "Vicente Taborda": 76,
  "Benjamin Garré": 76,
  "Uros Racic": 76,
  "Loren Morón": 76,
  "Christian Kouamé": 76,
  "Mohamed Elneny": 75,
  "Jonathan Panzo": 74,
  "Seny Dieng": 74,
  "Steven Zuber": 74,
  "Dani García": 73,
  "Rémy Cabella": 74,
  "Marvelous Nakamba": 74,
  "Moussa Djenepo": 73,
  "Federico Macheda": 73,
  "Moisés Ramírez": 74,
  "Jordi Mboula": 73
};

const KNOWN_NATIONS = [
  "Peru", // Will map to Turquia
  "Grécia", "Brasil", "Portugal", "Alemanha", "França", "Espanha", "Itália", "Holanda", "Bélgica",
  "Inglaterra", "Argentina", "Uruguai", "Colômbia", "Equador", "Paraguai", "Chile", "Venezuela", "Bolívia",
  "Costa do Marfim", "Nigéria", "Senegal", "Gana", "Camarões", "Marrocos", "Argélia", "Egito", "Tunísia",
  "Mali", "RD do Congo", "RD Congo", "Guiné", "Guiné-Bissau", "Burkina Faso", "Gabão", "Angola", "Togo",
  "Gâmbia", "Cabo Verde", "Moçambique", "Benim", "Benin", "África do Sul", "Zimbabué", "Zimbábue", "Congo", "Comores",
  "Libéria", "Tanzânia", "Jordânia", "Croácia", "Sérvia", "Servia", "Bósnia e Herzegovina", "Bósnia-Herzegovina",
  "Montenegro", "Macedônia do Norte", "Macedónia do Norte", "Eslovênia", "Eslováquia", "República Checa", "República Tcheca",
  "Polônia", "Hungria", "Romênia", "Roménia", "Bulgária", "Turquia", "Ucrânia", "Rússia", "Geórgia", "Albânia", "Kosovo",
  "Chipre", "Israel", "Síria", "Irã", "Iraque", "Azerbaijão", "Uzbequistão", "Cazaquistão", "Dinamarca",
  "Suécia", "Noruega", "Finlândia", "Islândia", "Suíça", "Suiça", "Áustria", "Escócia", "Irlanda", "País de Gales",
  "Estados Unidos", "Canadá", "México", "Costa Rica", "Panamá", "Jamaica", "Honduras", "Haiti", "Curaçao",
  "Trinidad e Tobago", "Martinica", "Guadalupe", "Suriname", "Japão", "Coréia do Sul", "Coreia do Sul",
  "Austrália", "Nova Zelândia", "Chade", "Armênia", "Zâmbia", "Somália", "Mauritânia", "Moldávia", "Cuba",
  "Guiné Equatorial", "Bielorrússia", "Ruanda"
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
      if (earliestNation === "Peru") return "Turquia";
      if (earliestNation === "Servia") return "Sérvia";
      if (earliestNation === "Bósnia-Herzegovina") return "Bósnia e Herzegovina";
      if (earliestNation === "Macedónia do Norte") return "Macedônia do Norte";
      if (earliestNation === "Roménia") return "Romênia";
      if (earliestNation === "Suiça") return "Suíça";
      if (earliestNation === "Zimbábue") return "Zimbabué";
      if (earliestNation === "RD do Congo") return "RD Congo";
      if (earliestNation === "Coréia do Sul") return "Coreia do Sul";
      if (earliestNation === "Benim") return "Benin";
      return earliestNation;
    }
  }
  return "Grécia";
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
  let ovr = 66;
  if (marketVal >= 20000000) ovr = 80;
  else if (marketVal >= 12000000) ovr = 79;
  else if (marketVal >= 8000000) ovr = 78;
  else if (marketVal >= 5000000) ovr = 77;
  else if (marketVal >= 3000000) ovr = 75;
  else if (marketVal >= 2000000) ovr = 74;
  else if (marketVal >= 1000000) ovr = 72;
  else if (marketVal >= 600000) ovr = 70;
  else if (marketVal >= 300000) ovr = 68;
  else ovr = 66;

  if (age >= 33 && marketVal < 1500000) {
    ovr = Math.min(ovr, 72);
  }
  if (rep >= 4 && ovr < 75) ovr += 1;
  if (rep <= 2 && ovr > 74) ovr -= 1;

  return Math.max(62, Math.min(84, ovr));
}

const rawText = fs.readFileSync(GREECE_TXT, 'utf-8');
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

    // Shirt number from lines[idx - 2]
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

// Generate TS code
let tsCode = `import { DetailedRole } from '../types/game';\n\n`;
tsCode += `export interface GreeceClubData {\n`;
tsCode += `  id: string;\n`;
tsCode += `  name: string;\n`;
tsCode += `  shortName: string;\n`;
tsCode += `  reputation: number;\n`;
tsCode += `  primaryColor: string;\n`;
tsCode += `  managerName: string;\n`;
tsCode += `  players: Array<[string, DetailedRole, number, number, number, string]>;\n`;
tsCode += `}\n\n`;
tsCode += `export const GREECE_LEAGUE_2026: GreeceClubData[] = [\n`;

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
