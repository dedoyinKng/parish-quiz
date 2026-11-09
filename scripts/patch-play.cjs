const fs = require("fs");
function rep(file, oldS, newS) {
  let s = fs.readFileSync(file, "utf8");
  const n = s.split(oldS).length - 1;
  if (n !== 1) { console.error("FAILED (" + n + " matches): " + oldS.slice(0, 60)); process.exit(1); }
  fs.writeFileSync(file, s.replace(oldS, () => newS));
}
const F = "src/app/play/actions.ts";
rep(F, `    if (e.competition === "ZEAL_QUIZ" || e.competition === "BIBLE_QUIZ") {`,
       `    if (
      e.competition === "ZEAL_QUIZ" ||
      e.competition === "BIBLE_QUIZ" ||
      e.competition === "SPELLING_BEE"
    ) {`);
rep(F, `        examUnitId: e.orgUnitId,
        parentOf,
      });`, `        examUnitId: e.orgUnitId,
        parentOf,
        track: e.competition === "SPELLING_BEE" ? "SPELLING_BEE" : "QUIZ",
      });`);
console.log("play gate patched");
