const fs = require('fs');
const path = require('path');

const CHAMPIONSHIP_TXT = path.join(__dirname, '../public/assets/aistudio/INGLATERRA_2_3a5621bf.txt');
const TARGET_TS = path.join(__dirname, '../src/data/championship2026Rosters.ts');

const CLUB_CONFIG = {
  "WEST HAM": {
    id: "eu_whu",
    name: "West Ham United",
    shortName: "West Ham",
    reputation: 4,
    primaryColor: "#7A263A",
    managerName: "Graham Potter"
  },
  "WOLVERHAMPTON": {
    id: "eu_wol",
    name: "Wolverhampton Wanderers",
    shortName: "Wolves",
    reputation: 3,
    primaryColor: "#FDB913",
    managerName: "Vítor Pereira"
  },
  "MIDDLESBROUGH FC": {
    id: "eu_mid",
    name: "Middlesbrough FC",
    shortName: "Middlesbrough",
    reputation: 3,
    primaryColor: "#E03A3E",
    managerName: "Michael Carrick"
  },
  "SOUTHAMPTON FC": {
    id: "eu_sou",
    name: "Southampton FC",
    shortName: "Southampton",
    reputation: 4,
    primaryColor: "#D71920",
    managerName: "Will Still"
  },
  "FC BURNLEY": {
    id: "eu_bur",
    name: "Burnley FC",
    shortName: "Burnley",
    reputation: 3,
    primaryColor: "#6C1D45",
    managerName: "Scott Parker"
  },
  "SWANSEA CITY": {
    id: "eu_swa",
    name: "Swansea City",
    shortName: "Swansea",
    reputation: 3,
    primaryColor: "#111111",
    managerName: "Alan Sheehan"
  },
  "SHEFFIELD UNITED": {
    id: "eu_shu",
    name: "Sheffield United",
    shortName: "Sheff United",
    reputation: 3,
    primaryColor: "#EE2737",
    managerName: "Chris Wilder"
  },
  "NORWICH CITY": {
    id: "eu_nor",
    name: "Norwich City",
    shortName: "Norwich",
    reputation: 3,
    primaryColor: "#FFF200",
    managerName: "Johannes Hoff Thorup"
  },
  "STOKE CITY": {
    id: "eu_stk",
    name: "Stoke City",
    shortName: "Stoke City",
    reputation: 3,
    primaryColor: "#E03A3E",
    managerName: "Mark Robins"
  },
  "WREXHAM AFC": {
    id: "eu_wre",
    name: "Wrexham AFC",
    shortName: "Wrexham",
    reputation: 3,
    primaryColor: "#DC2626",
    managerName: "Phil Parkinson"
  },
  "BIRMINGHAM CITY": {
    id: "eu_bir",
    name: "Birmingham City",
    shortName: "Birmingham",
    reputation: 3,
    primaryColor: "#0000FF",
    managerName: "Chris Davies"
  },
  "WATFORD FC": {
    id: "eu_wat",
    name: "Watford FC",
    shortName: "Watford",
    reputation: 3,
    primaryColor: "#FBEE23",
    managerName: "Tom Cleverley"
  },
  "MILLWALL FC": {
    id: "eu_mil",
    name: "Millwall FC",
    shortName: "Millwall",
    reputation: 3,
    primaryColor: "#001D5E",
    managerName: "Alex Neil"
  },
  "WEST BROMWICH ALBION": {
    id: "eu_wba",
    name: "West Bromwich Albion",
    shortName: "West Brom",
    reputation: 3,
    primaryColor: "#122F67",
    managerName: "Tony Mowbray"
  },
  "BRISTOL CITY": {
    id: "eu_brc",
    name: "Bristol City",
    shortName: "Bristol City",
    reputation: 3,
    primaryColor: "#E21836",
    managerName: "Liam Manning"
  },
  "DERBY COUNTRY": {
    id: "eu_der",
    name: "Derby County",
    shortName: "Derby County",
    reputation: 3,
    primaryColor: "#111111",
    managerName: "John Eustace"
  },
  "QUEENS PARK RANGERS": {
    id: "eu_qpr",
    name: "Queens Park Rangers",
    shortName: "QPR",
    reputation: 3,
    primaryColor: "#1D5BA4",
    managerName: "Martí Cifuentes"
  },
  "PRESTON NORTH": {
    id: "eu_pne",
    name: "Preston North End",
    shortName: "Preston",
    reputation: 3,
    primaryColor: "#1E3A8A",
    managerName: "Paul Heckingbottom"
  },
  "CHARLTON": {
    id: "eu_cha",
    name: "Charlton Athletic",
    shortName: "Charlton",
    reputation: 3,
    primaryColor: "#D4021D",
    managerName: "Nathan Jones"
  },
  "PORTSMOUTH FC": {
    id: "eu_pom",
    name: "Portsmouth FC",
    shortName: "Portsmouth",
    reputation: 3,
    primaryColor: "#001489",
    managerName: "John Mousinho"
  },
  "BLACKBURN ROVERS": {
    id: "eu_rov",
    name: "Blackburn Rovers",
    shortName: "Blackburn",
    reputation: 3,
    primaryColor: "#009EE0",
    managerName: "Valérien Ismaël"
  },
  "BOLTON WANDERERS": {
    id: "eu_bol",
    name: "Bolton Wanderers",
    shortName: "Bolton",
    reputation: 3,
    primaryColor: "#1E3A8A",
    managerName: "Steven Schumacher"
  },
  "CARDIFF CITY": {
    id: "eu_car",
    name: "Cardiff City",
    shortName: "Cardiff",
    reputation: 3,
    primaryColor: "#0070B5",
    managerName: "Omer Riza"
  },
  "LINCOLN CITY": {
    id: "eu_lin",
    name: "Lincoln City",
    shortName: "Lincoln City",
    reputation: 2,
    primaryColor: "#DC2626",
    managerName: "Michael Skubala"
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
  "João Ruddy": "John Ruddy",
  "Sebastião Berhalter": "Sebastian Berhalter",
  "Jafé Tanganga": "Japhet Tanganga",
  "laminado de Cisell": "Lamine Cissé",
  "Osayi-Samuel brilhante": "Bright Osayi-Samuel",
  "João Solís": "Jhon Solís",
  "João Robinson": "Jack Robinson",
  "João Swift": "John Swift",
  "Ricardo O'Donnell": "Richard O'Donnell",
  "Nicolau Bilakapic": "Nicholas Bilokapic",
  "Menino Kemper": "Boy Kemper",
  "Vale Harvey": "Harvey Vale",
  "Cadeira Ilias": "Ilias Chair",
  "Paulo Smyth": "Paul Smyth",
  "Pacote Marlon": "Marlon Pack",
  "Sombra Tyrese": "Tyrese Shade",
  "Rua Rob": "Rob Street",
  "Ryan Um": "Ryan Oné",
  "Querida Yongwa": "Darlin Yongwa",
  "Mirko Tópico": "Mirko Topic",
  "Ciclo Larin": "Cyle Larin",
  "Divino Mubama": "Divin Mubama",
  "Paulo Farman": "Paul Farman",
  "Jorge Edmundson": "George Edmundson",
  "Lei McCabe": "Law McCabe",
  "Romeu Akachukwu": "Romeo Akachukwu",
  "Kyle Joseph": "Kyle Joseph"
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
  "Venezuela", "Guadalupe", "Martinica", "Indonésia", "Singapura", "Jordânia", "Namíbia"
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
  // e.g. €30.00mi or €15.00mi or € 22,00 milhões
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
  return 500000;
}

function calculateOvr(name, marketVal, rep, age) {
  let ovr = 70;
  if (marketVal >= 25000000) ovr = 81;
  else if (marketVal >= 20000000) ovr = 80;
  else if (marketVal >= 16000000) ovr = 78;
  else if (marketVal >= 12000000) ovr = 77;
  else if (marketVal >= 8000000) ovr = 76;
  else if (marketVal >= 5000000) ovr = 75;
  else if (marketVal >= 3000000) ovr = 74;
  else if (marketVal >= 2000000) ovr = 73;
  else if (marketVal >= 1000000) ovr = 71;
  else if (marketVal >= 500000) ovr = 69;
  else if (marketVal >= 200000) ovr = 67;
  else ovr = 65;

  if (age >= 34 && marketVal < 1000000) {
    ovr = Math.min(ovr, 72);
  }
  if (age <= 19 && marketVal >= 10000000) {
    ovr = Math.max(ovr, 76);
  }
  if (rep >= 4 && ovr < 75) ovr += 1;
  if (rep <= 2 && ovr > 74) ovr -= 1;

  // Key override highlights
  if (name === "Jarrod Bowen") ovr = 83;
  if (name === "Taty Castellanos") ovr = 81;
  if (name === "Arne Engels") ovr = 81;
  if (name === "André") ovr = 81;
  if (name === "Mateus Mané") ovr = 80;
  if (name === "Ladislav Krejci") ovr = 80;
  if (name === "Mads Hermansen") ovr = 78;
  if (name === "Zan Vipotnik") ovr = 79;
  if (name === "Fer López") ovr = 79;
  if (name === "Finn Azaz") ovr = 79;

  return Math.max(63, Math.min(84, ovr));
}

const rawText = fs.readFileSync(CHAMPIONSHIP_TXT, 'utf-8');
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
tsCode += `export interface ChampionshipClubData {\n`;
tsCode += `  id: string;\n`;
tsCode += `  name: string;\n`;
tsCode += `  shortName: string;\n`;
tsCode += `  reputation: number;\n`;
tsCode += `  primaryColor: string;\n`;
tsCode += `  managerName: string;\n`;
tsCode += `  players: Array<[string, DetailedRole, number, number, number, string]>;\n`;
tsCode += `}\n\n`;
tsCode += `export const CHAMPIONSHIP_LEAGUE_2026: ChampionshipClubData[] = [\n`;

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
