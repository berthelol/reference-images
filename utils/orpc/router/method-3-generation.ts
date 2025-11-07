import { z } from "zod";
import {
  generateMethod3FilledJSON,
  generateMethod3Instructions,
} from "@/utils/ai/method-3-ai-actions";
import { downloadImage } from "@/utils/images/images-actions";
import { generateText } from "ai";
import { google } from "@ai-sdk/google";
import { pub } from "@/utils/orpc/middlewares";
import { supabaseAdmin } from "@/utils/supabase/admin";

// METHOD 3: Four-step generation (Initial placement → Filled JSON → Instructions → Final refinement)
export const generateMethod3FourStep = pub
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
      // STEP 1: Initial Product Placement (Nano Banana)
      // ========================================
      console.log("METHOD 3 - Starting Step 1: Initial Product Placement");

      const step1Prompt = `REPLACE PRODUCT IN TEMPLATE

Product Description: ${input.productDescription}

TASK: Remove the original product from the reference template and replace it with the new product in the EXACT SAME LOCATION.

CRITICAL INSTRUCTIONS:
1. IDENTIFY where the original product is located in the reference template
2. COMPLETELY REMOVE the old product from that location
3. PLACE the new product in the EXACT SAME SPOT where the old product was
4. Size the new product to be approximately 15% SMALLER than the original product size
5. Use the SAME ALIGNMENT and POSITIONING as the original product had

IMPORTANT:
- The new product must be in the EXACT SAME LOCATION as the original product in the reference
- Make the new product slightly smaller (about 15% smaller) to ensure it fits properly
- Do NOT place the new product elsewhere in the image
- Do NOT overlay the new product on top of the old one - completely remove the old product first
- Maintain all existing text, colors, backgrounds, and design elements from the reference
- Only focus on replacing the product - do NOT change any text or colors yet`;

      // Build content for Step 1
      const step1Content: any[] = [
        {
          type: "text",
          text: step1Prompt,
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

      // Generate Step 1 image (Nano Banana)
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
        throw new Error("Method 3 Step 1: Content filter triggered");
      }

      if (!step1ImageResult?.files?.[0]?.base64) {
        throw new Error("Method 3 Step 1: No base64 image data received");
      }

      const step1ImageBase64 = step1ImageResult.files[0].base64;
      const step1ImageBuffer = Buffer.from(step1ImageBase64, "base64");

      console.log("METHOD 3 - Step 1 image generated (product placement)");

      // ========================================
      // STEP 2: Generate Filled JSON (GPT-4o)
      // ========================================
      console.log("METHOD 3 - Starting Step 2: Generate Filled JSON");

      const step2Result = await generateMethod3FilledJSON({
        productImageBuffers,
        referenceImageBuffer: referenceBuffer,
        referenceJSON,
        productDescription: input.productDescription,
      });

      console.log("METHOD 3 - Step 2 filled JSON generated");

      // ========================================
      // STEP 3: Translate to Instructions (GPT-4o)
      // ========================================
      console.log("METHOD 3 - Starting Step 3: Generate Change Instructions");

      const step3Result = await generateMethod3Instructions({
        originalJSON: referenceJSON,
        filledJSON: step2Result.object.filled_json,
      });

      console.log("METHOD 3 - Step 3 instructions generated");

      // ========================================
      // STEP 4: Final Refinement with Instructions (Nano Banana)
      // ========================================
      console.log("METHOD 3 - Starting Step 4: Final Refinement");

      const step4Prompt = `APPLY CHANGES TO IMAGE

Product Description: ${input.productDescription}

CHANGE INSTRUCTIONS:
${step3Result.object.instructions.map((instruction, idx) => `${idx + 1}. ${instruction}`).join("\n")}

TASK: Apply all the changes listed above to update the image.

IMPORTANT:
- The product is already in position (shown in the first image)
- Focus on updating text, colors, and visual elements
- Follow each instruction precisely
- Maintain the overall layout and design structure
- Ensure all changes create a cohesive, professional result`;

      // Build content for Step 4
      const step4Content: any[] = [
        {
          type: "text",
          text: step4Prompt,
        },
      ];

      // Add all product images for context
      productImageBuffers.forEach((buffer) => {
        step4Content.push({
          type: "image",
          image: buffer,
        });
      });

      // Add Step 1 image (product already placed)
      step4Content.push({
        type: "image",
        image: step1ImageBuffer,
      });

      // Generate Step 4 final image (Nano Banana)
      const step4ImageResult = await generateText({
        model: google("gemini-2.5-flash-image-preview"),
        providerOptions: {
          google: { responseModalities: ["TEXT", "IMAGE"] },
        },
        messages: [
          {
            role: "user",
            content: step4Content,
          },
        ],
      });

      if (step4ImageResult.finishReason === "content-filter") {
        throw new Error("Method 3 Step 4: Content filter triggered");
      }

      if (!step4ImageResult?.files?.[0]?.base64) {
        throw new Error("Method 3 Step 4: No base64 image data received");
      }

      console.log("METHOD 3 - Step 4 final image generated");
      console.log("METHOD 3 - Four-step generation completed successfully");

      // Return all steps
      return {
        step1: {
          prompt: step1Prompt,
          image: step1ImageBase64,
        },
        step2: {
          filled_json: step2Result.object.filled_json,
        },
        step3: {
          instructions: step3Result.object.instructions,
        },
        step4: {
          prompt: step4Prompt,
          image: step4ImageResult.files[0].base64,
        },
      };
    } catch (error) {
      console.error("Error in METHOD 3 generateFourStep:", error);
      throw new Error(
        `Method 3 generation failed: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  });
