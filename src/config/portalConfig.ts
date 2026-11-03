import { PlanoId } from '../types/assinatura';

/**
 * Plano mínimo exigido para envio de acesso ao Portal do Paciente:
 * Exclusivo do Plano Anual (o Plano Mensal não inclui esta funcionalidade).
 */
export const NIVEL_MINIMO_PORTAL: string = 'anual';

/**
 * Verifica se a profissional possui permissão para convidar/enviar acesso ao Portal do Paciente.
 * - Plano Anual: Liberado ✓
 * - Plano Mensal: Bloqueado (requer upgrade para Anual) ✗
 */
export function profissionalTemAcessoPortal(usuario: any): boolean {
  if (!usuario) return false;
  
  const plano = (usuario.planoId || 'gratuito') as string;
  const ciclo = usuario.planoCiclo;

  // Plano Gratuito e Plano Degustação NUNCA têm acesso ao Portal do Paciente
  if (plano === 'gratuito' || plano === 'degustacao') {
    return false;
  }

  // Plano Anual (ou faturamento anual) tem acesso irrestrito
  if (plano === 'anual' || ciclo === 'anual' || plano === 'master') {
    return true;
  }

  // Plano Mensal NÃO inclui o envio de acesso ao Portal do Paciente
  if (plano === 'mensal' || ciclo === 'mensal') {
    return false;
  }

  return false;
}

