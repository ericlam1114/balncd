import { NextResponse } from 'next/server';
import { plaidClient } from '../../../../lib/plaid';
import { CountryCode, Products } from 'plaid';

// Temporary simplified approach since we're having issues with Firebase Admin
export async function POST(request) {
  try {
    // For simplicity, we're skipping token verification in development
    // In production, you should properly verify Firebase tokens
    
    // Parse request for user ID (if available)
    let userId;
    try {
      const authHeader = request.headers.get('Authorization');
      if (authHeader && authHeader.startsWith('Bearer ')) {
        // In a real implementation, you would verify this token
        // For now, we'll extract a user ID from the request body instead
        const body = await request.json();
        userId = body.userId || 'test-user-id';
      } else {
        // Fallback user ID for development
        userId = 'test-user-id';
      }
    } catch (error) {
      // If we can't parse the body, use a default ID
      userId = 'test-user-id';
    }
    
    // Create Plaid link token
    const response = await plaidClient.linkTokenCreate({
      user: { client_user_id: userId },
      client_name: 'Balncd',
      products: [Products.Transactions],
      country_codes: [CountryCode.Us],
      language: 'en',
    });
    
    return NextResponse.json({
      linkToken: response.data.link_token,
      expiration: response.data.expiration,
    });
  } catch (error) {
    console.error('Error creating link token:', error);
    return NextResponse.json({ 
      error: 'Failed to create link token',
      message: error.message
    }, { status: 500 });
  }
}