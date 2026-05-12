import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { 
  BarChart3, 
  PieChart, 
  TrendingUp, 
  TrendingDown, 
  Calendar, 
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
  Car,
  LayoutGrid,
  ShoppingCart,
  Zap,
  Clock,
  CreditCard,
  Route,
  Timer,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Edit2,
  Trash2,
  Info,
  Paperclip,
  Download,
  FileSpreadsheet,
  FileJson,
  CheckCircle2,
  Tag,
  Target,
  Lock,
  FileUp,
  Sparkles
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  ResponsiveContainer,
  ComposedChart,
  BarChart,
  Bar,
  Line,
  Cell,
  LabelList,
  Legend
} from 'recharts';
import { motion, AnimatePresence } from 'motion/react';
import { SmartImportModal } from './SmartImportModal';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { DatePicker } from '../../components/ui/date-picker';
import { Screen, IncomeRecord, ExpenseRecord, Category, Platform, CATEGORIES, PLATFORMS } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import { parseLocaleNumber, formatLocaleCurrency } from '../lib/currency';
import { calculateFuelPerformance } from '../lib/fuel';

const iconMap: Record<string, any> = {
  Fuel, Wrench, Utensils, Key, SquareParking, Truck, Gavel, Milestone, Wifi, IdCard, Ship, FileText, Car, Tag, Target
};

interface ReportsScreenProps {
  incomes: IncomeRecord[];
  expenses: ExpenseRecord[];
  onNavigate: (screen: Screen, data?: any) => void;
  onDeleteIncome: (id: number) => void;
  onDeleteExpense: (id: number) => void;
  categories: Category[];
  platforms: Platform[];
  onSmartImport: (transactions: any[]) => void;
  userProfile?: any;
  startDate: string;
  onStartDateChange: (date: string) => void;
  endDate: string;
  onEndDateChange: (date: string) => void;
}

export function ReportsScreen({ 
  incomes: realIncomes, 
  expenses: realExpenses,
  onNavigate,
  onDeleteIncome,
  onDeleteExpense,
  categories,
  platforms,
  onSmartImport,
  userProfile,
  startDate,
  onStartDateChange,
  endDate,
  onEndDateChange
}: ReportsScreenProps) {
  const { t, language } = useLanguage();

  const FUEL_TYPES = [
    { id: 'gasolineCommon', name: t('gasolineCommon'), color: '#4CAF50' },
    { id: 'gasolineAdditive', name: t('gasolineAdditive'), color: '#FF9800' },
    { id: 'gasolinePremium', name: t('gasolinePremium'), color: '#E91E63' },
    { id: 'ethanol', name: t('ethanol'), color: '#FFEB3B' },
    { id: 'diesel', name: t('diesel'), color: '#795548' },
    { id: 'gnv', name: t('gnv'), color: '#2196F3' }
  ];

  const getLocalDateString = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [currentChart, setCurrentChart] = useState(0);
  const [showPerformanceLine, setShowPerformanceLine] = useState(false);

  const charts = [
    {
      id: 'profit',
      title: t('profit'),
      dataKey: 'profit',
      color: '#2196F3', // Blue
      icon: <TrendingUp size={20} className="text-primary" />,
    },
    {
      id: 'earnings',
      title: t('earnings'),
      dataKey: 'earnings',
      color: '#00C853', // Green
      icon: <BarChart3 size={20} className="text-secondary" />,
    },
    {
      id: 'expenses',
      title: t('expenses'),
      dataKey: 'expenses',
      color: '#FF5252', // Red
      icon: <TrendingDown size={20} className="text-error" />,
    }
  ];

  // Reset performance view when changing chart type
  useEffect(() => {
    if (charts[currentChart]?.id !== 'profit') {
      setShowPerformanceLine(false);
    }
  }, [currentChart, charts]);

  const [historyFilter, setHistoryFilter] = useState<'all' | 'income' | 'expense'>('all');
  const [showExportDropdown, setShowExportDropdown] = useState(false);
  const [activeSlide, setActiveSlide] = useState(0);
  const [isFuelExpanded, setIsFuelExpanded] = useState(true);
  const [fuelView, setFuelView] = useState<'full' | 'partial'>('full');
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  // Use real data (filtering future records)
  const incomes = useMemo(() => {
    const now = new Date();
    const todayStr = getLocalDateString(now);
    return realIncomes.filter(i => i.date <= todayStr);
  }, [realIncomes]);
  const expenses = useMemo(() => {
    const now = new Date();
    const todayStr = getLocalDateString(now);
    return realExpenses.filter(e => e.date <= todayStr);
  }, [realExpenses]);

  const isWithinDateRange = useCallback((dateStr: string) => {
    const d = new Date(dateStr);
    const start = new Date(startDate);
    const end = new Date(endDate);
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
    return d >= start && d <= end;
  }, [startDate, endDate]);

  const getEffectiveFuelType = (type: string | undefined) => {
    if (!type) return 'other';
    if (type === 'gasolineCommon' || type === 'gasolineAdditive' || type === 'gasolinePremium') {
      return 'gasoline';
    }
    return type;
  };

  const calculateConsumption = (currentRecord: ExpenseRecord) => {
    if (!currentRecord.isFullTank || !currentRecord.odometer || currentRecord.category !== 'fuel') return null;

    const currentType = getEffectiveFuelType(currentRecord.fuelType);

    // Use ALL fuel history to correctly find the immediate previous fill
    const fuelHistory = expenses
      .filter(e => e.category === 'fuel' && e.odometer)
      .sort((a, b) => {
        const dateA = new Date(a.date + 'T12:00:00').getTime();
        const dateB = new Date(b.date + 'T12:00:00').getTime();
        if (dateA !== dateB) return dateB - dateA;
        return parseLocaleNumber(b.odometer!, language) - parseLocaleNumber(a.odometer!, language);
      });

    const currentIndex = fuelHistory.findIndex(e => e.id === currentRecord.id);
    if (currentIndex === -1) return null;

    let previousFullTankIndex = -1;
    for (let i = currentIndex + 1; i < fuelHistory.length; i++) {
      if (fuelHistory[i].isFullTank) {
        previousFullTankIndex = i;
        break;
      }
    }

    if (previousFullTankIndex === -1) return null;

    const previousFullTank = fuelHistory[previousFullTankIndex];
    
    // REQUIREMENT: Current and previous full tank must be of the same compatible type (Gasoline types together, etc)
    if (getEffectiveFuelType(previousFullTank.fuelType) !== currentType) return null;

    const currentOdo = parseLocaleNumber(currentRecord.odometer, language);
    const prevOdo = parseLocaleNumber(previousFullTank.odometer!, language);
    
    if (currentOdo <= prevOdo) return null;

    const distance = currentOdo - prevOdo;
    
    // Sum liters from the current Full Tank record 
    // PLUS all Intermediate Partial Tank records between current and previous full
    const cycleRecords = fuelHistory.slice(currentIndex, previousFullTankIndex);
    
    let totalLiters = 0;
    for (const r of cycleRecords) {
      // REQUIREMENT: All intermediate records must also be of the same type
      if (getEffectiveFuelType(r.fuelType) !== currentType) return null;
      
      const l = parseLocaleNumber(r.liters || '0', language);
      const v = parseLocaleNumber(r.gnvVolume || '0', language);
      totalLiters += (l + v);
    }

    if (totalLiters === 0) return null;
    const result = distance / totalLiters;
    
    // Sanity check: ignore unrealistic values
    if (result > 50) return null;
    
    return result.toFixed(2);
  };

  const checkHasPartials = (currentRecord: ExpenseRecord, visibleOnly = false) => {
    if (!currentRecord.isFullTank || !currentRecord.odometer || currentRecord.category !== 'fuel') return false;

    const currentType = getEffectiveFuelType(currentRecord.fuelType);

    const fuelHistory = expenses
      .filter(e => e.category === 'fuel' && e.odometer)
      .sort((a, b) => {
        const dateA = new Date(a.date + 'T12:00:00').getTime();
        const dateB = new Date(b.date + 'T12:00:00').getTime();
        if (dateA !== dateB) return dateB - dateA;
        return parseLocaleNumber(b.odometer!, language) - parseLocaleNumber(a.odometer!, language);
      });

    const currentIndex = fuelHistory.findIndex(e => e.id === currentRecord.id);
    if (currentIndex === -1) return false;

    let previousFullTankIndex = -1;
    for (let i = currentIndex + 1; i < fuelHistory.length; i++) {
      if (fuelHistory[i].isFullTank) {
        previousFullTankIndex = i;
        break;
      }
    }

    if (previousFullTankIndex === -1) return false;
    
    // Cycle is broken if previous full tank is different type
    if (getEffectiveFuelType(fuelHistory[previousFullTankIndex].fuelType) !== currentType) return false;

    // A cycle has partials if there is at least one record between them in the SAME fuel stream
    const cycleRecords = fuelHistory.slice(currentIndex, previousFullTankIndex);
    
    // Any intermediate record of different type breaks the cycle
    if (cycleRecords.some(r => getEffectiveFuelType(r.fuelType) !== currentType)) return false;
    
    if (visibleOnly) {
      // Check if any of the associated partials (records strictly between current and previous full) are visible
      return cycleRecords.some((r, i) => i > 0 && isWithinDateRange(r.date));
    }
    
    return cycleRecords.length > 1;
  };

  const checkIsStartOfPartialCycle = (currentRecord: ExpenseRecord, visibleOnly = false) => {
    if (!currentRecord.isFullTank || !currentRecord.odometer || currentRecord.category !== 'fuel') return false;

    const currentType = getEffectiveFuelType(currentRecord.fuelType);

    const fuelHistory = expenses
      .filter(e => e.category === 'fuel' && e.odometer)
      .sort((a, b) => {
        const dateA = new Date(a.date + 'T12:00:00').getTime();
        const dateB = new Date(b.date + 'T12:00:00').getTime();
        if (dateA !== dateB) return dateB - dateA;
        return parseLocaleNumber(b.odometer!, language) - parseLocaleNumber(a.odometer!, language);
      });

    const currentIndex = fuelHistory.findIndex(e => e.id === currentRecord.id);
    if (currentIndex === -1 || currentIndex === 0) return false;

    // Check if the record immediately after chronologically (index - 1) is a partial
    const nextRecord = fuelHistory[currentIndex - 1];
    const isStart = !nextRecord.isFullTank && getEffectiveFuelType(nextRecord.fuelType) === currentType;
    
    if (visibleOnly && isStart) {
      // It's only a visible start if the partial it initiates is within the date range
      return isWithinDateRange(nextRecord.date);
    }
    
    return isStart;
  };

  const calculateCostPerKm = (currentRecord: ExpenseRecord) => {
    const consumption = calculateConsumption(currentRecord);
    if (!consumption) return null;
    
    const price = parseLocaleNumber(currentRecord.pricePerLiter || currentRecord.gnvPrice || '0', language);
    if (price === 0) return null;
    
    const cost = price / parseFloat(consumption);
    return cost.toFixed(2);
  };

  const parseCurrency = (val: string) => {
    return parseLocaleNumber(val, language);
  };

  const parseTime = (timeStr: string) => {
    if (!timeStr) return 0;
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours + (minutes / 60);
  };

  const { heroStats, detailedStats, mainValues, activeValue, workedDaysStat } = useMemo(() => {
    const isWithinFilter = (dateStr: string) => {
      const d = new Date(dateStr);
      const start = new Date(startDate);
      const end = new Date(endDate);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      return d >= start && d <= end;
    };

    const filteredIncomes = incomes.filter(i => isWithinFilter(i.date));
    const filteredExpenses = expenses.filter(e => isWithinFilter(e.date));

    const grossEarnings = filteredIncomes.reduce((acc, curr) => acc + curr.totalAmount, 0);
    const totalExpenses = filteredExpenses.reduce((acc, curr) => acc + parseCurrency(curr.amount), 0);
    
    const fixedExpenses = filteredExpenses.reduce((acc, curr) => {
      const cat = categories.find(c => c.id === curr.category);
      if (cat?.costType === 'fixed') return acc + parseCurrency(curr.amount);
      return acc;
    }, 0);
    
    const variableExpenses = totalExpenses - fixedExpenses;
    const contributionMargin = grossEarnings - variableExpenses;
    const marginPercentage = grossEarnings > 0 ? (contributionMargin / grossEarnings) * 100 : 0;
    const breakEvenPoint = marginPercentage > 0 ? (fixedExpenses / (marginPercentage / 100)) : (fixedExpenses + variableExpenses);

    const realProfit = Math.max(0, grossEarnings - totalExpenses);
    const totalTrips = filteredIncomes.reduce((acc, curr) => acc + curr.totalTrips, 0);
    const totalKm = filteredIncomes.reduce((acc, curr) => acc + (curr.kmDriven || 0), 0);
    const workedDays = new Set(filteredIncomes.map(i => i.date)).size;
    const totalHoursDecimal = filteredIncomes.reduce((acc, curr) => acc + parseTime(curr.hoursWorked), 0);

    const totalHours = Math.floor(totalHoursDecimal);
    const totalMinutes = Math.round((totalHoursDecimal - totalHours) * 60);
    const formattedHours = `${totalHours.toString().padStart(2, '0')}:${totalMinutes.toString().padStart(2, '0')}`;

    const activeChartData = [
      { id: 'profit', label: t('totalProfit'), value: realProfit, color: 'text-primary' },
      { id: 'earnings', label: t('totalEarnings'), value: grossEarnings, color: 'text-secondary' },
      { id: 'expenses', label: t('totalExpenses'), value: totalExpenses, color: 'text-error' }
    ][currentChart] || { id: 'none', label: '', value: 0, color: '' };

    const formatVal = (val: number) => {
      return formatLocaleCurrency(val, language);
    };

    const workedDaysStat = { label: t('workedDays'), value: workedDays.toString(), icon: Calendar, color: 'primary', isCurrency: false };

    return {
      activeValue: activeChartData,
      mainValues: {
        profit: realProfit,
        earnings: grossEarnings,
        expenses: totalExpenses,
        fixedExpenses,
        variableExpenses,
        marginPercentage,
        breakEvenPoint
      },
      detailedStats: [
        { label: t('totalTrips'), value: totalTrips.toString(), icon: Car, color: 'primary', isCurrency: false },
        { label: t('hoursWorked'), value: formattedHours, icon: Timer, color: 'primary', isCurrency: false },
        { label: t('kmDriven'), value: Math.round(totalKm).toString(), icon: Milestone, color: 'primary', isCurrency: false },
        { label: t('profitPerTrip').replace(' /', ' Méd /'), value: totalTrips > 0 ? formatVal(realProfit / totalTrips) : '0,00', icon: CreditCard, color: 'primary', isCurrency: true },
        { label: t('profitPerHour').replace(' /', ' Méd /'), value: totalHoursDecimal > 0 ? formatVal(realProfit / totalHoursDecimal) : '0,00', icon: Timer, color: 'primary', isCurrency: true },
        { label: t('profitPerKm').replace(' /', ' Méd /'), value: totalKm > 0 ? formatVal(realProfit / totalKm) : '0,00', icon: Route, color: 'primary', isCurrency: true },
        { label: t('earningPerTrip').replace(' /', ' Méd /'), value: totalTrips > 0 ? formatVal(grossEarnings / totalTrips) : '0,00', icon: TrendingUp, color: 'secondary', isCurrency: true },
        { label: t('earningPerHour').replace(' /', ' Méd /'), value: totalHoursDecimal > 0 ? formatVal(grossEarnings / totalHoursDecimal) : '0,00', icon: Clock, color: 'secondary', isCurrency: true },
        { label: t('earningPerKm').replace(' /', ' Méd /'), value: totalKm > 0 ? formatVal(grossEarnings / totalKm) : '0,00', icon: Zap, color: 'secondary', isCurrency: true },
        { label: t('expensePerTrip').replace(' /', ' Méd /'), value: totalTrips > 0 ? formatVal(totalExpenses / totalTrips) : '0,00', icon: ShoppingCart, color: 'error', isCurrency: true },
        { label: t('expensePerHour').replace(' /', ' Méd /'), value: totalHoursDecimal > 0 ? formatVal(totalExpenses / totalHoursDecimal) : '0,00', icon: TrendingDown, color: 'error', isCurrency: true },
        { label: t('expensePerKm').replace(' /', ' Méd /'), value: totalKm > 0 ? formatVal(totalExpenses / totalKm) : '0,00', icon: TrendingDown, color: 'error', isCurrency: true },
      ],
      workedDaysStat
    };
  }, [incomes, expenses, startDate, endDate, currentChart]);

  // Fuel Summary Logic for Reports
  const fuelExpenses = useMemo(() => {
    const isWithinFilter = (dateStr: string) => {
      const d = new Date(dateStr);
      const start = new Date(startDate);
      const end = new Date(endDate);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      return d >= start && d <= end;
    };
    return expenses.filter(e => e.category === 'fuel' && isWithinFilter(e.date));
  }, [expenses, startDate, endDate]);

  const fuelExpensesTotal = useMemo(() => {
    return fuelExpenses.reduce((acc, curr) => acc + parseCurrency(curr.amount), 0);
  }, [fuelExpenses]);

  const sortedFuelExpenses = useMemo(() => {
    return [...fuelExpenses].sort((a, b) => {
      const dateA = new Date(a.date + 'T12:00:00').getTime();
      const dateB = new Date(b.date + 'T12:00:00').getTime();
      return dateB - dateA;
    });
  }, [fuelExpenses]);

  const hasConsecutiveSameFuel = useMemo(() => {
    const fuelHistoryList = expenses
      .filter(e => e.category === 'fuel' && e.odometer)
      .sort((a, b) => {
        const dateA = new Date(a.date + 'T12:00:00').getTime();
        const dateB = new Date(b.date + 'T12:00:00').getTime();
        if (dateA !== dateB) return dateA - dateB;
        return parseLocaleNumber(a.odometer!, language) - parseLocaleNumber(b.odometer!, language);
      });
    
    for (let i = 1; i < fuelHistoryList.length; i++) {
      if (getEffectiveFuelType(fuelHistoryList[i].fuelType) === getEffectiveFuelType(fuelHistoryList[i-1].fuelType)) {
        return true;
      }
    }
    return false;
  }, [expenses, language]);

  const allValidFuelIds = useMemo(() => {
    const history = expenses
      .filter(e => e.category === 'fuel' && e.odometer)
      .sort((a, b) => {
        const dateA = new Date(a.date + 'T12:00:00').getTime();
        const dateB = new Date(b.date + 'T12:00:00').getTime();
        if (dateA !== dateB) return dateA - dateB;
        return parseLocaleNumber(a.odometer!, language) - parseLocaleNumber(b.odometer!, language);
      });

    const fullIds = new Set<number>();
    const partialIds = new Set<number>();

    for (let i = 0; i < history.length; i++) {
      const current = history[i];
      if (!current.isFullTank) continue;

      const type = getEffectiveFuelType(current.fuelType);
      let partialsInBetween: ExpenseRecord[] = [];
      
      for (let j = i + 1; j < history.length; j++) {
        const next = history[j];
        if (getEffectiveFuelType(next.fuelType) !== type) break;

        if (next.isFullTank) {
          // Success! Valid segment/cycle
          if (partialsInBetween.length === 0) {
            fullIds.add(current.id); // Add cycle start
            fullIds.add(next.id); // Pure full tank end
          } else {
            // Partial tank cycle
            partialIds.add(current.id);
            partialIds.add(next.id);
            partialsInBetween.forEach(p => partialIds.add(p.id));
          }
          // The next 'i' loop should probably resume from 'j' or 'j-1'
          // but fuel cycles can be overlapping (Full A -> Full B -> Full C)
          // i will increment naturally.
          break;
        } else {
          partialsInBetween.push(next);
        }
      }
    }
    return { fullIds, partialIds };
  }, [expenses, language]);

  const fuelStats = useMemo(() => {
    return fuelExpenses.reduce((acc, curr) => {
      const type = curr.fuelType || t('other');
      if (!acc[type]) {
        acc[type] = { count: 0, liters: 0, prices: [] as number[] };
      }
      acc[type].count += 1;
      acc[type].liters += parseLocaleNumber(curr.liters || curr.gnvVolume || '0', language);
      const price = parseLocaleNumber(curr.pricePerLiter || curr.gnvPrice || '0', language);
      if (price > 0) acc[type].prices.push(price);
      return acc;
    }, {} as Record<string, { count: number, liters: number, prices: number[] }>);
  }, [fuelExpenses, language, t]);

  const fuelTypes = Object.keys(fuelStats);

  const consumptionPerType = useMemo(() => {
    const perf = calculateFuelPerformance(realExpenses, language);
    const finalResults: Record<string, { value: string; date: string }> = {};
    
    if (perf.ethanol) {
      finalResults['ethanol'] = {
        value: perf.ethanol.kmPerLiter.toFixed(2),
        date: perf.ethanol.lastDate
      };
    }
    
    if (perf.gasoline) {
      finalResults['gasoline'] = {
        value: perf.gasoline.kmPerLiter.toFixed(2),
        date: perf.gasoline.lastDate
      };
    }

    return finalResults;
  }, [realExpenses, language]);

  const fuelChartData = useMemo(() => {
    return fuelExpenses
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .map((e) => ({
        id: e.id,
        date: e.date,
        displayDate: new Date(e.date + 'T12:00:00').toLocaleDateString(language, { day: '2-digit', month: 'short' }),
        liters: parseLocaleNumber(e.liters || e.gnvVolume || '0', language),
        price: e.pricePerLiter || e.gnvPrice || '0'
      }));
  }, [fuelExpenses, language]);

  const CustomFuelTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-surface-container-lowest p-3 rounded-xl border border-outline-variant shadow-xl">
          <p className="text-xs font-black text-neutral-500 uppercase mb-1">{label}</p>
          <p className="text-sm font-bold text-primary">{payload[0].value.toFixed(2)} {t('liters')}</p>
          {payload[0].payload && (
            <p className="text-xs font-bold text-neutral-400">{t('pricePerLiterShort')}: {t('currencySymbol')} {payload[0].payload.price}</p>
          )}
        </div>
      );
    }
    return null;
  };

  // Process data for charts based on date range
  const getCategoryName = (id: string) => {
    const cat = categories.find(c => c.id === id);
    if (!cat) return id;
    return cat.isDefault ? t(cat.id) : cat.name;
  };

  const getPlatformName = (id: string) => {
    const plat = platforms.find(p => p.id === id);
    if (!plat) return id;
    return plat.isDefault ? t(plat.id) : plat.name;
  };

  const chartData = useMemo(() => {
    const dataMap: Record<string, { date: string; earnings: number; expenses: number; profit: number; [key: string]: any }> = {};
    
    const isWithinFilter = (dateStr: string) => {
      const d = new Date(dateStr);
      const start = new Date(startDate);
      const end = new Date(endDate);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      return d >= start && d <= end;
    };

    // Process Incomes
    incomes.filter(i => isWithinFilter(i.date)).forEach(income => {
      if (!dataMap[income.date]) {
        dataMap[income.date] = { date: income.date, earnings: 0, expenses: 0, profit: 0 };
      }
      dataMap[income.date].earnings += income.totalAmount;
    });

    // Process Expenses
    expenses.filter(e => isWithinFilter(e.date)).forEach(expense => {
      if (!dataMap[expense.date]) {
        dataMap[expense.date] = { date: expense.date, earnings: 0, expenses: 0, profit: 0 };
      }
      const amount = parseLocaleNumber(expense.amount, language);
      const val = isNaN(amount) ? 0 : amount;
      dataMap[expense.date].expenses += val;

      if (expense.category === 'fuel') {
        const fType = expense.fuelType || t('other');
        if (!dataMap[expense.date][fType]) {
          dataMap[expense.date][fType] = 0;
        }
        dataMap[expense.date][fType] = (dataMap[expense.date][fType] as number) + val;

        // Aggregate liters
        const litersKey = fType + '_liters';
        if (!dataMap[expense.date][litersKey]) {
          dataMap[expense.date][litersKey] = 0;
        }
        const litersVal = fType === 'GNV' 
          ? parseLocaleNumber(expense.gnvVolume || '0', language)
          : parseLocaleNumber(expense.liters || '0', language);
        dataMap[expense.date][litersKey] += isNaN(litersVal) ? 0 : litersVal;
      }
    });

    // Calculate Profit and convert to array
    return Object.values(dataMap)
      .filter(d => d.earnings > 0 || d.expenses > 0)
      .map(d => {
        const profit = Math.max(0, d.earnings - d.expenses);
        const performance = d.earnings > 0 ? (profit / d.earnings) * 100 : 0;
        return {
          ...d,
          profit,
          performance,
          displayDate: d.date.split('-').reverse().slice(0, 2).join('/')
        };
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [incomes, expenses, startDate, endDate]);

  // Process data for platforms based on date range
  const platformData = useMemo(() => {
    const pMap: Record<string, { value: number; trips: number }> = {};
    let totalEarnings = 0;
    
    const isWithinFilter = (dateStr: string) => {
      const d = new Date(dateStr);
      const start = new Date(startDate);
      const end = new Date(endDate);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      return d >= start && d <= end;
    };

    incomes.filter(i => isWithinFilter(i.date)).forEach(income => {
      income.items.forEach(item => {
        if (!pMap[item.platform]) {
          pMap[item.platform] = { value: 0, trips: 0 };
        }
        const amount = parseLocaleNumber(item.amount, language);
        const val = isNaN(amount) ? 0 : amount;
        pMap[item.platform].value += val;
        pMap[item.platform].trips += Number(item.trips || 0);
        totalEarnings += val;
      });
    });

    // Calculate total expenses for the period to distribute proportionally
    let totalExpenses = 0;
    expenses.filter(e => isWithinFilter(e.date)).forEach(expense => {
      const amount = parseLocaleNumber(expense.amount, language);
      totalExpenses += isNaN(amount) ? 0 : amount;
    });

    return Object.entries(pMap)
      .map(([id, data]) => {
        const platform = platforms.find(p => p.id === id);
        // Proportional profit calculation
        const proportionalExpense = totalEarnings > 0 ? (data.value / totalEarnings) * totalExpenses : 0;
        const profit = Math.max(0, data.value - proportionalExpense);

        return {
          id,
          name: platform ? (platform.isDefault ? t(platform.id) : platform.name) : t('other'),
          value: data.value, // Earnings
          trips: data.trips,
          profit: profit,
          color: platform?.color || 'gray'
        };
      })
      .sort((a, b) => b.value - a.value);
  }, [incomes, expenses, startDate, endDate, platforms]);

  // Process data for expenses by category based on date range
  const categoryData = useMemo(() => {
    const isWithinFilter = (dateStr: string) => {
      const d = new Date(dateStr);
      const start = new Date(startDate);
      const end = new Date(endDate);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      return d >= start && d <= end;
    };

    const cMap: Record<string, number> = {};
    let totalExpenses = 0;
    
    // Calculate gross earnings for the period
    const totalGrossEarnings = incomes
      .filter(i => isWithinFilter(i.date))
      .reduce((acc, curr) => acc + curr.totalAmount, 0);

    expenses.filter(e => isWithinFilter(e.date)).forEach(expense => {
      if (!cMap[expense.category]) {
        cMap[expense.category] = 0;
      }
      const amount = parseLocaleNumber(expense.amount, language);
      const val = isNaN(amount) ? 0 : amount;
      cMap[expense.category] += val;
      totalExpenses += val;
    });

    return Object.entries(cMap)
      .map(([id, value]) => {
        const category = categories.find(c => c.id === id);
        return {
          id,
          name: category ? t(category.name) : t('other'),
          value: value,
          percentage: totalExpenses > 0 ? (value / totalExpenses) * 100 : 0,
          grossPercentage: totalGrossEarnings > 0 ? (value / totalGrossEarnings) * 100 : 0,
          icon: (category && iconMap[category.icon]) ? iconMap[category.icon] : FileText,
          color: 'error',
          costType: category?.costType || 'variable'
        };
      })
      .sort((a, b) => {
        if (a.costType !== b.costType) {
          return a.costType === 'fixed' ? -1 : 1;
        }
        return b.value - a.value;
      });
  }, [expenses, startDate, endDate, categories]);

  const { bestPerformance, worstPerformance } = useMemo(() => {
    const currentViewIds = fuelView === 'full' ? allValidFuelIds.fullIds : allValidFuelIds.partialIds;
    const measurements = sortedFuelExpenses
      .filter(e => currentViewIds.has(e.id))
      .map(item => {
        const consumption = calculateConsumption(item);
        return consumption ? parseFloat(consumption) : null;
      })
      .filter((v): v is number => v !== null);

    if (measurements.length === 0) return { bestPerformance: null, worstPerformance: null };

    return {
      bestPerformance: Math.max(...measurements).toFixed(2),
      worstPerformance: Math.min(...measurements).toFixed(2)
    };
  }, [sortedFuelExpenses, calculateConsumption, fuelView, allValidFuelIds]);

  const filteredPerformanceRecords = useMemo(() => {
    const currentViewIds = fuelView === 'full' ? allValidFuelIds.fullIds : allValidFuelIds.partialIds;
    return sortedFuelExpenses.filter(e => currentViewIds.has(e.id));
  }, [sortedFuelExpenses, fuelView, allValidFuelIds]);

  const hasValidHistoryOutsideRange = useMemo(() => {
    const currentViewIds = fuelView === 'full' ? allValidFuelIds.fullIds : allValidFuelIds.partialIds;
    return Array.from(currentViewIds).some(id => {
      const exp = expenses.find(e => e.id === id);
      return exp && !isWithinDateRange(exp.date);
    });
  }, [allValidFuelIds, fuelView, expenses, isWithinDateRange]);

  const activeChart = charts[currentChart];

  // Filter chart data to show only dates with values for the active chart
  const filteredChartData = useMemo(() => {
    if (activeChart.id === 'fuel') {
      return chartData.filter(d => FUEL_TYPES.some(f => (d[f.id + '_liters'] || 0) > 0));
    }
    return chartData.filter(d => (d[activeChart.dataKey] || 0) > 0);
  }, [chartData, activeChart]);

  const chartMinWidth = useMemo(() => {
    // Estimate 60px per data point to keep bars readable
    return Math.max(filteredChartData.length * 60, 300);
  }, [filteredChartData.length]);

  // Combine and sort by date for history
  const history = useMemo(() => {
    const isWithinFilter = (dateStr: string) => {
      const d = new Date(dateStr);
      const start = new Date(startDate);
      const end = new Date(endDate);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      return d >= start && d <= end;
    };

    const combined = [
      ...incomes.filter(i => isWithinFilter(i.date) && i.totalAmount > 0).map(i => ({ ...i, type: 'income' as const })),
      ...expenses.filter(e => {
        const amount = parseLocaleNumber(e.amount, language);
        return isWithinFilter(e.date) && !isNaN(amount) && amount > 0;
      }).map(e => ({ ...e, type: 'expense' as const }))
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    if (historyFilter === 'income') return combined.filter(item => item.type === 'income');
    if (historyFilter === 'expense') return combined.filter(item => item.type === 'expense');
    return combined;
  }, [incomes, expenses, startDate, endDate, historyFilter]);

  const exportToPDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    
    // Title
    doc.setFontSize(18);
    doc.text(t('reportTitle'), 14, 15);
    doc.setFontSize(10);
    doc.text(`${t('from')}: ${startDate} ${t('to')}: ${endDate}`, 14, 22);

    // Add Vehicle Information if available
    if (userProfile?.vehicle) {
      const v = userProfile.vehicle;
      doc.setFontSize(10);
      doc.setTextColor(100);
      let vInfo = `${t('vehicle')}: ${v.brand || ''} ${v.model || ''}`;
      if (v.type) vInfo += ` (${t(v.type)})`;
      if (v.plate) vInfo += ` - Placa: ${v.plate}`;
      if (v.tankCapacity) vInfo += ` - Tanque: ${v.tankCapacity}L`;
      doc.text(vInfo, 14, 28);
      doc.setTextColor(0);
    }

    // 1. Summary Section
    doc.setFontSize(14);
    doc.text(t('financialSummary'), 14, 35);
    const mainSummaryData = [
      [t('totalProfit'), `${t('currencySymbol')} ${formatLocaleCurrency(mainValues.profit, language)}`],
      [t('totalEarnings'), `${t('currencySymbol')} ${formatLocaleCurrency(mainValues.earnings, language)}`],
      [t('totalExpenses'), `${t('currencySymbol')} ${formatLocaleCurrency(mainValues.expenses, language)}`],
    ];
    autoTable(doc, {
      head: [[t('item'), t('amount')]],
      body: mainSummaryData,
      startY: 40,
      styles: { fontSize: 10, fontStyle: 'bold' },
      headStyles: { fillColor: [33, 150, 243] }
    });

    let finalY = (doc as any).lastAutoTable.finalY || 40;
    doc.setFontSize(14);
    doc.text(t('detailedStats'), 14, finalY + 15);
    const summaryData = detailedStats.map(s => [s.label, s.isCurrency ? `${t('currencySymbol')} ${s.value}` : s.value]);
    autoTable(doc, {
      head: [[t('item'), t('amount')]],
      body: summaryData,
      startY: finalY + 20,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [158, 158, 158] }
    });

    // 2. Platform Section
    finalY = (doc as any).lastAutoTable.finalY || finalY;
    doc.setFontSize(14);
    doc.text(t('earningsProfitByPlatform'), 14, finalY + 15);
    const pData = platformData.map(p => [
      p.name, 
      p.trips.toString(),
      `${t('currencySymbol')} ${formatLocaleCurrency(p.value, language)}`, 
      `${t('currencySymbol')} ${formatLocaleCurrency(p.profit, language)}`
    ]);
    autoTable(doc, {
      head: [[t('item'), t('trips'), t('earnings'), t('profit')]],
      body: pData,
      startY: finalY + 20,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [76, 175, 80] }
    });

    // 3. Category Section
    finalY = (doc as any).lastAutoTable.finalY || finalY;
    doc.setFontSize(14);
    doc.text(t('expensesByCategory'), 14, finalY + 15);
    const cData = categoryData.map(c => [
      c.name, 
      `${t('currencySymbol')} ${formatLocaleCurrency(c.value, language)}`, 
      `${c.percentage.toFixed(1)}%`,
      `${c.grossPercentage.toFixed(1)}%`
    ]);
    autoTable(doc, {
      head: [[t('item'), t('amount'), t('percentageExpenseVsTotal'), t('percentageExpenseVsEarnings')]],
      body: cData,
      startY: finalY + 20,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [244, 67, 54] }
    });

    // 4. Fuel Summary Section
    finalY = (doc as any).lastAutoTable.finalY || finalY;
    doc.setFontSize(14);
    doc.text(t('fuelSummary'), 14, finalY + 15);
    const fData = Object.keys(fuelStats).map(type => {
      const s = fuelStats[type];
      const avgPrice = s.prices.length > 0 ? s.prices.reduce((a, b) => a + b, 0) / s.prices.length : 0;
      const perf = consumptionPerType[getEffectiveFuelType(type)];
      return [
        t(type),
        s.count.toString(),
        `${s.liters.toFixed(1)}L`,
        `${t('currencySymbol')} ${avgPrice.toFixed(2)}`,
        perf ? `${perf.value} km/L` : '--'
      ];
    });
    autoTable(doc, {
      head: [[t('type'), t('fuelingCount'), t('totalLiters'), t('avgPrice'), t('performance')]],
      body: fData,
      startY: finalY + 20,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [255, 152, 0] }
    });

    // 5. History Section
    finalY = (doc as any).lastAutoTable.finalY || finalY;
    doc.addPage();
    doc.setFontSize(14);
    doc.text(t('history'), 14, 15);
    const tableData = history.map(item => [
      new Date(item.date + 'T12:00:00').toLocaleDateString(language),
      item.type === 'income' ? t('income') : t(item.category),
      item.type === 'income' ? `+ ${formatLocaleCurrency(item.totalAmount, language)}` : `- ${item.amount}`,
      item.notes || ''
    ]);

    autoTable(doc, {
      head: [[t('date'), t('item'), t('amount'), t('notes')]],
      body: tableData,
      startY: 20,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [33, 150, 243] }
    });

    doc.save(`relatorio_completo_${startDate}_${endDate}.pdf`);
    setShowExportDropdown(false);
  };

  const exportToExcel = () => {
    const workbook = XLSX.utils.book_new();

    // 1. Summary
    const summaryData: any[] = [
      { [t('item')]: t('totalProfit'), [t('amount')]: `${t('currencySymbol')} ${formatLocaleCurrency(mainValues.profit, language)}` },
      { [t('item')]: t('totalEarnings'), [t('amount')]: `${t('currencySymbol')} ${formatLocaleCurrency(mainValues.earnings, language)}` },
      { [t('item')]: t('totalExpenses'), [t('amount')]: `${t('currencySymbol')} ${formatLocaleCurrency(mainValues.expenses, language)}` },
      { [t('item')]: '---', [t('amount')]: '---' }
    ];

    if (userProfile?.vehicle) {
      summaryData.push({ [t('item')]: t('vehicle'), [t('amount')]: `${userProfile.vehicle.brand || ''} ${userProfile.vehicle.model || ''}` });
      summaryData.push({ [t('item')]: t('licensePlate'), [t('amount')]: userProfile.vehicle.plate || '' });
      summaryData.push({ [t('item')]: t('tankCapacity'), [t('amount')]: userProfile.vehicle.tankCapacity ? `${userProfile.vehicle.tankCapacity}L` : '' });
      summaryData.push({ [t('item')]: '---', [t('amount')]: '---' });
    }

    detailedStats.forEach(s => {
      summaryData.push({
        [t('item')]: s.label,
        [t('amount')]: s.isCurrency ? `${t('currencySymbol')} ${s.value}` : s.value
      });
    });

    const summarySheet = XLSX.utils.json_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(workbook, summarySheet, "Resumo");

    // 2. Platforms
    const pData = platformData.map(p => ({
      [t('item')]: p.name,
      [t('trips')]: p.trips,
      [t('earnings')]: p.value,
      [t('profit')]: p.profit
    }));
    const platformSheet = XLSX.utils.json_to_sheet(pData);
    XLSX.utils.book_append_sheet(workbook, platformSheet, "Plataformas");

    // 3. Categories
    const cData = categoryData.map(c => ({
      [t('item')]: c.name,
      [t('amount')]: c.value,
      [t('percentageExpenseVsTotal')]: `${c.percentage.toFixed(1)}%`,
      [t('percentageExpenseVsEarnings')]: `${c.grossPercentage.toFixed(1)}%`
    }));
    const categorySheet = XLSX.utils.json_to_sheet(cData);
    XLSX.utils.book_append_sheet(workbook, categorySheet, "Categorias");

    // 4. Fuel Summary
    const fData = Object.keys(fuelStats).map(type => {
      const s = fuelStats[type];
      const avgPrice = s.prices.length > 0 ? s.prices.reduce((a, b) => a + b, 0) / s.prices.length : 0;
      const perf = consumptionPerType[getEffectiveFuelType(type)];
      return {
        [t('type')]: t(type),
        [t('fuelingCount')]: s.count,
        [t('totalLiters')]: s.liters,
        [t('avgPrice')]: avgPrice,
        [t('performance')]: perf ? perf.value : '--'
      };
    });
    const fuelSheet = XLSX.utils.json_to_sheet(fData);
    XLSX.utils.book_append_sheet(workbook, fuelSheet, "Combustivel");

    // 5. History
    const hData = history.map(item => ({
      [t('date')]: new Date(item.date + 'T12:00:00').toLocaleDateString(language),
      [t('item')]: item.type === 'income' ? t('income') : t(item.category),
      [t('amount')]: item.type === 'income' ? item.totalAmount : parseLocaleNumber(item.amount, language),
      [t('notes')]: item.notes || ''
    }));
    const historySheet = XLSX.utils.json_to_sheet(hData);
    XLSX.utils.book_append_sheet(workbook, historySheet, "Historico");

    XLSX.writeFile(workbook, `relatorio_completo_${startDate}_${endDate}.xlsx`);
    setShowExportDropdown(false);
  };

  const exportToCSV = () => {
    // For CSV we'll combine all data into one flattened structure or just export history as it's the most common CSV use case
    // But to follow "all areas", we'll create a combined data array
    const combinedData = [
      { Section: '--- RESUMO FINANCEIRO ---', Date: '', Item: '', Amount: '', Notes: '' },
      { Section: 'Resumo', Date: '', Item: t('totalProfit'), Amount: `${t('currencySymbol')} ${formatLocaleCurrency(mainValues.profit, language)}`, Notes: '' },
      { Section: 'Resumo', Date: '', Item: t('totalEarnings'), Amount: `${t('currencySymbol')} ${formatLocaleCurrency(mainValues.earnings, language)}`, Notes: '' },
      { Section: 'Resumo', Date: '', Item: t('totalExpenses'), Amount: `${t('currencySymbol')} ${formatLocaleCurrency(mainValues.expenses, language)}`, Notes: '' },
      { Section: '', Date: '', Item: '', Amount: '', Notes: '' },
      { Section: '--- ESTATÍSTICAS DETALHADAS ---', Date: '', Item: '', Amount: '', Notes: '' },
      ...detailedStats.map(s => ({ Section: 'Estatística', Date: '', Item: s.label, Amount: s.value, Notes: '' })),
      { Section: '', Date: '', Item: '', Amount: '', Notes: '' },
      { Section: '--- PLATAFORMAS ---', Date: '', Item: '', Amount: '', Notes: '' },
      ...platformData.map(p => ({ Section: 'Plataforma', Date: '', Item: p.name, Amount: p.value, Notes: `Viagens: ${p.trips} | Lucro: ${p.profit}` })),
      { Section: '', Date: '', Item: '', Amount: '', Notes: '' },
      { Section: '--- CATEGORIAS ---', Date: '', Item: '', Amount: '', Notes: '' },
      ...categoryData.map(c => ({ Section: 'Categoria', Date: '', Item: c.name, Amount: c.value, Notes: `${c.percentage.toFixed(1)}% ${t('percentageExpenseVsTotal')} | ${c.grossPercentage.toFixed(1)}% ${t('percentageExpenseVsEarnings')}` })),
      { Section: '', Date: '', Item: '', Amount: '', Notes: '' },
      { Section: '--- COMBUSTÍVEL ---', Date: '', Item: '', Amount: '', Notes: '' },
      ...Object.keys(fuelStats).map(type => {
        const s = fuelStats[type];
        const avgPrice = s.prices.length > 0 ? s.prices.reduce((a, b) => a + b, 0) / s.prices.length : 0;
        const perf = consumptionPerType[getEffectiveFuelType(type)];
        return {
          Section: 'Combustivel',
          Date: '',
          Item: t(type),
          Amount: `${s.liters.toFixed(1)}L`,
          Notes: `Abastecimentos: ${s.count} | Média: ${avgPrice.toFixed(2)} | Desempenho: ${perf ? perf.value : '--'} km/L`
        };
      }),
      { Section: '', Date: '', Item: '', Amount: '', Notes: '' },
      { Section: '--- VEÍCULO ---', Date: '', Item: '', Amount: '', Notes: '' },
      ...(userProfile?.vehicle ? [
        { Section: 'Veiculo', Date: '', Item: 'Marca', Amount: userProfile.vehicle.brand || '', Notes: '' },
        { Section: 'Veiculo', Date: '', Item: 'Modelo', Amount: userProfile.vehicle.model || '', Notes: '' },
        { Section: 'Veiculo', Date: '', Item: 'Placa', Amount: userProfile.vehicle.plate || '', Notes: '' },
        { Section: 'Veiculo', Date: '', Item: 'Tanque', Amount: userProfile.vehicle.tankCapacity || '', Notes: '' }
      ] : []),
      { Section: '', Date: '', Item: '', Amount: '', Notes: '' },
      { Section: '--- HISTORICO ---', Date: '', Item: '', Amount: '', Notes: '' },
      ...history.map(item => ({
        Section: 'Historico',
        Date: new Date(item.date + 'T12:00:00').toLocaleDateString(language),
        Item: item.type === 'income' ? t('income') : t(item.category),
        Amount: item.type === 'income' ? item.totalAmount : parseLocaleNumber(item.amount, language),
        Notes: item.notes || ''
      }))
    ];

    const worksheet = XLSX.utils.json_to_sheet(combinedData);
    const csvOutput = XLSX.utils.sheet_to_csv(worksheet);
    const blob = new Blob([csvOutput], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `relatorio_completo_${startDate}_${endDate}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setShowExportDropdown(false);
  };

  return (
    <div className="space-y-10 pb-20">
      <header className="mb-10 text-center">
        <h2 className="text-4xl font-extrabold font-headline text-on-surface tracking-tight mb-2">{t('reports')}</h2>
        <p className="text-on-surface-variant font-body">{t('analyzePerformance')}</p>
      </header>

      {/* Chart Selection Section */}
      <section className="bg-surface-container-lowest p-4 md:p-8 rounded-[2.5rem] shadow-xl border border-surface-container-high relative">
        
        {/* Chart Selectors (Centered) */}
        <div className="flex justify-center mb-8">
          <div className="flex bg-surface-container-high p-1 rounded-xl">
            {charts.map((chart, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setCurrentChart(idx);
                  setShowPerformanceLine(false);
                }}
                className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                  currentChart === idx 
                    ? 'bg-surface-container-lowest text-primary shadow-sm' 
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                {chart.title}
              </button>
            ))}
          </div>
        </div>

        {/* Date Range Filter & Export (Centered above chart) */}
        <div className="flex flex-col items-center gap-6 mb-8">
          <div className="flex flex-col sm:flex-row items-center gap-3 bg-surface-container-low p-3 rounded-2xl shadow-sm border border-outline-variant/20">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">{t('from')}</span>
              <DatePicker 
                date={new Date(startDate + 'T12:00:00')}
                setDate={(d) => d && onStartDateChange(getLocalDateString(d))}
                className="w-[180px]"
              />
            </div>
            <div className="hidden sm:block w-4 h-px bg-outline-variant"></div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">{t('to')}</span>
              <DatePicker 
                date={new Date(endDate + 'T12:00:00')}
                setDate={(d) => d && onEndDateChange(getLocalDateString(d))}
                className="w-[180px]"
              />
            </div>
          </div>

          <div className="flex gap-3">
            <button
               onClick={() => setIsImportModalOpen(true)}
               className="flex items-center gap-2 px-6 py-3 bg-secondary text-on-secondary rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg hover:scale-[0.98] transition-all"
            >
              <FileUp size={18} />
              {t('import')}
            </button>

            <div className="relative">
              <button 
                onClick={() => setShowExportDropdown(!showExportDropdown)}
                className="flex items-center gap-2 px-6 py-3 bg-primary text-on-primary rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg hover:scale-[0.98] transition-all"
              >
                <Download size={18} />
                {t('export')}
                <ChevronDown size={16} className={`transition-transform duration-200 ${showExportDropdown ? 'rotate-180' : ''}`} />
              </button>

            <AnimatePresence>
              {showExportDropdown && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95, y: -10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -10 }}
                  className="absolute right-0 top-full mt-2 w-48 bg-surface-container-lowest border border-outline-variant/20 rounded-2xl shadow-2xl z-50 overflow-hidden"
                >
                  <button 
                    onClick={exportToPDF}
                    className="w-full px-4 py-4 text-left flex items-center gap-3 hover:bg-surface-container-low transition-colors border-b border-outline-variant/5"
                  >
                    <div className="w-8 h-8 flex items-center justify-center shrink-0">
                      <img 
                        src="https://img.icons8.com/color/48/pdf.png" 
                        alt="PDF" 
                        className="w-7 h-7 object-contain"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                    <span className="text-xs font-black uppercase tracking-tighter">PDF</span>
                  </button>
                  <button 
                    onClick={exportToExcel}
                    className="w-full px-4 py-4 text-left flex items-center gap-3 hover:bg-surface-container-low transition-colors border-b border-outline-variant/5"
                  >
                    <div className="w-8 h-8 flex items-center justify-center shrink-0">
                      <img 
                        src="https://img.icons8.com/color/48/microsoft-excel-2019.png" 
                        alt="Excel" 
                        className="w-7 h-7 object-contain"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                    <span className="text-xs font-black uppercase tracking-tighter">EXCEL</span>
                  </button>
                  <button 
                    onClick={exportToCSV}
                    className="w-full px-4 py-4 text-left flex items-center gap-3 hover:bg-surface-container-low transition-colors"
                  >
                    <div className="w-8 h-8 flex items-center justify-center shrink-0">
                      <img 
                        src="https://img.icons8.com/color/48/csv.png" 
                        alt="CSV" 
                        className="w-7 h-7 object-contain"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                    <span className="text-xs font-black uppercase tracking-tighter">CSV</span>
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

        <div className="mb-4 p-2 bg-primary/5 border border-primary/10 rounded-lg flex items-center justify-center gap-2">
          <p className="text-[10px] font-bold text-primary uppercase tracking-wider">
            {t('chartActivityNotice')}
          </p>
          <Info size={14} className="text-primary" />
        </div>

        <div className="h-[450px] w-full pt-4 relative">
          {!showPerformanceLine && (
            <div className="absolute top-4 left-4 z-20 text-left pointer-events-none bg-surface-container-lowest/80 backdrop-blur-sm p-2 rounded-lg border border-outline-variant/30">
              <p className="text-[8px] font-black uppercase tracking-[0.1em] text-on-surface-variant mb-0.5">{activeValue.label}</p>
              <h2 className={`text-lg md:text-xl font-black font-headline tracking-tight ${activeValue.color}`}>
                {t('currencySymbol')} {formatLocaleCurrency(activeValue.value, language)}
              </h2>
            </div>
          )}

          {activeChart.id === 'profit' && (
            <div className="absolute top-4 right-4 z-30 flex items-center gap-2">
              {!showPerformanceLine ? (
                <button 
                  onClick={() => setShowPerformanceLine(true)}
                  className="group flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all border border-yellow-400/30 bg-yellow-400/5 hover:bg-yellow-400/10 hover:border-yellow-400"
                >
                  <span className="text-[10px] font-black uppercase tracking-widest text-yellow-500">
                    {t('performance')}
                  </span>
                  <ChevronRight size={16} className="text-yellow-500 group-hover:translate-x-0.5 transition-transform" />
                </button>
              ) : (
                <button 
                  onClick={() => setShowPerformanceLine(false)}
                  className="group flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all border border-primary/30 bg-primary/5 hover:bg-primary/10 hover:border-primary"
                >
                  <ChevronLeft size={16} className="text-primary group-hover:-translate-x-0.5 transition-transform" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-primary">
                    VOLTAR
                  </span>
                </button>
              )}
            </div>
          )}

          <div className="h-full w-full overflow-x-auto custom-scrollbar pb-2">
            {filteredChartData.length > 0 ? (
              <div style={{ minWidth: chartMinWidth, height: '100%' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={filteredChartData} margin={{ top: 50, right: 65, left: 40, bottom: 60 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#6b7280" strokeOpacity={0.4} />
                    <XAxis 
                      dataKey="displayDate" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 10, fontWeight: 700, fill: '#666' }}
                      dy={10}
                      interval={0}
                      angle={-45}
                      textAnchor="end"
                    />
                    <YAxis 
                      hide
                      domain={[0, (max: number) => max > 0 ? max * 1.15 : 10]}
                    />
                    <YAxis 
                      yAxisId="right"
                      orientation="right"
                      hide
                      domain={[0, (max: number) => max > 0 ? max * 1.15 : 10]}
                    />

                    {activeChart.id === 'fuel' && (
                      <Legend 
                        verticalAlign="top" 
                        align="right" 
                        iconType="circle"
                        wrapperStyle={{ paddingBottom: '20px', fontSize: '10px', fontWeight: 'bold' }}
                      />
                    )}
                    {activeChart.id === 'fuel' ? (
                      FUEL_TYPES.map((f, idx) => (
                        <Bar 
                          key={f.id}
                          dataKey={f.id + '_liters'} 
                          name={f.name}
                          fill={f.color} 
                          radius={[4, 4, 0, 0]}
                          isAnimationActive={false}
                          barSize={30}
                        >
                          <LabelList 
                            dataKey={f.id + '_liters'} 
                            position="center" 
                            formatter={(value: number) => value > 0 ? `${value.toFixed(0)}${t('liters')}` : ''}
                            style={{ fontSize: '10px', fontWeight: '900', fill: '#fff' }}
                          />
                          <LabelList 
                            dataKey={f.id} 
                            position="top" 
                            formatter={(value: number) => value > 0 ? `${t('currencySymbol')} ${Math.round(value)}` : ''}
                            style={{ fontSize: '11px', fontWeight: '900', fill: f.color, stroke: '#fff', strokeWidth: 3, paintOrder: 'stroke' }}
                          />
                        </Bar>
                      ))
                    ) : (
                      <>
                        {!showPerformanceLine && (
                          <Bar 
                            dataKey={activeChart.dataKey} 
                            fill={activeChart.color} 
                            radius={[0, 0, 0, 0]}
                            isAnimationActive={false}
                            barSize={40}
                          >
                            <LabelList 
                              dataKey={activeChart.dataKey} 
                              position="top" 
                              formatter={(value: number) => value > 0 ? `${t('currencySymbol')} ${Math.round(value)}` : ''}
                              style={{ fontSize: '15px', fontWeight: '900', fill: activeChart.color, stroke: '#fff', strokeWidth: 4, paintOrder: 'stroke' }}
                            />
                          </Bar>
                        )}
                        {activeChart.id === 'profit' && showPerformanceLine && (
                          <Line
                            type="natural"
                            dataKey="performance"
                            stroke="#fbbf24" // yellow-400
                            strokeWidth={3}
                            dot={{ r: 5, fill: '#fbbf24', strokeWidth: 2, stroke: '#fff' }}
                            activeDot={{ r: 5, fill: '#fbbf24', strokeWidth: 2, stroke: '#fff' }}
                            yAxisId="right"
                            animationDuration={1000}
                          >
                            <LabelList 
                              dataKey="performance" 
                              position="top" 
                              formatter={(value: number) => `${value.toFixed(1)}%`}
                              style={{ fontSize: '15px', fontWeight: '900', fill: '#d97706', stroke: '#fff', strokeWidth: 4, paintOrder: 'stroke' }} // amber-600
                            />
                          </Line>
                        )}
                      </>
                    )}
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-on-surface-variant opacity-40">
                <BarChart3 size={48} className="mb-2" />
                <p className="font-bold">{t('noChartData')}</p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Detailed Statistics Section (Moved below Chart) */}
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
            <p className="text-lg font-black font-headline text-primary">
              {workedDaysStat.value}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {detailedStats.map((stat, i) => (
            <div key={i} className="flex items-center justify-between p-4 bg-surface-container-low rounded-[1.25rem] border border-outline-variant/10 hover:border-black/5 transition-all shadow-sm">
              <div className="flex items-center gap-3">
                <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">{stat.label}</p>
              </div>
              <p className={`text-sm font-black font-headline text-on-surface`}>
                {stat.isCurrency ? `${t('currencySymbol')} ${stat.value}` : stat.value}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Fuel Summary Section (Moved from Dashboard to Reports) */}
      <motion.section 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        <div className="flex items-center justify-between px-2">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-error/10 rounded-xl text-error">
              <Fuel size={24} />
            </div>
            <h3 className="font-headline font-bold text-2xl">{t('fuelSummary')}</h3>
          </div>
          <button 
            onClick={() => setIsFuelExpanded(!isFuelExpanded)}
            className="p-2 hover:bg-surface-container-high rounded-full transition-colors text-on-surface-variant"
          >
            {isFuelExpanded ? <ChevronUp size={24} /> : <ChevronDown size={24} />}
          </button>
        </div>

        <AnimatePresence>
          {isFuelExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="grid grid-cols-1 gap-6">
                {fuelExpenses.length > 0 ? (
                  <div className="w-full p-6 rounded-[2.5rem] bg-surface-container-lowest border border-surface-container-high shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-6 opacity-5">
                      <Fuel size={100} />
                    </div>
                    
                    <div className="space-y-6 relative z-10">
                      {/* Per Fuel Type Breakdown */}
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {Object.keys(fuelStats).map((type) => {
                          const stats = fuelStats[type];
                          const typeMax = stats.prices.length > 0 ? Math.max(...stats.prices) : 0;
                          const typeMin = stats.prices.length > 0 ? Math.min(...stats.prices) : 0;
                          const typeAvg = stats.prices.length > 0 ? stats.prices.reduce((a, b) => a + b, 0) / stats.prices.length : 0;

                          return (
                            <div key={type} className="space-y-3 p-4 rounded-2xl bg-surface-container-low/50 border border-outline-variant/5">
                              <div className="flex items-center justify-between">
                                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-error">{t(type)}</p>
                              </div>

                              <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-0.5">
                                  <p className="text-[8px] font-bold text-neutral-400 uppercase tracking-widest">{t('fuelingCount')}</p>
                                  <p className="text-lg font-black font-headline text-on-surface">{stats.count}</p>
                                </div>
                                <div className="space-y-0.5">
                                  <p className="text-[8px] font-bold text-neutral-400 uppercase tracking-widest">{t('totalLiters')}</p>
                                  <p className="text-lg font-black font-headline text-on-surface">{Math.round(stats.liters)}L</p>
                                </div>
                              </div>

                              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-outline-variant/5">
                                <div className="space-y-0.5">
                                  <p className="text-[9px] font-bold text-neutral-400 uppercase tracking-tight">{t('minPrice')}</p>
                                  <p className="text-lg font-black text-secondary">{t('currencySymbol')} {formatLocaleCurrency(typeMin, language)}</p>
                                </div>
                                <div className="space-y-0.5 border-l border-outline-variant/10 pl-2">
                                  <p className="text-[9px] font-bold text-neutral-400 uppercase tracking-tight">{t('maxPrice')}</p>
                                  <p className="text-lg font-black text-error">{t('currencySymbol')} {formatLocaleCurrency(typeMax, language)}</p>
                                </div>
                                <div className="space-y-0.5 border-l border-outline-variant/10 pl-2">
                                  <p className="text-[9px] font-bold text-neutral-400 uppercase tracking-tight">{t('avgPrice')}</p>
                                  <p className="text-lg font-black text-on-surface">{t('currencySymbol')} {formatLocaleCurrency(typeAvg, language)}</p>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Final Summary Separator */}
                      <div className="mt-6 pt-6 border-t-2 border-black">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-on-surface flex items-center gap-2">
                            <CheckCircle2 size={12} className="text-secondary" />
                            {t('finalSummary')}
                          </p>
                        </div>
                        
                        {(() => {
                          const statsValues = Object.values(fuelStats) as { count: number, liters: number, prices: number[] }[];
                          const totalLiters = statsValues.reduce((acc, curr) => acc + curr.liters, 0);
                          const totalCount = statsValues.reduce((acc, curr) => acc + curr.count, 0);
                          const allPrices = statsValues.flatMap(s => s.prices);
                          const maxPrice = allPrices.length > 0 ? Math.max(...allPrices) : 0;
                          const minPrice = allPrices.length > 0 ? Math.min(...allPrices) : 0;
                          const avgPrice = allPrices.length > 0 ? allPrices.reduce((a, b) => a + b, 0) / allPrices.length : 0;

                          return (
                            <div className="grid grid-cols-2 lg:grid-cols-5 gap-y-4 gap-x-6">
                              <div className="space-y-0.5">
                                <p className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest">{t('fuelingCount')}</p>
                                <p className="text-2xl font-black font-headline text-on-surface">{totalCount}</p>
                              </div>
                              
                              <div className="space-y-0.5">
                                <p className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest">{t('totalLiters')}</p>
                                <p className="text-2xl font-black font-headline text-on-surface">{Math.round(totalLiters)}L</p>
                              </div>

                              <div className="space-y-0.5 border-l border-outline-variant/20 pl-6">
                                <p className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest">{t('minPrice')}</p>
                                <p className="text-lg font-black font-headline text-secondary">{t('currencySymbol')} {formatLocaleCurrency(minPrice, language)}</p>
                              </div>

                              <div className="space-y-0.5 border-l border-outline-variant/20 pl-6">
                                <p className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest">{t('maxPrice')}</p>
                                <p className="text-lg font-black font-headline text-error">{t('currencySymbol')} {formatLocaleCurrency(maxPrice, language)}</p>
                              </div>

                              <div className="space-y-0.5 border-l border-outline-variant/20 pl-6">
                                <p className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest">{t('avgPrice')}</p>
                                <p className="text-lg font-black font-headline text-on-surface">{t('currencySymbol')} {formatLocaleCurrency(avgPrice, language)}</p>
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-surface-container-low border-2 border-dashed border-outline-variant/30 rounded-[2.5rem] p-10 text-center space-y-4">
                    <div className="inline-flex p-4 bg-surface-container-high rounded-full text-neutral-400">
                      <Fuel size={32} />
                    </div>
                    <div className="space-y-1">
                      <p className="text-neutral-500 font-black uppercase text-[10px] tracking-widest leading-relaxed">
                        {expenses.some(e => e.category === 'fuel') ? t('butHaveHistoryOutside') : t('noHistory')}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Performance Card (Always visible) */}
        <div className="p-6 rounded-[2.5rem] bg-surface-container-lowest border border-surface-container-high shadow-sm">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                    <div className="space-y-1">
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-secondary flex items-center gap-2">
                        <Zap size={12} />
                        {t('performanceByFuel')}
                      </p>
                    </div>

                    {/* Selectors */}
                    <div className="flex p-1 bg-surface-container-low rounded-xl">
                      <button
                        onClick={() => setFuelView('full')}
                        className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${
                          fuelView === 'full' 
                            ? 'bg-secondary text-on-secondary shadow-sm' 
                            : 'text-on-surface-variant hover:bg-surface-container-high'
                        }`}
                      >
                        {t('fullTank')}
                      </button>
                      <button
                        onClick={() => setFuelView('partial')}
                        className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${
                          fuelView === 'partial' 
                            ? 'bg-secondary text-on-secondary shadow-sm' 
                            : 'text-on-surface-variant hover:bg-surface-container-high'
                        }`}
                      >
                        {t('partialTank')}
                      </button>
                    </div>
                  </div>

                  {/* Best vs Worst Performance */}
                  {hasConsecutiveSameFuel && (bestPerformance || worstPerformance) && (
                    <div className="flex justify-center gap-4 mb-8">
                      {bestPerformance && (
                        <div className="flex-1 max-w-[180px] bg-blue-500/10 p-4 rounded-2xl border border-blue-500/20 text-center">
                          <p className="text-[9px] font-bold text-blue-600 uppercase tracking-widest mb-1">{t('bestPerformance')}</p>
                          <p className="text-2xl font-black text-blue-700">{bestPerformance} <span className="text-xs">km/L</span></p>
                        </div>
                      )}
                      {worstPerformance && (
                        <div className="flex-1 max-w-[180px] bg-red-500/10 p-4 rounded-2xl border border-red-500/20 text-center">
                          <p className="text-[9px] font-bold text-red-600 uppercase tracking-widest mb-1">{t('worstPerformance')}</p>
                          <p className="text-2xl font-black text-red-700">{worstPerformance} <span className="text-xs">km/L</span></p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Fuel History List */}
                  <div className="max-h-[600px] overflow-y-auto pr-2 custom-scrollbar relative">
                    {filteredPerformanceRecords.length > 0 ? (
                      <div className="space-y-2">
                        <div className="flex items-center px-4 py-3 text-[10px] font-black text-on-secondary uppercase tracking-widest border-b border-secondary/20 sticky top-0 bg-secondary shadow-md z-20 rounded-lg">
                          <div className="w-16 shrink-0">{t('date')}</div>
                          <div className="flex-1">{t('fuel')}</div>
                          <div className="w-16 text-center">{t('quantity')}</div>
                          <div className="w-16 text-center">KM/L</div>
                          <div className="w-24 text-right">{t('costPerKm')}</div>
                        </div>
                        {filteredPerformanceRecords.map((item) => {
                          const consumption = calculateConsumption(item);
                          const costPerKm = calculateCostPerKm(item);
                          return (
                            <div key={item.id} className={`flex items-center px-4 py-4 rounded-xl border transition-all ${
                              consumption === bestPerformance && bestPerformance !== null ? 'bg-blue-500/20 border-blue-500/40 shadow-sm' : 
                              consumption === worstPerformance && worstPerformance !== null ? 'bg-red-500/20 border-red-500/40 shadow-sm' : 
                              'bg-surface-container-low border-outline-variant/5 hover:border-black/10'
                            }`}>
                              <div className="w-16 shrink-0">
                                <p className="text-xs font-black text-black uppercase">
                                  {new Date(item.date + 'T12:00:00').toLocaleDateString(language, { day: '2-digit', month: '2-digit' })}
                                </p>
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center gap-1.5">
                                  <p className="text-xs font-black text-black truncate uppercase">{t(item.fuelType || 'other')}</p>
                                  {fuelView === 'partial' && item.isFullTank && (
                                    <>
                                      {checkIsStartOfPartialCycle(item, true) && (
                                        <span className="text-[7px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-black uppercase tracking-tighter border border-primary/20">
                                          {t('cycleStart')}
                                        </span>
                                      )}
                                      {consumption && !checkIsStartOfPartialCycle(item, true) && (
                                        <span className="text-[7px] bg-secondary/10 text-secondary px-1.5 py-0.5 rounded-full font-black uppercase tracking-tighter border border-secondary/20">
                                          {t('cycleEnd')}
                                        </span>
                                      )}
                                    </>
                                  )}
                                </div>
                                <p className="text-xs font-black text-black truncate uppercase">{item.odometer || '---'} KM</p>
                              </div>
                              <div className="w-16 text-center">
                                <p className="text-xs font-black text-black">
                                  {Math.round(parseLocaleNumber(item.liters || item.gnvVolume || '0', language))}<span className="text-[10px] ml-0.5 opacity-60 font-black">{item.fuelType === 'gnv' ? 'm³' : 'L'}</span>
                                </p>
                              </div>
                              <div className="w-16 text-center">
                                <p className={`text-xs font-black ${
                                  consumption === bestPerformance && bestPerformance !== null ? 'text-blue-700' : 
                                  consumption === worstPerformance && worstPerformance !== null ? 'text-red-700' : 
                                  consumption ? 'text-black' : 'text-neutral-300'
                                }`}>
                                  {consumption || '---'}
                                </p>
                              </div>
                              <div className="w-24 text-right">
                                <p className="text-xs font-black text-black">
                                  {costPerKm ? `${t('currencySymbol')} ${formatLocaleCurrency(parseFloat(costPerKm), language)}` : '---'}
                                </p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-12 px-6 text-center space-y-4">
                        <div className="w-12 h-12 bg-secondary/10 rounded-full flex items-center justify-center text-secondary">
                          <Info size={24} />
                        </div>
                        <div className="space-y-1">
                          <p className="text-[10px] font-black uppercase tracking-widest text-secondary mb-1">
                            {hasValidHistoryOutsideRange ? '' : (expenses.some(e => e.category === 'fuel') ? '' : t('noHistory'))}
                          </p>
                          <p className="text-xs font-bold text-on-surface-variant max-w-md leading-relaxed mx-auto">
                            {hasValidHistoryOutsideRange 
                              ? t('butHaveHistoryOutside')
                              : (expenses.some(e => e.category === 'fuel')
                                ? (fuelView === 'full' ? t('fullTankPerformanceExplanation') : t('partialTankPerformanceExplanation'))
                                : (fuelView === 'full' ? t('fullTankPerformanceExplanation') : t('partialTankPerformanceExplanation')))
                            }
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </motion.section>

      <div className="relative group px-4 sm:px-12">
        {/* Carousel Navigation Arrows */}
        <div className="absolute top-1/2 -translate-y-1/2 left-0 z-40">
          <button 
            onClick={() => setActiveSlide(prev => (prev - 1 + 3) % 3)}
            className="p-2 rounded-full bg-surface-container-highest shadow-lg transition-all opacity-100 hover:scale-110 active:scale-95"
          >
            <ChevronLeft size={24} className="text-primary" />
          </button>
        </div>
        <div className="absolute top-1/2 -translate-y-1/2 right-0 z-40">
          <button 
            onClick={() => setActiveSlide(prev => (prev + 1) % 3)}
            className="p-2 rounded-full bg-surface-container-highest shadow-lg transition-all opacity-100 hover:scale-110 active:scale-95"
          >
            <ChevronRight size={24} className="text-primary" />
          </button>
        </div>

        {/* Carousel Track Container */}
        <div className="relative py-12 -mx-4 sm:-mx-12 px-4 sm:px-12 min-h-[500px]">
          <div className="grid grid-cols-1 items-start justify-items-center">
            {/* Earnings by Platform */}
            <motion.section 
              initial={false}
              animate={{ 
                x: `${((0 - activeSlide + 1 + 3) % 3 - 1) * 85}%`,
                scale: activeSlide === 0 ? 1 : 0.8,
                opacity: activeSlide === 0 ? 1 : 0.4,
                rotateY: activeSlide === 0 ? 0 : (((0 - activeSlide + 1 + 3) % 3 - 1) > 0 ? 15 : -15),
                z: activeSlide === 0 ? 0 : -100,
                zIndex: activeSlide === 0 ? 30 : 10,
              }}
              transition={{ type: "spring", stiffness: 600, damping: 45, mass: 0.8 }}
              onClick={() => setActiveSlide(0)}
              className="col-start-1 row-start-1 w-[85%] sm:w-[65%] bg-surface-container-lowest p-6 md:p-8 rounded-[2.5rem] shadow-2xl border border-surface-container-high shrink-0 cursor-pointer transition-all duration-300"
              style={{ perspective: '1000px' }}
            >
              <div className="flex items-center gap-3 mb-8">
                <div className="w-12 h-12 bg-surface-container-high rounded-2xl flex items-center justify-center rotate-3 group-hover:rotate-0 transition-transform">
                  <LayoutGrid size={24} className="text-primary" />
                </div>
                <h3 className="text-xl font-black font-headline text-on-surface tracking-tight">{t('earningsProfitByPlatform')}</h3>
              </div>

              <div className="relative border-l-2 border-black/10 ml-2 pl-6 space-y-8">
                {platformData.length > 0 ? (
                  platformData.map((p) => (
                    <div key={p.id} className="relative">
                      {/* Axis Marker */}
                      <div className="absolute -left-[25px] top-1/2 -translate-y-1/2 w-2 h-2 bg-primary rounded-full border-2 border-surface-container-lowest shadow-sm"></div>
                      
                      <div className="space-y-3">
                        <div className="flex justify-between items-end">
                          <div className="flex flex-col">
                            <p className="font-black text-sm text-on-surface uppercase tracking-wider">{p.name}</p>
                            <p className="font-bold text-[9px] text-neutral-400 uppercase">{p.trips} {t('tripsLower')}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-black text-[10px] text-secondary/70">{t('earningUpper')}: {t('currencySymbol')} {formatLocaleCurrency(p.value, language)}</p>
                            <p className="font-black text-[10px] text-primary">{t('profitUpper')}: {t('currencySymbol')} {formatLocaleCurrency(p.profit, language)}</p>
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          {/* Earnings Bar (Green) */}
                          <div className="h-2.5 overflow-hidden">
                            <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: `${(p.value / (platformData[0]?.value || 1)) * 100}%` }}
                              className="h-full bg-secondary"
                            />
                          </div>
                          {/* Profit Bar (Blue) */}
                          <div className="h-2.5 overflow-hidden">
                            <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: `${(p.profit / (platformData[0]?.value || 1)) * 100}%` }}
                              className="h-full bg-primary"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-10 opacity-40">
                    <p className="font-bold text-sm italic">{t('noEarningsByPlatform')}</p>
                  </div>
                )}
              </div>
            </motion.section>

            {/* Expenses by Category */}
            <motion.section 
              initial={false}
              animate={{ 
                x: `${((1 - activeSlide + 1 + 3) % 3 - 1) * 85}%`,
                scale: activeSlide === 1 ? 1 : 0.8,
                opacity: activeSlide === 1 ? 1 : 0.4,
                rotateY: activeSlide === 1 ? 0 : (((1 - activeSlide + 1 + 3) % 3 - 1) > 0 ? 15 : -15),
                z: activeSlide === 1 ? 0 : -100,
                zIndex: activeSlide === 1 ? 30 : 10,
              }}
              transition={{ type: "spring", stiffness: 600, damping: 45, mass: 0.8 }}
              onClick={() => setActiveSlide(1)}
              className="col-start-1 row-start-1 w-[85%] sm:w-[65%] bg-surface-container-lowest p-6 md:p-8 rounded-[2.5rem] shadow-2xl border border-surface-container-high shrink-0 cursor-pointer transition-all duration-300"
              style={{ perspective: '1000px' }}
            >
              <div className="flex items-center gap-3 mb-8">
                <div className="w-12 h-12 bg-surface-container-high rounded-2xl flex items-center justify-center -rotate-3 group-hover:rotate-0 transition-transform">
                  <ShoppingCart size={24} className="text-error" />
                </div>
                <h3 className="text-xl font-black font-headline text-on-surface tracking-tight">{t('expensesByCategory')}</h3>
              </div>

              <div className="relative border-l-2 border-black/10 ml-2 pl-6 space-y-8">
                {categoryData.length > 0 ? (
                  categoryData.map((c) => (
                    <div key={c.id} className="relative">
                      {/* Axis Marker */}
                      <div className="absolute -left-[25px] top-1/2 -translate-y-1/2 w-2 h-2 bg-error rounded-full border-2 border-surface-container-lowest shadow-sm"></div>
                      
                      <div className="space-y-3">
                        <div className="flex justify-between items-end">
                          <div className="flex items-center gap-2">
                            <c.icon size={16} className="text-error" />
                            <p className="font-black text-sm text-on-surface uppercase tracking-wider">{c.name}</p>
                          </div>
                          <div className="text-right flex flex-col gap-2">
                            <p className="font-black text-lg text-error leading-none">{t('currencySymbol')} {formatLocaleCurrency(c.value, language)}</p>
                            <div className="flex items-center gap-2 flex-wrap justify-end">
                              <div className="px-2 py-1 bg-error/10 border border-error/20 rounded-md">
                                <p className="font-black text-xs text-error uppercase tracking-tighter whitespace-nowrap">
                                  {c.percentage.toFixed(1)}% <span className="font-bold opacity-70">{t('percentageExpenseVsTotal')}</span>
                                </p>
                              </div>
                              <div className="px-2 py-1 bg-secondary/10 border border-secondary/20 rounded-md">
                                <p className="font-black text-xs text-secondary uppercase tracking-tighter whitespace-nowrap">
                                  {c.grossPercentage.toFixed(1)}% <span className="font-bold opacity-70">{t('percentageExpenseVsEarnings')}</span>
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="h-5 overflow-hidden">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${(c.value / (categoryData[0]?.value || 1)) * 100}%` }}
                            className="h-full bg-error"
                          />
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-10 opacity-40">
                    <p className="font-bold text-sm italic">{t('noExpensesByCategory')}</p>
                  </div>
                )}
              </div>
            </motion.section>

            {/* Recent History */}
            <motion.section 
              initial={false}
              animate={{ 
                x: `${((2 - activeSlide + 1 + 3) % 3 - 1) * 85}%`,
                scale: activeSlide === 2 ? 1 : 0.8,
                opacity: activeSlide === 2 ? 1 : 0.4,
                rotateY: activeSlide === 2 ? 0 : (((2 - activeSlide + 1 + 3) % 3 - 1) > 0 ? 15 : -15),
                z: activeSlide === 2 ? 0 : -100,
                zIndex: activeSlide === 2 ? 30 : 10,
              }}
              transition={{ type: "spring", stiffness: 600, damping: 45, mass: 0.8 }}
              onClick={() => setActiveSlide(2)}
              className="col-start-1 row-start-1 w-[85%] sm:w-[65%] bg-surface-container-lowest p-6 md:p-8 rounded-[2.5rem] shadow-2xl border border-surface-container-high shrink-0 cursor-pointer transition-all duration-300"
              style={{ perspective: '1000px' }}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-surface-container-high rounded-full flex items-center justify-center">
                    <Calendar size={20} className="text-primary" />
                  </div>
                  <h3 className="text-xl font-black font-headline text-on-surface">{t('history')}</h3>
                </div>
                
                {/* History Filter Buttons */}
                <div className="flex bg-surface-container-high p-1 rounded-xl self-start sm:self-auto">
                  {(['all', 'income', 'expense'] as const).map((f) => (
                    <button
                      key={f}
                      onClick={(e) => {
                        e.stopPropagation();
                        setHistoryFilter(f);
                      }}
                      className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-tighter transition-all ${
                        historyFilter === f 
                          ? 'bg-surface-container-lowest text-on-surface shadow-sm' 
                          : 'text-on-surface-variant hover:text-on-surface'
                      }`}
                    >
                      {f === 'all' ? t('all') : f === 'income' ? t('earnings') : t('expenses')}
                    </button>
                  ))}
                </div>
              </div>
              
              <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                {history.map((item) => {
                  if (item.type === 'income') {
                    return (
                      <div key={`income-${item.id}`} className="bg-surface-container-lowest p-3 rounded-xl border border-outline-variant/20 shadow-sm hover:border-secondary/30 transition-all group">
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-surface-container-highest rounded-full flex items-center justify-center text-secondary shrink-0">
                              <TrendingUp size={20} />
                            </div>
                            <div>
                              <p className="text-xs font-bold text-on-surface-variant uppercase">
                                {new Date(item.date + 'T12:00:00').toLocaleDateString(language, { day: '2-digit', month: 'short', year: 'numeric' })} • {item.hoursWorked}
                              </p>
                              <p className="font-black text-secondary text-base">+ {t('currencySymbol')} {formatLocaleCurrency(item.totalAmount, language)}</p>
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
                        
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-bold text-on-surface-variant">
                          {item.type === 'fixed' && (
                            <span className="px-1.5 py-0.5 bg-secondary/20 text-secondary rounded uppercase tracking-wider text-[9px] font-black border border-secondary/30">
                              {t('fixed') || 'Fixo'}
                            </span>
                          )}
                          <span className="px-1.5 py-0.5 bg-secondary/5 text-secondary rounded uppercase tracking-wider text-[9px] font-black">{t('income')}</span>
                          <span className="flex items-center gap-1 text-[10px]"><Car size={12} /> {item.totalTrips} {t('trips')}</span>
                          <span className="flex items-center gap-1"><Milestone size={12} /> {Math.round(item.kmDriven)} {t('km')}</span>
                          {item.items && item.items.map((sub: any, idx: number) => (
                            <span key={idx} className="text-on-surface opacity-80">{sub.platform ? getPlatformName(sub.platform).toUpperCase() : ''}</span>
                          ))}
                        </div>

                        {item.notes && (
                          <p className="text-xs text-on-surface font-black italic mt-1 line-clamp-1">
                            "{item.notes}"
                          </p>
                        )}
                      </div>
                    );
                  } else {
                    const category = [...CATEGORIES, ...categories].find(c => c.id === item.category);
                    const Icon = (category && iconMap[category.icon]) ? iconMap[category.icon] : FileText;
                    const subcategory = item.fuelType || item.maintenanceType;
                    
                    return (
                      <div key={`expense-${item.id}`} className="bg-surface-container-lowest p-3 rounded-xl border border-outline-variant/20 shadow-sm hover:border-error/30 transition-all group">
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-surface-container-highest rounded-full flex items-center justify-center text-error shrink-0">
                              <Icon size={20} />
                            </div>
                            <div>
                              <p className="text-xs font-bold text-on-surface-variant uppercase">
                                {new Date(item.date + 'T12:00:00').toLocaleDateString(language, { day: '2-digit', month: 'short', year: 'numeric' })}
                              </p>
                              <p className="font-black text-error text-base">- {t('currencySymbol')} {item.amount}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <button 
                              onClick={() => onNavigate('add-expense', item)}
                              className="p-1.5 text-primary hover:bg-primary/10 rounded-lg transition-colors"
                              title={t('edit')}
                            >
                              <Edit2 size={16} />
                            </button>
                            <button 
                              onClick={() => onDeleteExpense(item.id)}
                              className="p-1.5 text-error hover:bg-error/10 rounded-lg transition-colors"
                              title={t('delete')}
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-bold text-on-surface-variant">
                          {item.costType === 'fixed' && (
                            <span className="px-1.5 py-0.5 bg-error/20 text-error rounded uppercase tracking-wider text-[9px] font-black border border-error/30">
                              {t('fixed') || 'Fixo'}
                            </span>
                          )}
                          <span className="px-1.5 py-0.5 bg-error/5 text-error rounded uppercase tracking-wider text-[9px] font-black">{getCategoryName(item.category)}</span>
                          {subcategory && <span className="italic text-on-surface text-[10px]">{t(subcategory)}</span>}
                          {item.category === 'fuel' && (
                            <>
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
                  }
                })}
                {history.length === 0 && (
                  <div className="text-center py-10 bg-surface-container-low/50 rounded-2xl border-2 border-dashed border-outline-variant/30">
                    <p className="text-neutral-400 font-bold text-sm">{t('noHistory')}</p>
                  </div>
                )}
              </div>
            </motion.section>
          </div>
        </div>
      </div>
      <SmartImportModal 
        isOpen={isImportModalOpen} 
        onClose={() => setIsImportModalOpen(false)}
        onConfirm={onSmartImport}
      />
    </div>
  );
}
