import React, { useState } from 'react';
import { 
  Plus, 
  Trash2, 
  Edit2, 
  Check, 
  X,
  AlertCircle,
  Calendar,
  DollarSign,
  ArrowUpCircle,
  ArrowDownCircle,
  Repeat,
  Car,
  ChevronDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ExpenseRecord, IncomeRecord, Screen, Category, UserProfile, TransactionStatus } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import { formatLocaleCurrency, formatMaskedCurrency, parseLocaleNumber, handleCurrencyKeyDown, handleCurrencySelection } from '../lib/currency';
import { getRawNextOccurrenceDate } from '../lib/utils';

interface FixedFinanceScreenProps {
  expenses: ExpenseRecord[];
  incomes: IncomeRecord[];
  onConfirmExpense: (record: ExpenseRecord) => void;
  onConfirmIncome: (record: IncomeRecord) => void;
  onDeleteExpense: (id: number) => void;
  onDeleteIncome: (id: number) => void;
  categories: Category[];
  userProfile: UserProfile;
  activeVehicleId?: string | null;
  onActiveVehicleChange?: (id: string) => void;
}

export function FixedFinanceScreen({ 
  expenses, 
  incomes, 
  onConfirmExpense, 
  onConfirmIncome,
  onDeleteExpense,
  onDeleteIncome,
  categories,
  userProfile,
  activeVehicleId,
  onActiveVehicleChange
}: FixedFinanceScreenProps) {
  const { t, language } = useLanguage();
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [type, setType] = useState<'income' | 'expense'>('expense');
  
  const fixedCategories = categories.filter(c => c.costType === 'fixed');
  
  const fixedExpenses = expenses.filter(e => e.costType === 'fixed' && e.isFixedConfig === true && (!activeVehicleId || e.vehicleId === activeVehicleId));
  const fixedIncomes = incomes.filter(i => i.type === 'fixed' && i.isFixedConfig === true && (!activeVehicleId || i.vehicleId === activeVehicleId));

  const getCategoryLabel = (catId: string) => {
    if (!catId) return '';
    const cat = categories.find(c => c.id === catId);
    if (cat) return t(cat.name);
    return t(catId) || catId;
  };

  const getNotesLabel = (notes: string, catId: string) => {
    if (notes) return t(notes) || notes;
    return getCategoryLabel(catId);
  };

  const getNextOccurrenceDate = (dateStr: string, recurrence: 'weekly' | 'biweekly' | 'monthly' | 'yearly') => {
    if (!dateStr) return '';
    try {
      const initialDate = new Date(dateStr + 'T12:00:00');
      if (isNaN(initialDate.getTime())) return dateStr;

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // If the initial date is in the future, that is the next occurrence
      if (initialDate >= today) {
        return initialDate.toLocaleDateString(language === 'pt-BR' ? 'pt-BR' : 'en-US', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric'
        });
      }

      let currentStr = dateStr;
      let count = 0;
      let nextDateObj = new Date(currentStr + 'T12:00:00');
      
      while (nextDateObj < today && count < 100) {
        count++;
        currentStr = getRawNextOccurrenceDate(currentStr, recurrence);
        nextDateObj = new Date(currentStr + 'T12:00:00');
      }

      return nextDateObj.toLocaleDateString(language === 'pt-BR' ? 'pt-BR' : 'en-US', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch (e) {
      return dateStr;
    }
  };

  const handleEditExpense = (expense: ExpenseRecord) => {
    setEditingId(expense.id);
    setType('expense');
    setFormData({
      amount: expense.amount,
      category: expense.category,
      date: expense.date,
      notes: expense.notes || '',
      recurrence: expense.recurrence || 'monthly'
    });
  };

  const handleEditIncome = (income: IncomeRecord) => {
    setEditingId(income.id);
    setType('income');
    const categoryName = income.items[0]?.platform || income.notes || '';
    setFormData({
      amount: income.totalAmount.toLocaleString(language, { minimumFractionDigits: 2 }),
      category: categoryName,
      date: income.date,
      notes: income.notes || '',
      recurrence: income.recurrence || 'monthly'
    });
  };

  const [formData, setFormData] = useState({
    amount: '0,00',
    category: '',
    date: new Date().toISOString().split('T')[0],
    notes: '',
    recurrence: 'monthly' as 'weekly' | 'biweekly' | 'monthly' | 'yearly'
  });

  const [showSuccess, setShowSuccess] = useState(false);
  const [errorAlert, setErrorAlert] = useState<string | null>(null);

  const handleSubmit = () => {
    const amtNum = parseLocaleNumber(formData.amount, language);
    if (amtNum <= 0) {
      setErrorAlert(t('invalidAmount') || 'Valor inválido');
      return;
    }
    if (!formData.category || !formData.category.trim()) {
      setErrorAlert(t('fieldsRequired'));
      return;
    }

    const trimmedCat = formData.category.trim();

    if (type === 'expense') {
      const record: ExpenseRecord = {
        id: editingId || Date.now(),
        amount: formData.amount,
        category: trimmedCat,
        date: formData.date,
        notes: trimmedCat,
        costType: 'fixed',
        isFixedConfig: true,
        status: 'paid',
        recurrence: formData.recurrence,
        vehicleId: activeVehicleId || undefined
      };
      onConfirmExpense(record);
    } else {
      const record: IncomeRecord = {
        id: editingId || Date.now(),
        date: formData.date,
        items: [{
          id: Date.now(),
          platform: trimmedCat,
          amount: formData.amount,
          trips: '0'
        }],
        totalAmount: amtNum,
        totalTrips: 0,
        notes: trimmedCat,
        type: 'fixed',
        isFixedConfig: true,
        hoursWorked: '0',
        kmDriven: 0,
        status: 'paid',
        recurrence: formData.recurrence,
        vehicleId: activeVehicleId || undefined
      };
      onConfirmIncome(record);
    }

    setIsAdding(false);
    setEditingId(null);
    setFormData({
      amount: '0,00',
      category: '',
      date: new Date().toISOString().split('T')[0],
      notes: '',
      recurrence: 'monthly'
    });
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="font-headline font-bold text-2xl tracking-tight text-on-surface">{t('fixedFinance')}</h2>
          <p className="text-sm text-on-surface-variant opacity-70">{t('fixedFinanceSubtitle')}</p>
        </div>
        
        {/* Replicated Symmetrical Active Vehicle Option Select */}
        {userProfile?.vehicles && userProfile.vehicles.length > 0 && onActiveVehicleChange && (
          <div className="bg-surface-container-low px-4 py-2 rounded-2xl border border-surface-container-high flex items-center gap-2 max-w-[200px] shadow-sm shrink-0">
            <Car size={14} className="text-primary shrink-0" />
            <div className="relative w-full overflow-hidden text-left">
              <select
                value={activeVehicleId || ''}
                onChange={(e) => onActiveVehicleChange(e.target.value)}
                className="bg-transparent text-xs font-black text-on-surface outline-none appearance-none cursor-pointer pr-6 truncate w-full"
              >
                {userProfile.vehicles.map(v => (
                  <option key={v.id} value={v.id}>
                    {v.brand} {v.model}
                  </option>
                ))}
              </select>
              <ChevronDown size={12} className="absolute right-0 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none opacity-50" />
            </div>
          </div>
        )}
      </div>

      <AnimatePresence>
        {showSuccess && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-secondary/10 border border-secondary/20 p-4 rounded-2xl flex items-center gap-3 text-secondary font-bold"
          >
            <Check size={20} />
            {t('savedSuccessfully')}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Visual Explanation Suggestions Card centered on the screen */}
      <div className="max-w-2xl mx-auto w-full bg-primary/5 dark:bg-primary/10 border border-primary/15 rounded-3xl p-5 flex gap-4 items-start animate-in fade-in duration-300 shadow-sm">
        <AlertCircle size={22} className="text-primary shrink-0 mt-0.5" />
        <div className="space-y-1 leading-relaxed">
          <p className="font-extrabold text-primary uppercase tracking-wider text-[10px]">{t('categorySuggestionsTitle')}</p>
          <p className="text-on-surface-variant opacity-95 text-[12px] font-medium leading-normal">
            {t('categorySuggestionsDesc')}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Form and Summary */}
        <div className="lg:col-span-4 space-y-6">
          {userProfile.vehicles && userProfile.vehicles.length > 0 ? (
            <div className="bg-surface-container-lowest rounded-3xl p-6 shadow-sm border border-surface-container-high">
              <h3 className="text-lg font-black font-headline text-on-surface mb-6 flex items-center gap-2">
                <Plus className="text-primary" size={20} />
                {t('addFixedItem')}
              </h3>

              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest px-1">{t('entryType')}</label>
                  <select 
                    className="w-full bg-surface-container-low p-4 rounded-2xl text-sm font-bold border border-outline-variant/10 outline-none focus:ring-4 focus:ring-primary/10 appearance-none cursor-pointer"
                    value={type}
                    onChange={e => setType(e.target.value as 'income' | 'expense')}
                  >
                    <option value="expense">{t('expense')}</option>
                    <option value="income">{t('income')}</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest px-1">{t('amount')}</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold opacity-50">{t('currencySymbol')}</span>
                    <input 
                      className="w-full bg-surface-container-low p-4 pl-10 rounded-2xl text-lg font-black border border-outline-variant/10 outline-none focus:ring-4 focus:ring-primary/10 transition-all"
                      value={formData.amount}
                      onChange={e => setFormData({...formData, amount: formatMaskedCurrency(e.target.value, language)})}
                      onKeyDown={e => handleCurrencyKeyDown(e, formData.amount, (val) => setFormData({...formData, amount: val}), language)}
                      onFocus={handleCurrencySelection}
                      onClick={handleCurrencySelection}
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest px-1">{t('category')}</label>
                  <input 
                    type="text"
                    placeholder={t('categoryPlaceholder') || 'Ex: Aluguel Veicular, Seguro, etc.'}
                    className="w-full bg-surface-container-low p-4 rounded-2xl text-sm font-bold border border-outline-variant/10 outline-none focus:ring-4 focus:ring-primary/10 transition-all font-sans"
                    value={formData.category}
                    onChange={e => setFormData({...formData, category: e.target.value})}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest px-1">{t('dueOrReceiptDate')}</label>
                  <input 
                    type="date"
                    className="w-full bg-surface-container-low p-4 rounded-2xl text-sm font-bold border border-outline-variant/10 outline-none focus:ring-4 focus:ring-primary/10 appearance-none cursor-pointer"
                    value={formData.date}
                    onChange={e => setFormData({...formData, date: e.target.value})}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest px-1">{t('recurrence')}</label>
                  <select 
                    className="w-full bg-surface-container-low p-4 rounded-2xl text-sm font-bold border border-outline-variant/10 outline-none focus:ring-4 focus:ring-primary/10 appearance-none cursor-pointer"
                    value={formData.recurrence}
                    onChange={e => setFormData({...formData, recurrence: e.target.value as any})}
                  >
                    <option value="weekly">{t('weekly')}</option>
                    <option value="biweekly">{t('biweekly')}</option>
                    <option value="monthly">{t('monthly')}</option>
                    <option value="yearly">{t('yearly')}</option>
                  </select>
                </div>

                <div className="pt-4">
                  <button 
                    onClick={handleSubmit}
                    className={`w-full py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-lg transition-all active:scale-95 ${type === 'expense' ? 'bg-error text-white shadow-error/20' : 'bg-secondary text-on-secondary shadow-secondary/20'}`}
                  >
                    {editingId ? t('saveChanges') : t('confirm')}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-surface-container-lowest rounded-3xl p-6 py-8 text-center shadow-sm border border-surface-container-high space-y-4">
              <div className="w-12 h-12 bg-amber-500/10 text-amber-500 rounded-full flex items-center justify-center mx-auto">
                <AlertCircle size={24} />
              </div>
              <h3 className="text-base font-black font-headline text-on-surface">
                {language === 'pt-BR' ? 'Veículo Necessário' : 'Vehicle Required'}
              </h3>
              <p className="text-xs text-on-surface-variant font-medium leading-relaxed">
                {language === 'pt-BR' 
                  ? 'Você precisa cadastrar pelo menos um veículo na aba "Meus Veículos" antes de definir gastos ou ganhos fixos.' 
                  : 'You must register at least one vehicle in the "My Vehicles" tab before configuring fixed financing.'}
              </p>
            </div>
          )}
        </div>

        {/* List */}
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-surface-container-lowest rounded-3xl p-6 shadow-sm border border-surface-container-high">
            <div className="space-y-6">
              {fixedExpenses.length === 0 && fixedIncomes.length === 0 ? (
                <div className="py-12 text-center">
                  <div className="w-16 h-16 bg-surface-container-low rounded-full flex items-center justify-center mx-auto mb-4 opacity-50 font-sans">
                    <Repeat size={32} className="text-on-surface-variant" />
                  </div>
                  <p className="text-sm font-bold text-on-surface-variant opacity-40 uppercase tracking-widest">{t('noFixedItems')}</p>
                </div>
              ) : (
                <div className="space-y-8">
                  {/* SEÇÃO GANHOS FIXOS */}
                  {fixedIncomes.length > 0 && (
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 pb-2 border-b border-outline-variant/10">
                        <ArrowUpCircle size={18} className="text-secondary" />
                        <h4 className="text-xs font-black text-secondary uppercase tracking-widest">
                          {t('fixedIncomesTitle') || 'Ganhos Fixos'}
                        </h4>
                        <span className="ml-auto text-[10px] font-black bg-secondary/10 text-secondary px-2.5 py-0.5 rounded-full">
                          {fixedIncomes.length}
                        </span>
                      </div>
                      <div className="grid gap-3">
                        {fixedIncomes.map(income => (
                          <div key={income.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-secondary/5 rounded-2xl border border-secondary/10 gap-4 group animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <div className="flex items-start gap-4">
                              <div className="w-12 h-12 bg-secondary text-on-secondary rounded-2xl flex items-center justify-center shrink-0 shadow-lg shadow-secondary/20">
                                <ArrowUpCircle size={24} />
                              </div>
                              <div className="flex flex-col">
                                <h4 className="font-black text-on-surface leading-snug">{income.items[0]?.platform || income.notes || t('fixedIncome')}</h4>
                                
                                {/* Next Occurrence Date Badge */}
                                <span className="text-[10px] inline-flex items-center gap-1 font-bold text-on-surface-variant bg-surface-container/40 p-1 px-2.5 rounded-full mt-2 w-fit border border-outline-variant/5">
                                  <Calendar size={11} className="text-secondary" />
                                  {t('nextDate') || 'Próxima Data'}: {getNextOccurrenceDate(income.date, income.recurrence || 'monthly')}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center justify-between sm:justify-end gap-6 border-t sm:border-t-0 pt-3 sm:pt-0 border-outline-variant/10">
                              <div className="text-left sm:text-right">
                                <p className="text-lg font-black text-secondary">{t('currencySymbol')} {income.totalAmount.toLocaleString(language, { minimumFractionDigits: 2 })}</p>
                                <p className="text-[10px] font-bold text-on-surface-variant uppercase opacity-50">{t(income.recurrence || 'monthly')}</p>
                              </div>
                              <div className="flex items-center gap-2">
                                <button 
                                  onClick={() => handleEditIncome(income)}
                                  className="p-2 text-on-surface-variant hover:text-secondary hover:bg-secondary/10 rounded-xl transition-all"
                                  title={t('edit') || 'Editar'}
                                >
                                  <Edit2 size={18} />
                                </button>
                                <button 
                                  onClick={() => onDeleteIncome(income.id)}
                                  className="p-2 text-on-surface-variant hover:text-error hover:bg-error/10 rounded-xl transition-all"
                                  title={t('delete') || 'Excluir'}
                                >
                                  <Trash2 size={18} />
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* SEÇÃO GASTOS FIXOS */}
                  {fixedExpenses.length > 0 && (
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 pb-2 border-b border-outline-variant/10">
                        <ArrowDownCircle size={18} className="text-error" />
                        <h4 className="text-xs font-black text-error uppercase tracking-widest">
                          {t('fixedExpensesTitle') || 'Gastos Fixos'}
                        </h4>
                        <span className="ml-auto text-[10px] font-black bg-error/10 text-error px-2.5 py-0.5 rounded-full">
                          {fixedExpenses.length}
                        </span>
                      </div>
                      <div className="grid gap-3">
                        {fixedExpenses.map(expense => (
                          <div key={expense.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-error/5 rounded-2xl border border-error/10 gap-4 group animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <div className="flex items-start gap-4">
                              <div className="w-12 h-12 bg-error text-white rounded-2xl flex items-center justify-center shrink-0 shadow-lg shadow-error/20">
                                <ArrowDownCircle size={24} />
                              </div>
                              <div className="flex flex-col">
                                <h4 className="font-black text-on-surface leading-snug">{expense.category || t('expense')}</h4>
                                
                                {/* Next Occurrence Date Badge */}
                                <span className="text-[10px] inline-flex items-center gap-1 font-bold text-on-surface-variant bg-surface-container/40 p-1 px-2.5 rounded-full mt-2 w-fit border border-outline-variant/5">
                                  <Calendar size={11} className="text-error" />
                                  {t('nextDate') || 'Próxima Data'}: {getNextOccurrenceDate(expense.date, expense.recurrence || 'monthly')}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center justify-between sm:justify-end gap-6 border-t sm:border-t-0 pt-3 sm:pt-0 border-outline-variant/10">
                              <div className="text-left sm:text-right">
                                <p className="text-lg font-black text-error">{t('currencySymbol')} {expense.amount}</p>
                                <p className="text-[10px] font-bold text-on-surface-variant uppercase opacity-50">{t(expense.recurrence || 'monthly')}</p>
                              </div>
                              <div className="flex items-center gap-2">
                                <button 
                                  onClick={() => handleEditExpense(expense)}
                                  className="p-2 text-on-surface-variant hover:text-primary hover:bg-primary/10 rounded-xl transition-all"
                                  title={t('edit') || 'Editar'}
                                >
                                  <Edit2 size={18} />
                                </button>
                                <button 
                                  onClick={() => onDeleteExpense(expense.id)}
                                  className="p-2 text-on-surface-variant hover:text-error hover:bg-error/10 rounded-xl transition-all"
                                  title={t('delete') || 'Excluir'}
                                >
                                  <Trash2 size={18} />
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
