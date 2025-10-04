import { logger, task } from "@trigger.dev/sdk/v3";
import { supabaseAdmin } from "@/utils/supabase/admin";
import { getImageUrl } from "@/utils/images/helper";
import {
  isSupportedImageFormat,
  downloadImage,
  processImage
} from "@/utils/images/images-actions";
import { generateImageTags, generateReferenceJSON } from "@/utils/ai/ai-actions";

export const processImageTask = task({
  id: "process-image",
  maxDuration: 3600, // 1 hour timeout
  run: async (payload: {
    imageUrls: string[];
    model?: "openai" | "gemini";
  }) => {
    const supabase = supabaseAdmin;
    const results: any[] = [];

    // Fetch all available tags with master tag information using Supabase
    const { data: tagsData } = await supabase
      .from("tags")
      .select(`
        id,
        title,
        master_tag_id,
        master:master_tag_id (
          title,
          is_mandatory_category
        )
      `)
      .eq("is_validated", true)
      .throwOnError();

    // Transform the data to match the expected format
    const tags = (tagsData || []).map((tag: any) => ({
      id: tag.id,
      title: tag.title,
      master_tag_id: tag.master_tag_id,
      master_tag_title: tag.master?.title || null,
      is_mandatory_category: tag.master?.is_mandatory_category || false,
    }));

    //logger.info(`Tags:`, { tagsLength: tags.length });

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

    //logger.info(`Tag Context:`, { tagContext, mandatoryCategories });

    for (const imageUrl of payload.imageUrls) {
      try {
        // Skip SVG and GIF files
        if (!isSupportedImageFormat(imageUrl)) {
          logger.info(`Skipping ${imageUrl} - SVG/GIF not supported`, {
            imageUrl,
          });
          continue;
        }

        // Download and process the image
        const imageBuffer = await downloadImage(imageUrl);
        const {
          compressedBuffer,
          blurData,
          aspectRatio,
          originalAspectRatio,
          normalizedAspectRatio,
        } = await processImage(imageBuffer);

        // Use AI to analyze and tag the image
        let aiResult;
        try {
          aiResult = await generateImageTags({
            imageBuffer: compressedBuffer,
            tagContext,
            mandatoryCategories,
            model: payload.model || "openai",
            maxRetries: 2,
          });

          const cost = calculateAICost(aiResult.usage, payload.model || "openai");
          logger.info(`AI Result (${payload.model || "openai"}):`, {
            url: imageUrl,
            object: aiResult.object,
            originalAspectRatio: originalAspectRatio.toFixed(3),
            normalizedAspectRatio: `${normalizedAspectRatio.toFixed(3)} (${aspectRatio})`,
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

        // Generate reference JSON for the image
        let referenceJSON;
        try {
          const referenceResult = await generateReferenceJSON({
            imageBuffer: compressedBuffer,
            aspectRatio: aspectRatio,
            model: payload.model || "openai",
            maxRetries: 2,
          });

          referenceJSON = referenceResult.object;
          const refCost = calculateAICost(referenceResult.usage, payload.model || "openai");
          logger.info(`Reference JSON generated (${payload.model || "openai"}):`, {
            url: imageUrl,
            referenceJSON: referenceJSON,
            usage: referenceResult.usage,
            cost: `$${refCost.toFixed(10)}`,
          });
        } catch (refError) {
          logger.warn(`Reference JSON generation failed for ${imageUrl}:`, {
            refError: {
              name: refError instanceof Error ? refError.name : 'Unknown',
              message: refError instanceof Error ? refError.message : 'Unknown error'
            }
          });
          logger.info(`Using null reference JSON for ${imageUrl}`);
          referenceJSON = null;
        }

        // Insert image record in database using Supabase
        const { data: insertResult, error: insertError } = await supabase
          .from("images")
          .insert({
            blur_data: blurData,
            aspect_ratio: aspectRatio,
            description: aiResult.object.description || null,
            reference_json: referenceJSON ? JSON.stringify(referenceJSON) : null,
          })
          .select("id")
          .single();

        if (insertError) {
          throw new Error(`Failed to insert image: ${insertError.message}`);
        }

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
              const { error: tagError } = await supabase
                .from("tags")
                .insert({
                  title: proposedTag.name,
                  master_tag_id: proposedTag.parentTagId,
                  is_validated: false,
                });

              if (tagError) {
                throw tagError;
              }

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

          const { error: tagInsertError } = await supabase
            .from("images-tags")
            .insert(tagInserts);

          if (tagInsertError) {
            logger.error(`Failed to associate tags with image:`, { tagInsertError });
          }
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
          referenceJSON: referenceJSON,
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
function calculateAICost(usage: any, model: "openai" | "gemini"): number {
  // Pricing per 1K tokens (latest as of Sept 2025)
  const pricing: Record<string, { input: number; output: number }> = {
    // OpenAI GPT-4o pricing
    "openai": { input: 0.005, output: 0.015 },
    "gpt-4o": { input: 0.005, output: 0.015 },
    // $5.00 per 1M input tokens, $15.00 per 1M output tokens

    "gpt-4o-mini": { input: 0.00015, output: 0.0006 },
    // $0.15 per 1M input tokens, $0.60 per 1M output tokens

    // Google Gemini pricing (per 1K tokens)
    "gemini": { input: 0.0003, output: 0.0025 },
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
