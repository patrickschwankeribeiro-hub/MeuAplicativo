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
  Info,
  ArrowUpCircle,
  ArrowDownCircle,
  Wrench,
  AlertTriangle,
  Trash2
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
import { IncomeRecord, ExpenseRecord, Screen, Goal, UserProfile, CATEGORIES, MaintenancePlanItem } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import { parseLocaleNumber, formatLocaleCurrency } from '../lib/currency';
import { MAINTENANCE_SUBCATEGORIES } from '../constants';

interface DashboardScreenProps {
  incomes: IncomeRecord[];
  expenses: ExpenseRecord[];
  onNavigate: (screen: Screen, data?: any) => void;
  goal: Goal;
  userProfile: UserProfile;
  isPrivacyActive: boolean;
  onPrivacyToggle: () => void;
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
  onActiveVehicleChange: (id: string) => void;
  periodLabel?: string;
  activeVehicleId?: string | null;
}

export function DashboardScreen({ 
  incomes, 
  expenses, 
  onNavigate, 
  goal, 
  userProfile,
  isPrivacyActive,
  onPrivacyToggle,
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
  onActiveVehicleChange,
  periodLabel,
  activeVehicleId
}: DashboardScreenProps) {
  const { t, language } = useLanguage();

  const getLocalDateString = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [isSelectorOpen, setIsSelectorOpen] = useState(false);

  const handlePrevPeriod = () => {
    if (filter === 'day') {
      const current = new Date(selectedDate + 'T12:00:00');
      current.setDate(current.getDate() - 1);
      onSelectedDateChange(getLocalDateString(current));
    } else if (filter === 'week') {
      if (selectedWeek === 1) {
        onSelectedWeekChange(52);
        onSelectedYearChange(selectedYear - 1);
        onSelectedMonthChange(11);
      } else {
        const prevW = selectedWeek - 1;
        onSelectedWeekChange(prevW);
        onSelectedMonthChange(getMonthFromWeek(selectedYear, prevW));
      }
    } else if (filter === 'month') {
      if (selectedMonth === 0) {
        onSelectedMonthChange(11);
        onSelectedYearChange(selectedYear - 1);
      } else {
        onSelectedMonthChange(selectedMonth - 1);
      }
    } else if (filter === 'year') {
      onSelectedYearChange(selectedYear - 1);
    }
  };

  const handleNextPeriod = () => {
    if (filter === 'day') {
      const current = new Date(selectedDate + 'T12:00:00');
      current.setDate(current.getDate() + 1);
      onSelectedDateChange(getLocalDateString(current));
    } else if (filter === 'week') {
      if (selectedWeek === 52) {
        onSelectedWeekChange(1);
        onSelectedYearChange(selectedYear + 1);
        onSelectedMonthChange(0);
      } else {
        const nextW = selectedWeek + 1;
        onSelectedWeekChange(nextW);
        onSelectedMonthChange(getMonthFromWeek(selectedYear, nextW));
      }
    } else if (filter === 'month') {
      if (selectedMonth === 11) {
        onSelectedMonthChange(0);
        onSelectedYearChange(selectedYear + 1);
      } else {
        onSelectedMonthChange(selectedMonth + 1);
      }
    } else if (filter === 'year') {
      onSelectedYearChange(selectedYear + 1);
    }
  };

  // Maintenance Plan States
  const [isAddingPlanItem, setIsAddingPlanItem] = useState(false);
  const [editingPlanItemId, setEditingPlanItemId] = useState<string | null>(null);
  const [planFormSubcategory, setPlanFormSubcategory] = useState('oilChange');
  const [planFormIntervalKm, setPlanFormIntervalKm] = useState('10000');
  const [planFormLastOdometer, setPlanFormLastOdometer] = useState('');
  const calculatedNextKm = useMemo(() => {
    if (!planFormLastOdometer || !planFormLastOdometer.trim()) return null;
    const lastOdo = parseInt(planFormLastOdometer);
    const interval = parseInt(planFormIntervalKm) || 0;
    if (isNaN(lastOdo)) return null;
    return lastOdo + interval;
  }, [planFormLastOdometer, planFormIntervalKm]);
  const [errorAlert, setErrorAlert] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);

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

  const getWeekRange = (year: number, week: number) => {
    const jan4 = new Date(year, 0, 4);
    const dayOfWeek = jan4.getDay() || 7;
    const firstThursday = new Date(year, 0, 4 + (4 - dayOfWeek));
    const firstMonday = new Date(firstThursday.getTime());
    firstMonday.setDate(firstThursday.getDate() - 3);

    const monday = new Date(firstMonday.getTime());
    monday.setDate(firstMonday.getDate() + (week - 1) * 7);

    const sunday = new Date(monday.getTime());
    sunday.setDate(monday.getDate() + 6);

    return { monday, sunday };
  };

  const getWeekRangeLabel = (year: number, week: number) => {
    const { monday, sunday } = getWeekRange(year, week);
    const startDay = monday.getDate();
    const endDay = sunday.getDate();
    
    const startMonthName = monday.toLocaleDateString(language, { month: 'short' });
    const endMonthName = sunday.toLocaleDateString(language, { month: 'short' });

    if (monday.getMonth() === sunday.getMonth()) {
      const monthFull = monday.toLocaleDateString(language, { month: 'long' });
      return `${String(startDay).padStart(2, '0')} a ${String(endDay).padStart(2, '0')} de ${monthFull}`;
    } else {
      return `${String(startDay).padStart(2, '0')} de ${startMonthName} a ${String(endDay).padStart(2, '0')} de ${endMonthName}`;
    }
  };

  const monthWeeks = useMemo(() => {
    const weeks: { week: number; monday: Date; sunday: Date; rangeLabel: string }[] = [];
    for (let w = 1; w <= 53; w++) {
      const { monday, sunday } = getWeekRange(selectedYear, w);
      const thursday = new Date(monday.getTime());
      thursday.setDate(monday.getDate() + 3);
      
      if (thursday.getFullYear() === selectedYear && thursday.getMonth() === selectedMonth) {
        const startDay = monday.getDate();
        const endDay = sunday.getDate();
        
        const startMonthName = monday.toLocaleDateString(language, { month: 'short' });
        const endMonthName = sunday.toLocaleDateString(language, { month: 'short' });
        
        let label = '';
        if (monday.getMonth() === sunday.getMonth()) {
          label = `${String(startDay).padStart(2, '0')} a ${String(endDay).padStart(2, '0')}`;
        } else {
          label = `${String(startDay).padStart(2, '0')} ${startMonthName} a ${String(endDay).padStart(2, '0')} ${endMonthName}`;
        }
        
        weeks.push({
          week: w,
          monday,
          sunday,
          rangeLabel: label
        });
      }
    }
    return weeks;
  }, [selectedYear, selectedMonth, language]);

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

  const fixedExpensesTotal = useMemo(() => {
    return filteredExpenses.reduce((acc, curr) => {
      const category = CATEGORIES.find(c => c.id === curr.category);
      const isFixed = curr.costType === 'fixed' || category?.costType === 'fixed';
      return isFixed ? acc + parseCurrency(curr.amount) : acc;
    }, 0);
  }, [filteredExpenses, language]);

  const variableExpensesTotal = useMemo(() => {
    return filteredExpenses.reduce((acc, curr) => {
      const category = CATEGORIES.find(c => c.id === curr.category);
      const isFixed = curr.costType === 'fixed' || category?.costType === 'fixed';
      return isFixed ? acc : acc + parseCurrency(curr.amount);
    }, 0);
  }, [filteredExpenses, language]);

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
  
  const getVsPeriodLabel = (f: string, lang: string) => {
    if (lang === 'pt-BR') {
      return f === 'day' ? 'vs Ontem' : f === 'week' ? 'vs Semana Anterior' : f === 'month' ? 'vs Mês Anterior' : 'vs Ano Anterior';
    } else if (lang === 'es-ES') {
      return f === 'day' ? 'vs Ayer' : f === 'week' ? 'vs Semana Anterior' : f === 'month' ? 'vs Mes Anterior' : 'vs Año Anterior';
    } else if (lang === 'fr-FR') {
      return f === 'day' ? 'vs Hier' : f === 'week' ? 'vs Semaine Précédente' : f === 'month' ? 'vs Mois Précédent' : 'vs Année Précédente';
    } else {
      return f === 'day' ? 'vs Yesterday' : f === 'week' ? 'vs Previous Week' : f === 'month' ? 'vs Previous Month' : 'vs Previous Year';
    }
  };

  const vsPrevPeriodLabel = getVsPeriodLabel(filter, language);
  
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
    { label: t('totalTrips'), value: totalTrips.toLocaleString(language), icon: CarTaxiFront, color: 'primary', hideCurrency: true, change: calculateChange(totalTrips, prevStats.trips), isCustomInverted: true },
    { label: t('hoursWorked'), value: formattedHours, icon: Timer, color: 'primary', hideCurrency: true, change: calculateChange(totalHoursDecimal, prevStats.hoursDecimal), isCustomInverted: true },
    { label: t('kmDriven'), value: Math.round(totalKm).toLocaleString(language), icon: Route, color: 'primary', hideCurrency: true, suffix: ' KM', change: calculateChange(totalKm, prevStats.km), isCustomInverted: true },
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

  const reminders = useMemo(() => {
    return (userProfile?.reminders || []).filter(r => r.vehicleId === activeVehicleId);
  }, [userProfile?.reminders, activeVehicleId]);

  const activeVehicle = useMemo(() => {
    return userProfile.vehicles?.find(v => v.id === activeVehicleId) || userProfile.vehicles?.[0];
  }, [userProfile.vehicles, activeVehicleId]);

  const handleSavePlanItem = () => {
    if (!activeVehicle) return;
    if (!planFormSubcategory.trim() || !planFormIntervalKm) {
      setErrorAlert(t('fieldsRequired'));
      setTimeout(() => setErrorAlert(null), 3000);
      return;
    }

    const intervalVal = parseInt(planFormIntervalKm);
    const lastOdoVal = planFormLastOdometer ? parseInt(planFormLastOdometer) : undefined;

    if (isNaN(intervalVal) || intervalVal <= 0) {
      setErrorAlert(language === 'pt-BR' ? 'O intervalo em KM deve ser maior que 0.' : 'Interval KM must be greater than 0.');
      setTimeout(() => setErrorAlert(null), 3000);
      return;
    }

    let updatedPlan;
    if (editingPlanItemId) {
      updatedPlan = (activeVehicle.maintenancePlan || []).map(item => {
        if (item.id === editingPlanItemId) {
          return {
            ...item,
            name: planFormSubcategory,
            subcategory: planFormSubcategory,
            intervalKm: intervalVal,
            lastOdometer: lastOdoVal
          };
        }
        return item;
      });
    } else {
      const newItem: MaintenancePlanItem = {
        id: `plan_${Date.now()}`,
        name: planFormSubcategory,
        subcategory: planFormSubcategory,
        intervalKm: intervalVal,
        lastOdometer: lastOdoVal,
        isActive: true
      };
      updatedPlan = [...(activeVehicle.maintenancePlan || []), newItem];
    }

    const updatedVehicles = (userProfile.vehicles || []).map(v => {
      if (v.id === activeVehicle.id) {
        return {
          ...v,
          maintenancePlan: updatedPlan
        };
      }
      return v;
    });

    const updatedProfile = { ...userProfile, vehicles: updatedVehicles };
    onUpdateProfile(updatedProfile);

    // Reset Form
    setPlanFormSubcategory('oilChange');
    setPlanFormIntervalKm('10000');
    setPlanFormLastOdometer('');
    setEditingPlanItemId(null);
    setIsAddingPlanItem(false);

    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
  };

  const handleDeletePlanItem = (itemId: string) => {
    if (!activeVehicle) return;

    const updatedVehicles = (userProfile.vehicles || []).map(v => {
      if (v.id === activeVehicle.id) {
        return {
          ...v,
          maintenancePlan: (v.maintenancePlan || []).filter(item => item.id !== itemId)
        };
      }
      return v;
    });

    const updatedProfile = { ...userProfile, vehicles: updatedVehicles };
    onUpdateProfile(updatedProfile);

    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
  };

  const currentOdo = activeVehicle?.currentOdometer || 0;
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

      {/* Symmetrical Unified Dashboard Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-surface-container-lowest p-5 rounded-3xl border border-surface-container-high shadow-sm">
        <div className="flex flex-wrap items-center gap-4">
          {/* Sleek Period Filters */}
          <div className="inline-flex p-1 bg-surface-container-low rounded-xl border border-surface-container-high">
            {(['day', 'week', 'month', 'year'] as const).map((f) => (
              <button
                key={f}
                onClick={() => onFilterChange(f)}
                className={`px-4 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider font-headline transition-all ${
                  filter === f 
                    ? 'bg-primary text-on-primary shadow-sm scale-102' 
                    : 'text-on-surface-variant hover:bg-surface-container-high'
                }`}
              >
                {t(f)}
              </button>
            ))}
          </div>
        </div>

        {/* Symmetrical Date Navigator & Active Vehicle */}
        <div className="flex flex-wrap items-center gap-4">
          {/* Dynamic Compact Date Navigation Controls */}
          <div className="flex items-center bg-surface-container-low px-2 py-1 rounded-2xl border border-surface-container-high">
            <button 
              onClick={handlePrevPeriod}
              className="p-1.5 hover:bg-surface-container-high rounded-lg text-on-surface-variant active:scale-95 transition-all"
              title={language === 'pt-BR' ? 'Anterior' : 'Previous'}
            >
              <ChevronLeft size={16} />
            </button>
            
            <button
              onClick={() => setIsSelectorOpen(true)}
              className="px-3 py-1 bg-surface-container-lowest hover:bg-primary/5 active:scale-98 transition-all rounded-xl border border-surface-container-high text-xs font-black uppercase tracking-wider text-on-surface flex items-center gap-2 group mx-1 shadow-sm"
              title={language === 'pt-BR' ? 'Selecionar período' : 'Select period'}
            >
              <Calendar size={14} className="text-primary group-hover:scale-105 transition-transform" />
              <span>
                {filter === 'day' && new Date(selectedDate + 'T12:00:00').toLocaleDateString(language, { day: '2-digit', month: 'short' })}
                {filter === 'week' && `${getWeekRangeLabel(selectedYear, selectedWeek)} • ${selectedYear}`}
                {filter === 'month' && new Date(selectedYear, selectedMonth).toLocaleDateString(language, { month: 'long' }).toUpperCase()}
                {filter === 'year' && selectedYear}
              </span>
            </button>

            <button 
              onClick={handleNextPeriod}
              className="p-1.5 hover:bg-surface-container-high rounded-lg text-on-surface-variant active:scale-95 transition-all"
              title={language === 'pt-BR' ? 'Próximo' : 'Next'}
            >
              <ChevronRight size={16} />
            </button>
          </div>

          {/* Quick Return to Current Period Button if drifted */}
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
              returnLabel = language === 'pt-BR' ? 'Hoje' : t('returnToToday');
              onReturn = () => {
                onSelectedDateChange(todayStr);
                onSelectedMonthChange(currentMonth);
                onSelectedYearChange(currentYear);
              };
            } else if (filter === 'week' && (selectedWeek !== currentWeek || selectedYear !== currentYear)) {
              isDifferent = true;
              returnLabel = language === 'pt-BR' ? 'Atual' : t('returnToCurrentWeek');
              onReturn = () => {
                onSelectedWeekChange(currentWeek);
                onSelectedMonthChange(getMonthFromWeek(currentYear, currentWeek));
                onSelectedYearChange(currentYear);
              };
            } else if (filter === 'month' && (selectedMonth !== currentMonth || selectedYear !== currentYear)) {
              isDifferent = true;
              returnLabel = language === 'pt-BR' ? 'Este Mês' : t('returnToCurrentMonth');
              onReturn = () => {
                onSelectedMonthChange(currentMonth);
                onSelectedYearChange(currentYear);
              };
            } else if (filter === 'year' && selectedYear !== currentYear) {
              isDifferent = true;
              returnLabel = language === 'pt-BR' ? 'Este Ano' : t('returnToCurrentYear');
              onReturn = () => onSelectedYearChange(currentYear);
            }

            if (!isDifferent) return null;

            return (
              <motion.button
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                onClick={onReturn}
                className="px-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1 transition-colors border border-primary/10 shadow-sm"
              >
                <RotateCcw size={10} />
                {returnLabel}
              </motion.button>
            );
          })()}

          {/* Symmetrical Active Vehicle Option Select */}
          {userProfile?.vehicles && userProfile.vehicles.length > 0 && (
            <div className="bg-surface-container-low px-3 py-1.5 rounded-2xl border border-surface-container-high flex items-center gap-2 max-w-[170px] shadow-sm">
              <CarTaxiFront size={14} className="text-primary shrink-0" />
              <div className="relative w-full overflow-hidden">
                <select
                  value={activeVehicleId || ''}
                  onChange={(e) => onActiveVehicleChange(e.target.value)}
                  className="bg-transparent text-xs font-black text-on-surface outline-none appearance-none cursor-pointer pr-5 truncate w-full"
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
      </div>

      {/* Hero Section - Compact Real Profit Card */}
      <section className="relative">
        <div className="bg-surface-container-lowest rounded-3xl p-6 md:p-8 shadow-sm border border-surface-container-high relative group overflow-hidden">
          
          <div className="w-full flex justify-between items-start mb-4">
            <div className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest ${!closed ? 'bg-orange-50 text-orange-600 border border-orange-100' : 'bg-neutral-100 text-neutral-400 border border-neutral-200'}`}>
              {!closed ? t('inProgress') : t('closedPeriod')}
            </div>
            <button 
              onClick={onPrivacyToggle}
              className="group focus:outline-none"
            >
              {isPrivacyActive ? (
                 <EyeOff size={18} className="text-neutral-400 group-hover:text-primary transition-colors" />
              ) : (
                 <Eye size={18} className="text-neutral-400 group-hover:text-primary transition-colors" />
              )}
            </button>
          </div>

          <div className="text-center mb-6 w-full flex flex-col items-center">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-400 mb-1">{t('realProfit')}</p>
            <h1 className="text-4xl md:text-5xl font-black font-headline text-primary tracking-tighter data-privacy-mask leading-tight text-center">
              {t('currencySymbol')} {formatLocaleCurrency(realProfit, language)}
            </h1>
            
            {profitChange !== null && (
              <div className={`mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider ${profitChange >= 0 ? 'bg-secondary/10 text-secondary' : 'bg-error/10 text-error'} shadow-sm`}>
                {profitChange >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                {t(profitChange >= 0 ? 'increaseOf' : 'decreaseOf')} {Math.abs(profitChange)}% {t('moreThanPrevPeriod').replace('{period}', t(filter === 'day' ? 'yesterday' : filter === 'week' ? 'prevWeek' : filter === 'month' ? 'prevMonth' : 'prevYear'))}
              </div>
            )}

            {filter === 'year' && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-4 p-2.5 bg-primary/5 rounded-xl border border-primary/10 inline-flex flex-col items-center gap-0.5 group/tax relative cursor-default"
              >
                <div className="flex items-center gap-1.5 text-primary/70">
                  <Info size={12} />
                  <span className="text-[9px] font-black uppercase tracking-widest">{t('incomeTax')}</span>
                </div>
                <p className="text-base font-black text-primary data-privacy-mask">
                  {t('currencySymbol')} {formatLocaleCurrency(grossEarnings * 0.6, language)}
                </p>
                
                {/* Tooltip */}
                <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 w-64 p-3 bg-on-surface text-surface text-[10px] font-bold rounded-xl opacity-0 group-hover/tax:opacity-100 transition-all duration-200 pointer-events-none text-center shadow-2xl z-[60] border border-surface/10 leading-relaxed">
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
              <p className="text-2xl md:text-3xl font-black font-headline text-secondary data-privacy-mask leading-none">{t('currencySymbol')} {formatLocaleCurrency(grossEarnings, language)}</p>
              {grossChange !== null && (
                <div className={`mt-2 flex items-center justify-center md:justify-start gap-1.5 text-[11px] font-black uppercase tracking-wider ${grossChange >= 0 ? 'text-secondary' : 'text-error'}`}>
                  {grossChange >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                  <span>{t(grossChange >= 0 ? 'increaseOf' : 'decreaseOf')} {Math.abs(grossChange)}% {vsPrevPeriodLabel}</span>
                </div>
              )}
            </div>
            
            {/* Goal - Gauge Style */}
            <div className="flex flex-col items-center justify-center order-1 md:order-2">
              <div className="relative flex items-center justify-center w-40 h-24 overflow-hidden">
                <svg className="w-40 h-40 absolute top-0" viewBox="0 0 100 100">
                  {/* Background Gauge */}
                  <path
                    d="M 12 50 A 38 38 0 0 1 88 50"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="6"
                    strokeLinecap="round"
                    className="text-surface-container-high/40"
                  />
                  {/* Progress Gauge */}
                  <motion.path
                    d="M 12 50 A 38 38 0 0 1 88 50"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="8"
                    strokeLinecap="round"
                    className="text-primary"
                    strokeDasharray="119.38" // PI * 38 approx
                    initial={{ strokeDashoffset: 119.38 }}
                    animate={{ strokeDashoffset: 119.38 * (1 - progressPercent / 100) }}
                    transition={{ duration: 1.8, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
                  />
                </svg>
                
                {/* Central Percentage Display */}
                <div className="absolute top-[60%] left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 text-center flex flex-col items-center">
                  <span className="text-xl font-black font-headline text-on-surface">
                    {Math.round(progressPercent)}%
                  </span>
                </div>
              </div>
              
              {/* Symmetrical Legend Texts moved down to align proportions and eliminate overlap */}
              <div className="flex flex-col items-center gap-1.5 mt-3 text-center">
                {!isGoalDefined ? (
                  <span className="text-xs font-black text-on-surface-variant uppercase tracking-wider">
                    {t('noGoalSet') || 'Sem Meta Definida'}
                  </span>
                ) : remainingValue > 0 ? (
                  <div className="flex flex-col items-center gap-1">
                    <span className="font-black text-neutral-400 uppercase tracking-wider text-xs sm:text-sm">
                      {t('goal')}: <span className="text-on-surface font-black">{t('currencySymbol')}{formatLocaleCurrency(currentGoal, language)}</span>
                    </span>
                    <span className="font-bold text-on-surface uppercase tracking-wider text-xs sm:text-sm">
                      {t('left')}: <span className="text-primary font-black">{t('currencySymbol')}{formatLocaleCurrency(remainingValue, language)}</span>
                    </span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-1">
                    <span className="font-black text-secondary uppercase tracking-wider text-xs sm:text-sm flex items-center justify-center gap-1">
                      ✓ {t('goalCompleted')}
                    </span>
                    {surplusValue > 0 && (
                      <span className="font-bold text-secondary uppercase tracking-wider text-xs sm:text-sm">
                        +{t('currencySymbol')}{formatLocaleCurrency(surplusValue, language)}
                      </span>
                    )}
                    <span className="font-black text-neutral-400 uppercase tracking-wider text-xs sm:text-sm">
                      {t('goal')}: <span className="text-on-surface font-black">{t('currencySymbol')}{formatLocaleCurrency(currentGoal, language)}</span>
                    </span>
                  </div>
                )}

                {!isGoalDefined && (
                  <button 
                    onClick={() => onNavigate('settings')}
                    className="px-4 py-2 bg-primary/10 hover:bg-primary hover:text-on-primary text-primary font-black text-[10px] uppercase tracking-wider rounded-xl transition-all cursor-pointer mt-1"
                  >
                    {t('defineGoalBtn')}
                  </button>
                )}
              </div>
            </div>
            
            {/* Total Expenses */}
            <div className="text-center md:text-right order-3">
              <p className="text-[10px] font-black text-error uppercase tracking-[0.2em] mb-1">{t('totalExpenses')}</p>

              <p className="text-2xl md:text-3xl font-black font-headline text-error data-privacy-mask leading-none">
                {t('currencySymbol')} {formatLocaleCurrency(totalExpenses, language)}
              </p>
              {expenseChange !== null && (
                <div className={`mt-2 flex items-center justify-center md:justify-end gap-1.5 text-[11px] font-black uppercase tracking-wider ${expenseChange >= 0 ? 'text-error' : 'text-secondary'}`}>
                  {expenseChange >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                  <span>{t(expenseChange >= 0 ? 'increaseOf' : 'decreaseOf')} {Math.abs(expenseChange)}% {vsPrevPeriodLabel}</span>
                </div>
              )}
            </div>
          </div>

          {/* Registration Quick Actions */}
          <div className="w-full flex justify-center gap-4 mt-8">
            <button 
              onClick={() => onNavigate('add-income')}
              className="flex items-center justify-center gap-2 bg-secondary text-on-secondary px-5 py-2.5 rounded-full font-black text-xs uppercase tracking-wider shadow-md hover:shadow-lg hover:scale-102 active:scale-98 transition-all"
            >
              <ArrowUpCircle size={14} />
              {t('registerIncome')}
            </button>
            <button 
              onClick={() => onNavigate('add-expense')}
              className="flex items-center justify-center gap-2 bg-error text-white px-5 py-2.5 rounded-full font-black text-xs uppercase tracking-wider shadow-md hover:shadow-lg hover:scale-102 active:scale-98 transition-all"
            >
              <ArrowDownCircle size={14} />
              {t('registerExpense')}
            </button>
          </div>

        </div>
      </section>

      {/* Maintenance Plan Section */}
      {activeVehicle && (
        <div className="bg-surface-container-lowest rounded-3xl p-8 shadow-sm border border-surface-container-high space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-red-500/10 rounded-2xl text-red-500">
                <Wrench size={24} />
              </div>
              <div>
                <h3 className="text-xl font-black font-headline text-on-surface">
                  {t('maintenancePlan')}
                </h3>
                <p className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest opacity-50">
                  {activeVehicle.brand} {activeVehicle.model} • {activeVehicle.maintenancePlan?.length || 0} {language === 'pt-BR' ? 'itens monitorados' : 'items monitored'}
                </p>
              </div>
            </div>

            {!isAddingPlanItem && (
              <button
                onClick={() => {
                  setEditingPlanItemId(null);
                  setPlanFormSubcategory('oilChange');
                  setPlanFormIntervalKm('10000');
                  setPlanFormLastOdometer('');
                  setIsAddingPlanItem(true);
                }}
                className="flex items-center gap-2 px-5 py-3 bg-red-500 text-white font-black text-xs uppercase tracking-widest rounded-xl hover:scale-105 active:scale-95 transition-all self-start sm:self-auto shadow-md"
              >
                <Plus size={16} />
                {t('addMaintenanceItem')}
              </button>
            )}
          </div>

          <AnimatePresence mode="wait">
            {isAddingPlanItem ? (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-surface-container-low/50 p-6 rounded-2xl border border-outline-variant/10 space-y-6"
              >
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  {/* Item (Subcategory Selector) */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest px-1">
                      {t('item')}
                    </label>
                    <select
                      className="w-full bg-surface-container-lowest p-4 rounded-2xl text-sm font-bold border border-outline-variant/15 outline-none focus:ring-4 focus:ring-red-500/10 transition-all text-on-surface"
                      value={planFormSubcategory}
                      onChange={e => setPlanFormSubcategory(e.target.value)}
                    >
                      {MAINTENANCE_SUBCATEGORIES.map(sub => (
                        <option key={sub} value={sub}>
                          {t(sub)}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Interval in Km */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest px-1">
                      {t('planMaintenanceInterval')} (KM)
                    </label>
                    <input
                      type="number"
                      className="w-full bg-surface-container-lowest p-4 rounded-2xl text-sm font-bold border border-outline-variant/15 outline-none focus:ring-4 focus:ring-red-500/10 transition-all text-on-surface"
                      placeholder="Ex: 10000"
                      value={planFormIntervalKm}
                      onChange={e => setPlanFormIntervalKm(e.target.value.replace(/\D/g, ''))}
                    />
                  </div>

                  {/* Last Service Odometer */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest px-1">
                      {t('lastChangeOdo')}
                    </label>
                    <input
                      type="number"
                      className="w-full bg-surface-container-lowest p-4 rounded-2xl text-sm font-bold border border-outline-variant/15 outline-none focus:ring-4 focus:ring-red-500/10 transition-all text-on-surface"
                      placeholder={`Opcional (Ex: ${activeVehicle.currentOdometer || 0})`}
                      value={planFormLastOdometer}
                      onChange={e => setPlanFormLastOdometer(e.target.value.replace(/\D/g, ''))}
                    />
                  </div>

                  {/* Next Maintenance Odometer display */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest px-1">
                      {language === 'pt-BR' ? 'Próxima Manutenção em' : 'Next Maintenance at'}
                    </label>
                    <input
                      type="text"
                      className="w-full bg-surface-container-lowest/60 p-4 rounded-2xl text-sm font-bold border border-outline-variant/15 outline-none text-primary cursor-not-allowed opacity-[0.85]"
                      disabled
                      value={calculatedNextKm !== null ? `${calculatedNextKm.toLocaleString(language)} KM` : '--'}
                    />
                  </div>
                </div>

                {errorAlert && (
                  <div className="p-4 bg-error/10 text-error rounded-xl font-bold text-sm">
                    {errorAlert}
                  </div>
                )}

                <div className="flex justify-end gap-3 pt-4 border-t border-outline-variant/10">
                  <button
                    onClick={() => {
                      setIsAddingPlanItem(false);
                      setEditingPlanItemId(null);
                    }}
                    className="px-5 py-2.5 text-on-surface-variant font-black text-xs uppercase tracking-widest hover:bg-surface-container-high rounded-xl transition-all"
                  >
                    {t('cancel')}
                  </button>
                  <button
                    onClick={handleSavePlanItem}
                    className="px-8 py-3 bg-red-500 text-white font-black text-xs uppercase tracking-widest rounded-xl hover:scale-[0.98] transition-all shadow-md"
                  >
                    {editingPlanItemId 
                      ? (language === 'pt-BR' ? 'Atualizar Item' : 'Update Item') 
                      : (language === 'pt-BR' ? 'Salvar Item' : 'Save Item')}
                  </button>
                </div>
              </motion.div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {(activeVehicle.maintenancePlan || []).map(item => {
                  const currentKm = activeVehicle.currentOdometer || 0;
                  const lastKm = item.lastOdometer || 0;
                  const elapsedKm = Math.max(0, currentKm - lastKm);
                  const ratio = item.intervalKm > 0 ? elapsedKm / item.intervalKm : 0;
                  const percentage = Math.round(Math.min(100, ratio * 100));

                  const nextKm = lastKm + item.intervalKm;
                  const kmRemaining = nextKm - currentKm;
                  const isOverdue = kmRemaining <= 0;

                  // Circle stroke calculations
                  const radius = 28;
                  const strokeWidth = 5;
                  const normalizedRadius = radius - strokeWidth;
                  const circumference = normalizedRadius * 2 * Math.PI;
                  const strokeDashoffset = circumference - (percentage / 100) * circumference;

                  // Colors: red if overdue or >= 80%, yellow if 70-79%, green otherwise
                  const isRed = isOverdue || percentage >= 80;
                  const isYellow = !isRed && (percentage >= 70 && percentage <= 79);

                  const themeColorClass = isRed 
                    ? 'text-red-500' 
                    : isYellow
                      ? 'text-yellow-500' 
                      : 'text-emerald-500';

                  const circleColorClass = isRed 
                    ? 'stroke-red-500' 
                    : isYellow
                      ? 'stroke-yellow-500' 
                      : 'stroke-emerald-500';

                  return (
                    <div 
                      key={item.id}
                      className="bg-surface-container-low p-5 rounded-2xl border border-surface-container-high flex items-center justify-between gap-4 hover:border-red-500/20 transition-all shadow-sm"
                    >
                      {/* Left Side: Circular Progress */}
                      <div className="flex items-center gap-4">
                        <div className="relative flex items-center justify-center w-14 h-14">
                          <svg className="w-14 h-14 transform -rotate-90">
                            {/* Background Track */}
                            <circle
                              className="text-surface-container-highest stroke-surface-container-highest"
                              strokeWidth={strokeWidth}
                              fill="transparent"
                              r={normalizedRadius}
                              cx={radius}
                              cy={radius}
                            />
                            {/* Live Fill */}
                            <circle
                              className={`${circleColorClass} transition-all duration-300`}
                              strokeWidth={strokeWidth}
                              strokeDasharray={circumference}
                              strokeDashoffset={strokeDashoffset}
                              strokeLinecap="round"
                              fill="transparent"
                              r={normalizedRadius}
                              cx={radius}
                              cy={radius}
                            />
                          </svg>
                          <span className={`absolute text-[10px] font-black ${themeColorClass}`}>
                            {percentage}%
                          </span>
                        </div>

                        {/* Mid Section: Name, interval, target */}
                        <div className="flex flex-col min-w-0">
                          <h4 className="font-extrabold text-sm text-on-surface truncate pr-2">
                            {t(item.name || item.subcategory)}
                          </h4>
                          
                          {/* Marker distance - Restam / Atrasado on top */}
                          {isOverdue ? (
                            <span className="text-xs font-black text-red-500 mt-1 flex items-center gap-1">
                              <AlertTriangle size={12} />
                              {language === 'pt-BR' ? 'Atrasado' : 'Overdue'} {Math.abs(kmRemaining).toLocaleString(language)} KM
                            </span>
                          ) : (
                            <span className="text-xs font-black text-on-surface-variant mt-1">
                              {t('planRemainingKm') || 'Restam'}{' '}
                              <strong className={themeColorClass}>{kmRemaining.toLocaleString(language)} KM</strong>
                            </span>
                          )}

                          {/* Contrast with current and next odometer */}
                          <div className="mt-2 text-[10px] text-on-surface-variant/85 font-medium leading-normal space-y-0.5 border-t border-outline-variant/10 pt-1.5">
                            <div>
                              {language === 'pt-BR' ? 'Odômetro Atual:' : 'Current Odometer:'}{' '}
                              <span className="text-on-surface font-black">{currentKm.toLocaleString(language)} KM</span>
                            </div>
                            <div>
                              {language === 'pt-BR' ? 'Próxima Manutenção em:' : 'Next Maintenance at:'}{' '}
                              <span className="text-on-surface font-black">{nextKm.toLocaleString(language)} KM</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Right Side: Edit & Delete controls */}
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => {
                            setEditingPlanItemId(item.id);
                            setPlanFormSubcategory(item.subcategory || 'oilChange');
                            setPlanFormIntervalKm(item.intervalKm.toString());
                            setPlanFormLastOdometer(item.lastOdometer !== undefined ? item.lastOdometer.toString() : '');
                            setIsAddingPlanItem(true);
                          }}
                          className="p-2 text-on-surface-variant hover:text-primary hover:bg-primary/10 rounded-lg transition-all"
                          title={language === 'pt-BR' ? 'Editar' : 'Edit'}
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => handleDeletePlanItem(item.id)}
                          className="p-2 text-on-surface-variant hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                          title={t('delete')}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  );
                })}

                {(!activeVehicle.maintenancePlan || activeVehicle.maintenancePlan.length === 0) && (
                  <div className="col-span-full py-10 text-center bg-surface-container-low/30 rounded-2xl border border-dashed border-outline-variant/20">
                    <Wrench size={32} className="mx-auto text-on-surface-variant opacity-25 mb-3" />
                    <p className="text-xs font-black text-on-surface-variant opacity-50 uppercase tracking-widest">
                      {language === 'pt-BR' ? 'Nenhum item definido neste plano' : 'No items defined in this plan'}
                    </p>
                    <p className="text-[10px] text-on-surface-variant/70 mt-1">
                      {language === 'pt-BR' 
                        ? 'Adicione itens de manutenção frequente como óleo, pneus e pastilhas!' 
                        : 'Add common service items like oil, tires, and brake pads!'}
                    </p>
                  </div>
                )}
              </div>
            )}
          </AnimatePresence>
        </div>
      )}

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
                    <span className="font-black text-lg uppercase tracking-widest text-[#2e2e2e] dark:text-[#f3f3f3]">
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
                  
                  <div className="flex flex-col gap-2.5">
                    {monthWeeks.map(({ week, rangeLabel }) => {
                      const today = new Date();
                      const currentWeek = getWeekNumber(today);
                      const isCurrentWeek = week === currentWeek && selectedYear === today.getFullYear();
                      const isSelected = selectedWeek === week;

                      return (
                        <button
                          key={week}
                          onClick={() => {
                            onSelectedWeekChange(week);
                            setIsSelectorOpen(false);
                          }}
                          className={`p-4 rounded-2xl text-left flex items-center justify-between border transition-all duration-200 cursor-pointer ${
                            isSelected
                              ? 'bg-primary/95 border-primary text-on-primary shadow-md scale-[1.01]'
                              : isCurrentWeek
                                ? 'bg-primary/5 border-primary/30 hover:border-primary/50 text-on-surface'
                                : 'bg-surface-container-low border-outline-variant/20 hover:border-outline-variant/60 text-on-surface'
                          }`}
                        >
                          <div className="flex flex-col">
                            <span className="text-sm font-black">
                              {rangeLabel}
                            </span>
                          </div>
                          
                          <div className={`p-1.5 rounded-xl transition-all ${
                            isSelected
                              ? 'bg-on-primary/15 text-on-primary'
                              : 'bg-surface-container-high text-on-surface-variant'
                          }`}>
                            <Calendar size={16} />
                          </div>
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
                      stat.isCustomInverted
                        ? (stat.change < 0 ? 'text-secondary' : 'text-error') // Verde (secondary) para redução, Vermelho (error) para aumento
                        : (stat.color === 'error' 
                          ? (stat.change > 0 ? 'text-error' : 'text-secondary') // For expenses, increase is bad (error), decrease is good (secondary)
                          : (stat.change > 0 ? 'text-secondary' : 'text-error')) // For other stats, increase is good (secondary), decrease is bad (error)
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
