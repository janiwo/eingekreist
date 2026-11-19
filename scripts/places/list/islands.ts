import type { BBox, Entry, LngLat } from '../types.ts'

/**
 * Islands: the Natural Earth land (or minor-island) polygon containing a point on the island,
 * or for island groups every polygon inside a box. Islands that are essentially one country
 * (Iceland, Sri Lanka, Madagascar, Cuba, Jamaica …) are left out; they are asked as countries.
 */
const island = (id: string, name: string, ...at: LngLat[]): Entry => ({
  id,
  name,
  source: { kind: 'land', at },
})

const group = (id: string, name: string, bbox: BBox): Entry => ({
  id,
  name,
  source: { kind: 'landIn', bbox },
})

export const islands: Entry[] = [
  // Europe
  island('great-britain', 'Großbritannien', [-1.5, 53]),
  island('ireland-island', 'Irland', [-8, 53.3]),
  island('sicily', 'Sizilien', [14, 37.5]),
  island('sardinia', 'Sardinien', [9, 40]),
  island('corsica', 'Korsika', [9.1, 42.1]),
  island('crete', 'Kreta', [24.9, 35.2]),
  island('cyprus-island', 'Zypern', [33, 35]),
  island('mallorca', 'Mallorca', [3, 39.6]),
  island('ibiza', 'Ibiza', [1.4, 38.98]),
  island('tenerife', 'Teneriffa', [-16.6, 28.27]),
  island('gran-canaria', 'Gran Canaria', [-15.6, 27.95]),
  island('madeira', 'Madeira', [-16.95, 32.75]),
  island('ruegen', 'Rügen', [13.4, 54.45]),
  island('sylt', 'Sylt', [8.31, 54.9]),
  island('bornholm', 'Bornholm', [14.9, 55.12]),
  island('gotland', 'Gotland', [18.5, 57.5]),
  island('rhodes', 'Rhodos', [28, 36.2]),
  island('corfu', 'Korfu', [19.9, 39.6]),
  island('elba', 'Elba', [10.25, 42.78]),
  island('capri', 'Capri', [14.24, 40.55]),
  island('spitsbergen', 'Spitzbergen', [16, 78.5]),
  group('lofoten', 'Lofoten', [12.8, 67.8, 16.2, 68.6]),
  group('faroe-islands', 'Färöer', [-8, 61.3, -6, 62.5]),
  group('azores', 'Azoren', [-32, 36.8, -24.5, 40]),
  // Asia
  island('borneo', 'Borneo', [114, 1]),
  island('sumatra', 'Sumatra', [101, 0]),
  island('java', 'Java', [110, -7.3]),
  island('bali', 'Bali', [115.2, -8.4]),
  island('sulawesi', 'Sulawesi', [120.5, -2]),
  island('honshu', 'Honshū', [138, 36]),
  island('hokkaido', 'Hokkaidō', [143, 43.3]),
  island('luzon', 'Luzon', [121, 16]),
  island('mindanao', 'Mindanao', [125, 7.5]),
  island('hainan', 'Hainan', [109.8, 19.2]),
  island('sakhalin', 'Sachalin', [143, 50]),
  island('jeju', 'Jejudo', [126.55, 33.38]),
  island('okinawa', 'Okinawa', [127.8, 26.4]),
  island('phuket', 'Phuket', [98.35, 7.95]),
  island('socotra', 'Sokotra', [54, 12.5]),
  island('timor', 'Timor', [125, -9]),
  // Africa
  island('zanzibar', 'Sansibar', [39.3, -6.1]),
  island('reunion', 'Réunion', [55.5, -21.1]),
  // Americas
  island('greenland', 'Grönland', [-40, 72]),
  island('baffin-island', 'Baffininsel', [-72, 68]),
  island('newfoundland', 'Neufundland', [-56, 48.5]),
  island('vancouver-island', 'Vancouver Island', [-125.5, 49.6]),
  island('long-island', 'Long Island', [-73, 40.8]),
  island('hispaniola', 'Hispaniola', [-71, 19]),
  island('puerto-rico', 'Puerto Rico', [-66.5, 18.25]),
  island('trinidad', 'Trinidad', [-61.3, 10.45]),
  island('tierra-del-fuego', 'Feuerland', [-68.5, -54]),
  group('galapagos', 'Galápagos-Inseln', [-92.2, -1.6, -89, 1.8]),
  island('easter-island', 'Osterinsel', [-109.35, -27.12]),
  // Oceania
  island('new-guinea', 'Neuguinea', [140, -5]),
  island('tasmania', 'Tasmanien', [146.5, -42]),
  island('north-island', 'Nordinsel', [175.5, -38.5]),
  island('south-island', 'Südinsel', [171, -43.5]),
  island('hawaii', 'Hawaii', [-155.5, 19.6]),
  island('tahiti', 'Tahiti', [-149.45, -17.65]),
]
