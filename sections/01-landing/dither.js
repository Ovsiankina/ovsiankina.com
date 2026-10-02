// Shared by the photo carousel and the entry transition.
export const BAYER = (() => {
  const b = [0, 32, 8, 40, 2, 34, 10, 42, 48, 16, 56, 24, 50, 18, 58, 26, 12, 44, 4, 36, 14, 46, 6, 38, 60, 28, 52, 20, 62, 30, 54, 22,
             3, 35, 11, 43, 1, 33, 9, 41, 51, 19, 59, 27, 49, 17, 57, 25, 15, 47, 7, 39, 13, 45, 5, 37, 63, 31, 55, 23, 61, 29, 53, 21];
  return Float32Array.from(b, v => (v + 0.5) / 64);
})();
export const pack = (r, g, b) => (255 << 24) | (b << 16) | (g << 8) | r;
export const rgb = hex => { hex = hex.trim().replace('#', ''); return [0, 2, 4].map(i => parseInt(hex.slice(i, i + 2), 16)); };
