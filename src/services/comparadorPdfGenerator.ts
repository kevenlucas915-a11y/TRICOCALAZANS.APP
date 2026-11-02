import { jsPDF } from 'jspdf';
import { Paciente } from '../types/paciente';
import { UsuarioProfissional } from '../types/usuario';
import { ItemFotoComparacao } from '../components/ComparadorPacienteView';

export interface DeltasMetricosComparador {
  fiosA: number;
  fiosB: number;
  deltaFios: number;
  pctFios: string | null;
  ufA: number;
  ufB: number;
  deltaUf: number;
  pctUf: string | null;
  ostiosA: number;
  ostiosB: number;
  deltaOstios: number;
}

export interface ComparativoAntesDepoisOptions {
  paciente: Paciente;
  profissional?: UsuarioProfissional | null;
  fotoA: ItemFotoComparacao;
  fotoB: ItemFotoComparacao;
  intervaloTexto?: string;
  diasIntervalo?: number;
  deltasMetricos?: DeltasMetricosComparador | null;
  observacoesClinicas?: string;
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

/**
 * Converte qualquer URL de imagem (Blob, DataURL ou link HTTP/Storage) em Base64 para inserção no jsPDF
 */
async function carregarImagemBase64(url: string): Promise<{ dataUrl: string; formato: 'JPEG' | 'PNG' } | null> {
  if (!url || typeof url !== 'string' || url.trim() === '') return null;

  // 1. Se já for Data URL
  if (url.startsWith('data:image/png')) return { dataUrl: url, formato: 'PNG' };
  if (url.startsWith('data:image/')) return { dataUrl: url, formato: 'JPEG' };

  // 2. Se for link remoto ou blob, tenta fetch direto
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
    // Em caso de falha de CORS no fetch, utiliza fallback com elemento HTML Image
  }

  // 3. Fallback com Image element + Canvas
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
          const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
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
 * Gera o documento A4 profissional contendo o comparativo Antes & Depois
 */
export async function gerarPdfComparativoAntesDepois(options: ComparativoAntesDepoisOptions): Promise<jsPDF> {
  const {
    paciente,
    profissional,
    fotoA,
    fotoB,
    intervaloTexto,
    deltasMetricos,
    observacoesClinicas
  } = options;

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const marginX = 14;
  const contentWidth = pageWidth - marginX * 2; // 182mm

  // Carregar imagens A e B em paralelo
  const [imgAData, imgBData, logoData] = await Promise.all([
    carregarImagemBase64(fotoA.url),
    carregarImagemBase64(fotoB.url),
    obterLogo(options.logoPngUrl, profissional) ? carregarImagemBase64(obterLogo(options.logoPngUrl, profissional)!) : Promise.resolve(null)
  ]);

  // =========================================================================
  // 1. CABEÇALHO ELEGANTE COM IDENTIFICAÇÃO DA CLÍNICA
  // =========================================================================
  // Faixa superior verde-petróleo (Teal 700)
  doc.setFillColor(15, 118, 110);
  doc.rect(0, 0, pageWidth, 4, 'F');

  // Container do Cabeçalho
  doc.setFillColor(248, 250, 252); // Slate 50
  doc.roundedRect(marginX, 7, contentWidth, 23, 2.5, 2.5, 'F');
  doc.setDrawColor(203, 213, 225); // Slate 300
  doc.roundedRect(marginX, 7, contentWidth, 23, 2.5, 2.5, 'S');

  let textOffsetX = 5;
  if (logoData && logoData.dataUrl) {
    try {
      doc.addImage(logoData.dataUrl, logoData.formato, marginX + 3.5, 8.5, 19, 19, undefined, 'FAST');
      textOffsetX = 26;
    } catch (e) {
      console.warn('Erro ao inserir logo no PDF Antes/Depois:', e);
    }
  }

  // Título e Subtítulo
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11.5);
  doc.setTextColor(15, 118, 110);
  doc.text('RELATÓRIO DE EVOLUÇÃO CLÍNICA — ANTES & DEPOIS', marginX + textOffsetX, 14.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text('Avaliação Comparativa & Telemetria do Tratamento Capilar', marginX + textOffsetX, 19.5);

  // Dados do Especialista (Alinhado à direita no Cabeçalho)
  const nomeProf = profissional?.nome || 'Especialista em Tricologia';
  const clinica = profissional?.nomeDoEspaco || profissional?.clinica || 'Consultório Clínico';
  const regProf = profissional?.registro ? ` · ${profissional.registro}` : '';

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text(`${clinica}`, pageWidth - marginX - 5, 13.5, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text(`${nomeProf}${regProf}`, pageWidth - marginX - 5, 18, { align: 'right' });

  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  const dataHoje = new Date().toLocaleDateString('pt-BR');
  doc.text(`Emissão: ${dataHoje}`, pageWidth - marginX - 5, 22.5, { align: 'right' });

  // =========================================================================
  // 2. FAIXA DE IDENTIFICAÇÃO DO PACIENTE E DADOS DO EXAME
  // =========================================================================
  const cardY = 32.5;
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(marginX, cardY, contentWidth, 14, 2, 2, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(marginX, cardY, contentWidth, 14, 2, 2, 'S');

  // Coluna 1: Paciente
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text('PACIENTE', marginX + 4, cardY + 4.5);
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text(paciente.nome, marginX + 4, cardY + 9.5);

  // Coluna 2: Telefone / WhatsApp
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text('CONTATO', marginX + 68, cardY + 4.5);
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text(paciente.telefone || 'Não informado', marginX + 68, cardY + 9.5);

  // Coluna 3: Região Anatômica
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text('REGIÃO ANALISADA', marginX + 112, cardY + 4.5);
  doc.setFontSize(8);
  doc.setTextColor(15, 118, 110);
  doc.text(fotoA.areaOuAngulo || fotoB.areaOuAngulo || 'Couro Cabeludo', marginX + 112, cardY + 9.5);

  // Coluna 4: Intervalo de Tratamento
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text('INTERVALO CLÍNICO', marginX + 152, cardY + 4.5);
  doc.setFontSize(8);
  doc.setTextColor(5, 150, 105);
  doc.text(intervaloTexto || 'Evolução', marginX + 152, cardY + 9.5);

  // =========================================================================
  // 3. SEÇÃO PRINCIPAL DE IMAGENS LADO A LADO (ANTES VS DEPOIS)
  // =========================================================================
  const fotosY = 49;
  const colWidth = 88; // 88mm cada coluna
  const gap = 6;
  const cardAltura = 104; // 104mm total

  // -------------------------------------------------------------------------
  // CARD ESQUERDA: LADO A (ANTES / REFERÊNCIA INICIAL)
  // -------------------------------------------------------------------------
  const colAX = marginX;
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(colAX, fotosY, colWidth, cardAltura, 2.5, 2.5, 'F');
  doc.setDrawColor(244, 63, 94); // Rose 500
  doc.setLineWidth(0.35);
  doc.roundedRect(colAX, fotosY, colWidth, cardAltura, 2.5, 2.5, 'S');

  // Banner do Header do Card A
  doc.setFillColor(255, 241, 242); // Rose 50
  doc.roundedRect(colAX, fotosY, colWidth, 9, 2.5, 2.5, 'F');
  doc.rect(colAX, fotosY + 6, colWidth, 3, 'F'); // remove canto inferior arredondado
  doc.setDrawColor(254, 205, 211);
  doc.line(colAX, fotosY + 9, colAX + colWidth, fotosY + 9);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(225, 29, 72); // Rose 600
  doc.text('ANTES • REFERÊNCIA INICIAL', colAX + 4, fotosY + 6);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  const dataAFormatada = new Date(fotoA.data).toLocaleDateString('pt-BR');
  doc.text(dataAFormatada, colAX + colWidth - 4, fotosY + 6, { align: 'right' });

  // Imagem A
  const imgBoxX = colAX + 3;
  const imgBoxY = fotosY + 11;
  const imgBoxW = 82;
  const imgBoxH = 70;

  doc.setFillColor(15, 23, 42); // Fundo escuro para a foto
  doc.roundedRect(imgBoxX, imgBoxY, imgBoxW, imgBoxH, 1.5, 1.5, 'F');

  if (imgAData && imgAData.dataUrl) {
    try {
      doc.addImage(imgAData.dataUrl, imgAData.formato, imgBoxX, imgBoxY, imgBoxW, imgBoxH, undefined, 'FAST');
    } catch (e) {
      console.warn('Erro ao inserir foto A no PDF:', e);
    }
  } else {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text('Fotografia não carregada', imgBoxX + imgBoxW / 2, imgBoxY + imgBoxH / 2, { align: 'center' });
  }

  // Rodapé do Card A: Detalhes e Métricas
  const rodapeAY = imgBoxY + imgBoxH + 3.5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(30, 41, 59);
  doc.text(`${fotoA.tipo === 'tricoscopia' ? 'Tricoscopia Digital' : 'Foto Clínica'} · ${fotoA.areaOuAngulo}`, colAX + 4, rodapeAY);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  const infoExtraA = fotoA.totalFios !== undefined 
    ? `Contagem: ${fotoA.totalFios} fios (${fotoA.totalUF || 0} UFs) · ${fotoA.ostiosVazios || 0} óstios vazios`
    : (fotoA.observacoes || 'Registro fotográfico inicial para acompanhamento.');
  doc.text(infoExtraA.length > 55 ? infoExtraA.slice(0, 52) + '...' : infoExtraA, colAX + 4, rodapeAY + 4.5);

  doc.setFontSize(6.5);
  doc.setTextColor(148, 163, 184);
  doc.text(`Identificador: ${fotoA.id.slice(0, 20)}`, colAX + 4, rodapeAY + 8.5);

  // -------------------------------------------------------------------------
  // CARD DIREITA: LADO B (DEPOIS / EVOLUÇÃO CLÍNICA)
  // -------------------------------------------------------------------------
  const colBX = colAX + colWidth + gap;
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(colBX, fotosY, colWidth, cardAltura, 2.5, 2.5, 'F');
  doc.setDrawColor(16, 185, 129); // Emerald 500
  doc.setLineWidth(0.35);
  doc.roundedRect(colBX, fotosY, colWidth, cardAltura, 2.5, 2.5, 'S');

  // Banner do Header do Card B
  doc.setFillColor(236, 253, 245); // Emerald 50
  doc.roundedRect(colBX, fotosY, colWidth, 9, 2.5, 2.5, 'F');
  doc.rect(colBX, fotosY + 6, colWidth, 3, 'F');
  doc.setDrawColor(167, 243, 208);
  doc.line(colBX, fotosY + 9, colBX + colWidth, fotosY + 9);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(5, 150, 105); // Emerald 600
  doc.text('DEPOIS • EVOLUÇÃO CLÍNICA', colBX + 4, fotosY + 6);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  const dataBFormatada = new Date(fotoB.data).toLocaleDateString('pt-BR');
  doc.text(dataBFormatada, colBX + colWidth - 4, fotosY + 6, { align: 'right' });

  // Imagem B
  const imgBBoxX = colBX + 3;
  const imgBBoxY = fotosY + 11;

  doc.setFillColor(15, 23, 42);
  doc.roundedRect(imgBBoxX, imgBBoxY, imgBoxW, imgBoxH, 1.5, 1.5, 'F');

  if (imgBData && imgBData.dataUrl) {
    try {
      doc.addImage(imgBData.dataUrl, imgBData.formato, imgBBoxX, imgBBoxY, imgBoxW, imgBoxH, undefined, 'FAST');
    } catch (e) {
      console.warn('Erro ao inserir foto B no PDF:', e);
    }
  } else {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text('Fotografia não carregada', imgBBoxX + imgBoxW / 2, imgBBoxY + imgBoxH / 2, { align: 'center' });
  }

  // Rodapé do Card B: Detalhes e Métricas
  const rodapeBY = imgBBoxY + imgBoxH + 3.5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(30, 41, 59);
  doc.text(`${fotoB.tipo === 'tricoscopia' ? 'Tricoscopia Digital' : 'Foto Clínica'} · ${fotoB.areaOuAngulo}`, colBX + 4, rodapeBY);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  const infoExtraB = fotoB.totalFios !== undefined 
    ? `Contagem: ${fotoB.totalFios} fios (${fotoB.totalUF || 0} UFs) · ${fotoB.ostiosVazios || 0} óstios vazios`
    : (fotoB.observacoes || 'Registro fotográfico evolutivo pós-tratamento.');
  doc.text(infoExtraB.length > 55 ? infoExtraB.slice(0, 52) + '...' : infoExtraB, colBX + 4, rodapeBY + 4.5);

  doc.setFontSize(6.5);
  doc.setTextColor(148, 163, 184);
  doc.text(`Identificador: ${fotoB.id.slice(0, 20)}`, colBX + 4, rodapeBY + 8.5);

  // =========================================================================
  // 4. PAINEL DE EVOLUÇÃO MÉTRICA / TELEMETRIA FOLICULAR (SE DISPONÍVEL)
  // =========================================================================
  let currentY = fotosY + cardAltura + 5; // ~158mm

  if (deltasMetricos) {
    const metricasAltura = 22;
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(marginX, currentY, contentWidth, metricasAltura, 2, 2, 'F');
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.2);
    doc.roundedRect(marginX, currentY, contentWidth, metricasAltura, 2, 2, 'S');

    const cardMW = (contentWidth - 6) / 4; // ~44mm cada

    // Item 1: Fios
    const m1X = marginX + 2;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(148, 163, 184);
    doc.text('CONTAGEM DE FIOS', m1X + 2, currentY + 5);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);
    doc.text(`${deltasMetricos.fiosA}  ➜  ${deltasMetricos.fiosB}`, m1X + 2, currentY + 11.5);

    const ganhoFios = deltasMetricos.deltaFios >= 0;
    doc.setFontSize(7.5);
    doc.setTextColor(ganhoFios ? 5 : 225, ganhoFios ? 150 : 29, ganhoFios ? 105 : 72);
    const sinalFios = deltasMetricos.deltaFios >= 0 ? `+${deltasMetricos.deltaFios}` : `${deltasMetricos.deltaFios}`;
    const pctFiosTexto = deltasMetricos.pctFios ? ` (${deltasMetricos.pctFios}%)` : '';
    doc.text(`${sinalFios} fios${pctFiosTexto}`, m1X + 2, currentY + 17);

    // Divisória vertical
    doc.setDrawColor(226, 232, 240);
    doc.line(m1X + cardMW, currentY + 3, m1X + cardMW, currentY + metricasAltura - 3);

    // Item 2: UFs
    const m2X = m1X + cardMW + 2;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(148, 163, 184);
    doc.text('UNIDADES FOLICULARES', m2X + 2, currentY + 5);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);
    doc.text(`${deltasMetricos.ufA}  ➜  ${deltasMetricos.ufB}`, m2X + 2, currentY + 11.5);

    const ganhoUf = deltasMetricos.deltaUf >= 0;
    doc.setFontSize(7.5);
    doc.setTextColor(ganhoUf ? 5 : 225, ganhoUf ? 150 : 29, ganhoUf ? 105 : 72);
    const sinalUf = deltasMetricos.deltaUf >= 0 ? `+${deltasMetricos.deltaUf}` : `${deltasMetricos.deltaUf}`;
    const pctUfTexto = deltasMetricos.pctUf ? ` (${deltasMetricos.pctUf}%)` : '';
    doc.text(`${sinalUf} UFs${pctUfTexto}`, m2X + 2, currentY + 17);

    doc.line(m2X + cardMW, currentY + 3, m2X + cardMW, currentY + metricasAltura - 3);

    // Item 3: Óstios Vazios
    const m3X = m2X + cardMW + 2;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(148, 163, 184);
    doc.text('ÓSTIOS VAZIOS', m3X + 2, currentY + 5);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);
    doc.text(`${deltasMetricos.ostiosA}  ➜  ${deltasMetricos.ostiosB}`, m3X + 2, currentY + 11.5);

    const melhoraOstios = deltasMetricos.deltaOstios <= 0;
    doc.setFontSize(7.5);
    doc.setTextColor(melhoraOstios ? 5 : 217, melhoraOstios ? 150 : 119, melhoraOstios ? 105 : 6);
    const sinalOstios = deltasMetricos.deltaOstios > 0 ? `+${deltasMetricos.deltaOstios}` : `${deltasMetricos.deltaOstios}`;
    doc.text(`${sinalOstios} óstios`, m3X + 2, currentY + 17);

    doc.line(m3X + cardMW, currentY + 3, m3X + cardMW, currentY + metricasAltura - 3);

    // Item 4: Tempo de Tratamento
    const m4X = m3X + cardMW + 2;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(148, 163, 184);
    doc.text('TEMPO DE RESPOSTA', m4X + 2, currentY + 5);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(15, 118, 110);
    const dias = options.diasIntervalo || 0;
    doc.text(`${dias} dias decorridos`, m4X + 2, currentY + 11.5);

    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    const semanas = Math.floor(dias / 7);
    doc.text(semanas > 0 ? `Equivalente a ~${semanas} semanas` : 'Acompanhamento imediato', m4X + 2, currentY + 17);

    currentY += metricasAltura + 5;
  }

  // =========================================================================
  // 5. PARECER CLÍNICO & ORIENTAÇÕES AO PACIENTE
  // =========================================================================
  const parecerAltura = deltasMetricos ? 32 : 52;
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(marginX, currentY, contentWidth, parecerAltura, 2, 2, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(marginX, currentY, contentWidth, parecerAltura, 2, 2, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(15, 118, 110);
  doc.text('PARECER CLÍNICO & ORIENTAÇÕES DO ESPECIALISTA', marginX + 4, currentY + 5.5);

  const textoParecer = observacoesClinicas && observacoesClinicas.trim() !== ''
    ? observacoesClinicas.trim()
    : `O exame comparativo da região (${fotoA.areaOuAngulo}) evidencia resposta clínica favorável no período de acompanhamento. Recomenda-se a continuidade rigorosa do protocolo terapêutico prescrito e retorno programado para reavaliação fototricoscópica.`;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(51, 65, 85);
  const linhasTexto = doc.splitTextToSize(textoParecer, contentWidth - 8);
  doc.text(linhasTexto, marginX + 4, currentY + 11);

  currentY += parecerAltura + 6;

  // =========================================================================
  // 6. ASSINATURA E IDENTIFICAÇÃO DO PROFISSIONAL
  // =========================================================================
  const assY = Math.min(currentY + 12, 268);
  const assX = pageWidth / 2;

  doc.setDrawColor(148, 163, 184);
  doc.setLineWidth(0.3);
  doc.line(assX - 45, assY, assX + 45, assY);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text(nomeProf, assX, assY + 4, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  const infoProf = [profissional?.titulo || 'Tricologia & Dermatologia', profissional?.registro, clinica].filter(Boolean).join(' · ');
  doc.text(infoProf, assX, assY + 8, { align: 'center' });

  // =========================================================================
  // 7. RODAPÉ DE PÁGINA (LEGAL / LGPD)
  // =========================================================================
  const rodapeY = pageHeight - 10;
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.2);
  doc.line(marginX, rodapeY - 3, pageWidth - marginX, rodapeY - 3);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text(`TricoCalazans — Manual & Prontuário Digital de Tricoscopia · Paciente: ${paciente.nome}`, marginX, rodapeY + 1);

  doc.text('Documento Clínico Confidencial', pageWidth - marginX, rodapeY + 1, { align: 'right' });

  return doc;
}

/**
 * Faz o download direto do PDF de Antes & Depois
 */
export async function baixarPdfComparativo(options: ComparativoAntesDepoisOptions): Promise<void> {
  const doc = await gerarPdfComparativoAntesDepois(options);
  const nomeLimpo = normalizarNome(options.paciente.nome);
  const dataIso = new Date().toISOString().split('T')[0];
  const nomeArquivo = `Evolucao_Antes_Depois_${nomeLimpo}_${dataIso}.pdf`;
  doc.save(nomeArquivo);
}

/**
 * Compartilha o PDF diretamente via WhatsApp / seletor nativo do dispositivo
 */
export async function compartilharPdfComparativo(options: ComparativoAntesDepoisOptions): Promise<boolean> {
  const doc = await gerarPdfComparativoAntesDepois(options);
  const nomeLimpo = normalizarNome(options.paciente.nome);
  const dataIso = new Date().toISOString().split('T')[0];
  const nomeArquivo = `Evolucao_Antes_Depois_${nomeLimpo}_${dataIso}.pdf`;

  const blob = doc.output('blob');
  const file = new File([blob], nomeArquivo, { type: 'application/pdf' });

  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({
        files: [file],
        title: `Evolução Clínica de ${options.paciente.nome}`,
        text: `Olá, ${options.paciente.nome}! Segue seu comparativo de evolução clínica capilar (Antes & Depois).`
      });
      return true;
    } catch (err: any) {
      if (err.name === 'AbortError') return false;
    }
  }

  // Fallback caso não suporte compartilhamento nativo de arquivos: faz download e abre WhatsApp
  doc.save(nomeArquivo);
  abrirWhatsAppComComparativo(options);
  return true;
}

/**
 * Monta texto estruturado e abre o WhatsApp com a mensagem personalizada da evolução
 */
export function abrirWhatsAppComComparativo(options: ComparativoAntesDepoisOptions): void {
  const { paciente, profissional, fotoA, fotoB, deltasMetricos, intervaloTexto } = options;
  const clinica = profissional?.nomeDoEspaco || profissional?.clinica || 'nossa clínica';
  const profNome = profissional?.nome || 'sua equipe de atendimento';

  let mensagem = `Olá, *${paciente.nome}*! 👋\n\n`;
  mensagem += `Aqui está o seu comparativo de *Evolução do Tratamento Capilar (Antes & Depois)* realizado na *${clinica}*.\n\n`;
  mensagem += `📍 *Região analisada:* ${fotoA.areaOuAngulo || 'Couro Cabeludo'}\n`;
  mensagem += `🗓️ *Período:* ${intervaloTexto || 'Em acompanhamento'}\n`;
  mensagem += `📅 *Foto Inicial:* ${new Date(fotoA.data).toLocaleDateString('pt-BR')}\n`;
  mensagem += `📅 *Foto Atual:* ${new Date(fotoB.data).toLocaleDateString('pt-BR')}\n`;

  if (deltasMetricos) {
    mensagem += `\n📊 *Resultados Observados:*\n`;
    if (deltasMetricos.deltaFios > 0) {
      mensagem += `• Ganho de fios: *+${deltasMetricos.deltaFios} fios* (${deltasMetricos.pctFios ? `+${deltasMetricos.pctFios}%` : ''})\n`;
    }
    if (deltasMetricos.deltaUf > 0) {
      mensagem += `• Unidades foliculares ativas: *+${deltasMetricos.deltaUf} UFs*\n`;
    }
    if (deltasMetricos.deltaOstios < 0) {
      mensagem += `• Redução de óstios vazios: *${deltasMetricos.deltaOstios}*\n`;
    }
  }

  mensagem += `\nParabéns pela dedicação ao seu protocolo de tratamento! Continuamos acompanhando sua evolução de perto.\n\n`;
  mensagem += `Atenciosamente,\n*${profNome}*`;

  const textoEncoded = encodeURIComponent(mensagem);
  const telefoneLimpo = paciente.telefone ? paciente.telefone.replace(/\D/g, '') : '';

  let urlWhatsApp = '';
  if (telefoneLimpo.length >= 10) {
    const ddi = telefoneLimpo.startsWith('55') ? '' : '55';
    urlWhatsApp = `https://wa.me/${ddi}${telefoneLimpo}?text=${textoEncoded}`;
  } else {
    urlWhatsApp = `https://wa.me/?text=${textoEncoded}`;
  }

  window.open(urlWhatsApp, '_blank', 'noopener,noreferrer');
}

