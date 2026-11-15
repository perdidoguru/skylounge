import React, { useRef, useMemo, useState, useEffect, useLayoutEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html, useAnimations, useGLTF } from '@react-three/drei';
import { clone } from 'three/examples/jsm/utils/SkeletonUtils.js';
import * as THREE from 'three';
import {
  AnimationState,
  AvatarBodyStyle,
  AvatarCustomization,
  SeatPosture,
} from '../../../shared/types';
import { SEAT_MAP } from '../../../shared/seats';
import { localPlayerTransform } from '../../store/useGameStore';
import { prepareAvatar } from '../../avatars/avatar.mjs';

interface StylizedAvatarProps {
  customization: AvatarCustomization;
  animation: AnimationState;
  seatId?: string | null;
  headYaw?: number;
  headPitch?: number;
  isHost?: boolean;
  isLocal?: boolean;
  lastMessage?: {
    text: string;
    timestamp: number;
  };
  showLabel?: boolean;
  previewMode?: boolean;
}

function resolveClipName(
  anim: AnimationState,
  seatId: string | null | undefined,
  isTalking: boolean
): string {
  if (anim === 'sit') {
    const posture: SeatPosture = (seatId && SEAT_MAP[seatId]?.posture) || 'sofa';
    return `sit_${posture}`;
  }
  if (anim === 'idle' && isTalking) {
    return 'talk_gesture';
  }
  return anim;
}

const tempHeadWorldPos = new THREE.Vector3();
const tempRootWorldPos = new THREE.Vector3();

const StylizedAvatarModel: React.FC<StylizedAvatarProps> = ({
  customization,
  animation,
  seatId = null,
  headYaw = 0,
  headPitch = 0,
  isHost = false,
  isLocal = false,
  lastMessage,
  showLabel = true,
  previewMode = false,
}) => {
  const rootRef = useRef<THREE.Group>(null);
  const labelAnchorRef = useRef<THREE.Group>(null);

  const { scene, animations } = useGLTF('/models/avatars.glb');

  const instance = useMemo(() => {
    const root = clone(scene);
    const ui = prepareAvatar(root);
    const head = root.getObjectByName('Head') || null;
    return { root, ui, head };
  }, [scene]);

  const { actions } = useAnimations(animations, instance.root);

  const look = useMemo(
    () => ({
      euler: new THREE.Euler(0, 0, 0, 'YXZ'),
      q: new THREE.Quaternion(),
    }),
    []
  );

  const clock = useRef(Math.random() * 6);
  const nextBlink = useRef(2 + Math.random() * 2);
  const mouth = useRef(0);
  const activeClipRef = useRef<string>('');
  const initialPhaseOffset = useRef(isLocal || previewMode ? 0 : Math.random() * 1.8);

  const [activeBubbleText, setActiveBubbleText] = useState<string | null>(null);

  useEffect(() => {
    if (!lastMessage?.text) {
      setActiveBubbleText(null);
      return;
    }
    const elapsed = Date.now() - lastMessage.timestamp;
    const remaining = 6500 - elapsed;
    if (remaining <= 0) {
      setActiveBubbleText(null);
      return;
    }
    setActiveBubbleText(lastMessage.text);
    const timer = setTimeout(() => {
      setActiveBubbleText(null);
    }, remaining);
    return () => clearTimeout(timer);
  }, [lastMessage]);

  const effectiveBodyStyle: AvatarBodyStyle =
    customization.bodyStyle ||
    (['dress', 'skirt_set', 'offshoulder', 'jumpsuit'].includes(customization.outfitStyle)
      ? 'feminine'
      : 'masculine');

  const appearance = useMemo(
    () => ({
      bodyStyle: effectiveBodyStyle,
      outfitStyle: customization.outfitStyle,
      hairStyle: customization.hairStyle,
      accessory:
        !customization.accessory || customization.accessory === 'none'
          ? null
          : customization.accessory,
      skinColor: customization.skinColor,
      primaryColor: customization.primaryColor,
      secondaryColor: customization.secondaryColor,
      hairColor: customization.hairColor,
    }),
    [
      effectiveBodyStyle,
      customization.outfitStyle,
      customization.hairStyle,
      customization.accessory,
      customization.skinColor,
      customization.primaryColor,
      customization.secondaryColor,
      customization.hairColor,
    ]
  );

  // Apply modular body, outfit, hair, accessory & colors before first paint
  useLayoutEffect(() => {
    instance.ui.apply(appearance);
  }, [instance, appearance]);

  // Clean up cloned materials & skeletons on unmount
  useEffect(
    () => () => {
      instance.ui.dispose();
      const skeletons = new Set<THREE.Skeleton>();
      instance.root.traverse((n) => {
        if ((n as THREE.SkinnedMesh).isSkinnedMesh) {
          skeletons.add((n as THREE.SkinnedMesh).skeleton);
        }
      });
      for (const s of skeletons) {
        s.dispose();
      }
    },
    [instance]
  );

  const isTalking = Boolean(activeBubbleText);
  const propClipName = resolveClipName(animation, seatId, isTalking);

  // Play / Crossfade skeletal animation clips when React props change
  useEffect(() => {
    if (!actions) return;
    const nextAction = actions[propClipName] || actions.idle;
    if (!nextAction) return;

    const prevClip = activeClipRef.current;
    if (prevClip && prevClip !== propClipName && actions[prevClip]) {
      actions[prevClip]?.fadeOut(0.18);
    }

    nextAction.reset().fadeIn(0.18).play();
    if (!prevClip && initialPhaseOffset.current > 0) {
      nextAction.time = initialPhaseOffset.current;
    }
    activeClipRef.current = propClipName;
  }, [actions, propClipName]);

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.1);
    clock.current += dt;
    const t = clock.current;

    // Ensure local player animation transitions immediately at 60fps
    const liveAnim: AnimationState = isLocal ? localPlayerTransform.animation : animation;
    const desiredClip = resolveClipName(liveAnim, seatId, Boolean(activeBubbleText));
    if (actions && desiredClip !== activeClipRef.current) {
      const prevClip = activeClipRef.current;
      if (prevClip && actions[prevClip]) {
        actions[prevClip]?.fadeOut(0.16);
      }
      const nextAction = actions[desiredClip] || actions.idle;
      if (nextAction) {
        nextAction.reset().fadeIn(0.16).play();
        activeClipRef.current = desiredClip;
      }
    }

    // Lobby 3D preview rotation & vertical framing when testing 'sit' in preview mode
    if (previewMode && rootRef.current) {
      rootRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.65) * 0.38;
      const targetPreviewY = liveAnim === 'sit' ? 0.52 : 0;
      instance.root.position.y = THREE.MathUtils.damp(
        instance.root.position.y,
        targetPreviewY,
        10,
        dt
      );
    }

    // Periodic natural eye blink via 'blink' morph target on Face
    const elapsed = t - nextBlink.current;
    const blink =
      elapsed >= 0 && elapsed <= 0.18 ? Math.sin((Math.PI * elapsed) / 0.18) : 0;
    if (elapsed > 0.18) {
      nextBlink.current = t + 2.5 + Math.random() * 2.7;
    }
    instance.ui.expression('blink', blink);

    // Procedural mouth animation via 'talk' morph target when speech bubble is active
    const talking = Boolean(activeBubbleText);
    mouth.current = THREE.MathUtils.damp(
      mouth.current,
      talking ? 0.5 + 0.35 * Math.sin(17 * t) : 0,
      18,
      dt
    );
    instance.ui.expression('talk', mouth.current);

    // Apply camera headYaw & headPitch on top of the animation mixer's Head track
    const activeHeadYaw = isLocal ? localPlayerTransform.headYaw : headYaw;
    const activeHeadPitch = isLocal ? localPlayerTransform.headPitch : headPitch;
    if (instance.head) {
      look.euler.set(activeHeadPitch, activeHeadYaw, 0, 'YXZ');
      instance.head.quaternion.multiply(look.q.setFromEuler(look.euler));
    }

    // Keep overhead name tag & speech bubble anchored smoothly above the animated 3D Head bone
    if (labelAnchorRef.current) {
      if (instance.head) {
        instance.head.getWorldPosition(tempHeadWorldPos);
        instance.root.getWorldPosition(tempRootWorldPos);
        const headRelY = tempHeadWorldPos.y - tempRootWorldPos.y;
        const targetLabelY = Math.max(0.95, headRelY + 0.38);
        labelAnchorRef.current.position.y = THREE.MathUtils.damp(
          labelAnchorRef.current.position.y,
          targetLabelY,
          14,
          dt
        );
      } else {
        const fallbackY = liveAnim === 'sit' ? 1.28 : 1.88;
        labelAnchorRef.current.position.y = THREE.MathUtils.damp(
          labelAnchorRef.current.position.y,
          fallbackY,
          14,
          dt
        );
      }
    }
  });

  const activeAnimForShadow: AnimationState = isLocal ? localPlayerTransform.animation : animation;

  return (
    <group ref={rootRef}>
      {/* Subtle ground contact shadow disc (hidden when seated on furniture) */}
      {activeAnimForShadow !== 'sit' && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
          <circleGeometry args={[0.36, 24]} />
          <meshBasicMaterial color="#000000" transparent opacity={0.32} depthWrite={false} />
        </mesh>
      )}

      {/* Rigged & Skinned 3D GLTF Avatar Instance */}
      <primitive object={instance.root} dispose={null} />

      {/* OVERHEAD NAME TAG & COMPACT SPEECH BUBBLE */}
      {showLabel && !previewMode && (
        <group ref={labelAnchorRef} position={[0, 1.88, 0]}>
          <Html
            position={[0, 0, 0]}
            center
            distanceFactor={9}
            zIndexRange={[10, 0]}
            style={{ pointerEvents: 'none' }}
          >
            <div className="flex flex-col items-center gap-0.5 select-none pointer-events-none w-max">
              {activeBubbleText && (
                <div
                  style={{ width: 'max-content', maxWidth: '235px' }}
                  className="relative w-max max-w-[235px] px-2.5 py-1 rounded-lg bg-slate-950/82 border border-amber-400/35 text-[10px] leading-tight text-slate-100 font-medium shadow-md backdrop-blur-md text-center whitespace-normal break-words"
                >
                  {activeBubbleText}
                  <span className="absolute left-1/2 -bottom-1 -translate-x-1/2 w-1.5 h-1.5 rotate-45 bg-slate-950/82 border-r border-b border-amber-400/35" />
                </div>
              )}
              {!(isLocal && activeAnimForShadow === 'sit') && (
                <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-slate-950/45 border border-white/10 backdrop-blur-sm shadow-sm whitespace-nowrap opacity-70">
                  {isHost && (
                    <span className="text-[8px] text-amber-400" title="Anfitrião da Sala">
                      👑
                    </span>
                  )}
                  <span
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ backgroundColor: customization.primaryColor }}
                  />
                  <span
                    className={`text-[9px] font-medium tracking-wide ${
                      isLocal ? 'text-amber-300/90' : 'text-slate-100/90'
                    }`}
                  >
                    {customization.name}
                  </span>
                </div>
              )}
            </div>
          </Html>
        </group>
      )}
    </group>
  );
};

export const StylizedAvatar: React.FC<StylizedAvatarProps> = (props) => (
  <React.Suspense fallback={null}>
    <StylizedAvatarModel {...props} />
  </React.Suspense>
);

useGLTF.preload('/models/avatars.glb');
