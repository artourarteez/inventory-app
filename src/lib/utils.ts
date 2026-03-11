import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function displayUnit(item: { category?: string; stock_unit?: string; volume_per_can?: number | null }): string {
  if (item.category !== 'PAINT') {
    return item.stock_unit || '-';
  }
  const vol = item.volume_per_can;
  if (vol != null && vol > 5) return 'Pail';
  return 'Kaleng';
}

export type StockStatus = 'OUT_OF_STOCK' | 'LOW_STOCK' | 'IN_STOCK';

export function getStockStatus(item: { current_stock?: number }): StockStatus {
  const stock = item.current_stock || 0;
  if (stock === 0) return 'OUT_OF_STOCK';
  if (stock <= 3) return 'LOW_STOCK';
  return 'IN_STOCK';
}
