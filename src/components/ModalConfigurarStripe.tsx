import React, { useState, useEffect } from 'react';
import { 
  X, 
  CreditCard, 
  CheckCircle2, 
  AlertCircle, 
  Key, 
  Webhook, 
  ShieldCheck, 
  Sparkles, 
  Copy, 
  Check, 
  RefreshCw, 
  ExternalLink, 
  Eye, 
  EyeOff, 
  HelpCircle,
  Zap,
  Lock,
  ArrowRight
} from 'lucide-react';

interface ModalConfigurarStripeProps {
  isOpen: boolean;
  onClose: () => void;
  onAbrirCheckoutTeste?: () => void;
}

interface StripeConfigState {
  configured: boolean;
  publishableKey: string;
  secretKeyMasked: string;
  hasSecretKey: boolean;
  hasWebhookSecret: boolean;
  webhookUrl: string;
  mode: 'live' | 'test' | 'simulator';
  moeda: string;
  mensagem?: string;
}

export const ModalConfigurarStripe: React.FC<ModalConfigurarStripeProps> = ({
  isOpen,
  onClose,
  onAbrirCheckoutTeste,
}) => {
  const [abaAtiva, setAbaAtiva] = useState<'credenciais' | 'webhooks' | 'testes'>('credenciais');
  const [config, setConfig] = useState<StripeConfigState | null>(null);
  const [carregandoConfig, setCarregandoConfig] = useState(false);

  // Campos do formulário
  const [secretKey, setSecretKey] = useState('');
  const [publishableKey, setPublishableKey] = useState('');
  const [webhookSecret, setWebhookSecret] = useState('');
  const [mostrarSecretKey, setMostrarSecretKey] = useState(false);
  const [mostrarWebhookSecret, setMostrarWebhookSecret] = useState(false);

  // Estados de ação
  const [salvando, setSalvando] = useState(false);
  const [testando, setTestando] = useState(false);
  const [resultadoTeste, setResultadoTeste] = useState<{
    ok: boolean;
    mensagem: string;
    modo?: string;
  } | null>(null);
  const [mensagemSucesso, setMensagemSucesso] = useState<string | null>(null);
  const [mensagemErro, setMensagemErro] = useState<string | null>(null);
  const [copiadoWebhook, setCopiadoWebhook] = useState(false);
  const [copiadoCartao, setCopiadoCartao] = useState<string | null>(null);

  const carregarConfiguracao = async () => {
    setCarregandoConfig(true);
    try {
      const res = await fetch('/api/stripe/config');
      if (res.ok) {
        const dados = await res.json();
        setConfig(dados);
        if (dados.publishableKey) setPublishableKey(dados.publishableKey);
      }
    } catch (err) {
      console.warn('Erro ao carregar status do Stripe:', err);
    } finally {
      setCarregandoConfig(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      carregarConfiguracao();
      setResultadoTeste(null);
      setMensagemSucesso(null);
      setMensagemErro(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCopiarTexto = (texto: string, tipo: 'webhook' | string) => {
    navigator.clipboard.writeText(texto);
    if (tipo === 'webhook') {
      setCopiadoWebhook(true);
      setTimeout(() => setCopiadoWebhook(false), 2000);
    } else {
      setCopiadoCartao(tipo);
      setTimeout(() => setCopiadoCartao(null), 2000);
    }
  };

  const handleTestarConexao = async () => {
    setTestando(true);
    setResultadoTeste(null);
    setMensagemErro(null);
    try {
      const res = await fetch('/api/stripe/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ secretKey: secretKey || undefined })
      });
      const dados = await res.json();
      if (res.ok && dados.ok) {
        setResultadoTeste({
          ok: true,
          mensagem: dados.mensagem || 'Conexão com Stripe bem-sucedida!',
          modo: dados.modo
        });
      } else {
        setResultadoTeste({
          ok: false,
          mensagem: dados.erro || 'Falha ao autenticar na Stripe.'
        });
      }
    } catch {
      setResultadoTeste({
        ok: false,
        mensagem: 'Erro de comunicação ao testar endpoint local da Stripe.'
      });
    } finally {
      setTestando(false);
    }
  };

  const handleSalvarConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setSalvando(true);
    setMensagemSucesso(null);
    setMensagemErro(null);

    try {
      const res = await fetch('/api/stripe/save-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          secretKey: secretKey || undefined,
          publishableKey: publishableKey || undefined,
          webhookSecret: webhookSecret || undefined
        })
      });

      const dados = await res.json();
      if (res.ok && dados.ok) {
        setMensagemSucesso(dados.mensagem || 'Configuração salva com sucesso!');
        setSecretKey('');
        setWebhookSecret('');
        await carregarConfiguracao();
      } else {
        setMensagemErro(dados.erro || 'Não foi possível salvar as configurações.');
      }
    } catch (err: any) {
      setMensagemErro(err.message || 'Erro inesperado ao salvar.');
    } finally {
      setSalvando(false);
    }
  };

  const handleResetarSimulador = async () => {
    if (!confirm('Deseja redefinir para o modo simulador inteligente (sem chaves ativas)?')) return;
    setSalvando(true);
    try {
      const res = await fetch('/api/stripe/save-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          secretKey: '',
          publishableKey: '',
          webhookSecret: ''
        })
      });
      if (res.ok) {
        setSecretKey('');
        setPublishableKey('');
        setWebhookSecret('');
        setMensagemSucesso('Modo simulador reativado.');
        await carregarConfiguracao();
      }
    } catch {
      setMensagemErro('Erro ao resetar.');
    } finally {
      setSalvando(false);
    }
  };

  const webhookUrl = config?.webhookUrl || `${window.location.origin}/api/stripe/webhook`;

  return (
    <div className="fixed inset-0 z-50 flex justify-center items-start p-3 sm:p-6 bg-slate-950/80 overflow-y-auto animate-fadeIn">
      <div 
        className="w-full max-w-2xl bg-white dark:bg-[#071918] rounded-3xl shadow-2xl border border-teal-200/80 dark:border-teal-500/30 overflow-hidden flex flex-col my-4 sm:my-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* CABEÇALHO */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-teal-900 via-teal-800 to-slate-900 text-white flex items-center justify-between relative overflow-hidden shrink-0">
          <div className="absolute right-0 top-0 translate-x-12 -translate-y-6 w-48 h-48 bg-teal-400/10 rounded-full blur-2xl pointer-events-none" />
          <div className="relative z-10 flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-teal-300 shadow-md">
              <CreditCard className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-bold tracking-tight">
                  Configuração Stripe & Pagamentos
                </h2>
                {config?.configured ? (
                  <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold border flex items-center gap-1.5 ${
                    config.mode === 'live'
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/40'
                      : 'bg-sky-500/20 text-sky-300 border-sky-400/40'
                  }`}>
                    <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
                    <span>{config.mode === 'live' ? 'Produção (Live)' : 'Testes (Sandbox)'}</span>
                  </span>
                ) : (
                  <span className="text-[10px] px-2.5 py-0.5 rounded-full font-bold bg-amber-500/20 text-amber-300 border border-amber-400/40 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                    <span>Simulador Ativo</span>
                  </span>
                )}
              </div>
              <p className="text-xs text-teal-100/80 mt-0.5">
                Integração oficial para assinaturas dos Planos Mensal e Anual (Cartão em até 12x e Pix).
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all relative z-10 shrink-0"
            title="Fechar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* NAVEGAÇÃO POR ABAS */}
        <div className="flex items-center border-b border-teal-200/50 dark:border-teal-500/20 px-5 pt-2 bg-slate-50/50 dark:bg-black/20 shrink-0">
          <button
            type="button"
            onClick={() => setAbaAtiva('credenciais')}
            className={`py-3 px-4 text-xs font-bold border-b-2 transition-all flex items-center gap-2 ${
              abaAtiva === 'credenciais'
                ? 'border-teal-600 text-teal-800 dark:text-teal-300'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
            }`}
          >
            <Key className="w-3.5 h-3.5" />
            <span>Chaves de API</span>
          </button>

          <button
            type="button"
            onClick={() => setAbaAtiva('webhooks')}
            className={`py-3 px-4 text-xs font-bold border-b-2 transition-all flex items-center gap-2 ${
              abaAtiva === 'webhooks'
                ? 'border-teal-600 text-teal-800 dark:text-teal-300'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
            }`}
          >
            <Webhook className="w-3.5 h-3.5" />
            <span>Webhooks & Notificações</span>
          </button>

          <button
            type="button"
            onClick={() => setAbaAtiva('testes')}
            className={`py-3 px-4 text-xs font-bold border-b-2 transition-all flex items-center gap-2 ${
              abaAtiva === 'testes'
                ? 'border-teal-600 text-teal-800 dark:text-teal-300'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white dark:text-slate-400'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>Guia & Cartões de Teste</span>
          </button>
        </div>

        {/* FEEDBACK TOAST / AVISOS */}
        {mensagemSucesso && (
          <div className="mx-5 mt-4 p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-semibold flex items-center justify-between gap-2 animate-fadeIn">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{mensagemSucesso}</span>
            </div>
            <button onClick={() => setMensagemSucesso(null)} className="p-1 hover:bg-emerald-200/50 rounded-lg">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {mensagemErro && (
          <div className="mx-5 mt-4 p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 text-xs font-semibold flex items-center justify-between gap-2 animate-fadeIn">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{mensagemErro}</span>
            </div>
            <button onClick={() => setMensagemErro(null)} className="p-1 hover:bg-rose-200/50 rounded-lg">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* CONTEÚDO PRINCIPAL SCROLLÁVEL */}
        <div className="p-5 sm:p-7 overflow-y-auto space-y-6 flex-1">
          {/* ======================================================== */}
          {/* ABA 1: CREDENCIAIS & CHAVES */}
          {/* ======================================================== */}
          {abaAtiva === 'credenciais' && (
            <form onSubmit={handleSalvarConfig} className="space-y-5">
              {/* Card de Status da Conexão Atual */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-teal-200/60 dark:border-teal-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      Status da Conexão Stripe:
                    </span>
                    <span className={`text-[11px] font-extrabold px-2 py-0.5 rounded-full ${
                      config?.configured
                        ? config.mode === 'live' 
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300' 
                          : 'bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300'
                        : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                    }`}>
                      {config?.configured 
                        ? config.mode === 'live' ? 'Produção Conectada' : 'Testes (Sandbox) Conectado'
                        : 'Simulador / Sandbox Local'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {config?.configured && config.secretKeyMasked ? (
                      <>Chave Secreta ativa: <code className="font-mono bg-black/5 dark:bg-white/10 px-1.5 py-0.5 rounded">{config.secretKeyMasked}</code></>
                    ) : (
                      'Nenhuma chave secreta gravada. O app processa assinaturas em modo simulador sem cobrar cartões reais.'
                    )}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    disabled={testando || carregandoConfig}
                    onClick={handleTestarConexao}
                    className="px-3.5 py-2 rounded-xl glass-button text-xs font-semibold text-teal-800 dark:text-teal-200 hover:text-teal-950 dark:hover:text-white flex items-center gap-1.5 transition-all"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${testando ? 'animate-spin' : ''}`} />
                    <span>{testando ? 'Testando...' : 'Testar Conexão'}</span>
                  </button>

                  {config?.configured && (
                    <button
                      type="button"
                      onClick={handleResetarSimulador}
                      className="px-2.5 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
                      title="Voltar para Modo Simulador"
                    >
                      Resetar
                    </button>
                  )}
                </div>
              </div>

              {/* Resultado do Teste de Conexão */}
              {resultadoTeste && (
                <div className={`p-3.5 rounded-2xl border text-xs flex items-center gap-2.5 animate-fadeIn ${
                  resultadoTeste.ok
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
                    : 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-200'
                }`}>
                  {resultadoTeste.ok ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                  ) : (
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" />
                  )}
                  <span className="font-medium">{resultadoTeste.mensagem}</span>
                </div>
              )}

              {/* Campo 1: Chave Secreta (STRIPE_SECRET_KEY) */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <Key className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                    <span>Chave Secreta (STRIPE_SECRET_KEY)</span>
                    <span className="text-[10px] text-rose-500 font-semibold">* Obrigatória para checkout real</span>
                  </label>
                  <a
                    href="https://dashboard.stripe.com/apikeys"
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] text-teal-700 dark:text-teal-300 hover:underline flex items-center gap-1"
                  >
                    <span>Obter no Stripe</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>

                <div className="relative">
                  <input
                    type={mostrarSecretKey ? 'text' : 'password'}
                    value={secretKey}
                    onChange={(e) => setSecretKey(e.target.value)}
                    placeholder={config?.hasSecretKey ? `Manter atual (${config.secretKeyMasked}) ou cole nova sk_test_...` : 'sk_test_51... ou sk_live_51...'}
                    className="w-full px-3.5 py-2.5 pr-10 rounded-xl bg-slate-50 dark:bg-black/30 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white font-mono focus:ring-2 focus:ring-teal-500 focus:outline-hidden"
                  />
                  <button
                    type="button"
                    onClick={() => setMostrarSecretKey(!mostrarSecretKey)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    {mostrarSecretKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Use <code className="font-mono text-teal-700 dark:text-teal-300 font-bold">sk_test_...</code> para ambiente de desenvolvimento/testes ou <code className="font-mono text-emerald-700 dark:text-emerald-300 font-bold">sk_live_...</code> para vendas reais.
                </p>
              </div>

              {/* Campo 2: Chave Publicável (VITE_STRIPE_PUBLISHABLE_KEY) */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                  <span>Chave Publicável (VITE_STRIPE_PUBLISHABLE_KEY)</span>
                  <span className="text-[10px] text-slate-400 font-normal">(Opcional para Checkout Hospedado)</span>
                </label>
                <input
                  type="text"
                  value={publishableKey}
                  onChange={(e) => setPublishableKey(e.target.value)}
                  placeholder="pk_test_51... ou pk_live_51..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-black/30 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white font-mono focus:ring-2 focus:ring-teal-500 focus:outline-hidden"
                />
              </div>

              {/* Campo 3: Segredo do Webhook (STRIPE_WEBHOOK_SECRET) */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <Webhook className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                    <span>Segredo de Assinatura do Webhook (STRIPE_WEBHOOK_SECRET)</span>
                  </label>
                  <span className="text-[10px] text-slate-400">
                    {config?.hasWebhookSecret ? '● Configurado' : 'Opcional (recomendado)'}
                  </span>
                </div>
                <div className="relative">
                  <input
                    type={mostrarWebhookSecret ? 'text' : 'password'}
                    value={webhookSecret}
                    onChange={(e) => setWebhookSecret(e.target.value)}
                    placeholder={config?.hasWebhookSecret ? 'Manter segredo atual ou cole whsec_...' : 'whsec_...'}
                    className="w-full px-3.5 py-2.5 pr-10 rounded-xl bg-slate-50 dark:bg-black/30 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white font-mono focus:ring-2 focus:ring-teal-500 focus:outline-hidden"
                  />
                  <button
                    type="button"
                    onClick={() => setMostrarWebhookSecret(!mostrarWebhookSecret)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    {mostrarWebhookSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Gerado na Stripe em <strong className="text-slate-700 dark:text-slate-300">Desenvolvedores &gt; Webhooks &gt; Adicionar ponto de extremidade</strong>.
                </p>
              </div>

              {/* Botões de Ação */}
              <div className="pt-2 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-xl glass-button text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                >
                  Fechar
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="submit"
                    disabled={salvando}
                    className="px-5 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-teal-700/20 hover:scale-[1.01] transition-all disabled:opacity-50"
                  >
                    {salvando ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Validando e Salvando...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        <span>Salvar & Ativar Stripe</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* ======================================================== */}
          {/* ABA 2: WEBHOOKS & NOTIFICAÇÕES */}
          {/* ======================================================== */}
          {abaAtiva === 'webhooks' && (
            <div className="space-y-5">
              <div className="p-4 rounded-2xl bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 text-xs text-slate-700 dark:text-teal-100 space-y-2">
                <div className="flex items-center gap-2 font-bold text-teal-800 dark:text-teal-300">
                  <ShieldCheck className="w-4 h-4 text-teal-600" />
                  <span>Sincronização Automática de Pagamentos</span>
                </div>
                <p className="text-[11px] leading-relaxed">
                  Quando o cliente paga uma assinatura via Pix ou Cartão no Stripe Checkout, o Stripe envia um evento para o seu endpoint de Webhook. O sistema automaticamente atualiza o plano do profissional no banco de dados e libera as permissões sem intervenção manual.
                </p>
              </div>

              {/* URL do Endpoint */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  URL do Ponto de Extremidade (Endpoint URL)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={webhookUrl}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-black/30 border border-slate-300 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-200 font-mono select-all"
                  />
                  <button
                    type="button"
                    onClick={() => handleCopiarTexto(webhookUrl, 'webhook')}
                    className="px-4 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold flex items-center gap-1.5 shrink-0 transition-all"
                  >
                    {copiadoWebhook ? (
                      <>
                        <Check className="w-4 h-4 text-emerald-300" />
                        <span>Copiado!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        <span>Copiar URL</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Eventos Recomendados */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                  Eventos para Selecionar no Stripe:
                </span>
                <div className="space-y-1.5 font-mono text-[11px]">
                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                    <span className="text-teal-700 dark:text-teal-300 font-semibold">checkout.session.completed</span>
                    <span className="text-[10px] text-slate-500 font-sans">Ativa plano após pagamento aprovado</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                    <span className="text-teal-700 dark:text-teal-300 font-semibold">customer.subscription.updated</span>
                    <span className="text-[10px] text-slate-500 font-sans">Renovação recorrente do ciclo</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                    <span className="text-teal-700 dark:text-teal-300 font-semibold">customer.subscription.deleted</span>
                    <span className="text-[10px] text-slate-500 font-sans">Cancelamento da assinatura</span>
                  </div>
                </div>
              </div>

              {/* Passo a passo rápido */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-slate-800 space-y-2 text-xs">
                <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <HelpCircle className="w-4 h-4 text-teal-600" />
                  <span>Como configurar no Painel Stripe:</span>
                </span>
                <ol className="list-decimal list-inside space-y-1 text-slate-600 dark:text-slate-400 text-[11px]">
                  <li>Acesse o <a href="https://dashboard.stripe.com/webhooks" target="_blank" rel="noreferrer" className="text-teal-600 dark:text-teal-400 underline font-semibold">Stripe Dashboard &gt; Webhooks</a>.</li>
                  <li>Clique em <strong>+ Adicionar ponto de extremidade</strong>.</li>
                  <li>Cole a URL acima no campo <strong>URL do ponto de extremidade</strong>.</li>
                  <li>Selecione o evento <code className="bg-slate-200 dark:bg-slate-800 px-1 rounded">checkout.session.completed</code>.</li>
                  <li>Copie o <strong>Segredo de assinatura</strong> (inicia em <code className="font-mono">whsec_...</code>) e cole na aba <strong>Chaves de API</strong> deste modal.</li>
                </ol>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* ABA 3: CARTÕES & TESTES */}
          {/* ======================================================== */}
          {abaAtiva === 'testes' && (
            <div className="space-y-5">
              <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-200 space-y-1">
                <div className="flex items-center gap-1.5 font-bold">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  <span>Ambiente de Testes Oficial da Stripe</span>
                </div>
                <p className="text-[11px] leading-relaxed">
                  Quando sua chave iniciar com <code className="font-mono font-bold">sk_test_...</code> ou o app estiver em modo sandbox, você pode simular pagamentos usando os dados de teste oficiais abaixo sem nenhuma cobrança real no cartão.
                </p>
              </div>

              {/* Lista de cartões */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                  Cartões de Teste Stripe (Bandeira Visa / Master):
                </span>

                <div className="space-y-2">
                  {/* Cartão de Sucesso */}
                  <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-emerald-200 dark:border-emerald-800/60 flex items-center justify-between gap-3">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300">
                          Aprovação Garantida (Sucesso)
                        </span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200 font-bold">
                          Qualquer Data / CVV 123
                        </span>
                      </div>
                      <p className="font-mono text-xs text-slate-800 dark:text-slate-200 tracking-wider">
                        4242 4242 4242 4242
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleCopiarTexto('4242424242424242', 'sucesso')}
                      className="px-3 py-1.5 rounded-xl glass-button text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1 shrink-0"
                    >
                      {copiadoCartao === 'sucesso' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiadoCartao === 'sucesso' ? 'Copiado' : 'Copiar'}</span>
                    </button>
                  </div>

                  {/* Cartão Recusado */}
                  <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-rose-200 dark:border-rose-900/60 flex items-center justify-between gap-3">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-rose-700 dark:text-rose-400">
                          Recusa Genérica (Declined)
                        </span>
                      </div>
                      <p className="font-mono text-xs text-slate-800 dark:text-slate-200 tracking-wider">
                        4000 0000 0000 0002
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleCopiarTexto('4000000000000002', 'recusado')}
                      className="px-3 py-1.5 rounded-xl glass-button text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1 shrink-0"
                    >
                      {copiadoCartao === 'recusado' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiadoCartao === 'recusado' ? 'Copiado' : 'Copiar'}</span>
                    </button>
                  </div>

                  {/* Cartão Saldo Insuficiente */}
                  <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-amber-200 dark:border-amber-900/60 flex items-center justify-between gap-3">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-amber-700 dark:text-amber-400">
                          Saldo Insuficiente (Insufficient Funds)
                        </span>
                      </div>
                      <p className="font-mono text-xs text-slate-800 dark:text-slate-200 tracking-wider">
                        4000 0000 0000 0127
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleCopiarTexto('4000000000000127', 'insuficiente')}
                      className="px-3 py-1.5 rounded-xl glass-button text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1 shrink-0"
                    >
                      {copiadoCartao === 'insuficiente' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiadoCartao === 'insuficiente' ? 'Copiado' : 'Copiar'}</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Botão de Testar Fluxo de Checkout */}
              {onAbrirCheckoutTeste && (
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onAbrirCheckoutTeste();
                    }}
                    className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-teal-700 to-teal-800 hover:from-teal-800 hover:to-teal-900 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-teal-700/20 transition-all hover:scale-[1.01]"
                  >
                    <Zap className="w-4 h-4 text-amber-400" />
                    <span>Abrir Checkout de Teste Agora (Plano Anual / Mensal)</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
