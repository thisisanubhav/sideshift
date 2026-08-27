import Link from "next/link";
import { requireViewer } from "@/lib/auth";
import { Wordmark } from "@/components/wordmark";
import { signOut } from "@/app/(auth)/actions";
import { Button } from "@/components/ui";
import { AppNav } from "@/components/app-nav";

const NAV = {
  brand: [
    { href: "/b", label: "Campaigns" },
    { href: "/b/applicants", label: "Applicants" },
    { href: "/b/threads", label: "Threads" },
  ],
  creator: [
    { href: "/c/browse", label: "Browse" },
    { href: "/c", label: "Applications" },
    { href: "/c/threads", label: "Threads" },
  ],
} as const;

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const viewer = await requireViewer();
  const nav = NAV[viewer.role];

  return (
    <div className="flex min-h-dvh flex-col">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-50 focus:rounded-[8px] focus:bg-bone focus:px-4 focus:py-2 focus:text-pitch"
      >
        Skip to content
      </a>
      <header className="sticky top-0 z-30 border-b border-line bg-pitch">
        <div className="mx-auto flex w-full max-w-6xl items-center gap-4 px-4 py-3 sm:px-6">
          <Link href={`/${viewer.role === "brand" ? "b" : "c"}`} aria-label="SideShift home">
            <Wordmark />
          </Link>

          <AppNav items={nav} className="ml-2 hidden sm:flex" />

          <div className="ml-auto flex items-center gap-3">
            <span className="type-timecode hidden text-[13px] text-ash sm:inline">
              @{viewer.handle}
            </span>
            <form action={signOut}>
              <Button variant="ghost" size="sm" type="submit" className="h-11 px-3">
                Sign out
              </Button>
            </form>
          </div>
        </div>

        {/* Nav collapses to a scrollable strip rather than a hamburger: three
            destinations do not deserve a menu. */}
        <AppNav
          items={nav}
          orientation="strip"
          className="border-t border-line px-4 py-1 sm:hidden"
        />
      </header>

      <main
        id="main"
        className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6"
      >
        {children}
      </main>
    </div>
  );
}
