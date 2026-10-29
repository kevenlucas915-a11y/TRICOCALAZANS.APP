export type TipoPerguntaAnamnese = 
  | 'texto_curto'
  | 'paragrafo'
  | 'multipla_escolha'
  | 'caixas_selecao'
  | 'escala_linear'
  | 'sim_nao';

export interface PerguntaAnamnese {
  id: string;
  tipo: TipoPerguntaAnamnese;
  titulo: string;
  descricao?: string;
  obrigatoria: boolean;
  opcoes?: string[];
  escalaMin?: number;
  escalaMax?: number;
  escalaMinLabel?: string;
  escalaMaxLabel?: string;
}

export interface ModeloAnamnese {
  id: string;
  userId?: string;
  titulo: string;
  descricao: string;
  categoria: string;
  isPadrao?: boolean;
  perguntas: PerguntaAnamnese[];
  createdAt: string;
  updatedAt: string;
}

export interface RespostaItemAnamnese {
  perguntaId: string;
  perguntaTitulo: string;
  tipo: TipoPerguntaAnamnese;
  valor: string | string[] | number | boolean;
}

export interface SessaoEvolucaoFicha {
  id: string;
  numeroSessao: number;
  data: string;
  tratamentoRealizado: string;
  assinaturaClienteBase64?: string;
  createdAt: string;
}

export interface FichaAvaliacaoCapilarData {
  // Etapa 1
  nomeCliente: string;
  dataNascimento?: string;
  idadeCalculada?: string;
  sexo: 'Feminino' | 'Masculino' | 'Outro';
  cep?: string;
  endereco?: string;
  bairro?: string;
  cidade?: string;
  estado?: string;
  celular?: string;
  email?: string;
  profissao?: string;
  estadoCivil?: string;
  cpf?: string;
  tipoSanguineo?: string;
  etnia?: string;
  comoConheceu?: string;
  comoConheceuOutro?: string;

  // Etapa 2
  queixaPrincipal?: string;

  // Etapa 3
  doencasGraves?: { sim: boolean; qual?: string };
  cirurgias?: { sim: boolean; qual?: string };
  covid?: { teveCovid: boolean; tomouVacina: boolean; doses?: string };
  doencaFamiliar?: { sim: boolean; qual?: string };
  queloide?: { sim: boolean; qual?: string };
  tratamentoAtual?: { sim: boolean; qual?: string };
  problemaEndocrino?: { sim: boolean; qual?: string };
  problemaCardiaco?: { sim: boolean; qual?: string };
  marcapasso?: boolean;
  protese?: { sim: boolean; qual?: string };
  medicacaoContinua?: { sim: boolean; qual?: string };
  alergias?: { sim: boolean; qual?: string };
  problemasDigestivos?: { sim: boolean; qual?: string };
  problemasIntestinais?: { sim: boolean; qual?: string };

  // Etapa 4
  exercicioFisico?: { sim: boolean; qualFrequencia?: string };
  bebidaAlcoolica?: 'Não' | 'Socialmente' | 'Frequentemente' | string;
  fuma?: boolean;
  drogasRecreativas?: { sim: boolean; qual?: string };
  ist?: { sim: boolean; qual?: string };
  sono?: { dormeAs: string; acordaAs: string; horasCalculadas?: string };

  // Etapa 5 (Mulheres)
  alteracaoMenstrual?: { sim: boolean; qual?: string };
  temFilhos?: { sim: boolean; quantos?: string };
  perdaGestacional?: { sim: boolean; data?: string };
  dataUltimaGravidez?: string;
  queixaNaGravidez?: { sim: boolean; qual?: string };
  sop?: boolean;

  // Etapa 6
  quimicas?: string[];
  quimicasOutras?: string;
  habitosAdornos?: string[];
  habitosAdornosLivre?: string;
  frequenciaLavagem?: string;
  temperaturaAgua?: string;
  secagem?: string;
  chapinhaBabyliss?: string;
  higienizacaoLivre?: string;

  // Etapa 7
  anotacoesProfissional?: string;
  tratamentoSugerido?: string;
  coletaMicroscopia?: { sim: boolean; dataEnvio?: string };
  indicacaoNutraceuticos?: { sim: boolean; sugerido?: string };

  // Etapa 8
  declaracaoVerdadeAceita?: boolean;
  cidadeData?: string;
  assinaturaClienteBase64?: string;
  consentimentoLgpd?: boolean;

  // Sessões
  sessoes?: SessaoEvolucaoFicha[];
}

export interface RespostaAnamnese {
  id: string;
  modeloId: string;
  modeloTitulo: string;
  pacienteId: string;
  pacienteNome: string;
  userId?: string;
  status?: 'rascunho' | 'finalizada';
  respostas: RespostaItemAnamnese[];
  dadosFichaJson?: string;
  sessoesJson?: string;
  assinaturaUrl?: string;
  anotacoesEspecialista?: string;
  dataPreenchimento: string;
  createdAt: string;
  updatedAt: string;
}
