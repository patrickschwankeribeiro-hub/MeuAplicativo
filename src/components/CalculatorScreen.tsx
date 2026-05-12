import React, { useState, useEffect, useMemo } from 'react';
import { Calculator as CalcIcon, Info, CheckCircle2, AlertCircle, RotateCcw, Fuel, TrendingDown, Sparkles, History, Mic, Trash2, Check, Loader2 } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { motion, AnimatePresence } from 'motion/react';
import { Screen, ExpenseRecord } from '../types';
import { formatLocaleCurrency, parseLocaleNumber } from '../lib/currency';
import { FuelPerformance, calculateFuelPerformance, FuelCalculationMode } from '../lib/fuel';
import { parseVoiceCommand } from '../services/aiService';
import { VoiceVisualizer } from './ui/VoiceVisualizer';

interface CalculatorScreenProps {
  onNavigate: (screen: Screen, data?: any) => void;
  fuelPerformance?: FuelPerformance;
  expenses: ExpenseRecord[];
}

export function CalculatorScreen({ onNavigate, fuelPerformance: initialFuelPerformance, expenses }: CalculatorScreenProps) {
  const { t, language } = useLanguage();
  const [ethanolPrice, setEthanolPrice] = useState('');
  const [gasolinePrice, setGasolinePrice] = useState('');
  const [customRatio, setCustomRatio] = useState(70);
  const [isSmartMode, setIsSmartMode] = useState(false);
  const [calcMode, setCalcMode] = useState<FuelCalculationMode>('all');
  
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessingVoice, setIsProcessingVoice] = useState(false);
  const [recognitionInstance, setRecognitionInstance] = useState<any>(null);
  const [lastTranscript, setLastTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [errorAlert, setErrorAlert] = useState<string | null>(null);
  
  const processTranscript = async (transcript: string) => {
    if (!transcript) return;
    
    setIsProcessingVoice(true);
    try {
      const data = await parseVoiceCommand(transcript, 'calculator', []);
      
      if (data.ethanolPrice) {
        setEthanolPrice(data.ethanolPrice.toLocaleString(language === 'pt-BR' ? 'pt-BR' : 'en-US', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }));
      }
      if (data.gasolinePrice) {
        setGasolinePrice(data.gasolinePrice.toLocaleString(language === 'pt-BR' ? 'pt-BR' : 'en-US', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }));
      }
      
      setLastTranscript('');
      setInterimTranscript('');
    } catch (error) {
      console.error('Voice parsing error', error);
      setErrorAlert(t('voiceError'));
    } finally {
      setIsProcessingVoice(false);
    }
  };

  const startVoiceCapture = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setErrorAlert(t('speechRecognitionNotSupported'));
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = language === 'pt-BR' ? 'pt-BR' : 'en-US';
    recognition.interimResults = true;
    recognition.continuous = true;

    recognition.onstart = () => {
      setIsRecording(true);
      setLastTranscript('');
      setInterimTranscript('');
    };

    recognition.onresult = (event: any) => {
      let finalTranscript = '';
      let interim = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        } else {
          interim += event.results[i][0].transcript;
        }
      }
      
      if (finalTranscript) {
        setLastTranscript(prev => prev + ' ' + finalTranscript);
      }
      setInterimTranscript(interim);
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error', event.error);
      setIsRecording(false);
      setErrorAlert(t('voiceError'));
    };

    recognition.onend = () => {
      // Wait for manual confirm
    };

    setRecognitionInstance(recognition);
    recognition.start();
  };

  const cancelRecording = () => {
    recognitionInstance?.stop();
    setIsRecording(false);
    setLastTranscript('');
    setInterimTranscript('');
  };

  const stopAndConfirm = () => {
    recognitionInstance?.stop();
    setIsRecording(false);
    if (lastTranscript || interimTranscript) {
      processTranscript(lastTranscript + ' ' + interimTranscript);
    }
  };

  const [result, setResult] = useState<{ 
    advantage: 'ethanol' | 'gasoline'; 
    ratio: number;
    ethanolCostPerKm?: number;
    gasolineCostPerKm?: number;
    breakEvenPrice?: number;
  } | null>(null);

  // Re-calculate performance
  const currentFuelPerformance = useMemo(() => {
    return calculateFuelPerformance(expenses, language, { mode: calcMode });
  }, [expenses, language, calcMode]);

  const hasRealData = !!(currentFuelPerformance?.ethanol && currentFuelPerformance?.gasoline);
  
  // Validation: At least 2 closings of each
  const isSmartModeEnabled = useMemo(() => {
    const ethanolCount = currentFuelPerformance?.ethanol?.measurementsCount || 0;
    const gasolineCount = currentFuelPerformance?.gasoline?.measurementsCount || 0;
    return ethanolCount >= 2 && gasolineCount >= 2;
  }, [currentFuelPerformance]);

  useEffect(() => {
    if (!ethanolPrice || !gasolinePrice) {
      setResult(null);
    }
  }, [ethanolPrice, gasolinePrice]);

  const calculateAdvantage = () => {
    const e = parseLocaleNumber(ethanolPrice, language);
    const g = parseLocaleNumber(gasolinePrice, language);

    if (isNaN(e) || isNaN(g) || g === 0) return;

    let ratio;
    let ethanolCostPerKm;
    let gasolineCostPerKm;
    let breakEvenPrice;

    // Use smart data only if MODE is on AND requirements are MET (2+ closings)
    const activeSmartMode = isSmartMode && isSmartModeEnabled;

    const currentEfficiency = (activeSmartMode && currentFuelPerformance?.efficiencyRatio) 
      ? currentFuelPerformance.efficiencyRatio 
      : customRatio;

    ratio = (e / g) * 100;
    
    if (activeSmartMode && currentFuelPerformance?.ethanol && currentFuelPerformance?.gasoline) {
      ethanolCostPerKm = e / currentFuelPerformance.ethanol.kmPerLiter;
      gasolineCostPerKm = g / currentFuelPerformance.gasoline.kmPerLiter;
      breakEvenPrice = g * (currentFuelPerformance.efficiencyRatio! / 100);
    } else {
      breakEvenPrice = g * (customRatio / 100);
    }

    setResult({
      advantage: ratio <= currentEfficiency ? 'ethanol' : 'gasoline',
      ratio: ratio,
      ethanolCostPerKm,
      gasolineCostPerKm,
      breakEvenPrice
    });
  };

  const handleResetRatio = () => {
    setCustomRatio(70);
  };

  const handlePriceChange = (value: string, setter: (val: string) => void) => {
    const digits = value.replace(/\D/g, '');
    if (!digits) {
      setter('');
      return;
    }
    const numberValue = parseInt(digits, 10) / 100;
    const formatted = numberValue.toLocaleString(language === 'pt-BR' ? 'pt-BR' : 'en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    setter(formatted);
  };

  const handleGoToFueling = () => {
    if (!result) return;
    const data = {
      category: 'fuel',
      fuelType: result.advantage === 'ethanol' ? 'ethanol' : 'gasolineCommon',
      pricePerLiter: result.advantage === 'ethanol' ? ethanolPrice : gasolinePrice
    };
    onNavigate('add-expense', data);
  };

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-2">
        <h2 className="text-3xl font-black font-headline text-on-surface tracking-tight flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-xl">
            <CalcIcon className="text-primary" size={28} />
          </div>
          {t('calculator')}
        </h2>
        <p className="text-neutral-500 font-medium">
          {isSmartMode && isSmartModeEnabled ? (
            <>
              O etanol é vantajoso se o preço dele for até <span className="font-black text-green-600 bg-green-50 px-2 py-0.5 rounded-md">{(currentFuelPerformance?.efficiencyRatio || 70).toFixed(2)}%</span> do valor da gasolina.
            </>
          ) : (
            <>
              {t('flexRatioInfo')} <span className="text-[10px] font-bold text-neutral-400 block mt-1">(você pode ajustar essa porcentagem abaixo)</span>
            </>
          )}
        </p>
      </header>

      <div className="flex flex-col gap-4">
        <div className="bg-surface-container-low p-5 rounded-[2rem] border border-outline-variant/20 shadow-sm transition-all">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-xl ${isSmartMode ? 'bg-primary/20 text-primary' : 'bg-neutral-100 text-neutral-400'}`}>
                <Sparkles size={20} />
              </div>
              <h4 className="text-base font-black text-on-surface uppercase tracking-wider">{t('smartMode')}</h4>
            </div>
            <button
              onClick={() => setIsSmartMode(!isSmartMode)}
              className={`relative w-12 h-6 rounded-full transition-all ${isSmartMode ? 'bg-primary' : 'bg-neutral-300'}`}
            >
              <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${isSmartMode ? 'translate-x-6' : ''}`} />
            </button>
          </div>
          
          <p className="text-[11px] font-bold text-neutral-500 uppercase tracking-widest leading-relaxed mb-4">
            O modo inteligente ajusta a eficiência e trava automaticamente usando seus dados da área de Desempenho de Combustível.
          </p>

          <AnimatePresence>
            {isSmartMode && isSmartModeEnabled && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="pt-4 border-t border-outline-variant/10 flex items-center justify-between"
              >
                <label className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest">Base de Cálculo:</label>
                <div className="flex bg-surface-container-highest p-1 rounded-xl">
                  <button 
                    onClick={() => setCalcMode('all')}
                    className={`px-3 py-1.5 text-[10px] font-bold uppercase rounded-lg transition-all ${calcMode === 'all' ? 'bg-primary text-on-primary shadow-sm' : 'text-on-surface-variant hover:bg-surface-container-low'}`}
                  >
                    {t('allHistory')}
                  </button>
                  <button 
                    onClick={() => setCalcMode('recent')}
                    className={`px-3 py-1.5 text-[10px] font-bold uppercase rounded-lg transition-all ${calcMode === 'recent' ? 'bg-primary text-on-primary shadow-sm' : 'text-on-surface-variant hover:bg-surface-container-low'}`}
                  >
                    {t('recentData')}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <section className="bg-surface-container-lowest p-8 rounded-[2.5rem] shadow-xl border border-surface-container-high space-y-6">
          <div className="flex flex-col items-center justify-center p-2">
            {isRecording ? (
              <div className="w-full flex flex-col items-center gap-3 bg-secondary/5 rounded-3xl p-4 border border-secondary/20 shadow-inner animate-in fade-in zoom-in duration-300">
                <div className="w-full flex items-center gap-4">
                  <button 
                    onClick={cancelRecording}
                    className="p-3 bg-error/10 text-error rounded-full hover:bg-error/20 transition-all active:scale-90 shadow-sm"
                    title={t('cancel')}
                  >
                    <Trash2 size={24} />
                  </button>
                  
                  <div className="flex-1 overflow-hidden">
                    <VoiceVisualizer isRecording={isRecording} />
                  </div>
                  
                  <button 
                    onClick={stopAndConfirm}
                    className="p-3 bg-secondary text-on-secondary rounded-full hover:shadow-lg hover:shadow-secondary/30 transition-all active:scale-90 shadow-md ring-4 ring-secondary/20"
                    title={t('confirm')}
                  >
                    <Check size={28} className="font-black" />
                  </button>
                </div>
                
                <div className="w-full min-h-[40px] px-2 text-center">
                  <p className="text-xs text-secondary/70 italic leading-relaxed line-clamp-2">
                    {lastTranscript}
                    <span className="text-secondary opacity-50">{interimTranscript}</span>
                  </p>
                </div>
              </div>
            ) : (
              <button 
                className={`p-3 rounded-full transition-all active:scale-95 flex items-center justify-center shrink-0 shadow-sm ${
                  isProcessingVoice 
                    ? 'bg-neutral-200 text-neutral-500' 
                    : 'bg-primary/10 text-primary hover:bg-primary/20'
                }`}
                disabled={isProcessingVoice}
                title={t('voiceCapture')}
                onClick={startVoiceCapture}
              >
                {isProcessingVoice ? <Loader2 size={28} className="animate-spin" /> : <Mic size={28} />}
              </button>
            )}
            {isRecording && (
                <p className="mt-2 text-[10px] font-black text-secondary animate-pulse uppercase tracking-[0.2em] text-center">{t('recording')}</p>
            )}
            {isProcessingVoice && (
                <p className="mt-2 text-[10px] font-black text-neutral-400 animate-pulse uppercase tracking-widest text-center">{t('processingVoice')}</p>
            )}
          </div>

          <AnimatePresence mode="wait">
            {errorAlert && (
              <motion.div
                key="voice-error"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="p-3 bg-error/10 text-error rounded-xl text-xs font-bold flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <AlertCircle size={14} />
                  {errorAlert}
                </div>
                <button onClick={() => setErrorAlert(null)}>
                  <RotateCcw size={14} />
                </button>
              </motion.div>
            )}

            {isSmartMode && !isSmartModeEnabled && (
              <motion.div 
                key="no-data"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="p-6 bg-error/5 border border-error/20 rounded-3xl space-y-2 mb-4"
              >
                <div className="flex items-center gap-2 text-error">
                  <AlertCircle size={18} />
                  <h4 className="text-sm font-black uppercase tracking-wider">{t('insufficientFuelData')}</h4>
                </div>
                <p className="text-[10px] font-bold text-error/70 uppercase tracking-widest leading-relaxed">
                  {t('insufficientFuelDataDesc')}
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-bold text-neutral-500 uppercase tracking-wider ml-1">
                {t('ethanolPrice')}
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400 font-bold">
                  {t('currencySymbol')}
                </span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={ethanolPrice}
                  onChange={(e) => handlePriceChange(e.target.value, setEthanolPrice)}
                  placeholder="0,00"
                  onFocus={(e) => e.target.placeholder = ''}
                  onBlur={(e) => e.target.placeholder = '0,00'}
                  className="w-full pl-12 pr-4 py-4 bg-surface-container-low border border-outline-variant/30 rounded-2xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-headline font-bold text-lg"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-neutral-500 uppercase tracking-wider ml-1">
                {t('gasolinePrice')}
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400 font-bold">
                  {t('currencySymbol')}
                </span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={gasolinePrice}
                  onChange={(e) => handlePriceChange(e.target.value, setGasolinePrice)}
                  placeholder="0,00"
                  onFocus={(e) => e.target.placeholder = ''}
                  onBlur={(e) => e.target.placeholder = '0,00'}
                  className="w-full pl-12 pr-4 py-4 bg-surface-container-low border border-outline-variant/30 rounded-2xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-headline font-bold text-lg"
                />
              </div>
            </div>

            {/* Efficiency Ratio */}
            <div className="space-y-4 pt-4 border-t border-outline-variant/20">
              <div className="flex items-center justify-between">
                <label className="text-sm font-bold text-neutral-500 uppercase tracking-wider ml-1">
                  {t('customRatio')}
                </label>
                <div className="flex items-center gap-3">
                  <span className={`text-lg font-black font-headline ${isSmartMode && isSmartModeEnabled ? 'text-green-600 animate-pulse' : 'text-green-600'}`}>
                    {isSmartMode && isSmartModeEnabled ? (currentFuelPerformance?.efficiencyRatio?.toFixed(1) || customRatio) : customRatio}%
                  </span>
                  {!isSmartMode && (
                    <button 
                      onClick={handleResetRatio}
                      className="p-2 rounded-full border border-primary/20 bg-primary/5 text-primary hover:bg-primary/10 transition-all group shadow-sm ml-2"
                      title={t('resetRatio')}
                    >
                      <RotateCcw size={14} className="group-hover:rotate-[-45deg] transition-transform" />
                    </button>
                  )}
                </div>
              </div>
              <input
                type="range"
                min="30"
                max="95"
                step="1"
                disabled={isSmartMode && isSmartModeEnabled}
                value={isSmartMode && isSmartModeEnabled ? Math.round(currentFuelPerformance?.efficiencyRatio || 70) : customRatio}
                onChange={(e) => setCustomRatio(parseInt(e.target.value))}
                style={{
                  background: `linear-gradient(to right, #22c55e 0%, #22c55e ${(( (isSmartMode && isSmartModeEnabled ? (currentFuelPerformance?.efficiencyRatio || 70) : customRatio) - 30) / (95 - 30) * 100)}%, #e5e7eb ${(( (isSmartMode && isSmartModeEnabled ? (currentFuelPerformance?.efficiencyRatio || 70) : customRatio) - 30) / (95 - 30) * 100)}%, #e5e7eb 100%)`
                }}
                className={`w-full h-2 rounded-lg appearance-none cursor-pointer accent-green-600 ${isSmartMode && isSmartModeEnabled ? 'opacity-50' : ''}`}
              />
              <div className="relative h-4 mt-2">
                <span className="absolute left-0 text-[10px] font-bold text-neutral-400 uppercase tracking-widest">30%</span>
                <span className="absolute left-[61.5%] -translate-x-1/2 text-[10px] font-bold text-green-500 uppercase tracking-widest">70%</span>
                <span className="absolute right-0 text-[10px] font-bold text-neutral-400 uppercase tracking-widest">95%</span>
              </div>
              
              {isSmartMode && isSmartModeEnabled && (
                <div className="mt-4 p-4 bg-primary/5 rounded-2xl border border-primary/10 flex flex-col gap-3">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-black text-neutral-500 uppercase tracking-widest">Seu Veículo</span>
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-2 border-t border-primary/10">
                    <div>
                      <p className="text-[9px] font-black text-neutral-400 uppercase tracking-widest mb-1">Etanol</p>
                      <p className="text-sm font-black text-on-surface">{currentFuelPerformance?.ethanol?.kmPerLiter.toFixed(2)} km/L</p>
                    </div>
                    <div>
                      <p className="text-[9px] font-black text-neutral-400 uppercase tracking-widest mb-1">Gasolina</p>
                      <p className="text-sm font-black text-on-surface">{currentFuelPerformance?.gasoline?.kmPerLiter.toFixed(2)} km/L</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <button
            onClick={calculateAdvantage}
            disabled={!ethanolPrice || !gasolinePrice}
            className="w-full py-4 bg-primary text-on-primary rounded-2xl font-headline font-black text-lg shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:scale-100 disabled:shadow-none"
          >
            {t('calculate')}
          </button>
        </section>

        <section className="flex flex-col gap-6">
          <AnimatePresence mode="wait">
            {result && (!isSmartMode || isSmartModeEnabled) ? (
              <motion.div
                key="result"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="flex-1 p-8 rounded-[2.5rem] border-2 border-outline-variant/20 bg-white flex flex-col items-center justify-center text-center gap-6 shadow-xl"
              >
                <div className={`p-6 rounded-full ${
                  result.advantage === 'ethanol' ? 'bg-success/10 text-success' : 'bg-primary/10 text-primary'
                }`}>
                  {result.advantage === 'ethanol' ? (
                    <CheckCircle2 size={64} />
                  ) : (
                    <TrendingDown size={64} />
                  )}
                </div>
                
                <div className="space-y-2">
                  <h3 className="text-sm font-bold uppercase tracking-widest text-neutral-400">
                    {t('result')}
                  </h3>
                  <p className={`text-4xl font-black font-headline tracking-tight ${
                    result.advantage === 'ethanol' ? 'text-success' : 'text-primary'
                  }`}>
                    {result.advantage === 'ethanol' ? t('advantageEthanol') : t('advantageGasoline')}
                  </p>
                </div>

                <div className="w-full h-px bg-outline-variant/20" />

                <button
                  onClick={handleGoToFueling}
                  className="mt-2 w-full flex items-center justify-center gap-2 px-8 py-4 bg-surface-container-high hover:bg-primary hover:text-on-primary text-on-surface rounded-2xl font-headline font-black transition-all group active:scale-95 shadow-md"
                >
                  <Fuel size={20} />
                  {t('goToFueling')}
                </button>
              </motion.div>
            ) : (
              <motion.div 
                key="placeholder"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex-1 bg-white border-2 border-dashed border-outline-variant/30 rounded-[2.5rem] flex flex-col items-center justify-center p-8 text-center gap-4 shadow-sm"
              >
                <div className="p-4 bg-surface-container-high rounded-full text-neutral-400">
                  <Info size={32} />
                </div>
                <p className="text-neutral-500 font-medium max-w-[200px]">
                  Insira os preços para ver qual combustível compensa mais hoje.
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </section>
      </div>
    </div>
  );
}
