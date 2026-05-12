import { ExpenseRecord } from '../types';
import { parseLocaleNumber } from './currency';

export interface FuelStats {
  kmPerLiter: number;
  lastPrice: number;
  lastDate: string;
  measurementsCount: number;
}

export interface FuelPerformance {
  ethanol?: FuelStats;
  gasoline?: FuelStats;
  efficiencyRatio?: number;
}

export type FuelCalculationMode = 'all' | 'recent';

export interface FuelCalculationOptions {
  mode: FuelCalculationMode;
}

export function calculateFuelPerformance(
  expenses: ExpenseRecord[], 
  language: string,
  options: FuelCalculationOptions = { mode: 'all' }
): FuelPerformance {
  const results: Record<string, { kmPerLiter: number; lastDate: string; lastPrice: number; fullTankCount: number; measurements: number[] }> = {};
  
  const fuelHistory = expenses
    .filter(e => e.category === 'fuel' && e.odometer && e.status === 'paid')
    .sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      if (dateA !== dateB) return dateA - dateB;
      return parseLocaleNumber(a.odometer!, language) - parseLocaleNumber(b.odometer!, language);
    });

  const getEffectiveType = (type: string | undefined) => {
    if (!type) return 'other';
    if (type === 'gasolineCommon' || type === 'gasolineAdditive' || type === 'gasolinePremium') {
      return 'gasoline';
    }
    return type;
  };

  const typeSegments: Record<string, { totalKm: number; totalLiters: number; count: number; measurements: { km: number; liters: number }[] }> = {
    ethanol: { totalKm: 0, totalLiters: 0, count: 0, measurements: [] },
    gasoline: { totalKm: 0, totalLiters: 0, count: 0, measurements: [] }
  };

  let lastFullTank: ExpenseRecord | null = null;
  let accumulatedLiters = 0;
  let currentEffectiveType: string | null = null;
  let lastPrice: Record<string, number> = {};
  let lastDate: Record<string, string> = {};

  for (const record of fuelHistory) {
    const type = getEffectiveType(record.fuelType);
    if (type !== 'ethanol' && type !== 'gasoline') continue;
    
    if (lastFullTank) {
      if (type !== currentEffectiveType) {
        lastFullTank = record.isFullTank ? record : null;
        currentEffectiveType = record.isFullTank ? type : null;
        accumulatedLiters = 0;
        continue;
      }

      accumulatedLiters += parseLocaleNumber(record.liters || record.gnvVolume || '0', language);

      if (record.isFullTank) {
        const dist = parseLocaleNumber(record.odometer!, language) - parseLocaleNumber(lastFullTank.odometer!, language);
        
        if (dist > 0 && accumulatedLiters > 0) {
          const efficiency = dist / accumulatedLiters;
          typeSegments[type].totalKm += dist;
          typeSegments[type].totalLiters += accumulatedLiters;
          typeSegments[type].count += 1;
          typeSegments[type].measurements.push({ km: dist, liters: accumulatedLiters });
          lastDate[type] = record.date;
          lastPrice[type] = parseLocaleNumber(record.pricePerLiter || record.gnvPrice || '0', language);
        }
        
        lastFullTank = record;
        accumulatedLiters = 0;
      }
    } else if (record.isFullTank) {
      lastFullTank = record;
      currentEffectiveType = type;
      accumulatedLiters = 0;
    }
  }

  const performance: FuelPerformance = {};
  
  ['ethanol', 'gasoline'].forEach(type => {
    const segment = typeSegments[type];
    if (segment.count > 0) {
      let kmPerLiter = 0;
      if (options.mode === 'recent' && segment.measurements.length > 0) {
        // Weighted average of the last 2 measurements if available
        const lastTwo = segment.measurements.slice(-2);
        const sumKm = lastTwo.reduce((acc, m) => acc + m.km, 0);
        const sumLiters = lastTwo.reduce((acc, m) => acc + m.liters, 0);
        kmPerLiter = sumLiters > 0 ? sumKm / sumLiters : 0;
      } else {
        kmPerLiter = segment.totalKm / segment.totalLiters;
      }

      performance[type as 'ethanol' | 'gasoline'] = {
        kmPerLiter,
        lastPrice: lastPrice[type] || 0,
        lastDate: lastDate[type] || '',
        measurementsCount: segment.count
      };
    }
  });
  
  if (performance.ethanol && performance.gasoline) {
    performance.efficiencyRatio = (performance.ethanol.kmPerLiter / performance.gasoline.kmPerLiter) * 100;
  }

  return performance;
}
