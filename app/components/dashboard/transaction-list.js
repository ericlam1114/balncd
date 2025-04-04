'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { useTransactions } from '@/hooks/use-transactions';
import { Button } from '@/components/ui/button';
import { TransactionItem } from './transaction-item';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { motion, AnimatePresence } from 'framer-motion';

const ITEMS_PER_PAGE = 20;

export function TransactionList() {
  const [page, setPage] = useState(1);
  const { transactions, loading } = useTransactions({ limitCount: 100 });
  
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
        <CardTitle className="text-lg">Recent Transactions</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center items-center h-60">
            <div className="animate-spin h-6 w-6 border-4 border-blue-500 rounded-full border-t-transparent"></div>
          </div>
        ) : transactions.length === 0 ? (
          <div className="text-center py-10">
            <p className="text-muted-foreground">No transactions found</p>
          </div>
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