import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, Send, X } from 'lucide-react';
import { useGameStore } from '../../store/useGameStore';

export const ChatPanel: React.FC = () => {
  const messages = useGameStore((s) => s.messages);
  const chatOpen = useGameStore((s) => s.chatOpen);
  const setChatOpen = useGameStore((s) => s.setChatOpen);
  const activeModal = useGameStore((s) => s.activeModal);
  const setChatInputFocused = useGameStore((s) => s.setChatInputFocused);
  const sendChatMessage = useGameStore((s) => s.sendChatMessage);

  const [text, setText] = useState('');
  const [recentPreviewId, setRecentPreviewId] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const lastSeenCountRef = useRef(messages.length);

  // Scroll to bottom when open
  useEffect(() => {
    if (chatOpen) {
      setUnreadCount(0);
      lastSeenCountRef.current = messages.length;
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
      setTimeout(() => inputRef.current?.focus(), 40);
    } else if (messages.length > lastSeenCountRef.current) {
      const latest = messages[messages.length - 1];
      setUnreadCount((c) => c + (messages.length - lastSeenCountRef.current));
      lastSeenCountRef.current = messages.length;
      if (latest) {
        setRecentPreviewId(latest.id);
        const timer = setTimeout(() => {
          setRecentPreviewId((cur) => (cur === latest.id ? null : cur));
        }, 5000);
        return () => clearTimeout(timer);
      }
    }
  }, [messages, chatOpen]);

  // Press Enter to open chat when in 3D world, Escape to close
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (activeModal !== 'none') return;
      const tag = (document.activeElement as HTMLElement)?.tagName;
      const isTyping = tag === 'INPUT' || tag === 'TEXTAREA';

      if (e.key === 'Enter' && !chatOpen && !isTyping) {
        e.preventDefault();
        setChatOpen(true);
      } else if (e.key === 'Escape' && chatOpen) {
        setChatOpen(false);
        setChatInputFocused(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [chatOpen, activeModal, setChatOpen, setChatInputFocused]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    sendChatMessage(text);
    setText('');
  };

  const latestMsg = messages.length > 0 ? messages[messages.length - 1] : null;
  const showPreview = !chatOpen && latestMsg && recentPreviewId === latestMsg.id;

  if (!chatOpen) {
    return (
      <div className="fixed bottom-3 left-3 z-20 flex flex-col items-start gap-1.5 pointer-events-auto">
        {/* Transient floating preview of latest message (fades after 5s) */}
        {showPreview && latestMsg && (
          <button
            type="button"
            onClick={() => setChatOpen(true)}
            className="max-w-[240px] px-3 py-1.5 rounded-xl bg-slate-950/55 border border-white/10 backdrop-blur-md text-left text-[11px] text-slate-200 shadow-lg truncate transition hover:bg-slate-950/80"
          >
            {latestMsg.isSystem ? (
              <span className="text-amber-300/90">✨ {latestMsg.text}</span>
            ) : (
              <>
                <span
                  className="font-semibold mr-1"
                  style={{ color: latestMsg.senderColor || '#e5a95c' }}
                >
                  {latestMsg.senderName}:
                </span>
                <span className="text-slate-100/90">{latestMsg.text}</span>
              </>
            )}
          </button>
        )}

        {/* Minimalist Floating Chat Pill */}
        <button
          type="button"
          onClick={() => setChatOpen(true)}
          className="h-8 px-3 rounded-full bg-slate-950/45 hover:bg-slate-950/85 border border-white/10 hover:border-amber-400/30 backdrop-blur-md shadow-lg flex items-center gap-2 text-[11px] font-medium text-slate-200 opacity-70 hover:opacity-100 transition-all duration-200"
          title="Abrir Chat (Enter)"
        >
          <MessageSquare className="w-3.5 h-3.5 text-amber-400" />
          <span>Chat</span>
          {unreadCount > 0 ? (
            <span className="px-1.5 py-0.2 rounded-full bg-amber-500 text-slate-950 text-[10px] font-bold">
              {unreadCount}
            </span>
          ) : (
            <span className="text-[10px] text-slate-400 font-mono">[Enter]</span>
          )}
        </button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-3 left-3 z-20 w-72 sm:w-80 flex flex-col rounded-2xl bg-slate-950/55 hover:bg-slate-950/80 border border-white/10 backdrop-blur-xl shadow-xl overflow-hidden transition-all duration-200 pointer-events-auto">
      {/* Slim Header */}
      <div className="px-3 py-1.5 bg-slate-900/50 border-b border-white/8 flex items-center justify-between text-[11px] font-semibold text-slate-300">
        <span className="flex items-center gap-1.5">
          <MessageSquare className="w-3 h-3 text-amber-400" />
          <span>Chat</span>
          <span className="text-[10px] text-slate-500">({messages.length})</span>
        </span>
        <button
          type="button"
          onClick={() => {
            setChatOpen(false);
            setChatInputFocused(false);
          }}
          className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition"
          title="Minimizar Chat (Esc)"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Compact Messages List */}
      <div className="px-3 py-2 max-h-32 overflow-y-auto space-y-1.5 text-[11px]">
        {messages.slice(-25).map((msg) => (
          <div key={msg.id} className="leading-snug break-words">
            {msg.isSystem ? (
              <div className="text-amber-300/85 text-[10px]">✨ {msg.text}</div>
            ) : (
              <div>
                <span
                  className="font-semibold mr-1"
                  style={{ color: msg.senderColor || '#e5a95c' }}
                >
                  {msg.senderName}:
                </span>
                <span className="text-slate-100/95">{msg.text}</span>
              </div>
            )}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Slim Input Bar */}
      <form
        onSubmit={handleSubmit}
        className="p-1.5 bg-slate-900/50 border-t border-white/8 flex items-center gap-1.5"
      >
        <input
          ref={inputRef}
          type="text"
          maxLength={180}
          value={text}
          onFocus={() => setChatInputFocused(true)}
          onBlur={() => setChatInputFocused(false)}
          onChange={(e) => setText(e.target.value)}
          placeholder="Mensagem... (Esc para fechar)"
          className="flex-1 px-2.5 py-1 rounded-xl bg-slate-950/70 border border-white/8 text-[11px] text-white placeholder-slate-500 focus:outline-none focus:border-amber-400/50"
        />
        <button
          type="submit"
          disabled={!text.trim()}
          className="p-1.5 rounded-xl bg-amber-500/90 hover:bg-amber-400 disabled:opacity-30 text-slate-950 transition"
        >
          <Send className="w-3 h-3" />
        </button>
      </form>
    </div>
  );
};
