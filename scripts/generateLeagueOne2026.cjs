const fs = require('fs');
const path = require('path');

const LEAGUE_ONE_TXT = path.join(__dirname, '../public/assets/aistudio/INGLATERRA_3_6c0bc6a5.txt');
const TARGET_TS = path.join(__dirname, '../src/data/leagueOne2026Rosters.ts');

const CLUB_CONFIG = {
  "LEICESTER CITY": {
    id: "eu_lei",
    name: "Leicester City",
    shortName: "Leicester",
    reputation: 4,
    primaryColor: "#003090",
    managerName: "Ruud van Nistelrooy"
  },
  "LUTIN TOWN": {
    id: "eu_lut",
    name: "Luton Town",
    shortName: "Luton Town",
    reputation: 3,
    primaryColor: "#F78F1E",
    managerName: "Matt Bloomfield"
  },
  "SHEFFIELD WEDNESDAY": {
    id: "eu_shw",
    name: "Sheffield Wednesday",
    shortName: "Sheff Wed",
    reputation: 3,
    primaryColor: "#0066B3",
    managerName: "Danny Röhl"
  },
  "LEYTON ORIENT": {
    id: "eu_ley",
    name: "Leyton Orient",
    shortName: "Leyton Orient",
    reputation: 2,
    primaryColor: "#D4021D",
    managerName: "Richie Wellens"
  },
  "HUDDERSFIELD TOWN": {
    id: "eu_hud",
    name: "Huddersfield Town",
    shortName: "Huddersfield",
    reputation: 3,
    primaryColor: "#0E63AD",
    managerName: "Michael Duff"
  },
  "OXFORD UNITED": {
    id: "eu_oxf",
    name: "Oxford United",
    shortName: "Oxford Utd",
    reputation: 2,
    primaryColor: "#FACC15",
    managerName: "Gary Rowett"
  },
  "MILTON KEYNES DONS FC": {
    id: "eu_mkd",
    name: "Milton Keynes Dons",
    shortName: "MK Dons",
    reputation: 2,
    primaryColor: "#FFFFFF",
    managerName: "Scott Lindsey"
  },
  "BLACKPOOL FC": {
    id: "eu_bla",
    name: "Blackpool FC",
    shortName: "Blackpool",
    reputation: 2,
    primaryColor: "#F68712",
    managerName: "Steve Bruce"
  },
  "READING FC": {
    id: "eu_rea",
    name: "Reading FC",
    shortName: "Reading",
    reputation: 3,
    primaryColor: "#004494",
    managerName: "Noel Hunt"
  },
  "WIGAN": {
    id: "eu_wig",
    name: "Wigan Athletic",
    shortName: "Wigan",
    reputation: 3,
    primaryColor: "#005BAC",
    managerName: "Ryan Lowe"
  },
  "PLYMOUTH ARGYLE": {
    id: "eu_ply",
    name: "Plymouth Argyle",
    shortName: "Plymouth",
    reputation: 3,
    primaryColor: "#004A2F",
    managerName: "Miron Muslic"
  },
  "WYCOMBE WANDERERS": {
    id: "eu_wyc",
    name: "Wycombe Wanderers",
    shortName: "Wycombe",
    reputation: 2,
    primaryColor: "#0B3B60",
    managerName: "Mike Dodds"
  },
  "BRADFORD CITY": {
    id: "eu_bra_eng",
    name: "Bradford City",
    shortName: "Bradford City",
    reputation: 2,
    primaryColor: "#7A1727",
    managerName: "Graham Alexander"
  },
  "STOCKPORT COUNTRY": {
    id: "eu_sto",
    name: "Stockport County",
    shortName: "Stockport",
    reputation: 2,
    primaryColor: "#0055A5",
    managerName: "Dave Challinor"
  },
  "STEVENAGE FC": {
    id: "eu_ste",
    name: "Stevenage FC",
    shortName: "Stevenage",
    reputation: 2,
    primaryColor: "#DC2626",
    managerName: "Alex Revell"
  },
  "MANSFIELD TOWN": {
    id: "eu_man",
    name: "Mansfield Town",
    shortName: "Mansfield",
    reputation: 2,
    primaryColor: "#FACC15",
    managerName: "Nigel Clough"
  },
  "PETERBOROUGH UNITED": {
    id: "eu_pet",
    name: "Peterborough United",
    shortName: "Peterborough",
    reputation: 2,
    primaryColor: "#0054A6",
    managerName: "Darren Ferguson"
  },
  "NOTTS COUNTRY": {
    id: "eu_not",
    name: "Notts County",
    shortName: "Notts County",
    reputation: 2,
    primaryColor: "#111111",
    managerName: "Stuart Maynard"
  },
  "BARNSLEY FC": {
    id: "eu_bar",
    name: "Barnsley FC",
    shortName: "Barnsley",
    reputation: 2,
    primaryColor: "#E51837",
    managerName: "Darrell Clarke"
  },
  "DONCASTER ROVERS": {
    id: "eu_don",
    name: "Doncaster Rovers",
    shortName: "Doncaster",
    reputation: 2,
    primaryColor: "#DC2626",
    managerName: "Grant McCann"
  },
  "BURTON ALBION": {
    id: "eu_brt",
    name: "Burton Albion",
    shortName: "Burton Albion",
    reputation: 2,
    primaryColor: "#FACC15",
    managerName: "Gary Bowyer"
  },
  "AFC WIMBLEDON": {
    id: "eu_wim",
    name: "AFC Wimbledon",
    shortName: "Wimbledon",
    reputation: 2,
    primaryColor: "#1D4ED8",
    managerName: "Johnnie Jackson"
  },
  "BROMLEY FC": {
    id: "eu_bro",
    name: "Bromley FC",
    shortName: "Bromley",
    reputation: 2,
    primaryColor: "#111111",
    managerName: "Andy Woodman"
  },
  "CAMBRIDGE UNITED": {
    id: "eu_cam",
    name: "Cambridge United",
    shortName: "Cambridge Utd",
    reputation: 2,
    primaryColor: "#FDB913",
    managerName: "Garry Monk"
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
  "João Lundstram": "John Lundstram",
  "Sandália Sverre": "Sverre Sandal",
  "Emílio Lawrence": "Emilio Lawrence",
  "Isaías Jones": "Isaiah Jones",
  "José Olowu": "Joseph Olowu",
  "Rádio Balker": "Radinio Balker",
  "Antônio Gregory": "Anthony Gregory",
  "Sansão Tovide": "Samson Tovide",
  "Potência máxima": "Max Power",
  "José McCallum": "Joe McCallum",
  "Saxão Earley": "Saxon Earley",
  "Luís Thompson": "Louis Thompson",
  "Química Campbell": "Chem Campbell",
  "Luís Reed": "Louis Reed",
  "Caim e Dominação": "Kain Adom",
  "Esquadrão da Alma": "Soul Kader",
  "Luís Appéré": "Louis Appéré",
  "Almirante Bristric": "Admir Bristric",
  "Mateus Baker": "Matthew Baker",
  "Mateus Sorinola": "Matthew Sorinola",
  "Mateus Pennington": "Matthew Pennington",
  "Mateus Dennis": "Matthew Dennis",
  "Nicolau Oyekunle": "Nicholas Oyekunle",
  "Jorge Terrestre": "George Earthy",
  "Represa Jensen": "Jensen Weir",
  "Coleira Will": "Will Collar",
  "Jack Arms": "Jack Armer",
  "Arqueiro Ethon": "Ethon Archer",
  "Lutero James-Wildin": "Luther James-Wildin",
  "Pedro Kioso": "Peter Kioso",
  "Henrique Cartwright": "Henry Cartwright",
  "Marco O'Mahony": "Mark O'Mahony",
  "Marco Browne": "Marcus Browne",
  "Somto Bonifácio": "Somto Boniface",
  "Marcos McGuane": "Marcus McGuane"
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
  "Granada", "Ilhas Turcos e Caicos", "Iraque", "Malta", "Malawi", "Dominica", "Moldávia"
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
  return 350000;
}

function calculateOvr(name, marketVal, rep, age) {
  let ovr = 66;
  if (marketVal >= 8000000) ovr = 77;
  else if (marketVal >= 5000000) ovr = 75;
  else if (marketVal >= 3000000) ovr = 73;
  else if (marketVal >= 1800000) ovr = 71;
  else if (marketVal >= 1000000) ovr = 70;
  else if (marketVal >= 600000) ovr = 68;
  else if (marketVal >= 350000) ovr = 66;
  else if (marketVal >= 200000) ovr = 64;
  else ovr = 62;

  if (age >= 34 && marketVal < 500000) {
    ovr = Math.min(ovr, 68);
  }
  if (age <= 19 && marketVal >= 4000000) {
    ovr = Math.max(ovr, 73);
  }
  if (rep >= 4 && ovr < 73) ovr += 1;
  if (rep <= 2 && ovr > 71) ovr -= 1;

  // Key override highlights
  if (name === "Caleb Okoli") ovr = 77;
  if (name === "Emil Riis") ovr = 75;
  if (name === "Harry Howell") ovr = 75;
  if (name === "Tommy Watson") ovr = 75;
  if (name === "Lucas Thomas") ovr = 74;
  if (name === "Harry Souttar") ovr = 74;
  if (name === "Teden Mengi") ovr = 73;
  if (name === "Billy Mitchell") ovr = 73;
  if (name === "Louie Barry") ovr = 73;
  if (name === "Alfie Gilchrist") ovr = 73;
  if (name === "Ryan Wintle") ovr = 72;
  if (name === "Dan Barlaser") ovr = 71;

  return Math.max(58, Math.min(79, ovr));
}

const rawText = fs.readFileSync(LEAGUE_ONE_TXT, 'utf-8');
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
tsCode += `export interface LeagueOneClubData {\n`;
tsCode += `  id: string;\n`;
tsCode += `  name: string;\n`;
tsCode += `  shortName: string;\n`;
tsCode += `  reputation: number;\n`;
tsCode += `  primaryColor: string;\n`;
tsCode += `  managerName: string;\n`;
tsCode += `  players: Array<[string, DetailedRole, number, number, number, string]>;\n`;
tsCode += `}\n\n`;
tsCode += `export const LEAGUE_ONE_2026: LeagueOneClubData[] = [\n`;

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
