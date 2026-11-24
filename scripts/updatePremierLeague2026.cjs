const fs = require('fs');
const path = require('path');

const PREMIER_TXT_PATH = path.join(__dirname, '../public/assets/aistudio/PREMIER_LEAGUE_INGLATERRA_8ce88efc.txt');
const TARGET_TS_PATH = path.join(__dirname, '../src/data/europeTop5Rosters2026.ts');

const CLUB_HEADERS = [
  "MANCHESTER CITY",
  "ARSENAL",
  "CHELSEA",
  "LIVERPOOL",
  "MANCHESTER UNITED",
  "TOTTENHAM",
  "NEW CASTLE",
  "BRIGHTON",
  "BRENTFORD",
  "ASTON VILLA",
  "BOURNEMOUTH",
  "CRYSTAL PALACE",
  "NOTTINGHAM FOREST",
  "SUNDERLAND",
  "LEEDS UNITED",
  "EVERTON",
  "FULHAM",
  "IPSWICH TOWN FC",
  "COVENTRY CITY",
  "HULL CITY"
];

const CLUB_ID_MAP = {
  "MANCHESTER CITY": "eu_mci",
  "ARSENAL": "eu_ars",
  "CHELSEA": "eu_che",
  "LIVERPOOL": "eu_liv",
  "MANCHESTER UNITED": "eu_mun",
  "TOTTENHAM": "eu_tot",
  "NEW CASTLE": "eu_new",
  "BRIGHTON": "eu_bha",
  "BRENTFORD": "eu_bre",
  "ASTON VILLA": "eu_avl",
  "BOURNEMOUTH": "eu_bou",
  "CRYSTAL PALACE": "eu_cry",
  "NOTTINGHAM FOREST": "eu_nfo",
  "SUNDERLAND": "eu_sun",
  "LEEDS UNITED": "eu_lee",
  "EVERTON": "eu_eve",
  "FULHAM": "eu_ful",
  "IPSWICH TOWN FC": "eu_ips",
  "COVENTRY CITY": "eu_cov",
  "HULL CITY": "eu_hul"
};

const CLUB_REP = {
  "eu_mci": 5, "eu_ars": 5, "eu_che": 5, "eu_liv": 5, "eu_mun": 5,
  "eu_tot": 4, "eu_new": 4, "eu_avl": 4, "eu_bha": 4, "eu_nfo": 4, "eu_lee": 4, "eu_eve": 4,
  "eu_bre": 3, "eu_bou": 3, "eu_cry": 3, "eu_sun": 3, "eu_ful": 3, "eu_ips": 3, "eu_cov": 3, "eu_hul": 3
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
  "Ponta Esquerda": "ATA",
  "Ponta Direita": "ATA",
  "Centroavante": "ATA",
  "Segundo Atacante": "ATA"
};

const NAME_FIXES = {
  "Monte Mason": "Mason Mount",
  "Marco Rashford": "Marcus Rashford",
  "Destino Udogie": "Destiny Udogie",
  "André Robertson": "Andrew Robertson",
  "Granito Xhaka": "Granit Xhaka",
  "Cristo Tzolis": "Christos Tzolis",
  "Montanhas Sander": "Sander Berge",
  "Justin Kluiver": "Justin Kluivert",
  "Ben Gannon-Doak": "Ben Doak",
  "Kroupi Júnior": "Eli Junior Kroupi",
  "João McGinn": "John McGinn",
  "Olá Aina": "Ola Aina",
  "Tom Cairnney": "Tom Cairney",
  "Constantino Tzolakis": "Konstantinos Tzolakis",
  "Cristo Mouzakitis": "Christos Mouzakitis",
  "Promessa David": "Promise David",
  "Harry Amassa": "Harry Amass",
  "Josué Zirkzee": "Joshua Zirkzee",
  "Joaquim Andersen": "Joachim Andersen",
  "Gabriel": "Gabriel Magalhães"
};

const STAR_OVR_OVERRIDES = {
  "Erling Haaland": 91,
  "Bukayo Saka": 88,
  "Martin Ødegaard": 88,
  "William Saliba": 88,
  "Virgil van Dijk": 88,
  "Alisson Becker": 88,
  "Alisson": 88,
  "Mohamed Salah": 89,
  "Florian Wirtz": 89,
  "Phil Foden": 87,
  "Rúben Dias": 87,
  "Declan Rice": 87,
  "Cole Palmer": 87,
  "Gianluigi Donnarumma": 87,
  "Gabriel Magalhães": 87,
  "Bruno Fernandes": 86,
  "Alexander Isak": 86,
  "Viktor Gyökeres": 86,
  "Emiliano Martínez": 86,
  "Joško Gvardiol": 86,
  "Josko Gvardiol": 86,
  "Enzo Fernández": 85,
  "Moisés Caicedo": 85,
  "Bruno Guimarães": 85,
  "David Raya": 85,
  "Kai Havertz": 84,
  "Son Heung-min": 84,
  "Ollie Watkins": 84,
  "Cristian Romero": 84,
  "Anthony Gordon": 84,
  "James Maddison": 83,
  "Dejan Kulusevski": 83,
  "Eberechi Eze": 83,
  "Youri Tielemans": 83,
  "Marc Guéhi": 83,
  "Matheus Cunha": 83,
  "Jarrod Bowen": 83,
  "Bryan Mbeumo": 82,
  "João Pedro": 82,
  "Kaoru Mitoma": 82,
  "Murillo": 82,
  "Morgan Gibbs-White": 82,
  "Jordan Pickford": 82,
  "Jarrad Branthwaite": 82,
  "Mohammed Kudus": 82,
  "Dominic Solanke": 82,
  "Amadou Onana": 82,
  "Morgan Rogers": 82,
  "Antoine Semenyo": 82,
  "Rico Lewis": 81,
  "João Gomes": 81,
  "Chris Wood": 80,
  "Lucas Bergvall": 80,
  "Destiny Udogie": 82,
  "Pedro Porro": 82,
  "Guglielmo Vicario": 83,
  "Sandro Tonali": 84,
  "Joelinton": 82,
  "Sven Botman": 83,
  "Tino Livramento": 81,
  "Lewis Hall": 80,
  "Nick Pope": 82,
  "Pau Torres": 83,
  "Ezri Konsa": 83,
  "Matty Cash": 80,
  "Lucas Digne": 80,
  "Boubacar Kamara": 82,
  "Jacob Ramsey": 80,
  "Leon Bailey": 82,
  "Bart Verbruggen": 82,
  "Jan Paul van Hecke": 81,
  "Carlos Baleba": 81,
  "Mats Wieffer": 80,
  "Yankuba Minteh": 80,
  "Ferdi Kadıoğlu": 80,
  "Georginio Rutter": 80,
  "Evan Ferguson": 80,
  "Yoane Wissa": 80,
  "Christian Nørgaard": 80,
  "Mathias Jensen": 79,
  "Mikkel Damsgaard": 79,
  "Sepp van den Berg": 79,
  "Nathan Collins": 79,
  "Milos Kerkez": 81,
  "Illia Zabarnyi": 81,
  "Dean Huijsen": 80,
  "Tyler Adams": 79,
  "Alex Scott": 79,
  "Justin Kluivert": 80,
  "Marcus Tavernier": 79,
  "Evanilson": 81,
  "Jean-Philippe Mateta": 81,
  "Adam Wharton": 81,
  "Daniel Muñoz": 80,
  "Maxence Lacroix": 80,
  "Chris Richards": 79,
  "Cheick Doucouré": 80,
  "Ismaïla Sarr": 79,
  "Daichi Kamada": 79,
  "Matz Sels": 81,
  "Nikola Milenković": 81,
  "Ola Aina": 79,
  "Neco Williams": 79,
  "Elliot Anderson": 81,
  "Nicolás Domínguez": 79,
  "Ibrahim Sangaré": 80,
  "Callum Hudson-Odoi": 80,
  "Anthony Elanga": 80,
  "Taiwo Awoniyi": 79,
  "Bernd Leno": 82,
  "Joachim Andersen": 81,
  "Calvin Bassey": 80,
  "Antonee Robinson": 82,
  "Timothy Castagne": 79,
  "Kenny Tete": 79,
  "Sander Berge": 80,
  "Saša Lukić": 79,
  "Alex Iwobi": 80,
  "Emile Smith Rowe": 81,
  "Harry Wilson": 79,
  "Rodrigo Muniz": 80,
  "Raúl Jiménez": 79,
  "Dwight McNeil": 79,
  "Jack Harrison": 78,
  "Abdoulaye Doucouré": 79,
  "James Tarkowski": 80,
  "Vitaliy Mykolenko": 79,
  "Nathan Patterson": 77,
  "Iliman Ndiaye": 80,
  "Jesper Lindstrøm": 78,
  "Beto": 78,
  "Dominic Calvert-Lewin": 79
};

const KNOWN_NATIONS = [
  "Inglaterra", "Brasil", "França", "Espanha", "Portugal", "Alemanha", "Itália",
  "Argentina", "Holanda", "Bélgica", "Escócia", "Irlanda", "País de Gales", "Irlanda do Norte",
  "Dinamarca", "Suécia", "Noruega", "Croácia", "Sérvia", "Suíça", "Áustria", "Polônia",
  "República Checa", "República Tcheca", "Ucrânia", "Turquia", "Grécia", "Romênia", "Hungria",
  "Eslováquia", "Eslovênia", "Finlândia", "Islândia", "Albânia", "Bósnia e Herzegovina",
  "Macedônia do Norte", "Geórgia", "Bulgária", "Chipre", "Kosovo", "Montenegro", "Luxemburgo",
  "Senegal", "Nigéria", "Costa do Marfim", "Gana", "Camarões", "Marrocos", "Argélia", "Egito",
  "Tunísia", "Mali", "RD do Congo", "RD Congo", "Guiné", "Guiné-Bissau", "Guiné Bissau", "Burkina Faso",
  "Gabão", "Angola", "Togo", "Zimbabué", "Gâmbia", "Cabo Verde", "Moçambique", "Serra Leoa",
  "Benin", "África do Sul", "Eritreia",
  "Uruguai", "Colômbia", "Equador", "Paraguai", "Chile", "Peru", "Venezuela", "Bolívia", "Suriname", "Guiana",
  "Estados Unidos", "Canadá", "México", "Jamaica", "Costa Rica", "Barbados", "Curaçao", "Curacao",
  "Granada", "Trinidad e Tobago", "Haiti", "São Cristóvão e Nevis", "São Cristovão e Nevis", "São Vicente e Granadinas",
  "Guadalupe", "Martinica", "Montserrat", "Guernsey",
  "Japão", "Coreia do Sul", "Coréia do Sul", "Austrália", "Uzbequistão", "Israel", "Irã", "Nova Zelândia"
];

function extractNationality(infoLines) {
  const full = infoLines.join(" \t ");
  for (const n of KNOWN_NATIONS) {
    const re = new RegExp("\\b" + n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\b", "i");
    if (re.test(full)) {
      if (n === "Coréia do Sul") return "Coreia do Sul";
      if (n === "República Checa") return "República Tcheca";
      if (n === "RD do Congo") return "RD Congo";
      if (n === "Guiné Bissau") return "Guiné-Bissau";
      if (n === "São Cristovão e Nevis") return "São Cristóvão e Nevis";
      if (n === "Curacao") return "Curaçao";
      if (n === "Guernsey") return "Inglaterra";
      return n;
    }
  }
  return "Inglaterra";
}

function parseMarketValue(fullInfo) {
  const decMillions = fullInfo.match(/(?:€|EUR)?\s*([0-9]+[.,][0-9]+)\s*(?:mi|milhões|milhas|m\b)/i);
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
  let ovr = 68;
  if (marketVal >= 120000000) ovr = 87;
  else if (marketVal >= 90000000) ovr = 86;
  else if (marketVal >= 75000000) ovr = 85;
  else if (marketVal >= 60000000) ovr = 84;
  else if (marketVal >= 45000000) ovr = 82;
  else if (marketVal >= 35000000) ovr = 81;
  else if (marketVal >= 25000000) ovr = 80;
  else if (marketVal >= 18000000) ovr = 78;
  else if (marketVal >= 12000000) ovr = 77;
  else if (marketVal >= 8000000) ovr = 76;
  else if (marketVal >= 5000000) ovr = 75;
  else if (marketVal >= 3000000) ovr = 73;
  else if (marketVal >= 1500000) ovr = 72;
  else if (marketVal >= 800000) ovr = 70;
  else ovr = 67;

  if (age >= 33 && marketVal < 3000000) {
    ovr = Math.min(ovr, 72);
  }
  if (rep >= 5 && ovr < 78) ovr += 1;
  if (rep <= 3 && ovr > 78) ovr -= 1;

  return Math.max(64, Math.min(91, ovr));
}

// Read raw txt
const rawText = fs.readFileSync(PREMIER_TXT_PATH, 'utf-8');
const lines = rawText.split('\r\n').join('\n').split('\n');

let currentClubName = null;
const parsedClubsRaw = {};
for (const h of CLUB_HEADERS) parsedClubsRaw[h] = [];

let idx = 0;
while (idx < lines.length) {
  const line = lines[idx].trim();
  if (CLUB_HEADERS.includes(line)) {
    currentClubName = line;
    idx++;
    continue;
  }
  if (!currentClubName) {
    idx++;
    continue;
  }

  if (POSITION_MAP[line]) {
    const posStr = line;
    const nameLine = lines[idx - 1] ? lines[idx - 1].trim() : "";
    const numLine = lines[idx - 2] ? lines[idx - 2].trim() : "";

    let j = idx + 1;
    let infoLines = [];
    while (j < lines.length) {
      const nextL = lines[j].trim();
      if (CLUB_HEADERS.includes(nextL)) break;
      if (POSITION_MAP[nextL] || (lines[j+1] && POSITION_MAP[lines[j+1].trim()])) break;
      if (lines[j+2] && POSITION_MAP[lines[j+2].trim()]) break;
      infoLines.push(nextL);
      j++;
    }

    // Name
    const nameParts = nameLine.split('\t').map(s => s.trim()).filter(Boolean);
    let playerName = nameParts[0] || "Jogador";
    if (NAME_FIXES[playerName]) {
      playerName = NAME_FIXES[playerName];
    }

    // Number
    const numMatch = numLine.match(/^(\d+)/);
    const squadNum = numMatch ? parseInt(numMatch[1], 10) : 0;

    // Position
    const role = POSITION_MAP[posStr] || 'MEI';

    // Age
    const fullInfo = infoLines.join(' ');
    const ageMatch = fullInfo.match(/\((\d+)\)/);
    const age = ageMatch ? parseInt(ageMatch[1], 10) : 25;

    // Nationality
    const nationality = extractNationality(infoLines);

    // Market Value & OVR
    const marketVal = parseMarketValue(fullInfo);
    const clubId = CLUB_ID_MAP[currentClubName];
    const rep = CLUB_REP[clubId] || 3;
    const overall = calculateOvr(playerName, marketVal, rep, age);

    parsedClubsRaw[currentClubName].push({
      name: playerName,
      role,
      overall,
      age,
      squadNumber: squadNum,
      nationality,
      marketVal
    });

    idx = j;
    continue;
  }
  idx++;
}

// Now process each club:
// 1. Max squad size 30: if > 30, remove lowest overall, ensuring at least 2 GOLs remain
// 2. Assign unique squad numbers (1-99)
// 3. Select exactly 11 starters: 1 GOL, 2 ZAG, 2 LAT, 3 VOL/MEI, 3 ATA
// 4. Mark next 7-9 as substitutes, rest as reserves
const finalPremierSquads = {};

for (const header of CLUB_HEADERS) {
  const clubId = CLUB_ID_MAP[header];
  let players = parsedClubsRaw[header];

  console.log(`\nProcessing ${header} (${clubId}) - Raw count: ${players.length}`);

  // If squad > 30, trim weakest players while preserving at least 2 GOLs
  if (players.length > 30) {
    console.log(`  Trimming ${header} from ${players.length} down to 30 players...`);
    // Separate GOLs and outfield
    const gks = players.filter(p => p.role === 'GOL');
    const outfield = players.filter(p => p.role !== 'GOL');

    // Keep top 2 GKs minimum
    gks.sort((a, b) => b.overall - a.overall);
    outfield.sort((a, b) => b.overall - a.overall);

    const mustKeepGks = gks.slice(0, 2);
    const candidates = [...gks.slice(2), ...outfield];
    candidates.sort((a, b) => b.overall - a.overall);

    const needed = 30 - mustKeepGks.length;
    players = [...mustKeepGks, ...candidates.slice(0, needed)];
  }

  // Ensure unique numbers
  const usedNumbers = new Set();
  players.forEach(p => {
    if (p.squadNumber > 0 && p.squadNumber < 100 && !usedNumbers.has(p.squadNumber)) {
      usedNumbers.add(p.squadNumber);
    } else {
      p.squadNumber = 0; // will be assigned
    }
  });

  // Assign numbers to those with 0
  let nextNum = 1;
  players.forEach(p => {
    if (p.squadNumber === 0) {
      while (usedNumbers.has(nextNum) || nextNum > 99) {
        nextNum++;
      }
      p.squadNumber = nextNum;
      usedNumbers.add(nextNum);
      nextNum++;
    }
  });

  // Pick starters
  // 1 GOL, 2 ZAG, 2 LAT, 3 VOL/MEI, 3 ATA
  const gks = players.filter(p => p.role === 'GOL').sort((a, b) => b.overall - a.overall);
  const zags = players.filter(p => p.role === 'ZAG').sort((a, b) => b.overall - a.overall);
  const lats = players.filter(p => p.role === 'LAT').sort((a, b) => b.overall - a.overall);
  const mids = players.filter(p => p.role === 'VOL' || p.role === 'MEI').sort((a, b) => b.overall - a.overall);
  const atas = players.filter(p => p.role === 'ATA').sort((a, b) => b.overall - a.overall);

  const starters = [];
  const starterIds = new Set();

  function addStarter(p) {
    if (p && !starterIds.has(p.name)) {
      starters.push(p);
      starterIds.add(p.name);
    }
  }

  // 1 GK
  if (gks.length > 0) addStarter(gks[0]);
  // 2 CB
  if (zags.length > 0) addStarter(zags[0]);
  if (zags.length > 1) addStarter(zags[1]);
  // 2 FB
  if (lats.length > 0) addStarter(lats[0]);
  if (lats.length > 1) addStarter(lats[1]);
  // 3 Mids
  for (let k = 0; k < Math.min(3, mids.length); k++) {
    addStarter(mids[k]);
  }
  // 3 Atas
  for (let k = 0; k < Math.min(3, atas.length); k++) {
    addStarter(atas[k]);
  }

  // If fewer than 11 (e.g. lack of specific positions), fill up to 11 with highest overall available outfield players
  if (starters.length < 11) {
    const remainingOutfield = players
      .filter(p => p.role !== 'GOL' && !starterIds.has(p.name))
      .sort((a, b) => b.overall - a.overall);
    for (const p of remainingOutfield) {
      if (starters.length >= 11) break;
      addStarter(p);
    }
  }

  console.log(`  Starters selected: ${starters.length}/11`);

  // Substitutes: next highest rated players (7 to 9 subs), including at least 1 backup GK
  const nonStarters = players.filter(p => !starterIds.has(p.name)).sort((a, b) => b.overall - a.overall);
  const subs = [];
  const subIds = new Set();

  // Backup GK
  const backupGk = nonStarters.find(p => p.role === 'GOL');
  if (backupGk) {
    subs.push(backupGk);
    subIds.add(backupGk.name);
  }

  // Add outfield subs until 9 subs
  for (const p of nonStarters) {
    if (subs.length >= 9) break;
    if (!subIds.has(p.name)) {
      subs.push(p);
      subIds.add(p.name);
    }
  }

  // Format as Top5PlayerTuple
  // [name, role, overall, age, squadNumber, nationality, isStarter, isSubstitute]
  // Sort order: Starters first (GK, DEF, MID, ATA), then Substitutes, then Reserves
  const orderedSquad = [];

  // Group starters
  const orderRole = { 'GOL': 0, 'ZAG': 1, 'LAT': 2, 'VOL': 3, 'MEI': 4, 'ATA': 5 };
  starters.sort((a, b) => orderRole[a.role] - orderRole[b.role] || b.overall - a.overall);

  for (const p of starters) {
    orderedSquad.push([p.name, p.role, p.overall, p.age, p.squadNumber, p.nationality, true, false]);
  }

  for (const p of subs) {
    orderedSquad.push([p.name, p.role, p.overall, p.age, p.squadNumber, p.nationality, false, true]);
  }

  const reserves = nonStarters.filter(p => !subIds.has(p.name));
  for (const p of reserves) {
    orderedSquad.push([p.name, p.role, p.overall, p.age, p.squadNumber, p.nationality, false, false]);
  }

  finalPremierSquads[clubId] = orderedSquad;
  console.log(`  Total in final squad: ${orderedSquad.length} (Starters: ${starters.length}, Subs: ${subs.length}, Reserves: ${reserves.length})`);
}

// Read current europeTop5Rosters2026.ts
let currentTs = fs.readFileSync(TARGET_TS_PATH, 'utf-8');

// Replace each Premier League squad in TOP5_SQUADS_DATA
for (const [clubId, squadList] of Object.entries(finalPremierSquads)) {
  const keyPattern = new RegExp(`  '${clubId}': \\[([\\s\\S]*?)\\](?=,\\s*'(?:eu_|fra_|ita_|ger_|esp_)|\\s*};)`, 'm');
  const match = currentTs.match(keyPattern);
  if (!match) {
    console.error(`Could not find key pattern for ${clubId} in TOP5_SQUADS_DATA!`);
    continue;
  }

  const replacementLines = squadList.map(tuple => {
    return `    [${JSON.stringify(tuple[0])}, '${tuple[1]}', ${tuple[2]}, ${tuple[3]}, ${tuple[4]}, ${JSON.stringify(tuple[5])}, ${tuple[6]}, ${tuple[7]}]`;
  }).join(',\n');

  const newBlock = `  '${clubId}': [\n${replacementLines}\n  ]`;
  currentTs = currentTs.replace(match[0], newBlock);
  console.log(`Updated squad for ${clubId}!`);
}

fs.writeFileSync(TARGET_TS_PATH, currentTs, 'utf-8');
console.log('\nSuccessfully updated europeTop5Rosters2026.ts with all 20 Premier League squads!');
