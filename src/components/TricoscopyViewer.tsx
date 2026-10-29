import React, { useState } from 'react';
import { ImagemReferencia } from '../types/tricoscopia';
import { useCaseImage } from '../hooks/useCaseImage';
import { 
  ZoomIn, 
  ZoomOut, 
  Maximize2, 
  Camera, 
  ShieldCheck, 
  Trash2, 
  Upload, 
  CheckCircle2,
  RefreshCw,
  X,
  ChevronLeft,
  ChevronRight,
  Plus
} from 'lucide-react';

interface TricoscopyViewerProps {
  imagem: ImagemReferencia;
  nomeCondicao: string;
  casoId?: string;
  isHero?: boolean;
  className?: string;
  onSelectFinding?: (findingId: string) => void;
}

export const TricoscopyViewer: React.FC<TricoscopyViewerProps> = ({
  imagem,
  nomeCondicao,
  casoId,
  isHero = false,
  className = ''
}) => {
  const targetCasoId = casoId || imagem.casoId || imagem.id;
  const { 
    imageUrl, 
    imagens,
    indiceAtivo,
    setIndiceAtivo,
    totalImagens,
    adicionarArquivo,
    adicionarMultiplosArquivos,
    salvarArquivo, 
    removerFotoAtual,
    remover, 
    carregando 
  } = useCaseImage(targetCasoId, imagem.url);

  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [isUploading, setIsUploading] = useState<boolean>(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      try {
        setIsUploading(true);
        if (e.target.files.length === 1 && totalImagens === 0) {
          await salvarArquivo(e.target.files[0]);
        } else {
          await adicionarMultiplosArquivos(e.target.files);
        }
      } catch (err) {
        console.warn('Aviso ao processar arquivo:', err);
      } finally {
        setIsUploading(false);
        e.target.value = '';
      }
    }
  };

  const handleSubstituirFoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      try {
        setIsUploading(true);
        await salvarArquivo(e.target.files[0]);
      } catch (err) {
        console.warn('Aviso ao substituir arquivo:', err);
      } finally {
        setIsUploading(false);
        e.target.value = '';
      }
    }
  };

  const handleRemoverFoto = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (totalImagens > 1) {
      if (window.confirm(`Deseja remover a foto ${indiceAtivo + 1} de ${totalImagens} da condição "${nomeCondicao}"? As outras fotos serão mantidas.`)) {
        await removerFotoAtual();
      }
    } else {
      if (window.confirm(`Deseja remover a foto anexada para "${nomeCondicao}"?`)) {
        await remover();
      }
    }
  };

  const irParaAnterior = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (totalImagens > 1) {
      setIndiceAtivo(indiceAtivo > 0 ? indiceAtivo - 1 : totalImagens - 1);
    }
  };

  const irParaProxima = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (totalImagens > 1) {
      setIndiceAtivo(indiceAtivo < totalImagens - 1 ? indiceAtivo + 1 : 0);
    }
  };

  return (
    <div className={`relative overflow-hidden rounded-xl border border-stone-200/90 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-xs ${className}`}>
      {/* Moldura da Lente Tricoscópica */}
      <div 
        className="relative w-full aspect-[4/3] sm:aspect-[16/10] overflow-hidden flex flex-col items-center justify-center bg-radial from-stone-900 via-stone-950 to-black text-white group"
        style={{
          boxShadow: 'inset 0 0 40px rgba(0,0,0,0.85)'
        }}
      >
        {imageUrl && imageUrl.trim() !== '' ? (
          /* Quando a imagem real está carregada */
          <div className="relative w-full h-full">
            <img 
              src={imageUrl} 
              alt={`Tricoscopia de ${nomeCondicao} (${indiceAtivo + 1}/${totalImagens})`} 
              className="w-full h-full object-cover transition-transform duration-300 select-none cursor-pointer"
              style={{ transform: `scale(${zoomLevel})` }}
              onClick={() => setIsFullscreen(true)}
            />

            {/* Badges superiores sobre a imagem real */}
            <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between z-10 pointer-events-none">
              {/* Contador de fotos (quando há mais de uma) */}
              {totalImagens > 1 ? (
                <div className="flex items-center gap-1.5 text-[11px] font-mono font-semibold text-rose-300 px-2.5 py-0.5 rounded-full bg-black/80 backdrop-blur-md border border-rose-500/40 shadow-xs pointer-events-auto">
                  <Camera className="w-3 h-3 text-rose-400" />
                  <span>Foto {indiceAtivo + 1} de {totalImagens}</span>
                </div>
              ) : (
                <div />
              )}

              <div className="flex items-center gap-1 text-[11px] font-mono text-stone-200 px-2.5 py-0.5 rounded-md bg-black/75 backdrop-blur-md border border-stone-700/60">
                <ShieldCheck className="w-3 h-3 text-rose-400" />
                <span>Padrão Clínico</span>
              </div>
            </div>

            {/* Botões de navegação lateral (Anterior / Próxima) se houver múltiplas fotos */}
            {totalImagens > 1 && (
              <>
                <button
                  onClick={irParaAnterior}
                  className="absolute left-2 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-black/70 hover:bg-black/90 text-white flex items-center justify-center border border-white/20 transition-all opacity-80 hover:opacity-100 hover:scale-105 shadow-md"
                  title="Foto anterior"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={irParaProxima}
                  className="absolute right-2 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-black/70 hover:bg-black/90 text-white flex items-center justify-center border border-white/20 transition-all opacity-80 hover:opacity-100 hover:scale-105 shadow-md"
                  title="Próxima foto"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </>
            )}

            {/* Marcadores de fotos (pontinhos) na base da imagem */}
            {totalImagens > 1 && (
              <div className="absolute bottom-2.5 left-2.5 flex items-center gap-1 z-20 bg-black/60 backdrop-blur-xs px-2 py-1 rounded-full border border-white/10">
                {imagens.map((_, i) => (
                  <button
                    key={i}
                    onClick={(e) => { e.stopPropagation(); setIndiceAtivo(i); }}
                    className={`w-2 h-2 rounded-full transition-all ${
                      i === indiceAtivo 
                        ? 'bg-rose-500 w-4 shadow-xs' 
                        : 'bg-white/40 hover:bg-white/80'
                    }`}
                    title={`Ver foto ${i + 1}`}
                  />
                ))}
              </div>
            )}

            {/* Ações de adicionar/troca/remoção no hover */}
            <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5 z-20 opacity-0 group-hover:opacity-100 transition-opacity">
              {/* Botão Adicionar Mais Uma Foto */}
              <label 
                className="cursor-pointer p-1.5 rounded-md bg-rose-950/80 hover:bg-rose-900 text-rose-200 hover:text-white border border-rose-700/70 transition-colors shadow-xs"
                title="Adicionar mais uma foto a este caso"
              >
                <Plus className="w-3.5 h-3.5" />
                <input 
                  type="file" 
                  accept="image/*" 
                  multiple
                  className="hidden" 
                  onChange={handleFileUpload}
                  disabled={isUploading}
                />
              </label>

              {/* Botão Substituir Foto Atual */}
              <label 
                className="cursor-pointer p-1.5 rounded-md bg-black/80 hover:bg-stone-800 text-stone-300 hover:text-white border border-stone-700 transition-colors shadow-xs"
                title="Substituir foto atual"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <input 
                  type="file" 
                  accept="image/*" 
                  className="hidden" 
                  onChange={handleSubstituirFoto}
                  disabled={isUploading}
                />
              </label>

              {/* Botão Remover Foto */}
              <button
                onClick={handleRemoverFoto}
                className="p-1.5 rounded-md bg-rose-950/80 hover:bg-rose-900 text-rose-300 hover:text-rose-100 border border-rose-700/60 transition-colors shadow-xs"
                title={totalImagens > 1 ? `Remover foto ${indiceAtivo + 1} de ${totalImagens}` : 'Remover foto anexada'}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ) : (
          /* Visualizador e identificador da lâmina clínica de referência */
          <div className="relative w-full h-full flex flex-col items-center justify-between p-4 sm:p-5 text-center select-none bg-gradient-to-b from-stone-900/90 via-stone-950 to-black">
            {/* Linhas de calibração / retículo óptico do dermatoscópio */}
            <div className="absolute inset-0 pointer-events-none opacity-20">
              <div className="absolute inset-x-0 top-1/2 -translate-y-px h-[1px] bg-rose-400/40" />
              <div className="absolute inset-y-0 left-1/2 -translate-x-px w-[1px] bg-rose-400/40" />
              <div className="absolute inset-0 m-auto w-44 h-44 rounded-full border border-rose-400/30 border-dashed" />
              <div className="absolute inset-0 m-auto w-64 h-64 rounded-full border border-rose-400/20" />
            </div>

            {/* Cabeçalho da lente */}
            <div className="w-full flex items-center justify-end z-10">
              <div className="flex items-center gap-1 text-[11px] font-mono text-stone-300 px-2 py-0.5 rounded-md bg-black/60 border border-stone-800">
                <ShieldCheck className="w-3 h-3 text-rose-400" />
                <span>Padrão de Referência</span>
              </div>
            </div>

            {/* Bloco central de identificação da imagem original do PDF */}
            <div className="z-10 max-w-md px-4 py-2.5 rounded-xl bg-black/75 backdrop-blur-sm border border-stone-800 shadow-xl space-y-1">
              <p className="text-[10px] font-mono uppercase tracking-widest text-rose-400 font-semibold">
                Lâmina Tricoscópica Oficial
              </p>
              <h4 className="text-sm sm:text-base font-semibold text-stone-100 leading-snug">
                {nomeCondicao}
              </h4>
              <p className="text-xs text-stone-300 italic line-clamp-2">
                "{imagem.legenda}"
              </p>
            </div>

            {/* Rodapé da imagem: contexto no material + botão de anexar */}
            <div className="w-full flex items-center justify-between z-10 text-[11px] text-stone-300 gap-2">
              <span className="bg-black/60 px-2.5 py-1 rounded-md border border-stone-800 truncate max-w-[200px]">
                {imagem.contexto}
              </span>
              
              <label className="cursor-pointer flex items-center gap-1.5 text-xs font-semibold text-rose-200 hover:text-white bg-rose-950/80 hover:bg-rose-900 px-3 py-1.5 rounded-lg border border-rose-700/60 transition-all shadow-xs">
                <Camera className="w-3.5 h-3.5 text-rose-300" />
                <span>{isUploading ? 'Salvando...' : 'Anexar imagens'}</span>
                <input 
                  type="file" 
                  accept="image/*" 
                  multiple
                  className="hidden" 
                  onChange={handleFileUpload}
                  disabled={isUploading}
                />
              </label>
            </div>
          </div>
        )}

        {/* Controles de Zoom para a Profissional em Consulta */}
        {(isHero || imageUrl) && (
          <div className="absolute bottom-3 right-3 flex items-center gap-1 bg-black/80 backdrop-blur-md p-1 rounded-lg border border-stone-700/80 z-20 shadow-xs">
            <button
              onClick={(e) => { e.stopPropagation(); setZoomLevel(prev => Math.max(1, prev - 0.25)); }}
              className="p-1.5 text-stone-300 hover:text-white rounded hover:bg-stone-800 transition-colors"
              title="Reduzir ampliação"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <span className="text-[11px] font-mono text-stone-300 px-1.5 min-w-[36px] text-center">
              {Math.round(zoomLevel * 100)}%
            </span>
            <button
              onClick={(e) => { e.stopPropagation(); setZoomLevel(prev => Math.min(3, prev + 0.25)); }}
              className="p-1.5 text-stone-300 hover:text-white rounded hover:bg-stone-800 transition-colors"
              title="Aumentar ampliação"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); setIsFullscreen(!isFullscreen); }}
              className="p-1.5 text-stone-300 hover:text-white rounded hover:bg-stone-800 transition-colors border-l border-stone-700 ml-1"
              title="Tela cheia"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Modal Tela Cheia para visualização detalhada */}
      {isFullscreen && imageUrl && imageUrl.trim() !== '' && (
        <div 
          className="fixed inset-0 z-50 bg-black/95 flex flex-col items-center justify-center p-4"
          onClick={() => setIsFullscreen(false)}
        >
          <div className="absolute top-4 right-4 flex items-center gap-2">
            <button
              onClick={() => setIsFullscreen(false)}
              className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Navegação em tela cheia se houver mais de uma foto */}
          {totalImagens > 1 && (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); irParaAnterior(e); }}
                className="absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
                title="Foto anterior"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); irParaProxima(e); }}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
                title="Próxima foto"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            </>
          )}

          <img 
            src={imageUrl} 
            alt={nomeCondicao} 
            className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl"
          />

          <div className="flex flex-col items-center mt-3 text-center">
            <p className="text-sm text-stone-200 font-medium">
              {nomeCondicao} • Padrão Clínico {totalImagens > 1 ? `(${indiceAtivo + 1} de ${totalImagens})` : ''}
            </p>
            {totalImagens > 1 && (
              <div className="flex items-center gap-1.5 mt-2">
                {imagens.map((_, i) => (
                  <button
                    key={i}
                    onClick={(e) => { e.stopPropagation(); setIndiceAtivo(i); }}
                    className={`w-2.5 h-2.5 rounded-full transition-all ${
                      i === indiceAtivo ? 'bg-rose-500 w-5' : 'bg-white/40 hover:bg-white/80'
                    }`}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
