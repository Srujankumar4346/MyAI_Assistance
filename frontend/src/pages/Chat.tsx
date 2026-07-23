import React, { useState, useEffect, useRef } from 'react';
import { api, getAuthToken } from '../api/client';
import type { ChatSession, Message } from '../types';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { atomDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { 
  Send, Plus, Trash2, Copy, Check, RefreshCw, Square, 
  MessageSquare, Sparkles, Bot, User as UserIcon, Cpu 
} from 'lucide-react';

interface ChatProps {
  selectedModel: string;
  setSelectedModel: (model: string) => void;
}

export const Chat: React.FC<ChatProps> = ({ selectedModel, setSelectedModel }) => {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [availableModels, setAvailableModels] = useState<string[]>(['gemma', 'llama3', 'qwen', 'mistral']);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    fetchSessions();
    fetchModels();
  }, []);

  useEffect(() => {
    if (currentChatId) {
      fetchMessages(currentChatId);
    } else {
      setMessages([]);
    }
  }, [currentChatId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isGenerating]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchModels = async () => {
    try {
      const data = await api.getModels();
      if (data.models && data.models.length > 0) {
        setAvailableModels(data.models);
        if (!data.models.includes(selectedModel)) {
          setSelectedModel(data.models[0]);
        }
      }
    } catch (e) {
      console.error('Failed to load models list', e);
    }
  };

  const fetchSessions = async () => {
    try {
      const data = await api.getHistory();
      setSessions(data);
    } catch (e) {
      console.error('Failed to load chat history', e);
    }
  };

  const fetchMessages = async (chatId: string) => {
    try {
      const data = await api.getMessages(chatId);
      setMessages(data);
    } catch (e) {
      console.error('Failed to load messages', e);
    }
  };

  const handleNewChat = () => {
    if (isGenerating) stopGeneration();
    setCurrentChatId(null);
    setMessages([]);
  };

  const handleDeleteSession = async (chatId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await api.deleteChat(chatId);
      if (currentChatId === chatId) handleNewChat();
      fetchSessions();
    } catch (e) {
      console.error('Failed to delete chat session', e);
    }
  };

  const stopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsGenerating(false);
  };

  const handleSend = async (overrideContent?: string) => {
    const textToSend = overrideContent || input;
    if (!textToSend.trim() || isGenerating) return;

    if (!overrideContent) setInput('');

    const userMessage: Message = {
      sender: 'user',
      content: textToSend,
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsGenerating(true);

    const initialAssistantMsg: Message = {
      sender: 'assistant',
      content: '',
      model: selectedModel,
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, initialAssistantMsg]);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const token = getAuthToken();
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          chat_id: currentChatId,
          content: textToSend,
          model: selectedModel,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`Server returned HTTP ${response.status}`);
      }

      const newChatId = response.headers.get('X-Chat-ID');
      if (newChatId && newChatId !== currentChatId) {
        setCurrentChatId(newChatId);
        fetchSessions();
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder('utf-8');

      if (reader) {
        let accumulatedText = '';
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          accumulatedText += chunk;

          setMessages((prev) => {
            const updated = [...prev];
            const lastIdx = updated.length - 1;
            if (lastIdx >= 0 && updated[lastIdx].sender === 'assistant') {
              updated[lastIdx] = { ...updated[lastIdx], content: accumulatedText };
            }
            return updated;
          });
        }
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.error('Chat generation error:', err);
        setMessages((prev) => {
          const updated = [...prev];
          const lastIdx = updated.length - 1;
          if (lastIdx >= 0 && updated[lastIdx].sender === 'assistant') {
            updated[lastIdx] = { 
              ...updated[lastIdx], 
              content: updated[lastIdx].content || `[Error: ${err.message || 'Failed to receive response from NOVA_X engine'}]` 
            };
          }
          return updated;
        });
      }
    } finally {
      setIsGenerating(false);
      abortControllerRef.current = null;
      fetchSessions();
    }
  };

  const handleCopy = (content: string, index: number) => {
    navigator.clipboard.writeText(content);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="h-[calc(100vh-6.5rem)] flex gap-5 overflow-hidden">
      {/* Sessions Sidebar */}
      <div className="w-64 glass-panel rounded-2xl border border-white/10 flex flex-col p-3 overflow-hidden flex-shrink-0">
        <button
          onClick={handleNewChat}
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
              onClick={() => setCurrentChatId(s.id)}
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
                onClick={(e) => handleDeleteSession(s.id, e)}
                className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-red-400 transition-opacity"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 glass-panel rounded-2xl border border-white/10 flex flex-col overflow-hidden relative">
        {/* Header Controls */}
        <div className="px-6 py-3 border-b border-white/10 flex items-center justify-between bg-slate-900/40">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-indigo-950/60 px-3 py-1.5 rounded-xl border border-indigo-500/30 text-xs">
              <Cpu className="w-4 h-4 text-cyan-400" />
              <span className="text-slate-300 font-medium">Model:</span>
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
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
                onClick={handleNewChat}
                className="px-3 py-1.5 text-xs glass-panel hover:bg-slate-800 text-slate-300 rounded-lg border border-white/10 flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5 text-red-400" /> Clear Chat
              </button>
            )}
          </div>
        </div>

        {/* Message History Feed */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-8">
              <div className="p-4 bg-indigo-600/20 rounded-3xl border border-indigo-500/30 text-cyan-300 mb-4 animate-pulse-glow">
                <Sparkles className="w-10 h-10" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">How can NOVA_X assist you today?</h3>
              <p className="text-slate-400 text-xs max-w-md">
                Select an Ollama model, ask coding or general intelligence questions, or leverage long-term vector memory context.
              </p>

              <div className="grid grid-cols-2 gap-3 mt-6 max-w-lg w-full">
                {[
                  "Write a Python FastAPI async endpoint",
                  "Explain how ChromaDB vector search works",
                  "Draft a project structure for NOVA_X Phase 2",
                  "What technologies power this AI OS?"
                ].map((prompt, i) => (
                  <button
                    key={i}
                    onClick={() => handleSend(prompt)}
                    className="p-3 text-left glass-panel glass-panel-hover rounded-xl text-xs text-slate-300 border border-white/5 hover:border-indigo-400/30"
                  >
                    "{prompt}"
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex gap-4 max-w-4xl ${
                  msg.sender === 'user' ? 'ml-auto flex-row-reverse' : ''
                }`}
              >
                {/* Avatar */}
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    msg.sender === 'user'
                      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30'
                      : 'bg-cyan-500/20 border border-cyan-400/30 text-cyan-300'
                  }`}
                >
                  {msg.sender === 'user' ? <UserIcon className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
                </div>

                {/* Message Bubble */}
                <div
                  className={`relative group p-4 rounded-2xl text-sm leading-relaxed ${
                    msg.sender === 'user'
                      ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-tr-none shadow-lg shadow-indigo-500/20'
                      : 'glass-panel border border-white/10 text-slate-200 rounded-tl-none'
                  }`}
                >
                  {msg.sender === 'assistant' ? (
                    <div className="prose prose-invert max-w-none text-xs sm:text-sm">
                      {msg.content ? (
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          components={{
                            code({ node, inline, className, children, ...props }: any) {
                              const match = /language-(\w+)/.exec(className || '');
                              return !inline && match ? (
                                <SyntaxHighlighter
                                  style={atomDark as any}
                                  language={match[1]}
                                  PreTag="div"
                                  className="rounded-xl my-2 text-xs border border-white/10"
                                  {...props}
                                >
                                  {String(children).replace(/\n$/, '')}
                                </SyntaxHighlighter>
                              ) : (
                                <code className="bg-slate-800 text-cyan-300 px-1.5 py-0.5 rounded font-mono text-xs" {...props}>
                                  {children}
                                </code>
                              );
                            },
                          }}
                        >
                          {msg.content}
                        </ReactMarkdown>
                      ) : (
                        <div className="flex items-center gap-1.5 py-1 px-0.5">
                          <span className="text-xs text-indigo-300/80 mr-1 font-mono">NOVA_X is typing</span>
                          <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                          <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                          <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="whitespace-pre-wrap">{msg.content}</div>
                  )}

                  {/* Actions (Copy / Re-generate) */}
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                    <button
                      onClick={() => handleCopy(msg.content, idx)}
                      className="p-1 rounded bg-slate-900/80 text-slate-300 hover:text-white"
                      title="Copy content"
                    >
                      {copiedIndex === idx ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                    {msg.sender === 'assistant' && idx === messages.length - 1 && !isGenerating && (
                      <button
                        onClick={() => handleSend(messages[idx - 1]?.content || '')}
                        className="p-1 rounded bg-slate-900/80 text-slate-300 hover:text-white"
                        title="Regenerate response"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div className="p-4 border-t border-white/10 bg-slate-900/60">
          <div className="relative flex items-center">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={2}
              placeholder="Ask NOVA_X anything... (Shift + Enter for new line)"
              className="w-full pl-4 pr-24 py-3 glass-input rounded-xl text-sm resize-none"
            />

            <div className="absolute right-3 flex items-center gap-2">
              {isGenerating ? (
                <button
                  onClick={stopGeneration}
                  className="px-3 py-2 bg-red-600/80 hover:bg-red-600 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5"
                >
                  <Square className="w-3.5 h-3.5" /> Stop
                </button>
              ) : (
                <button
                  onClick={() => handleSend()}
                  disabled={!input.trim()}
                  className="p-2.5 glow-button text-white rounded-xl disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Send className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
