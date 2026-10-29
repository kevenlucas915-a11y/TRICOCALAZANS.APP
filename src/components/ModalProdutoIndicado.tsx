import React, { useState } from 'react';
import { X, Check, Sparkles, Pill, Eye, EyeOff } from 'lucide-react';
import { ProdutoIndicado } from '../types/portal';
import { salvarProdutoPaciente } from '../services/produtosPacienteService';

interface ModalProdutoIndicadoProps {
  pacienteId: string;
  pacienteUid?: string;
  profissionalUid: string;
  produtoEmEdicao?: ProdutoIndicado | null;
  onClose: () => void;
  onSucesso: (produto: ProdutoIndicado) => void;
}

export const ModalProdutoIndicado: React.FC<ModalProdutoIndicadoProps> = ({
  pacienteId,
  pacienteUid,
  profissionalUid,
  produtoEmEdicao,
  onClose,
  onSucesso
}) => {
  const [nome, setNome] = useState(produtoEmEdicao?.nome || '');
  const [comoUsar, setComoUsar] = useState(produtoEmEdicao?.comoUsar || '');
  const [observacao, setObservacao] = useState(produtoEmEdicao?.observacao || '');
  const [liberadoPaciente, setLiberadoPaciente] = useState(produtoEmEdicao?.liberadoPaciente ?? false);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const handleSalvar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim()) {
      setErro('Informe o nome do produto ou fórmula indicada.');
      return;
    }
    if (!comoUsar.trim()) {
      setErro('Informe as orientações de como usar / posologia.');
      return;
    }

    setSalvando(true);
    setErro(null);

    try {
      const salvo = await salvarProdutoPaciente({
        id: produtoEmEdicao?.id,
        pacienteId,
        pacienteUid,
        profissionalUid,
        nome,
        comoUsar,
        observacao,
        liberadoPaciente,
        createdAt: produtoEmEdicao?.createdAt
      });

      onSucesso(salvo);
      onClose();
    } catch (err: any) {
      setErro('Erro ao salvar indicação de produto.');
      setSalvando(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-md overflow-y-auto animate-fadeIn"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-md bg-white dark:bg-[#071918] rounded-3xl shadow-2xl border border-teal-200/80 dark:border-teal-500/30 overflow-hidden flex flex-col p-6 space-y-5 my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-teal-500/10 text-teal-700 dark:text-teal-300 flex items-center justify-center shrink-0">
              <Pill className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-teal-700 dark:text-teal-400 block">
                Prescrição & Cuidados Home Care
              </span>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                {produtoEmEdicao ? 'Editar Produto Indicado' : 'Indicar Novo Produto'}
              </h3>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full glass-button flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {erro && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-semibold">
            {erro}
          </div>
        )}

        <form onSubmit={handleSalvar} className="space-y-4 text-xs">
          <div className="space-y-1.5">
            <label className="font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[11px]">
              Nome do Produto / Fórmula: *
            </label>
            <input
              type="text"
              required
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex: Minoxidil 5% com Biotina ou Shampoo com Cetoconazol 2%"
              className="w-full glass-input py-2.5 px-3.5 text-xs text-slate-900 dark:text-white placeholder:text-slate-400"
            />
          </div>

          <div className="space-y-1.5">
            <label className="font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[11px]">
              Como Usar (Posologia & Frequência): *
            </label>
            <textarea
              required
              rows={3}
              value={comoUsar}
              onChange={(e) => setComoUsar(e.target.value)}
              placeholder="Ex: Aplicar 1ml (6 borrifadas) no couro cabeludo seco à noite, massageando suavemente com as pontas dos dedos."
              className="w-full glass-input py-2.5 px-3.5 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 resize-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[11px]">
              Observações & Avisos (Opcional):
            </label>
            <input
              type="text"
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              placeholder="Ex: Não enxaguar após a aplicação. Uso contínuo por 6 meses."
              className="w-full glass-input py-2.5 px-3.5 text-xs text-slate-900 dark:text-white placeholder:text-slate-400"
            />
          </div>

          {/* Chave Liberar para o Paciente */}
          <div className="p-3.5 rounded-2xl bg-teal-50/70 dark:bg-teal-950/30 border border-teal-200/70 dark:border-teal-800 flex items-center justify-between gap-3">
            <div className="space-y-0.5">
              <span className="font-bold text-slate-900 dark:text-white block text-xs">
                Liberar para o paciente no portal
              </span>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {liberadoPaciente 
                  ? 'Visível para o paciente no app dele com modo de uso' 
                  : 'Apenas para anotação interna do seu prontuário'}
              </p>
            </div>

            <button
              type="button"
              onClick={() => setLiberadoPaciente(!liberadoPaciente)}
              className={`p-2 rounded-xl transition-all flex items-center gap-1.5 font-bold text-xs shrink-0 ${
                liberadoPaciente
                  ? 'bg-teal-700 text-white shadow-xs'
                  : 'bg-slate-200 dark:bg-white/10 text-slate-500 dark:text-slate-400'
              }`}
            >
              {liberadoPaciente ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
              <span>{liberadoPaciente ? 'Liberado' : 'Oculto'}</span>
            </button>
          </div>

          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl glass-button text-xs font-semibold text-slate-500"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={salvando}
              className="px-5 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs flex items-center gap-1.5 shadow-md transition-all hover:scale-[1.01]"
            >
              <Check className="w-3.5 h-3.5" />
              <span>{salvando ? 'Salvando...' : produtoEmEdicao ? 'Atualizar Indicação' : 'Salvar Indicação'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
