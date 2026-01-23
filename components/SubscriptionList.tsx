import React, { useState, useMemo, useEffect } from 'react';
import { Subscription, BillingCycle, User, SubscriptionStatus } from '../types';
import { Search, ArrowUpDown, Filter, Tag, Calendar, TrendingUp, Check, ChevronDown, Archive, Grid, CheckSquare, Square } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatCurrency, convertCurrency, getCurrencySymbol, getUserShare } from '../utils';
import ServiceLogo from './ServiceLogo';
import SubscriptionCard from './SubscriptionCard';
import BulkActionBar from './BulkActionBar';

interface SubscriptionListProps {
  user: User;
  subscriptions: Subscription[];
  currency: string;
  onSelect: (sub: Subscription) => void;
  onSettings: () => void;
  rates?: Record<string, number>;
  categories?: { id: string, name: string, icon: string }[];
  onMarkAsUsed: (id: string) => void;
  onBulkDelete?: (ids: string[]) => void;
  onBulkMarkUsed?: (ids: string[]) => void;
  monthlyBudget?: number;
  isBusiness?: boolean;
  filterMode?: 'none' | 'unused_seats';
}

type SortOption = 'price_high' | 'price_low' | 'date_new' | 'date_old' | 'name_asc' | 'name_desc';

const SubscriptionList: React.FC<SubscriptionListProps> = ({
  user,
  subscriptions,
  currency,
  onSelect,
  onSettings,
  rates,
  categories = [],
  onMarkAsUsed,
  onBulkDelete,
  onBulkMarkUsed,
  monthlyBudget,
  isBusiness,
  filterMode = 'none'
}) => {
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<SortOption>(filterMode === 'unused_seats' ? 'price_high' : 'date_new');
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'archived' | 'deleted'>('active');
  const [sortMenuOpen, setSortMenuOpen] = useState(false);
  const [statusMenuOpen, setStatusMenuOpen] = useState(false);

  const statusOptions = [
    { id: 'active', label: 'Active', color: 'bg-emerald-500', bgColor: 'bg-emerald-50', textColor: 'text-emerald-700' },
    { id: 'archived', label: 'Cancelled', color: 'bg-orange-500', bgColor: 'bg-orange-50', textColor: 'text-orange-700' },
    { id: 'deleted', label: 'Trash', color: 'bg-red-500', bgColor: 'bg-red-50', textColor: 'text-red-700' },
    { id: 'all', label: 'All', color: 'bg-indigo-500', bgColor: 'bg-indigo-50', textColor: 'text-indigo-700' },
  ] as const;

  // Effect to auto-sort when filterMode changes
  useEffect(() => {
    if (filterMode === 'unused_seats') {
      setSort('price_high');
    }
  }, [filterMode]);

  // Bulk Selection State
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const filteredSubscriptions = useMemo(() => {
    let result = subscriptions.filter(sub => {
      // Status Filter
      if (statusFilter === 'active' && sub.status?.toLowerCase() !== 'active') return false;
      if (statusFilter === 'archived' && sub.status?.toLowerCase() !== 'cancelled') return false;

      // Mode Filter
      if (filterMode === 'unused_seats') {
        const total = sub.seatsTotal || 0;
        const assigned = sub.seatsAssigned || 0;
        if (total <= assigned) return false; // Only show unused
      }

      return true;
    });
    return result;
  }, [subscriptions, statusFilter, filterMode]);

  // WIDGET LOGIC
  const widgets = useMemo(() => {
    // 1. Next Renewal
    const activeSubs = filteredSubscriptions.filter(s => s.status === SubscriptionStatus.Active);
    const sortedByDate = [...activeSubs].sort((a, b) => new Date(a.renewalDate).getTime() - new Date(b.renewalDate).getTime());
    const nextSub = sortedByDate[0];

    // 2. Budget Progress
    let totalMonthly = 0;
    activeSubs.forEach(sub => {
      let cost = getUserShare(sub.amount, sub.sharedWith);
      if (rates && sub.currency && sub.currency !== currency) {
        cost = convertCurrency(cost, sub.currency, currency, rates);
      }
      // Normalize to monthly
      if (sub.billingCycle === BillingCycle.Annual) cost /= 12;
      if (sub.billingCycle === BillingCycle.Weekly) cost *= 4.33;
      totalMonthly += cost;
    });


    // 3. Waste Analysis (Unused > 30 days)
    let wasteMonthly = 0;
    let wasteCount = 0;

    activeSubs.forEach(sub => {
      // Condition: Has lastUsedDate and it's > 30 days ago
      // OR: No lastUsedDate but createdAt is > 60 days ago (assumed forgotten)
      let isWaste = false;
      const now = Date.now();
      const thirtyDays = 30 * 24 * 60 * 60 * 1000;

      if (sub.lastUsedDate) {
        if (now - new Date(sub.lastUsedDate).getTime() > thirtyDays) isWaste = true;
      } else {
        // If never marked used, wait 60 days before calling it waste
        if (now - new Date(sub.createdAt).getTime() > (thirtyDays * 2)) isWaste = true;
      }

      if (isWaste) {
        wasteCount++;
        let cost = getUserShare(sub.amount, sub.sharedWith);
        if (rates && sub.currency && sub.currency !== currency) {
          cost = convertCurrency(cost, sub.currency, currency, rates);
        }
        if (sub.billingCycle === BillingCycle.Annual) cost /= 12;
        if (sub.billingCycle === BillingCycle.Weekly) cost *= 4.33;
        wasteMonthly += cost;
      }
    });

    const budget = monthlyBudget || user?.monthlyBudget || 0;
    const progress = budget > 0 ? Math.min((totalMonthly / budget) * 100, 100) : 0;
    const isOverBudget = budget > 0 && totalMonthly > budget;

    return { nextSub, totalMonthly, budget, progress, isOverBudget, wasteMonthly, wasteCount };
  }, [subscriptions, currency, rates, monthlyBudget, user?.monthlyBudget]);

  // Extract all unique tags
  const allTags = useMemo(() => {
    const tags = new Set<string>();
    subscriptions.forEach(sub => sub.tags?.forEach(t => tags.add(t)));
    return Array.from(tags);
  }, [subscriptions]);

  const filteredAndSortedSubs = useMemo(() => {
    let result = [...subscriptions];

    // Filter by Status
    if (statusFilter !== 'all') {
      if (statusFilter === 'deleted') {
        result = result.filter(sub => sub.status === SubscriptionStatus.Deleted);
      } else if (statusFilter === 'active') {
        result = result.filter(sub => sub.status === SubscriptionStatus.Active);
      } else {
        result = result.filter(sub => sub.status === SubscriptionStatus.Cancelled);
      }
    } else {
      // 'all' excludes deleted by default - user must explicitly select deleted
      result = result.filter(sub => sub.status !== SubscriptionStatus.Deleted);
    }

    // Filter by Search
    if (search) {
      result = result.filter(sub => sub.name.toLowerCase().includes(search.toLowerCase()));
    }

    // Filter by Tag
    if (activeTag) {
      result = result.filter(sub => sub.tags?.includes(activeTag));
    }

    // Filter by Category
    if (activeCategory) {
      result = result.filter(sub => sub.category === activeCategory);
    }

    // Sort
    result.sort((a, b) => {
      let amountA = a.amount;
      let amountB = b.amount;

      // Convert for sorting if needed - USE USER SHARE
      if (rates && a.currency && a.currency !== currency) {
        amountA = convertCurrency(getUserShare(a.amount, a.sharedWith), a.currency, currency, rates);
      } else {
        amountA = getUserShare(a.amount, a.sharedWith);
      }

      if (rates && b.currency && b.currency !== currency) {
        amountB = convertCurrency(getUserShare(b.amount, b.sharedWith), b.currency, currency, rates);
      } else {
        amountB = getUserShare(b.amount, b.sharedWith);
      }

      switch (sort) {
        case 'price_high': return amountB - amountA;
        case 'price_low': return amountA - amountB;
        case 'name_asc': return a.name.localeCompare(b.name);
        case 'name_desc': return b.name.localeCompare(a.name);
        case 'date_new': return new Date(a.renewalDate).getTime() - new Date(b.renewalDate).getTime();
        case 'date_old': return new Date(b.renewalDate).getTime() - new Date(a.renewalDate).getTime();
        default: return 0;
      }
    });

    return result;
  }, [subscriptions, search, sort, activeTag, activeCategory, statusFilter, rates, currency]);

  // Bulk Selection Handlers
  const toggleSelectionMode = () => {
    if (isSelectionMode) {
      // Exit mode -> clear selection
      setIsSelectionMode(false);
      setSelectedIds(new Set());
    } else {
      setIsSelectionMode(true);
    }
  };

  const toggleSelection = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Safety: Clear selection when filters are applied to avoid accidental ops on hidden items
  React.useEffect(() => {
    if (search || activeTag || activeCategory) {
      setIsSelectionMode(false);
      setSelectedIds(new Set());
    }
  }, [search, activeTag, activeCategory]);

  const activeFilters = search || activeTag || activeCategory;

  return (
    <div className="p-4 pb-32 min-h-screen bg-gray-50 relative">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900 tracking-tight">Subscriptions</h2>
          <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mt-1">
            {filteredAndSortedSubs.length} Items
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* Selection Toggle */}
          {!activeFilters && (
            <button
              onClick={toggleSelectionMode}
              className={`h-10 w-10 flex items-center justify-center rounded-full border transition-all active:scale-95 ${isSelectionMode ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' : 'bg-white text-gray-400 border-gray-200 shadow-sm'
                }`}
            >
              {isSelectionMode ? <CheckSquare size={18} /> : <Square size={18} />}
            </button>
          )}

          <button
            onClick={onSettings}
            className="w-10 h-10 rounded-full overflow-hidden border-2 border-white shadow-md transition-transform active:scale-95"
          >
            {user.avatar ? (
              <img src={user.avatar} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-gray-200 flex items-center justify-center text-gray-500 font-bold text-xs">{user.name[0]}</div>
            )}
          </button>
        </div>
      </div>

      {/* WIDGETS ROW - Scrollable */}
      <div className="flex overflow-x-auto snap-x snap-mandatory gap-3 mb-6 pb-2 -mx-4 px-4 no-scrollbar">
        {/* Widget 1: Next Renewal */}
        <div className="min-w-[85%] sm:min-w-[48%] snap-center bg-white p-4 rounded-2xl shadow-sm border border-gray-100 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-2 opacity-10">
            <Calendar size={48} className="text-indigo-500" />
          </div>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Up Next</p>
          {widgets.nextSub ? (
            <div>
              <div className="font-bold text-gray-900 text-base truncate pr-2">{widgets.nextSub.name}</div>
              <div className="text-sm text-indigo-600 font-medium">
                {new Date(widgets.nextSub.renewalDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                <span className="text-gray-400 mx-1">•</span>
                {formatCurrency(
                  rates && widgets.nextSub.currency
                    ? convertCurrency(getUserShare(widgets.nextSub.amount, widgets.nextSub.sharedWith), widgets.nextSub.currency, currency, rates)
                    : getUserShare(widgets.nextSub.amount, widgets.nextSub.sharedWith),
                  currency
                )}
              </div>
            </div>
          ) : (
            <div className="text-gray-400 text-sm italic">No active subscriptions</div>
          )}
        </div>

        {/* Widget 2: Budget */}
        <div className="min-w-[85%] sm:min-w-[48%] snap-center bg-white p-4 rounded-2xl shadow-sm border border-gray-100 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-2 opacity-10">
            <TrendingUp size={48} className={widgets.isOverBudget ? "text-red-500" : "text-emerald-500"} />
          </div>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Monthly Spend</p>
          <div className="font-bold text-gray-900 text-base">
            {formatCurrency(widgets.totalMonthly, currency)}
            <span className="text-gray-400 text-xs font-normal ml-1">/ {formatCurrency(widgets.budget, currency)}</span>
          </div>
          <div className="mt-2 h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full ${widgets.isOverBudget ? 'bg-red-500' : 'bg-indigo-500'}`}
              style={{ width: `${widgets.progress}%` }}
            ></div>
          </div>
        </div>

        {/* Widget 3: Waste Insights */}
        {widgets.wasteCount > 0 && (
          <div className="min-w-[85%] sm:min-w-[48%] snap-center bg-white p-4 rounded-2xl shadow-sm border border-gray-100 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-2 opacity-10">
              <Archive size={48} className="text-orange-500" />
            </div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Potential Waste</p>
            <div className="font-bold text-gray-900 text-base">
              {formatCurrency(widgets.wasteMonthly, currency)}
              <span className="text-gray-400 text-xs font-normal ml-1">/ mo</span>
            </div>
            <div className="text-xs font-medium text-orange-500 mt-1">
              {widgets.wasteCount} unused subscriptions
            </div>
          </div>
        )}
      </div>

      <div className="sticky top-0 bg-gray-50 z-20 pb-4 space-y-3">
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Search subscriptions, tags..."
            className="w-full pl-10 pr-4 py-3 bg-white border-none rounded-2xl shadow-sm focus:ring-2 focus:ring-indigo-500 outline-none text-gray-800 placeholder-gray-400"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* FILTER BAR - Fixed Sort + Scrollable Filters */}
        <div className="flex items-center pt-2 pb-2 -mx-4 px-4">

          {/* 1. FIXED SORT BUTTON (Z-50 to overlap everything) */}
          <div className="relative z-50 shrink-0 mr-3">
            <button
              onClick={() => setSortMenuOpen(!sortMenuOpen)}
              className="h-10 px-3 min-w-[2.5rem] flex items-center justify-center bg-white border border-gray-200 text-gray-500 rounded-xl shadow-sm active:scale-95 transition-all hover:border-gray-300 font-bold gap-1.5"
            >
              {sort === 'price_high' ? (
                <div className="flex items-center gap-1 text-xs">
                  <span>{getCurrencySymbol(currency)}</span>
                  <span>High</span>
                </div>
              ) : sort === 'price_low' ? (
                <div className="flex items-center gap-1 text-xs">
                  <span>{getCurrencySymbol(currency)}</span>
                  <span>Low</span>
                </div>
              ) : sort === 'name_asc' ? (
                <div className="flex items-center gap-1 text-xs">
                  <span>Aa</span>
                  <span>A-Z</span>
                </div>
              ) : sort === 'name_desc' ? (
                <div className="flex items-center gap-1 text-xs">
                  <span>zZ</span>
                  <span>Z-A</span>
                </div>
              ) : sort === 'date_new' ? (
                <div className="flex items-center gap-1 text-xs">
                  <Calendar size={14} />
                  <span>Due Soonest</span>
                </div>
              ) : sort === 'date_old' ? (
                <div className="flex items-center gap-1 text-xs">
                  <Calendar size={14} />
                  <span>Due Latest</span>
                </div>
              ) : (
                <ArrowUpDown size={16} />
              )}
            </button>

            <AnimatePresence>
              {sortMenuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setSortMenuOpen(false)}></div>
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute top-full left-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden z-50"
                  >
                    <div className="p-1">
                      {[
                        { id: 'date_new', label: '📅 Due Soonest (Overdue First)' },
                        { id: 'date_old', label: '📅 Due Latest (Future First)' },
                        { id: 'price_high', label: `💰 ${getCurrencySymbol(currency)} High to Low` },
                        { id: 'price_low', label: `💵 ${getCurrencySymbol(currency)} Low to High` },
                        { id: 'name_asc', label: 'Aa Name (A-Z)' },
                        { id: 'name_desc', label: 'zZ Name (Z-A)' },
                      ].map((option) => (
                        <button
                          key={option.id}
                          onClick={() => { setSort(option.id as SortOption); setSortMenuOpen(false); }}
                          className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-bold flex items-center justify-between transition-colors ${sort === option.id ? 'bg-indigo-50 text-indigo-600' : 'text-gray-600 hover:bg-gray-50'
                            }`}
                        >
                          <span className="truncate mr-2">{option.label}</span>
                          {sort === option.id && <Check size={14} className="shrink-0" />}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>

          {/* Divider */}
          <div className="w-px h-6 bg-gray-200 shrink-0 mr-1"></div>

          {/* STATUS FILTERS - Dropdown Menu */}
          <div className="relative shrink-0">
            <button
              onClick={() => setStatusMenuOpen(!statusMenuOpen)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all border ${statusOptions.find(o => o.id === statusFilter)?.bgColor
                } ${statusOptions.find(o => o.id === statusFilter)?.textColor
                } border-current/20 shadow-sm`}
            >
              <div className={`w-2 h-2 rounded-full ${statusOptions.find(o => o.id === statusFilter)?.color}`} />
              <span>{statusOptions.find(o => o.id === statusFilter)?.label}</span>
              <ChevronDown size={12} className={`transition-transform ${statusMenuOpen ? 'rotate-180' : ''}`} />
            </button>

            <AnimatePresence>
              {statusMenuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setStatusMenuOpen(false)} />
                  <motion.div
                    initial={{ opacity: 0, y: -8, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -8, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className="absolute left-0 top-full mt-2 w-44 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden z-50"
                  >
                    <div className="py-1">
                      {statusOptions.map(option => (
                        <button
                          key={option.id}
                          onClick={() => {
                            setStatusFilter(option.id);
                            setStatusMenuOpen(false);
                          }}
                          className={`w-full px-3 py-2.5 flex items-center gap-3 text-sm transition-colors ${statusFilter === option.id ? option.bgColor + ' ' + option.textColor : 'text-gray-700 hover:bg-gray-50'
                            }`}
                        >
                          <div className={`w-2.5 h-2.5 rounded-full ${option.color}`} />
                          <span className="flex-1 text-left font-medium">{option.label}</span>
                          {statusFilter === option.id && <Check size={14} />}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>

          <div className="w-px h-6 bg-gray-200 shrink-0 mx-1"></div>

          {/* 2. SCROLLABLE CHIPS CONTAINER (Flex-1 to take remaining space) */}
          <div className="overflow-x-auto no-scrollbar flex items-center gap-3 flex-1 pr-4 pl-1">

            {/* CATEGORIES - Only show categories that have subscriptions */}
            <button
              onClick={() => { setActiveCategory(null); setActiveTag(null); }}
              className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all border shrink-0 ${!activeCategory && !activeTag ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm' : 'bg-white text-gray-500 border-gray-200'}`}
            >
              All
            </button>

            {/* Only show categories that have at least one subscription */}
            {categories
              .filter(cat => subscriptions.some(sub => sub.category === cat.id))
              .map(cat => (
                <button
                  key={cat.id}
                  onClick={() => { setActiveCategory(cat.id === activeCategory ? null : cat.id); setActiveTag(null); }}
                  className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all border shrink-0 ${activeCategory === cat.id
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                    : 'bg-white text-gray-500 border-gray-200'
                    }`}
                >
                  {cat.name}
                </button>
              ))}
          </div>
        </div>
      </div >

      {/* List */}
      < div className="space-y-1 mt-2" >
        <AnimatePresence mode='popLayout'>
          {filteredAndSortedSubs.map((sub) => (
            <SubscriptionCard
              key={sub.id}
              sub={sub}
              currency={currency}
              rates={rates}
              onSelect={onSelect}
              onMarkAsUsed={onMarkAsUsed}
              selectionMode={isSelectionMode}
              isSelected={selectedIds.has(sub.id)}
              onToggleSelection={toggleSelection}
            />
          ))}
        </AnimatePresence>

        {
          filteredAndSortedSubs.length === 0 && (
            <div className="text-center py-20 opacity-50">
              <Filter size={48} className="mx-auto mb-4 text-gray-300" />
              <p className="text-gray-500 font-medium">No matches found</p>
            </div>
          )
        }
      </div >

      <BulkActionBar
        selectedCount={selectedIds.size}
        onClear={() => {
          setSelectedIds(new Set());
          setIsSelectionMode(false);
        }}
        onDelete={() => {
          if (onBulkDelete) {
            onBulkDelete(Array.from(selectedIds));
            setSelectedIds(new Set());
            setIsSelectionMode(false);
          }
        }}
        onMarkUsed={() => {
          if (onBulkMarkUsed) {
            onBulkMarkUsed(Array.from(selectedIds));
            setSelectedIds(new Set());
            setIsSelectionMode(false);
          }
        }}
      />
    </div >
  );
};

export default React.memo(SubscriptionList);