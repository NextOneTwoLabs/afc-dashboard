// Display names and URL segments of the two competitions (#30).
import { COMPETITIONS, type Competition } from "./model";

export const COMP: Record<Competition, { slug: string; label: string; lede: string }> = {
  U17: {
    slug: "u17",
    label: "U-17",
    lede: "Every edition of the AFC U-17 Women's Asian Cup — U-17 in 2005, U-16 from 2007 to 2019, U-17 again since 2024 — qualifiers included.",
  },
  U20: {
    slug: "u20",
    label: "U-20",
    lede: "Every edition of the AFC U-20 Women's Asian Cup — the AFC U-19 Women's Championship from 2002 to 2019, U-20 since 2024 — qualifiers included.",
  },
};

/** The competition for a URL segment ("u17", "u20"), if any. */
export const fromSlug = (s: string | null | undefined): Competition | undefined => COMPETITIONS.find((c) => COMP[c].slug === s);

/** Link to a competition's overview, or to one of its editions. */
export const eventHref = (c: Competition, year?: number) => `#/events/${COMP[c].slug}${year === undefined ? "" : `/${year}`}`;
