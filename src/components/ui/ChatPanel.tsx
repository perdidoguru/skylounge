import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, Send, ChevronDown, ChevronUp } from 'lucide-react';
import { useGameStore } from '../../store/useGameStore';

export const ChatPanel: React.FC = () => {
  const messages = useGameStore((s) => s.messages);
  const chatOpen = useGameStore((s) => s.chatOpen);
  const setChatOpen = useGameStore((s) => s.setChatOpen);
  const setChatInputFocused = useGameStore((s) => s.setChatInputFocused);
  const sendChatMessage = useGameStore((s) => s.sendChatMessage);

  const [text, setText] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (chatOpen) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, chatOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    sendChatMessage(text);
    setText('');
  };

  return (
    <div className="fixed bottom-4 left-4 z-20 w-80 sm:w-96 flex flex-col rounded-2xl bg-slate-950/80 border border-white/12 backdrop-blur-xl shadow-2xl overflow-hidden transition-all">
      {/* Chat Header */}
      <button
        type="button"
        onClick={() => setChatOpen(!chatOpen)}
        className="px-4 py-2.5 bg-slate-900/90 border-b border-white/10 flex items-center justify-between text-xs font-bold text-slate-200 hover:text-amber-300 transition"
      >
        <span className="flex items-center gap-2">
          <MessageSquare className="w-3.5 h-3.5 text-amber-400" />
          Chat do Lounge
          <span className="px-1.5 py-0.2 rounded-full bg-white/10 text-[10px] text-slate-300">
            {messages.length}
          </span>
        </span>
        {chatOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
      </button>

      {chatOpen && (
        <>
          {/* Messages List */}
          <div className="p-3 h-44 overflow-y-auto space-y-2 text-xs">
            {messages.map((msg) => (
              <div key={msg.id} className="leading-relaxed break-words">
                {msg.isSystem ? (
                  <div className="px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-400/20 text-amber-200/95 text-[11px]">
                    ✨ {msg.text}
                  </div>
                ) : (
                  <div>
                    <span
                      className="font-bold mr-1.5"
                      style={{ color: msg.senderColor || '#e5a95c' }}
                    >
                      {msg.senderName}:
                    </span>
                    <span className="text-slate-100">{msg.text}</span>
                  </div>
                )}
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          {/* Input Bar */}
          <form
            onSubmit={handleSubmit}
            className="p-2 bg-slate-900/90 border-t border-white/10 flex items-center gap-1.5"
          >
            <input
              type="text"
              maxLength={180}
              value={text}
              onFocus={() => setChatInputFocused(true)}
              onBlur={() => setChatInputFocused(false)}
              onChange={(e) => setText(e.target.value)}
              placeholder="Conversar na cobertura..."
              className="flex-1 px-3 py-1.5 rounded-xl bg-slate-950 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400/70"
            />
            <button
              type="submit"
              disabled={!text.trim()}
              className="p-2 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-slate-950 transition"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </>
      )}
    </div>
  );
};
