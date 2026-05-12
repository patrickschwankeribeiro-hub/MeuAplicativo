import React, { useState } from 'react';
import { TrendingUp, TrendingDown, Plus, Sparkles, FileUp } from 'lucide-react';
import { Screen } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import { SmartImportModal } from './SmartImportModal';

interface AddSelectionScreenProps {
  onNavigate: (screen: Screen) => void;
  onSmartImport: (transactions: any[]) => void;
}

export function AddSelectionScreen({ onNavigate, onSmartImport }: AddSelectionScreenProps) {
  const { t } = useLanguage();
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-8 max-w-4xl mx-auto px-4">
      <div className="text-center space-y-2">
        <h1 className="text-4xl font-extrabold tracking-tight">{t('whatToRegister')}</h1>
        <p className="text-on-surface-variant font-medium">{t('selectTypeToContinue')}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full">
        {/* Smart Import Card - HIGHLIGHTED */}
        <button
          onClick={() => setIsImportModalOpen(true)}
          className="group relative flex flex-col items-center justify-center p-8 bg-primary/5 rounded-[2.5rem] shadow-sm border-2 border-primary/20 hover:border-primary hover:bg-primary/10 transition-all active:scale-[0.98] lg:order-2 ring-1 ring-primary/30"
        >
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-primary text-on-primary text-[10px] font-black uppercase tracking-widest rounded-full flex items-center gap-2 shadow-lg z-10">
            <Sparkles size={10} />
             Inteligência Artificial
          </div>
          <div className="w-20 h-20 bg-primary/20 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
            <FileUp size={40} className="text-primary" />
          </div>
          <h2 className="text-2xl font-bold font-headline mb-2 text-primary">{t('smartImport')}</h2>
          <p className="text-xs text-on-surface-variant text-center font-medium opacity-80">
            Importe PDF, Excel ou CSV e deixe nossa IA organizar tudo para você.
          </p>
          <div className="absolute bottom-4 opacity-100 flex items-center gap-2 text-primary/60 text-[10px] font-bold uppercase tracking-widest mt-4">
            Importação Inteligente
          </div>
        </button>

        <button
          onClick={() => onNavigate('add-income')}
          className="group relative flex flex-col items-center justify-center p-8 bg-surface-container-lowest rounded-[2.5rem] shadow-sm border-2 border-transparent hover:border-secondary transition-all active:scale-[0.98] lg:order-1"
        >
          <div className="w-20 h-20 bg-secondary-container/30 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
            <TrendingUp size={40} className="text-secondary" />
          </div>
          <h2 className="text-2xl font-bold font-headline mb-2">{t('registerIncome')}</h2>
          <p className="text-xs text-on-surface-variant text-center">{t('incomeDescription')}</p>
          <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
            <Plus size={24} className="text-secondary" />
          </div>
        </button>

        <button
          onClick={() => onNavigate('add-expense')}
          className="group relative flex flex-col items-center justify-center p-8 bg-surface-container-lowest rounded-[2.5rem] shadow-sm border-2 border-transparent hover:border-error transition-all active:scale-[0.98] lg:order-3"
        >
          <div className="w-20 h-20 bg-error-container/30 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
            <TrendingDown size={40} className="text-error" />
          </div>
          <h2 className="text-2xl font-bold font-headline mb-2">{t('registerExpense')}</h2>
          <p className="text-xs text-on-surface-variant text-center">{t('expenseDescription')}</p>
          <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
            <Plus size={24} className="text-error" />
          </div>
        </button>
      </div>

      <SmartImportModal 
        isOpen={isImportModalOpen} 
        onClose={() => setIsImportModalOpen(false)}
        onConfirm={onSmartImport}
      />
    </div>
  );
}
