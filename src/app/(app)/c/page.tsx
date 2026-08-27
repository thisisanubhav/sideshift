import { requireCreator } from "@/lib/auth";
import { EmptyState } from "@/components/ui";

export default async function CreatorApplications() {
  await requireCreator();

  return (
    <div className="flex flex-col gap-8">
      <h1 className="type-display-xl">Your applications</h1>
      {/* TODO(phase 2): applications with live 48h countdowns and decline reasons. */}
      <EmptyState
        title="You haven't applied to anything yet"
        body="Open briefs are paid, and every one of them has to answer you inside 48 hours."
      />
    </div>
  );
}
