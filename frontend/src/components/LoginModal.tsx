import React, { useState } from 'react';
import { api, setAuthToken } from '../api/client';
import type { User } from '../types';
import { Lock, User as UserIcon, Cpu, AlertCircle, Sparkles } from 'lucide-react';

interface LoginModalProps {
  onLoginSuccess: (user: User) => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin123');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const data = await api.login({ username, password });
      setAuthToken(data.access_token);
      onLoginSuccess({ username: data.username, token: data.access_token });
    } catch (err: any) {
      setError(err.message || 'Invalid username or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md">
      <div className="w-full max-w-md p-8 glass-panel rounded-2xl border border-indigo-500/30 shadow-2xl shadow-indigo-500/20 relative overflow-hidden">
        {/* Glow accent decoration */}
        <div className="absolute -top-12 -left-12 w-40 h-40 bg-indigo-600/30 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-12 -right-12 w-40 h-40 bg-cyan-600/30 rounded-full blur-3xl pointer-events-none" />

        <div className="text-center mb-8">
          <div className="inline-flex p-3 bg-indigo-600/30 rounded-2xl border border-indigo-400/40 text-indigo-400 mb-3 animate-pulse-glow">
            <Cpu className="w-10 h-10" />
          </div>
          <h2 className="text-2xl font-bold text-white bg-gradient-to-r from-white via-indigo-200 to-cyan-400 bg-clip-text text-transparent">
            NOVA_X Authentication
          </h2>
          <p className="text-sm text-slate-400 mt-1">Neural Operating Virtual Assistance</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-semibold text-indigo-300 uppercase tracking-wider mb-2">Username</label>
            <div className="relative">
              <UserIcon className="w-5 h-5 absolute left-3.5 top-3.5 text-slate-400" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="w-full pl-11 pr-4 py-3 glass-input rounded-xl text-sm"
                placeholder="Enter username"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-indigo-300 uppercase tracking-wider mb-2">Password</label>
            <div className="relative">
              <Lock className="w-5 h-5 absolute left-3.5 top-3.5 text-slate-400" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full pl-11 pr-4 py-3 glass-input rounded-xl text-sm"
                placeholder="Enter password"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 glow-button text-white rounded-xl font-semibold flex items-center justify-center gap-2 text-sm disabled:opacity-50 mt-6"
          >
            {loading ? (
              <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <Sparkles className="w-4 h-4" /> Initialize NOVA_X System
              </>
            )}
          </button>
        </form>

        <div className="mt-6 text-center text-xs text-slate-500">
          Default Dev Credentials: <code className="text-cyan-400 font-mono">admin / admin123</code>
        </div>
      </div>
    </div>
  );
};
