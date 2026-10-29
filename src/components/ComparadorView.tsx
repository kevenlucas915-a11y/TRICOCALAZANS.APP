import React, { useState, useMemo } from 'react';
import { CASOS_ATLAS, COMPARACOES_DIRETAS } from '../data/tricoscopiaData';
import { ComparacaoDireta, CasoAtlas } from '../types/tricoscopia';
import { TricoscopyViewer } from './TricoscopyViewer';
import { GitCompare, ArrowRightLeft, BookOpen, CheckCircle, ExternalLink, Sparkles } from 'lucide-react';

interface ComparadorViewProps {
  casoAIdInicial?: string;
  casoBIdInicial?: string;
  onSelecionarCaso: (casoId: string) => void;
}

export const ComparadorView: React.FC<ComparadorViewProps> = ({
  casoAIdInicial,
  casoBIdInicial,
  onSelecionarCaso
}) => {
  const [comparacaoPreDefinidaId, setComparacaoPreDefinidaId] = useState<string>(() => {
    if (casoAIdInicial && casoBIdInicial) {
      const match = COMPARACOES_DIRETAS.find(
        c => (c.casoAId === casoAIdInicial && c.casoBId === casoBIdInicial) ||
             (c.casoAId === casoBIdInicial && c.casoBId === casoAIdInicial)
      );
      if (match) return match.id;
    }
    return COMPARACOES_DIRETAS[0].id;
  });

  const [casoAId, setCasoAId] = useState<string>(() => {
    return casoAIdInicial || COMPARACOES_DIRETAS[0].casoAId;
  });

  const [casoBId, setCasoBId] = useState<string>(() => {
    return casoBIdInicial || COMPARACOES_DIRETAS[0].casoBId;
  });

  const casoA = useMemo(() => CASOS_ATLAS.find(c => c.id === casoAId), [casoAId]);
  const casoB = useMemo(() => CASOS_ATLAS.find(c => c.id === casoBId), [casoBId]);

  const comparacaoAtiva = useMemo(() => {
    return COMPARACOES_DIRETAS.find(
      c => (c.casoAId === casoAId && c.casoBId === casoBId) ||
           (c.casoAId === casoBId && c.casoBId === casoAId)
    );
  }, [casoAId, casoBId]);

  const aplicarComparacaoPreConfigurada = (id: string) => {
    const comp = COMPARACOES_DIRETAS.find(c => c.id === id);
    if (comp) {
      setComparacaoPreDefinidaId(id);
      setCasoAId(comp.casoAId);
      setCasoBId(comp.casoBId);
    }
  };

  const inverterPosicoes = () => {
    setCasoAId(casoBId);
    setCasoBId(casoAId);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6 animate-fadeIn">
      {/* Cabeçalho do Comparador */}
      <div className="bg-white dark:bg-slate-900/90 p-5 sm:p-7 rounded-2xl border border-stone-200/90 dark:border-slate-800 space-y-4 shadow-xs">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-rose-50 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 border border-rose-200/80 dark:border-rose-800/60">
            <GitCompare className="w-3.5 h-3.5" />
            Análise Comparativa Lado a Lado
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-stone-900 dark:text-slate-100 tracking-tight">
            Comparador Visual de Referências
          </h1>
          <p className="text-xs sm:text-sm text-stone-500 dark:text-slate-400 max-w-3xl leading-relaxed">
            Exame simultâneo de imagens e achados baseado nas 8 comparações diretas estruturadas no acervo.
          </p>
        </div>

        {/* Seleção de Comparações Clássicas */}
        <div className="pt-2 space-y-2 border-t border-stone-100 dark:border-slate-800">
          <label className="text-xs font-semibold uppercase tracking-wider text-stone-500 dark:text-slate-400 block">
            Comparações Clínicas Sugeridas:
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
            {COMPARACOES_DIRETAS.map((comp, idx) => {
              const isSelected = comparacaoAtiva?.id === comp.id;
              return (
                <button
                  key={comp.id}
                  onClick={() => aplicarComparacaoPreConfigurada(comp.id)}
                  className={`p-3 rounded-xl border text-left text-xs transition-all ${
                    isSelected
                      ? 'bg-rose-50 dark:bg-rose-950/50 border-rose-300 dark:border-rose-700 text-rose-900 dark:text-rose-200 font-semibold shadow-xs'
                      : 'bg-stone-50 dark:bg-slate-950 hover:bg-stone-100 dark:hover:bg-slate-800 border-stone-200 dark:border-slate-800 text-stone-700 dark:text-slate-300'
                  }`}
                >
                  <span className="font-mono text-[10px] text-rose-600 dark:text-rose-400 block mb-0.5">
                    Diferencial #{idx + 1}
                  </span>
                  <span className="line-clamp-2 leading-snug">{comp.titulo}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Barra de Seletores Livres de Condição */}
      <div className="bg-white dark:bg-slate-900/90 p-4 sm:p-5 rounded-2xl border border-stone-200/90 dark:border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4 shadow-xs">
        <div className="w-full md:w-5/12 space-y-1.5">
          <label className="text-xs font-semibold uppercase tracking-wider text-rose-700 dark:text-rose-400 flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-rose-500" />
            Condição A:
          </label>
          <select
            value={casoAId}
            onChange={(e) => setCasoAId(e.target.value)}
            className="w-full bg-stone-50 dark:bg-slate-950 border border-stone-200 dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-stone-900 dark:text-slate-100 font-medium focus:outline-none focus:border-rose-400 transition-colors"
          >
            {CASOS_ATLAS.map(c => (
              <option key={c.id} value={c.id} disabled={c.id === casoBId}>
                {c.numeroOrdem ? `#${c.numeroOrdem.toString().padStart(2, '0')} - ` : ''}{c.nome}
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={inverterPosicoes}
          className="p-2.5 rounded-xl bg-stone-100 hover:bg-rose-50 dark:bg-slate-800 dark:hover:bg-slate-700 text-stone-600 dark:text-slate-300 hover:text-rose-700 border border-stone-200 dark:border-slate-700 transition-all shrink-0 shadow-xs"
          title="Inverter posições A e B"
        >
          <ArrowRightLeft className="w-4 h-4" />
        </button>

        <div className="w-full md:w-5/12 space-y-1.5">
          <label className="text-xs font-semibold uppercase tracking-wider text-teal-700 dark:text-teal-400 flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-teal-600" />
            Condição B:
          </label>
          <select
            value={casoBId}
            onChange={(e) => setCasoBId(e.target.value)}
            className="w-full bg-stone-50 dark:bg-slate-950 border border-stone-200 dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-stone-900 dark:text-slate-100 font-medium focus:outline-none focus:border-teal-500 transition-colors"
          >
            {CASOS_ATLAS.map(c => (
              <option key={c.id} value={c.id} disabled={c.id === casoAId}>
                {c.numeroOrdem ? `#${c.numeroOrdem.toString().padStart(2, '0')} - ` : ''}{c.nome}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Visualização de Imagens Lado a Lado */}
      {casoA && casoB && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Lado A */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 border border-rose-200/80 dark:border-slate-800 space-y-3.5 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-rose-700 dark:text-rose-300 uppercase px-2.5 py-0.5 rounded-full bg-rose-50 dark:bg-rose-950/80 border border-rose-200/90 dark:border-rose-800">
                Condição A
              </span>
              <button
                onClick={() => onSelecionarCaso(casoA.id)}
                className="text-xs text-rose-600 dark:text-rose-400 hover:text-rose-800 flex items-center gap-1 font-semibold"
              >
                <span>Ver ficha completa</span>
                <ExternalLink className="w-3 h-3" />
              </button>
            </div>
            <h3 className="text-lg font-bold text-stone-900 dark:text-slate-100">{casoA.nome}</h3>
            
            <TricoscopyViewer
              imagem={casoA.imagem}
              nomeCondicao={casoA.nome}
              casoId={casoA.id}
              isHero={false}
              className="w-full"
            />
          </div>

          {/* Lado B */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 border border-teal-200/80 dark:border-teal-900/50 space-y-3.5 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-teal-800 dark:text-teal-300 uppercase px-2.5 py-0.5 rounded-full bg-teal-50 dark:bg-teal-950/80 border border-teal-200/90 dark:border-teal-800">
                Condição B
              </span>
              <button
                onClick={() => onSelecionarCaso(casoB.id)}
                className="text-xs text-teal-700 dark:text-teal-400 hover:text-teal-900 flex items-center gap-1 font-semibold"
              >
                <span>Ver ficha completa</span>
                <ExternalLink className="w-3 h-3" />
              </button>
            </div>
            <h3 className="text-lg font-bold text-stone-900 dark:text-slate-100">{casoB.nome}</h3>

            <TricoscopyViewer
              imagem={casoB.imagem}
              nomeCondicao={casoB.nome}
              casoId={casoB.id}
              isHero={false}
              className="w-full"
            />
          </div>
        </div>
      )}

      {/* Tabela de Diferenciação Clínica */}
      {casoA && casoB && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-stone-200/90 dark:border-slate-800 overflow-hidden shadow-xs">
          <div className="p-4 sm:p-5 bg-stone-50/80 dark:bg-slate-950 border-b border-stone-200/90 dark:border-slate-800 flex items-center justify-between">
            <h3 className="text-sm font-bold uppercase tracking-wider text-stone-800 dark:text-slate-200 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-rose-600 dark:text-rose-400" />
              <span>Diferenças Clínicas Chave</span>
            </h3>
            {comparacaoAtiva && (
              <span className="text-xs font-mono text-rose-700 dark:text-rose-300 bg-white dark:bg-slate-900 px-3 py-1 rounded-full border border-stone-200 dark:border-slate-800 shadow-xs">
                Comparação Estruturada
              </span>
            )}
          </div>

          {comparacaoAtiva ? (
            <div className="divide-y divide-stone-100 dark:divide-slate-800">
              {comparacaoAtiva.criterios.map((crit, idx) => (
                <div key={idx} className="p-4 sm:p-5 grid grid-cols-1 md:grid-cols-12 gap-3 hover:bg-stone-50/50 dark:hover:bg-slate-800/40 transition-colors">
                  <div className="md:col-span-3 text-xs font-bold uppercase font-mono text-stone-500 dark:text-slate-400">
                    {crit.criterio}
                  </div>
                  <div className="md:col-span-4 text-xs sm:text-sm text-stone-800 dark:text-slate-200 bg-rose-50/50 dark:bg-rose-950/20 p-3 rounded-xl border border-rose-100 dark:border-rose-900/30 leading-relaxed">
                    <span className="block text-[10px] font-mono text-rose-700 dark:text-rose-300 uppercase font-semibold mb-1">
                      {casoA.nome}:
                    </span>
                    {casoAId === comparacaoAtiva.casoAId ? crit.condicaoA : crit.condicaoB}
                  </div>
                  <div className="md:col-span-5 text-xs sm:text-sm text-stone-800 dark:text-slate-200 bg-teal-50/50 dark:bg-teal-950/20 p-3 rounded-xl border border-teal-100 dark:border-teal-900/30 leading-relaxed">
                    <span className="block text-[10px] font-mono text-teal-800 dark:text-teal-300 uppercase font-semibold mb-1">
                      {casoB.nome}:
                    </span>
                    {casoAId === comparacaoAtiva.casoAId ? crit.condicaoB : crit.condicaoA}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* Confronto Direto dos Dados Estruturados de Cada Ficha */
            <div className="divide-y divide-stone-100 dark:divide-slate-800 p-5 space-y-4">
              <p className="text-xs text-stone-500 dark:text-slate-400 italic">
                Esta comparação confronta os dados textuais fiéis registrados para cada caso no material:
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2">
                <div className="space-y-3 bg-stone-50/60 dark:bg-slate-950 p-4 rounded-xl border border-stone-200/70 dark:border-slate-800">
                  <h4 className="text-xs font-bold font-mono uppercase text-rose-700 dark:text-rose-400 border-b border-stone-200 dark:border-slate-800 pb-1.5">
                    {casoA.nome}
                  </h4>
                  <div className="text-xs text-stone-700 dark:text-slate-300 space-y-1">
                    <span className="font-semibold text-stone-800 dark:text-slate-200">Significado Clínico:</span>
                    <p className="leading-relaxed">{casoA.significadoClinico}</p>
                  </div>
                  <div className="space-y-1.5">
                    <span className="text-xs font-semibold text-stone-800 dark:text-slate-200">Achados Principais:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {casoA.achadosTricoscopicos.map((a, i) => (
                        <span key={i} className="text-[11px] px-2.5 py-0.5 rounded-md bg-white dark:bg-slate-900 text-rose-700 dark:text-rose-300 border border-stone-200 dark:border-slate-800">
                          {a}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="space-y-3 bg-stone-50/60 dark:bg-slate-950 p-4 rounded-xl border border-stone-200/70 dark:border-slate-800">
                  <h4 className="text-xs font-bold font-mono uppercase text-teal-700 dark:text-teal-400 border-b border-stone-200 dark:border-slate-800 pb-1.5">
                    {casoB.nome}
                  </h4>
                  <div className="text-xs text-stone-700 dark:text-slate-300 space-y-1">
                    <span className="font-semibold text-stone-800 dark:text-slate-200">Significado Clínico:</span>
                    <p className="leading-relaxed">{casoB.significadoClinico}</p>
                  </div>
                  <div className="space-y-1.5">
                    <span className="text-xs font-semibold text-stone-800 dark:text-slate-200">Achados Principais:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {casoB.achadosTricoscopicos.map((a, i) => (
                        <span key={i} className="text-[11px] px-2.5 py-0.5 rounded-md bg-white dark:bg-slate-900 text-teal-800 dark:text-teal-300 border border-stone-200 dark:border-slate-800">
                          {a}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
