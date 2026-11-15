import { Server } from 'socket.io';
import { CommentListenerState, StreamCommentItem } from '../shared/types.js';

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

const DUPLICATE_WINDOW_MS = 30_000;

interface RoomListenerHandle {
  ws?: WebSocket | null;
  interval?: NodeJS.Timeout | null;
  recentNormalizedMap: Map<string, number>;
  cleanup: () => void;
}

const roomHandles = new Map<string, RoomListenerHandle>();

/**
 * Strips native Twitch custom emotes using the exact character index ranges from IRC `emotes=` tag.
 * Format: emotes=25:0-4,6-10/1902:12-16
 */
function stripTwitchIrcEmoteRanges(rawText: string, emotesTag?: string): string {
  if (!emotesTag || !emotesTag.trim()) return rawText;

  const chars = Array.from(rawText);
  const rangeMatches = [...emotesTag.matchAll(/(\d+)-(\d+)/g)];
  if (rangeMatches.length === 0) return rawText;

  for (const m of rangeMatches) {
    const start = Number(m[1]);
    const end = Number(m[2]);
    if (Number.isFinite(start) && Number.isFinite(end) && start >= 0 && end >= start) {
      for (let i = start; i <= Math.min(end, chars.length - 1); i++) {
        chars[i] = ' ';
      }
    }
  }

  return chars.join('');
}

/**
 * Cleans a raw live chat message according to strict filters:
 * 1. Ignores any message containing '@' (mentions/replies) or starting with '!' (bot commands).
 * 2. Strips Twitch/YouTube custom emotes, subscriber emote codes (e.g. cellA, peepoHappy, monkaW), and :shortcodes:.
 * 3. Collapses repeated words/tokens inside the same message.
 */
function sanitizeAndFilterChatText(rawText: string, twitchEmotesTag?: string): string | null {
  if (!rawText) return null;

  // Filter 1: Ignore any message that uses '@' or starts with '!'
  if (rawText.includes('@')) return null;
  if (rawText.trim().startsWith('!')) return null;

  // Filter 2: Strip exact Twitch IRC emote character ranges
  let text = stripTwitchIrcEmoteRanges(rawText, twitchEmotesTag);

  // Strip URLs
  text = text.replace(/https?:\/\/\S+/gi, ' ');

  // Strip :shortcode: custom emojis/stickers
  text = text.replace(/:[a-zA-Z0-9_+-]{2,32}:/g, ' ');

  // Strip Twitch/7TV/BTTV camelCase subscriber/custom emote codes (e.g. "cellA", "peepoHappy", "monkaW", "catJAM", "PogChamp")
  text = text.replace(/\b[a-z]{2,15}[A-Z][a-zA-Z0-9_]*\b/g, ' ');
  text = text.replace(/\b[A-Z][a-z]{2,12}[A-Z][a-zA-Z0-9_]*\b/g, ' ');

  // Strip common global Twitch/7TV/BTTV emote tokens
  text = text.replace(
    /\b(LUL|LULW|OMEGALUL|KEKW|KAPPA|POG|POGGERS|POGCHAMP|PEPEGA|SADGE|CLAP|AYAYA|BIBLETHUMP|4HEAD|KREYGASM|RESIDENTSLEEPER|NOTLIKETHIS|WUTFACE|DANSGAME|SMORC|BABYRAGE|PJSALT|MONKAS|MONKAW|CATJAM|PEPEJAM)\b/gi,
    ' '
  );

  // Normalize whitespace
  text = text.replace(/\s+/g, ' ').trim();
  if (!text) return null;

  // Collapse consecutive repeated words (e.g. "cellA cellA cellA" or "oi oi oi" -> single occurrence)
  const words = text.split(' ');
  const dedupedWords: string[] = [];
  for (const w of words) {
    const prev = dedupedWords[dedupedWords.length - 1];
    if (!prev || prev.toLowerCase() !== w.toLowerCase()) {
      dedupedWords.push(w);
    }
  }

  // If the original message was just the same single token repeated 2+ times (spam/emote spam), drop it
  if (words.length >= 2 && dedupedWords.length === 1) {
    return null;
  }

  const finalCleaned = dedupedWords.join(' ').trim().slice(0, 120);
  if (finalCleaned.length < 2) return null;

  return finalCleaned;
}

/**
 * Normalizes a message string for duplicate detection over the recent time window.
 */
function normalizeForDedup(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/(.)\1{2,}/g, '$1$1') // "kkkkkk" -> "kk", "aaaa" -> "aa"
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Checks if a message is a duplicate of content seen in the last DUPLICATE_WINDOW_MS (30s).
 */
function isDuplicateInRecentWindow(
  text: string,
  recentMap: Map<string, number>
): boolean {
  const now = Date.now();

  // Prune expired entries older than DUPLICATE_WINDOW_MS
  for (const [key, ts] of recentMap.entries()) {
    if (now - ts > DUPLICATE_WINDOW_MS) {
      recentMap.delete(key);
    }
  }

  const norm = normalizeForDedup(text);
  if (!norm || norm.length < 2) return true;

  if (recentMap.has(norm)) {
    return true;
  }

  recentMap.set(norm, now);
  return false;
}

function createFilteredCommentItem(
  author: string,
  rawText: string,
  platform: 'youtube' | 'twitch' | 'kick',
  recentMap: Map<string, number>,
  customId?: string,
  twitchEmotesTag?: string
): StreamCommentItem | null {
  const cleaned = sanitizeAndFilterChatText(rawText, twitchEmotesTag);
  if (!cleaned) return null;

  if (isDuplicateInRecentWindow(cleaned, recentMap)) {
    return null;
  }

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
    recentNormalizedMap: new Map<string, number>(),
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

  // 1. TWITCH LIVE CHAT LISTENER (Collects filtered unique messages, keeps IRC alive, and emits every 3 seconds)
  if (state.platform === 'twitch') {
    const channel = state.targetId.toLowerCase().replace(/[^a-z0-9_]/g, '');
    let incomingChunk: StreamCommentItem[] = [];
    let sentFirstImmediateBatch = false;
    let pingTimer: NodeJS.Timeout | null = null;
    let reconnectTimer: NodeJS.Timeout | null = null;

    const prevCleanup = handle.cleanup;
    handle.cleanup = () => {
      prevCleanup();
      if (pingTimer) {
        clearInterval(pingTimer);
        pingTimer = null;
      }
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }
    };

    const connectTwitchIrc = () => {
      if (closed) return;
      try {
        const ws = new WebSocket('wss://irc-ws.chat.twitch.tv:443');
        handle.ws = ws;

        ws.addEventListener('open', () => {
          if (closed) {
            try {
              ws.close();
            } catch {}
            return;
          }
          ws.send('CAP REQ :twitch.tv/tags twitch.tv/commands');
          ws.send('PASS SCHMOOPIIE');
          ws.send(`NICK justinfan${Math.floor(10000 + Math.random() * 89999)}`);
          ws.send(`JOIN #${channel}`);

          if (pingTimer) clearInterval(pingTimer);
          pingTimer = setInterval(() => {
            if (!closed && ws.readyState === WebSocket.OPEN) {
              try {
                ws.send('PING :tmi.twitch.tv');
              } catch {}
            }
          }, 45000);
        });

        ws.addEventListener('message', (event) => {
          if (closed) return;
          const raw = typeof event.data === 'string' ? event.data : String(event.data || '');
          const lines = raw.split('\r\n');

          for (const line of lines) {
            if (!line) continue;
            if (line.startsWith('PING')) {
              try {
                ws.send('PONG :tmi.twitch.tv');
              } catch {}
              continue;
            }

            const privIdx = line.indexOf('PRIVMSG #');
            if (privIdx !== -1) {
              const msgIdx = line.indexOf(' :', privIdx);
              if (msgIdx !== -1) {
                const text = line.slice(msgIdx + 2).trim();
                const displayMatch = line.match(/(?:^|;)display-name=([^;]*)/);
                const nickMatch = line.match(/:([a-zA-Z0-9_]+)![a-zA-Z0-9_]+@/);
                const idMatch = line.match(/(?:^|;)id=([^;]+)/);
                const emotesMatch = line.match(/(?:^|;)emotes=([^;]*)/);
                const author =
                  (displayMatch && displayMatch[1] ? displayMatch[1] : '') ||
                  (nickMatch && nickMatch[1] ? nickMatch[1] : '') ||
                  'chat';

                const item = createFilteredCommentItem(
                  author,
                  text,
                  'twitch',
                  handle.recentNormalizedMap,
                  idMatch?.[1],
                  emotesMatch?.[1]
                );

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

        const scheduleReconnect = () => {
          if (pingTimer) {
            clearInterval(pingTimer);
            pingTimer = null;
          }
          if (closed || reconnectTimer) return;
          reconnectTimer = setTimeout(() => {
            reconnectTimer = null;
            connectTwitchIrc();
          }, 3500);
        };

        ws.addEventListener('close', scheduleReconnect);
        ws.addEventListener('error', () => {
          try {
            ws.close();
          } catch {}
          scheduleReconnect();
        });
      } catch {}
    };

    connectTwitchIrc();

    // Every 3 seconds, flush the new chunk of unique filtered messages that arrived during that 3s window
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
        let currentContinuation = sourceInfo.liveContinuation;
        let isFirstPoll = true;
        let consecutiveFailures = 0;

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
                  continuation: currentContinuation,
                }),
              }
            );
            if (!chatRes.ok || closed) {
              consecutiveFailures++;
              if (consecutiveFailures >= 4 && !closed) {
                const refreshed = await initYouTubeSource(resolvedVideoId);
                if (refreshed.liveContinuation) {
                  currentContinuation = refreshed.liveContinuation;
                  consecutiveFailures = 0;
                }
              }
              return;
            }
            consecutiveFailures = 0;
            const data = (await chatRes.json()) as any;
            const liveCont = data?.continuationContents?.liveChatContinuation;
            const actions: any[] = liveCont?.actions || [];
            const continuations: any[] = liveCont?.continuations || [];
            const firstCont = continuations[0];
            const nextToken =
              firstCont?.invalidationContinuationData?.continuation ||
              firstCont?.timedContinuationData?.continuation ||
              firstCont?.liveChatReplayContinuationData?.continuation ||
              firstCont?.reloadContinuationData?.continuation;
            if (typeof nextToken === 'string' && nextToken.length > 0) {
              currentContinuation = nextToken;
            }

            const freshChunk: StreamCommentItem[] = [];
            for (const act of actions) {
              const renderer = act?.addChatItemAction?.item?.liveChatTextMessageRenderer;
              if (!renderer || !renderer.id) continue;
              if (seenIds.has(renderer.id)) continue;
              seenIds.add(renderer.id);

              const author = renderer.authorName?.simpleText || 'chat';
              const runs: any[] = renderer.message?.runs || [];
              // Ignore custom emoji runs (r.emoji) and only concatenate plain text runs
              const text = runs
                .filter((r) => !r.emoji)
                .map((r) => r.text || '')
                .join('')
                .trim();

              const item = createFilteredCommentItem(
                author,
                text,
                'youtube',
                handle.recentNormalizedMap,
                renderer.id
              );
              if (item) {
                freshChunk.push(item);
              }
            }

            if (seenIds.size > 600) {
              const arr = Array.from(seenIds).slice(-300);
              seenIds.clear();
              arr.forEach((id) => seenIds.add(id));
            }

            if (freshChunk.length > 0) {
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

      // 2B. Regular YouTube Video (VOD) — delivers unseen filtered comments in chunks of 5 every 3s
      const vodList = sourceInfo.vodComments || [];
      let cursor = 0;

      const emitNextVodChunk = () => {
        if (closed || cursor >= vodList.length) return;
        const items: StreamCommentItem[] = [];
        while (cursor < vodList.length && items.length < 5) {
          const c = vodList[cursor++];
          const item = createFilteredCommentItem(
            c.author,
            c.text,
            'youtube',
            handle.recentNormalizedMap
          );
          if (item) items.push(item);
        }
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
