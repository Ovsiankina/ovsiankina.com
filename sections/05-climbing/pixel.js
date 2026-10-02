// Shared by the scene and the wipe: one 4x4 Bayer matrix, a cheap hash, small maths.
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
export const bay = (x, y) => (BAYER[(y & 3) * 4 + (x & 3)] + 0.5) / 16;
export const clamp01 = x => Math.min(1, Math.max(0, x));
export const smooth = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };
export const hsh = (x, y) => (((x * 73856093) ^ (y * 19349663)) >>> 0) % 1000 / 1000;
export const hex = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
