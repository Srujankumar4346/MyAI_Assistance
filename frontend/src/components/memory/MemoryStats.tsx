import React from 'react';
import { motion } from 'framer-motion';
import { Brain, Pin, Archive, Database, Activity, Zap, TrendingUp } from 'lucide-react';
import type { MemoryStats } from '../../types';

interface MemoryStatsProps {
  stats: MemoryStats | null;
  loading?: boolean;
}

const StatCard: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: string | number;
  sub?: string;
  color: string;
}> = ({ icon, label, value, sub, color }) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    className="glass-panel rounded-2xl border border-white/8 p-4 flex items-center gap-4"
  >
    <div className={`p-3 rounded-xl ${color} flex-shrink-0`}>{icon}</div>
    <div>
      <div className="text-2xl font-bold text-white">{value}</div>
      <div className="text-xs text-slate-400">{label}</div>
      {sub && <div className="text-[10px] text-slate-500 mt-0.5">{sub}</div>}
    </div>
  </motion.div>
);

export const MemoryStatsBar: React.FC<MemoryStatsProps> = ({ stats, loading }) => {
  if (loading || !stats) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="glass-panel rounded-2xl border border-white/8 p-4 h-20 animate-pulse bg-slate-800/40" />
        ))}
      </div>
    );
  }

  const healthColor =
    stats.health_score >= 80 ? 'text-emerald-400' :
    stats.health_score >= 50 ? 'text-amber-400' : 'text-red-400';

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          icon={<Brain className="w-5 h-5 text-indigo-300" />}
          label="Total Memories"
          value={stats.total_memories}
          sub={`avg importance: ${stats.avg_importance}`}
          color="bg-indigo-500/20"
        />
        <StatCard
          icon={<Pin className="w-5 h-5 text-amber-300" />}
          label="Pinned"
          value={stats.pinned}
          sub="permanent memories"
          color="bg-amber-500/20"
        />
        <StatCard
          icon={<Archive className="w-5 h-5 text-cyan-300" />}
          label="Archived"
          value={stats.archived}
          sub="stored for later"
          color="bg-cyan-500/20"
        />
        <StatCard
          icon={<Activity className="w-5 h-5 text-emerald-300" />}
          label="Health Score"
          value={`${stats.health_score}%`}
          sub={stats.embedding_provider}
          color="bg-emerald-500/20"
        />
      </div>

      {/* Category distribution */}
      {Object.keys(stats.categories).length > 0 && (
        <div className="glass-panel rounded-2xl border border-white/8 p-4">
          <div className="flex items-center gap-2 mb-3">
            <Database className="w-4 h-4 text-indigo-400" />
            <span className="text-xs font-semibold text-slate-300">Category Distribution</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {Object.entries(stats.categories)
              .sort(([, a], [, b]) => b - a)
              .map(([cat, count]) => (
                <div key={cat} className="flex items-center gap-1.5 bg-slate-800/60 px-3 py-1.5 rounded-xl border border-white/5">
                  <span className="text-xs text-slate-300 capitalize">{cat}</span>
                  <span className="text-xs font-bold text-cyan-400">{count}</span>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Top memories */}
      {stats.top_memories.length > 0 && (
        <div className="glass-panel rounded-2xl border border-white/8 p-4">
          <div className="flex items-center gap-2 mb-3">
            <Zap className="w-4 h-4 text-amber-400" />
            <span className="text-xs font-semibold text-slate-300">Most Important Memories</span>
          </div>
          <div className="space-y-2">
            {stats.top_memories.map((m, i) => (
              <div key={m.id} className="flex items-center gap-3">
                <span className="text-[10px] font-mono text-slate-500 w-4">#{i + 1}</span>
                <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-amber-500 to-orange-400 rounded-full"
                    style={{ width: `${m.importance}%` }}
                  />
                </div>
                <span className="text-[10px] text-amber-400 w-8 text-right">{m.importance}</span>
                <span className="text-xs text-slate-400 flex-1 truncate">{m.content}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
