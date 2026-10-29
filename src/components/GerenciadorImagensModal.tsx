import React, { useState, useEffect } from 'react';
import { CASOS_ATLAS } from '../data/tricoscopiaData';
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
  Upload, 
  Image as ImageIcon, 
  CheckCircle2, 
  Trash2, 
  Download, 
  FileUp, 
  Info, 
  HelpCircle,
  FolderOpen,
  Camera,
  ExternalLink,
  ChevronRight,
  Sparkles,
  RefreshCw,
  Cloud,
  Plus,
  Eye
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
  const [galerias, setGalerias] = useState<Record<string, ImagemArmazenada[]>>({});
  const [carregando, setCarregando] = useState(true);
  const [abaAjuda, setAbaAjuda] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ tipo: 'sucesso' | 'erro' | 'info'; texto: string } | null>(null);
  const [fotoPreview, setFotoPreview] = useState<{ url: string; titulo: string } | null>(null);

  const recarregarImagens = async () => {
    try {
      await recuperarImagensLegadas().catch(() => {});
      const mapa = await obterTodasImagensGaleria();
      setGalerias(mapa);
    } catch (e) {
      console.error(e);
    } finally {
      setCarregando(false);
    }
  };

  const handleSincronizar = async () => {
    setCarregando(true);
    try {
      await sincronizarComFirebase();
      await recuperarImagensLegadas();
      const mapa = await obterTodasImagensGaleria();
      setGalerias(mapa);
      const totalCasos = Object.keys(mapa).filter(k => mapa[k] && mapa[k].length > 0).length;
      const totalFotos = Object.values(mapa).reduce((acc, arr) => acc + (arr?.length || 0), 0);
      setStatusMsg({
        tipo: 'sucesso',
        texto: `Sincronização concluída! ${totalFotos} foto(s) ativas em ${totalCasos} condições salvas no Firebase.`
      });
      setTimeout(() => setStatusMsg(null), 4000);
    } catch {
      setStatusMsg({ tipo: 'erro', texto: 'Erro ao sincronizar fotos com a nuvem.' });
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
      recarregarImagens();
    }
  }, [isOpen, onClose]);

  if (!isOpen || !ehAdmin) return null;

  const casosOrdenados = [...CASOS_ATLAS].sort((a, b) => {
    if (a.numeroOrdem && b.numeroOrdem) return a.numeroOrdem - b.numeroOrdem;
    if (a.numeroOrdem) return -1;
    if (b.numeroOrdem) return 1;
    return a.fontePagina - b.fontePagina;
  });

  const totalCasosComImagem = casosOrdenados.filter(c => {
    const list = galerias[c.id] || galerias[normalizarParaCasoOficial(c.id)];
    return list && list.length > 0;
  }).length;

  const totalFotosNoAcervo = Object.values(galerias).reduce((acc, arr) => acc + (arr?.length || 0), 0);
  const percentual = Math.round((totalCasosComImagem / CASOS_ATLAS.length) * 100);

  const handleUploadFotos = async (casoId: string, files: FileList | null) => {
    if (!files || files.length === 0) return;
    try {
      setCarregando(true);
      const arrayFiles = Array.from(files);
      for (const file of arrayFiles) {
        const dataUrl = await arquivoParaDataURL(file);
        await adicionarImagemCaso(casoId, dataUrl, file.name, file.size);
      }
      await recarregarImagens();
      setStatusMsg({ 
        tipo: 'sucesso', 
        texto: `${arrayFiles.length} foto(s) adicionada(s) com sucesso ao caso!` 
      });
      setTimeout(() => setStatusMsg(null), 3500);
    } catch (err: any) {
      setStatusMsg({ tipo: 'erro', texto: err?.message || 'Erro ao processar as fotos.' });
    } finally {
      setCarregando(false);
    }
  };

  const handleRemoverFotoEspecifica = async (casoId: string, idOuDataUrl: string, nomeCaso: string, index: number) => {
    if (window.confirm(`Deseja remover a foto ${index + 1} de "${nomeCaso}"?`)) {
      try {
        await removerImagemEspecifica(casoId, idOuDataUrl);
        await recarregarImagens();
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
        await recarregarImagens();
        setStatusMsg({ tipo: 'info', texto: `Todas as fotos foram removidas de "${nomeCaso}".` });
        setTimeout(() => setStatusMsg(null), 3000);
      } catch (err: any) {
        setStatusMsg({ tipo: 'erro', texto: err?.message || 'Erro ao remover fotos.' });
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
        await recarregarImagens();
        setStatusMsg({ tipo: 'sucesso', texto: `${total} foto(s) restauradas com sucesso!` });
        setTimeout(() => setStatusMsg(null), 4000);
      } catch (err: any) {
        setStatusMsg({ tipo: 'erro', texto: err?.message || 'Arquivo de backup inválido.' });
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 flex justify-center items-start p-2.5 sm:p-6 overflow-y-auto animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 border border-stone-200/90 dark:border-slate-800 rounded-3xl w-full max-w-5xl shadow-2xl overflow-hidden my-4 sm:my-8 flex flex-col">
        {/* Header do Modal */}
        <div className="p-5 sm:p-6 border-b border-stone-200/90 dark:border-slate-800 flex items-center justify-between bg-stone-50/70 dark:bg-slate-950/70">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-rose-50 dark:bg-rose-950 border border-rose-200/80 dark:border-rose-800/60 flex items-center justify-center text-rose-700 dark:text-rose-300 shadow-xs">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-stone-900 dark:text-slate-100 flex flex-wrap items-center gap-2">
                <span>Gerenciador de Imagens do Atlas</span>
                <span className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-rose-50 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border border-rose-200/80 dark:border-rose-800 font-semibold">
                  {totalFotosNoAcervo} fotos • {totalCasosComImagem}/{CASOS_ATLAS.length} condições
                </span>
                <span className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800 font-semibold flex items-center gap-1">
                  <Cloud className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>Nuvem Firebase Ativa</span>
                </span>
              </h2>
              <p className="text-xs text-stone-500 dark:text-slate-400 mt-0.5">
                Vincule múltiplas fotos tricoscópicas a cada condição (visão 50x, 5x, imersão, etc.).
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setAbaAjuda(!abaAjuda)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold border flex items-center gap-1.5 transition-colors shadow-xs ${
                abaAjuda 
                  ? 'bg-rose-50 text-rose-800 border-rose-300 dark:bg-slate-800 dark:text-rose-300' 
                  : 'bg-white text-stone-700 hover:text-stone-900 hover:bg-stone-100 dark:bg-slate-800 dark:text-slate-300 border-stone-200 dark:border-slate-700'
              }`}
            >
              <HelpCircle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
              <span>Como adicionar imagens?</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-stone-400 hover:text-stone-700 hover:bg-stone-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Aviso de Permissão para Usuários Não-Administradores */}
        {!ehAdmin && (
          <div className="px-5 py-3 bg-amber-50 dark:bg-amber-950/60 border-b border-amber-200 dark:border-amber-800/80 text-amber-900 dark:text-amber-200 text-xs flex items-center gap-2.5 font-medium leading-relaxed">
            <Info className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
            <span>As imagens do Atlas são compartilhadas por todos os profissionais. Somente administradores podem adicionar ou remover fotos; você pode visualizar e exportar.</span>
          </div>
        )}

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

        {/* Barra de Progresso e Ações em Lote */}
        <div className="bg-stone-50/50 dark:bg-slate-950/40 p-4 sm:p-5 border-b border-stone-200/90 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          {/* Progresso do Acervo */}
          <div className="flex-1 max-w-md">
            <div className="flex justify-between items-center text-xs mb-1.5">
              <span className="text-stone-700 dark:text-slate-300 font-semibold">Cobertura das 17 Condições</span>
              <span className="font-mono text-rose-700 dark:text-rose-400 font-bold">{percentual}% ({totalCasosComImagem}/17)</span>
            </div>
            <div className="w-full h-2.5 bg-stone-200 dark:bg-slate-800 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-rose-500 to-rose-700 dark:from-rose-500 dark:to-rose-400 transition-all duration-300"
                style={{ width: `${percentual}%` }}
              />
            </div>
          </div>

          {/* Backup e Restauração */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleSincronizar}
              className="px-3.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-100/80 dark:bg-slate-800 text-xs font-semibold text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-slate-700 flex items-center gap-1.5 transition-colors shadow-xs"
              title="Sincroniza todas as fotos com o Firebase Firestore na nuvem"
            >
              <RefreshCw className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
              <span>Sincronizar com a Nuvem</span>
            </button>

            <button
              onClick={handleExportar}
              disabled={totalFotosNoAcervo === 0}
              className="px-3.5 py-2 rounded-xl bg-white hover:bg-stone-100 dark:bg-slate-800 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed text-xs font-semibold text-stone-700 dark:text-slate-200 border border-stone-200 dark:border-slate-700 flex items-center gap-1.5 transition-colors shadow-xs"
              title="Salva um arquivo JSON com todas as fotos anexadas"
            >
              <Download className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
              <span>Exportar Backup ({totalFotosNoAcervo})</span>
            </button>

            <label className="cursor-pointer px-3.5 py-2 rounded-xl bg-white hover:bg-stone-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-semibold text-stone-700 dark:text-slate-200 border border-stone-200 dark:border-slate-700 flex items-center gap-1.5 transition-colors shadow-xs">
              <FileUp className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Restaurar Backup</span>
              <input 
                type="file" 
                accept=".json" 
                className="hidden" 
                onChange={handleImportar}
              />
            </label>
          </div>
        </div>

        {/* Aba de Instruções e Ajuda */}
        {abaAjuda && (
          <div className="p-5 bg-rose-50/50 dark:bg-slate-950/60 border-b border-rose-100 dark:border-slate-800 text-xs space-y-3">
            <h3 className="font-bold text-rose-900 dark:text-rose-300 text-sm flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-rose-600 dark:text-rose-400" />
              <span>Como adicionar múltiplas fotos ao Atlas:</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-stone-700 dark:text-slate-300">
              <div className="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-rose-100 dark:border-slate-800 space-y-1.5 shadow-xs">
                <span className="font-bold text-stone-900 dark:text-slate-100 flex items-center gap-1.5">
                  <span className="w-4 h-4 rounded-full bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 flex items-center justify-center text-[10px] font-bold">1</span>
                  Múltiplas Lâminas por Caso
                </span>
                <p className="text-[11px] text-stone-500 dark:text-slate-400 leading-relaxed">
                  Agora você pode anexar várias fotos à mesma condição: dermatoscopia seca, com imersão, luz polarizada, ampliação 50x e visão panorâmica.
                </p>
              </div>

              <div className="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-rose-100 dark:border-slate-800 space-y-1.5 shadow-xs">
                <span className="font-bold text-stone-900 dark:text-slate-100 flex items-center gap-1.5">
                  <span className="w-4 h-4 rounded-full bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 flex items-center justify-center text-[10px] font-bold">2</span>
                  Upload Individual ou em Lote
                </span>
                <p className="text-[11px] text-stone-500 dark:text-slate-400 leading-relaxed">
                  Clique no botão <strong className="text-rose-700 dark:text-rose-400">"+ Adicionar Fotos"</strong> e selecione um ou mais arquivos. As fotos são integradas em carrossel em todo o app.
                </p>
              </div>

              <div className="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-rose-100 dark:border-slate-800 space-y-1.5 shadow-xs">
                <span className="font-bold text-stone-900 dark:text-slate-100 flex items-center gap-1.5">
                  <span className="w-4 h-4 rounded-full bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 flex items-center justify-center text-[10px] font-bold">3</span>
                  Exclusão Específica
                </span>
                <p className="text-[11px] text-stone-500 dark:text-slate-400 leading-relaxed">
                  Você pode remover uma foto específica passando o mouse sobre ela e clicando no "x", sem apagar as outras imagens da mesma condição.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Lista dos Casos do Material */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {casosOrdenados.map((caso) => {
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
                          <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-full bg-rose-50 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                            #{caso.numeroOrdem.toString().padStart(2, '0')}
                          </span>
                        )}
                        <span className="text-[10px] font-mono uppercase text-stone-400 dark:text-slate-500 truncate">
                          {caso.categoria}
                        </span>
                      </div>

                      <h4 
                        onClick={() => { onClose(); onAbrirCaso(caso.id); }}
                        className="text-xs sm:text-sm font-bold text-stone-900 dark:text-slate-100 hover:text-rose-700 dark:hover:text-rose-300 cursor-pointer truncate transition-colors mt-0.5"
                        title={caso.nome}
                      >
                        {caso.nome}
                      </h4>

                      <p className="text-[11px] text-stone-500 dark:text-slate-400 italic line-clamp-1 mt-0.5">
                        "{caso.imagem.legenda}"
                      </p>
                    </div>

                    {/* Badge de status */}
                    <div className="shrink-0">
                      {temFotos ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 font-semibold">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>{totalFotosCaso} {totalFotosCaso === 1 ? 'foto' : 'fotos'}</span>
                        </span>
                      ) : (
                        <span className="text-[10px] font-mono text-amber-700 dark:text-amber-400 font-medium px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800">
                          Sem fotos
                        </span>
                      )}
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
                          {/* Número da miniatura */}
                          <span className="absolute bottom-1 left-1 px-1 py-0.2 rounded bg-black/75 text-[9px] font-mono text-white font-bold">
                            {idx + 1}
                          </span>

                          {/* Botão de excluir foto específica no hover */}
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

                  {/* Ações do Card */}
                  <div className="flex items-center justify-between gap-2 pt-1 border-t border-stone-100 dark:border-slate-800/60">
                    <label className="cursor-pointer px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 border transition-all shadow-xs bg-rose-700 hover:bg-rose-800 text-white border-rose-700">
                      <Plus className="w-3.5 h-3.5" />
                      <span>{temFotos ? 'Adicionar mais fotos' : 'Adicionar fotos'}</span>
                      <input 
                        type="file" 
                        accept="image/*" 
                        multiple
                        className="hidden" 
                        onChange={(e) => handleUploadFotos(caso.id, e.target.files)}
                      />
                    </label>

                    {temFotos && (
                      <button
                        onClick={() => handleRemoverTodas(caso.id, caso.nome)}
                        className="px-2.5 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 dark:bg-rose-950 dark:hover:bg-rose-900 dark:text-rose-300 border border-rose-200 dark:border-rose-800 text-xs font-semibold flex items-center gap-1 transition-colors"
                        title="Remover todas as fotos deste caso"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Limpar todas</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
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

        {/* Rodapé do Modal */}
        <div className="p-4 sm:p-5 border-t border-stone-200/90 dark:border-slate-800 bg-stone-50 dark:bg-slate-950 flex items-center justify-between text-xs text-stone-500 dark:text-slate-400">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Armazenamento em nuvem permanente e cache local ultra-resiliente.</span>
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
