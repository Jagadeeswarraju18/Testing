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

// ============================================
// PAYMENT MODE UTILITIES
// ============================================

/**
 * Known auto-renew services (SaaS, streaming, cloud)
 * These services auto-charge so we should never show "overdue"
 */
export const AUTO_RENEW_SERVICES = [
  'netflix', 'spotify', 'disney', 'amazon', 'prime', 'apple', 'youtube',
  'hbo', 'hulu', 'adobe', 'microsoft', 'google one', 'icloud', 'dropbox',
  'onedrive', 'notion', 'slack', 'zoom', 'chatgpt', 'openai', 'canva',
  'figma', 'github', 'netlify', 'vercel', 'aws', 'cloudflare', 'heroku',
  'digital ocean', 'linkedin', 'twitter', 'x premium', 'twitch', 'patreon',
  'substack', 'medium', 'grammarly', 'todoist', 'evernote', 'lastpass',
  '1password', 'nordvpn', 'expressvpn', 'surfshark', 'paramount', 'peacock',
  'discovery', 'max', 'crunchyroll', 'funimation', 'audible', 'kindle',
  'playstation', 'xbox', 'nintendo', 'steam', 'epic games', 'ea play',
  'ubisoft', 'geforce now', 'stadia', 'apple tv', 'apple music', 'apple arcade',
  'google workspace', 'office 365', 'google storage', 'google drive',
];

/**
 * Detect if a subscription name is likely auto-renew
 */
export const isAutoRenewService = (name: string): boolean => {
  const nameLower = name.toLowerCase();
  return AUTO_RENEW_SERVICES.some(service => nameLower.includes(service));
};

/**
 * Get default payment mode for a subscription
 */
export const getDefaultPaymentMode = (name: string): 'auto_renew' | 'manual_pay' => {
  return isAutoRenewService(name) ? 'auto_renew' : 'auto_renew'; // Default to auto_renew
};

/**
 * Check if we should auto-advance the billing date
 * Returns true only if:
 * 1. Subscription is auto_renew mode
 * 2. Current billing date is in the past
 * 3. We haven't already auto-renewed in this billing cycle
 */
export const shouldAutoAdvance = (
  renewalDate: string,
  paymentMode: 'auto_renew' | 'manual_pay' | undefined,
  lastAutoRenewed: string | undefined,
  billingCycle: BillingCycle
): boolean => {
  // Only auto-renew subscriptions advance automatically
  if (paymentMode === 'manual_pay') return false;

  const now = new Date();
  const renewal = new Date(renewalDate);

  // Billing date must be in the past
  if (renewal > now) return false;

  // Check if we already auto-renewed recently (within this cycle)
  if (lastAutoRenewed) {
    const lastRenewed = new Date(lastAutoRenewed);

    // Calculate days since last auto-renew
    const daysSinceRenew = Math.floor((now.getTime() - lastRenewed.getTime()) / (1000 * 60 * 60 * 24));

    // Calculate minimum days between renewals based on billing cycle
    let minDays = 28; // Default to monthly
    switch (billingCycle) {
      case BillingCycle.Weekly: minDays = 6; break;
      case BillingCycle.Monthly: minDays = 28; break;
      case BillingCycle.Quarterly: minDays = 85; break;
      case BillingCycle.SemiAnnual: minDays = 170; break;
      case BillingCycle.Annual: minDays = 360; break;
    }

    // If we renewed recently, don't advance again
    if (daysSinceRenew < minDays) return false;
  }

  return true;
};

/**
 * Get display status for a subscription based on payment mode
 */
export const getSubscriptionStatus = (
  renewalDate: string,
  paymentMode: 'auto_renew' | 'manual_pay' | undefined,
  lastPaidDate: string | undefined
): { label: string; type: 'renewed' | 'due' | 'overdue' | 'paid' | 'upcoming' } => {
  const now = new Date();
  const renewal = new Date(renewalDate);
  const daysUntil = Math.ceil((renewal.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  // Auto-renew subscriptions
  if (paymentMode !== 'manual_pay') {
    if (daysUntil < 0) {
      const absDays = Math.abs(daysUntil);
      // Only show "Renewed X days ago" for up to 5 days, then show next renewal
      if (absDays <= 5) {
        return { label: `Renewed ${absDays} ${absDays === 1 ? 'day' : 'days'} ago`, type: 'renewed' };
      } else {
        return { label: `Next renewal: ${renewal.toLocaleDateString()}`, type: 'upcoming' };
      }
    } else if (daysUntil === 0) {
      return { label: 'Renews today', type: 'upcoming' };
    } else if (daysUntil <= 7) {
      return { label: `Renews in ${daysUntil} ${daysUntil === 1 ? 'day' : 'days'}`, type: 'upcoming' };
    } else {
      return { label: `Next renewal: ${renewal.toLocaleDateString()}`, type: 'upcoming' };
    }
  }

  // Manual-pay subscriptions
  if (daysUntil < 0) {
    const absDays = Math.abs(daysUntil);
    return { label: `${absDays} ${absDays === 1 ? 'day' : 'days'} overdue`, type: 'overdue' };
  } else if (daysUntil === 0) {
    return { label: 'Due today', type: 'due' };
  } else if (daysUntil <= 7) {
    return { label: `Due in ${daysUntil} ${daysUntil === 1 ? 'day' : 'days'}`, type: 'due' };
  } else {
    return { label: `Due: ${renewal.toLocaleDateString()}`, type: 'upcoming' };
  }
};

/**
 * Advance billing date from the CURRENT billing date (not payment date).
 * This keeps the billing cycle fixed (e.g., 1st → 1st of next month).
 * @param currentBillingDate - The current billing/renewal date
 * @param billingCycle - The subscription billing cycle
 * @returns New billing date (ISO string)
 */
export const advanceBillingDateFromCycle = (
  currentBillingDate: string,
  billingCycle: BillingCycle
): string => {
  return calculateNextRenewal(currentBillingDate, billingCycle);
};
