import Link from "next/link";
import { APP_NAME } from "@/lib/brand";
import { readSession } from "@/lib/session";
import "./site.css";

export const dynamic = "force-dynamic";

const LINKS = [
  { href: "/", label: "Home" },
  { href: "/how-it-works", label: "How it works" },
  { href: "/competitions", label: "Competitions" },
  { href: "/faq", label: "FAQ" },
  { href: "/contact", label: "Contact" },
];

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  // cookie check only, so the website still loads if the database is down
  const signedIn = !!(await readSession());

  return (
    <div className="st">
      <header className="st-head">
        <div className="st-wrap st-head-in">
          <Link href="/" className="st-brand">
            <img src="/sekrenton-logo.svg" alt="" className="st-logo" style={{ height: 40, width: "auto" }} />
            {APP_NAME}
          </Link>

          <nav className="st-nav" aria-label="Main">
            {LINKS.map((l) => (
              <Link key={l.href} href={l.href}>
                {l.label}
              </Link>
            ))}
          </nav>

          <div className="st-actions">
            {signedIn ? (
              <Link href="/dashboard" className="st-btn primary sm">
                Dashboard
              </Link>
            ) : (
              <>
                <Link href="/login" className="st-btn sm">
                  Log in
                </Link>
                <Link href="/register" className="st-btn primary sm">
                  Register your parish
                </Link>
              </>
            )}
          </div>

          <details className="st-menu">
            <summary>Menu</summary>
            <div className="st-menu-panel">
              {LINKS.map((l) => (
                <Link key={l.href} href={l.href}>
                  {l.label}
                </Link>
              ))}
              {signedIn ? (
                <Link href="/dashboard">Dashboard</Link>
              ) : (
                <>
                  <Link href="/login">Log in</Link>
                  <Link href="/register">Register your parish</Link>
                </>
              )}
              <Link href="/play">Candidate quiz entry</Link>
            </div>
          </details>
        </div>
      </header>

      <main>{children}</main>

      <footer className="st-foot">
        <div className="st-wrap">
          <div className="st-foot-grid">
            <div>
              <div className="st-brand" style={{ color: "#fff" }}>
                <img src="/sekrenton-logo.svg" alt="" className="st-logo" style={{ height: 56, width: "auto", filter: "brightness(0) invert(1)" }} />
                {APP_NAME}
              </div>
              <p style={{ maxWidth: "22rem", lineHeight: 1.6, fontSize: ".92rem" }}>
                Zeal Quiz, Bible Quiz and Spelling Bee for children and teens, from parish to
                province. Free for every parish.
              </p>
            </div>
            <div>
              <h4>Explore</h4>
              <Link href="/how-it-works">How it works</Link>
              <Link href="/competitions">Competitions</Link>
              <Link href="/faq">FAQ</Link>
              <Link href="/contact">Contact</Link>
            </div>
            <div>
              <h4>Teachers and coordinators</h4>
              <Link href="/login">Log in</Link>
              <Link href="/register">Register your parish</Link>
            </div>
            <div>
              <h4>Candidates</h4>
              <Link href="/play">Enter your quiz</Link>
            </div>
          </div>
          <small>
            © {new Date().getFullYear()} {APP_NAME}. All rights reserved.
          </small>
        </div>
      </footer>
    </div>
  );
}
