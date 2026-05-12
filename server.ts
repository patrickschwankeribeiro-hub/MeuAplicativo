import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const deepgramModule = require('@deepgram/sdk');
const createClient = deepgramModule.createClient || deepgramModule.default?.createClient || deepgramModule.default;
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DEEPGRAM_API_KEY = process.env.DEEPGRAM_API_KEY || process.env.VITE_DEEPGRAM_API_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Use raw body for audio uploads
  app.use('/api/transcribe', express.raw({ type: '*/*', limit: '10mb' }));
  app.use(express.json());

  const genAI = GEMINI_API_KEY ? new GoogleGenerativeAI(GEMINI_API_KEY) : null;

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ 
      status: 'ok', 
      config: { 
        deepgram: !!DEEPGRAM_API_KEY, 
        gemini: !!GEMINI_API_KEY,
        voiceActive: false
      } 
    });
  });

  // Extraction Route
  app.post('/api/extract', async (req, res) => {
    if (!genAI) {
      return res.status(503).json({ error: 'Gemini API not configured on server.' });
    }

    const { rawData } = req.body;
    if (!rawData) {
      return res.status(400).json({ error: 'No raw data provided.' });
    }

    try {
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      const prompt = `
        Analise os seguintes dados extraídos de um arquivo financeiro (PDF, Excel ou CSV) e retorne uma lista JSON de transações.
        
        Regras:
        1. Identifique se cada transação é uma entrada (income) ou saída (expense).
        2. Extraia o valor numérico (amount), a data (date no formato YYYY-MM-DD), e uma descrição curta (description).
        3. Para ganhos (income), tente identificar a plataforma (ex: Uber, 99, iFood) e coloque no campo categoryOrPlatform.
        4. Para gastos (expense), tente identificar a categoria (ex: Combustível, Alimentação, Manutenção) e coloque no campo categoryOrPlatform.
        5. Se encontrar número de viagens/corridas para ganhos, coloque no campo 'trips'.
        6. Retorne APENAS o JSON no formato: [{"type": "income"|"expense", "date": "YYYY-MM-DD", "description": "...", "amount": 100.0, "categoryOrPlatform": "...", "trips": 5}]
        
        Dados:
        ${rawData.substring(0, 15000)}
      `;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      const jsonMatch = text.match(/\[.*\]/s);
      if (jsonMatch) {
        return res.json(JSON.parse(jsonMatch[0]));
      }
      throw new Error('Could not extract JSON from AI response');
    } catch (err: any) {
      console.error('Extraction error:', err);
      res.status(500).json({ error: 'Failed to process data with AI.' });
    }
  });

  // Transcription and Extraction Routes deactivated
  app.post('/api/transcribe', (req, res) => {
    res.status(503).json({ error: 'Voice transcription is currently disabled.' });
  });

  // Vite integration
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
