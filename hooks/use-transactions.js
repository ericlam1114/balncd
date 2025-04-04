'use client';

import { useState, useEffect } from 'react';
import { collection, query, where, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/providers/auth-provider';

export function useTransactions(options = {}) {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { user } = useAuth();
  
  const { 
    limitCount = 100, 
    startDate, 
    endDate, 
    categories = [],
    accountIds = [],
  } = options;

  useEffect(() => {
    if (!user?.uid) {
      setLoading(false);
      return;
    }

    setLoading(true);
    
    // Build query with filters
    let transactionsQuery = query(
      collection(db, 'transactions'),
      where('userId', '==', user.uid),
      orderBy('date', 'desc')
    );
    
    // Add date filters if provided
    if (startDate) {
      transactionsQuery = query(
        transactionsQuery, 
        where('date', '>=', startDate)
      );
    }
    
    if (endDate) {
      transactionsQuery = query(
        transactionsQuery, 
        where('date', '<=', endDate)
      );
    }
    
    // Add category filter if provided
    if (categories.length > 0) {
      transactionsQuery = query(
        transactionsQuery, 
        where('category', 'in', categories)
      );
    }
    
    // Add account filter if provided
    if (accountIds.length > 0) {
      transactionsQuery = query(
        transactionsQuery, 
        where('plaidAccountId', 'in', accountIds)
      );
    }
    
    // Add limit
    transactionsQuery = query(
      transactionsQuery,
      limit(limitCount)
    );
    
    // Subscribe to real-time updates
    const unsubscribe = onSnapshot(
      transactionsQuery,
      (snapshot) => {
        const transactionData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        }));
        setTransactions(transactionData);
        setLoading(false);
      },
      (err) => {
        console.error('Error fetching transactions:', err);
        setError(err);
        setLoading(false);
      }
    );
    
    return () => unsubscribe();
  }, [user, limitCount, startDate, endDate, categories, accountIds]);

  return { transactions, loading, error };
}