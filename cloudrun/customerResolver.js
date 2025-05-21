const axios = require('axios');
const { getAccessToken } = require('./zohoApi');

/**
 * Cache for customer data to reduce API calls
 */
let customerCache = {
  byName: {},
  byId: {},
  lastRefreshed: null
};

/**
 * Refresh the customer cache from Zoho Books
 * @returns {Promise<Object>} The updated customer cache
 */
async function refreshCustomerCache() {
  try {
    console.log('Refreshing customer cache...');
    const accessToken = await getAccessToken();
    
    // Get all customers from Zoho Books
    const response = await axios.get(
      `https://books.zoho.com/api/v3/contacts?organization_id=${process.env.ZOHO_ORGANIZATION_ID}`,
      {
        headers: {
          Authorization: `Zoho-oauthtoken ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    // Reset the cache
    customerCache = {
      byName: {},
      byId: {},
      lastRefreshed: new Date()
    };
    
    // Populate the cache
    if (response.data && response.data.contacts) {
      response.data.contacts.forEach(customer => {
        // Store by ID
        customerCache.byId[customer.contact_id] = customer;
        
        // Store by name (lowercase for case-insensitive matching)
        const nameLower = customer.contact_name.toLowerCase();
        customerCache.byName[nameLower] = customer;
        
        // Also store by display name if available
        if (customer.display_name) {
          const displayNameLower = customer.display_name.toLowerCase();
          customerCache.byName[displayNameLower] = customer;
        }
      });
    }
    
    console.log(`Customer cache refreshed with ${Object.keys(customerCache.byId).length} customers`);
    return customerCache;
  } catch (error) {
    console.error('Error refreshing customer cache:', error.response?.data || error.message);
    throw new Error(`Failed to refresh customer cache: ${error.message}`);
  }
}

/**
 * Find a customer ID by name
 * @param {string} customerName - The customer name to search for
 * @returns {Promise<string|null>} The customer ID or null if not found
 */
async function findCustomerId(customerName) {
  try {
    // Refresh cache if it's more than 1 hour old or doesn't exist
    if (!customerCache.lastRefreshed || 
        (new Date() - customerCache.lastRefreshed) > 60 * 60 * 1000) {
      await refreshCustomerCache();
    }
    
    // Try exact match first (case-insensitive)
    const nameLower = customerName.toLowerCase();
    if (customerCache.byName[nameLower]) {
      return customerCache.byName[nameLower].contact_id;
    }
    
    // Try partial match
    const partialMatches = Object.keys(customerCache.byName).filter(name => 
      name.includes(nameLower) || nameLower.includes(name)
    );
    
    if (partialMatches.length > 0) {
      // Return the first partial match
      return customerCache.byName[partialMatches[0]].contact_id;
    }
    
    // If no match found, use the default customer ID from environment variables
    if (process.env.ZOHO_CUSTOMER_ID) {
      console.log(`No customer match found for "${customerName}", using default customer ID`);
      return process.env.ZOHO_CUSTOMER_ID;
    }
    
    console.log(`No customer match found for "${customerName}" and no default customer ID set`);
    return null;
  } catch (error) {
    console.error(`Error finding customer ID for "${customerName}":`, error.message);
    
    // Fall back to default customer ID if available
    if (process.env.ZOHO_CUSTOMER_ID) {
      console.log(`Using default customer ID due to error`);
      return process.env.ZOHO_CUSTOMER_ID;
    }
    
    return null;
  }
}

/**
 * Create a new customer in Zoho Books
 * @param {Object} customerData - The customer data
 * @returns {Promise<string>} The new customer ID
 */
async function createCustomer(customerData) {
  try {
    console.log('Creating new customer in Zoho Books...');
    const accessToken = await getAccessToken();
    
    const response = await axios.post(
      `https://books.zoho.com/api/v3/contacts?organization_id=${process.env.ZOHO_ORGANIZATION_ID}`,
      customerData,
      {
        headers: {
          Authorization: `Zoho-oauthtoken ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    if (response.data && response.data.contact) {
      const newCustomerId = response.data.contact.contact_id;
      console.log(`Successfully created customer with ID: ${newCustomerId}`);
      
      // Update the cache
      customerCache.byId[newCustomerId] = response.data.contact;
      customerCache.byName[response.data.contact.contact_name.toLowerCase()] = response.data.contact;
      
      return newCustomerId;
    } else {
      throw new Error('Invalid response from Zoho when creating customer');
    }
  } catch (error) {
    console.error('Error creating customer:', error.response?.data || error.message);
    throw new Error(`Failed to create customer: ${error.message}`);
  }
}

module.exports = { findCustomerId, refreshCustomerCache, createCustomer };
