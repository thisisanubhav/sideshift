"use client";

import { useActionState, useState } from "react";
import { signUp, type AuthState } from "../actions";
import { Button, FormError, Input, Label, cn } from "@/components/ui";
import type { UserRole } from "@/lib/types";

const ROLES: { value: UserRole; title: string; body: string; bars: number[] }[] = [
  {
    value: "brand",
    title: "I'm hiring creators",
    body: "Post a brief, pick creators, approve the cut, release the money.",
    bars: [0.55, 0.8, 0.35],
  },
  {
    value: "creator",
    title: "I make videos",
    body: "Browse paid briefs, apply with your rate, deliver, get paid.",
    bars: [0.9, 0.45, 0.7],
  },
];

export function SignUpForm() {
  const [role, setRole] = useState<UserRole>("creator");
  const [state, action, pending] = useActionState<AuthState, FormData>(signUp, {});

  return (
    <form action={action} className="flex flex-col gap-6">
      <input type="hidden" name="role" value={role} />

      <fieldset className="flex flex-col gap-2.5">
        <legend className="type-micro mb-2.5 text-slate">Which side are you on</legend>
        <div className="grid gap-2.5 sm:grid-cols-2">
          {ROLES.map((r) => {
            const selected = role === r.value;
            return (
              <button
                key={r.value}
                type="button"
                aria-pressed={selected}
                onClick={() => setRole(r.value)}
                className={cn(
                  "flex flex-col gap-3 rounded-[4px] border p-4 text-left transition-colors",
                  selected
                    ? "border-graphite bg-graphite/10"
                    : "border-hairline bg-card hover:border-graphite/30",
                )}
              >
                {/* 9:16 bars — the native unit of the product, used as texture. */}
                <span aria-hidden className="flex h-7 items-end gap-1">
                  {r.bars.map((h, i) => (
                    <span
                      key={i}
                      style={{ height: `${h * 100}%` }}
                      className={cn(
                        "w-[9px] rounded-[4px]",
                        selected ? "bg-graphite" : "bg-slate/35",
                      )}
                    />
                  ))}
                </span>
                <span className="flex flex-col gap-1">
                  <span className="font-semibold">{r.title}</span>
                  <span className="type-small text-slate">{r.body}</span>
                </span>
              </button>
            );
          })}
        </div>
      </fieldset>

      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="display_name">
            {role === "brand" ? "Brand name" : "Your name"}
          </Label>
          <Input
            id="display_name"
            name="display_name"
            required
            autoComplete="organization"
            placeholder={role === "brand" ? "Sunlit Skincare" : "Maya Oyelaran"}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="handle">Handle</Label>
          <div className="flex items-center gap-0">
            <span className="type-timecode flex h-10 items-center rounded-l-[4px] border border-r-0 border-hairline bg-card px-3 text-slate">
              @
            </span>
            <Input
              id="handle"
              name="handle"
              required
              className="rounded-l-none"
              autoCapitalize="none"
              spellCheck={false}
              placeholder={role === "brand" ? "sunlit" : "maya.builds"}
            />
          </div>
          <p className="type-small text-slate">
            This is how you appear on every campaign and every thread.
          </p>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" required autoComplete="email" />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            name="password"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
          />
          <p className="type-small text-slate">At least <span className="type-timecode">8</span> characters.</p>
        </div>
      </div>

      <FormError>{state.error}</FormError>
      {state.notice ? (
        <p className="type-small rounded-[4px] border border-hairline bg-card px-3 py-2 text-slate">
          {state.notice}
        </p>
      ) : null}

      <Button type="submit" variant="primary" disabled={pending}>
        {pending
          ? "Creating your account…"
          : role === "brand"
            ? "Create brand account"
            : "Create creator account"}
      </Button>
    </form>
  );
}
