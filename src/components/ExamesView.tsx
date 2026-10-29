import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  FileText, 
  Sparkles, 
  AlertTriangle, 
  Check, 
  Trash2, 
  Plus, 
  Upload, 
  Download, 
  Calendar, 
  Building2, 
  ShieldCheck, 
  Lock, 
  TrendingUp, 
  Filter, 
  FileCheck, 
  Send, 
  Eye, 
  CheckCircle2, 
  X, 
  Layers, 
  ArrowRight,
  Info,
  Clock,
  RotateCcw
} from 'lucide-react';
import { 
  CategoriaExame, 
  ConsentimentoIaExames, 
  ExameLaboratorial, 
  ItemExame, 
  SituacaoMarcador 
} from '../types/exames';
import { Paciente } from '../types/paciente';
import { UsuarioProfissional } from '../types/usuario';
import { 
  agruparPorCategoria, 
  calcularSituacaoMarcador, 
  converterParaNumero, 
  deduzirCategoria, 
  isForaDaFaixa 
} from '../utils/examesCalculo';
import { 
  excluirExame, 
  listarExamesDoPaciente, 
  obterUsoIaServidor, 
  salvarConsentimentoPaciente, 
  salvarExame, 
  uploadArquivoLaudo 
} from '../services/examesService';
import { gerarCartaEncaminhamentoPdf, gerarTabelaExamePdf } from '../services/examePdfGenerator';
import { 
  obterLimiteMensalIa, 
  temPermissaoExamesIa, 
  temPermissaoExamesManual 
} from '../config/planos';
import { AVISO_PRIVACIDADE_LAUDO } from '../config/promptsIA';
import { auth } from '../firebase';

interface ExamesViewProps {
  paciente: Paciente;
  usuarioAtual: UsuarioProfissional | null;
  onAtualizarPaciente?: (pacienteAtualizado: Paciente) => void;
  onNavegarParaPlanos?: () => void;
}

export const ExamesView: React.FC<ExamesViewProps> = ({
  paciente,
  usuarioAtual,
  onAtualizarPaciente,
  onNavegarParaPlanos
}) => {
  // Verificação de permissões do plano
  const planoId = usuarioAtual?.planoId || 'master';
  const planoStatus = usuarioAtual?.planoStatus || 'trial';
  const podeAcessarManual = temPermissaoExamesManual(planoId, planoStatus);
  const podeAcessarIa = temPermissaoExamesIa(planoId, planoStatus);

  // Estados principais
  const [exames, setExames] = useState<ExameLaboratorial[]>([]);
  const [carregandoExames, setCarregandoExames] = useState(true);
  const [exameSelecionadoId, setExameSelecionadoId] = useState<string | null>(null);

  // Estado de uso da IA no mês
  const [usoIa, setUsoIa] = useState({ usado: 0, limite: 40, mes: '' });

  // Modal de Novo Exame / Modo de Inserção
  const [modalNovoAberto, setModalNovoAberto] = useState(false);
  const [etapaNovo, setEtapaNovo] = useState<'dados' | 'conferencia'>('dados');
  
  // Dados do formulário de novo exame
  const [formDataColeta, setFormDataColeta] = useState(() => new Date().toISOString().split('T')[0]);
  const [formLaboratorio, setFormLaboratorio] = useState('');
  const [arquivoSelecionado, setArquivoSelecionado] = useState<File | null>(null);
  const [arquivoPreviewUrl, setArquivoPreviewUrl] = useState<string | null>(null);
  const [processandoIa, setProcessandoIa] = useState(false);
  const [erroProcessamento, setErroProcessamento] = useState<string | null>(null);

  // Tabela de Conferência (Modo Planilha Editável)
  const [itensConferencia, setItensConferencia] = useState<ItemExame[]>([]);
  const [respostaIaBruta, setRespostaIaBruta] = useState<string>('');
  const [salvandoExame, setSalvandoExame] = useState(false);

  // Filtros de visualização de resultados
  const [filtroSoForaDaFaixa, setFiltroSoForaDaFaixa] = useState(false);
  const [marcadorEvolucao, setMarcadorEvolucao] = useState<string | null>(null);

  // Modal Carta de Encaminhamento
  const [modalCartaAberto, setModalCartaAberto] = useState(false);
  const [destinatarioTipo, setDestinatarioTipo] = useState<'Médico(a)' | 'Nutricionista'>('Médico(a)');
  const [obsCarta, setObsCarta] = useState('');

  // Consentimento do Paciente
  const [consentimentoMarcado, setConsentimentoMarcado] = useState(
    Boolean(paciente.consentimentoIaExames?.autorizado)
  );
  const [salvandoConsentimento, setSalvandoConsentimento] = useState(false);

  // Atualizar consentimento local quando mudar paciente
  useEffect(() => {
    setConsentimentoMarcado(Boolean(paciente.consentimentoIaExames?.autorizado));
  }, [paciente.id, paciente.consentimentoIaExames?.autorizado]);

  // Carregar exames do paciente
  const carregarExames = async () => {
    if (!usuarioAtual?.uid || !paciente.id) return;
    setCarregandoExames(true);
    try {
      const lista = await listarExamesDoPaciente(usuarioAtual.uid, paciente.id);
      setExames(lista);
      if (lista.length > 0) {
        setExameSelecionadoId(prev => prev && lista.some(e => e.id === prev) ? prev : lista[0].id);
      } else {
        setExameSelecionadoId(null);
      }
    } catch (e) {
      console.error('Erro ao carregar exames:', e);
    } finally {
      setCarregandoExames(false);
    }
  };

  useEffect(() => {
    carregarExames();
  }, [paciente.id, usuarioAtual?.uid]);

  // Carregar contador de uso de IA do mês
  useEffect(() => {
    const buscarUso = async () => {
      try {
        const token = await auth.currentUser?.getIdToken();
        if (token) {
          const dadosUso = await obterUsoIaServidor(token);
          setUsoIa(dadosUso);
        }
      } catch {}
    };
    buscarUso();
  }, [usuarioAtual?.uid]);

  // Exame ativo atual
  const exameAtivo = useMemo(() => {
    return exames.find(e => e.id === exameSelecionadoId) || null;
  }, [exames, exameSelecionadoId]);

  // Salvar consentimento de IA
  const handleToggleConsentimento = async (checked: boolean) => {
    setConsentimentoMarcado(checked);
    setSalvandoConsentimento(true);
    try {
      const dadosCons: ConsentimentoIaExames = {
        autorizado: checked,
        data: new Date().toISOString()
      };
      await salvarConsentimentoPaciente(paciente.id, dadosCons);
      if (onAtualizarPaciente) {
        onAtualizarPaciente({
          ...paciente,
          consentimentoIaExames: dadosCons
        });
      }
    } catch (err) {
      console.error('Erro ao salvar consentimento:', err);
    } finally {
      setSalvandoConsentimento(false);
    }
  };

  // Upload e Seleção de Arquivo
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 15 * 1024 * 1024) {
      setErroProcessamento('O arquivo excede o limite máximo permitido de 15 MB.');
      return;
    }

    setArquivoSelecionado(file);
    setErroProcessamento(null);

    // Criar preview local
    if (file.type.startsWith('image/')) {
      const url = URL.createObjectURL(file);
      setArquivoPreviewUrl(url);
    } else {
      setArquivoPreviewUrl(null); // PDF
    }
  };

  // Leitura com IA (Gemini via server.ts)
  const handleLerComIA = async () => {
    if (!arquivoSelecionado) {
      setErroProcessamento('Por favor, selecione um arquivo do laudo (PDF ou imagem).');
      return;
    }

    if (!consentimentoMarcado) {
      setErroProcessamento('É obrigatório que o paciente tenha autorizado o uso de IA antes do envio.');
      return;
    }

    setProcessandoIa(true);
    setErroProcessamento(null);

    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) {
        throw new Error('Sessão expirada. Faça login novamente.');
      }

      // Converter arquivo para base64
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(arquivoSelecionado);
      });

      const response = await fetch('/api/exames/transcrever-laudo', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          arquivoBase64: base64,
          mimeType: arquivoSelecionado.type || 'application/pdf',
          planoId,
          planoStatus
        })
      });

      const data = await response.json();

      if (!response.ok || !data.sucesso) {
        throw new Error(data.erro || 'Falha ao processar laudo com IA.');
      }

      // Atualiza contador de uso
      if (data.usoAtual) {
        setUsoIa(data.usoAtual);
      }

      // Salva resposta bruta para auditoria
      setRespostaIaBruta(data.respostaBruta || '');

      // Preenche dados extraídos
      if (data.dados.laboratorio && !formLaboratorio) {
        setFormLaboratorio(data.dados.laboratorio);
      }
      if (data.dados.dataColeta && !formDataColeta) {
        setFormDataColeta(data.dados.dataColeta);
      }

      // Calcula a situação inicial para cada item com o código
      const itensComSituacao: ItemExame[] = (data.dados.itens || []).map((it: any) => ({
        ...it,
        situacao: calcularSituacaoMarcador(it.valor, it.referenciaMinima, it.referenciaMaxima)
      }));

      setItensConferencia(itensComSituacao);
      setEtapaNovo('conferencia');
    } catch (err: any) {
      console.error('Erro na transcrição por IA:', err);
      setErroProcessamento(err.message || 'Não foi possível ler o laudo com IA. Você pode lançar manualmente.');
    } finally {
      setProcessandoIa(false);
    }
  };

  // Iniciar lançamento manual do exame
  const handleIniciarManual = () => {
    setItensConferencia([
      {
        id: `item_${Date.now()}_1`,
        marcador: '',
        valor: '',
        unidade: '',
        referenciaMinima: null,
        referenciaMaxima: null,
        referenciaTexto: '',
        categoria: 'Outros',
        incerto: false,
        situacao: 'Sem referência no laudo'
      }
    ]);
    setEtapaNovo('conferencia');
  };

  // Adicionar linha na tabela de conferência
  const handleAdicionarLinhaConferencia = () => {
    const novo: ItemExame = {
      id: `item_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      marcador: '',
      valor: '',
      unidade: '',
      referenciaMinima: null,
      referenciaMaxima: null,
      referenciaTexto: '',
      categoria: 'Outros',
      incerto: false,
      situacao: 'Sem referência no laudo'
    };
    setItensConferencia(prev => [...prev, novo]);
  };

  // Alterar campo de uma linha da conferência
  const handleAlterarItemConferencia = (index: number, campo: keyof ItemExame, valor: any) => {
    setItensConferencia(prev => {
      const clone = [...prev];
      const itemAtual = { ...clone[index], [campo]: valor };

      // Se alterou marcador, atualiza a dedução de categoria
      if (campo === 'marcador') {
        itemAtual.categoria = deduzirCategoria(String(valor));
      }

      // Se alterou valor, mínimo ou máximo, recalcula a situação com o CÓDIGO
      if (campo === 'valor' || campo === 'referenciaMinima' || campo === 'referenciaMaxima') {
        itemAtual.situacao = calcularSituacaoMarcador(
          itemAtual.valor,
          itemAtual.referenciaMinima,
          itemAtual.referenciaMaxima
        );
      }

      clone[index] = itemAtual;
      return clone;
    });
  };

  // Remover linha da conferência
  const handleRemoverItemConferencia = (index: number) => {
    setItensConferencia(prev => prev.filter((_, i) => i !== index));
  };

  // Salvar exame após conferência mandatória ("Conferi os valores com o laudo")
  const handleConfirmarESalvarExame = async () => {
    if (!formDataColeta) {
      alert('Por favor, informe a data da coleta do exame.');
      return;
    }

    // Filtra itens vazios
    const itensValidos = itensConferencia
      .filter(it => it.marcador.trim() !== '')
      .map(it => ({
        ...it,
        valorNumerico: converterParaNumero(it.valor),
        situacao: calcularSituacaoMarcador(it.valor, it.referenciaMinima, it.referenciaMaxima)
      }));

    if (itensValidos.length === 0) {
      alert('Adicione pelo menos um marcador com nome e valor para salvar o exame.');
      return;
    }

    setSalvandoExame(true);
    try {
      let arquivoUrlSalva: string | undefined = undefined;

      // Se houver arquivo selecionado, faz upload seguro no Storage
      if (arquivoSelecionado && usuarioAtual?.uid) {
        try {
          arquivoUrlSalva = await uploadArquivoLaudo(usuarioAtual.uid, paciente.id, arquivoSelecionado);
        } catch (uploadErr) {
          console.warn('Aviso ao enviar arquivo para o Storage:', uploadErr);
        }
      }

      const novoExame = await salvarExame({
        userId: usuarioAtual?.uid || '',
        pacienteId: paciente.id,
        data: formDataColeta,
        laboratorio: formLaboratorio.trim() || 'Laboratório Clínico',
        itens: itensValidos,
        status: 'conferido',
        respostaIA: respostaIaBruta || undefined,
        arquivosUrls: arquivoUrlSalva ? [arquivoUrlSalva] : undefined
      });

      setExames(prev => [novoExame, ...prev.filter(e => e.id !== novoExame.id)]);
      setExameSelecionadoId(novoExame.id);
      setModalNovoAberto(false);
      setEtapaNovo('dados');
      setArquivoSelecionado(null);
      setArquivoPreviewUrl(null);
      setItensConferencia([]);
    } catch (err: any) {
      console.error('Erro ao salvar exame:', err);
      alert('Erro ao salvar exame no prontuário: ' + (err.message || 'Tente novamente.'));
    } finally {
      setSalvandoExame(false);
    }
  };

  // Excluir exame
  const handleExcluirExame = async (id: string) => {
    if (!confirm('Deseja realmente excluir este exame do prontuário? Esta ação não pode ser desfeita.')) {
      return;
    }
    try {
      await excluirExame(id);
      setExames(prev => prev.filter(e => e.id !== id));
      if (exameSelecionadoId === id) {
        setExameSelecionadoId(null);
      }
    } catch {
      alert('Falha ao excluir o exame.');
    }
  };

  // Se plano for Starter / sem permissão de exames manual
  if (!podeAcessarManual) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-stone-200/90 dark:border-slate-800 p-8 text-center space-y-4 shadow-xs">
        <div className="w-16 h-16 rounded-3xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 mx-auto flex items-center justify-center">
          <Lock className="w-8 h-8" />
        </div>
        <div className="space-y-1.5 max-w-md mx-auto">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">
            Módulo de Exames Laboratoriais Bloqueado
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            O acompanhamento de exames de sangue, painéis hormonais, tabela comparativa de referências e transcrição de laudos por inteligência artificial são liberados nos planos Pro e Master.
          </p>
        </div>
        {onNavegarParaPlanos && (
          <button
            type="button"
            onClick={onNavegarParaPlanos}
            className="px-6 py-2.5 rounded-2xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold transition-all shadow-md shadow-teal-700/25 inline-flex items-center gap-2"
          >
            <Sparkles className="w-4 h-4" />
            <span>Conhecer Planos e Desbloquear Exames</span>
          </button>
        )}
      </div>
    );
  }

  // Itens filtrados do exame ativo
  const itensAtivosFiltrados = useMemo(() => {
    if (!exameAtivo) return [];
    if (!filtroSoForaDaFaixa) return exameAtivo.itens;
    return exameAtivo.itens.filter(it => isForaDaFaixa(it.situacao));
  }, [exameAtivo, filtroSoForaDaFaixa]);

  // Itens agrupados por categoria
  const gruposCategoria = useMemo(() => {
    return agruparPorCategoria(itensAtivosFiltrados);
  }, [itensAtivosFiltrados]);

  // Itens fora da faixa do exame ativo para carta de encaminhamento
  const itensForaDaFaixaExameAtivo = useMemo(() => {
    if (!exameAtivo) return [];
    return exameAtivo.itens.filter(it => it.situacao === 'Abaixo da faixa' || it.situacao === 'Acima da faixa' || it.situacao === 'Próximo do limite');
  }, [exameAtivo]);

  // Histórico de valores para o gráfico de evolução de um marcador
  const historicoMarcador = useMemo(() => {
    if (!marcadorEvolucao) return [];
    const pontos: { data: string; valor: number; min?: number | null; max?: number | null; unidade: string }[] = [];

    // Percorre todos os exames do paciente em ordem cronológica
    const ordenados = [...exames].sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime());

    for (const ex of ordenados) {
      const match = ex.itens.find(it => it.marcador.toLowerCase().trim() === marcadorEvolucao.toLowerCase().trim());
      if (match && typeof match.valorNumerico === 'number' && !isNaN(match.valorNumerico)) {
        pontos.push({
          data: ex.data,
          valor: match.valorNumerico,
          min: match.referenciaMinima,
          max: match.referenciaMaxima,
          unidade: match.unidade
        });
      }
    }

    return pontos;
  }, [exames, marcadorEvolucao]);

  return (
    <div className="space-y-5 animate-fadeIn">
      {/* 1. TOPO: HEADER DO MÓDULO, CONSENTIMENTO E CONTADOR DE USO */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-stone-200/90 dark:border-slate-800 p-5 sm:p-6 space-y-4 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-stone-100 dark:border-slate-800 pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="p-2 rounded-xl bg-teal-700/10 text-teal-700 dark:text-teal-400">
                <FileText className="w-5 h-5" />
              </span>
              <h2 className="text-base sm:text-lg font-bold text-stone-900 dark:text-slate-100">
                Exames Laboratoriais • {paciente.nome}
              </h2>
              <span className="px-2.5 py-0.5 rounded-full bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800 text-[10px] font-bold text-teal-800 dark:text-teal-300">
                Prontuário Clínico
              </span>
            </div>
            <p className="text-xs text-stone-500 dark:text-slate-400 max-w-2xl">
              Registro estruturado de marcadores com verificação de limites do laboratório e leitura por IA (Gemini Flash).
            </p>
          </div>

          {/* Botões de Ação */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              type="button"
              onClick={() => {
                setFormDataColeta(new Date().toISOString().split('T')[0]);
                setFormLaboratorio('');
                setArquivoSelecionado(null);
                setArquivoPreviewUrl(null);
                setErroProcessamento(null);
                setEtapaNovo('dados');
                setModalNovoAberto(true);
              }}
              className="px-4 py-2.5 rounded-2xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold flex items-center gap-2 shadow-md transition-all hover:scale-[1.01]"
            >
              <Plus className="w-4 h-4" />
              <span>Novo Exame</span>
            </button>
          </div>
        </div>

        {/* Bloco de Consentimento Mandatório e Informações do Plano */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 text-xs">
          {/* Card de Consentimento do Paciente */}
          <div className="lg:col-span-2 p-3.5 rounded-2xl bg-teal-500/10 border border-teal-500/25 flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-teal-700 dark:text-teal-400 shrink-0 mt-0.5" />
            <div className="space-y-1.5 flex-1">
              <label className="flex items-start gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={consentimentoMarcado}
                  onChange={(e) => handleToggleConsentimento(e.target.checked)}
                  disabled={salvandoConsentimento}
                  className="mt-0.5 w-4 h-4 rounded text-teal-700 focus:ring-teal-600 border-stone-300 cursor-pointer"
                />
                <span className="font-semibold text-slate-800 dark:text-slate-200 text-xs leading-relaxed">
                  O paciente autorizou que seus exames sejam lidos por ferramenta de inteligência artificial para transcrição dos valores
                </span>
              </label>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 pl-6.5">
                {consentimentoMarcado && paciente.consentimentoIaExames?.data ? (
                  <span className="text-emerald-700 dark:text-emerald-400 font-medium">
                    ✓ Autorizado em {new Date(paciente.consentimentoIaExames.data).toLocaleDateString('pt-BR')} às {new Date(paciente.consentimentoIaExames.data).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}.
                  </span>
                ) : (
                  <span className="text-amber-700 dark:text-amber-400 font-medium">
                    Sem este termo marcado, a leitura por IA permanece bloqueada (lançamento manual livre).
                  </span>
                )}
              </p>
            </div>
          </div>

          {/* Card de Status da IA e Limites */}
          <div className="p-3.5 rounded-2xl bg-stone-50 dark:bg-slate-950 border border-stone-200/80 dark:border-slate-800 flex flex-col justify-between gap-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-stone-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-teal-600" />
                <span>Leitura IA (Gemini Flash)</span>
              </span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                podeAcessarIa ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
              }`}>
                {podeAcessarIa ? 'Liberado' : 'Requer Master'}
              </span>
            </div>
            <div>
              <div className="flex items-center justify-between text-[11px] font-medium text-stone-700 dark:text-slate-300 mb-1">
                <span>Leituras utilizadas no mês:</span>
                <span className="font-bold font-mono text-teal-700 dark:text-teal-400">
                  {usoIa.usado} de {usoIa.limite || 40}
                </span>
              </div>
              <div className="w-full bg-stone-200 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                <div 
                  className="bg-teal-700 h-full rounded-full transition-all"
                  style={{ width: `${Math.min(100, ((usoIa.usado) / (usoIa.limite || 40)) * 100)}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. BARRA DE COLETAS REGISTRADAS / HISTÓRICO */}
      {exames.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          <span className="text-xs font-bold text-stone-500 shrink-0 flex items-center gap-1 pl-1">
            <Clock className="w-3.5 h-3.5" />
            <span>Coletas:</span>
          </span>
          {exames.map((ex) => (
            <button
              key={ex.id}
              type="button"
              onClick={() => setExameSelecionadoId(ex.id)}
              className={`px-3.5 py-1.5 rounded-2xl text-xs font-semibold shrink-0 transition-all flex items-center gap-2 border ${
                exameSelecionadoId === ex.id
                  ? 'bg-teal-700 text-white border-teal-700 shadow-sm'
                  : 'bg-white dark:bg-slate-900 text-stone-700 dark:text-slate-300 border-stone-200 dark:border-slate-800 hover:bg-stone-50'
              }`}
            >
              <span>{new Date(ex.data).toLocaleDateString('pt-BR')}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-md ${
                exameSelecionadoId === ex.id ? 'bg-white/20 text-white' : 'bg-stone-100 dark:bg-slate-800 text-stone-500'
              }`}>
                {ex.itens.length} {ex.itens.length === 1 ? 'item' : 'itens'}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* 3. CONTEÚDO PRINCIPAL: EXAME ATIVO SELECIONADO OU TELA VAZIA */}
      {carregandoExames ? (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-stone-200/90 dark:border-slate-800 p-12 text-center text-xs text-stone-400 animate-pulse">
          Carregando exames do prontuário...
        </div>
      ) : exames.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-dashed border-stone-300 dark:border-slate-800 p-12 text-center space-y-4">
          <div className="w-16 h-16 rounded-3xl bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-400 mx-auto flex items-center justify-center">
            <FileText className="w-8 h-8" />
          </div>
          <div className="space-y-1.5 max-w-md mx-auto">
            <h3 className="text-base font-bold text-stone-900 dark:text-slate-100">
              Nenhum exame laboratorial registrado ainda
            </h3>
            <p className="text-xs text-stone-500 dark:text-slate-400 leading-relaxed">
              Você pode enviar o laudo em PDF ou foto para transcrição rápida por IA, ou lançar os marcadores manualmente na planilha clínica.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setFormDataColeta(new Date().toISOString().split('T')[0]);
              setFormLaboratorio('');
              setArquivoSelecionado(null);
              setArquivoPreviewUrl(null);
              setErroProcessamento(null);
              setEtapaNovo('dados');
              setModalNovoAberto(true);
            }}
            className="px-5 py-2.5 rounded-2xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold transition-all shadow-md inline-flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>Registrar Primeiro Exame</span>
          </button>
        </div>
      ) : exameAtivo ? (
        <div className="space-y-5">
          {/* PAINEL DE CONTROLE DO EXAME ATIVO */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-stone-200/90 dark:border-slate-800 p-5 space-y-4 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-100 dark:border-slate-800 pb-3">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-stone-900 dark:text-slate-100">
                    Coleta de {new Date(exameAtivo.data).toLocaleDateString('pt-BR')}
                  </span>
                  <span className="text-xs text-stone-500">• {exameAtivo.laboratorio}</span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 text-[10px] font-bold flex items-center gap-1">
                    <FileCheck className="w-3 h-3" />
                    <span>Conferido</span>
                  </span>
                </div>
                <p className="text-[11px] text-stone-400">
                  {exameAtivo.itens.length} marcadores registrados
                  {itensForaDaFaixaExameAtivo.length > 0 && (
                    <span className="text-amber-700 dark:text-amber-400 font-semibold ml-2">
                      ({itensForaDaFaixaExameAtivo.length} fora ou próximo do limite)
                    </span>
                  )}
                </p>
              </div>

              {/* Ações: Encaminhamento, Baixar Tabela, Excluir */}
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => {
                    setObsCarta('');
                    setModalCartaAberto(true);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors"
                  title="Gerar Carta de Encaminhamento para Médico ou Nutricionista com os exames alterados"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Carta de Encaminhamento</span>
                </button>

                <button
                  type="button"
                  onClick={() => gerarTabelaExamePdf(exameAtivo, paciente.nome, usuarioAtual)}
                  className="px-3 py-1.5 rounded-xl border border-stone-200 dark:border-slate-700 hover:bg-stone-50 dark:hover:bg-slate-800 text-stone-700 dark:text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                  title="Baixar tabela completa em PDF com todas as referências"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Baixar Tabela (PDF)</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleExcluirExame(exameAtivo.id)}
                  className="p-1.5 rounded-xl border border-stone-200 dark:border-slate-700 text-stone-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950 transition-colors"
                  title="Excluir este exame"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Barra de Filtro e Aviso Fixo Obrigatório */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={filtroSoForaDaFaixa}
                  onChange={(e) => setFiltroSoForaDaFaixa(e.target.checked)}
                  className="w-4 h-4 rounded text-teal-700 focus:ring-teal-600 border-stone-300 cursor-pointer"
                />
                <span className="font-bold text-stone-700 dark:text-slate-300">
                  Mostrar só fora da faixa ({itensForaDaFaixaExameAtivo.length})
                </span>
              </label>

              {/* Aviso Mandatório Fixo */}
              <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300 text-[11px] flex items-center gap-2">
                <Info className="w-4 h-4 text-amber-600 shrink-0" />
                <span>
                  <strong>Aviso:</strong> A situação compara o valor com a faixa de referência do próprio laboratório e não substitui avaliação médica.
                </span>
              </div>
            </div>
          </div>

          {/* TABELA DE RESULTADOS AGRUPADA POR CATEGORIA */}
          <div className="space-y-6">
            {(Object.keys(gruposCategoria) as CategoriaExame[]).map((categoria) => {
              const itensGrupo = gruposCategoria[categoria];
              if (itensGrupo.length === 0) return null;

              return (
                <div 
                  key={categoria}
                  className="bg-white dark:bg-slate-900 rounded-3xl border border-stone-200/90 dark:border-slate-800 overflow-hidden shadow-xs"
                >
                  {/* Cabeçalho da Categoria */}
                  <div className="bg-stone-50/80 dark:bg-slate-950 px-5 py-3 border-b border-stone-200/80 dark:border-slate-800 flex items-center justify-between">
                    <span className="text-xs font-extrabold uppercase tracking-wider text-teal-800 dark:text-teal-400 flex items-center gap-2">
                      <Layers className="w-3.5 h-3.5" />
                      <span>{categoria}</span>
                    </span>
                    <span className="text-[11px] font-mono text-stone-400">
                      {itensGrupo.length} {itensGrupo.length === 1 ? 'marcador' : 'marcadores'}
                    </span>
                  </div>

                  {/* Tabela de Marcadores */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-stone-100 dark:border-slate-800 text-[11px] font-bold text-stone-400">
                          <th className="py-2.5 px-5">Indicador</th>
                          <th className="py-2.5 px-5">Valor do Paciente</th>
                          <th className="py-2.5 px-5">Referência do Laboratório</th>
                          <th className="py-2.5 px-5">Situação</th>
                          <th className="py-2.5 px-5 text-right">Evolução</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-100 dark:divide-slate-800">
                        {itensGrupo.map((item) => {
                          const refTexto = item.referenciaTexto || 
                            (item.referenciaMinima !== null && item.referenciaMaxima !== null && item.referenciaMinima !== undefined && item.referenciaMaxima !== undefined
                              ? `${item.referenciaMinima} a ${item.referenciaMaxima} ${item.unidade || ''}`
                              : 'Sem faixa descrita');

                          return (
                            <tr key={item.id} className="hover:bg-stone-50/50 dark:hover:bg-slate-800/40 transition-colors">
                              <td className="py-3 px-5 font-bold text-stone-900 dark:text-slate-100">
                                {item.marcador}
                              </td>
                              <td className="py-3 px-5 font-semibold text-slate-800 dark:text-slate-200 font-mono">
                                {item.valor} <span className="text-stone-400 font-normal">{item.unidade}</span>
                              </td>
                              <td className="py-3 px-5 text-stone-500 dark:text-slate-400 font-mono text-[11px]">
                                {refTexto}
                              </td>
                              <td className="py-3 px-5">
                                {/* Selos Coloridos Sem Palavras Patológicas */}
                                {item.situacao === 'Abaixo da faixa' && (
                                  <span className="px-2.5 py-1 rounded-full bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 font-bold text-[10px] inline-flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                                    <span>Abaixo da faixa</span>
                                  </span>
                                )}
                                {item.situacao === 'Acima da faixa' && (
                                  <span className="px-2.5 py-1 rounded-full bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-300 font-bold text-[10px] inline-flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                                    <span>Acima da faixa</span>
                                  </span>
                                )}
                                {item.situacao === 'Próximo do limite' && (
                                  <span className="px-2.5 py-1 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 font-bold text-[10px] inline-flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                                    <span>Próximo do limite</span>
                                  </span>
                                )}
                                {item.situacao === 'Dentro da faixa' && (
                                  <span className="px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-bold text-[10px] inline-flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                    <span>Dentro da faixa</span>
                                  </span>
                                )}
                                {(!item.situacao || item.situacao === 'Sem referência no laudo') && (
                                  <span className="px-2.5 py-1 rounded-full bg-stone-100 dark:bg-slate-800 text-stone-500 text-[10px] font-semibold">
                                    Sem referência no laudo
                                  </span>
                                )}
                              </td>
                              <td className="py-3 px-5 text-right">
                                <button
                                  type="button"
                                  onClick={() => setMarcadorEvolucao(marcadorEvolucao === item.marcador ? null : item.marcador)}
                                  className={`p-1.5 rounded-xl border text-xs transition-colors ${
                                    marcadorEvolucao === item.marcador
                                      ? 'bg-teal-700 text-white border-teal-700'
                                      : 'border-stone-200 dark:border-slate-700 text-stone-500 hover:bg-stone-100 dark:hover:bg-slate-800'
                                  }`}
                                  title="Ver gráfico de evolução entre coletas"
                                >
                                  <TrendingUp className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}
          </div>

          {/* GRÁFICO DE EVOLUÇÃO ENTRE COLETAS COM FAIXA SOMBREADA */}
          {marcadorEvolucao && (
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-stone-200/90 dark:border-slate-800 p-6 space-y-4 shadow-md animate-fadeIn">
              <div className="flex items-center justify-between border-b border-stone-100 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-teal-700 dark:text-teal-400" />
                  <h4 className="text-sm font-bold text-stone-900 dark:text-slate-100">
                    Evolução Histórica: {marcadorEvolucao}
                  </h4>
                </div>
                <button
                  type="button"
                  onClick={() => setMarcadorEvolucao(null)}
                  className="p-1 rounded-lg text-stone-400 hover:text-stone-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {historicoMarcador.length < 2 ? (
                <div className="p-6 text-center text-xs text-stone-500 bg-stone-50 dark:bg-slate-950 rounded-2xl">
                  Para gerar o gráfico de evolução temporal, são necessárias pelo menos 2 coletas com este marcador registrado.
                  (Atualmente registrado em {historicoMarcador.length} coleta: {historicoMarcador[0]?.valor} {historicoMarcador[0]?.unidade}).
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Gráfico SVG de alta fidelidade */}
                  <div className="relative w-full h-48 bg-stone-50 dark:bg-slate-950 rounded-2xl p-4 border border-stone-200/60 dark:border-slate-800">
                    <svg className="w-full h-full overflow-visible" viewBox="0 0 500 150">
                      {/* Faixa sombreada de referência do laboratório */}
                      {(() => {
                        const vals = historicoMarcador.map(h => h.valor);
                        const mins = historicoMarcador.map(h => h.min ?? h.valor * 0.8);
                        const maxs = historicoMarcador.map(h => h.max ?? h.valor * 1.2);
                        const minGeral = Math.min(...vals, ...mins) * 0.9;
                        const maxGeral = Math.max(...vals, ...maxs) * 1.1;
                        const range = (maxGeral - minGeral) || 1;

                        const getY = (val: number) => 130 - ((val - minGeral) / range) * 110;

                        const refMin = historicoMarcador[0].min ?? null;
                        const refMax = historicoMarcador[0].max ?? null;

                        const yMin = refMin !== null ? getY(refMin) : 120;
                        const yMax = refMax !== null ? getY(refMax) : 30;
                        const rectH = Math.max(8, yMin - yMax);

                        // Coordenadas dos pontos
                        const stepX = 400 / (historicoMarcador.length - 1);
                        const points = historicoMarcador.map((p, idx) => ({
                          x: 50 + idx * stepX,
                          y: getY(p.valor),
                          data: p.data,
                          valor: p.valor,
                          unidade: p.unidade
                        }));

                        const pathD = points.reduce((acc, p, idx) => `${acc} ${idx === 0 ? 'M' : 'L'} ${p.x} ${p.y}`, '');

                        return (
                          <>
                            {/* Faixa de Referência Sombreada */}
                            {refMin !== null && refMax !== null && (
                              <rect
                                x="40"
                                y={yMax}
                                width="420"
                                height={rectH}
                                fill="rgba(15, 118, 110, 0.12)"
                                stroke="rgba(15, 118, 110, 0.25)"
                                strokeDasharray="3 3"
                                rx="4"
                              />
                            )}

                            {/* Linha de Conexão */}
                            <path
                              d={pathD}
                              fill="none"
                              stroke="#0f766e"
                              strokeWidth="2.5"
                              strokeLinecap="round"
                            />

                            {/* Pontos */}
                            {points.map((pt, i) => (
                              <g key={i}>
                                <circle
                                  cx={pt.x}
                                  cy={pt.y}
                                  r="5"
                                  fill="#0f766e"
                                  stroke="#ffffff"
                                  strokeWidth="2"
                                />
                                <text
                                  x={pt.x}
                                  y={pt.y - 10}
                                  textAnchor="middle"
                                  fontSize="10"
                                  fontWeight="bold"
                                  fill="#0f172a"
                                >
                                  {pt.valor}
                                </text>
                                <text
                                  x={pt.x}
                                  y={145}
                                  textAnchor="middle"
                                  fontSize="9"
                                  fill="#64748b"
                                >
                                  {new Date(pt.data).toLocaleDateString('pt-BR')}
                                </text>
                              </g>
                            ))}
                          </>
                        );
                      })()}
                    </svg>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-stone-500">
                    <span className="flex items-center gap-1.5">
                      <span className="w-3 h-3 bg-teal-700/20 border border-teal-700/40 rounded-sm" />
                      <span>Faixa Sombreada: Referência do Laboratório</span>
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 bg-teal-700 rounded-full" />
                      <span>Resultados do Paciente ao longo do tempo</span>
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      ) : null}

      {/* ========================================================================= */}
      {/* MODAL: NOVO EXAME / CONFERÊNCIA EDITÁVEL COM O LAUDO AO LADO */}
      {/* ========================================================================= */}
      {modalNovoAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-stone-200 dark:border-slate-800 shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden">
            {/* Topo do Modal */}
            <div className="px-6 py-4 border-b border-stone-100 dark:border-slate-800 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-teal-700/10 text-teal-700 dark:text-teal-400">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-stone-900 dark:text-slate-100">
                    {etapaNovo === 'dados' ? 'Novo Exame Laboratorial' : 'Tabela de Conferência com o Laudo'}
                  </h3>
                  <p className="text-[11px] text-stone-400">
                    {etapaNovo === 'dados' 
                      ? 'Informe a coleta e selecione o laudo para leitura por IA ou lançamento manual.'
                      : 'Confira os valores transcritos lado a lado com o laudo original antes de salvar.'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalNovoAberto(false)}
                className="p-1.5 rounded-xl text-stone-400 hover:text-stone-600 hover:bg-stone-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Conteúdo: Etapa 1 (Dados e Upload) vs Etapa 2 (Tabela de Conferência) */}
            <div className="p-6 overflow-y-auto flex-1 space-y-5">
              {etapaNovo === 'dados' ? (
                <div className="space-y-5 max-w-xl mx-auto">
                  {/* Dados Básicos da Coleta */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div>
                      <label className="font-bold text-stone-700 dark:text-slate-300 block mb-1">
                        Data da Coleta *
                      </label>
                      <input
                        type="date"
                        value={formDataColeta}
                        onChange={(e) => setFormDataColeta(e.target.value)}
                        className="w-full glass-input px-3 py-2.5 text-xs font-mono"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-stone-700 dark:text-slate-300 block mb-1">
                        Laboratório *
                      </label>
                      <input
                        type="text"
                        placeholder="Ex: Fleury, Dasa, Hermes Pardini..."
                        value={formLaboratorio}
                        onChange={(e) => setFormLaboratorio(e.target.value)}
                        className="w-full glass-input px-3 py-2.5 text-xs"
                      />
                    </div>
                  </div>

                  {/* Upload do Laudo */}
                  <div className="space-y-2">
                    <label className="font-bold text-stone-700 dark:text-slate-300 text-xs block">
                      Arquivo do Laudo (PDF ou Imagem)
                    </label>

                    {/* Aviso de Privacidade Obrigatório do Requisito */}
                    <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300 text-xs flex items-start gap-2.5">
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <p className="text-[11px] leading-relaxed">
                        <strong>Privacidade:</strong> {AVISO_PRIVACIDADE_LAUDO}
                      </p>
                    </div>

                    <div className="p-6 rounded-2xl border-2 border-dashed border-stone-200 dark:border-slate-800 hover:border-teal-600 transition-colors text-center space-y-3 bg-stone-50/50 dark:bg-slate-950/40">
                      <Upload className="w-8 h-8 text-stone-400 mx-auto" />
                      <div className="space-y-1">
                        <label className="cursor-pointer text-xs font-bold text-teal-700 dark:text-teal-400 hover:underline">
                          <span>Clique para escolher o arquivo</span>
                          <input
                            type="file"
                            accept=".pdf,image/png,image/jpeg,image/webp"
                            onChange={handleFileChange}
                            className="hidden"
                          />
                        </label>
                        <p className="text-[11px] text-stone-400">
                          Formatos aceitos: PDF, JPEG, PNG (até 15 MB)
                        </p>
                      </div>
                      {arquivoSelecionado && (
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800 text-teal-800 dark:text-teal-300 text-xs font-mono">
                          <FileText className="w-3.5 h-3.5" />
                          <span>{arquivoSelecionado.name} ({(arquivoSelecionado.size / (1024 * 1024)).toFixed(2)} MB)</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {erroProcessamento && (
                    <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-600 dark:text-rose-400">
                      {erroProcessamento}
                    </div>
                  )}

                  {/* Ações: Ler com IA ou Manual */}
                  <div className="pt-3 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-stone-100 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={handleIniciarManual}
                      className="w-full sm:w-auto px-4 py-2.5 rounded-2xl border border-stone-200 dark:border-slate-700 hover:bg-stone-50 dark:hover:bg-slate-800 text-stone-700 dark:text-slate-300 text-xs font-semibold"
                    >
                      Lançar Exame Manualmente (Sem IA)
                    </button>

                    <button
                      type="button"
                      onClick={handleLerComIA}
                      disabled={processandoIa || !arquivoSelecionado || !consentimentoMarcado}
                      className="w-full sm:w-auto px-5 py-2.5 rounded-2xl bg-teal-700 hover:bg-teal-800 disabled:opacity-50 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-md transition-all"
                    >
                      <Sparkles className="w-4 h-4" />
                      <span>{processandoIa ? 'Transcrevendo Laudo com IA...' : 'Ler Laudo com IA'}</span>
                    </button>
                  </div>
                </div>
              ) : (
                /* ETAPA 2: TABELA DE CONFERÊNCIA EDITÁVEL COM O LAUDO AO LADO */
                <div className="space-y-4">
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                    {/* Coluna 1: Documento Original ao Lado (5 Colunas em telas grandes) */}
                    <div className="lg:col-span-5 bg-stone-100 dark:bg-slate-950 rounded-2xl p-3 border border-stone-200 dark:border-slate-800 h-[60vh] flex flex-col">
                      <div className="flex items-center justify-between pb-2 border-b border-stone-200/80 dark:border-slate-800 text-xs font-bold text-stone-600 dark:text-slate-400">
                        <span>Laudo Original para Conferência</span>
                        <span className="text-[10px] font-mono text-stone-400">
                          {arquivoSelecionado?.name || 'Documento carregado'}
                        </span>
                      </div>
                      <div className="flex-1 overflow-auto mt-2 flex items-center justify-center">
                        {arquivoPreviewUrl ? (
                          <img
                            src={arquivoPreviewUrl}
                            alt="Laudo Original"
                            className="max-w-full max-h-full object-contain rounded-lg shadow-sm"
                          />
                        ) : arquivoSelecionado?.type === 'application/pdf' ? (
                          <div className="text-center p-6 space-y-2">
                            <FileText className="w-12 h-12 text-teal-700 mx-auto" />
                            <p className="text-xs font-bold text-stone-700 dark:text-slate-300">
                              Documento PDF ({arquivoSelecionado.name})
                            </p>
                            <p className="text-[11px] text-stone-400">
                              Os valores transcritos pela IA estão listados na planilha ao lado para sua conferência direta.
                            </p>
                          </div>
                        ) : (
                          <div className="text-center p-6 text-xs text-stone-400">
                            Nenhum arquivo de imagem anexado (lançamento manual ativo).
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Coluna 2: Planilha de Conferência Editável (7 Colunas) */}
                    <div className="lg:col-span-7 space-y-3 flex flex-col h-[60vh]">
                      <div className="flex items-center justify-between text-xs">
                        <div className="space-y-0.5">
                          <span className="font-bold text-stone-800 dark:text-slate-200">
                            Tabela de Conferência Editável
                          </span>
                          <p className="text-[10px] text-stone-400">
                            Linhas em amarelo indicam leitura incerta da IA. Edite os valores conforme necessário.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={handleAdicionarLinhaConferencia}
                          className="px-3 py-1 rounded-xl bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800 text-teal-800 dark:text-teal-300 text-xs font-bold flex items-center gap-1"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Adicionar Linha</span>
                        </button>
                      </div>

                      {/* Tabela Editável */}
                      <div className="flex-1 overflow-auto border border-stone-200 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-900">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead className="sticky top-0 bg-stone-50 dark:bg-slate-950 border-b border-stone-200 dark:border-slate-800 text-[10px] uppercase font-bold text-stone-500">
                            <tr>
                              <th className="p-2.5">Marcador</th>
                              <th className="p-2.5 w-24">Valor</th>
                              <th className="p-2.5 w-20">Unidade</th>
                              <th className="p-2.5 w-20">Mínimo</th>
                              <th className="p-2.5 w-20">Máximo</th>
                              <th className="p-2.5 text-center w-10">Ações</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-stone-100 dark:divide-slate-800">
                            {itensConferencia.map((item, idx) => (
                              <tr 
                                key={item.id}
                                className={`transition-colors ${
                                  item.incerto 
                                    ? 'bg-amber-100/70 dark:bg-amber-950/40 border-l-4 border-l-amber-500' 
                                    : 'hover:bg-stone-50/50'
                                }`}
                              >
                                <td className="p-2">
                                  <div className="flex items-center gap-1.5">
                                    {item.incerto && (
                                      <span title="Leitura incerta - favor conferir com o laudo">
                                        <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                      </span>
                                    )}
                                    <input
                                      type="text"
                                      value={item.marcador}
                                      placeholder="Nome do exame"
                                      onChange={(e) => handleAlterarItemConferencia(idx, 'marcador', e.target.value)}
                                      className="w-full glass-input px-2 py-1 text-xs font-semibold"
                                    />
                                  </div>
                                </td>
                                <td className="p-2">
                                  <input
                                    type="text"
                                    value={item.valor}
                                    placeholder="Valor"
                                    onChange={(e) => handleAlterarItemConferencia(idx, 'valor', e.target.value)}
                                    className="w-full glass-input px-2 py-1 text-xs font-mono font-bold"
                                  />
                                </td>
                                <td className="p-2">
                                  <input
                                    type="text"
                                    value={item.unidade}
                                    placeholder="Unidade"
                                    onChange={(e) => handleAlterarItemConferencia(idx, 'unidade', e.target.value)}
                                    className="w-full glass-input px-2 py-1 text-xs font-mono"
                                  />
                                </td>
                                <td className="p-2">
                                  <input
                                    type="number"
                                    step="any"
                                    value={item.referenciaMinima ?? ''}
                                    placeholder="Min"
                                    onChange={(e) => handleAlterarItemConferencia(idx, 'referenciaMinima', e.target.value ? parseFloat(e.target.value) : null)}
                                    className="w-full glass-input px-2 py-1 text-xs font-mono"
                                  />
                                </td>
                                <td className="p-2">
                                  <input
                                    type="number"
                                    step="any"
                                    value={item.referenciaMaxima ?? ''}
                                    placeholder="Max"
                                    onChange={(e) => handleAlterarItemConferencia(idx, 'referenciaMaxima', e.target.value ? parseFloat(e.target.value) : null)}
                                    className="w-full glass-input px-2 py-1 text-xs font-mono"
                                  />
                                </td>
                                <td className="p-2 text-center">
                                  <button
                                    type="button"
                                    onClick={() => handleRemoverItemConferencia(idx)}
                                    className="text-stone-400 hover:text-rose-600 p-1"
                                    title="Remover linha"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>

                  {/* Rodapé Obrigatório de Confirmação */}
                  <div className="pt-3 border-t border-stone-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => setEtapaNovo('dados')}
                      className="px-4 py-2 rounded-xl text-stone-500 hover:text-stone-800 text-xs font-semibold"
                    >
                      Voltar
                    </button>

                    {/* BOTÃO OBRIGATÓRIO DO REQUISITO: "Conferi os valores com o laudo" */}
                    <button
                      type="button"
                      onClick={handleConfirmarESalvarExame}
                      disabled={salvandoExame}
                      className="px-6 py-2.5 rounded-2xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-teal-700/25 transition-all hover:scale-[1.01]"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>{salvandoExame ? 'Salvando no Prontuário...' : 'Conferi os valores com o laudo'}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: GERAR CARTA DE ENCAMINHAMENTO */}
      {/* ========================================================================= */}
      {modalCartaAberto && exameAtivo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-stone-200 dark:border-slate-800 shadow-2xl w-full max-w-lg p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Send className="w-5 h-5 text-teal-700" />
                <h3 className="text-sm font-bold text-stone-900 dark:text-slate-100">
                  Gerar Carta de Encaminhamento
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setModalCartaAberto(false)}
                className="p-1 rounded-lg text-stone-400 hover:text-stone-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              <div>
                <label className="font-bold text-stone-700 dark:text-slate-300 block mb-1">
                  Profissional de Destino
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setDestinatarioTipo('Médico(a)')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition-colors ${
                      destinatarioTipo === 'Médico(a)'
                        ? 'bg-teal-700 text-white border-teal-700'
                        : 'border-stone-200 dark:border-slate-700 text-stone-700 dark:text-slate-300 hover:bg-stone-50'
                    }`}
                  >
                    Médico(a)
                  </button>
                  <button
                    type="button"
                    onClick={() => setDestinatarioTipo('Nutricionista')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition-colors ${
                      destinatarioTipo === 'Nutricionista'
                        ? 'bg-teal-700 text-white border-teal-700'
                        : 'border-stone-200 dark:border-slate-700 text-stone-700 dark:text-slate-300 hover:bg-stone-50'
                    }`}
                  >
                    Nutricionista
                  </button>
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-stone-50 dark:bg-slate-950 border border-stone-200/70 dark:border-slate-800 space-y-1">
                <span className="font-bold text-stone-700 dark:text-slate-300 block">
                  Marcadores que serão incluídos ({itensForaDaFaixaExameAtivo.length} itens fora ou no limite):
                </span>
                <p className="text-[11px] text-stone-500 font-mono">
                  {itensForaDaFaixaExameAtivo.length > 0 
                    ? itensForaDaFaixaExameAtivo.map(i => `${i.marcador} (${i.valor} ${i.unidade})`).join(', ')
                    : 'Nenhum exame fora da faixa no laudo.'}
                </p>
              </div>

              <div>
                <label className="font-bold text-stone-700 dark:text-slate-300 block mb-1">
                  Observações Clínicas Livres (Opcional)
                </label>
                <textarea
                  rows={3}
                  value={obsCarta}
                  onChange={(e) => setObsCarta(e.target.value)}
                  placeholder="Ex: Paciente relata eflúvio telógeno há 3 meses. Solicito investigação clínica complementar..."
                  className="w-full glass-input p-3 text-xs"
                />
              </div>

              <div className="p-2.5 rounded-xl bg-teal-50 dark:bg-teal-950/60 text-teal-800 dark:text-teal-300 text-[11px]">
                Texto padrão incluído: <em>"Encaminho para avaliação, considerando a queixa capilar e os exames apresentados."</em>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2 border-t border-stone-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setModalCartaAberto(false)}
                className="px-4 py-2 rounded-xl text-stone-500 text-xs font-semibold"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  gerarCartaEncaminhamentoPdf({
                    pacienteNome: paciente.nome,
                    pacienteGenero: paciente.genero,
                    queixaCapilar: paciente.queixaPrincipal,
                    dataExame: exameAtivo.data,
                    laboratorio: exameAtivo.laboratorio,
                    destinatarioTipo,
                    itensAlterados: itensForaDaFaixaExameAtivo,
                    observacaoLivre: obsCarta,
                    profissionalNome: usuarioAtual?.nome || 'Especialista em Tricologia',
                    profissionalTitulo: usuarioAtual?.titulo,
                    profissionalRegistro: usuarioAtual?.registro,
                    profissionalClinica: usuarioAtual?.clinica
                  });
                  setModalCartaAberto(false);
                }}
                className="px-5 py-2.5 rounded-2xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold flex items-center gap-2 shadow-md"
              >
                <Download className="w-4 h-4" />
                <span>Baixar Carta em PDF (A4)</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
