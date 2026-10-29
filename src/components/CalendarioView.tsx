import React, { useState, useEffect, useMemo } from 'react';
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Clock, 
  User, 
  Phone, 
  Search, 
  Filter, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  Edit3, 
  Trash2, 
  ArrowRight, 
  Camera, 
  FileText, 
  Sparkles, 
  Microscope, 
  Activity, 
  Bell, 
  Users, 
  UserPlus, 
  CalendarDays,
  Check
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { 
  Agendamento, 
  StatusAgendamento, 
  MOTIVOS_CONSULTA, 
  MotivoConsulta 
} from '../types/agendamento';
import { 
  listAgendamentos, 
  saveAgendamento, 
  deleteAgendamento, 
  updateStatusAgendamento, 
  getDataHojeLocal 
} from '../services/agendamentoService';
import { Paciente } from '../types/paciente';
import { listPacientes, savePaciente } from '../services/pacientes';
import { LembreteConsultaModal } from './LembreteConsultaModal';

interface CalendarioViewProps {
  onIniciarExamePaciente?: (paciente: { id: string; nome: string }) => void;
  onIniciarAnamnesePaciente?: (paciente: { id: string; nome: string }) => void;
  onVoltarParaPainel?: () => void;
}

const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

export const CalendarioView: React.FC<CalendarioViewProps> = ({
  onIniciarExamePaciente,
  onIniciarAnamnesePaciente,
  onVoltarParaPainel
}) => {
  const { usuarioAtual } = useAuth();
  const hojeStr = getDataHojeLocal();

  // Estados principais
  const [dataAtual, setDataAtual] = useState(new Date());
  const [dataSelecionada, setDataSelecionada] = useState<string>(hojeStr);
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [carregando, setCarregando] = useState(true);

  // Filtros
  const [buscaPaciente, setBuscaPaciente] = useState('');
  const [filtroMotivoId, setFiltroMotivoId] = useState<string>('todos');
  const [filtroStatus, setFiltroStatus] = useState<string>('todos');

  // Modal de Agendamento (com seleção de motivo)
  const [modalAgendamentoAberto, setModalAgendamentoAberto] = useState(false);
  const [agendamentoEmEdicao, setAgendamentoEmEdicao] = useState<Agendamento | null>(null);

  // Campos do formulário de agendamento
  const [formPacienteId, setFormPacienteId] = useState('');
  const [formPacienteNome, setFormPacienteNome] = useState('');
  const [formPacienteTelefone, setFormPacienteTelefone] = useState('');
  const [formData, setFormData] = useState(hojeStr);
  const [formHorario, setFormHorario] = useState('09:00');
  const [formDuracao, setFormDuracao] = useState(60);
  const [formMotivoId, setFormMotivoId] = useState<string>('primeira_avaliacao');
  const [formStatus, setFormStatus] = useState<StatusAgendamento>('confirmado');
  const [formObservacoes, setFormObservacoes] = useState('');
  const [salvandoAgendamento, setSalvandoAgendamento] = useState(false);

  // Modal para cadastro rápido de paciente durante o agendamento
  const [modalNovoPaciente, setModalNovoPaciente] = useState(false);
  const [novoPacienteNome, setNovoPacienteNome] = useState('');
  const [novoPacienteTelefone, setNovoPacienteTelefone] = useState('');
  const [salvandoNovoPaciente, setSalvandoNovoPaciente] = useState(false);

  // Pop-up de lembrete de consultas hoje
  const [modalLembreteAberto, setModalLembreteAberto] = useState(false);
  const [lembreteExibidoAutomatico, setLembreteExibidoAutomatico] = useState(false);

  // Feedback toast
  const [notificacao, setNotificacao] = useState<{ tipo: 'sucesso' | 'erro'; texto: string } | null>(null);

  const mostrarNotificacao = (texto: string, tipo: 'sucesso' | 'erro' = 'sucesso') => {
    setNotificacao({ tipo, texto });
    setTimeout(() => setNotificacao(null), 3500);
  };

  // Carregar agendamentos e pacientes
  const carregarDados = async () => {
    setCarregando(true);
    try {
      const [listaAg, listaPac] = await Promise.all([
        listAgendamentos(usuarioAtual?.uid),
        usuarioAtual ? listPacientes(usuarioAtual.uid) : Promise.resolve([])
      ]);
      setAgendamentos(listaAg);
      setPacientes(listaPac);

      // Se houver consultas marcadas para hoje e ainda não mostrou o pop-up nesta visualização, abre o pop-up
      const consultasHoje = listaAg.filter(a => a.data === hojeStr && a.status !== 'cancelado');
      if (consultasHoje.length > 0 && !lembreteExibidoAutomatico) {
        setModalLembreteAberto(true);
        setLembreteExibidoAutomatico(true);
      }
    } catch (err) {
      console.error('Erro ao carregar agendamentos do calendário:', err);
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    carregarDados();
  }, [usuarioAtual]);

  // Consultas de hoje para o badge e lembrete
  const consultasHoje = useMemo(() => {
    return agendamentos.filter(a => a.data === hojeStr && a.status !== 'cancelado');
  }, [agendamentos, hojeStr]);

  // Agendamentos filtrados
  const agendamentosFiltrados = useMemo(() => {
    return agendamentos.filter(a => {
      const matchBusca = !buscaPaciente.trim() || 
        a.pacienteNome.toLowerCase().includes(buscaPaciente.toLowerCase()) ||
        a.motivoTitulo.toLowerCase().includes(buscaPaciente.toLowerCase());
      
      const matchMotivo = filtroMotivoId === 'todos' || a.motivoId === filtroMotivoId;
      const matchStatus = filtroStatus === 'todos' || a.status === filtroStatus;

      return matchBusca && matchMotivo && matchStatus;
    });
  }, [agendamentos, buscaPaciente, filtroMotivoId, filtroStatus]);

  // Agendamentos do dia selecionado
  const agendamentosDoDiaSelecionado = useMemo(() => {
    return agendamentosFiltrados
      .filter(a => a.data === dataSelecionada)
      .sort((a, b) => a.horario.localeCompare(b.horario));
  }, [agendamentosFiltrados, dataSelecionada]);

  // Mapeamento de contagem de consultas por dia no mês
  const mapaConsultasPorDia = useMemo(() => {
    const mapa = new Map<string, Agendamento[]>();
    for (const a of agendamentosFiltrados) {
      const arr = mapa.get(a.data) || [];
      arr.push(a);
      mapa.set(a.data, arr);
    }
    return mapa;
  }, [agendamentosFiltrados]);

  // Funções de navegação do calendário
  const anoAtual = dataAtual.getFullYear();
  const mesAtual = dataAtual.getMonth();

  const handleMesAnterior = () => {
    setDataAtual(new Date(anoAtual, mesAtual - 1, 1));
  };

  const handleProximoMes = () => {
    setDataAtual(new Date(anoAtual, mesAtual + 1, 1));
  };

  const handleIrParaHoje = () => {
    setDataAtual(new Date());
    setDataSelecionada(hojeStr);
  };

  // Cálculo dos dias do mês
  const diasDoMes = useMemo(() => {
    const primeiroDiaSemana = new Date(anoAtual, mesAtual, 1).getDay();
    const totalDiasMes = new Date(anoAtual, mesAtual + 1, 0).getDate();
    const totalDiasMesAnterior = new Date(anoAtual, mesAtual, 0).getDate();

    const dias = [];

    // Dias do mês anterior para preencher a primeira semana
    for (let i = primeiroDiaSemana - 1; i >= 0; i--) {
      const diaNum = totalDiasMesAnterior - i;
      const mesAnt = mesAtual === 0 ? 11 : mesAtual - 1;
      const anoAnt = mesAtual === 0 ? anoAtual - 1 : anoAtual;
      const dataFormatada = `${anoAnt}-${String(mesAnt + 1).padStart(2, '0')}-${String(diaNum).padStart(2, '0')}`;
      dias.push({
        numero: diaNum,
        dataFormatada,
        mesmoMes: false
      });
    }

    // Dias do mês atual
    for (let i = 1; i <= totalDiasMes; i++) {
      const dataFormatada = `${anoAtual}-${String(mesAtual + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      dias.push({
        numero: i,
        dataFormatada,
        mesmoMes: true
      });
    }

    // Dias do próximo mês para completar 35 ou 42 células
    const totalCelulas = dias.length <= 35 ? 35 : 42;
    const restantes = totalCelulas - dias.length;
    for (let i = 1; i <= restantes; i++) {
      const mesProx = mesAtual === 11 ? 0 : mesAtual + 1;
      const anoProx = mesAtual === 11 ? anoAtual + 1 : anoAtual;
      const dataFormatada = `${anoProx}-${String(mesProx + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      dias.push({
        numero: i,
        dataFormatada,
        mesmoMes: false
      });
    }

    return dias;
  }, [anoAtual, mesAtual]);

  // Abrir modal para novo agendamento
  const handleAbrirNovoAgendamento = (dataPreDefinida?: string) => {
    setAgendamentoEmEdicao(null);
    setFormPacienteId(pacientes[0]?.id || '');
    setFormPacienteNome(pacientes[0]?.nome || '');
    setFormPacienteTelefone(pacientes[0]?.telefone || '');
    setFormData(dataPreDefinida || dataSelecionada || hojeStr);
    setFormHorario('09:00');
    setFormDuracao(60);
    setFormMotivoId('primeira_avaliacao');
    setFormStatus('confirmado');
    setFormObservacoes('');
    setModalAgendamentoAberto(true);
  };

  // Abrir modal para editar agendamento
  const handleAbrirEditarAgendamento = (ag: Agendamento) => {
    setAgendamentoEmEdicao(ag);
    setFormPacienteId(ag.pacienteId);
    setFormPacienteNome(ag.pacienteNome);
    setFormPacienteTelefone(ag.pacienteTelefone || '');
    setFormData(ag.data);
    setFormHorario(ag.horario);
    setFormDuracao(ag.duracaoMinutos);
    setFormMotivoId(ag.motivoId);
    setFormStatus(ag.status);
    setFormObservacoes(ag.observacoes || '');
    setModalAgendamentoAberto(true);
  };

  // Selecionar motivo no formulário (atualiza duração automaticamente)
  const handleSelecionarMotivo = (motivo: MotivoConsulta) => {
    setFormMotivoId(motivo.id);
    setFormDuracao(motivo.duracaoMinutos);
  };

  // Selecionar paciente no formulário
  const handleSelecionarPacienteForm = (pacId: string) => {
    setFormPacienteId(pacId);
    const pac = pacientes.find(p => p.id === pacId);
    if (pac) {
      setFormPacienteNome(pac.nome);
      setFormPacienteTelefone(pac.telefone || '');
    }
  };

  // Salvar agendamento
  const handleSalvarAgendamento = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formPacienteNome.trim()) {
      mostrarNotificacao('Por favor, informe ou selecione o paciente.', 'erro');
      return;
    }

    const motivoEscolhido = MOTIVOS_CONSULTA.find(m => m.id === formMotivoId) || MOTIVOS_CONSULTA[0];

    setSalvandoAgendamento(true);
    try {
      const salvo = await saveAgendamento({
        ...(agendamentoEmEdicao ? { id: agendamentoEmEdicao.id } : {}),
        userId: usuarioAtual?.uid,
        pacienteId: formPacienteId || `pac_avulso_${Date.now()}`,
        pacienteNome: formPacienteNome.trim(),
        pacienteTelefone: formPacienteTelefone.trim(),
        data: formData,
        horario: formHorario,
        duracaoMinutos: Number(formDuracao) || 30,
        motivoId: motivoEscolhido.id,
        motivoTitulo: motivoEscolhido.titulo,
        motivoCor: motivoEscolhido.corHex,
        status: formStatus,
        observacoes: formObservacoes.trim()
      });

      setAgendamentos(prev => {
        const filtrados = prev.filter(a => a.id !== salvo.id);
        const atualizados = [salvo, ...filtrados];
        atualizados.sort((a, b) => a.horario.localeCompare(b.horario));
        return atualizados;
      });

      setDataSelecionada(salvo.data);
      setModalAgendamentoAberto(false);
      mostrarNotificacao(`Consulta de "${salvo.pacienteNome}" agendada com sucesso!`);
    } catch {
      mostrarNotificacao('Erro ao salvar agendamento.', 'erro');
    } finally {
      setSalvandoAgendamento(false);
    }
  };

  // Alterar status rápido
  const handleAtualizarStatusRapido = async (id: string, novoStatus: StatusAgendamento) => {
    try {
      await updateStatusAgendamento(id, novoStatus);
      setAgendamentos(prev => prev.map(a => a.id === id ? { ...a, status: novoStatus } : a));
      mostrarNotificacao(`Status alterado para "${novoStatus.toUpperCase()}".`);
    } catch {
      mostrarNotificacao('Erro ao atualizar status.', 'erro');
    }
  };

  // Excluir agendamento
  const handleExcluirAgendamento = async (id: string, nomePaciente: string) => {
    if (!window.confirm(`Deseja cancelar/excluir a consulta de "${nomePaciente}"?`)) return;
    try {
      await deleteAgendamento(id);
      setAgendamentos(prev => prev.filter(a => a.id !== id));
      mostrarNotificacao('Agendamento excluído.');
    } catch {
      mostrarNotificacao('Erro ao excluir agendamento.', 'erro');
    }
  };

  // Cadastro rápido de paciente dentro do agendamento
  const handleCadastrarNovoPacienteRapido = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!novoPacienteNome.trim()) return;

    setSalvandoNovoPaciente(true);
    try {
      const criado = await savePaciente({
        userId: usuarioAtual?.uid,
        nome: novoPacienteNome.trim(),
        telefone: novoPacienteTelefone.trim(),
        queixaPrincipal: '',
        historicoClinico: ''
      });
      setPacientes(prev => [criado, ...prev]);
      setFormPacienteId(criado.id);
      setFormPacienteNome(criado.nome);
      setFormPacienteTelefone(criado.telefone || '');
      setModalNovoPaciente(false);
      setNovoPacienteNome('');
      setNovoPacienteTelefone('');
      mostrarNotificacao(`Paciente "${criado.nome}" cadastrado e selecionado!`);
    } catch {
      mostrarNotificacao('Erro ao cadastrar novo paciente.', 'erro');
    } finally {
      setSalvandoNovoPaciente(false);
    }
  };

  // Ícone por motivo
  const renderIconeMotivo = (icone: string) => {
    switch (icone) {
      case 'microscope': return <Microscope className="w-4 h-4 shrink-0" />;
      case 'camera': return <Camera className="w-4 h-4 shrink-0" />;
      case 'sparkles': return <Sparkles className="w-4 h-4 shrink-0" />;
      case 'fileText': return <FileText className="w-4 h-4 shrink-0" />;
      case 'activity': return <Activity className="w-4 h-4 shrink-0" />;
      default: return <CalendarIcon className="w-4 h-4 shrink-0" />;
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6 animate-fadeIn pb-24">
      {/* NOTIFICAÇÃO TOAST */}
      {notificacao && (
        <div className={`fixed top-4 right-4 z-50 p-4 rounded-2xl glass-card flex items-center gap-3 text-xs font-semibold shadow-2xl animate-fadeIn ${
          notificacao.tipo === 'sucesso' 
            ? 'border-emerald-500/40 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10' 
            : 'border-rose-500/40 text-rose-600 dark:text-rose-400 bg-rose-500/10'
        }`}>
          {notificacao.tipo === 'sucesso' ? (
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
          )}
          <span>{notificacao.texto}</span>
        </div>
      )}

      {/* 1. CABEÇALHO DO CALENDÁRIO & LEMBRETE POP-UP */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-teal-200/50 dark:border-teal-500/20">
        <div className="flex items-center gap-3">
          {onVoltarParaPainel && (
            <button
              onClick={onVoltarParaPainel}
              className="glass-button p-2 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white shrink-0"
              title="Voltar ao Painel"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-2xl bg-teal-700 text-white flex items-center justify-center shadow-md shadow-teal-700/30">
                <CalendarIcon className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                  Agenda & Calendário Clínico
                </h1>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Gerenciamento de horários, motivos de consulta e agendamentos do consultório.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Ações do Topo */}
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          {/* Botão de Lembrete Pop-up para consultas de hoje */}
          <button
            onClick={() => setModalLembreteAberto(true)}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all ${
              consultasHoje.length > 0
                ? 'bg-teal-100 hover:bg-teal-200 text-teal-900 dark:bg-teal-950/60 dark:text-teal-300 dark:hover:bg-teal-900/60 border border-teal-300 dark:border-teal-700 animate-pulse'
                : 'glass-button text-slate-600 dark:text-slate-300'
            }`}
            title="Ver pop-up com consultas marcadas para hoje"
          >
            <Bell className="w-4 h-4 text-teal-700 dark:text-teal-400" />
            <span>Consultas de Hoje</span>
            <span className="px-1.5 py-0.5 rounded-full bg-teal-700 text-white font-bold text-[10px]">
              {consultasHoje.length}
            </span>
          </button>

          {/* Botão Novo Agendamento */}
          <button
            onClick={() => handleAbrirNovoAgendamento()}
            className="px-4 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-semibold text-xs flex items-center gap-2 shadow-md shadow-teal-700/25 transition-all hover:scale-[1.01]"
          >
            <Plus className="w-4 h-4" />
            <span>Novo Agendamento</span>
          </button>
        </div>
      </div>

      {/* 2. BARRA DE CONTROLES DO MÊS E FILTROS */}
      <div className="glass-card p-4 flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Navegação de Mês */}
        <div className="flex items-center gap-2 w-full md:w-auto justify-between md:justify-start">
          <div className="flex items-center gap-1.5">
            <button
              onClick={handleMesAnterior}
              className="p-2 rounded-xl glass-button text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
              title="Mês anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={handleProximoMes}
              className="p-2 rounded-xl glass-button text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
              title="Próximo mês"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white min-w-[170px] text-center">
            {MESES[mesAtual]} de {anoAtual}
          </h2>

          <button
            onClick={handleIrParaHoje}
            className="px-3 py-1.5 rounded-xl glass-button text-xs font-semibold text-teal-700 dark:text-teal-300 hover:bg-teal-50 dark:hover:bg-teal-950/40"
          >
            Hoje
          </button>
        </div>

        {/* Filtros de Busca e Motivo */}
        <div className="flex items-center gap-2 w-full md:w-auto flex-wrap sm:flex-nowrap">
          {/* Busca por paciente */}
          <div className="relative flex-1 sm:w-56">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={buscaPaciente}
              onChange={(e) => setBuscaPaciente(e.target.value)}
              placeholder="Filtrar por paciente..."
              className="w-full glass-input pl-8 pr-3 py-1.5 text-xs placeholder:text-slate-400"
            />
          </div>

          {/* Filtro por Motivo */}
          <select
            value={filtroMotivoId}
            onChange={(e) => setFiltroMotivoId(e.target.value)}
            className="glass-input px-3 py-1.5 text-xs font-medium bg-transparent text-slate-700 dark:text-slate-200"
          >
            <option value="todos" className="bg-white dark:bg-slate-900">Todos os Motivos</option>
            {MOTIVOS_CONSULTA.map(m => (
              <option key={m.id} value={m.id} className="bg-white dark:bg-slate-900">
                {m.titulo}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 3. GRID PRINCIPAL DO CALENDÁRIO & PAINEL DO DIA */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LADO ESQUERDO: GRADE MENSAL DO CALENDÁRIO */}
        <div className="lg:col-span-8 glass-card p-4 sm:p-5 space-y-3">
          {/* Dias da Semana */}
          <div className="grid grid-cols-7 gap-1 sm:gap-2 text-center text-xs font-bold text-slate-400 pb-2 border-b border-slate-200/50 dark:border-white/[0.06]">
            {DIAS_SEMANA.map((dia, idx) => (
              <div key={dia} className={idx === 0 || idx === 6 ? 'text-teal-700 dark:text-teal-400' : ''}>
                {dia}
              </div>
            ))}
          </div>

          {/* Células dos Dias */}
          <div className="grid grid-cols-7 gap-1 sm:gap-2">
            {diasDoMes.map((dia, i) => {
              const consultasDoDia = mapaConsultasPorDia.get(dia.dataFormatada) || [];
              const ehHoje = dia.dataFormatada === hojeStr;
              const estaSelecionado = dia.dataFormatada === dataSelecionada;

              return (
                <div
                  key={`${dia.dataFormatada}-${i}`}
                  onClick={() => setDataSelecionada(dia.dataFormatada)}
                  className={`min-h-[75px] sm:min-h-[92px] p-1.5 sm:p-2 rounded-2xl flex flex-col justify-between transition-all cursor-pointer relative border ${
                    estaSelecionado
                      ? 'border-teal-700 bg-teal-500/10 dark:bg-teal-500/15 shadow-sm ring-2 ring-teal-500/30'
                      : ehHoje
                      ? 'border-teal-300 dark:border-teal-700 bg-teal-50/50 dark:bg-teal-950/20'
                      : dia.mesmoMes
                      ? 'border-slate-200/60 dark:border-white/[0.06] hover:bg-slate-50/80 dark:hover:bg-white/[0.03]'
                      : 'border-transparent opacity-40 hover:opacity-70'
                  }`}
                >
                  {/* Cabeçalho do dia */}
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full ${
                      ehHoje 
                        ? 'bg-teal-700 text-white' 
                        : estaSelecionado 
                        ? 'text-teal-700 dark:text-teal-300 font-extrabold'
                        : 'text-slate-800 dark:text-slate-200'
                    }`}>
                      {dia.numero}
                    </span>

                    {/* Contagem de consultas no dia */}
                    {consultasDoDia.length > 0 && (
                      <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-teal-700 text-white">
                        {consultasDoDia.length}
                      </span>
                    )}
                  </div>

                  {/* Prévia das Consultas no Dia */}
                  <div className="space-y-1 mt-1 overflow-hidden">
                    {consultasDoDia.slice(0, 2).map((c) => (
                      <div
                        key={c.id}
                        className="text-[10px] px-1.5 py-0.5 rounded-lg truncate font-medium flex items-center gap-1 shadow-2xs"
                        style={{
                          backgroundColor: `${c.motivoCor}20`,
                          color: c.motivoCor,
                          borderLeft: `2px solid ${c.motivoCor}`
                        }}
                        title={`${c.horario} - ${c.pacienteNome} (${c.motivoTitulo})`}
                      >
                        <span className="font-mono font-bold shrink-0">{c.horario}</span>
                        <span className="truncate">{c.pacienteNome.split(' ')[0]}</span>
                      </div>
                    ))}
                    {consultasDoDia.length > 2 && (
                      <span className="text-[9px] font-semibold text-teal-700 dark:text-teal-400 pl-1 block">
                        +{consultasDoDia.length - 2} mais
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* LADO DIREITO: COMPROMISSOS DO DIA SELECIONADO */}
        <div className="lg:col-span-4 space-y-4">
          <div className="glass-card p-5 space-y-4 border-teal-200/70 dark:border-teal-500/30">
            {/* Título do Dia Selecionado */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-200/60 dark:border-white/[0.08]">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-teal-700 dark:text-teal-400 block">
                  {dataSelecionada === hojeStr ? 'Hoje' : 'Dia Selecionado'}
                </span>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {dataSelecionada.split('-').reverse().join('/')}
                </h3>
              </div>

              <button
                onClick={() => handleAbrirNovoAgendamento(dataSelecionada)}
                className="px-3 py-1.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-semibold text-xs flex items-center gap-1.5 transition-all shadow-xs"
                title="Novo agendamento para este dia"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Agendar</span>
              </button>
            </div>

            {/* Lista de Consultas do Dia */}
            {agendamentosDoDiaSelecionado.length === 0 ? (
              <div className="py-8 text-center space-y-2">
                <div className="w-12 h-12 rounded-2xl bg-teal-500/10 text-teal-700 dark:text-teal-400 flex items-center justify-center mx-auto">
                  <CalendarDays className="w-6 h-6" />
                </div>
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Nenhuma consulta marcada para esta data.
                </p>
                <p className="text-[11px] text-slate-400 max-w-[200px] mx-auto">
                  Clique no botão acima para agendar um novo atendimento ou exame.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {agendamentosDoDiaSelecionado.map((ag) => (
                  <div
                    key={ag.id}
                    className="p-3.5 rounded-2xl bg-white/70 dark:bg-white/[0.04] border border-slate-200/70 dark:border-white/[0.08] hover:border-teal-500/40 transition-all space-y-2.5 group"
                  >
                    {/* Horário, Motivo e Status */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-xs px-2 py-0.5 rounded-lg bg-teal-100 dark:bg-teal-950/60 text-teal-800 dark:text-teal-300">
                          {ag.horario}
                        </span>
                        <span 
                          className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                          style={{
                            backgroundColor: `${ag.motivoCor}20`,
                            color: ag.motivoCor
                          }}
                        >
                          {ag.motivoTitulo}
                        </span>
                      </div>

                      {/* Status */}
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        ag.status === 'confirmado' 
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                          : ag.status === 'concluido'
                          ? 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                          : ag.status === 'cancelado'
                          ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                          : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                      }`}>
                        {ag.status.toUpperCase()}
                      </span>
                    </div>

                    {/* Nome do Paciente e Detalhes */}
                    <div>
                      <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                        {ag.pacienteNome}
                      </h4>
                      <div className="flex items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 flex-wrap">
                        {ag.pacienteTelefone && (
                          <span className="flex items-center gap-1 font-mono">
                            <Phone className="w-3 h-3 text-slate-400" />
                            {ag.pacienteTelefone}
                          </span>
                        )}
                        <span>{ag.duracaoMinutos} min</span>
                      </div>
                    </div>

                    {ag.observacoes && (
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 italic bg-slate-50 dark:bg-slate-900/40 p-2 rounded-xl border border-slate-200/40 dark:border-slate-800/40">
                        {ag.observacoes}
                      </p>
                    )}

                    {/* Botões de Ação na Consulta */}
                    <div className="pt-2 border-t border-slate-100 dark:border-white/[0.06] flex items-center justify-between gap-1 flex-wrap">
                      <div className="flex items-center gap-1">
                        {onIniciarExamePaciente && (
                          <button
                            onClick={() => onIniciarExamePaciente({ id: ag.pacienteId, nome: ag.pacienteNome })}
                            className="p-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 text-rose-700 dark:text-rose-300 text-xs font-semibold flex items-center gap-1 transition-colors"
                            title="Iniciar Exame na Bancada"
                          >
                            <Camera className="w-3 h-3 text-rose-600" />
                            <span className="text-[10px]">Exame</span>
                          </button>
                        )}

                        {onIniciarAnamnesePaciente && (
                          <button
                            onClick={() => onIniciarAnamnesePaciente({ id: ag.pacienteId, nome: ag.pacienteNome })}
                            className="p-1.5 rounded-lg bg-teal-50 dark:bg-teal-950/40 hover:bg-teal-100 text-teal-800 dark:text-teal-300 text-xs font-semibold flex items-center gap-1 transition-colors"
                            title="Abrir Anamnese do Paciente"
                          >
                            <FileText className="w-3 h-3 text-teal-700 dark:text-teal-400" />
                            <span className="text-[10px]">Anamnese</span>
                          </button>
                        )}
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleAbrirEditarAgendamento(ag)}
                          className="p-1.5 rounded-lg glass-button text-slate-500 hover:text-slate-800 dark:hover:text-white"
                          title="Editar Consulta"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleExcluirAgendamento(ag.id, ag.pacienteNome)}
                          className="p-1.5 rounded-lg glass-button text-slate-400 hover:text-rose-600"
                          title="Excluir Consulta"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. MODAL / CARD DE AGENDAMENTO COM SELEÇÃO DO MOTIVO */}
      {/* ========================================================================= */}
      {modalAgendamentoAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-slate-950/70 backdrop-blur-sm overflow-y-auto animate-fadeIn">
          <div 
            className="w-full max-w-2xl bg-white dark:bg-[#071918] rounded-3xl shadow-2xl border border-teal-200/70 dark:border-teal-500/30 overflow-hidden flex flex-col max-h-[92vh] my-auto animate-scaleUp"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Cabeçalho do Modal */}
            <div className="p-5 sm:p-6 bg-gradient-to-r from-teal-800 via-teal-700 to-teal-800 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white">
                  <CalendarIcon className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold tracking-tight text-white">
                    {agendamentoEmEdicao ? 'Editar Agendamento Clínico' : 'Novo Agendamento Clínico'}
                  </h2>
                  <p className="text-xs text-teal-100">
                    Defina o paciente, horário e selecione o motivo da consulta.
                  </p>
                </div>
              </div>

              <button
                onClick={() => setModalAgendamentoAberto(false)}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Conteúdo do Formulário */}
            <form onSubmit={handleSalvarAgendamento} className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1">
              {/* ETAPA 1: CARD PARA SELECIONAR O MOTIVO (DESTAQUE SOLICITADO) */}
              <div className="space-y-2.5">
                <label className="text-xs font-bold uppercase tracking-wider text-teal-700 dark:text-teal-400 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>1. Selecione o Motivo da Consulta:</span>
                </label>

                {/* Grade de Cards de Motivos */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                  {MOTIVOS_CONSULTA.map((motivo) => {
                    const estaAtivo = formMotivoId === motivo.id;

                    return (
                      <div
                        key={motivo.id}
                        onClick={() => handleSelecionarMotivo(motivo)}
                        className={`p-3 rounded-2xl cursor-pointer transition-all border relative flex flex-col justify-between ${
                          estaAtivo
                            ? 'border-teal-700 bg-teal-500/10 dark:bg-teal-500/15 ring-2 ring-teal-500/30 shadow-sm'
                            : 'border-slate-200/70 dark:border-white/[0.08] hover:border-teal-300 dark:hover:border-teal-800/60 bg-slate-50/50 dark:bg-white/[0.02]'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between gap-1 mb-1.5">
                            <div 
                              className="w-7 h-7 rounded-xl flex items-center justify-center"
                              style={{ backgroundColor: `${motivo.corHex}20`, color: motivo.corHex }}
                            >
                              {renderIconeMotivo(motivo.icone)}
                            </div>
                            <span 
                              className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                              style={{ backgroundColor: `${motivo.corHex}15`, color: motivo.corHex }}
                            >
                              {motivo.duracaoMinutos} min
                            </span>
                          </div>

                          <h4 className={`text-xs font-bold leading-tight ${estaAtivo ? 'text-teal-900 dark:text-teal-200' : 'text-slate-800 dark:text-slate-200'}`}>
                            {motivo.titulo}
                          </h4>
                          <p className="text-[10px] text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                            {motivo.descricao}
                          </p>
                        </div>

                        {estaAtivo && (
                          <div className="mt-2 flex items-center gap-1 text-[10px] font-bold text-teal-700 dark:text-teal-400">
                            <Check className="w-3 h-3" />
                            <span>Selecionado</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* ETAPA 2: SELEÇÃO DO PACIENTE */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-teal-700 dark:text-teal-400" />
                    <span>2. Paciente:</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setModalNovoPaciente(true)}
                    className="text-[11px] font-semibold text-teal-700 dark:text-teal-400 hover:underline flex items-center gap-1"
                  >
                    <UserPlus className="w-3 h-3" />
                    <span>Cadastrar Novo Paciente</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Seletor de Paciente Existente */}
                  <div>
                    <label className="text-[11px] text-slate-500 mb-1 block">Selecionar da lista:</label>
                    <select
                      value={formPacienteId}
                      onChange={(e) => handleSelecionarPacienteForm(e.target.value)}
                      className="w-full glass-input px-3 py-2 text-xs font-medium"
                    >
                      <option value="">-- Escolha um paciente cadastrado --</option>
                      {pacientes.map((p) => (
                        <option key={p.id} value={p.id} className="bg-white dark:bg-slate-900">
                          {p.nome} {p.telefone ? `(${p.telefone})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Nome do Paciente */}
                  <div>
                    <label className="text-[11px] text-slate-500 mb-1 block">Nome do Paciente:</label>
                    <input
                      type="text"
                      value={formPacienteNome}
                      onChange={(e) => setFormPacienteNome(e.target.value)}
                      placeholder="Ex: Marina Duarte"
                      required
                      className="w-full glass-input px-3 py-2 text-xs"
                    />
                  </div>
                </div>

                {/* Telefone do Paciente */}
                <div>
                  <label className="text-[11px] text-slate-500 mb-1 block">Telefone / Celular (opcional):</label>
                  <input
                    type="text"
                    value={formPacienteTelefone}
                    onChange={(e) => setFormPacienteTelefone(e.target.value)}
                    placeholder="(11) 98765-4321"
                    className="w-full glass-input px-3 py-2 text-xs font-mono"
                  />
                </div>
              </div>

              {/* ETAPA 3: DATA, HORÁRIO & DURAÇÃO */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-teal-700 dark:text-teal-400" />
                  <span>3. Data e Horário:</span>
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[11px] text-slate-500 mb-1 block">Data da Consulta:</label>
                    <input
                      type="date"
                      value={formData}
                      onChange={(e) => setFormData(e.target.value)}
                      required
                      className="w-full glass-input px-3 py-2 text-xs font-mono"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] text-slate-500 mb-1 block">Horário de Início:</label>
                    <input
                      type="time"
                      value={formHorario}
                      onChange={(e) => setFormHorario(e.target.value)}
                      required
                      className="w-full glass-input px-3 py-2 text-xs font-mono"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] text-slate-500 mb-1 block">Duração (minutos):</label>
                    <input
                      type="number"
                      min={10}
                      max={240}
                      step={5}
                      value={formDuracao}
                      onChange={(e) => setFormDuracao(Number(e.target.value))}
                      required
                      className="w-full glass-input px-3 py-2 text-xs font-mono"
                    />
                  </div>
                </div>

                {/* Atalhos Rápidos de Horário */}
                <div className="flex items-center gap-1.5 flex-wrap pt-1">
                  <span className="text-[10px] text-slate-400 font-semibold mr-1">Horários rápidos:</span>
                  {['08:30', '09:00', '10:00', '11:00', '14:00', '15:00', '16:00', '17:00'].map(h => (
                    <button
                      key={h}
                      type="button"
                      onClick={() => setFormHorario(h)}
                      className={`px-2 py-0.5 rounded-lg text-[10px] font-mono transition-colors ${
                        formHorario === h 
                          ? 'bg-teal-700 text-white font-bold' 
                          : 'glass-button text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      {h}
                    </button>
                  ))}
                </div>
              </div>

              {/* ETAPA 4: STATUS & OBSERVAÇÕES */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-1">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1 block">
                    Status Inicial:
                  </label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as StatusAgendamento)}
                    className="w-full glass-input px-3 py-2 text-xs font-semibold"
                  >
                    <option value="confirmado">Confirmado</option>
                    <option value="agendado">Agendado (Pendente)</option>
                    <option value="em_atendimento">Em Atendimento</option>
                    <option value="concluido">Concluído</option>
                    <option value="cancelado">Cancelado</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1 block">
                    Observações / Recomendações Clínicas:
                  </label>
                  <input
                    type="text"
                    value={formObservacoes}
                    onChange={(e) => setFormObservacoes(e.target.value)}
                    placeholder="Ex: Trazer exames laboratoriais anteriores / retorno pós-minoxidil"
                    className="w-full glass-input px-3 py-2 text-xs"
                  />
                </div>
              </div>

              {/* Botões do Rodapé do Modal */}
              <div className="pt-3 border-t border-slate-200/60 dark:border-white/[0.08] flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setModalAgendamentoAberto(false)}
                  className="px-4 py-2 rounded-xl glass-button text-xs font-semibold text-slate-600 dark:text-slate-300"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={salvandoAgendamento}
                  className="px-5 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs flex items-center gap-2 shadow-md shadow-teal-700/25 transition-all disabled:opacity-50"
                >
                  {salvandoAgendamento ? 'Salvando...' : (agendamentoEmEdicao ? 'Atualizar Agendamento' : 'Confirmar Agendamento')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. MODAL CADASTRO RÁPIDO DE PACIENTE */}
      {/* ========================================================================= */}
      {modalNovoPaciente && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-slate-950/70 backdrop-blur-sm overflow-y-auto animate-fadeIn">
          <div className="w-full max-w-md bg-white dark:bg-[#071918] rounded-3xl p-5 sm:p-6 shadow-2xl border border-teal-200/70 dark:border-teal-500/30 space-y-4 max-h-[90vh] overflow-y-auto my-auto">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200/60 dark:border-white/[0.08]">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-teal-700 dark:text-teal-400" />
                <span>Cadastro Rápido de Paciente</span>
              </h3>
              <button 
                onClick={() => setModalNovoPaciente(false)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCadastrarNovoPacienteRapido} className="space-y-3.5 text-xs">
              <div>
                <label className="text-slate-600 dark:text-slate-300 font-semibold mb-1 block">Nome Completo:</label>
                <input
                  type="text"
                  value={novoPacienteNome}
                  onChange={(e) => setNovoPacienteNome(e.target.value)}
                  placeholder="Nome do paciente"
                  required
                  className="w-full glass-input px-3 py-2"
                />
              </div>

              <div>
                <label className="text-slate-600 dark:text-slate-300 font-semibold mb-1 block">Telefone / WhatsApp:</label>
                <input
                  type="text"
                  value={novoPacienteTelefone}
                  onChange={(e) => setNovoPacienteTelefone(e.target.value)}
                  placeholder="(11) 98765-4321"
                  className="w-full glass-input px-3 py-2 font-mono"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModalNovoPaciente(false)}
                  className="px-3 py-1.5 rounded-xl glass-button font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={salvandoNovoPaciente}
                  className="px-4 py-1.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold transition-all disabled:opacity-50"
                >
                  {salvandoNovoPaciente ? 'Salvando...' : 'Salvar e Selecionar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 6. POP-UP DE LEMBRETE DE CONSULTAS HOJE */}
      {/* ========================================================================= */}
      <LembreteConsultaModal
        isOpen={modalLembreteAberto}
        onClose={() => setModalLembreteAberto(false)}
        agendamentosHoje={consultasHoje}
        onIniciarAtendimento={(ag) => {
          if (onIniciarExamePaciente) {
            onIniciarExamePaciente({ id: ag.pacienteId, nome: ag.pacienteNome });
          }
        }}
        onNavegarParaCalendario={() => {
          setDataSelecionada(hojeStr);
          handleIrParaHoje();
        }}
        onAtualizarStatus={handleAtualizarStatusRapido}
      />
    </div>
  );
};
