const fs = require('fs');
const path = require('path');

const TURKEY_TXT = path.join(__dirname, '../public/assets/aistudio/TURQUIA_37d23e7e.txt');
const TARGET_TS = path.join(__dirname, '../src/data/turkey2026Rosters.ts');

const CLUB_CONFIG = {
  "GALATASARAY": {
    id: "eu_gal",
    name: "Galatasaray SK",
    shortName: "Galatasaray",
    reputation: 4,
    primaryColor: "#FDB912",
    managerName: "Okan Buruk"
  },
  "BESIKTAS JK": {
    id: "eu_bjk",
    name: "Beşiktaş JK",
    shortName: "Beşiktaş",
    reputation: 4,
    primaryColor: "#111111",
    managerName: "Ole Gunnar Solskjær"
  },
  "FENERBAHÇE": {
    id: "eu_fen",
    name: "Fenerbahçe SK",
    shortName: "Fenerbahçe",
    reputation: 4,
    primaryColor: "#002D72",
    managerName: "José Mourinho"
  },
  "TRABZONPOR": {
    id: "eu_tra_tr",
    name: "Trabzonspor",
    shortName: "Trabzonspor",
    reputation: 3,
    primaryColor: "#7A1727",
    managerName: "Fatih Tekke"
  },
  "BASAKSEHIR": {
    id: "eu_bas",
    name: "İstanbul Başakşehir",
    shortName: "Başakşehir",
    reputation: 3,
    primaryColor: "#F97316",
    managerName: "Çağdaş Atan"
  },
  "GOZTEPE": {
    id: "eu_goz",
    name: "Göztepe SK",
    shortName: "Göztepe",
    reputation: 2,
    primaryColor: "#FACC15",
    managerName: "Stanimir Stoilov"
  },
  "COMUM FK": {
    id: "eu_cor_tr",
    name: "Çorum FK",
    shortName: "Çorum FK",
    reputation: 2,
    primaryColor: "#DC2626",
    managerName: "Serkan Özbalta"
  },
  "SAMSUNSPOR": {
    id: "eu_sam_tr",
    name: "Samsunspor",
    shortName: "Samsunspor",
    reputation: 3,
    primaryColor: "#DC2626",
    managerName: "Thomas Reis"
  },
  "CAYKUR RIZESPOR": {
    id: "eu_riz",
    name: "Çaykur Rizespor",
    shortName: "Rizespor",
    reputation: 2,
    primaryColor: "#0055A5",
    managerName: "İlhan Palut"
  },
  "KASIMPASA": {
    id: "eu_kas",
    name: "Kasımpaşa SK",
    shortName: "Kasımpaşa",
    reputation: 2,
    primaryColor: "#0055A5",
    managerName: "Sami Uğurlu"
  },
  "ALANYASPOR": {
    id: "eu_ala_tr",
    name: "Alanyaspor",
    shortName: "Alanyaspor",
    reputation: 2,
    primaryColor: "#F97316",
    managerName: "Fatih Tekke"
  },
  "KONYASPOR": {
    id: "eu_kon",
    name: "Konyaspor",
    shortName: "Konyaspor",
    reputation: 2,
    primaryColor: "#16A34A",
    managerName: "Ali Çamdalı"
  },
  "AMED SK": {
    id: "eu_ame_tr",
    name: "Amed SK",
    shortName: "Amed SK",
    reputation: 2,
    primaryColor: "#16A34A",
    managerName: "Ersun Yanal"
  },
  "GAZIANTEP FK": {
    id: "eu_gaz",
    name: "Gaziantep FK",
    shortName: "Gaziantep",
    reputation: 2,
    primaryColor: "#DC2626",
    managerName: "Selçuk İnan"
  },
  "GENCLERBIRLIGI ANCARA": {
    id: "eu_gen_tr",
    name: "Gençlerbirliği SK",
    shortName: "Gençlerbirliği",
    reputation: 2,
    primaryColor: "#DC2626",
    managerName: "Recep Uçar"
  },
  "KOCAELISPOR": {
    id: "eu_koc",
    name: "Kocaelispor",
    shortName: "Kocaelispor",
    reputation: 2,
    primaryColor: "#16A34A",
    managerName: "Ertuğrul Sağlam"
  },
  "ERZURUMSPOR FK": {
    id: "eu_erz_tr",
    name: "Erzurumspor FK",
    shortName: "Erzurumspor",
    reputation: 2,
    primaryColor: "#1D4ED8",
    managerName: "Hakan Kutlu"
  },
  "EYUPSPOR": {
    id: "eu_eyu",
    name: "Eyüpspor",
    shortName: "Eyüpspor",
    reputation: 2,
    primaryColor: "#7E22CE",
    managerName: "Arda Turan"
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
  "Volante": "VOL",
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
  "Milão Škriniar": "Milan Škriniar",
  "Alexandre Nübel": "Alexander Nübel",
  "Nathan Ake": "Nathan Aké",
  "Príncipe Martin Jr.": "Prince Martin Jr.",
  "Ok Yokuşlu": "Okay Yokuşlu",
  "maestro": "Maestro",
  "mostrar": "Show"
};

const STAR_OVR_OVERRIDES = {
  "Victor Osimhen": 86,
  "Rafael Leão": 86,
  "Ederson": 86,
  "Mohamed Salah": 85,
  "Leroy Sané": 84,
  "Nathan Aké": 83,
  "Mason Greenwood": 83,
  "Milan Škriniar": 82,
  "André Onana": 82,
  "Romelu Lukaku": 82,
  "Mattéo Guendouzi": 82,
  "İlkay Gündoğan": 82,
  "Gabriel Sara": 81,
  "Davinson Sánchez": 81,
  "Lucas Torreira": 81,
  "N'Golo Kanté": 81,
  "Wilfred Ndidi": 80,
  "Alexander Nübel": 80,
  "Uğurcan Çakır": 80,
  "Barış Alper Yılmaz": 80,
  "Wilfried Singo": 80,
  "Kerem Aktürkoğlu": 80,
  "Fabinho": 80,
  "Marco Asensio": 80,
  "Emmanuel Agbadou": 79,
  "Tiago Djaló": 79,
  "Jayden Oosterwolde": 79,
  "Yunus Akgün": 79,
  "Lesley Ugochukwu": 79,
  "Aleksey Batrakov": 79,
  "Dorgeles Nene": 79,
  "Chibuike Nwaiwu": 79,
  "Archie Brown": 78,
  "Nelson Semedo": 78,
  "Alban Lafont": 78,
  "Horațiu Moldovan": 78,
  "Stefan Savić": 78,
  "Ruslan Malinovskyi": 78,
  "Vedat Muriqi": 78,
  "Sidny Lopes Cabral": 78,
  "Wagner Pina": 78,
  "Aral Şimşir": 78,
  "Noé Saviolo": 78,
  "Kassoum Ouattara": 78,
  "Marcos Felipe": 76,
  "Andreas Gianniotis": 75,
  "Abdülkerim Bardakcı": 78,
  "Kaan Ayhan": 76,
  "Eren Elmalı": 77,
  "Mario Lemina": 77,
  "Roland Sallai": 77,
  "Deniz Gül": 75,
  "Emirhan Topçu": 76,
  "Rıdvan Yılmaz": 76,
  "Amir Murillo": 76,
  "Mert Günok": 76,
  "Kojo Oppong": 77,
  "Mert Müldür": 77,
  "Levent Mercan": 75
};

const KNOWN_NATIONS = [
  "Peru", // Will map to Turquia
  "Turquia", "Brasil", "Portugal", "Alemanha", "França", "Espanha", "Itália", "Holanda", "Bélgica",
  "Inglaterra", "Argentina", "Uruguai", "Colômbia", "Equador", "Paraguai", "Chile", "Venezuela", "Bolívia",
  "Costa do Marfim", "Nigéria", "Senegal", "Gana", "Camarões", "Marrocos", "Argélia", "Egito", "Tunísia",
  "Mali", "RD do Congo", "RD Congo", "Guiné", "Guiné-Bissau", "Burkina Faso", "Gabão", "Angola", "Togo",
  "Gâmbia", "Cabo Verde", "Moçambique", "Benim", "Benin", "África do Sul", "Zimbabué", "Congo", "Comores",
  "Libéria", "Tanzânia", "Jordânia", "Croácia", "Sérvia", "Servia", "Bósnia e Herzegovina", "Bósnia-Herzegovina",
  "Montenegro", "Macedônia do Norte", "Eslovênia", "Eslováquia", "República Checa", "República Tcheca",
  "Polônia", "Hungria", "Romênia", "Bulgária", "Grécia", "Ucrânia", "Rússia", "Geórgia", "Albânia", "Kosovo",
  "Chipre", "Israel", "Síria", "Irã", "Iraque", "Azerbaijão", "Uzbequistão", "Cazaquistão", "Dinamarca",
  "Suécia", "Noruega", "Finlândia", "Islândia", "Suíça", "Áustria", "Escócia", "Irlanda", "País de Gales",
  "Estados Unidos", "Canadá", "México", "Costa Rica", "Panamá", "Jamaica", "Honduras", "Haiti", "Curaçao",
  "Trinidad e Tobago", "Martinica", "Guadalupe", "Suriname", "Japão", "Coréia do Sul", "Coreia do Sul",
  "Austrália", "Nova Zelândia"
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
      if (earliestNation === "RD do Congo") return "RD Congo";
      if (earliestNation === "Coréia do Sul") return "Coreia do Sul";
      if (earliestNation === "Benim") return "Benin";
      return earliestNation;
    }
  }
  return "Turquia";
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
  if (marketVal >= 60000000) ovr = 85;
  else if (marketVal >= 35000000) ovr = 83;
  else if (marketVal >= 25000000) ovr = 81;
  else if (marketVal >= 18000000) ovr = 79;
  else if (marketVal >= 12000000) ovr = 78;
  else if (marketVal >= 8000000) ovr = 77;
  else if (marketVal >= 5000000) ovr = 75;
  else if (marketVal >= 3000000) ovr = 74;
  else if (marketVal >= 1500000) ovr = 72;
  else if (marketVal >= 800000) ovr = 70;
  else if (marketVal >= 300000) ovr = 68;
  else ovr = 66;

  if (age >= 33 && marketVal < 2000000) {
    ovr = Math.min(ovr, 72);
  }
  if (rep >= 4 && ovr < 75) ovr += 1;
  if (rep <= 2 && ovr > 74) ovr -= 1;

  return Math.max(63, Math.min(88, ovr));
}

const rawText = fs.readFileSync(TURKEY_TXT, 'utf-8');
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
      // Pick next available
      number = parsedClubs[currentClubHeader].length + 1;
    }

    // Forward lines for age, nationality, market value
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
tsCode += `export interface TurkeyClubData {\n`;
tsCode += `  id: string;\n`;
tsCode += `  name: string;\n`;
tsCode += `  shortName: string;\n`;
tsCode += `  reputation: number;\n`;
tsCode += `  primaryColor: string;\n`;
tsCode += `  managerName: string;\n`;
tsCode += `  players: Array<[string, DetailedRole, number, number, number, string]>;\n`;
tsCode += `}\n\n`;
tsCode += `export const TURKEY_LEAGUE_2026: TurkeyClubData[] = [\n`;

for (const [header, conf] of Object.entries(CLUB_CONFIG)) {
  const players = parsedClubs[header] || [];
  // Ensure unique numbers within club
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
