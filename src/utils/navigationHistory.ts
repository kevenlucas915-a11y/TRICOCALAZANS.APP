/**
 * TRICOCALAZANS.APP — Sistema de Sincronização do Botão "Voltar" (Rotas e Modais)
 * 
 * Elimina fechamentos acidentais no celular/tablet (Android back button, iOS edge swipe, navegador).
 * Gerencia uma pilha LIFO (Last-In-First-Out) que prioriza:
 * 1. Fechar modais e gavetas abertas.
 * 2. Fechar visualizadores de fotos em tela cheia.
 * 3. Voltar de sub-abas/prontuários para a lista anterior.
 * 4. Navegar entre telas do aplicativo.
 * 5. Prevenir saída acidental na tela inicial ("Pressione Voltar novamente para sair").
 */

import { useEffect, useRef } from 'react';

export type BackHandlerCallback = () => void;

interface BackHandlerEntry {
  id: string;
  callback: BackHandlerCallback;
  timestamp: number;
}

// Pilha LIFO de manipuladores de retorno ativos
const handlerStack: BackHandlerEntry[] = [];

// Flag para suprimir o evento popstate quando um modal é fechado programaticamente (ex: botão "X")
let suprimirProximoPopstate = false;

// Controle de "Pressione voltar novamente para sair"
let ultimoCliqueVoltarTimestamp = 0;
let callbackAvisoSaida: ((mensagem: string) => void) | null = null;

/**
 * Registra o callback para exibir o aviso de saída segura
 */
export function registrarAvisoSaida(callback: (mensagem: string) => void): void {
  callbackAvisoSaida = callback;
}

/**
 * Registra um manipulador de retorno na pilha.
 * Quando o usuário pressiona "Voltar" no dispositivo, o callback mais recente é executado.
 */
export function registrarBackHandler(id: string, callback: BackHandlerCallback): () => void {
  const timestamp = Date.now();
  const entry: BackHandlerEntry = { id, callback, timestamp };
  handlerStack.push(entry);

  if (typeof window !== 'undefined' && window.history) {
    window.history.pushState({ tricoNavId: id, timestamp }, '');
  }

  // Retorna função de cleanup
  return () => {
    removerBackHandler(id);
  };
}

/**
 * Remove um manipulador da pilha quando o elemento fecha normalmente (sem popstate).
 */
export function removerBackHandler(id: string): void {
  const index = handlerStack.findIndex(h => h.id === id);
  if (index !== -1) {
    handlerStack.splice(index, 1);

    // Se o elemento fechado estava no topo do histórico do navegador, consome o pushState
    if (typeof window !== 'undefined' && window.history && window.history.state?.tricoNavId === id) {
      suprimirProximoPopstate = true;
      window.history.back();
      // Reset de segurança estendido para dispositivos móveis
      setTimeout(() => {
        suprimirProximoPopstate = false;
      }, 400);
    }
  }
}

/**
 * Hook React para conectar qualquer modal, gaveta ou sub-visão ao botão "Voltar"
 */
export function useBackHandler(ativo: boolean, callback: () => void, id: string): void {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  useEffect(() => {
    if (!ativo) return;

    const cleanup = registrarBackHandler(id, () => {
      callbackRef.current();
    });

    return () => {
      cleanup();
    };
  }, [ativo, id]);
}

/**
 * Converte o nome interno da tela para o caminho limpo de URL com barra ("barramento")
 */
export function obterPathDaTela(tela: string, extra?: Record<string, any>): string {
  switch (tela) {
    case 'painel':
      return '/';
    case 'planos':
      return '/planos';
    case 'pacientes':
      return '/pacientes';
    case 'captura':
      return '/captura';
    case 'anamnese':
      return '/anamnese';
    case 'exames':
      return '/exames';
    case 'calendario':
      return '/calendario';
    case 'atlas':
      return '/atlas';
    case 'perfil':
      return '/perfil';
    case 'area-do-cliente':
      return '/area-do-cliente';
    case 'login':
      return '/login';
    default:
      return `/${tela}`;
  }
}

/**
 * Converte um pathname da barra de endereços (ex: /planos, /vendas, /assinaturas) na tela correspondente
 */
export function obterTelaDoPath(pathname: string): string | null {
  if (!pathname) return null;
  const limpo = pathname.toLowerCase().replace(/\/+$/, '') || '/';

  if (limpo === '/' || limpo === '/painel') return 'painel';
  if (limpo === '/planos' || limpo === '/assinaturas' || limpo === '/vendas' || limpo === '/precos' || limpo === '/precos-e-planos') return 'planos';
  if (limpo === '/pacientes') return 'pacientes';
  if (limpo === '/captura' || limpo === '/bancada' || limpo === '/tricoscopia') return 'captura';
  if (limpo === '/anamnese') return 'anamnese';
  if (limpo === '/exames') return 'exames';
  if (limpo === '/calendario' || limpo === '/agenda') return 'calendario';
  if (limpo === '/atlas') return 'atlas';
  if (limpo === '/perfil' || limpo === '/meu-perfil') return 'perfil';
  if (limpo.startsWith('/area-do-cliente') || limpo.startsWith('/portal')) return 'area-do-cliente';
  if (limpo === '/login' || limpo === '/entrar') return 'login';

  return null;
}

/**
 * Notifica e sincroniza a navegação entre telas na barra de endereços (URL com barramento limpo)
 */
export function sincronizarRota(tela: string, extra?: Record<string, any>): void {
  if (typeof window === 'undefined' || !window.history) return;

  const path = obterPathDaTela(tela, extra);
  const search = window.location.search || '';
  const urlFinal = `${path}${search}`;

  const stateAtual = window.history.state;
  if (stateAtual?.tela === tela && window.location.pathname === path && !extra) return;

  window.history.pushState({ tela, ...extra }, '', urlFinal);
}

/**
 * Configuração do ouvinte global de popstate do navegador
 */
if (typeof window !== 'undefined') {
  window.addEventListener('popstate', (event) => {
    // 1. Se foi disparado programaticamente para limpar um modal já fechado, ignora
    if (suprimirProximoPopstate) {
      suprimirProximoPopstate = false;
      return;
    }

    // 2. Se houver modal, drawer ou visualizador na pilha, fecha o do topo
    if (handlerStack.length > 0) {
      const topHandler = handlerStack.pop();
      if (topHandler) {
        topHandler.callback();
      }
      return;
    }

    // 3. Se houver estado de tela gravado no evento de histórico
    const state = event.state;
    if (state && state.tela) {
      window.dispatchEvent(new CustomEvent('trico-navegar-tela', { detail: state }));
      return;
    }

    // 3.1 Se não houver state mas a URL pathname mudou (ex: navegação direta de URL)
    const telaPeloPath = obterTelaDoPath(window.location.pathname);
    if (telaPeloPath) {
      window.dispatchEvent(new CustomEvent('trico-navegar-tela', { detail: { tela: telaPeloPath } }));
      return;
    }

    // 4. Prevenção de fechamento acidental na raiz do aplicativo ("Duplo clique para sair")
    const agora = Date.now();
    if (agora - ultimoCliqueVoltarTimestamp < 2500) {
      // Segundo clique em menos de 2.5 segundos: permite fechar a aba/aplicativo
      return;
    }

    // Primeiro clique: avisa o profissional e evita fechamento acidental
    ultimoCliqueVoltarTimestamp = agora;
    if (callbackAvisoSaida) {
      callbackAvisoSaida('Pressione "Voltar" novamente para sair do aplicativo.');
    }

    // Reinsere estado de segurança no histórico para manter o app aberto
    window.history.pushState({ tela: 'painel', tricoRoot: true }, '', '/');
  });
}

