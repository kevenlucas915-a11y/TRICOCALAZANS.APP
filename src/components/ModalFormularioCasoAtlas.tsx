import React, { useState, useEffect } from 'react';
import { CasoAtlas, CategoriaClinica } from '../types/tricoscopia';
import { salvarCasoAtlas, DadosCasoAtlasFormulario } from '../services/casosAtlasService';
import { salvarImagemCaso, adicionarImagemCaso } from '../utils/imageStore';
import { 
  X, 
  Save, 
  Plus, 
  Image as ImageIcon, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle,
  FileText,
  Microscope,
  Stethoscope,
  Trash2
} from 'lucide-react';

interface ModalFormularioCasoAtlasProps {
  isOpen: boolean;
  onClose: () => void;
  casoParaEditar?: CasoAtlas | null;
  onSalvo: (caso: CasoAtlas) => void;
}

const CATEGORIAS_VALIDAS: CategoriaClinica[] = [
  'Não Cicatricial',
  'Cicatricial',
  'Dermatose Descamativa',
  'Infecciosa',
  'Parasitária'
];

export const ModalFormularioCasoAtlas: React.FC<ModalFormularioCasoAtlasProps> = ({
  isOpen,
  onClose,
  casoParaEditar,
  onSalvo
}) => {
  const isEdicao = Boolean(casoParaEditar);

  const [nome, setNome] = useState('');
  const [categoria, setCategoria] = useState<CategoriaClinica>('Não Cicatricial');
  const [numeroOrdem, setNumeroOrdem] = useState<string>('');
  const [significadoClinico, setSignificadoClinico] = useState('');
  const [padrao, setPadrao] = useState('');
  const [localizacao, setLocalizacao] = useState('');
  const [oQueObservar, setOQueObservar] = useState('');
  const [caracteristicas, setCaracteristicas] = useState('');
  const [achadosTricoscopicos, setAchadosTricoscopicos] = useState('');
  const [comoReconhecer, setComoReconhecer] = useState('');
  const [resumoOriginal, setResumoOriginal] = useState('');
  const [aumentoPadrao, setAumentoPadrao] = useState<'50x' | '5x'>('50x');
  const [legendaImagem, setLegendaImagem] = useState('');

  // Fotos selecionadas no formulário para upload
  const [arquivosFotos, setArquivosFotos] = useState<File[]>([]);
  const [previewsFotos, setPreviewsFotos] = useState<string[]>([]);

  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (casoParaEditar) {
        setNome(casoParaEditar.nome || '');
        setCategoria(casoParaEditar.categoria || 'Não Cicatricial');
        setNumeroOrdem(casoParaEditar.numeroOrdem ? String(casoParaEditar.numeroOrdem) : '');
        setSignificadoClinico(casoParaEditar.significadoClinico || '');
        setPadrao(casoParaEditar.padrao || '');
        setLocalizacao(casoParaEditar.localizacao || '');
        setOQueObservar((casoParaEditar.oQueObservar || []).join('\n'));
        setCaracteristicas((casoParaEditar.caracteristicas || []).join('\n'));
        setAchadosTricoscopicos((casoParaEditar.achadosTricoscopicos || []).join('\n'));
        setComoReconhecer((casoParaEditar.comoReconhecer || []).join('\n'));
        setResumoOriginal(casoParaEditar.resumoOriginal || '');
        setAumentoPadrao(casoParaEditar.imagem?.aumento || '50x');
        setLegendaImagem(casoParaEditar.imagem?.legenda || '');
      } else {
        // Novo caso (valores iniciais limpos)
        setNome('');
        setCategoria('Não Cicatricial');
        setNumeroOrdem('');
        setSignificadoClinico('');
        setPadrao('');
        setLocalizacao('');
        setOQueObservar('');
        setCaracteristicas('');
        setAchadosTricoscopicos('');
        setComoReconhecer('');
        setResumoOriginal('');
        setAumentoPadrao('50x');
        setLegendaImagem('');
      }
      setArquivosFotos([]);
      setPreviewsFotos([]);
      setErro(null);
      setSalvando(false);
    }
  }, [isOpen, casoParaEditar]);

  if (!isOpen) return null;

  const handleSelecionarFotos = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const files = Array.from(e.target.files);
    setArquivosFotos(prev => [...prev, ...files]);

    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = () => {
        if (reader.result) {
          setPreviewsFotos(prev => [...prev, reader.result as string]);
        }
      };
      reader.readAsDataURL(file);
    });

    e.target.value = '';
  };

  const handleRemoverPreview = (index: number) => {
    setArquivosFotos(prev => prev.filter((_, i) => i !== index));
    setPreviewsFotos(prev => prev.filter((_, i) => i !== index));
  };

  const handleSalvar = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);

    const nomeFormatado = nome.trim();
    if (!nomeFormatado) {
      setErro('Por favor, informe o nome da condição clínica.');
      return;
    }

    setSalvando(true);
    try {
      const dados: DadosCasoAtlasFormulario = {
        id: casoParaEditar?.id,
        nome: nomeFormatado,
        categoria,
        numeroOrdem: numeroOrdem ? parseInt(numeroOrdem, 10) : undefined,
        significadoClinico: significadoClinico.trim(),
        padrao: padrao.trim(),
        localizacao: localizacao.trim(),
        oQueObservar,
        caracteristicas,
        achadosTricoscopicos,
        comoReconhecer,
        resumoOriginal: resumoOriginal.trim(),
        aumentoPadrao,
        legendaImagem: legendaImagem.trim()
      };

      const casoSalvo = await salvarCasoAtlas(dados);

      // Se houver fotos adicionadas durante o cadastro, salva no mesmo banco de dados do Atlas
      if (previewsFotos.length > 0) {
        for (let i = 0; i < previewsFotos.length; i++) {
          const dataUrl = previewsFotos[i];
          const file = arquivosFotos[i];
          const nomeArquivo = file ? file.name : `${casoSalvo.id}_foto_${i + 1}.jpg`;

          if (i === 0 && !isEdicao) {
            await salvarImagemCaso(casoSalvo.id, dataUrl, nomeArquivo);
          } else {
            await adicionarImagemCaso(casoSalvo.id, dataUrl, nomeArquivo);
          }
        }
      }

      onSalvo(casoSalvo);
      onClose();
    } catch (err: any) {
      setErro(err?.message || 'Erro ao salvar caso do Atlas.');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-70 bg-black/80 backdrop-blur-xs flex justify-center items-start p-3 sm:p-6 overflow-y-auto animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-800 rounded-3xl w-full max-w-3xl shadow-2xl overflow-hidden my-4 sm:my-8 flex flex-col">
        {/* Cabeçalho */}
        <div className="p-5 sm:p-6 border-b border-stone-200 dark:border-slate-800 flex items-center justify-between bg-stone-50 dark:bg-slate-950/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-teal-50 dark:bg-teal-950 border border-teal-200 dark:border-teal-800 flex items-center justify-center text-teal-700 dark:text-teal-300 shadow-xs">
              <Stethoscope className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-stone-900 dark:text-slate-100 flex items-center gap-2">
                <span>{isEdicao ? 'Editar Caso Clínico do Atlas' : 'Cadastrar Novo Caso no Atlas'}</span>
              </h3>
              <p className="text-xs text-stone-500 dark:text-slate-400">
                {isEdicao 
                  ? 'Atualize as informações clínicas e parâmetros de avaliação deste caso.'
                  : 'Insira uma nova condição clínica que fará parte do acervo oficial e comparador.'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            disabled={salvando}
            className="p-2 text-stone-400 hover:text-stone-700 hover:bg-stone-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mensagem de Erro */}
        {erro && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 dark:bg-rose-950/60 dark:border-rose-800 dark:text-rose-200 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{erro}</span>
          </div>
        )}

        {/* Formulário */}
        <form onSubmit={handleSalvar} className="p-5 sm:p-6 space-y-5 overflow-y-auto">
          {/* Seção 1: Identificação Básica */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
            <div className="sm:col-span-8">
              <label className="block text-xs font-semibold text-stone-700 dark:text-slate-300 mb-1">
                Nome da Condição Clínica <span className="text-rose-600">*</span>
              </label>
              <input
                type="text"
                required
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Ex.: Lúpus Eritematoso Cutâneo, Foliculite em Tufos..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs sm:text-sm text-stone-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-teal-500 shadow-xs"
              />
            </div>

            <div className="sm:col-span-4">
              <label className="block text-xs font-semibold text-stone-700 dark:text-slate-300 mb-1">
                Categoria Clínica <span className="text-rose-600">*</span>
              </label>
              <select
                value={categoria}
                onChange={(e) => setCategoria(e.target.value as CategoriaClinica)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs sm:text-sm text-stone-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-teal-500 shadow-xs"
              >
                {CATEGORIAS_VALIDAS.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
            <div className="sm:col-span-4">
              <label className="block text-xs font-semibold text-stone-700 dark:text-slate-300 mb-1">
                Número de Ordem (Opcional)
              </label>
              <input
                type="number"
                min="1"
                max="999"
                value={numeroOrdem}
                onChange={(e) => setNumeroOrdem(e.target.value)}
                placeholder="Ex.: 18"
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs sm:text-sm text-stone-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-teal-500 shadow-xs"
              />
            </div>

            <div className="sm:col-span-4">
              <label className="block text-xs font-semibold text-stone-700 dark:text-slate-300 mb-1">
                Aumento Padrão da Lâmina
              </label>
              <select
                value={aumentoPadrao}
                onChange={(e) => setAumentoPadrao(e.target.value as '50x' | '5x')}
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs sm:text-sm text-stone-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-teal-500 shadow-xs"
              >
                <option value="50x">50x (Dermatoscopia Aumentada)</option>
                <option value="5x">5x (Visão Panorâmica)</option>
              </select>
            </div>

            <div className="sm:col-span-4">
              <label className="block text-xs font-semibold text-stone-700 dark:text-slate-300 mb-1">
                Localização Típica
              </label>
              <input
                type="text"
                value={localizacao}
                onChange={(e) => setLocalizacao(e.target.value)}
                placeholder="Ex.: Vértice, frontoparietal, nuca..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs sm:text-sm text-stone-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-teal-500 shadow-xs"
              />
            </div>
          </div>

          {/* Seção 2: Padrão e Significado Clínico */}
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-stone-700 dark:text-slate-300 mb-1">
                Padrão Tricoscópico Dominante
              </label>
              <input
                type="text"
                value={padrao}
                onChange={(e) => setPadrao(e.target.value)}
                placeholder="Ex.: Eritema perifolicular e hiperceratose tubular..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs sm:text-sm text-stone-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-teal-500 shadow-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 dark:text-slate-300 mb-1">
                Significado Clínico & Fisiopatologia
              </label>
              <textarea
                rows={3}
                value={significadoClinico}
                onChange={(e) => setSignificadoClinico(e.target.value)}
                placeholder="Explique a correlação clínica, relevância diagnóstica, prognóstico ou comportamento da condição..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs sm:text-sm text-stone-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-teal-500 shadow-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 dark:text-slate-300 mb-1">
                Legenda da Imagem de Referência
              </label>
              <input
                type="text"
                value={legendaImagem}
                onChange={(e) => setLegendaImagem(e.target.value)}
                placeholder="Ex.: Visão dermatoscópica 50x com imersão demonstrando..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs sm:text-sm text-stone-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-teal-500 shadow-xs"
              />
            </div>
          </div>

          {/* Seção 3: Listas Clínicas (1 item por linha) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-stone-700 dark:text-slate-300 mb-1 flex items-center justify-between">
                <span>O Que Observar (1 item por linha)</span>
                <span className="text-[10px] text-stone-400 font-normal">Checklist da lâmina</span>
              </label>
              <textarea
                rows={4}
                value={oQueObservar}
                onChange={(e) => setOQueObservar(e.target.value)}
                placeholder={'Presença de descamação perifolicular\nAusência de óstios foliculares\nMiniaturização folicular'}
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs font-mono text-stone-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-teal-500 shadow-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 dark:text-slate-300 mb-1 flex items-center justify-between">
                <span>Achados Tricoscópicos (1 item por linha)</span>
                <span className="text-[10px] text-stone-400 font-normal">Sinais dermatoscópicos</span>
              </label>
              <textarea
                rows={4}
                value={achadosTricoscopicos}
                onChange={(e) => setAchadosTricoscopicos(e.target.value)}
                placeholder={'Pontos brancos fibróticos\nFios quebrados / black dots\nHiperceratose perifolicular'}
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs font-mono text-stone-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-teal-500 shadow-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 dark:text-slate-300 mb-1 flex items-center justify-between">
                <span>Características Clínicas (1 item por linha)</span>
                <span className="text-[10px] text-stone-400 font-normal">Sinais e sintomas</span>
              </label>
              <textarea
                rows={4}
                value={caracteristicas}
                onChange={(e) => setCaracteristicas(e.target.value)}
                placeholder={'Queda capilar cicatricial progressiva\nPrurido ou queimação no couro cabeludo\nMais frequente em mulheres na pós-menopausa'}
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs font-mono text-stone-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-teal-500 shadow-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 dark:text-slate-300 mb-1 flex items-center justify-between">
                <span>Como Reconhecer / Critérios (1 por linha)</span>
                <span className="text-[10px] text-stone-400 font-normal">Dicas práticas</span>
              </label>
              <textarea
                rows={4}
                value={comoReconhecer}
                onChange={(e) => setComoReconhecer(e.target.value)}
                placeholder={'Recuo simétrico da linha de implantação\nPerda das sobrancelhas concomitante\nBiópsia confirmatória se necessário'}
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs font-mono text-stone-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-teal-500 shadow-xs"
              />
            </div>
          </div>

          {/* Seção 4: Upload de Fotos do Caso */}
          <div className="p-4 rounded-2xl bg-stone-50 dark:bg-slate-950/60 border border-stone-200 dark:border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-stone-900 dark:text-slate-100 flex items-center gap-1.5">
                  <ImageIcon className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                  <span>Anexar Fotos ao Caso</span>
                </h4>
                <p className="text-[11px] text-stone-500 dark:text-slate-400">
                  As imagens serão gravadas no mesmo banco de dados do Atlas (Firebase Storage & Firestore).
                </p>
              </div>

              <label className="cursor-pointer px-3 py-1.5 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-800 dark:bg-teal-950 dark:hover:bg-teal-900 dark:text-teal-200 border border-teal-200 dark:border-teal-800 text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors">
                <Plus className="w-3.5 h-3.5" />
                <span>Selecionar fotos</span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={handleSelecionarFotos}
                />
              </label>
            </div>

            {previewsFotos.length > 0 && (
              <div className="flex items-center gap-3 overflow-x-auto py-2">
                {previewsFotos.map((preview, idx) => (
                  <div key={idx} className="relative w-20 h-20 rounded-xl overflow-hidden border border-stone-200 dark:border-slate-800 shrink-0 shadow-xs">
                    <img src={preview} alt={`Nova foto ${idx + 1}`} className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => handleRemoverPreview(idx)}
                      className="absolute top-1 right-1 p-1 rounded-md bg-black/80 hover:bg-rose-700 text-white transition-colors"
                      title="Remover foto selecionada"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                    <span className="absolute bottom-1 left-1 px-1 py-0.2 rounded bg-black/75 text-[9px] font-mono text-white font-bold">
                      {idx + 1}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Botões do Rodapé do Formulário */}
          <div className="pt-3 border-t border-stone-200 dark:border-slate-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={salvando}
              className="px-4 py-2.5 rounded-xl border border-stone-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-stone-700 dark:text-slate-200 hover:bg-stone-50 dark:hover:bg-slate-700 transition-colors"
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={salvando}
              className="px-5 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold flex items-center gap-2 shadow-md shadow-teal-700/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="w-4 h-4" />
              <span>{salvando ? 'Salvando e Sincronizando...' : (isEdicao ? 'Salvar Alterações' : 'Cadastrar Caso')}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
