import React, { useState } from 'react';
import { Globe, Search, Plus, X, Layers, Play, Archive, CheckCircle } from 'lucide-react';
import apiClient from '../api/client';

export default function BrowserControlCenter() {
  const [url, setUrl] = useState('https://github.com');
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<string | null>(null);

  const handleNavigate = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('Navigating...');
    try {
      const res = await apiClient.post('/browser/navigate', {
        url: url,
        workspace_name: 'Personal',
        headed: false,
      });
      setStatus(
        res.status === 'success'
          ? `Successfully loaded: ${res.result.title}`
          : `Error: ${res.message || 'Blocked'}`
      );
    } catch (err: any) {
      setStatus(`Failed: ${err.message}`);
    }
  };

  const handleResearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('Researching...');
    try {
      const res = await apiClient.post('/browser/research', {
        query: query,
        workspace_name: 'Research',
      });
      setStatus(
        res.status === 'success'
          ? `Research complete! Report generated.`
          : `Error: ${res.message || 'Blocked'}`
      );
    } catch (err: any) {
      setStatus(`Failed: ${err.message}`);
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-slate-900/50 p-6 overflow-y-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Globe className="w-8 h-8 text-blue-400" />
          <h1 className="text-2xl font-bold text-white tracking-wide">Browser Control Center</h1>
        </div>
        <div className="flex items-center gap-2 bg-blue-500/20 text-blue-300 px-4 py-2 rounded-full border border-blue-500/30">
          <Layers className="w-4 h-4" />
          <span className="text-sm font-semibold">Playwright Engine Active</span>
        </div>
      </div>

      {status && (
        <div className="mb-6 p-4 rounded-lg bg-slate-800/80 border border-slate-700/50 text-slate-200 flex items-center gap-2">
          <CheckCircle className="w-5 h-5 text-emerald-400" />
          {status}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Navigation Testing */}
        <div className="bg-slate-800/80 rounded-xl border border-slate-700/50 p-6">
          <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
            <Globe className="w-5 h-5 text-blue-400" />
            URL Navigation
          </h2>
          <form onSubmit={handleNavigate} className="flex gap-2">
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="flex-1 bg-slate-900/50 border border-slate-700/50 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
              placeholder="https://..."
              required
            />
            <button
              type="submit"
              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg font-medium transition-colors"
            >
              Go
            </button>
          </form>
          <p className="text-slate-500 text-sm mt-4">
            Navigates silently in the background and returns the extracted page title.
          </p>
        </div>

        {/* AI Research Pipeline */}
        <div className="bg-slate-800/80 rounded-xl border border-slate-700/50 p-6">
          <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
            <Search className="w-5 h-5 text-fuchsia-400" />
            AI Research Pipeline
          </h2>
          <form onSubmit={handleResearch} className="flex flex-col gap-3">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="bg-slate-900/50 border border-slate-700/50 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-fuchsia-500"
              placeholder="e.g. FastAPI vs Flask performance 2026"
              required
            />
            <button
              type="submit"
              className="bg-fuchsia-500 hover:bg-fuchsia-600 text-white px-4 py-2 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors"
            >
              <Play className="w-4 h-4" /> Start Research
            </button>
          </form>
          <p className="text-slate-500 text-sm mt-4">
            Triggers the 7-step Research Pipeline: Search ➔ Open ➔ Extract ➔ Summarize ➔ Knowledge
            Graph.
          </p>
        </div>
      </div>
    </div>
  );
}
