import Papa from "papaparse";
import * as XLSX from "xlsx";
import * as pdfjs from "pdfjs-dist";

// Set up worker for PDF.js - we'll try to use the CDN version for the worker to avoid complex vite setup
// @ts-ignore
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

export interface ExtractedTransaction {
  type: 'income' | 'expense';
  date: string;
  description: string;
  amount: number;
  categoryOrPlatform?: string;
  trips?: number;
}

export async function parseFile(file: File): Promise<string> {
  const extension = file.name.split('.').pop()?.toLowerCase();

  return new Promise((resolve, reject) => {
    if (extension === 'csv') {
      Papa.parse(file, {
        complete: (results) => {
          resolve(JSON.stringify(results.data));
        },
        error: (err) => reject(err),
      });
    } else if (extension === 'xlsx' || extension === 'xls') {
      const reader = new FileReader();
      reader.onload = (e) => {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json(worksheet);
        resolve(JSON.stringify(json));
      };
      reader.onerror = (err) => reject(err);
      reader.readAsBinaryString(file);
    } else if (extension === 'pdf') {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const data = e.target?.result as ArrayBuffer;
          const loadingTask = pdfjs.getDocument({ data });
          const pdf = await loadingTask.promise;
          let fullText = '';
          for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const content = await page.getTextContent();
            const pageText = content.items.map((item: any) => item.str).join(' ');
            fullText += pageText + '\n';
          }
          resolve(fullText);
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = (err) => reject(err);
      reader.readAsArrayBuffer(file);
    } else {
      reject(new Error('Formato não suportado'));
    }
  });
}

export async function interpretDataWithAI(rawData: string): Promise<ExtractedTransaction[]> {
  try {
    const response = await fetch('/api/extract', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ rawData }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Erro ao processar dados com IA');
    }

    return await response.json();
  } catch (err: any) {
    console.error('Error in interpretDataWithAI:', err);
    throw err;
  }
}
