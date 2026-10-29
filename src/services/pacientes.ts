import { doc, getDoc, setDoc, deleteDoc, getDocs, collection, query, where } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { Paciente, ConsultaRegistro, FotoGlobalPaciente } from '../types/paciente';
import { listSessions, getSession } from './annotations';

function getStorageKey(userId?: string): string {
  const uid = userId || auth.currentUser?.uid || 'anon';
  return `trico_pacientes_store_${uid}`;
}

function getStoredPacientesLocal(userId?: string): Record<string, Paciente> {
  if (typeof window === 'undefined' || !window.localStorage) return {};
  try {
    const raw = window.localStorage.getItem(getStorageKey(userId));
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveStoredPacientesLocal(store: Record<string, Paciente>, userId?: string): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    window.localStorage.setItem(getStorageKey(userId), JSON.stringify(store));
  } catch {
    // quota
  }
}

/**
 * Lista os pacientes cadastrados exclusivamente pelo profissional autenticado
 */
export async function listPacientes(userId?: string): Promise<Paciente[]> {
  const currentUid = userId || auth.currentUser?.uid;
  const localMap = getStoredPacientesLocal(currentUid);
  
  // Tentar buscar do Firestore filtrado estritamente por userId
  try {
    const colRef = collection(db, 'pacientes');
    let snapshot;
    
    if (currentUid) {
      const q = query(colRef, where('userId', '==', currentUid));
      snapshot = await getDocs(q);
    } else {
      snapshot = await getDocs(colRef);
    }

    if (snapshot && !snapshot.empty) {
      snapshot.forEach(docSnap => {
        const data = docSnap.data() as Paciente;
        if (data && data.id && data.nome) {
          // Garante que só carrega pacientes deste profissional
          if (!currentUid || data.userId === currentUid) {
            localMap[data.id] = data;
          }
        }
      });
      saveStoredPacientesLocal(localMap, currentUid);
    }
  } catch (err) {
    console.warn('Usando armazenamento local isolado de pacientes:', err);
  }

  let list = Object.values(localMap);
  if (currentUid) {
    list = list.filter(p => p.userId === currentUid);
  }

  return list.sort((a, b) => a.nome.localeCompare(b.nome));
}

/**
 * Obtém paciente por ID
 */
export async function getPaciente(id: string, userId?: string): Promise<Paciente | null> {
  const currentUid = userId || auth.currentUser?.uid;
  const localMap = getStoredPacientesLocal(currentUid);
  if (localMap[id]) return localMap[id];

  try {
    const docRef = doc(db, 'pacientes', id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const data = docSnap.data() as Paciente;
      if (!currentUid || data.userId === currentUid) {
        localMap[id] = data;
        saveStoredPacientesLocal(localMap, currentUid);
        return data;
      }
    }
  } catch {
    // offline
  }

  return null;
}

/**
 * Salva ou atualiza um paciente no Firestore e LocalStorage vinculado ao profissional
 */
export async function savePaciente(
  pacienteData: Omit<Paciente, 'id' | 'createdAt' | 'updatedAt'> & { id?: string; createdAt?: string; userId?: string } & Partial<Paciente>
): Promise<Paciente> {
  const currentUid = pacienteData.userId || auth.currentUser?.uid || 'sem_usuario';
  const id = pacienteData.id || `pac_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const now = new Date().toISOString();

  // Preserva campos pré-existentes caso seja uma edição
  const localMap = getStoredPacientesLocal(currentUid);
  const existente = localMap[id];

  const paciente: Paciente = {
    ...existente,
    ...pacienteData,
    id,
    userId: currentUid,
    nome: pacienteData.nome.trim(),
    telefone: pacienteData.telefone?.trim() || '',
    email: pacienteData.email?.trim() || '',
    dataNascimento: pacienteData.dataNascimento || '',
    genero: pacienteData.genero || '',
    queixaPrincipal: pacienteData.queixaPrincipal?.trim() || '',
    historicoClinico: pacienteData.historicoClinico?.trim() || '',
    createdAt: pacienteData.createdAt || existente?.createdAt || now,
    updatedAt: now
  };

  // 1. Local
  localMap[id] = paciente;
  saveStoredPacientesLocal(localMap, currentUid);

  // 2. Firestore (removendo chaves com valor undefined para compatibilidade com o Firestore SDK)
  try {
    const dadosLimposParaFirestore: Record<string, any> = {};
    Object.entries(paciente).forEach(([k, v]) => {
      if (v !== undefined) {
        dadosLimposParaFirestore[k] = v;
      }
    });

    const docRef = doc(db, 'pacientes', id);
    await setDoc(docRef, dadosLimposParaFirestore, { merge: true });
  } catch (err) {
    console.warn('Erro ao salvar paciente no Firestore (mantendo local):', err);
  }

  // 3. Sincronizar com Cloud SQL PostgreSQL
  try {
    await fetch('/api/pacientes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: paciente.id,
        userId: paciente.userId,
        nome: paciente.nome,
        telefone: paciente.telefone,
        email: paciente.email,
        dataNascimento: paciente.dataNascimento,
        genero: paciente.genero,
        queixaPrincipal: paciente.queixaPrincipal,
        historicoClinico: paciente.historicoClinico,
        portalAtivo: paciente.portalAtivo ?? false,
        portalConviteToken: paciente.portalConviteToken,
        portalConviteExpiraEm: paciente.portalConviteExpiraEm,
        portalAtivadoEm: paciente.portalAtivadoEm,
        createdAt: paciente.createdAt,
        updatedAt: paciente.updatedAt
      })
    });
  } catch (sqlErr) {
    console.debug('Persistência paciente no Cloud SQL (não bloqueante):', sqlErr);
  }

  // Notificar ouvintes
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('trico-paciente-saved', { detail: paciente }));
  }

  return paciente;
}

/**
 * Exclui um paciente do sistema
 */
export async function deletePaciente(id: string, userId?: string): Promise<void> {
  const currentUid = userId || auth.currentUser?.uid;
  const localMap = getStoredPacientesLocal(currentUid);
  delete localMap[id];
  saveStoredPacientesLocal(localMap, currentUid);

  try {
    const docRef = doc(db, 'pacientes', id);
    await deleteDoc(docRef);
  } catch (err) {
    console.warn('Aviso ao deletar paciente do Firestore:', err);
  }

  // Excluir do Cloud SQL PostgreSQL
  try {
    await fetch(`/api/pacientes/${id}`, { method: 'DELETE' });
  } catch (sqlErr) {
    console.debug('Exclusão paciente Cloud SQL (não bloqueante):', sqlErr);
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('trico-paciente-deleted', { detail: { id } }));
  }
}

/**
 * Agrega e lista todas as consultas registradas para um paciente pertencentes ao profissional
 */
export async function getConsultasDoPaciente(paciente: Paciente): Promise<ConsultaRegistro[]> {
  const consultas: ConsultaRegistro[] = [];
  const currentUid = auth.currentUser?.uid || paciente.userId || 'especialista_consultorio';

  try {
    const sessoes = await listSessions(currentUid);
    const nomeNorm = paciente.nome.toLowerCase().trim();

    for (const sess of sessoes) {
      const matchPorNome = sess.client_name && sess.client_name.toLowerCase().trim() === nomeNorm;
      const matchPorId = (sess as any).paciente_id === paciente.id || (sess as any).pacienteId === paciente.id;

      if (matchPorNome || matchPorId) {
        const sessionCompleta = await getSession(sess.id);
        const annotations = sessionCompleta?.annotations || [];

        const totalUF = annotations.filter(a => ['unitario', 'duplo', 'triplo'].includes(a.type)).length;
        const totalFios = annotations.reduce((acc, a) => {
          if (a.type === 'unitario') return acc + 1;
          if (a.type === 'duplo') return acc + 2;
          if (a.type === 'triplo') return acc + 3;
          return acc;
        }, 0);
        const ostiosVazios = annotations.filter(a => a.type === 'ostio_vazio').length;
        const focosInflamacao = annotations.filter(a => a.type === 'inflamacao').length;
        const achadosCount = annotations.filter(a => a.type === 'achado').length;

        consultas.push({
          id: `cons_${sess.id}`,
          userId: currentUid,
          pacienteId: paciente.id,
          pacienteNome: paciente.nome,
          data: sess.session_date,
          area: sess.area || sessionCompleta?.session.area || 'Vértice / Vértex',
          queixaEvolucao: sess.notes || undefined,
          condutaTratamento: undefined,
          sessionId: sess.id,
          imagemUrl: sess.image_url,
          totalFios: totalFios > 0 ? totalFios : undefined,
          totalUF: totalUF > 0 ? totalUF : undefined,
          ostiosVazios: ostiosVazios > 0 ? ostiosVazios : undefined,
          focosInflamacao: focosInflamacao > 0 ? focosInflamacao : undefined,
          achadosCount: achadosCount > 0 ? achadosCount : undefined,
          liberadoPaciente: sess.liberadoPaciente ?? sessionCompleta?.session.liberadoPaciente ?? false,
          createdAt: sess.created_at
        });
      }
    }
  } catch (err) {
    console.warn('Erro ao agregar consultas do paciente:', err);
  }

  // 2. Mesclar consultas avulsas do paciente (Firestore e Local)
  try {
    const colRef = collection(db, 'consultas_paciente');
    const q = query(colRef, where('pacienteId', '==', paciente.id));
    const snap = await getDocs(q);
    if (!snap.empty) {
      const firestoreList: ConsultaRegistro[] = [];
      snap.forEach(docSnap => {
        const d = docSnap.data() as any;
        firestoreList.push({
          ...d,
          imagemUrl: d.imagemUrl || d.imagemDataUrl || ''
        });
      });
      saveStoredConsultasAvulsasLocal(firestoreList, currentUid);
      consultas.push(...firestoreList);
    } else {
      const avulsas = getStoredConsultasAvulsasLocal(currentUid).filter(c => c.pacienteId === paciente.id);
      consultas.push(...avulsas);
    }
  } catch {
    const avulsas = getStoredConsultasAvulsasLocal(currentUid).filter(c => c.pacienteId === paciente.id);
    consultas.push(...avulsas);
  }

  // Deduplicar por id preservando com inteligência imagemUrl e métricas da sessão da bancada
  const mapConsultas = new Map<string, ConsultaRegistro>();
  for (const c of consultas) {
    const existing = mapConsultas.get(c.id);
    if (!existing) {
      mapConsultas.set(c.id, c);
    } else {
      mapConsultas.set(c.id, {
        ...existing,
        ...c,
        imagemUrl: (existing.imagemUrl && existing.imagemUrl.trim() !== '') ? existing.imagemUrl : (c.imagemUrl || (existing as any).imagemDataUrl || (c as any).imagemDataUrl || ''),
        fotos: existing.fotos || c.fotos,
        anotacoes: existing.anotacoes || c.anotacoes,
        tipoConsulta: existing.tipoConsulta || c.tipoConsulta,
        sessionId: existing.sessionId || c.sessionId,
        area: existing.area || c.area,
        totalFios: existing.totalFios ?? c.totalFios,
        totalUF: existing.totalUF ?? c.totalUF,
        ostiosVazios: existing.ostiosVazios ?? c.ostiosVazios,
        focosInflamacao: existing.focosInflamacao ?? c.focosInflamacao,
        achadosCount: existing.achadosCount ?? c.achadosCount
      });
    }
  }
  const listaFinal = Array.from(mapConsultas.values());

  // Para qualquer consulta vinculada à bancada (sessionId) que ainda não tenha foto carregada, recuperar do banco/sessão
  for (const c of listaFinal) {
    if (c.sessionId && (!c.imagemUrl || c.imagemUrl.trim() === '')) {
      try {
        const full = await getSession(c.sessionId);
        if (full?.session.image_url) {
          c.imagemUrl = full.session.image_url;
        }
      } catch {}
    }
  }

  listaFinal.sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());
  return listaFinal;
}

function getStoredConsultasAvulsasLocal(userId?: string): ConsultaRegistro[] {
  const uid = userId || auth.currentUser?.uid || 'anon';
  if (typeof window === 'undefined' || !window.localStorage) return [];
  try {
    const raw = window.localStorage.getItem(`trico_consultas_avulsas_${uid}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveStoredConsultasAvulsasLocal(list: ConsultaRegistro[], userId?: string): void {
  const uid = userId || auth.currentUser?.uid || 'anon';
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    window.localStorage.setItem(`trico_consultas_avulsas_${uid}`, JSON.stringify(list));
  } catch {
    // quota
  }
}

export async function saveConsultaAvulsa(
  consultaData: Omit<ConsultaRegistro, 'id' | 'createdAt'> & { id?: string; createdAt?: string }
): Promise<ConsultaRegistro> {
  const currentUid = consultaData.userId || auth.currentUser?.uid || 'sem_usuario';
  const id = consultaData.id || `cons_avulsa_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const now = new Date().toISOString();

  const consulta: ConsultaRegistro = {
    ...consultaData,
    id,
    userId: currentUid,
    profissionalUid: consultaData.profissionalUid || currentUid,
    liberadoPaciente: consultaData.liberadoPaciente ?? false,
    createdAt: consultaData.createdAt || now
  };

  const list = getStoredConsultasAvulsasLocal(currentUid);
  const idx = list.findIndex(c => c.id === id);
  if (idx >= 0) {
    list[idx] = consulta;
  } else {
    list.unshift(consulta);
  }
  saveStoredConsultasAvulsasLocal(list, currentUid);

  try {
    const docRef = doc(db, 'consultas_paciente', id);
    await setDoc(docRef, consulta);
  } catch (err) {
    console.warn('Erro ao salvar consulta avulsa no Firestore (mantendo local):', err);
  }

  return consulta;
}

export async function alternarLiberacaoConsulta(
  consultaId: string,
  liberado: boolean,
  pacienteId?: string,
  userId?: string
): Promise<void> {
  const currentUid = userId || auth.currentUser?.uid;
  const list = getStoredConsultasAvulsasLocal(currentUid);
  const idx = list.findIndex(c => c.id === consultaId);
  if (idx >= 0) {
    list[idx].liberadoPaciente = liberado;
    saveStoredConsultasAvulsasLocal(list, currentUid);
  }

  try {
    const docRef = doc(db, 'consultas_paciente', consultaId);
    await setDoc(docRef, { liberadoPaciente: liberado }, { merge: true });
  } catch (err) {
    console.warn('Erro ao atualizar liberação no Firestore:', err);
  }
}

export async function deleteConsultaAvulsa(id: string, userId?: string): Promise<void> {
  const currentUid = userId || auth.currentUser?.uid;
  const list = getStoredConsultasAvulsasLocal(currentUid).filter(c => c.id !== id);
  saveStoredConsultasAvulsasLocal(list, currentUid);

  try {
    const docRef = doc(db, 'consultas_paciente', id);
    await deleteDoc(docRef);
  } catch (err) {
    console.warn('Erro ao deletar consulta do Firestore:', err);
  }
}

/* ============================================================================
 * FOTOGRAFIAS CLÍNICAS GLOBAIS (MACROSCÓPICAS) DO PACIENTE
 * ============================================================================ */

function getFotosGlobaisStorageKey(userId?: string): string {
  const uid = userId || auth.currentUser?.uid || 'anon';
  return `trico_fotos_globais_${uid}`;
}

function getStoredFotosGlobaisLocal(userId?: string): Record<string, FotoGlobalPaciente[]> {
  if (typeof window === 'undefined' || !window.localStorage) return {};
  try {
    const raw = window.localStorage.getItem(getFotosGlobaisStorageKey(userId));
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveStoredFotosGlobaisLocal(store: Record<string, FotoGlobalPaciente[]>, userId?: string): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    window.localStorage.setItem(getFotosGlobaisStorageKey(userId), JSON.stringify(store));
  } catch {
    // quota
  }
}

/**
 * Lista as fotos clínicas globais de um paciente específico
 */
export async function listFotosGlobaisDoPaciente(
  pacienteId: string,
  userId?: string
): Promise<FotoGlobalPaciente[]> {
  const currentUid = userId || auth.currentUser?.uid;
  const store = getStoredFotosGlobaisLocal(currentUid);
  const locais = store[pacienteId] || [];

  // Tentar buscar do Firestore
  try {
    const colRef = collection(db, 'fotos_globais_paciente');
    const q = query(colRef, where('pacienteId', '==', pacienteId));
    const snap = await getDocs(q);
    if (snap && !snap.empty) {
      const doFirestore: FotoGlobalPaciente[] = [];
      snap.forEach(d => {
        const item = d.data() as FotoGlobalPaciente;
        if (item && item.id) {
          doFirestore.push(item);
        }
      });

      // Mesclar priorizando os mais recentes
      const mapa = new Map<string, FotoGlobalPaciente>();
      [...locais, ...doFirestore].forEach(f => mapa.set(f.id, f));
      const mescladas = Array.from(mapa.values());
      mescladas.sort((a, b) => new Date(b.data || b.createdAt).getTime() - new Date(a.data || a.createdAt).getTime());
      store[pacienteId] = mescladas;
      saveStoredFotosGlobaisLocal(store, currentUid);
      return mescladas;
    }
  } catch (err) {
    console.debug('Usando fotos globais locais:', err);
  }

  return locais.sort((a, b) => new Date(b.data || b.createdAt).getTime() - new Date(a.data || a.createdAt).getTime());
}

/**
 * Salva uma nova fotografia clínica global na ficha do paciente
 */
export async function saveFotoGlobalDoPaciente(
  fotoData: Omit<FotoGlobalPaciente, 'id' | 'createdAt'> & { id?: string; createdAt?: string }
): Promise<FotoGlobalPaciente> {
  const currentUid = fotoData.userId || auth.currentUser?.uid || 'sem_usuario';
  const id = fotoData.id || `foto_global_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const now = new Date().toISOString();

  const foto: FotoGlobalPaciente = {
    ...fotoData,
    id,
    userId: currentUid,
    profissionalUid: fotoData.profissionalUid || currentUid,
    liberadoPaciente: fotoData.liberadoPaciente ?? false,
    createdAt: fotoData.createdAt || now,
    updatedAt: now
  };

  // Salvar no storage local
  const store = getStoredFotosGlobaisLocal(currentUid);
  const lista = store[foto.pacienteId] || [];
  const idx = lista.findIndex(f => f.id === id);
  if (idx >= 0) {
    lista[idx] = foto;
  } else {
    lista.unshift(foto);
  }
  store[foto.pacienteId] = lista;
  saveStoredFotosGlobaisLocal(store, currentUid);

  // Salvar no Firestore
  try {
    const docRef = doc(db, 'fotos_globais_paciente', id);
    await setDoc(docRef, foto, { merge: true });
  } catch (err) {
    console.warn('Erro ao salvar foto global no Firestore (mantendo local):', err);
  }

  // Notificar outros componentes do app
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('trico-foto-global-salva', { detail: foto }));
  }

  return foto;
}

/**
 * Remove uma fotografia clínica global
 */
export async function deleteFotoGlobalDoPaciente(
  id: string,
  pacienteId: string,
  userId?: string
): Promise<void> {
  const currentUid = userId || auth.currentUser?.uid;
  const store = getStoredFotosGlobaisLocal(currentUid);
  if (store[pacienteId]) {
    store[pacienteId] = store[pacienteId].filter(f => f.id !== id);
    saveStoredFotosGlobaisLocal(store, currentUid);
  }

  try {
    const docRef = doc(db, 'fotos_globais_paciente', id);
    await deleteDoc(docRef);
  } catch (err) {
    console.warn('Erro ao excluir foto global no Firestore:', err);
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('trico-foto-global-removida', { detail: { id, pacienteId } }));
  }
}

/**
 * Alterna a liberação da fotografia clínica global no Portal do Paciente
 */
export async function alternarLiberacaoFotoGlobal(
  id: string,
  pacienteId: string,
  liberado: boolean,
  userId?: string
): Promise<void> {
  const currentUid = userId || auth.currentUser?.uid;
  const store = getStoredFotosGlobaisLocal(currentUid);
  if (store[pacienteId]) {
    const item = store[pacienteId].find(f => f.id === id);
    if (item) item.liberadoPaciente = liberado;
    saveStoredFotosGlobaisLocal(store, currentUid);
  }

  try {
    const docRef = doc(db, 'fotos_globais_paciente', id);
    await setDoc(docRef, { liberadoPaciente: liberado, updatedAt: new Date().toISOString() }, { merge: true });
  } catch (err) {
    console.warn('Erro ao atualizar liberação da foto global no Firestore:', err);
  }
}
