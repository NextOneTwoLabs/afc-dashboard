// Team-page fixes from #18, checked on small inline datasets so they don't depend on data/.
import { describe, expect, it } from "vitest";
import { buildDataset } from "../src/model";
import { finish, teamSummary } from "../src/stats";
import { edition } from "../src/views/edition";
import { team } from "../src/views/team";

const TEAMS = `code,name,flag,former_names
AUS,Australia,🇦🇺,
CHN,China PR,🇨🇳,
HKG,Hong Kong,🇭🇰,
JPN,Japan,🇯🇵,
KOR,Korea Republic,🇰🇷,
PRK,DPR Korea,🇰🇵,
THA,Thailand,🇹🇭,
VIE,Vietnam,🇻🇳,`;

const ED = "year,name,age_limit,host,start,end,status,champion,runner_up,third,fourth,verified,notes,source";
const M = "id,year,phase,round,group,date,venue,home,away,hs,as,aet,hp,ap,notes,source";

// 2090: groups, quarter-finals, semi-finals and a Final, but no third-place match (like 2026).
// 2091: JPN champion with no match rows (like 2011 before its matches were entered).
// 2092: scheduled, with one qualifier played. 2093: cancelled, with one qualifier played.
const ds = buildDataset(
  TEAMS,
  `${ED}
2090,Test Cup,17,Japan,2090-05-01,2090-05-17,completed,PRK,JPN,,,1,,
2091,Test Cup,17,Japan,2091-05-01,2091-05-17,completed,JPN,PRK,CHN,KOR,1,,
2092,Test Cup,17,Japan,,,scheduled,,,,,0,,
2093,Test Cup,17,Japan,,,cancelled,,,,,0,,`,
  `${M}
t01,2090,final,Group stage,A,2090-05-01,X,THA,VIE,1,0,,,,,
t02,2090,final,Group stage,A,2090-05-02,X,AUS,THA,2,0,,,,,
t03,2090,final,Quarter-final,,2090-05-08,X,AUS,KOR,1,0,,,,,
t04,2090,final,Quarter-final,,2090-05-08,X,PRK,THA,3,0,,,,,
t05,2090,final,Quarter-final,,2090-05-09,X,JPN,VIE,2,0,,,,,
t06,2090,final,Quarter-final,,2090-05-09,X,CHN,AUS,0,0,,4,3,,
t07,2090,final,Semi-final,,2090-05-14,X,JPN,AUS,4,0,,,,,
t08,2090,final,Semi-final,,2090-05-14,X,CHN,PRK,2,4,,,,,
t09,2090,final,Final,,2090-05-17,X,PRK,JPN,5,1,,,,,
t10,2092,qualifying,Round 1,A,2091-10-05,X,KOR,VIE,3,0,,,,,
t11,2093,qualifying,Round 1,A,2092-10-05,X,KOR,THA,1,1,,,,,`,
);
const ed = (y: number) => ds.editions.find((e) => e.year === y)!;
const byEdition = (html: string) => /<h2>By edition<\/h2>([\s\S]*?)<\/table>/.exec(html)?.[1] ?? "";
const podium = (html: string) => /<div class="podium">([\s\S]*?)<\/div><\/div>/.exec(html)?.[1] ?? "";

describe("team pages (#18)", () => {
  it("1. the Team picker selects the team being viewed, even with no matches or podium place", () => {
    const pick = /<select id="team-pick">([\s\S]*?)<\/select>/.exec(team(ds, "HKG"))![1];
    expect(pick).toMatch(/<option value="HKG" selected>/);
  });

  it("2. knockout losers without a podium place finish at the round they reached", () => {
    expect(finish(ds, ed(2090), "KOR")).toBe("Quarter-finals"); // lost QF to AUS
    expect(finish(ds, ed(2090), "AUS")).toBe("Semi-finals"); // won QF, lost SF
    expect(finish(ds, ed(2090), "CHN")).toBe("Semi-finals"); // QF won on pens, lost SF
    expect(finish(ds, ed(2090), "VIE")).toBe("Quarter-finals");
    expect(finish(ds, ed(2091), "CHN")).toBe("Third"); // podium places still come first
    expect(teamSummary(ds, "AUS").best).toBe("Semi-finals");
  });

  it("3. finals appearances count a podium place even without match rows", () => {
    expect(teamSummary(ds, "JPN").appearances).toBe(2); // 2090 (matches) + 2091 (champion, no rows)
    expect(teamSummary(ds, "KOR").appearances).toBe(2); // 2090 QF + 2091 fourth; not 2092/2093 qualifiers
  });

  it("4. By edition lists a scheduled or cancelled edition the team has played in", () => {
    const rows = byEdition(team(ds, "KOR"));
    expect(rows).toMatch(/2092<\/a><\/td><td>1-0-0[\s\S]*?In progress/);
    expect(rows).toMatch(/2093<\/a><\/td><td>0-1-0[\s\S]*?Cancelled/);
    expect(rows).not.toMatch(/2093[\s\S]*?In progress/);
  });

  it("5. an edition with no third-place match shows its two semi-final losers as joint semi-finalists", () => {
    const p = podium(edition(ds, "2090"));
    expect(p).toContain("Joint semi-finalists");
    expect(p).toContain('href="#/team/AUS"');
    expect(p).toContain('href="#/team/CHN"');
    expect(p).not.toContain("—");
    // With 3rd/4th recorded, the podium is unchanged.
    expect(podium(edition(ds, "2091"))).toMatch(/Third[\s\S]*China PR[\s\S]*Fourth[\s\S]*Korea Republic/);
  });
});
