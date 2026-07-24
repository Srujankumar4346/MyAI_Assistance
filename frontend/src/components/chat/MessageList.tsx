import React from 'react';
import { Sparkles } from 'lucide-react';
import { MessageBubble } from './MessageBubble';
import type { Message } from '../../types';

interface MessageListProps {
  messages: Message[];
  copiedIndex: number | null;
  isGenerating: boolean;
  onCopy: (content: string, index: number) => void;
  onSendPrompt: (prompt: string) => void;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
}

const PRESET_PROMPTS = [
  'Write a Python FastAPI async endpoint',
  'Explain how ChromaDB vector search works',
  'Draft a project structure for NOVA_X Phase 2',
  'What technologies power this AI OS?',
];

export const MessageList: React.FC<MessageListProps> = ({
  messages,
  copiedIndex,
  isGenerating,
  onCopy,
  onSendPrompt,
  messagesEndRef,
}) => {
  if (messages.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center p-8">
        <div className="p-4 bg-indigo-600/20 rounded-3xl border border-indigo-500/30 text-cyan-300 mb-4 animate-pulse-glow">
          <Sparkles className="w-10 h-10" />
        </div>
        <h3 className="text-xl font-bold text-white mb-2">How can NOVA_X assist you today?</h3>
        <p className="text-slate-400 text-xs max-w-md">
          Select an Ollama model, ask coding or general intelligence questions, or leverage
          long-term vector memory context.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-6 max-w-lg w-full">
          {PRESET_PROMPTS.map((prompt, i) => (
            <button
              key={i}
              onClick={() => onSendPrompt(prompt)}
              className="p-3 text-left glass-panel glass-panel-hover rounded-xl text-xs text-slate-300 border border-white/5 hover:border-indigo-400/30 cursor-pointer"
            >
              "{prompt}"
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
      {messages.map((msg, idx) => (
        <MessageBubble
          key={idx}
          msg={msg}
          idx={idx}
          copiedIndex={copiedIndex}
          isGenerating={isGenerating}
          isLast={idx === messages.length - 1}
          onCopy={onCopy}
          onRegenerate={() => onSendPrompt(messages[idx - 1]?.content || '')}
        />
      ))}
      <div ref={messagesEndRef} />
    </div>
  );
};
