import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '../../store/useGameStore';
import { StylizedAvatar } from '../characters/StylizedAvatar';
import { PlayerState } from '../../../shared/types';

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

  useFrame((_state, delta) => {
    const group = groupRef.current;
    if (!group) return;

    const dt = Math.min(delta, 0.1);
    const [tx, ty, tz] = player.position;

    if (!initialized.current) {
      group.position.set(tx, ty, tz);
      group.rotation.y = player.rotationY;
      initialized.current = true;
      return;
    }

    // Smoothly interpolate position & rotation so remote movement never jitters or teleports
    group.position.x = THREE.MathUtils.damp(group.position.x, tx, 12, dt);
    group.position.y = THREE.MathUtils.damp(group.position.y, ty, 12, dt);
    group.position.z = THREE.MathUtils.damp(group.position.z, tz, 12, dt);

    const diffY = normalizeAngle(player.rotationY - group.rotation.y);
    group.rotation.y += diffY * Math.min(1, dt * 12);
  });

  return (
    <group ref={groupRef}>
      <StylizedAvatar
        customization={player.customization}
        animation={player.animation}
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
