import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where 
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../firebase';
import { ConsentimentoIaExames, ExameLaboratorial } from '../types/exames';

const COLECAO_EXAMES = 'exames_laboratoriais';

/**
 * Lista todos os exames laboratoriais registrados para um paciente
 */
export async function listarExamesDoPaciente(userId: string, pacienteId: string): Promise<ExameLaboratorial[]> {
  try {
    const q = query(
      collection(db, COLECAO_EXAMES),
      where('userId', '==', userId),
      where('pacienteId', '==', pacienteId)
    );

    const snapshot = await getDocs(q);
    const exames: ExameLaboratorial[] = [];

    snapshot.forEach(docSnap => {
      const data = docSnap.data() as ExameLaboratorial;
      exames.push({
        ...data,
        id: docSnap.id
      });
    });

    // Ordenação cronológica por data da coleta (mais recente primeiro)
    return exames.sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());
  } catch (error) {
    console.error('Erro ao listar exames do paciente:', error);
    throw error;
  }
}

/**
 * Salva ou atualiza um exame laboratorial no Firestore
 */
export async function salvarExame(
  exameDados: Omit<ExameLaboratorial, 'id' | 'createdAt' | 'updatedAt'>,
  exameIdExistente?: string
): Promise<ExameLaboratorial> {
  const agora = new Date().toISOString();
  const id = exameIdExistente || `exame_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  const docRef = doc(db, COLECAO_EXAMES, id);

  const dadosFinais: ExameLaboratorial = {
    ...exameDados,
    id,
    createdAt: agora,
    updatedAt: agora
  };

  try {
    await setDoc(docRef, dadosFinais, { merge: true });
    return dadosFinais;
  } catch (error) {
    console.error('Erro ao salvar exame laboratorial:', error);
    throw error;
  }
}

/**
 * Exclui um exame laboratorial
 */
export async function excluirExame(exameId: string): Promise<void> {
  try {
    const docRef = doc(db, COLECAO_EXAMES, exameId);
    await deleteDoc(docRef);
  } catch (error) {
    console.error('Erro ao excluir exame laboratorial:', error);
    throw error;
  }
}

/**
 * Atualiza o consentimento do paciente para leitura com IA no documento do paciente
 */
export async function salvarConsentimentoPaciente(
  pacienteId: string,
  consentimento: ConsentimentoIaExames
): Promise<void> {
  try {
    const pacienteRef = doc(db, 'pacientes', pacienteId);
    await updateDoc(pacienteRef, {
      consentimentoIaExames: consentimento,
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Erro ao salvar consentimento de IA do paciente:', error);
    throw error;
  }
}

/**
 * Faz upload do arquivo do laudo para o Firebase Storage em capturas/{uid}/exames/{pacienteId}/
 */
export async function uploadArquivoLaudo(
  uid: string, 
  pacienteId: string, 
  file: File
): Promise<string> {
  try {
    // Sanitizar nome do arquivo
    const nomeLimpo = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storagePath = `capturas/${uid}/exames/${pacienteId}/${Date.now()}_${nomeLimpo}`;
    const storageRef = ref(storage, storagePath);

    const contentType = file.type || (file.name.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'application/octet-stream');
    const snapshot = await uploadBytes(storageRef, file, {
      contentType
    });

    const downloadUrl = await getDownloadURL(snapshot.ref);
    return downloadUrl;
  } catch (error) {
    console.error('Erro ao fazer upload do laudo no Storage:', error);
    throw error;
  }
}

/**
 * Consulta a contagem de uso mensal de IA registrada no servidor
 */
export async function obterUsoIaServidor(token: string): Promise<{ usado: number; limite: number; mes: string }> {
  try {
    const res = await fetch('/api/exames/uso-ia', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!res.ok) {
      return { usado: 0, limite: 40, mes: new Date().toISOString().substring(0, 7) };
    }

    const data = await res.json();
    return {
      usado: data.usado ?? 0,
      limite: data.limite ?? 40,
      mes: data.mes || new Date().toISOString().substring(0, 7)
    };
  } catch {
    return { usado: 0, limite: 40, mes: new Date().toISOString().substring(0, 7) };
  }
}
