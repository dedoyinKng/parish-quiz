import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { seasonDates, seasonNameFor, seasonStartYear } from "@/lib/season";
import { createSeasonAction } from "./actions";
import "./seasons.css";

function day(d: Date) {
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

export default async function SeasonsPage() {
  const user = await requireUser();
  if (user.role !== "SUPER_ADMIN") redirect("/dashboard");

  const seasons = await db.season.findMany({
    orderBy: { name: "desc" },
    include: { _count: { select: { candidates: true, exams: true } } },
  });

  const currentName = seasonNameFor();
  const nowYear = seasonStartYear();
  const missing = [nowYear, nowYear + 1].filter(
    (y) => !seasons.some((s) => s.name === `${y}/${y + 1}`)
  );

  return (
    <div className="qwide">
      <div className="qhead">
        <div>
          <h1>Seasons</h1>
          <p className="muted">
            A season runs from 1 September to 31 August. A child&apos;s age is counted on 1 August,
            just before the season starts.
          </p>
        </div>
      </div>

      <div className="qcard">
        <div className="ssn-scroll">
          <table className="ssn-table">
            <thead>
              <tr>
                <th>Season</th>
                <th>Runs</th>
                <th>Age counted on</th>
                <th>Candidates</th>
                <th>Competitions</th>
              </tr>
            </thead>
            <tbody>
              {seasons.map((s) => {
                const y = parseInt(s.name.slice(0, 4), 10);
                const dates = Number.isNaN(y) ? null : seasonDates(y);
                return (
                  <tr key={s.id}>
                    <td>
                      <strong>{s.name}</strong>
                      {s.name === currentName && <span className="ssn-pill">Current</span>}
                    </td>
                    <td>{dates ? `${day(dates.start)} – ${day(dates.end)}` : "–"}</td>
                    <td>{day(s.ageReferenceDate)}</td>
                    <td>{s._count.candidates}</td>
                    <td>{s._count.exams}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {missing.length > 0 && (
          <div className="ssn-new">
            {missing.map((y) => (
              <form action={createSeasonAction} key={y}>
                <input type="hidden" name="startYear" value={y} />
                <button type="submit" className="btn">
                  Create {y}/{y + 1}
                </button>
              </form>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
