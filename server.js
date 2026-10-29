var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// server.ts
import express from "express";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import Stripe from "stripe";
import fs from "fs";
import path from "path";
import { initializeApp as initAdminApp, getApps as getAdminApps, cert as adminCert } from "firebase-admin/app";
import { getAuth as getAdminAuth } from "firebase-admin/auth";
import { getFirestore as getAdminFirestore } from "firebase-admin/firestore";
import { GoogleGenAI } from "@google/genai";

// src/config/promptsIA.ts
var INSTRUCAO_SISTEMA_TRANSCRICAO_LAUDO = "Transcreva fielmente os resultados do laudo. Para cada exame retorne marcador, valor, unidade, faixa de refer\xEAncia do pr\xF3prio laudo (m\xEDnimo, m\xE1ximo e texto original) e um campo incerto=true quando n\xE3o tiver certeza da leitura. N\xE3o interprete, n\xE3o classifique, n\xE3o comente.";

// src/config/planos.ts
var PLANO_MINIMO_IA = "master";
var LIMITES_MENSAIS_IA = {
  master: 40,
  anual: 40,
  // No fluxo comercial do app, o plano anual equivale ao pacote completo (Master)
  pro: 0,
  mensal: 0,
  gratuito: 0,
  starter: 0
};
var HIERARQUIA_PLANOS = {
  starter: 0,
  gratuito: 0,
  pro: 1,
  mensal: 1,
  master: 2,
  anual: 2
};
function temPermissaoExamesIa(planoId, status) {
  if (status === "trial") return true;
  if (!planoId) return false;
  const nivel = HIERARQUIA_PLANOS[planoId.toLowerCase()] ?? 0;
  const nivelExigido = HIERARQUIA_PLANOS[PLANO_MINIMO_IA] ?? 2;
  return nivel >= nivelExigido;
}
function obterLimiteMensalIa(planoId, status) {
  if (status === "trial") return 40;
  if (!planoId) return 0;
  return LIMITES_MENSAIS_IA[planoId.toLowerCase()] ?? 0;
}

// src/db/sessoes.ts
import { eq, desc, or } from "drizzle-orm";

// src/db/index.ts
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

// src/db/schema.ts
var schema_exports = {};
__export(schema_exports, {
  casoImagens: () => casoImagens,
  consultasPaciente: () => consultasPaciente,
  modelosAnamnese: () => modelosAnamnese,
  pacientes: () => pacientes,
  respostasAnamnese: () => respostasAnamnese,
  sessoesBancada: () => sessoesBancada,
  users: () => users
});
import { pgTable, text, boolean, integer, serial } from "drizzle-orm/pg-core";
var users = pgTable("users", {
  id: serial("id").primaryKey(),
  uid: text("uid").notNull().unique(),
  // UID do Firebase Auth ou identificador clínico
  nome: text("nome").notNull(),
  email: text("email").notNull(),
  titulo: text("titulo"),
  registro: text("registro"),
  clinica: text("clinica"),
  telefone: text("telefone"),
  planoId: text("plano_id").default("pro"),
  planoStatus: text("plano_status").default("trial"),
  planoCiclo: text("plano_ciclo").default("mensal"),
  planoValidade: text("plano_validade"),
  createdAt: text("created_at"),
  updatedAt: text("updated_at")
});
var pacientes = pgTable("pacientes", {
  id: text("id").primaryKey(),
  // ID único gerado (paciente_...)
  userId: text("user_id").notNull(),
  nome: text("nome").notNull(),
  telefone: text("telefone"),
  email: text("email"),
  dataNascimento: text("data_nascimento"),
  genero: text("genero"),
  queixaPrincipal: text("queixa_principal"),
  historicoClinico: text("historico_clinico"),
  portalAtivo: boolean("portal_ativo").default(false),
  portalConviteToken: text("portal_convite_token"),
  portalConviteExpiraEm: text("portal_convite_expira_em"),
  portalAtivadoEm: text("portal_ativado_em"),
  createdAt: text("created_at"),
  updatedAt: text("updated_at")
});
var sessoesBancada = pgTable("sessoes_bancada", {
  id: text("id").primaryKey(),
  // ID da sessão (session_...)
  userId: text("user_id").notNull(),
  clientName: text("client_name").notNull(),
  sessionDate: text("session_date").notNull(),
  area: text("area").notNull(),
  imageUrl: text("image_url").notNull(),
  imagePath: text("image_path"),
  fieldAreaCm2: text("field_area_cm2"),
  notes: text("notes"),
  casoReferenciaId: text("caso_referencia_id"),
  pacienteId: text("paciente_id"),
  pacienteUid: text("paciente_uid"),
  liberadoPaciente: boolean("liberado_paciente").default(false),
  annotationsJson: text("annotations_json").notNull(),
  // Marcações normalizadas em JSON
  totalFios: integer("total_fios").default(0),
  totalUf: integer("total_uf").default(0),
  ostiosVazios: integer("ostios_vazios").default(0),
  focosInflamacao: integer("focos_inflamacao").default(0),
  achadosCount: integer("achados_count").default(0),
  createdAt: text("created_at"),
  updatedAt: text("updated_at")
});
var consultasPaciente = pgTable("consultas_paciente", {
  id: text("id").primaryKey(),
  // ID da consulta (cons_...)
  userId: text("user_id").notNull(),
  pacienteId: text("paciente_id").notNull(),
  pacienteNome: text("paciente_nome"),
  data: text("data").notNull(),
  area: text("area").notNull(),
  sessionId: text("session_id"),
  imagemUrl: text("imagem_url"),
  queixaEvolucao: text("queixa_evolucao"),
  condutaTratamento: text("conduta_tratamento"),
  totalFios: integer("total_fios").default(0),
  totalUf: integer("total_uf").default(0),
  ostiosVazios: integer("ostios_vazios").default(0),
  focosInflamacao: integer("focos_inflamacao").default(0),
  achadosCount: integer("achados_count").default(0),
  liberadoPaciente: boolean("liberado_paciente").default(false),
  createdAt: text("created_at")
});
var modelosAnamnese = pgTable("modelos_anamnese", {
  id: text("id").primaryKey(),
  titulo: text("titulo").notNull(),
  descricao: text("descricao"),
  perguntasJson: text("perguntas_json").notNull(),
  isPadrao: boolean("is_padrao").default(false),
  createdAt: text("created_at")
});
var respostasAnamnese = pgTable("respostas_anamnese", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  pacienteId: text("paciente_id").notNull(),
  modeloId: text("modelo_id").notNull(),
  respostasJson: text("respostas_json").notNull(),
  createdAt: text("created_at")
});
var casoImagens = pgTable("caso_imagens", {
  id: text("id").primaryKey(),
  casoId: text("caso_id").notNull(),
  nomeArquivo: text("nome_arquivo"),
  tamanhoBytes: integer("tamanho_bytes"),
  dataUrl: text("data_url").notNull(),
  storagePath: text("storage_path"),
  updatedAt: text("updated_at")
});

// src/db/index.ts
var createPool = () => {
  if (!global._postgresPool) {
    global._postgresPool = new Pool({
      host: process.env.SQL_HOST,
      user: process.env.SQL_USER,
      password: process.env.SQL_PASSWORD,
      database: process.env.SQL_DB_NAME,
      max: 10,
      connectionTimeoutMillis: 15e3
    });
    global._postgresPool.on("error", (err) => {
      console.error("Unexpected error on idle SQL pool client:", err);
    });
  }
  return global._postgresPool;
};
var pool = createPool();
var db = drizzle(pool, { schema: schema_exports });

// src/db/sessoes.ts
async function salvarSessaoSql(input) {
  try {
    const agora = (/* @__PURE__ */ new Date()).toISOString();
    const dados = {
      id: input.id,
      userId: input.userId,
      clientName: input.clientName,
      sessionDate: input.sessionDate,
      area: input.area,
      imageUrl: input.imageUrl,
      imagePath: input.imagePath || null,
      fieldAreaCm2: input.fieldAreaCm2 != null ? String(input.fieldAreaCm2) : null,
      notes: input.notes || "",
      casoReferenciaId: input.casoReferenciaId || null,
      pacienteId: input.pacienteId || null,
      pacienteUid: input.pacienteUid || null,
      liberadoPaciente: input.liberadoPaciente ?? false,
      annotationsJson: input.annotationsJson || "[]",
      totalFios: input.totalFios || 0,
      totalUf: input.totalUf || 0,
      ostiosVazios: input.ostiosVazios || 0,
      focosInflamacao: input.focosInflamacao || 0,
      achadosCount: input.achadosCount || 0,
      createdAt: input.createdAt || agora,
      updatedAt: agora
    };
    await db.insert(sessoesBancada).values(dados).onConflictDoUpdate({
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
    if (input.pacienteId) {
      try {
        await db.insert(consultasPaciente).values({
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
        }).onConflictDoUpdate({
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
        console.warn("Aviso ao sincronizar consulta relacional:", consErr);
      }
    }
    return dados;
  } catch (error) {
    console.error("Falha ao salvar sess\xE3o no PostgreSQL:", error);
    throw new Error("Falha ao gravar sess\xE3o no banco de dados relacional.", { cause: error });
  }
}
async function listarSessoesSql(userId) {
  try {
    if (userId && userId !== "especialista_consultorio") {
      return await db.select().from(sessoesBancada).where(or(eq(sessoesBancada.userId, userId), eq(sessoesBancada.userId, "especialista_consultorio"))).orderBy(desc(sessoesBancada.createdAt));
    }
    return await db.select().from(sessoesBancada).orderBy(desc(sessoesBancada.createdAt));
  } catch (error) {
    console.error("Falha ao listar sess\xF5es no PostgreSQL:", error);
    throw new Error("Falha ao buscar sess\xF5es no banco de dados.", { cause: error });
  }
}
async function obterSessaoSql(id) {
  try {
    const res = await db.select().from(sessoesBancada).where(eq(sessoesBancada.id, id)).limit(1);
    return res[0] || null;
  } catch (error) {
    console.error(`Falha ao obter sess\xE3o ${id} no PostgreSQL:`, error);
    throw new Error(`Falha ao recuperar sess\xE3o ${id}.`, { cause: error });
  }
}
async function deletarSessaoSql(id) {
  try {
    await db.delete(consultasPaciente).where(eq(consultasPaciente.sessionId, id));
    await db.delete(sessoesBancada).where(eq(sessoesBancada.id, id));
    return { sucesso: true };
  } catch (error) {
    console.error(`Falha ao deletar sess\xE3o ${id} no PostgreSQL:`, error);
    throw new Error(`Falha ao excluir sess\xE3o ${id}.`, { cause: error });
  }
}

// src/db/pacientes.ts
import { eq as eq2, desc as desc2, or as or2 } from "drizzle-orm";
async function salvarPacienteSql(input) {
  try {
    const agora = (/* @__PURE__ */ new Date()).toISOString();
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
    await db.insert(pacientes).values(dados).onConflictDoUpdate({
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
    console.error("Falha ao salvar paciente no PostgreSQL:", error);
    throw new Error("Falha ao salvar paciente no banco de dados.", { cause: error });
  }
}
async function listarPacientesSql(userId) {
  try {
    if (userId && userId !== "especialista_consultorio") {
      return await db.select().from(pacientes).where(or2(eq2(pacientes.userId, userId), eq2(pacientes.userId, "especialista_consultorio"))).orderBy(desc2(pacientes.createdAt));
    }
    return await db.select().from(pacientes).orderBy(desc2(pacientes.createdAt));
  } catch (error) {
    console.error("Falha ao listar pacientes no PostgreSQL:", error);
    throw new Error("Falha ao listar pacientes do banco de dados.", { cause: error });
  }
}
async function deletarPacienteSql(id) {
  try {
    await db.delete(pacientes).where(eq2(pacientes.id, id));
    return { sucesso: true };
  } catch (error) {
    console.error(`Falha ao excluir paciente ${id} no PostgreSQL:`, error);
    throw new Error(`Falha ao excluir paciente ${id}.`, { cause: error });
  }
}

// src/db/users.ts
import { eq as eq3 } from "drizzle-orm";
async function getOrCreateUser(uid, email, nome) {
  try {
    const agora = (/* @__PURE__ */ new Date()).toISOString();
    const result = await db.insert(users).values({
      uid,
      email,
      nome: nome || email.split("@")[0] || "Profissional",
      createdAt: agora,
      updatedAt: agora
    }).onConflictDoUpdate({
      target: users.uid,
      set: {
        email,
        ...nome ? { nome } : {},
        updatedAt: agora
      }
    }).returning();
    return result[0];
  } catch (error) {
    console.error("Falha ao obter ou criar usu\xE1rio no Cloud SQL:", error);
    throw new Error("Falha ao sincronizar perfil de usu\xE1rio.", { cause: error });
  }
}
async function getUserByUid(uid) {
  try {
    const rows = await db.select().from(users).where(eq3(users.uid, uid)).limit(1);
    return rows[0] || null;
  } catch (error) {
    console.error(`Falha ao buscar usu\xE1rio ${uid} no Cloud SQL:`, error);
    throw new Error("Falha ao consultar usu\xE1rio no banco de dados.", { cause: error });
  }
}

// server.ts
dotenv.config();
var stripeSecretKey = process.env.STRIPE_SECRET_KEY || "";
var stripePublishableKey = process.env.VITE_STRIPE_PUBLISHABLE_KEY || "";
var stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET || "";
function criarInstanciaStripe(chave) {
  if (!chave || chave.trim() === "" || chave.includes("sua_chave_secreta")) return null;
  try {
    return new Stripe(chave.trim(), {
      apiVersion: "2025-01-27.acacia"
    });
  } catch (e) {
    console.warn("\u26A0\uFE0F Erro ao instanciar Stripe com chave fornecida:", e);
    return null;
  }
}
var stripe = criarInstanciaStripe(stripeSecretKey);
function salvarVariaveisNoEnv(vars) {
  const envPath = path.resolve(process.cwd(), ".env");
  let conteudoAtual = "";
  try {
    if (fs.existsSync(envPath)) {
      conteudoAtual = fs.readFileSync(envPath, "utf8");
    }
  } catch (err) {
    console.warn("N\xE3o foi poss\xEDvel ler .env existente, criando novo:", err);
  }
  const linhas = conteudoAtual ? conteudoAtual.split("\n") : [];
  const chavesPendentes = new Set(Object.keys(vars));
  const novasLinhas = linhas.map((linha) => {
    const match = linha.match(/^\s*([A-Za-z_0-9]+)\s*=/);
    if (match && chavesPendentes.has(match[1])) {
      const chave = match[1];
      chavesPendentes.delete(chave);
      return `${chave}="${vars[chave]}"`;
    }
    return linha;
  });
  chavesPendentes.forEach((chave) => {
    novasLinhas.push(`${chave}="${vars[chave]}"`);
  });
  try {
    fs.writeFileSync(envPath, novasLinhas.join("\n").trim() + "\n", "utf8");
  } catch (err) {
    console.error("Erro ao escrever arquivo .env:", err);
  }
}
var app = express();
var PORT = Number(process.env.PORT) || 3e3;
var firebaseAdminInitialized = false;
try {
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    const creds = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    initAdminApp({
      credential: adminCert(creds)
    });
    firebaseAdminInitialized = true;
  } else if (!getAdminApps().length) {
    initAdminApp();
    firebaseAdminInitialized = true;
  } else {
    firebaseAdminInitialized = true;
  }
} catch (e) {
  console.warn("\u26A0\uFE0F Aviso ao inicializar Firebase Admin no servidor (modo fallback ativo):", e);
}
app.post("/api/stripe/webhook", express.raw({ type: "application/json" }), async (req, res) => {
  const webhookSecret = stripeWebhookSecret || process.env.STRIPE_WEBHOOK_SECRET;
  if (stripe && webhookSecret) {
    const sig = req.headers["stripe-signature"];
    try {
      const event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
      if (event.type === "checkout.session.completed") {
        const session = event.data.object;
        const uid = session.metadata?.usuarioUid || session.client_reference_id;
        const planoId = session.metadata?.planoId || "anual";
        const ciclo = session.metadata?.ciclo || "anual";
        console.log("\u2705 Pagamento confirmado via Stripe Checkout:", session.id, { uid, planoId, ciclo });
        if (uid && firebaseAdminInitialized) {
          try {
            const dbAdmin = getAdminFirestore();
            await dbAdmin.collection("usuarios_profissionais").doc(uid).set({
              planoId,
              planoStatus: "ativo",
              planoCiclo: ciclo,
              planoMetodo: session.payment_method_types?.[0] || "stripe",
              planoValidade: ciclo === "anual" ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1e3).toISOString() : new Date(Date.now() + 30 * 24 * 60 * 60 * 1e3).toISOString(),
              stripeCustomerId: typeof session.customer === "string" ? session.customer : void 0,
              stripeSubscriptionId: typeof session.subscription === "string" ? session.subscription : session.id,
              updatedAt: (/* @__PURE__ */ new Date()).toISOString()
            }, { merge: true });
            console.log(`\u2705 Assinatura atualizada no Firestore para usu\xE1rio ${uid}`);
          } catch (fsErr) {
            console.error("Erro ao atualizar usu\xE1rio no Firestore via webhook:", fsErr);
          }
        }
      }
      return res.json({ received: true });
    } catch (err) {
      console.warn("\u26A0\uFE0F Erro ao verificar assinatura do Webhook Stripe:", err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }
  }
  return res.json({ received: true, aviso: "Modo dev/simulado sem valida\xE7\xE3o estrita" });
});
app.use(express.json({ limit: "25mb" }));
app.use(express.urlencoded({ extended: true, limit: "25mb" }));
var geminiApiKey = process.env.GEMINI_API_KEY || "";
var ai = new GoogleGenAI({ apiKey: geminiApiKey });
async function autenticarUsuario(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }
  const token = authHeader.split("Bearer ")[1].trim();
  if (!token) return null;
  try {
    if (firebaseAdminInitialized) {
      const decoded = await getAdminAuth().verifyIdToken(token);
      return { uid: decoded.uid, email: decoded.email };
    }
  } catch (err) {
    console.warn("Aviso ao verificar ID Token com firebase-admin:", err);
  }
  try {
    const parts = token.split(".");
    if (parts.length === 3) {
      const payload = JSON.parse(Buffer.from(parts[1], "base64").toString("utf-8"));
      const uid = payload.user_id || payload.sub;
      if (uid) {
        return { uid, email: payload.email };
      }
    }
  } catch {
  }
  return null;
}
var cacheUsoIa = {};
async function obterUsoMensal(uid, mes) {
  const chave = `${uid}_${mes}`;
  if (firebaseAdminInitialized) {
    try {
      const docSnap = await getAdminFirestore().collection("uso_ia").doc(uid).collection("meses").doc(mes).get();
      if (docSnap.exists) {
        const data = docSnap.data();
        const qtd = data?.quantidade || 0;
        cacheUsoIa[chave] = { usado: qtd, ultimaData: (/* @__PURE__ */ new Date()).toISOString() };
        return qtd;
      }
    } catch (e) {
      console.warn("Aviso ao consultar uso_ia no Firestore:", e);
    }
  }
  return cacheUsoIa[chave]?.usado || 0;
}
async function incrementarUsoMensal(uid, mes, limite) {
  const chave = `${uid}_${mes}`;
  const novoValor = await obterUsoMensal(uid, mes) + 1;
  cacheUsoIa[chave] = { usado: novoValor, ultimaData: (/* @__PURE__ */ new Date()).toISOString() };
  if (firebaseAdminInitialized) {
    try {
      await getAdminFirestore().collection("uso_ia").doc(uid).collection("meses").doc(mes).set({
        uid,
        mes,
        quantidade: novoValor,
        limite,
        atualizadoEm: (/* @__PURE__ */ new Date()).toISOString()
      }, { merge: true });
    } catch (e) {
      console.warn("Aviso ao registrar uso_ia no Firestore:", e);
    }
  }
  return novoValor;
}
app.get("/api/stripe/config", (_req, res) => {
  const isConfigured = !!stripe;
  const isLive = isConfigured && stripeSecretKey.startsWith("sk_live_");
  const appUrl = process.env.APP_URL || `http://localhost:${PORT}`;
  res.json({
    configured: isConfigured,
    publishableKey: stripePublishableKey || process.env.VITE_STRIPE_PUBLISHABLE_KEY || "",
    secretKeyMasked: stripeSecretKey ? `${stripeSecretKey.slice(0, 7)}...${stripeSecretKey.slice(-4)}` : "",
    hasSecretKey: !!stripeSecretKey,
    hasWebhookSecret: !!(stripeWebhookSecret || process.env.STRIPE_WEBHOOK_SECRET),
    webhookUrl: `${appUrl}/api/stripe/webhook`,
    mode: isConfigured ? isLive ? "live" : "test" : "simulator",
    moeda: "BRL",
    metodosPagamento: ["card", "pix"],
    parcelamentoMaximo: 12,
    mensagem: isConfigured ? `Stripe conectado em modo ${isLive ? "PRODU\xC7\xC3O (Live)" : "TESTES (Sandbox)"}.` : "Stripe em modo simulador inteligente. Insira sua STRIPE_SECRET_KEY para ativar pagamentos reais.",
    planos: {
      mensal: {
        id: "mensal",
        nome: "Plano Mensal",
        valorCentavos: 6990,
        // R$ 69,90
        valorFormatado: "R$ 69,90",
        portalPaciente: false
      },
      anual: {
        id: "anual",
        nome: "Plano Anual",
        valorCentavos: 59880,
        // R$ 598,80 (12x de R$ 49,90)
        valorFormatado: "R$ 598,80 (12x de R$ 49,90)",
        portalPaciente: true
      }
    }
  });
});
app.post("/api/stripe/test-connection", async (req, res) => {
  try {
    const { secretKey } = req.body || {};
    const chaveParaTestar = secretKey && secretKey.trim() || stripeSecretKey;
    if (!chaveParaTestar) {
      return res.status(400).json({
        ok: false,
        erro: "Nenhuma chave fornecida ou configurada. Insira uma chave iniciando em sk_test_ ou sk_live_."
      });
    }
    const testStripe = new Stripe(chaveParaTestar.trim(), {
      apiVersion: "2025-01-27.acacia"
    });
    const balance = await testStripe.balance.retrieve();
    const isLive = chaveParaTestar.trim().startsWith("sk_live_");
    return res.json({
      ok: true,
      livemode: balance.livemode || isLive,
      modo: balance.livemode || isLive ? "live" : "test",
      moedasDisponiveis: balance.available?.map((b) => b.currency.toUpperCase()) || ["BRL"],
      mensagem: `Conex\xE3o validada com sucesso! Conta Stripe ativa em modo ${isLive ? "Produ\xE7\xE3o (Live)" : "Testes (Sandbox)"}.`
    });
  } catch (err) {
    console.warn("\u26A0\uFE0F Falha ao testar chave Stripe:", err.message);
    let detalhe = err.message || "Erro de autentica\xE7\xE3o com a Stripe.";
    if (err.type === "StripeAuthenticationError") {
      detalhe = "Chave secreta inv\xE1lida. Verifique os caracteres copiados do painel da Stripe (deve iniciar com sk_test_ ou sk_live_).";
    } else if (err.code === "api_key_expired") {
      detalhe = "Esta chave de API expirou ou foi revogada no painel da Stripe.";
    }
    return res.status(400).json({
      ok: false,
      erro: detalhe
    });
  }
});
app.post("/api/stripe/save-config", async (req, res) => {
  try {
    const { secretKey, publishableKey, webhookSecret } = req.body || {};
    const novaSecretKey = typeof secretKey === "string" ? secretKey.trim() : stripeSecretKey;
    const novaPubKey = typeof publishableKey === "string" ? publishableKey.trim() : stripePublishableKey;
    const novoWebhook = typeof webhookSecret === "string" ? webhookSecret.trim() : stripeWebhookSecret;
    if (novaSecretKey && !novaSecretKey.includes("sua_chave_secreta")) {
      try {
        const testStripe = new Stripe(novaSecretKey, {
          apiVersion: "2025-01-27.acacia"
        });
        await testStripe.balance.retrieve();
      } catch (err) {
        let msg = err.message || "Chave da Stripe inv\xE1lida.";
        if (err.type === "StripeAuthenticationError") {
          msg = "Chave secreta inv\xE1lida. N\xE3o foi poss\xEDvel autenticar na API da Stripe. Verifique a chave sk_test_ ou sk_live_.";
        }
        return res.status(400).json({
          ok: false,
          erro: msg
        });
      }
    }
    stripeSecretKey = novaSecretKey;
    stripePublishableKey = novaPubKey;
    stripeWebhookSecret = novoWebhook;
    process.env.STRIPE_SECRET_KEY = novaSecretKey;
    if (novaPubKey) process.env.VITE_STRIPE_PUBLISHABLE_KEY = novaPubKey;
    if (novoWebhook) process.env.STRIPE_WEBHOOK_SECRET = novoWebhook;
    stripe = criarInstanciaStripe(novaSecretKey);
    const vars = {
      STRIPE_SECRET_KEY: novaSecretKey
    };
    if (novaPubKey) vars.VITE_STRIPE_PUBLISHABLE_KEY = novaPubKey;
    if (novoWebhook) vars.STRIPE_WEBHOOK_SECRET = novoWebhook;
    salvarVariaveisNoEnv(vars);
    const isConfigured = !!stripe;
    const isLive = isConfigured && stripeSecretKey.startsWith("sk_live_");
    console.log(`\u2705 Configura\xE7\xF5es Stripe salvas! Modo: ${isConfigured ? isLive ? "Live" : "Testes" : "Simulador"}`);
    return res.json({
      ok: true,
      configurado: isConfigured,
      modo: isConfigured ? isLive ? "live" : "test" : "simulator",
      mensagem: isConfigured ? `Stripe configurado e ativado com sucesso em modo ${isLive ? "PRODU\xC7\xC3O (Live)" : "TESTES (Sandbox)"}!` : "Configura\xE7\xE3o redefinida para modo Simulador/Sandbox inteligente."
    });
  } catch (err) {
    console.error("Erro ao salvar configura\xE7\xE3o Stripe:", err);
    return res.status(500).json({
      ok: false,
      erro: err.message || "Falha ao salvar configura\xE7\xF5es do Stripe."
    });
  }
});
app.post("/api/stripe/create-checkout-session", async (req, res) => {
  try {
    const {
      planoId,
      metodoPagamento = "all",
      usuarioUid,
      usuarioEmail,
      usuarioNome
    } = req.body;
    const isAnual = planoId === "anual";
    const valorCentavos = isAnual ? 59880 : 6990;
    const nomePlano = isAnual ? "TricoCalazans \u2014 Plano Cl\xEDnico Anual" : "TricoCalazans \u2014 Plano Cl\xEDnico Mensal";
    const descricaoPlano = isAnual ? "Acesso completo por 1 ano + Envio de Acesso ao Portal do Paciente + Atlas HD" : "Acesso completo por 30 dias + Atlas HD (Sem Portal do Paciente)";
    const appUrl = process.env.APP_URL || `http://localhost:${PORT}`;
    if (stripe) {
      const paymentMethodTypes = metodoPagamento === "pix" || metodoPagamento === "all" ? ["card", "pix"] : ["card"];
      const sessionParams = {
        payment_method_types: paymentMethodTypes,
        mode: "payment",
        customer_email: usuarioEmail || void 0,
        client_reference_id: usuarioUid || void 0,
        line_items: [
          {
            price_data: {
              currency: "brl",
              product_data: {
                name: nomePlano,
                description: descricaoPlano,
                metadata: {
                  planoId: isAnual ? "anual" : "mensal",
                  portalPaciente: isAnual ? "true" : "false"
                }
              },
              unit_amount: valorCentavos
            },
            quantity: 1
          }
        ],
        metadata: {
          usuarioUid: usuarioUid || "",
          usuarioEmail: usuarioEmail || "",
          usuarioNome: usuarioNome || "",
          planoId: isAnual ? "anual" : "mensal",
          ciclo: isAnual ? "anual" : "mensal",
          portalPaciente: isAnual ? "true" : "false"
        },
        success_url: `${appUrl}?stripe_status=sucesso&session_id={CHECKOUT_SESSION_ID}&plano=${isAnual ? "anual" : "mensal"}`,
        cancel_url: `${appUrl}?stripe_status=cancelado`
      };
      const session = await stripe.checkout.sessions.create(sessionParams);
      return res.json({
        sucesso: true,
        sessionId: session.id,
        url: session.url,
        modo: "stripe_oficial"
      });
    }
    const simulatedSessionId = `cs_test_${Math.random().toString(36).substring(2, 15)}_${Date.now()}`;
    const codigoPixSimulado = `00020126580014br.gov.bcb.pix0136${Math.random().toString(36).substring(2, 14)}-tricocalazans520400005303986540${(valorCentavos / 100).toFixed(2)}5802BR5925TRICOCALAZANS DIGITAL6009SAO PAULO62070503***6304`;
    return res.json({
      sucesso: true,
      sessionId: simulatedSessionId,
      modo: "stripe_sandbox",
      plano: {
        id: isAnual ? "anual" : "mensal",
        nome: nomePlano,
        valorTotal: valorCentavos / 100,
        portalPaciente: isAnual
      },
      pix: {
        codigoCopiaECola: codigoPixSimulado,
        expiracaoMinutos: 30
      },
      aviso: "Chave STRIPE_SECRET_KEY n\xE3o detectada nas vari\xE1veis de ambiente. Simula\xE7\xE3o de checkout Stripe ativa com sucesso."
    });
  } catch (error) {
    console.error("Erro ao criar sess\xE3o de checkout Stripe:", error);
    return res.status(500).json({
      sucesso: false,
      erro: error.message || "Falha ao processar checkout Stripe"
    });
  }
});
app.post("/api/stripe/verify-session", async (req, res) => {
  try {
    const { sessionId, usuarioUid } = req.body;
    if (!sessionId) {
      return res.status(400).json({ sucesso: false, erro: "Session ID \xE9 obrigat\xF3rio." });
    }
    if (stripe) {
      const session = await stripe.checkout.sessions.retrieve(sessionId);
      const isPago = session.payment_status === "paid" || session.status === "complete";
      const planoId = session.metadata?.planoId || "anual";
      const ciclo = session.metadata?.ciclo || "anual";
      const uid = usuarioUid || session.metadata?.usuarioUid || session.client_reference_id;
      if (isPago && uid && firebaseAdminInitialized) {
        try {
          const dbAdmin = getAdminFirestore();
          await dbAdmin.collection("usuarios_profissionais").doc(uid).set({
            planoId,
            planoStatus: "ativo",
            planoCiclo: ciclo,
            planoMetodo: session.payment_method_types?.[0] || "stripe",
            planoValidade: ciclo === "anual" ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1e3).toISOString() : new Date(Date.now() + 30 * 24 * 60 * 60 * 1e3).toISOString(),
            stripeCustomerId: typeof session.customer === "string" ? session.customer : void 0,
            stripeSubscriptionId: typeof session.subscription === "string" ? session.subscription : session.id,
            updatedAt: (/* @__PURE__ */ new Date()).toISOString()
          }, { merge: true });
          console.log(`\u2705 Sess\xE3o ${sessionId} validada e plano atualizado no Firestore para ${uid}`);
        } catch (fsErr) {
          console.error("Aviso ao sincronizar plano no Firestore:", fsErr);
        }
      }
      return res.json({
        sucesso: true,
        pago: isPago,
        planoId,
        ciclo,
        sessionId: session.id,
        customerId: session.customer
      });
    }
    return res.json({
      sucesso: true,
      pago: true,
      planoId: "anual",
      ciclo: "anual",
      modo: "sandbox"
    });
  } catch (err) {
    console.error("Erro ao verificar sess\xE3o Stripe:", err);
    return res.status(500).json({
      sucesso: false,
      erro: err.message || "Erro ao validar sess\xE3o Stripe"
    });
  }
});
app.post("/api/stripe/create-portal-session", async (req, res) => {
  try {
    const { customerId } = req.body;
    const appUrl = process.env.APP_URL || `http://localhost:${PORT}`;
    if (stripe && customerId) {
      const portalSession = await stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: `${appUrl}?tela=planos`
      });
      return res.json({ sucesso: true, url: portalSession.url });
    }
    return res.status(400).json({
      sucesso: false,
      erro: "Stripe ou ID de cliente n\xE3o configurado."
    });
  } catch (err) {
    console.error("Erro ao criar portal session:", err);
    return res.status(500).json({ sucesso: false, erro: err.message });
  }
});
app.get("/api/sessoes", async (req, res) => {
  try {
    const userId = req.query.userId || void 0;
    const sessoes = await listarSessoesSql(userId);
    return res.json({ sucesso: true, sessoes });
  } catch (error) {
    console.error("Erro na rota GET /api/sessoes:", error);
    return res.status(500).json({ sucesso: false, erro: error.message || "Falha ao buscar sess\xF5es." });
  }
});
app.get("/api/sessoes/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const sessao = await obterSessaoSql(id);
    if (!sessao) {
      return res.status(404).json({ sucesso: false, erro: "Sess\xE3o n\xE3o encontrada." });
    }
    return res.json({ sucesso: true, sessao });
  } catch (error) {
    console.error(`Erro na rota GET /api/sessoes/${req.params.id}:`, error);
    return res.status(500).json({ sucesso: false, erro: error.message || "Falha ao buscar sess\xE3o." });
  }
});
app.post("/api/sessoes", async (req, res) => {
  try {
    const payload = req.body;
    if (!payload || !payload.id || !payload.imageUrl) {
      return res.status(400).json({ sucesso: false, erro: "Dados incompletos da sess\xE3o." });
    }
    const gravado = await salvarSessaoSql(payload);
    return res.json({ sucesso: true, sessao: gravado });
  } catch (error) {
    console.error("Erro na rota POST /api/sessoes:", error);
    return res.status(500).json({ sucesso: false, erro: error.message || "Falha ao salvar sess\xE3o." });
  }
});
app.delete("/api/sessoes/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await deletarSessaoSql(id);
    return res.json({ sucesso: true });
  } catch (error) {
    console.error(`Erro na rota DELETE /api/sessoes/${req.params.id}:`, error);
    return res.status(500).json({ sucesso: false, erro: error.message || "Falha ao remover sess\xE3o." });
  }
});
app.get("/api/pacientes", async (req, res) => {
  try {
    const userId = req.query.userId || void 0;
    const lista = await listarPacientesSql(userId);
    return res.json({ sucesso: true, pacientes: lista });
  } catch (error) {
    console.error("Erro na rota GET /api/pacientes:", error);
    return res.status(500).json({ sucesso: false, erro: error.message || "Falha ao buscar pacientes." });
  }
});
app.post("/api/pacientes", async (req, res) => {
  try {
    const payload = req.body;
    if (!payload || !payload.id || !payload.nome) {
      return res.status(400).json({ sucesso: false, erro: "Dados incompletos do paciente." });
    }
    const gravado = await salvarPacienteSql(payload);
    return res.json({ sucesso: true, paciente: gravado });
  } catch (error) {
    console.error("Erro na rota POST /api/pacientes:", error);
    return res.status(500).json({ sucesso: false, erro: error.message || "Falha ao salvar paciente." });
  }
});
app.delete("/api/pacientes/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await deletarPacienteSql(id);
    return res.json({ sucesso: true });
  } catch (error) {
    console.error(`Erro na rota DELETE /api/pacientes/${req.params.id}:`, error);
    return res.status(500).json({ sucesso: false, erro: error.message || "Falha ao excluir paciente." });
  }
});
app.post("/api/users/sync", async (req, res) => {
  try {
    const { uid, email, nome } = req.body || {};
    if (!uid || !email) {
      return res.status(400).json({ sucesso: false, erro: "UID e email s\xE3o obrigat\xF3rios." });
    }
    const usuario = await getOrCreateUser(uid, email, nome);
    return res.json({ sucesso: true, usuario });
  } catch (error) {
    console.error("Erro na rota POST /api/users/sync:", error);
    return res.status(500).json({ sucesso: false, erro: error.message || "Falha ao sincronizar usu\xE1rio." });
  }
});
app.get("/api/users/:uid", async (req, res) => {
  try {
    const { uid } = req.params;
    const usuario = await getUserByUid(uid);
    if (!usuario) {
      return res.status(404).json({ sucesso: false, erro: "Usu\xE1rio n\xE3o encontrado." });
    }
    return res.json({ sucesso: true, usuario });
  } catch (error) {
    console.error(`Erro na rota GET /api/users/${req.params.uid}:`, error);
    return res.status(500).json({ sucesso: false, erro: error.message || "Falha ao buscar usu\xE1rio." });
  }
});
app.get("/api/exames/uso-ia", async (req, res) => {
  try {
    const usuario = await autenticarUsuario(req);
    if (!usuario) {
      return res.status(401).json({ sucesso: false, erro: "Usu\xE1rio n\xE3o autenticado." });
    }
    const mesAtual = (/* @__PURE__ */ new Date()).toISOString().substring(0, 7);
    const usado = await obterUsoMensal(usuario.uid, mesAtual);
    const limite = 40;
    return res.json({
      sucesso: true,
      usado,
      limite,
      mes: mesAtual
    });
  } catch (err) {
    console.error("Erro ao consultar uso_ia:", err);
    return res.status(500).json({ sucesso: false, erro: err.message || "Falha ao consultar uso da IA" });
  }
});
app.post("/api/exames/transcrever-laudo", async (req, res) => {
  try {
    const usuario = await autenticarUsuario(req);
    if (!usuario) {
      return res.status(401).json({
        sucesso: false,
        erro: "Autentica\xE7\xE3o necess\xE1ria. Fa\xE7a login para utilizar a leitura de laudos por IA."
      });
    }
    let planoUsuario = req.body.planoId || "master";
    let statusUsuario = req.body.planoStatus || "trial";
    if (firebaseAdminInitialized) {
      try {
        const userDoc = await getAdminFirestore().collection("usuarios_profissionais").doc(usuario.uid).get();
        if (userDoc.exists) {
          const uData = userDoc.data();
          if (uData?.planoId) planoUsuario = uData.planoId;
          if (uData?.planoStatus) statusUsuario = uData.planoStatus;
        }
      } catch (e) {
        console.warn("Aviso ao consultar perfil do usu\xE1rio no Firestore:", e);
      }
    }
    if (!temPermissaoExamesIa(planoUsuario, statusUsuario)) {
      return res.status(403).json({
        sucesso: false,
        erro: "A transcri\xE7\xE3o autom\xE1tica por IA \xE9 exclusiva a partir do Plano Master. Fa\xE7a upgrade para desbloquear."
      });
    }
    const mesAtual = (/* @__PURE__ */ new Date()).toISOString().substring(0, 7);
    const limite = obterLimiteMensalIa(planoUsuario, statusUsuario);
    const usado = await obterUsoMensal(usuario.uid, mesAtual);
    if (limite > 0 && usado >= limite) {
      return res.status(429).json({
        sucesso: false,
        erro: `Limite mensal de leituras de laudo por IA atingido (${usado}/${limite}). O lan\xE7amento manual continua dispon\xEDvel.`
      });
    }
    const { arquivoBase64, mimeType = "application/pdf" } = req.body;
    if (!arquivoBase64 || typeof arquivoBase64 !== "string") {
      return res.status(400).json({
        sucesso: false,
        erro: "Arquivo do laudo n\xE3o enviado ou formato inv\xE1lido."
      });
    }
    const base64Limpo = arquivoBase64.includes(";base64,") ? arquivoBase64.split(";base64,")[1] : arquivoBase64;
    if (!geminiApiKey && !process.env.GEMINI_API_KEY) {
      return res.status(500).json({
        sucesso: false,
        erro: "Chave GEMINI_API_KEY n\xE3o configurada no servidor. Configure a vari\xE1vel de ambiente para habilitar a IA."
      });
    }
    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents: [
        {
          role: "user",
          parts: [
            { text: INSTRUCAO_SISTEMA_TRANSCRICAO_LAUDO },
            {
              inlineData: {
                data: base64Limpo,
                mimeType
              }
            }
          ]
        }
      ],
      config: {
        responseMimeType: "application/json"
      }
    });
    const respostaTexto = response.text || "";
    if (!respostaTexto.trim()) {
      return res.status(502).json({
        sucesso: false,
        erro: "A IA n\xE3o retornou dados para este documento. Verifique a nitidez do arquivo."
      });
    }
    let dadosJson;
    try {
      dadosJson = JSON.parse(respostaTexto);
    } catch {
      const semMarkdown = respostaTexto.replace(/^```json\s*/i, "").replace(/```\s*$/i, "").trim();
      dadosJson = JSON.parse(semMarkdown);
    }
    if (!dadosJson || !Array.isArray(dadosJson.itens)) {
      return res.status(502).json({
        sucesso: false,
        erro: "Formato de resposta inesperado da IA. Tente novamente ou use o lan\xE7amento manual.",
        respostaBruta: respostaTexto
      });
    }
    const itensValidados = dadosJson.itens.map((it, index) => ({
      id: `item_${Date.now()}_${index}`,
      marcador: String(it.marcador || "Exame sem nome").trim(),
      valor: String(it.valor || "").trim(),
      valorNumerico: typeof it.valorNumerico === "number" ? it.valorNumerico : null,
      unidade: String(it.unidade || "").trim(),
      referenciaTexto: it.referenciaTexto ? String(it.referenciaTexto).trim() : "",
      referenciaMinima: typeof it.referenciaMinima === "number" ? it.referenciaMinima : null,
      referenciaMaxima: typeof it.referenciaMaxima === "number" ? it.referenciaMaxima : null,
      categoria: it.categoriaSugerida || "Outros",
      incerto: Boolean(it.incerto)
    }));
    const novoUsado = await incrementarUsoMensal(usuario.uid, mesAtual, limite);
    return res.json({
      sucesso: true,
      dados: {
        laboratorio: dadosJson.laboratorio || "",
        dataColeta: dadosJson.dataColeta || "",
        itens: itensValidados
      },
      respostaBruta: respostaTexto,
      usoAtual: {
        usado: novoUsado,
        limite,
        mes: mesAtual
      }
    });
  } catch (error) {
    console.error("Erro na transcri\xE7\xE3o de laudo com IA:", error);
    return res.status(500).json({
      sucesso: false,
      erro: error.message || "Erro interno ao processar laudo com IA"
    });
  }
});
async function startServer() {
  const isProduction = process.env.NODE_ENV === "production";
  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static("dist"));
    app.get("*", (_req, res) => {
      res.sendFile("dist/index.html", { root: "." });
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`\u{1F680} TricoCalazans rodando em http://0.0.0.0:${PORT}`);
  });
}
startServer();
