// A table takes the phone layout (two-line match rows, summary blocks, fewer columns: the `.stack` CSS)
// exactly when it cannot fit its card, at any width (#56). Nothing here knows a pixel width: each table
// is measured at its natural desktop width and stacked only if that overflows its scroll wrapper.
//
// Timing: the measure runs synchronously after the page is rendered and before the browser paints, so
// there is no flash of the wide table and no visible jump on first paint. Later changes (window resize,
// opening a <details>, fonts arriving) re-run it inside the same frame (ResizeObserver callbacks run
// before paint); only a webfont arriving after first paint can change a table's layout on screen.

/** The tables this applies to: match lists (not the All events `.fit` tables, which wrap), Summary, and the
 *  tables with secondary columns (standings, By edition). */
export const FIT_SELECTOR = "table.matches:not(.fit), table.summary, table:has(.hide-sm)";
const FALLBACK_SELECTOR = "table.matches:not(.fit), table.summary"; // a browser without :has()
export const STACK = "stack";

type Classy = { classList: { add(c: string): void; remove(c: string): void } };

/** Unstack every table, read all of them, then stack the ones that overflow: one layout pass for the reads, and
 *  each table judged at its natural width, so a table that now fits goes back to the desktop layout. */
export function restack<T extends Classy>(tables: T[], overflows: (t: T) => boolean): void {
  for (const t of tables) t.classList.remove(STACK);
  const over = tables.map(overflows);
  tables.forEach((t, i) => {
    if (over[i]) t.classList.add(STACK);
  });
}

const tablesIn = (root: ParentNode): HTMLTableElement[] => {
  try {
    return [...root.querySelectorAll<HTMLTableElement>(FIT_SELECTOR)];
  } catch {
    return [...root.querySelectorAll<HTMLTableElement>(FALLBACK_SELECTOR)];
  }
};

/** Whether a table is wider than the box that scrolls it. A closed <details> measures 0 and reports no overflow. */
const overflowsCard = (t: HTMLTableElement): boolean => {
  const wrap = (t.closest(".table-wrap") ?? t.parentElement) as HTMLElement;
  return wrap.scrollWidth > wrap.clientWidth;
};

export function fitTables(root: ParentNode): void {
  restack(tablesIn(root), overflowsCard);
}

/** Re-fit when the page width changes, when a <details> opens (its tables were not measurable while closed) and when fonts load. */
export function watchTables(root: HTMLElement): void {
  let width = -1;
  if (typeof ResizeObserver !== "undefined") {
    new ResizeObserver(() => {
      const w = root.clientWidth;
      if (w === width) return; // our own height changes must not retrigger us
      width = w;
      fitTables(root);
    }).observe(root);
  }
  root.addEventListener("toggle", () => fitTables(root), true); // toggle does not bubble; capture sees it
  void document.fonts?.ready.then(() => fitTables(root));
}
