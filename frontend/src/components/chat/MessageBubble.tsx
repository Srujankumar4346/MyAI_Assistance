import React from 'react';
import { Copy, Check, RefreshCw, Bot, User as UserIcon } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { atomDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import type { Message } from '../../types';

interface MessageBubbleProps {
  msg: Message;
  idx: number;
  copiedIndex: number | null;
  isGenerating: boolean;
  isLast: boolean;
  onCopy: (content: string, index: number) => void;
  onRegenerate: (content: string) => void;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  msg,
  idx,
  copiedIndex,
  isGenerating,
  isLast,
  onCopy,
  onRegenerate,
}) => {
  const isUser = msg.sender === 'user';

  return (
    <div className={`flex gap-4 max-w-4xl ${isUser ? 'ml-auto flex-row-reverse' : ''}`}>
      <div
        className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
          isUser
            ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30'
            : 'bg-cyan-500/20 border border-cyan-400/30 text-cyan-300'
        }`}
      >
        {isUser ? <UserIcon className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
      </div>

      <div
        className={`relative group p-4 rounded-2xl text-sm leading-relaxed ${
          isUser
            ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-tr-none shadow-lg shadow-indigo-500/20'
            : 'glass-panel border border-white/10 text-slate-200 rounded-tl-none bg-slate-900/40'
        }`}
      >
        {!isUser ? (
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

        {/* Action icons */}
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
          <button
            onClick={() => onCopy(msg.content, idx)}
            className="p-1 rounded bg-slate-900/80 text-slate-300 hover:text-white cursor-pointer"
            title="Copy message"
          >
            {copiedIndex === idx ? (
              <Check className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
          </button>
          {!isUser && isLast && !isGenerating && (
            <button
              onClick={() => onRegenerate(msg.content)}
              className="p-1 rounded bg-slate-900/80 text-slate-300 hover:text-white cursor-pointer"
              title="Regenerate reply"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
