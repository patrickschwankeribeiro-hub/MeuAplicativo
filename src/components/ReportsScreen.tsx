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
  Sparkles,
  Droplets,
  Triangle,
  Radar,
  KeyRound,
  Bike,
  User,
  RotateCcw
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
  Legend,
  Tooltip
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

const customRoundChartValue = (value: number): number => {
  const absValue = Math.abs(value);
  const floorVal = Math.floor(absValue);
  const fraction = absValue - floorVal;
  
  // Arredonda para cima se a parte fracionária for de pelo menos 0.90 centavos.
  // Caso contrário, mantém o valor inteiro (arredonda para baixo/floor).
  const roundedAbs = fraction >= 0.90 ? Math.ceil(absValue) : floorVal;
  
  return value < 0 ? -roundedAbs : roundedAbs;
};

const VehicleRentIcon = ({ size, className }: { size: number; className?: string }) => (
  <div className={`flex items-center gap-0.5 ${className}`}>
    <Car size={size * 0.9} />
    <span className="opacity-30">|</span>
    <Bike size={size} />
  </div>
);

const iconMap: Record<string, any> = {
  Fuel, Wrench, Utensils, Key, KeyRound, SquareParking, Truck, Gavel, Milestone, Wifi, IdCard, Ship, FileText, Car, Tag, Target, Droplets, Triangle, Radar, VehicleRent: VehicleRentIcon
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
  activeVehicleId?: string | null;
  onActiveVehicleChange?: (id: string) => void;
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
  onEndDateChange,
  activeVehicleId,
  onActiveVehicleChange
}: ReportsScreenProps) {
  const { t, language } = useLanguage();

  const activeVehicle = useMemo(() => {
    return userProfile?.vehicles?.find((v: any) => v.id === activeVehicleId) || userProfile?.vehicles?.[0];
  }, [userProfile?.vehicles, activeVehicleId]);

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

  const safeFormatDate = (dateStr: string, lang: string) => {
    if (!dateStr) return '';
    try {
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        return new Date(dateStr + 'T12:00:00').toLocaleDateString(lang);
      }
      const parsedDate = new Date(dateStr);
      if (!isNaN(parsedDate.getTime())) {
        return parsedDate.toLocaleDateString(lang);
      }
    } catch (e) {
      console.warn('Error parsing date:', dateStr, e);
    }
    return dateStr;
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

  const [reportPreset, setReportPreset] = useState<'day' | 'week' | 'month' | 'year' | 'custom'>('custom');
  const [anchorDate, setAnchorDate] = useState<Date>(() => new Date());

  const getWeekRangeForDate = (baseDate: Date) => {
    const d = new Date(baseDate);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(d.setDate(diff));
    const sunday = new Date(d.setDate(diff + 6));
    return { monday, sunday };
  };

  const updateDatesFromPreset = (presetType: 'day' | 'week' | 'month' | 'year' | 'custom', dateAnchor: Date) => {
    if (presetType === 'custom') return;
    
    let startStr = '';
    let endStr = '';
    
    if (presetType === 'day') {
      startStr = getLocalDateString(dateAnchor);
      endStr = startStr;
    } else if (presetType === 'week') {
      const { monday, sunday } = getWeekRangeForDate(dateAnchor);
      startStr = getLocalDateString(monday);
      endStr = getLocalDateString(sunday);
    } else if (presetType === 'month') {
      const firstDay = new Date(dateAnchor.getFullYear(), dateAnchor.getMonth(), 1);
      const lastDay = new Date(dateAnchor.getFullYear(), dateAnchor.getMonth() + 1, 0);
      startStr = getLocalDateString(firstDay);
      endStr = getLocalDateString(lastDay);
    } else if (presetType === 'year') {
      const firstDay = new Date(dateAnchor.getFullYear(), 0, 1);
      const lastDay = new Date(dateAnchor.getFullYear(), 11, 31);
      startStr = getLocalDateString(firstDay);
      endStr = getLocalDateString(lastDay);
    }
    
    onStartDateChange(startStr);
    onEndDateChange(endStr);
  };

  const [historyFilter, setHistoryFilter] = useState<'all' | 'income' | 'expense'>('all');
  const [showExportDropdown, setShowExportDropdown] = useState(false);
  const [activeSlide, setActiveSlide] = useState(() => {
    const saved = localStorage.getItem('reports_active_slide');
    if (saved !== null) {
      const parsed = parseInt(saved, 10);
      return parsed >= 0 && parsed < 3 ? parsed : 0;
    }
    return 0;
  });

  useEffect(() => {
    localStorage.setItem('reports_active_slide', activeSlide.toString());
  }, [activeSlide]);

  const totalSlides = 3;
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

  const calculateChange = (current: number, previous: number) => {
    if (previous === 0) {
      if (current === 0) return null;
      return 100;
    }
    return Math.round(((current - previous) / previous) * 100);
  };

  const getPreviousAnchorDate = (presetType: 'day' | 'week' | 'month' | 'year' | 'custom', baseDate: Date) => {
    const prev = new Date(baseDate);
    if (presetType === 'day') {
      prev.setDate(prev.getDate() - 1);
    } else if (presetType === 'week') {
      prev.setDate(prev.getDate() - 7);
    } else if (presetType === 'month') {
      prev.setMonth(prev.getMonth() - 1);
    } else if (presetType === 'year') {
      prev.setFullYear(prev.getFullYear() - 1);
    }
    return prev;
  };

  const getPeriodStartEnd = (presetType: 'day' | 'week' | 'month' | 'year' | 'custom', baseDate: Date) => {
    if (presetType === 'custom') {
      return { startStr: startDate, endStr: endDate };
    }
    
    let startStr = '';
    let endStr = '';
    
    if (presetType === 'day') {
      startStr = getLocalDateString(baseDate);
      endStr = startStr;
    } else if (presetType === 'week') {
      const { monday, sunday } = getWeekRangeForDate(baseDate);
      startStr = getLocalDateString(monday);
      endStr = getLocalDateString(sunday);
    } else if (presetType === 'month') {
      const firstDay = new Date(baseDate.getFullYear(), baseDate.getMonth(), 1);
      const lastDay = new Date(baseDate.getFullYear(), baseDate.getMonth() + 1, 0);
      startStr = getLocalDateString(firstDay);
      endStr = getLocalDateString(lastDay);
    } else if (presetType === 'year') {
      const firstDay = new Date(baseDate.getFullYear(), 0, 1);
      const lastDay = new Date(baseDate.getFullYear(), 11, 31);
      startStr = getLocalDateString(firstDay);
      endStr = getLocalDateString(lastDay);
    }
    return { startStr, endStr };
  };

  const { heroStats, detailedStats, mainValues, activeValue, workedDaysStat, profitChange, earningsChange, expensesChange } = useMemo(() => {
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

    // PREVIOUS PERIOD CALCULATIONS
    const prevAnchor = getPreviousAnchorDate(reportPreset, anchorDate);
    const { startStr: prevStart, endStr: prevEnd } = getPeriodStartEnd(reportPreset, prevAnchor);

    const isWithinPrevFilter = (dateStr: string) => {
      if (reportPreset === 'custom') return false;
      const d = new Date(dateStr);
      const start = new Date(prevStart);
      const end = new Date(prevEnd);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      return d >= start && d <= end;
    };

    const prevFilteredIncomes = incomes.filter(i => isWithinPrevFilter(i.date));
    const prevFilteredExpenses = expenses.filter(e => isWithinPrevFilter(e.date));

    const prevGrossEarnings = prevFilteredIncomes.reduce((acc, curr) => acc + curr.totalAmount, 0);
    const prevTotalExpenses = prevFilteredExpenses.reduce((acc, curr) => acc + parseCurrency(curr.amount), 0);
    const prevRealProfit = Math.max(0, prevGrossEarnings - prevTotalExpenses);

    const prevTotalTrips = prevFilteredIncomes.reduce((acc, curr) => acc + curr.totalTrips, 0);
    const prevTotalKm = prevFilteredIncomes.reduce((acc, curr) => acc + (curr.kmDriven || 0), 0);
    const prevTotalHoursDecimal = prevFilteredIncomes.reduce((acc, curr) => acc + parseTime(curr.hoursWorked), 0);
    const prevWorkedDays = new Set(prevFilteredIncomes.map(i => i.date)).size;

    const profitChangeValue = reportPreset !== 'custom' ? calculateChange(realProfit, prevRealProfit) : null;
    const earningsChangeValue = reportPreset !== 'custom' ? calculateChange(grossEarnings, prevGrossEarnings) : null;
    const expensesChangeValue = reportPreset !== 'custom' ? calculateChange(totalExpenses, prevTotalExpenses) : null;

    const chartDataMap: Record<string, { id: string; label: string; value: number; color: string }> = {
      profit: { id: 'profit', label: t('totalProfit'), value: realProfit, color: 'text-primary' },
      earnings: { id: 'earnings', label: t('totalEarnings'), value: grossEarnings, color: 'text-secondary' },
      expenses: { id: 'expenses', label: t('totalExpenses'), value: totalExpenses, color: 'text-error' }
    };

    const activeChartData = chartDataMap[charts[currentChart]?.id] || { id: 'none', label: '', value: 0, color: '' };

    const formatVal = (val: number) => {
      return formatLocaleCurrency(val, language);
    };

    const workedDaysStat = { 
      label: t('workedDays'), 
      value: workedDays.toString(), 
      icon: Calendar, 
      color: 'primary', 
      isCurrency: false,
      change: reportPreset !== 'custom' ? calculateChange(workedDays, prevWorkedDays) : null
    };

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
      profitChange: profitChangeValue,
      earningsChange: earningsChangeValue,
      expensesChange: expensesChangeValue,
      detailedStats: [
        { 
          label: t('totalTrips'), 
          value: totalTrips.toString(), 
          icon: Car, 
          color: 'primary', 
          isCurrency: false, 
          change: reportPreset !== 'custom' ? calculateChange(totalTrips, prevTotalTrips) : null,
          isCustomInverted: true
        },
        { 
          label: t('hoursWorked'), 
          value: formattedHours, 
          icon: Timer, 
          color: 'primary', 
          isCurrency: false, 
          change: reportPreset !== 'custom' ? calculateChange(totalHoursDecimal, prevTotalHoursDecimal) : null,
          isCustomInverted: true
        },
        { 
          label: t('kmDriven'), 
          value: Math.round(totalKm).toString(), 
          icon: Milestone, 
          color: 'primary', 
          isCurrency: false, 
          suffix: ' KM',
          change: reportPreset !== 'custom' ? calculateChange(totalKm, prevTotalKm) : null,
          isCustomInverted: true
        },
        { 
          label: t('profitPerTrip').replace(' /', ' Méd /'), 
          value: totalTrips > 0 ? formatVal(realProfit / totalTrips) : '0,00', 
          icon: CreditCard, 
          color: 'primary', 
          isCurrency: true,
          change: reportPreset !== 'custom' ? calculateChange(totalTrips > 0 ? (realProfit / totalTrips) : 0, prevTotalTrips > 0 ? (prevRealProfit / prevTotalTrips) : 0) : null
        },
        { 
          label: t('profitPerHour').replace(' /', ' Méd /'), 
          value: totalHoursDecimal > 0 ? formatVal(realProfit / totalHoursDecimal) : '0,00', 
          icon: Timer, 
          color: 'primary', 
          isCurrency: true,
          change: reportPreset !== 'custom' ? calculateChange(totalHoursDecimal > 0 ? (realProfit / totalHoursDecimal) : 0, prevTotalHoursDecimal > 0 ? (prevRealProfit / prevTotalHoursDecimal) : 0) : null
        },
        { 
          label: t('profitPerKm').replace(' /', ' Méd /'), 
          value: totalKm > 0 ? formatVal(realProfit / totalKm) : '0,00', 
          icon: Route, 
          color: 'primary', 
          isCurrency: true,
          change: reportPreset !== 'custom' ? calculateChange(totalKm > 0 ? (realProfit / totalKm) : 0, prevTotalKm > 0 ? (prevRealProfit / prevTotalKm) : 0) : null
        },
        { 
          label: t('earningPerTrip').replace(' /', ' Méd /'), 
          value: totalTrips > 0 ? formatVal(grossEarnings / totalTrips) : '0,00', 
          icon: TrendingUp, 
          color: 'secondary', 
          isCurrency: true,
          change: reportPreset !== 'custom' ? calculateChange(totalTrips > 0 ? (grossEarnings / totalTrips) : 0, prevTotalTrips > 0 ? (prevGrossEarnings / prevTotalTrips) : 0) : null
        },
        { 
          label: t('earningPerHour').replace(' /', ' Méd /'), 
          value: totalHoursDecimal > 0 ? formatVal(grossEarnings / totalHoursDecimal) : '0,00', 
          icon: Clock, 
          color: 'secondary', 
          isCurrency: true,
          change: reportPreset !== 'custom' ? calculateChange(totalHoursDecimal > 0 ? (grossEarnings / totalHoursDecimal) : 0, prevTotalHoursDecimal > 0 ? (prevGrossEarnings / prevTotalHoursDecimal) : 0) : null
        },
        { 
          label: t('earningPerKm').replace(' /', ' Méd /'), 
          value: totalKm > 0 ? formatVal(grossEarnings / totalKm) : '0,00', 
          icon: Zap, 
          color: 'secondary', 
          isCurrency: true,
          change: reportPreset !== 'custom' ? calculateChange(totalKm > 0 ? (grossEarnings / totalKm) : 0, prevTotalKm > 0 ? (prevGrossEarnings / prevTotalKm) : 0) : null
        },
        { 
          label: t('expensePerTrip').replace(' /', ' Méd /'), 
          value: totalTrips > 0 ? formatVal(totalExpenses / totalTrips) : '0,00', 
          icon: ShoppingCart, 
          color: 'error', 
          isCurrency: true,
          change: reportPreset !== 'custom' ? calculateChange(totalTrips > 0 ? (totalExpenses / totalTrips) : 0, prevTotalTrips > 0 ? (prevTotalExpenses / prevTotalTrips) : 0) : null
        },
        { 
          label: t('expensePerHour').replace(' /', ' Méd /'), 
          value: totalHoursDecimal > 0 ? formatVal(totalExpenses / totalHoursDecimal) : '0,00', 
          icon: TrendingDown, 
          color: 'error', 
          isCurrency: true,
          change: reportPreset !== 'custom' ? calculateChange(totalHoursDecimal > 0 ? (totalExpenses / totalHoursDecimal) : 0, prevTotalHoursDecimal > 0 ? (prevTotalExpenses / prevTotalHoursDecimal) : 0) : null
        },
        { 
          label: t('expensePerKm').replace(' /', ' Méd /'), 
          value: totalKm > 0 ? formatVal(totalExpenses / totalKm) : '0,00', 
          icon: TrendingDown, 
          color: 'error', 
          isCurrency: true,
          change: reportPreset !== 'custom' ? calculateChange(totalKm > 0 ? (totalExpenses / totalKm) : 0, prevTotalKm > 0 ? (prevTotalExpenses / prevTotalKm) : 0) : null
        },
      ],
      workedDaysStat
    };
  }, [incomes, expenses, startDate, endDate, currentChart, charts, reportPreset, anchorDate, language, categories]);

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
        <div className="bg-surface-container-lowest p-3 rounded-xl border border-outline-variant shadow-xl bg-white">
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

  const CustomGeneralTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      if (activeChart.id === 'general') {
        return (
          <div className="bg-surface-container-lowest p-3 rounded-xl border border-outline-variant shadow-xl text-left bg-white font-body z-50 min-w-[220px]">
            <p className="text-xs font-black text-neutral-500 uppercase mb-2">{label}</p>
            {payload.map((p: any, idx: number) => {
              const isEarnings = p.dataKey === 'display_earnings' || p.dataKey === 'earnings_pct';
              const isExpenses = p.dataKey === 'display_expenses' || p.dataKey === 'expenses_pct';
              
              const absKey = isEarnings ? 'earnings' : isExpenses ? 'expenses' : 'profit';
              const pctKey = isEarnings ? 'earnings_pct' : isExpenses ? 'expenses_pct' : 'profit_pct';
              
              const absVal = p.payload[absKey] || 0;
              const realPct = p.payload[pctKey] || 0;

              return (
                <div key={idx} className="flex items-center gap-2 text-xs font-bold mb-1.5" style={{ color: p.color || p.stroke }}>
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: p.color || p.stroke }} />
                  <span className="shrink-0">{p.name}: {Math.round(realPct)}%</span>
                  <span className="text-neutral-400 font-normal">
                    ({t('currencySymbol')} {formatLocaleCurrency(absVal, language)})
                  </span>
                </div>
              );
            })}
          </div>
        );
      } else if (activeChart.id === 'fuel') {
        return <CustomFuelTooltip active={active} payload={payload} label={label} />;
      } else {
        return (
          <div className="bg-surface-container-lowest p-3 rounded-xl border border-outline-variant shadow-xl text-left bg-white font-body z-50">
            <p className="text-xs font-black text-neutral-500 uppercase mb-1">{label}</p>
            <p className="text-sm font-bold text-primary">
              {t('currencySymbol')} {formatLocaleCurrency(payload[0].value, language)}
            </p>
          </div>
        );
      }
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
    const rawList = Object.values(dataMap);
    const maxVal = rawList.reduce((max, d) => Math.max(max, d.earnings, d.expenses), 0) || 100;

    return rawList
      .filter(d => d.earnings > 0 || d.expenses > 0)
      .map(d => {
        const profit = Math.max(0, d.earnings - d.expenses);
        const performance = d.earnings > 0 ? (profit / d.earnings) * 100 : 0;
        
        // Compute relative percentages for general chart based on peak value of the period
        const earnings_pct = (d.earnings / maxVal) * 100;
        const expenses_pct = (d.expenses / maxVal) * 100;
        const profit_pct = (profit / maxVal) * 100;

        // Map onto distinct independent linear bands (lanes) to fully prevent any overlap or intersection.
        // This distributes metrics vertically: Earnings at the top, Profit in the middle, Expenses at the bottom.
        // It provides a generous 7% vertical boundary buffer between lanes while beautifully illustrating progress trend lines.
        const display_earnings = 68 + (earnings_pct * 0.25);
        const display_profit = 36 + (profit_pct * 0.25);
        const display_expenses = 4 + (expenses_pct * 0.25);

        return {
          ...d,
          profit,
          performance,
          earnings_pct,
          expenses_pct,
          profit_pct,
          display_earnings,
          display_expenses,
          display_profit,
          displayDate: d.date.split('-').reverse().slice(0, 2).join('/')
        };
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [incomes, expenses, startDate, endDate]);

  const totalKm = useMemo(() => {
    return incomes
      .filter(i => isWithinDateRange(i.date))
      .reduce((acc, curr) => acc + (curr.kmDriven || 0), 0);
  }, [incomes, isWithinDateRange]);

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

    const cMap: Record<string, { total: number; subs: Record<string, number> }> = {};
    let totalExpenses = 0;
    
    // Calculate gross earnings for the period
    const totalGrossEarnings = incomes
      .filter(i => isWithinFilter(i.date))
      .reduce((acc, curr) => acc + curr.totalAmount, 0);

    expenses.filter(e => isWithinFilter(e.date)).forEach(expense => {
      if (!cMap[expense.category]) {
        cMap[expense.category] = { total: 0, subs: {} };
      }
      const amount = parseLocaleNumber(expense.amount, language);
      const val = isNaN(amount) ? 0 : amount;
      cMap[expense.category].total += val;
      totalExpenses += val;

      const subKey = expense.category === 'fuel' ? (expense.fuelType || t('other')) : expense.subCategory;
      if (subKey) {
        cMap[expense.category].subs[subKey] = (cMap[expense.category].subs[subKey] || 0) + val;
      }
    });

    return Object.entries(cMap)
      .map(([id, data]) => {
        const category = categories.find(c => c.id === id);
        return {
          id,
          name: category ? t(category.name) : t('other'),
          value: data.total,
          subs: Object.entries(data.subs).map(([subId, subVal]) => ({
            id: subId,
            name: t(subId),
            value: subVal,
            percentage: totalExpenses > 0 ? (subVal / totalExpenses) * 100 : 0,
            grossPercentage: totalGrossEarnings > 0 ? (subVal / totalGrossEarnings) * 100 : 0,
          })).sort((a, b) => b.value - a.value),
          percentage: totalExpenses > 0 ? (data.total / totalExpenses) * 100 : 0,
          grossPercentage: totalGrossEarnings > 0 ? (data.total / totalGrossEarnings) * 100 : 0,
          costPerKm: totalKm > 0 ? data.total / totalKm : 0,
          icon: (category && iconMap[category.icon]) ? iconMap[category.icon] : FileText,
          color: 'error',
          costType: category?.costType || 'variable'
        };
      })
      .sort((a, b) => b.value - a.value);
  }, [expenses, startDate, endDate, categories]);
  
  const maintenanceStats = useMemo(() => {
    const isWithinFilter = (dateStr: string) => {
      const d = new Date(dateStr);
      const start = new Date(startDate);
      const end = new Date(endDate);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      return d >= start && d <= end;
    };

    const filteredMaintenance = expenses.filter(e => 
      e.category === 'maintenance' && 
      e.subCategory !== 'Lavagem' && 
      e.subCategory !== 'washing' && 
      isWithinFilter(e.date)
    );
    const totalKmIncomes = incomes.filter(i => isWithinFilter(i.date)).reduce((acc, curr) => acc + (curr.kmDriven || 0), 0);

    let totalMaintenanceAmount = 0;

    const items = filteredMaintenance.map(exp => {
      const amount = parseLocaleNumber(exp.amount, language);
      totalMaintenanceAmount += amount;

      const sub = exp.subCategory || t('other');
      const date = exp.date;
      const notes = exp.notes || '';
      const maintenanceType = exp.maintenanceType || '';

      let latestOdo: number | null = null;
      if (exp.odometer) {
        latestOdo = parseFloat(exp.odometer);
      }

      let kmDriven: number | null = null;
      let cpk: number | null = null;

      if (latestOdo) {
        // Look for immediate prior expense in ALL history (for the active vehicle)
        const priorExpense = expenses
          .filter(e => 
            e.category === 'maintenance' && 
            e.subCategory === exp.subCategory && 
            e.id !== exp.id &&
            e.odometer && 
            parseFloat(e.odometer) < latestOdo &&
            new Date(e.date).getTime() <= new Date(exp.date).getTime()
          )
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];

        if (priorExpense && priorExpense.odometer) {
          kmDriven = latestOdo - parseFloat(priorExpense.odometer);
        } else {
          // Fallback to active vehicle maintenance plan lastOdometer
          const planItem = activeVehicle?.maintenancePlan?.find((p: any) => p.subcategory === exp.subCategory);
          if (planItem && planItem.lastOdometer !== undefined && planItem.lastOdometer < latestOdo) {
            kmDriven = latestOdo - planItem.lastOdometer;
          }
        }

        if (kmDriven && kmDriven > 0) {
          cpk = amount / kmDriven;
        }
      }

      return {
        sub,
        amount,
        date,
        notes,
        maintenanceType,
        latestOdo,
        kmDriven,
        cpk,
        driverName: exp.driverName
      };
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    let completeAmountSum = 0;
    let completeKmSum = 0;
    items.forEach(item => {
      if (item.latestOdo !== null && item.latestOdo !== undefined && item.kmDriven !== null && item.kmDriven !== undefined && item.kmDriven > 0) {
        completeAmountSum += item.amount;
        completeKmSum += item.kmDriven;
      }
    });
    const avgMaintenanceCpk = completeKmSum > 0 ? (completeAmountSum / completeKmSum) : 0;

    return {
      items,
      totalMaintenanceAmount,
      totalKm: totalKmIncomes,
      totalMaintenanceCpk: totalKmIncomes > 0 ? (totalMaintenanceAmount / totalKmIncomes) : 0,
      avgMaintenanceCpk
    };
  }, [expenses, incomes, startDate, endDate, language, t, activeVehicle]);

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
    if (activeChart.id === 'general') {
      return chartData;
    }
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
    
    // Date formatting helper YYYY-MM-DD -> DD/MM/YYYY
    const formatDateToDDMMYYYY = (dateStr: string) => {
      if (!dateStr) return '';
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
      }
      return dateStr;
    };

    // Title
    doc.setFontSize(18);
    doc.text(t('reportTitle'), 14, 15);
    doc.setFontSize(10);
    
    const startFormatted = formatDateToDDMMYYYY(startDate);
    const endFormatted = formatDateToDDMMYYYY(endDate);
    if (language === 'pt-BR') {
      doc.text(`De: ${startFormatted} Até ${endFormatted}`, 14, 22);
    } else {
      doc.text(`${t('from')}: ${startFormatted} ${t('to')}: ${endFormatted}`, 14, 22);
    }

    // Add Vehicle Information if available
    if (activeVehicle) {
      const v = activeVehicle;
      doc.setFontSize(10);
      doc.setTextColor(100);
      let vInfo = '';
      if (language === 'pt-BR') {
        vInfo = `Veículo: ${v.brand || ''} ${v.model || ''}`;
        if (v.plate) vInfo += ` - Placa: ${v.plate}`;
      } else {
        vInfo = `${t('vehicle')}: ${v.brand || ''} ${v.model || ''}`;
        if (v.type) vInfo += ` (${t(v.type)})`;
        if (v.plate) vInfo += ` - Placa: ${v.plate}`;
        if (v.tankCapacity) vInfo += ` - Tanque: ${v.tankCapacity}L`;
      }
      doc.text(vInfo, 14, 28);
      doc.setTextColor(0);
    }

    // 1. Summary Section
    doc.setFontSize(14);
    doc.text(t('financialSummary'), 14, 35);
    const mainSummaryData = [
      [t('totalProfit'), `${t('currencySymbol')} ${formatLocaleCurrency(mainValues.profit, language)}`],
      [t('totalEarnings'), `${t('currencySymbol')} ${formatLocaleCurrency(mainValues.earnings, language)}`],
      [t('totalExpenses'), `${t('currencySymbol')} ${formatLocaleCurrency(mainValues.expenses, language)}`]
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
      head: [[
        t('type'), 
        t('fuelingCount'), 
        t('totalLiters'), 
        t('avgPrice'), 
        language === 'pt-BR' ? 'Consumo por KM' : (t('performance') || 'Performance')
      ]],
      body: fData,
      startY: finalY + 20,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [255, 152, 0] }
    });

    // 4b. Maintenance Section
    if (maintenanceStats.items.length > 0) {
      finalY = (doc as any).lastAutoTable.finalY || finalY;
      doc.setFontSize(14);
      doc.text(t('maintenanceReport') || 'Relatório de Manutenção', 14, finalY + 15);

      doc.setFontSize(9);
      doc.setTextColor(80);
      const mainTotalLabel = `${t('totalMaintenance')}: ${t('currencySymbol')} ${formatLocaleCurrency(maintenanceStats.totalMaintenanceAmount, language)}`;
      const mainAvgLabel = `${language === 'pt-BR' ? 'Gasto méd. com Manutenção por Km' : 'Avg. Maintenance Cost per Km'}: ${t('currencySymbol')} ${formatLocaleCurrency(maintenanceStats.avgMaintenanceCpk, language)}`;
      doc.text(`${mainTotalLabel}   |   ${mainAvgLabel}`, 14, finalY + 22);
      doc.setTextColor(0);

      const mData = maintenanceStats.items.map(item => [
        safeFormatDate(item.date, language),
        t(item.sub) || item.sub,
        item.maintenanceType || item.notes || '',
        item.driverName || '--',
        item.latestOdo !== null && item.latestOdo !== undefined ? `${item.latestOdo.toLocaleString(language)} KM` : '--',
        item.kmDriven !== null && item.kmDriven !== undefined ? `${item.kmDriven.toLocaleString(language)} KM` : '--',
        `${t('currencySymbol')} ${formatLocaleCurrency(item.amount, language)}`,
        item.cpk !== null && item.cpk !== undefined ? `${t('currencySymbol')} ${formatLocaleCurrency(item.cpk, language)}` : '--'
      ]);
      autoTable(doc, {
        head: [[
          t('date') || 'Data',
          language === 'pt-BR' ? 'Subcategoria' : 'Subcategory',
          language === 'pt-BR' ? 'Serviço/Notas' : 'Service/Notes',
          language === 'pt-BR' ? 'Condutor' : 'Driver',
          language === 'pt-BR' ? 'Odômetro' : 'Odometer',
          language === 'pt-BR' ? 'Kms Rodados' : 'Km driven to maintenance',
          t('amount') || 'Valor',
          t('subcategoryCpk') || 'Gasto por KM'
        ]],
        body: mData,
        startY: finalY + 26,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [121, 85, 72] }
      });
    }

    // 4c. Performance (Profitability) Section
    const perfTableData = [...chartData]
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .filter(d => d.earnings > 0 || d.performance > 0)
      .map(d => [
        safeFormatDate(d.date, language),
        `${d.performance.toFixed(1)}%`
      ]);

    if (perfTableData.length > 0) {
      finalY = (doc as any).lastAutoTable.finalY || finalY;
      doc.setFontSize(14);
      doc.text('Performance', 14, finalY + 15);
      
      doc.setFontSize(8);
      doc.setTextColor(115, 115, 115);
      const explanation = language === 'pt-BR' 
        ? '* Representa a margem de lucro líquido: a porcentagem do ganho que sobrou após subtrair os gastos.'
        : '* Represents the net profit margin: the percentage of earnings remaining after subtracting expenses.';
      doc.text(explanation, 14, finalY + 20);
      doc.setTextColor(0, 0, 0);
      
      autoTable(doc, {
        head: [[language === 'pt-BR' ? 'Data' : 'Date', 'Performance (%)']],
        body: perfTableData,
        startY: finalY + 24,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [245, 158, 11] } // Amber Color
      });
    }

    // 5. History Section
    finalY = (doc as any).lastAutoTable.finalY || finalY;
    doc.addPage();
    doc.setFontSize(14);
    doc.text(t('history'), 14, 15);
    const tableData = history.map(item => [
      safeFormatDate(item.date, language),
      item.type === 'income' ? t('income') : t(item.category),
      item.driverName || '--',
      item.type === 'income' ? `+ ${formatLocaleCurrency(item.totalAmount, language)}` : `- ${item.amount}`,
      item.notes || ''
    ]);

    autoTable(doc, {
      head: [[
        t('date'), 
        t('item'), 
        language === 'pt-BR' ? 'Condutor' : (t('driver') || 'Driver'),
        t('amount'), 
        t('notes')
      ]],
      body: tableData,
      startY: 20,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [33, 150, 243] }
    });

    doc.save(`relatorio_completo_${startDate}_${endDate}.pdf`);
    setShowExportDropdown(false);
  };

  const exportToExcel = () => {
    try {
      const workbook = XLSX.utils.book_new();

      // Helper interface for columns
      interface ColDef {
        header: string;
        key: string;
        type: 'string' | 'number' | 'currency' | 'percent';
      }

      // Helper function to create structured sheets with perfect types and formats
      const createCustomSheet = (data: any[], colDefs: ColDef[]) => {
        // Map columns using the defined headers
        const rows = data.map(item => {
          const rowObj: any = {};
          colDefs.forEach(col => {
            rowObj[col.header] = item[col.key];
          });
          return rowObj;
        });

        const sheet = XLSX.utils.json_to_sheet(rows);

        // Set column widths based on headers and maximum data length
        const colsWidths = colDefs.map(col => {
          let maxLen = col.header.length;
          data.forEach(item => {
            const val = item[col.key];
            if (val !== undefined && val !== null) {
              let strVal = '';
              if (col.type === 'currency') {
                strVal = `${t('currencySymbol') || 'R$'} ${parseFloat(String(val)).toFixed(2)}`;
              } else if (col.type === 'percent') {
                strVal = `${(parseFloat(String(val)) * 100).toFixed(1)}%`;
              } else {
                strVal = String(val);
              }
              if (strVal.length > maxLen) {
                maxLen = strVal.length;
              }
            }
          });
          return { wch: Math.max(maxLen + 4, 12) }; // Comfort width with padding
        });
        sheet['!cols'] = colsWidths;

        // Apply cell types and formats
        const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1:A1');
        for (let r = range.s.r + 1; r <= range.e.r; ++r) {
          colDefs.forEach((col, cIdx) => {
            const cellRef = XLSX.utils.encode_cell({ r, c: cIdx });
            const cell = sheet[cellRef];
            if (!cell) return;

            const rawVal = cell.v;
            if (col.type === 'currency') {
              const numVal = typeof rawVal === 'number' ? rawVal : parseFloat(String(rawVal).replace(/[^\d.-]/g, ''));
              if (!isNaN(numVal) && isFinite(numVal)) {
                cell.t = 'n';
                cell.v = numVal;
                cell.z = `"${t('currencySymbol') || 'R$'}" #,##0.00`;
              }
            } else if (col.type === 'percent') {
              const numVal = typeof rawVal === 'number' ? rawVal : parseFloat(String(rawVal));
              if (!isNaN(numVal) && isFinite(numVal)) {
                cell.t = 'n';
                cell.v = numVal;
                cell.z = '0.0%';
              }
            } else if (col.type === 'number') {
              const numVal = typeof rawVal === 'number' ? rawVal : parseFloat(String(rawVal));
              if (!isNaN(numVal) && isFinite(numVal)) {
                cell.t = 'n';
                cell.v = numVal;
                if (String(rawVal).includes('.')) {
                  cell.z = '0.00';
                } else {
                  cell.z = '#,##0';
                }
              }
            }
          });
        }

        return sheet;
      };

      const profitVal = typeof mainValues.profit === 'number' && !isNaN(mainValues.profit) ? mainValues.profit : 0;
      const earningsVal = typeof mainValues.earnings === 'number' && !isNaN(mainValues.earnings) ? mainValues.earnings : 0;
      const expensesVal = typeof mainValues.expenses === 'number' && !isNaN(mainValues.expenses) ? mainValues.expenses : 0;
      const overallPerformance = earningsVal > 0 ? (profitVal / earningsVal) : 0;

      // 1. Summary Block representing Indicators
      const summaryRows: any[] = [
        { label: t('totalProfit') || 'Lucro Líquido', value: profitVal, type: 'currency' },
        { label: t('totalEarnings') || 'Ganhos Brutos', value: earningsVal, type: 'currency' },
        { label: t('totalExpenses') || 'Gastos Totais', value: expensesVal, type: 'currency' },
        { label: '', value: '', type: 'empty' },
      ];

      if (activeVehicle) {
        summaryRows.push({ label: `--- ${t('vehicle') || 'VEÍCULO'} ---`, value: '', type: 'header' });
        summaryRows.push({ label: t('vehicle') || 'Veículo', value: `${activeVehicle?.brand || ''} ${activeVehicle?.model || ''}`, type: 'string' });
        summaryRows.push({ label: t('licensePlate') || 'Placa', value: activeVehicle?.plate || '', type: 'string' });
        summaryRows.push({ label: t('tankCapacity') || 'Tanque', value: activeVehicle?.tankCapacity ? `${activeVehicle.tankCapacity}L` : '', type: 'string' });
        summaryRows.push({ label: '', value: '', type: 'empty' });
      }

      summaryRows.push({ label: `--- ESTATÍSTICAS ---`, value: '', type: 'header' });
      detailedStats.forEach(s => {
        let valVal = s.value;
        let isCurr = s.isCurrency;
        if (isCurr && typeof valVal === 'string') {
          valVal = parseCurrency(valVal);
        }
        summaryRows.push({
          label: s.label || '',
          value: typeof valVal === 'number' ? valVal : parseFloat(String(valVal || '0')),
          type: isCurr ? 'currency' : 'string'
        });
      });

      // Group Performance percentages with their corresponding single-day periods
      summaryRows.push({ label: '', value: '', type: 'empty' });
      summaryRows.push({ label: language === 'pt-BR' ? '--- DETALHAMENTO DE PERFORMANCE POR PERÍODO ---' : '--- PERFORMANCE BREAKDOWN BY PERIOD ---', value: '', type: 'header' });
      
      chartData.forEach(day => {
        const perfVal = typeof day.performance === 'number' && !isNaN(day.performance) ? day.performance : 0;
        summaryRows.push({
          label: `${language === 'pt-BR' ? 'Margem no Dia / Período' : 'Margin on Day / Period'} ${safeFormatDate(day.date, language)}`,
          value: perfVal / 100,
          type: 'percent'
        });
      });

      // Construct a highly descriptive Header Area at the top of the Summary panel
      const titleRow = [language === 'pt-BR' ? 'RELATÓRIO FINANCEIRO DE DESEMPENHO' : 'FINANCIAL PERFORMANCE REPORT'];
      const periodRow = [`${t('period') || 'Período'}: ${startDate} - ${endDate}`];
      const generatedRow = [`${language === 'pt-BR' ? 'Gerado em' : 'Generated on'}: ${new Date().toLocaleDateString(language)}`];
      const emptyRow = [''];
      const summaryHeader = [language === 'pt-BR' ? 'Indicador / Métrica' : 'Indicator / Metric', t('amount') || 'Valor'];

      const aoaData = [
        titleRow,
        periodRow,
        generatedRow,
        emptyRow,
        summaryHeader,
        ...summaryRows.map(r => [
          r.label,
          r.type === 'currency' || r.type === 'percent' ? r.value : String(r.value || '')
        ])
      ];

      const summarySheet = XLSX.utils.aoa_to_sheet(aoaData);
      summarySheet['!cols'] = [
        { wch: 45 },
        { wch: 22 }
      ];

      // Format special indicator values in Summary Sheet (offset by 5 title lines)
      summaryRows.forEach((row, idx) => {
        const rIdx = idx + 5; // row index offset
        const valueCellRef = XLSX.utils.encode_cell({ r: rIdx, c: 1 });
        const valueCell = summarySheet[valueCellRef];
        if (!valueCell) return;

        const valNum = typeof row.value === 'number' ? row.value : parseFloat(String(row.value));
        if (!isNaN(valNum) && isFinite(valNum)) {
          if (row.type === 'currency') {
            valueCell.t = 'n';
            valueCell.v = valNum;
            valueCell.z = `"${t('currencySymbol') || 'R$'}" #,##0.00`;
          } else if (row.type === 'percent') {
            valueCell.t = 'n';
            valueCell.v = valNum;
            valueCell.z = '0.0%';
          }
        } else {
          if (row.type === 'currency' || row.type === 'percent') {
            valueCell.t = 's';
            valueCell.v = String(row.value || '0.00');
          }
        }
      });

      XLSX.utils.book_append_sheet(workbook, summarySheet, "Resumo");

      // 2. Daily Performance Tab (Added highly detailed performance values)
      const dailyCols: ColDef[] = [
        { header: language === 'pt-BR' ? 'Data' : 'Date', key: 'date', type: 'string' },
        { header: t('grossEarnings') || 'Ganhos Brutos', key: 'earnings', type: 'currency' },
        { header: t('totalExpenses') || 'Gastos Totais', key: 'expenses', type: 'currency' },
        { header: t('realProfit') || 'Lucro Líquido', key: 'profit', type: 'currency' },
        { header: language === 'pt-BR' ? 'Margem / Performance' : 'Performance (%)', key: 'performance', type: 'percent' }
      ];

      const dailyRows = chartData.map(d => {
        const perfVal = typeof d.performance === 'number' && !isNaN(d.performance) ? d.performance : 0;
        return {
          date: safeFormatDate(d.date, language),
          earnings: typeof d.earnings === 'number' && !isNaN(d.earnings) ? d.earnings : 0,
          expenses: typeof d.expenses === 'number' && !isNaN(d.expenses) ? d.expenses : 0,
          profit: typeof d.profit === 'number' && !isNaN(d.profit) ? d.profit : 0,
          performance: perfVal / 100
        };
      });

      const dailySheet = createCustomSheet(dailyRows, dailyCols);
      XLSX.utils.book_append_sheet(workbook, dailySheet, language === 'pt-BR' ? 'Desempenho Diario' : 'Daily Performance');

      // 3. Platforms Sheet with Profit Performance indicator column
      const platformCols: ColDef[] = [
        { header: t('platform') || 'Plataforma', key: 'name', type: 'string' },
        { header: t('trips') || 'Viagens', key: 'trips', type: 'number' },
        { header: t('grossEarnings') || 'Ganhos Brutos', key: 'earnings', type: 'currency' },
        { header: t('realProfit') || 'Lucro Líquido', key: 'profit', type: 'currency' },
        { header: language === 'pt-BR' ? 'Margem Retida (%)' : 'Profit Performance (%)', key: 'performance', type: 'percent' }
      ];

      const platformRows = platformData.map(p => {
        const platformValue = typeof p.value === 'number' && !isNaN(p.value) ? p.value : 0;
        const platformProfit = typeof p.profit === 'number' && !isNaN(p.profit) ? p.profit : 0;
        return {
          name: p.name || '',
          trips: Number(p.trips || 0),
          earnings: platformValue,
          profit: platformProfit,
          performance: platformValue > 0 ? platformProfit / platformValue : 0
        };
      });

      const platformSheet = createCustomSheet(platformRows, platformCols);
      XLSX.utils.book_append_sheet(workbook, platformSheet, "Plataformas");

      // 4. Categories Sheet
      const categoryCols: ColDef[] = [
        { header: t('category') || 'Categoria', key: 'name', type: 'string' },
        { header: t('amount') || 'Valor', key: 'amount', type: 'currency' },
        { header: t('percentageExpenseVsTotal') || '% Gasto Total', key: 'percentageTotal', type: 'percent' },
        { header: t('percentageExpenseVsEarnings') || '% Ganho Bruto', key: 'percentageEarnings', type: 'percent' }
      ];

      const categoryRows: any[] = [];
      categoryData.forEach(c => {
        const catVal = typeof c.value === 'number' && !isNaN(c.value) ? c.value : 0;
        const catPctTotal = typeof c.percentage === 'number' && !isNaN(c.percentage) ? c.percentage / 100 : 0;
        const catPctGross = typeof c.grossPercentage === 'number' && !isNaN(c.grossPercentage) ? c.grossPercentage / 100 : 0;

        categoryRows.push({
          name: c.name || '',
          amount: catVal,
          percentageTotal: catPctTotal,
          percentageEarnings: catPctGross
        });
        
        if (c.subs && c.subs.length > 0) {
          c.subs.forEach((s: any) => {
            const subVal = typeof s.value === 'number' && !isNaN(s.value) ? s.value : 0;
            const subPctTotal = typeof s.percentage === 'number' && !isNaN(s.percentage) ? s.percentage / 100 : 0;
            const subPctGross = typeof s.grossPercentage === 'number' && !isNaN(s.grossPercentage) ? s.grossPercentage / 100 : 0;

            categoryRows.push({
              name: `  ↳ ${s.name || ''}`,
              amount: subVal,
              percentageTotal: subPctTotal,
              percentageEarnings: subPctGross
            });
          });
        }
      });

      const categorySheet = createCustomSheet(categoryRows, categoryCols);
      XLSX.utils.book_append_sheet(workbook, categorySheet, "Categorias");

      // 5. Fuel Summary Sheet
      const fuelCols: ColDef[] = [
        { header: t('type') || 'Combustível', key: 'type', type: 'string' },
        { header: t('fuelingCount') || 'Abastecimentos', key: 'count', type: 'number' },
        { header: t('totalLiters') || 'Litros Totais', key: 'liters', type: 'number' },
        { header: t('avgPrice') || 'Preço Médio / L', key: 'avgPrice', type: 'currency' },
        { header: t('performance') || 'Desempenho (KM/L)', key: 'performance', type: 'string' }
      ];

      const fuelRows = Object.keys(fuelStats).map(type => {
        const s = fuelStats[type];
        const pricesList = Array.isArray(s.prices) ? s.prices : [];
        const avgPrice = pricesList.length > 0 ? pricesList.reduce((a: number, b: number) => a + b, 0) / pricesList.length : 0;
        const perf = consumptionPerType[getEffectiveFuelType(type)];
        return {
          type: t(type) || type || '',
          count: Number(s.count || 0),
          liters: typeof s.liters === 'number' && !isNaN(s.liters) ? s.liters : 0,
          avgPrice: typeof avgPrice === 'number' && !isNaN(avgPrice) ? avgPrice : 0,
          performance: perf ? `${perf.value} km/L` : '--'
        };
      });

      const fuelSheet = createCustomSheet(fuelRows, fuelCols);
      XLSX.utils.book_append_sheet(workbook, fuelSheet, "Combustivel");

      // 6. History Sheet
      const historyCols: ColDef[] = [
        { header: t('date') || 'Data', key: 'date', type: 'string' },
        { header: t('type') || 'Tipo', key: 'type', type: 'string' },
        { header: language === 'pt-BR' ? 'Condutor' : (t('driver') || 'Driver'), key: 'driver', type: 'string' },
        { header: t('item') || 'Descrição / Item', key: 'item', type: 'string' },
        { header: t('amount') || 'Valor', key: 'amount', type: 'currency' },
        { header: t('notes') || 'Observações / Notas', key: 'notes', type: 'string' }
      ];

      const historyRows = history.map(item => {
        const itemDesc = item.type === 'income'
          ? (item.items && item.items.length > 0
              ? item.items.map(it => `${t(it.platform) || it.platform}${it.subcategory ? ` (${it.subcategory})` : ''}`).join(', ')
              : (item.notes || t('income')))
          : (t(item.category || '') || item.category || '');

        const itemType = item.type === 'income'
          ? (language === 'pt-BR' ? 'Ganho' : t('income'))
          : (language === 'pt-BR' ? 'Gasto' : t('expense'));

        const itemAmount = item.type === 'income'
          ? item.totalAmount
          : parseLocaleNumber(item.amount, language);

        const finalAmount = typeof itemAmount === 'number' && !isNaN(itemAmount) ? itemAmount : 0;

        return {
          date: safeFormatDate(item.date, language),
          type: itemType,
          driver: item.driverName || '--',
          item: itemDesc,
          amount: finalAmount,
          notes: item.notes || ''
        };
      });

      const historySheet = createCustomSheet(historyRows, historyCols);
      XLSX.utils.book_append_sheet(workbook, historySheet, "Historico");

      // 5b. Maintenance Sheet
      if (maintenanceStats.items.length > 0) {
        const maintCols: ColDef[] = [
          { header: t('date') || 'Data', key: 'date', type: 'string' },
          { header: language === 'pt-BR' ? 'Subcategoria' : 'Subcategory', key: 'sub', type: 'string' },
          { header: language === 'pt-BR' ? 'Serviço/Descrição' : 'Service/Description', key: 'desc', type: 'string' },
          { header: language === 'pt-BR' ? 'Condutor' : 'Driver', key: 'driver', type: 'string' },
          { header: language === 'pt-BR' ? 'Odômetro (KM)' : 'Odometer (KM)', key: 'odometer', type: 'number' },
          { header: language === 'pt-BR' ? 'Kms Rodados' : 'Km Driven to Maintenance', key: 'kmDriven', type: 'number' },
          { header: t('subcategoryCpk') || 'Gasto por KM', key: 'cpk', type: 'currency' },
          { header: t('amount') || 'Valor', key: 'amount', type: 'currency' }
        ];

        const maintRows = maintenanceStats.items.map(item => ({
          date: safeFormatDate(item.date, language),
          sub: t(item.sub) || item.sub,
          desc: item.maintenanceType || item.notes || '',
          driver: item.driverName || '--',
          odometer: item.latestOdo !== null && item.latestOdo !== undefined ? item.latestOdo : '',
          kmDriven: item.kmDriven !== null && item.kmDriven !== undefined ? item.kmDriven : '',
          cpk: item.cpk !== null && item.cpk !== undefined ? item.cpk : 0,
          amount: item.amount
        }));

        // Append empty spacer row
        maintRows.push({
          date: '',
          sub: '',
          desc: '',
          driver: '',
          odometer: '',
          kmDriven: '',
          cpk: '',
          amount: ''
        } as any);

        // Append Total Maintenance amount row
        maintRows.push({
          date: '',
          sub: language === 'pt-BR' ? 'TOTAL GERAL' : 'TOTAL AMOUNT',
          desc: '',
          driver: '',
          odometer: '',
          kmDriven: '',
          cpk: '',
          amount: maintenanceStats.totalMaintenanceAmount
        } as any);

        // Append Average Maintenance CPK row
        maintRows.push({
          date: '',
          sub: language === 'pt-BR' ? 'GASTO MÉDIO POR KM' : 'AVERAGE COST PER KM',
          desc: '',
          driver: '',
          odometer: '',
          kmDriven: '',
          cpk: maintenanceStats.avgMaintenanceCpk,
          amount: ''
        } as any);

        const maintSheet = createCustomSheet(maintRows, maintCols);
        XLSX.utils.book_append_sheet(workbook, maintSheet, language === 'pt-BR' ? 'Manutencao' : 'Maintenance');
      }

      // Use SheetJS's built-in platform-aware output dispatcher (multi-platform fallback for iframe bounds)
      XLSX.writeFile(workbook, `relatorio_completo_${startDate}_${endDate}.xlsx`);
      setShowExportDropdown(false);
    } catch (err) {
      console.error('Error during Excel export:', err);
      alert(language === 'pt-BR' 
        ? `Falha ao exportar para Excel: ${(err as Error).message}. Por favor, tente novamente.` 
        : `Failed to export to Excel: ${(err as Error).message}. Please try again.`
      );
    }
  };

  const exportToCSV = () => {
    try {
      const overallPerformance = mainValues.earnings > 0 ? (mainValues.profit / mainValues.earnings) : 0;

      // Construct flattened highly detailed data array for CSV
      const combinedData = [
        { Section: '--- RESUMO FINANCEIRO ---', Date: '', Item: '', Amount: '', Notes: '' },
        { Section: 'Resumo', Date: '', Item: t('totalProfit') || 'Lucro Líquido', Amount: `${t('currencySymbol')} ${formatLocaleCurrency(mainValues.profit, language)}`, Notes: '' },
        { Section: 'Resumo', Date: '', Item: t('totalEarnings') || 'Ganhos Brutos', Amount: `${t('currencySymbol')} ${formatLocaleCurrency(mainValues.earnings, language)}`, Notes: '' },
        { Section: 'Resumo', Date: '', Item: t('totalExpenses') || 'Gastos Totais', Amount: `${t('currencySymbol')} ${formatLocaleCurrency(mainValues.expenses, language)}`, Notes: '' },
        { Section: '', Date: '', Item: '', Amount: '', Notes: '' },
        { Section: '--- DESEMPENHO DIÁRIO ---', Date: '', Item: '', Amount: '', Notes: '' },
        ...chartData.map(d => ({
          Section: language === 'pt-BR' ? 'Desempenho Diario' : 'Daily Performance',
          Date: safeFormatDate(d.date, language),
          Item: language === 'pt-BR' ? `Margem de Lucro (%): ${d.performance.toFixed(1)}% | Ganhos: ${t('currencySymbol')} ${formatLocaleCurrency(d.earnings, language)} | Gastos: ${t('currencySymbol')} ${formatLocaleCurrency(d.expenses, language)}` : `Profit Margin (%): ${d.performance.toFixed(1)}% | Earnings: ${t('currencySymbol')} ${formatLocaleCurrency(d.earnings, language)} | Expenses: ${t('currencySymbol')} ${formatLocaleCurrency(d.expenses, language)}`,
          Amount: `${t('currencySymbol')} ${formatLocaleCurrency(d.profit, language)}`,
          Notes: language === 'pt-BR' ? `Porcentagem de Lucro para o período de ${safeFormatDate(d.date, language)}: ${d.performance.toFixed(1)}%` : `Profit Percentage for the period of ${safeFormatDate(d.date, language)}: ${d.performance.toFixed(1)}%`
        })),
        { Section: '', Date: '', Item: '', Amount: '', Notes: '' },
        { Section: '--- ESTATÍSTICAS DETALHADAS ---', Date: '', Item: '', Amount: '', Notes: '' },
        ...detailedStats.map(s => ({ Section: 'Estatística', Date: '', Item: s.label || '', Amount: String(s.value || ''), Notes: '' })),
        { Section: '', Date: '', Item: '', Amount: '', Notes: '' },
        { Section: '--- PLATAFORMAS ---', Date: '', Item: '', Amount: '', Notes: '' },
        ...platformData.map(p => ({
          Section: 'Plataforma',
          Date: '',
          Item: p.name || '',
          Amount: `${t('currencySymbol')} ${formatLocaleCurrency(p.value, language)}`,
          Notes: `Viagens: ${p.trips} | Lucro: ${t('currencySymbol')} ${formatLocaleCurrency(p.profit, language)} | Performance: ${(p.value > 0 ? (p.profit / p.value) * 100 : 0).toFixed(1)}%`
        })),
        { Section: '', Date: '', Item: '', Amount: '', Notes: '' },
        { Section: '--- CATEGORIAS ---', Date: '', Item: '', Amount: '', Notes: '' },
        ...categoryData.map(c => ({ Section: 'Categoria', Date: '', Item: c.name || '', Amount: `${t('currencySymbol')} ${formatLocaleCurrency(c.value, language)}`, Notes: `${c.percentage.toFixed(1)}% ${t('percentageExpenseVsTotal')} | ${c.grossPercentage.toFixed(1)}% ${t('percentageExpenseVsEarnings')}` })),
        { Section: '', Date: '', Item: '', Amount: '', Notes: '' },
        { Section: '--- COMBUSTÍVEL ---', Date: '', Item: '', Amount: '', Notes: '' },
        ...Object.keys(fuelStats).map(type => {
          const s = fuelStats[type];
          const avgPrice = s.prices.length > 0 ? s.prices.reduce((a, b) => a + b, 0) / s.prices.length : 0;
          const perf = consumptionPerType[getEffectiveFuelType(type)];
          return {
            Section: 'Combustivel',
            Date: '',
            Item: t(type) || type || '',
            Amount: `${s.liters.toFixed(1)}L`,
            Notes: `Abastecimentos: ${s.count} | Preço Médio: ${avgPrice.toFixed(2)} | Desempenho: ${perf ? perf.value : '--'} km/L`
          };
        }),
        { Section: '', Date: '', Item: '', Amount: '', Notes: '' },
        { Section: '--- RELATÓRIO DE MANUTENÇÃO ---', Date: '', Item: '', Amount: '', Notes: '' },
        ...maintenanceStats.items.map(item => ({
          Section: language === 'pt-BR' ? 'Manutencao' : 'Maintenance',
          Date: safeFormatDate(item.date, language),
          Item: `${t(item.sub) || item.sub} | ${item.maintenanceType || item.notes || ''}`,
          Amount: `${t('currencySymbol')} ${formatLocaleCurrency(item.amount, language)}`,
          Notes: `Odômetro: ${item.latestOdo !== null && item.latestOdo !== undefined ? item.latestOdo.toLocaleString(language) : '--'} KM | Kms Rodados: ${item.kmDriven !== null && item.kmDriven !== undefined ? item.kmDriven.toLocaleString(language) : '--'} KM | Gasto por KM: ${item.cpk !== null && item.cpk !== undefined ? `${t('currencySymbol')} ${formatLocaleCurrency(item.cpk, language)}` : '--'}`
        })),
        ...(maintenanceStats.items.length > 0 ? [
          {
            Section: language === 'pt-BR' ? 'Resumo Manutencao' : 'Maintenance Summary',
            Date: '',
            Item: language === 'pt-BR' ? 'Total Manutenção' : 'Total Maintenance',
            Amount: `${t('currencySymbol')} ${formatLocaleCurrency(maintenanceStats.totalMaintenanceAmount, language)}`,
            Notes: ''
          },
          {
            Section: language === 'pt-BR' ? 'Resumo Manutencao' : 'Maintenance Summary',
            Date: '',
            Item: language === 'pt-BR' ? 'Gasto méd. com Manutenção por Km' : 'Avg. Maintenance Cost per Km',
            Amount: `${t('currencySymbol')} ${formatLocaleCurrency(maintenanceStats.avgMaintenanceCpk, language)}`,
            Notes: ''
          }
        ] : []),
        { Section: '', Date: '', Item: '', Amount: '', Notes: '' },
        { Section: '--- VEÍCULO ---', Date: '', Item: '', Amount: '', Notes: '' },
        ...(activeVehicle ? [
          { Section: 'Veiculo', Date: '', Item: language === 'pt-BR' ? 'Marca' : 'Brand', Amount: activeVehicle?.brand || '', Notes: '' },
          { Section: 'Veiculo', Date: '', Item: language === 'pt-BR' ? 'Modelo' : 'Model', Amount: activeVehicle?.model || '', Notes: '' },
          { Section: 'Veiculo', Date: '', Item: language === 'pt-BR' ? 'Placa' : 'Plate', Amount: activeVehicle?.plate || '', Notes: '' },
          { Section: 'Veiculo', Date: '', Item: language === 'pt-BR' ? 'Tanque' : 'Tank', Amount: activeVehicle?.tankCapacity ? `${activeVehicle.tankCapacity}L` : '', Notes: '' }
        ] : []),
        { Section: '', Date: '', Item: '', Amount: '', Notes: '' },
        { Section: '--- HISTÓRICO ---', Date: '', Item: '', Amount: '', Notes: '' },
        ...history.map(item => {
          const itemDesc = item.type === 'income'
            ? (item.items && item.items.length > 0
                ? item.items.map(it => `${t(it.platform) || it.platform}${it.subcategory ? ` (${it.subcategory})` : ''}`).join(', ')
                : (item.notes || t('income')))
            : (t(item.category || '') || item.category || '');

          const itemType = item.type === 'income'
            ? (language === 'pt-BR' ? 'Ganho' : t('income'))
            : (language === 'pt-BR' ? 'Gasto' : t('expense'));

          const itemAmount = item.type === 'income'
            ? item.totalAmount
            : parseLocaleNumber(item.amount, language);

          const finalAmount = typeof itemAmount === 'number' && !isNaN(itemAmount) ? itemAmount : 0;

          return {
            Section: 'Historico',
            Date: safeFormatDate(item.date, language),
            Item: `${itemType} | ${itemDesc}${item.driverName ? ` (${item.driverName})` : ''}`,
            Amount: `${t('currencySymbol')} ${formatLocaleCurrency(finalAmount, language)}`,
            Notes: item.notes || ''
          };
        })
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
      URL.revokeObjectURL(url);
      setShowExportDropdown(false);
    } catch (err) {
      console.error('Error during CSV export:', err);
      alert(language === 'pt-BR' ? `Falha ao exportar para CSV: ${(err as Error).message}. Por favor, tente novamente.` : `Failed to export to CSV: ${(err as Error).message}. Please try again.`);
    }
  };

  const getComparisonLabel = (change: number | null, lang: string, preset: string) => {
    if (change === null || change === undefined) return '';
    const periodLabelPt = preset === 'day' ? 'Ontem' : preset === 'week' ? 'Semana Anterior' : preset === 'month' ? 'Mês Anterior' : 'Ano Anterior';
    const periodLabelEn = preset === 'day' ? 'Yesterday' : preset === 'week' ? 'Previous Week' : preset === 'month' ? 'Previous Month' : 'Previous Year';
    const periodLabel = lang === 'pt-BR' ? periodLabelPt : periodLabelEn;
    
    if (change >= 0) {
      return lang === 'pt-BR' 
        ? `aumento de ${change}% vs ${periodLabel}`
        : `increase of ${change}% vs ${periodLabel}`;
    } else {
      return lang === 'pt-BR'
        ? `redução de ${Math.abs(change)}% vs ${periodLabel}`
        : `decrease of ${Math.abs(change)}% vs ${periodLabel}`;
    }
  };

  const isCurrentPeriodActive = (() => {
    if (reportPreset === 'custom') return true;
    const today = new Date();
    if (reportPreset === 'day') {
      return (
        anchorDate.getDate() === today.getDate() &&
        anchorDate.getMonth() === today.getMonth() &&
        anchorDate.getFullYear() === today.getFullYear()
      );
    }
    if (reportPreset === 'week') {
      const getWeekMon = (d: Date) => {
        const nd = new Date(d);
        const day = nd.getDay();
        const diff = nd.getDate() - day + (day === 0 ? -6 : 1);
        const mon = new Date(nd.setDate(diff));
        mon.setHours(0, 0, 0, 0);
        return mon.getTime();
      };
      return getWeekMon(anchorDate) === getWeekMon(today);
    }
    if (reportPreset === 'month') {
      return (
        anchorDate.getMonth() === today.getMonth() &&
        anchorDate.getFullYear() === today.getFullYear()
      );
    }
    if (reportPreset === 'year') {
      return anchorDate.getFullYear() === today.getFullYear();
    }
    return true;
  })();

  const getCurrentPeriodLabel = () => {
    if (language === 'pt-BR') {
      switch (reportPreset) {
        case 'day': return 'Dia Atual';
        case 'week': return 'Semana Atual';
        case 'month': return 'Mês Atual';
        case 'year': return 'Ano Atual';
        default: return 'Período Atual';
      }
    } else {
      switch (reportPreset) {
        case 'day': return 'Current Day';
        case 'week': return 'Current Week';
        case 'month': return 'Current Month';
        case 'year': return 'Current Year';
        default: return 'Current Period';
      }
    }
  };

  return (
    <div className="space-y-10 pb-20">
      <header className="mb-8 text-center flex flex-col items-center">
        <h2 className="text-3xl font-extrabold font-headline text-on-surface tracking-tight mb-2">{t('reports')}</h2>
        <p className="text-sm text-on-surface-variant font-medium font-body">{t('analyzePerformance')}</p>
      </header>

      {/* Chart Selection & Clean Console Section */}
      <section className="bg-surface-container-lowest p-6 md:p-8 rounded-[2.5rem] shadow-xl border border-surface-container-high relative">
        
        {/* Consolidated and Styled Dashboard Control Console */}
        <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-5 mb-6 border-b border-outline-variant/10 pb-5">
          {/* Universal Control Section: Grid for responsive arrangement */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-5 flex-1 items-end">
            
            {/* Column 1: Vehicle selection */}
            <div className="col-span-12 md:col-span-3 space-y-1.5">
              <span className="text-[10px] font-black uppercase tracking-wider text-on-surface-variant opacity-60">
                {language === 'pt-BR' ? 'Veículo Sob Análise' : 'Vehicle Under Analysis'}
              </span>
              {userProfile?.vehicles && userProfile.vehicles.length > 0 && onActiveVehicleChange ? (
                <div className="bg-surface-container-low px-3 h-9 rounded-xl border border-outline-variant/10 flex items-center gap-2 shadow-sm">
                  <Car size={14} className="text-primary shrink-0" />
                  <div className="relative w-full overflow-hidden text-left">
                    <select
                      value={activeVehicleId || ''}
                      onChange={(e) => onActiveVehicleChange(e.target.value)}
                      className="bg-transparent text-[11px] font-black text-on-surface outline-none appearance-none cursor-pointer pr-5 truncate w-full"
                    >
                      {userProfile.vehicles.map((v: any) => (
                        <option key={v.id} value={v.id}>
                          {v.brand} {v.model} ({v.plate})
                        </option>
                      ))}
                    </select>
                    <ChevronDown size={12} className="absolute right-0 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none opacity-50" />
                  </div>
                </div>
              ) : (
                <div className="bg-surface-container-low px-3 h-9 rounded-xl border border-outline-variant/10 text-[11px] text-on-surface-variant opacity-60 italic flex items-center">
                  {language === 'pt-BR' ? 'Nenhum veículo registrado' : 'No registered vehicles'}
                </div>
              )}
            </div>

            {/* Column 2: Specific Metrics Select */}
            <div className="col-span-12 md:col-span-4 space-y-1.5">
              <span className="text-[10px] font-black uppercase tracking-wider text-on-surface-variant opacity-60">
                {language === 'pt-BR' ? 'Métrica do Relatório' : 'Report Metric'}
              </span>
              <div className="flex bg-surface-container-low p-0.5 h-9 rounded-xl border border-outline-variant/10 shadow-sm items-center w-full">
                {charts.map((chart, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setCurrentChart(idx);
                      setShowPerformanceLine(false);
                    }}
                    className={`flex-1 text-center py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer h-8 flex items-center justify-center ${
                      currentChart === idx 
                        ? 'bg-primary text-on-primary shadow-sm' 
                        : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high/30'
                    }`}
                  >
                    {chart.title}
                  </button>
                ))}
              </div>
            </div>

            {/* Column 3: Interval of time presets */}
            <div className="col-span-12 md:col-span-5 space-y-1.5">
              <span className="text-[10px] font-black uppercase tracking-wider text-on-surface-variant opacity-60">
                {language === 'pt-BR' ? 'Intervalo de Tempo' : 'Time Interval'}
              </span>
              <div className="flex bg-surface-container-low p-0.5 h-9 rounded-xl border border-outline-variant/10 shadow-sm items-center w-full">
                {(['day', 'week', 'month', 'year', 'custom'] as const).map((p) => (
                  <button
                    key={p}
                    onClick={() => {
                      setReportPreset(p);
                      if (p !== 'custom') {
                        updateDatesFromPreset(p, anchorDate);
                      } else {
                        const currentYear = new Date().getFullYear();
                        const startVal = `${currentYear}-01-01`;
                        const endVal = getLocalDateString(new Date());
                        onStartDateChange(startVal);
                        onEndDateChange(endVal);
                      }
                    }}
                    className={`flex-1 text-center py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer h-8 flex items-center justify-center ${
                      reportPreset === p 
                        ? 'bg-primary text-on-primary shadow-sm' 
                        : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high/30'
                    }`}
                  >
                    {p === 'custom' ? (language === 'pt-BR' ? 'Personalizado' : 'Custom') : t(p)}
                  </button>
                ))}
              </div>
            </div>

          </div>

          {/* Right Action: Symmetrical aligned export menu */}
          <div className="flex flex-col space-y-1.5 shrink-0 self-start sm:self-auto xl:min-w-[130px]">
            <span className="text-[10px] font-black uppercase tracking-wider text-on-surface-variant opacity-60">
              {language === 'pt-BR' ? 'Ações' : 'Actions'}
            </span>
            <div className="relative w-full">
              <button 
                onClick={() => setShowExportDropdown(!showExportDropdown)}
                className="w-full flex items-center justify-center gap-2 px-4 h-9 bg-surface-container-low hover:bg-surface-container-high text-primary border border-primary/20 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer shadow-sm shadow-primary/5"
              >
                <Download size={13} />
                {t('export')}
                <ChevronDown size={11} className={`transition-transform duration-200 ${showExportDropdown ? 'rotate-180' : ''}`} />
              </button>

              <AnimatePresence>
                {showExportDropdown && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95, y: -10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -10 }}
                    className="absolute right-0 top-full mt-1.5 w-44 bg-surface-container-lowest border border-outline-variant/20 rounded-xl shadow-2xl z-50 overflow-hidden"
                  >
                    <button 
                      onClick={exportToPDF}
                      className="w-full px-3 py-2.5 text-left flex items-center gap-2 hover:bg-surface-container-low transition-colors border-b border-outline-variant/5 text-xs font-bold cursor-pointer"
                    >
                      <img src="https://img.icons8.com/color/48/pdf.png" alt="PDF" className="w-5 h-5 object-contain" referrerPolicy="no-referrer" />
                      <span className="text-[10px] font-black uppercase tracking-tighter text-on-surface">Exportar PDF</span>
                    </button>
                    <button 
                      onClick={exportToExcel}
                      className="w-full px-3 py-2.5 text-left flex items-center gap-2 hover:bg-surface-container-low transition-colors border-b border-outline-variant/5 text-xs font-bold cursor-pointer"
                    >
                      <img src="https://img.icons8.com/color/48/microsoft-excel-2019.png" alt="Excel" className="w-5 h-5 object-contain" referrerPolicy="no-referrer" />
                      <span className="text-[10px] font-black uppercase tracking-tighter text-on-surface">Exportar EXCEL</span>
                    </button>
                    <button 
                      onClick={exportToCSV}
                      className="w-full px-3 py-2.5 text-left flex items-center gap-2 hover:bg-surface-container-low transition-colors text-xs font-bold cursor-pointer"
                    >
                      <img src="https://img.icons8.com/color/48/csv.png" alt="CSV" className="w-5 h-5 object-contain" referrerPolicy="no-referrer" />
                      <span className="text-[10px] font-black uppercase tracking-tighter text-on-surface">Exportar CSV</span>
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Beautiful Dynamic Period Range Banner with integrated table picker and return reset */}
        <div className="bg-surface-container-low p-2 px-3 rounded-2xl border border-outline-variant/10 shadow-sm flex flex-col md:flex-row md:items-center justify-center gap-3 mb-6 relative min-h-[52px]">
          
          {/* Action 1: Return to Current Period ("Período Atual", "Mês Atual", etc.) */}
          <AnimatePresence>
            {!isCurrentPeriodActive && reportPreset !== 'custom' && (
              <motion.button
                initial={{ opacity: 0, scale: 0.9, x: -10 }}
                animate={{ opacity: 1, scale: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.9, x: -10 }}
                onClick={() => {
                  const today = new Date();
                  setAnchorDate(today);
                  updateDatesFromPreset(reportPreset, today);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-surface-container-lowest text-primary border border-primary/20 rounded-xl text-[10px] font-extrabold uppercase tracking-widest transition-all cursor-pointer shadow-sm active:scale-98 shrink-0 justify-center"
                title={language === 'pt-BR' ? 'Retornar para o período atual' : 'Return to current period'}
              >
                <RotateCcw size={11} className="text-primary" />
                {getCurrentPeriodLabel()}
              </motion.button>
            )}
          </AnimatePresence>

          {/* Action 2: Standard Step Navigation (Left/Right Arrows with the Period Label) */}
          {reportPreset !== 'custom' ? (
            <div className="flex items-center justify-center bg-surface-container-lowest px-1 py-0.5 rounded-xl border border-outline-variant/5 shadow-inner flex-1 max-w-[340px]">
              <button 
                onClick={() => {
                  const newAnchor = new Date(anchorDate);
                  if (reportPreset === 'day') {
                    newAnchor.setDate(newAnchor.getDate() - 1);
                  } else if (reportPreset === 'week') {
                    newAnchor.setDate(newAnchor.getDate() - 7);
                  } else if (reportPreset === 'month') {
                    newAnchor.setMonth(newAnchor.getMonth() - 1);
                  } else if (reportPreset === 'year') {
                    newAnchor.setFullYear(newAnchor.getFullYear() - 1);
                  }
                  setAnchorDate(newAnchor);
                  updateDatesFromPreset(reportPreset, newAnchor);
                }}
                className="p-1.5 hover:bg-surface-container-high rounded-lg text-primary active:scale-90 transition-all cursor-pointer shrink-0"
                title={language === 'pt-BR' ? 'Anterior' : 'Previous'}
              >
                <ChevronLeft size={16} />
              </button>
              
              <DatePicker 
                date={anchorDate}
                setDate={(d) => {
                  if (d) {
                    setAnchorDate(d);
                    updateDatesFromPreset(reportPreset, d);
                  }
                }}
                className="flex-1 flex items-center justify-center hover:bg-surface-container-high/60 hover:text-primary transition-all rounded-lg px-2.5 py-1 select-none min-w-0"
              >
                <div className="text-[11px] font-black uppercase tracking-wider text-on-surface text-center truncate flex-1 font-mono leading-none flex items-center justify-center gap-1.5 pt-0.5">
                  <span>
                    {reportPreset === 'day' && anchorDate.toLocaleDateString(language, { day: '2-digit', month: 'long', year: 'numeric' })}
                    {reportPreset === 'week' && (() => {
                      const { monday, sunday } = getWeekRangeForDate(anchorDate);
                      return `${monday.toLocaleDateString(language, { day: '2-digit', month: 'short' })} - ${sunday.toLocaleDateString(language, { day: '2-digit', month: 'short', year: 'numeric' })}`;
                    })()}
                    {reportPreset === 'month' && anchorDate.toLocaleDateString(language, { month: 'long', year: 'numeric' }).toUpperCase()}
                    {reportPreset === 'year' && anchorDate.getFullYear()}
                  </span>
                  <Calendar size={12} className="text-primary opacity-60 text-[10px] shrink-0" />
                </div>
              </DatePicker>

              <button 
                onClick={() => {
                  const newAnchor = new Date(anchorDate);
                  if (reportPreset === 'day') {
                    newAnchor.setDate(newAnchor.getDate() + 1);
                  } else if (reportPreset === 'week') {
                    newAnchor.setDate(newAnchor.getDate() + 7);
                  } else if (reportPreset === 'month') {
                    newAnchor.setMonth(newAnchor.getMonth() + 1);
                  } else if (reportPreset === 'year') {
                    newAnchor.setFullYear(newAnchor.getFullYear() + 1);
                  }
                  setAnchorDate(newAnchor);
                  updateDatesFromPreset(reportPreset, newAnchor);
                }}
                className="p-1.5 hover:bg-surface-container-high rounded-lg text-primary active:scale-90 transition-all cursor-pointer shrink-0"
                title={language === 'pt-BR' ? 'Próximo' : 'Next'}
              >
                <ChevronRight size={16} />
              </button>
            </div>
          ) : (
            /* Custom date inputs step selector */
            <div className="flex flex-1 items-center justify-center gap-2 bg-surface-container-lowest p-1 rounded-xl border border-outline-variant/10 shadow-inner max-w-sm mx-auto w-full">
              <DatePicker 
                date={new Date(startDate + 'T12:00:00')}
                setDate={(d) => d && onStartDateChange(getLocalDateString(d))}
                className="!min-h-[28px] !h-7 !py-0.5 bg-transparent border-0 text-[10px] shadow-none flex-1 font-bold text-center"
              />
              <span className="text-[10px] font-black uppercase text-on-surface-variant opacity-40 shrink-0">Até</span>
              <DatePicker 
                date={new Date(endDate + 'T12:00:00')}
                setDate={(d) => d && onEndDateChange(getLocalDateString(d))}
                className="!min-h-[28px] !h-7 !py-0.5 bg-transparent border-0 text-[10px] shadow-none flex-1 font-bold text-center"
              />
            </div>
          )}

        </div>

        {/* Small Ambient Chart Banner Info */}
        <div className="mb-6 p-2 bg-primary/5 border border-primary/10 rounded-lg flex items-center justify-center gap-2">
          <p className="text-[10px] font-bold text-primary uppercase tracking-wider">
            {t('chartActivityNotice')}
          </p>
          <Info size={14} className="text-primary" />
        </div>

        {/* Beautiful Highlight Value Card */}
        {!showPerformanceLine && (
          <div className="mb-6 flex justify-center">
            <div className="bg-gradient-to-b from-surface-container-low to-surface-container-lowest border border-outline-variant/20 px-6 py-4 rounded-2xl flex flex-col items-center justify-center text-center shadow-sm max-w-xs w-full transition-all hover:shadow-md">
              <p className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.1em] text-on-surface-variant leading-none">{activeValue.label}</p>
              <h2 className={`text-xl md:text-2xl font-black font-headline tracking-tight mt-1.5 leading-none ${activeValue.color}`}>
                {t('currencySymbol')} {formatLocaleCurrency(activeValue.value, language)}
              </h2>
              {reportPreset !== 'custom' && (() => {
                const activeChange = activeChart.id === 'profit' 
                  ? profitChange 
                  : activeChart.id === 'earnings' 
                    ? earningsChange 
                    : activeChart.id === 'expenses' 
                      ? expensesChange 
                      : null;
                
                if (activeChange === null || activeChange === undefined || activeChange === 0) return null;
                
                const isExpense = activeChart.id === 'expenses';
                const isGood = isExpense ? activeChange < 0 : activeChange > 0;
                const textColor = isGood ? 'text-secondary font-black' : 'text-error font-black';

                return (
                  <span className={`text-[9px] md:text-[10px] font-black uppercase tracking-wider block mt-2.5 leading-none ${textColor}`}>
                    {getComparisonLabel(activeChange, language, reportPreset)}
                  </span>
                );
              })()}
            </div>
          </div>
        )}

        {activeChart.id === 'profit' && showPerformanceLine && (
          <div className="mb-4 p-2 bg-amber-500/5 border border-amber-500/10 rounded-lg flex items-center justify-center gap-2">
            <p className="text-[10px] font-bold text-amber-600 uppercase tracking-wider text-center">
              {language === 'pt-BR' 
                ? 'A performance mostra em porcentagem o que sobrou dos seus ganhos depois de ter sido retirado todos os gastos'
                : 'Performance shows as a percentage what is left of your earnings after all expenses have been deducted'}
            </p>
            <Info size={14} className="text-amber-500 shrink-0" />
          </div>
        )}

        <div className="h-[400px] w-full pt-4 relative">
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

                    {!['profit', 'earnings', 'expenses'].includes(activeChart.id) && <Tooltip content={<CustomGeneralTooltip />} />}

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
                            formatter={(value: number) => value > 0 ? `${t('currencySymbol')} ${customRoundChartValue(value)}` : ''}
                            style={{ fontSize: '11px', fontWeight: '900', fill: f.color, stroke: '#fff', strokeWidth: 3, paintOrder: 'stroke' }}
                          />
                        </Bar>
                      ))
                    ) : activeChart.id === 'general' ? (
                      <>
                        <Line
                          type="linear"
                          dataKey="display_earnings"
                          name={language === 'pt-BR' ? 'Ganho' : t('earnings')}
                          stroke="#00C853"
                          strokeWidth={3.5}
                          dot={{ r: 5, fill: '#00C853', strokeWidth: 1.5, stroke: '#fff' }}
                          activeDot={{ r: 7 }}
                          isAnimationActive={false}
                        >
                          <LabelList 
                            dataKey="earnings_pct" 
                            position="top" 
                            offset={12}
                            formatter={(value: number) => value > 0 ? `${Math.round(value)}%` : ''}
                            style={{ fontSize: '13px', fontWeight: '950', fill: '#00C853', stroke: '#fff', strokeWidth: 3, paintOrder: 'stroke' }}
                          />
                        </Line>
                        <Line
                          type="linear"
                          dataKey="display_expenses"
                          name={language === 'pt-BR' ? 'Gasto' : t('expenses')}
                          stroke="#FF5252"
                          strokeWidth={3.5}
                          dot={{ r: 5, fill: '#FF5252', strokeWidth: 1.5, stroke: '#fff' }}
                          activeDot={{ r: 7 }}
                          isAnimationActive={false}
                        >
                          <LabelList 
                            dataKey="expenses_pct" 
                            position="bottom" 
                            offset={12}
                            formatter={(value: number) => value > 0 ? `${Math.round(value)}%` : ''}
                            style={{ fontSize: '13px', fontWeight: '950', fill: '#FF5252', stroke: '#fff', strokeWidth: 3, paintOrder: 'stroke' }}
                          />
                        </Line>
                        <Line
                          type="linear"
                          dataKey="display_profit"
                          name={language === 'pt-BR' ? 'Lucro' : t('profit')}
                          stroke="#2196F3"
                          strokeWidth={3.5}
                          dot={{ r: 5, fill: '#2196F3', strokeWidth: 1.5, stroke: '#fff' }}
                          activeDot={{ r: 7 }}
                          isAnimationActive={false}
                        >
                          <LabelList 
                            dataKey="profit_pct" 
                            position="top" 
                            offset={12}
                            formatter={(value: number) => value > 0 ? `${Math.round(value)}%` : ''}
                            style={{ fontSize: '13px', fontWeight: '950', fill: '#2196F3', stroke: '#fff', strokeWidth: 3, paintOrder: 'stroke' }}
                          />
                        </Line>
                      </>
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
                              formatter={(value: number) => value > 0 ? `${t('currencySymbol')} ${customRoundChartValue(value)}` : ''}
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
            <div className="flex flex-col items-end">
              <p className="text-lg font-black font-headline text-primary">
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
          {detailedStats.map((stat, i) => (
            <div key={i} className="flex items-center justify-between p-4 bg-surface-container-low rounded-[1.25rem] border border-outline-variant/10 hover:border-black/5 transition-all shadow-sm">
              <div className="flex flex-col">
                <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">{stat.label}</p>
                {stat.change !== null && stat.change !== 0 && (
                  <div className={`flex items-center gap-1 text-[11px] font-black mt-1 ${
                    stat.isCustomInverted
                      ? (stat.change < 0 ? 'text-secondary' : 'text-error') // Verde se redução (< 0), Vermelho se aumento (> 0)
                      : (stat.color === 'error'
                        ? (stat.change > 0 ? 'text-error' : 'text-secondary')
                        : (stat.change > 0 ? 'text-secondary' : 'text-error'))
                  }`}>
                    {stat.change > 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                    {Math.abs(stat.change)}%
                  </div>
                )}
              </div>
              <p className={`text-sm font-black font-headline text-on-surface`}>
                {stat.isCurrency ? `${t('currencySymbol')} ${stat.value}` : stat.value}
                {stat.suffix && <span className="text-[10px] ml-1 opacity-50 uppercase">{stat.suffix}</span>}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Side-by-Side Category and Platform Cards (Unified single card wrapper) */}
      <div className="bg-surface-container-lowest p-6 md:p-8 rounded-[2.5rem] shadow-sm border border-surface-container-high transition-all duration-300 w-full mt-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 relative">
          
          {/* Column 1: Expenses by Category */}
          <div className="w-full">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-12 h-12 bg-surface-container-high rounded-2xl flex items-center justify-center -rotate-3 hover:rotate-0 transition-transform">
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
                    
                    <div className="space-y-2">
                      <div className="flex justify-between items-end">
                        <div className="flex items-center gap-2">
                          <c.icon size={14} className="text-error" />
                          <p className="font-black text-[10px] text-on-surface uppercase tracking-wider">{c.name}</p>
                        </div>
                        <div className="text-right flex flex-col items-end">
                          <p className="font-black text-base text-error leading-none mb-0.5">{t('currencySymbol')} {formatLocaleCurrency(c.value, language)}</p>
                          <div className="flex items-center gap-1.5 flex-wrap justify-end">
                            <div className="px-1.5 py-0.5 bg-error/10 border border-error/20 rounded-md">
                              <p className="font-black text-[10px] text-error uppercase tracking-tighter whitespace-nowrap">
                                {c.percentage.toFixed(1)}% <span className="font-bold opacity-70">{t('percentageExpenseVsTotal')}</span>
                              </p>
                            </div>
                            <div className="px-1.5 py-0.5 bg-secondary/10 border border-secondary/20 rounded-md">
                              <p className="font-black text-[10px] text-secondary uppercase tracking-tighter whitespace-nowrap">
                                {c.grossPercentage.toFixed(1)}% <span className="font-bold opacity-70">{t('percentageExpenseVsEarnings')}</span>
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="h-2.5 overflow-hidden">
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
          </div>

          {/* Symmetrical Dividers */}
          <div className="hidden lg:block absolute left-1/2 top-0 bottom-0 w-px bg-outline-variant/15 -translate-x-1/2"></div>
          <div className="block lg:hidden h-px bg-outline-variant/15 my-6"></div>

          {/* Column 2: Earnings by Platform */}
          <div className="w-full">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-12 h-12 bg-surface-container-high rounded-2xl flex items-center justify-center rotate-3 hover:rotate-0 transition-transform">
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
          </div>

        </div>
      </div>

      {/* 3-Cards Slider Group */}
      <div className="relative w-full max-w-4xl mx-auto space-y-4 px-2 mt-12">
        <div className="relative flex items-center justify-between w-full">
          {/* Left Arrow Button */}
          <button 
            onClick={() => setActiveSlide(prev => (prev - 1 + totalSlides) % totalSlides)}
            className="absolute -left-4 sm:-left-16 top-1/2 -translate-y-1/2 z-30 p-2 sm:p-3 rounded-full bg-surface-container-highest shadow-xl transition-all hover:scale-105 active:scale-95 border border-outline-variant/10 text-primary hover:bg-primary hover:text-on-primary"
            aria-label="Anterior"
          >
            <ChevronLeft size={24} />
          </button>

          {/* Slide Window container with AnimatePresence */}
          <div className="w-full overflow-hidden px-8 sm:px-0">
            <AnimatePresence mode="wait">
              {activeSlide === 0 && (
                <motion.div
                  key="slide-0"
                  initial={{ opacity: 0, x: 50 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -50 }}
                  transition={{ duration: 0.2 }}
                  className="w-full"
                >
                  {/* Recent History */}
                  <div className="bg-surface-container-lowest p-6 md:p-8 rounded-[2.5rem] shadow-sm border border-surface-container-high transition-all duration-300 w-full">
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
                                    <p className="text-xs font-bold text-on-surface-variant uppercase flex flex-wrap items-center gap-1.5">
                                      <span>{new Date(item.date + 'T12:00:00').toLocaleDateString(language, { day: '2-digit', month: 'short', year: 'numeric' })} • {item.hoursWorked}</span>
                                      {item.driverName && (
                                        <span className="px-1.5 py-0.5 bg-primary/10 text-primary rounded text-[8px] font-black uppercase tracking-wider flex items-center gap-1">
                                          <User size={10} className="shrink-0 text-primary" />
                                          <span>{item.driverName}</span>
                                        </span>
                                      )}
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
                                    onClick={() => {
                                      onDeleteIncome(item.id);
                                    }}
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
                          const subcategory = item.subCategory || item.fuelType || item.maintenanceType;
                          
                          return (
                            <div key={`expense-${item.id}`} className="bg-surface-container-lowest p-3 rounded-xl border border-outline-variant/20 shadow-sm hover:border-error/30 transition-all group">
                              <div className="flex justify-between items-start mb-2">
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 bg-surface-container-highest rounded-full flex items-center justify-center text-error shrink-0">
                                    <Icon size={20} />
                                  </div>
                                  <div>
                                    <p className="text-xs font-bold text-on-surface-variant uppercase flex flex-wrap items-center gap-1.5">
                                      <span>{new Date(item.date + 'T12:00:00').toLocaleDateString(language, { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                                      {item.driverName && (
                                        <span className="px-1.5 py-0.5 bg-primary/10 text-primary rounded text-[8px] font-black uppercase tracking-wider flex items-center gap-1">
                                          <User size={10} className="shrink-0 text-primary" />
                                          <span>{item.driverName}</span>
                                        </span>
                                      )}
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
                                    onClick={() => {
                                      onDeleteExpense(item.id);
                                    }}
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
                                {subcategory && (
                                  <span className="flex items-center gap-1.5">
                                    <span className="text-on-surface/20">•</span>
                                    <span className="italic text-on-surface text-[10px] font-bold">{t(subcategory) || subcategory}</span>
                                  </span>
                                )}
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
                  </div>
                </motion.div>
              )}

              {activeSlide === 1 && (
                <motion.div
                  key="slide-1"
                  initial={{ opacity: 0, x: 50 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -50 }}
                  transition={{ duration: 0.2 }}
                  className="w-full"
                >
                  {/* Maintenance Report Slider Card */}
                  <div className="bg-surface-container-lowest p-6 md:p-8 rounded-[2.5rem] shadow-sm border border-surface-container-high transition-all duration-300 w-full relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-8 opacity-5">
                      <Wrench size={120} />
                    </div>

                    <div className="relative z-10 space-y-8">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-surface-container-high rounded-2xl flex items-center justify-center -rotate-3 hover:rotate-0 transition-transform text-primary">
                          <Wrench size={24} />
                        </div>
                        <h3 className="text-xl font-black font-headline text-on-surface tracking-tight">{t('maintenanceReport')}</h3>
                      </div>

                      {maintenanceStats.items.length > 0 ? (
                        <div className="space-y-8">
                          {/* Maintenance Summary Cards */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-xl mx-auto">
                            <div className="bg-surface-container-low/50 p-4 rounded-2xl border border-outline-variant/15 shadow-sm text-center">
                              <p className="text-[9px] font-black uppercase tracking-[0.15em] text-primary mb-1">{t('totalMaintenance')}</p>
                              <p className="text-xl font-black font-headline text-on-surface">
                                {t('currencySymbol')} {formatLocaleCurrency(maintenanceStats.totalMaintenanceAmount, language)}
                              </p>
                            </div>
                            <div className="bg-amber-500/10 p-4 rounded-2xl border border-amber-500/30 shadow-md shadow-amber-500/5 text-center transition-all hover:bg-amber-500/15">
                              <p className="text-[9px] font-black uppercase tracking-[0.15em] text-amber-600 dark:text-amber-400 mb-1">
                                {language === 'pt-BR' ? 'Gasto méd. com Manutenção por Km' : 'Avg. Maintenance Cost per Km'}
                              </p>
                              <p className="text-xl font-black font-headline text-amber-700 dark:text-amber-300">
                                {t('currencySymbol')} {formatLocaleCurrency(maintenanceStats.avgMaintenanceCpk, language)}
                              </p>
                            </div>
                          </div>

                          {/* Subcategories Breakdown */}
                          <div className="space-y-6">
                            
                            <div className="max-h-[440px] overflow-y-auto pr-2 custom-scrollbar relative">
                              <div className="space-y-2">
                                <div className="flex items-center px-4 py-3 text-[10px] font-black text-on-secondary uppercase tracking-widest border-b border-secondary/20 sticky top-0 bg-secondary shadow-md z-20 rounded-lg">
                                  <div className="w-16 shrink-0">{t('date')}</div>
                                  <div className="w-24 shrink-0 truncate">{language === 'pt-BR' ? 'Condutor' : (t('driver') || 'Driver')}</div>
                                  <div className="flex-1 min-w-[120px]">{language === 'pt-BR' ? 'Subcategoria / Serviço' : 'Subcategory / Service'}</div>
                                  <div className="w-24 text-center">{language === 'pt-BR' ? 'Odômetro' : 'Odometer'}</div>
                                  <div className="w-24 text-center">{language === 'pt-BR' ? 'KMs Rodados' : 'KM Driven'}</div>
                                  <div className="w-24 text-center">{language === 'pt-BR' ? 'Gasto por Km' : 'CPK'}</div>
                                  <div className="w-24 text-right">{t('amount')}</div>
                                </div>
                                {maintenanceStats.items.map((item, idx) => {
                                  const hasAllThree = item.latestOdo !== null && item.latestOdo !== undefined && item.kmDriven !== null && item.kmDriven !== undefined && item.kmDriven > 0;
                                  return (
                                    <div 
                                      key={idx} 
                                      className={`flex items-center px-4 py-4 rounded-xl border transition-all ${
                                        hasAllThree 
                                          ? 'bg-amber-500/10 hover:bg-amber-500/15 border-amber-500/25 shadow-sm shadow-amber-500/2' 
                                          : 'bg-surface-container-low border-outline-variant/5 hover:border-black/10'
                                      }`}
                                    >
                                      {/* Date */}
                                      <div className="w-16 shrink-0">
                                        <p className="text-xs font-black text-black uppercase">
                                          {new Date(item.date + 'T12:00:00').toLocaleDateString(language, { day: '2-digit', month: '2-digit' })}
                                        </p>
                                      </div>
                                      
                                      {/* Driver */}
                                      <div className="w-24 shrink-0 truncate flex items-center pr-2">
                                        {item.driverName ? (
                                          <span className="px-1.5 py-0.5 bg-primary/10 text-primary rounded text-[9px] font-black uppercase tracking-wider flex items-center gap-1 truncate max-w-full">
                                            <User size={10} className="shrink-0 text-primary" />
                                            <span className="truncate">{item.driverName}</span>
                                          </span>
                                        ) : (
                                          <span className="text-xs text-neutral-400">--</span>
                                        )}
                                      </div>

                                      {/* Subcategory & Service */}
                                      <div className="flex-1 min-w-[120px] pr-2">
                                        <p className="text-xs font-black text-black truncate uppercase">
                                          {t(item.sub) || item.sub}
                                        </p>
                                        <p className="text-[10px] text-on-surface-variant font-medium truncate italic max-w-xs">
                                          {item.maintenanceType || item.notes || '--'}
                                        </p>
                                      </div>

                                      {/* Odometer */}
                                      <div className="w-24 text-center">
                                        <p className="text-xs font-black text-black font-mono">
                                          {item.latestOdo !== null && item.latestOdo !== undefined ? `${item.latestOdo.toLocaleString(language)} KM` : '--'}
                                        </p>
                                      </div>

                                      {/* KM Driven */}
                                      <div className="w-24 text-center">
                                        <p className="text-xs font-black text-black font-mono">
                                          {item.kmDriven !== null && item.kmDriven !== undefined ? `${item.kmDriven.toLocaleString(language)} KM` : '--'}
                                        </p>
                                      </div>

                                      {/* CPK */}
                                      <div className="w-24 text-center">
                                        <p className={`text-xs font-black font-mono ${hasAllThree ? 'text-amber-600 dark:text-amber-400' : 'text-primary'}`}>
                                          {item.cpk !== null && item.cpk !== undefined ? (
                                            `${t('currencySymbol')} ${formatLocaleCurrency(item.cpk, language)}`
                                          ) : (
                                            "--"
                                          )}
                                        </p>
                                      </div>

                                      {/* Amount */}
                                      <div className="w-24 text-right">
                                        <p className="text-xs font-black text-black font-mono">
                                          {t('currencySymbol')} {formatLocaleCurrency(item.amount, language)}
                                        </p>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="bg-surface-container-low border-2 border-dashed border-outline-variant/30 rounded-[2.5rem] p-10 text-center space-y-4">
                          <div className="inline-flex p-4 bg-surface-container-high rounded-full text-neutral-400">
                            <Wrench size={32} />
                          </div>
                          <div className="space-y-1">
                            <p className="text-neutral-500 font-black uppercase text-[10px] tracking-widest leading-relaxed">
                              {expenses.some(e => e.category === 'maintenance') ? t('butHaveHistoryOutside') : t('noHistory')}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}

              {activeSlide === 2 && (
                <motion.div
                  key="slide-2"
                  initial={{ opacity: 0, x: 50 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -50 }}
                  transition={{ duration: 0.2 }}
                  className="w-full"
                >
                  {/* Resumo de Abastecimentos Slider Card */}
                  <div className="bg-surface-container-lowest p-6 md:p-8 rounded-[2.5rem] shadow-sm border border-surface-container-high transition-all duration-300 w-full relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-8 opacity-5">
                      <Fuel size={120} />
                    </div>

                    <div className="relative z-10 space-y-8">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-surface-container-high rounded-2xl flex items-center justify-center -rotate-3 hover:rotate-0 transition-transform text-error">
                          <Fuel size={24} />
                        </div>
                        <h3 className="text-xl font-black font-headline text-on-surface tracking-tight">{t('fuelSummary')}</h3>
                      </div>

                      {fuelExpenses.length > 0 ? (
                        <div className="space-y-6">
                          {/* Per Fuel Type Breakdown */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
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
                          <div className="mt-6 pt-6 border-t border-black/10">
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

                      {/* Performance Sub-section inside the Card */}
                      <div className="border-t border-outline-variant/10 pt-8 mt-8">
                        <div className="space-y-6">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="space-y-1">
                              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-secondary flex items-center gap-2">
                                <Zap size={12} />
                                {t('performanceByFuel')}
                              </p>
                            </div>

                            {/* Selectors */}
                            <div className="flex p-1 bg-surface-container-low rounded-xl">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setFuelView('full');
                                }}
                                className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${
                                  fuelView === 'full' 
                                    ? 'bg-secondary text-on-secondary shadow-sm' 
                                    : 'text-on-surface-variant hover:bg-surface-container-high'
                                }`}
                              >
                                {t('fullTank')}
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setFuelView('partial');
                                }}
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
                            <div className="flex justify-center gap-4">
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
                          <div className="max-h-[440px] overflow-y-auto pr-2 custom-scrollbar relative">
                            {filteredPerformanceRecords.length > 0 ? (
                              <div className="space-y-2">
                                <div className="flex items-center px-4 py-3 text-[10px] font-black text-on-secondary uppercase tracking-widest border-b border-secondary/20 sticky top-0 bg-secondary shadow-md z-20 rounded-lg">
                                  <div className="w-16 shrink-0">{t('date')}</div>
                                  <div className="w-24 shrink-0 truncate">{language === 'pt-BR' ? 'Condutor' : (t('driver') || 'Driver')}</div>
                                  <div className="flex-1 min-w-[80px]">{t('fuel')}</div>
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
                                      <div className="w-24 shrink-0 truncate flex items-center gap-1.5 pr-2">
                                        {item.driverName ? (
                                          <span className="px-1.5 py-0.5 bg-primary/10 text-primary rounded text-[9px] font-black uppercase tracking-wider flex items-center gap-1 truncate max-w-full">
                                            <User size={10} className="shrink-0 text-primary" />
                                            <span className="truncate">{item.driverName}</span>
                                          </span>
                                        ) : (
                                          <span className="text-xs text-neutral-400">--</span>
                                        )}
                                      </div>
                                      <div className="flex-1 min-w-[80px]">
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
                                  <Info size={14} />
                                </div>
                                <div className="space-y-1">
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
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Right Arrow Button */}
          <button 
            onClick={() => setActiveSlide(prev => (prev + 1) % totalSlides)}
            className="absolute -right-4 sm:-right-16 top-1/2 -translate-y-1/2 z-30 p-2 sm:p-3 rounded-full bg-surface-container-highest shadow-xl transition-all hover:scale-105 active:scale-95 border border-outline-variant/10 text-primary hover:bg-primary hover:text-on-primary"
            aria-label="Próximo"
          >
            <ChevronRight size={24} />
          </button>
        </div>

        {/* Dots Pagination Indicators */}
        <div className="flex justify-center items-center gap-2 pt-2 pb-6">
          {[0, 1, 2].map((idx) => (
            <button
              key={idx}
              onClick={() => setActiveSlide(idx)}
              className={`h-2 rounded-full transition-all duration-300 ${activeSlide === idx ? 'w-6 bg-primary' : 'w-2 bg-on-surface-variant/20 hover:bg-on-surface-variant/40'}`}
              aria-label={`Ir para slide ${idx + 1}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
