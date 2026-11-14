import React, { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { CSS3DRenderer, CSS3DObject } from 'three/examples/jsm/renderers/CSS3DRenderer.js';
import { useGameStore, localPlayerTransform } from '../../store/useGameStore';
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

export const CinemaTV: React.FC = () => {
  const { size, camera, gl } = useThree();
  const tvState = useGameStore((s) => s.tvState);
  const settings = useGameStore((s) => s.settings);
  const tvInteractiveMode = useGameStore((s) => s.tvInteractiveMode);
  const tvEmbedError = useGameStore((s) => s.tvEmbedError);
  const setTVEmbedError = useGameStore((s) => s.setTVEmbedError);
  const setTVAutoplayBlocked = useGameStore((s) => s.setTVAutoplayBlocked);
  const setActiveModal = useGameStore((s) => s.setActiveModal);
  const setNearTV = useGameStore((s) => s.setNearTV);

  const biasLightLeftRef = useRef<THREE.PointLight>(null);
  const biasLightRightRef = useRef<THREE.PointLight>(null);
  const glowStripMatRef = useRef<THREE.MeshBasicMaterial>(null);

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
      if (ytPlayerRef.current) {
        try {
          ytPlayerRef.current.destroy();
        } catch {}
        ytPlayerRef.current = null;
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

    const mediaKey = `${tvState.platform}:${tvState.videoId}:${tvState.channel}:${tvState.url}`;
    if (currentMediaKeyRef.current === mediaKey) return;
    currentMediaKeyRef.current = mediaKey;

    setTVEmbedError(null);
    setTVAutoplayBlocked(false);

    if (ytPlayerRef.current) {
      try {
        ytPlayerRef.current.destroy();
      } catch {}
      ytPlayerRef.current = null;
    }

    wrapper.innerHTML = '';

    if (tvState.platform === 'ambient') {
      wrapper.style.display = 'none';
      return;
    }

    wrapper.style.display = 'block';

    // 1. YOUTUBE & YOUTUBE LIVE (Official YouTube IFrame API)
    if (tvState.platform === 'youtube' || tvState.platform === 'youtube_live') {
      const mountDiv = document.createElement('div');
      mountDiv.id = `yt-player-mount-${Date.now()}`;
      mountDiv.style.width = '100%';
      mountDiv.style.height = '100%';
      wrapper.appendChild(mountDiv);

      let cancelled = false;
      ensureYouTubeApi().then((YT) => {
        if (cancelled || !screenWrapperDivRef.current) return;
        const startSeconds =
          !tvState.isLive && tvState.playbackTime > 1 ? Math.floor(tvState.playbackTime) : 0;

        ytPlayerRef.current = new YT.Player(mountDiv.id, {
          width: String(DOM_WIDTH),
          height: String(DOM_HEIGHT),
          videoId: tvState.videoId,
          playerVars: {
            autoplay: tvState.isPlaying ? 1 : 0,
            controls: 1,
            rel: 0,
            modestbranding: 1,
            playsinline: 1,
            enablejsapi: 1,
            start: startSeconds,
            origin: window.location.origin,
          },
          events: {
            onReady: (event: any) => {
              try {
                const player = event.target;
                const currentSettings = useGameStore.getState().settings;
                player.setVolume(currentSettings.tvVolume);
                if (currentSettings.tvMuted) {
                  player.mute();
                } else {
                  player.unMute();
                }

                const latestTV = useGameStore.getState().tvState;
                if (!latestTV.isLive && latestTV.playbackTime > 2) {
                  const elapsed = latestTV.isPlaying
                    ? (Date.now() - latestTV.updatedAt) / 1000
                    : 0;
                  player.seekTo(latestTV.playbackTime + elapsed, true);
                }

                if (latestTV.isPlaying) {
                  player.playVideo();
                  // Verify after 1.2s if browser blocked unmuted autoplay
                  setTimeout(() => {
                    try {
                      const stateCode = player.getPlayerState?.();
                      if (stateCode !== 1 && stateCode !== 3 && useGameStore.getState().tvState.isPlaying) {
                        // Browser blocked unmuted autoplay: mute & play automatically, and show unmute pill
                        player.mute();
                        player.playVideo();
                        setTVAutoplayBlocked(true);
                      }
                    } catch {}
                  }, 1200);
                } else {
                  player.pauseVideo();
                }
              } catch {}
            },
            onError: (event: any) => {
              const code = event?.data;
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
      };
    }

    // 2. TWITCH (Official Twitch Embed Iframe)
    if (tvState.platform === 'twitch') {
      const parentHost = window.location.hostname || 'localhost';
      const iframe = document.createElement('iframe');
      iframe.width = String(DOM_WIDTH);
      iframe.height = String(DOM_HEIGHT);
      iframe.style.border = 'none';
      iframe.style.width = '100%';
      iframe.style.height = '100%';
      iframe.allow = 'autoplay; fullscreen; encrypted-media; picture-in-picture';

      if (tvState.videoId) {
        iframe.src = `https://player.twitch.tv/?video=${encodeURIComponent(
          tvState.videoId
        )}&parent=${encodeURIComponent(parentHost)}&autoplay=${tvState.isPlaying ? 'true' : 'false'}&muted=${
          settings.tvMuted ? 'true' : 'false'
        }`;
      } else {
        iframe.src = `https://player.twitch.tv/?channel=${encodeURIComponent(
          tvState.channel
        )}&parent=${encodeURIComponent(parentHost)}&autoplay=${tvState.isPlaying ? 'true' : 'false'}&muted=${
          settings.tvMuted ? 'true' : 'false'
        }`;
      }
      wrapper.appendChild(iframe);
      return;
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
      iframe.src = `https://player.kick.com/${encodeURIComponent(tvState.channel)}?autoplay=${
        tvState.isPlaying ? 'true' : 'false'
      }&muted=${settings.tvMuted ? 'true' : 'false'}`;
      wrapper.appendChild(iframe);
      return;
    }
  }, [tvState.platform, tvState.videoId, tvState.channel, tvState.url]);

  // Synchronize Play / Pause / Seek / Volume on YouTube IFrame API
  useEffect(() => {
    const player = ytPlayerRef.current;
    if (!player || typeof player.getPlayerState !== 'function') return;

    try {
      if (tvState.isPlaying) {
        player.playVideo?.();
      } else {
        player.pauseVideo?.();
      }

      if (!tvState.isLive && tvState.platform === 'youtube') {
        const current = player.getCurrentTime?.() || 0;
        const target =
          tvState.playbackTime +
          (tvState.isPlaying ? Math.max(0, (Date.now() - tvState.updatedAt) / 1000) : 0);
        if (Math.abs(current - target) > 3.0) {
          player.seekTo?.(target, true);
        }
      }
    } catch {}
  }, [tvState.isPlaying, tvState.playbackTime, tvState.updatedAt, tvState.isLive, tvState.platform]);

  useEffect(() => {
    const player = ytPlayerRef.current;
    if (!player) return;
    try {
      player.setVolume?.(settings.tvVolume);
      if (settings.tvMuted) {
        player.mute?.();
      } else {
        player.unMute?.();
        setTVAutoplayBlocked(false);
      }
    } catch {}
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

    // Check local player distance to TV for contextual interaction prompt
    const px = localPlayerTransform.position[0] - TV_POSITION[0];
    const pz = localPlayerTransform.position[2] - TV_POSITION[2];
    const distSq = px * px + pz * pz;
    setNearTV(distSq < 85); // within ~9.2m of the TV

    // Animate ambient bias lighting behind the TV
    const hueShift = (t * 0.08) % 1;
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
