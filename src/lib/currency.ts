
export const parseLocaleNumber = (value: string, language: string) => {
  if (!value) return 0;
  
  // If the value contains both . and , we need to be careful
  // If it contains only one, we can be more flexible
  const hasComma = value.includes(',');
  const hasDot = value.includes('.');
  
  let cleanValue = value;
  
  if (hasComma && !hasDot) {
    // Likely European decimal (e.g. "45,5")
    cleanValue = value.replace(',', '.');
  } else if (hasDot && !hasComma) {
    // Likely US decimal (e.g. "45.5")
    cleanValue = value; 
  } else if (hasDot && hasComma) {
    // Both present. The last one is the decimal.
    if (value.lastIndexOf(',') > value.lastIndexOf('.')) {
      // e.g. "1.234,56"
      cleanValue = value.replace(/\./g, '').replace(',', '.');
    } else {
      // e.g. "1,234.56"
      cleanValue = value.replace(/,/g, '');
    }
  }
  
  // Final cleanup: remove anything that isn't a digit or the first dot
  const parts = cleanValue.split('.');
  const integerPart = parts[0].replace(/\D/g, '');
  const decimalPart = parts.length > 1 ? parts[1].replace(/\D/g, '') : '';
  
  const finalStr = decimalPart ? `${integerPart}.${decimalPart}` : integerPart;
  return parseFloat(finalStr) || 0;
};

export const formatMaskedCurrency = (value: string, language: string) => {
  // Remove TUDO que não for número
  const digits = value.replace(/\D/g, '');
  
  // Converte para valor decimal (ex: 123 -> 1.23)
  const numberValue = parseInt(digits || '0', 10) / 100;
  
  // Retorna formatado
  return numberValue.toLocaleString(language, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

export const formatLocaleCurrency = (value: number | string, language: string) => {
  const num = typeof value === 'string' ? parseLocaleNumber(value, language) : value;
  return num.toLocaleString(language, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};
