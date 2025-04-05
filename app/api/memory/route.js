import { NextResponse } from 'next/server';
import { memoryStore } from '../../../lib/memory-store';

/**
 * Store a memory - conversation, fact, or user profile
 */
export async function POST(request) {
  try {
    const { userId, type, data } = await request.json();
    
    if (!userId) {
      return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
    }
    
    if (!type || !data) {
      return NextResponse.json({ error: 'Missing type or data' }, { status: 400 });
    }
    
    let result;
    
    // Handle different types of memory storage
    switch (type) {
      case 'conversation':
        // Store a conversation with its context
        const { messages, context } = data;
        result = await memoryStore.storeConversation(userId, messages, context);
        break;
        
      case 'fact':
        // Store a user fact
        const { category, key, value } = data;
        result = await memoryStore.storeUserFact(userId, category, key, value);
        break;
        
      case 'profile':
        // Store user profile data
        result = await memoryStore.saveUserProfile(userId, data);
        break;
        
      case 'tax_preferences':
        // Store tax preferences
        result = await memoryStore.saveTaxPreferences(userId, data);
        break;
        
      default:
        return NextResponse.json({ error: 'Invalid memory type' }, { status: 400 });
    }
    
    return NextResponse.json({ success: true, result });
  } catch (error) {
    console.error('Error storing memory:', error);
    return NextResponse.json({ error: 'Failed to store memory' }, { status: 500 });
  }
}

/**
 * Retrieve memory - similar conversations, facts, or user profile
 */
export async function GET(request) {
  try {
    const url = new URL(request.url);
    const userId = url.searchParams.get('userId');
    const type = url.searchParams.get('type');
    
    if (!userId) {
      return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
    }
    
    if (!type) {
      return NextResponse.json({ error: 'Missing type parameter' }, { status: 400 });
    }
    
    let result;
    
    // Handle different types of memory retrieval
    switch (type) {
      case 'similar_conversations':
        // Get similar conversations
        const query = url.searchParams.get('query');
        const limit = parseInt(url.searchParams.get('limit') || '3');
        
        if (!query) {
          return NextResponse.json({ error: 'Missing query parameter for similar_conversations' }, { status: 400 });
        }
        
        result = await memoryStore.getSimilarConversations(userId, query, limit);
        break;
        
      case 'fact':
        // Get a user fact
        const category = url.searchParams.get('category');
        const key = url.searchParams.get('key');
        
        if (!category || !key) {
          return NextResponse.json({ error: 'Missing category or key parameter for fact' }, { status: 400 });
        }
        
        result = await memoryStore.getUserFact(userId, category, key);
        break;
        
      case 'profile':
        // Get user profile
        result = await memoryStore.getUserProfile(userId);
        break;
        
      case 'tax_preferences':
        // Get tax preferences
        result = await memoryStore.getTaxPreferences(userId);
        break;
        
      default:
        return NextResponse.json({ error: 'Invalid memory type' }, { status: 400 });
    }
    
    return NextResponse.json({ success: true, result });
  } catch (error) {
    console.error('Error retrieving memory:', error);
    return NextResponse.json({ error: 'Failed to retrieve memory' }, { status: 500 });
  }
} 