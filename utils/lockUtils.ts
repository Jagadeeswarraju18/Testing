import { Subscription, User } from '../types';

/**
 * Identifies which subscriptions should be locked for a user based on their premium status.
 * Rule: Free users only get their first 6 active subscriptions (sorted by creation date).
 * Anything beyond that is locked.
 * 
 * @param subscriptions List of usage subscriptions
 * @param isPremium Boolean indicating if user has Pro/Premium
 * @returns Set of Subscription IDs that are LOCKED
 */
export const getLockedSubscriptionIds = (subscriptions: Subscription[], isPremium: boolean): Set<string> => {
    // 1. If Premium, nothing is locked.
    if (isPremium) {
        return new Set();
    }

    // 2. Filter for Active subscriptions only.
    const activeSubs = subscriptions.filter(s => s.status === 'active');

    // 3. If within limit, nothing locked.
    if (activeSubs.length <= 6) {
        return new Set();
    }

    // 4. Sort by Created Date (Oldest First = Safe).
    // This ensures consistency. You keep your "first" 6.
    // If createdAt is missing (legacy), fallback to id or something stable.
    const sorted = [...activeSubs].sort((a, b) => {
        const dateA = new Date(a.createdAt || 0).getTime();
        const dateB = new Date(b.createdAt || 0).getTime();
        return dateA - dateB;
    });

    // 5. Take everything after index 5 (6th item)
    const lockedSubs = sorted.slice(6);

    return new Set(lockedSubs.map(s => s.id));
};
