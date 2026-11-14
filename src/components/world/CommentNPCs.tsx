import React, { useEffect, useMemo, useRef, useState } from 'react';
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
const CLIENT_DEDUP_WINDOW_MS = 20_000;

const NPC_PRESETS: NPCPreset[] = [
  {
    id: 'npc-1',
    preferredSeats: ['pouf-cinema-1', 'sofa-main-1', 'sofa-vip-1', 'lounge-west-1'],
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
    preferredSeats: ['sofa-main-4', 'sofa-wing-r1', 'sofa-vip-3', 'bar-stool-1'],
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
    preferredSeats: ['sofa-wing-l1', 'sofa-main-2', 'sofa-vip-2', 'lounge-west-2'],
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
    preferredSeats: ['pouf-cinema-3', 'sofa-wing-r2', 'sofa-vip-3', 'bar-stool-2'],
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
    preferredSeats: ['pouf-cinema-2', 'sofa-wing-l2', 'sofa-vip-1', 'lounge-west-3'],
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
    preferredSeats: ['sofa-wing-r1', 'sofa-vip-2', 'sofa-main-3', 'bar-stool-3'],
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

function cleanAndFilterClientComment(rawText: string): string | null {
  if (!rawText) return null;
  if (rawText.includes('@') || rawText.trim().startsWith('!')) return null;

  let text = rawText
    .replace(/https?:\/\/\S+/gi, ' ')
    .replace(/:[a-zA-Z0-9_+-]{2,32}:/g, ' ')
    .replace(/\b[a-z]{2,15}[A-Z][a-zA-Z0-9_]*\b/g, ' ')
    .replace(/\b[A-Z][a-z]{2,12}[A-Z][a-zA-Z0-9_]*\b/g, ' ')
    .replace(
      /\b(LUL|LULW|OMEGALUL|KEKW|KAPPA|POG|POGGERS|POGCHAMP|PEPEGA|SADGE|CLAP|AYAYA|BIBLETHUMP|4HEAD|KREYGASM|RESIDENTSLEEPER|NOTLIKETHIS|WUTFACE|DANSGAME|SMORC|BABYRAGE|PJSALT|MONKAS|MONKAW|CATJAM|PEPEJAM)\b/gi,
      ' '
    )
    .replace(/\s+/g, ' ')
    .trim();

  if (!text) return null;

  // Collapse repeated consecutive words
  const words = text.split(' ');
  const deduped: string[] = [];
  for (const w of words) {
    const prev = deduped[deduped.length - 1];
    if (!prev || prev.toLowerCase() !== w.toLowerCase()) {
      deduped.push(w);
    }
  }

  if (words.length >= 2 && deduped.length === 1) return null;

  const finalStr = deduped.join(' ').trim();
  if (finalStr.length < 2) return null;

  if (finalStr.length <= MAX_BUBBLE_CHARS) {
    return finalStr;
  }
  return `${finalStr.slice(0, MAX_BUBBLE_CHARS - 1).trim()}…`;
}

function normalizeKey(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/(.)\1{2,}/g, '$1$1')
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export const CommentNPCs: React.FC = () => {
  const commentListener = useGameStore((s) => s.commentListener);
  const seats = useGameStore((s) => s.seats);

  const npcCount = Math.max(0, Math.min(6, commentListener?.npcCount ?? 0));
  const recentComments = commentListener?.recentComments || [];

  const [npcBubbles, setNpcBubbles] = useState<
    Record<string, { text: string; timestamp: number }>
  >({});

  // Rolling deduplication map so identical content is never repeated in recent seconds
  const recentContentMapRef = useRef<Map<string, number>>(new Map());

  // Whenever a new 3-second chunk of messages arrives, filter out @, emotes, and recent duplicates, then pick randomly
  useEffect(() => {
    if (npcCount <= 0 || recentComments.length === 0) {
      setNpcBubbles({});
      return;
    }

    const now = Date.now();
    for (const [k, ts] of recentContentMapRef.current.entries()) {
      if (now - ts > CLIENT_DEDUP_WINDOW_MS) {
        recentContentMapRef.current.delete(k);
      }
    }

    // Build clean, unique candidate messages from the current 3-second chunk
    const validChunkTexts: string[] = [];
    const seenInThisChunk = new Set<string>();

    for (const item of recentComments) {
      const cleaned = cleanAndFilterClientComment(item.text);
      if (!cleaned) continue;
      const key = normalizeKey(cleaned);
      if (!key || seenInThisChunk.has(key) || recentContentMapRef.current.has(key)) {
        continue;
      }
      seenInThisChunk.add(key);
      validChunkTexts.push(cleaned);
    }

    if (validChunkTexts.length === 0) return;

    // Record these chunk messages in the recent deduplication window
    for (const txt of validChunkTexts) {
      recentContentMapRef.current.set(normalizeKey(txt), now);
    }

    // Each active NPC picks a random message from the filtered 3s chunk (without reserving already-chosen ones)
    const timers = NPC_PRESETS.slice(0, npcCount).map((npc, idx) =>
      setTimeout(() => {
        const pickedText =
          validChunkTexts[Math.floor(Math.random() * validChunkTexts.length)];
        if (!pickedText) return;
        setNpcBubbles((prev) => ({
          ...prev,
          [npc.id]: {
            text: pickedText,
            timestamp: Date.now(),
          },
        }));
      }, idx * 240)
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
