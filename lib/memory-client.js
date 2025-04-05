/**
 * Client-side wrapper for the memory store
 * This provides the same interface as the server-side memory store,
 * but makes API calls instead of directly using firebase-admin
 */

/**
 * Save user tax preferences
 * @param {string} userId 
 * @param {object} preferences 
 * @returns {Promise<boolean>}
 */
export async function saveTaxPreferences(userId, preferences) {
  try {
    const response = await fetch('/api/memory', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        userId,
        type: 'tax_preferences',
        data: preferences
      })
    });
    
    const result = await response.json();
    return result.success;
  } catch (error) {
    console.error('Error saving tax preferences:', error);
    return false;
  }
}

/**
 * Get user tax preferences
 * @param {string} userId 
 * @returns {Promise<object|null>}
 */
export async function getTaxPreferences(userId) {
  try {
    const response = await fetch(`/api/memory?userId=${userId}&type=tax_preferences`);
    const result = await response.json();
    
    if (result.success && result.result) {
      return result.result;
    }
    
    return null;
  } catch (error) {
    console.error('Error getting tax preferences:', error);
    return null;
  }
}

/**
 * Get user profile
 * @param {string} userId 
 * @returns {Promise<object|null>}
 */
export async function getUserProfile(userId) {
  try {
    const response = await fetch(`/api/memory?userId=${userId}&type=profile`);
    const result = await response.json();
    
    if (result.success && result.result) {
      return result.result;
    }
    
    return null;
  } catch (error) {
    console.error('Error getting user profile:', error);
    return null;
  }
}

/**
 * Store a conversation
 * @param {string} userId 
 * @param {array} messages 
 * @param {object} context 
 * @returns {Promise<string|null>}
 */
export async function storeConversation(userId, messages, context) {
  try {
    const response = await fetch('/api/memory', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        userId,
        type: 'conversation',
        data: {
          messages,
          context
        }
      })
    });
    
    const result = await response.json();
    return result.success ? result.result : null;
  } catch (error) {
    console.error('Error storing conversation:', error);
    return null;
  }
}

/**
 * Get similar conversations
 * @param {string} userId 
 * @param {string} query 
 * @param {number} limit 
 * @returns {Promise<array>}
 */
export async function getSimilarConversations(userId, query, limit = 3) {
  try {
    const response = await fetch(
      `/api/memory?userId=${userId}&type=similar_conversations&query=${encodeURIComponent(query)}&limit=${limit}`
    );
    
    const result = await response.json();
    return result.success && result.result ? result.result : [];
  } catch (error) {
    console.error('Error getting similar conversations:', error);
    return [];
  }
}

/**
 * Store a user fact
 * @param {string} userId 
 * @param {string} category 
 * @param {object} factData
 * @returns {Promise<boolean>}
 */
export async function storeFact(userId, category, factData) {
  try {
    const response = await fetch('/api/memory', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        userId,
        type: 'fact',
        data: {
          category,
          key: `data_${Date.now()}`,
          value: factData
        }
      })
    });
    
    const result = await response.json();
    return result.success;
  } catch (error) {
    console.error('Error storing fact:', error);
    return false;
  }
}

// Export a client object with the same interface as the server-side memoryStore
export const memoryClient = {
  saveTaxPreferences,
  getTaxPreferences,
  getUserProfile,
  storeConversation,
  getSimilarConversations,
  storeFact
}; 