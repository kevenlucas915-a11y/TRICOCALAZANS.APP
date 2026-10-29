import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  GitCompare, 
  ArrowRightLeft, 
  ZoomIn, 
  ZoomOut, 
  RotateCcw, 
  Maximize2, 
  Minimize2, 
  Microscope, 
  Calendar, 
  MapPin, 
  Camera, 
  Sliders, 
  Check, 
  ChevronDown, 
  X, 
  Sparkles, 
  TrendingUp, 
  TrendingDown, 
  AlertCircle,
  Clock,
  Layers,
  ArrowRight,
  Eye,
  Info
} from 'lucide-react';
import { Paciente, ConsultaRegistro, FotoGlobalPaciente } from '../types/paciente';

export interface ItemFotoComparacao {
  id: string;
  url: string;
  titulo: string;
  data: string;
  tipo: 'tricoscopia' | 'global' | 'consulta';
  areaOuAngulo: string;
  sessionId?: string;
  totalFios?: number;
  totalUF?: number;
  ostiosVazios?: number;
  focosInflamacao?: number;
  observacoes?: string;
}

interface ComparadorPacienteViewProps {
  paciente: Paciente;
  consultas: ConsultaRegistro[];
  fotosGlobais: FotoGlobalPaciente[];
  fotoAInicialUrl?: string;
  fotoBInicialUrl?: string;
  onCarregarSessaoNaBancada?: (sessionId: string) => void;
  onVoltarProntuario?: () => void;
}

export const ComparadorPacienteView: React.FC<ComparadorPacienteViewProps> = ({
  paciente,
  consultas,
  fotosGlobais,
  fotoAInicialUrl,
  fotoBInicialUrl,
  onCarregarSessaoNaBancada,
  onVoltarProntuario
}) => {
  // Consolidação de todas as fotografias clínicas do paciente
  const todasFotos = useMemo<ItemFotoComparacao[]>(() => {
    const list: ItemFotoComparacao[] = [];

    // 1. Fotos Globais Macroscópicas
    fotosGlobais.forEach(fg => {
      if (fg.imagemUrl && fg.imagemUrl.trim() !== '') {
        list.push({
          id: `global_${fg.id}`,
          url: fg.imagemUrl,
          titulo: `Foto Macroscópica • ${fg.angulo}`,
          data: fg.data,
          tipo: 'global',
          areaOuAngulo: fg.angulo,
          observacoes: fg.observacoes
        });
      }
    });

    // 2. Fotos de Consultas e Fototricoscopia
    consultas.forEach(c => {
      const urlPrincipal = c.imagemUrl || c.imagemDataUrl;
      if (urlPrincipal && urlPrincipal.trim() !== '') {
        list.push({
          id: `cons_${c.id}`,
          url: urlPrincipal,
          titulo: c.sessionId ? `Tricoscopia • ${c.area}` : `${c.tipoConsulta || 'Consulta'} • ${c.area}`,
          data: c.data,
          tipo: c.sessionId ? 'tricoscopia' : 'consulta',
          areaOuAngulo: c.area,
          sessionId: c.sessionId,
          totalFios: c.totalFios,
          totalUF: c.totalUF,
          ostiosVazios: c.ostiosVazios,
          focosInflamacao: c.focosInflamacao,
          observacoes: c.anotacoes || c.queixaEvolucao
        });
      }

      if (c.fotos && c.fotos.length > 0) {
        c.fotos.forEach((f, idx) => {
          if (f.url && f.url !== urlPrincipal) {
            list.push({
              id: `cons_foto_${c.id}_${f.id || idx}`,
              url: f.url,
              titulo: f.titulo || `${c.area} • Registro ${idx + 1}`,
              data: f.data || c.data,
              tipo: 'consulta',
              areaOuAngulo: f.area || c.area,
              observacoes: f.observacoes
            });
          }
        });
      }
    });

    // Ordenar cronologicamente (da mais antiga para a mais recente)
    return list.sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime());
  }, [fotosGlobais, consultas]);

  // Sugestões inteligentes de comparação (mesma área/ângulo em datas diferentes)
  const sugestoesComparacao = useMemo(() => {
    const mapaAreas = new Map<string, ItemFotoComparacao[]>();
    todasFotos.forEach(f => {
      const chave = f.areaOuAngulo.toLowerCase().trim();
      const arr = mapaAreas.get(chave) || [];
      arr.push(f);
      mapaAreas.set(chave, arr);
    });

    const pares: Array<{
      area: string;
      itemA: ItemFotoComparacao;
      itemB: ItemFotoComparacao;
      dias: number;
    }> = [];

    mapaAreas.forEach((fotosDaArea, _) => {
      if (fotosDaArea.length >= 2) {
        const itemA = fotosDaArea[0]; // mais antiga
        const itemB = fotosDaArea[fotosDaArea.length - 1]; // mais recente
        if (itemA.id !== itemB.id) {
          const tA = new Date(itemA.data).getTime();
          const tB = new Date(itemB.data).getTime();
          const dias = Math.max(1, Math.round(Math.abs(tB - tA) / (1000 * 60 * 60 * 24)));
          pares.push({
            area: itemA.areaOuAngulo,
            itemA,
            itemB,
            dias
          });
        }
      }
    });

    return pares;
  }, [todasFotos]);

  // Estados das Imagens A e B Selecionadas
  const [fotoAId, setFotoAId] = useState<string>(() => {
    if (fotoAInicialUrl) {
      const match = todasFotos.find(f => f.url === fotoAInicialUrl);
      if (match) return match.id;
    }
    if (sugestoesComparacao.length > 0) {
      return sugestoesComparacao[0].itemA.id;
    }
    return todasFotos[0]?.id || '';
  });

  const [fotoBId, setFotoBId] = useState<string>(() => {
    if (fotoBInicialUrl) {
      const match = todasFotos.find(f => f.url === fotoBInicialUrl);
      if (match) return match.id;
    }
    if (sugestoesComparacao.length > 0) {
      return sugestoesComparacao[0].itemB.id;
    }
    return todasFotos[todasFotos.length - 1]?.id || '';
  });

  // Atualizar quando props iniciais mudarem
  useEffect(() => {
    if (fotoAInicialUrl) {
      const match = todasFotos.find(f => f.url === fotoAInicialUrl);
      if (match) setFotoAId(match.id);
    }
    if (fotoBInicialUrl) {
      const match = todasFotos.find(f => f.url === fotoBInicialUrl);
      if (match) setFotoBId(match.id);
    }
  }, [fotoAInicialUrl, fotoBInicialUrl, todasFotos]);

  const fotoA = useMemo(() => todasFotos.find(f => f.id === fotoAId) || todasFotos[0] || null, [todasFotos, fotoAId]);
  const fotoB = useMemo(() => todasFotos.find(f => f.id === fotoBId) || todasFotos[todasFotos.length - 1] || null, [todasFotos, fotoBId]);

  // Modo de Visualização: 'lado-a-lado' ou 'deslizador' (Split Slider)
  const [modoVisualizacao, setModoVisualizacao] = useState<'lado-a-lado' | 'deslizador'>('lado-a-lado');

  // Posição do Split Slider (0 a 100%)
  const [sliderPosicao, setSliderPosicao] = useState<number>(50);
  const sliderContainerRef = useRef<HTMLDivElement>(null);
  const [arrastandoSlider, setArrastandoSlider] = useState(false);

  // Controle de Zoom & Pan
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [zoomSincronizado, setZoomSincronizado] = useState<boolean>(true);
  const [panA, setPanA] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [panB, setPanB] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [arrastandoA, setArrastandoA] = useState(false);
  const [arrastandoB, setArrastandoB] = useState(false);
  const dragStartRefA = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const dragStartRefB = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Modal para Selecionar Imagem (Lado A ou B)
  const [modalSeletorAberto, setModalSeletorAberto] = useState<'ladoA' | 'ladoB' | null>(null);
  const [filtroCategoriaModal, setFiltroCategoriaModal] = useState<'todas' | 'tricoscopia' | 'global' | 'consulta'>('todas');

  // Modo Tela Cheia
  const [telaCheia, setTelaCheia] = useState(false);
  const containerComparadorRef = useRef<HTMLDivElement>(null);

  // Inverter Lados A e B
  const handleInverterLados = () => {
    const tempA = fotoAId;
    setFotoAId(fotoBId);
    setFotoBId(tempA);
    const tempPan = panA;
    setPanA(panB);
    setPanB(tempPan);
  };

  // Resetar Zoom e Pan
  const handleResetZoomPan = () => {
    setZoomLevel(1);
    setPanA({ x: 0, y: 0 });
    setPanB({ x: 0, y: 0 });
  };

  // Manipulação do Split Slider
  const handleSliderMove = (clientX: number) => {
    if (!sliderContainerRef.current) return;
    const rect = sliderContainerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const porcentagem = Math.min(Math.max((x / rect.width) * 100, 0), 100);
    setSliderPosicao(porcentagem);
  };

  // Calcular dias e intervalo entre as fotos A e B
  const intervaloComparacao = useMemo(() => {
    if (!fotoA || !fotoB) return null;
    const tA = new Date(fotoA.data).getTime();
    const tB = new Date(fotoB.data).getTime();
    const diffMs = Math.abs(tB - tA);
    const diffDias = Math.round(diffMs / (1000 * 60 * 60 * 24));
    const semanas = Math.floor(diffDias / 7);
    const meses = Math.floor(diffDias / 30.4);

    return {
      dias: diffDias,
      semanas,
      meses,
      textoFormatado: diffDias === 0 
        ? 'Mesma data' 
        : diffDias < 30 
          ? `${diffDias} dias de intervalo (${semanas} ${semanas === 1 ? 'semana' : 'semanas'})` 
          : `${diffDias} dias de intervalo (${meses} ${meses === 1 ? 'mês' : 'meses'})`
    };
  }, [fotoA, fotoB]);

  // Deltas Métricos da Tricoscopia (A vs B)
  const deltasMetricos = useMemo(() => {
    if (!fotoA || !fotoB) return null;
    const temMetricasA = fotoA.totalFios !== undefined || fotoA.totalUF !== undefined;
    const temMetricasB = fotoB.totalFios !== undefined || fotoB.totalUF !== undefined;

    if (!temMetricasA && !temMetricasB) return null;

    const fiosA = fotoA.totalFios || 0;
    const fiosB = fotoB.totalFios || 0;
    const deltaFios = fiosB - fiosA;
    const pctFios = fiosA > 0 ? ((deltaFios / fiosA) * 100).toFixed(1) : null;

    const ufA = fotoA.totalUF || 0;
    const ufB = fotoB.totalUF || 0;
    const deltaUf = ufB - ufA;
    const pctUf = ufA > 0 ? ((deltaUf / ufA) * 100).toFixed(1) : null;

    const ostiosA = fotoA.ostiosVazios || 0;
    const ostiosB = fotoB.ostiosVazios || 0;
    const deltaOstios = ostiosB - ostiosA;

    return {
      fiosA,
      fiosB,
      deltaFios,
      pctFios,
      ufA,
      ufB,
      deltaUf,
      pctUf,
      ostiosA,
      ostiosB,
      deltaOstios
    };
  }, [fotoA, fotoB]);

  // Filtragem de fotos no modal
  const fotosFiltradasModal = useMemo(() => {
    if (filtroCategoriaModal === 'todas') return todasFotos;
    return todasFotos.filter(f => f.tipo === filtroCategoriaModal);
  }, [todasFotos, filtroCategoriaModal]);

  // Alternar tela cheia
  const handleToggleFullscreen = () => {
    if (!containerComparadorRef.current) return;
    if (!document.fullscreenElement) {
      containerComparadorRef.current.requestFullscreen().then(() => setTelaCheia(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setTelaCheia(false)).catch(() => {});
    }
  };

  useEffect(() => {
    const handleFsChange = () => {
      setTelaCheia(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  if (todasFotos.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-stone-200/90 dark:border-slate-800 p-8 sm:p-12 text-center space-y-4 animate-fadeIn">
        <div className="w-16 h-16 rounded-2xl bg-teal-50 dark:bg-teal-950 text-teal-600 dark:text-teal-400 flex items-center justify-center mx-auto border border-teal-200/80 dark:border-teal-800">
          <GitCompare className="w-8 h-8" />
        </div>
        <div className="space-y-1.5 max-w-md mx-auto">
          <h3 className="text-base font-bold text-stone-900 dark:text-slate-100">
            Nenhuma foto registrada para este paciente
          </h3>
          <p className="text-xs text-stone-500 dark:text-slate-400 leading-relaxed">
            Para realizar comparações lado a lado e avaliar a evolução clínica (Antes e Depois), capture fotos na <strong>Bancada de Tricoscopia</strong> ou faça o upload de <strong>Fotografias Macroscópicas Globais</strong>.
          </p>
        </div>
        {onVoltarProntuario && (
          <button
            type="button"
            onClick={onVoltarProntuario}
            className="px-4 py-2 rounded-xl bg-teal-700 text-white text-xs font-bold shadow-xs hover:bg-teal-800 transition-colors"
          >
            Voltar ao Prontuário
          </button>
        )}
      </div>
    );
  }

  return (
    <div 
      ref={containerComparadorRef}
      className={`space-y-5 animate-fadeIn ${telaCheia ? 'bg-slate-950 p-6 overflow-y-auto min-h-screen text-slate-100' : ''}`}
    >
      {/* ========================================================================= */}
      {/* BARRA SUPERIOR: CONTROLES PRINCIPAIS E MODO DE VISUALIZAÇÃO */}
      {/* ========================================================================= */}
      <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-3xl border border-stone-200/90 dark:border-slate-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Identificação e Título */}
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2.5 py-0.5 rounded-full bg-teal-50 dark:bg-teal-950 text-teal-800 dark:text-teal-300 border border-teal-200 dark:border-teal-800 text-[11px] font-bold flex items-center gap-1.5">
              <GitCompare className="w-3.5 h-3.5" />
              <span>Comparador Clínico Lado a Lado</span>
            </span>
            <span className="px-2 py-0.5 rounded-full bg-stone-100 dark:bg-slate-800 text-stone-700 dark:text-slate-300 text-[11px] font-semibold">
              {paciente.nome}
            </span>
            {intervaloComparacao && (
              <span className="px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 text-[11px] font-mono font-bold flex items-center gap-1 border border-emerald-200 dark:border-emerald-800">
                <Clock className="w-3 h-3 text-emerald-600" />
                <span>{intervaloComparacao.textoFormatado}</span>
              </span>
            )}
          </div>
          <p className="text-xs text-stone-500 dark:text-slate-400">
            Compare exames de fototricoscopia, contagens foliculares e fotos clínicas macroscópicas do próprio paciente.
          </p>
        </div>

        {/* Barra de Ferramentas de Zoom, Inversão e Modo */}
        <div className="flex items-center gap-2 flex-wrap self-start md:self-center">
          {/* Alternador de Modo: Lado a Lado vs Cortina Slider */}
          <div className="p-1 rounded-2xl bg-stone-100 dark:bg-slate-800 flex items-center gap-1 border border-stone-200 dark:border-slate-700">
            <button
              type="button"
              onClick={() => setModoVisualizacao('lado-a-lado')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                modoVisualizacao === 'lado-a-lado'
                  ? 'bg-white dark:bg-slate-900 text-teal-900 dark:text-teal-200 shadow-xs'
                  : 'text-stone-600 dark:text-slate-400 hover:text-stone-900'
              }`}
              title="Visualizar duas imagens lado a lado simultaneamente"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Lado a Lado</span>
            </button>
            <button
              type="button"
              onClick={() => setModoVisualizacao('deslizador')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                modoVisualizacao === 'deslizador'
                  ? 'bg-white dark:bg-slate-900 text-teal-900 dark:text-teal-200 shadow-xs'
                  : 'text-stone-600 dark:text-slate-400 hover:text-stone-900'
              }`}
              title="Cortina deslizante interativa para sobrepor e deslizar Antes vs Depois"
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Cortina Antes/Depois</span>
            </button>
          </div>

          {/* Inverter Posições */}
          <button
            type="button"
            onClick={handleInverterLados}
            className="p-2 rounded-xl bg-stone-100 dark:bg-slate-800 hover:bg-teal-50 dark:hover:bg-slate-700 text-stone-700 dark:text-slate-200 border border-stone-200 dark:border-slate-700 transition-colors shadow-xs"
            title="Inverter Lado A e Lado B"
          >
            <ArrowRightLeft className="w-4 h-4" />
          </button>

          {/* Zoom In, Out e Reset */}
          <div className="flex items-center gap-1 bg-stone-100 dark:bg-slate-800 p-1 rounded-xl border border-stone-200 dark:border-slate-700">
            <button
              type="button"
              onClick={() => setZoomLevel(prev => Math.max(1, +(prev - 0.25).toFixed(2)))}
              className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-slate-900 text-stone-600 dark:text-slate-300"
              title="Reduzir Zoom"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="text-[11px] font-mono font-bold px-1.5 min-w-[36px] text-center text-stone-700 dark:text-slate-200">
              {Math.round(zoomLevel * 100)}%
            </span>
            <button
              type="button"
              onClick={() => setZoomLevel(prev => Math.min(4, +(prev + 0.25).toFixed(2)))}
              className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-slate-900 text-stone-600 dark:text-slate-300"
              title="Aumentar Zoom"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            {zoomLevel > 1 && (
              <button
                type="button"
                onClick={handleResetZoomPan}
                className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-slate-900 text-stone-500 hover:text-stone-900"
                title="Resetar Zoom e Posição"
              >
                <RotateCcw className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Alternar Zoom Sincronizado */}
          <label className="flex items-center gap-1.5 text-[11px] font-semibold text-stone-600 dark:text-slate-300 cursor-pointer select-none bg-stone-50 dark:bg-slate-800 px-2.5 py-1.5 rounded-xl border border-stone-200 dark:border-slate-700">
            <input
              type="checkbox"
              checked={zoomSincronizado}
              onChange={(e) => setZoomSincronizado(e.target.checked)}
              className="rounded text-teal-600 focus:ring-teal-500 w-3.5 h-3.5"
            />
            <span>Sincronizar Zoom</span>
          </label>

          {/* Tela Cheia */}
          <button
            type="button"
            onClick={handleToggleFullscreen}
            className="p-2 rounded-xl bg-stone-100 dark:bg-slate-800 hover:bg-teal-50 dark:hover:bg-slate-700 text-stone-700 dark:text-slate-200 border border-stone-200 dark:border-slate-700 transition-colors shadow-xs"
            title={telaCheia ? "Sair da Tela Cheia" : "Apresentar em Tela Cheia ao Paciente"}
          >
            {telaCheia ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SUGESTÕES RÁPIDAS DE COMPARAÇÃO (MESMA ÁREA / EVOLUÇÃO) */}
      {/* ========================================================================= */}
      {sugestoesComparacao.length > 0 && (
        <div className="bg-stone-50/80 dark:bg-slate-900/60 p-3.5 rounded-2xl border border-stone-200/80 dark:border-slate-800 flex items-center gap-2 overflow-x-auto scrollbar-thin">
          <span className="text-[10px] font-bold text-stone-500 dark:text-slate-400 uppercase tracking-wider shrink-0 flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>Evoluções Sugeridas:</span>
          </span>
          <div className="flex items-center gap-2">
            {sugestoesComparacao.map((sug, idx) => {
              const isActive = (fotoA?.id === sug.itemA.id && fotoB?.id === sug.itemB.id) ||
                               (fotoA?.id === sug.itemB.id && fotoB?.id === sug.itemA.id);
              return (
                <button
                  key={`sug_${idx}`}
                  type="button"
                  onClick={() => {
                    setFotoAId(sug.itemA.id);
                    setFotoBId(sug.itemB.id);
                  }}
                  className={`px-3 py-1 rounded-xl text-xs font-semibold shrink-0 transition-all border flex items-center gap-1.5 ${
                    isActive
                      ? 'bg-teal-700 text-white border-teal-800 shadow-xs'
                      : 'bg-white dark:bg-slate-800 text-stone-700 dark:text-slate-300 border-stone-200 dark:border-slate-700 hover:border-teal-500'
                  }`}
                >
                  <MapPin className="w-3 h-3 text-rose-500 shrink-0" />
                  <span>{sug.area}</span>
                  <span className="text-[10px] font-mono opacity-80">
                    ({new Date(sug.itemA.data).toLocaleDateString('pt-BR')} ➜ {new Date(sug.itemB.data).toLocaleDateString('pt-BR')})
                  </span>
                  <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-black/10 dark:bg-white/10 font-bold">
                    {sug.dias}d
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* PAINEL DE EVOLUÇÃO MÉTRICA (DELTAS DA BANCADA DE TRICOSCOPIA) */}
      {/* ========================================================================= */}
      {deltasMetricos && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-gradient-to-r from-stone-50 via-teal-50/20 to-stone-50 dark:from-slate-900 dark:via-teal-950/20 dark:to-slate-900 p-4 rounded-3xl border border-stone-200/90 dark:border-slate-800 shadow-xs animate-fadeIn">
          {/* Fios */}
          <div className="p-3 rounded-2xl bg-white dark:bg-slate-800/80 border border-stone-200/80 dark:border-slate-700 space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block">
              Contagem de Fios
            </span>
            <div className="flex items-baseline justify-between">
              <span className="text-sm sm:text-base font-extrabold text-stone-900 dark:text-slate-100 font-mono">
                {deltasMetricos.fiosA} ➜ {deltasMetricos.fiosB}
              </span>
              <span className={`text-xs font-bold flex items-center gap-0.5 ${
                deltasMetricos.deltaFios >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
              }`}>
                {deltasMetricos.deltaFios >= 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                <span>{deltasMetricos.deltaFios >= 0 ? `+${deltasMetricos.deltaFios}` : deltasMetricos.deltaFios}</span>
                {deltasMetricos.pctFios && <span className="text-[10px]">({deltasMetricos.pctFios}%)</span>}
              </span>
            </div>
          </div>

          {/* Unidades Foliculares */}
          <div className="p-3 rounded-2xl bg-white dark:bg-slate-800/80 border border-stone-200/80 dark:border-slate-700 space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block">
              Unidades Foliculares (UF)
            </span>
            <div className="flex items-baseline justify-between">
              <span className="text-sm sm:text-base font-extrabold text-stone-900 dark:text-slate-100 font-mono">
                {deltasMetricos.ufA} ➜ {deltasMetricos.ufB}
              </span>
              <span className={`text-xs font-bold flex items-center gap-0.5 ${
                deltasMetricos.deltaUf >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
              }`}>
                {deltasMetricos.deltaUf >= 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                <span>{deltasMetricos.deltaUf >= 0 ? `+${deltasMetricos.deltaUf}` : deltasMetricos.deltaUf}</span>
                {deltasMetricos.pctUf && <span className="text-[10px]">({deltasMetricos.pctUf}%)</span>}
              </span>
            </div>
          </div>

          {/* Óstios Vazios */}
          <div className="p-3 rounded-2xl bg-white dark:bg-slate-800/80 border border-stone-200/80 dark:border-slate-700 space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block">
              Óstios Foliculares Vazios
            </span>
            <div className="flex items-baseline justify-between">
              <span className="text-sm sm:text-base font-extrabold text-stone-900 dark:text-slate-100 font-mono">
                {deltasMetricos.ostiosA} ➜ {deltasMetricos.ostiosB}
              </span>
              <span className={`text-xs font-bold flex items-center gap-0.5 ${
                deltasMetricos.deltaOstios <= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'
              }`}>
                {deltasMetricos.deltaOstios <= 0 ? <TrendingDown className="w-3.5 h-3.5" /> : <TrendingUp className="w-3.5 h-3.5" />}
                <span>{deltasMetricos.deltaOstios > 0 ? `+${deltasMetricos.deltaOstios}` : deltasMetricos.deltaOstios}</span>
              </span>
            </div>
          </div>

          {/* Intervalo Clínico */}
          <div className="p-3 rounded-2xl bg-white dark:bg-slate-800/80 border border-stone-200/80 dark:border-slate-700 space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block">
              Período de Tratamento
            </span>
            <div className="flex items-baseline justify-between">
              <span className="text-sm sm:text-base font-extrabold text-teal-800 dark:text-teal-300 font-mono">
                {intervaloComparacao?.dias || 0} dias
              </span>
              <span className="text-[11px] font-semibold text-stone-500">
                {intervaloComparacao?.semanas ? `${intervaloComparacao.semanas} sem.` : 'Direto'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ÁREA PRINCIPAL: VISUALIZADOR LADO A LADO OU CORTINA DESLIZANTE */}
      {/* ========================================================================= */}
      {modoVisualizacao === 'lado-a-lado' ? (
        /* MODO 1: LADO A LADO DUAS COLUNAS */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* PAINEL LADO A */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-stone-200/90 dark:border-slate-800 overflow-hidden shadow-xs flex flex-col">
            {/* Header Lado A */}
            <div className="p-3.5 bg-stone-50 dark:bg-slate-950/70 border-b border-stone-200/80 dark:border-slate-800 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shrink-0" />
                <span className="text-xs font-bold uppercase tracking-wider text-rose-700 dark:text-rose-400 shrink-0">
                  Lado A (Anterior)
                </span>
                {fotoA && (
                  <span className="text-[11px] font-mono text-stone-500 dark:text-slate-400 truncate">
                    • {new Date(fotoA.data).toLocaleDateString('pt-BR')} • {fotoA.areaOuAngulo}
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={() => setModalSeletorAberto('ladoA')}
                className="px-2.5 py-1 rounded-xl bg-white dark:bg-slate-800 hover:bg-stone-100 dark:hover:bg-slate-700 border border-stone-200 dark:border-slate-700 text-xs font-semibold text-stone-700 dark:text-slate-200 flex items-center gap-1.5 transition-colors shrink-0 shadow-2xs"
              >
                <span>Trocar Imagem</span>
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Viewport da Imagem A */}
            <div 
              className="relative w-full h-80 sm:h-96 md:h-[460px] bg-black/95 overflow-hidden flex items-center justify-center select-none cursor-grab active:cursor-grabbing"
              onMouseDown={(e) => {
                if (zoomLevel > 1) {
                  setArrastandoA(true);
                  dragStartRefA.current = { x: e.clientX - panA.x, y: e.clientY - panA.y };
                }
              }}
              onMouseMove={(e) => {
                if (arrastandoA && zoomLevel > 1) {
                  const newX = e.clientX - dragStartRefA.current.x;
                  const newY = e.clientY - dragStartRefA.current.y;
                  setPanA({ x: newX, y: newY });
                  if (zoomSincronizado) setPanB({ x: newX, y: newY });
                }
              }}
              onMouseUp={() => setArrastandoA(false)}
              onMouseLeave={() => setArrastandoA(false)}
            >
              {fotoA ? (
                <img
                  src={fotoA.url}
                  alt={fotoA.titulo}
                  draggable={false}
                  style={{
                    transform: `translate(${panA.x}px, ${panA.y}px) scale(${zoomLevel})`,
                    transition: arrastandoA ? 'none' : 'transform 0.15s ease-out'
                  }}
                  className="max-w-full max-h-full object-contain pointer-events-none select-none"
                />
              ) : (
                <div className="text-stone-500 text-xs">Selecione uma imagem para o Lado A</div>
              )}

              {/* Badges Flutuantes sobre a foto A */}
              {fotoA && (
                <div className="absolute top-3 left-3 flex flex-col gap-1.5 pointer-events-none">
                  <span className="px-2.5 py-1 rounded-xl bg-black/75 backdrop-blur-xs text-white text-[11px] font-mono font-bold border border-white/10 shadow-md">
                    📅 {new Date(fotoA.data).toLocaleDateString('pt-BR')}
                  </span>
                  <span className="px-2 py-0.5 rounded-lg bg-rose-600/90 text-white text-[10px] font-bold uppercase tracking-wider shadow-md w-max">
                    {fotoA.areaOuAngulo}
                  </span>
                </div>
              )}

              {fotoA && (fotoA.totalFios !== undefined || fotoA.totalUF !== undefined) && (
                <div className="absolute bottom-3 left-3 bg-black/80 backdrop-blur-xs text-white p-2 rounded-xl border border-white/10 text-[10px] font-mono space-y-0.5 pointer-events-none shadow-md">
                  {fotoA.totalFios !== undefined && <div>Total Fios: <strong>{fotoA.totalFios}</strong></div>}
                  {fotoA.totalUF !== undefined && <div>Unidades: <strong>{fotoA.totalUF} UF</strong></div>}
                  {fotoA.ostiosVazios !== undefined && <div>Óstios Vazios: <strong>{fotoA.ostiosVazios}</strong></div>}
                </div>
              )}
            </div>

            {/* Rodapé e Ações do Lado A */}
            {fotoA && (
              <div className="p-3 bg-stone-50 dark:bg-slate-950/70 border-t border-stone-200/80 dark:border-slate-800 text-xs flex items-center justify-between gap-2">
                <p className="text-stone-600 dark:text-slate-400 text-[11px] truncate" title={fotoA.observacoes || fotoA.titulo}>
                  {fotoA.observacoes || fotoA.titulo}
                </p>
                {fotoA.sessionId && onCarregarSessaoNaBancada && (
                  <button
                    type="button"
                    onClick={() => onCarregarSessaoNaBancada(fotoA.sessionId!)}
                    className="px-2.5 py-1 rounded-lg bg-teal-50 dark:bg-teal-950 text-teal-800 dark:text-teal-300 hover:bg-teal-100 text-[11px] font-bold flex items-center gap-1 border border-teal-200 dark:border-teal-800 shrink-0"
                    title="Abrir este exame na Bancada de Tricoscopia"
                  >
                    <Microscope className="w-3.5 h-3.5" />
                    <span>Bancada</span>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* PAINEL LADO B */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-stone-200/90 dark:border-slate-800 overflow-hidden shadow-xs flex flex-col">
            {/* Header Lado B */}
            <div className="p-3.5 bg-stone-50 dark:bg-slate-950/70 border-b border-stone-200/80 dark:border-slate-800 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-2.5 h-2.5 rounded-full bg-teal-600 shrink-0" />
                <span className="text-xs font-bold uppercase tracking-wider text-teal-800 dark:text-teal-400 shrink-0">
                  Lado B (Recente / Evolução)
                </span>
                {fotoB && (
                  <span className="text-[11px] font-mono text-stone-500 dark:text-slate-400 truncate">
                    • {new Date(fotoB.data).toLocaleDateString('pt-BR')} • {fotoB.areaOuAngulo}
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={() => setModalSeletorAberto('ladoB')}
                className="px-2.5 py-1 rounded-xl bg-white dark:bg-slate-800 hover:bg-stone-100 dark:hover:bg-slate-700 border border-stone-200 dark:border-slate-700 text-xs font-semibold text-stone-700 dark:text-slate-200 flex items-center gap-1.5 transition-colors shrink-0 shadow-2xs"
              >
                <span>Trocar Imagem</span>
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Viewport da Imagem B */}
            <div 
              className="relative w-full h-80 sm:h-96 md:h-[460px] bg-black/95 overflow-hidden flex items-center justify-center select-none cursor-grab active:cursor-grabbing"
              onMouseDown={(e) => {
                if (zoomLevel > 1) {
                  setArrastandoB(true);
                  dragStartRefB.current = { x: e.clientX - panB.x, y: e.clientY - panB.y };
                }
              }}
              onMouseMove={(e) => {
                if (arrastandoB && zoomLevel > 1) {
                  const newX = e.clientX - dragStartRefB.current.x;
                  const newY = e.clientY - dragStartRefB.current.y;
                  setPanB({ x: newX, y: newY });
                  if (zoomSincronizado) setPanA({ x: newX, y: newY });
                }
              }}
              onMouseUp={() => setArrastandoB(false)}
              onMouseLeave={() => setArrastandoB(false)}
            >
              {fotoB ? (
                <img
                  src={fotoB.url}
                  alt={fotoB.titulo}
                  draggable={false}
                  style={{
                    transform: `translate(${panB.x}px, ${panB.y}px) scale(${zoomLevel})`,
                    transition: arrastandoB ? 'none' : 'transform 0.15s ease-out'
                  }}
                  className="max-w-full max-h-full object-contain pointer-events-none select-none"
                />
              ) : (
                <div className="text-stone-500 text-xs">Selecione uma imagem para o Lado B</div>
              )}

              {/* Badges Flutuantes sobre a foto B */}
              {fotoB && (
                <div className="absolute top-3 right-3 flex flex-col items-end gap-1.5 pointer-events-none">
                  <span className="px-2.5 py-1 rounded-xl bg-black/75 backdrop-blur-xs text-white text-[11px] font-mono font-bold border border-white/10 shadow-md">
                    📅 {new Date(fotoB.data).toLocaleDateString('pt-BR')}
                  </span>
                  <span className="px-2 py-0.5 rounded-lg bg-teal-600/90 text-white text-[10px] font-bold uppercase tracking-wider shadow-md w-max">
                    {fotoB.areaOuAngulo}
                  </span>
                </div>
              )}

              {fotoB && (fotoB.totalFios !== undefined || fotoB.totalUF !== undefined) && (
                <div className="absolute bottom-3 right-3 bg-black/80 backdrop-blur-xs text-white p-2 rounded-xl border border-white/10 text-[10px] font-mono space-y-0.5 pointer-events-none shadow-md text-right">
                  {fotoB.totalFios !== undefined && <div>Total Fios: <strong>{fotoB.totalFios}</strong></div>}
                  {fotoB.totalUF !== undefined && <div>Unidades: <strong>{fotoB.totalUF} UF</strong></div>}
                  {fotoB.ostiosVazios !== undefined && <div>Óstios Vazios: <strong>{fotoB.ostiosVazios}</strong></div>}
                </div>
              )}
            </div>

            {/* Rodapé e Ações do Lado B */}
            {fotoB && (
              <div className="p-3 bg-stone-50 dark:bg-slate-950/70 border-t border-stone-200/80 dark:border-slate-800 text-xs flex items-center justify-between gap-2">
                <p className="text-stone-600 dark:text-slate-400 text-[11px] truncate" title={fotoB.observacoes || fotoB.titulo}>
                  {fotoB.observacoes || fotoB.titulo}
                </p>
                {fotoB.sessionId && onCarregarSessaoNaBancada && (
                  <button
                    type="button"
                    onClick={() => onCarregarSessaoNaBancada(fotoB.sessionId!)}
                    className="px-2.5 py-1 rounded-lg bg-teal-50 dark:bg-teal-950 text-teal-800 dark:text-teal-300 hover:bg-teal-100 text-[11px] font-bold flex items-center gap-1 border border-teal-200 dark:border-teal-800 shrink-0"
                    title="Abrir este exame na Bancada de Tricoscopia"
                  >
                    <Microscope className="w-3.5 h-3.5" />
                    <span>Bancada</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* MODO 2: CORTINA DESLIZANTE (SPLIT SLIDER ANTES / DEPOIS) */
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-stone-200/90 dark:border-slate-800 overflow-hidden shadow-xs space-y-3 p-4">
          <div className="flex items-center justify-between gap-3 text-xs border-b border-stone-100 dark:border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <span className="font-bold text-stone-900 dark:text-slate-100">
                Cortina Deslizante Antes & Depois
              </span>
              <span className="text-stone-400 text-[11px]">
                (Arraste a barra central para revelar a transição clínica)
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setModalSeletorAberto('ladoA')}
                className="px-2.5 py-1 rounded-xl bg-stone-100 dark:bg-slate-800 text-xs font-semibold text-rose-700 dark:text-rose-400"
              >
                Antes: {fotoA?.areaOuAngulo} ({fotoA ? new Date(fotoA.data).toLocaleDateString('pt-BR') : ''}) ▾
              </button>
              <button
                type="button"
                onClick={() => setModalSeletorAberto('ladoB')}
                className="px-2.5 py-1 rounded-xl bg-stone-100 dark:bg-slate-800 text-xs font-semibold text-teal-800 dark:text-teal-400"
              >
                Depois: {fotoB?.areaOuAngulo} ({fotoB ? new Date(fotoB.data).toLocaleDateString('pt-BR') : ''}) ▾
              </button>
            </div>
          </div>

          <div
            ref={sliderContainerRef}
            onMouseDown={() => setArrastandoSlider(true)}
            onMouseUp={() => setArrastandoSlider(false)}
            onMouseMove={(e) => {
              if (arrastandoSlider) handleSliderMove(e.clientX);
            }}
            onTouchMove={(e) => {
              if (e.touches[0]) handleSliderMove(e.touches[0].clientX);
            }}
            className="relative w-full h-96 sm:h-[480px] md:h-[540px] bg-black rounded-2xl overflow-hidden select-none cursor-ew-resize"
          >
            {/* Foto B (Depois - Fundo completo) */}
            {fotoB && (
              <img
                src={fotoB.url}
                alt="Depois"
                draggable={false}
                className="absolute inset-0 w-full h-full object-contain pointer-events-none select-none"
              />
            )}

            {/* Foto A (Antes - Cortada pelo clip-path de acordo com a porcentagem) */}
            {fotoA && (
              <div
                style={{
                  clipPath: `polygon(0 0, ${sliderPosicao}% 0, ${sliderPosicao}% 100%, 0 100%)`
                }}
                className="absolute inset-0 w-full h-full overflow-hidden"
              >
                <img
                  src={fotoA.url}
                  alt="Antes"
                  draggable={false}
                  className="absolute inset-0 w-full h-full object-contain pointer-events-none select-none"
                />
              </div>
            )}

            {/* Linha Divisória com Alça de Arraste */}
            <div
              style={{ left: `${sliderPosicao}%` }}
              className="absolute top-0 bottom-0 w-1 bg-white shadow-2xl z-30 pointer-events-none"
            >
              <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-white text-stone-900 shadow-xl flex items-center justify-center border-2 border-stone-900/20">
                <ArrowRightLeft className="w-4 h-4 text-stone-800" />
              </div>
            </div>

            {/* Legendas Antes e Depois flutuantes */}
            <div className="absolute top-4 left-4 z-20 pointer-events-none">
              <span className="px-3 py-1 rounded-xl bg-black/80 backdrop-blur-xs text-white text-xs font-bold border border-white/20 shadow-lg">
                ANTES • {fotoA ? new Date(fotoA.data).toLocaleDateString('pt-BR') : ''}
              </span>
            </div>

            <div className="absolute top-4 right-4 z-20 pointer-events-none">
              <span className="px-3 py-1 rounded-xl bg-teal-800/90 backdrop-blur-xs text-white text-xs font-bold border border-white/20 shadow-lg">
                DEPOIS • {fotoB ? new Date(fotoB.data).toLocaleDateString('pt-BR') : ''}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL SELETOR DE IMAGEM (PARA ESCOLHER LADO A OU LADO B) */}
      {/* ========================================================================= */}
      {modalSeletorAberto && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex flex-col items-center justify-start pt-6 sm:pt-10 p-3 sm:p-5 overflow-y-auto overscroll-contain animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-800 rounded-3xl w-full max-w-3xl p-5 sm:p-6 space-y-4 shadow-2xl max-h-[88vh] overflow-y-auto mb-8 sm:mb-12">
            {/* Header do Modal */}
            <div className="flex items-center justify-between border-b border-stone-100 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-stone-900 dark:text-slate-100 flex items-center gap-2">
                  <Camera className="w-5 h-5 text-teal-600" />
                  <span>
                    Selecionar Imagem para o {modalSeletorAberto === 'ladoA' ? 'Lado A (Anterior / Referência)' : 'Lado B (Recente / Evolução)'}
                  </span>
                </h3>
                <p className="text-xs text-stone-500 dark:text-slate-400 mt-0.5">
                  Fotos registradas no prontuário de {paciente.nome}.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setModalSeletorAberto(null)}
                className="p-1 rounded-lg text-stone-400 hover:text-stone-700 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Categorias / Filtros de Tipo */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
              <button
                type="button"
                onClick={() => setFiltroCategoriaModal('todas')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border ${
                  filtroCategoriaModal === 'todas'
                    ? 'bg-stone-900 text-white border-stone-900 dark:bg-white dark:text-slate-900'
                    : 'bg-stone-50 dark:bg-slate-800 text-stone-600 dark:text-slate-400 border-stone-200 dark:border-slate-700'
                }`}
              >
                Todas ({todasFotos.length})
              </button>
              <button
                type="button"
                onClick={() => setFiltroCategoriaModal('tricoscopia')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border ${
                  filtroCategoriaModal === 'tricoscopia'
                    ? 'bg-teal-700 text-white border-teal-700'
                    : 'bg-stone-50 dark:bg-slate-800 text-stone-600 dark:text-slate-400 border-stone-200 dark:border-slate-700'
                }`}
              >
                Tricoscopia Couro Cabeludo ({todasFotos.filter(f => f.tipo === 'tricoscopia').length})
              </button>
              <button
                type="button"
                onClick={() => setFiltroCategoriaModal('global')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border ${
                  filtroCategoriaModal === 'global'
                    ? 'bg-rose-700 text-white border-rose-700'
                    : 'bg-stone-50 dark:bg-slate-800 text-stone-600 dark:text-slate-400 border-stone-200 dark:border-slate-700'
                }`}
              >
                Fotos Macroscópicas ({todasFotos.filter(f => f.tipo === 'global').length})
              </button>
              <button
                type="button"
                onClick={() => setFiltroCategoriaModal('consulta')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border ${
                  filtroCategoriaModal === 'consulta'
                    ? 'bg-teal-700 text-white border-teal-700'
                    : 'bg-stone-50 dark:bg-slate-800 text-stone-600 dark:text-slate-400 border-stone-200 dark:border-slate-700'
                }`}
              >
                Consultas Clínicas ({todasFotos.filter(f => f.tipo === 'consulta').length})
              </button>
            </div>

            {/* Grid de Imagens Selecionáveis */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 pt-2 max-h-[60vh] overflow-y-auto">
              {fotosFiltradasModal.map(foto => {
                const isSelectedCurrent = modalSeletorAberto === 'ladoA' ? fotoA?.id === foto.id : fotoB?.id === foto.id;
                const isSelectedOther = modalSeletorAberto === 'ladoA' ? fotoB?.id === foto.id : fotoA?.id === foto.id;

                return (
                  <button
                    key={foto.id}
                    type="button"
                    onClick={() => {
                      if (modalSeletorAberto === 'ladoA') {
                        setFotoAId(foto.id);
                      } else {
                        setFotoBId(foto.id);
                      }
                      setModalSeletorAberto(null);
                    }}
                    className={`p-2 rounded-2xl border text-left transition-all relative group flex flex-col justify-between ${
                      isSelectedCurrent
                        ? 'bg-teal-50 dark:bg-teal-950/60 border-teal-600 ring-2 ring-teal-500 shadow-md'
                        : isSelectedOther
                          ? 'bg-stone-100/60 dark:bg-slate-800/40 border-stone-200 dark:border-slate-700 opacity-70 hover:opacity-100'
                          : 'bg-stone-50 dark:bg-slate-950 hover:bg-white dark:hover:bg-slate-800 border-stone-200 dark:border-slate-800 hover:border-teal-400'
                    }`}
                  >
                    <div className="relative aspect-square w-full rounded-xl overflow-hidden bg-black mb-2">
                      <img
                        src={foto.url}
                        alt={foto.titulo}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                      <span className="absolute top-1.5 left-1.5 px-2 py-0.5 rounded-md bg-black/75 text-white text-[9px] font-mono font-bold">
                        {new Date(foto.data).toLocaleDateString('pt-BR')}
                      </span>
                      {isSelectedCurrent && (
                        <span className="absolute top-1.5 right-1.5 p-1 rounded-full bg-teal-600 text-white shadow-md">
                          <Check className="w-3 h-3" />
                        </span>
                      )}
                      {isSelectedOther && (
                        <span className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded-md bg-black/80 text-amber-300 text-[9px] font-bold">
                          No outro lado
                        </span>
                      )}
                    </div>

                    <div className="space-y-0.5 min-w-0 w-full">
                      <span className="text-[10px] font-bold text-stone-900 dark:text-slate-100 truncate block">
                        {foto.areaOuAngulo}
                      </span>
                      <span className="text-[9px] text-stone-400 uppercase tracking-wider block">
                        {foto.tipo === 'tricoscopia' ? 'Tricoscopia' : foto.tipo === 'global' ? 'Foto Global' : 'Consulta'}
                      </span>
                      {foto.totalFios !== undefined && (
                        <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-mono font-bold block">
                          {foto.totalFios} fios • {foto.totalUF} UFs
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
