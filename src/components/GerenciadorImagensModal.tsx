import React, { useState, useEffect, useMemo } from 'react';
import { CasoAtlas, CategoriaClinica } from '../types/tricoscopia';
import { 
  obterCasosAtlas, 
  removerCasoAtlas, 
  sincronizarCasosComFirestore, 
  restaurarCasosOriginais 
} from '../services/casosAtlasService';
import { ModalFormularioCasoAtlas } from './ModalFormularioCasoAtlas';
import { 
  obterTodasImagensGaleria, 
  adicionarImagemCaso,
  removerImagemCaso, 
  removerImagemEspecifica,
  exportarBackupImagens, 
  importarBackupImagens, 
  arquivoParaDataURL,
  recuperarImagensLegadas,
  sincronizarComFirebase,
  normalizarParaCasoOficial,
  ImagemArmazenada 
} from '../utils/imageStore';
import { usuarioEhAdmin } from '../utils/fotosNuvem';
import { 
  X, 
  Image as ImageIcon, 
  CheckCircle2, 
  Trash2, 
  Download, 
  FileUp, 
  Info, 
  HelpCircle,
  Camera,
  Sparkles,
  RefreshCw,
  Cloud,
  Plus,
  Edit3,
  Search,
  RotateCcw,
  BookOpen,
  Filter
} from 'lucide-react';

interface GerenciadorImagensModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAbrirCaso: (casoId: string) => void;
}

export const GerenciadorImagensModal: React.FC<GerenciadorImagensModalProps> = ({
  isOpen,
  onClose,
  onAbrirCaso
}) => {
  const [casosAtivos, setCasosAtivos] = useState<CasoAtlas[]>(() => obterCasosAtlas());
  const [galerias, setGalerias] = useState<Record<string, ImagemArmazenada[]>>({});
  const [carregando, setCarregando] = useState(true);
  const [abaAjuda, setAbaAjuda] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ tipo: 'sucesso' | 'erro' | 'info'; texto: string } | null>(null);
  const [fotoPreview, setFotoPreview] = useState<{ url: string; titulo: string } | null>(null);

  // Filtros de busca no modal
  const [filtroTexto, setFiltroTexto] = useState('');
  const [filtroCategoria, setFiltroCategoria] = useState<string>('Todas');

  // Modal para criar / editar caso
  const [modalFormAberto, setModalFormAberto] = useState(false);
  const [casoParaEditar, setCasoParaEditar] = useState<CasoAtlas | null>(null);

  const recarregarTudo = async () => {
    try {
      await sincronizarComFirebase().catch(() => {});
      await sincronizarCasosComFirestore().catch(() => {});
      await recuperarImagensLegadas().catch(() => {});
      const mapa = await obterTodasImagensGaleria();
      setGalerias(mapa);
      setCasosAtivos([...obterCasosAtlas()]);
    } catch (e) {
      console.error(e);
    } finally {
      setCarregando(false);
    }
  };

  const handleSincronizar = async () => {
    setCarregando(true);
    try {
      const fotosSinc = await sincronizarComFirebase();
      const casosSinc = await sincronizarCasosComFirestore();
      await recuperarImagensLegadas();
      const mapa = await obterTodasImagensGaleria();
      setGalerias(mapa);
      const casosAtualizados = obterCasosAtlas();
      setCasosAtivos([...casosAtualizados]);

      const totalCasosComFoto = Object.keys(mapa).filter(k => mapa[k] && mapa[k].length > 0).length;
      const totalFotos = Object.values(mapa).reduce((acc, arr) => acc + (arr?.length || 0), 0);

      setStatusMsg({
        tipo: 'sucesso',
        texto: `Sincronização completa! ${totalFotos} foto(s) ativas e ${casosAtualizados.length} condições clínicas sincronizadas com o Firebase.`
      });
      setTimeout(() => setStatusMsg(null), 4000);
    } catch {
      setStatusMsg({ tipo: 'erro', texto: 'Erro ao sincronizar dados com o Firebase.' });
    } finally {
      setCarregando(false);
    }
  };

  const ehAdmin = usuarioEhAdmin();

  useEffect(() => {
    if (isOpen) {
      if (!usuarioEhAdmin()) {
        onClose();
        return;
      }
      recarregarTudo();

      const handleUpdateFotos = () => recarregarTudo();
      const handleUpdateCasos = () => {
        setCasosAtivos([...obterCasosAtlas()]);
      };

      window.addEventListener('atlas-image-updated', handleUpdateFotos);
      window.addEventListener('atlas-cases-updated', handleUpdateCasos);
      return () => {
        window.removeEventListener('atlas-image-updated', handleUpdateFotos);
        window.removeEventListener('atlas-cases-updated', handleUpdateCasos);
      };
    }
  }, [isOpen, onClose]);

  // Lista filtrada e ordenada de casos
  const casosFiltrados = useMemo(() => {
    const q = filtroTexto.toLowerCase().trim();
    return casosAtivos.filter(c => {
      if (filtroCategoria !== 'Todas' && c.categoria !== filtroCategoria) return false;
      if (!q) return true;
      return (
        c.nome.toLowerCase().includes(q) ||
        c.categoria.toLowerCase().includes(q) ||
        (c.padrao && c.padrao.toLowerCase().includes(q)) ||
        (c.achadosTricoscopicos && c.achadosTricoscopicos.some(a => a.toLowerCase().includes(q)))
      );
    });
  }, [casosAtivos, filtroTexto, filtroCategoria]);

  const totalCasosComImagem = casosAtivos.filter(c => {
    const list = galerias[c.id] || galerias[normalizarParaCasoOficial(c.id)];
    return list && list.length > 0;
  }).length;

  const totalFotosNoAcervo = Object.values(galerias).reduce((acc, arr) => acc + (arr?.length || 0), 0);
  const percentual = casosAtivos.length > 0 ? Math.round((totalCasosComImagem / casosAtivos.length) * 100) : 0;

  const handleUploadFotos = async (casoId: string, files: FileList | null) => {
    if (!files || files.length === 0) return;
    try {
      setCarregando(true);
      const arrayFiles = Array.from(files);
      for (const file of arrayFiles) {
        const dataUrl = await arquivoParaDataURL(file);
        await adicionarImagemCaso(casoId, dataUrl, file.name, file.size);
      }
      await recarregarTudo();
      setStatusMsg({ 
        tipo: 'sucesso', 
        texto: `${arrayFiles.length} foto(s) adicionada(s) com sucesso ao caso!` 
      });
      setTimeout(() => setStatusMsg(null), 3500);
    } catch (err: any) {
      setStatusMsg({ tipo: 'erro', texto: err?.message || 'Falha ao processar imagens.' });
    } finally {
      setCarregando(false);
    }
  };

  const handleRemoverFotoEspecifica = async (casoId: string, idOuDataUrl: string, nomeCaso: string, index: number) => {
    if (window.confirm(`Deseja remover a foto ${index + 1} de "${nomeCaso}"?`)) {
      try {
        await removerImagemEspecifica(casoId, idOuDataUrl);
        await recarregarTudo();
        setStatusMsg({ tipo: 'info', texto: `Foto ${index + 1} removida de "${nomeCaso}".` });
        setTimeout(() => setStatusMsg(null), 3000);
      } catch (err: any) {
        setStatusMsg({ tipo: 'erro', texto: err?.message || 'Erro ao remover foto.' });
      }
    }
  };

  const handleRemoverTodas = async (casoId: string, nomeCaso: string) => {
    if (window.confirm(`Deseja remover TODAS as fotos cadastradas para "${nomeCaso}"?`)) {
      try {
        await removerImagemCaso(casoId);
        await recarregarTudo();
        setStatusMsg({ tipo: 'info', texto: `Todas as fotos foram removidas de "${nomeCaso}".` });
        setTimeout(() => setStatusMsg(null), 3000);
      } catch (err: any) {
        setStatusMsg({ tipo: 'erro', texto: err?.message || 'Erro ao remover fotos.' });
      }
    }
  };

  const handleAbrirEdicao = (caso: CasoAtlas) => {
    setCasoParaEditar(caso);
    setModalFormAberto(true);
  };

  const handleNovoCaso = () => {
    setCasoParaEditar(null);
    setModalFormAberto(true);
  };

  const handleRemoverCasoCompleto = async (casoId: string, nomeCaso: string) => {
    if (window.confirm(`Tem certeza que deseja REMOVER a condição "${nomeCaso}" do Atlas?\n\nEssa ação excluirá os dados clínicos e as fotos associadas em todos os dispositivos.`)) {
      try {
        setCarregando(true);
        await removerCasoAtlas(casoId);
        await recarregarTudo();
        setStatusMsg({ tipo: 'info', texto: `Condição "${nomeCaso}" removida com sucesso do Atlas.` });
        setTimeout(() => setStatusMsg(null), 4000);
      } catch (err: any) {
        setStatusMsg({ tipo: 'erro', texto: err?.message || 'Erro ao remover condição.' });
      } finally {
        setCarregando(false);
      }
    }
  };

  const handleRestaurarPadroes = async () => {
    if (window.confirm('Deseja restaurar as 17 condições originais de fábrica do Atlas? As fotos existentes serão preservadas.')) {
      try {
        setCarregando(true);
        await restaurarCasosOriginais();
        await recarregarTudo();
        setStatusMsg({ tipo: 'sucesso', texto: 'Casos originais restaurados com sucesso!' });
        setTimeout(() => setStatusMsg(null), 4000);
      } catch (err: any) {
        setStatusMsg({ tipo: 'erro', texto: err?.message || 'Erro ao restaurar casos originais.' });
      } finally {
        setCarregando(false);
      }
    }
  };

  const handleExportar = async () => {
    try {
      const json = await exportarBackupImagens();
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `atlas-tricoscopia-backup-galeria-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setStatusMsg({ tipo: 'sucesso', texto: 'Backup completo exportado com sucesso!' });
      setTimeout(() => setStatusMsg(null), 3000);
    } catch (err: any) {
      setStatusMsg({ tipo: 'erro', texto: err?.message || 'Falha ao exportar backup.' });
    }
  };

  const handleImportar = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return;
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const conteudo = reader.result as string;
        const total = await importarBackupImagens(conteudo);
        await recarregarTudo();
        setStatusMsg({ tipo: 'sucesso', texto: `${total} foto(s) restauradas com sucesso!` });
        setTimeout(() => setStatusMsg(null), 4000);
      } catch (err: any) {
        setStatusMsg({ tipo: 'erro', texto: err?.message || 'Arquivo de backup inválido.' });
      }
    };
    reader.readAsText(file);
  };

  if (!isOpen || !ehAdmin) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/75 flex justify-center items-start p-2.5 sm:p-6 overflow-y-auto animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 border border-stone-200/90 dark:border-slate-800 rounded-3xl w-full max-w-5xl shadow-2xl overflow-hidden my-4 sm:my-8 flex flex-col">
        {/* Header do Modal */}
        <div className="p-5 sm:p-6 border-b border-stone-200/90 dark:border-slate-800 flex items-center justify-between bg-stone-50/70 dark:bg-slate-950/70">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-teal-50 dark:bg-teal-950 border border-teal-200/80 dark:border-teal-800/60 flex items-center justify-center text-teal-700 dark:text-teal-300 shadow-xs">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-stone-900 dark:text-slate-100 flex flex-wrap items-center gap-2">
                <span>Fotos e Casos do Atlas</span>
                <span className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-teal-50 dark:bg-teal-950 text-teal-800 dark:text-teal-300 border border-teal-200/80 dark:border-teal-800 font-semibold">
                  {totalFotosNoAcervo} fotos • {totalCasosComImagem}/{casosAtivos.length} condições
                </span>
                <span className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800 font-semibold flex items-center gap-1">
                  <Cloud className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>Nuvem Firebase Ativa</span>
                </span>
              </h2>
              <p className="text-xs text-stone-500 dark:text-slate-400 mt-0.5">
                Cadastre novas condições, edite informações clínicas e gerencie fotos tricoscópicas (50x, 5x, imersão).
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setAbaAjuda(!abaAjuda)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold border flex items-center gap-1.5 transition-colors shadow-xs ${
                abaAjuda 
                  ? 'bg-teal-50 text-teal-900 border-teal-300 dark:bg-slate-800 dark:text-teal-300' 
                  : 'bg-white text-stone-700 hover:text-stone-900 hover:bg-stone-100 dark:bg-slate-800 dark:text-slate-300 border-stone-200 dark:border-slate-700'
              }`}
            >
              <HelpCircle className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
              <span>Como funciona?</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-stone-400 hover:text-stone-700 hover:bg-stone-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Mensagem de Status Temporária */}
        {statusMsg && (
          <div className={`px-5 py-2.5 text-xs font-medium border-b flex items-center gap-2 ${
            statusMsg.tipo === 'sucesso' 
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/70 dark:border-emerald-800 dark:text-emerald-300' 
              : statusMsg.tipo === 'erro'
              ? 'bg-rose-50 border-rose-200 text-rose-800 dark:bg-rose-950/70 dark:border-rose-800 dark:text-rose-300'
              : 'bg-stone-50 border-stone-200 text-stone-800 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200'
          }`}>
            <Info className="w-4 h-4 shrink-0" />
            <span>{statusMsg.texto}</span>
          </div>
        )}

        {/* Barra de Ações Principais e Botão "+ Novo Caso Clínico" */}
        <div className="bg-stone-50/50 dark:bg-slate-950/40 p-4 sm:p-5 border-b border-stone-200/90 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Progresso do Acervo */}
          <div className="flex-1 max-w-sm">
            <div className="flex justify-between items-center text-xs mb-1.5">
              <span className="text-stone-700 dark:text-slate-300 font-semibold">Cobertura com Imagens</span>
              <span className="font-mono text-teal-700 dark:text-teal-400 font-bold">{percentual}% ({totalCasosComImagem}/{casosAtivos.length})</span>
            </div>
            <div className="w-full h-2.5 bg-stone-200 dark:bg-slate-800 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-teal-500 to-teal-700 dark:from-teal-500 dark:to-teal-400 transition-all duration-300"
                style={{ width: `${percentual}%` }}
              />
            </div>
          </div>

          {/* Botões de Ação */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleNovoCaso}
              className="px-3.5 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm shadow-teal-700/25 transition-all"
              title="Cadastrar uma nova condição clínica no Atlas"
            >
              <Plus className="w-4 h-4" />
              <span>Novo Caso Clínico</span>
            </button>

            <button
              onClick={handleSincronizar}
              className="px-3.5 py-2 rounded-xl bg-teal-50 hover:bg-teal-100/80 dark:bg-slate-800 text-xs font-semibold text-teal-800 dark:text-teal-300 border border-teal-200 dark:border-slate-700 flex items-center gap-1.5 transition-colors shadow-xs"
              title="Sincroniza fotos e casos com o Firebase Firestore na nuvem"
            >
              <RefreshCw className="w-3.5 h-3.5 text-teal-700 dark:text-teal-400" />
              <span>Sincronizar Nuvem</span>
            </button>

            <button
              onClick={handleExportar}
              disabled={totalFotosNoAcervo === 0}
              className="px-3 py-2 rounded-xl bg-white hover:bg-stone-100 dark:bg-slate-800 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed text-xs font-semibold text-stone-700 dark:text-slate-200 border border-stone-200 dark:border-slate-700 flex items-center gap-1.5 transition-colors shadow-xs"
              title="Salva um arquivo JSON com todas as fotos e dados"
            >
              <Download className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
              <span className="hidden sm:inline">Backup ({totalFotosNoAcervo})</span>
            </button>

            <label className="cursor-pointer px-3 py-2 rounded-xl bg-white hover:bg-stone-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-semibold text-stone-700 dark:text-slate-200 border border-stone-200 dark:border-slate-700 flex items-center gap-1.5 transition-colors shadow-xs">
              <FileUp className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span className="hidden sm:inline">Restaurar</span>
              <input 
                type="file" 
                accept=".json" 
                className="hidden" 
                onChange={handleImportar}
              />
            </label>

            <button
              onClick={handleRestaurarPadroes}
              className="p-2 rounded-xl bg-white hover:bg-stone-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-stone-500 hover:text-stone-800 dark:text-slate-400 border border-stone-200 dark:border-slate-700 transition-colors shadow-xs"
              title="Restaurar as 17 condições originais de fábrica do Atlas"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Barra de Filtro e Busca Rápida */}
        <div className="px-5 py-3 border-b border-stone-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={filtroTexto}
              onChange={(e) => setFiltroTexto(e.target.value)}
              placeholder="Buscar por condição, categoria ou achado..."
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-stone-200 dark:border-slate-800 bg-stone-50/50 dark:bg-slate-950/50 text-stone-900 dark:text-slate-100 placeholder:text-stone-400 focus:outline-hidden focus:ring-2 focus:ring-teal-500"
            />
            {filtroTexto && (
              <button
                onClick={() => setFiltroTexto('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
            <span className="text-[11px] font-medium text-stone-400 mr-1 flex items-center gap-1">
              <Filter className="w-3 h-3" />
              <span>Categoria:</span>
            </span>
            {['Todas', 'Não Cicatricial', 'Cicatricial', 'Dermatose Descamativa', 'Infecciosa', 'Parasitária'].map(cat => (
              <button
                key={cat}
                onClick={() => setFiltroCategoria(cat)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all shrink-0 ${
                  filtroCategoria === cat
                    ? 'bg-teal-700 text-white font-semibold shadow-xs'
                    : 'bg-stone-100 hover:bg-stone-200 text-stone-600 dark:bg-slate-800 dark:text-slate-300'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Aba de Instruções e Ajuda */}
        {abaAjuda && (
          <div className="p-5 bg-teal-50/50 dark:bg-slate-950/60 border-b border-teal-100 dark:border-slate-800 text-xs space-y-3 animate-fadeIn">
            <h3 className="font-bold text-teal-950 dark:text-teal-300 text-sm flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-teal-600 dark:text-teal-400" />
              <span>Gerenciamento de Casos e Fotos do Atlas:</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-stone-700 dark:text-slate-300">
              <div className="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-teal-100 dark:border-slate-800 space-y-1.5 shadow-xs">
                <span className="font-bold text-stone-900 dark:text-slate-100 flex items-center gap-1.5">
                  <span className="w-4 h-4 rounded-full bg-teal-100 dark:bg-teal-950 text-teal-700 dark:text-teal-300 flex items-center justify-center text-[10px] font-bold">1</span>
                  Cadastrar & Editar Casos
                </span>
                <p className="text-[11px] text-stone-500 dark:text-slate-400 leading-relaxed">
                  Clique em <strong>"+ Novo Caso Clínico"</strong> para criar novas condições com todos os achados tricoscópicos e padrões clínicos, ou clique no lápis de cada card para editar.
                </p>
              </div>

              <div className="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-teal-100 dark:border-slate-800 space-y-1.5 shadow-xs">
                <span className="font-bold text-stone-900 dark:text-slate-100 flex items-center gap-1.5">
                  <span className="w-4 h-4 rounded-full bg-teal-100 dark:bg-teal-950 text-teal-700 dark:text-teal-300 flex items-center justify-center text-[10px] font-bold">2</span>
                  Upload no Banco de Dados da Nuvem
                </span>
                <p className="text-[11px] text-stone-500 dark:text-slate-400 leading-relaxed">
                  Todas as fotos anexadas vão para o mesmo bucket seguro do <strong>Firebase Storage</strong> e metadados no <strong>Firestore</strong>, sincronizadas em todos os aparelhos.
                </p>
              </div>

              <div className="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-teal-100 dark:border-slate-800 space-y-1.5 shadow-xs">
                <span className="font-bold text-stone-900 dark:text-slate-100 flex items-center gap-1.5">
                  <span className="w-4 h-4 rounded-full bg-teal-100 dark:bg-teal-950 text-teal-700 dark:text-teal-300 flex items-center justify-center text-[10px] font-bold">3</span>
                  Exclusão Segura
                </span>
                <p className="text-[11px] text-stone-500 dark:text-slate-400 leading-relaxed">
                  Você pode remover uma foto individual clicando no "X" da miniatura, ou remover o caso por completo no botão "Excluir" do card.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Lista dos Casos do Material */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3">
          {casosFiltrados.length === 0 ? (
            <div className="text-center py-12 px-4 space-y-3">
              <BookOpen className="w-10 h-10 text-stone-300 dark:text-slate-700 mx-auto" />
              <p className="text-sm font-semibold text-stone-700 dark:text-slate-300">
                Nenhuma condição clínica encontrada com esses filtros.
              </p>
              <button
                onClick={handleNovoCaso}
                className="px-4 py-2 rounded-xl bg-teal-700 text-white text-xs font-semibold shadow-xs inline-flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Cadastrar este Caso Agora</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {casosFiltrados.map((caso) => {
                const fotos = galerias[caso.id] || galerias[normalizarParaCasoOficial(caso.id)] || [];
                const totalFotosCaso = fotos.length;
                const temFotos = totalFotosCaso > 0;

                return (
                  <div 
                    key={caso.id}
                    className={`p-4 rounded-2xl border flex flex-col justify-between gap-3.5 transition-all ${
                      temFotos 
                        ? 'bg-white dark:bg-slate-900 border-stone-200/90 dark:border-slate-800 shadow-xs' 
                        : 'bg-stone-50/70 dark:bg-slate-950/60 border-stone-200/70 dark:border-slate-800/80'
                    }`}
                  >
                    {/* Cabeçalho do Card */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {caso.numeroOrdem && (
                            <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-full bg-teal-50 dark:bg-teal-950 text-teal-800 dark:text-teal-300 border border-teal-200 dark:border-teal-800">
                              #{caso.numeroOrdem.toString().padStart(2, '0')}
                            </span>
                          )}
                          <span className="text-[10px] font-mono uppercase text-stone-400 dark:text-slate-500 truncate">
                            {caso.categoria}
                          </span>
                        </div>

                        <h4 
                          onClick={() => { onClose(); onAbrirCaso(caso.id); }}
                          className="text-xs sm:text-sm font-bold text-stone-900 dark:text-slate-100 hover:text-teal-700 dark:hover:text-teal-300 cursor-pointer truncate transition-colors mt-0.5"
                          title={caso.nome}
                        >
                          {caso.nome}
                        </h4>

                        <p className="text-[11px] text-stone-500 dark:text-slate-400 italic line-clamp-1 mt-0.5">
                          "{caso.imagem?.legenda || caso.padrao || 'Sem legenda'}"
                        </p>
                      </div>

                      {/* Botões de Ação do Caso (Editar / Excluir) e Badge de Status */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => handleAbrirEdicao(caso)}
                          className="p-1.5 rounded-lg bg-stone-100 hover:bg-teal-50 text-stone-700 hover:text-teal-800 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300 text-xs font-semibold flex items-center gap-1 transition-colors"
                          title="Editar informações clínicas e parâmetros deste caso"
                        >
                          <Edit3 className="w-3.5 h-3.5 text-teal-700 dark:text-teal-400" />
                          <span className="hidden sm:inline">Editar</span>
                        </button>

                        <button
                          onClick={() => handleRemoverCasoCompleto(caso.id, caso.nome)}
                          className="p-1.5 rounded-lg bg-stone-100 hover:bg-rose-50 text-stone-500 hover:text-rose-700 dark:bg-slate-800 dark:hover:bg-rose-950/60 dark:text-slate-400 text-xs font-semibold flex items-center gap-1 transition-colors"
                          title="Remover esta condição clínica do Atlas"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Excluir</span>
                        </button>
                      </div>
                    </div>

                    {/* Faixa de Miniaturas (Galeria Multi-Imagem) */}
                    <div className="flex items-center gap-2 overflow-x-auto py-1">
                      {temFotos ? (
                        fotos.map((foto, idx) => (
                          <div 
                            key={foto.id || `${caso.id}_${idx}`}
                            className="relative group/thumb w-16 h-16 rounded-xl overflow-hidden border border-stone-200 dark:border-slate-800 bg-stone-100 dark:bg-slate-950 shrink-0 shadow-xs cursor-pointer"
                            onClick={() => setFotoPreview({ url: foto.dataUrl, titulo: `${caso.nome} (Foto ${idx + 1})` })}
                          >
                            {foto.dataUrl && foto.dataUrl.trim() !== '' ? (
                              <img 
                                src={foto.dataUrl} 
                                alt={`${caso.nome} ${idx + 1}`} 
                                className="w-full h-full object-cover group-hover/thumb:scale-105 transition-transform" 
                              />
                            ) : null}
                            <span className="absolute bottom-1 left-1 px-1 py-0.2 rounded bg-black/75 text-[9px] font-mono text-white font-bold">
                              {idx + 1}
                            </span>

                            {/* Botão de excluir foto específica */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRemoverFotoEspecifica(caso.id, foto.id || foto.dataUrl, caso.nome, idx);
                              }}
                              className="absolute top-1 right-1 p-1 rounded-md bg-black/80 hover:bg-rose-700 text-white opacity-0 group-hover/thumb:opacity-100 transition-opacity"
                              title="Remover apenas esta foto"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))
                      ) : (
                        <div className="w-full py-3 px-3 rounded-xl border border-dashed border-stone-300 dark:border-slate-800 bg-stone-50/50 dark:bg-slate-950/40 flex items-center justify-center gap-2 text-stone-400 text-xs">
                          <ImageIcon className="w-4 h-4 text-stone-400" />
                          <span>Nenhuma foto anexada a esta condição</span>
                        </div>
                      )}
                    </div>

                    {/* Ações de Foto do Card */}
                    <div className="flex items-center justify-between gap-2 pt-1 border-t border-stone-100 dark:border-slate-800/60">
                      <label className="cursor-pointer px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 border transition-all shadow-xs bg-teal-700 hover:bg-teal-800 text-white border-teal-700">
                        <Plus className="w-3.5 h-3.5" />
                        <span>{temFotos ? 'Adicionar mais fotos' : 'Adicionar fotos'}</span>
                        <input 
                          type="file" 
                          accept="image/*" 
                          multiple
                          className="hidden" 
                          onChange={(e) => {
                            handleUploadFotos(caso.id, e.target.files);
                            e.target.value = '';
                          }}
                        />
                      </label>

                      {temFotos && (
                        <button
                          onClick={() => handleRemoverTodas(caso.id, caso.nome)}
                          className="px-2.5 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 dark:bg-rose-950 dark:hover:bg-rose-900 dark:text-rose-300 border border-rose-200 dark:border-rose-800 text-xs font-semibold flex items-center gap-1 transition-colors"
                          title="Remover todas as fotos deste caso"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Limpar fotos</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Modal de Pré-Visualização de Imagem */}
        {fotoPreview && (
          <div 
            className="fixed inset-0 z-60 bg-black/90 flex flex-col items-center justify-center p-4 animate-fadeIn"
            onClick={() => setFotoPreview(null)}
          >
            <div className="absolute top-4 right-4">
              <button
                onClick={() => setFotoPreview(null)}
                className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            {fotoPreview.url && fotoPreview.url.trim() !== '' ? (
              <img 
                src={fotoPreview.url} 
                alt={fotoPreview.titulo} 
                className="max-w-full max-h-[80vh] object-contain rounded-xl shadow-2xl" 
              />
            ) : null}
            <p className="text-sm font-semibold text-white mt-3">{fotoPreview.titulo}</p>
          </div>
        )}

        {/* Modal de Formulário para Criar ou Editar Caso */}
        <ModalFormularioCasoAtlas
          isOpen={modalFormAberto}
          onClose={() => setModalFormAberto(false)}
          casoParaEditar={casoParaEditar}
          onSalvo={(casoSalvo) => {
            recarregarTudo();
            setStatusMsg({
              tipo: 'sucesso',
              texto: `Condição clínica "${casoSalvo.nome}" salva e sincronizada com sucesso!`
            });
            setTimeout(() => setStatusMsg(null), 4000);
          }}
        />

        {/* Rodapé do Modal */}
        <div className="p-4 sm:p-5 border-t border-stone-200/90 dark:border-slate-800 bg-stone-50 dark:bg-slate-950 flex items-center justify-between text-xs text-stone-500 dark:text-slate-400">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Armazenamento no Firebase Storage & Firestore com cache local ultra-resiliente.</span>
          </div>

          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white font-semibold transition-colors shadow-xs"
          >
            Concluir
          </button>
        </div>
      </div>
    </div>
  );
};
