const fs = require('fs');

function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  const quote = String.fromCharCode(34);
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === quote) {
      inQuotes = !inQuotes;
    } else if (c === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += c;
    }
  }
  result.push(current);
  return result;
}

const csvPath = 'public/assets/aistudio/players_data_light-2026_2027_c9e92aeb.csv';
const content = fs.readFileSync(csvPath, 'utf-8');
const lines = content.split('\n').filter((l) => l.trim().length > 0);

const NATION_MAP = {
  'br BRA': 'Brasil',
  'ar ARG': 'Argentina',
  'uy URU': 'Uruguai',
  'py PAR': 'Paraguai',
  'co COL': 'Colômbia',
  'ec ECU': 'Equador',
  'cl CHI': 'Chile',
  've VEN': 'Venezuela',
  'pe PER': 'Peru',
  'bo BOL': 'Bolívia',
  'es ESP': 'Espanha',
  'fr FRA': 'França',
  'it ITA': 'Itália',
  'de GER': 'Alemanha',
  'eng ENG': 'Inglaterra',
  'pt POR': 'Portugal',
  'nl NED': 'Holanda',
  'be BEL': 'Bélgica',
  'hr CRO': 'Croácia',
  'rs SRB': 'Sérvia',
  'ch SUI': 'Suíça',
  'at AUT': 'Áustria',
  'dk DEN': 'Dinamarca',
  'se SWE': 'Suécia',
  'no NOR': 'Noruega',
  'pl POL': 'Polônia',
  'cz CZE': 'República Tcheca',
  'ua UKR': 'Ucrânia',
  'ro ROU': 'Romênia',
  'hu HUN': 'Hungria',
  'tr TUR': 'Turquia',
  'gr GRE': 'Grécia',
  'sct SCO': 'Escócia',
  'wls WAL': 'País de Gales',
  'ie IRL': 'Irlanda',
  'nir NIR': 'Irlanda do Norte',
  'sk SVK': 'Eslováquia',
  'si SVN': 'Eslovênia',
  'ba BIH': 'Bósnia e Herzegovina',
  'me MNE': 'Montenegro',
  'mk MKD': 'Macedônia do Norte',
  'xk KVX': 'Kosovo',
  'al ALB': 'Albânia',
  'bg BUL': 'Bulgária',
  'ge GEO': 'Geórgia',
  'am ARM': 'Armênia',
  'il ISR': 'Israel',
  'is ISL': 'Islândia',
  'fi FIN': 'Finlândia',
  'lu LUX': 'Luxemburgo',
  'ee EST': 'Estônia',
  'lt LTU': 'Lituânia',
  'ru RUS': 'Rússia',
  'ma MAR': 'Marrocos',
  'dz ALG': 'Argélia',
  'tn TUN': 'Tunísia',
  'eg EGY': 'Egito',
  'sn SEN': 'Senegal',
  'ng NGA': 'Nigéria',
  'ci CIV': 'Costa do Marfim',
  'gh GHA': 'Gana',
  'cm CMR': 'Camarões',
  'ml MLI': 'Mali',
  'gn GUI': 'Guiné',
  'gw GNB': 'Guiné-Bissau',
  'gq EQG': 'Guiné Equatorial',
  'bf BFA': 'Burkina Faso',
  'cd COD': 'RD Congo',
  'cg CGO': 'Congo',
  'ga GAB': 'Gabão',
  'ao ANG': 'Angola',
  'mz MOZ': 'Moçambique',
  'cv CPV': 'Cabo Verde',
  'bj BEN': 'Benin',
  'tg TOG': 'Togo',
  'sl SLE': 'Serra Leoa',
  'gm GAM': 'Gâmbia',
  'mr MTN': 'Mauritânia',
  'ne NIG': 'Níger',
  'zm ZAM': 'Zâmbia',
  'tz TAN': 'Tanzânia',
  'ke KEN': 'Quênia',
  'bi BDI': 'Burundi',
  'km COM': 'Comores',
  'cf CTA': 'República Centro-Africana',
  'za RSA': 'África do Sul',
  'us USA': 'Estados Unidos',
  'ca CAN': 'Canadá',
  'mx MEX': 'México',
  'cr CRC': 'Costa Rica',
  'jm JAM': 'Jamaica',
  'ht HAI': 'Haiti',
  'do DOM': 'República Dominicana',
  'gp GLP': 'Guadalupe',
  'mq MTQ': 'Martinica',
  'sr SUR': 'Suriname',
  'jp JPN': 'Japão',
  'kr KOR': 'Coreia do Sul',
  'au AUS': 'Austrália',
  'nz NZL': 'Nova Zelândia',
  'sa KSA': 'Arábia Saudita',
  'ir IRN': 'Irã',
  'jo JOR': 'Jordânia',
  'uz UZB': 'Uzbequistão',
  'th THA': 'Tailândia',
  'id IDN': 'Indonésia',
  'ph PHI': 'Filipinas',
};

const KNOWN_ROLES = {
  // Wingers & Strikers (ATA)
  'Kylian Mbappé': 'ATA',
  'Vinícius Júnior': 'ATA',
  'Vinicius Júnior': 'ATA',
  'Erling Haaland': 'ATA',
  'Harry Kane': 'ATA',
  'Mohamed Salah': 'ATA',
  'Lamine Yamal': 'ATA',
  'Bukayo Saka': 'ATA',
  'Raphinha': 'ATA',
  'Lautaro Martínez': 'ATA',
  'Ousmane Dembélé': 'ATA',
  'Michael Olise': 'ATA',
  'Rafael Leão': 'ATA',
  'Antoine Griezmann': 'ATA',
  'Julián Álvarez': 'ATA',
  'Alexander Isak': 'ATA',
  'Viktor Gyökeres': 'ATA',
  'Nico Williams': 'ATA',
  'Rodrygo': 'ATA',
  'Robert Lewandowski': 'ATA',
  'Romelu Lukaku': 'ATA',
  'Dušan Vlahović': 'ATA',
  'Marcus Thuram': 'ATA',
  'Victor Boniface': 'ATA',
  'Serhou Guirassy': 'ATA',
  'Loïs Openda': 'ATA',
  'Benjamin Šeško': 'ATA',
  'Jonathan David': 'ATA',
  'Alexandre Lacazette': 'ATA',
  'Kai Havertz': 'ATA',
  'Gabriel Jesus': 'ATA',
  'Matheus Cunha': 'ATA',
  'Anthony Gordon': 'ATA',
  'Bradley Barcola': 'ATA',
  'Jeremy Doku': 'ATA',
  'Ferran Torres': 'ATA',
  'Karim Adeyemi': 'ATA',
  'Bryan Mbeumo': 'ATA',
  'João Pedro': 'ATA',
  'Kaoru Mitoma': 'ATA',
  'Jarrod Bowen': 'ATA',
  'Christian Pulisic': 'ATA',
  'Ademola Lookman': 'ATA',
  'Son Heung-min': 'ATA',
  'Ollie Watkins': 'ATA',
  'Endrick': 'ATA',
  'Arda Güler': 'ATA',
  'Brahim Díaz': 'ATA',
  'Carlos Espí': 'ATA',
  'Khvicha Kvaratskhelia': 'ATA',
  'Dominic Solanke': 'ATA',
  'Antoine Semenyo': 'ATA',
  'Iliman Ndiaye': 'ATA',
  'Ryan Mcaidoo': 'ATA',
  'Christos Tzolis': 'ATA',
  'Noni Madueke': 'ATA',
  'Hugo Ekitike': 'ATA',
  'Omar Marmoush': 'ATA',
  'Deniz Undav': 'ATA',
  'Georges Mikautadze': 'ATA',
  'Mason Greenwood': 'ATA',
  'Folarin Balogun': 'ATA',
  'Takumi Minamino': 'ATA',

  // Attacking & Central Midfielders (MEI)
  'Jude Bellingham': 'MEI',
  'Martin Ødegaard': 'MEI',
  'Jamal Musiala': 'MEI',
  'Florian Wirtz': 'MEI',
  'Pedri': 'MEI',
  'Dani Olmo': 'MEI',
  'Phil Foden': 'MEI',
  'Cole Palmer': 'MEI',
  'Bruno Fernandes': 'MEI',
  'James Maddison': 'MEI',
  'Dejan Kulusevski': 'MEI',
  'Xavi Simons': 'MEI',
  'Julian Brandt': 'MEI',
  'Rayan Cherki': 'MEI',
  'Fermin López': 'MEI',
  'Gavi': 'MEI',
  'Lucas Bergvall': 'MEI',
  'Eberechi Eze': 'MEI',
  'Morgan Gibbs-White': 'MEI',
  'Morgan Rogers': 'MEI',
  'Youri Tielemans': 'MEI',
  'Scott McTominay': 'MEI',
  'Teun Koopmeiners': 'MEI',
  'Tijjani Reijnders': 'MEI',
  'Charles De Ketelaere': 'MEI',
  'Piotr Zieliński': 'MEI',
  'Bernardo Silva': 'MEI',
  'Elliot Anderson': 'MEI',
  'Maghnes Akliouche': 'MEI',
  'Enzo Millot': 'MEI',
  'Aleksandar Pavlovic': 'MEI',
  'Yan Diomandé': 'MEI',
  'Petar Sučić': 'MEI',

  // Defensive & Deep-Lying Midfielders (VOL)
  'Rodri': 'VOL',
  'Declan Rice': 'VOL',
  'Joshua Kimmich': 'VOL',
  'Aurélien Tchouaméni': 'VOL',
  'Eduardo Camavinga': 'VOL',
  'Federico Valverde': 'VOL',
  'Vitinha': 'VOL',
  'Moisés Caicedo': 'VOL',
  'Enzo Fernández': 'VOL',
  'Nicolò Barella': 'VOL',
  'Hakan Çalhanoğlu': 'VOL',
  'Granit Xhaka': 'VOL',
  'Exequiel Palacios': 'VOL',
  'João Neves': 'VOL',
  'Warren Zaïre-Emery': 'VOL',
  'Bruno Guimarães': 'VOL',
  'Sandro Tonali': 'VOL',
  'João Gomes': 'VOL',
  'André': 'VOL',
  'Amadou Onana': 'VOL',
  'Frenkie de Jong': 'VOL',
  'Martín Zubimendi': 'VOL',
  'Mikel Merino': 'VOL',
  'Mateo Kovačić': 'VOL',
  'Adrien Rabiot': 'VOL',
  'Pierre-Emile Højbjerg': 'VOL',
  'Andy Diouf': 'VOL',
  'Marc Bernal': 'VOL',
  'Myles Lewis-Skelly': 'VOL',

  // Fullbacks / Laterais (LAT)
  'Trent Alexander-Arnold': 'LAT',
  'Marc Cucurella': 'LAT',
  'Alejandro Balde': 'LAT',
  'João Cancelo': 'LAT',
  'Denzel Dumfries': 'LAT',
  'Álvaro Carreras': 'LAT',
  'Achraf Hakimi': 'LAT',
  'Alejandro Grimaldo': 'LAT',
  'Jeremie Frimpong': 'LAT',
  'Theo Hernández': 'LAT',
  'Federico Dimarco': 'LAT',
  'Pedro Porro': 'LAT',
  'Destiny Udogie': 'LAT',
  'Rico Lewis': 'LAT',
  'Andrew Robertson': 'LAT',
  'Conor Bradley': 'LAT',
  'Nuno Mendes': 'LAT',
  'Malo Gusto': 'LAT',
  'Reece James': 'LAT',
  'Alphonso Davies': 'LAT',
  'Ferland Mendy': 'LAT',
  'Lucas Vázquez': 'LAT',
  'Daniel Carvajal': 'LAT',
  'Pervis Estupiñán': 'LAT',
  'Antonee Robinson': 'LAT',
  'Tino Livramento': 'LAT',
  'Lewis Hall': 'LAT',
  'Kieran Trippier': 'LAT',
  'Dan Burn': 'LAT',
  'Matty Cash': 'LAT',
  'Lucas Digne': 'LAT',
  'Ian Maatsen': 'LAT',
  'Benjamin Henrichs': 'LAT',
  'David Raum': 'LAT',
  'Maximilian Mittelstädt': 'LAT',
  'Christian Günter': 'LAT',
  'Carlos Augusto': 'LAT',
  'Giovanni Di Lorenzo': 'LAT',
  'Mathías Olivera': 'LAT',
  'Raoul Bellanova': 'LAT',
  'Robin Gosens': 'LAT',
  'Nahuel Molina': 'LAT',
  'Javi Galán': 'LAT',
  'Reinildo': 'LAT',
  'José Gayà': 'LAT',
  'Thierry Correia': 'LAT',
  'Juan Foyth': 'LAT',
  'Matheus Nunes': 'LAT',
  'Xavi Espart': 'LAT',
  'Gerard Martín': 'LAT',
  'Ben White': 'LAT',

  // Center Backs / Zagueiros (ZAG)
  'William Saliba': 'ZAG',
  'Gabriel Magalhães': 'ZAG',
  'Virgil van Dijk': 'ZAG',
  'Rúben Dias': 'ZAG',
  'Antonio Rüdiger': 'ZAG',
  'Éder Militão': 'ZAG',
  'Ibrahima Konaté': 'ZAG',
  'Dean Huijsen': 'ZAG',
  'Marquinhos': 'ZAG',
  'Alessandro Bastoni': 'ZAG',
  'Bremer': 'ZAG',
  'Pau Cubarsí': 'ZAG',
  'Jonathan Tah': 'ZAG',
  'Dayot Upamecano': 'ZAG',
  'Manuel Akanji': 'ZAG',
  'Cristian Romero': 'ZAG',
  'Marc Guéhi': 'ZAG',
  'Joško Gvardiol': 'ZAG',
  'Ezri Konsa': 'ZAG',
  'Riccardo Calafiori': 'ZAG',
  'Jurriën Timber': 'ZAG',
  'Willian Pacho': 'ZAG',
  'Benjamin Pavard': 'ZAG',
  'Yann Aurel Bisseck': 'ZAG',
  'Nico Schlotterbeck': 'ZAG',
  'Robin Le Normand': 'ZAG',
  'Andreas Christensen': 'ZAG',
  'Eric García': 'ZAG',
  'Ronald Araújo': 'ZAG',
  'Cristhian Mosquera': 'ZAG',
  'Murillo': 'ZAG',
  'Jarrad Branthwaite': 'ZAG',
  'Abdukodir Khusanov': 'ZAG',
  'Vitor Reis': 'ZAG',
  'Hiroki Ito': 'ZAG',
  'David Boly': 'ZAG',

  // Goalkeepers (GOL)
  'Thibaut Courtois': 'GOL',
  'Alisson Becker': 'GOL',
  'Ederson': 'GOL',
  'David Raya': 'GOL',
  'Gianluigi Donnarumma': 'GOL',
  'Mike Maignan': 'GOL',
  'Gregor Kobel': 'GOL',
  'Jan Oblak': 'GOL',
  'Emiliano Martínez': 'GOL',
  'Manuel Neuer': 'GOL',
  'Joan García': 'GOL',
  'Wojciech Szczęsny': 'GOL',
  'Dominik Livaković': 'GOL',
  'Andriy Lunin': 'GOL',
  'Jordan Pickford': 'GOL',
  'Matvei Safonov': 'GOL',
  'Josep Martinez': 'GOL',
  'Yann Sommer': 'GOL',
};

const STAR_OVR_OVERRIDES = {
  'Kylian Mbappé': 91,
  'Erling Haaland': 91,
  'Vinícius Júnior': 90,
  'Vinicius Júnior': 90,
  'Harry Kane': 90,
  'Rodri': 90,
  'Jude Bellingham': 89,
  'Mohamed Salah': 89,
  'Lamine Yamal': 89,
  'Florian Wirtz': 89,
  'Lautaro Martínez': 89,
  'Thibaut Courtois': 89,
  'Bukayo Saka': 88,
  'Martin Ødegaard': 88,
  'William Saliba': 88,
  'Gabriel Magalhães': 87,
  'Declan Rice': 87,
  'Virgil van Dijk': 88,
  'Alisson Becker': 88,
  'Pedri': 88,
  'Raphinha': 88,
  'Jamal Musiala': 88,
  'Federico Valverde': 88,
  'Phil Foden': 87,
  'Rúben Dias': 87,
  'Nicolò Barella': 87,
  'Alessandro Bastoni': 87,
  'Gianluigi Donnarumma': 87,
  'Ousmane Dembélé': 87,
  'Cole Palmer': 87,
  'Antoine Griezmann': 86,
  'Julián Álvarez': 87,
  'Bruno Fernandes': 86,
  'Alexander Isak': 86,
  'Viktor Gyökeres': 86,
  'Mike Maignan': 86,
  'Gregor Kobel': 86,
  'Joshua Kimmich': 86,
  'Achraf Hakimi': 86,
  'Vitinha': 86,
  'Rafael Leão': 86,
  'Marquinhos': 86,
  'Bremer': 85,
  'Moisés Caicedo': 85,
  'Michael Olise': 85,
  'Alejandro Grimaldo': 85,
  'Nico Williams': 85,
  'Bruno Guimarães': 85,
  'Emiliano Martínez': 86,
  'Jan Oblak': 87,
  'Trent Alexander-Arnold': 86,
  'Antonio Rüdiger': 85,
  'Aurélien Tchouaméni': 86,
  'Eduardo Camavinga': 85,
  'Bernardo Silva': 86,
  'Ibrahima Konaté': 85,
  'Marc Cucurella': 83,
  'Denzel Dumfries': 83,
  'Dani Olmo': 86,
  'Pau Cubarsí': 84,
  'Fermin López': 84,
  'Andreas Christensen': 83,
  'João Cancelo': 84,
  'Alejandro Balde': 83,
  'Wojciech Szczęsny': 82,
  'Dominik Livaković': 82,
  'Joan García': 83,
  'Anthony Gordon': 84,
  'Karim Adeyemi': 83,
  'Gabriel Jesus': 83,
  'Gavi': 85,
  'Frenkie de Jong': 86,
  'Enzo Fernández': 85,
  'Joško Gvardiol': 86,
  'Rayan Cherki': 83,
  'Antoine Semenyo': 82,
  'Marc Guéhi': 83,
  'Jeremy Doku': 83,
  'Mateo Kovačić': 82,
  'Jack Grealish': 82,
  'Rico Lewis': 81,
  'Kai Havertz': 84,
  'David Raya': 85,
  'Ben White': 83,
  'Riccardo Calafiori': 83,
  'Jurriën Timber': 82,
  'Ezri Konsa': 83,
  'Eberechi Eze': 83,
  'Mikel Merino': 83,
  'Martín Zubimendi': 84,
  'Endrick': 81,
  'Arda Güler': 83,
  'Brahim Díaz': 82,
  'Andriy Lunin': 82,
  'Éder Militão': 85,
  'Son Heung-min': 84,
  'James Maddison': 83,
  'Cristian Romero': 84,
  'Dejan Kulusevski': 83,
  'Lucas Bergvall': 79,
  'Dominic Solanke': 82,
  'Youri Tielemans': 83,
  'Ollie Watkins': 84,
  'Morgan Rogers': 82,
  'Amadou Onana': 82,
  'Matheus Cunha': 83,
  'Bryan Mbeumo': 82,
  'João Pedro': 82,
  'Kaoru Mitoma': 82,
  'Murillo': 82,
  'Morgan Gibbs-White': 82,
  'Chris Wood': 80,
  'Jordan Pickford': 82,
  'Jarrad Branthwaite': 82,
  'Jarrod Bowen': 83,
  'Mohammed Kudus': 82,
  'João Gomes': 81,
  'André': 81,
  'Scott McTominay': 83,
  'Romelu Lukaku': 83,
  'Khvicha Kvaratskhelia': 86,
  'Teun Koopmeiners': 84,
  'Dušan Vlahović': 84,
  'Kenan Yıldız': 82,
  'Hakan Çalhanoğlu': 85,
  'Marcus Thuram': 85,
  'Benjamin Pavard': 84,
  'Federico Dimarco': 85,
  'Theo Hernández': 86,
  'Christian Pulisic': 84,
  'Tijjani Reijnders': 84,
  'Ademola Lookman': 84,
  'Mateo Retegui': 82,
  'Charles De Ketelaere': 82,
  'Paulo Dybala': 84,
  'Artem Dovbyk': 83,
  'Mattia Zaccagni': 82,
  'Valentin Castellanos': 81,
  'Nico Schlotterbeck': 84,
  'Julian Brandt': 84,
  'Serhou Guirassy': 84,
  'Xavi Simons': 85,
  'Loïs Openda': 84,
  'Benjamin Šeško': 84,
  'Jonathan Tah': 84,
  'Victor Boniface': 84,
  'Jeremie Frimpong': 85,
  'Exequiel Palacios': 84,
  'Granit Xhaka': 85,
  'Hugo Ekitike': 82,
  'Omar Marmoush': 84,
  'Deniz Undav': 83,
  'Enzo Millot': 82,
  'Bradley Barcola': 84,
  'João Neves': 84,
  'Warren Zaïre-Emery': 83,
  'Lucas Beraldo': 81,
  'Mason Greenwood': 83,
  'Adrien Rabiot': 83,
  'Pierre-Emile Højbjerg': 82,
  'Takumi Minamino': 81,
  'Folarin Balogun': 80,
  'Jonathan David': 83,
  'Alexandre Lacazette': 81,
  'Georges Mikautadze': 81,
  'Willian Pacho': 83,
  'Manuel Akanji': 85,
  'Dayot Upamecano': 84,
  'Yann Aurel Bisseck': 81,
  'Piotr Zieliński': 83,
  'Matvei Safonov': 81,
  'Josep Martinez': 80,
  'Manuel Neuer': 84,
  'Alphonso Davies': 84,
};

const STAR_SHIRT_NUMBERS = {
  'Kylian Mbappé': 9,
  'Vinícius Júnior': 7,
  'Vinicius Júnior': 7,
  'Jude Bellingham': 5,
  'Federico Valverde': 8,
  'Thibaut Courtois': 1,
  'Arda Güler': 15,
  'Endrick': 16,
  'Rodrygo': 11,
  'Erling Haaland': 9,
  'Phil Foden': 47,
  'Rodri': 16,
  'Gianluigi Donnarumma': 1,
  'Enzo Fernández': 8,
  'Rúben Dias': 3,
  'Mohamed Salah': 11,
  'Virgil van Dijk': 4,
  'Alisson Becker': 1,
  'Lamine Yamal': 19,
  'Raphinha': 11,
  'Pedri': 8,
  'Gavi': 6,
  'Dani Olmo': 20,
  'Pau Cubarsí': 2,
  'Robert Lewandowski': 9,
  'Harry Kane': 9,
  'Jamal Musiala': 42,
  'Joshua Kimmich': 6,
  'Michael Olise': 17,
  'Bukayo Saka': 7,
  'Martin Ødegaard': 8,
  'William Saliba': 2,
  'Gabriel Magalhães': 6,
  'Declan Rice': 41,
  'David Raya': 22,
  'Cole Palmer': 20,
  'Moisés Caicedo': 25,
  'Lautaro Martínez': 10,
  'Nicolò Barella': 23,
  'Alessandro Bastoni': 95,
  'Rafael Leão': 10,
  'Mike Maignan': 16,
  'Romelu Lukaku': 11,
  'Antoine Griezmann': 7,
  'Julián Álvarez': 19,
  'Jan Oblak': 13,
  'Nico Williams': 10,
  'Florian Wirtz': 10,
  'Son Heung-min': 7,
  'Bruno Fernandes': 8,
  'Alexander Isak': 14,
  'Viktor Gyökeres': 9,
  'Manuel Neuer': 1,
  'Ousmane Dembélé': 10,
  'Khvicha Kvaratskhelia': 7,
  'Theo Hernández': 19,
};

// Full definition of 96 clubs
const CLUBS_CONFIG = [
  // eng_premier (20)
  { id: 'eu_ars', csvSquad: 'Arsenal', name: 'Arsenal FC', shortName: 'Arsenal', rep: 5, color: '#EF0107', manager: 'Mikel Arteta', leagueId: 'eng_premier', country: 'Inglaterra', state: 'ENG' },
  { id: 'eu_avl', csvSquad: 'Aston Villa', name: 'Aston Villa FC', shortName: 'Aston Villa', rep: 4, color: '#670E36', manager: 'Unai Emery', leagueId: 'eng_premier', country: 'Inglaterra', state: 'ENG' },
  { id: 'eu_bou', csvSquad: 'Bournemouth', name: 'AFC Bournemouth', shortName: 'Bournemouth', rep: 3, color: '#DA291C', manager: 'Andoni Iraola', leagueId: 'eng_premier', country: 'Inglaterra', state: 'ENG' },
  { id: 'eu_bre', csvSquad: 'Brentford', name: 'Brentford FC', shortName: 'Brentford', rep: 3, color: '#E30613', manager: 'Thomas Frank', leagueId: 'eng_premier', country: 'Inglaterra', state: 'ENG' },
  { id: 'eu_bha', csvSquad: 'Brighton', name: 'Brighton & Hove Albion', shortName: 'Brighton', rep: 4, color: '#0057B8', manager: 'Fabian Hürzeler', leagueId: 'eng_premier', country: 'Inglaterra', state: 'ENG' },
  { id: 'eu_che', csvSquad: 'Chelsea', name: 'Chelsea FC', shortName: 'Chelsea', rep: 5, color: '#034694', manager: 'Enzo Maresca', leagueId: 'eng_premier', country: 'Inglaterra', state: 'ENG' },
  { id: 'eu_cov', csvSquad: 'Coventry City', name: 'Coventry City', shortName: 'Coventry', rep: 3, color: '#38BDF8', manager: 'Frank Lampard', leagueId: 'eng_premier', country: 'Inglaterra', state: 'ENG' },
  { id: 'eu_cry', csvSquad: 'Crystal Palace', name: 'Crystal Palace FC', shortName: 'Crystal Palace', rep: 3, color: '#1B458F', manager: 'Oliver Glasner', leagueId: 'eng_premier', country: 'Inglaterra', state: 'ENG' },
  { id: 'eu_eve', csvSquad: 'Everton', name: 'Everton FC', shortName: 'Everton', rep: 4, color: '#003399', manager: 'David Moyes', leagueId: 'eng_premier', country: 'Inglaterra', state: 'ENG' },
  { id: 'eu_ful', csvSquad: 'Fulham', name: 'Fulham FC', shortName: 'Fulham', rep: 3, color: '#111111', manager: 'Marco Silva', leagueId: 'eng_premier', country: 'Inglaterra', state: 'ENG' },
  { id: 'eu_hul', csvSquad: 'Hull City', name: 'Hull City', shortName: 'Hull City', rep: 3, color: '#F5A12D', manager: 'Rubén Sellés', leagueId: 'eng_premier', country: 'Inglaterra', state: 'ENG' },
  { id: 'eu_ips', csvSquad: 'Ipswich Town', name: 'Ipswich Town', shortName: 'Ipswich', rep: 3, color: '#3A64A3', manager: 'Kieran McKenna', leagueId: 'eng_premier', country: 'Inglaterra', state: 'ENG' },
  { id: 'eu_lee', csvSquad: 'Leeds United', name: 'Leeds United FC', shortName: 'Leeds United', rep: 4, color: '#FFCD00', manager: 'Daniel Farke', leagueId: 'eng_premier', country: 'Inglaterra', state: 'ENG' },
  { id: 'eu_liv', csvSquad: 'Liverpool', name: 'Liverpool FC', shortName: 'Liverpool', rep: 5, color: '#C8102E', manager: 'Arne Slot', leagueId: 'eng_premier', country: 'Inglaterra', state: 'ENG' },
  { id: 'eu_mci', csvSquad: 'Manchester City', name: 'Manchester City FC', shortName: 'Man City', rep: 5, color: '#6CABDD', manager: 'Pep Guardiola', leagueId: 'eng_premier', country: 'Inglaterra', state: 'ENG' },
  { id: 'eu_mun', csvSquad: 'Manchester Utd', name: 'Manchester United', shortName: 'Man United', rep: 5, color: '#DA291C', manager: 'Rúben Amorim', leagueId: 'eng_premier', country: 'Inglaterra', state: 'ENG' },
  { id: 'eu_new', csvSquad: 'Newcastle', name: 'Newcastle United', shortName: 'Newcastle', rep: 4, color: '#241F20', manager: 'Eddie Howe', leagueId: 'eng_premier', country: 'Inglaterra', state: 'ENG' },
  { id: 'eu_nfo', csvSquad: 'Nottingham', name: 'Nottingham Forest', shortName: 'Nottm Forest', rep: 4, color: '#DD0000', manager: 'Nuno Espírito Santo', leagueId: 'eng_premier', country: 'Inglaterra', state: 'ENG' },
  { id: 'eu_sun', csvSquad: 'Sunderland', name: 'Sunderland AFC', shortName: 'Sunderland', rep: 3, color: '#EB172B', manager: 'Régis Le Bris', leagueId: 'eng_premier', country: 'Inglaterra', state: 'ENG' },
  { id: 'eu_tot', csvSquad: 'Tottenham', name: 'Tottenham Hotspur', shortName: 'Tottenham', rep: 4, color: '#132257', manager: 'Thomas Frank', leagueId: 'eng_premier', country: 'Inglaterra', state: 'ENG' },

  // esp_laliga (20)
  { id: 'eu_ala', csvSquad: 'Alavés', name: 'Deportivo Alavés', shortName: 'Alavés', rep: 3, color: '#0055A5', manager: 'Eduardo Coudet', leagueId: 'esp_laliga', country: 'Espanha', state: 'ESP' },
  { id: 'eu_ath', csvSquad: 'Athletic Club', name: 'Athletic Club Bilbao', shortName: 'Athletic Bilbao', rep: 4, color: '#EE2523', manager: 'Ernesto Valverde', leagueId: 'esp_laliga', country: 'Espanha', state: 'ESP' },
  { id: 'eu_atm', csvSquad: 'Atlético Madrid', name: 'Atlético de Madrid', shortName: 'Atlético Madrid', rep: 5, color: '#CB3524', manager: 'Diego Simeone', leagueId: 'esp_laliga', country: 'Espanha', state: 'ESP' },
  { id: 'eu_fcb', csvSquad: 'Barcelona', name: 'FC Barcelona', shortName: 'Barcelona', rep: 5, color: '#A50044', manager: 'Hansi Flick', leagueId: 'esp_laliga', country: 'Espanha', state: 'ESP' },
  { id: 'eu_cel', csvSquad: 'Celta Vigo', name: 'RC Celta de Vigo', shortName: 'Celta de Vigo', rep: 3, color: '#8AC3EE', manager: 'Claudio Giráldez', leagueId: 'esp_laliga', country: 'Espanha', state: 'ESP' },
  { id: 'eu_dep', csvSquad: 'Dep. A Coruña', name: 'RC Deportivo La Coruña', shortName: 'Deportivo La Coruña', rep: 3, color: '#0055A5', manager: 'Óscar Gilsanz', leagueId: 'esp_laliga', country: 'Espanha', state: 'ESP' },
  { id: 'eu_elc', csvSquad: 'Elche', name: 'Elche CF', shortName: 'Elche', rep: 3, color: '#008B45', manager: 'Eder Sarabia', leagueId: 'esp_laliga', country: 'Espanha', state: 'ESP' },
  { id: 'eu_esp', csvSquad: 'Espanyol', name: 'RCD Espanyol', shortName: 'Espanyol', rep: 3, color: '#007FC8', manager: 'Manolo González', leagueId: 'esp_laliga', country: 'Espanha', state: 'ESP' },
  { id: 'eu_get', csvSquad: 'Getafe', name: 'Getafe CF', shortName: 'Getafe', rep: 3, color: '#005999', manager: 'José Bordalás', leagueId: 'esp_laliga', country: 'Espanha', state: 'ESP' },
  { id: 'eu_lev', csvSquad: 'Levante', name: 'Levante UD', shortName: 'Levante', rep: 3, color: '#004B87', manager: 'Julián Calero', leagueId: 'esp_laliga', country: 'Espanha', state: 'ESP' },
  { id: 'eu_mlg', csvSquad: 'Málaga', name: 'Málaga CF', shortName: 'Málaga', rep: 3, color: '#007BC7', manager: 'Sergio Pellicer', leagueId: 'esp_laliga', country: 'Espanha', state: 'ESP' },
  { id: 'eu_osa', csvSquad: 'Osasuna', name: 'CA Osasuna', shortName: 'Osasuna', rep: 3, color: '#AA151B', manager: 'Vicente Moreno', leagueId: 'esp_laliga', country: 'Espanha', state: 'ESP' },
  { id: 'eu_rcs', csvSquad: 'Racing Sant', name: 'Racing de Santander', shortName: 'Racing Santander', rep: 3, color: '#008543', manager: 'José Alberto López', leagueId: 'esp_laliga', country: 'Espanha', state: 'ESP' },
  { id: 'eu_ray', csvSquad: 'Rayo Vallecano', name: 'Rayo Vallecano', shortName: 'Rayo Vallecano', rep: 3, color: '#DC2626', manager: 'Iñigo Pérez', leagueId: 'esp_laliga', country: 'Espanha', state: 'ESP' },
  { id: 'eu_bet', csvSquad: 'Real Betis', name: 'Real Betis Balompié', shortName: 'Real Betis', rep: 4, color: '#0BB363', manager: 'Manuel Pellegrini', leagueId: 'esp_laliga', country: 'Espanha', state: 'ESP' },
  { id: 'eu_rma', csvSquad: 'Real Madrid', name: 'Real Madrid CF', shortName: 'Real Madrid', rep: 5, color: '#FFFFFF', manager: 'Xabi Alonso', leagueId: 'esp_laliga', country: 'Espanha', state: 'ESP' },
  { id: 'eu_rso', csvSquad: 'Real Sociedad', name: 'Real Sociedad', shortName: 'Real Sociedad', rep: 4, color: '#0067B1', manager: 'Imanol Alguacil', leagueId: 'esp_laliga', country: 'Espanha', state: 'ESP' },
  { id: 'eu_sev', csvSquad: 'Sevilla', name: 'Sevilla FC', shortName: 'Sevilla', rep: 4, color: '#D4021D', manager: 'García Pimienta', leagueId: 'esp_laliga', country: 'Espanha', state: 'ESP' },
  { id: 'eu_val', csvSquad: 'Valencia', name: 'Valencia CF', shortName: 'Valencia', rep: 4, color: '#111111', manager: 'Carlos Corberán', leagueId: 'esp_laliga', country: 'Espanha', state: 'ESP' },
  { id: 'eu_vil', csvSquad: 'Villarreal', name: 'Villarreal CF', shortName: 'Villarreal', rep: 4, color: '#FACC15', manager: 'Marcelino', leagueId: 'esp_laliga', country: 'Espanha', state: 'ESP' },

  // it_serie_a (20)
  { id: 'eu_ata', csvSquad: 'Atalanta', name: 'Atalanta BC', shortName: 'Atalanta', rep: 4, color: '#1E71B8', manager: 'Gian Piero Gasperini', leagueId: 'ita_serie_a', country: 'Itália', state: 'ITA' },
  { id: 'eu_bol_it', csvSquad: 'Bologna', name: 'Bologna FC', shortName: 'Bologna', rep: 4, color: '#1A2F48', manager: 'Vincenzo Italiano', leagueId: 'ita_serie_a', country: 'Itália', state: 'ITA' },
  { id: 'eu_cag', csvSquad: 'Cagliari', name: 'Cagliari Calcio', shortName: 'Cagliari', rep: 3, color: '#A6192E', manager: 'Davide Nicola', leagueId: 'ita_serie_a', country: 'Itália', state: 'ITA' },
  { id: 'eu_com', csvSquad: 'Como', name: 'Como 1907', shortName: 'Como', rep: 3, color: '#0055A5', manager: 'Cesc Fàbregas', leagueId: 'ita_serie_a', country: 'Itália', state: 'ITA' },
  { id: 'eu_fio', csvSquad: 'Fiorentina', name: 'ACF Fiorentina', shortName: 'Fiorentina', rep: 4, color: '#482E92', manager: 'Raffaele Palladino', leagueId: 'ita_serie_a', country: 'Itália', state: 'ITA' },
  { id: 'eu_fro', csvSquad: 'Frosinone', name: 'Frosinone Calcio', shortName: 'Frosinone', rep: 3, color: '#FACC15', manager: 'Leandro Greco', leagueId: 'ita_serie_a', country: 'Itália', state: 'ITA' },
  { id: 'eu_gen', csvSquad: 'Genoa', name: 'Genoa CFC', shortName: 'Genoa', rep: 3, color: '#AD1919', manager: 'Patrick Vieira', leagueId: 'ita_serie_a', country: 'Itália', state: 'ITA' },
  { id: 'eu_int', csvSquad: 'Inter', name: 'Inter de Milão', shortName: 'Inter de Milão', rep: 5, color: '#010E80', manager: 'Simone Inzaghi', leagueId: 'ita_serie_a', country: 'Itália', state: 'ITA' },
  { id: 'eu_juv', csvSquad: 'Juventus', name: 'Juventus FC', shortName: 'Juventus', rep: 5, color: '#111111', manager: 'Thiago Motta', leagueId: 'ita_serie_a', country: 'Itália', state: 'ITA' },
  { id: 'eu_laz', csvSquad: 'Lazio', name: 'SS Lazio', shortName: 'Lazio', rep: 4, color: '#87D8F7', manager: 'Marco Baroni', leagueId: 'ita_serie_a', country: 'Itália', state: 'ITA' },
  { id: 'eu_lec', csvSquad: 'Lecce', name: 'US Lecce', shortName: 'Lecce', rep: 3, color: '#DC2626', manager: 'Marco Giampaolo', leagueId: 'ita_serie_a', country: 'Itália', state: 'ITA' },
  { id: 'eu_acm', csvSquad: 'Milan', name: 'AC Milan', shortName: 'Milan', rep: 5, color: '#FB090B', manager: 'Massimiliano Allegri', leagueId: 'ita_serie_a', country: 'Itália', state: 'ITA' },
  { id: 'eu_mon', csvSquad: 'Monza', name: 'AC Monza', shortName: 'Monza', rep: 3, color: '#DC2626', manager: 'Alessandro Nesta', leagueId: 'ita_serie_a', country: 'Itália', state: 'ITA' },
  { id: 'eu_nap', csvSquad: 'Napoli', name: 'SSC Napoli', shortName: 'Napoli', rep: 5, color: '#12A0D7', manager: 'Antonio Conte', leagueId: 'ita_serie_a', country: 'Itália', state: 'ITA' },
  { id: 'eu_par', csvSquad: 'Parma', name: 'Parma Calcio', shortName: 'Parma', rep: 3, color: '#1D4ED8', manager: 'Fabio Pecchia', leagueId: 'ita_serie_a', country: 'Itália', state: 'ITA' },
  { id: 'eu_rom', csvSquad: 'Roma', name: 'AS Roma', shortName: 'Roma', rep: 4, color: '#8E1F2F', manager: 'Claudio Ranieri', leagueId: 'ita_serie_a', country: 'Itália', state: 'ITA' },
  { id: 'eu_sas', csvSquad: 'Sassuolo', name: 'US Sassuolo', shortName: 'Sassuolo', rep: 3, color: '#00A651', manager: 'Fabio Grosso', leagueId: 'ita_serie_a', country: 'Itália', state: 'ITA' },
  { id: 'eu_tor', csvSquad: 'Torino', name: 'Torino FC', shortName: 'Torino', rep: 3, color: '#8A1E03', manager: 'Paolo Vanoli', leagueId: 'ita_serie_a', country: 'Itália', state: 'ITA' },
  { id: 'eu_udi', csvSquad: 'Udinese', name: 'Udinese Calcio', shortName: 'Udinese', rep: 3, color: '#111111', manager: 'Kosta Runjaić', leagueId: 'ita_serie_a', country: 'Itália', state: 'ITA' },
  { id: 'eu_ven', csvSquad: 'Venezia', name: 'Venezia FC', shortName: 'Venezia', rep: 3, color: '#F97316', manager: 'Eusebio Di Francesco', leagueId: 'ita_serie_a', country: 'Itália', state: 'ITA' },

  // de_bundesliga (18)
  { id: 'eu_fca', csvSquad: 'Augsburg', name: 'FC Augsburg', shortName: 'Augsburg', rep: 3, color: '#BA3733', manager: 'Jess Thorup', leagueId: 'ger_bundesliga', country: 'Alemanha', state: 'GER' },
  { id: 'eu_bay', csvSquad: 'Bayern Munich', name: 'FC Bayern München', shortName: 'Bayern Munique', rep: 5, color: '#DC052D', manager: 'Vincent Kompany', leagueId: 'ger_bundesliga', country: 'Alemanha', state: 'GER' },
  { id: 'eu_bvb', csvSquad: 'Dortmund', name: 'Borussia Dortmund', shortName: 'Dortmund', rep: 5, color: '#FDE100', manager: 'Niko Kovač', leagueId: 'ger_bundesliga', country: 'Alemanha', state: 'GER' },
  { id: 'eu_elv', csvSquad: 'Elversberg', name: 'SV 07 Elversberg', shortName: 'Elversberg', rep: 2, color: '#111111', manager: 'Horst Steffen', leagueId: 'ger_bundesliga', country: 'Alemanha', state: 'GER' },
  { id: 'eu_sge', csvSquad: 'Frankfurt', name: 'Eintracht Frankfurt', shortName: 'Eintracht', rep: 4, color: '#E1000F', manager: 'Dino Toppmöller', leagueId: 'ger_bundesliga', country: 'Alemanha', state: 'GER' },
  { id: 'eu_scf', csvSquad: 'Freiburg', name: 'SC Freiburg', shortName: 'Freiburg', rep: 4, color: '#111111', manager: 'Julian Schuster', leagueId: 'ger_bundesliga', country: 'Alemanha', state: 'GER' },
  { id: 'eu_bmg', csvSquad: 'Gladbach', name: 'Borussia Mönchengladbach', shortName: 'Gladbach', rep: 3, color: '#111111', manager: 'Gerardo Seoane', leagueId: 'ger_bundesliga', country: 'Alemanha', state: 'GER' },
  { id: 'eu_hsv', csvSquad: 'Hamburger SV', name: 'Hamburger SV', shortName: 'Hamburgo', rep: 3, color: '#005CA9', manager: 'Steffen Baumgart', leagueId: 'ger_bundesliga', country: 'Alemanha', state: 'GER' },
  { id: 'eu_tsg', csvSquad: 'Hoffenheim', name: 'TSG 1899 Hoffenheim', shortName: 'Hoffenheim', rep: 3, color: '#1C63B7', manager: 'Christian Ilzer', leagueId: 'ger_bundesliga', country: 'Alemanha', state: 'GER' },
  { id: 'eu_koe', csvSquad: 'Köln', name: '1. FC Köln', shortName: 'FC Köln', rep: 3, color: '#ED1C24', manager: 'Gerhard Struber', leagueId: 'ger_bundesliga', country: 'Alemanha', state: 'GER' },
  { id: 'eu_b04', csvSquad: 'Leverkusen', name: 'Bayer 04 Leverkusen', shortName: 'Bayer Leverkusen', rep: 5, color: '#E32221', manager: 'Xabi Alonso', leagueId: 'ger_bundesliga', country: 'Alemanha', state: 'GER' },
  { id: 'eu_m05', csvSquad: 'Mainz 05', name: '1. FSV Mainz 05', shortName: 'Mainz 05', rep: 3, color: '#C3141E', manager: 'Bo Henriksen', leagueId: 'ger_bundesliga', country: 'Alemanha', state: 'GER' },
  { id: 'eu_pad', csvSquad: 'Paderborn 07', name: 'SC Paderborn 07', shortName: 'Paderborn', rep: 2, color: '#0055A5', manager: 'Lukas Kwasniok', leagueId: 'ger_bundesliga', country: 'Alemanha', state: 'GER' },
  { id: 'eu_rbl', csvSquad: 'RB Leipzig', name: 'RB Leipzig', shortName: 'RB Leipzig', rep: 4, color: '#DD0741', manager: 'Marco Rose', leagueId: 'ger_bundesliga', country: 'Alemanha', state: 'GER' },
  { id: 'eu_s04', csvSquad: 'Schalke 04', name: 'FC Schalke 04', shortName: 'Schalke 04', rep: 3, color: '#004D9D', manager: 'Kees van Wonderen', leagueId: 'ger_bundesliga', country: 'Alemanha', state: 'GER' },
  { id: 'eu_vfb', csvSquad: 'Stuttgart', name: 'VfB Stuttgart', shortName: 'Stuttgart', rep: 4, color: '#E32219', manager: 'Sebastian Hoeneß', leagueId: 'ger_bundesliga', country: 'Alemanha', state: 'GER' },
  { id: 'eu_fcu', csvSquad: 'Union Berlin', name: '1. FC Union Berlin', shortName: 'Union Berlin', rep: 3, color: '#EB1923', manager: 'Bo Svensson', leagueId: 'ger_bundesliga', country: 'Alemanha', state: 'GER' },
  { id: 'eu_svw', csvSquad: 'Werder Bremen', name: 'SV Werder Bremen', shortName: 'Werder Bremen', rep: 3, color: '#1D9053', manager: 'Ole Werner', leagueId: 'ger_bundesliga', country: 'Alemanha', state: 'GER' },

  // fra_ligue1 (18)
  { id: 'eu_sco', csvSquad: 'Angers', name: 'Angers SCO', shortName: 'Angers', rep: 2, color: '#111111', manager: 'Alexandre Dujeux', leagueId: 'fra_ligue1', country: 'França', state: 'FRA' },
  { id: 'eu_aja_fr', csvSquad: 'Auxerre', name: 'AJ Auxerre', shortName: 'Auxerre', rep: 2, color: '#0055A5', manager: 'Christophe Pélissier', leagueId: 'fra_ligue1', country: 'França', state: 'FRA' },
  { id: 'eu_sb29', csvSquad: 'Brest', name: 'Stade Brestois 29', shortName: 'Brest', rep: 3, color: '#DC2626', manager: 'Éric Roy', leagueId: 'fra_ligue1', country: 'França', state: 'FRA' },
  { id: 'eu_hac', csvSquad: 'Le Havre', name: 'Le Havre AC', shortName: 'Le Havre', rep: 2, color: '#38BDF8', manager: 'Didier Digard', leagueId: 'fra_ligue1', country: 'França', state: 'FRA' },
  { id: 'eu_lem', csvSquad: 'Le Mans', name: 'Le Mans FC', shortName: 'Le Mans', rep: 2, color: '#DC2626', manager: 'Patrick Videira', leagueId: 'fra_ligue1', country: 'França', state: 'FRA' },
  { id: 'eu_rcl', csvSquad: 'Lens', name: 'RC Lens', shortName: 'RC Lens', rep: 3, color: '#EC1C24', manager: 'Will Still', leagueId: 'fra_ligue1', country: 'França', state: 'FRA' },
  { id: 'eu_los', csvSquad: 'Lille', name: 'LOSC Lille', shortName: 'Lille', rep: 4, color: '#E01E13', manager: 'Bruno Genesio', leagueId: 'fra_ligue1', country: 'França', state: 'FRA' },
  { id: 'eu_fcl', csvSquad: 'Lorient', name: 'FC Lorient', shortName: 'Lorient', rep: 2, color: '#F97316', manager: 'Olivier Pantaloni', leagueId: 'fra_ligue1', country: 'França', state: 'FRA' },
  { id: 'eu_ol', csvSquad: 'Lyon', name: 'Olympique Lyonnais', shortName: 'Lyon', rep: 4, color: '#1D4ED8', manager: 'Pierre Sage', leagueId: 'fra_ligue1', country: 'França', state: 'FRA' },
  { id: 'eu_om', csvSquad: 'Marseille', name: 'Olympique de Marseille', shortName: 'Marseille', rep: 4, color: '#2FAEE0', manager: 'Roberto De Zerbi', leagueId: 'fra_ligue1', country: 'França', state: 'FRA' },
  { id: 'eu_asm', csvSquad: 'Monaco', name: 'AS Monaco', shortName: 'Monaco', rep: 4, color: '#E51B24', manager: 'Adi Hütter', leagueId: 'fra_ligue1', country: 'França', state: 'FRA' },
  { id: 'eu_ogc', csvSquad: 'Nice', name: 'OGC Nice', shortName: 'Nice', rep: 4, color: '#DC2626', manager: 'Franck Haise', leagueId: 'fra_ligue1', country: 'França', state: 'FRA' },
  { id: 'eu_pfc', csvSquad: 'Paris FC', name: 'Paris FC', shortName: 'Paris FC', rep: 3, color: '#1E3A8A', manager: 'Stéphane Gilli', leagueId: 'fra_ligue1', country: 'França', state: 'FRA' },
  { id: 'eu_psg', csvSquad: 'Paris SG', name: 'Paris Saint-Germain', shortName: 'PSG', rep: 5, color: '#004170', manager: 'Luis Enrique', leagueId: 'fra_ligue1', country: 'França', state: 'FRA' },
  { id: 'eu_srfc', csvSquad: 'Rennes', name: 'Stade Rennais FC', shortName: 'Rennes', rep: 3, color: '#E11D48', manager: 'Jorge Sampaoli', leagueId: 'fra_ligue1', country: 'França', state: 'FRA' },
  { id: 'eu_rcsa', csvSquad: 'Strasbourg', name: 'RC Strasbourg', shortName: 'Strasbourg', rep: 3, color: '#007AC2', manager: 'Liam Rosenior', leagueId: 'fra_ligue1', country: 'França', state: 'FRA' },
  { id: 'eu_tfc', csvSquad: 'Toulouse', name: 'Toulouse FC', shortName: 'Toulouse', rep: 3, color: '#5F259F', manager: 'Carles Martínez', leagueId: 'fra_ligue1', country: 'França', state: 'FRA' },
  { id: 'eu_est', csvSquad: 'Troyes', name: 'ES Troyes AC', shortName: 'Troyes', rep: 2, color: '#0055A5', manager: 'Stéphane Dumont', leagueId: 'fra_ligue1', country: 'França', state: 'FRA' },
];

// Group rows by CSV Squad
const rowsBySquad = new Map();
for (let i = 1; i < lines.length; i++) {
  const row = parseCSVLine(lines[i]);
  const s = row[4];
  if (!rowsBySquad.has(s)) rowsBySquad.set(s, []);
  rowsBySquad.get(s).push({
    rk: parseInt(row[0]) || i,
    name: row[1].trim(),
    nationRaw: row[2].trim(),
    pos: row[3].trim(),
    squad: row[4].trim(),
    comp: row[5].trim(),
    age: Math.round(parseFloat(row[6]) || 24),
    mp: parseInt(row[8]) || 0,
    starts: parseInt(row[9]) || 0,
    min: parseInt(row[10]) || 0,
    gls: parseInt(row[12]) || 0,
    ast: parseInt(row[13]) || 0,
    saves: parseInt(row[42]) || 0,
    cs: parseInt(row[47]) || 0,
  });
}

// Build players for each club
const parsedClubs = [];

for (const clubMeta of CLUBS_CONFIG) {
  const squadRows = rowsBySquad.get(clubMeta.csvSquad) || [];
  if (squadRows.length === 0) {
    console.error('Missing CSV squad rows for:', clubMeta.csvSquad);
  }

  // Realistic baseline OVR by reputation
  const baseStarterOvr = clubMeta.rep >= 5 ? 84 : clubMeta.rep === 4 ? 80 : clubMeta.rep === 3 ? 76 : 73;
  const baseSubOvr = baseStarterOvr - 4;

  const usedNums = new Set();
  const rawPlayers = [];

  // Assign roles and compute ratings
  squadRows.forEach((p, idx) => {
    let role = KNOWN_ROLES[p.name];
    if (!role) {
      const isGK = p.pos.includes('GK');
      const isDF = p.pos.includes('DF');
      const isMF = p.pos.includes('MF');
      const isFW = p.pos.includes('FW');

      if (isGK) {
        role = 'GOL';
      } else if (isDF && !isMF && !isFW) {
        role = idx % 2 === 0 ? 'ZAG' : 'LAT';
      } else if (isDF && isMF) {
        role = 'LAT';
      } else if (isMF && !isFW) {
        role = idx % 2 === 0 ? 'VOL' : 'MEI';
      } else if (isFW && !isMF) {
        role = 'ATA';
      } else if (isMF && isFW) {
        role = idx % 2 === 0 ? 'MEI' : 'ATA';
      } else {
        role = 'ATA';
      }
    }

    // Override OVR if star
    let ovr = STAR_OVR_OVERRIDES[p.name];
    if (!ovr) {
      const startsBonus = Math.min(2, Math.round((p.starts || 0) / 4));
      const goalAstBonus = Math.min(2, Math.round(((p.gls || 0) * 1.5 + (p.ast || 0)) / 3));
      const performanceBonus = startsBonus + goalAstBonus;

      if (p.starts >= 7 || p.min >= 600) {
        ovr = baseStarterOvr + performanceBonus;
      } else if (p.starts >= 3 || p.min >= 250) {
        ovr = baseSubOvr + performanceBonus;
      } else {
        ovr = baseSubOvr - 2;
      }
    }

    // Clamping
    ovr = Math.max(65, Math.min(94, Math.round(ovr)));

    // Nationality
    const nat = NATION_MAP[p.nationRaw] || clubMeta.country;

    // Shirt number
    let num = STAR_SHIRT_NUMBERS[p.name];
    if (!num || usedNums.has(num)) {
      if (role === 'GOL') {
        num = [1, 13, 22, 25, 31, 99].find((n) => !usedNums.has(n)) || 1;
      } else if (role === 'ZAG') {
        num = [2, 3, 4, 5, 6, 12, 14, 15, 23, 24, 33, 44].find((n) => !usedNums.has(n)) || 4;
      } else if (role === 'LAT') {
        num = [2, 3, 12, 13, 17, 18, 20, 21, 26, 27, 28].find((n) => !usedNums.has(n)) || 3;
      } else if (role === 'VOL') {
        num = [5, 6, 8, 14, 16, 18, 21, 24, 25, 28, 30].find((n) => !usedNums.has(n)) || 6;
      } else if (role === 'MEI') {
        num = [8, 10, 11, 14, 17, 19, 20, 22, 23, 27, 32].find((n) => !usedNums.has(n)) || 10;
      } else {
        num = [7, 9, 11, 17, 18, 19, 21, 29, 30, 99].find((n) => !usedNums.has(n)) || 9;
      }
      let fallbackNum = 1;
      while (usedNums.has(num)) {
        fallbackNum++;
        num = fallbackNum;
      }
    }
    usedNums.add(num);

    rawPlayers.push({
      id: `${clubMeta.id}_p_${idx + 1}`,
      name: p.name,
      role,
      ovr,
      age: p.age,
      num,
      nat,
      starts: p.starts,
      min: p.min,
      gls: p.gls,
      ast: p.ast,
    });
  });

  // Ensure balance of roles:
  // Must have at least 2 GOL
  const gks = rawPlayers.filter((p) => p.role === 'GOL');
  if (gks.length < 2) {
    const backupNum = [12, 13, 22, 25, 31, 99].find((n) => !usedNums.has(n)) || 12;
    usedNums.add(backupNum);
    rawPlayers.push({
      id: `${clubMeta.id}_p_gk_bkp`,
      name: `Goleiro Reserva (${clubMeta.shortName})`,
      role: 'GOL',
      ovr: baseSubOvr - 2,
      age: 23,
      num: backupNum,
      nat: clubMeta.country,
      starts: 0,
      min: 0,
      gls: 0,
      ast: 0,
    });
  }

  // Must have at least 2 LAT and 2 ZAG
  const lats = rawPlayers.filter((p) => p.role === 'LAT');
  const zags = rawPlayers.filter((p) => p.role === 'ZAG');
  if (lats.length < 2 && zags.length >= 4) {
    zags[zags.length - 1].role = 'LAT';
    zags[zags.length - 2].role = 'LAT';
  } else if (zags.length < 2 && lats.length >= 4) {
    lats[lats.length - 1].role = 'ZAG';
    lats[lats.length - 2].role = 'ZAG';
  }

  // Must have at least 2 ATA
  const atas = rawPlayers.filter((p) => p.role === 'ATA');
  if (atas.length < 2) {
    const meis = rawPlayers.filter((p) => p.role === 'MEI');
    if (meis.length > 2) {
      meis[meis.length - 1].role = 'ATA';
    }
  }

  // Enforce Max 30 players rule: "os times que tem mais de 30 jogadores no elenco, remova os mais fracos e deixe no maximo 30 jogadores no elenco"
  let trimmedPlayers = rawPlayers;
  if (trimmedPlayers.length > 30) {
    const keepers = trimmedPlayers.filter((p) => p.role === 'GOL');
    const outfield = trimmedPlayers.filter((p) => p.role !== 'GOL');
    outfield.sort((a, b) => b.ovr - a.ovr || b.starts - a.starts);
    const neededOutfield = 30 - Math.min(keepers.length, 3);
    trimmedPlayers = [...keepers.slice(0, 3), ...outfield.slice(0, neededOutfield)];
  }

  // Pick exactly 11 starters:
  // 1 GOL, 2 ZAG, 2 LAT, 2-3 VOL/MEI, 2-3 ATA
  const golList = trimmedPlayers.filter((p) => p.role === 'GOL').sort((a, b) => b.ovr - a.ovr);
  const zagList = trimmedPlayers.filter((p) => p.role === 'ZAG').sort((a, b) => b.ovr - a.ovr);
  const latList = trimmedPlayers.filter((p) => p.role === 'LAT').sort((a, b) => b.ovr - a.ovr);
  const volList = trimmedPlayers.filter((p) => p.role === 'VOL').sort((a, b) => b.ovr - a.ovr);
  const meiList = trimmedPlayers.filter((p) => p.role === 'MEI').sort((a, b) => b.ovr - a.ovr);
  const ataList = trimmedPlayers.filter((p) => p.role === 'ATA').sort((a, b) => b.ovr - a.ovr);

  const starters = new Set();
  // 1 GOL
  if (golList[0]) starters.add(golList[0].id);
  // 2 ZAG
  if (zagList[0]) starters.add(zagList[0].id);
  if (zagList[1]) starters.add(zagList[1].id);
  // 2 LAT
  if (latList[0]) starters.add(latList[0].id);
  if (latList[1]) starters.add(latList[1].id);

  // Key midfield & attack slots:
  if (volList[0] && !starters.has(volList[0].id)) starters.add(volList[0].id);
  if (meiList[0] && !starters.has(meiList[0].id)) starters.add(meiList[0].id);
  if (ataList[0] && !starters.has(ataList[0].id)) starters.add(ataList[0].id);
  if (ataList[1] && !starters.has(ataList[1].id) && starters.size < 11) starters.add(ataList[1].id);

  // Fill up to 11 with highest OVR outfield candidates
  const unpicked = trimmedPlayers
    .filter((p) => p.role !== 'GOL' && !starters.has(p.id))
    .sort((a, b) => b.ovr - a.ovr);

  while (starters.size < 11 && unpicked.length > 0) {
    const nextPick = unpicked.shift();
    if (nextPick) starters.add(nextPick.id);
  }

  // Next 9 best players are substitutes
  const nonStarters = trimmedPlayers.filter((p) => !starters.has(p.id)).sort((a, b) => b.ovr - a.ovr);
  const substitutes = new Set(nonStarters.slice(0, 9).map((p) => p.id));

  const finalPlayers = trimmedPlayers.map((p) => ({
    ...p,
    isStarter: starters.has(p.id),
    isSubstitute: substitutes.has(p.id),
  }));

  // Sort squad: starters first (GOL -> ZAG -> LAT -> VOL -> MEI -> ATA), then substitutes, then reserves
  const rolePriority = { GOL: 1, ZAG: 2, LAT: 3, VOL: 4, MEI: 5, ATA: 6 };
  finalPlayers.sort((a, b) => {
    if (a.isStarter !== b.isStarter) return a.isStarter ? -1 : 1;
    if (a.isSubstitute !== b.isSubstitute) return a.isSubstitute ? -1 : 1;
    if (rolePriority[a.role] !== rolePriority[b.role]) return rolePriority[a.role] - rolePriority[b.role];
    return b.ovr - a.ovr;
  });

  parsedClubs.push({
    meta: clubMeta,
    players: finalPlayers,
  });
}

console.log('Successfully processed', parsedClubs.length, 'clubs.');
let totalPlayersCount = 0;
for (const c of parsedClubs) {
  totalPlayersCount += c.players.length;
  const sCount = c.players.filter((p) => p.isStarter).length;
  if (sCount !== 11) {
    console.warn(`Club ${c.meta.id} has ${sCount} starters instead of 11!`);
  }
}
console.log('Total players in all 96 clubs:', totalPlayersCount);

// Generate src/data/europeTop5Rosters2026.ts
let tsOutput = `// Auto-generated 2026/2027 top 5 European leagues rosters from players_data_light-2026_2027_c9e92aeb.csv
import { DetailedRole } from '../types/game';

export interface Top5ClubMeta {
  id: string;
  name: string;
  shortName: string;
  reputation: number;
  primaryColor: string;
  managerName: string;
  leagueId: 'eng_premier' | 'esp_laliga' | 'ita_serie_a' | 'ger_bundesliga' | 'fra_ligue1';
  country: string;
  state: string;
}

export type Top5PlayerTuple = [
  string,       // 0: name
  DetailedRole, // 1: role
  number,       // 2: overall
  number,       // 3: age
  number,       // 4: squadNumber
  string,       // 5: nationality
  boolean,      // 6: isStarter
  boolean       // 7: isSubstitute
];

export const TOP5_CLUBS_META: Top5ClubMeta[] = [
`;

for (const c of parsedClubs) {
  const m = c.meta;
  tsOutput += `  { id: '${m.id}', name: ${JSON.stringify(m.name)}, shortName: ${JSON.stringify(m.shortName)}, reputation: ${m.rep}, primaryColor: '${m.color}', managerName: ${JSON.stringify(m.manager)}, leagueId: '${m.leagueId}', country: '${m.country}', state: '${m.state}' },\n`;
}

tsOutput += `];\n\nexport const TOP5_SQUADS_DATA: Record<string, Top5PlayerTuple[]> = {\n`;

for (const c of parsedClubs) {
  tsOutput += `  '${c.meta.id}': [\n`;
  for (const p of c.players) {
    tsOutput += `    [${JSON.stringify(p.name)}, '${p.role}', ${p.ovr}, ${p.age}, ${p.num}, ${JSON.stringify(p.nat)}, ${p.isStarter}, ${p.isSubstitute}],\n`;
  }
  tsOutput += `  ],\n`;
}

tsOutput += `};\n`;

fs.writeFileSync('src/data/europeTop5Rosters2026.ts', tsOutput, 'utf-8');
console.log('Successfully wrote src/data/europeTop5Rosters2026.ts');
