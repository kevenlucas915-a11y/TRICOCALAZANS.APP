export type StatusAgendamento = 'agendado' | 'confirmado' | 'em_atendimento' | 'concluido' | 'cancelado';

export interface MotivoConsulta {
  id: string;
  titulo: string;
  descricao: string;
  duracaoMinutos: number;
  corHex: string;
  bgClasse: string;
  badgeClasse: string;
  bordaClasse: string;
  icone: 'microscope' | 'sparkles' | 'camera' | 'fileText' | 'activity' | 'calendar';
}

export const MOTIVOS_CONSULTA: MotivoConsulta[] = [
  {
    id: 'primeira_avaliacao',
    titulo: 'Primeira Avaliação Tricológica',
    descricao: 'Consulta inicial, histórico da queixa capilar e exame dermatoscópico detalhado.',
    duracaoMinutos: 60,
    corHex: '#0F766E',
    bgClasse: 'bg-teal-500/10 text-teal-700 dark:text-teal-300',
    badgeClasse: 'bg-teal-100 text-teal-900 dark:bg-teal-950/60 dark:text-teal-300',
    bordaClasse: 'border-teal-300 dark:border-teal-700',
    icone: 'microscope'
  },
  {
    id: 'retorno',
    titulo: 'Retorno & Acompanhamento',
    descricao: 'Reavaliação clínica, evolução pós-terapia e ajuste de conduta.',
    duracaoMinutos: 30,
    corHex: '#10B981',
    bgClasse: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    badgeClasse: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300',
    bordaClasse: 'border-emerald-300 dark:border-emerald-700',
    icone: 'activity'
  },
  {
    id: 'fototricoscopia',
    titulo: 'Fototricoscopia Digital',
    descricao: 'Exame de captura digital padronizada e mapeamento quantitativo na bancada.',
    duracaoMinutos: 45,
    corHex: '#0EA5E9',
    bgClasse: 'bg-sky-500/10 text-sky-600 dark:text-sky-400',
    badgeClasse: 'bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300',
    bordaClasse: 'border-sky-300 dark:border-sky-700',
    icone: 'camera'
  },
  {
    id: 'terapia_capilar',
    titulo: 'Terapia Capilar & Procedimento',
    descricao: 'Sessão terapêutica (LEDterapia, drug delivery, MMP ou microagulhamento).',
    duracaoMinutos: 60,
    corHex: '#F59E0B',
    bgClasse: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
    badgeClasse: 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300',
    bordaClasse: 'border-amber-300 dark:border-amber-700',
    icone: 'sparkles'
  },
  {
    id: 'anamnese_exame',
    titulo: 'Anamnese Completa + Exame',
    descricao: 'Aplicação de questionário clínico estruturado com exame tricoscópico.',
    duracaoMinutos: 75,
    corHex: '#EC4899',
    bgClasse: 'bg-pink-500/10 text-pink-600 dark:text-pink-400',
    badgeClasse: 'bg-pink-100 text-pink-800 dark:bg-pink-950/60 dark:text-pink-300',
    bordaClasse: 'border-pink-300 dark:border-pink-700',
    icone: 'fileText'
  },
  {
    id: 'outro',
    titulo: 'Outro Procedimento / Consulta',
    descricao: 'Atendimento clínico personalizado ou encaixe.',
    duracaoMinutos: 30,
    corHex: '#64748B',
    bgClasse: 'bg-slate-500/10 text-slate-600 dark:text-slate-400',
    badgeClasse: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300',
    bordaClasse: 'border-slate-300 dark:border-slate-700',
    icone: 'calendar'
  }
];

export interface Agendamento {
  id: string;
  userId?: string;
  pacienteId: string;
  pacienteNome: string;
  pacienteTelefone?: string;
  data: string; // YYYY-MM-DD
  horario: string; // HH:mm
  duracaoMinutos: number;
  motivoId: string;
  motivoTitulo: string;
  motivoCor: string;
  status: StatusAgendamento;
  observacoes?: string;
  lembreteNotificado?: boolean;
  createdAt: string;
  updatedAt: string;
}
