import { doc, getDoc, setDoc, updateDoc, deleteDoc, getDocs, collection, query, where } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { otimizarImagemParaArmazenamento } from '../utils/imageStore';
import { enviarFotoCaptura, removerArquivo, comTimeout } from '../utils/fotosNuvem';

export type AnnotationType = 'unitario' | 'duplo' | 'triplo' | 'ostio_vazio' | 'achado' | 'inflamacao';

export interface Annotation {
  id: string;
  session_id: string;
  type: AnnotationType;
  x: number; // 0 to 1 normalized
  y: number; // 0 to 1 normalized
  width: number; // 0 to 1 normalized
  height: number; // 0 to 1 normalized
  sign_slug?: string; // achado ou inflamação
  intensity?: 'Leve' | 'Moderada' | 'Acentuada'; // achado ou inflamação
  note?: string;
  created_at: string;
}

export interface Session {
  id: string;
  userId?: string;
  client_name: string;
  session_date: string;
  area: string;
  image_url: string;
  image_path?: string; // Caminho no Firebase Storage (ex: capturas/{uid}/{id}.jpg)
  field_area_cm2?: number;
  notes?: string;
  created_at: string;
  caso_referencia_id?: string;
  pacienteUid?: string;
  paciente_id?: string;
  liberadoPaciente?: boolean; // Liberação para visualização no Portal do Paciente (padrão false)
}

export interface SessionWithAnnotations {
  session: Session;
  annotations: Annotation[];
}

export interface CountingSummary {
  unitarias: number;
  duplas: number;
  triplas: number;
  totalUnidadesFoliculares: number;
  totalFios: number;
  ostiosVazios: number;
  totalOstios: number;
  mediaFiosPorUF: string; // 1 decimal place or '—'
  pctUnitarias: string; // % or '—'
  achadosCount: number;
  inflamacaoCount: number;
  densidadeFios?: string; // fios/cm² or '—'
  densidadeUF?: string; // UF/cm² or '—'
}

const DB_BANCADA_NAME = 'TricoscopiaBancadaDB_v1';
const STORE_BANCADA_NAME = 'sessoes_bancada';
const DB_BANCADA_VERSION = 1;

let bancadaDbInstance: IDBDatabase | null = null;
let bancadaDbPromise: Promise<IDBDatabase | null> | null = null;

function getBancadaDB(): Promise<IDBDatabase | null> {
  if (typeof window === 'undefined' || !window.indexedDB) return Promise.resolve(null);
  if (bancadaDbInstance) return Promise.resolve(bancadaDbInstance);
  if (bancadaDbPromise) return bancadaDbPromise;

  bancadaDbPromise = new Promise((resolve) => {
    try {
      const req = window.indexedDB.open(DB_BANCADA_NAME, DB_BANCADA_VERSION);
      req.onupgradeneeded = (e) => {
        const db = (e.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_BANCADA_NAME)) {
          db.createObjectStore(STORE_BANCADA_NAME, { keyPath: 'id' });
        }
      };
      req.onsuccess = () => {
        bancadaDbInstance = req.result;
        resolve(bancadaDbInstance);
      };
      req.onerror = () => resolve(null);
      req.onblocked = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
  return bancadaDbPromise;
}

export async function salvarSessaoIndexedDB(payload: SessionWithAnnotations): Promise<void> {
  const db = await getBancadaDB();
  if (!db) return;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_BANCADA_NAME, 'readwrite');
      const store = tx.objectStore(STORE_BANCADA_NAME);
      store.put({ id: payload.session.id, ...payload });
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}

export async function obterSessaoIndexedDB(id: string): Promise<SessionWithAnnotations | null> {
  const db = await getBancadaDB();
  if (!db) return null;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_BANCADA_NAME, 'readonly');
      const store = tx.objectStore(STORE_BANCADA_NAME);
      const req = store.get(id);
      req.onsuccess = () => {
        if (req.result && req.result.session) {
          resolve({ session: req.result.session, annotations: req.result.annotations || [] });
        } else {
          resolve(null);
        }
      };
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

export async function listarSessoesIndexedDB(userId?: string): Promise<Session[]> {
  const db = await getBancadaDB();
  if (!db) return [];
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_BANCADA_NAME, 'readonly');
      const store = tx.objectStore(STORE_BANCADA_NAME);
      const req = store.getAll();
      req.onsuccess = () => {
        const results = req.result || [];
        const sessions: Session[] = [];
        for (const item of results) {
          if (item && item.session) {
            if (!userId || !item.session.userId || item.session.userId === userId) {
              sessions.push(item.session);
            }
          }
        }
        resolve(sessions);
      };
      req.onerror = () => resolve([]);
    } catch {
      resolve([]);
    }
  });
}

export async function removerSessaoIndexedDB(id: string): Promise<void> {
  const db = await getBancadaDB();
  if (!db) return;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_BANCADA_NAME, 'readwrite');
      const store = tx.objectStore(STORE_BANCADA_NAME);
      store.delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}

// Cache em memória compartilhado para acesso ultrarrápido síncrono
const inMemorySessionsCache = new Map<string, SessionWithAnnotations>();

function getStorageKey(userId?: string): string {
  const uid = userId || auth.currentUser?.uid || 'anon';
  return `trico_sessions_store_${uid}`;
}

function getStoredSessions(userId?: string): Record<string, SessionWithAnnotations> {
  const res: Record<string, SessionWithAnnotations> = {};
  
  // 1. Carregar do cache em memória
  inMemorySessionsCache.forEach((val, key) => {
    if (!userId || !val.session.userId || val.session.userId === userId) {
      res[key] = val;
    }
  });

  // 2. Mesclar do localStorage se disponível
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const raw = window.localStorage.getItem(getStorageKey(userId));
      if (raw) {
        const parsed = JSON.parse(raw);
        Object.entries(parsed).forEach(([k, v]) => {
          if (!res[k]) {
            res[k] = v as SessionWithAnnotations;
            inMemorySessionsCache.set(k, v as SessionWithAnnotations);
          }
        });
      }
    } catch {
      // quota or parse error
    }
  }

  return res;
}

function saveStoredSessions(store: Record<string, SessionWithAnnotations>, userId?: string): void {
  // 1. Salvar na memória
  Object.entries(store).forEach(([k, v]) => {
    inMemorySessionsCache.set(k, v);
    // Também salvar no IndexedDB de forma não bloqueante
    salvarSessaoIndexedDB(v).catch(() => {});
  });

  // 2. Tentar salvar no localStorage
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    try {
      window.localStorage.setItem(getStorageKey(userId), JSON.stringify(store));
    } catch {
      // Se estourar a cota de 5MB do localStorage, grava versão leve sem as strings pesadas de dataUrl
      // mantendo a imagem original completa no IndexedDB e Firestore
      const lightStore: Record<string, SessionWithAnnotations> = {};
      Object.entries(store).forEach(([k, v]) => {
        const isDataUrl = v.session.image_url && v.session.image_url.startsWith('data:');
        lightStore[k] = {
          ...v,
          session: {
            ...v.session,
            image_url: isDataUrl ? '' : v.session.image_url
          }
        };
      });
      window.localStorage.setItem(getStorageKey(userId), JSON.stringify(lightStore));
    }
  } catch {
    // Quota handled suavemente pois IndexedDB e memória já mantêm a integridade completa
  }
}

/**
 * Calcula os totais do painel a partir da lista de anotações
 */
export function calculateCountingSummary(
  annotations: Annotation[],
  fieldAreaCm2?: number
): CountingSummary {
  const unitarias = annotations.filter(a => a.type === 'unitario').length;
  const duplas = annotations.filter(a => a.type === 'duplo').length;
  const triplas = annotations.filter(a => a.type === 'triplo').length;
  const ostiosVazios = annotations.filter(a => a.type === 'ostio_vazio').length;
  const achadosCount = annotations.filter(a => a.type === 'achado').length;
  const inflamacaoCount = annotations.filter(a => a.type === 'inflamacao').length;

  const totalUnidadesFoliculares = unitarias + duplas + triplas;
  const totalFios = (unitarias * 1) + (duplas * 2) + (triplas * 3);
  const totalOstios = totalUnidadesFoliculares + ostiosVazios;

  const mediaFiosPorUF = totalUnidadesFoliculares > 0
    ? (totalFios / totalUnidadesFoliculares).toFixed(1)
    : '—';

  const pctUnitarias = totalUnidadesFoliculares > 0
    ? `${Math.round((unitarias / totalUnidadesFoliculares) * 100)}%`
    : '—';

  let densidadeFios: string | undefined = undefined;
  let densidadeUF: string | undefined = undefined;

  if (fieldAreaCm2 && fieldAreaCm2 > 0) {
    densidadeFios = `${Math.round(totalFios / fieldAreaCm2)} fios/cm²`;
    densidadeUF = `${Math.round(totalUnidadesFoliculares / fieldAreaCm2)} UF/cm²`;
  }

  return {
    unitarias,
    duplas,
    triplas,
    totalUnidadesFoliculares,
    totalFios,
    ostiosVazios,
    totalOstios,
    mediaFiosPorUF,
    pctUnitarias,
    achadosCount,
    inflamacaoCount,
    densidadeFios,
    densidadeUF
  };
}

/**
 * Salva uma sessão com todas as suas anotações
 * Se a imagem for data URL, envia para o Firebase Storage e grava a URL de download no Firestore
 */
export async function saveSession(
  sessionData: Omit<Session, 'id' | 'created_at'> & { id?: string; created_at?: string; image_path?: string },
  annotations: Annotation[]
): Promise<SessionWithAnnotations> {
  // Priorizar o UID do usuário atualmente autenticado no Firebase Auth para bater 100% com as regras do Firestore
  const currentUid = auth.currentUser?.uid || sessionData.userId || 'especialista_consultorio';

  const rawId = sessionData.id || `session_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const id = rawId.replace(/[^a-zA-Z0-9_\-\.]/g, '_');
  const now = new Date().toISOString();

  let finalImageUrl = sessionData.image_url;
  let finalImagePath = sessionData.image_path;
  let imagemOtimizada = finalImageUrl;

  // Se a URL for um blob temporário (ex: capturado da câmera ou webcam), converter para dataURL permanente
  if (finalImageUrl && finalImageUrl.startsWith('blob:')) {
    try {
      const blobResp = await fetch(finalImageUrl);
      const blobData = await blobResp.blob();
      finalImageUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blobData);
      });
      imagemOtimizada = finalImageUrl;
    } catch (e) {
      console.warn('Conversão de blob para dataURL:', e);
    }
  }

  // 1. Otimização em memória rápida para canvas (< 50ms)
  if (finalImageUrl && (finalImageUrl.startsWith('data:') || finalImageUrl.startsWith('blob:'))) {
    try {
      imagemOtimizada = await otimizarImagemParaArmazenamento(finalImageUrl);
    } catch {
      imagemOtimizada = finalImageUrl;
    }
  }

  const pacienteIdResolvido = sessionData.paciente_id || (sessionData as any).pacienteId || sessionData.pacienteUid;

  const session: Session = {
    id,
    userId: currentUid,
    client_name: (sessionData.client_name || 'Cliente sem nome').trim(),
    session_date: sessionData.session_date || now.split('T')[0],
    area: sessionData.area || 'Vértice / Vértex',
    image_url: finalImageUrl && finalImageUrl.startsWith('http') ? finalImageUrl : imagemOtimizada,
    image_path: finalImagePath,
    field_area_cm2: sessionData.field_area_cm2,
    notes: sessionData.notes || '',
    created_at: sessionData.created_at || now,
    caso_referencia_id: sessionData.caso_referencia_id,
    paciente_id: pacienteIdResolvido,
    pacienteUid: sessionData.pacienteUid,
    liberadoPaciente: sessionData.liberadoPaciente
  };

  const normalizedAnnotations: Annotation[] = annotations.map(ann => ({
    ...ann,
    session_id: id,
    created_at: ann.created_at || now
  }));

  const payload: SessionWithAnnotations = {
    session,
    annotations: normalizedAnnotations
  };

  // 2. Armazenar com garantia máxima no cache local e IndexedDB (Offline-First / Zero Data Loss)
  try {
    await salvarSessaoIndexedDB(payload);
  } catch (idbErr) {
    console.warn('Aviso ao salvar sessão no IndexedDB:', idbErr);
  }

  const store = getStoredSessions(currentUid);
  store[id] = payload;
  saveStoredSessions(store, currentUid);
  inMemorySessionsCache.set(id, payload);

  // 3. Sincronizar com Firestore no banco de dados (persistência imediata e segura)
  let gravouFirestore = false;
  try {
    const docData: Record<string, any> = {
      id,
      nomePaciente: session.client_name || 'Paciente',
      dataCaptura: session.session_date || now.split('T')[0],
      casoReferenciaId: session.caso_referencia_id || 'cond-androgenetica',
      userId: currentUid,
      area: session.area || 'Vértice / Vértex',
      liberadoPaciente: session.liberadoPaciente ?? false,
      anotacoes: JSON.stringify({
        area: session.area,
        field_area_cm2: session.field_area_cm2,
        notes: session.notes,
        annotations: normalizedAnnotations
      }),
      createdAt: session.created_at,
      updatedAt: now
    };

    if (finalImageUrl && finalImageUrl.startsWith('http')) {
      docData.imagemUrl = finalImageUrl;
      if (finalImagePath) docData.imagemPath = finalImagePath;
    } else {
      docData.imagemDataUrl = imagemOtimizada;
    }

    if (pacienteIdResolvido) {
      docData.pacienteId = String(pacienteIdResolvido);
      docData.paciente_id = String(pacienteIdResolvido);
    }

    if (session.pacienteUid) {
      docData.pacienteUid = String(session.pacienteUid);
    }

    const docRef = doc(db, 'capturas_paciente', id);
    await setDoc(docRef, docData);
    gravouFirestore = true;
    console.info('✅ Sessão gravada com sucesso no banco Firestore:', id);

    // 4. Se houver paciente vinculado, sincronizar também com a coleção consultas_paciente
    if (pacienteIdResolvido) {
      try {
        const consRef = doc(db, 'consultas_paciente', `cons_${id}`);
        const totalUF = normalizedAnnotations.filter(a => ['unitario', 'duplo', 'triplo'].includes(a.type)).length;
        const totalFios = normalizedAnnotations.reduce((acc, a) => {
          if (a.type === 'unitario') return acc + 1;
          if (a.type === 'duplo') return acc + 2;
          if (a.type === 'triplo') return acc + 3;
          return acc;
        }, 0);
        const ostiosVazios = normalizedAnnotations.filter(a => a.type === 'ostio_vazio').length;
        const focosInflamacao = normalizedAnnotations.filter(a => a.type === 'inflamacao').length;
        const achadosCount = normalizedAnnotations.filter(a => a.type === 'achado').length;

        await setDoc(consRef, {
          id: `cons_${id}`,
          userId: currentUid,
          profissionalUid: currentUid,
          pacienteId: String(pacienteIdResolvido),
          pacienteNome: session.client_name || 'Paciente',
          data: session.session_date,
          area: session.area,
          sessionId: id,
          ...(finalImageUrl && finalImageUrl.startsWith('http') ? { imagemUrl: finalImageUrl } : { imagemDataUrl: imagemOtimizada }),
          totalFios: totalFios > 0 ? totalFios : 0,
          totalUF: totalUF > 0 ? totalUF : 0,
          ostiosVazios: ostiosVazios > 0 ? ostiosVazios : 0,
          focosInflamacao: focosInflamacao > 0 ? focosInflamacao : 0,
          achadosCount: achadosCount > 0 ? achadosCount : 0,
          liberadoPaciente: session.liberadoPaciente ?? false,
          createdAt: session.created_at
        });
      } catch (consErr) {
        console.warn('Gravação em consultas_paciente secundário falhou (não bloqueante):', consErr);
      }
    }
  } catch (err: any) {
    console.error('Erro ao gravar captura no Firestore:', err?.code, err?.message, err);
  }

  (payload.session as any).sincronizadoNuvem = gravouFirestore;

  // Notificar ouvintes no app imediatamente
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('trico-session-saved', { detail: payload }));
  }

  // 5. SINCRONIZAÇÃO EM BACKGROUND (Nunca trava a UI nem o botão de salvar)
  (async () => {
    // A. Enviar foto para Cloud Storage em background se ainda for dataUrl
    if (imagemOtimizada && imagemOtimizada.startsWith('data:')) {
      try {
        const uploadResult = await enviarFotoCaptura(id, imagemOtimizada);
        if (uploadResult && uploadResult.url && uploadResult.url.startsWith('http')) {
          console.info('☁️ Foto enviada para Storage em background com sucesso:', uploadResult.path);
          const docRef = doc(db, 'capturas_paciente', id);
          await updateDoc(docRef, {
            imagemUrl: uploadResult.url,
            imagemPath: uploadResult.path
          }).catch(() => {});

          if (pacienteIdResolvido) {
            const consRef = doc(db, 'consultas_paciente', `cons_${id}`);
            await updateDoc(consRef, {
              imagemUrl: uploadResult.url
            }).catch(() => {});
          }

          // Atualizar cache local
          const s = getStoredSessions(currentUid);
          if (s[id]) {
            s[id].session.image_url = uploadResult.url;
            s[id].session.image_path = uploadResult.path;
            saveStoredSessions(s, currentUid);
            inMemorySessionsCache.set(id, s[id]);
            salvarSessaoIndexedDB(s[id]).catch(() => {});
          }
        }
      } catch (uploadErr) {
        console.debug('Aviso upload Storage em background (imagem preservada no Firestore/IndexedDB):', uploadErr);
      }
    }

    // B. Sincronização relacional Cloud SQL
    try {
      const totalUF = normalizedAnnotations.filter(a => ['unitario', 'duplo', 'triplo'].includes(a.type)).length;
      const totalFios = normalizedAnnotations.reduce((acc, a) => {
        if (a.type === 'unitario') return acc + 1;
        if (a.type === 'duplo') return acc + 2;
        if (a.type === 'triplo') return acc + 3;
        return acc;
      }, 0);
      const ostiosVazios = normalizedAnnotations.filter(a => a.type === 'ostio_vazio').length;
      const focosInflamacao = normalizedAnnotations.filter(a => a.type === 'inflamacao').length;
      const achadosCount = normalizedAnnotations.filter(a => a.type === 'achado').length;

      // Cloud SQL local
      fetch('/api/sessoes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          userId: currentUid,
          clientName: session.client_name || 'Paciente',
          sessionDate: session.session_date || now.split('T')[0],
          area: session.area || 'Vértice / Vértex',
          imageUrl: session.image_url,
          imagePath: session.image_path,
          fieldAreaCm2: session.field_area_cm2,
          notes: session.notes,
          casoReferenciaId: session.caso_referencia_id,
          pacienteId: pacienteIdResolvido ? String(pacienteIdResolvido) : undefined,
          pacienteUid: session.pacienteUid ? String(session.pacienteUid) : undefined,
          liberadoPaciente: session.liberadoPaciente ?? false,
          annotationsJson: JSON.stringify(normalizedAnnotations),
          totalFios,
          totalUf: totalUF,
          ostiosVazios,
          focosInflamacao,
          achadosCount,
          createdAt: session.created_at,
          updatedAt: now
        })
      }).catch(() => {});
    } catch {}
  })();

  return payload;
}

/**
 * Obtém uma sessão por ID (Memória -> IndexedDB -> Firestore)
 */
export async function getSession(id: string): Promise<SessionWithAnnotations | null> {
  const currentUid = auth.currentUser?.uid;
  const store = getStoredSessions(currentUid);
  if (store[id] && store[id].session.image_url) {
    return store[id];
  }

  // 1. Tentar IndexedDB primeiro
  try {
    const idbSess = await obterSessaoIndexedDB(id);
    if (idbSess && idbSess.session && idbSess.session.image_url) {
      store[id] = idbSess;
      inMemorySessionsCache.set(id, idbSess);
      return idbSess;
    }
  } catch (err) {
    console.warn('Erro ao ler do IndexedDB:', err);
  }

  // 2. Buscar no Firestore na nuvem
  try {
    const docRef = doc(db, 'capturas_paciente', id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      let annotations: Annotation[] = [];
      let area = 'Vértice / Vértex';
      let field_area_cm2: number | undefined;
      let notes = '';

      try {
        if (data.anotacoes && data.anotacoes.startsWith('{')) {
          const parsed = JSON.parse(data.anotacoes);
          annotations = parsed.annotations || [];
          area = parsed.area || data.area || area;
          field_area_cm2 = parsed.field_area_cm2;
          notes = parsed.notes || '';
        } else {
          notes = data.anotacoes || '';
        }
      } catch {
        notes = data.anotacoes || '';
      }

      // Suporte retrocompatível para registros (imagemUrl || imagemDataUrl)
      const image_url = data.imagemUrl || data.imagemDataUrl || store[id]?.session.image_url || '';
      const image_path = data.imagemPath || (data.userId ? `capturas/${data.userId}/${data.id}.jpg` : undefined);

      const session: Session = {
        id: data.id,
        userId: data.userId || undefined,
        client_name: data.nomePaciente || 'Cliente',
        session_date: data.dataCaptura || new Date().toISOString().split('T')[0],
        area,
        image_url,
        image_path,
        field_area_cm2,
        notes,
        created_at: data.createdAt || new Date().toISOString(),
        caso_referencia_id: data.casoReferenciaId,
        paciente_id: data.pacienteId || data.paciente_id,
        pacienteUid: data.pacienteUid,
        liberadoPaciente: data.liberadoPaciente ?? false
      };

      const result: SessionWithAnnotations = { session, annotations };
      store[id] = result;
      inMemorySessionsCache.set(id, result);
      salvarSessaoIndexedDB(result).catch(() => {});
      saveStoredSessions(store, currentUid);
      return result;
    }
  } catch (err: any) {
    console.warn('Erro ao buscar sessão no Firestore:', err);
  }

  return store[id] || null;
}

/**
 * Lista todas as sessões salvas pertencentes exclusivamente ao usuário profissional
 */
export async function listSessions(userId?: string): Promise<Session[]> {
  const currentUid = userId || auth.currentUser?.uid;
  const store = getStoredSessions(currentUid);

  // 1. Carregar do IndexedDB persistente
  try {
    const idbList = await listarSessoesIndexedDB(currentUid);
    for (const sess of idbList) {
      if (sess && sess.id) {
        if (!store[sess.id]) {
          store[sess.id] = { session: sess, annotations: [] };
          inMemorySessionsCache.set(sess.id, store[sess.id]);
        } else if (!store[sess.id].session.image_url && sess.image_url) {
          store[sess.id].session.image_url = sess.image_url;
        }
      }
    }
  } catch (err) {
    console.warn('Erro ao carregar sessões do IndexedDB:', err);
  }

  let list: Session[] = Object.values(store).map(s => s.session);

  // 2. Sincronizar com Firestore na nuvem
  try {
    const colRef = collection(db, 'capturas_paciente');
    let snapshot;
    if (currentUid && currentUid !== 'especialista_consultorio') {
      try {
        const q = query(colRef, where('userId', '==', currentUid));
        snapshot = await getDocs(q);
      } catch {
        snapshot = await getDocs(colRef);
      }
    } else {
      snapshot = await getDocs(colRef);
    }

    if (snapshot && !snapshot.empty) {
      snapshot.forEach(docSnap => {
        const data = docSnap.data();
        const imageUrl = data.imagemUrl || data.imagemDataUrl || '';
        if (data && data.id) {
          if (!currentUid || !data.userId || data.userId === currentUid || data.userId === 'especialista_consultorio') {
            let area = data.area || 'Vértice / Vértex';
            let field_area_cm2: number | undefined;
            let notes = '';
            let annotations: Annotation[] = [];

            try {
              if (data.anotacoes && data.anotacoes.startsWith('{')) {
                const parsed = JSON.parse(data.anotacoes);
                annotations = parsed.annotations || [];
                area = parsed.area || data.area || area;
                field_area_cm2 = parsed.field_area_cm2;
                notes = parsed.notes || '';
              } else {
                notes = data.anotacoes || '';
              }
            } catch {
              notes = data.anotacoes || '';
            }

            const session: Session = {
              id: data.id,
              userId: data.userId || currentUid,
              client_name: data.nomePaciente || 'Cliente',
              session_date: data.dataCaptura || new Date().toISOString().split('T')[0],
              area,
              image_url: imageUrl || store[data.id]?.session.image_url || '',
              image_path: data.imagemPath || (data.userId ? `capturas/${data.userId}/${data.id}.jpg` : undefined),
              field_area_cm2,
              notes,
              created_at: data.createdAt || new Date().toISOString(),
              caso_referencia_id: data.casoReferenciaId,
              paciente_id: data.pacienteId || data.paciente_id,
              pacienteUid: data.pacienteUid,
              liberadoPaciente: data.liberadoPaciente ?? false
            };

            const payload: SessionWithAnnotations = { session, annotations };
            const existing = store[data.id];
            if (!existing) {
              store[data.id] = payload;
            } else {
              if (imageUrl) existing.session.image_url = imageUrl;
              if (session.area) existing.session.area = session.area;
              if (session.paciente_id) existing.session.paciente_id = session.paciente_id;
            }
            inMemorySessionsCache.set(data.id, store[data.id]);
            salvarSessaoIndexedDB(store[data.id]).catch(() => {});
          }
        }
      });
      saveStoredSessions(store, currentUid);
      list = Object.values(store).map(s => s.session);
    }
  } catch (err: any) {
    console.warn('Listagem de sessões no Firestore falhou (mantendo locais):', err);
  }

  if (currentUid && currentUid !== 'especialista_consultorio') {
    list = list.filter(s => !s.userId || s.userId === currentUid || s.userId === 'especialista_consultorio');
  }

  list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  return list;
}

/**
 * Deleta uma sessão por ID, apagando tanto o documento no Firestore quanto o arquivo no Storage e bancos locais
 */
export async function deleteSession(id: string): Promise<void> {
  const currentUid = auth.currentUser?.uid;
  const store = getStoredSessions(currentUid);
  const sessionItem = store[id];
  const storagePath = sessionItem?.session.image_path || (currentUid ? `capturas/${currentUid}/${id}.jpg` : null);

  // 1. Apagar arquivo do Firebase Storage se existir
  if (storagePath) {
    try {
      await removerArquivo(storagePath);
    } catch (err) {
      console.warn(`Erro ao excluir arquivo do Storage (${storagePath}):`, err);
    }
  }

  // 2. Apagar documento do Firestore
  try {
    const docRef = doc(db, 'capturas_paciente', id);
    await deleteDoc(docRef);
  } catch (err: any) {
    console.error('Erro ao deletar documento no Firestore:', err);
  }

  // 3. Atualizar cache local e IndexedDB
  delete store[id];
  inMemorySessionsCache.delete(id);
  removerSessaoIndexedDB(id).catch(() => {});
  saveStoredSessions(store, currentUid);

  // 4. Excluir do Cloud SQL PostgreSQL
  try {
    await fetch(`/api/sessoes/${id}`, { method: 'DELETE' });
  } catch (sqlErr) {
    console.debug('Aviso ao excluir sessão do Cloud SQL (não bloqueante):', sqlErr);
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('trico-session-deleted', { detail: { id } }));
  }
}

/**
 * Alterna a liberação de uma foto/captura tricoscópica para o Portal do Paciente
 */
export async function alternarLiberacaoCaptura(id: string, liberado: boolean): Promise<void> {
  const currentUid = auth.currentUser?.uid;
  const store = getStoredSessions(currentUid);
  if (store[id]) {
    store[id].session.liberadoPaciente = liberado;
    saveStoredSessions(store, currentUid);
  }

  try {
    const docRef = doc(db, 'capturas_paciente', id);
    await setDoc(docRef, { liberadoPaciente: liberado, updatedAt: new Date().toISOString() }, { merge: true });
  } catch (err) {
    console.warn('Erro ao atualizar liberação da captura no Firestore:', err);
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('trico-session-saved', { detail: store[id] || { id, liberadoPaciente: liberado } }));
  }
}

