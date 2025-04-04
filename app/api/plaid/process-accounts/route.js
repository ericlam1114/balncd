import { NextResponse } from 'next/server';
import { plaidClient } from '@/lib/plaid';
import { auth } from '@/lib/firebase-admin';
import { db } from '@/lib/firebase-admin';

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
    
    // Get request body
    const { publicToken, metadata } = await request.json();
    
    if (!publicToken) {
      return NextResponse.json({ error: 'Missing public token' }, { status: 400 });
    }
    
    // Exchange public token for access token
    const exchangeResponse = await plaidClient.itemPublicTokenExchange({
      public_token: publicToken,
    });
    
    const accessToken = exchangeResponse.data.access_token;
    const itemId = exchangeResponse.data.item_id;
    
    // Store Plaid item in Firestore
    await db.collection('plaidItems').doc(itemId).set({
      userId,
      itemId,
      accessToken,
      institution: metadata.institution,
      createdAt: new Date(),
    });
    
    // Get accounts
    const accountsResponse = await plaidClient.accountsGet({
      access_token: accessToken,
    });
    
    const accounts = accountsResponse.data.accounts;
    
    // Store accounts in Firestore
    const accountsPromises = accounts.map(account => {
      return db.collection('accounts').add({
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
        institution: metadata.institution,
        createdAt: new Date(),
      });
    });
    
    await Promise.all(accountsPromises);
    
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
    
    // Store transactions in Firestore (in smaller batches)
    const transactionBatches = [];
    for (let i = 0; i < transactions.length; i += 500) {
      transactionBatches.push(transactions.slice(i, i + 500));
    }
    
    for (const batch of transactionBatches) {
      const batchPromises = batch.map(transaction => {
        return db.collection('transactions').add({
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
      });
      
      await Promise.all(batchPromises);
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