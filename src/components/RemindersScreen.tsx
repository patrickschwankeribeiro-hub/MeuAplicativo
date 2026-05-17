import React, { useState } from 'react';
import { 
  Bell, 
  Trash2, 
  Plus, 
  ChevronLeft, 
  Calendar, 
  Activity, 
  Mail, 
  MessageSquare,
  AlertCircle,
  Clock,
  Repeat
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useLanguage } from '../contexts/LanguageContext';
import { UserProfile, Reminder } from '../types';
import { DatePicker } from '../../components/ui/date-picker';

interface RemindersScreenProps {
  userProfile: UserProfile;
  onSaveProfile: (profile: UserProfile) => void;
  onNavigate: (screen: any) => void;
  activeVehicleId: string | null;
}

export function RemindersScreen({ userProfile, onSaveProfile, onNavigate, activeVehicleId }: RemindersScreenProps) {
  const { t } = useLanguage();
  const [isAdding, setIsAdding] = useState(false);
  
  // Track all reminders but display only active vehicle ones
  const allReminders = userProfile.reminders || [];
  const currentReminders = allReminders.filter(r => r.vehicleId === activeVehicleId);

  // Form State
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [channel, setChannel] = useState<'sms' | 'email'>('email');
  const [triggerType, setTriggerType] = useState<'km' | 'date'>('date');
  const [targetDate, setTargetDate] = useState('');
  const [targetKm, setTargetKm] = useState('');
  const [remindXDaysBefore, setRemindXDaysBefore] = useState<string>('');
  const [remindEveryXKm, setRemindEveryXKm] = useState<string>('');
  const [remindAtKm, setRemindAtKm] = useState<string>('');

  const handleSaveReminder = () => {
    if (!title) return;

    const newReminder: Reminder = {
      id: editingId || Date.now().toString(),
      vehicleId: activeVehicleId || undefined,
      title,
      notes,
      channel,
      triggerType,
      targetDate: triggerType === 'date' ? targetDate : undefined,
      targetKm: triggerType === 'km' ? (targetKm ? parseInt(targetKm) : undefined) : undefined,
      remindXDaysBefore: remindXDaysBefore ? parseInt(remindXDaysBefore) : undefined,
      remindEveryXKm: remindEveryXKm ? parseInt(remindEveryXKm) : undefined,
      remindAtKm: remindAtKm ? parseInt(remindAtKm) : undefined,
      createdAt: new Date().toISOString(),
      isActive: true
    };

    let updatedReminders;
    if (editingId) {
      updatedReminders = allReminders.map(r => r.id === editingId ? newReminder : r);
    } else {
      updatedReminders = [newReminder, ...allReminders];
    }

    onSaveProfile({
      ...userProfile,
      reminders: updatedReminders
    });

    resetForm();
  };

  const [editingId, setEditingId] = useState<string | null>(null);

  const resetForm = () => {
    setTitle('');
    setNotes('');
    setChannel('email');
    setTriggerType('date');
    setTargetDate('');
    setTargetKm('');
    setRemindXDaysBefore('');
    setRemindEveryXKm('');
    setRemindAtKm('');
    setIsAdding(false);
    setEditingId(null);
  };

  const handleEdit = (reminder: Reminder) => {
    setEditingId(reminder.id);
    setTitle(reminder.title);
    setNotes(reminder.notes || '');
    setChannel(reminder.channel);
    setTriggerType(reminder.triggerType);
    setTargetDate(reminder.targetDate || '');
    setTargetKm(reminder.targetKm?.toString() || '');
    setRemindXDaysBefore(reminder.remindXDaysBefore?.toString() || '');
    setRemindEveryXKm(reminder.remindEveryXKm?.toString() || '');
    setRemindAtKm(reminder.remindAtKm?.toString() || '');
    setIsAdding(true);
  };

  const handleDelete = (id: string) => {
    if (window.confirm(t('confirmDelete') || 'Tem certeza que deseja excluir este lembrete?')) {
      onSaveProfile({
        ...userProfile,
        reminders: allReminders.filter(r => r.id !== id)
      });
    }
  };

  const toggleReminder = (id: string) => {
    onSaveProfile({
      ...userProfile,
      reminders: allReminders.map(r => 
        r.id === id ? { ...r, isActive: !r.isActive } : r
      )
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => onNavigate('dashboard')}
            className="p-2 bg-surface-container-low rounded-xl hover:bg-surface-container-high transition-colors"
          >
            <ChevronLeft size={24} />
          </button>
          <div>
            <h2 className="text-2xl font-black font-headline text-on-surface tracking-tight">{t('reminders')}</h2>
            <p className="text-xs font-bold text-on-surface-variant uppercase tracking-widest opacity-60">Notificações Inteligentes</p>
          </div>
        </div>
        {!isAdding && (
          <button 
            onClick={() => setIsAdding(true)}
            className="px-6 py-3 bg-primary text-on-primary rounded-2xl font-black font-headline uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-primary/20 active:scale-95 transition-all"
          >
            <Plus size={20} />
            {t('add')}
          </button>
        )}
      </header>

      <AnimatePresence mode="wait">
        {isAdding ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-surface-container-lowest p-6 rounded-3xl border border-surface-container-high shadow-sm space-y-6"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-black font-headline text-on-surface">
                {editingId ? 'Editar Lembrete' : t('addReminder')}
              </h3>
              <button onClick={resetForm} className="text-xs font-black text-on-surface-variant uppercase tracking-widest hover:text-error transition-colors">
                {t('cancel')}
              </button>
            </div>

            <div className="space-y-4">
              {/* Title */}
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest px-1">{t('reminderTitle')}</label>
                  <input 
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Ex: Troca de filtros"
                    onFocus={(e) => e.target.placeholder = ''}
                    onBlur={(e) => e.target.placeholder = "Ex: Troca de filtros"}
                    className="w-full bg-surface-container-low p-3.5 rounded-xl text-sm font-bold outline-none border border-outline-variant/30 focus:border-primary transition-all"
                  />
                </div>

                {/* Notes Field */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest px-1">{t('observation')}</label>
                  <textarea 
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder={t('expenseNotesPlaceholder')}
                    onFocus={(e) => e.target.placeholder = ''}
                    onBlur={(e) => e.target.placeholder = t('expenseNotesPlaceholder')}
                    rows={2}
                    className="w-full bg-surface-container-low p-3.5 rounded-xl text-sm font-medium outline-none border border-outline-variant/30 focus:border-primary transition-all resize-none"
                  />
                </div>
              </div>

              {/* Channel Selector */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest px-1">{t('notificationChannel')}</label>
                <div className="grid grid-cols-2 gap-3">
                  <button 
                    onClick={() => setChannel('sms')}
                    className={`flex items-center justify-center gap-3 p-4 rounded-2xl border-2 transition-all ${channel === 'sms' ? 'border-primary bg-primary/5 text-primary' : 'border-outline-variant/30 text-on-surface-variant'}`}
                  >
                    <MessageSquare size={20} />
                    <span className="font-black uppercase text-xs tracking-widest">{t('reminderChannelSms')}</span>
                  </button>
                  <button 
                    onClick={() => setChannel('email')}
                    className={`flex items-center justify-center gap-3 p-4 rounded-2xl border-2 transition-all ${channel === 'email' ? 'border-primary bg-primary/5 text-primary' : 'border-outline-variant/30 text-on-surface-variant'}`}
                  >
                    <Mail size={20} />
                    <span className="font-black uppercase text-xs tracking-widest">{t('reminderChannelEmail')}</span>
                  </button>
                </div>
              </div>

              {/* Trigger Type Toggle */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest px-1">{t('remindMeBy')}</label>
                <div className="flex bg-surface-container-low p-1.5 rounded-2xl border border-surface-container-high">
                  <button 
                    onClick={() => setTriggerType('date')}
                    className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all ${triggerType === 'date' ? 'bg-primary text-on-primary shadow-md' : 'text-on-surface-variant'}`}
                  >
                    <Calendar size={14} />
                    {t('triggerDate')}
                  </button>
                  <button 
                    onClick={() => setTriggerType('km')}
                    className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all ${triggerType === 'km' ? 'bg-primary text-on-primary shadow-md' : 'text-on-surface-variant'}`}
                  >
                    <Activity size={14} />
                    {t('triggerKm')}
                  </button>
                </div>
              </div>

              {/* Conditional Fields: Date */}
              {triggerType === 'date' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in slide-in-from-top-2 duration-300">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest px-1">{t('triggerDate')}</label>
                    <DatePicker 
                      date={targetDate ? new Date(targetDate + 'T12:00:00') : undefined}
                      setDate={(d) => setTargetDate(d ? d.toISOString().split('T')[0] : '')}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest px-1">
                      {t('threeDaysBefore')} <span className="opacity-50 lowercase">{t('optional')}</span>
                    </label>
                    <div className="flex items-center gap-2">
                       <input 
                        type="checkbox"
                        id="threeDays"
                        checked={remindXDaysBefore === '3'}
                        onChange={(e) => setRemindXDaysBefore(e.target.checked ? '3' : '')}
                        className="w-5 h-5 rounded border-outline-variant/30 text-primary focus:ring-primary"
                      />
                      <label htmlFor="threeDays" className="text-sm font-bold text-on-surface-variant">Ativar lembrete antecipado</label>
                    </div>
                  </div>
                </div>
              )}

              {/* Conditional Fields: KM */}
              {triggerType === 'km' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-in slide-in-from-top-2 duration-300">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest px-1">{t('notifyAtKm')}</label>
                    <div className="relative">
                      <input 
                        type="text"
                        inputMode="numeric"
                        value={remindAtKm}
                        onChange={(e) => setRemindAtKm(e.target.value.replace(/\D/g, ''))}
                        placeholder="Ex: 50.000"
                        onFocus={(e) => e.target.placeholder = ''}
                        onBlur={(e) => e.target.placeholder = "Ex: 50.000"}
                        className="w-full bg-surface-container-low p-3.5 rounded-xl text-sm font-bold outline-none border border-outline-variant/30 focus:border-primary transition-all pr-12"
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black opacity-30">KM</span>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest px-1">
                      {t('remindEveryXKm')} <span className="opacity-50 lowercase">{t('optional')}</span>
                    </label>
                    <div className="relative">
                      <input 
                        type="text"
                        inputMode="numeric"
                        value={remindEveryXKm}
                        onChange={(e) => setRemindEveryXKm(e.target.value.replace(/\D/g, ''))}
                        placeholder="Ex: 10.000"
                        onFocus={(e) => e.target.placeholder = ''}
                        onBlur={(e) => e.target.placeholder = "Ex: 10.000"}
                        className="w-full bg-surface-container-low p-3.5 rounded-xl text-sm font-bold outline-none border border-outline-variant/30 focus:border-primary transition-all pr-12"
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black opacity-30">KM</span>
                    </div>
                  </div>
                </div>
              )}

              <button 
                onClick={handleSaveReminder}
                disabled={!title}
                className="w-full h-14 bg-primary text-on-primary rounded-2xl font-black font-headline uppercase tracking-widest shadow-xl shadow-primary/20 active:scale-[0.98] transition-all disabled:opacity-50 disabled:grayscale"
              >
                {t('saveReminder')}
              </button>
            </div>
          </motion.div>
        ) : (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-4"
          >
            {currentReminders.length === 0 ? (
              <div className="bg-surface-container-lowest p-12 rounded-3xl border border-dashed border-outline-variant/40 flex flex-col items-center justify-center text-center space-y-4">
                <div className="w-16 h-16 bg-surface-container-low rounded-full flex items-center justify-center text-on-surface-variant opacity-40">
                  <Bell size={32} />
                </div>
                <div>
                  <p className="text-sm font-bold text-on-surface-variant">{t('noReminders')}</p>
                  <p className="text-xs font-medium text-on-surface-variant/60">{t('addReminder')} para começar a ser notificado.</p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {currentReminders.map((reminder) => (
                  <motion.div
                    layout
                    key={reminder.id}
                    className={`bg-surface-container-lowest p-5 rounded-3xl border border-surface-container-high shadow-sm flex items-start gap-4 transition-all ${!reminder.isActive ? 'opacity-60 grayscale' : ''}`}
                  >
                    <div className={`p-3 rounded-2xl ${reminder.channel === 'sms' ? 'bg-blue-100 text-blue-600' : 'bg-orange-100 text-orange-600'}`}>
                      {reminder.channel === 'sms' ? <MessageSquare size={20} /> : <Mail size={20} />}
                    </div>
                    
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between">
                        <h4 className="font-black font-headline text-on-surface">{reminder.title}</h4>
                        <div className="flex items-center gap-1">
                          <button onClick={() => handleEdit(reminder)} className="p-2 hover:bg-surface-container-low rounded-lg transition-colors text-on-surface-variant">
                            <Clock size={16} />
                          </button>
                          <button onClick={() => handleDelete(reminder.id)} className="p-2 hover:bg-error-container/10 rounded-lg transition-colors text-error">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                      
                      <div className="flex flex-wrap gap-2">
                        <span className="bg-surface-container-low px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-tighter text-on-surface-variant flex items-center gap-1">
                          {reminder.triggerType === 'date' ? <Calendar size={10} /> : <Activity size={10} />}
                          {reminder.triggerType === 'date' ? reminder.targetDate : `${reminder.remindAtKm?.toLocaleString()} KM`}
                        </span>
                        
                        {reminder.remindXDaysBefore && (
                           <span className="bg-secondary/10 px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-tighter text-secondary">
                            -3 Dias
                          </span>
                        )}
                        
                        {reminder.remindEveryXKm && (
                           <span className="bg-secondary/10 px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-tighter text-secondary flex items-center gap-1">
                            <Repeat size={10} />
                            A cada {reminder.remindEveryXKm.toLocaleString()} KM
                          </span>
                        )}
                      </div>
                    </div>

                    <label className="relative inline-flex items-center cursor-pointer ml-2 pt-1">
                      <input 
                        type="checkbox" 
                        checked={reminder.isActive} 
                        onChange={() => toggleReminder(reminder.id)}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-surface-container-high peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
                    </label>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
