import { ConfigIndicacoes, ItemHistoricoIndicacao, MetricasIndicadorUsuario } from '../types/indicacoes.ts';
import { LINKS_KIWIFY_DESCONTO } from '../types/assinatura.ts';

const CONFIG_PADRAO_FALLBACK: ConfigIndicacoes = {
  porcentagemPadrao: 10,
  cupomPadrao: 'TRICO10',
  diasBonusPadrao: 30,
  linkDescontoMensal: 'https://pay.kiwify.com.br/JafJtAb',
  linkDescontoAnual: 'https://pay.kiwify.com.br/xJvh2ab',
  influenciadores: []
};

export async function buscarConfigIndicacoes(): Promise<ConfigIndicacoes> {
  try {
    const res = await fetch('/api/indicacoes/config');
    if (res.ok) {
      const data = await res.json();
      if (data.sucesso && data.config) {
        return data.config;
      }
    }
  } catch (err) {
    console.warn('Erro ao carregar configuração de indicações, usando fallback:', err);
  }
  return CONFIG_PADRAO_FALLBACK;
}

export async function salvarConfigIndicacoes(config: Partial<ConfigIndicacoes>): Promise<ConfigIndicacoes> {
  const res = await fetch('/api/indicacoes/config', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(config)
  });

  if (!res.ok) {
    throw new Error('Falha ao salvar configuração no servidor.');
  }

  const data = await res.json();
  return data.config;
}

export async function buscarMinhasIndicacoes(email: string): Promise<MetricasIndicadorUsuario> {
  try {
    const res = await fetch(`/api/indicacoes/minhas?email=${encodeURIComponent(email)}`);
    if (res.ok) {
      const data = await res.json();
      if (data.sucesso && data.metricas) {
        return data.metricas;
      }
    }
  } catch (err) {
    console.warn('Erro ao buscar métricas de indicação:', err);
  }

  return {
    totalIndicados: 0,
    diasGanhosTotal: 0,
    ehInfluenciador: false,
    porcentagemDesconto: 10,
    codigoCupom: 'TRICO10',
    historico: []
  };
}

export async function buscarTodasIndicacoes(): Promise<ItemHistoricoIndicacao[]> {
  try {
    const res = await fetch('/api/indicacoes/todas');
    if (res.ok) {
      const data = await res.json();
      if (data.sucesso && Array.isArray(data.historico)) {
        return data.historico;
      }
    }
  } catch (err) {
    console.warn('Erro ao buscar histórico total de indicações:', err);
  }
  return [];
}

/**
 * Gera a URL oficial de checkout da Kiwify contendo a oferta com desconto e o identificador de quem indicou (src)
 */
export function gerarLinkIndicacaoKiwify(
  planoId: 'mensal' | 'anual',
  cupom: string,
  emailOuId: string,
  linkCustomizado?: string
): string {
  const urlBase = (linkCustomizado && linkCustomizado.trim()) 
    ? linkCustomizado.trim() 
    : (LINKS_KIWIFY_DESCONTO[planoId] || LINKS_KIWIFY_DESCONTO.mensal);

  try {
    const url = new URL(urlBase);
    if (cupom && cupom.trim() && cupom.toUpperCase() !== 'TRICO10') {
      url.searchParams.set('cupom', cupom.trim().toUpperCase());
    }
    if (emailOuId && emailOuId.trim()) {
      url.searchParams.set('src', emailOuId.trim().toLowerCase());
    }
    return url.toString();
  } catch {
    const params = [];
    if (cupom && cupom.trim() && cupom.toUpperCase() !== 'TRICO10') {
      params.push(`cupom=${encodeURIComponent(cupom.trim().toUpperCase())}`);
    }
    if (emailOuId) {
      params.push(`src=${encodeURIComponent(emailOuId.trim().toLowerCase())}`);
    }
    const query = params.length > 0 ? `?${params.join('&')}` : '';
    return `${urlBase}${query}`;
  }
}

/**
 * Mensagem recomendada para WhatsApp profissional
 */
export function gerarMensagemWhatsApp(
  nomeUsuario: string,
  porcentagemDesconto: number,
  cupom: string,
  linkCheckout: string
): string {
  const primeiroNome = (nomeUsuario || 'Colega').split(' ')[0];
  return `Olá! Aqui é ${primeiroNome}. Estou utilizando a plataforma *TricoCalazans* para minhas avaliações de fototricoscopia clínica e prontuário digital dos pacientes.\n\nConsegui liberar um desconto exclusivo de *${porcentagemDesconto}% OFF* com o cupom *${cupom}* para você testar a plataforma:\n\n👉 Acesse por este link: ${linkCheckout}\n\nRecomendo muito para modernizar seus atendimentos capilares!`;
}

