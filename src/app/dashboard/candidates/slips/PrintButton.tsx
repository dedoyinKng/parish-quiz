"use client";

export default function PrintButton({ count }: { count: number }) {
  return (
    <button type="button" className="btn" onClick={() => window.print()} disabled={count === 0}>
      Print {count} slip{count === 1 ? "" : "s"}
    </button>
  );
}
