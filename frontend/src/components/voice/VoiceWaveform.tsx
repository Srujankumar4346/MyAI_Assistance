import React from 'react';
import { motion } from 'framer-motion';
import type { VoiceState } from '../../hooks/useVoice';

interface VoiceWaveformProps {
  state: VoiceState;
}

const BAR_COUNT = 28;

const stateColors: Record<VoiceState, string> = {
  idle: '#6366f1',
  listening: '#10b981',
  thinking: '#f59e0b',
  speaking: '#3b82f6',
  error: '#ef4444',
};

export const VoiceWaveform: React.FC<VoiceWaveformProps> = ({ state }) => {
  const color = stateColors[state];
  const isActive = state === 'listening' || state === 'speaking';
  const isThinking = state === 'thinking';

  return (
    <div className="flex items-center justify-center gap-[3px] h-16 w-full px-4">
      {Array.from({ length: BAR_COUNT }).map((_, i) => {
        const centerDist = Math.abs(i - BAR_COUNT / 2) / (BAR_COUNT / 2);
        const baseHeight = isActive ? 8 + (1 - centerDist) * 40 : isThinking ? 8 : 4;
        const delay = isActive ? (i / BAR_COUNT) * 0.5 : isThinking ? (i / BAR_COUNT) * 0.8 : 0;

        return (
          <motion.div
            key={i}
            className="rounded-full"
            style={{ width: 3, backgroundColor: color, opacity: isActive ? 0.9 : 0.35 }}
            animate={
              isActive
                ? {
                    height: [
                      baseHeight * 0.4,
                      baseHeight,
                      baseHeight * 0.6,
                      baseHeight * 1.1,
                      baseHeight * 0.5,
                    ],
                  }
                : isThinking
                  ? { height: [4, 12, 4], opacity: [0.3, 0.7, 0.3] }
                  : { height: 4 }
            }
            transition={
              isActive || isThinking
                ? {
                    duration: 0.9 + Math.random() * 0.6,
                    repeat: Infinity,
                    delay,
                    ease: 'easeInOut',
                  }
                : { duration: 0.3 }
            }
          />
        );
      })}
    </div>
  );
};
