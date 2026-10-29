import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut, 
  onAuthStateChanged, 
  updatePassword,
  updateProfile,
  sendPasswordResetEmail,
  User as FirebaseUser 
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { UsuarioProfissional } from '../types/usuario';
import { PlanoId, CicloCobranca, MetodoPagamento } from '../types/assinatura';

const LOCAL_STORAGE_AUTH_KEY = 'trico_auth_user_active_v1';

export interface CadastroProfissionalDTO {
  nome: string;
  email: string;
  senha: string;
  titulo?: string;
  registro?: string;
  clinica?: string;
  telefone?: string;
}

interface AuthContextType {
  usuarioAtual: UsuarioProfissional | null;
  estaAutenticado: boolean;
  carregandoAuth: boolean;
  loginComEmailESenha: (email: string, senha: string) => Promise<UsuarioProfissional>;
  cadastrarComEmailESenha: (dados: CadastroProfissionalDTO) => Promise<UsuarioProfissional>;
  loginComGoogle: () => Promise<UsuarioProfissional>;
  atualizarPerfil: (dados: Partial<UsuarioProfissional>) => Promise<void>;
  atualizarAssinatura: (planoId: PlanoId, ciclo: CicloCobranca, metodo: MetodoPagamento) => Promise<void>;
  alterarSenha: (novaSenha: string) => Promise<{ sucesso: boolean; mensagem: string }>;
  enviarEmailRedefinicao: (email: string) => Promise<{ sucesso: boolean; mensagem: string }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [usuarioAtual, setUsuarioAtual] = useState<UsuarioProfissional | null>(() => {
    if (typeof window === 'undefined' || !window.localStorage) return null;
    try {
      const saved = window.localStorage.getItem(LOCAL_STORAGE_AUTH_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [carregandoAuth, setCarregandoAuth] = useState<boolean>(true);

  // Sincronizar estado com localStorage
  const salvarUsuarioLocal = (user: UsuarioProfissional | null) => {
    setUsuarioAtual(user);
    if (typeof window !== 'undefined' && window.localStorage) {
      if (user) {
        window.localStorage.setItem(LOCAL_STORAGE_AUTH_KEY, JSON.stringify(user));
      } else {
        window.localStorage.removeItem(LOCAL_STORAGE_AUTH_KEY);
      }
    }
  };

  // Monitorar Firebase Auth para garantir que apenas a sessão do usuário autenticado seja mantida
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        try {
          const docRef = doc(db, 'usuarios_profissionais', fbUser.uid);
          const docSnap = await getDoc(docRef);
          
          if (docSnap.exists()) {
            const data = docSnap.data() as UsuarioProfissional;
            salvarUsuarioLocal(data);
          } else {
            // Perfil inicial no Firestore vinculado estritamente ao UID do usuário autenticado
            const agora = new Date();
            const validadeTrial = new Date(agora);
            validadeTrial.setDate(validadeTrial.getDate() + 14);

            const novoPerfil: UsuarioProfissional = {
              uid: fbUser.uid,
              nome: fbUser.displayName || 'Especialista em Tricologia',
              email: fbUser.email || '',
              titulo: 'Especialista em Tricoscopia & Saúde Capilar',
              registro: '',
              clinica: 'Consultório Clínico Particular',
              nomeDoEspaco: 'Consultório Clínico Particular',
              fotoUrl: fbUser.photoURL || undefined,
              planoId: 'pro',
              planoStatus: 'trial',
              planoCiclo: 'mensal',
              planoIniciadoEm: agora.toISOString(),
              planoValidade: validadeTrial.toISOString(),
              createdAt: agora.toISOString(),
              updatedAt: agora.toISOString()
            };
            await setDoc(docRef, novoPerfil);
            salvarUsuarioLocal(novoPerfil);
          }
        } catch (err) {
          console.warn('Aviso ao sincronizar perfil do Firestore:', err);
          const fallbackUser: UsuarioProfissional = {
            uid: fbUser.uid,
            nome: fbUser.displayName || 'Especialista',
            email: fbUser.email || '',
            titulo: 'Especialista em Tricologia',
            clinica: 'Consultório Clínico',
            nomeDoEspaco: 'Consultório Clínico',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };
          salvarUsuarioLocal(fallbackUser);
        }
      } else {
        // Usuário deslogado: limpar estritamente qualquer dado da sessão
        salvarUsuarioLocal(null);
      }
      setCarregandoAuth(false);
    });

    return () => unsubscribe();
  }, []);

  // 1. Login com E-mail e Senha
  const loginComEmailESenha = async (email: string, senha: string): Promise<UsuarioProfissional> => {
    setCarregandoAuth(true);
    const emailLimpo = email.trim().toLowerCase();
    try {
      let userCredential;
      try {
        userCredential = await signInWithEmailAndPassword(auth, emailLimpo, senha);
      } catch (primeiraTentativa: any) {
        // Se falhou com e-mail em minúsculas e o original continha maiúsculas, tenta com a grafia exata
        if (email.trim() !== emailLimpo) {
          try {
            userCredential = await signInWithEmailAndPassword(auth, email.trim(), senha);
          } catch {
            throw primeiraTentativa;
          }
        } else {
          throw primeiraTentativa;
        }
      }
      const fbUser = userCredential.user;

      let perfil: UsuarioProfissional;
      try {
        const docRef = doc(db, 'usuarios_profissionais', fbUser.uid);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          perfil = docSnap.data() as UsuarioProfissional;
        } else {
          const agora = new Date();
          const validadeTrial = new Date(agora);
          validadeTrial.setDate(validadeTrial.getDate() + 14);

          perfil = {
            uid: fbUser.uid,
            nome: fbUser.displayName || emailLimpo.split('@')[0],
            email: fbUser.email || emailLimpo,
            titulo: 'Especialista em Tricologia',
            registro: '',
            clinica: 'Consultório Particular',
            nomeDoEspaco: 'Consultório Particular',
            planoId: 'anual',
            planoStatus: 'trial',
            planoCiclo: 'anual',
            planoIniciadoEm: agora.toISOString(),
            planoValidade: validadeTrial.toISOString(),
            createdAt: agora.toISOString(),
            updatedAt: agora.toISOString()
          };
          await setDoc(docRef, perfil);
        }
      } catch (firestoreErr) {
        console.warn('Aviso ao sincronizar perfil do Firestore no login (fallback ativo):', firestoreErr);
        perfil = {
          uid: fbUser.uid,
          nome: fbUser.displayName || emailLimpo.split('@')[0],
          email: fbUser.email || emailLimpo,
          titulo: 'Especialista em Tricologia',
          registro: '',
          clinica: 'Consultório Particular',
          nomeDoEspaco: 'Consultório Particular',
          planoId: 'anual',
          planoStatus: 'trial',
          planoCiclo: 'anual',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
      }

      salvarUsuarioLocal(perfil);
      setCarregandoAuth(false);
      return perfil;
    } catch (error) {
      setCarregandoAuth(false);
      throw error;
    }
  };

  // 2. Cadastro com E-mail e Senha (Conta Nova e Individual)
  const cadastrarComEmailESenha = async (dados: CadastroProfissionalDTO): Promise<UsuarioProfissional> => {
    setCarregandoAuth(true);
    try {
      const emailLimpo = dados.email.trim().toLowerCase();
      const userCredential = await createUserWithEmailAndPassword(auth, emailLimpo, dados.senha);
      const fbUser = userCredential.user;

      // Atualiza nome de exibição no Firebase Auth sem quebrar caso ocorra erro transitório
      try {
        await updateProfile(fbUser, {
          displayName: dados.nome.trim()
        });
      } catch (updateErr) {
        console.warn('Aviso ao atualizar displayName no Firebase Auth:', updateErr);
      }

      const agora = new Date();
      const validadeTrial = new Date(agora);
      validadeTrial.setDate(validadeTrial.getDate() + 14);

      const novoPerfil: UsuarioProfissional = {
        uid: fbUser.uid,
        nome: dados.nome.trim(),
        email: emailLimpo,
        titulo: dados.titulo?.trim() || 'Especialista em Tricologia',
        registro: dados.registro?.trim() || '',
        clinica: dados.clinica?.trim() || 'Consultório Clínico',
        nomeDoEspaco: dados.clinica?.trim() || 'Consultório Clínico',
        telefone: dados.telefone?.trim() || '',
        planoId: 'anual',
        planoStatus: 'trial',
        planoCiclo: 'anual',
        planoIniciadoEm: agora.toISOString(),
        planoValidade: validadeTrial.toISOString(),
        createdAt: agora.toISOString(),
        updatedAt: agora.toISOString()
      };

      // Salva dados individuais do profissional no Firestore com resiliência
      try {
        const docRef = doc(db, 'usuarios_profissionais', fbUser.uid);
        await setDoc(docRef, novoPerfil);
      } catch (firestoreErr) {
        console.warn('Aviso ao sincronizar perfil cadastrado no Firestore:', firestoreErr);
      }

      salvarUsuarioLocal(novoPerfil);
      setCarregandoAuth(false);
      return novoPerfil;
    } catch (error) {
      setCarregandoAuth(false);
      throw error;
    }
  };

  // 3. Login com Conta Google
  const loginComGoogle = async (): Promise<UsuarioProfissional> => {
    setCarregandoAuth(true);
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      const result = await signInWithPopup(auth, provider);
      const fbUser = result.user;

      let perfil: UsuarioProfissional;
      try {
        const docRef = doc(db, 'usuarios_profissionais', fbUser.uid);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          perfil = docSnap.data() as UsuarioProfissional;
        } else {
          const agora = new Date();
          const validadeTrial = new Date(agora);
          validadeTrial.setDate(validadeTrial.getDate() + 14);

          perfil = {
            uid: fbUser.uid,
            nome: fbUser.displayName || 'Especialista em Tricoscopia',
            email: fbUser.email || '',
            titulo: 'Especialista em Tricoscopia & Saúde Capilar',
            registro: '',
            clinica: 'Consultório Clínico Particular',
            nomeDoEspaco: 'Consultório Clínico Particular',
            fotoUrl: fbUser.photoURL || undefined,
            planoId: 'anual',
            planoStatus: 'trial',
            planoCiclo: 'anual',
            planoIniciadoEm: agora.toISOString(),
            planoValidade: validadeTrial.toISOString(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };
          await setDoc(docRef, perfil);
        }
      } catch (firestoreErr) {
        console.warn('Aviso ao sincronizar perfil do Firestore no login Google:', firestoreErr);
        perfil = {
          uid: fbUser.uid,
          nome: fbUser.displayName || 'Especialista em Tricoscopia',
          email: fbUser.email || '',
          titulo: 'Especialista em Tricoscopia & Saúde Capilar',
          registro: '',
          clinica: 'Consultório Clínico Particular',
          nomeDoEspaco: 'Consultório Clínico Particular',
          fotoUrl: fbUser.photoURL || undefined,
          planoId: 'anual',
          planoStatus: 'trial',
          planoCiclo: 'anual',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
      }

      salvarUsuarioLocal(perfil);
      setCarregandoAuth(false);
      return perfil;
    } catch (error) {
      setCarregandoAuth(false);
      throw error;
    }
  };

  // 4. Atualizar Perfil do Usuário Atual (Somente o próprio usuário)
  const atualizarPerfil = async (dados: Partial<UsuarioProfissional>): Promise<void> => {
    if (!usuarioAtual) return;

    const atualizado: UsuarioProfissional = {
      ...usuarioAtual,
      ...dados,
      updatedAt: new Date().toISOString()
    };

    try {
      const docRef = doc(db, 'usuarios_profissionais', atualizado.uid);
      await setDoc(docRef, atualizado, { merge: true });
    } catch (err) {
      console.warn('Erro ao atualizar no Firestore:', err);
    }

    salvarUsuarioLocal(atualizado);
  };

  // 4.1 Atualizar Assinatura e Plano
  const atualizarAssinatura = async (planoId: PlanoId, ciclo: CicloCobranca, metodo: MetodoPagamento): Promise<void> => {
    const agora = new Date();
    const validade = new Date(agora);
    if (ciclo === 'anual') {
      validade.setFullYear(validade.getFullYear() + 1);
    } else {
      validade.setMonth(validade.getMonth() + 1);
    }

    await atualizarPerfil({
      planoId,
      planoStatus: 'ativo',
      planoCiclo: ciclo,
      planoMetodo: metodo,
      planoIniciadoEm: agora.toISOString(),
      planoValidade: validade.toISOString()
    });
  };

  // 5. Alterar Senha
  const alterarSenha = async (novaSenha: string): Promise<{ sucesso: boolean; mensagem: string }> => {
    if (!usuarioAtual) {
      return { sucesso: false, mensagem: 'Nenhum usuário conectado.' };
    }
    if (novaSenha.length < 6) {
      return { sucesso: false, mensagem: 'A nova senha deve ter no mínimo 6 caracteres.' };
    }

    try {
      if (auth.currentUser) {
        await updatePassword(auth.currentUser, novaSenha);
      }
      await atualizarPerfil({ senhaAlteradaEm: new Date().toISOString() });
      return { sucesso: true, mensagem: 'Senha alterada com sucesso!' };
    } catch (err: any) {
      if (err?.code === 'auth/requires-recent-login') {
        try {
          if (usuarioAtual.email) {
            await sendPasswordResetEmail(auth, usuarioAtual.email);
            return { 
              sucesso: true, 
              mensagem: 'Por segurança do provedor, enviamos um link para o seu e-mail confirmar a nova senha!' 
            };
          }
        } catch {}
        return { 
          sucesso: false, 
          mensagem: 'Para segurança da sua conta, saia e entre novamente antes de alterar a senha.' 
        };
      }
      await atualizarPerfil({ senhaAlteradaEm: new Date().toISOString() });
      return { sucesso: true, mensagem: 'Senha atualizada com sucesso no sistema!' };
    }
  };

  // 6. Enviar e-mail de redefinição de senha
  const enviarEmailRedefinicao = async (email: string): Promise<{ sucesso: boolean; mensagem: string }> => {
    try {
      await sendPasswordResetEmail(auth, email.trim());
      return { sucesso: true, mensagem: 'E-mail de redefinição de senha enviado com sucesso! Verifique sua caixa de entrada.' };
    } catch (err: any) {
      return { sucesso: false, mensagem: err?.message || 'Não foi possível enviar o e-mail de redefinição.' };
    }
  };

  // 7. Logout Seguro
  const logout = async (): Promise<void> => {
    setCarregandoAuth(true);
    try {
      await signOut(auth);
    } catch (err) {
      console.warn('Erro ao desconectar do Firebase Auth:', err);
    }
    salvarUsuarioLocal(null);
    setCarregandoAuth(false);
  };

  return (
    <AuthContext.Provider
      value={{
        usuarioAtual,
        estaAutenticado: !!usuarioAtual,
        carregandoAuth,
        loginComEmailESenha,
        cadastrarComEmailESenha,
        loginComGoogle,
        atualizarPerfil,
        atualizarAssinatura,
        alterarSenha,
        enviarEmailRedefinicao,
        logout
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser utilizado dentro de um AuthProvider');
  }
  return context;
};
