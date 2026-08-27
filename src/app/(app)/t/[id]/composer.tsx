"use client";

import { useActionState, useEffect, useRef } from "react";
import { sendMessage, type ThreadState } from "../actions";
import { Button, FormError } from "@/components/ui";

export function Composer({
  threadId,
  counterpartHandle,
}: {
  threadId: string;
  counterpartHandle: string;
}) {
  const [state, action, pending] = useActionState<ThreadState, FormData>(
    sendMessage,
    {},
  );
  const ref = useRef<HTMLTextAreaElement>(null);

  // Clear on a successful send, not on every render.
  useEffect(() => {
    if (!pending && !state.error && ref.current) ref.current.value = "";
  }, [pending, state.error]);

  return (
    <form action={action} className="flex flex-col gap-2">
      <input type="hidden" name="thread_id" value={threadId} />
      <div className="flex items-end gap-2">
        <textarea
          ref={ref}
          name="body"
          rows={1}
          required
          maxLength={4000}
          placeholder={`Message @${counterpartHandle}…`}
          onInput={(e) => {
            const el = e.currentTarget;
            el.style.height = "auto";
            el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
          }}
          onKeyDown={(e) => {
            // Enter sends, Shift+Enter breaks the line.
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              e.currentTarget.form?.requestSubmit();
            }
          }}
          className="min-h-11 flex-1 resize-none rounded-[4px] border border-hairline bg-card px-3 py-2.5 leading-relaxed text-graphite placeholder:text-slate/70 transition-[border-color] duration-150 hover:border-slate/60 focus:border-graphite"
        />
        <Button type="submit" variant="primary" disabled={pending}>
          {pending ? "Sending…" : "Send message"}
        </Button>
      </div>
      <FormError>{state.error}</FormError>
    </form>
  );
}
