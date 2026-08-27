"use client";

import { useActionState, useState } from "react";
import {
  approveDeliverable,
  requestChanges,
  submitDeliverable,
  type ThreadState,
} from "../actions";
import { Button, FormError, Input, Label, Textarea } from "@/components/ui";
import { money } from "@/lib/format";
import { DELIVERABLE_STATUS_LABEL, type DeliverableStatus } from "@/lib/types";

type Latest = {
  id: string;
  version: number;
  status: DeliverableStatus;
  deliveryUrl: string | null;
  fileUrl: string | null;
} | null;

export function DeliverablePanel({
  threadId,
  role,
  latest,
  amountCents,
  complete,
}: {
  threadId: string;
  role: "brand" | "creator";
  latest: Latest;
  amountCents: number;
  complete: boolean;
}) {
  if (complete) {
    return (
      <div className="flex flex-col gap-1.5">
        <span className="type-micro text-slate">Deliverable</span>
        <p className="type-small">
          v{latest?.version} approved and paid. Nothing left to do.
        </p>
      </div>
    );
  }

  return role === "creator" ? (
    <CreatorSide threadId={threadId} latest={latest} />
  ) : (
    <BrandSide threadId={threadId} latest={latest} amountCents={amountCents} />
  );
}

function CreatorSide({ threadId, latest }: { threadId: string; latest: Latest }) {
  const [state, action, pending] = useActionState<ThreadState, FormData>(
    submitDeliverable,
    {},
  );
  // Collapsed until asked for. Expanded by default it cost ~450px above the
  // fold on a 390px screen, pushing the brief and the whole conversation off
  // the first screenful for a form the creator only needs once per cut.
  const [open, setOpen] = useState(false);

  const awaiting = latest?.status === "submitted";

  return (
    <div className="flex flex-col gap-3">
      <span className="type-micro text-slate">Your deliverable</span>

      {latest ? (
        <p className="type-small">
          v{latest.version} · {DELIVERABLE_STATUS_LABEL[latest.status]}
        </p>
      ) : null}

      {awaiting ? (
        <p className="type-small text-slate">
          Sent. The brand is reviewing it — you&apos;ll see the outcome on the
          thread the moment they act.
        </p>
      ) : !open ? (
        <Button variant="secondary" onClick={() => setOpen(true)}>
          Submit v{(latest?.version ?? 0) + 1}
        </Button>
      ) : (
        <form action={action} className="flex flex-col gap-3.5">
          <input type="hidden" name="thread_id" value={threadId} />

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="delivery_url">Delivery link</Label>
            <Input
              id="delivery_url"
              name="delivery_url"
              type="url"
              placeholder="https://drive.google.com/…"
            />
            <p className="type-small text-slate">
              A Drive, Frame.io or raw platform link. How most cuts actually
              arrive.
            </p>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="file">Or upload the file</Label>
            <input
              id="file"
              name="file"
              type="file"
              accept="video/mp4,video/quicktime,video/webm,image/jpeg,image/png,image/webp"
              className="type-small w-full cursor-pointer rounded-[4px] border border-hairline bg-graphite p-2 text-slate file:mr-3 file:cursor-pointer file:rounded-[4px] file:border-0 file:bg-graphite file:px-3 file:py-1.5 file:text-graphite"
            />
            <p className="type-small text-slate">Up to 25MB.</p>
          </div>

          <Textarea
            name="note"
            rows={2}
            maxLength={1000}
            placeholder="Anything the brand should know about this cut. Optional."
          />

          <FormError>{state.error}</FormError>

          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              type="submit"
              variant="primary"
              disabled={pending}
              className="sm:flex-1"
            >
              {pending ? "Submitting…" : "Submit for review"}
            </Button>
            {latest ? (
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                Cancel
              </Button>
            ) : null}
          </div>
        </form>
      )}
    </div>
  );
}

function BrandSide({
  threadId,
  latest,
  amountCents,
}: {
  threadId: string;
  latest: Latest;
  amountCents: number;
}) {
  const [approve, approveAction, approving] = useActionState<ThreadState, FormData>(
    approveDeliverable,
    {},
  );
  const [changes, changesAction, changing] = useActionState<ThreadState, FormData>(
    requestChanges,
    {},
  );
  const [asking, setAsking] = useState(false);

  if (!latest) {
    return (
      <div className="flex flex-col gap-1.5">
        <span className="type-micro text-slate">Deliverable</span>
        <p className="type-small text-slate">
          Nothing submitted yet. The money stays escrowed until it is.
        </p>
      </div>
    );
  }

  if (latest.status !== "submitted") {
    return (
      <div className="flex flex-col gap-1.5">
        <span className="type-micro text-slate">Deliverable</span>
        <p className="type-small">
          v{latest.version} · {DELIVERABLE_STATUS_LABEL[latest.status]}
        </p>
        <p className="type-small text-slate">
          Waiting on the creator&apos;s next cut.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <span className="type-micro text-slate">Review v{latest.version}</span>

      {latest.fileUrl || latest.deliveryUrl ? (
        <a
          href={latest.fileUrl ?? latest.deliveryUrl!}
          target="_blank"
          rel="noreferrer"
          className="type-small w-fit text-graphite underline underline-offset-4"
        >
          {latest.fileUrl ? "Open the uploaded file" : "Open the delivery link"}
        </a>
      ) : null}

      <FormError>{approve.error || changes.error}</FormError>

      {!asking ? (
        <div className="flex flex-col gap-2">
          {/* The button says exactly what happens. It is not "Submit". */}
          <form action={approveAction}>
            <input type="hidden" name="thread_id" value={threadId} />
            <input type="hidden" name="deliverable_id" value={latest.id} />
            <Button
              type="submit"
              variant="primary"
              className="w-full"
              disabled={approving}
            >
              {approving
                ? "Releasing…"
                : `Approve and release ${money(amountCents)}`}
            </Button>
          </form>
          <Button variant="secondary" onClick={() => setAsking(true)}>
            Request changes
          </Button>
        </div>
      ) : (
        <form action={changesAction} className="flex flex-col gap-2.5">
          <input type="hidden" name="thread_id" value={threadId} />
          <input type="hidden" name="deliverable_id" value={latest.id} />
          <Textarea
            name="note"
            rows={3}
            required
            maxLength={1000}
            placeholder="What needs to change, specifically. They'll reshoot from this."
          />
          <div className="flex flex-col gap-2">
            <Button type="submit" variant="secondary" disabled={changing}>
              {changing ? "Sending…" : "Send change request"}
            </Button>
            <Button type="button" variant="ghost" onClick={() => setAsking(false)}>
              Cancel
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
