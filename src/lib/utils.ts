import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format a timestamp (in milliseconds) to '17 Jan 2026, 14:30' format
 * Uses 24-hour time format
 */
export function formatDateTime(timestamp: number): string {
  const date = new Date(timestamp);
  const day = date.getDate();
  const month = date.toLocaleString('en-GB', { month: 'short' });
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${day} ${month} ${year}, ${hours}:${minutes}`;
}

/**
 * Format a timestamp (in milliseconds) to '17 Jan 2026' format
 */
export function formatDate(timestamp: number): string {
  const date = new Date(timestamp);
  const day = date.getDate();
  const month = date.toLocaleString('en-GB', { month: 'short' });
  const year = date.getFullYear();
  return `${day} ${month} ${year}`;
}

/**
 * Format a Unix timestamp (in seconds) to '17 Jan 2026, 14:30:45' format
 * Uses 24-hour time format with seconds
 */
export function formatUnixTimestamp(timestamp: number): string {
  const date = new Date(timestamp * 1000);
  const day = date.getDate();
  const month = date.toLocaleString('en-GB', { month: 'short' });
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${day} ${month} ${year}, ${hours}:${minutes}:${seconds}`;
}
