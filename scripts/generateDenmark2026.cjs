const fs = require('fs');
const path = require('path');

const DENMARK_TXT = path.join(__dirname, '../public/assets/aistudio/DINAMARCA_7ad89e57.txt');
const TARGET_TS = path.join(__dirname, '../src/data/denmark2026Rosters.ts');

const CLUB_CONFIG = {
  "FC MIDTJYLLAND": {
    id: "eu_fcm_dk",
    name: "FC Midtjylland",
    shortName: "Midtjylland",
    reputation: 4,
    primaryColor: "#111111",
    managerName: "Thomas Thomasberg"
  },
  "FC COPENHAGUE": {
    id: "eu_fck_dk",
    name: "FC København",
    shortName: "København",
    reputation: 4,
    primaryColor: "#FFFFFF",
    managerName: "Jacob Neestrup"
  },
  "FC NORDSJAELLAND": {
    id: "eu_fcn_dk",
    name: "FC Nordsjælland",
    shortName: "Nordsjælland",
    reputation: 3,
    primaryColor: "#DC2626",
    managerName: "Jens Fønsskov Olsen"
  },
  "BRONDBY IF": {
    id: "eu_bif_dk",
    name: "Brøndby IF",
    shortName: "Brøndby",
    reputation: 4,
    primaryColor: "#FACC15",
    managerName: "Jesper Sørensen"
  },
  "AARHUS GF": {
    id: "eu_agf_dk",
    name: "AGF Aarhus",
    shortName: "AGF",
    reputation: 3,
    primaryColor: "#FFFFFF",
    managerName: "Uwe Rösler"
  },
  "ODENSE BOLDKLUB": {
    id: "eu_ob_dk",
    name: "Odense Boldklub",
    shortName: "Odense",
    reputation: 3,
    primaryColor: "#004F9F",
    managerName: "Søren Krogh"
  },
  "VIBORG FF": {
    id: "eu_vib_dk",
    name: "Viborg FF",
    shortName: "Viborg",
    reputation: 2,
    primaryColor: "#15803D",
    managerName: "Jakob Poulsen"
  },
  "RANDERS FC": {
    id: "eu_ran_dk",
    name: "Randers FC",
    shortName: "Randers",
    reputation: 2,
    primaryColor: "#0055A5",
    managerName: "Rasmus Bertelsen"
  },
  "SILKEBORG IF": {
    id: "eu_sif_dk",
    name: "Silkeborg IF",
    shortName: "Silkeborg",
    reputation: 3,
    primaryColor: "#DC2626",
    managerName: "Kent Nielsen"
  },
  "LYNGBY BOLDKLUB": {
    id: "eu_lyn_dk",
    name: "Lyngby Boldklub",
    shortName: "Lyngby",
    reputation: 2,
    primaryColor: "#003399",
    managerName: "Morten Karlsen"
  },
  "SONDERJYSKE FODBOLD": {
    id: "eu_son_dk",
    name: "Sønderjyske Fodbold",
    shortName: "Sønderjyske",
    reputation: 2,
    primaryColor: "#004F9F",
    managerName: "Thomas Nørgaard"
  },
  "AC HORSENS": {
    id: "eu_hor_dk",
    name: "AC Horsens",
    shortName: "Horsens",
    reputation: 2,
    primaryColor: "#FACC15",
    managerName: "Martin Retov"
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
  "Sexta-feira Etime": "Friday Etim",
  "Andreas Cornélio": "Andreas Cornelius",
  "Príncipe Amoako Júnior": "Prince Amoako Jr.",
  "Olá Solbakken": "Ola Solbakken",
  "Alexandre Lind": "Alexander Lind",
  "Luís Binks": "Luis Binks",
  "Links para Presente": "Gift Links",
  "Júlio Berthel Askou": "Julius Berthel Askou",
  "Alexandre Ahl-Holmström": "Alexander Ahl-Holmström",
  "Heitor Lux": "Hector Lux",
  "Seck de queda de Ousseynou": "Ousseynou Fall Seck",
  "Alexandre Munksgaard": "Alexander Munksgaard",
  "Mateus Hoppe": "Matthew Hoppe",
  "Diamante Valassina": "Diamant Valassina",
  "João Batigi": "John Batigi",
  "Mikael Uhr": "Mikael Uhre",
  "Victor Nelson": "Victor Nelsson",
  "Victor Baker": "Victor Bak",
};

const STAR_OVR_OVERRIDES = {
  "Ousmane Diao": 78,
  "Rasmus Nissen Kristensen": 78,
  "Philip Billing": 78,
  "Denil Castillo": 77,
  "Mads Bech Sørensen": 77,
  "David Martínez": 77,
  "Gue-sung Cho": 77,
  "Martin Erlić": 76,
  "Elías Ólafsson": 76,
  "Pedro Bravo": 75,
  "Kjell Wätjen": 75,
  "Mikael Uhre": 76,
  "Diant Ramaj": 78,
  "Maher Carrizo": 78,
  "Rodrigo Huescas": 77,
  "William Clem": 77,
  "Mohamed Elyounoussi": 77,
  "Magnus Mattsson": 76,
  "Marcos López": 76,
  "Viktor Dadason": 76,
  "Thomas Delaney": 76,
  "Alex Král": 75,
  "Junnosuke Suzuki": 75,
  "Félix Beijmo": 75,
  "Prince Amoako Jr.": 78,
  "Juho Lähteenmäki": 77,
  "Victor Nelsson": 77,
  "Alexander Lind": 76,
  "Noé Markmann": 75,
  "Runar Norheim": 75,
  "Justin Janssen": 75,
  "Mark Brink": 75,
  "Ibrahim Adel": 75,
  "Ola Solbakken": 74,
  "Andreas Hansen": 74,
  "Olti Hyseni": 77,
  "Jacob Ambæk": 77,
  "Luis Binks": 76,
  "Bartosz Slisz": 76,
  "Max Ejdum": 76,
  "Mats Köhlert": 75,
  "Marko Divković": 75,
  "Patrick Pentz": 75,
  "Daniel Wass": 76,
  "Filip Bundgaard": 75,
  "Emmanuel Dennis": 75,
  "Mads Frøkjær": 75,
  "Kristian Arnstad": 77,
  "Tobias Bech": 76,
  "Eric Kahl": 75,
  "Magnus Knudsen": 75,
  "Gift Links": 75,
  "Callum McCowatt": 75,
  "Colin Rösler": 74,
  "Markus Solbakken": 74,
  "Jens Jønsson": 74,
  "Julius Berthel Askou": 75,
  "Julian Pauli": 75,
  "Fiete Arp": 75,
  "Topi Keskinen": 75,
  "Noah Ganaus": 74,
  "James Gomez": 74,
  "Viljar Myhra": 74,
  "Rasmus Falk": 74,
  "Daniel Anyembe": 75,
  "Mads Søndergaard": 75,
  "Lucas Lund": 74,
  "Zan Zaletel": 74,
  "Sami Jalal": 74,
  "Charly Nouck": 74,
  "Hjalte Bidstrup": 74,
  "Nikolas Dyhr": 76,
  "John Björkengren": 75,
  "Laurits Raun Pedersen": 75,
  "Nikolai Hopland": 74,
  "Axel Henriksson": 74,
  "Wessel Dammers": 74,
  "Mike Thames": 74,
  "Robin Østrøm": 75,
  "Pedro Ganchas": 75,
  "Mads Larsen": 75,
  "Mads Freundlich": 75,
  "Oliver Ross": 74,
  "Alexander Busch": 74,
  "Andreas Poulsen": 74,
  "Diego Kochen": 75,
  "Lauge Sandgrav": 75,
  "Munashe Garananga": 74,
  "Gustav Fraulo": 74,
  "Zidan Sertdemir": 74,
  "Mikkel Fischer": 73,
  "Maxime Soulas": 75,
  "Mohamed Cherif Haidara": 74,
  "Sefer Emini": 74,
  "Nick Shinton": 74,
  "Osaze De Rosario": 74,
  "Matthew Hoppe": 74,
  "Lirim Qamili": 74,
  "Christian Vestergaard": 74,
  "Karlo Lusavec": 74,
  "Adam Herdonsson": 74,
  "Kelvin Ehibhatiomhan": 74,
  "Matej Delac": 73,
  "Ole Martin Kolskogen": 73,
};

const KNOWN_NATIONS = [
  "Peru",
  "Dinamarca", "Suécia", "Noruega", "Finlândia", "Islândia", "Portugal", "Holanda", "Bélgica", "Turquia", "Grécia", "Brasil", "Alemanha", "França", "Espanha", "Itália",
  "Inglaterra", "Argentina", "Uruguai", "Colômbia", "Equador", "Paraguai", "Chile", "Venezuela", "Bolívia",
  "Costa do Marfim", "Nigéria", "Senegal", "Gana", "Camarões", "Marrocos", "Argélia", "Egito", "Tunísia",
  "Mali", "RD do Congo", "RD Congo", "Guiné", "Guiné-Bissau", "Burkina Faso", "Gabão", "Angola", "Togo",
  "Gâmbia", "Cabo Verde", "Moçambique", "Benim", "Benin", "África do Sul", "Zimbabué", "Congo", "Comores",
  "Libéria", "Tanzânia", "Jordânia", "Croácia", "Sérvia", "Servia", "Bósnia e Herzegovina", "Bósnia-Herzegovina",
  "Montenegro", "Macedônia do Norte", "Macedónia do Norte", "Eslovênia", "Eslovénia", "Eslováquia", "República Checa", "República Tcheca",
  "Polônia", "Hungria", "Romênia", "Bulgária", "Ucrânia", "Rússia", "Geórgia", "Albânia", "Kosovo",
  "Chipre", "Israel", "Síria", "Irã", "Iraque", "Azerbaijão", "Uzbequistão", "Cazaquistão",
  "Áustria", "Escócia", "Irlanda", "País de Gales", "Estados Unidos", "Canadá", "México", "Costa Rica", "Panamá", "Jamaica", "Honduras",
  "Haiti", "Curaçao", "Trinidad e Tobago", "Suriname", "Japão", "Coréia do Sul", "Coreia do Sul", "Austrália", "Nova Zelândia",
  "Quênia", "Quénia", "Uganda", "Luxemburgo", "Madagáscar", "Serra Leoa", "Guiana", "Ilhas Faroé", "Letônia", "Líbano"
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
      if (earliestNation === "Coréia do Sul") return "Coreia do Sul";
      if (earliestNation === "Servia") return "Sérvia";
      if (earliestNation === "Quénia") return "Quênia";
      if (earliestNation === "Eslovénia") return "Eslovênia";
      if (earliestNation === "Macedónia do Norte") return "Macedônia do Norte";
      if (earliestNation === "Bósnia-Herzegovina") return "Bósnia e Herzegovina";
      if (earliestNation === "República Checa") return "República Tcheca";
      if (earliestNation === "RD do Congo") return "RD Congo";
      return earliestNation;
    }
  }
  return "Dinamarca";
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
  if (marketVal >= 7000000) ovr = 78;
  else if (marketVal >= 4500000) ovr = 76;
  else if (marketVal >= 2500000) ovr = 75;
  else if (marketVal >= 1500000) ovr = 74;
  else if (marketVal >= 900000) ovr = 72;
  else if (marketVal >= 500000) ovr = 70;
  else if (marketVal >= 250000) ovr = 68;
  else ovr = 66;

  if (age >= 33 && marketVal < 1000000) {
    ovr = Math.min(ovr, 72);
  }
  if (rep >= 4 && ovr < 75) ovr += 1;
  if (rep <= 2 && ovr > 74) ovr -= 1;

  return Math.max(63, Math.min(84, ovr));
}

const rawText = fs.readFileSync(DENMARK_TXT, 'utf-8');
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
tsCode += `export interface DenmarkClubData {\n`;
tsCode += `  id: string;\n`;
tsCode += `  name: string;\n`;
tsCode += `  shortName: string;\n`;
tsCode += `  reputation: number;\n`;
tsCode += `  primaryColor: string;\n`;
tsCode += `  managerName: string;\n`;
tsCode += `  players: Array<[string, DetailedRole, number, number, number, string]>;\n`;
tsCode += `}\n\n`;
tsCode += `export const DENMARK_LEAGUE_2026: DenmarkClubData[] = [\n`;

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
