import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Plus, X, RotateCcw, Pin, ExternalLink, Loader2 } from 'lucide-react';
import { useBrowserWebSocket, BrowserEvent } from '../contexts/BrowserWebSocketProvider';

interface TabState {
  id: string;
  url: string;
  title: string;
  isPinned: boolean;
  status: 'loading' | 'complete' | 'error';
  lastActivity: string;
}

export const TabManagerWidget: React.FC = React.memo(() => {
  const { isConnected, subscribe } = useBrowserWebSocket();
  const [tabs, setTabs] = useState<TabState[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulated REST load
    setTabs([]);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (!isConnected) return;
    const unsubscribe = subscribe('browser.tabs', (event: BrowserEvent) => {
      const payload = event.payload;
      
      if (event.event_type === 'TAB_OPENED') {
        setTabs(prev => [...prev, {
          id: payload.tab_id,
          url: payload.url,
          title: payload.title || 'New Tab',
          isPinned: false,
          status: 'loading',
          lastActivity: new Date().toISOString()
        }]);
      } else if (event.event_type === 'TAB_CLOSED') {
        setTabs(prev => prev.filter(t => t.id !== payload.tab_id));
      } else if (event.event_type === 'TAB_UPDATED') {
        setTabs(prev => prev.map(t => t.id === payload.tab_id ? { ...t, ...payload } : t));
      }
    });
    return () => unsubscribe();
  }, [isConnected, subscribe]);

  const filteredTabs = useMemo(() => {
    if (!searchQuery) return tabs;
    const q = searchQuery.toLowerCase();
    return tabs.filter(t => t.url.toLowerCase().includes(q) || t.title.toLowerCase().includes(q));
  }, [tabs, searchQuery]);

  // Actions (would call REST APIs)
  const handleClose = useCallback((id: string) => {
    console.log('REST Call: Close tab', id);
  }, []);

  const handleOpen = useCallback(() => {
    console.log('REST Call: Open new tab');
  }, []);

  if (isLoading) {
    return <div className="p-4 bg-gray-900/50 backdrop-blur-md rounded-xl text-gray-400">Loading Tab Manager...</div>;
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col h-full bg-gray-900/40 backdrop-blur-xl border border-gray-800 rounded-2xl shadow-2xl overflow-hidden"
    >
      <div className="p-4 border-b border-gray-800 flex justify-between items-center bg-black/20">
        <h3 className="text-lg font-semibold text-gray-100 flex items-center gap-2">
          <ExternalLink className="w-5 h-5 text-purple-400" />
          Tab Manager
        </h3>
        <div className="flex gap-2">
          <div className="relative">
            <Search className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 transform -translate-y-1/2" />
            <input 
              type="text" 
              placeholder="Search tabs..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-gray-800/50 text-sm text-gray-200 rounded-full pl-9 pr-4 py-1.5 focus:outline-none focus:ring-1 focus:ring-purple-500 border border-gray-700"
            />
          </div>
          <button onClick={handleOpen} className="p-1.5 bg-purple-500/20 text-purple-400 hover:bg-purple-500/40 rounded-lg transition-colors">
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="p-2 flex-1 overflow-y-auto space-y-1">
        {tabs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-gray-500">
            <p className="text-sm">No Active Tabs</p>
          </div>
        ) : (
          <AnimatePresence>
            {filteredTabs.map(tab => (
              <motion.div 
                key={tab.id}
                layout
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="group flex items-center justify-between p-2 hover:bg-gray-800/50 rounded-lg border border-transparent hover:border-gray-700 transition-all cursor-pointer"
              >
                <div className="flex items-center gap-3 overflow-hidden">
                  {tab.status === 'loading' ? (
                    <Loader2 className="w-4 h-4 text-blue-400 animate-spin flex-shrink-0" />
                  ) : (
                    <Globe className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  )}
                  <div className="flex flex-col truncate">
                    <span className="text-sm font-medium text-gray-200 truncate">{tab.title}</span>
                    <span className="text-xs text-gray-500 truncate">{tab.url}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button className="p-1 text-gray-500 hover:text-white rounded"><Pin className="w-3.5 h-3.5" /></button>
                  <button className="p-1 text-gray-500 hover:text-white rounded"><RotateCcw className="w-3.5 h-3.5" /></button>
                  <button onClick={(e) => { e.stopPropagation(); handleClose(tab.id); }} className="p-1 text-red-400 hover:bg-red-900/30 rounded"><X className="w-3.5 h-3.5" /></button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>
    </motion.div>
  );
});

// Polyfill missing import from lucide-react above
import { Globe } from 'lucide-react';
