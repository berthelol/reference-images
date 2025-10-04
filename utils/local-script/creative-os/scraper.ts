import https from 'https';
import fs from 'fs';
import path from 'path';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const API_URL = 'https://api.creativeos.com/filterAdFeed';
const IMAGES_DIR = path.join(__dirname, 'images');
const DATA_FILE = path.join(__dirname, 'data.json');
const SAVE_INTERVAL = 100; // Save every 100 ads
const DELAY_MIN = 2000;
const DELAY_MAX = 9000;

const START_FROM_CURSOR = 1;

// Proxy configuration
const proxyAgent = new HttpsProxyAgent("http://gjbpjzat-rotate:ba6ic9z3obeu@p.webshare.io:80");

// Headers from the curl request
const headers = {
  'accept': '*/*',
  'accept-language': 'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7',
  'baggage': 'sentry-environment=production,sentry-release=aad46a123fa9822abd70188a5b7b67727366f0ec,sentry-public_key=76b8f4994a4cf36b4ce3b5edc8797646,sentry-trace_id=b33c8902f20b425d817d0f00a9ad4dc9,sentry-org_id=4506757010227200,sentry-sampled=false,sentry-sample_rand=0.5622057208248704,sentry-sample_rate=0.1',
  'origin': 'https://app.creativeos.com',
  'priority': 'u=1, i',
  'referer': 'https://app.creativeos.com/',
  'sec-ch-ua': '"Not;A=Brand";v="99", "Google Chrome";v="139", "Chromium";v="139"',
  'sec-ch-ua-mobile': '?0',
  'sec-ch-ua-platform': '"macOS"',
  'sec-fetch-dest': 'empty',
  'sec-fetch-mode': 'cors',
  'sec-fetch-site': 'same-site',
  'sentry-trace': 'b33c8902f20b425d817d0f00a9ad4dc9-a786f7a946d2b24a-0',
  'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36',
  'x-request-id': '62a9c9d5-e4b9-484c-bde7-c433afa3fbbf',
  'Cookie': '_vwo_uuid_v2=D79754EADF0B3EB293B34826E1A1A0E06|d9b511c2df59d88b059de28abdb0055a; _fbp=fb.1.1757798393604.597636140179422436; _ga=GA1.1.1520098963.1757798394; intercom-id-g1iicjib=4a7ae92e-a3f4-4c0d-b7be-1163c58b03d4; intercom-device-id-g1iicjib=0a28f068-ab10-408b-9102-f1a369f5096f; _gcl_au=1.1.1095347318.1757798402.810317977.1757956642.1757956647; accessToken=eyJhbGciOiJSUzI1NiIsImtpZCI6InNzb19vaWRjX2tleV9wYWlyXzAxSjU2WTlLOFk3QzJZRzg0MVpUUEU0RDhYIn0.eyJpc3MiOiJodHRwczovL2FwaS53b3Jrb3MuY29tIiwic3ViIjoidXNlcl8wMUpQQjU5NllLMjJLRVFXREhSMlI1OU1YVCIsInNpZCI6InNlc3Npb25fMDFLNTc2M0FSR0pDTVM5Ukc3WktGTTAyRTUiLCJqdGkiOiIwMUs1NzYzQVRONEJQS1AwTUVWMDM4UUZQRiIsImV4cCI6MTc1Nzk2MDI0NywiaWF0IjoxNzU3OTU2NjQ3fQ.qNJbB15SWoGj4SAbLOzZsb2vQe5J7tPWEbjyZIStMakb-mSPwPC2pFKqt8zuTB9QjS5z9Guy0PsxocBEPXPXDHI5p05FCGLPikZgN3oi1wexU11C9aeShFDnb3b4QadEpjdeyc9b-fahlV0sIqeEa8_9y-jKZ1MObDFSwJySmLtzsKkKN8GV3ckrVAvQKuioVWCce7o7zzW6iETLk8LrsYVzKl4kLnCETglCK9JaKBLccGy7sI_fFB65LnLaVePk64veEpxNizprDtAMa9EjtHKrcQX-Hf3DXItfrfElRbNad-JWQWEBcAWyQ_6aawHCo3b60l_obxU6J5dWaHuK7w; refreshToken=CgtULYhoJ460C4kwjj2sAvqZR; intercom-session-g1iicjib=L2ZsdllYdzNWR3hFNkNKZUkvRjM5M21CNWRNVW9Pa3A0MU1UQ2lKTnBsc0EyT2NhZTBqZEhmZDVDRytkT1JmbUJFLzcxNnRwQWpUdlZWa2VpbVJiWUE0ZUNKcjBMTW0xODVWQi91SUxPZzA9LS1OTEpsajZSMi9tQktmRmhwS0JKUU9nPT0=--ecc85d9100cb0e9668909414f1bb9f9b9c078f67; AMP_22f4c6e97a=JTdCJTIyZGV2aWNlSWQlMjIlM0ElMjI2YTcxOGQ2My01MDdiLTRlMzctYmVkNC1jYmUxNGU1ZGIxM2QlMjIlMkMlMjJzZXNzaW9uSWQlMjIlM0ExNzU3OTU2NjQwNTE3JTJDJTIyb3B0T3V0JTIyJTNBZmFsc2UlMkMlMjJsYXN0RXZlbnRUaW1lJTIyJTNBMTc1Nzk1Njg0MzkwNCUyQyUyMmxhc3RFdmVudElkJTIyJTNBMzUlMkMlMjJwYWdlQ291bnRlciUyMiUzQTklN0Q=; _ga_EMRVQ5WXTP=GS2.1.s1757955256$o4$g1$t1757956916$j31$l0$h0; ph_phc_jdC1HSS9mbWrn0E4P5VH8Va5KPTOzlujmr2LbdpzUSs_posthog=%7B%22distinct_id%22%3A%22user_01JPB596YK22KEQWDHR2R59MXT%22%2C%22%24sesid%22%3A%5B1757956955945%2C%2201994e61-8f01-706e-8bce-79f2c91abc90%22%2C1757956640513%5D%2C%22%24epp%22%3Atrue%2C%22%24initial_person_info%22%3A%7B%22r%22%3A%22https%3A%2F%2Fwww.creativeos.com%2F%22%2C%22u%22%3A%22https%3A%2F%2Fapp.creativeos.com%2Flogin%22%7D%7D; accessToken=eyJhbGciOiJSUzI1NiIsImtpZCI6InNzb19vaWRjX2tleV9wYWlyXzAxSjU2WTlLOFk3QzJZRzg0MVpUUEU0RDhYIn0.eyJpc3MiOiJodHRwczovL2FwaS53b3Jrb3MuY29tIiwic3ViIjoidXNlcl8wMUpQQjU5NllLMjJLRVFXREhSMlI1OU1YVCIsInNpZCI6InNlc3Npb25fMDFLNTc2M0FSR0pDTVM5Ukc3WktGTTAyRTUiLCJqdGkiOiIwMUs1RkNSVFE4U1JDNkdXQlMyRE1NMFlZVyIsImV4cCI6MTc1ODIzNTY3OSwiaWF0IjoxNzU4MjMyMDc5fQ.cQRC5Ik678mIEDEU-AuadqqRNswuUVKyl3891j1lK8bIG_Vtva0egcBLUfAj3AKmRBL8QDKrYvo2IzHoJhLnlDYvrbjhGxWTGoXUWQ300WUrSxGERX5Gcg1UYbSAXrOHU-LkVvsfxBnrRZFi7mr44S2kpNZiSYvBIJ5JWS6YBwbM6jJMkk02XhEpJqkLWI4t4qaFnhhYaqOAezRJSkCRcVBOF6Vrikg-mxjEfgRHuuRt_0gMiOwW88Wi1B9OMs1DbmOzlQven8_tqeAR6Bv2rV_Ibngte_PnnwrySagCWzj5d3ULXAkrslDNTMRaLeRqcv7NpTrEYMh5HmXWlOU1pA; refreshToken=CgtULYhoJ460C4kwjj2sAvqZR'
};

// Types
interface Ad {
  id: number;
  imageUrl: string;
  videoUrl: string | null;
  imageHeight: number;
  imageWidth: number;
  brandId: string;
  brandName: string;
  brandImage: string;
  earliestView: string;
  latestLaunch: string;
  isActiveSinceLastScrape: boolean;
  adRunningDays: number;
  inactiveTime: number;
  reach: number | null;
  priority: number;
  performanceRating: number;
  scrapedAt: string;
  language: string;
  partitionId: number;
  hasUserSeenAd: boolean;
  isSaved: boolean;
  ctaText: string | null;
  requestCount: number;
}

interface AdData {
  imageUrl: string;
  imageWidth: number;
  imageHeight: number;
  latestLaunch: string;
  earliestView: string;
  adRunningDays: number;
  inactiveTime: number;
  performanceRating: number;
  scrapedAt: string;
  language: string;
  ctaText: string | null;
  requestCount: number;
  brandId: string;
}

interface ApiResponse {
  result: {
    data: {
      nextCursor: number | null;
      ads: Ad[];
    };
  };
}

interface AdsDataMap {
  [key: string]: AdData;
}

// Global state
let allAdsData: AdsDataMap = {};
let totalProcessedAds: number = 0;

// Utility functions
function randomDelay(): number {
  return Math.floor(Math.random() * (DELAY_MAX - DELAY_MIN + 1)) + DELAY_MIN; // 2-9 seconds
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function sanitizeFilename(filename: string): string {
  return filename.replace(/[^a-z0-9]/gi, '_').toLowerCase();
}

function getImageExtension(url: string): string {
  const urlPath = new URL(url).pathname;
  const ext = path.extname(urlPath);
  return ext || '.jpg'; // Default to .jpg if no extension found
}

// Load existing data if file exists
function loadExistingData(): void {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const data = fs.readFileSync(DATA_FILE, 'utf8');
      allAdsData = JSON.parse(data) as AdsDataMap;
      console.log(`📂 Loaded existing data with ${Object.keys(allAdsData).length} ads`);
    }
  } catch (error) {
    console.error('❌ Error loading existing data:', (error as Error).message);
    allAdsData = {};
  }
}

// Save data to JSON file
function saveDataToFile(): void {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(allAdsData, null, 2));
    console.log(`💾 Saved ${Object.keys(allAdsData).length} ads to data.json`);
  } catch (error) {
    console.error('❌ Error saving data:', (error as Error).message);
  }
}

// Download image from URL
function downloadImage(imageUrl: string, filename: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const filePath = path.join(IMAGES_DIR, filename);

    // Skip if file already exists
    if (fs.existsSync(filePath)) {
      console.log(`⏭️  Image already exists: ${filename}`);
      resolve();
      return;
    }

    const file = fs.createWriteStream(filePath);

    const request = https.get(imageUrl, { agent: proxyAgent }, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download image: ${response.statusCode}`));
        return;
      }

      response.pipe(file);

      file.on('finish', () => {
        file.close();
        resolve();
      });

      file.on('error', (err) => {
        fs.unlink(filePath, () => {}); // Delete the file on error
        reject(err);
      });
    });

    request.on('error', (err) => {
      reject(err);
    });

    request.setTimeout(30000, () => {
      request.destroy();
      reject(new Error('Download timeout'));
    });
  });
}

// Make API request to get ads data
function fetchAdsData(cursor: number): Promise<ApiResponse> {
  return new Promise((resolve, reject) => {
    const inputData = {
      formats: ["image"],
      cursor: cursor,
      direction: "forward"
    };

    const queryParams = `input=${encodeURIComponent(JSON.stringify(inputData))}`;
    const url = `${API_URL}?${queryParams}`;

    const options = {
      method: 'GET',
      headers: headers,
      agent: proxyAgent,
      timeout: 30000
    };

    const request = https.get(url, options, (response) => {
      let data = '';

      response.on('data', (chunk) => {
        data += chunk;
      });

      response.on('end', () => {
        try {
          const jsonData = JSON.parse(data) as ApiResponse;
          resolve(jsonData);
        } catch (error) {
          reject(new Error(`Failed to parse JSON: ${(error as Error).message}`));
        }
      });
    });

    request.on('error', (error) => {
      reject(error);
    });

    request.setTimeout(30000, () => {
      request.destroy();
      reject(new Error('Request timeout'));
    });
  });
}

// Extract relevant ad data
function extractAdData(ad: Ad): AdData {
  return {
    imageUrl: ad.imageUrl,
    imageWidth: ad.imageWidth,
    imageHeight: ad.imageHeight,
    latestLaunch: ad.latestLaunch,
    earliestView: ad.earliestView,
    adRunningDays: ad.adRunningDays,
    inactiveTime: ad.inactiveTime,
    performanceRating: ad.performanceRating,
    scrapedAt: ad.scrapedAt,
    language: ad.language,
    ctaText: ad.ctaText,
    requestCount: ad.requestCount,
    brandId: ad.brandId
  };
}

// Process a single ad
async function processAd(ad: Ad): Promise<void> {
  try {
    const adId = ad.id.toString();

    // Skip if we already have this ad
    if (allAdsData[adId]) {
      console.log(`⏭️  Ad ${adId} already processed`);
      return;
    }

    console.log(`🔄 Processing ad ${adId}: ${ad.brandName}. ${ad.imageUrl}`);

    // Generate filename for image
    const extension = getImageExtension(ad.imageUrl);
    const filename = `${adId}_${sanitizeFilename(ad.brandName)}${extension}`;

    // Download image
    await downloadImage(ad.imageUrl, filename);

    // Store ad data
    allAdsData[adId] = extractAdData(ad);
    totalProcessedAds++;

    console.log(`✅ Processed ad ${adId}, ${ad.imageUrl} (Total: ${totalProcessedAds})`);

  } catch (error) {
    console.error(`❌ Error processing ad ${ad.id}:`, (error as Error).message);
  }
}

// Main scraping function
async function scrapeAds(): Promise<void> {
  console.log('🚀 Starting CreativeOS scraper...');

  // Ensure images directory exists
  if (!fs.existsSync(IMAGES_DIR)) {
    fs.mkdirSync(IMAGES_DIR, { recursive: true });
  }

  // Load existing data
  loadExistingData();

  let cursor = START_FROM_CURSOR;
  let hasMore = true;

  try {
    while (hasMore) {
      console.log(`\n📡 Fetching cursor ${cursor}...`);

      // Fetch ads data
      const response = await fetchAdsData(cursor);

      if (!response.result || !response.result.data || !response.result.data.ads) {
        console.log('❌ Invalid response structure');
        break;
      }

      const { nextCursor, ads } = response.result.data;

      if (!ads || ads.length === 0) {
        console.log('✅ No more ads found. Scraping complete!');
        hasMore = false;
        break;
      }

      console.log(`📦 Found ${ads.length} ads`);

      // Process each ad
      for (const ad of ads) {
        await processAd(ad);

        // Random delay between processing ads
        const delay = randomDelay();
        await sleep(delay);
      }

      // Save data every SAVE_INTERVAL ads
      if (totalProcessedAds % SAVE_INTERVAL === 0) {
        saveDataToFile();
      }

      // Check if we have a next cursor
      if (!nextCursor) {
        console.log('✅ No more pages available. Scraping complete!');
        hasMore = false;
      } else {
        cursor = nextCursor;
        console.log(`➡️  Moving to next cursor: ${cursor}`);
      }

      // Delay between API calls
      const apiDelay = randomDelay();
      console.log(`⏳ API delay: ${apiDelay}ms...`);
      await sleep(apiDelay);
    }

  } catch (error) {
    console.error(`❌ Fatal error at cursor ${cursor}:`, (error as Error).message);
    console.log(`🔄 You can restart from cursor ${cursor}`);
  } finally {
    // Final save
    saveDataToFile();
    console.log(`\n🎉 Scraping finished! Total ads processed: ${totalProcessedAds}`);
    console.log(`📁 Images saved to: ${IMAGES_DIR}`);
    console.log(`📄 Data saved to: ${DATA_FILE}`);
  }
}

// Handle process termination gracefully
process.on('SIGINT', () => {
  console.log('\n⚠️  Received SIGINT. Saving data before exit...');
  saveDataToFile();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n⚠️  Received SIGTERM. Saving data before exit...');
  saveDataToFile();
  process.exit(0);
});

// Start scraping
if (import.meta.url === `file://${process.argv[1]}`) {
  scrapeAds().catch(console.error);
}