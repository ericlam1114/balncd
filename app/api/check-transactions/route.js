import { NextResponse } from 'next/server';
import { db } from '../../../lib/firebase-admin';

export async function POST(request) {
  try {
    const { userId } = await request.json();
    
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }
    
    console.log('Checking transactions for user:', userId);
    
    // In a real implementation, you would query your database to see if the user has transaction data
    // For this example, we'll simulate a check based on the user ID
    
    // This is a placeholder function - in a real implementation, you would:
    // 1. Check your database for transactions linked to this user
    // 2. Return true if transactions exist, false otherwise
    const hasTransactions = await checkUserTransactions(userId);
    
    return NextResponse.json({ 
      hasTransactions,
      transactionCount: hasTransactions ? getMockTransactionCount() : 0,
      oldestTransactionDate: hasTransactions ? '2023-01-01' : null,
      categories: hasTransactions ? ['Food & Dining', 'Shopping', 'Transportation', 'Entertainment', 'Bills & Utilities'] : []
    });
  } catch (error) {
    console.error('Error checking transactions:', error);
    return NextResponse.json(
      { error: 'Failed to check for transactions', message: error.message },
      { status: 500 }
    );
  }
}

// Mock function to check if a user has transactions
// In a real implementation, this would query your database
async function checkUserTransactions(userId) {
  // For demo purposes, we'll return false to indicate no transactions
  // This helps simulate the first-time user experience
  
  // If you want to test with mock data, return true
  // return true;
  
  // For now, we'll return false to show empty states
  return false;
}

// Mock function to generate a reasonable transaction count
function getMockTransactionCount() {
  // Return a random number between 50 and 200
  return Math.floor(Math.random() * 150) + 50;
} 