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
      // Reset de segurança
      setTimeout(() => {
        suprimirProximoPopstate = false;
      }, 150);
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
 * Notifica e sincroniza a navegação entre telas no histórico
 */
export function sincronizarRota(tela: string, extra?: Record<string, any>): void {
  if (typeof window === 'undefined' || !window.history) return;

  const stateAtual = window.history.state;
  if (stateAtual?.tela === tela && !extra) return;

  window.history.pushState({ tela, ...extra }, '', `?tela=${tela}`);
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
    window.history.pushState({ tela: 'painel', tricoRoot: true }, '');
  });
}

