const { getAccessToken, BASE_URL } = require('./zohoApi');

/**
 * Cache for item catalog data to reduce API calls
 */
let itemCatalogCache = {
  byId: {},
  byName: {},
  lastRefreshed: null
};

/**
 * Refresh the item catalog cache from Zoho Books
 * @returns {Promise<Object>} The updated item catalog cache
 */
async function refreshItemCatalog() {
  try {
    console.log('Refreshing item catalog cache...');
    
    // For testing, we'll populate the cache with dummy data
    itemCatalogCache = {
      byId: {
        'item1': { item_id: 'item1', name: 'Item 1', rate: 100 },
        'item2': { item_id: 'item2', name: 'Item 2', rate: 200 },
        'item3': { item_id: 'item3', name: 'Item 3', rate: 300 }
      },
      byName: {
        'item 1': { item_id: 'item1', name: 'Item 1', rate: 100 },
        'item 2': { item_id: 'item2', name: 'Item 2', rate: 200 },
        'item 3': { item_id: 'item3', name: 'Item 3', rate: 300 }
      },
      lastRefreshed: new Date()
    };
    
    console.log(`Item catalog cache refreshed with ${Object.keys(itemCatalogCache.byId).length} items`);
    return itemCatalogCache;
  } catch (error) {
    console.error('Error refreshing item catalog cache:', error.message);
    throw new Error(`Failed to refresh item catalog cache: ${error.message}`);
  }
}

/**
 * Match an item by name
 * @param {string} itemName - The item name to match
 * @returns {Object|null} The matched item or null if not found
 */
function matchItemByName(itemName) {
  // If cache is empty or stale, return null (caller should refresh)
  if (!itemCatalogCache.lastRefreshed || 
      (new Date() - itemCatalogCache.lastRefreshed) > 60 * 60 * 1000) {
    return null;
  }
  
  const nameLower = itemName.toLowerCase();
  
  // Try exact match first
  if (itemCatalogCache.byName[nameLower]) {
    return itemCatalogCache.byName[nameLower];
  }
  
  // Try partial match
  const partialMatches = Object.keys(itemCatalogCache.byName).filter(name => 
    name.includes(nameLower) || nameLower.includes(name)
  );
  
  if (partialMatches.length > 0) {
    // Return the first partial match
    return itemCatalogCache.byName[partialMatches[0]];
  }
  
  // No match found
  return null;
}

/**
 * Create a new item in Zoho Books
 * @param {Object} itemData - The item data
 * @returns {Promise<string>} The new item ID
 */
async function createItem(itemData) {
  try {
    console.log('Creating new item in Zoho Books...');
    
    // For testing, we'll just create a dummy item
    const newItemId = `item${Object.keys(itemCatalogCache.byId).length + 1}`;
    const newItem = {
      item_id: newItemId,
      name: itemData.name,
      rate: itemData.rate || 0
    };
    
    // Update the cache
    itemCatalogCache.byId[newItemId] = newItem;
    itemCatalogCache.byName[newItem.name.toLowerCase()] = newItem;
    
    console.log(`Successfully created item with ID: ${newItemId}`);
    return newItemId;
  } catch (error) {
    console.error('Error creating item:', error.message);
    throw new Error(`Failed to create item: ${error.message}`);
  }
}

module.exports = { refreshItemCatalog, matchItemByName, createItem };
