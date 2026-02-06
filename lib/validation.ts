/**
 * Input validation utilities for financial data
 */

// Maximum values to prevent unreasonable inputs
export const MAX_QUANTITY = 1_000_000_000; // 1 billion units
export const MAX_PRICE = 10_000_000; // $10 million per unit
export const MAX_TOTAL_VALUE = 1_000_000_000_000; // $1 trillion
export const MAX_BUDGET_AMOUNT = 100_000_000; // $100 million for budget fields

/**
 * Validate and sanitize a numeric string input
 * Returns the sanitized value or null if invalid
 */
export function sanitizeNumericInput(
  value: string,
  options: {
    allowDecimal?: boolean;
    maxValue?: number;
    minValue?: number;
  } = {}
): string {
  const { allowDecimal = true, maxValue, minValue = 0 } = options;

  // Remove any non-numeric characters except decimal point
  let sanitized = value.replace(/[^0-9.]/g, '');

  // Handle multiple decimal points - keep only the first
  if (allowDecimal) {
    const parts = sanitized.split('.');
    if (parts.length > 2) {
      sanitized = parts[0] + '.' + parts.slice(1).join('');
    }
  } else {
    sanitized = sanitized.replace(/\./g, '');
  }

  // Parse the number
  const numValue = parseFloat(sanitized);

  // If not a valid number, return empty string
  if (isNaN(numValue)) {
    return '';
  }

  // Enforce minimum value (no negatives)
  if (numValue < minValue) {
    return minValue.toString();
  }

  // Enforce maximum value
  if (maxValue !== undefined && numValue > maxValue) {
    return maxValue.toString();
  }

  return sanitized;
}

/**
 * Validate a quantity value
 */
export function validateQuantity(value: string): {
  isValid: boolean;
  sanitized: string;
  error?: string;
} {
  const sanitized = sanitizeNumericInput(value, {
    allowDecimal: true,
    maxValue: MAX_QUANTITY,
    minValue: 0,
  });

  const numValue = parseFloat(sanitized);

  if (!sanitized || isNaN(numValue)) {
    return { isValid: false, sanitized: '', error: 'Please enter a valid quantity' };
  }

  if (numValue <= 0) {
    return { isValid: false, sanitized, error: 'Quantity must be greater than 0' };
  }

  if (numValue > MAX_QUANTITY) {
    return { isValid: false, sanitized: MAX_QUANTITY.toString(), error: `Maximum quantity is ${MAX_QUANTITY.toLocaleString()}` };
  }

  return { isValid: true, sanitized };
}

/**
 * Validate a price value
 */
export function validatePrice(value: string): {
  isValid: boolean;
  sanitized: string;
  error?: string;
} {
  const sanitized = sanitizeNumericInput(value, {
    allowDecimal: true,
    maxValue: MAX_PRICE,
    minValue: 0,
  });

  const numValue = parseFloat(sanitized);

  if (!sanitized || isNaN(numValue)) {
    return { isValid: false, sanitized: '', error: 'Please enter a valid price' };
  }

  if (numValue <= 0) {
    return { isValid: false, sanitized, error: 'Price must be greater than 0' };
  }

  if (numValue > MAX_PRICE) {
    return { isValid: false, sanitized: MAX_PRICE.toString(), error: `Maximum price is $${MAX_PRICE.toLocaleString()}` };
  }

  return { isValid: true, sanitized };
}

/**
 * Validate a budget amount (income, expenses, etc.)
 */
export function validateBudgetAmount(value: string): {
  isValid: boolean;
  sanitized: string;
  numValue: number;
  error?: string;
} {
  const sanitized = sanitizeNumericInput(value, {
    allowDecimal: false, // Budget amounts are typically whole dollars
    maxValue: MAX_BUDGET_AMOUNT,
    minValue: 0,
  });

  const numValue = parseInt(sanitized, 10) || 0;

  if (numValue < 0) {
    return { isValid: false, sanitized: '0', numValue: 0, error: 'Amount cannot be negative' };
  }

  if (numValue > MAX_BUDGET_AMOUNT) {
    return {
      isValid: false,
      sanitized: MAX_BUDGET_AMOUNT.toString(),
      numValue: MAX_BUDGET_AMOUNT,
      error: `Maximum amount is $${MAX_BUDGET_AMOUNT.toLocaleString()}`
    };
  }

  return { isValid: true, sanitized, numValue };
}

/**
 * Format a number for display with commas
 */
export function formatNumberWithCommas(value: number): string {
  return value.toLocaleString();
}

/**
 * Parse a formatted number string (with commas) back to a number
 */
export function parseFormattedNumber(value: string): number {
  return parseFloat(value.replace(/,/g, '')) || 0;
}

/**
 * Check if a string represents a valid positive number
 */
export function isValidPositiveNumber(value: string): boolean {
  const num = parseFloat(value);
  return !isNaN(num) && num > 0 && isFinite(num);
}

/**
 * Check if total portfolio value is reasonable
 */
export function validateTotalValue(value: number): {
  isValid: boolean;
  error?: string;
} {
  if (value < 0) {
    return { isValid: false, error: 'Total value cannot be negative' };
  }

  if (value > MAX_TOTAL_VALUE) {
    return { isValid: false, error: `Total value exceeds maximum of $${MAX_TOTAL_VALUE.toLocaleString()}` };
  }

  return { isValid: true };
}
