import { z } from "zod";
import { generateText } from "ai";
import { google } from "@ai-sdk/google";
import { openai } from "@ai-sdk/openai";
import { pub } from "@/utils/orpc/middlewares";

/**
 * Clean product image - remove text, logos, and decorations
 */
export const cleanProductImage = pub
  .input(
    z.object({
      productImageUrls: z.array(z.string()).describe("URLs or base64 of product images"),
      productDescription: z.string().optional().describe("Optional product description"),
    })
  )
  .handler(async ({ input }) => {
    try {
      if (!input.productImageUrls || input.productImageUrls.length === 0) {
        throw new Error("Product images are required");
      }

      // Convert base64 images to buffers
      const productImageBuffers: Buffer[] = [];
      for (const imageUrl of input.productImageUrls) {
        const base64Data = imageUrl.split(",")[1];
        const buffer = Buffer.from(base64Data, "base64");
        productImageBuffers.push(buffer);
      }

      // Build content array with all product images
      const content: any[] = [
        {
          type: "text",
          text: `CLEAN PRODUCT IMAGE

Product Description: ${input.productDescription || "Product image"}

TASK: Remove all text, logos, decorations, and background elements. Keep ONLY the primary product.

Generate a clean, isolated product image with:
- No text or typography
- No labels or stickers
- No decorative elements
- No background patterns
- Just the main product on a clean background

The product should be centered and clearly visible.`,
        },
      ];

      // Add all product images
      productImageBuffers.forEach((buffer) => {
        content.push({
          type: "image",
          image: buffer,
        });
      });

      // Generate cleaned image using Nano Banana
      const result = await generateText({
        model: google("gemini-2.5-flash-image-preview"),
        providerOptions: {
          google: { responseModalities: ["TEXT", "IMAGE"] },
        },
        messages: [
          {
            role: "user",
            content,
          },
        ],
      });

      if (result.finishReason === "content-filter") {
        throw new Error("Content filter triggered");
      }

      if (!result?.files?.[0]?.base64) {
        console.log(result);
        throw new Error("No image generated");
      }

      return { image: result.files[0].base64 };
    } catch (error) {
      console.error("Error cleaning product image:", error);
      throw new Error(
        `Failed to clean product image: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  });

/**
 * Generate product description from image
 */
export const generateProductDescription = pub
  .input(
    z.object({
      imageUrl: z.string().describe("Base64 image URL of the product"),
    })
  )
  .handler(async ({ input }) => {
    try {
      if (!input.imageUrl) {
        throw new Error("Image URL is required");
      }

      // Convert base64 to buffer
      const base64Data = input.imageUrl.split(",")[1];
      const productImageBuffer = Buffer.from(base64Data, "base64");

      // Generate description
      const result = await generateText({
        model: openai("gpt-4o"),
        messages: [
          {
            role: "system",
            content: `You are a product analyst. Generate a SHORT, concise description of the product in the image.

Focus on:
- Product name or type
- Key visual characteristics (color, shape, material)
- Brand if visible
- Category (e.g., beverage, cosmetic, food, tech)

Keep it under 50 words. Be specific and descriptive.`,
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Describe this product briefly:",
              },
              {
                type: "image",
                image: productImageBuffer,
                mediaType: "image/webp",
              },
            ],
          },
        ],
        temperature: 0.3,
      });

      return { description: result.text.trim() };
    } catch (error) {
      console.error("Error generating product description:", error);
      throw new Error(
        `Failed to generate product description: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  });
