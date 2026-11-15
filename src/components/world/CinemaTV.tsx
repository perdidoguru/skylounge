import React, { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { CSS3DRenderer, CSS3DObject } from 'three/examples/jsm/renderers/CSS3DRenderer.js';
import {
  useGameStore,
  localPlayerTransform,
  tvPlayerBridge,
} from '../../store/useGameStore';
import { soundFX } from '../../utils/soundEffects';

// Screen dimensions in 3D meters (16:9 aspect ratio)
export const TV_SCREEN_WIDTH = 8.8;
export const TV_SCREEN_HEIGHT = 4.95;
export const TV_POSITION: [number, number, number] = [0, 3.35, -10.45];

// Pixel resolution of the CSS3D iframe
const DOM_WIDTH = 1280;
const DOM_HEIGHT = 720;
const CSS_SCALE = TV_SCREEN_WIDTH / DOM_WIDTH;

declare global {
  interface Window {
    YT?: any;
    onYouTubeIframeAPIReady?: () => void;
    __ytApiLoaded?: boolean;
    Twitch?: any;
  }
}

function ensureYouTubeApi(): Promise<any> {
  return new Promise((resolve) => {
    if (window.YT && window.YT.Player) {
      resolve(window.YT);
      return;
    }
    const existingScript = document.getElementById('yt-iframe-api-script');
    if (!existingScript) {
      const tag = document.createElement('script');
      tag.id = 'yt-iframe-api-script';
      tag.src = 'https://www.youtube.com/iframe_api';
      document.head.appendChild(tag);
    }
    const checkInterval = window.setInterval(() => {
      if (window.YT && window.YT.Player) {
        clearInterval(checkInterval);
        resolve(window.YT);
      }
    }, 120);
  });
}

function ensureTwitchApi(): Promise<any | null> {
  return new Promise((resolve) => {
    if (window.Twitch && window.Twitch.Player) {
      resolve(window.Twitch);
      return;
    }
    const existingScript = document.getElementById('twitch-embed-api-script');
    if (!existingScript) {
      const tag = document.createElement('script');
      tag.id = 'twitch-embed-api-script';
      tag.src = 'https://player.twitch.tv/js/embed/v1.js';
      document.head.appendChild(tag);
    }
    const startedAt = Date.now();
    const checkInterval = window.setInterval(() => {
      if (window.Twitch && window.Twitch.Player) {
        clearInterval(checkInterval);
        resolve(window.Twitch);
      } else if (Date.now() - startedAt > 3500) {
        clearInterval(checkInterval);
        resolve(null);
      }
    }, 120);
  });
}

function applyYouTubeVolume(player: any, volumePct: number, muted: boolean) {
  if (!player) return;
  const clamped = Math.max(0, Math.min(100, Math.round(volumePct)));
  try {
    if (muted || clamped <= 0) {
      player.setVolume?.(clamped);
      player.mute?.();
    } else {
      // Unmute BEFORE setVolume so YouTube does not restore a cached low volume or show a low-volume icon
      player.unMute?.();
      player.setVolume?.(clamped);
    }
  } catch {}
}

function applyTwitchVolume(player: any, volumePct: number, muted: boolean) {
  if (!player) return;
  const clamped = Math.max(0, Math.min(100, volumePct));
  try {
    if (muted || clamped <= 0) {
      player.setMuted?.(true);
      player.setVolume?.(0);
    } else {
      player.setMuted?.(false);
      player.setVolume?.(clamped / 100);
    }
  } catch {}
}

export const CinemaTV: React.FC = () => {
  const { size, camera, gl } = useThree();
  const tvState = useGameStore((s) => s.tvState);
  const hostId = useGameStore((s) => s.hostId);
  const myPlayerId = useGameStore((s) => s.myPlayerId);
  const settings = useGameStore((s) => s.settings);
  const tvInteractiveMode = useGameStore((s) => s.tvInteractiveMode);
  const tvEmbedError = useGameStore((s) => s.tvEmbedError);
  const setTVEmbedError = useGameStore((s) => s.setTVEmbedError);
  const setTVAutoplayBlocked = useGameStore((s) => s.setTVAutoplayBlocked);
  const setActiveModal = useGameStore((s) => s.setActiveModal);
  const setNearTV = useGameStore((s) => s.setNearTV);
  const sendHostSync = useGameStore((s) => s.sendHostSync);
  const sendTVControl = useGameStore((s) => s.sendTVControl);

  const biasLightLeftRef = useRef<THREE.PointLight>(null);
  const biasLightRightRef = useRef<THREE.PointLight>(null);
  const glowStripMatRef = useRef<THREE.MeshBasicMaterial>(null);

  // Anti-stutter synchronization state refs
  const internalUpdateUntilRef = useRef(0);
  const pendingPauseTimerRef = useRef<number | null>(null);
  const lastSeekAtRef = useRef(0);
  const driftStrikesRef = useRef(0);
  const lastHandledSeqRef = useRef(0);
  const lastHostReportedTimeRef = useRef(0);

  const isInternalUpdate = () => Date.now() < internalUpdateUntilRef.current;

  const markInternalUpdate = (durationMs = 1100) => {
    internalUpdateUntilRef.current = Math.max(
      internalUpdateUntilRef.current,
      Date.now() + durationMs
    );
  };

  const clearPendingPause = () => {
    if (pendingPauseTimerRef.current !== null) {
      window.clearTimeout(pendingPauseTimerRef.current);
      pendingPauseTimerRef.current = null;
    }
  };

  // WebGL Hole-Punch Material (writes RGBA=(0,0,0,0) and Z=Z_tv into WebGL depth buffer!)
  const holePunchMaterial = useMemo(() => {
    return new THREE.MeshBasicMaterial({
      color: 0x000000,
      opacity: 0,
      transparent: false,
      blending: THREE.NoBlending,
      side: THREE.FrontSide,
      depthWrite: true,
      depthTest: true,
    });
  }, []);

  // Dynamic 2D CanvasTexture for Native 3D Visualizer / Paused / Error fallback
  const { fallbackTexture, fallbackCtx, fallbackCanvas } = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 576;
    const ctx = canvas.getContext('2d')!;
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return { fallbackTexture: tex, fallbackCtx: ctx, fallbackCanvas: canvas };
  }, []);

  const fallbackMaterial = useMemo(() => {
    return new THREE.MeshBasicMaterial({
      map: fallbackTexture,
      side: THREE.FrontSide,
    });
  }, [fallbackTexture]);

  // CSS3D Scene & Renderer references
  const cssSceneRef = useRef<THREE.Scene | null>(null);
  const cssRendererRef = useRef<CSS3DRenderer | null>(null);
  const cssObjectRef = useRef<CSS3DObject | null>(null);
  const screenWrapperDivRef = useRef<HTMLDivElement | null>(null);
  const ytPlayerRef = useRef<any>(null);
  const twitchPlayerRef = useRef<any>(null);
  const currentMediaKeyRef = useRef<string>('');

  // Determine whether we should punch a hole to reveal the CSS3D iframe
  const useIframeHolePunch =
    tvState.platform !== 'ambient' && !tvEmbedError && Boolean(tvState.url);

  // Manage ambient synthesizer audio when in native 3D visualizer mode
  useEffect(() => {
    if (tvState.platform === 'ambient' && tvState.isPlaying && !settings.tvMuted) {
      soundFX.startAmbientSynth(settings.tvVolume);
    } else {
      soundFX.stopAmbientSynth();
    }
    return () => {
      soundFX.stopAmbientSynth();
    };
  }, [tvState.platform, tvState.isPlaying, settings.tvVolume, settings.tvMuted]);

  // Initialize CSS3DRenderer behind the WebGL Canvas
  useEffect(() => {
    const hostContainer = document.getElementById('css3d-stage-layer');
    if (!hostContainer) return;

    const cssScene = new THREE.Scene();
    const cssRenderer = new CSS3DRenderer();
    cssRenderer.setSize(window.innerWidth, window.innerHeight);
    cssRenderer.domElement.style.position = 'absolute';
    cssRenderer.domElement.style.top = '0';
    cssRenderer.domElement.style.left = '0';
    cssRenderer.domElement.style.width = '100%';
    cssRenderer.domElement.style.height = '100%';
    cssRenderer.domElement.style.pointerEvents = 'none';
    cssRenderer.domElement.style.overflow = 'hidden';

    hostContainer.innerHTML = '';
    hostContainer.appendChild(cssRenderer.domElement);

    // Create the DOM element that holds the iframe
    const wrapper = document.createElement('div');
    wrapper.style.width = `${DOM_WIDTH}px`;
    wrapper.style.height = `${DOM_HEIGHT}px`;
    wrapper.style.backgroundColor = '#05070f';
    wrapper.style.overflow = 'hidden';
    wrapper.style.boxSizing = 'border-box';
    wrapper.style.backfaceVisibility = 'hidden';
    wrapper.style.webkitBackfaceVisibility = 'hidden';
    wrapper.style.pointerEvents = 'auto';

    const cssObject = new CSS3DObject(wrapper);
    cssObject.position.set(TV_POSITION[0], TV_POSITION[1], TV_POSITION[2] + 0.06);
    cssObject.scale.set(CSS_SCALE, CSS_SCALE, CSS_SCALE);
    cssScene.add(cssObject);

    cssSceneRef.current = cssScene;
    cssRendererRef.current = cssRenderer;
    cssObjectRef.current = cssObject;
    screenWrapperDivRef.current = wrapper;

    return () => {
      clearPendingPause();
      if (ytPlayerRef.current) {
        try {
          ytPlayerRef.current.destroy();
        } catch {}
        ytPlayerRef.current = null;
      }
      if (twitchPlayerRef.current) {
        try {
          twitchPlayerRef.current.destroy?.();
        } catch {}
        twitchPlayerRef.current = null;
      }
      hostContainer.innerHTML = '';
    };
  }, []);

  // Keep CSS3DRenderer size synchronized with Three.js viewport on window resize
  useEffect(() => {
    if (cssRendererRef.current) {
      cssRendererRef.current.setSize(size.width, size.height);
    }
  }, [size.width, size.height]);

  // Mount or update the embedded player when media source changes
  useEffect(() => {
    const wrapper = screenWrapperDivRef.current;
    if (!wrapper) return;

    const platformGroup =
      tvState.platform === 'youtube' || tvState.platform === 'youtube_live'
        ? 'youtube'
        : tvState.platform;
    const mediaKey = `${platformGroup}:${tvState.videoId}:${tvState.channel}:${tvState.url}`;
    if (currentMediaKeyRef.current === mediaKey) return;
    currentMediaKeyRef.current = mediaKey;

    clearPendingPause();
    setTVEmbedError(null);
    setTVAutoplayBlocked(false);
    driftStrikesRef.current = 0;
    lastSeekAtRef.current = 0;
    lastHostReportedTimeRef.current = 0;

    if (ytPlayerRef.current) {
      try {
        ytPlayerRef.current.destroy();
      } catch {}
      ytPlayerRef.current = null;
    }
    if (twitchPlayerRef.current) {
      try {
        twitchPlayerRef.current.destroy?.();
      } catch {}
      twitchPlayerRef.current = null;
    }

    tvPlayerBridge.getCurrentTime = () => 0;
    tvPlayerBridge.getDuration = () => 0;
    tvPlayerBridge.syncToServerNow = () => {};
    tvPlayerBridge.seekToLive = () => {};
    tvPlayerBridge.applyVolume = () => {};
    tvPlayerBridge.getPlayerType = () =>
      platformGroup === 'youtube' ? 'youtube' : platformGroup;

    wrapper.innerHTML = '';

    if (tvState.platform === 'ambient') {
      wrapper.style.display = 'none';
      return;
    }

    wrapper.style.display = 'block';

    // 1. YOUTUBE & YOUTUBE LIVE (Official YouTube IFrame API with Anti-Pause & DVR Sync)
    if (tvState.platform === 'youtube' || tvState.platform === 'youtube_live') {
      const mountDiv = document.createElement('div');
      mountDiv.id = `yt-player-mount-${Date.now()}`;
      mountDiv.style.width = '100%';
      mountDiv.style.height = '100%';
      wrapper.appendChild(mountDiv);

      let cancelled = false;
      let syncedVolumeOnPlay = false;

      ensureYouTubeApi().then((YT) => {
        if (cancelled || !screenWrapperDivRef.current) return;

        // IMPORTANT: Do NOT pass start: 0 on YouTube Live streams, as start: 0 rewinds DVR live streams to the beginning!
        const playerVars: Record<string, any> = {
          autoplay: tvState.isPlaying ? 1 : 0,
          controls: 1,
          rel: 0,
          modestbranding: 1,
          playsinline: 1,
          enablejsapi: 1,
          origin: window.location.origin,
        };
        if (!tvState.isLive && tvState.playbackTime > 2) {
          playerVars.start = Math.floor(tvState.playbackTime);
        }

        ytPlayerRef.current = new YT.Player(mountDiv.id, {
          width: String(DOM_WIDTH),
          height: String(DOM_HEIGHT),
          videoId: tvState.videoId,
          playerVars,
          events: {
            onReady: (event: any) => {
              if (cancelled) return;
              try {
                const player = event.target;

                const computeElapsedSinceSync = () => {
                  const st = useGameStore.getState();
                  if (!st.tvState.isPlaying) return 0;
                  return Math.max(0, Math.min(30, (Date.now() - st.tvLastSyncReceivedAt) / 1000));
                };

                const clampLiveTarget = (rawTarget: number) => {
                  const dur = Number(player.getDuration?.()) || 0;
                  const latest = useGameStore.getState().tvState;
                  if (latest.isLive && dur > 5) {
                    return Math.min(rawTarget, Math.max(0, dur - 1.5));
                  }
                  return Math.max(0, rawTarget);
                };

                // Expose bridge methods for UI manual sync / DVR live catchup / direct volume unmute
                tvPlayerBridge.getPlayerType = () => 'youtube';
                tvPlayerBridge.getCurrentTime = () => {
                  try {
                    return Number(player.getCurrentTime?.()) || 0;
                  } catch {
                    return 0;
                  }
                };
                tvPlayerBridge.getDuration = () => {
                  try {
                    return Number(player.getDuration?.()) || 0;
                  } catch {
                    return 0;
                  }
                };
                tvPlayerBridge.applyVolume = (vol: number, muted: boolean) => {
                  applyYouTubeVolume(player, vol, muted);
                };
                tvPlayerBridge.syncToServerNow = () => {
                  try {
                    const latest = useGameStore.getState().tvState;
                    if (latest.playbackTime > 0.5 || !latest.isLive) {
                      const target = clampLiveTarget(
                        latest.playbackTime + computeElapsedSinceSync()
                      );
                      markInternalUpdate(1500);
                      lastSeekAtRef.current = Date.now();
                      player.seekTo?.(target, true);
                      if (latest.isPlaying) player.playVideo?.();
                    }
                  } catch {}
                };
                tvPlayerBridge.seekToLive = () => {
                  try {
                    const dur = Number(player.getDuration?.()) || 0;
                    const cur = Number(player.getCurrentTime?.()) || 0;
                    const liveEdge = dur > 1 ? Math.max(0, dur - 0.5) : cur;
                    if (liveEdge > 0) {
                      markInternalUpdate(1500);
                      lastSeekAtRef.current = Date.now();
                      player.seekTo?.(liveEdge, true);
                    }
                    player.playVideo?.();
                    const st = useGameStore.getState();
                    if (st.hostId === st.myPlayerId || st.tvState.allowGuestsControl) {
                      st.sendTVControl('seek', liveEdge);
                      if (!st.tvState.isPlaying) {
                        st.sendTVControl('play', liveEdge);
                      }
                    }
                  } catch {}
                };

                const currentSettings = useGameStore.getState().settings;
                applyYouTubeVolume(player, currentSettings.tvVolume, currentSettings.tvMuted);

                const latestTV = useGameStore.getState().tvState;
                lastHandledSeqRef.current = latestTV.seq || 1;

                // Sync to authoritative room playbackTime on initial join (works for both VOD and YouTube Live DVR!)
                if (latestTV.syncEnabled && latestTV.playbackTime > 1.5) {
                  const target = clampLiveTarget(
                    latestTV.playbackTime + computeElapsedSinceSync()
                  );
                  markInternalUpdate(1600);
                  lastSeekAtRef.current = Date.now();
                  player.seekTo(target, true);
                }

                if (latestTV.isPlaying) {
                  markInternalUpdate(1600);
                  player.playVideo();
                  // Verify after 1.8s if browser blocked unmuted autoplay (do not interrupt buffering state 3)
                  window.setTimeout(() => {
                    if (cancelled || ytPlayerRef.current !== player) return;
                    try {
                      const stateCode = player.getPlayerState?.();
                      if (
                        (stateCode === -1 || stateCode === 5 || stateCode === 2) &&
                        useGameStore.getState().tvState.isPlaying &&
                        !isInternalUpdate()
                      ) {
                        markInternalUpdate(1200);
                        player.mute();
                        player.playVideo();
                        setTVAutoplayBlocked(true);
                      }
                    } catch {}
                  }, 1800);
                } else {
                  markInternalUpdate(1200);
                  player.pauseVideo();
                }
              } catch {}
            },
            onStateChange: (event: any) => {
              if (cancelled) return;
              try {
                const player = event.target;
                const stateCode = event?.data;
                const store = useGameStore.getState();
                const isHostNow = store.hostId === store.myPlayerId;

                // Buffering (3) or Playing (1) cancels any pending pause confirmation
                if (stateCode === 1 || stateCode === 3) {
                  clearPendingPause();
                }

                if (stateCode === 1) {
                  // PLAYING: ensure normal playback rate 1.0
                  if (player.getPlaybackRate?.() !== 1) {
                    player.setPlaybackRate?.(1);
                  }

                  // Re-apply volume & unmute once active playback starts so YouTube's speaker icon updates properly
                  if (!syncedVolumeOnPlay) {
                    syncedVolumeOnPlay = true;
                    const s = store.settings;
                    applyYouTubeVolume(player, s.tvVolume, s.tvMuted);
                    window.setTimeout(() => {
                      if (cancelled || ytPlayerRef.current !== player) return;
                      const latestS = useGameStore.getState().settings;
                      if (!latestS.tvMuted && latestS.tvVolume > 0 && !useGameStore.getState().tvAutoplayBlocked) {
                        applyYouTubeVolume(player, latestS.tvVolume, false);
                      }
                    }, 300);
                  }

                  // Immediately report Host's authoritative playhead
                  if (isHostNow && store.tvState.syncEnabled) {
                    const curTime = Number(player.getCurrentTime?.()) || 0;
                    if (curTime > 0) {
                      const videoData = player.getVideoData?.();
                      const detectedLive = Boolean(videoData?.isLive) || store.tvState.isLive;
                      lastHostReportedTimeRef.current = curTime;
                      store.sendHostSync(curTime, true, detectedLive);
                    }
                  }
                }

                if (isInternalUpdate()) return;

                if (isHostNow && store.tvState.syncEnabled) {
                  const curTime = Number(player.getCurrentTime?.()) || 0;
                  const videoData = player.getVideoData?.();
                  const detectedLive = Boolean(videoData?.isLive) || store.tvState.isLive;

                  if (stateCode === 1) {
                    lastHostReportedTimeRef.current = curTime;
                    store.sendHostSync(curTime, true, detectedLive);
                    if (!store.tvState.isPlaying) {
                      store.sendTVControl('play', curTime);
                    }
                  } else if (stateCode === 2) {
                    // Debounce pause by 650ms so transient buffering/seek/quality-switch glitches NEVER pause the room!
                    clearPendingPause();
                    pendingPauseTimerRef.current = window.setTimeout(() => {
                      pendingPauseTimerRef.current = null;
                      if (cancelled || ytPlayerRef.current !== player) return;
                      if (isInternalUpdate()) return;
                      try {
                        const confirmedState = player.getPlayerState?.();
                        const stNow = useGameStore.getState();
                        if (
                          confirmedState === 2 &&
                          stNow.hostId === stNow.myPlayerId &&
                          stNow.tvState.syncEnabled &&
                          stNow.tvState.isPlaying
                        ) {
                          const confirmedTime = Number(player.getCurrentTime?.()) || 0;
                          lastHostReportedTimeRef.current = confirmedTime;
                          stNow.sendTVControl('pause', confirmedTime);
                        }
                      } catch {}
                    }, 650);
                  }
                }
              } catch {}
            },
            onError: (event: any) => {
              const code = event?.data;
              clearPendingPause();
              if (ytPlayerRef.current) {
                try {
                  ytPlayerRef.current.destroy();
                } catch {}
                ytPlayerRef.current = null;
              }
              if (screenWrapperDivRef.current) {
                screenWrapperDivRef.current.innerHTML = '';
              }
              if (code === 101 || code === 150) {
                setTVEmbedError(
                  'O proprietário deste vídeo no YouTube desativou a reprodução incorporada em outros sites (Erro 150). Escolha outro vídeo ou transmissão!'
                );
              } else {
                setTVEmbedError(
                  `Não foi possível reproduzir este vídeo do YouTube (Código ${code || 'desconhecido'}). Verifique a URL.`
                );
              }
            },
          },
        });
      });

      return () => {
        cancelled = true;
        clearPendingPause();
      };
    }

    // 2. TWITCH (Interactive Twitch Embed Player JS API with safe iframe fallback)
    if (tvState.platform === 'twitch') {
      const parentHost = window.location.hostname || 'localhost';
      const mountDiv = document.createElement('div');
      mountDiv.id = `twitch-player-mount-${Date.now()}`;
      mountDiv.style.width = '100%';
      mountDiv.style.height = '100%';
      wrapper.appendChild(mountDiv);

      let cancelled = false;

      const mountFallbackIframe = () => {
        if (cancelled || !screenWrapperDivRef.current) return;
        mountDiv.innerHTML = '';
        const iframe = document.createElement('iframe');
        iframe.width = String(DOM_WIDTH);
        iframe.height = String(DOM_HEIGHT);
        iframe.style.border = 'none';
        iframe.style.width = '100%';
        iframe.style.height = '100%';
        iframe.allow = 'autoplay; fullscreen; encrypted-media; picture-in-picture';

        const baseUrl = tvState.videoId
          ? `https://player.twitch.tv/?video=${encodeURIComponent(tvState.videoId)}`
          : `https://player.twitch.tv/?channel=${encodeURIComponent(tvState.channel)}`;

        const buildSrc = () => {
          const st = useGameStore.getState();
          return `${baseUrl}&parent=${encodeURIComponent(parentHost)}&autoplay=${
            st.tvState.isPlaying ? 'true' : 'false'
          }&muted=${st.settings.tvMuted ? 'true' : 'false'}`;
        };

        iframe.src = buildSrc();
        mountDiv.appendChild(iframe);
        tvPlayerBridge.seekToLive = () => {
          iframe.src = buildSrc();
        };
      };

      ensureTwitchApi().then((Twitch) => {
        if (cancelled || !screenWrapperDivRef.current) return;
        if (!Twitch || !Twitch.Player) {
          mountFallbackIframe();
          return;
        }

        try {
          const options: Record<string, any> = {
            width: DOM_WIDTH,
            height: DOM_HEIGHT,
            parent: [parentHost],
            autoplay: tvState.isPlaying,
            muted: settings.tvMuted,
          };
          if (tvState.videoId) {
            options.video = tvState.videoId;
          } else {
            options.channel = tvState.channel;
          }

          const player = new Twitch.Player(mountDiv.id, options);
          twitchPlayerRef.current = player;

          tvPlayerBridge.getPlayerType = () => 'twitch';
          tvPlayerBridge.getCurrentTime = () => {
            try {
              return Number(player.getCurrentTime?.()) || 0;
            } catch {
              return 0;
            }
          };
          tvPlayerBridge.getDuration = () => {
            try {
              return Number(player.getDuration?.()) || 0;
            } catch {
              return 0;
            }
          };
          tvPlayerBridge.applyVolume = (vol: number, muted: boolean) => {
            applyTwitchVolume(player, vol, muted);
          };
          tvPlayerBridge.seekToLive = () => {
            try {
              const latest = useGameStore.getState().tvState;
              markInternalUpdate(1400);
              if (!latest.videoId && latest.channel) {
                player.setChannel?.(latest.channel);
                player.play?.();
              } else {
                const dur = Number(player.getDuration?.()) || 0;
                if (dur > 1) player.seek?.(Math.max(0, dur - 1));
                player.play?.();
              }
            } catch {}
          };
          tvPlayerBridge.syncToServerNow = () => {
            try {
              const latest = useGameStore.getState();
              markInternalUpdate(1200);
              if (latest.tvState.videoId && latest.tvState.playbackTime > 1.5) {
                const elapsed = latest.tvState.isPlaying
                  ? Math.max(0, (Date.now() - latest.tvLastSyncReceivedAt) / 1000)
                  : 0;
                player.seek?.(latest.tvState.playbackTime + elapsed);
              }
              if (latest.tvState.isPlaying) player.play?.();
              else player.pause?.();
            } catch {}
          };

          player.addEventListener?.(Twitch.Player.READY, () => {
            if (cancelled) return;
            const st = useGameStore.getState();
            lastHandledSeqRef.current = st.tvState.seq || 1;
            applyTwitchVolume(player, st.settings.tvVolume, st.settings.tvMuted);
            if (st.tvState.videoId && st.tvState.syncEnabled && st.tvState.playbackTime > 1.5) {
              const elapsed = st.tvState.isPlaying
                ? Math.max(0, (Date.now() - st.tvLastSyncReceivedAt) / 1000)
                : 0;
              markInternalUpdate(1400);
              player.seek?.(st.tvState.playbackTime + elapsed);
            }
            if (!st.tvState.isPlaying) {
              markInternalUpdate(1000);
              player.pause?.();
            }
          });

          player.addEventListener?.(Twitch.Player.PLAYBACK_BLOCKED, () => {
            if (cancelled) return;
            try {
              markInternalUpdate(1000);
              player.setMuted?.(true);
              player.play?.();
              setTVAutoplayBlocked(true);
            } catch {}
          });

          player.addEventListener?.(Twitch.Player.PLAY, () => {
            if (cancelled) return;
            clearPendingPause();
            const st = useGameStore.getState();
            const isHostNow = st.hostId === st.myPlayerId;
            if (!isInternalUpdate() && isHostNow && st.tvState.syncEnabled && !st.tvState.isPlaying) {
              const cur = Number(player.getCurrentTime?.()) || 0;
              st.sendTVControl('play', cur);
            }
          });

          player.addEventListener?.(Twitch.Player.PAUSE, () => {
            if (cancelled || isInternalUpdate()) return;
            const st = useGameStore.getState();
            if (st.hostId !== st.myPlayerId || !st.tvState.syncEnabled) return;
            clearPendingPause();
            pendingPauseTimerRef.current = window.setTimeout(() => {
              pendingPauseTimerRef.current = null;
              if (cancelled || twitchPlayerRef.current !== player || isInternalUpdate()) return;
              try {
                const stNow = useGameStore.getState();
                if (
                  player.isPaused?.() &&
                  stNow.hostId === stNow.myPlayerId &&
                  stNow.tvState.syncEnabled &&
                  stNow.tvState.isPlaying
                ) {
                  const cur = Number(player.getCurrentTime?.()) || 0;
                  stNow.sendTVControl('pause', cur);
                }
              } catch {}
            }, 650);
          });
        } catch {
          mountFallbackIframe();
        }
      });

      return () => {
        cancelled = true;
        clearPendingPause();
      };
    }

    // 3. KICK (Official Kick Player Embed)
    if (tvState.platform === 'kick') {
      const iframe = document.createElement('iframe');
      iframe.width = String(DOM_WIDTH);
      iframe.height = String(DOM_HEIGHT);
      iframe.style.border = 'none';
      iframe.style.width = '100%';
      iframe.style.height = '100%';
      iframe.allow = 'autoplay; fullscreen; encrypted-media; picture-in-picture';
      const buildKickSrc = () => {
        const st = useGameStore.getState();
        return `https://player.kick.com/${encodeURIComponent(st.tvState.channel)}?autoplay=${
          st.tvState.isPlaying ? 'true' : 'false'
        }&muted=${st.settings.tvMuted ? 'true' : 'false'}`;
      };
      iframe.src = buildKickSrc();
      tvPlayerBridge.seekToLive = () => {
        iframe.src = buildKickSrc();
      };
      wrapper.appendChild(iframe);
      return;
    }
  }, [tvState.platform, tvState.videoId, tvState.channel, tvState.url]);

  // Host Authoritative Heartbeat Timer (Runs every 3s on Host to keep all players in sync on YouTube, YouTube Live DVR & Twitch VOD)
  useEffect(() => {
    const isYouTubeFamily =
      tvState.platform === 'youtube' || tvState.platform === 'youtube_live';
    const isTwitchVod = tvState.platform === 'twitch' && Boolean(tvState.videoId);
    if (!isYouTubeFamily && !isTwitchVod) return;

    const interval = window.setInterval(() => {
      const store = useGameStore.getState();
      const isHostNow = store.hostId === store.myPlayerId;
      if (!isHostNow || !store.tvState.syncEnabled) return;

      if (isTwitchVod) {
        const tw = twitchPlayerRef.current;
        if (!tw || typeof tw.getCurrentTime !== 'function') return;
        try {
          const isPaused = Boolean(tw.isPaused?.());
          const curTime = Number(tw.getCurrentTime?.()) || 0;
          if (curTime <= 0) return;
          lastHostReportedTimeRef.current = curTime;
          store.sendHostSync(curTime, !isPaused, false);
        } catch {}
        return;
      }

      const player = ytPlayerRef.current;
      if (!player || typeof player.getPlayerState !== 'function') return;

      try {
        const stateCode = player.getPlayerState();
        // Only emit authoritative sync when Host player is actively playing (1) or paused (2)
        if (stateCode !== 1 && stateCode !== 2) return;

        const curTime = Number(player.getCurrentTime?.()) || 0;
        if (curTime <= 0) return;

        const videoData = player.getVideoData?.();
        const detectedLive = Boolean(videoData?.isLive) || store.tvState.isLive;

        // Detect if Host scrubbed the timeline directly inside the YouTube iframe (> 6.5s jump while not in an internal update)
        const expectedTime =
          lastHostReportedTimeRef.current + (stateCode === 1 ? 3.0 : 0);
        if (
          !isInternalUpdate() &&
          stateCode === 1 &&
          lastHostReportedTimeRef.current > 0 &&
          Math.abs(curTime - expectedTime) > 6.5
        ) {
          lastHostReportedTimeRef.current = curTime;
          sendTVControl('seek', curTime);
        } else {
          lastHostReportedTimeRef.current = curTime;
          sendHostSync(curTime, stateCode === 1, detectedLive);
        }
      } catch {}
    }, 3000);

    return () => clearInterval(interval);
  }, [tvState.platform, tvState.videoId, sendHostSync, sendTVControl]);

  // Anti-Stutter Guest & Explicit Command Synchronization Effect
  useEffect(() => {
    const isYouTubeFamily =
      tvState.platform === 'youtube' || tvState.platform === 'youtube_live';
    const isTwitch = tvState.platform === 'twitch';

    // Handle Twitch JS Player play/pause/seek commands
    if (isTwitch) {
      const tw = twitchPlayerRef.current;
      if (!tw) return;
      const isExplicitCommand = tvState.seq !== lastHandledSeqRef.current;
      lastHandledSeqRef.current = tvState.seq;
      try {
        const twPaused = Boolean(tw.isPaused?.());
        if (tvState.isPlaying && twPaused) {
          markInternalUpdate(1100);
          tw.play?.();
        } else if (!tvState.isPlaying && !twPaused) {
          markInternalUpdate(1100);
          tw.pause?.();
        }
        if (
          isExplicitCommand &&
          tvState.videoId &&
          tvState.syncEnabled &&
          tvState.playbackTime > 0
        ) {
          const st = useGameStore.getState();
          const cur = Number(tw.getCurrentTime?.()) || 0;
          const elapsed = tvState.isPlaying
            ? Math.max(0, Math.min(25, (Date.now() - st.tvLastSyncReceivedAt) / 1000))
            : 0;
          const target = tvState.playbackTime + elapsed;
          if (Math.abs(cur - target) > 2.2) {
            markInternalUpdate(1400);
            lastSeekAtRef.current = Date.now();
            tw.seek?.(target);
          }
        }
      } catch {}
      return;
    }

    const player = ytPlayerRef.current;
    if (!player || typeof player.getPlayerState !== 'function' || !isYouTubeFamily) return;

    const store = useGameStore.getState();
    const isHostNow = hostId === myPlayerId;
    const isExplicitCommand = tvState.seq !== lastHandledSeqRef.current;
    lastHandledSeqRef.current = tvState.seq;

    const elapsedSinceSync = tvState.isPlaying
      ? Math.max(0, Math.min(25, (Date.now() - store.tvLastSyncReceivedAt) / 1000))
      : 0;
    const clampLiveTarget = (rawTarget: number) => {
      const dur = Number(player.getDuration?.()) || 0;
      if (tvState.isLive && dur > 5) {
        return Math.min(rawTarget, Math.max(0, dur - 1.5));
      }
      return Math.max(0, rawTarget);
    };

    try {
      const playerState = player.getPlayerState();

      // 1. Handle Explicit User Command (Play / Pause / Seek / ForceSync button clicked)
      if (isExplicitCommand) {
        clearPendingPause();
        if (tvState.isPlaying && playerState !== 1 && playerState !== 3) {
          markInternalUpdate(1200);
          player.playVideo?.();
        } else if (!tvState.isPlaying && playerState === 1) {
          markInternalUpdate(1200);
          player.pauseVideo?.();
        }

        if (tvState.syncEnabled && (tvState.playbackTime > 0 || !tvState.isLive)) {
          const cur = Number(player.getCurrentTime?.()) || 0;
          const target = clampLiveTarget(tvState.playbackTime + elapsedSinceSync);

          // Avoid Host seeking itself on echoed local play/pause commands (prevents seek -> buffering -> pause loops)
          const recentLocal = tvPlayerBridge.lastLocalControl;
          const isHostRecentPlayPause =
            isHostNow &&
            Date.now() - recentLocal.at < 3500 &&
            (recentLocal.action === 'play' || recentLocal.action === 'pause');

          const seekThreshold = isHostRecentPlayPause ? 6.0 : 1.5;
          if (Math.abs(cur - target) > seekThreshold) {
            markInternalUpdate(1500);
            lastSeekAtRef.current = Date.now();
            driftStrikesRef.current = 0;
            player.seekTo?.(target, true);
          }
        }
        return;
      }

      // 2. Background Heartbeat Sync (tv:syncPulse):
      // CRITICAL ANTI-STUTTER RULE: The Host NEVER seeks itself on background heartbeats!
      if (isHostNow || !tvState.syncEnabled) return;

      // Sync play/pause state for Guests
      if (tvState.isPlaying && playerState === 2) {
        markInternalUpdate(1100);
        player.playVideo?.();
        return;
      } else if (!tvState.isPlaying && playerState === 1) {
        markInternalUpdate(1100);
        player.pauseVideo?.();
        return;
      }

      // CRITICAL ANTI-STUTTER RULE: Never call seekTo while player is BUFFERING (3) or UNSTARTED (-1)
      if (playerState !== 1) return;

      // Cooldown guard: wait at least 8 seconds after any seek before considering another drift correction
      const now = Date.now();
      if (now - lastSeekAtRef.current < 8000) return;

      const cur = Number(player.getCurrentTime?.()) || 0;
      if (tvState.playbackTime <= 0 || cur <= 0) return;

      const target = clampLiveTarget(tvState.playbackTime + elapsedSinceSync);
      const drift = target - cur;
      const absDrift = Math.abs(drift);

      // Tier 1: Deadband (< 2.0s) -> Completely in sync, zero action, zero micro-jumps!
      if (absDrift < 2.0) {
        driftStrikesRef.current = 0;
        return;
      }

      // Tier 2: Moderate drift (2.0s .. 4.5s) -> Require 2 consecutive heartbeats (6s+) before seeking
      if (absDrift < 4.5) {
        driftStrikesRef.current += 1;
        if (driftStrikesRef.current >= 2) {
          markInternalUpdate(1500);
          lastSeekAtRef.current = now;
          driftStrikesRef.current = 0;
          player.seekTo?.(clampLiveTarget(target + 0.15), true);
        }
        return;
      }

      // Tier 3: Large desync (>= 4.5s, e.g. late joiner or tab wake-up) -> Single immediate clean seek
      markInternalUpdate(1500);
      lastSeekAtRef.current = now;
      driftStrikesRef.current = 0;
      player.seekTo?.(clampLiveTarget(target + 0.2), true);
    } catch {}
  }, [
    tvState.seq,
    tvState.isPlaying,
    tvState.playbackTime,
    tvState.updatedAt,
    tvState.syncEnabled,
    tvState.platform,
    tvState.videoId,
    tvState.isLive,
    hostId,
    myPlayerId,
  ]);

  useEffect(() => {
    if (ytPlayerRef.current) {
      applyYouTubeVolume(ytPlayerRef.current, settings.tvVolume, settings.tvMuted);
    }
    if (twitchPlayerRef.current) {
      applyTwitchVolume(twitchPlayerRef.current, settings.tvVolume, settings.tvMuted);
    }
    if (!settings.tvMuted && settings.tvVolume > 0) {
      setTVAutoplayBlocked(false);
    }
  }, [settings.tvVolume, settings.tvMuted]);

  // Frustum & Vector helpers for per-frame 3D synchronization
  const frustum = useMemo(() => new THREE.Frustum(), []);
  const projScreenMatrix = useMemo(() => new THREE.Matrix4(), []);
  const tvBoundingBox = useMemo(
    () =>
      new THREE.Box3(
        new THREE.Vector3(
          TV_POSITION[0] - TV_SCREEN_WIDTH / 2,
          TV_POSITION[1] - TV_SCREEN_HEIGHT / 2,
          TV_POSITION[2] - 0.3
        ),
        new THREE.Vector3(
          TV_POSITION[0] + TV_SCREEN_WIDTH / 2,
          TV_POSITION[1] + TV_SCREEN_HEIGHT / 2,
          TV_POSITION[2] + 0.3
        )
      ),
    []
  );

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();

    // Check local player distance to TV for contextual interaction prompt (only when walking close to the TV console)
    const px = localPlayerTransform.position[0] - TV_POSITION[0];
    const pz = localPlayerTransform.position[2] - TV_POSITION[2];
    const distSq = px * px + pz * pz;
    setNearTV(distSq < 18); // within ~4.2m of the TV

    // Animate ambient bias lighting behind the TV
    const colorA = new THREE.Color().setHSL(0.08 + Math.sin(t * 0.5) * 0.04, 0.85, 0.55);
    const colorB = new THREE.Color().setHSL(0.72 + Math.cos(t * 0.4) * 0.06, 0.75, 0.55);

    if (biasLightLeftRef.current && biasLightRightRef.current) {
      biasLightLeftRef.current.color.copy(tvState.isPlaying ? colorA : new THREE.Color('#ff9d42'));
      biasLightRightRef.current.color.copy(tvState.isPlaying ? colorB : new THREE.Color('#7c5cff'));
    }
    if (glowStripMatRef.current) {
      glowStripMatRef.current.color.copy(tvState.isPlaying ? colorA : new THREE.Color('#e5a95c'));
    }

    // Update CSS3DRenderer in lockstep with WebGL camera
    const cssRenderer = cssRendererRef.current;
    const cssScene = cssSceneRef.current;
    const cssObject = cssObjectRef.current;
    const wrapper = screenWrapperDivRef.current;

    if (cssRenderer && cssScene && cssObject && wrapper) {
      camera.updateMatrixWorld();
      projScreenMatrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
      frustum.setFromProjectionMatrix(projScreenMatrix);

      // TV screen normal points toward +Z (z > TV_POSITION[2] + 0.05)
      const isCameraInFrontOfTV = camera.position.z > TV_POSITION[2] + 0.05;
      const isInFrustum = frustum.intersectsBox(tvBoundingBox);
      const shouldShow = Boolean(useIframeHolePunch && isCameraInFrontOfTV && isInFrustum);

      cssObject.visible = shouldShow;
      wrapper.style.visibility = shouldShow ? 'visible' : 'hidden';
      cssRenderer.render(cssScene, camera);
    }

    // If using native 3D visualizer or showing an embed restriction fallback, draw 60fps canvas
    if (!useIframeHolePunch) {
      const ctx = fallbackCtx;
      const w = fallbackCanvas.width;
      const h = fallbackCanvas.height;

      // Deep night synthwave gradient
      const grad = ctx.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, '#070b1c');
      grad.addColorStop(0.55, '#1e133c');
      grad.addColorStop(1, '#3b1538');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      // Glowing Retro-Futuristic Sun
      const sunGrad = ctx.createLinearGradient(0, h * 0.18, 0, h * 0.62);
      sunGrad.addColorStop(0, '#ffcf5c');
      sunGrad.addColorStop(0.5, '#ff6b4a');
      sunGrad.addColorStop(1, '#c026d3');
      ctx.fillStyle = sunGrad;
      ctx.beginPath();
      ctx.arc(w / 2, h * 0.42, 130, 0, Math.PI * 2);
      ctx.fill();

      // Perspective Grid Floor
      ctx.strokeStyle = 'rgba(232, 121, 249, 0.35)';
      ctx.lineWidth = 2;
      const horizonY = h * 0.56;
      for (let i = -12; i <= 12; i++) {
        ctx.beginPath();
        ctx.moveTo(w / 2 + i * 25, horizonY);
        ctx.lineTo(w / 2 + i * 140, h);
        ctx.stroke();
      }
      const scrollOffset = (t * 45) % 30;
      for (let y = horizonY; y < h; y += 28) {
        const py = y + scrollOffset * ((y - horizonY) / (h - horizonY));
        if (py < h) {
          ctx.beginPath();
          ctx.moveTo(0, py);
          ctx.lineTo(w, py);
          ctx.stroke();
        }
      }

      // Audio Equalizer Bars
      const barCount = 36;
      const barWidth = 14;
      const totalBarW = barCount * (barWidth + 6);
      const startX = (w - totalBarW) / 2;
      for (let b = 0; b < barCount; b++) {
        const amp = tvState.isPlaying
          ? 18 +
            Math.abs(Math.sin(t * 4.2 + b * 0.35)) * 65 +
            Math.abs(Math.cos(t * 7.1 - b * 0.2)) * 35
          : 8;
        ctx.fillStyle = b % 2 === 0 ? '#f59e0b' : '#a855f7';
        ctx.fillRect(startX + b * (barWidth + 6), horizonY - amp, barWidth, amp);
      }

      // Header & Status Overlay
      ctx.fillStyle = 'rgba(9, 13, 26, 0.78)';
      ctx.fillRect(40, 32, w - 80, 92);
      ctx.strokeStyle = 'rgba(229, 169, 92, 0.5)';
      ctx.lineWidth = 2;
      ctx.strokeRect(40, 32, w - 80, 92);

      ctx.fillStyle = '#e5a95c';
      ctx.font = 'bold 20px Outfit, sans-serif';
      ctx.fillText('SKYLOUNGE CINEMA 3D', 68, 66);

      ctx.fillStyle = '#f8fafc';
      ctx.font = 'bold 26px Inter, sans-serif';
      ctx.fillText(tvState.title || 'SkyLounge Ambient Visualizer', 68, 104);

      if (tvEmbedError) {
        ctx.fillStyle = 'rgba(127, 29, 29, 0.92)';
        ctx.fillRect(80, h - 150, w - 160, 105);
        ctx.strokeStyle = '#f87171';
        ctx.strokeRect(80, h - 150, w - 160, 105);
        ctx.fillStyle = '#fecaca';
        ctx.font = 'bold 20px Inter, sans-serif';
        ctx.fillText('⚠️ Restrição do Provedor de Mídia:', 108, h - 112);
        ctx.fillStyle = '#ffffff';
        ctx.font = '18px Inter, sans-serif';
        ctx.fillText(tvEmbedError.slice(0, 78), 108, h - 80);
        if (tvEmbedError.length > 78) {
          ctx.fillText(tvEmbedError.slice(78, 156), 108, h - 55);
        }
      }

      fallbackTexture.needsUpdate = true;
    }
  });

  // Toggle WebGL canvas pointer-events when user activates direct interactive TV mode
  useEffect(() => {
    const canvasElem = gl.domElement;
    if (!canvasElem) return;
    if (tvInteractiveMode && useIframeHolePunch) {
      canvasElem.style.pointerEvents = 'none';
    } else {
      canvasElem.style.pointerEvents = 'auto';
    }
    return () => {
      canvasElem.style.pointerEvents = 'auto';
    };
  }, [tvInteractiveMode, useIframeHolePunch, gl]);

  return (
    <group position={TV_POSITION} name="cinema-giant-tv">
      {/* AMBIENT REACTIVE BIAS LIGHTS */}
      <pointLight
        ref={biasLightLeftRef}
        position={[-4.6, 0, 0.8]}
        intensity={1.6}
        distance={14}
        color="#ff9d42"
      />
      <pointLight
        ref={biasLightRightRef}
        position={[4.6, 0, 0.8]}
        intensity={1.6}
        distance={14}
        color="#7c5cff"
      />

      {/* ARCHITECTURAL SUPPORT PILLARS (FLOOR TO CEILING MONOLITH COLUMNS) */}
      <mesh castShadow receiveShadow position={[-3.4, -0.1, -0.22]}>
        <boxGeometry args={[0.38, 6.5, 0.36]} />
        <meshStandardMaterial color="#101420" roughness={0.35} metalness={0.75} />
      </mesh>
      <mesh castShadow receiveShadow position={[3.4, -0.1, -0.22]}>
        <boxGeometry args={[0.38, 6.5, 0.36]} />
        <meshStandardMaterial color="#101420" roughness={0.35} metalness={0.75} />
      </mesh>

      {/* SOLID REAR OBSIDIAN CASING (Blocks view from behind the TV & houses electronics) */}
      <mesh
        castShadow
        receiveShadow
        position={[0, 0, -0.14]}
        onClick={(e) => {
          e.stopPropagation();
          setActiveModal('tv');
        }}
      >
        <boxGeometry args={[TV_SCREEN_WIDTH + 0.56, TV_SCREEN_HEIGHT + 0.56, 0.24]} />
        <meshStandardMaterial color="#0b0e17" roughness={0.3} metalness={0.65} />
      </mesh>

      {/* REAR BRUSHED BRASS LOGO PLATE (Visible when walking behind the TV) */}
      <mesh position={[0, 0, -0.27]}>
        <boxGeometry args={[3.2, 0.8, 0.03]} />
        <meshStandardMaterial color="#c9934b" roughness={0.25} metalness={0.85} />
      </mesh>

      {/* SCULPTED FRONT BEZEL BORDERS (Top, Bottom, Left, Right) */}
      {/* Top Bezel */}
      <mesh castShadow receiveShadow position={[0, TV_SCREEN_HEIGHT / 2 + 0.14, 0.04]}>
        <boxGeometry args={[TV_SCREEN_WIDTH + 0.56, 0.28, 0.18]} />
        <meshStandardMaterial color="#121726" roughness={0.25} metalness={0.8} />
      </mesh>
      {/* Bottom Bezel + Soundbar Speaker Grille */}
      <mesh castShadow receiveShadow position={[0, -TV_SCREEN_HEIGHT / 2 - 0.18, 0.05]}>
        <boxGeometry args={[TV_SCREEN_WIDTH + 0.56, 0.36, 0.22]} />
        <meshStandardMaterial color="#121726" roughness={0.35} metalness={0.75} />
      </mesh>
      {/* Left Bezel */}
      <mesh castShadow receiveShadow position={[-TV_SCREEN_WIDTH / 2 - 0.14, 0, 0.04]}>
        <boxGeometry args={[0.28, TV_SCREEN_HEIGHT, 0.18]} />
        <meshStandardMaterial color="#121726" roughness={0.25} metalness={0.8} />
      </mesh>
      {/* Right Bezel */}
      <mesh castShadow receiveShadow position={[TV_SCREEN_WIDTH / 2 + 0.14, 0, 0.04]}>
        <boxGeometry args={[0.28, TV_SCREEN_HEIGHT, 0.18]} />
        <meshStandardMaterial color="#121726" roughness={0.25} metalness={0.8} />
      </mesh>

      {/* CHAMPAGNE BRASS INNER TRIM ACCENT */}
      <mesh position={[0, TV_SCREEN_HEIGHT / 2 + 0.02, 0.09]}>
        <boxGeometry args={[TV_SCREEN_WIDTH + 0.06, 0.035, 0.04]} />
        <meshStandardMaterial color="#e5a95c" roughness={0.2} metalness={0.9} />
      </mesh>
      <mesh position={[0, -TV_SCREEN_HEIGHT / 2 - 0.02, 0.09]}>
        <boxGeometry args={[TV_SCREEN_WIDTH + 0.06, 0.035, 0.04]} />
        <meshStandardMaterial color="#e5a95c" roughness={0.2} metalness={0.9} />
      </mesh>

      {/* AMBIENT LED GLOW STRIP UNDER SOUNDBAR */}
      <mesh position={[0, -TV_SCREEN_HEIGHT / 2 - 0.37, 0.06]}>
        <boxGeometry args={[TV_SCREEN_WIDTH * 0.85, 0.03, 0.04]} />
        <meshBasicMaterial ref={glowStripMatRef} color="#e5a95c" />
      </mesh>

      {/* LOW MEDIA CONSOLE CREDENZA BELOW THE GIANT TV */}
      <group position={[0, -TV_SCREEN_HEIGHT / 2 - 0.62, 0.25]}>
        <mesh castShadow receiveShadow position={[0, 0, 0]}>
          <boxGeometry args={[7.6, 0.42, 0.95]} />
          <meshStandardMaterial color="#1c1613" roughness={0.45} metalness={0.15} />
        </mesh>
        {/* Marble Credenza Top */}
        <mesh receiveShadow position={[0, 0.22, 0]}>
          <boxGeometry args={[7.68, 0.04, 0.98]} />
          <meshStandardMaterial color="#e2dcd5" roughness={0.2} metalness={0.1} />
        </mesh>
      </group>

      {/* THE 3D PHYSICAL SCREEN SURFACE (Hole-Punch or 3D Canvas Texture) */}
      <mesh
        position={[0, 0, 0.06]}
        renderOrder={useIframeHolePunch ? -10 : 0}
        material={useIframeHolePunch ? holePunchMaterial : fallbackMaterial}
        onClick={(e) => {
          e.stopPropagation();
          setActiveModal('tv');
        }}
      >
        <planeGeometry args={[TV_SCREEN_WIDTH, TV_SCREEN_HEIGHT]} />
      </mesh>
    </group>
  );
};
