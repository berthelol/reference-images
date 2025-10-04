"use server";

import sharp from "sharp";
import { getPlaiceholder } from "plaiceholder";
import { findClosestAspectRatio, calculateCropDimensions } from "@/utils/images/aspect-ratios";

// Function to check if a URL is a supported image format
export async function isSupportedImageFormat(url: string): Promise<boolean> {
  const urlLower = url.toLowerCase();
  return !urlLower.includes(".svg") && !urlLower.includes(".gif");
}

// Function to download an image from a URL
export async function downloadImage(url: string): Promise<Buffer> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download image: ${response.statusText}`);
  }
  return Buffer.from(await response.arrayBuffer());
}

// Function to process an image: crop, resize, and convert to WebP
export async function processImage(
  imageBuffer: Buffer,
  options: {
    targetWidth?: number;
    quality?: number;
  } = {}
): Promise<{
  compressedBuffer: Buffer;
  blurData: string;
  aspectRatio: string;
  originalAspectRatio: number;
  normalizedAspectRatio: number;
}> {
  const { targetWidth = 1200, quality = 100 } = options;

  // Get original image metadata
  const metadata = await sharp(imageBuffer).metadata();
  const originalWidth = metadata.width || 1;
  const originalHeight = metadata.height || 1;
  const originalAspectRatio = originalWidth / originalHeight;

  // Find the closest standard aspect ratio
  const closestRatio = findClosestAspectRatio(originalAspectRatio);
  const normalizedAspectRatio = closestRatio.value;

  // Calculate crop dimensions
  const cropDimensions = calculateCropDimensions(
    originalWidth,
    originalHeight,
    normalizedAspectRatio
  );

  // Compress, crop to normalized aspect ratio, and convert to WebP
  const compressedBuffer = await sharp(imageBuffer)
    .extract({
      left: cropDimensions.left,
      top: cropDimensions.top,
      width: cropDimensions.width,
      height: cropDimensions.height,
    })
    .resize(targetWidth, Math.round(targetWidth / normalizedAspectRatio), {
      fit: "inside",
      withoutEnlargement: true,
    })
    .webp({ quality })
    .toBuffer();

  // Generate blur data
  const plaiceholder = await getPlaiceholder(compressedBuffer, {
    size: 20,
  });

  return {
    compressedBuffer,
    blurData: plaiceholder.base64,
    aspectRatio: closestRatio.name,
    originalAspectRatio,
    normalizedAspectRatio,
  };
}