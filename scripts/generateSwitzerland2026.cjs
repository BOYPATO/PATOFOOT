const fs = require('fs');
const path = require('path');

const SWISS_TXT = path.join(__dirname, '../public/assets/aistudio/SUICA_4cee4fea.txt');
const TARGET_TS = path.join(__dirname, '../src/data/switzerland2026Rosters.ts');

const CLUB_CONFIG = {
  "BSC YOUNG BOYS": {
    id: "eu_yb_ch",
    name: "BSC Young Boys",
    shortName: "Young Boys",
    reputation: 4,
    primaryColor: "#FACC15",
    managerName: "Patrick Rahmen"
  },
  "FC BASEL": {
    id: "eu_bas_ch",
    name: "FC Basel 1893",
    shortName: "FC Basel",
    reputation: 4,
    primaryColor: "#DC2626",
    managerName: "Fabio Celestini"
  },
  "FC LUGANO": {
    id: "eu_lug_ch",
    name: "FC Lugano",
    shortName: "Lugano",
    reputation: 3,
    primaryColor: "#111111",
    managerName: "Mattia Croci-Torti"
  },
  "FC SION": {
    id: "eu_sio_ch",
    name: "FC Sion",
    shortName: "FC Sion",
    reputation: 3,
    primaryColor: "#DC2626",
    managerName: "Didier Tholot"
  },
  "FC LAUSANNE-SPORT": {
    id: "eu_lau_ch",
    name: "FC Lausanne-Sport",
    shortName: "Lausanne-Sport",
    reputation: 3,
    primaryColor: "#0055A5",
    managerName: "Ludovic Magnin"
  },
  "FC ST. GALLEN 1879": {
    id: "eu_stg_ch",
    name: "FC St. Gallen 1879",
    shortName: "St. Gallen",
    reputation: 3,
    primaryColor: "#15803D",
    managerName: "Enrico Maassen"
  },
  "FC LUZERN": {
    id: "eu_luz_ch",
    name: "FC Luzern",
    shortName: "Luzern",
    reputation: 3,
    primaryColor: "#003399",
    managerName: "Mario Frick"
  },
  "SERVETTE FC": {
    id: "eu_ser_ch",
    name: "Servette FC",
    shortName: "Servette",
    reputation: 3,
    primaryColor: "#7E1B2C",
    managerName: "Thomas Häberli"
  },
  "FC THUN": {
    id: "eu_thu_ch",
    name: "FC Thun",
    shortName: "FC Thun",
    reputation: 2,
    primaryColor: "#DC2626",
    managerName: "Mauro Lustrinelli"
  },
  "Grasshopper Club Zurique": {
    id: "eu_gcz_ch",
    name: "Grasshopper Club Zürich",
    shortName: "Grasshoppers",
    reputation: 3,
    primaryColor: "#004F9F",
    managerName: "Marco Schällibaum"
  },
  "FC XURIQUE": {
    id: "eu_fcz_ch",
    name: "FC Zürich",
    shortName: "FC Zürich",
    reputation: 3,
    primaryColor: "#0055A5",
    managerName: "Ricardo Moniz"
  },
  "FC VADUZ": {
    id: "eu_vad_ch",
    name: "FC Vaduz",
    shortName: "FC Vaduz",
    reputation: 2,
    primaryColor: "#DC2626",
    managerName: "Marc Schneider"
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
  "Flávio Daniliuc": "Flavius Daniliuc",
  "Vitória de Akpe": "Victory Akpe",
  "Porca Asane": "Assane Sow",
  "Carbono": "Leonardo Carboni",
  "Urânio Bislimi": "Uran Bislimi",
  "Simão Caillet": "Simon Caillet",
  "Vila Lorenzo": "Lorenzo Villa",
  "Emília Grosso": "Emilio Grosso",
  "Batata Morgan": "Morgan Poaty",
  "Simão Simoni": "Simon Simoni",
};

const STAR_OVR_OVERRIDES = {
  "Alvyn Sanches": 78,
  "Marvin Keller": 77,
  "Bahereba Guirassy": 77,
  "Moritz Jenz": 76,
  "Cédric Zesiger": 76,
  "Samuel Essende": 76,
  "Alan Virginius": 75,
  "Stefan Bukinac": 75,
  "Dominik Pech": 75,
  "Edimilson Fernandes": 75,
  "Christian Fassnacht": 75,
  "Metinho": 78,
  "Xherdan Shaqiri": 78,
  "Flavius Daniliuc": 76,
  "Victory Akpe": 75,
  "Filipe Otele": 75,
  "Kazeem Olaigbe": 75,
  "Assane Sow": 75,
  "Keigo Tsunemoto": 75,
  "Becir Omeragic": 75,
  "Giacomo Koloto": 75,
  "Zan Celar": 75,
  "Mattia Zanotti": 77,
  "Antonios Papadopoulos": 76,
  "Dereck Moncada": 76,
  "Martim Marques": 76,
  "Lucas Mai": 75,
  "Yanis Cimignani": 75,
  "Daniel Dos Santos": 75,
  "Renato Steffen": 75,
  "Albian Ajeti": 75,
  "Uran Bislimi": 75,
  "Winsley Boteli": 78,
  "Ilyas Chouaref": 76,
  "Baltazar": 75,
  "Rilind Nivokazi": 75,
  "Anthony Racioppi": 74,
  "Jan Kronig": 74,
  "Karim Sow": 76,
  "Omar Janneh": 76,
  "Koba Koindredi": 75,
  "Étienne Youté Kinkoué": 75,
  "Nicolas Cozza": 75,
  "Brandon Soppy": 74,
  "Cyrill May": 75,
  "Christian Witzig": 75,
  "Carlo Boukhalfa": 75,
  "Aliou Baldé": 75,
  "Lawrence Ati Zigi": 75,
  "Matteo Di Giusto": 76,
  "Oscar Kabwit": 75,
  "Daniel Mikolajewski": 75,
  "Lucas Silva": 75,
  "Bung Meng Freimann": 75,
  "Karlo Letica": 75,
  "Kingstone Mutandwa": 76,
  "Jesper Karlsson": 76,
  "David Datro Fofana": 75,
  "Timothé Cognat": 75,
  "Miroslav Stevanovic": 76,
  "Edvinas Gertmonas": 74,
  "Niklas Steffen": 74,
  "Riccardo Braschi": 74,
  "Samuel Krasniqi": 75,
  "Simone Stroscio": 74,
  "Tim Meyer": 74,
  "Philippe Keny": 75,
  "Umeh Emmanuel": 75,
  "Silas Huber": 74,
  "Lutfi Dalipi": 74,
  "Corsin Konietzke": 74,
};

const KNOWN_NATIONS = [
  "Peru",
  "Suiça", "Suíça", "Liechtenstein", "Portugal", "Holanda", "Bélgica", "Turquia", "Grécia", "Brasil", "Alemanha", "França", "Espanha", "Itália",
  "Inglaterra", "Argentina", "Uruguai", "Colômbia", "Equador", "Paraguai", "Chile", "Venezuela", "Bolívia",
  "Costa do Marfim", "Nigéria", "Senegal", "Gana", "Camarões", "Marrocos", "Argélia", "Egito", "Tunísia",
  "Mali", "RD do Congo", "RD Congo", "Guiné", "Guiné-Bissau", "Burkina Faso", "Gabão", "Angola", "Togo",
  "Gâmbia", "Cabo Verde", "Moçambique", "Benim", "Benin", "África do Sul", "Zimbabué", "Congo", "Comores",
  "Libéria", "Tanzânia", "Jordânia", "Croácia", "Sérvia", "Servia", "Bósnia e Herzegovina", "Bósnia-Herzegovina",
  "Montenegro", "Macedônia do Norte", "Macedónia do Norte", "Eslovênia", "Eslováquia", "República Checa", "República Tcheca",
  "Polônia", "Hungria", "Romênia", "Bulgária", "Ucrânia", "Rússia", "Geórgia", "Albânia", "Kosovo",
  "Chipre", "Israel", "Síria", "Irã", "Irão", "Iraque", "Azerbaijão", "Uzbequistão", "Cazaquistão", "Dinamarca",
  "Suécia", "Noruega", "Finlândia", "Islândia", "Áustria", "Escócia", "Irlanda", "País de Gales",
  "Estados Unidos", "Canadá", "México", "Costa Rica", "Panamá", "Jamaica", "Honduras",
  "Haiti", "Curaçao", "Trinidad e Tobago", "Suriname", "Japão", "Coreia do Sul", "Austrália", "Nova Zelândia",
  "Zâmbia", "Mauritânia", "Moldávia", "Letônia", "Lituânia", "Estônia", "Afeganistão", "Sri Lanka", "Guiana Francesa", "Guadalupe", "Martinica"
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
      if (earliestNation === "Suiça") return "Suíça";
      if (earliestNation === "Servia") return "Sérvia";
      if (earliestNation === "Irão") return "Irã";
      if (earliestNation === "Macedónia do Norte") return "Macedônia do Norte";
      if (earliestNation === "Bósnia-Herzegovina") return "Bósnia e Herzegovina";
      if (earliestNation === "República Checa") return "República Tcheca";
      if (earliestNation === "RD do Congo") return "RD Congo";
      return earliestNation;
    }
  }
  return "Suíça";
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
  return 350000;
}

function calculateOvr(name, marketVal, rep, age) {
  if (STAR_OVR_OVERRIDES[name]) {
    return STAR_OVR_OVERRIDES[name];
  }
  let ovr = 67;
  if (marketVal >= 12000000) ovr = 78;
  else if (marketVal >= 7000000) ovr = 77;
  else if (marketVal >= 4000000) ovr = 75;
  else if (marketVal >= 2500000) ovr = 74;
  else if (marketVal >= 1500000) ovr = 73;
  else if (marketVal >= 800000) ovr = 71;
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

const rawText = fs.readFileSync(SWISS_TXT, 'utf-8');
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
tsCode += `export interface SwitzerlandClubData {\n`;
tsCode += `  id: string;\n`;
tsCode += `  name: string;\n`;
tsCode += `  shortName: string;\n`;
tsCode += `  reputation: number;\n`;
tsCode += `  primaryColor: string;\n`;
tsCode += `  managerName: string;\n`;
tsCode += `  players: Array<[string, DetailedRole, number, number, number, string]>;\n`;
tsCode += `}\n\n`;
tsCode += `export const SWITZERLAND_LEAGUE_2026: SwitzerlandClubData[] = [\n`;

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
