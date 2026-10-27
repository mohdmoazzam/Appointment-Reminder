import { clsx, type ClassValue } from 'clsx';

/**
 * Joins class names, skipping falsy values: cn('btn', isActive && 'btn-active').
 *
 * Note: it does not resolve conflicting Tailwind classes, so a `className` passed to a UI
 * component should add layout (margin, width) rather than override its colours or padding.
 */
export function cn(...inputs: ClassValue[]): string {
  return clsx(inputs);
}
