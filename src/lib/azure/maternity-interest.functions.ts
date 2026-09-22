import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getAzurePgPool } from "./pg-pool";

const interestSchema = z
  .object({
    firstName: z.string().trim().min(1).max(100),
    role: z.string().trim().min(1).max(120),
    organisation: z.string().trim().min(1).max(200),
    contactPreference: z.enum(["feedback", "contact"]),
    email: z.string().trim().max(320).optional(),
    problem: z.string().trim().min(1).max(1500),
    usefulness: z.string().trim().min(1).max(1500),
    validationInterest: z.enum(["conversation", "demo", "pilot", "feedback-only"]),
    notes: z.string().trim().max(2000).optional(),
    pilotUpdates: z.boolean(),
    pagePath: z.string().max(500).optional(),
    userAgent: z.string().max(500).optional(),
    viewport: z.string().max(40).optional(),
  })
  .superRefine((data, ctx) => {
    const needsEmail = data.contactPreference === "contact" || data.pilotUpdates;
    if (needsEmail && !z.string().email().safeParse(data.email).success) {
      ctx.addIssue({ code: "custom", path: ["email"], message: "Enter a valid email address." });
    }
    if (data.email && !z.string().email().safeParse(data.email).success) {
      ctx.addIssue({ code: "custom", path: ["email"], message: "Enter a valid email address." });
    }
  });

export const submitMaternityServiceInterest = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => interestSchema.parse(data))
  .handler(async ({ data }) => {
    const pool = getAzurePgPool();
    const message = [
      `Name: ${data.firstName}`,
      `Role: ${data.role}`,
      `Area or organisation: ${data.organisation}`,
      `Response type: ${data.contactPreference}`,
      `Problem observed: ${data.problem}`,
      `Potential usefulness: ${data.usefulness}`,
      `Validation interest: ${data.validationInterest}`,
      data.notes ? `Additional notes: ${data.notes}` : null,
      `Pilot updates: ${data.pilotUpdates ? "Yes" : "No"}`,
    ]
      .filter((line): line is string => Boolean(line))
      .join("\n");

    await pool.query(
      `INSERT INTO feedback_submissions
         (category, message, reply_email, is_tester, page_path, user_agent, viewport, context)
       VALUES ($1, $2, $3, false, $4, $5, $6, $7)`,
      [
        "other",
        message,
        data.email || null,
        data.pagePath || "/maternity-services",
        data.userAgent || null,
        data.viewport || null,
        JSON.stringify({
          formType: "maternity-service-validation",
          firstName: data.firstName,
          role: data.role,
          organisation: data.organisation,
          contactPreference: data.contactPreference,
          validationInterest: data.validationInterest,
          pilotUpdates: data.pilotUpdates,
          timestamp: new Date().toISOString(),
        }),
      ],
    );

    return { ok: true as const };
  });
