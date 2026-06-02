/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Smartphone } from 'lucide-react';
import { Layout } from './components/Layout';
import { DashboardScreen } from './components/DashboardScreen';
import { AddSelectionScreen } from './components/AddSelectionScreen';
import { AddIncomeScreen } from './components/AddIncomeScreen';
import { AddExpenseScreen } from './components/AddExpenseScreen';
import { ReportsScreen } from './components/ReportsScreen';
import { SettingsScreen } from './components/SettingsScreen';
import { CalculatorScreen } from './components/CalculatorScreen';
import { MyVehiclesScreen } from './components/MyVehiclesScreen';
import { FixedFinanceScreen } from './components/FixedFinanceScreen';
import { HelpScreen } from './components/HelpScreen';
import { AdminScreen } from './components/AdminScreen';
import { LoginScreen } from './components/LoginScreen';
import { SignupScreen } from './components/SignupScreen';
import { PwaInstallModal } from './components/PwaInstallModal';
import { Screen, IncomeRecord, ExpenseRecord, Goal, UserProfile, GoalHistory, Category, Platform, CATEGORIES, PLATFORMS, TransactionStatus, MaintenancePlanItem } from './types';
import { parseLocaleNumber } from './lib/currency';
import { calculateFuelPerformance } from './lib/fuel';
import { getLocalDateString, getRawNextOccurrenceDate } from './lib/utils';
import { LanguageProvider, useLanguage } from './contexts/LanguageContext';
import { ThemeProvider } from './contexts/ThemeContext';

function AppContent() {
  const { t } = useLanguage();
  // One-time data reset logic
  useState(() => {
    const resetFlag = localStorage.getItem('dataReset_v31');
    if (!resetFlag) {
      localStorage.removeItem('incomes');
      localStorage.removeItem('expenses');
      localStorage.removeItem('goal');
      localStorage.removeItem('userProfile');
      localStorage.removeItem('reminders');
      localStorage.removeItem('categories');
      localStorage.removeItem('platforms');
      localStorage.removeItem('isAuthenticated');
      localStorage.setItem('dataReset_v31', 'true');
    }
  });

  const [loginError, setLoginError] = useState('');
  const [currentScreen, setCurrentScreen] = useState<Screen>(() => {
    return (localStorage.getItem('isAuthenticated') === 'true') ? 'dashboard' : 'login';
  });
  const [initialData, setInitialData] = useState<any>(null);
  const [isPrivacyActive, setIsPrivacyActive] = useState(false);
  
  // PWA installation state
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallModalOpen, setIsInstallModalOpen] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Check if running as PWA / Standalone App
    const checkStandalone = () => {
      const isStandaloneMedia = window.matchMedia('(display-mode: standalone)').matches;
      const isStandaloneNavigator = (window.navigator as any).standalone === true;
      setIsStandalone(isStandaloneMedia || isStandaloneNavigator);
    };

    checkStandalone();

    // Listen for display-mode changes
    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    const handleDisplayModeChange = (e: MediaQueryListEvent) => {
      setIsStandalone(e.matches || (window.navigator as any).standalone === true);
    };

    try {
      mediaQuery.addEventListener('change', handleDisplayModeChange);
    } catch (err) {
      // Fallback for older browsers
      try {
        mediaQuery.addListener(handleDisplayModeChange);
      } catch (e) {
        console.warn(e);
      }
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      try {
        mediaQuery.removeEventListener('change', handleDisplayModeChange);
      } catch (err) {
        try {
          mediaQuery.removeListener(handleDisplayModeChange);
        } catch (e) {
          console.warn(e);
        }
      }
    };
  }, []);

  const handleTriggerInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`PWA install response: ${outcome}`);
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
    setIsInstallModalOpen(false);
  };

  const [isAdminMode] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('mode') === 'admin' || window.location.pathname === '/admin' || window.location.pathname.startsWith('/admin/');
  });

  const getWeekNumber = (d: Date) => {
    const date = new Date(d.getTime());
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() + 3 - (date.getDay() + 6) % 7);
    const week1 = new Date(date.getFullYear(), 0, 4);
    return 1 + Math.round(((date.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
  };

  const getMonthFromWeek = (year: number, week: number) => {
    // Standard ISO week calculation for the Thursday of that week
    const jan4 = new Date(year, 0, 4);
    const dayOfWeek = jan4.getDay() || 7; // 1 (Mon) to 7 (Sun)
    const firstThursday = new Date(year, 0, 4 + (4 - dayOfWeek));
    const thursdayOfRequestedWeek = new Date(firstThursday.getTime());
    thursdayOfRequestedWeek.setDate(firstThursday.getDate() + (week - 1) * 7);
    return thursdayOfRequestedWeek.getMonth();
  };

  // Dashboard filter persistence
  const [dashboardFilter, setDashboardFilter] = useState<'day' | 'week' | 'month' | 'year'>(() => {
    return (localStorage.getItem('dashboardFilter') as any) || 'day';
  });
  const [dashboardSelectedDate, setDashboardSelectedDate] = useState(() => {
    return localStorage.getItem('dashboardSelectedDate') || getLocalDateString(new Date());
  });
  const [dashboardSelectedYear, setDashboardSelectedYear] = useState(() => {
    return Number(localStorage.getItem('dashboardSelectedYear')) || new Date().getFullYear();
  });
  const [dashboardSelectedMonth, setDashboardSelectedMonth] = useState(() => {
    const saved = localStorage.getItem('dashboardSelectedMonth');
    return saved !== null ? Number(saved) : new Date().getMonth();
  });
  const [dashboardSelectedWeek, setDashboardSelectedWeek] = useState(() => {
    return Number(localStorage.getItem('dashboardSelectedWeek')) || getWeekNumber(new Date());
  });

  // Reports filter persistence
  const [reportsStartDate, setReportsStartDate] = useState(() => {
    const saved = localStorage.getItem('reportsStartDate');
    if (saved) return saved;
    const currentYear = new Date().getFullYear();
    return `${currentYear}-01-01`;
  });
  const [reportsEndDate, setReportsEndDate] = useState(() => {
    return localStorage.getItem('reportsEndDate') || getLocalDateString(new Date());
  });

  useEffect(() => {
    localStorage.setItem('dashboardFilter', dashboardFilter);
    localStorage.setItem('dashboardSelectedDate', dashboardSelectedDate);
    localStorage.setItem('dashboardSelectedYear', String(dashboardSelectedYear));
    localStorage.setItem('dashboardSelectedMonth', String(dashboardSelectedMonth));
    localStorage.setItem('dashboardSelectedWeek', String(dashboardSelectedWeek));
  }, [dashboardFilter, dashboardSelectedDate, dashboardSelectedYear, dashboardSelectedMonth, dashboardSelectedWeek]);

  useEffect(() => {
    localStorage.setItem('reportsStartDate', reportsStartDate);
    localStorage.setItem('reportsEndDate', reportsEndDate);
  }, [reportsStartDate, reportsEndDate]);

  const [incomes, setIncomes] = useState<IncomeRecord[]>(() => {
    const saved = localStorage.getItem('incomes');
    const parsed: IncomeRecord[] = saved ? JSON.parse(saved) : [];
    let migrated = false;
    const result = parsed.map(item => {
      if (item.type === 'fixed' && item.isFixedConfig === undefined) {
        migrated = true;
        return { ...item, isFixedConfig: true };
      }
      return item;
    });
    if (migrated) {
      localStorage.setItem('incomes', JSON.stringify(result));
    }
    return result;
  });
  const [expenses, setExpenses] = useState<ExpenseRecord[]>(() => {
    const saved = localStorage.getItem('expenses');
    const parsed: ExpenseRecord[] = saved ? JSON.parse(saved) : [];
    let migrated = false;
    const result = parsed.map(item => {
      if (item.costType === 'fixed' && item.isFixedConfig === undefined) {
        migrated = true;
        return { ...item, isFixedConfig: true };
      }
      return item;
    });
    if (migrated) {
      localStorage.setItem('expenses', JSON.stringify(result));
    }
    return result;
  });
  const [goal, setGoal] = useState<Goal>(() => {
    const saved = localStorage.getItem('goal');
    const defaultGoal: Goal = {
      id: 'default',
      month: new Date().getMonth(),
      year: new Date().getFullYear(),
      daily: 200,
      weekly: 1200,
      monthly: 5000,
      yearly: 60000,
      workHours: 8,
      workDaysPerMonth: 26
    };
    return saved ? JSON.parse(saved) : defaultGoal;
  });
  const [goalHistory, setGoalHistory] = useState<GoalHistory>(() => {
    const saved = localStorage.getItem('goalHistory');
    return saved ? JSON.parse(saved) : {};
  });

  useEffect(() => {
    localStorage.setItem('goalHistory', JSON.stringify(goalHistory));
  }, [goalHistory]);

  const [userProfile, setUserProfile] = useState<UserProfile | null>(() => {
    const saved = localStorage.getItem('userProfile');
    return saved ? JSON.parse(saved) : null;
  });
  const [categories, setCategories] = useState<Category[]>(() => {
    const saved = localStorage.getItem('categories');
    if (!saved) return CATEGORIES;
    
    const loadedCategories: Category[] = JSON.parse(saved);
    
    // 1. Keep custom categories
    // 2. For system categories (isDefault), match with current CATEGORIES constant
    // 3. Remove system categories that are no longer in CATEGORIES constant
    
    const systemIds = new Set(CATEGORIES.map(c => c.id));
    
    const merged = loadedCategories
      .filter(cat => !cat.isDefault || systemIds.has(cat.id))
      .map(cat => {
        if (cat.isDefault) {
          const defaultCat = CATEGORIES.find(c => c.id === cat.id);
          if (defaultCat) {
            // Force sync critical properties from constants
            return {
              ...cat,
              name: defaultCat.name,
              icon: defaultCat.icon,
              color: defaultCat.color,
              costType: defaultCat.costType,
              subcategories: defaultCat.subcategories,
              defaultAmount: defaultCat.defaultAmount // Force sync defaultAmount to clear stale 1000 value
            };
          }
        }
        return cat;
      });
      
    // Add any new categories from constants that aren't in the list
    const existingIds = new Set(merged.map(c => c.id));
    CATEGORIES.forEach(c => {
      if (!existingIds.has(c.id)) {
        merged.push(c);
      }
    });

    return merged;
  });
  const [platforms, setPlatforms] = useState<Platform[]>(() => {
    const saved = localStorage.getItem('platforms');
    if (!saved) return PLATFORMS;
    
    const loadedPlatforms: Platform[] = JSON.parse(saved);
    const systemIds = new Set(PLATFORMS.map(p => p.id));
    
    const normalizeStr = (str: string) => 
      str.toLowerCase()
         .normalize("NFD")
         .replace(/[\u0300-\u036f]/g, "")
         .replace(/\s+/g, "")
         .trim();

    const defaultPlatformNamesNormalized = new Set([
      'uber', '99', 'indrive', 'taxi', 'freight', 'frete', 'ifood', 'rappi',
      'ladydriver', 'lady driver', 'wappa', 'bonus', 'bonus', 'bono',
      'tips', 'gorjeta', 'gorjetas', 'propina', 'pourboire', 'lalamove',
      'loggi', 'carpool', 'carona', 'maxim', 'other', 'outro'
    ].map(normalizeStr));
    
    const merged: Platform[] = [];
    const seenIds = new Set<string>();
    const seenNormalizedNames = new Set<string>();

    const processedLoaded = loadedPlatforms
      .filter(p => !p.isDefault || systemIds.has(p.id))
      .map(p => {
        if (p.isDefault || systemIds.has(p.id)) {
          const defaultPlat = PLATFORMS.find(dp => dp.id === p.id);
          if (defaultPlat) {
            return {
              ...p,
              isDefault: true,
              name: defaultPlat.name,
              icon: defaultPlat.icon,
              color: defaultPlat.color,
              type: defaultPlat.type,
              subcategories: defaultPlat.subcategories
            };
          }
        }
        return p;
      });

    processedLoaded.forEach(p => {
      const normName = normalizeStr(p.isDefault ? p.id : p.name);
      if (seenIds.has(p.id)) return;
      if (!p.isDefault && (defaultPlatformNamesNormalized.has(normName) || seenNormalizedNames.has(normName))) return;
      
      merged.push(p);
      seenIds.add(p.id);
      seenNormalizedNames.add(normName);
    });

    PLATFORMS.forEach(p => {
      if (!seenIds.has(p.id)) {
        merged.push(p);
        seenIds.add(p.id);
        seenNormalizedNames.add(normalizeStr(p.id));
      }
    });

    const orderMap = new Map(PLATFORMS.map((p, index) => [p.id, index]));
    merged.sort((a, b) => {
      const idxA = orderMap.get(a.id);
      const idxB = orderMap.get(b.id);
      if (idxA !== undefined && idxB !== undefined) {
        return idxA - idxB;
      }
      if (idxA !== undefined) return -1;
      if (idxB !== undefined) return 1;
      return 0;
    });

    return merged;
  });
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return localStorage.getItem('isAuthenticated') === 'true';
  });

  const [activeVehicleId, setActiveVehicleId] = useState<string | null>(() => {
    return localStorage.getItem('activeVehicleId');
  });

  // Ensure activeVehicleId is set if user has vehicles but none selected
  useEffect(() => {
    if (isAuthenticated && userProfile?.vehicles && userProfile.vehicles.length > 0) {
      if (!activeVehicleId || !userProfile.vehicles.find(v => v.id === activeVehicleId)) {
        setActiveVehicleId(userProfile.vehicles[0].id);
      }
    }
  }, [isAuthenticated, userProfile?.vehicles, activeVehicleId]);

  useEffect(() => {
    if (activeVehicleId) {
      localStorage.setItem('activeVehicleId', activeVehicleId);
    }
  }, [activeVehicleId]);
  const [isSigningUp, setIsSigningUp] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Persistence
  useEffect(() => {
    localStorage.setItem('userProfile', JSON.stringify(userProfile));
  }, [userProfile]);

  // Keep vehicle currentOdometers in sync with highest readings from remaining incomes and expenses
  useEffect(() => {
    if (!userProfile?.vehicles || userProfile.vehicles.length === 0) return;

    let profileChanged = false;
    const updatedVehicles = userProfile.vehicles.map(vehicle => {
      const baseOdo = vehicle.initialOdometer !== undefined ? vehicle.initialOdometer : (vehicle.currentOdometer || 0);

      const vehicleIncomes = incomes.filter(i => i.vehicleId === vehicle.id);
      const maxIncomeOdo = vehicleIncomes.reduce((max, i) => {
        const odo = Number(i.endOdometer);
        return (!isNaN(odo) && odo > max) ? odo : max;
      }, 0);

      const vehicleExpenses = expenses.filter(e => e.vehicleId === vehicle.id);
      const maxExpenseOdo = vehicleExpenses.reduce((max, e) => {
        const odo = e.odometer ? Number(e.odometer.replace(',', '.')) : 0;
        return (!isNaN(odo) && odo > max) ? odo : max;
      }, 0);

      const calculatedMaxOdo = Math.max(baseOdo, maxIncomeOdo, maxExpenseOdo);

      if (vehicle.currentOdometer !== calculatedMaxOdo || vehicle.initialOdometer !== baseOdo) {
        profileChanged = true;
        return {
          ...vehicle,
          initialOdometer: baseOdo,
          currentOdometer: calculatedMaxOdo
        };
      }
      return vehicle;
    });

    if (profileChanged) {
      setUserProfile(prev => prev ? { ...prev, vehicles: updatedVehicles } : null);
    }
  }, [incomes, expenses]);

  useEffect(() => {
    localStorage.setItem('categories', JSON.stringify(categories));
  }, [categories]);

  useEffect(() => {
    localStorage.setItem('platforms', JSON.stringify(platforms));
  }, [platforms]);

  useEffect(() => {
    localStorage.setItem('incomes', JSON.stringify(incomes));
  }, [incomes]);

  useEffect(() => {
    localStorage.setItem('expenses', JSON.stringify(expenses));
  }, [expenses]);

  // Automatic registration of fixed incomes and expenses when they reach their due date
  useEffect(() => {
    const todayObj = new Date();
    const todayStr = `${todayObj.getFullYear()}-${String(todayObj.getMonth() + 1).padStart(2, '0')}-${String(todayObj.getDate()).padStart(2, '0')}`;

    let updatedIncomes = [...incomes];
    let incomesChanged = false;

    // Process incomes
    for (let i = 0; i < updatedIncomes.length; i++) {
      const item = updatedIncomes[i];
      if (item.type === 'fixed' && item.isFixedConfig === true && item.date) {
        let currentConfigDate = item.date;
        let count = 0;
        // Loop while currentConfigDate <= todayStr
        while (currentConfigDate && currentConfigDate <= todayStr && count < 100) {
          count++;
          incomesChanged = true;
          // 1. Create registered transaction for the due date
          const newTransaction: IncomeRecord = {
            ...item,
            id: Date.now() + Math.floor(Math.random() * 1000000) + count,
            isFixedConfig: false,
            date: currentConfigDate, // record on the exact due date
          };
          updatedIncomes.push(newTransaction);

          // 2. Advance the config date
          currentConfigDate = getRawNextOccurrenceDate(currentConfigDate, item.recurrence || 'monthly');
        }
        if (currentConfigDate !== item.date) {
          updatedIncomes[i] = {
            ...item,
            date: currentConfigDate
          };
        }
      }
    }

    let updatedExpenses = [...expenses];
    let expensesChanged = false;

    // Process expenses
    for (let i = 0; i < updatedExpenses.length; i++) {
      const item = updatedExpenses[i];
      if (item.costType === 'fixed' && item.isFixedConfig === true && item.date) {
        let currentConfigDate = item.date;
        let count = 0;
        // Loop while currentConfigDate <= todayStr
        while (currentConfigDate && currentConfigDate <= todayStr && count < 100) {
          count++;
          expensesChanged = true;
          // 1. Create registered transaction for the due date
          const newTransaction: ExpenseRecord = {
            ...item,
            id: Date.now() + Math.floor(Math.random() * 1000000) + count,
            isFixedConfig: false,
            date: currentConfigDate, // record on the exact due date
          };
          updatedExpenses.push(newTransaction);

          // 2. Advance the config date
          currentConfigDate = getRawNextOccurrenceDate(currentConfigDate, item.recurrence || 'monthly');
        }
        if (currentConfigDate !== item.date) {
          updatedExpenses[i] = {
            ...item,
            date: currentConfigDate
          };
        }
      }
    }

    if (incomesChanged) {
      setIncomes(updatedIncomes);
    }
    if (expensesChanged) {
      setExpenses(updatedExpenses);
    }
  }, [incomes, expenses]);

  useEffect(() => {
    localStorage.setItem('goal', JSON.stringify(goal));
  }, [goal]);

  useEffect(() => {
    localStorage.setItem('goalHistory', JSON.stringify(goalHistory));
  }, [goalHistory]);

  useEffect(() => {
    localStorage.setItem('isAuthenticated', String(isAuthenticated));
  }, [isAuthenticated]);

  const updateGoal = (newGoal: Goal) => {
    setGoal(newGoal);
  };

  const handleUpdateProfile = (newProfileOrFn: UserProfile | ((prev: UserProfile) => UserProfile)) => {
    if (typeof newProfileOrFn === 'function') {
      setUserProfile(prev => prev ? newProfileOrFn(prev) : null);
    } else {
      setUserProfile(newProfileOrFn);
    }
  };

  const navigateTo = (screen: Screen, data?: any) => {
    setInitialData(data || null);
    setCurrentScreen(screen);
  };

  const handleLogin = async (email: string, pass: string) => {
    try {
      setLoginError('');
      setIsLoggingIn(true);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));

      const savedProfile = localStorage.getItem('userProfile');
      if (savedProfile) {
        const profile = JSON.parse(savedProfile);
        if (profile.email === email && profile.password === pass) {
          setIsAuthenticated(true);
          setCurrentScreen('dashboard');
          return;
        }
      }
      
      // Default dev credentials
      if (email === 'admin@kmprofit.com' && pass === '123456') {
        const defaultProfile: UserProfile = {
          firstName: 'Admin',
          lastName: 'User',
          email: 'admin@kmprofit.com',
          phone: '',
          birthDate: '',
          city: '',
          state: '',
          password: '123456',
          vehicles: [
            {
              id: 'veh_default',
              brand: 'Toyota',
              model: 'Corolla',
              plate: 'ABC-1234',
              year: '2022',
              tankCapacity: '50',
              currentOdometer: 10000,
              type: 'car'
            }
          ],
          drivers: []
        };
        setUserProfile(defaultProfile);
        setIsAuthenticated(true);
        setCurrentScreen('dashboard');
        return;
      }

      setLoginError('E-mail ou senha incorretos.');
    } catch (err: any) {
      setLoginError('Ocorreu um erro ao tentar entrar.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleSignup = async (profile: UserProfile) => {
    try {
      setLoginError('');
      setIsSigningUp(true);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));

      setUserProfile(profile);
      setIsAuthenticated(true);
      setCurrentScreen('dashboard');
    } catch (err: any) {
      setLoginError('Erro ao criar conta. Tente novamente.');
    } finally {
      setIsSigningUp(false);
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setCurrentScreen('login');
  };
  
  const addIncome = (record: IncomeRecord | Omit<IncomeRecord, 'id'>) => {
    const newRecord = {
      ...record,
      id: 'id' in record ? record.id : Date.now(),
      vehicleId: record.vehicleId || activeVehicleId || undefined
    } as IncomeRecord;

    setIncomes(prev => {
      const existingIdx = prev.findIndex(r => r.id === newRecord.id);
      if (existingIdx >= 0) {
        const updated = [...prev];
        updated[existingIdx] = newRecord;
        return updated;
      }
      return [newRecord, ...prev];
    });

    // Update current odometer if the new record has a higher endOdometer reading
    if ('endOdometer' in record && record.endOdometer && activeVehicleId) {
      const newOdo = Number(record.endOdometer);
      if (!isNaN(newOdo)) {
        setUserProfile(prevProfile => {
          if (!prevProfile) return null;
          const activeVehicleIndex = prevProfile.vehicles?.findIndex(v => v.id === activeVehicleId);
          if (activeVehicleIndex !== undefined && activeVehicleIndex !== -1) {
            const activeVehicle = prevProfile.vehicles![activeVehicleIndex];
            if (newOdo > (activeVehicle.currentOdometer || 0)) {
              const updatedVehicles = [...(prevProfile.vehicles || [])];
              updatedVehicles[activeVehicleIndex] = {
                ...activeVehicle,
                currentOdometer: newOdo
              };
              return {
                ...prevProfile,
                vehicles: updatedVehicles
              };
            }
          }
          return prevProfile;
        });
      }
    }
  };

  const addExpense = (record: ExpenseRecord | Omit<ExpenseRecord, 'id'>) => {
    const newRecord = {
      ...record,
      id: 'id' in record ? record.id : Date.now(),
      vehicleId: record.vehicleId || activeVehicleId || undefined
    } as ExpenseRecord;

    setExpenses(prev => {
      const existingIdx = prev.findIndex(r => r.id === newRecord.id);
      if (existingIdx >= 0) {
        const updated = [...prev];
        updated[existingIdx] = newRecord;
        return updated;
      }
      return [newRecord, ...prev];
    });

    // Update current odometer if the new record has a higher reading
    if ('odometer' in record && record.odometer && activeVehicleId) {
      const newOdo = Number(record.odometer.replace(',', '.'));
      if (!isNaN(newOdo)) {
        setUserProfile(prevProfile => {
          if (!prevProfile) return null;
          const activeVehicleIndex = prevProfile.vehicles?.findIndex(v => v.id === activeVehicleId);
          if (activeVehicleIndex !== undefined && activeVehicleIndex !== -1) {
            const activeVehicle = prevProfile.vehicles![activeVehicleIndex];
            if (newOdo > (activeVehicle.currentOdometer || 0)) {
              const updatedVehicles = [...(prevProfile.vehicles || [])];
              updatedVehicles[activeVehicleIndex] = {
                ...activeVehicle,
                currentOdometer: newOdo
              };
              return {
                ...prevProfile,
                vehicles: updatedVehicles
              };
            }
          }
          return prevProfile;
        });
      }
    }
  };

  const getGoalForPeriod = useCallback(() => {
    // Clean empty goal template
    const noGoal: Goal = { 
      id: 'none', 
      vehicleId: activeVehicleId || undefined,
      monthly: 0, 
      weekly: 0, 
      daily: 0, 
      yearly: 0,
      workHours: goal?.workHours || 8,
      workDaysPerMonth: goal?.workDaysPerMonth || 26,
      year: dashboardSelectedYear,
      month: dashboardSelectedMonth
    };

    if (!activeVehicleId) return noGoal;

    if (dashboardFilter === 'year') {
      const yearGoals = Object.values(goalHistory as Record<string, Goal>).filter(g => 
        g && g.year === dashboardSelectedYear && g.vehicleId === activeVehicleId
      );
      
      if (yearGoals.length > 0) {
        const totalYearly = yearGoals.reduce((sum, g) => sum + (g.monthly || 0), 0);
        const baseGoal = yearGoals[yearGoals.length - 1] || goal;
        return {
          ...baseGoal,
          id: `${activeVehicleId}_${dashboardSelectedYear}`,
          vehicleId: activeVehicleId,
          year: dashboardSelectedYear,
          yearly: totalYearly,
        } as Goal;
      }
      return noGoal;
    }

    let periodKey = '';
    if (dashboardFilter === 'month') {
      periodKey = `${dashboardSelectedYear}-${String(dashboardSelectedMonth + 1).padStart(2, '0')}`;
    } else if (dashboardFilter === 'day') {
      periodKey = dashboardSelectedDate;
    } else if (dashboardFilter === 'week') {
      const monthFromWeek = getMonthFromWeek(dashboardSelectedYear, dashboardSelectedWeek);
      periodKey = `${dashboardSelectedYear}-${String(monthFromWeek + 1).padStart(2, '0')}`;
    }

    const searchKey = `${activeVehicleId}_${periodKey}`;
    if (goalHistory[searchKey]) {
      return goalHistory[searchKey];
    }

    // Fallback: If no specific goal for day or week, try to fetch the goal for the parent month
    if (dashboardFilter === 'day') {
      const monthKey = dashboardSelectedDate.substring(0, 7); 
      const fallbackKey = `${activeVehicleId}_${monthKey}`;
      if (goalHistory[fallbackKey]) return goalHistory[fallbackKey];
    } else if (dashboardFilter === 'week') {
      const monthFromWeek = getMonthFromWeek(dashboardSelectedYear, dashboardSelectedWeek);
      const monthKey = `${dashboardSelectedYear}-${String(monthFromWeek + 1).padStart(2, '0')}`;
      const fallbackKey = `${activeVehicleId}_${monthKey}`;
      if (goalHistory[fallbackKey]) return goalHistory[fallbackKey];
    }

    return noGoal;
  }, [activeVehicleId, goal, goalHistory, dashboardFilter, dashboardSelectedYear, dashboardSelectedMonth, dashboardSelectedDate, dashboardSelectedWeek]);

  const updateGoalForPeriod = (newGoal: Goal) => {
    if (!activeVehicleId) return;

    let periodKey = newGoal.id;
    
    // If it's a legacy or automatic call without an ID, fallback to dashboard filter logic
    if (!periodKey || periodKey === 'default' || periodKey === 'none') {
      if (dashboardFilter === 'year') {
        periodKey = `${dashboardSelectedYear}`;
      } else if (dashboardFilter === 'month') {
        periodKey = `${dashboardSelectedYear}-${String(dashboardSelectedMonth + 1).padStart(2, '0')}`;
      } else if (dashboardFilter === 'day') {
        periodKey = dashboardSelectedDate;
      } else if (dashboardFilter === 'week') {
        periodKey = `${dashboardSelectedYear}-W${String(dashboardSelectedWeek).padStart(2, '0')}`;
      }
    }

    // Ensure key is ALWAYS vehicleId_period
    const finalKey = periodKey.includes(activeVehicleId) ? periodKey : `${activeVehicleId}_${periodKey}`;

    setGoalHistory(prev => ({
      ...prev,
      [finalKey]: { ...newGoal, id: finalKey, vehicleId: activeVehicleId }
    }));
    
    // Also update current/default to reflect newest setting
    setGoal({ ...newGoal, vehicleId: activeVehicleId });
    localStorage.setItem('goal', JSON.stringify({ ...newGoal, vehicleId: activeVehicleId }));
  };

  const deleteIncome = (id: string | number) => {
    setIncomes(prev => prev.filter(i => i.id !== id));
  };

  const deleteExpense = (id: string | number) => {
    setExpenses(prev => prev.filter(e => e.id !== id));
  };

  const clearAllData = () => {
    console.log('Clearing all data...');
    setIncomes([]);
    setExpenses([]);
    setGoal({ daily: 0, weekly: 0, monthly: 0, yearly: 0 });
    setGoalHistory({});
    localStorage.removeItem('incomes');
    localStorage.removeItem('expenses');
    localStorage.removeItem('goal');
    localStorage.removeItem('goalHistory');
  };

  const loadMockData = () => {
    console.log('Loading mock data...');

    // Helper to generate IDs
    let nextId = 100000;
    const getNextId = () => nextId++;

    // Base odometer
    let currentOdometer = 50000;
    let lastFillOdometer = currentOdometer;

    // Maintenance Plans Template
    const mockPlan: MaintenancePlanItem[] = [
      {
        id: 'plan_oil_change',
        name: 'oilChange',
        subcategory: 'oilChange',
        intervalKm: 10000,
        lastOdometer: 58500,
        isActive: true
      },
      {
        id: 'plan_alignment',
        name: 'alignment',
        subcategory: 'alignment',
        intervalKm: 10000,
        lastOdometer: 60100,
        isActive: true
      },
      {
        id: 'plan_brake_pad',
        name: 'brakePad',
        subcategory: 'brakePad',
        intervalKm: 20000,
        lastOdometer: 59000,
        isActive: true
      }
    ];

    // Ensure profiles, vehicles and drivers are set up immediately
    let updatedProfile = userProfile;
    const fallbackDriver = {
      id: 'drv_default',
      name: 'João',
      phone: '(11) 98888-8888'
    };

    if (!updatedProfile) {
      updatedProfile = {
        firstName: 'Motorista',
        lastName: 'Lucrativo',
        email: 'user@kmprofit.com',
        vehicles: [
          {
            id: 'veh_default',
            brand: 'Toyota',
            model: 'Corolla',
            plate: 'ABC-1234',
            year: '2022',
            tankCapacity: '50',
            currentOdometer: 60500,
            initialOdometer: 50000,
            type: 'car',
            maintenancePlan: mockPlan
          }
        ],
        drivers: [fallbackDriver]
      };
    } else {
      const updatedVehicles = [...(updatedProfile.vehicles || [])];
      if (updatedVehicles.length === 0) {
        updatedVehicles.push({
          id: 'veh_default',
          brand: 'Toyota',
          model: 'Corolla',
          plate: 'ABC-1234',
          year: '2022',
          tankCapacity: '50',
          currentOdometer: 60500,
          initialOdometer: 50000,
          type: 'car',
          maintenancePlan: mockPlan
        });
      } else {
        // Update existing vehicles
        updatedVehicles.forEach(v => {
          if (!v.maintenancePlan || v.maintenancePlan.length === 0) {
            v.maintenancePlan = mockPlan;
          }
          v.currentOdometer = Math.max(Number(v.currentOdometer || 0), 60500);
        });
      }

      const updatedDrivers = [...(updatedProfile.drivers || [])];
      if (updatedDrivers.length === 0) {
        updatedDrivers.push(fallbackDriver);
      }

      updatedProfile = {
        ...updatedProfile,
        vehicles: updatedVehicles,
        drivers: updatedDrivers
      };
    }

    // Capture the registered and assigned values for use
    const assignedVehicleId = activeVehicleId || (updatedProfile.vehicles && updatedProfile.vehicles.length > 0 ? updatedProfile.vehicles[0].id : 'veh_default');
    const defaultDriverName = updatedProfile.drivers && updatedProfile.drivers.length > 0 
      ? updatedProfile.drivers[0].name 
      : fallbackDriver.name;

    // Immediately commit these changes so that other components see them
    setUserProfile(updatedProfile);
    localStorage.setItem('userProfile', JSON.stringify(updatedProfile));
    
    if (!activeVehicleId) {
      setActiveVehicleId(assignedVehicleId);
      localStorage.setItem('activeVehicleId', assignedVehicleId);
    }

    const allIncomes: IncomeRecord[] = [];
    const allExpenses: ExpenseRecord[] = [];

    // Generate data for March (31 days), April (30 days) and May (31 days)
    const months = [
      { year: 2026, month: 2, days: 31, name: 'Março' }, // month is 0-indexed
      { year: 2026, month: 3, days: 30, name: 'Abril' },
      { year: 2026, month: 4, days: 31, name: 'Maio' }
    ];

    months.forEach((m) => {
      for (let day = 1; day <= m.days; day++) {
        const date = new Date(m.year, m.month, day);
        const dateStr = getLocalDateString(date);
        const isFuture = date > new Date();

        // --- INCOMES ---
        // Daily driving income configured precisely for realistic profits between R$ 3,000 and R$ 6,000 per month
        let dailyIncomeAmount = 300;
        
        if (m.month === 2) {
          // March (Target profit ~R$ 3,400)
          const dayMod = day % 7;
          if (dayMod === 0) { // Sundays: Low income
            dailyIncomeAmount = 80 + Math.random() * 60;
          } else if (dayMod === 5 || dayMod === 6) { // Fri/Sat: High income
            dailyIncomeAmount = 350 + Math.random() * 150;
          } else {
            dailyIncomeAmount = 180 + Math.random() * 120;
          }
          if (day === 10 || day === 22) dailyIncomeAmount = 100; // random slow days
        } else if (m.month === 3) {
          // April (Target profit ~R$ 4,700)
          const dayMod = day % 7;
          if (dayMod === 0) { // Sundays: Low income
            dailyIncomeAmount = 100 + Math.random() * 80;
          } else if (dayMod === 5 || dayMod === 6) { // Fri/Sat: High income
            dailyIncomeAmount = 450 + Math.random() * 200;
          } else {
            dailyIncomeAmount = 230 + Math.random() * 140;
          }
          if (day === 10 || day === 22) dailyIncomeAmount = 120; // random slow days
        } else if (m.month === 4) {
          // May (Target profit ~R$ 5,600)
          const dayMod = day % 7;
          if (dayMod === 0) { // Sundays: Low income
            dailyIncomeAmount = 120 + Math.random() * 100;
          } else if (dayMod === 5 || dayMod === 6) { // Fri/Sat: High income
            dailyIncomeAmount = 550 + Math.random() * 250;
          } else {
            dailyIncomeAmount = 260 + Math.random() * 180;
          }
          if (day === 10 || day === 22) dailyIncomeAmount = 140; // random slow days
        }

        const trips = Math.floor(dailyIncomeAmount / 25) + 2;
        const km = Math.floor((dailyIncomeAmount / 2.5) * (0.8 + Math.random() * 0.4));
        currentOdometer += km;

        // Realistic platform distribution using valid system platform IDs
        const itemsList: { id: number; platform: string; amount: string; trips: string; subcategory?: string }[] = [];
        if (day % 2 === 0) {
          // Split between Uber and 99
          const uberAmount = parseFloat((dailyIncomeAmount * 0.6).toFixed(2));
          const otherAmount = parseFloat((dailyIncomeAmount * 0.4).toFixed(2));
          const uberTrips = Math.max(1, Math.floor(trips * 0.6));
          const otherTrips = Math.max(1, trips - uberTrips);
          
          itemsList.push({
            id: getNextId(),
            platform: 'uber',
            subcategory: 'UberX',
            amount: uberAmount.toFixed(2),
            trips: uberTrips.toString()
          });
          itemsList.push({
            id: getNextId(),
            platform: '99',
            subcategory: '99 Pop',
            amount: otherAmount.toFixed(2),
            trips: otherTrips.toString()
          });
        } else {
          // Single platform rotation
          const platformId = day % 3 === 1 ? 'uber' : (day % 3 === 2 ? '99' : 'indrive');
          const subcategory = platformId === 'uber' ? 'UberX' : (platformId === '99' ? '99 Pop' : undefined);
          
          itemsList.push({
            id: getNextId(),
            platform: platformId,
            subcategory,
            amount: dailyIncomeAmount.toFixed(2),
            trips: trips.toString()
          });
        }

        allIncomes.push({
          id: getNextId(),
          date: dateStr,
          totalAmount: parseFloat(dailyIncomeAmount.toFixed(2)),
          totalTrips: trips,
          hoursWorked: '09:00',
          kmDriven: km,
          notes: `Ganhos do dia - ${m.name}`,
          items: itemsList,
          status: 'paid'
        });

        // --- EXPENSES ---
        // 1. Food (Daily)
        allExpenses.push({
          id: getNextId(),
          amount: (30 + Math.random() * 20).toFixed(2).replace('.', ','),
          category: 'food',
          date: dateStr,
          notes: `Almoço ${m.name}`,
          status: 'paid'
        });

        // 2. Fuel Logic (Redesigned for 100% realistic cycles)
        if (m.month === 2) {
          // March: Gasoline Only 
          const fuelDays = [3, 6, 9, 12, 15, 18, 21, 24, 27, 30];
          if (fuelDays.includes(day)) {
            const isFull = day !== 12; // Day 12 is a partial refill
            const dist = currentOdometer - lastFillOdometer;
            
            if (dist > 0) {
              const targetKmL = 11.2 + Math.random() * 1.5; // realistic Gasoline KM/L: 11.2 - 12.7
              const litersVal = dist / targetKmL;
              const liters = litersVal.toFixed(1).replace('.', ',');
              const price = 5.50;
              const amount = (litersVal * price).toFixed(2).replace('.', ',');
              
              allExpenses.push({
                id: getNextId(),
                amount: amount,
                category: 'fuel',
                fuelType: 'gasolineCommon',
                date: dateStr,
                liters: liters,
                pricePerLiter: price.toFixed(2).replace('.', ','),
                odometer: currentOdometer.toString(),
                isFullTank: isFull,
                notes: isFull ? 'Abastecimento Cheio' : 'Abastecimento Parcial',
                status: 'paid'
              });
              
              if (isFull) {
                lastFillOdometer = currentOdometer;
              }
            }
          }
        } else if (m.month === 3) {
          // April: Ethanol Only
          const fuelDays = [2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30];
          if (fuelDays.includes(day)) {
            const isFull = day !== 14; // Day 14 is a partial refill
            const dist = currentOdometer - lastFillOdometer;
            
            if (dist > 0) {
              const targetKmL = 7.5 + Math.random() * 0.9; // realistic Ethanol KM/L: 7.5 - 8.4
              const litersVal = dist / targetKmL;
              const liters = litersVal.toFixed(1).replace('.', ',');
              const price = 3.80;
              const amount = (litersVal * price).toFixed(2).replace('.', ',');
              
              allExpenses.push({
                id: getNextId(),
                amount: amount,
                category: 'fuel',
                fuelType: 'ethanol',
                date: dateStr,
                liters: liters,
                pricePerLiter: price.toFixed(2).replace('.', ','),
                odometer: currentOdometer.toString(),
                isFullTank: isFull,
                notes: isFull ? 'Cheio Etanol' : 'Parcial Etanol',
                status: 'paid'
              });
              
              if (isFull) {
                lastFillOdometer = currentOdometer;
              }
            }
          }
        } else if (m.month === 4) {
          // May: Gasoline + Ethanol Mix (Frequent refills)
          const fuelDays = [2, 5, 8, 11, 14, 17, 20, 23, 26, 29];
          if (fuelDays.includes(day)) {
            const isGas = day <= 15;
            const isFull = true;
            const dist = currentOdometer - lastFillOdometer;
            
            if (dist > 0) {
              const targetKmL = isGas ? (10.5 + Math.random() * 1.5) : (7.2 + Math.random() * 1.0);
              const litersVal = dist / targetKmL;
              const liters = litersVal.toFixed(1).replace('.', ',');
              const price = isGas ? 5.65 : 3.85;
              const amount = (litersVal * price).toFixed(2).replace('.', ',');
              
              allExpenses.push({
                id: getNextId(),
                amount: amount,
                category: 'fuel',
                fuelType: isGas ? 'gasolineCommon' : 'ethanol',
                date: dateStr,
                liters: liters,
                pricePerLiter: price.toFixed(2).replace('.', ','),
                odometer: currentOdometer.toString(),
                isFullTank: isFull,
                notes: isGas ? 'Gasolina Maio' : 'Etanol Maio',
                status: 'paid'
              });
              
              if (isFull) {
                lastFillOdometer = currentOdometer;
              }
            }
          }
        }

        // 3. Maintenance (Using realistic items, sequential odometers, and subcategories)
        if (m.month === 2) {
          // March 2026
          if (day === 1) {
            allExpenses.push({
              id: getNextId(),
              amount: '280,00',
              category: 'maintenance',
              subCategory: 'brakePad',
              maintenanceType: 'Troca de Pastilhas de Freio',
              maintenanceGroup: 'preventive',
              date: dateStr,
              notes: 'Substituição das pastilhas de freio dianteiras',
              odometer: '50000',
              status: 'paid'
            });
          } else if (day === 5) {
            allExpenses.push({
              id: getNextId(),
              amount: '350,00',
              category: 'maintenance',
              subCategory: 'oilChange',
              maintenanceType: 'Troca de Óleo e Filtro',
              maintenanceGroup: 'preventive',
              date: dateStr,
              notes: 'Troca de óleo sintético 5W30 e filtro de óleo',
              odometer: '50200',
              status: 'paid'
            });
          } else if (day === 15) {
            allExpenses.push({
              id: getNextId(),
              amount: '120,00',
              category: 'maintenance',
              subCategory: 'alignment',
              maintenanceType: 'Alinhamento e Balanceamento',
              maintenanceGroup: 'preventive',
              date: dateStr,
              notes: 'Alinhamento 3D e balanceamento das 4 rodas',
              odometer: '50600',
              status: 'paid'
            });
          }
        } else if (m.month === 3) {
          // April 2026
          if (day === 12) {
            allExpenses.push({
              id: getNextId(),
              amount: '450,00',
              category: 'maintenance',
              subCategory: 'revision',
              maintenanceType: 'Revisão Geral e Check-up',
              maintenanceGroup: 'preventive',
              date: dateStr,
              notes: 'Revisão periódica recomendada da suspensão e motor',
              odometer: '53500',
              status: 'paid'
            });
          }
        } else if (m.month === 4) {
          // May 2026
          if (day === 10) {
            allExpenses.push({
              id: getNextId(),
              amount: '380,00',
              category: 'maintenance',
              subCategory: 'oilChange',
              maintenanceType: 'Troca de Óleo e Filtro',
              maintenanceGroup: 'preventive',
              date: dateStr,
              notes: 'Troca periódica de óleo de motor e filtro de óleo',
              odometer: '58500',
              status: 'paid'
            });
          } else if (day === 15) {
            allExpenses.push({
              id: getNextId(),
              amount: '300,00',
              category: 'maintenance',
              subCategory: 'brakePad',
              maintenanceType: 'Troca de Pastilhas de Freio',
              maintenanceGroup: 'preventive',
              date: dateStr,
              notes: 'Substituição das pastilhas de freio traseiras',
              odometer: '59000',
              status: 'paid'
            });
          } else if (day === 20) {
            allExpenses.push({
              id: getNextId(),
              amount: '130,00',
              category: 'maintenance',
              subCategory: 'alignment',
              maintenanceType: 'Alinhamento e Balanceamento',
              maintenanceGroup: 'preventive',
              date: dateStr,
              notes: 'Alinhamento e balanceamento preventivo',
              odometer: '60100',
              status: 'paid'
            });
          }
        }

        // 4. Random expenses (Parking, Toll)
        if (day % 7 === 0) {
          allExpenses.push({
            id: getNextId(),
            amount: (15 + Math.random() * 20).toFixed(2).replace('.', ','),
            category: 'parking',
            date: dateStr,
            notes: 'Estacionamento Shopping',
            status: 'paid'
          });
        }
        if (day % 10 === 0 || (m.month === 4 && day === 15)) {
          allExpenses.push({
            id: getNextId(),
            amount: (8 + Math.random() * 12).toFixed(2).replace('.', ','),
            category: 'toll',
            date: dateStr,
            notes: 'Pedágio Rodovia',
            status: 'paid'
          });
        }
      }
    });

    // Rent
    const rentTemplate: Omit<ExpenseRecord, 'id'> = {
      amount: '1500,00',
      category: 'rent',
      date: '2026-03-01',
      status: 'paid',
      notes: 'Aluguel Mensal do Carro'
    };
    allExpenses.push({ ...rentTemplate, id: getNextId() });
    // Instances for April and May
    allExpenses.push({ ...rentTemplate, id: getNextId(), date: '2026-04-01' });
    allExpenses.push({ ...rentTemplate, id: getNextId(), date: '2026-05-01' });

    // Internet
    const internetTemplate: Omit<ExpenseRecord, 'id'> = {
      amount: '120,00',
      category: 'internet',
      date: '2026-03-10',
      status: 'paid',
      notes: 'Plano de Dados'
    };
    allExpenses.push({ ...internetTemplate, id: getNextId() });
    // Instances for April and May
    allExpenses.push({ ...internetTemplate, id: getNextId(), date: '2026-04-10' });
    allExpenses.push({ ...internetTemplate, id: getNextId(), date: '2026-05-10' });

    // Wash (Weekly)
    const washTemplate: Omit<ExpenseRecord, 'id'> = {
      amount: '60,00',
      category: 'washing',
      date: '2026-03-02',
      status: 'paid',
      notes: 'Lavagem Semanal'
    };
    allExpenses.push({ ...washTemplate, id: getNextId() });
    // Instances for March, April and May
    const washDates = [
      '2026-03-09', '2026-03-16', '2026-03-23', '2026-03-30',
      '2026-04-06', '2026-04-13', '2026-04-20', '2026-04-27',
      '2026-05-04', '2026-05-11', '2026-05-18'
    ];
    washDates.forEach(d => {
      allExpenses.push({ ...washTemplate, id: getNextId(), date: d });
    });

    // Fixed Income Template (For Planejamentos Financeiros Config list)
    allIncomes.push({
      id: getNextId(),
      date: '2026-03-01',
      totalAmount: 1200,
      totalTrips: 0,
      hoursWorked: '00:00',
      kmDriven: 0,
      type: 'fixed',
      isFixedConfig: true,
      notes: 'Contrato Fixo Mensal (Empresa X)',
      recurrence: 'monthly',
      items: [
        {
          id: getNextId(),
          platform: 'other',
          amount: '1200,00',
          trips: '0'
        }
      ],
      status: 'paid'
    });

    // Real instances of this fixed income in Mar, Apr, May
    const fixedIncomeDates = ['2026-03-01', '2026-04-01', '2026-05-01'];
    fixedIncomeDates.forEach(date => {
      allIncomes.push({
        id: getNextId(),
        date,
        totalAmount: 1200,
        totalTrips: 0,
        hoursWorked: '00:00',
        kmDriven: 0,
        type: 'fixed',
        isFixedConfig: false,
        notes: 'Recebimento de Contrato Fixo',
        items: [
          {
            id: getNextId(),
            platform: 'other',
            amount: '1200,00',
            trips: '0'
          }
        ],
        status: 'paid'
      });
    });

    // Fixed Expense Templates (For planejado configs)
    allExpenses.push({
      id: getNextId(),
      amount: '1500,00',
      category: 'rent',
      date: '2026-03-01',
      status: 'paid',
      notes: 'Aluguel Mensal do Veículo',
      costType: 'fixed',
      isFixedConfig: true,
      recurrence: 'monthly'
    });

    allExpenses.push({
      id: getNextId(),
      amount: '120,00',
      category: 'internet',
      date: '2026-03-10',
      status: 'paid',
      notes: 'Plano de Dados de Celular',
      costType: 'fixed',
      isFixedConfig: true,
      recurrence: 'monthly'
    });

    // Add activeVehicleId and driverName to all mock entries so they are not filtered out by selected vehicle
    const withVehicleIdIncomes = allIncomes.map(item => ({
      ...item,
      vehicleId: assignedVehicleId,
      driverName: defaultDriverName
    }));
    const withVehicleIdExpenses = allExpenses.map(item => ({
      ...item,
      vehicleId: assignedVehicleId,
      driverName: defaultDriverName
    }));

    // Budget & Goals history simulations (goalHistory) for realistic utilization analysis
    const vId = assignedVehicleId || 'default';
    const mockGoalHistory: GoalHistory = {
      [`${vId}_2026-03`]: {
        id: `${vId}_2026-03`,
        vehicleId: assignedVehicleId,
        month: 2, // March (0-indexed is 2)
        year: 2026,
        monthly: 5500,
        daily: 180,
        weekly: 1300,
        yearly: 66000,
        workHours: 8,
        workDaysPerMonth: 26,
        categoryBudgets: {
          fuel: 1100,
          food: 550,
          maintenance: 600,
          toll: 150,
          parking: 100
        }
      },
      [`${vId}_2026-04`]: {
        id: `${vId}_2026-04`,
        vehicleId: assignedVehicleId,
        month: 3, // April (0-indexed is 3)
        year: 2026,
        monthly: 6000,
        daily: 200,
        weekly: 1400,
        yearly: 72000,
        workHours: 8,
        workDaysPerMonth: 26,
        categoryBudgets: {
          fuel: 1200,
          food: 600,
          maintenance: 500,
          toll: 150,
          parking: 100
        }
      },
      [`${vId}_2026-05`]: {
        id: `${vId}_2026-05`,
        vehicleId: assignedVehicleId,
        month: 4, // May (0-indexed is 4)
        year: 2026,
        monthly: 6500,
        daily: 220,
        weekly: 1500,
        yearly: 78000,
        workHours: 8,
        workDaysPerMonth: 26,
        categoryBudgets: {
          fuel: 1300,
          food: 650,
          maintenance: 500,
          toll: 150,
          parking: 100
        }
      }
    };

    // Update state
    setIncomes(withVehicleIdIncomes);
    setExpenses(withVehicleIdExpenses);
    setGoal({ 
      id: `${vId}_2026-05`, 
      vehicleId: assignedVehicleId, 
      month: 4, 
      year: 2026, 
      monthly: 6500, 
      daily: 220, 
      weekly: 1500, 
      yearly: 78000, 
      workHours: 8, 
      workDaysPerMonth: 26,
      categoryBudgets: {
        fuel: 1300,
        food: 650,
        maintenance: 500,
        toll: 150,
        parking: 100
      }
    });
    setGoalHistory(mockGoalHistory);

    // Persist
    localStorage.setItem('incomes', JSON.stringify(withVehicleIdIncomes));
    localStorage.setItem('expenses', JSON.stringify(withVehicleIdExpenses));
    localStorage.setItem('goal', JSON.stringify({ 
      id: `${vId}_2026-05`, 
      vehicleId: assignedVehicleId, 
      month: 4, 
      year: 2026, 
      monthly: 6500, 
      daily: 220, 
      weekly: 1500, 
      yearly: 78000, 
      workHours: 8, 
      workDaysPerMonth: 26,
      categoryBudgets: {
        fuel: 1300,
        food: 650,
        maintenance: 500,
        toll: 150,
        parking: 100
      }
    }));
    localStorage.setItem('goalHistory', JSON.stringify(mockGoalHistory));

    console.log('Mock data loaded for March, April and May 2026 with vehicle:', assignedVehicleId);
    setCurrentScreen('dashboard');
  };

  const handleSmartImport = (transactions: any[]) => {
    transactions.forEach(tx => {
      if (tx.type === 'income') {
        addIncome({
          id: Date.now() + Math.random(),
          date: tx.date || getLocalDateString(new Date()),
          items: [{
            id: Date.now() + Math.random(),
            platform: tx.categoryOrPlatform || 'other',
            amount: tx.amount.toString(),
            trips: (tx.trips || 0).toString()
          }],
          totalAmount: tx.amount,
          totalTrips: tx.trips || 0,
          hoursWorked: '00:00',
          kmDriven: 0,
          notes: tx.description || 'Importado via IA',
          status: 'paid'
        });
      } else {
        addExpense({
          id: Date.now() + Math.random(),
          amount: tx.amount.toString().replace('.', ','),
          category: tx.categoryOrPlatform?.toLowerCase() || 'other',
          date: tx.date || getLocalDateString(new Date()),
          notes: tx.description || 'Importado via IA',
          status: 'paid'
        });
      }
    });
    setCurrentScreen('reports');
  };

  const filteredIncomes = React.useMemo(() => {
    const active = activeVehicleId ? incomes.filter(i => i.vehicleId === activeVehicleId) : incomes;
    return active.filter(i => i.isFixedConfig !== true);
  }, [incomes, activeVehicleId]);

  const filteredExpenses = React.useMemo(() => {
    const active = activeVehicleId ? expenses.filter(e => e.vehicleId === activeVehicleId) : expenses;
    return active.filter(e => e.isFixedConfig !== true);
  }, [expenses, activeVehicleId]);

  const fuelPerformance = React.useMemo(() => {
    return calculateFuelPerformance(filteredExpenses, 'pt-BR'); // or language context if available here, but App uses pt-BR defaults
  }, [filteredExpenses]);

  const renderScreen = () => {
    if (!isAuthenticated) {
      if (currentScreen === 'signup') {
        return <SignupScreen onSignup={handleSignup} onNavigate={setCurrentScreen} externalError={loginError} isLoading={isSigningUp} />;
      }
      return <LoginScreen onLogin={handleLogin} onNavigate={setCurrentScreen} externalError={loginError} isLoading={isLoggingIn} />;
    }

    switch (currentScreen) {
      case 'dashboard':
        return <DashboardScreen 
          incomes={filteredIncomes} 
          expenses={filteredExpenses} 
          onNavigate={navigateTo} 
          goal={getGoalForPeriod()} 
          onSaveGoal={updateGoalForPeriod}
          onActiveVehicleChange={setActiveVehicleId}
          userProfile={userProfile!}
          activeVehicleId={activeVehicleId}
          isPrivacyActive={isPrivacyActive}
          onPrivacyToggle={() => setIsPrivacyActive(!isPrivacyActive)}
          onDeleteExpense={deleteExpense}
          onUpdateProfile={handleUpdateProfile}
          filter={dashboardFilter}
          onFilterChange={setDashboardFilter}
          selectedDate={dashboardSelectedDate}
          onSelectedDateChange={setDashboardSelectedDate}
          selectedYear={dashboardSelectedYear}
          onSelectedYearChange={setDashboardSelectedYear}
          selectedMonth={dashboardSelectedMonth}
          onSelectedMonthChange={setDashboardSelectedMonth}
          selectedWeek={dashboardSelectedWeek}
          onSelectedWeekChange={setDashboardSelectedWeek}
        />;
      case 'reports':
        return <ReportsScreen 
          incomes={filteredIncomes} 
          expenses={filteredExpenses} 
          onNavigate={navigateTo} 
          onDeleteIncome={deleteIncome} 
          onDeleteExpense={deleteExpense} 
          categories={categories} 
          platforms={platforms} 
          onSmartImport={handleSmartImport} 
          userProfile={userProfile}
          startDate={reportsStartDate}
          onStartDateChange={setReportsStartDate}
          endDate={reportsEndDate}
          onEndDateChange={setReportsEndDate}
          activeVehicleId={activeVehicleId}
          onActiveVehicleChange={setActiveVehicleId}
        />;
      case 'add':
        return <AddSelectionScreen onNavigate={navigateTo} onSmartImport={handleSmartImport} />;
      case 'add-income':
        return <AddIncomeScreen key={initialData?.id || 'new-income'} onConfirm={addIncome} onNavigate={navigateTo} incomes={filteredIncomes} onDeleteIncome={deleteIncome} platforms={platforms} initialData={initialData} userProfile={userProfile!} />;
      case 'add-expense':
        return <AddExpenseScreen 
          key={initialData?.id || 'new-expense'} 
          onConfirm={addExpense} 
          onNavigate={navigateTo} 
          expenses={filteredExpenses} 
          onDeleteExpense={deleteExpense} 
          categories={categories} 
          onSaveCategories={setCategories}
          userProfile={userProfile!}
          goalHistory={goalHistory}
          onSaveProfile={handleUpdateProfile}
          initialData={initialData} 
          activeVehicleId={activeVehicleId}
        />;
      case 'calculator':
        return <CalculatorScreen 
          onNavigate={navigateTo} 
          fuelPerformance={fuelPerformance} 
          expenses={filteredExpenses} 
          userProfile={userProfile!}
          activeVehicleId={activeVehicleId}
          onActiveVehicleChange={setActiveVehicleId}
        />;
      case 'my-vehicles':
        return <MyVehiclesScreen 
          userProfile={userProfile!} 
          onSaveProfile={handleUpdateProfile}
          activeVehicleId={activeVehicleId}
          onActiveVehicleChange={setActiveVehicleId}
        />;
      case 'fixed-finance':
        return <FixedFinanceScreen 
          expenses={expenses}
          incomes={incomes}
          onConfirmExpense={addExpense}
          onConfirmIncome={addIncome}
          onDeleteExpense={deleteExpense}
          onDeleteIncome={deleteIncome}
          categories={CATEGORIES}
          userProfile={userProfile!}
          activeVehicleId={activeVehicleId}
          onActiveVehicleChange={setActiveVehicleId}
        />;
      case 'help':
        return <HelpScreen />;
      case 'settings':
        return <SettingsScreen 
          goal={getGoalForPeriod()} 
          onSaveGoal={updateGoalForPeriod} 
          goalHistory={goalHistory}
          onDeleteGoalHistory={(id) => {
            setGoalHistory(prev => {
              const next = { ...prev };
              delete next[id];
              return next;
            });
          }}
          userProfile={userProfile!} 
          onSaveProfile={handleUpdateProfile} 
          categories={categories}
          onSaveCategories={(updated) => {
            setCategories(updated);
          }}
          platforms={platforms}
          onSavePlatforms={(updated) => {
            setPlatforms(updated);
          }}
          expenses={filteredExpenses}
          filter={dashboardFilter}
          selectedDate={dashboardSelectedDate}
          selectedYear={dashboardSelectedYear}
          selectedMonth={dashboardSelectedMonth}
          selectedWeek={dashboardSelectedWeek}
          activeVehicleId={activeVehicleId}
          onActiveVehicleChange={setActiveVehicleId}
          onLoadMockData={loadMockData}
          onClearAllData={clearAllData}
        />;
      default:
        return <DashboardScreen 
          incomes={filteredIncomes} 
          expenses={filteredExpenses} 
          onNavigate={navigateTo} 
          goal={getGoalForPeriod()} 
          onSaveGoal={updateGoalForPeriod}
          onActiveVehicleChange={setActiveVehicleId}
          userProfile={userProfile!}
          isPrivacyActive={isPrivacyActive}
          onPrivacyToggle={() => setIsPrivacyActive(!isPrivacyActive)}
          onDeleteExpense={deleteExpense}
          onUpdateProfile={handleUpdateProfile}
          filter={dashboardFilter}
          onFilterChange={setDashboardFilter}
          selectedDate={dashboardSelectedDate}
          onSelectedDateChange={setDashboardSelectedDate}
          selectedYear={dashboardSelectedYear}
          onSelectedYearChange={setDashboardSelectedYear}
          selectedMonth={dashboardSelectedMonth}
          onSelectedMonthChange={setDashboardSelectedMonth}
          selectedWeek={dashboardSelectedWeek}
          onSelectedWeekChange={setDashboardSelectedWeek}
        />;
    }
  };

    if (isAuthenticated && !userProfile) {
      return (
        <div className="min-h-screen bg-surface flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-on-surface-variant font-bold animate-pulse">Carregando seus dados...</p>
          </div>
        </div>
      );
    }

    return (
      <>
        {isAdminMode ? (
          <AdminScreen onNavigate={() => window.location.href = '/'} />
        ) : isAuthenticated ? (
          <Layout 
            currentScreen={currentScreen} 
            onNavigate={navigateTo} 
            onLogout={handleLogout}
            userProfile={userProfile}
            activeVehicleId={activeVehicleId}
            onActiveVehicleChange={setActiveVehicleId}
            onInstallPwa={isStandalone ? undefined : () => setIsInstallModalOpen(true)}
          >
            {renderScreen()}
          </Layout>
        ) : (
          <div className="relative min-h-screen">
            {renderScreen()}
            {/* Elegant tiny floating install-app trigger on login/signup view, hidden if already installed */}
            {!isStandalone && (
              <div className="fixed bottom-6 right-6 z-50">
                <button
                  onClick={() => setIsInstallModalOpen(true)}
                  className="flex items-center gap-2 px-4 py-3 bg-slate-900 border border-slate-800 hover:bg-slate-850 text-emerald-400 font-black text-xs uppercase tracking-wider rounded-2xl shadow-xl transition-all active:scale-95 hover:scale-105"
                  title="Instalar Aplicativo"
                >
                  <Smartphone size={16} />
                  <span>Instalar Aplicativo 📲</span>
                </button>
              </div>
            )}
          </div>
        )}

        <PwaInstallModal
          isOpen={isInstallModalOpen}
          onClose={() => setIsInstallModalOpen(false)}
          deferredPrompt={deferredPrompt}
          onTriggerInstall={handleTriggerInstall}
        />
      </>
    );
}

export default function App() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <AppContent />
      </LanguageProvider>
    </ThemeProvider>
  );
}
