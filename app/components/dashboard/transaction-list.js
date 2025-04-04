'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { TransactionItem } from './transaction-item';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { motion, AnimatePresence } from 'framer-motion';
import { Empty } from './empty';

const ITEMS_PER_PAGE = 20;

export function TransactionList({ userId, filters = {} }) {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  
  useEffect(() => {
    const fetchTransactions = async () => {
      if (!userId) return;
      
      setLoading(true);
      try {
        // Build base query
        let transactionsQuery = query(
          collection(db, 'transactions'),
          where('userId', '==', userId),
          orderBy('date', 'desc')
        );
        
        // Apply filters if provided
        if (filters.startDate) {
          transactionsQuery = query(
            transactionsQuery,
            where('date', '>=', filters.startDate)
          );
        }
        
        if (filters.endDate) {
          transactionsQuery = query(
            transactionsQuery,
            where('date', '<=', filters.endDate)
          );
        }
        
        // Execute the query
        const querySnapshot = await getDocs(transactionsQuery);
        let filteredData = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        }));
        
        // Apply client-side filters
        if (filters.categories && filters.categories.length > 0) {
          filteredData = filteredData.filter(tx => 
            filters.categories.includes(tx.category)
          );
        }
        
        if (filters.accountIds && filters.accountIds.length > 0) {
          filteredData = filteredData.filter(tx => 
            filters.accountIds.includes(tx.accountId)
          );
        }
        
        if (filters.searchTerm) {
          const searchLower = filters.searchTerm.toLowerCase();
          filteredData = filteredData.filter(tx => 
            tx.name.toLowerCase().includes(searchLower) || 
            (tx.merchantName && tx.merchantName.toLowerCase().includes(searchLower))
          );
        }
        
        if (filters.amountMin) {
          filteredData = filteredData.filter(tx => 
            Math.abs(tx.amount) >= parseFloat(filters.amountMin)
          );
        }
        
        if (filters.amountMax) {
          filteredData = filteredData.filter(tx => 
            Math.abs(tx.amount) <= parseFloat(filters.amountMax)
          );
        }
        
        setTransactions(filteredData);
        setPage(1); // Reset to first page when filters change
      } catch (error) {
        console.error('Error fetching transactions:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTransactions();
  }, [userId, filters]);

  const totalPages = Math.ceil(transactions.length / ITEMS_PER_PAGE);
  const paginatedTransactions = transactions.slice(
    (page - 1) * ITEMS_PER_PAGE, 
    page * ITEMS_PER_PAGE
  );
  
  // Group transactions by date
  const groupedTransactions = paginatedTransactions.reduce((groups, transaction) => {
    const date = transaction.date;
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(transaction);
    return groups;
  }, {});

  const handlePrevPage = () => {
    setPage(p => Math.max(1, p - 1));
  };

  const handleNextPage = () => {
    setPage(p => Math.min(totalPages, p + 1));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">
          {loading ? 'Loading Transactions...' : `${transactions.length} Transactions`}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center items-center h-60">
            <div className="animate-spin h-6 w-6 border-4 border-blue-500 rounded-full border-t-transparent"></div>
          </div>
        ) : transactions.length === 0 ? (
          <Empty 
            title="No Transactions Found" 
            description="Try adjusting your filters or connecting more accounts."
          />
        ) : (
          <div className="space-y-6">
            <AnimatePresence>
              {Object.entries(groupedTransactions).map(([date, transactions]) => (
                <motion.div
                  key={date}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-2"
                >
                  <h3 className="text-sm font-medium text-gray-500">
                    {format(new Date(date), 'EEEE, MMMM d, yyyy')}
                  </h3>
                  <div className="space-y-2">
                    {transactions.map(transaction => (
                      <TransactionItem 
                        key={transaction.id} 
                        transaction={transaction} 
                      />
                    ))}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            
            {transactions.length > ITEMS_PER_PAGE && (
              <div className="flex justify-between items-center mt-4">
                <Button 
                  variant="outline" 
                  onClick={handlePrevPage}
                  disabled={page === 1}
                  size="sm"
                >
                  Previous
                </Button>
                <span className="text-sm text-gray-500">
                  Page {page} of {totalPages}
                </span>
                <Button 
                  variant="outline" 
                  onClick={handleNextPage}
                  disabled={page === totalPages}
                  size="sm"
                >
                  Next
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}