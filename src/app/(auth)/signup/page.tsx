import Link from "next/link";
import { redirect } from "next/navigation";
import { getViewer, homeFor } from "@/lib/auth";
import { SignUpForm } from "./form";

export const metadata = { title: "Join SideShift" };

export default async function SignUpPage() {
  const viewer = await getViewer();
  if (viewer) redirect(homeFor(viewer.role));

  return (
    <div className="flex flex-col gap-7">
      <div className="flex flex-col gap-2">
        <h1 className="type-display-xl">Join SideShift</h1>
        <p className="text-slate">
          Brief, chat, approval and payment for every creator — in one thread.
        </p>
      </div>

      <SignUpForm />

      <p className="type-small text-slate">
        Already have an account?{" "}
        <Link href="/login" className="text-graphite underline underline-offset-4">
          Sign in
        </Link>
      </p>
    </div>
  );
}
