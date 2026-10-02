// Pixel helpers shared by the section and its transition.
export const rgb = h => { h = h.trim().replace('#', ''); return [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16)); };
export const pack = (r, g, b, a = 255) => ((a << 24) | (b << 16) | (g << 8) | r) >>> 0;
export const clamp01 = v => v < 0 ? 0 : v > 1 ? 1 : v;

export const BAYER = (() => {
  const b = [0, 32, 8, 40, 2, 34, 10, 42, 48, 16, 56, 24, 50, 18, 58, 26, 12, 44, 4, 36, 14, 46, 6, 38, 60, 28, 52, 20, 62, 30, 54, 22,
             3, 35, 11, 43, 1, 33, 9, 41, 51, 19, 59, 27, 49, 17, 57, 25, 15, 47, 7, 39, 13, 45, 5, 37, 63, 31, 55, 23, 61, 29, 53, 21];
  return Float32Array.from(b, v => (v + 0.5) / 64);
})();

// a custom property of el as [r, g, b]
export const cssRgb = (el, name) => rgb(getComputedStyle(el).getPropertyValue(name));
