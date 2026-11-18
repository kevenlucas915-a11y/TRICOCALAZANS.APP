export interface RegraInfluenciador {
  id: string;
  nome: string;
  email: string; // e-mail do usuário no app
  codigoCupom: string; // ex: CAMILA20
  porcentagemDesconto: number; // ex: 20 (%)
  diasBonusIndicador: number; // ex: 30 (dias somados à assinatura)
  ativo: boolean;
  criadoEm: string;
}

export interface ConfigIndicacoes {
  porcentagemPadrao: number; // ex: 10 (%)
  cupomPadrao: string; // ex: TRICO10
  diasBonusPadrao: number; // ex: 30
  influenciadores: RegraInfluenciador[];
  atualizadoEm?: string;
}

export interface ItemHistoricoIndicacao {
  id: string;
  data: string;
  indicadorEmail: string;
  indicadorNome?: string;
  indicadoEmail: string;
  indicadoNome?: string;
  planoId: string;
  valorCentavos?: number;
  diasConcedidos: number;
  cupomUtilizado?: string;
  status: 'aprovado' | 'reembolsado';
}

export interface MetricasIndicadorUsuario {
  totalIndicados: number;
  diasGanhosTotal: number;
  ehInfluenciador: boolean;
  porcentagemDesconto: number;
  codigoCupom: string;
  historico: ItemHistoricoIndicacao[];
}

