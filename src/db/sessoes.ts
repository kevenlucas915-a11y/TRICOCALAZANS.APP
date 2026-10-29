import { eq, desc, or } from 'drizzle-orm';
import { db } from './index.ts';
import { sessoesBancada, consultasPaciente } from './schema.ts';

export interface SalvarSessaoInput {
  id: string;
  userId: string;
  clientName: string;
  sessionDate: string;
  area: string;
  imageUrl: string;
  imagePath?: string;
  fieldAreaCm2?: string | number;
  notes?: string;
  casoReferenciaId?: string;
  pacienteId?: string;
  pacienteUid?: string;
  liberadoPaciente?: boolean;
  annotationsJson: string;
  totalFios?: number;
  totalUf?: number;
  ostiosVazios?: number;
  focosInflamacao?: number;
  achadosCount?: number;
  createdAt?: string;
  updatedAt?: string;
}

export async function salvarSessaoSql(input: SalvarSessaoInput) {
  try {
    const agora = new Date().toISOString();
    const dados = {
      id: input.id,
      userId: input.userId,
      clientName: input.clientName,
      sessionDate: input.sessionDate,
      area: input.area,
      imageUrl: input.imageUrl,
      imagePath: input.imagePath || null,
      fieldAreaCm2: input.fieldAreaCm2 != null ? String(input.fieldAreaCm2) : null,
      notes: input.notes || '',
      casoReferenciaId: input.casoReferenciaId || null,
      pacienteId: input.pacienteId || null,
      pacienteUid: input.pacienteUid || null,
      liberadoPaciente: input.liberadoPaciente ?? false,
      annotationsJson: input.annotationsJson || '[]',
      totalFios: input.totalFios || 0,
      totalUf: input.totalUf || 0,
      ostiosVazios: input.ostiosVazios || 0,
      focosInflamacao: input.focosInflamacao || 0,
      achadosCount: input.achadosCount || 0,
      createdAt: input.createdAt || agora,
      updatedAt: agora
    };

    await db.insert(sessoesBancada)
      .values(dados)
      .onConflictDoUpdate({
        target: sessoesBancada.id,
        set: {
          clientName: dados.clientName,
          sessionDate: dados.sessionDate,
          area: dados.area,
          imageUrl: dados.imageUrl,
          imagePath: dados.imagePath,
          fieldAreaCm2: dados.fieldAreaCm2,
          notes: dados.notes,
          casoReferenciaId: dados.casoReferenciaId,
          pacienteId: dados.pacienteId,
          pacienteUid: dados.pacienteUid,
          liberadoPaciente: dados.liberadoPaciente,
          annotationsJson: dados.annotationsJson,
          totalFios: dados.totalFios,
          totalUf: dados.totalUf,
          ostiosVazios: dados.ostiosVazios,
          focosInflamacao: dados.focosInflamacao,
          achadosCount: dados.achadosCount,
          updatedAt: dados.updatedAt
        }
      });

    // Se houver paciente vinculado, sincronizar com consultas_paciente
    if (input.pacienteId) {
      try {
        await db.insert(consultasPaciente)
          .values({
            id: `cons_${input.id}`,
            userId: input.userId,
            pacienteId: input.pacienteId,
            pacienteNome: input.clientName,
            data: input.sessionDate,
            area: input.area,
            sessionId: input.id,
            imagemUrl: input.imageUrl,
            totalFios: input.totalFios || 0,
            totalUf: input.totalUf || 0,
            ostiosVazios: input.ostiosVazios || 0,
            focosInflamacao: input.focosInflamacao || 0,
            achadosCount: input.achadosCount || 0,
            liberadoPaciente: input.liberadoPaciente ?? false,
            createdAt: input.createdAt || agora
          })
          .onConflictDoUpdate({
            target: consultasPaciente.id,
            set: {
              data: input.sessionDate,
              area: input.area,
              imagemUrl: input.imageUrl,
              totalFios: input.totalFios || 0,
              totalUf: input.totalUf || 0,
              ostiosVazios: input.ostiosVazios || 0,
              focosInflamacao: input.focosInflamacao || 0,
              achadosCount: input.achadosCount || 0,
              liberadoPaciente: input.liberadoPaciente ?? false
            }
          });
      } catch (consErr) {
        console.warn('Aviso ao sincronizar consulta relacional:', consErr);
      }
    }

    return dados;
  } catch (error) {
    console.error('Falha ao salvar sessão no PostgreSQL:', error);
    throw new Error('Falha ao gravar sessão no banco de dados relacional.', { cause: error });
  }
}

export async function listarSessoesSql(userId?: string) {
  try {
    if (userId && userId !== 'especialista_consultorio') {
      return await db.select()
        .from(sessoesBancada)
        .where(or(eq(sessoesBancada.userId, userId), eq(sessoesBancada.userId, 'especialista_consultorio')))
        .orderBy(desc(sessoesBancada.createdAt));
    }
    return await db.select()
      .from(sessoesBancada)
      .orderBy(desc(sessoesBancada.createdAt));
  } catch (error) {
    console.error('Falha ao listar sessões no PostgreSQL:', error);
    throw new Error('Falha ao buscar sessões no banco de dados.', { cause: error });
  }
}

export async function obterSessaoSql(id: string) {
  try {
    const res = await db.select()
      .from(sessoesBancada)
      .where(eq(sessoesBancada.id, id))
      .limit(1);
    return res[0] || null;
  } catch (error) {
    console.error(`Falha ao obter sessão ${id} no PostgreSQL:`, error);
    throw new Error(`Falha ao recuperar sessão ${id}.`, { cause: error });
  }
}

export async function deletarSessaoSql(id: string) {
  try {
    await db.delete(consultasPaciente).where(eq(consultasPaciente.sessionId, id));
    await db.delete(sessoesBancada).where(eq(sessoesBancada.id, id));
    return { sucesso: true };
  } catch (error) {
    console.error(`Falha ao deletar sessão ${id} no PostgreSQL:`, error);
    throw new Error(`Falha ao excluir sessão ${id}.`, { cause: error });
  }
}
