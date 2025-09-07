import { logger, task } from "@trigger.dev/sdk/v3";
import { z } from "zod";
import sharp from "sharp";
import { openai } from "@ai-sdk/openai";
import { generateObject } from "ai";
import { getPlaiceholder } from "plaiceholder";
import { supabaseAdmin } from "@/utils/supabase/admin";
import { db } from "@/utils/kysely/client";
import { getImageUrl } from "@/utils/images/helper";

// TODO

// 1
// Todo generate JSON Structure form the image
// With variables to edit, that also can be

// 2. If ai see more tags to push that are missing then send them to a queue to be validated

export const processImageTask = task({
  id: "process-image",
  run: async (payload: { imageUrls: string[] }) => {
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
        "mt.is_mandatory_category"
      ])
      .execute();

    // Group tags by master category
    const tagsByMaster = new Map<string, {
      masterTitle: string;
      isMandatory: boolean;
      tags: { id: string; title: string }[];
    }>();

    // Handle tags with master categories
    tags.forEach((tag: any) => {
      if (tag.master_tag_id && tag.master_tag_title) {
        const masterKey = tag.master_tag_id;
        if (!tagsByMaster.has(masterKey)) {
          tagsByMaster.set(masterKey, {
            masterTitle: tag.master_tag_title,
            isMandatory: tag.is_mandatory_category || false,
            tags: []
          });
        }
        tagsByMaster.get(masterKey)!.tags.push({
          id: tag.id,
          title: tag.title
        });
      }
    });

    // Handle standalone tags (no master category)
    const standaloneTags = tags.filter((tag: any) => !tag.master_tag_id);

    // Build the formatted tag context
    let tagContext = "";
    let mandatoryInstructions = "";

    // Add master categories
    for (const [masterId, category] of Array.from(tagsByMaster)) {
      tagContext += `\n${category.masterTitle.toUpperCase()}\n`;
      category.tags.forEach(tag => {
        tagContext += `${tag.title}: ${tag.id}\n`;
      });

      if (category.isMandatory) {
        mandatoryInstructions += `- You MUST select at least one tag from "${category.masterTitle}" category\n`;
      }
    }

    // Add standalone tags if any
    if (standaloneTags.length > 0) {
      tagContext += `\nOTHER TAGS\n`;
      standaloneTags.forEach((tag: any) => {
        tagContext += `${tag.title}: ${tag.id}\n`;
      });
    }

    logger.info(`Tag Context:`, { tagContext });

    for (const imageUrl of payload.imageUrls) {
      try {
        logger.info(`Processing image ${imageUrl}`);
        // Skip SVG and GIF files
        const urlLower = imageUrl.toLowerCase();
        if (urlLower.includes(".svg") || urlLower.includes(".gif")) {
          logger.info(`Skipping ${imageUrl} - SVG/GIF not supported`);
          continue;
        }

        // Download the image
        const response = await fetch(imageUrl);
        if (!response.ok) {
          throw new Error(`Failed to download image: ${response.statusText}`);
        }

        const imageBuffer = Buffer.from(await response.arrayBuffer());

        // Compress and convert to WebP
        const compressedBuffer = await sharp(imageBuffer)
          .webp({ quality: 80 })
          .resize(1200, 1200, { fit: "inside", withoutEnlargement: true })
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
            model: openai("gpt-4o"),
            schema: z.object({
              tagIds: z
                .array(z.string())
                .describe("Array of tag IDs that match the image content"),
            }),

            messages: [
              {
                role: "user",
                content: [
                  {
                    type: "text",
                    text: `Analyze this image and select the most relevant tags from the list below.
You must respond with a JSON object containing an array of tag IDs that best describe the image content.

${mandatoryInstructions ? `MANDATORY REQUIREMENTS:\n${mandatoryInstructions}\n` : ''}Example response format:
{"tagIds": ["04dcf5a2-4890-4c0d-9988-2de02f2d4325", "another-uuid-here"]}
If no tags match, return: {"tagIds": []}

Available tags:
${tagContext}`,
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
          logger.info(`AI Result:`, {
            object: aiResult.object,
            usage: aiResult.usage,
          });
        } catch (aiError) {
          logger.error(`AI tagging failed for ${imageUrl}:`, { aiError });
          // Fallback: continue with empty tags
          aiResult = { object: { tagIds: [] } };
        }

        // Insert image record in database
        const insertResult = await db
          .insertInto("images")
          .values({
            blur_data: blurData,
            created_at: new Date().toISOString(),
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

        // Associate tags with the image
        if (finalTagIds.length > 0) {
          const tagInserts = finalTagIds.map((tagId: string) => ({
            image_id: imageId,
            tag_id: tagId,
          }));

          await db.insertInto("images-tags").values(tagInserts).execute();
        }

        if (finalTagIds.length !== aiResult.object.tagIds.length) {
          logger.warn(
            `Some invalid tag IDs filtered out.`, 
            {
              originalTagIds: aiResult.object.tagIds,
              validTagIds: finalTagIds,
            }
          );
        }

        results.push({
          originalUrl: imageUrl,
          imageId,
          publicUrl: getImageUrl(imageId),
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
