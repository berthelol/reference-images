import { z } from "zod";
import { generateMethod1PromptAndJSON } from "@/utils/ai/method-1-ai-actions";
import { downloadImage, processImage } from "@/utils/images/images-actions";
import { generateText } from "ai";
import { google } from "@ai-sdk/google";
import { pub } from "@/utils/orpc/middlewares";
import { supabaseAdmin } from "@/utils/supabase/admin";

// METHOD 1: Generate prompt
export const generateMethod1Prompt = pub
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

    // Download and process first product image (for prompt generation)
    let productBuffer: Buffer;
    const firstImageUrl = input.productImageUrls[0];
    if (firstImageUrl.startsWith("data:")) {
      const base64Data = firstImageUrl.split(",")[1];
      productBuffer = Buffer.from(base64Data, "base64");
    } else {
      productBuffer = await downloadImage(firstImageUrl);
    }

    const { compressedBuffer: productImageBuffer } = await processImage(
      productBuffer
    );

    // Download reference image
    const referenceImageUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/medias/${input.referenceImageId}.webp`;
    const referenceBuffer = await downloadImage(referenceImageUrl);
    const { compressedBuffer: referenceImageBuffer } = await processImage(
      referenceBuffer
    );

    // Generate prompt and filled JSON using Method 1
    const result = await generateMethod1PromptAndJSON({
      productImageBuffer,
      referenceImageBuffer,
      referenceJSON,
      productDescription: input.productDescription,
    });

    console.log("Method 1 prompt generated:", result.object);

    return {
      prompt: result.object.prompt,
      filled_json: result.object.filled_json,
      usage: result.usage,
    };
  });

// METHOD 1: Generate ad image
export const generateMethod1Ad = pub
  .input(
    z.object({
      prompt: z.string().describe("Generation prompt"),
      productImageUrls: z.array(z.string()).describe("URLs or base64 of product images"),
      productDescription: z.string().describe("Short description of the product"),
      referenceImageId: z
        .string()
        .describe("ID of the reference template image"),
      filledJSON: z.any().describe("Filled JSON structure"),
    })
  )
  .handler(async ({ input }) => {
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
   
    // Build content array with all product images
    const content: any[] = [
      {
        type: "text",
        text: `

Product Description: ${input.productDescription}

${input.prompt}

Ad Structure JSON:
${JSON.stringify(input.filledJSON, null, 2)}

Generate a complete ad with all elements in one pass.`,
      },
    ];

    // Add all product images
    productImageBuffers.forEach((buffer) => {
      content.push({
        type: "image",
        image: buffer,
      });
    });

    // Add reference image
    content.push({
      type: "image",
      image: referenceBuffer,
    });

    // Generate ad using Nano Banana (Gemini 2.5 Flash Image Preview)
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
      throw new Error("Method 1: Content filter triggered");
    }

    if (!result?.files?.[0]?.base64) {
      throw new Error("Method 1: No base64 image data received from AI model");
    }

    return {
      image: result.files[0].base64,
      text: result.text,
    };
  });
