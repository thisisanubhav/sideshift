import Link from "next/link";
import { requireBrand } from "@/lib/auth";
import { NewCampaignForm } from "./form";

export const metadata = { title: "Post a campaign — SideShift" };

export default async function NewCampaignPage() {
  await requireBrand();

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-8">
      <Link href="/b" className="type-small w-fit text-slate hover:text-graphite">
        ← Your campaigns
      </Link>

      <div className="flex flex-col gap-2">
        <h1 className="type-display-xl">Post a campaign</h1>
        <p className="text-slate">
          Creators apply to this with a pitch and a rate. You have 48 hours to
          answer each one — that clock is visible to them, and your response rate
          is public on this card.
        </p>
      </div>

      <NewCampaignForm />
    </div>
  );
}
