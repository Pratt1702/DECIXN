import React from 'react';
import { motion } from 'framer-motion';
import { Briefcase, List, Activity, TrendingUp } from 'lucide-react';

interface Suggestion {
  id: string;
  name: string;
  subtitle?: string;
  type: 'portfolio' | 'watchlist' | 'stock' | 'command';
  icon?: React.ReactNode;
}

interface MentionSuggestionsProps {
  suggestions: Suggestion[];
  onSelect: (suggestion: Suggestion) => void;
  activeIndex: number;
}

export function MentionSuggestions({ suggestions, onSelect, activeIndex }: MentionSuggestionsProps) {
  if (suggestions.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 10, scale: 0.95 }}
      className="absolute bottom-full left-0 mb-4 w-72 bg-[#1a1a1a] border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-[100]"
    >
      <div className="p-2 space-y-0.5">
        {suggestions.map((s, idx) => (
          <button
            key={s.id}
            onClick={() => onSelect(s)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-left ${
              idx === activeIndex 
                ? 'bg-white/10 text-white shadow-inner' 
                : 'text-text-muted hover:bg-white/5 hover:text-white'
            }`}
          >
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center border ${
              idx === activeIndex ? 'bg-accent/20 border-accent/30' : 'bg-white/5 border-white/5'
            }`}>
              {s.icon || (
                s.type === 'portfolio' ? <Briefcase className="w-4 h-4" /> :
                s.type === 'watchlist' ? <List className="w-4 h-4" /> :
                s.type === 'stock' ? <Activity className="w-4 h-4" /> :
                <TrendingUp className="w-4 h-4" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold truncate leading-tight">{s.name}</p>
              {s.subtitle && (
                <p className="text-[10px] font-medium opacity-40 truncate uppercase tracking-wider mt-0.5">
                  {s.subtitle}
                </p>
              )}
            </div>
          </button>
        ))}
      </div>
    </motion.div>
  );
}
