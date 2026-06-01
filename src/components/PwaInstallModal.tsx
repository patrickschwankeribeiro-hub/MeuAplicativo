import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Smartphone, Share2, Plus, Monitor, Check, ArrowRight, Download } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

interface PwaInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
  deferredPrompt: any;
  onTriggerInstall: () => Promise<void>;
}

export function PwaInstallModal({ isOpen, onClose, deferredPrompt, onTriggerInstall }: PwaInstallModalProps) {
  const { language } = useLanguage();
  const [copiedLink, setCopiedLink] = React.useState(false);

  if (!isOpen) return null;

  // Detect platform information
  const userAgent = window.navigator.userAgent;
  const isIos = /iPad|iPhone|iPod/.test(userAgent) && !(window as any).MSStream;
  const isAndroid = /Android/.test(userAgent);
  const isMobile = isIos || isAndroid;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.origin);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        {/* Backdrop overlay */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-md"
        />

        {/* Modal box */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: 'spring', duration: 0.4 }}
          className="relative bg-slate-900 border border-slate-800 text-slate-100 rounded-3xl p-6 md:p-8 w-full max-w-lg shadow-2xl z-10 overflow-hidden"
        >
          {/* Subtle gradient light background */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-[100px] pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-sky-500/10 rounded-full blur-[100px] pointer-events-none" />

          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-emerald-500/10 text-emerald-400 rounded-2xl flex items-center justify-center">
                <Smartphone size={24} />
              </div>
              <div>
                <h2 className="text-xl font-bold font-headline text-white">
                  {language === 'pt-BR' ? 'Instalar Aplicativo' : 'Install App'}
                </h2>
                <p className="text-xs text-slate-400">
                  {language === 'pt-BR' ? 'Acesso rápido na tela inicial do celular' : 'Quick access on your home screen'}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white bg-slate-800/50 rounded-full transition-colors hover:scale-105 active:scale-95"
            >
              <X size={18} />
            </button>
          </div>

          <div className="space-y-6">
            {/* Promo banner explaining why to install */}
            <div className="p-4 bg-slate-800/40 rounded-2xl border border-slate-800 text-sm leading-relaxed text-slate-300">
              {language === 'pt-BR' ? (
                <>
                  Ao instalar o <strong className="text-emerald-400">KM Profit</strong> como aplicativo, ele funcionará sem o navegador visível, ocupará menos espaço, abrirá instantaneamente e poderá armazenar dados mesmo em instabilidades de rede.
                </>
              ) : (
                <>
                  By installing <strong className="text-emerald-400">KM Profit</strong> as an app, it will display fullscreen without web browser bars, boot instantly, and persist data offline.
                </>
              )}
            </div>

            {/* Programmatic One-Click Install for Android/Chrome/Desktop if supported */}
            {deferredPrompt ? (
              <div className="text-center space-y-3">
                <p className="text-xs text-slate-400 font-medium">
                  {language === 'pt-BR' ? 'Seu navegador suporta instalação direta!' : 'Your browser supports direct installation!'}
                </p>
                <button
                  onClick={onTriggerInstall}
                  className="w-full py-4 px-6 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-black uppercase tracking-widest rounded-2xl shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 text-sm"
                >
                  <Download size={18} />
                  {language === 'pt-BR' ? 'Instalar Agora no Celular/PC' : 'Install Now on Device'}
                </button>
              </div>
            ) : isIos ? (
              /* Step-by-step for iPhone/iPad OS Safari */
              <div className="space-y-4">
                <p className="text-xs font-bold text-emerald-400 uppercase tracking-widest">
                  {language === 'pt-BR' ? 'Passo a passo para iOS / Apple' : 'Steps for iPhone and iPad'}
                </p>
                <div className="space-y-3">
                  <div className="flex items-start gap-3 p-3 bg-slate-800/30 rounded-xl border border-slate-800/50">
                    <div className="w-6 h-6 bg-slate-800 text-slate-300 text-xs font-bold rounded-full flex items-center justify-center shrink-0">
                      1
                    </div>
                    <div className="text-xs text-slate-300">
                      {language === 'pt-BR' ? (
                        <>
                          Abra o app no navegador <strong className="text-white">Safari</strong> e clique no botão de <strong className="text-white">Compartilhar</strong> <span className="inline-block p-1 bg-slate-800 rounded"><Share2 size={12} className="inline" /></span>.
                        </>
                      ) : (
                        <>
                          Open the app in <strong className="text-white">Safari</strong> browser and tap the <strong className="text-white">Share</strong> button <span className="inline-block p-1 bg-slate-800 rounded"><Share2 size={12} className="inline" /></span> in the bottom toolbar.
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 bg-slate-800/30 rounded-xl border border-slate-800/50">
                    <div className="w-6 h-6 bg-slate-800 text-slate-300 text-xs font-bold rounded-full flex items-center justify-center shrink-0">
                      2
                    </div>
                    <div className="text-xs text-slate-300">
                      {language === 'pt-BR' ? (
                        <>
                          Role a lista e clique em <strong className="text-white">Adicionar à Tela de Início</strong> <span className="inline-block p-1 bg-slate-800 rounded"><Plus size={12} className="inline" /></span>.
                        </>
                      ) : (
                        <>
                          Scroll down the menu list and tap <strong className="text-white">Add to Home Screen</strong> <span className="inline-block p-1 bg-slate-800 rounded"><Plus size={12} className="inline" /></span>.
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 bg-slate-800/30 rounded-xl border border-slate-800/50">
                    <div className="w-6 h-6 bg-slate-800 text-slate-300 text-xs font-bold rounded-full flex items-center justify-center shrink-0">
                      3
                    </div>
                    <div className="text-xs text-slate-300">
                      {language === 'pt-BR' ? (
                        <>
                          Clique em <strong className="text-white">Adicionar</strong> no canto superior direito. Pronto! O app aparecerá na tela do seu celular.
                        </>
                      ) : (
                        <>
                          Tap <strong className="text-white">Add</strong> in the top-right corner. It's done! The KM Profit icon will be added to your device.
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* fallback for generic browsers, Chrome without beforeinstallprompt because page loaded in frame */
              <div className="space-y-4">
                <p className="text-xs font-bold text-sky-400 uppercase tracking-widest">
                  {language === 'pt-BR' ? 'Como Instalar no seu Navegador' : 'How to Install on Your Browser'}
                </p>
                <div className="space-y-3">
                  <div className="flex items-start gap-3 p-3 bg-slate-800/30 rounded-xl border border-slate-800/50">
                    <div className="w-6 h-6 bg-slate-800 text-slate-300 text-xs font-bold rounded-full flex items-center justify-center shrink-0">
                      1
                    </div>
                    <div className="text-xs text-slate-300">
                      {language === 'pt-BR' ? (
                        <>
                          Clique no ícone de <strong className="text-white">Instalar (Exibição com Seta na barra de endereços do Chrome)</strong> ou abra o menu de configurações de 3 pontinhos (<strong className="text-white">⋮</strong>) do seu navegador.
                        </>
                      ) : (
                        <>
                          Look at your URL bar and click the <strong className="text-white">Install Icon (Screen with arrow)</strong>, or open your browser's options menu (triple dots <strong className="text-white">⋮</strong>).
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 bg-slate-800/30 rounded-xl border border-slate-800/50">
                    <div className="w-6 h-6 bg-slate-800 text-slate-300 text-xs font-bold rounded-full flex items-center justify-center shrink-0">
                      2
                    </div>
                    <div className="text-xs text-slate-300">
                      {language === 'pt-BR' ? (
                        <>
                          Toque em <strong className="text-white">Instalar Aplicativo</strong> ou <strong className="text-white">Adicionar à tela inicial</strong>.
                        </>
                      ) : (
                        <>
                          Select <strong className="text-white">Install App</strong> or <strong className="text-white">Add to Home Screen</strong>.
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Mobile share option */}
                <div className="pt-2">
                  <button
                    onClick={handleCopyLink}
                    className="w-full py-3 px-4 bg-slate-800 hover:bg-slate-750 text-slate-200 hover:text-white font-semibold rounded-xl text-xs transition-all flex items-center justify-center gap-2"
                  >
                    {copiedLink ? (
                      <>
                        <Check size={14} className="text-emerald-400" />
                        {language === 'pt-BR' ? 'Link Copiado!' : 'Link Copied!'}
                      </>
                    ) : (
                      <>
                        <Share2 size={14} />
                        {language === 'pt-BR' ? 'Copiar link do app para acessar no celular' : 'Copy app link to open on phone'}
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="mt-8 flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-3 bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white font-bold rounded-xl text-xs transition-colors"
            >
              {language === 'pt-BR' ? 'Entendido' : 'Got it'}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
