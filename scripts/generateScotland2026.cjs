const fs = require('fs');
const path = require('path');

const SCOTLAND_TXT = path.join(__dirname, '../public/assets/aistudio/ESCOCIA_f95514a3.txt');
const TARGET_TS = path.join(__dirname, '../src/data/scotland2026Rosters.ts');

const CLUB_CONFIG = {
  "RANGERS FC": {
    id: "eu_sco_ran",
    name: "Rangers FC",
    shortName: "Rangers",
    reputation: 4,
    primaryColor: "#0033A0",
    managerName: "Philippe Clement"
  },
  "CELTIC FC": {
    id: "eu_sco_cel",
    name: "Celtic FC",
    shortName: "Celtic",
    reputation: 4,
    primaryColor: "#018749",
    managerName: "Brendan Rodgers"
  },
  "HEART OF MIDLOTHIAN FC": {
    id: "eu_sco_hea",
    name: "Heart of Midlothian FC",
    shortName: "Hearts",
    reputation: 3,
    primaryColor: "#800000",
    managerName: "Neil Critchley"
  },
  "HIBERNIAN FC": {
    id: "eu_sco_hib",
    name: "Hibernian FC",
    shortName: "Hibernian",
    reputation: 3,
    primaryColor: "#006633",
    managerName: "David Gray"
  },
  "MOTHERWELL FC": {
    id: "eu_sco_mot",
    name: "Motherwell FC",
    shortName: "Motherwell",
    reputation: 2,
    primaryColor: "#C49600",
    managerName: "Stuart Kettlewell"
  },
  "ABERDEEN FC": {
    id: "eu_sco_abe",
    name: "Aberdeen FC",
    shortName: "Aberdeen",
    reputation: 3,
    primaryColor: "#E31B23",
    managerName: "Jimmy Thelin"
  },
  "DUNDEE UNITED FC": {
    id: "eu_sco_dnu",
    name: "Dundee United FC",
    shortName: "Dundee United",
    reputation: 2,
    primaryColor: "#F37021",
    managerName: "Jim Goodwin"
  },
  "ST. MIRREN FC": {
    id: "eu_sco_stm",
    name: "St. Mirren FC",
    shortName: "St. Mirren",
    reputation: 2,
    primaryColor: "#000000",
    managerName: "Stephen Robinson"
  },
  "DUNDEE FC": {
    id: "eu_sco_dun",
    name: "Dundee FC",
    shortName: "Dundee FC",
    reputation: 2,
    primaryColor: "#002B49",
    managerName: "Tony Docherty"
  },
  "KIMARNOCK FC": {
    id: "eu_sco_kil",
    name: "Kilmarnock FC",
    shortName: "Kilmarnock",
    reputation: 2,
    primaryColor: "#004F9F",
    managerName: "Derek McInnes"
  },
  "ST, JOHNSTONE FC": {
    id: "eu_sco_stj",
    name: "St. Johnstone FC",
    shortName: "St. Johnstone",
    reputation: 2,
    primaryColor: "#002D62",
    managerName: "Simo Valakari"
  },
  "FALKIRK FC": {
    id: "eu_sco_fal",
    name: "Falkirk FC",
    shortName: "Falkirk",
    reputation: 2,
    primaryColor: "#002B5C",
    managerName: "John McGlynn"
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
  "Centroavante": "ATA"
};

const NAME_FIXES = {
  "João Souttar": "John Souttar",
  "Rochoso Bushiri": "Rocky Bushiri",
  "Jordânia Obita": "Jordan Obita",
  "Rabino Matondo": "Rabbi Matondo",
  "Império de Jake Girdwood": "Jake Girdwood-Reich",
  "João Koutroumbis": "John Koutroumbis",
  "Paulo McGinn": "Paul McGinn",
  "Ibrahim disse": "Ibrahim Said",
  "Quadro Mitchell": "Mitchel Frame",
  "Alexandre Briedl": "Alexander Briedl",
  "Ricardo Rei": "Richard King",
  "Henrique Fieldson": "Henry Fieldson",
  "Paulo Nsio": "Paul Nsio",
  "Marco Fraser": "Marcus Fraser",
  "Lucas Thomas": "Luke Thomas",
  "Félix Passlack": "Felix Passlack"
};

const STAR_OVR_OVERRIDES = {
  // Rangers FC
  "Nicolas Raskin": 79,
  "Youssef Chermiti": 79,
  "Emmanuel Fernandez": 78,
  "Min-su Kim": 78,
  "Badredine Bouanani": 78,
  "Kevin Kelsy": 77,
  "Olwethu Makhanya": 77,
  "Tuur Rommens": 77,
  "Vanja Dragojevic": 77,
  "Djidi Gassama": 77,
  "Kosta Nedeljkovic": 76,
  "Ivor Pandur": 76,
  "Tochi Chukwuani": 76,
  "Dan Neil": 76,
  "Ryan Naderi": 76,
  "Dujon Sterling": 75,
  "Ben Godfrey": 76,
  "Lawrence Shankland": 76,
  "Bojan Miovski": 76,
  "James Penrice": 75,
  "Daisuke Yokota": 75,
  "John Souttar": 75,
  "Ross McCrorie": 75,
  "José Cifuentes": 75,
  "Cammy Devlin": 75,
  "Liam Kelly": 73,
  "Ross McCausland": 74,
  "Findlay Curtis": 73,

  // Celtic FC
  "Benjamin Nygren": 80,
  "Kasper Høgh": 80,
  "Cameron Carter-Vickers": 79,
  "Mika Baur": 78,
  "Haissem Hassan": 78,
  "Alistair Johnston": 78,
  "Kieran Tierney": 78,
  "Oliver Sørensen": 77,
  "Auston Trusty": 77,
  "Hyun-jun Yang": 77,
  "Camilo Durán": 77,
  "Liam Scales": 76,
  "Jota": 76,
  "Sebastian Tounekti": 76,
  "Callum McGregor": 76,
  "Joël van den Berg": 75,
  "Colby Donovan": 75,
  "Shumaira Mheuka": 75,
  "Jordan Lotomba": 75,
  "Sam Johnstone": 75,
  "Viljami Sinisalo": 74,
  "Anthony Ralston": 74,
  "Luke McCowan": 74,
  "Alex Oxlade-Chamberlain": 74,
  "James Forrest": 73,
  "Dane Murray": 73,
  "Landon Emenalo": 72,

  // Heart of Midlothian FC
  "Cláudio Braga": 77,
  "James Wilson": 75,
  "Beau Reus": 74,
  "Josh McPake": 74,
  "Malachi Fagan-Walcott": 73,
  "Jordi Altena": 73,
  "Ageu": 73,
  "Calvin Miller": 73,
  "Sabri Guendouz": 73,
  "Oisin McEntee": 73,
  "Tom Renaud": 73,
  "Rogers Mato": 73,
  "Stuart Findlay": 73,
  "Craig Halkett": 73,
  "Stephen Kingsley": 73,
  "Zander Clark": 73,
  "Elton Kabangu": 73,
  "Yan Dhanda": 73,
  "Blair Spittal": 72,

  // Hibernian FC
  "Miguel Chaiwa": 76,
  "Josh Mulligan": 76,
  "Marko Ivezic": 74,
  "Thibault Klidjé": 74,
  "Rabbi Matondo": 74,
  "Rocky Bushiri": 73,
  "Jamie McGrath": 74,
  "Callum Wright": 73,
  "Jason Kerr": 73,
  "Felix Passlack": 73,
  "Nicky Cadden": 73,
  "Martin Boyle": 73,
  "Rafael Sallinger": 73,
  "Grant Hanley": 73,
  "Joe Newell": 73,

  // Motherwell FC
  "Tawanda Maswanhise": 76,
  "Ibrahim Said": 75,
  "Emmanuel Longelo": 74,
  "Jake Girdwood-Reich": 73,
  "Joe Hodge": 73,
  "Dylan Levitt": 73,
  "Lukas Fadinger": 73,
  "Alex Paulsen": 73,
  "Regan Charles-Cook": 73,
  "Paul McGinn": 72,
  "Stephen O'Donnell": 72,

  // Aberdeen FC
  "Kevin Nisbet": 75,
  "Jack Milne": 74,
  "Kristers Tobers": 73,
  "Connor Ronan": 73,
  "Hicham Mahou": 73,
  "Gavin Molloy": 73,
  "Mats Knoester": 73,
  "Lewis Mayo": 73,
  "Alexander Briedl": 73,
  "Ayoub Mouloua": 73,
  "Marius Müller": 73,
  "Stuart Armstrong": 73,
  "Nicky Devlin": 73,
  "Ante Palaversa": 73,
  "Afeez Aremu": 73,

  // Dundee United FC
  "Will Ferry": 74,
  "Dylan Tait": 74,
  "Zidane Iqbal": 74,
  "Zachary Sapsford": 73,
  "Lyall Cameron": 73,
  "Ross Graham": 73,
  "Michael Forbes": 73,
  "Kevin Ciubotaru": 73,
  "Joshua Rawlins": 73,
  "Jack Walton": 73,
  "Jesse Randall": 73,

  // St. Mirren FC
  "Calvin Ramsay": 74,
  "Killian Phillips": 74,
  "Ryan Carr": 73,
  "Keanu Baccus": 73,
  "Jacob Chapman": 72,
  "Alex Gogic": 73,
  "Marcus Fraser": 72,
  "Nikolas Agrafiotis": 72,
  "Jonah Ayunga": 72,

  // Dundee FC
  "Matai Akinmboni": 74,
  "Finlay Robertson": 73,
  "Ethan Hamilton": 73,
  "Ryan Astley": 73,
  "Owen Goodman": 72,
  "Simon Murray": 73,
  "Bobby Wales": 72,
  "Bradley Fink": 72,

  // Kilmarnock FC
  "Tyreece John-Jules": 74,
  "Bailey Rice": 73,
  "Nico Mantl": 73,
  "Cathal McCarthy": 73,
  "Michael Schjönning-Larsen": 73,
  "Robbie Deas": 72,
  "Joe Hugill": 73,
  "Mark O'Hara": 73,

  // St. Johnstone FC
  "Josh Campbell": 74,
  "Macaulay Tait": 73,
  "Josh Fowler": 73,
  "Toby Stewart": 72,
  "Enes Alic": 72,
  "Kai Fotheringham": 72,
  "Jamie Gullan": 72,
  "Danny Schmidt": 72,

  // Falkirk FC
  "Finn Yeats": 73,
  "Lewis Neilson": 72,
  "Connor Allan": 72,
  "Deniss Melniks": 72,
  "Jacob Murrell": 72,
  "CJ Fodrey": 72,
  "Craig Sibbald": 72,
  "Ross MacIver": 72
};

const KNOWN_NATIONS = [
  "Peru",
  "Dinamarca", "Suécia", "Noruega", "Finlândia", "Islândia", "Portugal", "Holanda", "Bélgica", "Turquia", "Grécia", "Brasil", "Alemanha", "França", "Espanha", "Itália",
  "Inglaterra", "Argentina", "Uruguai", "Colômbia", "Equador", "Paraguai", "Chile", "Venezuela", "Bolívia",
  "Costa do Marfim", "Nigéria", "Senegal", "Gana", "Camarões", "Marrocos", "Argélia", "Egito", "Tunísia",
  "Mali", "RD do Congo", "RD Congo", "Guiné", "Guiné-Bissau", "Burkina Faso", "Gabão", "Angola", "Togo",
  "Gâmbia", "Cabo Verde", "Moçambique", "Benim", "Benin", "África do Sul", "Zimbabué", "Zimbábue", "Congo", "Comores",
  "Libéria", "Tanzânia", "Jordânia", "Croácia", "Sérvia", "Servia", "Bósnia e Herzegovina", "Bósnia-Herzegovina",
  "Montenegro", "Macedônia do Norte", "Macedónia do Norte", "Eslovênia", "Eslovénia", "Eslováquia", "República Checa", "República Tcheca",
  "Polônia", "Polónia", "Hungria", "Romênia", "Bulgária", "Ucrânia", "Rússia", "Geórgia", "Albânia", "Kosovo",
  "Chipre", "Israel", "Síria", "Irã", "Iraque", "Azerbaijão", "Uzbequistão", "Cazaquistão",
  "Áustria", "Escócia", "Irlanda do Norte", "Irlanda", "País de Gales", "Estados Unidos", "Canadá", "México", "Costa Rica", "Panamá", "Jamaica", "Honduras",
  "Haiti", "Curaçao", "Trinidad e Tobago", "Suriname", "Japão", "Coréia do Sul", "Coreia do Sul", "Austrália", "Nova Zelândia",
  "Quênia", "Quénia", "Uganda", "Luxemburgo", "Madagáscar", "Serra Leoa", "Guiana", "Ilhas Faroé", "Letônia", "Letónia", "Líbano",
  "Sudão do Sul", "Somália", "Estônia", "Estónia", "Burundi", "Eritreia", "Ruanda", "Lituânia", "Guatemala", "Zâmbia", "Nova",
  "Mauritânia", "Barbados", "São Cristóvão e Nevis", "Dominica", "Granada", "Hong Kong", "Moldávia", "Suíça", "Ir"
].sort((a, b) => b.length - a.length);

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
      if (earliestNation === "Ir") return "Togo";
      if (earliestNation === "Nova") return "Nova Zelândia";
      if (earliestNation === "Estónia") return "Estônia";
      if (earliestNation === "Letónia") return "Letônia";
      if (earliestNation === "Polónia") return "Polônia";
      if (earliestNation === "Coréia do Sul") return "Coreia do Sul";
      if (earliestNation === "Servia") return "Sérvia";
      if (earliestNation === "Quénia") return "Quênia";
      if (earliestNation === "Eslovénia") return "Eslovênia";
      if (earliestNation === "Macedónia do Norte") return "Macedônia do Norte";
      if (earliestNation === "Bósnia-Herzegovina") return "Bósnia e Herzegovina";
      if (earliestNation === "República Checa") return "República Tcheca";
      if (earliestNation === "RD do Congo") return "RD Congo";
      if (earliestNation === "Zimbábue") return "Zimbábue";
      return earliestNation;
    }
  }
  return "Escócia";
}

function parseMarketValue(fullInfo) {
  // e.g. €16,00mi or €8,00mi or 14,00 milhas
  const decMillions = fullInfo.match(/(?:€|EUR)?\s*([0-9]+[.,][0-9]+)\s*(?:mi\b|milhas\b|m\b)/i);
  if (decMillions) {
    return parseFloat(decMillions[1].replace(",", ".")) * 1000000;
  }
  // e.g. € 5,50 milhões or € 2,00 milhões or € 3,50 milhões
  const decMilhoes = fullInfo.match(/(?:€|EUR)?\s*([0-9]+[.,][0-9]+)\s*milhões/i);
  if (decMilhoes) {
    return parseFloat(decMilhoes[1].replace(",", ".")) * 1000000;
  }
  // e.g. € 1,50 mil or € 1,00 mil (decimal before "mil" means 1.5 million)
  const decMilAsMi = fullInfo.match(/(?:€|EUR)?\s*([0-9]+[.,][0-9]+)\s*mil\b/i);
  if (decMilAsMi) {
    return parseFloat(decMilAsMi[1].replace(",", ".")) * 1000000;
  }
  // e.g. € 2 or € 3 mi
  const intMillions = fullInfo.match(/(?:€|EUR)?\s*([0-9]{1,2})\s*(?:mi\b|milhas\b)/i);
  if (intMillions) {
    return parseInt(intMillions[1], 10) * 1000000;
  }
  // e.g. 800 milhões, 250 milhões, 900 milhões de euros (where number >= 50 means thousands)
  const intMilhoes = fullInfo.match(/(?:€|EUR)?\s*([0-9]+)\s*milhões/i);
  if (intMilhoes) {
    const val = parseInt(intMilhoes[1], 10);
    return val >= 50 ? val * 1000 : val * 1000000;
  }
  // e.g. €400mil or 150 mil
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
  if (rep <= 2 && ovr > 74) ovr -= 1;

  return Math.max(63, Math.min(84, ovr));
}

const rawText = fs.readFileSync(SCOTLAND_TXT, 'utf-8');
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
tsCode += `export interface ScotlandClubData {\n`;
tsCode += `  id: string;\n`;
tsCode += `  name: string;\n`;
tsCode += `  shortName: string;\n`;
tsCode += `  reputation: number;\n`;
tsCode += `  primaryColor: string;\n`;
tsCode += `  managerName: string;\n`;
tsCode += `  players: Array<[string, DetailedRole, number, number, number, string]>;\n`;
tsCode += `}\n\n`;
tsCode += `export const SCOTLAND_LEAGUE_2026: ScotlandClubData[] = [\n`;

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
