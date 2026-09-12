import { createStart, createMiddleware } from "@tanstack/react-start";

import { renderErrorPage } from "./lib/error-page";
import { attachSupabaseAuth } from "@/integrations/supabase/auth-attacher";
import { attachEntraAuth } from "@/lib/azure/entra-auth-attacher";

const errorMiddleware = createMiddleware().server(async ({ next }) => {
  try {
    return await next();
  } catch (error) {
    if (error != null && typeof error === "object" && "statusCode" in error) {
      throw error;
    }
    console.error(error);
    return new Response(renderErrorPage(), {
      status: 500,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }
});

export const startInstance = createStart(() => ({
  // attachEntraAuth runs after attachSupabaseAuth: it overrides the bearer when
  // Entra sign-in is active, and is a no-op passthrough while it's off.
  functionMiddleware: [attachSupabaseAuth, attachEntraAuth],
  requestMiddleware: [errorMiddleware],
}));
