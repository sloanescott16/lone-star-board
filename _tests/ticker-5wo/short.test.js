/* Job 1017-1402-5wo (option B): the Big plays reel shows a short line for each play, made in code from the feed text.
     bun short.test.js [index.html]
   Takes tkClean and tkShort out of the page and runs them on real play strings from the ESPN feeds the board reads:
   Saturday (college: play by play and scoring summaries) and Sunday (NFL play by play and scoring summaries). */
const fs = require("fs"), path = require("path");
const FILE = process.argv[2] || path.join(__dirname, "../../index.html"), src = fs.readFileSync(FILE, "utf8");
const grab = n => { const i = src.indexOf(`function ${n}(`); if (i < 0) throw new Error(`no ${n} in ${FILE}`); return src.slice(i, src.indexOf("\n}", i) + 2); };
const cap = (src.match(/const TK_SHORT_MAX = \d+;/) || ["const TK_SHORT_MAX = 36;"])[0];
const { tkShort, tkClean, TK_SHORT_MAX } = new Function(`${grab("tkClean")}\n${cap}\n${grab("tkShort")}\nreturn { tkShort, tkClean, TK_SHORT_MAX };`)();
let pass = 0, fail = 0; const ok = (n, c, x) => { c ? pass++ : fail++; console.log(`${c ? "ok  " : "FAIL"}  ${n}${x === undefined ? "" : "  " + JSON.stringify(x)}`); };
const CASES = [   // [kind, feed text, expected short line]
  // Saturday, college play by play (the scoreboard's lastPlay)
  ["td", "(07:04) Shotgun #16 A.Manning pass complete deep middle to #8 C.Coleman caught at OU00, for 41 yards to the OU00 TOUCHDOWN, clock 06:56, 1ST DOWN #44 G.Spetic kick attempt good (H: #43 M.Chiumento, LS: #47 T.Dubuc)", "Manning 41-yd TD to Coleman"],
  ["td", "(13:39) #20 J.Roberts rush middle for 80 yards gain to the Gators00 TOUCHDOWN, clock 13:33, 1ST DOWN #19 B.Craig kick attempt good (H: #40 B.Reus, LS: #49 B.Le Blanc)", "Roberts 80-yd TD run"],
  ["big", "(11:53) No Huddle-Shotgun #12 D.DeShields pass complete short middle to #1 A.Banks caught at Ohio50, for 47 yards to the Ohio12 (#20 K.Bannister), out of bounds, 1ST DOWN", "DeShields 47-yd pass to Banks"],
  ["fg", "(00:15) #44 G.Spetic field goal attempt from 23 yards GOOD (H: #43 M.Chiumento, LS: #47 T.Dubuc), clock 00:12", "Spetic 23-yd FG"],
  ["miss", "#29 T.Sandell field goal attempt from 53 yards NO GOOD (H: #87 J.Ulrich, LS: #50 B.Anderson), clock 03:43", "Sandell 53-yd FG no good"],
  ["take", "(08:36) No Huddle-Shotgun #1 K.Taylor pass intercepted by #7 C.Woodson at State25 #7 C.Woodson return 4 yards to the State21 (#87 S.West)", "Woodson picks off Taylor"],
  ["take", "(08:30) No Huddle-Shotgun #17 B.Brown rush middle for 3 yards gain to the AUBURN49 fumbled by #17 B.Brown at AUBURN49 forced by #9 M.Dye recovered by TENN #7 A.Carter at AUBURN49, End Of Play", "Carter recovers Brown fumble"],
  ["td", "(05:12) No Huddle-Shotgun #3 M.Hawkins Jr. pass complete deep right to #2 D.Epps caught at ISU23, for 47 yards to the ISU00 TOUCHDOWN, clock 05:04, 1ST DOWN #42 J.Cassidy kick attempt good (H: #83 B.Hansen, LS: #38 M.Moss)", "Hawkins Jr. 47-yd TD to Epps"],
  ["td", "#43 M.Chiumento punt 0 yards to the UT08 blocked by #16 D.Okoye recovered by OU #9 D.Fields at UT00 TOUCHDOWN, clock 14:11.", "Okoye blocks punt, Fields TD"],
  // Saturday, college scoring summaries
  ["td", "A. Manning pass to C. Coleman for 41 yds, for a TD (G. Spetic KICK)", "Manning 41-yd TD to Coleman"],
  ["td", "Dijon Lee Jr. 30 Yd Interception Return (Conor Talty Kick)", "Lee Jr. 30-yd pick-six"],
  ["td", "N. Iamaleava pass complete to J. Horton for 45 yds for a TD", "Iamaleava 45-yd TD to Horton"],
  ["td", "Anthony Evans III 45 Yd pass from Kamario Taylor (Two-Point Pass Conversion Failed)", "Taylor 45-yd TD to Evans III"],
  // Sunday, NFL play by play and scoring summaries
  ["td", "(Shotgun) J.Herbert pass short middle to K.Mitchell for 1 yard, TOUCHDOWN. C.Dicker extra point is GOOD, Center-J.Harris, Holder-J.Scott.", "Herbert 1-yd TD to Mitchell"],
  ["td", "J.Cook up the middle for 3 yards, TOUCHDOWN. T.Bass extra point is GOOD, Center-R.Ferguson, Holder-T.Doman.", "Cook 3-yd TD run"],
  ["take", "(Shotgun) J.Herbert pass deep middle intended for M.Valdes-Scantling INTERCEPTED by C.Gardner-Johnson at BUF 1. C.Gardner-Johnson to BUF 42 for 41 yards (J.Alt).", "Gardner-Johnson picks off Herbert"],
  ["take", "J.Cook up the middle to BUF 47 for 4 yards (J.Eboigbe). FUMBLES (J.Eboigbe), RECOVERED by LAC-D.Henley at BUF 47.", "Henley recovers Cook fumble"],
  ["miss", "C.Dicker 45 yard field goal is No Good, Wide Left, Center-J.Harris, Holder-J.Scott.", "Dicker 45-yd FG wide left"],
  ["td", "Keaton Mitchell 1 Yd pass from Justin Herbert (Cameron Dicker Kick)", "Herbert 1-yd TD to Mitchell"],
  ["fg", "Tyler Bass 28 Yd Field Goal", "Bass 28-yd FG"],
];
for (const [k, raw, want] of CASES) { const got = tkShort(raw, k); ok(`${want}`, got === want, got === want ? undefined : { got, raw: raw.slice(0, 70) }); }
// the length cap holds for every short line
ok(`every short line is ${TK_SHORT_MAX} characters or fewer`, CASES.every(([k, r]) => { const g = tkShort(r, k); return g === tkClean(r).replace(/^\((?:No Huddle, )?Shotgun\)\s*/i, "") || g.length <= TK_SHORT_MAX; }));
// fallbacks: where shortening would lose the meaning, the tidied feed text is kept whole
const KEEP = [
  ["big", "(10:16) Shotgun #28 B.Bennett rush middle for 56 yards gain (16) to the UMass00 TOUCHDOWN nullified by penalty, clock 10:04, 1ST DOWN, PENALTY EMU Holding (#85 K.Isaac) 10 yards from UMass40 to UMass50"],
  ["big", "(Shotgun) J.Allen pass short left to T.Johnson for 43 yards, TOUCHDOWN NULLIFIED by Penalty [J.Eboigbe].PENALTY on BUF-D.Knox, Offensive Holding, 10 yards, enforced at LAC 14."],
  ["take", "(Shotgun) J.Allen sacked at BUF 28 for -6 yards (K.Mack).Los Angeles Chargers challenged the passer was down by contact ruling, and the play was REVERSED.(Shotgun) J.Allen sacked at BUF 28 for -6 yards (K.Mack). FUMBLES (K.Mack) [K.Mack], RECOVERED by LAC-D.Henley at BUF 28."],
  ["td", "JENNINGS, Kevin pass up the middle complete for 14 yards to PITTMAN JR., Randy to the BC 0, 1st down, TOUCHDOWN SMU (Scoring play confirmed)."],
];
// fix round 1 (checker): the review or no-play test runs on the whole text, even after the touchdown
KEEP.push(
  ["td", "(No Huddle, Shotgun) J.Herbert sacked at BUF 18 for -3 yards (E.Oliver). FUMBLES (E.Oliver) [E.Oliver], RECOVERED by BUF-D.Alford at BUF 13. D.Alford for 87 yards, TOUCHDOWN.The Replay Official reviewed the fumble ruling, and the play was REVERSED.(No Huddle, Shotgun) J.Herbert pass incomplete short left [E.Oliver]."],   // real, nfl-401872953
  ["td", "(04:12) #5 J.Smith rush middle for 3 yards gain to the ABC00 TOUCHDOWN, clock 04:08. The previous play is under automatic review - \"Runner broke the plane\". CALL OVERTURNED"],
  ["td", "(Shotgun) J.Herbert pass short middle to K.Mitchell for 12 yards, TOUCHDOWN. Penalty on LAC-J.Alt, Offensive Holding, 10 yards, enforced at BUF 15 - No Play."],
  ["td", "#12 Q.Ewers rush left for 2 yards gain to the OU00 TOUCHDOWN, clock 00:00 #12 Q.Ewers pass attempt failed. The previous play is under automatic review. CALL REVERSED"],
  // pick then fumbled back, and a defensive two-point return
  ["take", "(05:00) #7 A.Qb pass intercepted by #2 D.Back at XYZ10 #2 D.Back return 40 yards to the ABC50 fumbled by #2 D.Back recovered by ABC #9 O.Line at ABC50"],
  ["td", "(05:00) #7 A.Qb rush middle for 3 yards gain to the XYZ00 TOUCHDOWN, clock 04:55 #4 K.Kick kick attempt blocked by #90 D.Big, #22 S.Fast return 98 yards DEFENSIVE TWO-POINT"],
);
const R1 = [   // [kind, feed text, expected]
  ["td", "#4 J.Pass rush middle for 9 yards gain to the ABC00 TOUCHDOWN, clock 03:00. The previous play is under automatic review - \"Runner in\". CALL UPHELD", "Pass 9-yd TD run"],   // upheld is fine
  ["td", "(Shotgun) J.Allen left guard for 1 yard, TOUCHDOWN.Penalty on LAC-T.Tart, Defensive Offside, declined. T.Bass extra point is GOOD, Center-R.Ferguson, Holder-T.Doman.", "Allen 1-yd TD run"],   // declined after the TD
  // real, 401869962: too long with both names, so the scorer is kept
  ["td", "(02:10) Shotgun #8 C.Del Rio-Wilson pass complete short left to #4 X.Turner-Bradshaw caught at UNM00, for 3 yards to the UNM00 TOUCHDOWN, clock 02:05 #97 J.Diaz Nicolas kick attempt good", "Turner-Bradshaw 3-yd TD catch"],
  ["td", "C. Del Rio-Wilson pass to X. Turner-Bradshaw for 3 yds, for a TD (J. Diaz Nicholas KICK)", "Turner-Bradshaw 3-yd TD catch"],   // real, 401869962 scoring summary
  // compound surnames kept whole
  ["fg", "#36 J.Echeverria Lozano field goal attempt from 34 yards GOOD (H: #19 A.Holder, LS: #50 B.Snap), clock 04:00", "Echeverria Lozano 34-yd FG"],
  ["fg", "#97 J.Diaz Nicolas field goal attempt from 27 yards GOOD (H: #19 A.Holder, LS: #50 B.Snap)", "Diaz Nicolas 27-yd FG"],
  ["take", "#8 C.Del Rio-Wilson pass intercepted by #3 D.Kelly, Touchback", "Kelly picks off Del Rio-Wilson"],
  // TD only when the text says so (real, a "td" item whose play text is a plain catch)
  ["td", "G. Lopez pass complete short right to D. Lawrence for 8 yards to the STAN 12", "Lopez 8-yd pass to Lawrence"],
  ["td", "G. Johnson pass intercepted by I. Esonwune at SAM 24, I. Esonwune return 5 yards to the SAM 19, End Of Play", "Esonwune picks off Johnson"],
];
for (const [k, raw, want] of R1) { const got = tkShort(raw, k); ok(`round 1: ${want}`, got === want, got === want ? undefined : { got, raw: raw.slice(0, 70) }); }
for (const [k, raw] of KEEP) { const got = tkShort(raw, k); ok(`kept whole: ${raw.slice(0, 50)}...`, got === tkClean(raw).replace(/^\((?:No Huddle, )?Shotgun\)\s*/i, ""), got); }
ok("empty text stays empty", tkShort("", "td") === "" && tkShort(null, "td") === "");
console.log(`\n${pass}/${pass + fail} passed`); process.exit(fail ? 1 : 0);
