/**
 * Parse MRN items from either a JSON string or an already-parsed array.
 * Returns an array of item objects, or an empty array on failure.
 */
export function parseMrnItems(items) {
  if (!items) return [];
  if (Array.isArray(items)) return items;
  try {
    const parsed = JSON.parse(items);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    return [];
  }
}

/**
 * Get the count of items in an MRN record.
 * Handles both parsed arrays and JSON strings.
 */
export function getMrnItemsCount(record) {
  return parseMrnItems(record.items).length;
}
