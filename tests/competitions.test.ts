// Phase 1a of #30: U-17 and U-20 editions share years, so everything keyed by year must also
// be keyed by competition. Small inline datasets, independent of data/.
import { describe, expect, it } from "vitest";
import { buildDataset, sameEdition, type Competition } from "../src/model";
import { latestEvent } from "../src/routes";
import { finish, groups, teamSummary } from "../src/stats";
import { edition } from "../src/views/edition";
import { events } from "../src/views/events";
import { team } from "../src/views/team";

const TEAMS = `code,name,flag,former_names
AUS,Australia,🇦🇺,
CHN,China PR,🇨🇳,
HKG,Hong Kong,🇭🇰,
JPN,Japan,🇯🇵,
KOR,Korea Republic,🇰🇷,
PRK,DPR Korea,🇰🇵,
VIE,Vietnam,🇻🇳,`;
const ED = "year,name,age_limit,host,start,end,status,champion,runner_up,third,fourth,verified,notes,source";
const M = "id,year,phase,round,group,date,venue,home,away,hs,as,aet,hp,ap,notes,source";
const DR = "year,phase,round,group,team,notes,source";

// U-17 2024: PRK champion, CHN fourth. Vietnam and Hong Kong don't take part.
const U17_ED = `${ED}
2024,U-17 Cup,17,Indonesia,2024-05-06,2024-05-19,completed,PRK,JPN,KOR,CHN,1,,`;
const U17_M = `${M}
2024-F-01,2024,final,Group stage,A,2024-05-06,X,PRK,KOR,7,0,,,,,
2024-F-02,2024,final,Group stage,B,2024-05-07,X,JPN,CHN,2,0,,,,,
2024-F-03,2024,final,Semi-final,,2024-05-16,X,JPN,KOR,3,0,,,,,
2024-F-04,2024,final,Semi-final,,2024-05-16,X,PRK,CHN,1,0,,,,,
2024-F-05,2024,final,Third place,,2024-05-19,X,CHN,KOR,1,2,,,,,
2024-F-06,2024,final,Final,,2024-05-19,X,PRK,JPN,1,0,,,,,`;
const U17_DR = `${DR}
2024,final,Group stage,A,PRK,,
2024,final,Group stage,A,KOR,,`;

// U-20 2002 (a year with no U-17 edition) and U-20 2024 (same year as U-17 2024).
// Vietnam and Hong Kong play only here, in U-20 2024 group A.
const U20_ED = `${ED}
2002,U-19 Cup,19,India,2002-04-19,2002-04-28,completed,JPN,CHN,KOR,PRK,1,,
2024,U-20 Cup,20,Uzbekistan,2024-03-03,2024-03-16,completed,PRK,JPN,AUS,KOR,1,,`;
const U20_M = `${M}
U20-2002-F-01,2002,final,Third place,,2002-04-28,X,KOR,PRK,4,1,,,,,
U20-2002-F-02,2002,final,Final,,2002-04-28,X,JPN,CHN,2,1,,,,,
U20-2024-F-01,2024,final,Group stage,A,2024-03-03,X,JPN,VIE,5,0,,,,,
U20-2024-F-02,2024,final,Group stage,A,2024-03-04,X,AUS,HKG,1,1,,,,,
U20-2024-F-03,2024,final,Semi-final,,2024-03-13,X,PRK,KOR,2,0,,,,,
U20-2024-F-04,2024,final,Semi-final,,2024-03-13,X,JPN,AUS,1,0,,,,,
U20-2024-F-05,2024,final,Third place,,2024-03-16,X,AUS,KOR,1,0,,,,,
U20-2024-F-06,2024,final,Final,,2024-03-16,X,PRK,JPN,2,1,,,,,`;
const U20_DR = `${DR}
2024,final,Group stage,A,JPN,,
2024,final,Group stage,A,VIE,,
2024,final,Group stage,A,AUS,,
2024,final,Group stage,A,HKG,,`;

const ds = buildDataset(TEAMS, U17_ED, U17_M, U17_DR, { editions: U20_ED, matches: U20_M, draws: U20_DR });
const ed = (c: Competition, y: number) => ds.editions.find((e) => e.competition === c && e.year === y);
/** Fails as an assertion (not a TypeError) when the edition isn't loaded. */
const must = (c: Competition, y: number) => {
  const e = ed(c, y);
  expect(e, `${c} ${y} edition`).toBeDefined();
  return e!;
};
const byEdition = (html: string) => /<h2>By edition<\/h2>([\s\S]*?)<\/table>/.exec(html)?.[1] ?? "";

describe("competitions in the model (#30, phase 1a)", () => {
  it("tags every edition, match and draw with its competition", () => {
    expect(ds.editions.map((e) => `${e.competition} ${e.year}`).sort()).toEqual(["U17 2024", "U20 2002", "U20 2024"]);
    expect(ds.matches.filter((m) => m.competition === "U20")).toHaveLength(8);
    expect(ds.matches.filter((m) => m.competition === "U17")).toHaveLength(6);
    expect(ds.draws.filter((d) => d.competition === "U20")).toHaveLength(4);
    for (const m of ds.matches) expect(m.id.startsWith("U20-"), m.id).toBe(m.competition === "U20");
  });

  it("without U-20 files, holds only U-17 rows", () => {
    const only = buildDataset(TEAMS, U17_ED, U17_M, U17_DR);
    expect(new Set([...only.editions, ...only.matches, ...only.draws].map((x) => x.competition))).toEqual(new Set(["U17"]));
  });

  it("matches a row to an edition by competition and year", () => {
    const u20m = ds.matches.find((m) => m.id === "U20-2024-F-01")!;
    expect(u20m).toBeDefined();
    expect(sameEdition(u20m, must("U20", 2024))).toBe(true);
    expect(sameEdition(u20m, must("U17", 2024))).toBe(false);
  });

  it("finish() reads only the edition's own competition", () => {
    expect(finish(ds, must("U20", 2024), "VIE")).toBe("Group stage");
    expect(finish(ds, must("U17", 2024), "VIE")).toBe("Did not enter"); // VIE played U-20 2024 only
    expect(finish(ds, must("U20", 2024), "CHN")).toBe("Did not enter"); // CHN played U-17 2024 only
  });

  it("groups() keeps the competitions apart in a shared year", () => {
    const teamsIn = (c: Competition) => new Set([...groups(ds.matches, 2024, "final", c).values()].flat().flatMap((m) => [m.home, m.away]));
    expect(teamsIn("U20")).toEqual(new Set(["JPN", "VIE", "AUS", "HKG"]));
    expect(teamsIn("U17")).toEqual(new Set(["PRK", "KOR", "JPN", "CHN"]));
  });

  it("an event page shows only its competition", () => {
    const u20 = edition(ds, "2024", "U20");
    expect(u20).toContain("Vietnam");
    expect(u20).toMatch(/Third<\/div><a[^>]*#\/team\/AUS/); // U-20 podium, not U-17's
    expect(u20).toMatch(/>2002<\/a>/); // chips list the U-20 editions
    const u17 = edition(ds, "2024", "U17");
    expect(u17).not.toContain("Vietnam");
    expect(u17).not.toContain("Hong Kong"); // nor U-20 2024's draw
    expect(u17).not.toMatch(/>2002<\/a>/);
    expect(edition(ds, "2024")).toBe(u17); // the default is U-17, as on the site today
  });

  it("the Events overview counts one competition", () => {
    const u20 = events(ds, "U20");
    expect(u20).toMatch(/>2002</); // U-20 timeline
    expect(u20).toContain("Vietnam"); // VIE's U-20 match is in the records
    const u17 = events(ds, "U17");
    expect(u17).not.toMatch(/>2002</);
    expect(u17).not.toContain("Vietnam");
    expect(events(ds)).toBe(u17);
  });

  it("a team page and summary read one competition, or all of them", () => {
    expect(byEdition(team(ds, "HKG", undefined, "U20"))).toMatch(/2024<\/a><\/td><td>.*?<\/td><td>0-1-0/);
    expect(team(ds, "HKG", undefined, "U17")).not.toMatch(/2024<\/a>/); // Hong Kong played no U-17 2024 match
    expect(teamSummary(ds, "JPN", "U20")).toMatchObject({ appearances: 2, titles: 1 });
    expect(teamSummary(ds, "JPN", "U17")).toMatchObject({ appearances: 1, titles: 0 });
    expect(teamSummary(ds, "JPN")).toMatchObject({ appearances: 3, titles: 1 });
  });
});

describe("latestEvent() (#30)", () => {
  it("picks the edition with the most recent match, across competitions", () => {
    // U-17 2024 ends 19 May, U-20 2024 on 16 March.
    expect(latestEvent(ds.editions, ds.matches)).toEqual({ competition: "U17", year: 2024 });
    const later = buildDataset(TEAMS, U17_ED, U17_M, U17_DR, {
      editions: `${U20_ED}\n2026,U-20 Cup,20,Thailand,,,scheduled,,,,,0,,`,
      matches: `${U20_M}\nU20-2026-Q-R1-A-01,2026,qualifying,Round 1,A,2025-08-06,X,HKG,VIE,1,0,,,,,`,
    });
    expect(latestEvent(later.editions, later.matches)).toEqual({ competition: "U20", year: 2026 });
  });

  it("prefers U-17 when both competitions' latest matches are on the same day", () => {
    const tie = buildDataset(TEAMS, U17_ED, U17_M, U17_DR, {
      editions: U20_ED,
      matches: `${U20_M}\nU20-2024-F-07,2024,final,Group stage,B,2024-05-19,X,CHN,KOR,0,0,,,,,`,
    });
    expect(latestEvent(tie.editions, tie.matches)).toEqual({ competition: "U17", year: 2024 });
  });

  it("falls back to the latest completed edition when there are no matches", () => {
    const none = buildDataset(TEAMS, U17_ED, M, DR, { editions: `${U20_ED}\n2026,U-20 Cup,20,Thailand,2026-04-01,2026-04-18,completed,JPN,PRK,,,0,,`, matches: M });
    expect(latestEvent(none.editions, none.matches)).toEqual({ competition: "U20", year: 2026 });
  });
});
