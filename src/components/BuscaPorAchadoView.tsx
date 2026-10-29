import React, { useState, useMemo } from 'react';
import { ACHADOS_TRICOSCOPICOS, CASOS_ATLAS } from '../data/tricoscopiaData';
import { AchadoTricoscopico, CasoAtlas } from '../types/tricoscopia';
import { TricoscopyViewer } from './TricoscopyViewer';
import { Search, CheckSquare, Square, AlertCircle, ArrowRight, X, Sparkles, Microscope } from 'lucide-react';

interface BuscaPorAchadoViewProps {
  onSelecionarCaso: (casoId: string) => void;
  achadoInicialId?: string | null;
}

export const BuscaPorAchadoView: React.FC<BuscaPorAchadoViewProps> = ({
  onSelecionarCaso,
  achadoInicialId
}) => {
  const [achadosSelecionadosIds, setAchadosSelecionadosIds] = useState<string[]>(() => {
    return achadoInicialId ? [achadoInicialId] : [];
  });
  const [filtroTexto, setFiltroTexto] = useState('');
  const [estruturaAtiva, setEstruturaAtiva] = useState<string>('Todas');

  const estruturasDisponiveis = [
    'Todas',
    'Óstios Foliculares',
    'Hastes',
    'Superfície / Escamas',
    'Vasos',
    'Pigmentação'
  ];

  const alternarAchado = (id: string) => {
    setAchadosSelecionadosIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const limparSelecao = () => {
    setAchadosSelecionadosIds([]);
  };

  // Achados filtrados por texto e estrutura
  const achadosFiltrados = useMemo(() => {
    return ACHADOS_TRICOSCOPICOS.filter(achado => {
      const matchTexto = 
        achado.nome.toLowerCase().includes(filtroTexto.toLowerCase()) ||
        achado.descricao.toLowerCase().includes(filtroTexto.toLowerCase());
      const matchEstrutura = estruturaAtiva === 'Todas' || achado.estrutura === estruturaAtiva;
      return matchTexto && matchEstrutura;
    });
  }, [filtroTexto, estruturaAtiva]);

  // Casos correspondentes aos achados selecionados (base estrita no PDF)
  const casosCompativeis = useMemo(() => {
    if (achadosSelecionadosIds.length === 0) return [];

    return CASOS_ATLAS.filter(caso => {
      return achadosSelecionadosIds.some(achadoId => caso.achadosIds.includes(achadoId));
    }).map(caso => {
      const achadosPresentes = achadosSelecionadosIds.filter(id => caso.achadosIds.includes(id));
      return {
        caso,
        achadosPresentes,
        score: achadosPresentes.length
      };
    }).sort((a, b) => b.score - a.score);
  }, [achadosSelecionadosIds]);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6 animate-fadeIn">
      {/* Cabeçalho da Ferramenta de Consulta */}
      <div className="bg-white dark:bg-slate-900/90 p-5 sm:p-7 rounded-2xl border border-stone-200/90 dark:border-slate-800 space-y-4 shadow-xs">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-rose-50 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 border border-rose-200/80 dark:border-rose-800/60">
            <Microscope className="w-3.5 h-3.5" />
            Triagem Visual Interativa
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-stone-900 dark:text-slate-100 tracking-tight">
            O Que Você Está Vendo no Dermatoscópio?
          </h1>
          <p className="text-xs sm:text-sm text-stone-500 dark:text-slate-400 leading-relaxed max-w-3xl">
            Selecione os elementos visuais observados na sua lâmina. O sistema correlaciona com as 17 condições clínicas do acervo de referência.
          </p>
        </div>

        {/* Barra de Busca de Achados e Filtros de Estrutura */}
        <div className="pt-2 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-stone-400 dark:text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={filtroTexto}
              onChange={(e) => setFiltroTexto(e.target.value)}
              placeholder="Filtrar achados (ex: exclamação, vírgula, pontos, escamas)..."
              className="w-full bg-stone-50 dark:bg-slate-950 border border-stone-200 dark:border-slate-700 rounded-xl pl-10 pr-4 py-2 text-xs sm:text-sm text-stone-900 dark:text-slate-100 placeholder-stone-400 dark:placeholder-slate-500 focus:outline-none focus:bg-white dark:focus:bg-slate-900 focus:border-rose-400 transition-colors shadow-xs"
            />
          </div>

          {achadosSelecionadosIds.length > 0 && (
            <button
              onClick={limparSelecao}
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-rose-700 hover:text-rose-900 bg-rose-50 hover:bg-rose-100/80 rounded-xl border border-rose-200/90 transition-colors shadow-xs"
            >
              <X className="w-3.5 h-3.5" />
              <span>Limpar Seleção ({achadosSelecionadosIds.length})</span>
            </button>
          )}
        </div>

        {/* Abas de Estrutura Anatômica */}
        <div className="flex flex-wrap gap-1.5 pt-2 border-t border-stone-100 dark:border-slate-800">
          {estruturasDisponiveis.map(est => {
            const isSelected = estruturaAtiva === est;
            return (
              <button
                key={est}
                onClick={() => setEstruturaAtiva(est)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                  isSelected
                    ? 'bg-rose-700 text-white font-semibold shadow-xs dark:bg-rose-600'
                    : 'bg-stone-100 dark:bg-slate-800 text-stone-600 dark:text-slate-300 hover:bg-stone-200/70 dark:hover:bg-slate-700 border border-stone-200/60 dark:border-slate-700'
                }`}
              >
                {est}
              </button>
            );
          })}
        </div>
      </div>

      {/* Grid de Achados para Seleção Rápida */}
      <div className="space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-stone-500 dark:text-slate-400">
          Selecione 1 ou mais achados documentados ({achadosFiltrados.length} disponíveis):
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-80 overflow-y-auto pr-1">
          {achadosFiltrados.map(achado => {
            const isSelected = achadosSelecionadosIds.includes(achado.id);
            return (
              <div
                key={achado.id}
                onClick={() => alternarAchado(achado.id)}
                className={`cursor-pointer p-3.5 rounded-2xl border text-left transition-all flex items-start gap-3 select-none ${
                  isSelected
                    ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-700 text-rose-900 dark:text-rose-100 shadow-xs'
                    : 'bg-white dark:bg-slate-900/80 hover:bg-stone-50 dark:hover:bg-slate-800 border-stone-200/90 dark:border-slate-800 text-stone-700 dark:text-slate-300 shadow-xs'
                }`}
              >
                <div className="mt-0.5 shrink-0">
                  {isSelected ? (
                    <CheckSquare className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                  ) : (
                    <Square className="w-4 h-4 text-stone-300 dark:text-slate-600" />
                  )}
                </div>
                <div className="space-y-1">
                  <p className="text-xs sm:text-sm font-semibold leading-snug">
                    {achado.nome}
                  </p>
                  <p className="text-[11px] text-stone-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                    {achado.descricao}
                  </p>
                  <div className="flex items-center gap-1.5 pt-0.5">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-stone-100 dark:bg-slate-950 text-stone-600 dark:text-slate-400 border border-stone-200 dark:border-slate-800">
                      {achado.estrutura}
                    </span>
                    {achado.marcadorAtividade && (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800">
                        Atividade
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Resultados: Casos Relacionados aos Achados Selecionados */}
      <div className="space-y-4 pt-4 border-t border-stone-200/90 dark:border-slate-800">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-wider text-stone-800 dark:text-slate-200 flex items-center gap-2">
            <span>Casos Relacionados no Atlas</span>
            <span className="px-2.5 py-0.5 rounded-full bg-rose-50 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 font-mono text-xs font-semibold">
              {casosCompativeis.length} correspondências
            </span>
          </h2>
        </div>

        {achadosSelecionadosIds.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-slate-900/40 rounded-2xl border border-stone-200 dark:border-slate-800 p-6 space-y-2 shadow-xs">
            <AlertCircle className="w-8 h-8 text-stone-400 dark:text-slate-500 mx-auto" />
            <p className="text-sm text-stone-800 dark:text-slate-300 font-semibold">Nenhum achado selecionado no momento.</p>
            <p className="text-xs text-stone-500 dark:text-slate-500 max-w-md mx-auto">
              Marque os elementos visuais observados acima para filtrar imediatamente as condições dermatológicas compatíveis.
            </p>
          </div>
        ) : casosCompativeis.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-slate-900/40 rounded-2xl border border-stone-200 dark:border-slate-800 p-6 shadow-xs">
            <p className="text-sm text-amber-800 dark:text-amber-300 font-semibold">
              Nenhum caso no material contém simultaneamente essa combinação específica.
            </p>
            <p className="text-xs text-stone-500 dark:text-slate-400 mt-1">
              Experimente desmarcar um achado para ampliar a correlação de achados.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {casosCompativeis.map(({ caso, achadosPresentes }) => (
              <div
                key={caso.id}
                className="bg-white dark:bg-slate-900 rounded-2xl border border-stone-200/90 dark:border-slate-800 hover:border-rose-300 dark:hover:border-rose-500/50 transition-all p-5 flex flex-col justify-between gap-4 shadow-xs hover:shadow-md hover:shadow-rose-100/50 dark:hover:shadow-none"
              >
                <div className="space-y-3.5">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-1.5">
                        {caso.numeroOrdem && (
                          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-rose-50 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                            #{caso.numeroOrdem.toString().padStart(2, '0')}
                          </span>
                        )}
                        <span className="text-[10px] font-medium uppercase px-2 py-0.5 rounded-md bg-stone-100 dark:bg-slate-800 text-stone-700 dark:text-slate-300 border border-stone-200 dark:border-slate-700">
                          {caso.categoria}
                        </span>
                      </div>
                      <h3 className="text-base sm:text-lg font-bold text-stone-900 dark:text-slate-100 mt-1.5">
                        {caso.nome}
                      </h3>
                    </div>
                  </div>

                  <TricoscopyViewer
                    imagem={caso.imagem}
                    nomeCondicao={caso.nome}
                    casoId={caso.id}
                    className="w-full aspect-[16/9]"
                  />

                  <div className="space-y-1.5">
                    <p className="text-[11px] font-semibold text-stone-500 dark:text-slate-400">
                      Achados confirmados nesta condição:
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {achadosPresentes.map(achadoId => {
                        const achado = ACHADOS_TRICOSCOPICOS.find(a => a.id === achadoId);
                        return (
                          <span
                            key={achadoId}
                            className="px-2.5 py-1 rounded-lg text-xs font-medium bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-700/50"
                          >
                            ✓ {achado?.nome.split(' (')[0]}
                          </span>
                        );
                      })}
                    </div>
                  </div>

                  <p className="text-xs text-stone-600 dark:text-slate-400 line-clamp-2 italic">
                    "{caso.significadoClinico}"
                  </p>
                </div>

                <button
                  onClick={() => onSelecionarCaso(caso.id)}
                  className="w-full py-2.5 px-4 rounded-xl bg-rose-50 hover:bg-rose-100/80 dark:bg-slate-800 dark:hover:bg-slate-700 border border-rose-200/80 dark:border-slate-700 text-rose-800 dark:text-rose-200 text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 transition-colors shadow-xs"
                >
                  <span>Abrir Ficha Completa do Caso</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
