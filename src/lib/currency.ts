
export const parseLocaleNumber = (value: any, language: string) => {
  if (value === undefined || value === null) return 0;
  if (typeof value === 'number') return value;
  
  const strValue = String(value).trim();
  if (!strValue) return 0;
  
  // If the value contains both . and , we need to be careful
  // If it contains only one, we can be more flexible
  const hasComma = strValue.includes(',');
  const hasDot = strValue.includes('.');
  
  let cleanValue = strValue;
  
  if (hasComma && !hasDot) {
    // Likely European decimal (e.g. "45,5")
    cleanValue = strValue.replace(',', '.');
  } else if (hasDot && !hasComma) {
    // Likely US decimal (e.g. "45.5")
    cleanValue = strValue; 
  } else if (hasDot && hasComma) {
    // Both present. The last one is the decimal.
    if (strValue.lastIndexOf(',') > strValue.lastIndexOf('.')) {
      // e.g. "1.234,56"
      cleanValue = strValue.replace(/\./g, '').replace(',', '.');
    } else {
      // e.g. "1,234.56"
      cleanValue = strValue.replace(/,/g, '');
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

export const handleCurrencySelection = (e: any) => {
  if (e && e.currentTarget) {
    const input = e.currentTarget;
    const len = input.value.length;
    input.setSelectionRange(len, len);
  }
};

export const handleCurrencyKeyDown = (
  e: any,
  currentValue: string,
  onChange: (newValue: string) => void,
  language: string
) => {
  const allowedKeys = ['Tab', 'Enter', 'Escape', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'];
  if (allowedKeys.includes(e.key)) {
    return;
  }
  
  if (e.ctrlKey || e.metaKey || e.altKey) {
    return;
  }

  e.preventDefault();

  const digits = currentValue.replace(/\D/g, '');

  if (e.key >= '0' && e.key <= '9') {
    const newDigits = (digits === '0' || !digits) ? e.key : digits + e.key;
    onChange(formatMaskedCurrency(newDigits, language));
  } else if (e.key === 'Backspace') {
    if (digits.length <= 1) {
      onChange(formatMaskedCurrency('0', language));
    } else {
      const newDigits = digits.substring(0, digits.length - 1);
      onChange(formatMaskedCurrency(newDigits, language));
    }
  }

  if (e.currentTarget) {
    const target = e.currentTarget;
    setTimeout(() => {
      const len = target.value.length;
      target.setSelectionRange(len, len);
    }, 0);
  }
};

