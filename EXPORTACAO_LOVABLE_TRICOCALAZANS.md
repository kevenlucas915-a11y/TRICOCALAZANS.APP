# TricoCalazans — Documento Completo de Exportação & Especificação Técnica para Lovable

Este documento contém todas as especificações técnicas, arquitetura, design tokens, interfaces de dados, regras de negócio e prompts estruturados necessários para implementar o aplicativo **TricoCalazans** na plataforma **Lovable** (ou qualquer stack React/Vite moderna).

---

## 1. Visão Geral do Produto

- **Nome da Aplicação**: `TricoCalazans`
- **Slogan / Subtítulo**: Manual Digital & Prontuário Eletrônico de Tricoscopia
- **Público-Alvo**: Médicos dermatologistas, tricologistas, terapeutas capilares e clínicas de estética capilar avançada.
- **Proposta de Valor**:
  1. **Fluxo Clínico Guiado em 3 Passos**: 
     - **Passo 1: Paciente** (Cadastro centralizado com prontuário)
     - **Passo 2: Anamnese** (Ficha completa com anamnese dinâmica e emissão de laudo PDF A4)
     - **Passo 3: Tricoscopia** (Bancada digital de marcação e contagem folicular com ferramentas ópticas)
  2. **Bancada de Marcação Manual**: Análise em alta resolução com ferramentas de ampliação (zoom até 5x), rotação, luz polarizada negativa, realce vascular, contagem em tempo real e cálculo de densidade folicular (fios/cm² e UF/cm²).
  3. **Referência Opcional do Atlas ao Final da Página**: Seletor com busca e acervo catalogado de patologias com dermoscopia HD e **Guia de Conferência Visual** (checklist de confirmação de sinais clínicos).
  4. **Prontuário Eletrônico Agregador**: Conecta automaticamente anamneses, consultas, fotos de fototricoscopia, marcações e laudos ao mesmo paciente.
  5. **Agenda Clínica Integrada**: Calendário visual de consultas, motivos de atendimento e painel de acompanhamento do consultório.
  6. **Área do Cliente (Portal do Paciente)**: Acesso restrito para o paciente consultar apenas as evoluções e fotos liberadas pela profissional.

---

## 2. Stack Tecnológica Recomendada para o Lovable

| Camada | Tecnologia |
|---|---|
| **Framework Frontend** | React 19 / React 18 + Vite |
| **Linguagem** | TypeScript |
| **Estilização** | Tailwind CSS v4 ou v3 (com Glassmorphism e tema Dark/Light) |
| **Ícones** | Lucide React (`lucide-react`) |
| **Geração de PDF** | jsPDF (`jspdf`) para laudos A4 sem marca d'água |
| **Backend & Banco de Dados** | Firebase (Firestore, Storage & Auth) + IndexedDB |
| **Roteamento** | State-based navigation tab ou React Router DOM |

---

## 3. Sistema de Design & Design Tokens

### 3.1. Tipografia
- **Interface Principal**: `Plus Jakarta Sans`, sans-serif (pesos 400, 500, 600, 700, 800)
- **Métricas, Códigos e Contagens Foliculares**: `JetBrains Mono`, monospace (pesos 400, 500, 600)

### 3.2. Paleta de Cores

#### Primária — Verde-Petróleo / Teal Cirúrgico (Identidade TricoCalazans)
- `Teal 50`: `#F0FDFA` (Fundos claros, gradientes de destaque)
- `Teal 100`: `#CCFBF1` (Badges e chips leves)
- `Teal 500`: `#14B8A6` (Ícones e brilhos de foco)
- `Teal 600`: `#0D9488` (Botões secundários e estados hover)
- `Teal 700`: `#0F766E` (Botões de ação principal, cabeçalhos, destaque da sidebar)
- `Teal 800`: `#115E59` (Hover do botão principal)
- `Teal 900`: `#134E4A` (Bordas e textos escuros em temas claros)
- `Teal 950`: `#042F2E` (Superfícies profundas no Dark Mode)

#### Acentos Clínicos & Alertas — Rose / Ruby
- `Rose 50`: `#FFF1F2`
- `Rose 600`: `#E11D48`
- `Rose 700`: `#BE123C` (Botões de captura e bancada de marcação)
- `Rose 800`: `#9F1239`

#### Cores de Marcação da Bancada de Tricoscopia (Padrão Internacional)
- **1 Fio (Unidade Folicular Unitária)**: Azul `#2563EB`
- **2 Fios (Unidade Folicular Dupla)**: Ciano `#06B6D4`
- **3 Fios (Unidade Folicular Tripla)**: Verde Esmeralda `#16A34A`
- **Óstio Folicular Vazio (Yellow dot / Sinal de miniaturização)**: Laranja `#F97316`
- **Foco de Inflamação / Eritema Perifolicular**: Fúcsia `#C026D3`
- **Achado Tricoscópico Geral (Pigtail, Exclamação, etc.)**: Vermelho `#DC2626`

### 3.3. Classes Utilitárias de Glassmorphism (CSS)
```css
/* Card com Vidro Fosco de Alta Precisão */
.glass-card {
  border-radius: 1.5rem;
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
}

/* Modo Escuro */
html.dark .glass-card {
  background: rgba(15, 20, 32, 0.55);
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: 0 12px 36px -4px rgba(0, 0, 0, 0.45);
}

/* Modo Claro */
.glass-card {
  background: rgba(255, 255, 255, 0.82);
  border: 1px solid rgba(226, 232, 240, 0.85);
  box-shadow: 0 10px 30px -5px rgba(15, 23, 42, 0.05);
}

/* Sidebar com Gradiente Verde-Petróleo */
.sidebar-teal-gradient {
  background: linear-gradient(180deg, #F0FDFA 0%, #F6FCFB 45%, #E6F7F5 100%);
  border-right: 1px solid rgba(15, 118, 110, 0.2);
}
html.dark .sidebar-teal-gradient {
  background: linear-gradient(180deg, #071918 0%, #051413 50%, #081D1B 100%);
  border-right: 1px solid rgba(20, 184, 166, 0.22);
}
```

---

## 4. Estrutura de Telas e Navegação

### 4.1. Barra Lateral (Sidebar)
Navegação limpa e livre de banners fixos, dividida em seções:
1. **ATENDIMENTO**:
   - `Meu Painel` (Visão geral de atendimentos, métricas e atalhos rápidos)
   - `Agenda` (Calendário de consultas do mês e painel de horários do dia)
   - `Pacientes` (Prontuários com timeline de fotos, consultas e anamneses)
   - `Anamnese` (Construtor de fichas dinâmicas, preenchimento e exportação de PDF)
   - `Tricoscopia` (Bancada digital de marcação e contagem manual)
2. **ANÁLISE & REFERÊNCIA**:
   - `Atlas Clínico` (Acervo dermatoscópico catalogado com casos e fotos HD)
   - `Busca por Achado` (Diagnóstico reverso a partir de sinais como pontos amarelos, pontos pretos, etc.)
   - `Comparador Lado a Lado` (Comparação A/B entre patologias ou antes/depois da mesma cliente)
3. **MINHA CONTA**:
   - `Meu Perfil` (Dados da clínica, logotipo personalizado para os laudos e senha)
   - `Planos & Assinatura` (Tabela de recursos, precificação e upgrade)
   - `Portal do Paciente` (Área do cliente para simulação ou visualização do paciente)
4. **ADMINISTRAÇÃO** (se perfil admin):
   - `Fotos do Atlas` (Gerenciador e upload de fotos dermatoscópicas)

### 4.2. Stepper de Fluxo Clínico Superior (`FluxoClinicoStepper`)
Exibido no topo das telas de atendimento (`pacientes`, `anamnese`, `captura`):
- Indicador do **Paciente Ativo em Atendimento**: `[Nome do Paciente] • [Trocar] • [Finalizar]`
- Três botões sequenciais com indicador de status:
  - `Passo 1: Paciente`
  - `Passo 2: Anamnese`
  - `Passo 3: Tricoscopia`
- Botão rápido de avanço: `Avançar para Anamnese (Passo 2) ➜` ou `Iniciar Tricoscopia (Passo 3) ➜`.

---

## 5. Modelos de Dados (TypeScript Interfaces)

### 5.1. Paciente
```typescript
export interface Paciente {
  id: string;
  userId?: string;
  nome: string;
  telefone?: string;
  email?: string;
  dataNascimento?: string;
  genero?: 'Feminino' | 'Masculino' | 'Outro';
  queixaPrincipal?: string;
  historicoClinico?: string;
  observacoesPrivadas?: string;
  portalAtivo?: boolean;
  codigoAcessoPortal?: string;
  createdAt?: string;
  updatedAt?: string;
}
```

### 5.2. Sessão de Tricoscopia e Marcações
```typescript
export type AnnotationType = 'unitario' | 'duplo' | 'triplo' | 'ostio_vazio' | 'inflamacao' | 'achado';

export interface Annotation {
  id: string;
  type: AnnotationType;
  x: number; // Porcentagem de 0 a 1 em relação à largura da imagem
  y: number; // Porcentagem de 0 a 1 em relação à altura da imagem
  width: number;
  height: number;
  sign_slug?: string;
  intensity?: 'Leve' | 'Moderada' | 'Acentuada';
  notes?: string;
}

export interface Session {
  id: string;
  userId?: string;
  paciente_id?: string;
  client_name: string;
  session_date: string;
  area: string; // Ex: "Vértex", "Linha Frontal", "Occipital"
  image_url: string;
  field_area_cm2?: number; // Para cálculo de densidade folicular
  notes?: string;
  caso_referencia_id?: string;
  liberadoPaciente?: boolean;
  annotations?: Annotation[];
}
```

### 5.3. Ficha de Avaliação Capilar (Anamnese)
```typescript
export interface FichaAvaliacaoCapilarData {
  nomeCliente: string;
  dataNascimento: string;
  idadeCalculada?: string;
  sexo: string;
  estadoCivil: string;
  celular: string;
  email: string;
  profissao: string;
  endereco: string;
  cidade: string;
  estado: string;
  cep: string;
  comoConheceu: string;
  queixaPrincipal: string;
  tempoProblema: string;
  tratamentosAnteriores: string;
  historicoFamiliar: {
    pai: boolean;
    mae: boolean;
    avos: boolean;
    irmaos: boolean;
    nenhum: boolean;
  };
  condicoesSaude: {
    tireoide: boolean;
    diabetes: boolean;
    anemia: boolean;
    estresse: boolean;
    covidRecente: boolean;
    partoRecente: boolean;
    medicamentosContinuos: string;
  };
  habitos: {
    fuma: boolean;
    alcool: boolean;
    alimentacao: string;
    aguaLitrosDia: string;
    qualidadeSono: string;
  };
  cuidadosCapilares: {
    frequenciaLavagem: string;
    procedimentosQuimicos: string;
    usoSecadorPrancha: string;
  };
  avaliacaoCouro: {
    oleosidade: 'Normal' | 'Seco' | 'Oleoso' | 'Misto';
    descamacao: 'Ausente' | 'Leve' | 'Moderada' | 'Severa';
    sensibilidade: boolean;
    prurido: boolean;
    eritema: boolean;
  };
  diagnosticoSugerido: string;
  condutaProposta: string;
  sessoes?: SessaoEvolucaoFicha[];
}

export interface SessaoEvolucaoFicha {
  numero: number;
  data: string;
  procedimentoRealizado: string;
  produtosUtilizados: string;
  evolucaoObservada: string;
  proximoRetorno: string;
}
```

### 5.4. Consulta Registrada no Prontuário
```typescript
export interface ConsultaRegistro {
  id: string;
  userId?: string;
  pacienteId: string;
  pacienteNome: string;
  data: string;
  area: string;
  queixaEvolucao?: string;
  condutaTratamento?: string;
  sessionId?: string;
  imagemUrl?: string;
  totalFios?: number;
  totalUF?: number;
  ostiosVazios?: number;
  focosInflamacao?: number;
  achadosCount?: number;
  liberadoPaciente?: boolean;
}
```

---

## 6. Funcionalidades Críticas & Detalhes de Implementação

### 6.1. Bancada de Fototricoscopia (`MinhaCapturaView`)
1. **Área de Trabalho em Largura Total (`w-full`)**: O exame e o canvas de marcação ocupam o espaço completo sem painéis laterais fixos que diminuam a imagem da paciente.
2. **Ferramentas de Análise Óptica**:
   - `Luz Polarizada Negativa` (`invert(1) hue-rotate(180deg)`) para realce de linhas brancas e áreas de fibrose.
   - `Realce Vascular` (`contrast(135%) saturate(145%)`) para visualização de alças vasculares, vasos em grampo e eritema.
   - `Grade Milimetrada` sobreposta para contagem sistemática por quadrante.
   - `Zoom Digital` (1x a 5x) com pan e rotação (90° em 90°).
3. **Cálculos Foliculares em Tempo Real**:
   - Total de UFs = unitárias + duplas + triplas
   - Total de Fios = unitárias × 1 + duplas × 2 + triplas × 3
   - Média de Fios/UF = Total de Fios / Total de UFs
   - % de Unidades Unitárias = (unitárias / Total de UFs) × 100 (indicador clássico de afinamento/miniaturização se > 20%)
   - Densidades: `Total de Fios / field_area_cm2` e `Total de UFs / field_area_cm2`.
4. **Referência do Atlas ao Final da Página**:
   - **Oculto por Padrão**: Não polui o campo de visão durante o exame.
   - **Ao clicar em "Buscar Referências"**: Abre um container com campo de pesquisa em tempo real, seletor de patologias, foto HD com aumento (50x), critérios diagnósticos e, **junto a ela**, o **Guia de Conferência Visual** (checklist interativo dos sinais dermatoscópicos para confrontar com a imagem da cliente).
5. **Modo Cortina Interativo**: Divisor deslizante móvel para comparar a foto capturada da cliente com a imagem de referência do Atlas lado a lado.

### 6.2. Gerador de Laudo Clínico em PDF A4 (`jspdf`)
- Formato A4 retrato com margens padronizadas de 15mm.
- Cabeçalho institucional com nome da profissional, número de registro profissional, data, logo personalizado e dados do paciente.
- Inclusão da fotografia marcada em alta resolução.
- Tabela de densidade e contagem folicular calculada.
- Descrição da queixa, hipótese diagnóstica, conduta proposta e espaço de assinatura.

### 6.3. Comunicação Direta com Pacientes
- Links diretos no formato `https://wa.me/55${telefoneSemMascara}` para contato ágil com o paciente.
- Compartilhamento manual do link de ativação da Área do Cliente sem dependência de bots ou automações externas.

---

## 7. Prompts Prontos para Executar no Lovable

### Prompt 1: Criação da Estrutura Base e Design System
> "Crie um aplicativo web em React 19 + TypeScript + Tailwind CSS chamado **TricoCalazans** (Manual Digital & Prontuário Eletrônico de Tricoscopia).
> Utilize um sistema de design moderno em Glassmorphism cirúrgico, com suporte a Dark Mode e Light Mode.
> Tipografia: Plus Jakarta Sans para interface e JetBrains Mono para números/métricas.
> Cores: Verde-Petróleo / Teal cirúrgico (#0F766E) como cor primária de destaque, acentos em Rose (#BE123C) para botões de exame e captura, superfícies translúcidas com backdrop-blur(24px) e bordas sutis.
> O aplicativo deve possuir uma Sidebar retrátil com seções: ATENDIMENTO (Meu Painel, Agenda, Pacientes, Anamnese, Tricoscopia), ANÁLISE & REFERÊNCIA (Atlas Clínico, Busca por Achado, Comparador Lado a Lado) e MINHA CONTA (Meu Perfil, Planos, Portal do Paciente)."

### Prompt 2: Fluxo Clínico Guiado em 3 Passos
> "Implemente uma barra de fluxo clínico guiado persistente no topo das telas de atendimento (Pacientes, Anamnese e Tricoscopia):
> 1. Deve exibir o paciente ativo selecionado com indicador verde pulsante, botão 'Trocar' e 'Finalizar'.
> 2. Deve apresentar 3 etapas interligadas com setas e badges: 'Passo 1: Paciente' ➔ 'Passo 2: Anamnese' ➔ 'Passo 3: Tricoscopia'.
> 3. O estado do paciente ativo deve ser mantido globalmente e persistido no localStorage para que ao avançar para a Anamnese os dados sejam preenchidos automaticamente, e ao ir para a Tricoscopia o nome da cliente já esteja vinculado à sessão."

### Prompt 3: Bancada de Tricoscopia com Referência e Guia Opcional ao Final da Página
> "Crie o componente de Bancada de Marcação de Tricoscopia com as seguintes especificações:
> 1. A bancada de marcação e canvas fotográfico da cliente deve ocupar a largura total (w-full), sem divisões laterais no topo.
> 2. Permita carregar arquivo ou conectar câmera via WebRTC, realizar zoom (1x a 5x), rotação, luz polarizada negativa e realce vascular.
> 3. Suporte marcações de 1 fio (azul), 2 fios (ciano), 3 fios (verde), óstio vazio (laranja), inflamação (fúcsia) e achado dermatoscópico (vermelho).
> 4. Painel de contagem em tempo real com cálculo automático de Total de UFs, Total de Fios, Média fios/UF e % de unitárias.
> 5. A Referência do Atlas NÃO deve aparecer por padrão no topo. Adicione um botão 'Buscar Referências' na barra superior e em um card no rodapé.
> 6. Ao clicar em 'Buscar Referências', abra ao final da página uma seção contendo:
>    - Seletor de patologias com campo de busca por nome ou achado.
>    - Foto de referência em alta resolução com aumento e resumo clínico.
>    - JUNTO à referência, o Guia de Conferência Visual com checklist clicável dos sinais a observar para confirmação diagnóstica."

### Prompt 4: Anamnese Capilar com Encaminhamento ao Prontuário e Laudo PDF
> "Implemente o módulo de Anamnese Capilar com um questionário dinâmico em 8 etapas (Dados, Queixa, Histórico Familiar, Condições de Saúde, Hábitos, Cuidados Capilares, Exame do Couro e Conduta).
> Ao finalizar a ficha:
> 1. Permita gerar e baixar um PDF A4 profissional via jsPDF com logotipo personalizável da clínica.
> 2. Adicione o botão 'Encaminhar para o Relatório do Paciente (Fotos & Consultas)', que direciona a profissional imediatamente para a tela de Pacientes no prontuário daquela cliente, dando acesso a todas as fotos, laudos, consultas e comparadores."

---

## 8. Checklist de Verificação da Implementação

- [ ] Nome `TricoCalazans` aplicado no título HTML, sidebar, login e laudos.
- [ ] Cores cirúrgicas Teal (#0F766E) e Rose (#BE123C) aplicadas corretamente com Dark/Light mode.
- [ ] Bancada de marcação com canvas em largura total e cálculos de contagem folicular em tempo real.
- [ ] Referência do Atlas e Guia de Conferência Visual ocultos por padrão e exibidos ao final da página ao clicar em "Buscar Referências".
- [ ] Fluxo clínico guiado (`Passo 1: Paciente` ➔ `Passo 2: Anamnese` ➔ `Passo 3: Tricoscopia`) com paciente ativo vinculado.
- [ ] Botão de encaminhamento da anamnese para o prontuário do paciente funcionando com navegação e seleção automática.
- [x] Geração de PDF A4 via jsPDF limpo e com suporte a upload de logotipo institucional.
- [x] Agenda clínica e prontuários com contato direto dos pacientes.
