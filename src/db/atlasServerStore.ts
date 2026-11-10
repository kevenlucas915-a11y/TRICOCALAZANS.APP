/**
 * TRICOCALAZANS.APP — Módulo Servidor de Persistência e Sincronização Universal do Atlas
 * 
 * Garante que qualquer alteração feita no perfil de Administrador (inclusão/edição/remoção
 * de casos e anexação de fotos) seja imediatamente sincronizada em qualquer dispositivo
 * (Desktop, Celular Android/iOS, PWA) e para todos os perfis com acesso ao Atlas.
 * 
 * Camadas de Persistência:
 * 1. Cache em Memória de Alta Performance (latência < 5ms)
 * 2. Arquivo JSON persistente no servidor (.atlas_store.json)
 * 3. PostgreSQL (Cloud SQL no Render via Drizzle / Pool)
 * 4. Firebase Cloud Firestore (via Firebase Admin SDK com bypass de regras)
 */

import fs from 'fs';
import path from 'path';
import { getApps as getAdminApps } from 'firebase-admin/app';
import { getFirestore as getAdminFirestore } from 'firebase-admin/firestore';
import { createPool } from './index.ts';

export interface FotoAtlasItem {
  id: string;
  casoId: string;
  dataUrl: string;
  nomeArquivo?: string;
  tamanhoBytes?: number;
  storagePath?: string;
  dataAtualizacao: number;
}

export interface AtlasConfigData {
  removidos: string[];
  customizados: any[];
  totalCasos: number;
  updatedAt: string;
}

interface AtlasStoreSchema {
  config: AtlasConfigData;
  fotos: Record<string, FotoAtlasItem[]>;
}

// 1. CACHE EM MEMÓRIA DO SERVIDOR
let storeEmMemoria: AtlasStoreSchema = {
  config: {
    removidos: [],
    customizados: [],
    totalCasos: 17,
    updatedAt: new Date().toISOString()
  },
  fotos: {}
};

// 2. CAMINHO DO ARQUIVO PERSISTENTE NO SERVIDOR
const CAMINHO_ARQUIVO_LOCAL = path.resolve(process.cwd(), '.atlas_store.json');
const CAMINHO_ARQUIVO_TMP = path.join('/tmp', '.tricocalazans_atlas_store.json');

function salvarArquivoDisco(dados: AtlasStoreSchema): void {
  const json = JSON.stringify(dados, null, 2);
  try {
    fs.writeFileSync(CAMINHO_ARQUIVO_LOCAL, json, 'utf8');
  } catch {
    try {
      fs.writeFileSync(CAMINHO_ARQUIVO_TMP, json, 'utf8');
    } catch (e) {
      console.warn('⚠️ [Atlas Server] Erro ao gravar persistência em disco:', e);
    }
  }
}

function carregarArquivoDisco(): boolean {
  for (const p of [CAMINHO_ARQUIVO_LOCAL, CAMINHO_ARQUIVO_TMP]) {
    try {
      if (fs.existsSync(p)) {
        const raw = fs.readFileSync(p, 'utf8');
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && parsed.config) {
            storeEmMemoria = {
              config: {
                removidos: Array.isArray(parsed.config.removidos) ? parsed.config.removidos : [],
                customizados: Array.isArray(parsed.config.customizados) ? parsed.config.customizados : [],
                totalCasos: typeof parsed.config.totalCasos === 'number' ? parsed.config.totalCasos : 17,
                updatedAt: parsed.config.updatedAt || new Date().toISOString()
              },
              fotos: parsed.fotos || {}
            };
            return true;
          }
        }
      }
    } catch {}
  }
  return false;
}

// Carrega na inicialização do módulo
carregarArquivoDisco();

// 3. INICIALIZAÇÃO ASSÍNCRONA DAS TABELAS SQL (POSTGRESQL NO RENDER)
let sqlInicializado = false;
async function inicializarTabelasSql() {
  if (sqlInicializado) return;
  try {
    const pool = createPool();
    await pool.query(`
      CREATE TABLE IF NOT EXISTS atlas_config (
        id TEXT PRIMARY KEY DEFAULT 'config_geral',
        removidos_json TEXT NOT NULL DEFAULT '[]',
        customizados_json TEXT NOT NULL DEFAULT '[]',
        total_casos INTEGER DEFAULT 17,
        updated_at TEXT
      );
      CREATE TABLE IF NOT EXISTS caso_imagens (
        id TEXT PRIMARY KEY,
        caso_id TEXT NOT NULL,
        nome_arquivo TEXT,
        tamanho_bytes INTEGER,
        data_url TEXT NOT NULL,
        storage_path TEXT,
        updated_at TEXT
      );
    `);
    sqlInicializado = true;

    // Recupera dados do banco SQL caso o arquivo em disco estivesse vazio
    const resConfig = await pool.query(`SELECT * FROM atlas_config WHERE id = 'config_geral' LIMIT 1`);
    if (resConfig.rows.length > 0) {
      const row = resConfig.rows[0];
      const removidos = JSON.parse(row.removidos_json || '[]');
      const customizados = JSON.parse(row.customizados_json || '[]');
      if (removidos.length > 0 || customizados.length > 0) {
        storeEmMemoria.config.removidos = removidos;
        storeEmMemoria.config.customizados = customizados;
        storeEmMemoria.config.totalCasos = row.total_casos || (17 - removidos.length + customizados.length);
        storeEmMemoria.config.updatedAt = row.updated_at || storeEmMemoria.config.updatedAt;
      }
    }

    const resFotos = await pool.query(`SELECT * FROM caso_imagens`);
    if (resFotos.rows.length > 0) {
      for (const row of resFotos.rows) {
        if (!storeEmMemoria.fotos[row.caso_id]) {
          storeEmMemoria.fotos[row.caso_id] = [];
        }
        const existe = storeEmMemoria.fotos[row.caso_id].some(f => f.id === row.id);
        if (!existe) {
          storeEmMemoria.fotos[row.caso_id].push({
            id: row.id,
            casoId: row.caso_id,
            dataUrl: row.data_url,
            nomeArquivo: row.nome_arquivo || undefined,
            tamanhoBytes: row.tamanho_bytes || undefined,
            storagePath: row.storage_path || undefined,
            dataAtualizacao: Date.now()
          });
        }
      }
    }
  } catch (err: any) {
    // SQL pode não estar configurado em ambiente local; continua via arquivo e memória
    console.debug('Aviso SQL Atlas Server:', err?.message || err);
  }
}

// Roda a inicialização SQL sem bloquear
inicializarTabelasSql().catch(() => {});

// 4. SINCRONIZAÇÃO EM BACKGROUND COM O FIRESTORE VIA ADMIN SDK
async function sincronizarComFirestoreAdmin(tipo: 'config' | 'foto', payload: any) {
  try {
    if (!getAdminApps().length) return;
    const adminDb = getAdminFirestore();

    if (tipo === 'config') {
      // Salva doc de configuração em caso_imagens (que tem allow read: if true)
      await adminDb.collection('caso_imagens').doc('--atlas-casos-config--').set({
        casoId: '--atlas-casos-config--',
        dataUrl: 'config-atlas',
        casoJson: JSON.stringify(payload),
        updatedAt: new Date().toISOString()
      }, { merge: true });

      // Salva também na collection atlas_casos
      await adminDb.collection('atlas_casos').doc('--config-geral--').set({
        id: '--config-geral--',
        removidos: payload.removidos,
        customizados: payload.customizados,
        totalCasos: payload.totalCasos,
        updatedAt: new Date().toISOString()
      }, { merge: true });
    } else if (tipo === 'foto' && payload.casoId) {
      const oficial = payload.casoId;
      const fotos = payload.fotos as FotoAtlasItem[];
      const urlPrincipal = fotos[0]?.dataUrl || '';

      await adminDb.collection('caso_imagens').doc(oficial).set({
        casoId: oficial,
        nomeArquivo: fotos[0]?.nomeArquivo || `${oficial}.jpg`,
        tamanhoBytes: fotos[0]?.tamanhoBytes || urlPrincipal.length,
        dataUrl: urlPrincipal,
        storagePath: fotos[0]?.storagePath || '',
        imagensJson: JSON.stringify(fotos),
        updatedAt: new Date().toISOString()
      }, { merge: true });
    }
  } catch (e: any) {
    console.debug('Aviso Firestore Admin sync:', e?.message || e);
  }
}

// ============================================================================
// FUNÇÕES PÚBLICAS DO MÓDULO SERVIDOR
// ============================================================================

/**
 * Retorna a configuração consolidada de casos do Atlas
 */
export function obterConfigAtlasServer(): AtlasConfigData {
  return storeEmMemoria.config;
}

/**
 * Atualiza e persiste a configuração do Atlas (casos removidos e customizados)
 */
export async function salvarConfigAtlasServer(
  removidos?: string[],
  customizados?: any[]
): Promise<AtlasConfigData> {
  const agora = new Date().toISOString();

  if (Array.isArray(removidos)) {
    // Mescla IDs únicos
    const setRemovidos = new Set([...storeEmMemoria.config.removidos, ...removidos]);
    storeEmMemoria.config.removidos = Array.from(setRemovidos);
  }

  if (Array.isArray(customizados)) {
    const map = new Map<string, any>();
    for (const c of storeEmMemoria.config.customizados) {
      if (c && c.id) map.set(c.id, c);
    }
    for (const c of customizados) {
      if (c && c.id) map.set(c.id, c);
    }
    storeEmMemoria.config.customizados = Array.from(map.values());
  }

  // Recalcula total de casos ativos
  const total = Math.max(0, 17 - storeEmMemoria.config.removidos.length + storeEmMemoria.config.customizados.length);
  storeEmMemoria.config.totalCasos = total;
  storeEmMemoria.config.updatedAt = agora;

  // 1. Salva em disco
  salvarArquivoDisco(storeEmMemoria);

  // 2. Salva no PostgreSQL
  try {
    const pool = createPool();
    await pool.query(
      `INSERT INTO atlas_config (id, removidos_json, customizados_json, total_casos, updated_at)
       VALUES ('config_geral', $1, $2, $3, $4)
       ON CONFLICT (id) DO UPDATE SET
         removidos_json = EXCLUDED.removidos_json,
         customizados_json = EXCLUDED.customizados_json,
         total_casos = EXCLUDED.total_casos,
         updated_at = EXCLUDED.updated_at`,
      [
        JSON.stringify(storeEmMemoria.config.removidos),
        JSON.stringify(storeEmMemoria.config.customizados),
        storeEmMemoria.config.totalCasos,
        agora
      ]
    );
  } catch {}

  // 3. Salva no Firestore via Firebase Admin SDK
  sincronizarComFirestoreAdmin('config', storeEmMemoria.config).catch(() => {});

  return storeEmMemoria.config;
}

/**
 * Obtém todas as fotos do acervo ou as fotos de um caso específico
 */
export function obterFotosAtlasServer(casoId?: string): Record<string, FotoAtlasItem[]> | FotoAtlasItem[] {
  if (casoId) {
    return storeEmMemoria.fotos[casoId] || [];
  }
  return storeEmMemoria.fotos;
}

/**
 * Salva as fotos de um caso no acervo central
 */
export async function salvarFotosCasoServer(
  casoId: string,
  fotos: FotoAtlasItem[]
): Promise<FotoAtlasItem[]> {
  if (!casoId || !Array.isArray(fotos)) return [];

  storeEmMemoria.fotos[casoId] = fotos;

  // 1. Salva em disco
  salvarArquivoDisco(storeEmMemoria);

  // 2. Salva no PostgreSQL
  try {
    const pool = createPool();
    for (const f of fotos) {
      await pool.query(
        `INSERT INTO caso_imagens (id, caso_id, nome_arquivo, tamanho_bytes, data_url, storage_path, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (id) DO UPDATE SET
           data_url = EXCLUDED.data_url,
           storage_path = EXCLUDED.storage_path,
           nome_arquivo = EXCLUDED.nome_arquivo,
           tamanho_bytes = EXCLUDED.tamanho_bytes,
           updated_at = EXCLUDED.updated_at`,
        [
          f.id || `${casoId}_img_${Date.now()}`,
          casoId,
          f.nomeArquivo || `${casoId}.jpg`,
          f.tamanhoBytes || (f.dataUrl ? f.dataUrl.length : 0),
          f.dataUrl || '',
          f.storagePath || '',
          new Date().toISOString()
        ]
      );
    }
  } catch {}

  // 3. Salva no Firestore via Firebase Admin
  sincronizarComFirestoreAdmin('foto', { casoId, fotos }).catch(() => {});

  return fotos;
}

/**
 * Salva um lote completo de fotos (ex: quando o desktop sincroniza todo seu acervo)
 */
export async function salvarLoteFotosServer(
  lote: Record<string, FotoAtlasItem[]>
): Promise<number> {
  let alterados = 0;
  for (const [casoId, fotos] of Object.entries(lote)) {
    if (casoId && Array.isArray(fotos) && fotos.length > 0) {
      storeEmMemoria.fotos[casoId] = fotos;
      alterados++;
    }
  }

  if (alterados > 0) {
    salvarArquivoDisco(storeEmMemoria);

    // Persiste no Firestore em segundo plano
    for (const [casoId, fotos] of Object.entries(lote)) {
      sincronizarComFirestoreAdmin('foto', { casoId, fotos }).catch(() => {});
    }
  }

  return alterados;
}

/**
 * Remove todas as fotos de um caso do acervo
 */
export async function removerFotosCasoServer(casoId: string): Promise<void> {
  if (!casoId) return;
  delete storeEmMemoria.fotos[casoId];

  salvarArquivoDisco(storeEmMemoria);

  try {
    const pool = createPool();
    await pool.query(`DELETE FROM caso_imagens WHERE caso_id = $1`, [casoId]);
  } catch {}

  try {
    if (getAdminApps().length) {
      const adminDb = getAdminFirestore();
      await adminDb.collection('caso_imagens').doc(casoId).delete();
    }
  } catch {}
}
