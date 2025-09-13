import { processImageTask } from "@/trigger/process-image-task";
import { pub } from "@/utils/orpc/middlewares";
import { z } from "zod";

export const processImages = pub
  .input(
    z.object({
      imageUrls: z.array(z.string().url()),
      model: z.enum(["openai", "gemini"]).optional().default("openai"),
    })
  )
  .handler(async ({ input }) => {
    try {
      // Trigger the process-image task
      const handle = await processImageTask.trigger({
        imageUrls: input.imageUrls,
        model: input.model,
      });

      // Return the run handle ID immediately (don't wait for completion)
      return {
        success: true,
        runId: handle.id,
        message: "Image processing task triggered successfully",
      };
      
    } catch (error) {
      console.error("Failed to process images:", error);
      throw new Error("Failed to process images");
    }
  });