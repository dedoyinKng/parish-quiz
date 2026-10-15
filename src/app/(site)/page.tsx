import Link from "next/link";
import type { Metadata } from "next";
import { APP_NAME } from "@/lib/brand";

export const metadata: Metadata = {
  title: `${APP_NAME} · Zeal Quiz, Bible Quiz and Spelling Bee`,
  description:
    "Free quiz competitions from parish to province: Zeal Quiz, Bible Quiz and Spelling Bee for ages 6 to 19.",
};

export default function HomePage() {
  return (
    <>
      <section className="st-hero">
        <div className="st-wrap st-hero-grid">
          <div>
            <span className="st-eyebrow">Lagos Province 45</span>
            <h1>Quiz competitions from parish to province</h1>
            <p className="lead">
              Zeal Quiz, Bible Quiz and Spelling Bee for children and teens aged 6 to 19. Register
              your parish, enter your candidates, and run the competition on the day, all in one
              free platform.
            </p>
            <div className="st-cta-row">
              <Link href="/register" className="st-btn light">
                Register your parish
              </Link>
              <Link href="/login" className="st-btn outline">
                Log in
              </Link>
              <Link href="/play" className="st-btn outline">
                Candidate? Enter your quiz
              </Link>
            </div>
          </div>
          <div className="st-flagwrap" aria-hidden>
            <div className="st-flags">
              <div className="st-flag">
                <span>Parish</span>
              </div>
              <div className="st-flag">
                <span>Area</span>
              </div>
              <div className="st-flag">
                <span>Zone</span>
              </div>
              <div className="st-flag">
                <span>Province</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="st-section">
        <div className="st-wrap">
          <div className="st-kicker">How it works</div>
          <h2 className="st-h2">Four stages, one simple path</h2>
          <p className="st-sub">
            Every candidate starts at their own parish. The first place in each category moves up
            to the next stage, all the way to the province.
          </p>
          <div className="st-grid4">
            <div className="st-card st-step">
              <div className="st-num">1</div>
              <h3>Register</h3>
              <p>
                A teacher registers the parish, then enters the parish’s candidates. Every
                candidate gets their own ID.
              </p>
            </div>
            <div className="st-card st-step">
              <div className="st-num">2</div>
              <h3>Compete at the parish</h3>
              <p>
                Candidates take the quiz at the venue on their own devices, using their ID and the
                PIN from their teacher.
              </p>
            </div>
            <div className="st-card st-step">
              <div className="st-num">3</div>
              <h3>Qualify</h3>
              <p>
                The first place in each category proceeds to the area, then the zone, then the
                province.
              </p>
            </div>
            <div className="st-card st-step">
              <div className="st-num">4</div>
              <h3>See the results</h3>
              <p>
                Results and rankings are ready as soon as the quiz ends, for each parish, area,
                zone and province.
              </p>
            </div>
          </div>
          <p style={{ marginTop: "1.4rem" }}>
            <Link href="/how-it-works" className="st-btn">
              Read the full guide
            </Link>
          </p>
        </div>
      </section>

      <section className="st-section alt">
        <div className="st-wrap">
          <div className="st-kicker">Competitions</div>
          <h2 className="st-h2">Three competitions to take part in</h2>
          <div className="st-grid3">
            <div className="st-card">
              <div className="st-ico">⚡</div>
              <h3>Zeal Quiz</h3>
              <p>
                A timed quiz with a mix of question types, from multiple choice to matching and
                sequencing. Scores are marked automatically.
              </p>
            </div>
            <div className="st-card">
              <div className="st-ico">📖</div>
              <h3>Bible Quiz</h3>
              <p>
                A timed Bible knowledge quiz in the same format. Zeal Quiz and Bible Quiz scores are
                added together to decide who qualifies.
              </p>
            </div>
            <div className="st-card">
              <div className="st-ico">🎧</div>
              <h3>Spelling Bee</h3>
              <p>
                Candidates hear each word through headsets, read a short hint about its meaning,
                and type the spelling.
              </p>
            </div>
          </div>
          <p style={{ marginTop: "1.4rem" }}>
            <Link href="/competitions" className="st-btn">
              See the competitions
            </Link>
          </p>
        </div>
      </section>

      <section className="st-section">
        <div className="st-wrap">
          <div className="st-kicker">Categories</div>
          <h2 className="st-h2">Four age categories</h2>
          <p className="st-sub">
            Candidates compete against others their own age, so every child has a fair chance.
          </p>
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
            A candidate’s age is counted on <strong>1 August</strong>, just before each season
            begins on 1 September. A child who is already too old for a category on that date
            competes in the next one up.
          </div>
        </div>
      </section>

      <section className="st-band">
        <div className="st-wrap">
          <h2>Ready to take part?</h2>
          <p>Registering your parish is free and takes only a few minutes.</p>
          <div className="st-cta-row" style={{ justifyContent: "center", marginTop: 0 }}>
            <Link href="/register" className="st-btn light">
              Register your parish
            </Link>
            <Link href="/login" className="st-btn outline">
              Log in
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
