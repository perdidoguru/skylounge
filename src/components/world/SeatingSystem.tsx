import React from 'react';
import { PENTHOUSE_SEATS } from '../../../shared/seats';
import { useGameStore } from '../../store/useGameStore';

export const SeatingSystem: React.FC = () => {
  const seats = useGameStore((s) => s.seats);
  const nearbySeatId = useGameStore((s) => s.nearbySeatId);
  const mySeatId = useGameStore((s) => s.mySeatId);
  const sitOnSeat = useGameStore((s) => s.sitOnSeat);

  return (
    <group name="interactive-seats">
      {PENTHOUSE_SEATS.map((seat) => {
        const occupiedBy = seats[seat.id];
        const isOccupied = Boolean(occupiedBy);
        const isNearby = nearbySeatId === seat.id && !mySeatId;

        if (isOccupied) return null;

        return (
          <group key={seat.id} position={seat.position}>
            {/* Subtle glowing seat interaction ring + clickable hit target */}
            <mesh
              rotation={[-Math.PI / 2, 0, 0]}
              position={[0, 0.08, 0]}
              onClick={(e) => {
                e.stopPropagation();
                sitOnSeat(seat.id);
              }}
            >
              <ringGeometry args={[isNearby ? 0.22 : 0.13, isNearby ? 0.29 : 0.17, 24]} />
              <meshBasicMaterial
                color={isNearby ? '#fbbf24' : '#e5a95c'}
                transparent
                opacity={isNearby ? 0.9 : 0.28}
              />
            </mesh>
            {/* Invisible click sphere for easy mouse clicking */}
            <mesh
              position={[0, 0.28, 0]}
              onClick={(e) => {
                e.stopPropagation();
                sitOnSeat(seat.id);
              }}
            >
              <sphereGeometry args={[0.52, 8, 8]} />
              <meshBasicMaterial transparent opacity={0} depthWrite={false} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
};
