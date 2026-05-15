/**
 * Shared utility for computing pending (not-yet-fully-received) items
 * given an MRN's items array and the associated ReceivedItem records.
 *
 * Used by: mrnController (list, getPendingItems) and receivedItemController (auto-close check).
 */

/**
 * Parses items that may be stored as a JSON string or already an array.
 * @param {string|Array} items
 * @returns {Array}
 */
function parseItems(items) {
  if (typeof items === 'string') {
    try { return JSON.parse(items); } catch (e) { return []; }
  }
  return Array.isArray(items) ? items : [];
}

/**
 * Parses item_details from a ReceivedItem record (may be string or object).
 * @param {string|object} itemDetails
 * @returns {object}
 */
function parseItemDetails(itemDetails) {
  if (typeof itemDetails === 'string') {
    try { return JSON.parse(itemDetails); } catch (e) { return {}; }
  }
  return itemDetails || {};
}

/**
 * Computes pending items with remaining quantities.
 *
 * @param {Array} mrnItems - The MRN items array (parsed or raw JSON string).
 * @param {Array} receivedItems - Array of ReceivedItem model instances or plain objects.
 * @returns {Array} Array of pending items with { item_no, description, qty, total_received, remaining_qty }.
 */
function computePendingItems(mrnItems, receivedItems) {
  const items = parseItems(mrnItems);
  const pendingItems = [];

  for (const item of items) {
    let totalReceived = 0;
    for (const ri of receivedItems) {
      const itemDetails = parseItemDetails(ri.item_details);
      if (itemDetails && itemDetails.item_no === item.item_no) {
        totalReceived += parseFloat(ri.received_qty) || 0;
      }
    }
    const remainingQty = parseFloat(item.qty) - totalReceived;
    if (remainingQty > 0) {
      pendingItems.push({
        item_no: item.item_no,
        description: item.description,
        qty: parseFloat(item.qty),
        total_received: totalReceived,
        remaining_qty: remainingQty
      });
    }
  }

  return pendingItems;
}

/**
 * Checks whether all MRN items have been fully received.
 *
 * @param {Array} mrnItems - The MRN items array (parsed or raw JSON string).
 * @param {Array} receivedItems - Array of ReceivedItem model instances or plain objects.
 * @returns {boolean} True if all items are fully received.
 */
function allItemsReceived(mrnItems, receivedItems) {
  const items = parseItems(mrnItems);
  if (items.length === 0) return false;

  for (const item of items) {
    let totalReceived = 0;
    for (const ri of receivedItems) {
      const itemDetails = parseItemDetails(ri.item_details);
      if (itemDetails && itemDetails.item_no === item.item_no) {
        totalReceived += parseFloat(ri.received_qty) || 0;
      }
    }
    if (totalReceived < parseFloat(item.qty)) {
      return false;
    }
  }

  return true;
}

module.exports = {
  parseItems,
  parseItemDetails,
  computePendingItems,
  allItemsReceived
};
