import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  query, 
  where 
} from 'firebase/firestore';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  sendPasswordResetEmail,
  signOut
} from 'firebase/auth';
import { db, auth } from '../firebase';
import { Paciente, ConsultaRegistro } from '../types/paciente';
import { UsuarioProfissional } from '../types/usuario';
import { ConvitePaciente, PacienteUsuario, ProdutoIndicado } from '../types/portal';
import { listarProdutosDoPaciente } from './produtosPacienteService';
import { Agendamento } from '../types/agendamento';
import { Session } from './annotations';

/**
 * Gera um link de ativação exclusivo e de uso único válido por 7 dias.
 */
export async function gerarConvitePortal(
  paciente: Paciente,
  profissional: UsuarioProfissional
): Promise<{ convite: ConvitePaciente; linkAtivacao: string }> {
  const token = `tkn_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
  const agora = new Date();
  const expiraEmData = new Date(agora);
  expiraEmData.setDate(expiraEmData.getDate() + 7); // 7 dias de validade
  const expiraEm = expiraEmData.toISOString();

  const convite: ConvitePaciente = {
    id: token,
    token,
    pacienteId: paciente.id,
    pacienteNome: paciente.nome,
    pacienteTelefone: paciente.telefone || '',
    profissionalUid: profissional.uid,
    profissionalNome: profissional.nome,
    nomeClinica: profissional.nomeDoEspaco || profissional.clinica || 'Clínica de Tricologia',
    status: 'pendente',
    expiraEm,
    createdAt: agora.toISOString()
  };

  // Salvar no Firestore
  try {
    const docRef = doc(db, 'convites_pacientes', token);
    await setDoc(docRef, convite);

    // Atualizar registro do paciente
    const pacRef = doc(db, 'pacientes', paciente.id);
    await setDoc(pacRef, {
      portalConviteToken: token,
      portalConviteExpiraEm: expiraEm,
      profissionalUid: profissional.uid,
      updatedAt: agora.toISOString()
    }, { merge: true });
  } catch (err) {
    console.warn('Erro ao salvar convite no Firestore (salvando localmente):', err);
  }

  // Salvar em cache local de convites
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.setItem(`trico_convite_${token}`, JSON.stringify(convite));
    } catch {}
  }

  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const linkAtivacao = `${origin}/area-do-cliente?token=${token}`;

  return { convite, linkAtivacao };
}

/**
 * Obtém e valida os dados de um convite pelo token
 */
export async function obterConvitePorToken(token: string): Promise<{
  valido: boolean;
  convite: ConvitePaciente | null;
  motivoInvalido?: string;
}> {
  let convite: ConvitePaciente | null = null;

  try {
    const docRef = doc(db, 'convites_pacientes', token);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      convite = snap.data() as ConvitePaciente;
    }
  } catch (err) {
    console.warn('Erro ao buscar convite no Firestore, checando local:', err);
  }

  if (!convite && typeof window !== 'undefined' && window.localStorage) {
    const raw = window.localStorage.getItem(`trico_convite_${token}`);
    if (raw) {
      try { convite = JSON.parse(raw); } catch {}
    }
  }

  if (!convite) {
    return { valido: false, convite: null, motivoInvalido: 'Convite não encontrado ou link incorreto.' };
  }

  if (convite.status === 'usado') {
    return { valido: false, convite, motivoInvalido: 'Este convite já foi utilizado para ativar a conta. Por favor, faça login com seu e-mail e senha.' };
  }

  const agora = new Date();
  const dataExpiracao = new Date(convite.expiraEm);
  if (agora > dataExpiracao) {
    return { valido: false, convite, motivoInvalido: 'Este convite expirou (validade de 7 dias excedida). Solicite um novo link à sua profissional.' };
  }

  return { valido: true, convite };
}

/**
 * Ativa a conta do paciente criando o login no Firebase Auth e vinculando ao registro do paciente
 */
export async function ativarContaPaciente(
  token: string,
  email: string,
  senha: string
): Promise<PacienteUsuario> {
  const { valido, convite, motivoInvalido } = await obterConvitePorToken(token);
  if (!valido || !convite) {
    throw new Error(motivoInvalido || 'Convite inválido ou expirado.');
  }

  const emailLimpo = email.trim().toLowerCase();
  
  // 1. Criar usuário no Firebase Auth
  const userCred = await createUserWithEmailAndPassword(auth, emailLimpo, senha);
  const fbUser = userCred.user;
  const agora = new Date().toISOString();

  // 2. Criar registro de PacienteUsuario
  const pacienteUser: PacienteUsuario = {
    uid: fbUser.uid,
    pacienteId: convite.pacienteId,
    profissionalUid: convite.profissionalUid,
    papel: 'paciente',
    email: emailLimpo,
    nome: convite.pacienteNome,
    telefone: convite.pacienteTelefone,
    createdAt: agora,
    updatedAt: agora
  };

  try {
    const userDocRef = doc(db, 'pacientes_usuarios', fbUser.uid);
    await setDoc(userDocRef, pacienteUser);

    // 3. Atualizar o registro do paciente com pacienteUid e status ativo
    const pacDocRef = doc(db, 'pacientes', convite.pacienteId);
    await setDoc(pacDocRef, {
      pacienteUid: fbUser.uid,
      portalAtivo: true,
      portalAtivadoEm: agora,
      updatedAt: agora
    }, { merge: true });

    // 4. Invalidar token do convite
    const conviteDocRef = doc(db, 'convites_pacientes', token);
    await setDoc(conviteDocRef, {
      status: 'usado',
      usadoEm: agora,
      pacienteUid: fbUser.uid
    }, { merge: true });
  } catch (err) {
    console.warn('Aviso ao sincronizar ativação no Firestore:', err);
  }

  // Salvar em cache local do paciente
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.setItem('trico_paciente_auth_user', JSON.stringify(pacienteUser));
    } catch {}
  }

  return pacienteUser;
}

/**
 * Realiza login do paciente com e-mail e senha
 */
export async function loginPaciente(email: string, senha: string): Promise<PacienteUsuario> {
  const userCred = await signInWithEmailAndPassword(auth, email.trim().toLowerCase(), senha);
  const fbUser = userCred.user;

  // Buscar dados em pacientes_usuarios
  try {
    const docRef = doc(db, 'pacientes_usuarios', fbUser.uid);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data() as PacienteUsuario;
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem('trico_paciente_auth_user', JSON.stringify(data));
      }
      return data;
    }
  } catch (err) {
    console.warn('Erro ao carregar pacientes_usuarios:', err);
  }

  // Tentar encontrar paciente por pacienteUid na coleção pacientes
  try {
    const colPacientes = collection(db, 'pacientes');
    const q = query(colPacientes, where('pacienteUid', '==', fbUser.uid));
    const snap = await getDocs(q);
    if (!snap.empty) {
      const pacDoc = snap.docs[0].data() as Paciente;
      const pacienteUser: PacienteUsuario = {
        uid: fbUser.uid,
        pacienteId: pacDoc.id,
        profissionalUid: pacDoc.profissionalUid || pacDoc.userId || '',
        papel: 'paciente',
        email: fbUser.email || email,
        nome: pacDoc.nome,
        telefone: pacDoc.telefone,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      const userDocRef = doc(db, 'pacientes_usuarios', fbUser.uid);
      await setDoc(userDocRef, pacienteUser);
      return pacienteUser;
    }
  } catch (err) {
    console.warn('Erro ao verificar paciente:', err);
  }

  throw new Error('Conta não vinculada a nenhum prontuário ativo. Fale com sua profissional para receber o convite.');
}

export interface DadosPortalPaciente {
  paciente: Paciente;
  profissional: {
    nome: string;
    nomeDoEspaco: string;
    titulo?: string;
    telefone?: string;
    email?: string;
    fotoUrl?: string;
  };
  consultasLiberadas: ConsultaRegistro[];
  produtosLiberados: ProdutoIndicado[];
  proximasConsultas: Agendamento[];
}

/**
 * Obtém todos os dados liberados para visualização do paciente no portal (somente leitura)
 */
export async function carregarDadosPortal(pacienteUid: string): Promise<DadosPortalPaciente | null> {
  // 1. Identificar o paciente vinculado ao pacienteUid
  let paciente: Paciente | null = null;
  try {
    const colPac = collection(db, 'pacientes');
    const q = query(colPac, where('pacienteUid', '==', pacienteUid));
    const snap = await getDocs(q);
    if (!snap.empty) {
      paciente = snap.docs[0].data() as Paciente;
    }
  } catch (err) {
    console.warn('Erro ao buscar paciente no Firestore:', err);
  }

  // Fallback local
  if (!paciente && typeof window !== 'undefined' && window.localStorage) {
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      if (key?.startsWith('trico_pacientes_store_')) {
        try {
          const map = JSON.parse(window.localStorage.getItem(key) || '{}');
          const found = Object.values(map).find((p: any) => p.pacienteUid === pacienteUid) as Paciente;
          if (found) { paciente = found; break; }
        } catch {}
      }
    }
  }

  if (!paciente) return null;

  const profUid = paciente.profissionalUid || paciente.userId || '';

  // 2. Carregar dados da profissional
  let profissionalInfo = {
    nome: 'Especialista em Tricologia',
    nomeDoEspaco: 'Consultório Clínico',
    titulo: 'Tricologista',
    telefone: '',
    email: '',
    fotoUrl: undefined as string | undefined
  };

  if (profUid) {
    try {
      const profSnap = await getDoc(doc(db, 'usuarios_profissionais', profUid));
      if (profSnap.exists()) {
        const profData = profSnap.data() as UsuarioProfissional;
        profissionalInfo = {
          nome: profData.nome || 'Especialista',
          nomeDoEspaco: profData.nomeDoEspaco || profData.clinica || 'Consultório Clínico',
          titulo: profData.titulo || 'Tricologista',
          telefone: profData.telefone || '',
          email: profData.email || '',
          fotoUrl: profData.fotoUrl
        };
      }
    } catch {}
  }

  // 3. Carregar consultas liberadas
  let consultasLiberadas: ConsultaRegistro[] = [];
  try {
    const colRef = collection(db, 'consultas_paciente');
    const q = query(colRef, where('pacienteId', '==', paciente.id));
    const snap = await getDocs(q);
    if (!snap.empty) {
      snap.forEach(d => {
        const c = d.data() as ConsultaRegistro;
        if (c && c.liberadoPaciente === true) {
          consultasLiberadas.push(c);
        }
      });
    }
  } catch (err) {
    console.warn('Erro ao buscar consultas_paciente no Firestore:', err);
  }

  // 3.1 Carregar também capturas de fotos e achados liberados em capturas_paciente
  try {
    const colCap = collection(db, 'capturas_paciente');
    const qCap = query(colCap, where('pacienteUid', '==', pacienteUid));
    const snapCap = await getDocs(qCap);
    if (!snapCap.empty) {
      snapCap.forEach(d => {
        const cap = d.data();
        if (cap && cap.liberadoPaciente === true) {
          let achadosLiberados: Array<{ nome: string; fotoUrl?: string }> = [];
          let areaCaptura = 'Couro Cabeludo';
          if (cap.anotacoes && cap.anotacoes.startsWith('{')) {
            try {
              const parsed = JSON.parse(cap.anotacoes);
              areaCaptura = parsed.area || areaCaptura;
              if (parsed.annotations && Array.isArray(parsed.annotations)) {
                achadosLiberados = parsed.annotations
                  .filter((a: any) => a.type === 'achado' || a.sign_slug)
                  .map((a: any) => ({
                    nome: a.sign_slug || 'Achado tricoscópico',
                    fotoUrl: cap.imagemUrl || cap.imagemDataUrl || undefined
                  }));
              }
            } catch {}
          }
          consultasLiberadas.push({
            id: `cap_${d.id}`,
            sessionId: d.id,
            pacienteId: paciente!.id,
            pacienteNome: paciente!.nome,
            data: cap.dataCaptura || new Date().toISOString().split('T')[0],
            area: areaCaptura,
            imagemUrl: cap.imagemUrl || cap.imagemDataUrl,
            achadosLiberados: achadosLiberados.length > 0 ? JSON.stringify(achadosLiberados) : undefined,
            liberadoPaciente: true,
            createdAt: cap.createdAt || new Date().toISOString()
          });
        }
      });
    }
  } catch (err) {
    console.warn('Aviso ao buscar capturas_paciente no Firestore:', err);
  }

  // Fallback consultas avulsas locais
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const raw = window.localStorage.getItem(`trico_consultas_avulsas_${profUid}`);
      if (raw) {
        const list = JSON.parse(raw) as ConsultaRegistro[];
        const liberadasLocais = list.filter(c => c.pacienteId === paciente!.id && c.liberadoPaciente === true);
        consultasLiberadas.push(...liberadasLocais);
      }
    } catch {}

    // Fallback de sessões locais liberadas
    try {
      const rawStore = window.localStorage.getItem(`trico_sessions_store_${profUid}`);
      if (rawStore) {
        const mapStore = JSON.parse(rawStore);
        Object.values(mapStore).forEach((item: any) => {
          const s = item?.session;
          if (
            s &&
            s.liberadoPaciente === true &&
            (s.client_name?.toLowerCase().trim() === paciente!.nome.toLowerCase().trim() || s.pacienteUid === pacienteUid)
          ) {
            let achadosLiberados: Array<{ nome: string; fotoUrl?: string }> = [];
            if (item.annotations && Array.isArray(item.annotations)) {
              achadosLiberados = item.annotations
                .filter((a: any) => a.type === 'achado' || a.sign_slug)
                .map((a: any) => ({
                  nome: a.sign_slug || 'Achado tricoscópico',
                  fotoUrl: s.image_url || undefined
                }));
            }
            consultasLiberadas.push({
              id: `sess_${s.id}`,
              sessionId: s.id,
              pacienteId: paciente!.id,
              pacienteNome: paciente!.nome,
              data: s.session_date,
              area: s.area || 'Couro Cabeludo',
              imagemUrl: s.image_url,
              achadosLiberados: achadosLiberados.length > 0 ? JSON.stringify(achadosLiberados) : undefined,
              liberadoPaciente: true,
              createdAt: s.created_at
            });
          }
        });
      }
    } catch {}
  }

  // Deduplicar consultas liberadas por id
  const mapCons = new Map<string, ConsultaRegistro>();
  consultasLiberadas.forEach(c => mapCons.set(c.id, c));
  consultasLiberadas = Array.from(mapCons.values());
  consultasLiberadas.sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());

  // 4. Carregar produtos liberados
  const produtosLiberados = await listarProdutosDoPaciente(paciente.id, true);

  // 5. Carregar próximos agendamentos do paciente (somente leitura)
  let proximasConsultas: Agendamento[] = [];
  try {
    const colAg = collection(db, 'agendamentos');
    const qAg = query(colAg, where('pacienteId', '==', paciente.id));
    const snapAg = await getDocs(qAg);
    if (!snapAg.empty) {
      snapAg.forEach(d => {
        const ag = d.data() as Agendamento;
        if (ag && ag.status !== 'cancelado') {
          proximasConsultas.push(ag);
        }
      });
    }
  } catch {}

  // Fallback agendamentos local
  if (proximasConsultas.length === 0 && typeof window !== 'undefined' && window.localStorage) {
    const raw = window.localStorage.getItem(`trico_agendamentos_v2_${profUid}`);
    if (raw) {
      try {
        const list = JSON.parse(raw) as Agendamento[];
        proximasConsultas = list.filter(a => a.pacienteId === paciente!.id && a.status !== 'cancelado');
      } catch {}
    }
  }

  proximasConsultas.sort((a, b) => new Date(`${a.data}T${a.horario}`).getTime() - new Date(`${b.data}T${b.horario}`).getTime());

  return {
    paciente,
    profissional: profissionalInfo,
    consultasLiberadas,
    produtosLiberados,
    proximasConsultas
  };
}

/**
 * Alterna liberação de uma consulta avulsa/registro para o paciente
 */
export async function alternarLiberacaoConsulta(
  consultaId: string,
  pacienteId: string,
  profissionalUid: string,
  liberado: boolean
): Promise<void> {
  try {
    const docRef = doc(db, 'consultas_paciente', consultaId);
    await setDoc(docRef, { liberadoPaciente: liberado }, { merge: true });
  } catch (err) {
    console.warn('Erro ao atualizar liberação no Firestore:', err);
  }

  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const raw = window.localStorage.getItem(`trico_consultas_avulsas_${profissionalUid}`);
      if (raw) {
        const list = JSON.parse(raw) as ConsultaRegistro[];
        const idx = list.findIndex(c => c.id === consultaId);
        if (idx >= 0) {
          list[idx].liberadoPaciente = liberado;
          window.localStorage.setItem(`trico_consultas_avulsas_${profissionalUid}`, JSON.stringify(list));
        }
      }
    } catch {}
  }
}
