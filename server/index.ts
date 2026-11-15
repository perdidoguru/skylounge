import express from 'express';
import { createServer } from 'http';
import { Server, Socket } from 'socket.io';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import {
  AnimationState,
  AvatarCustomization,
  ChatMessage,
  CommentListenerState,
  PlayerState,
  RoomStatePayload,
  RoomSummary,
  TVMediaState,
} from '../shared/types.js';
import { SEAT_MAP } from '../shared/seats.js';
import {
  DEFAULT_COMMENT_LISTENER_STATE,
  DEFAULT_TV_STATE,
  parseCommentSourceUrl,
  parseMediaUrl,
} from '../shared/mediaParser.js';
import {
  startOrUpdateRoomCommentListener,
  stopRoomCommentListener,
} from './commentListener.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3001;

interface InternalRoom {
  id: string;
  name: string;
  hostId: string;
  isPublic: boolean;
  maxPlayers: number;
  players: Map<string, PlayerState>;
  seats: Map<string, string>; // seatId -> playerId
  tvState: TVMediaState;
  commentListener: CommentListenerState;
  messages: ChatMessage[];
  createdAt: number;
  emptySince: number | null;
}

const rooms = new Map<string, InternalRoom>();

// Rate limit trackers per socket
const lastMovePacketTime = new Map<string, number>();
const lastChatPacketTime = new Map<string, number>();

function createDefaultRoom(): InternalRoom {
  const mainRoom: InternalRoom = {
    id: 'SKY-MAIN',
    name: 'SkyLounge — Cobertura Panorâmica Principal',
    hostId: '',
    isPublic: true,
    maxPlayers: 16,
    players: new Map(),
    seats: new Map(),
    tvState: { ...DEFAULT_TV_STATE, updatedAt: Date.now() },
    commentListener: { ...DEFAULT_COMMENT_LISTENER_STATE, recentComments: [] },
    messages: [
      {
        id: 'sys-welcome',
        senderId: 'system',
        senderName: 'SkyLounge',
        senderColor: '#e5a95c',
        text: 'Bem-vindo ao SkyLounge! Segure o Botão Direito do Mouse para girar a câmera, use WASD para caminhar, E para sentar nos sofás e interaja com a TV Gigante.',
        timestamp: Date.now(),
        isSystem: true,
      },
    ],
    createdAt: Date.now(),
    emptySince: null,
  };
  rooms.set(mainRoom.id, mainRoom);
  return mainRoom;
}

createDefaultRoom();

function clamp(val: number, min: number, max: number): number {
  if (typeof val !== 'number' || Number.isNaN(val) || !Number.isFinite(val)) return 0;
  return Math.max(min, Math.min(max, val));
}

function sanitizeText(input: unknown, maxLen = 180): string {
  if (typeof input !== 'string') return '';
  return input.replace(/[\u0000-\u001F\u007F]/g, '').trim().slice(0, maxLen);
}

function sanitizeCustomization(raw: Partial<AvatarCustomization> | undefined): AvatarCustomization {
  const validBodies = ['masculine', 'masculine_heavy', 'feminine'] as const;
  const validOutfits = [
    'jacket',
    'hoodie',
    'blazer',
    'vest',
    'dress',
    'skirt_set',
    'offshoulder',
    'jumpsuit',
  ] as const;
  const validHairs = [
    'spiky',
    'bob',
    'curly',
    'ponytail',
    'waves',
    'long_waves',
    'long_straight',
    'twintails',
    'high_bun',
  ] as const;
  const validAccessories = [
    'none',
    'glasses',
    'headphones',
    'crown',
    'beanie',
    'tiara',
    'earrings',
    'bow',
  ] as const;

  const name = sanitizeText(raw?.name, 22) || 'Convidado';
  const bodyStyle = validBodies.includes(raw?.bodyStyle as any) ? raw!.bodyStyle! : 'masculine';
  const skinColor = /^#[0-9a-fA-F]{6}$/.test(raw?.skinColor || '') ? raw!.skinColor! : '#f1c29d';
  const primaryColor = /^#[0-9a-fA-F]{6}$/.test(raw?.primaryColor || '') ? raw!.primaryColor! : '#3b82f6';
  const secondaryColor = /^#[0-9a-fA-F]{6}$/.test(raw?.secondaryColor || '') ? raw!.secondaryColor! : '#1e293b';
  const hairColor = /^#[0-9a-fA-F]{6}$/.test(raw?.hairColor || '') ? raw!.hairColor! : '#271c19';

  const outfitStyle = validOutfits.includes(raw?.outfitStyle as any) ? raw!.outfitStyle! : 'jacket';
  const hairStyle = validHairs.includes(raw?.hairStyle as any) ? raw!.hairStyle! : 'spiky';
  const accessory = validAccessories.includes(raw?.accessory as any) ? raw!.accessory! : 'none';

  return {
    name,
    bodyStyle,
    skinColor,
    outfitStyle,
    primaryColor,
    secondaryColor,
    hairStyle,
    hairColor,
    accessory,
  };
}

function computeEffectiveTVState(tv: TVMediaState): TVMediaState {
  const isTimeSynced =
    tv.platform === 'youtube' ||
    tv.platform === 'youtube_live' ||
    (tv.platform === 'twitch' && Boolean(tv.videoId));
  if (!tv.isPlaying || !tv.syncEnabled || !isTimeSynced || tv.playbackTime <= 0) {
    return tv;
  }
  const elapsedSeconds = Math.max(0, (Date.now() - tv.updatedAt) / 1000);
  return {
    ...tv,
    playbackTime: tv.playbackTime + elapsedSeconds,
    updatedAt: Date.now(),
  };
}

function serializeRoom(room: InternalRoom): RoomStatePayload {
  const players: Record<string, PlayerState> = {};
  for (const [id, p] of room.players.entries()) {
    players[id] = p;
  }
  const seats: Record<string, string> = {};
  for (const [seatId, playerId] of room.seats.entries()) {
    seats[seatId] = playerId;
  }
  return {
    roomId: room.id,
    roomName: room.name,
    hostId: room.hostId,
    isPublic: room.isPublic,
    players,
    seats,
    tvState: computeEffectiveTVState(room.tvState),
    commentListener: room.commentListener,
    messages: room.messages.slice(-50),
  };
}

function getPublicRoomSummaries(): RoomSummary[] {
  const list: RoomSummary[] = [];
  for (const room of rooms.values()) {
    if (!room.isPublic && room.id !== 'SKY-MAIN') continue;
    const hostPlayer = room.players.get(room.hostId);
    list.push({
      id: room.id,
      name: room.name,
      hostName: hostPlayer?.name || (room.id === 'SKY-MAIN' ? 'SkyLounge Oficial' : 'Anfitrião'),
      playerCount: room.players.size,
      maxPlayers: room.maxPlayers,
      isPublic: room.isPublic,
      currentMediaTitle: room.tvState.title,
      platform: room.tvState.platform,
    });
  }
  return list;
}

function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = 'SKY-';
  for (let i = 0; i < 4; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return rooms.has(code) ? generateRoomCode() : code;
}

function addSystemMessage(io: Server, room: InternalRoom, text: string) {
  const msg: ChatMessage = {
    id: `sys-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    senderId: 'system',
    senderName: 'Sistema',
    senderColor: '#e5a95c',
    text,
    timestamp: Date.now(),
    isSystem: true,
  };
  room.messages.push(msg);
  if (room.messages.length > 80) {
    room.messages.shift();
  }
  io.to(room.id).emit('chat:message', msg);
}

const app = express();
app.use(cors());
app.use(express.json());

// API Routes
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'skylounge-3d-multiplayer',
    rooms: rooms.size,
    timestamp: new Date().toISOString(),
  });
});

app.get('/api/rooms', (_req, res) => {
  res.json({ rooms: getPublicRoomSummaries() });
});

// Serve static frontend in production
const possibleClientPaths = [
  path.resolve(__dirname, '../../client'),
  path.resolve(__dirname, '../client'),
  path.resolve(process.cwd(), 'dist/client'),
];

const clientDistPath = possibleClientPaths.find((p) => fs.existsSync(path.join(p, 'index.html')));

if (clientDistPath) {
  app.use(express.static(clientDistPath));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/socket.io')) {
      return next();
    }
    res.sendFile(path.join(clientDistPath, 'index.html'));
  });
}

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
  pingInterval: 10000,
  pingTimeout: 8000,
});

function removePlayerFromCurrentRoom(socket: Socket, reason = 'saiu da sala') {
  const currentRoomId = socket.data.roomId as string | undefined;
  if (!currentRoomId) return;

  const room = rooms.get(currentRoomId);
  socket.leave(currentRoomId);
  socket.data.roomId = undefined;

  if (!room) return;

  const player = room.players.get(socket.id);
  if (!player) return;

  // Release any occupied seat
  if (player.seatId && room.seats.get(player.seatId) === socket.id) {
    room.seats.delete(player.seatId);
    io.to(room.id).emit('seat:updated', {
      seatId: player.seatId,
      playerId: null,
    });
  }

  room.players.delete(socket.id);
  io.to(room.id).emit('player:left', { playerId: socket.id });
  addSystemMessage(io, room, `${player.name} ${reason}.`);

  // Host transfer if host left and players remain
  if (room.hostId === socket.id) {
    const remainingPlayers = Array.from(room.players.values()).sort((a, b) => a.joinedAt - b.joinedAt);
    if (remainingPlayers.length > 0) {
      const nextHost = remainingPlayers[0];
      room.hostId = nextHost.id;
      nextHost.isHost = true;
      io.to(room.id).emit('room:hostChanged', {
        hostId: nextHost.id,
        hostName: nextHost.name,
      });
      addSystemMessage(io, room, `${nextHost.name} agora é o anfitrião da sala.`);
    } else {
      room.hostId = '';
      room.emptySince = Date.now();
    }
  } else if (room.players.size === 0) {
    room.emptySince = Date.now();
  }

  io.emit('rooms:list', getPublicRoomSummaries());
}

io.on('connection', (socket: Socket) => {
  // Send initial public rooms list
  socket.emit('rooms:list', getPublicRoomSummaries());

  socket.on('rooms:fetch', () => {
    socket.emit('rooms:list', getPublicRoomSummaries());
  });

  // Create or Join Room
  socket.on(
    'room:join',
    (
      payload: {
        roomId?: string;
        roomName?: string;
        createNew?: boolean;
        isPublic?: boolean;
        customization?: Partial<AvatarCustomization>;
      },
      callback?: (res: { ok: boolean; error?: string; state?: RoomStatePayload }) => void
    ) => {
      try {
        removePlayerFromCurrentRoom(socket, 'trocou de sala');

        const customization = sanitizeCustomization(payload?.customization);
        let targetRoomId = sanitizeText(payload?.roomId, 16).toUpperCase();

        let room: InternalRoom | undefined;

        if (payload?.createNew) {
          const code = targetRoomId && !rooms.has(targetRoomId) ? targetRoomId : generateRoomCode();
          const roomName = sanitizeText(payload?.roomName, 42) || `Lounge de ${customization.name}`;
          room = {
            id: code,
            name: roomName,
            hostId: socket.id,
            isPublic: payload?.isPublic !== false,
            maxPlayers: 16,
            players: new Map(),
            seats: new Map(),
            tvState: {
              ...DEFAULT_TV_STATE,
              updatedAt: Date.now(),
              updatedBy: customization.name,
            },
            commentListener: { ...DEFAULT_COMMENT_LISTENER_STATE, recentComments: [] },
            messages: [
              {
                id: `sys-${Date.now()}`,
                senderId: 'system',
                senderName: 'SkyLounge',
                senderColor: '#e5a95c',
                text: `Sala "${roomName}" (${code}) criada por ${customization.name}. Compartilhe o código ou link de convite!`,
                timestamp: Date.now(),
                isSystem: true,
              },
            ],
            createdAt: Date.now(),
            emptySince: null,
          };
          rooms.set(code, room);
        } else {
          if (!targetRoomId) targetRoomId = 'SKY-MAIN';
          room = rooms.get(targetRoomId);

          // If user entered a custom room code via invite link that isn't created yet, create it seamlessly
          if (!room) {
            room = {
              id: targetRoomId,
              name: targetRoomId === 'SKY-MAIN' ? 'SkyLounge — Cobertura Panorâmica Principal' : `Sala ${targetRoomId}`,
              hostId: socket.id,
              isPublic: true,
              maxPlayers: 16,
              players: new Map(),
              seats: new Map(),
              tvState: { ...DEFAULT_TV_STATE, updatedAt: Date.now() },
              commentListener: { ...DEFAULT_COMMENT_LISTENER_STATE, recentComments: [] },
              messages: [],
              createdAt: Date.now(),
              emptySince: null,
            };
            rooms.set(targetRoomId, room);
          }
        }

        if (room.players.size >= room.maxPlayers) {
          callback?.({ ok: false, error: 'Esta sala atingiu o limite máximo de participantes (16).' });
          return;
        }

        // Assign host if room currently has no active host
        if (!room.hostId || !room.players.has(room.hostId)) {
          room.hostId = socket.id;
        }

        const wasEmpty = room.players.size === 0;
        room.emptySince = null;
        if (wasEmpty && room.commentListener.active) {
          startOrUpdateRoomCommentListener(io, room.id, room.commentListener);
        }

        // Calculate a pleasant spawn position in the South Entrance Gallery looking North toward the TV & Skyline
        const spawnIndex = room.players.size;
        const spawnAngle = (spawnIndex % 6) * 0.55 - 1.4;
        const spawnX = clamp(Math.sin(spawnAngle) * 2.8, -5, 5);
        const spawnZ = clamp(6.2 + Math.floor(spawnIndex / 6) * 1.4, 4.5, 9.0);

        const newPlayer: PlayerState = {
          id: socket.id,
          name: customization.name,
          customization,
          position: [spawnX, 0, spawnZ],
          rotationY: Math.PI, // Facing North (-Z) toward the Cinema TV & Skyline
          headYaw: 0,
          headPitch: 0,
          animation: 'idle',
          seatId: null,
          isHost: room.hostId === socket.id,
          joinedAt: Date.now(),
        };

        room.players.set(socket.id, newPlayer);
        socket.join(room.id);
        socket.data.roomId = room.id;

        const roomState = serializeRoom(room);
        socket.emit('room:joined', roomState);
        socket.to(room.id).emit('player:joined', newPlayer);
        addSystemMessage(io, room, `${newPlayer.name} entrou no lounge.`);
        io.emit('rooms:list', getPublicRoomSummaries());

        callback?.({ ok: true, state: roomState });
      } catch (err) {
        console.error('Error in room:join:', err);
        callback?.({ ok: false, error: 'Erro interno ao entrar na sala.' });
      }
    }
  );

  // Player Movement & Animation State Update
  socket.on(
    'player:move',
    (payload: {
      position?: [number, number, number];
      rotationY?: number;
      headYaw?: number;
      headPitch?: number;
      animation?: AnimationState;
    }) => {
      const now = Date.now();
      const last = lastMovePacketTime.get(socket.id) || 0;
      if (now - last < 22) return; // Cap at ~45 packets/sec
      lastMovePacketTime.set(socket.id, now);

      const roomId = socket.data.roomId as string | undefined;
      if (!roomId) return;
      const room = rooms.get(roomId);
      if (!room) return;
      const player = room.players.get(socket.id);
      if (!player) return;

      // If player is seated, keep exact seat position unless they stand up
      if (!player.seatId && Array.isArray(payload?.position) && payload.position.length === 3) {
        player.position = [
          clamp(payload.position[0], -15.6, 15.6),
          clamp(payload.position[1], 0, 4.0),
          clamp(payload.position[2], -11.2, 11.2),
        ];
      }

      if (typeof payload?.rotationY === 'number' && !player.seatId) {
        player.rotationY = clamp(payload.rotationY, -Math.PI * 4, Math.PI * 4);
      }

      if (typeof payload?.headYaw === 'number') {
        player.headYaw = clamp(payload.headYaw, -1.2, 1.2);
      }
      if (typeof payload?.headPitch === 'number') {
        player.headPitch = clamp(payload.headPitch, -0.8, 0.8);
      }

      const validAnims: AnimationState[] = [
        'idle',
        'walk',
        'run',
        'jump',
        'sit',
        'wave',
        'dance',
        'cheer',
        'laugh',
      ];
      if (payload?.animation && validAnims.includes(payload.animation)) {
        player.animation = player.seatId ? 'sit' : payload.animation;
      }

      socket.to(room.id).emit('player:moved', {
        id: socket.id,
        position: player.position,
        rotationY: player.rotationY,
        headYaw: player.headYaw,
        headPitch: player.headPitch,
        animation: player.animation,
      });
    }
  );

  // Live Avatar Customization Update
  socket.on('player:customize', (rawCust: Partial<AvatarCustomization>) => {
    const roomId = socket.data.roomId as string | undefined;
    if (!roomId) return;
    const room = rooms.get(roomId);
    if (!room) return;
    const player = room.players.get(socket.id);
    if (!player) return;

    const updated = sanitizeCustomization(rawCust);
    player.customization = updated;
    player.name = updated.name;

    io.to(room.id).emit('player:customized', {
      id: socket.id,
      name: player.name,
      customization: player.customization,
    });
  });

  // Trigger Emote
  socket.on('player:emote', (emote: AnimationState) => {
    const roomId = socket.data.roomId as string | undefined;
    if (!roomId) return;
    const room = rooms.get(roomId);
    if (!room) return;
    const player = room.players.get(socket.id);
    if (!player) return;

    const allowedEmotes: AnimationState[] = ['wave', 'dance', 'cheer', 'laugh'];
    if (!allowedEmotes.includes(emote)) return;

    // If seated, stand up first to dance/cheer or allow wave
    if (player.seatId && emote !== 'wave') {
      if (room.seats.get(player.seatId) === socket.id) {
        room.seats.delete(player.seatId);
        io.to(room.id).emit('seat:updated', { seatId: player.seatId, playerId: null });
      }
      player.seatId = null;
    }

    player.animation = emote;
    io.to(room.id).emit('player:emoted', {
      id: socket.id,
      animation: emote,
      seatId: player.seatId,
    });
  });

  // Sit on a Seat
  socket.on(
    'seat:sit',
    (
      payload: { seatId: string },
      callback?: (res: { ok: boolean; error?: string; seatId?: string }) => void
    ) => {
      const roomId = socket.data.roomId as string | undefined;
      if (!roomId) return;
      const room = rooms.get(roomId);
      if (!room) return;
      const player = room.players.get(socket.id);
      if (!player) return;

      const seatDef = SEAT_MAP[payload?.seatId];
      if (!seatDef) {
        callback?.({ ok: false, error: 'Assento inválido.' });
        return;
      }

      const currentOccupant = room.seats.get(seatDef.id);
      if (currentOccupant && currentOccupant !== socket.id) {
        // Verify occupant is still in the room
        if (room.players.has(currentOccupant)) {
          callback?.({ ok: false, error: 'Este lugar já está ocupado por outro jogador.' });
          return;
        }
      }

      // Free previous seat if player was sitting elsewhere
      if (player.seatId && player.seatId !== seatDef.id) {
        room.seats.delete(player.seatId);
        io.to(room.id).emit('seat:updated', {
          seatId: player.seatId,
          playerId: null,
        });
      }

      room.seats.set(seatDef.id, socket.id);
      player.seatId = seatDef.id;
      player.position = [...seatDef.position];
      player.rotationY = seatDef.rotationY;
      player.animation = 'sit';

      io.to(room.id).emit('seat:updated', {
        seatId: seatDef.id,
        playerId: socket.id,
        position: player.position,
        rotationY: player.rotationY,
      });

      callback?.({ ok: true, seatId: seatDef.id });
    }
  );

  // Stand Up from Seat
  socket.on('seat:stand', (payload?: { exitPosition?: [number, number, number] }) => {
    const roomId = socket.data.roomId as string | undefined;
    if (!roomId) return;
    const room = rooms.get(roomId);
    if (!room) return;
    const player = room.players.get(socket.id);
    if (!player || !player.seatId) return;

    const oldSeatId = player.seatId;
    const seatDef = SEAT_MAP[oldSeatId];
    if (room.seats.get(oldSeatId) === socket.id) {
      room.seats.delete(oldSeatId);
    }

    player.seatId = null;
    player.animation = 'idle';

    if (Array.isArray(payload?.exitPosition) && payload.exitPosition.length === 3) {
      player.position = [
        clamp(payload.exitPosition[0], -15.5, 15.5),
        clamp(payload.exitPosition[1], 0, 4.0),
        clamp(payload.exitPosition[2], -11.0, 11.0),
      ];
    } else if (seatDef) {
      // Step slightly forward in the direction the seat was facing
      const stepX = seatDef.position[0] + Math.sin(seatDef.rotationY) * 0.75;
      const stepZ = seatDef.position[2] + Math.cos(seatDef.rotationY) * 0.75;
      const floorY = seatDef.zone === 'bar' ? 1.2 : 0;
      player.position = [stepX, floorY, stepZ];
    }

    io.to(room.id).emit('seat:updated', {
      seatId: oldSeatId,
      playerId: null,
      exitingPlayerId: socket.id,
      position: player.position,
    });
  });

  // Cinema TV: Change Media Source
  socket.on(
    'tv:setMedia',
    (
      payload: { url: string; title?: string; forceLive?: boolean; syncEnabled?: boolean },
      callback?: (res: { ok: boolean; error?: string; tvState?: TVMediaState }) => void
    ) => {
      const roomId = socket.data.roomId as string | undefined;
      if (!roomId) return;
      const room = rooms.get(roomId);
      if (!room) return;
      const player = room.players.get(socket.id);
      if (!player) return;

      const isHost = room.hostId === socket.id;
      if (!isHost && !room.tvState.allowGuestsControl) {
        callback?.({
          ok: false,
          error: 'Apenas o anfitrião da sala tem permissão para trocar o vídeo no momento.',
        });
        return;
      }

      const parsed = parseMediaUrl(payload?.url || '', payload?.forceLive);
      if (!parsed.valid) {
        callback?.({ ok: false, error: parsed.error || 'URL inválida.' });
        return;
      }

      const customTitle = sanitizeText(payload?.title, 80);
      const nextSeq = (room.tvState.seq || 1) + 1;

      room.tvState = {
        url: parsed.url,
        platform: parsed.platform,
        videoId: parsed.videoId,
        channel: parsed.channel,
        title: customTitle || parsed.title,
        isPlaying: true,
        isLive: parsed.isLive,
        syncEnabled: payload?.syncEnabled !== undefined ? Boolean(payload.syncEnabled) : true,
        playbackTime: 0,
        updatedAt: Date.now(),
        updatedBy: player.name,
        allowGuestsControl: room.tvState.allowGuestsControl,
        seq: nextSeq,
      };

      io.to(room.id).emit('tv:updated', room.tvState);

      // Automatically connect the comment listener to the new TV media if supported
      if (parsed.platform !== 'ambient') {
        const commentParsed = parseCommentSourceUrl(parsed.url);
        if (commentParsed.valid) {
          room.commentListener = {
            ...room.commentListener,
            url: commentParsed.url,
            platform: commentParsed.platform,
            targetId: commentParsed.targetId,
            label: commentParsed.label,
            active: true,
            recentComments: [],
          };
          startOrUpdateRoomCommentListener(io, room.id, room.commentListener);
        }
      }

      addSystemMessage(io, room, `${player.name} colocou na TV: ${room.tvState.title}`);
      io.emit('rooms:list', getPublicRoomSummaries());
      callback?.({ ok: true, tvState: room.tvState });
    }
  );

  // Authoritative Host Playback Heartbeat (Syncs all guests to the Host without looping back to Host)
  socket.on(
    'tv:hostSync',
    (payload: { playbackTime: number; isPlaying: boolean; isLive?: boolean }) => {
      const roomId = socket.data.roomId as string | undefined;
      if (!roomId) return;
      const room = rooms.get(roomId);
      if (!room) return;

      // Only accept authoritative time beacon from the room Host
      if (room.hostId !== socket.id) return;

      if (typeof payload?.playbackTime === 'number' && Number.isFinite(payload.playbackTime) && payload.playbackTime >= 0) {
        room.tvState.playbackTime = payload.playbackTime;
        room.tvState.updatedAt = Date.now();
      }
      if (typeof payload?.isPlaying === 'boolean') {
        room.tvState.isPlaying = payload.isPlaying;
      }
      if (typeof payload?.isLive === 'boolean') {
        room.tvState.isLive = payload.isLive;
        if (payload.isLive && room.tvState.platform === 'youtube') {
          room.tvState.platform = 'youtube_live';
        }
      }

      // Broadcast lightweight sync pulse ONLY to non-host guests so Host NEVER stutters!
      if (room.tvState.syncEnabled) {
        socket.to(room.id).emit('tv:syncPulse', {
          playbackTime: room.tvState.playbackTime,
          isPlaying: room.tvState.isPlaying,
          isLive: room.tvState.isLive,
          syncEnabled: room.tvState.syncEnabled,
          updatedAt: room.tvState.updatedAt,
          hostId: room.hostId,
        });
      }
    }
  );

  // Cinema TV: Play / Pause / Seek / Force Sync / Toggle Sync / Toggle Guest Permission
  socket.on(
    'tv:control',
    (payload: {
      action: 'play' | 'pause' | 'seek' | 'forceSync' | 'toggleSync' | 'toggleGuests';
      playbackTime?: number;
      syncEnabled?: boolean;
      allowGuestsControl?: boolean;
    }) => {
      const roomId = socket.data.roomId as string | undefined;
      if (!roomId) return;
      const room = rooms.get(roomId);
      if (!room) return;
      const player = room.players.get(socket.id);
      if (!player) return;

      const isHost = room.hostId === socket.id;
      if (!isHost && !room.tvState.allowGuestsControl) return;

      const currentEffective = computeEffectiveTVState(room.tvState);
      const nextSeq = (room.tvState.seq || 1) + 1;

      if (payload.action === 'play') {
        room.tvState = {
          ...currentEffective,
          isPlaying: true,
          playbackTime:
            typeof payload.playbackTime === 'number' && payload.playbackTime >= 0
              ? payload.playbackTime
              : currentEffective.playbackTime,
          updatedAt: Date.now(),
          updatedBy: player.name,
          seq: nextSeq,
        };
      } else if (payload.action === 'pause') {
        room.tvState = {
          ...currentEffective,
          isPlaying: false,
          playbackTime:
            typeof payload.playbackTime === 'number' && payload.playbackTime >= 0
              ? payload.playbackTime
              : currentEffective.playbackTime,
          updatedAt: Date.now(),
          updatedBy: player.name,
          seq: nextSeq,
        };
      } else if (payload.action === 'seek' && typeof payload.playbackTime === 'number') {
        room.tvState = {
          ...currentEffective,
          playbackTime: Math.max(0, payload.playbackTime),
          updatedAt: Date.now(),
          updatedBy: player.name,
          seq: nextSeq,
        };
      } else if (payload.action === 'forceSync') {
        room.tvState = {
          ...currentEffective,
          syncEnabled: true,
          playbackTime:
            typeof payload.playbackTime === 'number' && payload.playbackTime >= 0
              ? payload.playbackTime
              : currentEffective.playbackTime,
          updatedAt: Date.now(),
          updatedBy: player.name,
          seq: nextSeq,
        };
      } else if (payload.action === 'toggleSync') {
        const nextSync =
          typeof payload.syncEnabled === 'boolean'
            ? payload.syncEnabled
            : !currentEffective.syncEnabled;
        room.tvState = {
          ...currentEffective,
          syncEnabled: nextSync,
          playbackTime:
            typeof payload.playbackTime === 'number' && payload.playbackTime >= 0
              ? payload.playbackTime
              : currentEffective.playbackTime,
          updatedAt: Date.now(),
          updatedBy: player.name,
          seq: nextSeq,
        };
        addSystemMessage(
          io,
          room,
          nextSync
            ? `${player.name} ativou a Sincronização Live da TV entre todos os jogadores.`
            : `${player.name} desativou a sincronização automática da TV.`
        );
      } else if (payload.action === 'toggleGuests' && isHost) {
        room.tvState = {
          ...currentEffective,
          allowGuestsControl: Boolean(payload.allowGuestsControl),
          updatedAt: Date.now(),
          seq: nextSeq,
        };
        addSystemMessage(
          io,
          room,
          room.tvState.allowGuestsControl
            ? 'O anfitrião liberou o controle da TV para todos na sala.'
            : 'O controle da TV agora é exclusivo do anfitrião.'
        );
      }

      io.to(room.id).emit('tv:updated', room.tvState);
    }
  );

  // Comment Listener & Spectator NPCs (0 to 6 NPCs picking random words from active comments)
  socket.on(
    'comments:configure',
    (
      payload: {
        url?: string;
        npcCount?: number;
        active?: boolean;
      },
      callback?: (res: { ok: boolean; error?: string; state?: CommentListenerState }) => void
    ) => {
      const roomId = socket.data.roomId as string | undefined;
      if (!roomId) return;
      const room = rooms.get(roomId);
      if (!room) return;
      const player = room.players.get(socket.id);
      if (!player) return;

      const isHost = room.hostId === socket.id;
      if (!isHost && !room.tvState.allowGuestsControl) {
        callback?.({
          ok: false,
          error: 'Apenas o anfitrião pode configurar o ouvidor de comentários no momento.',
        });
        return;
      }

      let sourceChanged = false;
      if (typeof payload?.url === 'string' && payload.url.trim()) {
        const parsed = parseCommentSourceUrl(payload.url);
        if (!parsed.valid) {
          callback?.({ ok: false, error: parsed.error || 'Link inválido.' });
          return;
        }
        if (
          room.commentListener.url !== parsed.url ||
          room.commentListener.targetId !== parsed.targetId ||
          !room.commentListener.active
        ) {
          sourceChanged = true;
        }
        room.commentListener.url = parsed.url;
        room.commentListener.platform = parsed.platform;
        room.commentListener.targetId = parsed.targetId;
        room.commentListener.label = parsed.label;
        room.commentListener.active = true;
        room.commentListener.recentComments = [];
      }

      if (typeof payload?.npcCount === 'number' && Number.isFinite(payload.npcCount)) {
        room.commentListener.npcCount = Math.max(0, Math.min(6, Math.round(payload.npcCount)));
      }

      if (typeof payload?.active === 'boolean') {
        if (room.commentListener.active !== payload.active) {
          sourceChanged = true;
        }
        room.commentListener.active = payload.active;
      }

      if (sourceChanged) {
        startOrUpdateRoomCommentListener(io, room.id, room.commentListener);
      } else {
        io.to(room.id).emit('comments:updated', room.commentListener);
      }

      callback?.({ ok: true, state: room.commentListener });
    }
  );

  // Chat Message
  socket.on('chat:send', (payload: { text: string }) => {
    const now = Date.now();
    const last = lastChatPacketTime.get(socket.id) || 0;
    if (now - last < 350) return; // Rate limit chat
    lastChatPacketTime.set(socket.id, now);

    const roomId = socket.data.roomId as string | undefined;
    if (!roomId) return;
    const room = rooms.get(roomId);
    if (!room) return;
    const player = room.players.get(socket.id);
    if (!player) return;

    const text = sanitizeText(payload?.text, 200);
    if (!text) return;

    const chatMsg: ChatMessage = {
      id: `msg-${now}-${Math.random().toString(36).slice(2, 7)}`,
      senderId: socket.id,
      senderName: player.name,
      senderColor: player.customization.primaryColor,
      text,
      timestamp: now,
    };

    player.lastMessage = {
      text,
      timestamp: now,
    };

    room.messages.push(chatMsg);
    if (room.messages.length > 80) {
      room.messages.shift();
    }

    io.to(room.id).emit('chat:message', chatMsg);
  });

  // Host Action: Kick Participant
  socket.on('host:kick', (payload: { targetPlayerId: string }) => {
    const roomId = socket.data.roomId as string | undefined;
    if (!roomId) return;
    const room = rooms.get(roomId);
    if (!room || room.hostId !== socket.id) return;

    const targetId = payload?.targetPlayerId;
    if (!targetId || targetId === socket.id) return;
    const targetPlayer = room.players.get(targetId);
    if (!targetPlayer) return;

    const targetSocket = io.sockets.sockets.get(targetId);
    if (targetSocket) {
      targetSocket.emit('room:kicked', {
        roomId: room.id,
        reason: 'Você foi removido da sala pelo anfitrião.',
      });
      removePlayerFromCurrentRoom(targetSocket, 'foi removido pelo anfitrião');
    }
  });

  // Host Action: Transfer Host
  socket.on('host:transfer', (payload: { targetPlayerId: string }) => {
    const roomId = socket.data.roomId as string | undefined;
    if (!roomId) return;
    const room = rooms.get(roomId);
    if (!room || room.hostId !== socket.id) return;

    const currentHost = room.players.get(socket.id);
    const nextHost = room.players.get(payload?.targetPlayerId);
    if (!currentHost || !nextHost) return;

    currentHost.isHost = false;
    nextHost.isHost = true;
    room.hostId = nextHost.id;

    io.to(room.id).emit('room:hostChanged', {
      hostId: nextHost.id,
      hostName: nextHost.name,
    });
    addSystemMessage(io, room, `${currentHost.name} transferiu a liderança da sala para ${nextHost.name}.`);
  });

  socket.on('disconnect', () => {
    lastMovePacketTime.delete(socket.id);
    lastChatPacketTime.delete(socket.id);
    removePlayerFromCurrentRoom(socket, 'desconectou');
  });
});

// Periodic cleanup of empty user-created rooms (keep SKY-MAIN always alive)
setInterval(() => {
  const now = Date.now();
  let changed = false;
  for (const [id, room] of rooms.entries()) {
    if (id === 'SKY-MAIN') continue;
    if (room.players.size === 0 && room.emptySince && now - room.emptySince > 5 * 60 * 1000) {
      stopRoomCommentListener(id);
      rooms.delete(id);
      changed = true;
    }
  }
  if (changed) {
    io.emit('rooms:list', getPublicRoomSummaries());
  }
}, 60 * 1000);

httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`✨ SkyLounge Multiplayer Server running on http://0.0.0.0:${PORT}`);
});
