import { CasoAtlas } from '../types/tricoscopia';

/**
 * 17 Condições Clínicas Oficiais do "Atlas Visual de Tricoscopia"
 * Fonte exclusiva: Manual "Damiana Calazans — Atlas Visual de Tricoscopia"
 * 
 * 1. Androgenética
 * 2. Areata
 * 3. Caspa
 * 4. Dermatite de contato
 * 5. Dermatite seborreica
 * 6. Eflúvio anágeno
 * 7. Eflúvio telógeno
 * 8. Escabiose
 * 9. Fibrosante frontal
 * 10. Foliculite decalvante
 * 11. Líquen plano pilar
 * 12. Pediculose
 * 13. Psoríase
 * 14. Seborreia
 * 15. Tinea
 * 16. Tração
 * 17. Xerose
 */
export const CASOS_17_OFICIAIS: CasoAtlas[] = [
  // 1. Androgenética
  {
    id: 'cond-androgenetica',
    numeroOrdem: 1,
    nome: 'Alopecia Androgenética (AAG / AAC)',
    categoria: 'Não Cicatricial',
    imagem: {
      id: 'img-aag-p16',
      casoId: 'cond-androgenetica',
      paginaPdf: 16,
      aumento: '50x',
      legenda: 'Miniaturização progressiva, diversidade de diâmetro (anisotricose), aumento de unidades com fio único e fios vellus.',
      contexto: 'Heterogeneidade marcante de diâmetros no mesmo campo com predomínio de unidades de 1 a 2 fios.',
      achadosVisiveis: ['ach-anisotricose', 'ach-fios-vellus']
    },
    oQueObservar: [
      'Miniaturização folicular (fios finos, curtos e de diâmetro reduzido)',
      'Diversidade de diâmetro / Anisotricose marcante no mesmo campo (> 20%)',
      'Redução do número de fios por unidade folicular (predomínio de 1 a 2 fios)',
      'Frequência elevada de unidades solitárias (apenas 1 fio emergente)',
      'Aumento da proporção de fios finos e vellus',
      'Óstios foliculares preservados e desobstruídos'
    ],
    caracteristicas: [
      'Alopecia não cicatricial geneticamente determinada e hormonodependente',
      'Processo contínuo de miniaturização progressiva dos fios',
      'Transformação de fios terminais em intermediários e vellus',
      'Redução da densidade capilar visual com afinamento progressivo',
      'Distribuição anatômica típica em áreas androgenodependentes'
    ],
    achadosTricoscopicos: [
      'Heterogeneidade de calibre (anisotricose superior a 20%)',
      'Presença de fios miniaturizados ao lado de fios terminais',
      'Predomínio de unidades com 1 a 2 fios (em vez de 2 a 4)',
      'Aumento percentual de fios vellus',
      'Óstios preservados (pontos amarelos discretos podem ocorrer em fases avançadas)'
    ],
    achadosIds: ['ach-anisotricose', 'ach-fios-vellus', 'ach-pontos-amarelos'],
    significadoClinico: 'Miniaturização folicular hormônio-dependente. A identificação precoce da variação de diâmetro permite instituir intervenção antes da perda avançada da densidade clínica.',
    comoReconhecer: [
      'Comparar a área afetada (topo/vértex) com a região occipital (controle)',
      'Identificar fios finos e claros convivendo com fios grossos no mesmo campo tricoscópico',
      'Constatar predomínio de unidades solitárias com apenas 1 fio saindo do óstio'
    ],
    padrao: 'Miniaturização regional progressiva / Heterogêneo',
    localizacao: 'Homem: região frontal, temporais e vértex. Mulher: rarefação difusa no topo/vértex com preservação da linha frontal de implantação.',
    diferenciaisComparações: [
      {
        casoId: 'cond-efluvio-telogeno',
        nomeCaso: 'Eflúvio Telógeno',
        distincaoChave: 'AAG tem miniaturização, anisotropia marcante (>20%) e padrão regional; o eflúvio tem diâmetro homogêneo e queda difusa sem padrão regional.'
      },
      {
        casoId: 'cond-frontal-fibrosante',
        nomeCaso: 'Alopecia Fibrosante Frontal',
        distincaoChave: 'AAG feminina preserva a linha frontal de implantação e mantém óstios abertos; a AFF destrói os óstios de forma cicatricial na margem frontotemporal.'
      }
    ],
    referenciasRelacionadas: ['cond-efluvio-telogeno', 'cond-frontal-fibrosante'],
    resumoOriginal: 'A alopecia androgenética apresenta miniaturização dos fios, variedade no diâmetro do eixo capilar, redução da densidade de fios por unidade folicular e aumento de fios finos e vellus, com distribuição típica nas áreas androgenodependentes.',
    fontePagina: 16,
    outrasPaginas: [4, 6, 7]
  },

  // 2. Areata
  {
    id: 'cond-areata',
    numeroOrdem: 2,
    nome: 'Alopecia Areata',
    categoria: 'Não Cicatricial',
    imagem: {
      id: 'img-areata-p08',
      casoId: 'cond-areata',
      paginaPdf: 8,
      aumento: '50x',
      legenda: 'Sinais clássicos de atividade: pontos amarelos, pontos pretos, fios em ponto de exclamação e fios vellus em rebrota.',
      contexto: 'Placa alopécica com óstios preservados exibindo sinais clássicos de agressão imunitária ao folículo.',
      achadosVisiveis: ['ach-pelos-exclamacao', 'ach-pontos-pretos', 'ach-pontos-amarelos', 'ach-fios-vellus']
    },
    oQueObservar: [
      'Pelos em ponto de exclamação (base fina proximal e extremidade distal mais espessa e pigmentada)',
      'Pontos pretos (black dots - restos de hastes quebradas no interior do óstio)',
      'Pontos amarelos (yellow dots - dilatações foliculares preenchidas por queratina e sebo)',
      'Fios quebrados em comprimentos curtos e irregulares',
      'Fios vellus de repilação (finos, curtos e hipopigmentados em regeneração)',
      'Óstios foliculares inteiramente preservados (sem fibrose destrutiva)'
    ],
    caracteristicas: [
      'Doença inflamatória autoimune mediada por linfócitos T contra o folículo em crescimento',
      'Queda de cabelos não cicatricial com preservação integral dos óstios',
      'Disposição típica em placas arredondadas ou ovais bem delimitadas',
      'Sinais tricoscópicos que refletem diretamente a atividade da doença'
    ],
    achadosTricoscopicos: [
      'Pelos em ponto de exclamação (marcador típico de periferia ativa)',
      'Pontos pretos / Black dots (marcador de agressão aguda rápida)',
      'Pontos amarelos (folículos vazios preenchidos)',
      'Fios quebrados e distróficos',
      'Fios vellus de repilação (sinal de resposta terapêutica)'
    ],
    achadosIds: ['ach-pelos-exclamacao', 'ach-pontos-pretos', 'ach-pontos-amarelos', 'ach-fios-quebrados', 'ach-fios-vellus'],
    significadoClinico: 'Interrupção do ciclo folicular por agressão autoimune. Pontos pretos e pelos em exclamação indicam doença ativa em expansão; fios vellus indicam repilação e bom prognóstico.',
    comoReconhecer: [
      'Inspecionar a borda ativa da placa alopécica buscando pelos afilados na base (em ponto de exclamação)',
      'Identificar pontos pretos no fundo dos óstios foliculares',
      'Observar pontos amarelos arredondados nos folículos desprovidos de haste'
    ],
    padrao: 'Em placas bem delimitadas / Inflamatório autoimune',
    localizacao: 'Placas bem circunscritas, uni ou multifocais no couro cabeludo; variantes difusas ou ofiásicas.',
    diferenciaisComparações: [
      {
        casoId: 'cond-tracao',
        nomeCaso: 'Alopecia por Tração',
        distincaoChave: 'Alopecia areata tem pelos em exclamação e pontos amarelos; a tração tem cilindros de queratina móveis (hair casts) e decorre de tensão física.'
      },
      {
        casoId: 'cond-tinea-capitis',
        nomeCaso: 'Tinea Capitis',
        distincaoChave: 'A tinea capitis exibe descamação rica e fios em vírgula/espiral; a AA tem pouca descamação e pelos em exclamação.'
      }
    ],
    referenciasRelacionadas: ['cond-tinea-capitis', 'cond-tracao'],
    resumoOriginal: 'A alopecia areata apresenta um conjunto de sinais tricoscópicos característicos e bem reconhecidos: pelos em exclamação, pontos pretos e amarelos, com óstios foliculares preservados.',
    fontePagina: 8,
    outrasPaginas: [3, 5, 10, 17]
  },

  // 3. Caspa
  {
    id: 'cond-caspa',
    numeroOrdem: 3,
    nome: 'Caspa (Pitiríase Capitis)',
    categoria: 'Dermatose Descamativa',
    imagem: {
      id: 'img-caspa-p12',
      casoId: 'cond-caspa',
      paginaPdf: 12,
      aumento: '50x',
      legenda: 'Escamas secas, finas e translúcidas dispersas sobre o couro cabeludo e hastes, sem eritema de base.',
      contexto: 'Descamação laminar superficial seca com óstios e hastes preservados.',
      achadosVisiveis: ['ach-escamas-secas-soltas']
    },
    oQueObservar: [
      'Escamas brancas ou acinzentadas, finas, secas e não aderentes',
      'Fácil desprendimento das escamas ao toque do tricoscópio',
      'Ausência de eritema de base significativo ou hiperemia',
      'Óstios foliculares abertos, desobstruídos e íntegros',
      'Hastes capilares normais sem quebras ou distrofias'
    ],
    caracteristicas: [
      'Desordem proliferativa superficial não inflamatória ou minimamente inflamatória',
      'Renovação acelerada dos queratinócitos da camada córnea',
      'Não afeta o aparelho folicular nem causa miniaturização ou alopecia',
      'Associada à colonização por Malassezia em estrato córneo suscetível'
    ],
    achadosTricoscopicos: [
      'Escamas secas finas e translúcidas dispersas',
      'Dispersão solta interfolicular e ao longo das hastes',
      'Couro cabeludo com coloração homogênea normal, sem rubor',
      'Óstios foliculares totalmente preservados'
    ],
    achadosIds: ['ach-escamas-secas-soltas', 'ach-fios-terminais'],
    significadoClinico: 'Descamação fisiopatológica superficial do estrato córneo. Distingue-se da dermatite seborreica pela ausência de secreção sebácea espessa aderente e ausência de eritema de fundo.',
    comoReconhecer: [
      'Visualizar pequenas partículas descamativas secas esbranquiçadas e soltas',
      'Observar fundo cutâneo claro normal sem dilatações vasculares',
      'Constatar que as escamas não formam placas gordurosas aderentes'
    ],
    padrao: 'Descamativo superficial seco não inflamatório',
    localizacao: 'Difusa em todo o couro cabeludo, com desprendimento sobre as hastes.',
    diferenciaisComparações: [
      {
        casoId: 'cond-dermatite-seborreica',
        nomeCaso: 'Dermatite Seborreica',
        distincaoChave: 'A caspa tem escamas secas brancas e sem eritema; a dermatite seborreica exibe escamas amareladas gordurosas com eritema.'
      },
      {
        casoId: 'cond-psoriase',
        nomeCaso: 'Psoríase do Couro Cabeludo',
        distincaoChave: 'A psoríase apresenta escamas espessas prateadas e vasos em glomérulos regulares; a caspa tem escamas finas soltas sem vasos anômalos.'
      },
      {
        casoId: 'cond-xerose',
        nomeCaso: 'Xerose Cutânea',
        distincaoChave: 'A xerose exibe fissuras em mosaico na pele desidratada; a caspa tem escamas laminares soltas dispersas.'
      }
    ],
    referenciasRelacionadas: ['cond-dermatite-seborreica', 'cond-xerose', 'cond-psoriase'],
    resumoOriginal: 'A caspa (pitiríase capitis) manifesta-se por escamas secas finas desprendíveis, sem eritema relevante e com preservação folicular integral.',
    fontePagina: 12,
    outrasPaginas: [14]
  },

  // 4. Dermatite de contato
  {
    id: 'cond-dermatite-contato',
    numeroOrdem: 4,
    nome: 'Dermatite de Contato',
    categoria: 'Dermatose Descamativa',
    imagem: {
      id: 'img-dermatite-contato-p14',
      casoId: 'cond-dermatite-contato',
      paginaPdf: 14,
      aumento: '50x',
      legenda: 'Eritema vivo difuso, edema interfolicular e descamação superficial reacional pós-exposição a agentes químicos.',
      contexto: 'Reação inflamatória aguda pós-exposição a cosméticos, tinturas ou alisantes.',
      achadosVisiveis: ['ach-eritema-edema-contato']
    },
    oQueObservar: [
      'Eritema difuso vivo e irregular de tonalidade avermelhada a rosada',
      'Edema interfolicular com aspecto túrgido da superfície cutânea',
      'Descamação fina a moderada laminar reacional pós-inflamatória',
      'Vasos lineares e puntiformes reativos congestos sem distribuição geométrica',
      'Óstios foliculares mantidos (sem perda cicatricial imediata)'
    ],
    caracteristicas: [
      'Reação inflamatória cutânea secundária ao contato com substâncias irritantes ou alérgenos (tinturas, descolorantes, alisantes, cosméticos)',
      'Início agudo ou subagudo associado a prurido, queimação ou ardência',
      'Pode ser de mecanismo irritativo direto ou alérgico imunomediado',
      'Preservação dos folículos pilosos quando controlada precocemente'
    ],
    achadosTricoscopicos: [
      'Eritema difuso em borrão avermelhado vivo',
      'Edema da derme superficial',
      'Descamação laminar reacional descolando da superfície',
      'Vasos delgados congestos'
    ],
    achadosIds: ['ach-eritema-edema-contato'],
    significadoClinico: 'Resposta inflamatória exógena aguda. O diagnóstico precoce previne danos mais profundos ao aparelho folicular causados por queimaduras químicas secundárias.',
    comoReconhecer: [
      'Fundo hiperêmico avermelhado brilhante correspondendo à área de aplicação do produto cosmético',
      'Presença de edema interfolicular e descamação reacional sem tampões foliculares profundos'
    ],
    padrao: 'Inflamatório eritematoso difuso reacional',
    localizacao: 'Áreas de contato com agentes tópicos (frequentemente linha frontal, vértex e nuca).',
    diferenciaisComparações: [
      {
        casoId: 'cond-dermatite-seborreica',
        nomeCaso: 'Dermatite Seborreica',
        distincaoChave: 'Dermatite de contato tem início súbito após agente químico com ardência viva e eritema brilhante; a seborreia é crônica com escamas oleosas amareladas.'
      },
      {
        casoId: 'cond-psoriase',
        nomeCaso: 'Psoríase do Couro Cabeludo',
        distincaoChave: 'Psoríase tem limites abruptos e vasos em glomérulos regulares; a dermatite de contato tem limites irregulares e edema reacional difuso.'
      }
    ],
    referenciasRelacionadas: ['cond-dermatite-seborreica', 'cond-psoriase'],
    resumoOriginal: 'A dermatite de contato no couro cabeludo exibe eritema difuso reativo, edema interfolicular e descamação superficial após agressão química ou alérgica tópica.',
    fontePagina: 14,
    outrasPaginas: [13]
  },

  // 5. Dermatite seborreica
  {
    id: 'cond-dermatite-seborreica',
    numeroOrdem: 5,
    nome: 'Dermatite Seborreica',
    categoria: 'Dermatose Descamativa',
    imagem: {
      id: 'img-ds-p28',
      casoId: 'cond-dermatite-seborreica',
      paginaPdf: 28,
      aumento: '50x',
      legenda: 'Escamas amareladas e oleosas aderentes aos fios e couro cabeludo, com eritema discreto a moderado e padrão difuso.',
      contexto: 'Processo inflamatório superficial com descamação untuosa e óstios preservados.',
      achadosVisiveis: ['ach-escamas-amareladas']
    },
    oQueObservar: [
      'Escamas amareladas, oleosas e aderentes (aspecto untuoso)',
      'Distribuição difusa envolvendo hastes e couro cabeludo',
      'Eritema discreto a moderado com contornos mal definidos',
      'Vasos puntiformes ou lineares delgados pouco específicos',
      'Óstios foliculares preservados sem alterações destrutivas'
    ],
    caracteristicas: [
      'Dermatose inflamatória crônica e recorrente',
      'Associada à hiperatividade de glândulas sebáceas e colonização por Malassezia spp.',
      'Processo predominantemente superficial restrito à epiderme e derme superior',
      'Fatores desencadeantes: estresse emocional, alterações climáticas e oleosidade'
    ],
    achadosTricoscopicos: [
      'Escamas amareladas untuosas e aderidas à base dos fios',
      'Tampões sebáceos superficiais',
      'Vasos ectasiados discretos inespecíficos',
      'Óstios foliculares viáveis e preservados'
    ],
    achadosIds: ['ach-escamas-amareladas'],
    significadoClinico: 'Inflamação epidérmica superficial não destrutiva. A ausência de destruição folicular e de vasos glomerulares afasta alopecias cicatriciais e psoríase.',
    comoReconhecer: [
      'Identificar escamas amareladas com aspecto de gordura colada nos fios e na superfície cutânea',
      'Notar eritema moderado e difuso sem margem abrupta',
      'Constatar ausência dos vasos em glomérulo típicos da psoríase'
    ],
    padrao: 'Superficial difuso / Descamativo untuoso',
    localizacao: 'Áreas seborreicas do couro cabeludo com distribuição difusa (vértex, topo e linhas de implantação).',
    diferenciaisComparações: [
      {
        casoId: 'cond-psoriase',
        nomeCaso: 'Psoríase do Couro Cabeludo',
        distincaoChave: 'Escamas amareladas, untuosas e vasos inespecíficos na seborreia vs. escamas prateadas secas e vasos glomerulares numerosos na psoríase.'
      },
      {
        casoId: 'cond-caspa',
        nomeCaso: 'Caspa',
        distincaoChave: 'Caspa não tem eritema e suas escamas são secas e soltas; na dermatite seborreica há inflamação e escamas aderentes untuosas.'
      },
      {
        casoId: 'cond-seborreia',
        nomeCaso: 'Seborreia (Hiperseborreia)',
        distincaoChave: 'Seborreia é apenas o fluxo lipídico sem eritema ou descamação inflamatória; a dermatite seborreica combina sebo a eritema e descamação.'
      }
    ],
    referenciasRelacionadas: ['cond-psoriase', 'cond-caspa', 'cond-seborreia'],
    resumoOriginal: 'A dermatite seborreica apresenta escamas amareladas e oleosas, eritema discreto a moderado e padrão difuso, com envolvimento superficial. A diferença para a psoríase baseia-se no aspecto das escamas e no padrão vascular.',
    fontePagina: 28,
    outrasPaginas: [11, 13, 14, 15]
  },

  // 6. Eflúvio anágeno
  {
    id: 'cond-efluvio-anageno',
    numeroOrdem: 6,
    nome: 'Eflúvio Anágeno',
    categoria: 'Não Cicatricial',
    imagem: {
      id: 'img-efluvio-anageno-p06',
      casoId: 'cond-efluvio-anageno',
      paginaPdf: 6,
      aumento: '50x',
      legenda: 'Fraturas transversais abruptas ao nível do couro cabeludo, afilamento proximal da raiz e óstios foliculares vazios preservados.',
      contexto: 'Parada mitótica aguda com fratura de hastes anágenas e óstios viáveis.',
      achadosVisiveis: ['ach-pohl-pinkus', 'ach-fios-quebrados']
    },
    oQueObservar: [
      'Hastes com afinamento abrupto na porção proximal emergente (constrições de Pohl-Pinkus)',
      'Fios quebrados no nível ou logo acima do óstio folicular',
      'Óstios foliculares amplamente abertos e desprovidos de haste',
      'Ausência de pontos amarelos volumosos ou de inflamação destrutiva',
      'Distribuição rápida e difusa'
    ],
    caracteristicas: [
      'Queda abrupta e maciça de cabelos na fase de crescimento ativo (anágena)',
      'Causada por agressão mitótica grave da matriz folicular (quimioterapia, radioterapia, intoxicações)',
      'Perda de até 80-90% dos cabelos em poucos dias ou semanas após a agressão',
      'Potencial de regeneração completa após remoção do agente causal'
    ],
    achadosTricoscopicos: [
      'Constrições focais no diâmetro da haste (linhas de constrição / Pohl-Pinkus)',
      'Fraturas transversais com extremidades limpas',
      'Grande quantidade de óstios foliculares vazios patentes',
      'Ausência de miniaturização prévia'
    ],
    achadosIds: ['ach-pohl-pinkus', 'ach-fios-quebrados', 'ach-fios-terminais'],
    significadoClinico: 'Interrupção celular mitótica aguda na matriz folicular. A preservação integral dos óstios foliculares e do bulbo viável assegura a recuperação capilar com o término do tratamento causal.',
    comoReconhecer: [
      'Notar que os fios remanescentes quebram-se facilmente com leve tração e mostram raízes afiladas ou fraturadas transversalmente',
      'Confirmar que os óstios estão completamente abertos e vazios em todo o couro cabeludo'
    ],
    padrao: 'Distrofia mitótica aguda com óstios vazios patentes',
    localizacao: 'Difuso e homogêneo por todo o couro cabeludo.',
    diferenciaisComparações: [
      {
        casoId: 'cond-efluvio-telogeno',
        nomeCaso: 'Eflúvio Telógeno',
        distincaoChave: 'Eflúvio anágeno surge dias após quimioterapia/tóxico com fratura distrófica da raiz; o eflúvio telógeno surge 2-3 meses pós-gatilho com bulbos íntegros em clava.'
      },
      {
        casoId: 'cond-areata',
        nomeCaso: 'Alopecia Areata',
        distincaoChave: 'Alopecia areata apresenta pontos pretos, amarelos e pelos em exclamação delimitados; o eflúvio anágeno é difuso sem infiltrado em exclamação.'
      }
    ],
    referenciasRelacionadas: ['cond-efluvio-telogeno', 'cond-areata'],
    resumoOriginal: 'O eflúvio anágeno apresenta queda aguda por parada mitótica dos folículos, com fraturas transversais da haste, constrições proximais e óstios foliculares preservados.',
    fontePagina: 6,
    outrasPaginas: [5]
  },

  // 7. Eflúvio telógeno
  {
    id: 'cond-efluvio-telogeno',
    numeroOrdem: 7,
    nome: 'Eflúvio Telógeno',
    categoria: 'Não Cicatricial',
    imagem: {
      id: 'img-efluvio-p07',
      casoId: 'cond-efluvio-telogeno',
      paginaPdf: 7,
      aumento: '50x',
      legenda: 'Padrão tricoscópico de queda difusa, com preservação da morfologia folicular e diâmetros mais homogêneos.',
      contexto: 'Óstios preservados com predomínio de fios terminais de calibre uniforme.',
      achadosVisiveis: ['ach-fios-terminais']
    },
    oQueObservar: [
      'Óstios foliculares bem visíveis e preservados em todas as regiões',
      'Diâmetro dos fios mais homogêneo (pouca variação de calibre, anisotropia < 10%)',
      'Predomínio mantido de fios terminais saudáveis',
      'Presença de fios novos curtos com ponta cônica afilada (rebrota)',
      'Ausência de sinais de miniaturização regionalizada marcante'
    ],
    caracteristicas: [
      'Alopecia não cicatricial caracterizada por perda difusa dos fios',
      'Preservação da arquitetura e da espessura dos folículos',
      'Passagem sincronizada de folículos de anágeno para telógeno 2 a 3 meses pós-gatilho',
      'Ausência de padrão regional definido e potencial de reversibilidade completa'
    ],
    achadosTricoscopicos: [
      'Óstios foliculares preservados em todo o couro',
      'Diâmetro homogêneo das hastes remanescentes',
      'Poucos fios miniaturizados (sem anisotropia marcante)',
      'Fios novos em crescimento com extremidade afilada'
    ],
    achadosIds: ['ach-fios-terminais'],
    significadoClinico: 'Queda difusa transitória com preservação da morfologia folicular. Diferencia-se da AAG pela ausência de miniaturização progressiva.',
    comoReconhecer: [
      'Notar que as hastes remanescentes têm calibre uniforme e saudável',
      'Confirmar que os óstios estão abertos em todas as regiões examinadas',
      'Constatar ausência de miniaturização localizada no topo da cabeça'
    ],
    padrao: 'Queda difusa homogênea',
    localizacao: 'Difuso em todo o couro cabeludo, sem padrão regional definido.',
    diferenciaisComparações: [
      {
        casoId: 'cond-androgenetica',
        nomeCaso: 'Alopecia Androgenética',
        distincaoChave: 'Diâmetro homogêneo e queda difusa no eflúvio vs. diversidade de calibres (anisotricose) e localização no topo da AAG.'
      },
      {
        casoId: 'cond-efluvio-anageno',
        nomeCaso: 'Eflúvio Anágeno',
        distincaoChave: 'Eflúvio telógeno surge semanas/meses após o gatilho sem fratura; o anágeno surge precocemente com fraturas na raiz.'
      }
    ],
    referenciasRelacionadas: ['cond-androgenetica', 'cond-efluvio-anageno'],
    resumoOriginal: 'No eflúvio telógeno, há queda difusa, óstios preservados, diâmetro mais homogêneo dos fios e ausência de miniaturização marcante.',
    fontePagina: 7,
    outrasPaginas: [6]
  },

  // 8. Escabiose
  {
    id: 'cond-escabiose',
    numeroOrdem: 8,
    nome: 'Escabiose (Sarna do Couro Cabeludo)',
    categoria: 'Parasitária',
    imagem: {
      id: 'img-escabiose-p19',
      casoId: 'cond-escabiose',
      paginaPdf: 19,
      aumento: '50x',
      legenda: 'Sinal da asa-delta (estrutura triangular pigmentada) na extremidade do túnel escabiótico com crostas reacionais.',
      contexto: 'Infestação parasitária por Sarcoptes scabiei com túneis intraepidérmicos e ácaro visível.',
      achadosVisiveis: ['ach-asa-delta']
    },
    oQueObservar: [
      'Sinal da asa-delta / sinal do caça a jato (pequena estrutura triangular escura correspondente à cabeça e patas anteriores do ácaro)',
      'Túneis escabióticos (linhas delgadas sinuosas esbranquiçadas no estrato córneo)',
      'Escamas, escoriações mecânicas e pequenas crostas hemáticas',
      'Eritema inflamatório reativo',
      'Preservação dos folículos e das hastes capilares'
    ],
    caracteristicas: [
      'Ectoparasitose causada pelo ácaro Sarcoptes scabiei var. hominis',
      'Acometimento de couro cabeludo mais comum em lactentes, crianças e imunossuprimidos',
      'Prurido intenso de predomínio noturno',
      'Altamente contagiosa por contato direto interpessoal'
    ],
    achadosTricoscopicos: [
      'Sinal da asa-delta (ácaro na extremidade distal do túnel)',
      'Túnel serpiginoso esbranquiçado superficial',
      'Crostas puntiformes de escoriação',
      'Óstios foliculares mantidos íntegros'
    ],
    achadosIds: ['ach-asa-delta'],
    significadoClinico: 'A visualização do sinal da asa-delta sob tricoscopia constitui confirmação diagnóstica direta, permitindo prescrição acaricida imediata e orientação epidemiológica aos contactantes.',
    comoReconhecer: [
      'Examinar áreas com micropápulas e escoriações à procura de linhas sinuosas esbranquiçadas (túneis) terminando em um minúsculo ponto triangular acastanhado/cinzento'
    ],
    padrao: 'Parasitário em túnel com estrutura triangular característica',
    localizacao: 'Região retroauricular, nuca e margens do couro cabeludo; difuso nas formas crostosas.',
    diferenciaisComparações: [
      {
        casoId: 'cond-pediculose',
        nomeCaso: 'Pediculose',
        distincaoChave: 'Na escabiose o ácaro está dentro do túnel na pele (asa-delta); na pediculose as lêndeas ovais estão coladas à haste capilar.'
      },
      {
        casoId: 'cond-dermatite-seborreica',
        nomeCaso: 'Dermatite Seborreica',
        distincaoChave: 'A escabiose tem túneis e estruturas triangulares parasitárias; a seborreia tem escamas oleosas difusas sem ácaros intraepidérmicos.'
      }
    ],
    referenciasRelacionadas: ['cond-pediculose', 'cond-dermatite-seborreica'],
    resumoOriginal: 'A escabiose no couro cabeludo manifesta-se tricoscopicamente pelo sinal da asa-delta na extremidade dos túneis escabióticos, acompanhada de crostas por escoriação.',
    fontePagina: 19,
    outrasPaginas: [13]
  },

  // 9. Fibrosante frontal
  {
    id: 'cond-frontal-fibrosante',
    numeroOrdem: 9,
    nome: 'Alopecia Fibrosante Frontal (AFF)',
    categoria: 'Cicatricial',
    imagem: {
      id: 'img-aff-p22',
      casoId: 'cond-frontal-fibrosante',
      paginaPdf: 22,
      aumento: '50x',
      legenda: 'Recuo da linha frontal, redução/ausência de óstios foliculares, eritema e descamação perifolicular.',
      contexto: 'Faixa cicatricial atrófica frontotemporal com perda definitiva de óstios e colaretes de atividade marginal.',
      achadosVisiveis: ['ach-areas-brancas-atroficas', 'ach-escamas-perifoliculares']
    },
    oQueObservar: [
      'Recuo simétrico da linha frontal e frontotemporal',
      'Ausência completa de óstios foliculares na área de recuo',
      'Superfície cutânea lisa, brilhante e esbranquiçada',
      'Eritema perifolicular e descamação fina aderente em colarete',
      'Fios isolados, finos e quebradiços na margem de implantação',
      'Acometimento de sobrancelhas com rarefação e pele lisa sem óstios'
    ],
    caracteristicas: [
      'Variante de líquen plano pilar de caráter cicatricial',
      'Acomete preferencialmente a região frontal e frontotemporal',
      'Destruição irreversível dos folículos pilosos com substituição por tecido fibroso',
      'Mais comum em mulheres na pós-menopausa',
      'Evolução lenta e progressiva, de padrão simétrico'
    ],
    achadosTricoscopicos: [
      'Perda completa de óstios na faixa frontal recuada',
      'Halo eritematoso e escama tubular aderente ao redor dos fios remanescentes',
      'Hastes solitárias isoladas na margem',
      'Desaparecimento dos pelos vellus intermediários na linha frontal'
    ],
    achadosIds: ['ach-areas-brancas-atroficas', 'ach-escamas-perifoliculares'],
    significadoClinico: 'Alopecia cicatricial de padrão frontal com perda definitiva dos folículos afetados. A tricoscopia é essencial para avaliar a atividade inflamatória e monitorar a contenção da progressão.',
    comoReconhecer: [
      'Identificar recuo da linha de implantação anterior com pele despigmentada lisa e sem poros',
      'Observar colarete descamativo e halo vermelho na raiz dos fios marginais',
      'Avaliar se há perda concomitante dos fios das sobrancelhas'
    ],
    padrao: 'Cicatricial marginal / Linfocítico',
    localizacao: 'Linha frontal e frontotemporal; pode envolver sobrancelhas, cílios e pelos corporais.',
    diferenciaisComparações: [
      {
        casoId: 'cond-androgenetica',
        nomeCaso: 'Alopecia Androgenética',
        distincaoChave: 'A AFF destrói os óstios na margem frontal; a AAG feminina preserva a linha de implantação anterior e mantém os óstios abertos.'
      },
      {
        casoId: 'cond-liquen-plano-pilar',
        nomeCaso: 'Líquen Plano Pilar',
        distincaoChave: 'A AFF tem distribuição frontotemporal clássica e perda de sobrancelhas; o LPP clássico afeta vértex e parietais em padrão centrífugo.'
      },
      {
        casoId: 'cond-tracao',
        nomeCaso: 'Alopecia por Tração',
        distincaoChave: 'A tração marginal preserva o sinal da franja e possui hair casts móveis; a AFF tem pele atrófica lisa sem pelos finos intermediários e colaretes aderentes.'
      }
    ],
    referenciasRelacionadas: ['cond-liquen-plano-pilar', 'cond-androgenetica', 'cond-tracao'],
    resumoOriginal: 'A alopecia frontal fibrosante é uma alopecia cicatricial de padrão frontal, caracterizada por recuo da linha frontal, ausência de óstios e sinais inflamatórios perifoliculares. O reconhecimento precoce permite instituir tratamento para reduzir a progressão.',
    fontePagina: 22,
    outrasPaginas: [21]
  },

  // 10. Foliculite decalvante
  {
    id: 'cond-foliculite-decalvante',
    numeroOrdem: 10,
    nome: 'Foliculite Decalvante',
    categoria: 'Cicatricial',
    imagem: {
      id: 'img-fd-p25',
      casoId: 'cond-foliculite-decalvante',
      paginaPdf: 25,
      aumento: '50x',
      legenda: 'Múltiplas pústulas, crostas, eritema intenso, tufos foliculares e áreas de destruição folicular com exsudato.',
      contexto: 'Inflamação purulenta neutrofílica crônica com tufos foliculares de múltiplos fios emergentes.',
      achadosVisiveis: ['ach-tufos-foliculares', 'ach-pustulas-crostas', 'ach-areas-brancas-atroficas']
    },
    oQueObservar: [
      'Tufos foliculares (emergência de múltiplos fios em um mesmo óstio dilatado)',
      'Pústulas foliculares e perifoliculares com conteúdo purulento amarelado',
      'Crostas e exsudato amarelado melicérico ou sero-hemático',
      'Eritema intenso e vasos puntiformes aumentados',
      'Destruição folicular com áreas cicatriciais esbranquiçadas',
      'Fios quebrados e fios em chama nas bordas'
    ],
    caracteristicas: [
      'Alopecia cicatricial primária de etiologia neutrofílica',
      'Inflamação crônica destrutiva e supurativa da unidade folicular',
      'Evolução com destruição permanente rápida dos folículos',
      'Frequente colonização associada por Staphylococcus aureus'
    ],
    achadosTricoscopicos: [
      'Tufos de fios (poliquitriquia inflamatória)',
      'Pústulas foliculares centradas no fio',
      'Crostas espessas que recobrem os óstios',
      'Áreas atróficas sem óstios'
    ],
    achadosIds: ['ach-tufos-foliculares', 'ach-pustulas-crostas', 'ach-areas-brancas-atroficas', 'ach-flame-hairs'],
    significadoClinico: 'Processo inflamatório neutrofílico supurativo agressivo. As pústulas e crostas indicam surto em atividade; a emergência em tufos é sinal patognomônico de fibrose profunda.',
    comoReconhecer: [
      'Observar múltiplos fios saindo agrupados de um orifício único dilatado (tufo folicular)',
      'Verificar pústulas ativas com exsudato purulento amarelado ao redor',
      'Constatar crostas espessas que mascaram o couro cabeludo'
    ],
    padrao: 'Cicatricial neutrofílico supurativo / Tufos em pincel',
    localizacao: 'Predomínio em vértex e regiões parietais.',
    diferenciaisComparações: [
      {
        casoId: 'cond-liquen-plano-pilar',
        nomeCaso: 'Líquen Plano Pilar',
        distincaoChave: 'Foliculite decalvante manifesta pústulas purulentas e tufos foliculares volumosos; o LPP é linfocítico, com colaretes córneos e sem supuração.'
      },
      {
        casoId: 'cond-psoriase',
        nomeCaso: 'Psoríase do Couro Cabeludo',
        distincaoChave: 'Psoríase não destrói os óstios foliculares e tem vasos em glomérulos regulares; a foliculite decalvante causa destruição atrófica e tufos.'
      }
    ],
    referenciasRelacionadas: ['cond-liquen-plano-pilar', 'cond-psoriase'],
    resumoOriginal: 'A foliculite decalvante é uma alopecia cicatricial inflamatória, caracterizada por pústulas, tufos foliculares, crostas e destruição da unidade folicular. A tricoscopia identifica sinais precoces de atividade para evitar o avanço cicatricial.',
    fontePagina: 25,
    outrasPaginas: [21]
  },

  // 11. Líquen plano pilar
  {
    id: 'cond-liquen-plano-pilar',
    numeroOrdem: 11,
    nome: 'Líquen Plano Pilar (LPP)',
    categoria: 'Cicatricial',
    imagem: {
      id: 'img-lpp-p23',
      casoId: 'cond-liquen-plano-pilar',
      paginaPdf: 23,
      aumento: '50x',
      legenda: 'Escamas perifoliculares aderentes, eritema perifolicular, redução de óstios foliculares e áreas esbranquiçadas cicatriciais.',
      contexto: 'Doença inflamatória cicatricial com colaretes córneos nas bordas ativas e fibrose atrófica central.',
      achadosVisiveis: ['ach-escamas-perifoliculares', 'ach-areas-brancas-atroficas', 'ach-vasos-lineares']
    },
    oQueObservar: [
      'Escamas perifoliculares brancas e aderentes em colarete',
      'Eritema perifolicular (halos eritematosos ao redor dos óstios)',
      'Tampões foliculares queratinosos',
      'Perda progressiva de óstios foliculares',
      'Áreas brancas cicatriciais, brilhantes e atróficas',
      'Vasos lineares perifoliculares',
      'Hastes preservadas nas áreas não afetadas (sem miniaturização)'
    ],
    caracteristicas: [
      'Variante de líquen plano que acomete o folículo piloso',
      'Alopecia cicatricial primária linfocítica',
      'Inflamação crônica com destruição irreversível da unidade folicular',
      'Mais comum em mulheres, especialmente na pós-menopausa',
      'Progressão tipicamente centrífuga com centro cicatricial e borda ativa'
    ],
    achadosTricoscopicos: [
      'Escamas tubulares / colaretes perifoliculares aderentes',
      'Eritema em halo perifolicular (sinal de atividade)',
      'Áreas brancas atróficas sem óstios (sinal de cronicidade)',
      'Vasos lineares periféricos'
    ],
    achadosIds: ['ach-escamas-perifoliculares', 'ach-areas-brancas-atroficas', 'ach-vasos-lineares'],
    significadoClinico: 'Alopecia cicatricial primária destrutiva. A presença de escamas e eritema indica doença em atividade; áreas brancas indicam dano folicular irreversível já estabelecido.',
    comoReconhecer: [
      'Detectar colaretes de escamas brancas envolvendo a base dos fios na periferia da lesão',
      'Visualizar centro cicatricial liso, esbranquiçado e sem poros foliculares',
      'Correlacionar com sintomas clínicos relatados como dor, ardor ou queimação'
    ],
    padrao: 'Cicatricial linfocítico / Centrífugo',
    localizacao: 'Vértex e regiões parietais com expansão centrífuga.',
    diferenciaisComparações: [
      {
        casoId: 'cond-androgenetica',
        nomeCaso: 'Alopecia Androgenética',
        distincaoChave: 'LPP apresenta perda definitiva de óstios, fibrose e colaretes; AAG mantém óstios abertos e cursa com miniaturização progressiva sem cicatriz.'
      },
      {
        casoId: 'cond-frontal-fibrosante',
        nomeCaso: 'Alopecia Fibrosante Frontal',
        distincaoChave: 'AFF tem padrão marginal frontotemporal e perda de sobrancelhas; o LPP clássico acomete o vértex e parietais em placas centrífugas.'
      }
    ],
    referenciasRelacionadas: ['cond-frontal-fibrosante', 'cond-androgenetica'],
    resumoOriginal: 'O líquen plano pilar é uma alopecia cicatricial primária caracterizada por escamas perifoliculares, eritema e perda folicular. A tricoscopia permite identificar sinais de atividade e de cronicidade, sendo essencial para o diagnóstico precoce.',
    fontePagina: 23,
    outrasPaginas: [3, 11, 15, 21]
  },

  // 12. Pediculose
  {
    id: 'cond-pediculose',
    numeroOrdem: 12,
    nome: 'Pediculose (Lêndeas e Piolhos)',
    categoria: 'Parasitária',
    imagem: {
      id: 'img-pediculose-p19',
      casoId: 'cond-pediculose',
      paginaPdf: 19,
      aumento: '50x',
      legenda: 'Lêndeas viáveis ovoides translúcidas fixadas firmemente à haste por bainha quitinosa adesiva, com opérculo apical.',
      contexto: 'Infestação ectoparasitária por Pediculus humanus capitis com lêndeas e parasitas adultos.',
      achadosVisiveis: ['ach-lendeas']
    },
    oQueObservar: [
      'Lêndeas ovoides com cápsula translúcida castanha ou perolada aderidas firmemente à haste capilar',
      'Opérculo convexo fechado na ponta voltada para o couro (lêndea viável)',
      'Lêndeas vazias colabadas com opérculo aberto ou ausente',
      'Parasita adulto eventual com abdômen segmentado e patas preensoras',
      'Pequenas crostas hemáticas puntiformes causadas pela picada e coçadura',
      'Preservação estrutural dos folículos'
    ],
    caracteristicas: [
      'Ectoparasitose contagiosa provocada pelo inseto hematófago Pediculus humanus capitis',
      'Fixação tenaz das lêndeas na haste capilar por cimento quitinoso insolúvel',
      'Prurido intenso no couro cabeludo com lesões de escoriação',
      'Não provoca alopecia cicatricial'
    ],
    achadosTricoscopicos: [
      'Lêndeas viáveis ovóides com opérculo convexo',
      'Bainha de quitina colada unilateralmente ao fio',
      'Lêndeas eclodidas translúcidas abertas',
      'Escoriações e crostas puntiformes'
    ],
    achadosIds: ['ach-lendeas'],
    significadoClinico: 'Diagnóstico de certeza visual incontestável. Diferencia lêndeas verdadeiras de pseudolêndeas (cilindros peripilares de queratina móveis ou acúmulos cosméticos).',
    comoReconhecer: [
      'Estrutura ovoidal encapsulada agarrada de um só lado da haste que não desliza ao toque mecânico, com opérculo convexo intacto'
    ],
    padrao: 'Parasitário aderente à haste com bainha quitinosa fixa',
    localizacao: 'Mais frequente nas regiões retroauriculares, temporais e na nuca.',
    diferenciaisComparações: [
      {
        casoId: 'cond-tracao',
        nomeCaso: 'Alopecia por Tração / Hair Casts',
        distincaoChave: 'Lêndeas são ovais e fixadas com cimento quitinoso rígido que não desliza; os hair casts da tração são cilindros tubulares que correm livremente pelo fio.'
      },
      {
        casoId: 'cond-caspa',
        nomeCaso: 'Caspa',
        distincaoChave: 'Caspa tem escamas secas soltas e irregulares; lêndeas têm formato ovoidal regular e adesão firme.'
      }
    ],
    referenciasRelacionadas: ['cond-tracao', 'cond-caspa'],
    resumoOriginal: 'A pediculose manifesta-se sob tricoscopia por lêndeas ovoides translúcidas fixas à haste capilar por bainha quitinosa e opérculo característico.',
    fontePagina: 19,
    outrasPaginas: [13]
  },

  // 13. Psoríase
  {
    id: 'cond-psoriase',
    numeroOrdem: 13,
    nome: 'Psoríase do Couro Cabeludo',
    categoria: 'Dermatose Descamativa',
    imagem: {
      id: 'img-psoriase-p27',
      casoId: 'cond-psoriase',
      paginaPdf: 27,
      aumento: '50x',
      legenda: 'Escamas espessas e esbranquiçadas, eritema intenso e vasos puntiformes regulares distribuídos de forma difusa.',
      contexto: 'Placa descamativa bem delimitada com padrão vascular em glomérulos regulares.',
      achadosVisiveis: ['ach-escamas-prateadas', 'ach-vasos-puntiformes-glomerulares']
    },
    oQueObservar: [
      'Escamas brancas ou prateadas, espessas, de aspecto micáceo/lamelar',
      'Escamas recobrindo parcialmente os óstios foliculares',
      'Eritema de fundo difuso, homogêneo e bem delimitado',
      'Vasos puntiformes regulares (em glomérulos) com distribuição uniforme',
      'Ausência de sinais de cicatriz e hastes capilares geralmente preservadas'
    ],
    caracteristicas: [
      'Doença inflamatória crônica, imunomediada com proliferação acelerada da epiderme',
      'Formação de escamas espessas prateadas e placas infiltradas',
      'Pode acometer o couro cabeludo isoladamente ou em conjunto com outras áreas',
      'Placas bem delimitadas que costumam ultrapassar a linha de implantação'
    ],
    achadosTricoscopicos: [
      'Vasos puntiformes em glomérulos regulares e uniformes',
      'Escamas espessas e prateadas aderentes',
      'Eritema homogêneo vivo sob a placa',
      'Preservação dos folículos pilosos'
    ],
    achadosIds: ['ach-escamas-prateadas', 'ach-vasos-puntiformes-glomerulares'],
    significadoClinico: 'Dermatose inflamatória com hiperproliferação epidérmica. A identificação do padrão vascular glomerular uniforme e das escamas espessas é altamente sugestiva e afasta dermatite seborreica.',
    comoReconhecer: [
      'Inspecionar sob a escama com luz polarizada: visualizar vasos pontilhados regulares organizados em glomérulos homogêneos',
      'Observar escamas secas, prateadas e espessas com margem nítida'
    ],
    padrao: 'Descamativo laminar / Vasos glomerulares regulares',
    localizacao: 'Placas bem delimitadas no couro cabeludo, frequentemente ultrapassando a margem de implantação.',
    diferenciaisComparações: [
      {
        casoId: 'cond-dermatite-seborreica',
        nomeCaso: 'Dermatite Seborreica',
        distincaoChave: 'Psoríase tem escamas espessas prateadas, eritema bem delimitado e vasos puntiformes regulares em glomérulos; a dermatite seborreica exibe escamas amareladas untuosas e vasos discretos inespecíficos.'
      },
      {
        casoId: 'cond-caspa',
        nomeCaso: 'Caspa',
        distincaoChave: 'Psoríase tem placas infiltradas com eritema e vasos glomerulares; a caspa tem escamas secas finas sem eritema.'
      }
    ],
    referenciasRelacionadas: ['cond-dermatite-seborreica', 'cond-caspa'],
    resumoOriginal: 'A psoríase do couro cabeludo apresenta escamas espessas, eritema e vasos puntiformes regulares distribuídos de forma difusa. A identificação do padrão vascular e das escamas espessas é altamente sugestiva.',
    fontePagina: 27,
    outrasPaginas: [13, 14, 15]
  },

  // 14. Seborreia
  {
    id: 'cond-seborreia',
    numeroOrdem: 14,
    nome: 'Seborreia (Hiperseborreia / Oleosidade)',
    categoria: 'Dermatose Descamativa',
    imagem: {
      id: 'img-seborreia-p11',
      casoId: 'cond-seborreia',
      paginaPdf: 11,
      aumento: '50x',
      legenda: 'Acúmulo de secreção sebácea fluida e translúcida formando meniscos ao redor dos óstios e mechas aderentes, sem eritema pronunciado.',
      contexto: 'Hiperatividade glandular sebácea com lagos lipídicos perifoliculares e óstios preservados.',
      achadosVisiveis: ['ach-lago-sebo']
    },
    oQueObservar: [
      'Filme lipídico reflexivo e brilhante ao redor dos óstios foliculares ("lagos de sebo")',
      'Tampões sebáceos moles preenchendo o infundíbulo folicular',
      'Hastes capilares aglutinadas em mechas por excesso de oleosidade',
      'Ausência de eritema de base inflamatório evidente',
      'Ausência de escamas amareladas espessas aderentes em crosta'
    ],
    caracteristicas: [
      'Hiperfunção das glândulas sebáceas com aumento do fluxo lipídico cutâneo',
      'Fase funcional prévia ou independente do processo inflamatório da dermatite seborreica',
      'Óstios foliculares viáveis e íntegros',
      'Associada a estímulo androgênico, clima quente ou tendência genética'
    ],
    achadosTricoscopicos: [
      'Meniscos lipídicos translúcidos peripilares',
      'Tampões sebáceos moles nos óstios',
      'Superfície cutânea reflexiva e brilhante',
      'Folículos pilosos perfeitamente preservados'
    ],
    achadosIds: ['ach-lago-sebo', 'ach-fios-terminais'],
    significadoClinico: 'Hipersecreção sebácea pura. O controle do sebo equilibra o microbioma do couro cabeludo e previne evolução para dermatite seborreica ou foliculites.',
    comoReconhecer: [
      'Visualizar película de óleo brilhante e translúcida na emergência dos fios, sem vermelhidão de fundo e sem escamas espessas'
    ],
    padrao: 'Hipersecreção lipídica superficial não inflamatória',
    localizacao: 'Áreas ricas em glândulas sebáceas (região frontal, vértex e partilhas capilares).',
    diferenciaisComparações: [
      {
        casoId: 'cond-dermatite-seborreica',
        nomeCaso: 'Dermatite Seborreica',
        distincaoChave: 'A seborreia é o fluxo aumentado de óleo sem inflamação; a dermatite seborreica combina sebo a eritema, escamas amareladas aderentes e prurido.'
      },
      {
        casoId: 'cond-xerose',
        nomeCaso: 'Xerose Cutânea',
        distincaoChave: 'A seborreia apresenta excesso de lipídios brilhantes; a xerose é a ausência de lipídios com ressecamento e rachaduras secas.'
      }
    ],
    referenciasRelacionadas: ['cond-dermatite-seborreica', 'cond-xerose'],
    resumoOriginal: 'A seborreia (hiperseborreia) caracteriza-se por acúmulo de secreção sebácea fluida e brilhante nos óstios foliculares, sem eritema pronunciado e com folículos preservados.',
    fontePagina: 11,
    outrasPaginas: [13, 14]
  },

  // 15. Tinea
  {
    id: 'cond-tinea-capitis',
    numeroOrdem: 15,
    nome: 'Tinea Capitis',
    categoria: 'Infecciosa',
    imagem: {
      id: 'img-tinea-p20',
      casoId: 'cond-tinea-capitis',
      paginaPdf: 20,
      aumento: '50x',
      legenda: 'Comma hairs, corkscrew hairs, black dots e fios distróficos acompanhados de descamação.',
      contexto: 'Infecção fúngica com colapso morfológico das hastes e descamação esbranquiçada/acinzentada.',
      achadosVisiveis: ['ach-comma-hairs', 'ach-corkscrew-hairs', 'ach-pontos-pretos', 'ach-fios-distroficos']
    },
    oQueObservar: [
      'Comma hairs (fios curvados em formato nítido de vírgula)',
      'Corkscrew hairs (fios enrolados em espiral / saca-rolhas)',
      'Black dots (pontos pretos por fratura na emergência do óstio)',
      'Fios distróficos com espessura irregular e deformados',
      'Descamação esbranquiçada ou acinzentada, geralmente perifolicular',
      'Placas de alopecia com inflamação variável'
    ],
    caracteristicas: [
      'Infecção fúngica do couro cabeludo, mais comum em crianças',
      'Causada por dermatófitos (Trichophyton tonsurans, Microsporum canis, Trichophyton violaceum)',
      'Transmissão por contato direto ou fômites',
      'Fragilidade e quebra intensa das hastes por invasão fúngica',
      'Placas de alopecia uni ou multifocais com descamação'
    ],
    achadosTricoscopicos: [
      'Comma hairs (fios em vírgula)',
      'Corkscrew hairs (fios em espiral)',
      'Pontos pretos (black dots)',
      'Fios distróficos e quebrados',
      'Descamação perifolicular branca ou acinzentada'
    ],
    achadosIds: ['ach-comma-hairs', 'ach-corkscrew-hairs', 'ach-pontos-pretos', 'ach-fios-distroficos'],
    significadoClinico: 'Dano parasitário fúngico direto à estrutura da queratina capilar. O reconhecimento desses achados permite diagnóstico precoce e início rápido do tratamento antifúngico adequado.',
    comoReconhecer: [
      'Pesquisar fios curtos com aspecto curvo em vírgula (comma) ou espirais em saca-rolhas',
      'Verificar a presença de descamação esbranquiçada perifolicular associada a pontos pretos'
    ],
    padrao: 'Infeccioso / Fios distróficos e descamativo',
    localizacao: 'Placas uni ou multifocais no couro cabeludo (especialmente em crianças).',
    diferenciaisComparações: [
      {
        casoId: 'cond-areata',
        nomeCaso: 'Alopecia Areata',
        distincaoChave: 'A tinea capitis tem fios em vírgula, fios em espiral e descamação rica; a alopecia areata tem pelos em exclamação e menos descamação.'
      },
      {
        casoId: 'cond-tracao',
        nomeCaso: 'Alopecia por Tração',
        distincaoChave: 'A tinea capitis exibe distrofia por fungos com comma hairs; a tração decorre de tensão física com hair casts móveis.'
      }
    ],
    referenciasRelacionadas: ['cond-areata', 'cond-tracao'],
    resumoOriginal: 'A tinea capitis apresenta um padrão tricoscópico característico, com combinação de fios em vírgula, fios em espiral, black dots, fios distróficos e descamação. O reconhecimento desses achados permite o diagnóstico precoce e o início do tratamento adequado.',
    fontePagina: 20,
    outrasPaginas: [3]
  },

  // 16. Tração
  {
    id: 'cond-tracao',
    numeroOrdem: 16,
    nome: 'Alopecia por Tração',
    categoria: 'Não Cicatricial',
    imagem: {
      id: 'img-tracao-p18',
      casoId: 'cond-tracao',
      paginaPdf: 18,
      aumento: '50x',
      legenda: 'Cilindros peripilares de queratina móveis (hair casts) deslizando na haste, sinal da franja preservado e rarefação marginal.',
      contexto: 'Estresse mecânico contínuo por tração com cilindros de queratina e potencial reversível.',
      achadosVisiveis: ['ach-hair-casts', 'ach-fios-quebrados']
    },
    oQueObservar: [
      'Cilindros peripilares de queratina (hair casts - pequenas bainhas tubulares brancas móveis que deslizam no fio)',
      'Sinal da franja / fringe sign (preservação de cabelos mais finos e curtos na margem mais anterior de implantação)',
      'Redução da densidade folicular nas áreas sob maior tensão mecânica',
      'Fios quebrados em alturas heterogêneas',
      'Eritema perifolicular e pústulas nos estágios inflamatórios iniciais',
      'Óstios foliculares preservados nas fases iniciais'
    ],
    caracteristicas: [
      'Alopecia decorrente de forças de tração mecânica contínua ou repetitiva sobre os folículos (penteados tensos, tranças, apliques)',
      'Totalmente reversível nas etapas precoces se a tração for cessada',
      'Evolui para alopecia cicatricial definitiva se a tensão mecânica persistir por anos',
      'Acomete comumente margens temporais, frontais e parietais'
    ],
    achadosTricoscopicos: [
      'Hair casts móveis (cilindros de queratina na haste)',
      'Sinal da franja na borda de implantação',
      'Fios quebrados por tração mecânica',
      'Óstios foliculares mantidos (fase precoce)'
    ],
    achadosIds: ['ach-hair-casts', 'ach-fios-quebrados'],
    significadoClinico: 'Dano mecânico ao aparelho folicular. A presença de hair casts e óstios abertos sinaliza fase reversível e necessidade premente de orientação comportamental.',
    comoReconhecer: [
      'Identificar cilindros brancos tubulares soltos que deslizam pelo fio ao longo da linha de tensão do penteado e notar fios finos retidos na margem (fringe sign)'
    ],
    padrao: 'Mecânico por estiramento / Marginal com hair casts',
    localizacao: 'Linha de implantação frontotemporal, têmporas e nuca, conforme o vetor do penteado.',
    diferenciaisComparações: [
      {
        casoId: 'cond-pediculose',
        nomeCaso: 'Pediculose',
        distincaoChave: 'Os hair casts da tração deslizam livremente pela haste; as lêndeas da pediculose são fixas por cimento quitinoso e não deslizam.'
      },
      {
        casoId: 'cond-frontal-fibrosante',
        nomeCaso: 'Alopecia Fibrosante Frontal',
        distincaoChave: 'A tração tem sinal da franja e hair casts móveis; a AFF destrói a margem frontal por completo com colaretes aderentes e perda de sobrancelhas.'
      }
    ],
    referenciasRelacionadas: ['cond-pediculose', 'cond-frontal-fibrosante'],
    resumoOriginal: 'A alopecia por tração decorre de estresse mecânico repetido, apresentando hair casts móveis na haste, sinal da franja e óstios preservados na fase inicial.',
    fontePagina: 18,
    outrasPaginas: [5, 10]
  },

  // 17. Xerose
  {
    id: 'cond-xerose',
    numeroOrdem: 17,
    nome: 'Xerose Cutânea (Couro Cabeludo Seco)',
    categoria: 'Dermatose Descamativa',
    imagem: {
      id: 'img-xerose-p12',
      casoId: 'cond-xerose',
      paginaPdf: 12,
      aumento: '50x',
      legenda: 'Fissuração microcutânea em mosaico seco, descamação furfurácea fina opaca e ausência de lipídios nos óstios.',
      contexto: 'Desidratação do estrato córneo e ruptura da barreira lipídica superficial.',
      achadosVisiveis: ['ach-fissuras-mosaico']
    },
    oQueObservar: [
      'Fissuras microcutâneas em padrão poligonal ou "mosaico rachado"',
      'Descamação furfurácea seca, fina, pulverulenta e difusa',
      'Ausência de brilho ou menisco sebáceo nos óstios foliculares',
      'Hastes capilares ásperas e desidratadas',
      'Ausência de eritema inflamatório e ausência de dilatações vasculares',
      'Óstios foliculares íntegros e preservados'
    ],
    caracteristicas: [
      'Condição caracterizada por desidratação transepidérmica e alteração da barreira lipídica protetora do couro cabeludo',
      'Desencadeada por lavagens excessivas com água muito quente, xampus adstringentes, clima frio/seco ou envelhecimento cutâneo',
      'Não acarreta dano estrutural irreversível nem perda de folículos',
      'Cursa com sensação de repuxamento, aspereza e prurido discreto'
    ],
    achadosTricoscopicos: [
      'Microfissuras epidérmicas em rede / aspecto craquelado',
      'Poeira de escamas secas translúcidas',
      'Óstios desprovidos de sebo',
      'Superfície cutânea opaca sem reflexo gorduroso'
    ],
    achadosIds: ['ach-fissuras-mosaico', 'ach-fios-terminais'],
    significadoClinico: 'Disfunção puramente de barreira cutânea e hidratação. O reconhecimento da xerose previne o uso equivocado de xampus antifúngicos ou corticoesteroides que ressecam ainda mais a pele.',
    comoReconhecer: [
      'Pele opaca com linhas finas de fissura em mosaico seco e escamas pulverulentas, sem nenhum menisco de óleo na saída dos óstios e sem eritema'
    ],
    padrao: 'Desidratação / Fissuração microepidérmica em mosaico',
    localizacao: 'Difuso por todo o couro cabeludo.',
    diferenciaisComparações: [
      {
        casoId: 'cond-seborreia',
        nomeCaso: 'Seborreia (Hiperseborreia)',
        distincaoChave: 'A xerose tem falta de lipídios e fissuras secas craqueladas; a seborreia tem excesso de óleo fluido e meniscos brilhantes.'
      },
      {
        casoId: 'cond-caspa',
        nomeCaso: 'Caspa',
        distincaoChave: 'A xerose exibe pele craquelada com descamação pulverulenta microscópica; a caspa tem escamas maiores soltas entre os fios.'
      },
      {
        casoId: 'cond-dermatite-seborreica',
        nomeCaso: 'Dermatite Seborreica',
        distincaoChave: 'A dermatite seborreica tem eritema e escamas amareladas gordurosas; a xerose é seca, sem eritema e sem gordura.'
      }
    ],
    referenciasRelacionadas: ['cond-seborreia', 'cond-caspa', 'cond-dermatite-seborreica'],
    resumoOriginal: 'A xerose cutânea no couro cabeludo manifesta-se por fissuras microcutâneas em mosaico seco, descamação furfurácea fina e ausência de lipídios nos óstios foliculares.',
    fontePagina: 12,
    outrasPaginas: [14]
  }
];
