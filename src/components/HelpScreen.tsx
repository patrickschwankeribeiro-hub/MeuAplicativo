import React, { useState } from 'react';
import { HelpCircle, ChevronDown, MessageSquare, ShieldCheck, Mail, ExternalLink } from 'lucide-react';
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
    { q: 'faqQ6', a: 'faqA6' },
    { q: 'faqQ7', a: 'faqA7' },
    { q: 'faqQ8', a: 'faqA8' },
    { q: 'faqQPeriod', a: 'faqAPeriod' }
  ];

  return (
    <div className="space-y-6 pb-12 max-w-2xl mx-auto">
      {/* Compact Header */}
      <header className="text-center space-y-2">
        <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-3 rotate-3 shadow-sm">
          <HelpCircle size={22} className="text-primary" />
        </div>
        <h2 className="text-xl font-black font-headline text-on-surface tracking-tight">{t('helpSupport')}</h2>
        <p className="text-on-surface-variant font-body text-xs max-w-sm mx-auto">
          Precisa de ajuda? Explore nosso FAQ ou entre em contato com nosso time de suporte.
        </p>
      </header>

      {/* Slim contact cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-surface-container-lowest p-3 rounded-xl border border-outline-variant/10 shadow-sm flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center text-blue-600 shrink-0">
            <Mail size={16} />
          </div>
          <div className="min-w-0">
            <h4 className="font-black text-[9px] uppercase tracking-wider text-neutral-400 font-headline leading-none mb-0.5">{t('email') || 'Email'}</h4>
            <p className="text-xs font-semibold text-on-surface truncate">support@kmprofit.app</p>
          </div>
        </div>

        <div className="bg-surface-container-lowest p-3 rounded-xl border border-outline-variant/10 shadow-sm flex items-center gap-3">
          <div className="w-8 h-8 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center text-green-600 shrink-0">
            <MessageSquare size={16} />
          </div>
          <div className="min-w-0">
            <h4 className="font-black text-[9px] uppercase tracking-wider text-neutral-400 font-headline leading-none mb-0.5">WhatsApp</h4>
            <p className="text-xs font-semibold text-on-surface truncate">+55 (11) 99999-9999</p>
          </div>
        </div>

        <div className="bg-surface-container-lowest p-3 rounded-xl border border-outline-variant/10 shadow-sm flex items-center gap-3">
          <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center text-purple-600 shrink-0">
            <ShieldCheck size={16} />
          </div>
          <div className="min-w-0">
            <h4 className="font-black text-[9px] uppercase tracking-wider text-neutral-400 font-headline leading-none mb-0.5">Privacidade</h4>
            <p className="text-xs font-semibold text-on-surface truncate">kmprofit.app/privacy</p>
          </div>
        </div>
      </div>

      {/* Clean FAQ Section */}
      <div className="bg-surface-container-lowest rounded-2xl p-4 md:p-5 shadow-sm border border-outline-variant/10">
        <h3 className="text-sm font-black font-headline text-on-surface tracking-wider uppercase mb-4 flex items-center gap-2">
          Perguntas Frequentes
        </h3>
        <div className="space-y-2">
          {faqItems.map((item, index) => (
            <div key={index} className="bg-surface-container-low rounded-xl overflow-hidden border border-outline-variant/5">
              <button 
                onClick={() => setOpenFaqIndex(openFaqIndex === index ? null : index)} 
                className="w-full py-3 px-4 flex items-center justify-between text-left hover:bg-surface-container-high transition-colors"
                id={`faq-btn-${index}`}
              >
                <span className="text-[13px] font-black font-headline text-on-surface leading-tight pr-4">{t(item.q)}</span>
                <div className={`p-1 rounded-lg bg-primary/10 text-primary transition-transform duration-300 shrink-0 ${openFaqIndex === index ? 'rotate-180' : ''}`}>
                  <ChevronDown size={14} />
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
                    <div className="px-4 pb-3 pt-1 text-[11px] leading-relaxed text-on-surface-variant font-body border-t border-outline-variant/5 border-dashed">
                      {t(item.a)}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      </div>

      {/* Compact Contact Footer Bar */}
      <div className="bg-primary/5 rounded-2xl p-4 border border-primary/10 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="text-center sm:text-left">
          <h4 className="text-xs font-black font-headline text-on-surface">Ainda tem dúvidas?</h4>
          <p className="text-[10px] text-on-surface-variant font-body mt-0.5">Entre em contato direto com nossa equipe pelo portal de suporte oficial.</p>
        </div>
        <button 
          id="btn-open-ticket"
          className="flex items-center gap-1.5 px-4 py-2 bg-primary hover:bg-primary-dark text-on-primary rounded-xl font-black text-[10px] uppercase tracking-wider shadow-sm active:scale-95 transition-all whitespace-nowrap"
        >
          Abrir Chamado <ExternalLink size={12} />
        </button>
      </div>
    </div>
  );
}
