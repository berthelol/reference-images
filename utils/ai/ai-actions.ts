"use server";

import { generateObject } from "ai";
import { z } from "zod";
import { openai } from "@ai-sdk/openai";
import { google } from "@ai-sdk/google";

// Reference Image Schema
const ReferenceImageSchema = z.object({
  meta: z.object({
    version: z.literal("refimg.v1"),
    source: z.string().nullish().describe("like 'uploaded' or 'url'"),
    aspect_ratio: z.string().describe("e.g. '1:1', '4:5', '9:16'"),
    detected_resolution: z.string().nullish().describe("like '3000x4000' if inferable"),
    confidence: z.number().min(0).max(1)
  }),
  variables: z.object({
    text_variables: z.record(z.string(), z.object({
      content: z.string().describe("The actual text content"),
      color: z.string().describe("Text color in HEX format like '#000000'"),
      font: z.string().describe("Font family name like 'Arial', 'Helvetica', 'sans-serif'"),
      size: z.number().describe("Font size in points"),
      weight: z.string().describe("Font weight like 'normal', 'bold', '400', '700'"),
      case: z.string().describe("Text case like 'normal', 'upper', 'lower', 'title'"),
      notes: z.string().nullish().describe("Additional notes about the text element")
    })).describe("Keyed text variables like HEADLINE, SUBHEAD, CTA, BADGE_TEXT").default({}),
    color_variables: z.record(z.string(), z.string())
      .describe("Color palette map. Example: BRAND_PRIMARY:'#1A2A6A', BACKGROUND:'#FFFFFF'").default({}),
    icon_variables: z.record(z.string(), z.string()).nullish()
      .describe("Icon identifiers. Example: CHECKMARK:'check-circle', STAR:'star-filled'"),
  }),
  scene: z.object({
    background: z.object({
      type: z.string().describe("like 'solid', 'gradient', 'texture', 'studio', 'environment'"),
      colorVar: z.string().nullish(),
      colorVar2: z.string().nullish(),
      description: z.string().nullish()
    }),
    lighting: z.object({
      key: z.string(),
      shadows: z.string().nullish(),
      effects: z.array(z.string()).nullish()
    }),
    camera: z.object({
      angle: z.string(),
      focal_length: z.string().nullish(),
      depth_of_field: z.string().nullish(),
      framing: z.string().nullish()
    }),
    composition: z.object({
      grid: z.string().nullish(),
      safe_area: z.array(z.number()).length(4).nullish()
        .describe("[x,y,w,h] normalized 0–1"),
      z_order: z.array(z.string()).nullish()
    }).nullish()
  }),
  subjects: z.array(z.object({
    name: z.string(),
    type: z.string().describe("like 'product', 'product_group', 'person', 'hand_with_product', 'graphic', 'other'"),
    description: z.string(),
    pose: z.string().nullish(),
    materials: z.array(z.string()).nullish(),
    position: z.object({
      anchor: z.string().describe("like 'center', 'top-left', 'top-right', 'bottom-left', 'bottom-right', 'left', 'right', 'top', 'bottom', 'custom'"),
      bbox_norm: z.array(z.number()).length(4)
        .describe("[x,y,w,h] normalized 0–1")
    }),
    scale: z.string().nullish(),
    rotation_deg: z.number().nullish(),
    shadow: z.string().nullish(),
    mask_shape: z.string().nullish()
  })).default([]),
  elements: z.object({
    text_elements: z.array(z.object({
      id: z.string().describe("References key in variables.text_variables like 'HEADLINE', 'SUBHEAD'"),
      position: z.object({
        anchor: z.string().describe("like 'center', 'top-left', 'top-right', 'bottom-left', 'bottom-right'"),
        bbox_norm: z.array(z.number()).length(4).describe("[x, y, width, height] normalized 0-1"),
        z_index: z.number().nullish().describe("Layer order, higher = on top")
      }),
      alignment: z.string().nullish().describe("like 'left', 'center', 'right', 'justify'"),
      line_height: z.number().nullish().describe("Line height multiplier like 1.2, 1.5"),
      letter_spacing: z.number().nullish().describe("Letter spacing in pixels"),
      max_width: z.number().nullish().describe("Maximum width in pixels or percentage"),
      rotation: z.number().nullish().describe("Rotation in degrees"),
      effects: z.array(z.string()).nullish().describe("Effects like 'shadow', 'outline', 'glow'")
    })).default([]),
    graphic_elements: z.array(z.object({
      name: z.string().describe("Identifier like 'badge', 'divider', 'frame', 'decoration'"),
      type: z.string().describe("like 'shape', 'icon', 'badge', 'line', 'frame', 'pattern'"),
      position: z.object({
        anchor: z.string(),
        bbox_norm: z.array(z.number()).length(4).describe("[x, y, width, height] normalized 0-1"),
        z_index: z.number().nullish()
      }),
      style: z.object({
        fill_color: z.string().nullish().describe("Fill color HEX or reference to color_variables"),
        stroke_color: z.string().nullish().describe("Stroke color HEX"),
        stroke_width: z.number().nullish().describe("Stroke width in pixels"),
        opacity: z.number().nullish().describe("Opacity 0-1"),
        border_radius: z.number().nullish().describe("Border radius in pixels")
      }).nullish(),
      rotation: z.number().nullish().describe("Rotation in degrees"),
      effects: z.array(z.string()).nullish().describe("Effects like 'shadow', 'blur', 'gradient'")
    })).nullish(),
    product_elements: z.array(z.object({
      name: z.string().describe("Identifier like 'main_product', 'product_2'"),
      type: z.string().describe("like 'product', 'product_group', 'package'"),
      description: z.string().describe("Brief description of the product"),
      position: z.object({
        anchor: z.string(),
        bbox_norm: z.array(z.number()).length(4).describe("[x, y, width, height] normalized 0-1"),
        z_index: z.number().nullish()
      }),
      rotation: z.number().nullish(),
      scale: z.string().nullish().describe("Relative size like 'large', 'medium', 'small'"),
      shadow: z.string().nullish().describe("Shadow style like 'drop', 'cast', 'none'"),
      effects: z.array(z.string()).nullish()
    })).nullish()
  }).nullish(),
  constraints: z.object({
    strict_layout_match: z.boolean().default(true),
    do_not_add: z.array(z.string()).default([]),
    must_match: z.array(z.string()).default([])
  }).nullish(),
  export: z.object({
    aspect_ratio: z.string(),
    target_resolution: z.string().nullish(),
    transparent_background: z.boolean().nullish()
  }).nullish(),
  variability: z.object({
    allowed_jitter_pct: z.number().min(0).max(50).default(5),
    random_seed: z.number().nullish(),
    augmentations: z.string().default("none").describe("like 'none', 'minor', 'moderate'")
  }).nullish(),
  negatives: z.array(z.string()).default([]),
  description: z.string().nullish().describe("Optional description field")
});

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

interface TagContext {
  id: string;
  title: string;
  isMandatory: boolean;
  tags: { id: string; title: string }[];
}

interface GenerateImageTagsParams {
  imageBuffer: Buffer;
  tagContext: TagContext[];
  mandatoryCategories: string[];
  model?: "openai" | "gemini";
  maxRetries?: number;
}

interface GenerateReferenceJSONParams {
  imageBuffer: Buffer;
  aspectRatio: string;
  model?: "openai" | "gemini";
  maxRetries?: number;
}

/**
 * Generate tags and description for an image using AI
 */
export async function generateImageTags({
  imageBuffer,
  tagContext,
  mandatoryCategories,
  model = "openai",
  maxRetries = 2,
}: GenerateImageTagsParams) {
  const selectedModel = modelConfig[model];

  const result = await generateObject({
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
            image: imageBuffer,
            mediaType: "image/webp",
          },
        ],
      },
    ],
    maxRetries,
  });

  return result;
}

/**
 * Generate reference JSON structure for an image using AI
 */
export async function generateReferenceJSON({
  imageBuffer,
  aspectRatio,
  model = "openai",
  maxRetries = 2,
}: GenerateReferenceJSONParams) {
  const selectedModel = modelConfig[model];

  const result = await generateObject({
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
`
Analyze the image and create a structured JSON representation of the ad/image.

INSTRUCTIONS:

1. IDENTIFY ALL ELEMENTS:
   - Extract ALL visible text and categorize as HEADLINE, SUBHEAD, CTA, BODY_TEXT, BADGE_TEXT, etc.
   - Identify all graphic elements (shapes, icons, badges, frames, decorations)
   - Identify all products/objects in the scene

2. DESCRIBE THE SCENE:
   - Background type and colors
   - Lighting conditions and direction
   - Camera angle and perspective
   - Overall composition and layout grid

3. EXTRACT VARIABLES:
   - text_variables: For EACH text element, extract content, color (HEX), font family, size, weight, and case
   - color_variables: Extract the color palette (BRAND_PRIMARY, BACKGROUND, ACCENT, etc.)
   - icon_variables: Identify any icons used

4. POSITION ALL ELEMENTS:
   - For each text element, provide its position using anchor + bbox_norm [x, y, width, height] (0-1 normalized)
   - For each graphic element, provide position, colors, and styling
   - For each product, provide position, scale, and effects

EXAMPLE OUTPUT STRUCTURE:

{
  "meta": {
    "version": "refimg.v1",
    "aspect_ratio": "${aspectRatio}",
    "confidence": 0.9
  },
  "variables": {
    "text_variables": {
      "HEADLINE": {
        "content": "The actual headline text",
        "color": "#000000",
        "font": "Arial",
        "size": 32,
        "weight": "bold",
        "case": "normal",
        "notes": "Main attention-grabbing text"
      },
      "SUBHEAD": {
        "content": "Supporting text content",
        "color": "#333333",
        "font": "Arial",
        "size": 18,
        "weight": "normal",
        "case": "upper",
        "notes": "Secondary message"
      }
    },
    "color_variables": {
      "BRAND_PRIMARY": "#FF5722",
      "BACKGROUND": "#FFFFFF",
      "TEXT_DARK": "#000000"
    },
    "icon_variables": {
      "CHECKMARK": "check-circle"
    }
  },
  "scene": {
    "background": {
      "type": "solid",
      "colorVar": "BACKGROUND",
      "description": "Clean white background"
    },
    "lighting": {
      "key": "soft studio lighting from top",
      "shadows": "subtle drop shadows"
    },
    "camera": {
      "angle": "front view centered",
      "depth_of_field": "shallow"
    },
    "composition": {
      "grid": "center-weighted",
      "safe_area": [0.1, 0.1, 0.8, 0.8]
    }
  },
  "subjects": [],
  "elements": {
    "text_elements": [
      {
        "id": "HEADLINE",
        "position": {
          "anchor": "top-center",
          "bbox_norm": [0.1, 0.05, 0.8, 0.15],
          "z_index": 10
        },
        "alignment": "center",
        "line_height": 1.2,
        "effects": ["shadow"]
      }
    ],
    "graphic_elements": [
      {
        "name": "badge",
        "type": "badge",
        "position": {
          "anchor": "top-left",
          "bbox_norm": [0.02, 0.02, 0.15, 0.1],
          "z_index": 20
        },
        "style": {
          "fill_color": "BRAND_PRIMARY",
          "border_radius": 8
        }
      }
    ],
    "product_elements": [
      {
        "name": "main_product",
        "type": "product",
        "description": "Product package centered",
        "position": {
          "anchor": "center",
          "bbox_norm": [0.3, 0.3, 0.4, 0.6],
          "z_index": 5
        },
        "scale": "large",
        "shadow": "drop"
      }
    ]
  },
  "constraints": {
    "strict_layout_match": true,
    "do_not_add": [],
    "must_match": ["text positions", "product placement"]
  },
  "export": {
    "aspect_ratio": "${aspectRatio}"
  },
  "variability": {
    "allowed_jitter_pct": 5,
    "augmentations": "none"
  },
  "negatives": [],
  "description": null
}

Return ONLY valid JSON matching this structure. Be thorough and extract ALL visible elements.`,
          },
          { type: "image", image: imageBuffer, mediaType: "image/webp" },
        ],
      },
    ],
    maxRetries,
    mode: "json",
  });

  return result;
}

/**
 * Generate ad prompt and filled JSON from product image and reference template
 */
export async function generateAdPromptAndJSON({
  productImageBuffer,
  referenceImageBuffer,
  referenceJSON,
}: {
  productImageBuffer: Buffer;
  referenceImageBuffer: Buffer;
  referenceJSON: any;
}) {
  const result = await generateObject({
    model: openai("gpt-4o"),
    schema: z.object({
      prompt: z.string().describe("Complete prompt for Nano Banana image generation including all details about composition, lighting, style, and positioning"),
      filled_json: z.any().describe("The reference JSON with all variables filled based on the product image")
    }),
    schemaName: "AdPromptAndJSON",
    schemaDescription: "Generate a detailed prompt and filled template JSON for ad generation",
    temperature: 0.3,
    mode: "json",
    messages: [
      {
        role: "system",
        content: `You are an expert ad creative director. Your task is to:
1. Analyze the product image
2. Use the reference template JSON to create a new ad composition
3. Fill all text variables, colors, and elements based on the product
4. Generate a detailed prompt for AI image generation that recreates the reference ad layout with the new product

Be specific about positioning, colors, typography, and composition. The goal is to maintain the exact layout and style of the reference while featuring the new product.`
      },
      {
        role: "user",
        content: [
          {
            type: "text",
            text: `Create an ad for this product using the reference template.

REFERENCE TEMPLATE JSON:
${JSON.stringify(referenceJSON, null, 2)}

INSTRUCTIONS:
1. Analyze the product image and extract:
   - Product name, tagline, key features
   - Brand colors from the product packaging
   - Product type and category

2. Fill the template JSON:
   - Update all text_variables with product-specific copy
   - Extract and use brand colors in color_variables
   - Maintain the exact same layout and element positions
   - Update product_elements to describe the new product

3. Generate a detailed prompt that:
   - Describes the exact layout from the reference
   - Specifies all text positions and content
   - Details the product positioning and lighting
   - Includes brand colors and styling
   - Maintains the reference's composition and aesthetic

Return both the filled JSON and the generation prompt.`
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
    maxRetries: 2
  });

  return result;
}
