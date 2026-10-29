import React, { useState } from 'react';
import { 
  X, 
  Check, 
  CreditCard, 
  QrCode, 
  Barcode, 
  ShieldCheck, 
  Sparkles, 
  Copy, 
  CheckCircle2, 
  Lock, 
  Clock, 
  AlertCircle,
  Zap,
  ArrowRight,
  Settings
} from 'lucide-react';
import { PlanoConfig, CicloCobranca, MetodoPagamento } from '../types/assinatura';
import { useAuth } from '../context/AuthContext';
import { ModalConfigurarStripe } from './ModalConfigurarStripe';

interface CheckoutModalProps {
  plano: PlanoConfig;
  cicloInicial?: CicloCobranca;
  onClose: () => void;
  onSucesso: (plano: PlanoConfig, ciclo: CicloCobranca) => void;
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
  plano,
  cicloInicial = 'anual',
  onClose,
  onSucesso
}) => {
  const { atualizarAssinatura, usuarioAtual } = useAuth();
  const [ciclo, setCiclo] = useState<CicloCobranca>(cicloInicial);
  const [metodo, setMetodo] = useState<MetodoPagamento>('pix');
  const [carregando, setCarregando] = useState<boolean>(false);
  const [concluido, setConcluido] = useState<boolean>(false);
  const [copiadoPix, setCopiadoPix] = useState<boolean>(false);
  const [erro, setErro] = useState<string | null>(null);
  const [stripeConfig, setStripeConfig] = useState<{ configured: boolean; mode: string; mensagem?: string } | null>(null);
  const [urlCheckoutStripe, setUrlCheckoutStripe] = useState<string | null>(null);
  const [modalConfigStripeAberto, setModalConfigStripeAberto] = useState<boolean>(false);

  // Carrega configuração de integração da Stripe no servidor
  React.useEffect(() => {
    fetch('/api/stripe/config')
      .then(res => res.json())
      .then(dados => setStripeConfig(dados))
      .catch(() => setStripeConfig({ configured: false, mode: 'simulator' }));
  }, [modalConfigStripeAberto]);

  // Formulário do Cartão
  const [numeroCartao, setNumeroCartao] = useState<string>('•••• •••• •••• 4242');
  const [nomeTitular, setNomeTitular] = useState<string>(usuarioAtual?.nome || 'Dra. Mariana Silva');
  const [validade, setValidade] = useState<string>('12/28');
  const [cvv, setCvv] = useState<string>('888');
  const [parcelas, setParcelas] = useState<number>(ciclo === 'anual' ? 12 : 1);

  const valorTotal = ciclo === 'anual' ? 598.80 : 69.90;
  const valorMensalEquivalente = ciclo === 'anual' ? 49.90 : 69.90;
  const valorParcela = ciclo === 'anual' ? (598.80 / parcelas) : 69.90;

  const codigoPixSimulado = `00020126580014br.gov.bcb.pix0136${Math.random().toString(36).substring(2, 14)}-tricocalazans520400005303986540${valorTotal.toFixed(2)}5802BR5925TRICOCALAZANS DIGITAL6009SAO PAULO62070503***6304`;

  const handleCopiarPix = () => {
    navigator.clipboard.writeText(codigoPixSimulado);
    setCopiadoPix(true);
    setTimeout(() => setCopiadoPix(false), 2500);
  };

  const handleFinalizar = async () => {
    setCarregando(true);
    setErro(null);

    try {
      const planoEfetivoId = ciclo === 'anual' ? 'anual' : 'mensal';

      // 1. Comunicação com a API Stripe no backend
      let sessaoUrl: string | null = null;
      try {
        const resp = await fetch('/api/stripe/create-checkout-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            planoId: planoEfetivoId,
            metodoPagamento: metodo === 'pix' ? 'pix' : 'all',
            usuarioUid: usuarioAtual?.uid,
            usuarioEmail: usuarioAtual?.email,
            usuarioNome: usuarioAtual?.nome
          })
        });

        if (resp.ok) {
          const dados = await resp.json();
          if (dados.url) {
            sessaoUrl = dados.url;
            setUrlCheckoutStripe(dados.url);
          }
        }
      } catch (errApi) {
        console.warn('Aviso ao consultar endpoint Stripe:', errApi);
      }

      // Se retornou URL de checkout oficial da Stripe (chave real ativa)
      if (sessaoUrl) {
        try {
          if (window.top && window.top !== window) {
            window.top.location.href = sessaoUrl;
          } else {
            window.location.href = sessaoUrl;
          }
        } catch {
          window.location.href = sessaoUrl;
        }
        return;
      }

      // 2. Conclui e atualiza a assinatura do profissional no Firestore e estado local (modo simulação/sandbox)
      await atualizarAssinatura(planoEfetivoId, ciclo, metodo);
      setConcluido(true);
      setTimeout(() => {
        onSucesso(plano, ciclo);
      }, 1600);
    } catch {
      setErro('Ocorreu um erro ao processar sua assinatura. Tente novamente.');
      setCarregando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-start pt-6 sm:pt-10 p-3 sm:p-6 bg-slate-950/75 backdrop-blur-md overflow-y-auto overscroll-contain animate-fadeIn">
      <div 
        className="w-full max-w-2xl bg-white dark:bg-[#071918] rounded-3xl shadow-2xl border border-teal-200/80 dark:border-teal-500/30 overflow-hidden flex flex-col mb-8 sm:mb-12 max-h-[88vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabeçalho do Checkout */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-teal-800 via-teal-700 to-teal-900 text-white flex items-center justify-between relative overflow-hidden shrink-0">
          <div className="absolute right-0 top-0 translate-x-12 -translate-y-6 w-48 h-48 bg-white/10 rounded-full blur-2xl pointer-events-none" />
          <div className="relative z-10">
            <div className="flex items-center gap-2 text-teal-200 text-xs font-semibold uppercase tracking-wider mb-1">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Checkout Seguro & Protegido</span>
              {stripeConfig?.configured ? (
                <button
                  type="button"
                  onClick={() => setModalConfigStripeAberto(true)}
                  className="ml-2 text-[10px] bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 px-2.5 py-0.5 rounded-full font-bold border border-emerald-400/30 flex items-center gap-1 transition-colors cursor-pointer"
                  title="Gerenciar chaves e conexão Stripe"
                >
                  <span>● Stripe {stripeConfig.mode === 'live' ? 'Produção' : 'Testes'}</span>
                  <Settings className="w-2.5 h-2.5 opacity-80" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setModalConfigStripeAberto(true)}
                  className="ml-2 text-[10px] bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 px-2.5 py-0.5 rounded-full font-bold border border-amber-400/30 flex items-center gap-1 transition-colors cursor-pointer"
                  title="Configurar chaves oficiais da Stripe"
                >
                  <span>Modo Sandbox</span>
                  <span className="underline ml-0.5 text-amber-300 font-extrabold">⚙️ Configurar Stripe</span>
                </button>
              )}
            </div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight">
              Assinatura do Plano {plano.nome}
            </h2>
            <p className="text-xs text-teal-100/90 mt-0.5">
              Ativação imediata de todos os recursos clínicos da plataforma.
            </p>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all relative z-10 shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {concluido ? (
          /* Estado de Conclusão e Sucesso */
          <div className="p-8 sm:p-12 text-center space-y-4 my-auto animate-fadeIn">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center border-2 border-emerald-500/40">
              <CheckCircle2 className="w-10 h-10 animate-bounce" />
            </div>
            <div className="space-y-1">
              <h3 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
                Assinatura Ativada com Sucesso!
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                Parabéns! Sua conta foi atualizada para o <strong className="text-teal-700 dark:text-teal-300">{plano.nome}</strong>. Todos os limites e ferramentas já estão liberados no seu painel.
              </p>
            </div>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 text-teal-700 dark:text-teal-300 text-xs font-semibold">
              <Zap className="w-4 h-4 text-amber-500" />
              <span>Prontuários e anamneses desbloqueados</span>
            </div>
          </div>
        ) : (
          /* Formulário de Checkout */
          <div className="p-5 sm:p-7 overflow-y-auto space-y-6">
            {/* Alternador de Ciclo: Mensal Avulso vs Anual com Desconto */}
            <div className="p-1.5 rounded-2xl glass-card border border-teal-200/60 dark:border-teal-500/20 flex flex-col sm:flex-row items-center gap-1.5">
              <button
                type="button"
                onClick={() => { setCiclo('anual'); setParcelas(12); }}
                className={`w-full sm:flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                  ciclo === 'anual'
                    ? 'bg-teal-700 text-white shadow-md'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <span>Plano Anual (Recomendado)</span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                  ciclo === 'anual' ? 'bg-amber-400 text-slate-950' : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                }`}>
                  Economize {plano.economiaAnualPercentual || 65}%
                </span>
              </button>

              <button
                type="button"
                onClick={() => { setCiclo('mensal'); setParcelas(1); }}
                className={`w-full sm:flex-1 py-2.5 px-3 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-2 ${
                  ciclo === 'mensal'
                    ? 'bg-teal-700 text-white shadow-md'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <span>Assinar Apenas o Mês</span>
                <span className="text-[10px] text-amber-500 font-bold">Avulso</span>
              </button>
            </div>

            {/* Aviso quando o usuário opta por assinar apenas o mês */}
            {ciclo === 'mensal' ? (
              <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-xs space-y-1.5 animate-fadeIn">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-amber-800 dark:text-amber-300">
                    Apenas 1 Mês (Mensal Avulso de 30 dias)
                  </span>
                  <button
                    type="button"
                    onClick={() => { setCiclo('anual'); setParcelas(12); }}
                    className="text-[11px] font-bold text-teal-700 dark:text-teal-400 hover:underline"
                  >
                    Mudar para Anual e Economizar {plano.economiaAnualPercentual || 50}% →
                  </button>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                  Você está assinando o plano por <strong>30 dias de acesso sem fidelidade</strong> (R$ 69,90/mês). No Plano Anual você paga o equivalente a apenas <strong>R$ 49,90/mês</strong> em 12x e ainda inclui o Envio de Acesso ao Portal do Paciente.
                </p>
              </div>
            ) : null}

            {/* Resumo de Preço e Benefício */}
            <div className="p-4 rounded-2xl bg-teal-50/60 dark:bg-teal-950/20 border border-teal-200/70 dark:border-teal-900/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Investimento:</span>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl sm:text-3xl font-extrabold text-teal-800 dark:text-teal-300">
                    R$ {valorMensalEquivalente.toFixed(2).replace('.', ',')}
                  </span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">/mês</span>
                </div>
                {ciclo === 'anual' ? (
                  <p className="text-[11px] text-teal-700 dark:text-teal-400 font-semibold mt-0.5">
                    Faturado anualmente: R$ 598,80 (em até 12x de R$ {(598.80 / parcelas).toFixed(2).replace('.', ',')} sem juros no cartão ou no PIX)
                  </p>
                ) : (
                  <p className="text-[11px] text-amber-700 dark:text-amber-400 font-medium mt-0.5">
                    Total mensal: R$ 69,90 por 30 dias de acesso
                  </p>
                )}
              </div>

              <div className="space-y-1 sm:text-right">
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold uppercase tracking-wider block">
                  ✓ Sem carência · Cancele quando quiser
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
                  Emissão automática de Nota Fiscal para dedução médica
                </span>
              </div>
            </div>

            {/* Seleção do Método de Pagamento */}
            <div className="space-y-3">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                <CreditCard className="w-3.5 h-3.5 text-teal-700 dark:text-teal-400" />
                <span>Forma de Pagamento</span>
              </label>

              <div className="grid grid-cols-3 gap-2.5">
                <button
                  type="button"
                  onClick={() => setMetodo('pix')}
                  className={`p-3 rounded-2xl border text-center transition-all flex flex-col items-center gap-1.5 ${
                    metodo === 'pix'
                      ? 'border-teal-600 bg-teal-500/10 text-teal-800 dark:text-teal-300 ring-2 ring-teal-600/30'
                      : 'border-slate-200 dark:border-white/10 hover:border-slate-300 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <QrCode className="w-5 h-5 text-teal-700 dark:text-teal-400" />
                  <span className="text-xs font-bold">PIX</span>
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">Imediato</span>
                </button>

                <button
                  type="button"
                  onClick={() => setMetodo('cartao')}
                  className={`p-3 rounded-2xl border text-center transition-all flex flex-col items-center gap-1.5 ${
                    metodo === 'cartao'
                      ? 'border-teal-600 bg-teal-500/10 text-teal-800 dark:text-teal-300 ring-2 ring-teal-600/30'
                      : 'border-slate-200 dark:border-white/10 hover:border-slate-300 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <CreditCard className="w-5 h-5 text-teal-700 dark:text-teal-400" />
                  <span className="text-xs font-bold">Cartão</span>
                  <span className="text-[10px] text-slate-400">Até 12x</span>
                </button>

                <button
                  type="button"
                  onClick={() => setMetodo('boleto')}
                  className={`p-3 rounded-2xl border text-center transition-all flex flex-col items-center gap-1.5 ${
                    metodo === 'boleto'
                      ? 'border-teal-600 bg-teal-500/10 text-teal-800 dark:text-teal-300 ring-2 ring-teal-600/30'
                      : 'border-slate-200 dark:border-white/10 hover:border-slate-300 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <Barcode className="w-5 h-5 text-teal-700 dark:text-teal-400" />
                  <span className="text-xs font-bold">Boleto</span>
                  <span className="text-[10px] text-slate-400">À vista</span>
                </button>
              </div>
            </div>

            {/* 1. FLUXO PIX */}
            {metodo === 'pix' && (
              <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-white/10 space-y-4 animate-fadeIn">
                <div className="flex flex-col sm:flex-row items-center gap-4">
                  {/* QR Code Simulado Elegante */}
                  <div className="p-3 bg-white rounded-2xl shadow-sm border border-slate-200 shrink-0">
                    <div className="w-32 h-32 relative flex items-center justify-center bg-slate-900 rounded-lg p-2">
                      <div className="grid grid-cols-6 gap-1 w-full h-full p-1 bg-white rounded">
                        {Array.from({ length: 36 }).map((_, i) => (
                          <div 
                            key={i} 
                            className={`rounded-[1px] ${
                              (i % 2 === 0 || i % 7 === 0 || i < 6 || i > 29) 
                                ? 'bg-slate-900' 
                                : 'bg-transparent'
                            }`} 
                          />
                        ))}
                      </div>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-8 h-8 rounded-lg bg-teal-700 text-white flex items-center justify-center shadow-md">
                          <QrCode className="w-4 h-4" />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 text-center sm:text-left flex-1 min-w-0">
                    <div className="flex items-center justify-center sm:justify-start gap-1.5 text-emerald-600 dark:text-emerald-400 text-xs font-bold">
                      <Clock className="w-3.5 h-3.5" />
                      <span>QR Code válido por 30 minutos</span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                      Abra o aplicativo do seu banco, escolha <strong>Pagar via Pix</strong> e escaneie o código acima ou utilize o código Copia e Cola.
                    </p>
                    <button
                      type="button"
                      onClick={handleCopiarPix}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold shadow-xs transition-all"
                    >
                      {copiadoPix ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiadoPix ? 'Código Pix Copiado!' : 'Copiar Código Pix'}</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* 2. FLUXO CARTÃO DE CRÉDITO */}
            {metodo === 'cartao' && (
              <div className="space-y-3 p-4 sm:p-5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-white/10 animate-fadeIn">
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Número do Cartão de Crédito
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setNumeroCartao('4242 4242 4242 4242');
                        setNomeTitular(usuarioAtual?.nome || 'Dra. Mariana Silva');
                        setValidade('12/28');
                        setCvv('123');
                      }}
                      className="text-[10px] text-teal-700 dark:text-teal-300 font-bold hover:underline flex items-center gap-1"
                      title="Preencher com cartão de testes da Stripe"
                    >
                      <span>Usar Cartão Teste (4242...)</span>
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type="text"
                      value={numeroCartao}
                      onChange={(e) => setNumeroCartao(e.target.value)}
                      placeholder="0000 0000 0000 0000"
                      className="w-full glass-input px-3.5 py-2 text-xs text-slate-900 dark:text-white font-mono"
                    />
                    <CreditCard className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Nome Completo do Titular
                  </label>
                  <input
                    type="text"
                    value={nomeTitular}
                    onChange={(e) => setNomeTitular(e.target.value)}
                    placeholder="Como impresso no cartão"
                    className="w-full glass-input px-3.5 py-2 text-xs text-slate-900 dark:text-white uppercase"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Validade (MM/AA)
                    </label>
                    <input
                      type="text"
                      value={validade}
                      onChange={(e) => setValidade(e.target.value)}
                      placeholder="12/28"
                      className="w-full glass-input px-3.5 py-2 text-xs text-slate-900 dark:text-white font-mono"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Código CVV
                    </label>
                    <input
                      type="password"
                      value={cvv}
                      onChange={(e) => setCvv(e.target.value)}
                      placeholder="123"
                      maxLength={4}
                      className="w-full glass-input px-3.5 py-2 text-xs text-slate-900 dark:text-white font-mono"
                    />
                  </div>
                </div>

                {ciclo === 'anual' && (
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Parcelamento no Cartão
                    </label>
                    <select
                      value={parcelas}
                      onChange={(e) => setParcelas(Number(e.target.value))}
                      className="w-full glass-input px-3.5 py-2 text-xs text-slate-900 dark:text-white font-medium"
                    >
                      <option value={1}>1x de R$ {plano.precoAnual.toFixed(2).replace('.', ',')} à vista</option>
                      <option value={3}>3x de R$ {(plano.precoAnual / 3).toFixed(2).replace('.', ',')} sem juros</option>
                      <option value={6}>6x de R$ {(plano.precoAnual / 6).toFixed(2).replace('.', ',')} sem juros</option>
                      <option value={10}>10x de R$ {(plano.precoAnual / 10).toFixed(2).replace('.', ',')} sem juros</option>
                      <option value={12}>12x de R$ {(plano.precoAnual / 12).toFixed(2).replace('.', ',')} sem juros (Recomendado)</option>
                    </select>
                  </div>
                )}
              </div>
            )}

            {/* 3. FLUXO BOLETO BANCÁRIO */}
            {metodo === 'boleto' && (
              <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-white/10 space-y-3 animate-fadeIn">
                <div className="flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400 font-semibold">
                  <Clock className="w-4 h-4 shrink-0" />
                  <span>Compensação bancária em até 1 a 2 dias úteis</span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  O boleto bancário será gerado com vencimento em 3 dias úteis. Para liberação instantânea sem esperar compensação, recomendamos o pagamento via <strong>PIX</strong>.
                </p>
                <div className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-white/10 font-mono text-[11px] text-slate-800 dark:text-slate-200 truncate">
                  34191.79001 01043.510047 91020.150008 8 984500000{Math.floor(valorTotal * 100)}
                </div>
              </div>
            )}

            {urlCheckoutStripe && (
              <div className="p-3 rounded-2xl bg-teal-50 dark:bg-teal-950/60 border border-teal-300 dark:border-teal-700 flex items-center justify-between gap-3 text-xs">
                <span className="text-teal-900 dark:text-teal-200 font-medium">
                  Se a janela do Stripe não abrir automaticamente:
                </span>
                <a
                  href={urlCheckoutStripe}
                  target="_top"
                  className="px-3 py-1.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold shrink-0 transition-colors shadow-xs"
                >
                  Abrir Checkout Stripe ↗
                </a>
              </div>
            )}

            {erro && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{erro}</span>
              </div>
            )}

            {/* Selo de Garantia e Segurança */}
            <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-200/50 dark:border-white/10 flex-wrap gap-2">
              <span className="flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-teal-700 dark:text-teal-400" />
                <span>Segurança SSL 256-Bit</span>
              </span>
              <span className="flex items-center gap-1.5 font-semibold text-teal-800 dark:text-teal-300">
                <CreditCard className="w-3.5 h-3.5 text-teal-600" />
                <span>Processado via Stripe (Pix & Cartão)</span>
              </span>
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-teal-700 dark:text-teal-400" />
                <span>Garantia de 7 dias</span>
              </span>
            </div>
          </div>
        )}

        {/* Rodapé de Ação */}
        {!concluido && (
          <div className="p-4 sm:p-5 bg-slate-50/70 dark:bg-white/[0.02] border-t border-slate-200/80 dark:border-white/[0.08] flex items-center justify-between gap-3 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl glass-button text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            >
              Cancelar
            </button>

            <button
              type="button"
              disabled={carregando}
              onClick={handleFinalizar}
              className="px-6 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-teal-700/20 transition-all hover:scale-[1.01] disabled:opacity-50"
            >
              {carregando ? (
                <span>Processando Assinatura...</span>
              ) : (
                <>
                  <span>
                    {stripeConfig?.configured
                      ? `Prosseguir para Checkout Stripe (R$ ${valorMensalEquivalente.toFixed(2).replace('.', ',')}/mês)`
                      : metodo === 'pix' 
                        ? 'Simular Confirmação do Pix' 
                        : metodo === 'cartao' 
                          ? `Assinar Agora (R$ ${valorMensalEquivalente.toFixed(2).replace('.', ',')}/mês)` 
                          : 'Gerar Boleto e Ativar'}
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Modal de Configuração de Chaves da Stripe */}
      <ModalConfigurarStripe
        isOpen={modalConfigStripeAberto}
        onClose={() => setModalConfigStripeAberto(false)}
      />
    </div>
  );
};
