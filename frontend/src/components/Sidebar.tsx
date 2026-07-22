import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Home, MessageSquare, Brain, Settings, Terminal, Info, Cpu, Sparkles } from 'lucide-react';

interface SidebarProps {
  selectedModel: string;
}

export const Sidebar: React.FC<SidebarProps> = ({ selectedModel }) => {
  const location = useLocation();
  const navigate = useNavigate();

  const navItems = [
    { id: 'home', path: '/', label: 'Home', icon: Home },
    { id: 'chat', path: '/chat', label: 'Chat', icon: MessageSquare },
    { id: 'memory', path: '/memory', label: 'Memory', icon: Brain },
    { id: 'settings', path: '/settings', label: 'Settings', icon: Settings },
    { id: 'logs', path: '/logs', label: 'System Logs', icon: Terminal },
    { id: 'about', path: '/about', label: 'About SAI', icon: Info },
  ];

  return (
    <aside className="w-64 h-screen glass-panel flex flex-col justify-between p-4 border-r border-indigo-500/20 z-20">
      <div>
        {/* Brand Header */}
        <div className="flex items-center gap-3 px-3 py-4 mb-6 border-b border-white/10">
          <div className="relative p-2 bg-indigo-600/30 rounded-xl border border-indigo-400/40 text-indigo-400 animate-pulse-glow">
            <Cpu className="w-7 h-7" />
            <Sparkles className="w-3 h-3 absolute -top-1 -right-1 text-cyan-300" />
          </div>
          <div>
            <h1 className="font-bold text-lg tracking-wider text-white bg-gradient-to-r from-white via-indigo-200 to-cyan-400 bg-clip-text text-transparent">
              SAI OS
            </h1>
            <p className="text-xs text-indigo-300/70 font-mono">v1.0.0 Phase 1</p>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <button
                key={item.id}
                onClick={() => navigate(item.path)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                  isActive
                    ? 'bg-gradient-to-r from-indigo-600/80 to-indigo-800/60 text-white shadow-lg shadow-indigo-500/30 border border-indigo-400/30 font-medium'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'text-cyan-300' : ''}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Footer Info Badge */}
      <div className="p-3 glass-panel rounded-xl border border-white/5 bg-slate-900/40 text-xs">
        <div className="flex items-center justify-between text-slate-400 mb-1">
          <span>Active Engine</span>
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
        </div>
        <div className="font-mono text-cyan-300 font-semibold truncate capitalize">
          {selectedModel || 'gemma'}
        </div>
      </div>
    </aside>
  );
};
