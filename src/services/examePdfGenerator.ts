import { jsPDF } from 'jspdf';
import { CartaEncaminhamentoParams, ExameLaboratorial, ItemExame } from '../types/exames';
import { UsuarioProfissional } from '../types/usuario';

const AVISO_FIXO_MEDICO = 
  "A situação compara o valor com a faixa de referência do próprio laboratório e não substitui avaliação médica.";

/**
 * Gera e faz download da Carta de Encaminhamento em PDF (A4)
 */
export function gerarCartaEncaminhamentoPdf(params: CartaEncaminhamentoParams): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginX = 18;
  const contentWidth = pageWidth - (marginX * 2);
  let currentY = 20;

  // Cabeçalho Institucional
  doc.setFillColor(15, 118, 110); // Teal 700
  doc.rect(marginX, currentY, contentWidth, 22, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('CARTA DE ENCAMINHAMENTO CLÍNICO', marginX + 6, currentY + 9);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(
    `Destinatário: Especialista em ${params.destinatarioTipo === 'Médico(a)' ? 'Medicina / Especialidades' : 'Nutrição Clínica'}`,
    marginX + 6,
    currentY + 16
  );

  currentY += 28;

  // Bloco de Identificação do Paciente
  doc.setFillColor(248, 250, 252); // Slate 50
  doc.setDrawColor(226, 232, 240); // Slate 200
  doc.roundedRect(marginX, currentY, contentWidth, 22, 2, 2, 'FD');

  doc.setTextColor(15, 23, 42); // Slate 900
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text(`Paciente: ${params.pacienteNome}`, marginX + 5, currentY + 7);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105); // Slate 600

  const subDetalhes = [
    params.pacienteIdade ? `Idade: ${params.pacienteIdade}` : null,
    params.pacienteGenero ? `Gênero: ${params.pacienteGenero}` : null,
    params.dataExame ? `Data dos Exames: ${new Date(params.dataExame).toLocaleDateString('pt-BR')}` : null,
    params.laboratorio ? `Laboratório: ${params.laboratorio}` : null
  ].filter(Boolean).join('  •  ');

  doc.text(subDetalhes, marginX + 5, currentY + 13);
  doc.text(`Queixa Capilar Registrada: ${params.queixaCapilar || 'Queda capilar / alteração tricológica sob investigação'}`, marginX + 5, currentY + 18);

  currentY += 28;

  // Texto Padrão de Encaminhamento
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 118, 110);
  doc.text('MOTIVO DO ENCAMINHAMENTO:', marginX, currentY);
  currentY += 5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(30, 41, 59);
  const textoPadrao = 
    'Encaminho para avaliação, considerando a queixa capilar e os exames apresentados. Solicito análise dos marcadores laboratoriais abaixo descritos, visando investigação clínica sistêmica e conduta conjunta.';
  const linhasTexto = doc.splitTextToSize(textoPadrao, contentWidth);
  doc.text(linhasTexto, marginX, currentY);
  currentY += (linhasTexto.length * 5) + 4;

  // Tabela de Valores Fora da Faixa
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 118, 110);
  doc.text('MARCADORES LABORATORIAIS FORA DA FAIXA DO LABORATÓRIO:', marginX, currentY);
  currentY += 5;

  // Cabeçalho da Tabela
  doc.setFillColor(241, 245, 249);
  doc.rect(marginX, currentY, contentWidth, 7, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text('Indicador / Exame', marginX + 3, currentY + 4.5);
  doc.text('Valor Obtido', marginX + 65, currentY + 4.5);
  doc.text('Referência do Laboratório', marginX + 105, currentY + 4.5);
  doc.text('Situação', marginX + 150, currentY + 4.5);
  currentY += 7;

  // Linhas da Tabela
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);

  if (params.itensAlterados.length === 0) {
    doc.setTextColor(100, 116, 139);
    doc.text('Nenhum marcador laboratorial com valor fora da faixa neste laudo.', marginX + 3, currentY + 5);
    currentY += 8;
  } else {
    params.itensAlterados.forEach((item) => {
      if (currentY > pageHeight - 55) {
        doc.addPage();
        currentY = 20;
      }

      // Linha zebra leve
      doc.setDrawColor(241, 245, 249);
      doc.line(marginX, currentY + 6.5, marginX + contentWidth, currentY + 6.5);

      doc.setTextColor(15, 23, 42);
      doc.setFont('helvetica', 'bold');
      doc.text(item.marcador, marginX + 3, currentY + 4.5);

      doc.setFont('helvetica', 'normal');
      doc.text(`${item.valor} ${item.unidade || ''}`, marginX + 65, currentY + 4.5);

      const refTexto = item.referenciaTexto || 
        (item.referenciaMinima !== undefined && item.referenciaMaxima !== undefined
          ? `${item.referenciaMinima} a ${item.referenciaMaxima} ${item.unidade || ''}`
          : 'Descrita em laudo');
      doc.text(refTexto.substring(0, 30), marginX + 105, currentY + 4.5);

      // Cor da Situação
      if (item.situacao === 'Abaixo da faixa') {
        doc.setTextColor(190, 24, 93); // Rose 700
      } else if (item.situacao === 'Acima da faixa') {
        doc.setTextColor(162, 28, 175); // Purple 700
      } else if (item.situacao === 'Próximo do limite') {
        doc.setTextColor(180, 83, 9); // Amber 700
      } else {
        doc.setTextColor(15, 118, 110);
      }
      doc.setFont('helvetica', 'bold');
      doc.text(item.situacao || 'Fora da faixa', marginX + 150, currentY + 4.5);

      currentY += 7;
    });
  }

  currentY += 5;

  // Campo de Observações Livres (se houver)
  if (params.observacaoLivre && params.observacaoLivre.trim()) {
    if (currentY > pageHeight - 50) {
      doc.addPage();
      currentY = 20;
    }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(15, 118, 110);
    doc.text('OBSERVAÇÕES CLÍNICAS / CONSIDERAÇÕES:', marginX, currentY);
    currentY += 5;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(51, 65, 85);
    const obsLinhas = doc.splitTextToSize(params.observacaoLivre.trim(), contentWidth);
    doc.text(obsLinhas, marginX, currentY);
    currentY += (obsLinhas.length * 4.5) + 6;
  }

  // Aviso Mandatório Fixo
  if (currentY > pageHeight - 40) {
    doc.addPage();
    currentY = 20;
  }
  doc.setFillColor(254, 242, 242); // Rose 50
  doc.setDrawColor(254, 205, 211); // Rose 200
  doc.roundedRect(marginX, currentY, contentWidth, 10, 1.5, 1.5, 'FD');
  doc.setTextColor(159, 18, 57);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text(`AVISO: ${AVISO_FIXO_MEDICO}`, marginX + 4, currentY + 6);

  currentY += 18;

  // Assinatura e Dados da Profissional
  if (currentY > pageHeight - 35) {
    doc.addPage();
    currentY = 25;
  }

  const signY = pageHeight - 30;
  doc.setDrawColor(148, 163, 184);
  doc.line(pageWidth / 2 - 40, signY, pageWidth / 2 + 40, signY);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text(params.profissionalNome, pageWidth / 2, signY + 4.5, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  const infoProfissional = [
    params.profissionalTitulo,
    params.profissionalRegistro ? `Reg: ${params.profissionalRegistro}` : null,
    params.profissionalClinica
  ].filter(Boolean).join(' • ');
  doc.text(infoProfissional, pageWidth / 2, signY + 9, { align: 'center' });

  // Salvar PDF
  const nomeArquivo = `Encaminhamento_${params.pacienteNome.replace(/\s+/g, '_')}_${params.destinatarioTipo}.pdf`;
  doc.save(nomeArquivo);
}

/**
 * Baixa a tabela completa do exame com todas as categorias e o aviso obrigatório
 */
export function gerarTabelaExamePdf(
  exame: ExameLaboratorial,
  pacienteNome: string,
  profissional?: UsuarioProfissional | null
): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginX = 18;
  const contentWidth = pageWidth - (marginX * 2);
  let currentY = 20;

  // Cabeçalho
  doc.setFillColor(15, 118, 110);
  doc.rect(marginX, currentY, contentWidth, 20, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('TABELA DE EXAMES LABORATORIAIS', marginX + 6, currentY + 8);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text(`Paciente: ${pacienteNome}  •  Data da Coleta: ${new Date(exame.data).toLocaleDateString('pt-BR')}  •  Laboratório: ${exame.laboratorio || 'Não informado'}`, marginX + 6, currentY + 15);

  currentY += 26;

  // Cabeçalho de colunas
  doc.setFillColor(241, 245, 249);
  doc.rect(marginX, currentY, contentWidth, 7, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text('Indicador / Exame', marginX + 3, currentY + 4.5);
  doc.text('Valor Obtido', marginX + 70, currentY + 4.5);
  doc.text('Referência do Laboratório', marginX + 110, currentY + 4.5);
  doc.text('Situação', marginX + 152, currentY + 4.5);
  currentY += 8;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);

  exame.itens.forEach((item) => {
    if (currentY > pageHeight - 35) {
      doc.addPage();
      currentY = 20;
    }

    doc.setDrawColor(241, 245, 249);
    doc.line(marginX, currentY + 6, marginX + contentWidth, currentY + 6);

    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.text(item.marcador, marginX + 3, currentY + 4);

    doc.setFont('helvetica', 'normal');
    doc.text(`${item.valor} ${item.unidade || ''}`, marginX + 70, currentY + 4);

    const ref = item.referenciaTexto || 
      (item.referenciaMinima !== undefined && item.referenciaMaxima !== undefined
        ? `${item.referenciaMinima} a ${item.referenciaMaxima} ${item.unidade || ''}`
        : 'Sem ref. descrita');
    doc.text(ref.substring(0, 28), marginX + 110, currentY + 4);

    if (item.situacao === 'Abaixo da faixa') {
      doc.setTextColor(190, 24, 93);
    } else if (item.situacao === 'Acima da faixa') {
      doc.setTextColor(162, 28, 175);
    } else if (item.situacao === 'Próximo do limite') {
      doc.setTextColor(180, 83, 9);
    } else if (item.situacao === 'Dentro da faixa') {
      doc.setTextColor(15, 118, 110);
    } else {
      doc.setTextColor(100, 116, 139);
    }
    doc.setFont('helvetica', 'bold');
    doc.text(item.situacao || 'Sem ref.', marginX + 152, currentY + 4);

    currentY += 6.5;
  });

  currentY += 8;

  // Aviso fixo obrigatório
  if (currentY > pageHeight - 30) {
    doc.addPage();
    currentY = 20;
  }
  doc.setFillColor(254, 242, 242);
  doc.setDrawColor(254, 205, 211);
  doc.roundedRect(marginX, currentY, contentWidth, 10, 1.5, 1.5, 'FD');
  doc.setTextColor(159, 18, 57);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text(`AVISO: ${AVISO_FIXO_MEDICO}`, marginX + 4, currentY + 6);

  currentY += 15;

  if (profissional) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    doc.text(`Emitido por ${profissional.nome} • ${profissional.titulo || 'Especialista em Tricologia'}`, marginX, currentY);
  }

  const nomeArquivo = `Tabela_Exames_${pacienteNome.replace(/\s+/g, '_')}_${exame.data}.pdf`;
  doc.save(nomeArquivo);
}
