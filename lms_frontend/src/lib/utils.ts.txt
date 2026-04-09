import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { richTextToPreviewText } from './rich-text';

/**
 * Utility function to merge Tailwind CSS classes with clsx
 * This is the standard utility function used by ShadCN UI components
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Remove HTML tags from a string
 */
export function stripHtml(html: string): string {
  return richTextToPreviewText(html);
}
