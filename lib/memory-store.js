import { db } from './firebase-admin';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * MemoryStore provides a comprehensive way to store and retrieve user information
 * including conversational history, preferences, and financial context
 */
class MemoryStore {
  constructor() {
    this.userPrefsCollection = 'userPreferences';
    this.conversationMemoryCollection = 'conversationMemory';
    this.userProfileCollection = 'userProfiles';
  }

  /**
   * Save user tax preferences to Firestore
   * @param {string} userId - The user's ID
   * @param {object} preferences - Tax preferences (state, filingStatus)
   * @returns {Promise<boolean>} - Success indicator
   */
  async saveTaxPreferences(userId, preferences) {
    try {
      if (!userId || !preferences) {
        console.error('Missing userId or preferences for saving tax preferences');
        return false;
      }
      
      console.log(`Saving tax preferences for user ${userId}:`, preferences);
      
      // Prepare the data to save
      const prefData = {
        tax: preferences,
        updatedAt: new Date().toISOString()
      };
      
      // Save to Firestore
      await db.collection(this.userPrefsCollection).doc(userId).set(prefData, { merge: true });
      console.log('Successfully saved tax preferences');
      
      return true;
    } catch (error) {
      console.error('Error saving user tax preferences:', error);
      return false;
    }
  }

  /**
   * Get user tax preferences from Firestore
   * @param {string} userId - The user's ID
   * @returns {Promise<object|null>} - Tax preferences
   */
  async getTaxPreferences(userId) {
    try {
      if (!userId) {
        console.error('Missing userId for retrieving tax preferences');
        return null;
      }
      
      console.log(`Retrieving tax preferences for user ${userId}`);
      
      // Get from Firestore
      const doc = await db.collection(this.userPrefsCollection).doc(userId).get();
      
      if (!doc.exists) {
        console.log('No tax preferences found for user');
        return null;
      }
      
      const data = doc.data();
      
      // Check for preferences in the expected format
      if (!data.tax) {
        console.log('User document exists but no tax preferences found');
        return null;
      }
      
      console.log('Retrieved tax preferences:', data.tax);
      return data.tax;
    } catch (error) {
      console.error('Error retrieving user tax preferences:', error);
      return null;
    }
  }

  /**
   * Save enhanced user profile with financial context
   * @param {string} userId - The user's ID
   * @param {object} profileData - User profile data
   * @returns {Promise<boolean>} - Success indicator
   */
  async saveUserProfile(userId, profileData) {
    try {
      if (!userId || !profileData) {
        console.error('Missing userId or profile data');
        return false;
      }
      
      // Prepare the data to save
      const data = {
        ...profileData,
        updatedAt: new Date().toISOString()
      };
      
      // Save to Firestore
      await db.collection(this.userProfileCollection).doc(userId).set(data, { merge: true });
      console.log('Successfully saved user profile');
      
      return true;
    } catch (error) {
      console.error('Error saving user profile:', error);
      return false;
    }
  }

  /**
   * Get enhanced user profile
   * @param {string} userId - The user's ID
   * @returns {Promise<object|null>} - User profile
   */
  async getUserProfile(userId) {
    try {
      if (!userId) {
        return null;
      }
      
      // Get from Firestore
      const doc = await db.collection(this.userProfileCollection).doc(userId).get();
      
      if (!doc.exists) {
        return null;
      }
      
      return doc.data();
    } catch (error) {
      console.error('Error retrieving user profile:', error);
      return null;
    }
  }

  /**
   * Store a conversation with vector embeddings for semantic retrieval
   * @param {string} userId - The user's ID
   * @param {array} messages - Conversation messages
   * @param {object} context - Conversation context
   * @returns {Promise<string>} - Conversation ID
   */
  async storeConversation(userId, messages, context = {}) {
    try {
      if (!userId || !messages || messages.length === 0) {
        return null;
      }
      
      // Create an embedding for the conversation for semantic search
      const concatenatedText = messages
        .map(m => `${m.role}: ${m.content}`)
        .join('\n');
      
      // Generate embedding using OpenAI
      const embeddingResponse = await openai.embeddings.create({
        input: concatenatedText,
        model: "text-embedding-ada-002"
      });
      
      const embedding = embeddingResponse.data[0].embedding;
      
      // Prepare the conversation data
      const conversationData = {
        userId,
        messages,
        context,
        embedding,
        timestamp: new Date().toISOString()
      };
      
      // Store in Firestore
      const docRef = await db.collection(this.conversationMemoryCollection).add(conversationData);
      return docRef.id;
    } catch (error) {
      console.error('Error storing conversation:', error);
      return null;
    }
  }

  /**
   * Retrieve similar conversations based on semantic similarity
   * @param {string} userId - The user's ID
   * @param {string} query - Query text to match against conversations
   * @param {number} limit - Maximum number of conversations to retrieve
   * @returns {Promise<array>} - Similar conversations
   */
  async getSimilarConversations(userId, query, limit = 3) {
    try {
      if (!userId || !query) {
        return [];
      }
      
      // Generate embedding for the query
      const embeddingResponse = await openai.embeddings.create({
        input: query,
        model: "text-embedding-ada-002"
      });
      
      const queryEmbedding = embeddingResponse.data[0].embedding;
      
      // Get all conversations for this user (in a real implementation, you'd use a specialized vector DB)
      const snapshot = await db.collection(this.conversationMemoryCollection)
        .where('userId', '==', userId)
        .get();
      
      if (snapshot.empty) {
        return [];
      }
      
      // Calculate cosine similarity between query and each conversation
      const conversations = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        
        // Calculate cosine similarity if embedding exists
        if (data.embedding) {
          const similarity = this.cosineSimilarity(queryEmbedding, data.embedding);
          conversations.push({
            id: doc.id,
            similarity,
            messages: data.messages,
            context: data.context,
            timestamp: data.timestamp
          });
        }
      });
      
      // Sort by similarity and return top matches
      return conversations
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, limit);
    } catch (error) {
      console.error('Error retrieving similar conversations:', error);
      return [];
    }
  }
  
  /**
   * Calculate cosine similarity between two vectors
   * @param {array} vecA - First vector
   * @param {array} vecB - Second vector
   * @returns {number} - Cosine similarity (-1 to 1)
   */
  cosineSimilarity(vecA, vecB) {
    // Ensure vectors are of same length
    if (vecA.length !== vecB.length) {
      return 0;
    }
    
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    
    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }
    
    // Avoid division by zero
    if (normA === 0 || normB === 0) {
      return 0;
    }
    
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }
  
  /**
   * Store a fact about a user for long-term memory
   * @param {string} userId - The user's ID
   * @param {string} category - Fact category (e.g., 'finance', 'personal')
   * @param {string} key - Fact identifier
   * @param {any} value - Fact value
   * @returns {Promise<boolean>} - Success indicator
   */
  async storeUserFact(userId, category, key, value) {
    try {
      if (!userId || !category || !key) {
        return false;
      }
      
      // Create data structure for storing facts
      const updateData = {
        [`facts.${category}.${key}`]: value,
        updatedAt: new Date().toISOString()
      };
      
      // Store in user profile
      await db.collection(this.userProfileCollection).doc(userId).set(updateData, { merge: true });
      return true;
    } catch (error) {
      console.error('Error storing user fact:', error);
      return false;
    }
  }
  
  /**
   * Retrieve a user fact from long-term memory
   * @param {string} userId - The user's ID
   * @param {string} category - Fact category
   * @param {string} key - Fact identifier
   * @returns {Promise<any>} - The stored fact value
   */
  async getUserFact(userId, category, key) {
    try {
      const profile = await this.getUserProfile(userId);
      
      if (!profile || !profile.facts || !profile.facts[category]) {
        return null;
      }
      
      return profile.facts[category][key] || null;
    } catch (error) {
      console.error('Error retrieving user fact:', error);
      return null;
    }
  }
}

// Export singleton instance
export const memoryStore = new MemoryStore(); 