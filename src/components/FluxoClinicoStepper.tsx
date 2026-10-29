import React, { useState } from 'react';
import { 
  UserCheck, 
  Users, 
  FileText, 
  Camera, 
  ArrowRight, 
  ChevronRight, 
  Check, 
  UserX, 
  Sparkles,
  RefreshCw,
  ChevronUp,
  ChevronDown,
  Microscope
} from 'lucide-react';
import { Paciente } from '../types/paciente';

export interface FluxoClinicoStepperProps {
  passoAtual: 1 | 2 | 3 | 4 | null;
  pacienteAtivo: Paciente | { id: string; nome: string; telefone?: string; queixaPrincipal?: string } | null;
  onNavegarPasso: (passo: 1 | 2 | 3 | 4) => void;
  onTrocarPaciente: () => void;
  onLimparPacienteAtivo?: () => void;
  compacto?: boolean;
}

export const FluxoClinicoStepper: React.FC<FluxoClinicoStepperProps> = ({
  passoAtual,
  pacienteAtivo,
  onNavegarPasso,
  onTrocarPaciente,
  onLimparPacienteAtivo,
  compacto = false
}) => {
  const [recolhido, setRecolhido] = useState(false);

  const passos = [
    {
      numero: 1 as const,
      titulo: '1. Paciente',
      subtitulo: 'Cadastro & Prontuário',
      icone: Users,
      tela: 'pacientes'
    },
    {
      numero: 2 as const,
      titulo: '2. Anamnese',
      subtitulo: 'Ficha Clínica & Dados',
      icone: FileText,
      tela: 'anamnese'
    },
    {
      numero: 3 as const,
      titulo: '3. Fotos na Bancada',
      subtitulo: 'Registros por Área',
      icone: Camera,
      tela: 'captura'
    },
    {
      numero: 4 as const,
      titulo: '4. Contagem & Laudo',
      subtitulo: 'Fios, Óstios & Consulta',
      icone: Microscope,
      tela: 'captura'
    }
  ];

  if (recolhido) {
    return (
      <div className="w-full bg-teal-900/10 dark:bg-teal-950/30 border-b border-teal-500/20 px-3 sm:px-6 py-1.5 transition-all backdrop-blur-md flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="font-bold text-teal-900 dark:text-teal-200 text-[11px] uppercase tracking-wider">
            Fluxo Clínico:
          </span>
          {pacienteAtivo ? (
            <span className="font-semibold text-slate-800 dark:text-slate-200">
              {pacienteAtivo.nome}
            </span>
          ) : (
            <span className="text-slate-400">Nenhum paciente selecionado</span>
          )}
          <span className="text-slate-400 mx-1">·</span>
          <span className="text-teal-700 dark:text-teal-400 font-medium">
            Passo {passoAtual || 1} de 4
          </span>
        </div>

        <button
          type="button"
          onClick={() => setRecolhido(false)}
          className="text-[11px] text-teal-700 dark:text-teal-400 hover:underline flex items-center gap-1 font-semibold"
          title="Expandir barra de fluxo guiado"
        >
          <span>Expandir Fluxo</span>
          <ChevronDown className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div className="w-full bg-gradient-to-r from-teal-900/10 via-emerald-800/10 to-teal-800/5 dark:from-teal-950/40 dark:via-slate-900/60 dark:to-teal-950/20 border-b border-teal-500/20 px-3 sm:px-6 py-2 sm:py-2.5 transition-all backdrop-blur-md">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-2.5">
        
        {/* Lado Esquerdo: Paciente Ativo no Atendimento */}
        <div className="flex items-center justify-between sm:justify-start gap-2.5 shrink-0">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${pacienteAtivo ? 'bg-emerald-400 opacity-75' : 'bg-amber-400 opacity-75'}`}></span>
              <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${pacienteAtivo ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
            </span>
            <span className="text-[11px] font-bold uppercase tracking-wider text-teal-900 dark:text-teal-200">
              Fluxo Clínico:
            </span>
          </div>

          {pacienteAtivo ? (
            <div className="flex items-center gap-2 bg-white/80 dark:bg-slate-900/90 border border-teal-500/30 px-2.5 py-1 rounded-xl shadow-xs">
              <div className="w-5 h-5 rounded-md bg-teal-700 text-white flex items-center justify-center text-[10px] font-bold">
                {pacienteAtivo.nome.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 max-w-[130px] sm:max-w-[180px]">
                <p className="text-xs font-bold text-slate-900 dark:text-white truncate leading-tight">
                  {pacienteAtivo.nome}
                </p>
              </div>
              <button
                type="button"
                onClick={onTrocarPaciente}
                className="text-[10px] font-semibold text-teal-700 dark:text-teal-400 hover:text-teal-900 dark:hover:text-teal-200 hover:underline flex items-center gap-0.5 ml-1"
                title="Trocar paciente em atendimento"
              >
                <RefreshCw className="w-2.5 h-2.5" />
                <span>Trocar</span>
              </button>
              {onLimparPacienteAtivo && (
                <button
                  type="button"
                  onClick={onLimparPacienteAtivo}
                  className="text-slate-400 hover:text-rose-500 p-0.5 ml-0.5"
                  title="Finalizar atendimento deste paciente"
                >
                  <UserX className="w-3 h-3" />
                </button>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-1.5 bg-amber-50/80 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 px-2.5 py-1 rounded-xl">
              <span className="text-[11px] text-amber-800 dark:text-amber-300 font-medium">
                Nenhum paciente selecionado
              </span>
              <button
                type="button"
                onClick={() => onNavegarPasso(1)}
                className="text-[10px] font-bold text-amber-900 dark:text-amber-200 underline ml-1 hover:text-amber-700"
              >
                Selecionar (Passo 1)
              </button>
            </div>
          )}
        </div>

        {/* Centro/Direita: Stepper Visual com os 3 passos interligados */}
        <div className="flex items-center justify-between sm:justify-end gap-1.5 sm:gap-2.5 overflow-x-auto py-0.5">
          {passos.map((passo, idx) => {
            const isAtivo = passoAtual === passo.numero;
            const isConcluido = passoAtual !== null && passoAtual > passo.numero;

            return (
              <React.Fragment key={passo.numero}>
                <button
                  type="button"
                  onClick={() => onNavegarPasso(passo.numero)}
                  className={`group flex items-center gap-1.5 sm:gap-2 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                    isAtivo
                      ? 'bg-teal-700 text-white shadow-md shadow-teal-700/25 ring-2 ring-teal-500/40'
                      : isConcluido
                        ? 'bg-teal-500/15 dark:bg-teal-500/20 text-teal-800 dark:text-teal-300 hover:bg-teal-500/25 border border-teal-500/30'
                        : 'bg-white/60 dark:bg-slate-900/60 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 border border-slate-200/80 dark:border-slate-800'
                  }`}
                  title={`Ir para o ${passo.titulo} (${passo.subtitulo})`}
                >
                  <div className={`w-4 h-4 sm:w-5 sm:h-5 rounded-md sm:rounded-lg flex items-center justify-center text-[10px] font-bold shrink-0 transition-transform group-hover:scale-105 ${
                    isAtivo
                      ? 'bg-white text-teal-800 shadow-xs'
                      : isConcluido
                        ? 'bg-teal-700 text-white'
                        : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                  }`}>
                    {isConcluido ? <Check className="w-3 h-3 stroke-[3]" /> : passo.numero}
                  </div>

                  <div className="text-left">
                    <p className="leading-tight text-xs font-bold whitespace-nowrap">
                      {passo.titulo.replace(/^\d+\.\s*/, '')}
                    </p>
                    <p className={`text-[9px] hidden lg:block leading-none ${isAtivo ? 'text-teal-100' : 'text-slate-400 dark:text-slate-500'}`}>
                      {passo.subtitulo}
                    </p>
                  </div>
                </button>

                {/* Seta conectora entre os passos */}
                {idx < passos.length - 1 && (
                  <ChevronRight className={`w-3.5 h-3.5 shrink-0 ${
                    passoAtual !== null && passoAtual > passo.numero 
                      ? 'text-teal-600 dark:text-teal-400' 
                      : 'text-slate-300 dark:text-slate-700'
                  }`} />
                )}
              </React.Fragment>
            );
          })}

          {/* Botão de Avanço Rápido para a Próxima Etapa */}
          {passoAtual === 1 && (
            <button
              type="button"
              onClick={() => onNavegarPasso(2)}
              className="hidden sm:flex items-center gap-1 px-3 py-1.5 rounded-xl bg-teal-800 hover:bg-teal-900 text-white text-xs font-bold shadow-xs hover:scale-[1.02] transition-all ml-1"
            >
              <span>Anamnese (Passo 2)</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          )}

          {passoAtual === 2 && (
            <button
              type="button"
              onClick={() => onNavegarPasso(3)}
              className="hidden sm:flex items-center gap-1 px-3 py-1.5 rounded-xl bg-teal-800 hover:bg-teal-900 text-white text-xs font-bold shadow-xs hover:scale-[1.02] transition-all ml-1"
            >
              <span>Registrar Fotos (Passo 3)</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          )}

          {passoAtual === 3 && (
            <button
              type="button"
              onClick={() => onNavegarPasso(4)}
              className="hidden sm:flex items-center gap-1 px-3 py-1.5 rounded-xl bg-teal-800 hover:bg-teal-900 text-white text-xs font-bold shadow-xs hover:scale-[1.02] transition-all ml-1"
            >
              <span>Contagem & Laudo (Passo 4)</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          )}

          {passoAtual === 4 && (
            <button
              type="button"
              onClick={() => onNavegarPasso(1)}
              className="hidden sm:flex items-center gap-1 px-3 py-1.5 rounded-xl bg-teal-800 hover:bg-teal-900 text-white text-xs font-bold shadow-xs hover:scale-[1.02] transition-all ml-1"
            >
              <span>Prontuário (Passo 1)</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          )}

          {/* Botão para recolher/minimizar */}
          <button
            type="button"
            onClick={() => setRecolhido(true)}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors ml-1"
            title="Recolher barra do fluxo guiado"
          >
            <ChevronUp className="w-3.5 h-3.5" />
          </button>
        </div>

      </div>
    </div>
  );
};
