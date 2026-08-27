import Link from "next/link";
import { requireBrand } from "@/lib/auth";
import { listThreads } from "@/lib/threads";
import { ThreadList } from "@/components/thread-list";
import { Button, EmptyState } from "@/components/ui";

export const metadata = { title: "Threads — SideShift" };

export default async function BrandThreads() {
  await requireBrand();
  const items = await listThreads("brand");

  return (
    <div className="flex flex-col gap-7">
      <div className="flex flex-col gap-2">
        <h1 className="type-display-xl">Threads</h1>
        <p className="text-slate">
          One per accepted creator. The brief, the chat, the cut and the money
          all live in here.
        </p>
      </div>

      {items.length === 0 ? (
        <EmptyState
          title="No threads open yet"
          body="Accepting a creator opens a thread and escrows their rate. Everything after that happens in one place instead of four."
          action={
            <Link href="/b/applicants">
              <Button variant="primary">Review applicants</Button>
            </Link>
          }
        />
      ) : (
        <ThreadList items={items} />
      )}
    </div>
  );
}
