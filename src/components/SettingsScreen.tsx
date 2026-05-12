import React, { useState, useRef, useMemo } from 'react';
import { 
  User, 
  Settings, 
  Bell, 
  Shield, 
  HelpCircle, 
  ChevronRight, 
  ChevronDown,
  Camera,
  LogOut,
  Moon,
  Sun,
  Globe,
  Plus,
  Trash2,
  Edit2,
  CheckCircle,
  Tag,
  Car,
  Mail,
  Target,
  Repeat,
  RotateCcw,
  Info,
  MapPin,
  Users,
  Key,
  Calendar,
  Clock,
  Wrench,
  Fuel,
  Utensils,
  SquareParking,
  Truck,
  Gavel,
  Milestone,
  Ship,
  IdCard,
  Wifi,
  MoreHorizontal,
  CarTaxiFront,
  Bike,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Goal, UserProfile, Vehicle, Category, Platform, TransactionFrequency, TransactionStatus, ExpenseRecord, CATEGORIES, PLATFORMS } from '../types';
import { FUEL_SUBCATEGORIES, MAINTENANCE_SUBCATEGORIES, FOOD_SUBCATEGORIES } from '../constants';
import { useLanguage } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';
import { parseLocaleNumber, formatLocaleCurrency, formatMaskedCurrency } from '../lib/currency';
import { getNextDate } from '../lib/dates';

const iconMap: Record<string, any> = {
  MapPin, Car, PersonStanding: User, Key, Users, Target, Info, Bell, Lock: Shield, Moon, HelpCircle, FileText: IdCard, MessageSquare: HelpCircle, ShieldCheck: Shield, Edit2, ChevronDown, CheckCircle, Mail: IdCard, Phone: IdCard, CalendarIcon: Clock, Clock, Plus, Trash2, Tag, Repeat, Wrench, Fuel, Utensils, SquareParking, Truck, Gavel, Milestone, Ship, IdCard, Wifi, MoreHorizontal, CarTaxiFront, Bike
};

interface SettingsScreenProps {
  goal: Goal;
  onSaveGoal: (goal: Goal) => void;
  goalHistory?: Record<string, Goal>;
  onDeleteGoalHistory?: (id: string) => void;
  userProfile: UserProfile;
  onSaveProfile: (profile: UserProfile) => void;
  categories: Category[];
  onSaveCategories: (categories: Category[]) => void;
  platforms: Platform[];
  onSavePlatforms: (platforms: Platform[]) => void;
  expenses: ExpenseRecord[];
  filter?: 'day' | 'week' | 'month' | 'year';
  selectedDate?: string;
  selectedYear?: number;
  selectedMonth?: number;
  selectedWeek?: number;
}

export function SettingsScreen({ 
  goal, 
  onSaveGoal, 
  goalHistory = {},
  onDeleteGoalHistory,
  userProfile, 
  onSaveProfile, 
  categories, 
  onSaveCategories, 
  platforms, 
  onSavePlatforms,
  expenses,
  filter,
  selectedDate,
  selectedYear,
  selectedMonth,
  selectedWeek
}: SettingsScreenProps) {
  const { t, language, setLanguage } = useLanguage();
  const { theme, toggleTheme } = useTheme();

  const periodLabel = useMemo(() => {
    if (!filter) return '';
    if (filter === 'year') return `${selectedYear}`;
    if (filter === 'month' && selectedYear !== undefined && selectedMonth !== undefined) {
      return new Date(selectedYear, selectedMonth).toLocaleDateString(language, { month: 'long', year: 'numeric' });
    }
    if (filter === 'day' && selectedDate) {
      return new Date(selectedDate + 'T12:00:00').toLocaleDateString(language, { day: '2-digit', month: 'long', year: 'numeric' });
    }
    if (filter === 'week' && selectedWeek !== undefined && selectedYear !== undefined) {
      return `${t('week')} ${selectedWeek} • ${selectedYear}`;
    }
    return '';
  }, [filter, selectedYear, selectedMonth, selectedDate, selectedWeek, language, t]);
  
  const [profileData, setProfileData] = useState<UserProfile>(userProfile);
  const [vehicleData, setVehicleData] = useState<Vehicle>(userProfile.vehicle || { plate: '' });
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isEditingVehicle, setIsEditingVehicle] = useState(false);
  const [isEditingGoal, setIsEditingGoal] = useState(false);
  const [isAddingGoalHistory, setIsAddingGoalHistory] = useState(false);
  
  const [goalMonth, setGoalMonth] = useState(new Date().getMonth());
  const [goalYear, setGoalYear] = useState(new Date().getFullYear());
  
  const [monthlyInput, setMonthlyInput] = useState(formatLocaleCurrency(goal.monthly, language));
  const [weeklyInput, setWeeklyInput] = useState(formatLocaleCurrency(goal.weekly, language));
  const [dailyInput, setDailyInput] = useState(formatLocaleCurrency(goal.daily, language));
  const [yearlyInput, setYearlyInput] = useState(formatLocaleCurrency(goal.yearly, language));
  const [workHoursInput, setWorkHoursInput] = useState(goal.workHours?.toString() || '8');
  const [workDaysPerWeekInput, setWorkDaysPerWeekInput] = useState(goal.workDaysPerWeek?.toString() || '6');
  const [workDaysPerMonthInput, setWorkDaysPerMonthInput] = useState(goal.workDaysPerMonth?.toString() || '26');
  const [categoryBudgetsInput, setCategoryBudgetsInput] = useState<Record<string, string>>({});

  // Password fields
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');

  // Sync inputs when goal or language changes
  React.useEffect(() => {
    setMonthlyInput(formatLocaleCurrency(goal.monthly, language));
    setWeeklyInput(formatLocaleCurrency(goal.weekly, language));
    setDailyInput(formatLocaleCurrency(goal.daily, language));
    setYearlyInput(formatLocaleCurrency(goal.yearly, language));
    setWorkHoursInput(goal.workHours?.toString() || '8');
    setWorkDaysPerWeekInput(goal.workDaysPerWeek?.toString() || '6');
    setWorkDaysPerMonthInput(goal.workDaysPerMonth?.toString() || '26');
    
    // Sync category budgets
    const budgets: Record<string, string> = {};
    categories.filter(c => c.costType === 'variable').forEach(cat => {
      budgets[cat.id] = formatLocaleCurrency(goal.categoryBudgets?.[cat.id] || 0, language);
    });
    setCategoryBudgetsInput(budgets);
  }, [goal, language, categories]);

  const depreciationTableData = useMemo(() => {
    if (!vehicleData.initialValue || !vehicleData.depreciationRate || !vehicleData.depreciationYears) {
      return [];
    }

    const table = [];
    let currentValue = vehicleData.initialValue;
    const rate = vehicleData.depreciationRate / 100;

    for (let year = 1; year <= vehicleData.depreciationYears; year++) {
      currentValue = currentValue * (1 - rate);
      table.push({
        year,
        value: currentValue
      });
    }
    return table;
  }, [vehicleData.initialValue, vehicleData.depreciationRate, vehicleData.depreciationYears]);
  
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryType, setNewCategoryType] = useState<'fixed' | 'variable'>('variable');
  const [newPlatformName, setNewPlatformName] = useState('');
  const [newPlatformType, setNewPlatformType] = useState<'fixed' | 'variable'>('variable');
  
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editingCategoryName, setEditingCategoryName] = useState('');
  const [editingCategoryType, setEditingCategoryType] = useState<'fixed' | 'variable'>('variable');
  const [editingDefaultAmount, setEditingDefaultAmount] = useState('');
  const [editingInitialDate, setEditingInitialDate] = useState('');
  const [editingFrequency, setEditingFrequency] = useState<TransactionFrequency>('none');
  const [editingBudgetLimit, setEditingBudgetLimit] = useState('');
  
  const [editingPlatformId, setEditingPlatformId] = useState<string | null>(null);
  const [editingPlatformName, setEditingPlatformName] = useState('');
  const [editingPlatformType, setEditingPlatformType] = useState<'fixed' | 'variable'>('variable');
  const [editingPlatformAmount, setEditingPlatformAmount] = useState('');
  const [editingPlatformDate, setEditingPlatformDate] = useState('');
  const [editingPlatformFrequency, setEditingPlatformFrequency] = useState<TransactionFrequency>('none');
  
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const systemCategoryIds = useMemo(() => new Set(CATEGORIES.map(c => c.id)), []);
  const systemPlatformIds = useMemo(() => new Set(PLATFORMS.map(p => p.id)), []);
  const [addingSubToCategoryId, setAddingSubToCategoryId] = useState<string | null>(null);
  const [newSubcategoryName, setNewSubcategoryName] = useState('');
  
  const [editingSubCategoryId, setEditingSubCategoryId] = useState<string | null>(null);
  const [editingSubOriginalName, setEditingSubOriginalName] = useState('');
  const [editingSubName, setEditingSubName] = useState('');
  
  const [showSuccess, setShowSuccess] = useState(false);
  const [errorAlert, setErrorAlert] = useState<string | null>(null);
  const [showLangDropdown, setShowLangDropdown] = useState(false);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const formatCurrency = (val: number) => formatLocaleCurrency(val, language);

  const normalize = (str: string) => 
    str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

  const calculatedGoals = useMemo(() => {
    const monthly = parseLocaleNumber(monthlyInput, language) || 0;
    const workHours = parseFloat(workHoursInput) || 8;
    const workDaysPerWeek = parseFloat(workDaysPerWeekInput) || 6;
    const workDaysPerMonth = workDaysPerWeek * 4.33;

    const monthlyWorkHours = workHours * workDaysPerMonth;
    const hourlyProfit = monthlyWorkHours > 0 ? monthly / monthlyWorkHours : 0;

    return {
      monthly,
      weekly: monthly / 4,
      daily: workDaysPerMonth > 0 ? monthly / workDaysPerMonth : 0,
      yearly: 0,
      workHours,
      workDaysPerMonth,
      workDaysPerWeek,
      hourlyProfit
    };
  }, [monthlyInput, workHoursInput, workDaysPerWeekInput, language]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfileData({ ...profileData, avatarUrl: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleSaveProfile = () => {
    onSaveProfile(profileData);
    setIsEditingProfile(false);
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
  };

  const handleSaveVehicle = () => {
    const updatedProfile = { ...userProfile, vehicle: vehicleData };
    onSaveProfile(updatedProfile);
    setIsEditingVehicle(false);
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
  };

  const handleSaveGoal = () => {
    const monthly = parseLocaleNumber(monthlyInput, language);
    const workHours = parseFloat(workHoursInput);
    const workDaysPerWeek = parseInt(workDaysPerWeekInput);
    
    if (isNaN(monthly) || isNaN(workHours) || isNaN(workDaysPerWeek) || monthly < 0 || workHours <= 0 || workDaysPerWeek <= 0) {
      setErrorAlert(t('fieldsRequired'));
      setTimeout(() => setErrorAlert(null), 3000);
      return;
    }

    const key = `${goalYear}-${String(goalMonth + 1).padStart(2, '0')}`;
    
    const categoryBudgets: Record<string, number> = {};
    Object.entries(categoryBudgetsInput).forEach(([catId, val]) => {
      const num = parseLocaleNumber(val as string, language);
      if (num > 0) categoryBudgets[catId] = num;
    });

    // Check for duplicate goal only when adding a NEW goal
    if (isAddingGoalHistory && goalHistory[key]) {
      setErrorAlert(t('goalAlreadyExists'));
      setTimeout(() => setErrorAlert(null), 3000);
      return;
    }

    const newGoal: Goal = {
      id: key,
      month: goalMonth,
      year: goalYear,
      monthly: calculatedGoals.monthly,
      daily: calculatedGoals.daily,
      weekly: calculatedGoals.weekly,
      yearly: calculatedGoals.yearly,
      workHours: calculatedGoals.workHours,
      workDaysPerMonth: calculatedGoals.workDaysPerMonth,
      workDaysPerWeek: workDaysPerWeek,
      categoryBudgets
    };
    onSaveGoal(newGoal);
    setIsEditingGoal(false);
    setIsAddingGoalHistory(false);
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
  };

  const handleAddCategory = () => {
    if (!newCategoryName.trim()) return;
    const name = newCategoryName.trim();
    const normalizedName = normalize(name);
    
    const exists = categories.some(c => {
      const existingName = c.isDefault ? t(c.id) : c.name;
      return normalize(existingName) === normalizedName;
    });

    if (exists) {
      setErrorAlert(t('categoryAlreadyExists'));
      setTimeout(() => setErrorAlert(null), 3000);
      return;
    }
    const newCat: Category = {
      id: `custom_${Date.now()}`,
      name: name,
      icon: 'Tag',
      color: newCategoryType === 'fixed' ? 'primary' : 'error',
      isDefault: false,
      costType: newCategoryType,
      subcategories: [],
    };
    onSaveCategories([...categories, newCat]);
    setNewCategoryName('');
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
  };

  const handleUpdateCategory = () => {
    if (!editingCategoryId || !editingCategoryName.trim()) return;
    const name = editingCategoryName.trim();
    const normalizedName = normalize(name);
    
    // Check for duplicates
    const exists = categories.some(c => {
      if (c.id === editingCategoryId) return false;
      const existingName = c.isDefault ? t(c.id) : c.name;
      return normalize(existingName) === normalizedName;
    });
    
    if (exists) {
      setErrorAlert(t('categoryAlreadyExists'));
      setTimeout(() => setErrorAlert(null), 3000);
      return;
    }

    const cat = categories.find(c => c.id === editingCategoryId);
    const updated = categories.map(c => c.id === editingCategoryId ? { 
      ...c, 
      name, 
      costType: editingCategoryType
    } : c);

    onSaveCategories(updated);
    setEditingCategoryId(null);
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
  };

  const handleDeleteCategory = (id: string) => {
    onSaveCategories(categories.filter(c => c.id !== id));
  };

  const handleAddPlatform = () => {
    if (!newPlatformName.trim()) return;
    const name = newPlatformName.trim();
    const normalizedName = normalize(name);
    
    const exists = platforms.some(p => {
      const existingName = p.isDefault ? t(p.id) : p.name;
      return normalize(existingName) === normalizedName;
    });

    if (exists) {
      setErrorAlert(t('platformAlreadyExists'));
      setTimeout(() => setErrorAlert(null), 3000);
      return;
    }
    const newPlat: Platform = {
      id: `custom_${Date.now()}`,
      name: name,
      icon: 'Target',
      color: 'primary',
      isDefault: false,
      type: newPlatformType,
    };
    onSavePlatforms([...platforms, newPlat]);
    setNewPlatformName('');
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
  };

  const handleUpdatePlatform = () => {
    if (!editingPlatformId || !editingPlatformName.trim()) return;
    const name = editingPlatformName.trim();
    const normalizedName = normalize(name);
    
    // Check for duplicates
    const exists = platforms.some(p => {
      if (p.id === editingPlatformId) return false;
      const existingName = p.isDefault ? t(p.id) : p.name;
      return normalize(existingName) === normalizedName;
    });
    
    if (exists) {
      setErrorAlert(t('platformAlreadyExists'));
      setTimeout(() => setErrorAlert(null), 3000);
      return;
    }

    const plat = platforms.find(p => p.id === editingPlatformId);
    const updated = platforms.map(p => p.id === editingPlatformId ? { 
      ...p, 
      name, 
      type: editingPlatformType,
      defaultAmount: editingPlatformType === 'fixed' ? parseLocaleNumber(editingPlatformAmount, language) : undefined,
      initialDate: editingPlatformType === 'fixed' ? editingPlatformDate : undefined,
      frequency: editingPlatformType === 'fixed' ? editingPlatformFrequency : undefined,
      lastProcessedDate: editingPlatformType === 'fixed' ? editingPlatformDate : p.lastProcessedDate
    } : p);

    onSavePlatforms(updated);
    setEditingPlatformId(null);
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
  };

  const handleDeletePlatform = (id: string) => {
    onSavePlatforms(platforms.filter(p => p.id !== id));
  };

  const toggleCategory = (id: string) => {
    const next = new Set(expandedCategories);
    if (next.has(id)) next.delete(id); else next.add(id);
    setExpandedCategories(next);
  };

  const handleAddSubcategory = (categoryId: string) => {
    if (!newSubcategoryName.trim()) return;
    const name = newSubcategoryName.trim();
    const normalizedName = normalize(name);
    
    // Check for duplicates in current category
    const cat = categories.find(c => c.id === categoryId);
    if (cat) {
      const subs = cat.subcategories || [];
      const exists = subs.some(s => normalize(t(s)) === normalizedName);
      if (exists) {
        setErrorAlert(t('subcategoryAlreadyExists'));
        setTimeout(() => setErrorAlert(null), 3000);
        return;
      }
    }

    const updated = categories.map(c => {
      if (c.id === categoryId) {
        const subs = c.subcategories || [];
        return { ...c, subcategories: [...subs, name] };
      }
      return c;
    });
    onSaveCategories(updated);
    setNewSubcategoryName('');
    setAddingSubToCategoryId(null);
  };

  const handleDeleteSubcategory = (categoryId: string, subName: string) => {
    const updated = categories.map(c => {
      if (c.id === categoryId) {
        return { ...c, subcategories: (c.subcategories || []).filter(s => s !== subName) };
      }
      return c;
    });
    onSaveCategories(updated);
  };

  const handleUpdateSubcategory = () => {
    if (!editingSubName.trim() || !editingSubCategoryId) return;
    const name = editingSubName.trim();
    const normalizedName = normalize(name);
    
    // Check for duplicates
    const cat = categories.find(c => c.id === editingSubCategoryId);
    if (cat) {
      const subs = cat.subcategories || [];
      const exists = subs.some(s => {
        if (s === editingSubOriginalName) return false;
        return normalize(t(s)) === normalizedName;
      });
      if (exists) {
        setErrorAlert(t('subcategoryAlreadyExists'));
        setTimeout(() => setErrorAlert(null), 3000);
        return;
      }
    }

    const updated = categories.map(c => {
      if (c.id === editingSubCategoryId) {
        return { ...c, subcategories: (c.subcategories || []).map(s => s === editingSubOriginalName ? name : s) };
      }
      return c;
    });
    onSaveCategories(updated);
    setEditingSubCategoryId(null);
  };

  const faqItems = [
    { q: 'faqQ1', a: 'faqA1' },
    { q: 'faqQ2', a: 'faqA2' },
    { q: 'faqQ3', a: 'faqA3' }
  ];

  return (
    <div className="space-y-10">
      <header className="mb-10">
        <h2 className="text-4xl font-extrabold font-headline text-on-surface tracking-tight mb-2">{t('settings')}</h2>
        <p className="text-on-surface-variant font-body">{t('manageAccount')}</p>
      </header>

      {showSuccess && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="bg-primary text-on-primary px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 border border-white/20">
            <CheckCircle size={24} />
            <p className="font-black">{t('success')}</p>
          </div>
        </div>
      )}

      {errorAlert && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="bg-error text-on-error px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 border border-white/20">
            <Info size={24} />
            <p className="font-black">{errorAlert}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-12 gap-6">
        {/* Profile Section */}
        <section className="col-span-12 lg:col-span-8 bg-surface-container-lowest rounded-xl p-6 shadow-sm">
          <div className="flex flex-col md:flex-row gap-8 items-start">
            <div className="relative group">
              <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
              <div className="w-32 h-32 rounded-xl overflow-hidden ring-4 ring-surface-container-low transition-all">
                <img 
                  alt="Avatar" 
                  className="w-full h-full object-cover cursor-pointer hover:opacity-80 transition-all duration-300" 
                  src={profileData.avatarUrl || "https://picsum.photos/seed/driver/300/300"}
                  referrerPolicy="no-referrer"
                  onClick={handleAvatarClick}
                />
              </div>
              <button 
                onClick={handleAvatarClick}
                className="absolute -bottom-2 -right-2 bg-primary text-on-primary p-2 rounded-lg shadow-lg hover:scale-110 transition-transform"
              >
                <Edit2 size={16} />
              </button>
            </div>
            <div className="flex-1 space-y-6 w-full">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="w-full md:w-auto">
                  <h3 className="text-2xl font-bold font-headline text-on-surface">
                    {profileData.firstName} {profileData.lastName}
                  </h3>
                  <div className="flex flex-wrap items-center gap-2 mt-3">
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 text-primary rounded-full border border-primary/20">
                      <MapPin size={12} />
                      <span className="text-[10px] font-black uppercase tracking-wider">{profileData.city}, {profileData.state}</span>
                    </div>
                    {profileData.email && (
                      <div className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 text-primary rounded-full border border-primary/20">
                        <Mail size={12} />
                        <span className="text-[10px] font-black uppercase tracking-wider">{profileData.email}</span>
                      </div>
                    )}
                    {profileData.phone && (
                      <div className="flex items-center gap-2 px-3 py-1.5 bg-secondary/10 text-secondary rounded-full border border-secondary/20">
                        <Users size={12} />
                        <span className="text-[10px] font-black uppercase tracking-wider">{profileData.phone}</span>
                      </div>
                    )}
                    {profileData.birthDate && (
                      <div className="flex items-center gap-2 px-3 py-1.5 bg-surface-container-high text-on-surface-variant rounded-full border border-outline-variant/20">
                        <Calendar size={12} />
                        <span className="text-[10px] font-black uppercase tracking-wider">{new Date(profileData.birthDate + 'T12:00:00').toLocaleDateString(language)}</span>
                      </div>
                    )}
                    {profileData.password && (
                      <div className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 text-primary rounded-full border border-primary/20">
                        <Key size={12} />
                        <span className="text-[10px] font-black uppercase tracking-wider">••••••••</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              {isEditingProfile ? (
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in duration-300">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-on-surface-variant font-label uppercase tracking-wider px-1 flex items-center gap-2">
                        <Users size={12} /> {t('firstName')}
                      </label>
                      <input 
                        className="w-full bg-surface-container-low p-3 rounded-lg text-sm font-medium focus:ring-2 focus:ring-primary/50 outline-none"
                        type="text"
                        placeholder={t('firstName')}
                        onFocus={(e) => e.target.placeholder = ""}
                        onBlur={(e) => e.target.placeholder = t('firstName')}
                        value={profileData.firstName}
                        onChange={(e) => setProfileData({ ...profileData, firstName: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-on-surface-variant font-label uppercase tracking-wider px-1 flex items-center gap-2">
                        <Users size={12} /> {t('lastName')}
                      </label>
                      <input 
                        className="w-full bg-surface-container-low p-3 rounded-lg text-sm font-medium focus:ring-2 focus:ring-primary/50 outline-none"
                        type="text"
                        placeholder={t('lastName')}
                        onFocus={(e) => e.target.placeholder = ""}
                        onBlur={(e) => e.target.placeholder = t('lastName')}
                        value={profileData.lastName}
                        onChange={(e) => setProfileData({ ...profileData, lastName: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-on-surface-variant font-label uppercase tracking-wider px-1 flex items-center gap-2">
                        <IdCard size={12} /> {t('email')}
                      </label>
                      <input 
                        className="w-full bg-surface-container-low p-3 rounded-lg text-sm font-medium focus:ring-2 focus:ring-primary/50 outline-none"
                        type="email"
                        placeholder={t('emailPlaceholder')}
                        onFocus={(e) => e.target.placeholder = ""}
                        onBlur={(e) => e.target.placeholder = t('emailPlaceholder')}
                        value={profileData.email}
                        onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-on-surface-variant font-label uppercase tracking-wider px-1 flex items-center gap-2">
                        <Users size={12} /> {t('phone')}
                      </label>
                      <input 
                        className="w-full bg-surface-container-low p-3 rounded-lg text-sm font-medium focus:ring-2 focus:ring-primary/50 outline-none"
                        type="tel"
                        placeholder={t('phonePlaceholder')}
                        onFocus={(e) => e.target.placeholder = ""}
                        onBlur={(e) => e.target.placeholder = t('phonePlaceholder')}
                        value={profileData.phone}
                        onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-on-surface-variant font-label uppercase tracking-wider px-1">{t('birthDate')}</label>
                      <input 
                        className="w-full bg-surface-container-low p-3 rounded-lg text-sm font-medium focus:ring-2 focus:ring-primary/50 outline-none"
                        type="date"
                        value={profileData.birthDate}
                        onChange={(e) => setProfileData({ ...profileData, birthDate: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-on-surface-variant font-label uppercase tracking-wider px-1">{t('city')}</label>
                      <input 
                        className="w-full bg-surface-container-low p-3 rounded-lg text-sm font-medium focus:ring-2 focus:ring-primary/50 outline-none"
                        type="text"
                        placeholder={t('city')}
                        onFocus={(e) => e.target.placeholder = ""}
                        onBlur={(e) => e.target.placeholder = t('city')}
                        value={profileData.city}
                        onChange={(e) => setProfileData({ ...profileData, city: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-on-surface-variant font-label uppercase tracking-wider px-1">{t('state')}</label>
                      <input 
                        className="w-full bg-surface-container-low p-3 rounded-lg text-sm font-medium focus:ring-2 focus:ring-primary/50 outline-none"
                        type="text"
                        placeholder={t('state')}
                        onFocus={(e) => e.target.placeholder = ""}
                        onBlur={(e) => e.target.placeholder = t('state')}
                        value={profileData.state}
                        onChange={(e) => setProfileData({ ...profileData, state: e.target.value })}
                      />
                    </div>

                    {/* Password Section */}
                    <div className="col-span-1 md:col-span-2 pt-6 mt-2 border-t border-outline-variant/20">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-on-surface-variant font-label uppercase tracking-wider px-1">{t('password')}</label>
                          <input 
                            className="w-full bg-surface-container-low p-3 rounded-lg text-sm font-medium focus:ring-2 focus:ring-primary/50 outline-none cursor-default"
                            type="password"
                            value={profileData.password || ''}
                            readOnly
                            autoFocus
                            onKeyDown={(e) => {
                              // Prevent deletion/editing
                              if (e.key === 'Backspace' || e.key === 'Delete') {
                                e.preventDefault();
                              }
                            }}
                          />
                        </div>
                        <div className="hidden md:block"></div> {/* Spacer */}
                        
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-on-surface-variant font-label uppercase tracking-wider px-1">{t('currentPassword')}</label>
                          <input 
                            className="w-full bg-surface-container-low p-3 rounded-lg text-sm font-medium focus:ring-2 focus:ring-primary/50 outline-none"
                            type="password"
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-on-surface-variant font-label uppercase tracking-wider px-1">{t('newPassword')}</label>
                          <input 
                            className="w-full bg-surface-container-low p-3 rounded-lg text-sm font-medium focus:ring-2 focus:ring-primary/50 outline-none"
                            type="password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                          />
                        </div>
                        <div className="md:col-span-2 flex justify-start">
                          <button 
                            className="px-6 py-3 bg-primary text-on-primary font-black text-xs rounded-xl shadow-lg shadow-primary/20 hover:scale-[0.98] transition-all"
                            onClick={() => {
                              if (!currentPassword || !newPassword) {
                                setErrorAlert(t('fieldsRequired'));
                                setTimeout(() => setErrorAlert(null), 3000);
                                return;
                              }
                              if (currentPassword === profileData.password) {
                                const updatedProfile = { ...profileData, password: newPassword };
                                setProfileData(updatedProfile);
                                onSaveProfile(updatedProfile);
                                setCurrentPassword('');
                                setNewPassword('');
                                setShowSuccess(true);
                                setTimeout(() => setShowSuccess(false), 3000);
                              } else {
                                setErrorAlert(t('invalidPassword'));
                                setTimeout(() => setErrorAlert(null), 3000);
                              }
                            }}
                          >
                            {t('changePassword')}
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end gap-3 col-span-1 md:col-span-2 pt-4">
                      <button onClick={() => setIsEditingProfile(false)} className="px-6 py-2 text-on-surface-variant font-bold text-sm">{t('cancel')}</button>
                      <button onClick={handleSaveProfile} className="px-8 py-3 bg-primary text-on-primary font-black rounded-lg shadow-sm hover:scale-[0.98] transition-transform">{t('saveChanges')}</button>
                    </div>
                 </div>
              ) : (
                <div className="flex justify-end pt-4">
                  <button onClick={() => setIsEditingProfile(true)} className="px-6 py-2 bg-secondary text-on-secondary font-black rounded-lg shadow-sm hover:scale-[0.98] transition-transform">{t('editProfile')}</button>
                </div>
              )}
            </div>
          </div>
        </section>



        {/* Goal Settings */}
        <section className="col-span-12 bg-surface-container-lowest rounded-xl p-8 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="flex flex-col">
                <h3 className="text-xl font-black font-headline flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Target className="text-primary" size={24} />
                  </div>
                  {t('goalSettings')}
                </h3>
              </div>
            </div>
            {!isEditingGoal && !isAddingGoalHistory && (
              <button 
                onClick={() => {
                  setIsAddingGoalHistory(true);
                  setGoalMonth(new Date().getMonth());
                  setGoalYear(new Date().getFullYear());
                  setMonthlyInput('0,00');
                  setWeeklyInput('0,00');
                  setDailyInput('0,00');
                  setYearlyInput('0,00');
                  setWorkHoursInput('8');
                  setWorkDaysPerMonthInput('26');
                }} 
                className="flex items-center gap-2 px-5 py-2.5 bg-primary text-on-primary font-black text-xs rounded-xl shadow-lg shadow-primary/20 hover:scale-105 transition-all"
              >
                <Plus size={18} />
                {t('newGoal')}
              </button>
            )}
          </div>

          <AnimatePresence mode="wait">
            {(isEditingGoal || isAddingGoalHistory) ? (
              <motion.div 
                key="goal-form"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-8 bg-surface-container-low/30 p-8 rounded-[2rem] border border-outline-variant/10"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
                  {/* Date Selection */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest px-1">{t('month')}</label>
                    <select 
                      className="w-full bg-surface-container-lowest p-4 rounded-2xl text-sm font-bold border border-outline-variant/10 focus:ring-2 focus:ring-primary/20 outline-none appearance-none cursor-pointer"
                      value={goalMonth}
                      onChange={(e) => setGoalMonth(parseInt(e.target.value))}
                    >
                      {Array.from({ length: 12 }, (_, i) => (
                        <option key={i} value={i}>
                          {new Date(2024, i).toLocaleDateString(language, { month: 'long' })}
                        </option>
                      ) )}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest px-1">{t('year')}</label>
                    <select 
                      className="w-full bg-surface-container-lowest p-4 rounded-2xl text-sm font-bold border border-outline-variant/10 focus:ring-2 focus:ring-primary/20 outline-none appearance-none cursor-pointer"
                      value={goalYear}
                      onChange={(e) => setGoalYear(parseInt(e.target.value))}
                    >
                      {Array.from({ length: 5 }, (_, i) => {
                        const year = new Date().getFullYear() - 2 + i;
                        return <option key={year} value={year}>{year}</option>;
                      })}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest px-1">{t('monthlyProfit')} *</label>
                    <input 
                      className="w-full bg-surface-container-lowest p-4 rounded-2xl text-sm font-bold border border-outline-variant/10 focus:ring-2 focus:ring-primary/20 outline-none" 
                      type="text" 
                      placeholder="0,00"
                      value={monthlyInput} 
                      onChange={(e) => {
                        const maskedVal = formatMaskedCurrency(e.target.value, language);
                        setMonthlyInput(maskedVal);
                        const num = parseLocaleNumber(maskedVal, language);
                        if (!isNaN(num)) {
                          setWeeklyInput(formatLocaleCurrency(num / 4, language));
                          setDailyInput(formatLocaleCurrency(num / (parseInt(workDaysPerMonthInput) || 26), language));
                          setYearlyInput(formatLocaleCurrency(num * 12, language));
                        }
                      }} 
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest px-1">{t('weeklyProfit')}</label>
                    <input 
                      className="w-full bg-surface-container-lowest p-4 rounded-2xl text-sm font-bold border border-outline-variant/10 focus:ring-2 focus:ring-primary/20 outline-none" 
                      type="text" 
                      placeholder="0,00"
                      value={weeklyInput} 
                      onChange={(e) => {
                        const maskedVal = formatMaskedCurrency(e.target.value, language);
                        setWeeklyInput(maskedVal);
                        const num = parseLocaleNumber(maskedVal, language);
                        if (!isNaN(num)) {
                          setMonthlyInput(formatLocaleCurrency(num * 4, language));
                          setDailyInput(formatLocaleCurrency((num * 4) / (parseInt(workDaysPerMonthInput) || 26), language));
                          setYearlyInput(formatLocaleCurrency(num * 4 * 12, language));
                        }
                      }} 
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest px-1">{t('dailyProfit')}</label>
                    <input 
                      className="w-full bg-surface-container-lowest p-4 rounded-2xl text-sm font-bold border border-outline-variant/10 focus:ring-2 focus:ring-primary/20 outline-none" 
                      type="text" 
                      placeholder="0,00"
                      value={dailyInput} 
                      onChange={(e) => {
                        const maskedVal = formatMaskedCurrency(e.target.value, language);
                        setDailyInput(maskedVal);
                        const num = parseLocaleNumber(maskedVal, language);
                        if (!isNaN(num)) {
                          setMonthlyInput(formatLocaleCurrency(num * (parseInt(workDaysPerMonthInput) || 26), language));
                          setWeeklyInput(formatLocaleCurrency((num * (parseInt(workDaysPerMonthInput) || 26)) / 4, language));
                          setYearlyInput(formatLocaleCurrency(num * (parseInt(workDaysPerMonthInput) || 26) * 12, language));
                        }
                      }} 
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest px-1">{t('workHours')} *</label>
                    <input 
                      className="w-full bg-surface-container-lowest p-4 rounded-2xl text-sm font-bold border border-outline-variant/10 focus:ring-2 focus:ring-primary/20 outline-none" 
                      type="number" 
                      placeholder="8"
                      value={workHoursInput} 
                      onChange={(e) => setWorkHoursInput(e.target.value)} 
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest px-1">{t('workload')} *</label>
                    <select 
                      className="w-full bg-surface-container-lowest p-4 rounded-2xl text-sm font-bold border border-outline-variant/10 focus:ring-2 focus:ring-primary/20 outline-none appearance-none cursor-pointer"
                      value={workDaysPerWeekInput}
                      onChange={(e) => {
                        const val = parseInt(e.target.value);
                        setWorkDaysPerWeekInput(e.target.value);
                        const monthly = parseLocaleNumber(monthlyInput, language) || 0;
                        if (monthly > 0) {
                          setDailyInput(formatLocaleCurrency(monthly / (val * 4.33), language));
                        }
                      }}
                    >
                      {[1, 2, 3, 4, 5, 6, 7].map(day => (
                        <option key={day} value={day}>
                          {day} {day === 1 ? t('dayPerWeek') : t('daysPerWeek')}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Variable Category Budgets */}
                <div className="space-y-4 pt-4 border-t border-outline-variant/10">
                  <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-on-surface-variant flex items-center gap-2">
                    <Tag size={14} className="text-primary" />
                    {t('categoryBudget')} ({t('variable')})
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {categories.filter(c => c.costType === 'variable').map(cat => {
                      const budgetVal = parseLocaleNumber(categoryBudgetsInput[cat.id] || '0', language) || 0;
                      const dailyBudget = budgetVal / (parseInt(workDaysPerMonthInput) || 26);
                      
                      return (
                        <div key={cat.id} className="p-4 bg-surface-container-lowest rounded-2xl border border-outline-variant/10 space-y-3">
                          <label className="text-[10px] font-black uppercase text-on-surface-variant line-clamp-1">{t(cat.name)}</label>
                          <div className="space-y-1">
                            <input 
                              type="text" 
                              className="w-full bg-surface-container-low p-3 rounded-xl text-sm font-bold border-none focus:ring-2 focus:ring-primary/20 outline-none"
                              placeholder="0,00"
                              value={categoryBudgetsInput[cat.id] || ''}
                              onChange={(e) => {
                                const masked = formatMaskedCurrency(e.target.value, language);
                                setCategoryBudgetsInput(prev => ({ ...prev, [cat.id]: masked }));
                              }}
                            />
                            {budgetVal > 0 && (
                              <div className="flex items-center justify-between px-1">
                                <span className="text-[9px] font-bold text-on-surface-variant/60 uppercase">{t('dailyBudget')}</span>
                                <span className="text-[9px] font-black text-primary uppercase">{formatLocaleCurrency(dailyBudget, language)}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="flex flex-col md:flex-row items-center justify-between gap-6 p-6 bg-primary/5 rounded-3xl border border-primary/10">
                  <p className="text-xs font-bold text-on-surface/70 leading-relaxed max-w-xl">
                    <Info size={14} className="inline-block mr-2 text-primary" />
                    {t('goalInfo')
                      .replace('{monthly}', formatCurrency(calculatedGoals.monthly))
                      .replace('{hourly}', formatCurrency(calculatedGoals.hourlyProfit))
                      .replace('{hours}', calculatedGoals.workHours.toString())}
                  </p>
                  <div className="flex items-center gap-4 w-full md:w-auto">
                    <button 
                      onClick={() => {
                        setIsEditingGoal(false);
                        setIsAddingGoalHistory(false);
                      }} 
                      className="flex-1 md:flex-none px-6 py-3 text-on-surface-variant font-black text-xs uppercase tracking-widest hover:bg-surface-container-high rounded-xl transition-all"
                    >
                      {t('cancel')}
                    </button>
                    <button 
                      onClick={handleSaveGoal} 
                      className="flex-1 md:flex-none px-10 py-4 bg-primary text-on-primary font-black text-xs uppercase tracking-widest rounded-xl shadow-xl shadow-primary/20 hover:scale-[0.98] active:scale-95 transition-all"
                    >
                      {t('saveGoal')}
                    </button>
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div 
                key="goal-list"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-6"
              >
                {/* History Table */}
                <div className="mt-4 space-y-4">
                  <div className="overflow-hidden rounded-3xl border border-outline-variant/10 bg-white/30 backdrop-blur-sm">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-surface-container-low/50">
                          <th className="p-4 text-[10px] font-black uppercase tracking-widest text-on-surface-variant">{t('period')}</th>
                          <th className="p-4 text-[10px] font-black uppercase tracking-widest text-on-surface-variant">{t('monthlyProfit')}</th>
                          <th className="p-4 text-[10px] font-black uppercase tracking-widest text-on-surface-variant">{t('weeklyProfit')}</th>
                          <th className="p-4 text-[10px] font-black uppercase tracking-widest text-on-surface-variant">{t('dailyProfit')}</th>
                          <th className="p-4 text-[10px] font-black uppercase tracking-widest text-on-surface-variant text-right">{t('actions')}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-outline-variant/5">
                        {Object.entries(goalHistory as Record<string, Goal>)
                          .filter(([_, h]) => h && !isNaN(h.year) && !isNaN(h.month))
                          .sort(([_, a], [__, b]) => (b.year * 12 + b.month) - (a.year * 12 + a.month))
                          .map(([key, h]) => (
                          <tr key={key} className="hover:bg-surface-container-low transition-colors group">
                            <td className="p-4">
                              <span className="text-sm font-bold text-on-surface capitalize">
                                {new Date(h.year, h.month).toLocaleDateString(language, { month: 'long', year: 'numeric' })}
                              </span>
                            </td>
                            <td className="p-4">
                              <span className="text-sm font-black text-primary">{formatCurrency(h.monthly)}</span>
                            </td>
                            <td className="p-4">
                              <span className="text-sm font-bold text-primary/70">{formatCurrency(h.weekly)}</span>
                            </td>
                            <td className="p-4">
                              <span className="text-sm font-bold text-secondary">{formatCurrency(h.daily)}</span>
                            </td>
                            <td className="p-4 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <button 
                                  onClick={() => {
                                    setGoalMonth(h.month);
                                    setGoalYear(h.year);
                                    setMonthlyInput(formatLocaleCurrency(h.monthly, language));
                                    setWeeklyInput(formatLocaleCurrency(h.weekly, language));
                                    setDailyInput(formatLocaleCurrency(h.daily, language));
                                    setYearlyInput(formatLocaleCurrency(h.yearly, language));
                                    setWorkHoursInput(h.workHours.toString());
                                    setWorkDaysPerWeekInput(h.workDaysPerWeek?.toString() || '6');
                                    setIsEditingGoal(true);
                                  }}
                                  className="p-2 text-primary hover:bg-primary/10 rounded-lg transition-colors"
                                >
                                  <Edit2 size={16} />
                                </button>
                                <button 
                                  onClick={() => onDeleteGoalHistory?.(key)}
                                  className="p-2 text-error hover:bg-error/10 rounded-lg transition-colors"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                        {Object.keys(goalHistory).length > 0 && Object.entries(goalHistory).filter(([_, h]) => !h || isNaN(h.year) || isNaN(h.month)).map(([key]) => (
                          <tr key={key} className="bg-error/5 group">
                            <td colSpan={4} className="p-4 text-xs font-bold text-error/60 italic uppercase tracking-widest">
                              Registro inválido ou corrompido
                            </td>
                            <td className="p-4 text-right">
                              <button 
                                onClick={() => onDeleteGoalHistory?.(key)}
                                className="p-2 text-error hover:bg-error/10 rounded-lg transition-colors"
                              >
                                <Trash2 size={16} />
                              </button>
                            </td>
                          </tr>
                        ))}
                        {Object.keys(goalHistory).length === 0 && (
                          <tr>
                            <td colSpan={5} className="p-12 text-center">
                              <div className="flex flex-col items-center gap-3 opacity-30">
                                <Target size={32} />
                                <p className="text-xs font-bold uppercase tracking-widest">{t('noGoalsFound')}</p>
                              </div>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        {/* Gasto Management */}
        <section className="col-span-12 bg-surface-container-lowest rounded-xl p-6 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-5 gap-4">
            <div className="flex flex-col">
              <h3 className="text-lg font-bold font-headline flex items-center gap-2">
                <Tag className="text-primary" size={20} />
                {t('variableExpenseCategories')}
              </h3>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 flex-1 max-w-xl">
              <input 
                type="text" 
                placeholder={t('newCategory')} 
                className="flex-1 bg-surface-container-low p-3 rounded-lg text-sm" 
                value={newCategoryName} 
                onChange={(e) => setNewCategoryName(e.target.value)} 
                onFocus={(e) => e.target.placeholder = ""}
                onBlur={(e) => e.target.placeholder = t('newCategory')}
                onKeyDown={(e) => e.key === 'Enter' && handleAddCategory()} 
              />
              <div className="flex p-1 bg-surface-container-low rounded-lg">
                <button onClick={() => setNewCategoryType('variable')} className={`flex-1 px-3 py-1.5 rounded-md text-[9px] font-black uppercase transition-all ${newCategoryType === 'variable' ? 'bg-error text-white' : 'text-on-surface-variant hover:bg-surface-container-high'}`}>{t('variable')}</button>
                <button onClick={() => setNewCategoryType('fixed')} className={`flex-1 px-3 py-1.5 rounded-md text-[9px] font-black uppercase transition-all ${newCategoryType === 'fixed' ? 'bg-primary text-white' : 'text-on-surface-variant hover:bg-surface-container-high'}`}>{t('fixed')}</button>
              </div>
              <button onClick={handleAddCategory} className="p-3 bg-primary text-on-primary rounded-lg transition-transform hover:scale-95"><Plus size={20} /></button>
            </div>
          </div>
          <div className="space-y-2 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
            {[...categories].sort((a, b) => {
              if (a.costType === b.costType) return 0;
              return a.costType === 'fixed' ? -1 : 1;
            }).map(cat => {
              const Icon = iconMap[cat.icon] || Tag;
              const isExpanded = expandedCategories.has(cat.id);
              return (
                <div key={cat.id} className="space-y-1">
                  {editingCategoryId === cat.id ? (
                    <div className="flex flex-col gap-4 p-4 bg-surface-container-high rounded-xl animate-in fade-in duration-200">
                      <div className="flex flex-col sm:flex-row gap-2">
                        <input 
                          type="text" 
                          className={`flex-1 bg-surface-container-low p-2 rounded-lg text-sm ${editingCategoryType === 'fixed' ? 'opacity-60 cursor-not-allowed font-bold' : ''}`} 
                          value={editingCategoryName} 
                          onChange={(e) => setEditingCategoryName(e.target.value)}
                          placeholder={t('newCategory')}
                          disabled={editingCategoryType === 'fixed'}
                        />
                            <div className="flex items-center gap-2 px-2.5 py-0.5 bg-surface-container-low rounded-lg">
                              <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${editingCategoryType === 'fixed' ? 'bg-primary/10 text-primary border-primary/20' : 'bg-error/10 text-error border-error/20'}`}>
                                {editingCategoryType === 'fixed' ? t('fixed') : t('variable')}
                              </span>
                            </div>
                      </div>

                      {editingCategoryType === 'variable' && (
                        <div className="flex gap-1 justify-end border-t border-outline-variant/10 pt-2">
                          <button onClick={() => setEditingCategoryId(null)} className="px-3 py-2 text-on-surface-variant hover:bg-surface-container-low rounded-lg text-xs font-bold">{t('cancel')}</button>
                          <button onClick={handleUpdateCategory} className="px-5 py-2 bg-primary text-on-primary rounded-lg shadow-sm flex items-center gap-2 text-xs font-bold"><CheckCircle size={16} /> {t('save')}</button>
                        </div>
                      )}
                      
                      {editingCategoryType === 'fixed' && (
                        <div className="flex gap-1 justify-end border-t border-outline-variant/10 pt-2">
                          <button onClick={() => setEditingCategoryId(null)} className="px-3 py-2 text-on-surface-variant hover:bg-surface-container-low rounded-lg text-xs font-bold">{t('cancel')}</button>
                          <button onClick={handleUpdateCategory} className="px-5 py-2 bg-primary text-on-primary rounded-lg shadow-sm flex items-center gap-2 text-xs font-bold"><CheckCircle size={16} /> {t('save')}</button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center justify-between p-2.5 px-4 bg-surface-container-low rounded-xl border border-outline-variant/5 group">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-surface-container-high">
                          <Icon size={18} style={{ color: cat.color === 'primary' ? '#006397' : cat.color === 'error' ? '#ba1a1a' : 'inherit' }} />
                        </div>
                        <div className="flex flex-col">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-bold text-on-surface">{t(cat.name)}</span>
                              <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full border ${cat.costType === 'fixed' ? 'bg-primary/10 text-primary border-primary/20' : 'bg-error/10 text-error border-error/20'}`}>{cat.costType === 'fixed' ? t('fixed') : t('variable')}</span>
                            </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-0.5">
                        {!cat.isDefault && !systemCategoryIds.has(cat.id) && (
                          <button 
                            onClick={() => setAddingSubToCategoryId(addingSubToCategoryId === cat.id ? null : cat.id)}
                            className="p-1.5 rounded-lg hover:bg-surface-container-high text-primary transition-colors"
                            title={t('newSubcategory')}
                          >
                            <Plus size={16} />
                          </button>
                        )}
                        {cat.subcategories && cat.subcategories.length > 0 && (
                          <button 
                            onClick={() => toggleCategory(cat.id)} 
                            className={`p-1.5 rounded-lg hover:bg-surface-container-high transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}
                          >
                            <ChevronDown size={14} className="text-on-surface-variant" />
                          </button>
                        )}
                        
                        <button onClick={() => { 
                          setEditingCategoryId(cat.id); 
                          setEditingCategoryName(cat.isDefault ? t(cat.id) : cat.name); 
                          setEditingCategoryType(cat.costType); 
                          setEditingDefaultAmount(cat.defaultAmount ? formatLocaleCurrency(cat.defaultAmount, language) : '');
                          setEditingBudgetLimit(cat.budgetLimit ? formatLocaleCurrency(cat.budgetLimit, language) : '');
                          setEditingInitialDate(cat.lastProcessedDate || cat.initialDate || '');
                          setEditingFrequency(cat.frequency || 'none');
                        }} className="text-on-surface-variant hover:text-primary p-1 rounded-lg hover:bg-surface-container-high transition-colors"><Edit2 size={14} /></button>
                        
                        {!cat.isDefault && !systemCategoryIds.has(cat.id) && (
                          <button onClick={() => handleDeleteCategory(cat.id)} className="text-on-surface-variant hover:text-error p-1 rounded-lg hover:bg-surface-container-high transition-colors"><Trash2 size={14} /></button>
                        )}
                      </div>
                    </div>
                  )}

                  <AnimatePresence>
                    {addingSubToCategoryId === cat.id && (
                      <motion.div 
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden ml-6 border-l-2 border-on-surface/10 py-1"
                      >
                        <div className="flex gap-2 p-2 bg-surface-container-highest/50 rounded-lg mx-2 border border-outline-variant/10">
                          <input 
                            type="text" 
                            className="flex-1 bg-surface-container-lowest p-2 rounded text-[10px] outline-none"
                            placeholder={t('newSubcategory')}
                            value={newSubcategoryName}
                            onChange={(e) => setNewSubcategoryName(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleAddSubcategory(cat.id)}
                            autoFocus
                          />
                          <button 
                            onClick={() => handleAddSubcategory(cat.id)}
                            className="p-2 bg-primary text-on-primary rounded-lg transition-transform hover:scale-95"
                          >
                            <Plus size={12} />
                          </button>
                          <button 
                            onClick={() => { setAddingSubToCategoryId(null); setNewSubcategoryName(''); }}
                            className="p-2 text-on-surface-variant hover:bg-surface-container-high rounded-lg"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div 
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden ml-6 border-l-2 border-on-surface/10"
                      >
                        <div className="py-1 space-y-1">
                          <div className="divide-y divide-outline-variant/10 bg-transparent overflow-hidden">
                            {(cat.subcategories || []).map(sub => (
                              <div key={sub} className="flex items-center justify-between py-2 px-4 group/sub hover:bg-surface-container-low transition-colors rounded-r-lg">
                                {editingSubCategoryId === cat.id && editingSubOriginalName === sub ? (
                                  <div className="flex items-center gap-2 w-full">
                                    <input 
                                      type="text" 
                                      className="flex-1 bg-surface-container-lowest text-xs p-1.5 rounded-lg outline-none border border-primary/30"
                                      value={editingSubName}
                                      onChange={(e) => setEditingSubName(e.target.value)}
                                      onKeyDown={(e) => e.key === 'Enter' && handleUpdateSubcategory()}
                                      autoFocus
                                    />
                                    <div className="flex items-center gap-1">
                                      <button onClick={handleUpdateSubcategory} className="text-primary p-1 hover:bg-primary/10 rounded-md transition-colors"><CheckCircle size={16} /></button>
                                      <button onClick={() => setEditingSubCategoryId(null)} className="text-on-surface-variant p-1 hover:bg-surface-container-high rounded-md transition-colors"><X size={16} /></button>
                                    </div>
                                  </div>
                                ) : (
                                  <>
                                    <div className="flex items-center gap-2">
                                      <div className="w-1.5 h-1.5 rounded-full bg-on-surface/30" />
                                      <span className="text-xs font-bold text-on-surface-variant">{t(sub)}</span>
                                    </div>
                                    <div className="flex items-center gap-0.5">
                                      {!cat.isDefault && !systemCategoryIds.has(cat.id) && (
                                        <>
                                          <button onClick={() => { setEditingSubCategoryId(cat.id); setEditingSubOriginalName(sub); setEditingSubName(sub); }} className="text-on-surface-variant hover:text-primary p-1 rounded-md hover:bg-surface-container-high transition-colors"><Edit2 size={12} /></button>
                                          <button onClick={() => handleDeleteSubcategory(cat.id, sub)} className="text-on-surface-variant hover:text-error p-1 rounded-md hover:bg-surface-container-high transition-colors"><Trash2 size={12} /></button>
                                        </>
                                      )}
                                    </div>
                                  </>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </section>

        {/* Ganho Management */}
        <section className="col-span-12 bg-surface-container-lowest rounded-xl p-6 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-5 gap-4">
            <div className="flex flex-col">
              <h3 className="text-lg font-bold font-headline flex items-center gap-2">
                <Repeat className="text-primary" size={20} />
                {t('variableIncomeCategories')}
              </h3>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 flex-1 max-w-xl">
              <input 
                type="text" 
                placeholder={t('newPlatform')} 
                className="flex-1 bg-surface-container-low p-3 rounded-lg text-sm" 
                value={newPlatformName} 
                onChange={(e) => setNewPlatformName(e.target.value)} 
                onFocus={(e) => e.target.placeholder = ""}
                onBlur={(e) => e.target.placeholder = t('newPlatform')}
                onKeyDown={(e) => e.key === 'Enter' && handleAddPlatform()} 
              />
              <div className="flex p-1 bg-surface-container-low rounded-lg">
                <button onClick={() => setNewPlatformType('variable')} className={`flex-1 px-3 py-1.5 rounded-md text-[9px] font-black uppercase transition-all ${newPlatformType === 'variable' ? 'bg-error text-white' : 'text-on-surface-variant hover:bg-surface-container-high'}`}>{t('variable')}</button>
                <button onClick={() => setNewPlatformType('fixed')} className={`flex-1 px-3 py-1.5 rounded-md text-[9px] font-black uppercase transition-all ${newPlatformType === 'fixed' ? 'bg-primary text-white' : 'text-on-surface-variant hover:bg-surface-container-high'}`}>{t('fixed')}</button>
              </div>
              <button onClick={handleAddPlatform} className="p-3 bg-primary text-on-primary rounded-lg transition-transform hover:scale-95"><Plus size={20} /></button>
            </div>
          </div>
          <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
            {[...platforms].sort((a, b) => {
              if (a.type === b.type) return 0;
              return a.type === 'fixed' ? -1 : 1;
            }).map(plat => (
              <div key={plat.id} className="space-y-1">
                {editingPlatformId === plat.id ? (
                  <div className="flex flex-col gap-4 p-4 bg-surface-container-high rounded-xl animate-in fade-in duration-200">
                    <div className="flex flex-col sm:flex-row gap-2">
                      <input 
                        type="text" 
                        className={`flex-1 bg-surface-container-low p-2 rounded-lg text-sm ${editingPlatformType === 'fixed' ? 'opacity-60 cursor-not-allowed font-bold' : ''}`} 
                        value={editingPlatformName} 
                        onChange={(e) => setEditingPlatformName(e.target.value)}
                        placeholder={t('newPlatform')}
                        disabled={editingPlatformType === 'fixed'}
                      />
                        <div className="flex items-center gap-2 px-2.5 py-0.5 bg-surface-container-low rounded-lg">
                          <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${editingPlatformType === 'fixed' ? 'bg-primary/10 text-primary border-primary/20' : 'bg-error/10 text-error border-error/20'}`}>
                            {editingPlatformType === 'fixed' ? t('fixed') : t('variable')}
                          </span>
                        </div>
                      </div>

                    {editingPlatformType === 'fixed' && (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 animate-in slide-in-from-top-2 duration-200">
                          <div className="space-y-1">
                            <label className="text-[11px] font-black uppercase text-on-surface-variant px-1.5">{t('value')}</label>
                            <input 
                              type="text"
                              className="w-full bg-surface-container-low p-2.5 rounded-lg text-sm"
                              value={editingPlatformAmount}
                              onChange={(e) => setEditingPlatformAmount(formatMaskedCurrency(e.target.value, language))}
                              placeholder=""
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[11px] font-black uppercase text-on-surface-variant px-1.5">{t('paymentDate')}</label>
                            <input 
                              type="date"
                              className="w-full bg-surface-container-low p-2.5 rounded-lg text-sm"
                              value={editingPlatformDate}
                              onChange={(e) => setEditingPlatformDate(e.target.value)}
                            />
                          </div>
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5 px-1.5">
                              <label className="text-[11px] font-black uppercase text-on-surface-variant font-label">{t('frequency')}</label>
                            <div className="group/tooltip relative">
                              <Info size={12} className="text-on-surface-variant/50 cursor-help" />
                              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 bg-surface-container-highest text-on-surface text-[10px] font-medium rounded-xl shadow-xl opacity-0 invisible group-hover/tooltip:opacity-100 group-hover/tooltip:visible transition-all z-50 whitespace-pre-line border border-outline-variant/20">
                                {t('frequencyTooltip')}
                              </div>
                            </div>
                          </div>
                          <select 
                            className="w-full bg-surface-container-low p-2 rounded-lg text-sm outline-none"
                            value={editingPlatformFrequency}
                            onChange={(e) => setEditingPlatformFrequency(e.target.value as TransactionFrequency)}
                          >
                            <option value="none">{t('none')}</option>
                            <option value="weekly">{t('weekly')}</option>
                            <option value="biweekly">{t('biweekly')}</option>
                            <option value="monthly">{t('monthly')}</option>
                            <option value="yearly">{t('yearly')}</option>
                          </select>
                        </div>
                      </div>
                    )}

                    <div className="flex gap-1 justify-end border-t border-outline-variant/10 pt-2">
                       <button onClick={() => setEditingPlatformId(null)} className="px-3 py-2 text-on-surface-variant hover:bg-surface-container-low rounded-lg text-xs font-bold">{t('cancel')}</button>
                       <button onClick={handleUpdatePlatform} className="px-5 py-2 bg-primary text-on-primary rounded-lg shadow-sm flex items-center gap-2 text-xs font-bold"><CheckCircle size={16} /> {t('save')}</button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between p-2.5 px-4 bg-surface-container-low rounded-xl border border-outline-variant/5 group">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-surface-container-high">
                        {(() => {
                          const Icon = iconMap[plat.icon] || Target;
                          return <Icon size={18} className={plat.type === 'fixed' ? 'text-primary' : 'text-error'} />;
                        })()}
                      </div>
                      <div className="flex flex-col">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-on-surface">{t(plat.name)}</span>
                            <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full border ${plat.type === 'fixed' ? 'bg-primary/10 text-primary border-primary/20' : 'bg-error/10 text-error border-error/20'}`}>{plat.type === 'fixed' ? t('fixed') : t('variable')}</span>
                            {plat.type === 'fixed' && plat.frequency && plat.frequency !== 'none' && (
                              <div className="flex items-center gap-1.5 px-2 py-0.5 bg-surface-container-high text-on-surface-variant rounded-full border border-outline-variant/10">
                                <span className="text-[9px] font-black uppercase">{t(plat.frequency)}</span>
                                {plat.lastProcessedDate && (
                                  <span className="text-[9px] font-bold text-primary/70">
                                    • {t('nextPayment')}: {new Date(plat.lastProcessedDate + 'T12:00:00').toLocaleDateString(language)}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        {plat.type === 'fixed' && plat.defaultAmount !== undefined && (
                          <span className="text-[10px] font-bold text-on-surface-variant/70">
                            {t('currencySymbol')} {formatLocaleCurrency(plat.defaultAmount, language)}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-0.5">
                      
                      <button onClick={() => { 
                        setEditingPlatformId(plat.id); 
                        setEditingPlatformName(plat.isDefault ? t(plat.id) : plat.name); 
                        setEditingPlatformType(plat.type); 
                        setEditingPlatformAmount(plat.defaultAmount ? formatLocaleCurrency(plat.defaultAmount, language) : '');
                        setEditingPlatformDate(plat.lastProcessedDate || plat.initialDate || '');
                        setEditingPlatformFrequency(plat.frequency || 'none');
                      }} className="text-on-surface-variant hover:text-primary p-1 rounded-lg hover:bg-surface-container-high transition-colors"><Edit2 size={14} /></button>
                      
                      {!plat.isDefault && !systemPlatformIds.has(plat.id) && (
                        <button onClick={() => handleDeletePlatform(plat.id)} className="text-on-surface-variant hover:text-error p-1 rounded-lg hover:bg-surface-container-high transition-colors"><Trash2 size={14} /></button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Preferences */}
        <section className="col-span-12 lg:col-span-7 bg-surface-container-lowest rounded-xl p-6 shadow-sm">
          <h3 className="text-lg font-bold font-headline mb-8 flex items-center gap-2"><Target className="text-primary" size={20} />{t('appPreferences')}</h3>
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <p className="font-bold font-headline">{t('darkMode')}</p>
                <p className="text-xs text-on-surface-variant font-body">{t('darkModeDesc')}</p>
              </div>
              <button 
                onClick={toggleTheme} 
                className={`w-14 h-7 rounded-full relative transition-colors duration-500 overflow-hidden ${theme === 'dark' ? 'bg-[#4caf50]' : 'bg-[#f44336]'}`}
              >
                <div className="absolute inset-0 flex items-center justify-between px-2 pointer-events-none">
                  <span className={`text-[8px] font-black tracking-tighter ${theme === 'dark' ? 'opacity-100' : 'opacity-0'} transition-opacity`}>ON</span>
                  <span className={`text-[8px] font-black tracking-tighter ${theme === 'dark' ? 'opacity-0' : 'opacity-100'} transition-opacity`}>OFF</span>
                </div>
                <motion.span 
                  layout
                  transition={{ type: "spring", stiffness: 700, damping: 30 }}
                  className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow-sm z-10 ${theme === 'dark' ? 'right-1' : 'left-1'}`}
                />
              </button>
            </div>
            <div className="h-px bg-outline-variant/10"></div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <p className="font-bold font-headline">{t('language')}</p>
                <p className="text-xs text-on-surface-variant font-body">{t('languageDesc')}</p>
              </div>
              <div className="relative">
                <div onClick={() => setShowLangDropdown(!showLangDropdown)} className="flex items-center gap-2 bg-surface-container-low px-4 py-2 rounded-lg font-bold text-sm cursor-pointer">
                  <span>{language === 'pt-BR' ? 'Português (BR)' : language === 'en-US' ? 'English (US)' : language === 'es-ES' ? 'Español' : 'Français'}</span>
                  <ChevronDown size={16} className={`transition-transform duration-200 ${showLangDropdown ? 'rotate-180' : ''}`} />
                </div>
                <AnimatePresence>
                  {showLangDropdown && (
                    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="absolute right-0 top-full mt-2 w-48 bg-surface-container-lowest border border-outline-variant/20 rounded-xl shadow-xl z-50 overflow-hidden">
                      {['pt-BR', 'en-US', 'es-ES', 'fr-FR'].map(lang => (
                        <button key={lang} onClick={() => { setLanguage(lang as any); setShowLangDropdown(false); }} className={`w-full px-4 py-3 text-left text-sm font-bold hover:bg-surface-container-low ${language === lang ? 'text-primary' : 'text-on-surface'}`}>{lang === 'pt-BR' ? 'Português (BR)' : lang === 'en-US' ? 'English (US)' : lang === 'es-ES' ? 'Español' : 'Français'}</button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </section>

        {/* Support */}
        <section className="col-span-12 lg:col-span-5 bg-surface-container-lowest rounded-xl p-8 shadow-sm">
          <h3 className="text-lg font-bold font-headline mb-6 flex items-center gap-2"><HelpCircle className="text-primary" size={20} />{t('helpSupport')}</h3>
          <div className="space-y-3">
            {faqItems.map((item, index) => (
              <div key={index} className="bg-surface-container-low rounded-xl overflow-hidden border border-outline-variant/10">
                <button onClick={() => setOpenFaqIndex(openFaqIndex === index ? null : index)} className="w-full p-4 flex items-center justify-between text-left hover:bg-surface-container-high transition-colors">
                  <span className="text-sm font-bold font-headline pr-4">{t(item.q)}</span>
                  <ChevronDown size={18} className={`text-primary transition-transform duration-300 ${openFaqIndex === index ? 'rotate-180' : ''}`} />
                </button>
                <AnimatePresence>
                  {openFaqIndex === index && (
                    <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
                      <div className="p-4 pt-0 text-xs text-on-surface-variant leading-relaxed font-body border-t border-outline-variant/5">{t(item.a)}</div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        </section>
      </div>

      <footer className="mt-16 text-center space-y-2 opacity-40">
        <p className="text-xs font-label uppercase tracking-[0.2em] font-bold">KM Profit v3.0.0</p>
        <p className="text-[10px] font-body">{t('developedFor')}</p>
      </footer>
    </div>
  );
}
