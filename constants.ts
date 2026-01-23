import { ProviderSeed } from './types';

export const CATEGORIES = [
  { id: 'entertainment', name: 'Entertainment', icon: 'Film' },
  { id: 'music', name: 'Music', icon: 'Music' },
  { id: 'utilities', name: 'Utilities', icon: 'Zap' },
  { id: 'productivity', name: 'Productivity', icon: 'Briefcase' },
  { id: 'fitness', name: 'Fitness', icon: 'Activity' },
  { id: 'shopping', name: 'Shopping', icon: 'ShoppingBag' },
  { id: 'other', name: 'Other', icon: 'Box' },
];

export const POPULAR_PROVIDERS: ProviderSeed[] = [
  { id: 'netflix', name: 'Netflix', categories: ['entertainment'], defaultAmount: 15.49, cancellationUrl: 'https://www.netflix.com/cancelplan', annualPlanAvailable: false, logoUrl: 'https://www.google.com/s2/favicons?domain=netflix.com&sz=128' },
  { id: 'spotify', name: 'Spotify', categories: ['music'], defaultAmount: 10.99, cancellationUrl: 'https://support.spotify.com/us/article/cancel-premium/', annualPlanAvailable: true, logoUrl: 'https://www.google.com/s2/favicons?domain=spotify.com&sz=128' },
  { id: 'amazon_prime', name: 'Amazon Prime', categories: ['shopping', 'entertainment'], defaultAmount: 14.99, cancellationUrl: 'https://www.amazon.com/gp/help/customer/display.html', annualPlanAvailable: true, logoUrl: 'https://www.google.com/s2/favicons?domain=amazon.com&sz=128' },
  { id: 'disney_plus', name: 'Disney+', categories: ['entertainment'], defaultAmount: 13.99, cancellationUrl: 'https://www.disneyplus.com/account/subscription', annualPlanAvailable: true, logoUrl: 'https://www.google.com/s2/favicons?domain=disneyplus.com&sz=128' },
  { id: 'hulu', name: 'Hulu', categories: ['entertainment'], defaultAmount: 7.99, cancellationUrl: 'https://secure.hulu.com/account', annualPlanAvailable: true, logoUrl: 'https://www.google.com/s2/favicons?domain=hulu.com&sz=128' },
  { id: 'youtube_premium', name: 'YouTube Premium', categories: ['entertainment', 'music'], defaultAmount: 13.99, cancellationUrl: 'https://www.youtube.com/paid_memberships', annualPlanAvailable: true, logoUrl: 'https://www.google.com/s2/favicons?domain=youtube.com&sz=128' },
  { id: 'apple_one', name: 'Apple One', categories: ['productivity', 'entertainment'], defaultAmount: 19.95, cancellationUrl: 'https://support.apple.com/en-us/HT202039', annualPlanAvailable: false, logoUrl: 'https://www.google.com/s2/favicons?domain=apple.com&sz=128' },
  { id: 'dropbox', name: 'Dropbox', categories: ['productivity'], defaultAmount: 11.99, cancellationUrl: 'https://www.dropbox.com/account/plan', annualPlanAvailable: true, logoUrl: 'https://www.google.com/s2/favicons?domain=dropbox.com&sz=128' },
  { id: 'google_one', name: 'Google One', categories: ['productivity'], defaultAmount: 1.99, cancellationUrl: 'https://one.google.com/settings', annualPlanAvailable: true, logoUrl: 'https://www.google.com/s2/favicons?domain=google.com&sz=128' },
  { id: 'adobe_cc', name: 'Adobe Creative Cloud', categories: ['productivity'], defaultAmount: 54.99, cancellationUrl: 'https://account.adobe.com/plans', annualPlanAvailable: true, logoUrl: 'https://www.google.com/s2/favicons?domain=adobe.com&sz=128' },
  { id: 'chatgpt', name: 'ChatGPT Plus', categories: ['productivity'], defaultAmount: 20.00, cancellationUrl: 'https://chat.openai.com/#settings/DataControls', annualPlanAvailable: false, logoUrl: 'https://www.google.com/s2/favicons?domain=openai.com&sz=128' },
  { id: 'gym', name: 'Local Gym', categories: ['fitness'], defaultAmount: 30.00, annualPlanAvailable: true },
];

export const CURRENCY_TIMEZONE_MAP: Record<string, string> = {
  'USD': 'America/New_York',
  'EUR': 'Europe/Paris',
  'GBP': 'Europe/London',
  'JPY': 'Asia/Tokyo',
  'CAD': 'America/Toronto',
  'AUD': 'Australia/Sydney',
  'INR': 'Asia/Kolkata',
  'CNY': 'Asia/Shanghai',
  'BRL': 'America/Sao_Paulo',
};

// Seed Data for initial state
export const INITIAL_SUBSCRIPTIONS = [
  {
    id: '1',
    userId: 'u1',
    name: 'Netflix',
    category: 'entertainment',
    amount: 15.49,
    currency: 'USD',
    billingCycle: 'Monthly',
    renewalDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days from now
    status: 'Active',
    logoUrl: 'https://www.google.com/s2/favicons?domain=netflix.com&sz=128',
    autoRenew: true
  },
  {
    id: '2',
    userId: 'u1',
    name: 'Spotify',
    category: 'music',
    amount: 10.99,
    currency: 'USD',
    billingCycle: 'Monthly',
    renewalDate: new Date(Date.now() + 12 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'Active',
    logoUrl: 'https://www.google.com/s2/favicons?domain=spotify.com&sz=128',
    autoRenew: true
  },
  {
    id: '3',
    userId: 'u1',
    name: 'Adobe CC',
    category: 'productivity',
    amount: 54.99,
    currency: 'USD',
    billingCycle: 'Monthly',
    renewalDate: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'Active',
    logoUrl: 'https://www.google.com/s2/favicons?domain=adobe.com&sz=128',
    autoRenew: true
  }
];
