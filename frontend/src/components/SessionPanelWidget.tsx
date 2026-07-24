import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { LayoutPanelLeft, Play, Pause, XCircle, RefreshCw } from 'lucide-react';
import { useBrowserWebSocket, BrowserEvent } from '../contexts/BrowserWebSocketProvider';

interface SessionState {
  sessionId: string;
  workspace: string;
  browserType: string;
  currentUrl: string;
  pageTitle: string;
  state: string; // RUNNING, SUSPENDED, IDLE
  duration: string;
  activeTabs: number;
}

export const SessionPanelWidget: React.FC = React.memo(() => {
  const { isConnected, subscribe } = useBrowserWebSocket();
  const [session, setSession] = useState<SessionState | null>(null);

  useEffect(() => {
    // Simulated REST load for skeletal structure
    setSession(null); 
  }, []);

  useEffect(() => {
    if (!isConnected) return;
    const unsubscribe = subscribe('browser.session', (event: BrowserEvent) => {
      if (event.event_type === 'SESSION_CREATED' || event.event_type === 'SESSION_UPDATE') {
        setSession(event.payload);
      } else if (event.event_type === 'SESSION_CLOSED') {
        setSession(null);
      }
    });
    return () => unsubscribe();
  }, [isConnected, subscribe]);

  if (!session) {
    return (
      <div className="p-6 bg-gray-900/40 backdrop-blur-xl border border-gray-800 rounded-2xl flex flex-col items-center justify-center text-gray-500 min-h-[200px]">
        <LayoutPanelLeft className="w-8 h-8 mb-2 opacity-50" />
        <p>No Active Session</p>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      className="p-6 bg-gray-900/40 backdrop-blur-xl border border-gray-800 rounded-2xl shadow-2xl flex flex-col gap-5"
    >
      <div className="flex justify-between items-start border-b border-gray-800 pb-3">
        <div className="flex flex-col gap-1 overflow-hidden">
          <h3 className="text-lg font-semibold text-gray-100 truncate">{session.pageTitle || 'New Tab'}</h3>
          <span className="text-xs text-blue-400 font-mono truncate">{session.currentUrl || 'about:blank'}</span>
        </div>
        <div className="flex gap-2">
          {/* Action buttons (these would typically fire REST APIs) */}
          <button className="p-2 hover:bg-gray-800 rounded-lg text-gray-400 hover:text-white transition-colors" title="Refresh">
            <RefreshCw className="w-4 h-4" />
          </button>
          <button className="p-2 hover:bg-gray-800 rounded-lg text-gray-400 hover:text-white transition-colors" title="Suspend">
            <Pause className="w-4 h-4" />
          </button>
          <button className="p-2 hover:bg-red-900/50 rounded-lg text-gray-400 hover:text-red-400 transition-colors" title="Close Session">
            <XCircle className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 text-sm">
        <div className="flex flex-col gap-1">
          <span className="text-gray-500 uppercase text-xs font-bold tracking-wider">Session ID</span>
          <span className="text-gray-300 font-mono text-xs truncate" title={session.sessionId}>
            {session.sessionId.split('-')[0]}...
          </span>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-gray-500 uppercase text-xs font-bold tracking-wider">State</span>
          <span className="text-gray-300">{session.state}</span>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-gray-500 uppercase text-xs font-bold tracking-wider">Tabs</span>
          <span className="text-gray-300">{session.activeTabs} Open</span>
        </div>
      </div>
    </motion.div>
  );
});
