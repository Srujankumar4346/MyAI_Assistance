import React from 'react';
import type { User } from '../types';
import { UserCheck, LogOut, ShieldCheck, Activity } from 'lucide-react';
import { removeAuthToken } from '../api/client';

interface NavbarProps {
  user: User | null;
  onLogout: () => void;
  title: string;
}

export const Navbar: React.FC<NavbarProps> = ({ user, onLogout, title }) => {
  return (
    <header className="h-16 glass-panel border-b border-indigo-500/20 px-6 flex items-center justify-between z-10">
      <div className="flex items-center gap-3">
        <h2 className="text-xl font-bold text-white tracking-wide capitalize">{title}</h2>
        <span className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-mono">
          <Activity className="w-3 h-3 animate-pulse" /> ONLINE
        </span>
      </div>

      <div className="flex items-center gap-4">
        {user ? (
          <div className="flex items-center gap-3 glass-panel px-3 py-1.5 rounded-xl border border-white/10">
            <div className="flex items-center gap-2 text-sm text-slate-200">
              <ShieldCheck className="w-4 h-4 text-indigo-400" />
              <span className="font-medium">{user.username}</span>
            </div>
            <button
              onClick={() => {
                removeAuthToken();
                onLogout();
              }}
              title="Logout"
              className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <UserCheck className="w-4 h-4 text-indigo-400" />
            <span>Guest Session</span>
          </div>
        )}
      </div>
    </header>
  );
};
