export type PlanoId = 'degustacao' | 'mensal' | 'anual' | 'gratuito' | 'pro' | 'master';

export type CicloCobranca = 'mensal' | 'anual';

export type StatusAssinatura = 'ativo' | 'trial' | 'cancelado' | 'expirado';

export type MetodoPagamento = 'pix' | 'cartao' | 'boleto' | 'kiwify' | 'stripe' | 'admin_vitalicio';

export const LINKS_KIWIFY = {
  degustacao: 'https://pay.kiwify.com.br/ltmVSfe',
  mensal: 'https://pay.kiwify.com.br/UzqmVk6',
  anual: 'https://pay.kiwify.com.br/Srqbf4k'
} as const;

export interface RecursoPlano {
  texto: string;
  incluso: boolean;
  destaque?: boolean;
}

export interface PlanoConfig {
  id: PlanoId;
  nome: string;
  subtitulo: string;
  badge?: string;
  popular?: boolean;
  precoMensal: number; // Preço cobrado por mês
  precoAnual: number; // Valor total cobrado no ciclo anual
  parcelasAnual: number; // ex: 12 parcelas
  economiaAnualPercentual: number;
  descricao: string;
  limites: {
    pacientes: string;
    anamneses: string;
    capturas: string;
    modelosPersonalizados: boolean;
    laudoSemMarca: boolean;
    comparadorAvancado: boolean;
    multiUsuarios: number;
    suportePrioritario: boolean;
    portalPaciente: boolean; // Novo indicador chave
  };
  recursos: RecursoPlano[];
}

export interface FaturaHistorico {
  id: string;
  data: string;
  valor: number;
  planoId: PlanoId;
  ciclo: CicloCobranca;
  status: 'pago' | 'processando' | 'reembolsado';
  metodo: MetodoPagamento;
  comprovanteNumero: string;
}

export const PLANOS_DISPONIVEIS: PlanoConfig[] = [
  {
    id: 'degustacao',
    nome: 'Plano Degustação (7 Dias)',
    subtitulo: 'Experimente na prática as ferramentas clínicas completas por 1 semana',
    badge: 'Degustação • R$ 5,00',
    popular: false,
    precoMensal: 5.00,
    precoAnual: 5.00,
    parcelasAnual: 1,
    economiaAnualPercentual: 0,
    descricao: 'Acesso às ferramentas clínicas básicas para experimentar por 7 dias com até 1 paciente cadastrado.',
    limites: {
      pacientes: 'Até 1 paciente cadastrado',
      anamneses: 'Anamnese completa do paciente',
      capturas: 'Capturas fotográficas ilimitadas',
      modelosPersonalizados: true,
      laudoSemMarca: true,
      comparadorAvancado: true,
      multiUsuarios: 1,
      suportePrioritario: false,
      portalPaciente: false
    },
    recursos: [
      { texto: 'Período degustação de 7 dias por apenas R$ 5,00', incluso: true, destaque: true },
      { texto: 'Cadastro de até 1 paciente para avaliação completa', incluso: true, destaque: true },
      { texto: 'Bancada digital de tricoscopia com zoom 5x e filtros ópticos', incluso: true },
      { texto: 'Anamnese capilar estruturada e laudos em PDF A4 sem marca', incluso: true },
      { texto: 'Comparador de evolução Antes & Depois com zoom sincronizado', incluso: true },
      { texto: 'Atlas Clínico Tricoscópico HD', incluso: false, destaque: false },
      { texto: 'Envio de acesso ao Portal do Paciente', incluso: false, destaque: false },
      { texto: 'Sem fidelidade (upgrade quando desejar)', incluso: true }
    ]
  },
  {
    id: 'mensal',
    nome: 'Plano Mensal',
    subtitulo: 'Flexibilidade total mês a mês, sem carência ou fidelidade',
    precoMensal: 69.90,
    precoAnual: 0,
    parcelasAnual: 1,
    economiaAnualPercentual: 0,
    descricao: 'Acesso clínico completo a todas as ferramentas diagnósticas e prontuários.',
    limites: {
      pacientes: 'Pacientes ilimitados',
      anamneses: 'Anamneses ilimitadas',
      capturas: 'Capturas fotográficas ilimitadas',
      modelosPersonalizados: true,
      laudoSemMarca: true,
      comparadorAvancado: true,
      multiUsuarios: 1,
      suportePrioritario: false,
      portalPaciente: false // NÃO inclui envio de acesso ao portal do paciente
    },
    recursos: [
      { texto: 'Atlas Clínico Tricoscópico Completo (Patologias em HD)', incluso: true, destaque: true },
      { texto: 'Prontuários e pacientes ilimitados', incluso: true, destaque: true },
      { texto: 'Anamnese capilar completa e laudo em PDF A4 sem marca d’água', incluso: true, destaque: true },
      { texto: 'Bancada digital de tricoscopia com zoom 5x e filtros ópticos', incluso: true },
      { texto: 'Contagem folicular e cálculo de densidade em tempo real', incluso: true },
      { texto: 'Agenda clínica integrada de consultas', incluso: true },
      { texto: 'Sem fidelidade contratual (cancele quando desejar)', incluso: true },
      { texto: 'Envio de acesso à plataforma para os pacientes (Portal do Paciente)', incluso: false, destaque: false },
      { texto: 'Suporte clínico prioritário VIP', incluso: false }
    ]
  },
  {
    id: 'anual',
    nome: 'Plano Anual',
    subtitulo: 'Mais autoridade para o seu consultório e economia de R$ 240/ano',
    badge: 'Mais Escolhido • Economize 28%',
    popular: true,
    precoMensal: 49.90, // Equivalente a R$ 49,90/mês
    precoAnual: 598.80, // Faturado anualmente (12x de R$ 49,90)
    parcelasAnual: 12,
    economiaAnualPercentual: 28,
    descricao: 'Inclui tudo do Mensal + Envio de Acesso à Plataforma para os Pacientes.',
    limites: {
      pacientes: 'Pacientes ilimitados',
      anamneses: 'Anamneses ilimitadas',
      capturas: 'Capturas fotográficas ilimitadas',
      modelosPersonalizados: true,
      laudoSemMarca: true,
      comparadorAvancado: true,
      multiUsuarios: 1,
      suportePrioritario: true,
      portalPaciente: true // INCLUI envio de acesso ao portal do paciente
    },
    recursos: [
      { texto: 'TUDO do Plano Mensal incluso', incluso: true, destaque: true },
      { texto: 'ENVIO DE ACESSO À PLATAFORMA PARA OS PACIENTES (Portal do Paciente)', incluso: true, destaque: true },
      { texto: 'Seus pacientes acompanham evolução fotográfica e orientações pelo celular', incluso: true, destaque: true },
      { texto: 'Atlas Clínico Tricoscópico Completo + Bancada HD sem limites', incluso: true },
      { texto: 'Prontuários, laudos e anamneses 100% ilimitados', incluso: true },
      { texto: '12x de R$ 49,90 sem juros no cartão ou à vista no PIX', incluso: true, destaque: true },
      { texto: 'Economia garantida de R$ 240,00 por ano', incluso: true },
      { texto: 'Suporte clínico prioritário VIP', incluso: true, destaque: true }
    ]
  }
];

import { ehAdminEmail } from '../config/admins';
import { usuarioEhAdmin } from '../utils/fotosNuvem';

export function temAcessoAtlas(usuario: any): boolean {
  if (usuarioEhAdmin()) return true;
  if (!usuario) return false;
  // Administradores possuem acesso total irrestrito ao Atlas Clínico
  if (ehAdminEmail(usuario.email)) return true;
  const plano = String(usuario.planoId || '').toLowerCase().trim();
  // Plano degustação e plano gratuito possuem acesso totalmente bloqueado ao Atlas Clínico
  if (!plano || plano === 'degustacao' || plano === 'gratuito') return false;
  const planosPermitidos = ['mensal', 'anual', 'pro', 'master'];
  if (!planosPermitidos.includes(plano)) return false;
  const status = usuario.planoStatus || 'trial';
  return status === 'ativo' || status === 'trial';
}

export function usuarioPodeInserirDados(usuario: any): boolean {
  if (usuarioEhAdmin()) return true;
  if (!usuario) return false;
  // Administradores podem inserir dados livremente sem qualquer restrição de pagamento
  if (ehAdminEmail(usuario.email)) return true;
  // Modo gratuito/demonstração: pode navegar por todas as telas para entender como funciona,
  // mas não pode inserir nem salvar informações (prontuários, laudos, fotos, agendamentos).
  if (usuario.planoId === 'gratuito') return false;
  const status = usuario.planoStatus || 'trial';
  return status === 'ativo' || status === 'trial';
}

export function obterLimitePacientes(usuario: any): number {
  if (usuarioEhAdmin()) return Infinity;
  if (!usuario) return 0;
  // Administradores possuem capacidade ilimitada de pacientes
  if (ehAdminEmail(usuario.email)) return Infinity;
  // Modo gratuito: 0 pacientes (não pode criar novos pacientes)
  if (usuario.planoId === 'gratuito') return 0;
  // Plano Degustação: exatamente 1 paciente
  if (usuario.planoId === 'degustacao') return 1;
  return Infinity;
}

export function obterRotuloPlano(planoId?: string, email?: string): string {
  if (usuarioEhAdmin() || (email && ehAdminEmail(email))) return 'ADMINISTRADOR';
  if (!planoId || planoId === 'gratuito') return 'GRATUITO';
  if (planoId === 'degustacao') return 'DEGUSTAÇÃO';
  if (planoId === 'mensal') return 'MENSAL';
  if (planoId === 'anual') return 'ANUAL';
  if (planoId === 'master') return 'ADMINISTRADOR';
  return String(planoId).toUpperCase();
}

export function obterNomeCompletoPlano(planoId?: string, email?: string): string {
  if (usuarioEhAdmin() || (email && ehAdminEmail(email))) return 'Acesso Administrativo Vitalício (Master)';
  if (!planoId || planoId === 'gratuito') return 'Modo Gratuito (Demonstração)';
  if (planoId === 'degustacao') return 'Plano Degustação (7 Dias - R$ 5,00)';
  if (planoId === 'mensal') return 'Plano Mensal (R$ 69,90/mês)';
  if (planoId === 'anual') return 'Plano Anual (12x de R$ 49,90)';
  if (planoId === 'master') return 'Acesso Administrativo Vitalício (Master)';
  return 'Plano Clínico';
}


