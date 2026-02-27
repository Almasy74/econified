export { };

declare global {
    interface Window {
        Currency: {
            selected: string;
            rates: Record<string, number>;
            initialized: boolean;
            init: () => Promise<void>;
            fetchRates: () => Promise<void>;
            get: () => string;
            set: (code: string) => void;
            convertFromUSD: (amount: number) => number;
            convertToUSD: (amount: number) => number;
            format: (amount: number, code?: string) => string;
        }
    }
}

/**
 * Global Currency Layer for Econified
 * Handles exchange rates, conversion, formatting and persistence.
 */

const CACHE_KEY = 'econified_rates';
const TIMESTAMP_KEY = 'econified_rates_ts';
const PREF_KEY = 'econified_currency';
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

interface RatesResponse {
    rates: Record<string, number>;
    base: string;
}

(window as any).Currency = {
    selected: localStorage.getItem(PREF_KEY) || 'USD',
    rates: { "USD": 1 },
    initialized: false,

    async init() {
        if (this.initialized) return;

        // 1. Try to load from cache
        const cachedRates = localStorage.getItem(CACHE_KEY);
        const cachedTs = localStorage.getItem(TIMESTAMP_KEY);
        const now = Date.now();

        if (cachedRates && cachedTs && (now - parseInt(cachedTs) < CACHE_DURATION)) {
            this.rates = JSON.parse(cachedRates);
            this.initialized = true;
        } else {
            await this.fetchRates();
        }

        // 2. Initial format update
        window.dispatchEvent(new CustomEvent('currencyReady'));
    },

    async fetchRates() {
        try {
            // Use open.er-api.com which is free and reliable
            const response = await fetch('https://open.er-api.com/v6/latest/USD');
            if (!response.ok) throw new Error('Failed to fetch rates');
            const data = await response.json();

            if (data.result === 'success') {
                this.rates = data.rates;
                localStorage.setItem(CACHE_KEY, JSON.stringify(this.rates));
                localStorage.setItem(TIMESTAMP_KEY, Date.now().toString());
                this.initialized = true;
            } else {
                throw new Error('API returned success:false');
            }
        } catch (err) {
            console.error('Currency Error:', err);
            // Fallback rates (approximate for major currencies if API fails and no cache)
            if (Object.keys(this.rates).length <= 1) {
                this.rates = {
                    "USD": 1, "EUR": 0.92, "GBP": 0.79, "NOK": 10.5, "CAD": 1.35, "AUD": 1.52
                };
            }
        }
    },

    get() {
        return this.selected;
    },

    set(code: string) {
        this.selected = code;
        localStorage.setItem(PREF_KEY, code);
        window.dispatchEvent(new CustomEvent('currencyChanged', { detail: { currency: code } }));
    },

    convertFromUSD(amount: number, code?: string) {
        const currency = code || this.selected;
        const rate = this.rates[currency] || 1;
        return amount * rate;
    },

    convertToUSD(amount: number, code?: string) {
        const currency = code || this.selected;
        const rate = this.rates[currency] || 1;
        return amount / rate;
    },

    format(amount: number, code?: string) {
        const currency = code || this.selected;
        const locale = navigator.language || 'en-US';

        return new Intl.NumberFormat(locale, {
            style: 'currency',
            currency: currency,
            maximumFractionDigits: 0
        }).format(amount);
    }
};

// Auto-initialize
window.Currency.init();

declare global {
    interface Window {
        Currency: {
            selected: string;
            rates: Record<string, number>;
            initialized: boolean;
            init: () => Promise<void>;
            fetchRates: () => Promise<void>;
            get: () => string;
            set: (code: string) => void;
            convertFromUSD: (amount: number) => number;
            convertToUSD: (amount: number) => number;
            format: (amount: number, code?: string) => string;
        }
    }
}
