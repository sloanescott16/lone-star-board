// v117 "Next one up" countdown: whole Central calendar days to the game. Run: bun test _tests/countdown
import { test, expect } from "bun:test";
const fs = require("fs"), path = require("path");
const html = fs.readFileSync(path.join(__dirname, "../../index.html"), "utf8");
const cut = (a, b) => { const i = html.indexOf(a), j = html.indexOf(b, i); if (i < 0 || j < 0) throw new Error("cut " + a); return html.slice(i, j); };
const M = new Function([cut("const ctDayNo = ", "const store = {"), "return { ctDayNo, ctDaysUntil };"].join("\n"))();
const days = (game, now) => M.ctDaysUntil(Date.parse(game), Date.parse(now));
const GAME = "2026-10-26T19:15:00-05:00";   // at Eagles, Mon 26 Oct 2026, 7:15 PM CDT
// the card's wording, as index.html writes it
const line = d => d === 0 ? "Kickoff today. Straight to it." : `${d} day${d === 1 ? "" : "s"} to redemption.`;

test("the card uses the Central calendar count, not elapsed hours rounded up", () => {
  expect(html).toContain("const days = ctDaysUntil(nx.date);");
  expect(html).not.toContain("Math.ceil((nx.date - Date.now()) / 86400000)");
});

test("Mon 19 Oct, any time of day Central, to Mon 26 Oct 7:15 PM is 7", () => {
  for (const t of ["00:00", "00:01", "06:30", "11:49", "19:14", "19:16", "23:59"])
    expect(days(GAME, `2026-10-19T${t}:00-05:00`)).toBe(7);
  expect(line(days(GAME, "2026-10-19T11:49:00-05:00"))).toBe("7 days to redemption.");
});

test("Sun 25 Oct 11:59 PM CT is 1 day, singular", () => {
  expect(days(GAME, "2026-10-25T23:59:00-05:00")).toBe(1);
  expect(line(1)).toBe("1 day to redemption.");
});

test("Mon 26 Oct 00:01 CT is game day", () => {
  expect(days(GAME, "2026-10-26T00:01:00-05:00")).toBe(0);
  expect(days(GAME, "2026-10-26T19:14:00-05:00")).toBe(0);
  expect(line(0)).toBe("Kickoff today. Straight to it.");
});

test("never negative after kickoff", () => {
  expect(days(GAME, "2026-10-27T01:00:00-05:00")).toBe(0);
});

test("across the 1 Nov fall back (CDT to CST)", () => {
  // Sun 1 Nov 2026, 2 AM CDT becomes 1 AM CST; that day is 25 hours long
  const nov2 = "2026-11-02T19:15:00-06:00";   // Mon 2 Nov, 7:15 PM CST
  expect(days(nov2, "2026-10-26T23:30:00-05:00")).toBe(7);
  expect(days(nov2, "2026-10-31T23:59:00-05:00")).toBe(2);
  expect(days(nov2, "2026-11-01T00:30:00-05:00")).toBe(1);
  expect(days(nov2, "2026-11-01T23:59:00-06:00")).toBe(1);
  expect(days(nov2, "2026-11-02T00:00:00-06:00")).toBe(0);
  // a noon game on Sun 8 Nov, counted from late on Sat 31 Oct: the old ceil said 9 here
  expect(days("2026-11-08T12:00:00-06:00", "2026-10-31T22:00:00-05:00")).toBe(8);
  // and spring forward, Sun 14 Mar 2027 (a 23-hour day)
  expect(days("2027-03-15T00:30:00-05:00", "2027-03-13T23:30:00-06:00")).toBe(2);
});

test("Central dates win near midnight, not UTC dates", () => {
  // 11 PM CDT on the 25th is already the 26th in UTC
  expect(days(GAME, "2026-10-26T04:00:00Z")).toBe(1);
  expect(days(GAME, "2026-10-26T05:00:00Z")).toBe(0);
});

for (const tz of ["UTC", "America/Los_Angeles", "Asia/Tokyo"]) {
  test(`the same answers with the device clock in ${tz}`, () => {
    const was = process.env.TZ; process.env.TZ = tz;
    try {
      expect(new Date(Date.parse("2026-10-19T12:00:00Z")).getTimezoneOffset()).toBe(tz === "UTC" ? 0 : tz === "Asia/Tokyo" ? -540 : 420);
      expect(days(GAME, "2026-10-19T11:49:00-05:00")).toBe(7);
      expect(days(GAME, "2026-10-19T23:30:00-05:00")).toBe(7);   // already the 20th in UTC and Tokyo
      expect(days(GAME, "2026-10-25T23:59:00-05:00")).toBe(1);   // still the 25th, 9:59 PM, in Pacific
      expect(days(GAME, "2026-10-26T00:01:00-05:00")).toBe(0);   // 25 Oct 10:01 PM in Pacific: game day in Central
      expect(days(GAME, "2026-10-26T19:14:00-05:00")).toBe(0);   // already 27 Oct in Tokyo
    } finally { if (was === undefined) delete process.env.TZ; else process.env.TZ = was; }
  });
}
