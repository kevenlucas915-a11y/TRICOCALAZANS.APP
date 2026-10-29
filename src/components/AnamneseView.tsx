import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  FileText, 
  Plus, 
  Copy, 
  Trash2, 
  Edit3, 
  CheckCircle2, 
  Users, 
  Search, 
  ArrowLeft, 
  Save, 
  Eye, 
  Printer, 
  Clock, 
  Sparkles, 
  ChevronDown, 
  ChevronUp, 
  HelpCircle, 
  Sliders, 
  CheckSquare, 
  CircleDot, 
  AlignLeft, 
  Type, 
  ToggleLeft, 
  Calendar, 
  UserPlus, 
  X,
  Share2,
  FolderOpen,
  Send,
  Layers,
  Award,
  Download,
  Lock,
  Camera,
  Image as ImageIcon,
  FileCheck
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { 
  ModeloAnamnese, 
  PerguntaAnamnese, 
  TipoPerguntaAnamnese, 
  RespostaAnamnese, 
  RespostaItemAnamnese,
  SessaoEvolucaoFicha,
  FichaAvaliacaoCapilarData
} from '../types/anamnese';
import { 
  listModelosAnamnese, 
  saveModeloAnamnese, 
  deleteModeloAnamnese, 
  duplicarModeloAnamnese, 
  listTodasRespostas, 
  saveRespostaAnamnese, 
  deleteRespostaAnamnese,
  salvarSessaoNaRespostaAnamnese
} from '../services/anamneseService';
import { Paciente } from '../types/paciente';
import { listPacientes, savePaciente } from '../services/pacientes';
import { FichaAvaliacaoCapilarWizard } from './FichaAvaliacaoCapilarWizard';
import { MODELO_FICHA_AVALIACAO_CAPILAR_ID } from '../data/anamneseTemplates';
import { baixarPdfFicha, compartilharPdfFicha } from '../services/fichaPdfGenerator';
import { 
  baixarPdfRespostaAnamnese, 
  compartilharPdfRespostaAnamnese,
  baixarPdfTodasRespostas,
  compartilharPdfTodasRespostas
} from '../services/anamnesePdfGenerator';

interface AnamneseViewProps {
  pacientePreSelecionado?: Paciente | null;
  onVoltarParaPainel?: () => void;
  onSelecionarPaciente?: (paciente: Paciente) => void;
  onNavegarParaPlanos?: () => void;
  onAvancarParaTricoscopia?: (paciente: Paciente) => void;
  onEncaminharParaRelatorioPaciente?: (paciente: Paciente) => void;
}

type AbaAtiva = 'modelos' | 'construtor' | 'preencher' | 'respostas';

export const AnamneseView: React.FC<AnamneseViewProps> = ({
  pacientePreSelecionado,
  onVoltarParaPainel,
  onSelecionarPaciente,
  onNavegarParaPlanos,
  onAvancarParaTricoscopia,
  onEncaminharParaRelatorioPaciente
}) => {
  const { usuarioAtual } = useAuth();

  // Estados principais de navegação
  const [abaAtiva, setAbaAtiva] = useState<AbaAtiva>(pacientePreSelecionado ? 'preencher' : 'modelos');
  const [modelos, setModelos] = useState<ModeloAnamnese[]>([]);
  const [respostas, setRespostas] = useState<RespostaAnamnese[]>([]);
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [carregando, setCarregando] = useState(true);

  // Filtros
  const [buscaModelo, setBuscaModelo] = useState('');
  const [filtroCategoria, setFiltroCategoria] = useState('Todas');
  const [buscaResposta, setBuscaResposta] = useState('');

  // Estados do Construtor estilo Google Forms
  const [modeloEmEdicao, setModeloEmEdicao] = useState<ModeloAnamnese | null>(null);
  const [perguntaAtivaId, setPerguntaAtivaId] = useState<string | null>(null);

  // Estados do Preenchimento de Anamnese
  const [modeloSelecionadoParaPreencher, setModeloSelecionadoParaPreencher] = useState<ModeloAnamnese | null>(null);
  const [pacienteSelecionado, setPacienteSelecionado] = useState<Paciente | null>(pacientePreSelecionado || null);
  const [respostasPreenchimento, setRespostasPreenchimento] = useState<Record<string, any>>({});
  const [anotacaoEspecialista, setAnotacaoEspecialista] = useState('');
  const [salvandoResposta, setSalvandoResposta] = useState(false);

  // Estados para o Questionário Dinâmico da Ficha de Avaliação Capilar
  const [fichaWizardAberta, setFichaWizardAberta] = useState(false);
  const [fichaParaEditar, setFichaParaEditar] = useState<RespostaAnamnese | null>(null);

  // Modal para Registro de Nova Sessão na Ficha Salva
  const [modalNovaSessaoAberto, setModalNovaSessaoAberto] = useState(false);
  const [sessaoTratamento, setSessaoTratamento] = useState('');
  const [sessaoData, setSessaoData] = useState(() => new Date().toISOString().split('T')[0]);
  const [sessaoAssinatura, setSessaoAssinatura] = useState<string | undefined>(undefined);
  const [salvandoNovaSessao, setSalvandoNovaSessao] = useState(false);
  const canvasSessaoRef = useRef<HTMLCanvasElement | null>(null);
  const isDesenhandoSessaoRef = useRef(false);

  // Alerta de Limite do Plano Starter
  const [modalLimitePlano, setModalLimitePlano] = useState(false);

  // Logo em PNG para inclusão no cabeçalho dos Documentos em PDF
  const [logoPngUrl, setLogoPngUrl] = useState<string | null>(() => {
    try {
      return localStorage.getItem('tricoview_logo_png');
    } catch {
      return null;
    }
  });
  const [modalLogoAberto, setModalLogoAberto] = useState(false);
  const [carregandoLogo, setCarregandoLogo] = useState(false);

  const handleUploadLogoPng = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.includes('png') && !file.name.toLowerCase().endsWith('.png')) {
      mostrarNotificacao('Por favor, selecione uma imagem no formato PNG (com ou sem fundo transparente).', 'erro');
      return;
    }

    setCarregandoLogo(true);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      if (dataUrl) {
        // Redimensionar suavemente mantendo transparência se passar de 450px
        const img = new Image();
        img.onload = () => {
          const maxDim = 450;
          let w = img.width;
          let h = img.height;
          if (w > maxDim || h > maxDim) {
            if (w > h) {
              h = Math.round((h * maxDim) / w);
              w = maxDim;
            } else {
              w = Math.round((w * maxDim) / h);
              h = maxDim;
            }
          }
          const canvas = document.createElement('canvas');
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.clearRect(0, 0, w, h);
            ctx.drawImage(img, 0, 0, w, h);
            const pngReduzido = canvas.toDataURL('image/png');
            setLogoPngUrl(pngReduzido);
            try {
              localStorage.setItem('tricoview_logo_png', pngReduzido);
            } catch {}
            mostrarNotificacao('Logo em PNG salva para inserção em todos os laudos e PDFs!');
          }
          setCarregandoLogo(false);
        };
        img.onerror = () => {
          setLogoPngUrl(dataUrl);
          try {
            localStorage.setItem('tricoview_logo_png', dataUrl);
          } catch {}
          mostrarNotificacao('Logo em PNG salva para inserção nos PDFs!');
          setCarregandoLogo(false);
        };
        img.src = dataUrl;
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRemoverLogoPng = () => {
    setLogoPngUrl(null);
    try {
      localStorage.removeItem('tricoview_logo_png');
    } catch {}
    mostrarNotificacao('Logo removida dos documentos PDF.');
  };

  // Modal para visualização de resposta já salva
  const [respostaVisualizacao, setRespostaVisualizacao] = useState<RespostaAnamnese | null>(null);

  // Modal para cadastro rápido de paciente durante anamnese
  const [modalNovoPaciente, setModalNovoPaciente] = useState(false);
  const [novoPacienteNome, setNovoPacienteNome] = useState('');
  const [novoPacienteTelefone, setNovoPacienteTelefone] = useState('');
  const [salvandoNovoPaciente, setSalvandoNovoPaciente] = useState(false);

  // Feedback geral
  const [notificacao, setNotificacao] = useState<{ tipo: 'sucesso' | 'erro'; texto: string } | null>(null);

  const mostrarNotificacao = (texto: string, tipo: 'sucesso' | 'erro' = 'sucesso') => {
    setNotificacao({ tipo, texto });
    setTimeout(() => setNotificacao(null), 4000);
  };

  // Carregar dados iniciais
  const carregarDados = async () => {
    setCarregando(true);
    try {
      const [listaModelos, listaRespostas, listaPac] = await Promise.all([
        listModelosAnamnese(usuarioAtual?.uid),
        listTodasRespostas(usuarioAtual?.uid),
        usuarioAtual ? listPacientes(usuarioAtual.uid) : Promise.resolve([])
      ]);
      setModelos(listaModelos);
      setRespostas(listaRespostas);
      setPacientes(listaPac);

      if (pacientePreSelecionado && !modeloSelecionadoParaPreencher && listaModelos.length > 0) {
        setModeloSelecionadoParaPreencher(listaModelos[0]);
      }
    } catch (err) {
      console.error('Erro ao carregar dados de anamnese:', err);
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    carregarDados();
  }, [usuarioAtual]);

  useEffect(() => {
    if (pacientePreSelecionado) {
      setPacienteSelecionado(pacientePreSelecionado);
      setFichaParaEditar(null);
      setFichaWizardAberta(true);
    }
  }, [pacientePreSelecionado]);

  // ==========================================================================
  // FUNÇÕES DO CONSTRUTOR DE FORMULÁRIOS (ESTILO GOOGLE FORMS)
  // ==========================================================================

  const handleIniciarNovoModelo = () => {
    const novo: ModeloAnamnese = {
      id: '',
      titulo: 'Formulário de Anamnese sem título',
      descricao: 'Descreva as instruções ou orientações para este questionário clínico.',
      categoria: 'Personalizado',
      isPadrao: false,
      perguntas: [
        {
          id: `p_${Date.now().toString(36)}_1`,
          tipo: 'multipla_escolha',
          titulo: 'Pergunta sem título',
          obrigatoria: true,
          opcoes: ['Opção 1', 'Opção 2']
        }
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    setModeloEmEdicao(novo);
    setPerguntaAtivaId(novo.perguntas[0].id);
    setAbaAtiva('construtor');
  };

  const handleEditarEstruturaModelo = (modelo: ModeloAnamnese) => {
    setModeloEmEdicao(JSON.parse(JSON.stringify(modelo)));
    setPerguntaAtivaId(modelo.perguntas[0]?.id || null);
    setAbaAtiva('construtor');
  };

  const handleDuplicarModelo = async (modelo: ModeloAnamnese) => {
    try {
      const duplicado = await duplicarModeloAnamnese(modelo);
      setModelos(prev => [duplicado, ...prev]);
      mostrarNotificacao(`Modelo "${duplicado.titulo}" duplicado com sucesso!`);
    } catch {
      mostrarNotificacao('Erro ao duplicar o modelo de formulário.', 'erro');
    }
  };

  const handleExcluirModelo = async (modeloId: string, titulo: string) => {
    if (!window.confirm(`Tem certeza que deseja excluir o modelo de formulário "${titulo}"?`)) return;
    try {
      await deleteModeloAnamnese(modeloId);
      setModelos(prev => prev.filter(m => m.id !== modeloId));
      mostrarNotificacao('Modelo excluído com sucesso.');
    } catch {
      mostrarNotificacao('Erro ao excluir modelo.', 'erro');
    }
  };

  const handleAdicionarPergunta = (tipo: TipoPerguntaAnamnese = 'multipla_escolha') => {
    if (!modeloEmEdicao) return;
    const novaPergunta: PerguntaAnamnese = {
      id: `p_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 5)}`,
      tipo,
      titulo: 'Nova Pergunta',
      obrigatoria: true,
      opcoes: tipo === 'multipla_escolha' || tipo === 'caixas_selecao' ? ['Opção 1', 'Opção 2'] : undefined,
      escalaMin: tipo === 'escala_linear' ? 1 : undefined,
      escalaMax: tipo === 'escala_linear' ? 5 : undefined,
      escalaMinLabel: tipo === 'escala_linear' ? 'Mínimo' : undefined,
      escalaMaxLabel: tipo === 'escala_linear' ? 'Máximo' : undefined
    };

    setModeloEmEdicao(prev => {
      if (!prev) return null;
      return {
        ...prev,
        perguntas: [...prev.perguntas, novaPergunta]
      };
    });
    setPerguntaAtivaId(novaPergunta.id);
  };

  const handleAtualizarPergunta = (perguntaId: string, dadosAtualizados: Partial<PerguntaAnamnese>) => {
    if (!modeloEmEdicao) return;
    setModeloEmEdicao(prev => {
      if (!prev) return null;
      return {
        ...prev,
        perguntas: prev.perguntas.map(p => p.id === perguntaId ? { ...p, ...dadosAtualizados } : p)
      };
    });
  };

  const handleRemoverPergunta = (perguntaId: string) => {
    if (!modeloEmEdicao) return;
    if (modeloEmEdicao.perguntas.length <= 1) {
      mostrarNotificacao('O formulário deve conter pelo menos uma pergunta.', 'erro');
      return;
    }
    setModeloEmEdicao(prev => {
      if (!prev) return null;
      return {
        ...prev,
        perguntas: prev.perguntas.filter(p => p.id !== perguntaId)
      };
    });
  };

  const handleDuplicarPerguntaNoConstrutor = (pergunta: PerguntaAnamnese) => {
    if (!modeloEmEdicao) return;
    const clonada: PerguntaAnamnese = {
      ...pergunta,
      id: `p_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 5)}`,
      titulo: `${pergunta.titulo} (Cópia)`
    };

    setModeloEmEdicao(prev => {
      if (!prev) return null;
      const index = prev.perguntas.findIndex(p => p.id === pergunta.id);
      const novas = [...prev.perguntas];
      novas.splice(index + 1, 0, clonada);
      return {
        ...prev,
        perguntas: novas
      };
    });
    setPerguntaAtivaId(clonada.id);
  };

  const handleMoverPergunta = (index: number, direcao: 'cima' | 'baixo') => {
    if (!modeloEmEdicao) return;
    const targetIndex = direcao === 'cima' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= modeloEmEdicao.perguntas.length) return;

    setModeloEmEdicao(prev => {
      if (!prev) return null;
      const novas = [...prev.perguntas];
      const temp = novas[index];
      novas[index] = novas[targetIndex];
      novas[targetIndex] = temp;
      return { ...prev, perguntas: novas };
    });
  };

  const handleSalvarModeloNoBanco = async () => {
    if (!modeloEmEdicao) return;
    if (!modeloEmEdicao.titulo.trim()) {
      mostrarNotificacao('Por favor, informe o título do formulário.', 'erro');
      return;
    }

    try {
      const salvo = await saveModeloAnamnese({
        ...modeloEmEdicao,
        userId: usuarioAtual?.uid
      });
      setModelos(prev => {
        const filtrados = prev.filter(m => m.id !== salvo.id);
        return [salvo, ...filtrados];
      });
      mostrarNotificacao(`Estrutura "${salvo.titulo}" salva com sucesso no banco de dados!`);
      setAbaAtiva('modelos');
    } catch {
      mostrarNotificacao('Erro ao salvar formulário no banco de dados.', 'erro');
    }
  };

  // ==========================================================================
  // FUNÇÕES DE PREENCHIMENTO E APLICAÇÃO DA ANAMNESE AO PACIENTE
  // ==========================================================================

  const verificarLimitePlano = (): boolean => {
    // Tanto o Plano Mensal quanto o Plano Anual contam com anamneses ilimitadas
    return true;
  };

  const handleAbrirPreenchimento = (modelo: ModeloAnamnese) => {
    if (!verificarLimitePlano()) return;
    setModeloSelecionadoParaPreencher(modelo);
    if (modelo.id === MODELO_FICHA_AVALIACAO_CAPILAR_ID) {
      setFichaParaEditar(null);
      setFichaWizardAberta(true);
      return;
    }
    setRespostasPreenchimento({});
    setAnotacaoEspecialista('');
    setAbaAtiva('preencher');
  };

  const handleAbrirEditarFichaSalva = (resposta: RespostaAnamnese) => {
    setFichaParaEditar(resposta);
    setFichaWizardAberta(true);
  };

  const getCanvasSessaoCoords = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasSessaoRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    return {
      x: ((clientX - rect.left) / rect.width) * canvas.width,
      y: ((clientY - rect.top) / rect.height) * canvas.height
    };
  };

  const iniciarDesenhoSessao = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasSessaoRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.strokeStyle = '#0F172A';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    isDesenhandoSessaoRef.current = true;
    const { x, y } = getCanvasSessaoCoords(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const desenharSessao = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDesenhandoSessaoRef.current) return;
    const canvas = canvasSessaoRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const { x, y } = getCanvasSessaoCoords(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const finalizarDesenhoSessao = () => {
    if (!isDesenhandoSessaoRef.current) return;
    isDesenhandoSessaoRef.current = false;
    const canvas = canvasSessaoRef.current;
    if (canvas) {
      setSessaoAssinatura(canvas.toDataURL('image/png'));
    }
  };

  const limparAssinaturaSessao = () => {
    const canvas = canvasSessaoRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    setSessaoAssinatura(undefined);
  };

  const handleSalvarNovaSessao = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!respostaVisualizacao) return;
    if (!sessaoTratamento.trim()) {
      mostrarNotificacao('Informe a descrição do tratamento realizado na sessão.', 'erro');
      return;
    }

    setSalvandoNovaSessao(true);
    try {
      let sessoesAtuais: SessaoEvolucaoFicha[] = [];
      if (respostaVisualizacao.sessoesJson) {
        try {
          sessoesAtuais = JSON.parse(respostaVisualizacao.sessoesJson);
        } catch {}
      }

      const novaSessao: SessaoEvolucaoFicha = {
        id: `sess_${Date.now()}`,
        numeroSessao: sessoesAtuais.length + 1,
        data: sessaoData,
        tratamentoRealizado: sessaoTratamento.trim(),
        assinaturaClienteBase64: sessaoAssinatura,
        createdAt: new Date().toISOString()
      };

      const listaAtualizada = await salvarSessaoNaRespostaAnamnese(
        respostaVisualizacao.id,
        novaSessao,
        usuarioAtual?.uid
      );

      setRespostaVisualizacao(prev => prev ? {
        ...prev,
        sessoesJson: JSON.stringify(listaAtualizada)
      } : null);

      setRespostas(prev => prev.map(r => r.id === respostaVisualizacao.id ? {
        ...r,
        sessoesJson: JSON.stringify(listaAtualizada)
      } : r));

      setModalNovaSessaoAberto(false);
      setSessaoTratamento('');
      setSessaoAssinatura(undefined);
      mostrarNotificacao(`Sessão #${novaSessao.numeroSessao} registrada na folha de evolução!`);
    } catch {
      mostrarNotificacao('Erro ao registrar sessão.', 'erro');
    } finally {
      setSalvandoNovaSessao(false);
    }
  };

  const handleAtualizarRespostaValor = (perguntaId: string, valor: any) => {
    setRespostasPreenchimento(prev => ({
      ...prev,
      [perguntaId]: valor
    }));
  };

  const handleSalvarAnamnesePaciente = async (e: React.FormEvent, baixarPdfAoFinal = false) => {
    e.preventDefault();
    if (!modeloSelecionadoParaPreencher) return;
    if (!pacienteSelecionado) {
      mostrarNotificacao('Por favor, selecione um paciente para associar a anamnese.', 'erro');
      return;
    }

    // Verificar se todas as obrigatórias foram respondidas
    for (const perg of modeloSelecionadoParaPreencher.perguntas) {
      if (perg.obrigatoria) {
        const val = respostasPreenchimento[perg.id];
        if (val === undefined || val === null || val === '' || (Array.isArray(val) && val.length === 0)) {
          mostrarNotificacao(`A pergunta "${perg.titulo}" é obrigatória.`, 'erro');
          return;
        }
      }
    }

    setSalvandoResposta(true);
    try {
      const arrayRespostas: RespostaItemAnamnese[] = modeloSelecionadoParaPreencher.perguntas.map(perg => ({
        perguntaId: perg.id,
        perguntaTitulo: perg.titulo,
        tipo: perg.tipo,
        valor: respostasPreenchimento[perg.id] !== undefined ? respostasPreenchimento[perg.id] : ''
      }));

      const novaResposta = await saveRespostaAnamnese({
        modeloId: modeloSelecionadoParaPreencher.id,
        modeloTitulo: modeloSelecionadoParaPreencher.titulo,
        pacienteId: pacienteSelecionado.id,
        pacienteNome: pacienteSelecionado.nome,
        userId: usuarioAtual?.uid,
        respostas: arrayRespostas,
        anotacoesEspecialista: anotacaoEspecialista.trim(),
        dataPreenchimento: new Date().toISOString()
      });

      setRespostas(prev => [novaResposta, ...prev]);

      if (baixarPdfAoFinal) {
        baixarPdfRespostaAnamnese({
          resposta: novaResposta,
          profissional: usuarioAtual,
          logoPngUrl: logoPngUrl || undefined
        });
        mostrarNotificacao(`Anamnese salva e laudo em PDF baixado com sucesso!`);
      } else {
        mostrarNotificacao(`Anamnese salva com sucesso no prontuário de ${pacienteSelecionado.nome}!`);
      }

      setRespostaVisualizacao(novaResposta);
    } catch {
      mostrarNotificacao('Erro ao gravar anamnese no banco de dados.', 'erro');
    } finally {
      setSalvandoResposta(false);
    }
  };

  const handleExcluirResposta = async (respostaId: string) => {
    if (!window.confirm('Deseja excluir este registro de anamnese preenchida?')) return;
    try {
      await deleteRespostaAnamnese(respostaId);
      setRespostas(prev => prev.filter(r => r.id !== respostaId));
      if (respostaVisualizacao?.id === respostaId) {
        setRespostaVisualizacao(null);
      }
      mostrarNotificacao('Registro de anamnese removido.');
    } catch {
      mostrarNotificacao('Erro ao excluir anamnese.', 'erro');
    }
  };

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
      setPacienteSelecionado(criado);
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

  // Modelos filtrados
  const modelosFiltrados = useMemo(() => {
    const q = buscaModelo.toLowerCase().trim();
    return modelos.filter(m => {
      const matchCat = filtroCategoria === 'Todas' || m.categoria === filtroCategoria;
      if (!matchCat) return false;
      if (!q) return true;
      return m.titulo.toLowerCase().includes(q) || m.descricao.toLowerCase().includes(q);
    });
  }, [modelos, buscaModelo, filtroCategoria]);

  // Respostas filtradas
  const respostasFiltradas = useMemo(() => {
    const q = buscaResposta.toLowerCase().trim();
    if (!q) return respostas;
    return respostas.filter(r => 
      r.pacienteNome.toLowerCase().includes(q) || 
      r.modeloTitulo.toLowerCase().includes(q)
    );
  }, [respostas, buscaResposta]);

  const categoriasDisponiveis = useMemo(() => {
    const cats = new Set(modelos.map(m => m.categoria));
    return ['Todas', ...Array.from(cats)];
  }, [modelos]);

  if (fichaWizardAberta) {
    return (
      <FichaAvaliacaoCapilarWizard
        paciente={pacienteSelecionado}
        profissional={usuarioAtual}
        fichaExistente={fichaParaEditar}
        onFechar={() => {
          setFichaWizardAberta(false);
          setFichaParaEditar(null);
          carregarDados();
        }}
        onFichaSalva={(respostaSalva) => {
          setRespostas(prev => {
            const sem = prev.filter(r => r.id !== respostaSalva.id);
            return [respostaSalva, ...sem];
          });
          setRespostaVisualizacao(respostaSalva);
        }}
        onNavegarParaPlanos={onNavegarParaPlanos}
        onAvancarParaTricoscopia={onAvancarParaTricoscopia}
        onEncaminharParaRelatorioPaciente={onEncaminharParaRelatorioPaciente || onSelecionarPaciente}
      />
    );
  }

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
            <HelpCircle className="w-4 h-4 shrink-0 text-rose-500" />
          )}
          <span>{notificacao.texto}</span>
        </div>
      )}

      {/* 1. CABEÇALHO DO MÓDULO ANAMNESE DIGITAL */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200/60 dark:border-white/[0.06]">
        <div className="flex items-center gap-3">
          {onVoltarParaPainel && (
            <button
              onClick={onVoltarParaPainel}
              className="glass-button p-2 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white shrink-0"
              title="Voltar ao Painel"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}
          <div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl glass-button flex items-center justify-center text-teal-700 dark:text-teal-400">
                <FileText className="w-4 h-4" />
              </div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                Anamnese Digital & Formulários
              </h1>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Crie questionários clínicos no estilo Google Forms, reutilize modelos estruturados e aplique aos pacientes.
            </p>
          </div>
        </div>

        {/* Botão de Ação Primária: Criar Novo Formulário */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleIniciarNovoModelo}
            className="px-4 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-semibold text-xs flex items-center gap-2 shadow-sm transition-all hover:scale-[1.01]"
          >
            <Plus className="w-4 h-4" />
            <span>Criar Novo Formulário</span>
          </button>
        </div>
      </div>

      {/* 2. ABAS DE NAVEGAÇÃO SUPERIOR */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        <button
          onClick={() => setAbaAtiva('modelos')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all shrink-0 ${
            abaAtiva === 'modelos'
              ? 'glass-card border-teal-500/40 text-teal-700 dark:text-teal-400 bg-teal-500/10 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/40 dark:hover:bg-white/[0.04]'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Modelos & Estruturas ({modelos.length})</span>
        </button>

        <button
          onClick={() => {
            if (modelos.length > 0 && !modeloSelecionadoParaPreencher) {
              setModeloSelecionadoParaPreencher(modelos[0]);
            }
            setAbaAtiva('preencher');
          }}
          className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all shrink-0 ${
            abaAtiva === 'preencher'
              ? 'glass-card border-teal-500/40 text-teal-700 dark:text-teal-400 bg-teal-500/10 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/40 dark:hover:bg-white/[0.04]'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Preencher para Paciente</span>
        </button>

        <button
          onClick={() => setAbaAtiva('respostas')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all shrink-0 ${
            abaAtiva === 'respostas'
              ? 'glass-card border-teal-500/40 text-teal-700 dark:text-teal-400 bg-teal-500/10 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/40 dark:hover:bg-white/[0.04]'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>Histórico de Respostas ({respostas.length})</span>
        </button>

        {modeloEmEdicao && abaAtiva === 'construtor' && (
          <button
            onClick={() => setAbaAtiva('construtor')}
            className="px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all shrink-0 glass-card border-teal-500/40 text-teal-700 dark:text-teal-400 bg-teal-500/10 shadow-xs"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>Editando: {modeloEmEdicao.titulo}</span>
          </button>
        )}
      </div>

      {/* ======================================================================== */}
      {/* ABA 1: CATÁLOGO DE MODELOS & FORMULÁRIOS (GOOGLE FORMS STYLE) */}
      {/* ======================================================================== */}
      {abaAtiva === 'modelos' && (
        <div className="space-y-5 animate-fadeIn">
          {/* Filtros e Barra de Pesquisa */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={buscaModelo}
                onChange={(e) => setBuscaModelo(e.target.value)}
                placeholder="Buscar modelo de anamnese..."
                className="w-full glass-input pl-8 pr-3 py-2 text-xs text-slate-900 dark:text-white"
              />
            </div>

            {/* Categorias */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
              {categoriasDisponiveis.map(cat => (
                <button
                  key={cat}
                  onClick={() => setFiltroCategoria(cat)}
                  className={`px-3 py-1.5 rounded-xl transition-all shrink-0 font-medium ${
                    filtroCategoria === cat
                      ? 'glass-button bg-teal-700 text-white dark:bg-teal-700 dark:text-white font-semibold shadow-xs'
                      : 'glass-button text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Grid de Modelos de Formulários */}
          {carregando ? (
            <div className="text-center py-16 text-xs text-slate-400">
              Carregando modelos de anamnese do banco de dados...
            </div>
          ) : modelosFiltrados.length === 0 ? (
            <div className="glass-card p-12 text-center space-y-3">
              <FileText className="w-10 h-10 text-slate-400 mx-auto" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Nenhum modelo encontrado</h3>
              <p className="text-xs text-slate-500">Tente ajustar a busca ou crie um novo formulário personalizado.</p>
              <button
                onClick={handleIniciarNovoModelo}
                className="px-4 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold"
              >
                + Criar Formulário do Zero
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {/* Card Criar Novo em Branco */}
              <div 
                onClick={handleIniciarNovoModelo}
                className="glass-card p-6 border-dashed border-2 border-slate-300 dark:border-white/10 hover:border-teal-500/50 flex flex-col items-center justify-center text-center cursor-pointer group hover:scale-[1.01] transition-all min-h-[220px]"
              >
                <div className="w-12 h-12 rounded-2xl glass-button flex items-center justify-center text-teal-700 dark:text-teal-400 group-hover:scale-110 transition-transform mb-3 shadow-xs">
                  <Plus className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-teal-700 dark:group-hover:text-teal-400 transition-colors">
                  Criar Formulário em Branco
                </h3>
                <p className="text-[11px] text-slate-400 mt-1 max-w-[200px]">
                  Monte um novo questionário do zero com perguntas personalizadas.
                </p>
              </div>

              {/* Cards de Modelos Existentes (Estilo Google Forms) */}
              {modelosFiltrados.map(modelo => (
                <div
                  key={modelo.id}
                  className="glass-card flex flex-col justify-between overflow-hidden group hover:border-teal-500/40 hover:scale-[1.01] transition-all"
                >
                  <div>
                    {/* Faixa Superior Verde-Petróleo Estilo Formulário */}
                    <div className="h-3 bg-gradient-to-r from-teal-800 via-teal-700 to-teal-600 w-full" />
                    
                    <div className="p-5 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <span className="px-2 py-0.5 rounded-md glass-card text-[10px] font-semibold text-teal-700 dark:text-teal-400">
                          {modelo.categoria}
                        </span>
                        {modelo.isPadrao && (
                          <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold flex items-center gap-1">
                            <Award className="w-3 h-3" />
                            Padrão Ouro
                          </span>
                        )}
                      </div>

                      <div>
                        <h3 className="text-base font-bold text-slate-900 dark:text-white group-hover:text-teal-700 dark:group-hover:text-teal-400 transition-colors">
                          {modelo.titulo}
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mt-1">
                          {modelo.descricao || 'Sem descrição cadastrada.'}
                        </p>
                      </div>

                      <div className="flex items-center gap-3 text-[11px] text-slate-400 pt-2 border-t border-slate-200/50 dark:border-white/[0.05]">
                        <span className="flex items-center gap-1">
                          <CheckSquare className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                          {modelo.perguntas.length} {modelo.perguntas.length === 1 ? 'pergunta' : 'perguntas'}
                        </span>
                        <span>·</span>
                        <span>{new Date(modelo.updatedAt).toLocaleDateString('pt-BR')}</span>
                      </div>
                    </div>
                  </div>

                  {/* Ações do Card */}
                  <div className="p-4 bg-slate-50/50 dark:bg-white/[0.02] border-t border-slate-200/60 dark:border-white/[0.06] flex items-center justify-between gap-2">
                    <button
                      onClick={() => handleAbrirPreenchimento(modelo)}
                      className="px-3.5 py-1.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-semibold text-xs flex items-center gap-1.5 shadow-xs transition-all flex-1 justify-center"
                    >
                      <Users className="w-3.5 h-3.5" />
                      <span>Preencher</span>
                    </button>

                    <button
                      onClick={() => handleDuplicarModelo(modelo)}
                      className="glass-button p-2 text-slate-600 dark:text-slate-300 hover:text-teal-700 dark:hover:text-teal-400"
                      title="Reutilizar / Duplicar Estrutura deste Formulário"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => handleEditarEstruturaModelo(modelo)}
                      className="glass-button p-2 text-slate-600 dark:text-slate-300 hover:text-teal-700 dark:hover:text-teal-400"
                      title="Editar Estrutura de Perguntas"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>

                    {!modelo.isPadrao && (
                      <button
                        onClick={() => handleExcluirModelo(modelo.id, modelo.titulo)}
                        className="glass-button p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-500/10"
                        title="Excluir este Modelo"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ======================================================================== */}
      {/* ABA 2: CONSTRUTOR DE FORMULÁRIOS ESTILO GOOGLE FORMS */}
      {/* ======================================================================== */}
      {abaAtiva === 'construtor' && modeloEmEdicao && (
        <div className="max-w-4xl mx-auto space-y-6 animate-fadeIn">
          {/* Barra Superior de Ações do Construtor */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 glass-card">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setAbaAtiva('modelos')}
                className="glass-button p-2 text-slate-600 dark:text-slate-300"
                title="Voltar para Lista de Formulários"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                Construtor de Formulários estilo Google Forms
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => handleAdicionarPergunta('multipla_escolha')}
                className="glass-button px-3 py-1.5 text-xs font-semibold text-teal-700 dark:text-teal-400 flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Adicionar Pergunta</span>
              </button>

              <button
                onClick={handleSalvarModeloNoBanco}
                className="px-4 py-1.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Salvar Estrutura no Banco</span>
              </button>
            </div>
          </div>

          {/* 1. CABEÇALHO DO FORMULÁRIO (ESTILO GOOGLE FORMS) */}
          <div className="glass-card overflow-hidden shadow-md">
            <div className="h-4 bg-gradient-to-r from-teal-800 via-teal-700 to-teal-600 w-full" />
            <div className="p-6 sm:p-7 space-y-4">
              <input
                type="text"
                value={modeloEmEdicao.titulo}
                onChange={(e) => setModeloEmEdicao({ ...modeloEmEdicao, titulo: e.target.value })}
                placeholder="Título do formulário"
                className="w-full text-xl sm:text-2xl font-bold text-slate-900 dark:text-white bg-transparent border-b border-transparent hover:border-slate-300 dark:hover:border-white/20 focus:border-teal-600 outline-none transition-colors pb-1"
              />
              <textarea
                value={modeloEmEdicao.descricao}
                onChange={(e) => setModeloEmEdicao({ ...modeloEmEdicao, descricao: e.target.value })}
                placeholder="Descrição ou orientações do formulário clínico..."
                rows={2}
                className="w-full text-xs text-slate-600 dark:text-slate-300 bg-transparent border-b border-transparent hover:border-slate-300 dark:hover:border-white/20 focus:border-teal-600 outline-none transition-colors resize-none"
              />

              <div className="flex items-center gap-3 pt-2 text-xs">
                <span className="text-slate-400 font-medium">Categoria:</span>
                <input
                  type="text"
                  value={modeloEmEdicao.categoria}
                  onChange={(e) => setModeloEmEdicao({ ...modeloEmEdicao, categoria: e.target.value })}
                  placeholder="Ex: Geral, Queda, Alopecia"
                  className="glass-input px-3 py-1 text-xs w-48 text-slate-800 dark:text-white"
                />
              </div>
            </div>
          </div>

          {/* 2. LISTA DE PERGUNTAS (CARDS COM BARRA LATERAL VERDE-PETRÓLEO QUANDO ATIVO) */}
          <div className="space-y-4">
            {modeloEmEdicao.perguntas.map((pergunta, index) => {
              const isAtiva = perguntaAtivaId === pergunta.id;

              return (
                <div
                  key={pergunta.id}
                  onClick={() => setPerguntaAtivaId(pergunta.id)}
                  className={`glass-card p-5 sm:p-6 transition-all duration-200 relative ${
                    isAtiva 
                      ? 'ring-2 ring-teal-600/60 shadow-xl border-l-4 border-l-teal-600' 
                      : 'hover:border-slate-300 dark:hover:border-white/20'
                  }`}
                >
                  <div className="space-y-4">
                    {/* Linha Superior da Pergunta: Enunciado e Seletor de Tipo */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-2 w-full sm:w-2/3">
                        <span className="text-xs font-mono font-bold text-teal-700 dark:text-teal-400 shrink-0">
                          #{index + 1}
                        </span>
                        <input
                          type="text"
                          value={pergunta.titulo}
                          onChange={(e) => handleAtualizarPergunta(pergunta.id, { titulo: e.target.value })}
                          placeholder="Digite o enunciado da pergunta..."
                          className="w-full text-sm font-semibold text-slate-900 dark:text-white bg-transparent border-b border-slate-200 dark:border-white/10 focus:border-teal-600 outline-none pb-1"
                        />
                      </div>

                      {/* Seletor de Tipo de Pergunta */}
                      <div className="shrink-0 w-full sm:w-auto">
                        <select
                          value={pergunta.tipo}
                          onChange={(e) => {
                            const novoTipo = e.target.value as TipoPerguntaAnamnese;
                            handleAtualizarPergunta(pergunta.id, {
                              tipo: novoTipo,
                              opcoes: novoTipo === 'multipla_escolha' || novoTipo === 'caixas_selecao' 
                                ? (pergunta.opcoes || ['Opção 1', 'Opção 2']) 
                                : undefined,
                              escalaMin: novoTipo === 'escala_linear' ? 1 : undefined,
                              escalaMax: novoTipo === 'escala_linear' ? 5 : undefined
                            });
                          }}
                          className="glass-input px-3 py-1.5 text-xs text-slate-800 dark:text-slate-100 font-medium"
                        >
                          <option value="multipla_escolha">🔘 Múltipla Escolha</option>
                          <option value="caixas_selecao">☑️ Caixas de Seleção</option>
                          <option value="texto_curto">📝 Resposta Curta</option>
                          <option value="paragrafo">📄 Parágrafo</option>
                          <option value="escala_linear">📊 Escala Linear (1 a 5/10)</option>
                          <option value="sim_nao">⚡ Sim / Não</option>
                        </select>
                      </div>
                    </div>

                    {/* Descrição opcional da pergunta */}
                    <input
                      type="text"
                      value={pergunta.descricao || ''}
                      onChange={(e) => handleAtualizarPergunta(pergunta.id, { descricao: e.target.value })}
                      placeholder="Texto de ajuda ou orientação ao paciente (opcional)..."
                      className="w-full text-xs text-slate-500 dark:text-slate-400 bg-transparent border-b border-transparent focus:border-slate-300 dark:focus:border-white/10 outline-none pb-1"
                    />

                    {/* CORPO DA PERGUNTA BASEADO NO TIPO */}
                    <div className="pt-2 pl-2">
                      {/* 1. Múltipla Escolha e Caixas de Seleção */}
                      {(pergunta.tipo === 'multipla_escolha' || pergunta.tipo === 'caixas_selecao') && (
                        <div className="space-y-2">
                          {(pergunta.opcoes || []).map((opcao, optIndex) => (
                            <div key={optIndex} className="flex items-center gap-2">
                              {pergunta.tipo === 'multipla_escolha' ? (
                                <CircleDot className="w-4 h-4 text-slate-400 shrink-0" />
                              ) : (
                                <CheckSquare className="w-4 h-4 text-slate-400 shrink-0" />
                              )}
                              <input
                                type="text"
                                value={opcao}
                                onChange={(e) => {
                                  const novasOpcoes = [...(pergunta.opcoes || [])];
                                  novasOpcoes[optIndex] = e.target.value;
                                  handleAtualizarPergunta(pergunta.id, { opcoes: novasOpcoes });
                                }}
                                placeholder={`Opção ${optIndex + 1}`}
                                className="glass-input px-3 py-1 text-xs flex-1 text-slate-800 dark:text-white"
                              />
                              {(pergunta.opcoes?.length || 0) > 1 && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const novas = (pergunta.opcoes || []).filter((_, i) => i !== optIndex);
                                    handleAtualizarPergunta(pergunta.id, { opcoes: novas });
                                  }}
                                  className="text-slate-400 hover:text-rose-500 p-1"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          ))}

                          <button
                            type="button"
                            onClick={() => {
                              const novas = [...(pergunta.opcoes || []), `Opção ${(pergunta.opcoes?.length || 0) + 1}`];
                              handleAtualizarPergunta(pergunta.id, { opcoes: novas });
                            }}
                            className="text-xs text-teal-700 dark:text-teal-400 font-semibold hover:underline flex items-center gap-1 mt-1"
                          >
                            <Plus className="w-3 h-3" />
                            <span>Adicionar Opção</span>
                          </button>
                        </div>
                      )}

                      {/* 2. Resposta Curta */}
                      {pergunta.tipo === 'texto_curto' && (
                        <div className="p-2.5 rounded-xl border border-dashed border-slate-300 dark:border-white/10 text-xs text-slate-400 italic">
                          Texto de resposta curta (o paciente ou profissional digitará uma linha)
                        </div>
                      )}

                      {/* 3. Parágrafo */}
                      {pergunta.tipo === 'paragrafo' && (
                        <div className="p-3.5 rounded-xl border border-dashed border-slate-300 dark:border-white/10 text-xs text-slate-400 italic">
                          Texto longo para descrições detalhadas, tratamentos e queixas ampliadas.
                        </div>
                      )}

                      {/* 4. Escala Linear */}
                      {pergunta.tipo === 'escala_linear' && (
                        <div className="space-y-3 p-3 rounded-xl glass-card">
                          <div className="flex items-center gap-4 text-xs">
                            <span>Escala de:</span>
                            <span className="font-mono font-bold">1</span>
                            <span>até:</span>
                            <select
                              value={pergunta.escalaMax || 5}
                              onChange={(e) => handleAtualizarPergunta(pergunta.id, { escalaMax: Number(e.target.value) })}
                              className="glass-input px-2 py-1 text-xs font-mono font-bold"
                            >
                              <option value={5}>5</option>
                              <option value={10}>10</option>
                            </select>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <input
                              type="text"
                              value={pergunta.escalaMinLabel || ''}
                              onChange={(e) => handleAtualizarPergunta(pergunta.id, { escalaMinLabel: e.target.value })}
                              placeholder="Rótulo mínimo (ex: Nenhuma queda)"
                              className="glass-input px-3 py-1 text-xs"
                            />
                            <input
                              type="text"
                              value={pergunta.escalaMaxLabel || ''}
                              onChange={(e) => handleAtualizarPergunta(pergunta.id, { escalaMaxLabel: e.target.value })}
                              placeholder="Rótulo máximo (ex: Queda severa)"
                              className="glass-input px-3 py-1 text-xs"
                            />
                          </div>
                        </div>
                      )}

                      {/* 5. Sim / Não */}
                      {pergunta.tipo === 'sim_nao' && (
                        <div className="flex items-center gap-3 text-xs text-slate-400">
                          <span className="px-3 py-1 rounded-lg glass-button font-bold text-emerald-600">Sim</span>
                          <span className="px-3 py-1 rounded-lg glass-button font-bold text-rose-600">Não</span>
                        </div>
                      )}
                    </div>

                    {/* RODAPÉ DO CARD DE PERGUNTA (AÇÕES GOOGLE FORMS) */}
                    <div className="pt-3 border-t border-slate-200/60 dark:border-white/[0.08] flex items-center justify-between">
                      {/* Botões de Mover Pergunta */}
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          disabled={index === 0}
                          onClick={() => handleMoverPergunta(index, 'cima')}
                          className="glass-button p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-white disabled:opacity-30"
                          title="Mover pergunta para cima"
                        >
                          <ChevronUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          disabled={index === modeloEmEdicao.perguntas.length - 1}
                          onClick={() => handleMoverPergunta(index, 'baixo')}
                          className="glass-button p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-white disabled:opacity-30"
                          title="Mover pergunta para baixo"
                        >
                          <ChevronDown className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Ações da Pergunta */}
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => handleDuplicarPerguntaNoConstrutor(pergunta)}
                          className="glass-button p-1.5 text-slate-500 hover:text-teal-700 dark:hover:text-teal-400"
                          title="Duplicar esta pergunta"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleRemoverPergunta(pergunta.id)}
                          className="glass-button p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-500/10"
                          title="Excluir pergunta"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>

                        <div className="h-4 w-px bg-slate-300 dark:bg-white/10" />

                        {/* Switch Obrigatória */}
                        <label className="flex items-center gap-2 cursor-pointer select-none text-xs">
                          <span className="text-slate-600 dark:text-slate-300 text-[11px] font-medium">Obrigatória</span>
                          <input
                            type="checkbox"
                            checked={pergunta.obrigatoria}
                            onChange={(e) => handleAtualizarPergunta(pergunta.id, { obrigatoria: e.target.checked })}
                            className="rounded text-teal-700 focus:ring-teal-600"
                          />
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Botão Final Adicionar Mais e Salvar */}
          <div className="flex items-center justify-center gap-3 py-4">
            <button
              onClick={() => handleAdicionarPergunta('multipla_escolha')}
              className="px-5 py-2.5 rounded-xl glass-button text-teal-700 dark:text-teal-400 font-semibold text-xs flex items-center gap-2 hover:border-teal-500/50"
            >
              <Plus className="w-4 h-4" />
              <span>Adicionar Mais uma Pergunta</span>
            </button>

            <button
              onClick={handleSalvarModeloNoBanco}
              className="px-6 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs flex items-center gap-2 shadow-md transition-all hover:scale-[1.01]"
            >
              <Save className="w-4 h-4" />
              <span>Salvar Formulário Completo</span>
            </button>
          </div>
        </div>
      )}

      {/* ======================================================================== */}
      {/* ABA 3: PREENCHIMENTO DE ANAMNESE VINCULADO AO PACIENTE SELECIONADO */}
      {/* ======================================================================== */}
      {abaAtiva === 'preencher' && (
        <div className="max-w-4xl mx-auto space-y-6 animate-fadeIn">
          {/* Seletor do Paciente & Seletor de Modelo */}
          <div className="glass-card p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200/60 dark:border-white/[0.08]">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl glass-button flex items-center justify-center text-teal-700 dark:text-teal-400">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                    1. Identificação do Paciente & Modelo Clínico
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Selecione o paciente cadastrado no banco de dados e o modelo de anamnese a ser aplicado.
                  </p>
                </div>
              </div>

              <button
                onClick={() => setModalNovoPaciente(true)}
                className="glass-button px-3 py-1.5 text-xs font-semibold text-teal-700 dark:text-teal-400 flex items-center gap-1.5"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>+ Novo Paciente</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Seletor do Paciente */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Paciente Selecionado *
                </label>
                <select
                  value={pacienteSelecionado?.id || ''}
                  onChange={(e) => {
                    const pac = pacientes.find(p => p.id === e.target.value) || null;
                    setPacienteSelecionado(pac);
                    if (pac && onSelecionarPaciente) onSelecionarPaciente(pac);
                  }}
                  className="w-full glass-input px-3 py-2 text-xs text-slate-900 dark:text-white font-medium"
                >
                  <option value="">Selecione um paciente...</option>
                  {pacientes.map(pac => (
                    <option key={pac.id} value={pac.id}>
                      {pac.nome} {pac.telefone ? `(${pac.telefone})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Seletor de Modelo de Anamnese */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Modelo de Formulário *
                </label>
                <select
                  value={modeloSelecionadoParaPreencher?.id || ''}
                  onChange={(e) => {
                    const mod = modelos.find(m => m.id === e.target.value) || null;
                    setModeloSelecionadoParaPreencher(mod);
                    setRespostasPreenchimento({});
                  }}
                  className="w-full glass-input px-3 py-2 text-xs text-slate-900 dark:text-white font-medium"
                >
                  {modelos.map(mod => (
                    <option key={mod.id} value={mod.id}>
                      {mod.titulo} ({mod.categoria})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Ficha resumida do paciente selecionado */}
            {pacienteSelecionado && (
              <div className="p-3 rounded-xl bg-teal-500/10 border border-teal-500/20 text-xs flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="font-bold text-slate-900 dark:text-white">{pacienteSelecionado.nome}</span>
                  {pacienteSelecionado.telefone && (
                    <span className="text-slate-400 ml-2">· {pacienteSelecionado.telefone}</span>
                  )}
                  {pacienteSelecionado.queixaPrincipal && (
                    <p className="text-[11px] text-slate-500 dark:text-slate-300 truncate max-w-lg mt-0.5">
                      Queixa: {pacienteSelecionado.queixaPrincipal}
                    </p>
                  )}
                </div>
                <span className="text-[10px] font-mono text-teal-700 dark:text-teal-400 font-semibold px-2 py-0.5 rounded-md glass-card">
                  Prontuário Ativo
                </span>
              </div>
            )}
          </div>

          {/* FORMULÁRIO DE PERGUNTAS ESTILO GOOGLE FORMS PREENCHÍVEL */}
          {modeloSelecionadoParaPreencher && (
            <form onSubmit={handleSalvarAnamnesePaciente} className="space-y-5">
              <div className="glass-card overflow-hidden">
                <div className="h-3.5 bg-gradient-to-r from-teal-800 via-teal-700 to-teal-600 w-full" />
                <div className="p-6 space-y-2">
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                    {modeloSelecionadoParaPreencher.titulo}
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {modeloSelecionadoParaPreencher.descricao}
                  </p>
                  <p className="text-[10px] text-teal-700 dark:text-teal-400 font-semibold pt-1">
                    * Campos com asterisco são de resposta obrigatória
                  </p>
                </div>
              </div>

              {/* Cards de Perguntas Interativos */}
              {modeloSelecionadoParaPreencher.perguntas.map((pergunta, index) => {
                const valorAtual = respostasPreenchimento[pergunta.id];

                return (
                  <div key={pergunta.id} className="glass-card p-5 sm:p-6 space-y-3">
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                        <span>{index + 1}.</span>
                        <span>{pergunta.titulo}</span>
                        {pergunta.obrigatoria && <span className="text-teal-700 dark:text-teal-400">*</span>}
                      </h4>
                      {pergunta.descricao && (
                        <p className="text-xs text-slate-400 mt-0.5">{pergunta.descricao}</p>
                      )}
                    </div>

                    {/* Resposta do Usuário */}
                    <div className="pt-2">
                      {/* 1. Múltipla Escolha */}
                      {pergunta.tipo === 'multipla_escolha' && (
                        <div className="space-y-2">
                          {(pergunta.opcoes || []).map((opcao, optIdx) => (
                            <label
                              key={optIdx}
                              className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all border ${
                                valorAtual === opcao 
                                  ? 'bg-teal-500/10 border-teal-500/50 text-slate-900 dark:text-white font-semibold' 
                                  : 'border-slate-200/60 dark:border-white/[0.06] text-slate-700 dark:text-slate-300 hover:bg-white/40 dark:hover:bg-white/[0.04]'
                              }`}
                            >
                              <input
                                type="radio"
                                name={pergunta.id}
                                value={opcao}
                                checked={valorAtual === opcao}
                                onChange={() => handleAtualizarRespostaValor(pergunta.id, opcao)}
                                className="text-teal-700 focus:ring-teal-600"
                              />
                              <span className="text-xs">{opcao}</span>
                            </label>
                          ))}
                        </div>
                      )}

                      {/* 2. Caixas de Seleção */}
                      {pergunta.tipo === 'caixas_selecao' && (
                        <div className="space-y-2">
                          {(pergunta.opcoes || []).map((opcao, optIdx) => {
                            const marcadas: string[] = Array.isArray(valorAtual) ? valorAtual : [];
                            const isMarcada = marcadas.includes(opcao);

                            return (
                              <label
                                key={optIdx}
                                className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all border ${
                                  isMarcada 
                                    ? 'bg-teal-500/10 border-teal-500/50 text-slate-900 dark:text-white font-semibold' 
                                    : 'border-slate-200/60 dark:border-white/[0.06] text-slate-700 dark:text-slate-300 hover:bg-white/40 dark:hover:bg-white/[0.04]'
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={isMarcada}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      handleAtualizarRespostaValor(pergunta.id, [...marcadas, opcao]);
                                    } else {
                                      handleAtualizarRespostaValor(pergunta.id, marcadas.filter(m => m !== opcao));
                                    }
                                  }}
                                  className="rounded text-teal-700 focus:ring-teal-600"
                                />
                                <span className="text-xs">{opcao}</span>
                              </label>
                            );
                          })}
                        </div>
                      )}

                      {/* 3. Resposta Curta */}
                      {pergunta.tipo === 'texto_curto' && (
                        <input
                          type="text"
                          value={valorAtual || ''}
                          onChange={(e) => handleAtualizarRespostaValor(pergunta.id, e.target.value)}
                          placeholder="Sua resposta..."
                          className="w-full glass-input px-3.5 py-2.5 text-xs text-slate-900 dark:text-white"
                        />
                      )}

                      {/* 4. Parágrafo */}
                      {pergunta.tipo === 'paragrafo' && (
                        <textarea
                          rows={3}
                          value={valorAtual || ''}
                          onChange={(e) => handleAtualizarRespostaValor(pergunta.id, e.target.value)}
                          placeholder="Digite detalhadamente a resposta do paciente..."
                          className="w-full glass-input p-3 text-xs text-slate-900 dark:text-white resize-none"
                        />
                      )}

                      {/* 5. Escala Linear */}
                      {pergunta.tipo === 'escala_linear' && (
                        <div className="space-y-3 p-3 rounded-xl glass-card">
                          <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
                            <span>{pergunta.escalaMinLabel || '1 (Mínimo)'}</span>
                            <span>{pergunta.escalaMaxLabel || `${pergunta.escalaMax || 5} (Máximo)`}</span>
                          </div>
                          <div className="flex items-center justify-between gap-1">
                            {Array.from({ length: (pergunta.escalaMax || 5) }, (_, i) => i + 1).map(num => (
                              <button
                                key={num}
                                type="button"
                                onClick={() => handleAtualizarRespostaValor(pergunta.id, num)}
                                className={`flex-1 py-2.5 rounded-xl font-bold text-xs transition-all ${
                                  valorAtual === num
                                    ? 'bg-teal-700 text-white shadow-md scale-105'
                                    : 'glass-button text-slate-700 dark:text-slate-300 hover:border-teal-500'
                                }`}
                              >
                                {num}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* 6. Sim / Não */}
                      {pergunta.tipo === 'sim_nao' && (
                        <div className="grid grid-cols-2 gap-3 max-w-xs">
                          <button
                            type="button"
                            onClick={() => handleAtualizarRespostaValor(pergunta.id, 'Sim')}
                            className={`py-2.5 rounded-xl font-bold text-xs transition-all ${
                              valorAtual === 'Sim'
                                ? 'bg-emerald-600 text-white shadow-sm'
                                : 'glass-button text-slate-700 dark:text-slate-300 hover:text-emerald-500'
                            }`}
                          >
                            Sim
                          </button>
                          <button
                            type="button"
                            onClick={() => handleAtualizarRespostaValor(pergunta.id, 'Não')}
                            className={`py-2.5 rounded-xl font-bold text-xs transition-all ${
                              valorAtual === 'Não'
                                ? 'bg-rose-600 text-white shadow-sm'
                                : 'glass-button text-slate-700 dark:text-slate-300 hover:text-rose-500'
                            }`}
                          >
                            Não
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Anotações e Parecer Final do Especialista */}
              <div className="glass-card p-5 sm:p-6 space-y-2">
                <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Award className="w-4 h-4 text-teal-700 dark:text-teal-400" />
                  <span>Parecer & Condutas do Especialista (Opcional)</span>
                </h4>
                <p className="text-xs text-slate-400">
                  Observações clínicas, hipóteses de avaliação preliminares e condutas a serem registradas no prontuário.
                </p>
                <textarea
                  rows={3}
                  value={anotacaoEspecialista}
                  onChange={(e) => setAnotacaoEspecialista(e.target.value)}
                  placeholder="Ex: Quadro sugestivo de Eflúvio Telógeno pós-infeccioso. Solicitado painel laboratorial com ferritina e TSH. Orientada higienização em dias alternados..."
                  className="w-full glass-input p-3 text-xs text-slate-900 dark:text-white resize-none"
                />
              </div>

              {/* Botões de Envio do Formulário */}
              <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={(e) => handleSalvarAnamnesePaciente(e, true)}
                  disabled={salvandoResposta || !pacienteSelecionado}
                  className="px-5 py-3 rounded-xl border border-teal-600/40 hover:bg-teal-50 dark:hover:bg-teal-950/40 text-teal-800 dark:text-teal-300 font-bold text-xs flex items-center gap-2 shadow-sm transition-all disabled:opacity-50"
                  title="Salvar no prontuário e baixar o laudo em PDF imediatamente"
                >
                  <Download className="w-4 h-4" />
                  <span>Salvar e Baixar em PDF</span>
                </button>
                <button
                  type="submit"
                  disabled={salvandoResposta || !pacienteSelecionado}
                  className="px-6 py-3 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs flex items-center gap-2 shadow-lg transition-all hover:scale-[1.01] disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  <span>{salvandoResposta ? 'Salvando Anamnese...' : 'Salvar no Prontuário'}</span>
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* ======================================================================== */}
      {/* ABA 4: HISTÓRICO DE ANAMNESES PREENCHIDAS */}
      {/* ======================================================================== */}
      {abaAtiva === 'respostas' && (
        <div className="space-y-5 animate-fadeIn">
          {/* Barra de Pesquisa e Ações do Histórico */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={buscaResposta}
                onChange={(e) => setBuscaResposta(e.target.value)}
                placeholder="Pesquisar por paciente ou formulário..."
                className="w-full glass-input pl-8 pr-3 py-2 text-xs text-slate-900 dark:text-white"
              />
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Botão Configurar Logo em PNG no Documento */}
              <button
                type="button"
                onClick={() => setModalLogoAberto(true)}
                className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors border ${
                  logoPngUrl 
                    ? 'bg-teal-50 dark:bg-teal-950/60 text-teal-800 dark:text-teal-300 border-teal-300 dark:border-teal-700/80 hover:bg-teal-100'
                    : 'glass-button text-slate-600 dark:text-slate-300 hover:text-teal-700'
                }`}
                title="Configurar Logo em PNG para estampar no cabeçalho do PDF"
              >
                <ImageIcon className="w-3.5 h-3.5 text-teal-600" />
                <span>{logoPngUrl ? 'Logo PNG Ativa' : 'Inserir Logo (PNG)'}</span>
              </button>

              {/* Botão Salvar Todas em PDF */}
              {respostasFiltradas.length > 0 && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      try {
                        baixarPdfTodasRespostas({
                          respostas: respostasFiltradas,
                          pacienteNome: buscaResposta ? `Filtro: ${buscaResposta}` : undefined,
                          profissional: usuarioAtual,
                          logoPngUrl: logoPngUrl || undefined
                        });
                        mostrarNotificacao(`Dossiê consolidado com ${respostasFiltradas.length} anamneses gerado com sucesso!`);
                      } catch (err) {
                        mostrarNotificacao('Erro ao exportar todas as anamneses em PDF.', 'erro');
                      }
                    }}
                    className="px-3.5 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs"
                    title="Exportar todas as anamneses da lista em um único documento PDF consolidado"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Salvar Todas em PDF</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      compartilharPdfTodasRespostas({
                        respostas: respostasFiltradas,
                        pacienteNome: buscaResposta ? `Filtro: ${buscaResposta}` : undefined,
                        profissional: usuarioAtual,
                        logoPngUrl: logoPngUrl || undefined
                      });
                    }}
                    className="p-2 rounded-xl glass-button text-slate-600 dark:text-slate-300 hover:text-teal-700"
                    title="Compartilhar Dossiê com todas as anamneses"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                  </button>
                </>
              )}
            </div>
          </div>

          {respostasFiltradas.length === 0 ? (
            <div className="glass-card p-12 text-center space-y-2">
              <Clock className="w-10 h-10 text-slate-400 mx-auto" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Nenhuma anamnese preenchida</h3>
              <p className="text-xs text-slate-500">
                Selecione um formulário na aba Modelos para preencher e salvar respostas de pacientes.
              </p>
            </div>
          ) : (
            <div className="glass-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-slate-200/60 dark:border-white/[0.08] bg-slate-50/50 dark:bg-white/[0.02] text-slate-400">
                    <tr>
                      <th className="py-3 px-4 font-semibold">Paciente</th>
                      <th className="py-3 px-4 font-semibold">Formulário</th>
                      <th className="py-3 px-4 font-semibold">Data do Preenchimento</th>
                      <th className="py-3 px-4 font-semibold">Questões Respondidas</th>
                      <th className="py-3 px-4 text-right font-semibold">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200/50 dark:divide-white/[0.05]">
                    {respostasFiltradas.map(resposta => {
                      const isFicha = Boolean(resposta.dadosFichaJson || resposta.modeloId === MODELO_FICHA_AVALIACAO_CAPILAR_ID);
                      let sessoesQtd = 0;
                      if (resposta.sessoesJson) {
                        try { sessoesQtd = JSON.parse(resposta.sessoesJson).length; } catch {}
                      }

                      return (
                        <tr 
                          key={resposta.id}
                          className="hover:bg-white/40 dark:hover:bg-white/[0.02] transition-colors"
                        >
                          <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                            <div className="flex items-center gap-2">
                              <span>{resposta.pacienteNome}</span>
                              {resposta.status === 'rascunho' ? (
                                <span className="px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300 font-bold text-[10px]">
                                  Rascunho
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-bold text-[10px]">
                                  Finalizada
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                            <div className="flex items-center gap-1.5">
                              <span>{resposta.modeloTitulo}</span>
                              {sessoesQtd > 0 && (
                                <span className="px-2 py-0.5 rounded-full bg-teal-500/15 text-teal-700 dark:text-teal-300 font-bold text-[10px]">
                                  {sessoesQtd} {sessoesQtd === 1 ? 'sessão' : 'sessões'}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">
                            {new Date(resposta.dataPreenchimento).toLocaleString('pt-BR')}
                          </td>
                          <td className="py-3 px-4">
                            <span className="px-2 py-0.5 rounded-md glass-card text-[10px] font-mono text-teal-700 dark:text-teal-400">
                              {resposta.respostas.length} respostas
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {isFicha ? (
                                <>
                                  <button
                                    onClick={() => {
                                      try {
                                        const fData = JSON.parse(resposta.dadosFichaJson || '{}');
                                        const sess = resposta.sessoesJson ? JSON.parse(resposta.sessoesJson) : [];
                                        baixarPdfFicha({
                                          ficha: fData,
                                          profissional: usuarioAtual,
                                          dataAtendimento: resposta.dataPreenchimento,
                                          sessoes: sess,
                                          logoPngUrl: logoPngUrl || undefined
                                        });
                                      } catch (e) {
                                        mostrarNotificacao('Erro ao gerar PDF da ficha.', 'erro');
                                      }
                                    }}
                                    className="glass-button p-1.5 text-teal-700 dark:text-teal-400 hover:text-teal-800"
                                    title="Baixar PDF A4 completo"
                                  >
                                    <Download className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => {
                                      try {
                                        const fData = JSON.parse(resposta.dadosFichaJson || '{}');
                                        const sess = resposta.sessoesJson ? JSON.parse(resposta.sessoesJson) : [];
                                        compartilharPdfFicha({
                                          ficha: fData,
                                          profissional: usuarioAtual,
                                          dataAtendimento: resposta.dataPreenchimento,
                                          sessoes: sess,
                                          logoPngUrl: logoPngUrl || undefined
                                        });
                                      } catch {
                                        mostrarNotificacao('Erro ao compartilhar PDF.', 'erro');
                                      }
                                    }}
                                    className="glass-button p-1.5 text-slate-600 dark:text-slate-300 hover:text-teal-700"
                                    title="Compartilhar PDF"
                                  >
                                    <Share2 className="w-3.5 h-3.5" />
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button
                                    onClick={() => {
                                      try {
                                        baixarPdfRespostaAnamnese({
                                          resposta,
                                          profissional: usuarioAtual,
                                          logoPngUrl: logoPngUrl || undefined
                                        });
                                      } catch {
                                        mostrarNotificacao('Erro ao gerar PDF da anamnese.', 'erro');
                                      }
                                    }}
                                    className="glass-button p-1.5 text-teal-700 dark:text-teal-400 hover:text-teal-800"
                                    title="Baixar Laudo em PDF (A4)"
                                  >
                                    <Download className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => {
                                      try {
                                        compartilharPdfRespostaAnamnese({
                                          resposta,
                                          profissional: usuarioAtual,
                                          logoPngUrl: logoPngUrl || undefined
                                        });
                                      } catch {
                                        mostrarNotificacao('Erro ao compartilhar PDF.', 'erro');
                                      }
                                    }}
                                    className="glass-button p-1.5 text-slate-600 dark:text-slate-300 hover:text-teal-700"
                                    title="Compartilhar Laudo em PDF"
                                  >
                                    <Share2 className="w-3.5 h-3.5" />
                                  </button>
                                </>
                              )}
                              {resposta.status === 'rascunho' && isFicha && (
                                <button
                                  onClick={() => handleAbrirEditarFichaSalva(resposta)}
                                  className="glass-button p-1.5 text-amber-600 hover:text-amber-700"
                                  title="Continuar preenchendo rascunho"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                              )}
                              <button
                                onClick={() => setRespostaVisualizacao(resposta)}
                                className="glass-button p-1.5 text-teal-700 dark:text-teal-400 hover:text-teal-800"
                                title="Visualizar laudo completo da anamnese"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleExcluirResposta(resposta.id)}
                                className="glass-button p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-500/10"
                                title="Excluir registro"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ======================================================================== */}
      {/* MODAL: VISUALIZAÇÃO COMPLETA & IMPRESSÃO DA ANAMNESE PREENCHIDA */}
      {/* ======================================================================== */}
      {respostaVisualizacao && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-slate-950/70 backdrop-blur-sm overflow-y-auto animate-fadeIn">
          <div className="glass-card max-w-3xl w-full max-h-[90vh] overflow-y-auto rounded-3xl p-5 sm:p-8 space-y-6 shadow-2xl my-auto">
            {/* Header da Visualização */}
            <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-200/60 dark:border-white/[0.08]">
              <div>
                <span className="px-2 py-0.5 rounded-md glass-card text-[10px] font-mono text-teal-700 dark:text-teal-400 font-bold uppercase">
                  Laudo de Anamnese Tricológica
                </span>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white mt-1">
                  {respostaVisualizacao.modeloTitulo}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Paciente: <strong className="text-slate-800 dark:text-slate-200">{respostaVisualizacao.pacienteNome}</strong> · Realizada em {new Date(respostaVisualizacao.dataPreenchimento).toLocaleDateString('pt-BR')}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="glass-button p-2 text-slate-600 dark:text-slate-300 hover:text-teal-700 dark:hover:text-teal-400"
                  title="Imprimir Laudo de Anamnese"
                >
                  <Printer className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setRespostaVisualizacao(null)}
                  className="glass-button p-2 text-slate-400 hover:text-slate-700 dark:hover:text-white"
                  title="Fechar"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Se for Ficha de Avaliação Capilar completa */}
            {respostaVisualizacao.dadosFichaJson ? (() => {
              let fData: FichaAvaliacaoCapilarData;
              try {
                fData = JSON.parse(respostaVisualizacao.dadosFichaJson);
              } catch {
                fData = { nomeCliente: respostaVisualizacao.pacienteNome, sexo: 'Outro' };
              }
              let sessoesList: SessaoEvolucaoFicha[] = [];
              if (respostaVisualizacao.sessoesJson) {
                try {
                  sessoesList = JSON.parse(respostaVisualizacao.sessoesJson);
                } catch {}
              }

              return (
                <div className="space-y-6">
                  {/* Barra de Ações do PDF e Edição */}
                  <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-900">
                    <div className="flex items-center gap-2">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                        respostaVisualizacao.status === 'rascunho'
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                          : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                      }`}>
                        {respostaVisualizacao.status === 'rascunho' ? 'Rascunho em Andamento' : 'Ficha Finalizada'}
                      </span>
                      <span className="text-xs text-slate-500 font-mono">
                        {sessoesList.length} {sessoesList.length === 1 ? 'sessão de evolução' : 'sessões de evolução'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {respostaVisualizacao.status === 'rascunho' && (
                        <button
                          type="button"
                          onClick={() => {
                            setRespostaVisualizacao(null);
                            handleAbrirEditarFichaSalva(respostaVisualizacao);
                          }}
                          className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold flex items-center gap-1.5 transition-colors"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Continuar Preenchendo</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => baixarPdfFicha({
                          ficha: fData,
                          profissional: usuarioAtual,
                          dataAtendimento: respostaVisualizacao.dataPreenchimento,
                          sessoes: sessoesList,
                          logoPngUrl: logoPngUrl || undefined
                        })}
                        className="px-3.5 py-1.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Baixar PDF (A4)</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => compartilharPdfFicha({
                          ficha: fData,
                          profissional: usuarioAtual,
                          dataAtendimento: respostaVisualizacao.dataPreenchimento,
                          sessoes: sessoesList,
                          logoPngUrl: logoPngUrl || undefined
                        })}
                        className="px-3 py-1.5 rounded-xl border border-teal-300 dark:border-teal-700 text-teal-800 dark:text-teal-300 hover:bg-teal-100/50 text-xs font-bold flex items-center gap-1.5 transition-colors"
                      >
                        <Share2 className="w-3.5 h-3.5" />
                        <span>Compartilhar</span>
                      </button>

                      {onAvancarParaTricoscopia && (
                        <button
                          type="button"
                          onClick={() => {
                            const pacObj = pacientes.find(p => p.id === respostaVisualizacao.pacienteId) || {
                              id: respostaVisualizacao.pacienteId,
                              nome: respostaVisualizacao.pacienteNome
                            };
                            setRespostaVisualizacao(null);
                            onAvancarParaTricoscopia(pacObj as Paciente);
                          }}
                          className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-teal-700 to-emerald-600 hover:from-teal-800 hover:to-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm"
                          title="Avançar com este paciente para a Tricoscopia (Passo 3)"
                        >
                          <Camera className="w-3.5 h-3.5" />
                          <span>Iniciar Tricoscopia (Passo 3) ➜</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Detalhamento das 8 Etapas */}
                  <div className="space-y-4 text-xs">
                    {/* 1. Dados do Cliente */}
                    <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
                      <h4 className="font-bold text-teal-700 dark:text-teal-400 uppercase tracking-wider text-[11px]">
                        1. Dados do Cliente
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-700 dark:text-slate-300">
                        <div><strong>Nome:</strong> {fData.nomeCliente || '—'}</div>
                        <div><strong>Nascimento:</strong> {fData.dataNascimento || '—'} {fData.idadeCalculada ? `(${fData.idadeCalculada})` : ''}</div>
                        <div><strong>Sexo:</strong> {fData.sexo || '—'}</div>
                        <div><strong>Estado Civil:</strong> {fData.estadoCivil || '—'}</div>
                        <div><strong>Celular:</strong> {fData.celular || '—'}</div>
                        <div><strong>E-mail:</strong> {fData.email || '—'}</div>
                        <div><strong>Profissão:</strong> {fData.profissao || '—'}</div>
                        <div><strong>CEP / Endereço:</strong> {fData.cep || '—'} • {fData.endereco || '—'} {fData.cidade ? `(${fData.cidade}/${fData.estado})` : ''}</div>
                        {(fData.cpf || fData.tipoSanguineo || fData.etnia) && (
                          <div className="sm:col-span-2 pt-1 border-t border-slate-100 dark:border-slate-800 text-slate-500">
                            CPF: {fData.cpf || '—'} • Sangue: {fData.tipoSanguineo || '—'} • Etnia: {fData.etnia || '—'}
                          </div>
                        )}
                        <div className="sm:col-span-2 text-slate-500">
                          <strong>Como nos conheceu:</strong> {fData.comoConheceu || '—'} {fData.comoConheceuOutro ? `(${fData.comoConheceuOutro})` : ''}
                        </div>
                      </div>
                    </div>

                    {/* 2. Queixa */}
                    <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1.5">
                      <h4 className="font-bold text-teal-700 dark:text-teal-400 uppercase tracking-wider text-[11px]">
                        2. Queixa Principal
                      </h4>
                      <p className="text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed">
                        {fData.queixaPrincipal || 'Nenhuma queixa descrita.'}
                      </p>
                    </div>

                    {/* 3. Saúde */}
                    <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
                      <h4 className="font-bold text-teal-700 dark:text-teal-400 uppercase tracking-wider text-[11px]">
                        3. Histórico de Saúde
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-700 dark:text-slate-300">
                        <div><strong>Doenças graves:</strong> {fData.doencasGraves?.sim ? `Sim — ${fData.doencasGraves.qual || ''}` : 'Não'}</div>
                        <div><strong>Cirurgias:</strong> {fData.cirurgias?.sim ? `Sim — ${fData.cirurgias.qual || ''}` : 'Não'}</div>
                        <div><strong>COVID / Vacina:</strong> {fData.covid?.teveCovid ? `Sim (${fData.covid.doses || 0} doses)` : 'Não'}</div>
                        <div><strong>Histórico familiar:</strong> {fData.doencaFamiliar?.sim ? `Sim — ${fData.doencaFamiliar.qual || ''}` : 'Não'}</div>
                        <div><strong>Queloide:</strong> {fData.queloide?.sim ? `Sim — ${fData.queloide.qual || ''}` : 'Não'}</div>
                        <div><strong>Tratamento atual:</strong> {fData.tratamentoAtual?.sim ? `Sim — ${fData.tratamentoAtual.qual || ''}` : 'Não'}</div>
                        <div><strong>Endócrino:</strong> {fData.problemaEndocrino?.sim ? `Sim — ${fData.problemaEndocrino.qual || ''}` : 'Não'}</div>
                        <div><strong>Cardíaco:</strong> {fData.problemaCardiaco?.sim ? `Sim — ${fData.problemaCardiaco.qual || ''}` : 'Não'}</div>
                        <div><strong>Marcapasso:</strong> {fData.marcapasso ? 'Sim' : 'Não'}</div>
                        <div><strong>Próteses:</strong> {fData.protese?.sim ? `Sim — ${fData.protese.qual || ''}` : 'Não'}</div>
                        <div><strong>Medicação contínua:</strong> {fData.medicacaoContinua?.sim ? `Sim — ${fData.medicacaoContinua.qual || ''}` : 'Não'}</div>
                        <div><strong>Alergias:</strong> {fData.alergias?.sim ? `Sim — ${fData.alergias.qual || ''}` : 'Não'}</div>
                        <div><strong>Digestivo / Intestinal:</strong> {fData.problemasDigestivos?.sim ? 'Sim' : 'Não'} / {fData.problemasIntestinais?.sim ? 'Sim' : 'Não'}</div>
                      </div>
                    </div>

                    {/* 4. Hábitos */}
                    <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
                      <h4 className="font-bold text-teal-700 dark:text-teal-400 uppercase tracking-wider text-[11px]">
                        4. Hábitos e Sono
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-700 dark:text-slate-300">
                        <div><strong>Exercício:</strong> {fData.exercicioFisico?.sim ? `Sim (${fData.exercicioFisico.qualFrequencia || ''})` : 'Não'}</div>
                        <div><strong>Álcool:</strong> {fData.bebidaAlcoolica || '—'}</div>
                        <div><strong>Fuma:</strong> {fData.fuma ? 'Sim' : 'Não'}</div>
                        <div><strong>Drogas recreativas:</strong> {fData.drogasRecreativas?.sim ? `Sim — ${fData.drogasRecreativas.qual || ''}` : 'Não'}</div>
                        <div><strong>IST:</strong> {fData.ist?.sim ? `Sim — ${fData.ist.qual || ''}` : 'Não'}</div>
                        <div><strong>Sono:</strong> {fData.sono?.dormeAs || '—'} até {fData.sono?.acordaAs || '—'} {fData.sono?.horasCalculadas ? `(${fData.sono.horasCalculadas})` : ''}</div>
                      </div>
                    </div>

                    {/* 5. Saúde Feminina */}
                    {fData.sexo === 'Feminino' && (
                      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
                        <h4 className="font-bold text-teal-700 dark:text-teal-400 uppercase tracking-wider text-[11px]">
                          5. Saúde Feminina
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-700 dark:text-slate-300">
                          <div><strong>Alteração menstrual:</strong> {fData.alteracaoMenstrual?.sim ? `Sim — ${fData.alteracaoMenstrual.qual || ''}` : 'Não'}</div>
                          <div><strong>Filhos:</strong> {fData.temFilhos?.sim ? `Sim (${fData.temFilhos.quantos || '1'})` : 'Não'}</div>
                          <div><strong>Perda gestacional:</strong> {fData.perdaGestacional?.sim ? `Sim — ${fData.perdaGestacional.data || ''}` : 'Não'}</div>
                          <div><strong>Última gravidez:</strong> {fData.dataUltimaGravidez || '—'}</div>
                          <div><strong>Queixa na gravidez:</strong> {fData.queixaNaGravidez?.sim ? `Sim — ${fData.queixaNaGravidez.qual || ''}` : 'Não'}</div>
                          <div><strong>SOP:</strong> {fData.sop ? 'Sim' : 'Não'}</div>
                        </div>
                      </div>
                    )}

                    {/* 6. Cabelo e Rotina */}
                    <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
                      <h4 className="font-bold text-teal-700 dark:text-teal-400 uppercase tracking-wider text-[11px]">
                        6. Cabelo, Químicas e Rotina
                      </h4>
                      <div className="space-y-1.5 text-slate-700 dark:text-slate-300">
                        <div><strong>Químicas (3 a 12 meses):</strong> {(fData.quimicas || []).join(', ') || 'Nenhuma'} {fData.quimicasOutras ? `(${fData.quimicasOutras})` : ''}</div>
                        <div><strong>Hábitos e tração:</strong> {(fData.habitosAdornos || []).join(', ') || 'Nenhum'} {fData.habitosAdornosLivre ? `(${fData.habitosAdornosLivre})` : ''}</div>
                        <div><strong>Lavagem e secagem:</strong> Lavagem {fData.frequenciaLavagem || '—'} • Água {fData.temperaturaAgua || '—'} • Secagem {fData.secagem || '—'} • Chapinha {fData.chapinhaBabyliss || '—'}</div>
                        {fData.higienizacaoLivre && <div><strong>Notas de rotina:</strong> {fData.higienizacaoLivre}</div>}
                      </div>
                    </div>

                    {/* 7. Avaliação da Profissional */}
                    <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
                      <h4 className="font-bold text-teal-700 dark:text-teal-400 uppercase tracking-wider text-[11px]">
                        7. Avaliação & Conduta da Profissional
                      </h4>
                      {fData.anotacoesProfissional && (
                        <div><strong>Anotações:</strong> <p className="whitespace-pre-wrap mt-0.5">{fData.anotacoesProfissional}</p></div>
                      )}
                      {fData.tratamentoSugerido && (
                        <div><strong>Tratamento sugerido:</strong> <p className="whitespace-pre-wrap mt-0.5">{fData.tratamentoSugerido}</p></div>
                      )}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 border-t border-slate-100 dark:border-slate-800">
                        <div><strong>Coleta microscopia:</strong> {fData.coletaMicroscopia?.sim ? `Sim (${fData.coletaMicroscopia.dataEnvio || '—'})` : 'Não'}</div>
                        <div><strong>Nutracêuticos:</strong> {fData.indicacaoNutraceuticos?.sim ? `Sim (${fData.indicacaoNutraceuticos.sugerido || '—'})` : 'Não'}</div>
                      </div>
                    </div>

                    {/* 8. Declaração & Assinatura */}
                    <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
                      <h4 className="font-bold text-teal-700 dark:text-teal-400 uppercase tracking-wider text-[11px]">
                        8. Declaração e Assinatura do Cliente
                      </h4>
                      <p className="italic text-slate-500 text-[11px]">
                        "As declarações aqui contidas representam a expressão da verdade, não cabendo ao profissional qualquer responsabilidade por dados omitidos ou enganosos."
                      </p>
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                        <div>
                          <span className="text-[11px] text-slate-400 block">Local e Data:</span>
                          <span className="font-bold text-slate-800 dark:text-slate-200">{fData.cidadeData || '—'}</span>
                        </div>
                        {fData.assinaturaClienteBase64 ? (
                          <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                            <img
                              src={fData.assinaturaClienteBase64}
                              alt="Assinatura do Cliente"
                              className="h-12 max-w-[200px] object-contain"
                            />
                            <span className="text-[10px] text-slate-400 block text-center mt-1">Assinado digitalmente</span>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">Sem assinatura desenhada</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* ========================================================= */}
                  {/* SEÇÃO DE SESSÕES & FOLHA DE EVOLUÇÃO DA FICHA */}
                  {/* ========================================================= */}
                  <div className="p-5 rounded-3xl bg-slate-50 dark:bg-slate-950 border border-teal-200 dark:border-teal-900/60 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
                      <div>
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                          <Layers className="w-4 h-4 text-teal-600" />
                          <span>Sessões & Folha de Evolução Clínica</span>
                        </h4>
                        <p className="text-[11px] text-slate-500">
                          Registre cada retorno e procedimento. As sessões entram em tabela na página extra do PDF.
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setSessaoData(new Date().toISOString().split('T')[0]);
                          setSessaoTratamento('');
                          setSessaoAssinatura(undefined);
                          setModalNovaSessaoAberto(true);
                        }}
                        className="px-4 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs shrink-0"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Registrar Sessão</span>
                      </button>
                    </div>

                    {sessoesList.length === 0 ? (
                      <div className="p-6 text-center rounded-2xl bg-white dark:bg-slate-900 border border-dashed border-slate-300 dark:border-slate-800 space-y-2">
                        <Clock className="w-8 h-8 text-slate-300 dark:text-slate-700 mx-auto" />
                        <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                          Nenhuma sessão registrada nesta ficha ainda
                        </p>
                        <p className="text-[11px] text-slate-400 max-w-md mx-auto">
                          Clique no botão "Registrar Sessão" para registrar o tratamento realizado e colher a assinatura do cliente na tela.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {sessoesList.map((sess, sIdx) => (
                          <div
                            key={sess.id || sIdx}
                            className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-xs"
                          >
                            <div className="space-y-1 flex-1">
                              <div className="flex items-center gap-2">
                                <span className="px-2.5 py-0.5 rounded-full bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-300 font-bold text-[10px]">
                                  Sessão #{sess.numeroSessao || sIdx + 1}
                                </span>
                                <span className="font-mono text-slate-400 text-[11px]">
                                  {sess.data ? new Date(sess.data + 'T00:00:00').toLocaleDateString('pt-BR') : 'Data não informada'}
                                </span>
                              </div>
                              <p className="text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed">
                                {sess.tratamentoRealizado}
                              </p>
                            </div>

                            <div className="shrink-0 border-t sm:border-t-0 sm:border-l border-slate-100 dark:border-slate-800 pt-2 sm:pt-0 sm:pl-3">
                              {sess.assinaturaClienteBase64 ? (
                                <div className="text-center">
                                  <img
                                    src={sess.assinaturaClienteBase64}
                                    alt="Assinatura"
                                    className="h-10 max-w-[130px] object-contain mx-auto"
                                  />
                                  <span className="text-[9px] text-slate-400 block mt-0.5">Assinatura cliente</span>
                                </div>
                              ) : (
                                <span className="text-[10px] text-slate-400 italic">Sem assinatura</span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })() : (
              /* Visualizador Padrão de Outras Anamneses */
              <div className="space-y-5">
                {/* Barra de Ações para Anamnese Geral */}
                <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-900">
                  <div className="flex items-center gap-2">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                      respostaVisualizacao.status === 'rascunho'
                        ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                        : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                    }`}>
                      {respostaVisualizacao.status === 'rascunho' ? 'Rascunho' : 'Finalizada'}
                    </span>
                    <span className="text-xs text-slate-500 font-mono">
                      {respostaVisualizacao.respostas.length} questões respondidas
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => baixarPdfRespostaAnamnese({
                        resposta: respostaVisualizacao,
                        profissional: usuarioAtual,
                        logoPngUrl: logoPngUrl || undefined
                      })}
                      className="px-3.5 py-1.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Baixar PDF (A4)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => compartilharPdfRespostaAnamnese({
                        resposta: respostaVisualizacao,
                        profissional: usuarioAtual,
                        logoPngUrl: logoPngUrl || undefined
                      })}
                      className="px-3 py-1.5 rounded-xl border border-teal-300 dark:border-teal-700 text-teal-800 dark:text-teal-300 hover:bg-teal-100/50 text-xs font-bold flex items-center gap-1.5 transition-colors"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                      <span>Compartilhar</span>
                    </button>

                    {onAvancarParaTricoscopia && (
                      <button
                        type="button"
                        onClick={() => {
                          const pacObj = pacientes.find(p => p.id === respostaVisualizacao.pacienteId) || {
                            id: respostaVisualizacao.pacienteId,
                            nome: respostaVisualizacao.pacienteNome
                          };
                          setRespostaVisualizacao(null);
                          onAvancarParaTricoscopia(pacObj as Paciente);
                        }}
                        className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-teal-700 to-emerald-600 hover:from-teal-800 hover:to-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm"
                        title="Avançar com este paciente para a Tricoscopia (Passo 3)"
                      >
                        <Camera className="w-3.5 h-3.5" />
                        <span>Iniciar Tricoscopia (Passo 3) ➜</span>
                      </button>
                    )}
                  </div>
                </div>

                <div className="space-y-4">
                  {respostaVisualizacao.respostas.map((item, idx) => (
                    <div key={idx} className="p-3.5 rounded-2xl glass-card space-y-1">
                      <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                        {idx + 1}. {item.perguntaTitulo}
                      </span>
                      <div className="text-xs font-bold text-slate-900 dark:text-white pl-1">
                        {Array.isArray(item.valor) ? (
                          <ul className="list-disc list-inside space-y-0.5 mt-1 font-normal">
                            {item.valor.map((val, i) => (
                              <li key={i}>{val}</li>
                            ))}
                          </ul>
                        ) : (
                          <span>{String(item.valor || 'Não informado')}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {respostaVisualizacao.anotacoesEspecialista && (
                  <div className="p-4 rounded-2xl bg-teal-500/10 border border-teal-500/20 space-y-1">
                    <span className="text-xs font-bold text-teal-700 dark:text-teal-300 flex items-center gap-1.5">
                      <Award className="w-3.5 h-3.5" />
                      Parecer Clínico do Especialista
                    </span>
                    <p className="text-xs text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                      {respostaVisualizacao.anotacoesEspecialista}
                    </p>
                  </div>
                )}
              </div>
            )}

            <div className="pt-2 flex items-center justify-end">
              <button
                onClick={() => setRespostaVisualizacao(null)}
                className="px-5 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-semibold text-xs"
              >
                Concluir Visualização
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================================== */}
      {/* MODAL: CADASTRO RÁPIDO DE PACIENTE */}
      {/* ======================================================================== */}
      {modalNovoPaciente && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-slate-950/70 backdrop-blur-sm overflow-y-auto animate-fadeIn">
          <form 
            onSubmit={handleCadastrarNovoPacienteRapido}
            className="glass-card max-w-md w-full rounded-3xl p-5 sm:p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto my-auto"
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-200/60 dark:border-white/[0.08]">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-teal-700 dark:text-teal-400" />
                <span>Cadastro Rápido de Paciente</span>
              </h3>
              <button
                type="button"
                onClick={() => setModalNovoPaciente(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Nome Completo *
                </label>
                <input
                  type="text"
                  value={novoPacienteNome}
                  onChange={(e) => setNovoPacienteNome(e.target.value)}
                  placeholder="Ex: Mariana Silva Alencar"
                  required
                  className="w-full glass-input px-3.5 py-2 text-xs text-slate-900 dark:text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Telefone / WhatsApp
                </label>
                <input
                  type="tel"
                  value={novoPacienteTelefone}
                  onChange={(e) => setNovoPacienteTelefone(e.target.value)}
                  placeholder="(11) 98765-4321"
                  className="w-full glass-input px-3.5 py-2 text-xs text-slate-900 dark:text-white"
                />
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setModalNovoPaciente(false)}
                className="px-3.5 py-2 rounded-xl glass-button text-xs text-slate-600 dark:text-slate-300"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={salvandoNovoPaciente || !novoPacienteNome.trim()}
                className="px-4 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-semibold text-xs disabled:opacity-50"
              >
                {salvandoNovoPaciente ? 'Salvando...' : 'Cadastrar e Selecionar'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ======================================================================== */}
      {/* MODAL: REGISTRAR SESSÃO / FOLHA DE EVOLUÇÃO NA FICHA */}
      {/* ======================================================================== */}
      {modalNovaSessaoAberto && respostaVisualizacao && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-slate-950/75 backdrop-blur-sm overflow-y-auto animate-fadeIn">
          <form 
            onSubmit={handleSalvarNovaSessao}
            className="glass-card max-w-lg w-full rounded-3xl p-5 sm:p-7 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto my-auto"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-200/60 dark:border-white/[0.08]">
              <div>
                <span className="px-2 py-0.5 rounded-full bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-300 text-[10px] font-bold uppercase">
                  Folha de Evolução Clínica
                </span>
                <h3 className="text-base font-bold text-slate-900 dark:text-white mt-1 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-teal-600" />
                  <span>Registrar Sessão de Retorno</span>
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setModalNovaSessaoAberto(false)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Sessão nº e Data */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Sessão Nº (Automático)
                  </label>
                  <div className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold text-teal-800 dark:text-teal-300 font-mono border border-slate-200 dark:border-slate-700">
                    Sessão #{(() => {
                      try {
                        const lista = respostaVisualizacao.sessoesJson ? JSON.parse(respostaVisualizacao.sessoesJson) : [];
                        return lista.length + 1;
                      } catch {
                        return 1;
                      }
                    })()}
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Data da Sessão *
                  </label>
                  <input
                    type="date"
                    value={sessaoData}
                    onChange={(e) => setSessaoData(e.target.value)}
                    required
                    className="w-full glass-input px-3.5 py-2 text-xs text-slate-900 dark:text-white font-mono"
                  />
                </div>
              </div>

              {/* Tratamento Realizado */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Tratamento Realizado / Evolução Clínica *
                </label>
                <textarea
                  value={sessaoTratamento}
                  onChange={(e) => setSessaoTratamento(e.target.value)}
                  placeholder="Descreva detalhadamente o procedimento, produtos/ativos aplicados, fotobiomodulação (LED/Laser), massagem epicraniana, microagulhamento ou resposta clínica observada..."
                  required
                  rows={4}
                  className="w-full glass-input p-3 text-xs text-slate-900 dark:text-white leading-relaxed resize-none"
                />
              </div>

              {/* Assinatura do Cliente na Tela */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Assinatura do Cliente na Tela
                  </label>
                  <button
                    type="button"
                    onClick={limparAssinaturaSessao}
                    className="text-[11px] font-bold text-rose-600 hover:text-rose-700"
                  >
                    Limpar
                  </button>
                </div>

                <div className="w-full bg-slate-50 dark:bg-slate-950 border border-dashed border-slate-300 dark:border-slate-700 rounded-2xl overflow-hidden touch-none relative">
                  <canvas
                    ref={canvasSessaoRef}
                    width={500}
                    height={150}
                    className="w-full h-32 cursor-crosshair block"
                    onMouseDown={iniciarDesenhoSessao}
                    onMouseMove={desenharSessao}
                    onMouseUp={finalizarDesenhoSessao}
                    onTouchStart={iniciarDesenhoSessao}
                    onTouchMove={desenharSessao}
                    onTouchEnd={finalizarDesenhoSessao}
                  />
                  {!sessaoAssinatura && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-slate-400 text-xs font-medium">
                      ✍️ Desenhe ou assine com o dedo ou mouse aqui
                    </div>
                  )}
                </div>
                <p className="text-[11px] text-slate-400">
                  A assinatura fica vinculada ao registro da sessão e sai na tabela da página extra do PDF.
                </p>
              </div>
            </div>

            <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-200/60 dark:border-white/[0.08]">
              <button
                type="button"
                onClick={() => setModalNovaSessaoAberto(false)}
                className="px-4 py-2 rounded-xl glass-button text-xs text-slate-600 dark:text-slate-300"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={salvandoNovaSessao || !sessaoTratamento.trim()}
                className="px-5 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs flex items-center gap-1.5 shadow-md transition-all disabled:opacity-50"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{salvandoNovaSessao ? 'Registrando...' : 'Salvar Sessão'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ======================================================================== */}
      {/* MODAL: LIMITE DE ANAMNESES DO PLANO STARTER */}
      {/* ======================================================================== */}
      {modalLimitePlano && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-slate-950/75 backdrop-blur-sm overflow-y-auto animate-fadeIn">
          <div className="glass-card max-w-md w-full rounded-3xl p-6 sm:p-7 space-y-4 shadow-2xl my-auto text-center">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center mx-auto text-amber-600 dark:text-amber-400">
              <Lock className="w-6 h-6" />
            </div>

            <div className="space-y-1">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Limite do Plano Starter Atingido
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                O plano <strong>Starter Degustação</strong> inclui até <strong>3 fichas/anamneses</strong> no total.
                Você já atingiu esse limite. Para continuar criando fichas ilimitadas e registrando sessões sem restrições, faça o upgrade para o plano Pro ou Master.
              </p>
            </div>

            <div className="pt-2 flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => setModalLimitePlano(false)}
                className="px-5 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs transition-colors"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================================== */}
      {/* MODAL: PERSONALIZAR LOGO EM PNG NO DOCUMENTO EM PDF */}
      {/* ======================================================================== */}
      {modalLogoAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-sm overflow-y-auto animate-fadeIn">
          <div className="glass-card max-w-md w-full rounded-3xl p-6 sm:p-7 space-y-4 shadow-2xl my-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200/60 dark:border-white/[0.08]">
              <div>
                <span className="px-2 py-0.5 rounded-full bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-300 text-[10px] font-bold uppercase">
                  Personalização de PDF
                </span>
                <h3 className="text-base font-bold text-slate-900 dark:text-white mt-1 flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-teal-600" />
                  <span>Logo em PNG no Documento</span>
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setModalLogoAberto(false)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Insira a logo da sua clínica ou consultório para estampar no cabeçalho de todas as fichas e laudos em PDF gerados pelo sistema. Recomendamos o formato <strong>PNG com fundo transparente</strong>.
              </p>

              {/* Pré-visualização da Logo Atual */}
              {logoPngUrl ? (
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-teal-200 dark:border-teal-900/60 space-y-3 text-center">
                  <span className="text-[10px] uppercase font-bold text-teal-700 dark:text-teal-400 tracking-wider block">
                    Logo Atual Ativa no PDF
                  </span>
                  <div className="w-36 h-24 mx-auto rounded-xl bg-white dark:bg-slate-900 border border-dashed border-slate-300 dark:border-slate-700 p-2 flex items-center justify-center shadow-xs">
                    <img
                      src={logoPngUrl}
                      alt="Logo em PNG"
                      className="max-h-full max-w-full object-contain"
                    />
                  </div>
                  <div className="flex items-center justify-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={handleRemoverLogoPng}
                      className="px-3 py-1.5 rounded-xl border border-rose-200 dark:border-rose-900/60 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Remover Logo</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-dashed border-slate-300 dark:border-slate-800 text-center space-y-2">
                  <ImageIcon className="w-10 h-10 text-slate-400 mx-auto" />
                  <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Nenhuma logo PNG configurada
                  </p>
                  <p className="text-[11px] text-slate-400">
                    Os laudos usarão o cabeçalho textual padrão com os dados cadastrados no seu perfil.
                  </p>
                </div>
              )}

              {/* Input para carregar arquivo PNG */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
                  Selecionar arquivo PNG do dispositivo:
                </label>
                <input
                  type="file"
                  accept=".png,image/png"
                  onChange={handleUploadLogoPng}
                  disabled={carregandoLogo}
                  className="w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-teal-50 dark:file:bg-teal-950 file:text-teal-700 dark:file:text-teal-300 hover:file:bg-teal-100 cursor-pointer"
                />
              </div>
            </div>

            <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-200/60 dark:border-white/[0.08]">
              <button
                type="button"
                onClick={() => setModalLogoAberto(false)}
                className="px-5 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs transition-colors"
              >
                Concluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
