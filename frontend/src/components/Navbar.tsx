import React from 'react';
import type { User } from '../types';
import { UserCheck, LogOut, ShieldCheck, Activity, Menu } from 'lucide-react';
import { removeAuthToken } from '../api/client';

interface NavbarProps {
  user: User | null;
  onLogout: () => void;
  title: string;
  onToggleSidebar?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ user, onLogout, title, onToggleSidebar }) => {
  return (
    <header className="h-16 glass-panel border-b border-indigo-500/20 px-4 md:px-6 flex items-center justify-between z-10 bg-slate-900/50">
      <div className="flex items-center gap-3">
        {onToggleSidebar && (
          <button
            onClick={onToggleSidebar}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white md:hidden cursor-pointer hover:bg-white/5"
            title="Menu"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}
        <h2 className="text-sm md:text-xl font-bold text-white tracking-wide capitalize truncate max-w-[150px] md:max-w-none">
          {title}
        </h2>
        <span className="flex items-center gap-1 text-[10px] md:text-xs px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-mono">
          <Activity className="w-3 h-3 animate-pulse" /> ONLINE
        </span>
      </div>

      <div className="flex items-center gap-4">
        {user ? (
          <div className="flex items-center gap-2 md:gap-3 glass-panel px-2.5 py-1.5 rounded-xl border border-white/10">
            <div className="flex items-center gap-1.5 text-xs md:text-sm text-slate-200">
              <ShieldCheck className="w-4 h-4 text-indigo-400" />
              <span className="font-medium truncate max-w-[70px] md:max-w-none">
                {user.username}
              </span>
            </div>
            <button
              onClick={() => {
                removeAuthToken();
                onLogout();
              }}
              title="Logout"
              className="p-1 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <UserCheck className="w-4 h-4 text-indigo-400" />
            <span>Guest</span>
          </div>
        )}
      </div>
    </header>
  );
};
