import { CommentListenerState, MediaPlatform, TVMediaState } from './types.js';

export interface ParsedMediaResult {
  valid: boolean;
  platform: MediaPlatform;
  url: string;
  videoId: string;
  channel: string;
  title: string;
  isLive: boolean;
  error?: string;
}

export interface MediaPreset {
  id: string;
  title: string;
  subtitle: string;
  platform: MediaPlatform;
  url: string;
  isLive: boolean;
  badge: string;
}

export const CURATED_MEDIA_PRESETS: MediaPreset[] = [
  {
    id: 'preset-ambient',
    title: 'SkyLounge Synthwave & City Visualizer',
    subtitle: 'Visualizador Nativo 3D c/ Áudio Lo-Fi Sintetizado (Zero Bloqueio)',
    platform: 'ambient',
    url: 'skylounge://ambient',
    isLive: true,
    badge: '3D Nativo',
  },
  {
    id: 'preset-blender-sintel',
    title: 'Spring — Blender Open Movie (Curta 3D)',
    subtitle: 'Vídeo YouTube Sob Demanda (Sincronizado)',
    platform: 'youtube',
    url: 'https://www.youtube.com/watch?v=WhWc3b3KhnY',
    isLive: false,
    badge: 'YouTube VOD',
  },
  {
    id: 'preset-nasa-live',
    title: 'NASA Live — Earth From Space (ISS)',
    subtitle: 'Transmissão Ao Vivo Oficial NASA',
    platform: 'youtube_live',
    url: 'https://www.youtube.com/watch?v=xRPjKQtRXR8',
    isLive: true,
    badge: 'YouTube Live',
  },
  {
    id: 'preset-twitch-monstercat',
    title: 'Monstercat — Electronic & Chilled Beats',
    subtitle: 'Canal Ao Vivo na Twitch',
    platform: 'twitch',
    url: 'https://www.twitch.tv/monstercat',
    isLive: true,
    badge: 'Twitch Live',
  },
  {
    id: 'preset-kick-live',
    title: 'Kick Featured Stream',
    subtitle: 'Transmissão Ao Vivo na Kick',
    platform: 'kick',
    url: 'https://kick.com/xqc',
    isLive: true,
    badge: 'Kick Live',
  },
];

export const DEFAULT_TV_STATE: TVMediaState = {
  url: 'https://www.youtube.com/watch?v=WhWc3b3KhnY',
  platform: 'youtube',
  videoId: 'WhWc3b3KhnY',
  channel: '',
  title: 'Spring — Blender Open Movie (Curta 3D)',
  isPlaying: true,
  isLive: false,
  syncEnabled: true,
  playbackTime: 0,
  updatedAt: Date.now(),
  updatedBy: 'Sistema',
  allowGuestsControl: true,
  seq: 1,
};

export const DEFAULT_COMMENT_LISTENER_STATE: CommentListenerState = {
  url: '',
  platform: 'none',
  targetId: '',
  label: 'Cole o link da live/vídeo',
  active: false,
  npcCount: 3,
  recentComments: [],
};

export function parseCommentSourceUrl(rawInput: string): {
  valid: boolean;
  platform: 'youtube' | 'twitch' | 'kick';
  targetId: string;
  url: string;
  label: string;
  error?: string;
} {
  const trimmed = (rawInput || '').trim();
  if (!trimmed) {
    return {
      valid: false,
      platform: 'twitch',
      targetId: '',
      url: '',
      label: '',
      error: 'Informe um link do YouTube, Twitch ou Kick.',
    };
  }

  // Allow bare channel names as Twitch channel shortcut
  if (/^[a-zA-Z0-9_]{2,28}$/.test(trimmed) && !trimmed.includes('.')) {
    const ch = trimmed.toLowerCase();
    return {
      valid: true,
      platform: 'twitch',
      targetId: ch,
      url: `https://www.twitch.tv/${ch}`,
      label: `Twitch • ${ch}`,
    };
  }

  // Support YouTube channel handles like https://www.youtube.com/@handle or /@handle/live
  try {
    const withProto = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    const u = new URL(withProto);
    const host = u.hostname.toLowerCase().replace(/^www\./, '');
    if (
      (host === 'youtube.com' || host === 'm.youtube.com') &&
      u.pathname.startsWith('/@')
    ) {
      const handleSegment = u.pathname.split('/').filter(Boolean)[0]; // e.g. "@canal"
      if (handleSegment && handleSegment.length > 2) {
        return {
          valid: true,
          platform: 'youtube',
          targetId: handleSegment,
          url: `https://www.youtube.com/${handleSegment}/live`,
          label: `YouTube • ${handleSegment}`,
        };
      }
    }
  } catch {}

  const parsed = parseMediaUrl(trimmed);
  if (!parsed.valid) {
    return {
      valid: false,
      platform: 'youtube',
      targetId: '',
      url: trimmed,
      label: '',
      error: parsed.error || 'Link inválido para o ouvidor de comentários.',
    };
  }

  if (parsed.platform === 'youtube' || parsed.platform === 'youtube_live') {
    return {
      valid: true,
      platform: 'youtube',
      targetId: parsed.videoId,
      url: parsed.url,
      label: `YouTube • ${parsed.videoId}`,
    };
  }

  if (parsed.platform === 'twitch') {
    const ch = parsed.channel;
    if (!ch) {
      return {
        valid: false,
        platform: 'twitch',
        targetId: '',
        url: trimmed,
        label: '',
        error: 'Informe um link de canal ao vivo da Twitch.',
      };
    }
    return {
      valid: true,
      platform: 'twitch',
      targetId: ch,
      url: `https://www.twitch.tv/${ch}`,
      label: `Twitch • ${ch}`,
    };
  }

  if (parsed.platform === 'kick') {
    const ch = parsed.channel;
    if (!ch) {
      return {
        valid: false,
        platform: 'kick',
        targetId: '',
        url: trimmed,
        label: '',
        error: 'Informe um link de canal válido da Kick.',
      };
    }
    return {
      valid: true,
      platform: 'kick',
      targetId: ch,
      url: `https://kick.com/${ch}`,
      label: `Kick • ${ch}`,
    };
  }

  return {
    valid: false,
    platform: 'youtube',
    targetId: '',
    url: trimmed,
    label: '',
    error: 'Use um link do YouTube, Twitch ou Kick para o ouvidor de comentários.',
  };
}

/**
 * Parses and normalizes user-submitted media URLs across:
 * - YouTube (standard videos, shorts, embed URLs)
 * - YouTube Live (youtube.com/live/ID or marked live)
 * - Twitch (live channels & videos)
 * - Kick (live channels)
 * - SkyLounge Ambient Visualizer (skylounge://ambient)
 */
export function parseMediaUrl(rawInput: string, forceLive?: boolean): ParsedMediaResult {
  const trimmed = (rawInput || '').trim();

  if (!trimmed) {
    return {
      valid: false,
      platform: 'youtube',
      url: '',
      videoId: '',
      channel: '',
      title: '',
      isLive: false,
      error: 'Insira uma URL válida do YouTube, YouTube Live, Twitch ou Kick.',
    };
  }

  if (trimmed === 'skylounge://ambient' || trimmed.toLowerCase() === 'ambient') {
    return {
      valid: true,
      platform: 'ambient',
      url: 'skylounge://ambient',
      videoId: 'ambient',
      channel: 'skylounge',
      title: 'SkyLounge Synthwave & City Visualizer',
      isLive: true,
    };
  }

  let parsedUrl: URL;
  try {
    const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    parsedUrl = new URL(withProtocol);
  } catch {
    return {
      valid: false,
      platform: 'youtube',
      url: trimmed,
      videoId: '',
      channel: '',
      title: '',
      isLive: false,
      error: 'Formato de URL inválido. Exemplo: https://www.youtube.com/watch?v=...',
    };
  }

  const host = parsedUrl.hostname.toLowerCase().replace(/^www\./, '');
  const pathname = parsedUrl.pathname;

  // 1. YOUTUBE & YOUTUBE LIVE
  if (
    host === 'youtube.com' ||
    host === 'm.youtube.com' ||
    host === 'music.youtube.com' ||
    host === 'youtu.be'
  ) {
    let videoId = '';
    let isLiveStream = Boolean(forceLive);

    if (host === 'youtu.be') {
      videoId = pathname.slice(1).split('/')[0] || '';
    } else if (pathname.startsWith('/watch')) {
      videoId = parsedUrl.searchParams.get('v') || '';
    } else if (pathname.startsWith('/live/')) {
      videoId = pathname.replace('/live/', '').split('/')[0] || '';
      isLiveStream = true;
    } else if (pathname.startsWith('/embed/')) {
      videoId = pathname.replace('/embed/', '').split('/')[0] || '';
    } else if (pathname.startsWith('/shorts/')) {
      videoId = pathname.replace('/shorts/', '').split('/')[0] || '';
    }

    const cleanId = videoId.replace(/[^a-zA-Z0-9_-]/g, '');
    if (!cleanId || cleanId.length < 6) {
      return {
        valid: false,
        platform: 'youtube',
        url: trimmed,
        videoId: '',
        channel: '',
        title: '',
        isLive: false,
        error: 'Não foi possível identificar o ID do vídeo do YouTube nesta URL.',
      };
    }

    const matchingPreset = CURATED_MEDIA_PRESETS.find((p) => p.url.includes(cleanId));
    if (matchingPreset?.isLive) {
      isLiveStream = true;
    }

    const platform: MediaPlatform = isLiveStream ? 'youtube_live' : 'youtube';
    const normalizedUrl = isLiveStream
      ? `https://www.youtube.com/live/${cleanId}`
      : `https://www.youtube.com/watch?v=${cleanId}`;

    return {
      valid: true,
      platform,
      url: normalizedUrl,
      videoId: cleanId,
      channel: '',
      title:
        matchingPreset?.title ||
        (isLiveStream ? `YouTube Live (${cleanId})` : `YouTube Video (${cleanId})`),
      isLive: isLiveStream,
    };
  }

  // 2. TWITCH
  if (host === 'twitch.tv' || host === 'm.twitch.tv' || host === 'player.twitch.tv') {
    let channel = '';
    let vodId = '';

    if (host === 'player.twitch.tv') {
      channel = parsedUrl.searchParams.get('channel') || '';
      vodId = parsedUrl.searchParams.get('video') || '';
    } else {
      const segments = pathname.split('/').filter(Boolean);
      if (segments[0] === 'videos' && segments[1]) {
        vodId = segments[1].replace(/[^0-9]/g, '');
      } else if (segments[0]) {
        channel = segments[0].replace(/[^a-zA-Z0-9_]/g, '').toLowerCase();
      }
    }

    if (!channel && !vodId) {
      return {
        valid: false,
        platform: 'twitch',
        url: trimmed,
        videoId: '',
        channel: '',
        title: '',
        isLive: false,
        error: 'Informe um canal válido da Twitch (ex: https://www.twitch.tv/monstercat).',
      };
    }

    const matchingPreset = CURATED_MEDIA_PRESETS.find(
      (p) => channel && p.url.toLowerCase().includes(channel.toLowerCase())
    );

    return {
      valid: true,
      platform: 'twitch',
      url: vodId ? `https://www.twitch.tv/videos/${vodId}` : `https://www.twitch.tv/${channel}`,
      videoId: vodId,
      channel,
      title: matchingPreset?.title || (vodId ? `Twitch VOD #${vodId}` : `Twitch: ${channel}`),
      isLive: !vodId,
    };
  }

  // 3. KICK
  if (host === 'kick.com' || host === 'player.kick.com') {
    const segments = pathname.split('/').filter(Boolean);
    const channel = (segments[0] || '').replace(/[^a-zA-Z0-9_-]/g, '').toLowerCase();

    if (!channel) {
      return {
        valid: false,
        platform: 'kick',
        url: trimmed,
        videoId: '',
        channel: '',
        title: '',
        isLive: false,
        error: 'Informe um canal válido da Kick (ex: https://kick.com/xqc).',
      };
    }

    const matchingPreset = CURATED_MEDIA_PRESETS.find(
      (p) => p.platform === 'kick' && p.url.toLowerCase().includes(channel)
    );

    return {
      valid: true,
      platform: 'kick',
      url: `https://kick.com/${channel}`,
      videoId: '',
      channel,
      title: matchingPreset?.title || `Kick Live: ${channel}`,
      isLive: true,
    };
  }

  return {
    valid: false,
    platform: 'youtube',
    url: trimmed,
    videoId: '',
    channel: '',
    title: '',
    isLive: false,
    error: 'Plataforma não suportada. Use links do YouTube, YouTube Live, Twitch ou Kick.',
  };
}
