import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, 
  UserPlus, 
  Search, 
  Calendar, 
  Phone, 
  FileText, 
  Camera, 
  Clock, 
  ChevronRight, 
  Edit3, 
  Trash2, 
  X, 
  Check, 
  Sparkles, 
  Microscope, 
  Flame, 
  Hash, 
  AlertCircle,
  ExternalLink,
  PlusCircle,
  ArrowRight,
  GitCompare,
  Eye,
  EyeOff,
  MessageCircle,
  UserCheck,
  Lock,
  Send,
  Pill,
  Download,
  Share2,
  Layers,
  MapPin,
  Upload,
  Image as ImageIcon,
  Loader2,
  Plus
} from 'lucide-react';
import { Paciente, ConsultaRegistro, FotoRegistroConsulta, FotoGlobalPaciente, AnguloFotoGlobal } from '../types/paciente';
import { RespostaAnamnese } from '../types/anamnese';
import { listRespostasDoPaciente } from '../services/anamneseService';
import { baixarPdfFicha, compartilharPdfFicha } from '../services/fichaPdfGenerator';
import { MODELO_FICHA_AVALIACAO_CAPILAR_ID } from '../data/anamneseTemplates';
import { useAuth } from '../context/AuthContext';
import { 
  listPacientes, 
  savePaciente, 
  deletePaciente, 
  getConsultasDoPaciente, 
  saveConsultaAvulsa,
  deleteConsultaAvulsa,
  alternarLiberacaoConsulta,
  listFotosGlobaisDoPaciente,
  saveFotoGlobalDoPaciente,
  deleteFotoGlobalDoPaciente,
  alternarLiberacaoFotoGlobal
} from '../services/pacientes';
import { arquivoParaDataURL } from '../utils/imageStore';
import { Session, getSession } from '../services/annotations';
import { ModalConvitePortal } from './ModalConvitePortal';
import { ModalProdutoIndicado } from './ModalProdutoIndicado';
import { ProdutoIndicado } from '../types/portal';
import { 
  listarProdutosDoPaciente, 
  alternarLiberacaoProduto, 
  excluirProdutoPaciente 
} from '../services/produtosPacienteService';
import { profissionalTemAcessoPortal, NIVEL_MINIMO_PORTAL } from '../config/portalConfig';
import { ExamesView } from './ExamesView';
import { ProtocoloPaciente } from '../types/protocolo';
import { listarProtocolosDoPaciente } from '../services/protocolosService';
import { HistoricoClinicoView } from './HistoricoClinicoView';
import { ComparadorPacienteView } from './ComparadorPacienteView';

interface PacientesViewProps {
  onIniciarCapturaPaciente: (paciente: Paciente) => void;
  onCarregarSessaoNaBancada: (sessionId: string) => void;
  onAbrirComparador?: (fotoAUrl: string, fotoBUrl: string, labelA: string, labelB: string) => void;
  onIniciarAnamnese?: (paciente: Paciente) => void;
  onNavegarParaPlanos?: () => void;
  pacienteAtivoId?: string | null;
  onDefinirPacienteAtivo?: (paciente: Paciente) => void;
  abaInicial?: 'geral' | 'historico' | 'comparador' | 'exames';
}

export const ANGULOS_FOTO_GLOBAL: AnguloFotoGlobal[] = [
  'Linha Frontal',
  'Vértex / Coroa',
  'Lateral Direita',
  'Lateral Esquerda',
  'Posterior / Occipital',
  'Topo da Cabeça',
  'Visão Geral / Livre'
];

export const TIPOS_CONSULTA_PADRAO = [
  'Consulta de Retorno',
  'Primeira Avaliação',
  'Sessão de Tratamento Capilar',
  'Avaliação de Evolução (Antes/Depois)',
  'Manutenção / Pós-Procedimento'
];

export const AREAS_CONSULTA_PADRAO = [
  'Vértice / Vértex',
  'Linha Frontal Anterior',
  'Região Parietal Direita',
  'Região Parietal Esquerda',
  'Região Occipital',
  'Coroa',
  'Geral / Múltiplas Áreas'
];

export const PacientesView: React.FC<PacientesViewProps> = ({
  onIniciarCapturaPaciente,
  onCarregarSessaoNaBancada,
  onAbrirComparador,
  onIniciarAnamnese,
  onNavegarParaPlanos,
  pacienteAtivoId,
  onDefinirPacienteAtivo,
  abaInicial
}) => {
  const { usuarioAtual } = useAuth();
  const temPermissaoPortal = profissionalTemAcessoPortal(usuarioAtual);
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [pacienteSelecionadoId, setPacienteSelecionadoId] = useState<string | null>(pacienteAtivoId || null);
  const [consultasPaciente, setConsultasPaciente] = useState<ConsultaRegistro[]>([]);
  const [carregandoConsultas, setCarregandoConsultas] = useState(false);
  const [termoBusca, setTermoBusca] = useState('');
  const [abaProntuario, setAbaProntuario] = useState<'geral' | 'historico' | 'comparador' | 'exames'>(() => abaInicial || 'geral');
  const [comparadorFotoAUrl, setComparadorFotoAUrl] = useState<string | undefined>(undefined);
  const [comparadorFotoBUrl, setComparadorFotoBUrl] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (abaInicial) {
      setAbaProntuario(abaInicial);
    }
  }, [abaInicial]);

  // Protocolos Terapêuticos do Paciente
  const [protocolosPaciente, setProtocolosPaciente] = useState<ProtocoloPaciente[]>([]);
  const [carregandoProtocolos, setCarregandoProtocolos] = useState(false);

  // Fotografias Clínicas Globais (Macroscópicas) do Paciente
  const [fotosGlobais, setFotosGlobais] = useState<FotoGlobalPaciente[]>([]);
  const [carregandoFotosGlobais, setCarregandoFotosGlobais] = useState(false);
  const [modalFotoGlobalUploadAberto, setModalFotoGlobalUploadAberto] = useState(false);
  const [formFotoGlobalAngulo, setFormFotoGlobalAngulo] = useState<AnguloFotoGlobal>('Linha Frontal');
  const [formFotoGlobalData, setFormFotoGlobalData] = useState(() => new Date().toISOString().split('T')[0]);
  const [formFotoGlobalImagemUrl, setFormFotoGlobalImagemUrl] = useState<string | null>(null);
  const [formFotoGlobalObservacoes, setFormFotoGlobalObservacoes] = useState('');
  const [formFotoGlobalLiberado, setFormFotoGlobalLiberado] = useState(false);
  const [salvandoFotoGlobal, setSalvandoFotoGlobal] = useState(false);
  const [processandoImagemGlobal, setProcessandoImagemGlobal] = useState(false);
  const [fotoGlobalParaExcluirId, setFotoGlobalParaExcluirId] = useState<string | null>(null);
  const [modalFotoGlobalAmpliada, setModalFotoGlobalAmpliada] = useState<{
    url: string;
    titulo: string;
    data: string;
    angulo: string;
    observacoes?: string;
  } | null>(null);

  // Modal de Transição de Próximo Passo do Fluxo Clínico
  const [modalProximoPassoFluxo, setModalProximoPassoFluxo] = useState<{ aberto: boolean; paciente: Paciente | null }>({
    aberto: false,
    paciente: null
  });

  // Produtos Indicados do Paciente
  const [produtosPaciente, setProdutosPaciente] = useState<ProdutoIndicado[]>([]);
  const [carregandoProdutos, setCarregandoProdutos] = useState(false);
  const [modalProdutoAberto, setModalProdutoAberto] = useState(false);
  const [produtoEmEdicao, setProdutoEmEdicao] = useState<ProdutoIndicado | null>(null);

  // Modal de Convite ao Portal do Paciente
  const [modalConviteAberto, setModalConviteAberto] = useState(false);

  // Fichas de Avaliação e Anamneses do Paciente
  const [fichasPaciente, setFichasPaciente] = useState<RespostaAnamnese[]>([]);
  const [carregandoFichas, setCarregandoFichas] = useState(false);

  // Modais
  const [modalPacienteAberto, setModalPacienteAberto] = useState(false);
  const [pacienteEmEdicao, setPacienteEmEdicao] = useState<Paciente | null>(null);

  // Exclusões seguras sem depender de window.confirm
  const [pacienteParaExcluir, setPacienteParaExcluir] = useState<{ id: string; nome: string } | null>(null);
  const [excluindoPaciente, setExcluindoPaciente] = useState(false);
  const [consultaParaExcluirId, setConsultaParaExcluirId] = useState<string | null>(null);
  const [produtoParaExcluirId, setProdutoParaExcluirId] = useState<string | null>(null);

  const [modalConsultaAberto, setModalConsultaAberto] = useState(false);
  const [modalFotoAmpliada, setModalFotoAmpliada] = useState<{ url: string; titulo: string; data: string } | null>(null);

  // Formulário Paciente
  const [formNome, setFormNome] = useState('');
  const [formTelefone, setFormTelefone] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formDataNasc, setFormDataNasc] = useState('');
  const [formGenero, setFormGenero] = useState('Feminino');
  const [formQueixa, setFormQueixa] = useState('');
  const [formHistorico, setFormHistorico] = useState('');

  // Formulário Nova Consulta (Registros Fotográficos, Anotações e Data)
  const [formConsData, setFormConsData] = useState(() => new Date().toISOString().split('T')[0]);
  const [formConsTipo, setFormConsTipo] = useState<string>('Consulta de Retorno');
  const [formConsArea, setFormConsArea] = useState<string>('Vértice / Vértex');
  const [formConsQueixa, setFormConsQueixa] = useState('');
  const [formConsConduta, setFormConsConduta] = useState('');
  const [formConsAnotacoes, setFormConsAnotacoes] = useState('');
  const [formConsFotos, setFormConsFotos] = useState<Array<{ id: string; url: string; titulo?: string; area?: string; observacoes?: string }>>([]);
  const [formConsLiberado, setFormConsLiberado] = useState(false);
  const [salvandoConsulta, setSalvandoConsulta] = useState(false);
  const [processandoFotoConsulta, setProcessandoFotoConsulta] = useState(false);
  const [modalFotoConsultaAmpliada, setModalFotoConsultaAmpliada] = useState<{ url: string; titulo: string; data: string } | null>(null);

  // Alerta de feedback
  const [alerta, setAlerta] = useState<{ tipo: 'sucesso' | 'erro'; texto: string } | null>(null);

  const mostrarAlerta = (tipo: 'sucesso' | 'erro', texto: string) => {
    setAlerta({ tipo, texto });
    setTimeout(() => setAlerta(null), 3500);
  };

  // Carregar lista de pacientes do usuário atual
  const recarregarPacientes = async () => {
    try {
      const lista = await listPacientes(usuarioAtual?.uid);
      setPacientes(lista);
      if (lista.length > 0) {
        setPacienteSelecionadoId(prev => (prev && lista.some(p => p.id === prev)) ? prev : lista[0].id);
      } else {
        setPacienteSelecionadoId(null);
      }
    } catch {
      mostrarAlerta('erro', 'Erro ao carregar lista de pacientes.');
    }
  };

  useEffect(() => {
    recarregarPacientes();
  }, [usuarioAtual?.uid]);

  // Paciente ativo atual
  const pacienteAtivo = pacientes.find(p => p.id === pacienteSelecionadoId) || null;

  // Sincronizar paciente ativo com o estado global do app
  useEffect(() => {
    if (pacienteAtivo && onDefinirPacienteAtivo) {
      onDefinirPacienteAtivo(pacienteAtivo);
    }
  }, [pacienteAtivo?.id]);

  useEffect(() => {
    if (pacienteAtivoId && pacienteAtivoId !== pacienteSelecionadoId) {
      setPacienteSelecionadoId(pacienteAtivoId);
    }
  }, [pacienteAtivoId]);

  // Carregar consultas do paciente selecionado
  useEffect(() => {
    if (!pacienteAtivo) {
      setConsultasPaciente([]);
      return;
    }

    setCarregandoConsultas(true);
    getConsultasDoPaciente(pacienteAtivo)
      .then(lista => setConsultasPaciente(lista))
      .catch(() => setConsultasPaciente([]))
      .finally(() => setCarregandoConsultas(false));

    // Ouvir evento de novas capturas salvas na bancada
    const handleRecarregarAposCaptura = () => {
      getConsultasDoPaciente(pacienteAtivo)
        .then(lista => setConsultasPaciente(lista))
        .catch(() => {});
    };

    window.addEventListener('trico-session-saved', handleRecarregarAposCaptura);
    window.addEventListener('trico-paciente-captura-salva', handleRecarregarAposCaptura);

    return () => {
      window.removeEventListener('trico-session-saved', handleRecarregarAposCaptura);
      window.removeEventListener('trico-paciente-captura-salva', handleRecarregarAposCaptura);
    };
  }, [pacienteAtivo?.id, pacienteAtivo?.nome]);

  // Carregar produtos indicados do paciente selecionado
  useEffect(() => {
    if (!pacienteAtivo) {
      setProdutosPaciente([]);
      return;
    }
    setCarregandoProdutos(true);
    listarProdutosDoPaciente(pacienteAtivo.id, false)
      .then(lista => setProdutosPaciente(lista))
      .catch(() => setProdutosPaciente([]))
      .finally(() => setCarregandoProdutos(false));
  }, [pacienteAtivo?.id]);

  // Carregar fichas de anamnese do paciente selecionado
  useEffect(() => {
    if (!pacienteAtivo) {
      setFichasPaciente([]);
      return;
    }
    setCarregandoFichas(true);
    listRespostasDoPaciente(pacienteAtivo.id, usuarioAtual?.uid)
      .then(lista => setFichasPaciente(lista))
      .catch(() => setFichasPaciente([]))
      .finally(() => setCarregandoFichas(false));
  }, [pacienteAtivo?.id, usuarioAtual?.uid]);

  // Carregar protocolos terapêuticos do paciente selecionado
  useEffect(() => {
    if (!pacienteAtivo) {
      setProtocolosPaciente([]);
      return;
    }
    setCarregandoProtocolos(true);
    listarProtocolosDoPaciente(pacienteAtivo.id)
      .then(lista => setProtocolosPaciente(lista))
      .catch(() => setProtocolosPaciente([]))
      .finally(() => setCarregandoProtocolos(false));
  }, [pacienteAtivo?.id]);

  const handleToggleLiberacaoConsulta = async (cons: ConsultaRegistro) => {
    const novoStatus = !cons.liberadoPaciente;
    await alternarLiberacaoConsulta(cons.id, novoStatus, pacienteAtivo?.id, usuarioAtual?.uid);
    setConsultasPaciente(prev => prev.map(c => c.id === cons.id ? { ...c, liberadoPaciente: novoStatus } : c));
    mostrarAlerta('sucesso', novoStatus ? 'Consulta e fotos liberadas no Portal do Paciente!' : 'Consulta ocultada do Portal do Paciente.');
  };

  const handleToggleLiberacaoProduto = async (prod: ProdutoIndicado) => {
    if (!pacienteAtivo) return;
    const novoStatus = !prod.liberadoPaciente;
    await alternarLiberacaoProduto(prod.id, pacienteAtivo.id, novoStatus);
    setProdutosPaciente(prev => prev.map(p => p.id === prod.id ? { ...p, liberadoPaciente: novoStatus } : p));
    mostrarAlerta('sucesso', novoStatus ? 'Produto liberado no Portal do Paciente!' : 'Produto ocultado do Portal do Paciente.');
  };

  const handleExcluirProduto = (prodId: string) => {
    setProdutoParaExcluirId(prodId);
  };

  const handleConfirmarExcluirProduto = async () => {
    if (!pacienteAtivo || !produtoParaExcluirId) return;
    try {
      await excluirProdutoPaciente(produtoParaExcluirId, pacienteAtivo.id);
      setProdutosPaciente(prev => prev.filter(p => p.id !== produtoParaExcluirId));
      mostrarAlerta('sucesso', 'Produto removido com sucesso.');
    } catch {
      mostrarAlerta('erro', 'Erro ao remover produto.');
    } finally {
      setProdutoParaExcluirId(null);
    }
  };

  // Carregar fotos clínicas globais do paciente selecionado
  useEffect(() => {
    if (!pacienteAtivo) {
      setFotosGlobais([]);
      return;
    }
    setCarregandoFotosGlobais(true);
    listFotosGlobaisDoPaciente(pacienteAtivo.id, usuarioAtual?.uid)
      .then(lista => setFotosGlobais(lista))
      .catch(() => setFotosGlobais([]))
      .finally(() => setCarregandoFotosGlobais(false));

    const handleAtualizarFotosGlobais = () => {
      listFotosGlobaisDoPaciente(pacienteAtivo.id, usuarioAtual?.uid)
        .then(lista => setFotosGlobais(lista))
        .catch(() => {});
    };

    window.addEventListener('trico-foto-global-salva', handleAtualizarFotosGlobais);
    window.addEventListener('trico-foto-global-removida', handleAtualizarFotosGlobais);

    return () => {
      window.removeEventListener('trico-foto-global-salva', handleAtualizarFotosGlobais);
      window.removeEventListener('trico-foto-global-removida', handleAtualizarFotosGlobais);
    };
  }, [pacienteAtivo?.id, usuarioAtual?.uid]);

  const handleAbrirModalUploadFotoGlobal = (anguloPre?: AnguloFotoGlobal) => {
    setFormFotoGlobalAngulo(anguloPre || 'Linha Frontal');
    setFormFotoGlobalData(new Date().toISOString().split('T')[0]);
    setFormFotoGlobalImagemUrl(null);
    setFormFotoGlobalObservacoes('');
    setFormFotoGlobalLiberado(false);
    setModalFotoGlobalUploadAberto(true);
  };

  const handleSelecionarArquivoFotoGlobal = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      mostrarAlerta('erro', 'Por favor, selecione um arquivo de imagem válido (JPG, PNG ou WEBP).');
      return;
    }

    setProcessandoImagemGlobal(true);
    try {
      const comprimida = await arquivoParaDataURL(file);
      setFormFotoGlobalImagemUrl(comprimida);
      mostrarAlerta('sucesso', 'Foto carregada e otimizada com sucesso!');
    } catch {
      mostrarAlerta('erro', 'Erro ao processar imagem.');
    } finally {
      setProcessandoImagemGlobal(false);
    }
  };

  const handleSalvarFotoGlobal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pacienteAtivo) {
      mostrarAlerta('erro', 'Nenhum paciente selecionado.');
      return;
    }

    if (!formFotoGlobalImagemUrl) {
      mostrarAlerta('erro', 'Selecione ou tire uma foto para salvar.');
      return;
    }

    setSalvandoFotoGlobal(true);
    try {
      const novaFoto = await saveFotoGlobalDoPaciente({
        pacienteId: pacienteAtivo.id,
        pacienteNome: pacienteAtivo.nome,
        userId: usuarioAtual?.uid,
        data: formFotoGlobalData || new Date().toISOString().split('T')[0],
        angulo: formFotoGlobalAngulo,
        imagemUrl: formFotoGlobalImagemUrl,
        observacoes: formFotoGlobalObservacoes.trim(),
        liberadoPaciente: formFotoGlobalLiberado
      });

      setFotosGlobais(prev => [novaFoto, ...prev.filter(f => f.id !== novaFoto.id)]);
      setModalFotoGlobalUploadAberto(false);
      setFormFotoGlobalImagemUrl(null);
      setFormFotoGlobalObservacoes('');
      mostrarAlerta('sucesso', `Foto global "${formFotoGlobalAngulo}" salva na ficha com sucesso!`);
    } catch {
      mostrarAlerta('erro', 'Falha ao salvar foto global no prontuário.');
    } finally {
      setSalvandoFotoGlobal(false);
    }
  };

  const handleToggleLiberacaoFotoGlobal = async (foto: FotoGlobalPaciente) => {
    if (!pacienteAtivo) return;
    const novoStatus = !foto.liberadoPaciente;
    await alternarLiberacaoFotoGlobal(foto.id, pacienteAtivo.id, novoStatus, usuarioAtual?.uid);
    setFotosGlobais(prev => prev.map(f => f.id === foto.id ? { ...f, liberadoPaciente: novoStatus } : f));
    mostrarAlerta('sucesso', novoStatus ? 'Foto global liberada no Portal do Paciente!' : 'Foto global ocultada do Portal.');
  };

  const handleConfirmarExcluirFotoGlobal = async () => {
    if (!pacienteAtivo || !fotoGlobalParaExcluirId) return;
    try {
      await deleteFotoGlobalDoPaciente(fotoGlobalParaExcluirId, pacienteAtivo.id, usuarioAtual?.uid);
      setFotosGlobais(prev => prev.filter(f => f.id !== fotoGlobalParaExcluirId));
      mostrarAlerta('sucesso', 'Foto global excluída com sucesso.');
    } catch {
      mostrarAlerta('erro', 'Erro ao excluir foto global.');
    } finally {
      setFotoGlobalParaExcluirId(null);
    }
  };

  // Filtro de busca de pacientes
  const pacientesFiltrados = pacientes.filter(p => {
    const q = termoBusca.toLowerCase().trim();
    if (!q) return true;
    return (
      p.nome.toLowerCase().includes(q) ||
      (p.telefone && p.telefone.toLowerCase().includes(q)) ||
      (p.queixaPrincipal && p.queixaPrincipal.toLowerCase().includes(q))
    );
  });

  // Abrir modal de criação
  const handleAbrirNovoPaciente = () => {
    setPacienteEmEdicao(null);
    setFormNome('');
    setFormTelefone('');
    setFormEmail('');
    setFormDataNasc('');
    setFormGenero('Feminino');
    setFormQueixa('');
    setFormHistorico('');
    setModalPacienteAberto(true);
  };

  // Abrir modal de edição
  const handleAbrirEditarPaciente = (paciente: Paciente) => {
    setPacienteEmEdicao(paciente);
    setFormNome(paciente.nome);
    setFormTelefone(paciente.telefone || '');
    setFormEmail(paciente.email || '');
    setFormDataNasc(paciente.dataNascimento || '');
    setFormGenero(paciente.genero || 'Feminino');
    setFormQueixa(paciente.queixaPrincipal || '');
    setFormHistorico(paciente.historicoClinico || '');
    setModalPacienteAberto(true);
  };

  // Salvar paciente
  const handleSalvarPaciente = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formNome.trim()) {
      mostrarAlerta('erro', 'O nome do paciente é obrigatório.');
      return;
    }

    try {
      const salvo = await savePaciente({
        id: pacienteEmEdicao ? pacienteEmEdicao.id : undefined,
        userId: usuarioAtual?.uid,
        nome: formNome,
        telefone: formTelefone,
        email: formEmail,
        dataNascimento: formDataNasc,
        genero: formGenero,
        queixaPrincipal: formQueixa,
        historicoClinico: formHistorico,
        createdAt: pacienteEmEdicao ? pacienteEmEdicao.createdAt : undefined
      });

      const foiCriacao = !pacienteEmEdicao;
      await recarregarPacientes();
      setPacienteSelecionadoId(salvo.id);
      onDefinirPacienteAtivo?.(salvo);
      setModalPacienteAberto(false);

      if (foiCriacao) {
        setModalProximoPassoFluxo({
          aberto: true,
          paciente: salvo
        });
      } else {
        mostrarAlerta('sucesso', `Paciente ${salvo.nome} atualizado com sucesso!`);
      }
    } catch {
      mostrarAlerta('erro', 'Falha ao salvar paciente.');
    }
  };

  // Solicitar exclusão do paciente (abre modal de confirmação)
  const handleSolicitarExcluirPaciente = (id: string, nome: string) => {
    setPacienteParaExcluir({ id, nome });
  };

  // Confirmar exclusão definitiva do paciente
  const handleConfirmarExcluirPaciente = async () => {
    if (!pacienteParaExcluir) return;
    const { id, nome } = pacienteParaExcluir;
    setExcluindoPaciente(true);
    try {
      await deletePaciente(id, usuarioAtual?.uid);
      const novaLista = pacientes.filter(p => p.id !== id);
      setPacientes(novaLista);
      if (pacienteSelecionadoId === id) {
        const novoId = novaLista[0]?.id || null;
        setPacienteSelecionadoId(novoId);
        if (novoId && novaLista[0]) {
          onDefinirPacienteAtivo?.(novaLista[0]);
        }
      }
      setPacienteParaExcluir(null);
      if (modalPacienteAberto && pacienteEmEdicao?.id === id) {
        setModalPacienteAberto(false);
      }
      mostrarAlerta('sucesso', `Paciente "${nome}" excluído com sucesso.`);
    } catch {
      mostrarAlerta('erro', 'Erro ao excluir paciente.');
    } finally {
      setExcluindoPaciente(false);
    }
  };

  // Abrir modal de Nova Consulta (com fotos, anotações e data)
  const handleAbrirNovaConsulta = (areaPreDefinida?: string) => {
    setFormConsData(new Date().toISOString().split('T')[0]);
    setFormConsTipo('Consulta de Retorno');
    setFormConsArea(areaPreDefinida || 'Vértice / Vértex');
    setFormConsQueixa('');
    setFormConsConduta('');
    setFormConsAnotacoes('');
    setFormConsFotos([]);
    setFormConsLiberado(false);
    setModalConsultaAberto(true);
  };

  // Upload/anexo de fotos para a nova consulta
  const handleAdicionarFotoConsulta = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setProcessandoFotoConsulta(true);
    try {
      const novasFotos: Array<{ id: string; url: string; titulo?: string; area?: string }> = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (file.type.startsWith('image/')) {
          const comprimida = await arquivoParaDataURL(file);
          novasFotos.push({
            id: `foto_cons_${Date.now()}_${i}_${Math.random().toString(36).substring(2, 6)}`,
            url: comprimida,
            titulo: `${formConsArea} - Foto ${formConsFotos.length + i + 1}`,
            area: formConsArea
          });
        }
      }
      if (novasFotos.length > 0) {
        setFormConsFotos(prev => [...prev, ...novasFotos]);
        mostrarAlerta('sucesso', `${novasFotos.length} foto(s) anexada(s) à consulta!`);
      }
    } catch {
      mostrarAlerta('erro', 'Falha ao processar imagens da consulta.');
    } finally {
      setProcessandoFotoConsulta(false);
      e.target.value = '';
    }
  };

  const handleRemoverFotoConsulta = (fotoId: string) => {
    setFormConsFotos(prev => prev.filter(f => f.id !== fotoId));
  };

  // Salvar consulta / retorno clínico com múltiplos registros fotográficos e anotações
  const handleSalvarConsultaAvulsa = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pacienteAtivo) return;

    setSalvandoConsulta(true);
    try {
      const fotoPrincipal = formConsFotos.length > 0 ? formConsFotos[0].url : undefined;

      await saveConsultaAvulsa({
        pacienteId: pacienteAtivo.id,
        pacienteNome: pacienteAtivo.nome,
        data: formConsData,
        area: formConsArea,
        tipoConsulta: formConsTipo,
        queixaEvolucao: formConsQueixa.trim(),
        condutaTratamento: formConsConduta.trim(),
        anotacoes: formConsAnotacoes.trim(),
        imagemUrl: fotoPrincipal,
        fotos: formConsFotos.map((f, i) => ({
          id: f.id,
          url: f.url,
          titulo: f.titulo || `${formConsArea} - Foto ${i + 1}`,
          area: f.area || formConsArea,
          data: formConsData,
          observacoes: f.observacoes
        })),
        liberadoPaciente: formConsLiberado
      });

      const atualizadas = await getConsultasDoPaciente(pacienteAtivo);
      setConsultasPaciente(atualizadas);
      setModalConsultaAberto(false);
      setFormConsQueixa('');
      setFormConsConduta('');
      setFormConsAnotacoes('');
      setFormConsFotos([]);
      setFormConsLiberado(false);
      mostrarAlerta('sucesso', 'Nova consulta com registros fotográficos e anotações salva no histórico!');
    } catch {
      mostrarAlerta('erro', 'Erro ao registrar nova consulta.');
    } finally {
      setSalvandoConsulta(false);
    }
  };

  // Excluir consulta avulsa
  const handleExcluirConsulta = (consId: string) => {
    setConsultaParaExcluirId(consId);
  };

  const handleConfirmarExcluirConsulta = async () => {
    if (!pacienteAtivo || !consultaParaExcluirId) return;
    try {
      await deleteConsultaAvulsa(consultaParaExcluirId);
      const atualizadas = await getConsultasDoPaciente(pacienteAtivo);
      setConsultasPaciente(atualizadas);
      mostrarAlerta('sucesso', 'Consulta removida.');
    } catch {
      mostrarAlerta('erro', 'Erro ao remover consulta.');
    } finally {
      setConsultaParaExcluirId(null);
    }
  };

  // Calcular idade
  const calcularIdade = (dataNasc?: string) => {
    if (!dataNasc) return null;
    const nasc = new Date(dataNasc);
    if (isNaN(nasc.getTime())) return null;
    const hoje = new Date();
    let idade = hoje.getFullYear() - nasc.getFullYear();
    const m = hoje.getMonth() - nasc.getMonth();
    if (m < 0 || (m === 0 && hoje.getDate() < nasc.getDate())) {
      idade--;
    }
    return idade > 0 ? `${idade} anos` : null;
  };

  // Iniciar nova captura para o paciente
  const handleIniciarCaptura = () => {
    if (!pacienteAtivo) return;
    onIniciarCapturaPaciente(pacienteAtivo);
  };

  // Consultas com imagem para comparativo antes/depois
  const consultasComFoto = consultasPaciente.filter(c => (c.imagemUrl && c.imagemUrl.trim() !== '') || (c.fotos && c.fotos.length > 0));

  // Mapeamento de todas as áreas do couro cabeludo avaliadas na bancada para o paciente
  const areasMapeadas = useMemo(() => {
    const map = new Map<string, { total: number; ultimaData: string; fotoUrl?: string; sessionId?: string; totalFios?: number; totalUF?: number }>();
    consultasPaciente.forEach(c => {
      const areaNome = c.area || 'Vértice / Vértex';
      const existing = map.get(areaNome);
      if (!existing) {
        map.set(areaNome, {
          total: 1,
          ultimaData: c.data,
          fotoUrl: c.imagemUrl,
          sessionId: c.sessionId,
          totalFios: c.totalFios,
          totalUF: c.totalUF
        });
      } else {
        existing.total += 1;
        if (new Date(c.data) >= new Date(existing.ultimaData)) {
          existing.ultimaData = c.data;
          if (c.imagemUrl) existing.fotoUrl = c.imagemUrl;
          if (c.sessionId) existing.sessionId = c.sessionId;
          if (c.totalFios !== undefined) existing.totalFios = c.totalFios;
          if (c.totalUF !== undefined) existing.totalUF = c.totalUF;
        } else if (!existing.fotoUrl && c.imagemUrl) {
          existing.fotoUrl = c.imagemUrl;
        }
      }
    });
    return map;
  }, [consultasPaciente]);

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Toast de Alerta */}
      {alerta && (
        <div className={`fixed top-20 right-5 z-50 px-4 py-2.5 rounded-2xl shadow-xl text-xs font-semibold flex items-center gap-2 border transition-all ${
          alerta.tipo === 'sucesso' 
            ? 'bg-emerald-500 text-white border-emerald-600' 
            : 'bg-rose-600 text-white border-rose-700'
        }`}>
          {alerta.tipo === 'sucesso' ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          <span>{alerta.texto}</span>
        </div>
      )}

      {/* CABEÇALHO DA SEÇÃO */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-3xl border border-stone-200/90 dark:border-slate-800 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950 text-rose-700 dark:text-rose-300">
              <Users className="w-5 h-5" />
            </span>
            <h1 className="text-xl font-bold text-stone-900 dark:text-slate-100">
              Prontuário de Pacientes {usuarioAtual ? `• ${usuarioAtual.nome}` : ''}
            </h1>
          </div>
          <p className="text-xs text-stone-500 dark:text-slate-400 mt-1">
            {usuarioAtual?.clinica ? `${usuarioAtual.clinica} • ` : ''}Pacientes e consultas vinculados ao seu acesso profissional exclusivo.
          </p>
        </div>

        <button
          onClick={handleAbrirNovoPaciente}
          className="px-4 py-2.5 rounded-2xl bg-rose-700 hover:bg-rose-800 text-white text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-sm shrink-0 hover:scale-[1.02]"
        >
          <UserPlus className="w-4 h-4" />
          <span>Novo Paciente</span>
        </button>
      </div>

      {/* GRID PRINCIPAL: LISTA LATERAL + PRONTUÁRIO DETALHADO */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* COLUNA ESQUERDA: LISTA DE PACIENTES (4 colunas) */}
        <div className="lg:col-span-4 bg-white dark:bg-slate-900 rounded-3xl border border-stone-200/90 dark:border-slate-800 p-4 space-y-3 shadow-xs">
          {/* Barra de Busca */}
          <div className="relative">
            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar paciente ou queixa..."
              value={termoBusca}
              onChange={(e) => setTermoBusca(e.target.value)}
              className="w-full bg-stone-50 dark:bg-slate-950 border border-stone-200 dark:border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-stone-900 dark:text-slate-100 placeholder-stone-400 focus:outline-none focus:border-rose-400 transition-colors"
            />
          </div>

          <div className="flex items-center justify-between text-[11px] text-stone-500 px-1 font-medium">
            <span>Pacientes cadastrados:</span>
            <span className="font-bold text-stone-800 dark:text-slate-200">{pacientesFiltrados.length}</span>
          </div>

          {/* Lista de Cards de Pacientes */}
          <div className="space-y-2 max-h-[620px] overflow-y-auto pr-1">
            {pacientesFiltrados.length === 0 ? (
              <div className="text-center py-12 px-4 space-y-2">
                <Users className="w-8 h-8 text-stone-300 dark:text-slate-700 mx-auto" />
                <p className="text-xs text-stone-500 dark:text-slate-400 font-medium">
                  {termoBusca ? 'Nenhum paciente encontrado com essa busca.' : 'Nenhum paciente cadastrado ainda.'}
                </p>
                <button
                  onClick={handleAbrirNovoPaciente}
                  className="text-xs text-rose-700 dark:text-rose-400 font-bold hover:underline"
                >
                  Cadastrar primeiro paciente
                </button>
              </div>
            ) : (
              pacientesFiltrados.map(pac => {
                const isSelected = pac.id === pacienteSelecionadoId;
                const idade = calcularIdade(pac.dataNascimento);

                return (
                  <div
                    key={pac.id}
                    onClick={() => {
                      setPacienteSelecionadoId(pac.id);
                      onDefinirPacienteAtivo?.(pac);
                    }}
                    className={`group relative p-3 rounded-2xl border text-left cursor-pointer transition-all flex items-start gap-3 select-none ${
                      isSelected
                        ? 'bg-rose-50/70 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800/80 shadow-xs'
                        : 'bg-stone-50/60 dark:bg-slate-950/60 border-stone-200/80 dark:border-slate-800 hover:bg-stone-100/70 dark:hover:bg-slate-800/50'
                    }`}
                  >
                    {/* Avatar com iniciais */}
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                      isSelected
                        ? 'bg-rose-700 text-white shadow-xs'
                        : 'bg-stone-200 dark:bg-slate-800 text-stone-700 dark:text-slate-300'
                    }`}>
                      {pac.nome.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <h3 className={`text-xs font-bold truncate ${
                          isSelected ? 'text-rose-900 dark:text-rose-200' : 'text-stone-900 dark:text-slate-100'
                        }`}>
                          {pac.nome}
                        </h3>
                        {idade && (
                          <span className="text-[10px] font-mono text-stone-400 shrink-0 ml-1">
                            {idade}
                          </span>
                        )}
                      </div>

                      {pac.queixaPrincipal ? (
                        <p className="text-[11px] text-stone-500 dark:text-slate-400 truncate mt-0.5">
                          {pac.queixaPrincipal}
                        </p>
                      ) : (
                        <p className="text-[11px] text-stone-400 italic mt-0.5">Sem queixa descrita</p>
                      )}

                      <div className="flex items-center justify-between gap-1 mt-1.5 pt-1 border-t border-stone-100 dark:border-slate-800/60">
                        {pac.telefone ? (
                          <p className="text-[10px] font-mono text-stone-400 dark:text-slate-500 flex items-center gap-1 truncate">
                            <Phone className="w-2.5 h-2.5 shrink-0" />
                            <span className="truncate">{pac.telefone}</span>
                          </p>
                        ) : <span className="text-[10px] text-stone-300 dark:text-slate-600 italic">Sem fone</span>}

                        {/* Botões de Ação Rápida: Histórico, Editar e Excluir */}
                        <div className="flex items-center gap-1 opacity-90 sm:opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setPacienteSelecionadoId(pac.id);
                              onDefinirPacienteAtivo?.(pac);
                              setAbaProntuario('historico');
                              setTimeout(() => {
                                document.getElementById('secao-historico-clinico')?.scrollIntoView({ behavior: 'smooth' });
                              }, 60);
                            }}
                            className="p-1 rounded-lg text-teal-600 hover:text-teal-800 dark:hover:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-950/70 transition-colors"
                            title={`Abrir Histórico Clínico de ${pac.nome} (Fichas, Anamneses, Fotos e Protocolos)`}
                          >
                            <Clock className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAbrirEditarPaciente(pac);
                            }}
                            className="p-1 rounded-lg text-stone-400 hover:text-stone-800 dark:hover:text-slate-200 hover:bg-stone-200/70 dark:hover:bg-slate-800 transition-colors"
                            title={`Editar dados de ${pac.nome}`}
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSolicitarExcluirPaciente(pac.id, pac.nome);
                            }}
                            className="p-1 rounded-lg text-stone-400 hover:text-rose-600 hover:bg-rose-100/70 dark:hover:bg-rose-950/70 transition-colors"
                            title={`Excluir paciente ${pac.nome}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* COLUNA DIREITA: PRONTUÁRIO DO PACIENTE SELECIONADO (8 colunas) */}
        <div className="lg:col-span-8 space-y-5">
          {pacienteAtivo ? (
            <>
              {/* BANNER GUIA DE FLUXO CLÍNICO: PASSO 1 CONCLUÍDO -> AVANÇAR PARA PASSO 2 */}
              <div className="bg-gradient-to-r from-teal-800/10 via-emerald-700/10 to-teal-900/5 dark:from-teal-950/60 dark:via-emerald-950/40 dark:to-slate-900 border border-teal-500/30 rounded-3xl p-4 sm:p-5 shadow-xs space-y-3">
                {/* Topo do Banner: Badges alinhados sem quebra */}
                <div className="flex flex-wrap items-center justify-between gap-2.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-700 text-white font-bold text-xs uppercase tracking-wider shadow-xs whitespace-nowrap shrink-0">
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                      <span>Passo 1: Paciente Ativo</span>
                    </span>

                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-100/80 dark:bg-teal-950/90 text-teal-900 dark:text-teal-200 border border-teal-300/80 dark:border-teal-700/80 text-xs font-semibold whitespace-nowrap shrink-0">
                      <span className="text-teal-700 dark:text-teal-400 font-bold">Próximo Passo:</span>
                      <span>Anamnese & Ficha Clínica (Passo 2)</span>
                    </span>
                  </div>

                  <span className="text-xs text-stone-500 dark:text-slate-400 font-medium whitespace-nowrap">
                    Em atendimento: <strong className="text-stone-800 dark:text-slate-200">{pacienteAtivo.nome}</strong>
                  </span>
                </div>

                {/* Descrição em largura total para não espremer o texto */}
                <p className="text-xs text-stone-600 dark:text-slate-300 leading-relaxed">
                  Você está atendendo <strong>{pacienteAtivo.nome}</strong>. Prossiga para o preenchimento da anamnese capilar para manter todos os exames e fotos vinculados a este prontuário.
                </p>

                {/* Barra de Ações Rápidas do Fluxo Clínico */}
                <div className="pt-2.5 border-t border-teal-500/20 flex flex-wrap items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      onDefinirPacienteAtivo?.(pacienteAtivo);
                      setAbaProntuario('historico');
                      setTimeout(() => {
                        document.getElementById('secao-historico-clinico')?.scrollIntoView({ behavior: 'smooth' });
                      }, 50);
                    }}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs border whitespace-nowrap ${
                      abaProntuario === 'historico'
                        ? 'bg-teal-700 text-white border-teal-800 shadow-md shadow-teal-700/25'
                        : 'bg-white dark:bg-slate-800 text-teal-800 dark:text-teal-200 border-teal-300 dark:border-teal-700 hover:bg-teal-50 dark:hover:bg-teal-950/40'
                    }`}
                    title="Acessar o Histórico Clínico completo (Fichas preenchidas, anamneses, fotos e protocolos)"
                  >
                    <Clock className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                    <span>Histórico Clínico</span>
                  </button>

                  {onIniciarAnamnese && (
                    <button
                      type="button"
                      onClick={() => {
                        onDefinirPacienteAtivo?.(pacienteAtivo);
                        onIniciarAnamnese(pacienteAtivo);
                      }}
                      className="px-4 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold flex items-center gap-2 shadow-md transition-all hover:scale-[1.01] whitespace-nowrap"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>Ir para Anamnese (Passo 2) ➜</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      onDefinirPacienteAtivo?.(pacienteAtivo);
                      handleIniciarCaptura();
                    }}
                    className="px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center gap-1.5 border border-slate-200 dark:border-slate-700 transition-colors whitespace-nowrap"
                    title="Pular direto para a Tricoscopia na Bancada (Passo 3)"
                  >
                    <Camera className="w-3.5 h-3.5 text-rose-600" />
                    <span>Tricoscopia (Passo 3)</span>
                  </button>
                </div>
              </div>

              {/* CARD DE IDENTIFICAÇÃO E GESTÃO DO PACIENTE ATIVO */}
              <div className="bg-white dark:bg-slate-900 rounded-3xl border border-stone-200/90 dark:border-slate-800 p-5 sm:p-6 space-y-4 shadow-xs">
                {/* Topo: Nome, Contatos e Botões de Gestão */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-100 dark:border-slate-800 pb-4">
                  <div className="flex items-start gap-3.5">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-rose-600 to-rose-800 text-white flex items-center justify-center font-bold text-lg shadow-md shrink-0">
                      {pacienteAtivo.nome.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()}
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-stone-900 dark:text-slate-100">
                        {pacienteAtivo.nome}
                      </h2>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-stone-500 dark:text-slate-400 mt-1">
                        {pacienteAtivo.dataNascimento && (
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-stone-400" />
                            <span>{new Date(pacienteAtivo.dataNascimento).toLocaleDateString('pt-BR')} ({calcularIdade(pacienteAtivo.dataNascimento)})</span>
                          </span>
                        )}
                        {pacienteAtivo.genero && (
                          <span className="px-2 py-0.5 rounded-full bg-stone-100 dark:bg-slate-800 text-[10px] font-semibold text-stone-700 dark:text-slate-300">
                            {pacienteAtivo.genero}
                          </span>
                        )}
                        {pacienteAtivo.telefone && (
                          <a
                            href={`https://wa.me/55${pacienteAtivo.telefone.replace(/\D/g, '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium hover:underline text-[11px]"
                            title="Conversar no WhatsApp"
                          >
                            <MessageCircle className="w-3 h-3" />
                            <span>{pacienteAtivo.telefone}</span>
                          </a>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Botões Histórico Clínico / Editar / Excluir / Convidar Portal */}
                  <div className="flex items-center gap-2 self-end sm:self-center flex-wrap">
                    <button
                      type="button"
                      onClick={() => {
                        setAbaProntuario('historico');
                        setTimeout(() => {
                          document.getElementById('secao-historico-clinico')?.scrollIntoView({ behavior: 'smooth' });
                        }, 50);
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs border ${
                        abaProntuario === 'historico'
                          ? 'bg-teal-700 text-white border-teal-800 shadow-md shadow-teal-700/25'
                          : 'bg-teal-50 dark:bg-teal-950 text-teal-800 dark:text-teal-200 border-teal-300/80 dark:border-teal-700/80 hover:bg-teal-100 dark:hover:bg-teal-900/60'
                      }`}
                      title="Abrir o Histórico Clínico do Paciente (Fichas Preenchidas, Anamneses, Fotos e Protocolos)"
                    >
                      <Clock className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                      <span>Histórico Clínico</span>
                    </button>

                    <button
                      onClick={() => {
                        if (!temPermissaoPortal) {
                          onNavegarParaPlanos?.();
                          return;
                        }
                        setModalConviteAberto(true);
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs ${
                        !temPermissaoPortal
                          ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/30 hover:bg-amber-500/20'
                          : pacienteAtivo.portalAtivo
                            ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300/80 hover:bg-emerald-100'
                            : 'bg-teal-700 hover:bg-teal-800 text-white'
                      }`}
                      title={
                        !temPermissaoPortal
                          ? `Recurso liberado no Plano ${NIVEL_MINIMO_PORTAL.toUpperCase()}. Clique para ver os planos.`
                          : pacienteAtivo.portalAtivo
                            ? 'Acesso ativado pelo paciente. Clique para gerenciar ou reenviar convite.'
                            : 'Convidar paciente para a Área do Cliente por WhatsApp ou link'
                      }
                    >
                      {!temPermissaoPortal ? (
                        <>
                          <Lock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                          <span>Convidar para o Portal</span>
                        </>
                      ) : pacienteAtivo.portalAtivo ? (
                        <>
                          <UserCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                          <span>Portal Ativo</span>
                        </>
                      ) : (
                        <>
                          <Send className="w-3.5 h-3.5" />
                          <span>Convidar para o Portal</span>
                        </>
                      )}
                    </button>

                    <button
                      onClick={() => handleAbrirEditarPaciente(pacienteAtivo)}
                      className="px-3 py-1.5 rounded-xl border border-stone-200 dark:border-slate-700 text-stone-700 dark:text-slate-300 hover:bg-stone-50 dark:hover:bg-slate-800 text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
                      title="Editar cadastro do paciente"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-rose-600" />
                      <span>Editar</span>
                    </button>
                    <button
                      onClick={() => handleSolicitarExcluirPaciente(pacienteAtivo.id, pacienteAtivo.nome)}
                      className="p-1.5 rounded-xl border border-stone-200 dark:border-slate-700 text-stone-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950 transition-colors shadow-xs"
                      title="Excluir paciente permanentemente"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Anamnese: Queixa Principal & Histórico */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  <div className="p-3.5 rounded-2xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-800/40 space-y-1">
                    <span className="text-[10px] uppercase font-bold text-amber-900 dark:text-amber-300 tracking-wider flex items-center gap-1.5">
                      <AlertCircle className="w-3 h-3 text-amber-600" />
                      <span>Queixa Principal Relatada:</span>
                    </span>
                    <p className="text-stone-700 dark:text-slate-300 leading-relaxed font-medium">
                      {pacienteAtivo.queixaPrincipal || 'Nenhuma queixa principal descrita.'}
                    </p>
                  </div>

                  <div 
                    onClick={() => {
                      setAbaProntuario('historico');
                      setTimeout(() => {
                        document.getElementById('secao-historico-clinico')?.scrollIntoView({ behavior: 'smooth' });
                      }, 50);
                    }}
                    className="p-3.5 rounded-2xl bg-stone-50 dark:bg-slate-950 border border-stone-200/80 dark:border-slate-800 space-y-1 cursor-pointer hover:border-teal-400 dark:hover:border-teal-600 transition-all group"
                    title="Clique para acessar o Histórico Clínico do Paciente (Fichas, Anamneses, Fotos e Protocolos)"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase font-bold text-stone-500 dark:text-slate-400 tracking-wider flex items-center gap-1.5">
                        <FileText className="w-3 h-3 text-stone-400" />
                        <span>Histórico Clínico / Antecedentes:</span>
                      </span>
                      <span className="text-[10px] font-bold text-teal-700 dark:text-teal-400 flex items-center gap-1 opacity-90 group-hover:underline">
                        <span>Abrir Histórico</span>
                        <ArrowRight className="w-3 h-3" />
                      </span>
                    </div>
                    <p className="text-stone-600 dark:text-slate-400 leading-relaxed text-xs">
                      {pacienteAtivo.historicoClinico || 'Sem antecedentes clínicos ou cirúrgicos registrados.'}
                    </p>
                  </div>
                </div>

                {/* MAPEAMENTO DE ÁREAS AVALIADAS DE ACORDO COM O SELETOR DA BANCADA */}
                <div className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-stone-50 via-rose-50/20 to-stone-50 dark:from-slate-950 dark:via-rose-950/20 dark:to-slate-950 border border-stone-200/80 dark:border-slate-800 space-y-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <span className="p-1 rounded-lg bg-rose-100 dark:bg-rose-900/60 text-rose-700 dark:text-rose-300">
                        <MapPin className="w-3.5 h-3.5" />
                      </span>
                      <div>
                        <h4 className="text-xs font-bold text-stone-900 dark:text-slate-100 uppercase tracking-wider">
                          Áreas do Couro Cabeludo Avaliadas (Tricoscopia)
                        </h4>
                        <p className="text-[11px] text-stone-500 dark:text-slate-400">
                          Regiões capturadas na bancada para avaliação comparativa deste paciente.
                        </p>
                      </div>
                    </div>
                    <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-rose-100/80 dark:bg-rose-950 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                      {areasMapeadas.size} {areasMapeadas.size === 1 ? 'área avaliada' : 'áreas avaliadas'}
                    </span>
                  </div>

                  {areasMapeadas.size === 0 ? (
                    <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-dashed border-stone-200 dark:border-slate-800 text-stone-500 dark:text-slate-400 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <span>Nenhuma área do couro cabeludo foi capturada ainda para este paciente. Selecione a área na bancada e salve o exame.</span>
                      <button
                        type="button"
                        onClick={handleIniciarCaptura}
                        className="px-3 py-1.5 rounded-xl bg-rose-700 hover:bg-rose-800 text-white font-semibold text-xs transition-colors shrink-0 flex items-center gap-1.5 self-start sm:self-auto shadow-xs"
                      >
                        <Camera className="w-3.5 h-3.5" />
                        <span>Capturar 1ª Área</span>
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                      {Array.from(areasMapeadas.entries()).map(([areaNome, info]) => (
                        <div
                          key={areaNome}
                          className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-stone-200/90 dark:border-slate-800 flex items-center gap-2.5 hover:border-rose-300 dark:hover:border-rose-700/80 transition-all shadow-xs group"
                        >
                          {info.fotoUrl ? (
                            <img
                              src={info.fotoUrl}
                              alt={areaNome}
                              onClick={() => setModalFotoAmpliada({ url: info.fotoUrl!, titulo: `${pacienteAtivo.nome} • ${areaNome}`, data: info.ultimaData })}
                              className="w-11 h-11 rounded-lg object-cover bg-black shrink-0 border border-stone-200 dark:border-slate-700 cursor-pointer group-hover:scale-105 transition-transform"
                              title="Clique para ampliar foto desta área"
                            />
                          ) : (
                            <div className="w-11 h-11 rounded-lg bg-rose-50 dark:bg-rose-950 flex items-center justify-center text-rose-600 shrink-0 border border-rose-200/60 dark:border-rose-900">
                              <MapPin className="w-5 h-5" />
                            </div>
                          )}
                          <div className="min-w-0 flex-1 space-y-0.5">
                            <h5 className="text-xs font-bold text-stone-900 dark:text-slate-100 truncate" title={areaNome}>
                              {areaNome}
                            </h5>
                            <p className="text-[10px] text-stone-500 dark:text-slate-400">
                              Data: <span className="font-mono font-semibold">{info.ultimaData}</span> {info.total > 1 ? `(${info.total} capturas)` : ''}
                            </p>
                            {(info.totalFios !== undefined || info.totalUF !== undefined) && (
                              <p className="text-[10px] text-emerald-700 dark:text-emerald-400 font-medium">
                                {info.totalFios !== undefined ? `${info.totalFios} fios` : ''} {info.totalUF !== undefined ? `• ${info.totalUF} UFs` : ''}
                              </p>
                            )}
                          </div>
                          {info.sessionId && (
                            <button
                              type="button"
                              onClick={() => onCarregarSessaoNaBancada(info.sessionId!)}
                              className="p-1.5 rounded-lg text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950 transition-colors shrink-0"
                              title="Abrir esta área na bancada para recontagem ou conferência"
                            >
                              <Microscope className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* BARRA DE AÇÃO CLÍNICA: INICIAR CAPTURA OU REGISTRAR RETORNO */}
                <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-stone-100 dark:border-slate-800">
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      onClick={handleIniciarCaptura}
                      className="px-4 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold flex items-center gap-2 transition-all shadow-xs"
                      title="Ir para a bancada para registrar fotos por área do paciente"
                    >
                      <Camera className="w-3.5 h-3.5" />
                      <span>📸 Registrar Fotos na Bancada (Passo 3)</span>
                    </button>

                    {onIniciarAnamnese && (
                      <button
                        onClick={() => onIniciarAnamnese(pacienteAtivo)}
                        className="px-3.5 py-2 rounded-xl bg-stone-100 dark:bg-slate-800 hover:bg-stone-200 dark:hover:bg-slate-700 text-stone-800 dark:text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
                        title="Criar ou preencher questionário de anamnese para este paciente"
                      >
                        <FileText className="w-3.5 h-3.5 text-teal-600" />
                        <span>📋 Anamnese (Passo 2)</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => handleAbrirNovaConsulta()}
                      className="px-3.5 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs"
                      title="Adicionar nova consulta no prontuário com registros fotográficos, anotações clínicas e data"
                    >
                      <PlusCircle className="w-3.5 h-3.5" />
                      <span>+ Nova Consulta</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setAbaProntuario('historico');
                        setTimeout(() => {
                          document.getElementById('secao-historico-clinico')?.scrollIntoView({ behavior: 'smooth' });
                        }, 50);
                      }}
                      className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs border ${
                        abaProntuario === 'historico'
                          ? 'bg-teal-700 text-white border-teal-800 shadow-md shadow-teal-700/25'
                          : 'bg-stone-100 dark:bg-slate-800 hover:bg-stone-200 dark:hover:bg-slate-700 text-stone-800 dark:text-slate-200 border-stone-200 dark:border-slate-700'
                      }`}
                      title="Abrir o Histórico Clínico completo do Paciente com Fichas Preenchidas, Anamneses, Fotos e Protocolos"
                    >
                      <Clock className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                      <span>📚 Histórico Clínico</span>
                    </button>
                  </div>

                  {/* Comparativo se houver 2 ou mais fotos */}
                  {consultasComFoto.length >= 2 && (
                    <button
                      type="button"
                      onClick={() => {
                        const fotoMaisRecente = consultasComFoto[0];
                        const fotoAnterior = consultasComFoto[1];
                        setComparadorFotoAUrl(fotoAnterior.imagemUrl!);
                        setComparadorFotoBUrl(fotoMaisRecente.imagemUrl!);
                        setAbaProntuario('comparador');
                        setTimeout(() => {
                          document.getElementById('secao-historico-clinico')?.scrollIntoView({ behavior: 'smooth' });
                        }, 50);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700/80 text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs hover:bg-emerald-100"
                      title="Comparar evolução clínica entre as consultas"
                    >
                      <GitCompare className="w-3.5 h-3.5" />
                      <span>Comparar Evolução (Antes/Depois)</span>
                    </button>
                  )}
                </div>
              </div>

              {/* NAVEGAÇÃO DE ABAS DO PRONTUÁRIO DO PACIENTE */}
              <div id="secao-historico-clinico" className="flex items-center gap-2 border-b border-stone-200 dark:border-slate-800 pb-2 overflow-x-auto scrollbar-thin scroll-mt-6">
                <button
                  type="button"
                  onClick={() => setAbaProntuario('geral')}
                  className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 border whitespace-nowrap ${
                    abaProntuario === 'geral'
                      ? 'bg-stone-900 text-white border-stone-900 dark:bg-white dark:text-slate-900 dark:border-white shadow-xs'
                      : 'bg-white dark:bg-slate-900 text-stone-600 dark:text-slate-400 border-stone-200 dark:border-slate-800 hover:bg-stone-50'
                  }`}
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>Prontuário Geral</span>
                </button>

                <button
                  type="button"
                  onClick={() => setAbaProntuario('historico')}
                  className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 border whitespace-nowrap ${
                    abaProntuario === 'historico'
                      ? 'bg-teal-700 text-white border-teal-700 shadow-md shadow-teal-700/25'
                      : 'bg-white dark:bg-slate-900 text-stone-600 dark:text-slate-400 border-stone-200 dark:border-slate-800 hover:bg-stone-50'
                  }`}
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>Histórico Clínico</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    abaProntuario === 'historico' ? 'bg-white/20 text-white' : 'bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-300'
                  }`}>
                    Fichas, Fotos & Protocolos
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setAbaProntuario('comparador')}
                  className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 border whitespace-nowrap ${
                    abaProntuario === 'comparador'
                      ? 'bg-teal-700 text-white border-teal-700 shadow-md shadow-teal-700/25'
                      : 'bg-white dark:bg-slate-900 text-stone-600 dark:text-slate-400 border-stone-200 dark:border-slate-800 hover:bg-stone-50'
                  }`}
                >
                  <GitCompare className="w-3.5 h-3.5" />
                  <span>Comparador Lado a Lado</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    abaProntuario === 'comparador' ? 'bg-white/20 text-white' : 'bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                  }`}>
                    Antes / Depois
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setAbaProntuario('exames')}
                  className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 border whitespace-nowrap ${
                    abaProntuario === 'exames'
                      ? 'bg-teal-700 text-white border-teal-700 shadow-md shadow-teal-700/25'
                      : 'bg-white dark:bg-slate-900 text-stone-600 dark:text-slate-400 border-stone-200 dark:border-slate-800 hover:bg-stone-50'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Exames Laboratoriais</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    abaProntuario === 'exames' ? 'bg-white/20 text-white' : 'bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-300'
                  }`}>
                    IA Gemini
                  </span>
                </button>
              </div>

              {abaProntuario === 'historico' ? (
                <HistoricoClinicoView
                  paciente={pacienteAtivo}
                  usuarioAtual={usuarioAtual}
                  fichas={fichasPaciente}
                  consultas={consultasPaciente}
                  fotosGlobais={fotosGlobais}
                  protocolos={protocolosPaciente}
                  onIniciarAnamnese={onIniciarAnamnese}
                  onCarregarSessaoNaBancada={onCarregarSessaoNaBancada}
                  onAbrirComparador={(antes, depois, titAntes, titDepois) => {
                    setComparadorFotoAUrl(antes);
                    setComparadorFotoBUrl(depois);
                    setAbaProntuario('comparador');
                    if (onAbrirComparador) {
                      onAbrirComparador(antes, depois, titAntes || 'Anterior', titDepois || 'Recente');
                    }
                  }}
                  onAbrirUploadFotoGlobal={handleAbrirModalUploadFotoGlobal}
                  onAbrirNovaConsulta={handleAbrirNovaConsulta}
                  onAtualizarProtocolos={(novos) => setProtocolosPaciente(novos)}
                  onVisualizarFoto={(foto) => setModalFotoAmpliada(foto)}
                  onBaixarPdfFicha={(f) => {
                    try {
                      const sessoesList = f.sessoesJson ? JSON.parse(f.sessoesJson) : [];
                      const fData = JSON.parse(f.dadosFichaJson || '{}');
                      baixarPdfFicha({
                        ficha: fData,
                        profissional: usuarioAtual,
                        dataAtendimento: f.dataPreenchimento,
                        sessoes: sessoesList
                      });
                    } catch {
                      mostrarAlerta('erro', 'Erro ao gerar PDF da ficha.');
                    }
                  }}
                  onCompartilharPdfFicha={(f) => {
                    try {
                      const sessoesList = f.sessoesJson ? JSON.parse(f.sessoesJson) : [];
                      const fData = JSON.parse(f.dadosFichaJson || '{}');
                      compartilharPdfFicha({
                        ficha: fData,
                        profissional: usuarioAtual,
                        dataAtendimento: f.dataPreenchimento,
                        sessoes: sessoesList
                      });
                    } catch {
                      mostrarAlerta('erro', 'Erro ao compartilhar PDF.');
                    }
                  }}
                  onNavegarParaPlanos={onNavegarParaPlanos}
                />
              ) : abaProntuario === 'comparador' ? (
                <ComparadorPacienteView
                  paciente={pacienteAtivo}
                  consultas={consultasPaciente}
                  fotosGlobais={fotosGlobais}
                  fotoAInicialUrl={comparadorFotoAUrl}
                  fotoBInicialUrl={comparadorFotoBUrl}
                  onCarregarSessaoNaBancada={onCarregarSessaoNaBancada}
                  onVoltarProntuario={() => setAbaProntuario('geral')}
                />
              ) : abaProntuario === 'exames' ? (
                <ExamesView
                  paciente={pacienteAtivo}
                  usuarioAtual={usuarioAtual}
                  onAtualizarPaciente={(pAtualizado) => {
                    setPacientes(prev => prev.map(p => p.id === pAtualizado.id ? pAtualizado : p));
                  }}
                  onNavegarParaPlanos={onNavegarParaPlanos}
                />
              ) : (
                <>

              {/* SEÇÃO: FICHAS DE AVALIAÇÃO & ANAMNESES DO PACIENTE */}
              <div className="bg-white dark:bg-slate-900 rounded-3xl border border-stone-200/90 dark:border-slate-800 p-5 sm:p-6 space-y-4 shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-100 dark:border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-teal-600" />
                    <div>
                      <h3 className="text-sm font-bold text-stone-900 dark:text-slate-100 uppercase tracking-wider">
                        Fichas de Avaliação & Anamneses
                      </h3>
                      <p className="text-[11px] text-stone-400">
                        Questionário dinâmico por etapas, registro de sessões de retorno e laudos em PDF (A4).
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-stone-500 font-mono">
                      {fichasPaciente.length} {fichasPaciente.length === 1 ? 'ficha' : 'fichas'}
                    </span>
                    {onIniciarAnamnese && (
                      <button
                        onClick={() => onIniciarAnamnese(pacienteAtivo)}
                        className="px-3 py-1.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>Nova Ficha</span>
                      </button>
                    )}
                  </div>
                </div>

                {carregandoFichas ? (
                  <div className="text-center py-6 text-stone-400 text-xs animate-pulse">
                    Carregando fichas do paciente...
                  </div>
                ) : fichasPaciente.length === 0 ? (
                  <div className="text-center py-8 px-4 space-y-3 bg-stone-50/50 dark:bg-slate-950/40 rounded-2xl border border-dashed border-stone-200 dark:border-slate-800">
                    <FileText className="w-8 h-8 text-stone-300 dark:text-slate-700 mx-auto" />
                    <div className="space-y-1">
                      <p className="text-xs font-bold text-stone-700 dark:text-slate-300">
                        Nenhuma ficha de avaliação registrada para {pacienteAtivo.nome}
                      </p>
                      <p className="text-[11px] text-stone-500 dark:text-slate-400 max-w-sm mx-auto">
                        Inicie o preenchimento da Ficha de Avaliação Capilar com preenchimento automático dos dados do cadastro.
                      </p>
                    </div>
                    {onIniciarAnamnese && (
                      <button
                        onClick={() => onIniciarAnamnese(pacienteAtivo)}
                        className="px-4 py-2 rounded-xl bg-teal-700 text-white text-xs font-bold shadow-xs hover:bg-teal-800 transition-colors inline-flex items-center gap-1.5"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>Preencher Ficha de Avaliação Capilar</span>
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {fichasPaciente.map(f => {
                      const isFichaCapilar = Boolean(f.dadosFichaJson || f.modeloId === MODELO_FICHA_AVALIACAO_CAPILAR_ID);
                      let sessoesList: any[] = [];
                      if (f.sessoesJson) {
                        try { sessoesList = JSON.parse(f.sessoesJson); } catch {}
                      }

                      return (
                        <div
                          key={f.id}
                          className="p-4 rounded-2xl bg-stone-50/70 dark:bg-slate-950/50 border border-stone-200/80 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                        >
                          <div className="space-y-1.5 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-stone-900 dark:text-slate-100">
                                {f.modeloTitulo}
                              </span>
                              {f.status === 'rascunho' ? (
                                <span className="px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300 font-bold text-[10px]">
                                  Rascunho
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-bold text-[10px]">
                                  Finalizada
                                </span>
                              )}
                              {sessoesList.length > 0 && (
                                <span className="px-2 py-0.5 rounded-full bg-teal-500/15 text-teal-700 dark:text-teal-300 font-bold text-[10px] flex items-center gap-1">
                                  <Layers className="w-3 h-3" />
                                  <span>{sessoesList.length} {sessoesList.length === 1 ? 'sessão de evolução' : 'sessões de evolução'}</span>
                                </span>
                              )}
                            </div>

                            <p className="text-[11px] text-stone-500 font-mono">
                              Preenchida em: {new Date(f.dataPreenchimento).toLocaleDateString('pt-BR')} às {new Date(f.dataPreenchimento).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>

                          <div className="flex items-center gap-2 shrink-0 flex-wrap">
                            {isFichaCapilar && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => {
                                    try {
                                      const fData = JSON.parse(f.dadosFichaJson || '{}');
                                      baixarPdfFicha({
                                        ficha: fData,
                                        profissional: usuarioAtual,
                                        dataAtendimento: f.dataPreenchimento,
                                        sessoes: sessoesList
                                      });
                                    } catch {
                                      mostrarAlerta('erro', 'Erro ao gerar PDF da ficha.');
                                    }
                                  }}
                                  className="px-3 py-1.5 rounded-xl bg-teal-50 hover:bg-teal-100 dark:bg-teal-950 dark:hover:bg-teal-900 text-teal-800 dark:text-teal-200 text-xs font-semibold flex items-center gap-1.5 transition-colors border border-teal-200 dark:border-teal-800"
                                  title="Baixar PDF A4 com todas as etapas e sessões"
                                >
                                  <Download className="w-3.5 h-3.5" />
                                  <span>Baixar PDF</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => {
                                    try {
                                      const fData = JSON.parse(f.dadosFichaJson || '{}');
                                      compartilharPdfFicha({
                                        ficha: fData,
                                        profissional: usuarioAtual,
                                        dataAtendimento: f.dataPreenchimento,
                                        sessoes: sessoesList
                                      });
                                    } catch {
                                      mostrarAlerta('erro', 'Erro ao compartilhar PDF.');
                                    }
                                  }}
                                  className="p-1.5 rounded-xl border border-stone-200 dark:border-slate-700 text-stone-600 dark:text-slate-300 hover:bg-stone-100 dark:hover:bg-slate-800 transition-colors"
                                  title="Compartilhar PDF"
                                >
                                  <Share2 className="w-3.5 h-3.5" />
                                </button>
                              </>
                            )}

                            {onIniciarAnamnese && (
                              <button
                                type="button"
                                onClick={() => onIniciarAnamnese(pacienteAtivo)}
                                className="px-3 py-1.5 rounded-xl bg-stone-100 hover:bg-stone-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-stone-800 dark:text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                                title="Abrir na área de Anamnese"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                <span>Ver na Anamnese</span>
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* SEÇÃO: FOTOGRAFIAS CLÍNICAS GLOBAIS (MACROSCÓPICAS) DA CABEÇA/COURO CABELUDO */}
              <div className="bg-white dark:bg-slate-900 rounded-3xl border border-stone-200/90 dark:border-slate-800 p-5 sm:p-6 space-y-4 shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-100 dark:border-slate-800 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-300 flex items-center justify-center shrink-0 border border-teal-200/60 dark:border-teal-800">
                      <ImageIcon className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold text-stone-900 dark:text-slate-100 uppercase tracking-wider">
                          Fotografias Clínicas Globais (Macroscópicas)
                        </h3>
                        <span className="px-2 py-0.5 rounded-full bg-teal-100/80 dark:bg-teal-950 text-teal-800 dark:text-teal-300 font-bold text-[10px] font-mono border border-teal-200 dark:border-teal-800">
                          {fotosGlobais.length} {fotosGlobais.length === 1 ? 'foto' : 'fotos'}
                        </span>
                      </div>
                      <p className="text-[11px] text-stone-500 dark:text-slate-400">
                        Fotos macroscópicas da cabeça (Frontal, Vértex, Laterais, Occipital) para comparação visual de volume e densidade capilar.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    {fotosGlobais.length >= 2 && (
                      <button
                        type="button"
                        onClick={() => {
                          const foto1 = fotosGlobais[fotosGlobais.length - 1]; // mais antiga
                          const foto2 = fotosGlobais[0]; // mais recente
                          setComparadorFotoAUrl(foto1.imagemUrl);
                          setComparadorFotoBUrl(foto2.imagemUrl);
                          setAbaProntuario('comparador');
                          if (onAbrirComparador) {
                            onAbrirComparador(
                              foto1.imagemUrl,
                              foto2.imagemUrl,
                              `${foto1.angulo} (${foto1.data})`,
                              `${foto2.angulo} (${foto2.data})`
                            );
                          }
                        }}
                        className="px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 text-xs font-semibold flex items-center gap-1.5 transition-colors hover:bg-emerald-100"
                        title="Comparar evolução macroscópica de fotos globais no comparador"
                      >
                        <GitCompare className="w-3.5 h-3.5" />
                        <span>Comparar Globais</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => handleAbrirModalUploadFotoGlobal()}
                      className="px-3.5 py-1.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs hover:scale-[1.01]"
                      title="Fazer upload de nova fotografia clínica global para este paciente"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>+ Upload de Foto Global</span>
                    </button>
                  </div>
                </div>

                {/* Grade de Badges dos Ângulos para Upload Rápido ou Filtro */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
                  <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider shrink-0 mr-1">
                    Ângulos:
                  </span>
                  {ANGULOS_FOTO_GLOBAL.map(ang => {
                    const count = fotosGlobais.filter(f => f.angulo === ang).length;
                    return (
                      <button
                        key={ang}
                        type="button"
                        onClick={() => handleAbrirModalUploadFotoGlobal(ang)}
                        className="px-2.5 py-1 rounded-xl text-[11px] font-semibold shrink-0 transition-all flex items-center gap-1 border bg-stone-50 dark:bg-slate-800/60 text-stone-700 dark:text-slate-300 border-stone-200/80 dark:border-slate-700 hover:border-teal-400 hover:bg-teal-50 dark:hover:bg-teal-950/40"
                        title={`Clique para fazer upload de foto de "${ang}"`}
                      >
                        <span>{ang}</span>
                        {count > 0 && (
                          <span className="px-1.5 py-0.2 rounded-full bg-teal-100 dark:bg-teal-900 text-teal-800 dark:text-teal-200 text-[9px] font-bold font-mono">
                            {count}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {carregandoFotosGlobais ? (
                  <div className="text-center py-8 text-stone-400 text-xs flex items-center justify-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-teal-600" />
                    <span>Carregando fotos globais do prontuário...</span>
                  </div>
                ) : fotosGlobais.length === 0 ? (
                  <div className="text-center py-10 px-4 space-y-3 bg-stone-50/50 dark:bg-slate-950/40 rounded-2xl border border-dashed border-stone-200 dark:border-slate-800">
                    <div className="w-12 h-12 rounded-2xl bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800 flex items-center justify-center mx-auto text-teal-700 dark:text-teal-400">
                      <ImageIcon className="w-6 h-6" />
                    </div>
                    <div className="space-y-1 max-w-md mx-auto">
                      <p className="text-xs font-bold text-stone-800 dark:text-slate-200">
                        Nenhuma foto clínica global cadastrada para {pacienteAtivo.nome}
                      </p>
                      <p className="text-[11px] text-stone-500 dark:text-slate-400 leading-relaxed">
                        Faça upload de fotos tiradas com celular ou câmera profissional da linha frontal, vértex, topo ou laterais para acompanhar a resposta clínica macroscópica.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleAbrirModalUploadFotoGlobal()}
                      className="px-4 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold shadow-xs transition-colors inline-flex items-center gap-1.5"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>Fazer Upload da 1ª Foto Global</span>
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3.5">
                    {fotosGlobais.map(foto => (
                      <div
                        key={foto.id}
                        className="p-3 rounded-2xl border border-stone-200/80 dark:border-slate-800 bg-stone-50/50 dark:bg-slate-950/40 flex flex-col justify-between gap-2.5 transition-all hover:border-teal-400 group"
                      >
                        {/* Imagem com badge do ângulo */}
                        <div
                          onClick={() => setModalFotoGlobalAmpliada({
                            url: foto.imagemUrl,
                            titulo: `${pacienteAtivo.nome} • ${foto.angulo}`,
                            data: foto.data,
                            angulo: foto.angulo,
                            observacoes: foto.observacoes
                          })}
                          className="w-full aspect-[4/3] rounded-xl overflow-hidden bg-black relative cursor-pointer group-hover:shadow-xs"
                          title="Clique para ampliar em alta resolução"
                        >
                          <img
                            src={foto.imagemUrl}
                            alt={foto.angulo}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-semibold gap-1">
                            <Eye className="w-4 h-4" />
                            <span>Ampliar</span>
                          </div>
                          <span className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-teal-900/90 text-white font-bold text-[10px] shadow-xs backdrop-blur-xs">
                            {foto.angulo}
                          </span>
                        </div>

                        {/* Metadados e ações */}
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="font-mono text-stone-500 dark:text-slate-400 font-semibold">
                              {foto.data}
                            </span>
                            <span className={`px-1.5 py-0.2 rounded-md font-bold text-[9px] ${
                              foto.liberadoPaciente
                                ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                : 'bg-stone-100 text-stone-600 dark:bg-slate-800 dark:text-slate-400'
                            }`}>
                              {foto.liberadoPaciente ? 'No Portal' : 'Privada'}
                            </span>
                          </div>

                          {foto.observacoes && (
                            <p className="text-[10px] text-stone-600 dark:text-slate-400 line-clamp-2 leading-tight italic" title={foto.observacoes}>
                              "{foto.observacoes}"
                            </p>
                          )}

                          <div className="flex items-center justify-between gap-1 pt-1 border-t border-stone-200/60 dark:border-slate-800">
                            <button
                              type="button"
                              onClick={() => handleToggleLiberacaoFotoGlobal(foto)}
                              className={`p-1 rounded-lg text-[10px] font-semibold flex items-center gap-1 transition-colors ${
                                foto.liberadoPaciente
                                  ? 'text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950'
                                  : 'text-stone-400 hover:text-stone-700 dark:hover:text-slate-300 hover:bg-stone-100 dark:hover:bg-slate-800'
                              }`}
                              title={foto.liberadoPaciente ? 'Visível no Portal do Paciente. Clique para ocultar.' : 'Oculto do Portal. Clique para liberar.'}
                            >
                              {foto.liberadoPaciente ? <Eye className="w-3 h-3 text-emerald-600" /> : <EyeOff className="w-3 h-3 text-stone-400" />}
                              <span>{foto.liberadoPaciente ? 'Liberada' : 'Liberar'}</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => setFotoGlobalParaExcluirId(foto.id)}
                              className="p-1 rounded-lg text-stone-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950 transition-colors"
                              title="Excluir esta foto global"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* SEÇÃO: FOTOS REGISTRADAS POR ÁREA (TRICOSCOPIA) COM BADGES */}
              {consultasComFoto.length > 0 && (
                <div className="bg-white dark:bg-slate-900 rounded-3xl border border-stone-200/90 dark:border-slate-800 p-5 sm:p-6 space-y-4 shadow-xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-100 dark:border-slate-800 pb-3">
                    <div className="flex items-center gap-2">
                      <Camera className="w-4 h-4 text-teal-600" />
                      <div>
                        <h3 className="text-sm font-bold text-stone-900 dark:text-slate-100 uppercase tracking-wider">
                          Fotos Registradas por Área de {pacienteAtivo.nome} ({consultasComFoto.length})
                        </h3>
                        <p className="text-[11px] text-stone-400">
                          Imagens capturadas na bancada. Clique em "Contar Fios & Óstios" para acessar a imagem e realizar a análise clínica.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleIniciarCaptura}
                        className="px-3 py-1.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs"
                      >
                        <Camera className="w-3.5 h-3.5" />
                        <span>📸 Nova Foto na Bancada</span>
                      </button>
                    </div>
                  </div>

                  {/* Grid de Cards com Badges das Áreas */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3.5">
                    {consultasComFoto.map((cons) => (
                      <div
                        key={cons.id}
                        className="p-3 rounded-2xl border border-stone-200/80 dark:border-slate-800 bg-stone-50/50 dark:bg-slate-950/40 flex flex-col justify-between gap-2.5 transition-all hover:border-teal-400 group"
                      >
                        <div
                          onClick={() => setModalFotoAmpliada({ url: cons.imagemUrl!, titulo: `${pacienteAtivo.nome} • ${cons.area}`, data: cons.data })}
                          className="w-full aspect-[4/3] rounded-xl overflow-hidden bg-black relative cursor-pointer"
                          title="Clique para ampliar"
                        >
                          <img
                            src={cons.imagemUrl}
                            alt={cons.area}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-semibold gap-1">
                            <Eye className="w-4 h-4" />
                            <span>Ampliar</span>
                          </div>
                          <span className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-teal-800/90 text-white font-bold text-[10px] shadow-xs">
                            {cons.area}
                          </span>
                        </div>

                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="font-mono text-stone-500">{cons.data}</span>
                            {cons.totalFios !== undefined ? (
                              <span className="px-1.5 py-0.2 rounded-md bg-blue-50 text-blue-800 dark:bg-blue-950 dark:text-blue-300 font-bold text-[10px]">
                                {cons.totalFios} fios
                              </span>
                            ) : (
                              <span className="px-1.5 py-0.2 rounded-md bg-amber-50 text-amber-800 dark:bg-amber-950 dark:text-amber-300 text-[10px]">
                                Pendente
                              </span>
                            )}
                          </div>

                          {cons.sessionId && (
                            <button
                              type="button"
                              onClick={() => onCarregarSessaoNaBancada(cons.sessionId!)}
                              className="w-full py-1.5 rounded-xl bg-teal-50 hover:bg-teal-100 dark:bg-teal-950 dark:hover:bg-teal-900 text-teal-800 dark:text-teal-200 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors border border-teal-200 dark:border-teal-800 shadow-xs"
                              title="Abrir imagem na bancada para contar fios, óstios e emitir laudo"
                            >
                              <Microscope className="w-3.5 h-3.5 text-teal-600" />
                              <span>Contar Fios & Óstios</span>
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TIMELINE DE CONSULTAS & SESSÕES DE TRICOSCOPIA */}
              <div className="bg-white dark:bg-slate-900 rounded-3xl border border-stone-200/90 dark:border-slate-800 p-5 sm:p-6 space-y-4 shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-100 dark:border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                    <h3 className="text-sm font-bold text-stone-900 dark:text-slate-100 uppercase tracking-wider">
                      Histórico de Consultas & Acompanhamento
                    </h3>
                    <span className="text-xs font-semibold text-stone-500 font-mono">
                      ({consultasPaciente.length} {consultasPaciente.length === 1 ? 'registro' : 'registros'})
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleAbrirNovaConsulta()}
                      className="px-3.5 py-1.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs hover:scale-[1.01]"
                      title="Adicionar nova consulta no histórico com fotos, data e anotações"
                    >
                      <PlusCircle className="w-3.5 h-3.5" />
                      <span>+ Nova Consulta</span>
                    </button>
                  </div>
                </div>

                {carregandoConsultas ? (
                  <div className="text-center py-10 text-stone-400 text-xs animate-pulse">
                    Carregando histórico do prontuário...
                  </div>
                ) : consultasPaciente.length === 0 ? (
                  <div className="text-center py-12 px-4 space-y-3 bg-stone-50/50 dark:bg-slate-950/40 rounded-2xl border border-dashed border-stone-200 dark:border-slate-800">
                    <Microscope className="w-9 h-9 text-stone-300 dark:text-slate-700 mx-auto" />
                    <div className="space-y-1">
                      <p className="text-xs font-bold text-stone-700 dark:text-slate-300">
                        Nenhuma consulta registrada para {pacienteAtivo.nome}
                      </p>
                      <p className="text-[11px] text-stone-500 dark:text-slate-400 max-w-sm mx-auto">
                        Registre uma nova consulta com anotações e registros fotográficos para acompanhar a evolução clínica e ver as mudanças.
                      </p>
                    </div>
                    <div className="flex items-center justify-center gap-2 flex-wrap pt-1">
                      <button
                        type="button"
                        onClick={() => handleAbrirNovaConsulta()}
                        className="px-4 py-2 rounded-xl bg-teal-700 text-white text-xs font-bold shadow-xs hover:bg-teal-800 transition-colors inline-flex items-center gap-1.5"
                      >
                        <PlusCircle className="w-3.5 h-3.5" />
                        <span>+ Registrar Nova Consulta</span>
                      </button>
                      <button
                        onClick={handleIniciarCaptura}
                        className="px-4 py-2 rounded-xl bg-stone-100 dark:bg-slate-800 text-stone-700 dark:text-slate-300 text-xs font-semibold shadow-xs hover:bg-stone-200 dark:hover:bg-slate-700 transition-colors inline-flex items-center gap-1.5 border border-stone-200 dark:border-slate-700"
                      >
                        <Camera className="w-3.5 h-3.5 text-rose-600" />
                        <span>Realizar Exame na Bancada</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {consultasPaciente.map((cons, idx) => {
                      const fotoPrincipal = cons.imagemUrl || (cons.fotos && cons.fotos.length > 0 ? cons.fotos[0].url : undefined);
                      const outrasConsultasComFoto = consultasPaciente.filter(c => c.id !== cons.id && (c.imagemUrl || (c.fotos && c.fotos.length > 0)));

                      return (
                        <div
                          key={cons.id}
                          className="p-4 rounded-2xl border border-stone-200/90 dark:border-slate-800 bg-stone-50/60 dark:bg-slate-950/60 space-y-3.5 transition-all hover:border-stone-300 dark:hover:border-slate-700"
                        >
                          {/* Linha superior: Data, Tipo, Área e Ações */}
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-stone-200/70 dark:border-slate-800/80 pb-3">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="px-2.5 py-1 rounded-xl bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-700 font-mono text-xs font-bold text-teal-800 dark:text-teal-300 flex items-center gap-1.5 shadow-2xs">
                                <Calendar className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                                <span>{cons.data}</span>
                              </span>

                              {cons.tipoConsulta && (
                                <span className="px-2.5 py-1 rounded-xl bg-teal-50 dark:bg-teal-950/70 border border-teal-200 dark:border-teal-800 text-teal-800 dark:text-teal-200 font-semibold text-xs shadow-2xs">
                                  {cons.tipoConsulta}
                                </span>
                              )}

                              <span className="px-2.5 py-1 rounded-xl bg-rose-50 dark:bg-rose-950/70 border border-rose-200 dark:border-rose-800 font-bold text-xs text-rose-800 dark:text-rose-200 flex items-center gap-1.5 shadow-2xs">
                                <MapPin className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                                <span>Área: <strong>{cons.area}</strong></span>
                              </span>

                              {cons.fotos && cons.fotos.length > 0 && (
                                <span className="px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 text-[10px] font-bold flex items-center gap-1">
                                  <Camera className="w-3 h-3 text-blue-600" />
                                  <span>{cons.fotos.length} {cons.fotos.length === 1 ? 'foto registrada' : 'fotos registradas'}</span>
                                </span>
                              )}

                              {idx === 0 && (
                                <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 text-[10px] font-bold">
                                  Mais recente
                                </span>
                              )}
                            </div>

                            {/* Botões da Consulta */}
                            <div className="flex items-center gap-2 flex-wrap">
                              {/* Botão Ver Mudanças (Comparar) se houver foto nesta consulta e outra foto no histórico */}
                              {fotoPrincipal && (outrasConsultasComFoto.length > 0 || fotosGlobais.length > 0) && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const anterior = outrasConsultasComFoto.find(c => new Date(c.data).getTime() < new Date(cons.data).getTime()) || outrasConsultasComFoto[0];
                                    const fotoAnt = anterior ? (anterior.imagemUrl || (anterior.fotos && anterior.fotos[0]?.url)) : (fotosGlobais[0]?.imagemUrl);
                                    if (fotoAnt && fotoPrincipal) {
                                      const labelAnt = anterior 
                                        ? `${anterior.tipoConsulta || 'Consulta'} (${anterior.data} • ${anterior.area})`
                                        : `Foto Global (${fotosGlobais[0].data} • ${fotosGlobais[0].angulo})`;
                                      setComparadorFotoAUrl(fotoAnt);
                                      setComparadorFotoBUrl(fotoPrincipal);
                                      setAbaProntuario('comparador');
                                      if (onAbrirComparador) {
                                        onAbrirComparador(
                                          fotoAnt,
                                          fotoPrincipal,
                                          labelAnt,
                                          `${cons.tipoConsulta || 'Consulta'} (${cons.data} • ${cons.area})`
                                        );
                                      }
                                    }
                                  }}
                                  className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/70 dark:hover:bg-emerald-900 text-emerald-800 dark:text-emerald-200 text-xs font-semibold flex items-center gap-1.5 transition-colors border border-emerald-300 dark:border-emerald-700/80 shadow-2xs"
                                  title="Comparar registros fotográficos desta consulta com consulta anterior para ver mudanças e evolução"
                                >
                                  <GitCompare className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                                  <span>Ver Mudanças</span>
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={() => handleToggleLiberacaoConsulta(cons)}
                                className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors border ${
                                  cons.liberadoPaciente
                                    ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700/80 hover:bg-emerald-100'
                                    : 'bg-stone-100 dark:bg-slate-800 text-stone-600 dark:text-slate-400 border-stone-200 dark:border-slate-700 hover:bg-stone-200'
                                }`}
                                title={
                                  cons.liberadoPaciente
                                    ? 'Liberado no Portal do Paciente. Clique para ocultar.'
                                    : 'Oculto do paciente. Clique para liberar esta evolução e fotos no Portal.'
                                }
                              >
                                {cons.liberadoPaciente ? (
                                  <>
                                    <Eye className="w-3.5 h-3.5 text-emerald-600" />
                                    <span>Liberado no Portal</span>
                                  </>
                                ) : (
                                  <>
                                    <EyeOff className="w-3.5 h-3.5 text-stone-400" />
                                    <span>Oculto do Paciente</span>
                                  </>
                                )}
                              </button>

                              {cons.sessionId && (
                                <button
                                  type="button"
                                  onClick={() => onCarregarSessaoNaBancada(cons.sessionId!)}
                                  className="px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 dark:bg-rose-950 dark:hover:bg-rose-900 text-rose-800 dark:text-rose-200 text-xs font-semibold flex items-center gap-1 transition-colors"
                                  title="Abrir imagem na bancada de marcação e contagem"
                                >
                                  <Microscope className="w-3.5 h-3.5" />
                                  <span>Abrir na Bancada</span>
                                </button>
                              )}

                              {!cons.sessionId && (
                                <button
                                  type="button"
                                  onClick={() => handleExcluirConsulta(cons.id)}
                                  className="p-1 rounded-lg text-stone-400 hover:text-rose-600 transition-colors"
                                  title="Excluir consulta do histórico"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Galeria de Fotos Registradas na Consulta */}
                          {cons.fotos && cons.fotos.length > 1 ? (
                            <div className="space-y-2">
                              <div className="flex items-center gap-1.5 text-xs font-bold text-stone-700 dark:text-slate-300">
                                <Camera className="w-3.5 h-3.5 text-teal-600" />
                                <span>Registros Fotográficos Desta Consulta ({cons.fotos.length} fotos anexadas):</span>
                              </div>
                              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
                                {cons.fotos.map((f, fIdx) => (
                                  <div
                                    key={f.id || fIdx}
                                    onClick={() => setModalFotoAmpliada({ url: f.url, titulo: `${pacienteAtivo.nome} • ${f.titulo || cons.area}`, data: cons.data })}
                                    className="relative rounded-xl overflow-hidden bg-black border border-stone-200 dark:border-slate-800 aspect-[4/3] cursor-pointer group hover:border-teal-400 shadow-2xs transition-all"
                                    title="Clique para ampliar esta foto"
                                  >
                                    <img src={f.url} alt={f.titulo || `Foto ${fIdx + 1}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[11px] font-semibold gap-1">
                                      <Eye className="w-3.5 h-3.5" />
                                      <span>Ampliar</span>
                                    </div>
                                    <span className="absolute bottom-1 left-1 right-1 text-[10px] font-medium text-white bg-black/70 backdrop-blur-xs px-1.5 py-0.5 rounded truncate">
                                      {f.titulo || `Foto ${fIdx + 1}`}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ) : null}

                          {/* Conteúdo: Miniatura Única (se houver apenas 1 foto) + Métricas & Anotações */}
                          <div className="flex flex-col sm:flex-row gap-4">
                            {(!cons.fotos || cons.fotos.length <= 1) && fotoPrincipal && fotoPrincipal.trim() !== '' && (
                              <div
                                onClick={() => setModalFotoAmpliada({ url: fotoPrincipal, titulo: `${pacienteAtivo.nome} • ${cons.area}`, data: cons.data })}
                                className="w-full sm:w-40 h-32 rounded-xl overflow-hidden bg-black border border-stone-300 dark:border-slate-700 relative shrink-0 cursor-pointer group shadow-2xs"
                                title="Clique para ampliar foto"
                              >
                                <img
                                  src={fotoPrincipal}
                                  alt="Registro da consulta"
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-semibold gap-1">
                                  <Eye className="w-4 h-4" />
                                  <span>Ampliar</span>
                                </div>
                                <span className="absolute bottom-1.5 left-1.5 px-2 py-0.5 rounded-md bg-black/70 text-white font-bold text-[10px] backdrop-blur-xs">
                                  {cons.area}
                                </span>
                              </div>
                            )}

                            {/* Detalhes Clínicos, Anotações e Métricas */}
                            <div className="flex-1 space-y-2.5 text-xs">
                              {/* Campo de Anotações Clínicas da Consulta */}
                              {cons.anotacoes && (
                                <div className="p-3 rounded-xl bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-900/40 text-stone-700 dark:text-slate-300 space-y-1">
                                  <span className="text-[10px] uppercase font-bold text-amber-900 dark:text-amber-300 tracking-wider flex items-center gap-1.5">
                                    <FileText className="w-3 h-3 text-amber-600" />
                                    <span>Anotações Clínicas & Observações:</span>
                                  </span>
                                  <p className="leading-relaxed whitespace-pre-wrap font-medium">{cons.anotacoes}</p>
                                </div>
                              )}

                              {/* Evolução Relatada / Queixas Atuais */}
                              {cons.queixaEvolucao && (
                                <div className="p-2.5 rounded-xl bg-stone-100/70 dark:bg-slate-900 border border-stone-200/70 dark:border-slate-800 text-stone-700 dark:text-slate-300 space-y-0.5">
                                  <span className="text-[10px] uppercase font-bold text-stone-500 dark:text-slate-400 tracking-wider">
                                    Evolução Relatada / Queixas Atuais:
                                  </span>
                                  <p className="leading-relaxed">{cons.queixaEvolucao}</p>
                                </div>
                              )}

                              {/* Conduta Clínica & Prescrições */}
                              {cons.condutaTratamento && (
                                <div className="p-2.5 rounded-xl bg-teal-50/50 dark:bg-teal-950/20 border border-teal-200/70 dark:border-teal-800/40 text-stone-700 dark:text-slate-300 space-y-0.5">
                                  <span className="text-[10px] uppercase font-bold text-teal-800 dark:text-teal-300 tracking-wider">
                                    Conduta Clínica & Prescrições:
                                  </span>
                                  <p className="leading-relaxed">{cons.condutaTratamento}</p>
                                </div>
                              )}

                              {/* Métricas da Bancada se for sessão de fototricoscopia */}
                              {(cons.totalFios !== undefined || cons.focosInflamacao !== undefined) && (
                                <div className="flex flex-wrap items-center gap-2 pt-1">
                                  {cons.totalFios !== undefined && (
                                    <span className="px-2 py-0.5 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 font-mono text-[11px] font-semibold">
                                      Fios: {cons.totalFios}
                                    </span>
                                  )}
                                  {cons.totalUF !== undefined && (
                                    <span className="px-2 py-0.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-mono text-[11px] font-semibold">
                                      UFs: {cons.totalUF}
                                    </span>
                                  )}
                                  {cons.ostiosVazios !== undefined && cons.ostiosVazios > 0 && (
                                    <span className="px-2 py-0.5 rounded-lg bg-orange-50 dark:bg-orange-950/60 text-orange-800 dark:text-orange-300 font-mono text-[11px] font-semibold">
                                      Vazios: {cons.ostiosVazios}
                                    </span>
                                  )}
                                  {cons.focosInflamacao !== undefined && cons.focosInflamacao > 0 && (
                                    <span className="px-2 py-0.5 rounded-lg bg-fuchsia-50 dark:bg-fuchsia-950/60 text-fuchsia-800 dark:text-fuchsia-300 font-mono text-[11px] font-semibold flex items-center gap-1">
                                      <Flame className="w-3 h-3 text-fuchsia-600" />
                                      <span>Inflamação: {cons.focosInflamacao}</span>
                                    </span>
                                  )}
                                </div>
                              )}

                              {/* Achados detectados */}
                              {cons.achadosResumo && (
                                <div className="text-[11px] text-stone-600 dark:text-slate-300 pt-0.5">
                                  <strong className="text-rose-700 dark:text-rose-400">Sinais registrados:</strong> {cons.achadosResumo}
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

              {/* SEÇÃO: PRODUTOS & PRESCRIÇÕES INDICADAS (HOME CARE) */}
              <div className="bg-white dark:bg-slate-900 rounded-3xl border border-stone-200/90 dark:border-slate-800 p-5 sm:p-6 space-y-4 shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-100 dark:border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <Pill className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                    <div>
                      <h3 className="text-sm font-bold text-stone-900 dark:text-slate-100 uppercase tracking-wider">
                        Produtos e Cuidados Indicados (Home Care)
                      </h3>
                      <p className="text-[11px] text-stone-400">
                        Orientações de produtos e fórmulas liberadas para o paciente visualizar no Portal.
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setProdutoEmEdicao(null);
                      setModalProdutoAberto(true);
                    }}
                    className="px-3.5 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs shrink-0"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    <span>Indicar Novo Produto</span>
                  </button>
                </div>

                {carregandoProdutos ? (
                  <div className="text-center py-6 text-stone-400 text-xs animate-pulse">
                    Carregando produtos indicados...
                  </div>
                ) : produtosPaciente.length === 0 ? (
                  <div className="text-center py-8 px-4 bg-stone-50/50 dark:bg-slate-950/40 rounded-2xl border border-dashed border-stone-200 dark:border-slate-800 space-y-2">
                    <Pill className="w-8 h-8 text-stone-300 dark:text-slate-700 mx-auto" />
                    <p className="text-xs font-bold text-stone-700 dark:text-slate-300">
                      Nenhum produto indicado ainda para {pacienteAtivo.nome}
                    </p>
                    <p className="text-[11px] text-stone-400 max-w-sm mx-auto">
                      Indique fórmulas manipuladas, loções tópicas, xampus ou suplementos. Ao marcar como liberado, o paciente verá as orientações no portal.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    {produtosPaciente.map(prod => (
                      <div
                        key={prod.id}
                        className="p-4 rounded-2xl border border-stone-200/90 dark:border-slate-800 bg-stone-50/60 dark:bg-slate-950/60 space-y-3 hover:border-stone-300 dark:hover:border-slate-700 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-xl bg-teal-500/10 text-teal-700 dark:text-teal-400 flex items-center justify-center shrink-0">
                              <Pill className="w-4 h-4" />
                            </div>
                            <div>
                              <span className="text-[10px] font-bold uppercase tracking-wider text-teal-700 dark:text-teal-400 block">
                                Prescrição Home Care
                              </span>
                              <h4 className="text-xs font-bold text-stone-900 dark:text-slate-100">
                                {prod.nome}
                              </h4>
                            </div>
                          </div>

                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => {
                                setProdutoEmEdicao(prod);
                                setModalProdutoAberto(true);
                              }}
                              className="p-1 rounded-lg text-stone-400 hover:text-stone-700 dark:hover:text-slate-200 transition-colors"
                              title="Editar indicação"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleExcluirProduto(prod.id)}
                              className="p-1 rounded-lg text-stone-400 hover:text-rose-600 transition-colors"
                              title="Excluir indicação"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-stone-200/70 dark:border-slate-800 space-y-1">
                          <span className="text-[10px] font-bold text-stone-500 dark:text-slate-400 uppercase block">
                            Modo de Uso:
                          </span>
                          <p className="text-xs text-stone-700 dark:text-slate-200 font-medium leading-relaxed">
                            {prod.comoUsar}
                          </p>
                        </div>

                        {prod.observacao && (
                          <p className="text-[11px] text-stone-500 dark:text-slate-400">
                            <span className="font-semibold text-stone-600 dark:text-slate-300">Obs:</span> {prod.observacao}
                          </p>
                        )}

                        {/* Toggle Liberado no Portal */}
                        <div className="pt-2 flex items-center justify-between border-t border-stone-200/60 dark:border-slate-800">
                          <span className="text-[11px] text-stone-500 dark:text-slate-400">
                            Visibilidade no Portal:
                          </span>
                          <button
                            type="button"
                            onClick={() => handleToggleLiberacaoProduto(prod)}
                            className={`px-2.5 py-1 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors border ${
                              prod.liberadoPaciente
                                ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700/80 hover:bg-emerald-100'
                                : 'bg-stone-100 dark:bg-slate-800 text-stone-600 dark:text-slate-400 border-stone-200 dark:border-slate-700 hover:bg-stone-200'
                            }`}
                            title={prod.liberadoPaciente ? 'Liberado no Portal do Paciente. Clique para ocultar.' : 'Oculto do paciente. Clique para liberar no Portal.'}
                          >
                            {prod.liberadoPaciente ? (
                              <>
                                <Eye className="w-3.5 h-3.5 text-emerald-600" />
                                <span>Liberado no Portal</span>
                              </>
                            ) : (
                              <>
                                <EyeOff className="w-3.5 h-3.5 text-stone-400" />
                                <span>Oculto do Paciente</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
                </>
              )}
            </>
          ) : (
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-stone-200/90 dark:border-slate-800 p-12 text-center space-y-3">
              <Users className="w-12 h-12 text-stone-300 dark:text-slate-700 mx-auto" />
              <h3 className="text-base font-bold text-stone-800 dark:text-slate-200">
                Selecione um paciente na lista ao lado
              </h3>
              <p className="text-xs text-stone-500 max-w-sm mx-auto">
                Ou cadastre um novo paciente para gerenciar informações clínicas e histórico de consultas.
              </p>
              <button
                onClick={handleAbrirNovoPaciente}
                className="px-4 py-2 rounded-xl bg-rose-700 text-white text-xs font-bold shadow-xs hover:bg-rose-800"
              >
                Cadastrar Paciente
              </button>
            </div>
          )}
        </div>
      </div>

      {/* MODAL: CADASTRAR OU EDITAR PACIENTE */}
      {modalPacienteAberto && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-2.5 sm:p-4 overflow-y-auto animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-800 rounded-3xl w-full max-w-lg p-5 sm:p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto my-auto">
            <div className="flex items-center justify-between border-b border-stone-100 dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold text-stone-900 dark:text-slate-100 flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-rose-700" />
                <span>{pacienteEmEdicao ? 'Editar Prontuário do Paciente' : 'Cadastrar Novo Paciente'}</span>
              </h3>
              <button
                onClick={() => setModalPacienteAberto(false)}
                className="p-1 rounded-lg text-stone-400 hover:text-stone-700 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSalvarPaciente} className="space-y-3.5 text-xs">
              <div>
                <label className="font-semibold text-stone-700 dark:text-slate-300 block mb-1">
                  Nome Completo *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Mariana Silva Alencar"
                  value={formNome}
                  onChange={(e) => setFormNome(e.target.value)}
                  className="w-full bg-stone-50 dark:bg-slate-950 border border-stone-200 dark:border-slate-700 rounded-xl p-2.5 text-xs text-stone-900 dark:text-slate-100 focus:outline-none focus:border-rose-400"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-stone-700 dark:text-slate-300 block mb-1">
                    Telefone / WhatsApp
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: (11) 98765-4321"
                    value={formTelefone}
                    onChange={(e) => setFormTelefone(e.target.value)}
                    className="w-full bg-stone-50 dark:bg-slate-950 border border-stone-200 dark:border-slate-700 rounded-xl p-2.5 text-xs text-stone-900 dark:text-slate-100 focus:outline-none focus:border-rose-400"
                  />
                </div>

                <div>
                  <label className="font-semibold text-stone-700 dark:text-slate-300 block mb-1">
                    E-mail do Paciente
                  </label>
                  <input
                    type="email"
                    placeholder="Ex: cliente@email.com"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    className="w-full bg-stone-50 dark:bg-slate-950 border border-stone-200 dark:border-slate-700 rounded-xl p-2.5 text-xs text-stone-900 dark:text-slate-100 focus:outline-none focus:border-rose-400"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-stone-700 dark:text-slate-300 block mb-1">
                  Data de Nascimento
                </label>
                <input
                  type="date"
                  value={formDataNasc}
                  onChange={(e) => setFormDataNasc(e.target.value)}
                  className="w-full bg-stone-50 dark:bg-slate-950 border border-stone-200 dark:border-slate-700 rounded-xl p-2.5 text-xs text-stone-900 dark:text-slate-100 focus:outline-none focus:border-rose-400"
                />
              </div>

              <div>
                <label className="font-semibold text-stone-700 dark:text-slate-300 block mb-1">
                  Sexo / Gênero
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {['Feminino', 'Masculino', 'Outro'].map(g => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => setFormGenero(g)}
                      className={`py-1.5 rounded-xl border font-semibold transition-all ${
                        formGenero === g
                          ? 'bg-rose-50 border-rose-500 text-rose-700 dark:bg-rose-950 dark:border-rose-600 dark:text-rose-200 shadow-xs'
                          : 'bg-stone-50 dark:bg-slate-950 border-stone-200 dark:border-slate-700 text-stone-600 dark:text-slate-400'
                      }`}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="font-semibold text-stone-700 dark:text-slate-300 block mb-1">
                  Queixa Principal / Motivo da Consulta
                </label>
                <textarea
                  rows={2}
                  placeholder="Ex: Queda acentuada pós-parto, perda de densidade no vértex, coceira ou descamação..."
                  value={formQueixa}
                  onChange={(e) => setFormQueixa(e.target.value)}
                  className="w-full bg-stone-50 dark:bg-slate-950 border border-stone-200 dark:border-slate-700 rounded-xl p-2.5 text-xs text-stone-900 dark:text-slate-100 focus:outline-none focus:border-rose-400 resize-none"
                />
              </div>

              <div>
                <label className="font-semibold text-stone-700 dark:text-slate-300 block mb-1">
                  Histórico Clínico, Familiar e Tratamentos Prévios
                </label>
                <textarea
                  rows={3}
                  placeholder="Ex: Histórico paterno de calvície, exames de sangue recentes, uso de minoxidil ou anticoncepcional, químicas frequentes..."
                  value={formHistorico}
                  onChange={(e) => setFormHistorico(e.target.value)}
                  className="w-full bg-stone-50 dark:bg-slate-950 border border-stone-200 dark:border-slate-700 rounded-xl p-2.5 text-xs text-stone-900 dark:text-slate-100 focus:outline-none focus:border-rose-400 resize-none"
                />
              </div>

              <div className="flex items-center justify-between gap-2 pt-3 border-t border-stone-100 dark:border-slate-800 flex-wrap">
                <div className="flex items-center gap-2 flex-wrap">
                  {pacienteEmEdicao && (
                    <button
                      type="button"
                      onClick={() => {
                        handleSolicitarExcluirPaciente(pacienteEmEdicao.id, pacienteEmEdicao.nome);
                      }}
                      className="px-3 py-2 rounded-xl border border-rose-200 dark:border-rose-900/60 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/60 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                      title="Excluir este paciente permanentemente"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Excluir Paciente</span>
                    </button>
                  )}
                  {pacienteEmEdicao && (
                    <button
                      type="button"
                      onClick={() => {
                        setModalConviteAberto(true);
                      }}
                      className={`px-3 py-2 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all ${
                        !temPermissaoPortal
                          ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30 hover:bg-amber-500/20'
                          : 'bg-teal-50 dark:bg-teal-950/40 text-teal-800 dark:text-teal-300 border-teal-300 dark:border-teal-700 hover:bg-teal-100'
                      }`}
                      title={!temPermissaoPortal ? 'Envio de acesso ao portal do paciente é exclusivo do Plano Anual' : 'Enviar convite de acesso para o WhatsApp do paciente'}
                    >
                      {!temPermissaoPortal ? <Lock className="w-3.5 h-3.5 text-amber-500" /> : <Send className="w-3.5 h-3.5 text-teal-600" />}
                      <span>Acesso Portal {!temPermissaoPortal ? '(Anual)' : ''}</span>
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setModalPacienteAberto(false)}
                    className="px-4 py-2 rounded-xl bg-stone-100 dark:bg-slate-800 text-stone-700 dark:text-slate-300 font-semibold"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-rose-700 hover:bg-rose-800 text-white font-bold shadow-xs transition-colors"
                  >
                    {pacienteEmEdicao ? 'Salvar Alterações' : 'Cadastrar Paciente'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: REGISTRAR NOVA CONSULTA COM REGISTROS FOTOGRÁFICOS, DATA E ANOTAÇÕES */}
      {modalConsultaAberto && pacienteAtivo && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-2.5 sm:p-4 overflow-y-auto animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-800 rounded-3xl w-full max-w-2xl p-5 sm:p-7 space-y-5 shadow-2xl max-h-[92vh] overflow-y-auto my-auto">
            <div className="flex items-center justify-between border-b border-stone-100 dark:border-slate-800 pb-3.5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-300 flex items-center justify-center border border-teal-200/60 dark:border-teal-800 shrink-0">
                  <PlusCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-stone-900 dark:text-slate-100">
                    Nova Consulta & Registros Fotográficos
                  </h3>
                  <p className="text-xs text-stone-500 dark:text-slate-400">
                    Prontuário de <strong>{pacienteAtivo.nome}</strong>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalConsultaAberto(false)}
                className="p-1.5 rounded-xl text-stone-400 hover:text-stone-700 dark:hover:text-slate-200 hover:bg-stone-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSalvarConsultaAvulsa} className="space-y-4 text-xs">
              {/* Data, Tipo e Área da Consulta */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="font-semibold text-stone-700 dark:text-slate-300 block mb-1 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-teal-600" />
                    <span>Data da Consulta *</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={formConsData}
                    onChange={(e) => setFormConsData(e.target.value)}
                    className="w-full bg-stone-50 dark:bg-slate-950 border border-stone-200 dark:border-slate-700 rounded-xl p-2.5 text-xs text-stone-900 dark:text-slate-100 focus:outline-none focus:border-teal-500"
                  />
                </div>

                <div>
                  <label className="font-semibold text-stone-700 dark:text-slate-300 block mb-1">
                    Tipo de Atendimento
                  </label>
                  <select
                    value={formConsTipo}
                    onChange={(e) => setFormConsTipo(e.target.value)}
                    className="w-full bg-stone-50 dark:bg-slate-950 border border-stone-200 dark:border-slate-700 rounded-xl p-2.5 text-xs text-stone-900 dark:text-slate-100 focus:outline-none focus:border-teal-500"
                  >
                    <option value="Consulta de Retorno">Consulta de Retorno</option>
                    <option value="Primeira Avaliação / Diagnóstico">Primeira Avaliação / Diagnóstico</option>
                    <option value="Acompanhamento do Tratamento">Acompanhamento do Tratamento</option>
                    <option value="Sessão Terapêutica (Laser/MMP)">Sessão Terapêutica (Laser/MMP)</option>
                    <option value="Manutenção Preventiva">Manutenção Preventiva</option>
                    <option value="Outro">Outro</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-stone-700 dark:text-slate-300 block mb-1 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-rose-600" />
                    <span>Área Principal</span>
                  </label>
                  <select
                    value={formConsArea}
                    onChange={(e) => setFormConsArea(e.target.value)}
                    className="w-full bg-stone-50 dark:bg-slate-950 border border-stone-200 dark:border-slate-700 rounded-xl p-2.5 text-xs text-stone-900 dark:text-slate-100 focus:outline-none focus:border-teal-500"
                  >
                    <option value="Vértice / Vértex">Vértice / Vértex</option>
                    <option value="Linha Frontal Anterior">Linha Frontal Anterior</option>
                    <option value="Região Parietal Direita">Região Parietal Direita</option>
                    <option value="Região Parietal Esquerda">Região Parietal Esquerda</option>
                    <option value="Região Occipital">Região Occipital</option>
                    <option value="Coroa">Coroa</option>
                    <option value="Área Marginal / Têmporas">Área Marginal / Têmporas</option>
                    <option value="Couro Cabeludo Total">Couro Cabeludo Total</option>
                  </select>
                </div>
              </div>

              {/* SEÇÃO: NOVOS REGISTROS FOTOGRÁFICOS DA CONSULTA */}
              <div className="p-3.5 sm:p-4 rounded-2xl bg-teal-50/40 dark:bg-teal-950/20 border border-teal-200/80 dark:border-teal-800/60 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Camera className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                    <span className="font-bold text-stone-900 dark:text-slate-100 uppercase tracking-wider text-xs">
                      Novos Registros Fotográficos da Consulta
                    </span>
                  </div>
                  <span className="text-[11px] font-semibold text-teal-800 dark:text-teal-300">
                    {formConsFotos.length} {formConsFotos.length === 1 ? 'foto anexada' : 'fotos anexadas'}
                  </span>
                </div>
                <p className="text-[11px] text-stone-500 dark:text-slate-400 leading-relaxed">
                  Tire fotos pelo celular/câmera ou anexe imagens para adicionar ao histórico do paciente. Essas fotos permitirão comparar a evolução e ver as mudanças ao longo das consultas.
                </p>

                {/* Botão de Upload e Dropzone */}
                <div>
                  <input
                    type="file"
                    id="inputFotoNovaConsulta"
                    multiple
                    accept="image/*"
                    onChange={handleAdicionarFotoConsulta}
                    className="hidden"
                  />
                  <label
                    htmlFor="inputFotoNovaConsulta"
                    className="w-full flex items-center justify-center gap-2 p-3 rounded-xl border-2 border-dashed border-teal-300 dark:border-teal-700 bg-white dark:bg-slate-900 hover:bg-teal-50/50 dark:hover:bg-slate-800 cursor-pointer transition-all text-teal-700 dark:text-teal-300 font-semibold"
                  >
                    {processandoFotoConsulta ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-teal-600" />
                        <span>Otimizando imagem para arquivamento...</span>
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4" />
                        <span>+ Selecionar Fotos ou Tirar com a Câmera</span>
                      </>
                    )}
                  </label>
                </div>

                {/* Grade de Pré-visualização das Fotos Anexadas */}
                {formConsFotos.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-1">
                    {formConsFotos.map((foto, idx) => (
                      <div
                        key={foto.id}
                        className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-teal-200 dark:border-teal-800 flex flex-col justify-between gap-2 shadow-2xs relative group"
                      >
                        <div className="w-full aspect-[4/3] rounded-lg overflow-hidden bg-black relative">
                          <img src={foto.url} alt={`Foto ${idx + 1}`} className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={() => handleRemoverFotoConsulta(foto.id)}
                            className="absolute top-1 right-1 p-1 rounded-md bg-black/70 hover:bg-rose-600 text-white transition-colors"
                            title="Remover foto"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                          <span className="absolute bottom-1 left-1 px-1.5 py-0.2 rounded bg-black/60 text-white text-[9px] font-mono">
                            Foto {idx + 1}
                          </span>
                        </div>
                        <input
                          type="text"
                          placeholder="Legenda da foto..."
                          value={foto.titulo || ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            setFormConsFotos(prev => prev.map(f => f.id === foto.id ? { ...f, titulo: val } : f));
                          }}
                          className="w-full text-[10px] p-1.5 rounded-lg border border-stone-200 dark:border-slate-700 bg-stone-50 dark:bg-slate-950 text-stone-800 dark:text-slate-200 focus:outline-none focus:border-teal-500"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* CAMPO PARA ANOTAÇÕES CLÍNICAS DA CONSULTA */}
              <div>
                <label className="font-semibold text-stone-700 dark:text-slate-300 block mb-1 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-amber-600" />
                  <span>Anotações Clínicas da Consulta & Observações</span>
                </label>
                <textarea
                  rows={3}
                  placeholder="Ex: Exame físico do couro cabeludo: tração suave negativa, eritema discreto na região parietal, boa resposta clínica perceptível, afinamento em regressão..."
                  value={formConsAnotacoes}
                  onChange={(e) => setFormConsAnotacoes(e.target.value)}
                  className="w-full bg-stone-50 dark:bg-slate-950 border border-stone-200 dark:border-slate-700 rounded-xl p-2.5 text-xs text-stone-900 dark:text-slate-100 focus:outline-none focus:border-teal-500 resize-none"
                />
              </div>

              {/* Evolução Relatada / Queixas Atuais */}
              <div>
                <label className="font-semibold text-stone-700 dark:text-slate-300 block mb-1">
                  Evolução Relatada pelo Paciente / Queixas Atuais
                </label>
                <textarea
                  rows={2}
                  placeholder="Ex: Paciente relata diminuição acentuada da queda após 45 dias de uso regular da fórmula tópica..."
                  value={formConsQueixa}
                  onChange={(e) => setFormConsQueixa(e.target.value)}
                  className="w-full bg-stone-50 dark:bg-slate-950 border border-stone-200 dark:border-slate-700 rounded-xl p-2.5 text-xs text-stone-900 dark:text-slate-100 focus:outline-none focus:border-teal-500 resize-none"
                />
              </div>

              {/* Conduta Clínica & Prescrições */}
              <div>
                <label className="font-semibold text-stone-700 dark:text-slate-300 block mb-1">
                  Conduta Clínica & Prescrições Terapêuticas
                </label>
                <textarea
                  rows={2}
                  placeholder="Ex: Manter minoxidil tópico 5%, prescrever shampoo com cetoconazol 2% 3x/semana, agendar retorno em 60 dias..."
                  value={formConsConduta}
                  onChange={(e) => setFormConsConduta(e.target.value)}
                  className="w-full bg-stone-50 dark:bg-slate-950 border border-stone-200 dark:border-slate-700 rounded-xl p-2.5 text-xs text-stone-900 dark:text-slate-100 focus:outline-none focus:border-teal-500 resize-none"
                />
              </div>

              {/* Chave Liberar para o Paciente no Portal */}
              <label className="flex items-center gap-2.5 p-3 rounded-2xl border border-teal-200/80 dark:border-teal-800/60 bg-teal-50/50 dark:bg-teal-950/30 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formConsLiberado}
                  onChange={(e) => setFormConsLiberado(e.target.checked)}
                  className="rounded text-teal-600 focus:ring-teal-500 w-4 h-4 cursor-pointer"
                />
                <span className="text-xs font-semibold text-teal-900 dark:text-teal-200 select-none">
                  Liberar esta consulta e seus registros fotográficos para o paciente visualizar no Portal
                </span>
              </label>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-stone-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setModalConsultaAberto(false)}
                  className="px-4 py-2.5 rounded-xl bg-stone-100 dark:bg-slate-800 text-stone-700 dark:text-slate-300 font-semibold hover:bg-stone-200 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={salvandoConsulta}
                  className="px-5 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold shadow-md shadow-teal-700/20 transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  {salvandoConsulta ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Salvando Consulta...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Salvar Consulta no Histórico</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: FOTO AMPLIADA */}
      {modalFotoAmpliada && (
        <div 
          onClick={() => setModalFotoAmpliada(null)}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-800 rounded-3xl max-w-2xl w-full overflow-hidden shadow-2xl space-y-3 p-4"
          >
            <div className="flex items-center justify-between pb-2 border-b border-stone-100 dark:border-slate-800 text-xs">
              <div>
                <h4 className="font-bold text-stone-900 dark:text-slate-100">{modalFotoAmpliada.titulo}</h4>
                <p className="text-stone-500 font-mono text-[10px]">Data do Exame: {modalFotoAmpliada.data}</p>
              </div>
              <button
                onClick={() => setModalFotoAmpliada(null)}
                className="p-1 rounded-lg text-stone-400 hover:text-stone-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="w-full aspect-[4/3] rounded-2xl overflow-hidden bg-black border border-stone-200 dark:border-slate-800 flex items-center justify-center">
              {modalFotoAmpliada.url && modalFotoAmpliada.url.trim() !== '' ? (
                <img
                  src={modalFotoAmpliada.url}
                  alt="Foto ampliada"
                  className="w-full h-full object-contain"
                />
              ) : (
                <span className="text-xs text-stone-400">Imagem indisponível</span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CONVITE PARA O PORTAL DO PACIENTE */}
      {modalConviteAberto && pacienteAtivo && (
        <ModalConvitePortal
          paciente={pacienteAtivo}
          profissional={usuarioAtual}
          onClose={() => setModalConviteAberto(false)}
          onNavegarParaPlanos={onNavegarParaPlanos}
          onPacienteAtualizado={(atualizado) => {
            setPacientes(prev => prev.map(p => p.id === atualizado.id ? atualizado : p));
          }}
        />
      )}

      {/* MODAL: INDICAR / EDITAR PRODUTO */}
      {modalProdutoAberto && pacienteAtivo && (
        <ModalProdutoIndicado
          pacienteId={pacienteAtivo.id}
          pacienteUid={pacienteAtivo.pacienteUid}
          profissionalUid={usuarioAtual?.uid || ''}
          produtoEmEdicao={produtoEmEdicao}
          onClose={() => {
            setModalProdutoAberto(false);
            setProdutoEmEdicao(null);
          }}
          onSucesso={(prodSalvo) => {
            setProdutosPaciente(prev => {
              const idx = prev.findIndex(p => p.id === prodSalvo.id);
              if (idx >= 0) {
                const cp = [...prev];
                cp[idx] = prodSalvo;
                return cp;
              }
              return [prodSalvo, ...prev];
            });
            mostrarAlerta('sucesso', 'Produto indicado salvo com sucesso!');
          }}
        />
      )}

      {/* MODAL DE TRANSIÇÃO DO FLUXO: APÓS CRIAR NOVO PACIENTE */}
      {modalProximoPassoFluxo.aberto && modalProximoPassoFluxo.paciente && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-fadeIn">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-7 shadow-2xl border border-teal-500/40 space-y-5 text-center">
            <div className="w-16 h-16 rounded-3xl bg-teal-500/10 text-teal-700 dark:text-teal-400 flex items-center justify-center mx-auto shadow-xs">
              <UserCheck className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <span className="px-3 py-1 rounded-full bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-300 text-[11px] font-bold uppercase tracking-wider">
                Passo 1 Concluído ✓
              </span>
              <h3 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
                Paciente Cadastrado com Sucesso!
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                <strong>{modalProximoPassoFluxo.paciente.nome}</strong> foi criado no prontuário. Para um atendimento completo e organizado, o próximo passo do fluxo é realizar a <strong>Anamnese Capilar</strong> antes do exame de Tricoscopia.
              </p>
            </div>

            <div className="space-y-2.5 pt-2">
              {onIniciarAnamnese && (
                <button
                  type="button"
                  onClick={() => {
                    const pac = modalProximoPassoFluxo.paciente!;
                    setModalProximoPassoFluxo({ aberto: false, paciente: null });
                    onDefinirPacienteAtivo?.(pac);
                    onIniciarAnamnese(pac);
                  }}
                  className="w-full py-3 px-4 rounded-2xl bg-teal-700 hover:bg-teal-800 text-white text-xs sm:text-sm font-bold flex items-center justify-center gap-2 shadow-lg transition-all hover:scale-[1.01]"
                >
                  <FileText className="w-4 h-4" />
                  <span>Avançar para Passo 2: Fazer Anamnese ➜</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  const pac = modalProximoPassoFluxo.paciente!;
                  setModalProximoPassoFluxo({ aberto: false, paciente: null });
                  onDefinirPacienteAtivo?.(pac);
                  onIniciarCapturaPaciente(pac);
                }}
                className="w-full py-2.5 px-4 rounded-2xl bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center justify-center gap-2 border border-slate-200 dark:border-slate-700 transition-colors"
              >
                <Camera className="w-4 h-4 text-rose-600" />
                <span>Pular direto para Tricoscopia (Passo 3)</span>
              </button>

              <button
                type="button"
                onClick={() => setModalProximoPassoFluxo({ aberto: false, paciente: null })}
                className="w-full py-2 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
              >
                Permanecer no Prontuário deste Paciente
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE CONFIRMAÇÃO: EXCLUIR PACIENTE */}
      {pacienteParaExcluir && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-fadeIn">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-7 shadow-2xl border border-rose-200 dark:border-rose-900/60 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 dark:bg-rose-950/70 text-rose-600 dark:text-rose-400 flex items-center justify-center">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="space-y-1.5">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                Excluir Cadastro do Paciente?
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Tem certeza de que deseja excluir permanentemente o paciente <strong className="text-slate-900 dark:text-slate-200">{pacienteParaExcluir.nome}</strong>?
              </p>
              <div className="p-3 rounded-2xl bg-rose-50/80 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-[11px] text-rose-700 dark:text-rose-300 space-y-1">
                <p className="font-semibold flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>Atenção: Ação irreversível</span>
                </p>
                <p className="leading-relaxed">
                  Todas as anotações do prontuário, receitas, indicações de produtos e exames deste paciente serão removidos do seu consultório.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                disabled={excluindoPaciente}
                onClick={() => setPacienteParaExcluir(null)}
                className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold transition-colors"
              >
                Cancelar
              </button>

              <button
                type="button"
                disabled={excluindoPaciente}
                onClick={handleConfirmarExcluirPaciente}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold flex items-center gap-2 transition-all shadow-md shadow-rose-600/25 disabled:opacity-50"
              >
                {excluindoPaciente ? (
                  <span>Excluindo...</span>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Sim, Excluir Paciente</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE CONFIRMAÇÃO: EXCLUIR CONSULTA */}
      {consultaParaExcluirId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-fadeIn">
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl border border-stone-200 dark:border-slate-800 space-y-4">
            <div className="w-10 h-10 rounded-2xl bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400 flex items-center justify-center">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Excluir Registro de Consulta?
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                Esta anotação clínica de consulta e evolução será removida do prontuário deste paciente.
              </p>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setConsultaParaExcluirId(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-200"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmarExcluirConsulta}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Excluir</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE CONFIRMAÇÃO: EXCLUIR PRODUTO INDICADO */}
      {produtoParaExcluirId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-fadeIn">
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl border border-stone-200 dark:border-slate-800 space-y-4">
            <div className="w-10 h-10 rounded-2xl bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400 flex items-center justify-center">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Excluir Indicação de Produto?
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                Esta indicação e modo de uso serão removidos do prontuário e do Portal do Paciente.
              </p>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setProdutoParaExcluirId(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-200"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmarExcluirProduto}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Excluir</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: UPLOAD DE FOTOGRAFIA CLÍNICA GLOBAL */}
      {modalFotoGlobalUploadAberto && pacienteAtivo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-fadeIn overflow-y-auto">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-7 shadow-2xl border border-teal-500/30 space-y-5 my-8">
            <div className="flex items-center justify-between border-b border-stone-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-300 flex items-center justify-center border border-teal-200 dark:border-teal-800">
                  <Upload className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-stone-900 dark:text-slate-100">
                    Upload de Fotografia Global
                  </h3>
                  <p className="text-xs text-stone-500 dark:text-slate-400">
                    Prontuário de <strong className="text-teal-700 dark:text-teal-400">{pacienteAtivo.nome}</strong>
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setModalFotoGlobalUploadAberto(false)}
                className="p-1.5 rounded-xl text-stone-400 hover:text-stone-700 dark:hover:text-slate-200 hover:bg-stone-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSalvarFotoGlobal} className="space-y-4">
              {/* Seleção do Ângulo da Foto com Badges */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-stone-700 dark:text-slate-300 uppercase tracking-wider">
                  Selecione o Ângulo Anatômico (Badge):
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {ANGULOS_FOTO_GLOBAL.map(ang => {
                    const isAtivo = formFotoGlobalAngulo === ang;
                    return (
                      <button
                        key={ang}
                        type="button"
                        onClick={() => setFormFotoGlobalAngulo(ang)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                          isAtivo
                            ? 'bg-teal-700 text-white border-teal-600 shadow-md shadow-teal-700/20 ring-2 ring-teal-400/40 scale-[1.02]'
                            : 'bg-stone-50 dark:bg-slate-800/80 text-stone-700 dark:text-slate-300 border-stone-200 dark:border-slate-700 hover:border-teal-400'
                        }`}
                      >
                        {ang}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Data da Fotografia */}
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-stone-700 dark:text-slate-300">
                  Data do Registro:
                </label>
                <input
                  type="date"
                  required
                  value={formFotoGlobalData}
                  onChange={(e) => setFormFotoGlobalData(e.target.value)}
                  className="w-full bg-stone-50 dark:bg-slate-950 border border-stone-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-stone-900 dark:text-slate-100 focus:outline-none focus:border-teal-500"
                />
              </div>

              {/* Upload do Arquivo / Dropzone com Preview */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-stone-700 dark:text-slate-300">
                  Arquivo da Imagem (Celular ou Câmera):
                </label>

                {formFotoGlobalImagemUrl ? (
                  <div className="relative rounded-2xl overflow-hidden border border-teal-500/40 bg-black max-h-64 aspect-[4/3] flex items-center justify-center group">
                    <img
                      src={formFotoGlobalImagemUrl}
                      alt="Pré-visualização"
                      className="w-full h-full object-contain"
                    />
                    <div className="absolute top-2 right-2 flex items-center gap-1.5">
                      <label className="px-3 py-1 rounded-xl bg-black/70 hover:bg-black/90 text-white text-[11px] font-bold cursor-pointer transition-colors backdrop-blur-xs">
                        <span>Trocar Foto</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleSelecionarArquivoFotoGlobal}
                          className="hidden"
                        />
                      </label>
                      <button
                        type="button"
                        onClick={() => setFormFotoGlobalImagemUrl(null)}
                        className="p-1 rounded-xl bg-rose-600/90 hover:bg-rose-700 text-white transition-colors"
                        title="Remover foto"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <span className="absolute bottom-2 left-2 px-2.5 py-0.5 rounded-lg bg-teal-800/90 text-white font-bold text-[10px] backdrop-blur-xs">
                      {formFotoGlobalAngulo} • {formFotoGlobalData}
                    </span>
                  </div>
                ) : (
                  <label className="w-full border-2 border-dashed border-stone-300 dark:border-slate-700 hover:border-teal-500 rounded-2xl p-6 sm:p-8 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all bg-stone-50/60 dark:bg-slate-950/60 group">
                    <div className="w-12 h-12 rounded-2xl bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                      {processandoImagemGlobal ? (
                        <Loader2 className="w-6 h-6 animate-spin" />
                      ) : (
                        <Upload className="w-6 h-6" />
                      )}
                    </div>
                    <div className="text-center">
                      <p className="text-xs font-bold text-stone-800 dark:text-slate-200">
                        {processandoImagemGlobal ? 'Otimizando imagem...' : 'Clique para selecionar ou arraste uma foto'}
                      </p>
                      <p className="text-[10px] text-stone-400 mt-0.5">
                        Formatos aceitos: JPG, PNG, WEBP (fotos de celular ou câmera)
                      </p>
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      disabled={processandoImagemGlobal}
                      onChange={handleSelecionarArquivoFotoGlobal}
                      className="hidden"
                    />
                  </label>
                )}
              </div>

              {/* Observações Clínicas */}
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-stone-700 dark:text-slate-300">
                  Observações Clínicas (Opcional):
                </label>
                <textarea
                  rows={2}
                  placeholder="Ex: Foto pré-tratamento, cabelo seco, luz padronizada..."
                  value={formFotoGlobalObservacoes}
                  onChange={(e) => setFormFotoGlobalObservacoes(e.target.value)}
                  className="w-full bg-stone-50 dark:bg-slate-950 border border-stone-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-stone-900 dark:text-slate-100 placeholder-stone-400 focus:outline-none focus:border-teal-500 resize-none"
                />
              </div>

              {/* Toggle de Liberação no Portal */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-stone-50 dark:bg-slate-950 border border-stone-200/80 dark:border-slate-800">
                <div className="space-y-0.5">
                  <span className="text-xs font-bold text-stone-800 dark:text-slate-200 flex items-center gap-1.5">
                    <Eye className="w-3.5 h-3.5 text-teal-600" />
                    <span>Liberar no Portal do Paciente?</span>
                  </span>
                  <p className="text-[10px] text-stone-400">
                    Permite que o paciente visualize esta foto na área do cliente pelo WhatsApp ou link.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={formFotoGlobalLiberado}
                  onChange={(e) => setFormFotoGlobalLiberado(e.target.checked)}
                  className="w-4 h-4 text-teal-600 rounded-md focus:ring-teal-500"
                />
              </div>

              {/* Botões do Rodapé */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-100 dark:border-slate-800">
                <button
                  type="button"
                  disabled={salvandoFotoGlobal}
                  onClick={() => setModalFotoGlobalUploadAberto(false)}
                  className="px-4 py-2 rounded-xl bg-stone-100 dark:bg-slate-800 text-stone-700 dark:text-slate-300 text-xs font-semibold hover:bg-stone-200 dark:hover:bg-slate-700 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={salvandoFotoGlobal || !formFotoGlobalImagemUrl}
                  className="px-5 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold flex items-center gap-2 transition-all shadow-md shadow-teal-700/20 disabled:opacity-50"
                >
                  {salvandoFotoGlobal ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Salvando Foto Global...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Salvar Foto Global na Ficha</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE VISUALIZAÇÃO AMPLIADA DA FOTO GLOBAL */}
      {modalFotoGlobalAmpliada && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
          <div className="relative max-w-4xl w-full bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/80">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-lg bg-teal-700 text-white font-bold text-xs">
                    {modalFotoGlobalAmpliada.angulo}
                  </span>
                  <h3 className="text-sm font-bold text-white">
                    {modalFotoGlobalAmpliada.titulo}
                  </h3>
                </div>
                <p className="text-[11px] text-slate-400 font-mono">
                  Data: {modalFotoGlobalAmpliada.data} {modalFotoGlobalAmpliada.observacoes ? `• "${modalFotoGlobalAmpliada.observacoes}"` : ''}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <a
                  href={modalFotoGlobalAmpliada.url}
                  download={`foto_global_${modalFotoGlobalAmpliada.angulo}_${modalFotoGlobalAmpliada.data}.jpg`}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
                  title="Baixar imagem"
                >
                  <Download className="w-4 h-4" />
                </a>
                <button
                  type="button"
                  onClick={() => setModalFotoGlobalAmpliada(null)}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-auto bg-black flex items-center justify-center p-2 min-h-[300px]">
              <img
                src={modalFotoGlobalAmpliada.url}
                alt={modalFotoGlobalAmpliada.titulo}
                className="max-h-[75vh] w-auto max-w-full object-contain rounded-lg"
              />
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE CONFIRMAÇÃO: EXCLUIR FOTO GLOBAL */}
      {fotoGlobalParaExcluirId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-fadeIn">
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl border border-stone-200 dark:border-slate-800 space-y-4">
            <div className="w-10 h-10 rounded-2xl bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400 flex items-center justify-center">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Excluir Fotografia Global?
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                Esta foto clínica macroscópica será excluída da ficha do paciente.
              </p>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setFotoGlobalParaExcluirId(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-200"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmarExcluirFotoGlobal}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Excluir Foto</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
