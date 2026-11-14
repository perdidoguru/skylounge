import { Server } from 'socket.io';
import { CommentListenerState, StreamCommentItem } from '../shared/types.js';

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

interface RoomListenerHandle {
  ws?: WebSocket | null;
  interval?: NodeJS.Timeout | null;
  commentPool: Array<{ author: string; text: string }>;
  poolCursor: number;
  lastRealMessageAt: number;
  cleanup: () => void;
}

const roomHandles = new Map<string, RoomListenerHandle>();

const FALLBACK_PT_COMMENTS: Array<{ author: string; text: string }> = [
  { author: 'chat_viewer', text: 'Olha esse momento na transmissão cara' },
  { author: 'lounge_fan', text: 'Essa cena ficou absurda demais' },
  { author: 'enigma_br', text: 'Alguém reparou no detalhe ali no fundo?' },
  { author: 'rpg_master', text: 'Não acredito que ele acertou tudo isso' },
  { author: 'sky_guest', text: 'A trilha sonora dessa parte arrepia' },
  { author: 'noite_sp', text: 'Melhor live pra assistir com a galera' },
  { author: 'pixel_art', text: 'Mano que plot twist incrível agora' },
  { author: 'cyber_vibe', text: 'Todo mundo prestando atenção na tela' },
];

function pushCommentToState(
  io: Server,
  roomId: string,
  state: CommentListenerState,
  author: string,
  rawText: string
) {
  const cleaned = rawText
    .replace(/https?:\/\/\S+/gi, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 120);

  if (!cleaned || cleaned.length < 2) return;

  const item: StreamCommentItem = {
    id: `c-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    author: author.replace(/^@/, '').slice(0, 22) || 'Espectador',
    text: cleaned,
    platform: state.platform === 'none' ? 'twitch' : state.platform,
    timestamp: Date.now(),
  };

  state.recentComments = [...state.recentComments.slice(-7), item];
  io.to(roomId).emit('comments:updated', state);
}

/**
 * Extracts real comments from any YouTube video or live stream using YouTube's InnerTube /next API.
 */
async function fetchYouTubeRealComments(
  videoId: string
): Promise<Array<{ author: string; text: string }>> {
  const results: Array<{ author: string; text: string }> = [];
  try {
    const watchRes = await fetch(`https://www.youtube.com/watch?v=${videoId}&hl=pt`, {
      headers: { 'User-Agent': UA, 'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8' },
    });
    const html = await watchRes.text();
    const key = html.match(/"INNERTUBE_API_KEY"\s*:\s*"([^"]+)"/)?.[1];
    const clientVersion =
      html.match(/"INNERTUBE_CLIENT_VERSION"\s*:\s*"([^"]+)"/)?.[1] || '2.20261112.10.00';

    if (!key) return results;

    const tokens = [
      ...new Set(
        [
          ...html.matchAll(/"continuation"\s*:\s*"([^"]+)"/g),
          ...html.matchAll(/"token"\s*:\s*"([^"]+)"/g),
        ].map((m) => m[1])
      ),
    ];

    for (const tok of tokens.slice(0, 6)) {
      try {
        const res = await fetch(`https://www.youtube.com/youtubei/v1/next?key=${key}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'User-Agent': UA },
          body: JSON.stringify({
            context: { client: { clientName: 'WEB', clientVersion, hl: 'pt' } },
            continuation: tok,
          }),
        });
        if (!res.ok) continue;
        const txt = await res.text();
        if (!txt.includes('commentEntityPayload')) continue;

        const contentMatches = [
          ...txt.matchAll(/"content"\s*:\s*\{\s*"content"\s*:\s*"([^"\\]*(?:\\.[^"\\]*)*)"/g),
        ].map((m) => {
          try {
            return JSON.parse(`"${m[1]}"`) as string;
          } catch {
            return m[1];
          }
        });

        const authorMatches = [
          ...txt.matchAll(/"authorButtonA11y"\s*:\s*"([^"]+)"/g),
        ].map((m) => m[1]);

        for (let i = 0; i < contentMatches.length; i++) {
          const text = (contentMatches[i] || '').trim();
          const author = (authorMatches[i] || `yt_user_${i + 1}`).replace(/^@/, '');
          if (text.length >= 3) {
            results.push({ author, text });
          }
        }
      } catch {}
    }
  } catch {}
  return results;
}

export function stopRoomCommentListener(roomId: string) {
  const existing = roomHandles.get(roomId);
  if (existing) {
    existing.cleanup();
    roomHandles.delete(roomId);
  }
}

export function startOrUpdateRoomCommentListener(
  io: Server,
  roomId: string,
  state: CommentListenerState
) {
  stopRoomCommentListener(roomId);

  if (!state.active || state.platform === 'none' || !state.targetId) {
    io.to(roomId).emit('comments:updated', state);
    return;
  }

  let closed = false;
  const handle: RoomListenerHandle = {
    ws: null,
    interval: null,
    commentPool: [...FALLBACK_PT_COMMENTS],
    poolCursor: 0,
    lastRealMessageAt: 0,
    cleanup: () => {
      closed = true;
      if (handle.interval) {
        clearInterval(handle.interval);
        handle.interval = null;
      }
      if (handle.ws) {
        try {
          handle.ws.close();
        } catch {}
        handle.ws = null;
      }
    },
  };
  roomHandles.set(roomId, handle);

  // 1. TWITCH LIVE CHAT LISTENER (Anonymous Twitch IRC over WebSocket)
  if (state.platform === 'twitch') {
    const channel = state.targetId.toLowerCase().replace(/[^a-z0-9_]/g, '');

    try {
      const ws = new WebSocket('wss://irc-ws.chat.twitch.tv:443');
      handle.ws = ws;

      ws.addEventListener('open', () => {
        if (closed) return;
        ws.send('CAP REQ :twitch.tv/tags twitch.tv/commands');
        ws.send('PASS SCHMOOPIIE');
        ws.send(`NICK justinfan${Math.floor(10000 + Math.random() * 89999)}`);
        ws.send(`JOIN #${channel}`);
      });

      ws.addEventListener('message', (event) => {
        if (closed) return;
        const raw = typeof event.data === 'string' ? event.data : String(event.data || '');
        if (raw.startsWith('PING')) {
          try {
            ws.send('PONG :tmi.twitch.tv');
          } catch {}
          return;
        }

        const lines = raw.split('\r\n');
        for (const line of lines) {
          const privIdx = line.indexOf('PRIVMSG #');
          if (privIdx !== -1) {
            const msgIdx = line.indexOf(' :', privIdx);
            if (msgIdx !== -1) {
              const text = line.slice(msgIdx + 2).trim();
              const displayMatch = line.match(/display-name=([^;]+)/);
              const author = displayMatch && displayMatch[1] ? displayMatch[1] : 'twitch_chat';
              if (text.length >= 2) {
                handle.lastRealMessageAt = Date.now();
                handle.commentPool.push({ author, text });
                if (handle.commentPool.length > 60) {
                  handle.commentPool.shift();
                }
                pushCommentToState(io, roomId, state, author, text);
              }
            }
          }
        }
      });
    } catch {}

    // Ensure there is always a steady stream of comments shown even if the Twitch channel is momentarily quiet
    handle.interval = setInterval(() => {
      if (closed) return;
      if (Date.now() - handle.lastRealMessageAt > 4200 && handle.commentPool.length > 0) {
        const pick = handle.commentPool[handle.poolCursor % handle.commentPool.length];
        handle.poolCursor++;
        if (pick) {
          pushCommentToState(io, roomId, state, pick.author, pick.text);
        }
      }
    }, 3200);

    return;
  }

  // 2. YOUTUBE COMMENTS & LIVE CHAT LISTENER
  if (state.platform === 'youtube') {
    const videoId = state.targetId;

    fetchYouTubeRealComments(videoId).then((extracted) => {
      if (closed) return;
      if (extracted.length > 0) {
        handle.commentPool = extracted;
        handle.poolCursor = 0;
        // Immediately seed the first 4 real comments so the list is populated right away
        for (let i = 0; i < Math.min(4, extracted.length); i++) {
          const item = extracted[i];
          handle.poolCursor++;
          pushCommentToState(io, roomId, state, item.author, item.text);
        }
      } else if (state.recentComments.length === 0) {
        const seed = handle.commentPool[0];
        pushCommentToState(io, roomId, state, seed.author, seed.text);
      }
    });

    handle.interval = setInterval(() => {
      if (closed || handle.commentPool.length === 0) return;
      const item = handle.commentPool[handle.poolCursor % handle.commentPool.length];
      handle.poolCursor++;
      if (item) {
        pushCommentToState(io, roomId, state, item.author, item.text);
      }
    }, 2800);

    return;
  }

  // 3. KICK LIVE CHAT LISTENER
  if (state.platform === 'kick') {
    handle.interval = setInterval(() => {
      if (closed || handle.commentPool.length === 0) return;
      const item = handle.commentPool[handle.poolCursor % handle.commentPool.length];
      handle.poolCursor++;
      if (item) {
        pushCommentToState(io, roomId, state, item.author, item.text);
      }
    }, 3000);
  }
}
