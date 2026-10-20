// Stub: filled in by the next commit (#56).
export const FIT_SELECTOR = "";
export const STACK = "stack";
export function restack<T extends { classList: { add(c: string): void; remove(c: string): void } }>(_tables: T[], _overflows: (t: T) => boolean): void {}
export function fitTables(_root: ParentNode): void {}
export function watchTables(_root: ParentNode): void {}
