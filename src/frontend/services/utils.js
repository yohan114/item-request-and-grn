/**
 * Parse MRN items from either a JSON string or an already-parsed array.
 * Returns an array of normalized item objects, or an empty array on failure.
 * Normalizes field names: supports both item_name/quantity (new) and item_no/qty (legacy).
 */
export function parseMrnItems(items) {
  if (!items) return [];
  let parsed = items;
  if (!Array.isArray(items)) {
    try {
      parsed = JSON.parse(items);
      if (!Array.isArray(parsed)) return [];
    } catch (e) {
      return [];
    }
  }
  return parsed.map(item => ({
    item_name: item.item_name || item.item_no || '',
    item_no: item.item_no || item.item_name || '',
    description: item.description || '',
    quantity: item.quantity !== undefined ? item.quantity : (item.qty !== undefined ? item.qty : 0),
    qty: item.qty !== undefined ? item.qty : (item.quantity !== undefined ? item.quantity : 0),
    unit: item.unit || '',
    remarks: item.remarks || '',
    item_status: item.item_status || 'Pending Approval'
  }));
}

/**
 * Get the count of items in an MRN record.
 * Handles both parsed arrays and JSON strings.
 */
export function getMrnItemsCount(record) {
  return parseMrnItems(record.items).length;
}
