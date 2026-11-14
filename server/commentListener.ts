import { Server } from 'socket.io';
import { CommentListenerState, StreamCommentItem } from '../shared/types.js';

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

interface RoomListenerHandle {
  ws?: WebSocket | null;
  interval?: NodeJS.Timeout | null;
  cleanup: () => void;
}

const roomHandles = new Map<string, RoomListenerHandle>();

function createCommentItem(
  author: string,
  rawText: string,
  platform: 'youtube' | 'twitch' | 'kick',
  customId?: string
): StreamCommentItem | null {
  const cleaned = rawText
    .replace(/https?:\/\/\S+/gi, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 140);

  if (!cleaned || cleaned.length < 2) return null;

  return {
    id: customId || `c-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    author: author.replace(/^@/, '').slice(0, 24) || 'chat',
    text: cleaned,
    platform,
    timestamp: Date.now(),
  };
}

/**
 * Resolves a YouTube @handle (e.g. "@channel") to its active live or latest videoId.
 */
async function resolveYouTubeTargetVideoId(targetId: string): Promise<string> {
  if (!targetId.startsWith('@')) return targetId;
  try {
    const res = await fetch(`https://www.youtube.com/${targetId}/live`, {
      headers: { 'User-Agent': UA, 'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8' },
    });
    const html = await res.text();
    const canonicalMatch = html.match(
      /<link rel="canonical" href="https:\/\/www\.youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})"/
    );
    if (canonicalMatch?.[1]) return canonicalMatch[1];
    const vidMatch = html.match(/"videoId"\s*:\s*"([a-zA-Z0-9_-]{11})"/);
    if (vidMatch?.[1]) return vidMatch[1];
  } catch {}
  return targetId;
}

/**
 * Inspects a YouTube video page to see if it has an active Live Chat ("liveChatRenderer":),
 * or falls back to extracting real VOD comments via InnerTube /youtubei/v1/next.
 */
async function initYouTubeSource(videoId: string): Promise<{
  mode: 'live_chat' | 'vod_comments';
  apiKey?: string;
  clientVersion?: string;
  liveContinuation?: string;
  vodComments?: Array<{ author: string; text: string }>;
}> {
  try {
    const watchRes = await fetch(`https://www.youtube.com/watch?v=${videoId}&hl=pt`, {
      headers: { 'User-Agent': UA, 'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8' },
    });
    const html = await watchRes.text();
    const apiKey = html.match(/"INNERTUBE_API_KEY"\s*:\s*"([^"]+)"/)?.[1];
    const clientVersion =
      html.match(/"INNERTUBE_CLIENT_VERSION"\s*:\s*"([^"]+)"/)?.[1] || '2.20261112.10.00';

    if (!apiKey) {
      return { mode: 'vod_comments', vodComments: [] };
    }

    // 1. Check for active YouTube Live Chat ("liveChatRenderer":)
    const liveChatIdx = html.indexOf('"liveChatRenderer":');
    if (liveChatIdx !== -1) {
      const snippet = html.slice(liveChatIdx, liveChatIdx + 2500);
      const conts = [...snippet.matchAll(/"continuation"\s*:\s*"([^"]+)"/g)].map((m) => m[1]);
      if (conts.length > 0) {
        return {
          mode: 'live_chat',
          apiKey,
          clientVersion,
          liveContinuation: conts[0],
        };
      }
    }

    // 2. Otherwise extract real VOD comments via /youtubei/v1/next
    const vodComments: Array<{ author: string; text: string }> = [];
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
        const res = await fetch(`https://www.youtube.com/youtubei/v1/next?key=${apiKey}`, {
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
          const author = (authorMatches[i] || 'espectador').replace(/^@/, '');
          if (text.length >= 2) {
            vodComments.push({ author, text });
          }
        }
      } catch {}
    }

    return {
      mode: 'vod_comments',
      vodComments,
    };
  } catch {
    return { mode: 'vod_comments', vodComments: [] };
  }
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
    state.recentComments = [];
    io.to(roomId).emit('comments:updated', state);
    return;
  }

  let closed = false;
  const handle: RoomListenerHandle = {
    ws: null,
    interval: null,
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

  // Clear previous comments when switching source
  state.recentComments = [];
  io.to(roomId).emit('comments:updated', state);

  // 1. TWITCH LIVE CHAT LISTENER (Collects real messages and emits a fresh chunk every 3 seconds)
  if (state.platform === 'twitch') {
    const channel = state.targetId.toLowerCase().replace(/[^a-z0-9_]/g, '');
    let incomingChunk: StreamCommentItem[] = [];
    let sentFirstImmediateBatch = false;

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
              const idMatch = line.match(/(?:^|;)id=([^;]+)/);
              const author = displayMatch && displayMatch[1] ? displayMatch[1] : 'chat';
              const item = createCommentItem(author, text, 'twitch', idMatch?.[1]);
              if (item) {
                incomingChunk.push(item);
                if (incomingChunk.length > 25) {
                  incomingChunk.shift();
                }
              }
            }
          }
        }

        // Send very first incoming message right away so user sees immediate live confirmation
        if (!sentFirstImmediateBatch && incomingChunk.length >= 1) {
          sentFirstImmediateBatch = true;
          state.recentComments = [...incomingChunk.slice(-12)];
          incomingChunk = [];
          io.to(roomId).emit('comments:updated', state);
        }
      });
    } catch {}

    // Every 3 seconds, flush the new chunk of messages that arrived during that 3s window
    handle.interval = setInterval(() => {
      if (closed) return;
      if (incomingChunk.length > 0) {
        const chunk = incomingChunk.slice(-12);
        incomingChunk = [];
        state.recentComments = chunk;
        io.to(roomId).emit('comments:updated', state);
      }
    }, 3000);

    return;
  }

  // 2. YOUTUBE LIVE CHAT & VOD COMMENTS (Polls a fresh chunk every 3 seconds)
  if (state.platform === 'youtube') {
    (async () => {
      const resolvedVideoId = await resolveYouTubeTargetVideoId(state.targetId);
      if (closed) return;

      const sourceInfo = await initYouTubeSource(resolvedVideoId);
      if (closed) return;

      // 2A. Active YouTube Live Stream Chat (Polls get_live_chat every 3 seconds for new messages)
      if (
        sourceInfo.mode === 'live_chat' &&
        sourceInfo.apiKey &&
        sourceInfo.liveContinuation
      ) {
        const seenIds = new Set<string>();
        const apiKey = sourceInfo.apiKey;
        const clientVersion = sourceInfo.clientVersion || '2.20261112.10.00';
        const initialTok = sourceInfo.liveContinuation;
        let isFirstPoll = true;

        const pollLiveChatChunk = async () => {
          if (closed) return;
          try {
            const chatRes = await fetch(
              `https://www.youtube.com/youtubei/v1/live_chat/get_live_chat?key=${apiKey}`,
              {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'User-Agent': UA },
                body: JSON.stringify({
                  context: { client: { clientName: 'WEB', clientVersion, hl: 'pt' } },
                  continuation: initialTok,
                }),
              }
            );
            if (!chatRes.ok || closed) return;
            const data = (await chatRes.json()) as any;
            const actions: any[] =
              data?.continuationContents?.liveChatContinuation?.actions || [];

            const freshChunk: StreamCommentItem[] = [];
            for (const act of actions) {
              const renderer = act?.addChatItemAction?.item?.liveChatTextMessageRenderer;
              if (!renderer || !renderer.id) continue;
              if (seenIds.has(renderer.id)) continue;
              seenIds.add(renderer.id);

              const author = renderer.authorName?.simpleText || 'chat';
              const runs: any[] = renderer.message?.runs || [];
              const text = runs
                .map((r) => r.text || '')
                .join('')
                .trim();

              const item = createCommentItem(author, text, 'youtube', renderer.id);
              if (item) {
                freshChunk.push(item);
              }
            }

            // Keep seenIds bounded
            if (seenIds.size > 600) {
              const arr = Array.from(seenIds).slice(-300);
              seenIds.clear();
              arr.forEach((id) => seenIds.add(id));
            }

            if (freshChunk.length > 0) {
              // On first poll, take the last 10 most recent live messages; on 3s polls, take all new messages (up to 12)
              const chunkToEmit = isFirstPoll
                ? freshChunk.slice(-10)
                : freshChunk.slice(-12);
              isFirstPoll = false;
              state.recentComments = chunkToEmit;
              io.to(roomId).emit('comments:updated', state);
            } else {
              isFirstPoll = false;
            }
          } catch {}
        };

        await pollLiveChatChunk();
        if (!closed) {
          handle.interval = setInterval(pollLiveChatChunk, 3000);
        }
        return;
      }

      // 2B. Regular YouTube Video (VOD) — delivers unseen real comments in chunks of 5 every 3s without looping fake comments
      const vodList = sourceInfo.vodComments || [];
      let cursor = 0;

      const emitNextVodChunk = () => {
        if (closed || cursor >= vodList.length) return;
        const slice = vodList.slice(cursor, cursor + 5);
        cursor += slice.length;
        const items = slice
          .map((c) => createCommentItem(c.author, c.text, 'youtube'))
          .filter((x): x is StreamCommentItem => Boolean(x));
        if (items.length > 0) {
          state.recentComments = items;
          io.to(roomId).emit('comments:updated', state);
        }
      };

      emitNextVodChunk();
      if (vodList.length > 5 && !closed) {
        handle.interval = setInterval(emitNextVodChunk, 3000);
      }
    })();

    return;
  }
}
