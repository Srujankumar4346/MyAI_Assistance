import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import type { SystemMetrics } from '../types';
import {
  Cpu,
  HardDrive,
  Zap,
  Brain,
  MessageSquare,
  Shield,
  Activity,
  Clock,
  ArrowRight,
} from 'lucide-react';

interface HomeProps {
  selectedModel: string;
}

export const Home: React.FC<HomeProps> = ({ selectedModel }) => {
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null);
  const [memoryCount, setMemoryCount] = useState<number>(0);
  const [chatCount, setChatCount] = useState<number>(0);

  useEffect(() => {
    async function fetchData() {
      try {
        const [sys, mems, chats] = await Promise.all([
          api.getSystem().catch(() => null),
          api.getMemories().catch(() => []),
          api.getHistory().catch(() => []),
        ]);
        if (sys) setMetrics(sys);
        if (mems) setMemoryCount(mems.length);
        if (chats) setChatCount(chats.length);
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
      }
    }
    fetchData();
  }, []);

  return (
    <div className="space-y-6 pb-8">
      {/* Welcome Banner */}
      <div className="glass-panel p-8 rounded-2xl relative overflow-hidden border border-indigo-500/30">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs font-mono mb-4">
            <Activity className="w-3.5 h-3.5 text-cyan-400 animate-pulse" /> NOVA_X ARCHITECTURE
            ACTIVE
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight mb-2">
            Welcome back to{' '}
            <span className="bg-gradient-to-r from-cyan-400 via-indigo-300 to-indigo-500 bg-clip-text text-transparent">
              NOVA_X OS
            </span>
          </h1>
          <p className="text-slate-300 text-sm leading-relaxed">
            Your personal artificial intelligence system foundation is online. Connected to local
            Ollama inference, long-term ChromaDB vector storage, and SQLite/PostgreSQL session
            persistence.
          </p>

          <div className="mt-6 flex flex-wrap gap-4">
            <button
              onClick={() => navigate('/chat')}
              className="px-5 py-2.5 glow-button text-white rounded-xl font-medium text-sm flex items-center gap-2 cursor-pointer"
            >
              <MessageSquare className="w-4 h-4" /> Open Chat Studio{' '}
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => navigate('/memory')}
              className="px-5 py-2.5 glass-panel glass-panel-hover text-slate-200 rounded-xl font-medium text-sm flex items-center gap-2 border border-white/10 cursor-pointer"
            >
              <Brain className="w-4 h-4 text-indigo-400" /> Manage Memory ({memoryCount})
            </button>
          </div>
        </div>
      </div>

      {/* System Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="glass-panel glass-panel-hover p-5 rounded-2xl border border-white/10">
          <div className="flex items-center justify-between text-slate-400 mb-3">
            <span className="text-xs uppercase font-semibold text-slate-400">AI Model Engine</span>
            <Zap className="w-5 h-5 text-amber-400" />
          </div>
          <div className="text-xl font-bold text-white capitalize">{selectedModel || 'Gemma'}</div>
          <p className="text-xs text-slate-400 mt-1 font-mono">Local Ollama Inference</p>
        </div>

        <div className="glass-panel glass-panel-hover p-5 rounded-2xl border border-white/10">
          <div className="flex items-center justify-between text-slate-400 mb-3">
            <span className="text-xs uppercase font-semibold text-slate-400">CPU Usage</span>
            <Cpu className="w-5 h-5 text-indigo-400" />
          </div>
          <div className="text-xl font-bold text-white">
            {metrics ? `${metrics.cpu_usage_percent}%` : '---'}
          </div>
          <div className="w-full bg-slate-800 rounded-full h-1.5 mt-2 overflow-hidden">
            <div
              className="bg-indigo-500 h-1.5 rounded-full transition-all duration-500"
              style={{ width: `${metrics?.cpu_usage_percent || 0}%` }}
            />
          </div>
        </div>

        <div className="glass-panel glass-panel-hover p-5 rounded-2xl border border-white/10">
          <div className="flex items-center justify-between text-slate-400 mb-3">
            <span className="text-xs uppercase font-semibold text-slate-400">System RAM</span>
            <HardDrive className="w-5 h-5 text-cyan-400" />
          </div>
          <div className="text-xl font-bold text-white">
            {metrics ? `${metrics.ram_used_gb} GB / ${metrics.ram_total_gb} GB` : '---'}
          </div>
          <div className="w-full bg-slate-800 rounded-full h-1.5 mt-2 overflow-hidden">
            <div
              className="bg-cyan-400 h-1.5 rounded-full transition-all duration-500"
              style={{ width: `${metrics?.ram_usage_percent || 0}%` }}
            />
          </div>
        </div>

        <div className="glass-panel glass-panel-hover p-5 rounded-2xl border border-white/10">
          <div className="flex items-center justify-between text-slate-400 mb-3">
            <span className="text-xs uppercase font-semibold text-slate-400">Vector Memory</span>
            <Brain className="w-5 h-5 text-emerald-400" />
          </div>
          <div className="text-xl font-bold text-white">{memoryCount} Items</div>
          <p className="text-xs text-emerald-400/80 mt-1 font-mono">ChromaDB Vector Storage</p>
        </div>
      </div>

      {/* Quick Status & Specs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 glass-panel p-6 rounded-2xl border border-white/10 space-y-4">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Shield className="w-5 h-5 text-indigo-400" /> System Architecture & Environment
          </h3>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-2">
            <div className="bg-slate-900/50 p-3 rounded-xl border border-white/5">
              <span className="text-xs text-slate-400 block">Host OS</span>
              <span className="text-sm font-semibold text-slate-200">
                {metrics?.os || 'Windows'}
              </span>
            </div>
            <div className="bg-slate-900/50 p-3 rounded-xl border border-white/5">
              <span className="text-xs text-slate-400 block">Architecture</span>
              <span className="text-sm font-semibold text-slate-200">
                {metrics?.architecture || 'x86_64'}
              </span>
            </div>
            <div className="bg-slate-900/50 p-3 rounded-xl border border-white/5">
              <span className="text-xs text-slate-400 block">CPU Cores</span>
              <span className="text-sm font-semibold text-slate-200">
                {metrics?.cpu_count || 4} Logical Cores
              </span>
            </div>
            <div className="bg-slate-900/50 p-3 rounded-xl border border-white/5">
              <span className="text-xs text-slate-400 block">Conversations</span>
              <span className="text-sm font-semibold text-slate-200">{chatCount} Sessions</span>
            </div>
            <div className="bg-slate-900/50 p-3 rounded-xl border border-white/5">
              <span className="text-xs text-slate-400 block">API Framework</span>
              <span className="text-sm font-semibold text-slate-200">FastAPI / Async</span>
            </div>
            <div className="bg-slate-900/50 p-3 rounded-xl border border-white/5">
              <span className="text-xs text-slate-400 block">Server Time</span>
              <span className="text-xs font-mono text-cyan-300">
                {metrics?.server_time || '--:--:--'}
              </span>
            </div>
          </div>
        </div>

        <div className="glass-panel p-6 rounded-2xl border border-white/10 flex flex-col justify-between">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-3">
              <Clock className="w-5 h-5 text-cyan-400" /> Phase 1 Capabilities
            </h3>
            <ul className="space-y-2 text-xs text-slate-300">
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Local Ollama Chat
                Streaming
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> JWT Protected API
                Backend
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Long-Term Vector Memory
                (ChromaDB)
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> SQL Database Backed
                History & Settings
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Desktop-First
                Futuristic UI
              </li>
            </ul>
          </div>

          <div className="mt-4 pt-4 border-t border-white/10 text-center">
            <span className="text-xs font-mono text-indigo-300">Ready for Phase 2 Expansion</span>
          </div>
        </div>
      </div>
    </div>
  );
};
