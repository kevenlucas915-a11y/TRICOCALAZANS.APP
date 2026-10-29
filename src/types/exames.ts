export type SituacaoMarcador = 
  | 'Abaixo da faixa'
  | 'Próximo do limite'
  | 'Dentro da faixa'
  | 'Acima da faixa'
  | 'Sem referência no laudo';

export type CategoriaExame =
  | 'Hemograma'
  | 'Ferro'
  | 'Vitaminas e minerais'
  | 'Tireoide'
  | 'Hormônios'
  | 'Glicemia'
  | 'Lipídios'
  | 'Fígado'
  | 'Rins'
  | 'Inflamação'
  | 'Outros';

export interface ItemExame {
  id: string;
  marcador: string;
  valor: string; // Ex: "15.4", "Não reagente", "380"
  valorNumerico?: number | null;
  unidade: string; // Ex: "ng/mL", "g/dL", "mcg/dL"
  referenciaMinima?: number | null;
  referenciaMaxima?: number | null;
  referenciaTexto?: string; // Texto original da referência no laudo
  categoria: CategoriaExame;
  incerto?: boolean; // Linha com leitura incerta (destacada em amarelo)
  situacao?: SituacaoMarcador; // Calculado pelo código (NUNCA pela IA)
}

export interface ExameLaboratorial {
  id: string;
  userId: string;
  pacienteId: string;
  data: string; // Data da coleta (AAAA-MM-DD)
  laboratorio: string;
  itens: ItemExame[];
  status: 'rascunho' | 'conferido';
  respostaIA?: string; // Resposta bruta para auditoria
  arquivosUrls?: string[]; // Arquivos salvos no Storage (PDFs ou fotos)
  observacoes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ConsentimentoIaExames {
  autorizado: boolean;
  data: string;
}

export interface CartaEncaminhamentoParams {
  pacienteNome: string;
  pacienteIdade?: string;
  pacienteGenero?: string;
  queixaCapilar?: string;
  dataExame: string;
  laboratorio?: string;
  destinatarioTipo: 'Médico(a)' | 'Nutricionista';
  itensAlterados: ItemExame[];
  observacaoLivre?: string;
  profissionalNome: string;
  profissionalTitulo?: string;
  profissionalRegistro?: string;
  profissionalClinica?: string;
}
