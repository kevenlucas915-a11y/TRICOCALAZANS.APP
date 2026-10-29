import { eq, desc, or } from 'drizzle-orm';
import { db } from './index.ts';
import { pacientes } from './schema.ts';

export interface SalvarPacienteInput {
  id: string;
  userId: string;
  nome: string;
  telefone?: string;
  email?: string;
  dataNascimento?: string;
  genero?: string;
  queixaPrincipal?: string;
  historicoClinico?: string;
  portalAtivo?: boolean;
  portalConviteToken?: string;
  portalConviteExpiraEm?: string;
  portalAtivadoEm?: string;
  createdAt?: string;
  updatedAt?: string;
}

export async function salvarPacienteSql(input: SalvarPacienteInput) {
  try {
    const agora = new Date().toISOString();
    const dados = {
      id: input.id,
      userId: input.userId,
      nome: input.nome,
      telefone: input.telefone || null,
      email: input.email || null,
      dataNascimento: input.dataNascimento || null,
      genero: input.genero || null,
      queixaPrincipal: input.queixaPrincipal || null,
      historicoClinico: input.historicoClinico || null,
      portalAtivo: input.portalAtivo ?? false,
      portalConviteToken: input.portalConviteToken || null,
      portalConviteExpiraEm: input.portalConviteExpiraEm || null,
      portalAtivadoEm: input.portalAtivadoEm || null,
      createdAt: input.createdAt || agora,
      updatedAt: agora
    };

    await db.insert(pacientes)
      .values(dados)
      .onConflictDoUpdate({
        target: pacientes.id,
        set: {
          nome: dados.nome,
          telefone: dados.telefone,
          email: dados.email,
          dataNascimento: dados.dataNascimento,
          genero: dados.genero,
          queixaPrincipal: dados.queixaPrincipal,
          historicoClinico: dados.historicoClinico,
          portalAtivo: dados.portalAtivo,
          portalConviteToken: dados.portalConviteToken,
          portalConviteExpiraEm: dados.portalConviteExpiraEm,
          portalAtivadoEm: dados.portalAtivadoEm,
          updatedAt: dados.updatedAt
        }
      });

    return dados;
  } catch (error) {
    console.error('Falha ao salvar paciente no PostgreSQL:', error);
    throw new Error('Falha ao salvar paciente no banco de dados.', { cause: error });
  }
}

export async function listarPacientesSql(userId?: string) {
  try {
    if (userId && userId !== 'especialista_consultorio') {
      return await db.select()
        .from(pacientes)
        .where(or(eq(pacientes.userId, userId), eq(pacientes.userId, 'especialista_consultorio')))
        .orderBy(desc(pacientes.createdAt));
    }
    return await db.select()
      .from(pacientes)
      .orderBy(desc(pacientes.createdAt));
  } catch (error) {
    console.error('Falha ao listar pacientes no PostgreSQL:', error);
    throw new Error('Falha ao listar pacientes do banco de dados.', { cause: error });
  }
}

export async function deletarPacienteSql(id: string) {
  try {
    await db.delete(pacientes).where(eq(pacientes.id, id));
    return { sucesso: true };
  } catch (error) {
    console.error(`Falha ao excluir paciente ${id} no PostgreSQL:`, error);
    throw new Error(`Falha ao excluir paciente ${id}.`, { cause: error });
  }
}
