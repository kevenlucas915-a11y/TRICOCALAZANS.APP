import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Annotation, AnnotationType } from '../services/annotations';
import { 
  Hand, 
  Undo2, 
  Redo2, 
  ZoomIn, 
  ZoomOut, 
  Maximize2, 
  Eye, 
  EyeOff, 
  Trash2, 
  Check, 
  X, 
  SlidersHorizontal,
  Edit3,
  Flame,
  Save,
  Loader2
} from 'lucide-react';

export interface BancadaMarcacaoProps {
  imageUrl: string;
  annotations: Annotation[];
  onChangeAnnotations: (annotations: Annotation[]) => void;
  modoAtivo: 'mover' | AnnotationType;
  onChangeModoAtivo: (modo: 'mover' | AnnotationType) => void;
  visivel: boolean;
  onToggleVisivel: () => void;
  zoom: number;
  onChangeZoom: (zoom: number) => void;
  onResetZoom: () => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onClearAll: () => void;
  onEditAchado: (annotation: Annotation) => void;
  selectedId: string | null;
  onSelectId: (id: string | null) => void;
  filtroVascular?: boolean;
  filtroInversao?: boolean;
  mostrarGrade?: boolean;
  onSalvar?: () => void;
  salvando?: boolean;
}

export const CORES_TIPO: Record<AnnotationType, { border: string; bg: string; text: string; hex: string; label: string }> = {
  unitario: {
    border: 'border-blue-600',
    bg: 'bg-blue-600/25',
    text: 'text-blue-600',
    hex: '#2563EB',
    label: 'Unitário (1 fio)'
  },
  duplo: {
    border: 'border-cyan-500',
    bg: 'bg-cyan-500/25',
    text: 'text-cyan-500',
    hex: '#06B6D4',
    label: 'Duplo (2 fios)'
  },
  triplo: {
    border: 'border-emerald-600',
    bg: 'bg-emerald-600/25',
    text: 'text-emerald-600',
    hex: '#16A34A',
    label: 'Triplo (3 fios)'
  },
  ostio_vazio: {
    border: 'border-orange-500',
    bg: 'bg-orange-500/25',
    text: 'text-orange-500',
    hex: '#F97316',
    label: 'Óstio vazio'
  },
  achado: {
    border: 'border-rose-600',
    bg: 'bg-rose-600/25',
    text: 'text-rose-600',
    hex: '#DC2626',
    label: 'Achado'
  },
  inflamacao: {
    border: 'border-fuchsia-600',
    bg: 'bg-fuchsia-600/25',
    text: 'text-fuchsia-600',
    hex: '#C026D3',
    label: 'Inflamação'
  }
};

export const BancadaMarcacao: React.FC<BancadaMarcacaoProps> = ({
  imageUrl,
  annotations,
  onChangeAnnotations,
  modoAtivo,
  onChangeModoAtivo,
  visivel,
  onToggleVisivel,
  zoom,
  onChangeZoom,
  onResetZoom,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  onClearAll,
  onEditAchado,
  selectedId,
  onSelectId,
  filtroVascular = false,
  filtroInversao = false,
  mostrarGrade = false,
  onSalvar,
  salvando = false
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);

  // Pan offset
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const isPanningRef = useRef(false);
  const panStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Drawing state
  const isDrawingRef = useRef(false);
  const drawStartRef = useRef<{ screenX: number; screenY: number; normX: number; normY: number }>({
    screenX: 0,
    screenY: 0,
    normX: 0,
    normY: 0
  });
  const [currentDrawBox, setCurrentDrawBox] = useState<{ x: number; y: number; width: number; height: number } | null>(null);

  // Moving existing annotation
  const isMovingAnnRef = useRef(false);
  const moveStartRef = useRef<{ normX: number; normY: number; initialX: number; initialY: number }>({
    normX: 0,
    normY: 0,
    initialX: 0,
    initialY: 0
  });

  // Resizing existing annotation
  const isResizingRef = useRef(false);
  const resizeHandleRef = useRef<'nw' | 'ne' | 'se' | 'sw' | null>(null);
  const resizeStartRef = useRef<{ normX: number; normY: number; x: number; y: number; width: number; height: number }>({
    normX: 0,
    normY: 0,
    x: 0,
    y: 0,
    width: 0,
    height: 0
  });

  // Pinch zoom tracking
  const activeTouchesRef = useRef<Map<number, { x: number; y: number }>>(new Map());
  const pinchStartDistRef = useRef<number | null>(null);
  const pinchStartZoomRef = useRef<number>(zoom);

  // Reset pan on resetZoom
  const handleAjustarTela = () => {
    onResetZoom();
    setPan({ x: 0, y: 0 });
  };

  // Helper: Get normalized (0-1) coordinates from PointerEvent client coordinates
  const getNormCoords = (clientX: number, clientY: number): { normX: number; normY: number } | null => {
    if (!innerRef.current) return null;
    const rect = innerRef.current.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return null;

    const normX = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const normY = Math.max(0, Math.min(1, (clientY - rect.top) / rect.height));
    return { normX, normY };
  };

  // Pointer Down handler
  const handlePointerDown = (e: React.PointerEvent) => {
    // If not primary button on mouse, ignore
    if (e.pointerType === 'mouse' && e.button !== 0) return;

    // Track touch for pinch zoom
    activeTouchesRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (activeTouchesRef.current.size === 2) {
      const touches = Array.from(activeTouchesRef.current.values());
      const dist = Math.hypot(touches[0].x - touches[1].x, touches[0].y - touches[1].y);
      pinchStartDistRef.current = dist;
      pinchStartZoomRef.current = zoom;
      return;
    }

    if (modoAtivo === 'mover') {
      // In mover mode, if we didn't click on an annotation or handle, start panning
      const target = e.target as HTMLElement;
      if (!target.closest('[data-annotation-element]')) {
        onSelectId(null);
        isPanningRef.current = true;
        panStartRef.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
      }
    } else {
      // Marking mode: start drawing a rectangle
      const coords = getNormCoords(e.clientX, e.clientY);
      if (!coords) return;

      isDrawingRef.current = true;
      drawStartRef.current = {
        screenX: e.clientX,
        screenY: e.clientY,
        normX: coords.normX,
        normY: coords.normY
      };
      setCurrentDrawBox({
        x: coords.normX,
        y: coords.normY,
        width: 0,
        height: 0
      });
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    }
  };

  // Pointer Move handler
  const handlePointerMove = (e: React.PointerEvent) => {
    // Pinch zoom handling
    if (activeTouchesRef.current.has(e.pointerId)) {
      activeTouchesRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    }
    if (activeTouchesRef.current.size === 2 && pinchStartDistRef.current) {
      const touches = Array.from(activeTouchesRef.current.values());
      const dist = Math.hypot(touches[0].x - touches[1].x, touches[0].y - touches[1].y);
      const ratio = dist / pinchStartDistRef.current;
      const nextZoom = Math.min(6, Math.max(1, pinchStartZoomRef.current * ratio));
      onChangeZoom(Number(nextZoom.toFixed(2)));
      return;
    }

    // Panning
    if (isPanningRef.current) {
      setPan({
        x: e.clientX - panStartRef.current.x,
        y: e.clientY - panStartRef.current.y
      });
      return;
    }

    // Moving existing annotation
    if (isMovingAnnRef.current && selectedId) {
      const coords = getNormCoords(e.clientX, e.clientY);
      if (!coords) return;
      const dx = coords.normX - moveStartRef.current.normX;
      const dy = coords.normY - moveStartRef.current.normY;

      onChangeAnnotations(annotations.map(ann => {
        if (ann.id !== selectedId) return ann;
        const newX = Math.max(0, Math.min(1 - ann.width, moveStartRef.current.initialX + dx));
        const newY = Math.max(0, Math.min(1 - ann.height, moveStartRef.current.initialY + dy));
        return { ...ann, x: newX, y: newY };
      }));
      return;
    }

    // Resizing existing annotation
    if (isResizingRef.current && selectedId && resizeHandleRef.current) {
      const coords = getNormCoords(e.clientX, e.clientY);
      if (!coords) return;
      const dx = coords.normX - resizeStartRef.current.normX;
      const dy = coords.normY - resizeStartRef.current.normY;
      const orig = resizeStartRef.current;
      const handle = resizeHandleRef.current;

      onChangeAnnotations(annotations.map(ann => {
        if (ann.id !== selectedId) return ann;
        let x = orig.x;
        let y = orig.y;
        let width = orig.width;
        let height = orig.height;

        if (handle === 'se') {
          width = Math.max(0.015, Math.min(1 - orig.x, orig.width + dx));
          height = Math.max(0.015, Math.min(1 - orig.y, orig.height + dy));
        } else if (handle === 'sw') {
          const newW = Math.max(0.015, orig.width - dx);
          x = Math.max(0, orig.x + (orig.width - newW));
          width = newW;
          height = Math.max(0.015, Math.min(1 - orig.y, orig.height + dy));
        } else if (handle === 'ne') {
          width = Math.max(0.015, Math.min(1 - orig.x, orig.width + dx));
          const newH = Math.max(0.015, orig.height - dy);
          y = Math.max(0, orig.y + (orig.height - newH));
          height = newH;
        } else if (handle === 'nw') {
          const newW = Math.max(0.015, orig.width - dx);
          const newH = Math.max(0.015, orig.height - dy);
          x = Math.max(0, orig.x + (orig.width - newW));
          y = Math.max(0, orig.y + (orig.height - newH));
          width = newW;
          height = newH;
        }

        return { ...ann, x, y, width, height };
      }));
      return;
    }

    // Drawing new annotation box
    if (isDrawingRef.current) {
      const coords = getNormCoords(e.clientX, e.clientY);
      if (!coords) return;

      const x = Math.min(drawStartRef.current.normX, coords.normX);
      const y = Math.min(drawStartRef.current.normY, coords.normY);
      const width = Math.abs(coords.normX - drawStartRef.current.normX);
      const height = Math.abs(coords.normY - drawStartRef.current.normY);

      setCurrentDrawBox({ x, y, width, height });
    }
  };

  // Pointer Up handler
  const handlePointerUp = (e: React.PointerEvent) => {
    activeTouchesRef.current.delete(e.pointerId);
    if (activeTouchesRef.current.size < 2) {
      pinchStartDistRef.current = null;
    }

    if (isPanningRef.current) {
      isPanningRef.current = false;
      return;
    }

    if (isMovingAnnRef.current) {
      isMovingAnnRef.current = false;
      return;
    }

    if (isResizingRef.current) {
      isResizingRef.current = false;
      resizeHandleRef.current = null;
      return;
    }

    if (isDrawingRef.current) {
      isDrawingRef.current = false;
      const screenDist = Math.hypot(
        e.clientX - drawStartRef.current.screenX,
        e.clientY - drawStartRef.current.screenY
      );

      let finalBox = currentDrawBox;

      // Small tap rule (< 8px movement on screen creates default small rectangle centered at tap)
      if (screenDist < 8 || !finalBox || finalBox.width === 0 || finalBox.height === 0) {
        if (!innerRef.current) return;
        const rect = innerRef.current.getBoundingClientRect();
        const defaultPx = 28;
        const defaultNormW = defaultPx / rect.width;
        const defaultNormH = defaultPx / rect.height;
        const center = getNormCoords(e.clientX, e.clientY);
        if (!center) return;

        finalBox = {
          x: Math.max(0, Math.min(1 - defaultNormW, center.normX - defaultNormW / 2)),
          y: Math.max(0, Math.min(1 - defaultNormH, center.normY - defaultNormH / 2)),
          width: defaultNormW,
          height: defaultNormH
        };
      }

      setCurrentDrawBox(null);

      if (finalBox && modoAtivo !== 'mover') {
        const newAnnotation: Annotation = {
          id: `ann_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          session_id: '',
          type: modoAtivo,
          x: finalBox.x,
          y: finalBox.y,
          width: Math.max(0.012, finalBox.width),
          height: Math.max(0.012, finalBox.height),
          created_at: new Date().toISOString()
        };

        const updated = [...annotations, newAnnotation];
        onChangeAnnotations(updated);
        onSelectId(newAnnotation.id);

        if (modoAtivo === 'achado' || modoAtivo === 'inflamacao') {
          onEditAchado(newAnnotation);
        }
      }
    }
  };

  // Wheel zoom handler on desktop
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = -e.deltaY;
    const factor = delta > 0 ? 1.15 : 0.87;
    const nextZoom = Math.min(6, Math.max(1, zoom * factor));
    onChangeZoom(Number(nextZoom.toFixed(2)));
  };

  // Compute sequential number for each annotation within its type
  const annotationNumbers = React.useMemo(() => {
    const map = new Map<string, number>();
    const counters: Record<AnnotationType, number> = {
      unitario: 0,
      duplo: 0,
      triplo: 0,
      ostio_vazio: 0,
      achado: 0,
      inflamacao: 0
    };

    for (const ann of annotations) {
      counters[ann.type] = (counters[ann.type] || 0) + 1;
      map.set(ann.id, counters[ann.type]);
    }
    return map;
  }, [annotations]);

  // Total counts by type for toolbar buttons
  const countsByType = React.useMemo(() => {
    const counts: Record<AnnotationType, number> = {
      unitario: 0,
      duplo: 0,
      triplo: 0,
      ostio_vazio: 0,
      achado: 0,
      inflamacao: 0
    };
    for (const ann of annotations) {
      counts[ann.type] = (counts[ann.type] || 0) + 1;
    }
    return counts;
  }, [annotations]);

  const selectedAnnotation = annotations.find(a => a.id === selectedId);

  // Start moving selected annotation
  const handleStartMoveAnn = (ann: Annotation, e: React.PointerEvent) => {
    if (modoAtivo !== 'mover') return;
    e.stopPropagation();
    onSelectId(ann.id);
    const coords = getNormCoords(e.clientX, e.clientY);
    if (!coords) return;

    isMovingAnnRef.current = true;
    moveStartRef.current = {
      normX: coords.normX,
      normY: coords.normY,
      initialX: ann.x,
      initialY: ann.y
    };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  // Start resizing selected annotation
  const handleStartResize = (handle: 'nw' | 'ne' | 'se' | 'sw', e: React.PointerEvent) => {
    if (modoAtivo !== 'mover' || !selectedAnnotation) return;
    e.stopPropagation();
    const coords = getNormCoords(e.clientX, e.clientY);
    if (!coords) return;

    isResizingRef.current = true;
    resizeHandleRef.current = handle;
    resizeStartRef.current = {
      normX: coords.normX,
      normY: coords.normY,
      x: selectedAnnotation.x,
      y: selectedAnnotation.y,
      width: selectedAnnotation.width,
      height: selectedAnnotation.height
    };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  // Change type of selected annotation
  const handleChangeSelectedType = (newType: AnnotationType) => {
    if (!selectedId) return;
    onChangeAnnotations(annotations.map(a => {
      if (a.id !== selectedId) return a;
      return { ...a, type: newType };
    }));
  };

  // Delete selected annotation
  const handleDeleteSelected = useCallback(() => {
    if (!selectedId) return;
    onChangeAnnotations(annotations.filter(a => a.id !== selectedId));
    onSelectId(null);
  }, [selectedId, annotations, onChangeAnnotations, onSelectId]);

  // Keyboard Shortcuts (1-6 for tools, Ctrl+Z/Y for undo/redo, Delete/Backspace for selected, Esc to deselect)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        return;
      }

      // Undo / Redo
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          if (canRedo) onRedo();
        } else {
          if (canUndo) onUndo();
        }
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        if (canRedo) onRedo();
        return;
      }

      // Delete / Backspace for selected annotation
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedId) {
        e.preventDefault();
        handleDeleteSelected();
        return;
      }

      // Escape to deselect
      if (e.key === 'Escape' && selectedId) {
        e.preventDefault();
        onSelectId(null);
        return;
      }

      // 1-6 tools
      if (!e.ctrlKey && !e.metaKey && !e.altKey) {
        if (e.key === '1') {
          e.preventDefault();
          onChangeModoAtivo('mover');
          onSelectId(null);
        } else if (e.key === '2') {
          e.preventDefault();
          onChangeModoAtivo('unitario');
          onSelectId(null);
        } else if (e.key === '3') {
          e.preventDefault();
          onChangeModoAtivo('duplo');
          onSelectId(null);
        } else if (e.key === '4') {
          e.preventDefault();
          onChangeModoAtivo('triplo');
          onSelectId(null);
        } else if (e.key === '5') {
          e.preventDefault();
          onChangeModoAtivo('ostio_vazio');
          onSelectId(null);
        } else if (e.key === '6') {
          e.preventDefault();
          onChangeModoAtivo('achado');
          onSelectId(null);
        } else if (e.key === '7') {
          e.preventDefault();
          onChangeModoAtivo('inflamacao');
          onSelectId(null);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedId, annotations, canUndo, canRedo, onUndo, onRedo, onChangeModoAtivo, onSelectId, handleDeleteSelected]);

  return (
    <div className="w-full space-y-2 select-none">
      {/* 1. BARRA DE FERRAMENTAS STICKY NO TOPO DA IMAGEM */}
      <div className="sticky top-16 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-2xl border border-stone-200/90 dark:border-slate-800 p-2 sm:p-2.5 shadow-md space-y-2">
        {/* Linha 1: Seletor de Modos com cores e contadores */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
          {/* Mover */}
          <button
            onClick={() => { onChangeModoAtivo('mover'); onSelectId(null); }}
            className={`px-3 py-1.5 rounded-xl font-semibold flex items-center gap-1.5 shrink-0 transition-all shadow-xs ${
              modoAtivo === 'mover'
                ? 'bg-stone-700 text-white dark:bg-stone-200 dark:text-stone-900 shadow-sm'
                : 'bg-stone-100 dark:bg-slate-800 text-stone-700 dark:text-slate-300 hover:bg-stone-200 dark:hover:bg-slate-700'
            }`}
            title="Mover e selecionar marcações (Atalho: 1)"
          >
            <Hand className="w-3.5 h-3.5" />
            <span>Mover</span>
            <span className="hidden sm:inline text-[9px] opacity-60 font-mono">(1)</span>
          </button>

          {/* Unitário */}
          <button
            onClick={() => { onChangeModoAtivo('unitario'); onSelectId(null); }}
            className={`px-3 py-1.5 rounded-xl font-semibold flex items-center gap-1.5 shrink-0 transition-all shadow-xs ${
              modoAtivo === 'unitario'
                ? 'bg-[#2563EB] text-white shadow-sm ring-2 ring-blue-400/50'
                : 'bg-blue-50 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800/60 hover:bg-blue-100'
            }`}
            title="Marcar unidade unitária - 1 fio (Atalho: 2)"
          >
            <span className="w-2.5 h-2.5 rounded-full bg-[#2563EB]" />
            <span>Unitário</span>
            <span className="hidden sm:inline text-[9px] opacity-60 font-mono">(2)</span>
            <span className="ml-0.5 px-1.5 py-0.2 rounded-full bg-white/80 dark:bg-black/40 text-[10px] font-mono font-bold">
              {countsByType.unitario}
            </span>
          </button>

          {/* Duplo */}
          <button
            onClick={() => { onChangeModoAtivo('duplo'); onSelectId(null); }}
            className={`px-3 py-1.5 rounded-xl font-semibold flex items-center gap-1.5 shrink-0 transition-all shadow-xs ${
              modoAtivo === 'duplo'
                ? 'bg-[#06B6D4] text-white shadow-sm ring-2 ring-cyan-400/50'
                : 'bg-cyan-50 dark:bg-cyan-950/70 text-cyan-700 dark:text-cyan-300 border border-cyan-200/60 dark:border-cyan-800/60 hover:bg-cyan-100'
            }`}
            title="Marcar unidade dupla - 2 fios (Atalho: 3)"
          >
            <span className="w-2.5 h-2.5 rounded-full bg-[#06B6D4]" />
            <span>Duplo</span>
            <span className="hidden sm:inline text-[9px] opacity-60 font-mono">(3)</span>
            <span className="ml-0.5 px-1.5 py-0.2 rounded-full bg-white/80 dark:bg-black/40 text-[10px] font-mono font-bold">
              {countsByType.duplo}
            </span>
          </button>

          {/* Triplo */}
          <button
            onClick={() => { onChangeModoAtivo('triplo'); onSelectId(null); }}
            className={`px-3 py-1.5 rounded-xl font-semibold flex items-center gap-1.5 shrink-0 transition-all shadow-xs ${
              modoAtivo === 'triplo'
                ? 'bg-[#16A34A] text-white shadow-sm ring-2 ring-emerald-400/50'
                : 'bg-emerald-50 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/60 hover:bg-emerald-100'
            }`}
            title="Marcar unidade tripla - 3 fios (Atalho: 4)"
          >
            <span className="w-2.5 h-2.5 rounded-full bg-[#16A34A]" />
            <span>Triplo</span>
            <span className="hidden sm:inline text-[9px] opacity-60 font-mono">(4)</span>
            <span className="ml-0.5 px-1.5 py-0.2 rounded-full bg-white/80 dark:bg-black/40 text-[10px] font-mono font-bold">
              {countsByType.triplo}
            </span>
          </button>

          {/* Óstio Vazio */}
          <button
            onClick={() => { onChangeModoAtivo('ostio_vazio'); onSelectId(null); }}
            className={`px-3 py-1.5 rounded-xl font-semibold flex items-center gap-1.5 shrink-0 transition-all shadow-xs ${
              modoAtivo === 'ostio_vazio'
                ? 'bg-[#F97316] text-white shadow-sm ring-2 ring-orange-400/50'
                : 'bg-orange-50 dark:bg-orange-950/70 text-orange-700 dark:text-orange-300 border border-orange-200/60 dark:border-orange-800/60 hover:bg-orange-100'
            }`}
            title="Marcar óstio vazio (Atalho: 5)"
          >
            <span className="w-2.5 h-2.5 rounded-full bg-[#F97316]" />
            <span>Óstio Vazio</span>
            <span className="hidden sm:inline text-[9px] opacity-60 font-mono">(5)</span>
            <span className="ml-0.5 px-1.5 py-0.2 rounded-full bg-white/80 dark:bg-black/40 text-[10px] font-mono font-bold">
              {countsByType.ostio_vazio}
            </span>
          </button>

          {/* Achado */}
          <button
            onClick={() => { onChangeModoAtivo('achado'); onSelectId(null); }}
            className={`px-3 py-1.5 rounded-xl font-semibold flex items-center gap-1.5 shrink-0 transition-all shadow-xs ${
              modoAtivo === 'achado'
                ? 'bg-[#DC2626] text-white shadow-sm ring-2 ring-rose-400/50'
                : 'bg-rose-50 dark:bg-rose-950/70 text-rose-700 dark:text-rose-300 border border-rose-200/60 dark:border-rose-800/60 hover:bg-rose-100'
            }`}
            title="Marcar sinal tricoscópico (Atalho: 6)"
          >
            <span className="w-2.5 h-2.5 rounded-full bg-[#DC2626]" />
            <span>Achado</span>
            <span className="hidden sm:inline text-[9px] opacity-60 font-mono">(6)</span>
            <span className="ml-0.5 px-1.5 py-0.2 rounded-full bg-white/80 dark:bg-black/40 text-[10px] font-mono font-bold">
              {countsByType.achado}
            </span>
          </button>

          {/* Inflamação */}
          <button
            onClick={() => { onChangeModoAtivo('inflamacao'); onSelectId(null); }}
            className={`px-3 py-1.5 rounded-xl font-semibold flex items-center gap-1.5 shrink-0 transition-all shadow-xs ${
              modoAtivo === 'inflamacao'
                ? 'bg-[#C026D3] text-white shadow-sm ring-2 ring-fuchsia-400/50'
                : 'bg-fuchsia-50 dark:bg-fuchsia-950/70 text-fuchsia-700 dark:text-fuchsia-300 border border-fuchsia-200/60 dark:border-fuchsia-800/60 hover:bg-fuchsia-100'
            }`}
            title="Marcar foco de inflamação e eritema (Atalho: 7)"
          >
            <span className="w-2.5 h-2.5 rounded-full bg-[#C026D3]" />
            <span>Inflamação</span>
            <span className="hidden sm:inline text-[9px] opacity-60 font-mono">(7)</span>
            <span className="ml-0.5 px-1.5 py-0.2 rounded-full bg-white/80 dark:bg-black/40 text-[10px] font-mono font-bold">
              {countsByType.inflamacao}
            </span>
          </button>
        </div>

        {/* Linha 2: Ações Operacionais */}
        <div className="flex items-center justify-between gap-1 overflow-x-auto pt-1 border-t border-stone-100 dark:border-slate-800 text-xs text-stone-700 dark:text-slate-300">
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={onUndo}
              disabled={!canUndo}
              className="p-1.5 rounded-lg hover:bg-stone-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
              title="Desfazer (Ctrl+Z)"
            >
              <Undo2 className="w-4 h-4" />
            </button>
            <button
              onClick={onRedo}
              disabled={!canRedo}
              className="p-1.5 rounded-lg hover:bg-stone-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
              title="Refazer (Ctrl+Y)"
            >
              <Redo2 className="w-4 h-4" />
            </button>

            <span className="w-px h-4 bg-stone-200 dark:bg-slate-700 mx-1" />

            <button
              onClick={() => onChangeZoom(Math.max(1, Number((zoom - 0.25).toFixed(2))))}
              disabled={zoom <= 1}
              className="p-1.5 rounded-lg hover:bg-stone-100 dark:hover:bg-slate-800 disabled:opacity-30 transition-colors"
              title="Zoom -"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <span className="font-mono text-[11px] px-1 font-semibold text-stone-600 dark:text-slate-300 min-w-10 text-center">
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={() => onChangeZoom(Math.min(6, Number((zoom + 0.25).toFixed(2))))}
              disabled={zoom >= 6}
              className="p-1.5 rounded-lg hover:bg-stone-100 dark:hover:bg-slate-800 disabled:opacity-30 transition-colors"
              title="Zoom +"
            >
              <ZoomIn className="w-4 h-4" />
            </button>

            <button
              onClick={handleAjustarTela}
              className="px-2 py-1 rounded-lg hover:bg-stone-100 dark:hover:bg-slate-800 text-[11px] font-medium flex items-center gap-1 transition-colors"
              title="Ajustar à tela"
            >
              <Maximize2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Ajustar</span>
            </button>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={onToggleVisivel}
              className={`px-2 py-1 rounded-lg text-[11px] font-medium flex items-center gap-1 transition-colors ${
                visivel
                  ? 'text-stone-700 dark:text-slate-300 hover:bg-stone-100 dark:hover:bg-slate-800'
                  : 'bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
              }`}
              title="Mostrar / Ocultar marcações"
            >
              {visivel ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">{visivel ? 'Visível' : 'Oculto'}</span>
            </button>

            <button
              onClick={() => {
                if (annotations.length === 0) return;
                if (window.confirm(`Deseja limpar todas as ${annotations.length} marcações feitas nesta imagem?`)) {
                  onClearAll();
                }
              }}
              disabled={annotations.length === 0}
              className="px-2 py-1 rounded-lg text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/60 disabled:opacity-30 text-[11px] font-medium flex items-center gap-1 transition-colors"
              title="Limpar tudo"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Limpar</span>
            </button>

            {onSalvar && (
              <>
                <span className="w-px h-4 bg-stone-200 dark:bg-slate-700 mx-0.5" />
                <button
                  onClick={onSalvar}
                  disabled={salvando}
                  className="px-2.5 py-1 rounded-lg bg-rose-700 hover:bg-rose-800 disabled:opacity-50 text-white text-[11px] font-semibold flex items-center gap-1.5 transition-all shadow-xs active:scale-95"
                  title="Salvar sessão no prontuário (Ctrl+S)"
                >
                  {salvando ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Save className="w-3.5 h-3.5" />
                  )}
                  <span>Salvar</span>
                  <span className="hidden sm:inline text-[9px] opacity-75 font-mono">(Ctrl+S)</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* 2. ÁREA DE VISUALIZAÇÃO E MARCAÇÃO INTERATIVA */}
      <div
        ref={containerRef}
        onWheel={handleWheel}
        className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden bg-stone-950 border border-stone-200 dark:border-slate-800 shadow-inner flex items-center justify-center select-none"
        style={{
          touchAction: modoAtivo !== 'mover' ? 'none' : 'pan-x pan-y',
          cursor: modoAtivo === 'mover' ? (isPanningRef.current ? 'grabbing' : 'grab') : 'crosshair'
        }}
      >
        <div
          ref={innerRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          className="relative w-full h-full flex items-center justify-center transition-transform duration-75"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: 'center center'
          }}
        >
          {/* Imagem Fototricoscópica com Filtros Ópticos */}
          {imageUrl ? (
            <img
              src={imageUrl}
              alt="Captura da cliente"
              className="w-full h-full object-contain pointer-events-none"
              style={{
                filter: `${filtroVascular ? 'contrast(135%) saturate(145%)' : ''} ${filtroInversao ? 'invert(1) hue-rotate(180deg)' : ''}`
              }}
            />
          ) : null}

          {/* Grade Micrométrica Sobreposta */}
          {mostrarGrade && (
            <div 
              className="absolute inset-0 pointer-events-none opacity-40"
              style={{
                backgroundImage: 'linear-gradient(to right, rgba(244, 63, 94, 0.4) 1px, transparent 1px), linear-gradient(to bottom, rgba(244, 63, 94, 0.4) 1px, transparent 1px)',
                backgroundSize: '24px 24px'
              }}
            />
          )}

          {/* MARCAÇÕES SALVAS */}
          {visivel && annotations.map(ann => {
            const isSelected = ann.id === selectedId;
            const seqNumber = annotationNumbers.get(ann.id) || 1;
            const styleConfig = CORES_TIPO[ann.type];

            return (
              <div
                key={ann.id}
                data-annotation-element="true"
                onPointerDown={(e) => handleStartMoveAnn(ann, e)}
                className={`absolute select-none group transition-shadow ${
                  isSelected ? 'ring-2 ring-white shadow-xl z-20' : 'z-10'
                }`}
                style={{
                  left: `${ann.x * 100}%`,
                  top: `${ann.y * 100}%`,
                  width: `${ann.width * 100}%`,
                  height: `${ann.height * 100}%`,
                  backgroundColor: `rgba(${
                    ann.type === 'unitario' ? '37, 99, 235' :
                    ann.type === 'duplo' ? '6, 182, 212' :
                    ann.type === 'triplo' ? '22, 163, 74' :
                    ann.type === 'ostio_vazio' ? '249, 115, 22' : '220, 38, 38'
                  }, 0.25)`,
                  border: `${isSelected ? 3 : 2}px solid ${styleConfig.hex}`,
                  cursor: modoAtivo === 'mover' ? 'move' : 'default'
                }}
              >
                {/* Etiqueta com Número Sequencial dentro do tipo */}
                <div
                  className="absolute -top-5 left-0 px-1.5 py-0.5 rounded-sm text-[10px] font-mono font-bold text-white shadow-sm flex items-center gap-1 pointer-events-none whitespace-nowrap"
                  style={{
                    backgroundColor: styleConfig.hex,
                    transform: `scale(${1 / Math.max(1, zoom * 0.7)})`,
                    transformOrigin: 'bottom left'
                  }}
                >
                  <span>{seqNumber}</span>
                  {ann.type === 'achado' && ann.sign_slug && (
                    <span className="text-[9px] opacity-90">• {ann.sign_slug.slice(0, 12)}</span>
                  )}
                </div>

                {/* Alças de Redimensionamento nos 4 Cantos (visíveis quando selecionado em modo Mover) */}
                {isSelected && modoAtivo === 'mover' && (
                  <>
                    <div
                      onPointerDown={(e) => handleStartResize('nw', e)}
                      className="absolute -top-1.5 -left-1.5 w-3 h-3 rounded-full bg-white border-2 border-stone-900 cursor-nwse-resize shadow-md"
                    />
                    <div
                      onPointerDown={(e) => handleStartResize('ne', e)}
                      className="absolute -top-1.5 -right-1.5 w-3 h-3 rounded-full bg-white border-2 border-stone-900 cursor-nesw-resize shadow-md"
                    />
                    <div
                      onPointerDown={(e) => handleStartResize('se', e)}
                      className="absolute -bottom-1.5 -right-1.5 w-3 h-3 rounded-full bg-white border-2 border-stone-900 cursor-nwse-resize shadow-md"
                    />
                    <div
                      onPointerDown={(e) => handleStartResize('sw', e)}
                      className="absolute -bottom-1.5 -left-1.5 w-3 h-3 rounded-full bg-white border-2 border-stone-900 cursor-nesw-resize shadow-md"
                    />
                  </>
                )}
              </div>
            );
          })}

          {/* CAIXA EM DESENHO ATUAL */}
          {currentDrawBox && modoAtivo !== 'mover' && (
            <div
              className="absolute pointer-events-none z-20"
              style={{
                left: `${currentDrawBox.x * 100}%`,
                top: `${currentDrawBox.y * 100}%`,
                width: `${currentDrawBox.width * 100}%`,
                height: `${currentDrawBox.height * 100}%`,
                backgroundColor: `rgba(${
                  modoAtivo === 'unitario' ? '37, 99, 235' :
                  modoAtivo === 'duplo' ? '6, 182, 212' :
                  modoAtivo === 'triplo' ? '22, 163, 74' :
                  modoAtivo === 'ostio_vazio' ? '249, 115, 22' :
                  modoAtivo === 'inflamacao' ? '192, 38, 211' : '220, 38, 38'
                }, 0.25)`,
                border: `2px dashed ${CORES_TIPO[modoAtivo].hex}`
              }}
            />
          )}
        </div>

        {/* MINI MENU FLUTUANTE PARA MARCAÇÃO SELECIONADA (OTIMIZADO PARA MOBILE E DESKTOP) */}
        {selectedAnnotation && modoAtivo === 'mover' && (
          <div
            className={`absolute z-30 max-w-[calc(100%-16px)] bg-stone-900/95 dark:bg-slate-900/95 backdrop-blur-md border border-stone-700/90 rounded-2xl px-2.5 sm:px-3 py-1.5 sm:py-2 flex flex-wrap sm:flex-nowrap items-center justify-center gap-1.5 sm:gap-2 shadow-2xl text-xs text-white animate-fadeIn left-1/2 -translate-x-1/2 ${
              // No mobile, nunca joga "lá embaixo" a menos que a marcação esteja no topo imediato (y < 0.25)
              selectedAnnotation.y < 0.28 ? 'bottom-2.5 sm:bottom-3' : 'top-2.5 sm:bottom-3'
            }`}
          >
            <div className="flex items-center gap-1.5 border-r border-stone-700/80 pr-2 shrink-0">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: CORES_TIPO[selectedAnnotation.type].hex }} />
              <span className="text-[11px] font-mono text-stone-200 font-semibold">
                #{annotationNumbers.get(selectedAnnotation.id)} {CORES_TIPO[selectedAnnotation.type].label.split(' ')[0]}
              </span>
            </div>

            {/* Trocar tipo com alvos de toque aumentados para mobile */}
            <div className="flex items-center gap-1 shrink-0">
              <span className="text-[10px] text-stone-400 hidden sm:inline">Trocar:</span>
              <button
                onClick={() => handleChangeSelectedType('unitario')}
                className={`w-7 h-7 sm:w-5 sm:h-5 rounded-full bg-[#2563EB] flex items-center justify-center text-xs sm:text-[10px] font-bold active:scale-90 transition-transform ${
                  selectedAnnotation.type === 'unitario' ? 'ring-2 ring-white shadow-sm' : 'opacity-80 hover:opacity-100'
                }`}
                title="Trocar para Unitário (1)"
              >
                1
              </button>
              <button
                onClick={() => handleChangeSelectedType('duplo')}
                className={`w-7 h-7 sm:w-5 sm:h-5 rounded-full bg-[#06B6D4] flex items-center justify-center text-xs sm:text-[10px] font-bold active:scale-90 transition-transform ${
                  selectedAnnotation.type === 'duplo' ? 'ring-2 ring-white shadow-sm' : 'opacity-80 hover:opacity-100'
                }`}
                title="Trocar para Duplo (2)"
              >
                2
              </button>
              <button
                onClick={() => handleChangeSelectedType('triplo')}
                className={`w-7 h-7 sm:w-5 sm:h-5 rounded-full bg-[#16A34A] flex items-center justify-center text-xs sm:text-[10px] font-bold active:scale-90 transition-transform ${
                  selectedAnnotation.type === 'triplo' ? 'ring-2 ring-white shadow-sm' : 'opacity-80 hover:opacity-100'
                }`}
                title="Trocar para Triplo (3)"
              >
                3
              </button>
              <button
                onClick={() => handleChangeSelectedType('ostio_vazio')}
                className={`w-7 h-7 sm:w-5 sm:h-5 rounded-full bg-[#F97316] flex items-center justify-center text-xs sm:text-[10px] font-bold active:scale-90 transition-transform ${
                  selectedAnnotation.type === 'ostio_vazio' ? 'ring-2 ring-white shadow-sm' : 'opacity-80 hover:opacity-100'
                }`}
                title="Trocar para Óstio vazio (0)"
              >
                Ø
              </button>
              <button
                onClick={() => handleChangeSelectedType('achado')}
                className={`w-7 h-7 sm:w-5 sm:h-5 rounded-full bg-[#DC2626] flex items-center justify-center text-xs sm:text-[10px] font-bold active:scale-90 transition-transform ${
                  selectedAnnotation.type === 'achado' ? 'ring-2 ring-white shadow-sm' : 'opacity-80 hover:opacity-100'
                }`}
                title="Trocar para Achado"
              >
                !
              </button>
              <button
                onClick={() => handleChangeSelectedType('inflamacao')}
                className={`w-7 h-7 sm:w-5 sm:h-5 rounded-full bg-[#C026D3] flex items-center justify-center text-xs sm:text-[10px] font-bold active:scale-90 transition-transform ${
                  selectedAnnotation.type === 'inflamacao' ? 'ring-2 ring-white shadow-sm' : 'opacity-80 hover:opacity-100'
                }`}
                title="Trocar para Inflamação"
              >
                🔥
              </button>
            </div>

            {/* Ações: Editar e Excluir */}
            <div className="flex items-center gap-1 shrink-0">
              {(selectedAnnotation.type === 'achado' || selectedAnnotation.type === 'inflamacao') && (
                <button
                  onClick={() => onEditAchado(selectedAnnotation)}
                  className="px-2.5 py-1 rounded-xl bg-stone-800 hover:bg-stone-700 active:scale-95 text-rose-300 text-xs font-semibold flex items-center gap-1 border border-rose-900/60 transition-all shadow-xs"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Editar</span>
                </button>
              )}

              {/* Excluir */}
              <button
                onClick={handleDeleteSelected}
                className="p-1.5 sm:p-2 rounded-xl bg-rose-950/80 hover:bg-rose-900 active:scale-95 text-rose-300 border border-rose-800/80 transition-all"
                title="Excluir marcação"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
