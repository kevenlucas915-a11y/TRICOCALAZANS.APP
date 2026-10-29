import React, { useState, useMemo, useEffect } from 'react';
import { CASOS_ATLAS } from '../data/tricoscopiaData';
import { CasoAtlas, CategoriaClinica } from '../types/tricoscopia';
import { TricoscopyViewer } from './TricoscopyViewer';
import { 
  Search, 
  Filter, 
  Microscope, 
  ArrowRight, 
  ShieldCheck, 
  Tag, 
  Camera, 
  Sparkles, 
  X, 
  RefreshCw,
  CheckCircle2,
  Crown,
  Lock,
  ChevronRight
} from 'lucide-react';
import { recuperarImagensLegadas, obterTodasImagens } from '../utils/imageStore';
import { useAuth } from '../context/AuthContext';
import { temAcessoAtlas } from '../types/assinatura';

interface AtlasGridViewProps {
  onSelecionarCaso: (casoId: string) => void;
  onAbrirAchado: (achadoId: string) => void;
  onAbrirComparacao: (casoAId: string, casoBId?: string) => void;
  onAbrirGerenciadorImagens?: () => void;
  termoBuscaGlobal?: string;
  onLimparBuscaGlobal?: () => void;
  onNavegarParaPlanos?: () => void;
}

export const AtlasGridView: React.FC<AtlasGridViewProps> = ({
  onSelecionarCaso,
  onAbrirAchado,
  onAbrirComparacao,
  onAbrirGerenciadorImagens,
  termoBuscaGlobal = '',
  onLimparBuscaGlobal,
  onNavegarParaPlanos
}) => {
  const { usuarioAtual } = useAuth();
  const temAcesso = temAcessoAtlas(usuarioAtual);

  const [categoriaAtiva, setCategoriaAtiva] = useState<string>('Todas');
  const [filtroTexto, setFiltroTexto] = useState<string>(termoBuscaGlobal);
  const [totalFotosAtivas, setTotalFotosAtivas] = useState<number>(0);
  const [sincronizando, setSincronizando] = useState<boolean>(false);
  const [mensagemSincronizacao, setMensagemSincronizacao] = useState<string | null>(null);
  const [casoBloqueadoModal, setCasoBloqueadoModal] = useState<CasoAtlas | null>(null);

  const checarFotos = async () => {
    try {
      const mapa = await obterTodasImagens();
      const count = Object.keys(mapa).length;
      setTotalFotosAtivas(count);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    checarFotos();
    const handleUpdate = () => checarFotos();
    window.addEventListener('atlas-image-updated', handleUpdate);
    return () => window.removeEventListener('atlas-image-updated', handleUpdate);
  }, []);

  const handleSincronizarManual = async () => {
    setSincronizando(true);
    setMensagemSincronizacao('Buscando e restaurando fotos do navegador...');
    try {
      const total = await recuperarImagensLegadas();
      const mapa = await obterTodasImagens();
      const count = Object.keys(mapa).length;
      setTotalFotosAtivas(count);
      setMensagemSincronizacao(`Varredura concluída! ${count} foto(s) ativa(s) no seu acervo.`);
      setTimeout(() => setMensagemSincronizacao(null), 4000);
    } catch {
      setMensagemSincronizacao('Não foi possível concluir a varredura.');
      setTimeout(() => setMensagemSincronizacao(null), 4000);
    } finally {
      setSincronizando(false);
    }
  };

  // Categorias clínicas válidas do acervo
  const categorias: { label: string; count: number }[] = useMemo(() => {
    const list = [
      'Todas',
      'Não Cicatricial',
      'Cicatricial',
      'Dermatose Descamativa',
      'Infecciosa',
      'Parasitária'
    ];
    return list.map(cat => ({
      label: cat,
      count:
        cat === 'Todas'
          ? CASOS_ATLAS.length
          : CASOS_ATLAS.filter(c => c.categoria === cat).length
    }));
  }, []);

  // Busca abrangente pelo conteúdo real: nome da condição, achados, características, termos do PDF
  const casosFiltrados = useMemo(() => {
    const query = (filtroTexto || termoBuscaGlobal).toLowerCase().trim();

    return CASOS_ATLAS.filter(caso => {
      if (categoriaAtiva !== 'Todas' && caso.categoria !== categoriaAtiva) {
        return false;
      }

      if (!query) return true;

      const matchNome = caso.nome.toLowerCase().includes(query);
      const matchAchados = caso.achadosTricoscopicos.some(a => a.toLowerCase().includes(query));
      const matchCaracteristicas = caso.caracteristicas.some(c => c.toLowerCase().includes(query));
      const matchObservar = caso.oQueObservar.some(o => o.toLowerCase().includes(query));
      const matchSignificado = caso.significadoClinico.toLowerCase().includes(query);
      const matchPadrao = caso.padrao.toLowerCase().includes(query);
      const matchLocalizacao = caso.localizacao.toLowerCase().includes(query);

      return (
        matchNome ||
        matchAchados ||
        matchCaracteristicas ||
        matchObservar ||
        matchSignificado ||
        matchPadrao ||
        matchLocalizacao
      );
    });
  }, [filtroTexto, termoBuscaGlobal, categoriaAtiva]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
      {/* Banner de Bloqueio / Recurso Exclusivo para Planos Pagos */}
      {!temAcesso && (
        <div className="p-6 sm:p-7 rounded-3xl bg-gradient-to-r from-teal-950 via-teal-900 to-slate-950 text-white shadow-xl flex flex-col lg:flex-row lg:items-center justify-between gap-5 border border-teal-500/30 animate-fadeIn">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-400/20 text-amber-300 text-xs font-bold uppercase tracking-wider">
              <Crown className="w-3.5 h-3.5" />
              <span>Atlas Clínico: Exclusivo dos Planos Pagos</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight">
              Desbloqueie o acervo completo de patologias tricoscópicas
            </h2>
            <p className="text-xs sm:text-sm text-teal-100/90 leading-relaxed">
              O Atlas Clínico é uma ferramenta de referência diagnóstica de nível avançado, disponível <strong>exclusivamente para os Planos Pagos (Clínico Pro e Master)</strong>. Você pode assinar <strong>apenas o mês avulso</strong> (R$ 89,90 sem fidelidade) ou garantir <strong>50% de economia no plano anual</strong> (12x de R$ 44,90 sem juros).
            </p>
            <div className="flex flex-wrap items-center gap-3 pt-1 text-xs text-amber-200">
              <span className="flex items-center gap-1">✓ Patologias com dermoscopia HD</span>
              <span className="flex items-center gap-1">✓ Critérios diagnósticos padronizados</span>
              <span className="flex items-center gap-1">✓ Comparador A/B diferencial</span>
            </div>
          </div>

          {onNavegarParaPlanos && (
            <div className="flex flex-col sm:flex-row lg:flex-col gap-2.5 shrink-0">
              <button
                onClick={onNavegarParaPlanos}
                className="px-5 py-3 rounded-2xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold text-xs flex items-center justify-center gap-2 shadow-lg shadow-amber-400/25 transition-all hover:scale-[1.02]"
              >
                <Crown className="w-4 h-4 text-slate-950" />
                <span>Desbloquear Atlas no Plano Anual (12x R$ 44,90)</span>
              </button>
              <button
                onClick={onNavegarParaPlanos}
                className="px-4 py-2.5 rounded-2xl glass-button text-white/90 hover:text-white hover:bg-white/10 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all"
              >
                <span>Assinar Apenas 1 Mês (R$ 89,90)</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Banner de Apresentação e Filtros estilo Glassmorphic */}
      <div className="glass-card p-5 sm:p-7 space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap text-xs text-slate-400">
              <span className="font-semibold text-teal-700 dark:text-teal-400">
                Guia Clínico Dermatológico
              </span>
              {totalFotosAtivas > 0 && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    {totalFotosAtivas} foto(s) ativa(s)
                  </span>
                </>
              )}
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
              Atlas Visual de Tricoscopia
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-2xl leading-relaxed">
              Acervo de fototricoscopia clínica com achados padronizados para consulta médica e estética.
            </p>
          </div>

          {/* Campo de Busca Rápida e Ação de Gerenciamento */}
          <div className="flex items-center gap-2 w-full md:w-auto">
            <div className="relative flex-1 md:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={filtroTexto}
                onChange={(e) => setFiltroTexto(e.target.value)}
                placeholder="Buscar condição, achado ou termo..."
                className="w-full glass-input pl-10 pr-9 py-2 text-xs sm:text-sm placeholder:text-slate-400 shadow-xs"
              />
              {filtroTexto && (
                <button
                  onClick={() => setFiltroTexto('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <button
              onClick={handleSincronizarManual}
              disabled={sincronizando}
              className="px-3 py-2 rounded-xl glass-button flex items-center gap-1.5 text-xs font-medium shrink-0"
              title="Varre e restaura todas as fotos salvas anteriormente no navegador"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-teal-700 dark:text-teal-400 ${sincronizando ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">{sincronizando ? 'Restaurando...' : 'Restaurar'}</span>
            </button>

            {onAbrirGerenciadorImagens && (
              <button
                onClick={onAbrirGerenciadorImagens}
                className="px-3.5 py-2 rounded-xl glass-button flex items-center gap-1.5 text-xs font-semibold shrink-0 text-teal-700 dark:text-teal-300"
                title="Abrir gerenciador de imagens do Atlas"
              >
                <Camera className="w-3.5 h-3.5 text-teal-700 dark:text-teal-400" />
                <span className="hidden sm:inline">Gerenciar Imagens</span>
              </button>
            )}
          </div>
        </div>

        {mensagemSincronizacao && (
          <div className="px-4 py-2.5 rounded-xl glass-card text-xs text-teal-800 dark:text-teal-300 flex items-center gap-2">
            <RefreshCw className="w-3.5 h-3.5 text-teal-600 animate-spin" />
            <span>{mensagemSincronizacao}</span>
          </div>
        )}

        {/* Filtros por Categorias */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-200/60 dark:border-white/[0.06]">
          <span className="text-xs font-medium text-slate-400 dark:text-slate-500 flex items-center gap-1 mr-1">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span>Filtro:</span>
          </span>
          {categorias.map(cat => {
            const isSelected = categoriaAtiva === cat.label;
            return (
              <button
                key={cat.label}
                onClick={() => setCategoriaAtiva(cat.label)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                  isSelected
                    ? 'glass-button bg-teal-700 text-white dark:bg-teal-700 dark:text-white font-semibold shadow-xs'
                    : 'glass-button text-slate-600 dark:text-slate-300'
                }`}
              >
                {cat.label} <span className="opacity-75 font-normal ml-0.5">({cat.count})</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Grid de Cards de Casos do Atlas */}
      {casosFiltrados.length === 0 ? (
        <div className="text-center py-16 glass-card p-6 space-y-3">
          <div className="w-12 h-12 mx-auto rounded-2xl glass-button flex items-center justify-center text-slate-400">
            <Search className="w-6 h-6" />
          </div>
          <p className="text-base text-slate-800 dark:text-slate-200 font-semibold">
            Nenhuma referência encontrada para a busca "{filtroTexto}".
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            Verifique a digitação ou tente termos como "miniaturização", "colaretes", "exclamação", "pontos pretos" ou "hiperseborreia".
          </p>
          <button
            onClick={() => {
              setFiltroTexto('');
              setCategoriaAtiva('Todas');
              if (onLimparBuscaGlobal) onLimparBuscaGlobal();
            }}
            className="px-4 py-2 glass-button text-teal-700 dark:text-teal-400 text-xs font-semibold shadow-xs"
          >
            Limpar Filtros e Ver Todos
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {casosFiltrados.map(caso => {
            const isLiberado = temAcesso;

            return (
              <div
                key={caso.id}
                onClick={() => {
                  if (isLiberado) {
                    onSelecionarCaso(caso.id);
                  } else {
                    setCasoBloqueadoModal(caso);
                  }
                }}
                className={`cursor-pointer group glass-card hover:scale-[1.01] transition-all duration-200 overflow-hidden flex flex-col justify-between relative ${
                  !isLiberado ? 'hover:border-amber-400/50' : 'hover:border-white/20'
                }`}
              >
                {/* Badge de Bloqueio nos Casos dos Planos Pagos */}
                {!isLiberado && (
                  <div className="absolute top-2.5 right-2.5 z-20 px-2.5 py-1 rounded-lg bg-slate-950/90 text-amber-300 text-[10px] font-bold flex items-center gap-1.5 backdrop-blur-md shadow-md border border-amber-400/50">
                    <Lock className="w-3 h-3 text-amber-400" />
                    <span>Exclusivo Pagos</span>
                  </div>
                )}

                <div className="space-y-3.5">
                  {/* 1. Imagem no Topo do Card */}
                  <div className="relative">
                    <TricoscopyViewer
                      imagem={caso.imagem}
                      nomeCondicao={caso.nome}
                      casoId={caso.id}
                      isHero={false}
                      className="w-full"
                    />
                    {!isLiberado && (
                      <div className="absolute inset-0 bg-slate-950/30 backdrop-blur-[1px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="px-3 py-1.5 rounded-xl bg-slate-900/90 text-amber-300 text-xs font-bold flex items-center gap-1.5 shadow-lg border border-amber-400/40">
                          <Crown className="w-3.5 h-3.5" />
                          <span>Disponível nos Planos Pagos</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* 2. Nome da Condição & Metadados */}
                  <div className="px-4 pt-1 space-y-1.5">
                    <div className="flex items-center justify-between gap-1.5 text-[11px] text-slate-400 dark:text-slate-500">
                      <div className="flex items-center gap-1.5">
                        {caso.numeroOrdem && (
                          <span className="font-mono font-medium">
                            #{caso.numeroOrdem.toString().padStart(2, '0')}
                          </span>
                        )}
                        <span aria-hidden="true">·</span>
                        <span className="font-medium">
                          {caso.categoria}
                        </span>
                      </div>
                    </div>
                    <h3 className="text-sm sm:text-base font-semibold text-slate-900 dark:text-slate-100 group-hover:text-teal-700 dark:group-hover:text-teal-400 transition-colors leading-snug">
                      {caso.nome}
                    </h3>
                  </div>

                  {/* 3. Achados Principais */}
                  <div className="px-4 space-y-1.5">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                      Achados Principais:
                    </p>
                    <ul className="space-y-1 pb-1">
                      {caso.achadosTricoscopicos.slice(0, 3).map((achado, idx) => (
                        <li
                          key={idx}
                          className="text-xs text-slate-600 dark:text-slate-300 flex items-start gap-2 leading-tight"
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-teal-600 dark:bg-teal-400 mt-1 shrink-0" />
                          <span className="line-clamp-1">{achado}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Rodapé do Card */}
                <div className="p-4 pt-2.5 mt-2 border-t border-slate-200/50 dark:border-white/[0.05] flex items-center justify-between text-xs font-semibold transition-all">
                  {isLiberado ? (
                    <>
                      <span className="text-teal-700 dark:text-teal-400">Abrir Ficha Clínica</span>
                      <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform text-teal-700 dark:text-teal-400" />
                    </>
                  ) : (
                    <>
                      <span className="text-amber-600 dark:text-amber-400 flex items-center gap-1">
                        <Lock className="w-3 h-3" />
                        <span>Exclusivo Pro</span>
                      </span>
                      <span className="text-[11px] text-teal-700 dark:text-teal-300 underline font-bold flex items-center gap-1">
                        <span>Desbloquear</span>
                        <ChevronRight className="w-3 h-3" />
                      </span>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal de Caso Bloqueado */}
      {casoBloqueadoModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-md overflow-y-auto animate-fadeIn"
          onClick={() => setCasoBloqueadoModal(null)}
        >
          <div 
            className="w-full max-w-md bg-white dark:bg-[#071918] rounded-3xl shadow-2xl border border-teal-200/80 dark:border-teal-500/30 overflow-hidden flex flex-col p-6 space-y-4 my-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center justify-center shrink-0">
                <Crown className="w-6 h-6" />
              </div>
              <button
                onClick={() => setCasoBloqueadoModal(null)}
                className="w-8 h-8 rounded-full glass-button flex items-center justify-center text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-1.5">
              <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider block">
                Conteúdo Exclusivo dos Planos Pagos
              </span>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                {casoBloqueadoModal.nome}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                O estudo dermatoscópico completo desta patologia capilar com fotos em alta resolução, critérios diagnósticos e diagnósticos diferenciais faz parte dos <strong>Planos Pagos (Clínico Pro e Master)</strong>.
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-teal-50/70 dark:bg-teal-950/30 border border-teal-200/70 dark:border-teal-800 text-xs space-y-1.5 text-slate-700 dark:text-slate-300">
              <div className="flex items-center gap-1.5 font-bold text-teal-800 dark:text-teal-300">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Vantagens do Acesso Completo:</span>
              </div>
              <ul className="space-y-1 text-[11px] text-slate-600 dark:text-slate-400 pl-1">
                <li>✓ Patologias e condições capilares com casos clínicos detalhados</li>
                <li>✓ Fototricoscopia detalhada com achados dermatoscópicos</li>
                <li>✓ Prontuário, anamneses e capturas ilimitadas</li>
                <li>✓ Laudos clínicos sem marca d'água para pacientes</li>
              </ul>
            </div>

            <div className="space-y-2">
              <div className="p-3 rounded-2xl border border-teal-500/40 bg-teal-500/[0.06] flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-slate-900 dark:text-white">Plano Anual (Recomendado)</span>
                    <span className="text-[10px] font-extrabold px-1.5 py-0.2 rounded bg-amber-400 text-slate-950 uppercase">50% OFF</span>
                  </div>
                  <span className="text-[11px] text-teal-800 dark:text-teal-300 font-semibold">12x de R$ 44,90/mês</span>
                </div>
                <span className="text-[10px] text-slate-400">Total R$ 538,80/ano</span>
              </div>

              <div className="p-3 rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/[0.02] flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-900 dark:text-white">Assinar Apenas o Mês</span>
                  <p className="text-[10px] text-slate-400">Mensal avulso sem fidelidade</p>
                </div>
                <div className="text-right">
                  <span className="text-xs font-extrabold text-slate-900 dark:text-white">R$ 89,90</span>
                  <span className="text-[10px] text-slate-400 block">30 dias de acesso</span>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setCasoBloqueadoModal(null)}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl glass-button text-xs font-semibold text-slate-500 hover:text-slate-700"
              >
                Continuar no Gratuito
              </button>
              {onNavegarParaPlanos && (
                <button
                  type="button"
                  onClick={() => {
                    setCasoBloqueadoModal(null);
                    onNavegarParaPlanos();
                  }}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-teal-700/25 transition-all hover:scale-[1.01]"
                >
                  <Crown className="w-4 h-4 text-amber-300" />
                  <span>Desbloquear Atlas Clínico</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
