import React, { useEffect, useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore, localPlayerTransform } from '../../store/useGameStore';
import { StylizedAvatar } from '../characters/StylizedAvatar';
import { SEAT_MAP, PENTHOUSE_SEATS } from '../../../shared/seats';
import { TV_POSITION } from '../world/CinemaTV';
import { soundFX } from '../../utils/soundEffects';
import { AnimationState } from '../../../shared/types';

interface AABB2D {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  minY?: number;
  maxY?: number;
}

const SOLID_OBSTACLES: AABB2D[] = [
  // Giant TV & Credenza
  { minX: -4.75, maxX: 4.75, minZ: -11.0, maxZ: -9.65 },
  // Cinema Coffee Table
  { minX: -1.65, maxX: 1.65, minZ: -5.95, maxZ: -4.25 },
  // Main Front Sofa Frame
  { minX: -3.4, maxX: 3.4, minZ: -3.85, maxZ: -2.55 },
  // Left & Right Chaise Wings
  { minX: -4.75, maxX: -3.5, minZ: -6.8, maxZ: -3.5 },
  { minX: 3.5, maxX: 4.75, minZ: -6.8, maxZ: -3.5 },
  // VIP Back Sofa Frame
  { minX: -2.5, maxX: 2.5, minZ: -0.15, maxZ: 1.05 },
  // East Mezzanine Bar Counter & Back Shelf
  { minX: 11.65, maxX: 13.15, minZ: -5.2, maxZ: 1.8, minY: 0.9 },
  { minX: 14.0, maxX: 15.0, minZ: -4.5, maxZ: 1.2, minY: 0.9 },
  // West Bookshelf Divider
  { minX: -11.85, maxX: -9.35, minZ: -6.65, maxZ: -5.95 },
];

function getFloorElevation(x: number, z: number): number {
  // East Mezzanine Deck
  if (x >= 8.2 && x <= 15.8 && z >= -8.5 && z <= 5.5) {
    return 1.2;
  }
  // Mezzanine Staircase Ramp (x: 8.6 to 12.6, z: 5.5 to 8.1)
  if (x >= 8.5 && x <= 12.7 && z > 5.5 && z <= 8.1) {
    const t = 1 - (z - 5.5) / (8.1 - 5.5);
    return Math.max(0, Math.min(1.2, t * 1.2));
  }
  // VIP Sofa Riser
  if (x >= -2.9 && x <= 2.9 && z >= -0.6 && z <= 1.35) {
    return 0.2;
  }
  return 0.0;
}

function resolveHorizontalCollisions(
  nextX: number,
  nextZ: number,
  prevX: number,
  prevZ: number,
  currentY: number
): [number, number] {
  const radius = 0.36;
  let x = Math.max(-15.35, Math.min(15.35, nextX));
  let z = Math.max(-11.35, Math.min(11.35, nextZ));

  // Prevent walking through the 1.2m mezzanine cliff wall from the ground floor
  const inMezzanineBox = x + radius > 8.15 && x - radius < 15.9 && z + radius > -8.6 && z - radius < 5.55;
  if (inMezzanineBox && currentY < 0.75) {
    if (prevX <= 8.15 - radius) {
      x = 8.15 - radius;
    } else if (prevZ <= -8.6 - radius) {
      z = -8.6 - radius;
    } else if (prevZ >= 5.55 + radius) {
      z = 5.55 + radius;
    }
  }

  for (const box of SOLID_OBSTACLES) {
    if (box.minY !== undefined && currentY < box.minY) continue;
    if (
      x + radius > box.minX &&
      x - radius < box.maxX &&
      z + radius > box.minZ &&
      z - radius < box.maxZ
    ) {
      const overlapLeft = x + radius - box.minX;
      const overlapRight = box.maxX - (x - radius);
      const overlapTop = z + radius - box.minZ;
      const overlapBottom = box.maxZ - (z - radius);
      const minOverlap = Math.min(overlapLeft, overlapRight, overlapTop, overlapBottom);

      if (minOverlap === overlapLeft) x = box.minX - radius;
      else if (minOverlap === overlapRight) x = box.maxX + radius;
      else if (minOverlap === overlapTop) z = box.minZ - radius;
      else z = box.maxZ + radius;
    }
  }

  return [x, z];
}

function normalizeAngle(angle: number): number {
  let a = angle;
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}

export const PlayerController: React.FC = () => {
  const { camera, gl } = useThree();

  const customization = useGameStore((s) => s.customization);
  const myPlayerId = useGameStore((s) => s.myPlayerId);
  const hostId = useGameStore((s) => s.hostId);
  const mySeatId = useGameStore((s) => s.mySeatId);
  const activeEmote = useGameStore((s) => s.activeEmote);
  const players = useGameStore((s) => s.players);
  const seats = useGameStore((s) => s.seats);
  const settings = useGameStore((s) => s.settings);
  const chatInputFocused = useGameStore((s) => s.chatInputFocused);
  const activeModal = useGameStore((s) => s.activeModal);
  const sendMoveUpdate = useGameStore((s) => s.sendMoveUpdate);
  const clearActiveEmote = useGameStore((s) => s.clearActiveEmote);
  const sitOnSeat = useGameStore((s) => s.sitOnSeat);
  const standUp = useGameStore((s) => s.standUp);
  const setNearbySeatId = useGameStore((s) => s.setNearbySeatId);
  const setActiveModal = useGameStore((s) => s.setActiveModal);
  const setTVInteractiveMode = useGameStore((s) => s.setTVInteractiveMode);

  const avatarGroupRef = useRef<THREE.Group>(null);
  const keysPressed = useRef<Record<string, boolean>>({});
  const velocityY = useRef(0);
  const isGrounded = useRef(true);
  const lastNetworkSend = useRef(0);
  const lastFootstepTime = useRef(0);
  const smoothedCameraPos = useRef(new THREE.Vector3(0, 3.2, 11.5));
  const smoothedLookTarget = useRef(new THREE.Vector3(0, 1.4, 6.5));
  const currentAnimState = useRef<AnimationState>('idle');
  const satDownAtRef = useRef(0);
  const [liveAnimState, setLiveAnimState] = useState<AnimationState>('idle');

  const myLastMessage = players[myPlayerId]?.lastMessage;

  // Clear held movement keys when sitting down so held W/Space doesn't immediately stand back up
  useEffect(() => {
    if (mySeatId) {
      satDownAtRef.current = performance.now();
      keysPressed.current = {};
      localPlayerTransform.animation = 'sit';
      currentAnimState.current = 'sit';
      setLiveAnimState('sit');
    }
  }, [mySeatId]);

  // Keyboard & Roblox-Style HOLD Right Mouse Button Camera Controls
  useEffect(() => {
    const canvas = gl.domElement;

    const releaseRightMouseLook = () => {
      localPlayerTransform.isRightMouseDown = false;
      localPlayerTransform.isPointerLocked = false;
      if (document.pointerLockElement === canvas) {
        try {
          document.exitPointerLock();
        } catch {}
      }
      document.body.style.cursor = 'default';
    };

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

    const handleMouseDown = (e: MouseEvent) => {
      // Right Mouse Button (button === 2) HOLD to orbit camera
      if (e.button === 2) {
        e.preventDefault();
        // If user was in TV interactive mode, holding RMB restores 3D camera control
        useGameStore.getState().setTVInteractiveMode(false);
        localPlayerTransform.isRightMouseDown = true;
        document.body.style.cursor = 'grabbing';
        try {
          canvas.requestPointerLock?.();
        } catch {}
      }
    };

    const handleMouseUp = (e: MouseEvent) => {
      if (e.button === 2) {
        releaseRightMouseLook();
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!localPlayerTransform.isRightMouseDown) return;

      // Safety check: if right mouse button is no longer held in e.buttons bitmask (bit 2 = value 2), release immediately
      if (typeof e.buttons === 'number' && (e.buttons & 2) === 0 && !document.pointerLockElement) {
        releaseRightMouseLook();
        return;
      }

      const sens = 0.0032 * (useGameStore.getState().settings.mouseSensitivity || 1.0);
      localPlayerTransform.cameraYaw -= e.movementX * sens;
      localPlayerTransform.cameraPitch = Math.max(
        -0.22,
        Math.min(1.22, localPlayerTransform.cameraPitch + e.movementY * sens)
      );
    };

    const handleWheel = (e: WheelEvent) => {
      if (useGameStore.getState().activeModal !== 'none') return;
      localPlayerTransform.cameraDistance = Math.max(
        2.1,
        Math.min(10.8, localPlayerTransform.cameraDistance + e.deltaY * 0.0045)
      );
    };

    const handlePointerLockChange = () => {
      const locked = document.pointerLockElement === canvas;
      localPlayerTransform.isPointerLocked = locked;
      if (!locked && !localPlayerTransform.isRightMouseDown) {
        document.body.style.cursor = 'default';
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      const state = useGameStore.getState();
      if (state.chatInputFocused || state.activeModal !== 'none') {
        if (e.key === 'Escape' && state.activeModal !== 'none') {
          state.setActiveModal('none');
        }
        return;
      }

      const code = e.code;
      keysPressed.current[code] = true;

      // [E] Interact with Seat or TV
      if (code === 'KeyE' && !e.repeat) {
        if (state.mySeatId) {
          state.standUp();
        } else if (state.nearbySeatId) {
          state.sitOnSeat(state.nearbySeatId);
        } else if (state.nearTV) {
          state.setActiveModal('tv');
        }
      }

      // [T] Open TV Remote quickly
      if (code === 'KeyT' && !e.repeat) {
        state.setActiveModal('tv');
      }

      // Number keys 1-4 for quick Emotes
      if (!e.repeat) {
        if (code === 'Digit1') state.triggerEmote('wave');
        if (code === 'Digit2') state.triggerEmote('dance');
        if (code === 'Digit3') state.triggerEmote('cheer');
        if (code === 'Digit4') state.triggerEmote('laugh');
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysPressed.current[e.code] = false;
    };

    const handleBlur = () => {
      keysPressed.current = {};
      releaseRightMouseLook();
    };

    canvas.addEventListener('contextmenu', handleContextMenu);
    canvas.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('wheel', handleWheel, { passive: true });
    document.addEventListener('pointerlockchange', handlePointerLockChange);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleBlur);

    return () => {
      canvas.removeEventListener('contextmenu', handleContextMenu);
      canvas.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('wheel', handleWheel);
      document.removeEventListener('pointerlockchange', handlePointerLockChange);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
      releaseRightMouseLook();
    };
  }, [gl]);

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.1);
    const now = performance.now();

    let [px, py, pz] = localPlayerTransform.position;
    let rotY = localPlayerTransform.rotationY;

    // 1. Check if seated
    if (mySeatId && SEAT_MAP[mySeatId]) {
      const seat = SEAT_MAP[mySeatId];

      // Allow WASD or Space to stand up intuitively (only after 400ms cooldown from sitting down)
      const wantsToMove =
        now - satDownAtRef.current > 400 &&
        !chatInputFocused &&
        activeModal === 'none' &&
        (keysPressed.current['KeyW'] ||
          keysPressed.current['KeyS'] ||
          keysPressed.current['KeyA'] ||
          keysPressed.current['KeyD'] ||
          keysPressed.current['ArrowUp'] ||
          keysPressed.current['ArrowDown'] ||
          keysPressed.current['ArrowLeft'] ||
          keysPressed.current['ArrowRight'] ||
          keysPressed.current['Space']);

      if (wantsToMove) {
        keysPressed.current = {};
        const exitX = seat.position[0] + Math.sin(seat.rotationY) * 0.85;
        const exitZ = seat.position[2] + Math.cos(seat.rotationY) * 0.85;
        const exitY = getFloorElevation(exitX, exitZ);
        standUp([exitX, exitY, exitZ]);
      } else {
        // Smoothly interpolate onto the exact seat position & rotation
        px = THREE.MathUtils.damp(px, seat.position[0], 14, dt);
        py = THREE.MathUtils.damp(py, seat.position[1], 14, dt);
        pz = THREE.MathUtils.damp(pz, seat.position[2], 14, dt);
        const angleDiff = normalizeAngle(seat.rotationY - rotY);
        rotY += angleDiff * Math.min(1, dt * 12);

        const nextSeatedAnim: AnimationState = activeEmote === 'wave' ? 'wave' : 'sit';
        localPlayerTransform.position = [px, py, pz];
        localPlayerTransform.rotationY = rotY;
        localPlayerTransform.animation = nextSeatedAnim;
      }
    } else {
      // 2. Free Third-Person Movement (WASD + Shift + Space)
      let moveForward = 0;
      let moveRight = 0;

      if (!chatInputFocused && activeModal === 'none') {
        if (keysPressed.current['KeyW'] || keysPressed.current['ArrowUp']) moveForward += 1;
        if (keysPressed.current['KeyS'] || keysPressed.current['ArrowDown']) moveForward -= 1;
        if (keysPressed.current['KeyD'] || keysPressed.current['ArrowRight']) moveRight += 1;
        if (keysPressed.current['KeyA'] || keysPressed.current['ArrowLeft']) moveRight -= 1;
      }

      const isMoving = moveForward !== 0 || moveRight !== 0;
      const isRunning =
        isMoving && (keysPressed.current['ShiftLeft'] || keysPressed.current['ShiftRight']);

      if (isMoving && activeEmote) {
        clearActiveEmote();
      }

      if (isMoving) {
        const inputLen = Math.hypot(moveForward, moveRight);
        const normF = moveForward / inputLen;
        const normR = moveRight / inputLen;

        // Calculate world movement vector relative to Camera Yaw
        const camYaw = localPlayerTransform.cameraYaw;
        const forwardX = -Math.sin(camYaw);
        const forwardZ = -Math.cos(camYaw);
        const rightX = Math.cos(camYaw);
        const rightZ = -Math.sin(camYaw);

        const moveDirX = forwardX * normF + rightX * normR;
        const moveDirZ = forwardZ * normF + rightZ * normR;

        const moveSpeed = isRunning ? 6.4 : 3.7;
        const rawNextX = px + moveDirX * moveSpeed * dt;
        const rawNextZ = pz + moveDirZ * moveSpeed * dt;

        const [resolvedX, resolvedZ] = resolveHorizontalCollisions(rawNextX, rawNextZ, px, pz, py);
        px = resolvedX;
        pz = resolvedZ;

        // Smoothly rotate character toward movement direction
        const targetYaw = Math.atan2(moveDirX, moveDirZ);
        const angleDiff = normalizeAngle(targetYaw - rotY);
        rotY += angleDiff * Math.min(1, dt * 14);

        // Footstep sound feedback
        const stepInterval = isRunning ? 290 : 440;
        if (isGrounded.current && now - lastFootstepTime.current > stepInterval) {
          lastFootstepTime.current = now;
          soundFX.playFootstep(isRunning);
        }
      }

      // Vertical Jump & Floor/Stair Elevation Physics
      const floorY = getFloorElevation(px, pz);
      if (
        !chatInputFocused &&
        activeModal === 'none' &&
        keysPressed.current['Space'] &&
        isGrounded.current
      ) {
        velocityY.current = 2.6;
        isGrounded.current = false;
        if (activeEmote) clearActiveEmote();
      }

      if (!isGrounded.current || py > floorY + 0.05) {
        velocityY.current -= 9.5 * dt; // Gravity paired with the visual GLB jump clip
        py += velocityY.current * dt;
        if (py <= floorY) {
          py = floorY;
          velocityY.current = 0;
          isGrounded.current = true;
        }
      } else {
        // Smoothly follow stair/riser elevation changes
        py = THREE.MathUtils.damp(py, floorY, 18, dt);
      }

      // Determine Animation State
      let nextAnim: AnimationState = 'idle';
      if (!isGrounded.current) {
        nextAnim = 'jump';
      } else if (isMoving) {
        nextAnim = isRunning ? 'run' : 'walk';
      } else if (activeEmote) {
        nextAnim = activeEmote;
      }

      localPlayerTransform.position = [px, py, pz];
      localPlayerTransform.rotationY = rotY;
      localPlayerTransform.animation = nextAnim;
    }

    const animChanged = currentAnimState.current !== localPlayerTransform.animation;
    if (animChanged) {
      currentAnimState.current = localPlayerTransform.animation;
      setLiveAnimState(localPlayerTransform.animation);
    }

    // 3. Find Closest Available Seat for Contextual Prompt
    if (!mySeatId) {
      let closestId: string | null = null;
      let closestDistSq = 2.65 * 2.65;
      for (const seat of PENTHOUSE_SEATS) {
        const occupant = seats[seat.id];
        if (occupant && occupant !== myPlayerId) continue;
        const seatFloorY = seat.zone === 'bar' ? 1.2 : seat.posture === 'vip' ? 0.2 : 0.0;
        if (Math.abs(py - seatFloorY) > 0.95) continue;
        const dx = px - seat.position[0];
        const dz = pz - seat.position[2];
        const dSq = dx * dx + dz * dz;
        if (dSq < closestDistSq) {
          closestDistSq = dSq;
          closestId = seat.id;
        }
      }
      setNearbySeatId(closestId);
    } else {
      setNearbySeatId(null);
    }

    // 4. Subtle Head Look toward Camera/TV
    const toTVX = TV_POSITION[0] - px;
    const toTVZ = TV_POSITION[2] - pz;
    const distToTV = Math.hypot(toTVX, toTVZ);
    let targetHeadYaw = 0;
    let targetHeadPitch = 0;

    if (distToTV < 11.5) {
      const worldAngleToTV = Math.atan2(toTVX, toTVZ);
      const relAngle = normalizeAngle(worldAngleToTV - rotY);
      if (Math.abs(relAngle) < 1.15) {
        targetHeadYaw = THREE.MathUtils.clamp(relAngle * 0.55, -0.65, 0.65);
        targetHeadPitch = -0.12;
      }
    }
    localPlayerTransform.headYaw = THREE.MathUtils.damp(
      localPlayerTransform.headYaw,
      targetHeadYaw,
      8,
      dt
    );
    localPlayerTransform.headPitch = THREE.MathUtils.damp(
      localPlayerTransform.headPitch,
      targetHeadPitch,
      8,
      dt
    );

    // 5. Update Local 3D Avatar Group Transform directly
    if (avatarGroupRef.current) {
      avatarGroupRef.current.position.set(px, py, pz);
      avatarGroupRef.current.rotation.y = rotY;
    }

    // 6. Third-Person Orbital Camera with Wall Collision Prevention
    const pivotHeight = mySeatId ? 1.18 : 1.42;
    const desiredTarget = new THREE.Vector3(px, py + pivotHeight, pz);
    smoothedLookTarget.current.lerp(desiredTarget, Math.min(1, dt * 16));

    const dist = localPlayerTransform.cameraDistance;
    const pitch = localPlayerTransform.cameraPitch;
    const yaw = localPlayerTransform.cameraYaw;

    const offsetX = Math.sin(yaw) * Math.cos(pitch) * dist;
    const offsetY = Math.sin(pitch) * dist;
    const offsetZ = Math.cos(yaw) * Math.cos(pitch) * dist;

    // Ray-clamp camera inside Penthouse perimeter walls & ceiling/floor so camera never clips outside
    let safeFraction = 1.0;
    const rawCamX = smoothedLookTarget.current.x + offsetX;
    const rawCamY = smoothedLookTarget.current.y + offsetY;
    const rawCamZ = smoothedLookTarget.current.z + offsetZ;

    const minWallX = -15.55;
    const maxWallX = 15.55;
    const minWallZ = -11.55;
    const maxWallZ = 11.55;
    const minFloorY = getFloorElevation(rawCamX, rawCamZ) + 0.35;
    const maxCeilY = 6.15;

    if (rawCamX < minWallX && offsetX !== 0) {
      safeFraction = Math.min(safeFraction, (minWallX - smoothedLookTarget.current.x) / offsetX);
    } else if (rawCamX > maxWallX && offsetX !== 0) {
      safeFraction = Math.min(safeFraction, (maxWallX - smoothedLookTarget.current.x) / offsetX);
    }
    if (rawCamZ < minWallZ && offsetZ !== 0) {
      safeFraction = Math.min(safeFraction, (minWallZ - smoothedLookTarget.current.z) / offsetZ);
    } else if (rawCamZ > maxWallZ && offsetZ !== 0) {
      safeFraction = Math.min(safeFraction, (maxWallZ - smoothedLookTarget.current.z) / offsetZ);
    }
    if (rawCamY < minFloorY && offsetY !== 0) {
      safeFraction = Math.min(safeFraction, (minFloorY - smoothedLookTarget.current.y) / offsetY);
    } else if (rawCamY > maxCeilY && offsetY !== 0) {
      safeFraction = Math.min(safeFraction, (maxCeilY - smoothedLookTarget.current.y) / offsetY);
    }

    safeFraction = Math.max(0.22, Math.min(1.0, safeFraction));

    const desiredCamPos = new THREE.Vector3(
      smoothedLookTarget.current.x + offsetX * safeFraction,
      smoothedLookTarget.current.y + offsetY * safeFraction,
      smoothedLookTarget.current.z + offsetZ * safeFraction
    );

    smoothedCameraPos.current.lerp(desiredCamPos, Math.min(1, dt * 18));
    camera.position.copy(smoothedCameraPos.current);
    camera.lookAt(smoothedLookTarget.current);

    // 7. Broadcast Network Transform (~20Hz, or immediately whenever animation state changes!)
    if (animChanged || now - lastNetworkSend.current > 48) {
      lastNetworkSend.current = now;
      sendMoveUpdate(
        [Number(px.toFixed(3)), Number(py.toFixed(3)), Number(pz.toFixed(3))],
        Number(rotY.toFixed(3)),
        Number(localPlayerTransform.headYaw.toFixed(3)),
        Number(localPlayerTransform.headPitch.toFixed(3)),
        localPlayerTransform.animation
      );
    }
  });

  return (
    <group ref={avatarGroupRef} position={[0, 0, 6.5]} rotation={[0, Math.PI, 0]}>
      <StylizedAvatar
        customization={customization}
        animation={liveAnimState}
        seatId={mySeatId}
        headYaw={localPlayerTransform.headYaw}
        headPitch={localPlayerTransform.headPitch}
        isHost={hostId === myPlayerId}
        isLocal={true}
        lastMessage={myLastMessage}
      />
    </group>
  );
};
