export type MlsConference = 'Leste' | 'Oeste';

export const MLS_CONFERENCE_GROUP_LABEL: Record<MlsConference, string> = {
  Leste: 'Conferência Leste',
  Oeste: 'Conferência Oeste',
};

export interface MlsClubMeta {
  conference: MlsConference;
  city: string;
  stadium: string;
  capacity: number;
  founded: number;
  managerName: string;
}

export const MLS_META_BY_CLUB_ID: Record<string, MlsClubMeta> = {
  // Conferência Leste (15 clubes)
  wl_usa_atl: { conference: 'Leste', city: 'Atlanta, Geórgia', stadium: 'Mercedes-Benz Stadium', capacity: 42500, founded: 2017, managerName: 'Gerardo Martino' },
  wl_usa_clt: { conference: 'Leste', city: 'Charlotte, Carolina do Norte', stadium: 'Bank of America Stadium', capacity: 38000, founded: 2022, managerName: 'Dean Smith' },
  wl_usa_chi: { conference: 'Leste', city: 'Chicago, Illinois', stadium: 'Soldier Field', capacity: 24995, founded: 1998, managerName: 'Gregg Berhalter' },
  wl_usa_cin: { conference: 'Leste', city: 'Cincinnati, Ohio', stadium: 'TQL Stadium', capacity: 26000, founded: 2019, managerName: 'Pat Noonan' },
  wl_usa_clb: { conference: 'Leste', city: 'Columbus, Ohio', stadium: 'ScottsMiracle-Gro Field', capacity: 20371, founded: 1996, managerName: 'Henrik Rydström' },
  wl_usa_dc: { conference: 'Leste', city: 'Washington, D.C.', stadium: 'Audi Field', capacity: 20000, founded: 1996, managerName: 'René Weiler' },
  wl_usa_mia: { conference: 'Leste', city: 'Miami, Flórida', stadium: 'Nu Stadium', capacity: 26700, founded: 2020, managerName: 'Javier Mascherano' },
  wl_usa_mtl: { conference: 'Leste', city: 'Montreal, Quebec', stadium: 'Saputo Stadium', capacity: 19619, founded: 2012, managerName: 'Marco Donadel' },
  wl_usa_nsh: { conference: 'Leste', city: 'Nashville, Tennessee', stadium: 'Geodis Park', capacity: 30000, founded: 2020, managerName: 'B. J. Callaghan' },
  wl_usa_ne: { conference: 'Leste', city: 'Foxborough, Massachusetts', stadium: 'Gillette Stadium', capacity: 20000, founded: 1996, managerName: 'Marko Mitrović' },
  wl_usa_nyc: { conference: 'Leste', city: 'Nova Iorque, Nova Iorque', stadium: 'Yankee Stadium', capacity: 30321, founded: 2015, managerName: 'Pascal Jansen' },
  wl_usa_nyrb: { conference: 'Leste', city: 'Harrison, Nova Jérsei', stadium: 'Sports Illustrated Stadium', capacity: 25000, founded: 1996, managerName: 'Michael Bradley' },
  wl_usa_orl: { conference: 'Leste', city: 'Orlando, Flórida', stadium: 'Inter&Co Stadium', capacity: 25500, founded: 2015, managerName: 'Óscar Pareja' },
  wl_usa_phi: { conference: 'Leste', city: 'Chester, Pensilvânia', stadium: 'Subaru Park', capacity: 18500, founded: 2010, managerName: 'Bradley Carnell' },
  wl_usa_tor: { conference: 'Leste', city: 'Toronto, Ontário', stadium: 'BMO Field', capacity: 28351, founded: 2007, managerName: 'Robin Fraser' },

  // Conferência Oeste (15 clubes)
  wl_usa_aus: { conference: 'Oeste', city: 'Austin, Texas', stadium: 'Q2 Stadium', capacity: 20738, founded: 2021, managerName: 'Nico Estévez' },
  wl_usa_col: { conference: 'Oeste', city: 'Commerce City, Colorado', stadium: "Dick's Sporting Goods Park", capacity: 18061, founded: 1996, managerName: 'Matt Wells' },
  wl_usa_dal: { conference: 'Oeste', city: 'Frisco, Texas', stadium: 'Toyota Stadium', capacity: 19096, founded: 1996, managerName: 'Eric Quill' },
  wl_usa_hou: { conference: 'Oeste', city: 'Houston, Texas', stadium: 'Shell Energy Stadium', capacity: 22039, founded: 2006, managerName: 'Ben Olsen' },
  wl_usa_skc: { conference: 'Oeste', city: 'Kansas City, Kansas', stadium: "Children's Mercy Park", capacity: 18467, founded: 1996, managerName: 'Raphaël Wicky' },
  wl_usa_lag: { conference: 'Oeste', city: 'Carson, Califórnia', stadium: 'Dignity Health Sports Park', capacity: 27000, founded: 1996, managerName: 'Greg Vanney' },
  wl_usa_lafc: { conference: 'Oeste', city: 'Los Angeles, Califórnia', stadium: 'BMO Stadium', capacity: 22000, founded: 2018, managerName: 'Marc Dos Santos' },
  wl_usa_min: { conference: 'Oeste', city: 'Saint Paul, Minnesota', stadium: 'Allianz Field', capacity: 19400, founded: 2017, managerName: 'Eric Ramsay' },
  wl_usa_por: { conference: 'Oeste', city: 'Portland, Oregon', stadium: 'Providence Park', capacity: 25218, founded: 2011, managerName: 'Phil Neville' },
  wl_usa_rsl: { conference: 'Oeste', city: 'Sandy, Utah', stadium: 'America First Field', capacity: 20213, founded: 2005, managerName: 'Pablo Mastroeni' },
  wl_usa_sd: { conference: 'Oeste', city: 'San Diego, Califórnia', stadium: 'Snapdragon Stadium', capacity: 35000, founded: 2025, managerName: 'Mikey Varas' },
  wl_usa_sj: { conference: 'Oeste', city: 'San José, Califórnia', stadium: 'PayPal Park', capacity: 18000, founded: 1996, managerName: 'Bruce Arena' },
  wl_usa_sea: { conference: 'Oeste', city: 'Seattle, Washington', stadium: 'Lumen Field', capacity: 37722, founded: 2009, managerName: 'Brian Schmetzer' },
  wl_usa_stl: { conference: 'Oeste', city: 'St. Louis, Missouri', stadium: 'Energizer Park', capacity: 22423, founded: 2023, managerName: 'Yoann Damet' },
  wl_usa_van: { conference: 'Oeste', city: 'Vancouver, Colúmbia Britânica', stadium: 'BC Place', capacity: 22120, founded: 2011, managerName: 'Jesper Sørensen' },
};

export const MLS_CONFERENCE_BY_CLUB_ID: Record<string, MlsConference> = Object.fromEntries(
  Object.entries(MLS_META_BY_CLUB_ID).map(([id, meta]) => [id, meta.conference])
);
