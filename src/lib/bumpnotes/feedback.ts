import { supabase } from "@/integrations/supabase/client";
import { getUserId } from "./sync";
import { isTester, getTesterSessionId } from "./tester";

export type FeedbackCategory = "improvement" | "problem" | "love" | "question" | "other";

export const APP_VERSION = "0.1.0-beta";

export async function submitFeedback(input: {
  category: FeedbackCategory;
  message: string;
  replyEmail?: string;
}) {
  const tester = isTester();
  const payload = {
    category: input.category,
    message: input.message.slice(0, 5000),
    reply_email: input.replyEmail?.trim() || null,
    user_id: getUserId(),
    tester_session_id: tester ? getTesterSessionId() : null,
    is_tester: tester,
    page_path: typeof window !== "undefined" ? window.location.pathname : null,
    app_version: APP_VERSION,
    user_agent: typeof navigator !== "undefined" ? navigator.userAgent : null,
    viewport: typeof window !== "undefined" ? `${window.innerWidth}x${window.innerHeight}` : null,
    context: {
      language: typeof navigator !== "undefined" ? navigator.language : null,
      timestamp: new Date().toISOString(),
    },
  };
  const { error } = await supabase.from("feedback_submissions").insert(payload);
  if (error) throw error;
}
