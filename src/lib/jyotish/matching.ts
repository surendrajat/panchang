// Ashtakoota Guna Milan — the 36-point marriage-compatibility system.
//
// Every koota needs only each partner's Moon nakshatra (1–27) and Moon
// rashi (0–11) — plus the Moon's degree-in-rashi for the Sagittarius/
// Capricorn half-splits in Vashya. No new astronomy; this is pure
// arithmetic over the chart the engine already produces.
//
// All tables below are sourced verbatim from Saravali (saravali.github.io),
// an authoritative classical reference — NOT reproduced from memory. The
// engine's output is additionally checked against a live Guna Milan
// calculator in tests + browser verification. Varna, Vashya, Tara, and
// Gana are role-dependent (groom vs bride), so computeMatch takes explicit
// groom/bride inputs.

import { RASHI_LORDS } from './names';
import type { GrahaKey } from './types';

export type KootaKey = 'varna' | 'vashya' | 'tara' | 'yoni' | 'grahaMaitri' | 'gana' | 'bhakoot' | 'nadi';

export interface KootaScore {
  key: KootaKey;
  got: number;
  max: number;
}

export interface MatchPerson {
  nakshatra: number; // Moon nakshatra 1..27
  rashi: number; // Moon rashi 0..11
  rashiDeg: number; // Moon degrees within rashi 0..30 (for Sag/Cap vashya split)
}

export interface MatchResult {
  kootas: KootaScore[];
  total: number;
  max: number; // 36
  nadiDosha: boolean;
  bhakootDosha: boolean;
}

// ── 1. Varna (1) — water=Brahmin, fire=Kshatriya, air=Vaishya, earth=Shudra.
// Rank Brahmin 4 … Shudra 1; groom's varna must be ≥ bride's.
const VARNA_RANK: readonly number[] = [3, 1, 2, 4, 3, 1, 2, 4, 3, 1, 2, 4];

// ── 2. Vashya (2). Five groups: 0 Quadruped, 1 Human, 2 Jalachara, 3 Leo,
// 4 Scorpio. Sagittarius & Capricorn split by half-sign.
const VASHYA_BASE: readonly number[] = [0, 0, 1, 2, 3, 1, 1, 4, 8, 9, 1, 2]; // 8,9 = split markers
function vashyaGroup(rashi: number, deg: number): number {
  if (rashi === 8) return deg < 15 ? 1 : 0; // Sagittarius: 1st half Human, 2nd Quadruped
  if (rashi === 9) return deg < 15 ? 0 : 2; // Capricorn: 1st half Quadruped, 2nd Jalachara
  return VASHYA_BASE[rashi];
}
// Saravali matrix, rows = bride, cols = groom.
const VASHYA: readonly (readonly number[])[] = [
  [2, 0, 0, 0.5, 0],
  [1, 2, 1, 0.5, 1],
  [0.5, 1, 2, 1, 1],
  [0, 0, 0, 2, 0],
  [1, 1, 1, 0, 2],
];

// ── 3. Tara/Dina (3). Count between nakshatras /9; remainder 3,5,7 → 0,
// else 1.5; both directions.
function taraDir(fromNak: number, toNak: number): number {
  const count = (((toNak - fromNak + 27) % 27) + 1) % 9;
  return count === 3 || count === 5 || count === 7 ? 0 : 1.5;
}

// ── 4. Yoni (4). Nakshatra → one of 14 animals; Saravali 14×14 matrix.
// Animals: 0 Horse 1 Elephant 2 Sheep 3 Serpent 4 Dog 5 Cat 6 Rat 7 Cow
// 8 Buffalo 9 Tiger 10 Deer 11 Monkey 12 Mongoose 13 Lion.
const YONI_ANIMAL: readonly number[] = [
  0, 1, 2, 3, 3, 4, 5, 2, 5, 6, 6, 7, 8, 9, 8, 9, 10, 10, 4, 11, 12, 11, 13, 0, 13, 7, 1,
];
const YONI: readonly (readonly number[])[] = [
  [4, 2, 2, 3, 2, 2, 2, 1, 0, 1, 3, 3, 2, 1],
  [2, 4, 3, 3, 2, 2, 2, 2, 3, 1, 2, 3, 2, 0],
  [2, 3, 4, 2, 1, 2, 1, 3, 3, 1, 2, 0, 3, 1],
  [3, 3, 2, 4, 2, 1, 1, 1, 1, 2, 2, 2, 0, 2],
  [2, 2, 1, 2, 4, 2, 1, 2, 2, 1, 0, 2, 1, 1],
  [2, 2, 2, 1, 2, 4, 0, 2, 2, 1, 3, 3, 2, 1],
  [2, 2, 1, 1, 1, 0, 4, 2, 2, 2, 2, 2, 1, 2],
  [1, 2, 3, 1, 2, 2, 2, 4, 3, 0, 3, 2, 2, 1],
  [0, 3, 3, 1, 2, 2, 2, 3, 4, 1, 2, 2, 2, 1],
  [1, 1, 1, 2, 1, 1, 2, 0, 1, 4, 1, 1, 2, 1],
  [3, 2, 2, 2, 0, 3, 2, 3, 2, 1, 4, 2, 2, 1],
  [3, 3, 0, 2, 2, 3, 2, 2, 2, 1, 2, 4, 3, 2],
  [2, 2, 3, 0, 1, 2, 1, 2, 2, 2, 2, 3, 4, 2],
  [1, 0, 1, 2, 1, 1, 2, 1, 2, 1, 1, 2, 2, 4],
];

// ── 5. Graha Maitri (5). Friendship of the Moon-sign lords (Saravali /
// Parashara natural friendships). rel: 2 friend, 1 neutral, 0 enemy.
const FRIENDS: Record<GrahaKey, GrahaKey[]> = {
  sun: ['moon', 'mars', 'jupiter'],
  moon: ['sun', 'mercury'],
  mars: ['sun', 'moon', 'jupiter'],
  mercury: ['sun', 'venus'],
  jupiter: ['sun', 'moon', 'mars'],
  venus: ['mercury', 'saturn'],
  saturn: ['mercury', 'venus'],
  rahu: [],
  ketu: [],
};
const ENEMIES: Record<GrahaKey, GrahaKey[]> = {
  sun: ['venus', 'saturn'],
  moon: [],
  mars: ['mercury'],
  mercury: ['moon'],
  jupiter: ['mercury', 'venus'],
  venus: ['sun', 'moon'],
  saturn: ['sun', 'moon', 'mars'],
  rahu: [],
  ketu: [],
};
function rel(a: GrahaKey, b: GrahaKey): number {
  if (FRIENDS[a].includes(b)) return 2;
  if (ENEMIES[a].includes(b)) return 0;
  return 1;
}
function grahaMaitriScore(lordA: GrahaKey, lordB: GrahaKey): number {
  if (lordA === lordB) return 5;
  const key = `${rel(lordA, lordB)},${rel(lordB, lordA)}`;
  const table: Record<string, number> = {
    '2,2': 5,
    '2,1': 4,
    '1,2': 4,
    '1,1': 3,
    '2,0': 2,
    '0,2': 2,
    '1,0': 1,
    '0,1': 1,
    '0,0': 0,
  };
  return table[key] ?? 0;
}

// ── 6. Gana (6). Nakshatra → 0 Deva, 1 Manushya, 2 Rakshasa. Saravali
// score table is asymmetric (rows = bride, cols = groom).
const GANA: readonly number[] = [
  0, 1, 2, 1, 0, 1, 0, 0, 2, 2, 1, 1, 0, 2, 0, 2, 0, 2, 2, 1, 1, 0, 2, 2, 1, 1, 0,
];
const GANA_SCORE: readonly (readonly number[])[] = [
  [6, 6, 0],
  [5, 6, 0],
  [1, 0, 6],
];

// ── 7. Bhakoot (7). 2/12, 5/9, 6/8 rashi relationships → 0 (dosha).
const BHAKOOT_DOSHA = new Set([1, 4, 5, 7, 8, 11]);

// ── 8. Nadi (8). Cycle of six: Aadi, Madhya, Antya, Antya, Madhya, Aadi.
// Same nadi → 0 (dosha); different → 8.
function nadi(nak: number): number {
  return [0, 1, 2, 2, 1, 0][(nak - 1) % 6];
}

export function computeMatch(groom: MatchPerson, bride: MatchPerson): MatchResult {
  const varna = VARNA_RANK[groom.rashi] >= VARNA_RANK[bride.rashi] ? 1 : 0;

  const vashya = VASHYA[vashyaGroup(bride.rashi, bride.rashiDeg)][vashyaGroup(groom.rashi, groom.rashiDeg)];

  const tara = taraDir(groom.nakshatra, bride.nakshatra) + taraDir(bride.nakshatra, groom.nakshatra);

  const yoni = YONI[YONI_ANIMAL[groom.nakshatra - 1]][YONI_ANIMAL[bride.nakshatra - 1]];

  const grahaMaitri = grahaMaitriScore(RASHI_LORDS[groom.rashi], RASHI_LORDS[bride.rashi]);

  const gana = GANA_SCORE[GANA[bride.nakshatra - 1]][GANA[groom.nakshatra - 1]];

  const bhakootDiff = (((bride.rashi - groom.rashi) % 12) + 12) % 12;
  const bhakoot = BHAKOOT_DOSHA.has(bhakootDiff) ? 0 : 7;

  const nadiScore = nadi(groom.nakshatra) !== nadi(bride.nakshatra) ? 8 : 0;

  const kootas: KootaScore[] = [
    { key: 'varna', got: varna, max: 1 },
    { key: 'vashya', got: vashya, max: 2 },
    { key: 'tara', got: tara, max: 3 },
    { key: 'yoni', got: yoni, max: 4 },
    { key: 'grahaMaitri', got: grahaMaitri, max: 5 },
    { key: 'gana', got: gana, max: 6 },
    { key: 'bhakoot', got: bhakoot, max: 7 },
    { key: 'nadi', got: nadiScore, max: 8 },
  ];
  const total = kootas.reduce((s, k) => s + k.got, 0);

  return {
    kootas,
    total,
    max: 36,
    nadiDosha: nadiScore === 0,
    bhakootDosha: bhakoot === 0,
  };
}
