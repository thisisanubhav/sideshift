import Link from "next/link";
import { redirect } from "next/navigation";
import { getViewer, homeFor } from "@/lib/auth";
import { SignInForm } from "./form";

export const metadata = { title: "Sign in — SideShift" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const viewer = await getViewer();
  if (viewer) redirect(homeFor(viewer.role));

  const { next } = await searchParams;

  return (
    <div className="flex flex-col gap-7">
      <div className="flex flex-col gap-2">
        <h1 className="type-display-xl">Sign in</h1>
        <p className="text-slate">Pick up where your threads left off.</p>
      </div>

      <SignInForm next={next ?? ""} />

      <p className="type-small text-slate">
        New here?{" "}
        <Link href="/signup" className="text-graphite underline underline-offset-4">
          Create an account
        </Link>
      </p>
    </div>
  );
}
