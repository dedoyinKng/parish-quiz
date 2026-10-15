"use client";

import Link from "next/link";
import { Search } from "lucide-react";

type Filter = {
  name: string;
  label: string; // shown for the "no filter" choice, e.g. "All categories"
  value: string;
  options: { value: string; label: string }[];
};

export default function SearchFilters({
  placeholder,
  q,
  filters,
  clearHref,
  active,
}: {
  placeholder: string;
  q: string;
  filters: Filter[];
  clearHref: string;
  active: boolean;
}) {
  return (
    <form
      method="get"
      role="search"
      className="filterbar"
      key={`${q}|${filters.map((f) => f.value).join("|")}`}
    >
      <div className="searchbox">
        <Search size={18} aria-hidden />
        <input
          name="q"
          defaultValue={q}
          placeholder={placeholder}
          aria-label={placeholder}
          className="field"
        />
      </div>

      {(filters.length > 0 || active) && (
        <div className="filterbar-filters">
          {filters.map((f) => (
            <select
              key={f.name}
              name={f.name}
              defaultValue={f.value}
              aria-label={f.label}
              className="field"
              onChange={(e) => e.currentTarget.form?.requestSubmit()}
            >
              <option value="">{f.label}</option>
              {f.options.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          ))}
          {active && (
            <Link href={clearHref} className="btn">
              Clear
            </Link>
          )}
        </div>
      )}
    </form>
  );
}