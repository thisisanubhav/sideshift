import Link from "next/link";
import { requireViewer } from "@/lib/auth";
import { Wordmark } from "@/components/wordmark";
import { signOut } from "@/app/(auth)/actions";
import { Button } from "@/components/ui";

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
      <header className="sticky top-0 z-30 border-b border-line bg-pitch/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl items-center gap-4 px-4 py-3 sm:px-6">
          <Link href={`/${viewer.role === "brand" ? "b" : "c"}`} aria-label="SideShift home">
            <Wordmark />
          </Link>

          <nav className="ml-2 hidden gap-1 sm:flex">
            {nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-[8px] px-3 py-1.5 text-[14px] font-medium text-ash transition-colors hover:bg-raise-2 hover:text-bone"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-3">
            <span className="type-timecode hidden text-[13px] text-ash sm:inline">
              @{viewer.handle}
            </span>
            <form action={signOut}>
              <Button variant="ghost" size="sm" type="submit">
                Sign out
              </Button>
            </form>
          </div>
        </div>

        {/* Nav collapses to a scrollable strip rather than a hamburger: three
            destinations do not deserve a menu. */}
        <nav className="flex gap-1 overflow-x-auto border-t border-line px-4 py-2 sm:hidden">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="whitespace-nowrap rounded-[8px] px-3 py-1.5 text-[14px] font-medium text-ash"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">
        {children}
      </main>
    </div>
  );
}
