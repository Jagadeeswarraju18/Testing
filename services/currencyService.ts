const API_URL_PRIMARY = 'https://api.exchangerate-api.com/v4/latest/USD';
const API_URL_BACKUP = 'https://open.er-api.com/v6/latest/USD';

export interface ExchangeRates {
    base: string;
    date?: string;
    rates: Record<string, number>;
}

const CACHE_KEY = 'subtrack_exchange_rates';
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

export const fetchExchangeRates = async (): Promise<ExchangeRates | null> => {
    try {
        // Check cache
        const cached = localStorage.getItem(CACHE_KEY);
        if (cached) {
            const { data, timestamp } = JSON.parse(cached);
            if (Date.now() - timestamp < CACHE_DURATION) {
                return data; // Return valid cached data
            }
        }

        // Try Primary API
        try {
            const response = await fetch(API_URL_PRIMARY);
            if (!response.ok) throw new Error('Primary failed');
            const data: ExchangeRates = await response.json();

            localStorage.setItem(CACHE_KEY, JSON.stringify({ data, timestamp: Date.now() }));
            return data;
        } catch (e) {
            console.warn('Primary currency API failed, trying backup...', e);

            // Try Backup API
            const response = await fetch(API_URL_BACKUP);
            if (!response.ok) throw new Error('Backup failed');
            const data: ExchangeRates = await response.json();

            localStorage.setItem(CACHE_KEY, JSON.stringify({ data, timestamp: Date.now() }));
            return data;
        }
    } catch (error) {
        console.error('All currency APIs failed, using fallback:', error);

        // FALLBACK RATES (Approximate)
        return {
            base: 'USD',
            rates: {
                USD: 1,
                EUR: 0.92,
                GBP: 0.79,
                JPY: 151.5,
                INR: 84.12,
                CAD: 1.36,
                AUD: 1.52,
                CNY: 7.23,
                BRL: 5.15,
                MXN: 16.8,
                SGD: 1.35,
                AED: 3.67,
                ZAR: 18.8,
                CHF: 0.91,
                HKD: 7.83,
                NZD: 1.67
            }
        };
    }
};
