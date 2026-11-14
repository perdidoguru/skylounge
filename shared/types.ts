export type AvatarBodyStyle = 'masculine' | 'feminine';

export type AvatarOutfitStyle =
  | 'jacket'
  | 'hoodie'
  | 'blazer'
  | 'vest'
  | 'dress'
  | 'skirt_set'
  | 'offshoulder'
  | 'jumpsuit';

export type AvatarHairStyle =
  | 'spiky'
  | 'bob'
  | 'curly'
  | 'ponytail'
  | 'waves'
  | 'long_waves'
  | 'long_straight'
  | 'twintails'
  | 'high_bun';

export type AvatarAccessory =
  | 'none'
  | 'glasses'
  | 'headphones'
  | 'crown'
  | 'beanie'
  | 'tiara'
  | 'earrings'
  | 'bow';

export type SeatPosture =
  | 'sofa'
  | 'chaise'
  | 'pouf'
  | 'cushion'
  | 'vip'
  | 'armchair'
  | 'barstool';

export type AnimationState =
  | 'idle'
  | 'walk'
  | 'run'
  | 'jump'
  | 'sit'
  | 'wave'
  | 'dance'
  | 'cheer'
  | 'laugh';

export interface AvatarCustomization {
  name: string;
  bodyStyle?: AvatarBodyStyle;
  skinColor: string;
  outfitStyle: AvatarOutfitStyle;
  primaryColor: string;
  secondaryColor: string;
  hairStyle: AvatarHairStyle;
  hairColor: string;
  accessory: AvatarAccessory;
}

export interface PlayerState {
  id: string;
  name: string;
  customization: AvatarCustomization;
  position: [number, number, number];
  rotationY: number;
  headYaw: number;
  headPitch: number;
  animation: AnimationState;
  seatId: string | null;
  isHost: boolean;
  joinedAt: number;
  lastMessage?: {
    text: string;
    timestamp: number;
  };
}

export type MediaPlatform = 'youtube' | 'youtube_live' | 'twitch' | 'kick' | 'ambient';

export interface TVMediaState {
  url: string;
  platform: MediaPlatform;
  videoId: string;
  channel: string;
  title: string;
  isPlaying: boolean;
  isLive: boolean;
  syncEnabled: boolean; // True = Synchronize all players with Host in real-time
  playbackTime: number; // Current playhead in seconds (works for both VOD and YouTube Live DVR)
  updatedAt: number;    // Server timestamp (ms) when playbackTime was recorded
  updatedBy: string;    // Player name
  allowGuestsControl: boolean;
  seq: number;          // Increments on explicit user actions (play/pause/seek/forceSync)
}

export interface TVSyncPulse {
  playbackTime: number;
  isPlaying: boolean;
  isLive: boolean;
  syncEnabled: boolean;
  updatedAt: number;
  hostId: string;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderColor: string;
  text: string;
  timestamp: number;
  isSystem?: boolean;
}

export interface RoomSummary {
  id: string;
  name: string;
  hostName: string;
  playerCount: number;
  maxPlayers: number;
  isPublic: boolean;
  currentMediaTitle: string;
  platform: MediaPlatform;
}

export interface RoomStatePayload {
  roomId: string;
  roomName: string;
  hostId: string;
  isPublic: boolean;
  players: Record<string, PlayerState>;
  seats: Record<string, string>; // seatId -> playerId
  tvState: TVMediaState;
  messages: ChatMessage[];
}

export interface SeatDefinition {
  id: string;
  label: string;
  zone: 'cinema' | 'bar' | 'lounge' | 'terrace';
  posture: SeatPosture;
  position: [number, number, number];
  rotationY: number;
  seatHeightOffset?: number;
}

export type GraphicsQuality = 'low' | 'medium' | 'high';
