import { PlanoId, StatusAssinatura, CicloCobranca, MetodoPagamento } from './assinatura';

export type PapelUsuario = 'profissional' | 'paciente';

export interface UsuarioProfissional {
  uid: string;
  papel?: PapelUsuario; // 'profissional' ou 'paciente' (padrão 'profissional')
  nome: string;
  email: string;
  telefone?: string;
  endereco?: string;
  nomeDoEspaco?: string; // Nome do Espaço / Clínica / Studio
  titulo?: string; // ex: 'Tricologista', 'Dermatologista'
  registro?: string; // ex: 'CRBM 12345', 'CRM 67890'
  clinica?: string; // Mantido para compatibilidade, sincronizado com nomeDoEspaco
  fotoUrl?: string;
  createdAt: string;
  updatedAt: string;
  senhaAlteradaEm?: string;

  // Gestão de Planos & Assinatura
  planoId?: PlanoId;
  planoStatus?: StatusAssinatura;
  planoCiclo?: CicloCobranca;
  planoValidade?: string;
  planoIniciadoEm?: string;
  planoMetodo?: MetodoPagamento;
}
