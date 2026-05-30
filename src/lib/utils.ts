/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export const getLocalDateString = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const getRawNextOccurrenceDate = (dateStr: string, recurrence: 'weekly' | 'biweekly' | 'monthly' | 'yearly'): string => {
  if (!dateStr) return '';
  try {
    const [year, month, day] = dateStr.split('-').map(Number);
    // Create Date object in local time to avoid timezone conversion offsets
    const date = new Date(year, month - 1, day, 12, 0, 0);
    
    if (recurrence === 'weekly') {
      date.setDate(date.getDate() + 7);
    } else if (recurrence === 'biweekly') {
      date.setDate(date.getDate() + 15); // User said "se for quinzenal, a proxima data de vencimento será 15 dias depois"
    } else if (recurrence === 'monthly') {
      // Monthly: day x of next month or last day if it doesn't exist
      const nextMonthIndex = month; // which is (month - 1) + 1
      const targetYear = year + Math.floor(nextMonthIndex / 12);
      const targetMonth = nextMonthIndex % 12; // 0-indexed (0 is Jan)
      
      const lastDayOfTargetMonth = new Date(targetYear, targetMonth + 1, 0).getDate();
      const targetDay = Math.min(day, lastDayOfTargetMonth);
      
      const nextDate = new Date(targetYear, targetMonth, targetDay, 12, 0, 0);
      return `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}-${String(nextDate.getDate()).padStart(2, '0')}`;
    } else if (recurrence === 'yearly') {
      const targetYear = year + 1;
      const lastDayOfTargetMonth = new Date(targetYear, month, 0).getDate();
      const targetDay = Math.min(day, lastDayOfTargetMonth);
      
      const nextDate = new Date(targetYear, month - 1, targetDay, 12, 0, 0);
      return `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}-${String(nextDate.getDate()).padStart(2, '0')}`;
    } else {
      date.setMonth(date.getMonth() + 1);
    }
    
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  } catch (e) {
    return dateStr;
  }
};

