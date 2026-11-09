/**
 * TRICOCALAZANS.APP — Serviço de Gerenciamento e Persistência de Casos do Atlas
 * 
 * Permite cadastrar novos casos, editar informações clínicas de casos existentes
 * e remover condições do acervo, com sincronização em nuvem (Cloud Firestore)
 * e cache local-first ultra-resiliente.
 */

import { CasoAtlas, CategoriaClinica } from '../types/tricoscopia';
import { CASOS_17_OFICIAIS } from '../data/casos17Data';
import { CASOS_ATLAS } from '../data/tricoscopiaData';
import { db } from '../firebase';
import { doc, getDocs, collection, setDoc, deleteDoc } from 'firebase/firestore';
import { removerImagemCaso, registrarCasoCustomizadoId } from '../utils/imageStore';

const LS_CASOS_CUSTOM_KEY = 'atlas_casos_customizados_v2';
const LS_CASOS_REMOVIDOS_KEY = 'atlas_casos_removidos_v2';

// Cache em memória de casos dinâmicos
let casosEmMemoria: CasoAtlas[] = [];
let inicializado = false;

/**
 * Converte um nome em um ID padronizado de caso (slug)
 */
export function gerarIdCaso(nome: string): string {
  const slug = (nome || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return `cond-${slug || Date.now().toString(36)}`;
}

/**
 * Carrega a lista de IDs de casos removidos do localStorage
 */
function carregarIdsRemovidos(): Set<string> {
  if (typeof window === 'undefined' || !window.localStorage) return new Set();
  try {
    const raw = window.localStorage.getItem(LS_CASOS_REMOVIDOS_KEY);
    if (raw) {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) return new Set(arr);
    }
  } catch {}
  return new Set();
}

/**
 * Salva a lista de IDs de casos removidos no localStorage
 */
function salvarIdsRemovidos(ids: Set<string>): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    window.localStorage.setItem(LS_CASOS_REMOVIDOS_KEY, JSON.stringify(Array.from(ids)));
  } catch {}
}

/**
 * Carrega os casos customizados/editados salvos no localStorage
 */
function carregarCasosCustomizados(): CasoAtlas[] {
  if (typeof window === 'undefined' || !window.localStorage) return [];
  try {
    const raw = window.localStorage.getItem(LS_CASOS_CUSTOM_KEY);
    if (raw) {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) return arr;
    }
  } catch {}
  return [];
}

/**
 * Salva a lista de casos customizados/editados no localStorage
 */
function salvarCasosCustomizados(casos: CasoAtlas[]): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    window.localStorage.setItem(LS_CASOS_CUSTOM_KEY, JSON.stringify(casos));
  } catch {}
}

/**
 * Mescla os 17 casos oficiais com as customizações e exclusões locais
 */
function consolidarCasos(): CasoAtlas[] {
  const removidos = carregarIdsRemovidos();
  const customizados = carregarCasosCustomizados();
  const customMap = new Map<string, CasoAtlas>();

  for (const c of customizados) {
    if (c && c.id) {
      customMap.set(c.id, c);
      registrarCasoCustomizadoId(c.id);
    }
  }

  const resultado: CasoAtlas[] = [];

  // 1. Processa casos oficiais (aplicando edições ou filtrando se removidos)
  for (const oficial of CASOS_17_OFICIAIS) {
    if (removidos.has(oficial.id)) {
      continue; // Caso foi excluído pelo usuário
    }
    if (customMap.has(oficial.id)) {
      resultado.push(customMap.get(oficial.id)!);
      customMap.delete(oficial.id);
    } else {
      resultado.push(oficial);
    }
  }

  // 2. Adiciona casos novos adicionados pelo usuário
  for (const novo of customMap.values()) {
    if (!removidos.has(novo.id)) {
      resultado.push(novo);
    }
  }

  // 3. Ordenação inteligente (primeiro os numerados, depois alfabético)
  resultado.sort((a, b) => {
    if (a.numeroOrdem && b.numeroOrdem) return a.numeroOrdem - b.numeroOrdem;
    if (a.numeroOrdem) return -1;
    if (b.numeroOrdem) return 1;
    return a.nome.localeCompare(b.nome, 'pt-BR');
  });

  return resultado;
}

/**
 * Atualiza o array global `CASOS_ATLAS` in-place para que todos os componentes
 * da aplicação reflitam imediatamente as edições, inclusões e exclusões.
 */
function sincronizarComCasosAtlasGlobal(lista: CasoAtlas[]) {
  CASOS_ATLAS.splice(0, CASOS_ATLAS.length, ...lista);
  casosEmMemoria = lista;

  for (const c of lista) {
    registrarCasoCustomizadoId(c.id);
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('atlas-cases-updated', {
        detail: { casos: lista, total: lista.length }
      })
    );
  }
}

/**
 * Obtém a lista atual de casos ativos do Atlas (Síncrono, imediato)
 */
export function obterCasosAtlas(): CasoAtlas[] {
  if (!inicializado || casosEmMemoria.length === 0) {
    casosEmMemoria = consolidarCasos();
    sincronizarComCasosAtlasGlobal(casosEmMemoria);
    inicializado = true;
  }
  return casosEmMemoria;
}

/**
 * Inicializa e sincroniza os casos com o Firebase Firestore
 */
export async function inicializarCasosAtlas(): Promise<CasoAtlas[]> {
  casosEmMemoria = consolidarCasos();
  sincronizarComCasosAtlasGlobal(casosEmMemoria);
  inicializado = true;

  // Sincroniza em segundo plano com o Firestore
  try {
    await sincronizarCasosComFirestore();
  } catch (err) {
    console.debug('Aviso sincronização inicial atlas_casos:', err);
  }

  return casosEmMemoria;
}

/**
 * Sincroniza a coleção `atlas_casos` do Firestore com o cache local
 */
export async function sincronizarCasosComFirestore(): Promise<number> {
  try {
    const colRef = collection(db, 'atlas_casos');
    const snap = await getDocs(colRef);

    if (snap.empty) {
      return 0;
    }

    const customAtuais = carregarCasosCustomizados();
    const mapCustom = new Map<string, CasoAtlas>();
    for (const c of customAtuais) {
      if (c && c.id) mapCustom.set(c.id, c);
    }

    const removidos = carregarIdsRemovidos();
    let alterados = 0;

    for (const docSnap of snap.docs) {
      const data = docSnap.data() as any;
      if (!data || !data.id || !data.nome) continue;

      if (data.removido === true) {
        removidos.add(data.id);
        mapCustom.delete(data.id);
        alterados++;
        continue;
      }

      removidos.delete(data.id);
      mapCustom.set(data.id, data as CasoAtlas);
      alterados++;
    }

    salvarIdsRemovidos(removidos);
    salvarCasosCustomizados(Array.from(mapCustom.values()));

    const consolidada = consolidarCasos();
    sincronizarComCasosAtlasGlobal(consolidada);

    return alterados;
  } catch (err) {
    console.warn('Aviso sincronizarCasosComFirestore:', err);
    return 0;
  }
}

/**
 * Dados parciais para criação ou edição de um caso
 */
export interface DadosCasoAtlasFormulario {
  id?: string;
  nome: string;
  categoria: CategoriaClinica;
  significadoClinico?: string;
  padrao?: string;
  localizacao?: string;
  oQueObservar?: string[] | string;
  caracteristicas?: string[] | string;
  achadosTricoscopicos?: string[] | string;
  comoReconhecer?: string[] | string;
  resumoOriginal?: string;
  aumentoPadrao?: '50x' | '5x';
  legendaImagem?: string;
  numeroOrdem?: number;
}

/**
 * Converte strings com quebras de linha em arrays de tópicos limpos
 */
function quebrarEmLinhas(input?: string[] | string): string[] {
  if (!input) return [];
  if (Array.isArray(input)) return input.map(s => String(s).trim()).filter(Boolean);
  return String(input)
    .split('\n')
    .map(l => l.replace(/^[-*•]\s*/, '').trim())
    .filter(Boolean);
}

/**
 * Salva (cria ou atualiza) um caso clínico no acervo do Atlas
 */
export async function salvarCasoAtlas(dados: DadosCasoAtlasFormulario): Promise<CasoAtlas> {
  const nomeLimpo = (dados.nome || '').trim();
  if (!nomeLimpo) {
    throw new Error('O nome da condição clínica é obrigatório.');
  }

  const idCaso = dados.id ? dados.id.trim() : gerarIdCaso(nomeLimpo);
  registrarCasoCustomizadoId(idCaso);

  // Procura se já existe uma versão base para herdar propriedades avançadas
  const existente = obterCasosAtlas().find(c => c.id === idCaso);

  const oQueObservar = quebrarEmLinhas(dados.oQueObservar);
  const caracteristicas = quebrarEmLinhas(dados.caracteristicas);
  const achadosTricoscopicos = quebrarEmLinhas(dados.achadosTricoscopicos);
  const comoReconhecer = quebrarEmLinhas(dados.comoReconhecer);

  const casoCompleto: CasoAtlas = {
    id: idCaso,
    numeroOrdem: dados.numeroOrdem || existente?.numeroOrdem,
    nome: nomeLimpo,
    categoria: dados.categoria || 'Não Cicatricial',
    imagem: {
      id: existente?.imagem?.id || `img-${idCaso}`,
      casoId: idCaso,
      paginaPdf: existente?.imagem?.paginaPdf || 1,
      aumento: dados.aumentoPadrao || existente?.imagem?.aumento || '50x',
      legenda: dados.legendaImagem?.trim() || existente?.imagem?.legenda || `Lâmina tricoscópica de ${nomeLimpo}`,
      contexto: dados.significadoClinico?.trim() || existente?.imagem?.contexto || `Achados em ${nomeLimpo}`,
      achadosVisiveis: existente?.imagem?.achadosVisiveis || [],
      url: existente?.imagem?.url
    },
    oQueObservar: oQueObservar.length > 0 ? oQueObservar : (existente?.oQueObservar || ['Avaliação da densidade folicular e haste capilar']),
    caracteristicas: caracteristicas.length > 0 ? caracteristicas : (existente?.caracteristicas || [nomeLimpo]),
    achadosTricoscopicos: achadosTricoscopicos.length > 0 ? achadosTricoscopicos : (existente?.achadosTricoscopicos || ['Padrão tricoscópico característico']),
    achadosIds: existente?.achadosIds || [],
    significadoClinico: dados.significadoClinico?.trim() || existente?.significadoClinico || 'Avaliação dermatológica e correlação clínica especializada.',
    comoReconhecer: comoReconhecer.length > 0 ? comoReconhecer : (existente?.comoReconhecer || ['Diferenciação com base nos achados tricoscópicos']),
    padrao: dados.padrao?.trim() || existente?.padrao || 'Padrão clínico característico',
    localizacao: dados.localizacao?.trim() || existente?.localizacao || 'Couro cabeludo',
    diferenciaisComparações: existente?.diferenciaisComparações || [],
    referenciasRelacionadas: existente?.referenciasRelacionadas || [],
    resumoOriginal: dados.resumoOriginal?.trim() || existente?.resumoOriginal || dados.significadoClinico?.trim() || '',
    fontePagina: existente?.fontePagina || 1,
    outrasPaginas: existente?.outrasPaginas || []
  };

  // 1. Atualiza lista de casos customizados local
  const customizados = carregarCasosCustomizados();
  const idx = customizados.findIndex(c => c.id === idCaso);
  if (idx >= 0) {
    customizados[idx] = casoCompleto;
  } else {
    customizados.push(casoCompleto);
  }
  salvarCasosCustomizados(customizados);

  // 2. Remove de IDs excluídos caso estivesse antes
  const removidos = carregarIdsRemovidos();
  if (removidos.has(idCaso)) {
    removidos.delete(idCaso);
    salvarIdsRemovidos(removidos);
  }

  // 3. Atualiza memória e lista global do app
  const consolidada = consolidarCasos();
  sincronizarComCasosAtlasGlobal(consolidada);

  // 4. Salva no Firebase Firestore em segundo plano
  try {
    const docRef = doc(db, 'atlas_casos', idCaso);
    await setDoc(docRef, {
      ...casoCompleto,
      removido: false,
      updatedAt: new Date().toISOString()
    }, { merge: true });
  } catch (err) {
    console.warn('Aviso ao salvar caso no Firestore atlas_casos:', err);
  }

  return casoCompleto;
}

/**
 * Remove um caso do Atlas (exclui dos registros e limpa suas fotos no banco)
 */
export async function removerCasoAtlas(casoId: string): Promise<void> {
  if (!casoId) return;

  // 1. Adiciona aos removidos
  const removidos = carregarIdsRemovidos();
  removidos.add(casoId);
  salvarIdsRemovidos(removidos);

  // 2. Remove dos customizados locais se houver
  const customizados = carregarCasosCustomizados().filter(c => c.id !== casoId);
  salvarCasosCustomizados(customizados);

  // 3. Limpa todas as fotos deste caso do IndexedDB, Firestore e Storage
  try {
    await removerImagemCaso(casoId);
  } catch (err) {
    console.warn(`Aviso ao remover fotos do caso ${casoId}:`, err);
  }

  // 4. Atualiza memória e lista global do app imediatamente
  const consolidada = consolidarCasos();
  sincronizarComCasosAtlasGlobal(consolidada);

  // 5. Atualiza Firestore (marca como removido e remove doc)
  try {
    const docRef = doc(db, 'atlas_casos', casoId);
    await deleteDoc(docRef);
  } catch (err) {
    console.warn('Aviso ao remover do Firestore atlas_casos:', err);
  }
}

/**
 * Restaura todas as 17 condições originais do Atlas para a configuração de fábrica
 */
export async function restaurarCasosOriginais(): Promise<CasoAtlas[]> {
  if (typeof window !== 'undefined' && window.localStorage) {
    window.localStorage.removeItem(LS_CASOS_REMOVIDOS_KEY);
    window.localStorage.removeItem(LS_CASOS_CUSTOM_KEY);
  }

  const originais = [...CASOS_17_OFICIAIS];
  sincronizarComCasosAtlasGlobal(originais);

  return originais;
}
