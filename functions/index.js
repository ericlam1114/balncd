const functions = require('firebase-functions');
const admin = require('firebase-admin');
const { Configuration, PlaidApi, PlaidEnvironments } = require('plaid');

admin.initializeApp();

// Initialize Plaid client
const configuration = new Configuration({
  basePath: PlaidEnvironments[process.env.PLAID_ENVIRONMENT] || PlaidEnvironments.sandbox,
  baseOptions: {
    headers: {
      'PLAID-CLIENT-ID': process.env.PLAID_CLIENT_ID,
      'PLAID-SECRET': process.env.PLAID_SECRET,
    },
  },
});

const plaidClient = new PlaidApi(configuration);

// Process Plaid connections securely
exports.processPlaidConnection = functions.https.onCall(async (data, context) => {
  // Verify authentication
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be logged in');
  }
  
  const userId = context.auth.uid;
  const { publicToken } = data;
  
  try {
    // Exchange public token for access token
    const exchangeResponse = await plaidClient.itemPublicTokenExchange({
      public_token: publicToken,
    });
    
    const accessToken = exchangeResponse.data.access_token;
    const itemId = exchangeResponse.data.item_id;
    
    // Store item in Firestore with encrypted access token
    await admin.firestore().collection('plaidItems').doc(itemId).set({
      userId,
      itemId,
      accessToken: accessToken, // In production, encrypt this
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    
    // Get accounts
    const accountsResponse = await plaidClient.accountsGet({
      access_token: accessToken,
    });
    
    // Store accounts in Firestore
    const accounts = accountsResponse.data.accounts;
    const batch = admin.firestore().batch();
    
    accounts.forEach(account => {
      const accountRef = admin.firestore().collection('accounts').doc();
      batch.set(accountRef, {
        userId,
        plaidItemId: itemId,
        plaidAccountId: account.account_id,
        name: account.name,
        type: account.type,
        subtype: account.subtype,
        balance: {
          available: account.balances.available,
          current: account.balances.current,
          limit: account.balances.limit,
        },
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    });
    
    await batch.commit();
    
    // Fetch initial transactions
    const now = new Date();
    const thirtyDaysAgo = new Date(now.setDate(now.getDate() - 30)).toISOString().split('T')[0];
    const today = new Date().toISOString().split('T')[0];
    
    const transactionsResponse = await plaidClient.transactionsGet({
      access_token: accessToken,
      start_date: thirtyDaysAgo,
      end_date: today,
    });
    
    const transactions = transactionsResponse.data.transactions;
    
    // Process transactions in batches of 500 to avoid Firestore limits
    const transactionBatches = [];
    for (let i = 0; i < transactions.length; i += 500) {
      transactionBatches.push(transactions.slice(i, i + 500));
    }
    
    for (const batchTransactions of transactionBatches) {
      const batch = admin.firestore().batch();
      
      batchTransactions.forEach(transaction => {
        const transactionRef = admin.firestore().collection('transactions').doc();
        batch.set(transactionRef, {
          userId,
          plaidTransactionId: transaction.transaction_id,
          plaidAccountId: transaction.account_id,
          date: transaction.date,
          name: transaction.name,
          merchantName: transaction.merchant_name,
          amount: transaction.amount,
          category: transaction.category ? transaction.category[0] : 'Uncategorized',
          pending: transaction.pending,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      });
      
      await batch.commit();
    }
    
    return { success: true, accountsCount: accounts.length, transactionsCount: transactions.length };
  } catch (error) {
    console.error('Plaid connection error:', error);
    throw new functions.https.HttpsError('internal', 'Failed to process Plaid connection');
  }
});

// Sync transactions periodically
exports.syncTransactions = functions.pubsub.schedule('every 12 hours').onRun(async (context) => {
  try {
    const itemsSnapshot = await admin.firestore().collection('plaidItems').get();
    
    for (const doc of itemsSnapshot.docs) {
      const item = doc.data();
      const userId = item.userId;
      const accessToken = item.accessToken;
      
      const now = new Date();
      const sevenDaysAgo = new Date(now.setDate(now.getDate() - 7)).toISOString().split('T')[0];
      const today = new Date().toISOString().split('T')[0];
      
      const transactionsResponse = await plaidClient.transactionsGet({
        access_token: accessToken,
        start_date: sevenDaysAgo,
        end_date: today,
      });
      
      const transactions = transactionsResponse.data.transactions;
      const batch = admin.firestore().batch();
      
      // Check for existing transactions to avoid duplicates
      const existingIdsQuery = await admin.firestore()
        .collection('transactions')
        .where('userId', '==', userId)
        .where('date', '>=', sevenDaysAgo)
        .get();
      
      const existingIds = new Set();
      existingIdsQuery.forEach(doc => {
        const tx = doc.data();
        existingIds.add(tx.plaidTransactionId);
      });
      
      // Add new transactions
      for (const transaction of transactions) {
        if (!existingIds.has(transaction.transaction_id)) {
          const transactionRef = admin.firestore().collection('transactions').doc();
          batch.set(transactionRef, {
            userId,
            plaidTransactionId: transaction.transaction_id,
            plaidAccountId: transaction.account_id,
            date: transaction.date,
            name: transaction.name,
            merchantName: transaction.merchant_name,
            amount: transaction.amount,
            category: transaction.category ? transaction.category[0] : 'Uncategorized',
            pending: transaction.pending,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
          });
        }
      }
      
      await batch.commit();
    }
    
    return null;
  } catch (error) {
    console.error('Error syncing transactions:', error);
    return null;
  }
});