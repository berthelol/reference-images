"use server";

import { generateObject } from "ai";
import { z } from "zod";
import { openai } from "@ai-sdk/openai";

/**
 * METHOD 1: One-shot generation
 * Generate ad prompt and filled JSON in a single step
 */
export async function generateMethod1PromptAndJSON({
  productImageBuffer,
  referenceImageBuffer,
  referenceJSON,
  productDescription,
}: {
  productImageBuffer: Buffer;
  referenceImageBuffer: Buffer;
  referenceJSON: any;
  productDescription: string;
}) {
  try {
    const result = await generateObject({
      model: openai("gpt-4o"),
      schema: z.object({
        prompt: z.string().describe("Complete prompt for Nano Banana image generation"),
        filled_json: z.any().describe("The reference JSON with all variables filled")
      }),
      schemaName: "Method1AdPrompt",
      schemaDescription: "Generate complete ad prompt and JSON in one shot",
      temperature: 0.3,
      mode: "json",
      messages: [
        {
          role: "system",
          content: `You are an expert ad creative director for METHOD 1: ONE-SHOT GENERATION.

Your task is to create a complete ad campaign in a single pass.

CRITICAL: Return a JSON object with:
{
  "prompt": "string - comprehensive prompt for complete ad generation",
  "filled_json": object - complete reference JSON with all variables filled
}

Be thorough and complete - this is a single-shot generation.`
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Create a complete ad for this product using the reference template.

PRODUCT DESCRIPTION: ${productDescription}

REFERENCE TEMPLATE JSON:
${JSON.stringify(referenceJSON, null, 2)}

INSTRUCTIONS FOR ONE-SHOT GENERATION:
1. Analyze the product image thoroughly:
   - Extract product name, brand, tagline
   - Identify brand colors from packaging
   - Note product type and category
   - Understand unique selling points

2. Fill the COMPLETE template JSON:
   - Update ALL text_variables with engaging product copy
   - Extract and use brand colors in color_variables
   - Update ALL product_elements to describe the product
   - Fill graphic_elements if applicable
   - Maintain the reference layout structure

3. Generate a COMPREHENSIVE prompt that includes:
   - Complete scene description (background, lighting, camera angle)
   - Exact product positioning and styling
   - All text content with positions and styling
   - All colors and visual elements
   - Composition and layout details
   - Brand aesthetic and mood

Think of this as creating the entire ad in one complete pass.

Return JSON with "prompt" (string) and "filled_json" (object).`
            },
            {
              type: "image",
              image: productImageBuffer,
              mediaType: "image/webp"
            },
            {
              type: "image",
              image: referenceImageBuffer,
              mediaType: "image/webp"
            }
          ]
        }
      ],
      maxRetries: 3
    });

    return result;
  } catch (error) {
    console.error("Error in generateMethod1PromptAndJSON:", error);
    throw new Error(`Method 1 prompt generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
