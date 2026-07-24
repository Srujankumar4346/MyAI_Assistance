import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Network, Pause, Play, X, FileText, CheckCircle2, RotateCcw } from 'lucide-react';
import { useBrowserWebSocket, BrowserEvent } from '../contexts/BrowserWebSocketProvider';

interface ResearchJob {
  id: string;
  topic: string;
  status: 'running' | 'queued' | 'completed' | 'failed' | 'paused';
  currentWebsite: string;
  currentStep: string;
  pagesCrawled: number;
  sourcesCollected: number;
  progress: number;
  eta: string;
}

export const ResearchMonitorWidget: React.FC = React.memo(() => {
  const { isConnected, subscribe } = useBrowserWebSocket();
  const [jobs, setJobs] = useState<ResearchJob[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulated REST initialization
    setJobs([]);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (!isConnected) return;
    const unsubscribe = subscribe('browser.research', (event: BrowserEvent) => {
      const payload = event.payload;
      if (event.event_type === 'RESEARCH_STARTED') {
        setJobs(prev => [{
          id: payload.id,
          topic: payload.topic,
          status: 'running',
          currentWebsite: payload.currentWebsite || 'Initializing...',
          currentStep: payload.currentStep || 'Starting',
          pagesCrawled: 0,
          sourcesCollected: 0,
          progress: 0,
          eta: 'Calculating...'
        }, ...prev]);
      } else if (event.event_type === 'RESEARCH_PROGRESS') {
        setJobs(prev => prev.map(j => j.id === payload.id ? { ...j, ...payload } : j));
      } else if (event.event_type === 'RESEARCH_COMPLETED') {
        setJobs(prev => prev.map(j => j.id === payload.id ? { ...j, status: 'completed', progress: 100 } : j));
      } else if (event.event_type === 'RESEARCH_FAILED') {
        setJobs(prev => prev.map(j => j.id === payload.id ? { ...j, status: 'failed' } : j));
      }
    });
    return () => unsubscribe();
  }, [isConnected, subscribe]);

  const handlePauseResume = useCallback((id: string, currentStatus: string) => {
    console.log(`REST Call: ${currentStatus === 'paused' ? 'Resume' : 'Pause'} research`, id);
  }, []);

  const handleCancel = useCallback((id: string) => {
    console.log('REST Call: Cancel research', id);
  }, []);

  const handleRetry = useCallback((id: string) => {
    console.log('REST Call: Retry research', id);
  }, []);

  if (isLoading) {
    return <div className="p-4 bg-gray-900/50 backdrop-blur-md rounded-xl text-gray-400">Loading Research Monitor...</div>;
  }

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col h-full bg-gray-900/40 backdrop-blur-xl border border-gray-800 rounded-2xl shadow-2xl overflow-hidden"
    >
      <div className="p-4 border-b border-gray-800 flex justify-between items-center bg-black/20">
        <h3 className="text-lg font-semibold text-gray-100 flex items-center gap-2">
          <Network className="w-5 h-5 text-indigo-400" />
          Research Monitor
        </h3>
        <span className="text-xs text-gray-400 bg-gray-800 px-2 py-1 rounded-full">
          {jobs.filter(j => j.status === 'running').length} Active
        </span>
      </div>

      <div className="p-3 flex-1 overflow-y-auto space-y-3">
        {jobs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-gray-500">
            <p className="text-sm">No Active Research Tasks</p>
          </div>
        ) : (
          <AnimatePresence>
            {jobs.map(job => (
              <motion.div 
                key={job.id}
                layout
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="p-3 bg-gray-800/40 rounded-xl border border-gray-700/50 flex flex-col gap-3"
              >
                <div className="flex justify-between items-start">
                  <div className="flex flex-col overflow-hidden">
                    <span className="text-sm font-medium text-gray-200 truncate" title={job.topic}>{job.topic}</span>
                    <span className="text-xs text-indigo-400 truncate">
                      {job.status === 'running' ? job.currentStep : job.status.toUpperCase()}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    {job.status === 'completed' ? (
                      <button className="p-1.5 text-gray-400 hover:text-white rounded bg-gray-700/30 hover:bg-gray-700" title="View Report"><FileText className="w-3.5 h-3.5" /></button>
                    ) : job.status === 'failed' ? (
                      <button onClick={() => handleRetry(job.id)} className="p-1.5 text-gray-400 hover:text-white rounded bg-gray-700/30 hover:bg-gray-700"><RotateCcw className="w-3.5 h-3.5" /></button>
                    ) : (
                      <>
                        <button onClick={() => handlePauseResume(job.id, job.status)} className="p-1.5 text-gray-400 hover:text-white rounded bg-gray-700/30 hover:bg-gray-700">
                          {job.status === 'paused' ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
                        </button>
                        <button onClick={() => handleCancel(job.id)} className="p-1.5 text-red-400 hover:text-red-300 rounded bg-red-900/20 hover:bg-red-900/40"><X className="w-3.5 h-3.5" /></button>
                      </>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[10px] text-gray-400 uppercase tracking-wider font-semibold">
                  <div className="flex flex-col">
                    <span>Sources</span>
                    <span className="text-gray-200 font-mono text-sm">{job.sourcesCollected}</span>
                  </div>
                  <div className="flex flex-col">
                    <span>Pages Crawled</span>
                    <span className="text-gray-200 font-mono text-sm">{job.pagesCrawled}</span>
                  </div>
                </div>

                {job.status === 'running' && (
                  <div className="flex flex-col gap-1">
                    <div className="w-full bg-gray-900 rounded-full h-1.5 overflow-hidden">
                      <motion.div 
                        className="bg-indigo-400 h-1.5 rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${job.progress}%` }}
                        transition={{ duration: 0.5 }}
                      />
                    </div>
                    <div className="flex justify-between text-[10px] text-gray-500 font-mono">
                      <span className="truncate max-w-[70%]">{job.currentWebsite}</span>
                      <span>{job.eta}</span>
                    </div>
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
