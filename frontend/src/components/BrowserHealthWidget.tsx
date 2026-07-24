import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HeartPulse, Activity, Cpu, HardDrive, Wifi, Server, AlertCircle } from 'lucide-react';
import { useBrowserWebSocket, BrowserEvent } from '../contexts/BrowserWebSocketProvider';

interface BrowserHealthState {
  cpuUsage: number;
  memoryUsage: number;
  activeSessions: number;
  activeTabs: number;
  activeDownloads: number;
  connectedClients: number;
  reconnectCount: number;
  crashCount: number;
  errorCount: number;
  healthScore: number;
  uptime: string;
  avgResponseTime: number;
}

export const BrowserHealthWidget: React.FC = React.memo(() => {
  const { isConnected, subscribe } = useBrowserWebSocket();
  const [health, setHealth] = useState<BrowserHealthState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [healthHistory, setHealthHistory] = useState<number[]>([]);

  useEffect(() => {
    // Simulated REST load
    setHealth({
      cpuUsage: 0,
      memoryUsage: 0,
      activeSessions: 0,
      activeTabs: 0,
      activeDownloads: 0,
      connectedClients: 0,
      reconnectCount: 0,
      crashCount: 0,
      errorCount: 0,
      healthScore: 100,
      uptime: '00:00:00',
      avgResponseTime: 0,
    });
    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (!isConnected) return;
    const unsubscribe = subscribe('browser.health', (event: BrowserEvent) => {
      const payload = event.payload;
      if (event.event_type === 'HEALTH_UPDATE' || event.event_type === 'TELEMETRY_EVENT') {
        setHealth((prev) => {
          const next = { ...prev, ...payload };
          setHealthHistory((h) => [...h, next.healthScore].slice(-20)); // Keep last 20 ticks
          return next;
        });
      }
    });
    return () => unsubscribe();
  }, [isConnected, subscribe]);

  if (isLoading || !health) {
    return (
      <div className="p-4 bg-gray-900/50 backdrop-blur-md rounded-xl text-gray-400">
        Loading Browser Health...
      </div>
    );
  }

  const getHealthColor = (score: number) => {
    if (score > 90) return 'text-emerald-400';
    if (score > 70) return 'text-yellow-400';
    return 'text-red-400';
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col h-full bg-gray-900/40 backdrop-blur-xl border border-gray-800 rounded-2xl shadow-2xl p-5 gap-5"
    >
      <div className="flex justify-between items-center border-b border-gray-800 pb-3">
        <h3 className="text-lg font-semibold text-gray-100 flex items-center gap-2">
          <HeartPulse className={`w-5 h-5 ${getHealthColor(health.healthScore)}`} />
          Health Center
        </h3>
        <div className="flex items-center gap-3 text-xs font-mono">
          <span className="text-gray-400">Uptime: {health.uptime}</span>
          <span
            className={`px-2 py-1 rounded-full ${isConnected ? 'bg-emerald-900/30 text-emerald-400' : 'bg-red-900/30 text-red-400'}`}
          >
            {isConnected ? 'WS OK' : 'WS OFFLINE'}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Metric Cards */}
        <div className="bg-gray-800/40 p-3 rounded-xl border border-gray-700/50 flex flex-col gap-1">
          <div className="flex items-center gap-2 text-gray-400 text-xs uppercase font-bold tracking-wider">
            <Activity className="w-3.5 h-3.5" /> Score
          </div>
          <span className={`text-2xl font-bold ${getHealthColor(health.healthScore)}`}>
            {health.healthScore}%
          </span>
        </div>

        <div className="bg-gray-800/40 p-3 rounded-xl border border-gray-700/50 flex flex-col gap-1">
          <div className="flex items-center gap-2 text-gray-400 text-xs uppercase font-bold tracking-wider">
            <Cpu className="w-3.5 h-3.5" /> CPU
          </div>
          <span className="text-2xl font-bold text-gray-200">{health.cpuUsage}%</span>
        </div>

        <div className="bg-gray-800/40 p-3 rounded-xl border border-gray-700/50 flex flex-col gap-1">
          <div className="flex items-center gap-2 text-gray-400 text-xs uppercase font-bold tracking-wider">
            <HardDrive className="w-3.5 h-3.5" /> RAM
          </div>
          <span className="text-2xl font-bold text-gray-200">{health.memoryUsage}MB</span>
        </div>

        <div className="bg-gray-800/40 p-3 rounded-xl border border-gray-700/50 flex flex-col gap-1">
          <div className="flex items-center gap-2 text-gray-400 text-xs uppercase font-bold tracking-wider">
            <AlertCircle className="w-3.5 h-3.5" /> Errors
          </div>
          <span
            className={`text-2xl font-bold ${health.errorCount > 0 ? 'text-red-400' : 'text-gray-200'}`}
          >
            {health.errorCount}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-x-8 gap-y-4 text-xs mt-2 border-t border-gray-800 pt-4">
        <div className="flex justify-between border-b border-gray-800/50 pb-1">
          <span className="text-gray-500">Active Sessions</span>
          <span className="text-gray-300 font-mono">{health.activeSessions}</span>
        </div>
        <div className="flex justify-between border-b border-gray-800/50 pb-1">
          <span className="text-gray-500">Active Tabs</span>
          <span className="text-gray-300 font-mono">{health.activeTabs}</span>
        </div>
        <div className="flex justify-between border-b border-gray-800/50 pb-1">
          <span className="text-gray-500">Active Downloads</span>
          <span className="text-gray-300 font-mono">{health.activeDownloads}</span>
        </div>
        <div className="flex justify-between border-b border-gray-800/50 pb-1">
          <span className="text-gray-500">WS Clients</span>
          <span className="text-gray-300 font-mono">{health.connectedClients}</span>
        </div>
        <div className="flex justify-between border-b border-gray-800/50 pb-1">
          <span className="text-gray-500">Crashes</span>
          <span
            className={`font-mono ${health.crashCount > 0 ? 'text-red-400 font-bold' : 'text-gray-300'}`}
          >
            {health.crashCount}
          </span>
        </div>
        <div className="flex justify-between border-b border-gray-800/50 pb-1">
          <span className="text-gray-500">Avg Resp Time</span>
          <span className="text-gray-300 font-mono">{health.avgResponseTime}ms</span>
        </div>
      </div>

      {/* Sparkline visualization of health score */}
      <div className="h-12 w-full mt-auto flex items-end gap-1 opacity-50">
        {healthHistory.map((score, i) => (
          <motion.div
            key={i}
            initial={{ height: 0 }}
            animate={{ height: `${score}%` }}
            className={`flex-1 rounded-t-sm ${score > 80 ? 'bg-emerald-500' : score > 50 ? 'bg-yellow-500' : 'bg-red-500'}`}
          />
        ))}
      </div>
    </motion.div>
  );
});
