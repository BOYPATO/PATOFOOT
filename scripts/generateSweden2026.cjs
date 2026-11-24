const fs = require('fs');
const path = require('path');

const SWEDEN_TXT = path.join(__dirname, '../public/assets/aistudio/SUECIA_78c9d5ff.txt');
const TARGET_TS = path.join(__dirname, '../src/data/sweden2026Rosters.ts');

const CLUB_CONFIG = {
  "HAMMARBY IF": {
    id: "eu_ham_se",
    name: "Hammarby IF",
    shortName: "Hammarby",
    reputation: 3,
    primaryColor: "#15803D",
    managerName: "Kim Hellberg"
  },
  "DJURGARDENS IF": {
    id: "eu_dif_se",
    name: "Djurgårdens IF",
    shortName: "Djurgården",
    reputation: 3,
    primaryColor: "#002D72",
    managerName: "Roberth Björknesjö"
  },
  "MALMO FF": {
    id: "eu_mff_se",
    name: "Malmö FF",
    shortName: "Malmö FF",
    reputation: 4,
    primaryColor: "#38BDF8",
    managerName: "Henrik Rydström"
  },
  "AIK": {
    id: "eu_aik_se",
    name: "AIK",
    shortName: "AIK",
    reputation: 4,
    primaryColor: "#111111",
    managerName: "Mikkjal Thomassen"
  },
  "IK SIRIUS": {
    id: "eu_sir_se",
    name: "IK Sirius",
    shortName: "Sirius",
    reputation: 2,
    primaryColor: "#1D4ED8",
    managerName: "Christer Mattiasson"
  },
  "BK HACKEN": {
    id: "eu_hac_se",
    name: "BK Häcken",
    shortName: "Häcken",
    reputation: 3,
    primaryColor: "#FACC15",
    managerName: "Joop Oosterveld"
  },
  "MJALLBY AIF": {
    id: "eu_mja_se",
    name: "Mjällby AIF",
    shortName: "Mjällby",
    reputation: 2,
    primaryColor: "#EAB308",
    managerName: "Anders Torstensson"
  },
  "IFK GOTEMBURGO": {
    id: "eu_ifk_se",
    name: "IFK Göteborg",
    shortName: "IFK Göteborg",
    reputation: 3,
    primaryColor: "#004B87",
    managerName: "Stefan Billborn"
  },
  "IF ELFSBORG": {
    id: "eu_elf_se",
    name: "IF Elfsborg",
    shortName: "Elfsborg",
    reputation: 3,
    primaryColor: "#F59E0B",
    managerName: "Oscar Hiljemark"
  },
  "GAIS": {
    id: "eu_gai_se",
    name: "GAIS",
    shortName: "GAIS",
    reputation: 2,
    primaryColor: "#166534",
    managerName: "Fredrik Holmberg"
  },
  "KALMAR FF": {
    id: "eu_kal_se",
    name: "Kalmar FF",
    shortName: "Kalmar FF",
    reputation: 2,
    primaryColor: "#DC2626",
    managerName: "Stefan Larsson"
  },
  "VASTERAS SK": {
    id: "eu_vas_se",
    name: "Västerås SK",
    shortName: "Västerås",
    reputation: 2,
    primaryColor: "#15803D",
    managerName: "Kalle Karlsson"
  },
  "IF BROMMAPOJKARNA": {
    id: "eu_bp_se",
    name: "IF Brommapojkarna",
    shortName: "Brommapojkarna",
    reputation: 2,
    primaryColor: "#DC2626",
    managerName: "Olof Mellberg"
  },
  "HALMSTADS BK": {
    id: "eu_hal_se",
    name: "Halmstads BK",
    shortName: "Halmstad",
    reputation: 2,
    primaryColor: "#2563EB",
    managerName: "Magnus Haglund"
  },
  "ORGRYTE IS": {
    id: "eu_org_se",
    name: "Örgryte IS",
    shortName: "Örgryte",
    reputation: 2,
    primaryColor: "#B91C1C",
    managerName: "Andreas Holmberg"
  },
  "DEGERFORS IF": {
    id: "eu_deg_se",
    name: "Degerfors IF",
    shortName: "Degerfors",
    reputation: 2,
    primaryColor: "#DC2626",
    managerName: "William Lundin"
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
  "Jacob Une": "Jacob Une Larsson",
  "Jens Stryger": "Jens Stryger Larsen",
  "Adam Stahl": "Adam Ståhl",
  "Henrik Rönnlöf Castegren": "Henrik Castegren",
  "Leiteiro Heier": "Melker Heier",
  "Júlio Lindberg": "Julius Lindberg",
  "Luís Svanberg": "Ludvig Svanberg",
  "Luís Tidstrand": "Ludvig Tidstrand",
  "Agosto Erlingmark": "August Erlingmark",
  "Agosto Wängberg": "August Wängberg",
  "Simão Hedlund": "Simon Hedlund",
  "Simão Olsson": "Simon Olsson",
  "Simão Strand": "Simon Strand",
  "Simão Larsson": "Simon Larsson",
  "Por Frick": "Per Frick",
  "Joaquim Fagerjord": "Joackim Fagerjord",
  "Henrique Sletsjøe": "Henrik Sletsjøe",
  "Cristo Gravio": "Christos Gravius",
  "Cristo Gravius": "Christos Gravius",
  "Bênção Asumang": "Blessing Asumang",
  "Filipe Bonde": "Filip Bonde",
  "Pedro Amoran": "Peter Amoran",
  "Pedro Langhoff": "Peter Langhoff",
  "Leão Cavallius": "Leo Cavallius",
  "Todas as eleições e": "Alfons Lohake",
  "Coragem Otokwefor": "Courage Otokwefor",
  "Luís Fritzson": "Ludvig Fritzson",
  "Cristo Almyras": "Christos Almyras",
  "Cristo Wawa": "Christ Wawa",
  "Alexandre Johansson": "Alexander Johansson",
  "Alexandre Andersson": "Alexander Andersson",
  "Alexandre Lundin": "Alexander Lundin",
  "Alexandre Jallow": "Alexander Jallow",
  "Alexandre Simmelhack": "Alexander Simmelhack",
  "Alexandre Jensen": "Alexander Jensen",
  "Alexandre Almqvist": "Alexander Almqvist",
  "Paulo Colley": "Pa Colley",
  "Christoff Styffe": "Christoffer Styffe",
  "Marco Rohdén": "Marcus Rohdén",
  "Diogo Tomás": "Diogo Tomas",
  "Sótiros Papagiannopoulos": "Sotirios Papagiannopoulos",
  "Lázaro Laku": "Lazar Laku",
  "Antônio Palac": "Antonio Palac",
  "André Djuric": "Andre Djuric",
  "André Bernardini": "Andre Bernardini"
};

const STAR_OVR_OVERRIDES = {
  // Hammarby IF
  "Markus Karlsson": 77,
  "Victor Lind": 77,
  "Montader Madjed": 76,
  "Hampus Skoglund": 75,
  "Victor Eriksson": 75,
  "Nahir Besara": 76,
  "Amin Boudri": 75,
  "Frank Junior Adjei": 74,
  "Tesfaldet Tekie": 74,
  "Paulos Abraham": 74,
  "Warner Hahn": 73,
  "Frederik Winther": 73,
  "Noah Persson": 73,

  // Djurgårdens IF
  "Matias Siltanen": 78,
  "Bo Hegland": 77,
  "Kristian Strømland Lien": 76,
  "Jeppe Okkels": 75,
  "Charlie Rosenqvist": 75,
  "Jacob Rinne": 75,
  "Miro Tenho": 75,
  "Jacob Une Larsson": 74,
  "Adam Ståhl": 74,
  "Marcus Danielson": 75,
  "Rasmus Schüller": 74,
  "Patric Åslund": 74,
  "Santeri Haarala": 74,
  "Keita Kosugi": 73,

  // Malmö FF
  "Bleon Kurtulus": 77,
  "Busanello": 76,
  "Anders Christiansen": 76,
  "Otto Rosengren": 76,
  "Mayckel Lahdo": 76,
  "Sead Haksabanovic": 76,
  "Pontus Jansson": 75,
  "Robin Olsen": 76,
  "Lasse Berg Johnsen": 75,
  "Sergio Peña": 75,
  "Isaac Kiese Thelin": 75,
  "Erik Botheim": 75,
  "Taha Ali": 75,
  "Hugo Bolin": 75,
  "Derek Cornelius": 74,
  "Colin Rösler": 74,
  "Jens Stryger Larsen": 74,

  // AIK
  "Kevin Filling": 78,
  "Lucas Assadi": 77,
  "Linus Carlstrand": 76,
  "Charlie Paley": 75,
  "Johan Hove": 75,
  "Axel Kouame": 75,
  "Kristoffer Nordfeldt": 75,
  "Sotirios Papagiannopoulos": 74,
  "Mads Thychosen": 74,
  "Anton Salétros": 75,
  "Dino Besirovic": 74,
  "John Guidetti": 74,
  "Ioannis Pittas": 75,
  "Eskil Edh": 73,

  // IK Sirius
  "Isak Bjerkebo": 77,
  "Neo Jönsson": 77,
  "Melker Heier": 75,
  "Joakim Persson": 75,
  "Noel Milleskog": 75,
  "Leo Walta": 75,
  "Malcolm Jeng": 74,
  "Henrik Castegren": 74,
  "David Celic": 73,

  // BK Häcken
  "Abdoulaye Doumbia": 77,
  "Adrian Svanbäck": 75,
  "Leo Väisänen": 75,
  "Mikkel Rygaard": 75,
  "Simon Gustafson": 75,
  "Amor Layouni": 74,
  "Peter Abrahamsson": 73,
  "Silas Andersen": 74,
  "Julius Lindberg": 74,
  "Severin Nioule": 73,

  // Mjällby AIF
  "Abdullah Iqbal": 76,
  "Mads Enggård": 76,
  "Axel Norén": 75,
  "Elliot Stroud": 75,
  "Herman Johansson": 75,
  "Jacob Bergström": 74,
  "Imam Jagne": 74,
  "Viktor Gustafson": 74,
  "Robin Wallinder": 73,

  // IFK Göteborg
  "Tobias Heintz": 76,
  "Simon Larsson": 75,
  "Max Fenger": 76,
  "Elis Bishesari": 74,
  "August Erlingmark": 74,
  "Ramon Pascal Lundqvist": 75,
  "Kolbeinn Thórdarson": 74,
  "Thomas Santos": 74,
  "Gustav Svensson": 73,
  "Alexander Jallow": 73,

  // IF Elfsborg
  "Simon Olsson": 76,
  "Arbër Zeneli": 76,
  "Rasmus Wikström": 75,
  "Leo Östman": 75,
  "Sebastian Holmén": 75,
  "Terry Yegbe": 74,
  "Niklas Hult": 74,
  "Simon Hedlund": 75,
  "Per Frick": 74,
  "Michael Baidoo": 74,
  "Isak Pettersson": 74,
  "Jens Jakob Thomasen": 74,

  // GAIS
  "Axel Henriksson": 75,
  "Gustav Lundgren": 75,
  "Alexander Ahl-Holmström": 75,
  "Mervan Celik": 74,
  "Harun Ibrahim": 74,
  "August Wängberg": 73,
  "Mergim Krasniqi": 73,

  // Kalmar FF
  "Simon Skrabb": 75,
  "Dino Islamovic": 74,
  "Lars Sætra": 74,
  "Robert Gojani": 74,
  "Melker Hallberg": 74,
  "Samuel Brolin": 73,
  "Jonathan Ring": 74,

  // Västerås SK
  "Viktor Granath": 74,
  "Marcus Linday": 74,
  "Matteo Ahlinvi": 74,
  "Max Larsson": 73,
  "Anton Fagerström": 73,
  "Frédéric Nsabiyumva": 73,

  // IF Brommapojkarna
  "Nikola Vasic": 75,
  "Ludvig Fritzson": 74,
  "Wilmer Odefalk": 74,
  "Alexander Jensen": 74,
  "Lucas Hägg-Johansson": 73,
  "Alexander Abrahamsson": 73,

  // Halmstads BK
  "Naeem Mohammed": 74,
  "Birnir Snaer Ingason": 73,
  "Jonathan Svedberg": 73,
  "Joseph Baffo": 73,
  "Tim Erlandsson": 73,
  "Vinícius Nogueira": 73,

  // Örgryte IS
  "Nicklas Bärkroth": 73,
  "Daniel Paulson": 73,
  "Owen Parker-Price": 73,
  "Hampus Dahlqvist": 72,
  "Sixten Mohlin": 72,

  // Degerfors IF
  "Dijan Vukojevic": 74,
  "Gustav Lindgren": 74,
  "Sebastian Ohlsson": 73,
  "Bernardo Morgado": 73,
  "Rasmus Forsell": 73
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
  "Quênia", "Quénia", "Uganda", "Luxemburgo", "Madagáscar", "Serra Leoa", "Guiana", "Ilhas Faroé", "Letônia", "Líbano",
  "Sudão do Sul", "Somália", "Estônia", "Estónia", "Burundi", "Eritreia", "Ruanda", "Lituânia", "Guatemala", "Zâmbia", "Nova"
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
      if (earliestNation === "Nova") return "Nova Zelândia";
      if (earliestNation === "Estónia") return "Estônia";
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
  return "Suécia";
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
  const intMillions = fullInfo.match(/(?:€|EUR)?\s*([0-9]{1,2})\s*(?:mi\b|milhas\b)/i);
  if (intMillions) {
    return parseInt(intMillions[1], 10) * 1000000;
  }
  const intMilhoes = fullInfo.match(/(?:€|EUR)?\s*([0-9]+)\s+milhões/i);
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

  return Math.max(63, Math.min(82, ovr));
}

const rawText = fs.readFileSync(SWEDEN_TXT, 'utf-8');
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
tsCode += `export interface SwedenClubData {\n`;
tsCode += `  id: string;\n`;
tsCode += `  name: string;\n`;
tsCode += `  shortName: string;\n`;
tsCode += `  reputation: number;\n`;
tsCode += `  primaryColor: string;\n`;
tsCode += `  managerName: string;\n`;
tsCode += `  players: Array<[string, DetailedRole, number, number, number, string]>;\n`;
tsCode += `}\n\n`;
tsCode += `export const SWEDEN_LEAGUE_2026: SwedenClubData[] = [\n`;

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
