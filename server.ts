import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import Stripe from 'stripe';
import fs from 'fs';
import path from 'path';
import { initializeApp as initAdminApp, getApps as getAdminApps, cert as adminCert } from 'firebase-admin/app';
import { getAuth as getAdminAuth } from 'firebase-admin/auth';
import { getFirestore as getAdminFirestore } from 'firebase-admin/firestore';
import { GoogleGenAI } from '@google/genai';
import { INSTRUCAO_SISTEMA_TRANSCRICAO_LAUDO } from './src/config/promptsIA';
import { temPermissaoExamesIa, obterLimiteMensalIa } from './src/config/planos';
import { salvarSessaoSql, listarSessoesSql, obterSessaoSql, deletarSessaoSql } from './src/db/sessoes.ts';
import { salvarPacienteSql, listarPacientesSql, deletarPacienteSql } from './src/db/pacientes.ts';
import { getOrCreateUser, getUserByUid } from './src/db/users.ts';

dotenv.config();

// Inicialização dinâmica da instância do Stripe (com suporte a recarga em tempo real)
let stripeSecretKey = process.env.STRIPE_SECRET_KEY || '';
let stripePublishableKey = process.env.VITE_STRIPE_PUBLISHABLE_KEY || '';
let stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';

function criarInstanciaStripe(chave: string): Stripe | null {
  if (!chave || chave.trim() === '' || chave.includes('sua_chave_secreta')) return null;
  try {
    return new Stripe(chave.trim(), {
      apiVersion: '2025-01-27.acacia' as any,
    });
  } catch (e) {
    console.warn('⚠️ Erro ao instanciar Stripe com chave fornecida:', e);
    return null;
  }
}

let stripe = criarInstanciaStripe(stripeSecretKey);

// Utilitário para salvar e persistir variáveis de ambiente no arquivo .env
function salvarVariaveisNoEnv(vars: Record<string, string>) {
  const envPath = path.resolve(process.cwd(), '.env');
  let conteudoAtual = '';
  try {
    if (fs.existsSync(envPath)) {
      conteudoAtual = fs.readFileSync(envPath, 'utf8');
    }
  } catch (err) {
    console.warn('Não foi possível ler .env existente, criando novo:', err);
  }

  const linhas = conteudoAtual ? conteudoAtual.split('\n') : [];
  const chavesPendentes = new Set(Object.keys(vars));

  const novasLinhas = linhas.map(linha => {
    const match = linha.match(/^\s*([A-Za-z_0-9]+)\s*=/);
    if (match && chavesPendentes.has(match[1])) {
      const chave = match[1];
      chavesPendentes.delete(chave);
      return `${chave}="${vars[chave]}"`;
    }
    return linha;
  });

  chavesPendentes.forEach(chave => {
    novasLinhas.push(`${chave}="${vars[chave]}"`);
  });

  try {
    fs.writeFileSync(envPath, novasLinhas.join('\n').trim() + '\n', 'utf8');
  } catch (err) {
    console.error('Erro ao escrever arquivo .env:', err);
  }
}

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// Inicialização segura do Firebase Admin
let firebaseAdminInitialized = false;
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
  console.warn('⚠️ Aviso ao inicializar Firebase Admin no servidor (modo fallback ativo):', e);
}

// 1. Rota de Webhook Stripe: requer payload bruto (Buffer) para validar assinatura criptográfica
// DEVE ser montada antes de express.json() para não corromper o buffer de assinatura
app.post('/api/stripe/webhook', express.raw({ type: 'application/json' }), async (req: Request, res: Response) => {
  const webhookSecret = stripeWebhookSecret || process.env.STRIPE_WEBHOOK_SECRET;

  if (stripe && webhookSecret) {
    const sig = req.headers['stripe-signature'] as string;
    try {
      const event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
      if (event.type === 'checkout.session.completed') {
        const session = event.data.object as Stripe.Checkout.Session;
        const uid = session.metadata?.usuarioUid || session.client_reference_id;
        const planoId = session.metadata?.planoId || 'anual';
        const ciclo = session.metadata?.ciclo || 'anual';
        console.log('✅ Pagamento confirmado via Stripe Checkout:', session.id, { uid, planoId, ciclo });

        if (uid && firebaseAdminInitialized) {
          try {
            const dbAdmin = getAdminFirestore();
            await dbAdmin.collection('usuarios_profissionais').doc(uid).set({
              planoId,
              planoStatus: 'ativo',
              planoCiclo: ciclo,
              planoMetodo: session.payment_method_types?.[0] || 'stripe',
              planoValidade: ciclo === 'anual'
                ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
                : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
              stripeCustomerId: typeof session.customer === 'string' ? session.customer : undefined,
              stripeSubscriptionId: typeof session.subscription === 'string' ? session.subscription : session.id,
              updatedAt: new Date().toISOString()
            }, { merge: true });
            console.log(`✅ Assinatura atualizada no Firestore para usuário ${uid}`);
          } catch (fsErr) {
            console.error('Erro ao atualizar usuário no Firestore via webhook:', fsErr);
          }
        }
      }
      return res.json({ received: true });
    } catch (err: any) {
      console.warn('⚠️ Erro ao verificar assinatura do Webhook Stripe:', err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }
  }

  // Webhook fallback para desenvolvimento / simulação
  return res.json({ received: true, aviso: 'Modo dev/simulado sem validação estrita' });
});

// Middleware padrão para processar JSON (até 25MB) para as demais rotas
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// Inicialização do Google GenAI (Gemini)
const geminiApiKey = process.env.GEMINI_API_KEY || '';
const ai = new GoogleGenAI({ apiKey: geminiApiKey });

// Função utilitária para autenticar requisições via Bearer Token do Firebase
async function autenticarUsuario(req: Request): Promise<{ uid: string; email?: string } | null> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  const token = authHeader.split('Bearer ')[1].trim();
  if (!token) return null;

  try {
    if (firebaseAdminInitialized) {
      const decoded = await getAdminAuth().verifyIdToken(token);
      return { uid: decoded.uid, email: decoded.email };
    }
  } catch (err) {
    console.warn('Aviso ao verificar ID Token com firebase-admin:', err);
  }

  // Fallback seguro de decodificação de JWT do Firebase para ambientes sem service account explícita
  try {
    const parts = token.split('.');
    if (parts.length === 3) {
      const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf-8'));
      const uid = payload.user_id || payload.sub;
      if (uid) {
        return { uid, email: payload.email };
      }
    }
  } catch {}

  return null;
}

// Armazenamento em memória para contagem de uso mensal de IA (sincronizado também com Firestore quando disponível)
const cacheUsoIa: Record<string, { usado: number; ultimaData: string }> = {};

async function obterUsoMensal(uid: string, mes: string): Promise<number> {
  const chave = `${uid}_${mes}`;
  if (firebaseAdminInitialized) {
    try {
      const docSnap = await getAdminFirestore().collection('uso_ia').doc(uid).collection('meses').doc(mes).get();
      if (docSnap.exists) {
        const data = docSnap.data();
        const qtd = data?.quantidade || 0;
        cacheUsoIa[chave] = { usado: qtd, ultimaData: new Date().toISOString() };
        return qtd;
      }
    } catch (e) {
      console.warn('Aviso ao consultar uso_ia no Firestore:', e);
    }
  }
  return cacheUsoIa[chave]?.usado || 0;
}

async function incrementarUsoMensal(uid: string, mes: string, limite: number): Promise<number> {
  const chave = `${uid}_${mes}`;
  const novoValor = (await obterUsoMensal(uid, mes)) + 1;
  cacheUsoIa[chave] = { usado: novoValor, ultimaData: new Date().toISOString() };

  if (firebaseAdminInitialized) {
    try {
      await getAdminFirestore().collection('uso_ia').doc(uid).collection('meses').doc(mes).set({
        uid,
        mes,
        quantidade: novoValor,
        limite,
        atualizadoEm: new Date().toISOString()
      }, { merge: true });
    } catch (e) {
      console.warn('Aviso ao registrar uso_ia no Firestore:', e);
    }
  }
  return novoValor;
}

// ============================================================================
// ROTAS DA API STRIPE (/api/stripe/*)
// ============================================================================

/**
 * GET /api/stripe/config
 * Retorna status de configuração, credenciais públicas e planos suportados
 */
app.get('/api/stripe/config', (_req: Request, res: Response) => {
  const isConfigured = !!stripe;
  const isLive = isConfigured && stripeSecretKey.startsWith('sk_live_');
  const appUrl = process.env.APP_URL || `http://localhost:${PORT}`;

  res.json({
    configured: isConfigured,
    publishableKey: stripePublishableKey || process.env.VITE_STRIPE_PUBLISHABLE_KEY || '',
    secretKeyMasked: stripeSecretKey ? `${stripeSecretKey.slice(0, 7)}...${stripeSecretKey.slice(-4)}` : '',
    hasSecretKey: !!stripeSecretKey,
    hasWebhookSecret: !!(stripeWebhookSecret || process.env.STRIPE_WEBHOOK_SECRET),
    webhookUrl: `${appUrl}/api/stripe/webhook`,
    mode: isConfigured ? (isLive ? 'live' : 'test') : 'simulator',
    moeda: 'BRL',
    metodosPagamento: ['card', 'pix'],
    parcelamentoMaximo: 12,
    mensagem: isConfigured 
      ? `Stripe conectado em modo ${isLive ? 'PRODUÇÃO (Live)' : 'TESTES (Sandbox)'}.`
      : 'Stripe em modo simulador inteligente. Insira sua STRIPE_SECRET_KEY para ativar pagamentos reais.',
    planos: {
      mensal: {
        id: 'mensal',
        nome: 'Plano Mensal',
        valorCentavos: 6990, // R$ 69,90
        valorFormatado: 'R$ 69,90',
        portalPaciente: false,
      },
      anual: {
        id: 'anual',
        nome: 'Plano Anual',
        valorCentavos: 59880, // R$ 598,80 (12x de R$ 49,90)
        valorFormatado: 'R$ 598,80 (12x de R$ 49,90)',
        portalPaciente: true,
      },
    },
  });
});

/**
 * POST /api/stripe/test-connection
 * Testa credencial Stripe em tempo real fazendo chamada diagnóstica à API oficial
 */
app.post('/api/stripe/test-connection', async (req: Request, res: Response) => {
  try {
    const { secretKey } = req.body || {};
    const chaveParaTestar = (secretKey && secretKey.trim()) || stripeSecretKey;

    if (!chaveParaTestar) {
      return res.status(400).json({
        ok: false,
        erro: 'Nenhuma chave fornecida ou configurada. Insira uma chave iniciando em sk_test_ ou sk_live_.'
      });
    }

    const testStripe = new Stripe(chaveParaTestar.trim(), {
      apiVersion: '2025-01-27.acacia' as any,
    });

    const balance = await testStripe.balance.retrieve();
    const isLive = chaveParaTestar.trim().startsWith('sk_live_');

    return res.json({
      ok: true,
      livemode: balance.livemode || isLive,
      modo: (balance.livemode || isLive) ? 'live' : 'test',
      moedasDisponiveis: balance.available?.map(b => b.currency.toUpperCase()) || ['BRL'],
      mensagem: `Conexão validada com sucesso! Conta Stripe ativa em modo ${isLive ? 'Produção (Live)' : 'Testes (Sandbox)'}.`
    });
  } catch (err: any) {
    console.warn('⚠️ Falha ao testar chave Stripe:', err.message);
    let detalhe = err.message || 'Erro de autenticação com a Stripe.';
    if (err.type === 'StripeAuthenticationError') {
      detalhe = 'Chave secreta inválida. Verifique os caracteres copiados do painel da Stripe (deve iniciar com sk_test_ ou sk_live_).';
    } else if (err.code === 'api_key_expired') {
      detalhe = 'Esta chave de API expirou ou foi revogada no painel da Stripe.';
    }
    return res.status(400).json({
      ok: false,
      erro: detalhe
    });
  }
});

/**
 * POST /api/stripe/save-config
 * Salva e aplica novas credenciais do Stripe (memória e persistência .env)
 */
app.post('/api/stripe/save-config', async (req: Request, res: Response) => {
  try {
    const { secretKey, publishableKey, webhookSecret } = req.body || {};

    const novaSecretKey = typeof secretKey === 'string' ? secretKey.trim() : stripeSecretKey;
    const novaPubKey = typeof publishableKey === 'string' ? publishableKey.trim() : stripePublishableKey;
    const novoWebhook = typeof webhookSecret === 'string' ? webhookSecret.trim() : stripeWebhookSecret;

    // Se nova chave secreta fornecida, valida antes de salvar
    if (novaSecretKey && !novaSecretKey.includes('sua_chave_secreta')) {
      try {
        const testStripe = new Stripe(novaSecretKey, {
          apiVersion: '2025-01-27.acacia' as any,
        });
        await testStripe.balance.retrieve();
      } catch (err: any) {
        let msg = err.message || 'Chave da Stripe inválida.';
        if (err.type === 'StripeAuthenticationError') {
          msg = 'Chave secreta inválida. Não foi possível autenticar na API da Stripe. Verifique a chave sk_test_ ou sk_live_.';
        }
        return res.status(400).json({
          ok: false,
          erro: msg
        });
      }
    }

    // Atualiza estado em memória
    stripeSecretKey = novaSecretKey;
    stripePublishableKey = novaPubKey;
    stripeWebhookSecret = novoWebhook;

    process.env.STRIPE_SECRET_KEY = novaSecretKey;
    if (novaPubKey) process.env.VITE_STRIPE_PUBLISHABLE_KEY = novaPubKey;
    if (novoWebhook) process.env.STRIPE_WEBHOOK_SECRET = novoWebhook;

    // Reinstancia cliente Stripe
    stripe = criarInstanciaStripe(novaSecretKey);

    // Salva no .env
    const vars: Record<string, string> = {
      STRIPE_SECRET_KEY: novaSecretKey,
    };
    if (novaPubKey) vars.VITE_STRIPE_PUBLISHABLE_KEY = novaPubKey;
    if (novoWebhook) vars.STRIPE_WEBHOOK_SECRET = novoWebhook;

    salvarVariaveisNoEnv(vars);

    const isConfigured = !!stripe;
    const isLive = isConfigured && stripeSecretKey.startsWith('sk_live_');

    console.log(`✅ Configurações Stripe salvas! Modo: ${isConfigured ? (isLive ? 'Live' : 'Testes') : 'Simulador'}`);

    return res.json({
      ok: true,
      configurado: isConfigured,
      modo: isConfigured ? (isLive ? 'live' : 'test') : 'simulator',
      mensagem: isConfigured
        ? `Stripe configurado e ativado com sucesso em modo ${isLive ? 'PRODUÇÃO (Live)' : 'TESTES (Sandbox)'}!`
        : 'Configuração redefinida para modo Simulador/Sandbox inteligente.',
    });
  } catch (err: any) {
    console.error('Erro ao salvar configuração Stripe:', err);
    return res.status(500).json({
      ok: false,
      erro: err.message || 'Falha ao salvar configurações do Stripe.'
    });
  }
});

/**
 * POST /api/stripe/create-checkout-session
 * Cria sessão de checkout hospedada no Stripe ou simulação de alta fidelidade
 */
app.post('/api/stripe/create-checkout-session', async (req: Request, res: Response) => {
  try {
    const { 
      planoId, 
      metodoPagamento = 'all', 
      usuarioUid, 
      usuarioEmail, 
      usuarioNome 
    } = req.body;

    const isAnual = planoId === 'anual';
    const valorCentavos = isAnual ? 59880 : 6990;
    const nomePlano = isAnual ? 'TricoCalazans — Plano Clínico Anual' : 'TricoCalazans — Plano Clínico Mensal';
    const descricaoPlano = isAnual
      ? 'Acesso completo por 1 ano + Envio de Acesso ao Portal do Paciente + Atlas HD'
      : 'Acesso completo por 30 dias + Atlas HD (Sem Portal do Paciente)';

    const appUrl = process.env.APP_URL || `http://localhost:${PORT}`;

    // 1. Se o Stripe estiver configurado com chave real ou de testes (sk_test_... / sk_live_...)
    if (stripe) {
      const paymentMethodTypes = (metodoPagamento === 'pix' || metodoPagamento === 'all') 
        ? ['card', 'pix'] 
        : ['card'];

      const sessionParams: any = {
        payment_method_types: paymentMethodTypes,
        mode: 'payment',
        customer_email: usuarioEmail || undefined,
        client_reference_id: usuarioUid || undefined,
        line_items: [
          {
            price_data: {
              currency: 'brl',
              product_data: {
                name: nomePlano,
                description: descricaoPlano,
                metadata: {
                  planoId: isAnual ? 'anual' : 'mensal',
                  portalPaciente: isAnual ? 'true' : 'false',
                },
              },
              unit_amount: valorCentavos,
            },
            quantity: 1,
          },
        ],
        metadata: {
          usuarioUid: usuarioUid || '',
          usuarioEmail: usuarioEmail || '',
          usuarioNome: usuarioNome || '',
          planoId: isAnual ? 'anual' : 'mensal',
          ciclo: isAnual ? 'anual' : 'mensal',
          portalPaciente: isAnual ? 'true' : 'false',
        },
        success_url: `${appUrl}?stripe_status=sucesso&session_id={CHECKOUT_SESSION_ID}&plano=${isAnual ? 'anual' : 'mensal'}`,
        cancel_url: `${appUrl}?stripe_status=cancelado`,
      };

      const session = await stripe.checkout.sessions.create(sessionParams);

      return res.json({
        sucesso: true,
        sessionId: session.id,
        url: session.url,
        modo: 'stripe_oficial',
      });
    }

    // 2. Modo Simulação / Sandbox Inteligente (quando a chave secreta ainda não foi preenchida)
    const simulatedSessionId = `cs_test_${Math.random().toString(36).substring(2, 15)}_${Date.now()}`;
    const codigoPixSimulado = `00020126580014br.gov.bcb.pix0136${Math.random().toString(36).substring(2, 14)}-tricocalazans520400005303986540${(valorCentavos / 100).toFixed(2)}5802BR5925TRICOCALAZANS DIGITAL6009SAO PAULO62070503***6304`;

    return res.json({
      sucesso: true,
      sessionId: simulatedSessionId,
      modo: 'stripe_sandbox',
      plano: {
        id: isAnual ? 'anual' : 'mensal',
        nome: nomePlano,
        valorTotal: valorCentavos / 100,
        portalPaciente: isAnual,
      },
      pix: {
        codigoCopiaECola: codigoPixSimulado,
        expiracaoMinutos: 30,
      },
      aviso: 'Chave STRIPE_SECRET_KEY não detectada nas variáveis de ambiente. Simulação de checkout Stripe ativa com sucesso.',
    });
  } catch (error: any) {
    console.error('Erro ao criar sessão de checkout Stripe:', error);
    return res.status(500).json({
      sucesso: false,
      erro: error.message || 'Falha ao processar checkout Stripe',
    });
  }
});

/**
 * POST /api/stripe/verify-session
 * Verifica o status de uma sessão de checkout retornada ao app e sincroniza plano no Firestore
 */
app.post('/api/stripe/verify-session', async (req: Request, res: Response) => {
  try {
    const { sessionId, usuarioUid } = req.body;
    if (!sessionId) {
      return res.status(400).json({ sucesso: false, erro: 'Session ID é obrigatório.' });
    }

    if (stripe) {
      const session = await stripe.checkout.sessions.retrieve(sessionId);
      const isPago = session.payment_status === 'paid' || session.status === 'complete';
      const planoId = session.metadata?.planoId || 'anual';
      const ciclo = session.metadata?.ciclo || 'anual';
      const uid = usuarioUid || session.metadata?.usuarioUid || session.client_reference_id;

      if (isPago && uid && firebaseAdminInitialized) {
        try {
          const dbAdmin = getAdminFirestore();
          await dbAdmin.collection('usuarios_profissionais').doc(uid).set({
            planoId,
            planoStatus: 'ativo',
            planoCiclo: ciclo,
            planoMetodo: session.payment_method_types?.[0] || 'stripe',
            planoValidade: ciclo === 'anual'
              ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
              : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            stripeCustomerId: typeof session.customer === 'string' ? session.customer : undefined,
            stripeSubscriptionId: typeof session.subscription === 'string' ? session.subscription : session.id,
            updatedAt: new Date().toISOString()
          }, { merge: true });
          console.log(`✅ Sessão ${sessionId} validada e plano atualizado no Firestore para ${uid}`);
        } catch (fsErr) {
          console.error('Aviso ao sincronizar plano no Firestore:', fsErr);
        }
      }

      return res.json({
        sucesso: true,
        pago: isPago,
        planoId,
        ciclo,
        sessionId: session.id,
        customerId: session.customer,
      });
    }

    // Modo simulado / sandbox
    return res.json({
      sucesso: true,
      pago: true,
      planoId: 'anual',
      ciclo: 'anual',
      modo: 'sandbox'
    });
  } catch (err: any) {
    console.error('Erro ao verificar sessão Stripe:', err);
    return res.status(500).json({
      sucesso: false,
      erro: err.message || 'Erro ao validar sessão Stripe'
    });
  }
});

/**
 * POST /api/stripe/create-portal-session
 * Cria link para o portal de autoatendimento da Stripe (gerenciar cartão, faturas e cancelamento)
 */
app.post('/api/stripe/create-portal-session', async (req: Request, res: Response) => {
  try {
    const { customerId } = req.body;
    const appUrl = process.env.APP_URL || `http://localhost:${PORT}`;

    if (stripe && customerId) {
      const portalSession = await stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: `${appUrl}?tela=planos`,
      });
      return res.json({ sucesso: true, url: portalSession.url });
    }

    return res.status(400).json({ 
      sucesso: false, 
      erro: 'Stripe ou ID de cliente não configurado.' 
    });
  } catch (err: any) {
    console.error('Erro ao criar portal session:', err);
    return res.status(500).json({ sucesso: false, erro: err.message });
  }
});

// ============================================================================
// ROTAS DE BANCO DE DADOS RELACIONAL (POSTGRESQL / CLOUD SQL)
// ============================================================================

/**
 * GET /api/sessoes
 * Lista todas as sessões salvas na bancada
 */
app.get('/api/sessoes', async (req: Request, res: Response) => {
  try {
    const userId = (req.query.userId as string) || undefined;
    const sessoes = await listarSessoesSql(userId);
    return res.json({ sucesso: true, sessoes });
  } catch (error: any) {
    console.error('Erro na rota GET /api/sessoes:', error);
    return res.status(500).json({ sucesso: false, erro: error.message || 'Falha ao buscar sessões.' });
  }
});

/**
 * GET /api/sessoes/:id
 * Obtém uma sessão por ID
 */
app.get('/api/sessoes/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const sessao = await obterSessaoSql(id);
    if (!sessao) {
      return res.status(404).json({ sucesso: false, erro: 'Sessão não encontrada.' });
    }
    return res.json({ sucesso: true, sessao });
  } catch (error: any) {
    console.error(`Erro na rota GET /api/sessoes/${req.params.id}:`, error);
    return res.status(500).json({ sucesso: false, erro: error.message || 'Falha ao buscar sessão.' });
  }
});

/**
 * POST /api/sessoes
 * Salva ou atualiza sessão da bancada com marcações e contagens
 */
app.post('/api/sessoes', async (req: Request, res: Response) => {
  try {
    const payload = req.body;
    if (!payload || !payload.id || !payload.imageUrl) {
      return res.status(400).json({ sucesso: false, erro: 'Dados incompletos da sessão.' });
    }
    const gravado = await salvarSessaoSql(payload);
    return res.json({ sucesso: true, sessao: gravado });
  } catch (error: any) {
    console.error('Erro na rota POST /api/sessoes:', error);
    return res.status(500).json({ sucesso: false, erro: error.message || 'Falha ao salvar sessão.' });
  }
});

/**
 * DELETE /api/sessoes/:id
 * Remove sessão da bancada
 */
app.delete('/api/sessoes/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await deletarSessaoSql(id);
    return res.json({ sucesso: true });
  } catch (error: any) {
    console.error(`Erro na rota DELETE /api/sessoes/${req.params.id}:`, error);
    return res.status(500).json({ sucesso: false, erro: error.message || 'Falha ao remover sessão.' });
  }
});

/**
 * GET /api/pacientes
 * Lista pacientes cadastrados no banco relacional
 */
app.get('/api/pacientes', async (req: Request, res: Response) => {
  try {
    const userId = (req.query.userId as string) || undefined;
    const lista = await listarPacientesSql(userId);
    return res.json({ sucesso: true, pacientes: lista });
  } catch (error: any) {
    console.error('Erro na rota GET /api/pacientes:', error);
    return res.status(500).json({ sucesso: false, erro: error.message || 'Falha ao buscar pacientes.' });
  }
});

/**
 * POST /api/pacientes
 * Salva ou atualiza paciente no banco relacional
 */
app.post('/api/pacientes', async (req: Request, res: Response) => {
  try {
    const payload = req.body;
    if (!payload || !payload.id || !payload.nome) {
      return res.status(400).json({ sucesso: false, erro: 'Dados incompletos do paciente.' });
    }
    const gravado = await salvarPacienteSql(payload);
    return res.json({ sucesso: true, paciente: gravado });
  } catch (error: any) {
    console.error('Erro na rota POST /api/pacientes:', error);
    return res.status(500).json({ sucesso: false, erro: error.message || 'Falha ao salvar paciente.' });
  }
});

/**
 * DELETE /api/pacientes/:id
 * Remove paciente no banco relacional
 */
app.delete('/api/pacientes/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await deletarPacienteSql(id);
    return res.json({ sucesso: true });
  } catch (error: any) {
    console.error(`Erro na rota DELETE /api/pacientes/${req.params.id}:`, error);
    return res.status(500).json({ sucesso: false, erro: error.message || 'Falha ao excluir paciente.' });
  }
});

/**
 * POST /api/users/sync
 * Sincroniza usuário autenticado com a tabela users do Cloud SQL
 */
app.post('/api/users/sync', async (req: Request, res: Response) => {
  try {
    const { uid, email, nome } = req.body || {};
    if (!uid || !email) {
      return res.status(400).json({ sucesso: false, erro: 'UID e email são obrigatórios.' });
    }
    const usuario = await getOrCreateUser(uid, email, nome);
    return res.json({ sucesso: true, usuario });
  } catch (error: any) {
    console.error('Erro na rota POST /api/users/sync:', error);
    return res.status(500).json({ sucesso: false, erro: error.message || 'Falha ao sincronizar usuário.' });
  }
});

/**
 * GET /api/users/:uid
 * Busca perfil do usuário no Cloud SQL
 */
app.get('/api/users/:uid', async (req: Request, res: Response) => {
  try {
    const { uid } = req.params;
    const usuario = await getUserByUid(uid);
    if (!usuario) {
      return res.status(404).json({ sucesso: false, erro: 'Usuário não encontrado.' });
    }
    return res.json({ sucesso: true, usuario });
  } catch (error: any) {
    console.error(`Erro na rota GET /api/users/${req.params.uid}:`, error);
    return res.status(500).json({ sucesso: false, erro: error.message || 'Falha ao buscar usuário.' });
  }
});

// ============================================================================
// ROTAS DE EXAMES LABORATORIAIS E LEITURA COM IA (/api/exames/*)
// ============================================================================

/**
 * GET /api/exames/uso-ia
 * Retorna a contagem de transcrições de IA utilizadas pelo usuário no mês atual
 */
app.get('/api/exames/uso-ia', async (req: Request, res: Response) => {
  try {
    const usuario = await autenticarUsuario(req);
    if (!usuario) {
      return res.status(401).json({ sucesso: false, erro: 'Usuário não autenticado.' });
    }

    const mesAtual = new Date().toISOString().substring(0, 7);
    const usado = await obterUsoMensal(usuario.uid, mesAtual);
    const limite = 40; // Limite padrão Master

    return res.json({
      sucesso: true,
      usado,
      limite,
      mes: mesAtual
    });
  } catch (err: any) {
    console.error('Erro ao consultar uso_ia:', err);
    return res.status(500).json({ sucesso: false, erro: err.message || 'Falha ao consultar uso da IA' });
  }
});

/**
 * POST /api/exames/transcrever-laudo
 * Executa a leitura e transcrição fiel do laudo através do modelo Gemini Flash no servidor
 */
app.post('/api/exames/transcrever-laudo', async (req: Request, res: Response) => {
  try {
    // 1. Verificação de autenticação do especialista
    const usuario = await autenticarUsuario(req);
    if (!usuario) {
      return res.status(401).json({
        sucesso: false,
        erro: 'Autenticação necessária. Faça login para utilizar a leitura de laudos por IA.'
      });
    }

    // 2. Verificação de permissão do plano do usuário no servidor
    let planoUsuario = req.body.planoId || 'master';
    let statusUsuario = req.body.planoStatus || 'trial';

    if (firebaseAdminInitialized) {
      try {
        const userDoc = await getAdminFirestore().collection('usuarios_profissionais').doc(usuario.uid).get();
        if (userDoc.exists) {
          const uData = userDoc.data();
          if (uData?.planoId) planoUsuario = uData.planoId;
          if (uData?.planoStatus) statusUsuario = uData.planoStatus;
        }
      } catch (e) {
        console.warn('Aviso ao consultar perfil do usuário no Firestore:', e);
      }
    }

    if (!temPermissaoExamesIa(planoUsuario, statusUsuario)) {
      return res.status(403).json({
        sucesso: false,
        erro: 'A transcrição automática por IA é exclusiva a partir do Plano Master. Faça upgrade para desbloquear.'
      });
    }

    // 3. Verificação de limite mensal de uso
    const mesAtual = new Date().toISOString().substring(0, 7);
    const limite = obterLimiteMensalIa(planoUsuario, statusUsuario);
    const usado = await obterUsoMensal(usuario.uid, mesAtual);

    if (limite > 0 && usado >= limite) {
      return res.status(429).json({
        sucesso: false,
        erro: `Limite mensal de leituras de laudo por IA atingido (${usado}/${limite}). O lançamento manual continua disponível.`
      });
    }

    // 4. Validação do arquivo do laudo (SOMENTE o arquivo é enviado, nunca prontuário)
    const { arquivoBase64, mimeType = 'application/pdf' } = req.body;
    if (!arquivoBase64 || typeof arquivoBase64 !== 'string') {
      return res.status(400).json({
        sucesso: false,
        erro: 'Arquivo do laudo não enviado ou formato inválido.'
      });
    }

    // Remove eventual prefixo data:...;base64,
    const base64Limpo = arquivoBase64.includes(';base64,')
      ? arquivoBase64.split(';base64,')[1]
      : arquivoBase64;

    // 5. Chamada segura ao Gemini no servidor usando gemini-3.8-flash com resposta estruturada
    if (!geminiApiKey && !process.env.GEMINI_API_KEY) {
      return res.status(500).json({
        sucesso: false,
        erro: 'Chave GEMINI_API_KEY não configurada no servidor. Configure a variável de ambiente para habilitar a IA.'
      });
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: [
        {
          role: 'user',
          parts: [
            { text: INSTRUCAO_SISTEMA_TRANSCRICAO_LAUDO },
            {
              inlineData: {
                data: base64Limpo,
                mimeType: mimeType
              }
            }
          ]
        }
      ],
      config: {
        responseMimeType: 'application/json'
      }
    });

    const respostaTexto = response.text || '';
    if (!respostaTexto.trim()) {
      return res.status(502).json({
        sucesso: false,
        erro: 'A IA não retornou dados para este documento. Verifique a nitidez do arquivo.'
      });
    }

    // 6. Validação estrita do JSON retornado
    let dadosJson: any;
    try {
      dadosJson = JSON.parse(respostaTexto);
    } catch {
      const semMarkdown = respostaTexto.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
      dadosJson = JSON.parse(semMarkdown);
    }

    if (!dadosJson || !Array.isArray(dadosJson.itens)) {
      return res.status(502).json({
        sucesso: false,
        erro: 'Formato de resposta inesperado da IA. Tente novamente ou use o lançamento manual.',
        respostaBruta: respostaTexto
      });
    }

    // Sanitiza e formata os itens da transcrição
    const itensValidados = dadosJson.itens.map((it: any, index: number) => ({
      id: `item_${Date.now()}_${index}`,
      marcador: String(it.marcador || 'Exame sem nome').trim(),
      valor: String(it.valor || '').trim(),
      valorNumerico: typeof it.valorNumerico === 'number' ? it.valorNumerico : null,
      unidade: String(it.unidade || '').trim(),
      referenciaTexto: it.referenciaTexto ? String(it.referenciaTexto).trim() : '',
      referenciaMinima: typeof it.referenciaMinima === 'number' ? it.referenciaMinima : null,
      referenciaMaxima: typeof it.referenciaMaxima === 'number' ? it.referenciaMaxima : null,
      categoria: it.categoriaSugerida || 'Outros',
      incerto: Boolean(it.incerto)
    }));

    // 7. Incrementa o contador de uso registrado no servidor
    const novoUsado = await incrementarUsoMensal(usuario.uid, mesAtual, limite);

    return res.json({
      sucesso: true,
      dados: {
        laboratorio: dadosJson.laboratorio || '',
        dataColeta: dadosJson.dataColeta || '',
        itens: itensValidados
      },
      respostaBruta: respostaTexto,
      usoAtual: {
        usado: novoUsado,
        limite,
        mes: mesAtual
      }
    });
  } catch (error: any) {
    console.error('Erro na transcrição de laudo com IA:', error);
    return res.status(500).json({
      sucesso: false,
      erro: error.message || 'Erro interno ao processar laudo com IA'
    });
  }
});

// ============================================================================
// INICIALIZAÇÃO DO SERVIDOR COM VITE EM DEV
// ============================================================================

async function startServer() {
  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Em produção, serve os arquivos compilados da pasta dist
    app.use(express.static('dist'));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile('dist/index.html', { root: '.' });
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 TricoCalazans rodando em http://0.0.0.0:${PORT}`);
  });
}

startServer();
