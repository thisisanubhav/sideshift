import Link from "next/link";
import { Wordmark } from "@/components/wordmark";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-b border-hairline px-5 py-4 sm:px-8">
        <Link href="/" className="inline-flex min-h-11 items-center" aria-label="SideShift home">
          <Wordmark />
        </Link>
      </header>
      <main className="mx-auto flex w-full max-w-[440px] flex-1 flex-col justify-center px-5 py-10 sm:px-0">
        {children}
      </main>
    </div>
  );
}
