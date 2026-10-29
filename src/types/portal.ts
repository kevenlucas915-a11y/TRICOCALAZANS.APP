export type PapelUsuario = 'profissional' | 'paciente';

export interface ConvitePaciente {
  id: string; // token único
  token: string;
  pacienteId: string;
  pacienteNome: string;
  pacienteTelefone?: string;
  pacienteEmail?: string;
  profissionalUid: string;
  profissionalNome: string;
  nomeClinica?: string;
  status: 'pendente' | 'usado' | 'expirado';
  expiraEm: string; // ISO string (ex.: 7 dias)
  usadoEm?: string;
  pacienteUid?: string;
  createdAt: string;
}

export interface PacienteUsuario {
  uid: string;
  pacienteId: string;
  profissionalUid: string;
  papel: 'paciente';
  email: string;
  nome: string;
  telefone?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProdutoIndicado {
  id: string;
  pacienteId: string;
  profissionalUid: string;
  pacienteUid?: string;
  nome: string; // Nome do produto / fórmula
  comoUsar: string; // Modo de uso, posologia e frequência
  observacao?: string; // Recomendações e avisos para o paciente
  liberadoPaciente: boolean; // Se visível no Portal do Paciente (padrão false)
  createdAt: string;
  updatedAt: string;
}

export interface AchadoLiberado {
  id: string;
  nome: string;
  fotoUrl?: string;
  area?: string;
  data?: string;
  liberadoPaciente: boolean;
}

