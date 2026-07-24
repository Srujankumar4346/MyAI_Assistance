import React, { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, Filter, AlertTriangle, Info, CheckCircle } from 'lucide-react';
import { useBrowserWebSocket, BrowserEvent } from '../contexts/BrowserWebSocketProvider';

interface TimelineEvent {
  id: string;
  timestamp: number;
  workspace: string;
  sourceModule: string;
  action: string;
  status: 'success' | 'warning' | 'error' | 'info';
  duration?: string;
}

export const ActivityTimelineWidget: React.FC = React.memo(() => {
  const { isConnected, subscribe } = useBrowserWebSocket();
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [filter, setFilter] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulated REST initialization
    setEvents([]);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (!isConnected) return;
    // The timeline subscribes to all relevant channels to create an aggregate view
    // or subscribes to a specific `browser.events` firehose channel. 
    // Assuming the backend sends timeline events to a generic channel:
    const unsubscribe = subscribe('browser.events', (event: BrowserEvent) => {
      const payload = event.payload;
      
      setEvents(prev => [{
        id: event.event_id,
        timestamp: event.timestamp,
        workspace: payload.workspace || 'System',
        sourceModule: event.source,
        action: payload.action || event.event_type,
        status: payload.status || 'info',
        duration: payload.duration
      }, ...prev].slice(0, 50)); // Keep last 50 events
    });
    
    return () => unsubscribe();
  }, [isConnected, subscribe]);

  const filteredEvents = useMemo(() => {
    if (filter === 'all') return events;
    return events.filter(e => e.status === filter);
  }, [events, filter]);

  const getStatusIcon = (status: string) => {
    switch(status) {
      case 'error': return <AlertTriangle className="w-4 h-4 text-red-400" />;
      case 'warning': return <AlertTriangle className="w-4 h-4 text-orange-400" />;
      case 'success': return <CheckCircle className="w-4 h-4 text-green-400" />;
      default: return <Info className="w-4 h-4 text-blue-400" />;
    }
  };

  const formatTime = (ts: number) => {
    return new Date(ts * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  if (isLoading) {
    return <div className="p-4 bg-gray-900/50 backdrop-blur-md rounded-xl text-gray-400">Loading Timeline...</div>;
  }

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col h-full bg-gray-900/40 backdrop-blur-xl border border-gray-800 rounded-2xl shadow-2xl overflow-hidden"
    >
      <div className="p-4 border-b border-gray-800 flex justify-between items-center bg-black/20">
        <h3 className="text-lg font-semibold text-gray-100 flex items-center gap-2">
          <Clock className="w-5 h-5 text-teal-400" />
          Activity Timeline
        </h3>
        <div className="flex items-center gap-2 text-xs">
          <Filter className="w-4 h-4 text-gray-500" />
          <select 
            value={filter} 
            onChange={e => setFilter(e.target.value)}
            className="bg-gray-800 text-gray-300 rounded border border-gray-700 py-1 px-2 outline-none"
          >
            <option value="all">All Events</option>
            <option value="error">Errors</option>
            <option value="warning">Warnings</option>
            <option value="success">Success</option>
          </select>
        </div>
      </div>

      <div className="p-4 flex-1 overflow-y-auto space-y-4">
        {events.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-gray-500">
            <p className="text-sm">No Recent Activity</p>
          </div>
        ) : (
          <div className="relative border-l border-gray-700 ml-3 space-y-6">
            <AnimatePresence>
              {filteredEvents.map(event => (
                <motion.div 
                  key={event.id}
                  layout
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="relative pl-6"
                >
                  <div className="absolute -left-2.5 top-0.5 bg-gray-900 rounded-full p-0.5 border border-gray-700">
                    {getStatusIcon(event.status)}
                  </div>
                  <div className="flex flex-col gap-1">
                    <div className="flex justify-between items-start text-xs">
                      <span className="font-mono text-gray-500">{formatTime(event.timestamp)}</span>
                      <span className="text-gray-500 bg-gray-800 px-1.5 py-0.5 rounded">{event.sourceModule}</span>
                    </div>
                    <span className="text-sm text-gray-200">{event.action}</span>
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>{event.workspace}</span>
                      {event.duration && <span>{event.duration}</span>}
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </motion.div>
  );
});
