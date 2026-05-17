export type Screen = 'login' | 'signup' | 'dashboard' | 'reports' | 'add' | 'settings' | 'add-income' | 'add-expense' | 'calculator' | 'reminders' | 'admin' | 'help';

export type TransactionStatus = 'paid';

export interface IncomeItem {
  id: number;
  platform: string;
  amount: string;
  trips: string;
}

export interface IncomeRecord {
  id: number;
  date: string;
  items: IncomeItem[];
  notes: string;
  totalAmount: number;
  totalTrips: number;
  hoursWorked: string;
  kmDriven: number;
  type?: 'fixed' | 'variable';
  driverName?: string;
  status?: TransactionStatus;
  vehicleId?: string;
}

export interface ExpenseRecord {
  id: number;
  amount: string;
  category: string;
  date: string;
  notes: string;
  fuelType?: string;
  maintenanceType?: string;
  maintenanceGroup?: 'preventive' | 'corrective';
  subCategory?: string;
  costType?: 'fixed' | 'variable';
  liters?: string;
  pricePerLiter?: string;
  gnvVolume?: string;
  gnvPrice?: string;
  odometer?: string;
  isFullTank?: boolean;
  attachmentUrl?: string;
  driverName?: string;
  fuelLevel?: number;
  status?: TransactionStatus;
  platform?: string;
  vehicleId?: string;
}

export interface FinancialSummary {
  realProfit: number;
  grossEarnings: number;
  totalExpenses: number;
  totalTrips: number;
  hoursWorked: string;
  kmDriven: number;
  goalProgress: number;
}

export interface Goal {
  id: string;
  vehicleId?: string;
  month: number;
  year: number;
  monthly: number;
  daily: number;
  weekly: number;
  yearly: number;
  workHours: number; // Hours worked per day
  workDaysPerMonth: number;
  workDaysPerWeek?: number;
  categoryBudgets?: Record<string, number>;
}

export type GoalHistory = Record<string, Goal>;

export interface MaintenanceInterval {
  id: string;
  intervalKm: number;
  lastServiceOdometer: number;
  estimatedCost: number;
  isActive: boolean;
}

export interface Driver {
  id: string;
  name: string;
  phone?: string;
}

export interface Vehicle {
  id: string;
  brand: string;
  model: string;
  plate: string;
  year: string | number;
  driverId?: string;
  type?: 'car' | 'motorcycle' | 'truck' | 'van' | 'bus' | 'pickup';
  tankCapacity?: number | string;
  currentOdometer?: number;
  maintenanceIntervals?: Record<string, MaintenanceInterval>;
}

export interface Reminder {
  id: string;
  vehicleId?: string;
  title: string;
  notes?: string;
  channel: 'sms' | 'email';
  triggerType: 'km' | 'date';
  targetDate?: string;
  targetKm?: number;
  remindXDaysBefore?: number; // Optional: 3 or other
  remindEveryXKm?: number; // Optional: recurring
  remindAtKm?: number; // Optional: specific KM alert
  createdAt: string;
  isActive: boolean;
  lastNotifiedAt?: string;
}

export interface UserProfile {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  birthDate: string;
  city: string;
  state: string;
  password?: string;
  avatarUrl?: string;
  vehicles?: Vehicle[];
  drivers?: Driver[];
  reminders?: Reminder[];
  goalHistory?: GoalHistory;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
  isDefault?: boolean;
  subcategories?: string[];
  costType: 'fixed' | 'variable';
  defaultAmount?: number;
  budgetLimit?: number;
  defaultNotes?: string;
  defaultAttachmentUrl?: string;
}

export interface Platform {
  id: string;
  name: string;
  icon: string;
  color: string;
  isDefault?: boolean;
  type: 'fixed' | 'variable';
  defaultAmount?: number;
  defaultNotes?: string;
  defaultAttachmentUrl?: string;
}

export const CATEGORIES: Category[] = [
  // Fixed categories (Default ones requested - MARKED AS BLUE/FIXO)
  { id: 'ipva', name: 'ipva', icon: 'FileText', color: 'primary', isDefault: true, costType: 'fixed' },
  { id: 'insurance', name: 'insurance', icon: 'FileText', color: 'primary', isDefault: true, costType: 'fixed' },
  { id: 'financing', name: 'financing', icon: 'FileText', color: 'primary', isDefault: true, costType: 'fixed' },
  { id: 'licensing', name: 'licensing', icon: 'IdCard', color: 'primary', isDefault: true, costType: 'fixed' },
  { id: 'tracker', name: 'tracker', icon: 'Radar', color: 'primary', isDefault: true, costType: 'fixed' },
  { id: 'consortium', name: 'consortium', icon: 'FileText', color: 'primary', isDefault: true, costType: 'fixed' },

  { id: 'registration', name: 'registration', icon: 'IdCard', color: 'error', isDefault: true, costType: 'variable' },
  { id: 'tow', name: 'tow', icon: 'Truck', color: 'error', isDefault: true, costType: 'variable' },
  { id: 'fine', name: 'fine', icon: 'Gavel', color: 'error', isDefault: true, costType: 'variable' },
  { id: 'ferry', name: 'ferry', icon: 'Ship', color: 'error', isDefault: true, costType: 'variable' },
  { id: 'parking', name: 'parking', icon: 'SquareParking', color: 'error', isDefault: true, costType: 'variable' },
  { id: 'fuel', name: 'fuel', icon: 'Fuel', color: 'error', isDefault: true, costType: 'variable', subcategories: ['gasolineCommon', 'gasolineAdditive', 'gasolinePremium', 'ethanol', 'diesel', 'gnv'] },
  { id: 'food', name: 'food', icon: 'Utensils', color: 'error', isDefault: true, costType: 'variable', subcategories: ['lunch', 'snack', 'dinner'] },
  { id: 'maintenance', 
    name: 'maintenance', 
    icon: 'Wrench', 
    color: 'error', 
    isDefault: true, 
    costType: 'variable',
    subcategories: [
      'alignment', 'balancing', 'calibration', 'airFilter', 'fuelFilter', 
      'oilFilter', 'brakeFluid', 'transmissionFluid', 'oilChange', 
      'sparkPlugs', 'battery', 'fuelPump', 'horn', 
      'bodywork', 'powerSteering', 'mirrors', 
      'brakePad', 'radiator', 'suspension', 'brakeChange',
      'timingBelt', 'alternator', 'starterMotor', 'electronicInjection',
      'oxygenSensor', 'catalyticConverter', 'airConditioning', 'electricalSystem', 'lighting',
      'revision', 'carenagem', 'otherMaintenanceAdjustment'
    ]
  },
  { id: 'toll', name: 'toll', icon: 'Milestone', color: 'error', isDefault: true, costType: 'variable' },
  { id: 'washing', name: 'washing', icon: 'Droplets', color: 'error', isDefault: true, costType: 'variable' },
  { 
    id: 'accessories', 
    name: 'accessories', 
    icon: 'Triangle', 
    color: 'error', 
    isDefault: true, 
    costType: 'variable',
    subcategories: [
      'multimedia', 'alarm', 'extraSensors', 'other', 'phoneHolder', 
      'painting', 'film', 'wrapping', 'camera', 'led', 'floorMat', 'roofRack',
      'hydraulicJack', 'wrench', 'fireExtinguisher', 'triangle', 'firstAidKit'
    ] 
  },
  
  // Other fixed
  { id: 'internet', name: 'internet', icon: 'Wifi', color: 'primary', isDefault: true, costType: 'fixed' },
  { id: 'rent', name: 'rent', icon: 'KeyRound', color: 'primary', isDefault: true, costType: 'fixed', defaultAmount: 0 },
  { id: 'tax', name: 'tax', icon: 'FileText', color: 'primary', isDefault: true, costType: 'fixed' },
];

export const PLATFORMS: Platform[] = [
  { id: 'indrive', name: 'indrive', icon: 'Car', color: 'blue-500', isDefault: true, type: 'variable' },
  { id: 'other', name: 'other', icon: 'MoreHorizontal', color: 'neutral-200', isDefault: true, type: 'variable' },
  { id: 'taxi', name: 'taxi', icon: 'CarTaxiFront', color: 'yellow-500', isDefault: true, type: 'variable' },
  { id: 'freight', name: 'freight', icon: 'Truck', color: 'orange-600', isDefault: true, type: 'variable' },
  { id: 'carpool', name: 'carpool', icon: 'Users', color: 'green-500', isDefault: true, type: 'variable' },
  { id: 'ifood', name: 'ifood', icon: 'Bike', color: 'red-600', isDefault: true, type: 'variable' },
  { id: 'maxim', name: 'maxim', icon: 'M', color: 'yellow-300', isDefault: true, type: 'variable' },
  { id: 'rappi', name: 'rappi', icon: 'R', color: 'orange-500', isDefault: true, type: 'variable' },
  { id: 'james', name: 'james', icon: 'J', color: 'blue-400', isDefault: true, type: 'variable' },
  { id: 'cabify', name: 'cabify', icon: 'C', color: 'purple-600', isDefault: true, type: 'variable' },
  { id: '99taxi', name: '99taxi', icon: '99', color: 'yellow-500', isDefault: true, type: 'variable' },
  { id: '99top', name: '99top', icon: '99', color: 'yellow-600', isDefault: true, type: 'variable' },
  { id: '99pop', name: '99pop', icon: '99', color: 'yellow-400', isDefault: true, type: 'variable' },
  { id: 'uberblack', name: 'uberblack', icon: 'U', color: 'black', isDefault: true, type: 'variable' },
  { id: 'uberx', name: 'uberx', icon: 'U', color: 'black', isDefault: true, type: 'variable' },
  { id: 'ubercomfort', name: 'ubercomfort', icon: 'U', color: 'black', isDefault: true, type: 'variable' },
  { id: 'uberbag', name: 'uberbag', icon: 'U', color: 'black', isDefault: true, type: 'variable' },
  { id: 'ladydriver', name: 'ladydriver', icon: 'L', color: 'pink-500', isDefault: true, type: 'variable' },
  { id: 'sity', name: 'sity', icon: 'S', color: 'blue-600', isDefault: true, type: 'variable' },
  { id: 'wappa', name: 'wappa', icon: 'W', color: 'orange-400', isDefault: true, type: 'variable' },
  
  // Fixed platforms
];
