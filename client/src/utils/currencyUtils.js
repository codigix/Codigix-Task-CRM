/**
 * Formats a number as Indian Rupees (INR)
 * @param {number|string} value - The amount to format
 * @returns {string} - Formatted currency string
 */
export const formatCurrency = (value) => {
  if (value === undefined || value === null || value === '') return '₹0.00';
  
  const num = typeof value === 'string' ? parseFloat(value) : value;
  
  if (isNaN(num)) return '₹0.00';

  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
};

export const formatINR = (value) => formatCurrency(value);

/**
 * Returns the currency symbol for the system
 * @returns {string}
 */
export const getCurrencySymbol = () => '₹';

/**
 * Returns the currency code for the system
 * @returns {string}
 */
export const getCurrencyCode = () => 'INR';
