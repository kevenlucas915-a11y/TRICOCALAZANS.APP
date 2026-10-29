import React from 'react';
import { CasoAtlas } from '../types/tricoscopia';
import { ACHADOS_TRICOSCOPICOS } from '../data/tricoscopiaData';
import { TricoscopyViewer } from './TricoscopyViewer';
import { 
  ArrowLeft, 
  Eye, 
  FileText, 
  Microscope, 
  Stethoscope, 
  CheckCircle2, 
  GitCompare, 
  BookOpen, 
  Link as LinkIcon,
  Sparkles,
  MapPin,
  Crown,
  Lock
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { temAcessoAtlas } from '../types/assinatura';

interface FichaCasoViewProps {
  caso: CasoAtlas;
  onVoltar: () => void;
  onSelecionarCaso: (casoId: string) => void;
  onAbrirComparacao: (casoAId: string, casoBId?: string) => void;
  onAbrirAchado?: (achadoId: string) => void;
  onNavegarParaPlanos?: () => void;
}

export const FichaCasoView: React.FC<FichaCasoViewProps> = ({
  caso,
  onVoltar,
  onSelecionarCaso,
  onAbrirComparacao,
  onAbrirAchado,
  onNavegarParaPlanos
}) => {
  const { usuarioAtual } = useAuth();
  const temAcesso = temAcessoAtlas(usuarioAtual);
  const isCasoLiberado = temAcesso;

  if (!isCasoLiberado) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10 space-y-6 animate-fadeIn text-center">
        <div className="flex items-center justify-start pb-2">
          <button
            onClick={onVoltar}
            className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white glass-button px-3.5 py-2 rounded-xl transition-all"
          >
            <ArrowLeft className="w-4 h-4 text-teal-700 dark:text-teal-400" />
            <span>Voltar ao Atlas</span>
          </button>
        </div>

        <div className="glass-card p-8 sm:p-12 space-y-6 border border-teal-500/30 bg-teal-500/[0.02] rounded-3xl">
          <div className="w-16 h-16 rounded-3xl bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center justify-center mx-auto shadow-md">
            <Crown className="w-8 h-8" />
          </div>

          <div className="space-y-2 max-w-lg mx-auto">
            <span className="px-3 py-1 rounded-full bg-amber-400/20 text-amber-600 dark:text-amber-300 text-xs font-bold uppercase tracking-wider inline-block">
              Atlas Clínico: Exclusivo dos Planos Pagos
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
              {caso.nome}
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
              O estudo dermatoscópico detalhado desta condição clínica, critérios de diagnóstico diferencial, padrões tricoscópicos e imagens em alta definição fazem parte <strong>exclusivamente dos Planos Pagos (Clínico Pro e Master)</strong>.
            </p>
          </div>

          {/* Comparativo de Opções de Assinatura */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-lg mx-auto text-left">
            <div className="p-4 rounded-2xl border-2 border-teal-600 dark:border-teal-400 bg-white/80 dark:bg-slate-900/80 shadow-md flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-slate-900 dark:text-white">Plano Anual</span>
                  <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded-full bg-amber-400 text-slate-950 uppercase">50% OFF</span>
                </div>
                <div className="text-xl font-extrabold text-teal-800 dark:text-teal-300">
                  12x R$ 44,90
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Total R$ 538,80/ano parcelado em até 12x sem juros.
                </p>
              </div>
            </div>

            <div className="p-4 rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-slate-900 dark:text-white">Apenas o Mês</span>
                  <span className="text-[10px] text-slate-400">Avulso</span>
                </div>
                <div className="text-xl font-extrabold text-slate-900 dark:text-white">
                  R$ 89,90
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  30 dias de acesso sem fidelidade (renovação avulsa).
                </p>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-teal-50/70 dark:bg-teal-950/30 border border-teal-200/70 dark:border-teal-800 text-xs space-y-2 max-w-md mx-auto text-left">
            <span className="font-bold text-teal-800 dark:text-teal-300 block">
              Recursos liberados ao assinar:
            </span>
            <ul className="space-y-1 text-slate-600 dark:text-slate-400 text-xs">
              <li>✓ Acesso irrestrito ao acervo completo de casos do Atlas Clínico</li>
              <li>✓ Comparador diagnóstico lado a lado</li>
              <li>✓ Prontuário eletrônico e anamneses ilimitadas</li>
              <li>✓ Laudos tricológicos prontos para impressão sem marca d'água</li>
            </ul>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={onVoltar}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl glass-button text-xs font-semibold text-slate-600 dark:text-slate-400"
            >
              Voltar ao Catálogo
            </button>
            {onNavegarParaPlanos && (
              <button
                onClick={onNavegarParaPlanos}
                className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-teal-700/20 transition-all hover:scale-[1.01]"
              >
                <Crown className="w-4 h-4 text-amber-300" />
                <span>Ver Planos & Desbloquear Atlas</span>
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6 animate-fadeIn">
      {/* Barra de Ação Superior */}
      <div className="flex items-center justify-between gap-3 pb-3 border-b border-stone-200/90 dark:border-slate-800">
        <button
          onClick={onVoltar}
          className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-stone-700 dark:text-slate-300 hover:text-stone-900 dark:hover:text-white bg-white dark:bg-slate-800 px-3.5 py-2 rounded-xl border border-stone-200 dark:border-slate-700 transition-all shadow-xs"
        >
          <ArrowLeft className="w-4 h-4 text-rose-600 dark:text-rose-400" />
          <span>Voltar ao Atlas</span>
        </button>

        <div className="flex items-center gap-2">
          {caso.numeroOrdem && (
            <span className="text-xs font-mono font-semibold text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/80 px-3 py-1.5 rounded-xl border border-rose-200/90 dark:border-rose-800 shadow-xs hidden sm:inline-block">
              Caso #{caso.numeroOrdem.toString().padStart(2, '0')}
            </span>
          )}
          <button
            onClick={() => onAbrirComparacao(caso.id)}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-800 dark:text-rose-200 bg-rose-50 hover:bg-rose-100/80 dark:bg-slate-800 dark:hover:bg-slate-700 px-3.5 py-2 rounded-xl border border-rose-200/80 dark:border-slate-700 transition-all shadow-xs"
          >
            <GitCompare className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
            <span>Comparar Lado a Lado</span>
          </button>
        </div>
      </div>

      {/* 1. IMAGEM PRINCIPAL (Visualizador Tricoscópico) */}
      <div className="space-y-2">
        <TricoscopyViewer
          imagem={caso.imagem}
          nomeCondicao={caso.nome}
          casoId={caso.id}
          isHero={true}
        />
      </div>

      {/* 2. NOME DA CONDIÇÃO & METADADOS */}
      <div className="bg-white dark:bg-slate-900/90 p-5 sm:p-6 rounded-2xl border border-stone-200/90 dark:border-slate-800 space-y-3 shadow-xs">
        <div className="flex flex-wrap items-center gap-2">
          {caso.numeroOrdem && (
            <span className="px-3 py-1 rounded-full text-xs font-bold font-mono bg-rose-50 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 border border-rose-200/90 dark:border-rose-800">
              Caso #{caso.numeroOrdem.toString().padStart(2, '0')} de 17 Oficiais
            </span>
          )}
          <span className="px-3 py-1 rounded-full text-xs font-medium bg-stone-100 dark:bg-slate-800 text-stone-700 dark:text-slate-300 border border-stone-200 dark:border-slate-700">
            {caso.categoria}
          </span>
          <span className="text-xs text-stone-400 dark:text-slate-500 font-mono">
            ID: {caso.id}
          </span>
        </div>

        <h1 className="text-2xl sm:text-3xl font-bold text-stone-900 dark:text-slate-100 tracking-tight">
          {caso.nome}
        </h1>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-xs text-stone-600 dark:text-slate-300">
          {caso.localizacao && (
            <div className="flex items-start gap-1.5 bg-stone-50 dark:bg-slate-950 p-2.5 rounded-xl border border-stone-200/60 dark:border-slate-800">
              <MapPin className="w-3.5 h-3.5 text-rose-500 mt-0.5 shrink-0" />
              <div>
                <span className="font-semibold text-stone-800 dark:text-slate-200 block">Localização Típica:</span>
                <span>{caso.localizacao}</span>
              </div>
            </div>
          )}
          {caso.padrao && (
            <div className="flex items-start gap-1.5 bg-stone-50 dark:bg-slate-950 p-2.5 rounded-xl border border-stone-200/60 dark:border-slate-800">
              <Sparkles className="w-3.5 h-3.5 text-rose-500 mt-0.5 shrink-0" />
              <div>
                <span className="font-semibold text-stone-800 dark:text-slate-200 block">Padrão Tricoscópico:</span>
                <span>{caso.padrao}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 3. O QUE OBSERVAR */}
      {caso.oQueObservar && caso.oQueObservar.length > 0 && (
        <section className="bg-white dark:bg-slate-900/90 p-5 sm:p-6 rounded-2xl border border-stone-200/90 dark:border-slate-800 space-y-3.5 shadow-xs">
          <div className="flex items-center gap-2 text-rose-700 dark:text-rose-400 font-semibold text-xs sm:text-sm uppercase tracking-wider">
            <Eye className="w-4 h-4" />
            <h2>O Que Observar ao Exame</h2>
          </div>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            {caso.oQueObservar.map((item, idx) => (
              <li key={idx} className="flex items-start gap-2.5 text-sm text-stone-700 dark:text-slate-200 bg-stone-50/80 dark:bg-slate-950 p-3 rounded-xl border border-stone-200/70 dark:border-slate-800">
                <span className="w-2 h-2 rounded-full bg-rose-500 mt-1.5 shrink-0" />
                <span className="leading-snug">{item}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* 4. CARACTERÍSTICAS CLÍNICAS */}
      {caso.caracteristicas && caso.caracteristicas.length > 0 && (
        <section className="bg-white dark:bg-slate-900/90 p-5 sm:p-6 rounded-2xl border border-stone-200/90 dark:border-slate-800 space-y-3 shadow-xs">
          <div className="flex items-center gap-2 text-stone-800 dark:text-slate-200 font-semibold text-xs sm:text-sm uppercase tracking-wider">
            <FileText className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <h2>Características Detalhadas</h2>
          </div>
          <ul className="space-y-2.5 pt-1">
            {caso.caracteristicas.map((item, idx) => (
              <li key={idx} className="flex items-start gap-2.5 text-sm text-stone-700 dark:text-slate-300">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
                <span className="leading-relaxed">{item}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* 5. ACHADOS TRICOSCÓPICOS */}
      {caso.achadosTricoscopicos && caso.achadosTricoscopicos.length > 0 && (
        <section className="bg-white dark:bg-slate-900/90 p-5 sm:p-6 rounded-2xl border border-stone-200/90 dark:border-slate-800 space-y-3.5 shadow-xs">
          <div className="flex items-center gap-2 text-amber-800 dark:text-amber-400 font-semibold text-xs sm:text-sm uppercase tracking-wider">
            <Microscope className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            <h2>Achados Tricoscópicos Registrados</h2>
          </div>
          <div className="flex flex-wrap gap-2 pt-1">
            {caso.achadosTricoscopicos.map((achadoTexto, idx) => {
              const matchingFinding = ACHADOS_TRICOSCOPICOS.find(
                a => caso.achadosIds.includes(a.id) && achadoTexto.toLowerCase().includes(a.nome.toLowerCase().split(' ')[0])
              );

              return (
                <div
                  key={idx}
                  className="px-3.5 py-2 rounded-xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200/90 dark:border-amber-800/60 text-amber-900 dark:text-amber-200 text-xs sm:text-sm font-medium flex items-center gap-2"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                  <span>{achadoTexto}</span>
                  {matchingFinding && onAbrirAchado && (
                    <button
                      onClick={() => onAbrirAchado(matchingFinding.id)}
                      className="ml-1 text-[11px] underline text-amber-700 hover:text-amber-900 dark:text-amber-400 font-semibold"
                      title="Ver definição do achado"
                    >
                      (ver)
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* 6. SIGNIFICADO CLÍNICO */}
      {caso.significadoClinico && (
        <section className="bg-rose-50/60 dark:bg-slate-900/90 p-5 sm:p-6 rounded-2xl border-l-4 border-l-rose-500 border border-stone-200/80 dark:border-slate-800 space-y-2 shadow-xs">
          <div className="flex items-center gap-2 text-rose-800 dark:text-rose-300 font-semibold text-xs sm:text-sm uppercase tracking-wider">
            <Stethoscope className="w-4 h-4 text-rose-600 dark:text-rose-400" />
            <h2>Significado Clínico & Conduta</h2>
          </div>
          <p className="text-sm sm:text-base text-stone-800 dark:text-slate-200 leading-relaxed pt-1">
            {caso.significadoClinico}
          </p>
        </section>
      )}

      {/* 7. COMO RECONHECER */}
      {caso.comoReconhecer && caso.comoReconhecer.length > 0 && (
        <section className="bg-white dark:bg-slate-900/90 p-5 sm:p-6 rounded-2xl border border-stone-200/90 dark:border-slate-800 space-y-3.5 shadow-xs">
          <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-400 font-semibold text-xs sm:text-sm uppercase tracking-wider">
            <BookOpen className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <h2>Como Reconhecer no Exame Prático</h2>
          </div>
          <ol className="space-y-3 pt-1">
            {caso.comoReconhecer.map((passo, idx) => (
              <li key={idx} className="flex items-start gap-3 text-sm text-stone-700 dark:text-slate-200">
                <span className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-950 border border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-300 font-mono text-xs flex items-center justify-center shrink-0 mt-0.5 font-bold">
                  {idx + 1}
                </span>
                <span className="leading-relaxed">{passo}</span>
              </li>
            ))}
          </ol>
        </section>
      )}

      {/* 8. COMPARAÇÕES / DIFERENCIAIS */}
      {caso.diferenciaisComparações && caso.diferenciaisComparações.length > 0 && (
        <section className="bg-white dark:bg-slate-900/90 p-5 sm:p-6 rounded-2xl border border-stone-200/90 dark:border-slate-800 space-y-3.5 shadow-xs">
          <div className="flex items-center gap-2 text-teal-800 dark:text-teal-300 font-semibold text-xs sm:text-sm uppercase tracking-wider">
            <GitCompare className="w-4 h-4 text-teal-700 dark:text-teal-400" />
            <h2>Comparações e Análise Diferencial</h2>
          </div>
          <div className="space-y-3 pt-1">
            {caso.diferenciaisComparações.map((dif, idx) => (
              <div
                key={idx}
                className="p-4 rounded-xl bg-stone-50 dark:bg-slate-950 border border-stone-200/80 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="space-y-1">
                  <span className="text-xs font-semibold text-teal-700 dark:text-teal-300 font-mono uppercase">
                    Versus: {dif.nomeCaso}
                  </span>
                  <p className="text-xs sm:text-sm text-stone-700 dark:text-slate-300 leading-snug">
                    {dif.distincaoChave}
                  </p>
                </div>
                <button
                  onClick={() => onSelecionarCaso(dif.casoId)}
                  className="self-start sm:self-center shrink-0 text-xs font-semibold text-teal-700 dark:text-teal-300 hover:text-teal-900 dark:hover:text-white bg-white dark:bg-slate-800 hover:bg-teal-50 px-3.5 py-2 rounded-xl border border-stone-200 dark:border-slate-700 transition-colors flex items-center gap-1.5 shadow-xs"
                  title="Abrir este caso clínico para estudo detalhado"
                >
                  <Eye className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                  <span>Ver Caso Clínico</span>
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 9. REFERÊNCIAS RELACIONADAS */}
      {caso.referenciasRelacionadas && caso.referenciasRelacionadas.length > 0 && (
        <section className="bg-white dark:bg-slate-900/90 p-5 rounded-2xl border border-stone-200/90 dark:border-slate-800 space-y-2.5 shadow-xs">
          <div className="flex items-center gap-2 text-stone-500 dark:text-slate-400 font-semibold text-xs uppercase tracking-wider">
            <LinkIcon className="w-3.5 h-3.5 text-rose-500" />
            <h2>Referências Relacionadas no Atlas</h2>
          </div>
          <div className="flex flex-wrap gap-2 pt-1">
            {caso.referenciasRelacionadas.map((refId) => (
              <button
                key={refId}
                onClick={() => onSelecionarCaso(refId)}
                className="text-xs font-mono text-stone-700 dark:text-slate-300 bg-stone-100 hover:bg-rose-50 dark:bg-slate-950 dark:hover:bg-slate-800 px-3 py-1.5 rounded-xl border border-stone-200 dark:border-slate-800 transition-colors hover:border-rose-300 dark:hover:border-rose-500/50"
              >
                → {refId.replace('cond-', '').toUpperCase()}
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Resumo Clínico */}
      {caso.resumoOriginal && (
        <div className="p-4 sm:p-5 rounded-2xl bg-rose-50/40 dark:bg-black/40 border border-rose-100/90 dark:border-slate-800 text-xs text-stone-600 dark:text-slate-400 italic">
          <span className="font-semibold text-stone-900 dark:text-slate-200 not-italic">Em Resumo Clínico: </span>
          "{caso.resumoOriginal}"
        </div>
      )}
    </div>
  );
};
