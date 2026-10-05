# AFC Women's U-17 Asian Cup — history dashboard

A static dashboard of every AFC women's under-17 championship, **qualifiers included**:

| Era | Competition name |
|---|---|
| 2005 | AFC U-17 Women's Championship |
| 2007–2019 | AFC U-16 Women's Championship |
| 2024– | AFC U-17 Women's Asian Cup (2022 edition cancelled) |

Views: **Overview** (champions, medal table, goals trend, Hong Kong spotlight) · **Editions** (group tables, knockout, qualifiers) · **Teams** (record and finish by edition) · **Head-to-head** · **Matches** (filterable) · **Records**.

Hong Kong is the spotlight team (`FOCUS` in `src/ui.ts`): its rows are highlighted everywhere and it's the default team on the Teams and Head-to-head views.

## Data

Everything lives in plain CSV under [`data/`](data/), so results can be fixed without touching code.

- `teams.csv` — `code` (FIFA trigram), `name`, `flag`, `former_names` (`|`-separated)
- `editions.csv` — one row per edition: host, dates, status (`completed`/`cancelled`/`scheduled`), podium as team codes, `verified` (1 once checked against sources), `source`
- `matches.csv` — one row per match:

| column | meaning |
|---|---|
| `id` | unique, e.g. `2024-F-01`, `2024-Q-R1-A-01` |
| `year` | edition year (the tournament year, even for qualifiers played the year before) |
| `phase` | `qualifying` or `final` |
| `round` | `Round 1`, `Round 2`, `Group stage`, `Play-off`, `Quarter-final`, `Semi-final`, `Third place`, `Final` |
| `group` | group letter; **empty for knockout matches** |
| `date` | `YYYY-MM-DD` |
| `home`, `away`, `hs`, `as` | team codes and full-time score (after extra time if played) |
| `aet` | `1` if extra time was played |
| `hp`, `ap` | penalty shoot-out score, if any |
| `source` | URL of the match report or page the result came from |

`npm test` checks the data: known team codes, valid dates and scores, no penalties after a decisive score, every knockout match has a winner, and the edition podium agrees with the Final and Third-place matches.

Conventions: shoot-out results count as **draws** in records; group tables use AFC tie-breakers (points, head-to-head, then goal difference and goals).

## Develop

```sh
npm install
npm run dev      # http://localhost:5173  — add ?demo to preview with fictional data
npm test         # data + stats checks
npm run build    # static site in dist/
```

Pushing to `main` runs the tests and deploys to GitHub Pages (`.github/workflows/deploy.yml`). One-time setup: **Settings → Pages → Source: GitHub Actions**.
