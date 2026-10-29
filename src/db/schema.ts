import { pgTable, text, boolean, integer, timestamp, serial } from 'drizzle-orm/pg-core';

// 1. Tabela de Usuários Profissionais / Especialistas
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(), // UID do Firebase Auth ou identificador clínico
  nome: text('nome').notNull(),
  email: text('email').notNull(),
  titulo: text('titulo'),
  registro: text('registro'),
  clinica: text('clinica'),
  telefone: text('telefone'),
  planoId: text('plano_id').default('pro'),
  planoStatus: text('plano_status').default('trial'),
  planoCiclo: text('plano_ciclo').default('mensal'),
  planoValidade: text('plano_validade'),
  createdAt: text('created_at'),
  updatedAt: text('updated_at')
});

// 2. Tabela de Pacientes
export const pacientes = pgTable('pacientes', {
  id: text('id').primaryKey(), // ID único gerado (paciente_...)
  userId: text('user_id').notNull(),
  nome: text('nome').notNull(),
  telefone: text('telefone'),
  email: text('email'),
  dataNascimento: text('data_nascimento'),
  genero: text('genero'),
  queixaPrincipal: text('queixa_principal'),
  historicoClinico: text('historico_clinico'),
  portalAtivo: boolean('portal_ativo').default(false),
  portalConviteToken: text('portal_convite_token'),
  portalConviteExpiraEm: text('portal_convite_expira_em'),
  portalAtivadoEm: text('portal_ativado_em'),
  createdAt: text('created_at'),
  updatedAt: text('updated_at')
});

// 3. Tabela de Sessões da Bancada de Marcação & Captura Tricoscópica
export const sessoesBancada = pgTable('sessoes_bancada', {
  id: text('id').primaryKey(), // ID da sessão (session_...)
  userId: text('user_id').notNull(),
  clientName: text('client_name').notNull(),
  sessionDate: text('session_date').notNull(),
  area: text('area').notNull(),
  imageUrl: text('image_url').notNull(),
  imagePath: text('image_path'),
  fieldAreaCm2: text('field_area_cm2'),
  notes: text('notes'),
  casoReferenciaId: text('caso_referencia_id'),
  pacienteId: text('paciente_id'),
  pacienteUid: text('paciente_uid'),
  liberadoPaciente: boolean('liberado_paciente').default(false),
  annotationsJson: text('annotations_json').notNull(), // Marcações normalizadas em JSON
  totalFios: integer('total_fios').default(0),
  totalUf: integer('total_uf').default(0),
  ostiosVazios: integer('ostios_vazios').default(0),
  focosInflamacao: integer('focos_inflamacao').default(0),
  achadosCount: integer('achados_count').default(0),
  createdAt: text('created_at'),
  updatedAt: text('updated_at')
});

// 4. Tabela de Consultas e Histórico Clínico do Paciente
export const consultasPaciente = pgTable('consultas_paciente', {
  id: text('id').primaryKey(), // ID da consulta (cons_...)
  userId: text('user_id').notNull(),
  pacienteId: text('paciente_id').notNull(),
  pacienteNome: text('paciente_nome'),
  data: text('data').notNull(),
  area: text('area').notNull(),
  sessionId: text('session_id'),
  imagemUrl: text('imagem_url'),
  queixaEvolucao: text('queixa_evolucao'),
  condutaTratamento: text('conduta_tratamento'),
  totalFios: integer('total_fios').default(0),
  totalUf: integer('total_uf').default(0),
  ostiosVazios: integer('ostios_vazios').default(0),
  focosInflamacao: integer('focos_inflamacao').default(0),
  achadosCount: integer('achados_count').default(0),
  liberadoPaciente: boolean('liberado_paciente').default(false),
  createdAt: text('created_at')
});

// 5. Tabela de Modelos de Anamnese
export const modelosAnamnese = pgTable('modelos_anamnese', {
  id: text('id').primaryKey(),
  titulo: text('titulo').notNull(),
  descricao: text('descricao'),
  perguntasJson: text('perguntas_json').notNull(),
  isPadrao: boolean('is_padrao').default(false),
  createdAt: text('created_at')
});

// 6. Tabela de Respostas de Anamnese
export const respostasAnamnese = pgTable('respostas_anamnese', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  pacienteId: text('paciente_id').notNull(),
  modeloId: text('modelo_id').notNull(),
  respostasJson: text('respostas_json').notNull(),
  createdAt: text('created_at')
});

// 7. Tabela de Imagens do Atlas de Casos (caso_imagens)
export const casoImagens = pgTable('caso_imagens', {
  id: text('id').primaryKey(),
  casoId: text('caso_id').notNull(),
  nomeArquivo: text('nome_arquivo'),
  tamanhoBytes: integer('tamanho_bytes'),
  dataUrl: text('data_url').notNull(),
  storagePath: text('storage_path'),
  updatedAt: text('updated_at')
});
