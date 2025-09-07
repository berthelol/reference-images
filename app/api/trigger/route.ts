import { createRoute } from "@trigger.dev/sdk/v3/nextjs";

export const { POST } = createRoute({
  secretKey: process.env.TRIGGER_SECRET_KEY!,
});