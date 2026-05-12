/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { TransactionFrequency } from '../types';

export const getLocalDateString = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const getNextDate = (date: string, frequency: TransactionFrequency): string => {
  const [year, month, day] = date.split('-').map(Number);
  const d = new Date(year, month - 1, day, 12, 0, 0);
  
  switch (frequency) {
    case 'weekly':
      d.setDate(d.getDate() + 7);
      break;
    case 'biweekly':
      d.setDate(d.getDate() + 15);
      break;
    case 'monthly': {
      const currentDay = d.getDate();
      d.setMonth(d.getMonth() + 1);
      if (d.getDate() !== currentDay) {
        d.setDate(0);
      }
      break;
    }
    case 'yearly': {
      const currentDay = d.getDate();
      const currentMonth = d.getMonth();
      d.setFullYear(d.getFullYear() + 1);
      if (d.getMonth() !== currentMonth) {
        d.setDate(0);
      }
      break;
    }
    default:
      return date;
  }
  return getLocalDateString(d);
};
