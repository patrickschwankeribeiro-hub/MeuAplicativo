import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  BarChart3, 
  PlusCircle, 
  Settings, 
  LogOut,
  ChevronRight,
  Menu,
  X,
  Calculator,
  Repeat,
  RefreshCw,
  ArrowUp,
  Bell
} from 'lucide-react';
import { Screen } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { useLanguage } from '../contexts/LanguageContext';

interface SidebarProps {
  currentScreen: Screen;
  onNavigate: (screen: Screen) => void;
  onLogout: () => void;
  isOpen: boolean;
  onToggle: () => void;
}

export function Sidebar({ currentScreen, onNavigate, onLogout, isOpen, onToggle }: SidebarProps) {
  const { t } = useLanguage();
  const menuItems = [
    { id: 'dashboard', label: t('dashboard'), icon: LayoutDashboard },
    { id: 'reports', label: t('reports'), icon: BarChart3 },
    { id: 'reminders', label: t('reminders'), icon: Bell },
    { id: 'add', label: t('add'), icon: PlusCircle },
    { id: 'calculator', label: t('calculator'), icon: Calculator },
    { id: 'settings', label: t('settings'), icon: Settings },
  ];

  return (
    <>
      {/* Mobile Overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onToggle}
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      <motion.aside 
        initial={false}
        animate={{ 
          x: isOpen ? 0 : -288,
          width: isOpen ? 288 : 0,
          opacity: isOpen ? 1 : 0
        }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="fixed left-0 top-0 h-full bg-background border-r border-surface-container-low flex flex-col py-8 z-50 overflow-hidden"
      >
        <div className="px-8 mb-12 flex items-center justify-between">
          <h1 className="text-2xl font-black font-headline text-primary tracking-tighter whitespace-nowrap">KM profit</h1>
          <button 
            onClick={onToggle}
            className="p-2 hover:bg-surface-container-high rounded-full transition-colors group"
            title={t('settings')}
          >
            <Menu size={20} className="text-on-surface-variant group-hover:text-primary transition-colors" />
          </button>
        </div>
        
        <nav className="flex-1 space-y-2 px-4">
          {menuItems.map((item) => {
            const isActive = currentScreen === item.id || (item.id === 'add' && (currentScreen === 'add-income' || currentScreen === 'add-expense'));
            const Icon = item.icon;
            
            return (
              <button
                key={item.id}
                onClick={() => {
                  onNavigate(item.id as Screen);
                  if (window.innerWidth < 1024) onToggle();
                }}
                className={`w-full flex items-center gap-3 px-6 py-4 rounded-r-full transition-all duration-200 font-headline font-semibold text-left active:scale-[0.97] whitespace-nowrap ${
                  isActive 
                    ? 'bg-surface-container-lowest text-primary shadow-sm border-l-4 border-primary' 
                    : 'text-neutral-500 hover:text-primary'
                }`}
              >
                <Icon size={24} fill={isActive ? "currentColor" : "none"} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="px-8 mt-auto">
          <button 
            onClick={onLogout}
            className="flex items-center gap-3 px-6 py-4 text-error font-headline font-semibold hover:bg-error-container/10 rounded-xl transition-all w-full text-left whitespace-nowrap"
          >
            <LogOut size={24} />
            <span>{t('logout')}</span>
          </button>
        </div>
      </motion.aside>
    </>
  );
}

export function Layout({ children, currentScreen, onNavigate, onLogout }: { children: React.ReactNode, currentScreen: Screen, onNavigate: (screen: Screen) => void, onLogout: () => void }) {
  const { language } = useLanguage();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 400) {
        setShowScrollTop(true);
      } else {
        setShowScrollTop(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  return (
    <div className="min-h-screen bg-background flex">
      <Sidebar 
        currentScreen={currentScreen} 
        onNavigate={onNavigate} 
        onLogout={onLogout} 
        isOpen={isSidebarOpen}
        onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
      />
      
      <main className={`flex-1 min-h-screen relative transition-all duration-300 ${isSidebarOpen ? 'lg:ml-72' : 'ml-0'}`}>
        {/* Toggle Button (Hamburger) - Visible when sidebar is closed */}
        <AnimatePresence>
          {!isSidebarOpen && (
            <motion.button 
              initial={{ opacity: 0, scale: 0.8, x: -20 }}
              animate={{ opacity: 1, scale: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.8, x: -20 }}
              onClick={() => setIsSidebarOpen(true)}
              className="fixed top-6 left-6 z-40 p-3 bg-surface-container-lowest shadow-xl rounded-2xl border border-surface-container-high text-primary hover:scale-110 active:scale-95 transition-all"
              title="Abrir Menu"
            >
              <Menu size={24} />
            </motion.button>
          )}
        </AnimatePresence>

        <AnimatePresence mode="wait">
          <motion.div
            key={`${currentScreen}-${language}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="p-8 pt-12 max-w-5xl mx-auto w-full"
          >
            {children}
          </motion.div>
        </AnimatePresence>

        {/* Back to Top Button */}
        <AnimatePresence>
          {showScrollTop && (
            <motion.button
              initial={{ opacity: 0, scale: 0.5, y: 50 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.5, y: 50 }}
              onClick={scrollToTop}
              className="fixed bottom-8 right-8 z-50 p-4 bg-primary text-on-primary rounded-2xl shadow-2xl hover:scale-110 active:scale-95 transition-all border border-white/20"
              title="Voltar ao Topo"
            >
              <ArrowUp size={24} />
            </motion.button>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
