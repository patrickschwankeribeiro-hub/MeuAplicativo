import React, { useState } from 'react';
import { HelpCircle, ChevronDown, MessageSquare, ShieldCheck, Mail, Phone, ExternalLink } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useLanguage } from '../contexts/LanguageContext';

export function HelpScreen() {
  const { t } = useLanguage();
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);

  const faqItems = [
    { q: 'faqQ1', a: 'faqA1' },
    { q: 'faqQ2', a: 'faqA2' },
    { q: 'faqQ3', a: 'faqA3' },
    { q: 'faqQ4', a: 'faqA4' },
    { q: 'faqQ5', a: 'faqA5' },
    { q: 'faqQ6', a: 'faqA6' }
  ];

  return (
    <div className="space-y-10 pb-20 max-w-4xl mx-auto">
      <header className="text-center space-y-4">
        <div className="w-20 h-20 bg-primary/10 rounded-3xl flex items-center justify-center mx-auto mb-6 rotate-3">
          <HelpCircle size={40} className="text-primary" />
        </div>
        <h2 className="text-4xl font-extrabold font-headline text-on-surface tracking-tight">{t('helpSupport')}</h2>
        <p className="text-on-surface-variant font-body text-lg max-w-lg mx-auto">
          Precisa de ajuda? Explore nosso FAQ ou entre em contato com nosso time de suporte.
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-10">
        <div className="bg-surface-container-lowest p-6 rounded-2xl border border-outline-variant/10 shadow-sm flex flex-col items-center text-center space-y-4">
          <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center text-blue-600">
            <Mail size={24} />
          </div>
          <div>
            <h4 className="font-black text-sm uppercase tracking-wider">{t('email') || 'Email'}</h4>
            <p className="text-xs text-on-surface-variant mt-1">support@kmprofit.app</p>
          </div>
        </div>
        <div className="bg-surface-container-lowest p-6 rounded-2xl border border-outline-variant/10 shadow-sm flex flex-col items-center text-center space-y-4">
          <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center text-green-600">
            <MessageSquare size={24} />
          </div>
          <div>
            <h4 className="font-black text-sm uppercase tracking-wider">WhatsApp</h4>
            <p className="text-xs text-on-surface-variant mt-1">+55 (11) 99999-9999</p>
          </div>
        </div>
        <div className="bg-surface-container-lowest p-6 rounded-2xl border border-outline-variant/10 shadow-sm flex flex-col items-center text-center space-y-4">
          <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center text-purple-600">
            <ShieldCheck size={24} />
          </div>
          <div>
            <h4 className="font-black text-sm uppercase tracking-wider">Privacidade</h4>
            <p className="text-xs text-on-surface-variant mt-1">kmprofit.app/privacy</p>
          </div>
        </div>
      </div>

      <div className="bg-surface-container-lowest rounded-[2rem] p-8 md:p-12 shadow-sm border border-outline-variant/10">
        <h3 className="text-2xl font-black font-headline mb-8 flex items-center gap-3">
          Perguntas Frequentes
        </h3>
        <div className="space-y-4">
          {faqItems.map((item, index) => (
            <div key={index} className="bg-surface-container-low rounded-2xl overflow-hidden border border-outline-variant/5">
              <button 
                onClick={() => setOpenFaqIndex(openFaqIndex === index ? null : index)} 
                className="w-full p-6 flex items-center justify-between text-left hover:bg-surface-container-high transition-colors"
              >
                <span className="text-base font-bold font-headline pr-6">{t(item.q)}</span>
                <div className={`p-2 rounded-full bg-primary/10 text-primary transition-transform duration-300 ${openFaqIndex === index ? 'rotate-180' : ''}`}>
                  <ChevronDown size={20} />
                </div>
              </button>
              <AnimatePresence>
                {openFaqIndex === index && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }} 
                    animate={{ height: 'auto', opacity: 1 }} 
                    exit={{ height: 0, opacity: 0 }} 
                    className="overflow-hidden"
                  >
                    <div className="p-6 pt-0 text-sm md:text-base text-on-surface-variant leading-relaxed font-body border-t border-outline-variant/5">
                      {t(item.a)}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-primary/5 rounded-[2rem] p-8 border border-primary/10 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="space-y-2 text-center md:text-left">
          <h4 className="text-xl font-black font-headline">Ainda tem dúvidas?</h4>
          <p className="text-on-surface-variant font-body">Entre em contato direto com nossa equipe pelo portal de suporte oficial.</p>
        </div>
        <button className="flex items-center gap-2 px-8 py-4 bg-primary text-on-primary rounded-2xl font-black font-headline shadow-lg shadow-primary/20 hover:scale-[0.98] transition-all whitespace-nowrap">
          Abrir Chamado <ExternalLink size={20} />
        </button>
      </div>
    </div>
  );
}
