import React from 'react';
import { 
  Bell, 
  Calendar, 
  Clock, 
  User, 
  Phone, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  ArrowRight, 
  Camera, 
  FileText,
  MessageCircle,
  Sparkles
} from 'lucide-react';
import { Agendamento, StatusAgendamento } from '../types/agendamento';

interface LembreteConsultaModalProps {
  isOpen: boolean;
  onClose: () => void;
  agendamentosHoje: Agendamento[];
  onIniciarAtendimento?: (agendamento: Agendamento) => void;
  onNavegarParaCalendario?: () => void;
  onAtualizarStatus?: (id: string, status: StatusAgendamento) => void;
}

export const LembreteConsultaModal: React.FC<LembreteConsultaModalProps> = ({
  isOpen,
  onClose,
  agendamentosHoje,
  onIniciarAtendimento,
  onNavegarParaCalendario,
  onAtualizarStatus
}) => {
  if (!isOpen || agendamentosHoje.length === 0) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-start pt-6 sm:pt-10 p-2.5 sm:p-4 bg-slate-950/75 backdrop-blur-md overflow-y-auto overscroll-contain animate-fadeIn">
      <div 
        className="w-full max-w-xl bg-white dark:bg-[#071918] rounded-3xl shadow-2xl border border-teal-200/70 dark:border-teal-500/30 overflow-hidden flex flex-col max-h-[85vh] mb-8 sm:mb-12 animate-scaleUp"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Topo do Lembrete com Gradiente Verde-Petróleo */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-teal-800 via-teal-700 to-teal-800 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white shadow-inner shrink-0 animate-pulse">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/20 text-white">
                  Lembrete do Consultório
                </span>
                <span className="text-xs font-medium text-teal-100">
                  {agendamentosHoje.length} {agendamentosHoje.length === 1 ? 'consulta hoje' : 'consultas hoje'}
                </span>
              </div>
              <h2 className="text-lg sm:text-xl font-bold tracking-tight text-white mt-0.5">
                Consultas Marcadas para Hoje
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
            title="Fechar lembrete"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Lista de Consultas de Hoje */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-3.5 flex-1 divide-y divide-slate-100 dark:divide-white/[0.06]">
          {agendamentosHoje.map((ag) => {
            const ehConfirmado = ag.status === 'confirmado';

            return (
              <div 
                key={ag.id} 
                className="pt-3.5 first:pt-0 group rounded-2xl p-3 hover:bg-teal-50/50 dark:hover:bg-teal-950/20 transition-all border border-transparent hover:border-teal-200/50 dark:hover:border-teal-800/30"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <div className="flex items-start gap-3">
                    {/* Horário */}
                    <div className="px-3 py-2 rounded-xl bg-teal-100 dark:bg-teal-950/60 text-teal-800 dark:text-teal-300 font-mono font-bold text-sm flex flex-col items-center justify-center shrink-0 border border-teal-200 dark:border-teal-800/50">
                      <Clock className="w-3.5 h-3.5 mb-0.5 text-teal-700 dark:text-teal-400" />
                      <span>{ag.horario}</span>
                    </div>

                    {/* Detalhes do Paciente e Motivo */}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 truncate">
                          {ag.pacienteNome}
                        </h3>
                        {/* Badge do Motivo */}
                        <span 
                          className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                          style={{
                            backgroundColor: `${ag.motivoCor}20`,
                            color: ag.motivoCor
                          }}
                        >
                          {ag.motivoTitulo}
                        </span>
                      </div>

                      {/* Telefone e observação */}
                      <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 mt-1 flex-wrap">
                        {ag.pacienteTelefone && (
                          <span className="flex items-center gap-1 font-mono">
                            <Phone className="w-3 h-3 text-slate-400" />
                            {ag.pacienteTelefone}
                          </span>
                        )}
                        <span className="text-[11px] text-slate-400">
                          {ag.duracaoMinutos} minutos
                        </span>
                      </div>

                      {ag.observacoes && (
                        <p className="text-xs text-slate-600 dark:text-slate-300 mt-1.5 line-clamp-2 bg-slate-50 dark:bg-slate-900/50 p-2 rounded-xl border border-slate-200/50 dark:border-slate-800/50 italic">
                          "{ag.observacoes}"
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Ações Rápidas por Agendamento */}
                  <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0 mt-2 sm:mt-0">
                    {onAtualizarStatus && !ehConfirmado && (
                      <button
                        onClick={() => onAtualizarStatus(ag.id, 'confirmado')}
                        className="px-2.5 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 text-xs font-semibold flex items-center gap-1 transition-colors border border-emerald-200 dark:border-emerald-800/40"
                        title="Confirmar presença do paciente"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Confirmar</span>
                      </button>
                    )}

                    {onIniciarAtendimento && (
                      <button
                        onClick={() => {
                          onIniciarAtendimento(ag);
                          onClose();
                        }}
                        className="px-3 py-1.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all"
                        title="Iniciar exame na bancada com este paciente"
                      >
                        <Camera className="w-3.5 h-3.5" />
                        <span>Atender</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Rodapé com Navegação */}
        <div className="p-4 sm:p-5 bg-slate-50 dark:bg-[#061514] border-t border-slate-200/60 dark:border-white/[0.08] flex items-center justify-between gap-3">
          {onNavegarParaCalendario ? (
            <button
              onClick={() => {
                onNavegarParaCalendario();
                onClose();
              }}
              className="text-xs font-semibold text-teal-700 dark:text-teal-400 hover:text-teal-900 dark:hover:text-teal-200 flex items-center gap-1 transition-colors"
            >
              <Calendar className="w-4 h-4" />
              <span>Ver no Calendário Completo</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          ) : <div />}

          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 dark:bg-teal-700 dark:hover:bg-teal-800 text-white text-xs font-bold transition-all shadow-sm"
          >
            Entendido, Fechar Lembrete
          </button>
        </div>
      </div>
    </div>
  );
};
