/**
 * TRICOCALAZANS.APP — Módulo Servidor de Gerenciamento de Indicações & Influenciadores
 * 
 * Camadas de Persistência:
 * 1. Cache em Memória
 * 2. Arquivo Local JSON (.indicacoes_store.json)
 * 3. Firebase Cloud Firestore (Admin SDK)
 */

import fs from 'fs';
import path from 'path';
import { getApps as getAdminApps } from 'firebase-admin/app';
import { getFirestore as getAdminFirestore } from 'firebase-admin/firestore';
import type { ConfigIndicacoes, RegraInfluenciador, ItemHistoricoIndicacao } from '../types/indicacoes.ts';

interface IndicacoesStoreSchema {
  config: ConfigIndicacoes;
  historico: ItemHistoricoIndicacao[];
}

const CONFIG_PADRAO: ConfigIndicacoes = {
  porcentagemPadrao: 10,
  cupomPadrao: 'TRICO10',
  diasBonusPadrao: 30,
  influenciadores: [],
  atualizadoEm: new Date().toISOString()
};

let storeEmMemoria: IndicacoesStoreSchema = {
  config: { ...CONFIG_PADRAO },
  historico: []
};

const CAMINHO_ARQUIVO_LOCAL = path.resolve(process.cwd(), '.indicacoes_store.json');
const CAMINHO_ARQUIVO_TMP = path.join('/tmp', '.tricocalazans_indicacoes_store.json');

function salvarArquivoDisco(dados: IndicacoesStoreSchema): void {
  const json = JSON.stringify(dados, null, 2);
  try {
    fs.writeFileSync(CAMINHO_ARQUIVO_LOCAL, json, 'utf8');
  } catch (err) {
    try {
      fs.writeFileSync(CAMINHO_ARQUIVO_TMP, json, 'utf8');
    } catch {}
  }
}

function carregarArquivoDisco(): IndicacoesStoreSchema | null {
  try {
    if (fs.existsSync(CAMINHO_ARQUIVO_LOCAL)) {
      const conteudo = fs.readFileSync(CAMINHO_ARQUIVO_LOCAL, 'utf8');
      if (conteudo && conteudo.trim().length > 0) {
        return JSON.parse(conteudo);
      }
    }
  } catch {}

  try {
    if (fs.existsSync(CAMINHO_ARQUIVO_TMP)) {
      const conteudo = fs.readFileSync(CAMINHO_ARQUIVO_TMP, 'utf8');
      if (conteudo && conteudo.trim().length > 0) {
        return JSON.parse(conteudo);
      }
    }
  } catch {}

  return null;
}

// Inicializar do disco ao iniciar
const dadosIniciais = carregarArquivoDisco();
if (dadosIniciais && dadosIniciais.config) {
  storeEmMemoria = {
    config: {
      ...CONFIG_PADRAO,
      ...dadosIniciais.config
    },
    historico: Array.isArray(dadosIniciais.historico) ? dadosIniciais.historico : []
  };
}

export async function obterConfigIndicacoesServer(): Promise<ConfigIndicacoes> {
  // Tentar sincronizar do Firestore se disponível
  try {
    if (getAdminApps().length > 0) {
      const db = getAdminFirestore();
      const doc = await db.collection('configuracoes_sistema').doc('indicacoes').get();
      if (doc.exists) {
        const dados = doc.data() as ConfigIndicacoes;
        storeEmMemoria.config = {
          ...storeEmMemoria.config,
          ...dados
        };
      }
    }
  } catch (e) {
    console.warn('Não foi possível sincronizar config de indicações com o Firestore:', e);
  }

  return storeEmMemoria.config;
}

export async function salvarConfigIndicacoesServer(novaConfig: Partial<ConfigIndicacoes>): Promise<ConfigIndicacoes> {
  storeEmMemoria.config = {
    ...storeEmMemoria.config,
    ...novaConfig,
    atualizadoEm: new Date().toISOString()
  };

  salvarArquivoDisco(storeEmMemoria);

  try {
    if (getAdminApps().length > 0) {
      const db = getAdminFirestore();
      await db.collection('configuracoes_sistema').doc('indicacoes').set(storeEmMemoria.config, { merge: true });
    }
  } catch (e) {
    console.error('Erro ao persistir config de indicações no Firestore:', e);
  }

  return storeEmMemoria.config;
}

export function obterRegraParaUsuarioServer(email?: string | null): {
  ehInfluenciador: boolean;
  porcentagemDesconto: number;
  codigoCupom: string;
  diasBonusIndicador: number;
  nomeInfluenciador?: string;
} {
  const config = storeEmMemoria.config;
  const limpo = (email || '').toLowerCase().trim();

  if (limpo && Array.isArray(config.influenciadores)) {
    const influenciador = config.influenciadores.find(
      inf => inf.ativo && inf.email.toLowerCase().trim() === limpo
    );

    if (influenciador) {
      return {
        ehInfluenciador: true,
        porcentagemDesconto: influenciador.porcentagemDesconto || config.porcentagemPadrao,
        codigoCupom: influenciador.codigoCupom || config.cupomPadrao,
        diasBonusIndicador: influenciador.diasBonusIndicador || config.diasBonusPadrao,
        nomeInfluenciador: influenciador.nome
      };
    }
  }

  return {
    ehInfluenciador: false,
    porcentagemDesconto: config.porcentagemPadrao || 10,
    codigoCupom: config.cupomPadrao || 'TRICO10',
    diasBonusIndicador: config.diasBonusPadrao || 30
  };
}

export async function registrarConversaoIndicacaoServer(item: Omit<ItemHistoricoIndicacao, 'id' | 'data' | 'status'>): Promise<ItemHistoricoIndicacao> {
  const novoItem: ItemHistoricoIndicacao = {
    id: `ind_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    data: new Date().toISOString(),
    status: 'aprovado',
    ...item
  };

  storeEmMemoria.historico.unshift(novoItem);
  salvarArquivoDisco(storeEmMemoria);

  try {
    if (getAdminApps().length > 0) {
      const db = getAdminFirestore();
      await db.collection('historico_indicacoes').doc(novoItem.id).set(novoItem);
    }
  } catch (e) {
    console.error('Erro ao registrar histórico de indicação no Firestore:', e);
  }

  return novoItem;
}

export async function listarHistoricoIndicacoesServer(filtroEmail?: string): Promise<ItemHistoricoIndicacao[]> {
  // Sincronizar histórico do Firestore se possível
  try {
    if (getAdminApps().length > 0) {
      const db = getAdminFirestore();
      let query: any = db.collection('historico_indicacoes').orderBy('data', 'desc').limit(100);
      if (filtroEmail) {
        query = db.collection('historico_indicacoes')
          .where('indicadorEmail', '==', filtroEmail.toLowerCase().trim())
          .orderBy('data', 'desc')
          .limit(100);
      }
      const snapshot = await query.get();
      if (!snapshot.empty) {
        const itens: ItemHistoricoIndicacao[] = [];
        snapshot.forEach((doc: any) => itens.push(doc.data() as ItemHistoricoIndicacao));
        if (itens.length > 0) {
          if (!filtroEmail) {
            storeEmMemoria.historico = itens;
          }
          return itens;
        }
      }
    }
  } catch (e) {
    console.warn('Aviso: busca no Firestore para histórico de indicações utilizou cache local:', e);
  }

  if (filtroEmail) {
    const limpo = filtroEmail.toLowerCase().trim();
    return storeEmMemoria.historico.filter(h => h.indicadorEmail.toLowerCase().trim() === limpo);
  }

  return storeEmMemoria.historico;
}

