import React from "react";

// SVG components for aspect ratios
export const AspectRatioIcons = {
  "1:1": (
    <svg viewBox="0 0 16 16" className="w-4 h-4">
      <rect x="2" y="2" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1.5"/>
    </svg>
  ),
  "4:3": (
    <svg viewBox="0 0 16 16" className="w-4 h-4">
      <rect x="1" y="3" width="14" height="10" fill="none" stroke="currentColor" strokeWidth="1.5"/>
    </svg>
  ),
  "3:2": (
    <svg viewBox="0 0 16 16" className="w-4 h-4">
      <rect x="1" y="4" width="14" height="8" fill="none" stroke="currentColor" strokeWidth="1.5"/>
    </svg>
  ),
  "16:9": (
    <svg viewBox="0 0 16 16" className="w-4 h-4">
      <rect x="1" y="5" width="14" height="6" fill="none" stroke="currentColor" strokeWidth="1.5"/>
    </svg>
  ),
  "16:10": (
    <svg viewBox="0 0 16 16" className="w-4 h-4">
      <rect x="1" y="4.5" width="14" height="7" fill="none" stroke="currentColor" strokeWidth="1.5"/>
    </svg>
  ),
  "21:9": (
    <svg viewBox="0 0 16 16" className="w-4 h-4">
      <rect x="0.5" y="6" width="15" height="4" fill="none" stroke="currentColor" strokeWidth="1.5"/>
    </svg>
  ),
  "9:16": (
    <svg viewBox="0 0 16 16" className="w-4 h-4">
      <rect x="5" y="1" width="6" height="14" fill="none" stroke="currentColor" strokeWidth="1.5"/>
    </svg>
  ),
  "3:4": (
    <svg viewBox="0 0 16 16" className="w-4 h-4">
      <rect x="3" y="1" width="10" height="14" fill="none" stroke="currentColor" strokeWidth="1.5"/>
    </svg>
  ),
  "2:3": (
    <svg viewBox="0 0 16 16" className="w-4 h-4">
      <rect x="4" y="1" width="8" height="14" fill="none" stroke="currentColor" strokeWidth="1.5"/>
    </svg>
  ),
  "5:4": (
    <svg viewBox="0 0 16 16" className="w-4 h-4">
      <rect x="1.5" y="2.5" width="13" height="11" fill="none" stroke="currentColor" strokeWidth="1.5"/>
    </svg>
  ),
  "4:5": (
    <svg viewBox="0 0 16 16" className="w-4 h-4">
      <rect x="2.5" y="1.5" width="11" height="13" fill="none" stroke="currentColor" strokeWidth="1.5"/>
    </svg>
  ),
} as const;

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