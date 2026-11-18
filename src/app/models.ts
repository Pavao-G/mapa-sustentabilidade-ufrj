/** Formatos dos dados do mapa (planilha ou public/dados/*.json). */

export interface Eixo {
  id: string;
  nome: string;
  cor: string;
  total: number;
}

export type TipoLocal = 'predio' | 'area' | 'vila';

export interface Local {
  id: string;
  nome: string;
  lat: number;
  lng: number;
  tipo: TipoLocal;
}

export interface Link {
  titulo: string;
  url: string;
}

export interface Projeto {
  id: string;
  titulo: string;
  /** id do eixo, ex.: "energia" */
  eixo: string;
  /** id do local, ex.: "ct" */
  local: string;
  descricao: string;
  pesquisa: string;
  professor: string;
  departamento: string;
  unidade: string;
  contato: string;
  inicio: string;
  ods: string[];
  links: Link[];
}
