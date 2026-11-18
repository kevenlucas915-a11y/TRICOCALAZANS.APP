import React, { useState, useEffect } from 'react';
import { 
  X, 
  Gift, 
  Sparkles, 
  Copy, 
  Check, 
  Share2, 
  Percent, 
  Clock, 
  Users, 
  Calendar,
  MessageCircle,
  ExternalLink,
  Crown
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { 
  buscarMinhasIndicacoes, 
  gerarLinkIndicacaoKiwify, 
  gerarMensagemWhatsApp 
} from '../services/indicacoesService.ts';
import type { MetricasIndicadorUsuario } from '../types/indicacoes.ts';

interface ModalIndiqueGanheProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ModalIndiqueGanhe: React.FC<ModalIndiqueGanheProps> = ({
  isOpen,
  onClose
}) => {
  const { usuarioAtual } = useAuth();
  const [planoEscolhido, setPlanoEscolhido] = useState<'mensal' | 'anual'>('mensal');
  const [carregando, setCarregando] = useState(false);
  const [linkCopiado, setLinkCopiado] = useState(false);
  const [cupomCopiado, setCupomCopiado] = useState(false);
  const [metricas, setMetricas] = useState<MetricasIndicadorUsuario>({
    totalIndicados: 0,
    diasGanhosTotal: 0,
    ehInfluenciador: false,
    porcentagemDesconto: 10,
    codigoCupom: 'TRICO10',
    historico: []
  });

  useEffect(() => {
    if (isOpen && usuarioAtual?.email) {
      carregarMetricas();
    }
  }, [isOpen, usuarioAtual?.email]);

  const carregarMetricas = async () => {
    if (!usuarioAtual?.email) return;
    setCarregando(true);
    try {
      const dados = await buscarMinhasIndicacoes(usuarioAtual.email);
      setMetricas(dados);
    } catch (e) {
      console.warn('Erro ao carregar métricas:', e);
    } finally {
      setCarregando(false);
    }
  };

  const linkKiwify = gerarLinkIndicacaoKiwify(
    planoEscolhido,
    metricas.codigoCupom,
    usuarioAtual?.email || ''
  );

  const handleCopiarLink = () => {
    navigator.clipboard.writeText(linkKiwify);
    setLinkCopiado(true);
    setTimeout(() => setLinkCopiado(false), 3000);
  };

  const handleCopiarCupom = () => {
    navigator.clipboard.writeText(metricas.codigoCupom);
    setCupomCopiado(true);
    setTimeout(() => setCupomCopiado(false), 3000);
  };

  const handleCompartilharWhatsApp = () => {
    const texto = gerarMensagemWhatsApp(
      usuarioAtual?.nome || 'Colega',
      metricas.porcentagemDesconto,
      metricas.codigoCupom,
      linkKiwify
    );
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(texto)}`;
    window.open(url, '_blank');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 border border-teal-200/60 dark:border-teal-500/20 rounded-3xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
        
        {/* Cabeçalho */}
        <div className="px-6 py-5 border-b border-slate-200/70 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-teal-50/70 via-white to-emerald-50/40 dark:from-slate-900 dark:via-slate-900 dark:to-teal-950/20">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center text-white shadow-lg shadow-teal-500/25">
              {metricas.ehInfluenciador ? <Crown className="w-6 h-6" /> : <Gift className="w-6 h-6" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                  {metricas.ehInfluenciador ? 'Painel de Parceiro Oficial' : 'Indique e Ganhe Meses Grátis'}
                </h2>
                {metricas.ehInfluenciador && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400">
                    VIP Influencer
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Seus colegas ganham <strong className="text-teal-700 dark:text-teal-300 font-bold">{metricas.porcentagemDesconto}% de desconto</strong> e você ganha <strong className="text-teal-700 dark:text-teal-300 font-bold">+30 dias</strong> de acesso!
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Corpo do Modal */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* Card de Estatísticas do Usuário */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3.5 rounded-2xl bg-teal-50/60 dark:bg-slate-800/60 border border-teal-200/50 dark:border-teal-500/20 text-center">
              <span className="text-[11px] font-semibold text-slate-500 block mb-0.5">Indicados</span>
              <div className="text-xl font-extrabold text-teal-800 dark:text-teal-300 flex items-center justify-center gap-1">
                <Users className="w-4 h-4 text-teal-600" />
                {metricas.totalIndicados}
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-emerald-50/60 dark:bg-slate-800/60 border border-emerald-200/50 dark:border-emerald-500/20 text-center">
              <span className="text-[11px] font-semibold text-slate-500 block mb-0.5">Dias Ganhos</span>
              <div className="text-xl font-extrabold text-emerald-800 dark:text-emerald-300 flex items-center justify-center gap-1">
                <Clock className="w-4 h-4 text-emerald-600" />
                +{metricas.diasGanhosTotal}d
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-cyan-50/60 dark:bg-slate-800/60 border border-cyan-200/50 dark:border-cyan-500/20 text-center">
              <span className="text-[11px] font-semibold text-slate-500 block mb-0.5">Seu Desconto</span>
              <div className="text-xl font-extrabold text-cyan-800 dark:text-cyan-300 flex items-center justify-center gap-1">
                <Percent className="w-4 h-4 text-cyan-600" />
                {metricas.porcentagemDesconto}%
              </div>
            </div>
          </div>

          {/* Seletor de Plano para o Link */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
              <span>Selecione o plano que deseja indicar:</span>
              <span className="text-[11px] text-teal-700 dark:text-teal-400 font-semibold">
                Cupom: <span className="font-mono font-bold">{metricas.codigoCupom}</span>
              </span>
            </label>
            <div className="grid grid-cols-2 p-1 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setPlanoEscolhido('mensal')}
                className={`py-2 text-xs font-bold rounded-xl transition-all ${
                  planoEscolhido === 'mensal'
                    ? 'bg-white dark:bg-slate-900 text-teal-800 dark:text-teal-300 shadow-sm'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Plano Mensal (Recorrente)
              </button>
              <button
                type="button"
                onClick={() => setPlanoEscolhido('anual')}
                className={`py-2 text-xs font-bold rounded-xl transition-all ${
                  planoEscolhido === 'anual'
                    ? 'bg-white dark:bg-slate-900 text-teal-800 dark:text-teal-300 shadow-sm'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Plano Anual (Maior Desconto)
              </button>
            </div>
          </div>

          {/* Link de Checkout Gerado com Rastreamento */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
              Seu link exclusivo da Kiwify (já inclui seu cupom e identificador):
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={linkKiwify}
                className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono text-xs text-slate-700 dark:text-slate-300 select-all outline-none truncate"
              />
              <button
                onClick={handleCopiarLink}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
                  linkCopiado
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white text-white dark:text-slate-900 shadow-md'
                }`}
              >
                {linkCopiado ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {linkCopiado ? 'Copiado!' : 'Copiar Link'}
              </button>
            </div>
          </div>

          {/* Botão de Destaque: Compartilhar no WhatsApp */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-transparent border border-emerald-500/30 space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-md shadow-emerald-500/20">
                <MessageCircle className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                  Envie direto para colegas no WhatsApp
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Um clique para abrir seu WhatsApp com o convite profissional já formatado e seu cupom de {metricas.porcentagemDesconto}% OFF aplicado.
                </p>
              </div>
            </div>

            <button
              onClick={handleCompartilharWhatsApp}
              className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold shadow-lg shadow-emerald-600/25 flex items-center justify-center gap-2 transition-all hover:scale-[1.01]"
            >
              <MessageCircle className="w-4 h-4" />
              Compartilhar Convite no WhatsApp
            </button>
          </div>

          {/* Histórico do Usuário */}
          {metricas.historico && metricas.historico.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Suas Indicações Convertidas:
              </h4>
              <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                {metricas.historico.map(item => (
                  <div key={item.id} className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-800 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-semibold text-slate-900 dark:text-white block">
                        {item.indicadoNome || item.indicadoEmail}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {new Date(item.data).toLocaleDateString('pt-BR')} • Plano {item.planoId}
                      </span>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
                      +{item.diasConcedidos} dias
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

