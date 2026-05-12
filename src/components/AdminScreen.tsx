import React, { useState } from 'react';
import { 
  Users, 
  TrendingUp, 
  DollarSign, 
  UserMinus, 
  UserPlus, 
  Info, 
  ExternalLink, 
  ArrowLeft,
  Search,
  LayoutDashboard,
  CreditCard,
  Zap,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Activity,
  Lock
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useLanguage } from '../contexts/LanguageContext';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';

interface AdminScreenProps {
  onNavigate: (screen: any) => void;
}

type AdminTab = 'dashboard' | 'users' | 'subscriptions' | 'integrations';

export const AdminScreen: React.FC<AdminScreenProps> = ({ onNavigate }) => {
  const { t, language } = useLanguage();
  const [activeTab, setActiveTab] = useState<AdminTab>('dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  const [webhookSecret, setWebhookSecret] = useState('');
  const [isSaved, setIsSaved] = useState(false);

  const handleSaveSecret = () => {
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  // Mock data for Admin Panel
  const stats = {
    totalUsers: 1248,
    activeNow: 42,
    totalRevenue: 15420.50,
    monthlyChurn: 12, // Cancellations
    newSubs: 84
  };

  const growthData = [
    { name: 'Jan', users: 800, revenue: 10000 },
    { name: 'Fev', users: 950, revenue: 12000 },
    { name: 'Mar', users: 1100, revenue: 14000 },
    { name: 'Abr', users: 1248, revenue: 15420 },
  ];

  const users = [
    { id: 1, name: 'João Silva', email: 'joao@email.com', plan: 'Anual', status: 'ativo', date: '2026-04-10' },
    { id: 2, name: 'Maria Oliveira', email: 'maria@email.com', plan: 'Mensal', status: 'ativo', date: '2026-04-15' },
    { id: 3, name: 'Pedro Santos', email: 'pedro@email.com', plan: 'Mensal', status: 'cancelado', date: '2026-03-20' },
    { id: 4, name: 'Ana Costa', email: 'ana@email.com', plan: 'Anual', status: 'ativo', date: '2026-04-25' },
    { id: 5, name: 'Carlos Lima', email: 'carlos@email.com', plan: 'Mensal', status: 'ativo', date: '2026-04-28' },
  ];

  const Tooltip = ({ text }: { text: string }) => (
    <div className="group relative inline-block ml-1">
      <HelpCircle size={14} className="text-on-surface-variant/40 cursor-help hover:text-primary transition-colors" />
      <div className="invisible group-hover:visible absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-on-surface text-surface text-[10px] rounded-lg shadow-xl leading-relaxed animate-in fade-in zoom-in-95 duration-200">
        {text}
        <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-on-surface" />
      </div>
    </div>
  );

  const StatCard = ({ title, value, icon: Icon, color, tip }: { title: string, value: string | number, icon: any, color: string, tip: string }) => (
    <div className="bg-surface-container-lowest p-6 rounded-[24px] border border-surface-container-high shadow-sm hover:shadow-md transition-all group">
      <div className="flex justify-between items-start mb-4">
        <div className={`p-3 rounded-2xl bg-${color}/10 text-${color} group-hover:scale-110 transition-transform`}>
          <Icon size={24} />
        </div>
        <Tooltip text={tip} />
      </div>
      <div>
        <p className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest mb-1">{title}</p>
        <h4 className="text-2xl font-black text-on-surface tracking-tight">{value}</h4>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-surface-container-high pb-24">
      {/* Header */}
      <div className="bg-surface-container-lowest border-b border-surface-container-high px-6 py-4 sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => onNavigate('dashboard')}
              className="p-2 hover:bg-surface-container-high rounded-xl transition-colors"
            >
              <ArrowLeft size={20} className="text-on-surface-variant" />
            </button>
            <div>
              <h1 className="text-lg font-black text-on-surface uppercase tracking-tight flex items-center gap-2">
                Painel Administrativo
                <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full">Owner</span>
              </h1>
              <p className="text-[10px] text-on-surface-variant font-bold uppercase tracking-widest">KM Profit SaaS Manager</p>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-2 bg-surface-container-high px-4 py-2 rounded-full border border-surface-container-highest">
            <Search size={16} className="text-on-surface-variant" />
            <input 
              type="text" 
              placeholder="Buscar usuários..." 
              className="bg-transparent border-none outline-none text-xs font-bold w-48 placeholder:text-on-surface-variant/40"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-12 gap-8">
          
          {/* Sidebar */}
          <aside className="col-span-12 lg:col-span-3 space-y-2">
            {[
              { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
              { id: 'users', label: 'Usuários', icon: Users },
              { id: 'subscriptions', label: 'Assinaturas', icon: CreditCard },
              { id: 'integrations', label: 'Integrações', icon: Zap },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as AdminTab)}
                className={`w-full flex items-center gap-3 px-6 py-4 rounded-2xl font-black text-sm uppercase tracking-widest transition-all ${
                  activeTab === tab.id 
                    ? 'bg-primary text-on-primary shadow-lg shadow-primary/20 scale-[1.02]' 
                    : 'text-on-surface-variant hover:bg-surface-container-lowest'
                }`}
              >
                <tab.icon size={20} />
                {tab.label}
              </button>
            ))}

            <div className="mt-8 p-6 bg-primary/5 rounded-[32px] border border-primary/10">
              <p className="text-[10px] font-black text-primary uppercase tracking-widest mb-4">Planos Ativos</p>
              <div className="space-y-3">
                <div className="bg-surface-container-lowest p-4 rounded-2xl border border-primary/10">
                  <p className="text-xs font-black text-on-surface">Plano Mensal</p>
                  <p className="text-lg font-black text-primary">R$ 14,90</p>
                </div>
                <div className="bg-surface-container-lowest p-4 rounded-2xl border border-primary/10">
                  <p className="text-xs font-black text-on-surface">Plano Anual</p>
                  <p className="text-lg font-black text-primary">R$ 97,90</p>
                </div>
              </div>
            </div>
          </aside>

          {/* Main Content */}
          <main className="col-span-12 lg:col-span-9 space-y-8">
            <AnimatePresence mode="wait">
              {activeTab === 'dashboard' && (
                <motion.div 
                  key="dashboard"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="space-y-8"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    <StatCard 
                      title="Usuários Totais" 
                      value={stats.totalUsers} 
                      icon={Users} 
                      color="primary" 
                      tip="O número total de motoristas cadastrados no seu aplicativo desde o início."
                    />
                    <StatCard 
                      title="Ativos Agora" 
                      value={stats.activeNow} 
                      icon={Activity} 
                      color="secondary" 
                      tip="Mostra quem está usando o app neste momento. Útil para medir o engajamento diário."
                    />
                    <StatCard 
                      title="Receita Total" 
                      value={`R$ ${stats.totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} 
                      icon={DollarSign} 
                      color="green-600" 
                      tip="Soma de todos os pagamentos aprovados (Mensal + Anual) até hoje."
                    />
                    <StatCard 
                      title="Cancelamentos / Mês" 
                      value={stats.monthlyChurn} 
                      icon={UserMinus} 
                      color="error" 
                      tip="Isso ajuda você a entender se as pessoas estão parando de usar o app. Chamamos isso de Churn."
                    />
                    <StatCard 
                      title="Novas Assinaturas" 
                      value={stats.newSubs} 
                      icon={UserPlus} 
                      color="primary" 
                      tip="Quantidade de novos motoristas que pagaram um plano nos últimos 30 dias."
                    />
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div className="bg-surface-container-lowest p-8 rounded-[32px] border border-surface-container-high shadow-sm">
                      <div className="flex items-center justify-between mb-8">
                        <div>
                          <h3 className="text-sm font-black text-on-surface uppercase tracking-widest leading-none">Crescimento de Usuários</h3>
                          <p className="text-[10px] text-on-surface-variant font-medium mt-1">Evolução do número de cadastros</p>
                        </div>
                        <Tooltip text="Acompanhe se o seu aplicativo está ganhando popularidade mês a mês." />
                      </div>
                      <div className="h-[250px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={growthData}>
                            <defs>
                              <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="var(--md-sys-color-primary)" stopOpacity={0.1}/>
                                <stop offset="95%" stopColor="var(--md-sys-color-primary)" stopOpacity={0}/>
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--md-sys-color-outline-variant)" />
                            <XAxis 
                              dataKey="name" 
                              axisLine={false} 
                              tickLine={false} 
                              tick={{ fontSize: 10, fontWeight: 700, fill: 'var(--md-sys-color-on-surface-variant)' }} 
                            />
                            <YAxis 
                              axisLine={false} 
                              tickLine={false} 
                              tick={{ fontSize: 10, fontWeight: 700, fill: 'var(--md-sys-color-on-surface-variant)' }} 
                            />
                            <RechartsTooltip 
                              contentStyle={{ 
                                backgroundColor: 'var(--md-sys-color-surface-container-lowest)', 
                                border: '1px solid var(--md-sys-color-surface-container-high)',
                                borderRadius: '16px',
                                fontSize: '10px',
                                fontWeight: '700'
                              }}
                            />
                            <Area type="monotone" dataKey="users" stroke="var(--md-sys-color-primary)" fillOpacity={1} fill="url(#colorUsers)" strokeWidth={3} />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    <div className="bg-surface-container-lowest p-8 rounded-[32px] border border-surface-container-high shadow-sm">
                      <div className="flex items-center justify-between mb-8">
                        <div>
                          <h3 className="text-sm font-black text-on-surface uppercase tracking-widest leading-none">Receita Mensal</h3>
                          <p className="text-[10px] text-on-surface-variant font-medium mt-1">Faturamento bruto em Reais</p>
                        </div>
                        <Tooltip text="Quanto dinheiro está entrando no seu bolso a cada mês." />
                      </div>
                      <div className="h-[250px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={growthData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--md-sys-color-outline-variant)" />
                            <XAxis 
                              dataKey="name" 
                              axisLine={false} 
                              tickLine={false} 
                              tick={{ fontSize: 10, fontWeight: 700, fill: 'var(--md-sys-color-on-surface-variant)' }} 
                            />
                            <YAxis 
                              axisLine={false} 
                              tickLine={false} 
                              tick={{ fontSize: 10, fontWeight: 700, fill: 'var(--md-sys-color-on-surface-variant)' }} 
                            />
                            <RechartsTooltip 
                              contentStyle={{ 
                                backgroundColor: 'var(--md-sys-color-surface-container-lowest)', 
                                border: '1px solid var(--md-sys-color-surface-container-high)',
                                borderRadius: '16px',
                                fontSize: '10px',
                                fontWeight: '700'
                              }}
                            />
                            <Line type="monotone" dataKey="revenue" stroke="#16a34a" strokeWidth={3} dot={{ r: 4, fill: '#16a34a', strokeWidth: 2 }} />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {activeTab === 'users' && (
                <motion.div 
                  key="users"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                >
                  <div className="bg-surface-container-lowest rounded-[32px] border border-surface-container-high shadow-sm overflow-hidden">
                    <div className="p-8 border-b border-surface-container-high flex justify-between items-center">
                      <h3 className="text-sm font-black text-on-surface uppercase tracking-widest flex items-center gap-2">
                        Gestão de Usuários
                        <Tooltip text="Status ativo = usuário pagou o plano e pode usar o app normalmente." />
                      </h3>
                      <div className="text-[10px] text-on-surface-variant font-bold">Total: {users.length} motoristas</div>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-surface-container-low">
                            <th className="p-4 text-[10px] font-black text-on-surface-variant uppercase tracking-widest">Nome</th>
                            <th className="p-4 text-[10px] font-black text-on-surface-variant uppercase tracking-widest">Email</th>
                            <th className="p-4 text-[10px] font-black text-on-surface-variant uppercase tracking-widest">Plano</th>
                            <th className="p-4 text-[10px] font-black text-on-surface-variant uppercase tracking-widest text-center">Status</th>
                            <th className="p-4 text-[10px] font-black text-on-surface-variant uppercase tracking-widest text-right">Ações</th>
                          </tr>
                        </thead>
                        <tbody>
                          {users.map(user => (
                            <tr key={user.id} className="border-b border-surface-container-high hover:bg-surface-container-low transition-colors">
                              <td className="p-4 text-xs font-bold text-on-surface">{user.name}</td>
                              <td className="p-4 text-xs font-medium text-on-surface-variant">{user.email}</td>
                              <td className="p-4">
                                <span className={`text-[9px] font-black px-2 py-1 rounded-lg uppercase ${user.plan === 'Anual' ? 'bg-primary/10 text-primary' : 'bg-secondary/10 text-secondary'}`}>
                                  {user.plan}
                                </span>
                              </td>
                              <td className="p-4 text-center">
                                {user.status === 'ativo' ? (
                                  <div className="flex items-center justify-center gap-1 text-green-600">
                                    <CheckCircle2 size={14} />
                                    <span className="text-[10px] font-black uppercase">Ativo</span>
                                  </div>
                                ) : (
                                  <div className="flex items-center justify-center gap-1 text-error">
                                    <XCircle size={14} />
                                    <span className="text-[10px] font-black uppercase">Bloqueado</span>
                                  </div>
                                )}
                              </td>
                              <td className="p-4 text-right">
                                <button className="p-2 hover:bg-surface-container-highest rounded-lg transition-colors text-on-surface-variant">
                                  <ExternalLink size={16} />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </motion.div>
              )}

              {activeTab === 'subscriptions' && (
                <motion.div 
                  key="subscriptions"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                >
                  <div className="bg-surface-container-lowest rounded-[32px] border border-surface-container-high shadow-sm overflow-hidden">
                    <div className="p-8 border-b border-surface-container-high">
                      <h3 className="text-sm font-black text-on-surface uppercase tracking-widest flex items-center gap-2">
                        Assinaturas e Pagamentos
                        <Tooltip text="Aqui você vê se os motoristas estão em dia com o pagamento." />
                      </h3>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-surface-container-low">
                            <th className="p-4 text-[10px] font-black text-on-surface-variant uppercase tracking-widest">Usuário</th>
                            <th className="p-4 text-[10px] font-black text-on-surface-variant uppercase tracking-widest">Plano</th>
                            <th className="p-4 text-[10px] font-black text-on-surface-variant uppercase tracking-widest">Último Pagamento</th>
                            <th className="p-4 text-[10px] font-black text-on-surface-variant uppercase tracking-widest text-center">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {users.map(user => (
                            <tr key={user.id} className="border-b border-surface-container-high">
                              <td className="p-4">
                                <p className="text-xs font-bold text-on-surface">{user.name}</p>
                                <p className="text-[9px] text-on-surface-variant">{user.email}</p>
                              </td>
                              <td className="p-4">
                                <p className="text-xs font-black text-on-surface">{user.plan}</p>
                                <p className="text-[10px] text-primary">{user.plan === 'Anual' ? 'R$ 97,90' : 'R$ 14,90'}</p>
                              </td>
                              <td className="p-4 text-xs font-bold text-on-surface-variant">
                                {new Date(user.date).toLocaleDateString('pt-BR')}
                              </td>
                              <td className="p-4 text-center">
                                <span className={`text-[10px] font-black px-3 py-1 rounded-full uppercase ${user.status === 'ativo' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                  {user.status === 'ativo' ? 'Pago' : 'Pendente'}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </motion.div>
              )}

              {activeTab === 'integrations' && (
                <motion.div 
                  key="integrations"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="space-y-8"
                >
                  <div className="bg-surface-container-lowest p-8 rounded-[32px] border border-surface-container-high shadow-sm">
                    <div className="flex items-center gap-4 mb-8">
                      <div className="bg-primary text-on-primary p-4 rounded-[24px] shadow-lg shadow-primary/20">
                        <Zap size={32} />
                      </div>
                      <div>
                        <h3 className="text-sm font-black text-on-surface uppercase tracking-widest leading-none flex items-center gap-2">
                          Integração Kiwify
                          <Tooltip text="Conecte seu sistema de pagamentos para automatizar tudo." />
                        </h3>
                        <p className="text-[11px] text-on-surface-variant font-medium mt-2">Ative e remova acessos automaticamente através de Webhooks.</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-6">
                        {/* Passo 1: URL */}
                        <div className="p-6 bg-surface-container-high rounded-[24px] border border-surface-container-highest">
                          <p className="text-[10px] font-black text-primary uppercase tracking-widest mb-2">Paso 1: Sua URL de Webhook</p>
                          <div className="flex gap-2">
                            <input 
                              type="text" 
                              readOnly 
                              value="https://api.kmprofit.com/webhooks/kiwify" 
                              className="bg-surface-container-lowest flex-1 p-3 rounded-xl text-xs font-mono font-bold text-on-surface outline-none border border-surface-container-highest opacity-70"
                            />
                            <button className="bg-primary text-on-primary px-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-transform active:scale-95 shadow-md">
                              Copiar
                            </button>
                          </div>
                          <p className="text-[10px] text-on-surface-variant font-bold mt-4 flex items-center gap-1">
                            <Info size={12} />
                            Cole essa URL nas configurações de Webhook da sua Kiwify.
                          </p>
                        </div>

                        {/* Passo 2: Token */}
                        <div className="p-6 bg-surface-container-high rounded-[24px] border border-surface-container-highest">
                          <p className="text-[10px] font-black text-primary uppercase tracking-widest mb-2">Passo 2: Chave de Segurança (Secret)</p>
                          <div className="space-y-3">
                            <input 
                              type="password" 
                              placeholder="Cole o Webhook Secret da Kiwify aqui..." 
                              value={webhookSecret}
                              onChange={(e) => setWebhookSecret(e.target.value)}
                              className="w-full bg-surface-container-lowest p-3 rounded-xl text-xs font-bold text-on-surface outline-none border border-surface-container-highest focus:border-primary transition-colors"
                            />
                            <button 
                              onClick={handleSaveSecret}
                              className={`w-full py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${
                                isSaved ? 'bg-green-600 text-white' : 'bg-on-surface text-surface hover:bg-on-surface/90'
                              }`}
                            >
                              {isSaved ? <CheckCircle2 size={16} /> : <CreditCard size={16} />}
                              {isSaved ? 'Configuração Salva!' : 'Conectar com Kiwify'}
                            </button>
                          </div>
                          <p className="text-[10px] text-on-surface-variant font-bold mt-4 flex items-center gap-1">
                            <Lock size={12} />
                            O Secret garante que só a Kiwify consiga ativar usuários.
                          </p>
                        </div>

                        <div className="space-y-4">
                          <h4 className="text-xs font-black text-on-surface uppercase tracking-widest">Eventos Suportados</h4>
                          <div className="space-y-2">
                            {[
                              { event: 'compra_aprovada', desc: 'Ativa o usuário no app imediatamente.', color: 'bg-green-500' },
                              { event: 'cancelamento', desc: 'Sinaliza o cancelamento mas mantém acesso até o fim do ciclo.', color: 'bg-orange-500' },
                              { event: 'reembolso', desc: 'Remove o acesso do usuário instantaneamente.', color: 'bg-red-500' },
                            ].map(ev => (
                              <div key={ev.event} className="flex items-center gap-3 p-4 bg-surface-container-lowest border border-surface-container-highest rounded-2xl">
                                <div className={`w-2 h-2 rounded-full ${ev.color} animate-pulse`} />
                                <div>
                                  <p className="text-[11px] font-black text-on-surface font-mono">{ev.event}</p>
                                  <p className="text-[10px] text-on-surface-variant font-medium">{ev.desc}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="bg-primary/5 p-8 rounded-[32px] border border-primary/10 flex flex-col justify-center text-center">
                        <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl text-primary border border-primary/20">
                          <HelpCircle size={32} />
                        </div>
                        <h4 className="text-sm font-black text-primary uppercase tracking-widest mb-4">O que é Webhook?</h4>
                        <p className="text-xs text-on-surface-variant font-medium leading-relaxed px-4">
                          “Webhook é uma notificação automática enviada pela Kiwify quando alguém paga ou cancela.”
                          <br /><br />
                          Pense nisso como um carteiro digital. Assim que o pagamento cai, o carteiro corre avisar o seu app para liberar o acesso do motorista.
                        </p>
                        <button className="mt-8 mx-auto text-primary text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:underline">
                          Manual do Iniciante <ExternalLink size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </main>
        </div>
      </div>
    </div>
  );
};
