import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Mail, Lock, LogIn, UserPlus, HelpCircle, Eye, EyeOff } from 'lucide-react';
import { Screen } from '../types';
import { useLanguage } from '../contexts/LanguageContext';

interface LoginScreenProps {
  onLogin: (email: string, pass: string) => void;
  onNavigate: (screen: Screen) => void;
  externalError?: string;
  isLoading?: boolean;
}

export function LoginScreen({ onLogin, onNavigate, externalError, isLoading }: LoginScreenProps) {
  const { t } = useLanguage();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const [success, setSuccess] = useState('');
  const [isResetting, setIsResetting] = useState(false);

  const handleForgotPassword = async () => {
    if (!email) {
      setError('Por favor, digite seu e-mail para recuperar a senha.');
      return;
    }
    setIsResetting(true);
    setError('');
    setSuccess('');
    
    // Simulating password reset in local mode
    setTimeout(() => {
      setSuccess('Modo Local: Um link de recuperação (simulado) seria enviado para ' + email);
      setIsResetting(false);
    }, 1000);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email || !password) {
      setError('Por favor, preencha todos os campos.');
      return;
    }
    onLogin(email, password);
  };

  const currentError = error || externalError;

  return (
    <div className="min-h-screen bg-surface flex flex-col items-center justify-center p-6">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md space-y-8"
      >
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-primary text-on-primary shadow-xl mb-4">
            <LogIn size={40} />
          </div>
          <h1 className="text-4xl font-black font-headline text-on-surface tracking-tight">
            KM profit
          </h1>
          <p className="text-on-surface-variant font-medium">
            Acesse sua conta para gerenciar suas finanças
          </p>
        </div>

        <form onSubmit={handleSubmit} className="bg-surface-container rounded-3xl p-8 shadow-xl border border-surface-container-high space-y-6">
          {currentError && (
            <div className="bg-error/10 text-error text-sm font-bold p-4 rounded-xl border border-error/20">
              {currentError}
            </div>
          )}
          {success && (
            <div className="bg-green-500/10 text-green-600 text-sm font-bold p-4 rounded-xl border border-green-500/20">
              {success}
            </div>
          )}

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-black text-on-surface-variant uppercase tracking-widest px-1">
                E-mail
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant" size={20} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onFocus={(e) => e.target.placeholder = ''}
                  onBlur={(e) => e.target.placeholder = 'seu@email.com'}
                  className="w-full bg-surface-container-low p-4 pl-12 rounded-2xl text-on-surface font-medium focus:ring-2 focus:ring-primary/50 outline-none transition-all"
                  placeholder="seu@email.com"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-black text-on-surface-variant uppercase tracking-widest px-1">
                Senha
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant" size={20} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={(e) => e.target.placeholder = ''}
                  onBlur={(e) => e.target.placeholder = '••••••••'}
                  className="w-full bg-surface-container-low p-4 pl-12 pr-12 rounded-2xl text-on-surface font-medium focus:ring-2 focus:ring-primary/50 outline-none transition-all"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface transition-colors focus:outline-none"
                  title={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-primary text-on-primary p-4 rounded-2xl font-black uppercase tracking-widest shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-70"
          >
            {isLoading ? (
              <div className="w-6 h-6 border-2 border-on-primary border-t-transparent rounded-full animate-spin" />
            ) : (
              <LogIn size={20} />
            )}
            {isLoading ? 'Entrando...' : 'Entrar'}
          </button>

          <div className="grid grid-cols-2 gap-4 pt-2">
            <button
              type="button"
              onClick={() => onNavigate('signup')}
              className="flex flex-col items-center gap-2 p-4 rounded-2xl hover:bg-surface-container-high transition-colors group"
            >
              <div className="w-10 h-10 rounded-xl bg-secondary/10 text-secondary flex items-center justify-center group-hover:scale-110 transition-transform">
                <UserPlus size={20} />
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
                Não tenho cadastro
              </span>
            </button>

            <button
              type="button"
              onClick={handleForgotPassword}
              disabled={isResetting}
              className="flex flex-col items-center gap-2 p-4 rounded-2xl hover:bg-surface-container-high transition-colors group disabled:opacity-50"
            >
              <div className="w-10 h-10 rounded-xl bg-surface-container-lowest text-on-surface-variant flex items-center justify-center group-hover:scale-110 transition-transform">
                <HelpCircle size={20} className={isResetting ? 'animate-spin' : ''} />
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
                {isResetting ? 'Enviando...' : 'Não lembro a senha'}
              </span>
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
