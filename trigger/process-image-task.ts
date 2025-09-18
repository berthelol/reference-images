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
import { findClosestAspectRatio } from "@/utils/images/aspect-ratios";

// Reference Image Schema - made more resilient with optional fields and string descriptions
const ReferenceImageSchema = z.object({
  meta: z.object({
    version: z.literal("refimg.v1"),
    source: z.string().optional().describe("like 'uploaded' or 'url'"),
    aspect_ratio: z.string().describe("e.g. '1:1', '4:5', '9:16'"),
    detected_resolution: z.string().optional().describe("like '3000x4000' if inferable"),
    confidence: z.number().min(0).max(1)
  }),
  variables: z.object({
    text_variables: z.record(z.string(), z.string())
      .describe("One-depth key:value map. Example: HEADLINE, SUBHEAD, BADGE_TEXT").default({}),
    color_variables: z.record(z.string(), z.string())
      .describe("One-depth key:HEX map. Example: BRAND_PRIMARY:'#1A2A6A'").default({}),
    font_variables: z.record(z.string(), z.object({
      family: z.string(),            // "serif", "sans-serif", or detected family if obvious
      weight: z.string().optional(), // "400","700"
      case: z.string().optional().describe("like 'normal', 'upper', 'title'"),
      notes: z.string().optional()
    })).describe("Keyed tokens like HEADLINE_FONT, BODY_FONT").default({}),
    icon_variables: z.record(z.string(), z.string()).optional()
      .describe("Optional names to simple descriptors, e.g. CHECK:'check-solid'"),
  }),
  scene: z.object({
    background: z.object({
      type: z.string().describe("like 'solid', 'gradient', 'texture', 'studio', 'environment'"),
      colorVar: z.string().optional(),     // key from color_variables
      colorVar2: z.string().optional(),    // for gradients
      description: z.string().optional()   // e.g. "split vertical 50/50", "marble texture"
    }),
    lighting: z.object({
      key: z.string(),                     // "soft daylight from top-left"
      shadows: z.string().optional(),      // "subtle drop", "ring shadow"
      effects: z.array(z.string()).optional()
    }),
    camera: z.object({
      angle: z.string(),                   // "45-degree front", "top-down"
      focal_length: z.string().optional(), // "50mm eq"
      depth_of_field: z.string().optional(), // "shallow", "deep"
      framing: z.string().optional()       // "mid shot, centered"
    }),
    composition: z.object({
      grid: z.string().optional(),         // "two-column", "rule-of-thirds"
      safe_area: z.array(z.number()).length(4).optional()
        .describe("[x,y,w,h] normalized 0–1"),
      z_order: z.array(z.string()).optional() // selectors/names in draw order
    }).optional()
  }),
  subjects: z.array(z.object({
    name: z.string(),                      // stable key: "product_jar", "hand_capsule"
    type: z.string().describe("like 'product', 'product_group', 'person', 'hand_with_product', 'graphic', 'other'"),
    description: z.string(),               // concise noun phrase
    pose: z.string().optional(),
    materials: z.array(z.string()).optional(),
    position: z.object({
      anchor: z.string().describe("like 'center', 'top-left', 'top-right', 'bottom-left', 'bottom-right', 'left', 'right', 'top', 'bottom', 'custom'"),
      bbox_norm: z.array(z.number()).length(4)
        .describe("[x,y,w,h] normalized 0–1")
    }),
    scale: z.string().optional(),          // "large","medium"
    rotation_deg: z.number().optional(),
    shadow: z.string().optional(),
    mask_shape: z.string().optional()      // "circle","pill","rounded-rect"
  })).default([]),
  overlays: z.object({
    graphics: z.array(z.object({
      name: z.string(),                    // "badge", "underline_rule"
      kind: z.string().describe("like 'shape', 'rule', 'badge', 'stars', 'pill', 'frame'"),
      position: z.object({
        anchor: z.string(),
        bbox_norm: z.array(z.number()).length(4)
      }),
      style: z.record(z.string(), z.any()).optional(), // arbitrary style details
      colorVar: z.string().optional(),
      strokeColorVar: z.string().optional()
    })).optional(),
    text_blocks: z.array(z.object({
      key: z.string().describe("MUST map to variables.text_variables"),
      default_text: z.string().optional(),
      fontVar: z.string().describe("Key from variables.font_variables").optional(),
      colorVar: z.string().describe("Key from variables.color_variables").optional(),
      bgColorVar: z.string().optional(),
      size_pt: z.number().optional(),
      line_height: z.number().optional(),
      tracking: z.string().optional(),     // "0.5px"
      align: z.string().optional().describe("like 'left', 'center', 'right'"),
      position: z.object({
        anchor: z.string(),
        bbox_norm: z.array(z.number()).length(4)
      }),
      max_width_px: z.number().optional(),
      style: z.record(z.string(), z.any()).optional()
    })).optional()
  }).optional(),
  constraints: z.object({
    strict_layout_match: z.boolean().default(true),
    do_not_add: z.array(z.string()).default([]),
    must_match: z.array(z.string()).default([])
  }).optional(),
  export: z.object({
    aspect_ratio: z.string(),              // repeat for convenience
    target_resolution: z.string().optional(), // "2048x2048"
    format: z.string().default("PNG").describe("like 'PNG', 'JPG', 'WEBP'"),
    transparent_background: z.boolean().optional()
  }),
  variability: z.object({
    allowed_jitter_pct: z.number().min(0).max(50).default(5),
    random_seed: z.number().optional(),
    augmentations: z.string().default("none").describe("like 'none', 'minor', 'moderate'")
  }).optional(),
  negatives: z.array(z.string()).default([]), // e.g. ["no CTA buttons","no extra badges"]

  // Scene generation properties for AI image creation
  scene_variations: z.array(z.object({
    slot: z.string().describe("e.g. '1 - Clarity Shot', '2 - Lifestyle Context'"),
    aspect_ratio: z.string().describe("e.g. '1:1', '4:5', '9:16'"),
    scene_name: z.string().describe("e.g. 'clarity_shot', 'lifestyle_context'"),
    product_reference: z.string().describe("Instructions for how the product should match the reference image"),
    scene: z.string().describe("Description of the background and environment"),
    angle: z.string().describe("Camera angle and perspective"),
    lighting: z.string().describe("Lighting conditions and quality"),
    photo_quality: z.string().describe("Quality and style requirements"),
    additional_elements: z.string().describe("Props, objects, or elements to include"),
    composition_notes: z.string().describe("Framing and arrangement guidelines")
  })).optional().describe("Array of scene variations for AI image generation")
});

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
                content: `You are an image taxonomy specialist. Your FIRST priority is to return comprehensive tags from the allowed list only.
          Never invent IDs. When in doubt, include the tag if it's reasonably applicable. Prefer recall over precision - it's better to include more relevant tags than to miss important ones. Output valid JSON only.`,
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
- Be generous with tag selection - include any tag that could reasonably apply to the image.
- If you see elements, styles, themes, or concepts that match available tags, include them.
- Include a confidences map (0-1) for the IDs you selected. Even tags with moderate confidence (0.4+) should be included.

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

        // Generate reference JSON for the image
        let referenceJSON;
        try {
          const referenceResult = await generateObject({
            model: selectedModel.provider,
            schema: ReferenceImageSchema,
            temperature: 0.2,
            messages: [
              {
                role: "system",
                content:
`Extract a simplified "Reference Image JSON" from the image. Return ONLY valid JSON.
CRITICAL: Use exactly this structure. Every field shown is required. Use defaults for optional fields.`
              },
              {
                role: "user",
                content: [
                  {
                    type: "text",
                    text:
`Analyze the image and return JSON with this EXACT structure:

{
  "meta": {
    "version": "refimg.v1",
    "aspect_ratio": "${closestRatio.name}",
    "confidence": 0.8
  },
  "variables": {
    "text_variables": {},
    "color_variables": {},
    "font_variables": {}
  },
  "scene": {
    "background": {
      "type": "solid"
    },
    "lighting": {
      "key": "natural light"
    },
    "camera": {
      "angle": "front view"
    },
    "composition": {}
  },
  "subjects": [],
  "overlays": {
    "text_blocks": []
  },
  "constraints": {
    "strict_layout_match": true,
    "do_not_add": [],
    "must_match": []
  },
  "export": {
    "aspect_ratio": "${closestRatio.name}",
    "format": "PNG"
  },
  "variability": {
    "allowed_jitter_pct": 5,
    "augmentations": "none"
  },
  "negatives": [],
  "scene_variations": [
    {
      "slot": "1 - Clarity Shot",
      "aspect_ratio": "${closestRatio.name}",
      "scene_name": "clarity_shot",
      "product_reference": "The product must visually match the uploaded reference image in shape, design, and color. Do not copy the same angle, crop, or composition of the reference. Follow scene, angle, and composition instructions strictly for variation.",
      "scene": "clean neutral background, seamless white surface",
      "angle": "front-facing, centered perspective",
      "lighting": "bright studio lighting with soft shadows",
      "photo_quality": "Always photorealistic and sharp, resembling a professional e-commerce or lifestyle photo.",
      "additional_elements": "None visible",
      "composition_notes": "Product perfectly centered, negative space evenly distributed"
    }
  ]
}

Fill in the fields based on what you see in the image:
- For background.type: choose from "solid", "gradient", "texture", "studio", "environment"
- For subjects: add objects you see with name, type ("product", "person", etc), description, position with anchor ("center", "top-left", etc) and bbox_norm as [x,y,width,height] with values 0-1
- For text_blocks: add any text with key, position, and anchor
- For scene_variations: generate 5 scene variations for AI image generation based on the product:
  1. "Clarity Shot" - clean neutral background
  2. "Lifestyle Context" - modern environment with decor
  3. "In-Use Demonstration" - hands interacting with product
  4. "Feature Showcase" - macro close-up of key feature
  5. "Scale Comparison" - with familiar objects for size reference

Return ONLY the JSON structure above, filled with your analysis.`
                  },
                  { type: "image", image: compressedBuffer, mediaType: "image/webp" }
                ]
              }
            ],
            maxRetries: 2,
            mode: "json"
          });

          referenceJSON = referenceResult.object;
          const refCost = calculateAICost(referenceResult.usage, selectedModel.name);
          logger.info(`Reference JSON generated (${selectedModel.name}):`, {
            url: imageUrl,
            referenceJSON: referenceJSON,
            usage: referenceResult.usage,
            cost: `$${refCost.toFixed(10)}`,
          });
        } catch (refError) {
          logger.warn(`Reference JSON generation failed (attempt 1), trying text mode fallback for ${imageUrl}:`, {
            refError: {
              name: refError instanceof Error ? refError.name : 'Unknown',
              message: refError instanceof Error ? refError.message : 'Unknown error'
            }
          });

          // Direct fallback without more AI attempts to avoid infinite loops
          logger.info(`Using hardcoded fallback reference JSON for ${imageUrl}`);

          // Create minimal fallback reference JSON to avoid null values
          referenceJSON = {
            meta: {
              version: "refimg.v1" as const,
              aspect_ratio: closestRatio.name,
              confidence: 0.5
            },
            variables: {
              text_variables: {},
              color_variables: {},
              font_variables: {}
            },
            scene: {
              background: { type: "solid" },
              lighting: { key: "natural" },
              camera: { angle: "front" }
            },
            subjects: [],
            export: {
              aspect_ratio: closestRatio.name,
              format: "PNG"
            },
            negatives: [],
            scene_variations: [
              {
                slot: "1 - Clarity Shot",
                aspect_ratio: closestRatio.name,
                scene_name: "clarity_shot",
                product_reference: "The product must visually match the uploaded reference image in shape, design, and color. Do not copy the same angle, crop, or composition of the reference. Follow scene, angle, and composition instructions strictly for variation.",
                scene: "clean neutral background, seamless white surface",
                angle: "front-facing, centered perspective",
                lighting: "bright studio lighting with soft shadows",
                photo_quality: "Always photorealistic and sharp, resembling a professional e-commerce or lifestyle photo.",
                additional_elements: "None visible",
                composition_notes: "Product perfectly centered, negative space evenly distributed"
              }
            ]
          };
        }

        // Insert image record in database
        const insertResult = await db
          .insertInto("images")
          .values({
            blur_data: blurData,
            aspect_ratio: closestRatio.name,
            description: aiResult.object.description || null,
            reference_json: referenceJSON ? JSON.stringify(referenceJSON) : null,
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
