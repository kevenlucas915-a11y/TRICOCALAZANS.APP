import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  setDoc, 
  deleteDoc, 
  query, 
  where 
} from 'firebase/firestore';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';
import { db, auth, storage } from '../firebase';
import { ModeloAnamnese, RespostaAnamnese, SessaoEvolucaoFicha } from '../types/anamnese';
import { MODELOS_ANAMNESE_PADRAO, MODELO_FICHA_AVALIACAO_CAPILAR_ID } from '../data/anamneseTemplates';

/**
 * Trata a imagem da assinatura do cliente:
 * - Se for pequena (< 200 KB), guarda inline como PNG comprimido no próprio documento
 * - Se passar de 200 KB, faz upload para o Storage em capturas/{uid}/ e salva o URL
 */
export async function processarAssinatura(
  assinatura?: string,
  userId?: string,
  documentoId?: string
): Promise<string | undefined> {
  if (!assinatura || !assinatura.startsWith('data:image')) {
    return assinatura;
  }

  // Estimar tamanho em bytes (base64)
  const tamanhoAproximadoBytes = Math.round(assinatura.length * 0.75);

  // Se menor que 200 KB, mantém inline
  if (tamanhoAproximadoBytes < 200 * 1024) {
    return assinatura;
  }

  const currentUid = userId || auth.currentUser?.uid;
  if (!currentUid) {
    return assinatura;
  }

  try {
    const nomeArquivo = `assinatura_${documentoId || Date.now()}_${Math.random().toString(36).substring(2, 6)}.png`;
    const storageRef = ref(storage, `capturas/${currentUid}/${nomeArquivo}`);
    await uploadString(storageRef, assinatura, 'data_url');
    const downloadUrl = await getDownloadURL(storageRef);
    return downloadUrl;
  } catch (err) {
    console.warn('Upload de assinatura para Storage falhou, tentando compressão local:', err);
    // Tentar compressão rápida no canvas se estiver em browser
    if (typeof window !== 'undefined' && typeof document !== 'undefined') {
      try {
        const img = new Image();
        img.src = assinatura;
        await new Promise((res, rej) => {
          img.onload = res;
          img.onerror = rej;
        });
        const c = document.createElement('canvas');
        c.width = 450;
        c.height = 140;
        const ctx = c.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, 450, 140);
          return c.toDataURL('image/png');
        }
      } catch {}
    }
    return assinatura;
  }
}

function getStorageKey(prefix: string, userId?: string): string {
  const uid = userId || auth.currentUser?.uid || 'anon';
  return `${prefix}_${uid}`;
}

// Recuperar modelos do cache local isolado
function getModelosLocais(userId?: string): ModeloAnamnese[] {
  const currentUid = userId || auth.currentUser?.uid;
  if (typeof window === 'undefined' || !window.localStorage) return MODELOS_ANAMNESE_PADRAO;
  try {
    const raw = window.localStorage.getItem(getStorageKey('trico_modelos', currentUid));
    if (!raw) return MODELOS_ANAMNESE_PADRAO;
    const parsed = JSON.parse(raw) as ModeloAnamnese[];
    const ids = new Set(parsed.map(m => m.id));
    const faltantes = MODELOS_ANAMNESE_PADRAO.filter(p => !ids.has(p.id));
    const todos = [...faltantes, ...parsed];
    return todos.sort((a, b) => {
      if (a.id === MODELO_FICHA_AVALIACAO_CAPILAR_ID) return -1;
      if (b.id === MODELO_FICHA_AVALIACAO_CAPILAR_ID) return 1;
      return 0;
    });
  } catch {
    return MODELOS_ANAMNESE_PADRAO;
  }
}

// Salvar modelos localmente
function salvarModelosLocais(modelos: ModeloAnamnese[], userId?: string) {
  if (typeof window === 'undefined' || !window.localStorage) return;
  const currentUid = userId || auth.currentUser?.uid;
  try {
    window.localStorage.setItem(getStorageKey('trico_modelos', currentUid), JSON.stringify(modelos));
  } catch (e) {
    console.warn('Erro ao salvar modelos no localStorage:', e);
  }
}

// Recuperar respostas do cache local isolado
function getRespostasLocais(userId?: string): RespostaAnamnese[] {
  const currentUid = userId || auth.currentUser?.uid;
  if (typeof window === 'undefined' || !window.localStorage) return [];
  try {
    const raw = window.localStorage.getItem(getStorageKey('trico_respostas', currentUid));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

// Salvar respostas localmente
function salvarRespostasLocais(respostas: RespostaAnamnese[], userId?: string) {
  if (typeof window === 'undefined' || !window.localStorage) return;
  const currentUid = userId || auth.currentUser?.uid;
  try {
    window.localStorage.setItem(getStorageKey('trico_respostas', currentUid), JSON.stringify(respostas));
  } catch (e) {
    console.warn('Erro ao salvar respostas no localStorage:', e);
  }
}

// Listar todos os modelos disponíveis para o profissional (padrões + modelos próprios)
export async function listModelosAnamnese(userId?: string): Promise<ModeloAnamnese[]> {
  const currentUid = userId || auth.currentUser?.uid;
  try {
    const colRef = collection(db, 'modelos_anamnese');
    const snap = await getDocs(colRef);

    if (snap.empty) {
      for (const m of MODELOS_ANAMNESE_PADRAO) {
        try {
          const docRef = doc(db, 'modelos_anamnese', m.id);
          await setDoc(docRef, {
            id: m.id,
            titulo: m.titulo,
            descricao: m.descricao,
            categoria: m.categoria,
            isPadrao: true,
            perguntasJson: JSON.stringify(m.perguntas),
            userId: 'sistema',
            createdAt: m.createdAt,
            updatedAt: m.updatedAt
          });
        } catch {
          // offline
        }
      }
      return MODELOS_ANAMNESE_PADRAO;
    }

    const modelosFirestore: ModeloAnamnese[] = snap.docs.map(docSnap => {
      const data = docSnap.data();
      let perguntas = [];
      try {
        perguntas = data.perguntasJson ? JSON.parse(data.perguntasJson) : [];
      } catch {
        perguntas = [];
      }

      return {
        id: data.id || docSnap.id,
        userId: data.userId,
        titulo: data.titulo || 'Formulário sem título',
        descricao: data.descricao || '',
        categoria: data.categoria || 'Geral',
        isPadrao: !!data.isPadrao,
        perguntas,
        createdAt: data.createdAt || new Date().toISOString(),
        updatedAt: data.updatedAt || new Date().toISOString()
      };
    });

    const ids = new Set(modelosFirestore.map(m => m.id));
    const padroesFaltantes = MODELOS_ANAMNESE_PADRAO.filter(p => !ids.has(p.id));
    const todos = [...modelosFirestore, ...padroesFaltantes];

    // O usuário vê os modelos padrão do sistema e apenas os seus próprios modelos personalizados
    const resultado = (currentUid 
      ? todos.filter(m => m.isPadrao || m.userId === currentUid)
      : todos.filter(m => m.isPadrao)
    ).sort((a, b) => {
      if (a.id === MODELO_FICHA_AVALIACAO_CAPILAR_ID) return -1;
      if (b.id === MODELO_FICHA_AVALIACAO_CAPILAR_ID) return 1;
      return 0;
    });

    salvarModelosLocais(resultado, currentUid);
    return resultado;
  } catch (err) {
    console.warn('Usando modelos locais:', err);
    return getModelosLocais(currentUid);
  }
}

// Salvar novo modelo de anamnese vinculado ao profissional autenticado
export async function saveModeloAnamnese(
  modelo: Omit<ModeloAnamnese, 'id' | 'createdAt' | 'updatedAt'> & { id?: string; createdAt?: string; userId?: string }
): Promise<ModeloAnamnese> {
  const currentUid = modelo.userId || auth.currentUser?.uid || 'sem_usuario';
  const now = new Date().toISOString();
  const id = modelo.id || `modelo_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`;
  
  const novoModelo: ModeloAnamnese = {
    id,
    userId: currentUid,
    titulo: modelo.titulo.trim() || 'Formulário de Anamnese',
    descricao: modelo.descricao.trim(),
    categoria: modelo.categoria.trim() || 'Geral',
    isPadrao: !!modelo.isPadrao,
    perguntas: modelo.perguntas,
    createdAt: modelo.createdAt || now,
    updatedAt: now
  };

  try {
    const docRef = doc(db, 'modelos_anamnese', id);
    await setDoc(docRef, {
      id: novoModelo.id,
      titulo: novoModelo.titulo,
      descricao: novoModelo.descricao,
      categoria: novoModelo.categoria,
      isPadrao: novoModelo.isPadrao,
      perguntasJson: JSON.stringify(novoModelo.perguntas),
      userId: currentUid,
      createdAt: novoModelo.createdAt,
      updatedAt: novoModelo.updatedAt
    });
  } catch (err) {
    console.warn('Aviso: salvo em cache local após erro no Firestore:', err);
  }

  const locais = getModelosLocais(currentUid).filter(m => m.id !== id);
  const atualizados = [novoModelo, ...locais];
  salvarModelosLocais(atualizados, currentUid);

  return novoModelo;
}

export async function duplicarModeloAnamnese(
  modeloOrigem: ModeloAnamnese, 
  novoTitulo?: string
): Promise<ModeloAnamnese> {
  const currentUid = auth.currentUser?.uid || 'sem_usuario';
  return saveModeloAnamnese({
    titulo: novoTitulo || `${modeloOrigem.titulo} (Cópia Personalizada)`,
    descricao: modeloOrigem.descricao,
    categoria: modeloOrigem.categoria,
    isPadrao: false,
    userId: currentUid,
    perguntas: JSON.parse(JSON.stringify(modeloOrigem.perguntas))
  });
}

export async function deleteModeloAnamnese(id: string): Promise<void> {
  const currentUid = auth.currentUser?.uid;
  const locais = getModelosLocais(currentUid).filter(m => m.id !== id);
  salvarModelosLocais(locais, currentUid);

  try {
    const docRef = doc(db, 'modelos_anamnese', id);
    await deleteDoc(docRef);
  } catch (err) {
    console.warn('Erro ao excluir modelo no Firestore:', err);
  }
}

// Listar respostas de anamnese de um paciente específico (estritamente do profissional)
export async function listRespostasDoPaciente(pacienteId: string, userId?: string): Promise<RespostaAnamnese[]> {
  const todas = await listTodasRespostas(userId);
  return todas.filter(r => r.pacienteId === pacienteId);
}

// Listar todas as respostas pertencentes exclusivamente ao profissional autenticado
export async function listTodasRespostas(userId?: string): Promise<RespostaAnamnese[]> {
  const currentUid = userId || auth.currentUser?.uid;
  if (!currentUid) return [];

  try {
    const colRef = collection(db, 'respostas_anamnese');
    const q = query(colRef, where('userId', '==', currentUid));
    const snap = await getDocs(q);

    const todas: RespostaAnamnese[] = snap.docs.map(docSnap => {
      const data = docSnap.data();
      let respostas = [];
      try {
        respostas = data.respostasJson ? JSON.parse(data.respostasJson) : [];
      } catch {
        respostas = [];
      }

      return {
        id: data.id || docSnap.id,
        modeloId: data.modeloId,
        modeloTitulo: data.modeloTitulo || 'Anamnese',
        pacienteId: data.pacienteId,
        pacienteNome: data.pacienteNome || 'Paciente',
        userId: data.userId,
        status: data.status || 'finalizada',
        respostas,
        dadosFichaJson: data.dadosFichaJson,
        sessoesJson: data.sessoesJson,
        assinaturaUrl: data.assinaturaUrl,
        anotacoesEspecialista: data.anotacoesEspecialista || '',
        dataPreenchimento: data.dataPreenchimento || data.createdAt || new Date().toISOString(),
        createdAt: data.createdAt || new Date().toISOString(),
        updatedAt: data.updatedAt || new Date().toISOString()
      };
    });

    const filtradas = todas.filter(r => r.userId === currentUid);
    filtradas.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    salvarRespostasLocais(filtradas, currentUid);
    return filtradas;
  } catch (err) {
    console.warn('Usando respostas locais isoladas:', err);
    return getRespostasLocais(currentUid).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }
}

// Salvar resposta de anamnese vinculada ao profissional autenticado
export async function saveRespostaAnamnese(
  resposta: Omit<RespostaAnamnese, 'id' | 'createdAt' | 'updatedAt'> & { id?: string; userId?: string }
): Promise<RespostaAnamnese> {
  const currentUid = resposta.userId || auth.currentUser?.uid || 'sem_usuario';
  const now = new Date().toISOString();
  const id = resposta.id || `resp_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`;

  // Tratar assinatura principal: inline se pequena, no Storage em capturas/{uid}/ se passar de 200 KB
  const assinaturaProcessada = await processarAssinatura(resposta.assinaturaUrl, currentUid, id);

  let dadosFichaFinal = resposta.dadosFichaJson;
  if (dadosFichaFinal && assinaturaProcessada) {
    try {
      const objFicha = JSON.parse(dadosFichaFinal);
      if (objFicha.assinaturaClienteBase64) {
        objFicha.assinaturaClienteBase64 = assinaturaProcessada;
        dadosFichaFinal = JSON.stringify(objFicha);
      }
    } catch {}
  }

  const novaResposta: RespostaAnamnese = {
    id,
    modeloId: resposta.modeloId,
    modeloTitulo: resposta.modeloTitulo || 'Anamnese Tricológica',
    pacienteId: resposta.pacienteId,
    pacienteNome: resposta.pacienteNome || 'Paciente',
    userId: currentUid,
    status: resposta.status || 'finalizada',
    respostas: resposta.respostas || [],
    dadosFichaJson: dadosFichaFinal,
    sessoesJson: resposta.sessoesJson,
    assinaturaUrl: assinaturaProcessada,
    anotacoesEspecialista: resposta.anotacoesEspecialista || '',
    dataPreenchimento: resposta.dataPreenchimento || now,
    createdAt: now,
    updatedAt: now
  };

  const payloadFirestore: Record<string, any> = {
    id: novaResposta.id,
    modeloId: novaResposta.modeloId,
    modeloTitulo: novaResposta.modeloTitulo,
    pacienteId: novaResposta.pacienteId,
    pacienteNome: novaResposta.pacienteNome,
    userId: currentUid,
    status: novaResposta.status,
    respostasJson: JSON.stringify(novaResposta.respostas),
    anotacoesEspecialista: novaResposta.anotacoesEspecialista,
    dataPreenchimento: novaResposta.dataPreenchimento,
    createdAt: novaResposta.createdAt,
    updatedAt: novaResposta.updatedAt
  };

  if (novaResposta.dadosFichaJson) payloadFirestore.dadosFichaJson = novaResposta.dadosFichaJson;
  if (novaResposta.sessoesJson) payloadFirestore.sessoesJson = novaResposta.sessoesJson;
  if (novaResposta.assinaturaUrl) payloadFirestore.assinaturaUrl = novaResposta.assinaturaUrl;

  try {
    const docRef = doc(db, 'respostas_anamnese', id);
    await setDoc(docRef, payloadFirestore, { merge: true });
  } catch (err) {
    console.warn('Aviso: salvo em cache local após erro no Firestore:', err);
  }

  const locais = getRespostasLocais(currentUid).filter(r => r.id !== id);
  const atualizadas = [novaResposta, ...locais];
  salvarRespostasLocais(atualizadas, currentUid);

  return novaResposta;
}

/**
 * Registra uma nova sessão de retorno/evolução na ficha já salva
 */
export async function salvarSessaoNaRespostaAnamnese(
  respostaId: string,
  novaSessao: SessaoEvolucaoFicha,
  userId?: string
): Promise<SessaoEvolucaoFicha[]> {
  const currentUid = userId || auth.currentUser?.uid || 'sem_usuario';
  const locais = getRespostasLocais(currentUid);
  const idx = locais.findIndex(r => r.id === respostaId);

  let sessoesAtuais: SessaoEvolucaoFicha[] = [];
  if (idx >= 0 && locais[idx].sessoesJson) {
    try {
      sessoesAtuais = JSON.parse(locais[idx].sessoesJson!);
    } catch {}
  }

  // Tratar assinatura da sessão individual
  const assinaturaSessaoProcessada = await processarAssinatura(
    novaSessao.assinaturaClienteBase64,
    currentUid,
    `sess_${respostaId}_${novaSessao.numeroSessao}`
  );

  const sessaoFinal: SessaoEvolucaoFicha = {
    ...novaSessao,
    assinaturaClienteBase64: assinaturaSessaoProcessada
  };

  sessoesAtuais.push(sessaoFinal);
  const sessoesJson = JSON.stringify(sessoesAtuais);

  if (idx >= 0) {
    locais[idx].sessoesJson = sessoesJson;
    locais[idx].updatedAt = new Date().toISOString();
    salvarRespostasLocais(locais, currentUid);
  }

  try {
    const docRef = doc(db, 'respostas_anamnese', respostaId);
    await setDoc(docRef, { sessoesJson, updatedAt: new Date().toISOString() }, { merge: true });
  } catch (err) {
    console.warn('Aviso ao sincronizar sessão de anamnese no Firestore:', err);
  }

  return sessoesAtuais;
}

export async function deleteRespostaAnamnese(id: string): Promise<void> {
  const currentUid = auth.currentUser?.uid;
  const locais = getRespostasLocais(currentUid).filter(r => r.id !== id);
  salvarRespostasLocais(locais, currentUid);

  try {
    const docRef = doc(db, 'respostas_anamnese', id);
    await deleteDoc(docRef);
  } catch (err) {
    console.warn('Erro ao excluir resposta no Firestore:', err);
  }
}
