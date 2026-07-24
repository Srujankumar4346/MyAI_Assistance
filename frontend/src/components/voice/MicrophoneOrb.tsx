import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { VoiceState } from '../../hooks/useVoice';

interface MicrophoneOrbProps {
  state: VoiceState;
  onClick: () => void;
  disabled?: boolean;
}

const stateConfig: Record<
  VoiceState,
  { label: string; color: string; glow: string; ringColor: string }
> = {
  idle: {
    label: 'Tap to Speak',
    color: '#6366f1',
    glow: '#4f46e5',
    ringColor: 'rgba(99,102,241,0.3)',
  },
  listening: {
    label: 'Listening…',
    color: '#10b981',
    glow: '#059669',
    ringColor: 'rgba(16,185,129,0.4)',
  },
  thinking: {
    label: 'Thinking…',
    color: '#f59e0b',
    glow: '#d97706',
    ringColor: 'rgba(245,158,11,0.4)',
  },
  speaking: {
    label: 'Speaking…',
    color: '#3b82f6',
    glow: '#2563eb',
    ringColor: 'rgba(59,130,246,0.4)',
  },
  error: { label: 'Error', color: '#ef4444', glow: '#dc2626', ringColor: 'rgba(239,68,68,0.4)' },
};

export const MicrophoneOrb: React.FC<MicrophoneOrbProps> = ({ state, onClick, disabled }) => {
  const cfg = stateConfig[state];

  return (
    <div className="relative flex items-center justify-center w-52 h-52">
      {/* Outer pulsing rings */}
      <AnimatePresence>
        {(state === 'listening' || state === 'speaking') && (
          <>
            {[1, 2, 3].map((i) => (
              <motion.div
                key={i}
                className="absolute rounded-full border"
                style={{ borderColor: cfg.ringColor }}
                initial={{ width: 80, height: 80, opacity: 0.8 }}
                animate={{ width: 80 + i * 48, height: 80 + i * 48, opacity: 0 }}
                transition={{ duration: 1.8, repeat: Infinity, delay: i * 0.3, ease: 'easeOut' }}
              />
            ))}
          </>
        )}
      </AnimatePresence>

      {/* Thinking rotating ring */}
      {state === 'thinking' && (
        <motion.div
          className="absolute rounded-full border-2 border-transparent"
          style={{
            width: 160,
            height: 160,
            borderTopColor: cfg.color,
            borderRightColor: cfg.color,
          }}
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        />
      )}

      {/* Main orb button */}
      <motion.button
        id="voice-mic-button"
        onClick={onClick}
        disabled={disabled}
        className="relative z-10 w-28 h-28 rounded-full flex items-center justify-center cursor-pointer select-none outline-none"
        style={{
          background: `radial-gradient(circle at 35% 35%, ${cfg.color}cc, ${cfg.glow}ee)`,
          boxShadow: `0 0 40px ${cfg.glow}88, 0 0 80px ${cfg.glow}44, inset 0 2px 8px rgba(255,255,255,0.2)`,
        }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.93 }}
        animate={state === 'listening' ? { scale: [1, 1.06, 1] } : { scale: 1 }}
        transition={state === 'listening' ? { duration: 1, repeat: Infinity } : {}}
      >
        {/* Microphone icon */}
        <svg viewBox="0 0 24 24" fill="white" className="w-12 h-12 drop-shadow-lg">
          <path d="M12 15c1.66 0 3-1.34 3-3V6c0-1.66-1.34-3-3-3S9 4.34 9 6v6c0 1.66 1.34 3 3 3z" />
          <path d="M17 12c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-2.08c3.39-.49 6-3.39 6-6.92h-2z" />
        </svg>

        {/* Shimmer overlay */}
        <div className="absolute inset-0 rounded-full overflow-hidden">
          <div className="absolute -top-8 -left-8 w-24 h-24 bg-white/10 rounded-full blur-xl" />
        </div>
      </motion.button>

      {/* State label */}
      <motion.p
        key={state}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="absolute -bottom-10 text-sm font-mono tracking-wider"
        style={{ color: cfg.color }}
      >
        {cfg.label}
      </motion.p>
    </div>
  );
};
