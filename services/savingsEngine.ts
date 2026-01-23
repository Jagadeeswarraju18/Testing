import { Subscription, BillingCycle, Insight } from '../types';
import { POPULAR_PROVIDERS } from '../constants';
import { getUserShare } from '../utils';

export interface SavingsSuggestion {
    id: string;
    type: 'unused' | 'price_increase' | 'annual_switch' | 'trial_ending' | 'duplicate' | 'high_spend';
    title: string;
    message: string;
    savings?: number;
    severity: 'low' | 'medium' | 'high';
    actionLabel?: string;
    subscriptionId?: string;
}

/**
 * Generates smart savings suggestions based on subscription data
 */
export function generateSavingsSuggestions(
    subscriptions: Subscription[],
    currency: string
): SavingsSuggestion[] {
    const suggestions: SavingsSuggestion[] = [];
    const activeSubs = subscriptions.filter(s => s.status === 'active');
    const now = new Date();

    // 1. UNUSED SUBSCRIPTIONS (not used in 30+ days)
    activeSubs.forEach(sub => {
        if (sub.lastUsedDate) {
            const daysSinceUsed = Math.floor((now.getTime() - new Date(sub.lastUsedDate).getTime()) / (1000 * 60 * 60 * 24));

            if (daysSinceUsed >= 45) {
                suggestions.push({
                    id: `unused-${sub.id}`,
                    type: 'unused',
                    title: `${sub.name} unused for ${daysSinceUsed} days`,
                    message: `Consider cancelling or pausing this subscription to save money.`,
                    savings: sub.amount,
                    severity: 'high',
                    actionLabel: 'Review',
                    subscriptionId: sub.id
                });
            } else if (daysSinceUsed >= 30) {
                suggestions.push({
                    id: `unused-${sub.id}`,
                    type: 'unused',
                    title: `Haven't used ${sub.name} in a month`,
                    message: `Mark as used or consider if you still need it.`,
                    savings: sub.amount,
                    severity: 'medium',
                    actionLabel: 'Mark Used',
                    subscriptionId: sub.id
                });
            }
        }
    });

    // 2. PRICE INCREASES
    activeSubs.forEach(sub => {
        if (sub.previous_amount && sub.previous_amount < sub.amount) {
            const increase = sub.amount - sub.previous_amount;
            const percentIncrease = Math.round((increase / sub.previous_amount) * 100);

            suggestions.push({
                id: `price-${sub.id}`,
                type: 'price_increase',
                title: `${sub.name} price updated (+${percentIncrease}%)`,
                message: `Changed from ${sub.currency} ${sub.previous_amount} to ${sub.currency} ${sub.amount}. Review if still worth it.`,
                severity: percentIncrease >= 20 ? 'high' : 'medium',
                actionLabel: 'Review',
                subscriptionId: sub.id
            });
        }
    });

    // 3. ANNUAL SWITCH OPPORTUNITY
    activeSubs.forEach(sub => {
        if (sub.billingCycle === BillingCycle.Monthly) {
            // Check if provider has annual option
            const provider = POPULAR_PROVIDERS.find(p =>
                p.name.toLowerCase() === sub.name.toLowerCase()
            );

            if (provider?.annualPlanAvailable !== false) {
                const annualSavings = Math.round(sub.amount * 12 * 0.17); // ~17% typical annual savings

                suggestions.push({
                    id: `annual-${sub.id}`,
                    type: 'annual_switch',
                    title: `Switch ${sub.name} to annual`,
                    message: `Save ~17% by switching to yearly billing.`,
                    savings: annualSavings,
                    severity: 'low',
                    actionLabel: 'Switch',
                    subscriptionId: sub.id
                });
            }
        }
    });

    // 4. TRIAL ENDING SOON
    activeSubs.forEach(sub => {
        if (sub.tags?.includes('Trial')) {
            const renewalDate = new Date(sub.renewalDate);
            const daysLeft = Math.ceil((renewalDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

            if (daysLeft <= 3 && daysLeft >= 0) {
                suggestions.push({
                    id: `trial-${sub.id}`,
                    type: 'trial_ending',
                    title: `${sub.name} trial ends in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}!`,
                    message: `Cancel now to avoid being charged ${sub.amount} ${sub.currency}.`,
                    savings: sub.amount,
                    severity: 'high',
                    actionLabel: 'Cancel Now',
                    subscriptionId: sub.id
                });
            } else if (daysLeft <= 7 && daysLeft > 3) {
                suggestions.push({
                    id: `trial-${sub.id}`,
                    type: 'trial_ending',
                    title: `${sub.name} trial ending soon`,
                    message: `${daysLeft} days left. Decide if you want to keep it.`,
                    severity: 'medium',
                    subscriptionId: sub.id
                });
            }
        }
    });

    // 5. DUPLICATE CATEGORIES
    const categoryCount: Record<string, Subscription[]> = {};
    activeSubs.forEach(sub => {
        const cat = sub.category || 'other';
        if (!categoryCount[cat]) categoryCount[cat] = [];
        categoryCount[cat].push(sub);
    });

    Object.entries(categoryCount).forEach(([category, subs]) => {
        if (subs.length >= 3 && category !== 'other') {
            const totalSpend = subs.reduce((sum, s) => sum + s.amount, 0);
            suggestions.push({
                id: `duplicate-${category}`,
                type: 'duplicate',
                title: `${subs.length} subscriptions in ${category}`,
                message: `You're spending ${totalSpend.toFixed(0)} ${currency}/mo on ${category}. Consider consolidating.`,
                severity: 'medium'
            });
        }
    });

    // 6. HIGH SPEND ALERT (single sub > 30% of total)
    const totalMonthlySpend = activeSubs.reduce((sum, s) => {
        let monthly = s.amount;
        if (s.billingCycle === BillingCycle.Annual) monthly /= 12;
        else if (s.billingCycle === BillingCycle.Quarterly) monthly /= 3;
        return sum + monthly;
    }, 0);

    activeSubs.forEach(sub => {
        let monthly = sub.amount;
        if (sub.billingCycle === BillingCycle.Annual) monthly /= 12;
        else if (sub.billingCycle === BillingCycle.Quarterly) monthly /= 3;

        const percentage = (monthly / totalMonthlySpend) * 100;

        if (percentage >= 40 && monthly > 500) { // Only flag if significant absolute amount
            suggestions.push({
                id: `highspend-${sub.id}`,
                type: 'high_spend',
                title: `${sub.name} is ${Math.round(percentage)}% of your spending`,
                message: `This single subscription dominates your budget.`,
                severity: 'medium',
                subscriptionId: sub.id
            });
        }
    });

    // Sort by severity (high first)
    const severityOrder = { high: 0, medium: 1, low: 2 };
    suggestions.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

    return suggestions;
}

/**
 * Get count of suggestions by severity
 */
export function getSuggestionStats(suggestions: SavingsSuggestion[]) {
    return {
        high: suggestions.filter(s => s.severity === 'high').length,
        medium: suggestions.filter(s => s.severity === 'medium').length,
        low: suggestions.filter(s => s.severity === 'low').length,
        totalSavings: suggestions.reduce((sum, s) => sum + (s.savings || 0), 0)
    };
}
