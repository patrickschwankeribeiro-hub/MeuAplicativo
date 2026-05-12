/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Layout } from './components/Layout';
import { DashboardScreen } from './components/DashboardScreen';
import { AddSelectionScreen } from './components/AddSelectionScreen';
import { AddIncomeScreen } from './components/AddIncomeScreen';
import { AddExpenseScreen } from './components/AddExpenseScreen';
import { ReportsScreen } from './components/ReportsScreen';
import { SettingsScreen } from './components/SettingsScreen';
import { CalculatorScreen } from './components/CalculatorScreen';
import { RemindersScreen } from './components/RemindersScreen';
import { AdminScreen } from './components/AdminScreen';
import { LoginScreen } from './components/LoginScreen';
import { SignupScreen } from './components/SignupScreen';
import { Screen, IncomeRecord, ExpenseRecord, Goal, UserProfile, GoalHistory, Category, Platform, CATEGORIES, PLATFORMS, TransactionFrequency, TransactionStatus } from './types';
import { parseLocaleNumber } from './lib/currency';
import { calculateFuelPerformance } from './lib/fuel';
import { getLocalDateString, getNextDate } from './lib/utils';
import { LanguageProvider, useLanguage } from './contexts/LanguageContext';
import { ThemeProvider } from './contexts/ThemeContext';

function AppContent() {
  const { t } = useLanguage();
  // One-time data reset logic
  useState(() => {
    const resetFlag = localStorage.getItem('dataReset_v30');
    if (!resetFlag) {
      localStorage.removeItem('incomes');
      localStorage.removeItem('expenses');
      localStorage.removeItem('goal');
      localStorage.removeItem('userProfile');
      localStorage.removeItem('reminders');
      localStorage.removeItem('categories');
      localStorage.removeItem('platforms');
      localStorage.removeItem('isAuthenticated');
      localStorage.setItem('dataReset_v30', 'true');
    }
  });

  const [loginError, setLoginError] = useState('');
  const [currentScreen, setCurrentScreen] = useState<Screen>(() => {
    return (localStorage.getItem('isAuthenticated') === 'true') ? 'dashboard' : 'login';
  });
  const [initialData, setInitialData] = useState<any>(null);
  const [isPrivacyActive, setIsPrivacyActive] = useState(false);
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
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    d.setDate(1);
    return getLocalDateString(d);
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
    return saved ? JSON.parse(saved) : [];
  });
  const [expenses, setExpenses] = useState<ExpenseRecord[]>(() => {
    const saved = localStorage.getItem('expenses');
    return saved ? JSON.parse(saved) : [];
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
              subcategories: defaultCat.subcategories || cat.subcategories
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
    
    const merged = loadedPlatforms
      .filter(p => !p.isDefault || systemIds.has(p.id))
      .map(p => {
        if (p.isDefault) {
          const defaultPlat = PLATFORMS.find(dp => dp.id === p.id);
          if (defaultPlat) {
            return {
              ...p,
              name: defaultPlat.name,
              icon: defaultPlat.icon,
              color: defaultPlat.color,
              type: defaultPlat.type
            };
          }
        }
        return p;
      });
      
    const existingIds = new Set(merged.map(p => p.id));
    PLATFORMS.forEach(p => {
      if (!existingIds.has(p.id)) {
        merged.push(p);
      }
    });

    return merged;
  });
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return localStorage.getItem('isAuthenticated') === 'true';
  });
  const [isSigningUp, setIsSigningUp] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Persistence
  useEffect(() => {
    localStorage.setItem('userProfile', JSON.stringify(userProfile));
  }, [userProfile]);

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

  const handleUpdateProfile = (newProfile: UserProfile) => {
    setUserProfile(newProfile);
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
          vehicle: {
            plate: 'ABC-1234',
            tankCapacity: '50',
            currentOdometer: 10000,
            type: 'car'
          }
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
      id: 'id' in record ? record.id : Date.now()
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
  };

  const addExpense = (record: ExpenseRecord | Omit<ExpenseRecord, 'id'>) => {
    const newRecord = {
      ...record,
      id: 'id' in record ? record.id : Date.now()
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
    if ('odometer' in record && record.odometer && userProfile?.vehicle) {
      const newOdo = Number(record.odometer.replace(',', '.'));
      if (!isNaN(newOdo) && newOdo > (userProfile.vehicle.currentOdometer || 0)) {
        setUserProfile({
          ...userProfile,
          vehicle: {
            ...userProfile.vehicle,
            currentOdometer: newOdo
          }
        });
      }
    }
  };

  const getGoalForPeriod = useCallback(() => {
    // Clean empty goal template
    const noGoal: Goal = { 
      id: 'none', 
      monthly: 0, 
      weekly: 0, 
      daily: 0, 
      yearly: 0,
      workHours: goal?.workHours || 8,
      workDaysPerMonth: goal?.workDaysPerMonth || 26,
      year: dashboardSelectedYear,
      month: dashboardSelectedMonth
    };

    if (dashboardFilter === 'year') {
      const yearGoals = Object.values(goalHistory as Record<string, Goal>).filter(g => g && g.year === dashboardSelectedYear);
      
      if (yearGoals.length > 0) {
        const totalYearly = yearGoals.reduce((sum, g) => sum + (g.monthly || 0), 0);
        const baseGoal = yearGoals[yearGoals.length - 1] || goal;
        return {
          ...baseGoal,
          id: `${dashboardSelectedYear}`,
          year: dashboardSelectedYear,
          yearly: totalYearly,
        } as Goal;
      }
      // If no history for the year, return a goal with all values as 0 to indicate no goal
      return noGoal;
    }

    let searchKey = '';
    if (dashboardFilter === 'month') {
      searchKey = `${dashboardSelectedYear}-${String(dashboardSelectedMonth + 1).padStart(2, '0')}`;
    } else if (dashboardFilter === 'day') {
      searchKey = dashboardSelectedDate;
    } else if (dashboardFilter === 'week') {
      const monthFromWeek = getMonthFromWeek(dashboardSelectedYear, dashboardSelectedWeek);
      searchKey = `${dashboardSelectedYear}-${String(monthFromWeek + 1).padStart(2, '0')}`;
    }

    if (goalHistory[searchKey]) {
      return goalHistory[searchKey];
    }

    // Fallback: If no specific goal for day or week, try to fetch the goal for the parent month
    if (dashboardFilter === 'day') {
      const monthKey = dashboardSelectedDate.substring(0, 7); // Extracts "YYYY-MM"
      if (goalHistory[monthKey]) return goalHistory[monthKey];
    } else if (dashboardFilter === 'week') {
      const monthFromWeek = getMonthFromWeek(dashboardSelectedYear, dashboardSelectedWeek);
      const monthKey = `${dashboardSelectedYear}-${String(monthFromWeek + 1).padStart(2, '0')}`;
      if (goalHistory[monthKey]) return goalHistory[monthKey];
    }

    return noGoal;
  }, [goal, goalHistory, dashboardFilter, dashboardSelectedYear, dashboardSelectedMonth, dashboardSelectedDate, dashboardSelectedWeek]);

  const updateGoalForPeriod = (newGoal: Goal) => {
    let key = newGoal.id;
    
    // If it's a legacy or automatic call without an ID, fallback to dashboard filter logic
    if (!key || key === 'default') {
      if (dashboardFilter === 'year') {
        key = `${dashboardSelectedYear}`;
      } else if (dashboardFilter === 'month') {
        key = `${dashboardSelectedYear}-${String(dashboardSelectedMonth + 1).padStart(2, '0')}`;
      } else if (dashboardFilter === 'day') {
        key = dashboardSelectedDate;
      } else if (dashboardFilter === 'week') {
        key = `${dashboardSelectedYear}-W${String(dashboardSelectedWeek).padStart(2, '0')}`;
      }
    }

    setGoalHistory(prev => ({
      ...prev,
      [key]: { ...newGoal, id: key }
    }));
    
    // Also update current/default to reflect newest setting
    setGoal(newGoal);
    localStorage.setItem('goal', JSON.stringify(newGoal));
  };

  const syncRecurringTransactions = React.useCallback(() => {
    const now = new Date();
    const todayStr = getLocalDateString(now);

    let totalNewExpenses: ExpenseRecord[] = [];
    let categoriesChanged = false;
    let platformsChanged = false;

    // Process regular categories
    const updatedCategories = categories.map(cat => {
      if (cat.costType === 'fixed' && cat.defaultAmount && cat.initialDate && cat.frequency && cat.frequency !== 'none') {
        let lastDate = cat.lastProcessedDate || cat.initialDate;
        
        if (!cat.lastProcessedDate && cat.initialDate > todayStr) {
          return cat;
        }

        let currentDate = lastDate;
        let dateAdvanced = false;
        const catNewExpenses: ExpenseRecord[] = [];

        while (currentDate <= todayStr) {
          const alreadyExists = expenses.some(e => e.category === cat.id && e.date === currentDate) ||
                              totalNewExpenses.some(e => e.category === cat.id && e.date === currentDate);
          
          if (!alreadyExists) {
            const name = (cat.isDefault ? t(cat.id) : cat.name);
            catNewExpenses.push({
              id: Date.now() + Math.floor(Math.random() * 1000) + totalNewExpenses.length + catNewExpenses.length,
              amount: cat.defaultAmount.toFixed(2).replace('.', ','),
              category: cat.id,
              date: currentDate,
              notes: cat.defaultNotes || name,
              status: 'paid',
              costType: 'fixed',
              isRecurring: true,
              isAutoGenerated: true
            });
          }

          const next = getNextDate(currentDate, cat.frequency);
          if (next === currentDate) break;
          currentDate = next;
          dateAdvanced = true;
        }

        if (dateAdvanced || catNewExpenses.length > 0) {
          totalNewExpenses = [...totalNewExpenses, ...catNewExpenses];
          categoriesChanged = true;
          return { ...cat, lastProcessedDate: currentDate };
        }
      }
      return cat;
    });

    // Same for platforms (if they have fixed costs)
    const updatedPlatforms = platforms.map(plat => {
      if (plat.type === 'fixed' && plat.defaultAmount && plat.initialDate && plat.frequency && plat.frequency !== 'none') {
        let lastDate = plat.lastProcessedDate || plat.initialDate;
        
        if (!plat.lastProcessedDate && plat.initialDate > todayStr) {
          return plat;
        }

        let currentDate = lastDate;
        let dateAdvanced = false;
        const platNewExpenses: ExpenseRecord[] = [];

        while (currentDate <= todayStr) {
          const alreadyExists = expenses.some(e => e.platform === plat.id && e.date === currentDate) ||
                              totalNewExpenses.some(e => e.platform === plat.id && e.date === currentDate);
          
          if (!alreadyExists) {
            const name = (plat.isDefault ? t(plat.id) : plat.name);
            platNewExpenses.push({
              id: Date.now() + Math.floor(Math.random() * 2000) + totalNewExpenses.length + platNewExpenses.length,
              amount: plat.defaultAmount.toFixed(2).replace('.', ','),
              category: 'other',
              platform: plat.id,
              date: currentDate,
              notes: plat.defaultNotes || name,
              status: 'paid',
              costType: 'fixed',
              isRecurring: true,
              isAutoGenerated: true
            });
          }

          const next = getNextDate(currentDate, plat.frequency);
          if (next === currentDate) break;
          currentDate = next;
          dateAdvanced = true;
        }

        if (dateAdvanced || platNewExpenses.length > 0) {
          totalNewExpenses = [...totalNewExpenses, ...platNewExpenses];
          platformsChanged = true;
          return { ...plat, lastProcessedDate: currentDate };
        }
      }
      return plat;
    });

    if (totalNewExpenses.length > 0) {
      setExpenses(prev => [...totalNewExpenses, ...prev]);
    }
    if (categoriesChanged) {
      setCategories(updatedCategories);
    }
    if (platformsChanged) {
      setPlatforms(updatedPlatforms);
    }
  }, [expenses, categories, platforms, t]);

  React.useEffect(() => {
    if (isAuthenticated) {
      syncRecurringTransactions();
    }
  }, [isAuthenticated, syncRecurringTransactions]);

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
    localStorage.removeItem('incomes');
    localStorage.removeItem('expenses');
    localStorage.removeItem('goal');
  };

  const loadMockData = () => {
    console.log('Loading mock data...');
    
    const allIncomes: IncomeRecord[] = [];
    const allExpenses: ExpenseRecord[] = [];
    
    // Helper to generate IDs
    let nextId = 100000;
    const getNextId = () => nextId++;

    // Base odometer
    let currentOdometer = 50000;

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
        // Daily driving income
        let dailyIncomeAmount = 300 + Math.random() * 300;
        
        // Add more variety to April and May for better performance chart visualization
        if (m.month === 3 || m.month === 4) {
          const dayMod = day % 7;
          if (dayMod === 0) { // Sundays: Low income
            dailyIncomeAmount = 100 + Math.random() * 100;
          } else if (dayMod === 5 || dayMod === 6) { // Fri/Sat: High income
            dailyIncomeAmount = 600 + Math.random() * 400;
          } else {
            dailyIncomeAmount = 250 + Math.random() * 350;
          }
          
          // Random "bad luck" days (High expense, low income)
          if (day === 10 || day === 22) {
            dailyIncomeAmount = 150;
          }
        }

        const trips = Math.floor(dailyIncomeAmount / 25) + 2;
        const km = Math.floor((dailyIncomeAmount / 2.5) * (0.8 + Math.random() * 0.4));
        currentOdometer += km;

        allIncomes.push({
          id: getNextId(),
          date: dateStr,
          totalAmount: parseFloat(dailyIncomeAmount.toFixed(2)),
          totalTrips: trips,
          hoursWorked: '09:00',
          kmDriven: km,
          notes: `Ganhos do dia - ${m.name}`,
          items: [
            { 
              id: getNextId(), 
              platform: day % 2 === 0 ? 'uberx' : '99pop', 
              amount: dailyIncomeAmount.toFixed(2), 
              trips: trips.toString() 
            }
          ],
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

        // 2. Fuel Logic (Redesigned for realistic cycles)
        if (m.month === 2) {
          // March: Gasoline Only 
          // 05 (Full) -> 12 (Partial) -> 20 (Full) -> 26 (Full)
          if ([5, 12, 20, 26].includes(day)) {
            let liters = '45,0';
            const isFull = day !== 12;
            const notes = isFull ? 'Abastecimento Cheio' : 'Abastecimento Parcial';
            
            currentOdometer += (day === 5 ? 0 : (day === 12 ? 200 : (day === 20 ? 300 : 450)));

            allExpenses.push({
              id: getNextId(),
              amount: (parseLocaleNumber(liters, 'pt-BR') * 5.50).toFixed(2).replace('.', ','),
              category: 'fuel',
              fuelType: 'gasolineCommon',
              date: dateStr,
              liters: liters,
              pricePerLiter: '5,50',
              odometer: currentOdometer.toString(),
              isFullTank: isFull,
              notes: notes,
              status: 'paid'
            });
          } else {
             currentOdometer += 20;
          }
        } else if (m.month === 3) {
          // April: Ethanol Only
          // 05 (Full) -> 10 (Full) -> 15 (Partial) -> 25 (Full)
          if ([5, 10, 15, 25].includes(day)) {
            let liters = '35,0';
            const isFull = day !== 15;
            const notes = isFull ? 'Cheio Etanol' : 'Parcial Etanol';
            
            currentOdometer += (day === 5 ? 0 : (day === 10 ? 350 : (day === 15 ? 180 : 320)));

            allExpenses.push({
              id: getNextId(),
              amount: (35 * 3.80).toFixed(2).replace('.', ','),
              category: 'fuel',
              fuelType: 'ethanol',
              date: dateStr,
              liters: liters,
              pricePerLiter: '3,80',
              odometer: currentOdometer.toString(),
              isFullTank: isFull,
              notes: notes,
              status: 'paid'
            });
          } else {
             currentOdometer += 30;
          }
        } else if (m.month === 4) {
          // May: Gasoline + Ethanol Mix (Frequent refills)
          const fuelDays = [2, 6, 10, 14, 18, 22, 26, 30];
          if (fuelDays.includes(day)) {
            const isGas = day <= 15;
            // Liter variations to affect KM/L
            const litersVal = isGas ? (32 + Math.random() * 8) : (35 + Math.random() * 10);
            const liters = litersVal.toFixed(1).replace('.', ',');
            const price = isGas ? 5.65 : 3.85;
            const isFull = true;
            
            // Varied mileage increments between refills
            const kmSinceLastRefill = isGas ? (380 + Math.random() * 120) : (280 + Math.random() * 80);
            currentOdometer += Math.floor(kmSinceLastRefill);

            allExpenses.push({
              id: getNextId(),
              amount: (litersVal * price).toFixed(2).replace('.', ','),
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
          } else {
            currentOdometer += 30 + Math.floor(Math.random() * 20);
          }
        }

        // 3. Maintenance (Once per month)
        if (day === 15) {
          allExpenses.push({
            id: getNextId(),
            amount: m.month === 2 ? '450,00' : '120,00',
            category: 'maintenance',
            maintenanceType: m.month === 2 ? 'Troca de Óleo e Filtros' : 'Alinhamento e Balanceamento',
            maintenanceGroup: 'preventive',
            date: dateStr,
            notes: `Manutenção preventiva ${m.name}`,
            status: 'paid'
          });
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
        
        // Random "surprise" expenses in April/May
        if ((m.month === 3 || m.month === 4) && (day === 8 || day === 25)) {
          allExpenses.push({
            id: getNextId(),
            amount: (100 + Math.random() * 150).toFixed(2).replace('.', ','),
            category: 'maintenance',
            date: dateStr,
            notes: 'Manutenção Imprevista',
            status: 'paid'
          });
        }
      }
    });

    // --- RECURRING TEMPLATES ---
    // Rent
    const rentTemplate: ExpenseRecord = {
      id: getNextId(),
      amount: '1500,00',
      category: 'rent',
      date: '2026-03-01',
      initialDate: '2026-03-01',
      frequency: 'monthly',
      status: 'paid',
      isRecurring: true,
      notes: 'Aluguel Mensal do Carro'
    };
    allExpenses.push(rentTemplate);
    // Instances for April and May
    allExpenses.push({ ...rentTemplate, id: getNextId(), date: '2026-04-01', isRecurring: false, parentId: rentTemplate.id });
    allExpenses.push({ ...rentTemplate, id: getNextId(), date: '2026-05-01', isRecurring: false, parentId: rentTemplate.id });

    // Internet
    const internetTemplate: ExpenseRecord = {
      id: getNextId(),
      amount: '120,00',
      category: 'internet',
      date: '2026-03-10',
      initialDate: '2026-03-10',
      frequency: 'monthly',
      status: 'paid',
      isRecurring: true,
      notes: 'Plano de Dados'
    };
    allExpenses.push(internetTemplate);
    // Instances for April and May
    allExpenses.push({ ...internetTemplate, id: getNextId(), date: '2026-04-10', isRecurring: false, parentId: internetTemplate.id });
    allExpenses.push({ ...internetTemplate, id: getNextId(), date: '2026-05-10', isRecurring: false, parentId: internetTemplate.id });

    // Wash (Weekly)
    const washTemplate: ExpenseRecord = {
      id: getNextId(),
      amount: '60,00',
      category: 'maintenance',
      subCategory: 'Lavagem',
      date: '2026-03-02',
      initialDate: '2026-03-02',
      frequency: 'weekly',
      status: 'paid',
      isRecurring: true,
      notes: 'Lavagem Semanal'
    };
    allExpenses.push(washTemplate);
    // Instances for March, April and May
    const washDates = [
      '2026-03-09', '2026-03-16', '2026-03-23', '2026-03-30',
      '2026-04-06', '2026-04-13', '2026-04-20', '2026-04-27',
      '2026-05-04', '2026-05-11', '2026-05-18'
    ];
    washDates.forEach(d => {
      allExpenses.push({ ...washTemplate, id: getNextId(), date: d, isRecurring: false, parentId: washTemplate.id });
    });

    // Update state
    setIncomes(allIncomes);
    setExpenses(allExpenses);
    setGoal({ monthly: 6000, daily: 200, weekly: 1400, yearly: 72000 });

    // Persist
    localStorage.setItem('incomes', JSON.stringify(allIncomes));
    localStorage.setItem('expenses', JSON.stringify(allExpenses));
    localStorage.setItem('goal', JSON.stringify({ monthly: 6000, daily: 200, weekly: 1400, yearly: 72000 }));

    console.log('Mock data loaded for March, April and May 2026.');
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

  const fuelPerformance = React.useMemo(() => {
    return calculateFuelPerformance(expenses, 'pt-BR'); // or language context if available here, but App uses pt-BR defaults
  }, [expenses]);

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
          incomes={incomes} 
          expenses={expenses} 
          onNavigate={navigateTo} 
          goal={getGoalForPeriod()} 
          onSaveGoal={updateGoalForPeriod}
          userProfile={userProfile!}
          isPrivacyActive={isPrivacyActive}
          onPrivacyToggle={() => setIsPrivacyActive(!isPrivacyActive)}
          onConfirmIncome={addIncome}
          onConfirmExpense={addExpense}
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
          incomes={incomes} 
          expenses={expenses} 
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
        />;
      case 'add':
        return <AddSelectionScreen onNavigate={navigateTo} onSmartImport={handleSmartImport} />;
      case 'add-income':
        return <AddIncomeScreen key={initialData?.id || 'new-income'} onConfirm={addIncome} onNavigate={navigateTo} incomes={incomes} onDeleteIncome={deleteIncome} platforms={platforms} initialData={initialData} />;
      case 'add-expense':
        return <AddExpenseScreen 
          key={initialData?.id || 'new-expense'} 
          onConfirm={addExpense} 
          onNavigate={navigateTo} 
          expenses={expenses} 
          onDeleteExpense={deleteExpense} 
          categories={categories} 
          onSaveCategories={setCategories}
          userProfile={userProfile!}
          onSaveProfile={handleUpdateProfile}
          initialData={initialData} 
        />;
      case 'calculator':
        return <CalculatorScreen onNavigate={navigateTo} fuelPerformance={fuelPerformance} expenses={expenses} />;
      case 'reminders':
        return <RemindersScreen 
          userProfile={userProfile!} 
          onSaveProfile={handleUpdateProfile}
          onNavigate={navigateTo}
        />;
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
          expenses={expenses}
          filter={dashboardFilter}
          selectedDate={dashboardSelectedDate}
          selectedYear={dashboardSelectedYear}
          selectedMonth={dashboardSelectedMonth}
          selectedWeek={dashboardSelectedWeek}
        />;
      default:
        return <DashboardScreen 
          incomes={incomes} 
          expenses={expenses} 
          onNavigate={navigateTo} 
          goal={getGoalForPeriod()} 
          onSaveGoal={updateGoalForPeriod}
          userProfile={userProfile!}
          isPrivacyActive={isPrivacyActive}
          onPrivacyToggle={() => setIsPrivacyActive(!isPrivacyActive)}
          onConfirmIncome={addIncome}
          onConfirmExpense={addExpense}
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

    return isAdminMode ? (
      <AdminScreen onNavigate={() => window.location.href = '/'} />
    ) : isAuthenticated ? (
      <Layout currentScreen={currentScreen} onNavigate={navigateTo} onLogout={handleLogout}>
        {renderScreen()}
      </Layout>
    ) : (
      renderScreen()
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
