import React, { useState, useEffect, useRef } from 'react';
import { api, getAuthToken } from '../api/client';
import type { ChatSession, Message } from '../types';
import { ChatSidebar } from '../components/chat/ChatSidebar';
import { ChatWindow } from '../components/chat/ChatWindow';

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
  const [availableModels, setAvailableModels] = useState<string[]>([
    'gemma',
    'llama3',
    'qwen',
    'mistral',
  ]);

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
      setSessions(data || []);
    } catch (e) {
      console.error('Failed to load chat history', e);
    }
  };

  const fetchMessages = async (chatId: string) => {
    try {
      const data = await api.getMessages(chatId);
      setMessages(data || []);
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
              content:
                updated[lastIdx].content ||
                `[Error: ${err.message || 'Failed to receive response from NOVA_X engine'}]`,
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

  return (
    <div className="h-[calc(100vh-6.5rem)] flex gap-4 sm:gap-5 overflow-hidden">
      {/* Sessions Sidebar */}
      <ChatSidebar
        sessions={sessions}
        currentChatId={currentChatId}
        onSelectSession={setCurrentChatId}
        onNewChat={handleNewChat}
        onDeleteSession={handleDeleteSession}
      />

      {/* Main Chat Area */}
      <ChatWindow
        messages={messages}
        selectedModel={selectedModel}
        onModelChange={setSelectedModel}
        availableModels={availableModels}
        isGenerating={isGenerating}
        copiedIndex={copiedIndex}
        inputValue={input}
        onInputChange={setInput}
        onSend={handleSend}
        onStop={stopGeneration}
        onClear={handleNewChat}
        messagesEndRef={messagesEndRef}
      />
    </div>
  );
};
