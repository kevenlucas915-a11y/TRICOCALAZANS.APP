import { CasoAtlas, AchadoTricoscopico, ComparacaoDireta } from '../types/tricoscopia';
import { CASOS_17_OFICIAIS } from './casos17Data';

/**
 * Catálogo Completo de Achados Tricoscópicos
 * Fonte: "Damiana Calazans — Atlas Visual de Tricoscopia"
 */
export const ACHADOS_TRICOSCOPICOS: AchadoTricoscopico[] = [
  {
    id: 'ach-pontos-amarelos',
    nome: 'Pontos Amarelos (Yellow Dots)',
    estrutura: 'Óstios Foliculares',
    descricao: 'Estruturas arredondadas ou ovaladas de coloração amarelada na abertura do folículo piloso, resultantes do acúmulo de sebo e queratina no infundíbulo.',
    significadoClinico: 'Típicos da alopecia areata (indicam folículos vazios com sebo/queratina). Também podem ser observados na alopecia androgenética (tamanho variável) e na tricotilomania.',
    marcadorAtividade: false,
    condicoesAssociadasIds: ['cond-areata', 'cond-androgenetica'],
    paginasOrigem: [3, 8, 10, 16]
  },
  {
    id: 'ach-pontos-pretos',
    nome: 'Pontos Pretos (Black Dots / Fios em Cadáver)',
    estrutura: 'Óstios Foliculares',
    descricao: 'Representam fios quebrados ao nível do couro cabeludo, visíveis como pontos escuros no óstio folicular. Restos pigmentares do fio no óstio.',
    significadoClinico: 'Marcador de atividade da doença. Indica quebra de fio por fragilidade, inflamação ou infecção.',
    marcadorAtividade: true,
    condicoesAssociadasIds: ['cond-areata', 'cond-tinea-capitis', 'cond-tracao'],
    paginasOrigem: [3, 8, 10, 17, 20]
  },
  {
    id: 'ach-pontos-brancos',
    nome: 'Pontos Brancos (White Dots / Fibrose)',
    estrutura: 'Óstios Foliculares',
    descricao: 'Estruturas esbranquiçadas, áreas claras arredondadas ou ovais, correspondendo a áreas de fibrose, ausência de óstios ou destruição cicatricial do folículo.',
    significadoClinico: 'Representam fibrose, perda folicular definitiva e cicatriz no couro cabeludo. Indicam destruição permanente do folículo.',
    marcadorAtividade: false,
    condicoesAssociadasIds: ['cond-liquen-plano-pilar', 'cond-frontal-fibrosante', 'cond-foliculite-decalvante'],
    paginasOrigem: [3, 21, 23, 24]
  },
  {
    id: 'ach-anisotricose',
    nome: 'Miniaturização e Anisotricose (Heterogeneidade de Diâmetro)',
    estrutura: 'Hastes',
    descricao: 'Presença de fios de diferentes diâmetros na mesma área. Fios finos, de menor calibre e diversidade de diâmetro. Coexistência de fios terminais, intermediários e miniaturizados.',
    significadoClinico: 'Padrão característico da alopecia androgenética (> 20% de variação). Indica processo progressivo de miniaturização. Auxilia na diferenciação com eflúvio telógeno.',
    marcadorAtividade: false,
    condicoesAssociadasIds: ['cond-androgenetica'],
    paginasOrigem: [1, 4, 6, 7, 16]
  },
  {
    id: 'ach-fios-terminais',
    nome: 'Fios Terminais Espessos',
    estrutura: 'Hastes',
    descricao: 'Fios espessos, bem pigmentados, com maior diâmetro e aspecto maduro. Diâmetro uniforme e menor heterogeneidade no mesmo campo.',
    significadoClinico: 'Representa fios terminais saudáveis. Indica ciclo folicular maduro preservado, como no eflúvio telógeno.',
    marcadorAtividade: false,
    condicoesAssociadasIds: ['cond-efluvio-telogeno'],
    paginasOrigem: [1, 4, 6, 7]
  },
  {
    id: 'ach-pelos-exclamacao',
    nome: 'Pelos em Ponto de Exclamação',
    estrutura: 'Hastes',
    descricao: 'Fios curtos com afinamento proximal do fio (base fina e extremidade mais espessa), formato típico de ponto de exclamação. Pigmentação preservada na extremidade distal.',
    significadoClinico: 'Marcador patognomônico de alopecia areata ativa. Mais frequente na periferia de placas em expansão rápida.',
    marcadorAtividade: true,
    condicoesAssociadasIds: ['cond-areata'],
    paginasOrigem: [5, 8, 10, 17]
  },
  {
    id: 'ach-fios-quebrados',
    nome: 'Pelos Quebrados (Broken Hairs)',
    estrutura: 'Hastes',
    descricao: 'Fratura abrupta da haste capilar em comprimentos variados, com extremidades irregulares, esgarçadas ou em vassoura.',
    significadoClinico: 'Dano mecânico externo à haste por tração, calor, atrito ou fragilidade química/infecciosa.',
    marcadorAtividade: true,
    condicoesAssociadasIds: ['cond-tracao', 'cond-tinea-capitis', 'cond-areata'],
    paginasOrigem: [5, 10, 18, 20]
  },
  {
    id: 'ach-coiled-hairs',
    nome: 'Coiled Hairs (Fios em Mola ou Espiral)',
    estrutura: 'Hastes',
    descricao: 'Fios enrolados sobre si mesmos com aspecto em espiral ou mola após quebra proximal por tensão mecânica.',
    significadoClinico: 'Altamente característicos de tração mecânica e tensão nos fios.',
    marcadorAtividade: true,
    condicoesAssociadasIds: ['cond-tracao'],
    paginasOrigem: [10, 18]
  },
  {
    id: 'ach-flame-hairs',
    nome: 'Flame Hairs (Fios em Chama)',
    estrutura: 'Hastes',
    descricao: 'Fios curtos com extremidade proximal esgarçada em forma de chama ou pincel, resultante de quebra sob tensão física extrema.',
    significadoClinico: 'Marcadores de tração mecânica e fragilidade folicular.',
    marcadorAtividade: true,
    condicoesAssociadasIds: ['cond-tracao'],
    paginasOrigem: [10, 18, 26]
  },
  {
    id: 'ach-tulip-hairs',
    nome: 'Tulip Hairs (Fios em Tulipa)',
    estrutura: 'Hastes',
    descricao: 'Fios curtos com extremidade distal em ponta chanfrada mais escura lembrando uma tulipa.',
    significadoClinico: 'Associados a dano mecânico e quebra traumática da haste capilar.',
    marcadorAtividade: true,
    condicoesAssociadasIds: ['cond-tracao', 'cond-areata'],
    paginasOrigem: [10, 18]
  },
  {
    id: 'ach-fios-em-virgula',
    nome: 'Pelos em Vírgula (Comma Hairs)',
    estrutura: 'Hastes',
    descricao: 'Fios curtos, encurvados e homogêneos que se assemelham ao sinal ortográfico de vírgula.',
    significadoClinico: 'Achado clássico de tinea capitis (dermatofitose). Resultam do enfraquecimento fúngico intracuticular.',
    marcadorAtividade: true,
    condicoesAssociadasIds: ['cond-tinea-capitis'],
    paginasOrigem: [11, 20]
  },
  {
    id: 'ach-fios-saca-rolhas',
    nome: 'Pelos em Saca-Rolhas (Corkscrew Hairs)',
    estrutura: 'Hastes',
    descricao: 'Hastes com múltiplas curvaturas helicoidais espiraladas e fratura em vários níveis.',
    significadoClinico: 'Fortemente sugestivo de tinea capitis inflamatória ou ectotrix.',
    marcadorAtividade: true,
    condicoesAssociadasIds: ['cond-tinea-capitis'],
    paginasOrigem: [11, 20]
  },
  {
    id: 'ach-fios-em-z',
    nome: 'Fios em Z (Zigzag Hairs)',
    estrutura: 'Hastes',
    descricao: 'Hastes capilares dobradas em ângulo agudo, assumindo formato da letra Z.',
    significadoClinico: 'Indicam fraturas parciais sucessivas na cutícula do fio em tinea capitis ou alopecia areata.',
    marcadorAtividade: true,
    condicoesAssociadasIds: ['cond-tinea-capitis', 'cond-areata'],
    paginasOrigem: [11, 20]
  },
  {
    id: 'ach-fios-distroficos',
    nome: 'Fios Distróficos',
    estrutura: 'Hastes',
    descricao: 'Fios com espessura irregular, quebrados, deformados, com torções e alteração de pigmentação.',
    significadoClinico: 'Refletem dano fúngico, químico ou inflamatório severo à integridade da haste capilar.',
    marcadorAtividade: true,
    condicoesAssociadasIds: ['cond-tinea-capitis', 'cond-efluvio-anageno'],
    paginasOrigem: [1, 20]
  },
  {
    id: 'ach-fios-vellus',
    nome: 'Fios Vellus / Regrowth (Em Crescimento)',
    estrutura: 'Hastes',
    descricao: 'Fios finos, curtos e hipopigmentados presentes no campo.',
    significadoClinico: 'Indicam fase de crescimento/rebrota (sinal de resposta terapêutica na alopecia areata) ou estágio de miniaturização na alopecia androgenética.',
    marcadorAtividade: false,
    condicoesAssociadasIds: ['cond-areata', 'cond-androgenetica'],
    paginasOrigem: [6, 8, 10, 16, 17]
  },
  {
    id: 'ach-tufos-foliculares',
    nome: 'Tufos Foliculares (Tufted Hairs)',
    estrutura: 'Óstios Foliculares',
    descricao: 'Múltiplos fios (5 a 20) emergindo conjuntamente de um único óstio folicular dilatado e coalescente (tufo folicular).',
    significadoClinico: 'Indicativo de processo inflamatório crônico profundo e fibrose folicular irreversível. Típico de foliculite decalvante.',
    marcadorAtividade: true,
    condicoesAssociadasIds: ['cond-foliculite-decalvante'],
    paginasOrigem: [21, 25, 26, 29]
  },
  {
    id: 'ach-pustulas-crostas',
    nome: 'Pústulas Foliculares e Crostas',
    estrutura: 'Superfície / Escamas',
    descricao: 'Pústulas foliculares e perifoliculares com conteúdo purulento amarelado, acompanhadas de crostas amareladas ou hemáticas e eritema intenso ao redor do óstio.',
    significadoClinico: 'Indicam inflamação ativa neutrofílica aguda. Precedem a destruição folicular rápida e a cicatrização permanente.',
    marcadorAtividade: true,
    condicoesAssociadasIds: ['cond-foliculite-decalvante'],
    paginasOrigem: [13, 21, 25, 26, 29]
  },
  {
    id: 'ach-escamas-perifoliculares',
    nome: 'Escamas Perifoliculares Aderentes (Colaretes)',
    estrutura: 'Superfície / Escamas',
    descricao: 'Escamas brancas, aderentes, que envolvem em halo tubular ou colarete a saída do óstio folicular.',
    significadoClinico: 'São um dos achados mais característicos do líquen plano pilar e da alopecia frontal fibrosante. Indicam inflamação linfocítica ativa no infundíbulo.',
    marcadorAtividade: true,
    condicoesAssociadasIds: ['cond-liquen-plano-pilar', 'cond-frontal-fibrosante'],
    paginasOrigem: [2, 13, 21, 22, 23, 29]
  },
  {
    id: 'ach-escamas-prateadas',
    nome: 'Escamas Espessas e Prateadas (Aspecto Micáceo)',
    estrutura: 'Superfície / Escamas',
    descricao: 'Escamas brancas ou prateadas, espessas, laminares e aderentes ao couro cabeludo e aos fios, recobrindo parcialmente os óstios.',
    significadoClinico: 'Típicas da psoríase do couro cabeludo. Refletem proliferação epidérmica acelerada com hiperqueratose.',
    marcadorAtividade: true,
    condicoesAssociadasIds: ['cond-psoriase'],
    paginasOrigem: [14, 27, 28]
  },
  {
    id: 'ach-escamas-amareladas',
    nome: 'Escamas Amareladas e Oleosas (Untuosas)',
    estrutura: 'Superfície / Escamas',
    descricao: 'Escamas amareladas, oleosas, com aspecto untuoso e de limites irregulares, distribuídas de forma difusa envolvendo fios e couro cabeludo.',
    significadoClinico: 'Comuns na dermatite seborreica. Associadas à hiperatividade de glândulas sebáceas e inflamação superficial.',
    marcadorAtividade: true,
    condicoesAssociadasIds: ['cond-dermatite-seborreica'],
    paginasOrigem: [13, 14, 28]
  },
  {
    id: 'ach-areas-brancas-atroficas',
    nome: 'Áreas Brancas e Placas Atróficas (Perda de Óstios)',
    estrutura: 'Superfície / Escamas',
    descricao: 'Superfície lisa, brilhante, adelgaçada e atrófica, com redução ou ausência completa de óstios foliculares, substituídos por tecido fibroso esbranquiçado.',
    significadoClinico: 'Indicam destruição permanente e irreversível da unidade folicular por processo inflamatório crônico (fibrose cicatricial).',
    marcadorAtividade: false,
    condicoesAssociadasIds: ['cond-frontal-fibrosante', 'cond-liquen-plano-pilar', 'cond-foliculite-decalvante'],
    paginasOrigem: [2, 3, 21, 22, 23, 24, 25, 26, 29]
  },
  {
    id: 'ach-vasos-puntiformes-glomerulares',
    nome: 'Vasos Puntiformes Regulares e Glomerulares',
    estrutura: 'Vasos',
    descricao: 'Pequenos pontos vermelhos bem definidos ou em glomérulos regulares, com distribuição difusa e relativamente uniforme.',
    significadoClinico: 'Achado característico de psoríase (em glomérulos regulares); também observados em menor regularidade na alopecia areata em atividade e dermatite seborreica.',
    marcadorAtividade: true,
    condicoesAssociadasIds: ['cond-psoriase', 'cond-areata', 'cond-dermatite-seborreica'],
    paginasOrigem: [13, 15, 27, 28]
  },
  {
    id: 'ach-vasos-lineares',
    nome: 'Vasos Lineares',
    estrutura: 'Vasos',
    descricao: 'Vasos alongados, retos ou levemente sinuosos no couro cabeludo.',
    significadoClinico: 'Podem ser observados em cicatrizes, líquen plano pilar e alopecia frontal fibrosante. Refletem tração vascular por fibrose dérmica.',
    marcadorAtividade: false,
    condicoesAssociadasIds: ['cond-liquen-plano-pilar', 'cond-frontal-fibrosante'],
    paginasOrigem: [15, 21, 24]
  },
  {
    id: 'ach-lendeas',
    nome: 'Lêndeas Aderentes (Nits)',
    estrutura: 'Hastes',
    descricao: 'Estruturas ovais esbranquiçadas ou acinzentadas firmemente cimentadas à haste do cabelo, que não se movem facilmente ao deslizar.',
    significadoClinico: 'Diagnóstico definitivo de Pediculose (Pediculus humanus capitis). Distingue-se de caspa e hair casts que deslizam livremente.',
    marcadorAtividade: true,
    condicoesAssociadasIds: ['cond-pediculose'],
    paginasOrigem: [25]
  },
  {
    id: 'ach-asa-delta',
    nome: 'Sinal da Asa-Delta / Túnel Acariano',
    estrutura: 'Superfície / Escamas',
    descricao: 'Pequena estrutura triangular ou triangular-escura em forma de "asa delta" representando a parte anterior do ácaro Sarcoptes scabiei no término de um túnel sinuoso.',
    significadoClinico: 'Sinal patognomônico de Escabiose ao dermatoscópio. Permite diagnóstico rápido e não invasivo.',
    marcadorAtividade: true,
    condicoesAssociadasIds: ['cond-escabiose'],
    paginasOrigem: [24]
  },
  {
    id: 'ach-hair-casts',
    nome: 'Hair Casts / Cilindros Perifoliculares Deslizantes',
    estrutura: 'Hastes',
    descricao: 'Cilindros esbranquiçados de queratina tubular móveis que envolvem a haste e deslizam facilmente ao longo do fio.',
    significadoClinico: 'Diferenciam-se das lêndeas de pediculose por não estarem cimentados à haste; associados a tração, caspa ou dermatite.',
    marcadorAtividade: false,
    condicoesAssociadasIds: ['cond-tracao', 'cond-caspa'],
    paginasOrigem: [12, 17]
  },
  {
    id: 'ach-fissuras-mosaico',
    nome: 'Fissuras Cutâneas em Mosaico (Caudal)',
    estrutura: 'Superfície / Escamas',
    descricao: 'Superfície ressecada com padrão reticulado de microfissuras e escamas poligonais secas, sem secreção oleosa nos óstios.',
    significadoClinico: 'Característico da Xerose do couro cabeludo (desidratação cutânea grave). Diferencia-se de seborreia e caspa.',
    marcadorAtividade: false,
    condicoesAssociadasIds: ['cond-xerose'],
    paginasOrigem: [30]
  },
  {
    id: 'ach-lago-sebo',
    nome: 'Lagos de Sebo Interfoliculares',
    estrutura: 'Óstios Foliculares',
    descricao: 'Acúmulo exuberante de secreção lipídica brilhante e untuosa coalescendo entre múltiplos óstios foliculares.',
    significadoClinico: 'Marca registrada da Hiperseborreia. Difere da xerose pela presença maciça de filme lipídico.',
    marcadorAtividade: true,
    condicoesAssociadasIds: ['cond-seborreia'],
    paginasOrigem: [19]
  },
  {
    id: 'ach-escamas-secas-soltas',
    nome: 'Escamas Secas Finas e Não Aderentes',
    estrutura: 'Superfície / Escamas',
    descricao: 'Escamas de pequeno porte, secas, pulverulentas e soltas entre os fios, que se desprendem espontaneamente.',
    significadoClinico: 'Clássicas da Caspa (Pitiríase Simples). Distinguem-se das escamas amareladas aderentes da dermatite seborreica.',
    marcadorAtividade: false,
    condicoesAssociadasIds: ['cond-caspa'],
    paginasOrigem: [17]
  },
  {
    id: 'ach-pohl-pinkus',
    nome: 'Constrições de Pohl-Pinkus',
    estrutura: 'Hastes',
    descricao: 'Estreitamentos focais e transitórios do calibre da haste capilar seguidos de recuperação do diâmetro.',
    significadoClinico: 'Marcador de insulto tóxico transitório à matriz, característico de quimioterapia ou eflúvio anágeno agudo.',
    marcadorAtividade: true,
    condicoesAssociadasIds: ['cond-efluvio-anageno'],
    paginasOrigem: [18]
  },
  {
    id: 'ach-eritema-edema-contato',
    nome: 'Eritema Confluente com Edema Interfolicular',
    estrutura: 'Inflamação & Eritema',
    descricao: 'Edema epidérmico visível com eritema vivo difuso e microvesículas após exposição a agente químico exógeno.',
    significadoClinico: 'Reação inflamatória aguda de hipersensibilidade por contato com químicas ou cosméticos capilares.',
    marcadorAtividade: true,
    condicoesAssociadasIds: ['cond-dermatite-contato'],
    paginasOrigem: [22]
  },
  {
    id: 'ach-inflamacao-perifolicular',
    nome: 'Inflamação e Eritema Perifolicular (Halo Eritematoso / Colarete)',
    estrutura: 'Inflamação & Eritema',
    descricao: 'Halo eritematoso avermelhado ou rosado circundando a emergência do óstio folicular, frequentemente associado a colarete escamoso aderente e edema infundibular.',
    significadoClinico: 'Marcador cardinal de atividade inflamatória perifolicular (Líquen Plano Pilar, Alopecia Frontal Fibrosante, Foliculite Decalvante). Indica agressão ativa ao folículo.',
    marcadorAtividade: true,
    condicoesAssociadasIds: ['cond-liquen-plano-pilar', 'cond-frontal-fibrosante', 'cond-foliculite-decalvante'],
    paginasOrigem: [2, 13, 21, 22, 29]
  },
  {
    id: 'ach-inflamacao-interfolicular',
    nome: 'Inflamação Interfolicular / Eritema Difuso',
    estrutura: 'Inflamação & Eritema',
    descricao: 'Coloração avermelhada difusa ou em manchas na epiderme interfolicular entre os folículos pilosos, resultante de ectasia capilar e vasodilatação dérmica superficial.',
    significadoClinico: 'Comum na dermatite seborreica, psoríase do couro cabeludo, dermatite de contato e fases de exacerbação de alopecias inflamatórias.',
    marcadorAtividade: true,
    condicoesAssociadasIds: ['cond-dermatite-seborreica', 'cond-psoriase', 'cond-dermatite-contato'],
    paginasOrigem: [13, 14, 22, 28]
  },
  {
    id: 'ach-inflamacao-pustulosa-folicular',
    nome: 'Inflamação Aguda com Pústula Folicular / Exsudato',
    estrutura: 'Inflamação & Eritema',
    descricao: 'Pústulas foliculares purulentas ou crostas melicéricas/hemáticas centradas nos óstios com intenso halo eritematoso periférico.',
    significadoClinico: 'Indica processo inflamatório neutrofílico agudo e destrutivo, típico da fase ativa da Foliculite Decalvante ou infecções bacterianas/fúngicas agudas.',
    marcadorAtividade: true,
    condicoesAssociadasIds: ['cond-foliculite-decalvante', 'cond-tinea-capitis'],
    paginasOrigem: [13, 21, 25, 26, 29]
  }
];

/**
 * Acervo Oficial do Atlas Visual de Tricoscopia (17 Condições Clínicas)
 * Damiana Calazans
 */
export const CASOS_ATLAS: CasoAtlas[] = [
  ...CASOS_17_OFICIAIS
];

/**
 * Comparações Clínicas Diretas entre as Condições Oficiais do Atlas
 */
export const COMPARACOES_DIRETAS: ComparacaoDireta[] = [
  {
    id: 'comp-aag-vs-efluvio',
    titulo: 'Alopecia Androgenética x Eflúvio Telógeno',
    casoAId: 'cond-androgenetica',
    nomeCasoA: 'Alopecia Androgenética',
    casoBId: 'cond-efluvio-telogeno',
    nomeCasoB: 'Eflúvio Telógeno',
    imagemA: {
      id: 'img-comp-aag-p07',
      paginaPdf: 16,
      aumento: '50x',
      legenda: 'Padrão com miniaturização acentuada, variação de diâmetro e predomínio de unidades solitárias.',
      contexto: 'AAG',
      achadosVisiveis: ['ach-anisotricose']
    },
    imagemB: {
      id: 'img-comp-efl-p07',
      paginaPdf: 7,
      aumento: '50x',
      legenda: 'Queda difusa com óstios preservados e diâmetro homogêneo das hastes.',
      contexto: 'Eflúvio',
      achadosVisiveis: ['ach-fios-terminais']
    },
    criterios: [
      {
        criterio: 'Miniaturização e Diâmetro',
        condicaoA: 'Grande variação de diâmetros (anisotricose marcante > 20%); fios bem finos ao lado de terminais.',
        condicaoB: 'Diâmetro homogêneo; ausência de miniaturização; predomínio de fios terminais de mesmo calibre.'
      },
      {
        criterio: 'Unidades Foliculares',
        condicaoA: 'Frequência reduzida de fios por unidade; predomínio de unidades solitárias (1 fio).',
        condicaoB: 'Óstios foliculares bem visíveis e preservados com proporção mantida de unidades múltiplas.'
      },
      {
        criterio: 'Distribuição da Rarefação',
        condicaoA: 'Padrão regionalizado em áreas androgenodependentes (região frontal e vértex).',
        condicaoB: 'Queda difusa em todo o couro cabeludo, sem padrão regional delimitado.'
      },
      {
        criterio: 'Leitura Prática',
        condicaoA: 'Miniaturização + anisotropia de diâmetro + redução de unidades = Alopecia Androgenética.',
        condicaoB: 'Óstios preservados + diâmetro homogêneo + ausência de miniaturização = Eflúvio Telógeno.'
      }
    ],
    paginaOrigem: 7
  },
  {
    id: 'comp-caspa-vs-dermatite-seborreica',
    titulo: 'Caspa (Pitiríase Simples) x Dermatite Seborreica',
    casoAId: 'cond-caspa',
    nomeCasoA: 'Caspa (Pitiríase Simples)',
    casoBId: 'cond-dermatite-seborreica',
    nomeCasoB: 'Dermatite Seborreica',
    imagemA: {
      id: 'img-comp-casp-p17',
      paginaPdf: 17,
      aumento: '50x',
      legenda: 'Escamas secas, finas e pulverulentas soltas entre os fios, sem eritema significativo.',
      contexto: 'Caspa',
      achadosVisiveis: ['ach-escamas-secas-soltas']
    },
    imagemB: {
      id: 'img-comp-ds-p17',
      paginaPdf: 28,
      aumento: '50x',
      legenda: 'Escamas amareladas, untuosas e aderentes com eritema perifolicular evidente.',
      contexto: 'Dermatite Seborreica',
      achadosVisiveis: ['ach-escamas-amareladas']
    },
    criterios: [
      {
        criterio: 'Aspecto das Escamas',
        condicaoA: 'Brancas a acinzentadas, secas, finas, farináceas e soltas da epiderme.',
        condicaoB: 'Amareladas, espessas, untuosas, oleosas e firmemente aderentes ao couro.'
      },
      {
        criterio: 'Eritema / Inflamação',
        condicaoA: 'Ausente ou discreto; couro cabeludo sem hiperemia ou edema de base.',
        condicaoB: 'Eritema evidente, erupção inflamatória perifolicular e interfolicular ativa.'
      },
      {
        criterio: 'Sintomas Associados',
        condicaoA: 'Prurido ausente ou leve a moderado; queixa puramente cosmética.',
        condicaoB: 'Prurido frequente, ardor eventual e exsudato lipídico aumentado.'
      }
    ],
    paginaOrigem: 17
  },
  {
    id: 'comp-psoriase-vs-dermatite',
    titulo: 'Psoríase do Couro Cabeludo x Dermatite Seborreica',
    casoAId: 'cond-psoriase',
    nomeCasoA: 'Psoríase do Couro Cabeludo',
    casoBId: 'cond-dermatite-seborreica',
    nomeCasoB: 'Dermatite Seborreica',
    imagemA: {
      id: 'img-comp-pso-p27',
      paginaPdf: 27,
      aumento: '50x',
      legenda: 'Escamas espessas prateadas e vasos puntiformes em glomérulos regulares.',
      contexto: 'Psoríase',
      achadosVisiveis: ['ach-escamas-prateadas', 'ach-vasos-puntiformes-glomerulares']
    },
    imagemB: {
      id: 'img-comp-ds-p28',
      paginaPdf: 28,
      aumento: '50x',
      legenda: 'Escamas amareladas, untuosas e oleosas com vasos discretos e inespecíficos.',
      contexto: 'Dermatite Seborreica',
      achadosVisiveis: ['ach-escamas-amareladas']
    },
    criterios: [
      {
        criterio: 'Tipo de Escama',
        condicaoA: 'Brancas ou prateadas, secas, espessas, de aspecto micáceo/lamelar e bem delimitadas.',
        condicaoB: 'Amareladas, oleosas, com aspecto untuoso, aderentes e de limites irregulares.'
      },
      {
        criterio: 'Intensidade do Eritema',
        condicaoA: 'Eritema difuso, vivo, homogêneo e bem delimitado sob as placas.',
        condicaoB: 'Eritema discreto a moderado, menos intenso e de bordas difusas.'
      },
      {
        criterio: 'Padrão Vascular',
        condicaoA: 'Vasos puntiformes regulares distribuídos em glomérulos uniformes.',
        condicaoB: 'Vasos discretos, lineares finos ou puntiformes inespecíficos e pouco numerosos.'
      },
      {
        criterio: 'Distribuição',
        condicaoA: 'Placas bem delimitadas que costumam ultrapassar a margem de implantação capilar.',
        condicaoB: 'Distribuição difusa nas áreas de maior atividade sebácea.'
      }
    ],
    paginaOrigem: 27
  },
  {
    id: 'comp-seborreia-vs-xerose',
    titulo: 'Hiperseborreia (Oleosidade) x Xerose Cutânea',
    casoAId: 'cond-seborreia',
    nomeCasoA: 'Hiperseborreia (Oleosidade)',
    casoBId: 'cond-xerose',
    nomeCasoB: 'Xerose do Couro Cabeludo',
    imagemA: {
      id: 'img-comp-seb-p19',
      paginaPdf: 19,
      aumento: '50x',
      legenda: 'Filme lipídico reluzente, lagos de sebo interfoliculares e óstios preenchidos.',
      contexto: 'Seborreia',
      achadosVisiveis: ['ach-lago-sebo']
    },
    imagemB: {
      id: 'img-comp-xer-p30',
      paginaPdf: 30,
      aumento: '50x',
      legenda: 'Microfissuras em mosaico, opacidade epidérmica e ausência de sebo.',
      contexto: 'Xerose',
      achadosVisiveis: ['ach-fissuras-mosaico']
    },
    criterios: [
      {
        criterio: 'Superfície Cutânea',
        condicaoA: 'Presença de filme lipídico contínuo reluzente e lagos de sebo.',
        condicaoB: 'Superfície opaca, ressecada, desidratada e com microfissuras em mosaico.'
      },
      {
        criterio: 'Óstios Foliculares',
        condicaoA: 'Óstios preenchidos por conteúdo sebáceo viscoso brilhante.',
        condicaoB: 'Óstios livres de filme oleoso; descamação seca fina associada.'
      },
      {
        criterio: 'Conduta Clínica',
        condicaoA: 'Controle de oleosidade e regulação sebácea tópica.',
        condicaoB: 'Hidratação barreira, reposição lipídica suave e evitar detergência agressiva.'
      }
    ],
    paginaOrigem: 19
  },
  {
    id: 'comp-pontos-amarelos-pretos-brancos',
    titulo: 'Pontos Amarelos / Pretos x Pontos Brancos',
    casoAId: 'cond-areata',
    nomeCasoA: 'Pontos Amarelos e Pretos (Alopecia Areata)',
    casoBId: 'cond-liquen-plano-pilar',
    nomeCasoB: 'Pontos Brancos (Líquen Plano Pilar)',
    imagemA: {
      id: 'img-comp-pts-a',
      paginaPdf: 8,
      aumento: '50x',
      legenda: 'Pontos amarelos (sebo no óstio) e pontos pretos (quebra aguda por ataque autoimune).',
      contexto: 'Pontos Amarelos e Pretos',
      achadosVisiveis: ['ach-pontos-amarelos', 'ach-pontos-pretos']
    },
    imagemB: {
      id: 'img-comp-pts-b',
      paginaPdf: 23,
      aumento: '50x',
      legenda: 'Pontos brancos e áreas esbranquiçadas correspondendo a fibrose dérmica.',
      contexto: 'Pontos Brancos',
      achadosVisiveis: ['ach-pontos-brancos', 'ach-areas-brancas-atroficas']
    },
    criterios: [
      {
        criterio: 'Composição / Origem',
        condicaoA: 'Amarelos: sebo/queratina no infundíbulo. Pretos: restos de fios partidos no óstio.',
        condicaoB: 'Brancos: tecido conjuntivo fibrótico substituindo os folículos destruídos.'
      },
      {
        criterio: 'Aspecto Tricoscópico',
        condicaoA: 'Estruturas arredondadas amareladas ou pontos escuros na abertura folicular preservada.',
        condicaoB: 'Áreas claras, esbranquiçadas, arredondadas ou confluentes sem óstios visíveis.'
      },
      {
        criterio: 'Significado Clínico',
        condicaoA: 'Marcadores de folículos vazios e atividade aguda não cicatricial.',
        condicaoB: 'Representam fibrose definitiva, perda folicular irreversível e cicatriz.'
      }
    ],
    paginaOrigem: 3
  },
  {
    id: 'comp-aff-vs-lpp',
    titulo: 'Alopecia Fibrosante Frontal x Líquen Plano Pilar',
    casoAId: 'cond-frontal-fibrosante',
    nomeCasoA: 'Alopecia Fibrosante Frontal (AFF)',
    casoBId: 'cond-liquen-plano-pilar',
    nomeCasoB: 'Líquen Plano Pilar (LPP)',
    imagemA: {
      id: 'img-comp-aff-p21',
      paginaPdf: 21,
      aumento: '50x',
      legenda: 'Recuo da linha anterior, perda de velus, colaretes perifoliculares e eritema peripilar.',
      contexto: 'AFF',
      achadosVisiveis: ['ach-escamas-perifoliculares', 'ach-areas-brancas-atroficas']
    },
    imagemB: {
      id: 'img-comp-lpp-p23',
      paginaPdf: 23,
      aumento: '50x',
      legenda: 'Colaretes aderentes espessos, eritema violáceo peripilar e perda multifocal de óstios.',
      contexto: 'LPP',
      achadosVisiveis: ['ach-escamas-perifoliculares', 'ach-pontos-brancos']
    },
    criterios: [
      {
        criterio: 'Padrão Topográfico',
        condicaoA: 'Banda simétrica de recuo na linha anterior de implantação frontotemporal.',
        condicaoB: 'Acometimento multifocal ou em placas centro-parietais / vértex.'
      },
      {
        criterio: 'Fios Vellus e Sobrancelhas',
        condicaoA: 'Perda característica dos fios vellus na margem e madarose frequente.',
        condicaoB: 'Sem predição frontal específica; sobrancelhas tipicamente preservadas.'
      },
      {
        criterio: 'Achado Perifolicular',
        condicaoA: 'Colaretes escamosos discretos a moderados na linha de avanço.',
        condicaoB: 'Colaretes queratinosos exuberantes em halo e eritema peripilar vivo.'
      }
    ],
    paginaOrigem: 21
  },
  {
    id: 'comp-pediculose-vs-caspa',
    titulo: 'Pediculose (Lêndeas) x Caspa / Falsas Lêndeas',
    casoAId: 'cond-pediculose',
    nomeCasoA: 'Pediculose (Lêndeas)',
    casoBId: 'cond-caspa',
    nomeCasoB: 'Caspa (Hair Casts / Escamas)',
    imagemA: {
      id: 'img-comp-ped-p25',
      paginaPdf: 25,
      aumento: '50x',
      legenda: 'Lêndea ovalada com opérculo bem delimitado firmemente aderida à haste capilar.',
      contexto: 'Pediculose',
      achadosVisiveis: ['ach-lendeas']
    },
    imagemB: {
      id: 'img-comp-cas-p17',
      paginaPdf: 17,
      aumento: '50x',
      legenda: 'Escama seca irregular que se move livremente pela haste ao toque suave.',
      contexto: 'Caspa',
      achadosVisiveis: ['ach-escamas-secas-soltas', 'ach-hair-casts']
    },
    criterios: [
      {
        criterio: 'Aderência à Haste',
        condicaoA: 'Firmemente colada por secreção quitinosa adesiva; não se desloca ao deslizar o dedo.',
        condicaoB: 'Livremente móvel ao longo do fio; destaca-se com facilidade ao toque.'
      },
      {
        criterio: 'Morfologia Tricoscópica',
        condicaoA: 'Formato ovoidal simétrico translúcido ou escuro, frequentemente com opérculo visível.',
        condicaoB: 'Estrutura amorfa, irregular, sem forma biológica definida ou cilindro móvel tubular.'
      },
      {
        criterio: 'Diagnóstico e Conduta',
        condicaoA: 'Infestação parasitária transmissível; conduta com pediculicidas e remoção mecânica.',
        condicaoB: 'Desordem descamativa benigna não contagiosa; conduta com xampus queratolíticos.'
      }
    ],
    paginaOrigem: 25
  },
  {
    id: 'comp-tracao-vs-areata',
    titulo: 'Alopecia por Tração x Alopecia Areata',
    casoAId: 'cond-tracao',
    nomeCasoA: 'Alopecia por Tração',
    casoBId: 'cond-areata',
    nomeCasoB: 'Alopecia Areata',
    imagemA: {
      id: 'img-comp-trac-p12',
      paginaPdf: 12,
      aumento: '50x',
      legenda: 'Fios quebrados em alturas desiguais, cilindros perifoliculares e tração mecânica.',
      contexto: 'Tração',
      achadosVisiveis: ['ach-fios-quebrados', 'ach-hair-casts']
    },
    imagemB: {
      id: 'img-comp-are-p08',
      paginaPdf: 8,
      aumento: '50x',
      legenda: 'Pontos amarelos, pontos pretos e pelos em ponto de exclamação na margem ativa.',
      contexto: 'Areata',
      achadosVisiveis: ['ach-pelos-exclamacao', 'ach-pontos-amarelos', 'ach-pontos-pretos']
    },
    criterios: [
      {
        criterio: 'Etiopatogenia',
        condicaoA: 'Insulto físico e mecânico contínuo por penteados presos, tranças ou extensões.',
        condicaoB: 'Ataque autoimune mediado por linfócitos T ao bulbo em anágeno.'
      },
      {
        criterio: 'Hastes Características',
        condicaoA: 'Fios partidos em alturas diversas, fios em chama (flame) e hair casts móveis.',
        condicaoB: 'Pelos em ponto de exclamação (afinados proximalmente) e pontos pretos numerosos.'
      },
      {
        criterio: 'Padrão Distribucional',
        condicaoA: 'Marginal ou nas áreas de tração (têmporas, linha anterior e lateral).',
        condicaoB: 'Placas circulares ou ovais bem delimitadas com pele lisa sem cicatriz.'
      }
    ],
    paginaOrigem: 12
  }
];
