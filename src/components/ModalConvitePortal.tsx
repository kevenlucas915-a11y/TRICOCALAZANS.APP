import React, { useState, useEffect } from 'react';
import { 
  X, 
  Check, 
  Copy, 
  Send, 
  Lock, 
  Crown, 
  Sparkles, 
  Clock, 
  UserCheck, 
  AlertCircle,
  ExternalLink,
  ShieldCheck,
  RefreshCw
} from 'lucide-react';
import { Paciente } from '../types/paciente';
import { UsuarioProfissional } from '../types/usuario';
import { ConvitePaciente } from '../types/portal';
import { gerarConvitePortal } from '../services/portalService';
import { profissionalTemAcessoPortal, NIVEL_MINIMO_PORTAL } from '../config/portalConfig';

interface ModalConvitePortalProps {
  paciente: Paciente;
  profissional: UsuarioProfissional | null;
  onClose: () => void;
  onNavegarParaPlanos?: () => void;
  onPacienteAtualizado?: (pacienteAtualizado: Paciente) => void;
}

export const ModalConvitePortal: React.FC<ModalConvitePortalProps> = ({
  paciente,
  profissional,
  onClose,
  onNavegarParaPlanos,
  onPacienteAtualizado
}) => {
  const temPermissaoPlano = profissionalTemAcessoPortal(profissional);
  const [carregando, setCarregando] = useState(false);
  const [copiado, setCopiado] = useState(false);
  const [linkGerado, setLinkGerado] = useState<string>('');
  const [conviteAtivo, setConviteAtivo] = useState<ConvitePaciente | null>(null);

  useEffect(() => {
    if (temPermissaoPlano && profissional) {
      handleGerarLinkInicial();
    }
  }, [paciente.id, temPermissaoPlano]);

  const handleGerarLinkInicial = async () => {
    if (!profissional) return;
    setCarregando(true);
    try {
      const { convite, linkAtivacao } = await gerarConvitePortal(paciente, profissional);
      setConviteAtivo(convite);
      setLinkGerado(linkAtivacao);
      if (onPacienteAtualizado) {
        onPacienteAtualizado({
          ...paciente,
          portalConviteToken: convite.token,
          portalConviteExpiraEm: convite.expiraEm
        });
      }
    } catch (err) {
      console.error('Erro ao gerar convite:', err);
    } finally {
      setCarregando(false);
    }
  };

  const handleCopiarLink = () => {
    if (!linkGerado) return;
    navigator.clipboard.writeText(linkGerado);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2500);
  };

  const handleEnviarWhatsApp = () => {
    if (!linkGerado) return;
    const nomeClinica = profissional?.nomeDoEspaco || profissional?.clinica || 'nosso consultório';
    const msg = `Olá, ${paciente.nome}! 👋\n\nCriei seu acesso exclusivo ao Portal do Paciente da ${nomeClinica} para você acompanhar a evolução do seu tratamento capilar, fotos e produtos indicados.\n\nAcesse o link abaixo para criar sua senha de acesso:\n👉 ${linkGerado}\n\n(Este link de ativação é seguro e tem validade de 7 dias).`;

    let urlWa = `https://wa.me/?text=${encodeURIComponent(msg)}`;
    if (paciente.telefone) {
      const nums = paciente.telefone.replace(/\D/g, '');
      if (nums.length >= 10) {
        const ddi = nums.startsWith('55') ? nums : `55${nums}`;
        urlWa = `https://wa.me/${ddi}?text=${encodeURIComponent(msg)}`;
      }
    }

    const link = document.createElement('a');
    link.href = urlWa;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex justify-center items-start p-3 sm:p-6 bg-slate-950/80 overflow-y-auto animate-fadeIn"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-lg bg-white dark:bg-[#071918] rounded-3xl shadow-2xl border border-teal-200/80 dark:border-teal-500/30 overflow-hidden flex flex-col p-6 space-y-5 my-4 sm:my-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabeçalho */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
              temPermissaoPlano 
                ? 'bg-teal-700 text-white shadow-md shadow-teal-700/25' 
                : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
            }`}>
              {temPermissaoPlano ? <Sparkles className="w-6 h-6" /> : <Lock className="w-6 h-6" />}
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-teal-700 dark:text-teal-400 block">
                Área do Cliente & Acompanhamento
              </span>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                Portal do Paciente
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

        {/* 1. CASO O PLANO DA PROFISSIONAL NÃO TENHA ACESSO (BLOQUEIO POR PLANO) */}
        {!temPermissaoPlano ? (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs space-y-2">
              <div className="flex items-center gap-1.5 font-bold text-amber-800 dark:text-amber-300">
                <Lock className="w-4 h-4" />
                <span>Recurso Exclusivo do Plano Anual (Apenas R$ 49,90/mês)</span>
              </div>
              <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                O <strong>envio de acesso à plataforma para os pacientes</strong> não está incluso no Plano Mensal. No <strong>Plano Anual</strong>, você libera acesso ilimitado para que seus pacientes acompanhem fotos de evolução, fórmulas e orientações pelo celular.
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-teal-50/70 dark:bg-teal-950/30 border border-teal-200/70 dark:border-teal-800 text-xs space-y-1.5">
              <span className="font-bold text-teal-800 dark:text-teal-300">Vantagens do Portal do Paciente no Plano Anual:</span>
              <ul className="space-y-1 text-slate-600 dark:text-slate-400 text-[11px] pl-1">
                <li>✓ Link exclusivo e seguro com envio direto para o WhatsApp do paciente</li>
                <li>✓ Espaço 100% somente leitura (sem alteração de dados clínicos)</li>
                <li>✓ Controle total: você escolhe exatamente quais fotos e evoluções o paciente visualiza</li>
                <li>✓ Máxima fidelização e percepção de autoridade do seu consultório</li>
              </ul>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl glass-button text-xs font-semibold text-slate-500"
              >
                Voltar
              </button>
              {onNavegarParaPlanos && (
                <button
                  onClick={() => {
                    onClose();
                    onNavegarParaPlanos();
                  }}
                  className="px-5 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs flex items-center gap-1.5 shadow-md transition-all hover:scale-[1.01]"
                >
                  <Crown className="w-4 h-4 text-amber-300" />
                  <span>Migrar para o Plano Anual (R$ 49,90/mês)</span>
                </button>
              )}
            </div>
          </div>
        ) : (
          /* 2. PROFISSIONAL TEM ACESSO LIBERADO: GERAR LINK E ENVIAR */
          <div className="space-y-4">
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 flex items-center justify-between text-xs">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Paciente:</span>
                <strong className="text-slate-900 dark:text-white font-bold text-sm">{paciente.nome}</strong>
              </div>
              {paciente.portalAtivo ? (
                <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold text-[10px] flex items-center gap-1 border border-emerald-500/20">
                  <UserCheck className="w-3 h-3" />
                  <span>Conta Ativa no Portal</span>
                </span>
              ) : (
                <span className="px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold text-[10px] flex items-center gap-1 border border-amber-500/20">
                  <Clock className="w-3 h-3" />
                  <span>Convite Pendente</span>
                </span>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center justify-between">
                <span>Link de Ativação do Paciente:</span>
                <span className="text-[10px] text-teal-700 dark:text-teal-400 font-normal">Validade: 7 dias</span>
              </label>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={carregando ? 'Gerando link seguro...' : linkGerado}
                  className="flex-1 glass-input py-2.5 px-3 text-xs font-mono text-slate-700 dark:text-slate-200 select-all"
                />
                <button
                  type="button"
                  onClick={handleCopiarLink}
                  disabled={carregando || !linkGerado}
                  className={`px-3.5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all shrink-0 ${
                    copiado 
                      ? 'bg-emerald-600 text-white shadow-md' 
                      : 'glass-button text-teal-700 dark:text-teal-400 hover:border-teal-500'
                  }`}
                  title="Copiar link de ativação"
                >
                  {copiado ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  <span>{copiado ? 'Copiado!' : 'Copiar'}</span>
                </button>
              </div>
            </div>

            {/* Instruções amigáveis */}
            <div className="p-3.5 rounded-2xl bg-teal-50/70 dark:bg-teal-950/30 border border-teal-200/70 dark:border-teal-800 text-xs space-y-1.5 text-slate-600 dark:text-slate-300">
              <div className="flex items-center gap-1.5 font-bold text-teal-800 dark:text-teal-300">
                <ShieldCheck className="w-4 h-4" />
                <span>Como funciona o primeiro acesso do paciente?</span>
              </div>
              <p className="text-[11px] leading-relaxed">
                Ao abrir o link seguro, o paciente confirmará o e-mail e criará a própria senha. A partir de então, poderá acessar sempre pelo endereço <strong>/area-do-cliente</strong> e visualizar apenas os conteúdos e fotos que você liberar.
              </p>
            </div>

            {/* Ações de envio */}
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3">
              <button
                type="button"
                onClick={handleGerarLinkInicial}
                disabled={carregando}
                className="text-xs text-slate-400 hover:text-teal-700 dark:hover:text-teal-300 flex items-center gap-1"
                title="Gera um novo token caso o anterior tenha expirado"
              >
                <RefreshCw className={`w-3 h-3 ${carregando ? 'animate-spin' : ''}`} />
                <span>Gerar novo link</span>
              </button>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl glass-button text-xs font-semibold text-slate-600 dark:text-slate-300"
                >
                  Fechar
                </button>
                <button
                  type="button"
                  onClick={handleEnviarWhatsApp}
                  disabled={carregando || !linkGerado}
                  className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-emerald-600/25 transition-all hover:scale-[1.01]"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Enviar por WhatsApp</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
