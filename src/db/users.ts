import { eq } from 'drizzle-orm';
import { db } from './index.ts';
import { users } from './schema.ts';

export async function getOrCreateUser(uid: string, email: string, nome?: string) {
  try {
    const agora = new Date().toISOString();
    const result = await db.insert(users)
      .values({
        uid,
        email,
        nome: nome || email.split('@')[0] || 'Profissional',
        createdAt: agora,
        updatedAt: agora
      })
      .onConflictDoUpdate({
        target: users.uid,
        set: {
          email,
          ...(nome ? { nome } : {}),
          updatedAt: agora
        },
      })
      .returning();

    return result[0];
  } catch (error) {
    console.error('Falha ao obter ou criar usuário no Cloud SQL:', error);
    throw new Error('Falha ao sincronizar perfil de usuário.', { cause: error });
  }
}

export async function getUserByUid(uid: string) {
  try {
    const rows = await db.select().from(users).where(eq(users.uid, uid)).limit(1);
    return rows[0] || null;
  } catch (error) {
    console.error(`Falha ao buscar usuário ${uid} no Cloud SQL:`, error);
    throw new Error('Falha ao consultar usuário no banco de dados.', { cause: error });
  }
}
