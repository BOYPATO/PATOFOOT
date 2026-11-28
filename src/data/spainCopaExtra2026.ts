import type { DetailedRole } from '../types/game';

export type SpainCopaExtraPlayerTuple = [string, DetailedRole, number, number, number, string];

export interface SpainCopaExtraClubData {
  id: string;
  name: string;
  shortName: string;
  reputation: number;
  primaryColor: string;
  stadiumName: string;
  managerName: string;
  players: SpainCopaExtraPlayerTuple[];
}

interface SpainCopaExtraClubSeed {
  id: string;
  name: string;
  shortName: string;
  reputation: number;
  primaryColor: string;
  stadiumName: string;
  managerName: string;
  baseOvr: number;
}

const SPANISH_FIRST_NAMES = [
  'Álvaro', 'Alejandro', 'Adrián', 'Ángel', 'Antonio', 'Borja', 'Carlos', 'Cristian',
  'Daniel', 'David', 'Diego', 'Eduardo', 'Enrique', 'Fernando', 'Francisco', 'Gonzalo',
  'Guillermo', 'Héctor', 'Hugo', 'Iker', 'Iván', 'Jaime', 'Javier', 'Jesús',
  'Jorge', 'José', 'Juan', 'Julen', 'Lucas', 'Luis', 'Manu', 'Marcos',
  'Mario', 'Martín', 'Miguel', 'Nacho', 'Nicolás', 'Óscar', 'Pablo', 'Pau',
  'Pedro', 'Rafa', 'Raúl', 'Roberto', 'Rodrigo', 'Rubén', 'Samuel', 'Santi',
  'Sergio', 'Unai', 'Víctor', 'Xavi', 'Yeray', 'Aitor', 'Asier', 'Gorka',
  'Javi', 'Kike', 'Mikel', 'Pol', 'Marc', 'Oriol', 'Jordi', 'Arnau',
];

const SPANISH_LAST_NAMES = [
  'García', 'Martínez', 'López', 'Sánchez', 'González', 'Pérez', 'Rodríguez', 'Fernández',
  'Gómez', 'Martín', 'Jiménez', 'Ruiz', 'Hernández', 'Díaz', 'Moreno', 'Álvarez',
  'Muñoz', 'Romero', 'Alonso', 'Gutiérrez', 'Navarro', 'Torres', 'Domínguez', 'Vázquez',
  'Ramos', 'Gil', 'Ramírez', 'Serrano', 'Blanco', 'Molina', 'Morales', 'Suárez',
  'Ortega', 'Delgado', 'Castro', 'Ortiz', 'Rubio', 'Marín', 'Sanz', 'Núñez',
  'Iglesias', 'Medina', 'Garrido', 'Cortés', 'Castillo', 'Santos', 'Lozano', 'Guerrero',
  'Cano', 'Prieto', 'Méndez', 'Cruz', 'Calvo', 'Gallego', 'Vidal', 'León',
  'Herrera', 'Márquez', 'Peña', 'Cabrera', 'Flores', 'Campos', 'Vega', 'Fuentes',
  'Carrasco', 'Díez', 'Caballero', 'Nieto', 'Reyes', 'Aguilar', 'Pascual', 'Herrero',
  'Santana', 'Lorenzo', 'Hidalgo', 'Montero', 'Ibáñez', 'Giménez', 'Ferrer', 'Durán',
  'Vicente', 'Benítez', 'Mora', 'Santiago', 'Arias', 'Vargas', 'Carmona', 'Crespo',
  'Román', 'Pastor', 'Soto', 'Sáez', 'Velasco', 'Moya', 'Soler', 'Parra',
];

const SQUAD_TEMPLATE: ReadonlyArray<{
  role: DetailedRole;
  ovrOffset: number;
  baseAge: number;
  shirt: number;
}> = [
  // Goleiros (2)
  { role: 'GOL', ovrOffset: 1, baseAge: 28, shirt: 1 },
  { role: 'GOL', ovrOffset: -2, baseAge: 23, shirt: 13 },
  // Zagueiros (4)
  { role: 'ZAG', ovrOffset: 2, baseAge: 29, shirt: 4 },
  { role: 'ZAG', ovrOffset: 1, baseAge: 26, shirt: 5 },
  { role: 'ZAG', ovrOffset: -1, baseAge: 24, shirt: 15 },
  { role: 'ZAG', ovrOffset: -2, baseAge: 21, shirt: 22 },
  // Laterais (4)
  { role: 'LAT', ovrOffset: 1, baseAge: 26, shirt: 2 },
  { role: 'LAT', ovrOffset: -2, baseAge: 22, shirt: 12 },
  { role: 'LAT', ovrOffset: 1, baseAge: 25, shirt: 3 },
  { role: 'LAT', ovrOffset: -2, baseAge: 23, shirt: 18 },
  // Meio-campo (7)
  { role: 'VOL', ovrOffset: 2, baseAge: 28, shirt: 6 },
  { role: 'VOL', ovrOffset: 0, baseAge: 24, shirt: 14 },
  { role: 'VOL', ovrOffset: -2, baseAge: 21, shirt: 21 },
  { role: 'MEI', ovrOffset: 2, baseAge: 27, shirt: 8 },
  { role: 'MEI', ovrOffset: 0, baseAge: 23, shirt: 16 },
  { role: 'MEI', ovrOffset: 2, baseAge: 26, shirt: 10 },
  { role: 'MEI', ovrOffset: -1, baseAge: 22, shirt: 20 },
  // Ataque (5)
  { role: 'ATA', ovrOffset: 1, baseAge: 24, shirt: 7 },
  { role: 'ATA', ovrOffset: 1, baseAge: 23, shirt: 11 },
  { role: 'ATA', ovrOffset: -2, baseAge: 20, shirt: 17 },
  { role: 'ATA', ovrOffset: 2, baseAge: 28, shirt: 9 },
  { role: 'ATA', ovrOffset: -1, baseAge: 23, shirt: 19 },
];

function hashString(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

function generateSpanishSquad(clubId: string, baseOvr: number): SpainCopaExtraPlayerTuple[] {
  let seed = hashString(clubId) || 137;
  const nextRand = (): number => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };

  const usedNames = new Set<string>();
  return SQUAD_TEMPLATE.map((slot, idx) => {
    let fullName = '';
    for (let attempt = 0; attempt < 25; attempt++) {
      const fn = SPANISH_FIRST_NAMES[Math.floor(nextRand() * SPANISH_FIRST_NAMES.length)];
      const ln = SPANISH_LAST_NAMES[Math.floor(nextRand() * SPANISH_LAST_NAMES.length)];
      const candidate = `${fn} ${ln}`;
      if (!usedNames.has(candidate)) {
        fullName = candidate;
        usedNames.add(candidate);
        break;
      }
    }
    if (!fullName) {
      fullName = `${SPANISH_FIRST_NAMES[idx % SPANISH_FIRST_NAMES.length]} ${SPANISH_LAST_NAMES[(idx * 3) % SPANISH_LAST_NAMES.length]}`;
    }

    const ovrJitter = Math.floor(nextRand() * 3) - 1; // -1..+1
    const ovr = Math.max(57, Math.min(72, baseOvr + slot.ovrOffset + ovrJitter));
    const ageJitter = Math.floor(nextRand() * 5) - 2; // -2..+2
    const age = Math.max(19, Math.min(35, slot.baseAge + ageJitter));
    const nat = nextRand() < 0.88 ? 'ESP' : nextRand() < 0.5 ? 'ARG' : 'POR';

    return [fullName, slot.role, ovr, age, slot.shirt, nat];
  });
}

const SPAIN_COPA_EXTRA_SEEDS: SpainCopaExtraClubSeed[] = [
  {
    id: 'eu_esp3_lug',
    name: 'CD Lugo',
    shortName: 'CD Lugo',
    reputation: 2,
    primaryColor: '#d81e27',
    stadiumName: 'Estadio Anxo Carro',
    managerName: 'Lolo Escobar',
    baseOvr: 64,
  },
  {
    id: 'eu_esp3_log',
    name: 'UD Logroñés',
    shortName: 'UD Logroñés',
    reputation: 2,
    primaryColor: '#dc2626',
    stadiumName: 'Estadio Las Gaunas',
    managerName: 'Miguel Flaño',
    baseOvr: 62,
  },
  {
    id: 'eu_esp3_avi',
    name: 'Real Avilés Industrial',
    shortName: 'Real Avilés',
    reputation: 2,
    primaryColor: '#2563eb',
    stadiumName: 'Estadio Román Suárez Puerta',
    managerName: 'Javi Rozada',
    baseOvr: 61,
  },
  {
    id: 'eu_esp3_pon',
    name: 'Pontevedra CF',
    shortName: 'Pontevedra CF',
    reputation: 2,
    primaryColor: '#7f1d1d',
    stadiumName: 'Estadio Municipal de Pasarón',
    managerName: 'Yago Iglesias',
    baseOvr: 63,
  },
  {
    id: 'eu_esp3_mer',
    name: 'AD Mérida',
    shortName: 'Mérida AD',
    reputation: 2,
    primaryColor: '#1f2937',
    stadiumName: 'Estadio Romano José Fouto',
    managerName: 'Sergi Guilló',
    baseOvr: 63,
  },
  {
    id: 'eu_esp3_mir',
    name: 'CD Mirandés',
    shortName: 'CD Mirandés',
    reputation: 3,
    primaryColor: '#dc2626',
    stadiumName: 'Estadio Municipal de Anduva',
    managerName: 'Alessio Lisci',
    baseOvr: 66,
  },
  {
    id: 'eu_esp3_cac',
    name: 'CP Cacereño',
    shortName: 'CP Cacereño',
    reputation: 2,
    primaryColor: '#15803d',
    stadiumName: 'Estadio Príncipe Felipe',
    managerName: 'Julio Cobos',
    baseOvr: 61,
  },
  {
    id: 'eu_esp3_run',
    name: 'Real Unión Club',
    shortName: 'Real Unión',
    reputation: 2,
    primaryColor: '#1e293b',
    stadiumName: 'Stadium Gal',
    managerName: 'Mikel Llorente',
    baseOvr: 63,
  },
  {
    id: 'eu_esp3_ext',
    name: 'CD Extremadura',
    shortName: 'CD Extremadura',
    reputation: 2,
    primaryColor: '#1d4ed8',
    stadiumName: 'Estadio Francisco de la Hera',
    managerName: 'Cisqui',
    baseOvr: 61,
  },
  {
    id: 'eu_esp3_cor',
    name: 'CD Coria',
    shortName: 'CD Coria',
    reputation: 2,
    primaryColor: '#0284c7',
    stadiumName: 'Estadio La Isla',
    managerName: 'Rai Rosa',
    baseOvr: 60,
  },
  {
    id: 'eu_esp3_zam',
    name: 'Zamora CF',
    shortName: 'Zamora CF',
    reputation: 2,
    primaryColor: '#b91c1c',
    stadiumName: 'Estadio Ruta de la Plata',
    managerName: 'Juan Sabas',
    baseOvr: 63,
  },
  {
    id: 'eu_esp3_are',
    name: 'Arenas Club de Getxo',
    shortName: 'Arenas Club',
    reputation: 2,
    primaryColor: '#991b1b',
    stadiumName: 'Campo Municipal de Gobela',
    managerName: 'Ibai Gómez',
    baseOvr: 61,
  },
  {
    id: 'eu_esp3_our',
    name: 'UD Ourense',
    shortName: 'UD Ourense',
    reputation: 2,
    primaryColor: '#dc2626',
    stadiumName: 'Estadio O Couto',
    managerName: 'Borja Fernández',
    baseOvr: 60,
  },
  {
    id: 'eu_esp3_zar',
    name: 'Real Zaragoza',
    shortName: 'Real Zaragoza',
    reputation: 3,
    primaryColor: '#1d4ed8',
    stadiumName: 'Estadio de La Romareda',
    managerName: 'Víctor Fernández',
    baseOvr: 67,
  },
  {
    id: 'eu_esp3_alc',
    name: 'AD Alcorcón',
    shortName: 'AD Alcorcón',
    reputation: 3,
    primaryColor: '#eab308',
    stadiumName: 'Estadio Municipal de Santo Domingo',
    managerName: 'Pablo Álvarez',
    baseOvr: 65,
  },
  {
    id: 'eu_esp3_mur',
    name: 'Real Murcia CF',
    shortName: 'Real Murcia',
    reputation: 3,
    primaryColor: '#dc2626',
    stadiumName: 'Estadio Enrique Roca de Murcia',
    managerName: 'Fran Fernández',
    baseOvr: 66,
  },
  {
    id: 'eu_esp3_car',
    name: 'FC Cartagena',
    shortName: 'FC Cartagena',
    reputation: 3,
    primaryColor: '#111827',
    stadiumName: 'Estadio Municipal Cartagonova',
    managerName: 'Jandro Castro',
    baseOvr: 66,
  },
  {
    id: 'eu_esp3_ibi',
    name: 'UD Ibiza',
    shortName: 'UD Ibiza',
    reputation: 3,
    primaryColor: '#0ea5e9',
    stadiumName: 'Estadio Municipal de Can Misses',
    managerName: 'Paco Jémez',
    baseOvr: 65,
  },
  {
    id: 'eu_esp3_her',
    name: 'Hércules de Alicante CF',
    shortName: 'Hércules CF',
    reputation: 3,
    primaryColor: '#1d4ed8',
    stadiumName: 'Estadio José Rico Pérez',
    managerName: 'Rubén Torrecilla',
    baseOvr: 65,
  },
  {
    id: 'eu_esp3_ant',
    name: 'Antequera CF',
    shortName: 'Antequera CF',
    reputation: 2,
    primaryColor: '#16a34a',
    stadiumName: 'Estadio El Maulí',
    managerName: 'Javi Medina',
    baseOvr: 64,
  },
  {
    id: 'eu_esp3_jae',
    name: 'Real Jaén CF',
    shortName: 'Real Jaén CF',
    reputation: 2,
    primaryColor: '#4c1d95',
    stadiumName: 'Nuevo Estadio La Victoria',
    managerName: 'Roberto Peragón',
    baseOvr: 61,
  },
  {
    id: 'eu_esp3_alg',
    name: 'Algeciras CF',
    shortName: 'Algeciras CF',
    reputation: 2,
    primaryColor: '#dc2626',
    stadiumName: 'Estadio Nuevo Mirador',
    managerName: 'Fran Justo',
    baseOvr: 63,
  },
  {
    id: 'eu_esp3_hue',
    name: 'SD Huesca',
    shortName: 'SD Huesca',
    reputation: 3,
    primaryColor: '#7c2d12',
    stadiumName: 'Estadio El Alcoraz',
    managerName: 'Antonio Hidalgo',
    baseOvr: 67,
  },
  {
    id: 'eu_esp3_eur',
    name: 'CE Europa',
    shortName: 'CE Europa',
    reputation: 2,
    primaryColor: '#2563eb',
    stadiumName: 'Nou Sardenya',
    managerName: 'Aday Benítez',
    baseOvr: 62,
  },
  {
    id: 'eu_esp3_agu',
    name: 'Águilas FC',
    shortName: 'Águilas FC',
    reputation: 2,
    primaryColor: '#1e40af',
    stadiumName: 'Estadio El Rubial',
    managerName: 'Fran Alcoy',
    baseOvr: 61,
  },
  {
    id: 'eu_esp3_rmj',
    name: 'CF Rayo Majadahonda',
    shortName: 'Rayo Majadahonda',
    reputation: 2,
    primaryColor: '#b91c1c',
    stadiumName: 'Estadio Cerro del Espino',
    managerName: 'Jesús Arribas',
    baseOvr: 62,
  },
  {
    id: 'eu_esp3_ter',
    name: 'CD Teruel',
    shortName: 'CD Teruel',
    reputation: 2,
    primaryColor: '#dc2626',
    stadiumName: 'Estadio Pinilla',
    managerName: 'Unai Mendia',
    baseOvr: 62,
  },
];

export const SPAIN_COPA_EXTRA_2026: SpainCopaExtraClubData[] = SPAIN_COPA_EXTRA_SEEDS.map(
  (seed) => ({
    id: seed.id,
    name: seed.name,
    shortName: seed.shortName,
    reputation: seed.reputation,
    primaryColor: seed.primaryColor,
    stadiumName: seed.stadiumName,
    managerName: seed.managerName,
    players: generateSpanishSquad(seed.id, seed.baseOvr),
  })
);

export const SPAIN_COPA_EXTRA_CLUB_IDS: string[] = SPAIN_COPA_EXTRA_2026.map((c) => c.id);
