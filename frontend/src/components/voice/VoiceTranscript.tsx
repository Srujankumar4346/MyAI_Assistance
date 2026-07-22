import React, { useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { VoiceTranscriptEntry } from '../../hooks/useVoice';

interface VoiceTranscriptProps {
  entries: VoiceTranscriptEntry[];
  liveText?: string;
  aiText?: string;
  onClear?: () => void;
}

export const VoiceTranscript: React.FC<VoiceTranscriptProps> = ({
  entries, liveText, aiText, onClear,
}) => {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [entries, liveText, aiText]);

  const isEmpty = entries.length === 0 && !liveText && !aiText;

  return (
    <div className="relative flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-white/5">
        <span className="text-xs font-mono text-indigo-300/70 tracking-widest uppercase">
          Conversation Log
        </span>
        {entries.length > 0 && (
          <button
            id="voice-clear-transcript"
            onClick={onClear}
            className="text-xs text-slate-500 hover:text-red-400 transition-colors font-mono"
          >
            Clear
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin scrollbar-thumb-indigo-600/30">
        {isEmpty && (
          <div className="flex flex-col items-center justify-center h-full text-slate-600 text-sm font-mono gap-2 pt-12">
            <span className="text-3xl">🎙️</span>
            <p>Speak to start a conversation…</p>
          </div>
        )}

        <AnimatePresence initial={false}>
          {entries.map((entry) => (
            <motion.div
              key={entry.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex ${entry.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                  entry.role === 'user'
                    ? 'bg-indigo-600/40 border border-indigo-400/30 text-indigo-100 rounded-tr-sm'
                    : 'bg-slate-800/60 border border-white/10 text-slate-200 rounded-tl-sm'
                }`}
              >
                <p>{entry.text}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[10px] font-mono opacity-40">
                    {entry.timestamp.toLocaleTimeString()}
                  </span>
                  {entry.role === 'user' && entry.confidence !== undefined && (
                    <span className="text-[10px] font-mono opacity-50 text-emerald-400">
                      {entry.confidence}% conf
                    </span>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Live user text (interim) */}
        {liveText && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex justify-end"
          >
            <div className="max-w-[85%] rounded-2xl rounded-tr-sm px-4 py-2.5 text-sm bg-indigo-600/20 border border-indigo-400/20 text-indigo-200/70 italic">
              {liveText}
              <span className="inline-block w-1.5 h-3.5 ml-1 bg-indigo-400 animate-pulse rounded-sm" />
            </div>
          </motion.div>
        )}

        {/* Streaming AI text */}
        {aiText && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex justify-start"
          >
            <div className="max-w-[85%] rounded-2xl rounded-tl-sm px-4 py-2.5 text-sm bg-slate-800/60 border border-white/10 text-slate-200">
              {aiText}
              <span className="inline-block w-1.5 h-3.5 ml-1 bg-cyan-400 animate-pulse rounded-sm" />
            </div>
          </motion.div>
        )}

        <div ref={bottomRef} />
      </div>
    </div>
  );
};
