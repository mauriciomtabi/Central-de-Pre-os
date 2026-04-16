import { GoogleGenAI } from "@google/genai";
import { Quote, Material, Supplier } from "../types";

export const generateMarketAnalysis = async (
  quotes: Quote[],
  material: Material | undefined,
  suppliers: Supplier[]
): Promise<string> => {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.VITE_API_KEY || '';
  if (!apiKey) {
    return "Chave de API não encontrada. Por favor configure a chave da API Gemini.";
  }

  const ai = new GoogleGenAI({ apiKey });
  
  // Filter context data to save tokens and provide relevant info
  const relevantQuotes = material 
    ? quotes.filter(q => q.materialId === material.id)
    : quotes;

  // Enhance data for the prompt
  const dataSummary = relevantQuotes.map(q => {
    const supplierName = suppliers.find(s => s.id === q.supplierId)?.name || 'Desconhecido';
    return `Data: ${q.date}, Fornecedor: ${supplierName}, Preço/Unid.Base: R$${q.normalizedPricePerBaseUnit.toFixed(2)}, Qtd: ${q.quantity}, Status: ${q.status}`;
  }).join('\n');

  const materialName = material ? material.name : "Todos os Materiais";

  const prompt = `
    Atue como um Analista Sênior de Compras de Aço.
    
    Vou fornecer um conjunto de dados brutos de cotações recentes para: ${materialName}.
    
    Dados:
    ${dataSummary}
    
    Por favor, forneça uma análise estratégica em formato Markdown cobrindo:
    1. **Análise de Tendência de Preço**: Os preços estão subindo, descendo ou estáveis?
    2. **Comportamento do Fornecedor**: Qual fornecedor oferece a melhor consistência vs melhor preço spot?
    3. **Recomendação**: Com base na tendência, é um bom momento para comprar ou devo esperar?
    4. **Outliers**: Alguma cotação parece suspeita (muito alta/baixa)?
    
    Mantenha o tom profissional, conciso e acionável para um Gerente de Compras. Responda em Português do Brasil.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    return response.text || "Nenhuma análise pôde ser gerada.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Falha ao gerar análise. Tente novamente mais tarde.";
  }
};

export const extractQuoteData = async (
  base64File: string,
  mimeType: string,
  materials: Material[],
  suppliers: any[]
): Promise<any> => {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.VITE_API_KEY || '';
  if (!apiKey) {
    throw new Error("Chave de API Gemini não configurada.");
  }

  const ai = new GoogleGenAI({ apiKey });

  // Prepara lista simplificada de materiais para matching
  const knownMaterials = materials.map(m => ({ id: m.id, name: m.name, category: m.category }));
  const knownSuppliers = suppliers.map(s => ({ id: s.id, name: s.name }));

  const prompt = `
    Você é um assistente de extração de dados de cotações de aço e construção civil.
    Analise a imagem/documento fornecido e extraia os dados do cabeçalho da cotação e os itens.

    Aqui está a lista de MATERIAIS CADASTRADOS no meu sistema:
    ${JSON.stringify(knownMaterials)}

    Aqui está a lista de FORNECEDORES CADASTRADOS no meu sistema:
    ${JSON.stringify(knownSuppliers)}

    Para o cabeçalho:
    1. Tente encontrar o fornecedor correspondente na lista acima (fuzzy match pelo nome ou CNPJ). Retorne o 'supplierId' ou null.
    2. Extraia o prazo de entrega em dias (apenas o número, ex: 15).
    3. Extraia a condição de pagamento (texto curto, ex: "30/60 dias").
    4. Extraia o ICMS em porcentagem (apenas o número, ex: 18).
    5. Extraia o tipo de frete ("CIF" ou "FOB").

    Para cada item encontrado na imagem:
    1. Tente encontrar o material correspondente na lista acima (fuzzy match pelo nome).
    2. Se encontrar, retorne o 'materialId'.
    3. Se NÃO encontrar correspondência clara, deixe 'materialId' como null e 'isNew' como true.
    4. Extraia a quantidade (number).
    5. Extraia o preço unitário (number).
    6. Extraia o IPI (number, se houver).

    Retorne APENAS um objeto JSON puro, sem markdown, no formato:
    {
      "header": {
        "supplierId": "string ou null",
        "deliveryDays": "string (ex: '15') ou null",
        "paymentTerms": "string ou null",
        "icms": "string (ex: '18') ou null",
        "freight": "CIF" | "FOB" | null
      },
      "items": [
        { 
          "materialId": "string ou null",
          "description": "descrição original do item no documento",
          "quantity": number,
          "priceUnit": number,
          "ipi": number (0 se não encontrar)
        }
      ]
    }
  `;

  try {
    // Remove header do base64 se existir para enviar limpo para API
    const cleanBase64 = base64File.replace(/^data:.+;base64,/, '');

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash', // Flash é rápido e bom para extração multimodal
      contents: [
        {
          role: 'user',
          parts: [
            { text: prompt },
            {
              inlineData: {
                mimeType: mimeType,
                data: cleanBase64
              }
            }
          ]
        }
      ],
      config: {
        responseMimeType: "application/json"
      }
    });

    const text = response.text;
    if (!text) return { header: {}, items: [] };
    
    return JSON.parse(text);
  } catch (error) {
    console.error("Gemini Extraction Error:", error);
    throw new Error("Falha ao processar o documento com IA.");
  }
};
