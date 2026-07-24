import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, Calendar } from 'lucide-react';
import type { TimelineGroup, EnhancedMemoryItem } from '../../types';
import { MemoryCard } from './MemoryCard';

interface TimelineViewProps {
  timeline: TimelineGroup[];
  onPin: (id: string) => void;
  onArchive: (id: string) => void;
  onDelete: (id: string) => void;
  onReinforce: (id: string) => void;
}

const PERIOD_ICONS: Record<string, React.ReactNode> = {
  Today: <Clock className="w-4 h-4 text-cyan-400" />,
  Yesterday: <Clock className="w-4 h-4 text-indigo-400" />,
  'This Week': <Calendar className="w-4 h-4 text-violet-400" />,
  'This Month': <Calendar className="w-4 h-4 text-amber-400" />,
  'This Year': <Calendar className="w-4 h-4 text-emerald-400" />,
  Older: <Calendar className="w-4 h-4 text-slate-400" />,
};

export const TimelineView: React.FC<TimelineViewProps> = ({
  timeline,
  onPin,
  onArchive,
  onDelete,
  onReinforce,
}) => {
  if (timeline.length === 0) {
    return (
      <div className="py-16 text-center text-slate-500 text-sm font-mono">
        No memories in timeline yet
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {timeline.map((group) => (
        <motion.div
          key={group.period}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="relative"
        >
          {/* Period header */}
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-xl bg-slate-800/60 border border-white/5">
              {PERIOD_ICONS[group.period] || PERIOD_ICONS.Older}
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">{group.period}</h3>
              <span className="text-[10px] text-slate-500">{group.memories.length} memories</span>
            </div>
            <div className="flex-1 h-px bg-gradient-to-r from-white/10 to-transparent" />
          </div>

          {/* Vertical timeline line */}
          <div className="relative pl-6 border-l border-white/5 space-y-4 ml-4">
            <AnimatePresence>
              {group.memories.map((mem) => (
                <div key={mem.id} className="relative">
                  {/* Dot */}
                  <div className="absolute -left-[1.65rem] top-4 w-3 h-3 rounded-full bg-indigo-500/60 border border-indigo-400/40" />
                  <MemoryCard
                    memory={mem}
                    onPin={onPin}
                    onArchive={onArchive}
                    onDelete={onDelete}
                    onReinforce={onReinforce}
                  />
                </div>
              ))}
            </AnimatePresence>
          </div>
        </motion.div>
      ))}
    </div>
  );
};
