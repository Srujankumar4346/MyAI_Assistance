import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Activity, Globe, Wifi, WifiOff } from 'lucide-react';
import { useBrowserWebSocket, BrowserEvent } from '../contexts/BrowserWebSocketProvider';

interface BrowserStatusState {
  driver: string;
  driverStatus: string;
  state: string;
  workspace: string;
  activeSession: string | null;
  healthScore: number;
  features: Record<string, boolean>;
}

export const BrowserStatusWidget: React.FC = React.memo(() => {
  const { isConnected, error, subscribe } = useBrowserWebSocket();
  const [status, setStatus] = useState<BrowserStatusState | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // REST initialization would go here to fetch initial state
  useEffect(() => {
    // Simulated REST load for skeletal structure
    setStatus({
      driver: 'Playwright',
      driverStatus: 'READY',
      state: 'IDLE',
      workspace: 'Personal',
      activeSession: null,
      healthScore: 100,
      features: { research: true, forms: true }
    });
    setIsLoading(false);
  }, []);

  // WebSocket Subscription
  useEffect(() => {
    if (!isConnected) return;
    const unsubscribe = subscribe('browser.health', (event: BrowserEvent) => {
      // Update state when live health events come in
      if (event.event_type === 'HEALTH_UPDATE') {
        setStatus(prev => prev ? { ...prev, ...event.payload } : event.payload);
      }
    });
    return () => unsubscribe();
  }, [isConnected, subscribe]);

  if (isLoading) {
    return <div className="p-4 bg-gray-900/50 backdrop-blur-md rounded-xl text-gray-400">Loading Browser Status...</div>;
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-6 bg-gray-900/40 backdrop-blur-xl border border-gray-800 rounded-2xl shadow-2xl flex flex-col gap-4"
    >
      <div className="flex justify-between items-center border-b border-gray-800 pb-2">
        <h3 className="text-lg font-semibold text-gray-100 flex items-center gap-2">
          <Globe className="w-5 h-5 text-blue-400" />
          Browser Status
        </h3>
        <div className="flex items-center gap-2">
          {isConnected ? (
            <span className="flex items-center gap-1 text-xs text-green-400 bg-green-400/10 px-2 py-1 rounded-full">
              <Wifi className="w-3 h-3" /> Connected
            </span>
          ) : (
            <span className="flex items-center gap-1 text-xs text-red-400 bg-red-400/10 px-2 py-1 rounded-full">
              <WifiOff className="w-3 h-3" /> Disconnected
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 text-sm">
        <div className="flex flex-col gap-1">
          <span className="text-gray-500 uppercase text-xs font-bold tracking-wider">State</span>
          <span className="text-gray-200 font-mono">{status?.state}</span>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-gray-500 uppercase text-xs font-bold tracking-wider">Workspace</span>
          <span className="text-gray-200 font-mono">{status?.workspace}</span>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-gray-500 uppercase text-xs font-bold tracking-wider">Health Score</span>
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-green-400" />
            <span className="text-green-400 font-bold">{status?.healthScore}%</span>
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-gray-500 uppercase text-xs font-bold tracking-wider">Driver</span>
          <span className="text-gray-200">{status?.driver}</span>
        </div>
      </div>
    </motion.div>
  );
});
