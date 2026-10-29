import { jsPDF } from 'jspdf';
import { RespostaAnamnese, RespostaItemAnamnese } from '../types/anamnese';
import { UsuarioProfissional } from '../types/usuario';

export interface AnamnesePdfOptions {
  resposta: RespostaAnamnese;
  profissional?: UsuarioProfissional | null;
  logoPngUrl?: string;
}

export interface TodasAnamnesesPdfOptions {
  respostas: RespostaAnamnese[];
  pacienteNome?: string;
  profissional?: UsuarioProfissional | null;
  logoPngUrl?: string;
}

function normalizarNomeArquivo(nome: string): string {
  return nome
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '') || 'Paciente';
}

function obterLogoPng(optionsLogo?: string, profissional?: UsuarioProfissional | null): string | null {
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

function detectarFormato(src: string): 'PNG' | 'JPEG' {
  if (src.startsWith('data:image/png') || src.toLowerCase().includes('.png')) {
    return 'PNG';
  }
  return 'JPEG';
}

/**
 * Desenha o cabeçalho padrão com Logo em PNG e dados do especialista
 */
function desenharCabecalhoPadrao(
  doc: jsPDF,
  tituloDocumento: string,
  subtitulo: string,
  profissional: UsuarioProfissional | null | undefined,
  logoSrc: string | null,
  pageWidth: number,
  marginX: number,
  contentWidth: number,
  isFirstPage: boolean,
  identificadorHeader?: string
): number {
  // Faixa superior com acento Teal
  doc.setFillColor(15, 118, 110); // Teal 700
  doc.rect(0, 0, pageWidth, 4, 'F');

  if (isFirstPage) {
    // Card do cabeçalho
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(marginX, 8, contentWidth, 24, 3, 3, 'F');
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(marginX, 8, contentWidth, 24, 3, 3, 'S');

    const temLogo = Boolean(logoSrc);
    const textOffsetX = temLogo ? 26 : 5;

    // Inserção da Logo em PNG no cabeçalho
    if (temLogo && logoSrc) {
      try {
        const fmt = detectarFormato(logoSrc);
        doc.addImage(logoSrc, fmt, marginX + 3.5, 9.5, 19, 19, undefined, 'FAST');
      } catch (e) {
        console.warn('Erro ao inserir logo PNG no documento PDF:', e);
      }
    }

    // Título Principal
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(temLogo ? 12 : 13.5);
    doc.setTextColor(15, 118, 110);
    doc.text(tituloDocumento.toUpperCase(), marginX + textOffsetX, 17);

    // Subtítulo
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(temLogo ? 7.5 : 8.5);
    doc.setTextColor(100, 116, 139);
    doc.text(subtitulo, marginX + textOffsetX, 23);

    // Dados da Clínica / Profissional à direita
    const nomeProf = profissional?.nome || 'Especialista em Tricologia';
    const clinica = profissional?.nomeDoEspaco || profissional?.clinica || 'Consultório Clínico';
    const registro = profissional?.registro ? ` • ${profissional.registro}` : '';
    const contato = profissional?.telefone ? `Tel: ${profissional.telefone}` : '';

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(30, 41, 59);
    doc.text(nomeProf, pageWidth - marginX - 5, 15, { align: 'right' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(71, 85, 105);
    doc.text(`${clinica}${registro}`, pageWidth - marginX - 5, 20, { align: 'right' });
    if (contato) {
      doc.text(contato, pageWidth - marginX - 5, 25, { align: 'right' });
    }

    return 38;
  } else {
    // Cabeçalho discreto das páginas seguintes
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(identificadorHeader || tituloDocumento, marginX, 10);
    doc.text(`Tricocare Pro • Laudo Clínico`, pageWidth - marginX, 10, { align: 'right' });

    doc.setDrawColor(226, 232, 240);
    doc.line(marginX, 12, pageWidth - marginX, 12);

    return 18;
  }
}

/**
 * Desenha o rodapé padrão com paginação
 */
function desenharRodapePadrao(doc: jsPDF, pageWidth: number, pageHeight: number, marginX: number) {
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setDrawColor(226, 232, 240);
    doc.line(marginX, pageHeight - 12, pageWidth - marginX, pageHeight - 12);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    doc.text('Documento emitido digitalmente • Uso exclusivo profissional para acompanhamento capilar', marginX, pageHeight - 7);
    doc.text(`Página ${i} de ${totalPages}`, pageWidth - marginX, pageHeight - 7, { align: 'right' });
  }
}

/**
 * Gera PDF de uma única Resposta de Anamnese
 */
export function gerarDocumentoPdfAnamnese(options: AnamnesePdfOptions): jsPDF {
  const { resposta, profissional } = options;
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const marginX = 14;
  const contentWidth = pageWidth - marginX * 2;
  const bottomLimit = 275;

  const logoSrc = obterLogoPng(options.logoPngUrl, profissional);
  const dataFormatada = new Date(resposta.dataPreenchimento || resposta.createdAt).toLocaleString('pt-BR');

  let currentY = desenharCabecalhoPadrao(
    doc,
    resposta.modeloTitulo || 'Laudo de Anamnese',
    'Questionário e Avaliação Clínica de Tricologia',
    profissional,
    logoSrc,
    pageWidth,
    marginX,
    contentWidth,
    true
  );

  const checarQuebraPagina = (espacoNecessario: number) => {
    if (currentY + espacoNecessario > bottomLimit) {
      doc.addPage();
      currentY = desenharCabecalhoPadrao(
        doc,
        resposta.modeloTitulo,
        '',
        profissional,
        logoSrc,
        pageWidth,
        marginX,
        contentWidth,
        false,
        `${resposta.modeloTitulo} • ${resposta.pacienteNome}`
      );
    }
  };

  // Card do Paciente e Metadados
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(marginX, currentY, contentWidth, 18, 2, 2, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(marginX, currentY, contentWidth, 18, 2, 2, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(30, 41, 59);
  doc.text(`Paciente: ${resposta.pacienteNome}`, marginX + 4, currentY + 7);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text(`Data do Atendimento: ${dataFormatada}`, marginX + 4, currentY + 13);
  doc.text(`Status: ${resposta.status === 'rascunho' ? 'Rascunho' : 'Finalizada e Assinada'}`, pageWidth - marginX - 4, currentY + 7, { align: 'right' });
  doc.text(`Total de Questões: ${resposta.respostas.length}`, pageWidth - marginX - 4, currentY + 13, { align: 'right' });

  currentY += 24;

  // Questões Respondidas
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(15, 118, 110);
  doc.text('RESPOSTAS COLETADAS NA AVALIAÇÃO', marginX, currentY);
  currentY += 5;

  if (resposta.respostas.length === 0) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8.5);
    doc.setTextColor(148, 163, 184);
    doc.text('Nenhuma resposta registrada neste questionário.', marginX, currentY + 4);
    currentY += 12;
  } else {
    resposta.respostas.forEach((item: RespostaItemAnamnese, idx: number) => {
      checarQuebraPagina(18);

      // Box da pergunta
      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(226, 232, 240);
      
      const tituloTexto = `${idx + 1}. ${item.perguntaTitulo}`;
      const linhasTitulo = doc.splitTextToSize(tituloTexto, contentWidth - 8);

      let valorTexto = 'Não informado';
      if (Array.isArray(item.valor)) {
        valorTexto = item.valor.length > 0 ? item.valor.join(', ') : 'Nenhum selecionado';
      } else if (typeof item.valor === 'boolean') {
        valorTexto = item.valor ? 'Sim' : 'Não';
      } else if (item.valor !== undefined && item.valor !== null && String(item.valor).trim() !== '') {
        valorTexto = String(item.valor);
      }
      const linhasValor = doc.splitTextToSize(valorTexto, contentWidth - 8);

      const alturaItem = Math.max(12, (linhasTitulo.length * 4.5) + (linhasValor.length * 4) + 6);
      checarQuebraPagina(alturaItem + 2);

      doc.roundedRect(marginX, currentY, contentWidth, alturaItem, 2, 2, 'F');
      doc.roundedRect(marginX, currentY, contentWidth, alturaItem, 2, 2, 'S');

      // Título da Pergunta
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(30, 41, 59);
      doc.text(linhasTitulo, marginX + 4, currentY + 5);

      // Resposta
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(15, 118, 110);
      const offsetValorY = currentY + 5 + (linhasTitulo.length * 4.5);
      doc.text(linhasValor, marginX + 4, offsetValorY);

      currentY += alturaItem + 3;
    });
  }

  // Parecer / Anotações do Especialista
  if (resposta.anotacoesEspecialista && resposta.anotacoesEspecialista.trim()) {
    checarQuebraPagina(25);
    currentY += 4;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(15, 118, 110);
    doc.text('PARECER CLÍNICO DO ESPECIALISTA', marginX, currentY);
    currentY += 5;

    const linhasAnotacao = doc.splitTextToSize(resposta.anotacoesEspecialista, contentWidth - 8);
    const boxHeight = Math.max(14, (linhasAnotacao.length * 4.5) + 8);
    checarQuebraPagina(boxHeight + 4);

    doc.setFillColor(240, 253, 250); // Teal 50
    doc.setDrawColor(204, 251, 241);
    doc.roundedRect(marginX, currentY, contentWidth, boxHeight, 2, 2, 'F');
    doc.roundedRect(marginX, currentY, contentWidth, boxHeight, 2, 2, 'S');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(19, 78, 74);
    doc.text(linhasAnotacao, marginX + 4, currentY + 6);

    currentY += boxHeight + 6;
  }

  // Assinatura do profissional no rodapé da última página
  checarQuebraPagina(24);
  currentY += 8;
  doc.setDrawColor(148, 163, 184);
  doc.line(marginX + contentWidth / 4, currentY + 12, marginX + (3 * contentWidth) / 4, currentY + 12);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(30, 41, 59);
  doc.text(profissional?.nome || 'Especialista Responsável', pageWidth / 2, currentY + 16, { align: 'center' });

  if (profissional?.registro) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text(profissional.registro, pageWidth / 2, currentY + 20, { align: 'center' });
  }

  desenharRodapePadrao(doc, pageWidth, pageHeight, marginX);
  return doc;
}

/**
 * Gera um Dossiê Consolidado com TODAS as anamneses em um único arquivo PDF
 */
export function gerarDocumentoPdfTodasRespostas(options: TodasAnamnesesPdfOptions): jsPDF {
  const { respostas, pacienteNome, profissional } = options;
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const marginX = 14;
  const contentWidth = pageWidth - marginX * 2;
  const bottomLimit = 275;

  const logoSrc = obterLogoPng(options.logoPngUrl, profissional);
  const dataHoje = new Date().toLocaleDateString('pt-BR');

  let currentY = desenharCabecalhoPadrao(
    doc,
    'Dossiê Completo de Anamneses',
    'Relatório Consolidado de Histórico e Avaliações Tricológicas',
    profissional,
    logoSrc,
    pageWidth,
    marginX,
    contentWidth,
    true
  );

  const checarQuebraPagina = (espacoNecessario: number) => {
    if (currentY + espacoNecessario > bottomLimit) {
      doc.addPage();
      currentY = desenharCabecalhoPadrao(
        doc,
        'Dossiê Completo de Anamneses',
        '',
        profissional,
        logoSrc,
        pageWidth,
        marginX,
        contentWidth,
        false,
        `Dossiê Consolidado • ${pacienteNome || 'Histórico Geral'}`
      );
    }
  };

  // Card Resumo do Dossiê
  doc.setFillColor(240, 253, 250); // Teal 50
  doc.roundedRect(marginX, currentY, contentWidth, 22, 2, 2, 'F');
  doc.setDrawColor(153, 246, 228);
  doc.roundedRect(marginX, currentY, contentWidth, 22, 2, 2, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 118, 110);
  doc.text(pacienteNome ? `Prontuário do Paciente: ${pacienteNome}` : 'Relatório Geral de Todas as Anamneses', marginX + 4, currentY + 7);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text(`Data de Emissão do Dossiê: ${dataHoje}`, marginX + 4, currentY + 13);
  doc.text(`Total de Formulários Incluídos: ${respostas.length} avaliações`, marginX + 4, currentY + 18);
  doc.text(`Especialista: ${profissional?.nome || 'Não informado'}`, pageWidth - marginX - 4, currentY + 13, { align: 'right' });
  doc.text(`Clínica: ${profissional?.nomeDoEspaco || profissional?.clinica || 'Tricocare Pro'}`, pageWidth - marginX - 4, currentY + 18, { align: 'right' });

  currentY += 28;

  // Índice de Anamneses
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(30, 41, 59);
  doc.text('ÍNDICE DAS AVALIAÇÕES CONSOLIDADAS', marginX, currentY);
  currentY += 5;

  // Tabela Resumo do Índice
  doc.setFillColor(241, 245, 249);
  doc.rect(marginX, currentY, contentWidth, 7, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text('#', marginX + 2, currentY + 5);
  doc.text('Formulário / Avaliação', marginX + 8, currentY + 5);
  doc.text('Paciente', marginX + 85, currentY + 5);
  doc.text('Data', marginX + 135, currentY + 5);
  doc.text('Status', pageWidth - marginX - 3, currentY + 5, { align: 'right' });
  currentY += 7;

  respostas.forEach((resp, idx) => {
    checarQuebraPagina(7);
    if (idx % 2 === 1) {
      doc.setFillColor(248, 250, 252);
      doc.rect(marginX, currentY, contentWidth, 6.5, 'F');
    }
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(30, 41, 59);

    doc.text(String(idx + 1), marginX + 2, currentY + 4.5);
    doc.text(doc.splitTextToSize(resp.modeloTitulo, 72)[0] || '', marginX + 8, currentY + 4.5);
    doc.text(doc.splitTextToSize(resp.pacienteNome, 45)[0] || '', marginX + 85, currentY + 4.5);
    doc.text(new Date(resp.dataPreenchimento).toLocaleDateString('pt-BR'), marginX + 135, currentY + 4.5);

    doc.setFont('helvetica', 'bold');
    if (resp.status === 'rascunho') {
      doc.setTextColor(180, 83, 9);
      doc.text('Rascunho', pageWidth - marginX - 3, currentY + 4.5, { align: 'right' });
    } else {
      doc.setTextColor(15, 118, 110);
      doc.text('Finalizada', pageWidth - marginX - 3, currentY + 4.5, { align: 'right' });
    }

    currentY += 6.5;
  });

  currentY += 8;

  // Detalhamento de cada avaliação
  respostas.forEach((resp, rIdx) => {
    checarQuebraPagina(35);
    currentY += 4;

    // Cabeçalho da Anamnese Individual
    doc.setFillColor(15, 118, 110);
    doc.rect(marginX, currentY, contentWidth, 7, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(255, 255, 255);
    doc.text(`${rIdx + 1}. ${resp.modeloTitulo.toUpperCase()} — Paciente: ${resp.pacienteNome}`, marginX + 4, currentY + 5);
    doc.setFontSize(7.5);
    doc.text(new Date(resp.dataPreenchimento).toLocaleString('pt-BR'), pageWidth - marginX - 4, currentY + 5, { align: 'right' });

    currentY += 9;

    // Se for Ficha de Avaliação Capilar com dadosJson completos
    if (resp.dadosFichaJson) {
      try {
        const fData = JSON.parse(resp.dadosFichaJson);
        checarQuebraPagina(20);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8.5);
        doc.setTextColor(30, 41, 59);
        doc.text('Dados Principais:', marginX + 2, currentY + 4);
        currentY += 6;

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(71, 85, 105);
        if (fData.queixaPrincipal) {
          const lQueixa = doc.splitTextToSize(`Queixa: ${fData.queixaPrincipal}`, contentWidth - 4);
          doc.text(lQueixa, marginX + 4, currentY);
          currentY += (lQueixa.length * 4) + 2;
        }
        if (fData.tratamentoSugerido) {
          const lTrat = doc.splitTextToSize(`Tratamento Sugerido: ${fData.tratamentoSugerido}`, contentWidth - 4);
          doc.text(lTrat, marginX + 4, currentY);
          currentY += (lTrat.length * 4) + 2;
        }
      } catch {}
    }

    // Questões
    if (resp.respostas && resp.respostas.length > 0) {
      resp.respostas.forEach((item: RespostaItemAnamnese, qIdx: number) => {
        checarQuebraPagina(14);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(30, 41, 59);
        const lPerg = doc.splitTextToSize(`${qIdx + 1}) ${item.perguntaTitulo}`, contentWidth - 4);
        doc.text(lPerg, marginX + 2, currentY);
        currentY += (lPerg.length * 3.8);

        let valStr = 'Não informado';
        if (Array.isArray(item.valor)) {
          valStr = item.valor.length > 0 ? item.valor.join(', ') : 'Nenhum';
        } else if (typeof item.valor === 'boolean') {
          valStr = item.valor ? 'Sim' : 'Não';
        } else if (item.valor !== undefined && item.valor !== null && String(item.valor).trim() !== '') {
          valStr = String(item.valor);
        }

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(15, 118, 110);
        const lVal = doc.splitTextToSize(`→ ${valStr}`, contentWidth - 8);
        doc.text(lVal, marginX + 6, currentY);
        currentY += (lVal.length * 3.8) + 2;
      });
    }

    // Parecer Clínico individual se houver
    if (resp.anotacoesEspecialista && resp.anotacoesEspecialista.trim()) {
      checarQuebraPagina(14);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(15, 118, 110);
      doc.text('Parecer Clínico:', marginX + 2, currentY);
      currentY += 4;

      doc.setFont('helvetica', 'italic');
      doc.setFontSize(8);
      doc.setTextColor(71, 85, 105);
      const lAnot = doc.splitTextToSize(resp.anotacoesEspecialista, contentWidth - 6);
      doc.text(lAnot, marginX + 4, currentY);
      currentY += (lAnot.length * 3.8) + 4;
    }

    // Sessões de evolução registradas na ficha
    if (resp.sessoesJson) {
      try {
        const sessoes = JSON.parse(resp.sessoesJson);
        if (Array.isArray(sessoes) && sessoes.length > 0) {
          checarQuebraPagina(16);
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(8);
          doc.setTextColor(30, 41, 59);
          doc.text(`Sessões de Retorno / Evolução (${sessoes.length}):`, marginX + 2, currentY);
          currentY += 4;

          sessoes.forEach(s => {
            checarQuebraPagina(10);
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(7.5);
            doc.setTextColor(100, 116, 139);
            const dataSess = s.data ? new Date(s.data + 'T00:00:00').toLocaleDateString('pt-BR') : '';
            doc.text(`• Sessão #${s.numeroSessao} (${dataSess}): ${s.tratamentoRealizado}`, marginX + 6, currentY);
            currentY += 4.5;
          });
        }
      } catch {}
    }

    currentY += 4;
  });

  desenharRodapePadrao(doc, pageWidth, pageHeight, marginX);
  return doc;
}

/**
 * Faz download do arquivo PDF de uma anamnese
 */
export function baixarPdfRespostaAnamnese(options: AnamnesePdfOptions): void {
  const doc = gerarDocumentoPdfAnamnese(options);
  const nomeLimpo = normalizarNomeArquivo(options.resposta.pacienteNome);
  const tituloLimpo = normalizarNomeArquivo(options.resposta.modeloTitulo);
  const dataIso = options.resposta.dataPreenchimento
    ? options.resposta.dataPreenchimento.split('T')[0]
    : new Date().toISOString().split('T')[0];
  const nomeArquivo = `Anamnese_${tituloLimpo}_${nomeLimpo}_${dataIso}.pdf`;
  doc.save(nomeArquivo);
}

/**
 * Compartilha o PDF da anamnese usando a Web Share API no celular
 */
export async function compartilharPdfRespostaAnamnese(options: AnamnesePdfOptions): Promise<boolean> {
  const doc = gerarDocumentoPdfAnamnese(options);
  const nomeLimpo = normalizarNomeArquivo(options.resposta.pacienteNome);
  const tituloLimpo = normalizarNomeArquivo(options.resposta.modeloTitulo);
  const dataIso = options.resposta.dataPreenchimento
    ? options.resposta.dataPreenchimento.split('T')[0]
    : new Date().toISOString().split('T')[0];
  const nomeArquivo = `Anamnese_${tituloLimpo}_${nomeLimpo}_${dataIso}.pdf`;

  const blob = doc.output('blob');
  const file = new File([blob], nomeArquivo, { type: 'application/pdf' });

  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({
        files: [file],
        title: `Laudo de Anamnese: ${options.resposta.modeloTitulo}`,
        text: `Olá! Segue o laudo da anamnese capilar de ${options.resposta.pacienteNome}.`
      });
      return true;
    } catch (err: any) {
      if (err.name === 'AbortError') return false;
    }
  }

  // Fallback: download direto
  doc.save(nomeArquivo);
  return true;
}

/**
 * Faz download de todas as anamneses consolidadas em PDF
 */
export function baixarPdfTodasRespostas(options: TodasAnamnesesPdfOptions): void {
  const doc = gerarDocumentoPdfTodasRespostas(options);
  const nomeLimpo = normalizarNomeArquivo(options.pacienteNome || 'Geral');
  const dataIso = new Date().toISOString().split('T')[0];
  const nomeArquivo = `Dossie_Todas_Anamneses_${nomeLimpo}_${dataIso}.pdf`;
  doc.save(nomeArquivo);
}

/**
 * Compartilha o PDF de todas as anamneses usando Web Share API
 */
export async function compartilharPdfTodasRespostas(options: TodasAnamnesesPdfOptions): Promise<boolean> {
  const doc = gerarDocumentoPdfTodasRespostas(options);
  const nomeLimpo = normalizarNomeArquivo(options.pacienteNome || 'Geral');
  const dataIso = new Date().toISOString().split('T')[0];
  const nomeArquivo = `Dossie_Todas_Anamneses_${nomeLimpo}_${dataIso}.pdf`;

  const blob = doc.output('blob');
  const file = new File([blob], nomeArquivo, { type: 'application/pdf' });

  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({
        files: [file],
        title: `Dossiê de Anamneses: ${options.pacienteNome || 'Histórico Completo'}`,
        text: `Dossiê consolidado de todas as anamneses realizadas.`
      });
      return true;
    } catch (err: any) {
      if (err.name === 'AbortError') return false;
    }
  }

  doc.save(nomeArquivo);
  return true;
}
