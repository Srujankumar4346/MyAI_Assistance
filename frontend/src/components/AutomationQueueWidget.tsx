import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, Play, Pause, X, ShieldAlert, Check, Clock } from 'lucide-react';
import { useBrowserWebSocket, BrowserEvent } from '../contexts/BrowserWebSocketProvider';

interface AutomationAction {
  id: string;
  action: string;
  status: 'queued' | 'running' | 'completed' | 'failed' | 'waiting_permission' | 'cancelled';
  workspace: string;
  priority: 'high' | 'normal' | 'low';
}

export const AutomationQueueWidget: React.FC = React.memo(() => {
  const { isConnected, subscribe } = useBrowserWebSocket();
  const [queue, setQueue] = useState<AutomationAction[]>([]);
  const [isQueuePaused, setIsQueuePaused] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulated REST load
    setQueue([]);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (!isConnected) return;
    const unsubscribe = subscribe('browser.automation', (event: BrowserEvent) => {
      const payload = event.payload;

      if (event.event_type === 'AUTOMATION_STARTED') {
        setQueue((prev) => [
          {
            id: payload.id,
            action: payload.action,
            status: 'running',
            workspace: payload.workspace,
            priority: payload.priority || 'normal',
          },
          ...prev,
        ]);
      } else if (event.event_type === 'QUEUE_UPDATED') {
        // Assume payload contains the full array of queued items for simplicity in UI state
        if (payload.queue) setQueue(payload.queue);
        if (payload.isPaused !== undefined) setIsQueuePaused(payload.isPaused);
      } else if (event.event_type === 'PERMISSION_REQUESTED') {
        setQueue((prev) =>
          prev.map((a) => (a.id === payload.action_id ? { ...a, status: 'waiting_permission' } : a))
        );
      } else if (event.event_type === 'AUTOMATION_COMPLETED') {
        setQueue((prev) =>
          prev.map((a) => (a.id === payload.id ? { ...a, status: 'completed' } : a))
        );
      } else if (event.event_type === 'AUTOMATION_FAILED') {
        setQueue((prev) => prev.map((a) => (a.id === payload.id ? { ...a, status: 'failed' } : a)));
      }
    });
    return () => unsubscribe();
  }, [isConnected, subscribe]);

  const toggleQueue = useCallback(() => {
    console.log(`REST Call: ${isQueuePaused ? 'Resume' : 'Pause'} Queue`);
    setIsQueuePaused(!isQueuePaused); // Optimistic UI update
  }, [isQueuePaused]);

  const handlePermission = useCallback((id: string, approve: boolean) => {
    console.log(`REST Call: ${approve ? 'Approve' : 'Reject'} Permission for`, id);
  }, []);

  if (isLoading) {
    return (
      <div className="p-4 bg-gray-900/50 backdrop-blur-md rounded-xl text-gray-400">
        Loading Automation Queue...
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col h-full bg-gray-900/40 backdrop-blur-xl border border-gray-800 rounded-2xl shadow-2xl overflow-hidden"
    >
      <div className="p-4 border-b border-gray-800 flex justify-between items-center bg-black/20">
        <h3 className="text-lg font-semibold text-gray-100 flex items-center gap-2">
          <Bot className="w-5 h-5 text-orange-400" />
          Automation Queue
        </h3>
        <button
          onClick={toggleQueue}
          className="p-1.5 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors text-gray-300"
        >
          {isQueuePaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
        </button>
      </div>

      <div className="p-3 flex-1 overflow-y-auto space-y-2">
        {queue.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-gray-500">
            <p className="text-sm">Queue is empty</p>
          </div>
        ) : (
          <AnimatePresence>
            {queue.map((item) => (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, height: 0 }}
                className={`p-3 rounded-xl border flex flex-col gap-2 ${
                  item.status === 'waiting_permission'
                    ? 'bg-orange-900/20 border-orange-700/50'
                    : 'bg-gray-800/40 border-gray-700/50'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    {item.status === 'waiting_permission' ? (
                      <ShieldAlert className="w-5 h-5 text-orange-400 animate-pulse" />
                    ) : item.status === 'running' ? (
                      <div className="w-5 h-5 border-2 border-t-orange-400 border-gray-600 rounded-full animate-spin" />
                    ) : item.status === 'queued' ? (
                      <Clock className="w-5 h-5 text-gray-500" />
                    ) : (
                      <Check className="w-5 h-5 text-green-400" />
                    )}
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-gray-200">{item.action}</span>
                      <span className="text-xs text-gray-500">
                        {item.workspace} • {item.priority}
                      </span>
                    </div>
                  </div>
                </div>

                {item.status === 'waiting_permission' && (
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={() => handlePermission(item.id, true)}
                      className="flex-1 bg-orange-500/20 hover:bg-orange-500/30 text-orange-400 text-xs font-bold py-1.5 rounded transition-colors flex items-center justify-center gap-1"
                    >
                      <Check className="w-3 h-3" /> Approve
                    </button>
                    <button
                      onClick={() => handlePermission(item.id, false)}
                      className="flex-1 bg-red-500/20 hover:bg-red-500/30 text-red-400 text-xs font-bold py-1.5 rounded transition-colors flex items-center justify-center gap-1"
                    >
                      <X className="w-3 h-3" /> Reject
                    </button>
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>
    </motion.div>
  );
});
