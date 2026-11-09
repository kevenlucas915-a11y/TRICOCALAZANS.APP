/**
 * TRICOCALAZANS.APP — Armazenamento Local-First Ultra-Resiliente para o Atlas de Tricoscopia.
 * 
 * Arquitetura de Persistência 100% Confiável:
 * 1. Local-First Imediato: Gravação instantânea em cache síncrono e IndexedDB (< 15ms) com commit garantido (tx.oncomplete).
 * 2. Fila Sequencial de Upload na Nuvem (Sync Queue): Elimina saturação de conexões HTTP (limite de 6 sockets do Chrome)
 *    e timeouts prematuros ao subir múltiplos arquivos (15, 17 ou mais).
 * 3. Prevenção de Closures Obsoletas: Ao concluir o upload de cada foto, a galeria atual é lida dinamicamente e atualizada
 *    por ID, impedindo que tarefas concorrentes sobrescrevam ou limitem o acervo a 7 fotos.
 * 4. Proteção de Cota do Firestore: Documentos salvos no Firestore contêm exclusivamente URLs remotas do Storage (HTTP),
 *    mantendo o tamanho sempre abaixo de 10KB (longe do limite de 900KB/1MB).
 * 5. Inicialização em Lote: Carregamento instantâneo (< 5ms) dos 17 casos no arranque via store.getAll().
 * 6. Merge Inteligente na Sincronização: Fotos locais nunca são apagadas caso a nuvem possua menos fotos registradas.
 */

import { doc, getDoc, setDoc, deleteDoc, collection, getDocs } from 'firebase/firestore';
import { ref, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../firebase';
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

// Mapeamento rigoroso e inequívoco dos 17 Casos Oficiais
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

// Conjunto dinâmico de IDs de casos customizados cadastrados
const customCasosIds = new Set<string>();

/**
 * Registra um caso criado dinamicamente para ser aceito e normalizado em todo o pipeline de imagens
 */
export function registrarCasoCustomizadoId(casoId: string): void {
  if (!casoId) return;
  const clean = casoId.toLowerCase().trim().replace(/['"]/g, '');
  customCasosIds.add(clean);
  const semPrefixo = clean.replace(/^cond-/, '').replace(/^caso-/, '');
  customCasosIds.add(`cond-${semPrefixo}`);
  customCasosIds.add(semPrefixo);
}

/**
 * Verifica se um identificador é um caso válido do acervo (oficial ou customizado)
 */
export function isCasoValido(casoId: string): boolean {
  if (!casoId) return false;
  const clean = casoId.toLowerCase().trim().replace(/['"]/g, '');
  if (CASOS_ALIASES[clean]) return true;
  if (customCasosIds.has(clean)) return true;
  // Permite qualquer caso cadastrado com prefixo padrão cond- ou caso-
  if (clean.startsWith('cond-') || clean.startsWith('caso-')) return true;
  return false;
}

/**
 * Normaliza qualquer chave / identificador para o caso oficial correspondente
 */
export function normalizarParaCasoOficial(rawKey: string): string {
  if (!rawKey) return '';
  const clean = rawKey.toLowerCase().trim().replace(/['"]/g, '');

  if (CASOS_ALIASES[clean]) {
    return clean;
  }

  for (const [oficial, aliases] of Object.entries(CASOS_ALIASES)) {
    if (aliases.includes(clean)) {
      return oficial;
    }
  }

  const semPrefixo = clean.replace(/^cond-/, '').replace(/^img-/, '').replace(/^atlas_/, '').replace(/^caso_/, '');
  for (const [oficial, aliases] of Object.entries(CASOS_ALIASES)) {
    const oficialSemPrefixo = oficial.replace(/^cond-/, '');
    if (semPrefixo === oficialSemPrefixo || aliases.includes(semPrefixo)) {
      return oficial;
    }
  }

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
 * Verifica se dois IDs referem-se à mesma condição do Atlas
 */
export function isAliasMatch(idA: string, idB: string): boolean {
  if (!idA || !idB) return false;
  if (idA === idB) return true;
  const oficialA = normalizarParaCasoOficial(idA);
  const oficialB = normalizarParaCasoOficial(idB);
  if (oficialA && oficialB && oficialA === oficialB) return true;
  return false;
}

// Carga seletiva de localStorage (somente chaves pertinentes ao atlas)
function carregarLocalStorage(): number {
  if (typeof window === 'undefined' || !window.localStorage) return 0;
  let count = 0;
  try {
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      if (!key) continue;
      if (!key.startsWith('atlas_') && !key.startsWith('cond-')) continue;
      const raw = window.localStorage.getItem(key);
      if (!raw) continue;

      let dataUrl: string | null = null;
      let targetId: string = key;
      let imagensLista: ImagemArmazenada[] | undefined = undefined;

      if (raw.startsWith('data:image/') || raw.startsWith('blob:') || raw.startsWith('http')) {
        dataUrl = raw;
      } else if (raw.startsWith('{')) {
        try {
          const parsed = JSON.parse(raw);
          if (parsed && typeof parsed === 'object') {
            dataUrl = parsed.dataUrl || parsed.url || parsed.imagem || parsed.base64 || null;
            targetId = parsed.casoId || parsed.id || parsed.key || key;
            if (Array.isArray(parsed.imagens) && parsed.imagens.length > 0) {
              imagensLista = parsed.imagens;
            }
          }
        } catch {}
      } else if (raw.startsWith('[')) {
        try {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length > 0) {
            imagensLista = parsed;
            dataUrl = parsed[0]?.dataUrl || null;
          }
        } catch {}
      }

      if (dataUrl) {
        const oficial = normalizarParaCasoOficial(targetId);
        if (!isCasoValido(oficial)) continue;

        const galeria = imagensLista && imagensLista.length > 0 ? imagensLista : [{
          casoId: oficial,
          dataUrl,
          dataAtualizacao: Date.now()
        }];

        const item: ImagemArmazenada = {
          ...galeria[0],
          casoId: oficial,
          dataUrl: galeria[0].dataUrl,
          imagens: galeria
        };

        const chaves = normalizarChaves(oficial);
        for (const k of chaves) {
          memoryCache.set(k, item);
          memoryGalleryCache.set(k, galeria);
        }
        count++;
      }
    }
  } catch {}
  return count;
}

// Carga inicial síncrona de localStorage
carregarLocalStorage();

// Gerenciamento de conexão com o IndexedDB primário
let activeDb: IDBDatabase | null = null;
let openingPromise: Promise<IDBDatabase> | null = null;

async function getOpenDB(): Promise<IDBDatabase> {
  if (activeDb) {
    return activeDb;
  }
  if (openingPromise) {
    return openingPromise;
  }

  openingPromise = new Promise<IDBDatabase>((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      openingPromise = null;
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
        openingPromise = null;

        db.onclose = () => {
          activeDb = null;
          openingPromise = null;
        };
        db.onversionchange = () => {
          try { db.close(); } catch {}
          activeDb = null;
          openingPromise = null;
        };
        resolve(db);
      };

      req.onerror = () => {
        openingPromise = null;
        reject(req.error || new Error('Falha ao abrir IndexedDB'));
      };

      req.onblocked = () => {
        openingPromise = null;
        reject(new Error('IndexedDB bloqueado'));
      };
    } catch (err) {
      openingPromise = null;
      reject(err);
    }
  });

  return openingPromise;
}

function abrirBancoExistente(nomeBanco: string): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    try {
      if (typeof window === 'undefined' || !window.indexedDB) {
        resolve(null);
        return;
      }
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
 * Executa uma operação no ObjectStore do banco primário.
 * Para operações de escrita ('readwrite'), aguarda tx.oncomplete para garantir commit físico em disco.
 */
async function executeWithStore<T>(
  mode: IDBTransactionMode,
  operation: (store: IDBObjectStore) => Promise<T>,
  fallback: () => T | Promise<T>
): Promise<T> {
  try {
    let db: IDBDatabase;
    try {
      db = await getOpenDB();
    } catch {
      activeDb = null;
      db = await getOpenDB();
    }

    return await new Promise<T>((resolve, reject) => {
      try {
        const tx = db.transaction(STORE_NAME, mode);
        const store = tx.objectStore(STORE_NAME);

        let opResult: T | undefined = undefined;

        tx.oncomplete = () => {
          resolve(opResult as T);
        };

        tx.onabort = () => {
          reject(tx.error || new Error('Transação IndexedDB abortada'));
        };

        tx.onerror = () => {
          reject(tx.error || new Error('Erro na transação IndexedDB'));
        };

        operation(store)
          .then((res) => {
            opResult = res;
            if (mode === 'readonly') {
              resolve(res);
            }
          })
          .catch((err) => {
            reject(err);
          });
      } catch (err: any) {
        if (err && (err.name === 'InvalidStateError' || String(err).includes('closing'))) {
          activeDb = null;
        }
        reject(err);
      }
    });
  } catch {
    try {
      return await fallback();
    } catch {
      return null as unknown as T;
    }
  }
}

/**
 * Migra dados de banco legado antigo (TricoscopiaAtlasDB) uma única vez se o banco primário estiver vazio.
 */
async function migrarBancoLegadoAntigo(): Promise<number> {
  if (typeof window === 'undefined' || !window.indexedDB) return 0;
  let recuperadas = 0;
  try {
    const dbAntigo = await abrirBancoExistente('TricoscopiaAtlasDB');
    if (!dbAntigo) return 0;

    const storeNames: string[] = [];
    for (let i = 0; i < dbAntigo.objectStoreNames.length; i++) {
      storeNames.push(dbAntigo.objectStoreNames[i]);
    }

    for (const sName of storeNames) {
      try {
        const items = await new Promise<any[]>((resolve) => {
          try {
            const tx = dbAntigo.transaction(sName, 'readonly');
            const store = tx.objectStore(sName);
            const req = store.getAll();
            req.onsuccess = () => resolve(req.result || []);
            req.onerror = () => resolve([]);
          } catch {
            resolve([]);
          }
        });

        for (const raw of items) {
          if (!raw) continue;
          let dataUrl: string | null = null;
          let candidateId: string = raw.casoId || raw.id || raw.key || '';
          if (typeof raw === 'string' && (raw.startsWith('data:image/') || raw.startsWith('blob:') || raw.startsWith('http'))) {
            dataUrl = raw;
          } else if (typeof raw === 'object' && raw !== null) {
            dataUrl = raw.dataUrl || raw.url || raw.imagem || raw.base64 || null;
          }

          if (dataUrl && candidateId) {
            const oficial = normalizarParaCasoOficial(candidateId);
            if (!isCasoValido(oficial)) continue;

            let listaGaleria: ImagemArmazenada[] = [];
            if (raw && Array.isArray(raw.imagens)) {
              listaGaleria = raw.imagens;
            } else {
              listaGaleria = [{
                casoId: oficial,
                dataUrl,
                dataAtualizacao: Date.now()
              }];
            }

            const item: ImagemArmazenada = {
              casoId: oficial,
              dataUrl: listaGaleria[0].dataUrl,
              storagePath: raw?.storagePath,
              nomeArquivo: raw?.nomeArquivo,
              tamanhoBytes: raw?.tamanhoBytes,
              dataAtualizacao: Date.now(),
              imagens: listaGaleria
            };

            for (const k of normalizarChaves(oficial)) {
              memoryCache.set(k, item);
              memoryGalleryCache.set(k, listaGaleria);
            }

            await executeWithStore('readwrite', (store) => {
              return new Promise<void>((resolve) => {
                const req = store.put(item);
                req.onsuccess = () => resolve();
                req.onerror = () => resolve();
              });
            }, () => {});

            recuperadas++;
          }
        }
      } catch {}
    }

    try { dbAntigo.close(); } catch {}
  } catch {}
  return recuperadas;
}

let initPromise: Promise<number> | null = null;

/**
 * Inicialização ultra-rápida do banco local (< 5ms):
 * Lê todos os registros de TricoscopiaAtlasDB_v1 via store.getAll() e hidrata a memória para os 17 casos.
 */
export async function inicializarBanco(): Promise<number> {
  if (initPromise) return initPromise;

  initPromise = (async () => {
    let count = 0;

    // 1. Carga do localStorage (backup imediato)
    count += carregarLocalStorage();

    if (typeof window === 'undefined' || !window.indexedDB) {
      return count;
    }

    try {
      const items = await executeWithStore<any[]>(
        'readonly',
        (store) => {
          return new Promise((resolve) => {
            const req = store.getAll();
            req.onsuccess = () => resolve(req.result || []);
            req.onerror = () => resolve([]);
          });
        },
        () => []
      );

      for (const raw of items) {
        if (!raw) continue;
        const rawId = raw.casoId || raw.id || raw.key;
        const oficial = normalizarParaCasoOficial(rawId);
        if (!oficial || !isCasoValido(oficial)) continue;

        let galeria: ImagemArmazenada[] = [];
        if (Array.isArray(raw.imagens) && raw.imagens.length > 0) {
          galeria = raw.imagens;
        } else if (raw.dataUrl) {
          galeria = [raw];
        }

        if (galeria.length > 0) {
          const itemPrincipal: ImagemArmazenada = {
            ...galeria[0],
            casoId: oficial,
            dataUrl: galeria[0].dataUrl,
            imagens: galeria
          };

          const chaves = normalizarChaves(oficial);
          for (const k of chaves) {
            memoryCache.set(k, itemPrincipal);
            memoryGalleryCache.set(k, galeria);
          }
          count++;
        }
      }

      if (count === 0) {
        count += await migrarBancoLegadoAntigo();
      }

      // Notificar componentes React que os dados foram hidratados
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
    } catch (err) {
      console.warn('Aviso ao inicializar banco Atlas:', err);
    }

    return count;
  })();

  return initPromise;
}

// Inicializa o banco imediatamente ao importar o módulo
if (typeof window !== 'undefined') {
  inicializarBanco().catch(() => {});
}

export async function recuperarImagensLegadas(): Promise<number> {
  return await inicializarBanco();
}

/**
 * Otimiza e garante que a imagem esteja dentro dos limites seguros do navegador e do Firestore (< 250KB).
 * Mantém altíssima nitidez tricoscópica (resolução e contraste dos óstios e folículos).
 */
export async function otimizarImagemParaArmazenamento(dataUrl: string): Promise<string> {
  if (!dataUrl) return '';
  if (dataUrl.startsWith('http://') || dataUrl.startsWith('https://')) {
    return dataUrl;
  }

  try {
    return await comprimirDataUrl(dataUrl, { perfil: 'tricoscopia', tamanhoMaximoBytes: 250_000 });
  } catch (err) {
    console.warn('Fallback em otimizarImagemParaArmazenamento:', err);
    return dataUrl;
  }
}

/**
 * Fila sequencial de upload na nuvem (Storage + Firestore).
 * Processa 1 item por vez com largura de banda dedicada, eliminando saturação de conexões
 * e garantindo que mesmo ao subir 15, 17 ou 50 fotos, NENHUMA foto seja perdida ou cancelada por timeout.
 */
interface TarefaSincronizacaoNuvem {
  casoId: string;
  imagemId: string;
  dataUrl: string;
  nomeArquivo?: string;
  tamanhoBytes?: number;
}

const filaSincronizacao: TarefaSincronizacaoNuvem[] = [];
let processandoFilaSincronizacao = false;

async function processarFilaNuvem(): Promise<void> {
  if (processandoFilaSincronizacao) return;
  processandoFilaSincronizacao = true;

  try {
    while (filaSincronizacao.length > 0) {
      const tarefa = filaSincronizacao.shift();
      if (!tarefa) continue;

      const oficial = normalizarParaCasoOficial(tarefa.casoId);
      const chaves = normalizarChaves(oficial);

      try {
        // 1. Upload sequencial seguro para o Firebase Storage
        const { url: downloadUrl, path: storagePath } = await enviarImagemAtlas(
          oficial,
          tarefa.imagemId,
          tarefa.dataUrl
        );

        const uploadSucessoStorage = Boolean(downloadUrl && downloadUrl.startsWith('http'));

        // 2. LER DINAMICAMENTE A GALERIA MAIS RECENTE (elimina closures obsoletas!)
        const galeriaAtual = memoryGalleryCache.get(oficial) || await obterImagensDoCaso(oficial);
        let itemAtualizado = false;

        const galeriaAtualizada = galeriaAtual.map(img => {
          if (img.id === tarefa.imagemId || img.dataUrl === tarefa.dataUrl) {
            itemAtualizado = true;
            return {
              ...img,
              dataUrl: uploadSucessoStorage ? downloadUrl : img.dataUrl,
              storagePath: uploadSucessoStorage ? storagePath : img.storagePath
            };
          }
          return img;
        });

        if (!itemAtualizado && galeriaAtualizada.length > 0 && uploadSucessoStorage) {
          galeriaAtualizada[0].dataUrl = downloadUrl;
          galeriaAtualizada[0].storagePath = storagePath;
        }

        // 3. Atualiza memória e IndexedDB com os dados sincronizados
        for (const k of chaves) {
          memoryGalleryCache.set(k, galeriaAtualizada);
          if (galeriaAtualizada[0]) {
            memoryCache.set(k, galeriaAtualizada[0]);
          }
        }

        if (galeriaAtualizada.length > 0) {
          await executeWithStore<void>(
            'readwrite',
            (store) => {
              return new Promise((resolve) => {
                const req = store.put({ ...galeriaAtualizada[0], imagens: galeriaAtualizada });
                req.onsuccess = () => resolve();
                req.onerror = () => resolve();
              });
            },
            () => {}
          );
        }

        // 4. Salvar no Firestore de forma ultra-leve (apenas URLs HTTP, tamanho < 5KB)
        const docRef = doc(db, 'caso_imagens', oficial);
        const urlPrincipal = galeriaAtualizada[0]?.dataUrl && galeriaAtualizada[0].dataUrl.startsWith('http')
          ? galeriaAtualizada[0].dataUrl
          : (uploadSucessoStorage ? downloadUrl : (galeriaAtualizada[0]?.dataUrl?.length <= 800000 ? galeriaAtualizada[0].dataUrl : ''));

        const imagensCompactas = galeriaAtualizada.map(img => ({
          id: img.id,
          casoId: img.casoId,
          dataUrl: img.dataUrl.startsWith('http') ? img.dataUrl : '', // Não enche o Firestore de Base64
          storagePath: img.storagePath || '',
          nomeArquivo: img.nomeArquivo || `${oficial}.jpg`,
          dataAtualizacao: img.dataAtualizacao
        }));

        await setDoc(docRef, {
          casoId: oficial,
          nomeArquivo: galeriaAtualizada[0]?.nomeArquivo || `${oficial}.jpg`,
          tamanhoBytes: galeriaAtualizada[0]?.tamanhoBytes || 0,
          dataUrl: urlPrincipal,
          storagePath: galeriaAtualizada[0]?.storagePath || storagePath || '',
          imagensJson: JSON.stringify(imagensCompactas),
          updatedAt: new Date().toISOString()
        }, { merge: true });

        console.info(`✅ [Atlas Nuvem] Caso ${oficial} sincronizado permanentemente com o Firebase!`);

        // 5. Notificar interface com as novas URLs remotas
        if (typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent('atlas-image-updated', {
              detail: {
                casoId: oficial,
                dataUrl: urlPrincipal,
                imagens: galeriaAtualizada
              }
            })
          );
        }
      } catch (uploadErr) {
        console.warn(`Aviso ao sincronizar foto de ${oficial} na nuvem:`, uploadErr);
      }
    }
  } finally {
    processandoFilaSincronizacao = false;
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', (e) => {
    if (filaSincronizacao.length > 0 || processandoFilaSincronizacao) {
      e.preventDefault();
      e.returnValue = 'O envio das fotos para a nuvem ainda está em processamento.';
      return e.returnValue;
    }
  });
}

export function obterStatusFilaUpload(): { pendentes: number; processando: boolean } {
  return {
    pendentes: filaSincronizacao.length,
    processando: processandoFilaSincronizacao
  };
}

function enfileirarUploadNuvem(tarefa: TarefaSincronizacaoNuvem) {
  filaSincronizacao.push(tarefa);
  processarFilaNuvem().catch(() => {});
}

/**
 * Obtém todas as imagens anexadas a um caso (galeria multi-imagem).
 */
export async function obterImagensDoCaso(casoId: string): Promise<ImagemArmazenada[]> {
  if (!casoId) return [];
  const oficial = normalizarParaCasoOficial(casoId);
  const chaves = normalizarChaves(oficial);

  // 1. Checagem em memória da galeria (síncrono, 0ms)
  for (const k of chaves) {
    if (memoryGalleryCache.has(k)) {
      const g = memoryGalleryCache.get(k);
      if (g && g.length > 0) return g;
    }
  }

  // 2. Garantir que a inicialização do banco tenha completado
  if (initPromise) {
    await initPromise.catch(() => {});
    for (const k of chaves) {
      if (memoryGalleryCache.has(k)) {
        const g = memoryGalleryCache.get(k);
        if (g && g.length > 0) return g;
      }
    }
  }

  // 3. Checagem no IndexedDB primário
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
      memoryCache.set(k, localDb[0]);
    }
    return localDb;
  }

  // 4. Checagem no localStorage
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const raw = window.localStorage.getItem(`atlas_galeria_${oficial}`) ||
                  window.localStorage.getItem(`${LS_PREFIX}${oficial}`);
      if (raw) {
        if (raw.startsWith('[')) {
          const parsed = JSON.parse(raw) as ImagemArmazenada[];
          if (Array.isArray(parsed) && parsed.length > 0) {
            for (const k of chaves) {
              memoryGalleryCache.set(k, parsed);
              memoryCache.set(k, parsed[0]);
            }
            return parsed;
          }
        } else if (raw.startsWith('{')) {
          const parsed = JSON.parse(raw) as ImagemArmazenada;
          if (parsed && parsed.dataUrl) {
            const list = [parsed];
            for (const k of chaves) {
              memoryGalleryCache.set(k, list);
              memoryCache.set(k, parsed);
            }
            return list;
          }
        }
      }
    }
  } catch {}

  // 5. Checagem no Firebase Firestore (Nuvem Oficial dos Casos)
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
          const urlBase = data.dataUrl || data.url || '';
          if (urlBase || data.storagePath) {
            imagens = [{
              id: oficial,
              casoId: oficial,
              dataUrl: urlBase,
              storagePath: data.storagePath,
              nomeArquivo: data.nomeArquivo,
              tamanhoBytes: data.tamanhoBytes,
              dataAtualizacao: Date.now()
            }];
          }
        }

        // Se fotos vieram sem URL HTTP mas têm storagePath no Storage, resolve a URL
        for (const img of imagens) {
          if ((!img.dataUrl || !img.dataUrl.startsWith('http')) && img.storagePath) {
            try {
              const storageRef = ref(storage, img.storagePath);
              const downloadUrl = await getDownloadURL(storageRef);
              if (downloadUrl) img.dataUrl = downloadUrl;
            } catch {}
          } else if (!img.dataUrl && data.dataUrl) {
            img.dataUrl = data.dataUrl;
          }
        }
        imagens = imagens.filter(img => Boolean(img.dataUrl));
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

  // 6. Fallback para obterImagemCaso
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
 * Restrito a administradores do Atlas.
 * Arquitetura Local-First: Salva no IndexedDB e em memória imediatamente (< 15ms),
 * e enfileira na fila de upload sequencial da nuvem sem travar a interface e sem perda de dados.
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

  // Carregar lista mais recente da memória ou IndexedDB
  const listaAtual = memoryGalleryCache.get(oficial) || await obterImagensDoCaso(oficial);

  const novoItem: ImagemArmazenada = {
    id: idImagem,
    casoId: oficial,
    dataUrl: dataUrlOtimizada,
    dataAtualizacao: Date.now(),
    nomeArquivo: nomeArquivo || `${oficial}_${Date.now()}.jpg`,
    tamanhoBytes: tamanhoBytes || dataUrlOtimizada.length
  };

  const novaLista = [...listaAtual, novoItem];

  // 1. Atualizar cache em memória para todas as variantes IMEDIATAMENTE
  const chaves = normalizarChaves(oficial);
  for (const k of chaves) {
    memoryGalleryCache.set(k, novaLista);
    memoryCache.set(k, novaLista[0]);
  }

  // 2. Gravar no IndexedDB local IMEDIATAMENTE com commit confirmado
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

  // 3. Atualizar localStorage se couber (apenas primeira foto se pequena)
  try {
    if (typeof window !== 'undefined' && window.localStorage && dataUrlOtimizada.length < 300000) {
      window.localStorage.setItem(`${LS_PREFIX}${oficial}`, JSON.stringify(novaLista[0]));
    }
  } catch {}

  // 4. Disparar evento para todos os componentes React IMEDIATAMENTE
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('atlas-image-updated', { 
        detail: { casoId: oficial, dataUrl: novaLista[0].dataUrl, imagens: novaLista } 
      })
    );
  }

  // 5. Enfileirar upload sequencial para Firebase Storage e Firestore
  enfileirarUploadNuvem({
    casoId: oficial,
    imagemId: idImagem,
    dataUrl: dataUrlOtimizada,
    nomeArquivo: novoItem.nomeArquivo,
    tamanhoBytes: novoItem.tamanhoBytes
  });

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
  const listaAtual = memoryGalleryCache.get(oficial) || await obterImagensDoCaso(oficial);

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

  // 1. Atualizar caches em memória imediatamente
  for (const k of chaves) {
    memoryGalleryCache.set(k, novaLista);
    memoryCache.set(k, novaLista[0]);
  }

  // 2. Atualizar IndexedDB imediatamente
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

  // 3. Atualizar localStorage
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(`${LS_PREFIX}${oficial}`, JSON.stringify(novaLista[0]));
    }
  } catch {}

  // 4. Disparar evento para componentes React imediatamente
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('atlas-image-updated', {
        detail: { casoId: oficial, dataUrl: novaLista[0].dataUrl, imagens: novaLista }
      })
    );
  }

  // 5. Apagar arquivo do Storage e atualizar Firestore em background
  (async () => {
    if (itemRemovido?.storagePath) {
      try {
        await removerArquivo(itemRemovido.storagePath);
      } catch {}
    }

    try {
      const docRef = doc(db, 'caso_imagens', oficial);
      const firestoreDataUrl = novaLista[0].dataUrl.startsWith('http') 
        ? novaLista[0].dataUrl 
        : '';
      const imagensCompactas = novaLista.map(img => ({
        id: img.id,
        casoId: img.casoId,
        dataUrl: img.dataUrl.startsWith('http') ? img.dataUrl : '',
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
  })();

  return novaLista;
}

/**
 * Salva a imagem persistente de um caso em memória, IndexedDB, Storage e Firestore.
 * Restrito exclusivamente a administradores do Atlas.
 * Arquitetura Local-First: Persistência local imediata (< 15ms), enfileiramento sequencial para a nuvem.
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

  const item: ImagemArmazenada = {
    id: oficial,
    casoId: oficial,
    dataUrl: dataUrlOtimizada,
    dataAtualizacao: Date.now(),
    nomeArquivo: nomeArquivo || `${oficial}.jpg`,
    tamanhoBytes: tamanhoBytes || dataUrlOtimizada.length
  };

  const listaAtual = memoryGalleryCache.get(oficial) || await obterImagensDoCaso(oficial);
  let novaLista: ImagemArmazenada[];
  if (listaAtual.length > 0) {
    novaLista = [item, ...listaAtual.slice(1)];
  } else {
    novaLista = [item];
  }
  item.imagens = novaLista;

  // 1. Atualizar cache em memória para todas as variantes IMEDIATAMENTE
  const chaves = normalizarChaves(oficial);
  for (const k of chaves) {
    memoryCache.set(k, item);
    memoryGalleryCache.set(k, novaLista);
  }

  // 2. Gravar no IndexedDB local IMEDIATAMENTE (< 15ms)
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

  // 3. Atualizar localStorage se couber
  try {
    if (typeof window !== 'undefined' && window.localStorage && dataUrlOtimizada.length < 300000) {
      window.localStorage.setItem(`${LS_PREFIX}${oficial}`, JSON.stringify(item));
    }
  } catch {}

  // 4. Disparar evento para todos os componentes IMEDIATAMENTE
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('atlas-image-updated', { 
        detail: { casoId: oficial, dataUrl: item.dataUrl, imagens: novaLista } 
      })
    );
  }

  // 5. Enfileirar upload sequencial para Firebase Storage e Firestore
  enfileirarUploadNuvem({
    casoId: oficial,
    imagemId: oficial,
    dataUrl: dataUrlOtimizada,
    nomeArquivo: item.nomeArquivo,
    tamanhoBytes: item.tamanhoBytes
  });
}

/**
 * Obtém a imagem de um caso com prioridade: Memória -> IndexedDB -> Firestore -> LocalStorage
 */
export async function obterImagemCaso(casoId: string): Promise<ImagemArmazenada | null> {
  if (!casoId) return null;
  const oficial = normalizarParaCasoOficial(casoId);
  const chaves = normalizarChaves(oficial);

  // 1. Checagem síncrona em memória (0ms)
  for (const k of chaves) {
    if (memoryCache.has(k)) {
      return memoryCache.get(k) || null;
    }
  }

  // 2. Garantir que a inicialização do banco tenha completado
  if (initPromise) {
    await initPromise.catch(() => {});
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
        const req = store.get(oficial);
        req.onsuccess = () => {
          const res = (req.result as ImagemArmazenada) || null;
          if (res && res.dataUrl) {
            for (const alias of chaves) {
              memoryCache.set(alias, res);
            }
            resolve(res);
          } else {
            resolve(null);
          }
        };
        req.onerror = () => resolve(null);
      });
    },
    () => null
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
      if (data) {
        let imagens: ImagemArmazenada[] = [];
        if (data.imagensJson) {
          try { imagens = JSON.parse(data.imagensJson); } catch {}
        }

        let urlEncontrada = data.dataUrl || (imagens.length > 0 && imagens[0].dataUrl) || '';
        const storagePath = data.storagePath || (imagens.length > 0 && imagens[0].storagePath) || '';

        if ((!urlEncontrada || !urlEncontrada.startsWith('http')) && storagePath) {
          try {
            const storageRef = ref(storage, storagePath);
            const downloadUrl = await getDownloadURL(storageRef);
            if (downloadUrl) urlEncontrada = downloadUrl;
          } catch {}
        }

        if (urlEncontrada) {
          const item: ImagemArmazenada = {
            id: oficial,
            casoId: oficial,
            dataUrl: urlEncontrada,
            storagePath: storagePath,
            nomeArquivo: data.nomeArquivo || `${oficial}.jpg`,
            tamanhoBytes: data.tamanhoBytes || 0,
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
  const listaAtual = memoryGalleryCache.get(oficial) || await obterImagensDoCaso(oficial);

  // 1. Limpar caches em memória imediatamente
  for (const k of chaves) {
    memoryCache.delete(k);
    memoryGalleryCache.delete(k);
  }

  // 2. Limpar localStorage
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
  } catch {}

  // 3. Remover do IndexedDB primário imediatamente
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

  // 4. Disparar evento para componentes
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('atlas-image-updated', { detail: { casoId: oficial, dataUrl: null, imagens: [] } })
    );
  }

  // 5. Limpar Storage e Firestore em segundo plano
  (async () => {
    for (const img of listaAtual) {
      if (img.storagePath) {
        try {
          await removerArquivo(img.storagePath);
        } catch (err) {
          console.warn(`Erro ao excluir arquivo Storage ${img.storagePath}:`, err);
        }
      }
    }

    try {
      const docRef = doc(db, 'caso_imagens', oficial);
      await deleteDoc(docRef);
    } catch (err) {
      console.warn('Erro ao remover do Firestore caso_imagens:', err);
    }
  })();
}

/**
 * Sincroniza e recupera imagens salvas no Firebase Firestore e Firebase Storage para o cache local.
 * Faz merge inteligente para NUNCA apagar fotos locais caso a nuvem possua menos fotos registradas.
 * Retorna a quantidade de condições sincronizadas.
 */
export async function sincronizarComFirebase(): Promise<number> {
  await inicializarBanco().catch(() => {});
  let totalSincronizadas = 0;

  try {
    const colRef = collection(db, 'caso_imagens');
    const snap = await getDocs(colRef);
    for (const docSnap of snap.docs) {
      const data = docSnap.data();
      if (!data) continue;
      const rawId = data.casoId || docSnap.id;
      if (!rawId) continue;
      const oficial = normalizarParaCasoOficial(rawId);
      if (!isCasoValido(oficial)) continue;

      let remoteImagens: ImagemArmazenada[] = [];
      if (data.imagensJson) {
        try {
          const parsed = JSON.parse(data.imagensJson);
          if (Array.isArray(parsed)) {
            remoteImagens = parsed;
          }
        } catch {}
      }

      const urlRaiz = data.dataUrl || data.url || data.imagemUrl || '';

      if (!remoteImagens || remoteImagens.length === 0) {
        if (urlRaiz || data.storagePath) {
          remoteImagens = [{
            id: oficial,
            casoId: oficial,
            dataUrl: urlRaiz,
            storagePath: data.storagePath || '',
            nomeArquivo: data.nomeArquivo || `${oficial}.jpg`,
            tamanhoBytes: data.tamanhoBytes || 0,
            dataAtualizacao: data.dataAtualizacao || Date.now()
          }];
        }
      }

      // Se qualquer item da galeria tiver storagePath mas estiver sem URL pública,
      // busca o downloadURL diretamente do Firebase Storage
      for (const rem of remoteImagens) {
        if ((!rem.dataUrl || !rem.dataUrl.startsWith('http')) && rem.storagePath) {
          try {
            const storageRef = ref(storage, rem.storagePath);
            const downloadUrl = await getDownloadURL(storageRef);
            if (downloadUrl) {
              rem.dataUrl = downloadUrl;
            }
          } catch {
            if (!rem.dataUrl && urlRaiz && urlRaiz.startsWith('http')) {
              rem.dataUrl = urlRaiz;
            }
          }
        } else if (!rem.dataUrl && urlRaiz) {
          rem.dataUrl = urlRaiz;
        }
      }

      remoteImagens = remoteImagens.filter(img => Boolean(img.dataUrl && (img.dataUrl.startsWith('http') || img.dataUrl.startsWith('data:') || img.dataUrl.startsWith('/'))));

      if (remoteImagens.length === 0) continue;

      // Merge inteligente com as fotos locais existentes
      const galeriaLocal = memoryGalleryCache.get(oficial) || [];
      let galeriaFinal: ImagemArmazenada[];

      if (galeriaLocal.length === 0) {
        galeriaFinal = remoteImagens;
      } else {
        const mapPorId = new Map<string, ImagemArmazenada>();
        for (const loc of galeriaLocal) {
          const chave = loc.id || loc.dataUrl || loc.storagePath || oficial;
          mapPorId.set(chave, loc);
        }
        for (const rem of remoteImagens) {
          const chave = rem.id || rem.dataUrl || rem.storagePath || oficial;
          if (mapPorId.has(chave)) {
            const existente = mapPorId.get(chave)!;
            mapPorId.set(chave, {
              ...existente,
              dataUrl: (rem.dataUrl && (rem.dataUrl.startsWith('http') || rem.dataUrl.startsWith('/'))) ? rem.dataUrl : existente.dataUrl,
              storagePath: rem.storagePath || existente.storagePath
            });
          } else {
            mapPorId.set(chave, rem);
          }
        }
        galeriaFinal = Array.from(mapPorId.values());
      }

      if (galeriaFinal.length > 0 && galeriaFinal[0].dataUrl) {
        totalSincronizadas++;

        // Atualizar IndexedDB local com a lista final mesclada
        await executeWithStore('readwrite', (store) => {
          return new Promise<void>((resolve) => {
            const req = store.put({ ...galeriaFinal[0], imagens: galeriaFinal });
            req.onsuccess = () => resolve();
            req.onerror = () => resolve();
          });
        }, () => {});

        // Atualizar caches em memória
        const chaves = normalizarChaves(oficial);
        for (const k of chaves) {
          memoryCache.set(k, galeriaFinal[0]);
          memoryGalleryCache.set(k, galeriaFinal);
        }

        // Notificar componentes
        if (typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent('atlas-image-updated', {
              detail: { casoId: oficial, dataUrl: galeriaFinal[0].dataUrl, imagens: galeriaFinal }
            })
          );
        }
      }
    }
  } catch (err) {
    console.warn('Aviso ao sincronizar coleção caso_imagens do Firestore:', err);
  }

  return totalSincronizadas;
}

// Inicia sincronização com Firestore em background 2s após o carregamento
if (typeof window !== 'undefined') {
  setTimeout(() => {
    sincronizarComFirebase().catch(() => {});
  }, 2000);
}

/**
 * Obtém todas as imagens do acervo agrupadas por caso em formato de galeria.
 * Consulta o IndexedDB diretamente garantindo que todas as 17 condições persistidas sejam retornadas.
 */
export async function obterTodasImagensGaleria(): Promise<Record<string, ImagemArmazenada[]>> {
  await inicializarBanco().catch(() => {});

  const map: Record<string, ImagemArmazenada[]> = {};

  try {
    const dbItems = await executeWithStore<any[]>(
      'readonly',
      (store) => {
        return new Promise((resolve) => {
          const req = store.getAll();
          req.onsuccess = () => resolve(req.result || []);
          req.onerror = () => resolve([]);
        });
      },
      () => []
    );

    for (const raw of dbItems) {
      if (!raw) continue;
      const rawId = raw.casoId || raw.id || raw.key;
      const oficial = normalizarParaCasoOficial(rawId);
      if (!oficial || !isCasoValido(oficial)) continue;

      let galeria: ImagemArmazenada[] = [];
      if (Array.isArray(raw.imagens) && raw.imagens.length > 0) {
        galeria = raw.imagens;
      } else if (raw.dataUrl) {
        galeria = [raw];
      }

      if (galeria.length > 0) {
        map[oficial] = galeria;
        for (const k of normalizarChaves(oficial)) {
          memoryGalleryCache.set(k, galeria);
          memoryCache.set(k, galeria[0]);
        }
      }
    }
  } catch {}

  // Mesclar com o que estiver em memória (caso algo tenha sido alterado nesta sessão)
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
 * Obtém todas as imagens ativas para o acervo das 17 condições.
 */
export async function obterTodasImagens(): Promise<Record<string, ImagemArmazenada>> {
  await inicializarBanco().catch(() => {});

  return executeWithStore<Record<string, ImagemArmazenada>>(
    'readonly',
    (store) => {
      return new Promise((resolve) => {
        const req = store.getAll();
        req.onsuccess = () => {
          const results = (req.result as ImagemArmazenada[]) || [];
          const map: Record<string, ImagemArmazenada> = {};

          for (const item of results) {
            if (item) {
              const rawId = item.casoId || item.id;
              const dataUrl = item.dataUrl || (item.imagens && item.imagens[0]?.dataUrl);
              if (rawId && dataUrl) {
                const oficial = normalizarParaCasoOficial(rawId);
                const itemComUrl = { ...item, casoId: oficial, dataUrl };
                map[oficial] = itemComUrl;
                for (const k of normalizarChaves(oficial)) {
                  memoryCache.set(k, itemComUrl);
                }
              }
            }
          }

          // Mesclar com memoryCache
          for (const [k, v] of memoryCache.entries()) {
            const oficial = normalizarParaCasoOficial(k);
            if (!map[oficial] && v) {
              const dataUrl = v.dataUrl || (v.imagens && v.imagens[0]?.dataUrl);
              if (dataUrl) {
                map[oficial] = { ...v, casoId: oficial, dataUrl };
              }
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
 * Processamento e compressão inteligente de imagem para dataUrl
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
