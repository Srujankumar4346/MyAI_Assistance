import React from 'react';
import { Cpu, ShieldCheck, Layers, Sparkles, CheckCircle2, Circle } from 'lucide-react';

export const About: React.FC = () => {
  const phases = [
    { phase: 1, title: 'Foundation & Core AI OS Architecture', status: 'active', desc: 'FastAPI REST backend, SQLite history, ChromaDB vector memory, Ollama inference, glassmorphic UI.' },
    { phase: 2, title: 'Voice Control & Speech Recognition', status: 'planned', desc: 'Real-time text-to-speech & speech-to-text integration.' },
    { phase: 3, title: 'Browser Automation & Web Agent', status: 'planned', desc: 'Autonomous web scraping, search synthesis, and web browser control.' },
    { phase: 4, title: 'Desktop & OS Automation', status: 'planned', desc: 'App launching, filesystem management, and system task execution.' },
    { phase: 5, title: 'Multi-Agent Collaborative System', status: 'planned', desc: 'Specialized subagents for coding, research, writing, and design.' },
    { phase: 6, title: 'Android & Mobile Integration', status: 'planned', desc: 'Cross-device notification sync and mobile remote control.' },
  ];

  return (
    <div className="space-y-6 pb-8">
      {/* Banner */}
      <div className="glass-panel p-8 rounded-2xl border border-indigo-500/30 relative overflow-hidden">
        <div className="flex items-center gap-4 mb-4">
          <div className="p-3 bg-indigo-600/30 rounded-2xl border border-indigo-400/40 text-indigo-400 animate-pulse-glow">
            <Cpu className="w-10 h-10" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-white">SAI — Srujan Artificial Intelligence</h1>
            <p className="text-sm text-cyan-300 font-mono">Personal AI Operating System • Phase 1 Release</p>
          </div>
        </div>

        <p className="text-slate-300 text-sm leading-relaxed max-w-3xl">
          SAI is a production-grade personal AI assistant OS designed for privacy-first, local-first intelligence. Powered by fast asynchronous microservices, vector memory retention, and flexible local/cloud model orchestration.
        </p>
      </div>

      {/* Tech Stack Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="glass-panel p-6 rounded-2xl border border-white/10">
          <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
            <Layers className="w-4 h-4 text-cyan-400" /> Frontend Architecture
          </h3>
          <ul className="space-y-2 text-xs text-slate-300">
            <li>• <strong>React 19 & TypeScript</strong> for type-safe responsive components</li>
            <li>• <strong>Tailwind CSS v4 & Glassmorphism</strong> design system</li>
            <li>• <strong>Framer Motion & Lucide Icons</strong> for sleek micro-interactions</li>
            <li>• <strong>React Markdown & Syntax Highlighter</strong> for rich message feeds</li>
          </ul>
        </div>

        <div className="glass-panel p-6 rounded-2xl border border-white/10">
          <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-indigo-400" /> Backend Architecture
          </h3>
          <ul className="space-y-2 text-xs text-slate-300">
            <li>• <strong>FastAPI (Python 3.10)</strong> asynchronous REST API</li>
            <li>• <strong>ChromaDB Vector DB</strong> for semantic long-term memory retrieval</li>
            <li>• <strong>Ollama Engine</strong> for local LLM inference (Gemma, Llama 3, Qwen)</li>
            <li>• <strong>SQLite DB & JWT Auth</strong> for secure session management</li>
          </ul>
        </div>
      </div>

      {/* Roadmap Preview */}
      <div className="glass-panel p-6 rounded-2xl border border-white/10">
        <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-cyan-400" /> SAI Project Roadmap (20 Phases)
        </h3>

        <div className="space-y-3">
          {phases.map((p) => (
            <div
              key={p.phase}
              className={`p-4 rounded-xl border flex items-start gap-4 ${
                p.status === 'active'
                  ? 'bg-indigo-600/20 border-indigo-500/40 text-white'
                  : 'glass-panel border-white/5 text-slate-400 opacity-75'
              }`}
            >
              <div className="mt-0.5">
                {p.status === 'active' ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                ) : (
                  <Circle className="w-5 h-5 text-slate-600 flex-shrink-0" />
                )}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm">Phase {p.phase}: {p.title}</span>
                  {p.status === 'active' && (
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-mono border border-emerald-500/30">
                      CURRENT PHASE
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-300 mt-1">{p.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
