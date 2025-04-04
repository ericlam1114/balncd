'use client';

import { useState } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { motion } from 'framer-motion';
import { TransactionDetailsDialog } from './transaction-details';

export function TransactionItem({ transaction }) {
  const [category, setCategory] = useState(transaction.category);
  const [updating, setUpdating] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const { toast } = useToast();

  // Get display name for merchant
  const displayName = transaction.merchantName || transaction.name;

  // Format amount (negative for expenses, positive for income)
  const amount = transaction.amount;
  const isIncome = amount < 0; // Plaid uses negative for credits/income
  const formattedAmount = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: transaction.isoCurrencyCode || 'USD',
  }).format(Math.abs(amount));

  // Common categories
  const categories = [
    'Food and Drink',
    'Shopping',
    'Travel',
    'Transportation',
    'Housing',
    'Entertainment',
    'Health',
    'Personal Care',
    'Education',
    'Bills and Utilities',
    'Income',
    'Transfer',
    'Subscription',
    'Other',
    'Uncategorized'
  ];

  // Handle category change
  const handleCategoryChange = async (newCategory) => {
    if (newCategory === category) return;
    
    setUpdating(true);
    try {
      const transactionRef = doc(db, 'transactions', transaction.id);
      await updateDoc(transactionRef, {
        category: newCategory,
      });
      
      setCategory(newCategory);
      toast({
        title: 'Category Updated',
        description: `Transaction category changed to ${newCategory}`,
      });
    } catch (error) {
      console.error('Error updating category:', error);
      toast({
        title: 'Error',
        description: 'Failed to update category',
        variant: 'destructive',
      });
    } finally {
      setUpdating(false);
    }
  };

  // Handle transaction update from dialog
  const handleTransactionUpdate = (updatedTransaction) => {
    setCategory(updatedTransaction.category);
  };

  // Get transaction icon based on category
  const getTransactionIcon = (category) => {
    switch (category.toLowerCase()) {
      case 'food and drink':
        return '🍽️';
      case 'shopping':
        return '🛍️';
      case 'travel':
        return '✈️';
      case 'transportation':
        return '🚗';
      case 'housing':
        return '🏠';
      case 'entertainment':
        return '🎬';
      case 'health':
        return '🏥';
      case 'personal care':
        return '💇';
      case 'education':
        return '📚';
      case 'bills and utilities':
        return '📱';
      case 'income':
        return '💰';
      case 'transfer':
        return '🔄';
      case 'subscription':
        return '📱';
      default:
        return '💳';
    }
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between p-3 rounded-md bg-white border cursor-pointer hover:bg-gray-50"
        onClick={() => setShowDetails(true)}
      >
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100">
            <span role="img" aria-label={category}>
              {getTransactionIcon(category)}
            </span>
          </div>
          <div>
            <h4 className="font-medium text-sm">{displayName}</h4>
            <p className="text-xs text-gray-500">
              {transaction.pending ? 'Pending • ' : ''}
              {transaction.date}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-4">
          <Select 
            disabled={updating} 
            value={category} 
            onValueChange={handleCategoryChange}
            // Stop propagation to prevent dialog from opening when selecting category
            onMouseDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
          >
            <SelectTrigger className="w-[130px] h-8 text-xs">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((cat) => (
                <SelectItem key={cat} value={cat} className="text-xs">
                  {getTransactionIcon(cat)} {cat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className={`font-medium text-sm ${isIncome ? 'text-green-600' : ''}`}>
            {isIncome ? '+' : ''}{formattedAmount}
          </p>
        </div>
      </motion.div>
      
      <TransactionDetailsDialog 
        transaction={transaction} 
        isOpen={showDetails} 
        onClose={() => setShowDetails(false)}
        onUpdate={handleTransactionUpdate}
      />
    </>
  );
}