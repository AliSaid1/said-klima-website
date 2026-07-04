/**
 * Generic UI utility helpers shared across client and server components.
 */
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * Merge conditional class names into a single, conflict-free className string.
 *
 * Combines {@link clsx} (which resolves conditional/array/object class inputs)
 * with `tailwind-merge` (which de-duplicates conflicting Tailwind utilities so
 * the last-wins rule applies, e.g. `px-2 px-4` collapses to `px-4`). This is the
 * standard helper for composing `className` props throughout the app.
 *
 * @param inputs - Any mix of strings, arrays, or conditional objects accepted by clsx.
 * @returns A normalised, de-duplicated className string.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
