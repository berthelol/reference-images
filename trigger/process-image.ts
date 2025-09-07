import { task } from "@trigger.dev/sdk/v3";
import { z } from "zod";

export const processImageTask = task({
  id: "process-image",
  run: async (payload, { ctx }) => {
   
    return {
      imageId: payload.imageId,
      operation: payload.operation,
      status: "completed",
      timestamp: new Date().toISOString(),
    };
  },
});