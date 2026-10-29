import React, { useState, useMemo } from 'react';
import { 
  FileText, 
  Camera, 
  Clock, 
  Sparkles, 
  CheckCircle, 
  AlertCircle, 
  Plus, 
  Download, 
  Share2, 
  Eye, 
  GitCompare, 
  Layers, 
  Calendar, 
  CheckSquare, 
  PlusCircle, 
  ArrowRight, 
  Trash2, 
  X, 
  Check, 
  Microscope, 
  Upload, 
  ChevronRight,
  Pill,
  Sliders,
  Maximize2,
  Heart,
  Smile,
  ShieldAlert,
  Info
} from 'lucide-react';
import { Paciente, ConsultaRegistro, FotoGlobalPaciente } from '../types/paciente';
import { RespostaAnamnese, FichaAvaliacaoCapilarData } from '../types/anamnese';
import { 
  ProtocoloPaciente, 
  SessaoProtocoloRegistro, 
  CategoriaProtocolo, 
  StatusProtocolo,
  TEMPLATES_PROTOCOLOS_PADRAO 
} from '../types/protocolo';
import { 
  salvarProtocoloPaciente, 
  registrarSessaoProtocolo, 
  atualizarStatusProtocolo, 
  deletarProtocoloPaciente 
} from '../services/protocolosService';

interface HistoricoClinicoViewProps {
  paciente: Paciente;
  usuarioAtual: any;
  fichas: RespostaAnamnese[];
  consultas: ConsultaRegistro[];
  fotosGlobais: FotoGlobalPaciente[];
  protocolos: ProtocoloPaciente[];
  onIniciarAnamnese?: (paciente: Paciente) => void;
  onCarregarSessaoNaBancada?: (sessionId: string) => void;
  onAbrirComparador?: (antes: string, depois: string, titAntes?: string, titDepois?: string) => void;
  onAbrirUploadFotoGlobal?: (anguloPreDefinido?: any) => void;
  onAbrirNovaConsulta?: () => void;
  onAtualizarProtocolos: (novos: ProtocoloPaciente[]) => void;
  onVisualizarFoto: (foto: { url: string; titulo: string; data: string }) => void;
  onBaixarPdfFicha: (fichaResposta: RespostaAnamnese) => void;
  onCompartilharPdfFicha: (fichaResposta: RespostaAnamnese) => void;
  onNavegarParaPlanos?: () => void;
}

export const HistoricoClinicoView: React.FC<HistoricoClinicoViewProps> = ({
  paciente,
  usuarioAtual,
  fichas,
  consultas,
  fotosGlobais,
  protocolos,
  onIniciarAnamnese,
  onCarregarSessaoNaBancada,
  onAbrirComparador,
  onAbrirUploadFotoGlobal,
  onAbrirNovaConsulta,
  onAtualizarProtocolos,
  onVisualizarFoto,
  onBaixarPdfFicha,
  onCompartilharPdfFicha
}) => {
  // Sub-filtro do histórico: 'tudo' | 'fichas' | 'anamneses' | 'fotos' | 'protocolos'
  const [subAba, setSubAba] = useState<'tudo' | 'fichas' | 'anamneses' | 'fotos' | 'protocolos'>('tudo');
  const [filtroTipoFoto, setFiltroTipoFoto] = useState<'todas' | 'globais' | 'tricoscopia' | 'consultas'>('todas');
  
  // Modais de Protocolo
  const [modalNovoProtocoloAberto, setModalNovoProtocoloAberto] = useState(false);
  const [modalRegistrarSessaoAberto, setModalRegistrarSessaoAberto] = useState<{ aberto: boolean; protocolo: ProtocoloPaciente | null }>({
    aberto: false,
    protocolo: null
  });
  const [protocoloParaExcluirId, setProtocoloParaExcluirId] = useState<string | null>(null);

  // Modal para Visualizar Ficha Completa
  const [modalFichaDetalhada, setModalFichaDetalhada] = useState<RespostaAnamnese | null>(null);

  // Formulário de Novo Protocolo
  const [formProtTitulo, setFormProtTitulo] = useState('');
  const [formProtObjetivo, setFormProtObjetivo] = useState('');
  const [formProtCategoria, setFormProtCategoria] = useState<CategoriaProtocolo>('cabine');
  const [formProtDataInicio, setFormProtDataInicio] = useState(() => new Date().toISOString().split('T')[0]);
  const [formProtFrequencia, setFormProtFrequencia] = useState('Semanal');
  const [formProtTotalSessoes, setFormProtTotalSessoes] = useState(8);
  const [formProtEtapas, setFormProtEtapas] = useState('');
  const [formProtHomeCare, setFormProtHomeCare] = useState('');
  const [formProtObservacoes, setFormProtObservacoes] = useState('');
  const [formProtLiberado, setFormProtLiberado] = useState(true);
  const [salvandoProtocolo, setSalvandoProtocolo] = useState(false);

  // Formulário de Registrar Sessão
  const [formSessData, setFormSessData] = useState(() => new Date().toISOString().split('T')[0]);
  const [formSessDescricao, setFormSessDescricao] = useState('');
  const [formSessObs, setFormSessObs] = useState('');
  const [salvandoSessao, setSalvandoSessao] = useState(false);

  // Alerta local
  const [alerta, setAlerta] = useState<{ tipo: 'sucesso' | 'erro'; mensagem: string } | null>(null);

  const mostrarAlerta = (tipo: 'sucesso' | 'erro', mensagem: string) => {
    setAlerta({ tipo, mensagem });
    setTimeout(() => setAlerta(null), 4500);
  };

  // Coleta unificada de fotos do paciente
  const todasFotos = useMemo(() => {
    const list: Array<{
      id: string;
      url: string;
      titulo: string;
      data: string;
      tipo: 'global' | 'tricoscopia' | 'consulta';
      tag: string;
      sessionId?: string;
    }> = [];

    // 1. Fotos Globais
    fotosGlobais.forEach(fg => {
      list.push({
        id: `global_${fg.id}`,
        url: fg.imagemUrl,
        titulo: `Foto Global • ${fg.angulo}`,
        data: fg.data,
        tipo: 'global',
        tag: String(fg.angulo)
      });
    });

    // 2. Fotos de Tricoscopia e Consultas
    consultas.forEach(c => {
      if (c.imagemUrl && c.imagemUrl.trim() !== '') {
        list.push({
          id: `cons_${c.id}`,
          url: c.imagemUrl,
          titulo: `${c.tipoConsulta || 'Consulta'} • ${c.area}`,
          data: c.data,
          tipo: c.sessionId ? 'tricoscopia' : 'consulta',
          tag: c.area,
          sessionId: c.sessionId
        });
      }

      if (c.fotos && c.fotos.length > 0) {
        c.fotos.forEach((f, idx) => {
          if (f.url && f.url !== c.imagemUrl) {
            list.push({
              id: `cons_foto_${c.id}_${f.id || idx}`,
              url: f.url,
              titulo: f.titulo || `${c.area} - Foto ${idx + 1}`,
              data: f.data || c.data,
              tipo: 'consulta',
              tag: f.area || c.area
            });
          }
        });
      }
    });

    return list.sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());
  }, [fotosGlobais, consultas]);

  const fotosFiltradas = useMemo(() => {
    if (filtroTipoFoto === 'todas') return todasFotos;
    return todasFotos.filter(f => f.tipo === filtroTipoFoto);
  }, [todasFotos, filtroTipoFoto]);

  // Aplicar Template de Protocolo
  const handleSelecionarTemplate = (t: typeof TEMPLATES_PROTOCOLOS_PADRAO[0]) => {
    setFormProtTitulo(t.titulo);
    setFormProtObjetivo(t.objetivo);
    setFormProtCategoria(t.categoria);
    setFormProtFrequencia(t.frequencia);
    setFormProtTotalSessoes(t.totalSessoes);
    setFormProtEtapas(t.etapasProcedimento);
    setFormProtHomeCare(t.produtosHomeCare);
  };

  // Salvar Novo Protocolo
  const handleSalvarProtocolo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formProtTitulo.trim()) {
      mostrarAlerta('erro', 'Informe o título do protocolo.');
      return;
    }

    setSalvandoProtocolo(true);
    try {
      const novo = await salvarProtocoloPaciente({
        pacienteId: paciente.id,
        pacienteNome: paciente.nome,
        profissionalUid: usuarioAtual?.uid,
        titulo: formProtTitulo,
        objetivo: formProtObjetivo,
        categoria: formProtCategoria,
        status: 'em_andamento',
        dataInicio: formProtDataInicio,
        frequencia: formProtFrequencia,
        totalSessoesPlanejadas: formProtTotalSessoes,
        etapasProcedimento: formProtEtapas,
        produtosHomeCare: formProtHomeCare,
        observacoes: formProtObservacoes,
        liberadoPaciente: formProtLiberado
      });

      onAtualizarProtocolos([novo, ...protocolos.filter(p => p.id !== novo.id)]);
      setModalNovoProtocoloAberto(false);
      setFormProtTitulo('');
      setFormProtObjetivo('');
      setFormProtEtapas('');
      setFormProtHomeCare('');
      setFormProtObservacoes('');
      mostrarAlerta('sucesso', `Protocolo "${novo.titulo}" cadastrado com sucesso no histórico!`);
    } catch {
      mostrarAlerta('erro', 'Falha ao salvar protocolo terapêutico.');
    } finally {
      setSalvandoProtocolo(false);
    }
  };

  // Registrar Sessão no Protocolo
  const handleRegistrarSessao = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalRegistrarSessaoAberto.protocolo) return;

    setSalvandoSessao(true);
    try {
      const atualizado = await registrarSessaoProtocolo(
        modalRegistrarSessaoAberto.protocolo.id,
        paciente.id,
        {
          data: formSessData,
          descricaoProcedimento: formSessDescricao,
          observacoes: formSessObs,
          profissionalNome: usuarioAtual?.nome || 'Profissional'
        }
      );

      if (atualizado) {
        onAtualizarProtocolos(protocolos.map(p => p.id === atualizado.id ? atualizado : p));
        mostrarAlerta('sucesso', `Sessão ${(atualizado.sessoesRealizadas?.length || 1)} registrada no protocolo com sucesso!`);
      }
      setModalRegistrarSessaoAberto({ aberto: false, protocolo: null });
      setFormSessDescricao('');
      setFormSessObs('');
    } catch {
      mostrarAlerta('erro', 'Erro ao registrar sessão no protocolo.');
    } finally {
      setSalvandoSessao(false);
    }
  };

  // Alterar Status do Protocolo
  const handleAlterarStatus = async (protocoloId: string, novoStatus: StatusProtocolo) => {
    try {
      await atualizarStatusProtocolo(protocoloId, paciente.id, novoStatus);
      onAtualizarProtocolos(protocolos.map(p => p.id === protocoloId ? { ...p, status: novoStatus } : p));
      mostrarAlerta('sucesso', `Status do protocolo atualizado para "${novoStatus.replace('_', ' ')}".`);
    } catch {
      mostrarAlerta('erro', 'Erro ao atualizar status do protocolo.');
    }
  };

  // Excluir Protocolo
  const handleConfirmarExcluirProtocolo = async () => {
    if (!protocoloParaExcluirId) return;
    try {
      await deletarProtocoloPaciente(protocoloParaExcluirId, paciente.id);
      onAtualizarProtocolos(protocolos.filter(p => p.id !== protocoloParaExcluirId));
      mostrarAlerta('sucesso', 'Protocolo terapêutico removido do histórico.');
    } catch {
      mostrarAlerta('erro', 'Erro ao excluir protocolo.');
    } finally {
      setProtocoloParaExcluirId(null);
    }
  };

  // Obter dados decodificados de uma ficha
  const parseFichaData = (ficha: RespostaAnamnese): FichaAvaliacaoCapilarData | null => {
    try {
      if (ficha.dadosFichaJson) {
        return JSON.parse(ficha.dadosFichaJson);
      }
    } catch {}
    return null;
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* ALERTA DE NOTIFICAÇÃO */}
      {alerta && (
        <div className={`p-4 rounded-2xl flex items-center justify-between text-xs font-semibold shadow-md animate-fadeIn ${
          alerta.tipo === 'sucesso'
            ? 'bg-emerald-50 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-800'
            : 'bg-rose-50 dark:bg-rose-950 text-rose-800 dark:text-rose-200 border border-rose-300 dark:border-rose-800'
        }`}>
          <div className="flex items-center gap-2">
            {alerta.tipo === 'sucesso' ? <Check className="w-4 h-4 text-emerald-600" /> : <AlertCircle className="w-4 h-4 text-rose-600" />}
            <span>{alerta.mensagem}</span>
          </div>
          <button onClick={() => setAlerta(null)} className="p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/5">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* CABEÇALHO DO HISTÓRICO CLÍNICO UNIFICADO */}
      <div className="bg-gradient-to-r from-teal-900 via-teal-800 to-slate-900 text-white rounded-3xl p-6 sm:p-7 shadow-lg relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-radial from-teal-500/20 to-transparent pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-3 py-1 rounded-full bg-teal-400/20 text-teal-200 text-[11px] font-bold uppercase tracking-wider border border-teal-400/30 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-teal-300" />
                <span>Histórico Clínico Unificado</span>
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-white/10 text-white/80 font-mono text-[11px]">
                {paciente.nome}
              </span>
            </div>

            <h2 className="text-xl sm:text-2xl font-bold tracking-tight">
              Dossiê Completo de Acompanhamento
            </h2>
            <p className="text-xs sm:text-sm text-teal-100/80 max-w-2xl leading-relaxed">
              Consolidação de todas as fichas preenchidas, questionários de anamnese, registros fotográficos comparativos e protocolos terapêuticos de <strong>{paciente.nome}</strong>.
            </p>
          </div>

          {/* Ações Rápidas no Topo do Histórico */}
          <div className="flex items-center gap-2.5 flex-wrap shrink-0">
            {onIniciarAnamnese && (
              <button
                type="button"
                onClick={() => onIniciarAnamnese(paciente)}
                className="px-3.5 py-2 rounded-xl bg-white text-teal-900 hover:bg-teal-50 text-xs font-bold flex items-center gap-1.5 transition-all shadow-md hover:scale-[1.02]"
                title="Criar ou preencher nova ficha/anamnese"
              >
                <Plus className="w-3.5 h-3.5 text-teal-700" />
                <span>+ Nova Ficha</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setModalNovoProtocoloAberto(true)}
              className="px-3.5 py-2 rounded-xl bg-teal-600/80 hover:bg-teal-600 text-white text-xs font-bold flex items-center gap-1.5 transition-all border border-teal-400/40 shadow-sm"
              title="Adicionar protocolo terapêutico para este paciente"
            >
              <Sparkles className="w-3.5 h-3.5 text-teal-200" />
              <span>+ Novo Protocolo</span>
            </button>

            {todasFotos.length >= 2 && onAbrirComparador && (
              <button
                type="button"
                onClick={() => {
                  const foto1 = todasFotos[todasFotos.length - 1];
                  const foto2 = todasFotos[0];
                  onAbrirComparador(
                    foto1.url,
                    foto2.url,
                    `Anterior (${foto1.data} • ${foto1.tag})`,
                    `Recente (${foto2.data} • ${foto2.tag})`
                  );
                }}
                className="px-3.5 py-2 rounded-xl bg-emerald-600/80 hover:bg-emerald-600 text-white text-xs font-bold flex items-center gap-1.5 transition-all border border-emerald-400/40 shadow-sm"
                title="Comparar evolução das fotos antes e depois"
              >
                <GitCompare className="w-3.5 h-3.5 text-emerald-200" />
                <span>Comparar Mudanças</span>
              </button>
            )}
          </div>
        </div>

        {/* 4 CARDS DE MÉTRICAS RÁPIDAS DOS 4 PILARES */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 pt-6 mt-6 border-t border-teal-700/60 text-slate-100">
          {/* Pilar 1: Fichas Preenchidas */}
          <div 
            onClick={() => setSubAba('fichas')}
            className="p-3.5 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/10 transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-teal-200 uppercase tracking-wider flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-teal-300" />
                <span>Fichas</span>
              </span>
              <span className="text-lg font-bold font-mono">{fichas.length}</span>
            </div>
            <p className="text-[11px] text-teal-100/70 truncate mt-1">
              {fichas.length > 0 ? `${fichas.length} avaliação(ões) salva(s)` : 'Nenhuma ficha ainda'}
            </p>
          </div>

          {/* Pilar 2: Anamneses */}
          <div 
            onClick={() => setSubAba('anamneses')}
            className="p-3.5 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/10 transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-teal-200 uppercase tracking-wider flex items-center gap-1.5">
                <CheckSquare className="w-3.5 h-3.5 text-teal-300" />
                <span>Anamneses</span>
              </span>
              <span className="text-lg font-bold font-mono">{fichas.length}</span>
            </div>
            <p className="text-[11px] text-teal-100/70 truncate mt-1">
              Antecedentes e queixas
            </p>
          </div>

          {/* Pilar 3: Registros Fotográficos */}
          <div 
            onClick={() => setSubAba('fotos')}
            className="p-3.5 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/10 transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-teal-200 uppercase tracking-wider flex items-center gap-1.5">
                <Camera className="w-3.5 h-3.5 text-teal-300" />
                <span>Fotos Clínicas</span>
              </span>
              <span className="text-lg font-bold font-mono">{todasFotos.length}</span>
            </div>
            <p className="text-[11px] text-teal-100/70 truncate mt-1">
              {fotosGlobais.length} globais • {consultas.length} consultas
            </p>
          </div>

          {/* Pilar 4: Protocolos */}
          <div 
            onClick={() => setSubAba('protocolos')}
            className="p-3.5 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/10 transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-teal-200 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-teal-300" />
                <span>Protocolos</span>
              </span>
              <span className="text-lg font-bold font-mono">{protocolos.length}</span>
            </div>
            <p className="text-[11px] text-teal-100/70 truncate mt-1">
              {protocolos.filter(p => p.status === 'em_andamento').length} em andamento
            </p>
          </div>
        </div>
      </div>

      {/* SELETOR DE ABAS INTERNAS DO HISTÓRICO */}
      <div className="flex items-center gap-2 border-b border-stone-200 dark:border-slate-800 pb-2 overflow-x-auto scrollbar-thin">
        <button
          type="button"
          onClick={() => setSubAba('tudo')}
          className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 border whitespace-nowrap ${
            subAba === 'tudo'
              ? 'bg-stone-900 text-white border-stone-900 dark:bg-white dark:text-slate-900 dark:border-white shadow-xs'
              : 'bg-white dark:bg-slate-900 text-stone-600 dark:text-slate-400 border-stone-200 dark:border-slate-800 hover:bg-stone-50'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Visão Geral Consolidada</span>
        </button>

        <button
          type="button"
          onClick={() => setSubAba('fichas')}
          className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 border whitespace-nowrap ${
            subAba === 'fichas'
              ? 'bg-teal-700 text-white border-teal-700 shadow-md shadow-teal-700/20'
              : 'bg-white dark:bg-slate-900 text-stone-600 dark:text-slate-400 border-stone-200 dark:border-slate-800 hover:bg-stone-50'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>Fichas Preenchidas</span>
          <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
            subAba === 'fichas' ? 'bg-white/20 text-white' : 'bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-300'
          }`}>
            {fichas.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setSubAba('anamneses')}
          className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 border whitespace-nowrap ${
            subAba === 'anamneses'
              ? 'bg-teal-700 text-white border-teal-700 shadow-md shadow-teal-700/20'
              : 'bg-white dark:bg-slate-900 text-stone-600 dark:text-slate-400 border-stone-200 dark:border-slate-800 hover:bg-stone-50'
          }`}
        >
          <CheckSquare className="w-3.5 h-3.5" />
          <span>Anamneses</span>
          <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
            subAba === 'anamneses' ? 'bg-white/20 text-white' : 'bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-300'
          }`}>
            {fichas.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setSubAba('fotos')}
          className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 border whitespace-nowrap ${
            subAba === 'fotos'
              ? 'bg-teal-700 text-white border-teal-700 shadow-md shadow-teal-700/20'
              : 'bg-white dark:bg-slate-900 text-stone-600 dark:text-slate-400 border-stone-200 dark:border-slate-800 hover:bg-stone-50'
          }`}
        >
          <Camera className="w-3.5 h-3.5" />
          <span>Registros Fotográficos</span>
          <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
            subAba === 'fotos' ? 'bg-white/20 text-white' : 'bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-300'
          }`}>
            {todasFotos.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setSubAba('protocolos')}
          className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 border whitespace-nowrap ${
            subAba === 'protocolos'
              ? 'bg-teal-700 text-white border-teal-700 shadow-md shadow-teal-700/20'
              : 'bg-white dark:bg-slate-900 text-stone-600 dark:text-slate-400 border-stone-200 dark:border-slate-800 hover:bg-stone-50'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Protocolos Terapêuticos</span>
          <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
            subAba === 'protocolos' ? 'bg-white/20 text-white' : 'bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-300'
          }`}>
            {protocolos.length}
          </span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* 1. SEÇÃO: FICHAS PREENCHIDAS */}
      {/* ========================================================================= */}
      {(subAba === 'tudo' || subAba === 'fichas') && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-stone-200/90 dark:border-slate-800 p-5 sm:p-6 space-y-4 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-100 dark:border-slate-800 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-300 flex items-center justify-center border border-teal-200/60 dark:border-teal-800 shrink-0">
                <FileText className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-stone-900 dark:text-slate-100 uppercase tracking-wider flex items-center gap-2">
                  <span>Fichas Preenchidas de {paciente.nome}</span>
                  <span className="px-2 py-0.5 rounded-full bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-300 text-[10px] font-mono">
                    {fichas.length}
                  </span>
                </h3>
                <p className="text-[11px] text-stone-400">
                  Fichas de avaliação capilar completas com dados cadastrais, saúde, hábitos, queixas e sessões.
                </p>
              </div>
            </div>

            {onIniciarAnamnese && (
              <button
                type="button"
                onClick={() => onIniciarAnamnese(paciente)}
                className="px-3.5 py-1.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs self-start sm:self-auto"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Preencher Nova Ficha</span>
              </button>
            )}
          </div>

          {fichas.length === 0 ? (
            <div className="text-center py-8 px-4 bg-stone-50/50 dark:bg-slate-950/40 rounded-2xl border border-dashed border-stone-200 dark:border-slate-800 space-y-2">
              <FileText className="w-8 h-8 text-stone-300 dark:text-slate-700 mx-auto" />
              <p className="text-xs font-bold text-stone-700 dark:text-slate-300">
                Nenhuma ficha de avaliação preenchida para {paciente.nome}
              </p>
              <p className="text-[11px] text-stone-400 max-w-sm mx-auto">
                Inicie uma ficha de avaliação para coletar dados de saúde, rotina, fotos e gerar o relatório em PDF.
              </p>
              {onIniciarAnamnese && (
                <button
                  type="button"
                  onClick={() => onIniciarAnamnese(paciente)}
                  className="px-4 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold shadow-xs transition-colors inline-flex items-center gap-1.5 mt-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Preencher 1ª Ficha</span>
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {fichas.map(f => {
                const sessoesList = (() => {
                  try {
                    return f.sessoesJson ? JSON.parse(f.sessoesJson) : [];
                  } catch {
                    return [];
                  }
                })();
                const fichaData = parseFichaData(f);

                return (
                  <div
                    key={f.id}
                    className="p-4 rounded-2xl bg-stone-50/70 dark:bg-slate-950/60 border border-stone-200/80 dark:border-slate-800 hover:border-teal-400 transition-all shadow-2xs space-y-3"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-stone-900 dark:text-slate-100 text-xs sm:text-sm">
                            {f.modeloTitulo}
                          </span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            f.status === 'rascunho'
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                              : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          }`}>
                            {f.status === 'rascunho' ? 'Rascunho' : 'Finalizada ✓'}
                          </span>
                          {sessoesList.length > 0 && (
                            <span className="px-2 py-0.5 rounded-full bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-300 text-[10px] font-bold flex items-center gap-1">
                              <Layers className="w-3 h-3" />
                              <span>{sessoesList.length} {sessoesList.length === 1 ? 'sessão' : 'sessões'}</span>
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-stone-500 font-mono">
                          Preenchida em: {new Date(f.dataPreenchimento).toLocaleDateString('pt-BR')} às {new Date(f.dataPreenchimento).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>

                      {/* Ações da Ficha */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <button
                          type="button"
                          onClick={() => setModalFichaDetalhada(f)}
                          className="px-3 py-1.5 rounded-xl bg-teal-50 dark:bg-teal-950 hover:bg-teal-100 text-teal-800 dark:text-teal-200 text-xs font-semibold flex items-center gap-1.5 transition-colors border border-teal-200 dark:border-teal-800"
                          title="Visualizar respostas e dados da ficha completa"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Ver Ficha Completa</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => onBaixarPdfFicha(f)}
                          className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-stone-100 text-stone-700 dark:text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors border border-stone-200 dark:border-slate-700"
                          title="Baixar PDF A4 Oficial com todas as etapas"
                        >
                          <Download className="w-3.5 h-3.5 text-teal-600" />
                          <span>Baixar PDF</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => onCompartilharPdfFicha(f)}
                          className="p-1.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-stone-100 text-stone-600 dark:text-slate-300 border border-stone-200 dark:border-slate-700 transition-colors"
                          title="Compartilhar PDF"
                        >
                          <Share2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Resumo clínico da ficha */}
                    {fichaData && (
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2 border-t border-stone-200/60 dark:border-slate-800 text-[11px]">
                        <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-stone-100 dark:border-slate-800 space-y-0.5">
                          <span className="text-[10px] font-bold text-stone-400 uppercase">Queixa Principal</span>
                          <p className="text-stone-800 dark:text-slate-200 font-medium truncate">
                            {fichaData.queixaPrincipal || 'Não informada'}
                          </p>
                        </div>
                        <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-stone-100 dark:border-slate-800 space-y-0.5">
                          <span className="text-[10px] font-bold text-stone-400 uppercase">Histórico Familiar</span>
                          <p className="text-stone-800 dark:text-slate-200 font-medium truncate">
                            {fichaData.doencaFamiliar?.sim ? `Sim (${fichaData.doencaFamiliar.qual || 'calvície'})` : 'Não'}
                          </p>
                        </div>
                        <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-stone-100 dark:border-slate-800 space-y-0.5">
                          <span className="text-[10px] font-bold text-stone-400 uppercase">Tratamento Sugerido</span>
                          <p className="text-stone-800 dark:text-slate-200 font-medium truncate">
                            {fichaData.tratamentoSugerido || 'Em definição'}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. SEÇÃO: ANAMNESES */}
      {/* ========================================================================= */}
      {(subAba === 'tudo' || subAba === 'anamneses') && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-stone-200/90 dark:border-slate-800 p-5 sm:p-6 space-y-4 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-100 dark:border-slate-800 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-300 flex items-center justify-center border border-teal-200/60 dark:border-teal-800 shrink-0">
                <CheckSquare className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-stone-900 dark:text-slate-100 uppercase tracking-wider flex items-center gap-2">
                  <span>Anamneses & Questionários Clínicos</span>
                  <span className="px-2 py-0.5 rounded-full bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-300 text-[10px] font-mono">
                    {fichas.length}
                  </span>
                </h3>
                <p className="text-[11px] text-stone-400">
                  Respostas estruturadas sobre hábitos de vida, histórico capilar, químicas e rotina.
                </p>
              </div>
            </div>

            {onIniciarAnamnese && (
              <button
                type="button"
                onClick={() => onIniciarAnamnese(paciente)}
                className="px-3.5 py-1.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs self-start sm:self-auto"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Nova Anamnese</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 text-xs">
            <div className="p-4 rounded-2xl bg-stone-50/70 dark:bg-slate-950/60 border border-stone-200/80 dark:border-slate-800 space-y-2">
              <span className="text-[10px] uppercase font-bold text-teal-800 dark:text-teal-300 tracking-wider flex items-center gap-1.5">
                <Heart className="w-3.5 h-3.5 text-rose-500" />
                <span>Resumo Clínico da Anamnese:</span>
              </span>
              <p className="text-stone-700 dark:text-slate-300 leading-relaxed font-medium">
                {paciente.queixaPrincipal || 'Queixa principal não registrada.'}
              </p>
              <div className="pt-2 text-[11px] text-stone-500 border-t border-stone-200/60 dark:border-slate-800">
                <strong>Antecedentes:</strong> {paciente.historicoClinico || 'Sem antecedentes clínicos ou cirúrgicos descritos.'}
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-teal-50/40 dark:bg-teal-950/20 border border-teal-200/80 dark:border-teal-800/60 space-y-2 flex flex-col justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold text-teal-900 dark:text-teal-300 tracking-wider flex items-center gap-1.5">
                  <Smile className="w-3.5 h-3.5 text-teal-600" />
                  <span>Acesso aos Questionários de Saúde:</span>
                </span>
                <p className="text-stone-600 dark:text-slate-400 text-xs mt-1 leading-relaxed">
                  As anamneses preenchidas detalham histórico ginecológico, uso de medicamentos contínuos, estresse, rotina de higienização e antecedentes familiares.
                </p>
              </div>
              {onIniciarAnamnese && (
                <button
                  type="button"
                  onClick={() => onIniciarAnamnese(paciente)}
                  className="w-full py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-2xs mt-2"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Acessar Módulo Completo de Anamnese ➜</span>
                </button>
              )}
            </div>
          </div>

          {/* LISTA DE QUESTIONÁRIOS DE ANAMNESE PREENCHIDOS */}
          <div className="pt-2 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-stone-600 dark:text-slate-400 flex items-center gap-2">
              <CheckSquare className="w-3.5 h-3.5 text-teal-600" />
              <span>Questionários de Anamnese Arquivados no Prontuário</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-stone-100 dark:bg-slate-800 text-stone-600 dark:text-slate-300 font-mono">
                {fichas.length}
              </span>
            </h4>

            {fichas.length === 0 ? (
              <div className="text-center py-6 px-4 bg-stone-50/40 dark:bg-slate-950/30 rounded-2xl border border-dashed border-stone-200 dark:border-slate-800 text-xs text-stone-400 space-y-2">
                <p>Nenhuma anamnese arquivada para este paciente.</p>
                {onIniciarAnamnese && (
                  <button
                    type="button"
                    onClick={() => onIniciarAnamnese(paciente)}
                    className="px-3.5 py-1.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold inline-flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Preencher Questionário de Anamnese</span>
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {fichas.map(f => {
                  const fichaData = parseFichaData(f);
                  return (
                    <div
                      key={`anamnese_${f.id}`}
                      className="p-4 rounded-2xl bg-stone-50/70 dark:bg-slate-950/60 border border-stone-200/80 dark:border-slate-800 hover:border-teal-400 transition-all shadow-2xs space-y-3"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-stone-900 dark:text-slate-100 text-xs sm:text-sm">
                              {f.modeloTitulo}
                            </span>
                            <span className="px-2 py-0.5 rounded-full bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-300 text-[10px] font-bold">
                              {f.status === 'rascunho' ? 'Rascunho' : 'Concluída ✓'}
                            </span>
                          </div>
                          <p className="text-[11px] text-stone-500 font-mono">
                            Data de preenchimento: {new Date(f.dataPreenchimento).toLocaleDateString('pt-BR')} às {new Date(f.dataPreenchimento).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setModalFichaDetalhada(f)}
                            className="px-3 py-1.5 rounded-xl bg-teal-50 dark:bg-teal-950 hover:bg-teal-100 text-teal-800 dark:text-teal-200 text-xs font-semibold flex items-center gap-1.5 transition-colors border border-teal-200 dark:border-teal-800"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Ver Detalhes da Anamnese</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => onBaixarPdfFicha(f)}
                            className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-stone-100 text-stone-700 dark:text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors border border-stone-200 dark:border-slate-700"
                          >
                            <Download className="w-3.5 h-3.5 text-teal-600" />
                            <span>PDF</span>
                          </button>
                        </div>
                      </div>

                      {/* Respostas estruturadas em destaque */}
                      {fichaData && (
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-stone-200/60 dark:border-slate-800 text-[11px]">
                          <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-stone-100 dark:border-slate-800 space-y-0.5">
                            <span className="text-[9px] font-bold text-stone-400 uppercase">Familiar Calvície</span>
                            <p className="text-stone-800 dark:text-slate-200 font-semibold truncate">
                              {fichaData.doencaFamiliar?.sim ? `Sim (${fichaData.doencaFamiliar.qual || 'hereditária'})` : 'Não'}
                            </p>
                          </div>
                          <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-stone-100 dark:border-slate-800 space-y-0.5">
                            <span className="text-[9px] font-bold text-stone-400 uppercase">Medicação Contínua</span>
                            <p className="text-stone-800 dark:text-slate-200 font-semibold truncate">
                              {fichaData.medicacaoContinua?.sim ? `Sim (${fichaData.medicacaoContinua.qual || 'em uso'})` : 'Não'}
                            </p>
                          </div>
                          <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-stone-100 dark:border-slate-800 space-y-0.5">
                            <span className="text-[9px] font-bold text-stone-400 uppercase">Lavagem Capilar</span>
                            <p className="text-stone-800 dark:text-slate-200 font-semibold truncate">
                              {fichaData.frequenciaLavagem || 'Não inf.'}
                            </p>
                          </div>
                          <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-stone-100 dark:border-slate-800 space-y-0.5">
                            <span className="text-[9px] font-bold text-stone-400 uppercase">Químicas Prévias</span>
                            <p className="text-stone-800 dark:text-slate-200 font-semibold truncate">
                              {fichaData.quimicas && fichaData.quimicas.length > 0 ? fichaData.quimicas.join(', ') : 'Nenhuma'}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. SEÇÃO: REGISTROS FOTOGRÁFICOS */}
      {/* ========================================================================= */}
      {(subAba === 'tudo' || subAba === 'fotos') && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-stone-200/90 dark:border-slate-800 p-5 sm:p-6 space-y-4 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-100 dark:border-slate-800 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-300 flex items-center justify-center border border-teal-200/60 dark:border-teal-800 shrink-0">
                <Camera className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-stone-900 dark:text-slate-100 uppercase tracking-wider flex items-center gap-2">
                  <span>Registros Fotográficos Clínicos</span>
                  <span className="px-2 py-0.5 rounded-full bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-300 text-[10px] font-mono">
                    {todasFotos.length} fotos
                  </span>
                </h3>
                <p className="text-[11px] text-stone-400">
                  Fotos macroscópicas da cabeça, registros de fototricoscopia por área e fotos das consultas.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {onAbrirUploadFotoGlobal && (
                <button
                  type="button"
                  onClick={() => onAbrirUploadFotoGlobal()}
                  className="px-3.5 py-1.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>+ Foto Global</span>
                </button>
              )}

              {onAbrirNovaConsulta && (
                <button
                  type="button"
                  onClick={onAbrirNovaConsulta}
                  className="px-3 py-1.5 rounded-xl bg-stone-100 dark:bg-slate-800 hover:bg-stone-200 text-stone-800 dark:text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors border border-stone-200 dark:border-slate-700"
                >
                  <PlusCircle className="w-3.5 h-3.5 text-teal-600" />
                  <span>+ Consulta com Foto</span>
                </button>
              )}

              {todasFotos.length >= 2 && onAbrirComparador && (
                <button
                  type="button"
                  onClick={() => {
                    const f1 = todasFotos[todasFotos.length - 1];
                    const f2 = todasFotos[0];
                    onAbrirComparador(f1.url, f2.url, `${f1.titulo} (${f1.data})`, `${f2.titulo} (${f2.data})`);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 text-xs font-semibold flex items-center gap-1.5 transition-colors hover:bg-emerald-100"
                >
                  <GitCompare className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Comparar Fotos</span>
                </button>
              )}
            </div>
          </div>

          {/* Filtros Rápidos de Fotos */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
            <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider shrink-0 mr-1">
              Filtrar fotos:
            </span>
            <button
              type="button"
              onClick={() => setFiltroTipoFoto('todas')}
              className={`px-2.5 py-1 rounded-xl text-[11px] font-semibold shrink-0 transition-all border ${
                filtroTipoFoto === 'todas'
                  ? 'bg-stone-900 text-white border-stone-900 dark:bg-white dark:text-slate-900'
                  : 'bg-stone-50 dark:bg-slate-800/60 text-stone-600 dark:text-slate-400 border-stone-200/80 dark:border-slate-700'
              }`}
            >
              Todas ({todasFotos.length})
            </button>
            <button
              type="button"
              onClick={() => setFiltroTipoFoto('globais')}
              className={`px-2.5 py-1 rounded-xl text-[11px] font-semibold shrink-0 transition-all border ${
                filtroTipoFoto === 'globais'
                  ? 'bg-teal-700 text-white border-teal-700 shadow-2xs'
                  : 'bg-stone-50 dark:bg-slate-800/60 text-stone-600 dark:text-slate-400 border-stone-200/80 dark:border-slate-700'
              }`}
            >
              Globais Macroscópicas ({fotosGlobais.length})
            </button>
            <button
              type="button"
              onClick={() => setFiltroTipoFoto('tricoscopia')}
              className={`px-2.5 py-1 rounded-xl text-[11px] font-semibold shrink-0 transition-all border ${
                filtroTipoFoto === 'tricoscopia'
                  ? 'bg-teal-700 text-white border-teal-700 shadow-2xs'
                  : 'bg-stone-50 dark:bg-slate-800/60 text-stone-600 dark:text-slate-400 border-stone-200/80 dark:border-slate-700'
              }`}
            >
              Tricoscopia por Área ({todasFotos.filter(f => f.tipo === 'tricoscopia').length})
            </button>
            <button
              type="button"
              onClick={() => setFiltroTipoFoto('consultas')}
              className={`px-2.5 py-1 rounded-xl text-[11px] font-semibold shrink-0 transition-all border ${
                filtroTipoFoto === 'consultas'
                  ? 'bg-teal-700 text-white border-teal-700 shadow-2xs'
                  : 'bg-stone-50 dark:bg-slate-800/60 text-stone-600 dark:text-slate-400 border-stone-200/80 dark:border-slate-700'
              }`}
            >
              Consultas & Retornos ({todasFotos.filter(f => f.tipo === 'consulta').length})
            </button>
          </div>

          {fotosFiltradas.length === 0 ? (
            <div className="text-center py-10 px-4 space-y-3 bg-stone-50/50 dark:bg-slate-950/40 rounded-2xl border border-dashed border-stone-200 dark:border-slate-800">
              <Camera className="w-8 h-8 text-stone-300 dark:text-slate-700 mx-auto" />
              <p className="text-xs font-bold text-stone-700 dark:text-slate-300">
                Nenhuma foto encontrada nesta categoria para {paciente.nome}
              </p>
              <p className="text-[11px] text-stone-400 max-w-sm mx-auto">
                Faça upload de fotos macroscópicas ou capture fotos na bancada de tricoscopia para compor o acervo fotográfico.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3.5">
              {fotosFiltradas.map((foto, idx) => (
                <div
                  key={foto.id || idx}
                  className="p-3 rounded-2xl border border-stone-200/80 dark:border-slate-800 bg-stone-50/50 dark:bg-slate-950/40 flex flex-col justify-between gap-2.5 transition-all hover:border-teal-400 group shadow-2xs"
                >
                  <div
                    onClick={() => onVisualizarFoto({ url: foto.url, titulo: foto.titulo, data: foto.data })}
                    className="w-full aspect-[4/3] rounded-xl overflow-hidden bg-black relative cursor-pointer group-hover:scale-[1.01] transition-transform"
                    title="Clique para ampliar em tela cheia"
                  >
                    <img src={foto.url} alt={foto.titulo} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-semibold gap-1">
                      <Eye className="w-4 h-4" />
                      <span>Ampliar</span>
                    </div>
                    <span className={`absolute top-2 left-2 px-2 py-0.5 rounded-md font-bold text-[9px] shadow-xs backdrop-blur-xs ${
                      foto.tipo === 'global'
                        ? 'bg-teal-900/90 text-white'
                        : foto.tipo === 'tricoscopia'
                          ? 'bg-rose-900/90 text-white'
                          : 'bg-blue-900/90 text-white'
                    }`}>
                      {foto.tag}
                    </span>
                  </div>

                  <div className="space-y-1 text-[11px]">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-stone-500 font-semibold">{foto.data}</span>
                      <span className="text-[9px] uppercase font-bold text-stone-400">
                        {foto.tipo === 'global' ? 'Macro' : foto.tipo === 'tricoscopia' ? 'Tricoscopia' : 'Consulta'}
                      </span>
                    </div>
                    <h5 className="font-bold text-stone-900 dark:text-slate-100 truncate text-xs" title={foto.titulo}>
                      {foto.titulo}
                    </h5>

                    {foto.sessionId && onCarregarSessaoNaBancada && (
                      <button
                        type="button"
                        onClick={() => onCarregarSessaoNaBancada(foto.sessionId!)}
                        className="w-full mt-1 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 dark:bg-rose-950 dark:hover:bg-rose-900 text-rose-800 dark:text-rose-200 text-[10px] font-bold flex items-center justify-center gap-1 border border-rose-200 dark:border-rose-800"
                        title="Abrir imagem na bancada para recontagem"
                      >
                        <Microscope className="w-3 h-3 text-rose-600" />
                        <span>Abrir na Bancada</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. SEÇÃO: PROTOCOLOS TERAPÊUTICOS */}
      {/* ========================================================================= */}
      {(subAba === 'tudo' || subAba === 'protocolos') && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-stone-200/90 dark:border-slate-800 p-5 sm:p-6 space-y-4 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-100 dark:border-slate-800 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-300 flex items-center justify-center border border-teal-200/60 dark:border-teal-800 shrink-0">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-stone-900 dark:text-slate-100 uppercase tracking-wider flex items-center gap-2">
                  <span>Protocolos Terapêuticos & Tratamentos</span>
                  <span className="px-2 py-0.5 rounded-full bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-300 text-[10px] font-mono">
                    {protocolos.length}
                  </span>
                </h3>
                <p className="text-[11px] text-stone-400">
                  Planos de ação clínica, sessões em cabine, fotobioestimulação e cuidados domiciliares prescritos.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setModalNovoProtocoloAberto(true)}
              className="px-3.5 py-1.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs self-start sm:self-auto"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Novo Protocolo</span>
            </button>
          </div>

          {protocolos.length === 0 ? (
            <div className="text-center py-10 px-4 space-y-3 bg-stone-50/50 dark:bg-slate-950/40 rounded-2xl border border-dashed border-stone-200 dark:border-slate-800">
              <Sparkles className="w-8 h-8 text-stone-300 dark:text-slate-700 mx-auto" />
              <div className="space-y-1">
                <p className="text-xs font-bold text-stone-700 dark:text-slate-300">
                  Nenhum protocolo terapêutico cadastrado para {paciente.nome}
                </p>
                <p className="text-[11px] text-stone-400 max-w-sm mx-auto">
                  Defina um protocolo com sessões previstas (LED, drug delivery, microagulhamento) e fórmulas home care associadas.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setModalNovoProtocoloAberto(true)}
                className="px-4 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold shadow-xs transition-colors inline-flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Criar 1º Protocolo Terapêutico</span>
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {protocolos.map(prot => {
                const total = prot.totalSessoesPlanejadas || 1;
                const realizadas = prot.sessoesRealizadas?.length || 0;
                const percentual = Math.min(100, Math.round((realizadas / total) * 100));

                return (
                  <div
                    key={prot.id}
                    className="p-5 rounded-2xl bg-stone-50/70 dark:bg-slate-950/60 border border-stone-200/80 dark:border-slate-800 hover:border-teal-400 transition-all shadow-2xs space-y-4"
                  >
                    {/* Cabeçalho do Protocolo */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-200/60 dark:border-slate-800 pb-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-bold text-stone-900 dark:text-slate-100 text-sm">
                            {prot.titulo}
                          </h4>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            prot.status === 'concluido'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                              : prot.status === 'pausado'
                                ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                                : 'bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300'
                          }`}>
                            {prot.status === 'concluido' ? 'Concluído ✓' : prot.status === 'pausado' ? 'Pausado' : 'Em Andamento'}
                          </span>
                          <span className="px-2 py-0.5 rounded-md bg-stone-200/70 dark:bg-slate-800 text-stone-700 dark:text-slate-300 text-[10px] font-medium">
                            {prot.categoria === 'cabine' ? 'Em Cabine' : prot.categoria === 'home_care' ? 'Home Care' : 'Integrado'}
                          </span>
                        </div>
                        <p className="text-xs text-stone-600 dark:text-slate-400">
                          {prot.objetivo}
                        </p>
                      </div>

                      {/* Ações do Protocolo */}
                      <div className="flex items-center gap-2 flex-wrap">
                        {prot.status !== 'concluido' && (
                          <button
                            type="button"
                            onClick={() => {
                              setModalRegistrarSessaoAberto({ aberto: true, protocolo: prot });
                              setFormSessData(new Date().toISOString().split('T')[0]);
                              setFormSessDescricao(`Sessão ${realizadas + 1}: `);
                            }}
                            className="px-3 py-1.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs"
                          >
                            <CheckCircle className="w-3.5 h-3.5" />
                            <span>+ Registrar Sessão Realizada</span>
                          </button>
                        )}

                        <select
                          value={prot.status}
                          onChange={(e) => handleAlterarStatus(prot.id, e.target.value as StatusProtocolo)}
                          className="text-[11px] font-semibold py-1.5 px-2 rounded-xl border border-stone-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-stone-700 dark:text-slate-200 focus:outline-none"
                        >
                          <option value="em_andamento">Em Andamento</option>
                          <option value="concluido">Concluído</option>
                          <option value="pausado">Pausado</option>
                        </select>

                        <button
                          type="button"
                          onClick={() => setProtocoloParaExcluirId(prot.id)}
                          className="p-1.5 rounded-xl text-stone-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950 transition-colors"
                          title="Excluir este protocolo"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Barra de Progresso de Sessões */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs font-semibold">
                        <span className="text-stone-700 dark:text-slate-300 flex items-center gap-1.5">
                          <Layers className="w-3.5 h-3.5 text-teal-600" />
                          <span>Progresso das Sessões Planejadas:</span>
                        </span>
                        <span className="font-mono text-teal-800 dark:text-teal-300">
                          {realizadas} de {total} sessões ({percentual}%)
                        </span>
                      </div>
                      <div className="w-full h-2.5 rounded-full bg-stone-200 dark:bg-slate-800 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            percentual >= 100
                              ? 'bg-emerald-600'
                              : 'bg-gradient-to-r from-teal-600 to-teal-500'
                          }`}
                          style={{ width: `${percentual}%` }}
                        />
                      </div>
                    </div>

                    {/* Detalhes do Procedimento e Home Care */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                      {prot.etapasProcedimento && (
                        <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-stone-100 dark:border-slate-800 space-y-1">
                          <span className="text-[10px] uppercase font-bold text-teal-800 dark:text-teal-300 tracking-wider">
                            Passos / Procedimento em Cabine:
                          </span>
                          <p className="text-stone-700 dark:text-slate-300 whitespace-pre-line leading-relaxed">
                            {prot.etapasProcedimento}
                          </p>
                        </div>
                      )}

                      {prot.produtosHomeCare && (
                        <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-stone-100 dark:border-slate-800 space-y-1">
                          <span className="text-[10px] uppercase font-bold text-amber-800 dark:text-amber-300 tracking-wider flex items-center gap-1">
                            <Pill className="w-3 h-3 text-amber-600" />
                            <span>Cuidados Domiciliares (Home Care):</span>
                          </span>
                          <p className="text-stone-700 dark:text-slate-300 whitespace-pre-line leading-relaxed">
                            {prot.produtosHomeCare}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Histórico de Sessões Realizadas */}
                    {prot.sessoesRealizadas && prot.sessoesRealizadas.length > 0 && (
                      <div className="space-y-2 pt-2 border-t border-stone-200/60 dark:border-slate-800">
                        <span className="text-[11px] font-bold text-stone-700 dark:text-slate-300 flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-teal-600" />
                          <span>Registro das Sessões Realizadas ({prot.sessoesRealizadas.length}):</span>
                        </span>
                        <div className="space-y-1.5">
                          {prot.sessoesRealizadas.map(s => (
                            <div
                              key={s.id}
                              className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-stone-100 dark:border-slate-800 flex items-center justify-between text-xs gap-3"
                            >
                              <div className="flex items-center gap-2">
                                <span className="px-2 py-0.5 rounded-md bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-200 font-bold font-mono text-[10px]">
                                  Sessão {s.numeroSessao}
                                </span>
                                <span className="font-mono text-stone-500 font-semibold">{s.data}</span>
                                {s.descricaoProcedimento && (
                                  <span className="text-stone-800 dark:text-slate-200 font-medium">
                                    • {s.descricaoProcedimento}
                                  </span>
                                )}
                              </div>
                              {s.observacoes && (
                                <span className="text-[11px] text-stone-500 italic max-w-xs truncate" title={s.observacoes}>
                                  "{s.observacoes}"
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: NOVO PROTOCOLO TERAPÊUTICO */}
      {/* ========================================================================= */}
      {modalNovoProtocoloAberto && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-800 rounded-3xl w-full max-w-2xl p-5 sm:p-7 space-y-5 shadow-2xl max-h-[92vh] overflow-y-auto my-auto">
            <div className="flex items-center justify-between border-b border-stone-100 dark:border-slate-800 pb-3.5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-300 flex items-center justify-center border border-teal-200/60 dark:border-teal-800 shrink-0">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-stone-900 dark:text-slate-100">
                    Novo Protocolo Terapêutico
                  </h3>
                  <p className="text-xs text-stone-500 dark:text-slate-400">
                    Paciente: <strong>{paciente.nome}</strong>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalNovoProtocoloAberto(false)}
                className="p-1.5 rounded-xl text-stone-400 hover:text-stone-700 dark:hover:text-slate-200 hover:bg-stone-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* SELEÇÃO RÁPIDA DE TEMPLATES PADRÃO */}
            <div className="p-3.5 rounded-2xl bg-teal-50/50 dark:bg-teal-950/30 border border-teal-200/80 dark:border-teal-800/60 space-y-2">
              <span className="text-[11px] font-bold text-teal-900 dark:text-teal-200 uppercase tracking-wider block">
                ⚡ Modelos Consagrados de Protocolos Clínicos (1 Clique):
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                {TEMPLATES_PROTOCOLOS_PADRAO.map(tpl => (
                  <button
                    key={tpl.titulo}
                    type="button"
                    onClick={() => handleSelecionarTemplate(tpl)}
                    className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-teal-200 dark:border-teal-800/80 text-left hover:border-teal-500 hover:bg-teal-50/40 transition-all group"
                  >
                    <h5 className="font-bold text-stone-900 dark:text-slate-100 text-[11px] group-hover:text-teal-700 dark:group-hover:text-teal-300">
                      {tpl.titulo}
                    </h5>
                    <p className="text-[10px] text-stone-500 dark:text-slate-400 line-clamp-1 mt-0.5">
                      {tpl.frequencia} • {tpl.totalSessoes} sessões
                    </p>
                  </button>
                ))}
              </div>
            </div>

            <form onSubmit={handleSalvarProtocolo} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="font-semibold text-stone-700 dark:text-slate-300 block mb-1">
                    Nome do Protocolo Terapêutico *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Protocolo Fotobioestimulação LED + Drug Delivery Folicular"
                    value={formProtTitulo}
                    onChange={(e) => setFormProtTitulo(e.target.value)}
                    className="w-full bg-stone-50 dark:bg-slate-950 border border-stone-200 dark:border-slate-700 rounded-xl p-2.5 text-xs text-stone-900 dark:text-slate-100 focus:outline-none focus:border-teal-500"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="font-semibold text-stone-700 dark:text-slate-300 block mb-1">
                    Objetivo Clínico
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Redução da queda aguda em 4 semanas e estímulo à densidade no vértex"
                    value={formProtObjetivo}
                    onChange={(e) => setFormProtObjetivo(e.target.value)}
                    className="w-full bg-stone-50 dark:bg-slate-950 border border-stone-200 dark:border-slate-700 rounded-xl p-2.5 text-xs text-stone-900 dark:text-slate-100 focus:outline-none focus:border-teal-500"
                  />
                </div>

                <div>
                  <label className="font-semibold text-stone-700 dark:text-slate-300 block mb-1">
                    Categoria
                  </label>
                  <select
                    value={formProtCategoria}
                    onChange={(e) => setFormProtCategoria(e.target.value as CategoriaProtocolo)}
                    className="w-full bg-stone-50 dark:bg-slate-950 border border-stone-200 dark:border-slate-700 rounded-xl p-2.5 text-xs text-stone-900 dark:text-slate-100 focus:outline-none focus:border-teal-500"
                  >
                    <option value="cabine">Em Cabine (Clínica)</option>
                    <option value="home_care">Home Care (Domiciliar)</option>
                    <option value="integrado">Integrado (Cabine + Home Care)</option>
                    <option value="procedimento_especial">Procedimento Especial (MMP/Laser)</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-stone-700 dark:text-slate-300 block mb-1">
                    Frequência das Sessões
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Semanal, Quinzenal, 1x ao mês..."
                    value={formProtFrequencia}
                    onChange={(e) => setFormProtFrequencia(e.target.value)}
                    className="w-full bg-stone-50 dark:bg-slate-950 border border-stone-200 dark:border-slate-700 rounded-xl p-2.5 text-xs text-stone-900 dark:text-slate-100 focus:outline-none focus:border-teal-500"
                  />
                </div>

                <div>
                  <label className="font-semibold text-stone-700 dark:text-slate-300 block mb-1">
                    Data de Início
                  </label>
                  <input
                    type="date"
                    value={formProtDataInicio}
                    onChange={(e) => setFormProtDataInicio(e.target.value)}
                    className="w-full bg-stone-50 dark:bg-slate-950 border border-stone-200 dark:border-slate-700 rounded-xl p-2.5 text-xs text-stone-900 dark:text-slate-100 focus:outline-none focus:border-teal-500"
                  />
                </div>

                <div>
                  <label className="font-semibold text-stone-700 dark:text-slate-300 block mb-1">
                    Total de Sessões Planejadas
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={50}
                    value={formProtTotalSessoes}
                    onChange={(e) => setFormProtTotalSessoes(Number(e.target.value))}
                    className="w-full bg-stone-50 dark:bg-slate-950 border border-stone-200 dark:border-slate-700 rounded-xl p-2.5 text-xs text-stone-900 dark:text-slate-100 focus:outline-none focus:border-teal-500"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-stone-700 dark:text-slate-300 block mb-1">
                  Etapas e Procedimento em Cabine
                </label>
                <textarea
                  rows={3}
                  placeholder="Descreva as etapas realizadas em cabine: higienização, LED, ativos aplicados, microagulhamento..."
                  value={formProtEtapas}
                  onChange={(e) => setFormProtEtapas(e.target.value)}
                  className="w-full bg-stone-50 dark:bg-slate-950 border border-stone-200 dark:border-slate-700 rounded-xl p-2.5 text-xs text-stone-900 dark:text-slate-100 focus:outline-none focus:border-teal-500 resize-none"
                />
              </div>

              <div>
                <label className="font-semibold text-stone-700 dark:text-slate-300 block mb-1 flex items-center gap-1.5">
                  <Pill className="w-3.5 h-3.5 text-amber-600" />
                  <span>Produtos & Cuidados Domiciliares Prescritos (Home Care)</span>
                </label>
                <textarea
                  rows={2}
                  placeholder="Ex: Tônico fortalecedor com Fatores de Crescimento à noite, shampoo antioxidante 3x por semana..."
                  value={formProtHomeCare}
                  onChange={(e) => setFormProtHomeCare(e.target.value)}
                  className="w-full bg-stone-50 dark:bg-slate-950 border border-stone-200 dark:border-slate-700 rounded-xl p-2.5 text-xs text-stone-900 dark:text-slate-100 focus:outline-none focus:border-teal-500 resize-none"
                />
              </div>

              {/* Chave Liberar no Portal */}
              <label className="flex items-center gap-2.5 p-3 rounded-2xl border border-teal-200/80 dark:border-teal-800/60 bg-teal-50/50 dark:bg-teal-950/30 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formProtLiberado}
                  onChange={(e) => setFormProtLiberado(e.target.checked)}
                  className="rounded text-teal-600 focus:ring-teal-500 w-4 h-4 cursor-pointer"
                />
                <span className="text-xs font-semibold text-teal-900 dark:text-teal-200 select-none">
                  Liberar este protocolo e suas orientações no Portal do Paciente
                </span>
              </label>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-stone-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setModalNovoProtocoloAberto(false)}
                  className="px-4 py-2.5 rounded-xl bg-stone-100 dark:bg-slate-800 text-stone-700 dark:text-slate-300 font-semibold hover:bg-stone-200 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={salvandoProtocolo}
                  className="px-5 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold shadow-md shadow-teal-700/20 transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  <Check className="w-4 h-4" />
                  <span>{salvandoProtocolo ? 'Salvando...' : 'Salvar Protocolo no Histórico'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: REGISTRAR SESSÃO REALIZADA NO PROTOCOLO */}
      {/* ========================================================================= */}
      {modalRegistrarSessaoAberto.aberto && modalRegistrarSessaoAberto.protocolo && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-800 rounded-3xl w-full max-w-md p-5 sm:p-6 space-y-4 shadow-2xl my-auto">
            <div className="flex items-center justify-between border-b border-stone-100 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-stone-900 dark:text-slate-100">
                  Registrar Sessão Realizada
                </h3>
                <p className="text-xs text-stone-500">
                  {modalRegistrarSessaoAberto.protocolo.titulo}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setModalRegistrarSessaoAberto({ aberto: false, protocolo: null })}
                className="p-1 rounded-lg text-stone-400 hover:text-stone-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRegistrarSessao} className="space-y-3.5 text-xs">
              <div>
                <label className="font-semibold text-stone-700 dark:text-slate-300 block mb-1">
                  Data da Sessão *
                </label>
                <input
                  type="date"
                  required
                  value={formSessData}
                  onChange={(e) => setFormSessData(e.target.value)}
                  className="w-full bg-stone-50 dark:bg-slate-950 border border-stone-200 dark:border-slate-700 rounded-xl p-2.5 text-xs text-stone-900 dark:text-slate-100 focus:outline-none focus:border-teal-500"
                />
              </div>

              <div>
                <label className="font-semibold text-stone-700 dark:text-slate-300 block mb-1">
                  Descrição do Procedimento Realizado
                </label>
                <input
                  type="text"
                  placeholder="Ex: Aplicação de LED 650nm + drug delivery com fatores de crescimento"
                  value={formSessDescricao}
                  onChange={(e) => setFormSessDescricao(e.target.value)}
                  className="w-full bg-stone-50 dark:bg-slate-950 border border-stone-200 dark:border-slate-700 rounded-xl p-2.5 text-xs text-stone-900 dark:text-slate-100 focus:outline-none focus:border-teal-500"
                />
              </div>

              <div>
                <label className="font-semibold text-stone-700 dark:text-slate-300 block mb-1">
                  Observações da Sessão / Resposta Imediata
                </label>
                <textarea
                  rows={3}
                  placeholder="Ex: Boa tolerância do couro cabeludo, sem hiperemia persistente, paciente relatando menor queda..."
                  value={formSessObs}
                  onChange={(e) => setFormSessObs(e.target.value)}
                  className="w-full bg-stone-50 dark:bg-slate-950 border border-stone-200 dark:border-slate-700 rounded-xl p-2.5 text-xs text-stone-900 dark:text-slate-100 focus:outline-none focus:border-teal-500 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-stone-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setModalRegistrarSessaoAberto({ aberto: false, protocolo: null })}
                  className="px-4 py-2 rounded-xl bg-stone-100 dark:bg-slate-800 text-stone-700 dark:text-slate-300 font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={salvandoSessao}
                  className="px-5 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold shadow-xs transition-colors flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>{salvandoSessao ? 'Gravando...' : 'Salvar Sessão'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: VISUALIZAR FICHA COMPLETA */}
      {/* ========================================================================= */}
      {modalFichaDetalhada && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-800 rounded-3xl w-full max-w-3xl p-5 sm:p-7 space-y-5 shadow-2xl max-h-[92vh] overflow-y-auto my-auto text-xs">
            <div className="flex items-center justify-between border-b border-stone-100 dark:border-slate-800 pb-3.5">
              <div className="space-y-0.5">
                <span className="px-2 py-0.5 rounded-full bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-300 font-bold text-[10px]">
                  Ficha Oficial do Prontuário
                </span>
                <h3 className="text-base sm:text-lg font-bold text-stone-900 dark:text-slate-100">
                  {modalFichaDetalhada.modeloTitulo}
                </h3>
                <p className="text-[11px] text-stone-500">
                  Paciente: <strong>{paciente.nome}</strong> • Data: {new Date(modalFichaDetalhada.dataPreenchimento).toLocaleDateString('pt-BR')}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onBaixarPdfFicha(modalFichaDetalhada)}
                  className="px-3 py-1.5 rounded-xl bg-teal-50 dark:bg-teal-950 hover:bg-teal-100 text-teal-800 dark:text-teal-200 font-semibold flex items-center gap-1.5 border border-teal-200 dark:border-teal-800"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Baixar PDF</span>
                </button>
                <button
                  type="button"
                  onClick={() => setModalFichaDetalhada(null)}
                  className="p-1.5 rounded-xl text-stone-400 hover:text-stone-700"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Conteúdo Decodificado da Ficha */}
            {(() => {
              const data = parseFichaData(modalFichaDetalhada);
              if (!data) {
                return (
                  <div className="p-4 rounded-xl bg-stone-50 dark:bg-slate-950 text-stone-500">
                    Detalhes não estruturados para esta ficha. Utilize a opção "Baixar PDF" para obter o espelho completo.
                  </div>
                );
              }

              return (
                <div className="space-y-4">
                  {/* Dados Básicos */}
                  <div className="p-3.5 rounded-2xl bg-stone-50 dark:bg-slate-950 border border-stone-200/80 dark:border-slate-800 space-y-2">
                    <h5 className="font-bold text-stone-900 dark:text-slate-100 text-xs uppercase tracking-wider text-teal-800 dark:text-teal-300">
                      1. Identificação e Dados Cadastrais
                    </h5>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                      <div><strong className="text-stone-400">Nome:</strong> {data.nomeCliente}</div>
                      <div><strong className="text-stone-400">Sexo:</strong> {data.sexo}</div>
                      <div><strong className="text-stone-400">Idade:</strong> {data.idadeCalculada || 'N/I'}</div>
                      <div><strong className="text-stone-400">Celular:</strong> {data.celular || 'N/I'}</div>
                    </div>
                  </div>

                  {/* Queixa Principal */}
                  <div className="p-3.5 rounded-2xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-900/40 space-y-1">
                    <h5 className="font-bold text-amber-900 dark:text-amber-300 text-xs uppercase tracking-wider">
                      2. Queixa Principal
                    </h5>
                    <p className="text-stone-700 dark:text-slate-300 leading-relaxed font-medium">
                      {data.queixaPrincipal || 'Nenhuma queixa descrita.'}
                    </p>
                  </div>

                  {/* Histórico de Saúde */}
                  <div className="p-3.5 rounded-2xl bg-stone-50 dark:bg-slate-950 border border-stone-200/80 dark:border-slate-800 space-y-2">
                    <h5 className="font-bold text-stone-900 dark:text-slate-100 text-xs uppercase tracking-wider text-teal-800 dark:text-teal-300">
                      3. Histórico de Saúde & Antecedentes
                    </h5>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                      <div><strong>Histórico Familiar de Calvície:</strong> {data.doencaFamiliar?.sim ? `Sim — ${data.doencaFamiliar.qual || ''}` : 'Não'}</div>
                      <div><strong>Cirurgias Prévias:</strong> {data.cirurgias?.sim ? `Sim — ${data.cirurgias.qual || ''}` : 'Não'}</div>
                      <div><strong>Doenças Graves:</strong> {data.doencasGraves?.sim ? `Sim — ${data.doencasGraves.qual || ''}` : 'Não'}</div>
                      <div><strong>Medicação Contínua:</strong> {data.medicacaoContinua?.sim ? `Sim — ${data.medicacaoContinua.qual || ''}` : 'Não'}</div>
                      <div><strong>Alergias:</strong> {data.alergias?.sim ? `Sim — ${data.alergias.qual || ''}` : 'Não'}</div>
                      <div><strong>Problemas Endócrinos/Tireoide:</strong> {data.problemaEndocrino?.sim ? `Sim — ${data.problemaEndocrino.qual || ''}` : 'Não'}</div>
                    </div>
                  </div>

                  {/* Hábitos e Rotina Capilar */}
                  <div className="p-3.5 rounded-2xl bg-stone-50 dark:bg-slate-950 border border-stone-200/80 dark:border-slate-800 space-y-2">
                    <h5 className="font-bold text-stone-900 dark:text-slate-100 text-xs uppercase tracking-wider text-teal-800 dark:text-teal-300">
                      4. Estilo de Vida & Rotina Capilar
                    </h5>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                      <div><strong>Frequência de Lavagem:</strong> {data.frequenciaLavagem || 'N/I'}</div>
                      <div><strong>Temperatura da Água:</strong> {data.temperaturaAgua || 'N/I'}</div>
                      <div><strong>Uso de Chapinha / Secador:</strong> {data.chapinhaBabyliss || 'N/I'}</div>
                      <div><strong>Químicas Prévias:</strong> {data.quimicas?.join(', ') || 'Nenhuma declarada'}</div>
                    </div>
                  </div>

                  {/* Anotações do Especialista & Tratamento Sugerido */}
                  <div className="p-3.5 rounded-2xl bg-teal-50/50 dark:bg-teal-950/20 border border-teal-200/80 dark:border-teal-800/60 space-y-2">
                    <h5 className="font-bold text-teal-900 dark:text-teal-200 text-xs uppercase tracking-wider">
                      5. Conduta e Tratamento Sugerido
                    </h5>
                    <p className="text-stone-800 dark:text-slate-200 leading-relaxed font-medium">
                      {data.tratamentoSugerido || 'Sem tratamentos prescritos nesta ficha.'}
                    </p>
                    {data.anotacoesProfissional && (
                      <div className="pt-2 border-t border-teal-200/60 text-[11px] text-stone-600 dark:text-slate-400">
                        <strong>Notas do Profissional:</strong> {data.anotacoesProfissional}
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL DE CONFIRMAÇÃO: EXCLUIR PROTOCOLO */}
      {/* ========================================================================= */}
      {protocoloParaExcluirId && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-800 rounded-3xl w-full max-w-sm p-6 space-y-4 shadow-2xl text-center">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h4 className="font-bold text-stone-900 dark:text-slate-100 text-base">
                Excluir Protocolo?
              </h4>
              <p className="text-xs text-stone-500">
                Tem certeza de que deseja remover este protocolo terapêutico do histórico do paciente?
              </p>
            </div>
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setProtocoloParaExcluirId(null)}
                className="px-4 py-2 rounded-xl bg-stone-100 dark:bg-slate-800 text-stone-700 dark:text-slate-300 font-semibold text-xs"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmarExcluirProtocolo}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-xs"
              >
                Excluir Definitivamente
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
