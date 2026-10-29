import React, { useState, useEffect } from 'react';
import { CASOS_ATLAS, ACHADOS_TRICOSCOPICOS } from './data/tricoscopiaData';
import { CasoAtlas } from './types/tricoscopia';
import { useTheme } from './context/ThemeContext';
import { AtlasGridView } from './components/AtlasGridView';
import { FichaCasoView } from './components/FichaCasoView';
import { BuscaPorAchadoView } from './components/BuscaPorAchadoView';
import { MinhaCapturaView } from './components/MinhaCapturaView';
import { PacientesView } from './components/PacientesView';
import { PainelUsuarioView } from './components/PainelUsuarioView';
import { MeuPerfilView } from './components/MeuPerfilView';
import { AnamneseView } from './components/AnamneseView';
import { CalendarioView } from './components/CalendarioView';
import { PlanosView } from './components/PlanosView';
import { LembreteConsultaModal } from './components/LembreteConsultaModal';
import { LoginView } from './components/LoginView';
import { useAuth } from './context/AuthContext';
import { GerenciadorImagensModal } from './components/GerenciadorImagensModal';
import { recuperarImagensLegadas } from './utils/imageStore';
import { getConsultasMarcadasHoje, updateStatusAgendamento } from './services/agendamentoService';
import { Agendamento, StatusAgendamento } from './types/agendamento';
import { Paciente } from './types/paciente';
import { usuarioEhAdmin } from './utils/fotosNuvem';
import { temAcessoAtlas } from './types/assinatura';
import { PortalPacienteView } from './components/PortalPacienteView';
import { FluxoClinicoStepper } from './components/FluxoClinicoStepper';
import { 
  BookOpen, 
  Camera, 
  Search, 
  ShieldCheck, 
  Menu, 
  X, 
  Microscope, 
  Info, 
  Images, 
  Sun, 
  Moon, 
  GitCompare, 
  Sparkles, 
  Users, 
  LayoutDashboard, 
  User, 
  LogOut, 
  ChevronDown, 
  UserCheck, 
  Bell, 
  MessageSquare,
  FileText,
  Calendar as CalendarIcon,
  Crown,
  Heart,
  CreditCard,
  Settings
} from 'lucide-react';
import { ModalConfigurarStripe } from './components/ModalConfigurarStripe';

type TelaAtiva = 'atlas' | 'caso' | 'achados' | 'comparador' | 'captura' | 'pacientes' | 'painel' | 'login' | 'perfil' | 'anamnese' | 'calendario' | 'planos' | 'area-do-cliente';

export default function App() {
  const { theme, isDark, toggleTheme } = useTheme();
  const { usuarioAtual, estaAutenticado, logout, atualizarAssinatura } = useAuth();
  const usuarioTemAtlas = temAcessoAtlas(usuarioAtual);
  const [telaAtiva, setTelaAtiva] = useState<TelaAtiva>(() => {
    if (typeof window !== 'undefined') {
      if (window.location.pathname.startsWith('/area-do-cliente') || window.location.search.includes('token=')) {
        return 'area-do-cliente';
      }
      const params = new URLSearchParams(window.location.search);
      const urlTela = params.get('tela') || (window.location.hash ? window.location.hash.replace('#', '') : null);
      if (urlTela === 'area-do-cliente') {
        return 'area-do-cliente';
      }
      if (urlTela === 'fotos-atlas' || urlTela === 'gerenciador') {
        if (!usuarioEhAdmin()) {
          return 'painel';
        }
      }

      if (window.localStorage) {
        const savedUser = window.localStorage.getItem('trico_auth_user_active_v1');
        if (savedUser) {
          const savedTela = window.localStorage.getItem('trico_ultima_tela_v1');
          if (savedTela === 'minha-captura' || savedTela === 'minha_captura' || savedTela === 'Minha Captura' || savedTela === 'captura') {
            return 'captura';
          }
          if (savedTela === 'fotos-atlas' || savedTela === 'gerenciador') {
            if (!usuarioEhAdmin()) {
              return 'painel';
            }
          }
          if (savedTela && ['atlas', 'caso', 'achados', 'comparador', 'captura', 'pacientes', 'painel', 'login', 'perfil', 'anamnese', 'calendario'].includes(savedTela)) {
            return savedTela as TelaAtiva;
          }
          return 'painel';
        }
      }
    }
    return 'login';
  });

  // Salvar última tela aberta no localStorage
  useEffect(() => {
    if (typeof window !== 'undefined' && window.localStorage && estaAutenticado && telaAtiva !== 'area-do-cliente') {
      window.localStorage.setItem('trico_ultima_tela_v1', telaAtiva);
    }
  }, [telaAtiva, estaAutenticado]);

  // Monitorar mudanças de URL (ex: /area-do-cliente)
  useEffect(() => {
    const handleUrlChange = () => {
      if (typeof window !== 'undefined') {
        if (window.location.pathname.startsWith('/area-do-cliente') || window.location.search.includes('token=')) {
          setTelaAtiva('area-do-cliente');
        }
      }
    };
    window.addEventListener('popstate', handleUrlChange);
    return () => window.removeEventListener('popstate', handleUrlChange);
  }, []);

  const [gerenciadorImagensAberto, setGerenciadorImagensAberto] = useState<boolean>(false);

  // Monitoramento em tempo real do status de administrador (sem recarregar a página)
  const [ehAdmin, setEhAdmin] = useState<boolean>(() => usuarioEhAdmin());

  useEffect(() => {
    const checarAdmin = () => {
      const status = usuarioEhAdmin();
      setEhAdmin(status);
      // Se não for admin e tentar acessar gerenciador de fotos, redireciona para Meu Painel
      if (!status && gerenciadorImagensAberto) {
        setGerenciadorImagensAberto(false);
        setTelaAtiva('painel');
      }
    };

    checarAdmin();
  }, [usuarioAtual, estaAutenticado, gerenciadorImagensAberto]);

  const [menuUsuarioAberto, setMenuUsuarioAberto] = useState(false);
  const [casoSelecionadoId, setCasoSelecionadoId] = useState<string | null>(null);
  const [achadoSelecionadoId, setAchadoSelecionadoId] = useState<string | null>(null);
  
  // Paciente em Atendimento Ativo no Fluxo Clínico Global (1. Paciente -> 2. Anamnese -> 3. Tricoscopia)
  const [pacienteAtivoAtendimento, setPacienteAtivoAtendimento] = useState<Paciente | null>(() => {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const salvo = window.localStorage.getItem('trico_paciente_ativo_v2');
        if (salvo) return JSON.parse(salvo);
      } catch {}
    }
    return null;
  });

  // Salvar paciente ativo no localStorage
  useEffect(() => {
    if (typeof window !== 'undefined' && window.localStorage) {
      if (pacienteAtivoAtendimento) {
        window.localStorage.setItem('trico_paciente_ativo_v2', JSON.stringify(pacienteAtivoAtendimento));
      } else {
        window.localStorage.removeItem('trico_paciente_ativo_v2');
      }
    }
  }, [pacienteAtivoAtendimento]);

  const [pacienteSelecionadoParaCaptura, setPacienteSelecionadoParaCaptura] = useState<{ id: string; nome: string } | null>(() => {
    if (pacienteAtivoAtendimento) return { id: pacienteAtivoAtendimento.id, nome: pacienteAtivoAtendimento.nome };
    return null;
  });
  const [pacienteParaAnamnese, setPacienteParaAnamnese] = useState<Paciente | null>(() => pacienteAtivoAtendimento);
  const [sessaoSelecionadaParaBancadaId, setSessaoSelecionadaParaBancadaId] = useState<string | null>(null);
  const [modoBancadaAtual, setModoBancadaAtual] = useState<'registro' | 'analise'>('registro');

  // Função centralizada para definir paciente ativo em atendimento
  const handleDefinirPacienteAtivo = (pac: Paciente | null) => {
    setPacienteAtivoAtendimento(pac);
    setPacienteParaAnamnese(pac);
    if (pac) {
      setPacienteSelecionadoParaCaptura({ id: pac.id, nome: pac.nome });
    } else {
      setPacienteSelecionadoParaCaptura(null);
    }
  };

  // Passo atual do fluxo guiado (1: Paciente, 2: Anamnese, 3: Registro de Fotos por Área, 4: Contagem & Consulta)
  const passoAtualFluxo: 1 | 2 | 3 | 4 | null = 
    telaAtiva === 'pacientes' ? 1 :
    telaAtiva === 'anamnese' ? 2 :
    telaAtiva === 'captura' && modoBancadaAtual === 'registro' ? 3 :
    telaAtiva === 'captura' && modoBancadaAtual === 'analise' ? 4 : null;

  const handleNavegarPassoFluxo = (passo: 1 | 2 | 3 | 4) => {
    if (passo === 1) {
      setTelaAtiva('pacientes');
    } else if (passo === 2) {
      setTelaAtiva('anamnese');
    } else if (passo === 3) {
      setModoBancadaAtual('registro');
      setTelaAtiva('captura');
    } else if (passo === 4) {
      setModoBancadaAtual('analise');
      setTelaAtiva('captura');
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Consultas de hoje para Lembrete Pop-up global
  const [agendamentosHojeApp, setAgendamentosHojeApp] = useState<Agendamento[]>([]);
  const [modalLembreteGlobalAberto, setModalLembreteGlobalAberto] = useState(false);

  // Executa varredura e recuperação ativa do acervo
  useEffect(() => {
    recuperarImagensLegadas().catch(() => {});
    
    // Carregar lembrete de consultas hoje
    getConsultasMarcadasHoje(usuarioAtual?.uid).then(lista => {
      setAgendamentosHojeApp(lista);
      if (lista.length > 0) {
        const jaExibiu = typeof window !== 'undefined' && window.sessionStorage ? window.sessionStorage.getItem('trico_lembrete_hoje_v1') : null;
        if (!jaExibiu) {
          setModalLembreteGlobalAberto(true);
          if (typeof window !== 'undefined' && window.sessionStorage) {
            window.sessionStorage.setItem('trico_lembrete_hoje_v1', 'true');
          }
        }
      }
    }).catch(() => {});
  }, [usuarioAtual]);

  // Atualizar status de agendamento a partir do lembrete rápido
  const handleAtualizarStatusAgendamento = async (id: string, status: StatusAgendamento) => {
    try {
      await updateStatusAgendamento(id, status, usuarioAtual?.uid);
      setAgendamentosHojeApp(prev => prev.map(a => a.id === id ? { ...a, status } : a));
    } catch (err) {
      console.warn('Erro ao atualizar status do agendamento:', err);
    }
  };

  // Configuração e retorno do Stripe Checkout
  const [modalStripeAbertoGlobal, setModalStripeAbertoGlobal] = useState(false);
  const [toastStripeMensagem, setToastStripeMensagem] = useState<{ tipo: 'sucesso' | 'info'; texto: string } | null>(null);

  // Monitorar retorno de checkout da Stripe (?stripe_status=sucesso ou ?stripe_status=cancelado)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const stripeStatus = params.get('stripe_status');
    const sessionId = params.get('session_id');
    const planoParam = params.get('plano') || 'anual';

    if (stripeStatus === 'sucesso') {
      const planoAtivar = planoParam === 'mensal' ? 'mensal' : 'anual';
      
      // Sincroniza sessão no backend
      if (sessionId) {
        fetch('/api/stripe/verify-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId, usuarioUid: usuarioAtual?.uid })
        }).catch(() => {});
      }

      // Atualiza estado local da assinatura
      atualizarAssinatura(planoAtivar, planoAtivar, 'cartao').catch(() => {});

      setToastStripeMensagem({
        tipo: 'sucesso',
        texto: `🎉 Pagamento aprovado no Stripe! Sua assinatura do Plano ${planoAtivar === 'mensal' ? 'Mensal' : 'Anual'} foi ativada com sucesso.`
      });

      // Limpa os parâmetros da URL sem recarregar a página
      const urlLimpa = window.location.pathname;
      window.history.replaceState({}, document.title, urlLimpa);
      
      setTimeout(() => setToastStripeMensagem(null), 8000);
    } else if (stripeStatus === 'cancelado') {
      setToastStripeMensagem({
        tipo: 'info',
        texto: 'O processo de checkout no Stripe foi cancelado. Você pode concluir a qualquer momento.'
      });
      const urlLimpa = window.location.pathname;
      window.history.replaceState({}, document.title, urlLimpa);
      setTimeout(() => setToastStripeMensagem(null), 5000);
    }
  }, [usuarioAtual]);
  
  // Termo de busca global do header
  const [termoBuscaHeader, setTermoBuscaHeader] = useState('');
  const [menuMobileAberto, setMenuMobileAberto] = useState(false);

  // Navegar para ficha de um caso
  const handleAbrirCaso = (casoId: string) => {
    setCasoSelecionadoId(casoId);
    setTelaAtiva('caso');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Navegar para comparação de paciente
  const handleAbrirComparacao = (_casoAId?: string, _casoBId?: string) => {
    setTelaAtiva('pacientes');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Navegar para achado específico
  const handleAbrirAchado = (achadoId: string) => {
    setAchadoSelecionadoId(achadoId);
    setTelaAtiva('achados');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Voltar para a galeria
  const handleVoltarAtlas = () => {
    setTelaAtiva('atlas');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Iniciar exame/captura com paciente pré-selecionado (Modo Registro de Fotos)
  const handleIniciarCapturaPaciente = (paciente: { id: string; nome: string } | Paciente) => {
    handleDefinirPacienteAtivo(paciente as Paciente);
    setModoBancadaAtual('registro');
    setTelaAtiva('captura');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Carregar sessão de fototricoscopia na bancada (Modo Contagem & Consulta)
  const handleCarregarSessaoNaBancada = (sessionId: string) => {
    setSessaoSelecionadaParaBancadaId(sessionId);
    setModoBancadaAtual('analise');
    setTelaAtiva('captura');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Iniciar anamnese para paciente específico
  const handleIniciarAnamnesePaciente = (paciente: Paciente | { id: string; nome: string }) => {
    handleDefinirPacienteAtivo(paciente as Paciente);
    setTelaAtiva('anamnese');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Tratar busca global
  const handleBuscar = (e: React.FormEvent) => {
    e.preventDefault();
    if (!termoBuscaHeader.trim()) return;

    // Verificar se corresponde diretamente ao nome de um caso
    const casoExato = CASOS_ATLAS.find(c => 
      c.nome.toLowerCase().includes(termoBuscaHeader.toLowerCase())
    );

    if (casoExato) {
      handleAbrirCaso(casoExato.id);
    } else {
      setTelaAtiva('atlas');
    }
  };

  const casoAtual = CASOS_ATLAS.find(c => c.id === casoSelecionadoId);

  // Se estiver na Área do Cliente (Portal do Paciente - SÓ LEITURA)
  if (telaAtiva === 'area-do-cliente') {
    return (
      <div className={`min-h-screen ${isDark ? 'dark bg-[#030e0d]' : 'bg-slate-50'}`}>
        <PortalPacienteView
          onVoltarParaProfissional={() => {
            if (typeof window !== 'undefined' && window.history) {
              window.history.pushState({}, '', '/');
            }
            setTelaAtiva(estaAutenticado ? 'painel' : 'login');
          }}
        />
      </div>
    );
  }

  // TELA DE LOGIN TOTALMENTE ISOLADA (SEM SIDEBAR, SEM TOPBAR, ACESSO RESTRITO)
  if (!estaAutenticado || telaAtiva === 'login') {
    return (
      <div className={`min-h-screen ${isDark ? 'dark bg-[#030e0d]' : 'bg-slate-50'} flex flex-col font-sans transition-colors relative`}>
        {/* Controles de Topo: Alternador de Tema e Portal do Paciente */}
        <div className="absolute top-4 right-4 sm:top-6 sm:right-6 flex items-center gap-2.5 z-20">
          <button
            onClick={() => {
              if (typeof window !== 'undefined' && window.history) {
                window.history.pushState({}, '', '/area-do-cliente');
              }
              setTelaAtiva('area-do-cliente');
            }}
            className="text-xs px-3.5 py-2 rounded-xl text-teal-800 dark:text-teal-300 hover:bg-teal-50 dark:hover:bg-teal-950/60 font-semibold transition-all border border-teal-200/70 dark:border-teal-800/50 flex items-center gap-2 glass-card shadow-xs"
          >
            <Heart className="w-3.5 h-3.5 text-rose-500" />
            <span className="hidden sm:inline">Área do Paciente</span>
          </button>

          <button
            onClick={toggleTheme}
            className="p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white glass-button transition-colors"
            title={isDark ? 'Mudar para Modo Claro' : 'Mudar para Modo Escuro'}
          >
            {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
          </button>
        </div>

        {/* Formulário de Login / Cadastro Centralizado */}
        <main className="flex-1 flex items-center justify-center">
          <LoginView
            onLoginSucesso={() => {
              setTelaAtiva('painel');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen text-slate-800 dark:text-slate-100 flex flex-col lg:flex-row font-sans selection:bg-teal-500/20 selection:text-teal-900 dark:selection:bg-teal-500/30 dark:selection:text-teal-200 transition-colors">
      {/* OVERLAY PARA MOBILE QUANDO SIDEBAR ESTIVER ABERTA */}
      {menuMobileAberto && (
        <div 
          className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-40 lg:hidden animate-fadeIn" 
          onClick={() => setMenuMobileAberto(false)} 
        />
      )}

      {/* ========================================================================= */}
      {/* 1. SIDEBAR À ESQUERDA (FIXA NO DESKTOP, GAVETA DESLIZANTE NO MOBILE) */}
      {/* ========================================================================= */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-72 sidebar-teal-gradient flex flex-col justify-between transition-transform duration-300 ease-in-out lg:translate-x-0 ${
        menuMobileAberto ? 'translate-x-0 shadow-2xl' : '-translate-x-full lg:translate-x-0'
      }`}>
        {/* Topo da Sidebar: Logo & Identidade Clínica */}
        <div className="p-4 sm:p-5 border-b border-teal-200/60 dark:border-teal-500/20 flex items-center justify-between">
          <div 
            onClick={() => { setTelaAtiva('painel'); setMenuMobileAberto(false); }}
            className="flex items-center gap-3 cursor-pointer select-none group"
          >
            <div className="w-10 h-10 rounded-2xl bg-teal-700 text-white flex items-center justify-center group-hover:scale-105 transition-all shadow-md shadow-teal-700/30 shrink-0">
              <Microscope className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <span className="text-base font-bold text-slate-900 dark:text-slate-100 tracking-tight leading-tight block truncate">
                TricoCalazans
              </span>
              <span className="text-[11px] text-teal-800/90 dark:text-teal-300 font-medium truncate block">
                Manual & Prontuário Digital
              </span>
            </div>
          </div>

          <button 
            onClick={() => setMenuMobileAberto(false)}
            className="lg:hidden p-1.5 rounded-xl bg-white/60 dark:bg-white/10 text-slate-500 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
            title="Fechar Menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navegação da Sidebar: Seções e Links em PT/BR */}
        <div className="flex-1 overflow-y-auto p-3.5 space-y-5 scrollbar-thin">
          {/* SEÇÃO 1: ATENDIMENTO */}
          <div className="space-y-1">
            <span className="px-3 text-[10px] font-bold text-teal-900/70 dark:text-teal-300/70 uppercase tracking-wider block">
              ATENDIMENTO
            </span>

            {/* Item 1: Meu Painel — selo "Visão Geral" */}
            <button
              onClick={() => {
                if (estaAutenticado) {
                  setTelaAtiva('painel');
                } else {
                  setTelaAtiva('login');
                }
                setMenuMobileAberto(false);
              }}
              className={`w-full text-left px-3.5 py-2.5 rounded-xl flex items-center justify-between text-xs font-semibold transition-all ${
                telaAtiva === 'painel'
                  ? 'bg-teal-700 text-white shadow-md shadow-teal-700/25'
                  : 'text-slate-700 dark:text-slate-200 hover:text-teal-950 dark:hover:text-white hover:bg-white/60 dark:hover:bg-white/[0.08]'
              }`}
            >
              <div className="flex items-center gap-3">
                <LayoutDashboard className="w-4 h-4 shrink-0" />
                <span>Meu Painel</span>
              </div>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-mono ${
                telaAtiva === 'painel' 
                  ? 'bg-white/20 text-white' 
                  : 'bg-teal-500/10 text-teal-800 dark:text-teal-300'
              }`}>
                Visão Geral
              </span>
            </button>

            {/* Item 2: Agenda — subtítulo "Calendário" */}
            <button
              onClick={() => { 
                if (estaAutenticado) {
                  setTelaAtiva('calendario'); 
                } else {
                  setTelaAtiva('login');
                }
                setMenuMobileAberto(false); 
              }}
              className={`w-full text-left px-3.5 py-2.5 rounded-xl flex items-center justify-between text-xs font-semibold transition-all ${
                telaAtiva === 'calendario'
                  ? 'bg-teal-700 text-white shadow-md shadow-teal-700/25'
                  : 'text-slate-700 dark:text-slate-200 hover:text-teal-950 dark:hover:text-white hover:bg-white/60 dark:hover:bg-white/[0.08]'
              }`}
            >
              <div className="flex items-center gap-3">
                <CalendarIcon className={`w-4 h-4 shrink-0 ${telaAtiva === 'calendario' ? 'text-white' : 'text-teal-700 dark:text-teal-400'}`} />
                <span>Agenda</span>
              </div>
              {agendamentosHojeApp.length > 0 ? (
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                  telaAtiva === 'calendario' 
                    ? 'bg-white/20 text-white' 
                    : 'bg-teal-700 text-white animate-pulse'
                }`}>
                  {agendamentosHojeApp.length} hoje
                </span>
              ) : (
                <span className={`text-[10px] ${telaAtiva === 'calendario' ? 'text-white/80' : 'text-slate-400'}`}>
                  Calendário
                </span>
              )}
            </button>

            {/* Item 3: Pacientes — subtítulo "Prontuários" */}
            <button
              onClick={() => { 
                if (estaAutenticado) {
                  setTelaAtiva('pacientes'); 
                } else {
                  setTelaAtiva('login');
                }
                setMenuMobileAberto(false); 
              }}
              className={`w-full text-left px-3.5 py-2.5 rounded-xl flex items-center justify-between text-xs font-semibold transition-all ${
                telaAtiva === 'pacientes'
                  ? 'bg-teal-700 text-white shadow-md shadow-teal-700/25'
                  : 'text-slate-700 dark:text-slate-200 hover:text-teal-950 dark:hover:text-white hover:bg-white/60 dark:hover:bg-white/[0.08]'
              }`}
            >
              <div className="flex items-center gap-3">
                <Users className="w-4 h-4 shrink-0" />
                <span>Pacientes</span>
              </div>
              <span className={`text-[10px] ${telaAtiva === 'pacientes' ? 'text-white/80' : 'text-slate-400'}`}>
                Prontuários
              </span>
            </button>

            {/* Item 4: Anamnese — selo "Formulários" */}
            <button
              onClick={() => { 
                if (estaAutenticado) {
                  setTelaAtiva('anamnese'); 
                } else {
                  setTelaAtiva('login');
                }
                setMenuMobileAberto(false); 
              }}
              className={`w-full text-left px-3.5 py-2.5 rounded-xl flex items-center justify-between text-xs font-semibold transition-all ${
                telaAtiva === 'anamnese'
                  ? 'bg-teal-700 text-white shadow-md shadow-teal-700/25'
                  : 'text-slate-700 dark:text-slate-200 hover:text-teal-950 dark:hover:text-white hover:bg-white/60 dark:hover:bg-white/[0.08]'
              }`}
            >
              <div className="flex items-center gap-3">
                <FileText className={`w-4 h-4 shrink-0 ${telaAtiva === 'anamnese' ? 'text-white' : 'text-teal-700 dark:text-teal-400'}`} />
                <span>Anamnese</span>
              </div>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                telaAtiva === 'anamnese' 
                  ? 'bg-white/20 text-white' 
                  : 'bg-teal-500/15 text-teal-800 dark:text-teal-300'
              }`}>
                Formulários
              </span>
            </button>

            {/* Item 5: Tricoscopia — subtítulo "Bancada" */}
            <button
              onClick={() => { 
                if (estaAutenticado) {
                  setTelaAtiva('captura'); 
                } else {
                  setTelaAtiva('login');
                }
                setMenuMobileAberto(false); 
              }}
              className={`w-full text-left px-3.5 py-2.5 rounded-xl flex items-center justify-between text-xs font-semibold transition-all ${
                telaAtiva === 'captura'
                  ? 'bg-teal-700 text-white shadow-md shadow-teal-700/25'
                  : 'text-slate-700 dark:text-slate-200 hover:text-teal-950 dark:hover:text-white hover:bg-white/60 dark:hover:bg-white/[0.08]'
              }`}
            >
              <div className="flex items-center gap-3">
                <Camera className="w-4 h-4 shrink-0" />
                <span>Tricoscopia</span>
              </div>
              <span className={`text-[10px] ${telaAtiva === 'captura' ? 'text-white/80' : 'text-slate-400'}`}>
                Bancada
              </span>
            </button>
          </div>

          {/* SEÇÃO 2: ANÁLISE & REFERÊNCIA */}
          <div className="space-y-1">
            <span className="px-3 text-[10px] font-bold text-teal-900/70 dark:text-teal-300/70 uppercase tracking-wider block">
              ANÁLISE & REFERÊNCIA
            </span>

            {/* Item 1: Atlas Clínico — selo com o número de casos ou exclusivo planos pagos */}
            <button
              onClick={() => { 
                setTelaAtiva('atlas'); 
                setCasoSelecionadoId(null); 
                setMenuMobileAberto(false); 
              }}
              className={`w-full text-left px-3.5 py-2.5 rounded-xl flex items-center justify-between text-xs font-semibold transition-all ${
                telaAtiva === 'atlas' || telaAtiva === 'caso'
                  ? 'bg-teal-700 text-white shadow-md shadow-teal-700/25'
                  : 'text-slate-700 dark:text-slate-200 hover:text-teal-950 dark:hover:text-white hover:bg-white/60 dark:hover:bg-white/[0.08]'
              }`}
            >
              <div className="flex items-center gap-3">
                <BookOpen className="w-4 h-4 shrink-0" />
                <span>Atlas Clínico</span>
              </div>
              {usuarioTemAtlas ? (
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                  telaAtiva === 'atlas' || telaAtiva === 'caso'
                    ? 'bg-white/20 text-white' 
                    : 'bg-teal-500/15 text-teal-800 dark:text-teal-300'
                }`}>
                  {CASOS_ATLAS.length} casos
                </span>
              ) : (
                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-amber-400/20 text-amber-700 dark:text-amber-300 flex items-center gap-1 border border-amber-400/30">
                  <Crown className="w-3 h-3 text-amber-500" />
                  <span>Planos Pagos</span>
                </span>
              )}
            </button>

            {/* Item 2: Busca por Achado */}
            <button
              onClick={() => { 
                setTelaAtiva('achados'); 
                setAchadoSelecionadoId(null); 
                setMenuMobileAberto(false); 
              }}
              className={`w-full text-left px-3.5 py-2.5 rounded-xl flex items-center justify-between text-xs font-semibold transition-all ${
                telaAtiva === 'achados'
                  ? 'bg-teal-700 text-white shadow-md shadow-teal-700/25'
                  : 'text-slate-700 dark:text-slate-200 hover:text-teal-950 dark:hover:text-white hover:bg-white/60 dark:hover:bg-white/[0.08]'
              }`}
            >
              <div className="flex items-center gap-3">
                <Sparkles className="w-4 h-4 shrink-0 text-amber-500" />
                <span>Busca por Achado</span>
              </div>
            </button>
          </div>

          {/* SEÇÃO 3: MINHA CONTA */}
          <div className="space-y-1">
            <span className="px-3 text-[10px] font-bold text-teal-900/70 dark:text-teal-300/70 uppercase tracking-wider block">
              MINHA CONTA
            </span>

            {/* Item 1: Meu Perfil — subtítulo "Dados & Senha" */}
            <button
              onClick={() => { 
                if (estaAutenticado) {
                  setTelaAtiva('perfil'); 
                } else {
                  setTelaAtiva('login');
                }
                setMenuMobileAberto(false); 
              }}
              className={`w-full text-left px-3.5 py-2.5 rounded-xl flex items-center justify-between text-xs font-semibold transition-all ${
                telaAtiva === 'perfil'
                  ? 'bg-teal-700 text-white shadow-md shadow-teal-700/25'
                  : 'text-slate-700 dark:text-slate-200 hover:text-teal-950 dark:hover:text-white hover:bg-white/60 dark:hover:bg-white/[0.08]'
              }`}
            >
              <div className="flex items-center gap-3">
                <User className="w-4 h-4 shrink-0" />
                <span>Meu Perfil</span>
              </div>
              <span className={`text-[10px] ${telaAtiva === 'perfil' ? 'text-white/80' : 'text-slate-400'}`}>
                Dados & Senha
              </span>
            </button>

            {/* Item 3: Planos & Assinaturas */}
            <button
              onClick={() => { 
                setTelaAtiva('planos'); 
                setMenuMobileAberto(false); 
              }}
              className={`w-full text-left px-3.5 py-2.5 rounded-xl flex items-center justify-between text-xs font-semibold transition-all ${
                telaAtiva === 'planos'
                  ? 'bg-teal-700 text-white shadow-md shadow-teal-700/25'
                  : 'text-slate-700 dark:text-slate-200 hover:text-teal-950 dark:hover:text-white hover:bg-white/60 dark:hover:bg-white/[0.08]'
              }`}
            >
              <div className="flex items-center gap-3">
                <Crown className={`w-4 h-4 shrink-0 ${telaAtiva === 'planos' ? 'text-amber-300' : 'text-amber-500'}`} />
                <span>Planos & Assinatura</span>
              </div>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                telaAtiva === 'planos' 
                  ? 'bg-white/20 text-white' 
                  : 'bg-teal-500/15 text-teal-800 dark:text-teal-300'
              }`}>
                {usuarioAtual?.planoId === 'mensal' ? 'MENSAL' : 'ANUAL'}
              </span>
            </button>

            {/* Item 4: Área do Cliente (Portal do Paciente) */}
            <button
              onClick={() => { 
                if (typeof window !== 'undefined' && window.history) {
                  window.history.pushState({}, '', '/area-do-cliente');
                }
                setTelaAtiva('area-do-cliente');
                setMenuMobileAberto(false); 
              }}
              className="w-full text-left px-3.5 py-2.5 rounded-xl flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-200 hover:text-teal-950 dark:hover:text-white hover:bg-white/60 dark:hover:bg-white/[0.08] transition-all"
            >
              <div className="flex items-center gap-3">
                <Heart className="w-4 h-4 shrink-0 text-teal-600 dark:text-teal-400" />
                <span>Portal do Paciente</span>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-teal-500/10 text-teal-800 dark:text-teal-300">
                Área do Cliente
              </span>
            </button>

            {/* Item 5: Configurar Stripe */}
            <button
              onClick={() => { 
                setModalStripeAbertoGlobal(true);
                setMenuMobileAberto(false); 
              }}
              className="w-full text-left px-3.5 py-2.5 rounded-xl flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-200 hover:text-teal-950 dark:hover:text-white hover:bg-white/60 dark:hover:bg-white/[0.08] transition-all group"
            >
              <div className="flex items-center gap-3">
                <CreditCard className="w-4 h-4 shrink-0 text-teal-600 dark:text-teal-400 group-hover:scale-105 transition-transform" />
                <span>Configurar Stripe</span>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-teal-500/10 text-teal-800 dark:text-teal-300">
                Pagamentos
              </span>
            </button>
          </div>

          {/* SEÇÃO 4: ADMINISTRAÇÃO (visível SOMENTE para administradores) */}
          {ehAdmin && (
            <div className="space-y-1 animate-fadeIn">
              <span className="px-3 text-[10px] font-bold text-teal-900/70 dark:text-teal-300/70 uppercase tracking-wider block">
                ADMINISTRAÇÃO
              </span>

              {/* Item 1: Fotos do Atlas */}
              <button
                onClick={() => { 
                  setGerenciadorImagensAberto(true); 
                  setMenuMobileAberto(false); 
                }}
                className={`w-full text-left px-3.5 py-2.5 rounded-xl flex items-center justify-between text-xs font-semibold transition-all ${
                  gerenciadorImagensAberto
                    ? 'bg-teal-700 text-white shadow-md shadow-teal-700/25'
                    : 'text-slate-700 dark:text-slate-200 hover:text-teal-950 dark:hover:text-white hover:bg-white/60 dark:hover:bg-white/[0.08]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Images className="w-4 h-4 shrink-0 text-teal-600 dark:text-teal-400" />
                  <span>Fotos do Atlas</span>
                </div>
              </button>
            </div>
          )}
        </div>

        {/* Rodapé da Sidebar: Usuário Especialista & Alternador de Tema */}
        <div className="p-3.5 border-t border-teal-200/60 dark:border-teal-500/20 space-y-2.5">
          {/* Card do Usuário Logado ou Botão de Acesso */}
          {estaAutenticado && usuarioAtual ? (
            <div 
              onClick={() => { setTelaAtiva('perfil'); setMenuMobileAberto(false); }}
              className="bg-white/80 dark:bg-white/[0.06] p-2.5 rounded-2xl flex items-center justify-between gap-2 shadow-xs cursor-pointer hover:border-teal-500/40 border border-teal-200/60 dark:border-teal-500/20 transition-colors group"
              title="Clique para acessar Meu Perfil, Espaço Clínico e Senha"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-teal-600 to-teal-800 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform">
                  {usuarioAtual.nome.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate leading-tight group-hover:text-teal-700 dark:group-hover:text-teal-400 transition-colors">
                    {usuarioAtual.nome}
                  </p>
                  <p className="text-[10px] text-teal-800/80 dark:text-teal-300/80 truncate leading-tight mt-0.5">
                    {usuarioAtual.nomeDoEspaco || usuarioAtual.clinica || usuarioAtual.titulo || 'Meu Perfil'}
                  </p>
                </div>
              </div>

              <button
                onClick={async (e) => {
                  e.stopPropagation();
                  await logout();
                  setTelaAtiva('login');
                  setMenuMobileAberto(false);
                }}
                className="p-1.5 rounded-xl bg-white/60 dark:bg-white/10 text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors shrink-0"
                title="Sair do Sistema"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => { setTelaAtiva('login'); setMenuMobileAberto(false); }}
              className="w-full p-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition-all"
            >
              <User className="w-4 h-4" />
              <span>Acessar / Fazer Login</span>
            </button>
          )}

          {/* Alternador de Tema Escuro / Claro na Sidebar */}
          <button
            onClick={toggleTheme}
            className="w-full px-3 py-2 rounded-xl glass-button flex items-center justify-between text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
          >
            <div className="flex items-center gap-2">
              {isDark ? (
                <Sun className="w-3.5 h-3.5 text-amber-400" />
              ) : (
                <Moon className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
              )}
              <span>{isDark ? 'Modo Claro (Clean)' : 'Modo Noturno (Dark)'}</span>
            </div>
            <span className="text-[10px] text-slate-400 uppercase font-mono">
              {isDark ? 'Claro' : 'Escuro'}
            </span>
          </button>
        </div>
      </aside>

      {/* ========================================================================= */}
      {/* 2. ÁREA PRINCIPAL À DIREITA COM HEADER SUPERIOR FLUTUANTE */}
      {/* ========================================================================= */}
      <div className="flex-1 flex flex-col min-w-0 lg:pl-72 transition-all">
        {/* Topbar Superior em Vidro Fosco */}
        <header className="sticky top-0 z-30 glass-header px-4 sm:px-6 h-16 flex items-center justify-between gap-3 sm:gap-4">
          <div className="flex items-center gap-3">
            {/* Botão Hamburger para Mobile */}
            <button
              onClick={() => setMenuMobileAberto(true)}
              className="lg:hidden p-2 rounded-xl glass-button text-slate-600 dark:text-slate-300"
              title="Abrir Menu Lateral"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Título da Tela Ativa */}
            <div>
              <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 leading-tight">
                {telaAtiva === 'painel' && 'Meu Painel Clínico'}
                {telaAtiva === 'calendario' && 'Agenda & Calendário Clínico'}
                {telaAtiva === 'perfil' && 'Meu Perfil & Segurança'}
                {telaAtiva === 'anamnese' && 'Anamnese Digital & Formulários'}
                {telaAtiva === 'atlas' && 'Atlas de Tricoscopia'}
                {telaAtiva === 'caso' && (casoAtual ? casoAtual.nome : 'Ficha Clínica')}
                {telaAtiva === 'captura' && 'Tricoscopia'}
                {telaAtiva === 'pacientes' && 'Prontuário de Pacientes'}
                {telaAtiva === 'achados' && 'Busca por Achado Tricoscópico'}
                {telaAtiva === 'comparador' && 'Comparador de Exames'}
              </h2>
              <p className="text-[10px] text-slate-400 hidden sm:block">
                Sistema Digital de Análise e Apoio Dermatológico
              </p>
            </div>
          </div>

          {/* Busca Rápida e Ações Rápidas à Direita */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Campo de Busca Global */}
            <form onSubmit={handleBuscar} className="relative w-36 sm:w-56 md:w-72">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={termoBuscaHeader}
                onChange={(e) => setTermoBuscaHeader(e.target.value)}
                placeholder="Pesquisar caso, paciente ou achado..."
                className="w-full glass-input pl-8 pr-3 py-1.5 text-xs placeholder:text-slate-400 placeholder:text-[11px]"
              />
              {termoBuscaHeader && (
                <button
                  type="button"
                  onClick={() => setTermoBuscaHeader('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </form>

            {/* Botão Notificações / Lembretes de Consultas */}
            <button
              onClick={() => setModalLembreteGlobalAberto(true)}
              className="w-8 h-8 rounded-xl glass-button flex items-center justify-center text-slate-600 dark:text-slate-300 relative shrink-0"
              title="Lembretes de Consultas Marcadas para Hoje"
            >
              <Bell className="w-3.5 h-3.5 text-teal-700 dark:text-teal-400" />
              {agendamentosHojeApp.length > 0 && (
                <span className="w-2 h-2 rounded-full bg-teal-700 dark:bg-teal-400 absolute top-1.5 right-1.5 ring-2 ring-white dark:ring-slate-900 animate-pulse" />
              )}
            </button>

            {/* Botão de Planos & Assinatura no Header */}
            {estaAutenticado && (
              <button
                onClick={() => { setTelaAtiva('planos'); }}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl glass-button text-xs font-semibold text-teal-800 dark:text-teal-300 hover:border-teal-500/50 shrink-0"
                title="Gerenciar Assinatura e Planos"
              >
                <Crown className="w-3.5 h-3.5 text-amber-500" />
                <span>Planos</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-teal-500/15 text-teal-800 dark:text-teal-300 font-bold uppercase">
                  {usuarioAtual?.planoId === 'mensal' ? 'MENSAL' : 'ANUAL'}
                </span>
              </button>
            )}

            {/* Alternador de Tema no Header */}
            <button
              onClick={toggleTheme}
              className="w-8 h-8 rounded-xl glass-button flex items-center justify-center text-slate-600 dark:text-slate-300 shrink-0"
              title={isDark ? "Alternar para Modo Claro" : "Alternar para Modo Noturno"}
            >
              {isDark ? (
                <Sun className="w-3.5 h-3.5 text-amber-400" />
              ) : (
                <Moon className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
              )}
            </button>

            {/* Dropdown Rápido do Usuário */}
            {estaAutenticado && usuarioAtual && (
              <div className="relative shrink-0">
                <button
                  onClick={() => setMenuUsuarioAberto(!menuUsuarioAberto)}
                  className="glass-button flex items-center gap-2 p-1 pr-2.5 rounded-2xl hover:scale-[1.01] transition-all"
                  title="Menu do Especialista"
                >
                  <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-teal-600 to-teal-800 text-white font-bold text-[11px] flex items-center justify-center shrink-0 shadow-xs">
                    {usuarioAtual.nome.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()}
                  </div>
                  <div className="text-left hidden sm:block min-w-0 max-w-[100px]">
                    <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate leading-tight">
                      {usuarioAtual.nome.split(' ')[0]}
                    </p>
                  </div>
                  <ChevronDown className="w-3 h-3 text-slate-400" />
                </button>

                {menuUsuarioAberto && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setMenuUsuarioAberto(false)} />
                    <div className="absolute right-0 mt-2 w-64 glass-card p-2 z-50 animate-fadeIn text-xs space-y-1 shadow-2xl">
                      <div className="p-2 border-b border-slate-200/60 dark:border-white/[0.08]">
                        <p className="font-semibold text-slate-900 dark:text-slate-100 truncate">{usuarioAtual.nome}</p>
                        <p className="text-[10px] text-slate-400 truncate">{usuarioAtual.email}</p>
                        {usuarioAtual.registro && (
                          <span className="inline-block mt-1 px-1.5 py-0.5 rounded-md glass-button text-[9px] font-mono text-slate-600 dark:text-slate-300">
                            {usuarioAtual.registro}
                          </span>
                        )}
                      </div>

                      <button
                        onClick={() => { setTelaAtiva('painel'); setMenuUsuarioAberto(false); }}
                        className="w-full text-left px-2.5 py-2 rounded-xl hover:bg-white/60 dark:hover:bg-white/[0.06] text-slate-700 dark:text-slate-300 flex items-center gap-2 font-medium transition-colors"
                      >
                        <LayoutDashboard className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                        <span>Meu Painel Clínico</span>
                      </button>

                      <button
                        onClick={() => { setTelaAtiva('perfil'); setMenuUsuarioAberto(false); }}
                        className="w-full text-left px-2.5 py-2 rounded-xl hover:bg-white/60 dark:hover:bg-white/[0.06] text-slate-700 dark:text-slate-300 flex items-center gap-2 font-medium transition-colors"
                      >
                        <User className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                        <span>Meu Perfil & Senha</span>
                      </button>

                      <button
                        onClick={() => { setTelaAtiva('planos'); setMenuUsuarioAberto(false); }}
                        className="w-full text-left px-2.5 py-2 rounded-xl hover:bg-white/60 dark:hover:bg-white/[0.06] text-slate-700 dark:text-slate-300 flex items-center justify-between font-medium transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <Crown className="w-4 h-4 text-amber-500" />
                          <span>Planos & Assinatura</span>
                        </div>
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-teal-500/15 text-teal-800 dark:text-teal-300 font-bold uppercase">
                          {usuarioAtual.planoId === 'mensal' ? 'MENSAL' : 'ANUAL'}
                        </span>
                      </button>

                      <button
                        onClick={() => { setModalStripeAbertoGlobal(true); setMenuUsuarioAberto(false); }}
                        className="w-full text-left px-2.5 py-2 rounded-xl hover:bg-white/60 dark:hover:bg-white/[0.06] text-slate-700 dark:text-slate-300 flex items-center justify-between font-medium transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <CreditCard className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                          <span>Configurar Stripe</span>
                        </div>
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-teal-500/15 text-teal-800 dark:text-teal-300 font-bold">
                          Gateway
                        </span>
                      </button>

                      <button
                        onClick={() => { setTelaAtiva('pacientes'); setMenuUsuarioAberto(false); }}
                        className="w-full text-left px-2.5 py-2 rounded-xl hover:bg-white/60 dark:hover:bg-white/[0.06] text-slate-700 dark:text-slate-300 flex items-center gap-2 font-medium transition-colors"
                      >
                        <Users className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                        <span>Meus Pacientes</span>
                      </button>

                      <button
                        onClick={() => { setTelaAtiva('login'); setMenuUsuarioAberto(false); }}
                        className="w-full text-left px-2.5 py-2 rounded-xl hover:bg-white/60 dark:hover:bg-white/[0.06] text-slate-700 dark:text-slate-300 flex items-center gap-2 font-medium transition-colors"
                      >
                        <UserCheck className="w-4 h-4 text-emerald-500" />
                        <span>Trocar de Especialista</span>
                      </button>

                      <button
                        onClick={async () => {
                          setMenuUsuarioAberto(false);
                          await logout();
                          setTelaAtiva('login');
                        }}
                        className="w-full text-left px-2.5 py-2 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 flex items-center gap-2 font-semibold border-t border-slate-200/60 dark:border-white/[0.08] pt-1.5 transition-colors"
                      >
                        <LogOut className="w-4 h-4 text-rose-500" />
                        <span>Sair do Sistema</span>
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </header>

        {/* BARRA DO FLUXO CLÍNICO GUIADO (PASSO 1: PACIENTE -> PASSO 2: ANAMNESE -> PASSO 3: TRICOSCOPIA) */}
        {estaAutenticado && (['pacientes', 'anamnese', 'captura'].includes(telaAtiva) || pacienteAtivoAtendimento !== null) && (
          <FluxoClinicoStepper
            passoAtual={passoAtualFluxo}
            pacienteAtivo={pacienteAtivoAtendimento}
            onNavegarPasso={handleNavegarPassoFluxo}
            onTrocarPaciente={() => {
              setTelaAtiva('pacientes');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onLimparPacienteAtivo={() => handleDefinirPacienteAtivo(null)}
          />
        )}

        {/* Conteúdo Principal Dinâmico Conforme Tela Ativa */}
        <main className="flex-1 pb-16">
          {telaAtiva === 'painel' && (
            <PainelUsuarioView
              onNavegarPara={(tela) => {
                setTelaAtiva(tela);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              onSelecionarPaciente={(paciente) => {
                handleIniciarCapturaPaciente({ id: paciente.id, nome: paciente.nome });
              }}
              onCarregarSessaoNaBancada={(sessionId) => {
                handleCarregarSessaoNaBancada(sessionId);
              }}
              onSelecionarCasoAtlas={(casoId) => {
                handleAbrirCaso(casoId);
              }}
            />
          )}

          {telaAtiva === 'perfil' && (
            <MeuPerfilView
              onVoltarParaPainel={() => {
                setTelaAtiva('painel');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              onNavegarParaPlanos={() => {
                setTelaAtiva('planos');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            />
          )}

          {telaAtiva === 'planos' && (
            <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-6">
              <PlanosView />
            </div>
          )}

          {telaAtiva === 'calendario' && (
            <CalendarioView
              onVoltarParaPainel={() => {
                setTelaAtiva('painel');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              onIniciarExamePaciente={handleIniciarCapturaPaciente}
              onIniciarAnamnesePaciente={handleIniciarAnamnesePaciente}
            />
          )}

          {telaAtiva === 'anamnese' && (
            <AnamneseView
              pacientePreSelecionado={pacienteParaAnamnese ? (pacienteParaAnamnese as any) : null}
              onVoltarParaPainel={() => {
                setTelaAtiva('painel');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              onSelecionarPaciente={(paciente) => {
                handleDefinirPacienteAtivo(paciente);
              }}
              onAvancarParaTricoscopia={(paciente) => {
                handleDefinirPacienteAtivo(paciente);
                setModoBancadaAtual('registro');
                setTelaAtiva('captura');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              onNavegarParaPlanos={() => {
                setTelaAtiva('planos');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            />
          )}

          {telaAtiva === 'atlas' && (
            <AtlasGridView
              onSelecionarCaso={handleAbrirCaso}
              onAbrirAchado={handleAbrirAchado}
              onAbrirComparacao={handleAbrirComparacao}
              onAbrirGerenciadorImagens={ehAdmin ? () => setGerenciadorImagensAberto(true) : undefined}
              termoBuscaGlobal={termoBuscaHeader}
              onLimparBuscaGlobal={() => setTermoBuscaHeader('')}
              onNavegarParaPlanos={() => setTelaAtiva('planos')}
            />
          )}

          {telaAtiva === 'caso' && casoAtual && (
            <FichaCasoView
              caso={casoAtual}
              onVoltar={handleVoltarAtlas}
              onSelecionarCaso={handleAbrirCaso}
              onAbrirComparacao={handleAbrirComparacao}
              onAbrirAchado={handleAbrirAchado}
              onNavegarParaPlanos={() => setTelaAtiva('planos')}
            />
          )}

          {telaAtiva === 'achados' && (
            <BuscaPorAchadoView
              onSelecionarCaso={handleAbrirCaso}
              achadoInicialId={achadoSelecionadoId}
            />
          )}

          {telaAtiva === 'captura' && (
            <MinhaCapturaView
              onSelecionarCaso={handleAbrirCaso}
              pacienteInicial={pacienteSelecionadoParaCaptura}
              sessaoInicialId={sessaoSelecionadaParaBancadaId}
              onLimparSessaoInicial={() => setSessaoSelecionadaParaBancadaId(null)}
              modoInicial={modoBancadaAtual}
              onMudarModoBancada={(modo) => setModoBancadaAtual(modo)}
              onNavegarParaAnamnese={() => {
                setTelaAtiva('anamnese');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              onNavegarParaPacientes={() => {
                setTelaAtiva('pacientes');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            />
          )}

          {(telaAtiva === 'pacientes' || telaAtiva === 'comparador') && (
            <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-6">
              <PacientesView
                pacienteAtivoId={pacienteAtivoAtendimento?.id || null}
                onDefinirPacienteAtivo={handleDefinirPacienteAtivo}
                onIniciarCapturaPaciente={handleIniciarCapturaPaciente}
                onIniciarAnamnese={(paciente) => handleIniciarAnamnesePaciente(paciente)}
                onCarregarSessaoNaBancada={handleCarregarSessaoNaBancada}
                abaInicial={telaAtiva === 'comparador' ? 'comparador' : undefined}
                onNavegarParaPlanos={() => {
                  setTelaAtiva('planos');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
              />
            </div>
          )}
        </main>

        {/* Rodapé Clínico Discreto e Profissional estilo Glass */}
        <footer className="border-t border-slate-200/60 dark:border-white/[0.06] glass-header py-6 px-4 sm:px-6 pb-12 text-xs text-slate-500 dark:text-slate-400 transition-colors">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-teal-600 dark:text-teal-400" />
              <span className="text-slate-700 dark:text-slate-300 font-medium">TricoCalazans</span>
              <span className="text-slate-400">· Suporte Clínico & Dermatoscopia Digital</span>
            </div>
            <p className="text-[11px] text-slate-400">
              Apoio visual à consulta e raciocínio dermatológico.
            </p>
          </div>
        </footer>
      </div>

      {/* Rodapé Fixo em Todas as Telas */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-slate-900/80 dark:bg-black/80 backdrop-blur-md text-slate-400 py-1 px-4 text-center text-[10px] font-mono border-t border-white/[0.06] pointer-events-none">
        Material de apoio educacional e clínico. Não substitui avaliação médica presencial.
      </div>

      {/* Modal Gerenciador de Imagens do Atlas (Apenas Administrador) */}
      {ehAdmin && (
        <GerenciadorImagensModal
          isOpen={gerenciadorImagensAberto}
          onClose={() => setGerenciadorImagensAberto(false)}
          onAbrirCaso={handleAbrirCaso}
        />
      )}

      {/* Pop-up Global de Lembrete de Consultas Marcadas para Hoje */}
      <LembreteConsultaModal
        isOpen={modalLembreteGlobalAberto}
        onClose={() => setModalLembreteGlobalAberto(false)}
        agendamentosHoje={agendamentosHojeApp}
        onIniciarAtendimento={(ag) => {
          handleIniciarCapturaPaciente({ id: ag.pacienteId, nome: ag.pacienteNome });
        }}
        onNavegarParaCalendario={() => {
          setTelaAtiva('calendario');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        onAtualizarStatus={handleAtualizarStatusAgendamento}
      />

      {/* Notificação Toast Flutuante de Retorno do Stripe Checkout */}
      {toastStripeMensagem && (
        <div className="fixed bottom-6 right-6 z-50 max-w-md animate-bounce-subtle">
          <div className={`p-4 rounded-2xl shadow-2xl flex items-center justify-between gap-3 text-xs font-semibold ${
            toastStripeMensagem.tipo === 'sucesso'
              ? 'bg-emerald-600 text-white shadow-emerald-700/30'
              : 'bg-slate-800 text-white shadow-slate-900/30'
          }`}>
            <div className="flex items-center gap-2.5">
              <Sparkles className="w-4 h-4 text-amber-300 shrink-0" />
              <span>{toastStripeMensagem.texto}</span>
            </div>
            <button
              onClick={() => setToastStripeMensagem(null)}
              className="p-1 hover:bg-white/20 rounded-lg text-white shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Modal Global de Configuração do Stripe */}
      <ModalConfigurarStripe
        isOpen={modalStripeAbertoGlobal}
        onClose={() => setModalStripeAbertoGlobal(false)}
        onAbrirCheckoutTeste={() => setTelaAtiva('planos')}
      />
    </div>
  );
}
