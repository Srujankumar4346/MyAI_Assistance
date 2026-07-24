import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BrainCircuit, BookOpen, Share2, Zap, ArrowRight } from 'lucide-react';
import { useBrowserWebSocket, BrowserEvent } from '../contexts/BrowserWebSocketProvider';

interface MemoryItem {
  id: string;
  type: 'memory' | 'knowledge' | 'learning' | 'document';
  content: string;
  timestamp: number;
  source: string;
}

export const MemoryKnowledgeWidget: React.FC = React.memo(() => {
  const { isConnected, subscribe } = useBrowserWebSocket();
  const [items, setItems] = useState<MemoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'memory' | 'knowledge'>('all');

  useEffect(() => {
    // Simulated REST load
    setItems([]);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (!isConnected) return;
    const unsubscribe = subscribe('browser.memory', (event: BrowserEvent) => {
      const payload = event.payload;

      let type: MemoryItem['type'] = 'memory';
      if (event.event_type.includes('KNOWLEDGE')) type = 'knowledge';
      else if (event.event_type.includes('LEARNING')) type = 'learning';
      else if (event.event_type.includes('DOCUMENT')) type = 'document';

      setItems((prev) =>
        [
          {
            id: event.event_id,
            type,
            content: payload.content || payload.summary || `New ${type.toUpperCase()} recorded`,
            timestamp: event.timestamp,
            source: payload.source || event.source,
          },
          ...prev,
        ].slice(0, 30)
      );
    });
    return () => unsubscribe();
  }, [isConnected, subscribe]);

  const filteredItems = activeTab === 'all' ? items : items.filter((i) => i.type === activeTab);

  const getIcon = (type: string) => {
    switch (type) {
      case 'memory':
        return <BrainCircuit className="w-4 h-4 text-pink-400" />;
      case 'knowledge':
        return <Share2 className="w-4 h-4 text-blue-400" />;
      case 'learning':
        return <Zap className="w-4 h-4 text-yellow-400" />;
      case 'document':
        return <BookOpen className="w-4 h-4 text-green-400" />;
      default:
        return <BrainCircuit className="w-4 h-4 text-gray-400" />;
    }
  };

  const formatTime = (ts: number) => {
    return new Date(ts * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (isLoading) {
    return (
      <div className="p-4 bg-gray-900/50 backdrop-blur-md rounded-xl text-gray-400">
        Loading Memory Center...
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
          <BrainCircuit className="w-5 h-5 text-pink-400" />
          Memory & Knowledge
        </h3>

        {/* Simple Tabs */}
        <div className="flex bg-gray-800 rounded-lg p-0.5 border border-gray-700">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-3 py-1 text-xs rounded-md transition-colors ${activeTab === 'all' ? 'bg-gray-700 text-white shadow' : 'text-gray-400 hover:text-gray-200'}`}
          >
            All
          </button>
          <button
            onClick={() => setActiveTab('memory')}
            className={`px-3 py-1 text-xs rounded-md transition-colors ${activeTab === 'memory' ? 'bg-gray-700 text-pink-400 shadow' : 'text-gray-400 hover:text-pink-300'}`}
          >
            Memories
          </button>
          <button
            onClick={() => setActiveTab('knowledge')}
            className={`px-3 py-1 text-xs rounded-md transition-colors ${activeTab === 'knowledge' ? 'bg-gray-700 text-blue-400 shadow' : 'text-gray-400 hover:text-blue-300'}`}
          >
            Graph
          </button>
        </div>
      </div>

      <div className="p-3 flex-1 overflow-y-auto space-y-2">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-gray-500">
            <p className="text-sm">No Recent Memories</p>
          </div>
        ) : (
          <AnimatePresence>
            {filteredItems.map((item) => (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, height: 0 }}
                className="p-3 bg-gray-800/40 rounded-xl border border-gray-700/50 flex gap-3 group hover:border-gray-600 transition-colors cursor-pointer"
              >
                <div className="mt-0.5 bg-gray-900 p-1.5 rounded-lg border border-gray-700 self-start shadow-inner">
                  {getIcon(item.type)}
                </div>

                <div className="flex flex-col flex-1 gap-1 overflow-hidden">
                  <div className="flex justify-between items-center text-xs text-gray-500">
                    <span className="uppercase font-bold tracking-wider">{item.type}</span>
                    <span className="font-mono">{formatTime(item.timestamp)}</span>
                  </div>
                  <p className="text-sm text-gray-300 leading-snug line-clamp-2">{item.content}</p>
                  <div className="flex items-center gap-1 text-[10px] text-gray-500 mt-1 uppercase font-semibold">
                    <ArrowRight className="w-3 h-3" /> Source: {item.source}
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>
    </motion.div>
  );
});
