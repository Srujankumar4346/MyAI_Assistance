import React from 'react';
import { Cpu, Trash2 } from 'lucide-react';
import { MessageList } from './MessageList';
import { ChatInput } from './ChatInput';
import type { Message } from '../../types';

interface ChatWindowProps {
  messages: Message[];
  selectedModel: string;
  onModelChange: (model: string) => void;
  availableModels: string[];
  isGenerating: boolean;
  copiedIndex: number | null;
  inputValue: string;
  onInputChange: (v: string) => void;
  onSend: (overrideContent?: string) => void;
  onStop: () => void;
  onClear: () => void;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
}

export const ChatWindow: React.FC<ChatWindowProps> = ({
  messages,
  selectedModel,
  onModelChange,
  availableModels,
  isGenerating,
  copiedIndex,
  inputValue,
  onInputChange,
  onSend,
  onStop,
  onClear,
  messagesEndRef,
}) => {
  const handleCopy = (content: string, index: number) => {
    navigator.clipboard.writeText(content);
    // Callback is managed upstream or handled via temporary state:
    // Here we let the parent manage copied index
  };

  return (
    <div className="flex-1 glass-panel rounded-2xl border border-white/10 flex flex-col overflow-hidden relative bg-slate-950/20">
      {/* Header Controls */}
      <div className="px-6 py-3 border-b border-white/10 flex items-center justify-between bg-slate-900/40">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-indigo-950/60 px-3 py-1.5 rounded-xl border border-indigo-500/30 text-xs">
            <Cpu className="w-4 h-4 text-cyan-400" />
            <span className="text-slate-300 font-medium">Model:</span>
            <select
              value={selectedModel}
              onChange={(e) => onModelChange(e.target.value)}
              className="bg-transparent text-cyan-300 font-bold focus:outline-none capitalize cursor-pointer"
            >
              {availableModels.map((m) => (
                <option key={m} value={m} className="bg-slate-900 text-slate-200 capitalize">
                  {m}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {messages.length > 0 && (
            <button
              onClick={onClear}
              className="px-3 py-1.5 text-xs glass-panel hover:bg-slate-800 text-slate-300 rounded-lg border border-white/10 flex items-center gap-1.5 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5 text-red-400" /> Clear Chat
            </button>
          )}
        </div>
      </div>

      {/* Message History Feed */}
      <MessageList
        messages={messages}
        copiedIndex={copiedIndex}
        isGenerating={isGenerating}
        onCopy={handleCopy}
        onSendPrompt={onSend}
        messagesEndRef={messagesEndRef}
      />

      {/* Input Bar */}
      <ChatInput
        value={inputValue}
        onChange={onInputChange}
        onSend={onSend}
        onStop={onStop}
        isGenerating={isGenerating}
      />
    </div>
  );
};
