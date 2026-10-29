import React, { useState, useEffect, useRef, useMemo } from 'react';
import { CASOS_ATLAS, ACHADOS_TRICOSCOPICOS } from '../data/tricoscopiaData';
import { 
  Session, 
  Annotation, 
  AnnotationType, 
  saveSession, 
  getSession, 
  listSessions, 
  deleteSession, 
  alternarLiberacaoCaptura,
  calculateCountingSummary 
} from '../services/annotations';
import { listPacientes } from '../services/pacientes';
import { BancadaMarcacao, CORES_TIPO } from './BancadaMarcacao';
import { TourBancadaModal } from './TourBancadaModal';
import { TricoscopioLiveModal } from './TricoscopioLiveModal';
import { arquivoParaDataURL } from '../utils/imageStore';
import { useCaseImage } from '../hooks/useCaseImage';
import { useAuth } from '../context/AuthContext';
import { 
  Camera, 
  Video,
  Upload, 
  CheckCircle2, 
  RotateCw, 
  ZoomIn, 
  ZoomOut, 
  AlertCircle, 
  Eye, 
  EyeOff, 
  ShieldCheck, 
  Sparkles, 
  Save, 
  History, 
  FileText, 
  Printer, 
  Columns, 
  Layers, 
  Grid, 
  SlidersHorizontal, 
  X, 
  Trash2, 
  Calendar, 
  User, 
  MapPin, 
  Check, 
  Search, 
  ExternalLink, 
  ChevronDown, 
  Edit3, 
  HelpCircle, 
  Hash, 
  Scale, 
  Download, 
  Flame, 
  BookOpen, 
  RotateCcw, 
  Image as ImageIcon, 
  ArrowLeft, 
  ArrowRight, 
  Loader2, 
  Maximize2, 
  Minimize2,
  Database,
  Microscope,
  CheckCheck,
  ListOrdered
} from 'lucide-react';

interface MinhaCapturaViewProps {
  onSelecionarCaso: (casoId: string) => void;
  pacienteInicial?: { id: string; nome: string } | null;
  sessaoInicialId?: string | null;
  onLimparSessaoInicial?: () => void;
  onNavegarParaAnamnese?: () => void;
  onNavegarParaPacientes?: () => void;
  modoInicial?: 'registro' | 'analise';
  onMudarModoBancada?: (modo: 'registro' | 'analise') => void;
}

export const REGIOES_COURO_CABELUDO = [
  'Linha Frontal',
  'Vértice / Vértex',
  'Região Parietal Direita',
  'Região Parietal Esquerda',
  'Região Occipital',
  'Coroa',
  'Têmpora Direita',
  'Têmpora Esquerda'
];

export const MinhaCapturaView: React.FC<MinhaCapturaViewProps> = ({
  onSelecionarCaso,
  pacienteInicial,
  sessaoInicialId,
  onLimparSessaoInicial,
  onNavegarParaAnamnese,
  onNavegarParaPacientes,
  modoInicial = 'registro',
  onMudarModoBancada
}) => {
  const { usuarioAtual } = useAuth();

  // Modo da Bancada: 'registro' (Passo 3: Registro de Fotos por Área) ou 'analise' (Passo 4: Contagem de Fios, Óstios & Laudo)
  const [modoBancada, setModoBancada] = useState<'registro' | 'analise'>(modoInicial);

  useEffect(() => {
    if (modoInicial && modoInicial !== modoBancada) {
      setModoBancada(modoInicial);
    }
  }, [modoInicial]);

  const alternarModoBancada = (novoModo: 'registro' | 'analise') => {
    setModoBancada(novoModo);
    onMudarModoBancada?.(novoModo);
  };

  // Estado da Sessão Atual
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [imagemUsuarioUrl, setImagemUsuarioUrl] = useState<string | null>(null);
  const [clientName, setClientName] = useState<string>(() => pacienteInicial?.nome || '');
  const [pacienteId, setPacienteId] = useState<string | null>(() => pacienteInicial?.id || null);
  const [pacientesCadastrados, setPacientesCadastrados] = useState<{ id: string; nome: string }[]>([]);
  const [sessionDate, setSessionDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [areaCouro, setAreaCouro] = useState<string>(REGIOES_COURO_CABELUDO[0]);
  const [fieldAreaCm2, setFieldAreaCm2] = useState<number | undefined>(undefined);
  const [notes, setNotes] = useState<string>('');
  const [casoReferenciaId, setCasoReferenciaId] = useState<string>(CASOS_ATLAS[0].id);
  const [exibirReferenciaAtlas, setExibirReferenciaAtlas] = useState<boolean>(false);
  const [termoBuscaReferencia, setTermoBuscaReferencia] = useState<string>('');
  const [liberadoPaciente, setLiberadoPaciente] = useState<boolean>(false);
  const [itensConferidos, setItensConferidos] = useState<string[]>([]);
  const [expandirDescricao, setExpandirDescricao] = useState<boolean>(false);
  const [modalRetornarCapturaInvalida, setModalRetornarCapturaInvalida] = useState<boolean>(false);
  const [salvandoGaleria, setSalvandoGaleria] = useState<boolean>(false);

  // Casos do Atlas filtrados para o seletor de referências
  const casosReferenciaFiltrados = useMemo(() => {
    if (!termoBuscaReferencia.trim()) return CASOS_ATLAS;
    const t = termoBuscaReferencia.toLowerCase().trim();
    return CASOS_ATLAS.filter(c => 
      c.nome.toLowerCase().includes(t) || 
      c.categoria.toLowerCase().includes(t) ||
      (c.significadoClinico && c.significadoClinico.toLowerCase().includes(t)) ||
      c.oQueObservar?.some(obs => obs.toLowerCase().includes(t)) ||
      c.achadosTricoscopicos?.some(ach => ach.toLowerCase().includes(t))
    );
  }, [termoBuscaReferencia]);

  // Marcações Manuais e Histórico de Desfazer/Refazer (50+ passos)
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [history, setHistory] = useState<Annotation[][]>([[]]);
  const [historyIndex, setHistoryIndex] = useState<number>(0);
  const [modoAtivo, setModoAtivo] = useState<'mover' | AnnotationType>('unitario');
  const [visivel, setVisivel] = useState<boolean>(true);
  const [zoom, setZoom] = useState<number>(1);
  const [selectedAnnotationId, setSelectedAnnotationId] = useState<string | null>(null);

  // Ferramentas Ópticas Aplicáveis à Imagem
  const [rotacao, setRotacao] = useState<number>(0);
  const [mostrarGrade, setMostrarGrade] = useState<boolean>(false);
  const [filtroVascular, setFiltroVascular] = useState<boolean>(false);
  const [filtroInversao, setFiltroInversao] = useState<boolean>(false);

  // Modos de Comparação: Lado a Lado e Cortina Deslizante
  const [modoComparacao, setModoComparacao] = useState<'bipartido' | 'cortina'>('bipartido');
  const [posicaoCortina, setPosicaoCortina] = useState<number>(50);
  const containerCortinaRef = useRef<HTMLDivElement>(null);
  const cortinaArrastandoRef = useRef<boolean>(false);

  // Modais
  const [modalAchadoAberto, setModalAchadoAberto] = useState<boolean>(false);
  const [achadoEmEdicao, setAchadoEmEdicao] = useState<Annotation | null>(null);
  const [achadoSinal, setAchadoSinal] = useState<string>(ACHADOS_TRICOSCOPICOS[0]?.nome || 'Anisotricose');
  const [achadoIntensidade, setAchadoIntensidade] = useState<'Leve' | 'Moderada' | 'Acentuada'>('Moderada');
  const [achadoObservacao, setAchadoObservacao] = useState<string>('');
  const [categoriaAchadoFiltro, setCategoriaAchadoFiltro] = useState<string>('Todos');

  const [historicoAberto, setHistoricoAberto] = useState<boolean>(false);
  const [sessoesSalvas, setSessoesSalvas] = useState<Session[]>([]);
  const [buscaHistorico, setBuscaHistorico] = useState<string>('');
  const [salvando, setSalvando] = useState<boolean>(false);
  const [salvoComSucessoRecente, setSalvoComSucessoRecente] = useState<boolean>(false);
  const [alteracoesNaoSalvas, setAlteracoesNaoSalvas] = useState<boolean>(false);
  const [modoFoco, setModoFoco] = useState<boolean>(false);
  const [mensagemStatus, setMensagemStatus] = useState<{ tipo: 'sucesso' | 'erro'; texto: string } | null>(null);
  const [modalLaudoAberto, setModalLaudoAberto] = useState<boolean>(false);
  const [modalCameraAoVivo, setModalCameraAoVivo] = useState<boolean>(false);

  // Tipo de Captura no Passo 3: 'tricoscopia' (com dermatoscópio) ou 'macro' (foto geral do couro)
  const [tipoCaptura, setTipoCaptura] = useState<'tricoscopia' | 'macro'>('tricoscopia');

  // Estado de confirmação explícita de salvamento no banco de dados (com tempo em ms)
  const [confirmacaoBanco, setConfirmacaoBanco] = useState<{
    visivel: boolean;
    mensagem: string;
    tempoMs: number;
    area: string;
  } | null>(null);

  // Tour rápido guiado da bancada de marcação
  const [tourAberto, setTourAberto] = useState<boolean>(() => {
    if (typeof window !== 'undefined' && window.localStorage) {
      return !window.localStorage.getItem('atlas_tour_minha_captura_v1');
    }
    return false;
  });

  const handleFecharTour = () => {
    setTourAberto(false);
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem('atlas_tour_minha_captura_v1', 'true');
    }
  };

  const casoReferencia = CASOS_ATLAS.find(c => c.id === casoReferenciaId) || CASOS_ATLAS[0];
  const { 
    imageUrl: referenciaUrl, 
    imagens: refImagens, 
    indiceAtivo: refIndice, 
    setIndiceAtivo: setRefIndice, 
    totalImagens: refTotal 
  } = useCaseImage(casoReferencia.id, casoReferencia.imagem.url);

  // URL validada e segura para imagem de referência (evita src="" no elemento img)
  const fotoReferenciaFinal = (referenciaUrl && referenciaUrl.trim() !== '') 
    ? referenciaUrl 
    : (casoReferencia.imagem.url && casoReferencia.imagem.url.trim() !== '') 
      ? casoReferencia.imagem.url 
      : null;

  // Carrega histórico de sessões e lista de pacientes cadastrados do usuário atual
  useEffect(() => {
    listSessions(usuarioAtual?.uid).then(list => setSessoesSalvas(list)).catch(() => {});
    listPacientes(usuarioAtual?.uid).then(list => setPacientesCadastrados(list.map(p => ({ id: p.id, nome: p.nome })))).catch(() => {});
  }, [usuarioAtual?.uid]);

  // Se receber paciente inicial vindo da aba Pacientes
  useEffect(() => {
    if (pacienteInicial?.nome) {
      setClientName(pacienteInicial.nome);
      setPacienteId(pacienteInicial.id || null);
    }
  }, [pacienteInicial?.id, pacienteInicial?.nome]);

  // Se receber sessão inicial vinda do histórico do paciente
  useEffect(() => {
    if (sessaoInicialId) {
      getSession(sessaoInicialId).then(full => {
        if (full) {
          setSessionId(full.session.id);
          setClientName(full.session.client_name);
          setSessionDate(full.session.session_date);
          setAreaCouro(full.session.area || REGIOES_COURO_CABELUDO[0]);
          setFieldAreaCm2(full.session.field_area_cm2);
          setNotes(full.session.notes || '');
          setCasoReferenciaId(full.session.caso_referencia_id || CASOS_ATLAS[0].id);
          setImagemUsuarioUrl(full.session.image_url);
          setAnnotations(full.annotations || []);
          setHistory([full.annotations || []]);
          setHistoryIndex(0);
          setZoom(1);
          mostrarAlerta('sucesso', `Consulta de ${full.session.client_name} carregada na bancada.`);
        }
      });
      if (onLimparSessaoInicial) onLimparSessaoInicial();
    }
  }, [sessaoInicialId]);

  // Sessões registradas para o paciente atualmente selecionado
  const sessoesDoPaciente = useMemo(() => {
    if (!clientName.trim() && !pacienteId) return [];
    const nomeNorm = clientName.toLowerCase().trim();
    return sessoesSalvas.filter(s => 
      (pacienteId && ((s as any).paciente_id === pacienteId || (s as any).pacienteId === pacienteId)) ||
      (nomeNorm && s.client_name.toLowerCase().trim() === nomeNorm)
    );
  }, [sessoesSalvas, pacienteId, clientName]);

  // Contagem de fotos registradas por área para o paciente ativo
  const contagemFotosPorArea = useMemo(() => {
    const mapa: Record<string, number> = {};
    REGIOES_COURO_CABELUDO.forEach(area => {
      mapa[area] = 0;
    });
    sessoesDoPaciente.forEach(s => {
      const area = s.area || 'Vértice / Vértex';
      const achada = REGIOES_COURO_CABELUDO.find(r => r.toLowerCase().trim() === area.toLowerCase().trim()) || area;
      mapa[achada] = (mapa[achada] || 0) + 1;
    });
    return mapa;
  }, [sessoesDoPaciente]);

  // Atualização com pilha de histórico (Undo/Redo)
  const setAnnotationsWithHistory = (newAnnotations: Annotation[]) => {
    setAnnotations(newAnnotations);
    setAlteracoesNaoSalvas(true);
    setHistory(prev => {
      const updated = prev.slice(0, historyIndex + 1);
      updated.push(newAnnotations);
      if (updated.length > 60) updated.shift();
      return updated;
    });
    setHistoryIndex(prev => Math.min(prev + 1, 59));
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      const nextIdx = historyIndex - 1;
      setHistoryIndex(nextIdx);
      setAnnotations(history[nextIdx]);
      setSelectedAnnotationId(null);
      setAlteracoesNaoSalvas(true);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const nextIdx = historyIndex + 1;
      setHistoryIndex(nextIdx);
      setAnnotations(history[nextIdx]);
      setSelectedAnnotationId(null);
      setAlteracoesNaoSalvas(true);
    }
  };

  const handleClearAll = () => {
    setAnnotationsWithHistory([]);
    setSelectedAnnotationId(null);
    setAlteracoesNaoSalvas(true);
    mostrarAlerta('sucesso', 'Todas as marcações foram removidas.');
  };

  const mostrarAlerta = (tipo: 'sucesso' | 'erro', texto: string) => {
    setMensagemStatus({ tipo, texto });
    setTimeout(() => setMensagemStatus(null), 4000);
  };

  // Upload da imagem
  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      try {
        const dataUrl = await arquivoParaDataURL(file);
        setImagemUsuarioUrl(dataUrl);
        setRotacao(0);
        setZoom(1);
        setAnnotations([]);
        setHistory([[]]);
        setHistoryIndex(0);
        setSessionId(null);
        setAlteracoesNaoSalvas(true);
        mostrarAlerta('sucesso', 'Imagem da cliente carregada e otimizada.');
      } catch {
        mostrarAlerta('erro', 'Falha ao processar arquivo de imagem.');
      }
    }
  };

  // Receber foto capturada ao vivo pelo tricoscópio
  const handleCapturaAoVivo = (dataUrl: string) => {
    if (imagemUsuarioUrl && annotations.length > 0) {
      if (!window.confirm('Substituir a captura atual pela nova foto da câmera? As marcações anteriores serão limpas.')) {
        return;
      }
    }
    setSessionId(null);
    setImagemUsuarioUrl(dataUrl);
    setAnnotations([]);
    setHistory([[]]);
    setHistoryIndex(0);
    setZoom(1);
    setSelectedAnnotationId(null);
    setAlteracoesNaoSalvas(true);
    mostrarAlerta('sucesso', 'Foto capturada do tricoscópio com sucesso!');
  };

  // Salvar sessão associada à área avaliada do paciente
  const handleSalvarSessao = async (avancarParaProximaArea: boolean | React.MouseEvent = false) => {
    const deveAvancar = typeof avancarParaProximaArea === 'boolean' ? avancarParaProximaArea : false;
    let urlParaSalvar = imagemUsuarioUrl;
    if (!urlParaSalvar && fotoReferenciaFinal) {
      urlParaSalvar = fotoReferenciaFinal;
      setImagemUsuarioUrl(fotoReferenciaFinal);
    }

    if (!urlParaSalvar) {
      mostrarAlerta('erro', 'Para salvar uma foto, insira uma imagem ou realize uma captura na bancada primeiro.');
      return;
    }

    const t0 = performance.now();
    setSalvando(true);
    setConfirmacaoBanco(null);
    try {
      // Resolver vínculo de paciente cadastrado (por id ou por nome)
      let pIdFinal = pacienteId;
      if (!pIdFinal && clientName.trim()) {
        const achou = pacientesCadastrados.find(p => p.nome.toLowerCase().trim() === clientName.toLowerCase().trim());
        if (achou) {
          pIdFinal = achou.id;
          setPacienteId(achou.id);
        }
      }

      const agora = new Date();
      const horaFormatada = agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      const rotuloTipo = tipoCaptura === 'macro' ? 'Foto Macro (Panorâmica)' : 'Tricoscopia Digital';
      const nomeIdentificadorFoto = notes.trim()
        ? notes.trim()
        : `${rotuloTipo} • ${areaCouro} • ${new Date(sessionDate).toLocaleDateString('pt-BR')} às ${horaFormatada}`;

      const saved = await saveSession(
        {
          id: sessionId || undefined,
          userId: usuarioAtual?.uid,
          client_name: clientName.trim() || 'Cliente sem nome',
          session_date: sessionDate,
          area: areaCouro,
          image_url: urlParaSalvar,
          field_area_cm2: fieldAreaCm2,
          notes: nomeIdentificadorFoto,
          caso_referencia_id: casoReferenciaId,
          liberadoPaciente: liberadoPaciente,
          paciente_id: pIdFinal || undefined
        },
        annotations
      );

      const tempoMs = Math.round(performance.now() - t0);

      setSessionId(saved.session.id);
      setSessoesSalvas(prev => [saved.session, ...prev.filter(s => s.id !== saved.session.id)]);
      setAlteracoesNaoSalvas(false);
      setSalvoComSucessoRecente(true);
      setSalvando(false);
      setTimeout(() => setSalvoComSucessoRecente(false), 3500);

      // Atualizar lista completa de forma assíncrona em background
      listSessions(usuarioAtual?.uid).then(lista => {
        if (lista && lista.length > 0) setSessoesSalvas(lista);
      }).catch(() => {});

      // Confirmação explícita com tempo de gravação no banco de dados
      setConfirmacaoBanco({
        visivel: true,
        mensagem: `Registro da área "${areaCouro}" salvo com sucesso no banco de dados e arquivado no prontuário de ${saved.session.client_name}!`,
        tempoMs,
        area: areaCouro
      });
      setTimeout(() => {
        setConfirmacaoBanco(prev => prev ? { ...prev, visivel: false } : null);
      }, 7000);

      // Notificar prontuário do paciente e abas sobre a nova captura da área
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('trico-paciente-captura-salva', {
          detail: {
            sessionId: saved.session.id,
            pacienteId: pIdFinal,
            pacienteNome: saved.session.client_name,
            area: areaCouro,
            data: sessionDate
          }
        }));
      }

      mostrarAlerta('sucesso', `Registro de "${areaCouro}" gravado no banco de dados em ${tempoMs}ms!`);

      if (deveAvancar) {
        handleIrParaProximaArea();
      }
    } catch (err: any) {
      console.error('Erro ao salvar foto na bancada:', err);
      mostrarAlerta('erro', err?.message || 'Erro ao salvar foto na bancada.');
    } finally {
      setSalvando(false);
    }
  };

  // Avançar para a próxima área anatômica na sequência e preparar nova foto
  const handleIrParaProximaArea = () => {
    const indexAtual = REGIOES_COURO_CABELUDO.indexOf(areaCouro);
    const proximoIndex = (indexAtual + 1) % REGIOES_COURO_CABELUDO.length;
    const proximaArea = REGIOES_COURO_CABELUDO[proximoIndex];
    setAreaCouro(proximaArea);
    setSessionId(null);
    setImagemUsuarioUrl(null);
    setAnnotations([]);
    setHistory([[]]);
    setHistoryIndex(0);
    setZoom(1);
    setSelectedAnnotationId(null);
    mostrarAlerta('sucesso', `Área alterada para "${proximaArea}". Conecte a câmera ou carregue a próxima foto.`);
  };

  // Carregar foto registrada do paciente direto para o modo de contagem da consulta
  const handleCarregarFotoPacienteParaContagem = async (sess: Session) => {
    await handleCarregarSessao(sess);
    alternarModoBancada('analise');
    setTimeout(() => {
      document.getElementById('bancada-marcador-canvas')?.scrollIntoView({ behavior: 'smooth' });
    }, 150);
  };

  // Referências para atalhos de teclado sem recriar ouvintes
  const handleSalvarSessaoRef = useRef(handleSalvarSessao);
  useEffect(() => {
    handleSalvarSessaoRef.current = handleSalvarSessao;
  });

  const handleUndoRef = useRef(handleUndo);
  useEffect(() => {
    handleUndoRef.current = handleUndo;
  });

  const handleRedoRef = useRef(handleRedo);
  useEffect(() => {
    handleRedoRef.current = handleRedo;
  });

  // Atalhos de teclado da bancada tricoscópica (Ctrl+S, números 1-6 para marcações, M para mover, F para foco)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName?.toLowerCase();
      const isInput = tag === 'input' || tag === 'textarea' || tag === 'select' || target?.isContentEditable;

      // Atalho de salvar funciona em qualquer lugar (inclusive digitando observações)
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        handleSalvarSessaoRef.current();
        return;
      }

      if (isInput) return;

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) {
        e.preventDefault();
        handleUndoRef.current();
        return;
      }

      if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === 'y' || (e.key.toLowerCase() === 'z' && e.shiftKey))) {
        e.preventDefault();
        handleRedoRef.current();
        return;
      }

      switch (e.key) {
        case '1':
          setModoAtivo('unitario');
          break;
        case '2':
          setModoAtivo('duplo');
          break;
        case '3':
          setModoAtivo('triplo');
          break;
        case '4':
          setModoAtivo('ostio_vazio');
          break;
        case '5':
          setModoAtivo('achado');
          break;
        case '6':
          setModoAtivo('inflamacao');
          break;
        case 'm':
        case 'M':
          setModoAtivo('mover');
          break;
        case '+':
        case '=':
          setZoom(z => Math.min(+(z + 0.25).toFixed(2), 4));
          break;
        case '-':
        case '_':
          setZoom(z => Math.max(+(z - 0.25).toFixed(2), 0.5));
          break;
        case '0':
          setZoom(1);
          break;
        case 'f':
        case 'F':
          if (!e.ctrlKey && !e.metaKey) {
            setModoFoco(prev => !prev);
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Salvar a imagem tricoscópica na galeria do dispositivo do profissional
  const handleSalvarImagemDispositivo = async () => {
    if (!imagemUsuarioUrl) {
      mostrarAlerta('erro', 'Nenhuma captura tricoscópica disponível para salvar.');
      return;
    }

    setSalvandoGaleria(true);
    try {
      mostrarAlerta('sucesso', 'Preparando imagem para a galeria do seu dispositivo...');
      const nomeLimpo = (clientName || 'paciente').toLowerCase().trim().replace(/[^a-z0-9]/g, '_');
      const areaLimpa = (areaCouro || 'tricoscopia').toLowerCase().trim().replace(/[^a-z0-9]/g, '_');
      const dataFormatada = sessionDate || new Date().toISOString().split('T')[0];
      const nomeArquivo = `tricoscopia_${nomeLimpo}_${areaLimpa}_${dataFormatada}.jpg`;

      // 1. Obter Blob da imagem
      let blob: Blob;
      if (imagemUsuarioUrl.startsWith('data:')) {
        const res = await fetch(imagemUsuarioUrl);
        blob = await res.blob();
      } else {
        const res = await fetch(imagemUsuarioUrl, { mode: 'cors' });
        blob = await res.blob();
      }

      const mimeType = blob.type || 'image/jpeg';
      const file = new File([blob], nomeArquivo, { type: mimeType });

      // 2. Se for em dispositivo móvel com suporte a Web Share com arquivos (salvar direto na Galeria / Fotos)
      let compartilhadoNativo = false;
      if (typeof navigator !== 'undefined' && navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({
            title: `Captura Tricoscópica - ${clientName || 'Paciente'}`,
            text: `Exame de Tricoscopia - Área: ${areaCouro} (${sessionDate})`,
            files: [file]
          });
          compartilhadoNativo = true;
          mostrarAlerta('sucesso', 'Toque em "Salvar Imagem" para guardar diretamente na Galeria/Fotos do seu dispositivo.');
        } catch (shareErr: any) {
          if (shareErr.name === 'AbortError') {
            setSalvandoGaleria(false);
            return;
          }
        }
      }

      // 3. Fallback ou download direto no armazenamento do dispositivo
      if (!compartilhadoNativo) {
        const blobUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = nomeArquivo;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
        mostrarAlerta('sucesso', 'Imagem tricoscópica salva na galeria/downloads do seu dispositivo!');
      }
    } catch (err) {
      console.warn('Fallback para download padrão:', err);
      const link = document.createElement('a');
      link.href = imagemUsuarioUrl;
      link.download = `tricoscopia_${(clientName || 'paciente').replace(/[^a-z0-9]/gi, '_')}.jpg`;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      mostrarAlerta('sucesso', 'Download da imagem iniciado.');
    } finally {
      setSalvandoGaleria(false);
    }
  };

  // Descartar captura caso não seja válida e retornar para nova captura
  const handleDescartarERefazer = (destino: 'camera' | 'upload' | 'prontuario') => {
    setModalRetornarCapturaInvalida(false);
    setSessionId(null);
    setImagemUsuarioUrl(null);
    setAnnotations([]);
    setHistory([[]]);
    setHistoryIndex(0);
    setZoom(1);
    setSelectedAnnotationId(null);

    if (destino === 'camera') {
      setModalCameraAoVivo(true);
      mostrarAlerta('sucesso', 'Captura inválida descartada. Reconecte o tricoscópio ao vivo para capturar novamente.');
    } else if (destino === 'upload') {
      setTimeout(() => {
        const inputUpload = document.getElementById('input-file-bancada-substituir') as HTMLInputElement | null;
        if (inputUpload) inputUpload.click();
      }, 100);
      mostrarAlerta('sucesso', 'Captura inválida descartada. Selecione um novo arquivo válido.');
    } else if (destino === 'prontuario') {
      if (onNavegarParaPacientes) {
        onNavegarParaPacientes();
      }
    }
  };

  // Carregar sessão do histórico
  const handleCarregarSessao = async (sess: Session) => {
    const full = await getSession(sess.id);
    if (full) {
      setSessionId(full.session.id);
      setClientName(full.session.client_name);
      setSessionDate(full.session.session_date);
      setAreaCouro(full.session.area || REGIOES_COURO_CABELUDO[0]);
      setFieldAreaCm2(full.session.field_area_cm2);
      setNotes(full.session.notes || '');
      setCasoReferenciaId(full.session.caso_referencia_id || CASOS_ATLAS[0].id);
      setLiberadoPaciente(full.session.liberadoPaciente ?? false);
      setImagemUsuarioUrl(full.session.image_url);
      setAnnotations(full.annotations || []);
      setHistory([full.annotations || []]);
      setHistoryIndex(0);
      setZoom(1);
      setHistoricoAberto(false);
      mostrarAlerta('sucesso', `Sessão de ${full.session.client_name} carregada.`);
    }
  };

  // Excluir sessão
  const handleExcluirSessao = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('Deseja excluir esta sessão e suas marcações permanentemente?')) {
      await deleteSession(id);
      const lista = await listSessions(usuarioAtual?.uid);
      setSessoesSalvas(lista);
      if (sessionId === id) {
        setSessionId(null);
      }
      mostrarAlerta('sucesso', 'Sessão excluída.');
    }
  };

  const handleLimparBancada = () => {
    if (imagemUsuarioUrl && !window.confirm('Deseja limpar a bancada e iniciar nova captura?')) return;
    setSessionId(null);
    setImagemUsuarioUrl(null);
    setClientName('');
    setNotes('');
    setLiberadoPaciente(false);
    setFieldAreaCm2(undefined);
    setAnnotations([]);
    setHistory([[]]);
    setHistoryIndex(0);
    setRotacao(0);
    setZoom(1);
    setSelectedAnnotationId(null);
  };

  // Abrir modal de edição de achado ou inflamação
  const handleAbrirEdicaoAchado = (ann: Annotation) => {
    setAchadoEmEdicao(ann);
    if (ann.type === 'inflamacao') {
      setCategoriaAchadoFiltro('Inflamação & Eritema');
      setAchadoSinal(ann.sign_slug || 'Inflamação e Eritema Perifolicular (Halo Eritematoso / Colarete)');
    } else {
      setCategoriaAchadoFiltro('Todos');
      setAchadoSinal(ann.sign_slug || ACHADOS_TRICOSCOPICOS[0]?.nome || '');
    }
    setAchadoIntensidade(ann.intensity || 'Moderada');
    setAchadoObservacao(ann.note || '');
    setModalAchadoAberto(true);
  };

  const handleSalvarDetalhesAchado = () => {
    if (!achadoEmEdicao) return;
    const updated = annotations.map(a => {
      if (a.id !== achadoEmEdicao.id) return a;
      return {
        ...a,
        type: achadoEmEdicao.type,
        sign_slug: achadoSinal,
        intensity: achadoIntensidade,
        note: achadoObservacao
      };
    });
    setAnnotationsWithHistory(updated);
    setModalAchadoAberto(false);
    setAchadoEmEdicao(null);
  };

  const handleRemoverAchadoModal = () => {
    if (!achadoEmEdicao) return;
    const updated = annotations.filter(a => a.id !== achadoEmEdicao.id);
    setAnnotationsWithHistory(updated);
    setModalAchadoAberto(false);
    setAchadoEmEdicao(null);
    setSelectedAnnotationId(null);
  };

  // Exportar imagem marcada em alta resolução (PNG com retângulos, etiquetas e rodapé)
  const handleExportarImagemMarcada = async () => {
    if (!imagemUsuarioUrl) return;
    try {
      mostrarAlerta('sucesso', 'Processando imagem marcada em alta resolução...');

      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = imagemUsuarioUrl;
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
      });

      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth || 1400;
      canvas.height = img.naturalHeight || 1050;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // 1. Desenhar a foto base original
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      // 2. Fator de escala proporcional para manter textos e bordas legíveis
      const scaleFactor = Math.max(1, canvas.width / 1200);

      // Contadores por tipo para identificação sequencial
      const counters: Record<AnnotationType, number> = {
        unitario: 0,
        duplo: 0,
        triplo: 0,
        ostio_vazio: 0,
        achado: 0,
        inflamacao: 0
      };

      // 3. Desenhar cada retângulo e etiqueta
      annotations.forEach(ann => {
        counters[ann.type] = (counters[ann.type] || 0) + 1;
        const seq = counters[ann.type];

        const x = ann.x * canvas.width;
        const y = ann.y * canvas.height;
        const w = ann.width * canvas.width;
        const h = ann.height * canvas.height;

        let corHex = '#2563EB';
        let corRgba = 'rgba(37, 99, 235, 0.25)';
        let labelText = `U${seq}`;

        if (ann.type === 'unitario') {
          corHex = '#2563EB';
          corRgba = 'rgba(37, 99, 235, 0.25)';
          labelText = `U${seq}`;
        } else if (ann.type === 'duplo') {
          corHex = '#06B6D4';
          corRgba = 'rgba(6, 182, 212, 0.25)';
          labelText = `D${seq}`;
        } else if (ann.type === 'triplo') {
          corHex = '#16A34A';
          corRgba = 'rgba(22, 163, 74, 0.25)';
          labelText = `T${seq}`;
        } else if (ann.type === 'ostio_vazio') {
          corHex = '#F97316';
          corRgba = 'rgba(249, 115, 22, 0.25)';
          labelText = `Ó${seq}`;
        } else if (ann.type === 'achado') {
          corHex = '#DC2626';
          corRgba = 'rgba(220, 38, 38, 0.25)';
          labelText = ann.sign_slug ? `S${seq}: ${ann.sign_slug}` : `Sinal ${seq}`;
        } else if (ann.type === 'inflamacao') {
          corHex = '#C026D3';
          corRgba = 'rgba(192, 38, 211, 0.25)';
          labelText = ann.sign_slug ? `🔥${seq}: ${ann.sign_slug}` : `Inflamação ${seq}`;
        }

        // Preenchimento semitransparente
        ctx.fillStyle = corRgba;
        ctx.fillRect(x, y, w, h);

        // Borda destacada
        ctx.strokeStyle = corHex;
        ctx.lineWidth = Math.max(2, 2.8 * scaleFactor);
        ctx.strokeRect(x, y, w, h);

        // Etiqueta com numeração sequencial
        ctx.font = `bold ${Math.round(11 * scaleFactor)}px monospace, sans-serif`;
        const textMetrics = ctx.measureText(labelText);
        const padX = 5 * scaleFactor;
        const padY = 2 * scaleFactor;
        const badgeW = textMetrics.width + padX * 2;
        const badgeH = 15 * scaleFactor;

        ctx.fillStyle = corHex;
        ctx.fillRect(x, Math.max(0, y - badgeH), badgeW, badgeH);

        ctx.fillStyle = '#FFFFFF';
        ctx.textBaseline = 'middle';
        ctx.fillText(labelText, x + padX, Math.max(badgeH / 2, y - badgeH / 2));
      });

      // 4. Rodapé Clínico com dados do paciente e resumo tricométrico
      const footerH = Math.round(52 * scaleFactor);
      ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
      ctx.fillRect(0, canvas.height - footerH, canvas.width, footerH);

      ctx.fillStyle = '#FFFFFF';
      ctx.font = `bold ${Math.round(12 * scaleFactor)}px sans-serif`;
      ctx.textBaseline = 'top';
      const linha1 = `Cliente: ${clientName || 'Não Identificada'}  •  Data: ${sessionDate}  •  Área: ${areaCouro}`;
      ctx.fillText(linha1, 14 * scaleFactor, canvas.height - footerH + 8 * scaleFactor);

      ctx.fillStyle = '#CBD5E1';
      ctx.font = `${Math.round(10 * scaleFactor)}px monospace, sans-serif`;
      const linha2 = `UF: ${summary.totalUnidadesFoliculares} (1f:${summary.unitarias} | 2f:${summary.duplas} | 3f:${summary.triplas}) • Fios: ${summary.totalFios} • Óstios: ${summary.totalOstios} • Média: ${summary.mediaFiosPorUF} fios/UF${summary.inflamacaoCount > 0 ? ` • 🔥 Inflamação: ${summary.inflamacaoCount}` : ''}${fieldAreaCm2 ? ` • Densidade: ${summary.densidadeFios}` : ''}`;
      ctx.fillText(linha2, 14 * scaleFactor, canvas.height - footerH + 28 * scaleFactor);

      // 5. Download do arquivo PNG
      canvas.toBlob((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const nomeFormatado = (clientName || 'cliente').toLowerCase().trim().replace(/[^a-z0-9]/g, '_');
        a.download = `tricoscopia_${nomeFormatado}_${sessionDate}.png`;
        a.click();
        URL.revokeObjectURL(url);
        mostrarAlerta('sucesso', 'Foto marcada salva em PNG com sucesso!');
      }, 'image/png');
    } catch {
      mostrarAlerta('erro', 'Falha ao processar exportação da imagem.');
    }
  };

  // Foco no achado clicado
  const handleFocarAchado = (annId: string) => {
    setModoAtivo('mover');
    setSelectedAnnotationId(annId);
  };

  // Cálculos do painel de contagem em tempo real
  const summary = calculateCountingSummary(annotations, fieldAreaCm2);

  // Lista dos achados e focos de inflamação com identificador
  const achadosMarcados = annotations.filter(a => a.type === 'achado' || a.type === 'inflamacao');

  // Lógica de arrasto da Cortina Deslizante
  const handleTouchOuMouseDownCortina = (e: React.MouseEvent | React.TouchEvent) => {
    cortinaArrastandoRef.current = true;
    atualizarPosicaoCortina(e);
  };

  const atualizarPosicaoCortina = (e: MouseEvent | TouchEvent | React.MouseEvent | React.TouchEvent) => {
    if (!containerCortinaRef.current) return;
    const rect = containerCortinaRef.current.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as MouseEvent).clientX;
    const offset = clientX - rect.left;
    const percent = Math.min(Math.max((offset / rect.width) * 100, 5), 95);
    setPosicaoCortina(percent);
  };

  useEffect(() => {
    const handleMove = (e: MouseEvent | TouchEvent) => {
      if (cortinaArrastandoRef.current) {
        atualizarPosicaoCortina(e);
      }
    };
    const handleUp = () => {
      cortinaArrastandoRef.current = false;
    };
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    window.addEventListener('touchmove', handleMove);
    window.addEventListener('touchend', handleUp);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
      window.removeEventListener('touchmove', handleMove);
      window.removeEventListener('touchend', handleUp);
    };
  }, []);

  const totalAchadosReferencia = casoReferencia.oQueObservar.length;
  const totalConferidos = itensConferidos.filter(item => casoReferencia.oQueObservar.includes(item)).length;

  const sessoesFiltradas = sessoesSalvas.filter(s => 
    s.client_name.toLowerCase().includes(buscaHistorico.toLowerCase()) ||
    s.session_date.includes(buscaHistorico)
  );

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6 animate-fadeIn pb-24">
      {/* Toast de Alerta */}
      {mensagemStatus && (
        <div className={`fixed top-20 right-4 z-50 px-4 py-3 rounded-2xl shadow-xl border flex items-center gap-2.5 text-xs font-semibold animate-fadeIn ${
          mensagemStatus.tipo === 'sucesso' 
            ? 'bg-emerald-50 border-emerald-300 text-emerald-800 dark:bg-emerald-950 dark:border-emerald-700 dark:text-emerald-200' 
            : 'bg-rose-50 border-rose-300 text-rose-800 dark:bg-rose-950 dark:border-rose-700 dark:text-rose-200'
        }`}>
          {mensagemStatus.tipo === 'sucesso' ? <Check className="w-4 h-4 text-emerald-600" /> : <AlertCircle className="w-4 h-4 text-rose-600" />}
          <span>{mensagemStatus.texto}</span>
        </div>
      )}

      {/* CONFIRMAÇÃO EXPLÍCITA DE SALVAMENTO NO BANCO DE DADOS (COM TEMPO DE RESPOSTA) */}
      {confirmacaoBanco && confirmacaoBanco.visivel && (
        <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-r from-emerald-500/15 via-teal-500/10 to-emerald-500/15 dark:from-emerald-950/70 dark:via-teal-950/50 dark:to-emerald-950/70 border-2 border-emerald-500/70 text-emerald-950 dark:text-emerald-100 flex items-center justify-between gap-3 shadow-lg animate-fadeIn">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-md">
              <CheckCircle2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-xs sm:text-sm font-bold text-emerald-900 dark:text-emerald-200">
                  Registro Salvo no Banco de Dados com Sucesso!
                </p>
                <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-emerald-600 text-white font-bold shadow-xs">
                  ⚡ {confirmacaoBanco.tempoMs}ms
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 font-semibold border border-emerald-300 dark:border-emerald-700">
                  Firestore & Prontuário Sincronizados
                </span>
              </div>
              <p className="text-xs text-emerald-800 dark:text-emerald-300 mt-1 leading-snug">
                {confirmacaoBanco.mensagem}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setConfirmacaoBanco(null)}
            className="text-emerald-700 dark:text-emerald-400 hover:text-emerald-950 p-2 rounded-xl hover:bg-emerald-100 dark:hover:bg-emerald-900/60 transition-colors"
            title="Fechar confirmação"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* BANNER DO FLUXO CLÍNICO GUIADO: ALTERNADOR ENTRE PASSO 3 (REGISTRO DE FOTOS) E PASSO 4 (CONTAGEM & LAUDO) */}
      <div className="bg-gradient-to-r from-teal-800/10 via-emerald-700/10 to-teal-900/5 dark:from-teal-950/60 dark:via-emerald-950/40 dark:to-slate-900 border border-teal-500/30 rounded-3xl p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`px-2.5 py-0.5 rounded-full text-white font-bold text-[10px] uppercase tracking-wider flex items-center gap-1 shadow-xs ${
              modoBancada === 'registro' ? 'bg-teal-700' : 'bg-emerald-700'
            }`}>
              {modoBancada === 'registro' ? (
                <>
                  <Camera className="w-3 h-3" />
                  <span>Passo 3: Registro de Fotos na Bancada</span>
                </>
              ) : (
                <>
                  <Microscope className="w-3 h-3" />
                  <span>Passo 4: Consulta & Contagem de Fios</span>
                </>
              )}
            </span>

            {clientName && (
              <span className="text-xs font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1 bg-white/80 dark:bg-slate-800 px-2.5 py-0.5 rounded-xl border border-teal-500/30 shadow-xs">
                👤 Paciente: <strong className="text-teal-700 dark:text-teal-400">{clientName}</strong>
              </span>
            )}

            {sessoesDoPaciente.length > 0 && (
              <span className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-xl border border-emerald-300 dark:border-emerald-700 flex items-center gap-1">
                <CheckCheck className="w-3 h-3 text-emerald-600" />
                <span>{sessoesDoPaciente.length} {sessoesDoPaciente.length === 1 ? 'foto registrada' : 'fotos registradas'}</span>
              </span>
            )}
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            {modoBancada === 'registro' 
              ? 'Após a anamnese, selecione os badges de área abaixo para fotografar e salvar os registros sequencialmente para este paciente.'
              : 'Na consulta clínica, acesse abaixo qualquer foto já registrada do paciente para realizar a contagem de fios, óstios e laudo.'}
          </p>
        </div>

        {/* Alternador de Modo: Passo 3 (Registrar Fotos) vs Passo 4 (Contagem) */}
        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          <div className="bg-white/80 dark:bg-slate-900/80 p-1 rounded-2xl border border-teal-500/30 flex items-center gap-1 shadow-xs">
            <button
              type="button"
              onClick={() => alternarModoBancada('registro')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                modoBancada === 'registro'
                  ? 'bg-teal-700 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Camera className="w-3.5 h-3.5" />
              <span>3. Registrar Fotos</span>
            </button>
            <button
              type="button"
              onClick={() => alternarModoBancada('analise')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                modoBancada === 'analise'
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Microscope className="w-3.5 h-3.5" />
              <span>4. Contar Fios & Consulta</span>
            </button>
          </div>

          {onNavegarParaAnamnese && (
            <button
              type="button"
              onClick={onNavegarParaAnamnese}
              className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center gap-1.5 border border-slate-200 dark:border-slate-700 transition-colors"
              title="Ver ou preencher Anamnese do paciente (Passo 2)"
            >
              <FileText className="w-3.5 h-3.5 text-teal-600" />
              <span>Anamnese (Passo 2)</span>
            </button>
          )}

          {onNavegarParaPacientes && (
            <button
              type="button"
              onClick={onNavegarParaPacientes}
              className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center gap-1.5 border border-slate-200 dark:border-slate-700 transition-colors"
              title="Voltar ao Prontuário do Paciente (Passo 1)"
            >
              <User className="w-3.5 h-3.5 text-rose-600" />
              <span>Prontuário (Passo 1)</span>
            </button>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* PASSO 3: FLUXO DE CAPTURAS MACRO E TRICOSCÓPIO (FOCO EXCLUSIVO E DIRETO)  */}
      {/* SEM contagem de fios, SEM óstios, SEM hipóteses clínicas                 */}
      {/* ========================================================================= */}
      {modoBancada === 'registro' && (
        <div className="space-y-6 animate-fadeIn">
          {/* CARD PRINCIPAL DO REGISTRO DE FOTOS (PASSOS OBJETIVOS) */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-7 border border-teal-500/30 shadow-xs space-y-5">
            {/* Topo: Título da Etapa e Seletor de Tipo (Tricoscopia vs Macro) */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-100 dark:border-slate-800 pb-4">
              <div className="space-y-1">
                <div className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-teal-50 dark:bg-teal-950/80 text-teal-800 dark:text-teal-300 border border-teal-200/80 dark:border-teal-800/60">
                  <Camera className="w-3.5 h-3.5" />
                  <span>Passo 3: Captura de Imagens Clínicas</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-stone-900 dark:text-slate-100 tracking-tight">
                  Capturas de {clientName || 'Paciente'}
                </h2>
                <p className="text-xs text-stone-500 dark:text-slate-400">
                  Conecte o tricoscópio ou realize fotos macro por região. A contagem de fios e hipóteses clínicas são realizadas na etapa seguinte.
                </p>
              </div>

              {/* Seletor de Tipo de Foto: Tricoscopia vs Macro */}
              <div className="flex items-center gap-1.5 p-1 bg-stone-100 dark:bg-slate-800 rounded-2xl border border-stone-200 dark:border-slate-700 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setTipoCaptura('tricoscopia');
                    setAlteracoesNaoSalvas(true);
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                    tipoCaptura === 'tricoscopia'
                      ? 'bg-teal-700 text-white shadow-xs'
                      : 'text-stone-600 dark:text-slate-400 hover:text-stone-900 dark:hover:text-white'
                  }`}
                  title="Captura com dermatoscópio / tricoscópio digital (aumento óptico)"
                >
                  <Microscope className="w-3.5 h-3.5" />
                  <span>Tricoscópio</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTipoCaptura('macro');
                    setAlteracoesNaoSalvas(true);
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                    tipoCaptura === 'macro'
                      ? 'bg-rose-700 text-white shadow-xs'
                      : 'text-stone-600 dark:text-slate-400 hover:text-stone-900 dark:hover:text-white'
                  }`}
                  title="Foto panorâmica macro do couro cabeludo"
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>Foto Macro</span>
                </button>
              </div>
            </div>

            {/* SELETOR DE ÁREA AVALIADA (SELEÇÃO RÁPIDA E NOMEADA) */}
            <div className="space-y-2.5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-teal-600 animate-pulse" />
                  <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-teal-600" />
                    <span>Selecione a Área Avaliada:</span>
                  </h3>
                  <span className="text-xs font-bold text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/60 px-2.5 py-0.5 rounded-lg border border-teal-200 dark:border-teal-800">
                    Área Ativa: <strong>{areaCouro}</strong>
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleIrParaProximaArea}
                  className="text-xs font-semibold text-teal-700 dark:text-teal-400 hover:underline flex items-center gap-1 self-start sm:self-auto"
                  title="Pular para a próxima área anatômica"
                >
                  <span>Próxima Área</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Badges das Áreas Anatômicas */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1.5 scrollbar-thin">
                {REGIOES_COURO_CABELUDO.map((area) => {
                  const isAtiva = areaCouro === area;
                  const qtdFotos = contagemFotosPorArea[area] || 0;
                  return (
                    <button
                      key={area}
                      type="button"
                      onClick={() => {
                        setAreaCouro(area);
                        setAlteracoesNaoSalvas(true);
                      }}
                      className={`px-3.5 py-2 rounded-2xl text-xs font-bold transition-all shrink-0 flex items-center gap-2 border ${
                        isAtiva
                          ? 'bg-gradient-to-r from-teal-700 to-teal-800 text-white border-teal-600 shadow-md shadow-teal-700/25 ring-2 ring-teal-500/40 scale-[1.02]'
                          : 'bg-stone-50 dark:bg-slate-800/80 text-stone-700 dark:text-slate-300 hover:bg-teal-50 dark:hover:bg-teal-950/40 border-stone-200 dark:border-slate-700 hover:border-teal-400'
                      }`}
                      title={`Selecionar ${area} para registrar foto`}
                    >
                      <span>{area}</span>
                      {qtdFotos > 0 && (
                        <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold flex items-center gap-0.5 ${
                          isAtiva 
                            ? 'bg-white/20 text-white' 
                            : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700'
                        }`}>
                          <Check className="w-2.5 h-2.5" />
                          <span>{qtdFotos}</span>
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ÁREA CENTRAL: CONEXÃO COM TRICOSCÓPIO OU PREVIEW LIMPO DA IMAGEM */}
            <div className="pt-2 border-t border-stone-100 dark:border-slate-800">
              {!imagemUsuarioUrl ? (
                /* ESTADO 1: SEM FOTO - CARD DE CONEXÃO DIRETA COM O TRICOSCÓPIO */
                <div className="aspect-[16/10] sm:aspect-[16/9] max-h-[460px] rounded-3xl border-2 border-dashed border-teal-500/40 dark:border-teal-700/50 bg-gradient-to-b from-teal-50/40 via-white to-stone-50/60 dark:from-teal-950/20 dark:via-slate-900/40 dark:to-slate-950 flex flex-col items-center justify-center p-6 sm:p-10 text-center space-y-4">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-teal-500/10 dark:bg-teal-500/20 text-teal-700 dark:text-teal-400 border border-teal-500/30 flex items-center justify-center shadow-inner">
                    <Video className="w-8 h-8 sm:w-10 sm:h-10" />
                  </div>

                  <div className="space-y-1 max-w-md">
                    <h3 className="text-base sm:text-lg font-bold text-stone-900 dark:text-slate-100">
                      Conecte o Tricoscópio ou Carregue a Foto
                    </h3>
                    <p className="text-xs text-stone-500 dark:text-slate-400 leading-relaxed">
                      Área ativa selecionada: <strong className="text-teal-700 dark:text-teal-400 font-bold">{areaCouro}</strong>. Conecte sua câmera USB/Wi-Fi ao vivo ou escolha um arquivo de imagem do dispositivo.
                    </p>
                  </div>

                  {/* AÇÕES DE CAPTURA RÁPIDA */}
                  <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setModalCameraAoVivo(true)}
                      className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-teal-700 to-emerald-600 hover:from-teal-800 hover:to-emerald-700 text-white font-bold text-xs sm:text-sm flex items-center gap-2.5 shadow-lg shadow-teal-700/25 active:scale-95 transition-all"
                    >
                      <Video className="w-5 h-5 text-teal-200" />
                      <span>Conectar Câmera / Tricoscópio ao Vivo</span>
                    </button>

                    <label className="cursor-pointer px-5 py-3.5 rounded-2xl bg-white hover:bg-stone-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-stone-700 dark:text-slate-200 border border-stone-200 dark:border-slate-700 font-semibold text-xs sm:text-sm flex items-center gap-2 shadow-xs transition-colors">
                      <Upload className="w-4 h-4 text-stone-500" />
                      <span>Carregar Foto do Dispositivo</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleUpload}
                      />
                    </label>
                  </div>
                </div>
              ) : (
                /* ESTADO 2: FOTO CAPTURADA - PREVIEW LIMPO SEM FERRAMENTAS DE CONTAGEM */
                <div className="space-y-3">
                  <div className="relative aspect-[16/10] sm:aspect-[16/9] max-h-[520px] rounded-3xl overflow-hidden bg-black border border-stone-800 shadow-xl flex items-center justify-center">
                    <img
                      src={imagemUsuarioUrl}
                      alt={`Foto da área ${areaCouro}`}
                      className="w-full h-full object-contain"
                    />

                    {/* Tag de Identificação Sobreposta */}
                    <div className="absolute top-3 left-3 px-3 py-1.5 rounded-xl bg-black/80 backdrop-blur-md border border-white/10 text-white text-xs font-semibold flex items-center gap-2 shadow-lg">
                      <span className="w-2 h-2 rounded-full bg-emerald-400" />
                      <span>{tipoCaptura === 'macro' ? 'Foto Macro' : 'Tricoscopia'}</span>
                      <span className="text-white/40">•</span>
                      <span>Área: <strong className="text-teal-300">{areaCouro}</strong></span>
                      {clientName && (
                        <>
                          <span className="text-white/40">•</span>
                          <span>{clientName}</span>
                        </>
                      )}
                    </div>

                    {/* Botões de Ação na Imagem */}
                    <div className="absolute bottom-3 right-3 flex items-center gap-2 flex-wrap justify-end">
                      <button
                        type="button"
                        onClick={() => setModalRetornarCapturaInvalida(true)}
                        className="px-3 py-1.5 rounded-xl bg-amber-950/80 hover:bg-amber-900/90 text-amber-200 border border-amber-600/60 backdrop-blur-md text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-md"
                        title="Caso a imagem não tenha ficado boa (desfocada ou borrada), clique para descartar e refazer"
                      >
                        <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
                        <span>Refazer Imagem</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleSalvarImagemDispositivo}
                        disabled={salvandoGaleria}
                        className="px-3 py-1.5 rounded-xl bg-black/80 hover:bg-black/90 text-white border border-white/20 backdrop-blur-md text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-md"
                        title="Salvar foto na galeria do seu celular, tablet ou computador"
                      >
                        <Download className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Salvar na Galeria</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setModalCameraAoVivo(true)}
                        className="px-3 py-1.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white border border-teal-500/60 backdrop-blur-md text-xs font-bold flex items-center gap-1.5 transition-colors shadow-md"
                        title="Conectar tricoscópio para nova captura ao vivo"
                      >
                        <Video className="w-3.5 h-3.5" />
                        <span>Nova Captura</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* BARRA DE AÇÃO PRINCIPAL: SALVAR NA FICHA DO PACIENTE (APENAS) */}
            <div className="pt-3 border-t border-stone-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-0.5">
                <p className="text-xs font-bold text-stone-900 dark:text-slate-100 flex items-center gap-1.5">
                  <Save className="w-4 h-4 text-teal-600" />
                  <span>Salvar Registro na Ficha do Paciente</span>
                </p>
                <p className="text-[11px] text-stone-500 dark:text-slate-400">
                  Grava instantaneamente no banco de dados Firestore e vincula à ficha de {clientName || 'Paciente'}.
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {/* Botão Principal: Salvar Registro na Ficha */}
                <button
                  type="button"
                  onClick={() => handleSalvarSessao(false)}
                  disabled={salvando || (!imagemUsuarioUrl && !fotoReferenciaFinal)}
                  className={`px-5 py-2.5 rounded-2xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all shadow-md active:scale-95 ${
                    salvoComSucessoRecente
                      ? 'bg-emerald-700 hover:bg-emerald-800 text-white shadow-emerald-700/20 ring-2 ring-emerald-400'
                      : alteracoesNaoSalvas
                      ? 'bg-teal-700 hover:bg-teal-800 text-white shadow-teal-700/25 ring-2 ring-teal-400 animate-pulse'
                      : 'bg-teal-700 hover:bg-teal-800 text-white shadow-teal-700/20'
                  } disabled:opacity-50 disabled:pointer-events-none`}
                  title={`Salvar foto da área "${areaCouro}" na ficha do paciente`}
                >
                  {salvando ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Gravando no Banco...</span>
                    </>
                  ) : salvoComSucessoRecente ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                      <span>Salvo com Sucesso! ✓</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>Salvar Registro na Ficha</span>
                    </>
                  )}
                </button>

                {/* Botão Sequencial: Salvar & Próxima Área */}
                <button
                  type="button"
                  onClick={() => handleSalvarSessao(true)}
                  disabled={salvando || (!imagemUsuarioUrl && !fotoReferenciaFinal)}
                  className="px-5 py-2.5 rounded-2xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all shadow-md active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
                  title="Salvar esta foto e preparar a bancada imediatamente para a próxima área"
                >
                  <Check className="w-4 h-4" />
                  <span>Salvar & Próxima Área ➜</span>
                </button>
              </div>
            </div>
          </div>

          {/* GALERIA DE FOTOS REGISTRADAS DO PACIENTE NESTA SESSÃO (COM BOTÃO DE AVANÇAR PARA PASSO 4) */}
          {sessoesDoPaciente.length > 0 && (
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-6 border border-stone-200/90 dark:border-slate-800 space-y-4 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-100 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-teal-500/10 text-teal-700 dark:text-teal-400 flex items-center justify-center">
                    <Camera className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs sm:text-sm font-bold text-stone-900 dark:text-slate-100 uppercase tracking-wider">
                      Fotos Registradas na Ficha de {clientName} ({sessoesDoPaciente.length})
                    </h3>
                    <p className="text-[11px] text-stone-500 dark:text-slate-400">
                      Registros catalogados por área. Ao concluir, avance para a etapa de contagem de fios e laudo.
                    </p>
                  </div>
                </div>

                {/* Botão de Transição para o Passo 4 (Contagem & Laudo) */}
                <button
                  type="button"
                  onClick={() => alternarModoBancada('analise')}
                  className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white text-xs sm:text-sm font-bold flex items-center gap-2 shadow-md shadow-emerald-700/20 active:scale-95 transition-all"
                  title="Concluir a sessão de fotos e iniciar a contagem de fios e emissão de laudo"
                >
                  <Microscope className="w-4 h-4" />
                  <span>Concluir Capturas e Ir para Avaliação de Fios (Passo 4) ➜</span>
                </button>
              </div>

              {/* Grid de Miniaturas das Fotos Registradas */}
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
                {sessoesDoPaciente.map((sess) => {
                  const isSelecionada = sessionId === sess.id;
                  return (
                    <div
                      key={sess.id}
                      onClick={() => handleCarregarFotoPacienteParaContagem(sess)}
                      className={`group relative rounded-2xl overflow-hidden border p-2 flex flex-col justify-between transition-all cursor-pointer ${
                        isSelecionada
                          ? 'border-teal-500 bg-teal-50/70 dark:bg-teal-950/40 ring-2 ring-teal-500/40 shadow-md'
                          : 'border-stone-200 dark:border-slate-800 bg-stone-50/50 dark:bg-slate-950/40 hover:border-teal-400 hover:shadow-xs'
                      }`}
                      title={`Carregar foto de "${sess.area || 'Área'}" para contagem e análise no Passo 4`}
                    >
                      <div className="aspect-square w-full rounded-xl overflow-hidden bg-black relative mb-2">
                        <img
                          src={sess.image_url}
                          alt={sess.area}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[11px] font-bold gap-1">
                          <Microscope className="w-3.5 h-3.5" />
                          <span>Avaliar Fios</span>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <span className="px-2 py-0.5 rounded-lg bg-teal-700 text-white font-bold text-[10px] block truncate text-center">
                          {sess.area || 'Área'}
                        </span>
                        <p className="text-[10px] text-stone-400 font-mono text-center truncate">
                          {sess.session_date}
                        </p>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCarregarFotoPacienteParaContagem(sess);
                          }}
                          className="w-full py-1 rounded-lg bg-teal-50 hover:bg-teal-100 dark:bg-teal-950 dark:hover:bg-teal-900 text-teal-800 dark:text-teal-200 text-[10px] font-bold text-center transition-colors border border-teal-200 dark:border-teal-800"
                        >
                          {isSelecionada ? 'Em Análise' : 'Avaliar Fios ➜'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* PASSO 4: BANCADA DE CONTAGEM MANUAL, ÓSTIOS, HIPÓTESE CLÍNICA & LAUDO    */}
      {/* Realizada APÓS a coleta das fotos e tricoscopia                           */}
      {/* ========================================================================= */}
      {modoBancada === 'analise' && (
        <div className="space-y-6 animate-fadeIn">
          {/* GALERIA DE FOTOS PARA SELEÇÃO RÁPIDA DE CONTAGEM */}
          {sessoesDoPaciente.length > 0 && (
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-stone-200/90 dark:border-slate-800 space-y-3 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-100 dark:border-slate-800 pb-2.5">
                <div className="flex items-center gap-2">
                  <Microscope className="w-4 h-4 text-emerald-600" />
                  <div>
                    <h3 className="text-xs font-bold text-stone-900 dark:text-slate-100 uppercase tracking-wider">
                      Selecione a Foto de {clientName} para Contagem & Laudo
                    </h3>
                    <p className="text-[11px] text-stone-500 dark:text-slate-400">
                      Clique em qualquer uma das {sessoesDoPaciente.length} fotos registradas para abrir na bancada de marcação.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => alternarModoBancada('registro')}
                  className="px-3.5 py-1.5 rounded-xl bg-teal-50 hover:bg-teal-100 dark:bg-teal-950 dark:hover:bg-teal-900 text-teal-800 dark:text-teal-200 text-xs font-bold flex items-center gap-1.5 transition-colors border border-teal-200 dark:border-teal-800"
                  title="Voltar para registrar mais fotos com o tricoscópio (Passo 3)"
                >
                  <Camera className="w-3.5 h-3.5 text-teal-600" />
                  <span>+ Registrar Mais Fotos (Passo 3)</span>
                </button>
              </div>

              {/* Grid de Cards de Fotos */}
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
                {sessoesDoPaciente.map((sess) => {
                  const isSelecionada = sessionId === sess.id;
                  return (
                    <div
                      key={sess.id}
                      onClick={() => handleCarregarFotoPacienteParaContagem(sess)}
                      className={`group relative rounded-2xl overflow-hidden border p-2 flex flex-col justify-between transition-all cursor-pointer ${
                        isSelecionada
                          ? 'border-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/40 ring-2 ring-emerald-500/40 shadow-md'
                          : 'border-stone-200 dark:border-slate-800 bg-stone-50/50 dark:bg-slate-950/40 hover:border-emerald-400 hover:shadow-xs'
                      }`}
                    >
                      <div className="aspect-square w-full rounded-xl overflow-hidden bg-black relative mb-2">
                        <img
                          src={sess.image_url}
                          alt={sess.area}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[11px] font-bold gap-1">
                          <Microscope className="w-3.5 h-3.5" />
                          <span>Contar Fios</span>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <span className="px-2 py-0.5 rounded-lg bg-emerald-700 text-white font-bold text-[10px] block truncate text-center">
                          {sess.area || 'Área'}
                        </span>
                        <p className="text-[10px] text-stone-400 font-mono text-center truncate">
                          {sess.session_date}
                        </p>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCarregarFotoPacienteParaContagem(sess);
                          }}
                          className="w-full py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200 text-[10px] font-bold text-center transition-colors border border-emerald-200 dark:border-emerald-800"
                        >
                          {isSelecionada ? 'Ativa na Bancada' : 'Contar Fios'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

      {/* CABEÇALHO DO WORKSPACE DE ANÁLISE & CONTAGEM */}
      <div className="bg-white dark:bg-slate-900/90 p-5 sm:p-7 rounded-3xl border border-stone-200/90 dark:border-slate-800 space-y-4 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800/60">
              <Microscope className="w-3.5 h-3.5" />
              <span>Passo 4: Bancada de Contagem Manual & Laudo</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-stone-900 dark:text-slate-100 tracking-tight">
              Análise & Contagem: {areaCouro}
            </h1>
            <p className="text-xs sm:text-sm text-stone-500 dark:text-slate-400 max-w-2xl leading-relaxed">
              Marque manualmente no canvas as unidades unitárias, duplas, triplas, óstios vazios e achados tricoscópicos para cálculo em tempo real e emissão do laudo.
            </p>
          </div>

          {/* Botões de Ação */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Voltar para Capturas */}
            <button
              type="button"
              onClick={() => alternarModoBancada('registro')}
              className="px-3.5 py-2 rounded-xl bg-teal-50 hover:bg-teal-100 dark:bg-teal-950/70 text-teal-800 dark:text-teal-200 border border-teal-300 dark:border-teal-700/80 text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
              title="Voltar para a etapa de fotos e conexão com o tricoscópio (Passo 3)"
            >
              <Camera className="w-4 h-4 text-teal-600 dark:text-teal-400" />
              <span>+ Registrar Mais Fotos (Passo 3)</span>
            </button>
            {/* Botão Principal: Salvar Sessão */}
            <button
              type="button"
              onClick={() => handleSalvarSessao(false)}
              disabled={salvando || (!imagemUsuarioUrl && !fotoReferenciaFinal)}
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-md active:scale-95 ${
                salvoComSucessoRecente
                  ? 'bg-emerald-700 hover:bg-emerald-800 text-white shadow-emerald-700/20 ring-2 ring-emerald-400'
                  : alteracoesNaoSalvas
                  ? 'bg-rose-700 hover:bg-rose-800 text-white shadow-rose-700/25 ring-2 ring-rose-400 animate-pulse'
                  : 'bg-rose-700 hover:bg-rose-800 text-white shadow-rose-700/20'
              } disabled:opacity-50 disabled:pointer-events-none`}
              title="Salvar todas as marcações e dados da sessão no prontuário do paciente (Ctrl+S)"
            >
              {salvando ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Salvando...</span>
                </>
              ) : salvoComSucessoRecente ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                  <span>Sessão Salva!</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Salvar Sessão</span>
                </>
              )}
            </button>

            <button
              onClick={() => setTourAberto(true)}
              className="px-3.5 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/60 dark:hover:bg-amber-900/60 text-amber-900 dark:text-amber-200 border border-amber-200 dark:border-amber-800 text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
              title="Como usar a bancada de marcação manual"
            >
              <HelpCircle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <span>Guia da Bancada</span>
            </button>

            <button
              onClick={() => setHistoricoAberto(true)}
              className="px-3.5 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-stone-700 dark:text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
            >
              <History className="w-4 h-4 text-rose-600 dark:text-rose-400" />
              <span>Histórico ({sessoesSalvas.length})</span>
            </button>

            <button
              onClick={() => {
                const novoEstado = !exibirReferenciaAtlas;
                setExibirReferenciaAtlas(novoEstado);
                if (novoEstado) {
                  setTimeout(() => {
                    document.getElementById('secao-referencia-atlas')?.scrollIntoView({ behavior: 'smooth' });
                  }, 150);
                }
              }}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shadow-xs ${
                exibirReferenciaAtlas
                  ? 'bg-rose-700 text-white shadow-md shadow-rose-700/25 ring-2 ring-rose-500/30'
                  : 'bg-stone-100 hover:bg-stone-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-stone-700 dark:text-slate-200'
              }`}
              title="Consultar patologias e guia de conferência visual do Atlas"
            >
              <BookOpen className="w-4 h-4 text-rose-600 dark:text-rose-400" />
              <span>{exibirReferenciaAtlas ? 'Ocultar Referência' : 'Buscar Referências'}</span>
            </button>

            {imagemUsuarioUrl && (
              <>
                {/* Botão de Retornar caso a captura feita não seja válida */}
                <button
                  type="button"
                  onClick={() => setModalRetornarCapturaInvalida(true)}
                  className="px-3.5 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/70 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-700/80 text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
                  title="Caso a imagem não seja válida (fora de foco, reflexo ou borrada), clique para descartar e refazer"
                >
                  <RotateCcw className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  <span>Captura Inválida (Retornar)</span>
                </button>

                {/* Botão Salvar Imagem Tricoscópica na Galeria do Dispositivo */}
                <button
                  type="button"
                  onClick={handleSalvarImagemDispositivo}
                  disabled={salvandoGaleria}
                  className="px-3.5 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/70 text-emerald-900 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700/80 text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
                  title="Salvar a foto tricoscópica na galeria do seu celular, tablet ou computador"
                >
                  <Download className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>{salvandoGaleria ? 'Salvando...' : 'Salvar na Galeria'}</span>
                </button>

                <button
                  onClick={handleExportarImagemMarcada}
                  className="px-3.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
                  title="Baixar imagem com as marcações desenhadas e dados em alta resolução (PNG)"
                >
                  <Sparkles className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                  <span>Baixar Foto Marcada</span>
                </button>

                <button
                  onClick={() => setModalLaudoAberto(true)}
                  className="px-3.5 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-stone-700 dark:text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
                >
                  <FileText className="w-4 h-4 text-stone-600 dark:text-stone-300" />
                  <span>Emitir Laudo</span>
                </button>

                <button
                  onClick={handleLimparBancada}
                  className="p-2 rounded-xl text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-slate-800 transition-colors"
                  title="Limpar bancada"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </>
            )}
          </div>
        </div>

        {/* Ficha de Identificação da Cliente */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-3 border-t border-stone-200/80 dark:border-slate-800">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[11px] font-semibold text-stone-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <User className="w-3 h-3 text-rose-600" />
                <span>Cliente / Ficha</span>
              </label>
              {pacienteId && (
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-0.5">
                  <Check className="w-3 h-3" /> Vinculado
                </span>
              )}
            </div>
            <input
              type="text"
              list="lista-pacientes-cadastrados"
              placeholder="Nome ou código da ficha"
              value={clientName}
              onChange={(e) => {
                const val = e.target.value;
                setClientName(val);
                setAlteracoesNaoSalvas(true);
                const pac = pacientesCadastrados.find(p => p.nome.toLowerCase().trim() === val.toLowerCase().trim());
                setPacienteId(pac ? pac.id : null);
              }}
              className="w-full bg-stone-50 dark:bg-slate-950 border border-stone-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs text-stone-900 dark:text-slate-100 font-medium focus:outline-none focus:border-rose-400 transition-colors"
            />
            <datalist id="lista-pacientes-cadastrados">
              {pacientesCadastrados.map(p => (
                <option key={p.id} value={p.nome} />
              ))}
            </datalist>
          </div>

          <div>
            <label className="text-[11px] font-semibold text-stone-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1 mb-1">
              <Calendar className="w-3 h-3 text-rose-600" />
              <span>Data da Sessão</span>
            </label>
            <input
              type="date"
              value={sessionDate}
              onChange={(e) => {
                setSessionDate(e.target.value);
                setAlteracoesNaoSalvas(true);
              }}
              className="w-full bg-stone-50 dark:bg-slate-950 border border-stone-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs text-stone-900 dark:text-slate-100 font-medium focus:outline-none focus:border-rose-400 transition-colors"
            />
          </div>

          <div>
            <label className="text-[11px] font-semibold text-stone-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1 mb-1">
              <MapPin className="w-3 h-3 text-rose-600" />
              <span>Área Avaliada</span>
            </label>
            <select
              value={areaCouro}
              onChange={(e) => {
                setAreaCouro(e.target.value);
                setAlteracoesNaoSalvas(true);
              }}
              className="w-full bg-stone-50 dark:bg-slate-950 border border-stone-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs text-stone-900 dark:text-slate-100 font-medium focus:outline-none focus:border-rose-400 transition-colors"
            >
              {REGIOES_COURO_CABELUDO.map((r, i) => (
                <option key={i} value={r}>{r}</option>
              ))}
            </select>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[11px] font-semibold text-stone-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <Scale className="w-3 h-3 text-rose-600" />
                <span>Área do Campo (cm²)</span>
              </label>
              {fieldAreaCm2 && (
                <button
                  type="button"
                  onClick={() => {
                    setFieldAreaCm2(undefined);
                    setAlteracoesNaoSalvas(true);
                  }}
                  className="text-[10px] text-rose-600 dark:text-rose-400 hover:underline"
                >
                  Limpar
                </button>
              )}
            </div>
            <input
              type="number"
              step="0.01"
              min="0.01"
              placeholder="Ex: 0.5"
              value={fieldAreaCm2 || ''}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                setFieldAreaCm2(isNaN(val) ? undefined : val);
                setAlteracoesNaoSalvas(true);
              }}
              className="w-full bg-stone-50 dark:bg-slate-950 border border-stone-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs text-stone-900 dark:text-slate-100 font-medium focus:outline-none focus:border-rose-400 transition-colors"
            />
            {/* Presets rápidos de lentes tricoscópicas */}
            <div className="flex items-center gap-1 mt-1.5 flex-wrap">
              <span className="text-[10px] text-stone-400 font-medium">Lentes:</span>
              {[
                { label: '0.25 cm²', val: 0.25 },
                { label: '0.50 cm²', val: 0.50 },
                { label: '1.00 cm²', val: 1.00 }
              ].map(preset => (
                <button
                  key={preset.val}
                  type="button"
                  onClick={() => setFieldAreaCm2(preset.val)}
                  className={`px-1.5 py-0.5 rounded-md text-[10px] font-mono font-semibold transition-all ${
                    fieldAreaCm2 === preset.val
                      ? 'bg-rose-600 text-white shadow-xs'
                      : 'bg-stone-200/80 hover:bg-stone-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-stone-700 dark:text-slate-300'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* SELETOR DE MODO DE COMPARAÇÃO */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-stone-100/80 dark:bg-slate-950/60 p-2.5 rounded-2xl border border-stone-200/90 dark:border-slate-800">
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-semibold text-stone-500 dark:text-slate-400 px-2 uppercase tracking-wider">
            Modo de Visualização:
          </span>
          <button
            onClick={() => setModoComparacao('bipartido')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors ${
              modoComparacao === 'bipartido'
                ? 'bg-white dark:bg-slate-800 text-rose-700 dark:text-rose-300 shadow-xs border border-stone-200 dark:border-slate-700'
                : 'text-stone-600 dark:text-slate-400 hover:text-stone-900 dark:hover:text-slate-200'
            }`}
          >
            <Columns className="w-3.5 h-3.5" />
            <span>Lado a Lado</span>
          </button>
          <button
            onClick={() => setModoComparacao('cortina')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors ${
              modoComparacao === 'cortina'
                ? 'bg-white dark:bg-slate-800 text-rose-700 dark:text-rose-300 shadow-xs border border-stone-200 dark:border-slate-700'
                : 'text-stone-600 dark:text-slate-400 hover:text-stone-900 dark:hover:text-slate-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Cortina Deslizante</span>
          </button>
        </div>

        {/* Filtros Ópticos Complementares */}
        {imagemUsuarioUrl && (
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              onClick={() => setMostrarGrade(!mostrarGrade)}
              className={`px-2.5 py-1.5 rounded-xl text-xs font-medium border flex items-center gap-1 transition-colors ${
                mostrarGrade
                  ? 'bg-rose-50 text-rose-800 border-rose-300 dark:bg-rose-950/70 dark:text-rose-300'
                  : 'bg-white dark:bg-slate-900 text-stone-700 dark:text-slate-300 border-stone-200 dark:border-slate-700'
              }`}
              title="Sobrepor Grade Micrométrica de 1mm"
            >
              <Grid className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
              <span>Régua 1mm</span>
            </button>

            <button
              onClick={() => setFiltroVascular(!filtroVascular)}
              className={`px-2.5 py-1.5 rounded-xl text-xs font-medium border flex items-center gap-1 transition-colors ${
                filtroVascular
                  ? 'bg-rose-50 text-rose-800 border-rose-300 dark:bg-rose-950/70 dark:text-rose-300'
                  : 'bg-white dark:bg-slate-900 text-stone-700 dark:text-slate-300 border-stone-200 dark:border-slate-700'
              }`}
              title="Realçar vasos e eritema"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
              <span>Realce Vascular</span>
            </button>

            <button
              onClick={() => setFiltroInversao(!filtroInversao)}
              className={`px-2.5 py-1.5 rounded-xl text-xs font-medium border flex items-center gap-1 transition-colors ${
                filtroInversao
                  ? 'bg-rose-50 text-rose-800 border-rose-300 dark:bg-rose-950/70 dark:text-rose-300'
                  : 'bg-white dark:bg-slate-900 text-stone-700 dark:text-slate-300 border-stone-200 dark:border-slate-700'
              }`}
              title="Inverter cores para realce de linhas brancas e fibrose"
            >
              <Sparkles className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
              <span>Luz Polarizada Neg.</span>
            </button>
          </div>
        )}
      </div>

      {/* ÁREA DE TRABALHO: BANCADA DE MARCAÇÃO + REFERÊNCIA */}
      {modoComparacao === 'cortina' && imagemUsuarioUrl ? (
        /* MODO CORTINA DESLIZANTE COM MARCAÇÕES SOBREPOSTAS */
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-6 border border-stone-200/90 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold font-mono px-2.5 py-0.5 rounded-full bg-rose-50 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                Cortina Interativa
              </span>
              <span className="text-xs text-stone-500 dark:text-slate-400">
                Arraste o divisor para comparar a captura da cliente com a referência do Atlas.
              </span>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-[11px] font-semibold text-stone-500 dark:text-slate-400">
                Referência:
              </label>
              <select
                value={casoReferenciaId}
                onChange={(e) => setCasoReferenciaId(e.target.value)}
                className="bg-stone-50 dark:bg-slate-950 border border-stone-200 dark:border-slate-700 rounded-xl px-2.5 py-1 text-xs text-stone-900 dark:text-slate-100 font-medium focus:outline-none"
              >
                {CASOS_ATLAS.map(c => (
                  <option key={c.id} value={c.id}>{c.nome}</option>
                ))}
              </select>
            </div>
          </div>

          <div
            ref={containerCortinaRef}
            onMouseDown={handleTouchOuMouseDownCortina}
            onTouchStart={handleTouchOuMouseDownCortina}
            className="relative w-full aspect-[16/10] sm:aspect-[16/9] max-h-[550px] rounded-2xl overflow-hidden bg-stone-950 cursor-ew-resize select-none border border-stone-800 shadow-2xl"
          >
            {/* Camada do Fundo: Imagem de Referência do Atlas */}
            <div className="absolute inset-0 w-full h-full flex items-center justify-center">
              {fotoReferenciaFinal ? (
                <img
                  src={fotoReferenciaFinal}
                  alt={casoReferencia.nome}
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="flex flex-col items-center justify-center text-stone-500 text-xs">
                  <Camera className="w-8 h-8 mb-1 text-stone-600" />
                  <span>Referência: {casoReferencia.nome}</span>
                </div>
              )}
              <div className="absolute bottom-3 right-3 px-2.5 py-1 rounded-lg bg-black/75 backdrop-blur-xs border border-stone-700 text-stone-200 text-xs font-mono">
                Atlas: {casoReferencia.nome}
              </div>
            </div>

            {/* Camada Superior Recortada: Captura da Cliente com Marcações */}
            <div
              className="absolute inset-0 overflow-hidden"
              style={{ width: `${posicaoCortina}%` }}
            >
              <div
                className="w-full h-full flex items-center justify-center relative"
                style={{
                  width: containerCortinaRef.current ? `${containerCortinaRef.current.clientWidth}px` : '100%',
                  height: containerCortinaRef.current ? `${containerCortinaRef.current.clientHeight}px` : '100%'
                }}
              >
                {imagemUsuarioUrl ? (
                  <img
                    src={imagemUsuarioUrl}
                    alt="Captura da cliente"
                    className="w-full h-full object-contain"
                    style={{
                      filter: `${filtroVascular ? 'contrast(135%) saturate(145%)' : ''} ${filtroInversao ? 'invert(1) hue-rotate(180deg)' : ''}`
                    }}
                  />
                ) : null}

                {/* Marcações manuais sobrepostas */}
                {visivel && annotations.map(ann => {
                  const styleConfig = CORES_TIPO[ann.type];
                  return (
                    <div
                      key={ann.id}
                      className="absolute border-2 pointer-events-none"
                      style={{
                        left: `${ann.x * 100}%`,
                        top: `${ann.y * 100}%`,
                        width: `${ann.width * 100}%`,
                        height: `${ann.height * 100}%`,
                        borderColor: styleConfig.hex,
                        backgroundColor: `rgba(${
                          ann.type === 'unitario' ? '37, 99, 235' :
                          ann.type === 'duplo' ? '6, 182, 212' :
                          ann.type === 'triplo' ? '22, 163, 74' :
                          ann.type === 'ostio_vazio' ? '249, 115, 22' :
                          ann.type === 'inflamacao' ? '192, 38, 211' : '220, 38, 38'
                        }, 0.25)`
                      }}
                    />
                  );
                })}

                <div className="absolute bottom-3 left-3 px-2.5 py-1 rounded-lg bg-rose-950/80 backdrop-blur-xs border border-rose-700/60 text-rose-200 text-xs font-mono">
                  Cliente: {clientName || 'Em Análise'}
                </div>
              </div>
            </div>

            {/* Divisor Central Móvel */}
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-rose-500 shadow-[0_0_12px_rgba(244,63,94,0.8)] z-20 pointer-events-none"
              style={{ left: `${posicaoCortina}%` }}
            >
              <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-rose-600 border-2 border-white flex items-center justify-center text-white shadow-xl">
                <SlidersHorizontal className="w-4 h-4 rotate-90" />
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* BANCADA DE MARCAÇÃO MANUAL DA CLIENTE EM LARGURA TOTAL */
        <div className={`bg-white dark:bg-slate-900 rounded-3xl p-4 sm:p-5 border border-stone-200/90 dark:border-slate-800 space-y-3 shadow-xs transition-all ${
          modoFoco ? 'fixed inset-2 sm:inset-4 z-50 overflow-y-auto shadow-2xl flex flex-col justify-between bg-white dark:bg-slate-950 border-rose-500/40' : ''
        }`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-mono font-bold text-rose-700 dark:text-rose-300 uppercase px-2.5 py-0.5 rounded-full bg-rose-50 dark:bg-rose-950 border border-rose-200 dark:border-rose-800">
                Captura da Cliente
              </span>
              {clientName && (
                <span className="text-xs font-semibold text-stone-700 dark:text-slate-300 truncate max-w-[200px]">
                  {clientName}
                </span>
              )}
              {salvoComSucessoRecente ? (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 flex items-center gap-1 animate-fadeIn">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Salvo
                </span>
              ) : alteracoesNaoSalvas ? (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" /> Alterações pendentes
                </span>
              ) : sessionId ? (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-stone-100 text-stone-600 dark:bg-slate-800 dark:text-slate-300">
                  Sessão gravada
                </span>
              ) : null}
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Botão Modo Foco / Exame Ampliado */}
              <button
                type="button"
                onClick={() => setModoFoco(!modoFoco)}
                className={`px-2.5 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1 transition-all ${
                  modoFoco 
                    ? 'bg-rose-700 text-white border-rose-700 shadow-sm' 
                    : 'bg-stone-100 hover:bg-stone-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-stone-700 dark:text-slate-200 border-stone-200 dark:border-slate-700'
                }`}
                title={modoFoco ? 'Sair do Modo Foco (Atalho: F)' : 'Modo Foco / Exame Ampliado (Atalho: F)'}
              >
                {modoFoco ? (
                  <>
                    <Minimize2 className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Sair do Foco</span>
                  </>
                ) : (
                  <>
                    <Maximize2 className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Modo Foco</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  setExibirReferenciaAtlas(true);
                  setTimeout(() => {
                    document.getElementById('secao-referencia-atlas')?.scrollIntoView({ behavior: 'smooth' });
                  }, 100);
                }}
                className={`text-xs font-semibold px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 shadow-xs ${
                  exibirReferenciaAtlas
                    ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                    : 'bg-stone-100 hover:bg-stone-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-stone-700 dark:text-slate-200'
                }`}
                title="Consultar referências do Atlas e Guia de Conferência Visual ao final da página"
              >
                <BookOpen className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                <span>{exibirReferenciaAtlas ? 'Referência Ativa' : 'Buscar Referências'}</span>
              </button>

              {imagemUsuarioUrl && (
                <>
                  <span className="text-stone-300 dark:text-stone-700 hidden sm:inline">•</span>
                  <button
                    type="button"
                    onClick={handleSalvarImagemDispositivo}
                    disabled={salvandoGaleria}
                    className="text-xs text-emerald-700 dark:text-emerald-400 font-semibold hover:underline flex items-center gap-1"
                    title="Salvar foto na galeria do seu celular, tablet ou computador"
                  >
                    <Download className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span>Salvar na Galeria</span>
                  </button>

                  <span className="text-stone-300 dark:text-stone-700 hidden sm:inline">•</span>
                  <button
                    type="button"
                    onClick={() => setModalRetornarCapturaInvalida(true)}
                    className="text-xs text-amber-700 dark:text-amber-400 font-semibold hover:underline flex items-center gap-1"
                    title="Caso a imagem não seja válida (fora de foco, borrada ou área incorreta), clique para retornar e capturar novamente"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                    <span>Captura Inválida (Retornar)</span>
                  </button>

                  <span className="text-stone-300 dark:text-stone-700 hidden sm:inline">•</span>
                  <button
                    onClick={() => setModalCameraAoVivo(true)}
                    className="text-xs text-rose-700 dark:text-rose-400 font-semibold hover:underline flex items-center gap-1"
                    title="Conectar tricoscópio USB ou Wi-Fi ao vivo"
                  >
                    <Video className="w-3.5 h-3.5" />
                    <span>Câmera ao Vivo</span>
                  </button>
                  <span className="text-stone-300 dark:text-stone-700 hidden sm:inline">•</span>
                  <label className="cursor-pointer text-xs text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200 font-medium hover:underline">
                    <span>Trocar arquivo</span>
                    <input
                      id="input-file-bancada-substituir"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleUpload}
                    />
                  </label>
                </>
              )}
            </div>
          </div>

          {imagemUsuarioUrl ? (
            <BancadaMarcacao
              imageUrl={imagemUsuarioUrl}
              annotations={annotations}
              onChangeAnnotations={setAnnotationsWithHistory}
              modoAtivo={modoAtivo}
              onChangeModoAtivo={setModoAtivo}
              visivel={visivel}
              onToggleVisivel={() => setVisivel(!visivel)}
              zoom={zoom}
              onChangeZoom={setZoom}
              onResetZoom={() => setZoom(1)}
              onUndo={handleUndo}
              onRedo={handleRedo}
              canUndo={historyIndex > 0}
              canRedo={historyIndex < history.length - 1}
              onClearAll={handleClearAll}
              onEditAchado={handleAbrirEdicaoAchado}
              selectedId={selectedAnnotationId}
              onSelectId={setSelectedAnnotationId}
              filtroVascular={filtroVascular}
              filtroInversao={filtroInversao}
              mostrarGrade={mostrarGrade}
              onSalvar={handleSalvarSessao}
              salvando={salvando}
            />
          ) : (
            <div className="aspect-[4/3] rounded-2xl border-2 border-dashed border-stone-200 dark:border-slate-800 bg-stone-50 dark:bg-slate-950/60 flex flex-col items-center justify-center p-6 text-center space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-rose-50 dark:bg-rose-950 border border-rose-200/80 dark:border-rose-800/60 flex items-center justify-center text-rose-600 dark:text-rose-400 shadow-xs">
                <Camera className="w-7 h-7" />
              </div>
              <div>
                <p className="text-base font-bold text-stone-900 dark:text-slate-100">
                  Insira a captura do dermatoscópio
                </p>
                <p className="text-xs text-stone-500 dark:text-slate-400 max-w-sm mx-auto mt-1 leading-relaxed">
                  Conecte a câmera do seu tricoscópio ao vivo (cabo USB ou Wi-Fi) ou carregue uma imagem já capturada.
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-2.5 pt-1">
                <button
                  onClick={() => setModalCameraAoVivo(true)}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-rose-700 hover:bg-rose-800 text-white font-semibold text-xs transition-all shadow-md active:scale-95"
                >
                  <Video className="w-4 h-4 text-rose-200" />
                  <span>Conectar Câmera / Tricoscópio ao Vivo</span>
                </button>
                <label className="cursor-pointer inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white hover:bg-stone-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-stone-700 dark:text-slate-200 border border-stone-200 dark:border-slate-700 font-semibold text-xs transition-colors shadow-xs">
                  <Upload className="w-3.5 h-3.5" />
                  <span>Carregar Arquivo</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleUpload}
                  />
                </label>
                {fotoReferenciaFinal && (
                  <button
                    type="button"
                    onClick={() => {
                      setImagemUsuarioUrl(fotoReferenciaFinal);
                      setAlteracoesNaoSalvas(true);
                      mostrarAlerta('sucesso', 'Imagem de referência do Atlas carregada na bancada para análise.');
                    }}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/60 dark:hover:bg-amber-900/60 text-amber-900 dark:text-amber-200 border border-amber-200 dark:border-amber-800 font-semibold text-xs transition-colors shadow-xs"
                  >
                    <BookOpen className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                    <span>Usar Imagem do Atlas ({casoReferencia.nome.split('-')[0].trim()})</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 5. PAINEL DE CONTAGEM + CHECKLIST DE SINAIS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
        {/* CARD DO PAINEL DE CONTAGEM EM TEMPO REAL */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-stone-200/90 dark:border-slate-800 space-y-4 shadow-xs">
          <div className="flex items-center justify-between border-b border-stone-100 dark:border-slate-800 pb-2.5">
            <h3 className="text-xs font-bold text-stone-900 dark:text-slate-100 uppercase tracking-wider flex items-center gap-1.5">
              <Hash className="w-3.5 h-3.5 text-rose-600" />
              <span>Painel de Contagem Manual</span>
            </h3>
            <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded-full bg-stone-100 dark:bg-slate-800 text-stone-600 dark:text-slate-400">
              {annotations.length} marcas
            </span>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between p-2 rounded-xl bg-blue-50/60 dark:bg-blue-950/30 text-blue-900 dark:text-blue-200">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#2563EB]" />
                <span>Unidades unitárias (1 fio):</span>
              </span>
              <span className="font-mono font-bold text-sm">{summary.unitarias}</span>
            </div>

            <div className="flex items-center justify-between p-2 rounded-xl bg-cyan-50/60 dark:bg-cyan-950/30 text-cyan-900 dark:text-cyan-200">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#06B6D4]" />
                <span>Unidades duplas (2 fios):</span>
              </span>
              <span className="font-mono font-bold text-sm">{summary.duplas}</span>
            </div>

            <div className="flex items-center justify-between p-2 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-200">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#16A34A]" />
                <span>Unidades triplas (3 fios):</span>
              </span>
              <span className="font-mono font-bold text-sm">{summary.triplas}</span>
            </div>

            <div className="flex items-center justify-between p-2 rounded-xl bg-orange-50/60 dark:bg-orange-950/30 text-orange-900 dark:text-orange-200">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#F97316]" />
                <span>Óstios vazios:</span>
              </span>
              <span className="font-mono font-bold text-sm">{summary.ostiosVazios}</span>
            </div>

            <div className="flex items-center justify-between p-2 rounded-xl bg-fuchsia-50/60 dark:bg-fuchsia-950/30 text-fuchsia-900 dark:text-fuchsia-200">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#C026D3]" />
                <span>Focos de inflamação / eritema:</span>
              </span>
              <span className="font-mono font-bold text-sm">{summary.inflamacaoCount}</span>
            </div>

            <div className="pt-2 border-t border-stone-100 dark:border-slate-800 space-y-1.5 text-stone-700 dark:text-slate-300">
              <div className="flex justify-between py-0.5">
                <span className="font-semibold">Total de unidades foliculares (UF):</span>
                <span className="font-mono font-bold">{summary.totalUnidadesFoliculares}</span>
              </div>
              <div className="flex justify-between py-0.5">
                <span className="font-semibold">Total de fios emergentes:</span>
                <span className="font-mono font-bold text-rose-700 dark:text-rose-400">{summary.totalFios}</span>
              </div>
              <div className="flex justify-between py-0.5">
                <span className="font-semibold">Total de óstios:</span>
                <span className="font-mono font-bold">{summary.totalOstios}</span>
              </div>
              <div className="flex justify-between py-0.5">
                <span className="font-semibold">Média fios / unidade folicular:</span>
                <span className="font-mono font-bold">{summary.mediaFiosPorUF}</span>
              </div>
              <div className="flex justify-between py-0.5">
                <span className="font-semibold">% de unidades unitárias:</span>
                <span className="font-mono font-bold">{summary.pctUnitarias}</span>
              </div>

              {fieldAreaCm2 && fieldAreaCm2 > 0 && (
                <>
                  <div className="flex justify-between py-0.5 text-emerald-700 dark:text-emerald-400">
                    <span className="font-semibold">Densidade de fios:</span>
                    <span className="font-mono font-bold">{summary.densidadeFios}</span>
                  </div>
                  <div className="flex justify-between py-0.5 text-emerald-700 dark:text-emerald-400">
                    <span className="font-semibold">Densidade de UF:</span>
                    <span className="font-mono font-bold">{summary.densidadeUF}</span>
                  </div>
                </>
              )}
            </div>

            {/* Achados e Sinais Inflamatórios Registrados */}
            <div className="pt-2 border-t border-stone-100 dark:border-slate-800 space-y-1.5">
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="flex items-center gap-1.5 text-stone-700 dark:text-stone-300">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#DC2626]" />
                  <span>Achados & Inflamação:</span>
                </span>
                <span className="font-mono font-bold">{achadosMarcados.length}</span>
              </div>

              {achadosMarcados.length > 0 ? (
                <div className="max-h-36 overflow-y-auto space-y-1 pt-1">
                  {achadosMarcados.map((ann, idx) => (
                    <div
                      key={ann.id}
                      onClick={() => handleFocarAchado(ann.id)}
                      className={`p-1.5 rounded-lg border text-[11px] cursor-pointer flex items-center justify-between transition-colors ${
                        selectedAnnotationId === ann.id
                          ? ann.type === 'inflamacao'
                            ? 'bg-fuchsia-100 dark:bg-fuchsia-950/80 border-fuchsia-400 text-fuchsia-950 dark:text-fuchsia-200 font-bold'
                            : 'bg-rose-100 dark:bg-rose-950/80 border-rose-400 text-rose-950 dark:text-rose-200 font-bold'
                          : 'bg-stone-50 dark:bg-slate-950 border-stone-200 dark:border-slate-800 text-stone-700 dark:text-slate-300 hover:bg-stone-100'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 truncate">
                        <span className={`w-2 h-2 rounded-full shrink-0 ${ann.type === 'inflamacao' ? 'bg-[#C026D3]' : 'bg-[#DC2626]'}`} />
                        <span className="truncate">
                          #{idx + 1} {ann.sign_slug || (ann.type === 'inflamacao' ? 'Inflamação perifolicular' : 'Achado')}
                        </span>
                      </div>
                      <span className="text-[10px] text-stone-400 font-mono shrink-0 ml-1">
                        {ann.intensity || 'Mod.'}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[11px] text-stone-400 italic">Nenhum achado ou foco de inflamação registrado ainda.</p>
              )}
            </div>
          </div>
        </div>

        {/* HIPÓTESE CLÍNICA E ANOTAÇÕES */}
        <div className="lg:col-span-2 space-y-5">
          {/* ANOTAÇÕES CLÍNICAS E HIPÓTESE */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-stone-200/90 dark:border-slate-800 space-y-3 shadow-xs">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-stone-900 dark:text-slate-100 uppercase tracking-wider flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-rose-600" />
                <span>Hipótese & Anotações da Sessão</span>
              </h3>
              <span className="text-[10px] text-stone-400 font-mono">
                {notes.length}/1000
              </span>
            </div>

            <textarea
              rows={4}
              value={notes}
              onChange={(e) => setNotes(e.target.value.slice(0, 1000))}
              placeholder="Descreva a hipótese tricoscópica, achados tricoscópicos observados, conduta e programação de sessão..."
              className="w-full bg-stone-50 dark:bg-slate-950 border border-stone-200 dark:border-slate-700 rounded-2xl p-3 text-xs text-stone-900 dark:text-slate-100 focus:outline-none focus:border-rose-400 transition-colors resize-none leading-relaxed"
            />
          </div>

          {/* LIBERAÇÃO PARA O PORTAL DO PACIENTE (ÁREA DO CLIENTE) */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-stone-200/90 dark:border-slate-800 space-y-3 shadow-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <h3 className="text-xs font-bold text-stone-900 dark:text-slate-100 uppercase tracking-wider">
                  Área do Cliente (Portal do Paciente)
                </h3>
              </div>
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                liberadoPaciente 
                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' 
                  : 'bg-stone-100 text-stone-600 dark:bg-slate-800 dark:text-slate-400'
              }`}>
                {liberadoPaciente ? '✓ Liberado no Portal' : '🔒 Privado da Profissional'}
              </span>
            </div>

            <label className="flex items-start gap-3 p-3.5 rounded-2xl bg-stone-50 dark:bg-slate-950 border border-stone-200/70 dark:border-slate-800 cursor-pointer hover:border-stone-300 dark:hover:border-slate-700 transition-colors">
              <input
                type="checkbox"
                checked={liberadoPaciente}
                onChange={(e) => setLiberadoPaciente(e.target.checked)}
                className="mt-0.5 w-4 h-4 text-emerald-600 rounded-sm border-stone-300 focus:ring-emerald-500 cursor-pointer"
              />
              <div className="space-y-0.5">
                <span className="text-xs font-semibold text-stone-800 dark:text-slate-200 flex items-center gap-1.5">
                  <span>Liberar esta captura e fotos para a visualização do paciente</span>
                </span>
                <p className="text-[11px] text-stone-500 dark:text-slate-400 leading-snug">
                  Quando ativo, o paciente poderá visualizar a foto e os nomes dos achados tricoscópicos em sua área do cliente. Hipóteses e condutas confidenciais nunca são exibidas ao paciente.
                </p>
              </div>
            </label>
          </div>

          {/* BARRA DE AÇÃO PRINCIPAL: SALVAR SESSÃO & DIAGNÓSTICO FIRESTORE */}
          <div className="bg-gradient-to-r from-stone-100/90 via-rose-50/50 to-stone-100/90 dark:from-slate-900 dark:via-rose-950/20 dark:to-slate-900 rounded-3xl p-4 sm:p-5 border border-stone-200/90 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="space-y-1 w-full sm:w-auto">
              <div className="flex items-center gap-2">
                <Save className="w-4 h-4 text-rose-600" />
                <h4 className="text-xs font-bold text-stone-900 dark:text-slate-100 uppercase tracking-wider">
                  Salvar Exame de Tricoscopia
                </h4>
                {salvoComSucessoRecente ? (
                  <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Salvo no Prontuário
                  </span>
                ) : alteracoesNaoSalvas ? (
                  <span className="text-[10px] font-medium text-amber-600 dark:text-amber-400">
                    • Alterações pendentes
                  </span>
                ) : null}
              </div>
              <p className="text-xs text-stone-500 dark:text-slate-400 leading-snug">
                Salva a contagem detalhada, fotos e marcações no prontuário do paciente (Atalho: <kbd className="px-1.5 py-0.5 rounded bg-stone-200 dark:bg-slate-800 font-mono text-[10px]">Ctrl+S</kbd>).
              </p>
            </div>

            <div className="flex items-center gap-2.5 w-full sm:w-auto shrink-0 flex-wrap sm:flex-nowrap">
              <button
                type="button"
                onClick={handleSalvarSessao}
                disabled={salvando || (!imagemUsuarioUrl && !fotoReferenciaFinal)}
                className={`px-6 py-2.5 rounded-2xl text-xs font-bold flex items-center justify-center gap-2 flex-1 sm:flex-none shadow-md transition-all active:scale-[0.98] ${
                  salvoComSucessoRecente
                    ? 'bg-emerald-700 hover:bg-emerald-800 text-white shadow-emerald-700/20'
                    : alteracoesNaoSalvas
                    ? 'bg-rose-700 hover:bg-rose-800 text-white shadow-rose-700/25 ring-2 ring-rose-400 animate-pulse'
                    : 'bg-rose-700 hover:bg-rose-800 text-white shadow-rose-700/20'
                } disabled:opacity-50 disabled:pointer-events-none`}
              >
                {salvando ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Salvando...</span>
                  </>
                ) : salvoComSucessoRecente ? (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Sessão Salva!</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Salvar Sessão</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* SEÇÃO AO FINAL DA PÁGINA: REFERÊNCIA DO ATLAS & GUIA DE CONFERÊNCIA VISUAL */}
      <div id="secao-referencia-atlas" className="pt-2 pb-16">
        {!exibirReferenciaAtlas ? (
          /* CARD DE BUSCAR REFERÊNCIAS (QUANDO NÃO SELECIONADA, NÃO APARECE O CONTEÚDO) */
          <div className="bg-gradient-to-r from-stone-50 via-rose-50/20 to-stone-50 dark:from-slate-900 dark:via-rose-950/20 dark:to-slate-900 rounded-3xl p-5 sm:p-6 border border-stone-200/90 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-700 dark:text-rose-400 flex items-center justify-center shrink-0 border border-rose-500/20 shadow-xs">
                <BookOpen className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-stone-900 dark:text-slate-100 uppercase tracking-wider flex items-center gap-2">
                  <span>Referência do Atlas & Guia de Conferência Visual</span>
                </h4>
                <p className="text-xs text-stone-500 dark:text-slate-400 mt-0.5">
                  Deseja consultar casos clínicos do Atlas com fotos em alta resolução e conferir os critérios diagnósticos?
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setExibirReferenciaAtlas(true);
                setTimeout(() => {
                  document.getElementById('secao-referencia-atlas')?.scrollIntoView({ behavior: 'smooth' });
                }, 100);
              }}
              className="px-5 py-2.5 rounded-2xl bg-rose-700 hover:bg-rose-800 text-white text-xs font-bold flex items-center gap-2 shadow-md shadow-rose-700/20 transition-all hover:scale-[1.01] shrink-0"
            >
              <Search className="w-4 h-4" />
              <span>Buscar Referências</span>
            </button>
          </div>
        ) : (
          /* SELETOR COM INFORMAÇÕES DO ATLAS + GUIA DE CONFERÊNCIA VISUAL */
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-6 border border-rose-200/80 dark:border-rose-950/60 shadow-md space-y-5 animate-fadeIn">
            {/* Topo: Título, Filtro/Busca e Botão Fechar/Ocultar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-100 dark:border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-stone-900 dark:text-slate-100 flex items-center gap-2">
                    <span>Referência do Atlas & Guia de Conferência Visual</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-rose-50 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                      {casoReferencia.categoria}
                    </span>
                  </h3>
                  <p className="text-xs text-stone-500 dark:text-slate-400">
                    Estudo comparativo e critérios diagnósticos da patologia selecionada.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => onSelecionarCaso(casoReferencia.id)}
                  className="px-3 py-1.5 rounded-xl border border-stone-200 dark:border-slate-700 hover:bg-stone-50 dark:hover:bg-slate-800 text-stone-700 dark:text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                  title="Abrir ficha completa desta patologia no Atlas"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-rose-600" />
                  <span>Ficha Completa no Atlas</span>
                </button>

                <button
                  type="button"
                  onClick={() => setExibirReferenciaAtlas(false)}
                  className="px-3 py-1.5 rounded-xl bg-stone-100 hover:bg-stone-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-stone-600 dark:text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                  title="Ocultar Referência do Atlas"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Ocultar Referência</span>
                </button>
              </div>
            </div>

            {/* BARRA DO SELETOR: Busca rápida + Dropdown de seleção */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-2xl bg-stone-50/70 dark:bg-slate-950/60 border border-stone-200/80 dark:border-slate-800">
              {/* Campo de Busca Rápida de Patologia */}
              <div className="relative">
                <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={termoBuscaReferencia}
                  onChange={(e) => setTermoBuscaReferencia(e.target.value)}
                  placeholder="Filtrar patologia por nome ou achado..."
                  className="w-full bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-stone-900 dark:text-slate-100 focus:outline-none focus:border-rose-400"
                />
              </div>

              {/* Seletor Dropdown */}
              <div>
                <select
                  value={casoReferenciaId}
                  onChange={(e) => setCasoReferenciaId(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-stone-900 dark:text-slate-100 font-medium focus:outline-none focus:border-rose-400"
                >
                  {casosReferenciaFiltrados.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.numeroOrdem ? `#${c.numeroOrdem.toString().padStart(2, '0')} - ` : ''}{c.nome} ({c.categoria})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* CONTEÚDO PRINCIPAL: INFORMAÇÕES DO ATLAS + GUIA DE CONFERÊNCIA VISUAL */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
              
              {/* LADO ESQUERDO: INFORMAÇÕES DO ATLAS & FOTO HD */}
              <div className="space-y-3 bg-stone-50/50 dark:bg-slate-950/40 p-4 rounded-2xl border border-stone-200/70 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-stone-800 dark:text-slate-200 uppercase tracking-wider">
                    {casoReferencia.nome}
                  </span>
                  <span className="text-[11px] font-mono text-stone-500">
                    {refTotal > 1 ? `Foto ${refIndice + 1} de ${refTotal}` : (casoReferencia.imagem.aumento || '50x')}
                  </span>
                </div>

                {/* Imagem de Referência do Atlas */}
                <div className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden bg-black border border-stone-200 dark:border-slate-800 shadow-inner flex items-center justify-center group">
                  {fotoReferenciaFinal ? (
                    <img
                      src={fotoReferenciaFinal}
                      alt={casoReferencia.nome}
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center p-6 text-center text-stone-400 space-y-2">
                      <Camera className="w-8 h-8 text-stone-600" />
                      <p className="text-xs font-semibold">{casoReferencia.nome}</p>
                      <p className="text-[11px] text-stone-500">Foto de referência do Atlas</p>
                    </div>
                  )}

                  {/* Controles de navegação se houver mais de uma foto na referência */}
                  {refTotal > 1 && (
                    <>
                      <button
                        type="button"
                        onClick={() => setRefIndice(refIndice > 0 ? refIndice - 1 : refTotal - 1)}
                        className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/75 hover:bg-black/90 text-white flex items-center justify-center transition-all opacity-80 hover:opacity-100 shadow-md text-sm"
                        title="Foto anterior"
                      >
                        ‹
                      </button>
                      <button
                        type="button"
                        onClick={() => setRefIndice(refIndice < refTotal - 1 ? refIndice + 1 : 0)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/75 hover:bg-black/90 text-white flex items-center justify-center transition-all opacity-80 hover:opacity-100 shadow-md text-sm"
                        title="Próxima foto"
                      >
                        ›
                      </button>
                    </>
                  )}

                  <div className="absolute bottom-2.5 left-2.5 right-2.5 flex items-center justify-between text-[10px] font-mono text-stone-300 bg-black/75 backdrop-blur-xs px-2.5 py-1 rounded-lg">
                    <span className="truncate max-w-[200px]">{casoReferencia.nome}</span>
                    <span>{casoReferencia.imagem.aumento || '50x'}</span>
                  </div>
                </div>

                {/* Resumo Clínico */}
                <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-stone-200/80 dark:border-slate-800 text-xs space-y-1.5">
                  <span className="text-[10px] uppercase font-bold text-stone-500 tracking-wider block">
                    Resumo Clínico & Características:
                  </span>
                  <p className={`text-stone-600 dark:text-slate-300 leading-relaxed ${expandirDescricao ? '' : 'line-clamp-4'}`}>
                    {casoReferencia.resumoOriginal || casoReferencia.significadoClinico}
                  </p>
                  <button
                    type="button"
                    onClick={() => setExpandirDescricao(!expandirDescricao)}
                    className="text-[11px] text-rose-700 dark:text-rose-400 font-semibold hover:underline"
                  >
                    {expandirDescricao ? 'Ver menos' : 'Ver mais detalhes'}
                  </button>
                </div>
              </div>

              {/* LADO DIREITO: GUIA DE CONFERÊNCIA VISUAL */}
              <div className="space-y-3.5 bg-stone-50/50 dark:bg-slate-950/40 p-4 rounded-2xl border border-stone-200/70 dark:border-slate-800">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-200/60 dark:border-slate-800 pb-2.5">
                  <div className="flex items-center gap-2">
                    <Eye className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                    <h3 className="text-xs font-bold text-stone-900 dark:text-slate-100 uppercase tracking-wider">
                      Guia de Conferência Visual ({casoReferencia.nome})
                    </h3>
                  </div>

                  <div className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-700 text-stone-700 dark:text-slate-300 font-mono">
                    Sinais conferidos: {totalConferidos} de {totalAchadosReferencia}
                  </div>
                </div>

                <p className="text-xs text-stone-500 dark:text-slate-400">
                  Assinale os sinais tricoscópicos que você identificou na captura da cliente para apoiar o diagnóstico:
                </p>

                <div className="grid grid-cols-1 gap-2">
                  {casoReferencia.oQueObservar.map((item, idx) => {
                    const conferido = itensConferidos.includes(item);
                    return (
                      <div
                        key={idx}
                        onClick={() => {
                          setItensConferidos(prev => 
                            prev.includes(item) ? prev.filter(i => i !== item) : [...prev, item]
                          );
                        }}
                        className={`cursor-pointer p-3 rounded-xl border text-xs transition-all flex items-start gap-2.5 select-none ${
                          conferido
                            ? 'bg-emerald-50/90 dark:bg-emerald-950/50 border-emerald-300 dark:border-emerald-700 text-emerald-950 dark:text-emerald-100 font-medium shadow-xs'
                            : 'bg-white hover:bg-stone-50 dark:bg-slate-900 dark:hover:bg-slate-800 border-stone-200/80 dark:border-slate-800 text-stone-700 dark:text-slate-300'
                        }`}
                      >
                        <div className="mt-0.5 shrink-0">
                          <CheckCircle2 className={`w-4 h-4 ${conferido ? 'text-emerald-600 dark:text-emerald-400' : 'text-stone-300 dark:text-slate-600'}`} />
                        </div>
                        <span className="leading-snug">{item}</span>
                      </div>
                    );
                  })}
                </div>

                {totalConferidos > 0 && (
                  <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-xs text-emerald-900 dark:text-emerald-200 flex items-center justify-between">
                    <span>
                      ✓ {totalConferidos} {totalConferidos === 1 ? 'sinal compatível' : 'sinais compatíveis'} com <strong>{casoReferencia.nome}</strong>.
                    </span>
                    <button
                      type="button"
                      onClick={() => setItensConferidos([])}
                      className="text-[11px] underline hover:text-emerald-950"
                    >
                      Limpar seleção
                    </button>
                  </div>
                )}
              </div>

            </div>
          </div>
        )}
      </div>
    </div>
  )}

      {/* BOTÃO PRINCIPAL FIXO NO RODAPÉ: CONTEXTUAL PARA PASSO 3 E PASSO 4 */}
      <div className="fixed bottom-7 left-0 right-0 z-30 pointer-events-none flex justify-center px-4">
        <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-stone-300 dark:border-slate-700 rounded-2xl p-2 sm:px-5 shadow-2xl flex items-center justify-between gap-3 pointer-events-auto max-w-xl w-full">
          <div className="flex items-center gap-2 text-xs min-w-0">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
            <div className="min-w-0">
              <span className="font-semibold text-stone-800 dark:text-slate-200 truncate block">
                {clientName ? `Paciente: ${clientName}` : 'Nova Sessão'}
              </span>
              <span className="text-[10px] text-stone-400 block truncate">
                {modoBancada === 'registro' 
                  ? `Área: ${areaCouro} • ${tipoCaptura === 'macro' ? 'Foto Macro' : 'Tricoscopia'}` 
                  : `Área: ${areaCouro} • ${annotations.length} marcas`}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {imagemUsuarioUrl && (
              <>
                <button
                  type="button"
                  onClick={() => setModalRetornarCapturaInvalida(true)}
                  className="px-2.5 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-200 border border-amber-300 dark:border-amber-700/80 text-xs font-semibold flex items-center gap-1 transition-colors"
                  title="Captura inválida: retornar e capturar novamente"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                  <span className="hidden sm:inline">Inválida</span>
                </button>

                <button
                  type="button"
                  onClick={handleSalvarImagemDispositivo}
                  disabled={salvandoGaleria}
                  className="px-2.5 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700/80 text-xs font-semibold flex items-center gap-1 transition-colors"
                  title="Salvar foto na galeria do dispositivo"
                >
                  <Download className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span className="hidden sm:inline">Galeria</span>
                </button>
              </>
            )}

            <button
              onClick={() => handleSalvarSessao(false)}
              disabled={salvando || (!imagemUsuarioUrl && !fotoReferenciaFinal)}
              className={`px-4 py-2.5 rounded-xl text-white font-bold text-xs sm:text-sm flex items-center gap-2 transition-all shadow-md active:scale-95 ${
                salvoComSucessoRecente
                  ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-700/25 ring-2 ring-emerald-400'
                  : salvando
                    ? 'bg-rose-800 opacity-80 cursor-wait'
                    : !imagemUsuarioUrl
                      ? 'bg-rose-700/70 hover:bg-rose-700 cursor-pointer'
                      : 'bg-rose-700 hover:bg-rose-800 shadow-rose-700/25'
              } disabled:opacity-50 disabled:pointer-events-none`}
              title={
                !imagemUsuarioUrl
                  ? 'Insira ou capture uma foto para salvar'
                  : 'Salvar registro no banco de dados e vincular ao prontuário do paciente (Atalho: Ctrl+S)'
              }
            >
              {salvando ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Salvando no Banco...</span>
                </>
              ) : salvoComSucessoRecente ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-200" />
                  <span>Salvo com Sucesso! ✓</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>{modoBancada === 'registro' ? 'Salvar na Ficha' : 'Salvar Sessão'}</span>
                  {alteracoesNaoSalvas && (
                    <span className="w-2 h-2 rounded-full bg-amber-300 animate-pulse ml-0.5" title="Alterações pendentes de salvamento" />
                  )}
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* MODAL: DETALHES DO ACHADO OU INFLAMAÇÃO */}
      {modalAchadoAberto && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-2.5 sm:p-4 overflow-y-auto animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-800 rounded-3xl w-full max-w-md max-h-[90vh] flex flex-col shadow-2xl overflow-hidden my-auto">
            {/* Cabeçalho Fixo no Topo */}
            <div className="p-4 sm:p-5 border-b border-stone-100 dark:border-slate-800 flex items-center justify-between shrink-0 bg-stone-50/70 dark:bg-slate-950/70">
              <h3 className="text-sm sm:text-base font-bold text-stone-900 dark:text-slate-100 flex items-center gap-2">
                <span className={`w-3 h-3 rounded-full ${achadoEmEdicao?.type === 'inflamacao' ? 'bg-[#C026D3]' : 'bg-[#DC2626]'}`} />
                <span>{achadoEmEdicao?.type === 'inflamacao' ? 'Foco de Inflamação / Eritema' : 'Detalhes do Achado'}</span>
              </h3>
              <button
                onClick={() => setModalAchadoAberto(false)}
                className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 dark:hover:text-slate-200 active:scale-95"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Conteúdo Rolável no Mobile (nunca empurra o rodapé para fora da tela) */}
            <div className="p-4 sm:p-5 space-y-3.5 overflow-y-auto flex-1 text-xs">
              {/* Alternador de Classificação: Achado vs Inflamação */}
              <div className="flex items-center gap-1.5 p-1 rounded-xl bg-stone-100 dark:bg-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    if (achadoEmEdicao) {
                      setAchadoEmEdicao({ ...achadoEmEdicao, type: 'achado' });
                      setCategoriaAchadoFiltro('Todos');
                    }
                  }}
                  className={`flex-1 py-2 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all active:scale-95 ${
                    achadoEmEdicao?.type === 'achado'
                      ? 'bg-white dark:bg-slate-900 text-rose-700 dark:text-rose-300 shadow-xs'
                      : 'text-stone-500 hover:text-stone-800 dark:hover:text-slate-200'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-[#DC2626]" />
                  <span>Achado Geral</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (achadoEmEdicao) {
                      setAchadoEmEdicao({ ...achadoEmEdicao, type: 'inflamacao' });
                      setCategoriaAchadoFiltro('Inflamação & Eritema');
                      setAchadoSinal('Inflamação e Eritema Perifolicular (Halo Eritematoso / Colarete)');
                    }
                  }}
                  className={`flex-1 py-2 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all active:scale-95 ${
                    achadoEmEdicao?.type === 'inflamacao'
                      ? 'bg-white dark:bg-slate-900 text-fuchsia-700 dark:text-fuchsia-300 shadow-xs ring-1 ring-fuchsia-300 dark:ring-fuchsia-800'
                      : 'text-stone-500 hover:text-stone-800 dark:hover:text-slate-200'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-[#C026D3]" />
                  <span>🔥 Inflamação / Eritema</span>
                </button>
              </div>

              {/* Categorias para filtro rápido */}
              <div>
                <label className="text-[11px] font-semibold text-stone-500 dark:text-slate-400 uppercase tracking-wider block mb-1">
                  Filtrar Categoria:
                </label>
                <div className="flex flex-wrap gap-1">
                  {(['Todos', 'Inflamação & Eritema', 'Óstios Foliculares', 'Hastes', 'Superfície / Escamas', 'Vasos'] as const).map(cat => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => {
                        setCategoriaAchadoFiltro(cat);
                        const primeiroDestaCat = cat === 'Todos' 
                          ? ACHADOS_TRICOSCOPICOS[0]?.nome 
                          : ACHADOS_TRICOSCOPICOS.find(a => a.estrutura === cat)?.nome;
                        if (primeiroDestaCat) setAchadoSinal(primeiroDestaCat);
                      }}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all border active:scale-95 ${
                        categoriaAchadoFiltro === cat
                          ? cat === 'Inflamação & Eritema'
                            ? 'bg-fuchsia-100 dark:bg-fuchsia-950 text-fuchsia-800 dark:text-fuchsia-300 border-fuchsia-400 shadow-xs'
                            : 'bg-rose-50 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border-rose-400 shadow-xs'
                          : 'bg-stone-50 dark:bg-slate-950 text-stone-600 dark:text-slate-400 border-stone-200 dark:border-slate-800 hover:bg-stone-100'
                      }`}
                    >
                      {cat === 'Inflamação & Eritema' ? '🔥 Inflamação' : cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Sinal observado */}
              <div>
                <label className="text-[11px] font-semibold text-stone-500 dark:text-slate-400 uppercase tracking-wider block mb-1">
                  Sinal Observado:
                </label>
                <select
                  value={achadoSinal}
                  onChange={(e) => setAchadoSinal(e.target.value)}
                  className="w-full bg-stone-50 dark:bg-slate-950 border border-stone-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-stone-900 dark:text-slate-100 font-medium focus:outline-none focus:border-rose-400"
                >
                  {ACHADOS_TRICOSCOPICOS
                    .filter(ach => categoriaAchadoFiltro === 'Todos' || ach.estrutura === categoriaAchadoFiltro)
                    .map(ach => (
                      <option key={ach.id} value={ach.nome}>
                        {ach.nome} ({ach.estrutura})
                      </option>
                    ))}
                </select>
              </div>

              {/* Prévia do Significado Clínico do Sinal */}
              {(() => {
                const sinalObj = ACHADOS_TRICOSCOPICOS.find(a => a.nome === achadoSinal);
                if (!sinalObj) return null;
                return (
                  <div className="p-2.5 rounded-xl bg-stone-50 dark:bg-slate-950 border border-stone-200/80 dark:border-slate-800 text-[11px] space-y-1">
                    <p className="text-stone-700 dark:text-slate-300 leading-snug font-medium">
                      {sinalObj.descricao}
                    </p>
                    <p className="text-[10px] text-stone-500 dark:text-slate-400 italic">
                      {sinalObj.significadoClinico}
                    </p>
                  </div>
                );
              })()}

              {/* Intensidade */}
              <div>
                <label className="text-[11px] font-semibold text-stone-500 dark:text-slate-400 uppercase tracking-wider block mb-1">
                  Intensidade:
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['Leve', 'Moderada', 'Acentuada'] as const).map(nivel => (
                    <button
                      key={nivel}
                      type="button"
                      onClick={() => setAchadoIntensidade(nivel)}
                      className={`py-2 rounded-xl text-xs font-semibold border transition-all active:scale-95 ${
                        achadoIntensidade === nivel
                          ? achadoEmEdicao?.type === 'inflamacao'
                            ? 'bg-fuchsia-50 border-fuchsia-500 text-fuchsia-800 dark:bg-fuchsia-950 dark:border-fuchsia-600 dark:text-fuchsia-200 shadow-xs'
                            : 'bg-rose-50 border-rose-500 text-rose-700 dark:bg-rose-950 dark:border-rose-600 dark:text-rose-200 shadow-xs'
                          : 'bg-stone-50 dark:bg-slate-950 border-stone-200 dark:border-slate-700 text-stone-600 dark:text-slate-400'
                      }`}
                    >
                      {nivel}
                    </button>
                  ))}
                </div>
              </div>

              {/* Observação livre */}
              <div>
                <label className="text-[11px] font-semibold text-stone-500 dark:text-slate-400 uppercase tracking-wider block mb-1">
                  Observação (opcional):
                </label>
                <textarea
                  rows={2}
                  value={achadoObservacao}
                  onChange={(e) => setAchadoObservacao(e.target.value)}
                  placeholder="Ex: Localizado próximo ao óstio folicular no vértex..."
                  className="w-full bg-stone-50 dark:bg-slate-950 border border-stone-200 dark:border-slate-700 rounded-xl p-2.5 text-xs text-stone-900 dark:text-slate-100 focus:outline-none focus:border-rose-400 resize-none"
                />
              </div>
            </div>

            {/* Rodapé Fixo com Botões de Ação Sempre Visíveis */}
            <div className="p-3.5 sm:p-4 border-t border-stone-100 dark:border-slate-800 bg-stone-50/80 dark:bg-slate-950/80 flex items-center justify-between shrink-0">
              <button
                type="button"
                onClick={handleRemoverAchadoModal}
                className="px-3 py-2 rounded-xl text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950 text-xs font-semibold flex items-center gap-1 active:scale-95 transition-all"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Remover</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setModalAchadoAberto(false)}
                  className="px-3.5 py-2 rounded-xl bg-stone-200/70 hover:bg-stone-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-stone-700 dark:text-slate-300 text-xs font-semibold active:scale-95 transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSalvarDetalhesAchado}
                  className="px-5 py-2 rounded-xl bg-rose-700 hover:bg-rose-800 active:scale-95 text-white text-xs font-bold shadow-xs transition-transform"
                >
                  Salvar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: HISTÓRICO DE SESSÕES */}
      {historicoAberto && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-2.5 sm:p-4 overflow-y-auto animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-800 rounded-3xl w-full max-w-2xl max-h-[88vh] flex flex-col shadow-2xl overflow-hidden my-auto">
            <div className="p-5 border-b border-stone-200 dark:border-slate-800 flex items-center justify-between bg-stone-50 dark:bg-slate-950">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-rose-50 dark:bg-rose-950 flex items-center justify-center text-rose-700 dark:text-rose-300">
                  <History className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-stone-900 dark:text-slate-100">
                    Histórico de Sessões de Tricoscopia
                  </h3>
                  <p className="text-xs text-stone-500 dark:text-slate-400">
                    Sessões salvas com marcações e contagem folicular.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setHistoricoAberto(false)}
                className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 border-b border-stone-200 dark:border-slate-800">
              <div className="relative">
                <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Buscar por cliente ou data..."
                  value={buscaHistorico}
                  onChange={(e) => setBuscaHistorico(e.target.value)}
                  className="w-full bg-stone-50 dark:bg-slate-950 border border-stone-200 dark:border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-stone-900 dark:text-slate-100 focus:outline-none focus:border-rose-400"
                />
              </div>
            </div>

            <div className="p-4 overflow-y-auto flex-1 space-y-2.5">
              {sessoesFiltradas.length === 0 ? (
                <div className="text-center py-10 text-stone-400 text-xs">
                  Nenhuma sessão encontrada. Salve uma sessão para vê-la aqui.
                </div>
              ) : (
                sessoesFiltradas.map(sess => (
                  <div
                    key={sess.id}
                    onClick={() => handleCarregarSessao(sess)}
                    className="p-3 rounded-2xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-rose-300 dark:hover:border-rose-800 flex items-center justify-between gap-3 cursor-pointer transition-all shadow-xs group"
                  >
                    <div className="flex items-center gap-3">
                      {sess.image_url ? (
                        <img
                          src={sess.image_url}
                          alt={sess.client_name}
                          className="w-14 h-14 rounded-xl object-cover bg-stone-900 border border-stone-200 dark:border-slate-700 shrink-0"
                        />
                      ) : (
                        <div className="w-14 h-14 rounded-xl bg-stone-900 border border-stone-200 dark:border-slate-700 flex items-center justify-center text-stone-500 shrink-0">
                          <Camera className="w-6 h-6" />
                        </div>
                      )}
                      <div>
                        <p className="text-xs font-bold text-stone-900 dark:text-slate-100 group-hover:text-rose-700 dark:group-hover:text-rose-400 transition-colors">
                          {sess.client_name}
                        </p>
                        <p className="text-[11px] text-stone-500 dark:text-slate-400">
                          Data: {sess.session_date} • Área: {sess.area}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={async (e) => {
                          e.stopPropagation();
                          const novo = !sess.liberadoPaciente;
                          await alternarLiberacaoCaptura(sess.id, novo);
                          sess.liberadoPaciente = novo;
                          setSessoesSalvas([...sessoesSalvas]);
                          if (sessionId === sess.id) {
                            setLiberadoPaciente(novo);
                          }
                        }}
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 border transition-colors ${
                          sess.liberadoPaciente
                            ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700/80 hover:bg-emerald-100'
                            : 'bg-stone-100 dark:bg-slate-800 text-stone-600 dark:text-slate-400 border-stone-200 dark:border-slate-700 hover:bg-stone-200'
                        }`}
                        title={sess.liberadoPaciente ? 'Liberado no Portal do Paciente' : 'Oculto do paciente'}
                      >
                        {sess.liberadoPaciente ? (
                          <>
                            <Eye className="w-3.5 h-3.5 text-emerald-600" />
                            <span className="hidden sm:inline">Liberado</span>
                          </>
                        ) : (
                          <>
                            <EyeOff className="w-3.5 h-3.5 text-stone-400" />
                            <span className="hidden sm:inline">Oculto</span>
                          </>
                        )}
                      </button>

                      <button
                        onClick={(e) => handleExcluirSessao(sess.id, e)}
                        className="p-2 text-stone-300 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg transition-colors"
                        title="Excluir"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL: EMISSÃO E IMPRESSÃO DE LAUDO */}
      {modalLaudoAberto && imagemUsuarioUrl && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-2.5 sm:p-4 overflow-y-auto animate-fadeIn">
          <div className="bg-white text-stone-900 border border-stone-200 rounded-3xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden my-auto print:p-0 print:border-none print:shadow-none">
            <div className="p-5 border-b border-stone-200 flex items-center justify-between bg-stone-50 print:hidden">
              <h3 className="text-base font-bold text-stone-900 flex items-center gap-2">
                <FileText className="w-5 h-5 text-rose-700" />
                <span>Laudo de Fototricoscopia Digital</span>
              </h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-3 py-1.5 rounded-xl bg-rose-700 hover:bg-rose-800 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Imprimir / PDF</span>
                </button>
                <button
                  onClick={() => setModalLaudoAberto(false)}
                  className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Conteúdo Impresso */}
            <div className="p-6 sm:p-8 overflow-y-auto space-y-6 text-xs leading-relaxed">
              <div className="border-b pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold text-stone-900">Relatório de Fototricoscopia e Contagem Folicular</h2>
                  <p className="text-stone-600 font-medium">
                    {usuarioAtual?.clinica ? `${usuarioAtual.clinica} • ` : ''}TricoCalazans
                  </p>
                </div>
                <div className="sm:text-right text-[11px] text-stone-500 space-y-0.5">
                  {usuarioAtual && (
                    <p className="font-semibold text-stone-800">
                      Profissional: {usuarioAtual.nome} {usuarioAtual.registro ? `(${usuarioAtual.registro})` : ''}
                    </p>
                  )}
                  <p>Data do Exame: {sessionDate}</p>
                  <p>Área: {areaCouro}</p>
                </div>
              </div>

              {/* Dados da Cliente */}
              <div className="bg-stone-50 p-3.5 rounded-xl border border-stone-200 flex items-center justify-between">
                <div>
                  <span className="font-semibold text-stone-500 uppercase tracking-wider block text-[10px]">Cliente / Ficha:</span>
                  <span className="text-sm font-bold text-stone-900">{clientName || 'Não informada'}</span>
                </div>
                <div>
                  <span className="font-semibold text-stone-500 uppercase tracking-wider block text-[10px]">Referência Comparada:</span>
                  <span className="text-sm font-bold text-rose-800">{casoReferencia.nome}</span>
                </div>
              </div>

              {/* Comparativo de Imagens */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <span className="font-semibold text-stone-600 block text-[11px]">Captura da Cliente ({areaCouro})</span>
                  <div className="w-full aspect-[4/3] rounded-xl overflow-hidden bg-black border border-stone-300 relative flex items-center justify-center">
                    {imagemUsuarioUrl ? (
                      <img src={imagemUsuarioUrl} alt="Cliente" className="w-full h-full object-contain" />
                    ) : (
                      <span className="text-xs text-stone-400">Sem captura</span>
                    )}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <span className="font-semibold text-stone-600 block text-[11px]">Referência do Atlas ({casoReferencia.nome})</span>
                  <div className="w-full aspect-[4/3] rounded-xl overflow-hidden bg-black border border-stone-300 flex items-center justify-center">
                    {fotoReferenciaFinal ? (
                      <img 
                        src={fotoReferenciaFinal} 
                        alt="Atlas" 
                        className="w-full h-full object-contain" 
                      />
                    ) : (
                      <span className="text-xs text-stone-400">Sem referência</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Contagem Folicular no Laudo */}
              <div className="bg-stone-50 p-3.5 rounded-xl border border-stone-200 space-y-2">
                <h4 className="font-bold text-stone-900 uppercase tracking-wider text-[11px]">
                  Contagem Manual de Unidades Foliculares
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  <div>Unitárias: <span className="font-bold">{summary.unitarias}</span></div>
                  <div>Duplas: <span className="font-bold">{summary.duplas}</span></div>
                  <div>Triplas: <span className="font-bold">{summary.triplas}</span></div>
                  <div>Óstios Vazios: <span className="font-bold">{summary.ostiosVazios}</span></div>
                  <div>Total UF: <span className="font-bold">{summary.totalUnidadesFoliculares}</span></div>
                  <div>Total Fios: <span className="font-bold">{summary.totalFios}</span></div>
                  <div>Média fios/UF: <span className="font-bold">{summary.mediaFiosPorUF}</span></div>
                  <div>% Unitárias: <span className="font-bold">{summary.pctUnitarias}</span></div>
                  {summary.inflamacaoCount > 0 && (
                    <div className="text-fuchsia-700 font-semibold col-span-2">Focos de Inflamação: <span className="font-bold">{summary.inflamacaoCount}</span></div>
                  )}
                </div>
              </div>

              {/* Achados Identificados */}
              {achadosMarcados.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-bold text-stone-900 uppercase tracking-wider text-[11px]">
                    Achados Tricoscópicos & Sinais Inflamatórios ({achadosMarcados.length})
                  </h4>
                  <ul className="list-disc list-inside space-y-1 text-stone-700 pl-1">
                    {achadosMarcados.map((item, i) => (
                      <li key={i}>
                        {item.type === 'inflamacao' && <span className="font-mono text-fuchsia-700 font-bold mr-1">[Inflamação]</span>}
                        <span className="font-semibold">{item.sign_slug || (item.type === 'inflamacao' ? 'Inflamação perifolicular' : 'Achado')}</span> ({item.intensity || 'Mod.'})
                        {item.note && <span className="italic"> — {item.note}</span>}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Anotações Clínicas */}
              {notes && (
                <div className="space-y-2 border-t pt-4">
                  <h4 className="font-bold text-stone-900 uppercase tracking-wider text-[11px]">
                    Hipótese e Anotações da Sessão
                  </h4>
                  <p className="text-stone-700 whitespace-pre-line bg-stone-50 p-3 rounded-xl border border-stone-200">
                    {notes}
                  </p>
                </div>
              )}

              {/* Assinatura */}
              <div className="pt-8 border-t flex justify-end">
                <div className="text-center w-72 border-t border-stone-400 pt-2 text-[11px] text-stone-600">
                  <p className="font-bold text-stone-900">{usuarioAtual?.nome || 'Responsável Técnico / Especialista'}</p>
                  {usuarioAtual?.titulo && <p className="text-[10px] text-stone-500">{usuarioAtual.titulo}</p>}
                  {usuarioAtual?.registro && <p className="text-[10px] text-stone-500">{usuarioAtual.registro}</p>}
                  {usuarioAtual?.clinica && <p className="text-[10px] text-stone-400">{usuarioAtual.clinica}</p>}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Modal de Tour Guiado da Bancada */}
      <TourBancadaModal isOpen={tourAberto} onClose={handleFecharTour} />

      {/* Modal de Câmera ao Vivo do Tricoscópio (USB / Wi-Fi) */}
      <TricoscopioLiveModal
        isOpen={modalCameraAoVivo}
        onClose={() => setModalCameraAoVivo(false)}
        onCapturarImagem={handleCapturaAoVivo}
      />

      {/* MODAL: RETORNAR CASO A CAPTURA FEITA NÃO SEJA VÁLIDA NA BANCADA */}
      {modalRetornarCapturaInvalida && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-800 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden my-auto p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
                <AlertCircle className="w-5 h-5" />
                <h3 className="text-base font-bold text-stone-900 dark:text-slate-100">
                  Captura Não Válida? Retornar e Refazer
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setModalRetornarCapturaInvalida(false)}
                className="p-1 rounded-lg text-stone-400 hover:text-stone-700 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-stone-600 dark:text-slate-300 leading-relaxed">
              Se a imagem capturada ficou <strong>fora de foco</strong>, <strong>borrada</strong>, com <strong>reflexo de luz</strong> ou em uma área incorreta, descarte-a para retornar e capturar novamente. As marcações manuais não salvas serão canceladas.
            </p>

            {/* Opções de Retorno */}
            <div className="space-y-2.5 pt-1">
              <button
                type="button"
                onClick={() => handleDescartarERefazer('camera')}
                className="w-full p-3.5 rounded-2xl bg-gradient-to-r from-rose-700 to-rose-800 hover:from-rose-800 hover:to-rose-900 text-white font-semibold text-xs flex items-center justify-between gap-3 shadow-md transition-all active:scale-[0.99]"
              >
                <div className="flex items-center gap-2.5 text-left">
                  <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center text-white shrink-0">
                    <Video className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-bold text-sm">Abrir Tricoscópio ao Vivo</p>
                    <p className="text-[11px] text-rose-100/90 font-normal">Reconectar câmera e capturar nova imagem com foco nítido</p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 shrink-0" />
              </button>

              <button
                type="button"
                onClick={() => handleDescartarERefazer('upload')}
                className="w-full p-3.5 rounded-2xl bg-stone-100 dark:bg-slate-800 hover:bg-stone-200 dark:hover:bg-slate-700 text-stone-800 dark:text-slate-200 font-semibold text-xs flex items-center justify-between gap-3 border border-stone-200 dark:border-slate-700 transition-all"
              >
                <div className="flex items-center gap-2.5 text-left">
                  <div className="w-8 h-8 rounded-xl bg-stone-200 dark:bg-slate-700 flex items-center justify-center text-stone-600 dark:text-slate-300 shrink-0">
                    <Upload className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-bold text-sm">Carregar Outro Arquivo</p>
                    <p className="text-[11px] text-stone-500 dark:text-slate-400 font-normal">Substituir por outra foto já salva no computador ou dispositivo</p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 shrink-0" />
              </button>

              {onNavegarParaPacientes && (
                <button
                  type="button"
                  onClick={() => handleDescartarERefazer('prontuario')}
                  className="w-full p-3.5 rounded-2xl bg-stone-50 dark:bg-slate-950 hover:bg-stone-100 dark:hover:bg-slate-800 text-stone-700 dark:text-slate-300 font-semibold text-xs flex items-center justify-between gap-3 border border-stone-200/80 dark:border-slate-800 transition-all"
                >
                  <div className="flex items-center gap-2.5 text-left">
                    <div className="w-8 h-8 rounded-xl bg-stone-200/80 dark:bg-slate-800 flex items-center justify-center text-stone-500 dark:text-slate-400 shrink-0">
                      <User className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="font-bold text-sm">Voltar ao Prontuário do Paciente</p>
                      <p className="text-[11px] text-stone-500 dark:text-slate-400 font-normal">Retornar à ficha do paciente sem gravar esta captura</p>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 shrink-0" />
                </button>
              )}
            </div>

            <div className="pt-2 border-t border-stone-100 dark:border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={() => setModalRetornarCapturaInvalida(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-stone-600 dark:text-slate-400 hover:bg-stone-100 dark:hover:bg-slate-800 transition-colors"
              >
                Cancelar e Manter Captura Atual
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
