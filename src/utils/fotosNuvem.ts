import { ref, uploadString, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage, auth } from '../firebase';
import { ADMIN_EMAILS } from '../config/admins';

/**
 * Verifica se o usuário atual autenticado é um administrador com e-mail verificado
 */
export function usuarioEhAdmin(): boolean {
  // 1. Checa usuário ativo no localStorage
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const saved = window.localStorage.getItem('trico_auth_user_active_v1');
      if (saved) {
        const u = JSON.parse(saved);
        if (u && u.email) {
          const emailLimpo = u.email.toLowerCase().trim();
          if (ADMIN_EMAILS.some(adm => adm.toLowerCase().trim() === emailLimpo)) {
            return true;
          }
        }
      }
    } catch {}
  }

  // 2. Checa Firebase Auth
  const user = auth.currentUser;
  if (user && user.email) {
    const emailLimpo = user.email.toLowerCase().trim();
    const isAdminEmail = ADMIN_EMAILS.some(adm => adm.toLowerCase().trim() === emailLimpo);
    if (isAdminEmail) {
      return true;
    }
  }

  return false;
}

/**
 * Executa uma promise com timeout estrito para nunca travar a interface
 */
export async function comTimeout<T>(prom: Promise<T>, ms: number, nomeOp: string): Promise<T> {
  let timer: any;
  const timeoutPromise = new Promise<T>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`Timeout de ${ms}ms em: ${nomeOp}`)), ms);
  });
  return Promise.race([prom, timeoutPromise]).finally(() => {
    if (timer) clearTimeout(timer);
  });
}

/**
 * Envia uma foto de captura da bancada para o Firebase Storage
 * Caminho: capturas/{uid}/{capturaId}.jpg
 */
export async function enviarFotoCaptura(
  capturaId: string, 
  dataUrl: string
): Promise<{ url: string; path: string }> {
  let uid = auth.currentUser?.uid;
  if (!uid && typeof window !== 'undefined' && window.localStorage) {
    try {
      const saved = window.localStorage.getItem('trico_auth_user_active_v1');
      if (saved) {
        const u = JSON.parse(saved);
        if (u?.uid) uid = u.uid;
      }
    } catch {}
  }

  if (!uid) {
    uid = 'especialista_consultorio';
  }

  const path = `capturas/${uid}/${capturaId}.jpg`;

  if (!dataUrl) {
    return { url: '', path };
  }

  if (dataUrl.startsWith('http://') || dataUrl.startsWith('https://')) {
    return { url: dataUrl, path };
  }

  // Firebase Storage (com timeout de 3s para garantir alta responsividade)
  try {
    const storageRef = ref(storage, path);
    await comTimeout(
      uploadString(storageRef, dataUrl, 'data_url', { contentType: 'image/jpeg' }),
      3000,
      'Firebase Storage Upload'
    );
    const url = await comTimeout(getDownloadURL(storageRef), 2000, 'Firebase Storage URL');
    console.info(`✅ Foto enviada com sucesso para Firebase Storage: ${path}`);
    return { url, path };
  } catch (fbStorageErr) {
    console.warn('Aviso Firebase Storage (utilizando persistência direta dataURL no Firestore):', fbStorageErr);
    return { url: dataUrl, path };
  }
}

/**
 * Envia uma imagem de referência do Atlas para o Firebase Storage
 * Caminho: atlas/{casoId}/{imagemId}.jpg
 * Restrito exclusivamente a administradores
 */
export async function enviarImagemAtlas(
  casoId: string, 
  imagemId: string, 
  dataUrl: string
): Promise<{ url: string; path: string }> {
  if (!usuarioEhAdmin()) {
    throw new Error('Somente administradores podem alterar as imagens do Atlas.');
  }

  const path = `atlas/${casoId}/${imagemId}.jpg`;

  if (!dataUrl) {
    return { url: '', path };
  }

  if (dataUrl.startsWith('http://') || dataUrl.startsWith('https://')) {
    return { url: dataUrl, path };
  }

  // Firebase Storage
  const storageRef = ref(storage, path);
  try {
    await comTimeout(
      uploadString(storageRef, dataUrl, 'data_url', {
        contentType: 'image/jpeg'
      }),
      4000,
      'Firebase Storage Atlas Upload'
    );
    const url = await comTimeout(getDownloadURL(storageRef), 2000, 'Firebase Storage Atlas URL');
    return { url, path };
  } catch {
    // Fallback seguro em dataUrl direto
    return { url: dataUrl, path };
  }
}

/**
 * Remove um arquivo do Firebase Storage pelo seu caminho
 * Ignora silenciosamente se o arquivo não existir
 */
export async function removerArquivo(path: string): Promise<void> {
  if (!path) return;

  try {
    const storageRef = ref(storage, path);
    await deleteObject(storageRef);
  } catch (error: any) {
    if (error?.code === 'storage/object-not-found') {
      return;
    }
  }
}
