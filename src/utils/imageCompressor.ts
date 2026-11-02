/**
 * TRICOCALAZANS.APP — Motor de Alta Performance de Compressão de Imagens
 * 
 * Otimiza fotografias clínicas de celulares/câmeras (3 MB - 15 MB) antes do upload,
 * reduzindo-as para o intervalo ideal de 120 KB - 250 KB sem perda perceptível de nitidez
 * tricoscópica (preserva folículos, hastes, óstios e eritema).
 * 
 * Benefícios:
 * - Deixa uploads e carregamentos 4x a 10x mais rápidos.
 * - Evita estouro de cota no Firebase Storage e no Firestore (limite de 1MB por doc).
 * - Previne QuotaExceededError no localStorage e IndexedDB.
 */

export interface OpcoesCompressao {
  /**
   * Dimensão máxima (largura ou altura) em pixels.
   * Padrão: 1280px (ou definido pelo perfil)
   */
  dimensaoMaxima?: number;
  /**
   * Qualidade de compressão inicial (0.1 a 1.0).
   * Padrão: 0.82
   */
  qualidade?: number;
  /**
   * Limite de tamanho máximo em bytes.
   * Padrão: 260.000 (~250 KB)
   */
  tamanhoMaximoBytes?: number;
  /**
   * Formato preferencial: 'auto' (usa WebP se suportado com fallback JPEG), 'image/jpeg' ou 'image/webp'.
   * Padrão: 'auto'
   */
  formato?: 'image/jpeg' | 'image/webp' | 'auto';
  /**
   * Perfil otimizado por contexto clínico
   */
  perfil?: 'tricoscopia' | 'global' | 'exame' | 'avatar' | 'padrao';
}

export interface ResultadoCompressao {
  arquivo: File;
  dataUrl: string;
  blob: Blob;
  tamanhoOriginal: number;
  tamanhoComprimido: number;
  percentualEconomia: number;
  textoResumo: string;
  largura: number;
  altura: number;
  formato: 'image/jpeg' | 'image/webp';
}

/**
 * Cache do teste de suporte a WebP no navegador atual
 */
let suporteWebpCache: boolean | null = null;
export function suportaWebp(): boolean {
  if (suporteWebpCache !== null) return suporteWebpCache;
  if (typeof document === 'undefined') return false;
  try {
    const canvas = document.createElement('canvas');
    if (canvas.getContext && canvas.getContext('2d')) {
      suporteWebpCache = canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
      return suporteWebpCache;
    }
  } catch {}
  suporteWebpCache = false;
  return false;
}

/**
 * Formata bytes legíveis para humanos (ex: 4.2 MB, 180 KB)
 */
export function formatarBytes(bytes: number, decimais = 1): string {
  if (bytes <= 0) return '0 B';
  const k = 1024;
  const dm = decimais < 0 ? 0 : decimais;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

/**
 * Converte dataUrl em Blob
 */
export function dataUrlParaBlob(dataUrl: string, mimeTypePadrao = 'image/jpeg'): Blob {
  try {
    const arr = dataUrl.split(',');
    const mime = arr[0].match(/:(.*?);/)?.[1] || mimeTypePadrao;
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
  } catch (err) {
    console.warn('Fallback ao converter dataUrl para blob:', err);
    return new Blob([], { type: mimeTypePadrao });
  }
}

/**
 * Calcula dimensões proporcionais preservando a proporção de aspecto (aspect ratio)
 */
export function calcularDimensoesProporcionais(
  origW: number,
  origH: number,
  maxDim: number
): { width: number; height: number; escala: number } {
  if (origW <= 0 || origH <= 0) {
    return { width: maxDim, height: maxDim, escala: 1 };
  }

  if (origW <= maxDim && origH <= maxDim) {
    return { width: origW, height: origH, escala: 1 };
  }

  const escala = Math.min(maxDim / origW, maxDim / origH);
  return {
    width: Math.max(1, Math.round(origW * escala)),
    height: Math.max(1, Math.round(origH * escala)),
    escala
  };
}

/**
 * Carrega elemento de imagem com limpeza automática de objectURL
 */
function carregarElementoImagem(source: string | Blob | File): Promise<{ img: HTMLImageElement; cleanup: () => void }> {
  return new Promise((resolve, reject) => {
    let url: string;
    let precisaLimpar = false;

    if (typeof source === 'string') {
      url = source;
    } else {
      url = URL.createObjectURL(source);
      precisaLimpar = true;
    }

    const img = new Image();
    if (typeof source === 'string' && (source.startsWith('http://') || source.startsWith('https://'))) {
      img.crossOrigin = 'anonymous';
    }

    img.onload = () => {
      resolve({
        img,
        cleanup: () => {
          if (precisaLimpar) {
            try {
              URL.revokeObjectURL(url);
            } catch {}
          }
        }
      });
    };

    img.onerror = () => {
      if (precisaLimpar) {
        try {
          URL.revokeObjectURL(url);
        } catch {}
      }
      reject(new Error('Falha ao decodificar imagem para compressão'));
    };

    img.src = url;
  });
}

/**
 * Configurações padrão por perfil de uso clínico
 */
function obterConfigPerfil(perfil?: OpcoesCompressao['perfil']) {
  switch (perfil) {
    case 'exame':
      // Textos, relatórios e laudos: resolução maior para máxima legibilidade de números e referências
      return {
        dimensaoMaxima: 1600,
        qualidade: 0.85,
        tamanhoMaximoBytes: 350_000 // ~340 KB
      };
    case 'global':
      // Fotografias macroscópicas do couro cabeludo: excelente nitidez geral
      return {
        dimensaoMaxima: 1200,
        qualidade: 0.80,
        tamanhoMaximoBytes: 220_000 // ~215 KB
      };
    case 'tricoscopia':
      // Tricoscopia dermatológica: nitidez crítica de folículos e óstios
      return {
        dimensaoMaxima: 1280,
        qualidade: 0.82,
        tamanhoMaximoBytes: 250_000 // ~245 KB
      };
    case 'avatar':
      return {
        dimensaoMaxima: 450,
        qualidade: 0.85,
        tamanhoMaximoBytes: 90_000 // ~90 KB
      };
    case 'padrao':
    default:
      return {
        dimensaoMaxima: 1280,
        qualidade: 0.82,
        tamanhoMaximoBytes: 260_000 // ~255 KB
      };
  }
}

/**
 * Comprime qualquer imagem (File, Blob ou dataUrl) antes do upload ou armazenamento.
 */
export async function comprimirImagem(
  fonte: File | Blob | string,
  opcoes: OpcoesCompressao = {}
): Promise<ResultadoCompressao> {
  // 1. Tratamento para arquivos não-imagem (ex: PDFs de exames)
  if (fonte instanceof File && fonte.type === 'application/pdf') {
    const dataUrl = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve('');
      reader.readAsDataURL(fonte);
    });

    return {
      arquivo: fonte,
      dataUrl,
      blob: fonte,
      tamanhoOriginal: fonte.size,
      tamanhoComprimido: fonte.size,
      percentualEconomia: 0,
      textoResumo: `${formatarBytes(fonte.size)} (PDF original mantido)`,
      largura: 0,
      altura: 0,
      formato: 'image/jpeg'
    };
  }

  // 2. Determinar tamanho original em bytes
  let tamanhoOriginal = 0;
  let nomeOriginal = 'imagem_clinica.jpg';

  if (fonte instanceof File) {
    tamanhoOriginal = fonte.size;
    nomeOriginal = fonte.name;
  } else if (fonte instanceof Blob) {
    tamanhoOriginal = fonte.size;
  } else if (typeof fonte === 'string') {
    // Estimativa de base64
    const semCabecalho = fonte.split(',')[1] || fonte;
    tamanhoOriginal = Math.round((semCabecalho.length * 3) / 4);
  }

  // 3. Mesclar configurações do perfil e opções manuais
  const configPerfil = obterConfigPerfil(opcoes.perfil);
  const dimensaoMaxima = opcoes.dimensaoMaxima || configPerfil.dimensaoMaxima;
  let qualidade = opcoes.qualidade ?? configPerfil.qualidade;
  const tamanhoMaximoBytes = opcoes.tamanhoMaximoBytes || configPerfil.tamanhoMaximoBytes;

  // 4. Determinar formato MIME de saída
  let mimeType: 'image/jpeg' | 'image/webp' = 'image/jpeg';
  if (opcoes.formato === 'image/webp') {
    mimeType = 'image/webp';
  } else if (opcoes.formato === 'image/jpeg') {
    mimeType = 'image/jpeg';
  } else {
    // 'auto': WebP gera arquivos 30% menores em navegadores modernos
    mimeType = suportaWebp() ? 'image/webp' : 'image/jpeg';
  }

  // 5. Decodificar imagem no elemento HTML Image
  const { img, cleanup } = await carregarElementoImagem(fonte);

  try {
    const origW = img.naturalWidth || img.width || 1280;
    const origH = img.naturalHeight || img.height || 720;

    let { width, height } = calcularDimensoesProporcionais(origW, origH, dimensaoMaxima);

    // 6. Desenhar no Canvas Offscreen com interpolação de alta qualidade
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      throw new Error('Falha ao obter contexto 2D do Canvas');
    }

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0, width, height);

    // 7. Compressão inteligente adaptativa
    let dataUrl = canvas.toDataURL(mimeType, qualidade);
    let bytesEstimados = Math.round((dataUrl.length * 3) / 4);

    // Se o resultado ultrapassar o limite desejado, faz refinamentos progressivos rápidos (< 50ms)
    let tentativas = 0;
    while (bytesEstimados > tamanhoMaximoBytes && tentativas < 4) {
      tentativas++;
      if (qualidade > 0.62) {
        qualidade = +(qualidade - 0.10).toFixed(2);
        dataUrl = canvas.toDataURL(mimeType, qualidade);
      } else {
        // Reduz dimensões em 15% mantendo proporção
        width = Math.max(200, Math.round(width * 0.85));
        height = Math.max(200, Math.round(height * 0.85));
        canvas.width = width;
        canvas.height = height;
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);
        qualidade = 0.72;
        dataUrl = canvas.toDataURL(mimeType, qualidade);
      }
      bytesEstimados = Math.round((dataUrl.length * 3) / 4);
    }

    // 8. Construir Blob e File final otimizado
    const blob = dataUrlParaBlob(dataUrl, mimeType);
    const extensao = mimeType === 'image/webp' ? 'webp' : 'jpg';
    const nomeLimpo = nomeOriginal.replace(/\.[^/.]+$/, `.${extensao}`);

    const arquivoComprimido = new File([blob], nomeLimpo, {
      type: mimeType,
      lastModified: Date.now()
    });

    const tamanhoComprimido = blob.size;
    const percentualEconomia = tamanhoOriginal > 0
      ? Math.max(0, Math.round(((tamanhoOriginal - tamanhoComprimido) / tamanhoOriginal) * 100))
      : 0;

    const textoResumo = tamanhoOriginal > tamanhoComprimido
      ? `${formatarBytes(tamanhoOriginal)} ➔ ${formatarBytes(tamanhoComprimido)} (${percentualEconomia}% menor)`
      : `${formatarBytes(tamanhoComprimido)} (Otimizado)`;

    return {
      arquivo: arquivoComprimido,
      dataUrl,
      blob,
      tamanhoOriginal,
      tamanhoComprimido,
      percentualEconomia,
      textoResumo,
      largura: width,
      altura: height,
      formato: mimeType
    };
  } finally {
    cleanup();
  }
}

/**
 * Comprime um arquivo File e retorna o File e DataURL otimizados
 */
export async function comprimirImagemArquivo(
  file: File,
  opcoes?: OpcoesCompressao
): Promise<ResultadoCompressao> {
  return comprimirImagem(file, opcoes);
}

/**
 * Comprime uma string DataURL existente para mantê-la leve antes de salvar no Firestore
 */
export async function comprimirDataUrl(
  dataUrl: string,
  opcoes?: OpcoesCompressao
): Promise<string> {
  if (!dataUrl || dataUrl.startsWith('http')) return dataUrl;
  const res = await comprimirImagem(dataUrl, opcoes);
  return res.dataUrl;
}

/**
 * Comprime múltiplos arquivos em lote com retorno de progresso
 */
export async function comprimirLoteImagens(
  arquivos: File[] | FileList,
  opcoes?: OpcoesCompressao,
  onProgresso?: (atual: number, total: number) => void
): Promise<ResultadoCompressao[]> {
  const lista = Array.from(arquivos);
  const resultados: ResultadoCompressao[] = [];

  for (let i = 0; i < lista.length; i++) {
    const file = lista[i];
    const res = await comprimirImagem(file, opcoes);
    resultados.push(res);
    onProgresso?.(i + 1, lista.length);
  }

  return resultados;
}

