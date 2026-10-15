import Link from "next/link";
import type { Metadata } from "next";
import { APP_NAME } from "@/lib/brand";

export const metadata: Metadata = {
  title: `Competitions · ${APP_NAME}`,
  description: "Zeal Quiz, Bible Quiz and Spelling Bee for ages 6 to 19.",
};

export default function CompetitionsPage() {
  return (
    <>
      <section className="st-page-head">
        <div className="st-wrap">
          <div className="st-kicker">Competitions</div>
          <h1>Zeal Quiz, Bible Quiz and Spelling Bee</h1>
          <p className="st-sub">
            Three competitions, four age categories, and four stages from parish to province.
          </p>
        </div>
      </section>

      <section className="st-section">
        <div className="st-wrap">
          <div className="st-grid3" style={{ marginTop: 0 }}>
            <div className="st-card">
              <div className="st-ico">⚡</div>
              <h3>Zeal Quiz</h3>
              <p>
                A timed quiz taken on the candidate’s own device. Questions come in several types:
                single answer, multiple answers, true or false, fill in the gap, short answers,
                matching and sequencing. Questions and options are shuffled for each candidate, and
                the quiz is marked automatically.
              </p>
            </div>
            <div className="st-card">
              <div className="st-ico">📖</div>
              <h3>Bible Quiz</h3>
              <p>
                The same format as the Zeal Quiz, with Bible questions. A candidate’s Zeal Quiz and
                Bible Quiz scores are added together to decide who proceeds to the next stage.
              </p>
            </div>
            <div className="st-card">
              <div className="st-ico">🎧</div>
              <h3>Spelling Bee</h3>
              <p>
                Candidates wear headsets and hear each word spoken clearly, with a short hint about
                its meaning. They type the spelling. Each correct word earns a mark.
              </p>
            </div>
          </div>

          <h2 className="st-h2" style={{ marginTop: "3rem" }}>
            Categories
          </h2>
          <div className="st-grid4">
            <div className="st-card st-cat">
              <b>6–8</b>
              <span>years</span>
            </div>
            <div className="st-card st-cat">
              <b>9–12</b>
              <span>years</span>
            </div>
            <div className="st-card st-cat">
              <b>13–15</b>
              <span>years</span>
            </div>
            <div className="st-card st-cat">
              <b>16–19</b>
              <span>years</span>
            </div>
          </div>
          <div className="st-note">
            Age is counted on <strong>1 August</strong>. A season runs from{" "}
            <strong>1 September to 31 August</strong>.
          </div>

          <h2 className="st-h2" style={{ marginTop: "3rem" }}>
            Stages
          </h2>
          <p className="st-sub">
            Parish, area, zone and province. Every competition at every stage is taken at the venue,
            on the candidates’ own devices, with a session PIN from the teacher. Nobody can start
            before the scheduled time.
          </p>

          <p style={{ marginTop: "2rem" }}>
            <Link href="/register" className="st-btn primary">
              Register your parish
            </Link>
          </p>
        </div>
      </section>
    </>
  );
}
