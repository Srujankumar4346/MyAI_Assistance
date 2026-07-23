/**
 * ChatSidebar — Left panel showing conversation sessions.
 */
import React from 'react';
import { Plus, MessageSquare, Trash2 } from 'lucide-react';
import type { ChatSession } from '../../types';

interface ChatSidebarProps {
  sessions: ChatSession[];
  currentChatId: string | null;
  onSelectSession: (id: string) => void;
  onNewChat: () => void;
  onDeleteSession: (id: string, e: React.MouseEvent) => void;
}

export const ChatSidebar: React.FC<ChatSidebarProps> = ({
  sessions,
  currentChatId,
  onSelectSession,
  onNewChat,
  onDeleteSession,
}) => (
  <div className="w-64 glass-panel rounded-2xl border border-white/10 flex flex-col p-3 overflow-hidden flex-shrink-0 hidden sm:flex">
    <button
      id="chat-new-btn"
      onClick={onNewChat}
      className="w-full py-2.5 px-3 glow-button text-white rounded-xl font-medium text-xs flex items-center justify-center gap-2 mb-3"
    >
      <Plus className="w-4 h-4" /> New Conversation
    </button>

    <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-2 mb-2 flex items-center justify-between">
      <span>Recent Chats</span>
      <span className="text-[10px] font-mono text-cyan-400">{sessions.length}</span>
    </div>

    <div className="flex-1 overflow-y-auto space-y-1 pr-1">
      {sessions.map((s) => (
        <div
          key={s.id}
          onClick={() => onSelectSession(s.id)}
          className={`w-full group flex items-center justify-between px-3 py-2.5 rounded-xl text-xs cursor-pointer transition-all ${
            currentChatId === s.id
              ? 'bg-indigo-600/30 text-cyan-300 border border-indigo-500/40 font-medium'
              : 'text-slate-400 hover:bg-slate-800/40 hover:text-slate-200'
          }`}
        >
          <div className="flex items-center gap-2 truncate">
            <MessageSquare className="w-3.5 h-3.5 flex-shrink-0 text-indigo-400" />
            <span className="truncate">{s.title || 'Untitled Session'}</span>
          </div>
          <button
            onClick={(e) => onDeleteSession(s.id, e)}
            className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-red-400 transition-opacity"
            title="Delete session"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      ))}
    </div>
  </div>
);
