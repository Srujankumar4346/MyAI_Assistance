import React, { useState } from 'react';
import { api, setAuthToken } from '../api/client';
import type { User } from '../types';
import { Lock, User as UserIcon, Cpu, AlertCircle, Sparkles } from 'lucide-react';

interface LoginModalProps {
  onLoginSuccess: (user: User) => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const data = await api.login({ username, password });
      setAuthToken(data.access_token);
      localStorage.setItem('novax_username', data.username);
      onLoginSuccess({ username: data.username, token: data.access_token });
    } catch (err: any) {
      const detail = err?.response?.data?.detail || err.message || 'Invalid username or password';
      setError(detail);
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

        <div className="relative my-6 text-center">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-800" />
          </div>
          <span className="relative px-3 bg-slate-950 text-xs text-slate-500 uppercase tracking-wider">
            Or continue with
          </span>
        </div>

        <div className="grid grid-cols-4 gap-3">
          <button
            type="button"
            onClick={() => window.location.href = '/api/auth/google'}
            title="Sign in with Google (Gmail)"
            className="p-3 glass-panel rounded-xl border border-slate-800 hover:border-indigo-500/50 hover:bg-indigo-500/10 transition-all duration-200 flex items-center justify-center group"
          >
            <svg className="w-5 h-5 fill-current text-slate-300 group-hover:text-white" viewBox="0 0 24 24">
              <path d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 15.96 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z"/>
            </svg>
          </button>

          <button
            type="button"
            onClick={() => window.location.href = '/api/auth/github'}
            title="Sign in with GitHub"
            className="p-3 glass-panel rounded-xl border border-slate-800 hover:border-indigo-500/50 hover:bg-indigo-500/10 transition-all duration-200 flex items-center justify-center group"
          >
            <svg className="w-5 h-5 fill-current text-slate-300 group-hover:text-white" viewBox="0 0 24 24">
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
            </svg>
          </button>

          <button
            type="button"
            onClick={() => window.location.href = '/api/auth/facebook'}
            title="Sign in with Facebook"
            className="p-3 glass-panel rounded-xl border border-slate-800 hover:border-indigo-500/50 hover:bg-indigo-500/10 transition-all duration-200 flex items-center justify-center group"
          >
            <svg className="w-5 h-5 fill-current text-slate-300 group-hover:text-white" viewBox="0 0 24 24">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
            </svg>
          </button>

          <button
            type="button"
            onClick={() => window.location.href = '/api/auth/apple'}
            title="Sign in with Apple"
            className="p-3 glass-panel rounded-xl border border-slate-800 hover:border-indigo-500/50 hover:bg-indigo-500/10 transition-all duration-200 flex items-center justify-center group"
          >
            <svg className="w-5 h-5 fill-current text-slate-300 group-hover:text-white" viewBox="0 0 24 24">
              <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.13c.67-.82 1.13-1.96.99-3.13-1 .04-2.22.67-2.92 1.49-.62.72-1.16 1.88-1.01 3.01 1.12.09 2.26-.55 2.94-1.37z"/>
            </svg>
          </button>
        </div>

        <div className="mt-6 text-center text-xs text-slate-500">
          NOVA_X Secure Authentication Portal
        </div>
      </div>
    </div>
  );
};
