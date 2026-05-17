import React, { useState, useMemo } from 'react';
import { 
  TrendingUp, 
  Clock, 
  Route, 
  Timer, 
  CreditCard, 
  Plus, 
  Trash2, 
  CheckCircle, 
  ChevronRight, 
  Edit2, 
  X, 
  Car, 
  Calendar as CalendarIcon, 
  Info,
  Mic,
  Loader2,
  Check
} from 'lucide-react';
import { IncomeRecord, Screen, Platform } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import { parseLocaleNumber, formatLocaleCurrency } from '../lib/currency';
import { DatePicker } from '../../components/ui/date-picker';
import { parseVoiceCommand } from '../services/aiService';
import { VoiceVisualizer } from './ui/VoiceVisualizer';

const iconMap: Record<string, any> = {
  TrendingUp, Clock, Route, Timer, CreditCard, Plus, Trash2, CheckCircle, ChevronRight, Edit2, X, Car, Info
};

interface AddIncomeScreenProps {
  onConfirm: (record: IncomeRecord) => void;
  onNavigate: (screen: Screen, data?: any) => void;
  incomes: IncomeRecord[];
  onDeleteIncome: (id: number) => void;
  platforms: Platform[];
  initialData?: Partial<IncomeRecord> & { isFixedMode?: boolean };
  key?: React.Key;
}

export function AddIncomeScreen({ onConfirm, onNavigate, incomes, onDeleteIncome, platforms, initialData }: AddIncomeScreenProps) {
  const isFixedMode = initialData?.isFixedMode;
  const { t, language } = useLanguage();
  const [date, setDate] = useState(initialData?.date || new Date().toISOString().split('T')[0]);
  const [hoursWorked, setHoursWorked] = useState(initialData?.hoursWorked || '12:00');
  const [kmDriven, setKmDriven] = useState(initialData?.kmDriven?.toString() || '');
  const [notes, setNotes] = useState(initialData?.notes || '');
  const [items, setItems] = useState<{ id: number; platform: string; amount: string; trips: string }[]>(
    (initialData?.items as any)?.map((i: any) => ({
      id: i.id,
      platform: i.platform || i.platformId,
      amount: i.amount,
      trips: i.trips
    })) || []
  );
  
  const [currentPlatformId, setCurrentPlatformId] = useState(platforms.filter(p => isFixedMode ? p.type === 'fixed' : p.type !== 'fixed')[0]?.id || '');
  const [currentAmount, setCurrentAmount] = useState('0,00');
  const [currentTrips, setCurrentTrips] = useState('');
  const [activeField, setActiveField] = useState<'amount' | 'trips' | 'km' | 'hours'>('amount');
  const [editingItemId, setEditingItemId] = useState<number | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [errorAlert, setErrorAlert] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessingVoice, setIsProcessingVoice] = useState(false);
  const [recognitionInstance, setRecognitionInstance] = useState<any>(null);
  const [lastTranscript, setLastTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');

  const processTranscript = async (transcript: string) => {
    if (!transcript) return;
    
    setIsProcessingVoice(true);
    try {
      const data = await parseVoiceCommand(transcript, 'income', []);
      
      if (data.amount) setCurrentAmount(formatLocaleCurrency(data.amount, language).replace(t('currencySymbol') + ' ', ''));
      if (data.platform) {
        // Find matching platform by ID or name
        const match = platforms.find(p => p.id === data.platform.toLowerCase() || p.name.toLowerCase().includes(data.platform.toLowerCase()));
        if (match) setCurrentPlatformId(match.id);
      }
      if (data.date) setDate(data.date);
      if (data.notes) setNotes(data.notes);
      
      setShowSuccess(true);
      setLastTranscript('');
      setInterimTranscript('');
      setTimeout(() => setShowSuccess(false), 3000);
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
      // Handled by stopAndConfirm
    };

    setRecognitionInstance(recognition);
    recognition.start();
  };

  const cancelRecording = () => {
    recognitionInstance?.stop();
    setIsRecording(false);
    setLastTranscript('');
  };

  const stopAndConfirm = () => {
    recognitionInstance?.stop();
    setIsRecording(false);
    if (lastTranscript) {
      processTranscript(lastTranscript);
    }
  };
  const [type, setType] = useState<'fixed' | 'variable'>(isFixedMode ? 'fixed' : 'variable');

  const formatCurrency = (value: string) => {
    const digits = value.replace(/\D/g, '');
    const numberValue = parseInt(digits) || 0;
    return formatLocaleCurrency(numberValue / 100, language);
  };

  const handleAddItem = () => {
    if (currentAmount === '0,00' || currentAmount === '0') return;
    
    if (editingItemId !== null) {
      setItems(prev => prev.map(item => 
        item.id === editingItemId 
          ? { ...item, platform: currentPlatformId, amount: currentAmount, trips: currentTrips }
          : item
      ));
      setEditingItemId(null);
    } else {
      setItems(prev => [...prev, {
        id: Date.now(),
        platform: currentPlatformId,
        amount: currentAmount,
        trips: currentTrips
      }]);
    }
    
    setCurrentAmount('0,00');
    setCurrentTrips('');
  };

  const handleEditItem = (id: number) => {
    const item = items.find(i => i.id === id);
    if (item) {
      setCurrentPlatformId(item.platform);
      setCurrentAmount(item.amount);
      setCurrentTrips(item.trips);
      setEditingItemId(id);
      setActiveField('amount');
    }
  };

  const handleDeleteItem = (id: number) => {
    setItems(prev => prev.filter(i => i.id !== id));
    if (editingItemId === id) {
      setEditingItemId(null);
      setCurrentAmount('0,00');
      setCurrentTrips('');
    }
  };

  const handleConfirmIncome = () => {
    if (items.length === 0) {
      setErrorAlert(t('addAtLeastOneEntry'));
      return;
    }

    const totalAmount = items.reduce((acc, item) => acc + parseLocaleNumber(item.amount, language), 0);
    const totalTrips = items.reduce((acc, item) => acc + parseInt(item.trips || '0'), 0);

    const incomeData: IncomeRecord = {
      id: initialData?.id || Date.now(),
      date,
      hoursWorked,
      kmDriven: parseInt(kmDriven || '0'),
      notes,
      items,
      totalAmount,
      totalTrips,
      type,
      status: 'paid',
    };

    onConfirm(incomeData);
    setShowSuccess(true);
    
    // Reset form after a delay, but stay on screen
    setTimeout(() => {
      setShowSuccess(false);
      // Reset items and other fields only if it was a NEW record
      if (!initialData?.id) {
        setItems([]);
        setCurrentAmount('0,00');
        setCurrentTrips('');
        setKmDriven('');
        setNotes('');
      } else {
        // If it was an edit, maybe go back to dashboard or reports?
        // User said "Mantenha a tela ainda em registrar ganho após a pessoa fazer um registro"
        // referring to making multiple entries. So clearing for new entries is good.
        setItems([]);
        setKmDriven('');
        setNotes('');
        onNavigate('add-income'); // Reset editing state
      }
    }, 2000);
  };

  const totalAccumulated = items.reduce((acc, item) => acc + parseLocaleNumber(item.amount, language), 0);

  return (
    <div className="space-y-10 pb-20">
      <div className="flex items-center justify-between mb-10">
        <h1 className="text-4xl font-extrabold text-on-surface tracking-tight">
          {initialData?.id ? t('editIncome') : t('registerIncome')}
        </h1>
        <button 
          onClick={() => onNavigate('dashboard')}
          className="px-4 py-2 bg-surface-container-high text-on-surface rounded-xl font-bold text-sm hover:bg-surface-container-highest transition-colors"
        >
          {t('back')}
        </button>
      </div>

      {showSuccess && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="bg-secondary text-on-secondary px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 border border-white/20">
            <CheckCircle size={24} />
            <p className="font-black">{t('incomeRegisteredSuccess')}</p>
          </div>
        </div>
      )}

      {errorAlert && (
          <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-top-4 duration-300">
            <div className="bg-error text-on-error px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 border border-white/20">
              <Info size={24} />
              <p className="font-black">{errorAlert}</p>
              <button onClick={() => setErrorAlert(null)} className="ml-2 hover:opacity-70">
                <X size={18} />
              </button>
            </div>
          </div>
        )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column */}
        <div className="lg:col-span-7 space-y-8">

          {/* Platform Selection */}
          <section>
            <label className="block text-xs font-bold text-on-surface-variant mb-4 uppercase tracking-wider">{t('selectPlatform')}</label>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
              {[...platforms].sort((a, b) => {
                if (a.type === b.type) return 0;
                return a.type === 'fixed' ? -1 : 1;
              }).map((platform) => {
                const isSelected = currentPlatformId === platform.id;
                const Icon = (platform && iconMap[platform.icon]) ? iconMap[platform.icon] : Car;
                
                // Helper to get platform specific colors
                const getPlatformColors = () => {
                  const color = platform.color || 'primary';
                  const colorMap: Record<string, { container: string, iconBg: string, text: string }> = {
                    'green-600': { container: isSelected ? 'bg-green-600/20 border-green-600 shadow-md scale-105' : 'bg-green-600/5 border-transparent opacity-70 hover:opacity-100', iconBg: 'bg-green-600 text-white', text: 'text-green-700 dark:text-green-400' },
                    'blue-500': { container: isSelected ? 'bg-blue-500/20 border-blue-500 shadow-md scale-105' : 'bg-blue-500/5 border-transparent opacity-70 hover:opacity-100', iconBg: 'bg-blue-500 text-white', text: 'text-blue-700 dark:text-blue-400' },
                    'neutral-200': { container: isSelected ? 'bg-neutral-200/30 border-neutral-400 shadow-md scale-105' : 'bg-neutral-200/10 border-transparent opacity-70 hover:opacity-100', iconBg: 'bg-neutral-400 text-white', text: 'text-neutral-700 dark:text-neutral-300' },
                    'yellow-500': { container: isSelected ? 'bg-yellow-500/20 border-yellow-500 shadow-md scale-105' : 'bg-yellow-500/5 border-transparent opacity-70 hover:opacity-100', iconBg: 'bg-yellow-500 text-black', text: 'text-yellow-700 dark:text-yellow-400' },
                    'orange-600': { container: isSelected ? 'bg-orange-600/20 border-orange-600 shadow-md scale-105' : 'bg-orange-600/5 border-transparent opacity-70 hover:opacity-100', iconBg: 'bg-orange-600 text-white', text: 'text-orange-700 dark:text-orange-400' },
                    'red-600': { container: isSelected ? 'bg-red-600/20 border-red-600 shadow-md scale-105' : 'bg-red-600/5 border-transparent opacity-70 hover:opacity-100', iconBg: 'bg-red-600 text-white', text: 'text-red-700 dark:text-red-400' },
                    'yellow-300': { container: isSelected ? 'bg-yellow-300/20 border-yellow-400 shadow-md scale-105' : 'bg-yellow-300/5 border-transparent opacity-70 hover:opacity-100', iconBg: 'bg-yellow-300 text-black', text: 'text-yellow-700 dark:text-yellow-400' },
                    'orange-500': { container: isSelected ? 'bg-orange-500/20 border-orange-500 shadow-md scale-105' : 'bg-orange-500/5 border-transparent opacity-70 hover:opacity-100', iconBg: 'bg-orange-500 text-white', text: 'text-orange-700 dark:text-orange-400' },
                    'blue-400': { container: isSelected ? 'bg-blue-400/20 border-blue-400 shadow-md scale-105' : 'bg-blue-400/5 border-transparent opacity-70 hover:opacity-100', iconBg: 'bg-blue-400 text-white', text: 'text-blue-700 dark:text-blue-400' },
                    'purple-600': { container: isSelected ? 'bg-purple-600/20 border-purple-600 shadow-md scale-105' : 'bg-purple-600/5 border-transparent opacity-70 hover:opacity-100', iconBg: 'bg-purple-600 text-white', text: 'text-purple-700 dark:text-purple-400' },
                    'yellow-600': { container: isSelected ? 'bg-yellow-600/20 border-yellow-600 shadow-md scale-105' : 'bg-yellow-600/5 border-transparent opacity-70 hover:opacity-100', iconBg: 'bg-yellow-600 text-white', text: 'text-yellow-700 dark:text-yellow-400' },
                    'yellow-400': { container: isSelected ? 'bg-yellow-400/20 border-yellow-400 shadow-md scale-105' : 'bg-yellow-400/5 border-transparent opacity-70 hover:opacity-100', iconBg: 'bg-yellow-400 text-black', text: 'text-yellow-700 dark:text-yellow-400' },
                    'black': { container: isSelected ? 'bg-black/10 border-black shadow-md scale-105' : 'bg-black/5 border-transparent opacity-70 hover:opacity-100', iconBg: 'bg-black text-white', text: 'text-black dark:text-white' },
                    'pink-500': { container: isSelected ? 'bg-pink-500/20 border-pink-500 shadow-md scale-105' : 'bg-pink-500/5 border-transparent opacity-70 hover:opacity-100', iconBg: 'bg-pink-500 text-white', text: 'text-pink-700 dark:text-pink-400' },
                    'primary': { container: isSelected ? 'bg-primary/20 border-primary shadow-md scale-105' : 'bg-primary/5 border-transparent opacity-70 hover:opacity-100', iconBg: 'bg-primary text-white', text: 'text-primary' },
                    'blue-600': { container: isSelected ? 'bg-blue-600/20 border-blue-600 shadow-md scale-105' : 'bg-blue-600/5 border-transparent opacity-70 hover:opacity-100', iconBg: 'bg-blue-600 text-white', text: 'text-blue-700 dark:text-blue-400' },
                    'orange-400': { container: isSelected ? 'bg-orange-400/20 border-orange-400 shadow-md scale-105' : 'bg-orange-400/5 border-transparent opacity-70 hover:opacity-100', iconBg: 'bg-orange-400 text-white', text: 'text-orange-700 dark:text-orange-400' },
                  };

                  return colorMap[color] || colorMap['primary'];
                };

                const styles = getPlatformColors();
                
                return (
                  <button
                    key={platform.id}
                    onClick={() => {
                      setCurrentPlatformId(platform.id);
                      if (platform.type === 'fixed') {
                        setType('fixed');
                        if (platform.defaultAmount !== undefined) {
                          setCurrentAmount(formatLocaleCurrency(platform.defaultAmount, language).replace(t('currencySymbol') + ' ', ''));
                        } else {
                          setCurrentAmount('0,00');
                        }
                      } else {
                        setType('variable');
                        setCurrentAmount('0,00');
                      }
                    }}
                    className={`flex flex-col items-center justify-center p-3 border-2 rounded-xl transition-all group relative overflow-hidden ${styles.container}`}
                  >
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 transition-colors ${styles.iconBg}`}>
                      {platform.isDefault ? (
                        (platform.id === 'uberblack' || platform.id === 'uberx' || platform.id === 'ubercomfort' || platform.id === 'uberbag') ? <span className="font-black text-xs italic">U</span> :
                        (platform.id === '99taxi' || platform.id === '99top' || platform.id === '99pop') ? <span className="font-black text-xs">99</span> :
                        platform.id === 'maxim' ? <span className="font-black text-xs">M</span> :
                        platform.id === 'rappi' ? <span className="font-black text-xs">R</span> :
                        platform.id === 'james' ? <span className="font-black text-xs">J</span> :
                        platform.id === 'cabify' ? <span className="font-black text-xs">C</span> :
                        platform.id === 'ladydriver' ? <span className="font-black text-xs">L</span> :
                        platform.id === 'sity' ? <span className="font-black text-xs">S</span> :
                        platform.id === 'wappa' ? <span className="font-black text-xs">W</span> :
                        <Icon size={20} />
                      ) : (
                        <Icon size={20} />
                      )}
                    </div>
                    <span className={`text-[10px] font-bold text-center leading-tight ${styles.text}`}>
                      {platform.isDefault ? t(platform.id) : platform.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Entry Data */}
          <section className="bg-surface-container-lowest rounded-xl p-6 shadow-sm space-y-6">
            <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider">{t('entryData')}</label>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className={`space-y-1 border-b-2 transition-colors pb-1 ${activeField === 'amount' ? 'border-primary' : 'border-outline-variant/30'}`}>
                <label className="text-[10px] font-bold text-on-surface-variant uppercase">{t('amountEarned')}</label>
                <div className="flex items-baseline gap-1">
                  <span className="text-xl font-bold text-primary">{t('currencySymbol')}</span>
                  <input 
                    className="w-full bg-transparent border-none text-3xl font-black text-on-surface focus:ring-0 p-0" 
                    type="text"
                    inputMode="numeric"
                    value={currentAmount}
                    placeholder={t('currencyPlaceholder')}
                    onFocus={(e) => {
                      setActiveField('amount');
                      e.target.select();
                      e.target.placeholder = '';
                    }}
                    onBlur={(e) => {
                      if (currentAmount === '0,00' || currentAmount === '') {
                        e.target.placeholder = t('currencyPlaceholder');
                      }
                    }}
                    onClick={(e) => {
                      const target = e.target as HTMLInputElement;
                      target.setSelectionRange(target.value.length, target.value.length);
                    }}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '');
                      setCurrentAmount(formatCurrency(val));
                    }}
                  />
                  {isRecording ? (
                    <div className="flex-1 flex flex-col items-center gap-3 bg-secondary/5 rounded-3xl p-4 border border-secondary/20 shadow-inner animate-in fade-in zoom-in duration-300">
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
                </div>
                {isRecording && (
                  <p className="mt-2 text-[10px] font-black text-secondary animate-pulse uppercase tracking-[0.2em] text-center">{t('recording')}</p>
                )}
                {isProcessingVoice && (
                  <p className="mt-2 text-[10px] font-black text-neutral-400 animate-pulse uppercase tracking-widest">{t('processingVoice')}</p>
                )}
              </div>

              <div className={`space-y-1 border-b-2 transition-colors pb-1 ${activeField === 'trips' ? 'border-primary' : 'border-outline-variant/30'}`}>
                <label className="text-[10px] font-bold text-on-surface-variant uppercase">{t('tripsCount')}</label>
                <div className="flex items-center gap-2">
                  <input 
                    className="w-full bg-transparent border-none text-3xl font-black text-on-surface focus:ring-0 p-0 placeholder:italic" 
                    type="text"
                    inputMode="numeric"
                    value={currentTrips}
                    placeholder="ex: 20"
                    onFocus={(e) => {
                      setActiveField('trips');
                      e.target.placeholder = '';
                    }}
                    onBlur={(e) => {
                      if (currentTrips === '') e.target.placeholder = 'ex: 20';
                    }}
                    onChange={(e) => setCurrentTrips(e.target.value.replace(/\D/g, ''))}
                  />
                  <TrendingUp size={24} className="text-primary/40" />
                </div>
              </div>
            </div>

            <button 
              onClick={handleAddItem}
              disabled={currentAmount === '0,00' || currentAmount === '0'}
              className="w-full py-4 bg-primary text-on-primary rounded-2xl font-black text-sm uppercase tracking-widest shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:grayscale disabled:scale-100 flex items-center justify-center gap-2"
            >
              {editingItemId !== null ? <CheckCircle size={20} /> : <Plus size={20} />}
              {editingItemId !== null ? t('updateIncome') : t('add')}
            </button>
          </section>
        </div>

        {/* Right Column */}
        <div className="lg:col-span-5 space-y-6">
          {/* General Info */}
          <section className="bg-surface-container-lowest rounded-xl p-6 shadow-sm space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider">{t('incomeDate')}</label>
                <DatePicker 
                  date={new Date(date + 'T12:00:00')} 
                  setDate={(d) => d && setDate(d.toISOString().split('T')[0])} 
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider">{t('hoursWorked')}</label>
                  <div className="relative">
                    <Timer className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/40" size={18} />
                    <input 
                      className="w-full bg-surface-container-low border-none rounded-xl py-3 pl-10 pr-4 text-sm font-bold text-on-surface focus:ring-2 focus:ring-primary/20" 
                      type="time"
                      value={hoursWorked}
                      onChange={(e) => setHoursWorked(e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider">{t('kmDriven')}</label>
                  <div className={`relative border-b-2 transition-colors ${activeField === 'km' ? 'border-primary' : 'border-outline-variant/30'}`}>
                    <Route className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/40" size={18} />
                    <input 
                      className="w-full bg-surface-container-low border-none rounded-xl py-3 pl-10 pr-4 text-sm font-bold text-on-surface focus:ring-2 focus:ring-primary/20 placeholder:italic" 
                      type="text"
                      inputMode="numeric"
                      value={kmDriven}
                      placeholder="ex: 400 km"
                      onFocus={(e) => {
                        setActiveField('km');
                        e.target.placeholder = '';
                      }}
                      onBlur={(e) => {
                        if (kmDriven === '') e.target.placeholder = 'ex: 400 km';
                      }}
                      onChange={(e) => setKmDriven(e.target.value.replace(/\D/g, ''))}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider">{t('notes')}</label>
                <textarea 
                  className="w-full bg-surface-container-low border-none rounded-xl p-4 text-sm font-medium text-on-surface focus:ring-2 focus:ring-primary/20 min-h-[100px] resize-none" 
                  placeholder={t('notesPlaceholder')}
                  value={notes}
                  onFocus={(e) => e.target.placeholder = ''}
                  onBlur={(e) => e.target.placeholder = t('notesPlaceholder')}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
            </div>
          </section>

          {/* Added Items List */}
          <section className="space-y-3">
            <div className="flex items-center justify-between px-2">
              <h2 className="text-lg font-extrabold tracking-tight">{t('addedEntries')}</h2>
              <span className="px-2 py-0.5 bg-surface-container-highest rounded-full text-[9px] font-bold text-neutral-500 uppercase">{items.length} {items.length === 1 ? t('item') : t('items')}</span>
            </div>
            <div className="space-y-2">
              {items.map((item) => {
                const platform = platforms.find(p => p.id === item.platform);
                const Icon = (platform && iconMap[platform.icon]) ? iconMap[platform.icon] : Car;
                
                return (
                  <div key={item.id} className="flex items-center justify-between p-3 bg-surface-container-lowest rounded-xl border-l-4 shadow-sm" style={{ borderLeftColor: platform?.color || '#cbd5e1' }}>
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        (item.platform === 'uberblack' || item.platform === 'uberx' || item.platform === 'ubercomfort' || item.platform === 'uberbag') ? 'bg-black' : 
                        item.platform === '99pop' ? 'bg-yellow-400' :
                        item.platform === 'ladydriver' ? 'bg-pink-500' :
                        item.platform === 'sity' ? 'bg-blue-600' :
                        item.platform === 'wappa' ? 'bg-orange-400' :
                        item.platform === '99taxi' ? 'bg-yellow-500' :
                        item.platform === '99top' ? 'bg-yellow-600' :
                        item.platform === 'indrive' ? 'bg-blue-500' :
                        item.platform === 'taxi' ? 'bg-yellow-500' :
                        item.platform === 'freight' ? 'bg-orange-600' :
                        item.platform === 'carpool' ? 'bg-green-500' :
                        item.platform === 'ifood' ? 'bg-red-600' :
                        item.platform === 'maxim' ? 'bg-yellow-300' :
                        item.platform === 'rappi' ? 'bg-orange-500' :
                        item.platform === 'james' ? 'bg-blue-400' :
                        item.platform === 'cabify' ? 'bg-purple-600' : 'bg-neutral-200'
                      }`}>
                        {platform?.isDefault ? (
                          (item.platform === 'uberblack' || item.platform === 'uberx' || item.platform === 'ubercomfort' || item.platform === 'uberbag') ? <span className="text-white font-black text-xs italic">U</span> :
                          (item.platform === '99taxi' || item.platform === '99top' || item.platform === '99pop') ? <span className="text-black font-black text-xs">99</span> :
                          item.platform === 'maxim' ? <span className="text-black font-black text-xs">M</span> :
                          item.platform === 'rappi' ? <span className="text-white font-black text-xs">R</span> :
                          item.platform === 'james' ? <span className="text-white font-black text-xs">J</span> :
                          item.platform === 'cabify' ? <span className="text-white font-black text-xs">C</span> :
                          item.platform === 'ladydriver' ? <span className="text-white font-black text-xs">L</span> :
                          item.platform === 'sity' ? <span className="text-white font-black text-xs">S</span> :
                          item.platform === 'wappa' ? <span className="text-white font-black text-xs">W</span> :
                          <Icon size={14} className="text-white" />
                        ) : (
                          <Icon size={14} className="text-white" />
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-on-surface">{platform?.isDefault ? t(item.platform) : platform?.name}</p>
                        <p className="text-[10px] font-medium text-on-surface-variant">{item.trips} {t('tripsLower')}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-sm font-black text-primary">{t('currencySymbol')} {item.amount}</p>
                      </div>
                      <div className="flex gap-1">
                        <button onClick={() => handleEditItem(item.id)} className="p-1.5 text-primary hover:bg-primary/10 rounded-lg transition-colors">
                          <Edit2 size={16} />
                        </button>
                        <button onClick={() => handleDeleteItem(item.id)} className="p-1.5 text-error hover:bg-error/10 rounded-lg transition-colors">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
              
              {items.length === 0 && (
                <div className="text-center py-10 bg-surface-container-low rounded-xl border-2 border-dashed border-outline-variant/30">
                  <p className="text-sm font-bold text-on-surface-variant">{t('noEntriesAdded')}</p>
                </div>
              )}
            </div>
          </section>

          {/* Total Summary */}
          <section className="bg-primary text-on-primary rounded-2xl p-6 shadow-xl shadow-primary/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest opacity-70 mb-1">{t('accumulatedTotal')}</p>
                <p className="text-3xl font-black">{t('currencySymbol')} {formatLocaleCurrency(totalAccumulated, language)}</p>
              </div>
              <TrendingUp size={40} className="opacity-20" />
            </div>
          </section>

          <button 
            onClick={handleConfirmIncome}
            className="w-full py-5 bg-secondary text-on-secondary rounded-2xl font-black text-lg uppercase tracking-widest shadow-xl shadow-secondary/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3"
          >
            <CheckCircle size={24} />
            {initialData?.id ? t('updateIncome') : t('confirmIncome')}
          </button>

          {/* Recent History Section */}
          <div className="bg-surface-container-low p-4 rounded-2xl border border-outline-variant/30 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black text-on-surface-variant uppercase tracking-widest">{t('recentHistory')}</h3>
              <span className="bg-secondary/10 text-secondary text-[10px] font-black px-2 py-0.5 rounded-full">
                {incomes.filter(i => i.type !== 'fixed').length} {t('records')}
              </span>
            </div>

            <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1 custom-scrollbar">
              {incomes
                .filter(i => i.type !== 'fixed')
                .sort((a, b) => {
                  const dateA = new Date(a.date + 'T12:00:00').getTime();
                  const dateB = new Date(b.date + 'T12:00:00').getTime();
                  if (dateA !== dateB) return dateB - dateA;
                  return b.id - a.id;
                })
                .map((item) => {
                  return (
                    <div key={item.id} className="bg-surface-container-lowest p-3 rounded-xl border border-outline-variant/20 shadow-sm hover:border-secondary/30 transition-all group">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-secondary/10 rounded-full flex items-center justify-center text-secondary shrink-0">
                            <TrendingUp size={20} />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-on-surface-variant uppercase">
                              {new Date(item.date + 'T12:00:00').toLocaleDateString(language, { day: '2-digit', month: 'short', year: 'numeric' })}
                            </p>
                            <p className="font-black text-secondary text-lg leading-tight">{t('currencySymbol')} {formatLocaleCurrency(item.totalAmount, language)}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <button 
                            onClick={() => onNavigate('add-income', item)}
                            className="p-1.5 text-primary hover:bg-primary/10 rounded-lg transition-colors"
                            title={t('edit')}
                          >
                            <Edit2 size={16} />
                          </button>
                          <button 
                            onClick={() => onDeleteIncome(item.id)}
                            className="p-1.5 text-error hover:bg-error/10 rounded-lg transition-colors"
                            title={t('delete')}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 text-xs font-black text-on-surface-variant uppercase tracking-tighter mb-2 pb-2 border-b border-outline-variant/10">
                        <div className="flex items-center gap-1">
                          <Car size={12} className="text-secondary/60" />
                          <span>{item.totalTrips} {t('trips')}</span>
                        </div>
                        {item.kmDriven > 0 && (
                          <div className="flex items-center gap-1">
                            <Route size={12} className="text-secondary/60" />
                            <span>{item.kmDriven} KM</span>
                          </div>
                        )}
                        {item.hoursWorked && (
                          <div className="flex items-center gap-1">
                            <Clock size={12} className="text-secondary/60" />
                            <span>{item.hoursWorked}</span>
                          </div>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-1.5 capitalize">
                        {item.items.map((entry, idx) => {
                          const platform = platforms.find(p => p.id === (entry.platform || (entry as any).platformId));
                          return (
                            <div 
                              key={`${item.id}-${idx}`}
                              className="px-2 py-0.5 bg-secondary/5 rounded border border-secondary/10 flex items-center gap-1.5"
                            >
                              <span className="text-sm font-black text-secondary">
                                {platform?.isDefault ? t(platform.id) : platform?.name || entry.platform}
                              </span>
                              <div className="w-[1px] h-3 bg-secondary/20" />
                              <span className="text-sm font-bold text-on-surface">
                                {entry.trips} {t('tripsLower')}
                              </span>
                            </div>
                          );
                        })}
                      </div>

                      {item.notes && (
                        <p className="text-xs text-on-surface font-black italic mt-2 line-clamp-1 opacity-70">
                          "{item.notes}"
                        </p>
                      )}
                    </div>
                  );
                })}
              {incomes.length === 0 && (
                <div className="text-center py-8 opacity-40">
                  <p className="text-xs font-bold uppercase tracking-tighter">{t('noHistory')}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
