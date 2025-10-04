#!/usr/bin/env node

import { existsSync } from 'fs';
import { mkdir, writeFile, readFile } from 'fs/promises';
import path from 'path';

interface ClipAssets {
  image: string;
  original?: string;
}

interface Clip {
  id: string;
  assets: ClipAssets;
  displayName?: string;
}

interface DataStructure {
  data: {
    total: number;
    clips: Clip[];
  };
}

async function downloadImage(url: string, filepath: string): Promise<void> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    await writeFile(filepath, buffer);
    console.log(`Downloaded: ${path.basename(filepath)}`);
  } catch (error) {
    console.error(`Failed to download ${url}:`, error);
  }
}

async function main() {
  const dataPath = path.join(__dirname, 'data.json');
  const imagesDir = path.join(__dirname, 'images');

  if (!existsSync(dataPath)) {
    console.error('data.json not found in the current directory');
    process.exit(1);
  }

  await mkdir(imagesDir, { recursive: true });

  console.log('Reading data.json...');
  const fileContent = await readFile(dataPath, 'utf-8');
  const data: DataStructure = JSON.parse(fileContent);

  const clips = data.data.clips;
  console.log(`Found ${clips.length} clips to process`);

  const downloadPromises: Promise<void>[] = [];

  for (const clip of clips) {
    if (clip.assets?.image) {
      const url = clip.assets.image;
      const urlObj = new URL(url);
      const filename = path.basename(urlObj.pathname);
      const filepath = path.join(imagesDir, filename);

      if (!existsSync(filepath)) {
        downloadPromises.push(downloadImage(url, filepath));
      } else {
        console.log(`Skipping existing file: ${filename}`);
      }
    }
  }

  console.log(`Starting download of ${downloadPromises.length} images...`);
  await Promise.all(downloadPromises);
  console.log('All downloads completed!');
}

main().catch(console.error);