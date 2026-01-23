export enum BillingCycle {
  Weekly = 'Weekly',
  Monthly = 'Monthly',
  Quarterly = 'Quarterly',
  SemiAnnual = 'Semi-Annual',
  Annual = 'Annual',
  OneTime = 'OneTime',
  Custom = 'Custom' // e.g. every 2 years, every 14 days
}

export const SubscriptionStatus = {
  Active: 'active',
  Cancelled: 'cancelled',
  Deleted: 'deleted'
} as const;

export type SubscriptionStatus = typeof SubscriptionStatus[keyof typeof SubscriptionStatus];

export type WorkspaceType = 'personal' | 'business';

export interface Workspace {
  id: string;
  name: string;
  type: WorkspaceType;
  ownerId: string; // The user who owns this workspace
  currency: string;
  timezone: string; // IANA timezone e.g. "America/New_York", "Asia/Kolkata"
  timezone_set_manually?: boolean;
  monthlyBudget?: number;
  // Personal workspaces cannot be deleted
  isDefault?: boolean;
}

export interface WorkspaceMember {
  id: string; // member record id
  workspaceId: string;
  userId: string;
  role: 'owner' | 'admin' | 'member';
  department?: string; // e.g. "Marketing"
  joinedAt: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  // Currency/Budget moved to Workspace preference mostly, but user might have global defaults
  defaultCurrency?: string;
  isPremium?: boolean;
  premiumExpiryDate?: string;
}

export interface Subscription {
  id: string;
  workspaceId: string; // CRITICAL: Scoping

  // Basic Info
  name: string;
  category: string;
  amount: number;
  currency: string;
  billingCycle: BillingCycle;
  status: SubscriptionStatus;
  createdAt: string; // ISO Date for analytics/trends

  // Dates
  startDate?: string;
  renewalDate: string; // ISO Date
  lastUsedDate?: string; // For usage tracking
  cancelUrl?: string; // Direct link to cancellation page
  contractEndDate?: string; // B2B: When does the contract expire?

  // B2B Specific Fields (Nullable for Personal)
  department?: string; // "Engineering"
  ownerUserId?: string; // Who in the company owns this tool?
  ownerName?: string;
  seatsTotal?: number; // Bought
  seatsAssigned?: number; // Actually given to humans (Manual entry)

  // Metadata
  providerId?: string;
  logoUrl?: string;
  autoRenew: boolean;

  // V2 New Fields
  tags?: string[];
  paymentMethod?: string;
  reminderDays?: number[];
  notificationTime?: string; // "09:00"
  notificationFrequency?: 'once' | '1h' | '3h' | '5h' | '24h';
  notes?: string;
  sharedWith?: number; // Split the Bill: Number of people sharing
  sharedMembers?: string[]; // Names of people sharing this subscription
  previous_amount?: number; // For price change detection
  previous_amount_date?: string; // When price changed
  original_amount?: number; // Anchor pricing: The original entered amount
  original_currency?: string; // Anchor pricing: The original entered currency
}

export interface Insight {
  id: string;
  type: 'duplicate' | 'unused' | 'high_spend' | 'annual_save' | 'gemini_ai' | 'rule_based';
  message: string;
  savings?: number;
  severity: 'low' | 'medium' | 'high';
}

export interface ProviderSeed {
  id: string;
  name: string;
  categories: string[];
  logoUrl?: string;
  defaultAmount?: number;
  cancellationUrl?: string;
  annualPlanAvailable?: boolean;
}