import { CategoriaExame, ItemExame, SituacaoMarcador } from '../types/exames';
import { PERCENTUAL_PROXIMO_LIMITE } from '../config/planos';

/**
 * Converte string de valor para número, tratando formatos brasileiros (ex: '12,5' -> 12.5)
 */
export function converterParaNumero(valStr: string | number | null | undefined): number | null {
  if (valStr === null || valStr === undefined) return null;
  if (typeof valStr === 'number') return isNaN(valStr) ? null : valStr;

  const limpo = String(valStr)
    .trim()
    .replace(/\s+/g, '')
    .replace(',', '.');

  // Extrai o primeiro número com ponto decimal opcional (ex: "> 10.5" -> 10.5)
  const match = limpo.match(/-?\d+(?:\.\d+)?/);
  if (!match) return null;

  const num = parseFloat(match[0]);
  return isNaN(num) ? null : num;
}

/**
 * Calcula a situação do exame comparando o valor com a faixa de referência do laboratório.
 * Executado estritamente por código lógico (NUNCA pela IA).
 * Não utiliza termos patológicos, diagnósticos ou de prescrição.
 */
export function calcularSituacaoMarcador(
  valorStr: string,
  minimo?: number | null,
  maximo?: number | null,
  percentualLimite: number = PERCENTUAL_PROXIMO_LIMITE
): SituacaoMarcador {
  const valorNum = converterParaNumero(valorStr);

  // Se o valor não for numérico ou se não houver nenhuma referência no laudo
  if (valorNum === null || (minimo === null && maximo === null) || (minimo === undefined && maximo === undefined)) {
    return 'Sem referência no laudo';
  }

  const temMin = typeof minimo === 'number' && !isNaN(minimo);
  const temMax = typeof maximo === 'number' && !isNaN(maximo);

  if (!temMin && !temMax) {
    return 'Sem referência no laudo';
  }

  // Caso 1: Faixa completa (mínimo e máximo)
  if (temMin && temMax) {
    if (valorNum < minimo!) {
      return 'Abaixo da faixa';
    }
    if (valorNum > maximo!) {
      return 'Acima da faixa';
    }

    // Está dentro da faixa. Verificar proximidade dos limites (tolerância percentual da amplitude)
    const amplitude = maximo! - minimo!;
    const tolerancia = amplitude > 0 ? amplitude * (percentualLimite / 100) : 0;

    const proximoMinimo = valorNum <= minimo! + tolerancia;
    const proximoMaximo = valorNum >= maximo! - tolerancia;

    if (proximoMinimo || proximoMaximo) {
      return 'Próximo do limite';
    }

    return 'Dentro da faixa';
  }

  // Caso 2: Apenas limite mínimo (ex: > 30)
  if (temMin && !temMax) {
    if (valorNum < minimo!) {
      return 'Abaixo da faixa';
    }
    // Margem de 10% acima do mínimo
    const margem = Math.abs(minimo!) * (percentualLimite / 100) || 1;
    if (valorNum <= minimo! + margem) {
      return 'Próximo do limite';
    }
    return 'Dentro da faixa';
  }

  // Caso 3: Apenas limite máximo (ex: < 100)
  if (!temMin && temMax) {
    if (valorNum > maximo!) {
      return 'Acima da faixa';
    }
    // Margem de 10% abaixo do máximo
    const margem = Math.abs(maximo!) * (percentualLimite / 100) || 1;
    if (valorNum >= maximo! - margem) {
      return 'Próximo do limite';
    }
    return 'Dentro da faixa';
  }

  return 'Sem referência no laudo';
}

/**
 * Dedução automática de categoria com base no nome do marcador
 */
export function deduzirCategoria(nomeMarcador: string): CategoriaExame {
  const norm = nomeMarcador.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  if (/hemo|hemat|plaquet|leuco|linfoc|neutrof|vcm|hcm|chcm|rdw|eosi|baso|mono|eritro/.test(norm)) {
    return 'Hemograma';
  }
  if (/ferr|transf|saturacao de transf|ferro|ctlf/.test(norm)) {
    return 'Ferro';
  }
  if (/vitamina|zinco|acido folico|folato|magnesio|calcio|fosforo|cobre|selenio|b12|cobalamina|25-hidroxi/.test(norm)) {
    return 'Vitaminas e minerais';
  }
  if (/tsh|t4|t3|tireo|tpo|trab|tireoglobulina/.test(norm)) {
    return 'Tireoide';
  }
  if (/dht|di-hidro|testost|estradi|progest|prolact|dhea|cortisol|lh|fsh|shbg|androstenediona/.test(norm)) {
    return 'Hormônios';
  }
  if (/glicem|hba1c|glicada|insulina|homa/.test(norm)) {
    return 'Glicemia';
  }
  if (/colest|trigli|hdl|ldl|vldl|lipid/.test(norm)) {
    return 'Lipídios';
  }
  if (/tgo|tgp|ast|alt|gama-gt|ggt|fosfatase alcalina|bilirrub/.test(norm)) {
    return 'Fígado';
  }
  if (/creatin|ureia|tfg|acido urico|clearence/.test(norm)) {
    return 'Rins';
  }
  if (/pcr|proteina c reativa|vhs|homocist/.test(norm)) {
    return 'Inflamação';
  }

  return 'Outros';
}

/**
 * Agrupa itens de exames pelas categorias pré-definidas
 */
export function agruparPorCategoria(itens: ItemExame[]): Record<CategoriaExame, ItemExame[]> {
  const ordemCategorias: CategoriaExame[] = [
    'Hemograma',
    'Ferro',
    'Vitaminas e minerais',
    'Tireoide',
    'Hormônios',
    'Glicemia',
    'Lipídios',
    'Fígado',
    'Rins',
    'Inflamação',
    'Outros'
  ];

  const grupos = ordemCategorias.reduce((acc, cat) => {
    acc[cat] = [];
    return acc;
  }, {} as Record<CategoriaExame, ItemExame[]>);

  for (const item of itens) {
    const cat = item.categoria || deduzirCategoria(item.marcador);
    if (!grupos[cat]) {
      grupos['Outros'].push(item);
    } else {
      grupos[cat].push(item);
    }
  }

  return grupos;
}

/**
 * Retorna se o item está fora da faixa ou no limite de alerta
 */
export function isForaDaFaixa(situacao?: SituacaoMarcador): boolean {
  return situacao === 'Abaixo da faixa' || situacao === 'Acima da faixa' || situacao === 'Próximo do limite';
}
