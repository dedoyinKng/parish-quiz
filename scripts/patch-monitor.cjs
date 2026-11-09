const fs = require("fs");
function rep(file, oldS, newS) {
  let s = fs.readFileSync(file, "utf8");
  const n = s.split(oldS).length - 1;
  if (n !== 1) { console.error("FAILED (" + n + " matches) in " + file + ": " + oldS.slice(0, 60)); process.exit(1); }
  fs.writeFileSync(file, s.replace(oldS, () => newS));
}
const P = "src/app/dashboard/monitor/[id]/page.tsx";
rep(P, `import { extendAction, submitNowAction } from "../actions";`,
       `import { extendAction, submitNowAction, clearLockAction } from "../actions";`);
rep(P, `  } else if (exam.competition !== "SPELLING_BEE") {`, `  } else {`);
rep(P, `      children.map((c) => getUnitResult(exam.seasonId, c, exam.level))`,
       `      children.map((c) =>
        getUnitResult(
          exam.seasonId,
          c,
          exam.level,
          exam.competition === "SPELLING_BEE" ? "SPELLING_BEE" : "QUIZ"
        )
      )`);
rep(P, `  } else {
    expected = await db.candidate.findMany({
      where: { ...base, parishId: { in: descendants(exam.orgUnitId) } },
      select,
      orderBy: { fullName: "asc" },
    });
  }`, `  }`);
rep(P, `  const submitted = attempts.filter((a) => a.submittedAt);`,
`  const submitted = attempts.filter((a) => a.submittedAt);

  const blocks = await db.playThrottle.findMany({
    where: { blockedUntil: { gt: now } },
  });
  const locked = expected.filter((c) =>
    blocks.some((b) => b.key.toLowerCase().includes(c.code.toLowerCase()))
  );`);
rep(P, `      <div className="mon-card">
        <h2>Candidates who have started ({attempts.length})</h2>`,
`      {locked.length > 0 && (
        <div className="mon-card">
          <h2>Locked out ({locked.length})</h2>
          <div className="mon-note">
            These candidates entered a wrong PIN too many times. They can try again after a few
            minutes, or you can clear the lock now.
          </div>
          <div className="mon-scroll">
            <table className="mon-table">
              <tbody>
                {locked.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <strong>{c.fullName}</strong>
                    </td>
                    <td className="muted">{c.code}</td>
                    <td>
                      <form action={clearLockAction}>
                        <input type="hidden" name="examId" value={exam.id} />
                        <input type="hidden" name="candidateId" value={c.id} />
                        <MonitorButton label="Clear lock" />
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="mon-card">
        <h2>Candidates who have started ({attempts.length})</h2>`);

const A = "src/app/dashboard/monitor/actions.ts";
fs.appendFileSync(A, `

/** Lets a blocked candidate try again straight away. */
export async function clearLockAction(fd: FormData): Promise<void> {
  const user = await requireUser();
  if (!canScheduleExams(user.role)) return;
  const exam = await db.exam.findUnique({
    where: { id: String(fd.get("examId") ?? "") },
    select: { id: true, orgUnitId: true },
  });
  if (!exam) return;
  const units = await getVisibleUnits(user);
  if (!units.some((u) => u.id === exam.orgUnitId)) return;
  const cand = await db.candidate.findUnique({
    where: { id: String(fd.get("candidateId") ?? "") },
    select: { code: true },
  });
  if (!cand) return;
  await db.playThrottle.deleteMany({
    where: { key: { contains: cand.code, mode: "insensitive" } },
  });
  revalidatePath("/dashboard/monitor/" + exam.id);
}
`);
console.log("monitor patched");
