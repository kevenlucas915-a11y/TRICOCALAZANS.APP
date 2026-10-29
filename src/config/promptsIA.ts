/**
 * Instrução mandatória para o modelo Gemini de transcrição de laudos laboratoriais.
 * A IA apenas TRANSCREVE os dados técnicos; nunca interpreta, resume, diagnostica ou sugere tratamentos.
 */
export const INSTRUCAO_SISTEMA_TRANSCRICAO_LAUDO = 
  "Transcreva fielmente os resultados do laudo. Para cada exame retorne marcador, valor, unidade, faixa de referência do próprio laudo (mínimo, máximo e texto original) e um campo incerto=true quando não tiver certeza da leitura. Não interprete, não classifique, não comente.";

export const AVISO_PRIVACIDADE_LAUDO = 
  "O laudo contém dados do paciente. Se possível, envie páginas sem nome e documento.";

export const SCHEMA_EXAMES_JSON = {
  type: "object",
  properties: {
    laboratorio: {
      type: "string",
      description: "Nome do laboratório identificado no laudo, se legível."
    },
    dataColeta: {
      type: "string",
      description: "Data da coleta informada no laudo (formato AAAA-MM-DD se possível, ou texto original)."
    },
    itens: {
      type: "array",
      description: "Lista de todos os exames/marcadores laboratoriais presentes no documento.",
      items: {
        type: "object",
        properties: {
          marcador: {
            type: "string",
            description: "Nome exato do exame ou parâmetro (ex: Ferritina, TSH, Vitamina D, Hemoglobina, etc)."
          },
          valor: {
            type: "string",
            description: "Valor do resultado obtido pelo paciente conforme impresso (ex: '28.4', 'Não reagente', '14.2')."
          },
          valorNumerico: {
            type: "number",
            description: "Valor convertido para número decimal quando for mensuração numérica. Null quando qualitativo."
          },
          unidade: {
            type: "string",
            description: "Unidade de medida exatamente como expressa no laudo (ex: 'ng/mL', 'g/dL', 'mcUI/mL', '%')."
          },
          referenciaTexto: {
            type: "string",
            description: "Texto integral da faixa de referência descrita no laudo para o paciente."
          },
          referenciaMinima: {
            type: "number",
            description: "Limite inferior numérico da faixa de referência descrita no laudo, se identificável."
          },
          referenciaMaxima: {
            type: "number",
            description: "Limite superior numérico da faixa de referência descrita no laudo, se identificável."
          },
          categoriaSugerida: {
            type: "string",
            description: "Categoria básica do exame: Hemograma, Ferro, Vitaminas e minerais, Tireoide, Hormônios, Glicemia, Lipídios, Fígado, Rins, Inflamação ou Outros."
          },
          incerto: {
            type: "boolean",
            description: "Deve ser true quando houver borrão, corte, ilegibilidade ou incerteza na leitura; false caso contrário."
          }
        },
        required: ["marcador", "valor", "unidade", "incerto"]
      }
    }
  },
  required: ["itens"]
};
