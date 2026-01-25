import type { Doc, Id } from "./_generated/dataModel";

/**
 * Calculate available stock for a variant, considering secondary stock if configured.
 * 
 * @param variant - The variant to calculate available stock for
 * @param fetchSecondaryStock - Callback to fetch the secondary stock variant by ID
 * @returns The available stock quantity (minimum of own stock and secondary stock / factor)
 */
export async function getAvailableStock(
  variant: Doc<"variants">,
  fetchSecondaryStock: (id: Id<"variants">) => Promise<Doc<"variants"> | null>
): Promise<number> {
  let available = variant.quantity - variant.reserved;
  
  if (variant.secondaryStock) {
    const secondaryVariant = await fetchSecondaryStock(variant.secondaryStock);
    if (secondaryVariant) {
      const secondaryAvailable = secondaryVariant.quantity - secondaryVariant.reserved;
      const factor = variant.secondaryStockFactor ?? 1;
      available = Math.min(available, Math.floor(secondaryAvailable / factor));
    }
  }
  
  return available;
}
