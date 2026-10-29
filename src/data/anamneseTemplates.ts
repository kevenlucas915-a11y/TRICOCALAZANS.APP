import { ModeloAnamnese } from '../types/anamnese';

export const MODELO_FICHA_AVALIACAO_CAPILAR_ID = 'modelo_ficha_avaliacao_capilar';

export const MODELO_FICHA_AVALIACAO_CAPILAR: ModeloAnamnese = {
  id: MODELO_FICHA_AVALIACAO_CAPILAR_ID,
  titulo: 'Ficha de Avaliação Capilar',
  descricao: 'Questionário dinâmico por etapas com dados cadastrais, histórico de saúde, hábitos, rotina capilar, termo de consentimento, assinatura digital e geração de PDF.',
  categoria: 'Avaliação Inicial',
  isPadrao: true,
  perguntas: [
    {
      id: 'p_dados_cliente',
      tipo: 'texto_curto',
      titulo: 'Dados Cadastrais do Cliente (Etapa 1)',
      obrigatoria: true
    },
    {
      id: 'p_queixa_principal',
      tipo: 'paragrafo',
      titulo: 'Queixa Principal (Etapa 2)',
      obrigatoria: false
    },
    {
      id: 'p_saude_geral',
      tipo: 'paragrafo',
      titulo: 'Histórico de Saúde e Cirurgias (Etapa 3)',
      obrigatoria: false
    },
    {
      id: 'p_habitos_rotina',
      tipo: 'paragrafo',
      titulo: 'Hábitos e Sono (Etapa 4)',
      obrigatoria: false
    },
    {
      id: 'p_saude_mulher',
      tipo: 'paragrafo',
      titulo: 'Saúde Feminina (Etapa 5)',
      obrigatoria: false
    },
    {
      id: 'p_cabelo_rotina',
      tipo: 'paragrafo',
      titulo: 'Cabelo e Rotina (Etapa 6)',
      obrigatoria: false
    },
    {
      id: 'p_avaliacao_conduta',
      tipo: 'paragrafo',
      titulo: 'Avaliação da Profissional (Etapa 7)',
      obrigatoria: false
    },
    {
      id: 'p_revisao_assinatura',
      tipo: 'texto_curto',
      titulo: 'Revisão, Declaração e Assinatura Digital (Etapa 8)',
      obrigatoria: false
    }
  ],
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z'
};

export const MODELOS_ANAMNESE_PADRAO: ModeloAnamnese[] = [
  MODELO_FICHA_AVALIACAO_CAPILAR,
  {
    id: 'modelo_trico_geral',
    titulo: 'Anamnese Tricológica Completa',
    descricao: 'Protocolo de avaliação clínica inicial para queixas de queda capilar, alterações no couro cabeludo e histórico do paciente.',
    categoria: 'Tricologia Geral',
    isPadrao: true,
    perguntas: [
      {
        id: 'p_queixa_tempo',
        tipo: 'multipla_escolha',
        titulo: 'Há quanto tempo percebe a queixa ou a queda de cabelo?',
        descricao: 'Duração aproximada do quadro atual relatado pelo paciente.',
        obrigatoria: true,
        opcoes: [
          'Menos de 3 meses (Quadro agudo)',
          'Entre 3 e 6 meses',
          'Entre 6 meses e 1 ano',
          'Mais de 1 ano (Quadro crônico ou progressivo)',
          'Sempre tive cabelos finos / pouca densidade'
        ]
      },
      {
        id: 'p_intensidade_queda',
        tipo: 'escala_linear',
        titulo: 'Intensidade percebida da perda diária de fios',
        descricao: 'Avaliação subjetiva de intensidade comparada ao habitual do paciente.',
        obrigatoria: true,
        escalaMin: 1,
        escalaMax: 5,
        escalaMinLabel: 'Queda leve / Normal',
        escalaMaxLabel: 'Queda muito intensa / Tufos'
      },
      {
        id: 'p_sintomas_couro',
        tipo: 'caixas_selecao',
        titulo: 'Sintomas e sensações no couro cabeludo',
        descricao: 'Marque todos os sintomas relatados pelo paciente.',
        obrigatoria: false,
        opcoes: [
          'Prurido (coceira frequente)',
          'Tricodinia (dor ou sensibilidade na raiz ao movimentar os fios)',
          'Ardência ou queimação',
          'Oleosidade excessiva ou rápida (precisa lavar todo dia)',
          'Descamação (caspa fina ou crostas aderentes)',
          'Nenhum sintoma percebido no couro cabeludo'
        ]
      },
      {
        id: 'p_historico_familiar',
        tipo: 'multipla_escolha',
        titulo: 'Histórico familiar de calvície ou queda acentuada',
        descricao: 'Presença de parentes de 1º ou 2º grau com rarefação capilar.',
        obrigatoria: true,
        opcoes: [
          'Sim, paterno (pai, tios ou avô paterno)',
          'Sim, materno (mãe, tios ou avô materno)',
          'Sim, ambos os lados da família',
          'Não há histórico familiar conhecido',
          'Não sabe informar'
        ]
      },
      {
        id: 'p_gatilhos_recentes',
        tipo: 'caixas_selecao',
        titulo: 'Gatilhos ocorridos nos últimos 3 a 6 meses',
        descricao: 'Fatores sistêmicos ou emocionais potenciais desencadeadores.',
        obrigatoria: false,
        opcoes: [
          'Estresse emocional agudo ou luto',
          'Infecção com febre alta, Dengue ou COVID-19',
          'Cirurgia recente sob anestesia geral',
          'Parto recente ou interrupção de anticoncepcional',
          'Dieta restritiva ou emagrecimento rápido (> 3kg)',
          'Alterações menstruais ou uso de reposição hormonal',
          'Nenhum fator desencadeador aparente'
        ]
      },
      {
        id: 'p_quimicas_tracao',
        tipo: 'caixas_selecao',
        titulo: 'Hábitos capilares e procedimentos cosméticos',
        descricao: 'Rotina de cuidados, químicas e tração mecânica.',
        obrigatoria: false,
        opcoes: [
          'Alisamentos térmicos ou progressivas com formol/ácidos',
          'Coloração, mechas ou descoloração frequente',
          'Penteados com tração constante (rabos de cavalo apertados, tranças/box braids)',
          'Uso diário de secador em temperatura alta ou prancha',
          'Lavagem espaçada (menos de 2x por semana)',
          'Sem químicas recentes'
        ]
      },
      {
        id: 'p_medicamentos_suplementos',
        tipo: 'paragrafo',
        titulo: 'Medicações contínuas, suplementos ou tratamentos prévios',
        descricao: 'Ex: anticoncepcionais, antidepressivos, biotina, ferro, minoxidil tópico/oral.',
        obrigatoria: false
      }
    ],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z'
  },
  {
    id: 'modelo_efluvio_telogeno',
    titulo: 'Investigação de Queda Aguda (Eflúvio Telógeno)',
    descricao: 'Questionário rápido direcionado à identificação de gatilhos cronológicos para perda telógena aguda difusa.',
    categoria: 'Queda Aguda',
    isPadrao: true,
    perguntas: [
      {
        id: 'p_data_inicio',
        tipo: 'texto_curto',
        titulo: 'Mês ou momento exato em que a queda abrupta começou',
        descricao: 'Data aproximada de início do desprendimento dos fios.',
        obrigatoria: true
      },
      {
        id: 'p_aspecto_fios',
        tipo: 'multipla_escolha',
        titulo: 'Aspecto dos fios que se desprendem na escova ou banho',
        descricao: 'Observação do paciente sobre o tamanho e extremidade dos fios caídos.',
        obrigatoria: true,
        opcoes: [
          'Fios compridos e inteiros com pequena bolinha branca na raiz (telógeno)',
          'Pedaços de fios quebrados sem raiz visível',
          'Fios curtos e muito finos',
          'Variados (fios longos e quebradiços)'
        ]
      },
      {
        id: 'p_exames_laboratoriais',
        tipo: 'sim_nao',
        titulo: 'Realizou exames de sangue recentes (Ferritina, TSH, Vitamina D, Zinco)?',
        obrigatoria: true
      },
      {
        id: 'p_nivel_estresse',
        tipo: 'escala_linear',
        titulo: 'Nível de sobrecarga ou estresse recente percebido',
        descricao: 'Impacto da rotina e ansiedade nos últimos 3 meses.',
        obrigatoria: false,
        escalaMin: 1,
        escalaMax: 10,
        escalaMinLabel: 'Tranquilo',
        escalaMaxLabel: 'Extremamente estressante'
      }
    ],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z'
  },
  {
    id: 'modelo_alopecia_androgenetica',
    titulo: 'Avaliação de Alopecia Androgenética (AAG / FAGA / MAGA)',
    descricao: 'Ficha especializada em avaliar afinamento progressivo, padrão de miniaturização e histórico evolutivo.',
    categoria: 'Alopecia Androgenética',
    isPadrao: true,
    perguntas: [
      {
        id: 'p_regioes_afinamento',
        tipo: 'caixas_selecao',
        titulo: 'Regiões com afinamento ou couro cabeludo mais visível',
        descricao: 'Zonas anatômicas onde a densidade diminuiu.',
        obrigatoria: true,
        opcoes: [
          'Linha média / risca do cabelo alargada',
          'Vértex / Coroa no topo da cabeça',
          'Entradas laterais / Recessões frontais',
          'Redução difusa por todo o couro cabeludo',
          'Bitemporal (laterais acima das orelhas)'
        ]
      },
      {
        id: 'p_percepcao_crescimento',
        tipo: 'multipla_escolha',
        titulo: 'Comportamento do comprimento máximo atingido pelos fios',
        descricao: 'Indício clínico de encurtamento da fase anágena.',
        obrigatoria: true,
        opcoes: [
          'Os fios não passam mais de determinado comprimento',
          'Crescimento normal, apenas diminuição na quantidade',
          'Crescimento muito lento e fios quebradiços'
        ]
      },
      {
        id: 'p_idade_primeiros_sinais',
        tipo: 'texto_curto',
        titulo: 'Com que idade percebeu os primeiros sinais de afinamento?',
        obrigatoria: false
      },
      {
        id: 'p_resposta_tratamentos_anteriores',
        tipo: 'paragrafo',
        titulo: 'Já utilizou tônicos, loções, laserterapia, LED ou medicamentos orais?',
        descricao: 'Descreva quais substâncias e por quanto tempo usou.',
        obrigatoria: false
      }
    ],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z'
  }
];
