import React, { useState, useMemo } from 'react';
import { 
  Car, 
  Plus, 
  Trash2, 
  Edit2, 
  Check, 
  Users,
  X,
  AlertCircle,
  Truck,
  Bike,
  Wrench,
  AlertTriangle,
  Settings as SettingsIcon,
  CheckCircle2,
  TrendingDown,
  TrendingUp,
  History,
  ShieldAlert,
  Milestone,
  Fuel,
  Award,
  Sparkles,
  BarChart3,
  Coins
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { UserProfile, Vehicle, Driver, CATEGORIES, MaintenancePlanItem, ExpenseRecord, IncomeRecord } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import { MAINTENANCE_SUBCATEGORIES } from '../constants';
import { formatLocaleCurrency } from '../lib/currency';

interface MyVehiclesScreenProps {
  userProfile: UserProfile;
  onSaveProfile: (profile: UserProfile) => void;
  activeVehicleId?: string | null;
  onActiveVehicleChange?: (id: string | null) => void;
  expenses?: ExpenseRecord[];
  incomes?: IncomeRecord[];
}

export function MyVehiclesScreen({ 
  userProfile, 
  onSaveProfile,
  activeVehicleId,
  onActiveVehicleChange,
  expenses = [],
  incomes = []
}: MyVehiclesScreenProps) {
  const { t, language } = useLanguage();
  const [profileData, setProfileData] = useState<UserProfile>(userProfile);
  const [activeSection, setActiveSection] = useState<'manage' | 'performance'>('manage');
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
  const [editingDriverId, setEditingDriverId] = useState<string | null>(null);
  const [driverForm, setDriverForm] = useState<Partial<Driver>>({
    name: '',
    phone: ''
  });

  const [showSuccess, setShowSuccess] = useState(false);
  const [errorAlert, setErrorAlert] = useState<string | null>(null);

  // Maintenance Plan States
  const [isAddingPlanItem, setIsAddingPlanItem] = useState(false);
  const [planFormName, setPlanFormName] = useState('');
  const [planFormSubcategory, setPlanFormSubcategory] = useState('oilChange');
  const [planFormIntervalKm, setPlanFormIntervalKm] = useState('10000');
  const [planFormLastOdometer, setPlanFormLastOdometer] = useState('');

  const activeVehicle = profileData.vehicles?.find(v => v.id === activeVehicleId);

  const vehicleStats = useMemo(() => {
    const statsMap: Record<string, {
      vehicleId: string;
      brand: string;
      model: string;
      plate: string;
      totalExpenses: number;
      totalFuel: number;
      totalFines: number;
      totalTolls: number;
      totalIncomes: number;
      liters: number;
    }> = {};

    (profileData.vehicles || []).forEach(v => {
      statsMap[v.id] = {
        vehicleId: v.id,
        brand: v.brand || '',
        model: v.model || '',
        plate: v.plate || '',
        totalExpenses: 0,
        totalFuel: 0,
        totalFines: 0,
        totalTolls: 0,
        totalIncomes: 0,
        liters: 0
      };
    });

    const expList = expenses || [];
    expList.forEach(e => {
      if (!e.vehicleId || !statsMap[e.vehicleId]) return;
      const amt = parseFloat(e.amount) || 0;
      statsMap[e.vehicleId].totalExpenses += amt;
      
      if (e.category === 'fuel') {
        statsMap[e.vehicleId].totalFuel += amt;
        const l = parseFloat(e.liters || '') || 0;
        statsMap[e.vehicleId].liters += l;
      } else if (e.category === 'fine') {
        statsMap[e.vehicleId].totalFines += amt;
      } else if (e.category === 'toll') {
        statsMap[e.vehicleId].totalTolls += amt;
      }
    });

    const incList = incomes || [];
    incList.forEach(i => {
      if (!i.vehicleId || !statsMap[i.vehicleId]) return;
      const amt = i.totalAmount || 0;
      statsMap[i.vehicleId].totalIncomes += amt;
    });

    return Object.values(statsMap);
  }, [profileData.vehicles, expenses, incomes]);

  const driverStats = useMemo(() => {
    const statsMap: Record<string, {
      name: string;
      totalExpenses: number;
      totalIncomes: number;
      trips: number;
    }> = {};

    (profileData.drivers || []).forEach(d => {
      statsMap[d.name] = {
        name: d.name,
        totalExpenses: 0,
        totalIncomes: 0,
        trips: 0
      };
    });

    const expList = expenses || [];
    expList.forEach(e => {
      if (!e.driverName) return;
      if (!statsMap[e.driverName]) {
        statsMap[e.driverName] = { name: e.driverName, totalExpenses: 0, totalIncomes: 0, trips: 0 };
      }
      const amt = parseFloat(e.amount) || 0;
      statsMap[e.driverName].totalExpenses += amt;
    });

    const incList = incomes || [];
    incList.forEach(i => {
      if (!i.driverName) return;
      if (!statsMap[i.driverName]) {
        statsMap[i.driverName] = { name: i.driverName, totalExpenses: 0, totalIncomes: 0, trips: 0 };
      }
      const amt = i.totalAmount || 0;
      statsMap[i.driverName].totalIncomes += amt;
      statsMap[i.driverName].trips += i.totalTrips || 0;
    });

    return Object.values(statsMap);
  }, [profileData.drivers, expenses, incomes]);

  const handleSavePlanItem = () => {
    if (!activeVehicleId) return;
    if (!planFormName.trim() || !planFormIntervalKm) {
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

    const newItem: MaintenancePlanItem = {
      id: `plan_${Date.now()}`,
      name: planFormName,
      subcategory: planFormSubcategory,
      intervalKm: intervalVal,
      lastOdometer: lastOdoVal,
      isActive: true
    };

    const updatedVehicles = (profileData.vehicles || []).map(v => {
      if (v.id === activeVehicleId) {
        return {
          ...v,
          maintenancePlan: [...(v.maintenancePlan || []), newItem]
        };
      }
      return v;
    });

    const updatedProfile = { ...profileData, vehicles: updatedVehicles };
    setProfileData(updatedProfile);
    onSaveProfile(updatedProfile);

    // Reset Form
    setPlanFormName('');
    setPlanFormSubcategory('oilChange');
    setPlanFormIntervalKm('10000');
    setPlanFormLastOdometer('');
    setIsAddingPlanItem(false);

    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
  };

  const handleDeletePlanItem = (itemId: string) => {
    if (!activeVehicleId) return;

    const updatedVehicles = (profileData.vehicles || []).map(v => {
      if (v.id === activeVehicleId) {
        return {
          ...v,
          maintenancePlan: (v.maintenancePlan || []).filter(item => item.id !== itemId)
        };
      }
      return v;
    });

    const updatedProfile = { ...profileData, vehicles: updatedVehicles };
    setProfileData(updatedProfile);
    onSaveProfile(updatedProfile);

    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
  };

  const handleSaveVehicle = () => {
    if (
      !vehicleForm.brand?.trim() || 
      !vehicleForm.model?.trim() || 
      !vehicleForm.plate?.trim() || 
      !vehicleForm.year ||
      vehicleForm.currentOdometer === undefined || 
      vehicleForm.currentOdometer === null ||
      isNaN(Number(vehicleForm.currentOdometer))
    ) {
      setErrorAlert(t('fieldsRequired'));
      setTimeout(() => setErrorAlert(null), 3000);
      return;
    }

    const currentVehicles = profileData.vehicles || [];
    const plateExists = currentVehicles.some(v => 
      v.plate.toUpperCase() === vehicleForm.plate?.toUpperCase() && v.id !== editingVehicleId
    );

    if (plateExists) {
      setErrorAlert(t('plateAlreadyExists') || 'Placa já cadastrada');
      setTimeout(() => setErrorAlert(null), 3000);
      return;
    }

    const odoValue = Number(vehicleForm.currentOdometer) || 0;
    const existingVehicle = currentVehicles.find(v => v.id === editingVehicleId);
    let targetInitialOdo = existingVehicle?.initialOdometer ?? odoValue;
    if (existingVehicle && odoValue !== existingVehicle.currentOdometer) {
      targetInitialOdo = odoValue;
    }

    const newVehicle: Vehicle = {
      ...vehicleForm as Vehicle,
      id: editingVehicleId || `veh_${Date.now()}`,
      initialOdometer: targetInitialOdo,
      currentOdometer: odoValue
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
    if (activeVehicleId === id) {
      onActiveVehicleChange?.(updatedVehicles.length > 0 ? updatedVehicles[0].id : null);
    }
  };

  const handleSaveDriver = () => {
    if (!driverForm.name) {
      setErrorAlert(t('fieldsRequired'));
      setTimeout(() => setErrorAlert(null), 3000);
      return;
    }

    const currentDrivers = profileData.drivers || [];
    let updatedDrivers;

    if (editingDriverId) {
      updatedDrivers = currentDrivers.map(d => d.id === editingDriverId ? { ...d, name: driverForm.name!, phone: driverForm.phone! } : d);
    } else {
      const newDriver: Driver = {
        ...driverForm as Driver,
        id: `drv_${Date.now()}`
      };
      updatedDrivers = [...currentDrivers, newDriver];
    }

    const updatedProfile = { ...profileData, drivers: updatedDrivers };
    setProfileData(updatedProfile);
    onSaveProfile(updatedProfile);
    
    if (!editingDriverId && updatedDrivers.length > 0) {
      const lastAdded = updatedDrivers[updatedDrivers.length - 1];
      setVehicleForm(prev => ({ ...prev, driverId: lastAdded.id }));
    }

    setIsAddingDriver(false);
    setEditingDriverId(null);
    setDriverForm({ name: '', phone: '' });
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
  };

  const handleDeleteDriver = (id: string) => {
    const updatedDrivers = (profileData.drivers || []).filter(d => d.id !== id);
    const updatedProfile = { ...profileData, drivers: updatedDrivers };
    setProfileData(updatedProfile);
    onSaveProfile(updatedProfile);
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
  };
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="font-headline font-bold text-3xl tracking-tight text-on-surface">{t('myVehicles')}</h2>
      </div>

      <AnimatePresence>
        {showSuccess && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-green-500/10 border border-green-500/20 p-4 rounded-2xl flex items-center gap-3 text-green-600 font-bold"
          >
            <Check size={20} />
            {t('savedSuccessfully')}
          </motion.div>
        )}
        {errorAlert && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-error/10 border border-error/20 p-4 rounded-2xl flex items-center gap-3 text-error font-bold"
          >
            <AlertCircle size={20} />
            {errorAlert}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="space-y-8 animate-fade-in">
          <div className="bg-surface-container-lowest rounded-3xl p-8 shadow-sm border border-surface-container-high">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-primary/10 rounded-2xl">
              <Car className="text-primary" size={24} />
            </div>
            <div>
              <h3 className="text-xl font-black font-headline text-on-surface">{t('fleetManagement')}</h3>
              <p className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest opacity-50">
                {profileData.vehicles?.length || 0} {t('vehiclesRegistered')}
              </p>
            </div>
          </div>
          {!isAddingVehicle && (
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
              className="flex items-center gap-2 px-6 py-3 bg-primary text-on-primary font-black text-xs uppercase tracking-widest rounded-xl shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all"
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
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest px-1">{t('brand')}</label>
                    <input 
                      className="w-full bg-surface-container-lowest p-4 rounded-2xl text-sm font-bold border border-outline-variant/10 outline-none focus:ring-4 focus:ring-primary/10 transition-all"
                      placeholder="Ex: Toyota"
                      value={vehicleForm.brand}
                      onChange={e => setVehicleForm({...vehicleForm, brand: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest px-1">{t('model')}</label>
                    <input 
                      className="w-full bg-surface-container-lowest p-4 rounded-2xl text-sm font-bold border border-outline-variant/10 outline-none focus:ring-4 focus:ring-primary/10 transition-all"
                      placeholder="Ex: Corolla"
                      value={vehicleForm.model}
                      onChange={e => setVehicleForm({...vehicleForm, model: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest px-1">{t('plate')}</label>
                    <input 
                      className="w-full bg-surface-container-lowest p-4 rounded-2xl text-sm font-bold border border-outline-variant/10 outline-none focus:ring-4 focus:ring-primary/10 transition-all"
                      placeholder="Ex: ABC-1234"
                      value={vehicleForm.plate}
                      onChange={e => setVehicleForm({...vehicleForm, plate: e.target.value.toUpperCase()})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest px-1">{t('year')}</label>
                    <input 
                      type="number"
                      className="w-full bg-surface-container-lowest p-4 rounded-2xl text-sm font-bold border border-outline-variant/10 outline-none focus:ring-4 focus:ring-primary/10 transition-all"
                      value={vehicleForm.year}
                      onChange={e => setVehicleForm({...vehicleForm, year: parseInt(e.target.value)})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest px-1">{t('tankCapacity')}</label>
                    <input 
                      className="w-full bg-surface-container-lowest p-4 rounded-2xl text-sm font-bold border border-outline-variant/10 outline-none focus:ring-4 focus:ring-primary/10 transition-all"
                      value={vehicleForm.tankCapacity}
                      onChange={e => setVehicleForm({...vehicleForm, tankCapacity: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest px-1 whitespace-nowrap">Odometro Atual ( kms totais atualmente )</label>
                    <input 
                      type="number"
                      className="w-full bg-surface-container-lowest p-4 rounded-2xl text-sm font-bold border border-outline-variant/10 outline-none focus:ring-4 focus:ring-primary/10 transition-all"
                      placeholder="Ex: 50000"
                      value={vehicleForm.currentOdometer || ''}
                      onChange={e => setVehicleForm({...vehicleForm, currentOdometer: parseInt(e.target.value) || 0})}
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-6 border-t border-outline-variant/10">
                  <button 
                    onClick={() => {
                      setIsAddingVehicle(false);
                      setEditingVehicleId(null);
                    }} 
                    className="px-6 py-3 text-on-surface-variant font-black text-xs uppercase tracking-widest hover:bg-surface-container-high rounded-xl transition-all"
                  >
                    {t('cancel')}
                  </button>
                  <button 
                    onClick={handleSaveVehicle}
                    className="px-10 py-4 bg-primary text-on-primary font-black text-xs uppercase tracking-widest rounded-xl shadow-lg shadow-primary/20 hover:scale-[0.98] transition-all"
                  >
                    {t('saveVehicle')}
                  </button>
                </div>
              </motion.div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(profileData.vehicles || []).map(v => (
                  <div 
                    key={v.id} 
                    className={`relative p-6 rounded-3xl border transition-all flex items-center justify-between group ${
                      activeVehicleId === v.id 
                        ? 'bg-primary/5 border-primary/20 ring-1 ring-primary/20 shadow-md' 
                        : 'bg-surface-container-low border-surface-container-high hover:border-primary/30'
                    }`}
                  >
                    <div 
                      className="flex items-center gap-5 cursor-pointer flex-1"
                      onClick={() => onActiveVehicleChange?.(v.id)}
                    >
                      <div className={`p-4 rounded-2xl shadow-sm border ${
                        activeVehicleId === v.id ? 'bg-primary text-on-primary' : 'bg-surface-container-highest text-primary'
                      }`}>
                        <Car size={24} />
                      </div>
                      <div className="flex flex-col">
                        <h4 className="font-black text-lg text-on-surface flex items-center gap-2">
                          {v.brand} {v.model}
                          {activeVehicleId === v.id && (
                            <span className="px-2 py-0.5 bg-primary text-on-primary text-[8px] font-black rounded uppercase tracking-widest">
                              {t('active')}
                            </span>
                          )}
                        </h4>
                        <div className="flex items-center gap-3 mt-1 flex-wrap">
                          <span className="text-[10px] font-black text-on-surface-variant bg-surface-container-highest px-2 py-0.5 rounded uppercase tracking-tighter">
                            {v.plate}
                          </span>
                          <span className="text-[10px] font-bold text-on-surface-variant bg-surface-container-highest px-2 py-0.5 rounded tracking-tighter flex items-center gap-1">
                            Odometro Atual: {v.currentOdometer !== undefined && v.currentOdometer !== null ? `${v.currentOdometer.toLocaleString()} km` : '0 km'}
                          </span>
                          <span className="text-[10px] font-bold text-on-surface-variant bg-surface-container-highest px-2 py-0.5 rounded tracking-tighter">
                            Tanque: {v.tankCapacity}L
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button 
                        onClick={() => {
                          setEditingVehicleId(v.id);
                          setVehicleForm(v);
                          setIsAddingVehicle(true);
                        }}
                        className="p-3 text-primary hover:bg-primary/10 rounded-xl transition-all"
                        title={t('edit')}
                      >
                        <Edit2 size={18} />
                      </button>
                      <button 
                        onClick={() => {
                          handleDeleteVehicle(v.id);
                        }}
                        className="p-3 text-on-surface-variant hover:text-error hover:bg-error/10 rounded-xl transition-all"
                        title={t('delete')}
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                ))}
                {(profileData.vehicles || []).length === 0 && (
                  <div className="col-span-full py-16 text-center bg-surface-container-low/30 rounded-[2.5rem] border border-dashed border-outline-variant/30">
                    <Car size={48} className="mx-auto text-on-surface-variant opacity-20 mb-4" />
                    <p className="text-sm font-black text-on-surface-variant opacity-40 uppercase tracking-[0.2em]">{t('noVehicles')}</p>
                  </div>
                )}
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Driver Registration Section */}
      <div className="bg-surface-container-lowest rounded-3xl p-8 shadow-sm border border-surface-container-high mt-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-secondary/10 rounded-2xl">
              <Users className="text-secondary" size={24} />
            </div>
            <div>
              <h3 className="text-xl font-black font-headline text-on-surface">{language === 'pt-BR' ? 'Gestão de Condutores' : 'Drivers Management'}</h3>
              <p className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest opacity-50">
                {(profileData.drivers || []).length} {language === 'pt-BR' ? 'Condutor(es) Cadastrado(s)' : 'Driver(s) Registered'}
              </p>
            </div>
          </div>
          {!isAddingDriver && (
            <button 
              onClick={() => {
                setDriverForm({
                  name: '',
                  phone: ''
                });
                setIsAddingDriver(true);
              }}
              className="flex items-center gap-2 px-6 py-3 bg-secondary text-on-secondary font-black text-xs uppercase tracking-widest rounded-xl shadow-lg shadow-secondary/20 hover:scale-105 active:scale-95 transition-all"
            >
              <Plus size={18} />
              {language === 'pt-BR' ? 'Novo Condutor' : 'Add Driver'}
            </button>
          )}
        </div>

        <div className="space-y-4">
          <AnimatePresence mode="wait">
            {isAddingDriver ? (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-surface-container-low/50 p-6 rounded-2xl border border-outline-variant/10 space-y-6"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest px-1">{language === 'pt-BR' ? 'Nome Completo' : 'Full Name'}</label>
                    <input 
                      className="w-full bg-surface-container-lowest p-4 rounded-2xl text-sm font-bold border border-outline-variant/10 outline-none focus:ring-4 focus:ring-secondary/10 transition-all"
                      placeholder={language === 'pt-BR' ? 'Ex: João da Silva' : 'e.g. John Doe'}
                      value={driverForm.name}
                      onChange={e => setDriverForm({...driverForm, name: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest px-1">{language === 'pt-BR' ? 'Telefone / WhatsApp (Opcional)' : 'Phone / WhatsApp (Optional)'}</label>
                    <input 
                      className="w-full bg-surface-container-lowest p-4 rounded-2xl text-sm font-bold border border-outline-variant/10 outline-none focus:ring-4 focus:ring-secondary/10 transition-all"
                      placeholder="Ex: (11) 99999-9999"
                      value={driverForm.phone}
                      onChange={e => setDriverForm({...driverForm, phone: e.target.value})}
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-6 border-t border-outline-variant/10">
                  <button 
                    onClick={() => {
                      setIsAddingDriver(false);
                      setEditingDriverId(null);
                      setDriverForm({ name: '', phone: '' });
                    }} 
                    className="px-6 py-3 text-on-surface-variant font-black text-xs uppercase tracking-widest hover:bg-surface-container-high rounded-xl transition-all"
                  >
                    {t('cancel')}
                  </button>
                  <button 
                    onClick={handleSaveDriver}
                    className="px-10 py-4 bg-secondary text-on-secondary font-black text-xs uppercase tracking-widest rounded-xl shadow-lg shadow-secondary/20 hover:scale-[0.98] transition-all"
                  >
                    {language === 'pt-BR' ? 'Salvar Condutor' : 'Save Driver'}
                  </button>
                </div>
              </motion.div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(profileData.drivers || []).map(d => (
                  <div 
                    key={d.id} 
                    className="relative p-6 rounded-3xl border bg-surface-container-low border-surface-container-high flex items-center justify-between transition-all hover:border-secondary/30"
                  >
                    <div className="flex items-center gap-5 flex-1">
                      <div className="p-4 rounded-2xl shadow-sm border bg-surface-container-highest text-secondary">
                        <Users size={24} />
                      </div>
                      <div className="flex flex-col">
                        <h4 className="font-black text-lg text-on-surface">
                          {d.name}
                        </h4>
                        <div className="flex items-center gap-3 mt-1 flex-wrap">
                          {d.phone && (
                            <span className="text-[10px] font-black text-on-surface-variant bg-surface-container-highest px-3 py-1 rounded uppercase tracking-tighter">
                              {d.phone}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button 
                        onClick={() => {
                          setDriverForm({ name: d.name, phone: d.phone || '' });
                          setEditingDriverId(d.id);
                          setIsAddingDriver(true);
                        }}
                        className="p-3 text-secondary hover:bg-secondary/10 rounded-xl transition-all"
                        title={t('edit')}
                      >
                        <Edit2 size={18} />
                      </button>
                      <button 
                        onClick={() => handleDeleteDriver(d.id)}
                        className="p-3 text-on-surface-variant hover:text-error hover:bg-error/10 rounded-xl transition-all"
                        title={t('delete')}
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                ))}
                {(profileData.drivers || []).length === 0 && (
                  <div className="col-span-full py-16 text-center bg-surface-container-low/30 rounded-[2.5rem] border border-dashed border-outline-variant/30">
                    <Users size={48} className="mx-auto text-on-surface-variant opacity-20 mb-4" />
                    <p className="text-sm font-black text-on-surface-variant opacity-40 uppercase tracking-[0.2em]">{t('noDrivers')}</p>
                  </div>
                )}
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  </div>
);
}
