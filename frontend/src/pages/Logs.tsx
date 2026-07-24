import React, { useEffect, useState } from 'react';
import { api } from '../api/client';
import { Terminal, RefreshCw } from 'lucide-react';

export const Logs: React.FC = () => {
  const [logs, setLogs] = useState<string[]>([]);
  const [file, setFile] = useState<string>('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const data = await api.getLogs();
      if (data.logs) setLogs(data.logs);
      if (data.file) setFile(data.file);
    } catch (e) {
      console.error('Failed to fetch system logs', e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 pb-8">
      <div className="glass-panel p-6 rounded-2xl border border-indigo-500/30 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Terminal className="w-6 h-6 text-cyan-400" /> NOVA_X Real-Time System Logs
          </h2>
          <p className="text-xs text-slate-300 mt-1">
            Viewing log output from{' '}
            <code className="text-cyan-300 font-mono">{file || 'latest log'}</code>
          </p>
        </div>
        <button
          onClick={fetchLogs}
          disabled={loading}
          className="glass-panel glass-panel-hover px-4 py-2 rounded-xl text-slate-200 text-xs font-semibold flex items-center gap-2 border border-white/10"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh Logs
        </button>
      </div>

      <div className="glass-panel p-6 rounded-2xl border border-white/10 font-mono text-xs text-slate-300 bg-slate-950/80 max-h-[600px] overflow-y-auto space-y-2 leading-relaxed">
        {logs.length === 0 ? (
          <div className="text-slate-500 py-8 text-center">No system log entries recorded yet.</div>
        ) : (
          logs.map((log, idx) => {
            const isError = log.includes('[ERROR]');
            const isWarn = log.includes('[WARNING]');
            return (
              <div
                key={idx}
                className={`p-2 rounded-lg ${
                  isError
                    ? 'bg-red-500/10 border border-red-500/20 text-red-300'
                    : isWarn
                      ? 'bg-amber-500/10 border border-amber-500/20 text-amber-300'
                      : 'hover:bg-slate-900/60'
                }`}
              >
                <span className="text-slate-500 mr-2">[{idx + 1}]</span>
                {log}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
