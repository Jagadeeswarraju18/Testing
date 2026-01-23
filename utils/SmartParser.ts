import { BillingCycle } from '../types';
import { POPULAR_PROVIDERS } from '../constants';


interface ParsedSubscription {
    name?: string;
    amount?: string;
    currency?: string;
    billingCycle?: BillingCycle;
    renewalDate?: string; // ISO String YYYY-MM-DD
}

// List of popular subscription service names to match against voice input
const KNOWN_SERVICES = [
    // From POPULAR_PROVIDERS
    ...POPULAR_PROVIDERS.map(p => p.name.toLowerCase()),
    // Additional common names/variations
    'netflix', 'spotify', 'youtube', 'youtube premium', 'youtube music',
    'amazon', 'amazon prime', 'prime video', 'prime',
    'disney', 'disney plus', 'disney+', 'hulu', 'hbo', 'hbo max', 'max',
    'apple', 'apple music', 'apple tv', 'icloud', 'apple one', 'apple arcade',
    'google', 'google one', 'google drive', 'google play', 'google workspace',
    'microsoft', 'microsoft 365', 'office 365', 'xbox', 'xbox game pass', 'game pass',
    'playstation', 'ps plus', 'playstation plus', 'ps now',
    'adobe', 'creative cloud', 'photoshop', 'lightroom', 'premiere',
    'dropbox', 'notion', 'evernote', 'todoist', 'trello', 'slack', 'zoom',
    'github', 'github copilot', 'copilot', 'cursor', 'chatgpt', 'openai', 'claude',
    'canva', 'figma', 'grammarly', 'medium', 'substack',
    'expressvpn', 'nordvpn', 'surfshark', 'vpn',
    'audible', 'kindle', 'kindle unlimited', 'scribd',
    'duolingo', 'headspace', 'calm', 'peloton', 'strava',
    'crunchyroll', 'funimation', 'paramount', 'paramount plus', 'peacock',
    'tidal', 'deezer', 'pandora', 'soundcloud',
    'linkedin', 'linkedin premium', 'twitter', 'x premium', 'reddit premium',
    'jio', 'airtel', 'hotstar', 'zee5', 'sonyliv', 'voot', 'mubi',
    '1password', 'lastpass', 'dashlane', 'bitwarden',
    'mailchimp', 'hubspot', 'salesforce', 'zendesk', 'intercom',
    'aws', 'azure', 'digital ocean', 'heroku', 'vercel', 'netlify',
    'gym', 'fitness', 'crossfit'
];

export const parseVoiceInput = (text: string): ParsedSubscription => {
    const lowerText = text.toLowerCase();

    const result: ParsedSubscription = {};

    // 1. Detect Billing Cycle
    if (lowerText.includes('year') || lowerText.includes('annual')) {
        result.billingCycle = BillingCycle.Annual;
    } else if (lowerText.includes('week')) {
        result.billingCycle = BillingCycle.Weekly;
    } else if (lowerText.includes('month')) {
        result.billingCycle = BillingCycle.Monthly;
    } else {
        result.billingCycle = BillingCycle.Monthly;
    }

    // 2. Detect Currency
    if (lowerText.includes('dollar') || lowerText.includes('usd') || lowerText.includes('$')) {
        result.currency = 'USD';
    } else if (lowerText.includes('rupee') || lowerText.includes('inr') || lowerText.includes('₹')) {
        result.currency = 'INR';
    } else if (lowerText.includes('euro') || lowerText.includes('eur') || lowerText.includes('€')) {
        result.currency = 'EUR';
    } else if (lowerText.includes('pound') || lowerText.includes('gbp') || lowerText.includes('£')) {
        result.currency = 'GBP';
    }

    // 3. Detect Renewal Date (Day of month)
    // Patterns: "5th", "21st", "on the 5", "starts 10"
    let dayMatch = lowerText.match(/(\d{1,2})(st|nd|rd|th)/); // Matches 1st, 2nd, 25th

    if (!dayMatch) {
        const onMatch = lowerText.match(/\bon (\d{1,2})\b/); // Matches "on 5", "on 25"
        if (onMatch) dayMatch = onMatch;
    }

    if (dayMatch) {
        const day = parseInt(dayMatch[1]);
        if (day >= 1 && day <= 31) {
            const now = new Date();
            let targetDate = new Date(now.getFullYear(), now.getMonth(), day);

            // If this date has passed this month, assume next month
            if (targetDate < now) {
                targetDate = new Date(now.getFullYear(), now.getMonth() + 1, day);
            }

            // Handle overflow (e.g. Feb 30 -> Mar 2) - JS Date does this automatically, 
            // but maybe we want to stick to last day of month? 
            // For simplicity, native JS behavior is fine (rollover), or we can clamp.
            // Let's stick to standard date.
            result.renewalDate = targetDate.toISOString().split('T')[0];
        }
    }

    // 4. Detect Amount (First number that is NOT the date we just found)
    // We identify the date string to remove it from consideration for price
    let cleanTextForAmount = text;
    if (dayMatch) {
        cleanTextForAmount = text.replace(dayMatch[0], ''); // Remove "5th" or "on 5" from amount search
    }

    const amountMatch = cleanTextForAmount.match(/[\d,]+(\.\d{1,2})?/);
    if (amountMatch) {
        result.amount = amountMatch[0].replace(/,/g, '');
    }

    // 5. Detect Name - IMPROVED: First try to match known service names
    let detectedName: string | undefined;

    // Sort by length (longest first) to match "YouTube Premium" before "YouTube"
    const sortedServices = [...KNOWN_SERVICES].sort((a, b) => b.length - a.length);

    for (const service of sortedServices) {
        if (lowerText.includes(service)) {
            // Capitalize properly
            detectedName = service
                .split(' ')
                .map(w => w.charAt(0).toUpperCase() + w.slice(1))
                .join(' ');
            break;
        }
    }

    // If we found a known service, use it
    if (detectedName) {
        result.name = detectedName;
    } else {
        // Fallback: Use word-removal approach for unknown services
        let nameText = lowerText;

        // Remove detected Amount
        if (result.amount) {
            nameText = nameText.replace(result.amount, '');
        }
        // Remove detected Date substring
        if (dayMatch) {
            nameText = nameText.replace(dayMatch[0], '');
        }

        const removeWords = [
            'monthly', 'month', 'yearly', 'year', 'quarterly', 'quarter',
            'annually', 'annual', 'weekly', 'week', 'daily', 'every',
            'dollars', 'dollar', 'usd', 'rupees', 'rupee', 'inr', 'euros', 'euro', 'eur', 'pounds', 'pound', 'gbp',
            'cost', 'price', 'amount', 'rate', 'fee', 'charge', 'charged', 'charging', 'pays', 'pay', 'paid', 'payment', 'bill', 'billing',
            'is', 'for', 'subscription', 'sub', 'add', 'create', 'new', 'start', 'starting', 'started', 'begin', 'begins',
            'on', 'starts', 'renew', 'renews', 'renewal', 'of', 'the', 'a', 'an', 'my', 'our', 'i', 'we', 'to', 'at',
            'per', 'each', 'costs', 'priced', 'about', 'around', 'approximately', 'roughly'
        ];

        removeWords.forEach(word => {
            nameText = nameText.replace(new RegExp(`\\b${word}\\b`, 'g'), '');
        });

        // Clean up
        let cleanedName = nameText.replace(/[^\w\s]/g, '').trim();

        // Remove extra whitespace
        cleanedName = cleanedName.replace(/\s+/g, ' ').trim();

        // Capitalize Name
        if (cleanedName) {
            cleanedName = cleanedName
                .split(' ')
                .map(w => w.charAt(0).toUpperCase() + w.slice(1))
                .join(' ');
        }

        result.name = cleanedName || undefined;
    }

    return result;
};
