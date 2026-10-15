"use client";

import type { CSSProperties } from "react";
import { useActionState, useState } from "react";
import Link from "next/link";
import { loginAction } from "./actions";
import { APP_NAME } from "@/lib/brand";
import { STAGES, STAGE_LABEL, stageClass } from "@/lib/stage";
import PlayForm from "../play/PlayForm";
import "./login-hub.css";

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(
    loginAction,
    {} as { error?: string }
  );
  const [tab, setTab] = useState<"staff" | "candidate">("staff");

  return (
    <main className="min-h-screen md:grid md:grid-cols-[1.1fr_1fr]">
      <section className="login-hero px-6 py-10 text-white [--u:0.7rem] md:flex md:min-h-screen md:flex-col md:justify-between md:px-14 md:py-14 md:[--u:1rem]">
        <div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/sekrenton-logo.svg"
            alt="Sekrenton"
            style={{ height: "3.6rem", width: "auto", marginBottom: "1.1rem", filter: "brightness(0) invert(1)" }}
          />
          <h1 className="text-4xl font-semibold md:text-5xl">{APP_NAME}</h1>
          <p className="mt-3 max-w-sm text-lg text-white/80">
            Zeal Quiz, Bible Quiz and Spelling Bee, from parish to province.
          </p>
        </div>

        <ol className="mt-10 flex items-start gap-3 border-t-4 border-white/25 pl-4 md:mt-0 md:gap-7">
          {STAGES.map((s, i) => (
            <li key={s} className={stageClass(s)}>
              <div
                aria-hidden
                className="flag flag-lg unfurl"
                style={
                  {
                    "--i": i,
                    height: `calc(var(--u) * ${6 + i * 3})`,
                  } as CSSProperties
                }
              />
              <p className="mt-2 text-sm font-semibold md:text-lg">
                {STAGE_LABEL[s]}
              </p>
            </li>
          ))}
        </ol>
      </section>

      <section className="hub flex items-center justify-center px-6 py-10">
        <div className="w-full max-w-sm">
          <Link href="/" className="hub-back">
            ← Back to website
          </Link>

          <div className="hub-tabs" role="tablist" aria-label="Who is signing in">
            <button
              type="button"
              role="tab"
              aria-selected={tab === "staff"}
              className={`hub-tab${tab === "staff" ? " on" : ""}`}
              onClick={() => setTab("staff")}
            >
              Staff
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === "candidate"}
              className={`hub-tab${tab === "candidate" ? " on" : ""}`}
              onClick={() => setTab("candidate")}
            >
              Candidate
            </button>
          </div>

          {tab === "staff" ? (
            <>
              <h2 className="text-2xl font-semibold">Sign in</h2>
              <p className="mt-1 text-ink-soft">For teachers, coordinators and administrators.</p>

              <form action={formAction} className="mt-6 space-y-4">
                <div>
                  <label htmlFor="email" className="label">
                    Email
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    className="field"
                  />
                </div>
                <div>
                  <label htmlFor="password" className="label">
                    Password
                  </label>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    required
                    className="field"
                  />
                </div>

                {state.error && (
                  <p role="alert" className="notice notice-error">
                    {state.error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={pending}
                  className="btn btn-primary w-full"
                >
                  {pending ? "Signing in..." : "Sign in"}
                </button>
              </form>

              <div className="hub-reg">
                <strong>Parish teacher and new here?</strong>
                <br />
                <Link href="/register">Register your parish</Link> to create your teacher account.
              </div>
            </>
          ) : (
            <>
              <h2 className="text-2xl font-semibold">Enter your quiz</h2>
              <p className="mt-1 mb-6 text-ink-soft">
                Type your candidate ID and the PIN your teacher gives you at the venue.
              </p>
              <PlayForm />
              <div className="hub-reg">
                Lost your candidate ID? Ask your parish teacher, who can print your ID slip.
              </div>
            </>
          )}
        </div>
      </section>
    </main>
  );
}
