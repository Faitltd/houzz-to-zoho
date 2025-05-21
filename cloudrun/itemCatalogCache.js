const axios = require('axios');
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

    // If we're in mock mode, use dummy data
    if (process.env.ZOHO_MOCK_MODE === 'true') {
      console.log('Using mock mode for item catalog');

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

      console.log(`Mock item catalog cache created with ${Object.keys(itemCatalogCache.byId).length} items`);
      return itemCatalogCache;
    }

    // Get a fresh access token
    const accessToken = await getAccessToken();

    // Get all items from Zoho Books
    const response = await axios.get(
      `${BASE_URL}/items?organization_id=${process.env.ZOHO_ORGANIZATION_ID}`,
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

    // Process the items
    if (response.data && response.data.items) {
      response.data.items.forEach(item => {
        // Add to byId index
        itemCatalogCache.byId[item.item_id] = item;

        // Add to byName index (lowercase for case-insensitive matching)
        if (item.name) {
          itemCatalogCache.byName[item.name.toLowerCase()] = item;
        }
      });
    }

    console.log(`Item catalog cache refreshed with ${Object.keys(itemCatalogCache.byId).length} items`);
    return itemCatalogCache;
  } catch (error) {
    console.error('Error refreshing item catalog cache:', error.response?.data || error.message);

    // If we're in development mode, use dummy data
    if (process.env.NODE_ENV === 'development') {
      console.log('Using dummy data for item catalog (DEVELOPMENT MODE)');

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

      return itemCatalogCache;
    }

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
    console.log('Item data:', JSON.stringify(itemData, null, 2));

    // If we're in mock mode, create a dummy item
    if (process.env.ZOHO_MOCK_MODE === 'true') {
      console.log('Using mock mode for create item');

      const newItemId = `item${Object.keys(itemCatalogCache.byId).length + 1}`;
      const newItem = {
        item_id: newItemId,
        name: itemData.name,
        rate: itemData.rate || 0
      };

      // Update the cache
      itemCatalogCache.byId[newItemId] = newItem;
      itemCatalogCache.byName[newItem.name.toLowerCase()] = newItem;

      console.log(`Successfully created mock item with ID: ${newItemId}`);
      return newItemId;
    }

    // Get a fresh access token
    const accessToken = await getAccessToken();

    // Make the API request
    const response = await axios.post(
      `${BASE_URL}/items?organization_id=${process.env.ZOHO_ORGANIZATION_ID}`,
      itemData,
      {
        headers: {
          Authorization: `Zoho-oauthtoken ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    // Check if the item was created successfully
    if (response.data && response.data.item) {
      const newItem = response.data.item;
      const newItemId = newItem.item_id;

      // Update the cache
      itemCatalogCache.byId[newItemId] = newItem;
      if (newItem.name) {
        itemCatalogCache.byName[newItem.name.toLowerCase()] = newItem;
      }

      console.log(`Successfully created item with ID: ${newItemId}`);
      return newItemId;
    } else {
      throw new Error('Invalid response from Zoho API');
    }
  } catch (error) {
    console.error('Error creating item:', error.response?.data || error.message);

    // If we're in development mode, create a dummy item
    if (process.env.NODE_ENV === 'development') {
      console.log('Using dummy item creation (DEVELOPMENT MODE)');

      const newItemId = `item${Object.keys(itemCatalogCache.byId).length + 1}`;
      const newItem = {
        item_id: newItemId,
        name: itemData.name,
        rate: itemData.rate || 0
      };

      // Update the cache
      itemCatalogCache.byId[newItemId] = newItem;
      itemCatalogCache.byName[newItem.name.toLowerCase()] = newItem;

      return newItemId;
    }

    throw new Error(`Failed to create item: ${error.message}`);
  }
}

module.exports = { refreshItemCatalog, matchItemByName, createItem };
