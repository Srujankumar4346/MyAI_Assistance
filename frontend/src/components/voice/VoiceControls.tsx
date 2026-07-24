import React from 'react';
import { motion } from 'framer-motion';
import type { VoiceState } from '../../hooks/useVoice';

interface VoiceControlsProps {
  state: VoiceState;
  isContinuous: boolean;
  isConnected: boolean;
  onPushToTalk: () => void;
  onStop: () => void;
  onToggleContinuous: () => void;
  onStopSpeaking: () => void;
}

export const VoiceControls: React.FC<VoiceControlsProps> = ({
  state,
  isContinuous,
  isConnected,
  onPushToTalk,
  onStop,
  onToggleContinuous,
  onStopSpeaking,
}) => {
  const isListening = state === 'listening';
  const isSpeaking = state === 'speaking';
  const isThinking = state === 'thinking';

  return (
    <div className="flex items-center justify-center gap-4 flex-wrap">
      {/* Push to talk / Stop listening */}
      <motion.button
        id="voice-push-to-talk"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={isListening ? onStop : onPushToTalk}
        disabled={!isConnected || isThinking || isSpeaking}
        className={`px-5 py-2.5 rounded-xl text-sm font-semibold font-mono flex items-center gap-2 transition-all border ${
          isListening
            ? 'bg-red-500/20 border-red-400/40 text-red-300 hover:bg-red-500/30'
            : 'bg-indigo-600/30 border-indigo-400/40 text-indigo-300 hover:bg-indigo-600/40 disabled:opacity-40 disabled:cursor-not-allowed'
        }`}
      >
        <span>{isListening ? '⏹' : '🎙️'}</span>
        {isListening ? 'Stop' : 'Push to Talk'}
      </motion.button>

      {/* Continuous mode toggle */}
      <motion.button
        id="voice-continuous-toggle"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={onToggleContinuous}
        disabled={!isConnected}
        className={`px-5 py-2.5 rounded-xl text-sm font-semibold font-mono flex items-center gap-2 transition-all border ${
          isContinuous
            ? 'bg-emerald-500/20 border-emerald-400/40 text-emerald-300 hover:bg-emerald-500/30'
            : 'bg-slate-700/40 border-white/10 text-slate-400 hover:text-white hover:bg-slate-700/60 disabled:opacity-40'
        }`}
      >
        <span
          className={`w-2 h-2 rounded-full ${isContinuous ? 'bg-emerald-400 animate-ping' : 'bg-slate-500'}`}
        />
        {isContinuous ? 'Continuous ON' : 'Continuous'}
      </motion.button>

      {/* Stop speaking */}
      {isSpeaking && (
        <motion.button
          id="voice-stop-speaking"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onStopSpeaking}
          className="px-5 py-2.5 rounded-xl text-sm font-semibold font-mono flex items-center gap-2 bg-blue-500/20 border border-blue-400/40 text-blue-300 hover:bg-blue-500/30 transition-all"
        >
          <span>🔇</span> Stop Speaking
        </motion.button>
      )}

      {/* Connection indicator */}
      <div className="flex items-center gap-2 text-xs font-mono text-slate-500">
        <span
          className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-400' : 'bg-red-400 animate-pulse'}`}
        />
        {isConnected ? 'Connected' : 'Reconnecting…'}
      </div>
    </div>
  );
};
