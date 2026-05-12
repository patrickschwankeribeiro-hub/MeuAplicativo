import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  FileUp, 
  X, 
  Loader2, 
  CheckCircle2, 
  AlertCircle, 
  FileText, 
  ChevronRight,
  Save,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  Layers
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { parseFile, interpretDataWithAI, ExtractedTransaction } from '../services/importService';

interface SmartImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (transactions: ExtractedTransaction[]) => void;
}

export function SmartImportModal({ isOpen, onClose, onConfirm }: SmartImportModalProps) {
  const { t, language } = useLanguage();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [extractedData, setExtractedData] = useState<ExtractedTransaction[]>([]);
  const [step, setStep] = useState<'upload' | 'review'>('upload');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setError(null);

    try {
      const rawText = await parseFile(file);
      const interpreted = await interpretDataWithAI(rawText);
      setExtractedData(interpreted);
      setStep('review');
    } catch (err: any) {
      console.error(err);
      setError(t('importError'));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirm = () => {
    onConfirm(extractedData);
    onClose();
    // Reset state for next time
    setStep('upload');
    setExtractedData([]);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="bg-surface-container-lowest w-full max-w-2xl rounded-3xl overflow-hidden shadow-2xl border border-outline-variant/10"
      >
        {/* Header */}
        <div className="p-6 border-b border-outline-variant/10 flex items-center justify-between bg-surface-container-low">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              <FileUp size={20} />
            </div>
            <div>
              <h2 className="text-xl font-black font-headline text-on-surface">{t('smartImport')}</h2>
              <p className="text-xs text-on-surface-variant font-medium">{t('smartImportDesc')}</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-surface-container-high rounded-full transition-colors text-on-surface-variant"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 min-h-[300px]">
          {step === 'upload' ? (
            <div className="space-y-6">
              <div 
                onClick={() => fileInputRef.current?.click()}
                className={`
                  border-2 border-dashed rounded-3xl p-12 transition-all cursor-pointer
                  flex flex-col items-center justify-center gap-4 text-center
                  ${isProcessing ? 'border-primary bg-primary/5 cursor-wait' : 'border-outline-variant/30 hover:border-primary hover:bg-primary/5'}
                `}
              >
                <input 
                  type="file" 
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  className="hidden" 
                  accept=".pdf,.xlsx,.xls,.csv"
                  disabled={isProcessing}
                />
                
                {isProcessing ? (
                  <>
                    <Loader2 className="w-12 h-12 text-primary animate-spin" />
                    <div>
                      <p className="text-lg font-black font-headline text-on-surface">{t('extractingData')}</p>
                      <p className="text-sm text-on-surface-variant mt-1">Isso pode levar alguns segundos...</p>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="w-16 h-16 rounded-2xl bg-surface-container-high flex items-center justify-center text-on-surface-variant group-hover:text-primary transition-colors">
                      <FileUp size={32} />
                    </div>
                    <div>
                      <p className="text-lg font-black font-headline text-on-surface">{t('dropFilesHere')}</p>
                      <p className="text-sm text-on-surface-variant mt-1">{t('supportedFormats')}</p>
                    </div>
                  </>
                )}
              </div>

              {error && (
                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-3 text-red-500">
                  <AlertCircle size={20} />
                  <p className="text-sm font-bold">{error}</p>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-black font-headline text-on-surface">{t('reviewExtractedData')}</p>
                <span className="px-3 py-1 bg-primary/10 text-primary text-xs font-bold rounded-full">
                  {extractedData.length} transações encontradas
                </span>
              </div>

              <div className="max-h-[350px] overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                {extractedData.map((tx, idx) => (
                  <div key={idx} className="p-3 bg-surface-container-low rounded-2xl border border-outline-variant/10 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${tx.type === 'income' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                        {tx.type === 'income' ? <ArrowUpRight size={18} /> : <ArrowDownRight size={18} />}
                      </div>
                      <div>
                        <p className="text-sm font-black text-on-surface line-clamp-1">{tx.description}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] uppercase font-bold text-on-surface-variant flex items-center gap-1">
                            <Calendar size={10} /> {new Date(tx.date).toLocaleDateString(language)}
                          </span>
                          <span className="text-[10px] uppercase font-bold text-on-surface-variant flex items-center gap-1">
                            <Layers size={10} /> {tx.categoryOrPlatform || 'Outros'}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-black ${tx.type === 'income' ? 'text-green-500' : 'text-red-500'}`}>
                        {tx.type === 'income' ? '+' : '-'} R$ {tx.amount.toLocaleString(language, { minimumFractionDigits: 2 })}
                      </p>
                      {tx.trips && (
                        <p className="text-[10px] font-bold text-on-surface-variant">{tx.trips} viagens</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-4 flex gap-3">
                <button 
                  onClick={() => setStep('upload')}
                  className="flex-1 py-3 bg-surface-container-high text-on-surface font-black font-headline rounded-2xl hover:bg-surface-container-highest transition-colors"
                >
                  Voltar
                </button>
                <button 
                  onClick={handleConfirm}
                  className="flex-2 py-3 bg-primary text-on-primary font-black font-headline rounded-2xl hover:scale-95 transition-all flex items-center justify-center gap-2"
                >
                  <Save size={18} />
                  {t('saveAll')}
                </button>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
