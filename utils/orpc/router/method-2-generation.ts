import { z } from "zod";
import {
  generateMethod2Step1PromptAndJSON,
  generateMethod2Step2PromptAndJSON,
} from "@/utils/ai/method-2-ai-actions";
import { downloadImage, processImage } from "@/utils/images/images-actions";
import { generateText } from "ai";
import { google } from "@ai-sdk/google";
import { pub } from "@/utils/orpc/middlewares";
import { supabaseAdmin } from "@/utils/supabase/admin";

// METHOD 2: Two-step generation (Product swap + Text elements)
export const generateMethod2TwoStep = pub
  .input(
    z.object({
      productImageUrls: z.array(z.string()).describe("URLs or base64 of product images"),
      productDescription: z.string().describe("Short description of the product"),
      referenceImageId: z
        .string()
        .describe("ID of the reference template image"),
    })
  )
  .handler(async ({ input }) => {
    try {
      // Fetch reference JSON from Supabase
      const { data: referenceImage, error } = await supabaseAdmin
        .from("images")
        .select("reference_json")
        .eq("id", input.referenceImageId)
        .single();

      if (error || !referenceImage?.reference_json) {
        throw new Error(`Failed to fetch reference JSON: ${error?.message || "No JSON found"}`);
      }

      const referenceJSON = referenceImage.reference_json;

      // Download and process all product images
      const productImageBuffers: Buffer[] = [];

      for (const imageUrl of input.productImageUrls) {
        let productBuffer: Buffer;
        if (imageUrl.startsWith("data:")) {
          const base64Data = imageUrl.split(",")[1];
          productBuffer = Buffer.from(base64Data, "base64");
        } else {
          productBuffer = await downloadImage(imageUrl);
        }

        productImageBuffers.push(productBuffer);
      }

      // Download reference image
      const referenceImageUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/medias/${input.referenceImageId}.webp`;
      const referenceBuffer = await downloadImage(referenceImageUrl);

      // ========================================
      // STEP 1: Product Swap
      // ========================================
      console.log("METHOD 2 - Starting Step 1: Product Swap");
      const step1PromptResult = await generateMethod2Step1PromptAndJSON({
        productImageBuffer: productImageBuffers[0], // Use first image for prompt
        referenceImageBuffer: referenceBuffer,
        referenceJSON,
        productDescription: input.productDescription,
      });

      console.log("METHOD 2 - Step 1 prompt generated");

      // Build content for Step 1
      const step1Content: any[] = [
        {
          type: "text",
          text: `METHOD 2 - STEP 1: PRODUCT SWAP ONLY

Product Description: ${input.productDescription}

${step1PromptResult.object.prompt}

Ad Structure JSON (Product Elements Only):
${JSON.stringify(step1PromptResult.object.filled_json, null, 2)}

IMPORTANT: Only swap the product. Keep all text and colors exactly as shown in the reference image.`,
        },
      ];

      // Add all product images
      productImageBuffers.forEach((buffer) => {
        step1Content.push({
          type: "image",
          image: buffer,
        });
      });

      // Add reference image
      step1Content.push({
        type: "image",
        image: referenceBuffer,
      });

      // Generate Step 1 image
      const step1ImageResult = await generateText({
        model: google("gemini-2.5-flash-image-preview"),
        providerOptions: {
          google: { responseModalities: ["TEXT", "IMAGE"] },
        },
        messages: [
          {
            role: "user",
            content: step1Content,
          },
        ],
      });

      if (step1ImageResult.finishReason === "content-filter") {
        throw new Error("Method 2 Step 1: Content filter triggered");
      }

      if (!step1ImageResult?.files?.[0]?.base64) {
        throw new Error("Method 2 Step 1: No base64 image data received");
      }

      const step1ImageBase64 = step1ImageResult.files[0].base64;
      const step1ImageBuffer = Buffer.from(step1ImageBase64, "base64");

      console.log("METHOD 2 - Step 1 image generated");

      // ========================================
      // STEP 2: Text and Elements Update
      // ========================================
      console.log("METHOD 2 - Starting Step 2: Text and Elements");
      const step2PromptResult = await generateMethod2Step2PromptAndJSON({
        step1ImageBuffer,
        referenceImageBuffer: referenceBuffer,
        referenceJSON,
        productDescription: input.productDescription,
      });

      console.log("METHOD 2 - Step 2 prompt generated");

      // Generate Step 2 final image
      const step2ImageResult = await generateText({
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
                text: `METHOD 2 - STEP 2: TEXT AND ELEMENTS UPDATE

Product Description: ${input.productDescription}

${step2PromptResult.object.prompt}

Ad Structure JSON (Text and Color Variables):
${JSON.stringify(step2PromptResult.object.filled_json, null, 2)}

IMPORTANT: Update text and colors to match the product. Keep the product position exactly as it is in the first image.`,
              },
              {
                type: "image",
                image: step1ImageBuffer,
              },
              {
                type: "image",
                image: referenceBuffer,
              },
            ],
          },
        ],
      });

      if (step2ImageResult.finishReason === "content-filter") {
        throw new Error("Method 2 Step 2: Content filter triggered");
      }

      if (!step2ImageResult?.files?.[0]?.base64) {
        throw new Error("Method 2 Step 2: No base64 image data received");
      }

      console.log("METHOD 2 - Step 2 image generated");
      console.log("METHOD 2 - Two-step generation completed successfully");

      // Return both steps
      return {
        step1: {
          prompt: step1PromptResult.object.prompt,
          filled_json: step1PromptResult.object.filled_json,
          image: step1ImageBase64,
        },
        step2: {
          prompt: step2PromptResult.object.prompt,
          filled_json: step2PromptResult.object.filled_json,
          image: step2ImageResult.files[0].base64,
        },
      };
    } catch (error) {
      console.error("Error in METHOD 2 generateTwoStep:", error);
      throw new Error(
        `Method 2 generation failed: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  });
