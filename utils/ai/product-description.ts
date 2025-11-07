"use server";

import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";

/**
 * Generate a short product description from an image
 * Used to help Nano Banana understand the product better
 */
export async function generateProductDescription({
  productImageBuffer,
}: {
  productImageBuffer: Buffer;
}) {
  try {
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
      //maxTokens: 100,
      temperature: 0.3,
    });

    return result.text.trim();
  } catch (error) {
    console.error("Error generating product description:", error);
    throw new Error(
      `Failed to generate product description: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}
