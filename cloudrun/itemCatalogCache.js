const axios = require('axios');
const { getAccessToken } = require('./zohoApi');

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
    const accessToken = await getAccessToken();
    
    // Get all items from Zoho Books
    const response = await axios.get(
      `https://books.zoho.com/api/v3/items?organization_id=${process.env.ZOHO_ORGANIZATION_ID}`,
      {
        headers: {
          Authorization: `Zoho-oauthtoken ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    // Reset the cache
    itemCatalogCache = {
      byId: {},
      byName: {},
      lastRefreshed: new Date()
    };
    
    // Populate the cache
    if (response.data && response.data.items) {
      response.data.items.forEach(item => {
        // Store by ID
        itemCatalogCache.byId[item.item_id] = item;
        
        // Store by name (lowercase for case-insensitive matching)
        const nameLower = item.name.toLowerCase();
        itemCatalogCache.byName[nameLower] = item;
      });
    }
    
    console.log(`Item catalog cache refreshed with ${Object.keys(itemCatalogCache.byId).length} items`);
    return itemCatalogCache;
  } catch (error) {
    console.error('Error refreshing item catalog cache:', error.response?.data || error.message);
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
    const accessToken = await getAccessToken();
    
    const response = await axios.post(
      `https://books.zoho.com/api/v3/items?organization_id=${process.env.ZOHO_ORGANIZATION_ID}`,
      itemData,
      {
        headers: {
          Authorization: `Zoho-oauthtoken ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    if (response.data && response.data.item) {
      const newItemId = response.data.item.item_id;
      console.log(`Successfully created item with ID: ${newItemId}`);
      
      // Update the cache
      itemCatalogCache.byId[newItemId] = response.data.item;
      itemCatalogCache.byName[response.data.item.name.toLowerCase()] = response.data.item;
      
      return newItemId;
    } else {
      throw new Error('Invalid response from Zoho when creating item');
    }
  } catch (error) {
    console.error('Error creating item:', error.response?.data || error.message);
    throw new Error(`Failed to create item: ${error.message}`);
  }
}

module.exports = { refreshItemCatalog, matchItemByName, createItem };
