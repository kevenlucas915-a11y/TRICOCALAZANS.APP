import React, { useState, useEffect, useMemo } from 'react';
import { 
  User, 
  Building, 
  Award, 
  Users, 
  Camera, 
  Clock, 
  Flame, 
  Microscope, 
  Edit3, 
  Save, 
  X, 
  ArrowRight, 
  ArrowUpRight,
  ShieldCheck, 
  Calendar, 
  FileText, 
  LogOut,
  Sparkles,
  ChevronRight,
  Filter,
  CheckCircle2,
  TrendingUp,
  Activity,
  Layers,
  ChevronDown,
  UserPlus,
  Search,
  BookOpen,
  GitCompare,
  Eye,
  Crown,
  Lock
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { temAcessoAtlas } from '../types/assinatura';
import { Paciente, ConsultaRegistro } from '../types/paciente';
import { listPacientes, getConsultasDoPaciente, savePaciente } from '../services/pacientes';
import { listAgendamentos } from '../services/agendamentoService';
import { listSessions, Session } from '../services/annotations';
import { listTodasRespostas } from '../services/anamneseService';
import { CASOS_ATLAS } from '../data/tricoscopiaData';
import { CasoAtlas } from '../types/tricoscopia';
import { TricoscopyViewer } from './TricoscopyViewer';

interface PainelUsuarioViewProps {
  onNavegarPara: (tela: 'atlas' | 'captura' | 'pacientes' | 'comparador' | 'achados' | 'perfil' | 'anamnese' | 'calendario' | 'planos') => void;
  onSelecionarPaciente: (paciente: Paciente) => void;
  onCarregarSessaoNaBancada: (sessionId: string) => void;
  onSelecionarCasoAtlas?: (casoId: string) => void;
}

export const PainelUsuarioView: React.FC<PainelUsuarioViewProps> = ({
  onNavegarPara,
  onSelecionarPaciente,
  onCarregarSessaoNaBancada,
  onSelecionarCasoAtlas
}) => {
  const { usuarioAtual, atualizarPerfil } = useAuth();
  const temAcesso = temAcessoAtlas(usuarioAtual);
  const [pacientesDoUsuario, setPacientesDoUsuario] = useState<Paciente[]>([]);
  const [consultasRecentes, setConsultasRecentes] = useState<ConsultaRegistro[]>([]);
  const [sessoesDoUsuario, setSessoesDoUsuario] = useState<Session[]>([]);
  const [totalAgendasCount, setTotalAgendasCount] = useState(0);
  const [totalSessoesCount, setTotalSessoesCount] = useState(0);
  const [totalAnamnesesCount, setTotalAnamnesesCount] = useState(0);
  const [carregandoDados, setCarregandoDados] = useState(true);
  const [periodoFiltro, setPeriodoFiltro] = useState<'30d' | '7d' | 'ano'>('30d');
  const [filtroAberto, setFiltroAberto] = useState(false);

  // Busca e filtro da função Atlas integrada no Dashboard
  const [termoBuscaAtlas, setTermoBuscaAtlas] = useState('');
  const [categoriaAtlasAtiva, setCategoriaAtlasAtiva] = useState<string>('Todas');

  // Modal para editar dados da clínica / laudo
  const [modalEditarPerfil, setModalEditarPerfil] = useState(false);
  const [formNome, setFormNome] = useState('');
  const [formTitulo, setFormTitulo] = useState('');
  const [formRegistro, setFormRegistro] = useState('');
  const [formClinica, setFormClinica] = useState('');
  const [salvandoPerfil, setSalvandoPerfil] = useState(false);

  // Modal para cadastro rápido de novo paciente
  const [modalNovoPaciente, setModalNovoPaciente] = useState(false);
  const [novoNome, setNovoNome] = useState('');
  const [novoTelefone, setNovoTelefone] = useState('');
  const [novaQueixa, setNovaQueixa] = useState('');
  const [salvandoPaciente, setSalvandoPaciente] = useState(false);

  const carregarMetricas = async () => {
    if (!usuarioAtual) return;
    setCarregandoDados(true);
    try {
      const [listaPac, listaAg, listaSess, listaResp] = await Promise.all([
        listPacientes(usuarioAtual.uid),
        listAgendamentos(usuarioAtual.uid),
        listSessions(usuarioAtual.uid),
        listTodasRespostas(usuarioAtual.uid)
      ]);

      setPacientesDoUsuario(listaPac);
      setSessoesDoUsuario(listaSess);
      setTotalAgendasCount(listaAg.length);
      setTotalSessoesCount(listaSess.length);
      setTotalAnamnesesCount(listaResp.length);

      const todasConsultas: ConsultaRegistro[] = [];
      for (const pac of listaPac.slice(0, 10)) {
        const cons = await getConsultasDoPaciente(pac);
        todasConsultas.push(...cons);
      }
      todasConsultas.sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());
      setConsultasRecentes(todasConsultas.slice(0, 8));
    } catch (err) {
      console.warn('Erro ao carregar dados do painel do usuário:', err);
    } finally {
      setCarregandoDados(false);
    }
  };

  useEffect(() => {
    if (!usuarioAtual) return;

    setFormNome(usuarioAtual.nome);
    setFormTitulo(usuarioAtual.titulo || '');
    setFormRegistro(usuarioAtual.registro || '');
    setFormClinica(usuarioAtual.clinica || '');

    carregarMetricas();
  }, [usuarioAtual]);

  const handleSalvarPerfil = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formNome.trim()) return;

    setSalvandoPerfil(true);
    try {
      await atualizarPerfil({
        nome: formNome,
        titulo: formTitulo,
        registro: formRegistro,
        clinica: formClinica
      });
      setModalEditarPerfil(false);
    } catch {
      alert('Erro ao atualizar dados do perfil.');
    } finally {
      setSalvandoPerfil(false);
    }
  };

  const handleCadastrarPacienteRapido = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!novoNome.trim()) return;

    setSalvandoPaciente(true);
    try {
      const criado = await savePaciente({
        userId: usuarioAtual?.uid,
        nome: novoNome.trim(),
        telefone: novoTelefone.trim(),
        queixaPrincipal: novaQueixa.trim(),
        historicoClinico: ''
      });
      setModalNovoPaciente(false);
      setNovoNome('');
      setNovoTelefone('');
      setNovaQueixa('');
      await carregarMetricas();
      onSelecionarPaciente(criado);
    } catch {
      alert('Erro ao cadastrar novo paciente.');
    } finally {
      setSalvandoPaciente(false);
    }
  };

  // Filtragem dinâmica dos casos do Atlas dentro da função do Dashboard
  const casosAtlasFiltrados = useMemo(() => {
    const q = termoBuscaAtlas.toLowerCase().trim();
    return CASOS_ATLAS.filter(caso => {
      const matchCat = categoriaAtlasAtiva === 'Todas' || caso.categoria === categoriaAtlasAtiva;
      if (!matchCat) return false;
      if (!q) return true;
      return (
        caso.nome.toLowerCase().includes(q) ||
        caso.padrao.toLowerCase().includes(q) ||
        caso.achadosTricoscopicos.some(a => a.toLowerCase().includes(q))
      );
    });
  }, [termoBuscaAtlas, categoriaAtlasAtiva]);

  // Distribuição mensal real das sessões de fototricoscopia do usuário
  const sessoesPorMes = useMemo(() => {
    const contagem = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    const anoAtual = new Date().getFullYear();
    for (const s of sessoesDoUsuario) {
      if (s.session_date) {
        const d = new Date(s.session_date);
        if (!isNaN(d.getTime())) {
          if (d.getFullYear() === anoAtual || periodoFiltro === 'ano') {
            contagem[d.getMonth()]++;
          }
        }
      }
    }
    return contagem;
  }, [sessoesDoUsuario, periodoFiltro]);

  const maxSessoesMes = Math.max(...sessoesPorMes, 1);
  const totalSessoesAno = sessoesPorMes.reduce((a, b) => a + b, 0);

  if (!usuarioAtual) return null;

  // Métricas do consultório do especialista autenticado (estritamente reais)
  const totalPacientesAtivos = pacientesDoUsuario.length;
  const totalAgendas = totalAgendasCount;
  const totalSessoesRealizadas = totalSessoesCount;
  const totalAnamnesesFeitas = totalAnamnesesCount;
  const totalNumeroClientes = pacientesDoUsuario.length;
  const totalCasosAtlas = CASOS_ATLAS.length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 pt-5 pb-16 animate-fadeIn">
      {/* 1. CABEÇALHO DO PAINEL CLÍNICO */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
              Painel Clínico
            </h1>
            <span className="text-xs font-medium text-slate-400 dark:text-slate-500">
              · Gestão & Análise Capilar
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {usuarioAtual.clinica ? `${usuarioAtual.clinica} · ` : ''}
            {usuarioAtual.nome} {usuarioAtual.registro ? `(${usuarioAtual.registro})` : ''}
          </p>
        </div>

        {/* Botões de Ação do Especialista */}
        <div className="flex items-center gap-2">
          {/* Seletor de Período em Vidro Fosco */}
          <div className="relative">
            <button
              onClick={() => setFiltroAberto(!filtroAberto)}
              className="glass-button px-3 py-1.5 text-xs font-medium flex items-center gap-1.5 select-none"
            >
              <span>
                {periodoFiltro === '30d' && 'Últimos 30 Dias'}
                {periodoFiltro === '7d' && 'Últimos 7 Dias'}
                {periodoFiltro === 'ano' && 'Ano Vigente (2026)'}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {filtroAberto && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setFiltroAberto(false)} />
                <div className="absolute right-0 mt-1.5 w-44 glass-card p-1.5 z-40 text-xs shadow-xl animate-fadeIn space-y-0.5">
                  <button
                    onClick={() => { setPeriodoFiltro('7d'); setFiltroAberto(false); }}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg transition-colors ${
                      periodoFiltro === '7d' 
                        ? 'bg-teal-500/10 text-teal-700 dark:text-teal-300 font-semibold' 
                        : 'text-slate-700 dark:text-slate-300 hover:bg-white/10'
                    }`}
                  >
                    Últimos 7 Dias
                  </button>
                  <button
                    onClick={() => { setPeriodoFiltro('30d'); setFiltroAberto(false); }}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg transition-colors ${
                      periodoFiltro === '30d' 
                        ? 'bg-teal-500/10 text-teal-700 dark:text-teal-300 font-semibold' 
                        : 'text-slate-700 dark:text-slate-300 hover:bg-white/10'
                    }`}
                  >
                    Últimos 30 Dias
                  </button>
                  <button
                    onClick={() => { setPeriodoFiltro('ano'); setFiltroAberto(false); }}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg transition-colors ${
                      periodoFiltro === 'ano' 
                        ? 'bg-teal-500/10 text-teal-700 dark:text-teal-300 font-semibold' 
                        : 'text-slate-700 dark:text-slate-300 hover:bg-white/10'
                    }`}
                  >
                    Ano Vigente (2026)
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Botão Novo Paciente */}
          <button
            onClick={() => setModalNovoPaciente(true)}
            className="px-3 py-1.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-medium text-xs flex items-center gap-1.5 shadow-sm shadow-teal-700/25 transition-all"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Novo Paciente</span>
          </button>

          {/* Botão Agenda / Calendário */}
          <button
            onClick={() => onNavegarPara('calendario')}
            className="px-3 py-1.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-medium text-xs flex items-center gap-1.5 shadow-sm shadow-teal-700/25 transition-all"
            title="Acessar calendário clínico e agendamentos"
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Agenda</span>
          </button>

          {/* Botão Anamnese Digital */}
          <button
            onClick={() => onNavegarPara('anamnese')}
            className="px-3 py-1.5 rounded-xl bg-teal-700/80 hover:bg-teal-800 text-white font-medium text-xs flex items-center gap-1.5 shadow-sm shadow-teal-700/25 transition-all"
            title="Acessar questionários clínicos e criar novos formulários"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Anamnese</span>
          </button>

          {/* Botão Meu Perfil & Segurança */}
          <button
            onClick={() => onNavegarPara('perfil')}
            className="glass-button px-3 py-1.5 text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white font-medium text-xs flex items-center gap-1.5 shadow-xs transition-all"
            title="Acessar Meu Perfil, Espaço e Alterar Senha"
          >
            <User className="w-3.5 h-3.5 text-teal-700 dark:text-teal-400" />
            <span>Meu Perfil</span>
          </button>

          {/* Botão Editar Dados da Clínica Rápido */}
          <button
            onClick={() => setModalEditarPerfil(true)}
            className="glass-button p-2 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
            title="Edição rápida de dados da clínica e laudos"
          >
            <Edit3 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 2. OS CARDS DE OPÇÕES E MÉTRICAS DO DASHBOARD PRINCIPAL */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-3.5">
        {/* CARD 1: PACIENTES ATIVOS */}
        <div 
          onClick={() => onNavegarPara('pacientes')}
          className="glass-card p-4 cursor-pointer group hover:scale-[1.02] transition-all"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Pacientes Ativos
            </span>
            <div className="w-7 h-7 rounded-xl glass-button flex items-center justify-center text-teal-700 dark:text-teal-400 group-hover:scale-105 transition-transform shrink-0">
              <Users className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2.5 flex items-baseline gap-1.5">
            <span className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white tabular-numbers">
              {totalPacientesAtivos}
            </span>
            <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500">
              {totalPacientesAtivos === 1 ? 'Cadastrado' : 'Cadastrados'}
            </span>
          </div>
          <p className="text-[10px] text-slate-400 mt-1 truncate">
            Prontuários em acompanhamento
          </p>
        </div>

        {/* CARD 2: AGENDAS */}
        <div 
          onClick={() => onNavegarPara('calendario')}
          className="glass-card p-4 cursor-pointer group hover:scale-[1.02] transition-all"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Agendas
            </span>
            <div className="w-7 h-7 rounded-xl glass-button flex items-center justify-center text-amber-500 group-hover:scale-105 transition-transform shrink-0">
              <Calendar className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2.5 flex items-baseline gap-1.5">
            <span className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white tabular-numbers">
              {totalAgendas}
            </span>
            <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-400">
              Marcadas
            </span>
          </div>
          <p className="text-[10px] text-slate-400 mt-1 truncate">
            Retornos & próximas consultas
          </p>
        </div>

        {/* CARD 3: SESSÕES REALIZADAS */}
        <div 
          onClick={() => onNavegarPara('captura')}
          className="glass-card p-4 cursor-pointer group hover:scale-[1.02] transition-all"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Sessões Realizadas
            </span>
            <div className="w-7 h-7 rounded-xl glass-button flex items-center justify-center text-rose-500 group-hover:scale-105 transition-transform shrink-0">
              <Camera className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2.5 flex items-baseline gap-1.5">
            <span className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white tabular-numbers">
              {totalSessoesRealizadas}
            </span>
            <span className="text-[10px] font-semibold text-teal-700 dark:text-teal-300">
              Fototricoscopias
            </span>
          </div>
          <p className="text-[10px] text-slate-400 mt-1 truncate">
            Exames gravados na bancada
          </p>
        </div>

        {/* CARD 4: ANAMNESES FEITAS */}
        <div 
          onClick={() => onNavegarPara('anamnese')}
          className="glass-card p-4 cursor-pointer group hover:scale-[1.02] transition-all"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Anamneses Feitas
            </span>
            <div className="w-7 h-7 rounded-xl glass-button flex items-center justify-center text-emerald-500 group-hover:scale-105 transition-transform shrink-0">
              <FileText className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2.5 flex items-baseline gap-1.5">
            <span className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white tabular-numbers">
              {totalAnamnesesFeitas}
            </span>
            <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
              {totalAnamnesesFeitas === 1 ? 'Registrada' : 'Registradas'}
            </span>
          </div>
          <p className="text-[10px] text-slate-400 mt-1 truncate">
            Queixas & históricos clínicos
          </p>
        </div>

        {/* CARD 5: NÚMERO DE CLIENTES */}
        <div 
          onClick={() => onNavegarPara('pacientes')}
          className="glass-card p-4 cursor-pointer group hover:scale-[1.02] transition-all"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Número de Clientes
            </span>
            <div className="w-7 h-7 rounded-xl glass-button flex items-center justify-center text-cyan-500 group-hover:scale-105 transition-transform shrink-0">
              <Activity className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2.5 flex items-baseline gap-1.5">
            <span className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white tabular-numbers">
              {totalNumeroClientes}
            </span>
            <span className="text-[10px] font-semibold text-cyan-600 dark:text-cyan-400">
              Total
            </span>
          </div>
          <p className="text-[10px] text-slate-400 mt-1 truncate">
            Base completa da clínica
          </p>
        </div>

        {/* CARD 6: FUNÇÃO ATLAS NAS OPÇÕES DO DASHBOARD */}
        <div 
          onClick={() => onNavegarPara('atlas')}
          className="glass-card p-4 cursor-pointer group hover:scale-[1.02] transition-all border-teal-500/40 bg-teal-500/[0.04] dark:bg-teal-500/[0.08]"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-teal-700 dark:text-teal-300 uppercase tracking-wider flex items-center gap-1">
              <BookOpen className="w-3 h-3" />
              Atlas Clínico
            </span>
            {temAcesso ? (
              <div className="w-7 h-7 rounded-xl bg-teal-500/10 text-teal-700 dark:text-teal-300 flex items-center justify-center group-hover:scale-105 transition-transform shrink-0">
                <ArrowRight className="w-3.5 h-3.5" />
              </div>
            ) : (
              <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold bg-amber-400/20 text-amber-700 dark:text-amber-300 flex items-center gap-1 border border-amber-400/30">
                <Crown className="w-2.5 h-2.5 text-amber-500" />
                <span>Pagos</span>
              </span>
            )}
          </div>
          <div className="mt-2.5 flex items-baseline gap-1.5">
            <span className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white tabular-numbers">
              {totalCasosAtlas}
            </span>
            <span className="text-[10px] font-semibold text-teal-700 dark:text-teal-300">
              Casos
            </span>
          </div>
          <p className="text-[10px] text-slate-400 mt-1 truncate">
            {temAcesso ? 'Função de consulta imediata' : 'Exclusivo dos Planos Pagos'}
          </p>
        </div>
      </div>

      {/* 3. MÓDULO DE FUNÇÃO: ATLAS CLÍNICO INTEGRADO NO DASHBOARD (CONSULTA DIRETA SEM SAIR DO PAINEL) */}
      <div className="glass-card p-6 sm:p-7 space-y-4">
        {!temAcesso && (
          <div className="p-4 rounded-2xl bg-gradient-to-r from-teal-950 via-teal-900 to-slate-950 text-white flex flex-col sm:flex-row items-center justify-between gap-3 border border-teal-500/30 animate-fadeIn">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-400/20 text-amber-300 flex items-center justify-center shrink-0">
                <Crown className="w-4 h-4" />
              </div>
              <div className="text-xs">
                <p className="font-bold text-white">Atlas Clínico: Exclusivo dos Planos Pagos</p>
                <p className="text-teal-100/80">Assine apenas o mês avulso (R$ 89,90) ou economize 50% no plano anual (12x de R$ 44,90).</p>
              </div>
            </div>
            <button
              onClick={() => onNavegarPara('planos')}
              className="px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs shrink-0 transition-all shadow-md hover:scale-[1.02]"
            >
              Liberar Acesso Agora
            </button>
          </div>
        )}

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-200/60 dark:border-white/[0.06]">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-xl glass-button flex items-center justify-center text-teal-700 dark:text-teal-400">
                <BookOpen className="w-4 h-4" />
              </div>
              <h2 className="text-base sm:text-lg font-bold tracking-tight text-slate-900 dark:text-white">
                Função Atlas: Consulta Rápida de Casos & Padrões
              </h2>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Pesquise casos clínicos, compare sinais tricoscópicos e acesse referências sem sair do painel.
            </p>
          </div>

          {/* Campo de Busca Rápida Dentro do Atlas do Dashboard */}
          <div className="flex items-center gap-2">
            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={termoBuscaAtlas}
                onChange={(e) => setTermoBuscaAtlas(e.target.value)}
                placeholder="Buscar caso ou achado..."
                className="w-full glass-input pl-8 pr-3 py-1.5 text-xs placeholder:text-slate-400"
              />
              {termoBuscaAtlas && (
                <button 
                  onClick={() => setTermoBuscaAtlas('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            <button
              onClick={() => onNavegarPara('atlas')}
              className="glass-button px-3 py-1.5 text-xs font-semibold text-teal-700 dark:text-teal-300 flex items-center gap-1 shrink-0"
            >
              <span>Ver Atlas Completo</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Filtros de Categoria do Atlas */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          {['Todas', 'Não Cicatricial', 'Cicatricial', 'Dermatose Descamativa', 'Infecciosa'].map(cat => {
            const ativa = categoriaAtlasAtiva === cat;
            return (
              <button
                key={cat}
                onClick={() => setCategoriaAtlasAtiva(cat)}
                className={`px-3 py-1 rounded-xl transition-all ${
                  ativa
                    ? 'glass-button bg-teal-700 text-white dark:bg-teal-700 dark:text-white font-semibold shadow-xs'
                    : 'glass-button text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>

        {/* Mini Grid de Casos do Atlas para Consulta Imediata */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 pt-1">
          {casosAtlasFiltrados.slice(0, 4).map(caso => (
            <div
              key={caso.id}
              onClick={() => {
                if (temAcesso) {
                  if (onSelecionarCasoAtlas) {
                    onSelecionarCasoAtlas(caso.id);
                  } else {
                    onNavegarPara('atlas');
                  }
                } else {
                  onNavegarPara('atlas');
                }
              }}
              className="glass-card p-3.5 cursor-pointer group hover:scale-[1.01] hover:border-teal-400/40 transition-all flex flex-col justify-between"
            >
              <div className="space-y-2">
                <div className="relative h-28 w-full rounded-xl overflow-hidden bg-slate-950/20">
                  <TricoscopyViewer 
                    imagem={caso.imagem} 
                    nomeCondicao={caso.nome} 
                    casoId={caso.id} 
                    isHero={false}
                    className="w-full h-full"
                  />
                  <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded-md glass-card text-[9px] font-mono font-medium text-slate-900 dark:text-white pointer-events-none z-10">
                    #{caso.numeroOrdem ? caso.numeroOrdem.toString().padStart(2, '0') : '01'}
                  </div>
                  {!temAcesso && (
                    <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded-md bg-slate-950/85 text-amber-300 text-[9px] font-bold flex items-center gap-1 border border-amber-400/30 z-10">
                      <Lock className="w-2.5 h-2.5 text-amber-400" />
                      <span>Exclusivo Pagos</span>
                    </div>
                  )}
                </div>

                <div>
                  <div className="text-[10px] font-medium text-teal-700 dark:text-teal-300 truncate">
                    {caso.categoria}
                  </div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 group-hover:text-teal-700 dark:group-hover:text-teal-400 transition-colors line-clamp-1">
                    {caso.nome}
                  </h4>
                  <p className="text-[10px] text-slate-400 line-clamp-1 mt-0.5">
                    {caso.padrao}
                  </p>
                </div>
              </div>

              <div className="pt-2 mt-2 border-t border-slate-200/50 dark:border-white/[0.05] flex items-center justify-between text-[11px] text-teal-700 dark:text-teal-300 font-semibold">
                <span>{temAcesso ? 'Ver Análise' : 'Desbloquear no Pro'}</span>
                <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 4. GRID DE DISTRIBUIÇÃO MENSAL DE SESSÕES + RESUMO DO CONSULTÓRIO */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* CARD ESQUERDA: DISTRIBUIÇÃO REAL DE SESSÕES DE FOTOTRICOSCOPIA */}
        <div className="lg:col-span-8 glass-card p-6 sm:p-7 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-base sm:text-lg font-semibold tracking-tight text-slate-900 dark:text-white">
                Distribuição Mensal de Sessões
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Histórico de exames tricoscópicos gravados em 2026
              </p>
            </div>

            <div className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
              <span className="w-2.5 h-2.5 rounded-full bg-teal-600 inline-block" />
              <span>{totalSessoesRealizadas} {totalSessoesRealizadas === 1 ? 'sessão gravada' : 'sessões gravadas'}</span>
            </div>
          </div>

          {/* ÁREA GRÁFICA REAL DE BARRAS POR MÊS */}
          <div className="relative w-full h-56 sm:h-64 mt-2 flex flex-col justify-end">
            {totalSessoesAno === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-4 border border-dashed border-slate-200 dark:border-white/10 rounded-2xl bg-slate-50/50 dark:bg-white/[0.01]">
                <Camera className="w-8 h-8 text-slate-300 dark:text-slate-600 mb-2" />
                <p className="text-xs font-medium text-slate-600 dark:text-slate-300">
                  Nenhuma sessão registrada neste período
                </p>
                <p className="text-[11px] text-slate-400 max-w-sm mt-0.5">
                  Ao salvar capturas na bancada de tricoscopia, os dados mensais serão computados automaticamente aqui.
                </p>
              </div>
            ) : (
              <div className="h-full flex items-end justify-between gap-1.5 sm:gap-3 pt-6 pb-2 px-2">
                {sessoesPorMes.map((qtd, idx) => {
                  const alturaPct = maxSessoesMes > 0 ? Math.round((qtd / maxSessoesMes) * 100) : 0;
                  const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
                  return (
                    <div key={idx} className="flex-1 flex flex-col items-center h-full justify-end group">
                      <div className="text-[10px] font-mono font-semibold text-teal-700 dark:text-teal-300 mb-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {qtd > 0 ? qtd : ''}
                      </div>
                      <div className="w-full max-w-[28px] bg-slate-100 dark:bg-white/5 rounded-t-lg overflow-hidden flex flex-col justify-end h-full">
                        <div 
                          className="w-full bg-gradient-to-t from-teal-700 to-teal-500 rounded-t-lg transition-all duration-500 group-hover:brightness-110"
                          style={{ height: qtd > 0 ? `${Math.max(8, alturaPct)}%` : '0%' }}
                        />
                      </div>
                      <span className={`text-[10px] mt-2 font-medium ${qtd > 0 ? 'text-teal-700 dark:text-teal-300 font-bold' : 'text-slate-400'}`}>
                        {meses[idx]}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* CARD DIREITA: RESUMO OPERACIONAL & PACIENTES RECENTES */}
        <div className="lg:col-span-4 glass-card p-6 sm:p-7 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold tracking-tight text-slate-900 dark:text-white">
                  Resumo do Consultório
                </h3>
                <span className="text-xs text-slate-400 dark:text-slate-500">
                  Indicadores de atividade clínica real
                </span>
              </div>
              <button 
                onClick={() => onNavegarPara('captura')}
                className="w-7 h-7 rounded-xl glass-button flex items-center justify-center text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                title="Ir para captura e bancada de marcação"
              >
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* QUADRO DE INDICADORES REAIS */}
            <div className="grid grid-cols-2 gap-2.5 pt-4 pb-2">
              <div className="p-3 rounded-2xl glass-card border border-slate-200/50 dark:border-white/5">
                <div className="text-[11px] font-medium text-slate-400">Pacientes</div>
                <div className="text-xl font-bold text-slate-900 dark:text-white mt-0.5">{totalPacientesAtivos}</div>
              </div>
              <div className="p-3 rounded-2xl glass-card border border-slate-200/50 dark:border-white/5">
                <div className="text-[11px] font-medium text-slate-400">Agendamentos</div>
                <div className="text-xl font-bold text-slate-900 dark:text-white mt-0.5">{totalAgendas}</div>
              </div>
              <div className="p-3 rounded-2xl glass-card border border-slate-200/50 dark:border-white/5">
                <div className="text-[11px] font-medium text-slate-400">Fototricoscopias</div>
                <div className="text-xl font-bold text-slate-900 dark:text-white mt-0.5">{totalSessoesRealizadas}</div>
              </div>
              <div className="p-3 rounded-2xl glass-card border border-slate-200/50 dark:border-white/5">
                <div className="text-[11px] font-medium text-slate-400">Anamneses</div>
                <div className="text-xl font-bold text-slate-900 dark:text-white mt-0.5">{totalAnamnesesFeitas}</div>
              </div>
            </div>
          </div>

          {/* LISTA DE CONSULTAS & LAUDOS RECENTES EM PT-BR */}
          <div className="mt-4 pt-3 border-t border-slate-200/60 dark:border-white/[0.06] space-y-2">
            <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
              Acompanhamentos Recentes
            </div>

            <div className="space-y-1.5 text-xs">
              {pacientesDoUsuario.slice(0, 3).map((pac) => (
                <div 
                  key={pac.id} 
                  onClick={() => onSelecionarPaciente(pac)}
                  className="flex items-center justify-between py-1 group cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-xl glass-button flex items-center justify-center text-slate-700 dark:text-slate-300">
                      <Microscope className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <div className="font-semibold text-slate-900 dark:text-slate-100 group-hover:text-teal-700 dark:group-hover:text-teal-400 transition-colors">
                        {pac.nome.split(' ').slice(0, 2).join(' ')}
                      </div>
                      <div className="text-[10px] text-slate-400 truncate max-w-[140px]">
                        {pac.queixaPrincipal ? pac.queixaPrincipal.slice(0, 26) + '...' : 'Tricoscopia Digital'}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="inline-block px-2 py-0.5 rounded-md glass-button text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
                      Ativo
                    </span>
                    <div className="text-[9px] text-slate-400 font-mono">
                      {new Date(pac.createdAt || Date.now()).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                    </div>
                  </div>
                </div>
              ))}

              {pacientesDoUsuario.length === 0 && (
                <div className="text-center py-6 text-xs text-slate-400">
                  Nenhum paciente cadastrado ainda.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 5. TABELA DE PACIENTES CADASTRADOS & ATALHOS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* TABELA DE PACIENTES DO CONSULTÓRIO (7 Colunas) */}
        <div className="lg:col-span-7 glass-card p-6 sm:p-7">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-semibold tracking-tight text-slate-900 dark:text-white">
                Prontuários & Pacientes do Consultório
              </h3>
              <p className="text-xs text-slate-400 dark:text-slate-500">
                Lista de pacientes cadastrados com status de anamnese e tricoscopia
              </p>
            </div>

            <button 
              onClick={() => onNavegarPara('pacientes')}
              className="glass-button px-3 py-1.5 text-xs font-medium flex items-center gap-1.5 text-teal-700 dark:text-teal-300"
            >
              <span>Ver Todos ({totalPacientesAtivos})</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Tabela Clean Glass com Cabeçalho e Linhas */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200/60 dark:border-white/[0.06] text-slate-400 dark:text-slate-500 font-medium">
                  <th className="pb-2.5 font-medium">Paciente</th>
                  <th className="pb-2.5 font-medium">Telefone</th>
                  <th className="pb-2.5 font-medium">Anamnese / Queixa</th>
                  <th className="pb-2.5 font-medium text-right">Cadastro</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/[0.03]">
                {pacientesDoUsuario.length > 0 ? (
                  pacientesDoUsuario.slice(0, 5).map((pac) => (
                    <tr 
                      key={pac.id}
                      onClick={() => onSelecionarPaciente(pac)}
                      className="group cursor-pointer hover:bg-white/40 dark:hover:bg-white/[0.02] transition-colors"
                    >
                      <td className="py-3 font-semibold text-slate-900 dark:text-slate-100 group-hover:text-teal-700 dark:group-hover:text-teal-400 transition-colors">
                        {pac.nome}
                      </td>
                      <td className="py-3 text-slate-500 dark:text-slate-400 font-mono text-[11px]">
                        {pac.telefone || '—'}
                      </td>
                      <td className="py-3 max-w-[180px] truncate">
                        <span className="glass-button px-2.5 py-0.5 text-[11px] font-medium text-slate-600 dark:text-slate-300">
                          {pac.queixaPrincipal ? pac.queixaPrincipal.slice(0, 28) + '...' : 'Anamnese preenchida'}
                        </span>
                      </td>
                      <td className="py-3 text-right text-slate-400 dark:text-slate-500 font-mono text-[11px]">
                        {new Date(pac.createdAt || pac.updatedAt || Date.now()).toLocaleDateString('pt-BR')}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-slate-400">
                      Nenhum paciente cadastrado. Clique no botão acima para adicionar.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* CARD DIREITA: RESUMO DE CONSULTAS & AÇÕES RÁPIDAS (5 Colunas) */}
        <div className="lg:col-span-5 flex flex-col gap-5">
          {/* TOTAL DE ATENDIMENTOS */}
          <div className="glass-card p-6 sm:p-7 flex flex-col justify-between flex-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl glass-button flex items-center justify-center text-slate-800 dark:text-slate-200 shadow-inner">
                  <Layers className="w-4 h-4" />
                </div>
                <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                  Total de Atendimentos Clínicos
                </span>
              </div>
              <span className="text-[11px] font-mono text-slate-400">
                2026
              </span>
            </div>

            <div className="my-5">
              <div className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900 dark:text-white tabular-numbers">
                {totalSessoesRealizadas + totalAgendas}
              </div>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  {totalSessoesRealizadas} fototricoscopia(s) e {totalAgendas} agendamento(s)
                </span>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-200/60 dark:border-white/[0.06] flex items-center justify-between text-xs">
              <span className="text-slate-500 dark:text-slate-400">
                Guia com {totalCasosAtlas} casos clínicos catalogados
              </span>
              <button 
                onClick={() => onNavegarPara('atlas')}
                className="text-teal-700 dark:text-teal-300 font-semibold hover:underline flex items-center gap-1"
              >
                <span>Acessar Atlas</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* ATALHOS DE AÇÃO RÁPIDA DE VIDRO FOSCO */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => onNavegarPara('captura')}
              className="glass-card p-4 text-left hover:scale-[1.01] transition-transform group cursor-pointer"
            >
              <div className="w-8 h-8 rounded-xl glass-button flex items-center justify-center text-rose-500 dark:text-rose-400 mb-2 group-hover:scale-105 transition-transform">
                <Camera className="w-4 h-4" />
              </div>
              <div className="font-semibold text-xs text-slate-900 dark:text-slate-100">
                Bancada de Captura
              </div>
              <div className="text-[10px] text-slate-400">
                Contagem folicular e telemetria
              </div>
            </button>

            <button
              onClick={() => onNavegarPara('comparador')}
              className="glass-card p-4 text-left hover:scale-[1.01] transition-transform group cursor-pointer"
            >
              <div className="w-8 h-8 rounded-xl glass-button flex items-center justify-center text-teal-700 dark:text-teal-400 mb-2 group-hover:scale-105 transition-transform">
                <GitCompare className="w-4 h-4" />
              </div>
              <div className="font-semibold text-xs text-slate-900 dark:text-slate-100">
                Comparador Lado a Lado
              </div>
              <div className="text-[10px] text-slate-400">
                Evolução clínica comparativa
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* MODAL DE CADASTRO RÁPIDO DE NOVO PACIENTE (GLASSMORPHISM) */}
      {modalNovoPaciente && (
        <div className="fixed inset-0 z-50 flex justify-center items-start p-2.5 sm:p-4 bg-black/75 overflow-y-auto animate-fadeIn">
          <div className="glass-card w-full max-w-md p-5 sm:p-7 space-y-4 bg-white/95 dark:bg-slate-900/90 border border-white/20 shadow-2xl my-4 sm:my-8">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl glass-button flex items-center justify-center text-teal-700 dark:text-teal-400">
                  <UserPlus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Novo Paciente
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Cadastre um novo prontuário capilar
                  </p>
                </div>
              </div>
              <button
                onClick={() => setModalNovoPaciente(false)}
                className="w-7 h-7 rounded-xl glass-button flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <form onSubmit={handleCadastrarPacienteRapido} className="space-y-3 text-xs">
              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Nome Completo do Paciente *
                </label>
                <input
                  type="text"
                  value={novoNome}
                  onChange={(e) => setNovoNome(e.target.value)}
                  placeholder="Ex: Amanda Ferreira Silva"
                  className="w-full glass-input px-3 py-2 text-xs"
                  required
                  autoFocus
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Telefone / WhatsApp
                </label>
                <input
                  type="text"
                  value={novoTelefone}
                  onChange={(e) => setNovoTelefone(e.target.value)}
                  placeholder="Ex: (11) 98765-4321"
                  className="w-full glass-input px-3 py-2 text-xs"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Queixa Principal / Motivo da Consulta
                </label>
                <textarea
                  value={novaQueixa}
                  onChange={(e) => setNovaQueixa(e.target.value)}
                  rows={3}
                  placeholder="Ex: Queda excessiva há 2 meses, afinamento no vértex..."
                  className="w-full glass-input px-3 py-2 text-xs resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-white/10">
                <button
                  type="button"
                  onClick={() => setModalNovoPaciente(false)}
                  className="glass-button px-3.5 py-1.5 text-xs font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={salvandoPaciente}
                  className="px-4 py-1.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-medium text-xs shadow-md shadow-teal-700/25 transition-all flex items-center gap-1.5"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{salvandoPaciente ? 'Salvando...' : 'Cadastrar Paciente'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE EDIÇÃO DE PERFIL / CLÍNICA (ESTILO GLASSMORPHISM) */}
      {modalEditarPerfil && (
        <div className="fixed inset-0 z-50 flex justify-center items-start p-2.5 sm:p-4 bg-black/75 overflow-y-auto animate-fadeIn">
          <div className="glass-card w-full max-w-lg p-5 sm:p-8 space-y-5 bg-white/95 dark:bg-slate-900/90 border border-white/20 shadow-2xl my-4 sm:my-8">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl glass-button flex items-center justify-center text-teal-700 dark:text-teal-400">
                  <User className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Identificação do Especialista & Clínica
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Estes dados aparecerão nos laudos impressos e relatórios em PDF
                  </p>
                </div>
              </div>
              <button
                onClick={() => setModalEditarPerfil(false)}
                className="w-8 h-8 rounded-xl glass-button flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSalvarPerfil} className="space-y-4 text-xs">
              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Nome Completo do Médico / Especialista
                </label>
                <input
                  type="text"
                  value={formNome}
                  onChange={(e) => setFormNome(e.target.value)}
                  placeholder="Ex: Dra. Juliana Menezes"
                  className="w-full glass-input px-3 py-2 text-xs"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Título / Especialidade
                  </label>
                  <input
                    type="text"
                    value={formTitulo}
                    onChange={(e) => setFormTitulo(e.target.value)}
                    placeholder="Ex: Dermatologista Tricologista"
                    className="w-full glass-input px-3 py-2 text-xs"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block font-medium text-slate-700 dark:text-slate-300">
                      Registro Profissional (CRM / CRBM / ABT)
                    </label>
                    <span className="text-[10px] text-slate-400">Opcional</span>
                  </div>
                  <input
                    type="text"
                    value={formRegistro}
                    onChange={(e) => setFormRegistro(e.target.value)}
                    placeholder="Ex: CRM-SP 145.890 (Opcional)"
                    className="w-full glass-input px-3 py-2 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Nome da Clínica ou Instituto
                </label>
                <input
                  type="text"
                  value={formClinica}
                  onChange={(e) => setFormClinica(e.target.value)}
                  placeholder="Ex: Instituto Capilar & Dermatologia Avançada"
                  className="w-full glass-input px-3 py-2 text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200 dark:border-white/10">
                <button
                  type="button"
                  onClick={() => setModalEditarPerfil(false)}
                  className="glass-button px-4 py-2 text-xs font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={salvandoPerfil}
                  className="px-4 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-medium shadow-md shadow-teal-700/25 transition-all flex items-center gap-1.5"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{salvandoPerfil ? 'Salvando...' : 'Salvar Alterações'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
