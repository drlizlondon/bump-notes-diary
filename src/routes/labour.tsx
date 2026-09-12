import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/labour")({
  beforeLoad: () => {
    throw redirect({ to: "/", replace: true });
  },
});
