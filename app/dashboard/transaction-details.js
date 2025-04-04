'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { format } from 'date-fns';

export function TransactionDetailsDialog({ transaction, isOpen, onClose, onUpdate }) {
  const [isEditing, setIsEditing] = useState(false);
  const [category, setCategory] = useState(transaction?.category || 'Uncategorized');
  const [note, setNote] = useState(transaction?.note || '');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // Format amount
  const formattedAmount = transaction ? new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: transaction.isoCurrencyCode || 'USD',
  }).format(Math.abs(transaction.amount)) : '$0.00';

  // Is this transaction income?
  const isIncome = transaction?.amount < 0;

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

  const handleSave = async () => {
    if (!transaction) return;
    
    setLoading(true);
    try {
      const transactionRef = doc(db, 'transactions', transaction.id);
      const updates = {
        category,
        note,
        updatedAt: new Date()
      };
      
      await updateDoc(transactionRef, updates);
      
      toast({
        title: 'Transaction Updated',
        description: 'Your changes have been saved',
      });
      
      if (onUpdate) {
        onUpdate({ ...transaction, ...updates });
      }
      
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating transaction:', error);
      toast({
        title: 'Update Failed',
        description: 'Failed to update transaction',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (!transaction) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <span className="text-xl" role="img" aria-label={category}>
              {getTransactionIcon(category)}
            </span>
            <DialogTitle>{transaction.merchantName || transaction.name}</DialogTitle>
          </div>
          <DialogDescription>
            {format(new Date(transaction.date), 'EEEE, MMMM d, yyyy')}
            {transaction.pending && ' • Pending'}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <div className="mb-6 flex justify-center">
            <span className={`text-2xl font-bold ${isIncome ? 'text-green-600' : ''}`}>
              {isIncome ? '+' : ''}{formattedAmount}
            </span>
          </div>

          {isEditing ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger id="category">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {getTransactionIcon(cat)} {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="note">Note</Label>
                <Input
                  id="note"
                  placeholder="Add a note to this transaction"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
              </div>
            </div>
          ) : (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-4"
            >
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="text-sm text-gray-500">Category</p>
                  <p className="font-medium">{category}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Payment</p>
                  <p className="font-medium">{transaction.paymentChannel || 'Not specified'}</p>
                </div>
                {transaction.locationCity && (
                  <div>
                    <p className="text-sm text-gray-500">Location</p>
                    <p className="font-medium">
                      {[transaction.locationCity, transaction.locationState]
                        .filter(Boolean)
                        .join(', ')}
                    </p>
                  </div>
                )}
                {note && (
                  <div className="col-span-2">
                    <p className="text-sm text-gray-500">Note</p>
                    <p className="font-medium">{note}</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </div>

        <DialogFooter>
          {isEditing ? (
            <>
              <Button variant="outline" onClick={() => setIsEditing(false)} disabled={loading}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={loading}>
                {loading ? 'Saving...' : 'Save Changes'}
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={onClose}>
                Close
              </Button>
              <Button onClick={() => setIsEditing(true)}>
                Edit
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}