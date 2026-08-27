import Link from "next/link";
import { requireCreator } from "@/lib/auth";
import { listThreads } from "@/lib/threads";
import { ThreadList } from "@/components/thread-list";
import { Button, EmptyState } from "@/components/ui";

export const metadata = { title: "Threads — SideShift" };

export default async function CreatorThreads() {
  await requireCreator();
  const items = await listThreads("creator");

  return (
    <div className="flex flex-col gap-7">
      <div className="flex flex-col gap-2">
        <h1 className="type-display-xl">Threads</h1>
        <p className="text-ash">
          Every campaign you were accepted to. Brief, chat, your cut, and where
          the money is.
        </p>
      </div>

      {items.length === 0 ? (
        <EmptyState
          title="No threads yet"
          body="When a brand accepts you, a thread opens here and your rate is escrowed before you film anything."
          action={
            <Link href="/c/browse">
              <Button variant="primary">Browse open campaigns</Button>
            </Link>
          }
        />
      ) : (
        <ThreadList items={items} />
      )}
    </div>
  );
}
