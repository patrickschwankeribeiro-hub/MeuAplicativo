import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Eye, 
  EyeOff, 
  Plus, 
  TrendingUp, 
  TrendingDown, 
  Timer, 
  Route, 
  CarTaxiFront,
  CreditCard,
  Zap,
  Clock,
  ShoppingCart,
  Fuel,
  Calendar,
  CalendarDays,
  LayoutGrid,
  X,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Bell,
  AlertCircle,
  CheckCircle2,
  RotateCcw,
  Edit2,
  Image as ImageIcon,
  Info
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Cell,
  LabelList
} from 'recharts';
import { IncomeRecord, ExpenseRecord, Screen, Goal, UserProfile } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import { parseLocaleNumber, formatLocaleCurrency } from '../lib/currency';

interface DashboardScreenProps {
  incomes: IncomeRecord[];
  expenses: ExpenseRecord[];
  onNavigate: (screen: Screen, data?: any) => void;
  goal: Goal;
  userProfile: UserProfile;
  isPrivacyActive: boolean;
  onPrivacyToggle: () => void;
  onConfirmIncome: (record: IncomeRecord) => void;
  onConfirmExpense: (record: ExpenseRecord) => void;
  onDeleteExpense: (id: string | number) => void;
  onUpdateProfile: (profile: UserProfile) => void;
  filter: 'day' | 'week' | 'month' | 'year';
  onFilterChange: (filter: 'day' | 'week' | 'month' | 'year') => void;
  selectedDate: string;
  onSelectedDateChange: (date: string) => void;
  selectedYear: number;
  onSelectedYearChange: (year: number) => void;
  selectedMonth: number;
  onSelectedMonthChange: (month: number) => void;
  selectedWeek: number;
  onSelectedWeekChange: (week: number) => void;
  onSaveGoal?: (goal: Goal) => void;
  periodLabel?: string;
}

export function DashboardScreen({ 
  incomes, 
  expenses, 
  onNavigate, 
  goal, 
  userProfile,
  isPrivacyActive,
  onPrivacyToggle,
  onConfirmIncome,
  onConfirmExpense,
  onDeleteExpense,
  onUpdateProfile,
  filter,
  onFilterChange,
  selectedDate,
  onSelectedDateChange,
  selectedYear,
  onSelectedYearChange,
  selectedMonth,
  onSelectedMonthChange,
  selectedWeek,
  onSelectedWeekChange,
  onSaveGoal,
  periodLabel
}: DashboardScreenProps) {
  const { t, language } = useLanguage();

  const getLocalDateString = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [isSelectorOpen, setIsSelectorOpen] = useState(false);

  const getDaysInMonth = (year: number, month: number) => {
    const date = new Date(year, month, 1);
    const days = [];
    while (date.getMonth() === month) {
      days.push(new Date(date));
      date.setDate(date.getDate() + 1);
    }
    return days;
  };

  // Helper to parse currency string to number
  const parseCurrency = (val: string) => {
    return parseLocaleNumber(val, language);
  };

  // Helper to parse time string "HH:MM" to decimal hours
  const parseTime = (timeStr: string) => {
    if (!timeStr) return 0;
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours + (minutes / 60);
  };

  const getWeekNumber = (date: Date) => {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  };

  const getMonthFromWeek = (year: number, week: number) => {
    const jan4 = new Date(year, 0, 4);
    const dayOfWeek = jan4.getDay() || 7;
    const firstThursday = new Date(year, 0, 4 + (4 - dayOfWeek));
    const thursday = new Date(firstThursday.getTime());
    thursday.setDate(firstThursday.getDate() + (week - 1) * 7);
    return thursday.getMonth();
  };

  const calculateStatsFromData = (incomesRecs: IncomeRecord[], expensesRecs: ExpenseRecord[]) => {
    const gross = incomesRecs.reduce((acc, curr) => acc + curr.totalAmount, 0);
    const exp = expensesRecs.reduce((acc, curr) => acc + parseCurrency(curr.amount), 0);
    const profit = Math.max(0, gross - exp);
    const trips = incomesRecs.reduce((acc, curr) => acc + curr.totalTrips, 0);
    const km = incomesRecs.reduce((acc, curr) => acc + (curr.kmDriven || 0), 0);
    const worked = new Set(incomesRecs.map(i => i.date)).size;
    const hoursDecimal = incomesRecs.reduce((acc, curr) => acc + parseTime(curr.hoursWorked), 0);

    return {
      gross,
      exp,
      profit,
      trips,
      km,
      worked,
      hoursDecimal,
      profitPerTrip: trips > 0 ? profit / trips : 0,
      profitPerHour: hoursDecimal > 0 ? profit / hoursDecimal : 0,
      profitPerKm: km > 0 ? profit / km : 0,
      earningPerTrip: trips > 0 ? gross / trips : 0,
      earningPerHour: hoursDecimal > 0 ? gross / hoursDecimal : 0,
      earningPerKm: km > 0 ? gross / km : 0,
      expensePerTrip: trips > 0 ? exp / trips : 0,
      expensePerHour: hoursDecimal > 0 ? exp / hoursDecimal : 0,
      expensePerKm: km > 0 ? exp / km : 0,
    };
  };

  const getFilteredData = (f: 'day' | 'week' | 'month' | 'year', date: string, year: number, month: number, week: number) => {
    const filteredIncomes = incomes.filter(item => {
      const [iYear, iMonth, iDay] = item.date.split('-').map(Number);
      const itemDate = new Date(iYear, iMonth - 1, iDay, 12, 0, 0);
      
      const now = new Date();
      const todayStr = getLocalDateString(now);
      
      // Exclude future payments
      if (item.date > todayStr) return false;
      
      if (f === 'day') {
        const [tYear, tMonth, tDay] = date.split('-').map(Number);
        return iYear === tYear && iMonth === tMonth && iDay === tDay;
      }
      
      if (f === 'week') {
        return getWeekNumber(itemDate) === week && iYear === year;
      }
      
      if (f === 'month') {
        return (iMonth - 1) === month && iYear === year;
      }
      
      if (f === 'year') {
        return iYear === year;
      }
      
      return true;
    });

    const filteredExpenses = expenses.filter(item => {
      const [iYear, iMonth, iDay] = item.date.split('-').map(Number);
      const itemDate = new Date(iYear, iMonth - 1, iDay, 12, 0, 0);
      
      const now = new Date();
      const todayStr = getLocalDateString(now);
      
      // Exclude future payments
      if (item.date > todayStr) return false;
      
      if (f === 'day') {
        const [tYear, tMonth, tDay] = date.split('-').map(Number);
        return iYear === tYear && iMonth === tMonth && iDay === tDay;
      }
      
      if (f === 'week') {
        return getWeekNumber(itemDate) === week && iYear === year;
      }
      
      if (f === 'month') {
        return (iMonth - 1) === month && iYear === year;
      }
      
      if (f === 'year') {
        return iYear === year;
      }
      
      return true;
    });

    return { filteredIncomes, filteredExpenses };
  };

  const { filteredIncomes, filteredExpenses } = getFilteredData(filter, selectedDate, selectedYear, selectedMonth, selectedWeek);
  const currentStats = calculateStatsFromData(filteredIncomes, filteredExpenses);

  const getPreviousPeriodData = () => {
    let pDate = selectedDate;
    let pYear = selectedYear;
    let pMonth = selectedMonth;
    let pWeek = selectedWeek;

    if (filter === 'day') {
      const current = new Date(selectedDate + 'T12:00:00');
      const prev = new Date(current);
      prev.setDate(prev.getDate() - 1);
      pDate = prev.toISOString().split('T')[0];
    } else if (filter === 'week') {
      pWeek = selectedWeek - 1;
      if (pWeek < 1) {
        pWeek = 52;
        pYear -= 1;
      }
    } else if (filter === 'month') {
      pMonth = selectedMonth - 1;
      if (pMonth < 0) {
        pMonth = 11;
        pYear -= 1;
      }
    } else if (filter === 'year') {
      pYear = selectedYear - 1;
    }

    const { filteredIncomes: prevIncomes, filteredExpenses: prevExpenses } = getFilteredData(filter, pDate, pYear, pMonth, pWeek);
    return calculateStatsFromData(prevIncomes, prevExpenses);
  };

  const prevStats = getPreviousPeriodData();

  const isPeriodClosed = () => {
    const now = new Date();
    const todayStr = getLocalDateString(now);
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    const currentWeek = getWeekNumber(now);

    if (filter === 'day') {
      return selectedDate < todayStr;
    }
    if (filter === 'week') {
      if (selectedYear < currentYear) return true;
      if (selectedYear === currentYear) return selectedWeek < currentWeek;
      return false;
    }
    if (filter === 'month') {
      if (selectedYear < currentYear) return true;
      if (selectedYear === currentYear) return selectedMonth < currentMonth;
      return false;
    }
    if (filter === 'year') {
      return selectedYear < currentYear;
    }
    return false;
  };

  const closed = isPeriodClosed();

  const calculateChange = (current: number, previous: number) => {
    if (previous === 0) {
      if (current === 0) return null;
      return 100;
    }
    return Math.round(((current - previous) / previous) * 100);
  };

  const realProfit = currentStats.profit;
  const grossEarnings = currentStats.gross;
  const totalExpenses = currentStats.exp;
  const profitChange = calculateChange(realProfit, prevStats.profit);
  const grossChange = calculateChange(grossEarnings, prevStats.gross);
  const expenseChange = calculateChange(totalExpenses, prevStats.exp);
  
  const totalTrips = currentStats.trips;
  const totalKm = currentStats.km;
  const workedDays = currentStats.worked;
  const totalHoursDecimal = currentStats.hoursDecimal;
  
  const totalHours = Math.floor(totalHoursDecimal);
  const totalMinutes = Math.round((totalHoursDecimal - totalHours) * 60);
  const formattedHours = `${totalHours.toString().padStart(2, '0')}:${totalMinutes.toString().padStart(2, '0')}`;

  // Goal calculation based on filter
  const currentGoal = (filter === 'day') ? goal.daily : 
                      (filter === 'week') ? goal.weekly : 
                      (filter === 'month') ? goal.monthly : 
                      goal.yearly;
  
  const isGoalDefined = goal.id !== 'none' && (
    (filter === 'day' && goal.daily > 0) ||
    (filter === 'week' && goal.weekly > 0) ||
    (filter === 'month' && goal.monthly > 0) ||
    (filter === 'year' && goal.yearly > 0)
  );
  
  const realProgressPercent = currentGoal > 0 ? Math.round((Math.max(0, realProfit) / currentGoal) * 100) : 0;
  const progressPercent = Math.min(100, realProgressPercent);
  const remainingValue = Math.max(0, currentGoal - realProfit);
  const surplusValue = Math.max(0, realProfit - currentGoal);

  const workedDaysStat = { 
    label: t('workedDays'), 
    value: workedDays.toLocaleString(language), 
    icon: Calendar, 
    color: 'primary', 
    hideCurrency: true,
    change: calculateChange(workedDays, prevStats.worked)
  };

  const stats = [
    { label: t('totalTrips'), value: totalTrips.toLocaleString(language), icon: CarTaxiFront, color: 'primary', hideCurrency: true, change: calculateChange(totalTrips, prevStats.trips) },
    { label: t('hoursWorked'), value: formattedHours, icon: Timer, color: 'primary', hideCurrency: true, change: calculateChange(totalHoursDecimal, prevStats.hoursDecimal) },
    { label: t('kmDriven'), value: Math.round(totalKm).toLocaleString(language), icon: Route, color: 'primary', hideCurrency: true, suffix: ' KM', change: calculateChange(totalKm, prevStats.km) },
    { label: t('profitPerTrip').replace(' /', ' Méd /'), value: formatLocaleCurrency(currentStats.profitPerTrip, language), icon: CreditCard, color: 'primary', change: calculateChange(currentStats.profitPerTrip, prevStats.profitPerTrip) },
    { label: t('profitPerHour').replace(' /', ' Méd /'), value: formatLocaleCurrency(currentStats.profitPerHour, language), icon: Timer, color: 'primary', change: calculateChange(currentStats.profitPerHour, prevStats.profitPerHour) },
    { label: t('profitPerKm').replace(' /', ' Méd /'), value: formatLocaleCurrency(currentStats.profitPerKm, language), icon: Route, color: 'primary', change: calculateChange(currentStats.profitPerKm, prevStats.profitPerKm) },
    { label: t('earningPerTrip').replace(' /', ' Méd /'), value: formatLocaleCurrency(currentStats.earningPerTrip, language), icon: TrendingUp, color: 'secondary', change: calculateChange(currentStats.earningPerTrip, prevStats.earningPerTrip) },
    { label: t('earningPerHour').replace(' /', ' Méd /'), value: formatLocaleCurrency(currentStats.earningPerHour, language), icon: Clock, color: 'secondary', change: calculateChange(currentStats.earningPerHour, prevStats.earningPerHour) },
    { label: t('earningPerKm').replace(' /', ' Méd /'), value: formatLocaleCurrency(currentStats.earningPerKm, language), icon: Zap, color: 'secondary', change: calculateChange(currentStats.earningPerKm, prevStats.earningPerKm) },
    { label: t('expensePerTrip').replace(' /', ' Méd /'), value: formatLocaleCurrency(currentStats.expensePerTrip, language), icon: ShoppingCart, color: 'error', change: calculateChange(currentStats.expensePerTrip, prevStats.expensePerTrip) },
    { label: t('expensePerHour').replace(' /', ' Méd /'), value: formatLocaleCurrency(currentStats.expensePerHour, language), icon: TrendingDown, color: 'error', change: calculateChange(currentStats.expensePerHour, prevStats.expensePerHour) },
    { label: t('expensePerKm').replace(' /', ' Méd /'), value: formatLocaleCurrency(currentStats.expensePerKm, language), icon: TrendingDown, color: 'error', change: calculateChange(currentStats.expensePerKm, prevStats.expensePerKm) },
  ];

  const reminders = userProfile?.reminders || [];
  const currentOdo = userProfile?.vehicle?.currentOdometer || 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const activeReminders = reminders.filter(r => {
    if (!r.isActive) return false;

    if (r.triggerType === 'date' && r.targetDate) {
      const target = new Date(r.targetDate + 'T12:00:00');
      target.setHours(0, 0, 0, 0);
      
      const daysDiff = Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysDiff <= 0) return true;
      if (r.remindXDaysBefore && daysDiff <= r.remindXDaysBefore) return true;
    }

    if (r.triggerType === 'km') {
      if (r.remindAtKm && currentOdo >= r.remindAtKm) return true;
      if (r.remindEveryXKm) {
        if (currentOdo >= r.remindEveryXKm) return true;
      }
    }

    return false;
  });

  return (
    <div className={`space-y-10 ${isPrivacyActive ? 'privacy-hidden' : ''}`}>
      {/* Active Reminders Alerts */}
      <AnimatePresence>
        {activeReminders.length > 0 && (
          <div className="space-y-3 px-1">
            {activeReminders.map((reminder) => (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                key={reminder.id}
                className="bg-error/10 border border-error/20 p-4 rounded-2xl flex items-start gap-4 relative overflow-hidden group"
              >
                <div className="absolute top-0 right-0 p-1 opacity-20 group-hover:opacity-40 transition-opacity">
                   <Bell size={40} className="text-error -rotate-12 translate-x-2 -translate-y-2" />
                </div>
                <div className="w-10 h-10 bg-error/20 rounded-xl flex items-center justify-center text-error shrink-0">
                  <AlertCircle size={20} />
                </div>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-black text-on-surface uppercase tracking-tight">{t('reminderNotificationTitle')}</h4>
                    <span className="text-[10px] font-black uppercase text-error tracking-widest">{t('urgent')}</span>
                  </div>
                  <p className="text-base font-black text-on-surface leading-tight">
                    {reminder.title}
                  </p>
                  {reminder.notes && (
                    <p className="text-xs font-medium text-on-surface-variant opacity-70 italic">
                      "{reminder.notes}"
                    </p>
                  )}
                  <div className="flex items-center gap-3 pt-1">
                    <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest bg-surface-container-high px-2 py-0.5 rounded">
                      {reminder.triggerType === 'date' ? t('triggerDate') : t('triggerKm')}
                    </span>
                    <span className="text-[10px] font-bold text-on-surface-variant">
                      {reminder.triggerType === 'date' ? reminder.targetDate : `${reminder.remindAtKm || reminder.remindEveryXKm} KM`}
                    </span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </AnimatePresence>

      <div className="flex justify-between items-center">
        <h2 className="font-headline font-bold text-lg tracking-tight text-on-surface">{t('overview')}</h2>
      </div>

      {/* Filters */}
      <div className="flex justify-center">
        <div className="inline-flex p-1 bg-surface-container-low rounded-xl border border-surface-container-high shadow-sm">
          {(['day', 'week', 'month', 'year'] as const).map((f) => (
            <button
              key={f}
              onClick={() => onFilterChange(f)}
              className={`px-6 py-2 rounded-lg text-sm font-bold font-headline transition-all ${
                filter === f 
                  ? 'bg-primary text-on-primary shadow-md' 
                  : 'text-on-surface-variant hover:bg-surface-container-high'
              }`}
            >
              {t(f)}
            </button>
          ))}
        </div>
      </div>

      {/* Hero Section - Compact Real Profit Card */}
      <section className="relative">
        <div className="rounded-[2.5rem] p-3 shadow-xl border border-surface-container-high bg-surface-container-low">
          <div className="rounded-[2rem] p-6 flex flex-col items-center bg-surface-container-lowest relative group">
            
            <div className="w-full flex justify-between items-start mb-2">
              <div className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${!closed ? 'bg-orange-50 text-orange-600 border border-orange-100' : 'bg-neutral-100 text-neutral-400 border border-neutral-200'}`}>
                {!closed ? t('inProgress') : t('closedPeriod')}
              </div>
              <button 
                onClick={onPrivacyToggle}
                className="group focus:outline-none"
              >
                {isPrivacyActive ? (
                   <EyeOff size={20} className="text-neutral-400 group-hover:text-primary transition-colors" />
                ) : (
                   <Eye size={20} className="text-neutral-400 group-hover:text-primary transition-colors" />
                )}
              </button>
            </div>

            <div className="text-center mb-6 w-full flex flex-col items-center">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-400 mb-1">{t('realProfit')}</p>
              <h1 className="text-4xl md:text-6xl font-black font-headline text-primary tracking-tighter data-privacy-mask leading-tight text-center">
                {t('currencySymbol')} {formatLocaleCurrency(realProfit, language)}
              </h1>
              
              {profitChange !== null && (
                <div className={`mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-black uppercase tracking-[0.1em] ${profitChange >= 0 ? 'bg-secondary/10 text-secondary' : 'bg-error/10 text-error'} shadow-sm`}>
                  {profitChange >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                  {t(profitChange >= 0 ? 'increaseOf' : 'decreaseOf')} {Math.abs(profitChange)}% {t('moreThanPrevPeriod').replace('{period}', t(filter === 'day' ? 'yesterday' : filter === 'week' ? 'prevWeek' : filter === 'month' ? 'prevMonth' : 'prevYear'))}
                </div>
              )}

              {filter === 'year' && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-4 p-3 bg-primary/5 rounded-2xl border border-primary/10 inline-flex flex-col items-center gap-1 group/tax relative cursor-default"
                >
                  <div className="flex items-center gap-2 text-primary/70">
                    <Info size={14} />
                    <span className="text-[10px] font-black uppercase tracking-widest">{t('incomeTax')}</span>
                  </div>
                  <p className="text-xl font-black text-primary data-privacy-mask">
                    {t('currencySymbol')} {formatLocaleCurrency(grossEarnings * 0.6, language)}
                  </p>
                  
                  {/* Tooltip - Now below everything */}
                  <div className="absolute top-full mt-3 left-1/2 -translate-x-1/2 w-64 p-3 bg-on-surface text-surface text-[10px] font-bold rounded-xl opacity-0 group-hover/tax:opacity-100 transition-all duration-200 pointer-events-none text-center shadow-2xl z-[60] border border-surface/10 leading-relaxed">
                    {t('incomeTaxInfo')}
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 border-8 border-transparent border-b-on-surface"></div>
                  </div>
                </motion.div>
              )}
            </div>

            {/* Main Stats and Goal integrated row */}
            <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-6 items-center border-t border-surface-container pt-6">
              {/* Gross Earnings */}
              <div className="text-center md:text-left order-2 md:order-1">
                <p className="text-[10px] font-black text-secondary uppercase tracking-[0.2em] mb-1">{t('grossEarnings')}</p>
                <p className="text-3xl md:text-4xl font-black font-headline text-secondary data-privacy-mask leading-none">{t('currencySymbol')} {formatLocaleCurrency(grossEarnings, language)}</p>
                {grossChange !== null && (
                  <div className={`mt-2 flex items-center justify-center md:justify-start gap-1.5 text-xs font-black uppercase tracking-[0.1em] ${grossChange >= 0 ? 'text-secondary' : 'text-error'}`}>
                    {grossChange >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                    <span>{t(grossChange >= 0 ? 'increaseOf' : 'decreaseOf')}</span> {Math.abs(grossChange)}%
                  </div>
                )}
              </div>
              
              {/* Goal - Gauge Style */}
              <div className="flex flex-col items-center justify-center order-1 md:order-2">
                <div className="relative flex items-center justify-center w-56 h-36 overflow-hidden">
                  <svg className="w-56 h-56 absolute top-0" viewBox="0 0 100 100">
                    {/* Background Gauge */}
                    <path
                      d="M 10 50 A 40 40 0 0 1 90 50"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="6"
                      strokeLinecap="round"
                      className="text-surface-container-high/40"
                    />
                    {/* Progress Gauge */}
                    <motion.path
                      d="M 10 50 A 40 40 0 0 1 90 50"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="8"
                      strokeLinecap="round"
                      className="text-primary"
                      strokeDasharray="125.66" // PI * R (PI * 40 approx 125.66)
                      initial={{ strokeDashoffset: 125.66 }}
                      animate={{ strokeDashoffset: 125.66 * (1 - progressPercent / 100) }}
                      transition={{ duration: 1.8, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
                    />
                  </svg>
                  
                  <div className="absolute bottom-1 inset-x-0 flex flex-col items-center justify-center z-20 text-center pb-1">
                    {!isGoalDefined ? (
                      <span className="text-[10px] font-black text-on-surface uppercase tracking-[0.2em] leading-none mb-1">
                        - - -
                      </span>
                    ) : (filteredIncomes.length === 0) ? (
                      <span className="text-[10px] font-black text-on-surface uppercase tracking-[0.2em] leading-none mb-1">
                        - - -
                      </span>
                    ) : remainingValue > 0 ? (
                      <>
                        <span className="text-[11px] font-black text-on-surface uppercase tracking-[0.2em] leading-none mb-2">{t('left')}</span>
                        <span className="text-2xl font-black font-headline text-primary block leading-none data-privacy-mask">
                          {t('currencySymbol')} {formatLocaleCurrency(remainingValue, language)}
                        </span>
                      </>
                    ) : (
                      <div className="flex flex-col items-center">
                        <span className="text-[11px] font-black text-on-surface uppercase tracking-[0.2em] leading-none mb-2">
                          {t('goalCompleted')}
                        </span>
                        {surplusValue > 0 && (
                          <span className="text-[9px] font-black text-secondary uppercase tracking-[0.1em] mt-5">
                            {t('excessProfit')}: {t('currencySymbol')} {formatLocaleCurrency(surplusValue, language)}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="mt-2 text-center">
                  <div className="flex items-center justify-center gap-1.5">
                    <p className="text-[11px] font-black text-on-surface uppercase tracking-[0.2em]">
                      {isGoalDefined ? `${t('goal')}: ${t('currencySymbol')} ${formatLocaleCurrency(currentGoal, language)}` : t('defineGoal')}
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Total Expenses */}
              <div className="text-center md:text-right order-3">
                <p className="text-[10px] font-black text-error uppercase tracking-[0.2em] mb-1">{t('totalExpenses')}</p>
                <p className="text-3xl md:text-4xl font-black font-headline text-error data-privacy-mask leading-none">{t('currencySymbol')} {formatLocaleCurrency(totalExpenses, language)}</p>
                {expenseChange !== null && (
                  <div className={`mt-2 flex items-center justify-center md:justify-end gap-1.5 text-xs font-black uppercase tracking-[0.1em] ${expenseChange >= 0 ? 'text-error' : 'text-secondary'}`}>
                    {expenseChange >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                    <span>{t(expenseChange >= 0 ? 'increaseOf' : 'decreaseOf')}</span> {Math.abs(expenseChange)}%
                  </div>
                )}
              </div>
            </div>

            {/* Date Selector Pill */}
            <div className="mt-10 flex flex-col items-center gap-5">
              <div className="flex flex-col items-center gap-2">
                <div className="flex items-center gap-3 text-sm font-black text-on-surface uppercase tracking-[0.15em] bg-surface-container-high/30 px-4 py-1.5 rounded-full border border-outline-variant/10 shadow-sm">
                  {filter === 'day' && new Date(selectedDate + 'T12:00:00').toLocaleDateString(language, { day: '2-digit', month: 'short' })}
                  {filter === 'week' && `${t('week')} ${selectedWeek} • ${selectedYear}`}
                  {filter === 'month' && `${new Date(selectedYear, selectedMonth).toLocaleDateString(language, { month: 'long' })}`}
                  {filter === 'year' && selectedYear}
                </div>
                
                {/* Return to current period button */}
                {(() => {
                  const now = new Date();
                  const todayStr = getLocalDateString(now);
                  const currentWeek = getWeekNumber(now);
                  const currentMonth = now.getMonth();
                  const currentYear = now.getFullYear();

                  let isDifferent = false;
                  let returnLabel = '';
                  let onReturn = () => {};

                  if (filter === 'day' && selectedDate !== todayStr) {
                    isDifferent = true;
                    returnLabel = t('returnToToday');
                    onReturn = () => {
                      onSelectedDateChange(todayStr);
                      onSelectedMonthChange(currentMonth);
                      onSelectedYearChange(currentYear);
                    };
                  } else if (filter === 'week' && (selectedWeek !== currentWeek || selectedYear !== currentYear)) {
                    isDifferent = true;
                    returnLabel = t('returnToCurrentWeek');
                    onReturn = () => {
                      onSelectedWeekChange(currentWeek);
                      onSelectedMonthChange(getMonthFromWeek(currentYear, currentWeek));
                      onSelectedYearChange(currentYear);
                    };
                  } else if (filter === 'month' && (selectedMonth !== currentMonth || selectedYear !== currentYear)) {
                    isDifferent = true;
                    returnLabel = t('returnToCurrentMonth');
                    onReturn = () => {
                      onSelectedMonthChange(currentMonth);
                      onSelectedYearChange(currentYear);
                    };
                  } else if (filter === 'year' && selectedYear !== currentYear) {
                    isDifferent = true;
                    returnLabel = t('returnToCurrentYear');
                    onReturn = () => onSelectedYearChange(currentYear);
                  }

                  if (!isDifferent) return null;

                  return (
                    <motion.button
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      onClick={onReturn}
                      className="text-[10px] font-black text-primary uppercase tracking-[0.2em] hover:underline flex items-center gap-1.5"
                    >
                      <RotateCcw size={12} />
                      {returnLabel}
                    </motion.button>
                  );
                })()}
              </div>

              <button 
                onClick={() => setIsSelectorOpen(true)}
                className="bg-surface-container-high text-on-surface-variant hover:bg-primary hover:text-on-primary transition-all px-6 py-3 rounded-[1.25rem] border border-outline-variant/30 flex items-center gap-3 group shadow-lg shadow-black/5"
              >
                <CalendarDays size={20} className="group-hover:scale-110 transition-transform text-primary" />
                <span className="text-[11px] font-black uppercase tracking-widest">{t('select')} {t(filter)}</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Quick Actions / Shortcuts */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4 px-1">
        <button 
          onClick={() => onNavigate('calculator')}
          className="flex flex-col items-center justify-center p-4 bg-surface-container-lowest border border-surface-container-high rounded-2xl hover:bg-primary hover:text-on-primary transition-all group shadow-sm"
        >
          <Timer size={24} className="mb-2 text-primary group-hover:text-on-primary transition-colors" />
          <span className="text-[10px] font-black uppercase tracking-widest text-center">{t('calculator')}</span>
        </button>
        <button 
          onClick={() => onNavigate('reminders')}
          className="flex flex-col items-center justify-center p-4 bg-surface-container-lowest border border-surface-container-high rounded-2xl hover:bg-primary hover:text-on-primary transition-all group shadow-sm"
        >
          <Bell size={24} className="mb-2 text-primary group-hover:text-on-primary transition-colors" />
          <span className="text-[10px] font-black uppercase tracking-widest text-center">{t('reminders')}</span>
        </button>
        <button 
          onClick={() => onNavigate('reports')}
          className="flex flex-col items-center justify-center p-4 bg-surface-container-lowest border border-surface-container-high rounded-2xl hover:bg-primary hover:text-on-primary transition-all group shadow-sm"
        >
          <TrendingUp size={24} className="mb-2 text-primary group-hover:text-on-primary transition-colors" />
          <span className="text-[10px] font-black uppercase tracking-widest text-center">{t('reports')}</span>
        </button>
      </section>

      {/* Gastos Fixos (Pending Auto-generated Expenses) */}
      <section className="bg-surface-container-lowest p-6 rounded-3xl shadow-sm border border-surface-container-high space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-black font-headline text-on-surface flex items-center gap-2">
            <Zap size={20} className="text-primary" />
            {t('fixedExpenses')}
          </h3>
          <span className="text-[10px] font-bold text-on-surface-variant bg-surface-container-high px-2 py-1 rounded-lg">
            {expenses.filter(e => e.isAutoGenerated).length} {t('pendingNotifications')}
          </span>
        </div>
        
        <div className="space-y-3">
          <AnimatePresence mode="popLayout">
            {expenses.filter(e => e.isAutoGenerated).length > 0 ? (
              expenses.filter(e => e.isAutoGenerated).map((expense) => (
                <motion.div
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  key={expense.id}
                  className="bg-surface-container-low p-4 rounded-2xl border border-primary/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all hover:bg-surface-container-high/50"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary shrink-0">
                      <Zap size={20} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="text-sm font-black text-on-surface uppercase tracking-tight truncate">
                        {expense.notes || t('fixedExpense')}
                      </h4>
                      <div className="flex items-center gap-2 text-[10px] font-bold text-on-surface-variant">
                        <span>{new Date(expense.date + 'T12:00:00').toLocaleDateString(language)}</span>
                        <span className="opacity-30">•</span>
                        <span className="text-primary font-black">{t('fixed')}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-4 w-full sm:w-auto mt-2 sm:mt-0">
                    <p className="text-lg font-black font-headline text-error data-privacy-mask">
                      - {t('currencySymbol')} {expense.amount}
                    </p>
                    
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onDeleteExpense(expense.id)}
                        className="flex items-center gap-2 px-3 py-2 text-on-surface-variant hover:bg-error/10 hover:text-error rounded-lg transition-colors group/undo"
                        title={t('undo')}
                      >
                        <RotateCcw size={18} className="group-hover/undo:rotate-[-90deg] transition-transform" />
                        <span className="text-[10px] font-black uppercase tracking-widest">{t('undo')}</span>
                      </button>
                      <button
                        onClick={() => onConfirmExpense({ ...expense, isAutoGenerated: false })}
                        className="flex items-center gap-2 bg-primary text-on-primary px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-md hover:scale-105 active:scale-95 transition-all"
                      >
                        <CheckCircle2 size={16} />
                        {t('confirm')}
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))
            ) : (
              <div className="py-10 flex flex-col items-center justify-center border-2 border-dashed border-surface-container-high rounded-3xl opacity-50">
                <Zap size={32} className="text-surface-container-high mb-2" />
                <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
                  {t('noPendingFixedExpenses')}
                </p>
              </div>
            )}
          </AnimatePresence>
        </div>
      </section>

      {/* Selector Modal */}
      {isSelectorOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-surface-container-lowest w-full max-w-md rounded-[2.5rem] shadow-2xl border border-surface-container-high overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-surface-container flex flex-col gap-2 bg-surface-container-low">
              <div className="flex justify-between items-center w-full">
                <h3 className="text-xl font-black font-headline text-on-surface uppercase tracking-tight">
                  {t('select')} {t(filter)}
                </h3>
                <button 
                  onClick={() => setIsSelectorOpen(false)}
                  className="p-2 hover:bg-surface-container-high rounded-full transition-colors"
                >
                  <X size={24} />
                </button>
              </div>
            </div>

            <div className="p-6 max-h-[60vh] overflow-y-auto custom-scrollbar">
              {filter === 'day' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between bg-surface-container-low p-3 rounded-2xl">
                    <button 
                      onClick={() => {
                        if (selectedMonth === 0) {
                          onSelectedMonthChange(11);
                          onSelectedYearChange(selectedYear - 1);
                        } else {
                          onSelectedMonthChange(selectedMonth - 1);
                        }
                      }} 
                      className="p-2 hover:bg-surface-container-high rounded-lg"
                    >
                      <ChevronLeft />
                    </button>
                    <span className="font-black text-lg uppercase tracking-widest">
                      {new Date(selectedYear, selectedMonth).toLocaleDateString(language, { month: 'long', year: 'numeric' })}
                    </span>
                    <button 
                      onClick={() => {
                        if (selectedMonth === 11) {
                          onSelectedMonthChange(0);
                          onSelectedYearChange(selectedYear + 1);
                        } else {
                          onSelectedMonthChange(selectedMonth + 1);
                        }
                      }} 
                      className="p-2 hover:bg-surface-container-high rounded-lg"
                    >
                      <ChevronRight />
                    </button>
                  </div>

                  <div className="grid grid-cols-7 gap-1">
                    {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((day, i) => (
                      <div key={i} className="text-center text-[10px] font-black text-neutral-400 py-2">
                        {day}
                      </div>
                    ))}
                    {Array.from({ length: new Date(selectedYear, selectedMonth, 1).getDay() }).map((_, i) => (
                      <div key={`empty-${i}`} />
                    ))}
                    {getDaysInMonth(selectedYear, selectedMonth).map((date) => {
                      const dateStr = date.toISOString().split('T')[0];
                      const isSelected = selectedDate === dateStr;
                      const isToday = new Date().toISOString().split('T')[0] === dateStr;

                      return (
                        <button
                          key={dateStr}
                          onClick={() => {
                            onSelectedDateChange(dateStr);
                            setIsSelectorOpen(false);
                          }}
                          className={`aspect-square flex flex-col items-center justify-center rounded-xl text-sm font-bold transition-all relative ${
                            isSelected 
                              ? 'bg-primary text-on-primary shadow-lg scale-110 z-10' 
                              : isToday
                                ? 'bg-primary/10 text-primary border border-primary/20'
                                : 'hover:bg-surface-container-high text-on-surface'
                          }`}
                        >
                          {date.getDate()}
                          {isToday && !isSelected && (
                            <div className="absolute bottom-1 w-1.5 h-1.5 bg-green-500 rounded-full shadow-[0_0_8px_rgba(34,197,94,0.6)]"></div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {filter === 'week' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between bg-surface-container-low p-3 rounded-2xl">
                    <button onClick={() => onSelectedYearChange(selectedYear - 1)} className="p-2 hover:bg-surface-container-high rounded-lg"><ChevronLeft /></button>
                    <span className="font-black text-xl">{selectedYear}</span>
                    <button onClick={() => onSelectedYearChange(selectedYear + 1)} className="p-2 hover:bg-surface-container-high rounded-lg"><ChevronRight /></button>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {Array.from({ length: 52 }, (_, i) => i + 1).map(w => {
                      const currentWeek = getWeekNumber(new Date());
                      const isCurrentWeek = w === currentWeek && selectedYear === new Date().getFullYear();
                      const isSelected = selectedWeek === w;

                      return (
                        <button
                          key={w}
                          onClick={() => {
                            onSelectedWeekChange(w);
                            onSelectedMonthChange(getMonthFromWeek(selectedYear, w));
                            setIsSelectorOpen(false);
                          }}
                          className={`p-3 rounded-xl text-sm font-black transition-all relative ${
                            isSelected 
                              ? 'bg-primary text-on-primary shadow-lg scale-105' 
                              : isCurrentWeek
                                ? 'bg-primary/10 text-primary border border-primary/20'
                                : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high'
                          }`}
                        >
                          {w}
                          {isCurrentWeek && !isSelected && (
                            <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-secondary rounded-full"></div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {filter === 'month' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between bg-surface-container-low p-3 rounded-2xl">
                    <button onClick={() => onSelectedYearChange(selectedYear - 1)} className="p-2 hover:bg-surface-container-high rounded-lg"><ChevronLeft /></button>
                    <span className="font-black text-xl">{selectedYear}</span>
                    <button onClick={() => onSelectedYearChange(selectedYear + 1)} className="p-2 hover:bg-surface-container-high rounded-lg"><ChevronRight /></button>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    {Array.from({ length: 12 }, (_, i) => i).map(m => {
                      const isCurrentMonth = m === new Date().getMonth() && selectedYear === new Date().getFullYear();
                      const isSelected = selectedMonth === m;

                      return (
                        <button
                          key={m}
                          onClick={() => {
                            onSelectedMonthChange(m);
                            setIsSelectorOpen(false);
                          }}
                          className={`p-4 rounded-2xl text-sm font-black uppercase tracking-widest transition-all relative ${
                            isSelected 
                              ? 'bg-primary text-on-primary shadow-lg scale-105' 
                              : isCurrentMonth
                                ? 'bg-primary/10 text-primary border border-primary/20'
                                : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high'
                          }`}
                        >
                          {new Date(2000, m).toLocaleDateString(language, { month: 'short' })}
                          {isCurrentMonth && !isSelected && (
                            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-secondary rounded-full"></div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {filter === 'year' && (
                <div className="grid grid-cols-2 gap-4">
                  {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(y => {
                    const isCurrentYear = y === new Date().getFullYear();
                    const isSelected = selectedYear === y;

                    return (
                      <button
                        key={y}
                        onClick={() => {
                          onSelectedYearChange(y);
                          setIsSelectorOpen(false);
                        }}
                        className={`p-6 rounded-[2rem] text-xl font-black transition-all relative ${
                          isSelected 
                            ? 'bg-primary text-on-primary shadow-lg scale-105' 
                            : isCurrentYear
                              ? 'bg-primary/10 text-primary border border-primary/20'
                              : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high'
                        }`}
                      >
                        {y}
                        {isCurrentYear && !isSelected && (
                          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 w-2 h-2 bg-secondary rounded-full"></div>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Detailed Statistics */}
      <section className="bg-surface-container-lowest p-6 rounded-3xl shadow-sm border border-surface-container-high">
        <div className="flex flex-col items-center justify-center gap-4 mb-8">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-surface-container-high rounded-full flex items-center justify-center">
              <LayoutGrid size={16} className="text-primary" />
            </div>
            <h3 className="text-lg font-black font-headline text-on-surface">{t('detailedStats')}</h3>
          </div>

          <div className="w-full max-w-sm flex items-center justify-between p-3 bg-primary/5 rounded-2xl border border-primary/20 shadow-sm">
            <div className="flex items-center gap-3">
              <p className="text-[11px] font-black text-primary uppercase tracking-[0.2em]">{workedDaysStat.label}</p>
            </div>
            <div className="flex flex-col items-end">
              <p className="text-lg font-black font-headline text-primary data-privacy-mask">
                {workedDaysStat.value}
              </p>
              {workedDaysStat.change !== null && workedDaysStat.change !== 0 && (
                <div className={`flex items-center gap-1 text-[11px] font-black ${workedDaysStat.change > 0 ? 'text-secondary' : 'text-error'}`}>
                  {workedDaysStat.change > 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                  {Math.abs(workedDaysStat.change)}%
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {stats.map((stat: any, i) => (
            <div key={i} className="flex items-center justify-between p-4 bg-surface-container-low rounded-[1.25rem] border border-outline-variant/10 hover:border-black/5 transition-all shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex flex-col">
                  <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">{stat.label}</p>
                  {stat.change !== null && stat.change !== 0 && (
                    <div className={`flex items-center gap-1 text-[11px] font-black ${
                      stat.color === 'error' 
                        ? (stat.change > 0 ? 'text-error' : 'text-secondary') // For expenses, increase is bad (error), decrease is good (secondary)
                        : (stat.change > 0 ? 'text-secondary' : 'text-error') // For other stats, increase is good (secondary), decrease is bad (error)
                    }`}>
                      {stat.change > 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                      {Math.abs(stat.change)}%
                    </div>
                  )}
                </div>
              </div>
              <p className={`text-sm font-black font-headline text-on-surface data-privacy-mask`}>
                {!stat.hideCurrency && <span className="text-[10px] mr-1 opacity-50">{t('currencySymbol')}</span>}
                {stat.value}
                {stat.suffix && <span className="text-[10px] ml-1 opacity-50 uppercase">{stat.suffix}</span>}
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
