import { requireBrand } from "@/lib/auth";
import { EmptyState } from "@/components/ui";

export default async function BrandDashboard() {
  const viewer = await requireBrand();

  return (
    <div className="flex flex-col gap-8">
      <h1 className="type-display-xl">{viewer.displayName}</h1>
      {/* TODO(phase 2): campaign list, slot counts, spend committed vs released. */}
      <EmptyState
        title="No campaigns yet"
        body="Post a brief and creators can start applying within the hour."
      />
    </div>
  );
}
