"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { acceptApplication, declineApplication, type DecisionState } from "../../actions";
import { Button, Chip, FormError, Select, Textarea, type TallyTone } from "@/components/ui";
import { TallyCard, TallyCountdownStrip, TallyStrip } from "@/components/tally";
import { Toast } from "@/components/toast";
import { Countdown } from "@/components/countdown";
import { money, views, followers, stamp } from "@/lib/format";
import {
  DECLINE_REASON_LABEL,
  APPLICATION_STATUS_LABEL,
  PLATFORM_SHORT,
} from "@/lib/types";
import type { ApplicationStatus, DeclineReason, Platform } from "@/lib/types";

export type Applicant = {
  id: string;
  status: ApplicationStatus;
  pitch: string;
  rate_cents: number;
  expires_at: string;
  created_at: string;
  responded_at: string | null;
  decline_reason: DeclineReason | null;
  decline_note: string | null;
  /**
   * Milliseconds left in the response window, computed ONCE on the server.
   *
   * This card is a client component, so calling Date.now() in its render would
   * evaluate on the server and again during hydration, seconds apart, and React
   * would report a text mismatch on the countdown. The server owns the clock;
   * the component only ticks it forward.
   */
  windowMs: number;
  creator: {
    handle: string;
    display_name: string;
    niche: string | null;
    city: string | null;
    follower_count: number;
    avg_views: number;
    platforms: Platform[];
    bio: string | null;
  };
  thread_id: string | null;
};

export function ApplicantCard({
  applicant: a,
  campaignId,
  slotsLeft,
}: {
  applicant: Applicant;
  campaignId: string;
  slotsLeft: number;
}) {
  const [declining, setDeclining] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [accept, acceptAction, accepting] = useActionState<DecisionState, FormData>(
    acceptApplication,
    {},
  );
  const [decline, declineAction, declinePending] = useActionState<DecisionState, FormData>(
    declineApplication,
    {},
  );

  const c = a.creator;
  const decided = a.status !== "pending";

  return (
    <TallyCard className="flex flex-col gap-4 p-4 sm:p-5">
      {a.status === "pending" ? (
        <TallyCountdownStrip expiresAt={a.expires_at} initialMs={a.windowMs} />
      ) : (
        <TallyStrip tone={APPLICANT_TONE[a.status]} />
      )}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <div className="flex flex-wrap items-baseline gap-2">
            <span className="type-timecode text-[15px] text-graphite">@{c.handle}</span>
            <span className="type-small text-slate">{c.display_name}</span>
          </div>
          <p className="type-small text-slate">
            {[c.niche, c.city].filter(Boolean).join(" · ")}
            {c.platforms.length
              ? ` · ${c.platforms.map((p) => PLATFORM_SHORT[p]).join(", ")}`
              : ""}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-3">
          <span className="type-timecode text-[18px]">{money(a.rate_cents)}</span>
          <Chip
            tone={
              a.status === "accepted" ? "clear" : a.status === "pending" ? "neutral" : "over"
            }
          >
            {APPLICATION_STATUS_LABEL[a.status]}
          </Chip>
        </div>
      </div>

      <div className="flex flex-wrap gap-x-5 gap-y-1">
        <Metric label="Followers" value={followers(c.follower_count)} />
        <Metric label="Avg views" value={views(c.avg_views)} demo />
      </div>

      <p className="whitespace-pre-wrap text-[15px] leading-relaxed">{a.pitch}</p>
      {c.bio ? <p className="type-small text-slate">{c.bio}</p> : null}

      <Toast message={accept.toast ?? decline.toast} />

      <div className="flex flex-col gap-3 border-t border-hairline pt-3">
        {accept.threadId ? (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-[4px] border border-graphite/30 bg-graphite p-3.5">
            <p className="type-small">
              Accepted. <span className="type-timecode text-graphite">{money(a.rate_cents)}</span>{" "}
              is escrowed for @{c.handle}.
            </p>
            <Link href={`/t/${accept.threadId}`}>
              <Button variant="primary" size="sm">Open thread</Button>
            </Link>
          </div>
        ) : decline.declined ? (
          <p className="type-small">
            Declined, and @{c.handle} has been told why.
          </p>
        ) : a.status === "pending" ? (
          <>
            <Countdown expiresAt={a.expires_at} initialMs={a.windowMs} />

            <FormError>{accept.error || decline.error}</FormError>

            {confirming ? (
              /* Accepting moves real money and cannot be undone, so it gets at
                 least the friction the free, re-approachable decline already
                 had. The button keeps its name through the confirm — an action
                 does not get renamed halfway. */
              <div className="flex flex-col gap-3 rounded-[4px] border border-graphite/30 bg-graphite p-3.5">
                <p className="type-small">
                  Escrow{" "}
                  <span className="type-timecode text-graphite">
                    {money(a.rate_cents)}
                  </span>{" "}
                  to @{c.handle} and open a thread. This can&apos;t be undone,
                  and it uses one of your {slotsLeft} remaining slot
                  {slotsLeft === 1 ? "" : "s"}.
                </p>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <form action={acceptAction} className="sm:flex-1">
                    <input type="hidden" name="application_id" value={a.id} />
                    <input type="hidden" name="campaign_id" value={campaignId} />
                    <Button
                      type="submit"
                      variant="primary"
                      className="w-full"
                      disabled={accepting}
                    >
                      {accepting
                        ? "Escrowing…"
                        : `Accept and escrow ${money(a.rate_cents)}`}
                    </Button>
                  </form>
                  <Button variant="ghost" onClick={() => setConfirming(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : !declining ? (
              <div className="flex flex-col gap-2.5 sm:flex-row">
                <Button
                  variant="primary"
                  className="sm:max-w-[360px] sm:flex-1"
                  disabled={slotsLeft <= 0}
                  onClick={() => setConfirming(true)}
                >
                  {slotsLeft <= 0
                    ? "No slots left"
                    : `Accept and escrow ${money(a.rate_cents)}`}
                </Button>
                <Button variant="secondary" onClick={() => setDeclining(true)}>
                  Decline with reason
                </Button>
              </div>
            ) : (
              /* A decline cannot be sent without a reason. The database enforces
                 the same rule, so this is a courtesy, not the guard. */
              <form action={declineAction} className="flex flex-col gap-3">
                <input type="hidden" name="application_id" value={a.id} />
                <input type="hidden" name="campaign_id" value={campaignId} />

                <div className="flex flex-col gap-1.5">
                  <label htmlFor={`reason-${a.id}`} className="type-micro text-slate">
                    Why are you declining? @{c.handle} will see this
                  </label>
                  <Select id={`reason-${a.id}`} name="reason" required defaultValue="">
                    <option value="" disabled>
                      Pick a reason
                    </option>
                    {(Object.keys(DECLINE_REASON_LABEL) as DeclineReason[]).map((r) => (
                      <option key={r} value={r}>
                        {DECLINE_REASON_LABEL[r]}
                      </option>
                    ))}
                  </Select>
                </div>

                <Textarea
                  name="note"
                  rows={2}
                  maxLength={400}
                  placeholder="Anything useful to add? Optional, and they'll read it."
                />

                <div className="flex flex-col gap-2.5 sm:flex-row">
                  <Button
                    type="submit"
                    variant="secondary"
                    className="sm:flex-1"
                    disabled={declinePending}
                  >
                    {declinePending ? "Declining…" : "Decline with reason"}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setDeclining(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            )}
          </>
        ) : null}

        {a.status === "accepted" && a.thread_id ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="type-small text-slate">
              Accepted {a.responded_at ? stamp(a.responded_at) : ""} ·{" "}
              {money(a.rate_cents)} escrowed
            </p>
            <Link href={`/t/${a.thread_id}`}>
              <Button variant="secondary" size="sm">
                Open thread
              </Button>
            </Link>
          </div>
        ) : null}

        {a.status === "declined" && a.decline_reason ? (
          <div className="flex flex-col gap-1">
            <span className="type-micro text-slate">Reason sent to @{c.handle}</span>
            <p className="type-small">{DECLINE_REASON_LABEL[a.decline_reason]}</p>
            {a.decline_note ? (
              <p className="type-small text-slate">“{a.decline_note}”</p>
            ) : null}
          </div>
        ) : null}

        {a.status === "expired" ? (
          <p className="type-small text-tally-live">
            You let this window lapse without answering. It counts against your
            response rate, which creators can see.
          </p>
        ) : null}

        {decided && a.status === "withdrawn" ? (
          <p className="type-small text-slate">
            @{c.handle} withdrew this application.
          </p>
        ) : null}
      </div>
    </TallyCard>
  );
}

const APPLICANT_TONE: Record<ApplicationStatus, TallyTone> = {
  pending: "standby",
  accepted: "clear",
  declined: "over",
  expired: "over",
  withdrawn: "over",
};

function Metric({
  label,
  value,
  demo,
}: {
  label: string;
  value: string;
  demo?: boolean;
}) {
  return (
    <span className="flex items-baseline gap-1.5">
      <span className="type-micro text-slate">{label}</span>
      <span className="type-timecode text-[15px]">{value}</span>
      {demo ? <span className="type-micro text-slate/60">demo data</span> : null}
    </span>
  );
}
