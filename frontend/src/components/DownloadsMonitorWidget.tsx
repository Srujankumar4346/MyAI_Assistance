import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  DownloadCloud,
  Pause,
  Play,
  X,
  Folder,
  FileIcon,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { useBrowserWebSocket, BrowserEvent } from '../contexts/BrowserWebSocketProvider';

interface DownloadState {
  id: string;
  filename: string;
  status: 'downloading' | 'completed' | 'paused' | 'failed' | 'cancelled';
  progress: number;
  totalSize: string;
  downloadedSize: string;
  transferSpeed: string;
  eta: string;
  fileType: string;
}

export const DownloadsMonitorWidget: React.FC = React.memo(() => {
  const { isConnected, subscribe } = useBrowserWebSocket();
  const [downloads, setDownloads] = useState<DownloadState[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulated REST initialization
    setDownloads([]);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (!isConnected) return;
    const unsubscribe = subscribe('browser.downloads', (event: BrowserEvent) => {
      const payload = event.payload;

      if (event.event_type === 'DOWNLOAD_STARTED') {
        setDownloads((prev) => [
          {
            id: payload.id,
            filename: payload.filename,
            status: 'downloading',
            progress: 0,
            totalSize: payload.totalSize || 'Unknown',
            downloadedSize: '0 B',
            transferSpeed: '0 B/s',
            eta: 'Unknown',
            fileType: payload.fileType || 'file',
          },
          ...prev,
        ]);
      } else if (event.event_type === 'DOWNLOAD_PROGRESS') {
        setDownloads((prev) => prev.map((d) => (d.id === payload.id ? { ...d, ...payload } : d)));
      } else if (event.event_type === 'DOWNLOAD_COMPLETED') {
        setDownloads((prev) =>
          prev.map((d) => (d.id === payload.id ? { ...d, status: 'completed', progress: 100 } : d))
        );
      } else if (event.event_type === 'DOWNLOAD_FAILED') {
        setDownloads((prev) =>
          prev.map((d) => (d.id === payload.id ? { ...d, status: 'failed' } : d))
        );
      }
    });
    return () => unsubscribe();
  }, [isConnected, subscribe]);

  // Actions (would call REST APIs)
  const handlePauseResume = useCallback((id: string, currentStatus: string) => {
    console.log(`REST Call: ${currentStatus === 'paused' ? 'Resume' : 'Pause'} download`, id);
  }, []);

  const handleCancel = useCallback((id: string) => {
    console.log('REST Call: Cancel download', id);
  }, []);

  if (isLoading) {
    return (
      <div className="p-4 bg-gray-900/50 backdrop-blur-md rounded-xl text-gray-400">
        Loading Downloads...
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
          <DownloadCloud className="w-5 h-5 text-emerald-400" />
          Downloads Monitor
        </h3>
        <span className="text-xs text-gray-400 bg-gray-800 px-2 py-1 rounded-full">
          {downloads.filter((d) => d.status === 'downloading').length} Active
        </span>
      </div>

      <div className="p-2 flex-1 overflow-y-auto space-y-2">
        {downloads.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-gray-500">
            <p className="text-sm">No Recent Downloads</p>
          </div>
        ) : (
          <AnimatePresence>
            {downloads.map((dl) => (
              <motion.div
                key={dl.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, height: 0 }}
                className="p-3 bg-gray-800/40 rounded-xl border border-gray-700/50 flex flex-col gap-2"
              >
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3 overflow-hidden">
                    {dl.status === 'completed' ? (
                      <CheckCircle2 className="w-5 h-5 text-green-400 flex-shrink-0" />
                    ) : dl.status === 'failed' ? (
                      <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                    ) : (
                      <FileIcon className="w-5 h-5 text-blue-400 flex-shrink-0" />
                    )}
                    <div className="flex flex-col truncate">
                      <span
                        className="text-sm font-medium text-gray-200 truncate"
                        title={dl.filename}
                      >
                        {dl.filename}
                      </span>
                      <span className="text-xs text-gray-500">
                        {dl.status === 'downloading'
                          ? `${dl.transferSpeed} • ${dl.eta}`
                          : dl.status}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {dl.status === 'completed' ? (
                      <button className="p-1.5 text-gray-400 hover:text-white rounded bg-gray-700/30 hover:bg-gray-700">
                        <Folder className="w-3.5 h-3.5" />
                      </button>
                    ) : dl.status === 'downloading' || dl.status === 'paused' ? (
                      <>
                        <button
                          onClick={() => handlePauseResume(dl.id, dl.status)}
                          className="p-1.5 text-gray-400 hover:text-white rounded bg-gray-700/30 hover:bg-gray-700"
                        >
                          {dl.status === 'paused' ? (
                            <Play className="w-3.5 h-3.5" />
                          ) : (
                            <Pause className="w-3.5 h-3.5" />
                          )}
                        </button>
                        <button
                          onClick={() => handleCancel(dl.id)}
                          className="p-1.5 text-red-400 hover:text-red-300 rounded bg-red-900/20 hover:bg-red-900/40"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </>
                    ) : null}
                  </div>
                </div>

                {dl.status === 'downloading' && (
                  <div className="flex flex-col gap-1">
                    <div className="w-full bg-gray-900 rounded-full h-1.5 overflow-hidden">
                      <motion.div
                        className="bg-emerald-400 h-1.5 rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${dl.progress}%` }}
                        transition={{ duration: 0.3 }}
                      />
                    </div>
                    <div className="flex justify-between text-[10px] text-gray-500 font-mono">
                      <span>
                        {dl.downloadedSize} / {dl.totalSize}
                      </span>
                      <span>{dl.progress.toFixed(1)}%</span>
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
