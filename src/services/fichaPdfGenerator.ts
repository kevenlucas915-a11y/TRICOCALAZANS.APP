import { jsPDF } from 'jspdf';
import { FichaAvaliacaoCapilarData, SessaoEvolucaoFicha } from '../types/anamnese';
import { UsuarioProfissional } from '../types/usuario';

export interface FichaPdfOptions {
  ficha: FichaAvaliacaoCapilarData;
  profissional?: UsuarioProfissional | null;
  dataAtendimento?: string;
  sessoes?: SessaoEvolucaoFicha[];
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

function formatarSimNao(item?: { sim: boolean; qual?: string } | boolean): string {
  if (typeof item === 'boolean') {
    return item ? 'Sim' : 'Não';
  }
  if (!item || !item.sim) return 'Não';
  return item.qual && item.qual.trim() ? `Sim — ${item.qual.trim()}` : 'Sim';
}

/**
 * Gera a instância do documento jsPDF com todo o layout da Ficha de Avaliação Capilar
 */
export function gerarDocumentoPdf(options: FichaPdfOptions): jsPDF {
  const { ficha, profissional, dataAtendimento, sessoes = [] } = options;
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const marginX = 14;
  const contentWidth = pageWidth - marginX * 2;
  const bottomLimit = 270;

  let currentY = 14;

  const dataAtualFormatada = dataAtendimento 
    ? new Date(dataAtendimento).toLocaleDateString('pt-BR') 
    : new Date().toLocaleDateString('pt-BR');

  // Função auxiliar para desenhar cabeçalho da página
  const desenharCabecalho = (isFirstPage: boolean) => {
    // Linha de acento no topo
    doc.setFillColor(15, 118, 110); // Teal 700
    doc.rect(0, 0, pageWidth, 4, 'F');

    if (isFirstPage) {
      // Cabeçalho Principal Clínico
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(marginX, 8, contentWidth, 24, 3, 3, 'F');
      doc.setDrawColor(203, 213, 225);
      doc.roundedRect(marginX, 8, contentWidth, 24, 3, 3, 'S');

      // Logo da Clínica / Documento (PNG suportado)
      const logoSrc = obterLogo(options.logoPngUrl, profissional);
      const temLogo = Boolean(
        logoSrc && (logoSrc.startsWith('data:image') || logoSrc.startsWith('http'))
      );
      const textOffsetX = temLogo ? 26 : 5;

      if (temLogo && logoSrc) {
        try {
          const formato = (logoSrc.startsWith('data:image/png') || logoSrc.toLowerCase().includes('.png')) ? 'PNG' : 'JPEG';
          doc.addImage(logoSrc, formato, marginX + 3.5, 9.5, 19, 19, undefined, 'FAST');
        } catch (e) {
          console.warn('Erro ao inserir logo no PDF:', e);
        }
      }

      // Título
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(temLogo ? 12 : 14);
      doc.setTextColor(15, 118, 110);
      doc.text('FICHA DE AVALIAÇÃO CAPILAR', marginX + textOffsetX, 17);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(temLogo ? 7.5 : 8.5);
      doc.setTextColor(100, 116, 139);
      doc.text('Prontuário e Avaliação Tricológica Personalizada', marginX + textOffsetX, 23);

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

      currentY = 38;
    } else {
      // Cabeçalho discreto das páginas seguintes
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text(`Ficha de Avaliação Capilar • ${ficha.nomeCliente || 'Cliente'}`, marginX, 10);
      doc.text(`Data: ${dataAtualFormatada}`, pageWidth - marginX, 10, { align: 'right' });

      doc.setDrawColor(226, 232, 240);
      doc.line(marginX, 12, pageWidth - marginX, 12);

      currentY = 18;
    }
  };

  const verificarQuebra = (alturaNecessaria: number) => {
    if (currentY + alturaNecessaria > bottomLimit) {
      doc.addPage();
      desenharCabecalho(false);
    }
  };

  const desenharTituloSecao = (titulo: string) => {
    verificarQuebra(12);
    doc.setFillColor(241, 245, 249);
    doc.roundedRect(marginX, currentY, contentWidth, 6.5, 1.5, 1.5, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(15, 118, 110);
    doc.text(titulo.toUpperCase(), marginX + 3, currentY + 4.5);

    currentY += 9;
  };

  const desenharCampo2Colunas = (
    rotulo1: string,
    valor1: string,
    rotulo2?: string,
    valor2?: string
  ) => {
    verificarQuebra(9);
    const colWidth = (contentWidth - 6) / 2;

    // Coluna 1
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(51, 65, 85);
    doc.text(`${rotulo1}:`, marginX, currentY);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(15, 23, 42);
    const val1Str = valor1 && valor1.trim() ? valor1.trim() : '—';
    const split1 = doc.splitTextToSize(val1Str, colWidth - 28);
    doc.text(split1, marginX + 28, currentY);

    let maxLine = split1.length;

    // Coluna 2
    if (rotulo2) {
      const col2X = marginX + colWidth + 6;
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(51, 65, 85);
      doc.text(`${rotulo2}:`, col2X, currentY);

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(15, 23, 42);
      const val2Str = valor2 && valor2.trim() ? valor2.trim() : '—';
      const split2 = doc.splitTextToSize(val2Str, colWidth - 28);
      doc.text(split2, col2X + 28, currentY);

      if (split2.length > maxLine) maxLine = split2.length;
    }

    currentY += Math.max(5.5, maxLine * 4 + 1.5);
  };

  const desenharCampoTextoLongo = (rotulo: string, texto?: string) => {
    const conteudo = texto && texto.trim() ? texto.trim() : '—';
    const linhas = doc.splitTextToSize(conteudo, contentWidth - 4);
    const alturaTotal = 6 + linhas.length * 4;

    verificarQuebra(alturaTotal);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(51, 65, 85);
    doc.text(`${rotulo}:`, marginX, currentY);
    currentY += 4;

    doc.setFillColor(250, 250, 250);
    doc.roundedRect(marginX, currentY, contentWidth, linhas.length * 4 + 3, 1, 1, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(marginX, currentY, contentWidth, linhas.length * 4 + 3, 1, 1, 'S');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(30, 41, 59);
    doc.text(linhas, marginX + 2.5, currentY + 3.5);

    currentY += linhas.length * 4 + 6;
  };

  // 1. INICIAR DOCUMENTO COM CABEÇALHO
  desenharCabecalho(true);

  // SEÇÃO 1: DADOS DO CLIENTE
  desenharTituloSecao('1. Dados do Cliente');
  desenharCampo2Colunas(
    'Nome', ficha.nomeCliente || '—',
    'Nascimento', `${ficha.dataNascimento || '—'}${ficha.idadeCalculada ? ` (${ficha.idadeCalculada})` : ''}`
  );
  desenharCampo2Colunas(
    'Sexo', ficha.sexo || '—',
    'Estado Civil', ficha.estadoCivil || '—'
  );
  desenharCampo2Colunas(
    'Celular', ficha.celular || '—',
    'E-mail', ficha.email || '—'
  );
  desenharCampo2Colunas(
    'Profissão', ficha.profissao || '—',
    'CEP', ficha.cep || '—'
  );
  desenharCampo2Colunas(
    'Endereço', `${ficha.endereco || '—'}${ficha.bairro ? `, ${ficha.bairro}` : ''}`,
    'Cidade/UF', `${ficha.cidade || '—'}${ficha.estado ? ` / ${ficha.estado}` : ''}`
  );

  if (ficha.cpf || ficha.tipoSanguineo || ficha.etnia) {
    desenharCampo2Colunas(
      'CPF', ficha.cpf || '—',
      'Tipo Sanguíneo', ficha.tipoSanguineo || '—'
    );
    if (ficha.etnia) {
      desenharCampo2Colunas('Etnia', ficha.etnia);
    }
  }

  const comoConheceuStr = ficha.comoConheceu === 'Outro' && ficha.comoConheceuOutro 
    ? `Outro (${ficha.comoConheceuOutro})` 
    : (ficha.comoConheceu || '—');
  desenharCampo2Colunas('Como nos conheceu', comoConheceuStr);

  currentY += 2;

  // SEÇÃO 2: QUEIXA
  desenharTituloSecao('2. Queixa Principal');
  desenharCampoTextoLongo('Relato da Queixa', ficha.queixaPrincipal);

  // SEÇÃO 3: SAÚDE
  desenharTituloSecao('3. Histórico de Saúde');
  desenharCampo2Colunas(
    'Doenças graves', formatarSimNao(ficha.doencasGraves),
    'Cirurgias', formatarSimNao(ficha.cirurgias)
  );

  let covidStr = 'Não';
  if (ficha.covid?.teveCovid) {
    covidStr = 'Sim';
    if (ficha.covid?.tomouVacina) {
      covidStr += ` (Vacinado: ${ficha.covid.doses || '—'} doses)`;
    }
  }
  desenharCampo2Colunas(
    'Já teve COVID / Vacina', covidStr,
    'Histórico familiar', formatarSimNao(ficha.doencaFamiliar)
  );

  desenharCampo2Colunas(
    'Tem queloide', formatarSimNao(ficha.queloide),
    'Tratamento atual', formatarSimNao(ficha.tratamentoAtual)
  );
  desenharCampo2Colunas(
    'Problema endócrino', formatarSimNao(ficha.problemaEndocrino),
    'Problema cardíaco', formatarSimNao(ficha.problemaCardiaco)
  );
  desenharCampo2Colunas(
    'Usa marcapasso', ficha.marcapasso ? 'Sim' : 'Não',
    'Próteses / Pinos', formatarSimNao(ficha.protese)
  );
  desenharCampo2Colunas(
    'Medicação contínua', formatarSimNao(ficha.medicacaoContinua),
    'Alergias', formatarSimNao(ficha.alergias)
  );
  desenharCampo2Colunas(
    'Problemas digestivos', formatarSimNao(ficha.problemasDigestivos),
    'Problemas intestinais', formatarSimNao(ficha.problemasIntestinais)
  );

  currentY += 2;

  // SEÇÃO 4: HÁBITOS
  desenharTituloSecao('4. Hábitos de Vida');
  desenharCampo2Colunas(
    'Exercício físico', ficha.exercicioFisico?.sim ? `Sim — ${ficha.exercicioFisico.qualFrequencia || 'regular'}` : 'Não',
    'Bebida alcoólica', ficha.bebidaAlcoolica || '—'
  );
  desenharCampo2Colunas(
    'Fuma', ficha.fuma ? 'Sim' : 'Não',
    'Drogas recreativas', formatarSimNao(ficha.drogasRecreativas)
  );

  const sonoStr = ficha.sono && (ficha.sono.dormeAs || ficha.sono.acordaAs)
    ? `Dorme às ${ficha.sono.dormeAs || '—'}, acorda às ${ficha.sono.acordaAs || '—'}${ficha.sono.horasCalculadas ? ` (${ficha.sono.horasCalculadas})` : ''}`
    : '—';

  desenharCampo2Colunas(
    'Sono habitual', sonoStr,
    'Já teve IST', formatarSimNao(ficha.ist)
  );

  currentY += 2;

  // SEÇÃO 5: SAÚDE FEMININA (SOMENTE QUANDO SEXO = FEMININO)
  if (ficha.sexo === 'Feminino') {
    desenharTituloSecao('5. Saúde Feminina');
    desenharCampo2Colunas(
      'Alteração menstrual', formatarSimNao(ficha.alteracaoMenstrual),
      'Filhos', ficha.temFilhos?.sim ? `Sim (${ficha.temFilhos.quantos || '1'})` : 'Não'
    );
    desenharCampo2Colunas(
      'Perda gestacional', formatarSimNao(ficha.perdaGestacional),
      'Última gravidez', ficha.dataUltimaGravidez || '—'
    );
    desenharCampo2Colunas(
      'Queixa na gravidez', formatarSimNao(ficha.queixaNaGravidez),
      'Diagnóstico de SOP', ficha.sop ? 'Sim' : 'Não'
    );
    currentY += 2;
  }

  // SEÇÃO 6: CABELO E ROTINA
  desenharTituloSecao('6. Cabelo, Químicas e Rotina');
  const quimicasTexto = ficha.quimicas && ficha.quimicas.length > 0 
    ? `${ficha.quimicas.join(', ')}${ficha.quimicasOutras ? ` • Observação: ${ficha.quimicasOutras}` : ''}`
    : 'Nenhuma';
  desenharCampoTextoLongo('Químicas (últimos 3 a 12 meses)', quimicasTexto);

  const habitosTexto = ficha.habitosAdornos && ficha.habitosAdornos.length > 0
    ? `${ficha.habitosAdornos.join(', ')}${ficha.habitosAdornosLivre ? ` • ${ficha.habitosAdornosLivre}` : ''}`
    : 'Nenhum adorno/tração reportado';
  desenharCampoTextoLongo('Hábitos diários, adornos e tração', habitosTexto);

  desenharCampo2Colunas(
    'Frequência de lavagem', ficha.frequenciaLavagem || '—',
    'Temperatura da água', ficha.temperaturaAgua || '—'
  );
  desenharCampo2Colunas(
    'Modo de secagem', ficha.secagem || '—',
    'Chapinha / Babyliss', ficha.chapinhaBabyliss || '—'
  );

  if (ficha.higienizacaoLivre) {
    desenharCampoTextoLongo('Notas de Higienização e Cuidados', ficha.higienizacaoLivre);
  }

  currentY += 2;

  // SEÇÃO 7: AVALIAÇÃO DA PROFISSIONAL
  desenharTituloSecao('7. Avaliação da Profissional & Conduta');
  if (ficha.anotacoesProfissional) {
    desenharCampoTextoLongo('Anotações da Profissional', ficha.anotacoesProfissional);
  }
  if (ficha.tratamentoSugerido) {
    desenharCampoTextoLongo('Tratamento Sugerido / Conduta', ficha.tratamentoSugerido);
  }

  const coletaStr = ficha.coletaMicroscopia?.sim 
    ? `Sim (Envio: ${ficha.coletaMicroscopia.dataEnvio || '—'})` 
    : 'Não';
  const nutraceuticosStr = ficha.indicacaoNutraceuticos?.sim 
    ? `Sim (Sugerido: ${ficha.indicacaoNutraceuticos.sugerido || '—'})` 
    : 'Não';

  desenharCampo2Colunas(
    'Coleta para microscopia', coletaStr,
    'Nutracêuticos', nutraceuticosStr
  );

  currentY += 4;

  // SEÇÃO 8: TERMO, DECLARAÇÃO E ASSINATURA DIGITAL
  verificarQuebra(38);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(marginX, currentY, contentWidth, 34, 2, 2, 'F');
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(marginX, currentY, contentWidth, 34, 2, 2, 'S');

  // Declaração de Verdade
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  const textoDeclaracao = 'Declaração: As declarações aqui contidas representam a expressão da verdade, não cabendo ao profissional qualquer responsabilidade por dados omitidos ou enganosos.';
  const linhasDeclaracao = doc.splitTextToSize(textoDeclaracao, contentWidth - 8);
  doc.text(linhasDeclaracao, marginX + 4, currentY + 4.5);

  const localDataStr = ficha.cidadeData || `${ficha.cidade || 'Local'}, ${dataAtualFormatada}`;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(30, 41, 59);
  doc.text(localDataStr, marginX + 4, currentY + 14);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text('Consentimento LGPD: Autorizo o uso destes dados exclusivamente para meu atendimento capilar.', marginX + 4, currentY + 19);

  // Espaço da Assinatura do Cliente
  const assinaturaX = pageWidth - marginX - 55;
  const assinaturaY = currentY + 6;

  if (ficha.assinaturaClienteBase64 && ficha.assinaturaClienteBase64.startsWith('data:image')) {
    try {
      doc.addImage(ficha.assinaturaClienteBase64, 'PNG', assinaturaX, assinaturaY, 48, 16);
    } catch {
      doc.setDrawColor(148, 163, 184);
      doc.line(assinaturaX, currentY + 22, assinaturaX + 48, currentY + 22);
    }
  } else {
    doc.setDrawColor(148, 163, 184);
    doc.line(assinaturaX, currentY + 22, assinaturaX + 48, currentY + 22);
  }

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text(`Assinatura de: ${ficha.nomeCliente || 'Cliente'}`, assinaturaX + 24, currentY + 26, { align: 'center' });

  currentY += 40;

  // SEÇÃO EXTRA: REGISTRO DE SESSÕES (FOLHA DE EVOLUÇÃO)
  if (sessoes && sessoes.length > 0) {
    doc.addPage();
    desenharCabecalho(false);

    doc.setFillColor(15, 118, 110);
    doc.roundedRect(marginX, currentY, contentWidth, 7, 1.5, 1.5, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(255, 255, 255);
    doc.text('REGISTRO DE SESSÕES & EVOLUÇÃO CLÍNICA', marginX + 3, currentY + 5);

    currentY += 11;

    // Cabeçalho da Tabela
    doc.setFillColor(241, 245, 249);
    doc.rect(marginX, currentY, contentWidth, 7, 'F');
    doc.setDrawColor(203, 213, 225);
    doc.rect(marginX, currentY, contentWidth, 7, 'S');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(15, 23, 42);
    doc.text('Sessão', marginX + 3, currentY + 4.5);
    doc.text('Data', marginX + 22, currentY + 4.5);
    doc.text('Tratamento Realizado / Evolução', marginX + 48, currentY + 4.5);
    doc.text('Assinatura do Cliente', pageWidth - marginX - 35, currentY + 4.5);

    currentY += 7;

    // Linhas de Sessões
    sessoes.forEach((sess, idx) => {
      verificarQuebra(20);

      const linhaY = currentY;
      const dataSessaoStr = sess.data ? new Date(sess.data + 'T00:00:00').toLocaleDateString('pt-BR') : '—';
      const linhasTratamento = doc.splitTextToSize(sess.tratamentoRealizado || 'Sessão clínica de rotina', 85);
      const alturaLinha = Math.max(16, linhasTratamento.length * 4 + 6);

      // Fundo zebra suave
      if (idx % 2 === 1) {
        doc.setFillColor(248, 250, 252);
        doc.rect(marginX, linhaY, contentWidth, alturaLinha, 'F');
      }

      doc.setDrawColor(226, 232, 240);
      doc.rect(marginX, linhaY, contentWidth, alturaLinha, 'S');

      // Nº Sessão
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(15, 118, 110);
      doc.text(`Sessão #${sess.numeroSessao || idx + 1}`, marginX + 3, linhaY + 6);

      // Data
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(51, 65, 85);
      doc.text(dataSessaoStr, marginX + 22, linhaY + 6);

      // Tratamento
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(15, 23, 42);
      doc.text(linhasTratamento, marginX + 48, linhaY + 5);

      // Assinatura
      const assSessX = pageWidth - marginX - 38;
      if (sess.assinaturaClienteBase64 && sess.assinaturaClienteBase64.startsWith('data:image')) {
        try {
          doc.addImage(sess.assinaturaClienteBase64, 'PNG', assSessX, linhaY + 1.5, 32, 11);
        } catch {
          doc.setDrawColor(203, 213, 225);
          doc.line(assSessX, linhaY + 12, assSessX + 32, linhaY + 12);
        }
      } else {
        doc.setDrawColor(203, 213, 225);
        doc.line(assSessX, linhaY + 12, assSessX + 32, linhaY + 12);
      }

      currentY += alturaLinha;
    });
  }

  // Rodapé em todas as páginas com numeração
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);

    doc.setDrawColor(241, 245, 249);
    doc.line(marginX, pageHeight - 10, pageWidth - marginX, pageHeight - 10);

    const rodapeTexto = `Ficha de Avaliação Capilar • Emitido em ${dataAtualFormatada}`;
    doc.text(rodapeTexto, marginX, pageHeight - 6);
    doc.text(`Página ${i} de ${totalPages}`, pageWidth - marginX, pageHeight - 6, { align: 'right' });
  }

  return doc;
}

/**
 * Faz o download do arquivo PDF no dispositivo do usuário
 */
export function baixarPdfFicha(options: FichaPdfOptions): void {
  const doc = gerarDocumentoPdf(options);
  const nomeClienteLimpo = normalizarNomeArquivo(options.ficha.nomeCliente || 'Cliente');
  const dataHojeIso = new Date().toISOString().split('T')[0];
  const nomeArquivo = `Ficha-Avaliacao_${nomeClienteLimpo}_${dataHojeIso}.pdf`;
  doc.save(nomeArquivo);
}

/**
 * Compartilha o arquivo PDF utilizando a Web Share API (se suportada no celular/dispositivo)
 * ou realiza o download automático caso não seja suportada.
 */
export async function compartilharPdfFicha(options: FichaPdfOptions): Promise<boolean> {
  const doc = gerarDocumentoPdf(options);
  const nomeClienteLimpo = normalizarNomeArquivo(options.ficha.nomeCliente || 'Cliente');
  const dataHojeIso = new Date().toISOString().split('T')[0];
  const nomeArquivo = `Ficha-Avaliacao_${nomeClienteLimpo}_${dataHojeIso}.pdf`;

  if (typeof navigator !== 'undefined' && navigator.share) {
    try {
      const blob = doc.output('blob');
      const file = new File([blob], nomeArquivo, { type: 'application/pdf' });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: `Ficha de Avaliação - ${options.ficha.nomeCliente}`,
          text: `Segue a Ficha de Avaliação Capilar de ${options.ficha.nomeCliente}.`,
          files: [file]
        });
        return true;
      } else {
        // Compartilhar sem arquivo caso o navegador não suporte partilha de ficheiros
        await navigator.share({
          title: `Ficha de Avaliação - ${options.ficha.nomeCliente}`,
          text: `Ficha de Avaliação Capilar de ${options.ficha.nomeCliente} emitida em ${dataHojeIso}.`
        });
        return true;
      }
    } catch (e: any) {
      if (e?.name !== 'AbortError') {
        console.warn('Web Share falhou, realizando download direto:', e);
        doc.save(nomeArquivo);
      }
      return false;
    }
  }

  // Fallback download direto
  doc.save(nomeArquivo);
  return false;
}
