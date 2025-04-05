import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';

export async function GET(request) {
  try {
    // Get the user ID from the query parameters
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    
    if (!userId) {
      return NextResponse.json({ error: 'Missing userId parameter' }, { status: 400 });
    }
    
    console.log(`Checking transactions for user: ${userId}`);
    
    // In a real implementation, this would query your database for transaction data
    // For now, we'll use a mock implementation
    
    // Mock check for transaction data - for demo purposes
    // In a real app, you would query your transactions collection in Firestore
    const hasTransactions = await mockCheckForTransactions(userId);
    
    return NextResponse.json({ 
      hasTransactions,
      userId,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Error checking transactions:', error);
    return NextResponse.json(
      { error: 'Failed to check transactions' },
      { status: 500 }
    );
  }
}

// Mock function to check if transactions exist
// In a real app, this would query your database
async function mockCheckForTransactions(userId) {
  try {
    // For testing purposes, you might want to return different values
    // based on userId to simulate different user scenarios
    
    // In real implementation, something like:
    // const snapshot = await db.collection('transactions')
    //   .where('userId', '==', userId)
    //   .limit(1)
    //   .get();
    // return !snapshot.empty;
    
    // For now, let's return a mock value
    // You can modify this to return true or false based on testing needs
    return userId.includes('mock-data');
  } catch (error) {
    console.error('Error in mock transaction check:', error);
    return false;
  }
} 