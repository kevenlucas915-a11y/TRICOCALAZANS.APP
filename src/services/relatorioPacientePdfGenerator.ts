import { jsPDF } from 'jspdf';
import { Paciente, ConsultaRegistro } from '../types/paciente';
import { RespostaAnamnese } from '../types/anamnese';
import { ProdutoIndicado } from '../types/portal';
import { UsuarioProfissional } from '../types/usuario';

export interface RelatorioCompletoOptions {
  paciente: Paciente;
  consultas: ConsultaRegistro[];
  fichas: RespostaAnamnese[];
  produtos?: ProdutoIndicado[];
  profissional?: UsuarioProfissional | null;
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

function detectarFormato(src: string): 'PNG' | 'JPEG' {
  if (src.startsWith('data:image/png') || src.toLowerCase().includes('.png')) {
    return 'PNG';
  }
  return 'JPEG';
}

export function gerarPdfRelatorioCompleto(options: RelatorioCompletoOptions): jsPDF {
  const { paciente, consultas, fichas, produtos = [], profissional } = options;
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

  const logoSrc = obterLogo(options.logoPngUrl, profissional);
  const dataHoje = new Date().toLocaleDateString('pt-BR');

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
          const fmt = detectarFormato(logoSrc);
          doc.addImage(logoSrc, fmt, marginX + 3.5, 9.5, 19, 19, undefined, 'FAST');
        } catch (e) {
          console.warn('Erro ao inserir logo no relatório:', e);
        }
      }

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(temLogo ? 12 : 13.5);
      doc.setTextColor(15, 118, 110);
      doc.text('RELATÓRIO CLÍNICO & TRICOSCÓPICO', marginX + textOffsetX, 17);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(temLogo ? 7.5 : 8.5);
      doc.setTextColor(100, 116, 139);
      doc.text('Prontuário Integrado: Anamnese, Fototricoscopia e Conduta', marginX + textOffsetX, 23);

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
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text(`Relatório Clínico Integrado • ${paciente.nome}`, marginX, 10);
      doc.text(`Data: ${dataHoje}`, pageWidth - marginX, 10, { align: 'right' });

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

  // 1. IDENTIFICAÇÃO DO PACIENTE
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(marginX, currentY, contentWidth, 20, 2, 2, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(marginX, currentY, contentWidth, 20, 2, 2, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(30, 41, 59);
  doc.text(`Paciente: ${paciente.nome}`, marginX + 4, currentY + 6.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  const infoNasc = paciente.dataNascimento ? `Nascimento: ${new Date(paciente.dataNascimento).toLocaleDateString('pt-BR')}` : 'Nascimento não inf.';
  const infoTel = paciente.telefone ? `Tel/WhatsApp: ${paciente.telefone}` : 'Sem telefone';
  const infoEmail = paciente.email ? `E-mail: ${paciente.email}` : '';
  doc.text(`${infoNasc}   •   ${infoTel}   ${infoEmail ? '•   ' + infoEmail : ''}`, marginX + 4, currentY + 12);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 118, 110);
  doc.text(`Exames: ${consultas.length} consultas`, pageWidth - marginX - 4, currentY + 6.5, { align: 'right' });
  doc.text(`Fichas: ${fichas.length} anamneses`, pageWidth - marginX - 4, currentY + 12, { align: 'right' });

  if (paciente.queixaPrincipal) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text(`Queixa no cadastro: ${paciente.queixaPrincipal.substring(0, 95)}...`, marginX + 4, currentY + 17);
  }

  currentY += 26;

  // 2. RESUMO DE ANAMNESES E AVALIAÇÕES CAPILARES
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 118, 110);
  doc.text('1. AVALIAÇÕES & ANAMNESES TRICOLÓGICAS', marginX, currentY);
  currentY += 5;

  if (fichas.length === 0) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text('Nenhuma anamnese registrada no prontuário até o momento.', marginX + 4, currentY + 4);
    currentY += 12;
  } else {
    fichas.forEach((ficha, fIdx) => {
      checarQuebraPagina(20);

      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(204, 251, 241);
      doc.roundedRect(marginX, currentY, contentWidth, 16, 2, 2, 'F');
      doc.roundedRect(marginX, currentY, contentWidth, 16, 2, 2, 'S');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(19, 78, 74);
      doc.text(`${fIdx + 1}. ${ficha.modeloTitulo}`, marginX + 4, currentY + 5.5);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      doc.text(`Data: ${new Date(ficha.dataPreenchimento).toLocaleDateString('pt-BR')} às ${new Date(ficha.dataPreenchimento).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} • Status: ${ficha.status === 'rascunho' ? 'Rascunho' : 'Finalizada'}`, marginX + 4, currentY + 11.5);

      doc.text(`${ficha.respostas.length} itens respondidos`, pageWidth - marginX - 4, currentY + 5.5, { align: 'right' });

      currentY += 19;

      // Se tiver dados completos de queixa ou conduta na Ficha
      if (ficha.dadosFichaJson) {
        try {
          const dados = JSON.parse(ficha.dadosFichaJson);
          if (dados.queixaPrincipal) {
            checarQuebraPagina(12);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(7.5);
            doc.setTextColor(30, 41, 59);
            doc.text('Queixa relatada na ficha:', marginX + 6, currentY);
            currentY += 4;

            doc.setFont('helvetica', 'normal');
            doc.setFontSize(7.5);
            doc.setTextColor(71, 85, 105);
            const lQ = doc.splitTextToSize(dados.queixaPrincipal, contentWidth - 12);
            doc.text(lQ, marginX + 6, currentY);
            currentY += (lQ.length * 3.8) + 2;
          }
          if (dados.tratamentoSugerido) {
            checarQuebraPagina(12);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(7.5);
            doc.setTextColor(15, 118, 110);
            doc.text('Conduta / Tratamento sugerido:', marginX + 6, currentY);
            currentY += 4;

            doc.setFont('helvetica', 'normal');
            doc.setFontSize(7.5);
            doc.setTextColor(71, 85, 105);
            const lT = doc.splitTextToSize(dados.tratamentoSugerido, contentWidth - 12);
            doc.text(lT, marginX + 6, currentY);
            currentY += (lT.length * 3.8) + 2;
          }
        } catch {}
      }
    });
  }

  // 3. EXAMES DE TRICOSCOPIA & FOTOS DE ACOMPANHAMENTO
  checarQuebraPagina(30);
  currentY += 4;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 118, 110);
  doc.text('2. EXAMES DE TRICOSCOPIA & HISTÓRICO FOTOGRÁFICO', marginX, currentY);
  currentY += 5;

  if (consultas.length === 0) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text('Nenhum exame de fototricoscopia registrado para este paciente.', marginX + 4, currentY + 4);
    currentY += 12;
  } else {
    consultas.forEach((cons, cIdx) => {
      const temFoto = Boolean(cons.imagemUrl && cons.imagemUrl.trim() !== '');
      const alturaEstimada = temFoto ? 42 : 22;
      checarQuebraPagina(alturaEstimada);

      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(marginX, currentY, contentWidth, alturaEstimada, 2, 2, 'F');
      doc.roundedRect(marginX, currentY, contentWidth, alturaEstimada, 2, 2, 'S');

      // Miniatura da foto se disponível
      let offsetTextoX = marginX + 4;
      if (temFoto && cons.imagemUrl) {
        try {
          const fmt = detectarFormato(cons.imagemUrl);
          doc.addImage(cons.imagemUrl, fmt, marginX + 3.5, currentY + 3.5, 34, 34, undefined, 'FAST');
          offsetTextoX = marginX + 41;
        } catch (e) {
          console.warn('Erro ao inserir foto da consulta no PDF:', e);
        }
      }

      // Título e Data da Consulta
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(30, 41, 59);
      doc.text(`Consulta #${consultas.length - cIdx} • ${cons.area || 'Couro Cabeludo'}`, offsetTextoX, currentY + 6);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      doc.text(`Realizado em: ${cons.data || 'Data não informada'}`, offsetTextoX, currentY + 11);

      // Métricas da bancada
      let metricsY = currentY + 16;
      if (cons.totalFios !== undefined || cons.totalUF !== undefined || cons.ostiosVazios !== undefined) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.5);
        doc.setTextColor(15, 118, 110);
        const partesMétricas = [];
        if (cons.totalFios !== undefined) partesMétricas.push(`Fios: ${cons.totalFios}`);
        if (cons.totalUF !== undefined) partesMétricas.push(`UFs: ${cons.totalUF}`);
        if (cons.ostiosVazios !== undefined) partesMétricas.push(`Vazios: ${cons.ostiosVazios}`);
        if (cons.focosInflamacao !== undefined) partesMétricas.push(`Inflamação: ${cons.focosInflamacao}`);
        doc.text(partesMétricas.join('   |   '), offsetTextoX, metricsY);
        metricsY += 5;
      }

      // Achados ou conduta
      if (cons.achadosResumo) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.setTextColor(71, 85, 105);
        doc.text(`Sinais detectados: ${cons.achadosResumo.substring(0, 75)}...`, offsetTextoX, metricsY);
        metricsY += 4;
      }

      if (cons.condutaTratamento) {
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(7);
        doc.setTextColor(100, 116, 139);
        const lCond = doc.splitTextToSize(`Conduta: ${cons.condutaTratamento}`, contentWidth - (offsetTextoX - marginX) - 4);
        doc.text(lCond.slice(0, 2), offsetTextoX, metricsY);
      }

      currentY += alturaEstimada + 4;
    });
  }

  // 4. PRODUTOS E CUIDADOS HOME CARE (se houver)
  if (produtos.length > 0) {
    checarQuebraPagina(25);
    currentY += 4;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(15, 118, 110);
    doc.text('3. ORIENTAÇÕES HOME CARE & PRODUTOS INDICADOS', marginX, currentY);
    currentY += 5;

    produtos.forEach((prod, pIdx) => {
      checarQuebraPagina(14);
      doc.setFillColor(240, 253, 250);
      doc.setDrawColor(204, 251, 241);
      doc.roundedRect(marginX, currentY, contentWidth, 12, 1.5, 1.5, 'F');
      doc.roundedRect(marginX, currentY, contentWidth, 12, 1.5, 1.5, 'S');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(19, 78, 74);
      doc.text(`${pIdx + 1}. ${prod.nome}`, marginX + 3.5, currentY + 4.5);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(71, 85, 105);
      doc.text(`Como usar: ${prod.comoUsar}`, marginX + 3.5, currentY + 8.5);

      currentY += 14;
    });
  }

  // Termo de Encerramento e Assinatura
  checarQuebraPagina(24);
  currentY += 6;
  doc.setDrawColor(148, 163, 184);
  doc.line(marginX + contentWidth / 4, currentY + 12, marginX + (3 * contentWidth) / 4, currentY + 12);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(30, 41, 59);
  doc.text(profissional?.nome || 'Especialista em Tricologia', pageWidth / 2, currentY + 16, { align: 'center' });

  if (profissional?.registro) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text(profissional.registro, pageWidth / 2, currentY + 20, { align: 'center' });
  }

  // Rodapé das páginas
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setDrawColor(226, 232, 240);
    doc.line(marginX, pageHeight - 12, pageWidth - marginX, pageHeight - 12);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    doc.text(`Prontuário Consolidado • ${paciente.nome}`, marginX, pageHeight - 7);
    doc.text(`Página ${i} de ${totalPages}`, pageWidth - marginX, pageHeight - 7, { align: 'right' });
  }

  return doc;
}

export function baixarRelatorioCompletoPaciente(options: RelatorioCompletoOptions): void {
  const doc = gerarPdfRelatorioCompleto(options);
  const nomeLimpo = normalizarNome(options.paciente.nome);
  const dataIso = new Date().toISOString().split('T')[0];
  const nomeArquivo = `Relatorio_Clinico_${nomeLimpo}_${dataIso}.pdf`;
  doc.save(nomeArquivo);
}

export async function compartilharRelatorioCompletoPaciente(options: RelatorioCompletoOptions): Promise<boolean> {
  const doc = gerarPdfRelatorioCompleto(options);
  const nomeLimpo = normalizarNome(options.paciente.nome);
  const dataIso = new Date().toISOString().split('T')[0];
  const nomeArquivo = `Relatorio_Clinico_${nomeLimpo}_${dataIso}.pdf`;

  const blob = doc.output('blob');
  const file = new File([blob], nomeArquivo, { type: 'application/pdf' });

  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({
        files: [file],
        title: `Relatório Clínico: ${options.paciente.nome}`,
        text: `Olá! Segue o relatório completo com histórico, anamnese e exames de tricoscopia de ${options.paciente.nome}.`
      });
      return true;
    } catch (err: any) {
      if (err.name === 'AbortError') return false;
    }
  }

  doc.save(nomeArquivo);
  return true;
}
