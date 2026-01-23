import { getCurrencySymbol } from './utils';

const currencies = ['USD', 'INR', 'EUR', 'JPY'];
const options = currencies.map(c => ({
    label: `${getCurrencySymbol(c)} ${c}`,
    value: c
}));

console.log("Mapped Options:", JSON.stringify(options, null, 2));

// Simulate normalization logic from Dropdown.tsx
const normalized = options.map(opt =>
    typeof opt === 'string' ? { label: opt, value: opt } : opt
);

console.log("Normalized Options:", JSON.stringify(normalized, null, 2));
