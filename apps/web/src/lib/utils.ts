import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * ローカルタイムゾーン基準の日付を YYYY-MM-DD 形式で返す。
 *
 * `new Date().toISOString()` は UTC 基準のため、JST など UTC より進んだ
 * タイムゾーンでは深夜〜早朝に前日の日付になってしまう。家計簿の発生日や
 * リマインダーの対象日はローカル日付であるべきなので、この関数を使う。
 *
 * @param date - 対象の日付（省略時は現在）
 * @returns YYYY-MM-DD 形式のローカル日付
 */
export function formatLocalDate(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
