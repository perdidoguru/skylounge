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
 * Picks 1 to 3 random words from one of the currently displayed comments
 * so the NPC's overhead bubble stays compact and directly reflects active comments.
 */
function pickRandomWordsFromActiveComments(comments: StreamCommentItem[]): string | null {
  if (!comments || comments.length === 0) return null;

  const pickedComment = comments[Math.floor(Math.random() * comments.length)];
  if (!pickedComment || !pickedComment.text) return null;

  const rawWords = pickedComment.text
    .replace(/https?:\/\/\S+/g, '')
    .split(/\s+/)
    .map((w) => w.trim())
    .filter((w) => w.length > 0 && w.length <= 18);

  if (rawWords.length === 0) return null;

  if (rawWords.length <= 3) {
    return rawWords.join(' ').slice(0, 32);
  }

  // Pick 1 to 3 words from the currently displayed comment (either a short contiguous phrase or random words)
  const wordCount = 1 + Math.floor(Math.random() * 3); // 1, 2, or 3 words
  if (Math.random() < 0.65) {
    const startIdx = Math.floor(Math.random() * Math.max(1, rawWords.length - wordCount + 1));
    return rawWords
      .slice(startIdx, startIdx + wordCount)
      .join(' ')
      .slice(0, 32);
  } else {
    const chosen: string[] = [];
    const usedIndices = new Set<number>();
    while (chosen.length < wordCount && usedIndices.size < rawWords.length) {
      const idx = Math.floor(Math.random() * rawWords.length);
      if (!usedIndices.has(idx)) {
        usedIndices.add(idx);
        chosen.push(rawWords[idx]);
      }
    }
    return chosen.join(' ').slice(0, 32);
  }
}

export const CommentNPCs: React.FC = () => {
  const commentListener = useGameStore((s) => s.commentListener);
  const seats = useGameStore((s) => s.seats);

  const npcCount = Math.max(0, Math.min(6, commentListener?.npcCount ?? 0));
  const recentComments = commentListener?.recentComments || [];

  const [npcBubbles, setNpcBubbles] = useState<
    Record<string, { text: string; timestamp: number }>
  >({});

  // Periodically have active NPCs pick random words from currently displayed comments
  useEffect(() => {
    if (npcCount <= 0 || recentComments.length === 0) return;

    const triggerBubbleForNpc = (npcIndex: number) => {
      const npc = NPC_PRESETS[npcIndex];
      if (!npc) return;
      const snippet = pickRandomWordsFromActiveComments(recentComments);
      if (!snippet) return;

      setNpcBubbles((prev) => ({
        ...prev,
        [npc.id]: {
          text: snippet,
          timestamp: Date.now(),
        },
      }));
    };

    // Initial staggered reaction when comments update or NPC count changes
    const initialTimers = NPC_PRESETS.slice(0, npcCount).map((_, idx) =>
      setTimeout(() => {
        triggerBubbleForNpc(idx);
      }, 450 + idx * 650)
    );

    // Continuous cycle where a random active NPC samples words from the current comments
    const interval = setInterval(() => {
      const idx = Math.floor(Math.random() * npcCount);
      triggerBubbleForNpc(idx);
    }, 2100);

    return () => {
      initialTimers.forEach(clearTimeout);
      clearInterval(interval);
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
