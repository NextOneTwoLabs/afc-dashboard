import "./style.css";
import { buildDataset, type Dataset } from "./model";
import drawsCsv from "../data/draws.csv?raw";
import editionsCsv from "../data/editions.csv?raw";
import matchesCsv from "../data/matches.csv?raw";
import teamsCsv from "../data/teams.csv?raw";
import u20DrawsCsv from "../data/u20/draws.csv?raw";
import u20EditionsCsv from "../data/u20/editions.csv?raw";
import u20MatchesCsv from "../data/u20/matches.csv?raw";
import demoEditions from "../tests/fixtures/editions.csv?raw";
import demoMatches from "../tests/fixtures/matches.csv?raw";
import { COMP, fromSlug } from "./competitions";
import { TABS, latestEvent, resolve } from "./routes";
import { edition } from "./views/edition";
import { events } from "./views/events";
import { team } from "./views/team";
import { FOCUS } from "./ui";

// ?demo loads the fictional fixture (years 2099/2101) for UI development.
const demo = new URLSearchParams(location.search).has("demo");
const ds: Dataset = demo
  ? buildDataset(teamsCsv, demoEditions, demoMatches)
  : buildDataset(teamsCsv, editionsCsv, matchesCsv, drawsCsv, { editions: u20EditionsCsv, matches: u20MatchesCsv, draws: u20DrawsCsv });

const app = document.getElementById("app")!;
const nav = document.getElementById("tabs")!;

const ctx = {
  years: {
    U17: ds.editions.filter((e) => e.competition === "U17").map((e) => e.year),
    U20: ds.editions.filter((e) => e.competition === "U20").map((e) => e.year),
  },
  hasTeam: (c: string) => ds.teams.has(c),
  focus: FOCUS,
  // The site opens on the most recent tournament of either competition (owner's decision, #30).
  latest: latestEvent(ds.editions, ds.matches),
};

function route() {
  const r = resolve(location.hash, ctx);
  if ("redirect" in r) {
    history.replaceState(null, "", r.redirect);
    return route();
  }
  const { view, args, filter } = r.route;
  const c = view === "events" ? fromSlug(args[0]) ?? "U17" : undefined;
  const html = view === "team" ? team(ds, args[0], args[2], filter ?? "both") : args.length > 1 ? edition(ds, args[1], c) : events(ds, c);

  const banner = demo
    ? `<div class="banner"><strong>Demo data.</strong> Fictional results (years 2099 and 2101) for previewing the layout. <a href="./">Show real data</a></div>`
    : !ds.matches.length
      ? `<div class="banner"><strong>Dataset in progress.</strong> Match results are still being compiled and verified; editions marked <em>unverified</em> haven't been checked against sources yet.</div>`
      : "";

  app.innerHTML = banner + html;
  nav.innerHTML = TABS.map(([k, label]) => `<a href="#/${k}" ${k === view ? 'aria-current="page"' : ""}>${label}</a>`).join("");
  const page =
    view === "team"
      ? (ds.teams.get(args[0])?.name ?? "Teams")
      : args.length > 1
        ? `${args[1]} ${COMP[c!].label} · Events`
        : `All events · ${COMP[c!].label}`;
  document.title = `${page} · AFC Women's Youth Asian Cups`;
  bind(view === "team" ? args[0] : undefined, args[2], filter ? `?c=${COMP[filter].slug}` : "");
}

/** The team pickers keep the opponent and the competition filter where they still apply. */
function bind(code?: string, opp?: string, query = "") {
  const go = (h: string) => (location.hash = h);
  document.getElementById("team-pick")?.addEventListener("change", (e) => {
    const t = (e.target as HTMLSelectElement).value;
    go(`${opp && opp !== t ? `#/team/${t}/vs/${opp}` : `#/team/${t}`}${query}`);
  });
  document.getElementById("compare-pick")?.addEventListener("change", (e) => {
    const o = (e.target as HTMLSelectElement).value;
    go(`${o ? `#/team/${code}/vs/${o}` : `#/team/${code}`}${query}`);
  });
}

// One tooltip for every chart mark carrying data-tip.
const tip = document.createElement("div");
tip.className = "tooltip";
tip.setAttribute("role", "tooltip");
document.body.append(tip);
const showTip = (el: Element, x: number, y: number) => {
  tip.textContent = el.getAttribute("data-tip");
  tip.classList.add("on");
  const r = tip.getBoundingClientRect();
  tip.style.left = `${Math.min(window.innerWidth - r.width - 8, Math.max(8, x - r.width / 2))}px`;
  tip.style.top = `${Math.max(8, y - r.height - 12)}px`;
};
document.addEventListener("pointermove", (e) => {
  const el = (e.target as Element).closest?.("[data-tip]");
  if (el) showTip(el, e.clientX, e.clientY);
  else tip.classList.remove("on");
});
document.addEventListener("focusin", (e) => {
  const el = (e.target as Element).closest?.("[data-tip]");
  if (!el) return tip.classList.remove("on");
  const r = el.getBoundingClientRect();
  showTip(el, r.left + r.width / 2, r.top);
});

// Theme toggle: auto → light → dark, remembered per browser.
const themeBtn = document.getElementById("theme")!;
const themes = ["auto", "light", "dark"] as const;
let theme: (typeof themes)[number] = "auto";
try {
  theme = (localStorage.getItem("theme") as typeof theme) || "auto";
} catch {}
const applyTheme = () => {
  if (theme === "auto") document.documentElement.removeAttribute("data-theme");
  else document.documentElement.setAttribute("data-theme", theme);
  // The family's 36px icon toggle; the three states stay (Auto follows the system setting).
  const label = { auto: "Auto", light: "Light", dark: "Dark" }[theme];
  themeBtn.textContent = { auto: "🌓", light: "☀", dark: "🌙" }[theme];
  themeBtn.setAttribute("aria-label", `Colour theme: ${label}`);
  themeBtn.title = `Colour theme: ${label} (click to change)`;
};
themeBtn.addEventListener("click", () => {
  theme = themes[(themes.indexOf(theme) + 1) % themes.length];
  try {
    localStorage.setItem("theme", theme);
  } catch {}
  applyTheme();
});
applyTheme();

window.addEventListener("hashchange", () => {
  route();
  window.scrollTo(0, 0);
});
route();
