import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY as string });

export interface VoiceParsedData {
  amount?: number;
  category?: string;
  subcategory?: string;
  date?: string;
  notes?: string;
  liters?: number;
  odometer?: number;
  isFullTank?: boolean;
  platform?: string;
  ethanolPrice?: number;
  gasolinePrice?: number;
  pricePerLiter?: number;
  gnvVolume?: number;
  gnvPrice?: number;
}

export async function parseVoiceCommand(text: string, type: 'expense' | 'income' | 'calculator', categories: any[]): Promise<VoiceParsedData> {
  const model = "gemini-3.1-pro-preview";
  
  const categoriesWithSubs = categories.map(c => ({
    id: c.id,
    name: c.name,
    subcategories: c.subcategories || []
  }));

  const systemInstruction = `
    You are a financial assistant for professional drivers. 
    Analyze the user's voice command in any language (but primarily Portuguese) and extract structured data.
    Transaction Type: ${type}
    
    If Type is 'expense':
    - Available categories and their subcategories: ${JSON.stringify(categoriesWithSubs)}
    - Mapping hints: 
      - "fuel" includes: gasolina, álcool, etanol, diesel, gnv, aditivada, premium, posto, abastecimento.
      - "maintenance" includes: alinhamento, balanceamento, filtro, óleo, freio, bateria, motor, suspensão, amortecedor, oficina, mecânico, revisão, pneu, borracharia, troca de peça, correia, embreagem.
      - "food" includes: almoço, janta, lanche, café, restaurante, marmita, lanchonete, alimentação, prato feito, pizza, burguer.
      - "cleaning" includes: lavagem, lava jato, limpeza, polimento, ducha, aspiração.
      - "rent" includes: aluguel do carro, mensalidade.
    - Extract: amount (numeric), category (matching one of the IDs), subcategory (matching one of the strings in the selected category's subcategories list), date (YYYY-MM-DD), notes, liters (for fuel), odometer (number), isFullTank (boolean), pricePerLiter (numeric, price of fuel per liter), gnvVolume (numeric, volume for GNV), gnvPrice (numeric, price per cubic meter for GNV).
    - CRITICAL: If the user mentions something that matches a subcategory (e.g., "troca de óleo"), you MUST identify both the Category ("maintenance") AND the Subcategory ("oilChange").
    - If the user says "gasolina comum", category is "fuel" and subcategory is "gasolineCommon".
    
    If Type is 'income':
    - Extract: amount (numeric), platform (e.g. Uber, 99, Indriver), date (YYYY-MM-DD), notes.

    If Type is 'calculator':
    - Extract: ethanolPrice (numeric), gasolinePrice (numeric).
    
    General rules:
    - Today's date is ${new Date().toISOString().split('T')[0]}.
    - If a field is not found, do not include it or set it to undefined.
    - Be smart about categories: even if the user says a subcategory like "troca de óleo", map it to "maintenance".
    - Return ONLY valid JSON.
  `;
  
  try {
    const response = await ai.models.generateContent({
      model,
      contents: `Transcribe and extract from: "${text}"`,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        temperature: 0,
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            amount: { type: Type.NUMBER },
            category: { type: Type.STRING },
            subcategory: { type: Type.STRING },
            date: { type: Type.STRING },
            notes: { type: Type.STRING },
            liters: { type: Type.NUMBER },
            odometer: { type: Type.NUMBER },
            isFullTank: { type: Type.BOOLEAN },
            platform: { type: Type.STRING },
            ethanolPrice: { type: Type.NUMBER },
            gasolinePrice: { type: Type.NUMBER },
            pricePerLiter: { type: Type.NUMBER },
            gnvVolume: { type: Type.NUMBER },
            gnvPrice: { type: Type.NUMBER }
          }
        }
      }
    });

    if (!response.text) {
      throw new Error("Empty response from AI");
    }

    return JSON.parse(response.text);
  } catch (error) {
    console.error("AI Parsing Error:", error);
    throw error;
  }
}
