import { NextResponse } from 'next/server';
import { db } from '../../../lib/firebase-admin';

// Save user tax preferences to Firestore
export async function POST(request) {
  try {
    const { userId, preferences } = await request.json();
    
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }
    
    if (!preferences) {
      return NextResponse.json({ error: 'Preferences data is required' }, { status: 400 });
    }
    
    console.log('Saving tax preferences for user:', userId, preferences);
    
    // Get a reference to the user's preferences doc
    const userPrefsRef = db.collection('userPreferences').doc(userId);
    
    // Update or create the document with tax preferences
    // Use merge: true to update fields without overwriting the entire document
    await userPrefsRef.set({
      tax: preferences,
      updatedAt: new Date().toISOString()
    }, { merge: true });
    
    return NextResponse.json({ 
      success: true,
      message: 'Tax preferences saved successfully'
    });
  } catch (error) {
    console.error('Error saving tax preferences:', error);
    return NextResponse.json(
      { error: 'Failed to save tax preferences', message: error.message },
      { status: 500 }
    );
  }
}

// Get user tax preferences from Firestore
export async function GET(request) {
  try {
    const url = new URL(request.url);
    const userId = url.searchParams.get('userId');
    
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }
    
    console.log('Retrieving tax preferences for user:', userId);
    
    // Get a reference to the user's preferences doc
    const userPrefsRef = db.collection('userPreferences').doc(userId);
    const userPrefsDoc = await userPrefsRef.get();
    
    if (!userPrefsDoc.exists) {
      return NextResponse.json({ 
        exists: false,
        preferences: null
      });
    }
    
    const data = userPrefsDoc.data();
    
    return NextResponse.json({ 
      exists: true,
      preferences: data.tax || null,
      updatedAt: data.updatedAt
    });
  } catch (error) {
    console.error('Error retrieving tax preferences:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve tax preferences', message: error.message },
      { status: 500 }
    );
  }
} 