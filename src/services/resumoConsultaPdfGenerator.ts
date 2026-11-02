import { jsPDF } from 'jspdf';
import { Paciente } from '../types/paciente';
import { UsuarioProfissional } from '../types/usuario';

export interface FotoResumoConsulta {
  id: string;
  url: string;
  titulo?: string;
  area?: string;
}

export interface MetricasResumoConsulta {
  totalFios?: number;
  totalUF?: number;
  ostiosVazios?: number;
  focosInflamacao?: number;
  densidadeCm2?: number | string;
}

export interface ProdutoResumoConsulta {
  nome: string;
  comoUsar: string;
  observacao?: string;
}

export interface ResumoConsultaOptions {
  paciente: Paciente;
  profissional?: UsuarioProfissional | null;
  dataConsulta: string; // ISO (YYYY-MM-DD) ou formatada
  tipoConsulta: string; // ex: 'Primeira Avaliação', 'Retorno Clínico', 'Sessão Terapêutica'
  areaPrincipal?: string; // ex: 'Vértice / Vértex'
  queixaEvolucao?: string;
  condutaTratamento?: string;
  anotacoesClinicas?: string;
  fotos?: FotoResumoConsulta[];
  metricas?: MetricasResumoConsulta | null;
  produtos?: ProdutoResumoConsulta[];
  previsaoRetorno?: string; // ex: 'Retorno em 60 dias'
  logoPngUrl?: string;
}

function normalizarNome(nome: string): string {
  return nome
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '') || 'Paciente';
}

function obterLogo(optionsLogo?: string, profissional?: UsuarioProfissional | null): string | null {
  if (optionsLogo && (optionsLogo.startsWith('data:image') || optionsLogo.startsWith('http'))) {
    return optionsLogo;
  }
  try {
    const salvoLocal = localStorage.getItem('tricoview_logo_png');
    if (salvoLocal && (salvoLocal.startsWith('data:image') || salvoLocal.startsWith('http'))) {
      return salvoLocal;
    }
  } catch {}

  const profLogo = (profissional as any)?.logoUrl || profissional?.fotoUrl;
  if (profLogo && (profLogo.startsWith('data:image') || profLogo.startsWith('http'))) {
    return profLogo;
  }
  return null;
}

function formatarDataBr(dataIso: string): string {
  if (!dataIso) return new Date().toLocaleDateString('pt-BR');
  if (dataIso.includes('/')) return dataIso;
  const partes = dataIso.split('-');
  if (partes.length === 3) {
    return `${partes[2]}/${partes[1]}/${partes[0]}`;
  }
  try {
    return new Date(dataIso).toLocaleDateString('pt-BR');
  } catch {
    return dataIso;
  }
}

/**
 * Converte qualquer URL de imagem em Base64 compatível com jsPDF
 */
async function carregarImagemBase64(url: string): Promise<{ dataUrl: string; formato: 'JPEG' | 'PNG' } | null> {
  if (!url || typeof url !== 'string' || url.trim() === '') return null;

  if (url.startsWith('data:image/png')) return { dataUrl: url, formato: 'PNG' };
  if (url.startsWith('data:image/')) return { dataUrl: url, formato: 'JPEG' };

  try {
    const res = await fetch(url, { mode: 'cors' });
    if (res.ok) {
      const blob = await res.blob();
      return await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const result = reader.result as string;
          const formato = (blob.type === 'image/png' || url.toLowerCase().includes('.png')) ? 'PNG' : 'JPEG';
          resolve({ dataUrl: result, formato });
        };
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(blob);
      });
    }
  } catch {
    // Fallback CORS
  }

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || img.width || 800;
        canvas.height = img.naturalHeight || img.height || 600;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.90);
          resolve({ dataUrl, formato: 'JPEG' });
          return;
        }
      } catch {}
      resolve(null);
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

/**
 * Gera o Relatório / Resumo de Atendimento Consolidado em formato A4
 */
export async function gerarPdfResumoConsulta(options: ResumoConsultaOptions): Promise<jsPDF> {
  const {
    paciente,
    profissional,
    dataConsulta,
    tipoConsulta,
    areaPrincipal = 'Couro Cabeludo',
    queixaEvolucao,
    condutaTratamento,
    anotacoesClinicas,
    fotos = [],
    metricas,
    produtos = [],
    previsaoRetorno,
    logoPngUrl
  } = options;

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const marginX = 14;
  const contentWidth = pageWidth - marginX * 2;
  const bottomLimit = 278;

  const logoSrc = obterLogo(logoPngUrl, profissional);
  const dataAtendimentoFormatada = formatarDataBr(dataConsulta);
  const dataHoje = new Date().toLocaleDateString('pt-BR');

  // Cabeçalho de página
  const desenharCabecalho = (isFirstPage: boolean) => {
    doc.setFillColor(15, 118, 110); // Teal 700
    doc.rect(0, 0, pageWidth, 4, 'F');

    if (isFirstPage) {
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(marginX, 8, contentWidth, 24, 3, 3, 'F');
      doc.setDrawColor(203, 213, 225);
      doc.roundedRect(marginX, 8, contentWidth, 24, 3, 3, 'S');

      const temLogo = Boolean(logoSrc);
      const textOffsetX = temLogo ? 26 : 5;

      if (temLogo && logoSrc) {
        try {
          const fmt = logoSrc.startsWith('data:image/png') ? 'PNG' : 'JPEG';
          doc.addImage(logoSrc, fmt, marginX + 3.5, 9.5, 19, 19, undefined, 'FAST');
        } catch (e) {
          console.warn('Erro ao inserir logo no cabeçalho:', e);
        }
      }

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(temLogo ? 11.5 : 13);
      doc.setTextColor(15, 118, 110);
      doc.text('RESUMO DE ATENDIMENTO & TRICOSCOPIA', marginX + textOffsetX, 16.5);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      doc.text('Prontuário Integrado: Evolução Clínica, Registros e Conduta', marginX + textOffsetX, 22.5);

      const nomeProf = profissional?.nome || 'Especialista em Tricologia';
      const clinica = profissional?.nomeDoEspaco || profissional?.clinica || 'Consultório Clínico';
      const registro = profissional?.registro ? ` • ${profissional.registro}` : '';
      const contato = profissional?.telefone ? `Tel: ${profissional.telefone}` : '';

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(30, 41, 59);
      doc.text(nomeProf, pageWidth - marginX - 5, 15, { align: 'right' });

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(71, 85, 105);
      doc.text(`${clinica}${registro}`, pageWidth - marginX - 5, 19.5, { align: 'right' });
      if (contato) {
        doc.text(contato, pageWidth - marginX - 5, 24, { align: 'right' });
      }

      return 36;
    } else {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      doc.text(`Resumo de Atendimento • ${paciente.nome}`, marginX, 10);
      doc.text(`Data: ${dataAtendimentoFormatada}`, pageWidth - marginX, 10, { align: 'right' });

      doc.setDrawColor(226, 232, 240);
      doc.line(marginX, 12, pageWidth - marginX, 12);

      return 18;
    }
  };

  let currentY = desenharCabecalho(true);

  const checarQuebraPagina = (espacoNecessario: number) => {
    if (currentY + espacoNecessario > bottomLimit) {
      doc.addPage();
      currentY = desenharCabecalho(false);
    }
  };

  // 1. DADOS DO PACIENTE & CONSULTA
  const alturaBoxPaciente = 22;
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(marginX, currentY, contentWidth, alturaBoxPaciente, 2, 2, 'F');
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(marginX, currentY, contentWidth, alturaBoxPaciente, 2, 2, 'S');

  // Coluna Esquerda: Paciente
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text(`Paciente: ${paciente.nome}`, marginX + 4, currentY + 6.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  const infoNasc = paciente.dataNascimento ? `Nasc: ${formatarDataBr(paciente.dataNascimento)}` : 'Nasc não inf.';
  const infoTel = paciente.telefone ? `Tel/WhatsApp: ${paciente.telefone}` : 'Sem telefone';
  doc.text(`${infoNasc}   •   ${infoTel}`, marginX + 4, currentY + 12);

  if (paciente.email) {
    doc.text(`E-mail: ${paciente.email}`, marginX + 4, currentY + 17.5);
  }

  // Coluna Direita: Atendimento
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 118, 110);
  doc.text(`Atendimento: ${dataAtendimentoFormatada}`, pageWidth - marginX - 4, currentY + 6.5, { align: 'right' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(51, 65, 85);
  doc.text(`Tipo: ${tipoConsulta}`, pageWidth - marginX - 4, currentY + 12, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text(`Área Analisada: ${areaPrincipal}`, pageWidth - marginX - 4, currentY + 17.5, { align: 'right' });

  currentY += alturaBoxPaciente + 4;

  // 2. QUEIXA / EVOLUÇÃO CLÍNICA
  const textoQueixa = queixaEvolucao?.trim() || paciente.queixaPrincipal?.trim();
  if (textoQueixa) {
    checarQuebraPagina(18);
    doc.setFillColor(254, 252, 232); // Amarelo/Dourado suave
    doc.setDrawColor(254, 240, 138);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(133, 77, 14);
    doc.text('QUEIXA & MOTIVO DO ATENDIMENTO', marginX + 1, currentY);
    currentY += 3.5;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(51, 65, 85);
    const linhasQueixa = doc.splitTextToSize(textoQueixa, contentWidth - 8);
    const boxH = Math.max(10, linhasQueixa.length * 3.8 + 5);

    doc.roundedRect(marginX, currentY, contentWidth, boxH, 1.5, 1.5, 'F');
    doc.roundedRect(marginX, currentY, contentWidth, boxH, 1.5, 1.5, 'S');

    doc.text(linhasQueixa, marginX + 4, currentY + 4.5);
    currentY += boxH + 4;
  }

  // 3. TELEMETRIA FOLICULAR & AVALIAÇÃO TRICOSCÓPICA (SE HOUVER)
  const temMetricas = metricas && (
    metricas.totalFios !== undefined || 
    metricas.totalUF !== undefined || 
    metricas.ostiosVazios !== undefined || 
    metricas.focosInflamacao !== undefined
  );

  if (temMetricas) {
    checarQuebraPagina(22);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(15, 118, 110);
    doc.text('TELEMETRIA FOLICULAR COMPUTADORIZADA (TRICOSCOPIA)', marginX + 1, currentY);
    currentY += 3.5;

    const cards = [
      { label: 'Total de Fios', valor: metricas.totalFios?.toString() || '—', corBg: [240, 253, 250], corBorda: [204, 251, 241], corTxt: [13, 148, 136] },
      { label: 'Unidades Foliculares', valor: metricas.totalUF?.toString() || '—', corBg: [238, 242, 255], corBorda: [224, 231, 255], corTxt: [79, 70, 229] },
      { label: 'Óstios Vazios', valor: metricas.ostiosVazios?.toString() || '0', corBg: [254, 242, 242], corBorda: [254, 226, 226], corTxt: [225, 29, 72] },
      { label: 'Inflamação', valor: metricas.focosInflamacao !== undefined ? `${metricas.focosInflamacao} focos` : '0', corBg: [255, 251, 235], corBorda: [254, 243, 199], corTxt: [217, 119, 6] },
    ];

    const cardW = (contentWidth - 9) / 4;
    cards.forEach((card, idx) => {
      const cX = marginX + idx * (cardW + 3);
      doc.setFillColor(card.corBg[0], card.corBg[1], card.corBg[2]);
      doc.roundedRect(cX, currentY, cardW, 14, 1.5, 1.5, 'F');
      doc.setDrawColor(card.corBorda[0], card.corBorda[1], card.corBorda[2]);
      doc.roundedRect(cX, currentY, cardW, 14, 1.5, 1.5, 'S');

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.5);
      doc.setTextColor(100, 116, 139);
      doc.text(card.label, cX + cardW / 2, currentY + 4.5, { align: 'center' });

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(card.corTxt[0], card.corTxt[1], card.corTxt[2]);
      doc.text(card.valor, cX + cardW / 2, currentY + 11, { align: 'center' });
    });

    currentY += 18;
  }

  // 4. REGISTROS FOTOGRÁFICOS DA CONSULTA (SE HOUVER)
  const fotosValidas = fotos.filter(f => Boolean(f.url && f.url.trim() !== ''));
  if (fotosValidas.length > 0) {
    // Processar imagens em base64
    const fotosProcessadas: Array<{ dataUrl: string; formato: 'JPEG' | 'PNG'; titulo: string; area: string }> = [];
    for (const f of fotosValidas.slice(0, 4)) {
      const imgRes = await carregarImagemBase64(f.url);
      if (imgRes) {
        fotosProcessadas.push({
          dataUrl: imgRes.dataUrl,
          formato: imgRes.formato,
          titulo: f.titulo || 'Registro Fotográfico',
          area: f.area || areaPrincipal
        });
      }
    }

    if (fotosProcessadas.length > 0) {
      checarQuebraPagina(60);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(15, 118, 110);
      doc.text(`REGISTROS FOTOGRÁFICOS DO ATENDIMENTO (${fotosProcessadas.length} FOTOS)`, marginX + 1, currentY);
      currentY += 3.5;

      const numFotos = fotosProcessadas.length;
      if (numFotos === 1) {
        // 1 foto centrada
        const f = fotosProcessadas[0];
        const fotoW = 75;
        const fotoH = 50;
        const fotoX = marginX + (contentWidth - fotoW) / 2;

        try {
          doc.addImage(f.dataUrl, f.formato, fotoX, currentY, fotoW, fotoH, undefined, 'FAST');
          doc.setDrawColor(203, 213, 225);
          doc.rect(fotoX, currentY, fotoW, fotoH, 'S');

          doc.setFillColor(248, 250, 252);
          doc.rect(fotoX, currentY + fotoH - 5.5, fotoW, 5.5, 'F');
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(6.5);
          doc.setTextColor(51, 65, 85);
          doc.text(`${f.area} • ${f.titulo}`, fotoX + fotoW / 2, currentY + fotoH - 1.8, { align: 'center' });
        } catch {}
        currentY += fotoH + 5;
      } else {
        // 2 ou mais fotos (grid de 2 colunas)
        const colW = (contentWidth - 4) / 2;
        const fotoH = 44;

        for (let i = 0; i < fotosProcessadas.length; i += 2) {
          checarQuebraPagina(fotoH + 6);
          const f1 = fotosProcessadas[i];
          const f2 = fotosProcessadas[i + 1];

          // Foto 1
          try {
            doc.addImage(f1.dataUrl, f1.formato, marginX, currentY, colW, fotoH, undefined, 'FAST');
            doc.setDrawColor(203, 213, 225);
            doc.rect(marginX, currentY, colW, fotoH, 'S');

            doc.setFillColor(248, 250, 252);
            doc.rect(marginX, currentY + fotoH - 5.5, colW, 5.5, 'F');
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(6.5);
            doc.setTextColor(51, 65, 85);
            doc.text(`${f1.area} • ${f1.titulo}`, marginX + colW / 2, currentY + fotoH - 1.8, { align: 'center' });
          } catch {}

          // Foto 2 (se houver)
          if (f2) {
            try {
              const x2 = marginX + colW + 4;
              doc.addImage(f2.dataUrl, f2.formato, x2, currentY, colW, fotoH, undefined, 'FAST');
              doc.setDrawColor(203, 213, 225);
              doc.rect(x2, currentY, colW, fotoH, 'S');

              doc.setFillColor(248, 250, 252);
              doc.rect(x2, currentY + fotoH - 5.5, colW, 5.5, 'F');
              doc.setFont('helvetica', 'bold');
              doc.setFontSize(6.5);
              doc.setTextColor(51, 65, 85);
              doc.text(`${f2.area} • ${f2.titulo}`, x2 + colW / 2, currentY + fotoH - 1.8, { align: 'center' });
            } catch {}
          }

          currentY += fotoH + 4;
        }
      }
    }
  }

  // 5. CONDUTA TERAPÊUTICA & ANOTAÇÕES CLÍNICAS
  const textoConduta = condutaTratamento?.trim() || anotacoesClinicas?.trim();
  if (textoConduta) {
    checarQuebraPagina(24);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(15, 118, 110);
    doc.text('CONDUTA TERAPÊUTICA & ORIENTAÇÕES CLÍNICAS', marginX + 1, currentY);
    currentY += 3.5;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(30, 41, 59);
    const linhasConduta = doc.splitTextToSize(textoConduta, contentWidth - 8);
    const boxH = Math.max(12, linhasConduta.length * 3.8 + 6);

    doc.setFillColor(240, 253, 250); // Verde-água claríssimo
    doc.roundedRect(marginX, currentY, contentWidth, boxH, 1.5, 1.5, 'F');
    doc.setDrawColor(204, 251, 241);
    doc.roundedRect(marginX, currentY, contentWidth, boxH, 1.5, 1.5, 'S');

    doc.text(linhasConduta, marginX + 4, currentY + 5);
    currentY += boxH + 4;
  }

  // 6. PRESCRIÇÃO HOME CARE & PRODUTOS RECOMENDADOS (SE HOUVER)
  if (produtos.length > 0) {
    checarQuebraPagina(produtos.length * 12 + 10);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(15, 118, 110);
    doc.text('PRESCRIÇÃO DE CUIDADOS HOME CARE / PRODUTOS INDICADOS', marginX + 1, currentY);
    currentY += 3.5;

    produtos.forEach((prod, idx) => {
      checarQuebraPagina(14);
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(marginX, currentY, contentWidth, 11, 1.5, 1.5, 'F');
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(marginX, currentY, contentWidth, 11, 1.5, 1.5, 'S');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(15, 23, 42);
      doc.text(`${idx + 1}. ${prod.nome}`, marginX + 3.5, currentY + 4.2);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(71, 85, 105);
      doc.text(`Posologia: ${prod.comoUsar}`, marginX + 3.5, currentY + 8.2);

      if (prod.observacao) {
        doc.setFont('helvetica', 'italic');
        doc.setTextColor(100, 116, 139);
        doc.text(`(${prod.observacao})`, pageWidth - marginX - 3.5, currentY + 8.2, { align: 'right' });
      }

      currentY += 13;
    });
  }

  // 7. PREVISÃO DE RETORNO (DESTAQUE)
  if (previsaoRetorno && previsaoRetorno.trim() !== '') {
    checarQuebraPagina(16);
    doc.setFillColor(241, 245, 249);
    doc.roundedRect(marginX, currentY, contentWidth, 10, 1.5, 1.5, 'F');
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(marginX, currentY, contentWidth, 10, 1.5, 1.5, 'S');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(15, 118, 110);
    doc.text('📅 PRÓXIMO RETORNO PROGRAMADO:', marginX + 4, currentY + 6.2);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(30, 41, 59);
    doc.text(previsaoRetorno, marginX + 54, currentY + 6.2);

    currentY += 14;
  }

  // 8. ASSINATURA E ENCERRAMENTO
  checarQuebraPagina(24);
  currentY += 4;
  doc.setDrawColor(148, 163, 184);
  doc.line(marginX + contentWidth / 4, currentY + 10, marginX + (3 * contentWidth) / 4, currentY + 10);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(30, 41, 59);
  doc.text(profissional?.nome || 'Especialista em Tricologia', pageWidth / 2, currentY + 14.5, { align: 'center' });

  if (profissional?.registro) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text(profissional.registro, pageWidth / 2, currentY + 18.5, { align: 'center' });
  }

  // Rodapé das páginas
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setDrawColor(226, 232, 240);
    doc.line(marginX, pageHeight - 11, pageWidth - marginX, pageHeight - 11);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(148, 163, 184);
    doc.text(`Prontuário de Atendimento • ${paciente.nome} • Emitido em ${dataHoje}`, marginX, pageHeight - 6.5);
    doc.text(`Página ${i} de ${totalPages}`, pageWidth - marginX, pageHeight - 6.5, { align: 'right' });
  }

  return doc;
}

/**
 * Faz o download do arquivo PDF do Resumo da Consulta
 */
export async function baixarPdfResumoConsulta(options: ResumoConsultaOptions): Promise<void> {
  const doc = await gerarPdfResumoConsulta(options);
  const nomeLimpo = normalizarNome(options.paciente.nome);
  const dataArquivo = options.dataConsulta.replace(/[^0-9]/g, '') || new Date().toISOString().split('T')[0];
  const nomeArquivo = `Resumo_Atendimento_${nomeLimpo}_${dataArquivo}.pdf`;
  doc.save(nomeArquivo);
}

/**
 * Compartilha o PDF diretamente via Web Share API
 */
export async function compartilharPdfResumoConsulta(options: ResumoConsultaOptions): Promise<boolean> {
  const doc = await gerarPdfResumoConsulta(options);
  const nomeLimpo = normalizarNome(options.paciente.nome);
  const dataArquivo = options.dataConsulta.replace(/[^0-9]/g, '') || new Date().toISOString().split('T')[0];
  const nomeArquivo = `Resumo_Atendimento_${nomeLimpo}_${dataArquivo}.pdf`;

  const blob = doc.output('blob');
  const file = new File([blob], nomeArquivo, { type: 'application/pdf' });

  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({
        files: [file],
        title: `Resumo de Atendimento • ${options.paciente.nome}`,
        text: `Olá, ${options.paciente.nome}! Segue o resumo do seu atendimento de Tricologia realizado em ${formatarDataBr(options.dataConsulta)}.`
      });
      return true;
    } catch (err: any) {
      if (err.name === 'AbortError') return false;
    }
  }

  // Fallback: download direto e sugestão de envio no WhatsApp
  doc.save(nomeArquivo);
  enviarResumoConsultaWhatsApp(options);
  return true;
}

/**
 * Abre o WhatsApp com texto estruturado do atendimento
 */
export function enviarResumoConsultaWhatsApp(options: ResumoConsultaOptions): void {
  const { paciente, dataConsulta, profissional, condutaTratamento, produtos = [], previsaoRetorno } = options;
  const dataFmt = formatarDataBr(dataConsulta);

  let msg = `Olá, *${paciente.nome}*! 👋\n\n`;
  msg += `Aqui está o resumo da sua consulta de tricologia realizada em *${dataFmt}*:\n\n`;

  if (condutaTratamento && condutaTratamento.trim() !== '') {
    msg += `📋 *Orientações & Conduta:*\n${condutaTratamento.trim()}\n\n`;
  }

  if (produtos.length > 0) {
    msg += `🧴 *Cuidados Home Care Recomendados:*\n`;
    produtos.forEach((p, idx) => {
      msg += `• *${p.nome}*: ${p.comoUsar}\n`;
    });
    msg += `\n`;
  }

  if (previsaoRetorno && previsaoRetorno.trim() !== '') {
    msg += `📅 *Previsão do Próximo Retorno:* ${previsaoRetorno}\n\n`;
  }

  msg += `O seu laudo fotográfico em PDF foi emitido pela clínica.\n`;
  msg += `Qualquer dúvida estamos à disposição! ✨\n`;
  msg += `_${profissional?.nomeDoEspaco || profissional?.clinica || profissional?.nome || 'Clínica de Tricologia'}_`;

  const textoEncoded = encodeURIComponent(msg);
  const telefoneLimpo = (paciente.telefone || '').replace(/\D/g, '');

  let urlWhatsApp = '';
  if (telefoneLimpo.length >= 10) {
    const ddi = telefoneLimpo.startsWith('55') ? '' : '55';
    urlWhatsApp = `https://wa.me/${ddi}${telefoneLimpo}?text=${textoEncoded}`;
  } else {
    urlWhatsApp = `https://wa.me/?text=${textoEncoded}`;
  }

  window.open(urlWhatsApp, '_blank', 'noopener,noreferrer');
}

