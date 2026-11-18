/**
 * Geometria da maquete da Cidade Universitária (Ilha do Fundão).
 * Posições derivadas de coordenadas do Google Maps: 1 unidade ≈ 60 m, norte para o fundo da cena.
 * O contorno da ilha é aproximado.
 */

export const ORIGEM = { lat: -22.855, lng: -43.227 };

/** Converte latitude/longitude em coordenadas da cena [x, z]. */
export function geo(lat: number, lng: number): [number, number] {
  return [(lng - ORIGEM.lng) * 1710, -(lat - ORIGEM.lat) * 1850];
}

/** Altura do topo da ilha. */
export const TOPO = 0.75;

/** Caixa de prédio relativa ao ponto do local: [dx, dz, largura, profundidade, altura]. */
export type Caixa = [number, number, number, number, number];

/** Volumes dos prédios dos locais cadastrados na API (chave = id do local). */
export const GEOMETRIA: Record<string, Caixa[]> = {
  hu:       [[0, 0, 4, 2.4, 8], [-2.05, -2.99, 2.2, 1.5, 1.6]],
  ccs:      [[0, 0, 5.2, 2.6, 2.4], [.4, 2.1, 3.6, 1.1, 1.6]],
  ru:       [[-.3, 0, 2.1, 1.4, 1]],
  jmm:      [[0, 0, 5.4, 1.4, 4], [-.6, 1.6, 3, 1.2, 1.4]],
  ccmn:     [[-.4, 0, 3.4, 1.8, 2.2]],
  ct:       [[1.2, -1.3, 5.2, 1.1, 2.1], [1.2, 1.2, 5.2, 1.1, 2.1], [3.9, 0, .9, 3.6, 2.1]],
  letras:   [[0, 0, 3, 2, 1.6]],
  parque:   [[-1.6, -.6, 2, 1.6, 1.6], [1.2, -.4, 2, 1.8, 2.2], [-.4, 1.6, 2.4, 1.2, 1.4]],
  reitoria: [[.6, 0, 2.6, 1.8, 2.4]]
};

/** Volume padrão para um local novo sem geometria desenhada. */
export const CAIXA_PADRAO: Caixa[] = [[0, 0, 2.2, 1.6, 1.4]];

/** Prédios de referência (sem projetos), só para contexto visual. */
export const CONTEXTO: { nome: string; lat: number; lng: number; caixas: Caixa[] }[] = [
  { nome: 'Educação Física (EEFD)', lat: -22.8442, lng: -43.2330, caixas: [[.6, 0, 2.2, 1.6, 1.2]] },
  { nome: 'Polo Bio-Rio',           lat: -22.8411, lng: -43.2311, caixas: [[0, 0, 2.6, 1.6, 1.3]] },
  { nome: 'CENPES (Petrobras)',     lat: -22.8538, lng: -43.2323, caixas: [[0, 0, 4, 2.6, 2], [3, .6, 1.6, 1.6, 1.4]] },
  { nome: 'COPPEAD',                lat: -22.8599, lng: -43.2184, caixas: [[0, 0, 2.4, 1.6, 1.4]] },
  { nome: 'LabOceano',              lat: -22.8649, lng: -43.2154, caixas: [[.4, 0, 2.4, 1.6, 2]] }
];

/** Contorno aproximado da ilha, em coordenadas da cena. */
export const ILHA: [number, number][] = [
  [-25, -28], [-18, -31], [-8, -30.5], [-2, -26.5], [-2.5, -17], [-3.5, -8], [0, -.5], [7, 2.5], [17, 2.5],
  [22, 7.5], [25.5, 15], [26.5, 23], [22.5, 28.5], [15, 30], [8.5, 26.5], [4, 17.5], [-3, 13.5], [-11, 12],
  [-15.5, 6.5], [-21, -3.5], [-25.5, -13], [-27, -21.5]
];

/** Vias internas (polilinhas) e largura. */
export const VIAS: { pontos: [number, number][]; largura: number }[] = [
  { largura: .8, pontos: [[-26.5, -19.5], [-16, -20.4], [-8, -20.8], [-5.5, -13], [-6.5, -6], [-6.8, 1.5], [-5, 3.4], [1, 7.2], [8, 8.5], [12, 11.5], [13, 16.5], [17.5, 21], [17, 27]] },
  { largura: .7, pontos: [[-16, -20.4], [-21, -17], [-22, -11], [-17, -4], [-12, 1.5], [-6.8, 1.5]] },
  { largura: .7, pontos: [[-5.5, 13], [-3, 10], [1, 7.2]] },
  { largura: .6, pontos: [[12, 11.5], [19, 13], [22.5, 18], [22, 25]] }
];

/** Pontes de acesso: [x1, z1, x2, z2], com rótulo. */
export const PONTES: { de: [number, number]; ate: [number, number]; nome: string; rotulo: [number, number] }[] = [
  { nome: 'Acesso · Linha Vermelha', de: [-26.5, -19.5], ate: [-40, -19.5], rotulo: [-36, -19.5] },
  { nome: 'Ponte do Saber',          de: [-5.5, 13],     ate: [-10.7, 31],  rotulo: [-8.7, 24.2] }
];
