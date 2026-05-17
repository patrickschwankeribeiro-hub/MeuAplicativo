import React, { useState, useRef, useMemo } from 'react';
import { 
  User, 
  Settings, 
  Bell, 
  Shield, 
  HelpCircle, 
  ChevronRight, 
  ChevronLeft,
  ChevronDown,
  Camera,
  LogOut,
  Moon,
  Sun,
  Globe,
  Plus,
  Trash2,
  Edit2,
  Check,
  CheckCircle,
  Tag,
  Car,
  Mail,
  Target,
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
  KeyRound,
  FileText,
  MoreHorizontal,
  CarTaxiFront,
  Bike,
  Droplets,
  Triangle,
  Radar,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Goal, UserProfile, Vehicle, Driver, Category, Platform, TransactionStatus, ExpenseRecord, CATEGORIES, PLATFORMS } from '../types';
import { FUEL_SUBCATEGORIES, MAINTENANCE_SUBCATEGORIES, FOOD_SUBCATEGORIES } from '../constants';
import { useLanguage } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';
import { parseLocaleNumber, formatLocaleCurrency, formatMaskedCurrency } from '../lib/currency';

const VehicleRentIcon = ({ size, className }: { size: number; className?: string }) => (
  <div className={`flex items-center gap-0.5 ${className}`}>
    <Car size={size * 0.9} />
    <span className="opacity-30">|</span>
    <Bike size={size} />
  </div>
);

const iconMap: Record<string, any> = {
  MapPin, 
  Car, 
  PersonStanding: User, 
  Key, 
  KeyRound, 
  Users, 
  Target, 
  Info, 
  Bell, 
  Lock: Shield, 
  Moon, 
  HelpCircle, 
  FileText, 
  MessageSquare: HelpCircle, 
  ShieldCheck: Shield, 
  Edit2, 
  ChevronDown, 
  CheckCircle, 
  Mail: IdCard, 
  Phone: IdCard, 
  CalendarIcon: Clock, 
  Clock, 
  Plus, 
  Trash2, 
  Tag, 
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
  Droplets, 
  Triangle, 
  Radar, 
  VehicleRent: VehicleRentIcon
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
  activeVehicleId?: string | null;
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
  selectedWeek,
  activeVehicleId
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
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isEditingVehicle, setIsEditingVehicle] = useState(false);
  const [isEditingGoal, setIsEditingGoal] = useState(false);
  const [isAddingGoalHistory, setIsAddingGoalHistory] = useState(false);
  const [editingGoalType, setEditingGoalType] = useState<'goal' | 'budget'>('goal');

  // Filter goal history for the active vehicle
  const activeVehicleGoalHistory = useMemo(() => {
    if (!activeVehicleId) return {};
    const filtered: Record<string, Goal> = {};
    Object.entries(goalHistory || {}).forEach(([key, val]) => {
      // Key format: {activeVehicleId}_{period}
      if (val && val.vehicleId === activeVehicleId) {
        filtered[key] = val;
      } else if (key.startsWith(`${activeVehicleId}_`)) {
        filtered[key] = val;
      }
    });
    return filtered;
  }, [goalHistory, activeVehicleId]);

  // Vehicle & Driver Management State
  const [isAddingVehicle, setIsAddingVehicle] = useState(false);
  const [editingVehicleId, setEditingVehicleId] = useState<string | null>(null);
  const [vehicleForm, setVehicleForm] = useState<Partial<Vehicle>>({
    brand: '',
    model: '',
    plate: '',
    year: new Date().getFullYear(),
    tankCapacity: '50',
    currentOdometer: 0,
    type: 'car'
  });

  const [isAddingDriver, setIsAddingDriver] = useState(false);
  const [driverForm, setDriverForm] = useState<Partial<Driver>>({
    name: '',
    phone: ''
  });
  
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
    ['maintenance', 'washing', 'fuel', 'food', 'toll', 'parking'].forEach(id => {
      budgets[id] = formatLocaleCurrency(goal.categoryBudgets?.[id] || 0, language);
    });
    setCategoryBudgetsInput(budgets);
  }, [goal, language, categories]);

  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryType, setNewCategoryType] = useState<'fixed' | 'variable'>('variable');
  const [newPlatformName, setNewPlatformName] = useState('');
  const [newPlatformType, setNewPlatformType] = useState<'fixed' | 'variable'>('variable');
  
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editingCategoryName, setEditingCategoryName] = useState('');
  const [editingCategoryType, setEditingCategoryType] = useState<'fixed' | 'variable'>('variable');
  
  const [editingPlatformId, setEditingPlatformId] = useState<string | null>(null);
  const [editingPlatformName, setEditingPlatformName] = useState('');
  const [editingPlatformType, setEditingPlatformType] = useState<'fixed' | 'variable'>('variable');
  
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
    if (!vehicleForm.brand || !vehicleForm.model || !vehicleForm.plate) {
      setErrorAlert(t('fieldsRequired'));
      setTimeout(() => setErrorAlert(null), 3000);
      return;
    }

    // Check for duplicate plate
    const currentVehicles = profileData.vehicles || [];
    const plateExists = currentVehicles.some(v => 
      v.plate.toUpperCase() === vehicleForm.plate?.toUpperCase() && v.id !== editingVehicleId
    );

    if (plateExists) {
      setErrorAlert(t('plateAlreadyExists') || 'Placa já cadastrada');
      setTimeout(() => setErrorAlert(null), 3000);
      return;
    }

    const newVehicle: Vehicle = {
      ...vehicleForm as Vehicle,
      id: editingVehicleId || `veh_${Date.now()}`
    };

    let updatedVehicles;

    if (editingVehicleId) {
      updatedVehicles = currentVehicles.map(v => v.id === editingVehicleId ? newVehicle : v);
    } else {
      updatedVehicles = [...currentVehicles, newVehicle];
    }

    const updatedProfile = { ...profileData, vehicles: updatedVehicles };
    setProfileData(updatedProfile);
    onSaveProfile(updatedProfile);
    setIsAddingVehicle(false);
    setEditingVehicleId(null);
    setVehicleForm({
      brand: '',
      model: '',
      plate: '',
      year: new Date().getFullYear(),
      tankCapacity: '50',
      currentOdometer: 0,
      type: 'car'
    });
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
  };

  const handleDeleteVehicle = (id: string) => {
    const updatedVehicles = (profileData.vehicles || []).filter(v => v.id !== id);
    const updatedProfile = { ...profileData, vehicles: updatedVehicles };
    setProfileData(updatedProfile);
    onSaveProfile(updatedProfile);
  };

  const handleSaveDriver = () => {
    if (!driverForm.name) {
      setErrorAlert(t('fieldsRequired'));
      setTimeout(() => setErrorAlert(null), 3000);
      return;
    }

    const newDriver: Driver = {
      ...driverForm as Driver,
      id: `drv_${Date.now()}`
    };

    const currentDrivers = profileData.drivers || [];
    const updatedProfile = { ...profileData, drivers: [...currentDrivers, newDriver] };
    setProfileData(updatedProfile);
    onSaveProfile(updatedProfile);
    // Automatically select the new driver in the vehicle form
    if (isAddingVehicle || isEditingVehicle) {
      setVehicleForm(prev => ({ ...prev, driverId: newDriver.id }));
    }
    setIsAddingDriver(false);
    setDriverForm({ name: '', phone: '' });
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
  };

  const handleDeleteDriver = (id: string) => {
    const updatedDrivers = (profileData.drivers || []).filter(d => d.id !== id);
    const updatedProfile = { ...profileData, drivers: updatedDrivers };
    setProfileData(updatedProfile);
    onSaveProfile(updatedProfile);
  };

  const handleSaveGoal = () => {
    const monthly = parseLocaleNumber(monthlyInput, language);
    const workHours = parseFloat(workHoursInput);
    const workDaysPerWeek = parseInt(workDaysPerWeekInput);
    
    if (editingGoalType === 'goal' && (isNaN(monthly) || isNaN(workHours) || isNaN(workDaysPerWeek) || monthly < 0 || workHours <= 0 || workDaysPerWeek <= 0)) {
      setErrorAlert(t('fieldsRequired'));
      setTimeout(() => setErrorAlert(null), 3000);
      return;
    }

    const periodKey = `${goalYear}-${String(goalMonth + 1).padStart(2, '0')}`;
    const finalKey = `${activeVehicleId}_${periodKey}`;
    
    // Get existing entry to preserve other data (goal or budget)
    const existingEntry = (goalHistory[finalKey] || {}) as Partial<Goal>;
    
    let newGoal: Goal;

    if (editingGoalType === 'goal') {
      newGoal = {
        ...existingEntry,
        id: finalKey,
        vehicleId: activeVehicleId || undefined,
        month: goalMonth,
        year: goalYear,
        monthly: calculatedGoals.monthly,
        daily: calculatedGoals.daily,
        weekly: calculatedGoals.weekly,
        yearly: calculatedGoals.yearly,
        workHours: calculatedGoals.workHours,
        workDaysPerMonth: calculatedGoals.workDaysPerMonth,
        workDaysPerWeek: workDaysPerWeek,
      } as Goal;
    } else {
      const categoryBudgets: Record<string, number> = {};
      Object.entries(categoryBudgetsInput).forEach(([catId, val]) => {
        const num = parseLocaleNumber(val as string, language);
        if (num > 0) categoryBudgets[catId] = num;
      });

      newGoal = {
        ...existingEntry,
        id: finalKey,
        vehicleId: activeVehicleId || undefined,
        month: goalMonth,
        year: goalYear,
        categoryBudgets,
        monthly: existingEntry.monthly || 0,
        daily: existingEntry.daily || 0,
        weekly: existingEntry.weekly || 0,
        yearly: existingEntry.yearly || 0,
        workHours: existingEntry.workHours || 8,
        workDaysPerMonth: existingEntry.workDaysPerMonth || 26,
        workDaysPerWeek: existingEntry.workDaysPerWeek || 6,
      } as Goal;
    }

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
      type: editingPlatformType
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

        {/* Fleet Management Section */}
        <section className="col-span-12 bg-surface-container-lowest rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-primary/10 rounded-xl">
                <Car className="text-primary" size={24} />
              </div>
              <div>
                <h3 className="text-xl font-black font-headline text-on-surface">{t('myVehicles')}</h3>
                <p className="text-xs text-on-surface-variant font-medium">Até 2 veículos cadastrados</p>
              </div>
            </div>
            {(profileData.vehicles || []).length < 2 && !isAddingVehicle && (
              <button 
                onClick={() => {
                  setEditingVehicleId(null);
                  setVehicleForm({
                    brand: '',
                    model: '',
                    plate: '',
                    year: new Date().getFullYear(),
                    tankCapacity: '50',
                    currentOdometer: 0,
                    type: 'car'
                  });
                  setIsAddingVehicle(true);
                }}
                className="flex items-center gap-2 px-5 py-2.5 bg-primary text-on-primary font-black text-xs rounded-xl shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all"
              >
                <Plus size={18} />
                {t('addVehicle')}
              </button>
            )}
          </div>

          <div className="space-y-4">
            <AnimatePresence mode="wait">
              {isAddingVehicle ? (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="bg-surface-container-low/50 p-6 rounded-2xl border border-outline-variant/10 space-y-6"
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest px-1">{t('brand')}</label>
                      <input 
                        className="w-full bg-surface-container-lowest p-3.5 rounded-xl text-sm font-bold border border-outline-variant/10 outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                        placeholder="Ex: Toyota"
                        value={vehicleForm.brand}
                        onChange={e => setVehicleForm({...vehicleForm, brand: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest px-1">{t('model')}</label>
                      <input 
                        className="w-full bg-surface-container-lowest p-3.5 rounded-xl text-sm font-bold border border-outline-variant/10 outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                        placeholder="Ex: Corolla"
                        value={vehicleForm.model}
                        onChange={e => setVehicleForm({...vehicleForm, model: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest px-1">{t('plate')}</label>
                      <input 
                        className="w-full bg-surface-container-lowest p-3.5 rounded-xl text-sm font-bold border border-outline-variant/10 outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                        placeholder="Ex: ABC-1234"
                        value={vehicleForm.plate}
                        onChange={e => setVehicleForm({...vehicleForm, plate: e.target.value.toUpperCase()})}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest px-1">{t('year')}</label>
                      <input 
                        type="number"
                        className="w-full bg-surface-container-lowest p-3.5 rounded-xl text-sm font-bold border border-outline-variant/10 outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                        value={vehicleForm.year}
                        onChange={e => setVehicleForm({...vehicleForm, year: parseInt(e.target.value)})}
                      />
                    </div>
                    <div className={`space-y-2 transition-all ${isAddingDriver ? 'lg:col-span-2 md:col-span-2' : ''}`}>
                      <label className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest px-1">{t('driver')}</label>
                      <div className="flex gap-2">
                        {isAddingDriver ? (
                          <div className="flex-1 flex gap-2 animate-in fade-in slide-in-from-left-2 duration-300">
                            <input 
                              autoFocus
                              className="flex-1 bg-surface-container-lowest p-3.5 rounded-xl text-sm font-bold border border-secondary/30 outline-none focus:ring-2 focus:ring-secondary/20 transition-all placeholder:font-normal placeholder:opacity-50"
                              placeholder="Nome do condutor"
                              value={driverForm.name}
                              onChange={e => setDriverForm({...driverForm, name: e.target.value})}
                              onKeyDown={e => {
                                if (e.key === 'Enter') handleSaveDriver();
                                if (e.key === 'Escape') setIsAddingDriver(false);
                              }}
                            />
                            <button 
                              type="button"
                              onClick={handleSaveDriver}
                              className="p-3.5 bg-secondary text-on-secondary rounded-xl hover:scale-105 active:scale-95 transition-all shadow-lg shadow-secondary/20 flex items-center justify-center"
                              title={t('saveDriver')}
                            >
                              <Check size={20} />
                            </button>
                            <button 
                              type="button"
                                onClick={() => {
                                  setIsAddingDriver(false);
                                  setDriverForm({name: '', phone: ''});
                                }}
                              className="p-3.5 bg-surface-container-high text-on-surface-variant rounded-xl hover:bg-surface-container-highest transition-all flex items-center justify-center"
                              title={t('cancel')}
                            >
                              <X size={20} />
                            </button>
                          </div>
                        ) : (
                          <select 
                            className="flex-1 bg-surface-container-lowest p-3.5 rounded-xl text-sm font-bold border border-outline-variant/10 outline-none focus:ring-2 focus:ring-primary/20 appearance-none cursor-pointer"
                            value={vehicleForm.driverId || ''}
                            onChange={e => {
                              if (e.target.value === 'NEW_DRIVER') {
                                setIsAddingDriver(true);
                                setVehicleForm({...vehicleForm, driverId: ''});
                              } else {
                                setVehicleForm({...vehicleForm, driverId: e.target.value});
                              }
                            }}
                          >
                            <option value=""></option>
                            <option value="NEW_DRIVER" className="font-bold text-secondary font-headline">+ {t('newDriver')}</option>
                            {(profileData.drivers || []).map(d => (
                              <option key={d.id} value={d.id}>{d.name}</option>
                            ))}
                          </select>
                        )}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest px-1">{t('tankCapacity')}</label>
                      <input 
                        className="w-full bg-surface-container-lowest p-3.5 rounded-xl text-sm font-bold border border-outline-variant/10 outline-none focus:ring-2 focus:ring-primary/20 transition-all font-mono"
                        value={vehicleForm.tankCapacity}
                        onChange={e => setVehicleForm({...vehicleForm, tankCapacity: e.target.value})}
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 pt-4 border-t border-outline-variant/10">
                    <button 
                      onClick={() => {
                        setIsAddingVehicle(false);
                        setEditingVehicleId(null);
                      }} 
                      className="px-6 py-2.5 text-on-surface-variant font-black text-xs uppercase tracking-widest hover:bg-surface-container-high rounded-xl transition-all"
                    >
                      {t('cancel')}
                    </button>
                    <button 
                      onClick={handleSaveVehicle}
                      className="px-8 py-3.5 bg-primary text-on-primary font-black text-xs uppercase tracking-widest rounded-xl shadow-lg shadow-primary/20 hover:scale-[0.98] transition-all"
                    >
                      {t('saveVehicle')}
                    </button>
                  </div>
                </motion.div>
              ) : (
                <div className="space-y-2">
                  {(profileData.vehicles || []).map(v => (
                    <div key={v.id} className="relative group bg-surface-container-low p-3.5 rounded-xl border border-outline-variant/10 hover:border-primary/30 transition-all flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-white dark:bg-surface-container-highest rounded-xl shadow-sm border border-outline-variant/10">
                          <Car className="text-primary" size={20} />
                        </div>
                        <div className="flex flex-col">
                          <h4 className="font-black text-on-surface flex items-center gap-2">
                            {v.brand} {v.model}
                            <span className="px-2 py-0.5 bg-primary/10 text-primary text-[10px] font-black rounded-md">{v.plate}</span>
                            {v.id === activeVehicleId && (
                              <div className="w-2.5 h-2.5 rounded-full bg-success" title={t('activeVehicle')} />
                            )}
                          </h4>
                          {v.driverId && (profileData.drivers || []).find(d => d.id === v.driverId) && (
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <Users size={12} className="text-on-surface-variant/60" />
                              <span className="text-[10px] font-bold text-on-surface-variant/70">
                                {(profileData.drivers || []).find(d => d.id === v.driverId)?.name}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => {
                            setEditingVehicleId(v.id);
                            setVehicleForm(v);
                            setIsAddingVehicle(true);
                          }}
                          className="p-2 text-primary hover:bg-primary/10 rounded-lg transition-colors"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button 
                          onClick={() => {
                            if (window.confirm(t('confirmDelete') || 'Tem certeza que deseja excluir?')) {
                              handleDeleteVehicle(v.id);
                            }
                          }}
                          className="p-2 text-on-surface-variant hover:text-error hover:bg-error/10 rounded-lg transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                  {(profileData.vehicles || []).length === 0 && (
                    <div className="col-span-1 md:col-span-2 py-10 text-center bg-surface-container-low/30 rounded-2xl border border-dashed border-outline-variant/20">
                      <Car size={32} className="mx-auto text-on-surface-variant opacity-20 mb-3" />
                      <p className="text-xs font-black text-on-surface-variant opacity-40 uppercase tracking-widest">{t('noVehicles')}</p>
                    </div>
                  )}
                </div>
              )}
            </AnimatePresence>
          </div>
        </section>

        {/* Goal Settings */}
        <section className="col-span-12 bg-surface-container-lowest rounded-xl p-8 shadow-sm overflow-hidden border border-outline-variant/10">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Target className="text-primary" size={24} />
              </div>
              <h3 className="text-xl font-black font-headline tracking-tight">{t('goalSettings')}</h3>
            </div>
            
            {(!isAddingGoalHistory || editingGoalType !== 'goal') && (
              <button 
                onClick={() => {
                  setIsAddingGoalHistory(true);
                  setEditingGoalType('goal');
                  setGoalMonth(new Date().getMonth());
                  setGoalYear(new Date().getFullYear());
                  setMonthlyInput('0,00');
                  setWorkHoursInput('8');
                  setWorkDaysPerWeekInput('6');
                }} 
                className="flex items-center gap-2 px-6 py-2.5 bg-primary text-on-primary font-black text-xs rounded-xl shadow-lg hover:scale-105 transition-all"
              >
                <Plus size={18} />
                {t('newGoal')}
              </button>
            )}
          </div>

          {(isEditingGoal || isAddingGoalHistory) && editingGoalType === 'goal' ? (
            <div className="space-y-6 bg-surface-container-low p-8 rounded-3xl border border-outline-variant/30 shadow-md">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                <div className="space-y-3">
                  <label className="text-[11px] font-black text-on-surface uppercase tracking-widest px-1">{t('month')}</label>
                  <select className="w-full bg-surface-container-highest p-4 rounded-2xl text-sm font-bold border border-outline-variant/60 focus:border-primary/50 focus:ring-4 focus:ring-primary/10 shadow-sm outline-none transition-all appearance-none" value={goalMonth} onChange={(e) => setGoalMonth(parseInt(e.target.value))}>
                    {Array.from({ length: 12 }, (_, i) => <option key={i} value={i}>{new Date(2024, i).toLocaleDateString(language, { month: 'long' })}</option>)}
                  </select>
                </div>
                <div className="space-y-3">
                  <label className="text-[11px] font-black text-on-surface uppercase tracking-widest px-1">{t('year')}</label>
                  <select className="w-full bg-surface-container-highest p-4 rounded-2xl text-sm font-bold border border-outline-variant/60 focus:border-primary/50 focus:ring-4 focus:ring-primary/10 shadow-sm outline-none transition-all appearance-none" value={goalYear} onChange={(e) => setGoalYear(parseInt(e.target.value))}>
                    {Array.from({ length: 5 }, (_, i) => { const year = new Date().getFullYear() - 2 + i; return <option key={year} value={year}>{year}</option>; })}
                  </select>
                </div>
                <div className="space-y-3">
                  <label className="text-[11px] font-black text-on-surface uppercase tracking-widest px-1">{t('monthlyProfit')} *</label>
                  <input className="w-full bg-surface-container-highest p-4 rounded-2xl text-sm font-black border border-outline-variant/60 focus:border-primary/50 focus:ring-4 focus:ring-primary/10 shadow-sm outline-none transition-all" type="text" placeholder="0,00" value={monthlyInput} onChange={(e) => setMonthlyInput(formatMaskedCurrency(e.target.value, language))} />
                </div>
                <div className="space-y-3">
                  <label className="text-[11px] font-black text-on-surface uppercase tracking-widest px-1">{t('weeklyProfit')}</label>
                  <input className="w-full bg-surface-container-high p-4 rounded-2xl text-sm font-black border border-outline-variant/40 shadow-sm outline-none transition-all cursor-default" type="text" readOnly value={formatCurrency(calculatedGoals.weekly)} />
                </div>
                <div className="space-y-3">
                  <label className="text-[11px] font-black text-on-surface uppercase tracking-widest px-1">{t('dailyProfit')}</label>
                  <input className="w-full bg-surface-container-high p-4 rounded-2xl text-sm font-black border border-outline-variant/40 shadow-sm outline-none transition-all cursor-default" type="text" readOnly value={formatCurrency(calculatedGoals.daily)} />
                </div>
                <div className="space-y-3">
                  <label className="text-[11px] font-black text-on-surface uppercase tracking-widest px-1">{t('workHours')} *</label>
                  <input className="w-full bg-surface-container-highest p-4 rounded-2xl text-sm font-black border border-outline-variant/60 focus:border-primary/50 focus:ring-4 focus:ring-primary/10 shadow-sm outline-none transition-all" type="number" placeholder="8" value={workHoursInput} onChange={(e) => setWorkHoursInput(e.target.value)} />
                </div>
                <div className="space-y-3">
                  <label className="text-[11px] font-black text-on-surface uppercase tracking-widest px-1">{t('workload')} *</label>
                  <select className="w-full bg-surface-container-highest p-4 rounded-2xl text-sm font-bold border border-outline-variant/60 focus:border-primary/50 focus:ring-4 focus:ring-primary/10 shadow-sm outline-none transition-all appearance-none" value={workDaysPerWeekInput} onChange={(e) => setWorkDaysPerWeekInput(e.target.value)}>
                    {[1, 2, 3, 4, 5, 6, 7].map(day => <option key={day} value={day}>{day} {day === 1 ? t('dayPerWeek') : t('daysPerWeek')}</option>)}
                  </select>
                </div>
              </div>

              {calculatedGoals.monthly > 0 && (
                <div className="bg-primary border-t-4 border-primary/40 rounded-2xl p-6 flex gap-4 animate-in slide-in-from-bottom-2 duration-300 shadow-xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-2 opacity-10">
                    <Target size={80} className="text-on-primary rotate-12 translate-x-4 -translate-y-4" />
                  </div>
                  <div className="w-12 h-12 bg-on-primary/10 rounded-full flex items-center justify-center shrink-0">
                    <Info className="text-on-primary" size={24} />
                  </div>
                  <p className="text-base font-black text-on-primary leading-relaxed drop-shadow-sm z-10">
                    {t('goalInfo').replace('{monthly}', formatCurrency(calculatedGoals.monthly)).replace('{hourly}', formatCurrency(calculatedGoals.hourlyProfit)).replace('{hours}', calculatedGoals.workHours.toString())}
                  </p>
                </div>
              )}

              <div className="flex justify-end gap-4 pt-4">
                <button onClick={() => { setIsEditingGoal(false); setIsAddingGoalHistory(false); }} className="px-6 py-3 text-on-surface-variant font-black text-xs uppercase tracking-widest hover:bg-surface-container-high rounded-xl transition-all">{t('cancel')}</button>
                <button onClick={handleSaveGoal} className="px-10 py-4 bg-primary text-on-primary font-black text-xs uppercase tracking-widest rounded-xl shadow-xl transition-all">{t('saveGoal')}</button>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-3xl border border-outline-variant/10 bg-white/30 backdrop-blur-sm">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-surface-container-low/50">
                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-on-surface-variant whitespace-nowrap">{t('period')}</th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-on-surface-variant whitespace-nowrap">{t('monthlyProfit')}</th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-on-surface-variant whitespace-nowrap">{t('weeklyProfit')}</th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-on-surface-variant whitespace-nowrap">{t('dailyProfit')}</th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-on-surface-variant text-right whitespace-nowrap">{t('actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/5">
                  {Object.entries(activeVehicleGoalHistory)
                    .filter(([_, h]) => {
                      const goal = h as Goal;
                      return goal && goal.monthly > 0;
                    })
                    .sort(([_, a], [__, b]) => {
                      const goalA = a as Goal;
                      const goalB = b as Goal;
                      return (goalB.year * 12 + goalB.month) - (goalA.year * 12 + goalA.month);
                    })
                    .map(([key, h]) => {
                      const goal = h as Goal;
                      return (
                        <tr key={key} className="hover:bg-surface-container-low transition-colors group">
                          <td className="px-6 py-4 text-sm font-bold capitalize whitespace-nowrap">
                            {new Date(goal.year, goal.month).toLocaleDateString(language, { month: 'long', year: 'numeric' })}
                          </td>
                          <td className="px-6 py-4 text-sm font-black text-primary whitespace-nowrap">{formatCurrency(goal.monthly)}</td>
                          <td className="px-6 py-4 text-sm font-bold text-primary/70 whitespace-nowrap">{formatCurrency(goal.weekly)}</td>
                          <td className="px-6 py-4 text-sm font-bold text-secondary whitespace-nowrap">{formatCurrency(goal.daily)}</td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button onClick={() => { setEditingGoalType('goal'); setGoalMonth(goal.month); setGoalYear(goal.year); setMonthlyInput(formatLocaleCurrency(goal.monthly, language)); setWorkHoursInput(goal.workHours.toString()); setWorkDaysPerWeekInput(goal.workDaysPerWeek?.toString() || '6'); setIsEditingGoal(true); }} className="p-2 text-primary hover:bg-primary/10 rounded-lg transition-colors"><Edit2 size={16} /></button>
                              <button onClick={() => { 
                                if (window.confirm(t('confirmDelete') || 'Tem certeza que deseja excluir?')) {
                                  if (goal.categoryBudgets && Object.keys(goal.categoryBudgets).length > 0) { 
                                    onSaveGoal({...goal, monthly: 0, daily: 0, weekly: 0, yearly: 0}); 
                                  } else { 
                                    onDeleteGoalHistory?.(key); 
                                  } 
                                }
                              }} className="p-2 text-error hover:bg-error/10 rounded-lg transition-colors"><Trash2 size={16} /></button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  {Object.values(activeVehicleGoalHistory).filter(h => (h as Goal)?.monthly > 0).length === 0 && (
                    <tr><td colSpan={4} className="p-12 text-center opacity-30 font-bold uppercase tracking-widest text-xs">{t('noGoalsFound')}</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Budget Settings */}
        <section className="col-span-12 bg-surface-container-lowest rounded-xl p-8 shadow-sm overflow-hidden border border-outline-variant/10 mt-6">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-error/10 rounded-lg">
                <Tag className="text-error" size={24} />
              </div>
              <h3 className="text-xl font-black font-headline tracking-tight">{t('budgetSettings')}</h3>
            </div>
            
            {(!isAddingGoalHistory || editingGoalType !== 'budget') && (
              <button 
                onClick={() => {
                  setIsAddingGoalHistory(true);
                  setEditingGoalType('budget');
                  setGoalMonth(new Date().getMonth());
                  setGoalYear(new Date().getFullYear());
                  setCategoryBudgetsInput({ maintenance: '0,00', washing: '0,00', fuel: '0,00', food: '0,00', toll: '0,00', parking: '0,00' });
                }} 
                className="flex items-center gap-2 px-6 py-2.5 bg-error text-white font-black text-xs rounded-xl shadow-lg hover:scale-105 transition-all"
              >
                <Plus size={18} />
                {t('newBudget')}
              </button>
            )}
          </div>

          {(isEditingGoal || isAddingGoalHistory) && editingGoalType === 'budget' ? (
            <div className="space-y-6 bg-surface-container-low p-8 rounded-3xl border border-outline-variant/30 shadow-md">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-3">
                  <label className="text-[11px] font-black text-on-surface uppercase tracking-widest px-1">{t('month')}</label>
                  <select className="w-full bg-surface-container-highest p-4 rounded-2xl text-sm font-bold border border-outline-variant/60 focus:border-error/50 focus:ring-4 focus:ring-error/10 shadow-sm outline-none transition-all appearance-none" value={goalMonth} onChange={(e) => setGoalMonth(parseInt(e.target.value))}>
                    {Array.from({ length: 12 }, (_, i) => <option key={i} value={i}>{new Date(2024, i).toLocaleDateString(language, { month: 'long' })}</option>)}
                  </select>
                </div>
                <div className="space-y-3">
                  <label className="text-[11px] font-black text-on-surface uppercase tracking-widest px-1">{t('year')}</label>
                  <select className="w-full bg-surface-container-highest p-4 rounded-2xl text-sm font-bold border border-outline-variant/60 focus:border-error/50 focus:ring-4 focus:ring-error/10 shadow-sm outline-none transition-all appearance-none" value={goalYear} onChange={(e) => setGoalYear(parseInt(e.target.value))}>
                    {Array.from({ length: 5 }, (_, i) => { const year = new Date().getFullYear() - 2 + i; return <option key={year} value={year}>{year}</option>; })}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
                {['maintenance', 'washing', 'fuel', 'food', 'toll', 'parking'].map(id => (
                  <div key={id} className="space-y-3">
                    <label className="text-[11px] font-black text-on-surface uppercase tracking-widest px-1">{t(id)}</label>
                    <input className="w-full bg-surface-container-highest p-4 rounded-2xl text-sm font-black border border-outline-variant/60 focus:border-error/50 focus:ring-4 focus:ring-error/10 shadow-sm outline-none transition-all" type="text" placeholder="0,00" value={categoryBudgetsInput[id] || ''} onChange={e => setCategoryBudgetsInput(prev => ({...prev, [id]: formatMaskedCurrency(e.target.value, language)}))} />
                  </div>
                ))}
              </div>

              <div className="flex justify-end gap-4 pt-4">
                <button onClick={() => { setIsEditingGoal(false); setIsAddingGoalHistory(false); }} className="px-6 py-3 text-on-surface-variant font-black text-xs uppercase tracking-widest hover:bg-surface-container-high rounded-xl transition-all">{t('cancel')}</button>
                <button onClick={handleSaveGoal} className="px-10 py-4 bg-error text-white font-black text-xs uppercase tracking-widest rounded-xl shadow-xl transition-all">{t('saveBudget')}</button>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-3xl border border-outline-variant/10 bg-white/30 backdrop-blur-sm">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-surface-container-low/50">
                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-on-surface-variant whitespace-nowrap">{t('period')}</th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-on-surface-variant whitespace-nowrap">{t('maintenance')}</th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-on-surface-variant whitespace-nowrap">{t('fuel')}</th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-on-surface-variant whitespace-nowrap">{t('food')}</th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-on-surface-variant whitespace-nowrap">{t('toll')}</th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-on-surface-variant whitespace-nowrap">{t('parking')}</th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-on-surface-variant whitespace-nowrap">{t('totalBudget')}</th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-on-surface-variant text-right whitespace-nowrap">{t('actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/5">
                  {Object.entries(activeVehicleGoalHistory)
                    .filter(([_, h]) => {
                      const budget = h as Goal;
                      return budget && budget.categoryBudgets && Object.values(budget.categoryBudgets).some(v => (v as number) > 0);
                    })
                    .sort(([_, a], [__, b]) => {
                      const budgetA = a as Goal;
                      const budgetB = b as Goal;
                      return (budgetB.year * 12 + budgetB.month) - (budgetA.year * 12 + budgetA.month);
                    })
                    .map(([key, h]) => {
                      const budget = h as Goal;
                      const totalBudget = Object.values(budget.categoryBudgets || {}).reduce((sum, v) => (sum as number) + (v as number), 0) as number;
                      return (
                        <tr key={key} className="hover:bg-surface-container-low transition-colors group">
                          <td className="px-6 py-4 text-sm font-bold capitalize whitespace-nowrap">
                            {new Date(budget.year, budget.month).toLocaleDateString(language, { month: 'long', year: 'numeric' })}
                          </td>
                          <td className="px-6 py-4 text-xs font-black text-error/60 whitespace-nowrap">{formatCurrency(budget.categoryBudgets?.maintenance || 0)}</td>
                          <td className="px-6 py-4 text-xs font-black text-error/60 whitespace-nowrap">{formatCurrency(budget.categoryBudgets?.fuel || 0)}</td>
                          <td className="px-6 py-4 text-xs font-black text-error/60 whitespace-nowrap">{formatCurrency(budget.categoryBudgets?.food || 0)}</td>
                          <td className="px-6 py-4 text-xs font-black text-error/60 whitespace-nowrap">{formatCurrency(budget.categoryBudgets?.toll || 0)}</td>
                          <td className="px-6 py-4 text-xs font-black text-error/60 whitespace-nowrap">{formatCurrency(budget.categoryBudgets?.parking || 0)}</td>
                          <td className="px-6 py-4 text-sm font-black text-error whitespace-nowrap">{formatCurrency(totalBudget)}</td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button onClick={() => { setEditingGoalType('budget'); setGoalMonth(budget.month); setGoalYear(budget.year); const b: any = {}; ['maintenance', 'washing', 'fuel', 'food', 'toll', 'parking'].forEach(id => b[id] = formatLocaleCurrency(budget.categoryBudgets?.[id] || 0, language)); setCategoryBudgetsInput(b); setIsEditingGoal(true); }} className="p-2 text-error hover:bg-error/10 rounded-lg transition-colors"><Edit2 size={16} /></button>
                              <button onClick={() => { 
                                if (window.confirm(t('confirmDelete') || 'Tem certeza que deseja excluir?')) {
                                  if (budget.monthly > 0) { 
                                    onSaveGoal({...budget, categoryBudgets: {}}); 
                                  } else { 
                                    onDeleteGoalHistory?.(key); 
                                  } 
                                }
                              }} className="p-2 text-error hover:bg-error/10 rounded-lg transition-colors"><Trash2 size={16} /></button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  {Object.values(activeVehicleGoalHistory).filter(h => {
                    const budget = h as Goal;
                    return budget && budget.categoryBudgets && Object.values(budget.categoryBudgets).some(v => (v as number) > 0);
                  }).length === 0 && (
                    <tr><td colSpan={3} className="p-12 text-center opacity-30 font-bold uppercase tracking-widest text-xs">{t('noBudgetsFound')}</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
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

                      <div className="flex gap-1 justify-end border-t border-outline-variant/10 pt-2">
                        <button onClick={() => setEditingCategoryId(null)} className="px-3 py-2 text-on-surface-variant hover:bg-surface-container-low rounded-lg text-xs font-bold">{t('cancel')}</button>
                        <button onClick={handleUpdateCategory} className="px-5 py-2 bg-primary text-on-primary rounded-lg shadow-sm flex items-center gap-2 text-xs font-bold"><CheckCircle size={16} /> {t('save')}</button>
                      </div>
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
                        
                        {!cat.isDefault && !systemCategoryIds.has(cat.id) && (
                          <button onClick={() => { 
                            setEditingCategoryId(cat.id); 
                            setEditingCategoryName(cat.isDefault ? t(cat.id) : cat.name); 
                            setEditingCategoryType(cat.costType); 
                          }} className="text-on-surface-variant hover:text-primary p-1 rounded-lg hover:bg-surface-container-high transition-colors"><Edit2 size={14} /></button>
                        )}
                        
                        {!cat.isDefault && !systemCategoryIds.has(cat.id) && (
                          <button onClick={() => {
                            if (window.confirm(t('confirmDelete') || 'Tem certeza que deseja excluir?')) {
                              handleDeleteCategory(cat.id);
                            }
                          }} className="text-on-surface-variant hover:text-error p-1 rounded-lg hover:bg-surface-container-high transition-colors"><Trash2 size={14} /></button>
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
                                          <button onClick={() => {
                                            if (window.confirm(t('confirmDelete') || 'Tem certeza que deseja excluir?')) {
                                              handleDeleteSubcategory(cat.id, sub);
                                            }
                                          }} className="text-on-surface-variant hover:text-error p-1 rounded-md hover:bg-surface-container-high transition-colors"><Trash2 size={12} /></button>
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
                <Target className="text-primary" size={20} />
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
                          </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-0.5">
                      
                      {!plat.isDefault && !systemPlatformIds.has(plat.id) && (
                        <button onClick={() => { 
                          setEditingPlatformId(plat.id); 
                          setEditingPlatformName(plat.isDefault ? t(plat.id) : plat.name); 
                          setEditingPlatformType(plat.type); 
                        }} className="text-on-surface-variant hover:text-primary p-1 rounded-lg hover:bg-surface-container-high transition-colors"><Edit2 size={14} /></button>
                      )}
                      
                      {!plat.isDefault && !systemPlatformIds.has(plat.id) && (
                        <button onClick={() => {
                          if (window.confirm(t('confirmDelete') || 'Tem certeza que deseja excluir?')) {
                            handleDeletePlatform(plat.id);
                          }
                        }} className="text-on-surface-variant hover:text-error p-1 rounded-lg hover:bg-surface-container-high transition-colors"><Trash2 size={14} /></button>
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
      </div>

      <footer className="mt-16 text-center space-y-2 opacity-40">
        <p className="text-xs font-label uppercase tracking-[0.2em] font-bold">KM Profit v3.0.0</p>
        <p className="text-[10px] font-body">{t('developedFor')}</p>
      </footer>
    </div>
  );
}
