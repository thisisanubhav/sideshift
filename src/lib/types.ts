// Hand-written mirrors of the Postgres enums in supabase/migrations/0001_schema.sql.
// Kept small and explicit rather than generating the whole database type: these
// are the only shapes the UI branches on.

export type UserRole = "brand" | "creator";

export type Platform = "tiktok" | "reels" | "shorts";

export type CampaignStatus = "draft" | "open" | "closed";

export type ApplicationStatus =
  | "pending"
  | "accepted"
  | "declined"
  | "expired"
  | "withdrawn";

export type DeclineReason =
  | "not_the_right_fit"
  | "rate_above_budget"
  | "slots_filled"
  | "audience_mismatch"
  | "wrong_format_or_platform"
  | "other";

export type ThreadStatus = "active" | "in_review" | "complete";

export type DeliverableStatus = "submitted" | "changes_requested" | "approved";

export type PaymentStatus = "escrowed" | "in_review" | "released";

// ---------------------------------------------------------------------------
// Copy. Every enum value has exactly one human string, defined once, so a
// status never gets two different names in two different views.
// ---------------------------------------------------------------------------

export const PLATFORM_LABEL: Record<Platform, string> = {
  tiktok: "TikTok",
  reels: "Instagram Reels",
  shorts: "YouTube Shorts",
};

export const PLATFORM_SHORT: Record<Platform, string> = {
  tiktok: "TikTok",
  reels: "Reels",
  shorts: "Shorts",
};

export const APPLICATION_STATUS_LABEL: Record<ApplicationStatus, string> = {
  pending: "Awaiting reply",
  accepted: "Accepted",
  declined: "Declined",
  expired: "Expired unanswered",
  withdrawn: "Withdrawn",
};

export const DECLINE_REASON_LABEL: Record<DeclineReason, string> = {
  not_the_right_fit: "Not the right fit for this brief",
  rate_above_budget: "Rate above our budget",
  slots_filled: "Slots filled by other creators",
  audience_mismatch: "Audience doesn't match the campaign",
  wrong_format_or_platform: "Wrong format or platform",
  other: "Other",
};

export const PAYMENT_STATUS_LABEL: Record<PaymentStatus, string> = {
  escrowed: "Escrowed",
  in_review: "In review",
  released: "Released",
};

export const DELIVERABLE_STATUS_LABEL: Record<DeliverableStatus, string> = {
  submitted: "Awaiting review",
  changes_requested: "Changes requested",
  approved: "Approved",
};
