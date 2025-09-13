// Standard aspect ratios with their names and values
export const STANDARD_ASPECT_RATIOS = [
  { name: "1:1", value: 1 },      // Square
  { name: "4:3", value: 4/3 },    // Traditional photo
  { name: "3:2", value: 3/2 },    // Classic 35mm
  { name: "16:9", value: 16/9 }, // Widescreen
  { name: "16:10", value: 16/10 }, // Computer screen
  { name: "21:9", value: 21/9 }, // Ultra-wide
  { name: "9:16", value: 9/16 }, // Vertical (mobile)
  { name: "3:4", value: 3/4 },    // Vertical photo
  { name: "2:3", value: 2/3 },    // Vertical 35mm
  { name: "5:4", value: 5/4 },    // Medium format
  { name: "4:5", value: 4/5 },    // Vertical medium format
] as const;

export type AspectRatioName = typeof STANDARD_ASPECT_RATIOS[number]["name"];

// Function to find the closest standard aspect ratio
export function findClosestAspectRatio(originalAspectRatio: number) {
  let closestRatio = STANDARD_ASPECT_RATIOS[0];
  let minDifference = Math.abs(originalAspectRatio - closestRatio.value);

  for (const ratio of STANDARD_ASPECT_RATIOS) {
    const difference = Math.abs(originalAspectRatio - ratio.value);
    if (difference < minDifference) {
      minDifference = difference;
      closestRatio = ratio as any;
    }
  }

  return closestRatio;
}

// Function to get aspect ratio value from name
export function getAspectRatioValue(name: AspectRatioName): number {
  const ratio = STANDARD_ASPECT_RATIOS.find(r => r.name === name);
  return ratio?.value || 1;
}