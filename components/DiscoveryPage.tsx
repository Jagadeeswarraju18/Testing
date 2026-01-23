import React, { useState } from 'react';
import { Search, Plus, ArrowRight, Check } from 'lucide-react';
import { POPULAR_PROVIDERS } from '../constants';
import ServiceLogo from './ServiceLogo';
import { Subscription } from '../types';

interface DiscoveryPageProps {
    onAddSubscription: (sub: Partial<Subscription>) => void;
    existingSubscriptions: Subscription[];
    currency: string;
}

const DiscoveryPage: React.FC<DiscoveryPageProps> = ({ onAddSubscription, existingSubscriptions, currency }) => {
    const [search, setSearch] = useState('');
    const [addedIds, setAddedIds] = useState<Set<string>>(new Set());

    // Filter providers
    const filteredProviders = POPULAR_PROVIDERS.filter(p =>
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        (p.categories && p.categories.some(c => c.toLowerCase().includes(search.toLowerCase())))
    );

    const handleQuickAdd = (provider: typeof POPULAR_PROVIDERS[0]) => {
        // Check if already exists (fuzzy match name)
        const exists = existingSubscriptions.some(s => s.name.toLowerCase() === provider.name.toLowerCase());

        if (exists && !confirm(`You already have a subscription named "${provider.name}". Add another one?`)) {
            return;
        }

        onAddSubscription({
            name: provider.name,
            amount: provider.defaultAmount || 0,
            currency: currency,
            category: provider.categories?.[0] || 'Other',
            logoUrl: provider.logoUrl,
            renewalDate: new Date().toISOString()
        });

        setAddedIds(prev => new Set(prev).add(provider.id || provider.name));

        // Show temporary success feedback
        setTimeout(() => {
            setAddedIds(prev => {
                const next = new Set(prev);
                next.delete(provider.id || provider.name);
                return next;
            });
        }, 2000);
    };

    return (
        <div className="p-4 pb-24 min-h-screen bg-gray-50">
            <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Discover</h2>
                <p className="text-gray-500 text-sm">Quickly add popular subscriptions</p>
            </div>

            <div className="sticky top-0 bg-gray-50 z-20 pb-4">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                    <input
                        type="text"
                        placeholder="Search Netflix, Spotify..."
                        className="w-full pl-10 pr-4 py-3 bg-white border-none rounded-2xl shadow-sm focus:ring-2 focus:ring-indigo-500 outline-none text-gray-800 placeholder-gray-400"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {filteredProviders.map((provider) => {
                    const isAdded = addedIds.has(provider.id || provider.name);
                    return (
                        <div
                            key={provider.name}
                            className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between group active:scale-[0.98] transition-all"
                        >
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden border border-gray-100">
                                    <ServiceLogo name={provider.name} logoUrl={provider.logoUrl} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-900">{provider.name}</h3>
                                    <p className="text-xs text-gray-500 font-medium capitalize">{provider.categories?.join(', ') || 'Subscription'}</p>
                                </div>
                            </div>
                            <button
                                onClick={() => handleQuickAdd(provider)}
                                disabled={isAdded}
                                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${isAdded
                                    ? 'bg-green-500 text-white cursor-default'
                                    : 'bg-gray-50 text-gray-900 group-hover:bg-black group-hover:text-white'
                                    }`}
                            >
                                {isAdded ? <Check size={20} /> : <Plus size={20} />}
                            </button>
                        </div>
                    );
                })}
            </div>


            {filteredProviders.length === 0 && (
                <div className="text-center py-20 opacity-50">
                    <p className="text-gray-500 font-medium">No results found</p>
                    <p className="text-xs text-gray-400 mt-1">Try searching for something else</p>
                </div>
            )}
        </div>
    );
};

export default DiscoveryPage;
