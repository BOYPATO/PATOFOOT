const fs = require('fs');
const path = require('path');

const LEAGUE_TWO_TXT = path.join(__dirname, '../public/assets/aistudio/INGLATERRA_4_cc447ff3.txt');
const TARGET_TS = path.join(__dirname, '../src/data/leagueTwo2026Rosters.ts');

const CLUB_CONFIG = {
  "SALFORD CITY": {
    id: "eu_sal",
    name: "Salford City",
    shortName: "Salford City",
    reputation: 2,
    primaryColor: "#DC2626",
    managerName: "Karl Robinson"
  },
  "PORT VALE FC": {
    id: "eu_pva",
    name: "Port Vale FC",
    shortName: "Port Vale",
    reputation: 2,
    primaryColor: "#111111",
    managerName: "Darren Moore"
  },
  "CHESTERFIELD FC": {
    id: "eu_chs",
    name: "Chesterfield FC",
    shortName: "Chesterfield",
    reputation: 2,
    primaryColor: "#004B87",
    managerName: "Paul Cook"
  },
  "ROTHERHAM UNITED": {
    id: "eu_rot",
    name: "Rotherham United",
    shortName: "Rotherham",
    reputation: 2,
    primaryColor: "#E21836",
    managerName: "Matt Hamshaw"
  },
  "BRISTOL ROVERS": {
    id: "eu_brr",
    name: "Bristol Rovers",
    shortName: "Bristol Rovers",
    reputation: 2,
    primaryColor: "#1D4ED8",
    managerName: "Iñigo Calderón"
  },
  "NORTHAMPTON TOWN": {
    id: "eu_nta",
    name: "Northampton Town",
    shortName: "Northampton",
    reputation: 2,
    primaryColor: "#7A1727",
    managerName: "Kevin Nolan"
  },
  "CREWE ALEXANDRA": {
    id: "eu_cre",
    name: "Crewe Alexandra",
    shortName: "Crewe",
    reputation: 2,
    primaryColor: "#DC2626",
    managerName: "Lee Bell"
  },
  "SWINDON TOWN FC": {
    id: "eu_swi",
    name: "Swindon Town FC",
    shortName: "Swindon Town",
    reputation: 2,
    primaryColor: "#DC2626",
    managerName: "Ian Holloway"
  },
  "COLCHESTER UINTED": {
    id: "eu_col",
    name: "Colchester United",
    shortName: "Colchester",
    reputation: 2,
    primaryColor: "#0055A5",
    managerName: "Danny Cowley"
  },
  "TRANMERE ROVERS": {
    id: "eu_tra",
    name: "Tranmere Rovers",
    shortName: "Tranmere",
    reputation: 2,
    primaryColor: "#1E3A8A",
    managerName: "Nigel Adkins"
  },
  "SHREWSBURY TOWN": {
    id: "eu_shr",
    name: "Shrewsbury Town",
    shortName: "Shrewsbury",
    reputation: 2,
    primaryColor: "#1D4ED8",
    managerName: "Gareth Ainsworth"
  },
  "BARNET FC": {
    id: "eu_bnt",
    name: "Barnet FC",
    shortName: "Barnet",
    reputation: 2,
    primaryColor: "#F78F1E",
    managerName: "Dean Brennan"
  },
  "NEWPORT COUNTRY": {
    id: "eu_npt",
    name: "Newport County",
    shortName: "Newport",
    reputation: 2,
    primaryColor: "#F78F1E",
    managerName: "Nelson Jardim"
  },
  "GRIMSBY TOWN": {
    id: "eu_gri",
    name: "Grimsby Town",
    shortName: "Grimsby Town",
    reputation: 2,
    primaryColor: "#111111",
    managerName: "David Artell"
  },
  "GILLINGHAM FC": {
    id: "eu_gil",
    name: "Gillingham FC",
    shortName: "Gillingham",
    reputation: 2,
    primaryColor: "#0055A5",
    managerName: "Mark Bonner"
  },
  "CRAWLEY TOWN FC": {
    id: "eu_cra",
    name: "Crawley Town FC",
    shortName: "Crawley Town",
    reputation: 2,
    primaryColor: "#DC2626",
    managerName: "Rob Elliot"
  },
  "WALSALL FC": {
    id: "eu_wal",
    name: "Walsall FC",
    shortName: "Walsall",
    reputation: 2,
    primaryColor: "#DC2626",
    managerName: "Mat Sadler"
  },
  "CHELTENHAM TOWN": {
    id: "eu_chl",
    name: "Cheltenham Town",
    shortName: "Cheltenham",
    reputation: 2,
    primaryColor: "#DC2626",
    managerName: "Michael Flynn"
  },
  "ROCHDALE AFC": {
    id: "eu_roc",
    name: "Rochdale AFC",
    shortName: "Rochdale",
    reputation: 2,
    primaryColor: "#1D4ED8",
    managerName: "Jimmy McNulty"
  },
  "EXETER CITY": {
    id: "eu_exe",
    name: "Exeter City",
    shortName: "Exeter City",
    reputation: 2,
    primaryColor: "#DC2626",
    managerName: "Gary Caldwell"
  },
  "ACCRINGTON STANLEY": {
    id: "eu_acc",
    name: "Accrington Stanley",
    shortName: "Accrington",
    reputation: 2,
    primaryColor: "#DC2626",
    managerName: "John Doolan"
  },
  "FLEETWOORD TOWN": {
    id: "eu_fle",
    name: "Fleetwood Town",
    shortName: "Fleetwood",
    reputation: 2,
    primaryColor: "#DC2626",
    managerName: "Pete Wild"
  },
  "OLDHAM": {
    id: "eu_old",
    name: "Oldham Athletic",
    shortName: "Oldham",
    reputation: 2,
    primaryColor: "#0055A5",
    managerName: "Micky Mellon"
  },
  "YORK CITY": {
    id: "eu_yor",
    name: "York City",
    shortName: "York City",
    reputation: 2,
    primaryColor: "#DC2626",
    managerName: "Adam Hinshelwood"
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
  "Meia Central": "MEI",
  "Meia Ofensivo": "MEI",
  "Meia Direita": "MEI",
  "Meia Esquerda": "MEI",
  "Ponta-Esquerda": "ATA",
  "Ponta-Direita": "ATA",
  "Ponta Direita": "ATA",
  "Centroavante": "ATA",
  "Seg. Atacante": "ATA"
};

const NAME_FIXES = {
  "Lua de Jaspe": "Jasper Moon",
  "Milagre Orisakwe": "Miracle Orisakwe",
  "Capa de Brandon": "Brandon Cover",
  "Paulo Mullin": "Paul Mullin",
  "Lista Elliott": "Elliott List",
  "Lucas Griffiths-Brown": "Luke Griffiths-Brown",
  "Paulo Digby": "Paul Digby",
  "Moisés Sesay": "Moses Sesay",
  "Harrison Masculino": "Harrison Male",
  "Mateus Smith": "Matthew Smith",
  "Moisés Alexander-Walker": "Moses Alexander-Walker",
  "Destino Kotey": "Destiny Kotey",
  "Antônio Evans": "Antony Evans",
  "Alberto Adomah": "Albert Adomah",
  "Dia de Joe": "Joe Day",
  "Ryan Leste": "Ryan East",
  "Lucas Hannant": "Luke Hannant",
  "Mateus Hudson": "Matthew Hudson",
  "Templo de Lewis": "Lewis Temple",
  "Joel Sênior": "Joel Senior",
  "Adam Sênior": "Adam Senior"
};

const KNOWN_NATIONS = [
  "Inglaterra", "Escócia", "País de Gales", "Irlanda", "Irlanda do Norte",
  "França", "Espanha", "Portugal", "Alemanha", "Holanda", "Bélgica", "Itália",
  "Brasil", "Argentina", "Uruguai", "Colômbia", "Chile", "Paraguai", "Peru",
  "Dinamarca", "Suécia", "Noruega", "Finlândia", "República Checa", "Eslováquia",
  "Polônia", "Croácia", "Sérvia", "Servia", "Bósnia e Herzegovina", "Bósnia-Herzegovina",
  "Áustria", "Suíça", "Suiça", "Hungria", "Grécia", "Turquia", "Romênia",
  "Estados Unidos", "Canadá", "México", "Jamaica", "Austrália", "Nova Zelândia", "Nova",
  "Nigéria", "Gana", "Senegal", "Camarões", "Costa do Marfim", "Mali", "Marrocos",
  "Argélia", "Tunísia", "Egito", "RD do Congo", "Congo", "Burkina Faso", "Zimbábue",
  "África do Sul", "Guiné", "Guiné-Bissau", "Angola", "Moçambique", "Japão",
  "Coréia do Sul", "Coreia do Sul", "Suriname", "Curaçao", "Curacao", "Haiti",
  "Albânia", "Israel", "Chipre", "Montenegro", "Eslovênia", "Eslovénia", "Islândia",
  "Comores", "Gabão", "Gâmbia", "Tanzânia", "Quênia", "Quénia", "Serra Leoa", "Libéria",
  "Benim", "Uganda", "Barbados", "Guiana", "Santa Lúcia", "Bermudas", "Trinidad e Tobago",
  "São Cristóvão e Nevis", "Montserrat", "Madagáscar", "Afeganistão", "Cazaquistão",
  "Geórgia", "Estônia", "Letônia", "Lituânia", "Kosovo", "Filipinas", "Panamá",
  "Venezuela", "Guadalupe", "Martinica", "Indonésia", "Singapura", "Jordânia", "Namíbia",
  "Granada", "Ilhas Turcos e Caicos", "Iraque", "Malta", "Malawi", "Dominica", "Moldávia",
  "Cuba"
];

function extractNationality(infoLines) {
  for (const line of infoLines) {
    let earliestNation = null;
    let earliestIndex = 9999;
    for (const nat of KNOWN_NATIONS) {
      const idx = line.indexOf(nat);
      if (idx !== -1 && idx < earliestIndex) {
        earliestIndex = idx;
        earliestNation = nat;
      }
    }
    if (earliestNation) {
      if (earliestNation === "Nova") return "Nova Zelândia";
      if (earliestNation === "Servia") return "Sérvia";
      if (earliestNation === "Suiça") return "Suíça";
      if (earliestNation === "Curacao") return "Curaçao";
      if (earliestNation === "Coréia do Sul") return "Coreia do Sul";
      if (earliestNation === "Quénia") return "Quênia";
      if (earliestNation === "Eslovénia") return "Eslovênia";
      if (earliestNation === "Bósnia-Herzegovina") return "Bósnia e Herzegovina";
      if (earliestNation === "República Checa") return "República Tcheca";
      if (earliestNation === "RD do Congo") return "RD Congo";
      return earliestNation;
    }
  }
  return "Inglaterra";
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
  return 200000;
}

function calculateOvr(name, marketVal, rep, age) {
  let ovr = 64;
  if (marketVal >= 2000000) ovr = 70;
  else if (marketVal >= 1000000) ovr = 69;
  else if (marketVal >= 600000) ovr = 67;
  else if (marketVal >= 400000) ovr = 66;
  else if (marketVal >= 250000) ovr = 64;
  else if (marketVal >= 150000) ovr = 63;
  else if (marketVal >= 75000) ovr = 61;
  else ovr = 59;

  if (age >= 34 && marketVal < 300000) {
    ovr = Math.min(ovr, 65);
  }
  if (age <= 19 && marketVal >= 500000) {
    ovr = Math.max(ovr, 66);
  }

  // Key override highlights
  if (name === "Paul Mullin") ovr = 71;
  if (name === "Joe Powell") ovr = 70;
  if (name === "Ben Woodburn") ovr = 69;
  if (name === "Dan Scarr") ovr = 68;
  if (name === "Jorge Grant") ovr = 68;
  if (name === "Will Norris") ovr = 68;

  return Math.max(56, Math.min(74, ovr));
}

const rawText = fs.readFileSync(LEAGUE_TWO_TXT, 'utf-8');
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
tsCode += `export interface LeagueTwoClubData {\n`;
tsCode += `  id: string;\n`;
tsCode += `  name: string;\n`;
tsCode += `  shortName: string;\n`;
tsCode += `  reputation: number;\n`;
tsCode += `  primaryColor: string;\n`;
tsCode += `  managerName: string;\n`;
tsCode += `  players: Array<[string, DetailedRole, number, number, number, string]>;\n`;
tsCode += `}\n\n`;
tsCode += `export const LEAGUE_TWO_2026: LeagueTwoClubData[] = [\n`;

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
