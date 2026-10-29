import React, { useState } from 'react';
import { 
  Microscope, 
  ShieldCheck, 
  Lock, 
  Mail, 
  User, 
  Eye, 
  EyeOff, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRight, 
  Sparkles, 
  Building, 
  Award, 
  Phone,
  HelpCircle,
  KeyRound,
  X
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface LoginViewProps {
  onLoginSucesso?: () => void;
  onContinuarComoVisitante?: () => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onLoginSucesso, onContinuarComoVisitante }) => {
  const { loginComEmailESenha, cadastrarComEmailESenha, loginComGoogle, enviarEmailRedefinicao, carregandoAuth } = useAuth();

  // Aba ativa: 'login' ou 'cadastro'
  const [abaAtiva, setAbaAtiva] = useState<'login' | 'cadastro'>('login');

  // Campos do formulário de login
  const [loginEmail, setLoginEmail] = useState('');
  const [loginSenha, setLoginSenha] = useState('');
  const [mostrarSenhaLogin, setMostrarSenhaLogin] = useState(false);

  // Campos do formulário de cadastro
  const [cadNome, setCadNome] = useState('');
  const [cadEmail, setCadEmail] = useState('');
  const [cadSenha, setCadSenha] = useState('');
  const [cadConfirmarSenha, setCadConfirmarSenha] = useState('');
  const [cadTitulo, setCadTitulo] = useState('Tricologista & Terapeuta Capilar');
  const [cadRegistro, setCadRegistro] = useState('');
  const [cadClinica, setCadClinica] = useState('');
  const [cadTelefone, setCadTelefone] = useState('');
  const [mostrarSenhaCad, setMostrarSenhaCad] = useState(false);

  // Estados de feedback e controle
  const [erro, setErro] = useState<string | null>(null);
  const [mensagemSucesso, setMensagemSucesso] = useState<string | null>(null);
  const [processando, setProcessando] = useState(false);

  // Modal / Box de recuperação de senha
  const [modalRecuperacao, setModalRecuperacao] = useState(false);
  const [emailRecuperacao, setEmailRecuperacao] = useState('');
  const [enviandoRecuperacao, setEnviandoRecuperacao] = useState(false);

  // Tradução amigável e precisa de erros do Firebase Auth
  const traduzirErroAuth = (codigo: string, mensagemOriginal?: string): string => {
    switch (codigo) {
      case 'auth/invalid-credential':
      case 'auth/invalid-login-credentials':
      case 'auth/wrong-password':
      case 'auth/user-not-found':
        return 'E-mail ou senha incorretos. Verifique se o e-mail e a senha digitados estão corretos ou use a opção de redefinição de senha.';
      case 'auth/email-already-in-use':
        return 'Este e-mail já possui uma conta cadastrada. Acesse a aba "Acessar Consultório" para entrar ou redefina sua senha.';
      case 'auth/weak-password':
        return 'A senha deve ter no mínimo 6 caracteres para proteção dos dados do consultório.';
      case 'auth/invalid-email':
        return 'Formato de e-mail inválido. Por favor, digite um e-mail válido (ex: seuemail@clinica.com).';
      case 'auth/missing-password':
        return 'Por favor, informe a sua senha de acesso.';
      case 'auth/network-request-failed':
        return 'Erro de conexão com o servidor. Verifique sua conexão com a internet e tente novamente.';
      case 'auth/popup-closed-by-user':
        return 'O login com Google foi cancelado antes da conclusão.';
      case 'auth/too-many-requests':
        return 'Muitas tentativas sem sucesso seguidas. Por segurança, aguarde alguns instantes antes de tentar novamente ou redefina sua senha.';
      case 'auth/user-disabled':
        return 'Esta conta de especialista foi desativada. Entre em contato com o suporte.';
      case 'auth/operation-not-allowed':
        return 'O login com Google não está habilitado no Console do Firebase. Acesse Authentication > Sign-in method no Firebase Console e ative o provedor Google.';
      case 'auth/unauthorized-domain':
        return 'Este domínio (localhost/127.0.0.1) não está autorizado no Firebase Console. Adicione-o em Authentication > Settings > Authorized domains.';
      case 'auth/popup-blocked':
        return 'O navegador bloqueou a janela popup do Google. Desative o bloqueador de popups para este site e tente novamente.';
      case 'auth/cancelled-popup-request':
        return 'A janela de autenticação foi fechada ou substituída por outra solicitação.';
      case 'permission-denied':
        return 'Permissão de acesso temporariamente negada. Tente novamente em alguns segundos.';
      case 'unavailable':
        return 'O serviço está temporariamente indisponível. Verifique sua internet e tente novamente.';
      default:
        if (mensagemOriginal && mensagemOriginal.length > 5 && !mensagemOriginal.includes('object Object')) {
          return `Não foi possível autenticar (${codigo || 'erro'}): ${mensagemOriginal}`;
        }
        return `Não foi possível autenticar (${codigo || 'erro desconhecido'}). Verifique suas credenciais ou as configurações do Firebase.`;
    }
  };

  // 1. Submeter Login com E-mail e Senha
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);
    setMensagemSucesso(null);

    const emailLimpo = loginEmail.trim().toLowerCase();
    if (!emailLimpo || !loginSenha) {
      setErro('Por favor, preencha o e-mail e a senha de acesso.');
      return;
    }

    setProcessando(true);
    try {
      await loginComEmailESenha(emailLimpo, loginSenha);
      if (onLoginSucesso) onLoginSucesso();
    } catch (err: any) {
      console.error('Erro no login:', err);
      setErro(traduzirErroAuth(err?.code || '', err?.message || ''));
    } finally {
      setProcessando(false);
    }
  };

  // 2. Submeter Cadastro com E-mail e Senha
  const handleCadastro = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);
    setMensagemSucesso(null);

    const emailLimpo = cadEmail.trim().toLowerCase();
    if (!cadNome.trim() || !emailLimpo || !cadSenha) {
      setErro('Preencha os campos obrigatórios: Nome Completo, E-mail e Senha.');
      return;
    }

    if (cadSenha.length < 6) {
      setErro('A senha deve conter no mínimo 6 caracteres.');
      return;
    }

    if (cadSenha !== cadConfirmarSenha) {
      setErro('A confirmação de senha não confere. Digite a mesma senha nos dois campos.');
      return;
    }

    setProcessando(true);
    try {
      await cadastrarComEmailESenha({
        nome: cadNome.trim(),
        email: emailLimpo,
        senha: cadSenha,
        titulo: cadTitulo,
        registro: cadRegistro.trim(),
        clinica: cadClinica.trim(),
        telefone: cadTelefone.trim()
      });
      if (onLoginSucesso) onLoginSucesso();
    } catch (err: any) {
      console.error('Erro no cadastro:', err);
      setErro(traduzirErroAuth(err?.code || '', err?.message || ''));
    } finally {
      setProcessando(false);
    }
  };

  // 3. Submeter Login com Google
  const handleLoginGoogle = async () => {
    setErro(null);
    setMensagemSucesso(null);
    setProcessando(true);
    try {
      await loginComGoogle();
      if (onLoginSucesso) onLoginSucesso();
    } catch (err: any) {
      console.error('Erro no login Google:', err);
      if (err?.code !== 'auth/popup-closed-by-user') {
        setErro(traduzirErroAuth(err?.code || '', err?.message || ''));
      }
    } finally {
      setProcessando(false);
    }
  };

  // 4. Enviar e-mail de recuperação de senha
  const handleEnviarRecuperacao = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailRecuperacao.trim()) return;

    setEnviandoRecuperacao(true);
    try {
      const res = await enviarEmailRedefinicao(emailRecuperacao);
      if (res.sucesso) {
        setMensagemSucesso('Link de redefinição de senha enviado para o seu e-mail!');
        setModalRecuperacao(false);
        setEmailRecuperacao('');
      } else {
        setErro(res.mensagem);
      }
    } finally {
      setEnviandoRecuperacao(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center p-4 sm:p-6 select-none animate-fadeIn">
      <div className="w-full max-w-lg space-y-5">
        {/* Cabeçalho da Aplicação */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-teal-700 to-teal-500 text-white shadow-xl shadow-teal-700/25 mb-1">
            <Microscope className="w-7 h-7" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            TricoCalazans
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            Plataforma Clínica de Fototricoscopia, Prontuário Digital e Análise Capilar
          </p>
        </div>

        {/* Card Principal de Autenticação */}
        <div className="glass-card p-6 sm:p-8 space-y-5 border-teal-200/70 dark:border-teal-500/25 shadow-2xl">
          {/* Alternador de Abas: Entrar vs Criar Conta */}
          <div className="grid grid-cols-2 p-1 rounded-2xl bg-slate-100/80 dark:bg-white/[0.05] border border-slate-200/50 dark:border-white/[0.08]">
            <button
              type="button"
              onClick={() => { setAbaAtiva('login'); setErro(null); }}
              className={`py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                abaAtiva === 'login'
                  ? 'bg-teal-700 text-white shadow-md shadow-teal-700/25'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Acessar Consultório</span>
            </button>

            <button
              type="button"
              onClick={() => { setAbaAtiva('cadastro'); setErro(null); }}
              className={`py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                abaAtiva === 'cadastro'
                  ? 'bg-teal-700 text-white shadow-md shadow-teal-700/25'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              <span>Criar Nova Conta</span>
            </button>
          </div>

          {/* Banner de Segurança & Privacidade Individual */}
          <div className="p-3 rounded-2xl bg-teal-500/10 border border-teal-500/20 text-teal-800 dark:text-teal-300 flex items-start gap-2.5 text-xs">
            <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5 text-teal-700 dark:text-teal-400" />
            <p className="text-[11px] leading-relaxed">
              <strong>Acesso Estritamente Individual:</strong> Seus pacientes, exames, laudos e agendas são confidenciais e vinculados com exclusividade ao seu e-mail de acesso.
            </p>
          </div>

          {/* Mensagem de Erro se houver */}
          {erro && (
            <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/25 text-xs text-rose-600 dark:text-rose-400 flex flex-col gap-2.5 animate-fadeIn">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
                <span className="leading-relaxed">{erro}</span>
              </div>
              <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-rose-500/15 text-[11px]">
                <button
                  type="button"
                  onClick={() => {
                    setEmailRecuperacao(loginEmail || cadEmail);
                    setModalRecuperacao(true);
                  }}
                  className="font-bold underline text-rose-700 dark:text-rose-300 hover:opacity-80"
                >
                  Esqueceu ou deseja redefinir sua senha?
                </button>
                {abaAtiva === 'login' ? (
                  <button
                    type="button"
                    onClick={() => {
                      setAbaAtiva('cadastro');
                      setErro(null);
                    }}
                    className="text-slate-600 dark:text-slate-300 hover:underline"
                  >
                    Ainda não possui conta? Crie aqui
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setAbaAtiva('login');
                      setErro(null);
                    }}
                    className="text-slate-600 dark:text-slate-300 hover:underline"
                  >
                    Já cadastrado? Acessar consultório
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Mensagem de Sucesso */}
          {mensagemSucesso && (
            <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 text-xs text-emerald-600 dark:text-emerald-400 flex items-start gap-2.5 animate-fadeIn">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-500" />
              <span>{mensagemSucesso}</span>
            </div>
          )}

          {/* ========================================================================= */}
          {/* ABA 1: LOGIN COM E-MAIL E SENHA */}
          {/* ========================================================================= */}
          {abaAtiva === 'login' && (
            <form onSubmit={handleLogin} className="space-y-4 animate-fadeIn">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                  E-mail de Acesso Profissional *
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="email"
                    required
                    placeholder="seu.email@clinica.com.br"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    className="w-full glass-input pl-10 pr-3.5 py-2.5 text-xs font-medium"
                    autoComplete="email"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Senha de Acesso *
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setEmailRecuperacao(loginEmail);
                      setModalRecuperacao(true);
                    }}
                    className="text-[11px] font-semibold text-teal-700 dark:text-teal-400 hover:underline"
                  >
                    Esqueceu a senha?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type={mostrarSenhaLogin ? 'text' : 'password'}
                    required
                    placeholder="Sua senha de acesso"
                    value={loginSenha}
                    onChange={(e) => setLoginSenha(e.target.value)}
                    className="w-full glass-input pl-10 pr-10 py-2.5 text-xs font-medium"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setMostrarSenhaLogin(!mostrarSenhaLogin)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    title={mostrarSenhaLogin ? 'Ocultar senha' : 'Ver senha'}
                  >
                    {mostrarSenhaLogin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Botão Principal: Entrar com E-mail e Senha */}
              <button
                type="submit"
                disabled={processando || carregandoAuth}
                className="w-full py-3 px-4 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-teal-700/25 transition-all hover:scale-[1.01] disabled:opacity-50"
              >
                <Lock className="w-4 h-4" />
                <span>{processando ? 'Verificando Credenciais...' : 'Entrar no Meu Consultório'}</span>
              </button>

              {/* Divisor */}
              <div className="relative flex py-1 items-center">
                <div className="grow border-t border-slate-200/60 dark:border-white/[0.08]"></div>
                <span className="shrink mx-3 text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                  ou continue com conta institucional
                </span>
                <div className="grow border-t border-slate-200/60 dark:border-white/[0.08]"></div>
              </div>

              {/* Botão Secundário: Google */}
              <button
                type="button"
                onClick={handleLoginGoogle}
                disabled={processando || carregandoAuth}
                className="w-full py-2.5 px-4 rounded-xl glass-button text-slate-700 dark:text-slate-200 font-semibold text-xs flex items-center justify-center gap-2.5 transition-all shadow-xs hover:shadow-md disabled:opacity-50"
              >
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"/>
                  <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.24v3.15C3.26 21.41 7.34 24 12 24z"/>
                  <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.24C.45 8.16 0 10.01 0 12s.45 3.84 1.24 5.42l4.04-3.15z"/>
                  <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.26 2.59 1.24 6.58l4.04 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
                </svg>
                <span>Acessar com Google</span>
              </button>

              <div className="pt-2 text-center">
                <button
                  type="button"
                  onClick={() => setAbaAtiva('cadastro')}
                  className="text-xs text-slate-500 hover:text-teal-700 dark:text-slate-400 dark:hover:text-teal-400 font-medium"
                >
                  Ainda não tem cadastro? <span className="font-bold underline">Crie sua conta profissional aqui</span>
                </button>
              </div>
            </form>
          )}

          {/* ========================================================================= */}
          {/* ABA 2: CADASTRO COM E-MAIL E SENHA */}
          {/* ========================================================================= */}
          {abaAtiva === 'cadastro' && (
            <form onSubmit={handleCadastro} className="space-y-3.5 text-xs animate-fadeIn">
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Nome Completo do Especialista *
                </label>
                <div className="relative">
                  <User className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    required
                    placeholder="Ex: Dra. Mariana Silveira Duarte"
                    value={cadNome}
                    onChange={(e) => setCadNome(e.target.value)}
                    className="w-full glass-input pl-9 pr-3 py-2 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  E-mail de Acesso Profissional *
                </label>
                <div className="relative">
                  <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="email"
                    required
                    placeholder="mariana@clinica.com.br"
                    value={cadEmail}
                    onChange={(e) => setCadEmail(e.target.value)}
                    className="w-full glass-input pl-9 pr-3 py-2 text-xs"
                    autoComplete="email"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Senha de Acesso * (mín. 6 dígitos)
                  </label>
                  <div className="relative">
                    <Lock className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type={mostrarSenhaCad ? 'text' : 'password'}
                      required
                      placeholder="Mínimo 6 dígitos"
                      value={cadSenha}
                      onChange={(e) => setCadSenha(e.target.value)}
                      className="w-full glass-input pl-9 pr-8 py-2 text-xs"
                    />
                    <button
                      type="button"
                      onClick={() => setMostrarSenhaCad(!mostrarSenhaCad)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400"
                    >
                      {mostrarSenhaCad ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Confirmar Senha *
                  </label>
                  <div className="relative">
                    <Lock className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type={mostrarSenhaCad ? 'text' : 'password'}
                      required
                      placeholder="Repita a senha"
                      value={cadConfirmarSenha}
                      onChange={(e) => setCadConfirmarSenha(e.target.value)}
                      className="w-full glass-input pl-9 pr-3 py-2 text-xs"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Título / Especialidade
                  </label>
                  <select
                    value={cadTitulo}
                    onChange={(e) => setCadTitulo(e.target.value)}
                    className="w-full glass-input px-3 py-2 text-xs font-medium"
                  >
                    <option value="Tricologista & Terapeuta Capilar" className="bg-white dark:bg-slate-900">Tricologista & Terapeuta Capilar</option>
                    <option value="Dermatologista & Tricologia Clínica" className="bg-white dark:bg-slate-900">Dermatologista & Tricologia Clínica</option>
                    <option value="Biomédico(a) Esteta & Tricologia" className="bg-white dark:bg-slate-900">Biomédico(a) Esteta & Tricologia</option>
                    <option value="Cirurgião(ã) Capilar & Transplante" className="bg-white dark:bg-slate-900">Cirurgião(ã) Capilar & Transplante</option>
                    <option value="Terapeuta Capilar Integrativa" className="bg-white dark:bg-slate-900">Terapeuta Capilar Integrativa</option>
                    <option value="Especialista em Saúde Capilar" className="bg-white dark:bg-slate-900">Especialista em Saúde Capilar</option>
                  </select>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-bold text-slate-700 dark:text-slate-300 block">
                      Registro (CRM / CRBM / ABT / CRF)
                    </label>
                    <span className="text-[10px] text-teal-700 dark:text-teal-400 font-semibold bg-teal-50 dark:bg-teal-950/60 px-2 py-0.5 rounded-full border border-teal-200 dark:border-teal-800">
                      Opcional
                    </span>
                  </div>
                  <div className="relative">
                    <Award className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      placeholder="Ex: CRM, CRBM, ABT (Não obrigatório)"
                      value={cadRegistro}
                      onChange={(e) => setCadRegistro(e.target.value)}
                      className="w-full glass-input pl-9 pr-3 py-2 text-xs font-mono"
                    />
                  </div>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">
                    Não é obrigatório. Profissionais sem CRM podem se cadastrar livremente.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-bold text-slate-700 dark:text-slate-300 block">
                      Nome da Clínica / Consultório
                    </label>
                    <span className="text-[10px] text-slate-400 font-normal">
                      Opcional
                    </span>
                  </div>
                  <div className="relative">
                    <Building className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      placeholder="Ex: Consultório de Tricologia"
                      value={cadClinica}
                      onChange={(e) => setCadClinica(e.target.value)}
                      className="w-full glass-input pl-9 pr-3 py-2 text-xs"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-bold text-slate-700 dark:text-slate-300 block">
                      Telefone / Celular
                    </label>
                    <span className="text-[10px] text-slate-400 font-normal">
                      Opcional
                    </span>
                  </div>
                  <div className="relative">
                    <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      placeholder="(11) 98765-4321"
                      value={cadTelefone}
                      onChange={(e) => setCadTelefone(e.target.value)}
                      className="w-full glass-input pl-9 pr-3 py-2 text-xs font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Botão Cadastrar */}
              <button
                type="submit"
                disabled={processando || carregandoAuth}
                className="w-full mt-2 py-3 px-4 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-teal-700/25 transition-all hover:scale-[1.01] disabled:opacity-50"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>{processando ? 'Cadastrando Perfil...' : 'Criar Minha Conta e Acessar'}</span>
              </button>

              <div className="pt-2 text-center">
                <button
                  type="button"
                  onClick={() => setAbaAtiva('login')}
                  className="text-xs text-slate-500 hover:text-teal-700 dark:text-slate-400 dark:hover:text-teal-400 font-medium"
                >
                  Já possui cadastro? <span className="font-bold underline">Clique para entrar</span>
                </button>
              </div>
            </form>
          )}

          {/* Link para visualização educacional como visitante */}
          {onContinuarComoVisitante && (
            <div className="pt-3 text-center border-t border-slate-200/60 dark:border-white/[0.08]">
              <button
                type="button"
                onClick={onContinuarComoVisitante}
                className="text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 text-[11px] font-medium underline underline-offset-2 transition-colors"
              >
                Acessar apenas o Atlas de Tricoscopia como visitante (sem login)
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL RECUPERAÇÃO DE SENHA */}
      {/* ========================================================================= */}
      {modalRecuperacao && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-md bg-white dark:bg-[#0B1516] rounded-3xl p-6 shadow-2xl border border-teal-200/70 dark:border-teal-500/30 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200/60 dark:border-white/[0.08]">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-teal-700 dark:text-teal-400" />
                <span>Recuperar Senha de Acesso</span>
              </h3>
              <button
                onClick={() => setModalRecuperacao(false)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400">
              Digite o e-mail cadastrado da sua conta. Você receberá um link oficial para redefinir sua senha com segurança.
            </p>

            <form onSubmit={handleEnviarRecuperacao} className="space-y-3.5 text-xs">
              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  E-mail Cadastrado:
                </label>
                <input
                  type="email"
                  required
                  placeholder="seu.email@clinica.com.br"
                  value={emailRecuperacao}
                  onChange={(e) => setEmailRecuperacao(e.target.value)}
                  className="w-full glass-input px-3 py-2"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModalRecuperacao(false)}
                  className="px-3 py-1.5 rounded-xl glass-button font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={enviandoRecuperacao}
                  className="px-4 py-1.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold transition-all disabled:opacity-50"
                >
                  {enviandoRecuperacao ? 'Enviando...' : 'Enviar Link de Redefinição'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
