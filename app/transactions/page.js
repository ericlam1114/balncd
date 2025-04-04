'use client';

import { useState, useEffect } from 'react';
import { useTransactions } from '@/hooks/use-transactions';
import { TransactionList } from '@/components/dashboard/transaction-list';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CSVExport } from '@/components/dashboard/csv-export';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/providers/auth-provider';
import { format, subMonths } from 'date-fns';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon, Search, X } from 'lucide-react';

export default function TransactionsPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [accounts, setAccounts] = useState([]);
  const [filters, setFilters] = useState({
    startDate: format(subMonths(new Date(), 1), 'yyyy-MM-dd'),
    endDate: format(new Date(), 'yyyy-MM-dd'),
    categories: [],
    accountIds: [],
    searchTerm: '',
    amountMin: '',
    amountMax: '',
  });

  // Fetch accounts
  useEffect(() => {
    const fetchAccounts = async () => {
      if (!user?.uid) return;
      
      try {
        const accountsQuery = query(
          collection(db, 'accounts'),
          where('userId', '==', user.uid)
        );
        const snapshot = await getDocs(accountsQuery);
        const accountsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        }));
        setAccounts(accountsData);
      } catch (error) {
        console.error('Error fetching accounts:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchAccounts();
  }, [user]);

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

  // Handle filter changes
  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  // Clear all filters
  const clearFilters = () => {
    setFilters({
      startDate: format(subMonths(new Date(), 1), 'yyyy-MM-dd'),
      endDate: format(new Date(), 'yyyy-MM-dd'),
      categories: [],
      accountIds: [],
      searchTerm: '',
      amountMin: '',
      amountMax: '',
    });
  };

  // Add or remove category filter
  const toggleCategoryFilter = (category) => {
    setFilters(prev => {
      const categories = [...prev.categories];
      const index = categories.indexOf(category);
      
      if (index === -1) {
        categories.push(category);
      } else {
        categories.splice(index, 1);
      }
      
      return { ...prev, categories };
    });
  };

  // Add or remove account filter
  const toggleAccountFilter = (accountId) => {
    setFilters(prev => {
      const accountIds = [...prev.accountIds];
      const index = accountIds.indexOf(accountId);
      
      if (index === -1) {
        accountIds.push(accountId);
      } else {
        accountIds.splice(index, 1);
      }
      
      return { ...prev, accountIds };
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full py-20">
        <div className="animate-spin h-8 w-8 border-4 border-blue-500 rounded-full border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 py-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-medium">Transactions</h1>
        <CSVExport />
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Date Range */}
              <div className="space-y-2">
                <Label>Date Range</Label>
                <div className="flex items-center gap-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" className="w-full">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {filters.startDate ? format(new Date(filters.startDate), 'MMM d, yyyy') : 'Start Date'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={filters.startDate ? new Date(filters.startDate) : undefined}
                        onSelect={(date) => handleFilterChange('startDate', date ? format(date, 'yyyy-MM-dd') : '')}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  
                  <span>to</span>
                  
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" className="w-full">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {filters.endDate ? format(new Date(filters.endDate), 'MMM d, yyyy') : 'End Date'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={filters.endDate ? new Date(filters.endDate) : undefined}
                        onSelect={(date) => handleFilterChange('endDate', date ? format(date, 'yyyy-MM-dd') : '')}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
              
              {/* Search */}
              <div className="space-y-2">
                <Label>Search</Label>
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                  <Input
                    placeholder="Search transactions..."
                    className="pl-9"
                    value={filters.searchTerm}
                    onChange={(e) => handleFilterChange('searchTerm', e.target.value)}
                  />
                </div>
              </div>
              
              {/* Amount Range */}
              <div className="space-y-2">
                <Label>Amount Range</Label>
                <div className="flex items-center gap-2">
                  <Input
                    placeholder="Min $"
                    type="number"
                    value={filters.amountMin}
                    onChange={(e) => handleFilterChange('amountMin', e.target.value)}
                  />
                  <span>to</span>
                  <Input
                    placeholder="Max $"
                    type="number"
                    value={filters.amountMax}
                    onChange={(e) => handleFilterChange('amountMax', e.target.value)}
                  />
                </div>
              </div>
            </div>
            
            {/* Categories */}
            <div className="space-y-2">
              <Label>Categories</Label>
              <div className="flex flex-wrap gap-2">
                {categories.map((category) => (
                  <Button
                    key={category}
                    variant={filters.categories.includes(category) ? "default" : "outline"}
                    size="sm"
                    onClick={() => toggleCategoryFilter(category)}
                  >
                    {category}
                  </Button>
                ))}
              </div>
            </div>
            
            {/* Accounts */}
            {accounts.length > 0 && (
              <div className="space-y-2">
                <Label>Accounts</Label>
                <div className="flex flex-wrap gap-2">
                  {accounts.map((account) => (
                    <Button
                      key={account.id}
                      variant={filters.accountIds.includes(account.id) ? "default" : "outline"}
                      size="sm"
                      onClick={() => toggleAccountFilter(account.id)}
                    >
                      {account.name} {account.mask ? `(••${account.mask})` : ''}
                    </Button>
                  ))}
                </div>
              </div>
            )}
            
            {/* Actions */}
            <div className="flex justify-end">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={clearFilters}
                className="flex items-center gap-1"
              >
                <X className="h-4 w-4" />
                Clear Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <TransactionList userId={user.uid} filters={filters} />
    </div>
  );
}