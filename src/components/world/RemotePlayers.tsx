import React, { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '../../store/useGameStore';
import { StylizedAvatar } from '../characters/StylizedAvatar';
import { AnimationState, PlayerState } from '../../../shared/types';
import { SEAT_MAP } from '../../../shared/seats';

function normalizeAngle(angle: number): number {
  let a = angle;
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}

const RemotePlayerEntity: React.FC<{ player: PlayerState; isHost: boolean }> = ({
  player,
  isHost,
}) => {
  const groupRef = useRef<THREE.Group>(null);
  const initialized = useRef(false);
  const lastTargetPos = useRef<[number, number, number]>([...player.position]);
  const lastMovedAt = useRef<number>(performance.now());
  const [effectiveAnim, setEffectiveAnim] = useState<AnimationState>(player.animation);

  useFrame((_state, delta) => {
    const group = groupRef.current;
    if (!group) return;

    const dt = Math.min(delta, 0.1);
    const now = performance.now();

    const seat = player.seatId ? SEAT_MAP[player.seatId] : null;
    const [tx, ty, tz] = seat ? seat.position : player.position;
    const targetRotY = seat ? seat.rotationY : player.rotationY;

    if (!initialized.current) {
      group.position.set(tx, ty, tz);
      group.rotation.y = targetRotY;
      lastTargetPos.current = [tx, ty, tz];
      initialized.current = true;
      return;
    }

    // Detect whether target position actually changed recently
    const movedDist = Math.hypot(
      tx - lastTargetPos.current[0],
      ty - lastTargetPos.current[1],
      tz - lastTargetPos.current[2]
    );
    if (movedDist > 0.008) {
      lastTargetPos.current = [tx, ty, tz];
      lastMovedAt.current = now;
    }

    // Smoothly interpolate position & rotation so remote movement never jitters or teleports
    group.position.x = THREE.MathUtils.damp(group.position.x, tx, 14, dt);
    group.position.y = THREE.MathUtils.damp(group.position.y, ty, 14, dt);
    group.position.z = THREE.MathUtils.damp(group.position.z, tz, 14, dt);

    const diffY = normalizeAngle(targetRotY - group.rotation.y);
    group.rotation.y += diffY * Math.min(1, dt * 14);

    // Prevent remote players from ever getting stuck "walking in place" if they stopped moving
    let nextAnim: AnimationState = seat
      ? player.animation === 'wave'
        ? 'wave'
        : 'sit'
      : player.animation;

    if ((nextAnim === 'walk' || nextAnim === 'run') && now - lastMovedAt.current > 280) {
      nextAnim = 'idle';
    }

    if (nextAnim !== effectiveAnim) {
      setEffectiveAnim(nextAnim);
    }
  });

  return (
    <group ref={groupRef}>
      <StylizedAvatar
        customization={player.customization}
        animation={effectiveAnim}
        seatId={player.seatId}
        headYaw={player.headYaw}
        headPitch={player.headPitch}
        isHost={isHost}
        isLocal={false}
        lastMessage={player.lastMessage}
      />
    </group>
  );
};

export const RemotePlayers: React.FC = () => {
  const players = useGameStore((s) => s.players);
  const myPlayerId = useGameStore((s) => s.myPlayerId);
  const hostId = useGameStore((s) => s.hostId);

  const remoteList = Object.values(players).filter((p) => p.id !== myPlayerId);

  return (
    <group name="remote-players">
      {remoteList.map((player) => (
        <RemotePlayerEntity
          key={player.id}
          player={player}
          isHost={player.id === hostId}
        />
      ))}
    </group>
  );
};
