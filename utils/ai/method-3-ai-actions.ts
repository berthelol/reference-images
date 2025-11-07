"use server";

import { generateObject, generateText } from "ai";
import { z } from "zod";
import { openai } from "@ai-sdk/openai";

/**
 * METHOD 3 - STEP 2: Generate filled_json from reference
 * Use GPT-4o to analyze product and reference, then generate filled_json
 */
export async function generateMethod3FilledJSON({
  productImageBuffers,
  referenceImageBuffer,
  referenceJSON,
  productDescription,
}: {
  productImageBuffers: Buffer[];
  referenceImageBuffer: Buffer;
  referenceJSON: any;
  productDescription: string;
}) {
  try {
    const result = await generateObject({
      model: openai("gpt-4o"),
      schema: z.object({
        filled_json: z.any().describe("Complete filled JSON with all elements updated for the new product")
      }),
      schemaName: "Method3FilledJSON",
      schemaDescription: "Generate filled JSON structure for the new product",
      temperature: 0.4,
      mode: "json",
      messages: [
        {
          role: "system",
          content: `You are an expert ad creative director

Analyze the product images and reference template, then generate a complete filled_json that adapts the template for this product.

CRITICAL: Return a JSON object with:
{
  "filled_json": object - Complete JSON structure with all variables updated
}

Update ALL elements: product_elements, text_variables, color_variables, etc.`
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `GENERATE FILLED JSON FOR NEW PRODUCT

PRODUCT DESCRIPTION: ${productDescription}

REFERENCE TEMPLATE JSON STRUCTURE:
${JSON.stringify(referenceJSON, null, 2)}

INSTRUCTIONS:
1. Analyze the product images:
   - Identify product type, brand, packaging
   - Extract brand colors from product
   - Note key product features and benefits
   - Read any text visible on product packaging

2. Analyze the reference template:
   - Understand the layout structure
   - Identify all variable fields (text, colors, product elements)
   - Note the design style and hierarchy

3. Generate a complete filled_json that:
   - Updates product_elements with new product description and positioning
   - Creates compelling, product-specific copy for ALL text_variables
   - Extracts and applies brand colors to color_variables
   - Adapts all elements to match the new product's branding
   - Maintains the reference template's structure and style
   - Crucial: DO NOT add new texts or elements, only update the existing ones

4. Text guidelines:
   - Headline: Short, punchy, benefit-focused
   - Subhead: Supporting detail or feature
   - CTA: Action-oriented, clear next step
   - Use brand voice appropriate for product category

5. Color guidelines:
   - Extract primary brand color from product
   - Use complementary colors for accents
   - Ensure sufficient contrast for readability

Return a complete filled_json that's ready to use.`
            },
            ...productImageBuffers.map((buffer) => ({
              type: "image" as const,
              image: buffer,
            })),
            {
              type: "image",
              image: referenceImageBuffer,
            }
          ]
        }
      ],
      maxRetries: 3
    });

    return result;
  } catch (error) {
    console.error("Error in generateMethod3FilledJSON:", error);
    throw new Error(`Method 3 Step 2 failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * METHOD 3 - STEP 3: Translate JSON changes to readable instructions
 * Compare original and filled JSON, output human-readable change instructions
 */
export async function generateMethod3Instructions({
  originalJSON,
  filledJSON,
}: {
  originalJSON: any;
  filledJSON: any;
}) {
  try {
    const result = await generateObject({
      model: openai("gpt-4o"),
      schema: z.object({
        instructions: z.array(z.string()).describe("Numbered list of specific changes to make")
      }),
      schemaName: "Method3Instructions",
      schemaDescription: "Translate JSON differences into readable instructions",
      temperature: 0.2,
      mode: "json",
      messages: [
        {
          role: "system",
          content: `You are an expert at comparing JSON structures and generating clear, visually-oriented instructions for an image AI model.

CRITICAL: Return a JSON object with:
{
  "instructions": string[] - Array of visually descriptive change instructions
}

Each instruction must reference ACTUAL VISIBLE CONTENT, not abstract JSON keys.

GOOD EXAMPLES:
- "Change the text 'Reese's Who? Meet Your New Peanut Butter Cup Addiction' to 'Step Into Fun with Croc Slippers!'"
- "Update all yellow background areas to green (#008000)"
- "Change the text 'Irresistibly Creamy & Rich' to 'Playful Design'"
- "Replace the chocolate brown text color (#4A2C00) with dark green (#006400) throughout"

BAD EXAMPLES (Don't do this):
- "Change HEADLINE_TEXT to 'New headline'" ❌ (references abstract key)
- "Update BRAND_PRIMARY color" ❌ (no visual reference)
- "Change TEXT_2" ❌ (model can't see which text is #2)`
        },
        {
          role: "user",
          content: `GENERATE VISUAL CHANGE INSTRUCTIONS

ORIGINAL JSON (Reference Template):
${JSON.stringify(originalJSON, null, 2)}

FILLED JSON (Updated for New Product):
${JSON.stringify(filledJSON, null, 2)}

INSTRUCTIONS:
Compare the two JSON structures and generate visually descriptive change instructions that an image AI model can understand by SEEING the image.

For EACH difference, write instructions like:
1. "Change the text '[EXACT ORIGINAL TEXT]' to '[NEW TEXT]'"
2. "Update the [VISUAL LOCATION] from [ORIGINAL COLOR] to [NEW COLOR]"

Key principles:
- Always include the ACTUAL ORIGINAL VALUE so the AI can visually locate it
- Use descriptive visual locations: "headline at the top", "text on the left", "background color"
- Never reference abstract JSON keys (TEXT_2, HEADLINE_TEXT, etc.)
- For colors, describe the visual area: "yellow background" not "BACKGROUND variable"
- Group related changes: if multiple elements use the same color, combine into one instruction

CRITICAL - DO NOT include instructions for:
- Product replacement or swapping (this is already done in Step 1)
- Product positioning or sizing
- Removing or adding the main product image

Order instructions logically:
1. Text content changes (with exact original text quoted)
2. Color changes (with visual area descriptions)
3. Layout or styling adjustments

Return an array of clear, visually-oriented instructions that reference actual visible content.`
        }
      ],
      maxRetries: 3
    });

    return result;
  } catch (error) {
    console.error("Error in generateMethod3Instructions:", error);
    throw new Error(`Method 3 Step 3 failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
