import type { CSSProperties } from "react";
import { APP_NAME } from "@/lib/brand";
import { STAGES, STAGE_LABEL, stageClass } from "@/lib/stage";

export default function AuthHero() {
  return (
    <section className="login-hero px-6 py-10 text-white [--u:0.7rem] md:flex md:min-h-screen md:flex-col md:justify-between md:px-14 md:py-14 md:[--u:1rem]">
      <div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/sekrenton-logo.svg"
          alt="Sekrenton"
          style={{
            height: "3.6rem",
            width: "auto",
            marginBottom: "1.1rem",
            filter: "brightness(0) invert(1)",
          }}
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
  );
}
