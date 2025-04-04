'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/providers/auth-provider';
import { CSVLink } from 'react-csv';
import { format, subMonths } from 'date-fns';
import { CalendarIcon } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

export function CSVExport() {
  const { user } = useAuth();
  const [csvData, setCsvData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState({
    from: subMonths(new Date(), 1),
    to: new Date(),
  });

  const handleExport = async () => {
    if (!user?.uid) return;
    
    setLoading(true);
    try {
      const startDate = format(dateRange.from, 'yyyy-MM-dd');
      const endDate = format(dateRange.to, 'yyyy-MM-dd');
      
      const transactionsQuery = query(
        collection(db, 'transactions'),
        where('userId', '==', user.uid),
        where('date', '>=', startDate),
        where('date', '<=', endDate)
      );
      
      const querySnapshot = await getDocs(transactionsQuery);
      
      const formattedData = querySnapshot.docs.map(doc => {
        const tx = doc.data();
        return {
          Date: tx.date,
          Description: tx.name,
          Merchant: tx.merchantName || '',
          Category: tx.category,
          Amount: tx.amount.toFixed(2),
          Currency: 'USD',
          Status: tx.pending ? 'Pending' : 'Completed',
        };
      });
      
      setCsvData(formattedData);
    } catch (error) {
      console.error('Error preparing CSV data:', error);
    } finally {
      setLoading(false);
    }
  };

  const headers = [
    { label: 'Date', key: 'Date' },
    { label: 'Description', key: 'Description' },
    { label: 'Merchant', key: 'Merchant' },
    { label: 'Category', key: 'Category' },
    { label: 'Amount', key: 'Amount' },
    { label: 'Currency', key: 'Currency' },
    { label: 'Status', key: 'Status' },
  ];

  const filename = `balncd-transactions-${format(new Date(), 'yyyy-MM-dd')}.csv`;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex items-center gap-2">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="h-9 text-xs">
              <CalendarIcon className="mr-2 h-3.5 w-3.5" />
              {dateRange.from ? (
                format(dateRange.from, 'LLL dd, y')
              ) : (
                'Start Date'
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={dateRange.from}
              onSelect={(date) =>
                setDateRange((prev) => ({ ...prev, from: date }))
              }
              initialFocus
            />
          </PopoverContent>
        </Popover>
        <span className="text-sm">to</span>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="h-9 text-xs">
              <CalendarIcon className="mr-2 h-3.5 w-3.5" />
              {dateRange.to ? (
                format(dateRange.to, 'LLL dd, y')
              ) : (
                'End Date'
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            <Calendar
              mode="single"
              selected={dateRange.to}
              onSelect={(date) =>
                setDateRange((prev) => ({ ...prev, to: date }))
              }
              initialFocus
            />
          </PopoverContent>
        </Popover>
      </div>
      
      <Button
        variant="outline"
        size="sm"
        className="h-9"
        onClick={handleExport}
        disabled={loading || !user}
      >
        {loading ? 'Preparing...' : 'Prepare CSV'}
      </Button>
      
      {csvData.length > 0 && (
        <CSVLink
          data={csvData}
          headers={headers}
          filename={filename}
          className="inline-flex h-9 items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 focus:outline-none"
        >
          Download {csvData.length} Transactions
        </CSVLink>
      )}
    </div>
  );
}