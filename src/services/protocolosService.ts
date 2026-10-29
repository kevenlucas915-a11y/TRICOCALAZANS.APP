import { 
  collection, 
  doc, 
  getDocs, 
  setDoc, 
  deleteDoc, 
  query, 
  where 
} from 'firebase/firestore';
import { db, auth } from '../firebase';
import { ProtocoloPaciente, SessaoProtocoloRegistro, StatusProtocolo } from '../types/protocolo';

function getStorageKey(pacienteId: string): string {
  return `trico_protocolos_paciente_${pacienteId}`;
}

function getStoredLocal(pacienteId: string): ProtocoloPaciente[] {
  if (typeof window === 'undefined' || !window.localStorage) return [];
  try {
    const raw = window.localStorage.getItem(getStorageKey(pacienteId));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveStoredLocal(pacienteId: string, lista: ProtocoloPaciente[]): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    window.localStorage.setItem(getStorageKey(pacienteId), JSON.stringify(lista));
  } catch {
    // quota
  }
}

/**
 * Lista todos os protocolos clínicos cadastrados para um determinado paciente.
 */
export async function listarProtocolosDoPaciente(
  pacienteId: string,
  apenasLiberados: boolean = false
): Promise<ProtocoloPaciente[]> {
  const localList = getStoredLocal(pacienteId);

  try {
    const colRef = collection(db, 'protocolos_paciente');
    const q = query(colRef, where('pacienteId', '==', pacienteId));
    const snap = await getDocs(q);

    if (!snap.empty) {
      const firestoreList: ProtocoloPaciente[] = [];
      snap.forEach(docSnap => {
        firestoreList.push(docSnap.data() as ProtocoloPaciente);
      });

      saveStoredLocal(pacienteId, firestoreList);

      let resultado = firestoreList;
      if (apenasLiberados) {
        resultado = resultado.filter(p => p.liberadoPaciente === true);
      }
      return resultado.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
  } catch (err) {
    console.warn('Usando armazenamento local de protocolos do paciente:', err);
  }

  let finalLocal = localList;
  if (apenasLiberados) {
    finalLocal = finalLocal.filter(p => p.liberadoPaciente === true);
  }
  return finalLocal.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

/**
 * Salva ou atualiza um protocolo terapêutico para o paciente.
 */
export async function salvarProtocoloPaciente(
  dados: Omit<ProtocoloPaciente, 'id' | 'createdAt' | 'updatedAt' | 'sessoesRealizadas'> & {
    id?: string;
    createdAt?: string;
    sessoesRealizadas?: SessaoProtocoloRegistro[];
  }
): Promise<ProtocoloPaciente> {
  const id = dados.id || `prot_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const now = new Date().toISOString();

  const protocolo: ProtocoloPaciente = {
    id,
    pacienteId: dados.pacienteId,
    pacienteNome: dados.pacienteNome,
    profissionalUid: dados.profissionalUid || auth.currentUser?.uid || 'sem_profissional',
    userId: dados.userId || auth.currentUser?.uid || 'sem_usuario',
    titulo: dados.titulo.trim(),
    objetivo: dados.objetivo.trim(),
    categoria: dados.categoria,
    status: dados.status || 'em_andamento',
    dataInicio: dados.dataInicio || now.split('T')[0],
    previsaoTermino: dados.previsaoTermino,
    frequencia: dados.frequencia,
    totalSessoesPlanejadas: dados.totalSessoesPlanejadas || 1,
    sessoesRealizadas: dados.sessoesRealizadas || [],
    etapasProcedimento: dados.etapasProcedimento?.trim(),
    produtosHomeCare: dados.produtosHomeCare?.trim(),
    observacoes: dados.observacoes?.trim(),
    liberadoPaciente: dados.liberadoPaciente ?? false,
    createdAt: dados.createdAt || now,
    updatedAt: now
  };

  // 1. Salvar no cache local
  const list = getStoredLocal(protocolo.pacienteId);
  const idx = list.findIndex(p => p.id === id);
  if (idx >= 0) {
    list[idx] = protocolo;
  } else {
    list.unshift(protocolo);
  }
  saveStoredLocal(protocolo.pacienteId, list);

  // 2. Salvar no Firestore
  try {
    const docRef = doc(db, 'protocolos_paciente', id);
    await setDoc(docRef, protocolo);
  } catch (err) {
    console.warn('Erro ao salvar protocolo no Firestore (mantido localmente):', err);
  }

  return protocolo;
}

/**
 * Adiciona uma sessão realizada ao protocolo
 */
export async function registrarSessaoProtocolo(
  protocoloId: string,
  pacienteId: string,
  sessaoDados: {
    data: string;
    descricaoProcedimento?: string;
    observacoes?: string;
    profissionalNome?: string;
  }
): Promise<ProtocoloPaciente | null> {
  const list = getStoredLocal(pacienteId);
  const idx = list.findIndex(p => p.id === protocoloId);
  if (idx < 0) return null;

  const prot = list[idx];
  const novaSessao: SessaoProtocoloRegistro = {
    id: `sess_prot_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    numeroSessao: (prot.sessoesRealizadas?.length || 0) + 1,
    data: sessaoDados.data,
    descricaoProcedimento: sessaoDados.descricaoProcedimento?.trim(),
    observacoes: sessaoDados.observacoes?.trim(),
    profissionalNome: sessaoDados.profissionalNome,
    createdAt: new Date().toISOString()
  };

  const sessoesAtualizadas = [...(prot.sessoesRealizadas || []), novaSessao];
  const estaConcluido = sessoesAtualizadas.length >= prot.totalSessoesPlanejadas;

  const protocoloAtualizado: ProtocoloPaciente = {
    ...prot,
    sessoesRealizadas: sessoesAtualizadas,
    status: estaConcluido ? 'concluido' : prot.status,
    updatedAt: new Date().toISOString()
  };

  list[idx] = protocoloAtualizado;
  saveStoredLocal(pacienteId, list);

  try {
    const docRef = doc(db, 'protocolos_paciente', protocoloId);
    await setDoc(docRef, protocoloAtualizado, { merge: true });
  } catch (err) {
    console.warn('Erro ao registrar sessão no Firestore:', err);
  }

  return protocoloAtualizado;
}

/**
 * Atualiza o status do protocolo (em_andamento, concluido, pausado)
 */
export async function atualizarStatusProtocolo(
  protocoloId: string,
  pacienteId: string,
  novoStatus: StatusProtocolo
): Promise<void> {
  const list = getStoredLocal(pacienteId);
  const idx = list.findIndex(p => p.id === protocoloId);
  if (idx >= 0) {
    list[idx].status = novoStatus;
    list[idx].updatedAt = new Date().toISOString();
    saveStoredLocal(pacienteId, list);
  }

  try {
    const docRef = doc(db, 'protocolos_paciente', protocoloId);
    await setDoc(docRef, { status: novoStatus, updatedAt: new Date().toISOString() }, { merge: true });
  } catch (err) {
    console.warn('Erro ao atualizar status do protocolo no Firestore:', err);
  }
}

/**
 * Exclui um protocolo terapêutico
 */
export async function deletarProtocoloPaciente(
  protocoloId: string,
  pacienteId: string
): Promise<void> {
  const list = getStoredLocal(pacienteId).filter(p => p.id !== protocoloId);
  saveStoredLocal(pacienteId, list);

  try {
    const docRef = doc(db, 'protocolos_paciente', protocoloId);
    await deleteDoc(docRef);
  } catch (err) {
    console.warn('Erro ao excluir protocolo do Firestore:', err);
  }
}
