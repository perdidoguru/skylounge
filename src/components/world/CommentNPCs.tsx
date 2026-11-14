import React, { useEffect, useMemo, useState } from 'react';
import { useGameStore } from '../../store/useGameStore';
import { SEAT_MAP } from '../../../shared/seats';
import { AvatarCustomization, StreamCommentItem } from '../../../shared/types';
import { StylizedAvatar } from '../characters/StylizedAvatar';

interface NPCPreset {
  id: string;
  preferredSeats: string[];
  customization: AvatarCustomization;
}

const MAX_BUBBLE_CHARS = 55;

const NPC_PRESETS: NPCPreset[] = [
  {
    id: 'npc-1',
    preferredSeats: ['pouf-cinema-1', 'cushion-floor-1', 'sofa-main-1', 'sofa-vip-1'],
    customization: {
      name: 'Luna',
      bodyStyle: 'feminine',
      skinColor: '#f6d2b8',
      outfitStyle: 'offshoulder',
      primaryColor: '#ec4899',
      secondaryColor: '#1e1b4b',
      hairStyle: 'twintails',
      hairColor: '#1c1514',
      accessory: 'bow',
    },
  },
  {
    id: 'npc-2',
    preferredSeats: ['sofa-main-4', 'sofa-wing-r1', 'pouf-cinema-3', 'sofa-vip-3'],
    customization: {
      name: 'Kael',
      bodyStyle: 'masculine',
      skinColor: '#e0a97e',
      outfitStyle: 'hoodie',
      primaryColor: '#38bdf8',
      secondaryColor: '#0f172a',
      hairStyle: 'spiky',
      hairColor: '#1e293b',
      accessory: 'headphones',
    },
  },
  {
    id: 'npc-3',
    preferredSeats: ['sofa-wing-l1', 'sofa-main-2', 'cushion-floor-2', 'armchair-w-1'],
    customization: {
      name: 'Maya',
      bodyStyle: 'feminine',
      skinColor: '#c48358',
      outfitStyle: 'skirt_set',
      primaryColor: '#a855f7',
      secondaryColor: '#1f2937',
      hairStyle: 'long_waves',
      hairColor: '#3f2218',
      accessory: 'earrings',
    },
  },
  {
    id: 'npc-4',
    preferredSeats: ['pouf-cinema-3', 'sofa-wing-r2', 'sofa-vip-2', 'bar-stool-2'],
    customization: {
      name: 'Dante',
      bodyStyle: 'masculine',
      skinColor: '#f1c29d',
      outfitStyle: 'jacket',
      primaryColor: '#f59e0b',
      secondaryColor: '#18181b',
      hairStyle: 'waves',
      hairColor: '#7c2d12',
      accessory: 'glasses',
    },
  },
  {
    id: 'npc-5',
    preferredSeats: ['cushion-floor-2', 'pouf-cinema-2', 'sofa-wing-l2', 'sofa-vip-1'],
    customization: {
      name: 'Nina',
      bodyStyle: 'feminine',
      skinColor: '#f3c6a5',
      outfitStyle: 'dress',
      primaryColor: '#2dd4bf',
      secondaryColor: '#134e4a',
      hairStyle: 'high_bun',
      hairColor: '#e2c178',
      accessory: 'tiara',
    },
  },
  {
    id: 'npc-6',
    preferredSeats: ['sofa-wing-r1', 'sofa-vip-3', 'sofa-main-1', 'armchair-w-2'],
    customization: {
      name: 'Zion',
      bodyStyle: 'masculine',
      skinColor: '#8d5535',
      outfitStyle: 'blazer',
      primaryColor: '#fb7185',
      secondaryColor: '#1e293b',
      hairStyle: 'curly',
      hairColor: '#1c1514',
      accessory: 'beanie',
    },
  },
];

/**
 * Picks a random message from the current 3-second chunk without reserving already-chosen
 * messages, and truncates it to MAX_BUBBLE_CHARS so viewers can see what chat is talking about right now.
 */
function pickRandomMessageFromChunk(chunk: StreamCommentItem[]): string | null {
  if (!chunk || chunk.length === 0) return null;

  const picked = chunk[Math.floor(Math.random() * chunk.length)];
  if (!picked || !picked.text) return null;

  const cleaned = picked.text
    .replace(/https?:\/\/\S+/gi, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (!cleaned) return null;

  if (cleaned.length <= MAX_BUBBLE_CHARS) {
    return cleaned;
  }
  return `${cleaned.slice(0, MAX_BUBBLE_CHARS - 1).trim()}…`;
}

export const CommentNPCs: React.FC = () => {
  const commentListener = useGameStore((s) => s.commentListener);
  const seats = useGameStore((s) => s.seats);

  const npcCount = Math.max(0, Math.min(6, commentListener?.npcCount ?? 0));
  const recentComments = commentListener?.recentComments || [];

  const [npcBubbles, setNpcBubbles] = useState<
    Record<string, { text: string; timestamp: number }>
  >({});

  // Whenever a new 3-second chunk of messages arrives, each active NPC randomly picks a message from that chunk
  useEffect(() => {
    if (npcCount <= 0 || recentComments.length === 0) {
      setNpcBubbles({});
      return;
    }

    const timers = NPC_PRESETS.slice(0, npcCount).map((npc, idx) =>
      setTimeout(() => {
        const msgText = pickRandomMessageFromChunk(recentComments);
        if (!msgText) return;
        setNpcBubbles((prev) => ({
          ...prev,
          [npc.id]: {
            text: msgText,
            timestamp: Date.now(),
          },
        }));
      }, idx * 280)
    );

    return () => {
      timers.forEach(clearTimeout);
    };
  }, [npcCount, recentComments]);

  // Assign each active NPC to its first available seat that isn't occupied by a real player or another NPC
  const assignedNpcs = useMemo(() => {
    if (npcCount <= 0) return [];
    const usedSeats = new Set<string>(Object.keys(seats));
    const result: Array<{
      npc: NPCPreset;
      seatId: string;
      position: [number, number, number];
      rotationY: number;
    }> = [];

    for (let i = 0; i < npcCount; i++) {
      const npc = NPC_PRESETS[i];
      if (!npc) continue;

      let chosenSeatId = npc.preferredSeats.find((sid) => !usedSeats.has(sid) && SEAT_MAP[sid]);
      if (!chosenSeatId) {
        chosenSeatId = Object.keys(SEAT_MAP).find((sid) => !usedSeats.has(sid));
      }
      if (!chosenSeatId) continue;

      usedSeats.add(chosenSeatId);
      const seatDef = SEAT_MAP[chosenSeatId];
      result.push({
        npc,
        seatId: chosenSeatId,
        position: seatDef.position,
        rotationY: seatDef.rotationY,
      });
    }

    return result;
  }, [npcCount, seats]);

  if (assignedNpcs.length === 0) return null;

  return (
    <group name="comment-spectator-npcs">
      {assignedNpcs.map(({ npc, seatId, position, rotationY }) => (
        <group
          key={npc.id}
          position={position}
          rotation={[0, rotationY, 0]}
        >
          <StylizedAvatar
            customization={npc.customization}
            animation="sit"
            seatId={seatId}
            headYaw={0}
            headPitch={0.04}
            isHost={false}
            isLocal={false}
            lastMessage={npcBubbles[npc.id]}
            showLabel={true}
          />
        </group>
      ))}
    </group>
  );
};
