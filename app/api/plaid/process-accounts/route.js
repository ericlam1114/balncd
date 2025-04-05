import { NextResponse } from 'next/server';
import { plaidClient } from '../../../../lib/plaid';
import { db } from '../../../../lib/firebase-admin';

// Temporary simplified approach since we're having issues with Firebase Admin
export async function POST(request) {
  try {
    // For simplicity, we're skipping token verification in development
    // In production, you should properly verify Firebase tokens
    
    // Get request body
    const body = await request.json();
    const { publicToken, metadata } = body;
    
    // Use the provided user ID
    const userId = body.userId || 'test-user-id';
    
    if (!publicToken) {
      return NextResponse.json({ error: 'Missing public token' }, { status: 400 });
    }
    
    // Exchange public token for access token
    const exchangeResponse = await plaidClient.itemPublicTokenExchange({
      public_token: publicToken,
    });
    
    const accessToken = exchangeResponse.data.access_token;
    const itemId = exchangeResponse.data.item_id;
    
    // Store Plaid item in Firestore using Admin SDK
    await db.collection('plaidItems').add({
      userId,
      itemId,
      accessToken,
      institution: metadata?.institution,
      createdAt: new Date(),
    });
    
    // Get accounts
    const accountsResponse = await plaidClient.accountsGet({
      access_token: accessToken,
    });
    
    const accounts = accountsResponse.data.accounts;
    
    // Store accounts in Firestore using Admin SDK
    for (const account of accounts) {
      await db.collection('accounts').add({
        userId,
        plaidItemId: itemId,
        plaidAccountId: account.account_id,
        name: account.name,
        mask: account.mask,
        type: account.type,
        subtype: account.subtype,
        balance: {
          available: account.balances.available,
          current: account.balances.current,
          limit: account.balances.limit,
        },
        institution: metadata?.institution,
        createdAt: new Date(),
      });
    }
    
    // Get initial transactions (last 30 days)
    const now = new Date();
    const startDate = new Date(now.setDate(now.getDate() - 30)).toISOString().split('T')[0];
    const endDate = new Date().toISOString().split('T')[0];
    
    const transactionsResponse = await plaidClient.transactionsGet({
      access_token: accessToken,
      start_date: startDate,
      end_date: endDate,
    });
    
    const transactions = transactionsResponse.data.transactions;
    
    // Store transactions in Firestore using Admin SDK
    for (const transaction of transactions) {
      await db.collection('transactions').add({
        userId,
        plaidAccountId: transaction.account_id,
        plaidTransactionId: transaction.transaction_id,
        date: transaction.date,
        name: transaction.name,
        merchantName: transaction.merchant_name,
        amount: transaction.amount,
        isoCurrencyCode: transaction.iso_currency_code,
        pending: transaction.pending,
        paymentChannel: transaction.payment_channel,
        category: transaction.category ? transaction.category[0] : 'Uncategorized',
        location: transaction.location,
        createdAt: new Date(),
      });
    }
    
    return NextResponse.json({
      success: true,
      accountsCount: accounts.length,
      transactionsCount: transactions.length,
    });
  } catch (error) {
    console.error('Error processing Plaid data:', error);
    return NextResponse.json({ 
      error: 'Failed to process accounts',
      message: error.message
    }, { status: 500 });
  }
}