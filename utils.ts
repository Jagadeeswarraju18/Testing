import { BillingCycle, User } from './types';

export const getCurrencySymbol = (currency: string) => {
  switch (currency) {
    case 'USD': return '$';
    case 'EUR': return '€';
    case 'GBP': return '£';
    case 'JPY': return '¥';
    case 'INR': return '₹';
    case 'CAD': return 'C$';
    case 'AUD': return 'A$';
    case 'CNY': return '¥';
    case 'BRL': return 'R$';
    case 'MXN': return 'Mex$';
    case 'SGD': return 'S$';
    case 'AED': return 'dh';
    case 'ZAR': return 'R';
    case 'CHF': return 'CHF';
    case 'HKD': return 'HK$';
    case 'NZD': return 'NZ$';
    default: return currency;
  }
};

export const formatCurrency = (amount: number, currency: string) => {
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: currency }).format(amount);
  } catch (e) {
    return `${getCurrencySymbol(currency)}${amount.toFixed(2)}`;
  }
};

// Hardcoded Fallback Rates for Safety
const FALLBACK_RATES: Record<string, number> = {
  USD: 1, EUR: 0.92, GBP: 0.79, JPY: 151.5, INR: 84.0, CAD: 1.36, AUD: 1.52, CNY: 7.23, BRL: 5.15, MXN: 16.8, SGD: 1.35, AED: 3.67, ZAR: 18.8, CHF: 0.91, HKD: 7.83, NZD: 1.67
};

export const convertCurrency = (amount: number, from: string, to: string, rates: Record<string, number> | undefined): number => {
  if (from === to) return amount;

  // Use provided rates or fallback to hardcoded
  const activeRates = (rates && Object.keys(rates).length > 0) ? rates : FALLBACK_RATES;

  const rateFrom = activeRates[from] || 1;
  const rateTo = activeRates[to] || 1;

  return (amount / rateFrom) * rateTo;
};

export const calculateNextRenewal = (currentDate: string, cycle: BillingCycle, period: number = 1, unit: string = 'month'): string => {
  const date = new Date(currentDate);

  if (cycle === BillingCycle.Custom) {
    switch (unit) {
      case 'day': date.setDate(date.getDate() + period); break;
      case 'week': date.setDate(date.getDate() + (period * 7)); break;
      case 'month': date.setMonth(date.getMonth() + period); break;
      case 'year': date.setFullYear(date.getFullYear() + period); break;
    }
  } else {
    switch (cycle) {
      case BillingCycle.Weekly: date.setDate(date.getDate() + 7); break;
      case BillingCycle.Monthly: date.setMonth(date.getMonth() + 1); break;
      case BillingCycle.Quarterly: date.setMonth(date.getMonth() + 3); break;
      case BillingCycle.SemiAnnual: date.setMonth(date.getMonth() + 6); break;
      case BillingCycle.Annual: date.setFullYear(date.getFullYear() + 1); break;
      case BillingCycle.OneTime: break; // No renewal
    }
  }

  return date.toISOString();
};

/**
 * Get user's share of a subscription amount
 * @param amount - Total subscription price
 * @param sharedWith - Number of people sharing (0 = just user, 1 = 2 people, etc.)
 * @returns User's actual cost
 */
export const getUserShare = (amount: number, sharedWith: number | undefined): number => {
  if (!sharedWith || sharedWith <= 0) return amount;
  return amount / (sharedWith + 1);
};

/**
 * Check if subscription is shared
 */
export const isSharedSubscription = (sharedWith: number | undefined): boolean => {
  return !!sharedWith && sharedWith > 0;
};

/**
 * STRICT Premium Check
 * @returns true ONLY if premiumExpiryDate is in the future
 */
export const isUserPremium = (user: User | null | undefined): boolean => {
  if (!user || !user.premiumExpiryDate) return false;
  return new Date(user.premiumExpiryDate) > new Date();
};
