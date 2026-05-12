import React, { useState } from 'react';
import { motion } from 'motion/react';
import { User, Mail, Phone, Calendar, MapPin, Lock, ArrowLeft, UserPlus } from 'lucide-react';
import { Screen, UserProfile } from '../types';
import { useLanguage } from '../contexts/LanguageContext';

interface SignupScreenProps {
  onSignup: (profile: UserProfile) => void;
  onNavigate: (screen: Screen) => void;
  externalError?: string;
  isLoading?: boolean;
}

const ESTADOS_BRASIL = [
  { sigla: 'AC', nome: 'Acre' }, { sigla: 'AL', nome: 'Alagoas' }, { sigla: 'AP', nome: 'Amapá' },
  { sigla: 'AM', nome: 'Amazonas' }, { sigla: 'BA', nome: 'Bahia' }, { sigla: 'CE', nome: 'Ceará' },
  { sigla: 'DF', nome: 'Distrito Federal' }, { sigla: 'ES', nome: 'Espírito Santo' }, { sigla: 'GO', nome: 'Goiás' },
  { sigla: 'MA', nome: 'Maranhão' }, { sigla: 'MT', nome: 'Mato Grosso' }, { sigla: 'MS', nome: 'Mato Grosso do Sul' },
  { sigla: 'MG', nome: 'Minas Gerais' }, { sigla: 'PA', nome: 'Pará' }, { sigla: 'PB', nome: 'Paraíba' },
  { sigla: 'PR', nome: 'Paraná' }, { sigla: 'PE', nome: 'Pernambuco' }, { sigla: 'PI', nome: 'Piauí' },
  { sigla: 'RJ', nome: 'Rio de Janeiro' }, { sigla: 'RN', nome: 'Rio Grande do Norte' }, { sigla: 'RS', nome: 'Rio Grande do Sul' },
  { sigla: 'RO', nome: 'Rondônia' }, { sigla: 'RR', nome: 'Roraima' }, { sigla: 'SC', nome: 'Santa Catarina' },
  { sigla: 'SP', nome: 'São Paulo' }, { sigla: 'SE', nome: 'Sergipe' }, { sigla: 'TO', nome: 'Tocantins' }
];

const CIDADES_POR_ESTADO: Record<string, string[]> = {
  'SP': ['São Paulo', 'Campinas', 'Santos', 'São Bernardo do Campo', 'Santo André'],
  'RJ': ['Rio de Janeiro', 'Niterói', 'Duque de Caxias', 'São Gonçalo', 'Petrópolis'],
  'MG': ['Belo Horizonte', 'Uberlândia', 'Contagem', 'Juiz de Fora', 'Betim'],
  'ES': ['Vitória', 'Vila Velha', 'Serra', 'Cariacica', 'Guarapari'],
  'PR': ['Curitiba', 'Londrina', 'Maringá', 'Ponta Grossa', 'Cascavel'],
  'SC': ['Florianópolis', 'Joinville', 'Blumenau', 'São José', 'Chapecó'],
  'RS': ['Porto Alegre', 'Caxias do Sul', 'Canoas', 'Pelotas', 'Santa Maria'],
  'BA': ['Salvador', 'Feira de Santana', 'Vitória da Conquista', 'Camaçari', 'Itabuna'],
  'PE': ['Recife', 'Jaboatão dos Guararapes', 'Olinda', 'Caruaru', 'Petrolina'],
  'CE': ['Fortaleza', 'Caucaia', 'Juazeiro do Norte', 'Maracanaú', 'Sobral'],
  'AM': ['Manaus', 'Parintins', 'Itacoatiara', 'Manacapuru', 'Coari'],
  'PA': ['Belém', 'Ananindeua', 'Santarém', 'Marabá', 'Castanhal'],
  'MT': ['Cuiabá', 'Várzea Grande', 'Rondonópolis', 'Sinop', 'Tangará da Serra'],
  'MS': ['Campo Grande', 'Dourados', 'Três Lagoas', 'Corumbá', 'Ponta Porã'],
  'GO': ['Goiânia', 'Aparecida de Goiânia', 'Anápolis', 'Rio Verde', 'Luziânia'],
  'DF': ['Brasília', 'Taguatinga', 'Ceilândia', 'Samambaia', 'Gama'],
  'MA': ['São Luís', 'Imperatriz', 'Timon', 'Caxias', 'São José de Ribamar'],
  'PI': ['Teresina', 'Parnaíba', 'Picos', 'Piripiri', 'Floriano'],
  'RN': ['Natal', 'Mossoró', 'Parnamirim', 'São Gonçalo do Amarante', 'Macaíba'],
  'PB': ['João Pessoa', 'Campina Grande', 'Santa Rita', 'Patos', 'Bayeux'],
  'AL': ['Maceió', 'Arapiraca', 'Rio Largo', 'Palmeira dos Índios', 'União dos Palmares'],
  'SE': ['Aracaju', 'Nossa Senhora do Socorro', 'Lagarto', 'Itabaiana', 'São Cristóvão'],
  'TO': ['Palmas', 'Araguaína', 'Gurupi', 'Porto Nacional', 'Paraíso do Tocantins'],
  'RO': ['Porto Velho', 'Ji-Paraná', 'Ariquemes', 'Vilhena', 'Cacoal'],
  'AC': ['Rio Branco', 'Cruzeiro do Sul', 'Sena Madureira', 'Tarauacá', 'Feijó'],
  'RR': ['Boa Vista', 'Rorainópolis', 'Caracaraí', 'Pacaraima', 'Cantá'],
  'AP': ['Macapá', 'Santana', 'Laranjal do Jari', 'Oiapoque', 'Mazagão']
};

export function SignupScreen({ onSignup, onNavigate, externalError, isLoading }: SignupScreenProps) {
  const { t } = useLanguage();
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    birthDate: '',
    state: '',
    city: '',
    password: '',
    confirmPassword: ''
  });
  const [error, setError] = useState('');

  const currentError = externalError || error;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
      ...(name === 'state' ? { city: '' } : {})
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Basic validation
    if (Object.values(formData).some(val => !val)) {
      setError('Por favor, preencha todos os campos.');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('As senhas não coincidem.');
      return;
    }

    const { confirmPassword, ...profile } = formData;
    onSignup(profile as UserProfile);
  };

  return (
    <div className="min-h-screen bg-surface flex flex-col items-center p-6 py-12">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-2xl space-y-8"
      >
        <div className="flex items-center justify-between">
          <button
            onClick={() => onNavigate('login')}
            disabled={isLoading}
            className="w-12 h-12 rounded-2xl bg-surface-container-high text-on-surface flex items-center justify-center hover:scale-110 transition-transform disabled:opacity-50"
          >
            <ArrowLeft size={24} />
          </button>
          <div className="text-center">
            <h1 className="text-3xl font-black font-headline text-on-surface tracking-tight">
              CRIAR CONTA
            </h1>
            <p className="text-on-surface-variant font-medium">
              Preencha seus dados para começar
            </p>
          </div>
          <div className="w-12" />
        </div>

        <form onSubmit={handleSubmit} className="bg-surface-container rounded-3xl p-8 shadow-xl border border-surface-container-high space-y-8">
          {currentError && (
            <div className="bg-error/10 text-error text-sm font-bold p-4 rounded-xl border border-error/20">
              {currentError}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Nome */}
            <div className="space-y-2">
              <label className="text-xs font-black text-on-surface-variant uppercase tracking-widest px-1">Nome</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant" size={20} />
                <input
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  onFocus={(e) => e.target.placeholder = ''}
                  onBlur={(e) => e.target.placeholder = 'Seu nome'}
                  className="w-full bg-surface-container-low p-4 pl-12 rounded-2xl text-on-surface font-medium focus:ring-2 focus:ring-primary/50 outline-none transition-all"
                  placeholder="Seu nome"
                />
              </div>
            </div>

            {/* Sobrenome */}
            <div className="space-y-2">
              <label className="text-xs font-black text-on-surface-variant uppercase tracking-widest px-1">Sobrenome</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant" size={20} />
                <input
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                  onFocus={(e) => e.target.placeholder = ''}
                  onBlur={(e) => e.target.placeholder = 'Seu sobrenome'}
                  className="w-full bg-surface-container-low p-4 pl-12 rounded-2xl text-on-surface font-medium focus:ring-2 focus:ring-primary/50 outline-none transition-all"
                  placeholder="Seu sobrenome"
                />
              </div>
            </div>

            {/* E-mail */}
            <div className="space-y-2">
              <label className="text-xs font-black text-on-surface-variant uppercase tracking-widest px-1">E-mail</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant" size={20} />
                <input
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  onFocus={(e) => e.target.placeholder = ''}
                  onBlur={(e) => e.target.placeholder = 'seu@email.com'}
                  className="w-full bg-surface-container-low p-4 pl-12 rounded-2xl text-on-surface font-medium focus:ring-2 focus:ring-primary/50 outline-none transition-all"
                  placeholder="seu@email.com"
                />
              </div>
            </div>

            {/* Telefone */}
            <div className="space-y-2">
              <label className="text-xs font-black text-on-surface-variant uppercase tracking-widest px-1">Telefone</label>
              <div className="relative">
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant" size={20} />
                <input
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  onFocus={(e) => e.target.placeholder = ''}
                  onBlur={(e) => e.target.placeholder = '(00) 00000-0000'}
                  className="w-full bg-surface-container-low p-4 pl-12 rounded-2xl text-on-surface font-medium focus:ring-2 focus:ring-primary/50 outline-none transition-all"
                  placeholder="(00) 00000-0000"
                />
              </div>
            </div>

            {/* Data de Nascimento */}
            <div className="space-y-2">
              <label className="text-xs font-black text-on-surface-variant uppercase tracking-widest px-1">Data de Nascimento</label>
              <div className="relative">
                <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant" size={20} />
                <input
                  name="birthDate"
                  type="date"
                  value={formData.birthDate}
                  onChange={handleChange}
                  className="w-full bg-surface-container-low p-4 pl-12 rounded-2xl text-on-surface font-medium focus:ring-2 focus:ring-primary/50 outline-none transition-all"
                />
              </div>
            </div>

            {/* Estado */}
            <div className="space-y-2">
              <label className="text-xs font-black text-on-surface-variant uppercase tracking-widest px-1">Estado</label>
              <div className="relative">
                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant" size={20} />
                <select
                  name="state"
                  value={formData.state}
                  onChange={handleChange}
                  className="w-full bg-surface-container-low p-4 pl-12 rounded-2xl text-on-surface font-medium focus:ring-2 focus:ring-primary/50 outline-none transition-all appearance-none"
                >
                  <option value="">Selecione o estado</option>
                  {ESTADOS_BRASIL.map(est => (
                    <option key={est.sigla} value={est.sigla}>{est.nome}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Cidade */}
            <div className="space-y-2">
              <label className="text-xs font-black text-on-surface-variant uppercase tracking-widest px-1">Cidade</label>
              <div className="relative">
                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant" size={20} />
                <select
                  name="city"
                  value={formData.city}
                  onChange={handleChange}
                  disabled={!formData.state}
                  className="w-full bg-surface-container-low p-4 pl-12 rounded-2xl text-on-surface font-medium focus:ring-2 focus:ring-primary/50 outline-none transition-all appearance-none disabled:opacity-50"
                >
                  <option value="">Selecione a cidade</option>
                  {formData.state && CIDADES_POR_ESTADO[formData.state]?.map(cid => (
                    <option key={cid} value={cid}>{cid}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="hidden md:block" />

            {/* Senha */}
            <div className="space-y-2">
              <label className="text-xs font-black text-on-surface-variant uppercase tracking-widest px-1">Senha</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant" size={20} />
                <input
                  name="password"
                  type="password"
                  value={formData.password}
                  onChange={handleChange}
                  onFocus={(e) => e.target.placeholder = ''}
                  onBlur={(e) => e.target.placeholder = '••••••••'}
                  className="w-full bg-surface-container-low p-4 pl-12 rounded-2xl text-on-surface font-medium focus:ring-2 focus:ring-primary/50 outline-none transition-all"
                  placeholder="••••••••"
                />
              </div>
            </div>

            {/* Confirmar Senha */}
            <div className="space-y-2">
              <label className="text-xs font-black text-on-surface-variant uppercase tracking-widest px-1">Confirmar Senha</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant" size={20} />
                <input
                  name="confirmPassword"
                  type="password"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  onFocus={(e) => e.target.placeholder = ''}
                  onBlur={(e) => e.target.placeholder = '••••••••'}
                  className="w-full bg-surface-container-low p-4 pl-12 rounded-2xl text-on-surface font-medium focus:ring-2 focus:ring-primary/50 outline-none transition-all"
                  placeholder="••••••••"
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-primary text-on-primary p-4 rounded-2xl font-black uppercase tracking-widest shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-70"
          >
            {isLoading ? (
              <div className="w-6 h-6 border-2 border-on-primary border-t-transparent rounded-full animate-spin" />
            ) : (
              <UserPlus size={20} />
            )}
            {isLoading ? 'Criando conta...' : 'Finalizar Cadastro'}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
