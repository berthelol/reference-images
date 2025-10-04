import fs from 'fs';
import path from 'path';
import https from 'https';
import http from 'http';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface ImageData {
  imageUrl: string;
  imageWidth: number;
  imageHeight: number;
  brandId: string;
  latestLaunch: string;
  earliestView: string;
  adRunningDays: number;
  inactiveTime: number;
  performanceRating: number;
  scrapedAt: string;
  language: string;
  ctaText: string | null;
  requestCount: number;
}

const MIN_WIDTH = 500;

type DataRecord = Record<string, ImageData>;

async function downloadImage(url: string, filename: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https:') ? https : http;

    protocol.get(url, (response) => {
      if (response.statusCode === 200) {
        const fileStream = fs.createWriteStream(filename);
        response.pipe(fileStream);

        fileStream.on('finish', () => {
          fileStream.close();
          resolve();
        });

        fileStream.on('error', reject);
      } else {
        reject(new Error(`Failed to download image: ${response.statusCode}`));
      }
    }).on('error', reject);
  });
}

function getImageExtension(url: string): string {
  const urlWithoutQuery = url.split('?')[0];
  const extension = path.extname(urlWithoutQuery);
  return extension || '.jpg';
}

async function main() {
  try {
    // Read the JSON data
    const dataPath = path.join(__dirname, 'data.json');
    const jsonData = fs.readFileSync(dataPath, 'utf-8');
    const data: DataRecord = JSON.parse(jsonData);

    // Create images directory if it doesn't exist
    const imagesDir = path.join(__dirname, 'images');
    if (!fs.existsSync(imagesDir)) {
      fs.mkdirSync(imagesDir, { recursive: true });
    }

    // Filter and process data
    const entries = Object.entries(data);
    const validEntries = entries.filter(([_, imageData]) => imageData.imageWidth >= MIN_WIDTH);

    console.log(`Total entries: ${entries.length}`);
    console.log(`Valid entries (width >= ${MIN_WIDTH}): ${validEntries.length}`);

    let downloaded = 0;
    let errors = 0;

    for (let i = 0; i < validEntries.length; i++) {
      const [key, imageData] = validEntries[i];
      try {
        const extension = getImageExtension(imageData.imageUrl);
        const filename = `${imageData.brandId}___${key}${extension}`;
        const filepath = path.join(imagesDir, filename);

        // Skip if file already exists
        if (fs.existsSync(filepath)) {
          console.log(`Skipping ${filename} - already exists`);
          continue;
        }

        const progress = i + 1;
        const percentage = ((progress / validEntries.length) * 100).toFixed(1);
        console.log(`[${progress}/${validEntries.length}] (${percentage}%) Downloading ${filename}...`);
        await downloadImage(imageData.imageUrl, filepath);
        downloaded++;

        // Add a small delay to avoid overwhelming the server
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (error) {
        console.error(`Error downloading ${key}: ${error}`);
        errors++;
      }
    }

    // Create filtered JSON with only valid entries
    const filteredData: DataRecord = {};
    validEntries.forEach(([key, imageData]) => {
      filteredData[key] = imageData;
    });

    const newDataPath = path.join(__dirname, 'data_new.json');
    fs.writeFileSync(newDataPath, JSON.stringify(filteredData, null, 2));
    console.log(`\nFiltered data saved to data_new.json (${validEntries.length} entries)`);

    console.log(`\nDownload complete!`);
    console.log(`Successfully downloaded: ${downloaded}`);
    console.log(`Errors: ${errors}`);

  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

main();