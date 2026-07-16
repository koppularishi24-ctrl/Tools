import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatNumber(n: number | string): string {
  const num = typeof n === 'string' ? parseFloat(n.replace(/,/g, '')) : n;
  if (isNaN(num as number) || num === null || num === undefined) return '0';
  return new Intl.NumberFormat().format(num as number);
}

/**
 * Strips markdown code blocks and attempts to extract a JSON object from a string.
 */
export function cleanJsonString(str: string): string {
  // Remove markdown code blocks if present
  let cleaned = str.replace(/```json\n?|```/g, "").trim();
  
  // Try to find the first '{' and the last '}' to extract a potential JSON object
  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');
  
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    cleaned = cleaned.substring(firstBrace, lastBrace + 1);
  }
  
  // Remove trailing commas before closing braces/brackets
  cleaned = cleaned.replace(/,\s*([\]}])/g, "$1");
  
  return cleaned;
}
