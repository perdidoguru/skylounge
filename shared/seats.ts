import { SeatDefinition } from './types.js';

/**
 * All interactive seating locations inside the SkyPenthouse.
 * Each seat type has a dedicated procedural animation posture ('sofa', 'chaise', 'pouf', 'cushion', 'vip', 'armchair', 'barstool').
 */
export const PENTHOUSE_SEATS: SeatDefinition[] = [
  // === 1. GRAND CINEMA MODULAR SOFA (Main Front Row — Posture: 'sofa') ===
  {
    id: 'sofa-main-1',
    label: 'Sofá Cinema Central (Esq.)',
    zone: 'cinema',
    posture: 'sofa',
    position: [-2.4, 0.45, -3.2],
    rotationY: Math.PI,
  },
  {
    id: 'sofa-main-2',
    label: 'Sofá Cinema Central (Meio-Esq.)',
    zone: 'cinema',
    posture: 'sofa',
    position: [-0.85, 0.45, -3.2],
    rotationY: Math.PI,
  },
  {
    id: 'sofa-main-3',
    label: 'Sofá Cinema Central (Meio-Dir.)',
    zone: 'cinema',
    posture: 'sofa',
    position: [0.85, 0.45, -3.2],
    rotationY: Math.PI,
  },
  {
    id: 'sofa-main-4',
    label: 'Sofá Cinema Central (Dir.)',
    zone: 'cinema',
    posture: 'sofa',
    position: [2.4, 0.45, -3.2],
    rotationY: Math.PI,
  },

  // === 2. GRAND CINEMA L-WINGS (Left & Right Chaise Wings — Posture: 'chaise') ===
  {
    id: 'sofa-wing-l1',
    label: 'Chaise Lateral Esquerda #1',
    zone: 'cinema',
    posture: 'chaise',
    position: [-4.1, 0.45, -4.4],
    rotationY: Math.PI * 0.72,
  },
  {
    id: 'sofa-wing-l2',
    label: 'Chaise Lateral Esquerda #2',
    zone: 'cinema',
    posture: 'chaise',
    position: [-4.1, 0.45, -5.9],
    rotationY: Math.PI * 0.65,
  },
  {
    id: 'sofa-wing-r1',
    label: 'Chaise Lateral Direita #1',
    zone: 'cinema',
    posture: 'chaise',
    position: [4.1, 0.45, -4.4],
    rotationY: -Math.PI * 0.72,
  },
  {
    id: 'sofa-wing-r2',
    label: 'Chaise Lateral Direita #2',
    zone: 'cinema',
    posture: 'chaise',
    position: [4.1, 0.45, -5.9],
    rotationY: -Math.PI * 0.65,
  },

  // === 3. FRONT CINEMA POUFS & FLOOR CUSHION (Postures: 'pouf' and 'cushion') ===
  {
    id: 'pouf-cinema-1',
    label: 'Pufe de Veludo (Esq.)',
    zone: 'cinema',
    posture: 'pouf',
    position: [-2.2, 0.36, -6.7],
    rotationY: Math.PI * 0.9,
  },
  {
    id: 'pouf-cinema-2',
    label: 'Almofada Lounge Central (Lótus)',
    zone: 'cinema',
    posture: 'cushion',
    position: [0.0, 0.28, -6.9],
    rotationY: Math.PI,
  },
  {
    id: 'pouf-cinema-3',
    label: 'Pufe de Veludo (Dir.)',
    zone: 'cinema',
    posture: 'pouf',
    position: [2.2, 0.36, -6.7],
    rotationY: -Math.PI * 0.9,
  },

  // === 4. VIP ELEVATED BACK SOFA (Posture: 'vip') ===
  {
    id: 'sofa-vip-1',
    label: 'Sofá Panorâmico VIP #1',
    zone: 'cinema',
    posture: 'vip',
    position: [-1.8, 0.65, 0.4],
    rotationY: Math.PI,
  },
  {
    id: 'sofa-vip-2',
    label: 'Sofá Panorâmico VIP #2',
    zone: 'cinema',
    posture: 'vip',
    position: [0.0, 0.65, 0.4],
    rotationY: Math.PI,
  },
  {
    id: 'sofa-vip-3',
    label: 'Sofá Panorâmico VIP #3',
    zone: 'cinema',
    posture: 'vip',
    position: [1.8, 0.65, 0.4],
    rotationY: Math.PI,
  },

  // === 5. WEST SUNSET CONVERSATION & READING NOOK (Postures: 'armchair' and 'sofa') ===
  {
    id: 'lounge-west-1',
    label: 'Poltrona Sunset Norte',
    zone: 'lounge',
    posture: 'armchair',
    position: [-10.8, 0.45, -3.5],
    rotationY: Math.PI * 0.35,
  },
  {
    id: 'lounge-west-2',
    label: 'Poltrona Sunset Sul',
    zone: 'lounge',
    posture: 'armchair',
    position: [-10.8, 0.45, 0.5],
    rotationY: Math.PI * 0.65,
  },
  {
    id: 'lounge-west-3',
    label: 'Sofá Mirante Oeste #1',
    zone: 'lounge',
    posture: 'sofa',
    position: [-13.2, 0.45, -2.2],
    rotationY: Math.PI * 0.5,
  },
  {
    id: 'lounge-west-4',
    label: 'Sofá Mirante Oeste #2',
    zone: 'lounge',
    posture: 'sofa',
    position: [-13.2, 0.45, -0.7],
    rotationY: Math.PI * 0.5,
  },

  // === 6. EAST MEZZANINE MIXOLOGY BAR STOOLS (Posture: 'barstool') ===
  {
    id: 'bar-stool-1',
    label: 'Banqueta SkyBar #1',
    zone: 'bar',
    posture: 'barstool',
    position: [9.6, 1.82, -4.2],
    rotationY: Math.PI * 0.5,
  },
  {
    id: 'bar-stool-2',
    label: 'Banqueta SkyBar #2',
    zone: 'bar',
    posture: 'barstool',
    position: [9.6, 1.82, -2.4],
    rotationY: Math.PI * 0.5,
  },
  {
    id: 'bar-stool-3',
    label: 'Banqueta SkyBar #3',
    zone: 'bar',
    posture: 'barstool',
    position: [9.6, 1.82, -0.6],
    rotationY: Math.PI * 0.5,
  },
  {
    id: 'bar-stool-4',
    label: 'Banqueta SkyBar #4',
    zone: 'bar',
    posture: 'barstool',
    position: [9.6, 1.82, 1.2],
    rotationY: Math.PI * 0.5,
  },
];

export const SEAT_MAP: Record<string, SeatDefinition> = Object.fromEntries(
  PENTHOUSE_SEATS.map((seat) => [seat.id, seat])
);
