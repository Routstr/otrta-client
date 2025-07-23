import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Extracts the model name from a full model path
 * @param modelPath - Full model path like "openai/o3-pro" or "anthropic/claude-3"
 * @returns The model name part (e.g., "o3-pro", "claude-3")
 */
export function extractModelName(modelPath: string): string {
  const parts = modelPath.split('/');
  return parts.length > 1 ? parts[parts.length - 1] : modelPath;
}
