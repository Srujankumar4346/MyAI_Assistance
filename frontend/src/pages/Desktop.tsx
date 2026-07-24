import React, { useState, useEffect } from 'react';
import { Monitor, AppWindow, Play, Square, Shield, Clock } from 'lucide-react';
import apiClient from '../api/client';

export default function DesktopControlCenter() {
  const [apps, setApps] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);

  useEffect(() => {
    fetchApps();
    fetchLogs();
    const interval = setInterval(fetchApps, 10000);
    return () => clearInterval(interval);
  }, []);

  const fetchApps = async () => {
    try {
      const res = await apiClient.post('/desktop/execute', {
        action_type: 'list_apps',
        target: 'system',
        level: 'SAFE',
      });
      if (res.result) setApps(res.result);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchLogs = async () => {
    try {
      const res = await apiClient.get('/desktop/logs');
      setLogs(res);
    } catch (err) {
      console.error(err);
    }
  };

  const handleClose = async (appName: string) => {
    try {
      await apiClient.post('/desktop/execute', {
        action_type: 'close_app',
        target: appName,
        level: 'HIGH',
        params: { process_name: appName },
      });
      fetchApps();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-slate-900/50 p-6 overflow-y-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Monitor className="w-8 h-8 text-indigo-400" />
          <h1 className="text-2xl font-bold text-white tracking-wide">Desktop Control Center</h1>
        </div>
        <div className="flex items-center gap-2 bg-indigo-500/20 text-indigo-300 px-4 py-2 rounded-full border border-indigo-500/30">
          <Shield className="w-4 h-4" />
          <span className="text-sm font-semibold">Active Engine</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active Applications */}
        <div className="bg-slate-800/80 rounded-xl border border-slate-700/50 flex flex-col h-[500px]">
          <div className="p-4 border-b border-slate-700/50 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <AppWindow className="w-5 h-5 text-cyan-400" />
              Running Applications
            </h2>
            <span className="bg-slate-700 text-slate-300 px-2 py-1 rounded text-xs">
              {apps.length} active
            </span>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {apps.map((app, i) => (
              <div
                key={i}
                className="bg-slate-900/50 p-3 rounded-lg border border-slate-700/30 flex items-center justify-between group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-indigo-500/20 rounded-lg flex items-center justify-center text-indigo-400 font-bold">
                    {app.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="text-slate-200 font-medium">{app.name}</h3>
                    <p className="text-slate-500 text-xs">PID: {app.pid}</p>
                  </div>
                </div>
                <button
                  onClick={() => handleClose(app.name)}
                  className="opacity-0 group-hover:opacity-100 p-2 text-rose-400 hover:bg-rose-400/20 rounded-lg transition-all"
                >
                  <Square className="w-4 h-4" fill="currentColor" />
                </button>
              </div>
            ))}
            {apps.length === 0 && (
              <div className="text-slate-500 text-center py-10">No applications detected</div>
            )}
          </div>
        </div>

        {/* Automation History */}
        <div className="bg-slate-800/80 rounded-xl border border-slate-700/50 flex flex-col h-[500px]">
          <div className="p-4 border-b border-slate-700/50">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <Clock className="w-5 h-5 text-emerald-400" />
              Recent Actions
            </h2>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {logs.map((log) => (
              <div
                key={log.id}
                className="bg-slate-900/50 p-3 rounded-lg border border-slate-700/30"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-indigo-300 text-sm font-mono">{log.action_type}</span>
                  <span
                    className={`text-xs px-2 py-1 rounded-full ${
                      log.status === 'success'
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : log.status === 'blocked'
                          ? 'bg-orange-500/20 text-orange-400'
                          : 'bg-rose-500/20 text-rose-400'
                    }`}
                  >
                    {log.status.toUpperCase()}
                  </span>
                </div>
                <p className="text-slate-300 text-sm">{log.target}</p>
                <div className="text-slate-500 text-xs mt-2 flex items-center justify-between">
                  <span>{new Date(log.created_at).toLocaleString()}</span>
                  <span>{log.duration_ms}ms</span>
                </div>
              </div>
            ))}
            {logs.length === 0 && (
              <div className="text-slate-500 text-center py-10">No recent automation logs</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
