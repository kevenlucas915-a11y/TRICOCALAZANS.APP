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
import { ProdutoIndicado } from '../types/portal';

function getStorageKey(pacienteId: string): string {
  return `trico_produtos_paciente_${pacienteId}`;
}

function getStoredLocal(pacienteId: string): ProdutoIndicado[] {
  if (typeof window === 'undefined' || !window.localStorage) return [];
  try {
    const raw = window.localStorage.getItem(getStorageKey(pacienteId));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveStoredLocal(pacienteId: string, lista: ProdutoIndicado[]): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    window.localStorage.setItem(getStorageKey(pacienteId), JSON.stringify(lista));
  } catch {
    // quota
  }
}

/**
 * Lista todos os produtos indicados para um determinado paciente.
 * Se apenasLiberados for true, retorna somente os com liberadoPaciente == true.
 */
export async function listarProdutosDoPaciente(
  pacienteId: string, 
  apenasLiberados: boolean = false
): Promise<ProdutoIndicado[]> {
  const localList = getStoredLocal(pacienteId);

  try {
    const colRef = collection(db, 'produtos_paciente');
    const q = query(colRef, where('pacienteId', '==', pacienteId));
    const snap = await getDocs(q);

    if (!snap.empty) {
      const firestoreList: ProdutoIndicado[] = [];
      snap.forEach(docSnap => {
        firestoreList.push(docSnap.data() as ProdutoIndicado);
      });

      saveStoredLocal(pacienteId, firestoreList);
      
      let resultado = firestoreList;
      if (apenasLiberados) {
        resultado = resultado.filter(p => p.liberadoPaciente === true);
      }
      return resultado.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
  } catch (err) {
    console.warn('Usando armazenamento local de produtos do paciente:', err);
  }

  let finalLocal = localList;
  if (apenasLiberados) {
    finalLocal = finalLocal.filter(p => p.liberadoPaciente === true);
  }
  return finalLocal.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

/**
 * Salva ou atualiza uma indicação de produto para o paciente
 */
export async function salvarProdutoPaciente(
  dados: Omit<ProdutoIndicado, 'id' | 'createdAt' | 'updatedAt'> & { id?: string; createdAt?: string }
): Promise<ProdutoIndicado> {
  const id = dados.id || `prod_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const now = new Date().toISOString();

  const produto: ProdutoIndicado = {
    id,
    pacienteId: dados.pacienteId,
    profissionalUid: dados.profissionalUid || auth.currentUser?.uid || 'sem_profissional',
    pacienteUid: dados.pacienteUid,
    nome: dados.nome.trim(),
    comoUsar: dados.comoUsar.trim(),
    observacao: dados.observacao?.trim() || '',
    liberadoPaciente: dados.liberadoPaciente ?? false,
    createdAt: dados.createdAt || now,
    updatedAt: now
  };

  // 1. Salvar no cache local
  const list = getStoredLocal(produto.pacienteId);
  const idx = list.findIndex(p => p.id === id);
  if (idx >= 0) {
    list[idx] = produto;
  } else {
    list.unshift(produto);
  }
  saveStoredLocal(produto.pacienteId, list);

  // 2. Salvar no Firestore
  try {
    const docRef = doc(db, 'produtos_paciente', id);
    await setDoc(docRef, produto);
  } catch (err) {
    console.warn('Erro ao salvar produto no Firestore:', err);
  }

  // Notificar ouvintes no app
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('trico-produto-salvo', { detail: produto }));
  }

  return produto;
}

/**
 * Alterna a liberação do produto para visualização pelo paciente no portal
 */
export async function alternarLiberacaoProduto(
  produtoId: string, 
  pacienteId: string, 
  liberado: boolean
): Promise<void> {
  const list = getStoredLocal(pacienteId);
  const idx = list.findIndex(p => p.id === produtoId);
  if (idx >= 0) {
    list[idx].liberadoPaciente = liberado;
    list[idx].updatedAt = new Date().toISOString();
    saveStoredLocal(pacienteId, list);

    try {
      const docRef = doc(db, 'produtos_paciente', produtoId);
      await setDoc(docRef, { liberadoPaciente: liberado, updatedAt: new Date().toISOString() }, { merge: true });
    } catch (err) {
      console.warn('Erro ao atualizar liberação no Firestore:', err);
    }
  }
}

/**
 * Remove um produto indicado
 */
export async function excluirProdutoPaciente(produtoId: string, pacienteId: string): Promise<void> {
  const list = getStoredLocal(pacienteId).filter(p => p.id !== produtoId);
  saveStoredLocal(pacienteId, list);

  try {
    const docRef = doc(db, 'produtos_paciente', produtoId);
    await deleteDoc(docRef);
  } catch (err) {
    console.warn('Erro ao excluir produto no Firestore:', err);
  }
}
