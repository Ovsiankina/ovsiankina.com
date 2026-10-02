// zeta(1/2 + it), Euler–Maclaurin. Returns [re, im].
const BN = [1/6, -1/30, 1/42, -1/30, 5/66, -691/2730, 7/6, -3617/510];
const FN = [2, 24, 720, 40320, 3628800, 479001600, 87178291200, 20922789888000];
export function zeta(t) {
  const N = Math.max(12, Math.ceil(Math.abs(t) / 3) + 6);
  let re = 0, im = 0;
  for (let n = 1; n < N; n++) { const a = 1 / Math.sqrt(n), p = t * Math.log(n); re += a * Math.cos(p); im -= a * Math.sin(p); }
  const L = Math.log(N), c = Math.cos(t * L), s = Math.sin(t * L);
  let m = Math.sqrt(N);
  const nr = m * c, ni = -m * s, dr = -0.5, di = t, d = dr * dr + di * di;
  re += (nr * dr + ni * di) / d; im += (ni * dr - nr * di) / d;
  m = 1 / Math.sqrt(N); re += 0.5 * m * c; im -= 0.5 * m * s;
  let pr = 0.5, pi = t;
  for (let k = 1; k <= 8; k++) {
    if (k > 1) for (const off of [2 * k - 3, 2 * k - 2]) { const ar = 0.5 + off, r = pr * ar - pi * t; pi = pr * t + pi * ar; pr = r; }
    const w = BN[k - 1] / FN[k - 1] * Math.pow(N, -2 * k + 0.5), er = w * c, ei = -w * s;
    re += pr * er - pi * ei; im += pr * ei + pi * er;
  }
  return [re, im];
}
