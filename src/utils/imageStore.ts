/**
 * Armazenamento local ultra-resiliente para as imagens do Atlas de Tricoscopia.
 * Suporta:
 * 1. Varredura profunda em TODOS os bancos IndexedDB do navegador (sem restrição de versão nem de nome).
 * 2. Varredura de TODOS os ObjectStores existentes em cada banco (com leitura de chaves e valores).
 * 3. Suporte a valores brutos (strings base64, Blobs, Objetos { dataUrl, url, base64, imagem, ... }).
 * 4. Varredura em 100% das chaves de localStorage e sessionStorage.
 * 5. Mapeamento fuzzy inteligente para os 17 casos oficiais do Atlas.
 * 6. Cache síncrono em memória com notificação em tempo real para os componentes React.
 */

import { usuarioEhAdmin, enviarImagemAtlas, removerArquivo } from './fotosNuvem';

export interface ImagemArmazenada {
  id?: string;
  casoId: string;
  dataUrl: string;
  dataAtualizacao: number;
  nomeArquivo?: string;
  tamanhoBytes?: number;
  storagePath?: string;
  imagens?: ImagemArmazenada[];
}

// Banco primário estável
export const DB_NAME = 'TricoscopiaAtlasDB_v1';
export const STORE_NAME = 'casos_imagens';
export const DB_VERSION = 1;
export const LS_PREFIX = 'atlas_img_v1_';

// Cache síncrono em memória (imagem principal e galeria completa por caso)
const memoryCache = new Map<string, ImagemArmazenada>();
const memoryGalleryCache = new Map<string, ImagemArmazenada[]>();

// Mapeamento minucioso dos 17 Casos Oficiais e todas as suas possíveis variantes de identificação
export const CASOS_ALIASES: Record<string, string[]> = {
  'cond-androgenetica': [
    'androgenetica',
    'aag',
    'aac',
    'img-aag-p16',
    'img-androgenetica',
    'p16',
    'pag16',
    'p-16',
    '1',
    'caso-1',
    'caso1',
    'alopecia-androgenetica'
  ],
  'cond-areata': [
    'areata',
    'aa',
    'img-areata-p08',
    'img-areata',
    'p08',
    'p8',
    'p10',
    'pag08',
    'pag8',
    '2',
    'caso-2',
    'caso2',
    'cond-areata-placa',
    'areata-placa',
    'alopecia-areata'
  ],
  'cond-caspa': [
    'caspa',
    'pitiriase',
    'pitiriase-simples',
    'img-caspa-p17',
    'img-caspa',
    'p17',
    'pag17',
    '3',
    'caso-3',
    'caso3'
  ],
  'cond-dermatite-contato': [
    'dermatite-contato',
    'contato',
    'cond-contato',
    'img-contato-p22',
    'img-dermatite-contato',
    'p22',
    'pag22',
    '4',
    'caso-4',
    'caso4'
  ],
  'cond-dermatite-seborreica': [
    'dermatite-seborreica',
    'ds',
    'cond-ds',
    'img-ds-p28',
    'img-dermatite-seborreica',
    'p13',
    'p28',
    'pag13',
    'pag28',
    '5',
    'caso-5',
    'caso5'
  ],
  'cond-efluvio-anageno': [
    'efluvio-anageno',
    'efluvio-anag',
    'anageno',
    'cond-efluvio-anag',
    'img-efl-anag-p18',
    'p18',
    'pag18',
    '6',
    'caso-6',
    'caso6'
  ],
  'cond-efluvio-telogeno': [
    'efluvio-telogeno',
    'efluvio',
    'telogeno',
    'cond-efluvio',
    'img-efl-telo-p07',
    'img-efluvio-telogeno',
    'p07',
    'p7',
    'p19',
    'pag07',
    'pag19',
    '7',
    'caso-7',
    'caso7'
  ],
  'cond-escabiose': [
    'escabiose',
    'sarna',
    'img-escabiose-p24',
    'p24',
    'pag24',
    '8',
    'caso-8',
    'caso8'
  ],
  'cond-frontal-fibrosante': [
    'frontal-fibrosante',
    'fibrosante-frontal',
    'aff',
    'cond-aff',
    'img-aff-p21',
    'img-frontal-fibrosante',
    'p21',
    'p22',
    'pag21',
    'pag22',
    '9',
    'caso-9',
    'caso9',
    'alopecia-fibrosante-frontal'
  ],
  'cond-foliculite-decalvante': [
    'foliculite-decalvante',
    'foliculite',
    'decalvante',
    'cond-foliculite',
    'img-folic-p25',
    'p25',
    'pag25',
    '10',
    'caso-10',
    'caso10'
  ],
  'cond-liquen-plano-pilar': [
    'liquen-plano-pilar',
    'liquen',
    'lpp',
    'cond-lpp',
    'img-lpp-p23',
    'p21',
    'p23',
    'pag23',
    '11',
    'caso-11',
    'caso11'
  ],
  'cond-pediculose': [
    'pediculose',
    'piolho',
    'lendeas',
    'img-pediculose-p25',
    'p25',
    'pag25',
    '12',
    'caso-12',
    'caso12'
  ],
  'cond-psoriase': [
    'psoriase',
    'pso',
    'img-pso-p27',
    'img-psoriase',
    'p15',
    'p27',
    'pag15',
    'pag27',
    '13',
    'caso-13',
    'caso13'
  ],
  'cond-seborreia': [
    'seborreia',
    'hiperseborreia',
    'img-seborreia-p19',
    'p19',
    'pag19',
    '14',
    'caso-14',
    'caso14'
  ],
  'cond-tinea-capitis': [
    'tinea-capitis',
    'tinea',
    'micose',
    'img-tinea-p20',
    'img-tinea',
    'p20',
    'p27',
    'pag20',
    '15',
    'caso-15',
    'caso15'
  ],
  'cond-tracao': [
    'tracao',
    'tração',
    'alopecia-tracao',
    'img-tracao-p12',
    'p12',
    'p18',
    'pag12',
    '16',
    'caso-16',
    'caso16',
    'alopecia-por-tracao'
  ],
  'cond-xerose': [
    'xerose',
    'ressecamento',
    'img-xerose-p30',
    'p30',
    'pag30',
    '17',
    'caso-17',
    'caso17'
  ]
};

/**
 * Normaliza qualquer chave / identificador / texto para o caso oficial correspondente
 */
export function normalizarParaCasoOficial(rawKey: string): string {
  if (!rawKey) return '';
  const clean = rawKey.toLowerCase().trim().replace(/['"]/g, '');

  // 1. Se já for a chave oficial
  if (CASOS_ALIASES[clean]) {
    return clean;
  }

  // 2. Se corresponder exatamente a um dos aliases conhecidos
  for (const [oficial, aliases] of Object.entries(CASOS_ALIASES)) {
    if (aliases.includes(clean)) {
      return oficial;
    }
  }

  // 3. Correspondência com ou sem prefixo "cond-"
  const semPrefixo = clean.replace(/^cond-/, '').replace(/^img-/, '').replace(/^atlas_/, '').replace(/^caso_/, '');
  for (const [oficial, aliases] of Object.entries(CASOS_ALIASES)) {
    const oficialSemPrefixo = oficial.replace(/^cond-/, '');
    if (semPrefixo === oficialSemPrefixo || aliases.includes(semPrefixo)) {
      return oficial;
    }
  }

  // 4. Fuzzy / Substring matching inteligente
  if (clean.includes('androgen') || clean.includes('aag') || clean.includes('miniaturiz')) return 'cond-androgenetica';
  if (clean.includes('areata')) return 'cond-areata';
  if (clean.includes('caspa') || clean.includes('pitiriase')) return 'cond-caspa';
  if (clean.includes('contato')) return 'cond-dermatite-contato';
  if (clean.includes('seborreica') || clean.includes('ds') || clean.includes('dermatite-seb')) return 'cond-dermatite-seborreica';
  if (clean.includes('anagen')) return 'cond-efluvio-anageno';
  if (clean.includes('telogen') || clean.includes('efluvio')) return 'cond-efluvio-telogeno';
  if (clean.includes('escabiose') || clean.includes('sarna')) return 'cond-escabiose';
  if (clean.includes('frontal') || clean.includes('fibrosante') || clean.includes('aff')) return 'cond-frontal-fibrosante';
  if (clean.includes('foliculite') || clean.includes('decalvante')) return 'cond-foliculite-decalvante';
  if (clean.includes('liquen') || clean.includes('lpp')) return 'cond-liquen-plano-pilar';
  if (clean.includes('pedicul') || clean.includes('piolho') || clean.includes('lendea')) return 'cond-pediculose';
  if (clean.includes('psoria') || clean.includes('pso')) return 'cond-psoriase';
  if (clean.includes('seborreia')) return 'cond-seborreia';
  if (clean.includes('tinea') || clean.includes('micose')) return 'cond-tinea-capitis';
  if (clean.includes('tracao') || clean.includes('tração')) return 'cond-tracao';
  if (clean.includes('xerose') || clean.includes('ressec')) return 'cond-xerose';

  return clean;
}

/**
 * Retorna todas as chaves variantes sob as quais este caso pode ser buscado
 */
export function normalizarChaves(casoId: string): string[] {
  const result = new Set<string>();
  if (!casoId) return [];

  const oficial = normalizarParaCasoOficial(casoId);
  result.add(oficial);
  result.add(casoId);

  const semPrefixo = oficial.replace(/^cond-/, '');
  result.add(semPrefixo);
  result.add(`cond-${semPrefixo}`);

  const aliases = CASOS_ALIASES[oficial] || [];
  for (const a of aliases) {
    result.add(a);
    result.add(`cond-${a}`);
  }

  return Array.from(result);
}

/**
 * Verifica se dois IDs referem-se à mesma condição
 */
export function isAliasMatch(idA: string, idB: string): boolean {
  if (!idA || !idB) return false;
  if (idA === idB) return true;
  const oficialA = normalizarParaCasoOficial(idA);
  const oficialB = normalizarParaCasoOficial(idB);
  if (oficialA && oficialB && oficialA === oficialB) return true;
  return false;
}

// 1. Carga imediata e irrestrita de todo o localStorage
function carregarLocalStorage(): number {
  if (typeof window === 'undefined' || !window.localStorage) return 0;
  let count = 0;
  try {
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      if (!key) continue;
      const raw = window.localStorage.getItem(key);
      if (!raw) continue;

      let dataUrl: string | null = null;
      let targetId: string = key;

      if (raw.startsWith('data:image/') || raw.startsWith('blob:')) {
        dataUrl = raw;
      } else if (raw.startsWith('{')) {
        try {
          const parsed = JSON.parse(raw);
          if (parsed && typeof parsed === 'object') {
            dataUrl = parsed.dataUrl || parsed.url || parsed.imagem || parsed.base64 || null;
            targetId = parsed.casoId || parsed.id || parsed.key || key;
          }
        } catch {
          // ignore
        }
      }

      if (dataUrl) {
        const oficial = normalizarParaCasoOficial(targetId);
        const item: ImagemArmazenada = {
          casoId: oficial,
          dataUrl,
          dataAtualizacao: Date.now()
        };
        const chaves = normalizarChaves(oficial);
        for (const k of chaves) {
          memoryCache.set(k, item);
        }
        count++;
      }
    }
  } catch {
    // ignore
  }
  return count;
}

// Executa leitura de localStorage na inicialização
carregarLocalStorage();

// Conexão controlada com o banco ativo
let activeDb: IDBDatabase | null = null;
let openingPromise: Promise<IDBDatabase> | null = null;

function closeCurrentDb() {
  if (activeDb) {
    try {
      activeDb.close();
    } catch {
      // ignore
    }
  }
  activeDb = null;
  openingPromise = null;
}

async function getOpenDB(): Promise<IDBDatabase> {
  if (activeDb) return activeDb;
  if (openingPromise) return openingPromise;

  openingPromise = new Promise<IDBDatabase>((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB indisponível'));
      return;
    }

    try {
      const req = window.indexedDB.open(DB_NAME, DB_VERSION);

      req.onupgradeneeded = (evt) => {
        const db = (evt.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'casoId' });
        }
      };

      req.onsuccess = () => {
        const db = req.result;
        activeDb = db;
        db.onclose = () => closeCurrentDb();
        db.onversionchange = () => closeCurrentDb();
        db.onerror = () => closeCurrentDb();
        resolve(db);
      };

      req.onerror = () => {
        closeCurrentDb();
        reject(req.error || new Error('Falha ao abrir banco'));
      };

      req.onblocked = () => {
        closeCurrentDb();
        reject(new Error('IndexedDB bloqueado'));
      };
    } catch (err) {
      closeCurrentDb();
      reject(err);
    }
  });

  return openingPromise;
}

/**
 * Abre qualquer banco IndexedDB existente SEM especificar versão,
 * garantindo que NUNCA lance VersionError.
 */
function abrirBancoExistente(nomeBanco: string): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    try {
      if (typeof window === 'undefined' || !window.indexedDB) {
        resolve(null);
        return;
      }
      // Sem segundo argumento de versão: abre na versão que já existir
      const req = window.indexedDB.open(nomeBanco);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
      req.onblocked = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

/**
 * Converte Blob em DataURL
 */
function blobParaDataURL(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

let recoveryPromise: Promise<number> | null = null;

/**
 * Varre com profundidade total todos os bancos IndexedDB, ObjectStores e localStorage
 * para recuperar absolutamente todas as fotos já enviadas pelo usuário.
 */
export function recuperarImagensLegadas(): Promise<number> {
  if (recoveryPromise) {
    return recoveryPromise;
  }

  recoveryPromise = (async () => {
    let totalRecuperadas = 0;

    // 1. Atualizar do localStorage primeiro
    totalRecuperadas += carregarLocalStorage();

    if (typeof window === 'undefined' || !window.indexedDB) {
      return totalRecuperadas;
    }

    // 2. Coletar todos os nomes possíveis de banco de dados
    const nomesBancos = new Set<string>([
      'TricoscopiaAtlasDB',
      'TricoscopiaAtlasDB_v1',
      'TricoscopiaAtlasDB_v2',
      'TricoscopiaAtlasDB_v3',
      'TricoscopiaAtlas',
      'tricoscopia_atlas',
      'atlas_tricoscopia',
      'AtlasTricoscopia',
      'TricoscopiaDB',
      'atlas_db',
      'atlas-db',
      'AtlasDB',
      'atlas',
      'db',
      'casos_db',
      'dermatoscopia_db',
      'tricoscopia'
    ]);

    // Se o navegador suportar window.indexedDB.databases(), inclui todos os bancos reais
    if (window.indexedDB.databases) {
      try {
        const bancos = await window.indexedDB.databases();
        for (const b of bancos) {
          if (b && b.name) {
            nomesBancos.add(b.name);
          }
        }
      } catch {
        // ignore
      }
    }

    // 3. Processar cada banco
    for (const bName of Array.from(nomesBancos)) {
      try {
        const db = await abrirBancoExistente(bName);
        if (!db) continue;

        const storeNames: string[] = [];
        for (let i = 0; i < db.objectStoreNames.length; i++) {
          storeNames.push(db.objectStoreNames[i]);
        }

        for (const sName of storeNames) {
          try {
            await new Promise<void>((resolveStore) => {
              try {
                const tx = db.transaction(sName, 'readonly');
                const store = tx.objectStore(sName);

                const reqKeys = store.getAllKeys();
                const reqVals = store.getAll();

                let keys: IDBValidKey[] = [];
                let vals: any[] = [];
                let keysDone = false;
                let valsDone = false;

                const processResults = async () => {
                  if (!keysDone || !valsDone) return;

                  for (let idx = 0; idx < Math.max(keys.length, vals.length); idx++) {
                    const rawKey = keys[idx] !== undefined ? String(keys[idx]) : '';
                    const rawVal = vals[idx];
                    if (!rawVal) continue;

                    let dataUrl: string | null = null;
                    let candidateId: string = rawKey;

                    if (typeof rawVal === 'string') {
                      if (rawVal.startsWith('data:image/') || rawVal.startsWith('blob:')) {
                        dataUrl = rawVal;
                      } else if (rawVal.startsWith('{')) {
                        try {
                          const parsed = JSON.parse(rawVal);
                          if (parsed && typeof parsed === 'object') {
                            dataUrl = parsed.dataUrl || parsed.url || parsed.imagem || parsed.base64 || null;
                            candidateId = parsed.casoId || parsed.id || parsed.key || candidateId;
                          }
                        } catch {
                          // ignore
                        }
                      }
                    } else if (rawVal instanceof Blob) {
                      try {
                        dataUrl = await blobParaDataURL(rawVal);
                      } catch {
                        // ignore
                      }
                    } else if (typeof rawVal === 'object' && rawVal !== null) {
                      dataUrl = rawVal.dataUrl || rawVal.url || rawVal.imagem || rawVal.base64 || rawVal.src || rawVal.image || null;
                      candidateId = rawVal.casoId || rawVal.id || rawVal.key || rawVal.nomeArquivo || candidateId;
                    }

                    if (dataUrl && candidateId) {
                      const oficial = normalizarParaCasoOficial(candidateId);
                      const item: ImagemArmazenada = {
                        casoId: oficial,
                        dataUrl,
                        dataAtualizacao: Date.now()
                      };

                      const chaves = normalizarChaves(oficial);
                      for (const k of chaves) {
                        memoryCache.set(k, item);
                      }

                      // Persistir de volta no localStorage para redundância máxima
                      try {
                        if (window.localStorage && dataUrl.length < 3500000) {
                          window.localStorage.setItem(`${LS_PREFIX}${oficial}`, JSON.stringify(item));
                          window.localStorage.setItem(`atlas_img_v2_${oficial}`, JSON.stringify(item));
                        }
                      } catch {
                        // ignore
                      }

                      totalRecuperadas++;
                    }
                  }

                  resolveStore();
                };

                reqKeys.onsuccess = () => {
                  keys = reqKeys.result || [];
                  keysDone = true;
                  processResults();
                };
                reqKeys.onerror = () => {
                  keysDone = true;
                  processResults();
                };

                reqVals.onsuccess = () => {
                  vals = reqVals.result || [];
                  valsDone = true;
                  processResults();
                };
                reqVals.onerror = () => {
                  valsDone = true;
                  processResults();
                };
              } catch {
                resolveStore();
              }
            });
          } catch {
            // ignore
          }
        }

        if (bName !== DB_NAME) {
          try {
            db.close();
          } catch {
            // ignore
          }
        }
      } catch {
        // ignore
      }
    }

    // 4. Copiar tudo o que foi recuperado para o banco primário ativo
    if (memoryCache.size > 0) {
      try {
        const db = await getOpenDB();
        await new Promise<void>((resolve) => {
          try {
            const tx = db.transaction(STORE_NAME, 'readwrite');
            const store = tx.objectStore(STORE_NAME);
            for (const item of Array.from(memoryCache.values())) {
              store.put(item);
            }
            tx.oncomplete = () => resolve();
            tx.onerror = () => resolve();
            tx.onabort = () => resolve();
          } catch {
            resolve();
          }
        });
      } catch {
        // ignore
      }

      // 5. Notificar todos os componentes React
      for (const [chave, item] of memoryCache.entries()) {
        window.dispatchEvent(
          new CustomEvent('atlas-image-updated', {
            detail: { casoId: chave, dataUrl: item.dataUrl }
          })
        );
      }
    }

    return totalRecuperadas;
  })();

  return recoveryPromise;
}

// Inicia varredura imediatamente
if (typeof window !== 'undefined') {
  recuperarImagensLegadas().catch(() => {});
  // Repete em window focus caso o usuário tenha trocado de aba
  window.addEventListener('focus', () => {
    recuperarImagensLegadas().catch(() => {});
  });
}

/**
 * Executa operação no banco primário com fallback transparente
 */
async function executeWithStore<T>(
  mode: IDBTransactionMode,
  operation: (store: IDBObjectStore) => Promise<T>,
  fallback: () => T | Promise<T>
): Promise<T> {
  try {
    const db = await getOpenDB();
    return await new Promise<T>((resolve, reject) => {
      try {
        const tx = db.transaction(STORE_NAME, mode);
        const store = tx.objectStore(STORE_NAME);

        let finished = false;
        tx.onabort = () => {
          if (!finished) {
            finished = true;
            reject(tx.error || new Error('Transação abortada'));
          }
        };
        tx.onerror = () => {
          if (!finished) {
            finished = true;
            reject(tx.error || new Error('Erro na transação'));
          }
        };

        operation(store)
          .then((res) => {
            finished = true;
            resolve(res);
          })
          .catch((err) => {
            finished = true;
            reject(err);
          });
      } catch (err) {
        reject(err);
      }
    });
  } catch {
    closeCurrentDb();
    try {
      return await fallback();
    } catch {
      return null as unknown as T;
    }
  }
}

/**
 * Otimiza e garante que a imagem esteja dentro dos limites seguros do Firestore e do navegador (< 650KB)
 * Mantém altíssima nitidez tricoscópica (resolução e contraste dos óstios e fios).
 */
export async function otimizarImagemParaArmazenamento(dataUrl: string): Promise<string> {
  if (!dataUrl) return '';
  // Se já for URL HTTP(S) no storage/web
  if (dataUrl.startsWith('http://') || dataUrl.startsWith('https://')) {
    return dataUrl;
  }

  return new Promise((resolve) => {
    const img = new Image();
    // Apenas aplicar crossOrigin para imagens externas via HTTP(S) para não corromper/travar canvas em data: URLs
    if (dataUrl.startsWith('http://') || dataUrl.startsWith('https://')) {
      img.crossOrigin = 'anonymous';
    }

    img.onload = () => {
      try {
        const TARGET_MAX_CHARS = 480000; // Limite ultrasseguro para Firestore (< 500KB) mantendo nitidez tricoscópica
        let origW = img.width || 1280;
        let origH = img.height || 720;
        let maxDim = 1280;

        let scale = Math.min(1, maxDim / Math.max(origW, origH));
        let curW = Math.max(100, Math.round(origW * scale));
        let curH = Math.max(100, Math.round(origH * scale));

        const canvas = document.createElement('canvas');
        canvas.width = curW;
        canvas.height = curH;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(dataUrl.length <= 500000 ? dataUrl : dataUrl.slice(0, 500000));
          return;
        }

        ctx.drawImage(img, 0, 0, curW, curH);

        // Compressão iterativa com alvo <= 480.000 chars (seguro para Firestore e ultra-rápido)
        let quality = 0.80;
        let compressed = canvas.toDataURL('image/jpeg', quality);

        // Se passar do alvo, reduz qualidade e/ou escala progressivamente
        let attempts = 0;
        while (compressed.length > TARGET_MAX_CHARS && attempts < 8) {
          attempts++;
          if (quality > 0.50) {
            quality -= 0.10;
            compressed = canvas.toDataURL('image/jpeg', quality);
          } else {
            // Reduz dimensão
            curW = Math.round(curW * 0.78);
            curH = Math.round(curH * 0.78);
            canvas.width = curW;
            canvas.height = curH;
            ctx.drawImage(img, 0, 0, curW, curH);
            quality = 0.65;
            compressed = canvas.toDataURL('image/jpeg', quality);
          }
        }

        resolve(compressed);
      } catch (err) {
        console.warn('Erro ao otimizar imagem no canvas:', err);
        resolve(dataUrl);
      }
    };

    img.onerror = () => {
      console.warn('Falha no carregamento do dataUrl para otimização, usando original.');
      resolve(dataUrl);
    };

    img.src = dataUrl;
  });
}

/**
 * Obtém todas as imagens anexadas a um caso (galeria multi-imagem).
 */
export async function obterImagensDoCaso(casoId: string): Promise<ImagemArmazenada[]> {
  if (!casoId) return [];
  const oficial = normalizarParaCasoOficial(casoId);
  const chaves = normalizarChaves(oficial);

  // 1. Checagem em memória da galeria
  for (const k of chaves) {
    if (memoryGalleryCache.has(k)) {
      const g = memoryGalleryCache.get(k);
      if (g && g.length > 0) return g;
    }
  }

  // 2. Checagem no localStorage
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const raw = window.localStorage.getItem(`atlas_galeria_${oficial}`);
      if (raw) {
        const parsed = JSON.parse(raw) as ImagemArmazenada[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          for (const k of chaves) {
            memoryGalleryCache.set(k, parsed);
          }
          return parsed;
        }
      }
    }
  } catch {
    // ignore
  }

  // 3. Checagem no IndexedDB
  const localDb = await executeWithStore<ImagemArmazenada[] | null>(
    'readonly',
    (store) => {
      return new Promise((resolve) => {
        const req = store.get(oficial);
        req.onsuccess = () => {
          const res = req.result as any;
          if (res && Array.isArray(res.imagens) && res.imagens.length > 0) {
            resolve(res.imagens);
          } else if (res && res.dataUrl) {
            resolve([res]);
          } else {
            resolve(null);
          }
        };
        req.onerror = () => resolve(null);
      });
    },
    () => null
  );

  if (localDb && localDb.length > 0) {
    for (const k of chaves) {
      memoryGalleryCache.set(k, localDb);
    }
    return localDb;
  }

  // 4. Fallback para obterImagemCaso único
  const single = await obterImagemCaso(oficial);
  if (single) {
    const list = [single];
    for (const k of chaves) {
      memoryGalleryCache.set(k, list);
    }
    return list;
  }

  return [];
}

/**
 * Adiciona uma nova foto ao acervo de um caso (permitindo múltiplas imagens por condição).
 * Restrito exclusivamente a administradores do Atlas.
 */
export async function adicionarImagemCaso(
  casoId: string,
  dataUrl: string,
  nomeArquivo?: string,
  tamanhoBytes?: number
): Promise<ImagemArmazenada[]> {
  if (!usuarioEhAdmin()) {
    throw new Error('Somente administradores podem alterar as imagens do Atlas.');
  }

  const oficial = normalizarParaCasoOficial(casoId);
  const dataUrlOtimizada = await otimizarImagemParaArmazenamento(dataUrl);

  const idImagem = `${oficial}_sub_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  
  // 1. Enviar imagem para o Firebase Storage
  const { url: downloadUrl, path: storagePath } = await enviarImagemAtlas(
    oficial,
    idImagem,
    dataUrlOtimizada
  );

  const novoItem: ImagemArmazenada = {
    id: idImagem,
    casoId: oficial,
    dataUrl: downloadUrl,
    storagePath,
    dataAtualizacao: Date.now(),
    nomeArquivo: nomeArquivo || `${oficial}_${Date.now()}.jpg`,
    tamanhoBytes: tamanhoBytes || dataUrlOtimizada.length
  };

  // Carregar lista atual
  const listaAtual = await obterImagensDoCaso(oficial);
  const novaLista = [...listaAtual, novoItem];

  // 2. Atualizar cache em memória para todas as variantes
  const chaves = normalizarChaves(oficial);
  for (const k of chaves) {
    memoryGalleryCache.set(k, novaLista);
    memoryCache.set(k, novaLista[0]);
  }

  // 3. Atualizar localStorage
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(`atlas_galeria_${oficial}`, JSON.stringify(novaLista));
      window.localStorage.setItem(`${LS_PREFIX}${oficial}`, JSON.stringify(novaLista[0]));
    }
  } catch {
    // quota excedida
  }

  // 4. Salvar no IndexedDB
  await executeWithStore<void>(
    'readwrite',
    (store) => {
      return new Promise((resolve) => {
        const payload = { ...novaLista[0], imagens: novaLista };
        const req = store.put(payload);
        req.onsuccess = () => resolve();
        req.onerror = () => resolve();
      });
    },
    () => {}
  );

  // 5. Disparar evento para todos os componentes
  if (typeof window !== 'undefined') {
    for (const k of chaves) {
      window.dispatchEvent(
        new CustomEvent('atlas-image-updated', { 
          detail: { casoId: k, dataUrl: novaLista[0].dataUrl, imagens: novaLista } 
        })
      );
    }
  }

  return novaLista;
}

/**
 * Remove uma imagem específica da galeria do caso.
 * Restrito exclusivamente a administradores do Atlas.
 */
export async function removerImagemEspecifica(
  casoId: string,
  targetIdOuDataUrl: string
): Promise<ImagemArmazenada[]> {
  if (!usuarioEhAdmin()) {
    throw new Error('Somente administradores podem alterar as imagens do Atlas.');
  }

  const oficial = normalizarParaCasoOficial(casoId);
  const listaAtual = await obterImagensDoCaso(oficial);

  const itemRemovido = listaAtual.find(
    img => img.id === targetIdOuDataUrl || img.dataUrl === targetIdOuDataUrl
  );

  const novaLista = listaAtual.filter(
    img => img.id !== targetIdOuDataUrl && img.dataUrl !== targetIdOuDataUrl
  );

  const chaves = normalizarChaves(oficial);

  if (novaLista.length === 0) {
    await removerImagemCaso(oficial);
    return [];
  }

  // 1. Apagar arquivo do Storage se houver caminho gravado
  if (itemRemovido?.storagePath) {
    await removerArquivo(itemRemovido.storagePath);
  }

  // 2. Atualizar caches
  for (const k of chaves) {
    memoryGalleryCache.set(k, novaLista);
    memoryCache.set(k, novaLista[0]);
  }

  // 3. Atualizar localStorage
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(`atlas_galeria_${oficial}`, JSON.stringify(novaLista));
      window.localStorage.setItem(`${LS_PREFIX}${oficial}`, JSON.stringify(novaLista[0]));
    }
  } catch {}

  // 4. Atualizar IndexedDB
  await executeWithStore<void>(
    'readwrite',
    (store) => {
      return new Promise((resolve) => {
        const payload = { ...novaLista[0], imagens: novaLista };
        const req = store.put(payload);
        req.onsuccess = () => resolve();
        req.onerror = () => resolve();
      });
    },
    () => {}
  );

  if (typeof window !== 'undefined') {
    for (const k of chaves) {
      window.dispatchEvent(
        new CustomEvent('atlas-image-updated', {
          detail: { casoId: k, dataUrl: novaLista[0].dataUrl, imagens: novaLista }
        })
      );
    }
  }

  return novaLista;
}

/**
 * Salva a imagem persistente de um caso em memória, localStorage, IndexedDB, Storage e Firestore na Nuvem.
 * Restrito exclusivamente a administradores do Atlas.
 */
export async function salvarImagemCaso(
  casoId: string,
  dataUrl: string,
  nomeArquivo?: string,
  tamanhoBytes?: number
): Promise<void> {
  if (!usuarioEhAdmin()) {
    throw new Error('Somente administradores podem alterar as imagens do Atlas.');
  }

  const oficial = normalizarParaCasoOficial(casoId);
  const dataUrlOtimizada = await otimizarImagemParaArmazenamento(dataUrl);

  // 1. Enviar para Firebase Storage
  const { url: downloadUrl, path: storagePath } = await enviarImagemAtlas(
    oficial,
    oficial,
    dataUrlOtimizada
  );

  const item: ImagemArmazenada = {
    id: oficial,
    casoId: oficial,
    dataUrl: downloadUrl,
    storagePath,
    dataAtualizacao: Date.now(),
    nomeArquivo,
    tamanhoBytes: tamanhoBytes || dataUrlOtimizada.length
  };

  // Carregar galeria existente para preservar imagens secundárias se houver
  const listaAtual = await obterImagensDoCaso(oficial);
  let novaLista: ImagemArmazenada[];
  if (listaAtual.length > 0) {
    novaLista = [item, ...listaAtual.slice(1)];
  } else {
    novaLista = [item];
  }

  item.imagens = novaLista;

  // 2. Atualizar cache em memória para todas as variantes
  const chaves = normalizarChaves(oficial);
  for (const k of chaves) {
    memoryCache.set(k, item);
    memoryGalleryCache.set(k, novaLista);
  }

  // 3. Atualizar localStorage
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(`${LS_PREFIX}${oficial}`, JSON.stringify(item));
      window.localStorage.setItem(`atlas_img_v2_${oficial}`, JSON.stringify(item));
      window.localStorage.setItem(`atlas_${oficial}`, JSON.stringify(item));
      window.localStorage.setItem(`atlas_galeria_${oficial}`, JSON.stringify(novaLista));
    }
  } catch {
    // quota excedida
  }

  // 4. Salvar no IndexedDB primário
  await executeWithStore<void>(
    'readwrite',
    (store) => {
      return new Promise((resolve, reject) => {
        const req = store.put(item);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    },
    () => {}
  );

  // 5. Disparar evento para todos os componentes
  if (typeof window !== 'undefined') {
    for (const k of chaves) {
      window.dispatchEvent(
        new CustomEvent('atlas-image-updated', { 
          detail: { casoId: k, dataUrl: downloadUrl, imagens: novaLista } 
        })
      );
    }
  }
}

/**
 * Obtém a imagem de um caso com prioridade: Memória -> Recuperação -> IndexedDB -> LocalStorage -> Firebase Firestore
 */
export async function obterImagemCaso(casoId: string): Promise<ImagemArmazenada | null> {
  if (!casoId) return null;
  const oficial = normalizarParaCasoOficial(casoId);
  const chaves = normalizarChaves(oficial);

  // 1. Checagem síncrona em memória
  for (const k of chaves) {
    if (memoryCache.has(k)) {
      return memoryCache.get(k) || null;
    }
  }

  // 2. Garantir que a recuperação inicial tenha rodado se o cache estiver vazio
  if (recoveryPromise) {
    await recoveryPromise.catch(() => {});
    for (const k of chaves) {
      if (memoryCache.has(k)) {
        return memoryCache.get(k) || null;
      }
    }
  }

  // 3. Checagem no IndexedDB primário
  const localItem = await executeWithStore<ImagemArmazenada | null>(
    'readonly',
    (store) => {
      return new Promise((resolve) => {
        let found = false;
        let pending = chaves.length;

        for (const k of chaves) {
          const req = store.get(k);
          req.onsuccess = () => {
            if (found) return;
            const res = (req.result as ImagemArmazenada) || null;
            if (res && res.dataUrl) {
              found = true;
              for (const alias of chaves) {
                memoryCache.set(alias, res);
              }
              resolve(res);
              return;
            }
            pending--;
            if (pending <= 0 && !found) {
              resolve(null);
            }
          };
          req.onerror = () => {
            pending--;
            if (pending <= 0 && !found) {
              resolve(null);
            }
          };
        }
      });
    },
    () => {
      // Fallback em memória e localStorage
      for (const k of chaves) {
        if (memoryCache.has(k)) {
          return memoryCache.get(k) || null;
        }
      }
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          for (const k of chaves) {
            const raw =
              window.localStorage.getItem(`${LS_PREFIX}${k}`) ||
              window.localStorage.getItem(`atlas_img_v2_${k}`) ||
              window.localStorage.getItem(`atlas_${k}`) ||
              window.localStorage.getItem(`atlas_img_v1_${k}`);
            if (raw) {
              if (raw.startsWith('{')) {
                const parsed = JSON.parse(raw) as ImagemArmazenada;
                for (const alias of chaves) {
                  memoryCache.set(alias, parsed);
                }
                return parsed;
              } else if (raw.startsWith('data:image/')) {
                const item: ImagemArmazenada = {
                  casoId: oficial,
                  dataUrl: raw,
                  dataAtualizacao: Date.now()
                };
                for (const alias of chaves) {
                  memoryCache.set(alias, item);
                }
                return item;
              }
            }
          }
        }
      } catch {
        // ignore
      }
      return null;
    }
  );

  if (localItem) {
    return localItem;
  }

  return null;
}

/**
 * Remove a imagem de um caso (todas as fotos da galeria).
 * Restrito exclusivamente a administradores do Atlas.
 */
export async function removerImagemCaso(casoId: string): Promise<void> {
  if (!usuarioEhAdmin()) {
    throw new Error('Somente administradores podem alterar as imagens do Atlas.');
  }

  const oficial = normalizarParaCasoOficial(casoId);
  const chaves = normalizarChaves(oficial);

  // 1. Apagar arquivos do Storage se houver
  const listaAtual = await obterImagensDoCaso(oficial);
  for (const img of listaAtual) {
    if (img.storagePath) {
      try {
        await removerArquivo(img.storagePath);
      } catch (err) {
        console.warn(`Erro ao excluir arquivo Storage ${img.storagePath}:`, err);
      }
    }
  }

  // 2. Limpar caches
  for (const k of chaves) {
    memoryCache.delete(k);
    memoryGalleryCache.delete(k);
  }

  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      for (const k of chaves) {
        window.localStorage.removeItem(`${LS_PREFIX}${k}`);
        window.localStorage.removeItem(`atlas_img_v2_${k}`);
        window.localStorage.removeItem(`atlas_${k}`);
        window.localStorage.removeItem(`atlas_img_v1_${k}`);
        window.localStorage.removeItem(`atlas_galeria_${k}`);
      }
    }
  } catch {
    // ignore
  }

  await executeWithStore<void>(
    'readwrite',
    (store) => {
      return new Promise((resolve) => {
        let pending = chaves.length;
        for (const k of chaves) {
          const req = store.delete(k);
          req.onsuccess = () => {
            pending--;
            if (pending <= 0) resolve();
          };
          req.onerror = () => {
            pending--;
            if (pending <= 0) resolve();
          };
        }
      });
    },
    () => {}
  );

  if (typeof window !== 'undefined') {
    for (const k of chaves) {
      window.dispatchEvent(
        new CustomEvent('atlas-image-updated', { detail: { casoId: k, dataUrl: null, imagens: [] } })
      );
    }
  }
}

/**
 * Sincroniza e recupera imagens salvas no Firebase / cache local
 */
export async function sincronizarComFirebase(): Promise<void> {
  await recuperarImagensLegadas().catch(() => {});
}

/**
 * Obtém todas as imagens do acervo agrupadas por caso em formato de galeria
 */
export async function obterTodasImagensGaleria(): Promise<Record<string, ImagemArmazenada[]>> {
  await recuperarImagensLegadas().catch(() => {});
  const map: Record<string, ImagemArmazenada[]> = {};

  for (const [k, v] of memoryGalleryCache.entries()) {
    const oficial = normalizarParaCasoOficial(k);
    if (!map[oficial] || map[oficial].length < v.length) {
      map[oficial] = v;
    }
  }

  for (const [k, v] of memoryCache.entries()) {
    const oficial = normalizarParaCasoOficial(k);
    if (!map[oficial]) {
      map[oficial] = v.imagens && v.imagens.length > 0 ? v.imagens : [v];
    }
  }

  return map;
}

/**
 * Obtém todas as imagens ativas para o acervo
 */
export async function obterTodasImagens(): Promise<Record<string, ImagemArmazenada>> {
  await recuperarImagensLegadas().catch(() => {});

  return executeWithStore<Record<string, ImagemArmazenada>>(
    'readonly',
    (store) => {
      return new Promise((resolve) => {
        const req = store.getAll();
        req.onsuccess = () => {
          const results = (req.result as ImagemArmazenada[]) || [];
          const map: Record<string, ImagemArmazenada> = {};

          for (const item of results) {
            if (item && item.casoId && item.dataUrl) {
              const oficial = normalizarParaCasoOficial(item.casoId);
              map[oficial] = item;
              memoryCache.set(oficial, item);
            }
          }

          // Mesclar com memoryCache
          for (const [k, v] of memoryCache.entries()) {
            const oficial = normalizarParaCasoOficial(k);
            if (!map[oficial]) {
              map[oficial] = v;
            }
          }

          resolve(map);
        };
        req.onerror = () => {
          const map: Record<string, ImagemArmazenada> = {};
          for (const [k, v] of memoryCache.entries()) {
            const oficial = normalizarParaCasoOficial(k);
            if (!map[oficial]) map[oficial] = v;
          }
          resolve(map);
        };
      });
    },
    () => {
      const map: Record<string, ImagemArmazenada> = {};
      for (const [k, v] of memoryCache.entries()) {
        const oficial = normalizarParaCasoOficial(k);
        if (!map[oficial]) map[oficial] = v;
      }
      return map;
    }
  );
}

/**
 * Processamento e compressão inteligente de imagem para dataUrl (compatível com Firestore)
 */
export function arquivoParaDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const img = new Image();
      img.onload = () => {
        const maxDim = 1400;
        let width = img.width;
        let height = img.height;

        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(result);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        let compressed = canvas.toDataURL('image/jpeg', 0.88);
        if (compressed.length > 800000) {
          compressed = canvas.toDataURL('image/jpeg', 0.78);
        }
        if (compressed.length > 800000) {
          compressed = canvas.toDataURL('image/jpeg', 0.65);
        }
        resolve(compressed);
      };
      img.onerror = () => resolve(result);
      img.src = result;
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export async function exportarBackupImagens(): Promise<string> {
  const todas = await obterTodasImagensGaleria();
  return JSON.stringify(todas, null, 2);
}

export async function importarBackupImagens(jsonContent: string): Promise<number> {
  if (!usuarioEhAdmin()) {
    throw new Error('Somente administradores podem alterar as imagens do Atlas.');
  }

  const dados = JSON.parse(jsonContent) as Record<string, ImagemArmazenada | ImagemArmazenada[]>;
  let totalImportado = 0;
  for (const [casoId, itemOuLista] of Object.entries(dados)) {
    if (Array.isArray(itemOuLista)) {
      for (let i = 0; i < itemOuLista.length; i++) {
        const item = itemOuLista[i];
        if (item && item.dataUrl) {
          if (i === 0) {
            await salvarImagemCaso(casoId, item.dataUrl, item.nomeArquivo, item.tamanhoBytes);
          } else {
            await adicionarImagemCaso(casoId, item.dataUrl, item.nomeArquivo, item.tamanhoBytes);
          }
          totalImportado++;
        }
      }
    } else if (itemOuLista && itemOuLista.dataUrl) {
      await salvarImagemCaso(casoId, itemOuLista.dataUrl, itemOuLista.nomeArquivo, itemOuLista.tamanhoBytes);
      totalImportado++;
    }
  }
  return totalImportado;
}
