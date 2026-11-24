const fs = require('fs');
const path = require('path');

const ASSETS_DIR = path.join(__dirname, '../public/assets/aistudio');
const DATA_DIR = path.join(__dirname, '../src/data');

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

const KNOWN_NATIONS = [
  "Peru", // Will map to Turquia
  "Portugal", "Holanda", "Bélgica", "Turquia", "Grécia", "Brasil", "Alemanha", "França", "Espanha", "Itália",
  "Inglaterra", "Argentina", "Uruguai", "Colômbia", "Equador", "Paraguai", "Chile", "Venezuela", "Bolívia",
  "Costa do Marfim", "Nigéria", "Senegal", "Gana", "Camarões", "Marrocos", "Argélia", "Egito", "Tunísia",
  "Mali", "RD do Congo", "RD Congo", "Guiné", "Guiné-Bissau", "Burkina Faso", "Gabão", "Angola", "Togo",
  "Gâmbia", "Cabo Verde", "Moçambique", "Benim", "Benin", "África do Sul", "Zimbabué", "Zimbábue", "Congo", "Comores",
  "Libéria", "Tanzânia", "Jordânia", "Croácia", "Sérvia", "Servia", "Bósnia e Herzegovina", "Bósnia-Herzegovina",
  "Montenegro", "Macedônia do Norte", "Macedónia do Norte", "Eslovênia", "Eslováquia", "República Checa", "República Tcheca",
  "Polônia", "Hungria", "Romênia", "Roménia", "Bulgária", "Ucrânia", "Rússia", "Geórgia", "Albânia", "Kosovo",
  "Chipre", "Israel", "Síria", "Irã", "Iraque", "Azerbaijão", "Uzbequistão", "Cazaquistão", "Dinamarca",
  "Suécia", "Noruega", "Finlândia", "Islândia", "Suíça", "Suiça", "Áustria", "Escócia", "Irlanda", "País de Gales",
  "Estados Unidos", "Canadá", "México", "Costa Rica", "Panamá", "Jamaica", "Honduras", "Haiti", "Curaçao",
  "Trinidad e Tobago", "Martinica", "Guadalupe", "Suriname", "Japão", "Coréia do Sul", "Coreia do Sul",
  "Austrália", "Nova Zelândia", "Chade", "Armênia", "Zâmbia", "Somália", "Mauritânia", "Moldávia", "Cuba",
  "Guiné Equatorial", "Bielorrússia", "Ruanda"
];

function extractNationality(infoLines, defaultCountry) {
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
  return defaultCountry;
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

function calculateOvr(name, marketVal, rep, age, starOverrides) {
  if (starOverrides && starOverrides[name]) {
    return starOverrides[name];
  }
  let ovr = 66;
  if (marketVal >= 30000000) ovr = 82;
  else if (marketVal >= 20000000) ovr = 80;
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

  return Math.max(62, Math.min(88, ovr));
}

function parseAndGenerateLeague({
  sourceFileName,
  targetFileName,
  interfaceName,
  exportConstantName,
  clubConfigs,
  nameFixes = {},
  starOverrides = {},
  defaultCountry
}) {
  const rawText = fs.readFileSync(path.join(ASSETS_DIR, sourceFileName), 'utf-8');
  const lines = rawText.split(/\r?\n/).map(l => l.trim());

  let currentClubHeader = null;
  const parsedClubs = {};
  for (const h of Object.keys(clubConfigs)) {
    parsedClubs[h] = [];
  }

  let idx = 0;
  while (idx < lines.length) {
    const line = lines[idx];
    if (clubConfigs[line]) {
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
      if (nameFixes[name]) name = nameFixes[name];

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
        if (clubConfigs[nextLine] || POSITION_MAP[nextLine]) break;
        infoLines.push(nextLine);
        const ageMatch = nextLine.match(/\(([0-9]{2})\)/);
        if (ageMatch && !ageMatch[1].startsWith("0")) {
          age = parseInt(ageMatch[1], 10);
        }
      }

      const nationality = extractNationality(infoLines, defaultCountry);
      const mktVal = parseMarketValue(infoLines.join(" \t "));
      const rep = clubConfigs[currentClubHeader].reputation;
      const ovr = calculateOvr(name, mktVal, rep, age, starOverrides);

      parsedClubs[currentClubHeader].push([name, pos, ovr, age, number, nationality]);
    }
    idx++;
  }

  let tsCode = `import { DetailedRole } from '../types/game';\n\n`;
  tsCode += `export interface ${interfaceName} {\n`;
  tsCode += `  id: string;\n`;
  tsCode += `  name: string;\n`;
  tsCode += `  shortName: string;\n`;
  tsCode += `  reputation: number;\n`;
  tsCode += `  primaryColor: string;\n`;
  tsCode += `  managerName: string;\n`;
  tsCode += `  players: Array<[string, DetailedRole, number, number, number, string]>;\n`;
  tsCode += `}\n\n`;
  tsCode += `export const ${exportConstantName}: ${interfaceName}[] = [\n`;

  for (const [header, conf] of Object.entries(clubConfigs)) {
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

  const targetPath = path.join(DATA_DIR, targetFileName);
  fs.writeFileSync(targetPath, tsCode, 'utf-8');
  console.log(`Generated ${targetFileName} with ${Object.keys(clubConfigs).length} clubs.`);
}

// 1. PORTUGAL
const PORTUGAL_CONFIGS = {
  "PORTO": { id: "eu_fcp", name: "FC Porto", shortName: "FC Porto", reputation: 4, primaryColor: "#004B87", managerName: "Vítor Bruno" },
  "BENFICA": { id: "eu_slb", name: "SL Benfica", shortName: "Benfica", reputation: 4, primaryColor: "#E30613", managerName: "Bruno Lage" },
  "SPORTING": { id: "eu_scp", name: "Sporting CP", shortName: "Sporting", reputation: 4, primaryColor: "#008057", managerName: "João Pereira" },
  "BRAGA": { id: "eu_bra", name: "SC Braga", shortName: "Braga", reputation: 4, primaryColor: "#DC2626", managerName: "Carlos Carvalhal" },
  "FAMALICAO": { id: "eu_fam", name: "FC Famalicão", shortName: "Famalicão", reputation: 3, primaryColor: "#1D4ED8", managerName: "Armando Evangelista" },
  "VITORIA SC": { id: "eu_vit", name: "Vitória SC", shortName: "Vitória SC", reputation: 3, primaryColor: "#111111", managerName: "Rui Borges" },
  "ALVERCA": { id: "eu_alv", name: "FC Alverca", shortName: "Alverca", reputation: 2, primaryColor: "#1D4ED8", managerName: "Custódio Castro" },
  "ESTRELA AMADORA": { id: "eu_est_pt", name: "CF Estrela Amadora", shortName: "Estrela", reputation: 2, primaryColor: "#DC2626", managerName: "José Faria" },
  "ESTORIL PRAIA": { id: "eu_eto", name: "GD Estoril Praia", shortName: "Estoril", reputation: 2, primaryColor: "#FACC15", managerName: "Ian Cathro" },
  "RIO AVE FC": { id: "eu_rio", name: "Rio Ave FC", shortName: "Rio Ave", reputation: 2, primaryColor: "#16A34A", managerName: "Petit" },
  "FC AROUCA": { id: "eu_aro", name: "FC Arouca", shortName: "Arouca", reputation: 2, primaryColor: "#FACC15", managerName: "Vasco Seabra" },
  "CASA PIA AC": { id: "eu_cas_pt", name: "Casa Pia AC", shortName: "Casa Pia", reputation: 2, primaryColor: "#111111", managerName: "João Pereira" },
  "MOREIRENSE FC": { id: "eu_mor", name: "Moreirense FC", shortName: "Moreirense", reputation: 2, primaryColor: "#16A34A", managerName: "César Peixoto" },
  "GIL VICENTE FC": { id: "eu_gil_pt", name: "Gil Vicente FC", shortName: "Gil Vicente", reputation: 2, primaryColor: "#DC2626", managerName: "Bruno Pinheiro" },
  "CD SANTA CRLARA": { id: "eu_stc", name: "CD Santa Clara", shortName: "Santa Clara", reputation: 2, primaryColor: "#DC2626", managerName: "Vasco Matos" },
  "CD NACIONAL": { id: "eu_nac", name: "CD Nacional", shortName: "Nacional", reputation: 2, primaryColor: "#111111", managerName: "Tiago Margarido" },
  "ACADEMICO DE VISEU FC": { id: "eu_aca", name: "Académico de Viseu", shortName: "Ac. Viseu", reputation: 2, primaryColor: "#111111", managerName: "Rui Ferreira" },
  "CS MARITIMO": { id: "eu_mar", name: "CS Marítimo", shortName: "Marítimo", reputation: 2, primaryColor: "#16A34A", managerName: "Jorge Silas" }
};
parseAndGenerateLeague({
  sourceFileName: "PORTUGAL_575ada36.txt",
  targetFileName: "portugal2026Rosters.ts",
  interfaceName: "PortugalClubData",
  exportConstantName: "PORTUGAL_LEAGUE_2026",
  clubConfigs: PORTUGAL_CONFIGS,
  defaultCountry: "Portugal",
  starOverrides: {
    "Viktor Gyökeres": 87, "Pedro Gonçalves": 83, "Gonçalo Inácio": 83, "Morten Hjulmand": 83,
    "Diogo Costa": 84, "Alan Varela": 82, "Wenderson Galeno": 82, "Samu Omorodion": 82,
    "Vangelis Pavlidis": 83, "Orkun Kökçü": 82, "Florentino Luís": 81, "Nicolás Otamendi": 80,
    "Ricardo Horta": 81, "Bruma": 80, "Rodrigo Zalazar": 80
  }
});

// 2. NETHERLANDS
const NETHERLANDS_CONFIGS = {
  "PSV": { id: "eu_psv", name: "PSV Eindhoven", shortName: "PSV", reputation: 4, primaryColor: "#ED1B24", managerName: "Peter Bosz" },
  "AJAX": { id: "eu_aja", name: "AFC Ajax", shortName: "Ajax", reputation: 4, primaryColor: "#D2122E", managerName: "Francesco Farioli" },
  "FEYENOORD": { id: "eu_fey", name: "Feyenoord Roterdã", shortName: "Feyenoord", reputation: 4, primaryColor: "#EE2737", managerName: "Brian Priske" },
  "AZ ALKMAAR": { id: "eu_az", name: "AZ Alkmaar", shortName: "AZ Alkmaar", reputation: 3, primaryColor: "#DC2626", managerName: "Maarten Martens" },
  "FC TWENTE": { id: "eu_twe", name: "FC Twente", shortName: "Twente", reputation: 3, primaryColor: "#DC2626", managerName: "Joseph Oosting" },
  "FC UTRECHT": { id: "eu_utr", name: "FC Utrecht", shortName: "Utrecht", reputation: 3, primaryColor: "#DC2626", managerName: "Ron Jans" },
  "NEC NIJMEGEN": { id: "eu_nec", name: "NEC Nijmegen", shortName: "NEC", reputation: 2, primaryColor: "#16A34A", managerName: "Rogier Meijer" },
  "SC HEERENVEEN": { id: "eu_hee", name: "SC Heerenveen", shortName: "Heerenveen", reputation: 2, primaryColor: "#1D4ED8", managerName: "Robin van Persie" },
  "FC GRONINGEN": { id: "eu_gro", name: "FC Groningen", shortName: "Groningen", reputation: 2, primaryColor: "#16A34A", managerName: "Dick Lukkien" },
  "SPARTA ROTTERDAM": { id: "eu_spa", name: "Sparta Rotterdam", shortName: "Sparta Rot.", reputation: 2, primaryColor: "#DC2626", managerName: "Jeroen Rijsdijk" },
  "PEC ZWOLLE": { id: "eu_zwo", name: "PEC Zwolle", shortName: "PEC Zwolle", reputation: 2, primaryColor: "#1D4ED8", managerName: "Johnny Jansen" },
  "GO AHEARD EAGLES": { id: "eu_gae", name: "Go Ahead Eagles", shortName: "Go Ahead", reputation: 2, primaryColor: "#DC2626", managerName: "Paul Simonis" },
  "WILLEM II": { id: "eu_wil", name: "Willem II Tilburg", shortName: "Willem II", reputation: 2, primaryColor: "#1D4ED8", managerName: "Peter Maes" },
  "EXCELSIOR ROTTERDAM": { id: "eu_exc", name: "Excelsior Rotterdam", shortName: "Excelsior", reputation: 2, primaryColor: "#111111", managerName: "Ruben den Uil" },
  "ADO HAIA": { id: "eu_ado", name: "ADO Den Haag", shortName: "ADO Haia", reputation: 2, primaryColor: "#16A34A", managerName: "Darije Kalezić" },
  "FORTUNA SITTARD": { id: "eu_for", name: "Fortuna Sittard", shortName: "Fortuna Sit.", reputation: 2, primaryColor: "#FACC15", managerName: "Danny Buijs" },
  "SC CAMBUUR LEEUWARDEN": { id: "eu_cam_nl", name: "SC Cambuur", shortName: "Cambuur", reputation: 2, primaryColor: "#FACC15", managerName: "Henk de Jong" },
  "SC TELSTAR": { id: "eu_tel", name: "SC Telstar", shortName: "Telstar", reputation: 2, primaryColor: "#111111", managerName: "Anthony Correia" }
};
parseAndGenerateLeague({
  sourceFileName: "HOLANDA_0f60ff66.txt",
  targetFileName: "netherlands2026Rosters.ts",
  interfaceName: "NetherlandsClubData",
  exportConstantName: "NETHERLANDS_LEAGUE_2026",
  clubConfigs: NETHERLANDS_CONFIGS,
  defaultCountry: "Holanda",
  starOverrides: {
    "Joey Veerman": 82, "Jerdy Schouten": 82, "Luuk de Jong": 82, "Johan Bakayoko": 83,
    "Noa Lang": 81, "Olivier Boscagli": 81, "Brian Brobbey": 81, "Kenneth Taylor": 81,
    "Steven Berghuis": 80, "Josip Sutalo": 80, "Santiago Gimenez": 83, "Quinten Timber": 82,
    "David Hancko": 82, "Igor Paixão": 81, "Sem Steijn": 80, "Ruben van Bommel": 79
  }
});

// 3. BELGIUM
const BELGIUM_CONFIGS = {
  "CLUB BRUGGE": { id: "eu_clu", name: "Club Brugge KV", shortName: "Club Brugge", reputation: 4, primaryColor: "#0055A5", managerName: "Nicky Hayen" },
  "KRC GENK": { id: "eu_gnk", name: "KRC Genk", shortName: "KRC Genk", reputation: 4, primaryColor: "#004B9B", managerName: "Thorsten Fink" },
  "UNION SAINT-GILLOISE": { id: "eu_usg", name: "Royale Union SG", shortName: "Union SG", reputation: 4, primaryColor: "#FACC15", managerName: "Sébastien Pocognoli" },
  "RSC ANDERLECHT": { id: "eu_and", name: "RSC Anderlecht", shortName: "Anderlecht", reputation: 4, primaryColor: "#5C2D91", managerName: "David Hubert" },
  "KAA GENT": { id: "eu_gnt", name: "KAA Gent", shortName: "Gent", reputation: 3, primaryColor: "#1D4ED8", managerName: "Wouter Vrancken" },
  "STANDARD DE LIEGE": { id: "eu_sta", name: "Standard de Liège", shortName: "Standard", reputation: 3, primaryColor: "#DC2626", managerName: "Ivan Leko" },
  "ROYAL ANTUERPIA FC": { id: "eu_ant", name: "Royal Antwerp FC", shortName: "Antwerp", reputation: 3, primaryColor: "#DC2626", managerName: "Jonas De Roeck" },
  "KVC WESTERLO": { id: "eu_wes", name: "KVC Westerlo", shortName: "Westerlo", reputation: 2, primaryColor: "#FACC15", managerName: "Timmy Simons" },
  "VV ST. TRUIDEN": { id: "eu_stt", name: "STVV Sint-Truiden", shortName: "Sint-Truiden", reputation: 2, primaryColor: "#FACC15", managerName: "Felice Mazzù" },
  "KV MECHELEN": { id: "eu_mec", name: "KV Mechelen", shortName: "Mechelen", reputation: 2, primaryColor: "#DC2626", managerName: "Besnik Hasi" },
  "CERCLE BRUGES": { id: "eu_cer", name: "Cercle Brugge", shortName: "Cercle Brugge", reputation: 2, primaryColor: "#16A34A", managerName: "Miron Muslic" },
  "R CHARLEROI SC": { id: "eu_cha_be", name: "Sporting Charleroi", shortName: "Charleroi", reputation: 2, primaryColor: "#111111", managerName: "Rik De Mil" },
  "OUD-HEVERLEE LEUVEN": { id: "eu_ohl", name: "OH Leuven", shortName: "OH Leuven", reputation: 2, primaryColor: "#111111", managerName: "Óscar García" },
  "ZULTE WAREGEM": { id: "eu_zul", name: "SV Zulte Waregem", shortName: "Zulte Waregem", reputation: 2, primaryColor: "#16A34A", managerName: "Vincent Euvrard" },
  "LOMMEL SK": { id: "eu_lom", name: "Lommel SK", shortName: "Lommel", reputation: 2, primaryColor: "#16A34A", managerName: "Steve Bould" },
  "RAAL LA LOUVIERE": { id: "eu_lal", name: "RAAL La Louvière", shortName: "La Louvière", reputation: 2, primaryColor: "#16A34A", managerName: "Frédéric Taquin" },
  "KV KORTRIJK": { id: "eu_kor", name: "KV Kortrijk", shortName: "Kortrijk", reputation: 2, primaryColor: "#DC2626", managerName: "Freyr Alexandersson" },
  "SK BEVEREN": { id: "eu_bev", name: "SK Beveren", shortName: "Beveren", reputation: 2, primaryColor: "#FACC15", managerName: "Marink Reedijk" }
};
parseAndGenerateLeague({
  sourceFileName: "BELGICA_801020c8.txt",
  targetFileName: "belgium2026Rosters.ts",
  interfaceName: "BelgiumClubData",
  exportConstantName: "BELGIUM_LEAGUE_2026",
  clubConfigs: BELGIUM_CONFIGS,
  defaultCountry: "Bélgica",
  starOverrides: {
    "Hans Vanaken": 81, "Andreas Skov Olsen": 82, "Maxim De Cuyper": 80, "Joel Ordóñez": 80,
    "Ardon Jashari": 80, "Christos Tzolis": 81, "Bryan Heynen": 80, "Zakaria El Ouahdi": 80,
    "Tolu Arokodare": 79, "Kasper Dolberg": 80, "Jan Vertonghen": 78, "Thorgan Hazard": 79,
    "Vincent Janssen": 79, "Senne Lammens": 78, "Cameron Puertas": 80
  }
});
