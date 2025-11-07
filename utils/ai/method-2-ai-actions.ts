"use server";

import { generateObject } from "ai";
import { z } from "zod";
import { openai } from "@ai-sdk/openai";

/**
 * METHOD 2 - STEP 1: Product Swap Only
 * Generate prompt focusing only on product replacement
 */
export async function generateMethod2Step1PromptAndJSON({
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
        prompt: z.string().describe("Prompt focused on product swap only"),
        filled_json: z.any().describe("Reference JSON with product elements updated, text/colors unchanged")
      }),
      schemaName: "Method2Step1Prompt",
      schemaDescription: "Step 1: Product swap with minimal changes",
      temperature: 0.2,
      mode: "json",
      messages: [
        {
          role: "system",
          content: `You are an expert ad creative director for METHOD 2 - STEP 1: PRODUCT SWAP.

This is a TWO-STEP process. In this FIRST STEP, you ONLY swap the product.

CRITICAL: Return a JSON object with:
{
  "prompt": "string - focused ONLY on product replacement",
  "filled_json": object - JSON with ONLY product_elements updated
}

DO NOT change text, colors, or other elements in this step.`
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `STEP 1 OF 2: Replace only the product in the reference template.

PRODUCT DESCRIPTION: ${productDescription}

REFERENCE TEMPLATE JSON:
${JSON.stringify(referenceJSON, null, 2)}

STEP 1 INSTRUCTIONS - PRODUCT SWAP ONLY:
1. Analyze the product image:
   - Identify product type and shape
   - Note product positioning and orientation
   - Understand product materials and textures

2. Update ONLY the product_elements in the JSON:
   - Replace product description with new product
   - Update product positioning if needed
   - Describe product materials and finish
   - DO NOT touch text_variables (keep all text from reference)
   - DO NOT touch color_variables (keep all colors from reference)
   - DO NOT change any text content

3. Generate a prompt that:
   - Focuses SOLELY on product placement and replacement
   - Maintains the EXACT same background from reference
   - Keeps the EXACT same text from reference (do not generate new text)
   - Keeps the EXACT same colors from reference
   - Only describes the product swap

EXAMPLE: "Replace the product in the center with [new product description]. Keep all text, colors, and layout exactly as shown in the reference image."

This step is ONLY about swapping the product visually.

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
    console.error("Error in generateMethod2Step1PromptAndJSON:", error);
    throw new Error(`Method 2 Step 1 failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * METHOD 2 - STEP 2: Text and Elements Update
 * Generate prompt for updating text, colors, and other elements
 */
export async function generateMethod2Step2PromptAndJSON({
  step1ImageBuffer,
  referenceImageBuffer,
  referenceJSON,
  productDescription,
}: {
  step1ImageBuffer: Buffer;
  referenceImageBuffer: Buffer;
  referenceJSON: any;
  productDescription: string;
}) {
  try {
    const result = await generateObject({
      model: openai("gpt-4o"),
      schema: z.object({
        prompt: z.string().describe("Prompt focused on text and visual elements update"),
        filled_json: z.any().describe("Reference JSON with text and color variables updated for the product")
      }),
      schemaName: "Method2Step2Prompt",
      schemaDescription: "Step 2: Update text, colors, and elements for the new product",
      temperature: 0.4,
      mode: "json",
      messages: [
        {
          role: "system",
          content: `You are an expert ad creative director for METHOD 2 - STEP 2: TEXT & ELEMENTS.

This is STEP 2 of a TWO-STEP process. The product has ALREADY been swapped.

CRITICAL: Return a JSON object with:
{
  "prompt": "string - focused on updating text, colors, and visual elements",
  "filled_json": object - JSON with text_variables and color_variables updated
}

The product is already in place - focus on text and branding.`
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `STEP 2 OF 2: Update text, colors, and elements to match the new product.

PRODUCT DESCRIPTION: ${productDescription}

REFERENCE TEMPLATE JSON:
${JSON.stringify(referenceJSON, null, 2)}

STEP 2 INSTRUCTIONS - TEXT & ELEMENTS UPDATE:
1. Analyze the product in the FIRST image (product already swapped):
   - Extract product name and brand from packaging
   - Identify brand colors from the product
   - Note key product features and benefits
   - Understand the product category

2. Update text_variables and color_variables in the JSON:
   - Create engaging, product-specific copy for ALL text_variables
   - Extract brand colors and update color_variables
   - Write compelling headlines, subheads, and CTAs
   - Match the tone and style to the product brand
   - DO NOT change product_elements (product already positioned)
   - DO NOT move or reposition the product

3. Generate a prompt that:
   - Focuses on updating all text content
   - Applies new brand colors and styling
   - Updates graphic elements to match product branding
   - Maintains the EXACT product position from the first image
   - Creates cohesive brand experience

EXAMPLE: "Update all text and colors to match the [product brand]. Change headline to '[new headline]', use brand color #[color] for accents. Keep product exactly as positioned."

This step is about making the text and visuals match the new product.

Return JSON with "prompt" (string) and "filled_json" (object).`
            },
            {
              type: "image",
              image: step1ImageBuffer,
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
    console.error("Error in generateMethod2Step2PromptAndJSON:", error);
    throw new Error(`Method 2 Step 2 failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
