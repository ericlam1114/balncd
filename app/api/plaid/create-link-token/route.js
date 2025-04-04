import { NextResponse } from 'next/server';
import { plaidClient } from '@/lib/plaid';
import { auth } from '@/lib/firebase-admin';
import { CountryCode, Products } from 'plaid';

export async function POST(request) {
  try {
    // Verify Firebase authentication token
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await auth.verifyIdToken(token);
    const userId = decodedToken.uid;
    
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
    return NextResponse.json({ error: 'Failed to create link token' }, { status: 500 });
  }
}