import React from 'react';
import { motion } from 'framer-motion';
import { Pin, Archive, Trash2, RefreshCw, Star, Tag, Clock } from 'lucide-react';
import type { EnhancedMemoryItem } from '../../types';

interface MemoryCardProps {
  memory: EnhancedMemoryItem;
  onPin: (id: string) => void;
  onArchive: (id: string) => void;
  onDelete: (id: string) => void;
  onReinforce: (id: string) => void;
}

const CATEGORY_COLORS: Record<string, string> = {
  projects: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
  programming: 'bg-violet-500/20 text-violet-300 border-violet-500/30',
  goals: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  career: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  skills: 'bg-teal-500/20 text-teal-300 border-teal-500/30',
  education: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  health: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
  ideas: 'bg-fuchsia-500/20 text-fuchsia-300 border-fuchsia-500/30',
  general: 'bg-slate-500/20 text-slate-300 border-slate-500/30',
};

function ImportanceRing({ score }: { score: number }) {
  const r = 18;
  const circumference = 2 * Math.PI * r;
  const progress = (score / 100) * circumference;
  const color =
    score >= 80 ? '#f59e0b' : score >= 60 ? '#06b6d4' : score >= 40 ? '#6366f1' : '#475569';

  return (
    <div className="relative w-12 h-12 flex-shrink-0">
      <svg width="48" height="48" className="-rotate-90">
        <circle cx="24" cy="24" r={r} fill="none" stroke="#1e293b" strokeWidth="4" />
        <circle
          cx="24"
          cy="24"
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="4"
          strokeDasharray={circumference}
          strokeDashoffset={circumference - progress}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.6s ease' }}
        />
      </svg>
      <span
        className="absolute inset-0 flex items-center justify-center text-[10px] font-bold"
        style={{ color }}
      >
        {Math.round(score)}
      </span>
    </div>
  );
}

export const MemoryCard: React.FC<MemoryCardProps> = ({
  memory,
  onPin,
  onArchive,
  onDelete,
  onReinforce,
}) => {
  const catColor = CATEGORY_COLORS[memory.category] || CATEGORY_COLORS.general;
  const timeAgo = (iso: string) => {
    const diff = Date.now() - new Date(iso).getTime();
    const d = Math.floor(diff / 86400000);
    if (d === 0) return 'Today';
    if (d === 1) return 'Yesterday';
    if (d < 7) return `${d}d ago`;
    if (d < 30) return `${Math.floor(d / 7)}w ago`;
    return `${Math.floor(d / 30)}mo ago`;
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={`relative glass-panel rounded-2xl border p-4 flex flex-col gap-3 group transition-all duration-300
        ${memory.is_pinned ? 'border-amber-500/40 bg-amber-500/5' : 'border-white/8 hover:border-indigo-500/30'}`}
    >
      {/* Pinned badge */}
      {memory.is_pinned && (
        <div className="absolute -top-2 -right-2 bg-amber-500 text-black text-[9px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
          <Pin className="w-2.5 h-2.5" /> PINNED
        </div>
      )}

      <div className="flex items-start gap-3">
        <ImportanceRing score={memory.importance_score} />

        <div className="flex-1 min-w-0">
          {/* Category + Type badges */}
          <div className="flex flex-wrap gap-1.5 mb-2">
            <span
              className={`text-[10px] font-mono px-2 py-0.5 rounded-full border capitalize ${catColor}`}
            >
              {memory.category}
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full border border-white/10 text-slate-400">
              {memory.memory_type}
            </span>
            {memory.source !== 'manual' && (
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full border border-white/10 text-slate-500">
                {memory.source}
              </span>
            )}
          </div>

          {/* Content */}
          <p className="text-sm text-slate-200 leading-relaxed line-clamp-3">{memory.content}</p>

          {/* Tags */}
          {memory.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {memory.tags.map((tag) => (
                <span
                  key={tag}
                  className="text-[10px] text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded flex items-center gap-0.5"
                >
                  <Tag className="w-2.5 h-2.5" />
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Meta row */}
          <div className="flex items-center justify-between mt-2">
            <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
              <Clock className="w-3 h-3" />
              {timeAgo(memory.created_at)}
              {memory.access_count > 0 && (
                <span className="ml-2 text-emerald-500/70">↑{memory.access_count} access</span>
              )}
            </div>

            {/* Confidence bar */}
            <div className="flex items-center gap-1">
              <span className="text-[9px] text-slate-500">conf</span>
              <div className="w-12 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-indigo-500 to-cyan-400 rounded-full"
                  style={{ width: `${memory.confidence_score}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity pt-2 border-t border-white/5">
        <button
          onClick={() => onPin(memory.id)}
          className={`p-1.5 rounded-lg text-xs flex items-center gap-1 transition-colors ${memory.is_pinned ? 'text-amber-400 bg-amber-500/10' : 'text-slate-400 hover:text-amber-400 hover:bg-amber-500/10'}`}
          title={memory.is_pinned ? 'Unpin' : 'Pin'}
        >
          <Pin className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => onReinforce(memory.id)}
          className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10 transition-colors"
          title="Reinforce (boost importance)"
        >
          <Star className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => onArchive(memory.id)}
          className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-400 hover:bg-cyan-500/10 transition-colors"
          title={memory.is_archived ? 'Unarchive' : 'Archive'}
        >
          <Archive className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => onDelete(memory.id)}
          className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors ml-auto"
          title="Delete"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </motion.div>
  );
};
