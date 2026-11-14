import { create } from 'zustand';
import { io, Socket } from 'socket.io-client';
import {
  AnimationState,
  AvatarCustomization,
  ChatMessage,
  CommentListenerState,
  GraphicsQuality,
  PlayerState,
  RoomStatePayload,
  RoomSummary,
  TVMediaState,
  TVSyncPulse,
} from '../../shared/types';
import { DEFAULT_COMMENT_LISTENER_STATE, DEFAULT_TV_STATE } from '../../shared/mediaParser';
import { soundFX } from '../utils/soundEffects';

const STORAGE_KEY_CUSTOMIZATION = 'skylounge_avatar_v1';
const STORAGE_KEY_SETTINGS = 'skylounge_settings_v1';

const DEFAULT_CUSTOMIZATION: AvatarCustomization = {
  name: `Viajante_${Math.floor(100 + Math.random() * 899)}`,
  skinColor: '#f1c29d',
  outfitStyle: 'jacket',
  primaryColor: '#e5a95c',
  secondaryColor: '#1e2436',
  hairStyle: 'spiky',
  hairColor: '#231815',
  accessory: 'glasses',
};

function loadInitialCustomization(): AvatarCustomization {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CUSTOMIZATION);
    if (raw) {
      return { ...DEFAULT_CUSTOMIZATION, ...JSON.parse(raw) };
    }
  } catch {}
  return DEFAULT_CUSTOMIZATION;
}

interface SettingsState {
  graphicsQuality: GraphicsQuality;
  mouseSensitivity: number;
  tvVolume: number;
  tvMuted: boolean;
  sfxEnabled: boolean;
}

function loadInitialSettings(): SettingsState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SETTINGS);
    if (raw) {
      return {
        graphicsQuality: 'high',
        mouseSensitivity: 1.0,
        tvVolume: 65,
        tvMuted: false,
        sfxEnabled: true,
        ...JSON.parse(raw),
      };
    }
  } catch {}
  return {
    graphicsQuality: 'high',
    mouseSensitivity: 1.0,
    tvVolume: 65,
    tvMuted: false,
    sfxEnabled: true,
  };
}

export interface ToastNotice {
  id: string;
  text: string;
  type: 'info' | 'success' | 'warning' | 'error';
}

// High-frequency mutable state for 60fps 3D loop (avoids React rerenders every frame)
export const localPlayerTransform = {
  position: [0, 0, 6.5] as [number, number, number],
  rotationY: Math.PI,
  headYaw: 0,
  headPitch: 0,
  animation: 'idle' as AnimationState,
  cameraYaw: 0,
  cameraPitch: 0.28,
  cameraDistance: 5.2,
  isPointerLocked: false,
  isRightMouseDown: false,
};

// Direct bridge to the active YT.Player instance for zero-stutter Host/Guest sync
export const tvPlayerBridge = {
  getCurrentTime: (): number => 0,
  getDuration: (): number => 0,
  syncToServerNow: (): void => {},
};

interface GameStore {
  // Connection & Room
  socket: Socket | null;
  connected: boolean;
  connecting: boolean;
  inGame: boolean;
  roomId: string;
  roomName: string;
  hostId: string;
  isPublicRoom: boolean;
  myPlayerId: string;
  publicRooms: RoomSummary[];

  // Entities
  players: Record<string, PlayerState>;
  seats: Record<string, string>; // seatId -> playerId
  tvState: TVMediaState;
  commentListener: CommentListenerState;
  messages: ChatMessage[];

  // Local Player State
  customization: AvatarCustomization;
  mySeatId: string | null;
  activeEmote: AnimationState | null;
  nearbySeatId: string | null;
  nearTV: boolean;

  // UI Modals & Panels
  activeModal: 'none' | 'tv' | 'participants' | 'settings' | 'help' | 'avatar';
  chatOpen: boolean;
  chatInputFocused: boolean;
  tvInteractiveMode: boolean; // When true, allows clicking inside embedded iframe directly
  tvEmbedError: string | null;
  tvAutoplayBlocked: boolean;
  toasts: ToastNotice[];

  // Settings
  settings: SettingsState;

  // Actions
  initSocket: () => void;
  joinRoom: (opts: {
    roomId?: string;
    roomName?: string;
    createNew?: boolean;
    isPublic?: boolean;
  }) => Promise<{ ok: boolean; error?: string }>;
  leaveRoom: () => void;
  updateCustomization: (partial: Partial<AvatarCustomization>) => void;
  sendMoveUpdate: (
    position: [number, number, number],
    rotationY: number,
    headYaw: number,
    headPitch: number,
    animation: AnimationState
  ) => void;
  triggerEmote: (emote: AnimationState) => void;
  clearActiveEmote: () => void;
  sitOnSeat: (seatId: string) => void;
  standUp: (exitPosition?: [number, number, number]) => void;
  setNearbySeatId: (seatId: string | null) => void;
  setNearTV: (near: boolean) => void;
  setTVMedia: (
    url: string,
    title?: string,
    forceLive?: boolean,
    syncEnabled?: boolean
  ) => Promise<{ ok: boolean; error?: string }>;
  sendTVControl: (
    action: 'play' | 'pause' | 'seek' | 'forceSync' | 'toggleSync' | 'toggleGuests',
    playbackTime?: number,
    allowGuestsControl?: boolean,
    syncEnabled?: boolean
  ) => void;
  sendHostSync: (playbackTime: number, isPlaying: boolean, isLive?: boolean) => void;
  configureCommentListener: (opts: {
    url?: string;
    npcCount?: number;
    active?: boolean;
  }) => Promise<{ ok: boolean; error?: string }>;
  sendChatMessage: (text: string) => void;
  kickPlayer: (targetPlayerId: string) => void;
  transferHost: (targetPlayerId: string) => void;
  setActiveModal: (modal: 'none' | 'tv' | 'participants' | 'settings' | 'help' | 'avatar') => void;
  setChatOpen: (open: boolean) => void;
  setChatInputFocused: (focused: boolean) => void;
  setTVInteractiveMode: (interactive: boolean) => void;
  setTVEmbedError: (err: string | null) => void;
  setTVAutoplayBlocked: (blocked: boolean) => void;
  updateSettings: (partial: Partial<SettingsState>) => void;
  addToast: (text: string, type?: ToastNotice['type']) => void;
  removeToast: (id: string) => void;
}

export const useGameStore = create<GameStore>((set, get) => ({
  socket: null,
  connected: false,
  connecting: false,
  inGame: false,
  roomId: 'SKY-MAIN',
  roomName: 'SkyLounge — Cobertura Panorâmica Principal',
  hostId: '',
  isPublicRoom: true,
  myPlayerId: '',
  publicRooms: [],

  players: {},
  seats: {},
  tvState: DEFAULT_TV_STATE,
  commentListener: DEFAULT_COMMENT_LISTENER_STATE,
  messages: [],

  customization: loadInitialCustomization(),
  mySeatId: null,
  activeEmote: null,
  nearbySeatId: null,
  nearTV: false,

  activeModal: 'none',
  chatOpen: false,
  chatInputFocused: false,
  tvInteractiveMode: false,
  tvEmbedError: null,
  tvAutoplayBlocked: false,
  toasts: [],

  settings: loadInitialSettings(),

  initSocket: () => {
    const existing = get().socket;
    if (existing) return;

    set({ connecting: true });
    const socket = io(window.location.origin, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 15,
      reconnectionDelay: 1000,
    });

    socket.on('connect', () => {
      set({
        connected: true,
        connecting: false,
        myPlayerId: socket.id || '',
      });

      // If we were already in a room before a temporary drop, rejoin automatically
      const state = get();
      if (state.inGame && state.roomId) {
        socket.emit('room:join', {
          roomId: state.roomId,
          customization: state.customization,
        });
        state.addToast('Reconectado ao servidor em tempo real.', 'success');
      }
    });

    socket.on('disconnect', () => {
      set({ connected: false });
      if (get().inGame) {
        get().addToast('Conexão instável — tentando reconectar...', 'warning');
      }
    });

    socket.on('rooms:list', (rooms: RoomSummary[]) => {
      set({ publicRooms: rooms });
    });

    socket.on('room:joined', (payload: RoomStatePayload) => {
      const myId = socket.id || '';
      const me = payload.players[myId];
      if (me) {
        localPlayerTransform.position = [...me.position];
        localPlayerTransform.rotationY = me.rotationY;
        localPlayerTransform.animation = me.animation;
      }

      set({
        inGame: true,
        roomId: payload.roomId,
        roomName: payload.roomName,
        hostId: payload.hostId,
        isPublicRoom: payload.isPublic,
        myPlayerId: myId,
        players: payload.players,
        seats: payload.seats,
        tvState: payload.tvState,
        commentListener: payload.commentListener || DEFAULT_COMMENT_LISTENER_STATE,
        messages: payload.messages,
        mySeatId: me?.seatId || null,
        tvEmbedError: null,
      });
    });

    socket.on('player:joined', (newPlayer: PlayerState) => {
      soundFX.playJoinLeave(true);
      set((state) => ({
        players: {
          ...state.players,
          [newPlayer.id]: newPlayer,
        },
      }));
    });

    socket.on('player:left', ({ playerId }: { playerId: string }) => {
      soundFX.playJoinLeave(false);
      set((state) => {
        const nextPlayers = { ...state.players };
        delete nextPlayers[playerId];
        return { players: nextPlayers };
      });
    });

    socket.on(
      'player:moved',
      (data: {
        id: string;
        position: [number, number, number];
        rotationY: number;
        headYaw: number;
        headPitch: number;
        animation: AnimationState;
      }) => {
        const currentPlayers = get().players;
        const target = currentPlayers[data.id];
        if (!target) return;

        // Mutate target object properties directly for 60fps remote interpolation
        // while keeping state reference fresh only when animation changes
        target.position = data.position;
        target.rotationY = data.rotationY;
        target.headYaw = data.headYaw;
        target.headPitch = data.headPitch;

        if (target.animation !== data.animation) {
          target.animation = data.animation;
          set((state) => ({
            players: {
              ...state.players,
              [data.id]: { ...target },
            },
          }));
        }
      }
    );

    socket.on(
      'player:customized',
      (data: { id: string; name: string; customization: AvatarCustomization }) => {
        set((state) => {
          const target = state.players[data.id];
          if (!target) return state;
          return {
            players: {
              ...state.players,
              [data.id]: {
                ...target,
                name: data.name,
                customization: data.customization,
              },
            },
          };
        });
      }
    );

    socket.on(
      'player:emoted',
      (data: { id: string; animation: AnimationState; seatId: string | null }) => {
        set((state) => {
          const target = state.players[data.id];
          if (!target) return state;
          return {
            mySeatId: data.id === state.myPlayerId ? data.seatId : state.mySeatId,
            players: {
              ...state.players,
              [data.id]: {
                ...target,
                animation: data.animation,
                seatId: data.seatId,
              },
            },
          };
        });
      }
    );

    socket.on(
      'seat:updated',
      (data: {
        seatId: string;
        playerId: string | null;
        exitingPlayerId?: string;
        position?: [number, number, number];
        rotationY?: number;
      }) => {
        set((state) => {
          const nextSeats = { ...state.seats };
          if (data.playerId) {
            nextSeats[data.seatId] = data.playerId;
          } else {
            delete nextSeats[data.seatId];
          }

          const nextPlayers = { ...state.players };
          if (data.playerId && nextPlayers[data.playerId]) {
            const p = { ...nextPlayers[data.playerId] };
            p.seatId = data.seatId;
            p.animation = 'sit';
            if (data.position) p.position = data.position;
            if (typeof data.rotationY === 'number') p.rotationY = data.rotationY;
            nextPlayers[data.playerId] = p;
          }

          if (data.exitingPlayerId && nextPlayers[data.exitingPlayerId]) {
            const p = { ...nextPlayers[data.exitingPlayerId] };
            p.seatId = null;
            p.animation = 'idle';
            if (data.position) p.position = data.position;
            nextPlayers[data.exitingPlayerId] = p;
          }

          let mySeatId = state.mySeatId;
          if (data.playerId === state.myPlayerId) {
            mySeatId = data.seatId;
          } else if (data.exitingPlayerId === state.myPlayerId || (!data.playerId && state.mySeatId === data.seatId)) {
            mySeatId = null;
          }

          return {
            seats: nextSeats,
            players: nextPlayers,
            mySeatId,
          };
        });
      }
    );

    socket.on('tv:updated', (tvState: TVMediaState) => {
      set({ tvState, tvEmbedError: null });
    });

    socket.on('comments:updated', (commentListener: CommentListenerState) => {
      set({ commentListener });
    });

    socket.on('tv:syncPulse', (pulse: TVSyncPulse) => {
      set((state) => ({
        tvState: {
          ...state.tvState,
          playbackTime: pulse.playbackTime,
          isPlaying: pulse.isPlaying,
          isLive: pulse.isLive,
          syncEnabled: pulse.syncEnabled,
          updatedAt: pulse.updatedAt,
        },
      }));
    });

    socket.on('chat:message', (msg: ChatMessage) => {
      if (!msg.isSystem) {
        soundFX.playChat();
      }
      set((state) => {
        const nextMessages = [...state.messages, msg].slice(-80);
        const nextPlayers = { ...state.players };
        if (msg.senderId && nextPlayers[msg.senderId]) {
          nextPlayers[msg.senderId] = {
            ...nextPlayers[msg.senderId],
            lastMessage: {
              text: msg.text,
              timestamp: msg.timestamp,
            },
          };
        }
        return {
          messages: nextMessages,
          players: nextPlayers,
        };
      });
    });

    socket.on('room:hostChanged', ({ hostId, hostName }: { hostId: string; hostName: string }) => {
      set((state) => {
        const nextPlayers = { ...state.players };
        Object.keys(nextPlayers).forEach((pid) => {
          nextPlayers[pid] = {
            ...nextPlayers[pid],
            isHost: pid === hostId,
          };
        });
        return {
          hostId,
          players: nextPlayers,
        };
      });
      if (hostId === get().myPlayerId) {
        get().addToast('Você agora é o Anfitrião da sala!', 'info');
      } else {
        get().addToast(`${hostName} é o novo anfitrião da sala.`, 'info');
      }
    });

    socket.on('room:kicked', ({ reason }: { reason: string }) => {
      set({
        inGame: false,
        mySeatId: null,
        activeModal: 'none',
      });
      get().addToast(reason || 'Você foi desconectado da sala.', 'error');
    });

    set({ socket });
  },

  joinRoom: (opts) => {
    return new Promise((resolve) => {
      let { socket } = get();
      if (!socket) {
        get().initSocket();
        socket = get().socket;
      }
      if (!socket) {
        resolve({ ok: false, error: 'Falha ao inicializar conexão.' });
        return;
      }

      socket.emit(
        'room:join',
        {
          ...opts,
          customization: get().customization,
        },
        (res: { ok: boolean; error?: string }) => {
          if (res?.ok) {
            // Update browser URL query param cleanly for easy sharing
            const roomId = get().roomId;
            if (roomId) {
              const url = new URL(window.location.href);
              url.searchParams.set('room', roomId);
              window.history.replaceState({}, '', url.toString());
            }
          }
          resolve(res || { ok: false, error: 'Sem resposta do servidor.' });
        }
      );
    });
  },

  leaveRoom: () => {
    const { socket } = get();
    if (socket) {
      socket.disconnect();
      set({
        socket: null,
        inGame: false,
        mySeatId: null,
        activeModal: 'none',
      });
      // Re-init fresh socket for lobby room list
      setTimeout(() => get().initSocket(), 150);
    } else {
      set({ inGame: false, mySeatId: null, activeModal: 'none' });
    }
  },

  updateCustomization: (partial) => {
    const next = { ...get().customization, ...partial };
    try {
      localStorage.setItem(STORAGE_KEY_CUSTOMIZATION, JSON.stringify(next));
    } catch {}

    set((state) => {
      const nextPlayers = { ...state.players };
      if (state.myPlayerId && nextPlayers[state.myPlayerId]) {
        nextPlayers[state.myPlayerId] = {
          ...nextPlayers[state.myPlayerId],
          name: next.name,
          customization: next,
        };
      }
      return {
        customization: next,
        players: nextPlayers,
      };
    });

    const { socket, inGame } = get();
    if (socket && inGame) {
      socket.emit('player:customize', next);
    }
  },

  sendMoveUpdate: (position, rotationY, headYaw, headPitch, animation) => {
    const { socket, inGame } = get();
    if (!socket || !inGame) return;
    socket.emit('player:move', {
      position,
      rotationY,
      headYaw,
      headPitch,
      animation,
    });
  },

  triggerEmote: (emote) => {
    soundFX.playClick();
    set({ activeEmote: emote });
    localPlayerTransform.animation = emote;

    const { socket, inGame, mySeatId } = get();
    if (mySeatId && emote !== 'wave') {
      set({ mySeatId: null });
    }
    if (socket && inGame) {
      socket.emit('player:emote', emote);
    }
  },

  clearActiveEmote: () => {
    if (get().activeEmote) {
      set({ activeEmote: null });
    }
  },

  sitOnSeat: (seatId) => {
    const { socket, inGame } = get();
    if (!socket || !inGame) return;
    socket.emit('seat:sit', { seatId }, (res: { ok: boolean; error?: string }) => {
      if (res?.ok) {
        soundFX.playSit(true);
        set({ mySeatId: seatId, activeEmote: null });
      } else if (res?.error) {
        get().addToast(res.error, 'warning');
      }
    });
  },

  standUp: (exitPosition) => {
    const { socket, inGame, mySeatId } = get();
    if (!mySeatId) return;
    soundFX.playSit(false);
    set({ mySeatId: null });
    localPlayerTransform.animation = 'idle';
    if (exitPosition) {
      localPlayerTransform.position = [...exitPosition];
    }
    if (socket && inGame) {
      socket.emit('seat:stand', { exitPosition });
    }
  },

  setNearbySeatId: (seatId) => {
    if (get().nearbySeatId !== seatId) {
      set({ nearbySeatId: seatId });
    }
  },

  setNearTV: (near) => {
    if (get().nearTV !== near) {
      set({ nearTV: near });
    }
  },

  setTVMedia: (url, title, forceLive, syncEnabled = true) => {
    return new Promise((resolve) => {
      const { socket } = get();
      if (!socket) {
        resolve({ ok: false, error: 'Sem conexão com o servidor.' });
        return;
      }
      socket.emit(
        'tv:setMedia',
        { url, title, forceLive, syncEnabled },
        (res: { ok: boolean; error?: string }) => {
          if (res?.ok) {
            get().addToast('Mídia sincronizada com toda a sala!', 'success');
          }
          resolve(res || { ok: false, error: 'Falha ao atualizar a TV.' });
        }
      );
    });
  },

  sendTVControl: (action, playbackTime, allowGuestsControl, syncEnabled) => {
    const { socket } = get();
    if (!socket) return;
    socket.emit('tv:control', { action, playbackTime, allowGuestsControl, syncEnabled });
  },

  sendHostSync: (playbackTime, isPlaying, isLive) => {
    const { socket, inGame } = get();
    if (!socket || !inGame) return;
    socket.emit('tv:hostSync', { playbackTime, isPlaying, isLive });
  },

  configureCommentListener: (opts) => {
    return new Promise((resolve) => {
      const { socket, inGame } = get();
      if (!socket || !inGame) {
        resolve({ ok: false, error: 'Sem conexão com a sala.' });
        return;
      }
      socket.emit(
        'comments:configure',
        opts,
        (res: { ok: boolean; error?: string; state?: CommentListenerState }) => {
          if (res?.ok && res.state) {
            set({ commentListener: res.state });
          }
          resolve(res || { ok: false, error: 'Falha ao atualizar ouvidor de comentários.' });
        }
      );
    });
  },

  sendChatMessage: (text) => {
    const { socket, inGame } = get();
    if (!socket || !inGame || !text.trim()) return;
    socket.emit('chat:send', { text });
  },

  kickPlayer: (targetPlayerId) => {
    const { socket } = get();
    if (!socket) return;
    socket.emit('host:kick', { targetPlayerId });
    get().addToast('Participante removido da sala.', 'info');
  },

  transferHost: (targetPlayerId) => {
    const { socket } = get();
    if (!socket) return;
    socket.emit('host:transfer', { targetPlayerId });
  },

  setActiveModal: (modal) => {
    soundFX.playClick();
    // Release pointer lock when opening a modal
    if (modal !== 'none' && document.pointerLockElement) {
      try {
        document.exitPointerLock();
      } catch {}
    }
    set({ activeModal: modal });
  },

  setChatOpen: (open) => {
    soundFX.playClick();
    set({ chatOpen: open });
  },

  setChatInputFocused: (focused) => {
    set({ chatInputFocused: focused });
  },

  setTVInteractiveMode: (interactive) => {
    soundFX.playClick();
    if (interactive && document.pointerLockElement) {
      try {
        document.exitPointerLock();
      } catch {}
    }
    set({ tvInteractiveMode: interactive });
  },

  setTVEmbedError: (err) => set({ tvEmbedError: err }),
  setTVAutoplayBlocked: (blocked) => set({ tvAutoplayBlocked: blocked }),

  updateSettings: (partial) => {
    const next = { ...get().settings, ...partial };
    try {
      localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(next));
    } catch {}
    soundFX.setEnabled(next.sfxEnabled);
    set({ settings: next });
  },

  addToast: (text, type = 'info') => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    set((state) => ({
      toasts: [...state.toasts.slice(-3), { id, text, type }],
    }));
    setTimeout(() => {
      get().removeToast(id);
    }, 4200);
  },

  removeToast: (id) => {
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    }));
  },
}));
