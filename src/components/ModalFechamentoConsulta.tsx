import React, { useState, useEffect } from 'react';
import { 
  X, 
  FileCheck2, 
  Download, 
  Send, 
  Check, 
  Calendar, 
  MapPin, 
  Camera, 
  Sparkles, 
  Layers, 
  Plus, 
  Trash2, 
  Clock, 
  ShoppingBag, 
  CheckCircle2,
  FileText,
  AlertCircle,
  Eye,
  Loader2
} from 'lucide-react';
import { Paciente, ConsultaRegistro } from '../types/paciente';
import { UsuarioProfissional } from '../types/usuario';
import { ProdutoIndicado } from '../types/portal';
import { 
  baixarPdfResumoConsulta, 
  compartilharPdfResumoConsulta, 
  enviarResumoConsultaWhatsApp,
  ResumoConsultaOptions,
  FotoResumoConsulta,
  ProdutoResumoConsulta
} from '../services/resumoConsultaPdfGenerator';
import { saveConsultaAvulsa } from '../services/pacientes';
import { listarProdutosDoPaciente, salvarProdutoPaciente } from '../services/produtosPacienteService';
import { comprimirImagemArquivo } from '../utils/imageCompressor';
import { useBackHandler } from '../utils/navigationHistory';

export interface ModalFechamentoConsultaProps {
  aberto: boolean;
  onFechar: () => void;
  paciente: Paciente;
  profissional?: UsuarioProfissional | null;
  consultaExistente?: ConsultaRegistro | null;
  fotosIniciais?: Array<{ id: string; url: string; titulo?: string; area?: string }>;
  metricasIniciais?: {
    totalFios?: number;
    totalUF?: number;
    ostiosVazios?: number;
    focosInflamacao?: number;
  };
  queixaInicial?: string;
  condutaInicial?: string;
  onConsultaConcluida?: (consulta: ConsultaRegistro) => void;
}

export const ModalFechamentoConsulta: React.FC<ModalFechamentoConsultaProps> = ({
  aberto,
  onFechar,
  paciente,
  profissional,
  consultaExistente,
  fotosIniciais = [],
  metricasIniciais,
  queixaInicial = '',
  condutaInicial = '',
  onConsultaConcluida
}) => {
  // Sincronização com o botão Voltar do celular/navegador
  useBackHandler(aberto, onFechar, 'modalFechamentoConsulta');

  // Estado do formulário
  const [dataConsulta, setDataConsulta] = useState<string>(
    consultaExistente?.data || new Date().toISOString().split('T')[0]
  );
  const [tipoConsulta, setTipoConsulta] = useState<string>(
    consultaExistente?.tipoConsulta || 'Consulta de Retorno'
  );
  const [areaPrincipal, setAreaPrincipal] = useState<string>(
    consultaExistente?.area || 'Vértice / Vértex'
  );
  const [queixaEvolucao, setQueixaEvolucao] = useState<string>(
    consultaExistente?.queixaEvolucao || queixaInicial || paciente.queixaPrincipal || ''
  );
  const [condutaTratamento, setCondutaTratamento] = useState<string>(
    consultaExistente?.condutaTratamento || condutaInicial || ''
  );
  const [previsaoRetorno, setPrevisaoRetorno] = useState<string>('Retorno em 60 dias');

  // Métricas de contagem
  const [totalFios, setTotalFios] = useState<string>(
    consultaExistente?.totalFios?.toString() || metricasIniciais?.totalFios?.toString() || ''
  );
  const [totalUF, setTotalUF] = useState<string>(
    consultaExistente?.totalUF?.toString() || metricasIniciais?.totalUF?.toString() || ''
  );
  const [ostiosVazios, setOstiosVazios] = useState<string>(
    consultaExistente?.ostiosVazios?.toString() || metricasIniciais?.ostiosVazios?.toString() || ''
  );
  const [focosInflamacao, setFocosInflamacao] = useState<string>(
    consultaExistente?.focosInflamacao?.toString() || metricasIniciais?.focosInflamacao?.toString() || ''
  );

  // Fotos da consulta
  const [fotos, setFotos] = useState<FotoResumoConsulta[]>(() => {
    if (consultaExistente?.fotos && consultaExistente.fotos.length > 0) {
      return consultaExistente.fotos.map(f => ({
        id: f.id,
        url: f.url,
        titulo: f.titulo || 'Foto da Consulta',
        area: f.area || consultaExistente.area
      }));
    }
    if (consultaExistente?.imagemUrl) {
      return [{
        id: `cons_${consultaExistente.id}`,
        url: consultaExistente.imagemUrl,
        titulo: 'Registro Principal',
        area: consultaExistente.area
      }];
    }
    if (fotosIniciais.length > 0) {
      return fotosIniciais.map((f, i) => ({
        id: f.id || `foto_${i}`,
        url: f.url,
        titulo: f.titulo || `Registro ${i + 1}`,
        area: f.area || areaPrincipal
      }));
    }
    return [];
  });

  const [fotosSelecionadasIds, setFotosSelecionadasIds] = useState<string[]>([]);
  const [processandoFoto, setProcessandoFoto] = useState(false);

  // Produtos Home Care
  const [produtosCadastrados, setProdutosCadastrados] = useState<ProdutoIndicado[]>([]);
  const [produtosSelecionados, setProdutosSelecionados] = useState<ProdutoResumoConsulta[]>([]);
  const [novoProdNome, setNovoProdNome] = useState('');
  const [novoProdComoUsar, setNovoProdComoUsar] = useState('');
  const [mostrarFormNovoProd, setMostrarFormNovoProd] = useState(false);

  // Estados de ação e feedback
  const [gerandoPdf, setGerandoPdf] = useState(false);
  const [salvandoConsulta, setSalvandoConsulta] = useState(false);
  const [feedbackSucesso, setFeedbackSucesso] = useState<string | null>(null);

  // Inicializar seleção de fotos
  useEffect(() => {
    if (fotos.length > 0 && fotosSelecionadasIds.length === 0) {
      setFotosSelecionadasIds(fotos.map(f => f.id));
    }
  }, [fotos]);

  // Carregar produtos indicados cadastrados para este paciente
  useEffect(() => {
    if (paciente?.id) {
      listarProdutosDoPaciente(paciente.id).then(lista => {
        setProdutosCadastrados(lista);
        // Pré-selecionar os produtos ativos para o resumo
        setProdutosSelecionados(lista.map(p => ({
          nome: p.nome,
          comoUsar: p.comoUsar,
          observacao: p.observacao
        })));
      }).catch(() => {});
    }
  }, [paciente?.id]);

  if (!aberto) return null;

  // Alternar foto selecionada para o relatório
  const handleToggleFoto = (id: string) => {
    setFotosSelecionadasIds(prev => 
      prev.includes(id) ? prev.filter(fId => fId !== id) : [...prev, id]
    );
  };

  // Upload de nova foto diretamente pelo fechamento
  const handleUploadFotoFechamento = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setProcessandoFoto(true);
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (file.type.startsWith('image/')) {
          const res = await comprimirImagemArquivo(file, { perfil: 'global' });
          const novaFoto: FotoResumoConsulta = {
            id: `foto_fechamento_${Date.now()}_${i}`,
            url: res.dataUrl,
            titulo: `${areaPrincipal} - Registro`,
            area: areaPrincipal
          };
          setFotos(prev => [novaFoto, ...prev]);
          setFotosSelecionadasIds(prev => [...prev, novaFoto.id]);
        }
      }
    } catch {
      // Falha silenciosa ou ignorada
    } finally {
      setProcessandoFoto(false);
      e.target.value = '';
    }
  };

  // Adicionar produto rápido
  const handleAdicionarProdutoRapido = async () => {
    if (!novoProdNome.trim() || !novoProdComoUsar.trim()) return;

    const novo: ProdutoResumoConsulta = {
      nome: novoProdNome.trim(),
      comoUsar: novoProdComoUsar.trim()
    };

    setProdutosSelecionados(prev => [...prev, novo]);

    // Salva também no banco para ficar arquivado no paciente
    try {
      await salvarProdutoPaciente({
        pacienteId: paciente.id,
        profissionalUid: profissional?.uid || '',
        nome: novo.nome,
        comoUsar: novo.comoUsar,
        liberadoPaciente: true
      });
      // Recarregar lista do paciente
      listarProdutosDoPaciente(paciente.id).then(setProdutosCadastrados).catch(() => {});
    } catch {}

    setNovoProdNome('');
    setNovoProdComoUsar('');
    setMostrarFormNovoProd(false);
  };

  // Remover produto da lista de envio do resumo
  const handleRemoverProdutoResumo = (index: number) => {
    setProdutosSelecionados(prev => prev.filter((_, idx) => idx !== index));
  };

  // Montar objeto de opções do PDF
  const montarOptionsRelatorio = (): ResumoConsultaOptions => {
    const fotosParaRelatorio = fotos.filter(f => fotosSelecionadasIds.includes(f.id));
    return {
      paciente,
      profissional,
      dataConsulta,
      tipoConsulta,
      areaPrincipal,
      queixaEvolucao,
      condutaTratamento,
      fotos: fotosParaRelatorio,
      metricas: {
        totalFios: totalFios ? Number(totalFios) : undefined,
        totalUF: totalUF ? Number(totalUF) : undefined,
        ostiosVazios: ostiosVazios ? Number(ostiosVazios) : undefined,
        focosInflamacao: focosInflamacao ? Number(focosInflamacao) : undefined
      },
      produtos: produtosSelecionados,
      previsaoRetorno
    };
  };

  // Ação 1: Baixar PDF Timbrado
  const handleBaixarPdf = async () => {
    setGerandoPdf(true);
    try {
      const opts = montarOptionsRelatorio();
      await baixarPdfResumoConsulta(opts);
      setFeedbackSucesso('PDF baixado com sucesso!');
      setTimeout(() => setFeedbackSucesso(null), 3000);
    } catch (err) {
      console.error('Erro ao gerar PDF do resumo:', err);
    } finally {
      setGerandoPdf(false);
    }
  };

  // Ação 2: Compartilhar no WhatsApp / Web Share
  const handleCompartilharWhatsApp = async () => {
    const opts = montarOptionsRelatorio();
    // Se estiver em mobile, tenta compartilhar via Web Share com arquivo; se não, abre WhatsApp direto
    if (navigator.share) {
      setGerandoPdf(true);
      try {
        await compartilharPdfResumoConsulta(opts);
      } finally {
        setGerandoPdf(false);
      }
    } else {
      enviarResumoConsultaWhatsApp(opts);
    }
  };

  // Ação 3: Concluir Atendimento & Gravar no Prontuário
  const handleConcluirAtendimento = async () => {
    setSalvandoConsulta(true);
    try {
      const fotosParaGravar = fotos.filter(f => fotosSelecionadasIds.includes(f.id));
      const fotoPrincipal = fotosParaGravar.length > 0 ? fotosParaGravar[0].url : undefined;

      const consultaSalva = await saveConsultaAvulsa({
        id: consultaExistente?.id,
        pacienteId: paciente.id,
        pacienteNome: paciente.nome,
        data: dataConsulta,
        area: areaPrincipal,
        tipoConsulta,
        queixaEvolucao: queixaEvolucao.trim(),
        condutaTratamento: condutaTratamento.trim(),
        imagemUrl: fotoPrincipal,
        fotos: fotosParaGravar.map(f => ({
          id: f.id,
          url: f.url,
          titulo: f.titulo,
          area: f.area,
          data: dataConsulta
        })),
        totalFios: totalFios ? Number(totalFios) : undefined,
        totalUF: totalUF ? Number(totalUF) : undefined,
        ostiosVazios: ostiosVazios ? Number(ostiosVazios) : undefined,
        focosInflamacao: focosInflamacao ? Number(focosInflamacao) : undefined,
        liberadoPaciente: true
      });

      // Notificar prontuário e componentes ouvintes
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('trico-paciente-captura-salva', {
          detail: {
            pacienteId: paciente.id,
            pacienteNome: paciente.nome,
            area: areaPrincipal,
            data: dataConsulta
          }
        }));
      }

      onConsultaConcluida?.(consultaSalva);
      setFeedbackSucesso('Atendimento concluído e registrado no prontuário!');
      setTimeout(() => {
        onFechar();
      }, 1200);
    } catch (err) {
      console.error('Erro ao salvar atendimento finalizado:', err);
    } finally {
      setSalvandoConsulta(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex justify-center items-start overflow-y-auto p-3 sm:p-6 animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 border border-teal-500/30 rounded-3xl w-full max-w-4xl p-5 sm:p-7 space-y-6 shadow-2xl my-4 sm:my-8 text-slate-800 dark:text-slate-100">
        
        {/* CABEÇALHO DO MODAL */}
        <div className="flex items-center justify-between border-b border-stone-200 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-teal-700 text-white flex items-center justify-center shadow-md shadow-teal-700/25 shrink-0">
              <FileCheck2 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-xl font-bold text-slate-900 dark:text-white">
                  Fechamento de Consulta & Resumo Integrado
                </h3>
                <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                  <Sparkles className="w-3 h-3" />
                  1 Clique
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Prontuário de <strong>{paciente.nome}</strong> • Compilação para PDF e WhatsApp
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onFechar}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Fechar sem salvar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* FEEDBACK DE SUCESSO FLUTUANTE */}
        {feedbackSucesso && (
          <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-200 flex items-center gap-2 text-xs font-semibold animate-pulse">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{feedbackSucesso}</span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-12 gap-5 text-xs">
          
          {/* COLUNA ESQUERDA: PARÂMETROS DA CONSULTA & QUEIXA (6 COLS) */}
          <div className="md:col-span-6 space-y-4">
            
            {/* Bloco 1: Identificação & Dados da Consulta */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 space-y-3">
              <span className="text-[11px] font-bold text-teal-800 dark:text-teal-300 uppercase tracking-wider block">
                1. Informações do Atendimento
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1 flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-teal-600" />
                    <span>Data</span>
                  </label>
                  <input
                    type="date"
                    value={dataConsulta}
                    onChange={(e) => setDataConsulta(e.target.value)}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2 text-xs focus:outline-none focus:border-teal-500"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Tipo de Atendimento
                  </label>
                  <select
                    value={tipoConsulta}
                    onChange={(e) => setTipoConsulta(e.target.value)}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2 text-xs focus:outline-none focus:border-teal-500"
                  >
                    <option value="Consulta de Retorno">Consulta de Retorno</option>
                    <option value="Primeira Avaliação / Diagnóstico">Primeira Avaliação / Diagnóstico</option>
                    <option value="Acompanhamento do Tratamento">Acompanhamento do Tratamento</option>
                    <option value="Sessão Terapêutica (Laser/MMP)">Sessão Terapêutica (Laser/MMP)</option>
                    <option value="Manutenção Preventiva">Manutenção Preventiva</option>
                    <option value="Outro">Outro</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1 flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-rose-600" />
                  <span>Área Principal Analisada</span>
                </label>
                <select
                  value={areaPrincipal}
                  onChange={(e) => setAreaPrincipal(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2 text-xs focus:outline-none focus:border-teal-500"
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

              {/* Queixa & Evolução */}
              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Queixa Relatada / Evolução Clínica
                </label>
                <textarea
                  rows={2}
                  value={queixaEvolucao}
                  onChange={(e) => setQueixaEvolucao(e.target.value)}
                  placeholder="Ex: Paciente relata melhora na densidade frontal e redução expressiva na queda de fios..."
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs focus:outline-none focus:border-teal-500"
                />
              </div>
            </div>

            {/* Bloco 2: Telemetria / Contagem Folicular */}
            <div className="p-4 rounded-2xl bg-teal-50/40 dark:bg-teal-950/20 border border-teal-200/70 dark:border-teal-800/60 space-y-2.5">
              <span className="text-[11px] font-bold text-teal-900 dark:text-teal-300 uppercase tracking-wider block">
                2. Telemetria Folicular da Bancada
              </span>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div>
                  <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-0.5">
                    Total Fios
                  </label>
                  <input
                    type="number"
                    placeholder="—"
                    value={totalFios}
                    onChange={(e) => setTotalFios(e.target.value)}
                    className="w-full bg-white dark:bg-slate-900 border border-teal-300 dark:border-teal-800 rounded-xl p-1.5 text-center font-bold text-teal-800 dark:text-teal-200"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-0.5">
                    Unidades (UFs)
                  </label>
                  <input
                    type="number"
                    placeholder="—"
                    value={totalUF}
                    onChange={(e) => setTotalUF(e.target.value)}
                    className="w-full bg-white dark:bg-slate-900 border border-teal-300 dark:border-teal-800 rounded-xl p-1.5 text-center font-bold text-indigo-700 dark:text-indigo-300"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-0.5">
                    Óstios Vazios
                  </label>
                  <input
                    type="number"
                    placeholder="0"
                    value={ostiosVazios}
                    onChange={(e) => setOstiosVazios(e.target.value)}
                    className="w-full bg-white dark:bg-slate-900 border border-rose-300 dark:border-rose-800 rounded-xl p-1.5 text-center font-bold text-rose-600 dark:text-rose-400"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-0.5">
                    Inflamação
                  </label>
                  <input
                    type="number"
                    placeholder="0"
                    value={focosInflamacao}
                    onChange={(e) => setFocosInflamacao(e.target.value)}
                    className="w-full bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-800 rounded-xl p-1.5 text-center font-bold text-amber-700 dark:text-amber-300"
                  />
                </div>
              </div>
            </div>

            {/* Bloco 3: Fotos Registradas no Atendimento */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-teal-800 dark:text-teal-300 uppercase tracking-wider">
                  3. Fotos para o Relatório ({fotosSelecionadasIds.length} selecionadas)
                </span>

                <label className="cursor-pointer text-[11px] font-semibold text-teal-700 dark:text-teal-400 hover:underline flex items-center gap-1">
                  <Camera className="w-3.5 h-3.5" />
                  <span>+ Anexar Foto</span>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleUploadFotoFechamento}
                    className="hidden"
                  />
                </label>
              </div>

              {processandoFoto && (
                <div className="flex items-center gap-2 text-[11px] text-teal-700 font-semibold py-1">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Otimizando e comprimindo fotografia...</span>
                </div>
              )}

              {fotos.length === 0 ? (
                <div className="p-3 text-center border border-dashed border-slate-300 dark:border-slate-700 rounded-xl text-slate-400 text-xs">
                  Nenhuma foto anexada a este atendimento ainda.
                </div>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {fotos.map(foto => {
                    const isSel = fotosSelecionadasIds.includes(foto.id);
                    return (
                      <button
                        type="button"
                        key={foto.id}
                        onClick={() => handleToggleFoto(foto.id)}
                        className={`relative rounded-xl overflow-hidden aspect-square border-2 transition-all ${
                          isSel 
                            ? 'border-teal-600 ring-2 ring-teal-500/30' 
                            : 'border-slate-200 dark:border-slate-700 opacity-60 hover:opacity-100'
                        }`}
                        title={isSel ? 'Clique para desmarcar do relatório' : 'Clique para incluir no relatório'}
                      >
                        <img 
                          src={foto.url} 
                          alt={foto.titulo || 'Foto'} 
                          className="w-full h-full object-cover" 
                        />
                        <div className={`absolute top-1 right-1 w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold ${
                          isSel ? 'bg-teal-700 text-white' : 'bg-slate-900/60 text-white'
                        }`}>
                          {isSel ? <Check className="w-3 h-3 stroke-[3]" /> : ''}
                        </div>
                        <div className="absolute bottom-0 inset-x-0 bg-black/60 text-[9px] text-white p-0.5 truncate text-center">
                          {foto.area || 'Couro Cabeludo'}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

          </div>

          {/* COLUNA DIREITA: CONDUTA, PRODUTOS HOME CARE & RETORNO (6 COLS) */}
          <div className="md:col-span-6 space-y-4">
            
            {/* Bloco 4: Conduta Terapêutica & Prescrição */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 space-y-2">
              <span className="text-[11px] font-bold text-teal-800 dark:text-teal-300 uppercase tracking-wider block">
                4. Conduta Terapêutica / Prescrição
              </span>
              <textarea
                rows={3}
                value={condutaTratamento}
                onChange={(e) => setCondutaTratamento(e.target.value)}
                placeholder="Ex: Realizada sessão de microagulhamento com drug delivery de fatores de crescimento. Prescrita loção capilar noturna e fitoterápicos orais..."
                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs focus:outline-none focus:border-teal-500 leading-relaxed"
              />
            </div>

            {/* Bloco 5: Orientações Home Care / Produtos Indicados */}
            <div className="p-4 rounded-2xl bg-emerald-50/40 dark:bg-emerald-950/20 border border-emerald-200/70 dark:border-emerald-800/60 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-emerald-900 dark:text-emerald-300 uppercase tracking-wider flex items-center gap-1.5">
                  <ShoppingBag className="w-3.5 h-3.5 text-emerald-600" />
                  <span>5. Cuidados Home Care / Produtos</span>
                </span>

                <button
                  type="button"
                  onClick={() => setMostrarFormNovoProd(prev => !prev)}
                  className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 hover:underline flex items-center gap-0.5"
                >
                  <Plus className="w-3 h-3" />
                  <span>{mostrarFormNovoProd ? 'Cancelar' : '+ Produto'}</span>
                </button>
              </div>

              {/* Form de adicionar produto rápido */}
              {mostrarFormNovoProd && (
                <div className="p-3 bg-white dark:bg-slate-900 border border-emerald-300 dark:border-emerald-700 rounded-xl space-y-2">
                  <div>
                    <input
                      type="text"
                      placeholder="Nome do produto ou fórmula (ex: Minoxidil 5% + Biotina)"
                      value={novoProdNome}
                      onChange={(e) => setNovoProdNome(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-xs focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <input
                      type="text"
                      placeholder="Posologia / Como usar (ex: Aplicar 1ml no couro cabeludo à noite)"
                      value={novoProdComoUsar}
                      onChange={(e) => setNovoProdComoUsar(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-xs focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleAdicionarProdutoRapido}
                    className="w-full py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs"
                  >
                    Adicionar ao Resumo
                  </button>
                </div>
              )}

              {/* Lista de produtos selecionados para o resumo */}
              {produtosSelecionados.length === 0 ? (
                <p className="text-slate-400 text-xs italic py-1">
                  Nenhum produto incluído no resumo. Clique em "+ Produto" para adicionar orientações de uso.
                </p>
              ) : (
                <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                  {produtosSelecionados.map((prod, idx) => (
                    <div 
                      key={idx}
                      className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-800 flex items-center justify-between gap-2"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-slate-800 dark:text-slate-200 text-xs truncate">
                          {idx + 1}. {prod.nome}
                        </p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                          {prod.comoUsar}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoverProdutoResumo(idx)}
                        className="text-slate-400 hover:text-rose-500 p-1 shrink-0"
                        title="Remover deste resumo"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Bloco 6: Previsão de Próximo Retorno */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 space-y-2">
              <span className="text-[11px] font-bold text-teal-800 dark:text-teal-300 uppercase tracking-wider block">
                6. Próximo Retorno Programado
              </span>

              {/* Badges de seleção rápida */}
              <div className="flex flex-wrap gap-1.5">
                {['15 dias', '30 dias', '45 dias', '60 dias', '90 dias', '120 dias'].map(prazo => {
                  const textoPrazo = `Retorno em ${prazo}`;
                  const isSel = previsaoRetorno === textoPrazo;
                  return (
                    <button
                      key={prazo}
                      type="button"
                      onClick={() => setPrevisaoRetorno(textoPrazo)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                        isSel
                          ? 'bg-teal-700 text-white shadow-xs'
                          : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-teal-500'
                      }`}
                    >
                      {prazo}
                    </button>
                  );
                })}
              </div>

              <input
                type="text"
                value={previsaoRetorno}
                onChange={(e) => setPrevisaoRetorno(e.target.value)}
                placeholder="Ex: Retorno em 60 dias para reavaliação fotográfica"
                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2 text-xs focus:outline-none focus:border-teal-500"
              />
            </div>

          </div>

        </div>

        {/* RODAPÉ DO MODAL: AÇÕES RÁPIDAS EM 1 CLIQUE */}
        <div className="border-t border-slate-200 dark:border-slate-800 pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>Resumo timbrado pronto para impressão e envio ao paciente</span>
          </div>

          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap justify-end">
            
            {/* Botão Baixar PDF */}
            <button
              type="button"
              onClick={handleBaixarPdf}
              disabled={gerandoPdf}
              className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 font-bold text-xs flex items-center gap-1.5 transition-all shadow-xs disabled:opacity-50"
              title="Baixar PDF timbrado no computador/celular"
            >
              {gerandoPdf ? (
                <Loader2 className="w-4 h-4 animate-spin text-teal-600" />
              ) : (
                <Download className="w-4 h-4 text-teal-600" />
              )}
              <span>Baixar PDF</span>
            </button>

            {/* Botão WhatsApp */}
            <button
              type="button"
              onClick={handleCompartilharWhatsApp}
              disabled={gerandoPdf}
              className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-xs hover:scale-[1.02] disabled:opacity-50"
              title="Compartilhar laudo no WhatsApp do paciente"
            >
              <Send className="w-4 h-4" />
              <span>Enviar WhatsApp</span>
            </button>

            {/* Botão Concluir Consulta */}
            <button
              type="button"
              onClick={handleConcluirAtendimento}
              disabled={salvandoConsulta}
              className="px-5 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs flex items-center gap-2 transition-all shadow-md shadow-teal-700/25 hover:scale-[1.02] disabled:opacity-50"
              title="Salvar consulta no prontuário e concluir atendimento"
            >
              {salvandoConsulta ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <CheckCircle2 className="w-4 h-4" />
              )}
              <span>Concluir Atendimento</span>
            </button>

          </div>
        </div>

      </div>
    </div>
  );
};

