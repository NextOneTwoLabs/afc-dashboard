import { esc } from "./ui";

// Hand-rolled SVG charts. Every mark carries a `data-tip` that the global
// tooltip handler in main.ts shows on hover/focus.

const W = 640;

export interface Bar {
  label: string;
  value: number;
  tip: string;
}

/** Single-series vertical bar chart; values labelled only on hover. */
export function barChart(bars: Bar[], opts: { height?: number; title: string; fmt?: (v: number) => string }): string {
  const H = opts.height ?? 220;
  const pad = { t: 12, r: 8, b: 30, l: 44 };
  const fmt = opts.fmt ?? String;
  const max = niceMax(Math.max(1, ...bars.map((b) => b.value)));
  const iw = W - pad.l - pad.r;
  const ih = H - pad.t - pad.b;
  const step = iw / Math.max(1, bars.length);
  const bw = Math.min(40, step * 0.6);
  const y = (v: number) => pad.t + ih - (v / max) * ih;

  const ticks = [0, max / 2, max];
  const grid = ticks
    .map((t) => `<line class="gridline" x1="${pad.l}" x2="${W - pad.r}" y1="${y(t)}" y2="${y(t)}"/><text x="${pad.l - 6}" y="${y(t) + 4}" text-anchor="end">${esc(fmt(t))}</text>`)
    .join("");

  const marks = bars
    .map((b, i) => {
      const cx = pad.l + step * i + step / 2;
      const top = y(b.value);
      const h = Math.max(0, pad.t + ih - top);
      // Rounded top, square base: path with 4px radius on the data end only.
      const r = Math.min(4, h, bw / 2);
      const x0 = cx - bw / 2;
      const base = pad.t + ih;
      const d = h > 0 ? `M${x0},${base}V${top + r}Q${x0},${top} ${x0 + r},${top}H${x0 + bw - r}Q${x0 + bw},${top} ${x0 + bw},${top + r}V${base}Z` : "";
      return `<g><rect class="hit" x="${cx - step / 2}" y="${pad.t}" width="${step}" height="${ih}" data-tip="${esc(b.tip)}" tabindex="0"/><path class="bar" d="${d}" pointer-events="none"/>
        <text x="${cx}" y="${H - 8}" text-anchor="middle">${esc(b.label)}</text></g>`;
    })
    .join("");

  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(opts.title)}">${grid}<line class="axis" x1="${pad.l}" x2="${W - pad.r}" y1="${pad.t + ih}" y2="${pad.t + ih}"/>${marks}</svg>`;
}

/**
 * Which x labels to show on a phone (true = shown): every k-th label counted back from the
 * last, so the most recent edition is always labelled and no two shown labels are neighbours.
 * The others are still drawn (class "thin") and hidden only at phone width.
 */
export function thinLabels(n: number, maxLabels: number): boolean[] {
  const k = Math.max(1, Math.ceil(n / maxLabels));
  return Array.from({ length: n }, (_, i) => (n - 1 - i) % k === 0);
}

/** Width of one label character at the phone font size (21px in a 640-unit chart). */
const CHAR_W = 12.6;

/** Left margin (chart units) wide enough for the longest level label at phone size. */
export function levelPad(levels: readonly string[]): number {
  return Math.max(130, Math.ceil(Math.max(0, ...levels.map((l) => l.length)) * CHAR_W + 8));
}

/** Labels shown on a phone, at most. */
const PHONE_MAX_LABELS = 6;

export interface Point {
  x: string; // category label (edition year)
  y?: number; // row index into `levels`; undefined = no data for that edition
  tip: string;
}

/** Ordinal dot-line chart: one dot per edition at its finish level (top = best). */
export function ordinalChart(points: Point[], levels: readonly string[], opts: { title: string }): string {
  const rowH = 34;
  const pad = { t: 10, r: 12, b: 34, l: levelPad(levels) };
  const shown = thinLabels(points.length, PHONE_MAX_LABELS);
  const H = pad.t + rowH * (levels.length - 1) + pad.b + 4;
  const iw = W - pad.l - pad.r;
  const step = iw / Math.max(1, points.length);
  const x = (i: number) => pad.l + step * i + step / 2;
  const y = (lvl: number) => pad.t + 2 + lvl * rowH;

  const grid = levels
    .map((l, i) => `<line class="gridline" x1="${pad.l}" x2="${W - pad.r}" y1="${y(i)}" y2="${y(i)}"/><text x="${pad.l - 8}" y="${y(i) + 4}" text-anchor="end">${esc(l)}</text>`)
    .join("");

  // Line segments only between consecutive editions that both have data.
  let path = "";
  points.forEach((p, i) => {
    if (p.y === undefined) return;
    const prev = points[i - 1];
    path += `${prev && prev.y !== undefined ? "L" : "M"}${x(i)},${y(p.y)}`;
  });

  const marks = points
    .map((p, i) => {
      const label = `<text x="${x(i)}" y="${H - 8}" text-anchor="middle"${shown[i] ? "" : ' class="thin"'}>${esc(p.x)}</text>`;
      if (p.y === undefined) return label;
      return `${label}<circle class="dot" cx="${x(i)}" cy="${y(p.y)}" r="5" pointer-events="none"/>
        <rect class="hit" x="${x(i) - step / 2}" y="${pad.t - 6}" width="${step}" height="${H - pad.t - pad.b + 6}" data-tip="${esc(p.tip)}" tabindex="0"/>`;
    })
    .join("");

  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(opts.title)}">${grid}<path class="line" d="${path}"/>${marks}</svg>`;
}

function niceMax(v: number): number {
  const p = 10 ** Math.floor(Math.log10(v));
  for (const m of [1, 2, 2.5, 5, 10]) if (m * p >= v) return m * p;
  return 10 * p;
}
