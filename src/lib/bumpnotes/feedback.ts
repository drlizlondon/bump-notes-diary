import { submitFeedbackAuthed, submitFeedbackPublic } from "@/lib/azure/feedback.functions";
import { isTester, getTesterSessionId } from "./tester";
import { ENTRA_NATIVE_ENABLED, getNativeAccessToken } from "@/lib/azure/entra-native";
import { getEntraAccessToken } from "@/lib/azure/entra-auth";

export type FeedbackCategory = "improvement" | "problem" | "love" | "question" | "other";

export const APP_VERSION = "0.1.0-beta";

export async function submitFeedback(input: {
  category: FeedbackCategory;
  message: string;
  replyEmail?: string;
}) {
  const fields = {
    category: input.category,
    message: input.message.slice(0, 5000),
    replyEmail: input.replyEmail?.trim() || null,
    pagePath: typeof window !== "undefined" ? window.location.pathname : null,
    appVersion: APP_VERSION,
    userAgent: typeof navigator !== "undefined" ? navigator.userAgent : null,
    viewport: typeof window !== "undefined" ? `${window.innerWidth}x${window.innerHeight}` : null,
    language: typeof navigator !== "undefined" ? navigator.language : null,
  };

  // Mirrors attachEntraAuth's own check (src/lib/azure/entra-auth-attacher.ts):
  // only route to the authed fn when a real access token is actually
  // available. Tester-mode AND signed-out demo-mode visitors (both reach
  // this same FeedbackButton via AppShell) have no token and must use the
  // public path — the Supabase original handled all three the same way via
  // RLS-permitted anonymous inserts, so this preserves that behaviour.
  const token = isTester()
    ? null
    : ((ENTRA_NATIVE_ENABLED ? await getNativeAccessToken() : null) ??
      (await getEntraAccessToken()));

  if (token) {
    await submitFeedbackAuthed({ data: fields });
  } else {
    await submitFeedbackPublic({
      data: { ...fields, testerSessionId: isTester() ? getTesterSessionId() : null },
    });
  }
}
