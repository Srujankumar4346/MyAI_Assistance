/**
 * ChatInput — Message input bar with send / stop controls.
 */
import React from 'react';
import { Send, Square } from 'lucide-react';

interface ChatInputProps {
  value: string;
  onChange: (v: string) => void;
  onSend: () => void;
  onStop: () => void;
  isGenerating: boolean;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  value,
  onChange,
  onSend,
  onStop,
  isGenerating,
}) => {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  return (
    <div className="p-4 border-t border-white/10 bg-slate-900/60">
      <div className="relative flex items-center">
        <textarea
          id="chat-input"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={2}
          placeholder="Ask NOVA_X anything… (Shift + Enter for new line)"
          className="w-full pl-4 pr-24 py-3 glass-input rounded-xl text-sm resize-none"
        />
        <div className="absolute right-3 flex items-center gap-2">
          {isGenerating ? (
            <button
              id="chat-stop-btn"
              onClick={onStop}
              className="px-3 py-2 bg-red-600/80 hover:bg-red-600 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5"
            >
              <Square className="w-3.5 h-3.5" /> Stop
            </button>
          ) : (
            <button
              id="chat-send-btn"
              onClick={onSend}
              disabled={!value.trim()}
              className="p-2.5 glow-button text-white rounded-xl disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Send className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
