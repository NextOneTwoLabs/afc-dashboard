# AFC Women's Youth Asian Cups — history dashboard

A static dashboard of the AFC's two women's youth championships, **qualifiers included**:

| Competition | Era | Name |
|---|---|---|
| U-17 | 2005 | AFC U-17 Women's Championship |
| | 2007–2019 | AFC U-16 Women's Championship |
| | 2024– | AFC U-17 Women's Asian Cup (2022 edition cancelled) |
| U-20 | 2002–2019 | AFC U-19 Women's Championship |
| | 2024– | AFC U-20 Women's Asian Cup (2022 edition cancelled) |

Only matches of these AFC tournaments (finals and their qualifiers) are tracked, never friendlies.

A research reference with two views:

- **Events**: the site opens on the most recent tournament of either competition (the edition whose latest match is the most recent; U-17 on a tie; `latestEvent` in `src/routes.ts`), with its podium, group tables, knockout and qualifiers. A **U-17 / U-20** switch sits over each competition's year chips; from an event it goes to the other competition's same year, or else to its most recent tournament. **All events** (`#/events/u17`, `#/events/u20`) lists a competition's editions with champions, the medal table, the goals trend and all-time records.
- **Teams**: a team's summary by competition (with a total), one finish chart per competition, its record by edition, biggest wins, longest unbeaten run and all its matches, plus **Compare with…** for its head-to-head record against one opponent. A **Both / U-17 / U-20** filter narrows the whole page.

Routes are `#/events/<c>`, `#/events/<c>/<year>` (`<c>` is `u17` or `u20`), `#/team/<code>` and `#/team/<code>/vs/<code>`, each team route with an optional `?c=u17` or `?c=u20`. Older links (`#/events`, `#/events/<year>`, `#/overview`, `#/edition`, `#/h2h`, `#/matches`, `#/records`) all meant U-17 and redirect to the matching page in one step.

Hong Kong is the focus team (`FOCUS` in `src/ui.ts`): its rows are highlighted everywhere and it's the default team on the Teams view.

## Data

Everything lives in plain CSV under [`data/`](data/), so results can be fixed without touching code.

- `teams.csv` — `code` (FIFA trigram), `name`, `flag`, `former_names` (`|`-separated)
- `editions.csv` — one row per edition: host, dates, status (`completed`/`cancelled`/`scheduled`), podium as team codes, `verified` (1 once checked against sources), `source`
- `matches.csv` — one row per match:

| column | meaning |
|---|---|
| `id` | unique, e.g. `2024-F-01`, `2024-Q-R1-A-01`; U-20 ids start with `U20-`, e.g. `U20-2024-F-01`, `U20-2024-Q-R1-A-01` |
| `year` | edition year (the tournament year, even for qualifiers played the year before) |
| `phase` | `qualifying` or `final` |
| `round` | `Round 1`, `Round 2`, `Group stage`, `Play-off`, `Quarter-final`, `Semi-final`, `Third place`, `Final` |
| `group` | group letter; **empty for knockout matches** |
| `date` | `YYYY-MM-DD` |
| `home`, `away`, `hs`, `as` | team codes and full-time score (after extra time if played) |
| `aet` | `1` if extra time was played |
| `hp`, `ap` | penalty shoot-out score, if any |
| `source` | URL of the match report or page the result came from |

- `u20/` — the U-20 competition (the AFC U-20 Women's Asian Cup and its U-19 era): `editions.csv`, `matches.csv` and `draws.csv` with the same columns as the U-17 files here, sharing `teams.csv`. An edition is keyed by competition and year, since both competitions use the same years. Each row gets its competition from its folder when the data is loaded. So far they hold the final tournaments of 2002, 2006–2011, 2013–2019, 2024 and 2026, and the cancelled 2022 edition (issue #30; 2004 is waiting for a dated source).
- `draws.csv` — one row per team drawn into a group: `year`, `phase`, `round`, `group` (same values as in `matches.csv`), `team`, `notes`, `source`. It lets a group table list a drawn team that hasn't played yet, with zeros. For now it holds only the 2027 qualifiers (8 groups, 29 teams; Iran withdrew after the draw and is left out), from the pinned Wikipedia revision [oldid 1378683887](https://en.wikipedia.org/w/index.php?title=2027_AFC_U-17_Women%27s_Asian_Cup_qualification&oldid=1378683887). Groups with no rows here list only the teams in their matches. Keep the header even if the file is ever emptied: the site imports it.

`npm test` checks the data of both competitions: known team codes, valid dates and scores, no penalties after a decisive score, every knockout match has a winner, and the edition podium agrees with the Final and Third-place matches.

Conventions: shoot-out results count as **draws** in records; group tables use AFC tie-breakers (points, head-to-head, then goal difference and goals).

## Develop

```sh
npm install
npm run dev      # http://localhost:5173  — add ?demo to preview with fictional data
npm test         # data, stats, routes and views checks
npm run build    # static site in dist/
```

## Deploy (Cloudflare Workers)

The site runs on Cloudflare Workers as static assets (`wrangler.toml`). Deploys are done by
**Workers Builds**, Cloudflare's GitHub integration, the same way as `ecnl-dashboard`:

1. Cloudflare dashboard → **Workers & Pages → Create → Import a repository** → `NextOneTwoLabs/afc-dashboard`.
2. Project name `afc-dashboard`, build command `npm run build`, deploy command `npx wrangler deploy`.
3. Every push to `main` then deploys to production; other branches get preview URLs.

GitHub Actions (`.github/workflows/test.yml`) only runs the tests and a build check.

Planned: an `/api` layer in the same Worker (`run_worker_first = ["/api/*"]`), with the data in D1 and
server-side full-text search.
