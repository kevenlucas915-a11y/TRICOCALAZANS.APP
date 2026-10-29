export type StatusProtocolo = 'em_andamento' | 'concluido' | 'pausado';

export type CategoriaProtocolo = 'cabine' | 'home_care' | 'integrado' | 'procedimento_especial';

export interface SessaoProtocoloRegistro {
  id: string;
  numeroSessao: number;
  data: string; // YYYY-MM-DD
  descricaoProcedimento?: string;
  observacoes?: string;
  profissionalNome?: string;
  createdAt: string;
}

export interface ProtocoloPaciente {
  id: string;
  pacienteId: string;
  pacienteNome?: string;
  userId?: string;
  profissionalUid?: string;
  titulo: string;
  objetivo: string;
  categoria: CategoriaProtocolo;
  status: StatusProtocolo;
  dataInicio: string; // YYYY-MM-DD
  previsaoTermino?: string;
  frequencia?: string; // ex: 'Semanal', 'Quinzenal', 'Mensal'
  totalSessoesPlanejadas: number;
  sessoesRealizadas: SessaoProtocoloRegistro[];
  etapasProcedimento?: string; // Procedimento detalhado em cabine
  produtosHomeCare?: string; // Produtos, loções e fórmulas home care associados
  observacoes?: string;
  liberadoPaciente?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TemplateProtocolo {
  titulo: string;
  objetivo: string;
  categoria: CategoriaProtocolo;
  frequencia: string;
  totalSessoes: number;
  etapasProcedimento: string;
  produtosHomeCare: string;
  observacoes?: string;
}

export const TEMPLATES_PROTOCOLOS_PADRAO: TemplateProtocolo[] = [
  {
    titulo: 'Protocolo Fotobioestimulação LED + Drug Delivery Folicular',
    objetivo: 'Estimular a microcirculação pericapilar, ativar células-tronco do folículo e aumentar a densidade dos fios.',
    categoria: 'cabine',
    frequencia: 'Semanal (8 a 10 sessões)',
    totalSessoes: 8,
    etapasProcedimento: '1. Assepsia e higienização com shampoo micelar suave.\n2. Fotobiomodulação com LED Vermelho (650nm) + Infravermelho por 15 a 20 minutos.\n3. Microagulhamento leve (0.5mm) ou Drug Delivery estéril com blend de Fatores de Crescimento (bFGF, VEGF, IGF).\n4. Massagem de drenagem e absorção epicraniana.',
    produtosHomeCare: 'Loção com Fatores de Crescimento e Peptídeos Cobre 1x ao dia à noite; Shampoo antioxidante sem sulfatos agressivos.'
  },
  {
    titulo: 'Protocolo de Controle de Eflúvio Telógeno Agudo',
    objetivo: 'Cessar a queda capilar difusa transitória, nutrir a matriz folicular e antecipar o retorno à fase anágena.',
    categoria: 'integrado',
    frequencia: 'Quinzenal (6 sessões)',
    totalSessoes: 6,
    etapasProcedimento: '1. Desobstrução folicular suave com argiloterapia verde e óleos essenciais (alecrim e melaleuca).\n2. Banho térmico com vapor de ozônio por 10 minutos.\n3. Alta Frequência em faiscamento direto para oxigenação do bulbo.\n4. Terapia com LED âmbar + vermelho para estímulo mitocondrial.',
    produtosHomeCare: 'Nutracêuticos ricos em Biotina, Silício Orgânico, Ferro e Zinco; Loção tônica calmante e fortificante diária.'
  },
  {
    titulo: 'Protocolo Desintoxicante & Peeling do Couro Cabeludo',
    objetivo: 'Tratar dermatite seborreica, excesso de oleosidade, descamação e prurido, restaurando o microbioma capilar.',
    categoria: 'cabine',
    frequencia: 'Semanal nas primeiras 4 semanas, depois quinzenal',
    totalSessoes: 4,
    etapasProcedimento: '1. Aplicação de loção queratolítica com Ácido Salicílico 2% e Óleo de Melaleuca no couro cabeludo seco.\n2. Pausa de 15 minutos com toalha morna.\n3. Lavagem com shampoo terapêutico anti-resíduos.\n4. Eletroterapia com eletrodo pente bactericida e fungicida.',
    produtosHomeCare: 'Shampoo com Cetoconazol 2% ou Piroctona Olamina alternado com shampoo de uso diário suave; Loção reguladora de oleosidade.'
  },
  {
    titulo: 'Protocolo Estabilizador de Alopecia Androgenética (AAG)',
    objetivo: 'Combater a miniaturização progressiva dos fios, inibir a 5-alfa-redutase localmente e manter o diâmetro da haste.',
    categoria: 'integrado',
    frequencia: 'Mensal ou quinzenal (10 a 12 sessões)',
    totalSessoes: 10,
    etapasProcedimento: '1. Mapeamento das áreas afetadas (vértex e entradas).\n2. Procedimento de MMP (Microinfusão de Medicamentos na Pele) ou microagulhamento com blend de Minoxidil, Biotina, D-Pantenol e Finasterida tópica / Saw Palmetto.\n3. Aplicação de LED vermelho de alta potência para potencializar permeação.\n4. Registro fotográfico evolutivo a cada 2 sessões.',
    produtosHomeCare: 'Minoxidil tópico 5% associado a inibidor de DHT tópico; Shampoo com cafeína e aminoácidos essenciais.'
  }
];
