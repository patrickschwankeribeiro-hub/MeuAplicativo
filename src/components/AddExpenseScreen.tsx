import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Fuel, 
  Wrench, 
  Utensils, 
  Key, 
  SquareParking, 
  Truck, 
  Gavel, 
  Milestone, 
  Wifi, 
  IdCard, 
  Ship, 
  FileText,
  Info,
  Calendar as CalendarIcon,
  CheckCircle,
  Edit2,
  Trash2,
  Camera,
  Paperclip,
  X,
  Tag,
  Target,
  Mic,
  Loader2,
  Check,
  Droplets,
  Triangle,
  Radar,
  KeyRound,
  Car,
  Bike,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { ExpenseRecord, Screen, Category, UserProfile, GoalHistory } from '../types';
import { FUEL_SUBCATEGORIES, MAINTENANCE_SUBCATEGORIES, FOOD_SUBCATEGORIES } from '../constants';
import { useLanguage } from '../contexts/LanguageContext';
import { parseLocaleNumber, formatLocaleCurrency, formatMaskedCurrency } from '../lib/currency';
import { DatePicker } from '../../components/ui/date-picker';
import { parseVoiceCommand } from '../services/aiService';
import { VoiceVisualizer } from './ui/VoiceVisualizer';

const VehicleRentIcon = ({ size, className }: { size: number; className?: string }) => (
  <div className={`flex items-center gap-0.5 ${className}`}>
    <Car size={size * 0.9} />
    <span className="opacity-30">|</span>
    <Bike size={size} />
  </div>
);

const iconMap: Record<string, any> = {
  Fuel, Wrench, Utensils, Key, KeyRound, SquareParking, Truck, Gavel, Milestone, Wifi, IdCard, Ship, FileText, Tag, Target, Droplets, Triangle, Radar, VehicleRent: VehicleRentIcon
};

interface AddExpenseScreenProps {
  onConfirm: (record: ExpenseRecord) => void;
  onNavigate: (screen: Screen, data?: any) => void;
  expenses: ExpenseRecord[];
  onDeleteExpense: (id: number) => void;
  categories: Category[];
  onSaveCategories: (categories: Category[]) => void;
  userProfile: UserProfile;
  onSaveProfile: (profile: UserProfile) => void;
  goalHistory?: GoalHistory;
  initialData?: Partial<ExpenseRecord>;
  key?: React.Key;
  activeVehicleId?: string | null;
}

export function AddExpenseScreen({ 
  onConfirm, 
  onNavigate, 
  expenses, 
  onDeleteExpense, 
  categories, 
  onSaveCategories,
  userProfile, 
  onSaveProfile, 
  goalHistory = {},
  initialData,
  activeVehicleId
}: AddExpenseScreenProps) {
  const { t, language } = useLanguage();
  const [amount, setAmount] = useState(() => {
    if (typeof initialData?.amount === 'number') {
      return formatLocaleCurrency(initialData.amount, language);
    }
    return (initialData?.amount as string) || '0,00';
  });
  const [selectedCategory, setSelectedCategory] = useState(initialData?.category || categories[0]?.id || 'fuel');
  const [date, setDate] = useState(initialData?.date || new Date().toISOString().split('T')[0]);
  const [editingId, setEditingId] = useState<number | null>(initialData?.id || null);

  const currentCategoryObj = categories.find(c => c.id === selectedCategory);

  const [fuelType, setFuelType] = useState(initialData?.fuelType || FUEL_SUBCATEGORIES[0]);
  const [subCategory, setSubCategory] = useState(initialData?.subCategory || '');
  const [notes, setNotes] = useState(initialData?.notes || '');
  const [attachmentUrl, setAttachmentUrl] = useState(initialData?.attachmentUrl);
  
  const [liters, setLiters] = useState(() => {
    if (typeof (initialData as any)?.liters === 'number') {
      return (initialData as any).liters.toString().replace('.', ',');
    }
    return initialData?.liters || '';
  });
  const [pricePerLiter, setPricePerLiter] = useState(() => {
    if (typeof (initialData as any)?.pricePerLiter === 'number') {
      return formatLocaleCurrency((initialData as any).pricePerLiter, language);
    }
    // Auto-calculate from amount and liters if price is missing
    if (typeof initialData?.amount === 'number' && typeof (initialData as any)?.liters === 'number' && (initialData as any).liters > 0) {
      return formatLocaleCurrency(initialData.amount / (initialData as any).liters, language);
    }
    return initialData?.pricePerLiter || '';
  });
  const [gnvVolume, setGnvVolume] = useState(() => {
    if (typeof (initialData as any)?.gnvVolume === 'number') {
      return (initialData as any).gnvVolume.toString().replace('.', ',');
    }
    return initialData?.gnvVolume || '';
  });
  const [gnvPrice, setGnvPrice] = useState(() => {
    if (typeof (initialData as any)?.gnvPrice === 'number') {
      return formatLocaleCurrency((initialData as any).gnvPrice, language);
    }
    // Auto-calculate from amount and volume if price is missing
    if (typeof initialData?.amount === 'number' && typeof (initialData as any)?.gnvVolume === 'number' && (initialData as any).gnvVolume > 0) {
      return formatLocaleCurrency(initialData.amount / (initialData as any).gnvVolume, language);
    }
    return initialData?.gnvPrice || '';
  });
  const [odometer, setOdometer] = useState(initialData?.odometer || '');
  const [isFullTank, setIsFullTank] = useState(initialData?.isFullTank || false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string>('');
  const [errorAlert, setErrorAlert] = useState<string | null>(null);
  const [activeField, setActiveField] = useState<'amount' | 'liters' | 'pricePerLiter' | 'gnvVolume' | 'gnvPrice' | 'odometer'>('amount');
  const [isRecording, setIsRecording] = useState(false);
  
  const [isProcessingVoice, setIsProcessingVoice] = useState(false);
  const [recognitionInstance, setRecognitionInstance] = useState<any>(null);
  const [lastTranscript, setLastTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');

  // Budget logic - Using goalHistory for accuracy
  const currentGoal = React.useMemo(() => {
    if (!activeVehicleId) return undefined;
    const d = new Date(date + 'T12:00:00');
    const periodKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const key = `${activeVehicleId}_${periodKey}`;
    return goalHistory[key];
  }, [date, goalHistory, activeVehicleId]);

  const budgetLimit = currentGoal?.categoryBudgets?.[selectedCategory] || 0;
  
  const currentMonthIdx = new Date(date + 'T12:00:00').getMonth();
  const currentYear = new Date(date + 'T12:00:00').getFullYear();
  
  const categorySpending = expenses
    .filter(e => {
        const d = new Date(e.date + 'T12:00:00');
        return e.category === selectedCategory && 
               d.getMonth() === currentMonthIdx && 
               d.getFullYear() === currentYear &&
               e.id !== editingId;
    })
    .reduce((sum, e) => sum + parseLocaleNumber(e.amount, language), 0);
  
  const budgetProgress = budgetLimit > 0 ? (categorySpending / budgetLimit) * 100 : 0;
  const remainingBudget = Math.max(0, budgetLimit - categorySpending);

  // Auto-calculate volume when amount or price changes
  React.useEffect(() => {
    if (selectedCategory !== 'fuel') return;
    
    const amtNum = parseLocaleNumber(amount, language);
    
    if (fuelType === 'gnv') {
      const p = parseLocaleNumber(gnvPrice, language);
      // Only auto-update if we have valid values AND user isn't currently focusing the volume field
      if (amtNum > 0 && p > 0 && activeField !== 'gnvVolume') {
        const volume = amtNum / p;
        setGnvVolume(volume.toFixed(2).replace('.', ','));
      }
    } else {
      const p = parseLocaleNumber(pricePerLiter, language);
      // Only auto-update if we have valid values AND user isn't currently focusing the volume field
      if (amtNum > 0 && p > 0 && activeField !== 'liters') {
        const volume = amtNum / p;
        setLiters(volume.toFixed(2).replace('.', ','));
      }
    }
  }, [amount, pricePerLiter, gnvPrice, fuelType, selectedCategory, language, activeField]);

  const processTranscript = async (transcript: string) => {
    if (!transcript) return;
    
    setIsProcessingVoice(true);
    try {
      const data = await parseVoiceCommand(transcript, 'expense', categories);
      
      if (data.amount) setAmount(formatLocaleCurrency(data.amount, language).replace(t('currencySymbol') + ' ', ''));
      if (data.category && categories.some(c => c.id === data.category)) {
        setSelectedCategory(data.category);
        // Map subcategory if present
        if (data.subcategory) {
          if (data.category === 'fuel') {
            setFuelType(data.subcategory);
          } else {
            setSubCategory(data.subcategory);
          }
        }
      }
      if (data.date) setDate(data.date);
      if (data.notes) setNotes(data.notes);
      if (data.liters) setLiters(data.liters.toString().replace('.', ','));
      if (data.pricePerLiter) setPricePerLiter(formatLocaleCurrency(data.pricePerLiter, language).replace(t('currencySymbol') + ' ', ''));
      if (data.gnvVolume) setGnvVolume(data.gnvVolume.toString().replace('.', ','));
      if (data.gnvPrice) setGnvPrice(formatLocaleCurrency(data.gnvPrice, language).replace(t('currencySymbol') + ' ', ''));
      if (data.odometer) setOdometer(data.odometer.toString());
      if (data.isFullTank !== undefined) setIsFullTank(data.isFullTank);
      
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
      // Don't auto-reset recording state here as we want to wait for user confirmation
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

  const lastOdometer = React.useMemo(() => {
    const fuelExpenses = expenses
      .filter(e => e.category === 'fuel' && e.odometer)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime() || b.id - a.id);
    return fuelExpenses[0]?.odometer || '0';
  }, [expenses]);

  const handleFullTankToggle = () => {
    setIsFullTank(!isFullTank);
  };

  const formatCurrency = (value: string) => {
    const digits = value.replace(/\D/g, '');
    const numberValue = parseInt(digits) || 0;
    return formatLocaleCurrency(numberValue / 100, language);
  };

  const calculateFuelAmount = (l: string, p: string) => {
    const volNum = parseLocaleNumber(l, language);
    const priceNum = parseLocaleNumber(p, language);
    if (volNum > 0 && priceNum > 0) {
      const total = volNum * priceNum;
      setAmount(formatLocaleCurrency(total, language));
    }
  };

  const calculatePriceFromAmount = (amt: string, vol: string) => {
    const amtNum = parseLocaleNumber(amt, language);
    const volNum = parseLocaleNumber(vol, language);
    if (volNum > 0 && amtNum > 0) {
      const price = amtNum / volNum;
      if (fuelType === 'gnv') {
        setGnvPrice(formatLocaleCurrency(price, language));
      } else {
        setPricePerLiter(formatLocaleCurrency(price, language));
      }
    }
  };

  const handleConfirmExpense = () => {
    if (amount === '0,00' || amount === '0') {
      setErrorAlert(t('enterExpenseAmount'));
      return;
    }

    setSuccessMessage(t('expenseRegisteredSuccess'));
    if (selectedCategory === 'fuel' && (!odometer || odometer === '0' || odometer === '')) {
      setErrorAlert(t('odometerRequired'));
      return;
    }

    const category = categories.find(c => c.id === selectedCategory);
    const costType = category?.costType || 'variable';

    if (selectedCategory === 'fuel' && odometer && odometer !== '' && odometer !== '0') {
      const currentOdo = parseFloat(odometer);
      const previousOdo = expenses
        .filter(e => e.category === 'fuel' && e.id !== editingId && e.odometer)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime() || b.id - a.id)[0]?.odometer;
      
      if (previousOdo) {
        if (currentOdo <= parseFloat(previousOdo)) {
          setErrorAlert(t('odometerMustBeIncreasing'));
          return;
        }
      }
    }

    const expenseData: ExpenseRecord = {
      id: editingId || Date.now(),
      amount,
      category: selectedCategory,
      date,
      notes,
      fuelType: selectedCategory === 'fuel' ? fuelType : undefined,
      costType,
      liters: selectedCategory === 'fuel' && fuelType !== 'gnv' ? liters : undefined,
      pricePerLiter: selectedCategory === 'fuel' && fuelType !== 'gnv' ? pricePerLiter : undefined,
      gnvVolume: selectedCategory === 'fuel' && fuelType === 'gnv' ? gnvVolume : undefined,
      gnvPrice: selectedCategory === 'fuel' && fuelType === 'gnv' ? gnvPrice : undefined,
      odometer: selectedCategory === 'fuel' && odometer && odometer !== '0' ? odometer : undefined,
      isFullTank: selectedCategory === 'fuel' ? isFullTank : undefined,
      subCategory: subCategory || undefined,
      attachmentUrl,
      status: 'paid'
    };

    onConfirm(expenseData);
    
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);

    // Reset state but stay on screen
    setAmount('0,00');
    setNotes('');
    setLiters('0');
    setPricePerLiter('0,00');
    setGnvVolume('0');
    setGnvPrice('0,00');
    setOdometer('');
    setIsFullTank(false);
    setEditingId(null);
    setAttachmentUrl(undefined);
  };

  const handleDeleteExpense = (id: number) => {
    if (editingId === id) {
      setEditingId(null);
      setAmount('0,00');
      setNotes('');
      setLiters('0');
      setPricePerLiter('0,00');
      setGnvVolume('0');
      setGnvPrice('0,00');
    }
    onDeleteExpense(id);
  };

  const handleEditExpense = (id: number) => {
    const expense = expenses.find(e => e.id === id);
    if (expense) {
      setEditingId(id);
      setAmount(expense.amount);
      setSelectedCategory(expense.category);
      setNotes(expense.notes || '');
      setDate(expense.date);
      if (expense.fuelType) setFuelType(expense.fuelType);
      if (expense.subCategory) setSubCategory(expense.subCategory);
      if (expense.liters) setLiters(expense.liters);
      if (expense.pricePerLiter) setPricePerLiter(expense.pricePerLiter);
      if (expense.gnvVolume) setGnvVolume(expense.gnvVolume);
      if (expense.gnvPrice) setGnvPrice(expense.gnvPrice);
      if (expense.odometer) setOdometer(expense.odometer.toString());
      if (expense.isFullTank !== undefined) setIsFullTank(expense.isFullTank);
      setAttachmentUrl(expense.attachmentUrl);
    }
  };

  const getEffectiveFuelType = (type: string | undefined) => {
    if (!type) return 'other';
    if (type === 'gasolineCommon' || type === 'gasolineAdditive' || type === 'gasolinePremium') {
      return 'gasoline';
    }
    return type;
  };

  const calculateConsumption = (currentRecord: ExpenseRecord) => {
    if (!currentRecord.isFullTank || !currentRecord.odometer || currentRecord.category !== 'fuel') return null;

    const fuelExpenses = expenses
      .filter(e => e.category === 'fuel' && e.odometer)
      .sort((a, b) => parseLocaleNumber(b.odometer!, language) - parseLocaleNumber(a.odometer!, language));

    const currentIndex = fuelExpenses.findIndex(e => e.id === currentRecord.id);
    if (currentIndex === -1) return null;

    let previousFullTankIndex = -1;
    for (let i = currentIndex + 1; i < fuelExpenses.length; i++) {
      if (fuelExpenses[i].isFullTank) {
        previousFullTankIndex = i;
        break;
      }
    }

    if (previousFullTankIndex === -1) return null;

    const previousFullTank = fuelExpenses[previousFullTankIndex];
    const currentType = getEffectiveFuelType(currentRecord.fuelType);
    
    // Check if current and previous full tank types are compatible
    if (getEffectiveFuelType(previousFullTank.fuelType) !== currentType) return null;

    const currentOdo = parseLocaleNumber(currentRecord.odometer, language);
    const prevOdo = parseLocaleNumber(previousFullTank.odometer!, language);
    
    if (currentOdo <= prevOdo) return null;

    const distance = currentOdo - prevOdo;
    const intermediateRecords = fuelExpenses.slice(currentIndex, previousFullTankIndex);
    
    let totalLiters = 0;
    for (const r of intermediateRecords) {
      // Check if all intermediate refills are of the same compatible type
      if (getEffectiveFuelType(r.fuelType) !== currentType) return null;
      
      const l = parseLocaleNumber(r.liters || '0', language);
      const g = parseLocaleNumber(r.gnvVolume || '0', language);
      totalLiters += l + g;
    }

    if (totalLiters === 0) return null;
    return (distance / totalLiters).toFixed(2);
  };

  const currentRecord: ExpenseRecord = {
    id: editingId || Date.now(),
    amount,
    category: selectedCategory,
    date,
    notes,
    fuelType,
    liters,
    pricePerLiter,
    gnvVolume,
    gnvPrice,
    odometer,
    isFullTank,
    subCategory: subCategory,
    costType: categories.find(c => c.id === selectedCategory)?.costType || 'variable',
    attachmentUrl,
  };
  const currentConsumption = calculateConsumption(currentRecord);

  return (
    <div className="space-y-10 pb-20">
      <div className="flex items-center justify-between mb-10">
        <h1 className="text-4xl font-extrabold text-on-surface tracking-tight">
          {editingId ? t('editExpense') : t('registerExpense')}
        </h1>
        <div className="flex gap-2">
          {editingId && (
            <button 
              onClick={() => {
                setEditingId(null);
                setAmount('0,00');
                setNotes('');
                setLiters('0');
                setPricePerLiter('0,00');
              }}
              className="px-4 py-2 bg-surface-container-low text-on-surface rounded-xl font-bold text-sm hover:bg-surface-container-high transition-colors"
            >
              {t('cancelEdition')}
            </button>
          )}
          <button 
            onClick={() => onNavigate('dashboard')}
            className="px-4 py-2 bg-surface-container-high text-on-surface rounded-xl font-bold text-sm hover:bg-surface-container-highest transition-colors"
          >
            {t('back')}
          </button>
        </div>
      </div>

      {showSuccess && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="bg-error text-on-error px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 border border-white/20 text-center">
            <CheckCircle size={24} />
            <p className="font-black">{successMessage}</p>
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
          
          {/* Amount Section */}
          <section className="bg-surface-container-lowest rounded-xl p-6 shadow-sm">
            <label className="block text-xs font-bold text-on-surface-variant mb-3 uppercase tracking-wider">{t('expenseAmount')}</label>
              <div className={`flex items-baseline gap-2 border-b-2 transition-colors pb-1 ${activeField === 'amount' ? 'border-error' : 'border-outline-variant/30'}`}>
                <span className="text-2xl font-bold text-error">{t('currencySymbol')}</span>
                <input 
                  className="w-full bg-transparent border-none text-4xl font-black text-on-surface focus:ring-0 p-0 placeholder:text-surface-container-highest" 
                  placeholder={t('currencyPlaceholder')} 
                  type="text" 
                  inputMode="numeric"
                  value={amount}
                  onFocus={(e) => {
                    setActiveField('amount');
                    e.target.select();
                    e.target.placeholder = '';
                  }}
                  onBlur={(e) => {
                    if (amount === '0,00') e.target.placeholder = t('currencyPlaceholder');
                  }}
                  onClick={(e) => {
                    const target = e.target as HTMLInputElement;
                    target.setSelectionRange(target.value.length, target.value.length);
                  }}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '');
                    const formatted = formatCurrency(val);
                    setAmount(formatted);
                    if (selectedCategory === 'fuel') {
                      calculatePriceFromAmount(formatted, fuelType === 'gnv' ? gnvVolume : liters);
                    }
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
                        : 'bg-error/10 text-error hover:bg-error/20'
                    }`}
                    disabled={isProcessingVoice}
                    title={t('voiceCapture')}
                    onClick={startVoiceCapture}
                  >
                    {isProcessingVoice ? <Loader2 size={28} className="animate-spin" /> : <Mic size={28} />}
                  </button>
                )}
              </div>

              {/* Budget Progress Area - Re-positioned and highlighted */}
              <AnimatePresence mode="wait">
                {budgetLimit > 0 && (
                  <motion.div 
                    key={`budget-${selectedCategory}`}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="mt-6 p-4 bg-primary/5 rounded-2xl border-2 border-primary/10 shadow-inner space-y-4 overflow-hidden"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-xl text-primary">
                          <Target size={18} />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[10px] font-black uppercase tracking-[0.15em] text-on-surface-variant flex items-center gap-1 text-nowrap">
                            {t('budget')} . {currentCategoryObj ? t(currentCategoryObj.name) : ''} . {(() => {
                              const d = new Date(date + 'T12:00:00');
                              const monthLong = d.toLocaleDateString(language, { month: 'long' });
                              return monthLong.charAt(0).toUpperCase() + monthLong.slice(1);
                            })()} de {new Date(date + 'T12:00:00').getFullYear()}
                          </span>
                        </div>
                    </div>
                    <div className="text-right">
                      <span className={`text-xl font-black ${budgetProgress >= 100 ? 'text-error' : 'text-primary'}`}>
                        {budgetProgress.toFixed(0)}%
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="h-2.5 w-full bg-surface-container-high rounded-full overflow-hidden border border-outline-variant/10">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(budgetProgress, 100)}%` }}
                        className={`h-full rounded-full transition-all duration-1000 ${
                          budgetProgress >= 100 ? 'bg-error' : budgetProgress >= 80 ? 'bg-amber-500' : 'bg-primary'
                        }`}
                      />
                    </div>
                    <div className="flex justify-between items-center px-1">
                      <div className="flex gap-2 items-center">
                        <span className="text-[8px] font-black text-on-surface-variant/40 uppercase tracking-widest">{t('spent')}:</span>
                        <span className="text-sm font-black text-on-surface">{formatLocaleCurrency(categorySpending, language)}</span>
                      </div>
                      <div className="flex gap-2 items-center">
                        <span className="text-[8px] font-black text-on-surface-variant/40 uppercase tracking-widest">{t('budgetRemaining')}:</span>
                        <span className={`text-sm font-black ${budgetProgress >= 100 ? 'text-error' : 'text-primary'}`}>
                          {formatLocaleCurrency(remainingBudget, language)}
                        </span>
                      </div>
                    </div>
                  </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {isRecording && (
                <p className="mt-2 text-[10px] font-black text-secondary animate-pulse uppercase tracking-[0.2em] text-center">{t('recording')}</p>
              )}
              {isProcessingVoice && (
                <p className="mt-2 text-[10px] font-black text-neutral-400 animate-pulse uppercase tracking-widest">{t('processingVoice')}</p>
              )}
            </section>


          {/* Categories Section */}
          <section>
            <label className="block text-xs font-bold text-on-surface-variant mb-4 uppercase tracking-wider">{t('selectCategory')}</label>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
              {[...categories].sort((a, b) => {
                const priorityOrder = ['maintenance', 'fuel', 'food', 'washing', 'accessories', 'ipva'];
                const aIndex = priorityOrder.indexOf(a.id);
                const bIndex = priorityOrder.indexOf(b.id);
                
                if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
                if (aIndex !== -1) return -1;
                if (bIndex !== -1) return 1;

                if (a.costType === b.costType) return 0;
                return a.costType === 'fixed' ? -1 : 1;
              }).map((cat) => {
                const Icon = iconMap[cat.icon] || Info;
                const isSelected = selectedCategory === cat.id;

                return (
                  <button
                    key={cat.id}
                    onClick={() => {
                      setSelectedCategory(cat.id);
                      
                      // Set default subcategory to ensure one is always selected
                      if (cat.id === 'fuel') {
                        setFuelType(cat.subcategories?.[0] || FUEL_SUBCATEGORIES[0]);
                        setSubCategory('');
                      } else if (cat.id === 'food') {
                        setSubCategory(cat.subcategories?.[0] || FOOD_SUBCATEGORIES[0]);
                      } else if (cat.id === 'maintenance') {
                        setSubCategory(cat.subcategories?.[0] || MAINTENANCE_SUBCATEGORIES[0]);
                      } else if (cat.subcategories && cat.subcategories.length > 0) {
                        setSubCategory(cat.subcategories[0]);
                      } else {
                        setSubCategory('');
                      }

                      if (cat.costType === 'fixed') {
                        if (cat.defaultAmount !== undefined) {
                          setAmount(formatLocaleCurrency(cat.defaultAmount, language).replace(t('currencySymbol') + ' ', ''));
                        } else {
                          setAmount('0,00');
                        }
                      } else {
                        setAmount('0,00');
                      }
                    }}
                    className={`flex flex-col items-center justify-center p-3 border-2 rounded-xl transition-all group relative overflow-hidden ${
                      isSelected 
                        ? cat.costType === 'fixed'
                          ? 'bg-primary/10 dark:bg-primary/20 border-primary shadow-sm'
                          : 'bg-error/10 dark:bg-error/20 border-error shadow-sm'
                        : 'bg-surface-container-low border-transparent hover:bg-surface-container-high'
                    }`}
                  >
                    <Icon 
                      size={24} 
                      className={`mb-2 transition-colors ${
                        isSelected 
                          ? cat.costType === 'fixed' ? 'text-primary' : 'text-error' 
                          : 'text-on-surface-variant'
                      }`} 
                      fill={isSelected ? "currentColor" : "none"}
                    />
                    <div className="flex flex-col items-center gap-1">
                      <span className={`text-[10px] font-bold text-center leading-tight ${
                        isSelected 
                          ? cat.costType === 'fixed' ? 'text-primary' : 'text-error' 
                          : 'text-on-surface'
                      }`}>
                        {t(cat.name)}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Subcategories Section */}
            {(() => {
              const currentCat = categories.find(c => c.id === selectedCategory);
              
              let allSubs: string[] = [];
              if (selectedCategory === 'fuel') {
                allSubs = currentCat?.subcategories || FUEL_SUBCATEGORIES;
              } else if (selectedCategory === 'food') {
                allSubs = currentCat?.subcategories || FOOD_SUBCATEGORIES;
              } else if (selectedCategory === 'maintenance') {
                allSubs = currentCat?.subcategories || MAINTENANCE_SUBCATEGORIES;
              } else {
                allSubs = currentCat?.subcategories || [];
              }

              if (allSubs.length === 0) return null;

              return (
                <div className="mt-6 space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                  <div className="space-y-2">
                    <label className="block text-[10px] font-bold text-on-surface-variant uppercase tracking-wider opacity-70">
                      {selectedCategory === 'fuel' ? t('fuelType') : 
                       selectedCategory === 'food' ? t('foodType') : t('subCategory')}
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {allSubs.map((type) => {
                        const isSelected = (selectedCategory === 'fuel' && fuelType === type) || 
                                         (subCategory === type);
                        
                        return (
                          <button
                            key={type}
                            onClick={() => {
                              if (selectedCategory === 'fuel') setFuelType(type);
                              else setSubCategory(type);
                            }}
                            className={`px-3 py-1.5 rounded-full font-bold text-xs shadow-sm active:scale-95 transition-all ${
                              isSelected 
                                ? 'bg-error dark:bg-error/80 text-on-primary shadow-md' 
                                : 'bg-surface-container-high text-on-surface hover:bg-surface-container-highest border border-transparent'
                            }`}
                          >
                            {t(type)}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })()}
          </section>
        </div>

        {/* Right Column */}
        <div className="lg:col-span-5 space-y-4">
          {/* Fuel Details Card */}
          <div className={`border rounded-xl p-4 relative overflow-hidden transition-all duration-300 ${
            selectedCategory === 'fuel' 
              ? 'bg-surface-container-low border-error/30 opacity-100' 
              : 'bg-surface-container-low border-outline-variant/30 opacity-40 pointer-events-none grayscale'
          }`}>
            <div className={`absolute top-0 right-0 p-4 pointer-events-none opacity-10 ${selectedCategory === 'fuel' ? 'block' : 'hidden'}`}>
              <Fuel size={64} className={selectedCategory === 'fuel' ? "text-error" : "text-on-surface-variant"} />
            </div>
            <h3 className="font-bold mb-3 flex items-center gap-2 text-sm text-on-surface">
              <Info size={16} />
              {t('fuelDetails')}
            </h3>

            <div className="grid grid-cols-1 gap-3 mb-4 relative z-10">
              <div className="flex items-center justify-between bg-surface-container-lowest p-3 rounded-xl border border-outline-variant/30">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${isFullTank ? 'bg-error text-on-error' : 'bg-surface-container-highest text-on-surface-variant'}`}>
                    <Fuel size={16} />
                  </div>
                  <p className="text-xs font-bold text-on-surface">{t('fullTank')}</p>
                </div>
                <div className="flex items-center gap-1 bg-surface-container-highest p-1 rounded-lg">
                  <button
                    onClick={() => setIsFullTank(false)}
                    className={`px-3 py-1 text-[10px] font-black uppercase tracking-wider rounded-md transition-all ${
                      !isFullTank 
                        ? 'bg-error text-on-error shadow-sm' 
                        : 'text-on-surface-variant hover:bg-surface-container-low'
                    }`}
                  >
                    {t('no')}
                  </button>
                  <button
                    onClick={() => setIsFullTank(true)}
                    className={`px-3 py-1 text-[10px] font-black uppercase tracking-wider rounded-md transition-all ${
                      isFullTank 
                        ? 'bg-error text-on-error shadow-sm' 
                        : 'text-on-surface-variant hover:bg-surface-container-low'
                    }`}
                  >
                    {t('yes')}
                  </button>
                </div>
              </div>
            </div>
            
            {/* Liquid Fuel Details */}
            <div className={`grid grid-cols-2 gap-3 relative z-10 transition-all duration-300 ${
              fuelType !== 'gnv' ? 'opacity-100' : 'opacity-30 pointer-events-none grayscale'
            }`}>
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-on-surface">{t('liters')}</label>
                <input 
                  disabled={selectedCategory !== 'fuel' || fuelType === 'gnv'}
                  className={`w-full bg-surface-container-lowest border rounded-lg p-2 text-sm font-semibold focus:ring-2 focus:ring-primary/40 text-on-surface disabled:cursor-not-allowed transition-all placeholder:italic ${activeField === 'liters' ? 'border-error ring-1 ring-error/20' : 'border-primary/10'}`} 
                  placeholder="" 
                  type="text" 
                  inputMode="decimal"
                  value={liters}
                  onFocus={(e) => {
                    setActiveField('liters');
                    e.target.select();
                    e.target.placeholder = '';
                  }}
                  onBlur={(e) => {
                    setActiveField('amount');
                  }}
                  onChange={(e) => {
                    const val = e.target.value;
                    setLiters(val);
                    const amtNum = parseLocaleNumber(amount, language);
                    if (amtNum > 0) {
                      calculatePriceFromAmount(amount, val);
                    } else {
                      calculateFuelAmount(val, pricePerLiter);
                    }
                  }}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-on-surface">{t('pricePerLiter')}</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-bold opacity-50 text-on-surface">{t('currencySymbol')}</span>
                  <input 
                    disabled={selectedCategory !== 'fuel' || fuelType === 'GNV'}
                    className={`w-full bg-surface-container-lowest border rounded-lg p-2 pl-8 text-sm font-semibold focus:ring-2 focus:ring-primary/40 text-on-surface disabled:cursor-not-allowed transition-all ${activeField === 'pricePerLiter' ? 'border-error ring-1 ring-error/20' : 'border-primary/10'}`} 
                    placeholder="" 
                    type="text" 
                    inputMode="numeric"
                    value={pricePerLiter}
                    onFocus={(e) => {
                      setActiveField('pricePerLiter');
                      e.target.select();
                      e.target.placeholder = '';
                    }}
                    onBlur={() => {
                      setActiveField('amount');
                    }}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '');
                      const formatted = formatCurrency(val);
                      setPricePerLiter(formatted);
                      calculateFuelAmount(liters, formatted);
                    }}
                  />
                </div>
              </div>
            </div>

            {/* GNV Details */}
            <div className={`grid grid-cols-2 gap-3 relative z-10 mt-4 pt-4 border-t border-error/10 transition-all duration-300 ${
              fuelType === 'gnv' ? 'opacity-100' : 'opacity-30 pointer-events-none grayscale'
            }`}>
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-on-surface">{t('gnvVolume')}</label>
                <input 
                  disabled={selectedCategory !== 'fuel' || fuelType !== 'gnv'}
                  className={`w-full bg-surface-container-lowest border rounded-lg p-2 text-sm font-semibold focus:ring-2 focus:ring-primary/40 text-on-surface disabled:cursor-not-allowed transition-all ${activeField === 'gnvVolume' ? 'border-error ring-1 ring-error/20' : 'border-primary/10'}`} 
                  placeholder="" 
                  type="text" 
                  inputMode="decimal"
                  value={gnvVolume}
                  onFocus={(e) => {
                    setActiveField('gnvVolume');
                    e.target.select();
                    e.target.placeholder = '';
                  }}
                  onBlur={() => {
                    setActiveField('amount');
                  }}
                  onChange={(e) => {
                    const val = e.target.value;
                    setGnvVolume(val);
                    const amtNum = parseLocaleNumber(amount, language);
                    if (amtNum > 0) {
                      calculatePriceFromAmount(amount, val);
                    } else {
                      calculateFuelAmount(val, gnvPrice);
                    }
                  }}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-on-surface">{t('gnvPrice')}</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-bold opacity-50 text-on-surface">{t('currencySymbol')}</span>
                  <input 
                    disabled={selectedCategory !== 'fuel' || fuelType !== 'gnv'}
                    className={`w-full bg-surface-container-lowest border rounded-lg p-2 pl-8 text-sm font-semibold focus:ring-2 focus:ring-primary/40 text-on-surface disabled:cursor-not-allowed transition-all ${activeField === 'gnvPrice' ? 'border-error ring-1 ring-error/20' : 'border-primary/10'}`} 
                    placeholder="" 
                    type="text" 
                    inputMode="numeric"
                    value={gnvPrice}
                    onFocus={(e) => {
                      setActiveField('gnvPrice');
                      e.target.select();
                      e.target.placeholder = '';
                    }}
                    onBlur={() => {
                      setActiveField('amount');
                    }}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '');
                      const formatted = formatCurrency(val);
                      setGnvPrice(formatted);
                      calculateFuelAmount(gnvVolume, formatted);
                    }}
                  />
                </div>
              </div>
            </div>

            {selectedCategory === 'fuel' && (
              <div className="mt-3 pt-3 border-t border-error/20">
                <label className="text-[9px] font-bold uppercase tracking-widest opacity-70 mb-0.5 block text-on-surface">{t('fuelExpense')}</label>
                <div className="text-xl font-black text-on-surface">{t('currencySymbol')} {amount}</div>
              </div>
            )}

            {/* Odometer and Full Tank Section */}
            <div className="mt-4 pt-4 border-t border-error/20 space-y-4">
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-bold uppercase text-on-surface">{t('odometer')}</label>
                  {lastOdometer !== '0' && (
                    <span className="px-2 py-0.5 bg-primary/10 text-primary rounded-md text-[9px] font-black uppercase tracking-wider animate-pulse">
                      {t('lastOdometerLabel')} {lastOdometer}
                    </span>
                  )}
                </div>
                <input 
                  disabled={selectedCategory !== 'fuel'}
                  className={`w-full bg-surface-container-lowest border rounded-lg p-2 text-sm font-semibold focus:ring-2 focus:ring-primary/40 text-on-surface disabled:cursor-not-allowed transition-all ${activeField === 'odometer' ? 'border-error ring-1 ring-error/20' : 'border-primary/10'}`} 
                  placeholder="" 
                  type="text" 
                  inputMode="numeric"
                  value={odometer}
                  onFocus={(e) => {
                    setActiveField('odometer');
                    e.target.select();
                    e.target.placeholder = '';
                  }}
                  onBlur={(e) => {
                    if (odometer === '') e.target.placeholder = '';
                  }}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '');
                    setOdometer(val);
                  }}
                />
                <div className="flex items-center gap-1.5 mt-1 text-on-surface-variant/60">
                  <Info size={12} className="text-error" />
                  <span className="text-[10px] font-medium leading-none">{t('odometerInfo')}</span>
                </div>
              </div>

              {currentConsumption && (
                <div className="bg-error/5 border border-error/20 rounded-xl p-3 flex items-center justify-between animate-in fade-in zoom-in duration-300">
                  <div className="flex items-center gap-2 text-error">
                    <Milestone size={18} />
                    <span className="text-xs font-black uppercase tracking-widest">{t('consumption')}</span>
                  </div>
                  <div className="text-lg font-black text-error">
                    {currentConsumption} {fuelType === 'gnv' ? t('kmPerCubicMeter') : t('kmPerLiter')}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Additional Fields */}
          <div className="space-y-6 bg-surface-container-lowest p-6 rounded-xl shadow-sm border border-outline-variant/10">
            <div className="space-y-2">
              <label className="block text-[10px] font-black uppercase text-on-surface-variant tracking-[0.2em]">
                {t('expenseDate')}
              </label>
              <DatePicker 
                date={new Date(date + 'T12:00:00')}
                setDate={(d) => d && setDate(d.toISOString().split('T')[0])}
              />
            </div>

            <div className="space-y-4 pt-2 border-t border-outline-variant/10">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-on-surface-variant tracking-wider">{t('observation')}</label>
                <textarea 
                  className="w-full bg-surface-container-low border-none rounded-xl p-3 text-sm font-bold focus:ring-2 focus:ring-primary/40 resize-none placeholder:font-medium" 
                  placeholder={t('expenseNotesPlaceholder')} 
                  rows={2}
                  value={notes}
                  onFocus={(e) => e.target.placeholder = ''}
                  onBlur={(e) => e.target.placeholder = t('expenseNotesPlaceholder')}
                  onChange={(e) => setNotes(e.target.value)}
                ></textarea>
              </div>

              {/* Attachment Section */}
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-on-surface-variant tracking-wider">{t('attachment')}</label>
                <div className="flex items-center gap-4">
                  {attachmentUrl ? (
                    <div className="relative w-20 h-20 rounded-xl overflow-hidden border-2 border-outline-variant/30 group shadow-sm">
                      <img src={attachmentUrl} alt="Attachment" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      <button 
                        onClick={() => setAttachmentUrl(undefined)}
                        className="absolute top-1 right-1 bg-error text-on-error p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-md"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ) : (
                    <label className="w-20 h-20 rounded-xl border-2 border-dashed border-outline-variant/30 flex flex-col items-center justify-center gap-1 cursor-pointer hover:bg-surface-container-low hover:border-primary/40 transition-all text-on-surface-variant group shadow-sm">
                      <Camera size={20} className="group-hover:text-primary transition-colors" />
                      <span className="text-[9px] font-black uppercase tracking-tighter">{t('add')}</span>
                      <input 
                        type="file" 
                        accept="image/*" 
                        className="hidden" 
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onloadend = () => setAttachmentUrl(reader.result as string);
                            reader.readAsDataURL(file);
                          }
                        }}
                      />
                    </label>
                  )}
                  <div className="flex-1">
                    <p className="text-[10px] text-on-surface-variant font-bold leading-tight uppercase opacity-60">
                      {attachmentUrl ? t('attachmentAdded') : t('addAttachmentDesc')}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Confirm Action */}
          <div className="pt-2">
            <button 
              onClick={handleConfirmExpense}
              className="w-full h-14 rounded-xl font-black text-lg flex items-center justify-center gap-3 shadow-lg active:scale-[0.97] transition-all hover:brightness-105 bg-error dark:bg-error/90 text-on-primary shadow-error/30"
            >
              {editingId 
                ? t('saveChanges') 
                : t('confirmExpense')
              }
            </button>
          </div>

          {/* Recent History Section */}
          <div className="bg-surface-container-low p-4 rounded-2xl border border-outline-variant/30 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black text-on-surface-variant uppercase tracking-widest">{t('recentHistory')}</h3>
              <span className="bg-error/10 text-error text-[10px] font-black px-2 py-0.5 rounded-full">
                {expenses.filter(e => e.costType !== 'fixed').length} {t('records')}
              </span>
            </div>

            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1 custom-scrollbar">
              {expenses
                .sort((a, b) => {
                  const dateA = new Date(a.date + 'T12:00:00').getTime();
                  const dateB = new Date(b.date + 'T12:00:00').getTime();
                  if (dateA !== dateB) return dateB - dateA;
                  return b.id - a.id;
                })
                .map((item) => {
                const category = categories.find(c => c.id === item.category);
                const Icon = (category && iconMap[category.icon]) ? iconMap[category.icon] : FileText;
                const subcategory = item.subCategory || item.fuelType || item.maintenanceType;
                
                return (
                  <div key={item.id} className="bg-surface-container-lowest p-3 rounded-xl border border-outline-variant/20 shadow-sm hover:border-error/30 transition-all group">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-surface-container-highest rounded-full flex items-center justify-center text-error shrink-0">
                          <Icon size={20} />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-on-surface-variant uppercase">
                            {new Date(item.date + 'T12:00:00').toLocaleDateString(language, { day: '2-digit', month: 'short', year: 'numeric' })}
                          </p>
                          <p className="font-black text-on-surface text-base">{t('currencySymbol')} {item.amount}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button 
                          onClick={() => handleEditExpense(item.id)}
                          className="p-1.5 text-primary hover:bg-primary/10 rounded-lg transition-colors"
                          title={t('edit')}
                        >
                          <Edit2 size={16} />
                        </button>
                        <button 
                          onClick={() => handleDeleteExpense(item.id)}
                          className="p-1.5 text-error hover:bg-error/10 rounded-lg transition-colors"
                          title={t('delete')}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-bold text-on-surface-variant">
                      <span className="px-1.5 py-0.5 bg-error/5 text-error rounded uppercase">
                        {category?.isDefault ? t(item.category) : category?.name || item.category}
                      </span>
                      {subcategory && <span className="italic text-on-surface">{t(subcategory)}</span>}
                      {item.category === 'fuel' && (
                        <>
                          {item.isFullTank && (
                            <span className="flex items-center gap-1 text-error">
                              <CheckCircle size={12} /> {t('fullTank')}
                            </span>
                          )}
                          {item.odometer && (
                            <span className="flex items-center gap-1">
                              <Milestone size={12} /> {item.odometer} KM
                            </span>
                          )}
                          {calculateConsumption(item) && (
                            <span className="flex items-center gap-1 text-primary font-black">
                              <Fuel size={12} /> {calculateConsumption(item)} {item.fuelType === 'gnv' ? t('kmPerCubicMeter') : t('kmPerLiter')}
                            </span>
                          )}
                          {item.fuelType === 'gnv' ? (
                            <>
                              {(item.gnvVolume || item.liters) && (
                                <span className="flex items-center gap-1">
                                  <Fuel size={12} /> {item.gnvVolume || item.liters}{t('cubicMeters')}
                                </span>
                              )}
                              {(item.gnvPrice || item.pricePerLiter) && (
                                <span className="flex items-center gap-1">
                                  {t('currencySymbol')} {item.gnvPrice || item.pricePerLiter}{t('perCubicMeter')}
                                </span>
                              )}
                            </>
                          ) : (
                            <>
                              {item.liters && (
                                <span className="flex items-center gap-1">
                                  <Fuel size={12} /> {item.liters}{t('liters')}
                                </span>
                              )}
                              {item.pricePerLiter && (
                                <span className="flex items-center gap-1">
                                  {t('currencySymbol')} {item.pricePerLiter}{t('perLiter')}
                                </span>
                              )}
                            </>
                          )}
                        </>
                      )}
                    </div>

                    {item.notes && (
                      <p className="text-xs text-on-surface font-black italic mt-1 line-clamp-1">
                        "{item.notes}"
                      </p>
                    )}
                    {item.attachmentUrl && (
                      <div className="mt-2 flex items-center gap-2">
                        <div className="w-12 h-12 rounded-lg overflow-hidden border border-outline-variant/20">
                          <img src={item.attachmentUrl} alt="Receipt" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        </div>
                        <span className="text-[10px] font-bold text-on-surface-variant uppercase flex items-center gap-1">
                          <Paperclip size={12} /> {t('attachment')}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
              {expenses.length === 0 && (
                <div className="text-center py-8 opacity-40">
                  <p className="text-[10px] font-bold uppercase tracking-tighter">{t('noHistory')}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
