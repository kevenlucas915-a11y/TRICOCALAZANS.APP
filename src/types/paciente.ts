export interface Paciente {
  id: string;
  userId?: string; // ID do profissional que atende o paciente
  profissionalUid?: string; // ID do profissional (garantido para segurança de papéis)
  pacienteUid?: string; // UID do usuário Auth do paciente (vinculado após ativação do portal)
  portalAtivo?: boolean;
  portalConviteToken?: string;
  portalConviteExpiraEm?: string;
  portalAtivadoEm?: string;
  nome: string;
  telefone?: string;
  email?: string;
  dataNascimento?: string;
  genero?: string;
  queixaPrincipal?: string;
  historicoClinico?: string;
  consentimentoIaExames?: {
    autorizado: boolean;
    data: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface FotoRegistroConsulta {
  id: string;
  url: string;
  titulo?: string;
  area?: string;
  data?: string;
  observacoes?: string;
}

export interface ConsultaRegistro {
  id: string;
  userId?: string;
  profissionalUid?: string;
  pacienteId: string;
  pacienteUid?: string;
  pacienteNome: string;
  data: string;
  area: string;
  tipoConsulta?: string; // ex: 'Retorno Clínico', 'Primeira Avaliação', 'Sessão de Tratamento'
  titulo?: string;
  anotacoes?: string;
  queixaEvolucao?: string;
  condutaTratamento?: string;
  sessionId?: string; // ID da sessão de fototricoscopia vinculada
  imagemUrl?: string; // foto principal
  imagemDataUrl?: string; // foto principal otimizada em base64 (fallback direto no Firestore)
  fotos?: FotoRegistroConsulta[]; // novos registros fotográficos da consulta
  totalFios?: number;
  totalUF?: number;
  ostiosVazios?: number;
  focosInflamacao?: number;
  achadosCount?: number;
  achadosResumo?: string;
  achadosLiberados?: string; // JSON com lista de achados liberados (nome e foto)
  liberadoPaciente?: boolean; // Controle se o paciente pode visualizar esta evolução no portal (padrão false)
  createdAt: string;
}

export type AnguloFotoGlobal =
  | 'Linha Frontal'
  | 'Vértex / Coroa'
  | 'Lateral Direita'
  | 'Lateral Esquerda'
  | 'Posterior / Occipital'
  | 'Topo da Cabeça'
  | 'Visão Geral / Livre';

export interface FotoGlobalPaciente {
  id: string;
  pacienteId: string;
  pacienteNome?: string;
  userId?: string;
  profissionalUid?: string;
  data: string; // YYYY-MM-DD
  angulo: AnguloFotoGlobal | string;
  imagemUrl: string;
  imagemPath?: string;
  observacoes?: string;
  liberadoPaciente?: boolean;
  createdAt: string;
  updatedAt?: string;
}
