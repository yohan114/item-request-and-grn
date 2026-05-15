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
 * Get the item identifier from an item object.
 * Supports both item_name (new) and item_no (legacy) field names.
 * @param {object} item
 * @returns {string}
 */
function getItemIdentifier(item) {
  return item.item_name || item.item_no || '';
}

/**
 * Get the item quantity from an item object.
 * Supports both quantity (new) and qty (legacy) field names.
 * @param {object} item
 * @returns {number}
 */
function getItemQuantity(item) {
  const val = item.quantity !== undefined ? item.quantity : item.qty;
  return parseFloat(val) || 0;
}

/**
 * Matches a received item to an MRN item by index first, then by name fallback.
 * @param {object} ri - ReceivedItem model instance or plain object.
 * @param {number} mrnItemIndex - The index of the MRN item in the items array.
 * @param {string} mrnItemId - The identifier (item_name/item_no) of the MRN item.
 * @returns {boolean}
 */
function receivedItemMatchesMrnItem(ri, mrnItemIndex, mrnItemId) {
  // If the received item has an item_index, use it for precise matching
  const riIndex = ri.item_index !== undefined && ri.item_index !== null ? parseInt(ri.item_index, 10) : null;
  if (riIndex !== null) {
    return riIndex === mrnItemIndex;
  }
  // Fallback: match by item name/number (legacy records without item_index)
  const itemDetails = parseItemDetails(ri.item_details);
  const riItemId = getItemIdentifier(itemDetails);
  return riItemId && riItemId === mrnItemId;
}

/**
 * Computes pending items with remaining quantities.
 *
 * @param {Array} mrnItems - The MRN items array (parsed or raw JSON string).
 * @param {Array} receivedItems - Array of ReceivedItem model instances or plain objects.
 * @returns {Array} Array of pending items with { item_name, item_no, description, quantity, qty, total_received, remaining_qty, item_index }.
 */
function computePendingItems(mrnItems, receivedItems) {
  const items = parseItems(mrnItems);
  const pendingItems = [];

  for (let index = 0; index < items.length; index++) {
    const item = items[index];
    const itemId = getItemIdentifier(item);
    const itemQty = getItemQuantity(item);
    let totalReceived = 0;
    for (const ri of receivedItems) {
      if (receivedItemMatchesMrnItem(ri, index, itemId)) {
        totalReceived += parseFloat(ri.received_qty) || 0;
      }
    }
    const remainingQty = itemQty - totalReceived;
    if (remainingQty > 0) {
      pendingItems.push({
        item_name: itemId,
        item_no: itemId,
        description: item.description,
        quantity: itemQty,
        qty: itemQty,
        total_received: totalReceived,
        remaining_qty: remainingQty,
        item_index: index,
        item_status: item.item_status || 'Pending Approval'
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

  for (let index = 0; index < items.length; index++) {
    const item = items[index];
    const itemId = getItemIdentifier(item);
    const itemQty = getItemQuantity(item);
    let totalReceived = 0;
    for (const ri of receivedItems) {
      if (receivedItemMatchesMrnItem(ri, index, itemId)) {
        totalReceived += parseFloat(ri.received_qty) || 0;
      }
    }
    if (totalReceived < itemQty) {
      return false;
    }
  }

  return true;
}

/**
 * Computes per-item statuses based on received quantities and current item status.
 *
 * @param {Array} mrnItems - The MRN items array (parsed or raw JSON string).
 * @param {Array} receivedItems - Array of ReceivedItem model instances or plain objects.
 * @returns {Array} Array of items with computed item_status ('Partially Received', 'Fully Received', or unchanged).
 */
function computeItemStatuses(mrnItems, receivedItems) {
  const items = parseItems(mrnItems);

  return items.map((item, index) => {
    const itemId = getItemIdentifier(item);
    const itemQty = getItemQuantity(item);
    let totalReceived = 0;
    for (const ri of receivedItems) {
      if (receivedItemMatchesMrnItem(ri, index, itemId)) {
        totalReceived += parseFloat(ri.received_qty) || 0;
      }
    }

    let itemStatus = item.item_status || 'Pending Approval';
    // Only update status for items that are already Approved or in receiving flow
    if (itemStatus === 'Approved' || itemStatus === 'Partially Received' || itemStatus === 'Fully Received') {
      if (totalReceived >= itemQty) {
        itemStatus = 'Fully Received';
      } else if (totalReceived > 0) {
        itemStatus = 'Partially Received';
      }
    }

    return {
      ...item,
      item_status: itemStatus
    };
  });
}

module.exports = {
  parseItems,
  parseItemDetails,
  getItemIdentifier,
  getItemQuantity,
  receivedItemMatchesMrnItem,
  computePendingItems,
  allItemsReceived,
  computeItemStatuses
};
