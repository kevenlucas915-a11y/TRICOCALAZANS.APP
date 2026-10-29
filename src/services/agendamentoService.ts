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
import { Agendamento, StatusAgendamento } from '../types/agendamento';

function getStorageKey(userId?: string): string {
  const uid = userId || auth.currentUser?.uid || 'anon';
  return `trico_agendamentos_v2_${uid}`;
}

// Formatar data local de hoje no formato YYYY-MM-DD
export function getDataHojeLocal(): string {
  const d = new Date();
  const ano = d.getFullYear();
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const dia = String(d.getDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
}

// Recuperar agendamentos locais isolados por usuário (sem dados fictícios/mockados)
function getAgendamentosLocais(userId?: string): Agendamento[] {
  if (typeof window === 'undefined' || !window.localStorage) return [];
  const currentUid = userId || auth.currentUser?.uid;
  try {
    const raw = window.localStorage.getItem(getStorageKey(currentUid));
    if (!raw) return [];
    const list = JSON.parse(raw);
    if (!Array.isArray(list)) return [];
    // Limpeza retroativa de eventuais registros de exemplo antigos
    const limpa = list.filter(a => a.pacienteNome !== 'Marina Silveira Duarte' && a.pacienteNome !== 'Carlos Eduardo Mendes');
    if (limpa.length !== list.length) {
      salvarAgendamentosLocais(limpa, currentUid);
    }
    return limpa;
  } catch {
    return [];
  }
}

// Salvar agendamentos no cache local isolado
function salvarAgendamentosLocais(lista: Agendamento[], userId?: string) {
  if (typeof window === 'undefined' || !window.localStorage) return;
  const currentUid = userId || auth.currentUser?.uid;
  try {
    window.localStorage.setItem(getStorageKey(currentUid), JSON.stringify(lista));
  } catch (e) {
    console.warn('Erro ao salvar agendamentos no cache local:', e);
  }
}

// Listar todos os agendamentos pertencentes exclusivamente a este profissional
export async function listAgendamentos(userId?: string): Promise<Agendamento[]> {
  const currentUid = userId || auth.currentUser?.uid;
  if (!currentUid) {
    return [];
  }

  try {
    const colRef = collection(db, 'agendamentos');
    const q = query(colRef, where('userId', '==', currentUid));
    const snap = await getDocs(q);

    if (snap.empty) {
      const iniciais = getAgendamentosLocais(currentUid);
      for (const item of iniciais) {
        try {
          const docRef = doc(db, 'agendamentos', item.id);
          await setDoc(docRef, { ...item, userId: currentUid });
        } catch {
          // offline
        }
      }
      return iniciais;
    }

    const agendamentosFirestore: Agendamento[] = snap.docs.map(docSnap => {
      const data = docSnap.data();
      return {
        id: data.id || docSnap.id,
        userId: data.userId || currentUid,
        pacienteId: data.pacienteId,
        pacienteNome: data.pacienteNome || 'Paciente',
        pacienteTelefone: data.pacienteTelefone,
        data: data.data,
        horario: data.horario,
        duracaoMinutos: data.duracaoMinutos || 30,
        motivoId: data.motivoId || 'outro',
        motivoTitulo: data.motivoTitulo || 'Consulta',
        motivoCor: data.motivoCor || '#8B5CF6',
        status: (data.status as StatusAgendamento) || 'agendado',
        observacoes: data.observacoes || '',
        lembreteNotificado: data.lembreteNotificado || false,
        createdAt: data.createdAt || new Date().toISOString(),
        updatedAt: data.updatedAt || new Date().toISOString()
      };
    });

    // Filtra estritamente pelo profissional atual (removendo eventuais mocks legados)
    const filtrados = agendamentosFirestore
      .filter(a => a.userId === currentUid)
      .filter(a => a.pacienteNome !== 'Marina Silveira Duarte' && a.pacienteNome !== 'Carlos Eduardo Mendes');

    filtrados.sort((a, b) => {
      const dataComp = a.data.localeCompare(b.data);
      if (dataComp !== 0) return dataComp;
      return a.horario.localeCompare(b.horario);
    });

    salvarAgendamentosLocais(filtrados, currentUid);
    return filtrados;
  } catch (err) {
    console.warn('Usando armazenamento local de agendamentos isolados:', err);
    return getAgendamentosLocais(currentUid);
  }
}

// Salvar ou atualizar agendamento no Firestore estritamente com o userId do profissional
export async function saveAgendamento(agendamento: Partial<Agendamento>): Promise<Agendamento> {
  const currentUid = agendamento.userId || auth.currentUser?.uid || 'sem_usuario';
  const id = agendamento.id || `ag_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`;
  const agora = new Date().toISOString();

  const itemCompleto: Agendamento = {
    id,
    userId: currentUid,
    pacienteId: agendamento.pacienteId || 'sem_id',
    pacienteNome: agendamento.pacienteNome || 'Paciente',
    pacienteTelefone: agendamento.pacienteTelefone || '',
    data: agendamento.data || getDataHojeLocal(),
    horario: agendamento.horario || '09:00',
    duracaoMinutos: agendamento.duracaoMinutos || 30,
    motivoId: agendamento.motivoId || 'outro',
    motivoTitulo: agendamento.motivoTitulo || 'Consulta',
    motivoCor: agendamento.motivoCor || '#8B5CF6',
    status: agendamento.status || 'agendado',
    observacoes: agendamento.observacoes || '',
    lembreteNotificado: agendamento.lembreteNotificado || false,
    createdAt: agendamento.createdAt || agora,
    updatedAt: agora
  };

  // 1. Salvar no cache local isolado
  const locais = getAgendamentosLocais(currentUid);
  const index = locais.findIndex(a => a.id === id);
  if (index >= 0) {
    locais[index] = itemCompleto;
  } else {
    locais.unshift(itemCompleto);
  }
  salvarAgendamentosLocais(locais, currentUid);

  // 2. Persistir no Firestore
  try {
    const docRef = doc(db, 'agendamentos', id);
    await setDoc(docRef, {
      id: itemCompleto.id,
      pacienteId: itemCompleto.pacienteId,
      pacienteNome: itemCompleto.pacienteNome,
      data: itemCompleto.data,
      horario: itemCompleto.horario,
      duracaoMinutos: itemCompleto.duracaoMinutos,
      motivoId: itemCompleto.motivoId,
      motivoTitulo: itemCompleto.motivoTitulo,
      motivoCor: itemCompleto.motivoCor,
      status: itemCompleto.status,
      observacoes: itemCompleto.observacoes,
      lembreteNotificado: itemCompleto.lembreteNotificado,
      userId: currentUid,
      createdAt: itemCompleto.createdAt,
      updatedAt: itemCompleto.updatedAt,
      ...(itemCompleto.pacienteTelefone ? { pacienteTelefone: itemCompleto.pacienteTelefone } : {})
    });
  } catch (err) {
    console.warn('Erro ao salvar agendamento no Firestore (salvo no cache local isolado):', err);
  }

  return itemCompleto;
}

// Excluir agendamento
export async function deleteAgendamento(id: string, userId?: string): Promise<void> {
  const currentUid = userId || auth.currentUser?.uid;
  const locais = getAgendamentosLocais(currentUid).filter(a => a.id !== id);
  salvarAgendamentosLocais(locais, currentUid);

  try {
    const docRef = doc(db, 'agendamentos', id);
    await deleteDoc(docRef);
  } catch (err) {
    console.warn('Erro ao remover agendamento no Firestore:', err);
  }
}

// Atualizar status de um agendamento
export async function updateStatusAgendamento(id: string, status: StatusAgendamento, userId?: string): Promise<void> {
  const currentUid = userId || auth.currentUser?.uid;
  const locais = getAgendamentosLocais(currentUid);
  const item = locais.find(a => a.id === id);
  if (item) {
    item.status = status;
    item.updatedAt = new Date().toISOString();
    salvarAgendamentosLocais(locais, currentUid);

    try {
      const docRef = doc(db, 'agendamentos', id);
      await setDoc(docRef, { status, updatedAt: item.updatedAt }, { merge: true });
    } catch (err) {
      console.warn('Erro ao atualizar status no Firestore:', err);
    }
  }
}

// Consultas marcadas para hoje do usuário autenticado
export async function getConsultasMarcadasHoje(userId?: string): Promise<Agendamento[]> {
  const currentUid = userId || auth.currentUser?.uid;
  if (!currentUid) return [];
  const hoje = getDataHojeLocal();
  const todos = await listAgendamentos(currentUid);
  return todos.filter(a => a.data === hoje && a.status !== 'cancelado');
}
