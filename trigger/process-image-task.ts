import { logger, task } from "@trigger.dev/sdk/v3";
import { z } from "zod";
import sharp from "sharp";
import { openai } from "@ai-sdk/openai";
import { google } from "@ai-sdk/google";
import { generateObject } from "ai";
import { getPlaiceholder } from "plaiceholder";
import { supabaseAdmin } from "@/utils/supabase/admin";
import { db } from "@/utils/kysely/client";
import { getImageUrl } from "@/utils/images/helper";
import { findClosestAspectRatio } from "@/utils/data/aspect-ratios";

export const processImageTask = task({
  id: "process-image",
  maxDuration: 3600, // 1 hour timeout
  run: async (payload: {
    imageUrls: string[];
    model?: "openai" | "gemini";
  }) => {
    // Model configuration
    const modelConfig = {
      openai: {
        provider: openai("gpt-4o"),
        name: "gpt-4o",
      },
      gemini: {
        provider: google("gemini-2.5-flash"),
        name: "gemini-2.5-flash",
      },
    };

    const selectedModel = modelConfig[payload.model || "openai"];
    const supabase = supabaseAdmin;
    const results: any[] = [];

    // Fetch all available tags with master tag information
    const tags = await db
      .selectFrom("tags as t")
      .leftJoin("tags as mt", "mt.id", "t.master_tag_id")
      .select([
        "t.id",
        "t.title",
        "t.master_tag_id",
        "mt.title as master_tag_title",
        "mt.is_mandatory_category",
      ])
      .where("t.is_validated", "=", true)
      .execute();

    logger.info(`Tags:`, { tagsLength: tags.length });

    // Group tags by master category
    const tagsByMaster = new Map<
      string,
      {
        masterTitle: string;
        isMandatory: boolean;
        tags: { id: string; title: string }[];
      }
    >();

    // Handle tags with master categories
    tags.forEach((tag: any) => {
      if (tag.master_tag_id && tag.master_tag_title) {
        const masterKey = tag.master_tag_id;
        if (!tagsByMaster.has(masterKey)) {
          tagsByMaster.set(masterKey, {
            masterTitle: tag.master_tag_title,
            isMandatory: tag.is_mandatory_category || false,
            tags: [],
          });
        }
        tagsByMaster.get(masterKey)!.tags.push({
          id: tag.id,
          title: tag.title,
        });
      }
    });

    // Build the structured tag context as JSON
    const tagContext = Array.from(tagsByMaster).map(([masterId, category]) => ({
      id: masterId,
      title: category.masterTitle,
      isMandatory: category.isMandatory,
      tags: category.tags,
    }));

    const mandatoryCategories = Array.from(tagsByMaster)
      .filter(([_, category]) => category.isMandatory)
      .map(([_, category]) => category.masterTitle);

    logger.info(`Tag Context:`, { tagContext, mandatoryCategories });

    for (const imageUrl of payload.imageUrls) {
      try {
        // Skip SVG and GIF files
        const urlLower = imageUrl.toLowerCase();
        if (urlLower.includes(".svg") || urlLower.includes(".gif")) {
          logger.info(`Skipping ${imageUrl} - SVG/GIF not supported`, {
            imageUrl,
          });
          continue;
        }

        // Download the image
        const response = await fetch(imageUrl);
        if (!response.ok) {
          throw new Error(`Failed to download image: ${response.statusText}`);
        }

        const imageBuffer = Buffer.from(await response.arrayBuffer());

        // Get original image metadata for aspect ratio calculation
        const metadata = await sharp(imageBuffer).metadata();
        const originalWidth = metadata.width || 1;
        const originalHeight = metadata.height || 1;
        const originalAspectRatio = originalWidth / originalHeight;

        // Find the closest standard aspect ratio
        const closestRatio = findClosestAspectRatio(originalAspectRatio);
        const normalizedAspectRatio = closestRatio.value;

        // Calculate crop dimensions to match the normalized aspect ratio
        let cropWidth: number, cropHeight: number;
        if (originalAspectRatio > normalizedAspectRatio) {
          // Original is wider, crop width
          cropHeight = originalHeight;
          cropWidth = Math.round(cropHeight * normalizedAspectRatio);
        } else {
          // Original is taller, crop height
          cropWidth = originalWidth;
          cropHeight = Math.round(cropWidth / normalizedAspectRatio);
        }

        // Compress, crop to normalized aspect ratio, and convert to WebP
        const compressedBuffer = await sharp(imageBuffer)
          .extract({
            left: Math.round((originalWidth - cropWidth) / 2),
            top: Math.round((originalHeight - cropHeight) / 2),
            width: cropWidth,
            height: cropHeight,
          })
          .resize(1200, Math.round(1200 / normalizedAspectRatio), {
            fit: "inside",
            withoutEnlargement: true,
          })
          .webp({ quality: 100 })
          .toBuffer();

        // Generate blur data
        const plaiceholder = await getPlaiceholder(compressedBuffer, {
          size: 20,
        });
        const blurData = plaiceholder.base64;

        // Use AI to analyze and tag the image
        let aiResult;
        try {
          aiResult = await generateObject({
            model: selectedModel.provider,
            schema: z.object({
              tagIds: z
                .array(z.string())
                .describe("Array of tag IDs that match the image content"),
              confidences: z
                .record(z.string(), z.number())
                .describe("Map of tag IDs to confidences"),
              description: z
                .string()
                .describe(
                  "A detailed description of the image content and visual elements"
                ),
              proposedTags: z
                .array(
                  z.object({
                    name: z.string(),
                    parentTagId: z.string(),
                    reasoning: z.string(),
                  })
                )
                .describe("Array of proposed tags"),
            }),

            messages: [
              {
                role: "system",
                content: `You are an image taxonomy specialist. Your FIRST priority is to return precise tags from the allowed list only.
          Never invent IDs. If unsure, omit the tag. Prefer precision over recall. Output valid JSON only.`,
              },
              {
                role: "user",
                content: [
                  {
                    type: "text",
                    text: `
Analyze the image and perform THREE tasks.

Task 1 — Canonical tag selection
- Return tag IDs ONLY from the allowed list.
- Only use tags Ids, do not return parent tag Ids.
- Prefer precision over recall. If unsure about a tag, omit it.
- Include a confidences map (0-1) for the IDs you selected.

Task 2 — Image Description
- Describe the image context, environment, scene setting, and visual layout.
- Focus on composition, lighting, background, atmosphere, style, and spatial arrangement.
- Include any visible UI elements, icons, text, or interface components if present.
- Avoid focusing on specific products/objects; prioritize the overall scene and context (2-4 sentences).

Task 3 — Propose NEW TAGS (optional)
- ONLY if the taxonomy clearly lacks coverage.
- Each proposal MUST include a parentTagId that exists in the allowed list.
- Do NOT propose synonyms of existing tags; only propose genuinely new, useful concepts.

${
  mandatoryCategories.length > 0
    ? `MANDATORY REQUIREMENTS:\n${mandatoryCategories
        .map(
          (cat) => `- You MUST select at least one tag from "${cat}" category.
    The Format / Type of Content can have multiple tags. For example it can be "Static ad" and "Discount / Promotion" at the same time, put both in the tagIds array.
    Also you might receive a few static ads so don't hesitate to them as such.
    `
        )
        .join("\n")}\n\n`
    : ""
}
RETURN JSON ONLY in this exact shape:
{
  "description": "A detailed description of the image...",
  "tagIds": ["<uuid>", "..."],
  "confidences": { "<uuid>": 0.82, "...": 0.74 },
  "proposedTags": [
    { "name": "…", "parentTagId": "<uuid>", "reasoning": "…" }
  ]
}

Available tags (JSON format):
${JSON.stringify(tagContext, null, 2)}`,
                  },
                  {
                    type: "image",
                    image: compressedBuffer,
                    mediaType: "image/webp",
                  },
                ],
              },
            ],
            maxRetries: 2,
          });
          const cost = calculateAICost(aiResult.usage, selectedModel.name);
          logger.info(`AI Result (${selectedModel.name}):`, {
            url: imageUrl,
            object: aiResult.object,
            originalAspectRatio: originalAspectRatio.toFixed(3),
            normalizedAspectRatio: `${normalizedAspectRatio.toFixed(3)} (${
              closestRatio.name
            })`,
            description: aiResult.object.description,
            tags: aiResult.object.tagIds?.map(
              (tagId: string) =>
                tags.find((tag: any) => tag.id === tagId)?.title
            ),
            proposedTags: aiResult.object.proposedTags?.map(
              (proposedTag: any) => proposedTag?.name
            ),
            usage: aiResult.usage,
            cost: `$${cost.toFixed(10)}`,
          });
        } catch (aiError) {
          logger.error(`AI tagging failed for ${imageUrl}:`, { aiError });
          // Fallback: continue with empty tags
          aiResult = { object: { tagIds: [], description: null } };
        }

        // Insert image record in database
        const insertResult = await db
          .insertInto("images")
          .values({
            blur_data: blurData,
            aspect_ratio: closestRatio.name,
            description: aiResult.object.description || null,
          })
          .returning("id")
          .executeTakeFirstOrThrow();

        const imageId = insertResult.id;

        // Upload compressed image to Supabase storage
        const fileName = `${imageId}.webp`;
        const { error: uploadError } = await supabase.storage
          .from("medias")
          .upload(fileName, compressedBuffer, {
            contentType: "image/webp",
            upsert: true,
          });

        if (uploadError) {
          throw new Error(`Failed to upload image: ${uploadError.message}`);
        }

        // Validate that all tag IDs exist in the database
        const validTagIds = tags.map((tag: any) => tag.id);
        const finalTagIds =
          aiResult.object.tagIds.length > 0
            ? aiResult.object.tagIds.filter((tagId: string) =>
                validTagIds.includes(tagId)
              )
            : [];

        // Handle proposed tags from AI if any
        if (
          aiResult.object.proposedTags &&
          aiResult.object.proposedTags.length > 0
        ) {
          for (const proposedTag of aiResult.object.proposedTags) {
            try {
              await db
                .insertInto("tags")
                .values({
                  title: proposedTag.name,
                  master_tag_id: proposedTag.parentTagId,
                  is_validated: false,
                })
                .execute();

              logger.info(`Created unvalidated tag: ${proposedTag.name}`, {
                parentTagId: proposedTag.parentTagId,
                parentTagTitle: tags.find(
                  (tag: any) => tag.id === proposedTag.parentTagId
                )?.title,
                reasoning: proposedTag.reasoning,
              });
            } catch (error) {
              logger.error(
                `Failed to create proposed tag: ${proposedTag.name}`,
                { error }
              );
            }
          }
        }

        // Associate tags with the image
        if (finalTagIds.length > 0) {
          const tagInserts = finalTagIds.map((tagId: string) => ({
            image_id: imageId,
            tag_id: tagId,
          }));

          await db.insertInto("images-tags").values(tagInserts).execute();
        }

        if (finalTagIds.length !== aiResult.object.tagIds.length) {
          logger.warn(`Some invalid tag IDs filtered out.`, {
            originalTagIds: aiResult.object.tagIds,
            validTagIds: finalTagIds,
          });
        }

        results.push({
          originalUrl: imageUrl,
          imageId,
          publicUrl: getImageUrl(imageId),
          description: aiResult.object.description || null,
          tagIds: finalTagIds,
          tags: finalTagIds.map(
            (tagId: string) => tags.find((tag: any) => tag.id === tagId)?.title
          ),
          status: "completed",
        });
      } catch (error) {
        logger.error(`Failed to process image ${imageUrl}:`, { error });
        results.push({
          originalUrl: imageUrl,
          status: "failed",
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    logger.info(`Processed ${results.length} images`, { results });

    return {
      processedCount: results.filter((r) => r.status === "completed").length,
      failedCount: results.filter((r) => r.status === "failed").length,
      results,
      timestamp: new Date().toISOString(),
    };
  },
});

// Utility function to calculate AI API cost
function calculateAICost(usage: any, model: string): number {
  // Pricing per 1K tokens (latest as of Sept 2025)
  const pricing: Record<string, { input: number; output: number }> = {
    // OpenAI GPT-4o pricing
    "gpt-4o": { input: 0.005, output: 0.015 },
    // $5.00 per 1M input tokens, $15.00 per 1M output tokens

    "gpt-4o-mini": { input: 0.00015, output: 0.0006 },
    // $0.15 per 1M input tokens, $0.60 per 1M output tokens

    // Google Gemini pricing (per 1K tokens)
    "gemini-2.5-flash": { input: 0.0003, output: 0.0025 },
    // $0.30 per 1M input tokens, $2.50 per 1M output tokens

    "gemini-2.5-flash-lite": { input: 0.0001, output: 0.0004 },
    // $0.10 per 1M input tokens, $0.40 per 1M output tokens
  };

  const modelPricing = pricing[model];
  if (!modelPricing) {
    console.warn(`Unknown model pricing for: ${model}`);
    return 0;
  }

  const inputTokens = usage?.promptTokens || 0;
  const outputTokens = usage?.completionTokens || 0;

  // Calculate cost in dollars
  const inputCost = (inputTokens / 1000) * modelPricing.input;
  const outputCost = (outputTokens / 1000) * modelPricing.output;
  const totalCost = inputCost + outputCost;

  return totalCost;
}
