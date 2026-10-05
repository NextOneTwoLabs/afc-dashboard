import "./style.css";
import { buildDataset, type Dataset } from "./model";
import editionsCsv from "../data/editions.csv?raw";
import matchesCsv from "../data/matches.csv?raw";
import teamsCsv from "../data/teams.csv?raw";
import demoEditions from "../tests/fixtures/editions.csv?raw";
import demoMatches from "../tests/fixtures/matches.csv?raw";
import { edition } from "./views/edition";
import { h2h } from "./views/h2h";
import { matches } from "./views/matches";
import { overview } from "./views/overview";
import { records } from "./views/records";
import { team } from "./views/team";

// ?demo loads the fictional fixture (years 2099/2101) for UI development.
const demo = new URLSearchParams(location.search).has("demo");
const ds: Dataset = demo ? buildDataset(teamsCsv, demoEditions, demoMatches) : buildDataset(teamsCsv, editionsCsv, matchesCsv);

const TABS = [
  ["overview", "Overview"],
  ["edition", "Editions"],
  ["team", "Teams"],
  ["h2h", "Head-to-head"],
  ["matches", "Matches"],
  ["records", "Records"],
] as const;

const app = document.getElementById("app")!;
const nav = document.getElementById("tabs")!;

function route() {
  const [path, query = ""] = location.hash.replace(/^#\/?/, "").split("?");
  const [view = "overview", a, b] = path.split("/").filter(Boolean).map(decodeURIComponent);
  const q = new URLSearchParams(query);

  const html =
    view === "edition" ? edition(ds, a)
    : view === "team" ? team(ds, a)
    : view === "h2h" ? h2h(ds, a, b)
    : view === "matches" ? matches(ds, q)
    : view === "records" ? records(ds)
    : overview(ds);

  const banner = demo
    ? `<div class="banner"><strong>Demo data.</strong> Fictional results (years 2099 and 2101) for previewing the layout. <a href="./">Show real data</a></div>`
    : !ds.matches.length
      ? `<div class="banner"><strong>Dataset in progress.</strong> Match results are still being compiled and verified; editions marked <em>unverified</em> haven't been checked against sources yet.</div>`
      : "";

  app.innerHTML = banner + html;
  const current = TABS.some(([k]) => k === view) ? view : "overview";
  nav.innerHTML = TABS.map(([k, label]) => `<a href="#/${k}" ${k === current ? 'aria-current="page"' : ""}>${label}</a>`).join("");
  document.title = `${TABS.find(([k]) => k === current)![1]} · Women's U-17 Asian Cup history`;
  bind();
}

function bind() {
  const go = (h: string) => (location.hash = h);
  document.getElementById("team-pick")?.addEventListener("change", (e) => go(`#/team/${(e.target as HTMLSelectElement).value}`));
  const a = document.getElementById("h2h-a") as HTMLSelectElement | null;
  const b = document.getElementById("h2h-b") as HTMLSelectElement | null;
  for (const s of [a, b]) s?.addEventListener("change", () => go(`#/h2h/${a!.value}/${b!.value}`));
  const form = document.getElementById("match-filters") as HTMLFormElement | null;
  if (form) {
    const update = () => {
      const p = new URLSearchParams();
      for (const [k, v] of new FormData(form)) if (v) p.set(k, String(v));
      history.replaceState(null, "", `#/matches?${p}`);
      route();
      const input = document.querySelector<HTMLInputElement>('#match-filters input[name="q"]');
      if (input && document.activeElement !== input && p.has("q")) {
        input.focus();
        input.setSelectionRange(input.value.length, input.value.length);
      }
    };
    form.addEventListener("change", update);
    form.addEventListener("input", (e) => (e.target as HTMLElement).matches("input") && update());
    form.addEventListener("submit", (e) => e.preventDefault());
  }
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
  themeBtn.textContent = { auto: "◐ Auto", light: "☀ Light", dark: "☾ Dark" }[theme];
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
