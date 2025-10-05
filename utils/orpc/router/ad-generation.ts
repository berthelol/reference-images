import { pub } from "../middlewares";
import { z } from "zod";
import { generateAdPromptAndJSON } from "@/utils/ai/ai-actions";
import { downloadImage, processImage } from "@/utils/images/images-actions";
import { generateText } from "ai";
import { google } from "@ai-sdk/google";

// Generate prompt and filled JSON from product and reference images
export const generatePrompt = pub
    .input(
      z.object({
        productImageUrl: z.string().describe("URL or base64 of product image"),
        referenceImageId: z.string().describe("ID of the reference template image"),
        referenceJSON: z.any().describe("Reference template JSON structure"),
      })
    )
    .handler(async ({ input }) => {
      // Download and process product image
      let productBuffer: Buffer;
      if (input.productImageUrl.startsWith("data:")) {
        // Base64 image
        const base64Data = input.productImageUrl.split(",")[1];
        productBuffer = Buffer.from(base64Data, "base64");
      } else {
        // URL
        productBuffer = await downloadImage(input.productImageUrl);
      }

      // Process product image
      const { compressedBuffer: productImageBuffer } = await processImage(productBuffer);

      // Download reference image
      const referenceImageUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/medias/${input.referenceImageId}.webp`;
      const referenceBuffer = await downloadImage(referenceImageUrl);
      const { compressedBuffer: referenceImageBuffer } = await processImage(referenceBuffer);

      // Generate prompt and filled JSON
      try {
        const result = await generateAdPromptAndJSON({
          productImageBuffer,
          referenceImageBuffer,
          referenceJSON: input.referenceJSON,
        });

        console.log("****result", result.object);

        return {
          prompt: result.object.prompt,
          filled_json: result.object.filled_json,
          usage: result.usage,
        };
      } catch (error) {
        console.error("********Error generating prompt:", error);
     
        // Return a fallback response
        throw new Error("Failed to generate prompt. Please try again.");
      }
    });

// Generate final ad image using Nano Banana
export const generateAd = pub
    .input(
      z.object({
        prompt: z.string().describe("Generation prompt"),
        productImageUrl: z.string().describe("URL or base64 of product image"),
        referenceImageId: z.string().describe("ID of the reference template image"),
        filledJSON: z.any().describe("Filled JSON structure"),
      })
    )
    .handler(async ({ input }) => {
      // Download and process product image
      let productBuffer: Buffer;
      if (input.productImageUrl.startsWith("data:")) {
        const base64Data = input.productImageUrl.split(",")[1];
        productBuffer = Buffer.from(base64Data, "base64");
      } else {
        productBuffer = await downloadImage(input.productImageUrl);
      }

      const { compressedBuffer: productImageBuffer } = await processImage(productBuffer);

      // Download reference image
      const referenceImageUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/medias/${input.referenceImageId}.webp`;
      const referenceBuffer = await downloadImage(referenceImageUrl);
      const { compressedBuffer: referenceImageBuffer } = await processImage(referenceBuffer);

      // Generate ad using Nano Banana (Gemini 2.5 Flash Image Preview)
      const result = await generateText({
        model: google("gemini-2.5-flash-image-preview"),
        providerOptions: {
          google: { responseModalities: ["TEXT", "IMAGE"] },
        },
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `${input.prompt}\n\nAd Structure JSON:\n${JSON.stringify(input.filledJSON, null, 2)}`,
              },
              {
                type: "image",
                image: productImageBuffer,
              },
              {
                type: "image",
                image: referenceImageBuffer,
              },
            ],
          },
        ],
      });

      if (result.finishReason === "content-filter") {
        throw new Error("Content filter triggered");
      }

      if (!result?.files?.[0]?.base64) {
        throw new Error("No base64 image data received from AI model");
      }

      // Return the base64 image
      return {
        image: result.files[0].base64,
        text: result.text,
      };
    });
