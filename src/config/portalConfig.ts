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
  
  const plano = (usuario.planoId || 'mensal') as string;
  const ciclo = usuario.planoCiclo;
  const status = usuario.planoStatus || 'trial';

  // Se for admin ou trial inicial completo, libera para teste
  if (status === 'trial' && plano !== 'mensal') {
    return true;
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

