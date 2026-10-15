import Link from "next/link";
import type { Metadata } from "next";
import { APP_NAME, CONTACT_EMAIL } from "@/lib/brand";

export const metadata: Metadata = {
  title: `Contact · ${APP_NAME}`,
  description: "How to get help with registration, the quiz or your results.",
};

export default function ContactPage() {
  return (
    <>
      <section className="st-page-head">
        <div className="st-wrap">
          <div className="st-kicker">Contact</div>
          <h1>Need help?</h1>
          <p className="st-sub">Here is the quickest way to get an answer.</p>
        </div>
      </section>

      <section className="st-section">
        <div className="st-wrap">
          <div className="st-two" style={{ marginTop: 0 }}>
            <div className="st-card">
              <h3>Candidates and parents</h3>
              <p>
                Ask your parish teacher first. They can check your candidate ID, give you the
                session PIN on the day, and answer questions about your category.
              </p>
            </div>
            <div className="st-card">
              <h3>Parish teachers</h3>
              <p>
                Contact your area coordinator. They can help with registration, schedules and
                problems on the day of the competition.
              </p>
            </div>
            <div className="st-card">
              <h3>Coordinators</h3>
              <p>
                Contact your zone or province coordinator for scheduling, results and decisions on
                tied results.
              </p>
            </div>
            <div className="st-card">
              <h3>Platform support</h3>
              {CONTACT_EMAIL ? (
                <p>
                  Email{" "}
                  <a
                    href={`mailto:${CONTACT_EMAIL}`}
                    style={{ color: "var(--blue)", fontWeight: 600 }}
                  >
                    {CONTACT_EMAIL}
                  </a>{" "}
                  for help with your account or a problem with the platform.
                </p>
              ) : (
                <p>
                  For help with your account or a problem with the platform, speak to your
                  coordinator, who will pass it on.
                </p>
              )}
            </div>
          </div>

          <p style={{ marginTop: "2rem" }}>
            <Link href="/faq" className="st-btn">
              Read the FAQ
            </Link>{" "}
            <Link href="/login" className="st-btn primary">
              Log in
            </Link>
          </p>
        </div>
      </section>
    </>
  );
}
