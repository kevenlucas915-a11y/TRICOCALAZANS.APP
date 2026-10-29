/**
 * Tipos de dados estruturados para o Assistente Visual de Tricoscopia
 * Fonte exclusiva: "Damiana Calazans — Atlas Visual de Tricoscopia"
 */

export type CategoriaClinica =
  | 'Não Cicatricial'
  | 'Cicatricial'
  | 'Infecciosa'
  | 'Dermatose Descamativa'
  | 'Parasitária';

export interface ImagemReferencia {
  id: string;
  casoId?: string;
  paginaPdf: number;
  aumento: '50x' | '5x';
  legenda: string;
  contexto: string;
  achadosVisiveis: string[];
  url?: string;
}

export interface CasoAtlas {
  id: string;
  numeroOrdem?: number;
  nome: string;
  categoria: CategoriaClinica;
  imagem: ImagemReferencia;
  oQueObservar: string[];
  caracteristicas: string[];
  achadosTricoscopicos: string[];
  achadosIds: string[];
  significadoClinico: string;
  comoReconhecer: string[];
  padrao: string;
  localizacao: string;
  diferenciaisComparações: {
    casoId: string;
    nomeCaso: string;
    distincaoChave: string;
  }[];
  referenciasRelacionadas: string[];
  resumoOriginal: string;
  fontePagina: number;
  outrasPaginas?: number[];
}

export interface AchadoTricoscopico {
  id: string;
  nome: string;
  estrutura: 'Óstios Foliculares' | 'Hastes' | 'Superfície / Escamas' | 'Vasos' | 'Pigmentação' | 'Inflamação & Eritema';
  descricao: string;
  significadoClinico: string;
  marcadorAtividade: boolean;
  condicoesAssociadasIds: string[];
  paginasOrigem: number[];
}

export interface ItemComparacao {
  criterio: string;
  condicaoA: string;
  condicaoB: string;
}

export interface ComparacaoDireta {
  id: string;
  titulo: string;
  casoAId: string;
  nomeCasoA: string;
  casoBId: string;
  nomeCasoB: string;
  imagemA: ImagemReferencia;
  imagemB: ImagemReferencia;
  criterios: ItemComparacao[];
  paginaOrigem: number;
}
