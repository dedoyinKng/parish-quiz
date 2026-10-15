import Link from "next/link";
import type { Metadata } from "next";
import { APP_NAME } from "@/lib/brand";

export const metadata: Metadata = {
  title: `FAQ · ${APP_NAME}`,
  description: "Answers to common questions about registration, categories and the quiz.",
};

const FAQ: { q: string; a: string }[] = [
  {
    q: "Is it free?",
    a: "Yes. The platform is free for every parish.",
  },
  {
    q: "Who registers the candidates?",
    a: "A parish teacher registers the parish first, then enters the parish’s candidates from their dashboard. A parent or guardian must consent for each child.",
  },
  {
    q: "How do candidates log in?",
    a: "On the quiz page, a candidate enters their candidate ID and the session PIN given out by their teacher on the day. They cannot get in before the scheduled start time.",
  },
  {
    q: "What do candidates need to bring?",
    a: "A device with internet access. For Spelling Bee they also need a headset, because each word is played through the device.",
  },
  {
    q: "How is a child’s category decided?",
    a: "By age on 1 August, just before the season starts. The categories are 6–8, 9–12, 13–15 and 16–19. A child who is already too old for a category on that date must enter the next one up.",
  },
  {
    q: "When does a season run?",
    a: "From 1 September to 31 August, and it is named by the two years it spans, for example 2026/2027.",
  },
  {
    q: "Who goes through to the next stage?",
    a: "The candidate with the highest combined Zeal Quiz and Bible Quiz score in each category. If scores are equal, the faster time wins, and if they are still level the coordinator decides.",
  },
  {
    q: "What if a device fails during the quiz?",
    a: "Answers are saved automatically as the candidate goes. The candidate can log in again and carry on, and a coordinator can give extra time if it is needed.",
  },
  {
    q: "Can candidates see the questions beforehand?",
    a: "No. Questions are only shown during the quiz, and they are shuffled differently for each candidate.",
  },
];

export default function FaqPage() {
  return (
    <>
      <section className="st-page-head">
        <div className="st-wrap">
          <div className="st-kicker">FAQ</div>
          <h1>Frequently asked questions</h1>
          <p className="st-sub">Quick answers for teachers, coordinators, candidates and parents.</p>
        </div>
      </section>

      <section className="st-section">
        <div className="st-wrap">
          <div className="st-faq">
            {FAQ.map((f) => (
              <details key={f.q}>
                <summary>{f.q}</summary>
                <p>{f.a}</p>
              </details>
            ))}
          </div>
          <p style={{ textAlign: "center", marginTop: "2rem" }}>
            Still have a question?{" "}
            <Link href="/contact" style={{ color: "var(--blue)", fontWeight: 600 }}>
              Get in touch
            </Link>
          </p>
        </div>
      </section>
    </>
  );
}
