/**
 * Configurações de acesso e limites para a funcionalidade de Exames Laboratoriais e IA.
 */

// Plano mínimo para lançamento manual e visualização da tabela de exames
// Pro, Master, Anual ou Mensal (conforme mapeamento do sistema)
export const PLANO_MINIMO_EXAMES_MANUAL = 'pro';

// Plano mínimo liberado para uso do transcriptor de laudos por IA (fácil de trocar)
export const PLANO_MINIMO_IA = 'master';

// Limite mensal de leituras de laudo por IA
export const LIMITES_MENSAIS_IA: Record<string, number> = {
  master: 40,
  anual: 40,      // No fluxo comercial do app, o plano anual equivale ao pacote completo (Master)
  pro: 0,
  mensal: 0,
  gratuito: 0,
  starter: 0
};

// Tolerância percentual configurável para o status "Próximo do limite" (10% padrão)
export const PERCENTUAL_PROXIMO_LIMITE = 10;

// Hierarquia de planos para comparação
const HIERARQUIA_PLANOS: Record<string, number> = {
  starter: 0,
  gratuito: 0,
  pro: 1,
  mensal: 1,
  master: 2,
  anual: 2
};

/**
 * Verifica se o usuário tem permissão para a aba de Exames (manual / tabela)
 */
export function temPermissaoExamesManual(planoId?: string, status?: string): boolean {
  if (status === 'trial') return true;
  if (!planoId) return false;
  const nivel = HIERARQUIA_PLANOS[planoId.toLowerCase()] ?? 0;
  const nivelExigido = HIERARQUIA_PLANOS[PLANO_MINIMO_EXAMES_MANUAL] ?? 1;
  return nivel >= nivelExigido;
}

/**
 * Verifica se o usuário tem permissão para a leitura de laudos com IA
 */
export function temPermissaoExamesIa(planoId?: string, status?: string): boolean {
  if (status === 'trial') return true;
  if (!planoId) return false;
  const nivel = HIERARQUIA_PLANOS[planoId.toLowerCase()] ?? 0;
  const nivelExigido = HIERARQUIA_PLANOS[PLANO_MINIMO_IA] ?? 2;
  return nivel >= nivelExigido;
}

/**
 * Retorna o limite mensal de transcrições por IA
 */
export function obterLimiteMensalIa(planoId?: string, status?: string): number {
  if (status === 'trial') return 40;
  if (!planoId) return 0;
  return LIMITES_MENSAIS_IA[planoId.toLowerCase()] ?? 0;
}
