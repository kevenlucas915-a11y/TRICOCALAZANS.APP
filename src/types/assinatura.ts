export type PlanoId = 'mensal' | 'anual' | 'gratuito' | 'pro' | 'master';

export type CicloCobranca = 'mensal' | 'anual';

export type StatusAssinatura = 'ativo' | 'trial' | 'cancelado' | 'expirado';

export type MetodoPagamento = 'pix' | 'cartao' | 'boleto';

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

export function temAcessoAtlas(usuario: any): boolean {
  if (!usuario) return false;
  const status = usuario.planoStatus || 'trial';
  // Tanto Mensal quanto Anual têm acesso irrestrito ao Atlas Clínico
  return status === 'ativo' || status === 'trial';
}


