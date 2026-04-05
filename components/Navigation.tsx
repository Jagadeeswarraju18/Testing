import React from 'react';
import { Home, List, PlusCircle, Calendar, PieChart, Settings } from 'lucide-react';
import { motion } from 'framer-motion';

interface NavigationProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  onAdd: () => void;
}

const Navigation: React.FC<NavigationProps> = ({ currentTab, setCurrentTab, onAdd }) => {
  const tabs = [
    { id: 'dashboard', icon: Home, label: 'Home' },
    { id: 'subscriptions', icon: List, label: 'Subs' },
    { id: 'add', icon: PlusCircle, label: 'Add', isAction: true },
    { id: 'calendar', icon: Calendar, label: 'Calendar' },
    { id: 'insights', icon: PieChart, label: 'Insights' },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-xl rounded-t-[24px] border-t border-white/20 pb-safe pt-1.5 px-2 shadow-[0_-8px_32px_rgba(0,0,0,0.12)] z-50">
      <div className="grid grid-cols-5 items-end relative pb-1">
        {/* Center Add Button Float */}
        <div className="absolute left-1/2 -translate-x-1/2 -top-10 pointer-events-none">
          <div className="w-14 h-14"></div> {/* Spacer */}
        </div>

        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = currentTab === tab.id;

          if (tab.isAction) {
            return (
              <div key={tab.id} className="flex justify-center relative -top-6">
                <button
                  onClick={onAdd}
                  className="flex flex-col items-center justify-center group"
                >
                  <motion.div
                    whileHover={{ scale: 1.15, rotate: 180 }}
                    whileTap={{ scale: 0.85 }}
                    transition={{ type: "spring", stiffness: 300, damping: 15 }}
                    className="bg-primary text-white p-3.5 rounded-full shadow-xl shadow-indigo-500/40 ring-4 ring-white group-hover:shadow-indigo-500/60 transition-shadow"
                  >
                    <Icon size={28} strokeWidth={2.5} />
                  </motion.div>
                  <span className="text-[10px] font-semibold text-gray-500 mt-1 absolute -bottom-5 opacity-0 group-hover:opacity-100 transition-opacity">Add</span>
                </button>
              </div>
            );
          }

          return (
            <motion.button
              key={tab.id}
              onClick={() => setCurrentTab(tab.id)}
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.95 }}
              transition={{ type: "spring", stiffness: 400, damping: 17 }}
              className={`flex flex-col items-center justify-center pb-1 transition-all duration-300 relative z-10 ${isActive ? 'text-primary' : 'text-gray-400 hover:text-indigo-500'}`}
            >
              <div className={`absolute inset-0 bg-indigo-50/50 rounded-xl z-[-1] transition-opacity duration-300 ${isActive ? 'opacity-100 scale-100' : 'opacity-0 scale-75 group-hover:opacity-50'}`} />

              <div className="relative p-1.5">
                <Icon size={24} strokeWidth={isActive ? 2.5 : 2} />
              </div>
              <span className={`text-[9px] font-medium transition-all ${isActive ? 'text-primary font-bold translate-y-0' : 'text-gray-400 translate-y-0.5'}`}>{tab.label}</span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
};

export default Navigation;