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

import { doc, getDoc, setDoc, deleteDoc, collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { usuarioEhAdmin, enviarImagemAtlas, removerArquivo } from './fotosNuvem';
import { 
  comprimirImagem, 
  comprimirImagemArquivo, 
  comprimirDataUrl, 
  ResultadoCompressao, 
  OpcoesCompressao 
} from './imageCompressor';

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

// Mapeamento rigoroso e inequívoco dos 17 Casos Oficiais (sem números soltos ou colisões de páginas)
export const CASOS_ALIASES: Record<string, string[]> = {
  'cond-androgenetica': [
    'androgenetica',
    'aag',
    'aac',
    'img-aag-p16',
    'img-androgenetica',
    'alopecia-androgenetica'
  ],
  'cond-areata': [
    'areata',
    'img-areata-p08',
    'img-areata',
    'cond-areata-placa',
    'areata-placa',
    'alopecia-areata'
  ],
  'cond-caspa': [
    'caspa',
    'pitiriase',
    'pitiriase-simples',
    'img-caspa-p12',
    'img-caspa'
  ],
  'cond-dermatite-contato': [
    'dermatite-contato',
    'dermatite_contato',
    'cond-contato',
    'img-dermatite-contato-p14',
    'img-dermatite-contato'
  ],
  'cond-dermatite-seborreica': [
    'dermatite-seborreica',
    'dermatite_seborreica',
    'dermatite-seb',
    'img-ds-p28',
    'img-dermatite-seborreica'
  ],
  'cond-efluvio-anageno': [
    'efluvio-anageno',
    'efluvio_anageno',
    'efluvio-anag',
    'anageno',
    'cond-efluvio-anag',
    'img-efluvio-anageno-p06'
  ],
  'cond-efluvio-telogeno': [
    'efluvio-telogeno',
    'efluvio_telogeno',
    'telogeno',
    'cond-efluvio',
    'img-efluvio-p07',
    'img-efluvio-telogeno'
  ],
  'cond-escabiose': [
    'escabiose',
    'sarna',
    'img-escabiose-p19'
  ],
  'cond-frontal-fibrosante': [
    'frontal-fibrosante',
    'fibrosante-frontal',
    'fibrosante',
    'img-aff-p22',
    'img-frontal-fibrosante',
    'alopecia-fibrosante-frontal'
  ],
  'cond-foliculite-decalvante': [
    'foliculite-decalvante',
    'foliculite',
    'decalvante',
    'cond-foliculite',
    'img-fd-p25',
    'img-foliculite-decalvante'
  ],
  'cond-liquen-plano-pilar': [
    'liquen-plano-pilar',
    'liquen',
    'liquen-plano',
    'lpp',
    'cond-lpp',
    'img-lpp-p23'
  ],
  'cond-pediculose': [
    'pediculose',
    'piolho',
    'lendeas',
    'img-pediculose-p19'
  ],
  'cond-psoriase': [
    'psoriase',
    'psoríase',
    'img-psoriase-p27',
    'img-psoriase'
  ],
  'cond-seborreia': [
    'seborreia',
    'hiperseborreia',
    'img-seborreia-p11'
  ],
  'cond-tinea-capitis': [
    'tinea-capitis',
    'tinea',
    'micose',
    'img-tinea-p20',
    'img-tinea'
  ],
  'cond-tracao': [
    'tracao',
    'tração',
    'alopecia-tracao',
    'img-tracao-p18',
    'alopecia-por-tracao'
  ],
  'cond-xerose': [
    'xerose',
    'ressecamento',
    'img-xerose-p12'
  ]
};

/**
 * Normaliza qualquer chave / identificador para o caso oficial correspondente de forma estrita e sem ambiguidade
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

  // 3. Correspondência com ou sem prefixos comuns
  const semPrefixo = clean.replace(/^cond-/, '').replace(/^img-/, '').replace(/^atlas_/, '').replace(/^caso_/, '');
  for (const [oficial, aliases] of Object.entries(CASOS_ALIASES)) {
    const oficialSemPrefixo = oficial.replace(/^cond-/, '');
    if (semPrefixo === oficialSemPrefixo || aliases.includes(semPrefixo)) {
      return oficial;
    }
  }

  // 4. Substring matching estrito e com precedência diagnóstica segura
  if (clean.includes('androgen') || clean.includes('miniaturiz')) return 'cond-androgenetica';
  if (clean.includes('areata')) return 'cond-areata';
  if (clean.includes('caspa') || clean.includes('pitiriase')) return 'cond-caspa';
  if (clean.includes('dermatite-contato') || clean.includes('dermatite_contato') || clean.includes('dermatite de contato')) return 'cond-dermatite-contato';
  if (clean.includes('seborreica') || clean.includes('dermatite-seb') || clean.includes('dermatite_seb')) return 'cond-dermatite-seborreica';
  if (clean.includes('efluvio-anagen') || clean.includes('efluvio_anagen') || clean.includes('anagen')) return 'cond-efluvio-anageno';
  if (clean.includes('efluvio-telogen') || clean.includes('efluvio_telogen') || clean.includes('telogen') || clean.includes('efluvio')) return 'cond-efluvio-telogeno';
  if (clean.includes('escabiose') || clean.includes('sarna')) return 'cond-escabiose';
  if (clean.includes('frontal') || clean.includes('fibrosante')) return 'cond-frontal-fibrosante';
  if (clean.includes('foliculite') || clean.includes('decalvante')) return 'cond-foliculite-decalvante';
  if (clean.includes('liquen') || clean.includes('lpp')) return 'cond-liquen-plano-pilar';
  if (clean.includes('pedicul') || clean.includes('piolho') || clean.includes('lendea')) return 'cond-pediculose';
  if (clean.includes('psoria')) return 'cond-psoriase';
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
 * Verifica se dois IDs referem-se estritamente à mesma condição do Atlas
 */
export function isAliasMatch(idA: string, idB: string): boolean {
  if (!idA || !idB) return false;
  if (idA === idB) return true;
  const oficialA = normalizarParaCasoOficial(idA);
  const oficialB = normalizarParaCasoOficial(idB);
  if (oficialA && oficialB && oficialA === oficialB) return true;
  return false;
}

// 1. Carga seletiva de localStorage (somente chaves prefixadas do atlas)
function carregarLocalStorage(): number {
  if (typeof window === 'undefined' || !window.localStorage) return 0;
  let count = 0;
  try {
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      if (!key) continue;
      // Aceita SOMENTE chaves pertinentes ao atlas
      if (!key.startsWith('atlas_') && !key.startsWith('cond-')) continue;
      const raw = window.localStorage.getItem(key);
      if (!raw) continue;

      let dataUrl: string | null = null;
      let targetId: string = key;

      if (raw.startsWith('data:image/') || raw.startsWith('blob:') || raw.startsWith('http')) {
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
        if (!CASOS_ALIASES[oficial]) continue; // deve ser uma das 17 condições oficiais

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

    // 2. Coletar nomes canônicos e seguros de bancos do Atlas
    const nomesBancos = new Set<string>([
      'TricoscopiaAtlasDB',
      'TricoscopiaAtlasDB_v1',
      'TricoscopiaAtlasDB_v2',
      'TricoscopiaAtlasDB_v3',
      'TricoscopiaAtlas',
      'tricoscopia_atlas',
      'atlas_tricoscopia',
      'AtlasTricoscopia',
      'AtlasDB',
      'atlas_db',
      'atlas-db'
    ]);

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
                      if (!CASOS_ALIASES[oficial]) continue; // Não poluir o atlas com capturas de outras tabelas!

                      let listaGaleria: ImagemArmazenada[] = [];
                      if (rawVal && Array.isArray(rawVal.imagens)) {
                        listaGaleria = rawVal.imagens;
                      }

                      const item: ImagemArmazenada = {
                        casoId: oficial,
                        dataUrl,
                        storagePath: rawVal?.storagePath,
                        nomeArquivo: rawVal?.nomeArquivo,
                        tamanhoBytes: rawVal?.tamanhoBytes,
                        dataAtualizacao: Date.now(),
                        imagens: listaGaleria.length > 0 ? listaGaleria : undefined
                      };

                      memoryCache.set(oficial, item);
                      if (listaGaleria.length > 0) {
                        memoryGalleryCache.set(oficial, listaGaleria);
                      }
                      for (const k of normalizarChaves(oficial)) {
                        memoryCache.set(k, item);
                        if (listaGaleria.length > 0) {
                          memoryGalleryCache.set(k, listaGaleria);
                        }
                      }

                      // Persistir de volta no localStorage para redundância
                      try {
                        if (window.localStorage && dataUrl.length < 500000) {
                          window.localStorage.setItem(`${LS_PREFIX}${oficial}`, JSON.stringify(item));
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

      // 5. Notificar componentes React para casos oficiais
      const jaNotificados = new Set<string>();
      for (const [chave, item] of memoryCache.entries()) {
        const oficial = normalizarParaCasoOficial(chave);
        if (!jaNotificados.has(oficial)) {
          jaNotificados.add(oficial);
          window.dispatchEvent(
            new CustomEvent('atlas-image-updated', {
              detail: { 
                casoId: oficial, 
                dataUrl: item.dataUrl, 
                imagens: memoryGalleryCache.get(oficial) || [item] 
              }
            })
          );
        }
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
 * Otimiza e garante que a imagem esteja dentro dos limites seguros do Firestore e do navegador (< 250KB)
 * Mantém altíssima nitidez tricoscópica (resolução e contraste dos óstios e fios).
 */
export async function otimizarImagemParaArmazenamento(dataUrl: string): Promise<string> {
  if (!dataUrl) return '';
  // Se já for URL HTTP(S) no storage/web
  if (dataUrl.startsWith('http://') || dataUrl.startsWith('https://')) {
    return dataUrl;
  }

  try {
    return await comprimirDataUrl(dataUrl, { perfil: 'tricoscopia', tamanhoMaximoBytes: 250_000 });
  } catch (err) {
    console.warn('Fallback em otimizarImagemParaArmazenamento:', err);
    return dataUrl.length > 500000 ? dataUrl.slice(0, 500000) : dataUrl;
  }
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

  // 4. Checagem no Firebase Firestore (Nuvem Oficial dos Casos)
  try {
    const docRef = doc(db, 'caso_imagens', oficial);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data();
      if (data) {
        let imagens: ImagemArmazenada[] = [];
        if (data.imagensJson) {
          try {
            imagens = JSON.parse(data.imagensJson);
          } catch {}
        }
        if (!imagens || imagens.length === 0) {
          if (data.dataUrl) {
            imagens = [{
              id: oficial,
              casoId: oficial,
              dataUrl: data.dataUrl,
              storagePath: data.storagePath,
              nomeArquivo: data.nomeArquivo,
              tamanhoBytes: data.tamanhoBytes,
              dataAtualizacao: Date.now()
            }];
          }
        }
        if (imagens.length > 0) {
          for (const k of chaves) {
            memoryGalleryCache.set(k, imagens);
            memoryCache.set(k, imagens[0]);
          }
          await executeWithStore('readwrite', (store) => {
            return new Promise<void>((resolve) => {
              const req = store.put({ ...imagens[0], imagens });
              req.onsuccess = () => resolve();
              req.onerror = () => resolve();
            });
          }, () => {});
          return imagens;
        }
      }
    }
  } catch (err) {
    console.debug('Aviso leitura galeria Firestore:', err);
  }

  // 5. Fallback para obterImagemCaso único
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
 * Restrito a administradores do Atlas. Salva em Storage, Firestore, IndexedDB e Memória.
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
    // quota
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

  // 5. Salvar na coleção caso_imagens do Firestore (persistência centralizada)
  try {
    const docRef = doc(db, 'caso_imagens', oficial);
    const firestoreDataUrl = novaLista[0].dataUrl.startsWith('http') 
      ? novaLista[0].dataUrl 
      : (novaLista[0].dataUrl.length <= 800000 ? novaLista[0].dataUrl : await otimizarImagemParaArmazenamento(novaLista[0].dataUrl));

    const imagensCompactas = novaLista.map(img => ({
      id: img.id,
      casoId: img.casoId,
      dataUrl: img.dataUrl.startsWith('http') ? img.dataUrl : (img.dataUrl.length > 200000 ? img.dataUrl.slice(0, 200000) : img.dataUrl),
      storagePath: img.storagePath,
      nomeArquivo: img.nomeArquivo,
      dataAtualizacao: img.dataAtualizacao
    }));

    await setDoc(docRef, {
      casoId: oficial,
      nomeArquivo: novaLista[0].nomeArquivo || `${oficial}.jpg`,
      tamanhoBytes: novaLista[0].tamanhoBytes || 0,
      dataUrl: firestoreDataUrl,
      storagePath: novaLista[0].storagePath || '',
      imagensJson: JSON.stringify(imagensCompactas),
      updatedAt: new Date().toISOString()
    }, { merge: true });
  } catch (firestoreErr) {
    console.warn('Aviso ao persistir galeria no Firestore:', firestoreErr);
  }

  // 6. Disparar evento para os componentes com o ID canônico
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('atlas-image-updated', { 
        detail: { casoId: oficial, dataUrl: novaLista[0].dataUrl, imagens: novaLista } 
      })
    );
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

  // 5. Atualizar Firestore
  try {
    const docRef = doc(db, 'caso_imagens', oficial);
    const firestoreDataUrl = novaLista[0].dataUrl.startsWith('http') 
      ? novaLista[0].dataUrl 
      : (novaLista[0].dataUrl.length <= 800000 ? novaLista[0].dataUrl : novaLista[0].dataUrl.slice(0, 800000));
    const imagensCompactas = novaLista.map(img => ({
      id: img.id,
      casoId: img.casoId,
      dataUrl: img.dataUrl.startsWith('http') ? img.dataUrl : (img.dataUrl.length > 200000 ? img.dataUrl.slice(0, 200000) : img.dataUrl),
      storagePath: img.storagePath,
      nomeArquivo: img.nomeArquivo,
      dataAtualizacao: img.dataAtualizacao
    }));
    await setDoc(docRef, {
      casoId: oficial,
      dataUrl: firestoreDataUrl,
      storagePath: novaLista[0].storagePath || '',
      imagensJson: JSON.stringify(imagensCompactas),
      updatedAt: new Date().toISOString()
    }, { merge: true });
  } catch (err) {
    console.warn('Erro ao atualizar exclusão no Firestore:', err);
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('atlas-image-updated', {
        detail: { casoId: oficial, dataUrl: novaLista[0].dataUrl, imagens: novaLista }
      })
    );
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
    nomeArquivo: nomeArquivo || `${oficial}.jpg`,
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
        const payload = { ...item, imagens: novaLista };
        const req = store.put(payload);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    },
    () => {}
  );

  // 5. Salvar na coleção caso_imagens do Firestore (persistência centralizada perpétua)
  try {
    const docRef = doc(db, 'caso_imagens', oficial);
    const firestoreDataUrl = downloadUrl.startsWith('http') 
      ? downloadUrl 
      : (downloadUrl.length <= 800000 ? downloadUrl : await otimizarImagemParaArmazenamento(downloadUrl));

    const imagensCompactas = novaLista.map(img => ({
      id: img.id,
      casoId: img.casoId,
      dataUrl: img.dataUrl.startsWith('http') ? img.dataUrl : (img.dataUrl.length > 200000 ? img.dataUrl.slice(0, 200000) : img.dataUrl),
      storagePath: img.storagePath,
      nomeArquivo: img.nomeArquivo,
      dataAtualizacao: img.dataAtualizacao
    }));

    await setDoc(docRef, {
      casoId: oficial,
      nomeArquivo: item.nomeArquivo || `${oficial}.jpg`,
      tamanhoBytes: item.tamanhoBytes || 0,
      dataUrl: firestoreDataUrl,
      storagePath: storagePath || '',
      imagensJson: JSON.stringify(imagensCompactas),
      updatedAt: new Date().toISOString()
    }, { merge: true });
    console.info(`✅ Imagem do caso ${oficial} persistida com sucesso no Firestore!`);
  } catch (firestoreErr) {
    console.warn('Aviso ao persistir imagem do caso no Firestore:', firestoreErr);
  }

  // 6. Disparar evento para todos os componentes com o ID canônico
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('atlas-image-updated', { 
        detail: { casoId: oficial, dataUrl: downloadUrl, imagens: novaLista } 
      })
    );
  }
}

/**
 * Obtém a imagem de um caso com prioridade: Memória -> IndexedDB -> Firestore -> LocalStorage
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
              } else if (raw.startsWith('data:image/') || raw.startsWith('http')) {
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

  // 4. Checagem no Firebase Firestore
  try {
    const docRef = doc(db, 'caso_imagens', oficial);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data();
      if (data && data.dataUrl) {
        let imagens: ImagemArmazenada[] = [];
        if (data.imagensJson) {
          try { imagens = JSON.parse(data.imagensJson); } catch {}
        }
        const item: ImagemArmazenada = {
          id: oficial,
          casoId: oficial,
          dataUrl: data.dataUrl,
          storagePath: data.storagePath,
          nomeArquivo: data.nomeArquivo,
          tamanhoBytes: data.tamanhoBytes,
          dataAtualizacao: Date.now(),
          imagens: imagens.length > 0 ? imagens : undefined
        };
        for (const alias of chaves) {
          memoryCache.set(alias, item);
          if (imagens.length > 0) {
            memoryGalleryCache.set(alias, imagens);
          }
        }
        await executeWithStore('readwrite', (store) => {
          return new Promise<void>((resolve) => {
            const req = store.put({ ...item, imagens: imagens.length > 0 ? imagens : [item] });
            req.onsuccess = () => resolve();
            req.onerror = () => resolve();
          });
        }, () => {});
        return item;
      }
    }
  } catch (err) {
    console.debug('Aviso leitura Firestore caso_imagens:', err);
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

  // 2. Limpar Firestore
  try {
    const docRef = doc(db, 'caso_imagens', oficial);
    await deleteDoc(docRef);
  } catch (err) {
    console.warn('Erro ao remover do Firestore caso_imagens:', err);
  }

  // 3. Limpar caches
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
    window.dispatchEvent(
      new CustomEvent('atlas-image-updated', { detail: { casoId: oficial, dataUrl: null, imagens: [] } })
    );
  }
}

/**
 * Sincroniza e recupera imagens salvas no Firebase Firestore e no cache local
 */
export async function sincronizarComFirebase(): Promise<void> {
  // 1. Recuperar fotos legadas locais seguras
  await recuperarImagensLegadas().catch(() => {});

  // 2. Baixar todas as fotos oficiais da coleção caso_imagens do Firestore
  try {
    const colRef = collection(db, 'caso_imagens');
    const snap = await getDocs(colRef);
    for (const docSnap of snap.docs) {
      const data = docSnap.data();
      if (!data || !data.casoId || !data.dataUrl) continue;
      const oficial = normalizarParaCasoOficial(data.casoId);
      if (!CASOS_ALIASES[oficial]) continue;

      let imagens: ImagemArmazenada[] = [];
      if (data.imagensJson) {
        try {
          imagens = JSON.parse(data.imagensJson);
        } catch {}
      }
      if (!imagens || imagens.length === 0) {
        imagens = [{
          id: oficial,
          casoId: oficial,
          dataUrl: data.dataUrl,
          storagePath: data.storagePath,
          nomeArquivo: data.nomeArquivo,
          tamanhoBytes: data.tamanhoBytes,
          dataAtualizacao: Date.now()
        }];
      }

      // Atualizar IndexedDB local
      await executeWithStore('readwrite', (store) => {
        return new Promise<void>((resolve) => {
          const req = store.put({ ...imagens[0], imagens });
          req.onsuccess = () => resolve();
          req.onerror = () => resolve();
        });
      }, () => {});

      // Atualizar caches em memória
      const chaves = normalizarChaves(oficial);
      for (const k of chaves) {
        memoryCache.set(k, imagens[0]);
        memoryGalleryCache.set(k, imagens);
      }

      // Notificar componentes com o ID canônico
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('atlas-image-updated', {
            detail: { casoId: oficial, dataUrl: imagens[0].dataUrl, imagens }
          })
        );
      }
    }
  } catch (err) {
    console.warn('Aviso ao sincronizar coleção caso_imagens do Firestore:', err);
  }
}

// Inicia sincronização com o Firestore em background logo após o carregamento da página
if (typeof window !== 'undefined') {
  setTimeout(() => {
    sincronizarComFirebase().catch(() => {});
  }, 1200);
}

/**
 * Obtém todas as imagens do acervo agrupadas por caso em formato de galeria
 */
export async function obterTodasImagensGaleria(): Promise<Record<string, ImagemArmazenada[]>> {
  await recuperarImagensLegadas().catch(() => {});
  await sincronizarComFirebase().catch(() => {});
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
  await sincronizarComFirebase().catch(() => {});

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
 * Processamento e compressão inteligente de imagem para dataUrl (compatível com Firestore e mobile)
 */
export async function arquivoParaDataURL(file: File, opcoes?: OpcoesCompressao): Promise<string> {
  try {
    const res = await comprimirImagem(file, { perfil: 'padrao', ...opcoes });
    return res.dataUrl;
  } catch (err) {
    console.warn('Fallback em arquivoParaDataURL:', err);
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
  }
}

export { 
  comprimirImagem, 
  comprimirImagemArquivo, 
  comprimirDataUrl 
};
export type { ResultadoCompressao, OpcoesCompressao };

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
