import Link from "next/link";
import type { Metadata } from "next";
import { APP_NAME } from "@/lib/brand";

export const metadata: Metadata = {
  title: `How it works · ${APP_NAME}`,
  description: "How parishes register, how the competitions run, and how winners qualify.",
};

export default function HowItWorksPage() {
  return (
    <>
      <section className="st-page-head">
        <div className="st-wrap">
          <div className="st-kicker">How it works</div>
          <h1>From registration to the province final</h1>
          <p className="st-sub">
            A short guide for teachers, coordinators, candidates and parents.
          </p>
        </div>
      </section>

      <section className="st-section">
        <div className="st-wrap st-prose" style={{ maxWidth: "50rem" }}>
          <h2>For parish teachers</h2>
          <ol>
            <li>
              <strong>Register your parish</strong> and create your teacher account.
            </li>
            <li>
              <strong>Register your candidates.</strong> Enter each child’s name, date of birth,
              category and the competitions they will take part in. A parent or guardian must
              consent.
            </li>
            <li>
              <strong>Print their ID slips.</strong> Every candidate has a personal ID. You can
              print a slip for each child.
            </li>
            <li>
              <strong>On the day,</strong> open the competition, read out the session PIN, and
              watch your candidates’ progress.
            </li>
          </ol>

          <h2>For coordinators</h2>
          <p>
            Area, zone and province coordinators schedule the competitions, choosing the date,
            time, length and number of questions for each category. The platform gives each
            competition its own session PIN, which teachers can see. Coordinators can follow every
            candidate live at the venue, give extra time if a device fails, and see the results for
            their area, zone or province.
          </p>

          <h2>For candidates</h2>
          <ol>
            <li>Bring a device with internet access. For Spelling Bee, bring a headset.</li>
            <li>
              Go to the quiz page and enter your <strong>candidate ID</strong> and the{" "}
              <strong>PIN</strong> your teacher gives you.
            </li>
            <li>
              The quiz opens at its start time. Your answers are saved as you go, and the timer
              runs for the whole quiz.
            </li>
            <li>Submit when you finish, or the quiz submits itself when time is up.</li>
          </ol>

          <h2>How winners qualify</h2>
          <p>
            At each stage, the candidate with the highest combined <strong>Zeal Quiz and Bible
            Quiz</strong> score in each category proceeds to the next stage: parish to area, area
            to zone, and zone to province. Where scores are equal, the faster time wins. If two
            candidates are still level, the coordinator makes the decision.
          </p>

          <h2>Categories and ages</h2>
          <p>
            The categories are 6–8, 9–12, 13–15 and 16–19 years. Age is counted on 1 August, just
            before each season begins on 1 September, and a season runs until 31 August.
          </p>

          <p style={{ marginTop: "2rem" }}>
            <Link href="/register" className="st-btn primary">
              Register your parish
            </Link>{" "}
            <Link href="/faq" className="st-btn">
              Read the FAQ
            </Link>
          </p>
        </div>
      </section>
    </>
  );
}
