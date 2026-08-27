"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { PLATFORM_SHORT } from "@/lib/types";
import { cn } from "@/components/ui";
import type { BrowseFilters } from "@/lib/queries";

const BUDGETS = [
  { value: "", label: "Any budget" },
  { value: "25000", label: "$250 and up" },
  { value: "40000", label: "$400 and up" },
  { value: "55000", label: "$550 and up" },
];

const SORTS = [
  { value: "newest", label: "Newest" },
  { value: "highest_pay", label: "Highest pay" },
  { value: "closing_soon", label: "Closing soon" },
];

/**
 * Filters live in the URL, so a filtered marketplace is a link you can send
 * someone. The form submits itself on change — an "Apply" button is a step
 * nobody wants between deciding and seeing.
 */
export function Filters({
  filters,
  niches,
}: {
  filters: BrowseFilters;
  niches: string[];
}) {
  const form = useRef<HTMLFormElement>(null);
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  // Collapsed on phones so the marketplace itself is above the fold; always
  // open from lg up, where the rail has its own column.
  const [open, setOpen] = useState(false);

  const active =
    filters.platforms.length +
    filters.niches.length +
    (filters.minBudget ? 1 : 0) +
    (filters.repliesFastOnly ? 1 : 0);

  function submit() {
    const fd = new FormData(form.current!);
    const params = new URLSearchParams();
    for (const [k, v] of fd.entries()) {
      if (typeof v === "string" && v) params.append(k, v);
    }
    startTransition(() => router.push(`/c/browse?${params.toString()}`));
  }

  return (
    <form
      ref={form}
      onChange={submit}
      className={cn("flex flex-col transition-opacity", pending && "opacity-60")}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="mb-4 flex items-center justify-between rounded-[4px] border border-hairline bg-card px-3.5 py-2.5 text-[15px] lg:hidden"
      >
        <span className="type-micro text-slate">
          Filters{active ? ` · ${active}` : ""}
        </span>
        <span className="type-small text-slate">{open ? "Hide" : "Show"}</span>
      </button>

      <div
        className={cn("flex-col gap-6 lg:flex", open ? "flex" : "hidden")}
      >
      <Group label="Sort">
        <select
          name="sort"
          defaultValue={filters.sort}
          className="h-9 w-full cursor-pointer rounded-[4px] border border-hairline bg-graphite px-2.5 text-[15px] text-graphite"
        >
          {SORTS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </Group>

      <Group label="Platform">
        {(["tiktok", "reels", "shorts"] as const).map((p) => (
          <Check
            key={p}
            name="platform"
            value={p}
            label={PLATFORM_SHORT[p]}
            defaultChecked={filters.platforms.includes(p)}
          />
        ))}
      </Group>

      <Group label="Budget per creator">
        <select
          name="min_budget"
          defaultValue={filters.minBudget ? String(filters.minBudget) : ""}
          className="h-9 w-full cursor-pointer rounded-[4px] border border-hairline bg-graphite px-2.5 text-[15px] text-graphite"
        >
          {BUDGETS.map((b) => (
            <option key={b.value} value={b.value}>
              {b.label}
            </option>
          ))}
        </select>
      </Group>

      {niches.length ? (
        <Group label="Niche">
          {niches.map((n) => (
            <Check
              key={n}
              name="niche"
              value={n}
              label={n}
              defaultChecked={filters.niches.includes(n)}
            />
          ))}
        </Group>
      ) : null}

      {/* The filter no competitor offers, and the reason the rate exists. */}
      <Group label="Brand behaviour">
        <Check
          name="replies_fast"
          value="1"
          label="Replies fast only"
          hint="80%+ of applications answered inside the window"
          defaultChecked={filters.repliesFastOnly}
        />
      </Group>
      </div>
    </form>
  );
}

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <fieldset className="flex flex-col gap-2.5">
      <legend className="type-micro mb-2.5 text-slate">{label}</legend>
      {children}
    </fieldset>
  );
}

function Check({
  name,
  value,
  label,
  hint,
  defaultChecked,
}: {
  name: string;
  value: string;
  label: string;
  hint?: string;
  defaultChecked?: boolean;
}) {
  return (
    <label className="group flex cursor-pointer items-start gap-2.5 text-[15px]">
      <input
        type="checkbox"
        name={name}
        value={value}
        defaultChecked={defaultChecked}
        className="mt-0.5 size-4 shrink-0 cursor-pointer appearance-none rounded-[4px] border border-hairline bg-graphite checked:border-graphite checked:bg-graphite"
      />
      <span className="flex flex-col">
        <span className="text-graphite">{label}</span>
        {hint ? <span className="type-small text-slate">{hint}</span> : null}
      </span>
    </label>
  );
}
