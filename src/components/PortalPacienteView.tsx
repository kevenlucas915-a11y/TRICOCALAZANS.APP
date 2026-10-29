import React, { useState, useEffect } from 'react';
import { 
  Heart, 
  Sparkles, 
  Calendar, 
  Clock, 
  Phone, 
  Mail, 
  MapPin, 
  ShieldCheck, 
  Check, 
  AlertCircle, 
  Lock, 
  Eye, 
  X, 
  LogOut, 
  ChevronRight, 
  Pill, 
  Camera, 
  FileText, 
  MessageCircle, 
  User, 
  ArrowLeft,
  CalendarCheck,
  HelpCircle,
  KeyRound,
  ExternalLink
} from 'lucide-react';
import { 
  obterConvitePorToken, 
  ativarContaPaciente, 
  loginPaciente, 
  carregarDadosPortal, 
  DadosPortalPaciente 
} from '../services/portalService';
import { ConvitePaciente, PacienteUsuario } from '../types/portal';
import { sendPasswordResetEmail, signOut } from 'firebase/auth';
import { auth } from '../firebase';

interface PortalPacienteViewProps {
  onVoltarParaProfissional?: () => void;
}

export const PortalPacienteView: React.FC<PortalPacienteViewProps> = ({
  onVoltarParaProfissional
}) => {
  // Estado de navegação e autenticação do paciente
  const [tokenConvite, setTokenConvite] = useState<string | null>(null);
  const [convite, setConvite] = useState<ConvitePaciente | null>(null);
  const [pacienteUsuario, setPacienteUsuario] = useState<PacienteUsuario | null>(() => {
    if (typeof window !== 'undefined' && window.localStorage) {
      const salvo = window.localStorage.getItem('trico_paciente_auth_user');
      if (salvo) {
        try { return JSON.parse(salvo); } catch {}
      }
    }
    return null;
  });

  const [tela, setTela] = useState<'carregando' | 'ativacao' | 'login' | 'recuperar_senha' | 'dashboard' | 'erro_convite'>('carregando');
  const [motivoErroConvite, setMotivoErroConvite] = useState<string>('');

  // Formulário de Login
  const [loginEmail, setLoginEmail] = useState('');
  const [loginSenha, setLoginSenha] = useState('');
  const [loginCarregando, setLoginCarregando] = useState(false);
  const [loginErro, setLoginErro] = useState<string | null>(null);

  // Formulário de Ativação
  const [ativarEmail, setAtivarEmail] = useState('');
  const [ativarSenha, setAtivarSenha] = useState('');
  const [ativarConfirmaSenha, setAtivarConfirmaSenha] = useState('');
  const [ativarCarregando, setAtivarCarregando] = useState(false);
  const [ativarErro, setAtivarErro] = useState<string | null>(null);

  // Recuperação de Senha
  const [recupEmail, setRecupEmail] = useState('');
  const [recupCarregando, setRecupCarregando] = useState(false);
  const [recupSucesso, setRecupSucesso] = useState(false);
  const [recupErro, setRecupErro] = useState<string | null>(null);

  // Dados do Dashboard do Paciente
  const [dadosPortal, setDadosPortal] = useState<DadosPortalPaciente | null>(null);
  const [carregandoDados, setCarregandoDados] = useState(false);
  const [abaAtiva, setAbaAtiva] = useState<'evolucao' | 'fotos' | 'produtos' | 'consultas'>('evolucao');

  // Modal de Foto Ampliada
  const [fotoModal, setFotoModal] = useState<{ url: string; titulo: string; data?: string } | null>(null);

  // Inicialização e checagem de parâmetros da URL
  useEffect(() => {
    let tkn: string | null = null;
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      tkn = params.get('token');
    }

    if (tkn) {
      setTokenConvite(tkn);
      verificarConvite(tkn);
    } else if (pacienteUsuario) {
      setTela('dashboard');
      carregarTudo(pacienteUsuario.uid);
    } else {
      setTela('login');
    }
  }, []);

  // Validar token de convite
  const verificarConvite = async (token: string) => {
    setTela('carregando');
    try {
      const res = await obterConvitePorToken(token);
      if (res.valido && res.convite) {
        setConvite(res.convite);
        if (res.convite.pacienteEmail) {
          setAtivarEmail(res.convite.pacienteEmail);
        }
        setTela('ativacao');
      } else {
        setMotivoErroConvite(res.motivoInvalido || 'convite inválido ou expirado — fale com sua profissional');
        setTela('erro_convite');
      }
    } catch {
      setMotivoErroConvite('convite inválido ou expirado — fale com sua profissional');
      setTela('erro_convite');
    }
  };

  // Carregar dados completos do portal
  const carregarTudo = async (pacienteUid: string) => {
    setCarregandoDados(true);
    try {
      const dados = await carregarDadosPortal(pacienteUid);
      if (dados) {
        setDadosPortal(dados);
      } else {
        // Se usuário de paciente não estiver ligado a nenhum registro de paciente
        setMotivoErroConvite('convite inválido ou expirado — fale com sua profissional');
        setTela('erro_convite');
      }
    } catch (err) {
      console.warn('Erro ao carregar dados do portal:', err);
    } finally {
      setCarregandoDados(false);
    }
  };

  // Realizar ativação de conta
  const handleAtivarConta = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tokenConvite) return;

    if (!ativarEmail.trim() || !ativarEmail.includes('@')) {
      setAtivarErro('Informe um e-mail válido para seu acesso.');
      return;
    }
    if (ativarSenha.length < 6) {
      setAtivarErro('A senha deve conter no mínimo 6 caracteres.');
      return;
    }
    if (ativarSenha !== ativarConfirmaSenha) {
      setAtivarErro('As senhas digitadas não coincidem.');
      return;
    }

    setAtivarCarregando(true);
    setAtivarErro(null);

    try {
      const usuarioCriado = await ativarContaPaciente(tokenConvite, ativarEmail, ativarSenha);
      setPacienteUsuario(usuarioCriado);
      setTela('dashboard');
      // Limpa token da URL para manter histórico limpo
      if (typeof window !== 'undefined' && window.history) {
        window.history.replaceState({}, '', '/area-do-cliente');
      }
      await carregarTudo(usuarioCriado.uid);
    } catch (err: any) {
      console.error('Erro na ativação:', err);
      setAtivarErro(err.message || 'Erro ao ativar sua conta. Verifique os dados e tente novamente.');
    } finally {
      setAtivarCarregando(false);
    }
  };

  // Realizar login do paciente
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail.trim() || !loginSenha) {
      setLoginErro('Preencha seu e-mail e senha de acesso.');
      return;
    }

    setLoginCarregando(true);
    setLoginErro(null);

    try {
      const usuarioLogado = await loginPaciente(loginEmail, loginSenha);
      setPacienteUsuario(usuarioLogado);
      setTela('dashboard');
      await carregarTudo(usuarioLogado.uid);
    } catch (err: any) {
      console.error('Erro no login do paciente:', err);
      setLoginErro(err.message || 'Não foi possível entrar. Verifique seu e-mail e senha.');
    } finally {
      setLoginCarregando(false);
    }
  };

  // Enviar link de redefinição de senha
  const handleRecuperarSenha = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recupEmail.trim() || !recupEmail.includes('@')) {
      setRecupErro('Informe o e-mail cadastrado.');
      return;
    }

    setRecupCarregando(true);
    setRecupErro(null);

    try {
      await sendPasswordResetEmail(auth, recupEmail.trim().toLowerCase());
      setRecupSucesso(true);
    } catch (err: any) {
      console.error('Erro ao redefinir senha:', err);
      setRecupErro('Não encontramos nenhuma conta com esse e-mail ou ocorreu um erro temporário.');
    } finally {
      setRecupCarregando(false);
    }
  };

  // Logout do paciente
  const handleLogoutPaciente = async () => {
    try {
      await signOut(auth);
    } catch {}
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem('trico_paciente_auth_user');
    }
    setPacienteUsuario(null);
    setDadosPortal(null);
    setTela('login');
  };

  // Renderizar carregando inicial
  if (tela === 'carregando') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-teal-50/70 via-emerald-50/30 to-stone-100 dark:from-[#061514] dark:to-[#020b0a] flex items-center justify-center p-4">
        <div className="text-center space-y-4 max-w-sm">
          <div className="w-16 h-16 rounded-3xl bg-teal-600/10 text-teal-700 dark:text-teal-400 flex items-center justify-center mx-auto animate-pulse">
            <Sparkles className="w-8 h-8" />
          </div>
          <h2 className="text-base font-bold text-slate-800 dark:text-slate-200">
            Acessando Área do Cliente...
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Carregando suas informações e histórico de acompanhamento capilar.
          </p>
        </div>
      </div>
    );
  }

  // Renderizar Erro de Convite
  if (tela === 'erro_convite') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-teal-50/70 via-emerald-50/30 to-stone-100 dark:from-[#061514] dark:to-[#020b0a] flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 shadow-xl border border-teal-200/60 dark:border-teal-900/60 text-center space-y-5">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto">
            <AlertCircle className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Acesso ao Portal
            </h2>
            <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/50 text-xs text-amber-900 dark:text-amber-200 font-semibold leading-relaxed">
              {motivoErroConvite || 'convite inválido ou expirado — fale com sua profissional'}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Para sua segurança, cada link de convite é único e possui prazo de validade. Entre em contato com o consultório para receber um novo link.
            </p>
          </div>

          <div className="space-y-2 pt-2">
            <button
              onClick={() => setTela('login')}
              className="w-full py-3 rounded-2xl bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs transition-colors shadow-sm"
            >
              Já tenho senha criada (Fazer Login)
            </button>

            {onVoltarParaProfissional && (
              <button
                onClick={onVoltarParaProfissional}
                className="w-full py-2.5 rounded-xl text-xs text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
              >
                Voltar à área médica/profissional
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Renderizar Ativação de Convite (Primeiro Acesso)
  if (tela === 'ativacao' && convite) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-teal-50/70 via-emerald-50/30 to-stone-100 dark:from-[#061514] dark:to-[#020b0a] flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 shadow-xl border border-teal-200/80 dark:border-teal-900/60 space-y-6">
          <div className="text-center space-y-2">
            <div className="w-14 h-14 rounded-2xl bg-teal-600/10 text-teal-700 dark:text-teal-400 flex items-center justify-center mx-auto">
              <Sparkles className="w-7 h-7" />
            </div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-teal-700 dark:text-teal-400 block">
              {convite.nomeClinica || 'Acompanhamento Capilar'}
            </span>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">
              Bem-vindo(a), {convite.pacienteNome}!
            </h1>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Sua especialista <strong>{convite.profissionalNome}</strong> preparou este portal exclusivo para você acompanhar sua evolução capilar, fotos e produtos indicados.
            </p>
          </div>

          <form onSubmit={handleAtivarConta} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Confirme seu e-mail:
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={ativarEmail}
                  onChange={(e) => setAtivarEmail(e.target.value)}
                  placeholder="seuemail@exemplo.com"
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-teal-500"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Crie uma senha de acesso:
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  minLength={6}
                  value={ativarSenha}
                  onChange={(e) => setAtivarSenha(e.target.value)}
                  placeholder="Mínimo de 6 caracteres"
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-teal-500"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Confirme sua senha:
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  minLength={6}
                  value={ativarConfirmaSenha}
                  onChange={(e) => setAtivarConfirmaSenha(e.target.value)}
                  placeholder="Digite a mesma senha novamente"
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-teal-500"
                />
              </div>
            </div>

            {ativarErro && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-medium">
                {ativarErro}
              </div>
            )}

            <button
              type="submit"
              disabled={ativarCarregando}
              className="w-full py-3 rounded-2xl bg-teal-700 hover:bg-teal-800 disabled:opacity-50 text-white font-bold text-xs transition-colors shadow-sm flex items-center justify-center gap-2"
            >
              {ativarCarregando ? (
                <span>Ativando seu acesso seguro...</span>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>Criar Senha e Acessar Meu Portal</span>
                </>
              )}
            </button>
          </form>

          <div className="border-t border-slate-100 dark:border-slate-800 pt-4 text-center">
            <button
              onClick={() => setTela('login')}
              className="text-xs text-teal-700 dark:text-teal-400 font-semibold hover:underline"
            >
              Já criou sua senha antes? Fazer login
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Renderizar Tela de Login
  if (tela === 'login') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-teal-50/70 via-emerald-50/30 to-stone-100 dark:from-[#061514] dark:to-[#020b0a] flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 shadow-xl border border-teal-200/80 dark:border-teal-900/60 space-y-6">
          <div className="text-center space-y-2">
            <div className="w-14 h-14 rounded-2xl bg-teal-600/10 text-teal-700 dark:text-teal-400 flex items-center justify-center mx-auto">
              <Heart className="w-7 h-7 text-teal-600" />
            </div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">
              Área do Cliente • Portal do Paciente
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Acompanhe suas consultas, evolução do tratamento capilar e produtos indicados pela sua especialista.
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Seu e-mail:
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  placeholder="exemplo@gmail.com"
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-teal-500"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Sua senha:
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setRecupEmail(loginEmail);
                    setRecupSucesso(false);
                    setRecupErro(null);
                    setTela('recuperar_senha');
                  }}
                  className="text-[11px] text-teal-700 dark:text-teal-400 font-medium hover:underline"
                >
                  Esqueci minha senha
                </button>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  value={loginSenha}
                  onChange={(e) => setLoginSenha(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-teal-500"
                />
              </div>
            </div>

            {loginErro && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-medium">
                {loginErro}
              </div>
            )}

            <button
              type="submit"
              disabled={loginCarregando}
              className="w-full py-3 rounded-2xl bg-teal-700 hover:bg-teal-800 disabled:opacity-50 text-white font-bold text-xs transition-colors shadow-sm flex items-center justify-center gap-2"
            >
              {loginCarregando ? (
                <span>Entrando...</span>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>Entrar no Meu Portal</span>
                </>
              )}
            </button>
          </form>

          <div className="p-3.5 rounded-2xl bg-stone-50 dark:bg-slate-950/60 border border-stone-200/80 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 text-center space-y-1">
            <p className="font-semibold text-slate-700 dark:text-slate-300">
              Ainda não tem cadastro?
            </p>
            <p>
              Solicite o link exclusivo de convite diretamente à sua profissional na próxima consulta.
            </p>
          </div>

          {onVoltarParaProfissional && (
            <div className="text-center pt-2">
              <button
                onClick={onVoltarParaProfissional}
                className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
              >
                ← Voltar à área da profissional
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Renderizar Recuperação de Senha
  if (tela === 'recuperar_senha') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-teal-50/70 via-emerald-50/30 to-stone-100 dark:from-[#061514] dark:to-[#020b0a] flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 shadow-xl border border-teal-200/80 dark:border-teal-900/60 space-y-5">
          <button
            onClick={() => setTela('login')}
            className="flex items-center gap-1.5 text-xs text-teal-700 dark:text-teal-400 font-bold hover:underline"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Voltar ao login</span>
          </button>

          <div className="text-center space-y-2">
            <div className="w-14 h-14 rounded-2xl bg-teal-600/10 text-teal-700 dark:text-teal-400 flex items-center justify-center mx-auto">
              <KeyRound className="w-7 h-7" />
            </div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Redefinir Senha do Portal
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Digite seu e-mail cadastrado. Enviaremos um link seguro para você definir uma nova senha.
            </p>
          </div>

          {recupSucesso ? (
            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-xs font-medium space-y-2 text-center">
              <p className="font-bold">✓ E-mail enviado com sucesso!</p>
              <p>Verifique sua caixa de entrada e spam. Siga as instruções para criar uma nova senha e retorne para entrar.</p>
              <button
                onClick={() => setTela('login')}
                className="mt-3 px-4 py-2 rounded-xl bg-teal-700 text-white font-bold text-xs"
              >
                Voltar e Fazer Login
              </button>
            </div>
          ) : (
            <form onSubmit={handleRecuperarSenha} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Seu e-mail cadastrado:
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={recupEmail}
                    onChange={(e) => setRecupEmail(e.target.value)}
                    placeholder="seuemail@exemplo.com"
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-teal-500"
                  />
                </div>
              </div>

              {recupErro && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-medium">
                  {recupErro}
                </div>
              )}

              <button
                type="submit"
                disabled={recupCarregando}
                className="w-full py-3 rounded-2xl bg-teal-700 hover:bg-teal-800 disabled:opacity-50 text-white font-bold text-xs transition-colors shadow-sm"
              >
                {recupCarregando ? 'Enviando...' : 'Enviar Link de Redefinição'}
              </button>
            </form>
          )}
        </div>
      </div>
    );
  }

  // =========================================================================
  // DASHBOARD DO PACIENTE (SÓ LEITURA)
  // =========================================================================
  const paciente = dadosPortal?.paciente;
  const profissional = dadosPortal?.profissional;
  const consultas = dadosPortal?.consultasLiberadas || [];
  const produtos = dadosPortal?.produtosLiberados || [];
  const agendamentos = dadosPortal?.proximasConsultas || [];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#030e0d] text-slate-800 dark:text-slate-200">
      {/* BARRA SUPERIOR: CLÍNICA & PACIENTE */}
      <header className="sticky top-0 z-40 bg-white/90 dark:bg-[#071918]/90 backdrop-blur-md border-b border-teal-200/60 dark:border-teal-900/40">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-teal-600 text-white flex items-center justify-center font-bold text-base shadow-sm shrink-0">
              <Heart className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-teal-700 dark:text-teal-400 block">
                {profissional?.nomeDoEspaco || 'Espaço de Tricologia'}
              </span>
              <h1 className="text-sm font-bold text-slate-900 dark:text-white leading-tight">
                {profissional?.nome || 'Especialista em Tricologia'}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {profissional?.telefone && (
              <a
                href={`https://wa.me/55${profissional.telefone.replace(/\D/g, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 text-xs font-semibold border border-emerald-300/80 transition-colors"
                title="Falar com a clínica no WhatsApp"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                <span>Contato Clínica</span>
              </a>
            )}

            <button
              onClick={handleLogoutPaciente}
              className="px-3 py-1.5 rounded-xl glass-button text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-rose-600 flex items-center gap-1.5 transition-colors"
              title="Sair do portal"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Sair</span>
            </button>
          </div>
        </div>
      </header>

      {/* CONTEÚDO PRINCIPAL */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        {/* BOAS-VINDAS E CARD DO PACIENTE */}
        <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-r from-teal-900 via-teal-800 to-slate-900 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-teal-300 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4" />
              <span>Portal de Acompanhamento • Espaço Seguro</span>
            </span>
            <h2 className="text-xl sm:text-2xl font-bold">
              Olá, {paciente?.nome || pacienteUsuario?.nome}! 👋
            </h2>
            <p className="text-xs sm:text-sm text-teal-100/90 max-w-xl leading-relaxed">
              Aqui você tem acesso a todos os registros de evolução, fotos das suas consultas e orientações de produtos liberados pela sua profissional.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start md:self-center shrink-0">
            <span className="px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-xs font-semibold">
              🔒 Prontuário Pessoal e Confidencial
            </span>
          </div>
        </div>

        {/* NAVEGAÇÃO DE ABAS */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar border-b border-teal-200/60 dark:border-teal-900/40">
          <button
            onClick={() => setAbaAtiva('evolucao')}
            className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${
              abaAtiva === 'evolucao'
                ? 'bg-teal-700 text-white shadow-md'
                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-teal-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Linha do Tempo ({consultas.length})</span>
          </button>

          <button
            onClick={() => setAbaAtiva('fotos')}
            className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${
              abaAtiva === 'fotos'
                ? 'bg-teal-700 text-white shadow-md'
                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-teal-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800'
            }`}
          >
            <Camera className="w-3.5 h-3.5" />
            <span>Fotos da Evolução ({consultas.filter(c => c.imagemUrl).length})</span>
          </button>

          <button
            onClick={() => setAbaAtiva('produtos')}
            className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${
              abaAtiva === 'produtos'
                ? 'bg-teal-700 text-white shadow-md'
                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-teal-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800'
            }`}
          >
            <Pill className="w-3.5 h-3.5" />
            <span>Produtos Indicados ({produtos.length})</span>
          </button>

          <button
            onClick={() => setAbaAtiva('consultas')}
            className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${
              abaAtiva === 'consultas'
                ? 'bg-teal-700 text-white shadow-md'
                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-teal-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Próximas Consultas ({agendamentos.length})</span>
          </button>
        </div>

        {/* ABA 1: LINHA DO TEMPO DA EVOLUÇÃO (CONSULTA A CONSULTA) */}
        {abaAtiva === 'evolucao' && (
          <div className="space-y-4">
            {consultas.length === 0 ? (
              <div className="p-8 sm:p-12 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-center space-y-3">
                <Clock className="w-10 h-10 text-teal-600/40 mx-auto" />
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                  Nenhuma evolução liberada no momento
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                  Assim que sua especialista concluir a análise da sua última consulta e liberar as fotos e anotações, elas aparecerão aqui na sua linha do tempo.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {consultas.map((cons, idx) => {
                  let achadosArray: Array<{ nome: string; fotoUrl?: string }> = [];
                  if (cons.achadosLiberados) {
                    try {
                      achadosArray = JSON.parse(cons.achadosLiberados);
                    } catch {}
                  }

                  return (
                    <div
                      key={cons.id}
                      className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-teal-100 dark:border-teal-950 shadow-xs space-y-4 hover:border-teal-300 dark:hover:border-teal-800 transition-colors"
                    >
                      {/* Topo da Consulta */}
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                        <div className="flex items-center gap-2">
                          <span className="px-3 py-1 rounded-xl bg-teal-50 dark:bg-teal-950/80 border border-teal-200 dark:border-teal-800 text-teal-800 dark:text-teal-300 font-bold text-xs font-mono">
                            {new Date(cons.data + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
                          </span>
                          <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                            Região: {cons.area}
                          </span>
                        </div>

                        {idx === 0 && (
                          <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 text-[10px] font-bold">
                            Mais recente
                          </span>
                        )}
                      </div>

                      {/* Foto e Descrição */}
                      <div className="flex flex-col sm:flex-row gap-4 items-start">
                        {cons.imagemUrl && (
                          <div
                            onClick={() => setFotoModal({ url: cons.imagemUrl!, titulo: `Evolução • ${cons.area}`, data: cons.data })}
                            className="w-full sm:w-48 h-36 rounded-2xl overflow-hidden bg-black border border-slate-200 dark:border-slate-800 relative shrink-0 cursor-pointer group shadow-xs"
                          >
                            <img
                              src={cons.imagemUrl}
                              alt="Foto da evolução"
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                            />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-semibold gap-1">
                              <Eye className="w-4 h-4" />
                              <span>Ver Foto Completa</span>
                            </div>
                          </div>
                        )}

                        <div className="flex-1 space-y-3">
                          {cons.queixaEvolucao && (
                            <div className="space-y-1">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                Anotação da Especialista:
                              </span>
                              <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed bg-stone-50 dark:bg-slate-950/60 p-3 rounded-2xl border border-stone-200/70 dark:border-slate-800">
                                {cons.queixaEvolucao}
                              </p>
                            </div>
                          )}

                          {/* ACHADOS LIBERADOS (SOMENTE NOME E FOTO, SEM JARGÃO OU CONDUTA) */}
                          {achadosArray.length > 0 && (
                            <div className="space-y-2 pt-1">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-teal-700 dark:text-teal-400 block">
                                Características observadas na sessão:
                              </span>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {achadosArray.map((ach, achIdx) => (
                                  <div
                                    key={achIdx}
                                    className="p-2.5 rounded-xl border border-teal-200/60 dark:border-teal-900/40 bg-teal-50/50 dark:bg-teal-950/20 flex items-center gap-3"
                                  >
                                    {ach.fotoUrl && (
                                      <img
                                        src={ach.fotoUrl}
                                        alt={ach.nome}
                                        onClick={() => setFotoModal({ url: ach.fotoUrl!, titulo: ach.nome })}
                                        className="w-12 h-12 rounded-lg object-cover cursor-pointer hover:scale-105 transition-transform shrink-0"
                                      />
                                    )}
                                    <div className="min-w-0">
                                      <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                                        {ach.nome}
                                      </p>
                                      <span className="text-[10px] text-teal-700 dark:text-teal-400">
                                        Identificado na imagem
                                      </span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ABA 2: FOTOS DA EVOLUÇÃO LIBERADAS */}
        {abaAtiva === 'fotos' && (
          <div className="space-y-4">
            {consultas.filter(c => c.imagemUrl).length === 0 ? (
              <div className="p-8 sm:p-12 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-center space-y-3">
                <Camera className="w-10 h-10 text-teal-600/40 mx-auto" />
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                  Nenhuma foto liberada ainda
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                  As imagens em alta resolução registradas durante as sessões de fototricoscopia aparecerão aqui após liberação da sua especialista.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {consultas.filter(c => c.imagemUrl).map(cons => (
                  <div
                    key={cons.id}
                    onClick={() => setFotoModal({ url: cons.imagemUrl!, titulo: `Evolução • ${cons.area}`, data: cons.data })}
                    className="group bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-xs cursor-pointer hover:border-teal-400 transition-all flex flex-col"
                  >
                    <div className="w-full h-48 bg-black overflow-hidden relative">
                      <img
                        src={cons.imagemUrl}
                        alt={`Evolução ${cons.area}`}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-semibold gap-1.5">
                        <Eye className="w-4 h-4" />
                        <span>Clique para ampliar</span>
                      </div>
                    </div>

                    <div className="p-4 space-y-1">
                      <span className="text-[10px] font-mono font-bold text-teal-700 dark:text-teal-400">
                        {new Date(cons.data + 'T00:00:00').toLocaleDateString('pt-BR')}
                      </span>
                      <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                        {cons.area}
                      </h4>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ABA 3: PRODUTOS INDICADOS (HOME CARE) */}
        {abaAtiva === 'produtos' && (
          <div className="space-y-4">
            {produtos.length === 0 ? (
              <div className="p-8 sm:p-12 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-center space-y-3">
                <Pill className="w-10 h-10 text-teal-600/40 mx-auto" />
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                  Nenhum produto indicado no momento
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                  Fórmulas manipuladas, tônicos, xampus ou suplementos prescritos pela sua profissional serão listados aqui com o modo correto de uso.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {produtos.map(prod => (
                  <div
                    key={prod.id}
                    className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-teal-100 dark:border-teal-950 shadow-xs space-y-4"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-11 h-11 rounded-2xl bg-teal-500/10 text-teal-700 dark:text-teal-400 flex items-center justify-center shrink-0">
                        <Pill className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-teal-700 dark:text-teal-400">
                          Prescrição & Cuidados Diários
                        </span>
                        <h3 className="text-base font-bold text-slate-900 dark:text-white leading-snug">
                          {prod.nome}
                        </h3>
                      </div>
                    </div>

                    {/* Como Usar */}
                    <div className="p-3.5 rounded-2xl bg-teal-50/70 dark:bg-teal-950/30 border border-teal-200/60 dark:border-teal-900/40 space-y-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-teal-800 dark:text-teal-300 block">
                        Como Usar / Modo de Aplicação:
                      </span>
                      <p className="text-xs text-slate-700 dark:text-slate-200 leading-relaxed font-medium">
                        {prod.comoUsar}
                      </p>
                    </div>

                    {/* Observações */}
                    {prod.observacao && (
                      <div className="p-3 rounded-xl bg-stone-50 dark:bg-slate-950/60 border border-stone-200/70 dark:border-slate-800 space-y-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                          Observações & Dicas da Profissional:
                        </span>
                        <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                          {prod.observacao}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ABA 4: PRÓXIMAS CONSULTAS (CALENDÁRIO SÓ LEITURA) */}
        {abaAtiva === 'consultas' && (
          <div className="space-y-4">
            {/* Aviso informativo de somente leitura */}
            <div className="p-4 rounded-2xl bg-teal-50/80 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800/60 flex items-start gap-3">
              <CalendarCheck className="w-5 h-5 text-teal-700 dark:text-teal-400 shrink-0 mt-0.5" />
              <div className="text-xs text-slate-700 dark:text-slate-300 space-y-1 leading-relaxed">
                <p className="font-bold text-teal-900 dark:text-teal-200">
                  Agenda de Consultas (Espaço Somente Leitura)
                </p>
                <p>
                  Confira suas datas e horários marcados. Caso precise desmarcar, reagendar ou tirar dúvidas, entre em contato direto com a clínica.
                </p>
              </div>
            </div>

            {agendamentos.length === 0 ? (
              <div className="p-8 sm:p-12 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-center space-y-3">
                <Calendar className="w-10 h-10 text-teal-600/40 mx-auto" />
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                  Nenhuma consulta futura agendada
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                  Você não possui nenhum retorno marcado no momento. Entre em contato com a equipe para marcar sua próxima avaliação.
                </p>
                {profissional?.telefone && (
                  <a
                    href={`https://wa.me/55${profissional.telefone.replace(/\D/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition-colors"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>Falar no WhatsApp da Clínica</span>
                  </a>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {agendamentos.map(ag => (
                  <div
                    key={ag.id}
                    className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800 text-teal-800 dark:text-teal-300 flex flex-col items-center justify-center font-bold shrink-0">
                        <span className="text-[10px] uppercase font-mono">
                          {new Date(ag.data + 'T00:00:00').toLocaleDateString('pt-BR', { weekday: 'short' })}
                        </span>
                        <span className="text-sm font-bold">
                          {ag.data.split('-')[2]}
                        </span>
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-teal-700 dark:text-teal-400 flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" />
                            <span>{ag.horario}</span>
                          </span>
                          <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 text-[10px] font-bold">
                            Confirmado
                          </span>
                        </div>
                        <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                          {ag.motivoTitulo || 'Consulta de Retorno Capilar'}
                        </h4>
                        {ag.observacoes && (
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {ag.observacoes}
                          </p>
                        )}
                      </div>
                    </div>

                    {profissional?.telefone && (
                      <a
                        href={`https://wa.me/55${profissional.telefone.replace(/\D/g, '')}?text=${encodeURIComponent(`Olá! Tenho uma dúvida sobre minha consulta agendada para ${ag.data} às ${ag.horario}.`)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors self-end sm:self-center"
                      >
                        <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Dúvidas sobre horário</span>
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* MODAL DE FOTO AMPLIADA */}
      {fotoModal && (
        <div
          className="fixed inset-0 z-50 flex flex-col items-center justify-start pt-6 sm:pt-10 p-3 sm:p-6 bg-slate-950/85 backdrop-blur-md overflow-y-auto overscroll-contain animate-fadeIn"
          onClick={() => setFotoModal(null)}
        >
          <div
            className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col mb-8 sm:mb-12"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  {fotoModal.titulo}
                </h3>
                {fotoModal.data && (
                  <span className="text-[10px] font-mono text-slate-400">
                    Capturada em: {fotoModal.data}
                  </span>
                )}
              </div>
              <button
                onClick={() => setFotoModal(null)}
                className="w-8 h-8 rounded-full glass-button flex items-center justify-center text-slate-500 hover:text-slate-800 dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-black flex items-center justify-center max-h-[70vh] p-2">
              <img
                src={fotoModal.url}
                alt={fotoModal.titulo}
                className="max-w-full max-h-[65vh] object-contain rounded-xl"
              />
            </div>

            <div className="p-3 bg-stone-50 dark:bg-slate-950 text-center">
              <span className="text-[11px] text-slate-500">
                Registro fototricoscópico de acompanhamento clínico
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
