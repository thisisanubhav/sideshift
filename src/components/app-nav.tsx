"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/components/ui";

export type NavItem = { href: string; label: string };

/**
 * Iris is reserved for identity and selection, and this is the one place in the
 * app that is purely selection — so this is where it gets spent. Before this,
 * every screen left "where am I" unanswered in the chrome.
 *
 * The active state is carried by a left rule and a text-colour change as well
 * as the tint, so it survives without colour, and `aria-current` carries it for
 * assistive tech.
 */
export function AppNav({
  items,
  className,
  orientation = "row",
}: {
  items: readonly NavItem[];
  className?: string;
  orientation?: "row" | "strip";
}) {
  const pathname = usePathname();

  // Longest matching href wins, so /c/browse doesn't also light up /c.
  const activeHref = items
    .filter((i) => pathname === i.href || pathname.startsWith(`${i.href}/`))
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;

  return (
    <nav
      aria-label="Main"
      className={cn(
        orientation === "strip"
          ? "flex gap-1 overflow-x-auto"
          : "flex gap-1",
        className,
      )}
    >
      {items.map((item) => {
        const active = item.href === activeHref;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              // 44px min height: these were 33px and failed every touch guideline.
              "inline-flex min-h-11 items-center rounded-[8px] px-3 text-[14px] font-medium whitespace-nowrap transition-[background-color,color,transform] duration-150 active:scale-[0.98]",
              active
                ? "bg-iris/15 text-bone ring-1 ring-inset ring-iris/25"
                : "text-ash hover:bg-raise-2 hover:text-bone",
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
