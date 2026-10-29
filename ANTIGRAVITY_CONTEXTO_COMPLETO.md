# PROJETO: ASSISTENTE VISUAL DE TRICOSCOPIA (TRICOCALAZANS DIGITAL)
## DOCUMENTO DE CONTEXTO COMPLETO PARA O AGENTE ANTIGRAVITY

> **Instruções de Uso no Antigravity**:
> Copie e cole este documento completo no seu ambiente ou prompt inicial do Antigravity. Ele consolida todo o histórico de desenvolvimento, todas as regras de negócio, arquitetura completa de dados (Firestore / TypeScript), APIs de backend (Express / Stripe / Gemini), fluxo de frontend e diretrizes de execução.

---

## 1. VISÃO GERAL & METADADOS DO SISTEMA

- **Nome da Aplicação**: Assistente Visual de Tricoscopia (TricoCalazans)
- **Descrição**: Manual digital de apoio diagnóstico à tricoscopia clínica, atlas visual de alta definição baseado na obra da Profa. Damiana Calazans, bancada digital de fototricoscopia, prontuário com evolução, agendamentos, transcrição de exames laboratoriais por IA e Portal do Paciente.
- **Stack Tecnológica**:
  - **Frontend**: React 19, TypeScript, Tailwind CSS v4, Lucide React, Motion, jsPDF.
  - **Backend**: Node.js, Express, tsx (`server.ts` servindo API e Vite middlewares integrados em modo SPA).
  - **Banco de Dados & Autenticação**: Firebase Firestore (regras RBAC granulares) + Firebase Authentication + Firebase Cloud Storage (com fallback de compressão Base64 / IndexedDB).
  - **Pagamentos & Assinaturas**: Stripe Node SDK oficial (Checkout Sessions hospedadas, Webhooks criptográficos, Billing Portal, suporte a PIX e Cartão em até 12x, além de modo Simulador inteligente).
  - **Inteligência Artificial**: Google GenAI SDK (`@google/genai` v2.4.0) utilizando o modelo `gemini-3.8-flash` no servidor para extração e transcrição estruturada de exames laboratoriais em formato JSON.
  - **Porta Padrão**: 3000 (`http://localhost:3000`).

---

## 2. HISTÓRICO CRONOLÓGICO DE CONVERSAS E EVOLUÇÃO DO PROJETO

Abaixo está o histórico completo de todas as solicitações do usuário e os problemas resolvidos:

### Turno 1 & 2: Correção do Acesso ao Dashboard e Inicialização do Dev Server
- **Problema**: O usuário não conseguia acessar o Dashboard devido a erros de execução e falhas no início do dev server.
- **Causa**: Conflito de portas e scripts de build/dev no ambiente Express + Vite, além de erros de tipagem e variáveis de ambiente indefinidas.
- **Solução**:
  - Reconfiguração do `server.ts` com montagem correta de `vite.middlewares` no Express.
  - Verificação de porta 3000 e inicialização limpa via script `"dev": "tsx server.ts"`.
  - Garantia de resposta HTTP 200 no endpoint raiz e suporte a SPA fallback.

### Turnos 3, 4, 5, 6 & 7: Estabilização de Dependências, Stripe e Desbloqueio Visual
- **Problema**: Dev server falhando repetidamente e lentidão por conta de APIs externas da Stripe que travavam o carregamento quando não havia chave de produção configurada. O usuário pediu com urgência: *"Não se preocupe com as API da stripper no momento, só corrija o que está acontecendo pra eu visualizar o aplicativo"*.
- **Solução**:
  - Implementação de um **Modo Simulador Inteligente de Alta Fidelidade** para a Stripe quando a chave `STRIPE_SECRET_KEY` estiver ausente ou for de exemplo.
  - Adição de rotas diagnósticas `/api/stripe/config`, `/api/stripe/test-connection` e `/api/stripe/save-config` para permitir inserir chaves reais `sk_test_...` ou `sk_live_...` diretamente pela interface ou arquivo `.env` sem derrubar a aplicação.
  - Tratamento de erro 400/401 no Stripe SDK para evitar que exceções não tratadas travassem o processo Node.js.

### Turno 8: Correção de Erros de Regras e Permissões do Firebase
- **Problema**: Mensagens de erro de permissão negada no Firebase Firestore (*"Permission denied"* e *"Missing or insufficient permissions"*).
- **Causa**:
  - A regra `isAdmin()` exigia `email_verified == true`, mas em logins do Google ou email/senha de desenvolvimento, a flag podia vir `false`, bloqueando o administrador `kevenlucas915@gmail.com`.
  - As regras para `capturas_paciente`, `pacientes`, `consultas_paciente` e `produtos_paciente` tinham validação estrita de chaves (`data.keys().hasAll()` e `hasOnly()`) que rejeitavam documentos com propriedades opcionais novas ou com `null`.
- **Solução**:
  - Ajuste na regra `isAdmin()` no `firestore.rules` para validar com segurança o email do usuário sem falhas de verificação.
  - Atualização dos esquemas em `isValidCapturaPaciente` e `isValidConsultaRegistro` aceitando tanto `pacienteId` quanto `paciente_id`, além de propriedades como `area`, `imagemUrl`, `imagemDataUrl` e `liberadoPaciente`.
  - Implementação de fallback no frontend: se o Firestore falhar por regras ou rede, os dados são imediatamente persistidos em cache local (IndexedDB e LocalStorage), garantindo que o clínico nunca perca seu trabalho.

### Turno 9: Otimização da Bancada de Fototricoscopia e Correção do Botão "Salvar Sessão"
- **Problema**: Na bancada digital (`MinhaCapturaView.tsx`), o botão **"Salvar Sessão"** não concluía a operação ou travava silenciosamente.
- **Causas Identificadas**:
  1. A imagem capturada pela câmera ou upload em alta resolução em Base64 excedia o limite de tamanho do documento no Firestore (1 MB).
  2. Na função de otimização de imagem (`otimizarImagemParaArmazenamento` em `src/utils/imageStore.ts`), a atribuição `img.crossOrigin = 'anonymous'` em strings `data:image/...` causava bloqueio ou falha de carregamento no objeto `Image` do browser.
  3. No serviço `saveSession` (`src/services/annotations.ts`), caso o usuário estivesse em modo visitante ou houvesse desconexão momentânea do Auth, o método lançava erro crítico e abortava antes de salvar localmente.
- **Solução Implementada**:
  - Correção na função `otimizarImagemParaArmazenamento` para não aplicar `crossOrigin` em URLs `data:`, garantindo compressão rápida via Canvas para no máximo 1280px e qualidade JPEG 0.78 (tamanho final < 250 KB).
  - Reformulação da função `saveSession` com arquitetura de salvamento em 4 camadas:
    1. Memória RAM (cache instantâneo).
    2. IndexedDB (armazenamento persistente assíncrono para fotos e marcações pesadas).
    3. LocalStorage (histórico de sessões para listagem rápida).
    4. Sincronização em nuvem com o Firestore (com tratamento de exceções graceful: se a nuvem falhar, a sessão fica marcada com `sincronizado: false` e exibe aviso amigável sem perda de dados).
  - Feedback visual no botão com spinner *"Salvando..."*, indicador de sucesso *"Sessão Salva!"* e atalho de teclado `Ctrl+S` / `Cmd+S`.

### Turno 10: Integração com o Agente Antigravity
- **Solicitação**: O usuário instalou o Antigravity, mas o ambiente não estava associando automaticamente o projeto. Ele solicitou um arquivo completo e unificado contendo toda a estrutura de dados, histórico de conversas e APIs para copiar e colar no Antigravity.

---

## 3. ESTRUTURA COMPLETA DE DADOS (SCHEMAS & TYPESCRIPT)

### 3.1. Coleções do Firebase Firestore e Esquemas

#### Coleção: `usuarios_profissionais` (ID do doc = `uid` do Firebase Auth)
Representa o perfil do especialista (Tricologista, Terapeuta Capilar, Dermatologista):
```typescript
export interface UsuarioProfissional {
  uid: string;
  papel?: 'profissional' | 'paciente'; // Padrão: 'profissional'
  nome: string;
  email: string;
  telefone?: string;
  endereco?: string;
  nomeDoEspaco?: string; // Nome da clínica/espaço
  titulo?: string; // ex.: 'Tricologista', 'Dermatologista'
  registro?: string; // ex.: 'CRBM 12345', 'CRM 67890'
  clinica?: string;
  fotoUrl?: string;
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
  senhaAlteradaEm?: string;

  // Gestão de Planos & Assinatura
  planoId?: 'mensal' | 'anual' | 'gratuito' | 'pro' | 'master';
  planoStatus?: 'ativo' | 'trial' | 'cancelado' | 'expirado';
  planoCiclo?: 'mensal' | 'anual';
  planoValidade?: string; // ISO string
  planoIniciadoEm?: string;
  planoMetodo?: 'pix' | 'cartao' | 'boleto';
}
```

#### Coleção: `pacientes` (ID do doc = ID gerado ou UUID)
Cadastro clínico de pacientes com histórico e consentimentos:
```typescript
export interface Paciente {
  id: string;
  userId?: string; // UID do profissional responsável
  profissionalUid?: string; // UID do profissional para regras RBAC
  pacienteUid?: string; // UID do usuário Auth do paciente (vinculado após convite)
  portalAtivo?: boolean; // Se o paciente já tem acesso liberado ao portal
  portalConviteToken?: string; // Token único do convite
  portalConviteExpiraEm?: string; // ISO string (expiração em 7 dias)
  portalAtivadoEm?: string;
  nome: string;
  telefone?: string;
  email?: string;
  dataNascimento?: string;
  genero?: string;
  queixaPrincipal?: string;
  historicoClinico?: string;
  consentimentoIaExames?: {
    autorizado: boolean;
    data: string;
  };
  createdAt: string;
  updatedAt: string;
}
```

#### Coleção: `capturas_paciente` (ID do doc = `sessionId`)
Sessões de fototricoscopia registradas na Bancada Digital:
```typescript
export interface CapturaPaciente {
  id: string;
  userId: string; // UID do profissional
  pacienteId?: string; // ID do paciente no Firestore
  paciente_id?: string;
  pacienteUid?: string; // UID da conta do paciente (para o portal)
  nomePaciente: string;
  dataCaptura: string; // ISO string
  casoReferenciaId: string; // ID da patologia de comparação no Atlas
  area?: string; // Ex: 'Vértice', 'Frontal', 'Occipital', 'Linha Anterior'
  imagemUrl?: string; // URL pública ou do Firebase Storage
  imagemPath?: string; // Caminho no Storage
  imagemDataUrl?: string; // Imagem otimizada em base64 segura (< 250KB)
  anotacoes?: string; // JSON serializado com marcadores, linhas, contagem folicular
  liberadoPaciente?: boolean; // Se o paciente pode visualizar esta foto no portal
  createdAt: string;
  updatedAt: string;
}
```

#### Coleção: `consultas_paciente` (ID do doc = ID gerado)
Evoluções clínicas, condutas terapêuticas e métricas foliculares da consulta:
```typescript
export interface ConsultaRegistro {
  id: string;
  userId?: string;
  profissionalUid?: string;
  pacienteId: string;
  pacienteUid?: string;
  pacienteNome: string;
  data: string; // YYYY-MM-DD
  area: string;
  queixaEvolucao?: string;
  condutaTratamento?: string;
  sessionId?: string; // Vinculação com a captura fotográfica
  imagemUrl?: string;
  totalFios?: number;
  totalUF?: number;
  ostiosVazios?: number;
  focosInflamacao?: number;
  achadosCount?: number;
  achadosResumo?: string;
  achadosLiberados?: string; // JSON de achados com imagens liberadas para o paciente
  liberadoPaciente?: boolean;
  createdAt: string;
}
```

#### Coleção: `produtos_paciente` (ID do doc = ID gerado)
Prescrições e cosmecêuticos / fórmulas indicadas:
```typescript
export interface ProdutoIndicado {
  id: string;
  pacienteId: string;
  profissionalUid: string;
  pacienteUid?: string;
  nome: string; // Ex: "Loção Capilar Minoxidil 5% + Cafeína"
  comoUsar: string; // Ex: "Aplicar 1ml à noite no couro cabeludo seco"
  observacao?: string; // Cuidados e recomendações
  liberadoPaciente: boolean; // Visível no portal do paciente
  createdAt: string;
  updatedAt: string;
}
```

#### Coleção: `convites_pacientes` (ID do doc = `token`)
Convites de ativação do portal gerados pelo profissional:
```typescript
export interface ConvitePaciente {
  id: string; // Token único
  token: string;
  pacienteId: string;
  pacienteNome: string;
  pacienteTelefone?: string;
  pacienteEmail?: string;
  profissionalUid: string;
  profissionalNome: string;
  nomeClinica?: string;
  status: 'pendente' | 'usado' | 'expirado';
  expiraEm: string;
  usadoEm?: string;
  pacienteUid?: string;
  createdAt: string;
}
```

#### Coleção: `pacientes_usuarios` (ID do doc = `uid` do Auth do paciente)
Vínculo do paciente autenticado para restrição estrita via RBAC:
```typescript
export interface PacienteUsuario {
  uid: string;
  pacienteId: string;
  profissionalUid: string;
  papel: 'paciente';
  email: string;
  nome: string;
  telefone?: string;
  createdAt: string;
  updatedAt: string;
}
```

#### Coleção: `exames_laboratoriais` (ID do doc = ID gerado)
Exames sanguíneos e laudos transcritos por IA:
```typescript
export type SituacaoMarcador = 
  | 'Abaixo da faixa'
  | 'Próximo do limite'
  | 'Dentro da faixa'
  | 'Acima da faixa'
  | 'Sem referência no laudo';

export type CategoriaExame =
  | 'Hemograma' | 'Ferro' | 'Vitaminas e minerais' | 'Tireoide'
  | 'Hormônios' | 'Glicemia' | 'Lipídios' | 'Fígado' | 'Rins' | 'Inflamação' | 'Outros';

export interface ItemExame {
  id: string;
  marcador: string;
  valor: string; // Ex: "15.4", "Não reagente", "380"
  valorNumerico?: number | null;
  unidade: string; // Ex: "ng/mL", "g/dL"
  referenciaMinima?: number | null;
  referenciaMaxima?: number | null;
  referenciaTexto?: string;
  categoria: CategoriaExame;
  incerto?: boolean;
  situacao?: SituacaoMarcador; // Calculado pelo algoritmo no frontend/backend
}

export interface ExameLaboratorial {
  id: string;
  userId: string;
  pacienteId: string;
  data: string; // YYYY-MM-DD
  laboratorio: string;
  itens: ItemExame[];
  status: 'rascunho' | 'conferido';
  respostaIA?: string;
  arquivosUrls?: string[];
  observacoes?: string;
  createdAt: string;
  updatedAt: string;
}
```

#### Coleções: `modelos_anamnese` e `respostas_anamnese`
Ficha completa de avaliação capilar em 8 etapas com assinatura digital:
- Modelos customizáveis com tipos de pergunta (`texto_curto`, `paragrafo`, `multipla_escolha`, `sim_nao`, `escala_linear`).
- Armazenamento em JSON de dados de saúde, histórico capilar, hábitos, químicas anteriores e canvas de assinatura do paciente.

#### Coleção: `agendamentos`
Agenda integrada de atendimentos:
```typescript
export interface Agendamento {
  id: string;
  userId: string;
  pacienteId: string;
  pacienteUid?: string;
  pacienteNome: string;
  pacienteTelefone?: string;
  data: string; // YYYY-MM-DD
  horario: string; // HH:mm
  duracaoMinutos?: number;
  motivoId?: string;
  motivoTitulo?: string;
  motivoCor?: string;
  status?: 'agendado' | 'confirmado' | 'concluido' | 'cancelado';
  observacoes?: string;
  lembreteNotificado?: boolean;
  createdAt: string;
  updatedAt: string;
}
```

---

## 4. APIS DE BACKEND (EXPRESS) E INTEGRAÇÕES

O arquivo `server.ts` centraliza todas as rotas de backend na porta 3000 com middlewares de autenticação Firebase Bearer Token:

### 4.1. Rotas Stripe (`/api/stripe/*`)

1. **`POST /api/stripe/webhook`**:
   - Processa payloads brutos com validação criptográfica via `stripe.webhooks.constructEvent(req.body, sig, webhookSecret)`.
   - Evento tratado: `checkout.session.completed`. Atualiza o plano do profissional no Firestore para status `'ativo'`, define ciclo e validade (30 dias para mensal ou 365 dias para anual).

2. **`GET /api/stripe/config`**:
   - Retorna status da conexão Stripe (`configured`, `mode: 'live' | 'test' | 'simulator'`), chave pública (`publishableKey`), URLs de retorno e metadados dos planos.

3. **`POST /api/stripe/test-connection`**:
   - Testa a chave informada via `testStripe.balance.retrieve()`, validando se está ativa em modo Sandbox ou Live.

4. **`POST /api/stripe/save-config`**:
   - Salva dinamicamente `STRIPE_SECRET_KEY`, `VITE_STRIPE_PUBLISHABLE_KEY` e `STRIPE_WEBHOOK_SECRET` em memória e no arquivo `.env`.

5. **`POST /api/stripe/create-checkout-session`**:
   - Cria uma sessão de checkout hospedada oficial com cartão e PIX, ou retorna sessão simulada inteligente se nenhuma chave secreta foi configurada.

6. **`POST /api/stripe/verify-session`**:
   - Verifica o status de pagamento ao retornar da URL de sucesso e persiste o plano no documento do profissional.

7. **`POST /api/stripe/create-portal-session`**:
   - Cria link para o Customer Portal da Stripe para cancelamento, troca de cartão e download de faturas.

### 4.2. Rotas de Exames Laboratoriais e IA (`/api/exames/*`)

1. **`GET /api/exames/uso-ia`**:
   - Retorna a quantidade de leituras de laudo com IA consumidas pelo especialista no mês corrente e o limite do plano (40 leituras/mês no Plano Master).

2. **`POST /api/exames/transcrever-laudo`**:
   - **Autenticação**: Bearer Token do Firebase decodificado via `firebase-admin` ou fallback de verificação de token.
   - **Permissões**: Validação de plano ativo do profissional e contagem mensal no documento `/uso_ia/{uid}/meses/{mes}`.
   - **Modelo de IA**: Utiliza `@google/genai` com o modelo **`gemini-3.8-flash`**.
   - **Entrada**: PDF ou imagem em Base64 + prompt médico estruturado (`INSTRUCAO_SISTEMA_TRANSCRICAO_LAUDO`).
   - **Saída**: JSON estruturado contendo laboratório, data de coleta e lista de marcadores com valores, unidades, referências e alertas de incerteza.

---

## 5. REGRAS DE SEGURANÇA DO FIRESTORE (`firestore.rules`)

- **Default Deny**: Nenhuma coleção é pública por padrão (`match /{document=**} { allow read, write: if false; }`).
- **Validação de Administrador**:
  ```javascript
  function isAdmin() {
    return request.auth != null && request.auth.token.email in ['kevenlucas915@gmail.com'];
  }
  ```
- **Papel de Paciente**:
  ```javascript
  function isPaciente() {
    return request.auth != null && exists(/databases/$(database)/documents/pacientes_usuarios/$(request.auth.uid)) && !isAdmin();
  }
  ```
- **Segurança RBAC**:
  - Profissionais leem e gravam exclusivamente seus próprios pacientes, consultas, exames e agendamentos (`resource.data.userId == request.auth.uid` ou `resource.data.profissionalUid == request.auth.uid`).
  - Pacientes só conseguem ler evoluções e fotos quando `pacienteUid == request.auth.uid` E `liberadoPaciente == true`. Pacientes nunca têm permissão de escrita em prontuários clínicos.

---

## 6. GUIA DE EXECUÇÃO COM O AGENTE ANTIGRAVITY

Se você estiver executando o **Antigravity Agent** via `@google/genai` Interactions API (`antigravity-preview-09-2026`) ou dentro do ambiente Antigravity IDE, utilize a inicialização abaixo:

```typescript
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY
});

// Exemplo de chamada para interação gerenciada com o Antigravity Agent
async function executarAntigravity(tarefa: string) {
  const interaction = await ai.interactions.create({
    agent: "antigravity-preview-09-2026",
    input: `[PROJETO: ASSISTENTE VISUAL DE TRICOSCOPIA]\n${tarefa}`,
    environment: "remote",
    tools: [
      { type: "code_execution" },
      { type: "google_search" },
      { type: "url_context" }
    ]
  }, { timeout: 300000 });

  console.log("Resultado Antigravity:", interaction.output_text);
  return interaction;
}
```

### Comandos de Terminal no Ambiente Linux do Sandbox:
- **Instalar dependências**: `npm install`
- **Iniciar servidor full-stack**: `npm run dev` (roda `tsx server.ts` na porta 3000)
- **Compilar para produção**: `npm run build`
- **Validação de tipos**: `npm run lint` (`tsc --noEmit`)

---

## 7. CHECKLIST DE BOAS PRÁTICAS PARA O AGENTE

1. **Nunca alterar portas**: O dev server deve sempre responder na porta 3000.
2. **Nunca salvar imagens não otimizadas no Firestore**: Sempre passar imagens por `otimizarImagemParaArmazenamento` (< 250 KB) para não violar o limite do Firestore.
3. **Persistência Offline-First**: Ao alterar a bancada ou prontuário, garanta sempre que os dados sejam salvos no IndexedDB e LocalStorage antes ou em paralelo à chamada do Firestore.
4. **Isolamento de Chaves de API**: A chave do Gemini e as chaves privadas da Stripe nunca devem ser expostas no código cliente; todas as chamadas sensíveis passam por rotas Express no `server.ts`.
